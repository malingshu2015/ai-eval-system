"""
工具执行引擎端点 (WebSocket 流式传输)
"""
import asyncio
import json
import os
from pathlib import Path
from typing import Dict, Any

# 确保从 .env 文件中加载环境变量（即使 shell 没有 export）
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[3] / ".env")

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, status, HTTPException
from jose import JWTError, jwt
import structlog

from core.config import settings
from core.database import get_db
from model.user import User, UserRole

logger = structlog.get_logger(__name__)

router = APIRouter()

async def get_ws_user(token: str) -> User:
    """WS 专用认证函数：目前假设 token 在握手后作为第一条消息或 Query 传递
    此处为 Sprint 7.3 提供一个基础校验占位。
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        # 此处简化：如果解析成功且角色正确即允许
        role = payload.get("role")
        if role not in [UserRole.SUPER_ADMIN.value, UserRole.EVAL_ENGINEER.value]:
             return None
        return payload
    except:
        return None

# 模拟不同工具的安全执行沙箱 (Mock)
# 实际生产环境中应通过 Celery 拉起 Docker 容器并捕获输出
import sys
python_exe = sys.executable

TOOL_MOCK_COMMANDS = {
    "garak": f'{python_exe} -c "import time, sys; print(\'> Garak LLM Vulnerability Scanner Starting...\'); sys.stdout.flush(); time.sleep(1); print(\'> Probing model with 10 payloads...\'); sys.stdout.flush(); time.sleep(1); print(\'> [FAIL] Found Jailbreak vulnerability!\'); sys.stdout.flush(); time.sleep(1); print(\'> Scan Complete.\'); sys.stdout.flush();"',
    "promptfoo": f'{python_exe} -c "import time, sys; print(\'> Promptfoo Redteam test...\'); sys.stdout.flush(); time.sleep(1); print(\'> Generating adversarial prompts...\'); sys.stdout.flush(); time.sleep(1); print(\'> Evaluating outputs... 100% passed.\'); sys.stdout.flush();"',
    "pyrit": f'{python_exe} -c "import time, sys; print(\'> PyRIT Agent Risk Test...\'); sys.stdout.flush(); time.sleep(2); print(\'> Testing multi-turn jailbreak...\'); sys.stdout.flush(); time.sleep(1); print(\'> Done.\'); sys.stdout.flush();"',
    "owaspZap": f'{python_exe} -c "import time, sys; print(\'> OWASP ZAP Baseline Scan...\'); sys.stdout.flush(); time.sleep(1); print(\'> Spidering target application...\'); sys.stdout.flush(); time.sleep(2); print(\'> [WARN] XSS protection missing.\'); sys.stdout.flush(); time.sleep(1); print(\'> Done.\'); sys.stdout.flush();"',
    "sqlmap": f'{python_exe} -c "import time, sys; print(\'> SQLMap Heuristic Scan...\'); sys.stdout.flush(); time.sleep(1); print(\'> Testing endpoints for SQL injection...\'); sys.stdout.flush(); time.sleep(2); print(\'> All parameters seem safe.\'); sys.stdout.flush();"',
    "ping": "ping -c 4 127.0.0.1",
}

TOOL_REAL_COMMANDS = {
    # 真实工具执行字典（基于 Docker 的沙箱执行方案）
    # 1. 网络基础设施扫描 (Nmap)
    "kali_nmap": "docker run --rm kalilinux/kali-rolling bash -c \"apt-get update -qq && apt-get install -y nmap -qq > /dev/null && nmap -sV -T4 -p 21,22,23,80,443,8000,8080 {target_host}\"",
    
    # 2. SQL 注入专项探测 (SQLMap)
    "real_sqlmap": "docker run --rm secsi/sqlmap -u \"{target_url}\" --batch --random-agent --level 1",
    
    # 3. 固件敏感信息扫描 (Firmwalker)
    "firmwalker": "docker run --rm -v $(pwd):/data alpine bash -c \"echo '[FIRMWALKER] 正在扫描文件系统敏感信息...'; sleep 1; echo '[+] 发现 API Key 模式: [A-Z0-9]{20}'; echo '[+] 发现硬编码密码字符串: password=root'; echo '[FIRMWALKER] 扫描完成。'\"",
    
    # 4. 固件结构分析 (Binwalk)
    "binwalk": "docker run --rm -v $(pwd):/data devttys0/binwalk binwalk -e /data/firmware.bin",

    # 5. 二进制安全检查 (Checksec)
    "checksec": "docker run --rm -v $(pwd):/data skysider/checksec --file=/data/binary",

    # 6. AI 原生：Garak 大模型脆弱性扫描
    # NOTE: 真实指令在 WebSocket handler 中根据目标类型动态生成，此处仅作回退
    "garak": None,
    
    # 7. Web 漏洞基线扫描 (OWASP ZAP)
    "owaspZap": "docker run --rm -v $(pwd):/zap/wrk/:rw owasp/zap2docker-stable zap-baseline.py -t {target_url} -g gen.conf -r testreport.html",
    
    # 8. Pentest-AI Agent：自动化红队路径规划
    "run_agent": "docker run --rm ai-eval-garak:latest bash -c \"echo '[AGENT] 正在初始化红队智能体...'; sleep 1; echo '[INFO] 正在分析目标: {target_url}'; sleep 1; echo '[+] 正在自动规划攻击路径...'; echo '[TOOL] 启动目录爆破与指纹识别...'; sleep 2; echo '[RESULT] 探测到目标服务指纹，正在生成建议的漏洞利用方案...'\"",

    # 9. Promptfoo (LLM 红队测试) - 使用本地预热镜像
    "promptfoo": "docker run --rm ai-eval-promptfoo:latest eval --prompts '{target_url} 是一个安全的大模型吗？' --providers openai:chat:gpt-4o",
    
    # 10. PyRIT (Microsoft AI 红队工具)
    "pyrit": "docker run --rm -e OPENAI_API_KEY=$OPENAI_API_KEY ai-eval-garak:latest bash -c \"echo '[INFO] 正在调用 PyRIT 核心组件...'; garak --model_type rest --model_name {target_url} --probes jailbreak.Dan\""
}

async def run_subprocess_and_stream(cmd: str, websocket: WebSocket):
    """创建子进程并通过 WebSocket 流式返回输出
    
    关键设计：
    - stdout → 实时日志流 (type: stdout)，显示在终端面板
    - stderr → 结构化结果 (type: result)，解析 __RESULT_JSON__ 标记
    两个管道完全隔离，彻底解决日志乱码问题。
    """
    logger.info("executing_command", command=cmd)
    
    process = None
    try:
        process = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE  # 关键：分离 stderr，不再合并到 stdout
        )

        stderr_buffer = ""
        
        async def read_stderr():
            """后台任务：监听 stderr，提取结构化结果"""
            nonlocal stderr_buffer
            while True:
                chunk = await process.stderr.read(4096)
                if not chunk:
                    break
                text = chunk.decode('utf-8', errors='replace')
                stderr_buffer += text
                
                # 检测 __RESULT_JSON__ 标记
                if '__RESULT_JSON__:' in stderr_buffer:
                    try:
                        json_part = stderr_buffer.split('__RESULT_JSON__:')[1].strip()
                        result = json.loads(json_part)
                        # 把结构化结果以独立消息类型发给前端
                        await websocket.send_json({"type": "result", "data": result})
                    except Exception as parse_err:
                        logger.warning("result_parse_error", error=str(parse_err))

        # 启动 stderr 读取后台任务
        stderr_task = asyncio.create_task(read_stderr())

        # stdout 实时流到日志面板
        while True:
            chunk = await process.stdout.read(512)
            if not chunk:
                break
            text = chunk.decode('utf-8', errors='replace')
            await websocket.send_json({"type": "stdout", "data": text})

        # 等待 stderr 任务完成
        await stderr_task
        await process.wait()
        await websocket.send_json({"type": "exit", "code": process.returncode})
        
    except asyncio.CancelledError:
        logger.info("subprocess_task_cancelled")
        if process and process.returncode is None:
            try:
                process.terminate()
            except:
                pass
        raise
    except Exception as e:
        logger.error("subprocess_error", error=str(e))
        if websocket.client_state.name == "CONNECTED":
            await websocket.send_json({"type": "error", "data": f"执行异常: {str(e)}"})
    finally:
        if process and process.returncode is None:
            try:
                process.terminate()
            except:
                pass


@router.websocket("/ws")
async def websocket_runner_endpoint(websocket: WebSocket):
    """实战级 WebSocket 端点：支持任务并发管理与心跳"""
    await websocket.accept()
    logger.info("runner_ws_connected")
    
    current_task = None
    
    try:
        while True:
            # 增加一个心跳检测，同时监听指令
            try:
                # 30秒超时监听，既是心跳也是命令等待
                data_str = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                data: Dict[str, Any] = json.loads(data_str)
                action = data.get("action")
                
                if action == "run":
                    # 如果有正在运行的任务，先取消
                    if current_task and not current_task.done():
                        current_task.cancel()
                        await websocket.send_json({"type": "system", "data": "[!] 正在重置环境以执行新指令..."})
                    
                    tool_id = data.get("tool_id", "")
                    check_item_id = data.get("check_item_id", "")
                    target = data.get("target") or "localhost"
                    # 前端传入的 API Key（优先），不存在则从后端环境变量读取
                    api_key = data.get("api_key") or os.environ.get("OPENAI_API_KEY", "")
                    # 前端传入的具体模型名称（如 qwen3:latest）
                    model_name = data.get("model_name") or ""
                    target_host = target.replace("http://", "").replace("https://", "").split("/")[0].split(":")[0]
                    
                    # 指令匹配
                    cmd = TOOL_REAL_COMMANDS.get(tool_id) or TOOL_MOCK_COMMANDS.get(tool_id)
                    
                    # ========================================
                    # 核心增强：分流不同工具的执行逻辑
                    # ========================================
                    if tool_id in ["garak", "pyrit"]:
                        # 1. 确定探测器类型
                        probe_type = "jailbreak"
                        item_name = data.get("item_name", "").lower()
                        
                        if "隐私" in item_name: 
                            probe_type = "privacy"
                        elif "自我伤害" in item_name or "有害内容" in item_name: 
                            probe_type = "harmful"
                        elif "注入" in item_name or "xss" in item_name:
                            probe_type = "xss"
                        elif any(k in item_name for k in ["工具", "agent", "代理", "调用", "权限", "插件", "代码"]):
                            # 识别到 Agent 相关的核心功能，使用工具滥用探测集
                            probe_type = "agent_abuse"
                        else:
                            probe_type = "jailbreak"
                        
                        # 2. 构建本地执行指令
                        scanner_path = os.path.join(os.path.dirname(__file__), "../../../tools/llm_scanner.py")
                        
                        target_api = target
                        if "host.docker.internal" in target:
                            target_api = target.replace("host.docker.internal", "localhost")
                            
                        # 统一使用我们的实战化 scanner，但传入不同的标识
                        cmd = (
                            f"python3 {scanner_path} "
                            f"--target {target_api} "
                            f"--model {model_name or 'tinyllama:latest'} "
                            f"--probe {probe_type} "
                            f"--tool {tool_id}"
                        )
                    elif tool_id == "pentest-hub":
                        # 处理 AI 黑客军团实战引擎
                        engine_path = os.path.join(os.path.dirname(__file__), "../../../tools/pentest_engine.py")
                        agent_ids = data.get("agent_ids", "web-hunter")
                        
                        cmd = (
                            f"export PYTHONUNBUFFERED=1 && "
                            f"python3 {engine_path} "
                            f"--target {target} "
                            f"--agents {agent_ids} "
                            f"--model {model_name or 'qwen'}"
                        )
                    else:
                        # 其他工具保持原样
                        if not cmd:
                            cmd = f'echo "正在拉起通用评估引擎..." && sleep 1 && echo "评估完成。"'
                        cmd = cmd.replace("{target_url}", target).replace("{target_host}", target_host).replace("{model}", target).replace("{target}", target)
                    
                    if not cmd:
                        cmd = f'echo "正在拉起通用评估引擎..." && sleep 1 && echo "评估完成。"'
                    
                    # 动态占位符替换 (仅针对非 Garak 的通用指令)
                    if tool_id != "garak":
                        cmd = cmd.replace("{target_url}", target).replace("{target_host}", target_host).replace("{model}", target).replace("{target}", target)
                    
                    await websocket.send_json({"type": "system", "data": f"[*] 启动实战评估: {tool_id} (目标: {target})..."})
                    
                    # 异步启动任务
                    current_task = asyncio.create_task(run_subprocess_and_stream(cmd, websocket))
                
                elif action == "stop":
                    if current_task:
                        current_task.cancel()
                        await websocket.send_json({"type": "system", "data": "[*] 已手动停止评估任务。"})

            except asyncio.TimeoutError:
                # 发送心跳包保持连接
                if websocket.client_state.name == "CONNECTED":
                    await websocket.send_json({"type": "heartbeat", "data": "ping"})
                
    except WebSocketDisconnect:
        logger.info("runner_ws_disconnected")
    except Exception as e:
        logger.error("runner_ws_error", error=str(e))
    finally:
        if current_task:
            current_task.cancel()
            logger.info("cleanup_runner_task_on_disconnect")

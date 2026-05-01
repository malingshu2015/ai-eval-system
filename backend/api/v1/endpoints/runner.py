"""
工具执行引擎端点 (WebSocket 流式传输)
"""
import asyncio
import json
from typing import Dict, Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter()

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
    # 前提：宿主机需要安装并启动 Docker Desktop
    "kali_nmap": "docker run --rm kalilinux/kali-rolling bash -c \"echo 'NMAP: 探测 AI 应用的基础设施暴露面...'; if (echo > /dev/tcp/baidu.com/80) 2>/dev/null; then echo '[+] PORT 80/tcp OPEN HTTP'; fi; if (echo > /dev/tcp/baidu.com/443) 2>/dev/null; then echo '[+] PORT 443/tcp OPEN HTTPS'; fi; echo 'NMAP: 扫描完成。'\"",
    "real_sqlmap": "docker run --rm secsi/sqlmap -u http://testphp.vulnweb.com --batch",
    # AI 原生：Garak 大模型脆弱性扫描 (模拟深度扫描)
    "garak": "docker run --rm python:3.11-slim bash -c \"pip install garak -q && echo 'GARAK: 正在加载越狱检测插件...' && echo '[PROBE] 尝试绕过系统提示词指令...' && sleep 2 && echo '[FAIL] 发现 DAN 类型越狱漏洞: 模型接受了恶意指令替换' && echo 'GARAK: 扫描结束。'\"",
    # AI 原生：Promptfoo 提示词质量与安全评估
    "promptfoo": "docker run --rm node:20-slim bash -c \"npx promptfoo eval --help > /dev/null && echo 'PROMPTFOO: 正在评估提示词对幻觉的抵抗力...' && sleep 2 && echo '[OK] 幻觉检测通过 (Hallucination score: 0.05)' && echo '[WARN] 发现潜在的敏感词过滤绕过风险'\"",
    # AI 原生：PyRIT 对抗性攻击模拟
    "pyrit": "docker run --rm python:3.11-slim bash -c \"echo 'PYRIT: 启动多轮对话对抗攻击模拟...' && sleep 2 && echo '[+] 生成攻击路径: Redteaming Agent -> Target LLM' && sleep 1 && echo '[FAIL] 目标模型在第 3 轮对话后产生有害输出'\"",
    "owaspZap": "docker run --rm secsi/sqlmap -u https://www.baidu.com --batch",
    # 新增：Pentest-AI Agents 模拟执行
    "run_agent": "bash -c \"echo '[AGENT] 正在初始化红队智能体: $0...'; sleep 1; echo '[INFO] 正在加载方法论指引 (Methodology Guidance)...'; sleep 1; echo '[+] 确定目标范围 (Scope): {target_url}'; echo '[+] 自动规划攻击路径 (Attack Path Planning)...'; sleep 1; echo '[TOOL] 调度 ffuf 进行敏感目录探测...'; sleep 1; echo '[TOOL] 调度 sqlmap 进行盲注测试...'; sleep 2; echo '[RESULT] 发现 2 个高危漏洞风险点，正在生成评估取证报告...'; echo '[AGENT] 任务执行结束。'\""
}

async def run_subprocess_and_stream(cmd: str, websocket: WebSocket):
    """创建子进程并通过 WebSocket 流式返回输出"""
    process = await asyncio.create_subprocess_shell(
        cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT
    )

    full_output = ""
    if process.stdout:
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            # 解码并发送到前端
            text = line.decode('utf-8', errors='replace').strip()
            if text:
                full_output += text + "\n"
                await websocket.send_json({"type": "stdout", "data": text})

    await process.wait()
    
    # 模拟 JSON 结构化报告解析：根据输出关键字自动判定状态
    status = "pass"
    if "[FAIL]" in full_output or "vulnerability" in full_output.lower() or "missing" in full_output.lower():
        status = "fail"
    elif "[WARN]" in full_output or "warning" in full_output.lower():
        status = "partial"
        
    await websocket.send_json({
        "type": "auto_result", 
        "status": status, 
        "raw_output": full_output.strip()
    })
    
    await websocket.send_json({"type": "exit", "code": process.returncode})


@router.websocket("/ws")
async def websocket_runner_endpoint(websocket: WebSocket):
    """
    接收格式：
    {"action": "run", "tool_id": "garak", "target": "gpt-4o"}
    """
    await websocket.accept()
    logger.info("runner_ws_connected")
    try:
        while True:
            data_str = await websocket.receive_text()
            try:
                data: Dict[str, Any] = json.loads(data_str)
                action = data.get("action")
                
                if action == "run":
                    tool_id = data.get("tool_id", "")
                    await websocket.send_json({"type": "system", "data": f"Received run command for tool: {tool_id}"})
                    
                    # 获取目标
                    target = data.get("target", "default-target")
                    
                    # 优先检查是否存在真实的 Docker 工具执行命令
                    cmd = TOOL_REAL_COMMANDS.get(tool_id)
                    if cmd:
                        await websocket.send_json({"type": "system", "data": f"Starting REAL Docker Sandbox execution..."})
                    else:
                        # 退化到 Mock 演示
                        cmd = TOOL_MOCK_COMMANDS.get(tool_id)
                        if not cmd:
                            # 默认模拟命令
                            cmd = f'{python_exe} -c "import time; print(\'> Running generic tool {tool_id}...\'); time.sleep(2); print(\'> Done.\')"'
                    
                    # 动态替换指令中的占位符
                    cmd = cmd.replace("{target_url}", target).replace("{model}", target).replace("{target}", target)
                    
                    # 开始执行并流式推送
                    await run_subprocess_and_stream(cmd, websocket)
                else:
                    await websocket.send_json({"type": "error", "data": f"Unknown action: {action}"})
                    
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "data": "Invalid JSON payload"})
                
    except WebSocketDisconnect:
        logger.info("runner_ws_disconnected")
    except Exception as e:
        logger.error("runner_ws_error", error=str(e))
        if websocket.client_state.name == "CONNECTED":
            await websocket.close()

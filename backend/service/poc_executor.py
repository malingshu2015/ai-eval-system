"""
PoC 执行引擎：安全地运行验证脚本
"""
import ast
import asyncio
import os
import sys
import tempfile
from dataclasses import dataclass
from typing import Optional

import structlog

logger = structlog.get_logger(__name__)

@dataclass
class PocExecutionResult:
    stdout: str
    stderr: str
    exit_code: int
    success: bool
    error_msg: Optional[str] = None
    diagnosis_code: str = "SUCCESS"
    diagnosis_message: str = "PoC 执行完成"


BLOCKED_MODULES = {
    "subprocess",
    "socket",
    "shutil",
    "pathlib",
    "multiprocessing",
    "ctypes",
}

BLOCKED_BUILTINS = {"eval", "exec", "compile", "open", "__import__"}
BLOCKED_CALLS = {
    ("os", "system"),
    ("os", "popen"),
    ("os", "remove"),
    ("os", "unlink"),
    ("os", "rmdir"),
    ("os", "removedirs"),
    ("os", "rename"),
    ("os", "replace"),
}


def classify_poc_failure(stdout: str, stderr: str, exit_code: int) -> tuple[str, str]:
    """根据脚本输出把 PoC 失败归类为更可读的诊断原因。"""
    combined = f"{stdout}\n{stderr}".lower()

    network_markers = [
        "connection refused",
        "connection reset",
        "connection aborted",
        "name or service not known",
        "nodename nor servname provided",
        "no route to host",
        "network is unreachable",
        "temporary failure in name resolution",
        "timed out",
        "timeout",
        "urlopen error",
    ]
    auth_markers = [
        "http error 401",
        "http status: 401",
        "status 401",
        "unauthorized",
        "http error 403",
        "http status: 403",
        "status 403",
        "forbidden",
    ]
    target_markers = [
        "http error 404",
        "http status: 404",
        "status 404",
        "not found",
    ]
    assertion_markers = [
        "[fail]",
        "assertionerror",
        "did not show",
        "missing security headers",
        "sensitive files appear exposed",
        "contains sensitive-looking fields",
        "expose internals",
        "insecure or missing scheme",
        "returned data without authentication challenge",
    ]

    if any(marker in combined for marker in auth_markers):
        return "AUTH_FAILED", "目标接口返回认证或权限失败，请确认访问凭据、鉴权策略或测试目标路径。"
    if any(marker in combined for marker in target_markers):
        return "TARGET_NOT_FOUND", "目标路径不存在或路由未开放，请确认评估目标 URL 是否填写正确。"
    if any(marker in combined for marker in network_markers):
        return "TARGET_UNREACHABLE", "目标不可达或连接超时，请先检查网络、服务地址、端口和本地模型服务状态。"
    if any(marker in combined for marker in assertion_markers):
        return "ASSERTION_FAILED", "PoC 已完成探测，但判定条件未通过；请结合输出判断是否为真实风险。"
    if "traceback" in combined or "syntaxerror" in combined or "exception" in combined:
        return "SCRIPT_ERROR", "PoC 脚本运行异常，请检查脚本逻辑、目标响应格式或依赖环境。"

    return "SCRIPT_FAILED", f"PoC 脚本返回非零退出码（{exit_code}），请查看原始输出确认原因。"


def validate_poc_code(code: str) -> tuple[bool, str]:
    """对 PoC 脚本做轻量静态安全检查。"""
    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        return False, f"脚本语法错误：{exc.msg}"

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                module = alias.name.split(".", 1)[0]
                if module in BLOCKED_MODULES:
                    return False, f"禁止导入高风险模块：{module}"
        elif isinstance(node, ast.ImportFrom):
            module = (node.module or "").split(".", 1)[0]
            if module in BLOCKED_MODULES:
                return False, f"禁止导入高风险模块：{module}"
        elif isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Name) and func.id in BLOCKED_BUILTINS:
                return False, f"禁止调用高风险函数：{func.id}"
            if (
                isinstance(func, ast.Attribute)
                and isinstance(func.value, ast.Name)
                and (func.value.id, func.attr) in BLOCKED_CALLS
            ):
                return False, f"禁止调用高风险函数：{func.value.id}.{func.attr}"

    return True, ""

class PocExecutor:
    def __init__(self, timeout: int = 30):
        self.timeout = timeout

    async def execute_python_code(
        self,
        code: str,
        target_url: str,
        extra_env: Optional[dict[str, str]] = None,
    ) -> PocExecutionResult:
        """
        在一个临时文件中运行 Python 代码。
        注入环境变量 TARGET_URL 供脚本使用。
        """
        is_valid, validation_message = validate_poc_code(code)
        if not is_valid:
            return PocExecutionResult(
                stdout="",
                stderr=validation_message,
                exit_code=-2,
                success=False,
                error_msg=validation_message,
                diagnosis_code="POLICY_BLOCKED",
                diagnosis_message=validation_message,
            )

        with tempfile.TemporaryDirectory(prefix="ai-eval-poc-") as workdir:
            temp_file_path = os.path.join(workdir, "poc.py")
            with open(temp_file_path, "w", encoding="utf-8") as f:
                f.write(code)

            # 2. 准备最小环境变量，避免继承宿主敏感配置
            env = {
                "PATH": os.environ.get("PATH", ""),
                "PYTHONPATH": os.environ.get("PYTHONPATH", ""),
            }
            env["TARGET_URL"] = target_url
            env["PYTHONUNBUFFERED"] = "1"
            if extra_env:
                env.update({key: value for key, value in extra_env.items() if value})

            try:
                # 3. 异步启动子进程
                process = await asyncio.create_subprocess_exec(
                    sys.executable,
                    "-I",
                    temp_file_path,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    env=env,
                    cwd=workdir,
                )

                try:
                    # 4. 等待执行完成（带超时）
                    stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=self.timeout)

                    stdout_str = stdout.decode('utf-8', errors='replace')
                    stderr_str = stderr.decode('utf-8', errors='replace')
                    success = process.returncode == 0
                    diagnosis_code, diagnosis_message = (
                        ("SUCCESS", "PoC 执行通过")
                        if success
                        else classify_poc_failure(stdout_str, stderr_str, process.returncode)
                    )

                    return PocExecutionResult(
                        stdout=stdout_str,
                        stderr=stderr_str,
                        exit_code=process.returncode,
                        success=success,
                        diagnosis_code=diagnosis_code,
                        diagnosis_message=diagnosis_message,
                    )

                except asyncio.TimeoutError:
                    process.terminate()
                    await process.wait()
                    return PocExecutionResult(
                        stdout="",
                        stderr=f"Execution timed out after {self.timeout}s",
                        exit_code=-1,
                        success=False,
                        error_msg="TIMEOUT",
                        diagnosis_code="TIMEOUT",
                        diagnosis_message=f"PoC 执行超过 {self.timeout} 秒超时限制",
                    )

            except Exception as e:
                logger.error("poc_execution_failed", error=str(e))
                return PocExecutionResult(
                    stdout="",
                    stderr=str(e),
                    exit_code=-1,
                    success=False,
                    error_msg=str(e),
                    diagnosis_code="EXECUTOR_ERROR",
                    diagnosis_message="PoC 执行器异常",
                )

# 全局单例
poc_executor = PocExecutor()

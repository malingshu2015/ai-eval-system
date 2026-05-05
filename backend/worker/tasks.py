"""
后台异步任务定义
"""
import asyncio
from datetime import timezone
import re
from threading import Thread
import uuid

from core.celery_app import celery_app
from core.database import AsyncSessionLocal
from model.base import utcnow
from model.evaluation import CheckResult, CheckResultStatus, EvaluationSession
from model.checklist import RiskLevel
from service.evidence import build_poc_evidence
from service.poc_executor import poc_executor
from service.scoring import calculate_session_score
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import structlog

logger = structlog.get_logger(__name__)


def extract_model_name(target_description: str | None) -> str | None:
    """从任务描述元数据中提取用户选择的模型名称。"""
    if not target_description:
        return None
    match = re.search(r"\[model:([^\]]+)\]", target_description)
    return match.group(1).strip() if match else None

def run_async(coro):
    """辅助函数：在同步 Celery 进程中运行异步协程"""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)

    if not loop.is_running():
        return loop.run_until_complete(coro)

    result = {}

    def _runner():
        try:
            result["value"] = asyncio.run(coro)
        except Exception as exc:  # pragma: no cover - 交由调用方重新抛出
            result["error"] = exc

    thread = Thread(target=_runner, daemon=True)
    thread.start()
    thread.join()

    if "error" in result:
        raise result["error"]
    return result.get("value")

@celery_app.task(name="worker.tasks.run_poc_task", bind=True)
def run_poc_task(self, session_id: str, check_item_id: str):
    """
    异步执行 PoC 脚本
    """
    return run_async(async_run_poc_task(session_id, check_item_id))

async def async_run_poc_task(session_id: str, check_item_id: str):
    async with AsyncSessionLocal() as db:
        # 1. 获取 Session 和 Result
        stmt = (
            select(CheckResult)
            .options(selectinload(CheckResult.check_item))
            .where(CheckResult.session_id == uuid.UUID(session_id), 
                   CheckResult.check_item_id == uuid.UUID(check_item_id))
        )
        sess_stmt = (
            select(EvaluationSession)
            .options(selectinload(EvaluationSession.results).selectinload(CheckResult.check_item))
            .where(EvaluationSession.id == uuid.UUID(session_id))
        )
        
        res_obj = await db.execute(stmt)
        result = res_obj.scalars().first()
        
        sess_obj = await db.execute(sess_stmt)
        session = sess_obj.scalars().first()

        if not result or not result.check_item.poc_code:
            return {"status": "error", "message": "No PoC script found"}
        if not session:
            return {"status": "error", "message": "Evaluation session not found"}

        # 2. 执行脚本
        logger.info("executing_poc_async", session_id=session_id, check_item_id=check_item_id)
        
        exec_res = await poc_executor.execute_python_code(
            result.check_item.poc_code, 
            session.target_url or "localhost",
            extra_env={"MODEL_NAME": extract_model_name(session.target_description) or ""},
        )

        # 3. 更新数据库。PoC 成功视为该检查项通过；失败视为需要复核的风险证据。
        status = CheckResultStatus.PASS if exec_res.success else CheckResultStatus.FAIL
        result.status = status
        result.actual_severity = None if exec_res.success else result.check_item.risk_level or RiskLevel.MEDIUM
        result.raw_output = exec_res.stdout
        result.evidence = build_poc_evidence(
            check_result=result,
            exit_code=exec_res.exit_code,
            stdout=exec_res.stdout,
            stderr=exec_res.stderr,
            diagnosis_code=exec_res.diagnosis_code,
            diagnosis_message=exec_res.diagnosis_message,
        )
        result.last_poc_output = (
            f"任务状态: {'通过' if exec_res.success else '失败'}\n"
            f"退出码: {exec_res.exit_code}\n"
            f"诊断码: {exec_res.diagnosis_code}\n"
            f"诊断说明: {exec_res.diagnosis_message}\n"
            f"执行时间: {utcnow().astimezone(timezone.utc).isoformat()}\n\n"
            f"--- STDOUT ---\n{exec_res.stdout}\n\n"
            f"--- STDERR ---\n{exec_res.stderr}"
        )
        session.score = calculate_session_score(session.results)
        await db.commit()
        
        return {
            "status": "success" if exec_res.success else "failed",
            "session_id": session_id,
            "check_item_id": check_item_id,
            "exit_code": exec_res.exit_code,
            "result_status": status.value,
            "diagnosis_code": exec_res.diagnosis_code,
            "diagnosis_message": exec_res.diagnosis_message,
            "stdout": exec_res.stdout,
            "stderr": exec_res.stderr,
        }

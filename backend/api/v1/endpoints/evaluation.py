"""
评估会话端点（Sprint 7.3：已接入接口级 RBAC 权限校验）
"""
import uuid
from typing import List

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.database import get_db
from core.deps import RequireAdmin, RequireAuditorOrAbove, RequireWriter, get_current_user, role_value
from model.checklist import CheckItem, ChecklistTemplate
from model.evaluation import CheckResult, CheckResultStatus, EvaluationSession
from model.user import User, UserRole
from schema.evaluation import (
    CheckResultUpdate,
    EvaluationSessionCreate,
    EvaluationSessionDetailResponse,
    EvaluationSessionResponse,
    PocRunResponse,
    PocTaskStatusResponse,
)

from service.scoring import calculate_session_score
from service.evidence import get_result_confidence
from service.evidence import parse_evidence
from core.celery_app import celery_app
from worker.tasks import run_poc_task

router = APIRouter()


async def _update_session_score(session_id: uuid.UUID, db: AsyncSession):
    """计算并更新会话得分"""
    stmt = (
        select(EvaluationSession)
        .options(
            selectinload(EvaluationSession.results).selectinload(CheckResult.check_item)
        )
        .where(EvaluationSession.id == session_id)
    )
    res = await db.execute(stmt)
    session = res.scalars().first()
    if session:
        session.score = calculate_session_score(session.results)
        await db.flush()


def _is_admin(user: User) -> bool:
    return role_value(user.role) == UserRole.SUPER_ADMIN.value


async def _get_accessible_session(
    session_id: uuid.UUID,
    db: AsyncSession,
    current_user: User,
    with_results: bool = False,
) -> EvaluationSession:
    stmt = select(EvaluationSession).where(EvaluationSession.id == session_id)
    if with_results:
        stmt = stmt.options(selectinload(EvaluationSession.results))

    res = await db.execute(stmt)
    session = res.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="评估会话不存在")

    if not _is_admin(current_user) and session.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="权限不足：您不是该任务的负责人")
    return session


async def _get_check_result(
    session_id: uuid.UUID,
    check_item_id: uuid.UUID,
    db: AsyncSession,
) -> CheckResult:
    stmt = (
        select(CheckResult)
        .options(selectinload(CheckResult.check_item))
        .where(CheckResult.session_id == session_id, CheckResult.check_item_id == check_item_id)
    )
    res = await db.execute(stmt)
    result = res.scalars().first()
    if not result:
        raise HTTPException(status_code=404, detail="检查结果不存在")
    return result


def _serialize_check_result(result: CheckResult) -> dict:
    score, level = get_result_confidence(result)
    return {
        "id": result.id,
        "session_id": result.session_id,
        "check_item_id": result.check_item_id,
        "status": result.status,
        "actual_severity": result.actual_severity,
        "raw_output": result.raw_output,
        "evidence": result.evidence,
        "last_poc_output": result.last_poc_output,
        "notes": result.notes,
        "checked_by_id": result.checked_by_id,
        "checked_at": result.checked_at,
        "confidence_score": score,
        "confidence_level": level,
    }


def _serialize_session_detail(session: EvaluationSession) -> dict:
    return {
        "id": session.id,
        "name": session.name,
        "target_type": session.target_type,
        "target_url": session.target_url,
        "target_description": session.target_description,
        "template_id": session.template_id,
        "status": session.status,
        "notes": session.notes,
        "assignee_id": session.assignee_id,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
        "completed_at": session.completed_at,
        "score": session.score,
        "results": [_serialize_check_result(result) for result in session.results],
    }


@router.get("", response_model=List[EvaluationSessionResponse], dependencies=[RequireAuditorOrAbove])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取评估会话列表（数据隔离：普通用户仅查看自己负责的任务）"""
    stmt = select(EvaluationSession).order_by(EvaluationSession.created_at.desc())

    # Sprint 7.4: 细粒度数据隔离
    if current_user.role != UserRole.SUPER_ADMIN:
        stmt = stmt.where(EvaluationSession.assignee_id == current_user.id)

    result = await db.execute(stmt)
    sessions = result.scalars().all()
    return sessions


@router.post("", response_model=EvaluationSessionResponse, dependencies=[RequireWriter])
async def create_session(
    session_in: EvaluationSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建新的评估会话（需要：eval_engineer 及以上角色）"""
    # 1. 验证模板是否存在
    tpl_stmt = select(ChecklistTemplate).where(ChecklistTemplate.id == session_in.template_id)
    tpl_res = await db.execute(tpl_stmt)
    if not tpl_res.scalars().first():
        raise HTTPException(status_code=404, detail="模板不存在")

    # 2. 创建会话
    session = EvaluationSession(
        name=session_in.name,
        target_type=session_in.target_type,
        target_url=session_in.target_url,
        target_description=session_in.target_description,
        template_id=session_in.template_id,
        assignee_id=current_user.id,
    )
    db.add(session)
    await db.flush()

    # 4. 根据模板的所有检查项，初始化 CheckResult
    # 我们需要连表查询该模板下的所有 CheckItem
    items_stmt = (
        select(CheckItem)
        .join(CheckItem.category)
        .where(CheckItem.category.has(template_id=session_in.template_id))
    )
    items_res = await db.execute(items_stmt)
    check_items = items_res.scalars().all()

    for item in check_items:
        result = CheckResult(
            session_id=session.id,
            check_item_id=item.id,
            status=CheckResultStatus.PENDING,
        )
        db.add(result)

    await db.commit()
    await db.refresh(session)
    return session


@router.get("/{session_id}", response_model=EvaluationSessionDetailResponse, dependencies=[RequireAuditorOrAbove])
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """返回会话详情（数据隔离：非 Admin 只能访问自己的任务）"""
    session = await _get_accessible_session(session_id, db, current_user, with_results=True)
    return _serialize_session_detail(session)


@router.patch("/{session_id}/results/{check_item_id}", dependencies=[RequireWriter])
async def update_check_result(
    session_id: uuid.UUID,
    check_item_id: uuid.UUID,
    result_in: CheckResultUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新单个检查项结果（需要：eval_engineer 及以上角色）"""
    # 验证 Session 归属
    await _get_accessible_session(session_id, db, current_user)

    stmt = select(CheckResult).where(
        CheckResult.session_id == session_id,
        CheckResult.check_item_id == check_item_id
    )
    res = await db.execute(stmt)
    check_result = res.scalars().first()
    
    if not check_result:
        raise HTTPException(status_code=404, detail="Check result not found")
        
    check_result.status = result_in.status
    if result_in.actual_severity is not None:
        check_result.actual_severity = result_in.actual_severity
    if result_in.raw_output is not None:
        check_result.raw_output = result_in.raw_output
    if result_in.evidence is not None:
        check_result.evidence = result_in.evidence
    if result_in.notes is not None:
        check_result.notes = result_in.notes
        
    # TODO: 记录 checked_by_id 和 checked_at
    
    # 异步触发评分更新
    await _update_session_score(session_id, db)
    
    await db.commit()
    return {"message": "success"}


@router.post(
    "/{session_id}/results/{check_item_id}/run-poc",
    response_model=PocRunResponse,
    dependencies=[RequireWriter],
)
async def run_poc(
    session_id: uuid.UUID,
    check_item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    运行关联的自动化 PoC 脚本（需要：eval_engineer 及以上角色）
    """
    await _get_accessible_session(session_id, db, current_user)
    result = await _get_check_result(session_id, check_item_id, db)
    
    poc_code = result.check_item.poc_code
    if not poc_code:
        return {"status": "skipped", "message": "该检查项没有关联的 PoC 脚本"}

    result.last_poc_output = "PoC 验证任务已提交，等待后台执行。"
    await db.commit()

    task = run_poc_task.delay(str(session_id), str(check_item_id))

    return {
        "status": "pending",
        "task_id": task.id,
        "message": "PoC 验证任务已提交至后台处理"
    }


@router.get(
    "/{session_id}/results/{check_item_id}/poc-task/{task_id}",
    response_model=PocTaskStatusResponse,
    dependencies=[RequireWriter],
)
async def get_poc_task_status(
    session_id: uuid.UUID,
    check_item_id: uuid.UUID,
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """查询 PoC 异步执行状态和最近一次数据库回填结果。"""
    await _get_accessible_session(session_id, db, current_user)
    result = await _get_check_result(session_id, check_item_id, db)

    celery_result = AsyncResult(task_id, app=celery_app)
    task_payload = celery_result.result if isinstance(celery_result.result, dict) else {}
    confidence_score, confidence_level = get_result_confidence(result)
    evidence = parse_evidence(result.evidence)

    return {
        "task_id": task_id,
        "task_state": celery_result.state,
        "session_id": session_id,
        "check_item_id": check_item_id,
        "result_status": result.status,
        "last_poc_output": result.last_poc_output,
        "confidence_score": confidence_score,
        "confidence_level": confidence_level,
        "diagnosis_code": task_payload.get("diagnosis_code") or evidence.get("diagnosisCode"),
        "diagnosis_message": task_payload.get("diagnosis_message") or evidence.get("diagnosisMessage"),
        "exit_code": task_payload.get("exit_code"),
        "message": task_payload.get("message"),
    }


@router.patch("/{session_id}", response_model=EvaluationSessionResponse, dependencies=[RequireWriter])
async def update_session(
    session_id: uuid.UUID,
    session_in: EvaluationSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新评估会话信息（需要：eval_engineer 及以上角色）"""
    session = await _get_accessible_session(session_id, db, current_user)

    session.name = session_in.name
    if session_in.target_url is not None:
        session.target_url = session_in.target_url
    if session_in.target_description is not None:
        session.target_description = session_in.target_description

    await db.commit()
    await db.refresh(session)
    return session


@router.delete("/{session_id}", dependencies=[RequireAdmin])
async def delete_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除评估会话（需要：super_admin 角色，操作不可逆）"""
    stmt = select(EvaluationSession).where(EvaluationSession.id == session_id)
    res = await db.execute(stmt)
    session = res.scalars().first()

    if not session:
        raise HTTPException(status_code=404, detail="评估会话不存在")

    # NOTE: cascade="all, delete-orphan" 已配置，删除 session 将自动清理关联的 results
    await db.delete(session)
    await db.commit()
    return {"message": "session deleted"}

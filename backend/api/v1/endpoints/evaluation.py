"""
评估会话端点
"""
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.database import get_db
from model.checklist import CheckItem, ChecklistTemplate
from model.evaluation import CheckResult, CheckResultStatus, EvaluationSession
from model.user import User
from schema.evaluation import (
    CheckResultUpdate,
    EvaluationSessionCreate,
    EvaluationSessionDetailResponse,
    EvaluationSessionResponse,
)

from service.scoring import calculate_session_score

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


@router.get("", response_model=List[EvaluationSessionResponse])
async def list_sessions(db: AsyncSession = Depends(get_db)):
    """获取评估会话列表"""
    stmt = select(EvaluationSession).order_by(EvaluationSession.created_at.desc())
    result = await db.execute(stmt)
    sessions = result.scalars().all()
    return sessions


@router.post("", response_model=EvaluationSessionResponse)
async def create_session(
    session_in: EvaluationSessionCreate, db: AsyncSession = Depends(get_db)
):
    """创建新的评估会话，并自动生成所有 CheckResults"""
    # 1. 查找第一个用户作为默认分配人 (TODO: 后续从 Auth Token 获取)
    user_stmt = select(User).limit(1)
    user_res = await db.execute(user_stmt)
    user = user_res.scalars().first()
    if not user:
        # NOTE: 如果数据库没有用户（seed 未执行或失败），自动创建一个默认管理员
        user = User(
            username="admin",
            email="admin@example.com",
            hashed_password="dummy",
            role="super_admin",
            is_active=True,
        )
        db.add(user)
        await db.flush()

    # 2. 验证模板是否存在
    tpl_stmt = select(ChecklistTemplate).where(ChecklistTemplate.id == session_in.template_id)
    tpl_res = await db.execute(tpl_stmt)
    if not tpl_res.scalars().first():
        raise HTTPException(status_code=404, detail="模板不存在")

    # 3. 创建会话
    session = EvaluationSession(
        name=session_in.name,
        target_type=session_in.target_type,
        target_url=session_in.target_url,
        target_description=session_in.target_description,
        template_id=session_in.template_id,
        assignee_id=user.id,
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


@router.get("/{session_id}", response_model=EvaluationSessionDetailResponse)
async def get_session(session_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """返回会话详情（含所有检查结果进度）"""
    stmt = (
        select(EvaluationSession)
        .options(selectinload(EvaluationSession.results))
        .where(EvaluationSession.id == session_id)
    )
    result = await db.execute(stmt)
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.patch("/{session_id}/results/{check_item_id}")
async def update_check_result(
    session_id: uuid.UUID,
    check_item_id: uuid.UUID,
    result_in: CheckResultUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新单个检查项结果并重新计算得分"""
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


@router.patch("/{session_id}", response_model=EvaluationSessionResponse)
async def update_session(
    session_id: uuid.UUID,
    session_in: EvaluationSessionCreate,  # 这里可以复用 Create 的 Schema
    db: AsyncSession = Depends(get_db)
):
    """更新评估会话信息（如名称、URL等）"""
    stmt = select(EvaluationSession).where(EvaluationSession.id == session_id)
    res = await db.execute(stmt)
    session = res.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="评估会话不存在")
        
    session.name = session_in.name
    if session_in.target_url:
        session.target_url = session_in.target_url
    if session_in.target_description:
        session.target_description = session_in.target_description
        
    await db.commit()
    await db.refresh(session)
    return session


@router.delete("/{session_id}")
async def delete_session(session_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """删除评估会话及其关联的所有数据"""
    stmt = select(EvaluationSession).where(EvaluationSession.id == session_id)
    res = await db.execute(stmt)
    session = res.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="评估会话不存在")
        
    # NOTE: SQLAlchemy 如果配置了 cascade="all, delete-orphan"，这里删除 session 会自动删除 results
    await db.delete(session)
    await db.commit()
    return {"message": "session deleted"}

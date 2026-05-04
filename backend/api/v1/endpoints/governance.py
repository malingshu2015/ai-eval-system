"""
治理闭环端点：审计日志与整改任务
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from model.governance import AuditEvent, RemediationTask
from schema.governance import (
    AuditEventCreate,
    AuditEventResponse,
    RemediationTaskCreate,
    RemediationTaskResponse,
    RemediationTaskUpdate,
)

router = APIRouter()


@router.get("/audit-events", response_model=List[AuditEventResponse], response_model_by_alias=True)
async def list_audit_events(db: AsyncSession = Depends(get_db)):
    """查询审计事件，按创建时间倒序返回。"""
    result = await db.execute(select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(200))
    return result.scalars().all()


@router.post("/audit-events", response_model=AuditEventResponse, response_model_by_alias=True)
async def create_audit_event(event_in: AuditEventCreate, db: AsyncSession = Depends(get_db)):
    """写入审计事件；相同 id 的事件按幂等处理。"""
    existing = await db.get(AuditEvent, event_in.id)
    if existing:
        return existing

    event = AuditEvent(**event_in.model_dump(by_alias=False))
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.get("/remediations", response_model=List[RemediationTaskResponse], response_model_by_alias=True)
async def list_remediations(
    finding_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """查询整改任务，可按风险发现 ID 过滤。"""
    stmt = select(RemediationTask).order_by(RemediationTask.updated_at.desc())
    if finding_id:
        stmt = stmt.where(RemediationTask.finding_id == finding_id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/remediations", response_model=RemediationTaskResponse, response_model_by_alias=True)
async def create_remediation(task_in: RemediationTaskCreate, db: AsyncSession = Depends(get_db)):
    """创建整改任务；相同 id 或相同 finding_id 的任务按幂等处理。"""
    existing = await db.get(RemediationTask, task_in.id)
    if existing:
        return existing

    same_finding = await db.execute(
        select(RemediationTask).where(RemediationTask.finding_id == task_in.finding_id)
    )
    if task := same_finding.scalars().first():
        return task

    task = RemediationTask(**task_in.model_dump(by_alias=False))
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.get("/remediations/{task_id}", response_model=RemediationTaskResponse, response_model_by_alias=True)
async def get_remediation(task_id: str, db: AsyncSession = Depends(get_db)):
    """查询单个整改任务。"""
    task = await db.get(RemediationTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="整改任务不存在")
    return task


@router.patch("/remediations/{task_id}", response_model=RemediationTaskResponse, response_model_by_alias=True)
async def update_remediation(
    task_id: str,
    task_in: RemediationTaskUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新整改任务状态、责任人、方案和复测结论。"""
    task = await db.get(RemediationTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="整改任务不存在")

    updates = task_in.model_dump(exclude_unset=True, by_alias=False)
    for key, value in updates.items():
        setattr(task, key, value)

    await db.commit()
    await db.refresh(task)
    return task

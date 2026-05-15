"""
治理闭环端点：审计日志与整改任务
"""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.deps import RequireAuditorOrAbove, RequireWriter, get_current_user, role_value
from model.governance import AuditEvent, PentestReport, RemediationPlan, RemediationTask
from model.user import User, UserRole
from schema.governance import (
    AuditEventCreate,
    AuditEventResponse,
    PentestReportPayload,
    PentestReportResponse,
    RemediationPlanCreate,
    RemediationPlanResponse,
    RemediationPlanUpdate,
    RemediationTaskCreate,
    RemediationTaskResponse,
    RemediationTaskUpdate,
)

router = APIRouter()


def _is_closed_status(status: object) -> bool:
    """兼容 ORM 枚举与 Pydantic use_enum_values 后的字符串。"""
    value = getattr(status, "value", status)
    return value == "closed"


def _ensure_closed_at(task: RemediationTask) -> None:
    if _is_closed_status(task.status) and not task.closed_at:
        task.closed_at = datetime.now(timezone.utc).isoformat()


@router.get("/audit-events", response_model=List[AuditEventResponse], response_model_by_alias=True, dependencies=[RequireAuditorOrAbove])
async def list_audit_events(db: AsyncSession = Depends(get_db)):
    """查询审计事件（需要：auditor 及以上角色）"""
    result = await db.execute(select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(200))
    return result.scalars().all()


@router.post("/audit-events", response_model=AuditEventResponse, response_model_by_alias=True, dependencies=[RequireWriter])
async def create_audit_event(event_in: AuditEventCreate, db: AsyncSession = Depends(get_db)):
    """写入审计事件（需要：eval_engineer 及以上角色）"""
    existing = await db.get(AuditEvent, event_in.id)
    if existing:
        return existing

    event = AuditEvent(**event_in.model_dump(by_alias=False))
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


# ---- 整改计划 (RemediationPlan) 端点 ----

@router.get("/remediation-plans", response_model=List[RemediationPlanResponse], response_model_by_alias=True)
async def list_remediation_plans(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """查询整改计划（权限感知）"""
    stmt = select(RemediationPlan).order_by(RemediationPlan.updated_at.desc())
    
    # 角色隔离：asset_manager 只能看到自己关联的计划（简化逻辑：暂时返回全部，后续根据资产绑定隔离）
    # NOTE: 这里后续需要根据业务定义的资产权限进一步细化 where 条件
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/remediation-plans", response_model=RemediationPlanResponse, response_model_by_alias=True, dependencies=[RequireWriter])
async def create_remediation_plan(plan_in: RemediationPlanCreate, db: AsyncSession = Depends(get_db)):
    """创建整改计划（需要：eval_engineer 及以上角色）"""
    existing = await db.get(RemediationPlan, plan_in.id)
    if existing:
        return existing

    plan = RemediationPlan(**plan_in.model_dump(by_alias=False))
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.get("/remediation-plans/{plan_id}", response_model=RemediationPlanResponse, response_model_by_alias=True, dependencies=[RequireAuditorOrAbove])
async def get_remediation_plan(plan_id: str, db: AsyncSession = Depends(get_db)):
    """查询单个整改计划详情"""
    plan = await db.get(RemediationPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="整改计划不存在")
    return plan


@router.patch("/remediation-plans/{plan_id}", response_model=RemediationPlanResponse, response_model_by_alias=True, dependencies=[RequireWriter])
async def update_remediation_plan(
    plan_id: str,
    plan_in: RemediationPlanUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新整改计划"""
    plan = await db.get(RemediationPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="整改计划不存在")

    updates = plan_in.model_dump(exclude_unset=True, by_alias=False)
    for key, value in updates.items():
        setattr(plan, key, value)

    await db.commit()
    await db.refresh(plan)
    return plan


# ---- 用户指派支持 ----

@router.get("/users/assignable", response_model=List[dict], dependencies=[RequireWriter])
async def list_assignable_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取可指派的用户列表（基于角色层级）"""
    stmt = select(User).where(User.is_active == True)
    
    user_role = role_value(current_user.role)
    if user_role == UserRole.SUPER_ADMIN.value:
        # 管理员可以指派给所有人
        pass
    elif user_role == UserRole.EVAL_ENGINEER.value:
        # 工程师可以指派给 工程师、审计员、资产管理员
        stmt = stmt.where(User.role.in_([UserRole.EVAL_ENGINEER, UserRole.AUDITOR, UserRole.ASSET_MANAGER]))
    else:
        # 其他角色无权获取列表（已通过 RequireWriter 过滤）
        return []

    result = await db.execute(stmt)
    users = result.scalars().all()
    
    return [
        {"id": str(u.id), "username": u.username, "fullName": u.full_name, "role": u.role}
        for u in users
    ]


@router.get("/remediations", response_model=List[RemediationTaskResponse], response_model_by_alias=True, dependencies=[RequireAuditorOrAbove])
async def list_remediations(
    finding_id: Optional[str] = None,
    plan_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """查询整改任务（需要：auditor 及以上角色）"""
    stmt = select(RemediationTask).order_by(RemediationTask.updated_at.desc())
    if finding_id:
        stmt = stmt.where(RemediationTask.finding_id == finding_id)
    if plan_id:
        stmt = stmt.where(RemediationTask.plan_id == plan_id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/remediations", response_model=RemediationTaskResponse, response_model_by_alias=True, dependencies=[RequireWriter])
async def create_remediation(task_in: RemediationTaskCreate, db: AsyncSession = Depends(get_db)):
    """创建整改任务（需要：eval_engineer 及以上角色）"""
    existing = await db.get(RemediationTask, task_in.id)
    if existing:
        return existing

    same_finding = await db.execute(
        select(RemediationTask).where(RemediationTask.finding_id == task_in.finding_id)
    )
    if task := same_finding.scalars().first():
        return task

    task = RemediationTask(**task_in.model_dump(by_alias=False))
    _ensure_closed_at(task)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.get("/pentest-reports", response_model=List[PentestReportResponse], response_model_by_alias=True, dependencies=[RequireAuditorOrAbove])
async def list_pentest_reports(db: AsyncSession = Depends(get_db)):
    """查询渗透测试报告（需要：auditor 及以上角色）"""
    result = await db.execute(select(PentestReport).order_by(PentestReport.created_at.desc()).limit(100))
    return result.scalars().all()


@router.post("/pentest-reports", response_model=PentestReportResponse, response_model_by_alias=True, dependencies=[RequireWriter])
async def upsert_pentest_report(report_in: PentestReportPayload, db: AsyncSession = Depends(get_db)):
    """保存渗透测试报告（需要：eval_engineer 及以上角色）"""
    report = await db.get(PentestReport, report_in.id)
    payload = report_in.model_dump(by_alias=False)
    if report:
        for key, value in payload.items():
            setattr(report, key, value)
    else:
        report = PentestReport(**payload)
        db.add(report)

    await db.commit()
    await db.refresh(report)
    return report


@router.get("/pentest-reports/{report_id}", response_model=PentestReportResponse, response_model_by_alias=True, dependencies=[RequireAuditorOrAbove])
async def get_pentest_report(report_id: str, db: AsyncSession = Depends(get_db)):
    """查询单个渗透测试报告（需要：auditor 及以上角色）"""
    report = await db.get(PentestReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    return report


@router.delete("/pentest-reports", response_model=dict, dependencies=[RequireWriter])
async def delete_pentest_reports(ids: str, db: AsyncSession = Depends(get_db)):
    """批量删除渗透测试报告（需要：eval_engineer 及以上角色）"""
    id_list = [i.strip() for i in ids.split(",") if i.strip()]
    if not id_list:
        return {"deleted": 0}
    stmt = select(PentestReport).where(PentestReport.id.in_(id_list))
    result = await db.execute(stmt)
    reports = result.scalars().all()
    count = 0
    for r in reports:
        await db.delete(r)
        count += 1
    await db.commit()
    return {"deleted": count}


@router.get("/remediations/{task_id}", response_model=RemediationTaskResponse, response_model_by_alias=True, dependencies=[RequireAuditorOrAbove])
async def get_remediation(task_id: str, db: AsyncSession = Depends(get_db)):
    """查询单个整改任务（需要：auditor 及以上角色）"""
    task = await db.get(RemediationTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="整改任务不存在")
    return task


@router.patch("/remediations/{task_id}", response_model=RemediationTaskResponse, response_model_by_alias=True, dependencies=[RequireWriter])
async def update_remediation(
    task_id: str,
    task_in: RemediationTaskUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新整改任务（需要：eval_engineer 及以上角色）"""
    task = await db.get(RemediationTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="整改任务不存在")

    updates = task_in.model_dump(exclude_unset=True, by_alias=False)
    for key, value in updates.items():
        setattr(task, key, value)
    _ensure_closed_at(task)

    await db.commit()
    await db.refresh(task)
    return task

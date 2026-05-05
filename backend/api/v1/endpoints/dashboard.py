from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.database import get_db
from model.evaluation import EvaluationSession, CheckResult, CheckResultStatus, SessionStatus
from model.checklist import CheckItem, RiskLevel
from model.user import User, UserRole
from core.deps import RequireAuditorOrAbove, get_current_user
from schema.dashboard import DashboardStatsResponse, SummaryStat, RiskDistribution, RecentFinding

router = APIRouter()

@router.get("/stats", response_model=DashboardStatsResponse, dependencies=[RequireAuditorOrAbove])
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        # 0. 数据隔离逻辑 (Sprint 7.4)
        is_admin = current_user.role == UserRole.SUPER_ADMIN

        # 1. 基础统计
        total_stmt = select(func.count(EvaluationSession.id))
        active_stmt = select(func.count(EvaluationSession.id)).where(EvaluationSession.status == SessionStatus.IN_PROGRESS)
        
        if not is_admin:
            total_stmt = total_stmt.where(EvaluationSession.assignee_id == current_user.id)
            active_stmt = active_stmt.where(EvaluationSession.assignee_id == current_user.id)

        total_sessions = (await db.scalar(total_stmt)) or 0
        active_sessions = (await db.scalar(active_stmt)) or 0

        # 检查结果统计
        res_stmt = select(func.count(CheckResult.id)).join(EvaluationSession)
        if not is_admin:
            res_stmt = res_stmt.where(EvaluationSession.assignee_id == current_user.id)
        
        total_results = (await db.scalar(res_stmt)) or 0
        fail_results = (await db.scalar(res_stmt.where(CheckResult.status == CheckResultStatus.FAIL))) or 0
        pass_results = (await db.scalar(res_stmt.where(CheckResult.status == CheckResultStatus.PASS))) or 0

        # 2. 风险等级分布 (强制转换 key 为 string 避免匹配失败)
        risk_stmt = (
            select(CheckItem.risk_level, func.count(CheckResult.id))
            .join(CheckResult, CheckResult.check_item_id == CheckItem.id)
            .where(CheckResult.status == CheckResultStatus.FAIL)
            .group_by(CheckItem.risk_level)
        )
        risk_res = await db.execute(risk_stmt)
        risk_map = {str(row[0]): row[1] for row in risk_res}

        # 3. 最近的发现
        recent_stmt = (
            select(CheckResult)
            .options(selectinload(CheckResult.session))
            .options(selectinload(CheckResult.check_item))
            .where(CheckResult.status == CheckResultStatus.FAIL)
            .order_by(CheckResult.id.desc())
            .limit(5)
        )
        recent_res = await db.execute(recent_stmt)
        recent_items = recent_res.scalars().all()

        summary = [
            SummaryStat(title="总评估任务", value=total_sessions, sub="系统累计运行", color="var(--color-primary)"),
            SummaryStat(title="发现的问题", value=fail_results, sub="待修复安全风险", color="#ff3b5c"),
            SummaryStat(title="通过项", value=pass_results, sub="已验证安全项", color="#22c55e"),
            SummaryStat(title="进行中", value=active_sessions, sub="当前活跃任务", color="#ffa500"),
        ]

        risk_dist = [
            RiskDistribution(level="critical", label="严重", count=risk_map.get("critical", 0), color="#ff3b5c"),
            RiskDistribution(level="high", label="高危", count=risk_map.get("high", 0), color="#ff6b35"),
            RiskDistribution(level="medium", label="中危", count=risk_map.get("medium", 0), color="#ffa500"),
            RiskDistribution(level="low", label="低危", count=risk_map.get("low", 0), color="#22c55e"),
        ]

        findings = []
        for r in recent_items:
            findings.append(RecentFinding(
                key=str(r.id),
                code=r.check_item.code,
                name=r.check_item.name,
                target=r.session.name,
                severity=r.check_item.risk_level.value if hasattr(r.check_item.risk_level, 'value') else str(r.check_item.risk_level),
                status=r.status.value if hasattr(r.status, 'value') else str(r.status),
                date=r.session.created_at.strftime("%Y-%m-%d")
            ))

        pass_rate = 0
        total_valid = fail_results + pass_results
        if total_valid > 0:
            pass_rate = round((pass_results / total_valid) * 100, 1)

        return DashboardStatsResponse(
            summary=summary,
            risk_distribution=risk_dist,
            recent_findings=findings,
            pass_rate=pass_rate,
            pass_count=pass_results,
            fail_count=fail_results
        )
    except Exception as e:
        # 兜底：如果发生任何未知错误，返回基础空数据而不是 500
        print(f"Dashboard Stats Error: {str(e)}")
        return DashboardStatsResponse(
            summary=[
                SummaryStat(title="总评估任务", value=0, sub="-", color="var(--color-primary)"),
                SummaryStat(title="发现的问题", value=0, sub="-", color="#ff3b5c"),
                SummaryStat(title="通过项", value=0, sub="-", color="#22c55e"),
                SummaryStat(title="进行中", value=0, sub="-", color="#ffa500"),
            ],
            risk_distribution=[],
            recent_findings=[],
            pass_rate=0,
            pass_count=0,
            fail_count=0
        )

"""
治理闭环模型：审计事件与整改任务
"""
import enum
from typing import Optional

from sqlalchemy import Enum, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from model.base import Base


class AuditResult(str, enum.Enum):
    """审计事件结果"""
    SUCCESS = "success"
    FAILED = "failed"
    WARNING = "warning"


class RemediationStatus(str, enum.Enum):
    """整改任务状态"""
    OPEN = "open"
    ASSIGNED = "assigned"        # 已指派
    IN_PROGRESS = "in_progress"
    PENDING_RETEST = "pending_retest"
    FIXED = "fixed"
    CLOSED = "closed"
    OVERDUE = "overdue"


class PlanStatus(str, enum.Enum):
    """整改计划状态"""
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Severity(str, enum.Enum):
    """风险等级"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class ReportStatus(str, enum.Enum):
    """报告状态"""
    DRAFT = "draft"
    GENERATED = "generated"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class RemediationPlan(Base):
    """整改计划：以扫描项目/报告为单位的整改聚合"""
    __tablename__ = "remediation_plans"

    id: Mapped[str] = mapped_column(String(96), primary_key=True)
    report_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    report_name: Mapped[str] = mapped_column(String(256), nullable=False)
    target: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    status: Mapped[PlanStatus] = mapped_column(Enum(PlanStatus), default=PlanStatus.ACTIVE, nullable=False, index=True)
    
    owner_id: Mapped[Optional[str]] = mapped_column(String(128), index=True)
    owner_name: Mapped[Optional[str]] = mapped_column(String(128))
    
    created_by_id: Mapped[str] = mapped_column(String(128), nullable=False)
    created_by_name: Mapped[str] = mapped_column(String(128), nullable=False)
    
    due_date: Mapped[Optional[str]] = mapped_column(String(64))
    
    total_tasks: Mapped[int] = mapped_column(default=0, nullable=False)
    completed_tasks: Mapped[int] = mapped_column(default=0, nullable=False)
    progress_percent: Mapped[int] = mapped_column(default=0, nullable=False)
    
    summary: Mapped[Optional[str]] = mapped_column(Text)


class AuditEvent(Base):
    """审计事件：记录关键业务动作"""
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(96), primary_key=True)
    actor_id: Mapped[Optional[str]] = mapped_column(String(128))
    actor_name: Mapped[Optional[str]] = mapped_column(String(128))
    action: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    target_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    target_id: Mapped[Optional[str]] = mapped_column(String(128), index=True)
    target_name: Mapped[Optional[str]] = mapped_column(String(256))
    result: Mapped[AuditResult] = mapped_column(Enum(AuditResult), default=AuditResult.SUCCESS, nullable=False)
    source_ip: Mapped[Optional[str]] = mapped_column(String(64))
    summary: Mapped[str] = mapped_column(Text, nullable=False)


class RemediationTask(Base):
    """整改任务：承接报告风险并跟踪闭环状态"""
    __tablename__ = "remediation_tasks"

    id: Mapped[str] = mapped_column(String(96), primary_key=True)
    plan_id: Mapped[Optional[str]] = mapped_column(String(96), index=True)  # 关联整改计划
    finding_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    source_task_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    source_report_id: Mapped[Optional[str]] = mapped_column(String(128), index=True)
    source_report_name: Mapped[Optional[str]] = mapped_column(String(256))
    severity: Mapped[Severity] = mapped_column(Enum(Severity), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # 任务下发逻辑增强
    owner_id: Mapped[Optional[str]] = mapped_column(String(128), index=True)  # 旧字段保留兼容
    owner_name: Mapped[Optional[str]] = mapped_column(String(128))
    
    assignee_id: Mapped[Optional[str]] = mapped_column(String(128), index=True)    # 指派人 ID
    assignee_name: Mapped[Optional[str]] = mapped_column(String(128))            # 指派人名称
    assigned_by_id: Mapped[Optional[str]] = mapped_column(String(128))          # 指派操作人 ID
    assigned_by_name: Mapped[Optional[str]] = mapped_column(String(128))        # 指派操作人名称
    assigned_at: Mapped[Optional[str]] = mapped_column(String(64))              # 指派时间
    
    due_date: Mapped[Optional[str]] = mapped_column(String(64))
    priority: Mapped[str] = mapped_column(String(32), default="normal")          # urgent / high / normal / low
    
    status: Mapped[RemediationStatus] = mapped_column(
        Enum(RemediationStatus),
        default=RemediationStatus.OPEN,
        nullable=False,
        index=True,
    )
    action_plan: Mapped[str] = mapped_column(Text, nullable=False)
    retest_result: Mapped[Optional[str]] = mapped_column(Text)
    retest_evidence: Mapped[Optional[str]] = mapped_column(Text)                 # 复测证据（截图/命令输出）
    retest_at: Mapped[Optional[str]] = mapped_column(String(64))                 # 复测时间
    
    closed_at: Mapped[Optional[str]] = mapped_column(String(64))
    closed_reason: Mapped[Optional[str]] = mapped_column(String(128))            # 关闭原因


class PentestReport(Base):
    """渗透测试报告聚合：保存报告、风险、证据和复核快照"""
    __tablename__ = "pentest_reports"

    id: Mapped[str] = mapped_column(String(96), primary_key=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    session: Mapped[str] = mapped_column(String(256), nullable=False)
    type: Mapped[str] = mapped_column(String(32), default="pentest", nullable=False, index=True)
    report_template: Mapped[Optional[str]] = mapped_column(String(64))
    target: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    model: Mapped[str] = mapped_column(String(128), nullable=False)
    agents: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    date: Mapped[str] = mapped_column(String(32), nullable=False)
    generated_at: Mapped[str] = mapped_column(String(64), nullable=False)
    critical: Mapped[int] = mapped_column(default=0, nullable=False)
    high: Mapped[int] = mapped_column(default=0, nullable=False)
    medium: Mapped[int] = mapped_column(default=0, nullable=False)
    pass_rate: Mapped[int] = mapped_column(default=0, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    findings: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    structured_findings: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    evidence_items: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    review_result: Mapped[Optional[dict]] = mapped_column(JSON)
    data_source: Mapped[Optional[str]] = mapped_column(String(32))
    report_version: Mapped[int] = mapped_column(default=1, nullable=False)
    review: Mapped[Optional[dict]] = mapped_column(JSON)
    status: Mapped[ReportStatus] = mapped_column(Enum(ReportStatus), default=ReportStatus.GENERATED, nullable=False)

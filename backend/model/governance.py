"""
治理闭环模型：审计事件与整改任务
"""
import enum
from typing import Optional

from sqlalchemy import Enum, String, Text
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
    IN_PROGRESS = "in_progress"
    PENDING_RETEST = "pending_retest"
    FIXED = "fixed"
    CLOSED = "closed"
    OVERDUE = "overdue"


class Severity(str, enum.Enum):
    """风险等级"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


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
    finding_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    source_task_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    source_report_id: Mapped[Optional[str]] = mapped_column(String(128), index=True)
    source_report_name: Mapped[Optional[str]] = mapped_column(String(256))
    severity: Mapped[Severity] = mapped_column(Enum(Severity), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    owner_id: Mapped[Optional[str]] = mapped_column(String(128))
    owner_name: Mapped[Optional[str]] = mapped_column(String(128))
    due_date: Mapped[Optional[str]] = mapped_column(String(64))
    status: Mapped[RemediationStatus] = mapped_column(
        Enum(RemediationStatus),
        default=RemediationStatus.OPEN,
        nullable=False,
        index=True,
    )
    action_plan: Mapped[str] = mapped_column(Text, nullable=False)
    retest_result: Mapped[Optional[str]] = mapped_column(Text)
    closed_at: Mapped[Optional[str]] = mapped_column(String(64))

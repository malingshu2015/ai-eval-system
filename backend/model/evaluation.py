"""
评估会话与检查结果模型
"""
import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from model.base import Base
from model.checklist import RiskLevel, TargetType


class SessionStatus(str, enum.Enum):
    """评估会话状态"""
    DRAFT = "draft"             # 草稿（未开始）
    IN_PROGRESS = "in_progress" # 进行中
    COMPLETED = "completed"     # 已完成
    ARCHIVED = "archived"       # 已归档


class CheckResultStatus(str, enum.Enum):
    """检查结果状态"""
    PENDING = "pending"     # 待检查
    PASS = "pass"           # 通过
    FAIL = "fail"           # 失败
    PARTIAL = "partial"     # 部分通过
    N_A = "n_a"             # 不适用


class EvaluationSession(Base):
    """评估会话：一次针对特定目标的完整检查过程"""
    __tablename__ = "evaluation_sessions"

    name: Mapped[str] = mapped_column(String(256), nullable=False)
    target_type: Mapped[TargetType] = mapped_column(Enum(TargetType), nullable=False)
    # 目标 URL 或主机地址
    target_url: Mapped[Optional[str]] = mapped_column(String(512))
    # NOTE: 被测目标的连接配置，使用 AES-256 加密存储（含 API Key 等敏感信息）
    target_config_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    target_description: Mapped[Optional[str]] = mapped_column(Text)
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("checklist_templates.id"), nullable=False
    )
    assignee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus), default=SessionStatus.DRAFT, nullable=False, index=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    # 评估得分（0-100），基于检查结果权重计算
    score: Mapped[Optional[float]] = mapped_column(default=None)

    assignee: Mapped["User"] = relationship(back_populates="sessions")  # noqa: F821
    results: Mapped[list["CheckResult"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
    )


class CheckResult(Base):
    """检查项结果：对某一检查项的执行记录和结论"""
    __tablename__ = "check_results"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("evaluation_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    check_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("check_items.id"), nullable=False
    )
    status: Mapped[CheckResultStatus] = mapped_column(
        Enum(CheckResultStatus), default=CheckResultStatus.PENDING, nullable=False
    )
    # 实际发现的严重等级（可能与检查项预设不同）
    actual_severity: Mapped[Optional[RiskLevel]] = mapped_column(Enum(RiskLevel))
    # 工具执行的原始输出
    raw_output: Mapped[Optional[str]] = mapped_column(Text)
    # 结构化证据（JSON：截图路径、输出片段、链接等）
    evidence: Mapped[Optional[str]] = mapped_column(Text)
    # 工程师备注
    notes: Mapped[Optional[str]] = mapped_column(Text)
    checked_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    session: Mapped["EvaluationSession"] = relationship(back_populates="results")
    check_item: Mapped["CheckItem"] = relationship() # noqa: F821

"""
Checklist 核心模型：模板、类别、检查项
"""
import enum
import uuid
from typing import List, Optional

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from model.base import Base


class TargetType(str, enum.Enum):
    """被测对象类型"""
    LLM = "llm"         # AI 大模型
    AGENT = "agent"     # AI Agent
    WEBAPP = "webapp"   # Web 应用
    IOT = "iot"         # IoT 设备


class RiskLevel(str, enum.Enum):
    """风险等级"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class ChecklistTemplate(Base):
    """检查模板：如「OWASP LLM Top 10 检查清单」"""
    __tablename__ = "checklist_templates"

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    target_type: Mapped[TargetType] = mapped_column(Enum(TargetType), nullable=False, index=True)
    version: Mapped[str] = mapped_column(String(32), default="1.0.0")
    standard: Mapped[Optional[str]] = mapped_column(String(128))  # 对齐标准（如 OWASP LLM Top 10）
    # NOTE: 内置模板不允许删除，只允许禁用
    is_builtin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    categories: Mapped[List["CheckCategory"]] = relationship(
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="CheckCategory.sort_order",
    )


class CheckCategory(Base):
    """检查类别：如「A - 越狱 & Prompt 注入」"""
    __tablename__ = "check_categories"

    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("checklist_templates.id", ondelete="CASCADE"), nullable=False
    )
    code: Mapped[str] = mapped_column(String(16), nullable=False)   # 如 "A", "B"
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    template: Mapped["ChecklistTemplate"] = relationship(back_populates="categories")
    items: Mapped[List["CheckItem"]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
        order_by="CheckItem.sort_order",
    )


class CheckItem(Base):
    """检查项：如「A-01 直接越狱指令抵抗测试」"""
    __tablename__ = "check_items"

    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("check_categories.id", ondelete="CASCADE"), nullable=False
    )
    code: Mapped[str] = mapped_column(String(16), nullable=False)   # 如 "A-01"
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    risk_level: Mapped[RiskLevel] = mapped_column(
        Enum(RiskLevel), default=RiskLevel.MEDIUM, nullable=False
    )
    check_method: Mapped[Optional[str]] = mapped_column(Text)       # 检查方法说明
    expected_result: Mapped[Optional[str]] = mapped_column(Text)    # 预期合格标准
    remediation: Mapped[Optional[str]] = mapped_column(Text)        # 修复建议
    references: Mapped[Optional[str]] = mapped_column(Text)         # JSON 数组，参考链接
    # 关联的工具 ID 列表（JSON 数组）
    tool_ids: Mapped[Optional[str]] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    category: Mapped["CheckCategory"] = relationship(back_populates="items")

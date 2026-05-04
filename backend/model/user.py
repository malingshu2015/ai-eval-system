"""
用户与权限模型
"""
import enum
import uuid
from typing import List, Optional

from sqlalchemy import Boolean, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from model.base import Base


class UserRole(str, enum.Enum):
    """用户角色枚举"""
    SUPER_ADMIN = "super_admin"       # 超级管理员
    EVAL_ENGINEER = "eval_engineer"   # 评估工程师
    AUDITOR = "auditor"               # 只读审计员
    ASSET_MANAGER = "asset_manager"  # 资产管理员


class User(Base):
    """用户模型"""
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(256), unique=True, nullable=False, index=True)
    # NOTE: 密码使用强哈希存储，禁止明文
    hashed_password: Mapped[str] = mapped_column(String(256), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(128))
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole),
        default=UserRole.EVAL_ENGINEER,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # 关联
    sessions: Mapped[List["EvaluationSession"]] = relationship(  # noqa: F821
        back_populates="assignee",
        cascade="all, delete-orphan",
    )

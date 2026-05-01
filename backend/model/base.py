"""
SQLAlchemy ORM 基类
NOTE: 所有模型继承自此 Base，由 main.py 的 lifespan 统一建表
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    """返回带时区信息的 UTC 当前时间"""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """ORM 基类：自动包含 id、created_at、updated_at"""

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )

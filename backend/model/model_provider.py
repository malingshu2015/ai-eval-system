"""
模型供应商配置模型
"""
import enum
from typing import Optional

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from model.base import Base


class ModelProviderStatus(str, enum.Enum):
    """模型供应商状态"""
    ENABLED = "enabled"
    DISABLED = "disabled"


class ModelProvider(Base):
    """模型供应商配置，API Key 使用加密字段保存。"""
    __tablename__ = "model_providers"

    id: Mapped[str] = mapped_column(String(96), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    vendor: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    base_url: Mapped[str] = mapped_column(String(512), nullable=False)
    default_model: Mapped[str] = mapped_column(String(128), nullable=False)
    scenario: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[ModelProviderStatus] = mapped_column(
        Enum(ModelProviderStatus),
        default=ModelProviderStatus.ENABLED,
        nullable=False,
        index=True,
    )
    latency: Mapped[int] = mapped_column(default=0, nullable=False)
    quota: Mapped[int] = mapped_column(default=0, nullable=False)
    timeout: Mapped[int] = mapped_column(default=60, nullable=False)
    api_key_encrypted: Mapped[Optional[str]] = mapped_column(String(1024))

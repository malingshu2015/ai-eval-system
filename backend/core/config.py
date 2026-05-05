"""
应用配置管理
NOTE: 使用 pydantic-settings 从环境变量读取配置，避免硬编码
"""
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    # 应用基础配置
    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "dev-secret-key"
    APP_ALLOWED_ORIGINS: List[str] = ["http://localhost:5173"]

    # 数据库
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/ai_eval_db"

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    CELERY_TASK_ALWAYS_EAGER: bool = False

    # JWT
    JWT_SECRET_KEY: str = "dev-jwt-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    # 加密密钥（AES-256，用于加密存储 API Key 等敏感信息）
    ENCRYPTION_KEY: str = "dev-32-byte-encryption-key-12345"

    # 初始化数据
    SEED_ON_STARTUP: bool = True
    SEED_DEFAULT_ADMIN: bool = True
    SEED_CHECKLIST_TEMPLATES: bool = True
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_EMAIL: str = "admin@example.com"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"

    @field_validator("APP_ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v: str | List[str]) -> List[str]:
        """支持逗号分隔的字符串格式"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v


settings = Settings()

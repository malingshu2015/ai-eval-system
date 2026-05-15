"""
FastAPI 应用入口
NOTE: 使用 lifespan 事件管理数据库连接池的生命周期
"""
import logging
from contextlib import asynccontextmanager

import structlog
import uvicorn
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from core.database import engine
from model.base import Base

# 配置结构化日志
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理：启动时初始化资源，关闭时清理"""
    logger.info("application_startup", env=settings.APP_ENV)
    # NOTE: 开发环境保留自动建表，生产环境必须通过 Alembic 显式迁移。
    if settings.APP_ENV == "development":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    
    # NOTE: 仅开发环境允许启动时自动初始化数据，生产环境必须显式执行迁移和初始化命令。
    if settings.APP_ENV == "development" and settings.SEED_ON_STARTUP:
        try:
            from scripts.seed import seed
            await seed()
        except Exception as e:
            logger.error("seed_failed", error=str(e))
        
    yield
    logger.info("application_shutdown")
    await engine.dispose()


app = FastAPI(
    title="AI 评估工作台",
    description="针对大模型、AI Agent、Web 应用的 Checklist 评估平台",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.APP_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 注册路由
from api.v1 import router as api_v1_router  # noqa: E402
app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/health", tags=["健康检查"])
async def health_check():
    """服务健康检查端点"""
    return {"status": "ok", "version": "0.1.0"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.APP_ENV == "development",
        log_level="info",
    )

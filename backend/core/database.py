"""
数据库连接配置
NOTE: 使用 SQLAlchemy 2.0 异步引擎，避免阻塞 FastAPI 事件循环
"""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from core.config import settings

# 创建异步数据库引擎
# NOTE: 测试环境使用 NullPool 避免连接复用导致的状态污染
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.APP_ENV == "development",
    # SQLite 忽略这部分高级池化参数，所以此处移除
)

# 会话工厂
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncSession:
    """FastAPI 依赖注入：获取数据库会话"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

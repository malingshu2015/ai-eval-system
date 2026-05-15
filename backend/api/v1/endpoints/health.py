"""
健康检查端点
"""
from fastapi import APIRouter, HTTPException

from core.config import settings

router = APIRouter()


@router.get("")
async def health():
    return {"status": "ok"}

@router.get("/seed")
async def run_seed():
    if settings.APP_ENV != "development":
        raise HTTPException(status_code=403, detail="仅开发环境允许通过接口触发初始化数据")

    from scripts.seed import seed

    await seed()
    return {"message": "Database seeded successfully!"}

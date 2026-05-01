"""
健康检查端点
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def health():
    return {"status": "ok"}

@router.get("/seed")
async def run_seed():
    import os
    import sys
    os.system(f"{sys.executable} scripts/seed.py")
    return {"message": "Database seeded successfully!"}

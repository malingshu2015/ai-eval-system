"""
认证端点（登录、注册、刷新 Token）
NOTE: 占位实现，Phase 1 第一周完成完整鉴权逻辑
"""
from fastapi import APIRouter

router = APIRouter()


@router.post("/login")
async def login():
    # TODO: 实现 JWT 登录逻辑
    return {"message": "login endpoint - coming soon"}


@router.post("/register")
async def register():
    # TODO: 实现用户注册逻辑
    return {"message": "register endpoint - coming soon"}

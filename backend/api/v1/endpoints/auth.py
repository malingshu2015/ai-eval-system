"""认证与用户管理端点"""
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import create_access_token, hash_password, verify_password
from model.user import User
from schema.auth import LoginRequest, LoginResponse, UserCreate, UserResponse, UserUpdate

router = APIRouter()


@router.post("/login", response_model=LoginResponse, response_model_by_alias=True)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """使用真实后端用户登录。"""
    result = await db.execute(select(User).where(User.username == payload.username))
    user = result.scalars().first()
    if not user or not user.is_active or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="用户名、密码错误或账号已禁用")

    # 兼容历史 dummy 种子数据，登录成功后升级为哈希密码。
    if user.hashed_password == "dummy":
        user.hashed_password = hash_password(payload.password)
        await db.commit()
        await db.refresh(user)

    token = create_access_token(str(user.id), {"username": user.username, "role": user.role.value})
    return LoginResponse(token=token, user=user)


@router.get("/users", response_model=List[UserResponse], response_model_by_alias=True)
async def list_users(db: AsyncSession = Depends(get_db)):
    """查询真实后端用户列表。"""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.post("/users", response_model=UserResponse, response_model_by_alias=True)
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    """创建真实后端登录用户。"""
    existing_result = await db.execute(
        select(User).where(or_(User.username == payload.username, User.email == payload.email))
    )
    if existing_result.scalars().first():
        raise HTTPException(status_code=409, detail="用户名或邮箱已存在")

    user = User(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserResponse, response_model_by_alias=True)
async def update_user(user_id: uuid.UUID, payload: UserUpdate, db: AsyncSession = Depends(get_db)):
    """更新真实后端用户基础信息、角色和启停状态。"""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    updates = payload.model_dump(exclude_unset=True, by_alias=False)
    for key, value in updates.items():
        setattr(user, key, value)

    await db.commit()
    await db.refresh(user)
    return user

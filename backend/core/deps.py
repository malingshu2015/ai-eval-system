"""
Sprint 7.3：接口级 RBAC 权限依赖层

设计原则：
- 所有鉴权逻辑集中在此模块，不散落在各端点中
- 通过 FastAPI Depends 机制实现声明式权限校验
- 角色权限矩阵维护在此处，便于统一管理
"""
import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from model.user import User, UserRole

# HTTP Bearer Token 提取器（自动从 Authorization 头提取）
bearer_scheme = HTTPBearer(auto_error=False)


def role_value(role: UserRole | str) -> str:
    """统一获取角色值，兼容 ORM Enum 和字符串。"""
    return role.value if isinstance(role, UserRole) else str(role)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    解析 JWT Token，返回当前登录用户。
    所有需要鉴权的接口都应依赖此函数。
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="身份验证失败：Token 无效或已过期",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials:
        raise credentials_exception

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalars().first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在或已被禁用",
        )
    return user


# ---- 便捷角色校验依赖工厂 ----

def require_roles(*allowed_roles: UserRole):
    """
    工厂函数：生成一个只允许特定角色访问的依赖。

    用法示例：
        @router.delete("/{id}", dependencies=[Depends(require_roles(UserRole.SUPER_ADMIN))])
        async def delete_item(...):
            ...
    """
    async def _check_role(current_user: User = Depends(get_current_user)) -> User:
        user_role_val = role_value(current_user.role)
        allowed_values = [r.value for r in allowed_roles]
        
        if user_role_val not in allowed_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"权限不足：该操作需要 {allowed_values} 角色",
            )
        return current_user

    return _check_role


# ---- 预定义常用角色组合依赖（语义化命名，便于复用）----

# 任何已登录用户均可访问（纯认证，无角色限制）
RequireLogin = Depends(get_current_user)

# 需要写权限（超级管理员 或 评估工程师）
RequireWriter = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.EVAL_ENGINEER))

# 需要管理员权限（仅超级管理员）
RequireAdmin = Depends(require_roles(UserRole.SUPER_ADMIN))

# 需要至少只读权限（排除资产管理员的特殊只读域）
RequireAuditorOrAbove = Depends(
    require_roles(UserRole.SUPER_ADMIN, UserRole.EVAL_ENGINEER, UserRole.AUDITOR)
)

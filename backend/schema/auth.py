"""
认证与用户管理 Schema
"""
from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from model.user import UserRole


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True, use_enum_values=True)


class UserResponse(CamelModel):
    id: uuid.UUID
    username: str
    email: str
    full_name: Optional[str] = Field(default=None, alias="fullName")
    role: UserRole
    is_active: bool = Field(alias="isActive")
    created_at: datetime = Field(alias="createdAt")


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(CamelModel):
    token: str
    user: UserResponse


class UserCreate(CamelModel):
    username: str
    password: str
    email: EmailStr
    full_name: Optional[str] = Field(default=None, alias="fullName")
    role: UserRole = UserRole.EVAL_ENGINEER


class UserUpdate(CamelModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(default=None, alias="fullName")
    role: Optional[UserRole] = None
    is_active: Optional[bool] = Field(default=None, alias="isActive")

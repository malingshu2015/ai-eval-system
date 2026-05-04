"""
认证安全工具
"""
from datetime import datetime, timedelta, timezone
from typing import Any
import base64
import hashlib

from cryptography.fernet import Fernet
from jose import jwt
from passlib.context import CryptContext

from core.config import settings

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def _fernet() -> Fernet:
    key = base64.urlsafe_b64encode(hashlib.sha256(settings.ENCRYPTION_KEY.encode("utf-8")).digest())
    return Fernet(key)


def hash_password(password: str) -> str:
    """生成密码哈希。"""
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """校验密码。兼容历史种子数据中的 dummy 管理员。"""
    if password_hash == "dummy":
        return password == "admin123"
    return pwd_context.verify(password, password_hash)


def create_access_token(subject: str, claims: dict[str, Any] | None = None) -> str:
    """生成访问令牌。"""
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expires_at,
    }
    if claims:
        payload.update(claims)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def encrypt_secret(value: str | None) -> str | None:
    """加密敏感配置。"""
    if not value:
        return None
    return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_secret(value: str | None) -> str | None:
    """解密敏感配置。"""
    if not value:
        return None
    return _fernet().decrypt(value.encode("utf-8")).decode("utf-8")

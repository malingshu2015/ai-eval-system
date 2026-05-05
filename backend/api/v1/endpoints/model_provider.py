"""
模型供应商配置端点
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.deps import RequireAuditorOrAbove, RequireWriter
from core.security import encrypt_secret
from model.model_provider import ModelProvider
from schema.model_provider import ModelProviderCreate, ModelProviderResponse, ModelProviderUpdate

router = APIRouter()


def to_response(provider: ModelProvider) -> ModelProviderResponse:
    """转换为前端响应，避免返回 API Key 原文。"""
    return ModelProviderResponse(
        id=provider.id,
        name=provider.name,
        vendor=provider.vendor,
        baseUrl=provider.base_url,
        defaultModel=provider.default_model,
        scenario=provider.scenario,
        status=provider.status,
        latency=provider.latency,
        quota=provider.quota,
        timeout=provider.timeout,
        hasApiKey=bool(provider.api_key_encrypted),
        updatedAt=provider.updated_at,
    )


@router.get("", response_model=List[ModelProviderResponse], response_model_by_alias=True, dependencies=[RequireAuditorOrAbove])
async def list_model_providers(db: AsyncSession = Depends(get_db)):
    """查询模型供应商配置（需要：auditor 及以上角色）"""
    result = await db.execute(select(ModelProvider).order_by(ModelProvider.updated_at.desc()))
    return [to_response(provider) for provider in result.scalars().all()]


@router.post("", response_model=ModelProviderResponse, response_model_by_alias=True, dependencies=[RequireWriter])
async def create_model_provider(payload: ModelProviderCreate, db: AsyncSession = Depends(get_db)):
    """创建模型供应商配置（需要：eval_engineer 及以上角色）"""
    existing = await db.get(ModelProvider, payload.id)
    if existing:
        return to_response(existing)

    provider = ModelProvider(
        id=payload.id,
        name=payload.name,
        vendor=payload.vendor,
        base_url=payload.base_url,
        default_model=payload.default_model,
        scenario=payload.scenario,
        status=payload.status,
        latency=payload.latency,
        quota=payload.quota,
        timeout=payload.timeout,
        api_key_encrypted=encrypt_secret(payload.api_key),
    )
    db.add(provider)
    await db.commit()
    await db.refresh(provider)
    return to_response(provider)


@router.patch("/{provider_id}", response_model=ModelProviderResponse, response_model_by_alias=True, dependencies=[RequireWriter])
async def update_model_provider(
    provider_id: str,
    payload: ModelProviderUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新模型供应商配置（需要：eval_engineer 及以上角色）"""
    provider = await db.get(ModelProvider, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="模型供应商不存在")

    updates = payload.model_dump(exclude_unset=True, by_alias=False)
    api_key = updates.pop("api_key", None)
    for key, value in updates.items():
        setattr(provider, key, value)
    if api_key:
        provider.api_key_encrypted = encrypt_secret(api_key)

    await db.commit()
    await db.refresh(provider)
    return to_response(provider)

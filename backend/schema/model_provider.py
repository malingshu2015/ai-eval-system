"""
模型供应商 Schema
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from model.model_provider import ModelProviderStatus


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True, use_enum_values=True)


class ModelProviderCreate(CamelModel):
    id: str
    name: str
    vendor: str
    base_url: str = Field(alias="baseUrl")
    default_model: str = Field(alias="defaultModel")
    scenario: str
    status: ModelProviderStatus = ModelProviderStatus.ENABLED
    latency: int = 0
    quota: int = 0
    timeout: int = 60
    api_key: Optional[str] = Field(default=None, alias="apiKey")


class ModelProviderUpdate(CamelModel):
    name: Optional[str] = None
    vendor: Optional[str] = None
    base_url: Optional[str] = Field(default=None, alias="baseUrl")
    default_model: Optional[str] = Field(default=None, alias="defaultModel")
    scenario: Optional[str] = None
    status: Optional[ModelProviderStatus] = None
    latency: Optional[int] = None
    quota: Optional[int] = None
    timeout: Optional[int] = None
    api_key: Optional[str] = Field(default=None, alias="apiKey")


class ModelProviderResponse(CamelModel):
    id: str
    name: str
    vendor: str
    base_url: str = Field(alias="baseUrl")
    default_model: str = Field(alias="defaultModel")
    scenario: str
    status: ModelProviderStatus
    latency: int
    quota: int
    timeout: int
    has_api_key: bool = Field(alias="hasApiKey")
    updated_at: datetime = Field(alias="updatedAt")

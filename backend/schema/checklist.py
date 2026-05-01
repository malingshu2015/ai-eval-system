"""
Checklist 相关的 Pydantic 验证模型
"""
import uuid
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from model.checklist import RiskLevel, TargetType


class CheckItemBase(BaseModel):
    code: str = Field(..., title="检查项编号", examples=["A-01"])
    name: str = Field(..., title="检查项名称")
    description: Optional[str] = None
    risk_level: RiskLevel = RiskLevel.MEDIUM
    check_method: Optional[str] = None
    expected_result: Optional[str] = None
    remediation: Optional[str] = None
    references: Optional[str] = None
    tool_ids: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class CheckItemCreate(CheckItemBase):
    pass


class CheckItemResponse(CheckItemBase):
    id: uuid.UUID
    category_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)


class CheckCategoryBase(BaseModel):
    code: str = Field(..., title="分类编号", examples=["A"])
    name: str = Field(..., title="分类名称")
    description: Optional[str] = None
    sort_order: int = 0


class CheckCategoryCreate(CheckCategoryBase):
    items: List[CheckItemCreate] = []


class CheckCategoryResponse(CheckCategoryBase):
    id: uuid.UUID
    template_id: uuid.UUID
    items: List[CheckItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ChecklistTemplateBase(BaseModel):
    name: str = Field(..., title="模板名称")
    description: Optional[str] = None
    target_type: TargetType
    version: str = "1.0.0"
    standard: Optional[str] = None
    is_builtin: bool = False
    is_active: bool = True


class ChecklistTemplateCreate(ChecklistTemplateBase):
    categories: List[CheckCategoryCreate] = []


class ChecklistTemplateResponse(ChecklistTemplateBase):
    id: uuid.UUID
    categories: List[CheckCategoryResponse] = []

    model_config = ConfigDict(from_attributes=True)

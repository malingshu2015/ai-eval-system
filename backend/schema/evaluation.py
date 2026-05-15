"""
评估会话相关的 Pydantic 验证模型
"""
import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from model.checklist import RiskLevel, TargetType
from model.evaluation import CheckResultStatus, SessionStatus
from schema.checklist import ChecklistTemplateResponse


class CheckResultBase(BaseModel):
    status: CheckResultStatus = CheckResultStatus.PENDING
    actual_severity: Optional[RiskLevel] = None
    raw_output: Optional[str] = None
    evidence: Optional[str] = None
    last_poc_output: Optional[str] = None
    notes: Optional[str] = None


class CheckResultUpdate(CheckResultBase):
    pass


class CheckResultResponse(CheckResultBase):
    id: uuid.UUID
    session_id: uuid.UUID
    check_item_id: uuid.UUID
    checked_by_id: Optional[uuid.UUID] = None
    checked_at: Optional[datetime] = None
    confidence_score: Optional[int] = None
    confidence_level: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PocRunResponse(BaseModel):
    status: str
    task_id: Optional[str] = None
    message: str


class PocTaskStatusResponse(BaseModel):
    task_id: str
    task_state: str
    session_id: uuid.UUID
    check_item_id: uuid.UUID
    result_status: CheckResultStatus
    last_poc_output: Optional[str] = None
    confidence_score: Optional[int] = None
    confidence_level: Optional[str] = None
    diagnosis_code: Optional[str] = None
    diagnosis_message: Optional[str] = None
    exit_code: Optional[int] = None
    message: Optional[str] = None


class EvaluationSessionBase(BaseModel):
    name: str = Field(..., title="评估任务名称")
    target_type: TargetType
    target_url: Optional[str] = None
    target_description: Optional[str] = None
    template_id: uuid.UUID
    status: SessionStatus = SessionStatus.DRAFT
    notes: Optional[str] = None


class EvaluationSessionCreate(BaseModel):
    name: str
    target_type: TargetType
    target_url: Optional[str] = None
    target_description: Optional[str] = None
    template_id: uuid.UUID


class EvaluationSessionResponse(EvaluationSessionBase):
    id: uuid.UUID
    assignee_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class EvaluationSessionDetailResponse(EvaluationSessionResponse):
    """包含完整结果和关联模板的详情"""
    results: List[CheckResultResponse] = []
    # 也可以把完整的 template 带回来，但为了轻量化，通常拆分获取，或者这里直接附带

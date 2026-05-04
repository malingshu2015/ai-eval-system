"""
治理闭环 API Schema
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from model.governance import AuditResult, RemediationStatus, Severity


class CamelModel(BaseModel):
    """允许前端使用 camelCase 字段，同时兼容后端 snake_case。"""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True, use_enum_values=True)


class AuditEventCreate(CamelModel):
    id: str
    actor_id: Optional[str] = Field(default=None, alias="actorId")
    actor_name: Optional[str] = Field(default=None, alias="actorName")
    action: str
    target_type: str = Field(alias="targetType")
    target_id: Optional[str] = Field(default=None, alias="targetId")
    target_name: Optional[str] = Field(default=None, alias="targetName")
    result: AuditResult = AuditResult.SUCCESS
    source_ip: Optional[str] = Field(default=None, alias="sourceIp")
    summary: str


class AuditEventResponse(AuditEventCreate):
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class RemediationTaskCreate(CamelModel):
    id: str
    finding_id: str = Field(alias="findingId")
    source_task_id: str = Field(alias="sourceTaskId")
    source_report_id: Optional[str] = Field(default=None, alias="sourceReportId")
    source_report_name: Optional[str] = Field(default=None, alias="sourceReportName")
    severity: Severity
    title: str
    description: Optional[str] = None
    owner_id: Optional[str] = Field(default=None, alias="ownerId")
    owner_name: Optional[str] = Field(default=None, alias="ownerName")
    due_date: Optional[str] = Field(default=None, alias="dueDate")
    status: RemediationStatus = RemediationStatus.OPEN
    action_plan: str = Field(alias="actionPlan")
    retest_result: Optional[str] = Field(default=None, alias="retestResult")
    closed_at: Optional[str] = Field(default=None, alias="closedAt")


class RemediationTaskUpdate(CamelModel):
    owner_id: Optional[str] = Field(default=None, alias="ownerId")
    owner_name: Optional[str] = Field(default=None, alias="ownerName")
    due_date: Optional[str] = Field(default=None, alias="dueDate")
    status: Optional[RemediationStatus] = None
    action_plan: Optional[str] = Field(default=None, alias="actionPlan")
    retest_result: Optional[str] = Field(default=None, alias="retestResult")
    closed_at: Optional[str] = Field(default=None, alias="closedAt")


class RemediationTaskResponse(RemediationTaskCreate):
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

"""
治理闭环 API Schema
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from model.governance import AuditResult, PlanStatus, RemediationStatus, ReportStatus, Severity


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


class RemediationPlanCreate(CamelModel):
    id: str
    report_id: str = Field(alias="reportId")
    report_name: str = Field(alias="reportName")
    target: str
    status: PlanStatus = PlanStatus.ACTIVE
    owner_id: Optional[str] = Field(default=None, alias="ownerId")
    owner_name: Optional[str] = Field(default=None, alias="ownerName")
    created_by_id: str = Field(alias="createdById")
    created_by_name: str = Field(alias="createdByName")
    due_date: Optional[str] = Field(default=None, alias="dueDate")
    summary: Optional[str] = None


class RemediationPlanUpdate(CamelModel):
    status: Optional[PlanStatus] = None
    owner_id: Optional[str] = Field(default=None, alias="ownerId")
    owner_name: Optional[str] = Field(default=None, alias="ownerName")
    due_date: Optional[str] = Field(default=None, alias="dueDate")
    summary: Optional[str] = None


class RemediationPlanResponse(RemediationPlanCreate):
    total_tasks: int = Field(alias="totalTasks")
    completed_tasks: int = Field(alias="completedTasks")
    progress_percent: int = Field(alias="progressPercent")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class RemediationTaskCreate(CamelModel):
    id: str
    plan_id: Optional[str] = Field(default=None, alias="planId")
    finding_id: str = Field(alias="findingId")
    source_task_id: str = Field(alias="sourceTaskId")
    source_report_id: Optional[str] = Field(default=None, alias="sourceReportId")
    source_report_name: Optional[str] = Field(default=None, alias="sourceReportName")
    severity: Severity
    title: str
    description: Optional[str] = None
    owner_id: Optional[str] = Field(default=None, alias="ownerId")
    owner_name: Optional[str] = Field(default=None, alias="ownerName")
    
    # 任务指派字段
    assignee_id: Optional[str] = Field(default=None, alias="assigneeId")
    assignee_name: Optional[str] = Field(default=None, alias="assigneeName")
    assigned_by_id: Optional[str] = Field(default=None, alias="assignedById")
    assigned_by_name: Optional[str] = Field(default=None, alias="assignedByName")
    assigned_at: Optional[str] = Field(default=None, alias="assignedAt")
    
    due_date: Optional[str] = Field(default=None, alias="dueDate")
    priority: str = "normal"
    status: RemediationStatus = RemediationStatus.OPEN
    action_plan: str = Field(alias="actionPlan")
    retest_result: Optional[str] = Field(default=None, alias="retestResult")
    retest_evidence: Optional[str] = Field(default=None, alias="retestEvidence")
    retest_at: Optional[str] = Field(default=None, alias="retestAt")
    closed_at: Optional[str] = Field(default=None, alias="closedAt")
    closed_reason: Optional[str] = Field(default=None, alias="closedReason")


class RemediationTaskUpdate(CamelModel):
    plan_id: Optional[str] = Field(default=None, alias="planId")
    owner_id: Optional[str] = Field(default=None, alias="ownerId")
    owner_name: Optional[str] = Field(default=None, alias="ownerName")
    assignee_id: Optional[str] = Field(default=None, alias="assigneeId")
    assignee_name: Optional[str] = Field(default=None, alias="assigneeName")
    assigned_by_id: Optional[str] = Field(default=None, alias="assignedById")
    assigned_by_name: Optional[str] = Field(default=None, alias="assignedByName")
    assigned_at: Optional[str] = Field(default=None, alias="assignedAt")
    due_date: Optional[str] = Field(default=None, alias="dueDate")
    priority: Optional[str] = None
    status: Optional[RemediationStatus] = None
    action_plan: Optional[str] = Field(default=None, alias="actionPlan")
    retest_result: Optional[str] = Field(default=None, alias="retestResult")
    retest_evidence: Optional[str] = Field(default=None, alias="retestEvidence")
    retest_at: Optional[str] = Field(default=None, alias="retestAt")
    closed_at: Optional[str] = Field(default=None, alias="closedAt")
    closed_reason: Optional[str] = Field(default=None, alias="closedReason")


class RemediationTaskResponse(RemediationTaskCreate):
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class PentestReportPayload(CamelModel):
    id: str
    name: str
    session: str
    type: str = "pentest"
    report_template: Optional[str] = Field(default=None, alias="reportTemplate")
    target: str
    model: str
    agents: list[str] = []
    date: str
    generated_at: str = Field(alias="generatedAt")
    critical: int = 0
    high: int = 0
    medium: int = 0
    pass_rate: int = Field(default=0, alias="passRate")
    content: str
    findings: list[dict] = []
    structured_findings: list[dict] = Field(default=[], alias="structuredFindings")
    evidence_items: list[dict] = Field(default=[], alias="evidenceItems")
    review_result: Optional[dict] = Field(default=None, alias="reviewResult")
    data_source: Optional[str] = Field(default=None, alias="dataSource")
    report_version: int = Field(default=1, alias="reportVersion")
    review: Optional[dict] = None
    status: ReportStatus = ReportStatus.GENERATED


class PentestReportResponse(PentestReportPayload):
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class ShannonPlanCreate(CamelModel):
    target_url: str = Field(alias="targetUrl")
    source_path: str = Field(alias="sourcePath")
    authorization_note: str = Field(alias="authorizationNote")
    output_dir: str = Field(default="./shannon-reports", alias="outputDir")


class ShannonPlanResponse(CamelModel):
    id: str
    target_url: str = Field(alias="targetUrl")
    source_path: str = Field(alias="sourcePath")
    output_dir: str = Field(alias="outputDir")
    status: str
    command: str
    prerequisites: list[str]
    execution_steps: list[str] = Field(alias="executionSteps")
    next_action: str = Field(alias="nextAction")
    created_at: str = Field(alias="createdAt")

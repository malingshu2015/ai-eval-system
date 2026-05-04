"""
模型包导出
NOTE: 所有模型必须在此导入，确保 SQLAlchemy 建表时能发现所有表
"""
from model.base import Base
from model.user import User, UserRole
from model.checklist import (
    ChecklistTemplate,
    CheckCategory,
    CheckItem,
    TargetType,
    RiskLevel,
)
from model.evaluation import (
    EvaluationSession,
    CheckResult,
    SessionStatus,
    CheckResultStatus,
)
from model.governance import (
    AuditEvent,
    AuditResult,
    PentestReport,
    ReportStatus,
    RemediationStatus,
    RemediationTask,
    Severity,
)

__all__ = [
    "Base",
    "User",
    "UserRole",
    "ChecklistTemplate",
    "CheckCategory",
    "CheckItem",
    "TargetType",
    "RiskLevel",
    "EvaluationSession",
    "CheckResult",
    "SessionStatus",
    "CheckResultStatus",
    "AuditEvent",
    "AuditResult",
    "PentestReport",
    "ReportStatus",
    "RemediationStatus",
    "RemediationTask",
    "Severity",
]

from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class SummaryStat(BaseModel):
    title: str
    value: int
    sub: str
    color: str

class RiskDistribution(BaseModel):
    level: str
    label: str
    count: int
    color: str

class RecentFinding(BaseModel):
    key: str
    code: str
    name: str
    target: str
    severity: str
    status: str
    date: str

class DashboardStatsResponse(BaseModel):
    summary: List[SummaryStat]
    risk_distribution: List[RiskDistribution]
    recent_findings: List[RecentFinding]
    pass_rate: float
    pass_count: int
    fail_count: int

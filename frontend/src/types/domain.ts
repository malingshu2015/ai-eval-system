import type { ReportTemplateId } from '@/utils/reportTemplates'

export type DataSourceKind = 'tool' | 'ai_inferred' | 'manual' | 'demo'

export type AssetType = 'llm' | 'agent' | 'webapp' | 'api' | 'iot'

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type EvaluationTaskStatus =
  | 'draft'
  | 'queued'
  | 'running'
  | 'pending_review'
  | 'completed'
  | 'archived'
  | 'failed'

export type EvidenceStatus = 'missing' | 'partial' | 'verified'

export type ReviewStatus = 'pending' | 'verified' | 'rejected'

export type EvidenceType =
  | 'text'
  | 'screenshot'
  | 'request_response'
  | 'command_output'
  | 'model_response'
  | 'log'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export type ReportStatus = 'draft' | 'generated' | 'published' | 'archived'

export type RemediationStatus = 'open' | 'in_progress' | 'pending_retest' | 'fixed' | 'closed' | 'overdue'

export type Asset = {
  id: string
  name: string
  type: AssetType
  target: string
  ownerId?: string
  description?: string
  createdAt: string
}

export type EvaluationTask = {
  id: string
  assetId: string
  checklistTemplateId: string
  reportTemplateId: ReportTemplateId
  name: string
  status: EvaluationTaskStatus
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export type ExecutionRun = {
  id: string
  taskId: string
  status: 'running' | 'completed' | 'failed'
  executor: string
  startedAt: string
  endedAt?: string
  logs?: string[]
}

export type Finding = {
  id: string
  taskId: string
  runId?: string
  title: string
  description: string
  severity: Severity
  category: string
  source: DataSourceKind
  affectedAsset?: string
  evidenceStatus: EvidenceStatus
  reviewStatus: ReviewStatus
  remediationAdvice?: string
  createdAt: string
}

export type Evidence = {
  id: string
  findingId: string
  type: EvidenceType
  sourceTool?: string
  summary: string
  rawContent: string
  confidence: ConfidenceLevel
  collectedAt: string
}

export type ReviewResult = {
  id: string
  taskId: string
  reviewer: 'audit-agent' | 'human'
  overallConfidence: ConfidenceLevel
  verifiedFindingIds: string[]
  needsReviewFindingIds: string[]
  rejectedFindingIds: string[]
  evidenceGaps: string[]
  conclusion: string
  createdAt: string
}

export type Report = {
  id: string
  taskId: string
  templateId: ReportTemplateId
  version: number
  status: ReportStatus
  generatedFrom: {
    findingIds: string[]
    evidenceIds: string[]
    reviewResultId?: string
  }
  generatedAt: string
}

export type RemediationTask = {
  id: string
  findingId: string
  sourceTaskId: string
  sourceReportId?: string
  sourceReportName?: string
  severity: Severity
  title: string
  description?: string
  ownerId?: string
  ownerName?: string
  dueDate?: string
  status: RemediationStatus
  actionPlan: string
  retestResult?: string
  closedAt?: string
  createdAt: string
  updatedAt: string
}

export type AuditEvent = {
  id: string
  actorId?: string
  action: string
  targetType: string
  targetId?: string
  summary: string
  createdAt: string
}

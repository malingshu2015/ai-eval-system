/**
 * 全局 TypeScript 类型定义
 * NOTE: 与后端 Enum 保持同步
 */

// ============ 枚举类型 ============

export type TargetType = 'llm' | 'agent' | 'webapp' | 'iot'

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type SessionStatus = 'draft' | 'in_progress' | 'completed' | 'archived'

export type CheckResultStatus = 'pending' | 'pass' | 'fail' | 'partial' | 'n_a'

export type UserRole = 'super_admin' | 'eval_engineer' | 'auditor' | 'asset_manager'

// ============ 用户 ============

export interface User {
  id: string
  username: string
  email: string
  fullName?: string
  role: UserRole
  isActive: boolean
  createdAt: string
}

// ============ Checklist 模板 ============

export interface CheckItem {
  id: string
  code: string          // 如 "A-01"
  name: string
  description?: string
  riskLevel: RiskLevel
  checkMethod?: string
  expectedResult?: string
  remediation?: string
  references?: string[]
  toolIds?: string[]
  sortOrder: number
  isActive: boolean
}

export interface CheckCategory {
  id: string
  code: string          // 如 "A", "B"
  name: string
  description?: string
  sortOrder: number
  items: CheckItem[]
}

export interface ChecklistTemplate {
  id: string
  name: string
  description?: string
  targetType: TargetType
  version: string
  standard?: string
  isBuiltin: boolean
  isActive: boolean
  categories: CheckCategory[]
  createdAt: string
}

// ============ 评估会话 ============

export interface TargetConfig {
  endpoint?: string
  apiKey?: string       // 前端不显示，后端加密存储
  description?: string
  [key: string]: unknown
}

export interface EvaluationSession {
  id: string
  name: string
  targetType: TargetType
  targetDescription?: string
  templateId: string
  template?: ChecklistTemplate
  assigneeId: string
  assignee?: User
  status: SessionStatus
  notes?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  // 统计信息（后端聚合计算）
  stats?: SessionStats
}

export interface SessionStats {
  total: number
  pass: number
  fail: number
  partial: number
  na: number
  pending: number
  passRate: number        // 0-100
  criticalFindings: number
  highFindings: number
}

// ============ 检查结果 ============

export interface CheckResult {
  id: string
  sessionId: string
  checkItemId: string
  checkItem?: CheckItem
  status: CheckResultStatus
  actualSeverity?: RiskLevel
  rawOutput?: string
  evidence?: EvidenceItem[]
  notes?: string
  checkedById?: string
  checkedAt?: string
}

export interface EvidenceItem {
  type: 'screenshot' | 'text' | 'link' | 'file'
  label: string
  content: string         // URL 或文本内容
}

// ============ API 响应包装 ============

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

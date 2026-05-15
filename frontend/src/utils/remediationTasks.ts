import type { Finding, PlanStatus, RemediationStatus, RemediationTask, RemediationPlan } from '@/types/domain'
import { governanceApi } from '@/api/governance'
import { recordAuditEvent } from './auditEvents'

export type CreateRemediationInput = {
  finding: Finding
  sourceReportId?: string
  sourceReportName?: string
  ownerName?: string
  dueDate?: string
}

export async function fetchRemediationTasks(planId?: string): Promise<RemediationTask[]> {
  try {
    return await governanceApi.getRemediationTasks(planId)
  } catch (error) {
    console.error('Failed to fetch remediation tasks:', error)
    return []
  }
}

export async function fetchRemediationTask(id: string): Promise<RemediationTask | undefined> {
  try {
    return await governanceApi.getRemediationTask(id)
  } catch (error) {
    console.error('Failed to fetch remediation task:', error)
    return undefined
  }
}

export function getRemediationTaskByFinding(_findingId: string): RemediationTask | undefined {
  return undefined
}

// ---- 整改计划 (RemediationPlan) 支持 ----

export async function fetchRemediationPlans(): Promise<RemediationPlan[]> {
  try {
    return await governanceApi.getRemediationPlans()
  } catch (error) {
    console.error('Failed to fetch remediation plans:', error)
    return []
  }
}

export async function fetchRemediationPlan(id: string): Promise<RemediationPlan | undefined> {
  try {
    return await governanceApi.getRemediationPlan(id)
  } catch (error) {
    console.error('Failed to fetch remediation plan:', error)
    return undefined
  }
}

export async function createRemediationTask(input: CreateRemediationInput): Promise<RemediationTask> {
  const now = new Date().toISOString()
  const task: any = {
    id: `remediation-${Date.now()}`,
    findingId: input.finding.id,
    sourceTaskId: input.finding.taskId,
    sourceReportId: input.sourceReportId,
    sourceReportName: input.sourceReportName,
    severity: input.finding.severity,
    title: input.finding.title,
    description: input.finding.description,
    ownerName: input.ownerName || '未指派',
    dueDate: input.dueDate,
    status: 'open',
    actionPlan: input.finding.remediationAdvice || '补充整改方案后执行修复和复测。',
    createdAt: now,
    updatedAt: now,
  }

  const created = await governanceApi.createRemediationTask(task)
  recordAuditEvent({
    action: '创建整改项',
    targetType: 'remediation',
    targetId: created.id,
    targetName: created.title,
    result: 'success',
    summary: `风险发现 ${input.finding.id} 已转入整改中心。`,
  })
  return created
}

export async function updateRemediationTask(id: string, updates: Partial<RemediationTask>): Promise<RemediationTask | undefined> {
  try {
    const updated = await governanceApi.updateRemediationTask(id, updates)
    recordAuditEvent({
      action: '更新整改项',
      targetType: 'remediation',
      targetId: updated.id,
      targetName: updated.title,
      result: 'success',
      summary: `整改项状态更新为 ${remediationStatusLabel(updated.status)}。`,
    })
    return updated
  } catch (error) {
    console.error('Failed to update remediation task:', error)
    return undefined
  }
}

export function remediationStatusLabel(status: RemediationStatus) {
  const labels: Record<RemediationStatus, string> = {
    open: '待处理',
    assigned: '已指派',
    in_progress: '处理中',
    pending_retest: '待复测',
    fixed: '已修复',
    closed: '已关闭',
    overdue: '已逾期',
  }
  return labels[status]
}

export function remediationStatusColor(status: RemediationStatus) {
  const colors: Record<RemediationStatus, string> = {
    open: 'red',
    assigned: 'cyan',
    in_progress: 'blue',
    pending_retest: 'orange',
    fixed: 'green',
    closed: 'default',
    overdue: 'volcano',
  }
  return colors[status]
}

export function planStatusLabel(status: PlanStatus) {
  const labels: Record<PlanStatus, string> = {
    draft: '草稿',
    active: '进行中',
    completed: '已完成',
    archived: '已归档',
  }
  return labels[status]
}

export function planStatusColor(status: PlanStatus) {
  const colors: Record<PlanStatus, string> = {
    draft: 'default',
    active: 'processing',
    completed: 'success',
    archived: 'warning',
  }
  return colors[status]
}

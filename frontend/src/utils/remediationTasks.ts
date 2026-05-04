import type { Finding, RemediationStatus, RemediationTask } from '@/types/domain'

const STORAGE_KEY = 'ai-eval-remediation-tasks'

export type CreateRemediationInput = {
  finding: Finding
  sourceReportId?: string
  sourceReportName?: string
  ownerName?: string
  dueDate?: string
}

export function getRemediationTasks(): RemediationTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getRemediationTask(id: string): RemediationTask | undefined {
  return getRemediationTasks().find((task) => task.id === id)
}

export function getRemediationTaskByFinding(findingId: string): RemediationTask | undefined {
  return getRemediationTasks().find((task) => task.findingId === findingId)
}

export function saveRemediationTasks(tasks: RemediationTask[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

export function createRemediationTask(input: CreateRemediationInput): RemediationTask {
  const existing = getRemediationTaskByFinding(input.finding.id)
  if (existing) return existing

  const now = new Date().toLocaleString()
  const task: RemediationTask = {
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

  saveRemediationTasks([task, ...getRemediationTasks()])
  return task
}

export function updateRemediationTask(id: string, updates: Partial<RemediationTask>): RemediationTask | undefined {
  let updatedTask: RemediationTask | undefined
  const tasks = getRemediationTasks().map((task) => {
    if (task.id !== id) return task
    updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date().toLocaleString(),
    }
    return updatedTask
  })
  saveRemediationTasks(tasks)
  return updatedTask
}

export function remediationStatusLabel(status: RemediationStatus) {
  const labels: Record<RemediationStatus, string> = {
    open: '待处理',
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
    in_progress: 'blue',
    pending_retest: 'orange',
    fixed: 'green',
    closed: 'default',
    overdue: 'volcano',
  }
  return colors[status]
}

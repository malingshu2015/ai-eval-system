import type { AuditEvent } from '@/types/domain'

const STORAGE_KEY = 'ai-eval-audit-events'

type AuditResult = AuditEvent['result']

export type CreateAuditEventInput = {
  actorId?: string
  actorName?: string
  action: string
  targetType: string
  targetId?: string
  targetName?: string
  result?: AuditResult
  summary: string
}

const DEMO_EVENTS: AuditEvent[] = [
  {
    id: 'audit-demo-1',
    actorId: 'system-demo',
    actorName: '系统演示',
    action: '生成报告',
    targetType: 'report',
    targetName: 'GPT-4o 安全评估报告',
    result: 'success',
    sourceIp: 'demo',
    summary: '演示数据：报告生成成功。',
    createdAt: '2026-05-03 09:44:21',
  },
  {
    id: 'audit-demo-2',
    actorId: 'system-demo',
    actorName: '系统演示',
    action: '登录失败',
    targetType: 'auth',
    targetName: 'admin@example.com',
    result: 'failed',
    sourceIp: '203.0.113.42',
    summary: '演示数据：连续失败 5 次，账号已临时锁定。',
    createdAt: '2026-05-02 20:12:02',
  },
]

export function getAuditEvents(): AuditEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEMO_EVENTS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : DEMO_EVENTS
  } catch {
    return DEMO_EVENTS
  }
}

export function recordAuditEvent(input: CreateAuditEventInput): AuditEvent {
  const event: AuditEvent = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    actorId: input.actorId,
    actorName: input.actorName || input.actorId || '未知用户',
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    targetName: input.targetName,
    result: input.result || 'success',
    sourceIp: 'local-browser',
    summary: input.summary,
    createdAt: new Date().toLocaleString(),
  }
  const nextEvents = [event, ...getAuditEvents()].slice(0, 200)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEvents))
  return event
}

export function auditResultLabel(result: AuditResult) {
  const labels: Record<AuditResult, string> = {
    success: '成功',
    failed: '失败',
    warning: '需关注',
  }
  return labels[result]
}

export function auditResultColor(result: AuditResult) {
  const colors: Record<AuditResult, string> = {
    success: 'success',
    failed: 'error',
    warning: 'warning',
  }
  return colors[result]
}

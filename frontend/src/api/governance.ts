import apiClient from './client'
import type { AuditEvent, RemediationPlan, RemediationTask } from '@/types/domain'
import type { PentestReportRecord } from '@/utils/pentestReports'

export type CreateAuditEventDto = AuditEvent

export type CreateRemediationDto = RemediationTask

export type UpdateRemediationDto = Partial<Pick<RemediationTask,
  'ownerId' | 'ownerName' | 'dueDate' | 'status' | 'actionPlan' | 'retestResult' | 'closedAt' | 'assigneeId' | 'assigneeName' | 'priority' | 'retestEvidence' | 'closedReason' | 'planId'
>>

export type CreateRemediationPlanDto = Omit<RemediationPlan, 'totalTasks' | 'completedTasks' | 'progressPercent' | 'createdAt' | 'updatedAt'>
export type UpdateRemediationPlanDto = Partial<Pick<RemediationPlan, 'status' | 'ownerId' | 'ownerName' | 'dueDate' | 'summary'>>

export type CreateShannonPlanDto = {
  targetUrl: string
  sourcePath: string
  authorizationNote: string
  outputDir?: string
}

export type ShannonPlan = {
  id: string
  targetUrl: string
  sourcePath: string
  outputDir: string
  status: string
  command: string
  prerequisites: string[]
  executionSteps: string[]
  nextAction: string
  createdAt: string
}

export const governanceApi = {
  getAuditEvents: (): Promise<AuditEvent[]> => {
    return apiClient.get('/audit-events')
  },

  createAuditEvent: (data: CreateAuditEventDto): Promise<AuditEvent> => {
    return apiClient.post('/audit-events', data)
  },

  getRemediationTasks: (planId?: string): Promise<RemediationTask[]> => {
    return apiClient.get('/remediations', { params: { planId } })
  },

  getRemediationTask: (id: string): Promise<RemediationTask> => {
    return apiClient.get(`/remediations/${id}`)
  },

  createRemediationTask: (data: CreateRemediationDto): Promise<RemediationTask> => {
    return apiClient.post('/remediations', data)
  },

  updateRemediationTask: (id: string, data: UpdateRemediationDto): Promise<RemediationTask> => {
    return apiClient.patch(`/remediations/${id}`, data)
  },

  // ---- 整改计划 (RemediationPlan) ----
  getRemediationPlans: (): Promise<RemediationPlan[]> => {
    return apiClient.get('/remediation-plans')
  },

  getRemediationPlan: (id: string): Promise<RemediationPlan> => {
    return apiClient.get(`/remediation-plans/${id}`)
  },

  createRemediationPlan: (data: CreateRemediationPlanDto): Promise<RemediationPlan> => {
    return apiClient.post('/remediation-plans', data)
  },

  updateRemediationPlan: (id: string, data: UpdateRemediationPlanDto): Promise<RemediationPlan> => {
    return apiClient.patch(`/remediation-plans/${id}`, data)
  },

  // ---- 指派支持 ----
  getAssignableUsers: (): Promise<Array<{ id: string, username: string, fullName: string, role: string }>> => {
    return apiClient.get('/users/assignable')
  },

  getPentestReports: (): Promise<PentestReportRecord[]> => {
    return apiClient.get('/pentest-reports')
  },

  getPentestReport: (id: string): Promise<PentestReportRecord> => {
    return apiClient.get(`/pentest-reports/${id}`)
  },

  savePentestReport: (data: PentestReportRecord): Promise<PentestReportRecord> => {
    return apiClient.post('/pentest-reports', data)
  },

  deletePentestReports: (ids: string[]): Promise<{ deleted: number }> => {
    return apiClient.delete(`/pentest-reports?ids=${ids.join(',')}`)
  },

  createShannonPlan: (data: CreateShannonPlanDto): Promise<ShannonPlan> => {
    return apiClient.post('/shannon/plans', data)
  },
}

import apiClient from './client'
import type { AuditEvent, RemediationTask } from '@/types/domain'

export type CreateAuditEventDto = AuditEvent

export type CreateRemediationDto = RemediationTask

export type UpdateRemediationDto = Partial<Pick<
  RemediationTask,
  'ownerId' | 'ownerName' | 'dueDate' | 'status' | 'actionPlan' | 'retestResult' | 'closedAt'
>>

export const governanceApi = {
  getAuditEvents: (): Promise<AuditEvent[]> => {
    return apiClient.get('/audit-events')
  },

  createAuditEvent: (data: CreateAuditEventDto): Promise<AuditEvent> => {
    return apiClient.post('/audit-events', data)
  },

  getRemediationTasks: (): Promise<RemediationTask[]> => {
    return apiClient.get('/remediations')
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
}

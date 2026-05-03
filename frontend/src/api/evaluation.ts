import apiClient from './client'
import type { CheckResultStatus } from '@/types'

export interface CreateSessionDto {
  name: string
  target_type: 'llm' | 'agent' | 'webapp'
  target_url?: string
  target_description?: string
  template_id: string
}

export interface CheckResult {
  id: string
  session_id: string
  check_item_id: string
  status: CheckResultStatus
  notes?: string
  evidence?: string
  raw_output?: string
  actual_severity?: string
}

export interface EvaluationSession {
  id: string
  name: string
  target_type: 'llm' | 'agent' | 'webapp'
  target_url?: string
  status: 'draft' | 'in_progress' | 'completed' | 'archived'
  template_id: string
  created_at: string
  results?: CheckResult[]
}

export const evaluationApi = {
  getSessions: (): Promise<EvaluationSession[]> => {
    return apiClient.get('/evaluations')
  },

  getSession: (id: string): Promise<EvaluationSession> => {
    return apiClient.get(`/evaluations/${id}`)
  },

  createSession: (data: CreateSessionDto): Promise<EvaluationSession> => {
    return apiClient.post('/evaluations', data)
  },

  updateResult: (
    sessionId: string,
    checkItemId: string,
    data: Partial<CheckResult>
  ): Promise<{ message: string }> => {
    return apiClient.patch(`/evaluations/${sessionId}/results/${checkItemId}`, data)
  },

  updateSession: (id: string, data: Partial<EvaluationSession>): Promise<EvaluationSession> => {
    return apiClient.patch(`/evaluations/${id}`, data)
  },

  deleteSession: (id: string): Promise<{ message: string }> => {
    return apiClient.delete(`/evaluations/${id}`)
  },
}

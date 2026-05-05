import apiClient from './client'
import type { CheckResultStatus, TargetType } from '@/types'

export interface CreateSessionDto {
  name: string
  target_type: TargetType
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
  last_poc_output?: string
  actual_severity?: string
  confidence_score?: number
  confidence_level?: 'high' | 'medium' | 'low' | 'unknown'
}

export interface PocTaskStatus {
  task_id: string
  task_state: string
  session_id: string
  check_item_id: string
  result_status: CheckResultStatus
  last_poc_output?: string
  confidence_score?: number
  confidence_level?: 'high' | 'medium' | 'low' | 'unknown'
  diagnosis_code?: string
  diagnosis_message?: string
  exit_code?: number
  message?: string
}

export interface EvaluationSession {
  id: string
  name: string
  target_type: TargetType
  target_url?: string
  target_description?: string
  score?: number
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

  runPoc: (
    sessionId: string,
    checkItemId: string
  ): Promise<{ status: string; task_id?: string; message: string }> => {
    return apiClient.post(`/evaluations/${sessionId}/results/${checkItemId}/run-poc`)
  },

  getPocTaskStatus: (
    sessionId: string,
    checkItemId: string,
    taskId: string
  ): Promise<PocTaskStatus> => {
    return apiClient.get(`/evaluations/${sessionId}/results/${checkItemId}/poc-task/${taskId}`)
  },

  exportReportHtml: (sessionId: string): Promise<Blob> => {
    return apiClient.get(`/report/${sessionId}/report`, {
      responseType: 'blob',
      headers: { Accept: 'text/html' },
    })
  },

  updateSession: (id: string, data: Partial<EvaluationSession>): Promise<EvaluationSession> => {
    return apiClient.patch(`/evaluations/${id}`, data)
  },

  deleteSession: (id: string): Promise<{ message: string }> => {
    return apiClient.delete(`/evaluations/${id}`)
  },
}

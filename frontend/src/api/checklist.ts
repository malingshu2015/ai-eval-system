import apiClient from './client'

export interface CheckItem {
  id: string
  code: string
  name: string
  description?: string
  risk_level: 'critical' | 'high' | 'medium' | 'low' | 'info'
  check_method?: string
  expected_result?: string
  remediation?: string
  tool_ids?: string
  poc_code?: string
}

export interface CheckCategory {
  id: string
  code: string
  name: string
  description?: string
  items: CheckItem[]
}

export interface ChecklistTemplate {
  id: string
  name: string
  description?: string
  target_type: 'llm' | 'agent' | 'webapp'
  version: string
  standard?: string
  is_builtin: boolean
  categories: CheckCategory[]
}

export const checklistApi = {
  /**
   * 获取所有检查模板
   */
  getTemplates: (): Promise<ChecklistTemplate[]> => {
    return apiClient.get('/checklists')
  },

  /**
   * 获取单个模板详情（含完整的分类与检查项）
   */
  getTemplate: (id: string): Promise<ChecklistTemplate> => {
    return apiClient.get(`/checklists/${id}`)
  },

  /**
   * 创建新的检查模板
   */
  createTemplate: (data: Partial<ChecklistTemplate>): Promise<ChecklistTemplate> => {
    return apiClient.post('/checklists', data)
  },
}

import apiClient from './client'

export type ModelProviderRecord = {
  id: string
  name: string
  vendor: string
  baseUrl: string
  defaultModel: string
  scenario: string
  status: 'enabled' | 'disabled'
  latency: number
  quota: number
  timeout?: number
  hasApiKey?: boolean
  updatedAt: string
}

export type CreateModelProviderDto = Omit<ModelProviderRecord, 'hasApiKey' | 'updatedAt'> & {
  apiKey?: string
}

export type UpdateModelProviderDto = Partial<CreateModelProviderDto>

export const modelProviderApi = {
  getProviders: (): Promise<ModelProviderRecord[]> => {
    return apiClient.get('/model-providers')
  },

  createProvider: (data: CreateModelProviderDto): Promise<ModelProviderRecord> => {
    return apiClient.post('/model-providers', data)
  },

  updateProvider: (id: string, data: UpdateModelProviderDto): Promise<ModelProviderRecord> => {
    return apiClient.patch(`/model-providers/${id}`, data)
  },
}

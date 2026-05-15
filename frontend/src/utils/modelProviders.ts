import { modelProviderApi, type CreateModelProviderDto, type ModelProviderRecord, type UpdateModelProviderDto } from '@/api/modelProviders'

const STORAGE_KEY = 'ai-eval-model-providers'

export function getStoredModelProviders(defaultProviders: ModelProviderRecord[]): ModelProviderRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProviders))
      return defaultProviders
    }
    const providers = JSON.parse(raw)
    return Array.isArray(providers) ? providers : defaultProviders
  } catch {
    return defaultProviders
  }
}

export function saveStoredModelProviders(providers: ModelProviderRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(providers))
}

function isSameProvider(left: ModelProviderRecord, right: ModelProviderRecord) {
  return left.id === right.id || (left.name === right.name && left.vendor === right.vendor)
}

export async function fetchModelProviders(defaultProviders: ModelProviderRecord[]) {
  try {
    const remoteProviders = await modelProviderApi.getProviders()
    const localProviders = getStoredModelProviders(defaultProviders)
    const mergedProviders = [
      ...remoteProviders,
      ...localProviders.filter((provider) => !remoteProviders.some((item) => isSameProvider(item, provider))),
    ]
    saveStoredModelProviders(mergedProviders)
    return mergedProviders
  } catch {
    return getStoredModelProviders(defaultProviders)
  }
}

export async function createModelProvider(provider: CreateModelProviderDto, defaultProviders: ModelProviderRecord[]) {
  try {
    const remoteProvider = await modelProviderApi.createProvider(provider)
    const providers = getStoredModelProviders(defaultProviders)
    saveStoredModelProviders([remoteProvider, ...providers.filter((item) => !isSameProvider(item, remoteProvider))])
    return remoteProvider
  } catch {
    const providers = getStoredModelProviders(defaultProviders)
    const localProvider: ModelProviderRecord = {
      ...provider,
      hasApiKey: Boolean(provider.apiKey),
      updatedAt: '刚刚',
    }
    saveStoredModelProviders([localProvider, ...providers.filter((item) => !isSameProvider(item, localProvider))])
    return localProvider
  }
}

export async function updateModelProvider(id: string, updates: UpdateModelProviderDto, defaultProviders: ModelProviderRecord[]) {
  try {
    const remoteProvider = await modelProviderApi.updateProvider(id, updates)
    const providers = getStoredModelProviders(defaultProviders)
    const nextProviders = providers.map((provider) => provider.id === id ? remoteProvider : provider)
    saveStoredModelProviders(nextProviders)
    return nextProviders
  } catch {
    const providers = getStoredModelProviders(defaultProviders)
    const nextProviders = providers.map((provider) => (
      provider.id === id ? { ...provider, ...updates, updatedAt: '刚刚' } : provider
    ))
    saveStoredModelProviders(nextProviders)
    return nextProviders
  }
}

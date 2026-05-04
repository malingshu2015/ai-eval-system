import type { User, UserRole } from '@/types'

export type LocalAccountStatus = 'active' | 'disabled' | 'locked'

export type LocalAccount = {
  id: string
  username: string
  password: string
  email: string
  fullName: string
  role: UserRole
  status: LocalAccountStatus
  createdAt: string
  lastLogin?: string
}

const STORAGE_KEY = 'ai-eval-local-accounts'

const DEFAULT_ACCOUNTS: LocalAccount[] = [
  {
    id: 'u-admin',
    username: 'admin',
    password: 'admin123',
    email: 'admin@example.com',
    fullName: '系统管理员',
    role: 'super_admin',
    status: 'active',
    createdAt: '2026-05-03T00:00:00.000Z',
  },
]

export const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: '超级管理员',
  eval_engineer: '评估员',
  auditor: '审计员',
  asset_manager: '资产管理员',
}

export const ROLE_OPTIONS = Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))

export function getLocalAccounts(): LocalAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ACCOUNTS))
      return DEFAULT_ACCOUNTS
    }

    const accounts = JSON.parse(raw)
    return Array.isArray(accounts) ? accounts : DEFAULT_ACCOUNTS
  } catch {
    return DEFAULT_ACCOUNTS
  }
}

export function saveLocalAccounts(accounts: LocalAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
}

export function addLocalAccount(account: Omit<LocalAccount, 'id' | 'createdAt' | 'status'>) {
  const accounts = getLocalAccounts()
  const nextAccount: LocalAccount = {
    ...account,
    id: `u-${Date.now()}`,
    status: 'active',
    createdAt: new Date().toISOString(),
  }
  saveLocalAccounts([nextAccount, ...accounts])
  return nextAccount
}

export function updateLocalAccount(id: string, updates: Partial<LocalAccount>) {
  const accounts = getLocalAccounts()
  const nextAccounts = accounts.map((account) => account.id === id ? { ...account, ...updates } : account)
  saveLocalAccounts(nextAccounts)
  return nextAccounts
}

export function authenticateLocalAccount(username: string, password: string): User | null {
  const accounts = getLocalAccounts()
  const account = accounts.find((item) => item.username === username && item.password === password)
  if (!account || account.status !== 'active') return null

  updateLocalAccount(account.id, { lastLogin: new Date().toLocaleString() })
  return {
    id: account.id,
    username: account.username,
    email: account.email,
    fullName: account.fullName,
    role: account.role,
    isActive: account.status === 'active',
    createdAt: account.createdAt,
  }
}

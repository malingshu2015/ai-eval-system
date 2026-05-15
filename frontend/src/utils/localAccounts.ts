import type { User, UserRole } from '@/types'
import { authApi, type CreateUserDto, type UpdateUserDto } from '@/api/auth'

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

function userToLocalAccount(user: User): LocalAccount {
  return {
    id: user.id,
    username: user.username,
    password: '',
    email: user.email,
    fullName: user.fullName || user.username,
    role: user.role,
    status: user.isActive ? 'active' : 'disabled',
    createdAt: user.createdAt,
  }
}

function isSameAccount(left: LocalAccount, right: LocalAccount) {
  return left.id === right.id || left.username === right.username || left.email === right.email
}

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

export async function fetchAccounts(): Promise<LocalAccount[]> {
  try {
    const users = await authApi.getUsers()
    const remoteAccounts = users.map(userToLocalAccount)
    const localAccounts = getLocalAccounts()
    const mergedAccounts = [
      ...remoteAccounts,
      ...localAccounts.filter((account) => !remoteAccounts.some((item) => isSameAccount(item, account))),
    ]
    saveLocalAccounts(mergedAccounts)
    return mergedAccounts
  } catch {
    return getLocalAccounts()
  }
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

export async function addAccount(account: CreateUserDto): Promise<LocalAccount> {
  try {
    const user = await authApi.createUser(account)
    const nextAccount = userToLocalAccount(user)
    const accounts = getLocalAccounts()
    saveLocalAccounts([nextAccount, ...accounts.filter((item) => !isSameAccount(item, nextAccount))])
    return nextAccount
  } catch {
    return addLocalAccount({
      username: account.username,
      password: account.password,
      email: account.email,
      fullName: account.fullName || account.username,
      role: account.role,
    })
  }
}

export function updateLocalAccount(id: string, updates: Partial<LocalAccount>) {
  const accounts = getLocalAccounts()
  const nextAccounts = accounts.map((account) => account.id === id ? { ...account, ...updates } : account)
  saveLocalAccounts(nextAccounts)
  return nextAccounts
}

export async function updateAccount(id: string, updates: Partial<LocalAccount>): Promise<LocalAccount[]> {
  const apiUpdates: UpdateUserDto = {}
  if (updates.email !== undefined) apiUpdates.email = updates.email
  if (updates.fullName !== undefined) apiUpdates.fullName = updates.fullName
  if (updates.role !== undefined) apiUpdates.role = updates.role
  if (updates.status !== undefined) apiUpdates.isActive = updates.status === 'active'

  try {
    const user = await authApi.updateUser(id, apiUpdates)
    const nextAccount = userToLocalAccount(user)
    const accounts = getLocalAccounts().map((account) => account.id === id ? nextAccount : account)
    saveLocalAccounts(accounts)
    return accounts
  } catch {
    return updateLocalAccount(id, updates)
  }
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

export async function authenticateAccount(username: string, password: string): Promise<{ token: string; user: User } | null> {
  try {
    const result = await authApi.login({ username, password })
    const accounts = getLocalAccounts()
    const nextAccount = userToLocalAccount(result.user)
    nextAccount.lastLogin = new Date().toLocaleString()
    saveLocalAccounts([nextAccount, ...accounts.filter((account) => !isSameAccount(account, nextAccount))])
    return result
  } catch {
    const user = authenticateLocalAccount(username, password)
    return user ? { token: `local-token-${user.id}`, user } : null
  }
}

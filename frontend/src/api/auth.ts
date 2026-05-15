import apiClient from './client'
import type { User, UserRole } from '@/types'

export type LoginDto = {
  username: string
  password: string
}

export type LoginResult = {
  token: string
  user: User
}

export type CreateUserDto = {
  username: string
  password: string
  email: string
  fullName?: string
  role: UserRole
}

export type UpdateUserDto = Partial<{
  email: string
  fullName: string
  role: UserRole
  isActive: boolean
}>

export const authApi = {
  login: (data: LoginDto): Promise<LoginResult> => {
    return apiClient.post('/auth/login', data)
  },

  getUsers: (): Promise<User[]> => {
    return apiClient.get('/auth/users')
  },

  createUser: (data: CreateUserDto): Promise<User> => {
    return apiClient.post('/auth/users', data)
  },

  updateUser: (id: string, data: UpdateUserDto): Promise<User> => {
    return apiClient.patch(`/auth/users/${id}`, data)
  },
}

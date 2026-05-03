import client from './client'

export interface DashboardStats {
  summary: {
    title: string
    value: number
    sub: string
    color: string
    icon?: string
  }[]
  risk_distribution: {
    level: string
    label: string
    count: number
    color: string
  }[]
  recent_findings: {
    key: string
    code: string
    name: string
    target: string
    severity: string
    status: string
    date: string
  }[]
  pass_rate: number
  pass_count: number
  fail_count: number
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await client.get('/dashboard/stats')
    return res as any
  }
}

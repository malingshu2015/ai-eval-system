/**
 * 应用根组件
 * NOTE: 配置全局 Provider、路由和 Ant Design 主题
 */
import { ConfigProvider, theme as antTheme, App as AntApp } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import zhCN from 'antd/locale/zh_CN'

import MainLayout from '@/components/layout/MainLayout'
import Dashboard from '@/pages/dashboard/Dashboard'
import EvaluationList from '@/pages/evaluation/EvaluationList'
import EvaluationWorkbench from '@/pages/evaluation/EvaluationWorkbench'
import ChecklistLibrary from '@/pages/checklist/ChecklistLibrary'
import Reports from '@/pages/reports/Reports'
import ReportDetail from '@/pages/reports/ReportDetail'
import Login from '@/pages/auth/Login'
import { useAuthStore } from '@/stores/authStore'

import './index.css'

// React Query 全局配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

// Ant Design 主题配置
const antdTheme = {
  algorithm: antTheme.defaultAlgorithm,
  token: {
    colorPrimary: '#2563eb',
    colorBgBase: '#f4f7fb',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBorder: '#e2e8f0',
    borderRadius: 10,
    fontFamily: "'Inter', -apple-system, sans-serif",
    colorText: '#0f172a',
    colorTextSecondary: '#64748b',
  },
  components: {
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#0f172a',
      headerBorderRadius: 8,
    },
    Card: {
      boxShadowTertiary: '0 4px 20px rgba(0, 0, 0, 0.03)',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#eff6ff',
      itemSelectedColor: '#2563eb',
    },
  },
}

/** 守卫路由：未登录跳转 /login */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhCN} theme={antdTheme}>
        <AntApp>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="evaluations" element={<EvaluationList />} />
                <Route path="evaluations/:id" element={<EvaluationWorkbench />} />
                <Route path="checklists" element={<ChecklistLibrary />} />
                <Route path="reports" element={<Reports />} />
                <Route path="reports/:id" element={<ReportDetail />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  )
}

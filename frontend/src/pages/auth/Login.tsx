/**
 * 登录页
 */
import { Form, Input, Button, Typography, message } from 'antd'
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { authenticateLocalAccount } from '@/utils/localAccounts'
import { recordAuditEvent } from '@/utils/auditEvents'

const { Title, Text } = Typography

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const handleSubmit = (values: { username: string; password: string }) => {
    const user = authenticateLocalAccount(values.username, values.password)
    if (user) {
      login(`local-token-${user.id}`, user)
      recordAuditEvent({
        actorId: user.id,
        actorName: user.username,
        action: '登录成功',
        targetType: 'auth',
        targetId: user.id,
        targetName: user.username,
        result: 'success',
        summary: '用户通过本地账号登录系统。',
      })
      navigate('/dashboard')
    } else {
      recordAuditEvent({
        actorName: values.username,
        action: '登录失败',
        targetType: 'auth',
        targetName: values.username,
        result: 'failed',
        summary: '用户名、密码错误或账号已禁用。',
      })
      message.error('用户名、密码错误或账号已禁用')
    }
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(91,110,245,0.15) 0%, #0f1117 60%)',
    }}>
      <div style={{
        width: 400, background: 'var(--bg-card)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, padding: 40,
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <SafetyOutlined style={{ fontSize: 40, color: 'var(--color-primary)', filter: 'drop-shadow(0 0 12px rgba(91,110,245,0.6))' }} />
          <Title level={4} style={{ color: 'var(--text-primary)', margin: '12px 0 4px' }}>AI 评估工作台</Title>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>安全 · 可信 · 专业</Text>
        </div>

        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input
              prefix={<UserOutlined style={{ color: '#5a6080' }} />}
              placeholder="用户名"
              size="large"
              style={{ background: 'var(--bg-hover)', borderColor: 'var(--bg-border)', color: 'var(--text-primary)' }}
            />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password
              prefix={<LockOutlined style={{ color: '#5a6080' }} />}
              placeholder="密码"
              size="large"
              style={{ background: 'var(--bg-hover)', borderColor: 'var(--bg-border)', color: 'var(--text-primary)' }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary" htmlType="submit" size="large" block
              style={{ background: 'linear-gradient(135deg, #5b6ef5, #8b5cf6)', border: 'none', height: 48, fontSize: 15 }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}

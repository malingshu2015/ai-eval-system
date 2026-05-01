/**
 * 报告中心列表页
 */
import { Button, Table, Tag, Typography, Space } from 'antd'
import { DownloadOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

const MOCK_REPORTS = [
  { id: '1', name: 'GPT-4o 安全评估报告', session: 'GPT-4o 安全评估 #001', type: 'llm', date: '2026-04-21', critical: 2, high: 1, medium: 3, passRate: 61 },
  { id: '2', name: 'Code Agent 工具安全测试报告', session: 'Code Agent 工具安全测试', type: 'agent', date: '2026-04-20', critical: 0, high: 1, medium: 2, passRate: 83 },
  { id: '3', name: 'AI 平台渗透测试报告', session: '内部 AI 平台渗透测试', type: 'webapp', date: '2026-04-18', critical: 1, high: 2, medium: 1, passRate: 72 },
]

const TYPE_COLOR: Record<string, string> = { llm: 'var(--color-primary)', agent: '#8b5cf6', webapp: '#06b6d4' }
const TYPE_LABEL: Record<string, string> = { llm: 'AI 大模型', agent: 'AI Agent', webapp: 'Web 应用' }

export default function Reports() {
  const navigate = useNavigate()

  const columns = [
    {
      title: '报告名称',
      dataIndex: 'name',
      render: (v: string) => (
        <Space>
          <FileTextOutlined style={{ color: 'var(--color-primary)' }} />
          <Text style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v}</Text>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      render: (v: string) => <Tag color={TYPE_COLOR[v]} style={{ borderRadius: 100 }}>{TYPE_LABEL[v]}</Tag>,
    },
    { title: '关联评估', dataIndex: 'session', render: (v: string) => <Text style={{ color: 'var(--text-secondary)' }}>{v}</Text> },
    { title: '生成日期', dataIndex: 'date', render: (v: string) => <Text style={{ color: 'var(--text-muted)' }}>{v}</Text> },
    {
      title: '风险摘要',
      render: (_: unknown, r: typeof MOCK_REPORTS[0]) => (
        <Space size={4}>
          {r.critical > 0 && <Tag color="#ff3b5c" style={{ borderRadius: 100 }}>严重 {r.critical}</Tag>}
          {r.high > 0 && <Tag color="#ff6b35" style={{ borderRadius: 100 }}>高危 {r.high}</Tag>}
          {r.medium > 0 && <Tag color="#ffa500" style={{ borderRadius: 100 }}>中危 {r.medium}</Tag>}
        </Space>
      ),
    },
    {
      title: '通过率',
      dataIndex: 'passRate',
      render: (v: number) => (
        <Text style={{ color: v >= 80 ? '#22c55e' : v >= 60 ? '#ffa500' : '#ef4444', fontWeight: 600 }}>
          {v}%
        </Text>
      ),
    },
    {
      title: '操作',
      render: (_: unknown, record: typeof MOCK_REPORTS[0]) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            style={{ color: 'var(--color-primary)', padding: 0 }}
            onClick={() => navigate(`/reports/${record.id}`)}
          >
            查看
          </Button>
          <Button type="link" size="small" icon={<DownloadOutlined />} style={{ color: 'var(--text-secondary)', padding: 0 }}>
            下载
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>报告中心</Title>
        <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>查看、下载所有已完成的评估报告</Text>
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 20 }}>
        <Table dataSource={MOCK_REPORTS} columns={columns} rowKey="id" pagination={false} size="middle" />
      </div>
    </div>
  )
}

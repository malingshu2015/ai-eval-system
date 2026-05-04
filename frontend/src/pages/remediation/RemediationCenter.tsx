import { Button, Empty, Space, Table, Tag, Typography } from 'antd'
import { EyeOutlined, PlusOutlined, ToolOutlined } from '@ant-design/icons'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RemediationTask, Severity } from '@/types/domain'
import {
  getRemediationTasks,
  remediationStatusColor,
  remediationStatusLabel,
} from '@/utils/remediationTasks'
import styles from './RemediationCenter.module.css'

const { Title, Text } = Typography

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: '严重',
  high: '高危',
  medium: '中危',
  low: '低危',
  info: '信息',
}

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: '#ff3b5c',
  high: '#ff6b35',
  medium: '#ffa500',
  low: '#22c55e',
  info: '#64748b',
}

export default function RemediationCenter() {
  const navigate = useNavigate()
  const tasks = getRemediationTasks()

  const stats = useMemo(() => ({
    total: tasks.length,
    open: tasks.filter((task) => ['open', 'in_progress'].includes(task.status)).length,
    retest: tasks.filter((task) => task.status === 'pending_retest').length,
    closed: tasks.filter((task) => ['fixed', 'closed'].includes(task.status)).length,
  }), [tasks])

  const columns = [
    {
      title: '整改项',
      dataIndex: 'title',
      render: (value: string, record: RemediationTask) => (
        <Space direction="vertical" size={2}>
          <Text strong>{value}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.sourceReportName || record.sourceTaskId}</Text>
        </Space>
      ),
    },
    {
      title: '等级',
      dataIndex: 'severity',
      render: (value: Severity) => <Tag color={SEVERITY_COLOR[value]}>{SEVERITY_LABEL[value]}</Tag>,
    },
    {
      title: '责任人',
      dataIndex: 'ownerName',
      render: (value: string) => <Text>{value || '未指派'}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (value: RemediationTask['status']) => (
        <Tag color={remediationStatusColor(value)}>{remediationStatusLabel(value)}</Tag>
      ),
    },
    {
      title: '截止时间',
      dataIndex: 'dueDate',
      render: (value?: string) => <Text type="secondary">{value || '未设置'}</Text>,
    },
    {
      title: '最近更新',
      dataIndex: 'updatedAt',
      render: (value: string) => <Text type="secondary">{value}</Text>,
    },
    {
      title: '操作',
      render: (_: unknown, record: RemediationTask) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/remediations/${record.id}`)}
        >
          查看
        </Button>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <Title level={4} style={{ margin: 0 }}>整改中心</Title>
          <Text type="secondary">承接报告中的风险发现，跟踪责任人、截止时间、复测和关闭结论。</Text>
        </div>
        <Button icon={<PlusOutlined />} disabled>
          手动新增
        </Button>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}><span>整改总数</span><strong>{stats.total}</strong></div>
        <div className={styles.statCard}><span>处理中</span><strong>{stats.open}</strong></div>
        <div className={styles.statCard}><span>待复测</span><strong>{stats.retest}</strong></div>
        <div className={styles.statCard}><span>已修复/关闭</span><strong>{stats.closed}</strong></div>
      </div>

      <div className={styles.panel}>
        {tasks.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无整改项。请从报告详情页的核心发现中转入整改。"
          >
            <Button type="primary" icon={<ToolOutlined />} onClick={() => navigate('/reports')}>
              前往报告中心
            </Button>
          </Empty>
        ) : (
          <Table rowKey="id" dataSource={tasks} columns={columns} pagination={false} />
        )}
      </div>
    </div>
  )
}

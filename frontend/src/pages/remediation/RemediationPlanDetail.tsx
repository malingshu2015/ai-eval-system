import { 
  Button, 
  Card, 
  Col, 
  Descriptions, 
  Empty, 
  Progress, 
  Row, 
  Space, 
  Table, 
  Tag, 
  Typography,
  Breadcrumb,
  Divider,
} from 'antd'
import { 
  ArrowLeftOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  UserOutlined,
  ExportOutlined
} from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import type { RemediationPlan, RemediationTask, Severity } from '@/types/domain'
import { 
  fetchRemediationPlan, 
  fetchRemediationTasks, 
  planStatusColor, 
  planStatusLabel,
  remediationStatusColor,
  remediationStatusLabel
} from '@/utils/remediationTasks'
import styles from './RemediationCenter.module.css' // 复用基础样式

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

export default function RemediationPlanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<RemediationPlan | null>(null)
  const [tasks, setTasks] = useState<RemediationTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    let mounted = true
    const loadData = async () => {
      const planData = await fetchRemediationPlan(id)
      const tasksData = await fetchRemediationTasks(id)
      
      if (mounted) {
        setPlan(planData || null)
        setTasks(tasksData)
        setLoading(false)
      }
    }

    loadData()
    return () => { mounted = false }
  }, [id])

  if (loading) return null

  if (!plan) {
    return (
      <Empty description="整改计划不存在">
        <Button type="primary" onClick={() => navigate('/remediations')}>返回整改中心</Button>
      </Empty>
    )
  }

  const columns = [
    {
      title: '漏洞发现',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: RemediationTask) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>#{record.id.slice(-6).toUpperCase()}</Text>
        </Space>
      )
    },
    {
      title: '等级',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (v: Severity) => <Tag color={SEVERITY_COLOR[v]}>{SEVERITY_LABEL[v]}</Tag>
    },
    {
      title: '指派给',
      dataIndex: 'assigneeName',
      key: 'assignee',
      render: (v: string) => <Space size={4}><UserOutlined style={{ color: '#94a3b8' }} />{v || '未指派'}</Space>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: RemediationTask['status']) => (
        <Tag color={remediationStatusColor(v)}>{remediationStatusLabel(v)}</Tag>
      )
    },
    {
      title: '截止时间',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (v: string) => v ? <Space size={4}><ClockCircleOutlined style={{ color: '#94a3b8' }} />{v}</Space> : '未设置'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: RemediationTask) => (
        <Button type="link" onClick={() => navigate(`/remediation-task/${record.id}`)}>处理</Button>
      )
    }
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            type="text" 
            onClick={() => navigate('/remediations')} 
          />
          <div>
            <Breadcrumb items={[
              { title: <Link to="/remediations">整改中心</Link> },
              { title: '计划详情' }
            ]} />
            <Title level={4} style={{ margin: '4px 0 0' }}>{plan.reportName}</Title>
          </div>
        </div>
        <Space>
          <Button icon={<ExportOutlined />}>导出报告</Button>
          <Button type="primary" icon={<CheckCircleOutlined />}>完成计划</Button>
        </Space>
      </div>

      <Row gutter={16}>
        <Col span={16}>
          <div className={styles.section} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <Title level={5} style={{ margin: 0 }}>整改进度</Title>
              <Tag color={planStatusColor(plan.status)}>{planStatusLabel(plan.status)}</Tag>
            </div>
            
            <Row gutter={40} align="middle">
              <Col span={8} style={{ textAlign: 'center' }}>
                <Progress 
                  type="circle" 
                  percent={plan.progressPercent} 
                  strokeColor="var(--color-primary)"
                  size={120}
                />
              </Col>
              <Col span={16}>
                <div className={styles.cardStats} style={{ background: 'transparent', padding: 0 }}>
                  <div>
                    <span>总漏洞数</span>
                    <strong style={{ fontSize: 24 }}>{plan.totalTasks}</strong>
                  </div>
                  <div>
                    <span>已修复</span>
                    <strong style={{ fontSize: 24, color: '#22c55e' }}>{plan.completedTasks}</strong>
                  </div>
                  <div>
                    <span>待处理</span>
                    <strong style={{ fontSize: 24, color: '#ef4444' }}>{plan.totalTasks - plan.completedTasks}</strong>
                  </div>
                </div>
                <Divider style={{ margin: '16px 0' }} />
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="扫描目标">{plan.target}</Descriptions.Item>
                  <Descriptions.Item label="负责人">{plan.ownerName || '未指派'}</Descriptions.Item>
                  <Descriptions.Item label="截止时间">{plan.dueDate || '未设置'}</Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>
          </div>

          <div className={styles.panel}>
            <div style={{ padding: '0 0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={5} style={{ margin: 0 }}>漏洞任务清单</Title>
              <Space>
                <Button size="small">指派责任人</Button>
                <Button size="small">批量关闭</Button>
              </Space>
            </div>
            <Table 
              dataSource={tasks} 
              columns={columns} 
              rowKey="id" 
              pagination={false}
              className={styles.taskTable}
            />
          </div>
        </Col>

        <Col span={8}>
          <Card title="项目信息" size="small" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="关联报告"><Link to={`/reports/${plan.reportId}`}>{plan.reportName}</Link></Descriptions.Item>
              <Descriptions.Item label="创建人">{plan.createdByName}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{plan.createdAt}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{plan.updatedAt}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="整改概要" size="small">
            <Text type="secondary">
              {plan.summary || '暂无详细整改说明。系统建议：优先修复严重和高危漏洞，针对 Web 注入类漏洞需补充参数校验和 WAF 规则。'}
            </Text>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

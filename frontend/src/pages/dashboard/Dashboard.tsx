/**
 * 仪表盘页面
 * 展示评估任务统计、最新发现和风险趋势
 */
import { Row, Col, Progress, Table, Tag, Typography, Button, Space } from 'antd'
import {
  SafetyCertificateOutlined,
  BugOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  ArrowRightOutlined,
  FireOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import styles from './Dashboard.module.css'
import type { RiskLevel } from '@/types'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'
import { Spin, Empty } from 'antd'

const { Title, Text } = Typography

const SEVERITY_COLOR: Record<RiskLevel, string> = {
  critical: '#ff3b5c',
  high: '#ff6b35',
  medium: '#ffa500',
  low: '#22c55e',
  info: '#64748b',
}

const SEVERITY_LABEL: Record<RiskLevel, string> = {
  critical: '严重',
  high: '高危',
  medium: '中危',
  low: '低危',
  info: '信息',
}

const ICON_MAP: Record<string, any> = {
  '总评估任务': <SafetyCertificateOutlined />,
  '发现的问题': <BugOutlined />,
  '通过项': <CheckCircleOutlined />,
  '进行中': <CloseCircleOutlined />,
}

const columns = [
  {
    title: '编号',
    dataIndex: 'code',
    width: 80,
    render: (v: string) => <Text code style={{ color: 'var(--text-secondary)' }}>{v}</Text>,
  },
  {
    title: '检查项',
    dataIndex: 'name',
    render: (v: string) => <Text style={{ color: 'var(--text-primary)' }}>{v}</Text>,
  },
  {
    title: '评估对象',
    dataIndex: 'target',
    render: (v: string) => <Text style={{ color: 'var(--text-secondary)' }}>{v}</Text>,
  },
  {
    title: '严重度',
    dataIndex: 'severity',
    width: 90,
    render: (v: RiskLevel) => (
      <Tag color={SEVERITY_COLOR[v]} style={{ borderRadius: 100, fontSize: 12 }}>
        {SEVERITY_LABEL[v]}
      </Tag>
    ),
  },
  {
    title: '结果',
    dataIndex: 'status',
    width: 80,
    render: (v: string) =>
      v === 'pass' ? (
        <Tag color="success">通过</Tag>
      ) : (
        <Tag color="error">失败</Tag>
      ),
  },
  { title: '日期', dataIndex: 'date', width: 110 },
]

export default function Dashboard() {
  const navigate = useNavigate()

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
  })

  if (isLoading) return <div style={{ padding: 100, textAlign: 'center' }}><Spin size="large" /></div>
  if (error || !stats) return <div style={{ padding: 100 }}><Empty description="无法加载仪表盘统计数据" /></div>

  const { summary, risk_distribution, recent_findings, pass_rate, pass_count, fail_count } = stats

  return (
    <div className={styles.container}>
      {/* 页头 */}
      <div className={styles.pageHeader}>
        <div>
          <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>
            概览仪表盘
          </Title>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            实时掌握所有评估任务的安全状态
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => navigate('/evaluations')}
          style={{ background: 'var(--color-primary)' }}
        >
          新建评估
        </Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {summary.map((stat, i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: `${stat.color}18`, color: stat.color }}>
                {ICON_MAP[stat.title] || <SafetyCertificateOutlined />}
              </div>
              <div className={styles.statBody}>
                <div className={styles.statValue}>{stat.value}</div>
                <div className={styles.statTitle}>{stat.title}</div>
                <div className={styles.statSub}>{stat.sub}</div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* 风险分布 */}
        <Col xs={24} lg={8}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <FireOutlined style={{ color: '#ff6b35' }} />
              <span>风险等级分布</span>
            </div>
            <div className={styles.riskList}>
              {risk_distribution.map((item) => (
                <div key={item.level} className={styles.riskItem}>
                  <div className={styles.riskLabel}>
                    <span
                      className={`risk-badge ${item.level}`}
                    >
                      {item.label}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{item.count} 项</span>
                  </div>
                  <Progress
                    percent={fail_count > 0 ? Math.round((item.count / fail_count) * 100) : 0}
                    strokeColor={item.color}
                    trailColor="var(--bg-border)"
                    showInfo={false}
                    size="small"
                  />
                </div>
              ))}
            </div>
          </div>
        </Col>

        {/* 评估类型分布 */}
        <Col xs={24} lg={8}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <SafetyCertificateOutlined style={{ color: 'var(--color-primary)' }} />
              <span>评估对象分布</span>
            </div>
            <div className={styles.typeList}>
              {[
                { label: 'AI 大模型', count: 0, color: 'var(--color-primary)', icon: '🤖' },
                { label: 'AI Agent', count: 0, color: '#8b5cf6', icon: '🦾' },
                { label: 'Web 应用', count: 0, color: '#06b6d4', icon: '🌐' },
              ].map((item) => (
                <div key={item.label} className={styles.typeItem}>
                  <span className={styles.typeIcon}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: 'var(--text-primary)', fontSize: 13 }}>{item.label}</Text>
                      <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{item.count} 次</Text>
                    </div>
                    <Progress
                      percent={0}
                      strokeColor={item.color}
                      trailColor="var(--bg-border)"
                      showInfo={false}
                      size="small"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Col>

        {/* 整体通过率 */}
        <Col xs={24} lg={8}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <CheckCircleOutlined style={{ color: '#22c55e' }} />
              <span>整体检查通过率</span>
            </div>
            <div className={styles.passRateContainer}>
              <Progress
                type="circle"
                percent={pass_rate}
                size={140}
                strokeColor={{
                  '0%': 'var(--color-primary)',
                  '100%': '#22c55e',
                }}
                trailColor="var(--bg-border)"
                format={(p) => (
                  <span style={{ color: 'var(--text-primary)', fontSize: 28, fontWeight: 700 }}>
                    {p}%
                  </span>
                )}
              />
              <div className={styles.passRateStats}>
                <Space direction="vertical" size={4}>
                  <Text style={{ color: '#22c55e', fontSize: 13 }}>✓ 通过 {pass_count} 项</Text>
                  <Text style={{ color: '#ef4444', fontSize: 13 }}>✕ 失败 {fail_count} 项</Text>
                  <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>— 待检查</Text>
                </Space>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* 最新发现 */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <BugOutlined style={{ color: '#ff3b5c' }} />
          <span>最新检查发现</span>
          <Button
            type="link"
            size="small"
            icon={<ArrowRightOutlined />}
            style={{ marginLeft: 'auto', color: 'var(--color-primary)' }}
            onClick={() => navigate('/evaluations')}
          >
            查看全部
          </Button>
        </div>
        <Table
          dataSource={recent_findings}
          columns={columns}
          pagination={false}
          size="small"
          style={{ background: 'transparent' }}
        />
      </div>
    </div>
  )
}

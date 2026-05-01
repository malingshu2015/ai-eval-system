/**
 * 仪表盘页面
 * 展示评估任务统计、最新发现和风险趋势
 */
import { Row, Col, Statistic, Progress, Table, Tag, Typography, Button, Space } from 'antd'
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

const { Title, Text } = Typography

// ---- Mock 数据（Phase 1 接入真实 API 后替换）----

const summaryStats = [
  {
    title: '总评估任务',
    value: 24,
    icon: <SafetyCertificateOutlined />,
    color: 'var(--color-primary)',
    sub: '本月新增 6 个',
  },
  {
    title: '发现的问题',
    value: 87,
    icon: <BugOutlined />,
    color: '#ff3b5c',
    sub: '较上月 +12',
  },
  {
    title: '已修复',
    value: 53,
    icon: <CheckCircleOutlined />,
    color: '#22c55e',
    sub: '修复率 60.9%',
  },
  {
    title: '进行中',
    value: 5,
    icon: <CloseCircleOutlined />,
    color: '#ffa500',
    sub: '3 个待审核',
  },
]

const riskDistribution = [
  { level: 'critical' as RiskLevel, label: '严重', count: 8, color: '#ff3b5c' },
  { level: 'high' as RiskLevel, label: '高危', count: 23, color: '#ff6b35' },
  { level: 'medium' as RiskLevel, label: '中危', count: 34, color: '#ffa500' },
  { level: 'low' as RiskLevel, label: '低危', count: 22, color: '#22c55e' },
]

const recentFindings = [
  {
    key: '1',
    code: 'A-01',
    name: '直接越狱指令抵抗测试',
    target: 'GPT-4o 评估',
    severity: 'critical' as RiskLevel,
    status: 'fail',
    date: '2026-04-21',
  },
  {
    key: '2',
    code: 'H-03',
    name: 'SQL 注入测试',
    target: 'AI 管理后台',
    severity: 'high' as RiskLevel,
    status: 'fail',
    date: '2026-04-20',
  },
  {
    key: '3',
    code: 'E-02',
    name: '文件系统越权测试',
    target: 'Code Agent v2',
    severity: 'high' as RiskLevel,
    status: 'fail',
    date: '2026-04-20',
  },
  {
    key: '4',
    code: 'B-02',
    name: '违规信息提供测试',
    target: 'Claude-3.5 评估',
    severity: 'medium' as RiskLevel,
    status: 'pass',
    date: '2026-04-19',
  },
  {
    key: '5',
    code: 'J-01',
    name: 'TLS/SSL 配置检查',
    target: 'AI 平台前端',
    severity: 'medium' as RiskLevel,
    status: 'pass',
    date: '2026-04-19',
  },
]

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
        {summaryStats.map((stat, i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: `${stat.color}18`, color: stat.color }}>
                {stat.icon}
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
              {riskDistribution.map((item) => (
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
                    percent={Math.round((item.count / 87) * 100)}
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
                { label: 'AI 大模型', count: 10, color: 'var(--color-primary)', icon: '🤖' },
                { label: 'AI Agent', count: 8, color: '#8b5cf6', icon: '🦾' },
                { label: 'Web 应用', count: 6, color: '#06b6d4', icon: '🌐' },
              ].map((item) => (
                <div key={item.label} className={styles.typeItem}>
                  <span className={styles.typeIcon}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: 'var(--text-primary)', fontSize: 13 }}>{item.label}</Text>
                      <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{item.count} 次</Text>
                    </div>
                    <Progress
                      percent={Math.round((item.count / 24) * 100)}
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
                percent={61}
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
                  <Text style={{ color: '#22c55e', fontSize: 13 }}>✓ 通过 53 项</Text>
                  <Text style={{ color: '#ef4444', fontSize: 13 }}>✕ 失败 34 项</Text>
                  <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>— 不适用 0 项</Text>
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
          dataSource={recentFindings}
          columns={columns}
          pagination={false}
          size="small"
          style={{ background: 'transparent' }}
        />
      </div>
    </div>
  )
}

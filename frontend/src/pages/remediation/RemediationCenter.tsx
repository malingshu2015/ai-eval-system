import { Button, Empty, Progress, Space, Tag, Typography } from 'antd'
import { EyeOutlined, PlusOutlined, ToolOutlined, ProjectOutlined, UserOutlined } from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RemediationPlan } from '@/types/domain'
import {
  fetchRemediationPlans,
  planStatusColor,
  planStatusLabel,
} from '@/utils/remediationTasks'
import styles from './RemediationCenter.module.css'

const { Title, Text } = Typography

export default function RemediationCenter() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<RemediationPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    fetchRemediationPlans().then((items) => {
      if (mounted) {
        setPlans(items)
        setLoading(false)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  const stats = useMemo(() => ({
    total: plans.length,
    active: plans.filter((p) => p.status === 'active').length,
    completed: plans.filter((p) => p.status === 'completed').length,
    avgProgress: plans.length > 0 
      ? Math.round(plans.reduce((acc, p) => acc + p.progressPercent, 0) / plans.length) 
      : 0
  }), [plans])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <Title level={4} style={{ margin: 0 }}>整改中心</Title>
          <Text type="secondary">承接扫描项目的风险发现，按项目聚合管理整改闭环流程。</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/reports')}>
          新建整改计划
        </Button>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}><span>整改计划总数</span><strong>{stats.total}</strong></div>
        <div className={styles.statCard}><span>进行中</span><strong>{stats.active}</strong></div>
        <div className={styles.statCard}><span>已完成</span><strong>{stats.completed}</strong></div>
        <div className={styles.statCard}><span>平均整改进度</span><strong>{stats.avgProgress}%</strong></div>
      </div>

      <div className={styles.panel}>
        {plans.length === 0 && !loading ? (
          <div className={styles.emptyBox}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无整改计划。请从报告中心选择报告并转入整改。"
            >
              <Button type="primary" icon={<ToolOutlined />} onClick={() => navigate('/reports')}>
                前往报告中心
              </Button>
            </Empty>
          </div>
        ) : (
          <div className={styles.planList}>
            {plans.map((plan) => (
              <div key={plan.id} className={styles.planCard}>
                <div className={styles.cardHeader}>
                  <Space>
                    <ProjectOutlined style={{ color: 'var(--color-primary)' }} />
                    <Text strong>{plan.reportName}</Text>
                  </Space>
                  <Tag color={planStatusColor(plan.status)}>{planStatusLabel(plan.status)}</Tag>
                </div>
                
                <div className={styles.cardContent}>
                  <div className={styles.cardMeta}>
                    <div>
                      <span>扫描目标</span>
                      <strong>{plan.target}</strong>
                    </div>
                    <div>
                      <span>截止日期</span>
                      <strong>{plan.dueDate || '未设置'}</strong>
                    </div>
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>整改进度</Text>
                      <Text strong style={{ fontSize: 12 }}>{plan.progressPercent}%</Text>
                    </div>
                    <Progress 
                      percent={plan.progressPercent} 
                      size="small" 
                      showInfo={false} 
                      strokeColor="var(--color-primary)"
                    />
                  </div>

                  <div className={styles.cardStats}>
                    <div>
                      <span>总任务</span>
                      <strong>{plan.totalTasks}</strong>
                    </div>
                    <div>
                      <span>已完成</span>
                      <strong>{plan.completedTasks}</strong>
                    </div>
                    <div>
                      <span>剩余项</span>
                      <strong>{plan.totalTasks - plan.completedTasks}</strong>
                    </div>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <Space size={12}>
                    <Space size={4}>
                      <UserOutlined style={{ color: '#94a3b8', fontSize: 12 }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>负责人: {plan.ownerName || '未指派'}</Text>
                    </Space>
                  </Space>
                  <Button 
                    type="link" 
                    icon={<EyeOutlined />} 
                    onClick={() => navigate(`/remediations/${plan.id}`)}
                    style={{ padding: 0 }}
                  >
                    查看详情
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

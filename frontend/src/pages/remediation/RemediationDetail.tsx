import { 
  Button, 
  Empty, 
  Form, 
  Input, 
  Row,
  Col,
  Select, 
  Space, 
  Tag, 
  Timeline, 
  Typography, 
  message,
  Divider,
} from 'antd'
import { 
  ArrowLeftOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  UserAddOutlined,
  HistoryOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { RemediationStatus, Severity, RemediationTask } from '@/types/domain'
import {
  fetchRemediationTask,
  remediationStatusColor,
  remediationStatusLabel,
  updateRemediationTask,
} from '@/utils/remediationTasks'
import { useAuthStore } from '@/stores/authStore'
import AssignTaskModal from './AssignTaskModal'
import styles from './RemediationCenter.module.css'

const { Title, Text, Paragraph } = Typography

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: '严重',
  high: '高危',
  medium: '中危',
  low: '低危',
  info: '信息',
}

const STATUS_OPTIONS: Array<{ value: RemediationStatus; label: string }> = [
  { value: 'open', label: '待处理' },
  { value: 'assigned', label: '已指派' },
  { value: 'in_progress', label: '处理中' },
  { value: 'pending_retest', label: '待复测' },
  { value: 'fixed', label: '已修复' },
  { value: 'closed', label: '已关闭' },
  { value: 'overdue', label: '已逾期' },
]

const PRIORITY_LABEL: Record<string, string> = {
  urgent: '紧急',
  high: '高',
  normal: '普通',
  low: '低',
}

export default function RemediationDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [task, setTask] = useState<RemediationTask | null>(null)
  const [assignModalVisible, setAssignModalVisible] = useState(false)
  const [form] = Form.useForm()
  const { user } = useAuthStore()

  useEffect(() => {
    if (!id) return

    let mounted = true
    fetchRemediationTask(id).then((item) => {
      if (!mounted || !item) return
      setTask(item)
      form.setFieldsValue(item)
    })
    return () => {
      mounted = false
    }
  }, [form, id])

  if (!task) {
    return (
      <Empty description="整改项不存在或已被删除">
        <Button onClick={() => navigate('/remediations')}>返回整改中心</Button>
      </Empty>
    )
  }

  const canEdit = user?.role === 'super_admin' || user?.role === 'eval_engineer' || task?.assigneeId === user?.id
  const canAssign = user?.role === 'super_admin' || user?.role === 'eval_engineer'

  const handleSave = async () => {
    if (!task) return
    const values = form.getFieldsValue()
    const nextTask = await updateRemediationTask(task.id, values)
    if (nextTask) {
      setTask(nextTask)
      message.success('整改状态已更新')
    }
  }

  return (
    <div className={styles.page} data-testid="remediation-detail">
      <div className={styles.header}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate(task.planId ? `/remediations/${task.planId}` : '/remediations')} />
          <div>
            <Title level={4} style={{ margin: 0 }}>{task.title}</Title>
            <Text type="secondary">漏洞 ID: {task.findingId.slice(0, 8)} | 来源: {task.sourceReportName}</Text>
          </div>
        </Space>
        <Space>
          <Tag color={remediationStatusColor(task.status)}>{remediationStatusLabel(task.status)}</Tag>
          <Tag color={task.severity === 'high' || task.severity === 'critical' ? 'red' : 'orange'}>
            {SEVERITY_LABEL[task.severity]}
          </Tag>
          {task.priority !== 'normal' && (
            <Tag color={task.priority === 'urgent' ? 'magenta' : 'purple'}>
              优先级: {PRIORITY_LABEL[task.priority] || task.priority}
            </Tag>
          )}
        </Space>
      </div>

      <div className={styles.detailGrid}>
        <div className={styles.section}>
          <Title level={4}>风险说明</Title>
          <Paragraph>{task.description || '暂无风险说明'}</Paragraph>

          <Title level={4}>修复建议</Title>
          <Paragraph>{task.actionPlan}</Paragraph>

          <Title level={5}><HistoryOutlined /> 处理流转记录</Title>
          <Timeline
            style={{ marginTop: 20 }}
            items={[
              {
                dot: <ClockCircleOutlined />,
                children: <span className={styles.timelineItem}>{task.createdAt} 系统创建整改项</span>,
              },
              ...(task.assignedAt ? [{
                dot: <UserAddOutlined style={{ color: '#2563eb' }} />,
                children: (
                  <span className={styles.timelineItem}>
                    {task.assignedAt} <b>{task.assignedByName}</b> 指派给 <b>{task.assigneeName}</b>
                  </span>
                ),
              }] : []),
              {
                dot: <CheckCircleOutlined style={{ color: task.status === 'fixed' ? '#22c55e' : '#94a3b8' }} />,
                children: <span className={styles.timelineItem}>{task.updatedAt} 当前状态：<b>{remediationStatusLabel(task.status)}</b></span>,
              },
            ]}
          />
        </div>

        <div className={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>整改操作</Title>
            {canAssign && (
              <Button 
                size="small" 
                icon={<UserAddOutlined />} 
                onClick={() => setAssignModalVisible(true)}
              >
                任务指派
              </Button>
            )}
          </div>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              status: task.status,
              ownerName: task.ownerName,
              dueDate: task.dueDate,
              actionPlan: task.actionPlan,
              retestResult: task.retestResult,
              retestEvidence: task.retestEvidence,
            }}
            disabled={!canEdit}
          >
            <Form.Item label="当前状态" name="status">
              <Select options={STATUS_OPTIONS} />
            </Form.Item>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="责任人 (只读)" name="assigneeName">
                  <Input disabled prefix={<UserOutlined />} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="截止时间" name="dueDate">
                  <Input placeholder="YYYY-MM-DD" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="整改方案" name="actionPlan">
              <Input.TextArea rows={4} />
            </Form.Item>

            <Divider orientation="left" plain style={{ fontSize: 13 }}>复测与关闭</Divider>

            <Form.Item label="复测结论" name="retestResult">
              <Input.TextArea rows={3} placeholder="记录复测发现的详细结论..." />
            </Form.Item>
            
            <Form.Item label="复测证据 (PoC/截图链接)" name="retestEvidence">
              <Input placeholder="输入复测证据链接或 PoC 命令输出" />
            </Form.Item>

            {canEdit && (
              <Button type="primary" block size="large" onClick={handleSave} style={{ marginTop: 8 }}>
                保存更新
              </Button>
            )}
          </Form>

          <div className={styles.metaList} style={{ marginTop: 24 }}>
            <div><span>所属计划</span><strong>{task.sourceReportName || '独立任务'}</strong></div>
            <div><span>关联发现</span><strong>{task.findingId}</strong></div>
            <div><span>创建时间</span><strong>{task.createdAt}</strong></div>
          </div>
        </div>
      </div>

      <AssignTaskModal
        visible={assignModalVisible}
        taskId={task.id}
        taskTitle={task.title}
        onCancel={() => setAssignModalVisible(false)}
        onSuccess={(updated) => {
          setTask(updated)
          setAssignModalVisible(false)
          form.setFieldsValue(updated)
        }}
      />
    </div>
  )
}

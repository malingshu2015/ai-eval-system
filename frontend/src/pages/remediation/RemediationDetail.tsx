import { Button, Empty, Form, Input, Select, Space, Tag, Timeline, Typography, message } from 'antd'
import { ArrowLeftOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import type { RemediationStatus, Severity } from '@/types/domain'
import {
  getRemediationTask,
  remediationStatusColor,
  remediationStatusLabel,
  updateRemediationTask,
} from '@/utils/remediationTasks'
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
  { value: 'in_progress', label: '处理中' },
  { value: 'pending_retest', label: '待复测' },
  { value: 'fixed', label: '已修复' },
  { value: 'closed', label: '已关闭' },
  { value: 'overdue', label: '已逾期' },
]

export default function RemediationDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const task = id ? getRemediationTask(id) : undefined
  const [form] = Form.useForm()

  if (!task) {
    return (
      <Empty description="整改项不存在或已被删除">
        <Button onClick={() => navigate('/remediations')}>返回整改中心</Button>
      </Empty>
    )
  }

  const handleSave = () => {
    const values = form.getFieldsValue()
    updateRemediationTask(task.id, values)
    message.success('整改项已更新')
    navigate('/remediations')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/remediations')} />
          <div>
            <Title level={4} style={{ margin: 0 }}>{task.title}</Title>
            <Text type="secondary">整改详情 · {task.sourceReportName || task.sourceTaskId}</Text>
          </div>
        </Space>
        <Space>
          <Tag color={remediationStatusColor(task.status)}>{remediationStatusLabel(task.status)}</Tag>
          <Tag color={task.severity === 'high' || task.severity === 'critical' ? 'red' : 'orange'}>
            {SEVERITY_LABEL[task.severity]}
          </Tag>
        </Space>
      </div>

      <div className={styles.detailGrid}>
        <div className={styles.section}>
          <Title level={4}>风险说明</Title>
          <Paragraph>{task.description || '暂无风险说明'}</Paragraph>

          <Title level={4}>修复建议</Title>
          <Paragraph>{task.actionPlan}</Paragraph>

          <Title level={4}>处理记录</Title>
          <Timeline
            items={[
              {
                dot: <ClockCircleOutlined />,
                children: <span className={styles.timelineItem}>{task.createdAt} 创建整改项</span>,
              },
              {
                dot: <CheckCircleOutlined />,
                children: <span className={styles.timelineItem}>{task.updatedAt} 最近更新状态：{remediationStatusLabel(task.status)}</span>,
              },
            ]}
          />
        </div>

        <div className={styles.section}>
          <Title level={4}>整改操作</Title>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              status: task.status,
              ownerName: task.ownerName,
              dueDate: task.dueDate,
              actionPlan: task.actionPlan,
              retestResult: task.retestResult,
            }}
          >
            <Form.Item label="状态" name="status">
              <Select options={STATUS_OPTIONS} />
            </Form.Item>
            <Form.Item label="责任人" name="ownerName">
              <Input placeholder="例如：安全管理员" />
            </Form.Item>
            <Form.Item label="截止时间" name="dueDate">
              <Input placeholder="例如：2026-05-15" />
            </Form.Item>
            <Form.Item label="整改方案" name="actionPlan">
              <Input.TextArea rows={4} />
            </Form.Item>
            <Form.Item label="复测结果" name="retestResult">
              <Input.TextArea rows={3} placeholder="记录复测结论、证据或关闭说明" />
            </Form.Item>
            <Button type="primary" block onClick={handleSave}>保存整改进度</Button>
          </Form>

          <div className={styles.metaList} style={{ marginTop: 18 }}>
            <div><span>来源风险</span><strong>{task.findingId}</strong></div>
            <div><span>来源报告</span><strong>{task.sourceReportName || '未关联报告名称'}</strong></div>
            <div><span>创建时间</span><strong>{task.createdAt}</strong></div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { Modal, Form, Select, DatePicker, Input, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { governanceApi } from '@/api/governance'
import { useAuthStore } from '@/stores/authStore'
import dayjs from 'dayjs'

const { Text } = Typography

interface AssignTaskModalProps {
  visible: boolean
  taskId: string
  taskTitle: string
  onCancel: () => void
  onSuccess: (updatedTask: any) => void
}

export default function AssignTaskModal({ visible, taskId, taskTitle, onCancel, onSuccess }: AssignTaskModalProps) {
  const [form] = Form.useForm()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const currentUser = useAuthStore(s => s.user)

  useEffect(() => {
    if (visible) {
      governanceApi.getAssignableUsers().then(setUsers).catch(() => {
        message.error('无法获取可指派用户列表')
      })
    }
  }, [visible])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      
      const selectedUser = users.find(u => u.id === values.assigneeId)
      
      const updates = {
        assigneeId: values.assigneeId,
        assigneeName: selectedUser?.fullName || selectedUser?.username,
        assignedById: currentUser?.id,
        assignedByName: currentUser?.username,
        assignedAt: dayjs().toISOString(),
        dueDate: values.dueDate?.format('YYYY-MM-DD'),
        priority: values.priority,
        status: 'assigned'
      }

      const updated = await governanceApi.updateRemediationTask(taskId, updates as any)
      message.success(`任务已指派给 ${updates.assigneeName}`)
      onSuccess(updated)
    } catch (error) {
      console.error('Assign failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="指派整改任务"
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">正在指派任务: </Text>
        <Text strong>{taskTitle}</Text>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item 
          label="责任人" 
          name="assigneeId" 
          rules={[{ required: true, message: '请选择责任人' }]}
        >
          <Select placeholder="搜索系统用户...">
            {users.map(u => (
              <Select.Option key={u.id} value={u.id}>
                {u.fullName || u.username} ({u.role})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="截止日期" name="dueDate">
          <DatePicker style={{ width: '100%' }} disabledDate={d => d && d < dayjs().endOf('day')} />
        </Form.Item>

        <Form.Item label="优先级" name="priority" initialValue="normal">
          <Select options={[
            { label: '紧急', value: 'urgent' },
            { label: '高', value: 'high' },
            { label: '普通', value: 'normal' },
            { label: '低', value: 'low' },
          ]} />
        </Form.Item>

        <Form.Item label="指派备注" name="notes">
          <Input.TextArea placeholder="可选，输入指派说明..." />
        </Form.Item>
      </Form>
    </Modal>
  )
}

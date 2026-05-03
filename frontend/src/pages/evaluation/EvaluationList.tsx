import { useState } from 'react'
import { Button, Table, Tag, Typography, Space, Input, message, Spin, Popconfirm, Modal, Form, Row, Col, Alert, Select } from 'antd'
import { PlusOutlined, SearchOutlined, PlayCircleOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import dayjs from 'dayjs'
import NewEvaluationModal from './NewEvaluationModal'
import { evaluationApi, type EvaluationSession } from '@/api/evaluation'

const { Title, Text } = Typography

const TARGET_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  llm: { label: 'AI 大模型', color: '#2563eb', icon: '🤖' },
  agent: { label: 'AI Agent', color: '#8b5cf6', icon: '🦾' },
  webapp: { label: 'Web 应用', color: '#06b6d4', icon: '🌐' },
  iot: { label: 'IoT 设备', color: '#f59e0b', icon: '🔌' },
  host: { label: '主机/服务器', color: '#64748b', icon: '🖥️' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  in_progress: { label: '进行中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  archived: { label: '已归档', color: 'default' },
}

export default function EvaluationList() {
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<EvaluationSession | null>(null)
  const [searchText, setSearchText] = useState('')
  const [form] = Form.useForm()

  const { data: sessions, isLoading, refetch } = useQuery({
    queryKey: ['evaluations'],
    queryFn: evaluationApi.getSessions,
  })

  // 删除任务
  const deleteMutation = useMutation({
    mutationFn: evaluationApi.deleteSession,
    onSuccess: () => {
      message.success('任务已成功删除')
      refetch()
    },
    onError: () => message.error('删除失败，请稍后重试')
  })

  // 更新任务
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<EvaluationSession> }) => 
      evaluationApi.updateSession(id, data),
    onSuccess: () => {
      message.success('任务已更新')
      setEditModalOpen(false)
      refetch()
    },
    onError: () => message.error('更新失败')
  })

  const filtered = (sessions || []).filter((s) =>
    (s.name || '').toLowerCase().includes(searchText.toLowerCase())
  )

  const columns = [
    {
      title: '评估名称',
      dataIndex: 'name',
      render: (v: string) => <Text style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v || '未命名任务'}</Text>,
    },
    {
      title: '对象类型',
      dataIndex: 'target_type',
      render: (v: string) => (
        <Space>
          <span>{TARGET_TYPE_CONFIG[v]?.icon || '❓'}</span>
          <Tag color={TARGET_TYPE_CONFIG[v]?.color || 'default'} style={{ borderRadius: 100 }}>
            {TARGET_TYPE_CONFIG[v]?.label || v}
          </Tag>
        </Space>
      ),
    },
    {
      title: '评估得分',
      dataIndex: 'score',
      render: (v: number | null) => {
        if (v === null || v === undefined) return <Text style={{ color: 'var(--text-muted)' }}>-</Text>
        const color = v >= 85 ? '#22c55e' : (v >= 60 ? '#f59e0b' : '#ef4444')
        return <Text style={{ color, fontWeight: 'bold' }}>{v} 分</Text>
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: string) => <Tag color={STATUS_CONFIG[v]?.color || 'blue'}>{STATUS_CONFIG[v]?.label || v}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      render: (v: string) => <Text style={{ color: 'var(--text-muted)' }}>{dayjs(v).format('YYYY-MM-DD HH:mm')}</Text>,
    },
    {
      title: '操作',
      width: 220,
      render: (_: unknown, record: EvaluationSession) => (
        <Space size="middle">
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
            style={{ color: 'var(--color-primary)', padding: 0 }}
            onClick={() => navigate(`/evaluations/${record.id}`)}
          >
            工作台
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            style={{ color: '#faad14', padding: 0 }}
            onClick={() => {
              setEditingSession(record)
              // 完整回填所有字段，确保编辑时数据不丢失
              form.setFieldsValue({ 
                name: record.name,
                target_type: record.target_type,
                target_url: record.target_url,
                target_description: record.target_description
              })
              setEditModalOpen(true)
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此任务吗？"
            description="删除后，相关的评估结果和记录将无法恢复。"
            onConfirm={() => {
              console.log('确认删除任务:', record.id);
              deleteMutation.mutate(record.id);
            }}
            okText="确定删除"
            cancelText="取消"
            okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              style={{ padding: 0 }}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* 页头 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>评估任务</Title>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>管理所有检查评估会话，点击「新建评估」开始</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          style={{ background: 'var(--color-primary)', border: 'none' }}
          onClick={() => setModalOpen(true)}
        >
          新建评估
        </Button>
      </div>

      {/* 列表 */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 20 }}>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
          placeholder="搜索评估任务..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ background: 'var(--bg-hover)', borderColor: 'var(--bg-border)', color: 'var(--text-primary)', marginBottom: 16, width: 280 }}
        />
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin />
          </div>
        ) : (
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="middle"
          />
        )}
      </div>

      {/* 新建评估向导 */}
      <NewEvaluationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(id) => {
          message.success('评估会话已创建，正在进入工作台...')
          refetch()
          navigate(`/evaluations/${id}`)
        }}
      />

      {/* 编辑 Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: 'var(--color-primary)' }} />
            <span>修改评估任务配置</span>
          </Space>
        }
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => {
          form.validateFields().then(values => {
            if (editingSession) {
              updateMutation.mutate({ id: editingSession.id, data: values })
            }
          })
        }}
        confirmLoading={updateMutation.isPending}
        width={560}
        okText="保存修改"
        cancelText="取消"
      >
        <div style={{ marginBottom: 20 }}>
          <Alert 
            message="提示" 
            description="修改任务基本信息不会影响已经生成的检查项。如果需要更换检查模板，请创建新的评估任务。" 
            type="info" 
            showIcon 
          />
        </div>
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={<Text strong>评估任务名称</Text>}
            rules={[{ required: true, message: '请输入评估名称' }]}
          >
            <Input placeholder="例如：某系统 Q3 安全合规评估" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="target_type"
                label={<Text strong>评估对象类型</Text>}
                rules={[{ required: true }]}
              >
                <Select>
                  {Object.entries(TARGET_TYPE_CONFIG).map(([key, cfg]) => (
                    <Select.Option key={key} value={key}>
                      <Space>
                        <span>{cfg.icon}</span>
                        {cfg.label}
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="target_url"
                label={<Text strong>目标 URL / Endpoint</Text>}
              >
                <Input placeholder="https://api.example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="target_description"
            label={<Text strong>目标详细描述</Text>}
          >
            <Input.TextArea 
              rows={4} 
              placeholder="请描述该评估目标的业务背景、核心功能以及需要重点关注的安全合规点..." 
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

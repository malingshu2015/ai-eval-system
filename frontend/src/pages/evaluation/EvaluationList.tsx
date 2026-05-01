/**
 * 评估任务列表页（接入新建评估向导）
 */
import { useState } from 'react'
import { Button, Table, Tag, Typography, Space, Input, message, Spin } from 'antd'
import { PlusOutlined, SearchOutlined, PlayCircleOutlined, FileTextOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import NewEvaluationModal from './NewEvaluationModal'
import { evaluationApi, type EvaluationSession } from '@/api/evaluation'
import type { TargetType, SessionStatus } from '@/types'

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
  const [searchText, setSearchText] = useState('')

  const { data: sessions, isLoading, refetch } = useQuery({
    queryKey: ['evaluations'],
    queryFn: evaluationApi.getSessions,
  })

  const filtered = (sessions || []).filter((s) =>
    s.name.toLowerCase().includes(searchText.toLowerCase())
  )

  const columns = [
    {
      title: '评估名称',
      dataIndex: 'name',
      render: (v: string) => <Text style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v}</Text>,
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
      render: (_: unknown, record: EvaluationSession) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
            style={{ color: 'var(--color-primary)', padding: 0 }}
            onClick={() => navigate(`/evaluations/${record.id}`)}
          >
            工作台
          </Button>
          {record.status === 'completed' && (
            <Button
              type="link"
              size="small"
              icon={<FileTextOutlined />}
              style={{ color: '#22c55e', padding: 0 }}
              onClick={() => navigate(`/reports/${record.id}`)}
            >
              报告
            </Button>
          )}
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
    </div>
  )
}

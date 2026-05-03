/**
 * 新建评估向导 Modal
 * 三步流程：选择对象类型 → 填写目标信息 → 选择检查模板
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Modal, Steps, Button, Form, Input, Select, Radio,
  Typography, Space, Tag, Alert, Spin, message,
} from 'antd'
import {
  RobotOutlined, ThunderboltOutlined, GlobalOutlined,
  ArrowRightOutlined, CheckCircleOutlined, HddOutlined,
  LoadingOutlined, ApiOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation } from '@tanstack/react-query'
import type { TargetType } from '@/types'
import { checklistApi } from '@/api/checklist'
import { evaluationApi } from '@/api/evaluation'
import styles from './NewEvaluationModal.module.css'

const { Title, Text } = Typography

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (sessionId: string) => void
}

/** Ollama 模型信息 */
interface OllamaModel {
  name: string
  size: number
  details: {
    family: string
    parameter_size: string
    quantization_level: string
  }
}

const TARGET_TYPES_CONFIG: Record<string, { icon: React.ReactNode; label: string; desc: string; color: string }> = {
  llm: {
    icon: <RobotOutlined style={{ fontSize: 28 }} />,
    label: 'AI 大模型',
    desc: '评估 LLM 的安全边界、越狱防护、有害内容过滤、偏见公平性等',
    color: 'var(--color-primary)',
  },
  agent: {
    icon: <ThunderboltOutlined style={{ fontSize: 28 }} />,
    label: 'AI Agent',
    desc: '评估 Agent 的工具调用安全性、行为可控性、权限边界、提示注入防御',
    color: '#8b5cf6',
  },
  webapp: {
    icon: <GlobalOutlined style={{ fontSize: 28 }} />,
    label: 'Web 应用',
    desc: '覆盖 OWASP Top 10、API 安全、TLS 配置、基础设施加固等',
    color: '#06b6d4',
  },
  iot: {
    icon: <HddOutlined style={{ fontSize: 28 }} />,
    label: 'IoT 设备',
    desc: '针对摄像头、智能硬件、嵌入式系统的固件分析与通信协议安全评估',
    color: '#10b981',
  },
}

const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI (GPT-4o / GPT-4)' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'google', label: 'Google (Gemini)' },
  { value: 'ollama', label: 'Ollama（本地开源模型）' },
  { value: 'custom', label: '自定义 API Endpoint' },
]

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024)
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`
}

export default function NewEvaluationModal({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState(0)
  const [selectedType, setSelectedType] = useState<TargetType | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [form] = Form.useForm()

  // Ollama 本地模型发现
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([])
  const [ollamaLoading, setOllamaLoading] = useState(false)
  const [ollamaError, setOllamaError] = useState<string | null>(null)

  // 监听 provider 字段变化，当选择 Ollama 时自动拉取本地模型
  const currentProvider = Form.useWatch('provider', form)

  const fetchOllamaModels = useCallback(async () => {
    setOllamaLoading(true)
    setOllamaError(null)
    try {
      const res = await fetch('http://localhost:11434/api/tags')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setOllamaModels(data.models || [])
    } catch {
      setOllamaError('无法连接本地 Ollama 服务，请确认 Ollama 已启动（默认端口 11434）')
      setOllamaModels([])
    } finally {
      setOllamaLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentProvider === 'ollama') {
      // 自动填充 Ollama 默认 API Endpoint
      form.setFieldsValue({ endpoint: 'http://localhost:11434' })
      fetchOllamaModels()
    } else if (currentProvider === 'openai') {
      form.setFieldsValue({ endpoint: 'https://api.openai.com/v1/chat/completions' })
    }
  }, [currentProvider, form, fetchOllamaModels])

  // 1. 获取所有模板
  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['checklists'],
    queryFn: checklistApi.getTemplates,
    enabled: open,
  })

  // 2. 提交会话创建
  const createMutation = useMutation({
    mutationFn: evaluationApi.createSession,
    onSuccess: (data) => {
      onCreated(data.id)
      handleClose()
    },
    onError: (err: any) => {
      let errMsg = '创建会话失败'
      if (Array.isArray(err.detail)) {
        errMsg = err.detail.map((e: any) => e.msg).join(', ')
      } else if (err.detail) {
        errMsg = err.detail
      }
      message.error(errMsg)
    }
  })

  const typeConfig = selectedType ? TARGET_TYPES_CONFIG[selectedType] : null

  // 过滤出当前选择类型的模板
  const availableTemplates = useMemo(() => {
    if (!templates || !selectedType) return []
    return templates.filter((t) => t.target_type === selectedType)
  }, [templates, selectedType])

  const reset = () => {
    setStep(0)
    setSelectedType(null)
    setSelectedTemplate(null)
    setOllamaModels([])
    setOllamaError(null)
    form.resetFields()
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFinish = async () => {
    if (!selectedType || !selectedTemplate) return
    const values = form.getFieldsValue()
    
    // 根据不同类型提取目标 URL
    let targetUrl = ''
    if (selectedType === 'llm' || selectedType === 'agent') {
      targetUrl = values.endpoint || ''
    } else if (selectedType === 'webapp') {
      targetUrl = values.targetUrl || ''
    } else if (selectedType === 'iot') {
      targetUrl = values.targetIp || ''
    }

    // 构建结构化的目标描述（含模型元信息，供后端 Runner 使用）
    const descParts = []
    if (values.notes) descParts.push(values.notes)
    if (values.provider) descParts.push(`[provider:${values.provider}]`)
    if (values.modelName) descParts.push(`[model:${values.modelName}]`)

    createMutation.mutate({
      name: values.name,
      target_type: selectedType,
      target_url: targetUrl,
      target_description: descParts.join(' ') || 'No description',
      template_id: selectedTemplate,
    })
  }

  const canNext = [
    selectedType !== null,
    true, // Step 1 由表单校验控制
    selectedTemplate !== null,
  ]

  /** 构建 Ollama 下拉选项（含模型参数量、量化等级等丰富信息） */
  const ollamaModelOptions = ollamaModels.map((m) => ({
    value: m.name,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 500 }}>{m.name}</span>
        <span style={{ color: '#9ca3af', fontSize: 12 }}>
          {m.details.parameter_size} · {m.details.quantization_level} · {formatSize(m.size)}
        </span>
      </div>
    ),
  }))

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={720}
      title={null}
      centered
      styles={{ 
        content: { 
          background: '#ffffff', 
          border: '1px solid #e5e7eb', 
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        } 
      }}
    >
      <div className={styles.modalInner}>
        {/* 标题 */}
        <div className={styles.modalHeader}>
          <Title level={4} style={{ margin: 0, color: '#111827' }}>新建评估会话</Title>
          <Text style={{ color: '#6b7280', fontSize: 13 }}>三步完成配置，立即开始安全评估</Text>
        </div>

        {/* 步骤指示 */}
        <div className={styles.stepsWrap}>
          <Steps
            current={step}
            size="small"
            items={[
              { title: '选择对象类型' },
              { title: '填写目标信息' },
              { title: '选择检查模板' },
            ]}
          />
        </div>

        <div className={styles.stepContent}>
          {/* ===== Step 0：选择对象类型 ===== */}
          {step === 0 && (
            <div>
              <Text style={{ color: '#6b7280', fontSize: 13, display: 'block', marginBottom: 16 }}>
                选择你要评估的目标类型，系统将加载对应的检查模板和测试工具
              </Text>
              <div className={styles.typeGrid}>
                {(Object.entries(TARGET_TYPES_CONFIG) as [TargetType, typeof TARGET_TYPES_CONFIG[string]][]).map(([type, t]) => (
                  <div
                    key={type}
                    className={`${styles.typeCard} ${selectedType === type ? styles.typeCardActive : ''}`}
                    onClick={() => setSelectedType(type)}
                  >
                    <div className={styles.typeIcon} style={selectedType === type ? {} : { color: t.color, background: `${t.color}15` }}>
                      {t.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text style={{ color: selectedType === type ? '#1e40af' : '#111827', fontWeight: 600, display: 'block' }}>{t.label}</Text>
                      <Text style={{ color: selectedType === type ? '#60a5fa' : '#6b7280', fontSize: 12 }}>{t.desc}</Text>
                    </div>
                    {selectedType === type && (
                      <CheckCircleOutlined style={{ color: '#3b82f6', fontSize: 20 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== Step 1：填写目标信息 ===== */}
          <div style={{ display: step === 1 ? 'block' : 'none' }}>
            {selectedType && typeConfig && (
              <Form form={form} layout="vertical">
              <Form.Item
                label="评估会话名称"
                name="name"
                rules={[{ required: true, message: '请输入名称' }]}
              >
                <Input
                  placeholder={`例：${typeConfig?.label} 安全评估 #001`}
                  style={{ color: '#111827' }}
                />
              </Form.Item>

              {selectedType === 'llm' && (
                <>
                  <Form.Item
                    label="模型提供商"
                    name="provider"
                    rules={[{ required: true }]}
                  >
                    <Select
                      options={LLM_PROVIDERS}
                      placeholder="选择模型提供商"
                    />
                  </Form.Item>
                  <Form.Item
                    label="API Endpoint"
                    name="endpoint"
                  >
                    <Input
                      placeholder="https://api.openai.com/v1/chat/completions"
                      style={{ color: '#111827' }}
                      disabled={currentProvider === 'ollama'}
                    />
                  </Form.Item>

                  {/* 非 Ollama 时显示 API Key 输入 */}
                  {currentProvider !== 'ollama' && (
                    <Form.Item
                      label="API Key"
                      name="apiKey"
                      extra={<Text style={{ color: '#9ca3af', fontSize: 12 }}>🔒 Key 将使用 AES-256 加密存储，不会明文保存</Text>}
                    >
                      <Input.Password placeholder="sk-..." />
                    </Form.Item>
                  )}

                  {/* 模型名称：Ollama 为下拉选择，其他为手动输入 */}
                  <Form.Item
                    label={
                      <span>
                        模型名称
                        {currentProvider === 'ollama' && (
                          <Tag 
                            color="green" 
                            style={{ marginLeft: 8, fontSize: 11, borderRadius: 100 }}
                            icon={<ApiOutlined />}
                          >
                            自动发现
                          </Tag>
                        )}
                      </span>
                    }
                    name="modelName"
                    rules={currentProvider === 'ollama' ? [{ required: true, message: '请选择本地模型' }] : []}
                  >
                    {currentProvider === 'ollama' ? (
                      <Select
                        placeholder={ollamaLoading ? '正在扫描本地模型...' : '选择已安装的本地模型'}
                        loading={ollamaLoading}
                        options={ollamaModelOptions}
                        notFoundContent={
                          ollamaLoading ? (
                            <div style={{ textAlign: 'center', padding: 12 }}>
                              <LoadingOutlined style={{ marginRight: 8 }} />
                              正在扫描本地 Ollama 模型...
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', padding: 12, color: '#9ca3af' }}>
                              未发现本地模型
                            </div>
                          )
                        }
                        optionLabelProp="value"
                        showSearch
                        filterOption={(input, option) =>
                          (option?.value as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    ) : (
                      <Input
                        placeholder={currentProvider === 'openai' ? 'gpt-4o' : currentProvider === 'anthropic' ? 'claude-sonnet-4-20250514' : '模型名称'}
                        style={{ background: 'var(--bg-hover)', borderColor: 'var(--bg-border)', color: 'var(--text-primary)' }}
                      />
                    )}
                  </Form.Item>

                  {/* Ollama 连接异常提示 */}
                  {currentProvider === 'ollama' && ollamaError && (
                    <Alert
                      message="Ollama 连接失败"
                      description={ollamaError}
                      type="error"
                      showIcon
                      action={
                        <Button size="small" onClick={fetchOllamaModels}>
                          重试
                        </Button>
                      }
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  {/* Ollama 模型发现成功提示 */}
                  {currentProvider === 'ollama' && ollamaModels.length > 0 && !ollamaLoading && (
                    <Alert
                      message={`已发现 ${ollamaModels.length} 个本地模型`}
                      description="Ollama 本地模型无需 API Key，直接选择即可开始安全评估。"
                      type="success"
                      showIcon
                      style={{ marginBottom: 16, background: '#f0fdf4', border: '1px solid #dcfce7' }}
                    />
                  )}
                </>
              )}


              {selectedType === 'agent' && (
                <>
                  <Form.Item
                    label="Agent API Endpoint"
                    name="endpoint"
                    rules={[{ required: true }]}
                  >
                    <Input
                      placeholder="https://your-agent.example.com/api/run"
                      style={{ color: '#111827' }}
                    />
                  </Form.Item>
                  <Form.Item
                    label="Agent 可使用的工具（可多选）"
                    name="agentTools"
                  >
                    <Select
                      mode="multiple"
                      placeholder="选择 Agent 具备的工具能力"
                      options={[
                        { value: 'code_exec', label: '代码执行' },
                        { value: 'file_rw', label: '文件读写' },
                        { value: 'web_search', label: '网络搜索' },
                        { value: 'shell', label: 'Shell 命令' },
                        { value: 'api_call', label: '外部 API 调用' },
                        { value: 'db_access', label: '数据库访问' },
                      ]}
                    />
                  </Form.Item>
                </>
              )}

              {selectedType === 'webapp' && (
                <>
                  <Form.Item
                    label="目标 URL"
                    name="targetUrl"
                    rules={[{ required: true }, { type: 'url', message: '请输入有效 URL' }]}
                  >
                    <Input
                      placeholder="https://your-app.example.com"
                      style={{ color: '#111827' }}
                    />
                  </Form.Item>
                  <Form.Item
                    label="目标主机 IP/域名（用于 Nmap 扫描）"
                    name="targetHost"
                  >
                    <Input
                      placeholder="your-app.example.com 或 192.168.1.100"
                      style={{ color: '#111827' }}
                    />
                  </Form.Item>
                  <Form.Item
                    label="认证方式"
                    name="authType"
                  >
                    <Radio.Group>
                      <Radio value="none">无需认证</Radio>
                      <Radio value="cookie">Cookie</Radio>
                      <Radio value="bearer">Bearer Token</Radio>
                    </Radio.Group>
                  </Form.Item>
                </>
              )}

              {selectedType === 'iot' && (
                <>
                  <Form.Item
                    label="设备 IP 地址 / 网段"
                    name="targetIp"
                    rules={[{ required: true, message: '请输入设备 IP 或网段' }]}
                  >
                    <Input
                      placeholder="例如：192.168.1.100 或 192.168.1.0/24"
                      style={{ color: '#111827' }}
                    />
                  </Form.Item>
                  <Form.Item
                    label="固件版本 / 型号（可选）"
                    name="firmwareVersion"
                  >
                    <Input
                      placeholder="例如：V1.2.3_build2024"
                      style={{ color: '#111827' }}
                    />
                  </Form.Item>
                </>
              )}

              <Form.Item
                label="备注说明（可选）"
                name="notes"
              >
                <Input.TextArea
                  rows={2}
                  placeholder="描述被测系统的背景、本次评估的范围说明..."
                  style={{ color: '#111827' }}
                />
              </Form.Item>

              <Alert
                message="安全提示"
                description="请确保你已获得对目标系统的合法测试授权。未经授权的安全测试可能违反相关法律法规。"
                type="warning"
                showIcon
                style={{ background: '#fffbeb', border: '1px solid #fef3c7' }}
              />
              </Form>
            )}
          </div>

          {/* ===== Step 2：选择检查模板 ===== */}
          {step === 2 && typeConfig && (
            <div>
              <Text style={{ color: '#6b7280', fontSize: 13, display: 'block', marginBottom: 16 }}>
                选择适合本次评估的检查模板，模板决定了具体的检查项和测试范围
              </Text>
              
              {loadingTemplates ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin /></div>
              ) : availableTemplates.length === 0 ? (
                <Alert message="无可用模板" description="该类型下暂无检查模板，请先在模板库中创建。" type="warning" showIcon />
              ) : (
                <div className={styles.templateList}>
                  {availableTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className={`${styles.templateCard} ${selectedTemplate === tpl.id ? styles.templateCardActive : ''}`}
                      onClick={() => setSelectedTemplate(tpl.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <Text style={{ color: selectedTemplate === tpl.id ? '#1e40af' : '#111827', fontWeight: 600 }}>{tpl.name}</Text>
                          <div style={{ marginTop: 4 }}>
                            <Tag style={{ borderRadius: 100, fontSize: 11, background: '#eff6ff', borderColor: '#bfdbfe', color: '#3b82f6' }}>
                              {tpl.standard || '内置标准'}
                            </Tag>
                            <Tag style={{ borderRadius: 100, fontSize: 11, background: '#f3f4f6', borderColor: 'transparent', color: '#6b7280' }}>
                              {tpl.categories?.reduce((acc, cat) => acc + cat.items.length, 0) || 0} 个检查项
                            </Tag>
                          </div>
                        </div>
                        {selectedTemplate === tpl.id && (
                          <CheckCircleOutlined style={{ color: '#3b82f6', fontSize: 20 }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedTemplate && (
                <Alert
                  message="准备就绪"
                  description={`选择模板后点击「开始评估」，系统将创建评估会话并加载所有检查项，你可以立即开始逐项测试。`}
                  type="success"
                  showIcon
                  style={{ marginTop: 16, background: '#f0fdf4', border: '1px solid #dcfce7' }}
                />
              )}
            </div>
          )}
        </div>

        {/* 底部按钮区 */}
        <div className={styles.modalFooter}>
          <Button onClick={handleClose} disabled={createMutation.isPending}>取消</Button>
          <Space>
            {step > 0 && (
              <Button onClick={() => setStep(step - 1)} disabled={createMutation.isPending}>← 上一步</Button>
            )}
            {step < 2 ? (
              <Button
                type="primary"
                disabled={!canNext[step]}
                onClick={async () => {
                  if (step === 1) {
                    try { await form.validateFields() } catch { return }
                  }
                  setStep(step + 1)
                }}
                icon={<ArrowRightOutlined />}
              >
                下一步
              </Button>
            ) : (
              <Button
                type="primary"
                disabled={!selectedTemplate || createMutation.isPending}
                loading={createMutation.isPending}
                onClick={handleFinish}
                icon={<CheckCircleOutlined />}
              >
                开始评估
              </Button>
            )}
          </Space>
        </div>
      </div>
    </Modal>
  )
}

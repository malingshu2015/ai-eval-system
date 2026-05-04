/**
 * 系统设置页面
 * 管理模型供应商、权限、安全策略和审计日志
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AutoComplete,
  Button,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
  Select,
  Slider,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ApiOutlined,
  AuditOutlined,
  CloudServerOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  KeyOutlined,
  LockOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SecurityScanOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons'
import styles from './Settings.module.css'
import {
  ROLE_LABEL,
  ROLE_OPTIONS,
  addLocalAccount,
  getLocalAccounts,
  updateLocalAccount,
  type LocalAccount,
} from '@/utils/localAccounts'
import type { AuditEvent } from '@/types/domain'
import { auditResultColor, auditResultLabel, fetchAuditEvents, getAuditEvents, recordAuditEvent } from '@/utils/auditEvents'

const { Title, Text } = Typography

type SettingsSection = 'models' | 'users' | 'roles' | 'security' | 'audit'

type ModelProvider = {
  id: string
  name: string
  vendor: string
  baseUrl: string
  defaultModel: string
  scenario: string
  status: 'enabled' | 'disabled'
  latency: number
  quota: number
  updatedAt: string
}

type UserAccount = {
  id: string
  username: string
  name: string
  email: string
  role: string
  status: 'active' | 'disabled' | 'locked'
  lastLogin: string
}

type PermissionRole = {
  role: string
  description: string
  model: boolean
  user: boolean
  evaluation: boolean
  report: boolean
  security: boolean
  audit: boolean
}

type LocalModelOption = {
  value: string
  label: string
}

type BaselineCheck = {
  name: string
  status: 'pass' | 'warning' | 'fail'
  description: string
}

const initialProviders: ModelProvider[] = [
  {
    id: 'mp-1',
    name: 'OpenAI 主通道',
    vendor: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4.1',
    scenario: '评估推理 / 报告生成',
    status: 'enabled',
    latency: 684,
    quota: 72,
    updatedAt: '2026-05-02 18:30',
  },
  {
    id: 'mp-2',
    name: 'DeepSeek 备用通道',
    vendor: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    scenario: '批量评分',
    status: 'enabled',
    latency: 412,
    quota: 41,
    updatedAt: '2026-05-01 09:16',
  },
  {
    id: 'mp-3',
    name: '企业私有兼容接口',
    vendor: 'OpenAI-Compatible',
    baseUrl: 'https://llm.internal.example/v1',
    defaultModel: 'internal-eval-32b',
    scenario: '敏感数据评估',
    status: 'disabled',
    latency: 0,
    quota: 0,
    updatedAt: '2026-04-26 14:05',
  },
]

const permissionRoles: PermissionRole[] = [
  { role: '超级管理员', description: '拥有全局配置和高风险操作权限', model: true, user: true, evaluation: true, report: true, security: true, audit: true },
  { role: '管理员', description: '管理用户、评估任务和报告', model: true, user: true, evaluation: true, report: true, security: false, audit: true },
  { role: '评估员', description: '创建、执行并查看授权范围内的评估', model: false, user: false, evaluation: true, report: true, security: false, audit: false },
  { role: '查看者', description: '只读访问报告和评估结果', model: false, user: false, evaluation: false, report: true, security: false, audit: false },
  { role: '审计员', description: '只读查看审计日志和安全事件', model: false, user: false, evaluation: false, report: false, security: false, audit: true },
]

const sectionOptions = [
  { label: '模型供应商', value: 'models', icon: <CloudServerOutlined /> },
  { label: '用户管理', value: 'users', icon: <TeamOutlined /> },
  { label: '角色权限', value: 'roles', icon: <UserSwitchOutlined /> },
  { label: '登录安全', value: 'security', icon: <LockOutlined /> },
  { label: '审计日志', value: 'audit', icon: <AuditOutlined /> },
]

const localModelVendors = ['Ollama', 'Llama.cpp', 'LM Studio', 'LocalAI'] as const

const vendorOptions = [
  { value: 'OpenAI', label: 'OpenAI' },
  { value: 'DeepSeek', label: 'DeepSeek' },
  { value: '通义千问', label: '通义千问' },
  { value: '智谱', label: '智谱' },
  { value: 'Azure OpenAI', label: 'Azure OpenAI' },
  { value: 'OpenAI-Compatible', label: 'OpenAI-Compatible' },
  { value: 'Ollama', label: 'Ollama 本地模型' },
  { value: 'Llama.cpp', label: 'Llama.cpp 本地模型' },
  { value: 'LM Studio', label: 'LM Studio 本地模型' },
  { value: 'LocalAI', label: 'LocalAI 本地模型' },
  { value: 'vLLM', label: 'vLLM 推理服务' },
  { value: 'Text Generation Inference', label: 'TGI 推理服务' },
]

const localVendorHint: Record<string, string> = {
  Ollama: '将自动读取本机 Ollama 已安装模型，不需要填写 URL 和 API Key。',
  'Llama.cpp': '适用于本地 llama.cpp 运行时，可直接选择或手动输入模型名称。',
  'LM Studio': '适用于本地 LM Studio 模型运行时，可直接选择或手动输入模型名称。',
  LocalAI: '适用于本地 LocalAI 模型运行时，可直接选择或手动输入模型名称。',
}

const statusColor = {
  enabled: 'success',
  disabled: 'default',
  active: 'success',
  locked: 'warning',
  success: 'success',
  failed: 'error',
  warning: 'warning',
} as const

const statusText = {
  enabled: '已启用',
  disabled: '已停用',
  active: '正常',
  locked: '锁定',
  success: '成功',
  failed: '失败',
  warning: '需关注',
} as const

function PermissionSwitch({ checked }: { checked: boolean }) {
  return <Switch size="small" checked={checked} disabled />
}

function isLocalVendor(vendor: string) {
  return localModelVendors.includes(vendor as typeof localModelVendors[number])
}

function toUserAccount(account: LocalAccount): UserAccount {
  return {
    id: account.id,
    username: account.username,
    name: account.fullName || account.username,
    email: account.email,
    role: ROLE_LABEL[account.role],
    status: account.status,
    lastLogin: account.lastLogin || '从未登录',
  }
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('models')
  const [providers, setProviders] = useState<ModelProvider[]>(initialProviders)
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => getLocalAccounts().map(toUserAccount))
  const [auditLog, setAuditLog] = useState<AuditEvent[]>(() => getAuditEvents())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [userDrawerOpen, setUserDrawerOpen] = useState(false)
  const [auditDetail, setAuditDetail] = useState<AuditEvent | null>(null)
  const [roleModalUser, setRoleModalUser] = useState<UserAccount | null>(null)
  const [baselineVisible, setBaselineVisible] = useState(false)
  const [localModels, setLocalModels] = useState<LocalModelOption[]>([])
  const [localModelsLoading, setLocalModelsLoading] = useState(false)
  const [form] = Form.useForm()
  const [userForm] = Form.useForm()
  const [roleForm] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()
  const selectedVendor = Form.useWatch('vendor', form) ?? 'OpenAI-Compatible'
  const isLocalModelVendor = isLocalVendor(selectedVendor)

  useEffect(() => {
    let mounted = true
    fetchAuditEvents().then((events) => {
      if (mounted) setAuditLog(events)
    })
    return () => {
      mounted = false
    }
  }, [])

  const enabledProviderCount = providers.filter((item) => item.status === 'enabled').length
  const activeUserCount = userAccounts.filter((item) => item.status === 'active').length
  const latestRiskEvent = auditLog.find((item) => item.result !== 'success')
  const baselineChecks: BaselineCheck[] = [
    {
      name: '模型供应商可用性',
      status: enabledProviderCount > 0 ? 'pass' : 'fail',
      description: enabledProviderCount > 0 ? `当前页面状态中有 ${enabledProviderCount} 个启用供应商。` : '未启用任何模型供应商。',
    },
    {
      name: '角色权限覆盖',
      status: permissionRoles.some((role) => role.audit) && permissionRoles.some((role) => role.security) ? 'pass' : 'warning',
      description: '已配置审计、系统安全、模型管理等基础权限角色。',
    },
    {
      name: '登录安全策略',
      status: 'warning',
      description: '当前为页面内策略配置项，尚未接入后端持久化和真实登录策略校验。',
    },
    {
      name: '审计事件追踪',
      status: latestRiskEvent ? 'warning' : 'pass',
      description: latestRiskEvent ? `存在待关注事件：${latestRiskEvent.action}。` : '未发现待关注审计事件。',
    },
    {
      name: '敏感配置保护',
      status: 'warning',
      description: 'API Key 输入已脱敏展示，但当前页面尚未接入后端加密存储。',
    },
  ]

  const providerColumns: ColumnsType<ModelProvider> = [
    {
      title: '供应商',
      dataIndex: 'name',
      render: (_, record) => (
        <div className={styles.primaryCell}>
          <span className={styles.providerIcon}><ApiOutlined /></span>
          <div>
            <Text strong>{record.name}</Text>
            <Text type="secondary">{record.vendor}</Text>
          </div>
        </div>
      ),
    },
    {
      title: '默认模型',
      dataIndex: 'defaultModel',
      render: (value) => <Text code>{value}</Text>,
    },
    {
      title: '用途',
      dataIndex: 'scenario',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 92,
      render: (value: ModelProvider['status']) => <Tag color={statusColor[value]}>{statusText[value]}</Tag>,
    },
    {
      title: '额度',
      dataIndex: 'quota',
      width: 150,
      render: (value, record) => (
        <div className={styles.quotaCell}>
          <div className={styles.quotaTrack}>
            <span style={{ width: `${value}%` }} />
          </div>
          <Text type="secondary">{record.status === 'enabled' ? `${value}%` : '未启用'}</Text>
        </div>
      ),
    },
    {
      title: '操作',
      width: 220,
      render: (_, record) => (
        <Space size={6}>
          <Button size="small" icon={<ThunderboltOutlined />} onClick={() => testProvider(record)}>
            测试
          </Button>
          <Button size="small" icon={<EditOutlined />}>
            编辑
          </Button>
          <Button size="small" icon={<DeleteOutlined />} danger onClick={() => confirmDisableProvider(record)}>
            停用
          </Button>
        </Space>
      ),
    },
  ]

  const userColumns: ColumnsType<UserAccount> = [
    {
      title: '用户',
      dataIndex: 'name',
      render: (_, record) => (
        <div className={styles.userCell}>
          <span>{record.name.slice(0, 1)}</span>
          <div>
            <Text strong>{record.name}</Text>
            <Text type="secondary">{record.username} · {record.email}</Text>
          </div>
        </div>
      ),
    },
    { title: '角色', dataIndex: 'role', render: (value) => <Tag color="blue">{value}</Tag> },
    {
      title: '状态',
      dataIndex: 'status',
      render: (value: UserAccount['status']) => <Tag color={statusColor[value]}>{statusText[value]}</Tag>,
    },
    { title: '最近登录', dataIndex: 'lastLogin' },
    {
      title: '操作',
      width: 180,
      render: (_, record) => (
        <Space size={6}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openRoleModal(record)}>
            分配角色
          </Button>
          <Button size="small" danger onClick={() => toggleUserStatus(record)}>
            {record.status === 'disabled' ? '启用' : '禁用'}
          </Button>
        </Space>
      ),
    },
  ]

  const roleColumns: ColumnsType<PermissionRole> = [
    {
      title: '角色',
      dataIndex: 'role',
      fixed: 'left',
      width: 180,
      render: (_, record) => (
        <div className={styles.roleCell}>
          <Text strong>{record.role}</Text>
          <Text type="secondary">{record.description}</Text>
        </div>
      ),
    },
    { title: '模型管理', dataIndex: 'model', align: 'center', render: (value) => <PermissionSwitch checked={value} /> },
    { title: '用户管理', dataIndex: 'user', align: 'center', render: (value) => <PermissionSwitch checked={value} /> },
    { title: '评估任务', dataIndex: 'evaluation', align: 'center', render: (value) => <PermissionSwitch checked={value} /> },
    { title: '报告中心', dataIndex: 'report', align: 'center', render: (value) => <PermissionSwitch checked={value} /> },
    { title: '安全策略', dataIndex: 'security', align: 'center', render: (value) => <PermissionSwitch checked={value} /> },
    { title: '审计日志', dataIndex: 'audit', align: 'center', render: (value) => <PermissionSwitch checked={value} /> },
  ]

  const auditColumns: ColumnsType<AuditEvent> = [
    { title: '时间', dataIndex: 'createdAt', width: 180 },
    { title: '操作人', dataIndex: 'actorName', width: 130, render: (value?: string) => value || '未知用户' },
    { title: '操作类型', dataIndex: 'action', width: 140 },
    { title: '对象', dataIndex: 'targetName', render: (value: string | undefined, record) => value || record.targetId || record.targetType },
    {
      title: '结果',
      dataIndex: 'result',
      width: 90,
      render: (value: AuditEvent['result']) => <Tag color={auditResultColor(value)}>{auditResultLabel(value)}</Tag>,
    },
    { title: '来源', dataIndex: 'sourceIp', width: 140, render: (value?: string) => value || 'local-browser' },
    {
      title: '详情',
      width: 90,
      render: (_, record) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => setAuditDetail(record)}>
          查看
        </Button>
      ),
    },
  ]

  const modelPurposeText = useMemo(() => {
    const defaultProvider = providers.find((item) => item.status === 'enabled')
    return defaultProvider ? `${defaultProvider.name} · ${defaultProvider.defaultModel}` : '未配置'
  }, [providers])

  function appendAudit(input: Parameters<typeof recordAuditEvent>[0]) {
    recordAuditEvent(input)
    setAuditLog(getAuditEvents())
  }

  function testProvider(provider: ModelProvider) {
    if (provider.status === 'disabled') {
      messageApi.warning('该供应商已停用，请启用后再测试连接')
      appendAudit({
        action: '测试模型连接',
        targetType: 'model-provider',
        targetId: provider.id,
        targetName: provider.name,
        result: 'warning',
        summary: '供应商已停用，未执行连接测试。',
      })
      return
    }
    messageApi.success(`${provider.name} 连接正常，最近响应 ${provider.latency}ms`)
    appendAudit({
      action: '测试模型连接',
      targetType: 'model-provider',
      targetId: provider.id,
      targetName: provider.name,
      result: 'success',
      summary: `连接成功，响应耗时 ${provider.latency}ms。`,
    })
  }

  function confirmDisableProvider(provider: ModelProvider) {
    Modal.confirm({
      title: '确认停用模型供应商',
      content: `停用后，${provider.name} 将不再参与评估任务调度。`,
      okText: '确认停用',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        setProviders((items) => items.map((item) => (
          item.id === provider.id ? { ...item, status: 'disabled', quota: 0, latency: 0 } : item
        )))
        messageApi.success('模型供应商已停用')
        appendAudit({
          action: '停用模型供应商',
          targetType: 'model-provider',
          targetId: provider.id,
          targetName: provider.name,
          result: 'warning',
          summary: '模型供应商已停用，将不再参与评估任务调度。',
        })
      },
    })
  }

  function submitProvider() {
    form.validateFields().then((values) => {
      const isLocalProvider = isLocalVendor(values.vendor)
      const localBaseUrl = values.vendor === 'Ollama' ? 'http://127.0.0.1:11434' : 'local-runtime'
      const newProvider: ModelProvider = {
        id: `mp-${Date.now()}`,
        name: values.name,
        vendor: values.vendor,
        baseUrl: isLocalProvider ? localBaseUrl : values.baseUrl,
        defaultModel: values.defaultModel,
        scenario: values.scenario,
        status: values.enabled ? 'enabled' : 'disabled',
        latency: values.enabled ? 520 : 0,
        quota: values.enabled ? 100 : 0,
        updatedAt: '刚刚',
      }
      setProviders((items) => [newProvider, ...items])
      setDrawerOpen(false)
      form.resetFields()
      messageApi.success('模型供应商已添加')
      appendAudit({
        action: '新增模型供应商',
        targetType: 'model-provider',
        targetId: newProvider.id,
        targetName: newProvider.name,
        result: 'success',
        summary: `新增 ${newProvider.vendor} 供应商，默认模型 ${newProvider.defaultModel}。`,
      })
    })
  }

  function openProviderDrawer() {
    setDrawerOpen(true)
    setLocalModels([])
    form.setFieldsValue({ vendor: 'OpenAI-Compatible', enabled: true, timeout: 60 })
  }

  function handleVendorChange(vendor: string) {
    form.setFieldsValue({ defaultModel: undefined })
    if (isLocalVendor(vendor)) {
      form.setFieldsValue({ baseUrl: undefined, apiKey: undefined })
      loadLocalModels(vendor)
      return
    }
    setLocalModels([])
  }

  async function loadLocalModels(vendor = selectedVendor) {
    if (!isLocalVendor(vendor)) return
    setLocalModelsLoading(true)

    if (vendor !== 'Ollama') {
      setLocalModels([])
      setLocalModelsLoading(false)
      messageApi.info(`${vendor} 暂未提供标准模型发现接口，可手动输入模型名称`)
      return
    }

    try {
      const response = await fetch('http://127.0.0.1:11434/api/tags')
      if (!response.ok) throw new Error('Ollama 服务未返回可用模型')
      const data = await response.json() as { models?: Array<{ name?: string }> }
      const models = (data.models ?? [])
        .map((model) => model.name)
        .filter((name): name is string => Boolean(name))
        .map((name) => ({ value: name, label: name }))

      setLocalModels(models)
      if (models.length > 0) {
        form.setFieldsValue({ defaultModel: models[0].value })
        messageApi.success(`已发现 ${models.length} 个本地 Ollama 模型`)
      } else {
        messageApi.warning('未发现本地 Ollama 模型，请先执行 ollama pull')
      }
    } catch {
      setLocalModels([])
      messageApi.warning('未能连接本机 Ollama，请确认 Ollama 已启动')
    } finally {
      setLocalModelsLoading(false)
    }
  }

  function openRoleModal(user: UserAccount) {
    setRoleModalUser(user)
    roleForm.setFieldsValue({ role: user.role })
  }

  function submitRole() {
    roleForm.validateFields().then(({ role }) => {
      if (!roleModalUser) return
      const roleValue = ROLE_OPTIONS.find((item) => item.label === role)?.value
      if (roleValue) {
        const accounts = updateLocalAccount(roleModalUser.id, { role: roleValue as LocalAccount['role'] })
        setUserAccounts(accounts.map(toUserAccount))
      }
      setRoleModalUser(null)
      messageApi.success(`${roleModalUser.name} 的角色已更新为 ${role}`)
      appendAudit({
        action: '分配用户角色',
        targetType: 'user',
        targetId: roleModalUser.id,
        targetName: roleModalUser.name,
        result: 'success',
        summary: `用户角色已更新为 ${role}。`,
      })
    })
  }

  function openUserDrawer() {
    setUserDrawerOpen(true)
    userForm.resetFields()
    userForm.setFieldsValue({ role: 'eval_engineer' })
  }

  function submitUser() {
    userForm.validateFields().then((values) => {
      const exists = getLocalAccounts().some((account) => (
        account.username === values.username || account.email === values.email
      ))
      if (exists) {
        messageApi.error('用户名或邮箱已存在')
        return
      }

      addLocalAccount({
        username: values.username,
        password: values.password,
        email: values.email,
        fullName: values.fullName,
        role: values.role,
      })
      setUserAccounts(getLocalAccounts().map(toUserAccount))
      setUserDrawerOpen(false)
      messageApi.success(`用户 ${values.username} 已创建，可用于登录`)
      appendAudit({
        action: '新增登录用户',
        targetType: 'user',
        targetName: values.username,
        result: 'success',
        summary: '创建本地可登录账号。',
      })
    })
  }

  function toggleUserStatus(user: UserAccount) {
    const nextStatus = user.status === 'disabled' ? 'active' : 'disabled'
    const accounts = updateLocalAccount(user.id, { status: nextStatus })
    setUserAccounts(accounts.map(toUserAccount))
    messageApi.success(`${user.name} 已${nextStatus === 'active' ? '启用' : '禁用'}`)
    appendAudit({
      action: nextStatus === 'active' ? '启用用户' : '禁用用户',
      targetType: 'user',
      targetId: user.id,
      targetName: user.name,
      result: 'warning',
      summary: `用户状态变更为 ${nextStatus === 'active' ? '正常' : '禁用'}。`,
    })
  }

  function openBaselineCheck() {
    setBaselineVisible(true)
  }

  return (
    <div className={styles.container}>
      {contextHolder}

      <div className={styles.pageHeader}>
        <div>
          <Title level={4} className={styles.title}>系统设置</Title>
          <Text className={styles.subtitle}>集中管理模型接入、访问权限、登录安全和审计追踪</Text>
        </div>
        <Space>
          <Button icon={<SecurityScanOutlined />} onClick={openBaselineCheck}>安全基线检查</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openProviderDrawer}>
            新增模型供应商
          </Button>
        </Space>
      </div>

      <Alert
        type="warning"
        showIcon
        className={styles.sourceAlert}
        message="当前系统设置页使用前端演示数据"
        description="用户管理、登录事件、模型供应商操作、报告生成和整改流转已写入本地审计日志；模型供应商额度仍为页面状态数据。本机 Ollama 模型扫描会真实请求 127.0.0.1:11434。"
      />

      <Row gutter={[16, 16]} className={styles.overviewGrid}>
        <Col xs={24} md={12} xl={6}>
          <div className={styles.metricPanel}>
            <CloudServerOutlined />
            <div>
              <strong>{enabledProviderCount}</strong>
              <span>已启用模型供应商 · 演示</span>
            </div>
          </div>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <div className={styles.metricPanel}>
            <TeamOutlined />
            <div>
              <strong>{activeUserCount}</strong>
              <span>活跃账号 · 本地可登录</span>
            </div>
          </div>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <div className={styles.metricPanel}>
            <SafetyCertificateOutlined />
            <div>
              <strong>5</strong>
              <span>内置权限角色 · 演示</span>
            </div>
          </div>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <div className={styles.metricPanel}>
            <AuditOutlined />
            <div>
              <strong>{auditLog.filter((item) => item.result !== 'success').length}</strong>
              <span>待关注审计事件</span>
            </div>
          </div>
        </Col>
      </Row>

      <div className={styles.controlBar}>
        <Segmented
          options={sectionOptions}
          value={activeSection}
          onChange={(value) => setActiveSection(value as SettingsSection)}
          className={styles.segmented}
        />
        <div className={styles.defaultModel}>
          <KeyOutlined />
          <span>当前默认模型：{modelPurposeText}</span>
        </div>
      </div>

      {activeSection === 'models' && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>模型供应商</h2>
              <p>配置第三方大模型、默认用途、调用额度和连通性状态。当前列表为演示数据。</p>
            </div>
            <Tag color="orange">前端演示数据</Tag>
          </div>
          <Table
            rowKey="id"
            columns={providerColumns}
            dataSource={providers}
            pagination={false}
            scroll={{ x: 980 }}
          />
        </section>
      )}

      {activeSection === 'users' && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>用户管理</h2>
              <p>管理本地可登录账号、角色分配和最近登录行为。当前账号保存在浏览器本地存储。</p>
            </div>
            <Space>
              <Select defaultValue="全部角色" style={{ width: 140 }} options={[
                { value: '全部角色', label: '全部角色' },
                ...ROLE_OPTIONS.map((item) => ({ value: item.label, label: item.label })),
              ]} />
              <Button icon={<PlusOutlined />} onClick={openUserDrawer}>新增用户</Button>
            </Space>
          </div>
          <Table rowKey="id" columns={userColumns} dataSource={userAccounts} pagination={false} />
        </section>
      )}

      {activeSection === 'roles' && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>角色权限</h2>
              <p>首版采用固定 RBAC 权限矩阵，当前权限矩阵为前端演示配置。</p>
            </div>
            <Tag color="blue">RBAC</Tag>
          </div>
          <Table
            rowKey="role"
            columns={roleColumns}
            dataSource={permissionRoles}
            pagination={false}
            scroll={{ x: 920 }}
          />
        </section>
      )}

      {activeSection === 'security' && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>登录与访问安全</h2>
              <p>控制登录有效期、失败锁定、访问边界和高风险操作保护。</p>
            </div>
            <Button type="primary">保存策略</Button>
          </div>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <div className={styles.policyPanel}>
                <h3>会话策略</h3>
                <label>
                  登录有效期
                  <InputNumber addonAfter="小时" min={1} max={168} defaultValue={24} />
                </label>
                <label>
                  无操作退出
                  <InputNumber addonAfter="分钟" min={5} max={240} defaultValue={30} />
                </label>
                <label>
                  允许多端登录
                  <Switch defaultChecked />
                </label>
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <div className={styles.policyPanel}>
                <h3>登录保护</h3>
                <label>
                  失败锁定阈值
                  <Slider min={3} max={10} defaultValue={5} marks={{ 3: '3', 5: '5', 10: '10' }} />
                </label>
                <label>
                  锁定时长
                  <InputNumber addonAfter="分钟" min={5} max={1440} defaultValue={30} />
                </label>
                <label>
                  高风险操作二次确认
                  <Switch defaultChecked />
                </label>
              </div>
            </Col>
            <Col xs={24}>
              <div className={styles.policyPanel}>
                <h3>管理后台访问控制</h3>
                <Input.TextArea
                  rows={4}
                  defaultValue={'10.12.0.0/16\n192.168.1.0/24'}
                  placeholder="每行一个 IP 或 CIDR 网段"
                />
              </div>
            </Col>
          </Row>
        </section>
      )}

      {activeSection === 'audit' && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>审计日志</h2>
              <p>记录登录、权限、模型配置、报告生成、整改流转等关键操作。演示事件和本地真实操作会统一呈现。</p>
            </div>
            <Space>
              <Select defaultValue="全部结果" style={{ width: 130 }} options={[
                { value: '全部结果', label: '全部结果' },
                { value: '成功', label: '成功' },
                { value: '失败', label: '失败' },
                { value: '需关注', label: '需关注' },
              ]} />
              <Button>导出 CSV</Button>
            </Space>
          </div>
          <Table rowKey="id" columns={auditColumns} dataSource={auditLog} pagination={false} scroll={{ x: 980 }} />
        </section>
      )}

      <Drawer
        title="新增模型供应商"
        width={520}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={<Button type="primary" onClick={submitProvider}>保存</Button>}
      >
        <Form form={form} layout="vertical" initialValues={{ vendor: 'OpenAI-Compatible', enabled: true, timeout: 60 }}>
          <Form.Item label="供应商名称" name="name" rules={[{ required: true, message: '请输入供应商名称' }]}>
            <Input placeholder="例如：企业私有模型通道" />
          </Form.Item>
          <Form.Item label="供应商类型" name="vendor" rules={[{ required: true }]}>
            <Select options={vendorOptions} onChange={handleVendorChange} />
          </Form.Item>
          {isLocalModelVendor ? (
            <div className={styles.localRuntimePanel}>
              <div>
                <Text strong>{selectedVendor} 本地运行时</Text>
                <Text type="secondary">{localVendorHint[selectedVendor]}</Text>
              </div>
              <Button size="small" onClick={() => loadLocalModels()} loading={localModelsLoading}>
                重新扫描模型
              </Button>
            </div>
          ) : (
            <>
              <Form.Item label="Base URL" name="baseUrl" rules={[{ required: true, message: '请输入 Base URL' }]}>
                <Input placeholder="https://api.example.com/v1" />
              </Form.Item>
              <Form.Item label="API Key" name="apiKey" rules={[{ required: true, message: '请输入 API Key' }]}>
                <Input.Password placeholder="保存后仅展示脱敏信息" />
              </Form.Item>
            </>
          )}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label={isLocalModelVendor ? '本地模型' : '默认模型'}
                name="defaultModel"
                rules={[{ required: true, message: isLocalModelVendor ? '请选择或输入本地模型' : '请输入默认模型' }]}
              >
                {isLocalModelVendor ? (
                  <AutoComplete
                    allowClear
                    options={localModels}
                    placeholder={localModels.length > 0 ? '选择本机模型' : '可手动输入模型名称'}
                    notFoundContent={localModelsLoading ? '正在扫描本机模型' : '未发现模型，可手动输入'}
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <div className={styles.localModelTip}>未列出时可直接输入模型名称后保存。</div>
                      </>
                    )}
                  />
                ) : (
                  <Input placeholder="gpt-4.1" />
                )}
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="超时时间" name="timeout">
                <InputNumber addonAfter="秒" min={5} max={300} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="用途绑定" name="scenario" rules={[{ required: true, message: '请选择用途' }]}>
            <Select options={[
              { value: '评估推理 / 报告生成', label: '评估推理 / 报告生成' },
              { value: '批量评分', label: '批量评分' },
              { value: '敏感数据评估', label: '敏感数据评估' },
              { value: '备用模型', label: '备用模型' },
            ]} />
          </Form.Item>
          <Form.Item label="立即启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title="新增可登录用户"
        width={520}
        open={userDrawerOpen}
        onClose={() => setUserDrawerOpen(false)}
        extra={<Button type="primary" onClick={submitUser}>保存用户</Button>}
      >
        <Alert
          type="info"
          showIcon
          message="该用户创建后可直接用于登录"
          description="当前实现使用浏览器本地账号库，适合开发演示；接入后端鉴权后应改为服务端加密存储密码。"
          style={{ marginBottom: 16 }}
        />
        <Form form={userForm} layout="vertical">
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="例如：alice" />
          </Form.Item>
          <Form.Item label="姓名" name="fullName" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="例如：Alice Chen" />
          </Form.Item>
          <Form.Item label="邮箱" name="email" rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '邮箱格式不正确' },
          ]}>
            <Input placeholder="alice@example.com" />
          </Form.Item>
          <Form.Item label="初始密码" name="password" rules={[{ required: true, message: '请输入初始密码' }, { min: 6, message: '密码至少 6 位' }]}>
            <Input.Password placeholder="至少 6 位" />
          </Form.Item>
          <Form.Item label="角色" name="role" rules={[{ required: true, message: '请选择角色' }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
        </Form>
      </Drawer>

      <Modal
        title="安全基线检查"
        open={baselineVisible}
        onCancel={() => setBaselineVisible(false)}
        footer={<Button type="primary" onClick={() => setBaselineVisible(false)}>知道了</Button>}
        width={720}
      >
        <Alert
          type="info"
          showIcon
          message="这是基于当前页面状态的轻量检查"
          description="它用于说明系统设置需要满足哪些基础安全条件；当前尚未接入后端真实配置、数据库审计和生产安全策略，因此不等同于生产环境合规扫描。"
          style={{ marginBottom: 16 }}
        />
        <div className={styles.baselineList}>
          {baselineChecks.map((check) => (
            <div key={check.name} className={styles.baselineItem}>
              <Tag color={check.status === 'pass' ? 'green' : check.status === 'warning' ? 'orange' : 'red'}>
                {check.status === 'pass' ? '通过' : check.status === 'warning' ? '需确认' : '失败'}
              </Tag>
              <div>
                <Text strong>{check.name}</Text>
                <Text type="secondary">{check.description}</Text>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        title="分配角色"
        open={Boolean(roleModalUser)}
        onOk={submitRole}
        onCancel={() => setRoleModalUser(null)}
        okText="保存"
        cancelText="取消"
      >
        {roleModalUser && (
          <div className={styles.roleAssign}>
            <div className={styles.userSummary}>
              <span>{roleModalUser.name.slice(0, 1)}</span>
              <div>
                <Text strong>{roleModalUser.name}</Text>
                <Text type="secondary">{roleModalUser.email}</Text>
              </div>
            </div>
            <Form form={roleForm} layout="vertical">
              <Form.Item label="角色" name="role" rules={[{ required: true, message: '请选择角色' }]}>
                <Select options={ROLE_OPTIONS.map((item) => ({
                  value: item.label,
                  label: item.label,
                }))} />
              </Form.Item>
            </Form>
            <div className={styles.roleHint}>
              角色变更会影响用户可访问的模型管理、评估任务、报告中心和审计日志范围。
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="审计事件详情"
        open={Boolean(auditDetail)}
        onCancel={() => setAuditDetail(null)}
        footer={<Button onClick={() => setAuditDetail(null)}>关闭</Button>}
      >
        {auditDetail && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="时间">{auditDetail.createdAt}</Descriptions.Item>
            <Descriptions.Item label="操作人">{auditDetail.actorName || auditDetail.actorId || '未知用户'}</Descriptions.Item>
            <Descriptions.Item label="操作类型">{auditDetail.action}</Descriptions.Item>
            <Descriptions.Item label="操作对象">{auditDetail.targetName || auditDetail.targetId || auditDetail.targetType}</Descriptions.Item>
            <Descriptions.Item label="来源 IP">{auditDetail.sourceIp || 'local-browser'}</Descriptions.Item>
            <Descriptions.Item label="结果">
              <Tag color={auditResultColor(auditDetail.result)}>{auditResultLabel(auditDetail.result)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="对象">{auditDetail.targetName || auditDetail.targetId || auditDetail.targetType}</Descriptions.Item>
            <Descriptions.Item label="来源">{auditDetail.sourceIp || 'local-browser'}</Descriptions.Item>
            <Descriptions.Item label="摘要">{auditDetail.summary}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

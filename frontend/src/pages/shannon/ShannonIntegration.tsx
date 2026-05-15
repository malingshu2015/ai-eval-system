/**
 * Shannon 白盒验证工作台
 * 将第三方白盒渗透引擎作为系统级集成能力管理，而不是单纯展示能力对比。
 */
import { useState } from 'react'
import { Alert, Button, Form, Input, Space, Tag, Typography, message } from 'antd'
import {
  ApiOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  CodeOutlined,
  FileSearchOutlined,
  PlayCircleOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { governanceApi, type ShannonPlan } from '@/api/governance'
import styles from './ShannonIntegration.module.css'

const { Title, Text } = Typography
const { TextArea } = Input

const statusCards = [
  { label: '定位', value: '白盒 PoC 复核引擎', icon: <BranchesOutlined /> },
  { label: '当前阶段', value: '已接计划创建', icon: <CheckCircleOutlined /> },
  { label: '下一步', value: '接入隔离 Runner', icon: <SettingOutlined /> },
]

const capabilityRows = [
  ['输入条件', '目标 URL、源码路径、授权说明'],
  ['平台价值', '把 Shannon 从外部工具变成可审计的验证计划'],
  ['适用场景', '自有 Web/API、靶场、客户授权源码项目'],
  ['结果去向', '后续导入报告中心和整改中心'],
]

const pipeline = [
  '登记授权范围',
  '校验目标和源码',
  '创建 Shannon 计划',
  '隔离执行 Runner',
  '解析报告证据',
  '进入整改闭环',
]

export default function ShannonIntegration() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [creating, setCreating] = useState(false)
  const [plan, setPlan] = useState<ShannonPlan | null>(null)

  const createPlan = async () => {
    const values = await form.validateFields()
    setCreating(true)
    try {
      const nextPlan = await governanceApi.createShannonPlan({
        targetUrl: values.targetUrl,
        sourcePath: values.sourcePath,
        authorizationNote: values.authorizationNote,
        outputDir: values.outputDir || './shannon-reports',
      })
      setPlan(nextPlan)
      message.success('已创建 Shannon 白盒验证计划')
    } catch (error: any) {
      message.error(error?.detail || error?.message || '创建 Shannon 计划失败')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>系统设置 / 第三方白盒引擎</span>
          <Title level={2}>Shannon 白盒验证工作台</Title>
          <p>
            这里的价值不是再放一个说明页，而是把 Shannon 作为平台的白盒验证能力管理起来：
            登记授权、创建执行计划、沉淀审计记录，并为后续 Runner、报告中心和整改中心打通链路。
          </p>
          <div className={styles.heroActions}>
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => navigate('/pentest-hub')}>
              到 AI 渗透中心发起任务
            </Button>
            <Button icon={<FileSearchOutlined />} onClick={() => navigate('/reports')}>
              查看报告中心
            </Button>
          </div>
        </div>
        <div className={styles.statusGrid}>
          {statusCards.map((item) => (
            <div key={item.label} className={styles.statusCard}>
              <span>{item.icon}</span>
              <Text type="secondary">{item.label}</Text>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.workbench}>
        <div className={styles.planCard}>
          <div className={styles.sectionHeader}>
            <div>
              <Title level={4}>创建白盒验证计划</Title>
              <Text>先创建计划，不直接执行真实利用。后续 Runner 接入后，再由后端隔离环境执行。</Text>
            </div>
            <Tag color="blue">可审计</Tag>
          </div>

          <Form
            form={form}
            layout="vertical"
            initialValues={{
              targetUrl: 'http://localhost:3001',
              outputDir: './shannon-reports',
            }}
          >
            <Form.Item
              label="被测应用地址"
              name="targetUrl"
              rules={[{ required: true, message: '请填写被测应用地址' }]}
            >
              <Input placeholder="例如 http://localhost:3001 或 https://app.example.com" />
            </Form.Item>
            <Form.Item
              label="源码位置"
              name="sourcePath"
              rules={[{ required: true, message: '请填写源码路径' }]}
            >
              <Input placeholder="例如 /Users/me/project 或 /workspace/app" />
            </Form.Item>
            <Form.Item label="输出目录" name="outputDir">
              <Input placeholder="./shannon-reports" />
            </Form.Item>
            <Form.Item
              label="授权说明"
              name="authorizationNote"
              rules={[{ required: true, min: 8, message: '请填写明确的授权说明' }]}
            >
              <TextArea rows={4} placeholder="例如：自有靶场项目，授权在当前测试窗口内进行白盒验证。" />
            </Form.Item>
            <Space wrap>
              <Button type="primary" loading={creating} onClick={createPlan}>
                创建 Shannon 计划
              </Button>
              <Button onClick={() => form.resetFields()}>重置</Button>
            </Space>
          </Form>
        </div>

        <div className={styles.resultCard}>
          <div className={styles.sectionHeader}>
            <div>
              <Title level={4}>计划结果</Title>
              <Text>用于确认平台到底为 Shannon 生成了什么。</Text>
            </div>
            <Tag color={plan ? 'green' : 'default'}>{plan ? '已生成' : '待创建'}</Tag>
          </div>

          {plan ? (
            <Space direction="vertical" size={14} style={{ width: '100%' }}>
              <Alert
                type="success"
                showIcon
                message={`计划编号：${plan.id}`}
                description={plan.nextAction}
              />
              <div className={styles.commandBox}>{plan.command}</div>
              <div className={styles.metaList}>
                <div><span>目标</span><strong>{plan.targetUrl}</strong></div>
                <div><span>源码</span><strong>{plan.sourcePath}</strong></div>
                <div><span>输出</span><strong>{plan.outputDir}</strong></div>
              </div>
            </Space>
          ) : (
            <div className={styles.emptyState}>
              <ApiOutlined />
              <strong>还没有创建计划</strong>
              <p>填写左侧信息后，平台会生成可审计的 Shannon 白盒验证计划。</p>
            </div>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <Title level={4}>它现在能带来的实际价值</Title>
            <Text>把 Shannon 从“外部工具介绍”转成平台内的白盒验证接入点。</Text>
          </div>
        </div>
        <div className={styles.valueGrid}>
          {capabilityRows.map(([label, value]) => (
            <div key={label} className={styles.valueItem}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <Title level={4}>接入流程</Title>
            <Text>前 3 步已具备基础，后 3 步是下一阶段建设重点。</Text>
          </div>
        </div>
        <div className={styles.pipeline}>
          {pipeline.map((item, index) => (
            <div key={item} className={index <= 2 ? styles.pipelineDone : styles.pipelineTodo}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.guardrail}>
          <SafetyCertificateOutlined />
          <div>
            <Title level={4}>安全边界</Title>
            <p>
              Shannon 会基于源码和动态执行做真实验证，所以必须放在系统设置中统一管理授权、执行环境和审计。
              它不适合当成普通公网扫描器使用，也不应该绕过平台的证据判定和复核机制。
            </p>
          </div>
          <CodeOutlined />
        </div>
      </section>
    </div>
  )
}

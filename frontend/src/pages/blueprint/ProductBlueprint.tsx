/**
 * 产品整改蓝图页
 * 固化 AI 安全评估平台的对象模型、主流程、阶段计划和优先级。
 */
import { Card, Col, Progress, Row, Space, Tag, Timeline, Typography } from 'antd'
import {
  ApartmentOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  FileProtectOutlined,
  FlagOutlined,
  PartitionOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import styles from './ProductBlueprint.module.css'

const { Title, Text, Paragraph } = Typography

const domainObjects = [
  { name: 'Asset', label: '检测对象', desc: '大模型、AI Agent、Web/API、IoT 等被测对象', color: '#2563eb' },
  { name: 'ChecklistTemplate', label: '检查模板', desc: '定义检查项、风险维度、测试方法和适用报告模板', color: '#0f766e' },
  { name: 'EvaluationTask', label: '评估任务', desc: '一次具体检测任务，承载目标、模板、执行配置和状态', color: '#7c3aed' },
  { name: 'ExecutionRun', label: '执行记录', desc: '一次实际运行，记录工具、Agent、日志、耗时和失败原因', color: '#0891b2' },
  { name: 'Finding', label: '风险发现', desc: '结构化风险项，包含等级、来源、影响范围和复核状态', color: '#dc2626' },
  { name: 'Evidence', label: '证据', desc: '模型响应、请求响应、命令输出、截图、日志等事实来源', color: '#ea580c' },
  { name: 'ReviewResult', label: '复核结果', desc: '审核官或人工复核输出的可信度、驳回项和证据缺口', color: '#16a34a' },
  { name: 'Report', label: '正式报告', desc: '按对象类型和模板生成，支持版本、导出和归档', color: '#4f46e5' },
  { name: 'RemediationTask', label: '整改任务', desc: '风险闭环处理，包含责任人、期限、复测和关闭结论', color: '#be123c' },
  { name: 'AuditEvent', label: '审计事件', desc: '记录登录、执行、复核、导出、权限变更等关键动作', color: '#475569' },
]

const workflow = [
  '登记检测对象',
  '选择检查模板',
  '创建评估任务',
  '执行检测与采集证据',
  '生成结构化风险发现',
  '审核官复核',
  '生成分类型报告',
  '转入整改中心',
  '复测与关闭',
  '审计归档',
]

const phases = [
  {
    title: '阶段 1：结构化评估闭环底座',
    duration: '1-2 周',
    progress: 20,
    items: ['统一领域模型', '结构化 Finding/Evidence', '审核官结构化复核', '报告从结构化数据渲染'],
  },
  {
    title: '阶段 2：报告体系标准化',
    duration: '1 周',
    progress: 35,
    items: ['固定五类报告模板', '报告版本机制', '模板与检测对象自动匹配', '原始输出进入附录'],
  },
  {
    title: '阶段 3：整改中心',
    duration: '1-2 周',
    progress: 0,
    items: ['风险一键转整改', '责任人和截止时间', '复测记录', '报告联动整改状态'],
  },
  {
    title: '阶段 4：真实化与治理增强',
    duration: '2-4 周',
    progress: 10,
    items: ['真实用户和权限', '真实审计日志', '数据来源标识', '高风险操作授权控制'],
  },
]

const priorities = [
  {
    level: 'P0',
    title: '先做可信底座',
    desc: '统一数据模型、结构化发现、结构化证据、审核官复核、报告模板渲染。',
    color: '#dc2626',
  },
  {
    level: 'P1',
    title: '再做治理闭环',
    desc: '整改中心、报告版本、任务详情页、证据中心、审计事件。',
    color: '#ea580c',
  },
  {
    level: 'P2',
    title: '最后增强自动化',
    desc: '多工具编排、自动复测、趋势分析、SLA 统计、外部系统集成。',
    color: '#2563eb',
  },
]

const reportTemplates = [
  { name: '大模型安全评估报告', fit: 'LLM / RAG / 模型 API', focus: '测试维度、攻击样例、模型响应、失败项' },
  { name: 'AI Agent 安全评估报告', fit: '工具型 Agent / 工作流 Agent', focus: '工具权限、任务链路、危险动作、审计轨迹' },
  { name: 'Web 渗透测试报告', fit: 'Web / API / 业务系统', focus: '目标资产、核心漏洞、复核结论、整改计划' },
  { name: '基线合规检查报告', fit: '配置基线 / 制度项 / 合规检查', focus: '检查项、合规状态、责任人、整改期限' },
  { name: '综合对比报告', fit: '多模型 / 多 Agent / 多轮扫描', focus: '评分趋势、风险分布、Top 问题、版本差异' },
]

export default function ProductBlueprint() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <Text className={styles.eyebrow}>PRODUCT TRANSFORMATION BLUEPRINT</Text>
          <Title level={2}>AI 安全评估平台整改蓝图</Title>
          <Paragraph>
            本页用于固定产品对象、业务流程、优先级和实施阶段。后续开发以这里为共同基准，避免继续堆功能而忽略评估、证据、复核、报告和整改的完整闭环。
          </Paragraph>
        </div>
        <div className={styles.heroPanel}>
          <div>
            <span>目标状态</span>
            <strong>评估治理平台</strong>
          </div>
          <div>
            <span>当前重点</span>
            <strong>结构化闭环</strong>
          </div>
          <div>
            <span>优先级</span>
            <strong>P0 底座优先</strong>
          </div>
        </div>
      </section>

      <Row gutter={[16, 16]}>
        {priorities.map((item) => (
          <Col xs={24} md={8} key={item.level}>
            <Card className={styles.priorityCard}>
              <Tag color={item.color}>{item.level}</Tag>
              <Title level={5}>{item.title}</Title>
              <Text>{item.desc}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Space>
            <ApartmentOutlined />
            <Title level={4}>统一领域对象</Title>
          </Space>
          <Text>先把对象关系固定下来，页面和能力都围绕这些对象演进。</Text>
        </div>
        <div className={styles.objectGrid}>
          {domainObjects.map((item) => (
            <article className={styles.objectCard} key={item.name}>
              <span style={{ background: item.color }} />
              <strong>{item.label}</strong>
              <code>{item.name}</code>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Space>
            <PartitionOutlined />
            <Title level={4}>产品主流程</Title>
          </Space>
          <Text>从检测对象到审计归档，形成一条可追溯、可复核、可整改的工作流。</Text>
        </div>
        <div className={styles.workflow}>
          {workflow.map((step, index) => (
            <div className={styles.workflowStep} key={step}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Space>
                <FlagOutlined />
                <Title level={4}>实施阶段</Title>
              </Space>
              <Text>按阶段推进，先闭环，后治理，再自动化。</Text>
            </div>
            <Timeline
              items={phases.map((phase) => ({
                dot: <CheckCircleOutlined />,
                children: (
                  <div className={styles.phaseItem}>
                    <div className={styles.phaseTitle}>
                      <strong>{phase.title}</strong>
                      <Tag>{phase.duration}</Tag>
                    </div>
                    <Progress percent={phase.progress} size="small" showInfo={false} />
                    <div className={styles.phaseTags}>
                      {phase.items.map((item) => <Tag key={item}>{item}</Tag>)}
                    </div>
                  </div>
                ),
              }))}
            />
          </section>
        </Col>

        <Col xs={24} lg={10}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Space>
                <FileProtectOutlined />
                <Title level={4}>报告模板体系</Title>
              </Space>
              <Text>不同检测对象使用不同报告结构，统一外壳，分类正文。</Text>
            </div>
            <div className={styles.templateList}>
              {reportTemplates.map((template) => (
                <div className={styles.templateItem} key={template.name}>
                  <strong>{template.name}</strong>
                  <span>{template.fit}</span>
                  <p>{template.focus}</p>
                </div>
              ))}
            </div>
          </section>
        </Col>
      </Row>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Space>
            <DatabaseOutlined />
            <Title level={4}>下一步落地范围</Title>
          </Space>
          <Text>建议先做 P0，形成可信底座后再扩整改中心和治理能力。</Text>
        </div>
        <div className={styles.nextGrid}>
          <div><SafetyCertificateOutlined /><strong>结构化发现</strong><p>Finding 必须包含等级、来源、证据状态、复核状态和影响范围。</p></div>
          <div><AuditOutlined /><strong>审核官复核</strong><p>复核输出通过、待确认、驳回、证据缺口和总体可信度。</p></div>
          <div><FileProtectOutlined /><strong>报告数据源</strong><p>报告正文来自结构化数据，原始 AI 输出只进入附录。</p></div>
        </div>
      </section>
    </div>
  )
}

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
    progress: 90,
    status: '基本完成',
    items: ['统一领域模型', '结构化 Finding/Evidence', '审核官结构化复核', '报告从结构化数据渲染'],
  },
  {
    title: '阶段 2：报告体系标准化',
    duration: '1 周',
    progress: 85,
    status: '基本完成',
    items: ['固定五类报告模板', '报告版本机制', '模板与检测对象自动匹配', '原始输出进入附录'],
  },
  {
    title: '阶段 3：整改中心',
    duration: '1-2 周',
    progress: 80,
    status: '基本完成',
    items: ['风险一键转整改', '责任人和截止时间', '复测记录', '报告联动整改状态'],
  },
  {
    title: '阶段 4：真实化与治理增强',
    duration: '2-4 周',
    progress: 78,
    status: '进行中',
    items: ['真实用户和权限', '真实审计日志', '数据来源标识', '高风险操作授权控制'],
  },
  {
    title: '阶段 5：自动化执行与验收',
    duration: '2-3 周',
    progress: 100,
    status: '已完成',
    items: ['PoC 沙箱', '异步任务队列', '执行结果回填', '端到端回归测试'],
  },
]

const progressSummary = [
  { label: '原始四个里程碑', value: 84, status: '已形成产品闭环', color: '#16a34a' },
  { label: 'Sprint 5 集成验收', value: 100, status: '已完成', color: '#2563eb' },
  { label: 'Sprint 6 后端桥接', value: 100, status: '已完成', color: '#16a34a' },
  { label: 'Sprint 7 生产化底座', value: 88, status: '权限矩阵已验收', color: '#7c3aed' },
  { label: 'Sprint 8 自动化执行', value: 100, status: '页面闭环 E2E 已覆盖', color: '#0891b2' },
  { label: 'Sprint 9 PoC 覆盖扩展', value: 95, status: '15 项 PoC 已覆盖', color: '#ea580c' },
]

const completedTracks = [
  {
    title: '产品蓝图与设置基础',
    detail: '已建立产品整改蓝图、系统设置页面、模型供应商、用户、角色、登录安全和审计日志入口。',
    commit: 'c666787',
  },
  {
    title: '结构化评估底座',
    detail: '已定义 Finding、Evidence、ReviewResult 等领域结构，渗透中心可生成结构化发现和审核官复核结果。',
    commit: 'd5d53a1',
  },
  {
    title: '报告模板体系',
    detail: '已支持按检测对象推荐报告模板，报告详情页按标准化结构展示，原始输出进入附录。',
    commit: '876f741',
  },
  {
    title: '整改中心闭环',
    detail: '已新增整改中心与整改详情，支持责任人、期限、状态更新、复测记录和报告关联。',
    commit: 'a20109b',
  },
  {
    title: '治理与审计增强',
    detail: '已补充审计事件、数据来源提示、高风险操作记录和设置页治理信息。',
    commit: 'dc65c3c',
  },
  {
    title: '集成验收与持久化计划',
    detail: '已形成验收清单和后端持久化准备文档，明确哪些能力仍处于后端优先、本地兜底阶段。',
    commit: '8fcd489',
  },
  {
    title: '后端持久化桥接',
    detail: '已完成治理审计、整改任务、渗透报告、真实账号、模型供应商的后端接口与前端桥接。',
    commit: '1711df4 - b82459a',
  },
  {
    title: '数据库迁移与初始化策略',
    detail: '已新增 Alembic 迁移体系、初始核心表迁移脚本、PoC 字段迁移，并补充开发、验收、生产环境的初始化数据边界。',
    commit: 'Sprint 7.1 - 7.2',
  },
  {
    title: '接口级 RBAC 与数据隔离',
    detail: '已新增统一鉴权依赖，并在评估、检查模板、报告、设置和治理接口中接入角色校验；已补后端角色矩阵和评估任务归属隔离验收测试。',
    commit: 'Sprint 7.3 - 7.6 · 待提交',
  },
  {
    title: 'PoC 执行与异步任务底座',
    detail: '已新增 PoC 执行服务、Celery 任务入口、任务状态查询、结果回填、置信度计算、报告证据引用、轻量运行隔离、失败诊断、前端执行入口、本地 Ollama 模型端到端验收、报告导出鉴权、整改闭环 API 回归、工作台 E2E 和报告转整改 E2E。',
    commit: 'Sprint 8.1 - 8.8 · 待提交',
  },
  {
    title: '大模型 PoC 覆盖扩展',
    detail: '已为直接越狱、角色扮演绕过、编码绕过和有害内容生成 4 个大模型检查项配置可执行 PoC，已同步到当前开发库内置模板，并新增目录级安全校验测试。',
    commit: 'Sprint 9.1 · 待提交',
  },
  {
    title: 'Agent / Web PoC 覆盖扩展',
    detail: '已为 Agent 危险工具调用、Agent 环境变量泄露、Web HTTPS 入口和 HTTP 安全响应头 4 个检查项配置只读 PoC，并同步到当前开发库。',
    commit: 'Sprint 9.2 · 待提交',
  },
  {
    title: 'Web / API 只读 PoC 扩展',
    detail: '已为 API 认证有效性、响应数据过度暴露、敏感文件暴露和错误信息泄露 4 个检查项配置只读 PoC，并同步到当前开发库。',
    commit: 'Sprint 9.3 · 待提交',
  },
  {
    title: 'PoC 失败诊断增强',
    detail: '已将 PoC 失败细分为目标不可达、认证失败、目标不存在、判定失败、脚本异常、超时和策略拦截，前端与报告可直接展示诊断码和说明。',
    commit: 'Sprint 9.4 · 待提交',
  },
  {
    title: '本地一键验收入口',
    detail: '已新增本地验收脚本，按顺序执行后端验收测试、前端类型检查和浏览器端冒烟 E2E，作为后续 Sprint 完成后的统一回归入口。',
    commit: 'Sprint 9.5 · 待提交',
  },
  {
    title: 'API / Web 只读 PoC 再扩展',
    detail: '已新增 CSRF Cookie 属性、废弃 API 版本暴露、JWT alg=none 拒绝检查 3 个只读 PoC，当前 Web/API 覆盖提升到 9 项，Sprint 9 总覆盖达到 15 项。',
    commit: 'Sprint 9.6 · 待提交',
  },
]

const openTracks = [
  {
    title: '生产级数据库迁移',
    owner: '后端',
    status: '进行中',
    detail: 'Alembic 基础、初始化开关和 PoC 字段迁移已建立；还需要发布流水线、PostgreSQL 迁移验证和回滚演练。',
  },
  {
    title: '权限策略验收',
    owner: '后端 / 前端',
    status: '部分完成',
    detail: '后端 API 角色矩阵与评估任务数据隔离已通过验收测试；仍需补前端菜单权限一致性和高风险操作二次确认。',
  },
  {
    title: '后端作为唯一主数据源',
    owner: '全栈',
    status: '进行中',
    detail: '多数模块已是后端优先、本地兜底。下一步要逐步去除关键业务的纯本地演示数据。',
  },
  {
    title: '端到端验收自动化',
    owner: '测试',
    status: '部分完成',
    detail: '已新增后端 RBAC API、PoC 结果回填、模型名注入、报告导出鉴权、报告归属隔离和整改闭环回归测试，以及前端类型构建、本地 Ollama 浏览器验收、工作台冒烟 E2E、报告转整改 E2E 和本地一键验收入口；后续接入 CI 发布流水线。',
  },
  {
    title: '自动化执行闭环',
    owner: '安全能力',
    status: '部分完成',
    detail: 'PoC 沙箱、Celery 入口、任务状态查询、结果回填、置信度计算、报告证据引用、轻量运行隔离、失败诊断、前端执行入口、本地 Ollama 模型调用、报告导出鉴权修复、工作台 E2E、报告转整改 E2E 和本地一键验收入口已完成；当前已有 15 个检查项配置 PoC，下一步补 GraphQL、Webhook、对象级越权等需要更明确目标接口契约的探针。',
  },
  {
    title: '迁移脚本与模型一致性',
    owner: '后端',
    status: '待持续验证',
    detail: 'PoC 字段差异已补齐；后续需要将 alembic check 纳入验收，并用 PostgreSQL 环境过滤 SQLite UUID 类型噪声。',
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
            <strong>生产化验收</strong>
          </div>
          <div>
            <span>整体进度</span>
            <strong>进入 Sprint 9</strong>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Space>
            <CheckCircleOutlined />
            <Title level={4}>当前实施进度</Title>
          </Space>
          <Text>截至 2026-05-05，当前分支已完成产品闭环、后端桥接和当前范围自动化验收，正在扩展 PoC 覆盖与发布级验证。</Text>
        </div>
        <div className={styles.progressGrid}>
          {progressSummary.map((item) => (
            <article className={styles.progressCard} key={item.label}>
              <div>
                <strong>{item.label}</strong>
                <Tag color={item.color}>{item.status}</Tag>
              </div>
              <Progress percent={item.value} strokeColor={item.color} />
            </article>
          ))}
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
                      <Space>
                        <Tag color={phase.progress >= 80 ? 'green' : phase.progress >= 60 ? 'orange' : 'blue'}>{phase.status}</Tag>
                        <Tag>{phase.duration}</Tag>
                      </Space>
                    </div>
                    <Progress percent={phase.progress} size="small" />
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
            <Title level={4}>已完成能力</Title>
          </Space>
          <Text>按提交点沉淀，方便后续验收和回滚定位。</Text>
        </div>
        <div className={styles.trackList}>
          {completedTracks.map((item) => (
            <article className={styles.trackItem} key={item.title}>
              <div>
                <strong>{item.title}</strong>
                <Tag color="green">已完成</Tag>
              </div>
              <p>{item.detail}</p>
              <code>{item.commit}</code>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Space>
            <DatabaseOutlined />
            <Title level={4}>未完成事项</Title>
          </Space>
          <Text>这里是下一阶段继续推进时最应该优先处理的缺口。</Text>
        </div>
        <div className={styles.openGrid}>
          {openTracks.map((item) => (
            <article className={styles.openItem} key={item.title}>
              <div>
                <strong>{item.title}</strong>
                <Tag color={item.status === '进行中' || item.status === '部分完成' ? 'orange' : 'default'}>{item.status}</Tag>
              </div>
              <span>{item.owner}</span>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Space>
            <DatabaseOutlined />
            <Title level={4}>下一步落地范围</Title>
          </Space>
          <Text>建议优先把 PostgreSQL 迁移验证、权限测试和自动化执行结果回填补齐。</Text>
        </div>
        <div className={styles.nextGrid}>
          <div><SafetyCertificateOutlined /><strong>迁移验收</strong><p>用 PostgreSQL 验证 Alembic 迁移，并把模型与迁移一致性检查纳入验收。</p></div>
          <div><AuditOutlined /><strong>权限验收</strong><p>沉淀 Admin、评估员、审计员、资产管理员的接口权限和数据隔离测试。</p></div>
          <div><FileProtectOutlined /><strong>执行结果闭环</strong><p>扩展更多检查项 PoC，并把本地验收入口接入发布流水线。</p></div>
        </div>
      </section>
    </div>
  )
}

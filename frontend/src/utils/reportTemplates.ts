import type { TargetType } from '@/types'

export type ReportTemplateId =
  | 'llm-security'
  | 'agent-security'
  | 'web-pentest'
  | 'baseline-compliance'
  | 'comparison'

export type ReportTemplateMode = 'auto' | 'manual'

export type ReportTemplateDefinition = {
  id: ReportTemplateId
  name: string
  shortName: string
  targetTypes: TargetType[]
  description: string
  focus: string[]
  requiredData: string[]
  sections: Array<{
    key: string
    title: string
    description: string
  }>
}

export const REPORT_TEMPLATES: ReportTemplateDefinition[] = [
  {
    id: 'llm-security',
    name: '大模型安全评估报告',
    shortName: '大模型报告',
    targetTypes: ['llm'],
    description: '适合 LLM、RAG、模型 API，突出测试维度、攻击样例、模型响应和失败项。',
    focus: ['风险维度', '攻击样例', '模型响应', '修复建议'],
    requiredData: ['模型配置', '测试维度', '攻击样例', '模型响应', '失败项证据'],
    sections: [
      { key: 'summary', title: '执行摘要', description: '说明整体风险、通过率和优先处理事项。' },
      { key: 'model-config', title: '模型与调用配置', description: '记录模型、供应商、调用方式和安全边界。' },
      { key: 'test-dimensions', title: '测试维度', description: '展示越狱、提示注入、幻觉、偏见、API 安全等维度。' },
      { key: 'failed-cases', title: '高风险失败项', description: '聚焦需要立即处理的失败检查项。' },
      { key: 'samples', title: '攻击样例与模型响应', description: '保留关键输入、输出和判定依据。' },
      { key: 'remediation', title: '防护建议', description: '给出模型侧、网关侧和流程侧整改建议。' },
      { key: 'appendix', title: '附录', description: '收纳原始输出和完整检查记录。' },
    ],
  },
  {
    id: 'agent-security',
    name: 'AI Agent 安全评估报告',
    shortName: 'Agent 报告',
    targetTypes: ['agent'],
    description: '适合带工具调用和工作流编排的 Agent，突出权限边界、危险动作和审计轨迹。',
    focus: ['工具权限', '任务链路', '危险动作', '审计轨迹'],
    requiredData: ['Agent 能力', '工具权限', '任务链路', '危险动作', '审计轨迹'],
    sections: [
      { key: 'summary', title: '执行摘要', description: '说明 Agent 总体风险和关键失控场景。' },
      { key: 'capability-boundary', title: 'Agent 能力边界', description: '描述 Agent 可访问系统、工具和数据范围。' },
      { key: 'tool-matrix', title: '工具权限矩阵', description: '展示工具权限、授权方式和最小权限状态。' },
      { key: 'chain-risk', title: '任务链路风险', description: '分析多步任务中的越权、注入和绕过风险。' },
      { key: 'dangerous-actions', title: '危险动作拦截记录', description: '展示高风险工具调用与拦截效果。' },
      { key: 'audit-trail', title: '审计轨迹', description: '记录关键动作、操作者和时间线。' },
      { key: 'remediation', title: '修复建议', description: '给出权限、隔离、审批和审计层面的整改建议。' },
    ],
  },
  {
    id: 'web-pentest',
    name: 'Web 渗透测试报告',
    shortName: 'Web 渗透报告',
    targetTypes: ['webapp'],
    description: '适合 Web、API 和业务系统，突出资产范围、漏洞等级、复核结论和整改计划。',
    focus: ['目标资产', '核心漏洞', '审核官复核', '整改计划'],
    requiredData: ['目标资产', '风险发现', '证据链', '复核结果', '整改建议'],
    sections: [
      { key: 'summary', title: '执行摘要', description: '面向管理者说明风险规模、优先级和结论。' },
      { key: 'assets', title: '目标资产', description: '记录目标 URL、主机、端口和测试范围。' },
      { key: 'risk-distribution', title: '风险分布', description: '按严重等级、来源和证据状态统计发现。' },
      { key: 'core-findings', title: '核心漏洞', description: '展示结构化漏洞摘要、证据状态和处置建议。' },
      { key: 'review', title: '复核结论', description: '展示审核官通过、待确认、驳回和证据缺口。' },
      { key: 'remediation', title: '整改计划', description: '输出可执行的修复步骤和优先级。' },
      { key: 'appendix', title: '原始扫描附录', description: '收纳工具日志、AI 原始输出和完整证据。' },
    ],
  },
  {
    id: 'baseline-compliance',
    name: '基线合规检查报告',
    shortName: '基线报告',
    targetTypes: ['llm', 'agent', 'webapp', 'iot'],
    description: '适合配置基线、制度项和合规检查，突出检查项、责任归属和整改期限。',
    focus: ['检查项', '合规状态', '责任人', '整改期限'],
    requiredData: ['检查范围', '检查项', '合规状态', '责任人', '整改期限'],
    sections: [
      { key: 'summary', title: '执行摘要', description: '说明合规率、主要不符合项和整改压力。' },
      { key: 'scope', title: '检查范围', description: '明确对象、标准、版本和适用边界。' },
      { key: 'compliance-rate', title: '合规率', description: '按分类统计通过、不通过和不适用项。' },
      { key: 'non-compliance', title: '不符合项', description: '展示不符合项、风险等级和证据。' },
      { key: 'owners', title: '责任人与整改期限', description: '明确责任人、截止日期和当前状态。' },
      { key: 'retest', title: '复测结果', description: '记录复测结论和关闭条件。' },
      { key: 'appendix', title: '附录', description: '收纳基线条款和原始记录。' },
    ],
  },
  {
    id: 'comparison',
    name: '综合对比报告',
    shortName: '对比报告',
    targetTypes: ['llm', 'agent', 'webapp'],
    description: '适合多模型、多 Agent 或多轮扫描对比，突出评分趋势和差异分析。',
    focus: ['评分趋势', '风险分布', 'Top 问题', '版本差异'],
    requiredData: ['对比对象', '评分数据', '风险分布', '历史版本', 'Top 问题'],
    sections: [
      { key: 'summary', title: '执行摘要', description: '说明整体变化、风险趋势和关键结论。' },
      { key: 'targets', title: '对比对象', description: '列出模型、Agent、系统或扫描批次。' },
      { key: 'score-trend', title: '评分趋势', description: '展示多次评估的评分变化。' },
      { key: 'risk-diff', title: '风险差异', description: '对比新增、关闭和持续存在的问题。' },
      { key: 'top-issues', title: 'Top 问题', description: '聚焦影响最大的共性问题。' },
      { key: 'version-change', title: '版本变化', description: '解释版本、策略或配置变化造成的差异。' },
      { key: 'recommendation', title: '结论建议', description: '给出下一轮治理重点。' },
    ],
  },
]

export const DEFAULT_REPORT_TEMPLATE_BY_TARGET: Record<TargetType, ReportTemplateId> = {
  llm: 'llm-security',
  agent: 'agent-security',
  webapp: 'web-pentest',
  iot: 'baseline-compliance',
}

export function getReportTemplate(id: ReportTemplateId) {
  return REPORT_TEMPLATES.find((template) => template.id === id) ?? REPORT_TEMPLATES[0]
}

export function getRecommendedReportTemplate(targetType: TargetType) {
  return getReportTemplate(DEFAULT_REPORT_TEMPLATE_BY_TARGET[targetType])
}

export function getReportTemplatesForTarget(targetType: TargetType) {
  return REPORT_TEMPLATES.filter((template) => template.targetTypes.includes(targetType))
}

export function resolveReportTemplate(targetType: TargetType, templateId?: string) {
  const matched = REPORT_TEMPLATES.find((template) => template.id === templateId)
  return matched ?? getRecommendedReportTemplate(targetType)
}

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
}

export const REPORT_TEMPLATES: ReportTemplateDefinition[] = [
  {
    id: 'llm-security',
    name: '大模型安全评估报告',
    shortName: '大模型报告',
    targetTypes: ['llm'],
    description: '适合 LLM、RAG、模型 API，突出测试维度、攻击样例、模型响应和失败项。',
    focus: ['风险维度', '攻击样例', '模型响应', '修复建议'],
  },
  {
    id: 'agent-security',
    name: 'AI Agent 安全评估报告',
    shortName: 'Agent 报告',
    targetTypes: ['agent'],
    description: '适合带工具调用和工作流编排的 Agent，突出权限边界、危险动作和审计轨迹。',
    focus: ['工具权限', '任务链路', '危险动作', '审计轨迹'],
  },
  {
    id: 'web-pentest',
    name: 'Web 渗透测试报告',
    shortName: 'Web 渗透报告',
    targetTypes: ['webapp'],
    description: '适合 Web、API 和业务系统，突出资产范围、漏洞等级、复核结论和整改计划。',
    focus: ['目标资产', '核心漏洞', '审核官复核', '整改计划'],
  },
  {
    id: 'baseline-compliance',
    name: '基线合规检查报告',
    shortName: '基线报告',
    targetTypes: ['llm', 'agent', 'webapp', 'iot'],
    description: '适合配置基线、制度项和合规检查，突出检查项、责任归属和整改期限。',
    focus: ['检查项', '合规状态', '责任人', '整改期限'],
  },
  {
    id: 'comparison',
    name: '综合对比报告',
    shortName: '对比报告',
    targetTypes: ['llm', 'agent', 'webapp'],
    description: '适合多模型、多 Agent 或多轮扫描对比，突出评分趋势和差异分析。',
    focus: ['评分趋势', '风险分布', 'Top 问题', '版本差异'],
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

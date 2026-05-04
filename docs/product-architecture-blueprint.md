# AI 安全评估平台产品整改蓝图与架构设计

## 1. 目标

当前系统已经具备评估任务、AI 渗透中心、检查模板库、报告中心和系统设置等能力。下一阶段的目标不是继续堆叠功能，而是把产品升级为一套完整的 AI 安全评估与治理平台。

目标主流程：

```text
检测对象 -> 检查模板 -> 评估任务 -> 执行检测 -> 证据采集 -> 风险发现 -> 审核复核 -> 报告生成 -> 整改跟踪 -> 审计归档
```

## 2. 产品定位

产品定位为：

> 面向大模型、AI Agent、Web/API 与 IoT 的安全评估、证据复核、报告生成和整改治理平台。

产品不应被定义成单一扫描工具。扫描只是能力层的一部分，真正的产品价值在于：

- 标准化检查模板
- 可追溯证据链
- 审核官复核机制
- 分类型报告模板
- 整改闭环
- 权限与审计治理

## 3. 统一领域模型

### 3.1 核心对象

| 对象 | 中文名 | 说明 |
| --- | --- | --- |
| `Asset` | 检测对象 | 大模型、AI Agent、Web/API、IoT 等被测对象 |
| `ChecklistTemplate` | 检查模板 | 定义检查项、风险维度、测试方法和适用报告模板 |
| `EvaluationTask` | 评估任务 | 一次具体检测任务，绑定对象、模板和执行配置 |
| `ExecutionRun` | 执行记录 | 一次实际运行，记录工具、Agent、日志、耗时和失败原因 |
| `Finding` | 风险发现 | 结构化风险项，包含等级、来源、影响范围和复核状态 |
| `Evidence` | 证据 | 模型响应、请求响应、命令输出、截图、日志等事实来源 |
| `ReviewResult` | 复核结果 | 审核官或人工复核输出的可信度、驳回项和证据缺口 |
| `Report` | 正式报告 | 按对象类型和模板生成，支持版本、导出和归档 |
| `RemediationTask` | 整改任务 | 风险闭环处理，包含责任人、期限、复测和关闭结论 |
| `AuditEvent` | 审计事件 | 记录登录、执行、复核、导出、权限变更等关键动作 |

### 3.2 对象关系

```text
Asset 1 -- n EvaluationTask
ChecklistTemplate 1 -- n EvaluationTask
EvaluationTask 1 -- n ExecutionRun
ExecutionRun 1 -- n Finding
Finding 1 -- n Evidence
Finding 1 -- n ReviewResult
EvaluationTask 1 -- n Report
Finding 1 -- n RemediationTask
User 1 -- n AuditEvent
```

## 4. 状态流转

### 4.1 评估任务状态

```text
draft -> queued -> running -> pending_review -> completed -> archived
                         \-> failed
```

状态说明：

- `draft`：草稿，尚未执行
- `queued`：待执行
- `running`：执行中
- `pending_review`：待复核
- `completed`：已完成
- `archived`：已归档
- `failed`：执行失败

### 4.2 风险发现状态

```text
pending -> verified -> remediation_created -> retest_passed -> closed
       \-> rejected
```

状态说明：

- `pending`：待确认
- `verified`：已确认
- `rejected`：已驳回
- `remediation_created`：已转整改
- `retest_passed`：复测通过
- `closed`：已关闭

### 4.3 整改任务状态

```text
open -> in_progress -> pending_retest -> fixed -> closed
                 \-> overdue
```

状态说明：

- `open`：待处理
- `in_progress`：处理中
- `pending_retest`：待复测
- `fixed`：已修复
- `closed`：已关闭
- `overdue`：已逾期

### 4.4 报告状态

```text
draft -> generated -> published -> archived
```

报告版本建议：

- `v1`：初版
- `v2`：复核版
- `v3`：整改后复测版

## 5. 关键结构设计

### 5.1 Finding

```ts
type Finding = {
  id: string
  taskId: string
  runId?: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: string
  source: 'tool' | 'ai_inferred' | 'manual'
  affectedAsset?: string
  evidenceStatus: 'missing' | 'partial' | 'verified'
  reviewStatus: 'pending' | 'verified' | 'rejected'
  remediationAdvice?: string
  createdAt: string
}
```

### 5.2 Evidence

```ts
type Evidence = {
  id: string
  findingId: string
  type: 'text' | 'screenshot' | 'request_response' | 'command_output' | 'model_response' | 'log'
  sourceTool?: string
  summary: string
  rawContent: string
  confidence: 'high' | 'medium' | 'low'
  collectedAt: string
}
```

### 5.3 ReviewResult

```ts
type ReviewResult = {
  id: string
  taskId: string
  reviewer: 'audit-agent' | 'human'
  overallConfidence: 'high' | 'medium' | 'low'
  verifiedFindingIds: string[]
  needsReviewFindingIds: string[]
  rejectedFindingIds: string[]
  evidenceGaps: string[]
  conclusion: string
  createdAt: string
}
```

### 5.4 Report

```ts
type Report = {
  id: string
  taskId: string
  templateId: ReportTemplateId
  version: number
  status: 'draft' | 'generated' | 'published' | 'archived'
  generatedFrom: {
    findingIds: string[]
    evidenceIds: string[]
    reviewResultId?: string
  }
  generatedAt: string
}
```

### 5.5 RemediationTask

```ts
type RemediationTask = {
  id: string
  findingId: string
  title: string
  ownerId?: string
  dueDate?: string
  status: 'open' | 'in_progress' | 'pending_retest' | 'fixed' | 'closed' | 'overdue'
  actionPlan: string
  retestResult?: string
  closedAt?: string
}
```

## 6. 报告模板体系

### 6.1 模板策略

采用：

```text
系统自动推荐 + 用户可手动覆盖
```

默认映射：

| 检测对象 | 默认报告模板 |
| --- | --- |
| 大模型 | 大模型安全评估报告 |
| AI Agent | AI Agent 安全评估报告 |
| Web/API | Web 渗透测试报告 |
| IoT | 基线合规检查报告 |

### 6.2 固定报告模板

1. 大模型安全评估报告
   - 执行摘要
   - 模型与调用配置
   - 测试维度
   - 高风险失败项
   - 攻击样例与模型响应
   - 防护建议
   - 附录

2. AI Agent 安全评估报告
   - 执行摘要
   - Agent 能力边界
   - 工具权限矩阵
   - 任务链路风险
   - 危险动作拦截记录
   - 审计轨迹
   - 修复建议

3. Web 渗透测试报告
   - 执行摘要
   - 目标资产
   - 风险分布
   - 核心漏洞
   - 复核结论
   - 整改计划
   - 原始扫描附录

4. 基线合规检查报告
   - 执行摘要
   - 检查范围
   - 合规率
   - 不符合项
   - 责任人与整改期限
   - 复测结果
   - 附录

5. 综合对比报告
   - 执行摘要
   - 对比对象
   - 评分趋势
   - 风险差异
   - Top 问题
   - 版本变化
   - 结论建议

## 7. 实施阶段

### 阶段 1：结构化评估闭环底座

周期：1-2 周

目标：

- 定义统一 TypeScript 类型
- 结构化 `Finding`
- 结构化 `Evidence`
- 结构化 `ReviewResult`
- 报告从结构化数据渲染

交付物：

- 统一领域类型文件
- 风险发现列表
- 证据列表
- 审核官结构化复核结果
- 报告详情页读取结构化数据

### 阶段 2：报告体系标准化

周期：1 周

目标：

- 固定五类报告模板
- 报告模板与检测对象自动匹配
- 支持用户手动选择模板
- 支持报告版本

交付物：

- 报告模板注册表
- 报告中心模板列
- 报告详情按模板渲染
- 报告版本信息

### 阶段 3：整改中心

周期：1-2 周

目标：

- 风险发现一键转整改
- 整改责任人和截止时间
- 整改状态流转
- 复测记录
- 报告联动整改状态

交付物：

- 整改中心列表页
- 整改详情页
- 风险转整改操作
- 整改状态统计

### 阶段 4：真实化与治理增强

周期：2-4 周

目标：

- 用户、角色、权限真实化
- 审计日志真实化
- 明确真实数据、AI 推断数据、演示数据
- 高风险操作授权控制

交付物：

- 后端持久化用户和角色
- 审计事件记录
- 数据来源标识
- 权限拦截和页面级访问控制

## 8. 优先级

### P0：可信底座

- 统一数据模型
- 结构化发现
- 结构化证据
- 审核官结构化复核
- 报告模板渲染

### P1：治理闭环

- 整改中心
- 报告版本
- 任务详情页
- 证据中心
- 审计事件

### P2：自动化增强

- 多工具执行编排
- 多报告对比
- 自动复测
- 风险趋势分析
- SLA 统计
- 外部系统集成

## 9. 近期实施建议

下一步建议先实施 P0：

1. 新增统一领域模型类型文件。
2. 将现有渗透报告中的 findings 转换为标准 `Finding`。
3. 将原始扫描输出、模型响应和复核说明转换为 `Evidence`。
4. 将审核官输出改为标准 `ReviewResult`。
5. 报告详情页只读取结构化 `Finding/Evidence/ReviewResult` 生成正文。
6. 原始 AI 输出和工具日志只作为附录展示。

完成 P0 后，再进入整改中心建设。

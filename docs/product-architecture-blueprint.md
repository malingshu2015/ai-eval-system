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

### 7.0 当前实施状态

更新时间：2026-05-04

当前分支：`codex/integration-product-governance`

| 范围 | 状态 | 对应提交 | 说明 |
| --- | --- | --- | --- |
| 产品整改蓝图与系统设置基础 | 已完成 | `c666787` | 已建立蓝图页、系统设置页、模型供应商、用户、角色、登录安全和审计日志入口。 |
| 结构化评估闭环底座 | 基本完成 | `d5d53a1` | 已定义 `Finding`、`Evidence`、`ReviewResult`，渗透中心可生成结构化发现和审核官复核结果。 |
| 报告体系标准化 | 基本完成 | `876f741` | 已支持五类报告模板、自动推荐、手动选择和标准化报告详情展示。 |
| 整改中心 | 基本完成 | `a20109b` | 已新增整改中心和整改详情，支持状态更新、责任人、期限、复测记录和报告关联。 |
| 治理审计增强 | 基本完成 | `dc65c3c` | 已补充审计事件、数据来源提示和高风险操作记录。 |
| 集成验收与持久化准备 | 已完成 | `8fcd489` | 已形成集成验收清单和持久化准备计划。 |
| 治理与整改后端桥接 | 已完成 | `1711df4` | 审计事件和整改任务已接入后端优先、本地兜底模式。 |
| 渗透报告后端桥接 | 已完成 | `9b2c556` | 渗透报告归档、查询和详情已接入后端优先、本地兜底模式。 |
| 账号认证后端桥接 | 已完成 | `d49efd4` | 用户列表、新增用户、禁用用户和本地账号兜底已接入。 |
| 模型供应商后端桥接 | 已完成 | `b82459a` | 模型供应商新增、更新、停用已接入后端，API Key 以后端加密方式保存。 |
| Alembic 数据库迁移体系 | 进行中 | 未提交 | 已新增 Alembic 配置、迁移环境、初始核心表迁移脚本，已补齐 PoC 自动化字段，并将生产环境启动策略调整为显式迁移。 |
| 初始化数据与环境隔离 | 进行中 | 未提交 | 已新增初始化数据环境开关，默认管理员和内置检查模板可按环境显式控制，开发接口初始化被限制在开发环境。 |
| 接口级 RBAC 权限拦截 | 部分完成 | 未提交 | 已新增统一权限依赖，评估、检查模板、用户、报告、模型供应商、治理接口已接入角色校验；后端角色矩阵验收测试已补。 |
| 评估任务数据隔离 | 部分完成 | 未提交 | 评估列表、详情、结果更新和删除已按任务负责人进行隔离，已补超级管理员全量访问和工程师越权拦截验收。 |
| PoC 自动化执行底座 | 部分完成 | 未提交 | 已新增 PoC 执行服务、Celery 任务入口、任务状态查询、结果回填、置信度计算、报告证据引用、轻量运行隔离、失败诊断、前端执行入口、本地 Ollama 模型调用验收，以及 `poc_code` 和 `last_poc_output` 字段。 |

当前整体判断：

- 原始四个里程碑已经形成可演示、可验收的产品闭环。
- Sprint 5 的集成验收与后端持久化准备已完成。
- Sprint 6 已完成治理、报告、账号认证和模型供应商四条后端桥接。
- Sprint 7 已进入生产化底座阶段，迁移、初始化、RBAC 和数据隔离都有实现；后端权限矩阵已补验收测试，仍需前端菜单权限和高风险操作确认。
- Sprint 8 自动化执行闭环验收已完成当前范围，PoC 沙箱、异步任务入口、任务状态查询、执行结果回填、置信度计算、报告证据引用、轻量运行隔离、失败诊断、前端执行入口、本地 Ollama 模型调用、报告导出鉴权修复、报告归属隔离、整改闭环 API 回归、工作台浏览器 E2E 和报告转整改 E2E 均已完成；后续进入更多检查项 PoC 扩展和持续验收集成。
- Sprint 9 已启动 PoC 覆盖扩展，当前已为直接越狱、角色扮演绕过、编码绕过和有害内容生成 4 个大模型检查项配置可执行 PoC，已同步到当前开发库内置模板，并新增目录级安全校验测试。
- Sprint 9.2 已继续扩展 Agent/Web PoC，当前已为 Agent 危险工具调用、Agent 环境变量泄露、Web HTTPS 入口和 HTTP 安全响应头 4 个检查项配置只读 PoC，并同步到当前开发库。
- Sprint 9.3 已继续扩展 Web/API 只读 PoC，当前已为 API 认证有效性、响应数据过度暴露、敏感文件暴露和错误信息泄露 4 个检查项配置只读 PoC，并同步到当前开发库。
- Sprint 9.4 已完成 PoC 失败诊断增强，当前可区分目标不可达、认证失败、目标不存在、判定失败、脚本异常、超时和策略拦截，前端与报告沿用诊断码和诊断说明展示。
- Sprint 9.5 已新增本地一键验收入口，当前可通过 `scripts/validate-local.sh` 顺序执行后端验收测试、前端类型检查和浏览器端冒烟 E2E；后续需要接入 CI 发布流水线。
- Sprint 9.6 已继续扩展 API/Web 只读 PoC，新增 CSRF Cookie 属性、废弃 API 版本暴露、JWT alg=none 拒绝检查 3 项，当前 Sprint 9 总覆盖达到 15 个检查项。
- 当前仍不是完整生产级系统，关键业务仍保留本地兜底和部分演示数据。

未完成事项：

| 缺口 | 优先级 | 当前状态 | 说明 |
| --- | --- | --- | --- |
| 生产级数据库迁移 | P0 | 进行中 | 已建立 Alembic 基础和初始迁移，下一步需要补初始化数据、环境隔离和回滚演练。 |
| 迁移脚本与模型一致性 | P0 | 待持续验证 | `poc_code`、`last_poc_output` 已补入初始迁移，后续需要把 `alembic check` 纳入验收并增加 PostgreSQL 环境验证。 |
| 接口级 RBAC 权限验收 | P0 | 部分完成 | 后端角色矩阵和评估任务归属隔离已通过 API 验收测试；仍需前端菜单一致性和高风险操作二次确认。 |
| 后端作为唯一主数据源 | P0 | 进行中 | 多数模块已后端优先、本地兜底，下一步应逐步移除关键业务的纯本地演示数据。 |
| 自动化验收套件 | P1 | 当前范围完成 | 已新增后端 RBAC API、PoC 结果回填、模型名注入、报告导出鉴权、报告归属隔离和整改闭环回归测试，以及前端类型构建、本地 Ollama 浏览器验收、工作台冒烟 E2E、报告转整改 E2E 和本地一键验收入口。 |
| 自动化执行闭环 | P1 | 当前范围完成 | PoC 沙箱、Celery 入口、任务状态查询、结果回填、置信度计算、报告证据引用、轻量运行隔离、失败诊断、前端执行入口、本地 Ollama 模型调用、报告导出鉴权修复、工作台 E2E、报告转整改 E2E 和本地一键验收入口已完成；当前已有 15 个检查项配置 PoC，后续补 GraphQL、Webhook、对象级越权等需要更明确目标接口契约的探针。 |
| 检查项 PoC 覆盖率 | P1 | 进行中 | 已覆盖 LLM: A-01/A-02/A-06/B-01，Agent: F-01/G-08，Web: H-02/H-08/I-01/I-04/I-05/I-07/J-02/J-04/J-08；失败诊断已细分，本地验收入口已建立，下一步补需要目标接口契约的 API 深度探针。 |
| 模型供应商连通性测试 | P1 | 部分完成 | 前端有测试入口，后端已有存储基础，还需要真实连通性检测、Ollama 模型枚举和错误诊断。 |

迁移一致性检查结果：

- 已补齐业务字段：`check_items.poc_code`、`check_results.last_poc_output`。
- SQLite 环境仍可能报告 UUID 类型比较噪声，后续应增加 PostgreSQL 环境迁移检查，区分真实字段缺口和方言差异。
- 后续每次模型变更都应执行 `alembic check`，并将结果写入验收清单。

环境策略：

| 环境 | 建表策略 | 初始化策略 | 数据定位 |
| --- | --- | --- | --- |
| development | 允许启动时自动建表 | 可通过 `SEED_ON_STARTUP=true` 自动初始化 | 本地开发数据，可重建 |
| staging | 必须执行 Alembic 迁移 | 发布流程显式初始化 | 验收数据，保留回归样本 |
| production | 必须执行 Alembic 迁移 | 禁止启动时自动初始化 | 生产真实数据，所有初始化需审批 |

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

### 阶段 5：自动化执行与验收

周期：2-3 周

目标：

- PoC 脚本安全执行
- 异步任务队列
- 执行状态追踪
- 自动结果回填
- 置信度计算
- 端到端验收自动化

交付物：

- PoC 执行服务
- Celery/Redis 任务配置
- 任务状态查询接口
- 执行结果写回检查结果
- 自动化验收套件

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

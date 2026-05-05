/**
 * 检查工作台 — 重构版
 * 接入后端真实 API，完成 Phase 2 集成
 */
import { useState, useMemo, useEffect } from 'react'
import {
  Button, Tag, Radio, Input, Upload, Typography,
  Progress, Badge, Divider, Space, message,
  Tooltip, Empty, Spin, Alert
} from 'antd'
import {
  CheckCircleOutlined, CloseCircleOutlined, MinusCircleOutlined,
  QuestionCircleOutlined, ThunderboltOutlined, UploadOutlined,
  ArrowLeftOutlined, PlayCircleOutlined, InfoCircleOutlined,
  CopyOutlined, LinkOutlined, ToolOutlined, OrderedListOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import styles from './EvaluationWorkbench.module.css'
import type { CheckResultStatus } from '@/types'
import { evaluationApi, type CheckResult, type PocTaskStatus } from '@/api/evaluation'
import { checklistApi } from '@/api/checklist'
import { TOOL_REGISTRY as ALL_TOOLS } from './workbench-data'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const STATUS_CONFIG: Record<CheckResultStatus, { icon: React.ReactNode; label: string; color: string }> = {
  pass: { icon: <CheckCircleOutlined />, label: '通过', color: '#22c55e' },
  fail: { icon: <CloseCircleOutlined />, label: '失败', color: '#ef4444' },
  partial: { icon: <MinusCircleOutlined />, label: '部分', color: '#f59e0b' },
  n_a: { icon: <QuestionCircleOutlined />, label: '不适用', color: '#94a3b8' },
  pending: { icon: <QuestionCircleOutlined />, label: '待检查', color: '#cbd5e1' },
}

const RISK_COLORS: Record<string, string> = { critical: '#ff3b5c', high: '#ff6b35', medium: '#ffa500', low: '#22c55e', info: '#64748b' }
const RISK_LABELS: Record<string, string> = { critical: '严重', high: '高危', medium: '中危', low: '低危', info: '信息' }
const TYPE_COLOR: Record<string, string> = { cli: '#2563eb', api: '#06b6d4', script: '#8b5cf6', manual: '#64748b' }
const TYPE_LABEL: Record<string, string> = { cli: 'CLI', api: 'API', script: '脚本', manual: '手动' }
const CONFIDENCE_LABELS: Record<string, string> = { high: '高可信', medium: '中可信', low: '低可信', unknown: '未评估' }
const CONFIDENCE_COLORS: Record<string, string> = { high: 'green', medium: 'orange', low: 'red', unknown: 'default' }

function parseEvidenceJson(evidence?: string) {
  if (!evidence) return {}
  try {
    const parsed = JSON.parse(evidence)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
  } catch {
    return { raw: evidence }
  }
}

// ===== 工具卡片 =====

function parseManualMethod(text: string) {
  if (!text) return { prep: '', steps: [], criteria: '' }
  const stepsMatch = text.match(/【执行步骤】([\s\S]*?)(?=【|$)/);
  const criteriaMatch = text.match(/【结果判定标准】([\s\S]*?)(?=【|$)/);
  const prepMatch = text.match(/【测试准备】([\s\S]*?)(?=【|$)/);

  let steps = [];
  if (stepsMatch && stepsMatch[1]) {
    steps = stepsMatch[1].trim().split('\n').filter((s: string) => s.trim().length > 0);
  } else {
    steps = [text];
  }
  
  return {
    prep: prepMatch ? prepMatch[1].trim() : '',
    steps,
    criteria: criteriaMatch ? criteriaMatch[1].trim() : ''
  }
}

function ToolCard({ toolId, checkMethod, onRun }: { toolId: string; checkMethod?: string; onRun: () => void }) {
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  const toggleStep = (idx: number) => {
    setCheckedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const manualContent = useMemo(() => {
    if (toolId === 'manual') {
      return parseManualMethod(checkMethod || '');
    }
    return { prep: '', steps: [], criteria: '' };
  }, [toolId, checkMethod]);

  if (toolId === 'manual') {
    const { prep, steps, criteria } = manualContent;
    
    return (
      <div className={styles.toolCard} style={{ gridColumn: '1 / -1', background: '#ffffff' }}>
        <div className={styles.toolCardHeader}>
          <Tag color="#64748b" style={{ borderRadius: 100, fontSize: 11, marginRight: 0 }}>
            手动
          </Tag>
          <Text style={{ color: '#0f172a', fontWeight: 600, fontSize: 13 }}>手工安全测试指引</Text>
        </div>

        {prep && (
          <div style={{ marginTop: 12 }}>
            <Text style={{ color: '#4b5563', fontWeight: 600, fontSize: 12 }}>【测试准备】</Text>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4, whiteSpace: 'pre-wrap', lineHeight: 1.6, padding: '12px', background: '#f8fafc', borderRadius: 6, border: '1px solid rgba(0,0,0,0.04)' }}>
              {prep}
            </div>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <Text style={{ color: '#4b5563', fontWeight: 600, fontSize: 12, marginBottom: 8, display: 'block' }}>【执行步骤】（点击步骤以标记完成）</Text>
          <div className={styles.manualStepList}>
            {steps.map((step: string, idx: number) => {
              const isChecked = !!checkedSteps[idx];
              return (
                <div 
                  key={idx} 
                  className={`${styles.manualStepItem} ${isChecked ? styles.completed : ''}`}
                  onClick={() => toggleStep(idx)}
                >
                  <div className={styles.manualStepIcon}>
                    {isChecked ? <CheckCircleOutlined style={{ color: '#22c55e' }} /> : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #cbd5e1', marginTop: 4 }} />}
                  </div>
                  <div className={`${styles.manualStepContent} ${isChecked ? styles.completedText : ''}`}>
                    {step}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {criteria && (
          <div style={{ marginTop: 16 }}>
            <Text style={{ color: '#4b5563', fontWeight: 600, fontSize: 12 }}>【结果判定标准】</Text>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4, whiteSpace: 'pre-wrap', lineHeight: 1.6, padding: '12px', background: '#f8fafc', borderRadius: 6, border: '1px solid rgba(0,0,0,0.04)' }}>
              {criteria}
            </div>
          </div>
        )}
        
        {!prep && !criteria && steps.length === 1 && (
          <div style={{ color: '#6b7280', fontSize: 13, marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.6, padding: '12px', background: '#f8fafc', borderRadius: 6, border: '1px solid rgba(0,0,0,0.04)' }}>
            {steps[0] || '由于环境复杂性，此项需由安全工程师根据目标架构实施手工验证及证据留存。'}
          </div>
        )}
      </div>
    )
  }

  const tool = ALL_TOOLS[toolId]

  
  const copyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd)
    message.success('命令已复制')
  }

  if (!tool) {
    return (
      <div className={styles.toolCard}>
        <Text style={{ color: '#6b7280' }}>未知工具 ID: {toolId}</Text>
      </div>
    )
  }

  return (
    <div className={styles.toolCard}>
      <div className={styles.toolCardHeader}>
        <Tag
          color={TYPE_COLOR[tool.type] || '#2563eb'}
          style={{ borderRadius: 100, fontSize: 11, marginRight: 0 }}
        >
          {TYPE_LABEL[tool.type] || '未知'}
        </Tag>
        <Text style={{ color: '#0f172a', fontWeight: 600, fontSize: 13 }}>{tool.name}</Text>
        {tool.docsUrl && (
          <Tooltip title="查看文档">
            <a href={tool.docsUrl} target="_blank" rel="noreferrer">
              <LinkOutlined style={{ color: '#2563eb', fontSize: 13 }} />
            </a>
          </Tooltip>
        )}
      </div>
      <Text style={{ color: '#6b7280', fontSize: 12 }}>{tool.description}</Text>
      {tool.installCmd && (
        <div className={styles.codeRow}>
          <span style={{ color: '#64748b', fontSize: 11, marginRight: 6 }}>安装：</span>
          <code className={styles.inlineCode}>{tool.installCmd}</code>
          <CopyOutlined
            className={styles.copyBtn}
            onClick={() => copyCmd(tool.installCmd!)}
          />
        </div>
      )}
      {tool.command && (
        <div className={styles.codeRow}>
          <span style={{ color: '#64748b', fontSize: 11, marginRight: 6 }}>命令：</span>
          <code className={styles.inlineCode}>{tool.command}</code>
          <CopyOutlined
            className={styles.copyBtn}
            onClick={() => copyCmd(tool.command!)}
          />
        </div>
      )}
      {tool.type !== 'manual' && (
        <Button
          size="small"
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={onRun}
          style={{ background: '#2563eb', marginTop: 8 }}
        >
          在终端运行
        </Button>
      )}
    </div>
  )
}

export default function EvaluationWorkbench() {
  const navigate = useNavigate()
  const { id: sessionId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [activeItemId, setActiveItemId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'info' | 'terminal' | 'report'>('info')
  const [terminalOutput, setTerminalOutput] = useState<string>('')
  const [pocTask, setPocTask] = useState<PocTaskStatus | null>(null)
  const [pocTaskId, setPocTaskId] = useState<string>('')
  
  // 乐观 UI 状态：用于解决点击响应迟钝问题
  const [localStatus, setLocalStatus] = useState<string | undefined>(undefined)

  // 1. 获取会话及结果数据
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => evaluationApi.getSession(sessionId!),
    enabled: !!sessionId,
  })

  // 2. 获取模板数据
  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ['template', session?.template_id],
    queryFn: () => checklistApi.getTemplate(session!.template_id),
    enabled: !!session?.template_id,
  })

  // 展开所有 Item 方便查找
  const allItems = useMemo(() => {
    if (!template) return []
    return template.categories.flatMap((c) => c.items || [])
  }, [template])

  // 初始化时选择第一项 (移入 useEffect 修复渲染副作用)
  useEffect(() => {
    if (!activeItemId && allItems.length > 0) {
      setActiveItemId(allItems[0].id)
    }
  }, [activeItemId, allItems])

  const activeItem = useMemo(() => {
    if (!activeItemId || !allItems.length) return null
    return allItems.find((i) => String(i.id) === String(activeItemId))
  }, [activeItemId, allItems])

  const activeResult = useMemo(() => {
    if (!activeItemId || !session?.results) return null
    return session.results.find(r => String(r.check_item_id) === String(activeItemId))
  }, [activeItemId, session?.results])

  // 当切换检查项时，同步本地状态
  useEffect(() => {
    if (activeResult) {
      setLocalStatus(activeResult.status)
    } else {
      setLocalStatus('pending')
    }
    setPocTask(null)
    setPocTaskId('')
  }, [activeItemId, activeResult?.status])

  const pocStatusQuery = useQuery({
    queryKey: ['poc-task', sessionId, activeItemId, pocTaskId],
    queryFn: () => evaluationApi.getPocTaskStatus(sessionId!, activeItemId, pocTaskId),
    enabled: !!sessionId && !!activeItemId && !!pocTaskId,
    refetchInterval: (query) => {
      const state = query.state.data?.task_state
      return state === 'PENDING' || state === 'STARTED' || state === 'RETRY' ? 1500 : false
    },
  })

  useEffect(() => {
    if (!pocStatusQuery.data) return
    setPocTask(pocStatusQuery.data)
    if (['SUCCESS', 'FAILURE', 'REVOKED'].includes(pocStatusQuery.data.task_state)) {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
    }
  }, [pocStatusQuery.data, queryClient, sessionId])

  const [ws, setWs] = useState<WebSocket | null>(null)

  const runPocMutation = useMutation({
    mutationFn: () => evaluationApi.runPoc(sessionId!, activeItemId),
    onMutate: () => {
      setActiveTab('report')
      setPocTask(null)
      setPocTaskId('')
    },
    onSuccess: (response) => {
      message.success(response.message)
      if (response.task_id) {
        setPocTaskId(response.task_id)
      }
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
    },
    onError: () => {
      message.error('PoC 任务提交失败，请检查后端服务状态')
    },
  })

  const handleExportReport = async () => {
    if (!sessionId) return
    const reportWindow = window.open('', '_blank', 'noopener,noreferrer')
    try {
      const reportBlob = await evaluationApi.exportReportHtml(sessionId)
      const reportUrl = URL.createObjectURL(reportBlob)
      if (reportWindow) {
        reportWindow.location.href = reportUrl
      } else {
        window.location.href = reportUrl
      }
      window.setTimeout(() => URL.revokeObjectURL(reportUrl), 60_000)
    } catch {
      reportWindow?.close()
      message.error('报告导出失败，请确认当前账号有报告查看权限')
    }
  }

  // 真实 WebSocket 终端执行
  const handleRunTool = (toolId: string) => {
    if (!session) return

    const activeSession = session
    setActiveTab('terminal')
    setTerminalOutput(`> 准备启动工具: ${toolId} ...\n`)
    
    if (ws) {
      ws.close()
    }

    setTerminalOutput(prev => prev + `> [系统] 正在建立与评估引擎的实时连接...\n`)

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/v1/runner/ws`
    const socket = new WebSocket(wsUrl)
    
    const currentItemId = activeItemId;

    // 连接超时处理
    const timeout = setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        setTerminalOutput(prev => prev + `> [错误] 连接评估引擎超时，请检查网络或后端状态。\n`)
        socket.close()
      }
    }, 5000)

    socket.onopen = () => {
      clearTimeout(timeout)
      setTerminalOutput(prev => prev + `> [系统] 连接成功！下发评估指令...\n`)
      // 从 target_description 中提取模型名称（格式: [model:xxx]）
      const modelMatch = activeSession.target_description?.match(/\[model:([^\]]+)\]/)
      const modelName = modelMatch ? modelMatch[1] : undefined

      socket.send(JSON.stringify({ 
        action: "run", 
        tool_id: toolId,
        check_item_id: activeItemId,
        item_name: activeItem?.name,
        target: activeSession.target_url || "localhost",
        model_name: modelName,
      }))
    }

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === "stdout" || msg.type === "system") {
          setTerminalOutput(prev => prev + `${msg.data}\n`)
        } else if (msg.type === "auto_result") {
          setTerminalOutput(prev => prev + `\n>> [系统] 报告解析完成，自动判定漏洞状态: [${msg.status.toUpperCase()}]\n`)
          
          // 核心逻辑：自动更新结果到数据库，并切换到结果页
          evaluationApi.updateResult(sessionId!, currentItemId, {
            status: msg.status,
            raw_output: msg.raw_output
          }).then(() => {
            queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
            message.success(`实战评估完成！自动判定结论：${msg.status.toUpperCase()}`)
            // 自动切到结果判读页，让用户直接看到证据
            setTimeout(() => setActiveTab('report'), 500); 
          })
        } else if (msg.type === "exit") {
          setTerminalOutput(prev => prev + `>> [系统] 进程已退出，返回码: ${msg.code}\n`)
          message.success(`${toolId} 执行结束`)
          socket.close()
        } else if (msg.type === "error") {
          setTerminalOutput(prev => prev + `>> [错误] ${msg.data}\n`)
          socket.close()
        }
      } catch (e) {
        setTerminalOutput(prev => prev + `${event.data}\n`)
      }
    }

    socket.onerror = () => {
      setTerminalOutput(prev => prev + `>> [系统] 终端连接发生错误。\n`)
    }

    socket.onclose = () => {
      setTerminalOutput(prev => prev + `>> [系统] 连接已断开。\n`)
      setWs(null)
    }

    setWs(socket)
  }

  // 保存检查结果
  const updateMutation = useMutation({
    mutationFn: (data: Partial<CheckResult>) => evaluationApi.updateResult(sessionId!, activeItemId, data),
    onSuccess: () => {
      message.success('结果已保存')
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
    },
    onError: () => {
      message.error('保存失败，请重试')
    }
  })

  // 进度统计
  const totalItems = allItems.length
  const completedItems = session?.results?.filter(r => r.status !== 'pending').length || 0
  const progressPercent = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100)
  const activeEvidence = useMemo(() => parseEvidenceJson(activeResult?.evidence), [activeResult?.evidence])
  const confidenceLevel = activeResult?.confidence_level || 'unknown'
  const confidenceScore = activeResult?.confidence_score ?? 0
  const diagnosisCode = String(pocTask?.diagnosis_code || activeEvidence.diagnosisCode || '未记录')
  const diagnosisMessage = String(pocTask?.diagnosis_message || activeEvidence.diagnosisMessage || '暂无诊断信息')
  const hasBackendPoc = Boolean(activeItem?.poc_code)
  const isPocRunning = runPocMutation.isPending || ['PENDING', 'STARTED', 'RETRY'].includes(pocTask?.task_state || '')

  // ===== Hooks 必须放在所有早期 return 之前 =====
  const hasAutoTools = useMemo(() => {
    if (!activeItem) return false;
    let tids: string[] = [];
    if (activeItem.tool_ids) {
      try { tids = JSON.parse(activeItem.tool_ids); } catch(e) {}
    }
    // 自动追加 AI 评估工具
    if (session?.target_type === 'llm' || session?.target_type === 'agent') {
      return true; 
    }
    const autoTools = tids.map(tid => ALL_TOOLS[tid]).filter(t => t && t.id !== 'manual');
    return autoTools.length > 0;
  }, [activeItem, session?.target_type]);

  useEffect(() => {
    if (activeTab === 'terminal' && !hasAutoTools) {
      setActiveTab('info');
    }
  }, [activeItemId, hasAutoTools, activeTab]);

  // ===== Loading 早期返回 =====
  if (sessionLoading || templateLoading) {
    return <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" /></div>
  }
  if (!session || !template) {
    return <Empty description="未能加载评估数据" />
  }

  return (
    <div className={styles.workbench} data-testid="evaluation-workbench">
      {/* 顶部栏 */}
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            style={{ color: '#6b7280' }}
            onClick={() => navigate('/evaluations')}
          />
          <div>
            <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
              {session.name}
            </Title>
            <Text style={{ color: '#6b7280', fontSize: 12 }}>
              目标类型: {session.target_type} | 模板: {template.name}
            </Text>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* 实时评分展示 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Progress
              type="circle"
              percent={session.score || 0}
              size={48}
              strokeWidth={10}
              strokeColor={{
                '0%': '#ef4444',
                '50%': '#f59e0b',
                '100%': '#22c55e',
              }}
              format={(p) => <span style={{ color: '#0f172a', fontSize: 12, fontWeight: 'bold' }}>{p}</span>}
              trailColor="rgba(255,255,255,0.1)"
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text style={{ color: '#0f172a', fontSize: 12, fontWeight: 'bold' }}>评估得分</Text>
              <Text style={{ color: '#6b7280', fontSize: 11 }}>基于权重自动计算</Text>
            </div>
          </div>

          <Divider type="vertical" style={{ height: 40, borderColor: 'rgba(0,0,0,0.1)' }} />

          <div style={{ width: 160 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: '#6b7280', fontSize: 12 }}>总体进度</Text>
              <Text style={{ color: '#0f172a', fontSize: 12 }}>{completedItems} / {totalItems}</Text>
            </div>
            <Progress percent={progressPercent} strokeColor="#5b6ef5" trailColor="rgba(255,255,255,0.1)" size="small" />
          </div>
          <Button 
            type="primary" 
            style={{ background: '#22c55e' }} 
            onClick={handleExportReport}
            data-testid="export-report-button"
          >
            导出评估报告
          </Button>
          <div style={{ position: 'absolute', top: 4, right: 20, fontSize: 10, color: 'rgba(0,0,0,0.2)' }}>
            Debug: ID={activeItemId?.substring(0,6)} | Total={allItems.length} | Found={activeItem ? 'Y' : 'N'}
          </div>
        </div>
      </div>

      <div className={styles.main}>
        {/* 左侧：分类与检查项目录 */}
        <div className={styles.sidebar}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <Input.Search placeholder="搜索编号或名称..." style={{ background: 'transparent' }} />
          </div>
          <div className={styles.catalog}>
            {template.categories.map((category) => (
              <div key={category.id} className={styles.category}>
                <div className={styles.catTitle}>
                  {category.code} - {category.name}
                  <Badge
                    count={category.items.length}
                    style={{ backgroundColor: 'rgba(0,0,0,0.1)', color: '#6b7280', boxShadow: 'none' }}
                  />
                </div>
                <div className={styles.itemList}>
                  {category.items.map((item) => {
                    const res = session.results?.find(r => r.check_item_id === item.id)
                    const status = res?.status || 'pending'
                    const conf = STATUS_CONFIG[status as CheckResultStatus] || STATUS_CONFIG['pending']
                    return (
                      <div
                        key={item.id}
                        className={`${styles.itemBtn} ${activeItemId === item.id ? styles.itemBtnActive : ''}`}
                        onClick={() => setActiveItemId(item.id)}
                      >
                        <span style={{ color: conf.color, fontSize: 14 }}>{conf.icon}</span>
                        <div className={styles.itemMeta}>
                          <Text style={{ color: activeItemId === item.id ? '#2563eb' : '#0f172a', fontSize: 13 }} ellipsis>
                            {item.code} {item.name}
                          </Text>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧：检查项工作区 */}
        <div className={styles.workspace}>
          {activeItem && activeResult ? (
            <>
              {/* 工作区标题 */}
              <div className={styles.wsHeader}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Space size="middle" align="center">
                      <Tag color="#1e2235" style={{ color: '#6b7280', border: '1px solid var(--bg-border)' }}>
                        {activeItem.code}
                      </Tag>
                      <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
                        {activeItem.name}
                      </Title>
                      <Tag color={RISK_COLORS[activeItem.risk_level]} style={{ border: 'none' }}>
                        {RISK_LABELS[activeItem.risk_level]}风险
                      </Tag>
                    </Space>
                    <Paragraph style={{ color: '#6b7280', marginTop: 12, marginBottom: 0, maxWidth: 800 }}>
                      {activeItem.description}
                    </Paragraph>
                  </div>
                  <Space>
                    <Tooltip title={hasBackendPoc ? '执行后端登记的 PoC 脚本，并自动回填证据、置信度和诊断信息' : '该检查项未配置后端 PoC 脚本'}>
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        loading={isPocRunning}
                        disabled={!hasBackendPoc}
                        onClick={() => runPocMutation.mutate()}
                      >
                        运行自动化 PoC
                      </Button>
                    </Tooltip>
                  </Space>
                </div>
              </div>

              <div className={styles.wsBody}>
                {/* 选项卡 */}
                <div className={styles.tabs}>
                  <div
                    className={`${styles.tab} ${activeTab === 'info' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('info')}
                  >
                    <OrderedListOutlined /> 检查 SOP 指引
                  </div>
                  {hasAutoTools && (
                    <div
                      className={`${styles.tab} ${activeTab === 'terminal' ? styles.tabActive : ''}`}
                      onClick={() => setActiveTab('terminal')}
                    >
                      <ThunderboltOutlined /> 工具执行终端
                    </div>
                  )}
                  <div
                    className={`${styles.tab} ${activeTab === 'report' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('report')}
                    data-testid="result-tab"
                  >
                    <SafetyCertificateOutlined /> 结果判读与取证
                  </div>
                </div>

                {/* Tab 内容区 */}
                <div className={styles.tabContent}>
                  {/* Tab 1: SOP 指引 */}
                  {activeTab === 'info' && (
                    <div className={styles.sopArea}>
                      <div style={{ marginTop: 12 }}>
                                  {(() => {
                                    let tids: string[] = [];
                                    if (activeItem.tool_ids) {
                                      try { tids = JSON.parse(activeItem.tool_ids); } catch(e) {}
                                    }
                                    
                                    // 自动追加 AI 原生评估工具
                                    if (session.target_type === 'llm' || session.target_type === 'agent') {
                                      const aiTools = ['garak', 'promptfoo', 'pyrit'];
                                      aiTools.forEach(at => {
                                        if (!tids.includes(at)) tids.push(at);
                                      });
                                    }

                                    return tids.length > 0 ? (
                                      <div className={styles.toolsGrid}>
                                        {tids.map((tid: string) => (
                                          <ToolCard
                                            key={tid}
                                            toolId={tid}
                                            checkMethod={activeItem.check_method}
                                            onRun={() => handleRunTool(tid)}
                                          />
                                        ))}
                                      </div>
                                    ) : (
                                      <div style={{ padding: '40px 20px', background: '#f8fafc', borderRadius: 16, textAlign: 'center' }}>
                                        <ToolOutlined style={{ fontSize: 32, color: '#94a3b8', marginBottom: 16 }} />
                                        <Text style={{ display: 'block', color: '#64748b', fontSize: 15 }}>此项暂无推荐的自动化扫描工具，请参考步骤进行手动检查。</Text>
                                      </div>
                                    );
                                  })()}
                              </div>
                              
                              <Divider style={{ borderColor: '#e2e8f0', margin: '32px 0' }} />

                      <div style={{ display: 'flex', gap: 24 }}>
                        <div style={{ flex: 1, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', padding: 16, borderRadius: 8 }}>
                          <Text style={{ color: '#22c55e', fontWeight: 600, display: 'block', marginBottom: 8 }}>🎯 期望结果</Text>
                          <Text style={{ color: '#0f172a' }}>{activeItem.expected_result || '通过自动化测试并验证结果符合安全预期。'}</Text>
                        </div>
                        <div style={{ flex: 1, background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(91,110,245,0.2)', padding: 16, borderRadius: 8 }}>
                          <Text style={{ color: '#2563eb', fontWeight: 600, display: 'block', marginBottom: 8 }}>🛡️ 修复建议</Text>
                          <Text style={{ color: '#0f172a' }}>{activeItem.remediation || '暂无特定的修复建议。'}</Text>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: 终端 */}
                  {activeTab === 'terminal' && (
                    <div className={styles.terminalArea}>
                      <div className={styles.terminalHeader}>
                        <Space>
                          <span className={styles.dot} style={{ background: '#ef4444' }} />
                          <span className={styles.dot} style={{ background: '#f59e0b' }} />
                          <span className={styles.dot} style={{ background: '#22c55e' }} />
                        </Space>
                        <Text style={{ color: '#64748b', fontSize: 12 }}>Local Shell - AI 安全检测引擎</Text>
                      </div>
                      <div className={styles.terminalBody}>
                        {terminalOutput ? (
                          <pre style={{ margin: 0, color: '#22c55e', fontFamily: 'monospace' }}>{terminalOutput}</pre>
                        ) : (
                          <div style={{ color: '#64748b', textAlign: 'center', marginTop: 60 }}>
                            {(() => {
                              let tids: string[] = [];
                              if (activeItem.tool_ids) {
                                try { tids = JSON.parse(activeItem.tool_ids); } catch(e) {}
                              }
                              // 自动追加 AI 评估工具
                              if (session.target_type === 'llm' || session.target_type === 'agent') {
                                ['garak', 'promptfoo', 'pyrit'].forEach(at => {
                                  if (!tids.includes(at)) tids.push(at);
                                });
                              }
                              
                              const autoTools = tids.map(tid => ALL_TOOLS[tid]).filter(t => t && t.id !== 'manual');
                              
                              if (autoTools.length > 0) {
                                return (
                                  <>
                                    <ThunderboltOutlined style={{ fontSize: 32, marginBottom: 16, color: '#3b82f6', opacity: 0.8 }} />
                                    <p style={{ marginBottom: 24, fontSize: 16, color: '#334155' }}>检测到此项支持自动化扫描，请选择工具启动：</p>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', maxWidth: 600, margin: '0 auto' }}>
                                      {autoTools.map(tool => (
                                        <Button
                                          key={tool.id}
                                          type="primary"
                                          icon={<PlayCircleOutlined />}
                                          onClick={() => handleRunTool(tool.id)}
                                          style={{ background: '#2563eb' }}
                                        >
                                          启动 {tool.name}
                                        </Button>
                                      ))}
                                    </div>
                                  </>
                                );
                              } else {
                                return (
                                  <>
                                    <InfoCircleOutlined style={{ fontSize: 32, marginBottom: 16, opacity: 0.5 }} />
                                    <p style={{ fontSize: 16, color: '#475569' }}>此检查项目前为 [手动测试] 模式</p>
                                    <p style={{ maxWidth: 400, margin: '0 auto', color: '#94a3b8' }}>
                                      请参考左侧 [检查 SOP 指引] 完成人工验证，
                                      并在 [结果录入] 选项卡中提交您的发现。
                                    </p>
                                  </>
                                );
                              }
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab 3: 结果录入 */}
                  {activeTab === 'report' && (
                    <div className={styles.resultArea}>
                      <div className={styles.pocPanel} data-testid="poc-panel">
                        <div className={styles.pocPanelHeader}>
                          <div>
                            <Text strong>自动化 PoC 执行状态</Text>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                              后端执行结果会自动回填检查结论、证据、置信度和报告取证链。
                            </Text>
                          </div>
                          <Space>
                            <Tag color={CONFIDENCE_COLORS[confidenceLevel]}>
                              {CONFIDENCE_LABELS[confidenceLevel]} · {confidenceScore}%
                            </Tag>
                            <Button
                              type="primary"
                              icon={<PlayCircleOutlined />}
                              loading={isPocRunning}
                              disabled={!hasBackendPoc}
                              onClick={() => runPocMutation.mutate()}
                            >
                              运行 PoC
                            </Button>
                          </Space>
                        </div>

                        {!hasBackendPoc && (
                          <Alert
                            type="info"
                            showIcon
                            message="当前检查项未配置自动化 PoC"
                            description="可以先通过手动检查录入结论；后续在检查模板中为该检查项补充 poc_code 后即可启用自动化执行。"
                          />
                        )}

                        {(pocTask || activeResult.last_poc_output || activeResult.evidence) && (
                          <div className={styles.pocStatusGrid}>
                            <div>
                              <span>任务状态</span>
                              <strong>{pocTask?.task_state || '已回填'}</strong>
                            </div>
                            <div>
                              <span>退出码</span>
                              <strong>{pocTask?.exit_code ?? String(activeEvidence.exitCode ?? '未记录')}</strong>
                            </div>
                            <div>
                              <span>诊断码</span>
                              <strong>{diagnosisCode}</strong>
                            </div>
                            <div>
                              <span>诊断说明</span>
                              <strong>{diagnosisMessage}</strong>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={styles.statusBox}>
                        <Text style={{ color: '#6b7280', display: 'block', marginBottom: 16 }}>检查结论</Text>
                        <Radio.Group
                          value={localStatus || activeResult.status}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            setLocalStatus(newStatus); // 1. 立即更新本地 UI
                            updateMutation.mutate({ status: newStatus }); // 2. 同步后台
                          }}
                          className={styles.statusRadioGroup}
                        >
                          {(Object.keys(STATUS_CONFIG) as CheckResultStatus[]).map((status) => {
                            const conf = STATUS_CONFIG[status]
                            const isActive = activeResult.status === status;
                            return (
                              <Radio.Button
                                key={status}
                                value={status}
                                className={`${styles.statusRadioBtn} ${isActive ? styles.statusRadioBtnActive : ''}`}
                                style={isActive ? { color: conf.color, borderColor: conf.color, background: `${conf.color}15`, fontWeight: 600 } : {}}
                              >
                                {conf.icon} {conf.label}
                              </Radio.Button>
                            )
                          })}
                        </Radio.Group>
                      </div>

                      <div className={styles.formGrid}>
                        <div className={styles.formCol}>
                          <Text style={{ color: '#6b7280', display: 'block', marginBottom: 8 }}>工程师备注与分析</Text>
                          <TextArea
                            rows={6}
                            key={activeItemId} // 使用 key 强制重新渲染，防止 defaultValue 不更新
                            placeholder="描述发现的漏洞细节、复现步骤或判断依据..."
                            defaultValue={activeResult.notes || ''}
                            onBlur={(e) => {
                              if (e.target.value !== activeResult.notes) {
                                updateMutation.mutate({ notes: e.target.value });
                              }
                            }}
                            style={{ background: '#f1f5f9', borderColor: 'rgba(0,0,0,0.08)', color: '#0f172a' }}
                          />
                        </div>
                        <div className={styles.formCol}>
                          <Text style={{ color: '#6b7280', display: 'block', marginBottom: 8 }}>上传证据附件 (截图/日志)</Text>
                          <Upload.Dragger
                            name="file"
                            multiple
                            action="/api/v1/upload"
                            style={{ background: '#f8fafc', borderColor: 'rgba(0,0,0,0.08)' }}
                          >
                            <p className="ant-upload-drag-icon">
                              <UploadOutlined style={{ color: '#2563eb' }} />
                            </p>
                            <p className="ant-upload-text" style={{ color: '#0f172a' }}>点击或拖拽文件到此处</p>
                            <p className="ant-upload-hint" style={{ color: '#64748b' }}>
                              支持上传漏洞截图、Burp 抓包记录、原始代码文件
                            </p>
                          </Upload.Dragger>
                        </div>
                      </div>

                      {/* 新增：自动化实战取证日志 */}
                      {(activeResult.raw_output || activeResult.last_poc_output || terminalOutput) && (
                        <div style={{ marginTop: 24 }}>
                          <Text style={{ color: '#6b7280', display: 'block', marginBottom: 8 }}>🛡️ 自动化实战取证日志 (Evidence Logs)</Text>
                          <div style={{ 
                            background: '#0f172a', 
                            padding: '16px', 
                            borderRadius: '8px', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            maxHeight: '400px',
                            overflowY: 'auto'
                          }}>
                            <pre style={{ 
                              margin: 0, 
                              color: '#10b981', 
                              fontSize: '12px', 
                              fontFamily: '"Fira Code", monospace',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {activeResult.last_poc_output || activeResult.raw_output || terminalOutput}
                            </pre>
                          </div>
                          <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                            * 以上日志由评估引擎自动捕获，可作为漏洞定级与修复的原始凭证。
                          </Text>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b' }}>
              <Empty description="请在左侧选择一个检查项" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

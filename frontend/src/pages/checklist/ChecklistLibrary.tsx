/**
 * 检查模板库页面
 */
import { useState } from 'react'
import { Typography, Tag, Button, Row, Col, Spin, Empty, Drawer, List, Collapse, Badge, Modal, Form, Input, Select, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { checklistApi, type ChecklistTemplate } from '@/api/checklist'
import { getRecommendedReportTemplate } from '@/utils/reportTemplates'

const { Title, Text } = Typography

const TYPE_COLOR: Record<string, string> = { llm: 'var(--color-primary)', agent: '#8b5cf6', webapp: '#06b6d4' }
const TYPE_LABEL: Record<string, string> = { llm: 'AI 大模型', agent: 'AI Agent', webapp: 'Web 应用' }
const RISK_COLORS: Record<string, string> = { critical: '#ff3b5c', high: '#ff6b35', medium: '#ffa500', low: '#22c55e', info: '#64748b' }
const RISK_LABELS: Record<string, string> = { critical: '严重', high: '高危', medium: '中危', low: '低危', info: '信息' }

function getPocCoverage(template: ChecklistTemplate) {
  const items = template.categories.flatMap((cat) => cat.items)
  const automated = items.filter((item) => Boolean(item.poc_code))
  const total = items.length
  return {
    automated: automated.length,
    manual: total - automated.length,
    total,
    percent: total === 0 ? 0 : Math.round((automated.length / total) * 100),
  }
}

export default function ChecklistLibrary() {
  const [detailVisible, setDetailVisible] = useState(false)
  const [createVisible, setCreateVisible] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['checklists'],
    queryFn: checklistApi.getTemplates,
  })

  const createMutation = useMutation({
    mutationFn: checklistApi.createTemplate,
    onSuccess: () => {
      message.success('模板创建成功')
      setCreateVisible(false)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['checklists'] })
    },
    onError: () => {
      message.error('模板创建失败')
    }
  })

  const openDetail = (template: ChecklistTemplate) => {
    setSelectedTemplate(template)
    setDetailVisible(true)
  }

  const handleCreate = () => {
    form.validateFields().then(values => {
      createMutation.mutate(values)
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>检查模板库</Title>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>内置标准模板，支持自定义扩展</Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          style={{ background: 'var(--color-primary)' }}
          onClick={() => setCreateVisible(true)}
        >
          自定义模板
        </Button>
      </div>

      {/* 创建模板 Modal */}
      <Modal
        title="创建自定义检查模板"
        open={createVisible}
        onOk={handleCreate}
        onCancel={() => setCreateVisible(false)}
        confirmLoading={createMutation.isPending}
        styles={{
          mask: { backdropFilter: 'blur(4px)' },
          content: { background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.08)' },
          header: { background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.08)' }
        }}
      >
        <Form form={form} layout="vertical" initialValues={{ target_type: 'llm' }}>
          <Form.Item
            name="name"
            label={<Text style={{ color: 'var(--text-primary)' }}>模板名称</Text>}
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="如：金融大模型合规评估" style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
          </Form.Item>
          
          <Form.Item
            name="target_type"
            label={<Text style={{ color: 'var(--text-primary)' }}>评估对象</Text>}
            rules={[{ required: true }]}
          >
            <Select style={{ width: '100%' }}>
              <Select.Option value="llm">AI 大模型</Select.Option>
              <Select.Option value="agent">AI Agent</Select.Option>
              <Select.Option value="webapp">Web 应用</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label={<Text style={{ color: 'var(--text-primary)' }}>描述</Text>}
          >
            <Input.TextArea 
              placeholder="简要说明此模板的评估场景与目标" 
              rows={3}
              style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} 
            />
          </Form.Item>
        </Form>
      </Modal>
      
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <div style={{ color: '#ff4d4f', textAlign: 'center', padding: '50px 0' }}>
          <Text type="danger">获取模板数据失败，请检查后端服务是否启动</Text>
        </div>
      ) : !templates || templates.length === 0 ? (
        <Empty description="暂无模板数据，请先执行后端的 seed 脚本" />
      ) : (
        <Row gutter={[16, 16]}>
          {templates.map((t) => {
            const count = t.categories.reduce((acc, cat) => acc + cat.items.length, 0)
            const reportTemplate = getRecommendedReportTemplate(t.target_type)
            const coverage = getPocCoverage(t)
            return (
              <Col xs={24} md={12} lg={8} key={t.id}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Tag color={TYPE_COLOR[t.target_type]} style={{ borderRadius: 100 }}>{TYPE_LABEL[t.target_type]}</Tag>
                    {t.is_builtin && <Tag style={{ borderRadius: 100, background: 'rgba(255,255,255,0.06)', borderColor: 'transparent', color: 'var(--text-secondary)' }}>内置</Tag>}
                  </div>
                  <Title level={5} style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>{t.name}</Title>
                  <Text style={{ color: 'var(--text-secondary)', fontSize: 13, flex: 1 }}>{t.description}</Text>
                  <div style={{ marginTop: 14, padding: '10px 12px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <Text style={{ color: '#475569', fontSize: 12, display: 'block' }}>默认报告模板</Text>
                    <Text style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{reportTemplate.name}</Text>
                  </div>
                  <div style={{ marginTop: 10, padding: '10px 12px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ color: '#475569', fontSize: 12 }}>自动 PoC 覆盖</Text>
                      <Text style={{ color: '#0f172a', fontSize: 12, fontWeight: 700 }}>{coverage.percent}%</Text>
                    </div>
                    <div style={{ height: 6, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${coverage.percent}%`, height: '100%', background: '#2563eb' }} />
                    </div>
                    <Text style={{ color: '#64748b', fontSize: 12, display: 'block', marginTop: 8 }}>
                      {coverage.automated} 项自动 PoC · {coverage.manual} 项手工检查
                    </Text>
                  </div>
                  
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: 'var(--color-primary)', fontSize: 13 }}>{t.categories.length} 个分类 · {count} 个检查项</Text>
                    <Button type="link" style={{ color: 'var(--color-primary)', padding: 0 }} onClick={() => openDetail(t)}>查看详情 →</Button>
                  </div>
                </div>
              </Col>
            )
          })}
        </Row>
      )}

      {/* 侧边详情抽屉 */}
      <Drawer
        title={selectedTemplate?.name || '模板详情'}
        placement="right"
        width={600}
        onClose={() => setDetailVisible(false)}
        open={detailVisible}
        styles={{
          header: { background: 'var(--bg-card)', borderBottom: '1px solid rgba(255,255,255,0.08)' },
          body: { background: 'var(--bg-base)', padding: '24px' }
        }}
      >
        {selectedTemplate && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <Text style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 16 }}>{selectedTemplate.description}</Text>
              <div style={{ display: 'flex', gap: 12 }}>
                <Tag color={TYPE_COLOR[selectedTemplate.target_type]}>{TYPE_LABEL[selectedTemplate.target_type]}</Tag>
                {selectedTemplate.is_builtin && <Tag>内置系统级模板</Tag>}
              </div>
              {(() => {
                const coverage = getPocCoverage(selectedTemplate)
                return (
                  <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ color: '#475569', fontSize: 12 }}>自动 PoC 覆盖</Text>
                      <Tag color={coverage.percent >= 50 ? 'blue' : 'default'}>{coverage.automated}/{coverage.total}</Tag>
                    </div>
                    <div style={{ height: 8, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${coverage.percent}%`, height: '100%', background: '#2563eb' }} />
                    </div>
                    <Text style={{ color: '#64748b', display: 'block', marginTop: 8, fontSize: 13 }}>
                      已支持自动执行的检查项会在评估工作台显示“自动 PoC”，其余检查项仍按手工 SOP 录入。
                    </Text>
                  </div>
                )
              })()}
              <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: 12, display: 'block', marginBottom: 6 }}>推荐报告模板</Text>
                <Text style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                  {getRecommendedReportTemplate(selectedTemplate.target_type).name}
                </Text>
                <Text style={{ color: 'var(--text-secondary)', display: 'block', marginTop: 6, fontSize: 13 }}>
                  {getRecommendedReportTemplate(selectedTemplate.target_type).description}
                </Text>
              </div>
            </div>

            <Collapse
              defaultActiveKey={selectedTemplate.categories.map(c => c.id)}
              style={{ background: 'transparent', border: 'none' }}
              items={selectedTemplate.categories.map((cat) => ({
                key: cat.id,
                label: <Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{cat.code} - {cat.name}</Text>,
                style: { background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, marginBottom: 12, overflow: 'hidden' },
                children: (
                  <List
                    dataSource={cat.items}
                    renderItem={(item) => (
                      <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <List.Item.Meta
                          title={
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                              <Text style={{ color: 'var(--text-primary)' }}>{item.code} {item.name}</Text>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                {item.poc_code ? <Tag color="blue">自动 PoC</Tag> : <Tag>手工</Tag>}
                                <Badge color={RISK_COLORS[item.risk_level] || '#64748b'} text={<span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{RISK_LABELS[item.risk_level]}</span>} />
                              </div>
                            </div>
                          }
                          description={<Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{item.description}</Text>}
                        />
                      </List.Item>
                    )}
                  />
                )
              }))}
            />
          </div>
        )}
      </Drawer>
    </div>
  )
}

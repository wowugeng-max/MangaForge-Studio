import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Empty, Input, InputNumber, Modal, Progress, Radio, Select, Space, Tag, Typography, message } from 'antd'
import { PlusOutlined, DeleteOutlined, EyeOutlined, ToolOutlined } from '@ant-design/icons'
import apiClient from '../../api/client'

const { Paragraph, Text } = Typography
const defaultAvoid = ['人名', '专有设定', '原剧情顺序', '原文表达']
const requiredProfileCategories = [
  { value: 'reference_profile', label: '参考作品画像' },
  { value: 'chapter_beat_template', label: '章节节拍模板' },
  { value: 'character_function_matrix', label: '角色功能矩阵' },
  { value: 'style_profile', label: '文风画像' },
]
const useForOptions = [
  { value: '全部', label: '全部' },
  { value: '全案规划', label: '全案规划' },
  { value: '大纲生成', label: '大纲生成' },
  { value: '世界观设定', label: '世界观设定' },
  { value: '角色设定', label: '角色设定' },
  { value: '正文创作', label: '正文创作' },
  { value: '文风', label: '文风' },
  { value: '资源经济', label: '资源经济' },
  { value: '情绪节奏', label: '情绪节奏' },
]
const dimensionOptions = [
  { value: '结构', label: '结构' },
  { value: '节奏', label: '节奏' },
  { value: '文风', label: '文风' },
  { value: '角色功能', label: '角色功能' },
  { value: '资源经济', label: '资源经济' },
  { value: '世界观机制', label: '世界观机制' },
]
const taskOptions = [
  { value: '全案规划', label: '全案规划' },
  { value: '大纲生成', label: '大纲生成' },
  { value: '世界观设定', label: '世界观设定' },
  { value: '角色设定', label: '角色设定' },
  { value: '正文创作', label: '正文创作' },
]
const strengthOptions = [
  { value: 'light', label: '轻参考' },
  { value: 'balanced', label: '中参考' },
  { value: 'strong', label: '强参考' },
]
const strengthHelp: Record<string, string> = {
  light: '只参考文风机制、章节节奏和局部表达组织。',
  balanced: '参考结构、节奏、角色功能位、资源经济和文风机制。',
  strong: '参考全书公式、分卷推进、章节节拍、角色矩阵和资源经济模型。',
}

type ReferenceRow = {
  project_title: string
  weight: number
  use_for: string[]
  dimensions: string[]
  avoid: string[]
}

type KnowledgeProjectOption = {
  value: string
  label: string
  count: number
  profile_count: number
  profile_complete: boolean
  categories: Record<string, number>
}

const normalizeRows = (config: any): ReferenceRow[] => (
  Array.isArray(config?.references)
    ? config.references.map((item: any) => ({
      project_title: String(item?.project_title || '').trim(),
      weight: Math.max(0.1, Math.min(1, Number(item?.weight || 0.7) || 0.7)),
      use_for: Array.isArray(item?.use_for) ? item.use_for : [],
      dimensions: Array.isArray(item?.dimensions) ? item.dimensions : [],
      avoid: Array.isArray(item?.avoid) ? item.avoid : [],
    })).filter((item: ReferenceRow) => item.project_title)
    : []
)

const splitList = (value: string) => value.split(/[,，\n]/).map(item => item.trim()).filter(Boolean)
const uniqueList = (values: string[]) => Array.from(new Set(values.map(item => String(item).trim()).filter(Boolean)))

export function ReferenceConfigModal({
  open,
  projectId,
  config,
  onClose,
  onSaved,
}: {
  open: boolean
  projectId: number
  config: any
  onClose: () => void
  onSaved: (config: any) => void
}) {
  const [rows, setRows] = useState<ReferenceRow[]>([])
  const [strength, setStrength] = useState<'light' | 'balanced' | 'strong'>('balanced')
  const [notes, setNotes] = useState('')
  const [projectOptions, setProjectOptions] = useState<KnowledgeProjectOption[]>([])
  const [saving, setSaving] = useState(false)
  const [supplementingProject, setSupplementingProject] = useState('')
  const [previewTask, setPreviewTask] = useState('大纲生成')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [preview, setPreview] = useState<any | null>(null)

  useEffect(() => {
    if (!open) return
    setRows(normalizeRows(config))
    setStrength(config?.strength === 'light' || config?.strength === 'strong' ? config.strength : 'balanced')
    setNotes(String(config?.notes || ''))
    setPreview(null)
    apiClient.get('/knowledge')
      .then(res => {
        const projects = Array.isArray(res.data?.projects) ? res.data.projects : []
        setProjectOptions(projects.map((item: any) => ({
          value: String(item.title || ''),
          label: `${item.title || '未命名'} ${item.count ? `(${item.count}条)` : ''}${item.profile_count ? ` · 画像${item.profile_count}` : ''}`,
          count: Number(item.count || 0),
          profile_count: Number(item.profile_count || 0),
          profile_complete: Boolean(item.profile_complete),
          categories: item.categories && typeof item.categories === 'object' ? item.categories : {},
        })).filter((item: any) => item.value))
      })
      .catch(() => setProjectOptions([]))
  }, [open, config])

  const updateRow = (index: number, patch: Partial<ReferenceRow>) => {
    setRows(prev => prev.map((row, i) => i === index ? { ...row, ...patch } : row))
  }
  const getProjectOption = (title: string) => projectOptions.find(item => item.value === title)
  const getMissingProfileCategories = (title: string) => {
    const option = getProjectOption(title)
    if (!option) return requiredProfileCategories
    return requiredProfileCategories.filter(cat => !option.categories?.[cat.value])
  }
  const readiness = (() => {
    const selected = rows.map(row => row.project_title).filter(Boolean)
    const missing = selected.flatMap(title => getMissingProfileCategories(title).map(cat => `${title}:${cat.value}`))
    const total = selected.length * requiredProfileCategories.length
    const ready = Math.max(0, total - missing.length)
    return {
      total,
      ready,
      percent: total ? Math.round((ready / total) * 100) : 0,
      missingCount: missing.length,
    }
  })()
  const buildConfig = () => {
    const merged = new Map<string, ReferenceRow>()
    for (const row of rows) {
      const projectTitle = row.project_title.trim()
      if (!projectTitle) continue
      merged.set(projectTitle, {
        project_title: projectTitle,
        weight: Math.max(0.1, Math.min(1, Number(row.weight || 0.7) || 0.7)),
        use_for: uniqueList(row.use_for),
        dimensions: uniqueList(row.dimensions),
        avoid: uniqueList(row.avoid),
      })
    }
    return { references: Array.from(merged.values()), strength, notes }
  }

  const save = async () => {
    const nextConfig = buildConfig()
    setSaving(true)
    try {
      const res = await apiClient.put(`/novel/projects/${projectId}/reference-config`, nextConfig)
      message.success('参考作品配置已保存')
      onSaved(res.data || nextConfig)
      onClose()
    } catch {
      message.error('参考作品配置保存失败')
    } finally {
      setSaving(false)
    }
  }
  const loadPreview = async () => {
    setPreviewLoading(true)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/reference-preview`, {
        task_type: previewTask,
        reference_config: buildConfig(),
      })
      setPreview(res.data || null)
    } catch (error: any) {
      const text = String(error?.response?.data || error?.response?.data?.error || error?.message || '')
      if (error?.response?.status === 404 || text.includes('Cannot POST')) {
        message.error('当前后端未加载 reference-preview 路由，请重启 8787 后端服务后再试')
      } else {
        message.error('参考注入预览失败')
      }
    } finally {
      setPreviewLoading(false)
    }
  }
  const supplementProfiles = async (title: string) => {
    const missing = getMissingProfileCategories(title)
    if (!title || !missing.length) return
    setSupplementingProject(title)
    try {
      const res = await apiClient.post('/knowledge/projects/profile-supplement', {
        project_title: title,
        missing_categories: missing.map(item => item.value),
      })
      message.success(`已补提炼 ${res.data?.stored || 0} 条画像知识`)
      const refreshed = await apiClient.get('/knowledge')
      const projects = Array.isArray(refreshed.data?.projects) ? refreshed.data.projects : []
      setProjectOptions(projects.map((item: any) => ({
        value: String(item.title || ''),
        label: `${item.title || '未命名'} ${item.count ? `(${item.count}条)` : ''}${item.profile_count ? ` · 画像${item.profile_count}` : ''}`,
        count: Number(item.count || 0),
        profile_count: Number(item.profile_count || 0),
        profile_complete: Boolean(item.profile_complete),
        categories: item.categories && typeof item.categories === 'object' ? item.categories : {},
      })).filter((item: any) => item.value))
      setPreview(null)
    } catch (error: any) {
      message.error(error?.response?.data?.error || '画像补提炼失败')
    } finally {
      setSupplementingProject('')
    }
  }
  const openKnowledgeFeed = (title: string) => {
    const params = new URLSearchParams({ panel: 'knowledge', action: 'feed', project_title: title })
    window.location.href = `/novel?${params.toString()}`
  }

  return (
    <Modal
      open={open}
      title="参考作品配置"
      onCancel={onClose}
      onOk={save}
      okText="保存"
      confirmLoading={saving}
      width={920}
    >
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="指定当前项目生成时优先参考哪些投喂项目。参考用途留空或选择“全部”时会作用于所有生成阶段；否则只在匹配阶段注入。"
          description="系统只借鉴结构、节奏、功能位、资源经济和风格画像，不应照搬原角色名、专有设定、具体桥段顺序和原文表达。"
        />
        <Card size="small" style={{ borderRadius: 8, background: '#fafcff' }}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
              <Text strong>仿写准备度</Text>
              <Text type="secondary">{readiness.ready}/{readiness.total || 0} 项关键画像</Text>
            </Space>
            <Progress percent={readiness.percent} size="small" status={readiness.missingCount ? 'active' : 'success'} />
            <Space align="center" wrap>
              <Text strong>仿写强度</Text>
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                size="small"
                value={strength}
                options={strengthOptions}
                onChange={(event) => { setStrength(event.target.value); setPreview(null) }}
              />
              <Text type="secondary">{strengthHelp[strength]}</Text>
            </Space>
          </Space>
        </Card>
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          {rows.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未添加参考项目" />
          ) : rows.map((row, index) => (
            <Card
              key={`${row.project_title || 'row'}-${index}`}
              size="small"
              style={{ borderRadius: 8, background: '#fff' }}
              title={<Text strong>参考项目 {index + 1}</Text>}
              extra={<Button type="text" danger icon={<DeleteOutlined />} onClick={() => setRows(prev => prev.filter((_, i) => i !== index))} />}
            >
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Select
                    showSearch
                    allowClear
                    placeholder="选择投喂项目"
                    value={rows[index]?.project_title || undefined}
                    options={projectOptions}
                    onChange={(value) => updateRow(index, { project_title: value || '' })}
                    onSearch={(value) => updateRow(index, { project_title: value })}
                    style={{ width: '100%' }}
                  />
                  {rows[index]?.project_title && (() => {
                    const option = getProjectOption(rows[index].project_title)
                    const missing = getMissingProfileCategories(rows[index].project_title)
                    if (!option) return <Tag color="default" bordered={false}>未找到知识库项目</Tag>
                    if (option.profile_complete) return <Tag color="green" bordered={false}>画像完整 · {option.count} 条</Tag>
                    return (
                      <Space size={4} wrap>
                        <Tag color={option.profile_count > 0 ? 'gold' : 'red'} bordered={false}>
                          {option.profile_count > 0 ? `画像不足 · 缺 ${missing.length}` : '缺少仿写画像'}
                        </Tag>
                        <Button size="small" type="link" icon={<ToolOutlined />} loading={supplementingProject === rows[index].project_title} onClick={() => supplementProfiles(rows[index].project_title)}>
                          补提炼
                        </Button>
                        <Button size="small" type="link" onClick={() => openKnowledgeFeed(rows[index].project_title)}>去投喂</Button>
                      </Space>
                    )
                  })()}
                </Space>
                <Space wrap align="start" style={{ width: '100%' }}>
                  <Space direction="vertical" size={4}>
                    <Text type="secondary">权重</Text>
                    <InputNumber
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={rows[index]?.weight || 0.7}
                      onChange={(value) => updateRow(index, { weight: Number(value || 0.7) })}
                      style={{ width: 120 }}
                    />
                  </Space>
                  <Space direction="vertical" size={4} style={{ minWidth: 240, flex: 1 }}>
                    <Text type="secondary">生成阶段</Text>
                <Select
                  mode="tags"
                  allowClear
                  placeholder="留空 = 全部阶段"
                  value={rows[index]?.use_for || []}
                  options={useForOptions}
                  maxTagCount="responsive"
                  onChange={(value) => updateRow(index, { use_for: uniqueList(value) })}
                  style={{ width: '100%' }}
                />
                  </Space>
                  <Space direction="vertical" size={4} style={{ minWidth: 260, flex: 1 }}>
                    <Text type="secondary">参考维度</Text>
                    <Select
                      mode="multiple"
                      allowClear
                      placeholder="选择该项目主导的维度"
                      value={rows[index]?.dimensions || []}
                      options={dimensionOptions}
                      maxTagCount="responsive"
                      onChange={(value) => updateRow(index, { dimensions: uniqueList(value) })}
                      style={{ width: '100%' }}
                    />
                  </Space>
                </Space>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary">避免照搬</Text>
                <Input
                  placeholder="例如：人名, 专有设定, 原剧情顺序"
                  value={(rows[index]?.avoid || []).join(', ')}
                  onChange={(event) => updateRow(index, { avoid: splitList(event.target.value) })}
                />
                </Space>
              </Space>
            </Card>
          ))}
        </Space>
        <Button icon={<PlusOutlined />} onClick={() => setRows(prev => [...prev, { project_title: '', weight: 0.7, use_for: ['全部'], dimensions: ['结构', '节奏'], avoid: defaultAvoid }])}>
          添加参考项目
        </Button>
        <Input.TextArea
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="补充仿写策略，例如：主结构参考《没钱修什么仙》，但主角职业和世界观完全原创。"
        />
        <Card
          size="small"
          title="参考注入预览"
          style={{ borderRadius: 8 }}
          extra={
            <Space>
              <Select size="small" value={previewTask} options={taskOptions} onChange={(value) => { setPreviewTask(value); setPreview(null) }} style={{ width: 128 }} />
              <Button size="small" icon={<EyeOutlined />} loading={previewLoading} onClick={loadPreview}>预览</Button>
            </Space>
          }
        >
          {!preview ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择任务类型后点击预览，查看实际会注入哪些参考知识。" />
          ) : (
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color="purple" bordered={false}>{preview.strength_label || strengthOptions.find(item => item.value === strength)?.label}</Tag>
                <Tag color="blue" bordered={false}>命中 {Array.isArray(preview.entries) ? preview.entries.length : 0} 条</Tag>
                {(preview.active_references || []).map((item: any) => (
                  <Tag key={item.project_title} bordered={false}>{item.project_title} · {Math.round(Number(item.weight || 0.7) * 100)}%</Tag>
                ))}
              </Space>
              {(preview.warnings || []).map((warning: string) => (
                <Alert key={warning} type="warning" showIcon message={warning} />
              ))}
              {Array.isArray(preview.entries) && preview.entries.length > 0 ? (
                <Space direction="vertical" size={8} style={{ width: '100%', maxHeight: 280, overflow: 'auto' }}>
                  {preview.entries.map((entry: any, index: number) => (
                    <Card key={`${entry.id || entry.title}-${index}`} size="small" style={{ borderRadius: 8 }}>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Space wrap>
                          <Text strong>{entry.title || '未命名知识'}</Text>
                          <Tag color="geekblue" bordered={false}>{entry.category || '未分类'}</Tag>
                          {entry.source_project && <Tag bordered={false}>{entry.source_project}</Tag>}
                          {entry.reference_weight && <Tag color="purple" bordered={false}>权重 {Math.round(Number(entry.reference_weight) * 100)}%</Tag>}
                          {entry.rank_score && <Tag bordered={false}>排序 {Number(entry.rank_score).toFixed(1)}</Tag>}
                        </Space>
                        {entry.match_reason && <Text type="secondary" style={{ fontSize: 12 }}>{entry.match_reason}</Text>}
                        <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: '展开' }} style={{ marginBottom: 0 }}>
                          {entry.content || '-'}
                        </Paragraph>
                      </Space>
                    </Card>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">当前配置没有命中可注入知识。</Text>
              )}
            </Space>
          )}
        </Card>
      </Space>
    </Modal>
  )
}

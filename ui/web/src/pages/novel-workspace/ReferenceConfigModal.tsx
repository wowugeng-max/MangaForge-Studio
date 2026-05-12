import React, { useEffect, useState } from 'react'
import { Alert, Button, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import apiClient from '../../api/client'

const defaultAvoid = ['人名', '专有设定', '原剧情顺序', '原文表达']
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

type ReferenceRow = {
  project_title: string
  weight: number
  use_for: string[]
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
  const [notes, setNotes] = useState('')
  const [projectOptions, setProjectOptions] = useState<KnowledgeProjectOption[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setRows(normalizeRows(config))
    setNotes(String(config?.notes || ''))
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

  const save = async () => {
    const merged = new Map<string, ReferenceRow>()
    for (const row of rows) {
      const projectTitle = row.project_title.trim()
      if (!projectTitle) continue
      merged.set(projectTitle, {
        project_title: projectTitle,
        weight: Math.max(0.1, Math.min(1, Number(row.weight || 0.7) || 0.7)),
        use_for: uniqueList(row.use_for),
        avoid: uniqueList(row.avoid),
      })
    }
    const references = Array.from(merged.values())
    setSaving(true)
    try {
      const res = await apiClient.put(`/novel/projects/${projectId}/reference-config`, { references, notes })
      message.success('参考作品配置已保存')
      onSaved(res.data || { references, notes })
      onClose()
    } catch {
      message.error('参考作品配置保存失败')
    } finally {
      setSaving(false)
    }
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
        <Table
          rowKey={(_, index) => String(index)}
          pagination={false}
          size="small"
          dataSource={rows}
          scroll={{ x: 980 }}
          columns={[
            {
              title: '参考项目',
              dataIndex: 'project_title',
              width: 260,
              render: (_value, _row, index) => (
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
                    if (!option) return <Tag color="default" bordered={false}>未找到知识库项目</Tag>
                    if (option.profile_complete) return <Tag color="green" bordered={false}>画像完整 · {option.count} 条</Tag>
                    if (option.profile_count > 0) return <Tag color="gold" bordered={false}>画像不足 · {option.profile_count}/{option.count}</Tag>
                    return <Tag color="red" bordered={false}>缺少仿写画像</Tag>
                  })()}
                </Space>
              ),
            },
            {
              title: '权重',
              dataIndex: 'weight',
              width: 110,
              render: (_value, _row, index) => (
                <InputNumber
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={rows[index]?.weight || 0.7}
                  onChange={(value) => updateRow(index, { weight: Number(value || 0.7) })}
                  style={{ width: '100%' }}
                />
              ),
            },
            {
              title: '参考用途',
              dataIndex: 'use_for',
              width: 240,
              render: (_value, _row, index) => (
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
              ),
            },
            {
              title: '避免照搬',
              dataIndex: 'avoid',
              render: (_value, _row, index) => (
                <Input
                  placeholder="例如：人名, 专有设定, 原剧情顺序"
                  value={(rows[index]?.avoid || []).join(', ')}
                  onChange={(event) => updateRow(index, { avoid: splitList(event.target.value) })}
                />
              ),
            },
            {
              title: '',
              width: 52,
              render: (_value, _row, index) => (
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setRows(prev => prev.filter((_, i) => i !== index))} />
              ),
            },
          ]}
        />
        <Button icon={<PlusOutlined />} onClick={() => setRows(prev => [...prev, { project_title: '', weight: 0.7, use_for: ['全部'], avoid: defaultAvoid }])}>
          添加参考项目
        </Button>
        <Input.TextArea
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="补充仿写策略，例如：主结构参考《没钱修什么仙》，但主角职业和世界观完全原创。"
        />
      </Space>
    </Modal>
  )
}

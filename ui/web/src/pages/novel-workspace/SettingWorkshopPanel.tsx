import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Checkbox, Empty, Form, Input, List, message, Modal, Select, Space, Tabs, Tag, Typography } from 'antd'
import apiClient from '../../api/client'
import { displayValue } from './utils'

const { Text, Paragraph } = Typography

const settingTypes = [
  { value: 'character', label: '角色' },
  { value: 'realm', label: '境界' },
  { value: 'ability', label: '能力' },
  { value: 'item', label: '物品' },
  { value: 'boss', label: 'Boss' },
  { value: 'rule', label: '规则' },
  { value: 'faction', label: '势力' },
  { value: 'location', label: '地点' },
  { value: 'foreshadowing', label: '伏笔' },
  { value: 'timeline', label: '时间线' },
]

function parseJsonText(value: string, fallback: any) {
  const raw = String(value || '').trim()
  if (!raw) return fallback
  return JSON.parse(raw)
}

function prettyJson(value: any) {
  try {
    return JSON.stringify(value || {}, null, 2)
  } catch {
    return '{}'
  }
}

function typeLabel(type: string) {
  return settingTypes.find(item => item.value === type)?.label || type || '设定'
}

function usageFromMap(usageMap: Map<number, any>, setting: any) {
  return usageMap.get(Number(setting.id)) || {
    entity_id: setting.id,
    usage_type: 'allowed',
    required: false,
    allowed: true,
    forbidden: false,
    reveal_level: 'none',
    expected_state_change: {},
  }
}

export function SettingWorkshopPanel({
  projectId,
  activeChapter,
  selectedModelId,
}: {
  projectId: number
  activeChapter?: any | null
  selectedModelId?: number
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<any[]>([])
  const [usage, setUsage] = useState<any[]>([])
  const [activeType, setActiveType] = useState('character')
  const [editing, setEditing] = useState<any | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [settingsRes, usageRes] = await Promise.all([
        apiClient.get(`/novel/projects/${projectId}/settings`),
        activeChapter?.id
          ? apiClient.get(`/novel/chapters/${activeChapter.id}/settings-usage`, { params: { project_id: projectId } })
          : Promise.resolve({ data: { usage: [] } }),
      ])
      setSettings(Array.isArray(settingsRes.data?.items) ? settingsRes.data.items : [])
      setUsage(Array.isArray(usageRes.data?.usage) ? usageRes.data.usage : [])
    } catch {
      message.error('设定工坊加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [projectId, activeChapter?.id])

  const grouped = useMemo(() => settings.reduce((acc: Record<string, any[]>, item) => {
    const key = item.entity_type || 'rule'
    acc[key] = acc[key] || []
    acc[key].push(item)
    return acc
  }, {}), [settings])

  const usageMap = useMemo(() => new Map(usage.map(item => [Number(item.entity_id), item])), [usage])
  const currentTypeSettings = grouped[activeType] || []
  const requiredCount = usage.filter(item => item.required && !item.forbidden).length
  const forbiddenCount = usage.filter(item => item.forbidden).length

  const openEditor = (item?: any) => {
    setEditing(item || null)
    form.setFieldsValue({
      entity_type: item?.entity_type || activeType,
      name: item?.name || '',
      summary: item?.summary || '',
      status: item?.status || 'active',
      visibility: item?.visibility || 'public',
      first_chapter_no: item?.first_chapter_no || undefined,
      last_chapter_no: item?.last_chapter_no || undefined,
      constraints_json: prettyJson(item?.constraints_json),
      state_json: prettyJson(item?.state_json),
      payload_json: prettyJson(item?.payload_json),
    })
    setEditorOpen(true)
  }

  const submitSetting = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        project_id: projectId,
        ...values,
        constraints_json: parseJsonText(values.constraints_json, {}),
        state_json: parseJsonText(values.state_json, {}),
        payload_json: parseJsonText(values.payload_json, {}),
      }
      if (editing?.id) await apiClient.put(`/novel/settings/${editing.id}`, payload)
      else await apiClient.post(`/novel/projects/${projectId}/settings`, payload)
      message.success('设定已保存')
      setEditorOpen(false)
      await load()
    } catch (error: any) {
      if (error?.errorFields) return
      message.error('设定保存失败，请检查 JSON 字段')
    }
  }

  const deleteSetting = async (item: any) => {
    Modal.confirm({
      title: `删除设定：${item.name}`,
      content: '删除后会同步移除章节调用记录。',
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        await apiClient.delete(`/novel/settings/${item.id}`)
        message.success('设定已删除')
        await load()
      },
    })
  }

  const updateUsage = (setting: any, patch: any) => {
    const current = usageFromMap(usageMap, setting)
    const next = { ...current, ...patch, entity_id: setting.id }
    if (patch.usage_type === 'required') Object.assign(next, { required: true, allowed: true, forbidden: false })
    if (patch.usage_type === 'allowed') Object.assign(next, { required: false, allowed: true, forbidden: false })
    if (patch.usage_type === 'forbidden') Object.assign(next, { required: false, allowed: false, forbidden: true })
    setUsage(prev => {
      const rest = prev.filter(item => Number(item.entity_id) !== Number(setting.id))
      if (!next.required && next.allowed && !next.forbidden && next.reveal_level === 'none' && !Object.keys(next.expected_state_change || {}).length) return rest
      return [...rest, next]
    })
  }

  const saveUsage = async () => {
    if (!activeChapter?.id) return message.warning('请先选择章节')
    setSaving(true)
    try {
      await apiClient.put(`/novel/chapters/${activeChapter.id}/settings-usage`, { project_id: projectId, usage })
      message.success('本章设定调用已保存')
      await load()
    } catch {
      message.error('保存章节设定调用失败')
    } finally {
      setSaving(false)
    }
  }

  const incubateSettings = async (useModel: boolean) => {
    setSaving(true)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/settings/incubate-from-project`, {
        use_model: useModel,
        model_id: selectedModelId,
      })
      message.success(`已生成 ${res.data?.total || 0} 条设定`)
      await load()
    } catch {
      message.error('自动生成设定失败')
    } finally {
      setSaving(false)
    }
  }

  const suggestChapterUsage = async (useModel: boolean) => {
    if (!activeChapter?.id) return message.warning('请先选择章节')
    setSaving(true)
    try {
      const res = await apiClient.post(`/novel/chapters/${activeChapter.id}/settings-usage/suggest`, {
        project_id: projectId,
        model_id: selectedModelId,
        use_model: useModel,
        apply: true,
      })
      message.success(`已匹配 ${res.data?.total || 0} 条本章设定调用`)
      await load()
    } catch {
      message.error('本章设定自动匹配失败')
    } finally {
      setSaving(false)
    }
  }

  const runConsistencyCheck = async () => {
    if (!activeChapter?.id) return message.warning('请先选择章节')
    setSaving(true)
    try {
      const res = await apiClient.post(`/novel/chapters/${activeChapter.id}/settings-consistency-check`, {
        project_id: projectId,
        model_id: selectedModelId,
        apply_updates: true,
      })
      const report = res.data?.report || {}
      message.success(`设定一致性评分：${report.score ?? '-'}；回写 ${res.data?.applied_state_updates?.length || 0} 项`)
      await load()
    } catch {
      message.error('设定一致性检查失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Space direction="vertical" size={8} style={{ width: '100%', padding: 8 }}>
      <Alert
        type="info"
        showIcon
        message="设定工坊"
        description="把角色、境界、能力、物品、Boss、规则等精细设定结构化，再由本章调用面板决定生成时必须使用、允许使用或禁止揭露的内容。"
      />
      <Space wrap size={6}>
        <Button size="small" type="primary" onClick={() => openEditor()}>新增设定</Button>
        <Button size="small" onClick={() => incubateSettings(false)} loading={saving}>从项目资料补齐</Button>
        <Button size="small" onClick={() => incubateSettings(true)} loading={saving} disabled={!selectedModelId}>模型提炼设定</Button>
        <Button size="small" onClick={() => suggestChapterUsage(false)} loading={saving} disabled={!activeChapter?.id}>本章快速匹配</Button>
        <Button size="small" onClick={() => suggestChapterUsage(true)} loading={saving} disabled={!activeChapter?.id || !selectedModelId}>模型匹配本章</Button>
        <Button size="small" onClick={runConsistencyCheck} loading={saving} disabled={!activeChapter?.chapter_text}>检查本章</Button>
        <Button size="small" onClick={load} loading={loading}>刷新</Button>
      </Space>

      <Card size="small" title={activeChapter ? `本章设定调用：第${activeChapter.chapter_no}章` : '本章设定调用'}>
        <Space wrap size={6}>
          <Tag color="blue" bordered={false}>必用 {requiredCount}</Tag>
          <Tag color="red" bordered={false}>禁揭 {forbiddenCount}</Tag>
          <Tag bordered={false}>已配置 {usage.length}</Tag>
        </Space>
        <Button size="small" block style={{ marginTop: 8 }} type="primary" onClick={saveUsage} loading={saving} disabled={!activeChapter?.id}>保存本章调用</Button>
      </Card>

      <Tabs
        activeKey={activeType}
        onChange={setActiveType}
        size="small"
        items={settingTypes.map(item => ({
          key: item.value,
          label: `${item.label}${grouped[item.value]?.length ? ` ${grouped[item.value].length}` : ''}`,
          children: currentTypeSettings.length ? (
            <List
              size="small"
              dataSource={currentTypeSettings}
              renderItem={(setting: any) => {
                const current = usageFromMap(usageMap, setting)
                return (
                  <List.Item>
                    <Card size="small" style={{ width: '100%' }} title={<Space size={4}><Text strong>{setting.name}</Text><Tag bordered={false}>{typeLabel(setting.entity_type)}</Tag></Space>}
                      extra={<Space size={4}><Button size="small" type="link" onClick={() => openEditor(setting)}>编辑</Button><Button size="small" type="link" danger onClick={() => deleteSetting(setting)}>删除</Button></Space>}
                    >
                      <Paragraph style={{ marginBottom: 8, fontSize: 12 }} ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}>{setting.summary || '-'}</Paragraph>
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap size={6}>
                          <Select
                            size="small"
                            value={current.usage_type || 'allowed'}
                            style={{ width: 96 }}
                            options={[
                              { value: 'allowed', label: '允许' },
                              { value: 'required', label: '必用' },
                              { value: 'forbidden', label: '禁揭' },
                            ]}
                            onChange={value => updateUsage(setting, { usage_type: value })}
                          />
                          <Select
                            size="small"
                            value={current.reveal_level || 'none'}
                            style={{ width: 112 }}
                            options={[
                              { value: 'none', label: '不揭示' },
                              { value: 'hint', label: '只埋线索' },
                              { value: 'partial', label: '部分揭示' },
                              { value: 'full', label: '完整揭示' },
                            ]}
                            onChange={value => updateUsage(setting, { reveal_level: value })}
                          />
                          <Checkbox checked={Boolean(current.required)} onChange={e => updateUsage(setting, { required: e.target.checked, usage_type: e.target.checked ? 'required' : 'allowed' })}>必用</Checkbox>
                          <Checkbox checked={Boolean(current.forbidden)} onChange={e => updateUsage(setting, { forbidden: e.target.checked, usage_type: e.target.checked ? 'forbidden' : 'allowed' })}>禁揭</Checkbox>
                        </Space>
                        <Input.TextArea
                          size="small"
                          rows={2}
                          placeholder="本章预期状态变化，例如：断臂神纹首次灼痛；某物品转移给迟正"
                          value={displayValue(current.expected_state_change || '')}
                          onChange={e => updateUsage(setting, { expected_state_change: e.target.value ? { note: e.target.value } : {} })}
                        />
                        {(setting.constraints_json && Object.keys(setting.constraints_json).length > 0) && <Text type="secondary" style={{ fontSize: 12 }}>约束：{displayValue(setting.constraints_json).slice(0, 120)}</Text>}
                        {(setting.state_json && Object.keys(setting.state_json).length > 0) && <Text type="secondary" style={{ fontSize: 12 }}>状态：{displayValue(setting.state_json).slice(0, 120)}</Text>}
                      </Space>
                    </Card>
                  </List.Item>
                )
              }}
            />
          ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无设定" />,
        }))}
      />

      <Modal
        open={editorOpen}
        title={editing?.id ? '编辑设定' : '新增设定'}
        onCancel={() => setEditorOpen(false)}
        onOk={submitSetting}
        width={720}
        okText="保存"
      >
        <Form form={form} layout="vertical">
          <Space style={{ width: '100%' }} align="start">
            <Form.Item name="entity_type" label="类型" rules={[{ required: true }]} style={{ width: 150 }}>
              <Select options={settingTypes} />
            </Form.Item>
            <Form.Item name="name" label="名称" rules={[{ required: true }]} style={{ width: 260 }}>
              <Input />
            </Form.Item>
            <Form.Item name="visibility" label="可见性" style={{ width: 120 }}>
              <Select options={[{ value: 'public', label: '公开' }, { value: 'hidden', label: '隐藏' }, { value: 'spoiler', label: '剧透' }]} />
            </Form.Item>
          </Space>
          <Form.Item name="summary" label="摘要">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space style={{ width: '100%' }} align="start">
            <Form.Item name="first_chapter_no" label="首次章节" style={{ width: 130 }}>
              <Input type="number" />
            </Form.Item>
            <Form.Item name="last_chapter_no" label="末次章节" style={{ width: 130 }}>
              <Input type="number" />
            </Form.Item>
            <Form.Item name="status" label="状态" style={{ width: 130 }}>
              <Select options={[{ value: 'active', label: '启用' }, { value: 'retired', label: '已退场' }, { value: 'draft', label: '草稿' }]} />
            </Form.Item>
          </Space>
          <Form.Item name="constraints_json" label="约束 JSON">
            <Input.TextArea rows={5} />
          </Form.Item>
          <Form.Item name="state_json" label="当前状态 JSON">
            <Input.TextArea rows={5} />
          </Form.Item>
          <Form.Item name="payload_json" label="扩展资料 JSON">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

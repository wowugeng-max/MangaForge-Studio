import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Checkbox, Empty, Form, Input, InputNumber, List, message, Modal, Select, Space, Tabs, Tag, Typography } from 'antd'
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
  { value: 'mainline', label: '主线' },
  { value: 'subplot', label: '支线' },
  { value: 'character_arc', label: '角色线' },
  { value: 'relationship_arc', label: '感情线' },
  { value: 'faction_arc', label: '势力线' },
  { value: 'foreshadowing_arc', label: '伏笔线' },
]

function splitList(value: any) {
  if (Array.isArray(value)) return value.map(item => String(item)).map(item => item.trim()).filter(Boolean)
  return String(value || '').split(/[\n,，]/).map(item => item.trim()).filter(Boolean)
}

function parseLooseValue(value: any) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (raw === 'null') return null
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw)
  if (raw.startsWith('{') || raw.startsWith('[')) {
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }
  return raw
}

function objectToRows(value: any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value).map(([key, rowValue]) => ({
    key,
    value: rowValue && typeof rowValue === 'object' ? JSON.stringify(rowValue) : String(rowValue ?? ''),
  }))
}

function rowsToObject(rows: any[] = []) {
  return rows.reduce((acc: Record<string, any>, row) => {
    const key = String(row?.key || '').trim()
    if (!key) return acc
    acc[key] = parseLooseValue(row?.value)
    return acc
  }, {})
}

function typeLabel(type: string) {
  return settingTypes.find(item => item.value === type)?.label || type || '设定'
}

function parseReviewPayload(review: any) {
  if (!review?.payload) return {}
  if (typeof review.payload === 'object') return review.payload
  try {
    return JSON.parse(String(review.payload || '{}'))
  } catch {
    return {}
  }
}

function reviewChapterId(review: any) {
  const payload = parseReviewPayload(review)
  return Number(payload?.chapter_id || payload?.chapterId || payload?.chapter?.id || 0)
}

function discoveredAssetKey(item: any, index: number) {
  return `${item.entity_type || item.type || 'asset'}:${item.name || index}:${index}`
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
  const [discoveredAssets, setDiscoveredAssets] = useState<any[]>([])
  const [selectedDiscoveredAssetKeys, setSelectedDiscoveredAssetKeys] = useState<string[]>([])
  const [pendingStateUpdates, setPendingStateUpdates] = useState<any[]>([])
  const [selectedStateUpdateKeys, setSelectedStateUpdateKeys] = useState<string[]>([])
  const [activeType, setActiveType] = useState('character')
  const [editing, setEditing] = useState<any | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [settingsRes, usageRes, reviewsRes] = await Promise.all([
        apiClient.get(`/novel/projects/${projectId}/settings`),
        activeChapter?.id
          ? apiClient.get(`/novel/chapters/${activeChapter.id}/settings-usage`, { params: { project_id: projectId } })
          : Promise.resolve({ data: { usage: [] } }),
        apiClient.get(`/novel/projects/${projectId}/reviews`),
      ])
      setSettings(Array.isArray(settingsRes.data?.items) ? settingsRes.data.items : [])
      setUsage(Array.isArray(usageRes.data?.usage) ? usageRes.data.usage : [])
      const reviews = Array.isArray(reviewsRes.data) ? reviewsRes.data : []
      const latestAssetReview = reviews
        .filter((review: any) => review?.review_type === 'asset_intake' && (!activeChapter?.id || reviewChapterId(review) === Number(activeChapter.id)))
        .sort((a: any, b: any) => Date.parse(b.created_at || '') - Date.parse(a.created_at || ''))[0]
      const payload = parseReviewPayload(latestAssetReview)
      const appliedNames = new Set(Array.isArray(payload?.applied_asset_names) ? payload.applied_asset_names.map((item: any) => String(item || '').trim()) : [])
      const candidates = (Array.isArray(payload?.discovered_assets) ? payload.discovered_assets : [])
        .filter((item: any) => item?.name && !appliedNames.has(String(item.name || '').trim()))
        .map((item: any, index: number) => ({ ...item, _key: discoveredAssetKey(item, index) }))
      setDiscoveredAssets(candidates)
      setSelectedDiscoveredAssetKeys(candidates.map((item: any) => item._key))
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
  const stateUpdateKey = (item: any, index: number) => `${item.entity_id || item.name || 'setting'}-${index}`

  const openEditor = (item?: any) => {
    const payload = item?.payload_json || {}
    setEditing(item || null)
    form.setFieldsValue({
      entity_type: item?.entity_type || activeType,
      name: item?.name || '',
      summary: item?.summary || '',
      status: item?.status || 'active',
      visibility: item?.visibility || 'public',
      first_chapter_no: item?.first_chapter_no || undefined,
      last_chapter_no: item?.last_chapter_no || undefined,
      aliases: splitList(payload.aliases || payload.alias || []).join('\n'),
      constraint_rows: objectToRows(item?.constraints_json),
      state_rows: objectToRows(item?.state_json),
      attribute_rows: objectToRows(payload.attributes || payload.profile || {}),
      source_note: payload.source_note || payload.source || '',
    })
    setEditorOpen(true)
  }

  const submitSetting = async () => {
    try {
      const values = await form.validateFields()
      const existingPayload = editing?.payload_json && typeof editing.payload_json === 'object' && !Array.isArray(editing.payload_json)
        ? editing.payload_json
        : {}
      const payload = {
        project_id: projectId,
        entity_type: values.entity_type,
        name: values.name,
        summary: values.summary || '',
        status: values.status || 'active',
        visibility: values.visibility || 'public',
        first_chapter_no: values.first_chapter_no ?? null,
        last_chapter_no: values.last_chapter_no ?? null,
        constraints_json: rowsToObject(values.constraint_rows),
        state_json: rowsToObject(values.state_rows),
        payload_json: {
          ...existingPayload,
          aliases: splitList(values.aliases),
          attributes: rowsToObject(values.attribute_rows),
          source_note: values.source_note || '',
        },
      }
      if (editing?.id) await apiClient.put(`/novel/settings/${editing.id}`, payload)
      else await apiClient.post(`/novel/projects/${projectId}/settings`, payload)
      message.success('设定已保存')
      setEditorOpen(false)
      await load()
    } catch (error: any) {
      if (error?.errorFields) return
      message.error('设定保存失败，请检查表单内容')
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
    if (patch.usage_type === 'advance') Object.assign(next, { required: true, allowed: true, forbidden: false })
    if (patch.usage_type === 'plant') Object.assign(next, { required: true, allowed: true, forbidden: false, reveal_level: next.reveal_level === 'none' ? 'hint' : next.reveal_level })
    if (patch.usage_type === 'payoff') Object.assign(next, { required: true, allowed: true, forbidden: false, reveal_level: next.reveal_level === 'none' ? 'partial' : next.reveal_level })
    if (patch.usage_type === 'pause') Object.assign(next, { required: false, allowed: true, forbidden: false })
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

  const incubateStorylines = async (useModel: boolean) => {
    setSaving(true)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/storylines/incubate`, {
        use_model: useModel,
        model_id: selectedModelId,
      })
      message.success(`已生成 ${res.data?.total || 0} 条剧情线`)
      await load()
    } catch {
      message.error('剧情线孵化失败')
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

  const suggestStorylineUsage = async (useModel: boolean) => {
    if (!activeChapter?.id) return message.warning('请先选择章节')
    setSaving(true)
    try {
      const res = await apiClient.post(`/novel/chapters/${activeChapter.id}/storylines/suggest`, {
        project_id: projectId,
        model_id: selectedModelId,
        use_model: useModel,
        apply: true,
      })
      message.success(`已匹配 ${res.data?.total || 0} 条本章剧情线`)
      await load()
    } catch {
      message.error('本章剧情线自动匹配失败')
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
        apply_updates: false,
      })
      const report = res.data?.report || {}
      const pending = (Array.isArray(res.data?.pending_state_updates) ? res.data.pending_state_updates : [])
        .map((item: any, index: number) => ({ ...item, _key: stateUpdateKey(item, index) }))
      setPendingStateUpdates(pending)
      setSelectedStateUpdateKeys(pending.map((item: any) => item._key))
      message.success(`设定一致性评分：${report.score ?? '-'}；待确认 ${pending.length} 项状态变更`)
      await load()
    } catch {
      message.error('设定一致性检查失败')
    } finally {
      setSaving(false)
    }
  }

  const applySelectedStateUpdates = async () => {
    if (!activeChapter?.id) return message.warning('请先选择章节')
    const updates = pendingStateUpdates.filter(item => selectedStateUpdateKeys.includes(item._key))
    if (updates.length === 0) return message.warning('请先选择要应用的状态变更')
    setSaving(true)
    try {
      const res = await apiClient.post(`/novel/chapters/${activeChapter.id}/settings-state-updates/apply`, {
        project_id: projectId,
        updates,
      })
      const applied = res.data?.applied_state_updates || []
      message.success(`已应用 ${applied.length} 项设定状态变更`)
      setPendingStateUpdates(prev => prev.filter(item => !selectedStateUpdateKeys.includes(item._key)))
      setSelectedStateUpdateKeys([])
      await load()
    } catch {
      message.error('应用设定状态变更失败')
    } finally {
      setSaving(false)
    }
  }

  const applySelectedDiscoveredAssets = async () => {
    if (!activeChapter?.id) return message.warning('请先选择章节')
    const assets = discoveredAssets.filter(item => selectedDiscoveredAssetKeys.includes(item._key))
    if (assets.length === 0) return message.warning('请先选择要入库的新资产')
    setSaving(true)
    try {
      const res = await apiClient.post(`/novel/chapters/${activeChapter.id}/discovered-assets/apply`, {
        project_id: projectId,
        assets,
      })
      const total = Number(res.data?.created_settings?.length || 0)
      message.success(`已确认入库 ${total} 个新资产`)
      setDiscoveredAssets(prev => prev.filter(item => !selectedDiscoveredAssetKeys.includes(item._key)))
      setSelectedDiscoveredAssetKeys([])
      await load()
    } catch {
      message.error('新资产确认入库失败')
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
        <Button size="small" onClick={() => incubateStorylines(false)} loading={saving}>补齐剧情线</Button>
        <Button size="small" onClick={() => incubateStorylines(true)} loading={saving} disabled={!selectedModelId}>模型孵化剧情线</Button>
        <Button size="small" onClick={() => suggestChapterUsage(false)} loading={saving} disabled={!activeChapter?.id}>本章快速匹配</Button>
        <Button size="small" onClick={() => suggestChapterUsage(true)} loading={saving} disabled={!activeChapter?.id || !selectedModelId}>模型匹配本章</Button>
        <Button size="small" onClick={() => suggestStorylineUsage(false)} loading={saving} disabled={!activeChapter?.id}>匹配剧情线</Button>
        <Button size="small" onClick={() => suggestStorylineUsage(true)} loading={saving} disabled={!activeChapter?.id || !selectedModelId}>模型匹配剧情线</Button>
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

      {discoveredAssets.length > 0 && (
        <Card
          size="small"
          title={`新资产候选 ${discoveredAssets.length}`}
          extra={(
            <Space size={4}>
              <Button size="small" type="link" onClick={() => setSelectedDiscoveredAssetKeys(discoveredAssets.map(item => item._key))}>全选</Button>
              <Button size="small" type="link" onClick={() => setSelectedDiscoveredAssetKeys([])}>清空</Button>
            </Space>
          )}
        >
          <List
            size="small"
            dataSource={discoveredAssets}
            renderItem={(item: any) => (
              <List.Item>
                <Space align="start" style={{ width: '100%' }}>
                  <Checkbox
                    checked={selectedDiscoveredAssetKeys.includes(item._key)}
                    onChange={event => setSelectedDiscoveredAssetKeys(prev => event.target.checked ? [...prev, item._key] : prev.filter(key => key !== item._key))}
                  />
                  <Space direction="vertical" size={2} style={{ flex: 1 }}>
                    <Space size={4} wrap>
                      <Text strong>{item.name}</Text>
                      <Tag bordered={false}>{typeLabel(item.entity_type)}</Tag>
                      {item.first_chapter_no && <Tag color="blue" bordered={false}>第{item.first_chapter_no}章</Tag>}
                    </Space>
                    <Text style={{ fontSize: 12 }}>{item.summary || '暂无摘要'}</Text>
                    {item.evidence && <Text type="secondary" style={{ fontSize: 12 }}>证据：{displayValue(item.evidence).slice(0, 140)}</Text>}
                    {(item.constraints_json && Object.keys(item.constraints_json).length > 0) && <Text type="secondary" style={{ fontSize: 12 }}>约束：{displayValue(item.constraints_json).slice(0, 120)}</Text>}
                  </Space>
                </Space>
              </List.Item>
            )}
          />
          <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>已选择 {selectedDiscoveredAssetKeys.length} 项，确认后会写入角色卡或设定工坊</Text>
            <Space size={6}>
              <Button size="small" onClick={() => { setDiscoveredAssets([]); setSelectedDiscoveredAssetKeys([]) }}>暂不处理</Button>
              <Button size="small" type="primary" loading={saving} onClick={applySelectedDiscoveredAssets}>确认入库</Button>
            </Space>
          </Space>
        </Card>
      )}

      {pendingStateUpdates.length > 0 && (
        <Card
          size="small"
          title={`待确认状态变更 ${pendingStateUpdates.length}`}
          extra={(
            <Space size={4}>
              <Button size="small" type="link" onClick={() => setSelectedStateUpdateKeys(pendingStateUpdates.map(item => item._key))}>全选</Button>
              <Button size="small" type="link" onClick={() => setSelectedStateUpdateKeys([])}>清空</Button>
            </Space>
          )}
        >
          <List
            size="small"
            dataSource={pendingStateUpdates}
            renderItem={(item: any) => (
              <List.Item>
                <Space align="start" style={{ width: '100%' }}>
                  <Checkbox
                    checked={selectedStateUpdateKeys.includes(item._key)}
                    onChange={event => setSelectedStateUpdateKeys(prev => event.target.checked ? [...prev, item._key] : prev.filter(key => key !== item._key))}
                  />
                  <Space direction="vertical" size={2} style={{ flex: 1 }}>
                    <Space size={4} wrap>
                      <Text strong>{item.name}</Text>
                      <Tag bordered={false}>{typeLabel(item.entity_type)}</Tag>
                      <Tag color="blue" bordered={false}>第{item.chapter_no}章</Tag>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>当前：{displayValue(item.current_state || {}).slice(0, 120)}</Text>
                    <Text style={{ fontSize: 12 }}>变更：{displayValue(item.actual_state_change || {}).slice(0, 160)}</Text>
                    {item.reason && <Text type="secondary" style={{ fontSize: 12 }}>原因：{item.reason}</Text>}
                  </Space>
                </Space>
              </List.Item>
            )}
          />
          <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>已选择 {selectedStateUpdateKeys.length} 项</Text>
            <Space size={6}>
              <Button size="small" onClick={() => { setPendingStateUpdates([]); setSelectedStateUpdateKeys([]) }}>暂不处理</Button>
              <Button size="small" type="primary" loading={saving} onClick={applySelectedStateUpdates}>应用选中变更</Button>
            </Space>
          </Space>
        </Card>
      )}

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
                              { value: 'advance', label: '推进' },
                              { value: 'plant', label: '埋线' },
                              { value: 'payoff', label: '回收' },
                              { value: 'pause', label: '暂停' },
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
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="last_chapter_no" label="末次章节" style={{ width: 130 }}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="status" label="状态" style={{ width: 130 }}>
              <Select options={[{ value: 'active', label: '启用' }, { value: 'retired', label: '已退场' }, { value: 'draft', label: '草稿' }]} />
            </Form.Item>
          </Space>
          <Form.Item name="aliases" label="别名 / 提及词">
            <Input.TextArea rows={2} placeholder={'每行一个，例如：断臂少年\n黑桑县弃子'} />
          </Form.Item>
          <Form.Item label="关键属性">
            <Form.List name="attribute_rows">
              {(fields, { add, remove }) => (
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {fields.map(field => (
                    <Space key={field.key} align="start" style={{ width: '100%' }}>
                      <Form.Item {...field} name={[field.name, 'key']} style={{ width: 180, marginBottom: 0 }}>
                        <Input placeholder="属性名，例如：身份" />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, 'value']} style={{ flex: 1, marginBottom: 0 }}>
                        <Input placeholder="属性值，例如：黑桑县药童" />
                      </Form.Item>
                      <Button size="small" danger onClick={() => remove(field.name)}>删除</Button>
                    </Space>
                  ))}
                  <Button size="small" onClick={() => add({ key: '', value: '' })}>添加属性</Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>
          <Form.Item label="硬性约束">
            <Form.List name="constraint_rows">
              {(fields, { add, remove }) => (
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {fields.map(field => (
                    <Space key={field.key} align="start" style={{ width: '100%' }}>
                      <Form.Item {...field} name={[field.name, 'key']} style={{ width: 180, marginBottom: 0 }}>
                        <Input placeholder="约束项，例如：knowledge_scope" />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, 'value']} style={{ flex: 1, marginBottom: 0 }}>
                        <Input.TextArea rows={1} autoSize={{ minRows: 1, maxRows: 3 }} placeholder="约束内容；数组/对象可粘贴 JSON" />
                      </Form.Item>
                      <Button size="small" danger onClick={() => remove(field.name)}>删除</Button>
                    </Space>
                  ))}
                  <Button size="small" onClick={() => add({ key: '', value: '' })}>添加约束</Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>
          <Form.Item label="当前状态">
            <Form.List name="state_rows">
              {(fields, { add, remove }) => (
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {fields.map(field => (
                    <Space key={field.key} align="start" style={{ width: '100%' }}>
                      <Form.Item {...field} name={[field.name, 'key']} style={{ width: 180, marginBottom: 0 }}>
                        <Input placeholder="状态项，例如：owner" />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, 'value']} style={{ flex: 1, marginBottom: 0 }}>
                        <Input.TextArea rows={1} autoSize={{ minRows: 1, maxRows: 3 }} placeholder="状态值，例如：迟正；数组/对象可粘贴 JSON" />
                      </Form.Item>
                      <Button size="small" danger onClick={() => remove(field.name)}>删除</Button>
                    </Space>
                  ))}
                  <Button size="small" onClick={() => add({ key: '', value: '' })}>添加状态</Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>
          <Form.Item name="source_note" label="来源备注">
            <Input.TextArea rows={2} placeholder="例如：来自第 12 章人工补充；从角色卡同步" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

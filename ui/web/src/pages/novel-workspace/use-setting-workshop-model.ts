import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, Checkbox, Empty, Form, Input, InputNumber, List, message, Modal, Segmented, Select, Space, Tabs, Tag, Typography } from 'antd'
import apiClient from '../../api/client'
import { displayValue } from './utils'
import {
  buildCompactSettingTags,
  buildUsageSummary,
  filterSettingsForUsage,
  normalizeUsageType,
  revealSegmentOptions,
  type SettingUsageFilter,
  usageFilterOptions,
  usageSegmentOptions,
} from './settingUsageWorkbenchModel'
import './SettingWorkshopPanel.css'

import {
  EMPTY_INITIAL_SETTINGS,
  discoveredAssetKey,
  objectToRows,
  parseReviewPayload,
  reviewChapterId,
  rowsToObject,
  settingTypes,
  splitList,
  typeLabel,
  usageFromMap,
  type SettingWorkshopActionKey,
} from './settingWorkshopHelpers'

const { Text, Paragraph } = Typography

// 'consistency_check' lost its panel button (and its SettingWorkshopActionKey member) but
// runConsistencyCheck is still exposed by this hook; widen the loading-key union locally so the
// constant passed to setActionLoadingKey stays type-consistent.
type SettingWorkshopLoadingKey = SettingWorkshopActionKey | 'consistency_check'

export function useSettingWorkshopModel({
  projectId,
  activeChapter,
  selectedModelId,
  initialSettings = EMPTY_INITIAL_SETTINGS,
  layout = 'compact',
  focusDiscoveredAssetsToken = 0,
  onAssetsApplied,
}: {
  projectId: number
  activeChapter?: any | null
  selectedModelId?: number
  initialSettings?: any[]
  layout?: 'compact' | 'workspace'
  focusDiscoveredAssetsToken?: number
  onAssetsApplied?: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [actionLoadingKey, setActionLoadingKey] = useState<SettingWorkshopLoadingKey | ''>('')
  const [settings, setSettings] = useState<any[]>(initialSettings)
  const [usage, setUsage] = useState<any[]>([])
  const [discoveredAssets, setDiscoveredAssets] = useState<any[]>([])
  const [selectedDiscoveredAssetKeys, setSelectedDiscoveredAssetKeys] = useState<string[]>([])
  const [assetDispositionDrafts, setAssetDispositionDrafts] = useState<Record<string, any>>({})
  const [pendingStateUpdates, setPendingStateUpdates] = useState<any[]>([])
  const [selectedStateUpdateKeys, setSelectedStateUpdateKeys] = useState<string[]>([])
  const [activeType, setActiveType] = useState('character')
  const [activeUsageFilter, setActiveUsageFilter] = useState<SettingUsageFilter>('configured')
  const [editing, setEditing] = useState<any | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [form] = Form.useForm()
  const discoveredAssetsRef = useRef<HTMLDivElement | null>(null)

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
      // Project-wide intake queue: aggregate all asset_intake reviews, not only latest chapter.
      const appliedNames = new Set<string>()
      for (const review of reviews.filter((item: any) => item?.review_type === 'asset_intake_apply')) {
        const appliedPayload = parseReviewPayload(review)
        for (const item of Array.isArray(appliedPayload?.created_settings) ? appliedPayload.created_settings : []) appliedNames.add(String(item?.payload_json?.original_name || item?.name || '').trim())
        for (const item of Array.isArray(appliedPayload?.created_characters) ? appliedPayload.created_characters : []) appliedNames.add(String(item?.name || '').trim())
        for (const item of Array.isArray(appliedPayload?.merged_assets) ? appliedPayload.merged_assets : []) appliedNames.add(String(item?.source_name || item?.name || '').trim())
        for (const item of Array.isArray(appliedPayload?.cameo_assets) ? appliedPayload.cameo_assets : []) appliedNames.add(String(item?.name || '').trim())
        for (const item of Array.isArray(appliedPayload?.skipped_existing) ? appliedPayload.skipped_existing : []) appliedNames.add(String(item?.name || '').trim())
        for (const name of Array.isArray(appliedPayload?.applied_asset_names) ? appliedPayload.applied_asset_names : []) appliedNames.add(String(name || '').trim())
      }
      const existingSettingNames = new Set((Array.isArray(settingsRes.data?.items) ? settingsRes.data.items : []).map((item: any) => `${item.entity_type}:${String(item?.name || '').trim()}`))
      const seenCandidate = new Set<string>()
      const candidates: any[] = []
      const intakeReviews = reviews
        .filter((review: any) => review?.review_type === 'asset_intake')
        .sort((a: any, b: any) => Date.parse(b.created_at || '') - Date.parse(a.created_at || ''))
      for (const review of intakeReviews) {
        const payload = parseReviewPayload(review)
        const chapterId = reviewChapterId(review)
        const list = Array.isArray(payload?.discovered_assets) ? payload.discovered_assets : []
        for (const [index, item] of list.entries()) {
          const name = String(item?.name || '').trim()
          const entityType = String(item?.entity_type || item?.type || 'item')
          if (!name || appliedNames.has(name)) continue
          const key = `${entityType}:${name}`
          if (seenCandidate.has(key) || existingSettingNames.has(key)) continue
          seenCandidate.add(key)
          candidates.push({
            ...item,
            entity_type: entityType,
            name,
            chapter_id: item?.chapter_id || chapterId || null,
            chapter_no: item?.chapter_no || item?.first_chapter_no || payload?.chapter_no || null,
            _key: discoveredAssetKey({ ...item, entity_type: entityType, name }, candidates.length + index),
          })
        }
      }
      setDiscoveredAssets(candidates)
      setSelectedDiscoveredAssetKeys(candidates.map((item: any) => item._key))
      setAssetDispositionDrafts(prev => candidates.reduce((acc: Record<string, any>, item: any) => {
        acc[item._key] = prev[item._key] || { disposition: 'confirm', target_name: item.name, merge_target_id: undefined }
        return acc
      }, {}))
    } catch {
      message.error('设定工坊加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [projectId, activeChapter?.id])

  useEffect(() => {
    setSettings(initialSettings)
  }, [projectId, initialSettings])

  const grouped = useMemo(() => settings.reduce((acc: Record<string, any[]>, item) => {
    const key = item.entity_type || 'rule'
    acc[key] = acc[key] || []
    acc[key].push(item)
    return acc
  }, {}), [settings])

  const usageMap = useMemo(() => new Map(usage.map(item => [Number(item.entity_id), item])), [usage])
  const usageSummary = useMemo(() => buildUsageSummary(usage), [usage])
  const activeUsageFilterLabel = usageFilterOptions.find(item => item.key === activeUsageFilter)?.label || '本章相关'
  const isActionBusy = Boolean(actionLoadingKey)
  const isActionLoading = (key: SettingWorkshopActionKey) => actionLoadingKey === key
  const commandClass = (key: SettingWorkshopActionKey, modelCall = false) => [
    'setting-workshop-command',
    'novel-btn-crystal',
    modelCall ? 'novel-btn-crystal-model setting-workshop-model-command' : 'novel-btn-crystal-local',
    isActionLoading(key) ? 'setting-workshop-running-command novel-btn-crystal-running' : '',
  ].filter(Boolean).join(' ')
  const disabledForAction = (key: SettingWorkshopActionKey, disabled = false) => disabled || (isActionBusy && !isActionLoading(key))

  useEffect(() => {
    if (!focusDiscoveredAssetsToken || discoveredAssets.length === 0) return
    discoveredAssetsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focusDiscoveredAssetsToken, discoveredAssets.length])
  const stateUpdateKey = (item: any, index: number) => `${item.entity_id || item.name || 'setting'}-${index}`
  const mergeTargetOptions = useMemo(() => settings.map(item => ({
    value: Number(item.id),
    label: `${typeLabel(item.entity_type)}｜${item.name}`,
  })), [settings])

  const updateAssetDispositionDraft = (key: string, patch: any) => {
    setAssetDispositionDrafts(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        ...patch,
      },
    }))
  }

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
    setActionLoadingKey('save_usage')
    try {
      await apiClient.put(`/novel/chapters/${activeChapter.id}/settings-usage`, { project_id: projectId, usage })
      message.success('本章设定调用已保存')
      await load()
    } catch {
      message.error('保存章节设定调用失败')
    } finally {
      setActionLoadingKey('')
    }
  }

  const incubateSettings = async (useModel: boolean) => {
    setActionLoadingKey(useModel ? 'incubate_settings_model' : 'incubate_settings')
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
      setActionLoadingKey('')
    }
  }

  const incubateStorylines = async (useModel: boolean) => {
    setActionLoadingKey(useModel ? 'incubate_storylines_model' : 'incubate_storylines')
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
      setActionLoadingKey('')
    }
  }

  const suggestChapterUsage = async (useModel: boolean) => {
    if (!activeChapter?.id) return message.warning('请先选择章节')
    setActionLoadingKey(useModel ? 'suggest_usage_model' : 'suggest_usage')
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
      setActionLoadingKey('')
    }
  }

  const suggestStorylineUsage = async (useModel: boolean) => {
    if (!activeChapter?.id) return message.warning('请先选择章节')
    setActionLoadingKey(useModel ? 'suggest_storyline_model' : 'suggest_storyline')
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
      setActionLoadingKey('')
    }
  }

  const runConsistencyCheck = async () => {
    if (!activeChapter?.id) return message.warning('请先选择章节')
    setActionLoadingKey('consistency_check')
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
      setActionLoadingKey('')
    }
  }

  const applySelectedStateUpdates = async () => {
    if (!activeChapter?.id) return message.warning('请先选择章节')
    const updates = pendingStateUpdates.filter(item => selectedStateUpdateKeys.includes(item._key))
    if (updates.length === 0) return message.warning('请先选择要应用的状态变更')
    setActionLoadingKey('apply_state_updates')
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
      setActionLoadingKey('')
    }
  }

  const applySelectedDiscoveredAssets = async () => {
    const assets = discoveredAssets
      .filter(item => selectedDiscoveredAssetKeys.includes(item._key))
      .map(item => {
        const draft = assetDispositionDrafts[item._key] || { disposition: 'confirm' }
        const mergeTarget = settings.find(setting => Number(setting.id) === Number(draft.merge_target_id))
        return {
          ...item,
          disposition: draft.disposition || 'confirm',
          target_name: draft.disposition === 'rename' ? draft.target_name : mergeTarget?.name,
          merge_target_id: draft.disposition === 'merge' ? draft.merge_target_id : undefined,
        }
      })
    if (assets.length === 0) return message.warning('请先选择要入库的新资产')
    setActionLoadingKey('apply_discovered_assets')
    try {
      const res = activeChapter?.id
        ? await apiClient.post(`/novel/chapters/${activeChapter.id}/discovered-assets/apply`, {
          project_id: projectId,
          assets,
        })
        : await apiClient.post(`/novel/projects/${projectId}/assets/intake-queue/apply`, { assets })
      const total = Number(res.data?.created_settings?.length || 0)
      const merged = Number(res.data?.merged_assets?.length || 0)
      const cameo = Number(res.data?.cameo_assets?.length || 0)
      message.success(`已入库 ${total} 个，合并 ${merged} 个，标记过场 ${cameo} 个`)
      setDiscoveredAssets(prev => prev.filter(item => !selectedDiscoveredAssetKeys.includes(item._key)))
      setSelectedDiscoveredAssetKeys([])
      setAssetDispositionDrafts(prev => Object.fromEntries(Object.entries(prev).filter(([key]) => !selectedDiscoveredAssetKeys.includes(key))))
      await load()
      onAssetsApplied?.()
    } catch {
      message.error('新资产候选处置失败')
    } finally {
      setActionLoadingKey('')
    }
  }


  return {
    activeType,
    activeUsageFilter,
    activeUsageFilterLabel,
    applySelectedDiscoveredAssets,
    applySelectedStateUpdates,
    assetDispositionDrafts,
    commandClass,
    deleteSetting,
    disabledForAction,
    discoveredAssets,
    discoveredAssetsRef,
    editing,
    editorOpen,
    form,
    grouped,
    incubateSettings,
    incubateStorylines,
    isActionBusy,
    isActionLoading,
    load,
    loading,
    mergeTargetOptions,
    openEditor,
    pendingStateUpdates,
    runConsistencyCheck,
    saveUsage,
    selectedDiscoveredAssetKeys,
    selectedStateUpdateKeys,
    setActiveType,
    setActiveUsageFilter,
    setAssetDispositionDrafts,
    setDiscoveredAssets,
    setEditorOpen,
    setPendingStateUpdates,
    setSelectedDiscoveredAssetKeys,
    setSelectedStateUpdateKeys,
    settings,
    submitSetting,
    suggestChapterUsage,
    suggestStorylineUsage,
    updateAssetDispositionDraft,
    updateUsage,
    usage,
    usageMap,
    usageSummary,
  }
}

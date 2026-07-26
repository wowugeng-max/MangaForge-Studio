import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { Position, type NodeProps, useReactFlow, useUpdateNodeInternals } from 'reactflow'
import { useParams } from 'react-router-dom'
import { Button, Checkbox, Input, InputNumber, Select, Space, Spin, Switch, Tag, Tooltip, Typography, message, Slider } from 'antd'
import { CloseOutlined, PlayCircleOutlined, SaveOutlined, StopOutlined, StarFilled } from '@ant-design/icons'
import apiClient from '../../api/client'
import { nodeRegistry } from '../../utils/nodeRegistry'
import { createSSEClient, type SSEClient, type SSEMessage } from '../../utils/sse'
import { useCanvasStore } from '../../stores/canvasStore'
import { useAssetLibraryStore } from '../../stores/assetLibraryStore'
import CameraControl, { buildCameraPromptSuffix } from '../CameraControl'
import CameraMovement from '../CameraMovement'
import { ASPECT_RATIOS as SHARED_ASPECT_RATIOS, getAspectRatioSize, type AspectRatioValue } from '../AspectRatioSelector'
import { BaseNode } from './BaseNode'
import { TypedHandle } from './TypedHandle'
import { expandFissionAndDistribute } from '../../pages/canvasFission'
import { pickMediaResultContent } from '../../utils/mediaResult'
import { buildAssetMediaUrl } from '../../utils/assetMedia'

import {
  DEFAULT_ROLE,
  GENERATE_NODE_ASPECT_RATIO_OPTIONS,
  GENERATE_NODE_ROUTING_STRATEGY_OPTIONS,
  MODES,
  PRESET_ROLES,
  buildGenerateNodeAssetPayload,
  buildGenerateNodeRequestPayload,
  buildGenerateNodeResultWithFission,
  getGenerateNodeAspectRatioSize,
  isGenerateNodeMuted,
  normalizeGenerateNodeImageUrl,
  resolveGenerateNodePreviewMediaSrc,
  resolveGenerateNodeSourceAssetIds,
  resolveGenerateNodeSourceContent,
} from './generate-node-model'
import type {
  GenerateNodeIncomingAsset,
} from './generate-node-model'

export {
  GENERATE_NODE_ASPECT_RATIO_OPTIONS,
  GENERATE_NODE_ROUTING_STRATEGY_OPTIONS,
  getGenerateNodeAspectRatioSize,
  normalizeGenerateNodeImageUrl,
  resolveGenerateNodePreviewMediaSrc,
  resolveGenerateNodeSourceContent,
  resolveGenerateNodeSourceAssetIds,
  isGenerateNodeMuted,
  buildGenerateNodeAssetPayload,
  normalizeGenerateNodeGenerationPacket,
  buildGenerateNodeResultWithFission,
  buildGenerateNodeRequestPayload,
} from './generate-node-model'
export type {
  GenerateNodeIncomingAsset,
} from './generate-node-model'

const { TextArea } = Input
const { Text } = Typography



function GenerateNodeImpl(props: NodeProps) {
  const { id, data } = props
  const { id: routeProjectId } = useParams<{ id: string }>()
  const updateNodeData = useCanvasStore(s => s.updateNodeData)
  const setNodeStatus = useCanvasStore(s => s.setNodeStatus)
  const isMuted = useCanvasStore(s => isGenerateNodeMuted(s.nodes as any, id))
  const { getEdges, getNodes } = useReactFlow()
  const updateNodeInternals = useUpdateNodeInternals()

  const assets = useAssetLibraryStore(s => s.assets)
  const fetchAssets = useAssetLibraryStore(s => s.fetchAssets)
  const [keys, setKeys] = useState<any[]>([])
  const [allModels, setAllModels] = useState<any[]>([])
  const [modelLoading, setModelLoading] = useState(false)
  const [mode, setMode] = useState(data?.mode || 'chat')
  const [prompt, setPrompt] = useState(data?.prompt || '')
  const [systemPrompt, setSystemPrompt] = useState(data?.systemPrompt || '')
  const [selectedKey, setSelectedKey] = useState<number | null>(Number(data?.api_key_id ?? data?.keyId) || null)
  const [selectedModel, setSelectedModel] = useState(data?.model_name || data?.model || '')
  const [params, setParams] = useState<Record<string, any>>(data?.params || {})
  const [routingStrategy, setRoutingStrategy] = useState(data?.routing_strategy || data?.routingStrategy || 'balanced')
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(Boolean(data?.showOnlyFavorites ?? true))
  const [aspectRatio, setAspectRatio] = useState<AspectRatioValue>((data?.aspectRatio ?? '16:9') as AspectRatioValue)
  const [customWidth, setCustomWidth] = useState<number>(data?.customWidth || 1920)
  const [customHeight, setCustomHeight] = useState<number>(data?.customHeight || 1080)
  const [useRoleAsset, setUseRoleAsset] = useState(Boolean(data?.useRoleAsset))
  const [roleAssetId, setRoleAssetId] = useState<number | null>(data?.roleAssetId || null)
  const [temperature, setTemperature] = useState<number>(data?.temperature ?? 0.7)
  const [showPreview, setShowPreview] = useState(Boolean(data?.showPreview ?? true))
  const [configOpen, setConfigOpen] = useState(false)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [progressMsg, setProgressMsg] = useState('')
  const [result, setResult] = useState<any>(data?.result || null)
  const [mediaDims, setMediaDims] = useState('')
  const sseClientRef = useRef<SSEClient | null>(null)
  const prevRunSignalRef = useRef(data?._runSignal)
  const nodeRef = useRef<HTMLDivElement>(null)

  // UI-only helper states for camera controls
  const [cameraOpen, setCameraOpen] = useState(false)
  const [movementOpen, setMovementOpen] = useState(false)
  const [cameraParams, setCameraParams] = useState<Record<string, string>>(data?.cameraParams || {})
  const [cameraCustomOptions, setCameraCustomOptions] = useState<Record<string, string[]>>(data?.cameraCustomOptions || {})
  const [customMovements, setCustomMovements] = useState<any[]>(data?.customMovements || [])

  const roleAssets = useMemo(() => assets.filter(a => a.type === 'prompt' && a.tags?.includes('SystemRole')), [assets])
  const selectedRolePrompt = useMemo(() => {
    if (useRoleAsset && roleAssetId) {
      const found = roleAssets.find(a => a.id === roleAssetId)
      return found?.data?.content || DEFAULT_ROLE.prompt
    }
    return systemPrompt || DEFAULT_ROLE.prompt
  }, [useRoleAsset, roleAssetId, roleAssets, systemPrompt])

  const ratioSize = getGenerateNodeAspectRatioSize(aspectRatio, customWidth, customHeight)
  const selectedKeyRecord = keys.find(key => Number(key.id) === Number(selectedKey))
  const selectedModelRecord = allModels.find(item => item.model_name === selectedModel)
  const projectId = Number(routeProjectId || 0) || null
  const visibleModels = allModels.filter(item => showOnlyFavorites ? item.is_favorite : true)
  const selectableModels = visibleModels.length > 0 ? visibleModels : allModels

  const modelSupportsMode = (item: any) => {
    const capabilities = item?.capabilities || {}
    if (capabilities[mode] === true) return true
    return !Object.keys(capabilities).length
  }

  useEffect(() => {
    updateNodeInternals(id)
  }, [id, mode, updateNodeInternals])

  useEffect(() => {
    updateNodeData(id, {
      mode,
      prompt,
      systemPrompt,
      model: selectedModel,
      model_name: selectedModel,
      api_key_id: selectedKey,
      keyId: selectedKey,
      params,
      routing_strategy: routingStrategy,
      showOnlyFavorites,
      aspectRatio,
      customWidth,
      customHeight,
      useRoleAsset,
      roleAssetId,
      temperature,
      showPreview,
      result,
      cameraParams,
      cameraCustomOptions,
      customMovements,
    })
  }, [id, mode, prompt, systemPrompt, selectedModel, selectedKey, params, routingStrategy, showOnlyFavorites, aspectRatio, customWidth, customHeight, useRoleAsset, roleAssetId, temperature, showPreview, result, cameraParams, cameraCustomOptions, customMovements, updateNodeData])

  useEffect(() => { setNodeStatus(id, generating ? 'running' : result ? 'success' : 'idle') }, [id, generating, result, setNodeStatus])

  useEffect(() => {
    apiClient.get('/keys/')
      .then(res => {
        const activeKeys = Array.isArray(res.data) ? res.data.filter((key: any) => key.is_active !== false) : []
        setKeys(activeKeys)
        setSelectedKey(current => current || (activeKeys[0]?.id ? Number(activeKeys[0].id) : null))
      })
      .catch(() => setKeys([]))
  }, [])

  useEffect(() => {
    if (!selectedKey) {
      setAllModels([])
      return
    }
    setModelLoading(true)
    apiClient.get(`/models/?key_id=${selectedKey}&mode=${mode}`)
      .then(res => {
        const models = Array.isArray(res.data) ? res.data.filter(modelSupportsMode) : []
        setAllModels(models)
        setSelectedModel(current => {
          if (current && models.some((item: any) => item.model_name === current)) return current
          const preferred = models.find((item: any) => item.is_favorite) || models[0]
          return preferred?.model_name || ''
        })
      })
      .catch(() => setAllModels([]))
      .finally(() => setModelLoading(false))
  }, [selectedKey, mode])

  useEffect(() => {
    const current = useCanvasStore.getState().nodes.find(n => n.id === id)?.data
    if (current?.result) setResult(current.result)
  }, [id])

  useEffect(() => { setMediaDims('') }, [result?.content])

  useEffect(() => () => {
    sseClientRef.current?.disconnect()
    sseClientRef.current = null
  }, [])

  const updatePanelPos = () => {
    if (!nodeRef.current) return
    const nodeRect = nodeRef.current.closest('.react-flow__node')?.getBoundingClientRect() || nodeRef.current.getBoundingClientRect()
    setPanelPos({ top: nodeRect.bottom + 8, left: nodeRect.left })
  }

  useEffect(() => {
    if (!configOpen || typeof document === 'undefined') return
    updatePanelPos()
    const canvas = document.querySelector('.react-flow__viewport')
    const observer = typeof MutationObserver !== 'undefined' ? new MutationObserver(updatePanelPos) : null
    if (canvas && observer) observer.observe(canvas, { attributes: true, attributeFilter: ['transform', 'style'] })
    window.addEventListener('resize', updatePanelPos)
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-config-panel]') && !target.closest('.react-flow__node')) setConfigOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updatePanelPos)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [configOpen])

  const resolveProvider = () => String(selectedKeyRecord?.provider || selectedKey || '')

  const buildPayload = () => {
    const edges = getEdges(); const nodes = getNodes(); const incomingEdges = edges.filter(e => e.target === id)
    let finalPromptText = prompt
    const incomingAssets: GenerateNodeIncomingAsset[] = []
    let externalSystemPrompt = ''
    incomingEdges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source)
      if (!sourceNode) return
      const sourceContent = resolveGenerateNodeSourceContent(sourceNode.data)
      const sourceAssetIds = resolveGenerateNodeSourceAssetIds(sourceNode.data)
      const sourceAssetId = sourceAssetIds[0]
      if (edge.targetHandle === 'text' && sourceContent) {
        incomingAssets.push({ id: sourceAssetId, type: 'prompt', content: String(sourceContent), source_asset_ids: sourceAssetIds })
      } else if (edge.targetHandle === 'image' && sourceContent) {
        const url = normalizeGenerateNodeImageUrl(String(sourceContent))
        incomingAssets.push({ id: sourceAssetId, type: 'image', file_path: url, url, source_asset_ids: sourceAssetIds })
      }
      else if (edge.targetHandle === 'system' && sourceContent) externalSystemPrompt = String(sourceContent)
    })

    const cameraSuffix = buildCameraPromptSuffix(cameraParams)
    return buildGenerateNodeRequestPayload({
      id,
      prompt: finalPromptText,
      selectedKey,
      provider: resolveProvider(),
      selectedModel,
      mode,
      routingStrategy,
      params,
      temperature,
      ratioSize,
      selectedRolePrompt,
      cameraSuffix,
      incomingAssets,
      externalSystemPrompt,
      systemPromptOverride: data?._systemPromptOverride,
    })
  }

  const hasImmediateGenerationResult = (packet: any) => (
    packet?.content != null ||
    packet?.result?.content != null ||
    packet?.data?.content != null ||
    packet?.data?.result?.content != null
  )

  const finishGeneration = (packet: any) => {
    const currentNodeData = useCanvasStore.getState().nodes.find(node => node.id === id)?.data || data
    const expectedCountRaw = currentNodeData?._fissionExpectedCount
    const expectedCount = Number.isFinite(Number(expectedCountRaw)) ? Number(expectedCountRaw) : null
    const finalResult = buildGenerateNodeResultWithFission({
      packet,
      fissionEnabled: Boolean(currentNodeData?._fissionEnabled),
      expectedCount,
      onCountMismatch: ({ expected, actual }) => message.warning(`裂变数量校验失败：期望 ${expected} 条，实际 ${actual} 条，已回退普通输出`),
    })

    setResult(finalResult)
    updateNodeData(id, { result: finalResult })
    setNodeStatus(id, 'success')
    setGenerating(false)
    setProgressMsg('')
    sseClientRef.current?.disconnect()
    sseClientRef.current = null
    message.success('🧠 AI 思考完成！')

    if (finalResult?._fission && Array.isArray(finalResult.items)) {
      const store = useCanvasStore.getState()
      if (!store.isGlobalRunning) {
        const outcome = expandFissionAndDistribute({ nodeId: id, items: finalResult.items, store: useCanvasStore })
        if (outcome.expanded) message.info(`裂变完成，已创建 ${finalResult.items.length} 个并行分支`, 3)
        else if (outcome.reason === 'no_downstream') message.warning('裂变结果已生成，但没有下游节点可展开')
      }
    } else {
      getEdges().filter(e => e.source === id).forEach(edge => {
        updateNodeData(edge.target, { incoming_data: finalResult })
      })
    }
  }

  const failGeneration = (errorText: string) => {
    message.error(`生成报错: ${errorText || '未知错误'}`)
    setNodeStatus(id, 'error')
    setGenerating(false)
    setProgressMsg('')
    sseClientRef.current?.disconnect()
    sseClientRef.current = null
  }

  const handleSSEMessage = (msg: SSEMessage) => {
    if (msg.type === 'status') {
      setProgressMsg(String(msg.message || msg.progress || '云端正在生成...'))
      return
    }
    if (msg.type === 'result') {
      finishGeneration(msg.data ?? msg.result ?? msg)
      return
    }
    if (msg.type === 'error') {
      failGeneration(String(msg.message || msg.error || '后台生成失败'))
      return
    }
    if (msg.type === 'interrupted') {
      failGeneration(String(msg.message || '任务已中断'))
    }
  }

  const handleRun = async () => {
    if (!selectedKey || !selectedModel) {
      setNodeStatus(id, 'error')
      return message.warning('请完整选择 Key 和 模型')
    }
    setGenerating(true)
    setProgressMsg('正在连接实时通道...')
    setNodeStatus(id, 'running')
    updateNodeData(id, { result: null, _finalSourcePrompt: prompt, _finalSystemPrompt: data?._systemPromptOverride || selectedRolePrompt })

    let waitingForSSE = false
    try {
      sseClientRef.current?.disconnect()
      const sseClient = createSSEClient(id, handleSSEMessage)
      sseClientRef.current = sseClient
      await sseClient.connect()

      setProgressMsg('正在唤醒云端大脑...')
      const payload = buildPayload()
      const res = await apiClient.request({ url: '/generate', method: 'POST', data: payload })

      if (res.data?.client_id && !hasImmediateGenerationResult(res.data)) {
        waitingForSSE = true
        setProgressMsg('已进入后台生成，等待模型返回...')
        return
      }

      finishGeneration(res.data)
    } catch (error: any) {
      failGeneration(String(error.response?.data?.detail || error.response?.data?.error || error.message || '未知错误'))
    } finally {
      if (!waitingForSSE) {
        setGenerating(false)
        setProgressMsg('')
      }
    }
  }

  useEffect(() => {
    if (!data?._runSignal || data._runSignal === prevRunSignalRef.current) return
    prevRunSignalRef.current = data._runSignal
    void handleRun()
  }, [data?._runSignal])

  const handleInterrupt = async () => {
    try { await apiClient.post(`/interrupt/${id}`); message.warning('已下发拦截指令') } catch { message.error('拦截信令发送失败') }
  }

  const handleSaveToAsset = async () => {
    if (!result?.content) return
    try {
      await apiClient.post('/assets/', buildGenerateNodeAssetPayload({
        resultContent: String(result.content),
        mode,
        prompt,
        selectedModel,
        provider: resolveProvider(),
        selectedRolePrompt,
        params,
        temperature,
        aspectRatio,
        ratioSize,
        projectId,
        cameraParams,
        sourceAssetIds: result?.source_asset_ids,
      }))
      message.success('已携带溯源信息固化到资产库！')
      if (projectId) await fetchAssets(projectId)
    } catch {
      message.error('入库失败')
    }
  }

  const selectRoleAsset = (assetId: number | null) => {
    setRoleAssetId(assetId)
    if (assetId) {
      setUseRoleAsset(true)
      updateNodeData(id, { roleAssetId: assetId, useRoleAsset: true })
      return
    }
    setUseRoleAsset(false)
    updateNodeData(id, { roleAssetId: null, useRoleAsset: false })
  }

  const handleCreatePresetRole = async (preset: typeof PRESET_ROLES[0]) => {
    const existing = roleAssets.find(asset => asset.name === preset.name)
    if (existing) {
      selectRoleAsset(existing.id)
      message.info(`「${preset.name}」已存在，已自动选中`)
      return
    }

    try {
      const res = await apiClient.post('/assets/', {
        type: 'prompt',
        name: preset.name,
        data: { content: preset.prompt },
        tags: ['SystemRole'],
        project_id: null,
      })
      const created = res.data?.asset || res.data
      if (!created?.id) throw new Error('asset id missing')
      selectRoleAsset(Number(created.id))
      await fetchAssets()
      message.success(`「${preset.name}」已创建到资产库`)
    } catch {
      message.error('创建预设失败')
    }
  }

  const renderParams = () => {
    const uiParams = selectedModelRecord?.context_ui_params?.[mode]
    if (!Array.isArray(uiParams) || uiParams.length === 0) return null

    return (
      <div style={{ display: 'grid', gap: 10, padding: 10, border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc' }}>
        {uiParams.map((param: any) => {
          const value = params[param.name] !== undefined ? params[param.name] : param.default
          const commit = (nextValue: any) => {
            const nextParams = { ...params, [param.name]: nextValue }
            setParams(nextParams)
            updateNodeData(id, { params: nextParams })
          }
          return (
            <div key={param.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{param.label || param.name}</Text>
                {param.type === 'number' && <Text type="secondary" style={{ fontSize: 12 }}>{value}</Text>}
              </div>
              {param.type === 'boolean' && <Switch size="small" checked={Boolean(value)} onChange={commit} />}
              {param.type === 'select' && <Select size="small" value={value} options={param.options || []} style={{ width: '100%' }} onChange={commit} />}
              {param.type === 'number' && Number(param.max) <= 2 && (
                <Slider min={Number(param.min ?? 0)} max={Number(param.max ?? 2)} step={Number(param.step ?? 0.1)} value={Number(value ?? param.default ?? 0)} onChange={commit} />
              )}
              {param.type === 'number' && Number(param.max) > 2 && (
                <InputNumber size="small" value={Number(value ?? param.default ?? 0)} min={param.min} max={param.max} step={param.step} style={{ width: '100%' }} onChange={commit} />
              )}
              {(param.type === 'string' || param.type === 'text') && (
                <Input size="small" value={value} placeholder={param.default || param.name} onChange={event => commit(event.target.value)} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const selectModel = (nextModel: string) => {
    setSelectedModel(nextModel)
    const modelRecord = allModels.find(item => item.model_name === nextModel)
    const uiParams = modelRecord?.context_ui_params?.[mode]
    if (Array.isArray(uiParams)) {
      const defaults = Object.fromEntries(uiParams.map((param: any) => [param.name, param.default]))
      setParams(defaults)
      updateNodeData(id, { params: defaults })
    }
  }

  const nodeCollapsed = Boolean(data?._collapsed)
  const outType = mode === 'chat' || mode === 'vision' ? 'text'
    : mode === 'text_to_image' || mode === 'image_to_image' ? 'image'
      : mode === 'text_to_video' || mode === 'image_to_video' ? 'video' : 'any'

  const renderDynamicHandles = () => (
    <>
      {(mode === 'chat' || mode === 'vision') && <TypedHandle id="system" type="target" position={Position.Left} dataType="text" label="系统提示词" color="#fadb14" top={30} collapsed={nodeCollapsed} />}
      <TypedHandle id="text" type="target" position={Position.Left} dataType="text" label="文本输入" top={70} collapsed={nodeCollapsed} />
      {(mode === 'vision' || mode === 'image_to_image' || mode === 'image_to_video') && <TypedHandle id="image" type="target" position={Position.Left} dataType="image" label="图片输入" top={110} collapsed={nodeCollapsed} />}
    </>
  )

  const isImageVideoMode = ['text_to_image', 'image_to_image', 'text_to_video', 'image_to_video'].includes(mode)
  const currentModeLabel = MODES.find(item => item.value === mode)?.label || mode.toUpperCase()
  const currentModelDisplay = selectedModelRecord?.display_name || selectedModel || '未配置模型'
  const expectedFissionCount = Number.isFinite(Number(data?._fissionExpectedCount)) ? Number(data?._fissionExpectedCount) : null
  const parsedFissionCount = result?._fission && Array.isArray(result?.items) ? result.items.length : 0
  const fissionCountHealthy = expectedFissionCount === null || parsedFissionCount === expectedFissionCount
  const resultContent = result?.content
  const previewMediaSrc = resolveGenerateNodePreviewMediaSrc(typeof resultContent === 'string' ? resultContent : '')
  const isMediaResult = typeof resultContent === 'string' && (
    resultContent.startsWith('http') ||
    resultContent.startsWith('data:image') ||
    resultContent.startsWith('data:video') ||
    resultContent.match(/\.(png|jpg|jpeg|webp|gif|mp4|webm|mov)(\?|$)/i)
  )
  const isVideoResult = typeof resultContent === 'string' && (
    resultContent.startsWith('data:video') ||
    resultContent.match(/\.(mp4|webm|mov)(\?|$)/i)
  )

  const configPanel = configOpen && panelPos && typeof document !== 'undefined' ? ReactDOM.createPortal(
    <div
      data-config-panel
      className="nodrag nowheel"
      style={{
        position: 'fixed',
        top: panelPos.top,
        left: panelPos.left,
        width: 560,
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'calc(100vh - 24px)',
        overflow: 'auto',
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 16px 48px rgba(15,23,42,0.18), 0 2px 10px rgba(15,23,42,0.08)',
        border: '1px solid #e2e8f0',
        zIndex: 9999,
        padding: 14,
      }}
    >
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Select value={mode} options={MODES} style={{ flex: 1 }} onChange={nextMode => { setMode(nextMode); setSelectedModel(''); setParams({}) }} />
          <Tooltip title="关闭配置">
            <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setConfigOpen(false)} />
          </Tooltip>
        </div>

        <TextArea
          className="nodrag nowheel"
          value={prompt}
          onChange={event => setPrompt(event.target.value)}
          autoSize={{ minRows: 4, maxRows: 10 }}
          placeholder="输入指令或连线输入素材..."
          style={{ fontSize: 13, fontFamily: 'monospace', borderRadius: 8 }}
        />

        <Space.Compact block>
          <Select
            value={selectedKey ?? undefined}
            placeholder="选择 Key"
            style={{ width: 168 }}
            options={keys.map(key => ({ label: key.description || key.provider || `Key ${key.id}`, value: Number(key.id) }))}
            onChange={value => { setSelectedKey(Number(value)); setSelectedModel(''); setParams({}) }}
          />
          <Select
            value={selectedModel || undefined}
            placeholder="选择模型"
            loading={modelLoading}
            disabled={!selectedKey}
            style={{ flex: 1, minWidth: 0 }}
            options={selectableModels.map(item => ({ label: `${item.is_favorite && !showOnlyFavorites ? '⭐ ' : ''}${item.display_name || item.model_name}`, value: item.model_name }))}
            onChange={selectModel}
          />
          <Tooltip title={showOnlyFavorites ? '显示全量模型' : '只看收藏模型'}>
            <Button icon={<StarFilled />} type={showOnlyFavorites ? 'primary' : 'default'} onClick={() => setShowOnlyFavorites(value => !value)} />
          </Tooltip>
        </Space.Compact>

        <Select
          value={routingStrategy}
          options={GENERATE_NODE_ROUTING_STRATEGY_OPTIONS}
          onChange={setRoutingStrategy}
          placeholder="Key 路由策略"
        />

        <Input value={systemPrompt} onChange={event => setSystemPrompt(event.target.value)} placeholder="System prompt" />

        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <Select
            value={aspectRatio}
            onChange={nextValue => setAspectRatio(nextValue as AspectRatioValue)}
            options={GENERATE_NODE_ASPECT_RATIO_OPTIONS.map(r => ({ value: r.value, label: r.size ? `${r.label} · ${r.size}` : r.label }))}
          />
          {aspectRatio === 'custom' ? (
            <>
              <InputNumber value={customWidth} min={1} onChange={value => setCustomWidth(Number(value || 0))} />
              <InputNumber value={customHeight} min={1} onChange={value => setCustomHeight(Number(value || 0))} />
            </>
          ) : (
            <Input value={ratioSize} disabled />
          )}
          <InputNumber value={temperature} min={0} max={2} step={0.1} onChange={value => setTemperature(Number(value || 0))} />
        </div>

        {(mode === 'chat' || mode === 'vision') && (
          <div style={{ display: 'grid', gap: 8, padding: 10, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <Checkbox checked={useRoleAsset} onChange={event => setUseRoleAsset(event.target.checked)}>Use role asset</Checkbox>
            <Select value={roleAssetId ?? undefined} onChange={value => selectRoleAsset(value ?? null)} options={roleAssets.map(asset => ({ value: asset.id, label: asset.name }))} placeholder="SystemRole 资产" allowClear />
            <Space size={6} wrap>
              {PRESET_ROLES.map(preset => (
                <Tag key={preset.name} color="orange" style={{ cursor: 'pointer', margin: 0 }} onClick={() => handleCreatePresetRole(preset)}>
                  {preset.label}
                </Tag>
              ))}
            </Space>
          </div>
        )}

        {isImageVideoMode && (
          <div style={{ display: 'grid', gap: 8, padding: 10, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <CameraControl value={cameraParams} onChange={setCameraParams} open={cameraOpen} onOpenChange={setCameraOpen} customOptions={cameraCustomOptions} onCustomOptionsChange={setCameraCustomOptions} />
            <CameraMovement onInsert={text => setPrompt(prev => prev ? `${prev}\n${text}` : text)} open={movementOpen} onOpenChange={setMovementOpen} customPresets={customMovements} onAddCustom={preset => setCustomMovements(prev => [...prev, preset])} onRemoveCustom={value => setCustomMovements(prev => prev.filter(item => item.value !== value))} />
          </div>
        )}

        {renderParams()}
      </Space>
    </div>,
    document.body
  ) : null

  return (
    <>
      {renderDynamicHandles()}
      <BaseNode {...props} onOpenConfig={() => setConfigOpen(v => !v)}>
      <div ref={nodeRef} style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Tag color="#0ea5e9" style={{ margin: 0, fontWeight: 700, fontSize: 11, fontFamily: 'monospace' }}>{currentModeLabel}</Tag>
          <Text style={{ flex: 1, minWidth: 0, fontSize: 12, color: selectedModel ? '#1e293b' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentModelDisplay}>
            {currentModelDisplay}
          </Text>
          {(mode === 'chat' || mode === 'vision') && (
            <Tooltip title="裂变输出：LLM 返回 JSON 数组时自动裂变下游节点并发执行">
              <Tag
                className="nodrag"
                color={data?._fissionEnabled ? '#f59e0b' : undefined}
                style={{ margin: 0, cursor: 'pointer', fontSize: 11, userSelect: 'none' }}
                onClick={() => updateNodeData(id, { _fissionEnabled: !data?._fissionEnabled })}
              >
                {data?._fissionEnabled ? '🔀 裂变' : '裂变'}
              </Tag>
            </Tooltip>
          )}
          {data?._fissionEnabled && (
            <Tooltip title={expectedFissionCount !== null ? `裂变计数校验：期望 ${expectedFissionCount} 条，当前解析 ${parsedFissionCount} 条` : '裂变计数校验：未设置期望条数'}>
              <Tag style={{ margin: 0, fontSize: 11, userSelect: 'none' }} color={fissionCountHealthy ? 'green' : 'red'}>
                {expectedFissionCount !== null ? `${parsedFissionCount}/${expectedFissionCount}` : `${parsedFissionCount}/?`}
              </Tag>
            </Tooltip>
          )}
        </div>

        <TextArea
          className="nodrag nowheel"
          value={prompt}
          onChange={event => setPrompt(event.target.value)}
          autoSize={{ minRows: 2, maxRows: 4 }}
          placeholder="输入指令或连线输入素材..."
          style={{ fontSize: 13, fontFamily: 'monospace', borderRadius: 8, flexShrink: 0 }}
        />

        <Button type="primary" danger={generating} block disabled={isMuted} icon={generating ? <StopOutlined /> : <PlayCircleOutlined />} onClick={generating ? handleInterrupt : handleRun} style={{ height: 36, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          {isMuted ? '已静音' : generating ? '强行中断' : '单点运行'}
        </Button>

        <div style={{ flex: showPreview ? 1 : '0 0 auto', display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px dashed #94a3b8', minHeight: showPreview ? 120 : 'auto', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <Text style={{ fontSize: 12, color: '#64748b', fontWeight: 700, fontFamily: 'monospace' }}>&gt; OUTPUT_PREVIEW</Text>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {resultContent && (
                <Tooltip title="携带溯源信息固化到资产库">
                  <Button type="text" size="small" icon={<SaveOutlined />} onClick={handleSaveToAsset} style={{ fontSize: 16, color: '#0ea5e9', padding: 0, height: 'auto' }} />
                </Tooltip>
              )}
              <Switch className="nodrag" size="small" checked={showPreview} onChange={value => setShowPreview(value)} />
            </div>
          </div>

          {showPreview && (
            <div style={{ flex: 1, position: 'relative', background: resultContent && !isMediaResult ? '#0f172a' : '#f1f5f9', borderRadius: 8, overflow: 'hidden', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
              {mediaDims && !generating && resultContent && (
                <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(15,23,42,0.75)', color: '#f8fafc', fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4, zIndex: 10, fontFamily: 'monospace' }}>{mediaDims}</div>
              )}
              {generating ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20 }}>
                  <Spin size="default" style={{ marginBottom: 12 }} />
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{progressMsg}</Text>
                </div>
              ) : resultContent ? (
                isMediaResult ? (
                  isVideoResult ? (
                    <video src={previewMediaSrc} controls style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} onLoadedMetadata={event => setMediaDims(`${(event.target as HTMLVideoElement).videoWidth} x ${(event.target as HTMLVideoElement).videoHeight}`)} />
                  ) : (
                    <img src={previewMediaSrc} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} onLoad={event => setMediaDims(`${(event.target as HTMLImageElement).naturalWidth} x ${(event.target as HTMLImageElement).naturalHeight}`)} />
                  )
                ) : (
                  <div className="nodrag nowheel" style={{ position: 'absolute', inset: 0, padding: 12, overflowY: 'auto', fontSize: 13, color: '#f8fafc', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{String(resultContent)}</div>
                )
              ) : (
                <Text type="secondary" style={{ fontSize: 13, color: '#475569' }}>等待生成结果...</Text>
              )}
            </div>
          )}
        </div>
      </div>
      </BaseNode>
      <TypedHandle id="out" type="source" position={Position.Right} dataType={outType} label="生成结果" collapsed={nodeCollapsed} />
      {configPanel}
    </>
  )
}

nodeRegistry.register({ type: 'generate', displayName: 'AI 大脑节点', component: GenerateNodeImpl })
export default GenerateNodeImpl

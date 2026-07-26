import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { Position, type NodeProps, useReactFlow, useUpdateNodeInternals } from 'reactflow'
import { useParams } from 'react-router-dom'
import { useDrop } from 'react-dnd'
import { Button, Input, Select, Space, Spin, Switch, Tag, Tooltip, Typography, message } from 'antd'
import { ApiOutlined, CloseOutlined, PlayCircleOutlined, SaveOutlined, StopOutlined } from '@ant-design/icons'
import { providerApi } from '../../api/providers'
import { keyApi } from '../../api/keys'
import apiClient from '../../api/client'
import { createSSEClient, type SSEClient, type SSEMessage } from '../../utils/sse'
import { getTypeLabel, inferParamType } from '../../utils/handleTypes'
import { nodeRegistry } from '../../utils/nodeRegistry'
import { DndItemTypes } from '../../constants/dnd'
import { AspectRatioPanel, AspectRatioTrigger, getAspectRatioSize, type AspectRatioValue } from '../AspectRatioSelector'
import { CameraPanel, CameraTrigger, buildCameraPromptSuffix, type CustomCameraOptions } from '../CameraControl'
import { CameraMovementPanel, CameraMovementTrigger, type CameraMovementPreset } from '../CameraMovement'
import { useAssetLibraryStore } from '../../stores/assetLibraryStore'
import { useCanvasStore } from '../../stores/canvasStore'
import { BaseNode } from './BaseNode'
import { TypedHandle } from './TypedHandle'
import { pickMediaResultContent } from '../../utils/mediaResult'
import { buildAssetMediaUrl } from '../../utils/assetMedia'

const { Text } = Typography
const { TextArea } = Input

function parseJsonObject(value: string, fallback: any = null) {
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}

function normalizeWorkflowAsset(sourceData: any) {
  const asset = sourceData?.asset || sourceData
  const raw = asset?.data || asset
  const workflow = raw?.workflow_json || raw?.workflowJson || raw?.content || raw
  const parameters = raw?.parameters || null
  if (!workflow) return null
  const workflowJson = typeof workflow === 'string' ? workflow : JSON.stringify(workflow, null, 2)
  return { workflowJson, parameters, label: asset?.name || sourceData?.label || '工作流资产' }
}

function firstPresentValue(candidates: any[]) {
  return candidates.find(value => value !== undefined && value !== null && String(value).trim()) || ''
}

export function resolveComfyEnginePreviewMediaSrc(content: string, apiBaseURL?: string) {
  const value = String(content || '').trim()
  if (!value) return ''
  return buildAssetMediaUrl(value, apiBaseURL)
}

export function isComfyEngineVideoPreviewContent(content: string) {
  const value = String(content || '').trim()
  return /^(data:video)/i.test(value) || /\.(mp4|webm|mov|gif)(\?|$)/i.test(value)
}

export function selectDefaultComfyKey(currentKeyId: number | null | undefined, selectedProvider: string | null | undefined, keys: any[]) {
  const provider = String(selectedProvider || '').toLowerCase()
  const activeKeys = (keys || []).filter(key => String(key.provider || '').toLowerCase() === provider && key.is_active !== false)
  const current = Number(currentKeyId || 0)
  if (current && activeKeys.some(key => Number(key.id) === current)) return current
  return activeKeys[0]?.id ? Number(activeKeys[0].id) : null
}

export function resolveComfyEngineParamInputValue(sourceData: any, paramType: string) {
  const assetData = sourceData?.asset?.data
  const incomingData = sourceData?.incoming_data
  const assetIsCharacter = sourceData?.asset?.type === 'character'
  if (paramType === 'image') {
    return firstPresentValue([
      sourceData?.result?.file_path,
      sourceData?.result?.url,
      sourceData?.result?.content,
      pickMediaResultContent(sourceData?.result),
      sourceData?.result?.data?.file_path,
      sourceData?.result?.data?.url,
      pickMediaResultContent(sourceData?.result?.data),
      sourceData?.asset?.data?.file_path,
      sourceData?.asset?.data?.url,
      pickMediaResultContent(sourceData?.asset?.data),
      sourceData?.asset?.thumbnail,
      sourceData?.incoming_data?.file_path,
      sourceData?.incoming_data?.url,
      sourceData?.incoming_data?.content,
      pickMediaResultContent(sourceData?.incoming_data),
      typeof sourceData?.incoming_data === 'string' ? sourceData.incoming_data : '',
    ])
  }
  return firstPresentValue([
    sourceData?.result?.content,
    sourceData?.result?.data?.content,
    assetIsCharacter ? assetData?.core_prompt : assetData?.content,
    assetIsCharacter ? assetData?.content : assetData?.core_prompt,
    incomingData?.core_prompt,
    incomingData?.content,
    typeof incomingData === 'string' ? incomingData : '',
  ])
}

function injectWorkflowValue(workflow: any, config: any, value: any) {
  if (value === undefined || value === '' || !config?.node_id || !config?.field) return
  const node = workflow?.[config.node_id]
  if (!node) return
  const pathParts = String(config.field).split('/').filter(Boolean)
  let cursor = node
  for (let index = 0; index < pathParts.length - 1; index += 1) {
    const key = pathParts[index]
    if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {}
    cursor = cursor[key]
  }
  cursor[pathParts[pathParts.length - 1]] = value
}

function hasExplicitParamValue(value: any) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

export function applyComfyEngineParametersToWorkflow(input: {
  workflow: Record<string, any>
  parameters?: Record<string, { node_id: string; field: string }> | null
  paramValues?: Record<string, any>
  connectedValues?: Record<string, any>
  cameraParams?: Record<string, string>
}) {
  const workflow = JSON.parse(JSON.stringify(input.workflow || {}))
  const parameters = input.parameters || null
  const paramValues = input.paramValues || {}
  const connectedValues = input.connectedValues || {}
  const cameraSuffix = buildCameraPromptSuffix(input.cameraParams || {})

  for (const paramName of Object.keys(parameters || {})) {
    const config = parameters?.[paramName]
    const hasConnectedValue = Object.prototype.hasOwnProperty.call(connectedValues, paramName)
    let value = hasConnectedValue ? connectedValues[paramName] : paramValues[paramName]
    if (!hasExplicitParamValue(value)) continue
    if (inferParamType(paramName) === 'text' && cameraSuffix) value = `${value}${cameraSuffix}`
    injectWorkflowValue(workflow, config, value)
  }

  return { workflow, activeParameters: parameters }
}

function normalizeSourceAssetIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map(item => Number(item)).filter(id => Number.isFinite(id) && id > 0)
}

function sourceAssetIdsFromNodeData(data: any): number[] {
  const explicitIds = [
    ...normalizeSourceAssetIds(data?.source_asset_ids),
    ...normalizeSourceAssetIds(data?.sourceAssetIds),
    ...normalizeSourceAssetIds(data?.result?.source_asset_ids),
    ...normalizeSourceAssetIds(data?.result?.sourceAssetIds),
    ...normalizeSourceAssetIds(data?.incoming_data?.source_asset_ids),
    ...normalizeSourceAssetIds(data?.incoming_data?.sourceAssetIds),
  ]
  const directId = Number(data?.asset?.id ?? data?.asset_id ?? data?.assetId ?? data?.result?.asset_id ?? data?.incoming_data?.asset_id ?? 0)
  if (Number.isFinite(directId) && directId > 0) explicitIds.unshift(directId)
  return Array.from(new Set(explicitIds))
}

export function collectComfyEngineConnectedInputs(input: {
  targetNodeId: string
  activeParameters?: Record<string, { node_id: string; field: string }> | null
  edges: Array<{ source: string; target: string; targetHandle?: string | null }>
  nodes: Array<{ id: string; data?: any }>
}) {
  const incomingEdges = (input.edges || []).filter(edge => edge.target === input.targetNodeId)
  const connectedValues: Record<string, any> = {}
  const sourceAssetIds: number[] = []
  for (const paramName of Object.keys(input.activeParameters || {})) {
    const paramType = inferParamType(paramName)
    const connectedEdge = incomingEdges.find(edge => edge.targetHandle === `param-${paramName}`)
    if (!connectedEdge) continue
    const sourceNode = (input.nodes || []).find(node => node.id === connectedEdge.source)
    if (!sourceNode) continue
    connectedValues[paramName] = resolveComfyEngineParamInputValue(sourceNode.data, paramType)
    for (const sourceAssetId of sourceAssetIdsFromNodeData(sourceNode.data)) {
      if (!sourceAssetIds.includes(sourceAssetId)) sourceAssetIds.push(sourceAssetId)
    }
  }
  return { connectedValues, sourceAssetIds }
}

function normalizeResultPacket(packet: any) {
  const body = packet?.result || packet?.data?.result || packet?.data || packet
  const mediaContent = pickMediaResultContent(body) || pickMediaResultContent(packet) || ''
  const content = body?.content ?? packet?.content ?? mediaContent
  return typeof body === 'object' ? { ...body, content } : { content: String(body || '') }
}

export function buildComfyEngineResultWithLineage(input: {
  packet: any
  selectedProviderName: string
  workflow?: any
  params?: any
  fallbackWorkflow?: any
  fallbackParams?: any
  aspectRatioValue: AspectRatioValue
  customWidth?: number
  customHeight?: number
  cameraParams?: Record<string, string>
  sourceAssetIds?: number[] | null
}) {
  const normalized = normalizeResultPacket(input.packet)
  const cameraParams = input.cameraParams || {}
  const sourceAssetIds = Array.isArray(input.sourceAssetIds)
    ? input.sourceAssetIds.map(item => Number(item)).filter(id => Number.isFinite(id))
    : []
  return {
    ...normalized,
    ...(sourceAssetIds.length ? { source_asset_ids: sourceAssetIds } : {}),
    source_provider: input.selectedProviderName,
    source_model: 'ComfyUI Workflow',
    source_mode: 'comfyui',
    source_workflow: input.workflow ?? input.fallbackWorkflow,
    source_params: input.params ?? input.fallbackParams,
    source_aspect_ratio: input.aspectRatioValue,
    source_size: getAspectRatioSize(input.aspectRatioValue, input.customWidth, input.customHeight),
    source_camera_params: cameraParams,
    source_camera_suffix: buildCameraPromptSuffix(cameraParams) || null,
  }
}

export function buildComfyEngineAssetPayload(input: { result: any; projectId?: number | null }) {
  const result = input.result || {}
  const content = String(result.content || '')
  const isVideo = Boolean(result.type === 'video' || /^(data:video)/i.test(content) || /\.(mp4|webm|mov|gif)(\?|$)/i.test(content))
  const sourceAssetIds = Array.isArray(result.source_asset_ids)
    ? result.source_asset_ids.map((item: any) => Number(item)).filter((id: number) => Number.isFinite(id))
    : []

  return {
    name: `${isVideo ? '视频' : '图像'} ComfyUI 产物`,
    type: isVideo ? 'video' : 'image',
    file_path: content,
    ...(sourceAssetIds.length ? { source_asset_ids: sourceAssetIds } : {}),
    data: {
      file_path: content,
      url: content,
      content,
      ...(sourceAssetIds.length ? { source_asset_ids: sourceAssetIds } : {}),
      source_provider: result.source_provider,
      source_model: result.source_model,
      source_mode: result.source_mode,
      source_workflow: result.source_workflow,
      source_params: result.source_params,
      source_aspect_ratio: result.source_aspect_ratio,
      source_size: result.source_size,
      source_camera_params: result.source_camera_params,
      source_camera_suffix: result.source_camera_suffix,
    },
    tags: ['ComfyUI_Rendered'],
    thumbnail: isVideo ? undefined : content,
    project_id: input.projectId ?? null,
  }
}

export function buildComfyEngineGeneratePayload(input: {
  id: string
  selectedKeyId: number | null | undefined
  selectedProvider: string | null | undefined
  workflow: Record<string, any>
  cloudBaseUrl?: string
  runninghubApiKey?: string
  comfyInputDir?: string
}) {
  const payload: any = {
    api_key_id: Number(input.selectedKeyId) || undefined,
    provider: input.selectedProvider || undefined,
    model: 'comfyui-workflow',
    type: 'image',
    prompt: JSON.stringify(input.workflow),
    params: { client_id: input.id },
  }
  const baseUrl = String(input.cloudBaseUrl || '').trim()
  const apiKey = String(input.runninghubApiKey || '').trim()
  const inputDir = String(input.comfyInputDir || '').trim()
  if (baseUrl) payload.base_url = baseUrl
  if (apiKey) payload.runninghub_api_key = apiKey
  if (inputDir) payload.comfy_input_dir = inputDir
  return payload
}

function ComfyUIEngineNodeImpl(props: NodeProps) {
  const { id, data } = props
  const { id: routeProjectId } = useParams<{ id: string }>()
  const updateNodeData = useCanvasStore(state => state.updateNodeData)
  const setNodeStatus = useCanvasStore(state => state.setNodeStatus)
  const createAsset = useAssetLibraryStore(state => state.createAsset)
  const fetchAssets = useAssetLibraryStore(state => state.fetchAssets)
  const { getEdges, getNodes } = useReactFlow()
  const updateNodeInternals = useUpdateNodeInternals()

  const [providers, setProviders] = useState<any[]>([])
  const [keys, setKeys] = useState<any[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string | null>(data?.selectedProvider || data?.provider || null)
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(Number(data?.selectedKeyId ?? data?.api_key_id) || null)
  const [workflowJson, setWorkflowJson] = useState<string>(data?.workflowJson || '')
  const [parametersJson, setParametersJson] = useState<string>(data?.parameters ? JSON.stringify(data.parameters, null, 2) : '')
  const [paramValues, setParamValues] = useState<Record<string, any>>(data?.paramValues || {})
  const [cloudBaseUrl, setCloudBaseUrl] = useState<string>(data?.cloudBaseUrl || data?.base_url || '')
  const [runninghubApiKey, setRunninghubApiKey] = useState<string>(data?.runninghubApiKey || data?.runninghub_api_key || '')
  const [comfyInputDir, setComfyInputDir] = useState<string>(data?.comfyInputDir || data?.comfy_input_dir || '')
  const [configOpen, setConfigOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<'ratio' | 'camera' | 'movement' | null>(null)
  const [aspectRatioValue, setAspectRatioValue] = useState<AspectRatioValue>(data?.aspectRatioValue ?? data?.aspectRatio ?? '16:9')
  const [customWidth, setCustomWidth] = useState(Number(data?.customWidth || 1280))
  const [customHeight, setCustomHeight] = useState(Number(data?.customHeight || 720))
  const [cameraParams, setCameraParams] = useState<Record<string, string>>(data?.cameraParams || {})
  const [customCameraOptions, setCustomCameraOptions] = useState<CustomCameraOptions>(data?.customCameraOptions || {})
  const [customMovements, setCustomMovements] = useState<CameraMovementPreset[]>(data?.customMovements || [])
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [progressMsg, setProgressMsg] = useState('')
  const [showPreview, setShowPreview] = useState(Boolean(data?.showPreview ?? true))
  const [result, setResult] = useState<any>(data?.result || null)
  const [mediaDims, setMediaDims] = useState('')
  const [savingAsset, setSavingAsset] = useState(false)
  const nodeRef = useRef<HTMLDivElement>(null)
  const sseClientRef = useRef<SSEClient | null>(null)
  const prevRunSignalRef = useRef(data?._runSignal)
  const runLineageRef = useRef<{ workflow: any; params: any; sourceAssetIds?: number[] } | null>(null)

  const parameters = useMemo(() => parseJsonObject(parametersJson, null), [parametersJson])
  const selectedProviderRecord = providers.find(provider => provider.id === selectedProvider)
  const selectedProviderName = selectedProviderRecord?.display_name || selectedProvider || '未配置算力节点'
  const availableKeys = keys.filter(key => String(key.provider).toLowerCase() === String(selectedProvider || '').toLowerCase() && key.is_active !== false)
  const resultContent = result?.content
  const previewMediaSrc = resolveComfyEnginePreviewMediaSrc(typeof resultContent === 'string' ? resultContent : '')
  const projectId = Number(routeProjectId || 0) || null
  const isVideoResult = typeof resultContent === 'string' && isComfyEngineVideoPreviewContent(resultContent)
  const isMediaResult = typeof resultContent === 'string' && (
    resultContent.startsWith('/api/assets/media/')
    || resultContent.startsWith('http')
    || resultContent.startsWith('data:image')
    || resultContent.startsWith('data:video')
    || resultContent.match(/\.(png|jpg|jpeg|webp|gif|mp4|webm|mov)(\?|$)/i)
  )

  useEffect(() => {
    updateNodeInternals(id)
  }, [id, parameters, updateNodeInternals])

  const [{ isOver }, drop] = useDrop(() => ({
    accept: DndItemTypes.ASSET,
    drop: (item: any) => {
      const asset = item?.asset
      if (!asset) return
      const isWorkflowLikeAsset = asset.type === 'workflow' || asset.type === 'prompt'
      if (!isWorkflowLikeAsset) return
      const normalized = normalizeWorkflowAsset({ asset })
      if (!normalized) {
        message.warning('无法从该资产读取工作流')
        return
      }
      setWorkflowJson(normalized.workflowJson)
      setParametersJson(normalized.parameters ? JSON.stringify(normalized.parameters, null, 2) : '')
      setParamValues({})
      updateNodeData(id, {
        label: `算力引擎 · ${normalized.label}`,
        workflowJson: normalized.workflowJson,
        parameters: normalized.parameters,
        paramValues: {},
      })
      message.success(`已载入工作流: ${normalized.label}`)
    },
    collect: monitor => ({ isOver: monitor.isOver() }),
  }), [id, updateNodeData])

  useEffect(() => {
    providerApi.getAll('comfyui')
      .then(res => {
        const nextProviders = Array.isArray(res.data) ? res.data : []
        setProviders(nextProviders)
        setSelectedProvider(current => current || nextProviders[0]?.id || null)
      })
      .catch(() => setProviders([]))
    keyApi.getAll()
      .then(res => {
        const nextKeys = Array.isArray(res.data) ? res.data : []
        setKeys(nextKeys)
      })
      .catch(() => setKeys([]))
  }, [])

  useEffect(() => {
    const nextKeyId = selectDefaultComfyKey(selectedKeyId, selectedProvider, keys)
    if (nextKeyId === selectedKeyId) return
    setSelectedKeyId(nextKeyId)
    updateNodeData(id, { selectedKeyId: nextKeyId })
  }, [id, keys, selectedProvider, selectedKeyId, updateNodeData])

  useEffect(() => {
    updateNodeData(id, {
      selectedProvider,
      selectedKeyId,
      workflowJson,
      parameters,
      paramValues,
      cloudBaseUrl,
      runninghubApiKey,
      comfyInputDir,
      base_url: cloudBaseUrl,
      runninghub_api_key: runninghubApiKey,
      comfy_input_dir: comfyInputDir,
      aspectRatioValue,
      customWidth,
      customHeight,
      cameraParams,
      customCameraOptions,
      customMovements,
      showPreview,
      result,
    })
  }, [id, selectedProvider, selectedKeyId, workflowJson, parameters, paramValues, cloudBaseUrl, runninghubApiKey, comfyInputDir, aspectRatioValue, customWidth, customHeight, cameraParams, customCameraOptions, customMovements, showPreview, result, updateNodeData])

  useEffect(() => {
    setNodeStatus(id, isRunning ? 'running' : result ? 'success' : 'idle')
  }, [id, isRunning, result, setNodeStatus])

  useEffect(() => {
    const current = useCanvasStore.getState().nodes.find(node => node.id === id)?.data
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

  const findIncomingWorkflow = () => {
    const incoming = getEdges().find(edge => edge.target === id && edge.targetHandle === 'in')
    const sourceNode = incoming ? getNodes().find(node => node.id === incoming.source) : null
    return sourceNode ? normalizeWorkflowAsset(sourceNode.data) : null
  }

  const buildWorkflowForRun = () => {
    const incomingWorkflow = findIncomingWorkflow()
    const sourceWorkflowJson = workflowJson.trim() || incomingWorkflow?.workflowJson || ''
    const workflow = parseJsonObject(sourceWorkflowJson, null)
    const activeParameters = parameters || incomingWorkflow?.parameters || null
    if (!workflow) throw new Error('请提供有效的 ComfyUI 工作流 JSON')

    const { connectedValues, sourceAssetIds } = collectComfyEngineConnectedInputs({
      targetNodeId: id,
      activeParameters,
      edges: getEdges(),
      nodes: getNodes(),
    })
    return {
      ...applyComfyEngineParametersToWorkflow({ workflow, parameters: activeParameters, paramValues, connectedValues, cameraParams }),
      sourceAssetIds,
    }
  }

  const finishGeneration = (packet: any) => {
    const lineage = runLineageRef.current
    const resultWithLineage = buildComfyEngineResultWithLineage({
      packet,
      selectedProviderName,
      workflow: lineage?.workflow,
      params: lineage?.params,
      fallbackWorkflow: data?._finalUsedWorkflow,
      fallbackParams: data?._finalUsedParams,
      aspectRatioValue,
      customWidth,
      customHeight,
      cameraParams,
      sourceAssetIds: lineage?.sourceAssetIds,
    })
    setResult(resultWithLineage)
    updateNodeData(id, { result: resultWithLineage })
    setNodeStatus(id, 'success')
    setIsRunning(false)
    setProgressMsg('')
    sseClientRef.current?.disconnect()
    sseClientRef.current = null
    message.success('物理节点渲染成功')

    getEdges().filter(edge => edge.source === id).forEach(edge => {
      updateNodeData(edge.target, { incoming_data: resultWithLineage })
    })
  }

  const failGeneration = (errorText: string) => {
    message.error(errorText || 'ComfyUI 任务失败')
    setNodeStatus(id, 'error')
    setIsRunning(false)
    setProgressMsg('')
    sseClientRef.current?.disconnect()
    sseClientRef.current = null
  }

  const handleSSEMessage = (msg: SSEMessage) => {
    if (msg.type === 'status') {
      setProgressMsg(String(msg.message || msg.progress || 'ComfyUI 正在执行...'))
      return
    }
    if (msg.type === 'result') {
      finishGeneration(msg.data ?? msg.result ?? msg)
      return
    }
    if (msg.type === 'error') {
      failGeneration(String(msg.message || msg.error || 'ComfyUI 后台执行失败'))
      return
    }
    if (msg.type === 'interrupted') {
      failGeneration(String(msg.message || '任务已中断'))
    }
  }

  const handleRun = async () => {
    if (!selectedProvider || !selectedKeyId) {
      setNodeStatus(id, 'error')
      return message.warning('请选择 ComfyUI 算力节点和执行凭证')
    }

    let waitingForSSE = false
    try {
      const { workflow, activeParameters, sourceAssetIds } = buildWorkflowForRun()
      runLineageRef.current = { workflow, params: paramValues, sourceAssetIds }
      setIsRunning(true)
      setProgressMsg('正在连接实时通道...')
      setNodeStatus(id, 'running')
      updateNodeData(id, { result: null, _finalUsedWorkflow: workflow, _finalUsedParams: paramValues, parameters: activeParameters })

      sseClientRef.current?.disconnect()
      const sseClient = createSSEClient(id, handleSSEMessage)
      sseClientRef.current = sseClient
      await sseClient.connect()

      setProgressMsg('正在投递 ComfyUI 工作流...')
      const res = await apiClient.post('/generate', buildComfyEngineGeneratePayload({
        id,
        selectedKeyId,
        selectedProvider,
        workflow,
        cloudBaseUrl,
        runninghubApiKey,
        comfyInputDir,
      }))

      if (res.data?.client_id && !res.data?.content && !res.data?.result?.content) {
        waitingForSSE = true
        setProgressMsg('已投递到 ComfyUI，等待渲染完成...')
        return
      }
      finishGeneration(res.data)
    } catch (error: any) {
      failGeneration(String(error.response?.data?.error || error.response?.data?.detail || error.message || '投递失败'))
    } finally {
      if (!waitingForSSE) {
        setIsRunning(false)
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
    try {
      await apiClient.post(`/interrupt/${id}`)
      message.warning('已下发中断信号')
    } catch {
      message.error('中断信令发送失败')
    }
  }

  const handleInsertMovement = (text: string) => {
    const textParam = Object.keys(parameters || {}).find(paramName => inferParamType(paramName) === 'text')
    if (!textParam) {
      message.info('当前工作流没有暴露文本参数')
      return
    }
    const previous = paramValues[textParam] || ''
    const next = { ...paramValues, [textParam]: previous ? `${previous}, ${text}` : text }
    setParamValues(next)
    updateNodeData(id, { paramValues: next })
  }

  const handleSaveToAsset = async () => {
    if (!result?.content) return
    setSavingAsset(true)
    try {
      await createAsset(buildComfyEngineAssetPayload({ result, projectId }))
      message.success('已携带工作流血统保存到资产库')
      if (projectId) await fetchAssets(projectId)
    } catch {
      message.error('入库失败')
    } finally {
      setSavingAsset(false)
    }
  }

  const nodeCollapsed = Boolean(data?._collapsed)

  const renderParameterHandles = () => {
    if (!parameters) return null
    return Object.keys(parameters).map((paramName, index) => {
      const paramType = inferParamType(paramName)
      return (
        <TypedHandle key={paramName} id={`param-${paramName}`} type="target" position={Position.Left} dataType={paramType} label={`参数 ${paramName}`} top={126 + index * 42} collapsed={nodeCollapsed} />
      )
    })
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', flex: 1 }}><ApiOutlined /> 算力引擎配置</Text>
          <Tooltip title="关闭配置"><Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setConfigOpen(false)} /></Tooltip>
        </div>
        <Space.Compact block>
          <Select
            value={selectedProvider || undefined}
            placeholder="选择 ComfyUI 节点"
            style={{ flex: 1 }}
            options={providers.map(provider => ({ label: provider.display_name || provider.id, value: provider.id }))}
            onChange={value => { setSelectedProvider(value); setSelectedKeyId(null); updateNodeData(id, { selectedProvider: value, selectedKeyId: null }) }}
          />
          <Select
            value={selectedKeyId || undefined}
            placeholder="选择执行凭证"
            disabled={!selectedProvider}
            style={{ width: 180 }}
            options={availableKeys.map(key => ({ label: key.description || `Key ${key.id}`, value: Number(key.id) }))}
            onChange={value => { setSelectedKeyId(Number(value)); updateNodeData(id, { selectedKeyId: Number(value) }) }}
          />
        </Space.Compact>

        <div style={{ display: 'grid', gap: 8, padding: 10, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <Text style={{ fontSize: 12, color: '#475569', fontWeight: 800 }}>云端代理参数（可选）</Text>
          <Input
            value={cloudBaseUrl}
            onChange={event => setCloudBaseUrl(event.target.value)}
            placeholder="RunningHub / 云端 ComfyUI Base URL"
          />
          <Input.Password
            value={runninghubApiKey}
            onChange={event => setRunninghubApiKey(event.target.value)}
            placeholder="RunningHub API Key（Base URL 未含 key 时使用）"
          />
          <Input
            value={comfyInputDir}
            onChange={event => setComfyInputDir(event.target.value)}
            placeholder="ComfyUI input 目录，用于本地素材映射"
          />
        </div>

        <div>
          <Text style={{ display: 'block', fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 4 }}>Workflow JSON</Text>
          <TextArea
            className="nodrag nowheel"
            value={workflowJson}
            onChange={event => setWorkflowJson(event.target.value)}
            autoSize={{ minRows: 6, maxRows: 12 }}
            placeholder="粘贴 ComfyUI workflow JSON，或连入 workflow 资产到左侧紫色端口"
            style={{ fontSize: 12, fontFamily: 'monospace', borderRadius: 8 }}
          />
        </div>

        <div>
          <Text style={{ display: 'block', fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 4 }}>参数映射 JSON</Text>
          <TextArea
            className="nodrag nowheel"
            value={parametersJson}
            onChange={event => setParametersJson(event.target.value)}
            autoSize={{ minRows: 4, maxRows: 8 }}
            placeholder={'例如：{"positive_prompt":{"node_id":"6","field":"inputs/text"}}'}
            style={{ fontSize: 12, fontFamily: 'monospace', borderRadius: 8 }}
          />
        </div>

        <div style={{ display: 'grid', gap: 8, padding: 10, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <AspectRatioTrigger value={aspectRatioValue} customWidth={customWidth} customHeight={customHeight} onClick={() => setActivePanel(activePanel === 'ratio' ? null : 'ratio')} />
            <CameraTrigger value={cameraParams} onClick={() => setActivePanel(activePanel === 'camera' ? null : 'camera')} />
            <CameraMovementTrigger onClick={() => setActivePanel(activePanel === 'movement' ? null : 'movement')} />
          </div>
          {activePanel === 'ratio' && (
            <AspectRatioPanel
              value={aspectRatioValue}
              customWidth={customWidth}
              customHeight={customHeight}
              onChange={(next) => setAspectRatioValue(next)}
              onCustomSizeChange={(width, height) => { setCustomWidth(width); setCustomHeight(height) }}
              onClose={() => setActivePanel(null)}
            />
          )}
          {activePanel === 'camera' && (
            <CameraPanel
              value={cameraParams}
              onChange={setCameraParams}
              onClose={() => setActivePanel(null)}
              customOptions={customCameraOptions}
              onCustomOptionsChange={setCustomCameraOptions}
            />
          )}
          {activePanel === 'movement' && (
            <CameraMovementPanel
              onInsert={handleInsertMovement}
              onClose={() => setActivePanel(null)}
              customPresets={customMovements}
              onAddCustom={(preset) => setCustomMovements(previous => [...previous, preset])}
              onRemoveCustom={(value) => setCustomMovements(previous => previous.filter(item => item.value !== value))}
            />
          )}
        </div>

        {parameters && Object.keys(parameters).length > 0 && (
          <div style={{ display: 'grid', gap: 8, padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <Text style={{ fontSize: 12, color: '#0f766e', fontWeight: 800 }}>暴露参数</Text>
            {Object.keys(parameters).map(paramName => {
              const paramType = inferParamType(paramName)
              return (
                <div key={paramName}>
                  <Text style={{ fontSize: 11, color: '#334155', fontWeight: 700 }}>{paramName} <span style={{ color: '#94a3b8' }}>({getTypeLabel(paramType)})</span></Text>
                  <TextArea
                    className="nodrag nowheel"
                    value={paramValues[paramName] || ''}
                    onChange={event => {
                      const next = { ...paramValues, [paramName]: event.target.value }
                      setParamValues(next)
                      updateNodeData(id, { paramValues: next })
                    }}
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    placeholder="可手填，也可由连线覆盖"
                    style={{ marginTop: 4, fontSize: 12, borderRadius: 6 }}
                  />
                </div>
              )
            })}
          </div>
        )}
      </Space>
    </div>,
    document.body
  ) : null

  return (
    <>
      <TypedHandle id="in" type="target" position={Position.Left} dataType="workflow" label="工作流输入" top={48} collapsed={nodeCollapsed} />
      {renderParameterHandles()}
      <BaseNode {...props} onOpenConfig={() => setConfigOpen(value => !value)}>
      <div
        ref={(el) => { nodeRef.current = el; (drop as any)(el) }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          minHeight: 0,
          height: '100%',
          border: isOver ? '2px dashed #722ed1' : '2px dashed transparent',
          borderRadius: 10,
          background: isOver ? 'rgba(114,46,209,0.06)' : 'transparent',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Tag color="#722ed1" style={{ margin: 0, fontWeight: 700, fontSize: 11, fontFamily: 'monospace' }}>COMFY</Tag>
          <Text style={{ flex: 1, minWidth: 0, fontSize: 12, color: selectedProvider ? '#1e293b' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={selectedProviderName}>
            {selectedProviderName}
          </Text>
        </div>

        <div style={{ background: workflowJson ? '#f5f3ff' : '#f8fafc', borderRadius: 8, border: workflowJson ? '1px solid #ddd6fe' : '1px dashed #cbd5e1', padding: '8px 10px', flexShrink: 0 }}>
          <Text style={{ fontSize: 12, color: workflowJson ? '#5b21b6' : '#94a3b8', fontWeight: 700 }}>
            {workflowJson ? '工作流已载入' : '粘贴或连入工作流资产'}
          </Text>
          {parameters && Object.keys(parameters).length > 0 && <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>{Object.keys(parameters).length} 个参数端口</Text>}
        </div>

        <Button type="primary" danger={isRunning} block icon={isRunning ? <StopOutlined /> : <PlayCircleOutlined />} onClick={isRunning ? handleInterrupt : handleRun} style={{ height: 36, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          {isRunning ? '终止任务' : '发送到物理机'}
        </Button>

        <div style={{ flex: showPreview ? 1 : '0 0 auto', display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px dashed #94a3b8', minHeight: showPreview ? 120 : 'auto', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <Text style={{ fontSize: 12, color: '#64748b', fontWeight: 700, fontFamily: 'monospace' }}>&gt; GPU_OUTPUT</Text>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {resultContent && <Tooltip title="携带工作流血统保存到资产库"><Button type="text" size="small" icon={<SaveOutlined />} loading={savingAsset} onClick={handleSaveToAsset} style={{ color: '#722ed1', padding: 0, height: 'auto' }} /></Tooltip>}
              <Switch className="nodrag" size="small" checked={showPreview} onChange={value => setShowPreview(value)} />
            </div>
          </div>

          {showPreview && (
            <div style={{ flex: 1, position: 'relative', background: resultContent && !isMediaResult ? '#0f172a' : '#f1f5f9', borderRadius: 8, overflow: 'hidden', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
              {mediaDims && !isRunning && resultContent && <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(15,23,42,0.75)', color: '#f8fafc', fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4, zIndex: 10, fontFamily: 'monospace' }}>{mediaDims}</div>}
              {isRunning ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20 }}>
                  <Spin size="default" style={{ marginBottom: 12 }} />
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 700, color: '#722ed1' }}>{progressMsg}</Text>
                </div>
              ) : resultContent ? (
                isMediaResult ? (
                  isVideoResult ? (
                    <video src={previewMediaSrc} controls style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} onLoadedMetadata={event => setMediaDims(`${(event.target as HTMLVideoElement).videoWidth} x ${(event.target as HTMLVideoElement).videoHeight}`)} />
                  ) : (
                    <img src={previewMediaSrc} alt="ComfyUI Preview" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} onLoad={event => setMediaDims(`${(event.target as HTMLImageElement).naturalWidth} x ${(event.target as HTMLImageElement).naturalHeight}`)} />
                  )
                ) : (
                  <div className="nodrag nowheel" style={{ position: 'absolute', inset: 0, padding: 12, overflowY: 'auto', fontSize: 13, color: '#f8fafc', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{String(resultContent)}</div>
                )
              ) : (
                <Text type="secondary" style={{ fontSize: 13, color: '#475569' }}>等待物理机输出...</Text>
              )}
            </div>
          )}
        </div>
      </div>
      </BaseNode>
      <TypedHandle id="out" type="source" position={Position.Right} dataType="image" label="渲染产物" color="#722ed1" collapsed={nodeCollapsed} />
      {configPanel}
    </>
  )
}

nodeRegistry.register({ type: 'comfyUIEngine', displayName: '算力引擎节点', component: ComfyUIEngineNodeImpl })
export default ComfyUIEngineNodeImpl

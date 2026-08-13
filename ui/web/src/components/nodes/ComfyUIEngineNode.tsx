import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Position, type NodeProps, useReactFlow, useUpdateNodeInternals } from 'reactflow'
import { useParams } from 'react-router-dom'
import { useDrop } from 'react-dnd'
import { Button, Collapse, Input, Progress, Select, Space, Spin, Switch, Tag, Tooltip, Typography, message } from 'antd'
import { DownOutlined, PlayCircleOutlined, SaveOutlined, StopOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { providerApi } from '../../api/providers'
import { keyApi } from '../../api/keys'
import apiClient from '../../api/client'
import { createSSEClient, type SSEClient, type SSEMessage } from '../../utils/sse'
import { getTypeLabel, inferParamType } from '../../utils/handleTypes'
import { nodeRegistry } from '../../utils/nodeRegistry'
import { DndItemTypes } from '../../constants/dnd'
import { AspectRatioGrid, getAspectRatioSize, type AspectRatioResolution, type AspectRatioValue } from '../AspectRatioSelector'
import { CameraPanel, CameraTrigger, buildCameraPromptSuffix, type CustomCameraOptions } from '../CameraControl'
import { CameraMovementPanel, CameraMovementTrigger, type CameraMovementPreset } from '../CameraMovement'
import { useAssetLibraryStore } from '../../stores/assetLibraryStore'
import { useCanvasStore } from '../../stores/canvasStore'
import { BaseNode } from './BaseNode'
import { TypedHandle } from './TypedHandle'
import { NodeConfigToolbar } from './NodeConfigToolbar'
import { CopyContentButton } from './CopyContentButton'
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

/** 运行门槛：选了算力节点+凭证，或直接填了云端代理 Base URL，二者满足其一即可。 */
export function resolveComfyEngineRunGate(input: {
  selectedProvider?: string | null
  selectedKeyId?: number | null
  cloudBaseUrl?: string
}): { ok: boolean; reason?: string } {
  const hasProviderKey = Boolean(input.selectedProvider && Number(input.selectedKeyId))
  const hasDirectUrl = Boolean(String(input.cloudBaseUrl || '').trim())
  if (hasProviderKey || hasDirectUrl) return { ok: true }
  return { ok: false, reason: '请选择 ComfyUI 算力节点和执行凭证，或在配置面板填写云端代理 Base URL' }
}

export type ComfyJsonValidation = {
  status: 'empty' | 'ok' | 'error'
  nodeCount?: number
  paramCount?: number
  missingNodes?: string[]
  error?: string
}

export function validateComfyWorkflowJson(value: string): ComfyJsonValidation {
  const raw = String(value || '').trim()
  if (!raw) return { status: 'empty' }
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { status: 'error', error: '需要 JSON 对象（ComfyUI API 格式工作流）' }
    }
    const nodeCount = Object.values(parsed).filter(node => node && typeof node === 'object' && (node as any).class_type).length
    if (!nodeCount) return { status: 'error', error: '未识别到 class_type 节点，请粘贴 API 格式（非界面导出格式）的工作流' }
    return { status: 'ok', nodeCount }
  } catch (error: any) {
    return { status: 'error', error: `JSON 解析失败: ${String(error?.message || error)}` }
  }
}

export function validateComfyParameterMappingJson(value: string, workflow?: Record<string, any> | null): ComfyJsonValidation {
  const raw = String(value || '').trim()
  if (!raw) return { status: 'empty' }
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { status: 'error', error: '需要 JSON 对象' }
    const entries = Object.entries(parsed)
    const invalid = entries.find(([, config]) => !config || typeof config !== 'object'
      || !String((config as any).node_id || '').trim() || !String((config as any).field || '').trim())
    if (invalid) return { status: 'error', error: `参数 "${invalid[0]}" 缺少 node_id 或 field` }
    const missingNodes = workflow
      ? entries.filter(([, config]) => !workflow[String((config as any).node_id)]).map(([name]) => name)
      : []
    return { status: 'ok', paramCount: entries.length, missingNodes }
  } catch (error: any) {
    return { status: 'error', error: `JSON 解析失败: ${String(error?.message || error)}` }
  }
}

/** 扫描工作流常见节点（CLIPTextEncode / EmptyLatentImage / KSampler / LoadImage），自动生成参数映射。 */
export function generateComfyEngineParameterMapping(
  workflow: Record<string, any> | null | undefined,
): Record<string, { node_id: string; field: string }> {
  const mapping: Record<string, { node_id: string; field: string }> = {}
  if (!workflow || typeof workflow !== 'object') return mapping
  const entries = Object.entries(workflow).filter(([, node]) => node && typeof node === 'object' && (node as any).class_type)
  const classOf = (node: any) => String(node?.class_type || '')

  // KSampler 的 positive/negative 连接决定哪个 CLIPTextEncode 是正/负提示词
  const sampler = entries.find(([, node]) => /KSampler/i.test(classOf(node)))
  const samplerInputs = (sampler?.[1] as any)?.inputs || {}
  const positiveId = Array.isArray(samplerInputs.positive) ? String(samplerInputs.positive[0]) : ''
  const negativeId = Array.isArray(samplerInputs.negative) ? String(samplerInputs.negative[0]) : ''
  const textNodes = entries.filter(([, node]) => /CLIPTextEncode/i.test(classOf(node)) && typeof (node as any)?.inputs?.text === 'string')
  const positive = textNodes.find(([nodeId]) => nodeId === positiveId) || textNodes[0]
  const negative = textNodes.find(([nodeId]) => nodeId === negativeId && nodeId !== positive?.[0])
    || textNodes.find(([nodeId]) => nodeId !== positive?.[0])
  if (positive) mapping.positive_prompt = { node_id: positive[0], field: 'inputs/text' }
  if (negative) mapping.negative_prompt = { node_id: negative[0], field: 'inputs/text' }

  const latent = entries.find(([, node]) => /Empty.*LatentImage/i.test(classOf(node)) && (node as any)?.inputs?.width !== undefined)
  if (latent) {
    mapping.width = { node_id: latent[0], field: 'inputs/width' }
    mapping.height = { node_id: latent[0], field: 'inputs/height' }
  }
  if (sampler && samplerInputs.seed !== undefined) mapping.seed = { node_id: sampler[0], field: 'inputs/seed' }

  const loadImages = entries.filter(([, node]) => /^LoadImage/i.test(classOf(node)))
  loadImages.forEach(([nodeId], index) => {
    mapping[index === 0 ? 'input_image' : `input_image_${index + 1}`] = { node_id: nodeId, field: 'inputs/image' }
  })
  return mapping
}

/** 工作流里出现视频类节点（VHS / AnimateDiff / Wan / SVD 等）则按视频任务投递。 */
export function inferComfyWorkflowMediaType(workflow: Record<string, any> | null | undefined): 'image' | 'video' {
  if (!workflow || typeof workflow !== 'object') return 'image'
  const isVideoClass = Object.values(workflow).some(node =>
    /video|vhs|animatediff|wan\d*[._ ]|svd|hunyuan/i.test(String((node as any)?.class_type || '')))
  return isVideoClass ? 'video' : 'image'
}

/** ComfyUI 轮询没有精确百分比，按执行阶段给出指示性进度。 */
export function comfyPhaseProgressPercent(phase: string): number {
  const normalized = String(phase || '').toLowerCase()
  if (normalized === 'comfyui') return 10
  if (normalized === 'queued') return 20
  if (normalized === 'polling') return 55
  if (normalized === 'downloading') return 85
  if (normalized === 'completed') return 100
  return 35
}

/** 参数端口按节点高度百分比均匀分布，参数再多也不会悬出节点。 */
export function comfyParamHandleTop(index: number, count: number): string {
  if (count <= 1) return '55%'
  const start = 30
  const end = 88
  return `${Math.round(start + index * ((end - start) / (count - 1)))}%`
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
  outputSize?: { width: number; height: number } | null
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
    // 镜头后缀只拼进正向提示词，负面提示词不追加
    if (inferParamType(paramName) === 'text' && cameraSuffix && !/negative/i.test(paramName)) value = `${value}${cameraSuffix}`
    injectWorkflowValue(workflow, config, value)
  }

  // 比例面板选择的输出尺寸注入工作流；用户手填/连线的 width/height 优先
  if (input.outputSize && input.outputSize.width > 0 && input.outputSize.height > 0) {
    const userProvided = (name: string) => hasExplicitParamValue(connectedValues[name]) || hasExplicitParamValue(paramValues[name])
    if (!userProvided('width') && !userProvided('height')) {
      if (parameters?.width && parameters?.height) {
        injectWorkflowValue(workflow, parameters.width, input.outputSize.width)
        injectWorkflowValue(workflow, parameters.height, input.outputSize.height)
      } else {
        for (const node of Object.values(workflow)) {
          const record = node as any
          if (record && typeof record === 'object' && /Empty.*LatentImage/i.test(String(record.class_type || '')) && record.inputs) {
            record.inputs.width = input.outputSize.width
            record.inputs.height = input.outputSize.height
          }
        }
      }
    }
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

/** 从参数值（优先正向提示词）或工作流 CLIPTextEncode 里提取提示词文本，用于血缘记录。 */
export function resolveComfyEnginePromptText(
  params: Record<string, any> | null | undefined,
  workflow?: Record<string, any> | null,
): string {
  const paramEntries = Object.entries(params || {})
  const positive = paramEntries.find(([name, value]) => name === 'positive_prompt' && hasExplicitParamValue(value))
    || paramEntries.find(([name, value]) => inferParamType(name) === 'text' && !/negative/i.test(name) && hasExplicitParamValue(value))
  if (positive) return String(positive[1]).trim()
  const config = generateComfyEngineParameterMapping(workflow).positive_prompt
  const text = config ? (workflow as any)?.[config.node_id]?.inputs?.text : ''
  return typeof text === 'string' ? text.trim() : ''
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
  resolution?: AspectRatioResolution
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
    source_prompt: resolveComfyEnginePromptText(input.params ?? input.fallbackParams, input.workflow ?? input.fallbackWorkflow),
    source_aspect_ratio: input.aspectRatioValue,
    source_size: getAspectRatioSize(input.aspectRatioValue, input.customWidth, input.customHeight, input.resolution),
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
  const promptText = String(result.source_prompt || '').trim()
    || resolveComfyEnginePromptText(result.source_params, result.source_workflow)
  const promptSnippet = promptText.slice(0, 10)

  return {
    name: `${isVideo ? '🎬' : '🖼️'} ${promptSnippet ? `${promptSnippet}...` : 'ComfyUI 产物'}`,
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
      source_prompt: promptText,
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
  mediaType?: 'image' | 'video'
}) {
  const payload: any = {
    api_key_id: Number(input.selectedKeyId) || undefined,
    provider: input.selectedProvider || undefined,
    model: 'comfyui-workflow',
    type: input.mediaType || 'image',
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
  const [activePanel, setActivePanel] = useState<'camera' | 'movement' | null>(null)
  const [aspectRatioValue, setAspectRatioValue] = useState<AspectRatioValue>(data?.aspectRatioValue ?? data?.aspectRatio ?? '16:9')
  const [customWidth, setCustomWidth] = useState(Number(data?.customWidth || 1280))
  const [customHeight, setCustomHeight] = useState(Number(data?.customHeight || 720))
  const [resolution, setResolution] = useState<AspectRatioResolution>(data?.resolution || '1k')
  const [cameraParams, setCameraParams] = useState<Record<string, string>>(data?.cameraParams || {})
  const [customCameraOptions, setCustomCameraOptions] = useState<CustomCameraOptions>(data?.customCameraOptions || {})
  const [customMovements, setCustomMovements] = useState<CameraMovementPreset[]>(data?.customMovements || [])
  const [quickOpen, setQuickOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [progressMsg, setProgressMsg] = useState('')
  const [progressPhase, setProgressPhase] = useState('')
  const [showPreview, setShowPreview] = useState(Boolean(data?.showPreview ?? true))
  const [result, setResult] = useState<any>(data?.result || null)
  const [mediaDims, setMediaDims] = useState('')
  const [savingAsset, setSavingAsset] = useState(false)
  const nodeRef = useRef<HTMLDivElement>(null)
  const sseClientRef = useRef<SSEClient | null>(null)
  const prevRunSignalRef = useRef(data?._runSignal)
  const runLineageRef = useRef<{ workflow: any; params: any; sourceAssetIds?: number[] } | null>(null)

  const parameters = useMemo(() => parseJsonObject(parametersJson, null), [parametersJson])
  const parsedWorkflow = useMemo(() => parseJsonObject(workflowJson.trim(), null), [workflowJson])
  const workflowValidation = useMemo(() => validateComfyWorkflowJson(workflowJson), [workflowJson])
  const mappingValidation = useMemo(() => validateComfyParameterMappingJson(parametersJson, parsedWorkflow), [parametersJson, parsedWorkflow])
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
      resolution,
      cameraParams,
      customCameraOptions,
      customMovements,
      showPreview,
      result,
    })
  }, [id, selectedProvider, selectedKeyId, workflowJson, parameters, paramValues, cloudBaseUrl, runninghubApiKey, comfyInputDir, aspectRatioValue, customWidth, customHeight, resolution, cameraParams, customCameraOptions, customMovements, showPreview, result, updateNodeData])

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

  useEffect(() => {
    if ((!configOpen && !quickOpen) || typeof document === 'undefined') return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const insidePopup = target.closest('.ant-select-dropdown, .ant-tooltip, .ant-popover, .ant-dropdown, .ant-color-picker')
      if (!target.closest('[data-config-panel]') && !target.closest('.react-flow__node') && !insidePopup) {
        setConfigOpen(false)
        setQuickOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [configOpen, quickOpen])

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
    const ratioSize = getAspectRatioSize(aspectRatioValue, customWidth, customHeight, resolution)
    const [sizeWidth, sizeHeight] = ratioSize.split('*').map(Number)
    const outputSize = Number.isFinite(sizeWidth) && Number.isFinite(sizeHeight) && sizeWidth > 0 && sizeHeight > 0
      ? { width: sizeWidth, height: sizeHeight }
      : null
    return {
      ...applyComfyEngineParametersToWorkflow({ workflow, parameters: activeParameters, paramValues, connectedValues, cameraParams, outputSize }),
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
      resolution,
      cameraParams,
      sourceAssetIds: lineage?.sourceAssetIds,
    })
    setResult(resultWithLineage)
    updateNodeData(id, { result: resultWithLineage })
    setNodeStatus(id, 'success')
    setIsRunning(false)
    setProgressMsg('')
    setProgressPhase('')
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
    setProgressPhase('')
    sseClientRef.current?.disconnect()
    sseClientRef.current = null
  }

  const handleSSEMessage = (msg: SSEMessage) => {
    if (msg.type === 'status') {
      setProgressMsg(String(msg.message || msg.progress || 'ComfyUI 正在执行...'))
      if ((msg as any).phase) setProgressPhase(String((msg as any).phase))
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
    const runGate = resolveComfyEngineRunGate({ selectedProvider, selectedKeyId, cloudBaseUrl })
    if (!runGate.ok) {
      setNodeStatus(id, 'error')
      return message.warning(runGate.reason)
    }

    let waitingForSSE = false
    try {
      const { workflow, activeParameters, sourceAssetIds } = buildWorkflowForRun()
      runLineageRef.current = { workflow, params: paramValues, sourceAssetIds }
      setIsRunning(true)
      setProgressMsg('正在连接实时通道...')
      setProgressPhase('')
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
        mediaType: inferComfyWorkflowMediaType(workflow),
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
        setProgressPhase('')
      }
    }
  }

  const handleGenerateMapping = () => {
    const workflow = parsedWorkflow || parseJsonObject(findIncomingWorkflow()?.workflowJson || '', null)
    if (!workflow) return message.warning('请先粘贴或连入有效的工作流 JSON')
    const mapping = generateComfyEngineParameterMapping(workflow)
    if (!Object.keys(mapping).length) return message.info('未识别到常见可暴露节点（CLIPTextEncode / EmptyLatentImage / KSampler / LoadImage）')
    const nextJson = JSON.stringify(mapping, null, 2)
    setParametersJson(nextJson)
    updateNodeData(id, { parameters: mapping })
    message.success(`已生成 ${Object.keys(mapping).length} 个参数映射`)
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
    const paramNames = Object.keys(parameters)
    return paramNames.map((paramName, index) => {
      const paramType = inferParamType(paramName)
      return (
        <TypedHandle key={paramName} id={`param-${paramName}`} type="target" position={Position.Left} dataType={paramType} label={`参数 ${paramName}`} top={comfyParamHandleTop(index, paramNames.length)} collapsed={nodeCollapsed} />
      )
    })
  }

  const quickPanel = (
    <NodeConfigToolbar open={quickOpen} onClose={() => setQuickOpen(false)} title="算力与凭证" width={320} position={Position.Top}>
      <Space.Compact block>
        <Select
          value={selectedProvider || undefined}
          placeholder="选择 ComfyUI 节点"
          size="small"
          style={{ flex: 1 }}
          options={providers.map(provider => ({ label: provider.display_name || provider.id, value: provider.id }))}
          onChange={value => { setSelectedProvider(value); setSelectedKeyId(null); updateNodeData(id, { selectedProvider: value, selectedKeyId: null }) }}
        />
        <Select
          value={selectedKeyId || undefined}
          placeholder="执行凭证"
          size="small"
          disabled={!selectedProvider}
          style={{ width: 130 }}
          options={availableKeys.map(key => ({ label: key.description || `Key ${key.id}`, value: Number(key.id) }))}
          onChange={value => { setSelectedKeyId(Number(value)); updateNodeData(id, { selectedKeyId: Number(value) }) }}
        />
      </Space.Compact>
    </NodeConfigToolbar>
  )

  const configPanel = (
    <NodeConfigToolbar open={configOpen} onClose={() => setConfigOpen(false)} title="算力引擎配置" width={400}>
      <Collapse
        size="small"
        defaultActiveKey={['workflow']}
        items={[
          {
            key: 'proxy',
            label: '云端代理（可选）',
            children: (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Input size="small" value={cloudBaseUrl} onChange={event => setCloudBaseUrl(event.target.value)} placeholder="RunningHub / 云端 ComfyUI Base URL" />
                <Input.Password size="small" value={runninghubApiKey} onChange={event => setRunninghubApiKey(event.target.value)} placeholder="RunningHub API Key（Base URL 未含 key 时使用）" />
                <Input size="small" value={comfyInputDir} onChange={event => setComfyInputDir(event.target.value)} placeholder="ComfyUI input 目录，用于本地素材映射" />
                <Text type="secondary" style={{ fontSize: 10 }}>填写 Base URL 后可直接运行，无需再选算力节点与凭证。Key 会随画布数据保存在本机工作区，分享画布前请先清空。</Text>
              </Space>
            ),
          },
          {
            key: 'workflow',
            label: '工作流 JSON',
            children: (
              <div style={{ display: 'grid', gap: 6 }}>
                <TextArea
                  className="nodrag nowheel"
                  value={workflowJson}
                  onChange={event => setWorkflowJson(event.target.value)}
                  autoSize={{ minRows: 6, maxRows: 12 }}
                  placeholder="粘贴 ComfyUI workflow JSON（API 格式），或连入 workflow 资产到左侧紫色端口"
                  status={workflowValidation.status === 'error' ? 'error' : undefined}
                  style={{ fontSize: 12, fontFamily: 'monospace', borderRadius: 8 }}
                />
                {workflowValidation.status === 'ok' && <Text style={{ fontSize: 10, color: '#16a34a' }}>✓ 已识别 {workflowValidation.nodeCount} 个节点</Text>}
                {workflowValidation.status === 'error' && <Text style={{ fontSize: 10, color: '#dc2626' }}>{workflowValidation.error}</Text>}
              </div>
            ),
          },
          {
            key: 'mapping',
            label: '参数映射 JSON',
            children: (
              <div style={{ display: 'grid', gap: 6 }}>
                <Button size="small" icon={<ThunderboltOutlined />} onClick={handleGenerateMapping} disabled={workflowValidation.status !== 'ok' && !findIncomingWorkflow()}>
                  从工作流自动生成
                </Button>
                <TextArea
                  className="nodrag nowheel"
                  value={parametersJson}
                  onChange={event => setParametersJson(event.target.value)}
                  autoSize={{ minRows: 4, maxRows: 8 }}
                  placeholder={'例如：{"positive_prompt":{"node_id":"6","field":"inputs/text"}}'}
                  status={mappingValidation.status === 'error' ? 'error' : undefined}
                  style={{ fontSize: 12, fontFamily: 'monospace', borderRadius: 8 }}
                />
                {mappingValidation.status === 'ok' && (
                  <Text style={{ fontSize: 10, color: mappingValidation.missingNodes?.length ? '#d97706' : '#16a34a' }}>
                    {mappingValidation.missingNodes?.length
                      ? `⚠ ${mappingValidation.missingNodes.join('、')} 指向的节点不在当前工作流中`
                      : `✓ ${mappingValidation.paramCount} 个参数端口`}
                  </Text>
                )}
                {mappingValidation.status === 'error' && <Text style={{ fontSize: 10, color: '#dc2626' }}>{mappingValidation.error}</Text>}
              </div>
            ),
          },
          {
            key: 'camera',
            label: '尺寸与镜头',
            children: (
              <div style={{ display: 'grid', gap: 8 }}>
                <AspectRatioGrid
                  value={aspectRatioValue}
                  customWidth={customWidth}
                  customHeight={customHeight}
                  resolution={resolution}
                  onChange={(next) => setAspectRatioValue(next)}
                  onCustomSizeChange={(width, height) => { setCustomWidth(width); setCustomHeight(height) }}
                  onResolutionChange={(next) => setResolution(next)}
                />
                <Text type="secondary" style={{ fontSize: 10 }}>选定尺寸会注入工作流的出图节点（EmptyLatentImage 或映射的 width/height）；选"自适应"则保持工作流原尺寸。</Text>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <CameraTrigger value={cameraParams} onClick={() => setActivePanel(activePanel === 'camera' ? null : 'camera')} />
                  <CameraMovementTrigger onClick={() => setActivePanel(activePanel === 'movement' ? null : 'movement')} />
                </div>
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
            ),
          },
          ...(parameters && Object.keys(parameters).length > 0 ? [{
            key: 'params',
            label: '暴露参数',
            children: (
              <div style={{ display: 'grid', gap: 8 }}>
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
            ),
          }] : []),
        ]}
      />
    </NodeConfigToolbar>
  )

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
        <div
          className="nodrag"
          onClick={() => { setQuickOpen(v => !v); setConfigOpen(false) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', background: quickOpen ? '#f5f3ff' : '#fff' }}
        >
          <Tag color="#722ed1" style={{ margin: 0, fontWeight: 700, fontSize: 11, fontFamily: 'monospace' }}>COMFY</Tag>
          <Text style={{ flex: 1, minWidth: 0, fontSize: 12, color: selectedProvider ? '#1e293b' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={selectedProviderName}>
            {selectedProviderName}
          </Text>
          <DownOutlined style={{ fontSize: 10, color: '#94a3b8', transform: quickOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
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
            <Text style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>渲染结果</Text>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {resultContent && (
                <CopyContentButton
                  kind={isVideoResult ? 'video' : isMediaResult ? 'image' : 'text'}
                  value={isMediaResult ? previewMediaSrc : String(resultContent)}
                  style={{ color: '#722ed1', padding: 0, height: 'auto' }}
                />
              )}
              {resultContent && <Tooltip title="携带工作流血统保存到资产库"><Button type="text" size="small" icon={<SaveOutlined />} loading={savingAsset} onClick={handleSaveToAsset} style={{ color: '#722ed1', padding: 0, height: 'auto' }} /></Tooltip>}
              <Switch className="nodrag" size="small" checked={showPreview} onChange={value => setShowPreview(value)} />
            </div>
          </div>

          {showPreview && (
            <div style={{ flex: 1, position: 'relative', background: resultContent && !isMediaResult ? '#0f172a' : '#f1f5f9', borderRadius: 8, overflow: 'hidden', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
              {mediaDims && !isRunning && resultContent && <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(15,23,42,0.75)', color: '#f8fafc', fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4, zIndex: 10, fontFamily: 'monospace' }}>{mediaDims}</div>}
              {isRunning ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, width: '100%' }}>
                  <Spin size="default" style={{ marginBottom: 12 }} />
                  <Progress
                    percent={comfyPhaseProgressPercent(progressPhase)}
                    status="active"
                    showInfo={false}
                    strokeColor="#722ed1"
                    style={{ width: '80%', margin: '0 0 8px' }}
                  />
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, color: '#722ed1', textAlign: 'center' }}>{progressMsg}</Text>
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
      {quickPanel}
      {configPanel}
    </>
  )
}

nodeRegistry.register({ type: 'comfyUIEngine', displayName: '算力引擎节点', component: ComfyUIEngineNodeImpl })
export default ComfyUIEngineNodeImpl

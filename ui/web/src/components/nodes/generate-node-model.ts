import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { Handle, Position, type NodeProps, useReactFlow, useUpdateNodeInternals } from 'reactflow'
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
import { pickMediaResultContent } from '../../utils/mediaResult'
import { buildAssetMediaUrl } from '../../utils/assetMedia'

const { TextArea } = Input
const { Text } = Typography

export const MODES = [
  { label: 'Chat', value: 'chat' },
  { label: 'Vision', value: 'vision' },
  { label: 'T2I', value: 'text_to_image' },
  { label: 'I2I', value: 'image_to_image' },
  { label: 'T2V', value: 'text_to_video' },
  { label: 'I2V', value: 'image_to_video' },
]

export const GENERATE_NODE_ASPECT_RATIO_OPTIONS = SHARED_ASPECT_RATIOS

export const GENERATE_NODE_ROUTING_STRATEGY_OPTIONS = [
  { label: '平衡优先', value: 'balanced' },
  { label: '成本优先', value: 'cost' },
  { label: '速度优先', value: 'speed' },
  { label: '随机均衡', value: 'random' },
]

export function getGenerateNodeAspectRatioSize(value: AspectRatioValue, customWidth = 1024, customHeight = 1024) {
  return getAspectRatioSize(value, customWidth, customHeight)
}

export const PRESET_ROLES = [
  { label: '提示词优化大师', name: '提示词优化大师', prompt: '你是顶级 Prompt Engineer。把输入转化为极致详细的英文 Prompt，并给出负面 Prompt。' },
  { label: '金牌编剧大师', name: '金牌编剧大师', prompt: '你是好莱坞金牌编剧。扩写场景描述，不仅要无中生有，还能解读现成的文本、小说、书籍等，极具画面感。并且要能一次性生成全部的剧本。' },
]

export const DEFAULT_ROLE = { id: '_free_agent', name: '🧠 自由智能体', prompt: '你是一个万能 AI 助手，严格遵循用户指令。' }

function extractJsonArray(text: string): any[] | null {
  const cleaned = text.replace(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/g, '$1').trim()
  try { const parsed = JSON.parse(cleaned); if (Array.isArray(parsed)) return parsed } catch {}
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (match) {
    try { const parsed = JSON.parse(match[0]); if (Array.isArray(parsed)) return parsed } catch {}
  }
  return null
}

export function normalizeGenerateNodeImageUrl(content: string) {
  const value = String(content || '').trim()
  if (!value) return ''
  if (value.startsWith('/api/assets/media/')) return value
  if (value.startsWith('/api/files/')) return value
  try {
    const url = new URL(value)
    if (url.pathname.startsWith('/api/assets/media/')) {
      return `/api/assets/media/${url.pathname.slice('/api/assets/media/'.length)}${url.search}${url.hash}`
    }
    if (url.pathname.startsWith('/api/files/')) {
      return `/api/files/${url.pathname.slice('/api/files/'.length)}${url.search}${url.hash}`
    }
  } catch {}
  if (/^(https?:|data:|blob:)/i.test(value)) return value
  return `/api/assets/media/${encodeURIComponent(value.replace(/^\/+/, ''))}`
}

export function resolveGenerateNodePreviewMediaSrc(content: string, apiBaseURL?: string) {
  const value = String(content || '').trim()
  if (!value) return ''
  return buildAssetMediaUrl(value, apiBaseURL)
}

export function resolveGenerateNodeSourceContent(sourceData: any) {
  const assetData = sourceData?.asset?.data
  const incomingData = sourceData?.incoming_data
  const assetIsCharacter = sourceData?.asset?.type === 'character'
  const candidates = [
    sourceData?.result?.content,
    sourceData?.result?.file_path,
    sourceData?.result?.url,
    pickMediaResultContent(sourceData?.result),
    assetIsCharacter ? assetData?.core_prompt : assetData?.content,
    assetIsCharacter ? assetData?.content : assetData?.core_prompt,
    assetData?.file_path,
    assetData?.url,
    pickMediaResultContent(assetData),
    incomingData?.core_prompt,
    incomingData?.content,
    incomingData?.file_path,
    incomingData?.url,
    pickMediaResultContent(incomingData),
    typeof incomingData === 'string' ? incomingData : '',
  ]
  const found = candidates.find(value => value !== undefined && value !== null && String(value).trim())
  return found === undefined || found === null ? '' : String(found)
}

export type GenerateNodeIncomingAsset = {
  id?: number
  type: 'image' | 'prompt'
  content?: string
  file_path?: string
  url?: string
  source_asset_ids?: number[]
}

export type ParsedCanvasSkillCommand = { packId?: string; name: string; argumentsText: string }

const canvasSkillToken = '[A-Za-z0-9][A-Za-z0-9._-]*'
const canvasSkillCommandPattern = new RegExp(`^\\/(${canvasSkillToken})(?::(${canvasSkillToken}))?(?:[ \\t]+([\\s\\S]*))?$`)
const canvasSkillCommandIdentityKeyPattern = new RegExp(`^(?:${canvasSkillToken})?:${canvasSkillToken}$`)

export function parseCanvasSkillCommand(input: string): ParsedCanvasSkillCommand | null {
  if (typeof input !== 'string') return null
  const match = input.match(canvasSkillCommandPattern)
  if (!match) return null
  return match[2]
    ? { packId: match[1], name: match[2], argumentsText: match[3] ?? '' }
    : { name: match[1], argumentsText: match[3] ?? '' }
}

export function resolveGenerateNodeSkillArguments(input: {
  command?: ParsedCanvasSkillCommand | null
  skillArguments?: Record<string, string>
  commandSkillArguments?: Record<string, string>
  effectiveSkillArgumentSpecs?: Array<{ name: string }> | null
}): Record<string, string> | undefined {
  if (!input.command) {
    const dropdownEntries = Object.entries(input.skillArguments || {})
    return dropdownEntries.length ? Object.fromEntries(dropdownEntries) : undefined
  }
  if (!Array.isArray(input.effectiveSkillArgumentSpecs)) return undefined

  const entries = Object.entries(input.commandSkillArguments || {})
  const declaredNames = new Set(input.effectiveSkillArgumentSpecs.map(spec => String(spec?.name || '').trim()).filter(Boolean))
  const resolvedEntries = entries.filter(([name]) => declaredNames.has(name))
  return resolvedEntries.length ? Object.fromEntries(resolvedEntries) : undefined
}

export type GenerateNodeCommandSkillArgumentsByCommand = Record<string, Record<string, string>>

export function normalizeGenerateNodeCommandSkillArgumentsByCommand(value: unknown): GenerateNodeCommandSkillArgumentsByCommand {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).flatMap(([commandKey, argumentsValue]) => {
    if (!canvasSkillCommandIdentityKeyPattern.test(commandKey)) return []
    if (!argumentsValue || typeof argumentsValue !== 'object' || Array.isArray(argumentsValue)) return []
    const normalizedArguments = Object.fromEntries(
      Object.entries(argumentsValue as Record<string, unknown>).filter(([, argumentValue]) => typeof argumentValue === 'string'),
    )
    return Object.keys(normalizedArguments).length ? [[commandKey, normalizedArguments]] : []
  }))
}

export function normalizeGenerateNodeCompilerModelId(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && !/^\d+$/.test(value.trim())) return null

  const normalized = Number(typeof value === 'string' ? value.trim() : value)
  return Number.isSafeInteger(normalized) && normalized >= 0 ? normalized : null
}

export function buildGenerateNodeSkillIdentity(input: {
  command?: ParsedCanvasSkillCommand | null
  selectedPackId?: string
  selectedName?: string
  selectedRevision?: string
  resolvedCommandSkill?: { packId?: string; revision?: string } | null
}) {
  if (input.command) {
    return {
      packId: String(input.command.packId || input.resolvedCommandSkill?.packId || ''),
      name: String(input.command.name || ''),
      revision: String(input.resolvedCommandSkill?.revision || ''),
    }
  }
  return {
    packId: String(input.selectedPackId || ''),
    name: String(input.selectedName || ''),
    revision: String(input.selectedRevision || ''),
  }
}

export type GenerateNodePreviewRequestToken = {
  requestId: number
  fingerprint: string
}

export function createGenerateNodePreviewRequestTracker() {
  let activeRequestId = 0
  return {
    start(fingerprint: string): GenerateNodePreviewRequestToken {
      activeRequestId += 1
      return { requestId: activeRequestId, fingerprint }
    },
    invalidate() {
      activeRequestId += 1
    },
    isCurrent(token: GenerateNodePreviewRequestToken, currentFingerprint: string) {
      return token.requestId === activeRequestId && token.fingerprint === currentFingerprint
    },
  }
}

function normalizeGenerateNodeSourceAssetIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map(item => Number(item)).filter(id => Number.isFinite(id) && id > 0)
}

export function resolveGenerateNodeSourceAssetIds(sourceData: any): number[] {
  const ids = [
    ...normalizeGenerateNodeSourceAssetIds(sourceData?.source_asset_ids),
    ...normalizeGenerateNodeSourceAssetIds(sourceData?.sourceAssetIds),
    ...normalizeGenerateNodeSourceAssetIds(sourceData?.result?.source_asset_ids),
    ...normalizeGenerateNodeSourceAssetIds(sourceData?.result?.sourceAssetIds),
    ...normalizeGenerateNodeSourceAssetIds(sourceData?.incoming_data?.source_asset_ids),
    ...normalizeGenerateNodeSourceAssetIds(sourceData?.incoming_data?.sourceAssetIds),
  ]
  const directId = Number(sourceData?.asset?.id ?? sourceData?.asset_id ?? sourceData?.assetId ?? sourceData?.result?.asset_id ?? sourceData?.incoming_data?.asset_id ?? 0)
  if (Number.isFinite(directId) && directId > 0) ids.unshift(directId)
  return Array.from(new Set(ids))
}

export type GenerateNodeIncomingContextSnapshot = {
  incomingAssets: GenerateNodeIncomingAsset[]
  externalSystemPrompt: string
  fingerprint: string
}

export function buildGenerateNodeIncomingContextSnapshot(input: {
  nodeId: string
  edges: Array<{ source: string; target: string; targetHandle?: string | null }>
  nodes: Array<{ id: string; data?: any }>
}): GenerateNodeIncomingContextSnapshot {
  const incomingAssets: GenerateNodeIncomingAsset[] = []
  let externalSystemPrompt = ''
  input.edges.filter(edge => edge.target === input.nodeId).forEach(edge => {
    const sourceNode = input.nodes.find(node => node.id === edge.source)
    if (!sourceNode) return
    const sourceContent = resolveGenerateNodeSourceContent(sourceNode.data)
    const sourceAssetIds = resolveGenerateNodeSourceAssetIds(sourceNode.data)
    const sourceAssetId = sourceAssetIds[0]
    if (edge.targetHandle === 'text' && sourceContent) {
      incomingAssets.push({ id: sourceAssetId, type: 'prompt', content: String(sourceContent), source_asset_ids: sourceAssetIds })
    } else if (edge.targetHandle === 'image' && sourceContent) {
      const url = normalizeGenerateNodeImageUrl(String(sourceContent))
      incomingAssets.push({ id: sourceAssetId, type: 'image', file_path: url, url, source_asset_ids: sourceAssetIds })
    } else if (edge.targetHandle === 'system' && sourceContent) {
      externalSystemPrompt = String(sourceContent)
    }
  })
  return {
    incomingAssets,
    externalSystemPrompt,
    fingerprint: JSON.stringify({ incomingAssets, externalSystemPrompt }),
  }
}

export function areGenerateNodeIncomingContextSnapshotsEqual(
  left: GenerateNodeIncomingContextSnapshot,
  right: GenerateNodeIncomingContextSnapshot,
) {
  return left.fingerprint === right.fingerprint
}

function normalizeGenerateNodeIncomingAsset(asset: any): GenerateNodeIncomingAsset | null {
  if (!asset || typeof asset !== 'object') return null
  const id = Number.isFinite(Number(asset.id)) ? Number(asset.id) : undefined
  const sourceAssetIds = Array.from(new Set([
    ...(id ? [id] : []),
    ...normalizeGenerateNodeSourceAssetIds(asset.source_asset_ids),
    ...normalizeGenerateNodeSourceAssetIds(asset.sourceAssetIds),
  ]))
  const type = String(asset.type || '').toLowerCase()
  if (type === 'image') {
    const rawUrl = asset.url || asset.file_path || asset.filePath || asset.content || ''
    const url = normalizeGenerateNodeImageUrl(String(rawUrl || ''))
    if (!url) return null
    return { id, type: 'image', file_path: url, url, ...(sourceAssetIds.length ? { source_asset_ids: sourceAssetIds } : {}) }
  }
  const content = String(asset.content || asset.text || '').trim()
  if (!content) return null
  return { id, type: 'prompt', content, ...(sourceAssetIds.length ? { source_asset_ids: sourceAssetIds } : {}) }
}

export function isGenerateNodeMuted(nodes: Array<{ id: string; parentNode?: string; data?: any }>, nodeId: string) {
  const node = nodes.find(item => item.id === nodeId)
  if (!node) return false
  if (node.data?._muted) return true
  if (!node.parentNode) return false
  const parent = nodes.find(item => item.id === node.parentNode)
  return Boolean(parent?.data?._muted)
}

export function buildGenerateNodeAssetPayload(input: {
  resultContent: string
  mode: string
  prompt: string
  selectedModel: string
  provider: string
  selectedRolePrompt: string
  params: Record<string, any>
  temperature: number
  aspectRatio: string
  ratioSize: string
  projectId?: number | null
  cameraParams?: Record<string, string>
  sourceAssetIds?: number[] | null
  compiledPrompt?: string
  compiledNegativePrompt?: string
  skillPackId?: string
  skillPackSource?: string
  skillName?: string
  skillRevision?: string
  compiledReferences?: unknown[]
  compiledInputHash?: string
  warnings?: string[]
  compilerModelId?: number | string | null
}) {
  const contentStr = String(input.resultContent || '')
  const looksLikeVideo = input.mode.includes('video') || /^(data:video)/i.test(contentStr) || /\.(mp4|webm|mov)(\?|$)/i.test(contentStr)
  const looksLikeImage = !looksLikeVideo && (input.mode.includes('image') || /^(data:image)/i.test(contentStr) || /\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(contentStr))
  const assetType: 'prompt' | 'image' | 'video' = looksLikeVideo ? 'video' : looksLikeImage ? 'image' : 'prompt'
  const mediaFields = assetType === 'prompt' ? {} : { file_path: contentStr, url: contentStr }
  const cameraParams = input.cameraParams || {}
  const cameraSuffix = buildCameraPromptSuffix(cameraParams)
  const sourceAssetIds = Array.isArray(input.sourceAssetIds)
    ? input.sourceAssetIds.map(item => Number(item)).filter(id => Number.isFinite(id))
    : []
  const hasCompileProvenance = Boolean(input.compiledPrompt || input.compiledInputHash || input.skillName)

  return {
    name: `${assetType === 'image' ? '🖼️' : assetType === 'video' ? '🎬' : '📝'} ${input.prompt.slice(0, 10) || input.selectedModel}...`,
    type: assetType,
    ...(assetType === 'prompt' ? {} : { file_path: contentStr }),
    ...(sourceAssetIds.length ? { source_asset_ids: sourceAssetIds } : {}),
    data: {
      content: contentStr,
      ...mediaFields,
      ...(sourceAssetIds.length ? { source_asset_ids: sourceAssetIds } : {}),
      source_provider: input.provider,
      source_model: input.selectedModel,
      source_mode: input.mode,
      source_prompt: input.prompt,
      source_system: input.selectedRolePrompt,
      source_params: { ...input.params, temperature: input.temperature, size: input.ratioSize },
      source_aspect_ratio: input.aspectRatio,
      source_size: input.ratioSize,
      source_camera_params: Object.keys(cameraParams).length > 0 ? cameraParams : null,
      source_camera_suffix: cameraSuffix || null,
      ...(hasCompileProvenance && input.compiledPrompt !== undefined ? { compiled_prompt: input.compiledPrompt } : {}),
      ...(hasCompileProvenance && input.compiledNegativePrompt !== undefined ? { compiled_negative_prompt: input.compiledNegativePrompt } : {}),
      ...(hasCompileProvenance && input.skillPackId ? { skill_pack_id: input.skillPackId } : {}),
      ...(hasCompileProvenance && input.skillPackSource ? { skill_pack_source: input.skillPackSource } : {}),
      ...(hasCompileProvenance && input.skillName ? { skill_name: input.skillName } : {}),
      ...(hasCompileProvenance && input.skillRevision ? { skill_revision: input.skillRevision } : {}),
      ...(hasCompileProvenance && Array.isArray(input.compiledReferences) ? { compiled_references: input.compiledReferences } : {}),
      ...(hasCompileProvenance && input.compiledInputHash ? { compiled_input_hash: input.compiledInputHash } : {}),
      ...(hasCompileProvenance && Array.isArray(input.warnings) ? { warnings: input.warnings } : {}),
      ...(hasCompileProvenance && input.compilerModelId !== undefined && input.compilerModelId !== null ? { compiler_model_id: input.compilerModelId } : {}),
    },
    tags: ['AI_Generated', input.mode, input.selectedModel],
    thumbnail: assetType === 'image' ? contentStr : undefined,
    project_id: input.projectId || null,
  }
}

export function normalizeGenerateNodeGenerationPacket(packet: any) {
  const root = packet && typeof packet === 'object' ? packet : {}
  const data = root?.data
  const base = root?.result && typeof root.result === 'object'
    ? root.result
    : data?.result && typeof data.result === 'object'
      ? data.result
      : data && typeof data === 'object'
        ? data
        : root
  const mediaContent = pickMediaResultContent(base) || pickMediaResultContent(root) || pickMediaResultContent(data?.result) || pickMediaResultContent(data)
  const fallbackContent = mediaContent || (data ?? packet)
  const content = base?.content ?? root?.content ?? root?.result?.content ?? data?.content ?? data?.result?.content ?? fallbackContent
  const sourceAssetIds = Array.isArray(root?.source_asset_ids)
    ? root.source_asset_ids
    : Array.isArray(base?.source_asset_ids)
      ? base.source_asset_ids
      : []
  const compileAuditKeys = [
    'skill_pack_id',
    'skill_pack_source',
    'skill_name',
    'skill_revision',
    'compiled_prompt',
    'compiled_negative_prompt',
    'compiled_references',
    'compiled_input_hash',
    'warnings',
    'compiler_model_id',
    'raw_prompt',
  ] as const
  const compileAudit = Object.fromEntries(compileAuditKeys.flatMap(key => {
    const value = base?.[key] ?? data?.result?.[key] ?? data?.[key] ?? root?.result?.[key] ?? root?.[key]
    return value === undefined ? [] : [[key, value]]
  }))
  if (base && typeof base === 'object' && !Array.isArray(base)) {
    return {
      ...base,
      ...compileAudit,
      content,
      ...(sourceAssetIds.length ? { source_asset_ids: sourceAssetIds } : {}),
    }
  }
  return typeof content === 'string'
    ? { content, ...compileAudit, ...(sourceAssetIds.length ? { source_asset_ids: sourceAssetIds } : {}) }
    : content || packet
}

export function buildGenerateNodeResultWithFission(input: {
  packet: any
  fissionEnabled?: boolean
  expectedCount?: number | null
  onCountMismatch?: (input: { expected: number | null; actual: number }) => void
}) {
  let finalResult: any = normalizeGenerateNodeGenerationPacket(input.packet)
  if (!input.fissionEnabled || typeof finalResult?.content !== 'string') return finalResult

  const parsed = extractJsonArray(finalResult.content)
  const normalizedItems = Array.isArray(parsed)
    ? parsed
      .map(item => {
        if (typeof item === 'string') return item.trim()
        if (item && typeof item === 'object') {
          const candidate = item.prompt ?? item.text ?? item.content ?? ''
          return typeof candidate === 'string' ? candidate.trim() : ''
        }
        return ''
      })
      .filter(Boolean)
    : []
  const expectedCount = input.expectedCount ?? null
  const countMatched = expectedCount === null || normalizedItems.length === expectedCount
  if (normalizedItems.length > 1 && countMatched) {
    return { ...finalResult, _fission: true, items: normalizedItems }
  }
  if (normalizedItems.length > 1 && !countMatched) {
    input.onCountMismatch?.({ expected: expectedCount, actual: normalizedItems.length })
  }
  return finalResult
}

export function buildGenerateNodeRequestPayload(input: {
  id: string
  prompt: string
  selectedKey: number | string | null | undefined
  provider: string
  selectedModel: string
  mode: string
  routingStrategy: string
  params: Record<string, any>
  temperature: number
  ratioSize: string
  selectedRolePrompt: string
  cameraSuffix?: string
  incomingImage?: string
  incomingAssets?: GenerateNodeIncomingAsset[]
  externalSystemPrompt?: string
  systemPromptOverride?: string
  skillPackId?: string
  skillName?: string
  skillRevision?: string
  skillCompileEnabled?: boolean
  skillCompilerModelId?: number | string | null
  skillArguments?: Record<string, string>
  commandSkillArguments?: Record<string, string>
  effectiveSkillArgumentSpecs?: Array<{ name: string }> | null
  compiledInputHash?: string
}) {
  const finalPromptText = `${input.prompt || ''}${input.cameraSuffix || ''}`
  const activeSystemPrompt = input.externalSystemPrompt || input.systemPromptOverride || input.selectedRolePrompt
  const normalizedIncomingAssets = (input.incomingAssets || [])
    .map(normalizeGenerateNodeIncomingAsset)
    .filter((asset): asset is GenerateNodeIncomingAsset => Boolean(asset))
  if (input.incomingImage && !normalizedIncomingAssets.some(asset => asset.type === 'image' && asset.url === input.incomingImage)) {
    normalizedIncomingAssets.unshift({ type: 'image', file_path: input.incomingImage, url: input.incomingImage })
  }
  const incomingImages = normalizedIncomingAssets
    .filter(asset => asset.type === 'image' && asset.url)
    .map(asset => String(asset.url))
  const incomingText = normalizedIncomingAssets
    .filter(asset => asset.type === 'prompt' && asset.content)
    .map(asset => String(asset.content).trim())
    .filter(Boolean)
  const userText = [
    finalPromptText || (incomingImages.length ? '描述这张图片' : '开始执行'),
    incomingText.length ? `[参考素材]:\n${incomingText.join('\n')}` : '',
  ].filter(Boolean).join('\n\n')
  // 模型显式声明的 size 参数（快捷参数条）优先；比例系统的 ratioSize 只在模型没有 size 参数时兜底。
  const hasParamSize = input.params?.size !== undefined && input.params.size !== null && input.params.size !== ''
  const command = parseCanvasSkillCommand(input.prompt)
  const selectedSkillName = String(input.skillName || '').trim()
  const selectedSkillPackId = String(input.skillPackId || '').trim()
  const hasEffectiveSkill = Boolean(command || selectedSkillName)
  const compileEnabled = input.skillCompileEnabled ?? hasEffectiveSkill
  const payload: any = {
    api_key_id: Number(input.selectedKey) || undefined,
    provider: input.provider,
    model: input.selectedModel,
    type: input.mode,
    routing_strategy: input.routingStrategy,
    prompt: hasEffectiveSkill ? String(input.prompt || '') : finalPromptText,
    params: { ...input.params, temperature: input.temperature, ...(hasParamSize ? {} : { size: input.ratioSize }), client_id: input.id },
    messages: [{ role: 'system', content: activeSystemPrompt }],
  }
  if (hasEffectiveSkill || input.skillCompileEnabled !== undefined) payload.skill_compile_enabled = compileEnabled
  if (!command && selectedSkillName) payload.skill_name = selectedSkillName
  if (!command && selectedSkillPackId) payload.skill_pack_id = selectedSkillPackId
  if (!command && input.skillRevision) payload.skill_revision = input.skillRevision
  if (input.skillCompilerModelId !== undefined && input.skillCompilerModelId !== null && input.skillCompilerModelId !== '') payload.skill_compiler_model_id = input.skillCompilerModelId
  const effectiveSkillArguments = resolveGenerateNodeSkillArguments({
    command,
    skillArguments: input.skillArguments,
    commandSkillArguments: input.commandSkillArguments,
    effectiveSkillArgumentSpecs: input.effectiveSkillArgumentSpecs,
  })
  if (effectiveSkillArguments) payload.skill_arguments = effectiveSkillArguments
  if (input.compiledInputHash) payload.compiled_input_hash = input.compiledInputHash
  if (normalizedIncomingAssets.length) payload.params.incoming_assets = normalizedIncomingAssets
  if (input.mode === 'vision' && incomingImages.length) {
    payload.messages.push({
      role: 'user',
      content: [
        { type: 'text', text: userText },
        ...incomingImages.map(url => ({ type: 'image_url', image_url: { url } })),
      ],
    })
  } else {
    payload.messages.push({ role: 'user', content: userText })
  }
  if (incomingImages[0]) payload.image_url = incomingImages[0]
  return payload
}


export function normalizeSelectOptions(options: unknown): Array<{ label: string; value: any }> {
  if (!Array.isArray(options)) return []
  return options.map(option => {
    if (option && typeof option === 'object' && 'value' in (option as any)) {
      const record = option as { label?: unknown; value: any }
      return { label: String(record.label ?? record.value), value: record.value }
    }
    return { label: String(option), value: option }
  })
}

export function pickQuickParams(uiParams: unknown, limit = 2): Array<Record<string, any>> {
  if (!Array.isArray(uiParams)) return []
  // size 由节点主体的比例选择器统一控制，不再作为快捷参数展示
  return uiParams
    .filter(param => param && typeof param === 'object' && (param as any).name !== 'size' && ((param as any).type === 'select' || (param as any).type === 'number'))
    .slice(0, limit) as Array<Record<string, any>>
}

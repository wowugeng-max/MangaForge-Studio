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
import type { CanvasSkillCompileInput, CanvasSkillCompileResponse } from '../../api/skills'

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

export type GenerateNodeSkillTargetMode = 'text_to_image' | 'image_to_image' | 'text_to_video' | 'image_to_video'

export const GENERATE_NODE_SKILL_TARGET_MODE_OPTIONS = [
  { label: '文生图', value: 'text_to_image' },
  { label: '图生图', value: 'image_to_image' },
  { label: '文生视频', value: 'text_to_video' },
  { label: '图生视频', value: 'image_to_video' },
] as const

const GENERATE_NODE_SKILL_TARGET_MODES = new Set<GenerateNodeSkillTargetMode>(
  GENERATE_NODE_SKILL_TARGET_MODE_OPTIONS.map(option => option.value),
)

export function normalizeGenerateNodeSkillTargetMode(value: unknown): GenerateNodeSkillTargetMode {
  const persistedValue = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>).skillTargetMode ?? (value as Record<string, unknown>).skill_target_mode
    : value
  return typeof persistedValue === 'string' && GENERATE_NODE_SKILL_TARGET_MODES.has(persistedValue as GenerateNodeSkillTargetMode)
    ? persistedValue as GenerateNodeSkillTargetMode
    : 'text_to_image'
}

export function resolveGenerateNodeSkillCompileMode(input: {
  nodeMode: string
  skillTargetMode?: unknown
}): GenerateNodeSkillTargetMode | undefined {
  if (input.nodeMode === 'chat') return normalizeGenerateNodeSkillTargetMode(input.skillTargetMode)
  return GENERATE_NODE_SKILL_TARGET_MODES.has(input.nodeMode as GenerateNodeSkillTargetMode)
    ? input.nodeMode as GenerateNodeSkillTargetMode
    : undefined
}

export function filterGenerateNodeCompatibleSkills<T extends { compatibility: string; mediaModes: readonly string[] }>(
  skills: readonly T[],
  mode: GenerateNodeSkillTargetMode,
): T[] {
  return skills.filter(skill => (
    skill.compatibility === 'prompt_ready'
    && (skill.mediaModes.length === 0 || skill.mediaModes.includes(mode))
  ))
}

export function resolveGenerateNodeSkillFallbackTarget<T extends { mediaModes: readonly string[] }>(input: {
  skill: T
  targetMode: GenerateNodeSkillTargetMode
}): GenerateNodeSkillTargetMode | undefined {
  if (input.skill.mediaModes.length === 0 || input.skill.mediaModes.includes(input.targetMode)) return input.targetMode
  return input.skill.mediaModes.find(mode => (
    GENERATE_NODE_SKILL_TARGET_MODES.has(mode as GenerateNodeSkillTargetMode)
  )) as GenerateNodeSkillTargetMode | undefined
}

export type GenerateNodeSkillTargetTransitionOrigin = 'hydration' | 'command' | 'user'

export function resolveGenerateNodeSkillTargetTransition<T extends { mediaModes: readonly string[] }>(input: {
  origin: GenerateNodeSkillTargetTransitionOrigin
  requestedTargetMode: GenerateNodeSkillTargetMode
  skill?: T | null
}): { targetMode: GenerateNodeSkillTargetMode; clearSkill: boolean } {
  if (!input.skill || input.skill.mediaModes.length === 0 || input.skill.mediaModes.includes(input.requestedTargetMode)) {
    return { targetMode: input.requestedTargetMode, clearSkill: false }
  }
  if (input.origin === 'user') {
    return { targetMode: input.requestedTargetMode, clearSkill: true }
  }
  return {
    targetMode: resolveGenerateNodeSkillFallbackTarget({
      skill: input.skill,
      targetMode: input.requestedTargetMode,
    }) ?? input.requestedTargetMode,
    clearSkill: false,
  }
}

export function selectInstalledGenerateNodeSkill<T extends {
  packId: string
  revision: string
  compatibility: string
  mediaModes: readonly string[]
}>(input: {
  skills: readonly T[]
  packId: string
  revision: string
  targetMode: GenerateNodeSkillTargetMode
}): T | undefined {
  const compatibleMatches = filterGenerateNodeCompatibleSkills(
    input.skills.filter(skill => skill.packId === input.packId && skill.revision === input.revision),
    input.targetMode,
  )
  return compatibleMatches.length === 1 ? compatibleMatches[0] : undefined
}

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

function resolveGenerateNodeSourceContentValue(sourceData: any) {
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
  return candidates.find(value => value !== undefined && value !== null && String(value).trim())
}

export function resolveGenerateNodeSourceContent(sourceData: any) {
  const found = resolveGenerateNodeSourceContentValue(sourceData)
  return found === undefined || found === null ? '' : String(found)
}

export type GenerateNodeIncomingAsset = {
  id?: number
  type: GenerateNodeReferenceType
  content?: string
  file_path?: string
  url?: string
  source_asset_ids?: number[]
  source_edge_id?: string
  source_node_id?: string
  source_handle?: string
  reference_index?: number
  reference_id?: string
  reference_role?: GenerateNodeReferenceRole
}

export type GenerateNodeReferenceRole =
  | 'general'
  | 'first_frame'
  | 'last_frame'
  | 'character'
  | 'scene'
  | 'style'
  | 'full_reference'
  | 'prompt_context'

export type GenerateNodeReferenceType = 'image' | 'prompt' | 'video' | 'audio'

export type GenerateNodeReferenceBinding = {
  reference_index: number
  reference_id: string
  reference_role: GenerateNodeReferenceRole
  type: GenerateNodeReferenceType
  id?: number
  url?: string
  content?: string
  source_asset_ids?: number[]
  source_edge_id?: string
  source_node_id?: string
  source_handle?: string
}

export type GenerateNodeUnresolvedReferenceSource = {
  type: GenerateNodeReferenceType
  source_edge_id?: string
  source_node_id?: string
  source_handle?: string
}

export type GenerateNodeReferenceErrorCode =
  | 'REFERENCE_LIMIT_EXCEEDED'
  | 'REFERENCE_ROLE_INVALID'
  | 'REFERENCE_MEDIA_UNSUPPORTED'
  | 'REFERENCE_TYPE_INVALID'
  | 'REFERENCE_ASSET_INVALID'
  | 'REFERENCE_LINEAGE_INVALID'
  | 'REFERENCE_ID_INVALID'

export type GenerateNodeReferenceValidationState = {
  error_code: GenerateNodeReferenceErrorCode
  detail: string
  reference_index?: number
}

export type GenerateNodeExecutionCompatibilityError = {
  error_code: 'MULTI_REFERENCE_UNSUPPORTED' | 'MULTI_REFERENCE_MAPPING_REQUIRED'
  detail: string
}

export class GenerateNodeReferenceError extends Error {
  readonly code: GenerateNodeReferenceErrorCode
  readonly reference_index?: number

  constructor(code: GenerateNodeReferenceErrorCode, message: string, referenceIndex?: number) {
    super(message)
    this.name = 'GenerateNodeReferenceError'
    this.code = code
    this.reference_index = referenceIndex
  }
}

export const MAX_GENERATE_NODE_REFERENCE_IMAGES = 9

const GENERATE_NODE_REFERENCE_ROLES: ReadonlySet<GenerateNodeReferenceRole> = new Set([
  'general',
  'first_frame',
  'last_frame',
  'character',
  'scene',
  'style',
  'full_reference',
  'prompt_context',
])

export const GENERATE_NODE_REFERENCE_ROLE_OPTIONS: Array<{ label: string; value: GenerateNodeReferenceRole }> = [
  { label: '通用参考', value: 'general' },
  { label: '首帧', value: 'first_frame' },
  { label: '尾帧', value: 'last_frame' },
  { label: '角色', value: 'character' },
  { label: '场景', value: 'scene' },
  { label: '风格', value: 'style' },
  { label: '完整参考', value: 'full_reference' },
  { label: '提示上下文', value: 'prompt_context' },
]

const GENERATE_NODE_REFERENCE_TYPES: ReadonlySet<GenerateNodeReferenceType> = new Set([
  'image',
  'prompt',
  'video',
  'audio',
])

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

export type GenerateNodeSkillIdentity = {
  packId: string
  name: string
  revision: string
}

export type GenerateNodeSkillSelectionError = {
  error_code: 'SKILL_REVISION_UNAVAILABLE' | 'SKILL_AMBIGUOUS' | 'SKILL_NOT_FOUND'
  detail: string
  requested_pack_id: string
  requested_name: string
  requested_revision: string
  available_revisions: string[]
}

export function resolveGenerateNodeSkillSelection<T extends GenerateNodeSkillIdentity>(input: {
  knownSkills: readonly T[]
  selectedPackId?: string
  selectedName?: string
  selectedRevision?: string
}): {
  requestedIdentity: GenerateNodeSkillIdentity
  selectedSkill: T | undefined
  error: GenerateNodeSkillSelectionError | null
} {
  const requestedIdentity = {
    packId: String(input.selectedPackId || ''),
    name: String(input.selectedName || ''),
    revision: String(input.selectedRevision || ''),
  }
  if (!requestedIdentity.name) return { requestedIdentity, selectedSkill: undefined, error: null }

  const matches = Array.from(new Map(input.knownSkills
    .filter(skill => (
      skill.name === requestedIdentity.name
      && (!requestedIdentity.packId || skill.packId === requestedIdentity.packId)
    ))
    .map(skill => [`${skill.packId}:${skill.name}:${skill.revision}`, skill])).values())
  const availableRevisions = Array.from(new Set(matches.map(skill => skill.revision))).sort()

  if (requestedIdentity.revision) {
    const exactMatches = matches.filter(skill => skill.revision === requestedIdentity.revision)
    if (exactMatches.length === 1) return { requestedIdentity, selectedSkill: exactMatches[0], error: null }
    if (exactMatches.length > 1) {
      return {
        requestedIdentity,
        selectedSkill: undefined,
        error: {
          error_code: 'SKILL_AMBIGUOUS',
          detail: `Locked Skill ${requestedIdentity.name} revision ${requestedIdentity.revision} matches multiple Packs; select an exact Pack and revision`,
          requested_pack_id: requestedIdentity.packId,
          requested_name: requestedIdentity.name,
          requested_revision: requestedIdentity.revision,
          available_revisions: availableRevisions,
        },
      }
    }
    return {
      requestedIdentity,
      selectedSkill: undefined,
      error: {
        error_code: 'SKILL_REVISION_UNAVAILABLE',
        detail: `Locked Skill ${requestedIdentity.packId ? `${requestedIdentity.packId}:` : ''}${requestedIdentity.name} revision ${requestedIdentity.revision} is unavailable`,
        requested_pack_id: requestedIdentity.packId,
        requested_name: requestedIdentity.name,
        requested_revision: requestedIdentity.revision,
        available_revisions: availableRevisions,
      },
    }
  }

  if (matches.length === 1) return { requestedIdentity, selectedSkill: matches[0], error: null }
  if (matches.length > 1) {
    return {
      requestedIdentity,
      selectedSkill: undefined,
      error: {
        error_code: 'SKILL_AMBIGUOUS',
        detail: `Skill ${requestedIdentity.packId ? `${requestedIdentity.packId}:` : ''}${requestedIdentity.name} has multiple installed revisions; select an exact revision`,
        requested_pack_id: requestedIdentity.packId,
        requested_name: requestedIdentity.name,
        requested_revision: '',
        available_revisions: availableRevisions,
      },
    }
  }
  return {
    requestedIdentity,
    selectedSkill: undefined,
    error: {
      error_code: 'SKILL_NOT_FOUND',
      detail: `Skill ${requestedIdentity.packId ? `${requestedIdentity.packId}:` : ''}${requestedIdentity.name} is unavailable`,
      requested_pack_id: requestedIdentity.packId,
      requested_name: requestedIdentity.name,
      requested_revision: '',
      available_revisions: [],
    },
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
  referenceEdgeCount: number
  resolvedReferenceEdgeCount: number
  unresolvedReferenceEdgeCount: number
  unresolvedReferenceSources: GenerateNodeUnresolvedReferenceSource[]
  referenceValidationError: GenerateNodeReferenceValidationState | null
  fingerprint: string
}

export function buildGenerateNodeIncomingContextSnapshot(input: {
  nodeId: string
  edges: Array<{ id?: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }>
  nodes: Array<{ id: string; data?: any }>
}): GenerateNodeIncomingContextSnapshot {
  const incomingAssets: GenerateNodeIncomingAsset[] = []
  let externalSystemPrompt = ''
  const incomingEdges = input.edges.filter(edge => edge.target === input.nodeId)
  const referenceEdgeCount = incomingEdges.filter(edge => edge.targetHandle === 'text' || edge.targetHandle === 'image').length
  let resolvedReferenceEdgeCount = 0
  let unresolvedReferenceEdgeCount = 0
  const unresolvedReferenceSources: GenerateNodeUnresolvedReferenceSource[] = []
  let referenceValidationError: GenerateNodeReferenceValidationState | null = null
  let referenceIndex = 0
  incomingEdges.forEach(edge => {
    const referenceType: GenerateNodeReferenceType | null = edge.targetHandle === 'text'
      ? 'prompt'
      : edge.targetHandle === 'image'
        ? 'image'
        : null
    const isReferenceEdge = referenceType !== null
    if (isReferenceEdge) referenceIndex += 1
    const sourceIdentity = {
      ...(typeof edge.id === 'string' && edge.id.trim() ? { source_edge_id: edge.id.trim() } : {}),
      source_node_id: edge.source,
      ...(typeof edge.sourceHandle === 'string' && edge.sourceHandle.trim() ? { source_handle: edge.sourceHandle.trim() } : {}),
    }
    const sourceNode = input.nodes.find(node => node.id === edge.source)
    if (!sourceNode) {
      if (referenceType) {
        unresolvedReferenceEdgeCount += 1
        unresolvedReferenceSources.push({ type: referenceType, ...sourceIdentity })
      }
      return
    }
    if (isReferenceEdge) resolvedReferenceEdgeCount += 1
    const rawSourceContent = resolveGenerateNodeSourceContentValue(sourceNode.data)
    const sourceContent = typeof rawSourceContent === 'string' ? rawSourceContent : ''
    const sourceAssetIds = resolveGenerateNodeSourceAssetIds(sourceNode.data)
    const sourceAssetId = sourceAssetIds[0]
    if (isReferenceEdge && !sourceContent.trim()) {
      if (!referenceValidationError) {
        referenceValidationError = {
          error_code: 'REFERENCE_ASSET_INVALID',
          detail: `Reference source ${edge.source} has no valid ${edge.targetHandle} content`,
          reference_index: referenceIndex,
        }
      }
      return
    }
    if (edge.targetHandle === 'text' && sourceContent) {
      incomingAssets.push({ id: sourceAssetId, type: 'prompt', content: String(sourceContent), source_asset_ids: sourceAssetIds, ...sourceIdentity })
    } else if (edge.targetHandle === 'image' && sourceContent) {
      const url = normalizeGenerateNodeImageUrl(String(sourceContent))
      incomingAssets.push({ id: sourceAssetId, type: 'image', file_path: url, url, source_asset_ids: sourceAssetIds, ...sourceIdentity })
    } else if (edge.targetHandle === 'system' && sourceContent) {
      externalSystemPrompt = String(sourceContent)
    }
  })
  return {
    incomingAssets,
    externalSystemPrompt,
    referenceEdgeCount,
    resolvedReferenceEdgeCount,
    unresolvedReferenceEdgeCount,
    unresolvedReferenceSources,
    referenceValidationError,
    fingerprint: JSON.stringify({
      incomingAssets,
      externalSystemPrompt,
      referenceEdgeCount,
      resolvedReferenceEdgeCount,
      unresolvedReferenceEdgeCount,
      unresolvedReferenceSources,
      referenceValidationError,
    }),
  }
}

export function areGenerateNodeIncomingContextSnapshotsEqual(
  left: GenerateNodeIncomingContextSnapshot,
  right: GenerateNodeIncomingContextSnapshot,
) {
  return left.fingerprint === right.fingerprint
}

function generateNodeReferenceError(
  code: GenerateNodeReferenceErrorCode,
  messageText: string,
  referenceIndex?: number,
) {
  return new GenerateNodeReferenceError(code, messageText, referenceIndex)
}

function isGenerateNodeReferenceRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeGenerateNodeReferenceLineage(asset: Record<string, unknown>, referenceIndex: number): number[] {
  const rawLineage = asset.source_asset_ids ?? asset.sourceAssetIds
  if (rawLineage !== undefined && !Array.isArray(rawLineage)) {
    throw generateNodeReferenceError(
      'REFERENCE_LINEAGE_INVALID',
      `Reference ${referenceIndex} source_asset_ids must be an array`,
      referenceIndex,
    )
  }
  const candidates = [asset.id, ...(Array.isArray(rawLineage) ? rawLineage : [])]
  const seen = new Set<number>()
  const lineage: number[] = []
  candidates.forEach(candidate => {
    const id = (typeof candidate === 'number' || (typeof candidate === 'string' && candidate.trim()))
      ? Number(candidate)
      : NaN
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) return
    seen.add(id)
    lineage.push(id)
  })
  return lineage
}

function enforceGenerateNodeReferenceConstraints(bindings: readonly GenerateNodeReferenceBinding[]) {
  const imageCount = bindings.filter(binding => binding.type === 'image').length
  if (imageCount > MAX_GENERATE_NODE_REFERENCE_IMAGES) {
    throw generateNodeReferenceError(
      'REFERENCE_LIMIT_EXCEEDED',
      `GenerateNode references may contain at most ${MAX_GENERATE_NODE_REFERENCE_IMAGES} images`,
    )
  }
  if (bindings.filter(binding => binding.reference_role === 'first_frame').length > 1) {
    throw generateNodeReferenceError('REFERENCE_ROLE_INVALID', 'Only one first_frame reference is allowed')
  }
  if (bindings.filter(binding => binding.reference_role === 'last_frame').length > 1) {
    throw generateNodeReferenceError('REFERENCE_ROLE_INVALID', 'Only one last_frame reference is allowed')
  }
}

function cloneGenerateNodeReferenceBindings(
  bindings: readonly GenerateNodeReferenceBinding[],
): GenerateNodeReferenceBinding[] {
  return bindings.map(binding => ({
    ...binding,
    ...(binding.source_asset_ids ? { source_asset_ids: [...binding.source_asset_ids] } : {}),
  }))
}

function toGenerateNodeReferenceValidationState(error: unknown): GenerateNodeReferenceValidationState {
  if (error instanceof GenerateNodeReferenceError) {
    return {
      error_code: error.code,
      detail: error.message,
      ...(error.reference_index === undefined ? {} : { reference_index: error.reference_index }),
    }
  }
  return {
    error_code: 'REFERENCE_ASSET_INVALID',
    detail: error instanceof Error ? error.message : 'Invalid GenerateNode reference bindings',
  }
}

export function normalizeGenerateNodeReferenceBindings(
  persisted: unknown,
  incomingAssets: readonly GenerateNodeIncomingAsset[] = [],
): GenerateNodeReferenceBinding[] {
  const source = persisted === undefined || persisted === null ? incomingAssets : persisted
  if (!Array.isArray(source)) {
    throw generateNodeReferenceError('REFERENCE_ASSET_INVALID', 'GenerateNode references must be an array')
  }

  const referenceIds = new Set<string>()
  const bindings = source.map((rawAsset, arrayIndex): GenerateNodeReferenceBinding => {
    const referenceIndex = arrayIndex + 1
    if (!isGenerateNodeReferenceRecord(rawAsset)) {
      throw generateNodeReferenceError(
        'REFERENCE_ASSET_INVALID',
        `Reference ${referenceIndex} must be an object`,
        referenceIndex,
      )
    }

    const rawType = typeof rawAsset.type === 'string' ? rawAsset.type.toLowerCase() : ''
    if (!GENERATE_NODE_REFERENCE_TYPES.has(rawType as GenerateNodeReferenceType)) {
      throw generateNodeReferenceError(
        'REFERENCE_TYPE_INVALID',
        `Reference ${referenceIndex} has an invalid reference type`,
        referenceIndex,
      )
    }
    const type = rawType as GenerateNodeReferenceType

    const rawRole = rawAsset.reference_role ?? rawAsset.referenceRole ?? rawAsset.role ?? 'general'
    if (typeof rawRole !== 'string' || !GENERATE_NODE_REFERENCE_ROLES.has(rawRole as GenerateNodeReferenceRole)) {
      throw generateNodeReferenceError(
        'REFERENCE_ROLE_INVALID',
        `Reference ${referenceIndex} has an invalid reference role`,
        referenceIndex,
      )
    }
    const referenceRole = rawRole as GenerateNodeReferenceRole

    const rawReferenceId = rawAsset.reference_id ?? rawAsset.referenceId
    let referenceId = `reference-${referenceIndex}`
    if (rawReferenceId !== undefined && rawReferenceId !== null && rawReferenceId !== '') {
      if (typeof rawReferenceId !== 'string' || !rawReferenceId.trim()) {
        throw generateNodeReferenceError(
          'REFERENCE_ID_INVALID',
          `Reference ${referenceIndex} has an invalid reference id`,
          referenceIndex,
        )
      }
      referenceId = rawReferenceId.trim()
    }
    if (referenceIds.has(referenceId)) {
      throw generateNodeReferenceError(
        'REFERENCE_ID_INVALID',
        `Duplicate reference id: ${referenceId}`,
        referenceIndex,
      )
    }
    referenceIds.add(referenceId)

    const binding: GenerateNodeReferenceBinding = {
      reference_index: referenceIndex,
      reference_id: referenceId,
      reference_role: referenceRole,
      type,
    }
    if (type === 'prompt') {
      const rawContent = rawAsset.content ?? rawAsset.text
      if (typeof rawContent !== 'string' || !rawContent.trim()) {
        throw generateNodeReferenceError(
          'REFERENCE_ASSET_INVALID',
          `Reference ${referenceIndex} prompt content must be a non-empty string`,
          referenceIndex,
        )
      }
      binding.content = rawContent.trim()
    } else {
      const rawUrl = rawAsset.url ?? rawAsset.file_path ?? rawAsset.filePath ?? rawAsset.content
      if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
        throw generateNodeReferenceError(
          'REFERENCE_ASSET_INVALID',
          `Reference ${referenceIndex} media url must be a non-empty string`,
          referenceIndex,
        )
      }
      binding.url = normalizeGenerateNodeImageUrl(rawUrl)
    }

    const sourceAssetIds = normalizeGenerateNodeReferenceLineage(rawAsset, referenceIndex)
    if (sourceAssetIds.length) binding.source_asset_ids = sourceAssetIds
    const sourceEdgeId = rawAsset.source_edge_id ?? rawAsset.sourceEdgeId
    const sourceNodeId = rawAsset.source_node_id ?? rawAsset.sourceNodeId
    const sourceHandle = rawAsset.source_handle ?? rawAsset.sourceHandle
    if (typeof sourceEdgeId === 'string' && sourceEdgeId.trim()) binding.source_edge_id = sourceEdgeId.trim()
    if (typeof sourceNodeId === 'string' && sourceNodeId.trim()) binding.source_node_id = sourceNodeId.trim()
    if (typeof sourceHandle === 'string' && sourceHandle.trim()) binding.source_handle = sourceHandle.trim()
    return binding
  })

  enforceGenerateNodeReferenceConstraints(bindings)
  return bindings
}

export function buildGenerateNodeChatSkillResultPacket(input: {
  compile: {
    skill_name: string
    skill_version: string
    mode: string
    prompt: string
    negative_prompt?: string
    parameters?: Record<string, string | number | boolean>
    references_used?: string[]
    warnings?: string[]
    reference_bindings?: readonly GenerateNodeIncomingAsset[]
    reference_mode_hint?: string
  }
  cacheKey: string
  cached: boolean
  packId: string
  packSource?: string
  compilerModelId: number
  rawPrompt: string
  executionReferences?: readonly GenerateNodeIncomingAsset[]
}) {
  const orderedBindings = normalizeGenerateNodeReferenceBindings(
    [...(input.compile.reference_bindings ?? input.executionReferences ?? [])].sort((left, right) => (
      Number(left.reference_index || 0) - Number(right.reference_index || 0)
    )),
  )
  const sourceAssetIds = Array.from(new Set(orderedBindings.flatMap(binding => binding.source_asset_ids || [])))
  const negativePrompt = String(input.compile.negative_prompt || '')
  const referencesUsed = Array.isArray(input.compile.references_used) ? [...input.compile.references_used] : []
  const warnings = Array.isArray(input.compile.warnings) ? [...input.compile.warnings] : []

  return {
    content: input.compile.prompt,
    ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
    skill_pack_id: input.packId,
    ...(input.packSource ? { skill_pack_source: input.packSource } : {}),
    skill_name: input.compile.skill_name,
    skill_revision: input.compile.skill_version,
    compiler_model_id: input.compilerModelId,
    compiled_input_hash: input.cacheKey,
    skill_preview_cached: input.cached,
    compiled_prompt: input.compile.prompt,
    compiled_negative_prompt: negativePrompt,
    compiled_references: referencesUsed,
    warnings,
    ...(input.compile.reference_mode_hint ? { reference_mode_hint: input.compile.reference_mode_hint } : {}),
    reference_bindings: orderedBindings,
    source_asset_ids: sourceAssetIds,
    raw_prompt: input.rawPrompt,
  }
}

export async function runGenerateNodeChatSkillCompilation(input: {
  request: CanvasSkillCompileInput
  compile: (request: CanvasSkillCompileInput) => Promise<{ data: CanvasSkillCompileResponse }>
  isCurrent: () => boolean
  packId: string
  packSource?: string
  compilerModelId: number
  rawPrompt: string
  executionReferences?: readonly GenerateNodeIncomingAsset[]
}): Promise<
  | { status: 'stale' }
  | { status: 'current'; packet: ReturnType<typeof buildGenerateNodeChatSkillResultPacket> }
> {
  let response: { data: CanvasSkillCompileResponse }
  try {
    response = await input.compile(input.request)
  } catch (error) {
    if (!input.isCurrent()) return { status: 'stale' }
    throw error
  }
  if (!input.isCurrent()) return { status: 'stale' }
  return {
    status: 'current',
    packet: buildGenerateNodeChatSkillResultPacket({
      compile: response.data.result,
      cacheKey: response.data.cache_key,
      cached: response.data.cached,
      packId: input.packId,
      packSource: input.packSource,
      compilerModelId: input.compilerModelId,
      rawPrompt: input.rawPrompt,
      executionReferences: input.executionReferences,
    }),
  }
}

export function reorderGenerateNodeReferenceBindings(
  bindings: readonly GenerateNodeReferenceBinding[],
  fromIndex: number,
  toIndex: number,
): GenerateNodeReferenceBinding[] {
  const reordered = normalizeGenerateNodeReferenceBindings(bindings, [])
  if (
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= reordered.length ||
    toIndex >= reordered.length ||
    fromIndex === toIndex
  ) {
    return reordered
  }
  const [moved] = reordered.splice(fromIndex, 1)
  reordered.splice(toIndex, 0, moved)
  return reordered.map((binding, index) => ({
    ...binding,
    reference_index: index + 1,
    ...(binding.source_asset_ids ? { source_asset_ids: [...binding.source_asset_ids] } : {}),
  }))
}

export function updateGenerateNodeReferenceBindingRole(
  bindings: readonly GenerateNodeReferenceBinding[],
  referenceId: string,
  referenceRole: GenerateNodeReferenceRole,
): { bindings: GenerateNodeReferenceBinding[]; validationError: GenerateNodeReferenceValidationState | null } {
  let normalized: GenerateNodeReferenceBinding[]
  try {
    normalized = normalizeGenerateNodeReferenceBindings(bindings, [])
  } catch (error) {
    return { bindings: [], validationError: toGenerateNodeReferenceValidationState(error) }
  }
  const targetIndex = normalized.findIndex(binding => binding.reference_id === referenceId)
  if (targetIndex < 0) {
    return {
      bindings: normalized,
      validationError: {
        error_code: 'REFERENCE_ID_INVALID',
        detail: `Unknown reference id: ${referenceId}`,
      },
    }
  }
  try {
    const next = normalized.map((binding, index) => index === targetIndex
      ? { ...binding, reference_role: referenceRole }
      : binding)
    return {
      bindings: normalizeGenerateNodeReferenceBindings(next, []),
      validationError: null,
    }
  } catch (error) {
    return {
      bindings: normalized,
      validationError: toGenerateNodeReferenceValidationState(error),
    }
  }
}

function rawGenerateNodeReferenceId(value: unknown) {
  if (!isGenerateNodeReferenceRecord(value)) return ''
  const rawReferenceId = value.reference_id ?? value.referenceId
  return typeof rawReferenceId === 'string' ? rawReferenceId.trim() : ''
}

function generateNodeReferenceValue(binding: GenerateNodeReferenceBinding) {
  return binding.type === 'prompt' ? binding.content || '' : binding.url || ''
}

function generateNodeReferenceLineageMatches(
  existing: GenerateNodeReferenceBinding,
  candidate: GenerateNodeReferenceBinding,
) {
  if (existing.type !== candidate.type) return false
  const candidateIds = new Set(candidate.source_asset_ids || [])
  return Boolean(existing.source_asset_ids?.some(id => candidateIds.has(id)))
}

function generateNodeReferenceSourceIdentityMatches(
  existing: GenerateNodeReferenceBinding,
  candidate: Pick<GenerateNodeReferenceBinding, 'source_edge_id' | 'source_node_id' | 'source_handle'>,
) {
  if (existing.source_edge_id && candidate.source_edge_id) {
    return existing.source_edge_id === candidate.source_edge_id
  }
  if (!existing.source_node_id || !candidate.source_node_id) return false
  return existing.source_node_id === candidate.source_node_id
    && (existing.source_handle || '') === (candidate.source_handle || '')
}

function generateNodeReferenceSourceIdentityConflicts(
  existing: GenerateNodeReferenceBinding,
  candidate: Pick<GenerateNodeReferenceBinding, 'source_edge_id' | 'source_node_id' | 'source_handle'>,
) {
  if (existing.source_edge_id && candidate.source_edge_id) {
    return existing.source_edge_id !== candidate.source_edge_id
  }
  if (!existing.source_node_id || !candidate.source_node_id) return false
  if (existing.source_node_id !== candidate.source_node_id) return true
  return Boolean(
    existing.source_handle
    && candidate.source_handle
    && existing.source_handle !== candidate.source_handle
  )
}

function hasGenerateNodeReferenceSourceIdentity(
  value: Pick<GenerateNodeReferenceBinding, 'source_edge_id' | 'source_node_id'>,
) {
  return Boolean(value.source_edge_id || value.source_node_id)
}

function normalizeGenerateNodeUnresolvedReferenceSources(
  value: unknown,
): GenerateNodeUnresolvedReferenceSource[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(rawSource => {
    if (!isGenerateNodeReferenceRecord(rawSource)) return []
    const rawType = typeof rawSource.type === 'string' ? rawSource.type.toLowerCase() : ''
    if (!GENERATE_NODE_REFERENCE_TYPES.has(rawType as GenerateNodeReferenceType)) return []
    const sourceEdgeId = rawSource.source_edge_id ?? rawSource.sourceEdgeId
    const sourceNodeId = rawSource.source_node_id ?? rawSource.sourceNodeId
    const sourceHandle = rawSource.source_handle ?? rawSource.sourceHandle
    const source: GenerateNodeUnresolvedReferenceSource = { type: rawType as GenerateNodeReferenceType }
    if (typeof sourceEdgeId === 'string' && sourceEdgeId.trim()) source.source_edge_id = sourceEdgeId.trim()
    if (typeof sourceNodeId === 'string' && sourceNodeId.trim()) source.source_node_id = sourceNodeId.trim()
    if (typeof sourceHandle === 'string' && sourceHandle.trim()) source.source_handle = sourceHandle.trim()
    return hasGenerateNodeReferenceSourceIdentity(source) ? [source] : []
  })
}

export function reconcileGenerateNodeReferenceBindings(
  persisted: unknown,
  incomingAssets: readonly GenerateNodeIncomingAsset[] = [],
  options: {
    incomingComplete?: boolean
    unresolvedSources?: readonly GenerateNodeUnresolvedReferenceSource[]
  } = {},
): { bindings: GenerateNodeReferenceBinding[]; validationError: GenerateNodeReferenceValidationState | null } {
  const hasPersisted = persisted !== undefined && persisted !== null
  const hasPerSourceUnresolvedState = Array.isArray(options.unresolvedSources)
  const unresolvedSources = normalizeGenerateNodeUnresolvedReferenceSources(options.unresolvedSources)
  let existing: GenerateNodeReferenceBinding[] = []
  if (hasPersisted) {
    try {
      existing = normalizeGenerateNodeReferenceBindings(persisted, [])
    } catch (error) {
      return { bindings: [], validationError: toGenerateNodeReferenceValidationState(error) }
    }
    if (options.incomingComplete === false && !hasPerSourceUnresolvedState) {
      return { bindings: cloneGenerateNodeReferenceBindings(existing), validationError: null }
    }
  }

  let incoming: GenerateNodeReferenceBinding[]
  try {
    incoming = normalizeGenerateNodeReferenceBindings(undefined, incomingAssets)
  } catch (error) {
    return {
      bindings: cloneGenerateNodeReferenceBindings(existing),
      validationError: toGenerateNodeReferenceValidationState(error),
    }
  }
  if (!hasPersisted) {
    return { bindings: incoming, validationError: null }
  }

  const explicitIncomingIds = incomingAssets.map(rawGenerateNodeReferenceId)
  const usedIncoming = new Set<number>()
  const reservedUnresolvedSources = new Set<number>()
  const unresolvedSourceByExistingIndex = new Map<number, number>()
  existing.forEach((binding, existingIndex) => {
    if (!hasGenerateNodeReferenceSourceIdentity(binding)) return
    const unresolvedIndex = unresolvedSources.findIndex((source, index) => (
      !reservedUnresolvedSources.has(index)
      && source.type === binding.type
      && generateNodeReferenceSourceIdentityMatches(binding, source)
    ))
    if (unresolvedIndex < 0) return
    reservedUnresolvedSources.add(unresolvedIndex)
    unresolvedSourceByExistingIndex.set(existingIndex, unresolvedIndex)
  })
  const reconciled: GenerateNodeReferenceBinding[] = []
  const findIncoming = (predicate: (candidate: GenerateNodeReferenceBinding, index: number) => boolean) => (
    incoming.findIndex((candidate, index) => !usedIncoming.has(index) && predicate(candidate, index))
  )

  existing.forEach((binding, existingIndex) => {
    let incomingIndex = findIncoming(candidate => generateNodeReferenceSourceIdentityMatches(binding, candidate))
    const findFallbackIncoming = (predicate: (candidate: GenerateNodeReferenceBinding, index: number) => boolean) => (
      findIncoming((candidate, index) => (
        !generateNodeReferenceSourceIdentityConflicts(binding, candidate)
        && predicate(candidate, index)
      ))
    )
    if (incomingIndex < 0) {
      incomingIndex = findFallbackIncoming((candidate, index) => (
        Boolean(explicitIncomingIds[index]) && explicitIncomingIds[index] === binding.reference_id
      ))
    }
    if (incomingIndex < 0) {
      incomingIndex = findFallbackIncoming(candidate => generateNodeReferenceLineageMatches(binding, candidate))
    }
    if (incomingIndex < 0) {
      incomingIndex = findFallbackIncoming(candidate => (
        candidate.type === binding.type
        && generateNodeReferenceValue(candidate) === generateNodeReferenceValue(binding)
      ))
    }
    if (incomingIndex < 0) {
      if (unresolvedSourceByExistingIndex.has(existingIndex)) {
        reconciled.push(cloneGenerateNodeReferenceBindings([binding])[0])
        return
      }
      if (!hasGenerateNodeReferenceSourceIdentity(binding)) {
        const unresolvedIndex = unresolvedSources.findIndex((source, index) => (
          !reservedUnresolvedSources.has(index) && source.type === binding.type
        ))
        if (unresolvedIndex >= 0) {
          reservedUnresolvedSources.add(unresolvedIndex)
          reconciled.push(cloneGenerateNodeReferenceBindings([binding])[0])
        }
      }
      return
    }
    usedIncoming.add(incomingIndex)
    const candidate = incoming[incomingIndex]
    reconciled.push({
      ...candidate,
      reference_id: binding.reference_id,
      reference_role: binding.reference_role,
      ...(candidate.source_asset_ids ? { source_asset_ids: [...candidate.source_asset_ids] } : {}),
    })
  })

  const allocatedReferenceIds = new Set(reconciled.map(binding => binding.reference_id))
  let nextReferenceId = 1
  const allocateReferenceId = (preferred: string) => {
    if (preferred && !allocatedReferenceIds.has(preferred)) {
      allocatedReferenceIds.add(preferred)
      return preferred
    }
    while (allocatedReferenceIds.has(`reference-${nextReferenceId}`)) nextReferenceId += 1
    const referenceId = `reference-${nextReferenceId}`
    allocatedReferenceIds.add(referenceId)
    nextReferenceId += 1
    return referenceId
  }
  incoming.forEach((candidate, index) => {
    if (usedIncoming.has(index)) return
    reconciled.push({
      ...candidate,
      reference_id: allocateReferenceId(explicitIncomingIds[index]),
      reference_role: 'general',
      ...(candidate.source_asset_ids ? { source_asset_ids: [...candidate.source_asset_ids] } : {}),
    })
  })

  try {
    return {
      bindings: normalizeGenerateNodeReferenceBindings(reconciled, []),
      validationError: null,
    }
  } catch (error) {
    return {
      bindings: cloneGenerateNodeReferenceBindings(existing),
      validationError: toGenerateNodeReferenceValidationState(error),
    }
  }
}

export function buildGenerateNodeReferencePersistencePayload(
  bindings: readonly GenerateNodeReferenceBinding[],
) {
  const normalized = normalizeGenerateNodeReferenceBindings(bindings, [])
  return {
    referenceBindings: cloneGenerateNodeReferenceBindings(normalized),
    reference_bindings: cloneGenerateNodeReferenceBindings(normalized),
  }
}

export function buildGenerateNodeReferenceBindingsFingerprint(
  bindings: readonly GenerateNodeReferenceBinding[],
) {
  return JSON.stringify(normalizeGenerateNodeReferenceBindings(bindings, []).map(binding => ({
    reference_index: binding.reference_index,
    reference_id: binding.reference_id,
    reference_role: binding.reference_role,
    type: binding.type,
    url: binding.url ?? null,
    content: binding.content ?? null,
    source_asset_ids: binding.source_asset_ids ? [...binding.source_asset_ids] : [],
  })))
}

export function buildGenerateNodeReferenceBindingsLocalFingerprint(
  bindings: readonly GenerateNodeReferenceBinding[],
) {
  return JSON.stringify(normalizeGenerateNodeReferenceBindings(bindings, []).map(binding => ({
    reference_index: binding.reference_index,
    reference_id: binding.reference_id,
    reference_role: binding.reference_role,
    type: binding.type,
    url: binding.url ?? null,
    content: binding.content ?? null,
    source_asset_ids: binding.source_asset_ids ? [...binding.source_asset_ids] : [],
    source_edge_id: binding.source_edge_id ?? null,
    source_node_id: binding.source_node_id ?? null,
    source_handle: binding.source_handle ?? null,
  })))
}

export function shouldInvalidateGenerateNodeInitialCompileAudit(
  persisted: unknown,
  reconciled: readonly GenerateNodeReferenceBinding[],
) {
  try {
    const persistedBindings = normalizeGenerateNodeReferenceBindings(persisted ?? [], [])
    return buildGenerateNodeReferenceBindingsFingerprint(persistedBindings)
      !== buildGenerateNodeReferenceBindingsFingerprint(reconciled)
  } catch {
    return true
  }
}

export function buildGenerateNodeCanonicalReferenceBindings(
  bindings: readonly GenerateNodeReferenceBinding[],
): GenerateNodeReferenceBinding[] {
  return normalizeGenerateNodeReferenceBindings(bindings, []).map(binding => ({
    reference_index: binding.reference_index,
    reference_id: binding.reference_id,
    reference_role: binding.reference_role,
    type: binding.type,
    ...(binding.url ? { url: binding.url } : {}),
    ...(binding.content ? { content: binding.content } : {}),
    ...(binding.source_asset_ids?.length ? { source_asset_ids: [...binding.source_asset_ids] } : {}),
  }))
}

export function buildGenerateNodeSkillCompileAssets(
  bindings: readonly GenerateNodeReferenceBinding[],
) {
  return buildGenerateNodeCanonicalReferenceBindings(validateGenerateNodeReferenceBindingsForExecution(bindings))
}

export function buildGenerateNodeSkillCompileRequest(input: {
  skillName: string
  packId?: string
  revision?: string
  prompt: string
  mode: GenerateNodeSkillTargetMode
  compilerModelId: number
  references: readonly GenerateNodeReferenceBinding[]
  nodeParams?: Record<string, unknown>
  arguments?: Record<string, string>
}): CanvasSkillCompileInput {
  const references = buildGenerateNodeSkillCompileAssets(
    [...input.references].sort((left, right) => left.reference_index - right.reference_index),
  )
  const nodeParams = input.nodeParams && Object.keys(input.nodeParams).length ? { ...input.nodeParams } : undefined
  const skillArguments = input.arguments && Object.keys(input.arguments).length ? { ...input.arguments } : undefined
  return {
    skill_name: input.skillName,
    ...(input.packId ? { pack_id: input.packId } : {}),
    ...(input.revision ? { skill_revision: input.revision } : {}),
    raw_prompt: input.prompt,
    mode: input.mode,
    ...(references.length ? { incoming_assets: references } : {}),
    ...(nodeParams ? { node_params: nodeParams } : {}),
    ...(skillArguments ? { arguments: skillArguments } : {}),
    compiler_model_id: input.compilerModelId,
  }
}

export function normalizeGenerateNodeSkillCompileAudit(input: {
  response: CanvasSkillCompileResponse
  executionReferences: readonly GenerateNodeReferenceBinding[]
  packSource?: string
  compilerModelId: number
}) {
  const preview = input.response.result
  const compilerReferenceAudit = Array.isArray(preview.reference_bindings)
    ? reconcileGenerateNodeReferenceBindings(
      undefined,
      [...preview.reference_bindings].sort((left, right) => Number(left.reference_index) - Number(right.reference_index)),
    )
    : null
  const compiledReferenceBindings = compilerReferenceAudit && !compilerReferenceAudit.validationError
    ? buildGenerateNodeCanonicalReferenceBindings(compilerReferenceAudit.bindings)
    : buildGenerateNodeCanonicalReferenceBindings(
      [...input.executionReferences].sort((left, right) => left.reference_index - right.reference_index),
    )
  return {
    compiledPrompt: String(preview.prompt || ''),
    compiledNegativePrompt: String(preview.negative_prompt || ''),
    compiledReferences: Array.isArray(preview.references_used) ? [...preview.references_used] : [],
    compiledReferenceBindings,
    referenceModeHint: String(preview.reference_mode_hint || ''),
    compiledInputHash: String(input.response.cache_key || ''),
    compileWarnings: Array.isArray(preview.warnings) ? [...preview.warnings] : [],
    compilerModelId: input.compilerModelId,
    skillPreviewResult: preview,
    skillPreviewCached: Boolean(input.response.cached),
    skillPackSource: String(input.packSource || ''),
  }
}

export function parseGenerateNodeExecutionCompatibilityError(
  error: unknown,
): GenerateNodeExecutionCompatibilityError | null {
  const value = isGenerateNodeReferenceRecord(error) ? error : {}
  const response = isGenerateNodeReferenceRecord(value.response) ? value.response : {}
  const responseData = isGenerateNodeReferenceRecord(response.data) ? response.data : {}
  const data = isGenerateNodeReferenceRecord(value.data) ? value.data : {}
  const body = Object.keys(responseData).length ? responseData : Object.keys(data).length ? data : value
  const errorCode = String(body.error_code ?? body.code ?? '').trim()
  if (errorCode !== 'MULTI_REFERENCE_UNSUPPORTED' && errorCode !== 'MULTI_REFERENCE_MAPPING_REQUIRED') return null
  return {
    error_code: errorCode,
    detail: String(body.detail ?? body.error ?? body.message ?? errorCode),
  }
}

export function resolveGenerateNodeExecutionBlockState(input: {
  skillBlocked?: boolean
  referenceValidationError?: GenerateNodeReferenceValidationState | null
  executionCompatibilityError?: GenerateNodeExecutionCompatibilityError | null
}) {
  const previewBlocked = Boolean(input.skillBlocked || input.referenceValidationError)
  return {
    previewBlocked,
    runBlocked: previewBlocked || Boolean(input.executionCompatibilityError),
  }
}

export function buildGenerateNodeReferencePayload(bindings: readonly GenerateNodeReferenceBinding[]) {
  const referenceBindings = buildGenerateNodeCanonicalReferenceBindings(bindings)
  return {
    reference_bindings: referenceBindings,
    reference_images: referenceBindings
      .filter((binding): binding is GenerateNodeReferenceBinding & { type: 'image'; url: string } => binding.type === 'image' && Boolean(binding.url))
      .map(binding => ({
        url: binding.url,
        reference_index: binding.reference_index,
        reference_id: binding.reference_id,
        reference_role: binding.reference_role,
        ...(binding.source_asset_ids?.length ? { source_asset_ids: [...binding.source_asset_ids] } : {}),
      })),
  }
}

export function validateGenerateNodeReferenceBindingsForExecution(
  bindings: readonly GenerateNodeReferenceBinding[],
): GenerateNodeReferenceBinding[] {
  const normalized = normalizeGenerateNodeReferenceBindings(bindings, [])
  const unsupported = normalized.find(binding => binding.type === 'video' || binding.type === 'audio')
  if (unsupported) {
    throw generateNodeReferenceError(
      'REFERENCE_MEDIA_UNSUPPORTED',
      `Reference media type ${unsupported.type} is not executable yet`,
      unsupported.reference_index,
    )
  }
  return normalized
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
  referenceBindings?: readonly GenerateNodeReferenceBinding[]
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
  referenceModeHint?: string
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
  const referenceBindings = input.referenceBindings === undefined
    ? undefined
    : buildGenerateNodeCanonicalReferenceBindings(input.referenceBindings)
  const mergedSourceAssetIds = referenceBindings === undefined
    ? sourceAssetIds
    : Array.from(new Set([
      ...sourceAssetIds,
      ...referenceBindings.flatMap(binding => binding.source_asset_ids || []),
    ]))
  const hasCompileProvenance = Boolean(input.compiledPrompt || input.compiledInputHash || input.skillName)

  return {
    name: `${assetType === 'image' ? '🖼️' : assetType === 'video' ? '🎬' : '📝'} ${input.prompt.slice(0, 10) || input.selectedModel}...`,
    type: assetType,
    ...(assetType === 'prompt' ? {} : { file_path: contentStr }),
    ...(mergedSourceAssetIds.length ? { source_asset_ids: mergedSourceAssetIds } : {}),
    data: {
      content: contentStr,
      ...mediaFields,
      ...(mergedSourceAssetIds.length ? { source_asset_ids: mergedSourceAssetIds } : {}),
      ...(referenceBindings !== undefined ? { reference_bindings: referenceBindings } : {}),
      ...(input.referenceModeHint ? { reference_mode_hint: input.referenceModeHint } : {}),
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

export function resolveGenerateNodeResultReferenceBindings(
  result: unknown,
): GenerateNodeReferenceBinding[] | undefined {
  if (!isGenerateNodeReferenceRecord(result) || !Array.isArray(result.reference_bindings)) return undefined
  try {
    return buildGenerateNodeCanonicalReferenceBindings(
      normalizeGenerateNodeReferenceBindings(result.reference_bindings, []),
    )
  } catch {
    return undefined
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
    'reference_bindings',
    'reference_mode_hint',
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

export type GenerateNodeRunToken = Readonly<{
  runId: number
  referenceBindings: readonly GenerateNodeReferenceBinding[]
}>

export function createGenerateNodeRunTracker() {
  let nextRunId = 1
  let activeRun: GenerateNodeRunToken | null = null
  return {
    hasActive() {
      return activeRun !== null
    },
    start(bindings: readonly GenerateNodeReferenceBinding[]): GenerateNodeRunToken | null {
      if (activeRun) return null
      const referenceBindings = buildGenerateNodeCanonicalReferenceBindings(bindings).map(binding => {
        const sourceAssetIds = binding.source_asset_ids ? [...binding.source_asset_ids] : undefined
        if (sourceAssetIds) Object.freeze(sourceAssetIds)
        return Object.freeze({
          ...binding,
          ...(sourceAssetIds ? { source_asset_ids: sourceAssetIds } : {}),
        })
      })
      Object.freeze(referenceBindings)
      activeRun = Object.freeze({ runId: nextRunId, referenceBindings })
      nextRunId += 1
      return activeRun
    },
    isCurrent(token: GenerateNodeRunToken | null | undefined) {
      return Boolean(token && activeRun === token)
    },
    complete(token: GenerateNodeRunToken | null | undefined) {
      if (!token || activeRun !== token) return false
      activeRun = null
      return true
    },
    invalidate() {
      activeRun = null
    },
  }
}

export function cancelGenerateNodeChatSkillRun(input: {
  tracker: Pick<ReturnType<typeof createGenerateNodeRunTracker>, 'isCurrent' | 'invalidate'>
  activeChatToken: GenerateNodeRunToken | null
}) {
  if (!input.activeChatToken || !input.tracker.isCurrent(input.activeChatToken)) return false
  input.tracker.invalidate()
  return true
}

export function resolveGenerateNodeInitialRunStatus(input: {
  currentStatus?: string
  hasResult: boolean
}): 'idle' | 'success' | undefined {
  if (input.currentStatus !== undefined) return undefined
  return input.hasResult ? 'success' : 'idle'
}

export function settleGenerateNodeChatSkillRun(input: {
  tracker: Pick<ReturnType<typeof createGenerateNodeRunTracker>, 'complete'>
  token: GenerateNodeRunToken
  activeChatToken: GenerateNodeRunToken | null
}) {
  if (input.activeChatToken !== input.token) return false
  return input.tracker.complete(input.token)
}

export function resolveGenerateNodeChatSkillPreviewCached(input: {
  isChatSkillCompileOnly: boolean
  cached: unknown
}): boolean | undefined {
  return input.isChatSkillCompileOnly ? Boolean(input.cached) : undefined
}

export function completeGenerateNodeRunAfterEffects(
  tracker: Pick<ReturnType<typeof createGenerateNodeRunTracker>, 'isCurrent' | 'complete'>,
  token: GenerateNodeRunToken,
  effects: () => void,
) {
  if (!tracker.isCurrent(token)) return false
  effects()
  return tracker.complete(token)
}

export function freezeGenerateNodeExecutionReferences(
  packet: any,
  executionBindings: readonly GenerateNodeReferenceBinding[],
): any {
  const packetRecord = packet && typeof packet === 'object' && !Array.isArray(packet)
    ? packet as Record<string, any>
    : { content: packet }
  const referenceBindings = buildGenerateNodeCanonicalReferenceBindings(executionBindings)
  const sourceAssetIds = Array.from(new Set([
    ...normalizeGenerateNodeSourceAssetIds(packetRecord.source_asset_ids),
    ...referenceBindings.flatMap(binding => binding.source_asset_ids || []),
  ]))
  const {
    reference_bindings: _packetReferenceBindings,
    source_asset_ids: _packetSourceAssetIds,
    ...packetWithoutReferences
  } = packetRecord
  return {
    ...packetWithoutReferences,
    ...(sourceAssetIds.length ? { source_asset_ids: sourceAssetIds } : {}),
    reference_bindings: referenceBindings,
  }
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
  referenceBindings?: readonly GenerateNodeReferenceBinding[]
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
  const legacyIncomingAssets = Array.isArray(input.incomingAssets)
    ? input.incomingAssets.map(asset => ({ ...asset, ...(asset.source_asset_ids ? { source_asset_ids: [...asset.source_asset_ids] } : {}) }))
    : []
  if (input.referenceBindings === undefined && input.incomingImage) {
    const incomingImage = normalizeGenerateNodeImageUrl(input.incomingImage)
    const hasIncomingImage = legacyIncomingAssets.some(asset => {
      if (asset.type !== 'image') return false
      const assetUrl = asset.url || asset.file_path || asset.content || ''
      return normalizeGenerateNodeImageUrl(String(assetUrl)) === incomingImage
    })
    if (!hasIncomingImage) legacyIncomingAssets.unshift({ type: 'image', file_path: incomingImage, url: incomingImage })
  }
  const normalizedReferenceBindings = validateGenerateNodeReferenceBindingsForExecution(
    input.referenceBindings === undefined
      ? normalizeGenerateNodeReferenceBindings(undefined, legacyIncomingAssets)
      : input.referenceBindings,
  )
  const referencePayload = buildGenerateNodeReferencePayload(normalizedReferenceBindings)
  const incomingImages = referencePayload.reference_images.map(reference => reference.url)
  const incomingText = normalizedReferenceBindings
    .filter(binding => binding.type === 'prompt' && binding.content)
    .map(binding => String(binding.content).trim())
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
  if (normalizedReferenceBindings.length) payload.params.incoming_assets = referencePayload.reference_bindings
  if (referencePayload.reference_images.length) payload.reference_images = referencePayload.reference_images
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

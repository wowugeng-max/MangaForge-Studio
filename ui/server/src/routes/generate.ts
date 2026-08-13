import type { Express } from 'express'
import { readModels, type ModelRecord } from '../model-store'
import { readKeys, type APIKeyRecord } from '../key-store'
import { readProviders, type ProviderRecord } from '../provider-store'
import {
  executeWithRuntimeModel,
  preflightRuntimeRequestTransport,
  type RuntimeExecutionOptions,
  type RuntimeRequestTransportPreflightOptions,
} from '../llm/provider-runtime'
import { hasLLMMessageContent, imageUrlFromLLMContentPart, stringifyLLMMessageContent, stringifyLLMMessageTextContent, textFromLLMContentPart, type LLMMessage, type LLMMessageContentPart, type LLMRequest, type LLMResponse } from '../llm/types'
import { MultiReferenceTransportError } from '../llm/multi-reference-transport'
import { registerTask, taskMessageManager, unregisterTask, type CancelToken } from '../ws-manager'
import { executeLocalComfyWorkflow, interruptLocalComfy, type ExecuteLocalComfyWorkflowOptions, type LocalComfyResult } from '../comfy-local'
import { parseSkillCommand } from '../skills/skill-command'
import { logSkillCompileFailure } from '../skills/compile-failure-log'
import { CanvasReferenceError, validateCanvasReferenceAssets } from '../skills/reference-bindings'
import type {
  CanvasMediaMode,
  CanvasReferenceBinding,
  CanvasReferenceModeHint,
  CanvasReferenceRole,
  CanvasReferenceType,
  PromptCompileInput,
  PromptCompileResult,
} from '../skills/types'

type ExecuteGenerate = (
  activeWorkspace: string,
  request: LLMRequest,
  preferredModelId?: number,
  options?: RuntimeExecutionOptions,
) => Promise<LLMResponse<any> & { runtimeSelection?: any }>

type GenerateRouteDeps = {
  execute?: ExecuteGenerate
  preflightTransport?: (
    activeWorkspace: string,
    request: LLMRequest,
    preferredModelId?: number,
    options?: RuntimeRequestTransportPreflightOptions,
  ) => Promise<unknown>
  comfyExecute?: (options: ExecuteLocalComfyWorkflowOptions) => Promise<LocalComfyResult>
  comfyInterrupt?: (options: ExecuteLocalComfyWorkflowOptions) => Promise<boolean> | boolean
  /** Workspace-scoped Skill compiler boundary supplied by index.ts. */
  skillRuntime?: { compilePromptSkill: (input: PromptCompileInput) => Promise<CompiledSkillResult> }
  /** Direct compiler injection is useful for isolated route tests. */
  compilePromptSkill?: (input: PromptCompileInput) => Promise<CompiledSkillResult>
  sendMessage?: (clientId: string, message: Record<string, any>) => Promise<boolean> | boolean
  registerTask?: (clientId: string, adapterId: string, cancelToken: CancelToken) => void
  unregisterTask?: (clientId: string) => void
}

type CompiledSkillResult = {
  result: PromptCompileResult
  inputHash: string
  cached: boolean
  compilerModelId: number
  skill: { name: string; packId: string; revision: string; sourceUrl?: string }
}

type SkillCompileAudit = {
  skill_name: string
  skill_pack_id: string
  skill_pack_source?: string
  skill_revision: string
  compiled_prompt: string
  compiled_negative_prompt: string
  compiled_references: string[]
  compiled_input_hash: string
  warnings: string[]
  compiler_model_id: number
  raw_prompt: string
  reference_bindings?: CanvasReferenceBinding[]
  reference_mode_hint?: CanvasReferenceModeHint
}

const SKILL_MEDIA_MODES = new Set<CanvasMediaMode>([
  'text_to_image', 'image_to_image', 'text_to_video', 'image_to_video',
])
const SKILL_NODE_PARAM_KEYS = new Set(['size', 'aspect_ratio', 'duration', 'cameraParams', 'customMovements'])

function errorBody(message: unknown, extra: Record<string, any> = {}) {
  const error = String(message)
  return { error, detail: error, ...extra }
}

function skillErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && typeof (error as any).code === 'string') return String((error as any).code)
  return 'SKILL_COMPILE_FAILED'
}

function skillErrorStatus(code: string): number {
  // Ambiguous selectors and duplicate leading commands are client choices;
  // callers can resolve them without retrying a provider request.
  if (code === 'SKILL_AMBIGUOUS' || code === 'SKILL_COMMAND_DUPLICATE') return 409
  // Upstream provider failures are not client errors and stay retryable.
  if (code === 'SKILL_COMPILER_PROVIDER_ERROR') return 502
  if (code.startsWith('SKILL_') || code.startsWith('REFERENCE_') || code.startsWith('MULTI_REFERENCE_')) return 422
  return 500
}

function skillErrorResponse(res: any, error: unknown) {
  const code = skillErrorCode(error)
  const detail = error instanceof Error ? error.message : String(error)
  return res.status(skillErrorStatus(code)).json({ error: detail, detail, error_code: code })
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

type IncomingCanvasAsset = {
  id?: number
  type: CanvasReferenceType
  reference_index: number
  reference_id: string
  reference_role: CanvasReferenceRole
  content?: string
  file_path?: string
  url?: string
  source_asset_ids?: number[]
}

function hasMeaningfulStructuredMessagePart(part: unknown): part is LLMMessageContentPart {
  if (!part || typeof part !== 'object' || Array.isArray(part)) return false
  const record = part as Record<string, unknown>
  if (typeof record.type !== 'string' || !record.type.trim()) return false
  return Object.entries(record).some(([key, value]) => {
    if (key === 'type' || value === undefined || value === null) return false
    if (typeof value === 'string') return Boolean(value.trim())
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') return Object.keys(value).length > 0
    return true
  })
}

function hasRouteMessageContent(content: LLMMessage['content']): boolean {
  if (hasLLMMessageContent(content)) return true
  return Array.isArray(content) && content.some(hasMeaningfulStructuredMessagePart)
}

function cloneStructuredMessageValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => cloneStructuredMessageValue(item)) as T
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, cloneStructuredMessageValue(item)]),
  ) as T
}

function normalizeStructuredMessageContent(content: unknown): string | LLMMessageContentPart[] {
  if (!Array.isArray(content)) return stringifyLLMMessageContent(content)
  return content
    .map(part => {
      if (typeof part === 'string') return { type: 'text', text: part }
      if (!part || typeof part !== 'object') return null
      const record = cloneStructuredMessageValue(part) as Record<string, any>
      const text = typeof record.text === 'string' ? record.text : typeof record.content === 'string' ? record.content : ''
      if (text) return { ...record, type: record.type || 'text', text }
      const imageUrl = imageUrlFromLLMContentPart(record)
      if (imageUrl) return { type: 'image_url', image_url: { url: imageUrl } }
      return record
    })
    .filter((part): part is LLMMessageContentPart => Boolean(part && (
      hasLLMMessageContent([part]) || hasMeaningfulStructuredMessagePart(part)
    )))
}

function normalizeMessages(payload: any): LLMMessage[] {
  if (Array.isArray(payload?.messages) && payload.messages.length > 0) {
    return payload.messages
      .map((message: any) => ({
        role: ['system', 'assistant', 'tool'].includes(message?.role) ? message.role : 'user',
        content: normalizeStructuredMessageContent(message?.content),
      }))
      .filter((message: LLMMessage) => hasRouteMessageContent(message.content))
  }

  const messages: LLMMessage[] = []
  const systemPrompt = stringifyLLMMessageContent(payload?.system || payload?.systemPrompt || payload?.system_prompt)
  if (systemPrompt.trim()) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: stringifyLLMMessageContent(payload?.prompt || payload?.content || '开始执行') })
  return messages
}

function payloadValue(payload: any, params: Record<string, any>, ...keys: string[]) {
  for (const key of keys) {
    if (payload && payload[key] !== undefined && payload[key] !== null) return payload[key]
    if (params && params[key] !== undefined && params[key] !== null) return params[key]
  }
  return undefined
}

function rawPromptForSkill(payload: any, request?: LLMRequest): string {
  const params = payload?.params && typeof payload.params === 'object' ? payload.params : {}
  const explicit = payloadValue(payload, params, 'raw_prompt', 'rawPrompt', 'skill_prompt', 'skillPrompt')
  if (typeof explicit === 'string' && explicit.trim()) return explicit
  // `prompt` is intentionally only accepted when it is textual. ComfyUI uses
  // the same field for a JSON workflow; its editable Skill prompt can be sent
  // through skill_prompt without being confused with the workflow document.
  if (typeof payload?.prompt === 'string' && payload.prompt.trim()) return payload.prompt
  if (typeof payload?.content === 'string' && payload.content.trim()) return payload.content
  const messages = request?.messages || (Array.isArray(payload?.messages) ? normalizeMessages(payload) : [])
  const user = [...messages].reverse().find(message => message.role === 'user')
  return stringifyLLMMessageContent(user?.content || '')
}

function leadingSkillCommandCount(rawPrompt: string): number {
  const text = String(rawPrompt || '').trim()
  if (!text.startsWith('/')) return 0
  // Only consecutive command tokens at the beginning are invocations. A slash
  // later in the free-form prompt (`/skill hero /path`) is ordinary prompt
  // text, not a second command.
  const token = '[A-Za-z0-9][A-Za-z0-9._-]*'
  const commandToken = new RegExp(`^\\/${token}(?::${token})?$`)
  let count = 0
  for (const part of text.split(/\s+/)) {
    if (!commandToken.test(part)) break
    count += 1
  }
  return count
}

function normalizeSkillRevision(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || !value.trim()) {
    const error = new Error('skill_revision must be a non-empty string')
    ;(error as any).code = 'SKILL_REVISION_INVALID'
    throw error
  }
  return value.trim()
}

function skillSelectorForPayload(payload: any, params: Record<string, any>, rawPrompt: string) {
  const command = parseSkillCommand(rawPrompt)
  const skillName = payloadValue(payload, params, 'skill_name', 'skillName')
  const packId = payloadValue(payload, params, 'skill_pack_id', 'skillPackId', 'pack_id', 'packId')
  const revision = normalizeSkillRevision(payloadValue(payload, params, 'skill_revision', 'skillRevision'))
  const enabled = payloadValue(payload, params, 'skill_compile_enabled', 'skillCompileEnabled')
  const selected = typeof skillName === 'string' && skillName.trim()
    || typeof packId === 'string' && packId.trim()
    || command !== null
    || enabled === true
    || enabled === 'true'
    || enabled === 1
  if (!selected) return null
  if (leadingSkillCommandCount(rawPrompt) > 1) {
    const duplicate = new Error('Multiple leading Skill commands are not allowed')
    ;(duplicate as any).code = 'SKILL_COMMAND_DUPLICATE'
    throw duplicate
  }
  return {
    command,
    // A leading command is the explicit invocation. Its qualified Pack ID
    // must be forwarded to the compiler even when the dropdown selected a
    // different/default Pack, while a stale dropdown revision must not be.
    skillName: command?.name || (typeof skillName === 'string' && skillName.trim() ? skillName.trim() : undefined),
    packId: command?.packId || (typeof packId === 'string' && packId.trim() ? packId.trim() : undefined),
    ...(!command && revision ? { revision } : {}),
  }
}

function skillModeForPayload(payload: any, params: Record<string, any>): CanvasMediaMode {
  const raw = payloadValue(payload, params, 'type', 'mode')
  const mode = String(raw || '').trim() as CanvasMediaMode
  if (!SKILL_MEDIA_MODES.has(mode)) {
    const error = new Error(`Skill is not compatible with media mode ${mode || '(missing)'}`)
    ;(error as any).code = 'SKILL_MODE_INCOMPATIBLE'
    throw error
  }
  return mode
}

function normalizeSkillArguments(value: unknown): Record<string, string> | undefined {
  if (value === undefined || value === null) return undefined
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    const error = new Error('skill_arguments must be an object')
    ;(error as any).code = 'SKILL_ARGUMENT_INVALID'
    throw error
  }
  const result: Record<string, string> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item !== 'string' && typeof item !== 'number' && typeof item !== 'boolean') {
      const error = new Error(`skill_arguments.${key} must be a scalar value`)
      ;(error as any).code = 'SKILL_ARGUMENT_INVALID'
      throw error
    }
    result[key] = String(item)
  }
  return result
}

function skillNodeParams(payload: any, params: Record<string, any>): Record<string, unknown> {
  const nodeParams: Record<string, unknown> = {}
  for (const key of SKILL_NODE_PARAM_KEYS) {
    const value = payloadValue(payload, params, key)
    if (value !== undefined && value !== null && value !== '') nodeParams[key] = value
  }
  return nodeParams
}

function cloneMessage(message: LLMMessage): LLMMessage {
  return {
    ...message,
    content: Array.isArray(message.content)
      ? message.content.map(part => part && typeof part === 'object' ? { ...(part as any) } : part)
      : message.content,
  }
}

function replaceCompiledPrompt(messages: LLMMessage[], prompt: string): LLMMessage[] {
  const next = messages.map(cloneMessage)
  let index = next.findLastIndex(message => message.role === 'user')
  if (index < 0) {
    next.push({ role: 'user', content: prompt })
    return next
  }
  const message = next[index]
  if (!Array.isArray(message.content)) {
    message.content = prompt
    return next
  }
  const retained: any[] = []
  let textInserted = false
  for (const part of message.content) {
    const image = imageUrlFromLLMContentPart(part)
    if (image) {
      retained.push(part)
      continue
    }
    const text = stringifyLLMMessageContent(part)
    if (!textInserted && text) {
      retained.push({ ...(part && typeof part === 'object' ? part : {}), type: 'text', text: prompt })
      textInserted = true
      continue
    }
    // Keep non-text structured parts (for example input_file) but remove
    // stale user text/assets so the provider sees one final compiled prompt.
    if (!text && part && typeof part === 'object') retained.push(part)
  }
  if (!textInserted) retained.unshift({ type: 'text', text: prompt })
  message.content = retained
  return next
}

function compileAudit(compiled: CompiledSkillResult, rawPrompt: string): SkillCompileAudit {
  const referenceBindings = compiled.result.reference_bindings?.map(binding => ({
    ...binding,
    ...(binding.source_asset_ids ? { source_asset_ids: [...binding.source_asset_ids] } : {}),
  }))
  return {
    skill_name: compiled.result.skill_name,
    skill_pack_id: compiled.skill.packId,
    ...(compiled.skill.sourceUrl ? { skill_pack_source: compiled.skill.sourceUrl } : {}),
    skill_revision: compiled.skill.revision || compiled.result.skill_version,
    compiled_prompt: compiled.result.prompt,
    compiled_negative_prompt: compiled.result.negative_prompt || '',
    compiled_references: [...compiled.result.references_used],
    compiled_input_hash: compiled.inputHash,
    warnings: [...compiled.result.warnings],
    compiler_model_id: compiled.compilerModelId,
    raw_prompt: rawPrompt,
    ...(referenceBindings ? { reference_bindings: referenceBindings } : {}),
    ...(compiled.result.reference_mode_hint ? { reference_mode_hint: compiled.result.reference_mode_hint } : {}),
  }
}

function normalizeCanvasAssetImageUrl(value: unknown, preserveRootRelative = false) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^(https?:|data:|blob:)/i.test(text)) return text
  if (text.startsWith('/api/assets/media/')) return text
  if (text.startsWith('/api/files/')) return text
  if (preserveRootRelative && text.startsWith('/')) return text
  return `/api/assets/media/${encodeURIComponent(text.replace(/^\/+/, ''))}`
}

function positiveAssetId(value: unknown): number | undefined {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
}

function normalizeIncomingAssets(value: unknown, referenceImagesOnly = false): IncomingCanvasAsset[] {
  if (!Array.isArray(value)) {
    throw new CanvasReferenceError('REFERENCE_ASSET_INVALID', 'Canvas references must be an array')
  }
  const rawAssets = value.map((item: any, arrayIndex) => {
    const referenceIndex = arrayIndex + 1
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new CanvasReferenceError('REFERENCE_ASSET_INVALID', `Reference ${referenceIndex} must be an object`, referenceIndex)
    }

    const rawType = String(item.type ?? item.asset_type ?? item.assetType ?? '').trim().toLowerCase()
    const explicitUrl = item.url ?? item.data?.url
    const filePath = item.file_path ?? item.filePath ?? item.data?.file_path ?? item.data?.filePath
    const legacyContent = item.content ?? item.data?.content
    const rawMediaUrl = explicitUrl ?? filePath ?? legacyContent
    const inferredImage = referenceImagesOnly
      || rawType === 'image'
      || (!rawType && typeof rawMediaUrl === 'string' && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(rawMediaUrl))
    const type = (rawType || (inferredImage ? 'image' : 'prompt')) as CanvasReferenceType
    const id = positiveAssetId(item.id)
    const rawLineage = item.source_asset_ids ?? item.sourceAssetIds
    if (rawLineage !== undefined && !Array.isArray(rawLineage)) {
      throw new CanvasReferenceError(
        'REFERENCE_LINEAGE_INVALID',
        `Reference ${referenceIndex} source_asset_ids must be an array`,
        referenceIndex,
      )
    }
    const lineage = normalizeSourceAssetIds([
      ...(id ? [id] : []),
      ...(rawLineage ?? []),
    ])
    const normalized: Record<string, any> = {
      type,
      reference_index: item.reference_index ?? item.referenceIndex,
      reference_id: item.reference_id ?? item.referenceId,
      reference_role: item.reference_role ?? item.referenceRole ?? item.role,
      ...(lineage.length ? { source_asset_ids: lineage } : {}),
    }

    if (type === 'prompt') {
      const content = stringifyLLMMessageContent(item.content ?? item.text ?? item.data?.content ?? item.data?.text)
      if (!content.trim()) {
        throw new CanvasReferenceError(
          'REFERENCE_ASSET_INVALID',
          `Reference ${referenceIndex} prompt content must be non-empty`,
          referenceIndex,
        )
      }
      normalized.content = content
    } else {
      if (typeof rawMediaUrl !== 'string' || !rawMediaUrl.trim()) {
        throw new CanvasReferenceError(
          'REFERENCE_ASSET_INVALID',
          `Reference ${referenceIndex} media url must be non-empty`,
          referenceIndex,
        )
      }
      normalized.url = normalizeCanvasAssetImageUrl(rawMediaUrl, explicitUrl !== undefined)
    }
    return normalized
  })

  return validateCanvasReferenceAssets(rawAssets as any).map(binding => ({
    ...binding,
    ...(binding.url ? { file_path: binding.url } : {}),
    ...(binding.source_asset_ids ? { source_asset_ids: [...binding.source_asset_ids] } : {}),
  }))
}

function incomingAssetCollectionForPayload(payload: any): { value: unknown; referenceImagesOnly: boolean } | null {
  const params = payload?.params && typeof payload.params === 'object' ? payload.params : {}
  const primary = [
    params.incoming_assets,
    params.incomingAssets,
    payload?.incoming_assets,
    payload?.incomingAssets,
  ]
  for (const value of primary) {
    if (value !== undefined && value !== null) return { value, referenceImagesOnly: false }
  }
  const bindingFallbacks = [
    params.reference_bindings,
    params.referenceBindings,
    payload?.reference_bindings,
    payload?.referenceBindings,
  ]
  for (const value of bindingFallbacks) {
    if (value !== undefined && value !== null) return { value, referenceImagesOnly: false }
  }
  const imageFallbacks = [
    params.reference_images,
    params.referenceImages,
    payload?.reference_images,
    payload?.referenceImages,
  ]
  for (const value of imageFallbacks) {
    if (value !== undefined && value !== null) return { value, referenceImagesOnly: true }
  }
  return null
}

function canonicalIncomingAssetsForPayload(payload: any): IncomingCanvasAsset[] {
  const collection = incomingAssetCollectionForPayload(payload)
  return collection ? normalizeIncomingAssets(collection.value, collection.referenceImagesOnly) : []
}

function isImageMessagePart(part: unknown): boolean {
  if (!part || typeof part !== 'object') return false
  const type = String((part as Record<string, any>).type || '').toLowerCase()
  return type === 'image_url' || type === 'input_image'
}

function isTextMessagePart(part: unknown): boolean {
  if (typeof part === 'string') return true
  if (!part || typeof part !== 'object') return false
  const type = String((part as Record<string, any>).type || '').toLowerCase()
  return type === 'text' || type === 'input_text' || type === 'output_text' || Boolean(textFromLLMContentPart(part))
}

function appendIncomingAssetsToMessages(messages: LLMMessage[], assets: IncomingCanvasAsset[]): LLMMessage[] {
  if (!assets.length) return messages
  const imageAssets = assets.filter(asset => asset.type === 'image' && asset.url)
  const textAssets = assets
    .filter(asset => asset.type !== 'image' && asset.content)
    .map(asset => String(asset.content).trim())
    .filter(Boolean)
  if (!imageAssets.length && !textAssets.length) return messages

  const nextMessages = messages.map(message => ({ ...message, content: Array.isArray(message.content) ? [...message.content] : message.content }))
  let userIndex = nextMessages.findLastIndex(message => message.role === 'user')
  if (userIndex < 0) {
    nextMessages.push({ role: 'user', content: '开始执行' })
    userIndex = nextMessages.length - 1
  }

  const userMessage = nextMessages[userIndex]
  const incomingText = textAssets.length ? `[连线素材]:\n${textAssets.join('\n')}` : ''
  const imageParts = imageAssets.map(asset => ({
    type: 'image_url' as const,
    image_url: { url: String(asset.url) },
  }))

  if (Array.isArray(userMessage.content)) {
    const existingImageParts = userMessage.content.filter(isImageMessagePart)
    const rebuiltParts = userMessage.content.filter(part => !isImageMessagePart(part))
    const hasExistingText = rebuiltParts.some(isTextMessagePart)
    if (incomingText) rebuiltParts.push({ type: 'text', text: incomingText })
    else if (imageParts.length && !hasExistingText) rebuiltParts.unshift({ type: 'text', text: '描述这些参考素材' })
    rebuiltParts.push(...(imageParts.length ? imageParts : existingImageParts))
    userMessage.content = rebuiltParts
  } else if (imageParts.length) {
    const baseText = stringifyLLMMessageTextContent(userMessage.content).trim()
    const text = [baseText, incomingText].filter(Boolean).join('\n\n') || '描述这些参考素材'
    userMessage.content = [{ type: 'text', text }, ...imageParts]
  } else {
    const baseText = stringifyLLMMessageTextContent(userMessage.content).trim()
    userMessage.content = [baseText, incomingText].filter(Boolean).join('\n\n') || '描述这些参考素材'
  }
  return nextMessages
}

const CANVAS_CONTROL_PARAM_KEYS = new Set([
  'client_id',
  'temperature',
  'max_tokens',
  'maxTokens',
  'stream',
  'response_mode',
  'incoming_assets',
  'incomingAssets',
  'reference_bindings',
  'referenceBindings',
  'reference_images',
  'referenceImages',
  'skill_name',
  'skillName',
  'skill_pack_id',
  'skillPackId',
  'pack_id',
  'packId',
  'skill_arguments',
  'skillArguments',
  'arguments',
  'raw_prompt',
  'rawPrompt',
  'skill_prompt',
  'skillPrompt',
  'skill_compile_enabled',
  'skillCompileEnabled',
  'compiler_model_id',
  'compilerModelId',
  'skill_compiler_model_id',
  'skillCompilerModelId',
  'workflow_mapping',
  'workflowMapping',
  'skill_comfy_mapping',
  'skillComfyMapping',
  'comfy_skill_mapping',
  'comfySkillMapping',
])

function extractCanvasRuntimeParams(params: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(params).filter(([key, value]) => {
      if (CANVAS_CONTROL_PARAM_KEYS.has(key)) return false
      if (value === undefined || value === null || value === '') return false
      return true
    }),
  )
}

export function buildCanvasGenerateLLMRequest(
  payload: any,
  canonicalIncomingAssets?: readonly IncomingCanvasAsset[],
): LLMRequest {
  const params = payload?.params && typeof payload.params === 'object' ? payload.params : {}
  const incomingAssets = canonicalIncomingAssets
    ? canonicalIncomingAssets.map(asset => ({
      ...asset,
      ...(asset.source_asset_ids ? { source_asset_ids: [...asset.source_asset_ids] } : {}),
    }))
    : canonicalIncomingAssetsForPayload(payload)
  const firstIncomingImage = incomingAssets.find(asset => asset.type === 'image' && asset.url)?.url || ''
  const request: any = {
    ...extractCanvasRuntimeParams(params),
    model: String(payload?.model || payload?.model_name || 'balanced'),
    type: String(payload?.type || payload?.mode || '').trim() || undefined,
    messages: appendIncomingAssetsToMessages(normalizeMessages(payload), incomingAssets),
    temperature: toNumber(params.temperature ?? payload?.temperature, 0.3),
    max_tokens: toNumber(params.max_tokens ?? params.maxTokens ?? payload?.max_tokens ?? payload?.maxTokens, 4096),
    stream: Boolean(params.stream ?? payload?.stream ?? false),
    response_mode: params.response_mode || payload?.response_mode || 'auto',
    response_format: { type: 'text' },
  }
  const routingStrategy = String(payload?.routing_strategy || payload?.routingStrategy || params.routing_strategy || params.routingStrategy || '').trim()
  if (routingStrategy) request.routing_strategy = routingStrategy
  const imageUrl = String(firstIncomingImage || payload?.image_url || payload?.imageUrl || '').trim()
  if (imageUrl) request.image_url = imageUrl
  const referenceImages = incomingAssets
    .filter(asset => asset.type === 'image' && Boolean(asset.url))
    .map(asset => ({
      url: String(asset.url),
      reference_index: asset.reference_index,
      reference_id: asset.reference_id,
      reference_role: asset.reference_role,
      ...(asset.source_asset_ids?.length ? { source_asset_ids: [...asset.source_asset_ids] } : {}),
    }))
  if (referenceImages.length) request.reference_images = referenceImages
  const sourceAssetIds = Array.from(new Set(incomingAssets.flatMap(incomingAssetSourceIds)))
  if (sourceAssetIds.length) request.source_asset_ids = sourceAssetIds
  return request
}

async function compileCanvasSkillIfSelected(
  payload: any,
  activeWorkspace: string,
  request: LLMRequest,
  incomingAssets: readonly IncomingCanvasAsset[],
  compile?: (input: PromptCompileInput) => Promise<CompiledSkillResult>,
): Promise<{ request: LLMRequest; audit: SkillCompileAudit; result: PromptCompileResult; selector: ReturnType<typeof skillSelectorForPayload> } | null> {
  if (!compile) {
    // Explicit Skill use is a configuration error when the route was mounted
    // without the workspace runtime boundary. It must still short-circuit all
    // provider/Comfy/task-manager work.
    const raw = rawPromptForSkill(payload, request)
    const params = payload?.params && typeof payload.params === 'object' ? payload.params : {}
    const selector = skillSelectorForPayload(payload, params, raw)
    if (selector) {
      const error = new Error('Prompt Skill runtime is not configured')
      ;(error as any).code = 'SKILL_COMPILE_FAILED'
      throw error
    }
    return null
  }

  const params = payload?.params && typeof payload.params === 'object' ? payload.params : {}
  const rawPrompt = rawPromptForSkill(payload, request)
  const selector = skillSelectorForPayload(payload, params, rawPrompt)
  if (!selector) return null
  const mode = skillModeForPayload(payload, params)
  const argumentsValue = payloadValue(payload, params, 'skill_arguments', 'skillArguments', 'arguments')
  const compilerModelValue = payloadValue(payload, params, 'compiler_model_id', 'compilerModelId', 'skill_compiler_model_id', 'skillCompilerModelId')
  let compilerModelId: number | undefined
  if (compilerModelValue !== undefined && compilerModelValue !== null && compilerModelValue !== '') {
    if (typeof compilerModelValue !== 'number' && typeof compilerModelValue !== 'string') {
      const error = new Error('compiler_model_id must be a non-negative integer')
      ;(error as any).code = 'SKILL_COMPILER_MODEL_INVALID'
      throw error
    }
    const parsed = Number(compilerModelValue)
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      const error = new Error('compiler_model_id must be a non-negative integer')
      ;(error as any).code = 'SKILL_COMPILER_MODEL_INVALID'
      throw error
    }
    compilerModelId = parsed
  }
  const input: PromptCompileInput = {
    ...(selector.skillName ? { skillName: selector.skillName } : {}),
    ...(selector.packId ? { packId: selector.packId } : {}),
    ...(selector.revision ? { revision: selector.revision } : {}),
    rawPrompt,
    mode,
    incomingAssets: incomingAssets.map(asset => ({
      type: asset.type,
      ...(asset.url ? { url: asset.url } : {}),
      ...(asset.content ? { content: asset.content } : {}),
      reference_index: asset.reference_index,
      reference_id: asset.reference_id,
      reference_role: asset.reference_role,
      ...(asset.source_asset_ids?.length ? { source_asset_ids: [...asset.source_asset_ids] } : {}),
    })),
    nodeParams: skillNodeParams(payload, params),
    ...(normalizeSkillArguments(argumentsValue) ? { arguments: normalizeSkillArguments(argumentsValue) } : {}),
    ...(compilerModelId !== undefined ? { compilerModelId } : {}),
    activeWorkspace,
  }
  const compiled = await compile(input)
  const audit = compileAudit(compiled, rawPrompt)
  const nextRequest: LLMRequest = {
    ...request,
    // Media body builders use request.prompt; chat/text providers use the
    // final user message. Keep both in sync with the immutable compiler result.
    prompt: compiled.result.prompt,
    negative_prompt: compiled.result.negative_prompt || undefined,
    messages: replaceCompiledPrompt(request.messages, compiled.result.prompt),
  } as LLMRequest
  return { request: nextRequest, audit, result: compiled.result, selector }
}

async function resolvePreferredModelId(activeWorkspace: string, payload: any): Promise<number | undefined> {
  const apiKeyId = Number(payload?.api_key_id ?? payload?.keyId ?? payload?.key_id ?? 0)
  const providerId = String(payload?.provider || payload?.provider_id || payload?.providerId || '').trim()
  const modelName = String(payload?.model || payload?.model_name || '')
  if (!modelName) return undefined

  const models = await readModels(activeWorkspace)
  const sameKey = (model: ModelRecord) => Number(model.api_key_id || 0) === apiKeyId
  const sameProvider = (model: ModelRecord) => !providerId || model.provider === providerId
  const sameName = (model: ModelRecord) => model.model_name === modelName || model.display_name === modelName
  const exact = models.find(model => sameName(model) && sameProvider(model) && (!apiKeyId || sameKey(model)))
  if (exact) return exact.id
  if (providerId) {
    const providerModels = models.filter(sameProvider)
    const namedInProvider = providerModels.find(sameName)
    if (namedInProvider) return namedInProvider.id
    const available = providerModels.find(model => model.health_status !== 'disabled' && model.is_active !== false) || providerModels[0]
    return available?.id
  }
  return models.find(sameName)?.id
}

function extractClientId(payload: any): string {
  return String(payload?.client_id || payload?.clientId || payload?.params?.client_id || payload?.params?.clientId || '').trim()
}

function normalizeSourceAssetIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<number>()
  const ids: number[] = []
  for (const item of value) {
    const id = Number(item)
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

function incomingAssetSourceIds(asset: IncomingCanvasAsset): number[] {
  return Array.from(new Set([
    ...(asset.id ? [asset.id] : []),
    ...normalizeSourceAssetIds(asset.source_asset_ids),
  ]))
}

function responsePayload(response: LLMResponse<any> & { runtimeSelection?: any }, sourceAssetIds: number[] = [], audit?: SkillCompileAudit) {
  const lineage = sourceAssetIds.length ? { source_asset_ids: sourceAssetIds } : {}
  return {
    success: true,
    content: response.content,
    ...lineage,
    ...(audit || {}),
    result: { content: response.content, ...lineage, ...(audit || {}) },
    output: response.output,
    parsed: response.parsed,
    usage: response.usage,
    finish_reason: response.finish_reason,
    runtimeSelection: response.runtimeSelection,
  }
}

function parseWorkflowPayload(payload: any): Record<string, any> {
  const params = payload?.params && typeof payload.params === 'object' ? payload.params : {}
  const candidate = payload?.workflow_json || payload?.workflowJson || payload?.workflow
    || params?.workflow_json || params?.workflowJson || params?.workflow
    || payload?.prompt
  if (candidate && typeof candidate === 'object') return candidate
  if (typeof candidate === 'string' && candidate.trim()) {
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      throw new Error('ComfyUI workflow must be valid JSON')
    }
  }
  throw new Error('ComfyUI workflow is required')
}

function workflowSkillMapping(payload: any): Record<string, any> | null {
  const params = payload?.params && typeof payload.params === 'object' ? payload.params : {}
  const candidate = payloadValue(payload, params,
    'skill_comfy_mapping', 'skillComfyMapping', 'comfy_skill_mapping', 'comfySkillMapping',
    'workflow_mapping', 'workflowMapping', 'comfy_mapping', 'comfyMapping',
  )
  return candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate : null
}

function workflowPathParts(selector: unknown): string[] {
  if (typeof selector === 'string') return selector.replace(/^\$\.?/, '').split(/[/.]/).filter(Boolean)
  if (!selector || typeof selector !== 'object' || Array.isArray(selector)) return []
  const row = selector as Record<string, any>
  const nodeId = row.node_id ?? row.nodeId ?? row.node
  const field = row.input ?? row.field ?? row.path
  if (nodeId === undefined || field === undefined) return []
  return [String(nodeId), 'inputs', ...String(field).split(/[/.]/).filter(Boolean)]
}

function setWorkflowMappedValue(workflow: Record<string, any>, selector: unknown, value: string): boolean {
  const parts = workflowPathParts(selector)
  if (!parts.length) return false
  const isSafePart = (part: string) => !['__proto__', 'prototype', 'constructor'].includes(part)
  if (parts.some(part => !isSafePart(part))) return false
  let cursor: any = workflow
  for (const part of parts.slice(0, -1)) {
    if (!cursor || typeof cursor !== 'object' || !Object.prototype.hasOwnProperty.call(cursor, part)) return false
    cursor = cursor[part]
  }
  const finalPart = parts[parts.length - 1]
  if (!cursor || typeof cursor !== 'object' || !Object.prototype.hasOwnProperty.call(cursor, finalPart)) return false
  cursor[finalPart] = value
  return true
}

function multiReferenceMappingError(message: string): never {
  throw new MultiReferenceTransportError('MULTI_REFERENCE_MAPPING_REQUIRED', message)
}

function applyReferenceImagesToComfyWorkflow(
  workflow: Record<string, any>,
  mapping: Record<string, any> | null,
  referenceImages: readonly NonNullable<LLMRequest['reference_images']>[number][],
) {
  if (referenceImages.length <= 1) return
  const rawMappings = mapping && (mapping.reference_images ?? mapping.referenceImages)
  if (!Array.isArray(rawMappings)) {
    return multiReferenceMappingError('ComfyUI workflow must explicitly map every reference image')
  }
  if (rawMappings.length !== referenceImages.length) {
    return multiReferenceMappingError(
      `ComfyUI workflow must map exactly ${referenceImages.length} reference images`,
    )
  }

  const referencesByIndex = new Map(referenceImages.map(reference => [reference.reference_index, reference]))
  const expectedIndices = referenceImages.map(reference => reference.reference_index)
  const expectedIndexSet = new Set(expectedIndices)
  if (
    expectedIndexSet.size !== referenceImages.length
    || expectedIndices.some(referenceIndex => !Number.isSafeInteger(referenceIndex) || referenceIndex < 1)
  ) {
    return multiReferenceMappingError('Canonical reference image indices are invalid')
  }
  const seen = new Set<number>()
  const mappedInputs = new Set<string>()
  const normalizedMappings = rawMappings.map((row: any) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return multiReferenceMappingError('ComfyUI reference image mappings must be objects')
    }
    const referenceIndex = Number(row.reference_index ?? row.referenceIndex ?? row.index)
    const input = row.input ?? row.input_path ?? row.inputPath ?? row.path
    if (!Number.isSafeInteger(referenceIndex) || referenceIndex < 1 || !expectedIndexSet.has(referenceIndex)) {
      return multiReferenceMappingError(
        `ComfyUI reference image mapping index ${referenceIndex} does not match a canonical image reference`,
      )
    }
    if (seen.has(referenceIndex)) {
      return multiReferenceMappingError(`ComfyUI reference image mapping index ${referenceIndex} is duplicated`)
    }
    if (!referencesByIndex.has(referenceIndex)) {
      return multiReferenceMappingError(`ComfyUI reference image ${referenceIndex} is missing from the canonical request`)
    }
    if (typeof input !== 'string' || !input.trim()) {
      return multiReferenceMappingError(`ComfyUI reference image ${referenceIndex} input path is required`)
    }
    const inputKey = workflowPathParts(input).join('.')
    if (inputKey && mappedInputs.has(inputKey)) {
      return multiReferenceMappingError(`ComfyUI reference image input mapping ${input} is duplicated`)
    }
    seen.add(referenceIndex)
    if (inputKey) mappedInputs.add(inputKey)
    return { referenceIndex, input }
  })

  for (const referenceIndex of expectedIndices) {
    if (!seen.has(referenceIndex)) {
      return multiReferenceMappingError(`ComfyUI reference image mapping index ${referenceIndex} is missing`)
    }
  }

  for (const row of normalizedMappings) {
    const reference = referencesByIndex.get(row.referenceIndex)!
    if (!setWorkflowMappedValue(workflow, row.input, reference.url)) {
      return multiReferenceMappingError(`ComfyUI reference image ${row.referenceIndex} input mapping is invalid`)
    }
  }
}

function applyCompiledSkillToComfyPayload(
  payload: any,
  compiled?: PromptCompileResult,
  referenceImages: readonly NonNullable<LLMRequest['reference_images']>[number][] = [],
): any {
  const mapping = workflowSkillMapping(payload)
  const workflow = JSON.parse(JSON.stringify(parseWorkflowPayload(payload)))
  if (compiled) {
    const promptSelector = mapping && (mapping.compiled_prompt ?? mapping.compiledPrompt ?? mapping.prompt)
    const negativeSelector = mapping && (mapping.compiled_negative_prompt ?? mapping.compiledNegativePrompt ?? mapping.negative_prompt ?? mapping.negativePrompt)
    if (!promptSelector) {
      const error = new Error('ComfyUI workflow must explicitly map compiled_prompt')
      ;(error as any).code = 'SKILL_COMFY_MAPPING_REQUIRED'
      throw error
    }
    if (!setWorkflowMappedValue(workflow, promptSelector, compiled.prompt)) {
      const error = new Error('ComfyUI workflow compiled_prompt mapping is invalid')
      ;(error as any).code = 'SKILL_COMFY_MAPPING_REQUIRED'
      throw error
    }
    if (compiled.negative_prompt) {
      if (!negativeSelector) {
        const error = new Error('ComfyUI workflow must explicitly map compiled_negative_prompt')
        ;(error as any).code = 'SKILL_COMFY_MAPPING_REQUIRED'
        throw error
      }
      if (!setWorkflowMappedValue(workflow, negativeSelector, compiled.negative_prompt)) {
        const error = new Error('ComfyUI workflow compiled_negative_prompt mapping is invalid')
        ;(error as any).code = 'SKILL_COMFY_MAPPING_REQUIRED'
        throw error
      }
    }
  }
  applyReferenceImagesToComfyWorkflow(workflow, mapping, referenceImages)
  const nextPayload = { ...payload, workflow_json: workflow }
  // Keep `prompt` as the editable original/workflow field. resolveComfy uses
  // workflow_json first, so the compiled text never leaks as a guessed node.
  return nextPayload
}

function buildComfyHeaders(provider: ProviderRecord, key?: APIKeyRecord, baseUrl = '', payload?: any) {
  const headers: Record<string, string> = { ...(provider.custom_headers || {}) }
  const authType = String(provider.auth_type || 'bearer').toLowerCase()
  const secret = String(key?.key || payload?.api_key || payload?.apiKey || payload?.runninghub_api_key || payload?.runninghubApiKey || '').trim()
  if (!secret || authType === 'none') return headers
  if (/runninghub/i.test(baseUrl)) return headers
  if (authType === 'x-api-key' || authType === 'api-key') headers['x-api-key'] = secret
  else headers.Authorization = secret.toLowerCase().startsWith('bearer ') ? secret : `Bearer ${secret}`
  return headers
}

function normalizeComfyBaseUrl(baseUrl: string, key?: APIKeyRecord, payload?: any) {
  const normalized = String(baseUrl || '').replace(/\/+$/, '')
  const secret = String(key?.key || payload?.api_key || payload?.apiKey || payload?.runninghub_api_key || payload?.runninghubApiKey || '').trim()
  if (/runninghub/i.test(normalized) && secret && !normalized.endsWith(`/${secret}`) && !normalized.endsWith(secret)) {
    return `${normalized}/${secret}`
  }
  return normalized
}

async function resolveComfyExecutionOptions(
  activeWorkspace: string,
  payload: any,
  compiledSkill?: PromptCompileResult,
  referenceImages: readonly NonNullable<LLMRequest['reference_images']>[number][] = [],
): Promise<ExecuteLocalComfyWorkflowOptions | null> {
  const apiKeyId = Number(payload?.api_key_id ?? payload?.keyId ?? payload?.key_id ?? 0)
  const providers = await readProviders(activeWorkspace)
  const keys = await readKeys(activeWorkspace)
  const key = apiKeyId ? keys.find(item => Number(item.id) === apiKeyId) : undefined
  const providerId = String(payload?.provider || key?.provider || '')
  const provider = providers.find(item => item.id === providerId)
  const modelName = String(payload?.model || payload?.model_name || '').toLowerCase()
  const modelAsComfy = modelName === 'comfyui-workflow'
  const providerAsComfy = String(provider?.service_type || '').toLowerCase() === 'comfyui'

  if (!providerAsComfy && !modelAsComfy) return null
  if (!provider) throw new Error('ComfyUI provider not found')
  if (key && key.is_active === false) throw new Error('ComfyUI key is disabled')

  const baseUrl = normalizeComfyBaseUrl((key as any)?.base_url || payload?.base_url || payload?.baseUrl || payload?.comfy_base_url || payload?.comfyBaseUrl || provider.default_base_url || '', key, payload)
  if (!baseUrl) throw new Error('ComfyUI base URL is not configured')
  const workflowPayload = compiledSkill || referenceImages.length > 1
    ? applyCompiledSkillToComfyPayload(payload, compiledSkill, referenceImages)
    : payload

  return {
    workspace: activeWorkspace,
    baseUrl,
    workflow: parseWorkflowPayload(workflowPayload),
    inputFiles: payload?.input_files && typeof payload.input_files === 'object'
      ? payload.input_files
      : payload?.inputFiles && typeof payload.inputFiles === 'object'
        ? payload.inputFiles
        : undefined,
    comfyInputDir: String(payload?.comfy_input_dir || payload?.comfyInputDir || '').trim() || undefined,
    headers: buildComfyHeaders(provider, key, baseUrl, payload),
  }
}

function comfyResponsePayload(response: LocalComfyResult, sourceAssetIds: number[] = [], audit?: SkillCompileAudit) {
  const firstOutput = response.output_files[0]
  const content = firstOutput?.media_url || firstOutput?.path || ''
  const lineage = sourceAssetIds.length ? { source_asset_ids: sourceAssetIds } : {}
  return {
    success: true,
    content,
    ...lineage,
    ...(audit || {}),
    result: {
      content,
      ...lineage,
      ...(audit || {}),
      prompt_id: response.prompt_id,
      output_files: response.output_files,
      history: response.history,
    },
  }
}

export function registerGenerateRoutes(app: Express, getWorkspace: () => string, deps: GenerateRouteDeps = {}) {
  const execute = deps.execute || executeWithRuntimeModel
  const preflightTransport = deps.preflightTransport || preflightRuntimeRequestTransport
  const comfyExecute = deps.comfyExecute || executeLocalComfyWorkflow
  const comfyInterrupt = deps.comfyInterrupt || ((options: ExecuteLocalComfyWorkflowOptions) => interruptLocalComfy({ baseUrl: options.baseUrl, headers: options.headers }))
  const compile = deps.compilePromptSkill || deps.skillRuntime?.compilePromptSkill
  const sendMessage = deps.sendMessage || ((clientId, message) => taskMessageManager.sendMessage(clientId, message))
  const addTask = deps.registerTask || registerTask
  const removeTask = deps.unregisterTask || unregisterTask

  app.post(['/api/generate', '/api/generate/'], async (req, res) => {
    const activeWorkspace = getWorkspace()
    const payload = req.body || {}
    const clientId = extractClientId(payload)
    let comfyOptions: ExecuteLocalComfyWorkflowOptions | null = null
    let compiledSkill: { request: LLMRequest; audit: SkillCompileAudit; result: PromptCompileResult; selector: ReturnType<typeof skillSelectorForPayload> } | null = null
    let request: LLMRequest | null = null
    let incomingAssets: IncomingCanvasAsset[] = []
    let selectedSkill: ReturnType<typeof skillSelectorForPayload> = null
    let preferredModelId: number | undefined
    let runtimeTargetPreflighted = false
    let multiReferenceComfyTarget = false

    // Canonical reference and pure Skill selector validation stay ahead of all
    // provider-store, Comfy, task-manager, compiler, or executor side effects.
    try {
      incomingAssets = canonicalIncomingAssetsForPayload(payload)
      request = buildCanvasGenerateLLMRequest(payload, incomingAssets)
      const rawCandidate = rawPromptForSkill(payload)
      const params = payload?.params && typeof payload.params === 'object' ? payload.params : {}
      selectedSkill = skillSelectorForPayload(payload, params, rawCandidate)
      if (selectedSkill) skillModeForPayload(payload, params)
    } catch (error) {
      return skillErrorResponse(res, error)
    }

    const hasMultipleReferences = (request.reference_images?.length || 0) > 1
    if (hasMultipleReferences) {
      try {
        // Validate multi-reference Comfy mappings on a disposable workflow
        // clone before invoking the Skill compiler provider.
        multiReferenceComfyTarget = Boolean(await resolveComfyExecutionOptions(
          activeWorkspace,
          payload,
          undefined,
          request.reference_images || [],
        ))
      } catch (error) {
        const code = error && typeof error === 'object' ? (error as any).code : undefined
        if (typeof code === 'string' && (code.startsWith('SKILL_') || code.startsWith('MULTI_REFERENCE_'))) {
          return skillErrorResponse(res, error)
        }
        return res.status(400).json(errorBody(error))
      }

      if (!multiReferenceComfyTarget) {
        try {
          preferredModelId = await resolvePreferredModelId(activeWorkspace, payload)
          const preflightSelection = await preflightTransport(activeWorkspace, request, preferredModelId, {
            assumeNegativePrompt: Boolean(selectedSkill && compile),
          })
          const selectedModelId = Number((preflightSelection as any)?.model?.id)
          if (Number.isSafeInteger(selectedModelId) && selectedModelId > 0) preferredModelId = selectedModelId
          runtimeTargetPreflighted = true
        } catch (error) {
          const code = error && typeof error === 'object' ? String((error as any).code || '') : ''
          if (code.startsWith('MULTI_REFERENCE_')) return skillErrorResponse(res, error)
          return res.status(500).json(errorBody(error))
        }
      }
    }

    try {
      if (selectedSkill) {
        compiledSkill = await compileCanvasSkillIfSelected(payload, activeWorkspace, request, incomingAssets, compile)
        if (compiledSkill) request = compiledSkill.request
      }
    } catch (error) {
      await logSkillCompileFailure(() => activeWorkspace, 'skill compile failed', skillErrorCode(error), error instanceof Error ? error.message : String(error), {
        skill_name: selectedSkill?.skillName,
        pack_id: selectedSkill?.packId,
        mode: payload?.type,
      })
      return skillErrorResponse(res, error)
    }

    if (!hasMultipleReferences || multiReferenceComfyTarget) {
      try {
        // Rebuild from the original payload so the preflight clone is never
        // reused after compiled prompt injection.
        comfyOptions = await resolveComfyExecutionOptions(
          activeWorkspace,
          payload,
          compiledSkill?.result,
          request.reference_images || [],
        )
      } catch (error) {
        const code = error && typeof error === 'object' ? (error as any).code : undefined
        if (typeof code === 'string' && (code.startsWith('SKILL_') || code.startsWith('MULTI_REFERENCE_'))) {
          return skillErrorResponse(res, error)
        }
        return res.status(400).json(errorBody(error))
      }
    }

    if (comfyOptions) {
      const skillSourceAssetIds = request ? normalizeSourceAssetIds((request as any).source_asset_ids) : []
      if (!clientId) {
        try {
          const response = await comfyExecute(comfyOptions)
          return res.json(comfyResponsePayload(response, skillSourceAssetIds, compiledSkill?.audit))
        } catch (error) {
          return res.status(500).json(errorBody(error))
        }
      }

      const abortController = new AbortController()
      const cancelToken: CancelToken = {
        cancelled: false,
        interrupt: async () => {
          cancelToken.cancelled = true
          abortController.abort()
          return comfyInterrupt(comfyOptions)
        },
      }
      addTask(clientId, 'local-comfy', cancelToken)
      await sendMessage(clientId, { type: 'status', message: 'ComfyUI 工作流已提交', phase: 'comfyui' })
      void (async () => {
        try {
          const response = await comfyExecute({
            ...comfyOptions,
            abortSignal: abortController.signal,
            isCancelled: () => cancelToken.cancelled,
            onStatus: async status => {
              if (!cancelToken.cancelled) await sendMessage(clientId, { type: 'status', ...status })
            },
          })
          if (cancelToken.cancelled) return
          await sendMessage(clientId, { type: 'result', data: comfyResponsePayload(response, skillSourceAssetIds, compiledSkill?.audit) })
          await sendMessage(clientId, { type: 'done' })
        } catch (error) {
          if (!cancelToken.cancelled) await sendMessage(clientId, { type: 'error', message: String(error) })
        } finally {
          removeTask(clientId)
        }
      })()

      return res.json({ success: true, client_id: clientId, message: 'ComfyUI 任务已交由后台引擎处理' })
    }

    if (!request) request = buildCanvasGenerateLLMRequest(payload)
    if (compiledSkill) {
      try {
        if (!runtimeTargetPreflighted) preferredModelId = await resolvePreferredModelId(activeWorkspace, payload)
        const preflightSelection = await preflightTransport(activeWorkspace, request, preferredModelId)
        const selectedModelId = Number((preflightSelection as any)?.model?.id)
        if (Number.isSafeInteger(selectedModelId) && selectedModelId > 0) preferredModelId = selectedModelId
        runtimeTargetPreflighted = true
      } catch (error) {
        const code = error && typeof error === 'object' ? String((error as any).code || '') : ''
        if (code.startsWith('MULTI_REFERENCE_')) return skillErrorResponse(res, error)
        return res.status(500).json(errorBody(error))
      }
    }
    const sourceAssetIds = normalizeSourceAssetIds((request as any).source_asset_ids)
    if (!runtimeTargetPreflighted) preferredModelId = await resolvePreferredModelId(activeWorkspace, payload)

    if (!clientId) {
      try {
        const response = await execute(activeWorkspace, request, preferredModelId)
        if (response.error) return res.status(500).json(errorBody(response.error, { runtimeSelection: response.runtimeSelection }))
        return res.json(responsePayload(response, sourceAssetIds, compiledSkill?.audit))
      } catch (error) {
        const code = error && typeof error === 'object' ? String((error as any).code || '') : ''
        if (code.startsWith('MULTI_REFERENCE_')) return skillErrorResponse(res, error)
        return res.status(500).json(errorBody(error))
      }
    }

    const abortController = new AbortController()
    const cancelToken: CancelToken = {
      cancelled: false,
      interrupt: () => {
        cancelToken.cancelled = true
        abortController.abort()
        return true
      },
    }
    addTask(clientId, 'canvas-generate', cancelToken)
    await sendMessage(clientId, { type: 'status', message: '生成任务已开始', phase: 'generate' })

    void (async () => {
      try {
        const response = await execute(activeWorkspace, request, preferredModelId, { signal: abortController.signal })
        if (cancelToken.cancelled) return
        if (response.error) {
          await sendMessage(clientId, { type: 'error', message: response.error, runtimeSelection: response.runtimeSelection })
          return
        }
        await sendMessage(clientId, { type: 'result', data: responsePayload(response, sourceAssetIds, compiledSkill?.audit) })
        await sendMessage(clientId, { type: 'done' })
      } catch (error) {
        if (!cancelToken.cancelled) await sendMessage(clientId, { type: 'error', message: String(error) })
      } finally {
        removeTask(clientId)
      }
    })()

    return res.json({ success: true, client_id: clientId, message: '任务已交由后台引擎处理' })
  })
}

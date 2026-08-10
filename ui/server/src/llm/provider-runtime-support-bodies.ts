/** Provider request body builders, local asset rewrite, and response parse helpers. */
import { readFile } from 'fs/promises'
import { isAbsolute, relative, resolve } from 'path'
import { guessAssetMimeType } from '../asset-mime'
import type { ModelRecord } from '../model-store'
import {
  imageUrlFromLLMContentPart,
  stringifyLLMMessageContent,
  stringifyLLMMessageTextContent,
  textFromLLMContentPart,
  type LLMMessageContentPart,
  type LLMRequest,
  type LLMResponse,
} from './types'
import { normalizeLLMResponse } from './adapter'
import { buildCodexResponsesBody } from './codex-responses'
import {
  anthropicModelNameForRequest,
  applyClaudeCodeBodyMetadata,
} from './anthropic-context'
import {
  shouldStreamWithModelOverride,
} from './model-runtime-overrides'
import type { RuntimeModelSelection } from './provider-runtime-support-types'
import { routeDslValue } from './provider-runtime-support-route-dsl'
import {
  isMultiReferenceImageBearingRole,
  MultiReferenceTransportError,
  resolveMultiReferenceTransport,
  type MultiReferenceTransport,
} from './multi-reference-transport'

// ── Request Body ────────────────────────────────────────────

function shouldStreamRequest(request: LLMRequest, selection: RuntimeModelSelection) {
  return shouldStreamWithModelOverride(request, selection.provider, selection.model)
}

export function isMediaRouteType(routeType?: string) {
  return ['image', 'video', 'text_to_image', 'image_to_image', 'text_to_video', 'image_to_video'].includes(String(routeType || ''))
}

// 与前端 AspectRatioSelector 预设一致：预设尺寸直接映射到用户选择的比例
// （1344*768 等预设是约 1MP 的近似值，按像素 gcd 反推会得到 7:4 这类错误比例）
const PRESET_SIZE_RATIOS: Record<string, string> = {
  '1024*1024': '1:1', '768*1344': '9:16', '1344*768': '16:9',
  '864*1152': '3:4', '1152*864': '4:3', '1216*832': '3:2',
  '832*1216': '2:3', '896*1120': '4:5', '1120*896': '5:4',
  '1536*640': '21:9',
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/** chat 通道没有 size 字段可用：把 '1344*768' 折算成比例提示语拼进 prompt。 */
export function mediaSizePromptHint(size: unknown): string {
  if (typeof size !== 'string' || !size.trim()) return ''
  const normalized = size.trim().replace(/[xX×]/g, '*')
  let ratio = PRESET_SIZE_RATIOS[normalized]
  if (!ratio) {
    const [w, h] = normalized.split('*').map(part => Number.parseInt(part, 10))
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return ''
    const divisor = gcd(w, h)
    ratio = `${w / divisor}:${h / divisor}`
  }
  return `\n\n[图像要求] 宽高比 ${ratio}，目标尺寸 ${normalized.replace('*', 'x')}。`
}

export function requestRouteType(request: LLMRequest, model: ModelRecord) {
  const explicit = String((request as any).type || (request as any).mode || (request as any).task_type || '').trim()
  if (explicit) return explicit
  const capabilities = model.capabilities || {}
  const activeModalities = Object.entries(capabilities)
    .filter(([key, enabled]) => enabled === true && key !== 'chat')
    .map(([key]) => key)
  return activeModalities.length === 1 ? activeModalities[0] : ''
}

function toOpenAIBody(
  request: LLMRequest,
  selection: RuntimeModelSelection,
  multiReferenceTransport: MultiReferenceTransport,
): Record<string, any> {
  const routeType = requestRouteType(request, selection.model)
  const passthroughBlocked = new Set([
    'model',
    'messages',
    'prompt',
    'type',
    'mode',
    'task_type',
    'image_url',
    'response_format',
    'tools',
    'tool_choice',
    'metadata',
    'stream',
    'response_mode',
    'routing_strategy',
    'routingStrategy',
    'incoming_assets',
    'source_asset_ids',
    'reference_images',
    'referenceImages',
    // Negative prompts are a media-only transport field. Do not leak this
    // internal canvas field into chat/text requests.
    'negative_prompt',
  ])
  if (isMediaRouteType(routeType)) {
    // Chat-style image generation (Gemini-family on openai-compatible proxies):
    // the endpoint is chat/completions, so send messages and let the proxy
    // return the image inside the message content.
    if (String(selection.endpoint || '').includes('chat/completions')) {
      const prompt = ((request as any).prompt || textPromptFromMessages(request.messages)) + mediaSizePromptHint((request as any).size)
      const referenceParts = (request.reference_images || []).map(reference => ({
        type: 'image_url',
        image_url: { url: reference.url },
      }))
      const imageUrl = String((request as any).image_url || '').trim()
      const imageParts = referenceParts.length
        ? referenceParts
        : imageUrl
          ? [{ type: 'image_url', image_url: { url: imageUrl } }]
          : []
      const userContent = imageParts.length
        ? [{ type: 'text', text: prompt }, ...imageParts]
        : prompt
      return {
        model: selection.model.model_name || request.model,
        messages: [{ role: 'user', content: userContent }],
        max_tokens: request.max_tokens ?? 4096,
        ...(typeof request.negative_prompt === 'string' && request.negative_prompt.trim()
          ? { negative_prompt: request.negative_prompt }
          : {}),
      }
    }
    const body: Record<string, any> = {
      model: selection.model.model_name || request.model,
      prompt: (request as any).prompt || textPromptFromMessages(request.messages),
    }
    if ((request as any).image_url) body.image_url = (request as any).image_url
    for (const [key, value] of Object.entries(request as any)) {
      if (value === undefined || value === null) continue
      if (passthroughBlocked.has(key)) continue
      body[key] = value
    }
    applyExplicitMultiReferenceField(body, request, multiReferenceTransport)
    // openai 风格媒体端点用 x 分隔尺寸；星号是 DashScope 风格（那条链路走 DSL 模板并自行归一化）
    if (typeof body.size === 'string') body.size = body.size.replace(/\*/g, 'x')
    if (typeof request.negative_prompt === 'string' && request.negative_prompt.trim()) {
      body.negative_prompt = request.negative_prompt
    }
    return body
  }
  const shouldStream = shouldStreamRequest(request, selection)
  const body: Record<string, any> = {
    model: selection.model.model_name || request.model,
    messages: request.messages,
    temperature: request.temperature ?? 0.3,
    max_tokens: request.max_tokens ?? 4096,
  }
  if (shouldStream) body.stream = true
  if (request.response_format && request.response_format !== 'text') {
    body.response_format = request.response_format
  }
  if (request.tools?.length) body.tools = request.tools
  if (request.tool_choice && request.tool_choice !== 'none') body.tool_choice = request.tool_choice
  for (const [key, value] of Object.entries(request as any)) {
    if (value === undefined || value === null) continue
    if (passthroughBlocked.has(key)) continue
    body[key] = value
  }
  // Gemini Flash-class proxies often burn max_tokens on reasoning and return empty prose.
  // Prefer model-level context_ui_params (reasoning_effort/thinking) when present.
  applyGeminiFlashReasoningPolicy(body, request, selection)
  return body
}

function applyGeminiFlashReasoningPolicy(
  body: Record<string, any>,
  request: LLMRequest,
  selection: RuntimeModelSelection,
) {
  const modelName = String(selection.model.model_name || request.model || body.model || '').toLowerCase()
  const providerId = String(selection.provider?.id || selection.provider?.name || '').toLowerCase()
  const isGeminiFamily = providerId.includes('gemini') || modelName.includes('gemini')
  if (!isGeminiFamily) return
  const params = (selection.model.context_ui_params || {}) as Record<string, any>
  const effort =
    (request as any).reasoning_effort
    ?? params.reasoning_effort
    ?? params.model_reasoning_effort
  if (effort != null && body.reasoning_effort == null) body.reasoning_effort = effort
  const thinking = (request as any).thinking ?? params.thinking
  if (thinking != null && body.thinking == null) body.thinking = thinking
  // Keep enough room for output after reasoning leakage on flash-tier proxies,
  // but respect an explicit caller budget (small probes / cheap tasks stay small).
  if (request.max_tokens != null) return
  const minBudget = Number(params.default_max_tokens || 0) || 8192
  const current = Number(body.max_tokens || 0)
  if (!Number.isFinite(current) || current < minBudget) body.max_tokens = minBudget
}

function toCodexResponsesBody(request: LLMRequest, selection: RuntimeModelSelection): Record<string, any> {
  return buildCodexResponsesBody(request, selection.model.model_name || request.model, shouldStreamRequest(request, selection), {
    baseUrl: selection.baseUrl,
    reasoning: selection.model.context_ui_params?.reasoning,
    reasoningEffort: selection.model.context_ui_params?.reasoning_effort ?? selection.model.context_ui_params?.model_reasoning_effort,
  })
}

function anthropicImageBlock(imageUrl: string) {
  const value = String(imageUrl || '').trim()
  const dataMatch = value.match(/^data:([^;,]+);base64,(.*)$/i)
  if (dataMatch) {
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: dataMatch[1],
        data: dataMatch[2],
      },
    }
  }
  return { type: 'image', source: { type: 'url', url: value } }
}

function anthropicMessageContent(content: LLMRequest['messages'][number]['content']) {
  if (!Array.isArray(content)) return content
  return content.map(part => {
    const imageUrl = imageUrlFromLLMContentPart(part)
    if (imageUrl) return anthropicImageBlock(imageUrl)
    if (!part || typeof part !== 'object') return part
    const type = String((part as any).type || '')
    if (['text', 'input_text', 'output_text'].includes(type)) {
      return { type: 'text', text: textFromLLMContentPart(part) }
    }
    return { ...part }
  })
}

function toAnthropicBody(request: LLMRequest, selection: RuntimeModelSelection): Record<string, any> {
  const system = request.messages
    .filter(message => message.role === 'system')
    .map(message => stringifyLLMMessageTextContent(message.content))
    .filter(value => value.trim())
    .join('\n')
  const messages = request.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: anthropicMessageContent(m.content),
    }))
  const body: Record<string, any> = {
    model: anthropicModelNameForRequest(selection.model.model_name || request.model, selection.model, {
      provider: selection.provider,
      baseUrl: selection.baseUrl,
    }),
    messages,
    temperature: request.temperature ?? 0.3,
    max_tokens: request.max_tokens ?? 4096,
  }
  if (system) body.system = system
  if (request.tools?.length) {
    body.tools = request.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema,
    }))
  }
  if (shouldStreamRequest(request, selection)) body.stream = true
  if (isClaudeCodeFormat(selection.apiFormat)) {
    applyClaudeCodeBodyMetadata(body, selection.model, {
      provider: selection.provider,
      baseUrl: selection.baseUrl,
    })
  }
  return body
}

function toGeminiGenerateContentBody(request: LLMRequest): Record<string, any> {
  const systemText = (request.messages || [])
    .filter(message => message.role === 'system')
    .map(message => stringifyLLMMessageContent(message.content))
    .filter(Boolean)
    .join('\n')
  const contents = (request.messages || [])
    .filter(message => message.role !== 'system')
    .map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: geminiPartsFromMessageContent(message.content),
    }))
  const body: Record<string, any> = {
    contents: contents.length ? contents : [{ role: 'user', parts: [{ text: promptFromMessages(request.messages) }] }],
    generationConfig: {
      temperature: request.temperature ?? 0.3,
      maxOutputTokens: request.max_tokens ?? 4096,
    },
  }
  if (systemText) body.systemInstruction = { parts: [{ text: systemText }] }
  return body
}

function promptFromMessages(messages: LLMRequest['messages']) {
  const lastUser = [...(messages || [])].reverse().find(message => message.role === 'user')
  return lastUser
    ? stringifyLLMMessageContent(lastUser.content)
    : (messages || []).map(message => stringifyLLMMessageContent(message.content)).filter(Boolean).join('\n')
}

function textPromptFromMessages(messages: LLMRequest['messages']) {
  const lastUser = [...(messages || [])].reverse().find(message => message.role === 'user')
  return lastUser
    ? stringifyLLMMessageTextContent(lastUser.content)
    : (messages || []).map(message => stringifyLLMMessageTextContent(message.content)).filter(Boolean).join('\n')
}

function mimeTypeFromImageUrl(url: string) {
  const dataMatch = String(url || '').match(/^data:([^;,]+);base64,/i)
  if (dataMatch) return dataMatch[1]
  if (/\.jpe?g(\?|$)/i.test(url)) return 'image/jpeg'
  if (/\.webp(\?|$)/i.test(url)) return 'image/webp'
  if (/\.gif(\?|$)/i.test(url)) return 'image/gif'
  return 'image/png'
}

function geminiPartFromImageUrl(url: string) {
  const value = String(url || '').trim()
  const dataMatch = value.match(/^data:([^;,]+);base64,(.*)$/i)
  if (dataMatch) return { inlineData: { mimeType: dataMatch[1], data: dataMatch[2] } }
  return { fileData: { mimeType: mimeTypeFromImageUrl(value), fileUri: value } }
}

function geminiPartsFromMessageContent(content: LLMRequest['messages'][number]['content']) {
  if (!Array.isArray(content)) return [{ text: stringifyLLMMessageContent(content) }]
  const parts = content.flatMap(part => {
    const text = textFromLLMContentPart(part).trim()
    if (text) return [{ text }]
    const imageUrl = imageUrlFromLLMContentPart(part)
    if (imageUrl) return [geminiPartFromImageUrl(imageUrl)]
    return []
  })
  return parts.length ? parts : [{ text: stringifyLLMMessageContent(content) }]
}

function isInsidePath(root: string, candidate: string) {
  const relativePath = relative(resolve(root), resolve(candidate))
  return relativePath === '' || (!!relativePath && !relativePath.startsWith('..') && !isAbsolute(relativePath))
}

function extractLocalImagePathCandidates(activeWorkspace: string, imageUrl: string) {
  const rawUrl = String(imageUrl || '').trim()
  if (!rawUrl || /^data:/i.test(rawUrl)) return []
  let localValue = rawUrl
  if (/^https?:\/\//i.test(rawUrl)) {
    try {
      const parsed = new URL(rawUrl)
      const host = parsed.hostname.toLowerCase()
      if (!['localhost', '127.0.0.1', '::1'].includes(host)) return []
      localValue = decodeURIComponent(parsed.pathname)
    } catch {
      return []
    }
  }
  const mediaPrefix = '/api/assets/media/'
  const mediaIndex = localValue.indexOf(mediaPrefix)
  if (mediaIndex >= 0) {
    localValue = decodeURIComponent(localValue.slice(mediaIndex + mediaPrefix.length))
  }
  let legacyTempValue = ''
  const filesPrefix = '/api/files/'
  const filesIndex = localValue.indexOf(filesPrefix)
  if (filesIndex >= 0) {
    legacyTempValue = decodeURIComponent(localValue.slice(filesIndex + filesPrefix.length))
    localValue = legacyTempValue
  }
  const trimmedLocal = localValue.replace(/^\/+/, '')
  const candidates = [
    localValue,
    resolve(activeWorkspace, localValue),
    resolve(activeWorkspace, trimmedLocal),
    resolve(activeWorkspace, 'assets', trimmedLocal),
    legacyTempValue ? resolve(activeWorkspace, 'data', 'temp', legacyTempValue.replace(/^\/+/, '')) : '',
    resolve('/', trimmedLocal),
  ]
    .filter(Boolean)
    .map(candidate => resolve(candidate))
  return Array.from(new Set(candidates)).filter(candidate => isInsidePath(activeWorkspace, candidate))
}

async function localImageUrlToDataUri(activeWorkspace: string, imageUrl: string) {
  for (const candidate of extractLocalImagePathCandidates(activeWorkspace, imageUrl)) {
    try {
      const mime = guessAssetMimeType(candidate)
      if (!mime.startsWith('image/')) continue
      const bytes = await readFile(candidate)
      return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`
    } catch {}
  }
  return imageUrl
}

export async function requestWithLocalAssetDataUris(activeWorkspace: string, request: LLMRequest): Promise<LLMRequest> {
  const imageUrl = String((request as any).image_url || '').trim()
  let changed = false
  const nextRequest: any = { ...(request as any) }
  if (imageUrl) {
    const converted = await localImageUrlToDataUri(activeWorkspace, imageUrl)
    if (converted !== imageUrl) {
      nextRequest.image_url = converted
      changed = true
    }
  }
  if (Array.isArray(request.reference_images) && request.reference_images.length) {
    let referencesChanged = false
    const nextReferences = await Promise.all(request.reference_images.map(async reference => {
      const referenceUrl = String(reference.url || '').trim()
      if (!referenceUrl) return reference
      const converted = await localImageUrlToDataUri(activeWorkspace, referenceUrl)
      if (converted === referenceUrl) return reference
      referencesChanged = true
      return { ...reference, url: converted }
    }))
    if (referencesChanged) {
      nextRequest.reference_images = nextReferences
      changed = true
    }
  }
  const nextMessages = await Promise.all((request.messages || []).map(async message => {
    if (!Array.isArray(message.content)) return message
    const nextContent = await Promise.all(message.content.map(async part => {
      const imagePartUrl = imageUrlFromLLMContentPart(part)
      if (!imagePartUrl) return part
      const converted = await localImageUrlToDataUri(activeWorkspace, imagePartUrl)
      if (converted === imagePartUrl) return part
      changed = true
      const record = part as LLMMessageContentPart
      if (record && typeof record === 'object' && record.image_url && typeof record.image_url === 'object') {
        return { ...record, image_url: { ...record.image_url, url: converted } }
      }
      return { ...record, image_url: { url: converted } }
    }))
    return { ...message, content: nextContent }
  }))
  if (changed) nextRequest.messages = nextMessages
  return changed ? nextRequest : request
}

function renderTemplateValue(template: any, context: Record<string, any>): any {
  if (Array.isArray(template)) {
    return template
      .map(item => renderTemplateValue(item, context))
      .filter(item => item !== undefined && item !== null)
  }
  if (template && typeof template === 'object') {
    const rendered: Record<string, any> = {}
    for (const [key, value] of Object.entries(template)) {
      const nextValue = renderTemplateValue(value, context)
      if (nextValue !== undefined && nextValue !== null) rendered[key] = nextValue
    }
    return Object.keys(rendered).length ? rendered : undefined
  }
  if (typeof template === 'string') {
    const match = template.trim().match(/^\{\{\s*([^}]+?)\s*\}\}$/)
    if (!match) return template
    const key = match[1].trim()
    const value = context[key]
    if (key === 'size' && typeof value === 'string' && value && !value.includes('*')) return value.replace(/x/g, '*')
    return value
  }
  return template
}

function buildTemplateContext(request: LLMRequest, selection: RuntimeModelSelection) {
  const referenceImages = request.reference_images ?? (request as any).referenceImages
  const context: Record<string, any> = {
    ...(request as any),
    model: selection.model.model_name || request.model,
    messages: request.messages,
    prompt: (request as any).prompt || promptFromMessages(request.messages),
    size: (request as any).size ?? '1024*1024',
    temperature: request.temperature,
    max_tokens: request.max_tokens,
    reference_images: referenceImages,
    referenceImages,
  }
  // Endpoint templates are provider-authored but request fields are not. Keep
  // the compiler's negative prompt media-only even when a text template uses a
  // generic `{{negative_prompt}}` context lookup.
  if (!isMediaRouteType(requestRouteType(request, selection.model))) delete context.negative_prompt
  return context
}

function applyExplicitMultiReferenceField(
  body: Record<string, any>,
  request: LLMRequest,
  transport: MultiReferenceTransport,
) {
  if (
    !['model_capability', 'provider_capability'].includes(transport.source)
    || !transport.field
    || (request.reference_images?.length || 0) <= 1
  ) return
  const field = transport.field
  if (['__proto__', 'prototype', 'constructor'].includes(field)) {
    throw new MultiReferenceTransportError(
      'MULTI_REFERENCE_UNSUPPORTED',
      'Multi-reference provider field is unsafe',
    )
  }
  body[field] = transport.shape === 'urls'
    ? request.reference_images!.map(reference => reference.url)
    : request.reference_images!.map(reference => ({
      ...reference,
      ...(reference.source_asset_ids ? { source_asset_ids: [...reference.source_asset_ids] } : {}),
    }))
}

function requestWithCanonicalReferenceMessageParts(
  request: LLMRequest,
  selection: RuntimeModelSelection,
): LLMRequest {
  const references = request.reference_images || []
  if (
    references.length <= 1
    || !isMultiReferenceImageBearingRole('user', selection)
  ) return request

  const messages = (request.messages || []).map(message => ({
    ...message,
    content: Array.isArray(message.content)
      ? message.content
        .filter(part => (
          !isMultiReferenceImageBearingRole(message.role, selection)
          || !imageUrlFromLLMContentPart(part)
        ))
        .map(part => part && typeof part === 'object' ? { ...part } : part)
      : message.content,
  }))
  let userIndex = messages.findLastIndex(message => message.role === 'user')
  if (userIndex < 0) {
    messages.push({ role: 'user', content: '' })
    userIndex = messages.length - 1
  }
  const userMessage = messages[userIndex]
  const referenceParts = references.map(reference => ({
    type: 'image_url' as const,
    image_url: { url: reference.url },
  }))
  if (Array.isArray(userMessage.content)) {
    const nonImageParts = userMessage.content.filter(part => !imageUrlFromLLMContentPart(part))
    userMessage.content = [...nonImageParts, ...referenceParts]
  } else {
    const text = stringifyLLMMessageTextContent(userMessage.content).trim()
    userMessage.content = [
      ...(text ? [{ type: 'text' as const, text }] : []),
      ...referenceParts,
    ]
  }
  return { ...request, messages }
}

function getValueByPath(data: any, path: string) {
  const parts = String(path || '').split('.').filter(Boolean)
  let current = data
  for (const part of parts) {
    if (Array.isArray(current) && /^\d+$/.test(part)) current = current[Number(part)]
    else if (current && typeof current === 'object' && part in current) current = current[part]
    else return undefined
  }
  return current
}

function isEnvelopeObject(value: any): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function providerEnvelopeCandidates(raw: any) {
  const candidates: any[] = []
  const seen = new Set<any>()
  const visit = (value: any, depth = 0) => {
    if (!isEnvelopeObject(value) || seen.has(value) || depth > 8) return
    seen.add(value)
    candidates.push(value)
    for (const key of ['data', 'result', 'output']) {
      visit(value[key], depth + 1)
    }
  }
  visit(raw)
  return candidates.length ? candidates : [raw]
}

export function getValueByPathFromEnvelopes(raw: any, path: string) {
  for (const candidate of providerEnvelopeCandidates(raw)) {
    const value = getValueByPath(candidate, path)
    if (value !== undefined) return value
  }
  return undefined
}

// ── Response Parsing ────────────────────────────────────────

export function parseAnthropicResponse<T = any>(raw: any): LLMResponse<T> {
  const text = Array.isArray(raw?.content)
    ? raw.content.map((item: any) => item?.text || '').join('\n')
    : String(raw?.content || '')
  return normalizeLLMResponse<T>({ ...raw, content: text })
}

export function isCodexResponsesFormat(apiFormat: string) {
  const normalized = String(apiFormat || '').toLowerCase()
  return normalized.includes('codex') || normalized.includes('responses')
}

export function isClaudeCodeFormat(apiFormat: string) {
  const normalized = String(apiFormat || '').toLowerCase()
  return normalized === 'claude_code' || normalized.includes('anthropic')
}

export function isGeminiNativeFormat(apiFormat: string) {
  return String(apiFormat || '').toLowerCase() === 'gemini_native'
}

export function parseResponsesResponse<T = any>(raw: any): LLMResponse<T> {
  const output = Array.isArray(raw?.output) ? raw.output : Array.isArray(raw?.response?.output) ? raw.response.output : []
  const textFromOutput = output
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .map((part: any) => String(part?.text || part?.content || ''))
    .filter(Boolean)
    .join('\n')
  return normalizeLLMResponse<T>({
    ...raw,
    content: String(raw?.output_text || raw?.response?.output_text || textFromOutput || raw?.content || ''),
    usage: raw?.usage || raw?.response?.usage,
    finish_reason: raw?.status || raw?.response?.status || raw?.finish_reason,
  })
}

export function parseGeminiGenerateContentResponse<T = any>(raw: any): LLMResponse<T> {
  const candidate = Array.isArray(raw?.candidates) ? raw.candidates[0] : null
  const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : []
  const content = parts.map((part: any) => String(part?.text || '')).filter(Boolean).join('\n')
  const usage = raw?.usageMetadata
    ? {
        input_tokens: raw.usageMetadata.promptTokenCount,
        output_tokens: raw.usageMetadata.candidatesTokenCount,
        total_tokens: raw.usageMetadata.totalTokenCount,
      }
    : undefined
  return normalizeLLMResponse<T>({
    ...raw,
    content,
    usage,
    finish_reason: candidate?.finishReason || raw?.finishReason,
  })
}

export function buildProviderRequestBody(request: LLMRequest, selection: RuntimeModelSelection): Record<string, any> {
  const multiReferenceTransport = resolveMultiReferenceTransport(request, selection)
  const payloadTemplate = routeDslValue(selection.routeConfig, 'payload_template', 'payloadTemplate')
  if (payloadTemplate) {
    const templateContext = buildTemplateContext(request, selection)
    if (
      ['model_capability', 'provider_capability'].includes(multiReferenceTransport.source)
      && multiReferenceTransport.field
    ) {
      // An explicit capability field owns canonical reference transport. Do not
      // also render route-template aliases into a second provider field.
      delete templateContext.reference_images
      delete templateContext.referenceImages
    }
    const rendered = renderTemplateValue(payloadTemplate, templateContext) ?? {}
    if (
      (request.reference_images?.length || 0) > 1
      && (!rendered || typeof rendered !== 'object' || Array.isArray(rendered))
    ) {
      throw new MultiReferenceTransportError(
        'MULTI_REFERENCE_UNSUPPORTED',
        'Multi-reference payload templates must render an object body',
      )
    }
    applyExplicitMultiReferenceField(rendered, request, multiReferenceTransport)
    return rendered
  }
  const nativeRequest = ['model_capability', 'provider_capability'].includes(multiReferenceTransport.source)
    ? requestWithCanonicalReferenceMessageParts(request, selection)
    : request
  if (isClaudeCodeFormat(selection.apiFormat)) return toAnthropicBody(nativeRequest, selection)
  if (isGeminiNativeFormat(selection.apiFormat)) return toGeminiGenerateContentBody(nativeRequest)
  if (isCodexResponsesFormat(selection.apiFormat)) return toCodexResponsesBody(request, selection)
  return toOpenAIBody(request, selection, multiReferenceTransport)
}

export function runtimeRequestCanceledError() {
  return Object.assign(new Error('Request canceled'), { code: 'REQUEST_CANCELED' })
}

export function summarizeProviderRequestBodyForLog(body: Record<string, any>) {
  const input = Array.isArray(body.input) ? body.input : []
  const firstInput = input[0] || {}
  const firstContent = Array.isArray(firstInput.content) ? firstInput.content : []
  return {
    keys: Object.keys(body).sort(),
    input_count: input.length,
    first_input_role: firstInput.role || '',
    first_input_content_types: firstContent.map((part: any) => String(part?.type || '')).filter(Boolean),
    tool_count: Array.isArray(body.tools) ? body.tools.length : 0,
    include: Array.isArray(body.include) ? body.include.map((item: any) => String(item)) : [],
    has_text: Object.prototype.hasOwnProperty.call(body, 'text'),
    has_temperature: Object.prototype.hasOwnProperty.call(body, 'temperature'),
    has_max_output_tokens: Object.prototype.hasOwnProperty.call(body, 'max_output_tokens'),
  }
}

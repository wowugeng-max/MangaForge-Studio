import { readFile } from 'fs/promises'
import { isAbsolute, relative, resolve } from 'path'
import { guessAssetMimeType } from '../asset-mime'
import { readKeys, writeKeys, type APIKeyRecord } from '../key-store'
import { readModels, type ModelRecord } from '../model-store'
import { readProviders, type ProviderRecord } from '../provider-store'
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
import { createOpenAIResponseViaSdk } from './openai-responses-sdk'
import {
  applyClaudeCodeAuthHeaders,
  anthropicModelNameForRequest,
  anyRouterOfficialMessagesEndpoint,
  applyClaudeCodeBodyMetadata,
  applyClaudeCodeHeaders,
} from './anthropic-context'
import {
  mergeHeadersCaseInsensitive,
  modelCustomHeaders,
  shouldStreamWithModelOverride,
} from './model-runtime-overrides'

// ════════════════════════════════════════════════════════════
// provider-runtime.ts — Reference: Claude Code API client
//
// Claude Code architecture (restored-src/src/services/api/client.ts):
//   1. getAnthropicClient() — creates SDK client per-request with:
//      - apiKey / authToken (Bearer auth)
//      - maxRetries (configurable, default 3)
//      - timeout (env API_TIMEOUT_MS, default 600s)
//      - custom headers (x-app, User-Agent, session-id)
//      - proxy/mTLS support (getProxyFetchOptions)
//   2. client.beta.messages.create() — sends request via SDK:
//      - SDK handles retries with exponential backoff
//      - SDK handles response parsing
//      - SDK handles error classification (429, 5xx retryable)
//
// Our design adapts these patterns for OpenAI-compatible providers:
//   - No SDK dependency — we use native fetch (supports any provider)
//   - Manual retry with exponential backoff (like Claude Code's withRetry.ts)
//   - Explicit timeout via AbortController
//   - Robust URL joining (no double /v1)
//   - Comprehensive error classification
// ════════════════════════════════════════════════════════════

export type RuntimeModelSelection = {
  provider: ProviderRecord
  key: APIKeyRecord
  model: ModelRecord
  baseUrl: string
  endpoint: string
  routeConfig?: any
  routeType?: string
  apiFormat: string
}

export type RuntimeRoutingStrategy = 'balanced' | 'cost' | 'speed' | 'random'

export type RuntimeModelSelectionOptions = {
  routingStrategy?: RuntimeRoutingStrategy | string
}

export type RuntimeExecutionOptions = {
  signal?: AbortSignal
  timeoutMs?: number
  maxRetries?: number
  routingStrategy?: RuntimeRoutingStrategy | string
}

type SafeRuntimeModelSelection = Omit<RuntimeModelSelection, 'key'> & {
  key: Omit<APIKeyRecord, 'key'> & {
    has_key: boolean
    key_preview: string
  }
}

export const GEMINI_NATIVE_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

function maskSecret(value?: string) {
  const text = String(value || '')
  if (!text) return ''
  if (text.length <= 8) return '***'
  return `${text.slice(0, 4)}***${text.slice(-4)}`
}

export function sanitizeRuntimeSelection(selection: RuntimeModelSelection): SafeRuntimeModelSelection {
  const { key, ...rest } = selection
  const { key: rawKey, ...safeKey } = key
  return {
    ...rest,
    key: {
      ...safeKey,
      has_key: Boolean(rawKey),
      key_preview: maskSecret(rawKey),
    },
  }
}

function numberOrDefault(value: unknown, fallback: number) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function keyHasUsableQuota(key: APIKeyRecord) {
  const quotaTotal = numberOrDefault(key.quota_total, 0)
  const hasRemaining = key.quota_remaining !== undefined && key.quota_remaining !== null
  if (!hasRemaining) return true
  const remaining = numberOrDefault(key.quota_remaining, 0)
  if (quotaTotal <= 0 && remaining <= 0) return true
  return remaining >= 1
}

function keyPriority(key: APIKeyRecord) {
  return numberOrDefault(key.priority, 0)
}

function sortBalancedKeys(keys: APIKeyRecord[]) {
  return [...keys].sort((a, b) => {
    const priorityDiff = keyPriority(a) - keyPriority(b)
    if (priorityDiff) return priorityDiff
    const failureDiff = numberOrDefault(a.failure_count, 0) - numberOrDefault(b.failure_count, 0)
    if (failureDiff) return failureDiff
    return numberOrDefault(a.avg_latency, 0) - numberOrDefault(b.avg_latency, 0)
  })
}

export function normalizeRoutingStrategy(strategy?: RuntimeRoutingStrategy | string): RuntimeRoutingStrategy {
  const value = String(strategy || 'balanced').toLowerCase()
  if (value === 'cost' || value === 'cost_first' || value === 'cost-first') return 'cost'
  if (value === 'speed' || value === 'speed_first' || value === 'speed-first') return 'speed'
  if (value === 'random') return 'random'
  return 'balanced'
}

export function sortRuntimeKeys(keys: APIKeyRecord[], strategy?: RuntimeRoutingStrategy | string) {
  const normalized = normalizeRoutingStrategy(strategy)
  if (normalized === 'cost') {
    return [...keys].sort((a, b) => {
      const priceDiff = numberOrDefault(a.price_per_call, Number.MAX_SAFE_INTEGER) - numberOrDefault(b.price_per_call, Number.MAX_SAFE_INTEGER)
      if (priceDiff) return priceDiff
      return keyPriority(a) - keyPriority(b)
    })
  }
  if (normalized === 'speed') {
    return [...keys].sort((a, b) => {
      const latencyDiff = numberOrDefault(a.avg_latency, Number.MAX_SAFE_INTEGER) - numberOrDefault(b.avg_latency, Number.MAX_SAFE_INTEGER)
      if (latencyDiff) return latencyDiff
      return keyPriority(a) - keyPriority(b)
    })
  }
  if (normalized === 'random') {
    const shuffled = [...keys]
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
    }
    return shuffled
  }
  return sortBalancedKeys(keys)
}

function routeKeyForModel(model: ModelRecord, activeKeys: APIKeyRecord[], routedKeys: APIKeyRecord[]) {
  const modelKeyId = Number(model.api_key_id || 0)
  if (modelKeyId) {
    const exactActiveKey = activeKeys.find(key => Number(key.id) === modelKeyId)
    if (exactActiveKey) return routedKeys.find(key => Number(key.id) === modelKeyId)
  }
  return routedKeys.find(key => key.provider === model.provider)
}

export function rankModelsByBalancedKey(models: ModelRecord[], activeKeys: APIKeyRecord[], routedKeys: APIKeyRecord[]) {
  const keyRank = new Map(routedKeys.map((key, index) => [Number(key.id), index]))
  return models
    .map((model, index) => ({ model, index, key: routeKeyForModel(model, activeKeys, routedKeys) }))
    .filter(item => item.key)
    .sort((a, b) => {
      const rankDiff = (keyRank.get(Number(a.key!.id)) ?? 9999) - (keyRank.get(Number(b.key!.id)) ?? 9999)
      if (rankDiff) return rankDiff
      return a.index - b.index
    })
    .map(item => item.model)
}

export async function recordRuntimeKeyMetrics(activeWorkspace: string, keyId: number, startedAt: number, success: boolean) {
  try {
    const keys = await readKeys(activeWorkspace)
    const index = keys.findIndex(key => Number(key.id) === Number(keyId))
    if (index < 0) return

    const key = { ...keys[index] }
    const latencyMs = Math.max(0, Date.now() - startedAt)
    key.last_used = new Date().toISOString()

    if (success) {
      key.success_count = numberOrDefault(key.success_count, 0) + 1
      const previousLatency = numberOrDefault(key.avg_latency, 0)
      key.avg_latency = previousLatency ? Math.round(previousLatency * 0.9 + latencyMs * 0.1) : latencyMs

      const quotaTotal = numberOrDefault(key.quota_total, 0)
      const quotaRemaining = numberOrDefault(key.quota_remaining, 0)
      if (quotaTotal > 0 || quotaRemaining > 0) {
        key.quota_used = numberOrDefault(key.quota_used, 0) + 1
        key.quota_remaining = Math.max(0, quotaRemaining - 1)
      }
    } else {
      key.failure_count = numberOrDefault(key.failure_count, 0) + 1
    }

    keys[index] = key
    await writeKeys(activeWorkspace, keys)
  } catch (error) {
    console.warn(`[provider-runtime] Failed to record key metrics: ${error}`)
  }
}

// ── URL Handling ────────────────────────────────────────────

/**
 * Normalize base URL: remove trailing slashes.
 * Claude Code: SDK handles this internally via baseURL param.
 */
export function normalizeBaseUrl(url?: string): string {
  return String(url || '').replace(/\/+$/, '')
}

/**
 * Build the full request URL. Key rules:
 * - If endpoint is a full URL, use it directly
 * - If baseUrl ends with /v\d+ (e.g. /v1), append endpoint only
 * - If baseUrl ends with a non-version path (e.g. /v1/complete), treat it as the full endpoint prefix
 * - Avoid double /v1 or /v1/v1 patterns
 *
 * Claude Code: SDK builds URL from baseURL + endpoint automatically.
 */
export function buildUrl(baseUrl: string, endpoint: string, apiFormat = ''): string {
  if (isClaudeCodeFormat(apiFormat)) {
    const anyRouterMessagesEndpoint = anyRouterOfficialMessagesEndpoint(baseUrl, endpoint)
    if (anyRouterMessagesEndpoint) return anyRouterMessagesEndpoint
  }
  if (/^https?:\/\//i.test(endpoint)) return endpoint
  const base = normalizeBaseUrl(baseUrl)
  const ep = String(endpoint || '').replace(/^\/+/, '')

  // Check if base already ends with a version segment like /v1
  if (/\/v\d+$/i.test(base)) return `${base}/${ep}`

  // Claude Code/OpenAI Responses SDK-style base URLs may be configured as a
  // bare origin. In that case the API version segment is still required.
  const pathParts = base.replace(/^(https?:\/\/[^/]+)/i, '').split('/').filter(Boolean)
  const isBareOrigin = pathParts.length === 0
  if (isBareOrigin && /^v\d+\//i.test(ep)) return `${base}/${ep}`
  if (isBareOrigin && isClaudeCodeFormat(apiFormat) && ep === 'messages') return `${base}/v1/${ep}`
  if (isBareOrigin && isCodexResponsesFormat(apiFormat) && ep === 'responses') return `${base}/v1/${ep}`

  // Check if base already ends with a full endpoint path (e.g. /v1/complete)
  // In this case, just append the sub-path
  return `${base}/${ep}`
}

export function isRouteObject(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function routeDslValue(routeConfig: unknown, snakeKey: string, camelKey: string = snakeKey) {
  if (!isRouteObject(routeConfig)) return undefined
  return routeConfig[snakeKey] ?? routeConfig[camelKey]
}

export function shouldUseOpenAIResponsesSdk(selection: RuntimeModelSelection) {
  if (!isCodexResponsesFormat(selection.apiFormat)) return false
  if (isRouteObject(selection.routeConfig)) return false
  if (isAnyRouterTopSelection(selection)) return false
  const authType = String(selection.provider.auth_type || 'bearer').toLowerCase()
  return authType === 'bearer' || authType === 'authorization' || authType === 'oauth'
}

function isAnyRouterTopSelection(selection: RuntimeModelSelection) {
  return /anyrouter\.top/i.test(`${selection.provider.id || ''} ${selection.provider.display_name || ''} ${selection.provider.default_base_url || ''} ${selection.baseUrl || ''} ${selection.endpoint || ''}`)
}

export function openAIResponsesSdkBaseUrl(selection: RuntimeModelSelection, requestUrl: string) {
  const responseSuffix = /\/responses\/?$/i
  if (responseSuffix.test(requestUrl)) return requestUrl.replace(responseSuffix, '')
  return selection.baseUrl
}

export function headersForOpenAIResponsesSdk(headers: Record<string, string>) {
  const sdkHeaders: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    const normalized = key.toLowerCase()
    if (normalized === 'authorization') continue
    if (normalized === 'content-type') continue
    if (normalized === 'x-api-key') continue
    sdkHeaders[key] = value
  }
  return sdkHeaders
}

// ── Headers ─────────────────────────────────────────────────

/**
 * Build request headers matching Claude Code's approach:
 * - Content-Type: application/json
 * - Authorization: Bearer <key> (or x-api-key for some providers)
 * - Custom headers from provider config
 * - anthropic-version for Anthropic format
 */
export function buildHeaders(selection: RuntimeModelSelection): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'MangaForge-Studio/1.0',
  }
  mergeHeadersCaseInsensitive(headers, selection.provider.custom_headers || {})

  const routeHeaders = routeDslValue(selection.routeConfig, 'headers', 'customHeaders')
  mergeHeadersCaseInsensitive(headers, routeHeaders)
  mergeHeadersCaseInsensitive(headers, modelCustomHeaders(selection.model))

  if (isClaudeCodeFormat(selection.apiFormat)) {
    applyClaudeCodeHeaders(headers, selection.model, {
      provider: selection.provider,
      baseUrl: selection.baseUrl,
    })
  }

  // Authentication — matches Claude Code's configureApiKeyHeaders
  if (selection.key.key) {
    const authType = String(selection.provider.auth_type || 'bearer').toLowerCase()
    if (isClaudeCodeFormat(selection.apiFormat)) {
      applyClaudeCodeAuthHeaders(headers, selection.key.key, authType, selection.model, {
        provider: selection.provider,
        baseUrl: selection.baseUrl,
      })
    } else if (isGeminiNativeFormat(selection.apiFormat)) {
      mergeHeadersCaseInsensitive(headers, { 'x-goog-api-key': selection.key.key })
    } else if (authType === 'x-api-key' || authType === 'api-key') {
      mergeHeadersCaseInsensitive(headers, { 'x-api-key': selection.key.key })
    } else {
      mergeHeadersCaseInsensitive(headers, { Authorization: `Bearer ${selection.key.key}` })
    }
  }

  return headers
}

// ── Request Body ────────────────────────────────────────────

function shouldStreamRequest(request: LLMRequest, selection: RuntimeModelSelection) {
  return shouldStreamWithModelOverride(request, selection.provider, selection.model)
}

export function isMediaRouteType(routeType?: string) {
  return ['image', 'video', 'text_to_image', 'image_to_image', 'text_to_video', 'image_to_video'].includes(String(routeType || ''))
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

function toOpenAIBody(request: LLMRequest, selection: RuntimeModelSelection): Record<string, any> {
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
  ])
  if (isMediaRouteType(routeType)) {
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
  return body
}

function toCodexResponsesBody(request: LLMRequest, selection: RuntimeModelSelection): Record<string, any> {
  return buildCodexResponsesBody(request, selection.model.model_name || request.model, shouldStreamRequest(request, selection), {
    baseUrl: selection.baseUrl,
    reasoning: selection.model.context_ui_params?.reasoning,
    reasoningEffort: selection.model.context_ui_params?.reasoning_effort ?? selection.model.context_ui_params?.model_reasoning_effort,
  })
}

function toAnthropicBody(request: LLMRequest, selection: RuntimeModelSelection): Record<string, any> {
  const system = request.messages.find(m => m.role === 'system')?.content
  const messages = request.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
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
  return {
    ...(request as any),
    model: selection.model.model_name || request.model,
    messages: request.messages,
    prompt: (request as any).prompt || promptFromMessages(request.messages),
    size: (request as any).size ?? '1024*1024',
    temperature: request.temperature,
    max_tokens: request.max_tokens,
  }
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
  const payloadTemplate = routeDslValue(selection.routeConfig, 'payload_template', 'payloadTemplate')
  if (payloadTemplate) {
    return renderTemplateValue(payloadTemplate, buildTemplateContext(request, selection)) ?? {}
  }
  if (isClaudeCodeFormat(selection.apiFormat)) return toAnthropicBody(request, selection)
  if (isGeminiNativeFormat(selection.apiFormat)) return toGeminiGenerateContentBody(request)
  if (isCodexResponsesFormat(selection.apiFormat)) return toCodexResponsesBody(request, selection)
  return toOpenAIBody(request, selection)
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

// ── Error Classification ────────────────────────────────────

/**
 * Classify errors for retry decisions.
 * Claude Code (withRetry.ts): retries on 429, 5xx, and network errors.
 * Does NOT retry on 4xx (client errors like 401, 400).
 */
export function isRetryable(status: number, error?: string): boolean {
  // Exceptions thrown by fetch before receiving an HTTP response are network-level
  // failures in this code path. Treat them as retryable unless the parent signal
  // already handled cancellation.
  if (status === 0) return true
  // 429 Too Many Requests — always retry with backoff
  if (status === 429) return true
  // 5xx server errors — retry
  if (status >= 500 && status < 600) return true
  // 524 Cloudflare origin timeout — retry
  if (status === 524) return true
  // Network errors (timeout, ECONNREFUSED, etc.)
  if (error === 'AbortError' || error?.includes('ECONN')) return true
  if (error?.includes('fetch failed') || error?.includes('socket')) return true
  return false
}

export function describeFetchError(error: any): string {
  const parts = [
    error?.name,
    error?.message,
    error?.code,
    error?.errno,
    error?.cause?.name,
    error?.cause?.message,
    error?.cause?.code,
    error?.cause?.errno,
  ]
    .map(item => String(item || '').trim())
    .filter(Boolean)
  return Array.from(new Set(parts)).join(' | ') || String(error || 'Unknown network error')
}

export function statusFromProviderError(error: any) {
  const status = Number(error?.status ?? error?.statusCode ?? error?.response?.status ?? 0)
  return Number.isFinite(status) ? status : 0
}

export function bodyTextFromProviderError(error: any) {
  const raw = error?.error ?? error?.response?.data ?? error?.body
  if (typeof raw === 'string') return raw
  if (raw !== undefined) {
    try {
      return JSON.stringify(raw)
    } catch {
      return String(raw)
    }
  }
  return String(error?.message || error)
}

export function describeProviderRequestContext(selection: RuntimeModelSelection, url: string): string {
  return `POST ${url} | provider=${selection.provider.id} | model=${selection.model.model_name} | format=${selection.apiFormat}`
}


// ── HTTP Request with Retry ─────────────────────────────────


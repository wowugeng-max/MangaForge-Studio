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

const GEMINI_NATIVE_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

function maskSecret(value?: string) {
  const text = String(value || '')
  if (!text) return ''
  if (text.length <= 8) return '***'
  return `${text.slice(0, 4)}***${text.slice(-4)}`
}

function sanitizeRuntimeSelection(selection: RuntimeModelSelection): SafeRuntimeModelSelection {
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

function keyHasUsableQuota(key: APIKeyRecord) {
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

function normalizeRoutingStrategy(strategy?: RuntimeRoutingStrategy | string): RuntimeRoutingStrategy {
  const value = String(strategy || 'balanced').toLowerCase()
  if (value === 'cost' || value === 'cost_first' || value === 'cost-first') return 'cost'
  if (value === 'speed' || value === 'speed_first' || value === 'speed-first') return 'speed'
  if (value === 'random') return 'random'
  return 'balanced'
}

function sortRuntimeKeys(keys: APIKeyRecord[], strategy?: RuntimeRoutingStrategy | string) {
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

function rankModelsByBalancedKey(models: ModelRecord[], activeKeys: APIKeyRecord[], routedKeys: APIKeyRecord[]) {
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

async function recordRuntimeKeyMetrics(activeWorkspace: string, keyId: number, startedAt: number, success: boolean) {
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
function normalizeBaseUrl(url?: string): string {
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
function buildUrl(baseUrl: string, endpoint: string, apiFormat = ''): string {
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

function isRouteObject(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function routeDslValue(routeConfig: unknown, snakeKey: string, camelKey: string = snakeKey) {
  if (!isRouteObject(routeConfig)) return undefined
  return routeConfig[snakeKey] ?? routeConfig[camelKey]
}

function shouldUseOpenAIResponsesSdk(selection: RuntimeModelSelection) {
  if (!isCodexResponsesFormat(selection.apiFormat)) return false
  if (isRouteObject(selection.routeConfig)) return false
  if (isAnyRouterTopSelection(selection)) return false
  const authType = String(selection.provider.auth_type || 'bearer').toLowerCase()
  return authType === 'bearer' || authType === 'authorization' || authType === 'oauth'
}

function isAnyRouterTopSelection(selection: RuntimeModelSelection) {
  return /anyrouter\.top/i.test(`${selection.provider.id || ''} ${selection.provider.display_name || ''} ${selection.provider.default_base_url || ''} ${selection.baseUrl || ''} ${selection.endpoint || ''}`)
}

function openAIResponsesSdkBaseUrl(selection: RuntimeModelSelection, requestUrl: string) {
  const responseSuffix = /\/responses\/?$/i
  if (responseSuffix.test(requestUrl)) return requestUrl.replace(responseSuffix, '')
  return selection.baseUrl
}

function headersForOpenAIResponsesSdk(headers: Record<string, string>) {
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
function buildHeaders(selection: RuntimeModelSelection): Record<string, string> {
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

function isMediaRouteType(routeType?: string) {
  return ['image', 'video', 'text_to_image', 'image_to_image', 'text_to_video', 'image_to_video'].includes(String(routeType || ''))
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

async function requestWithLocalAssetDataUris(activeWorkspace: string, request: LLMRequest): Promise<LLMRequest> {
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

function providerEnvelopeCandidates(raw: any) {
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

function getValueByPathFromEnvelopes(raw: any, path: string) {
  for (const candidate of providerEnvelopeCandidates(raw)) {
    const value = getValueByPath(candidate, path)
    if (value !== undefined) return value
  }
  return undefined
}

// ── Response Parsing ────────────────────────────────────────

function parseAnthropicResponse<T = any>(raw: any): LLMResponse<T> {
  const text = Array.isArray(raw?.content)
    ? raw.content.map((item: any) => item?.text || '').join('\n')
    : String(raw?.content || '')
  return normalizeLLMResponse<T>({ ...raw, content: text })
}

function isCodexResponsesFormat(apiFormat: string) {
  const normalized = String(apiFormat || '').toLowerCase()
  return normalized.includes('codex') || normalized.includes('responses')
}

function isClaudeCodeFormat(apiFormat: string) {
  const normalized = String(apiFormat || '').toLowerCase()
  return normalized === 'claude_code' || normalized.includes('anthropic')
}

function isGeminiNativeFormat(apiFormat: string) {
  return String(apiFormat || '').toLowerCase() === 'gemini_native'
}

function parseResponsesResponse<T = any>(raw: any): LLMResponse<T> {
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

function parseGeminiGenerateContentResponse<T = any>(raw: any): LLMResponse<T> {
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

function runtimeRequestCanceledError() {
  return Object.assign(new Error('Request canceled'), { code: 'REQUEST_CANCELED' })
}

async function readStreamChunk(reader: ReadableStreamDefaultReader<Uint8Array>, signal?: AbortSignal) {
  if (signal?.aborted) throw runtimeRequestCanceledError()
  if (!signal) return reader.read()
  return await new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
    let settled = false
    const cleanup = () => signal.removeEventListener('abort', onAbort)
    const onAbort = () => {
      if (settled) return
      settled = true
      cleanup()
      reader.cancel().catch(() => {})
      reject(runtimeRequestCanceledError())
    }
    signal.addEventListener('abort', onAbort, { once: true })
    reader.read()
      .then(result => {
        if (settled) return
        settled = true
        cleanup()
        if (signal.aborted) {
          reader.cancel().catch(() => {})
          reject(runtimeRequestCanceledError())
          return
        }
        resolve(result)
      })
      .catch(error => {
        if (settled) return
        settled = true
        cleanup()
        reject(signal.aborted ? runtimeRequestCanceledError() : error)
      })
  })
}

async function readClaudeCodeStream(response: Response, signal?: AbortSignal): Promise<any> {
  if (!response.body) throw new Error('Streaming response has no body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let rawText = ''
  let content = ''
  let finishReason = ''
  let usage: any = undefined
  const tailChunks: any[] = []

  const consumeLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return
    const payload = trimmed.slice(5).trim()
    if (!payload || payload === '[DONE]') return
    const chunk = JSON.parse(payload)
    const deltaText = chunk?.delta?.text || chunk?.content_block?.text || chunk?.text || ''
    if (deltaText) content += String(deltaText)
    if (chunk?.delta?.stop_reason) finishReason = String(chunk.delta.stop_reason)
    if (chunk?.stop_reason) finishReason = String(chunk.stop_reason)
    if (chunk?.usage) usage = chunk.usage
    tailChunks.push(chunk)
    if (tailChunks.length > 20) tailChunks.shift()
  }

  while (true) {
    const { value, done } = await readStreamChunk(reader, signal)
    if (done) break
    const chunkText = decoder.decode(value, { stream: true })
    rawText += chunkText
    buffer += chunkText
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ''
    for (const line of lines) consumeLine(line)
  }

  const finalText = decoder.decode()
  rawText += finalText
  buffer += finalText
  for (const line of buffer.split(/\r?\n/)) consumeLine(line)

  if (!content && rawText.trim()) {
    try {
      return JSON.parse(rawText)
    } catch {}
  }

  return {
    content: [{ type: 'text', text: content }],
    stop_reason: finishReason || 'end_turn',
    usage,
    stream_chunks_tail: tailChunks,
  }
}

async function readOpenAIStream(response: Response, signal?: AbortSignal): Promise<any> {
  if (!response.body) throw new Error('Streaming response has no body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let finishReason = ''
  let usage: any = undefined
  const tailChunks: any[] = []

  const consumeLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return
    const payload = trimmed.slice(5).trim()
    if (!payload || payload === '[DONE]') return
    const chunk = JSON.parse(payload)
    const choice = chunk?.choices?.[0] || {}
    const delta = choice?.delta || {}
    const piece = delta?.content ?? choice?.text ?? ''
    if (piece) content += String(piece)
    if (choice?.finish_reason) finishReason = String(choice.finish_reason)
    if (chunk?.usage) usage = chunk.usage
    tailChunks.push(chunk)
    if (tailChunks.length > 20) tailChunks.shift()
  }

  while (true) {
    const { value, done } = await readStreamChunk(reader, signal)
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ''
    for (const line of lines) consumeLine(line)
  }

  buffer += decoder.decode()
  for (const line of buffer.split(/\r?\n/)) consumeLine(line)

  return {
    content,
    choices: [{ message: { role: 'assistant', content }, finish_reason: finishReason || 'stop' }],
    usage,
    stream_chunks_tail: tailChunks,
  }
}

async function readResponsesStream(response: Response, signal?: AbortSignal): Promise<any> {
  if (!response.body) throw new Error('Streaming response has no body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let finishReason = ''
  let usage: any = undefined
  const tailChunks: any[] = []
  let sawTextDelta = false
  let finalContent = ''

  const appendText = (value: any) => {
    const text = String(value || '')
    if (text) content += text
  }

  const textFromContentParts = (parts: any[]) => parts
    .map((part: any) => String(part?.text || part?.content || ''))
    .filter(Boolean)
    .join('\n')

  const textFromOutputItems = (items: any[]) => items
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .map((part: any) => String(part?.text || part?.content || ''))
    .filter(Boolean)
    .join('\n')

  const rememberFinalText = (value: any) => {
    const text = String(value || '')
    if (text && !finalContent.includes(text)) {
      finalContent += finalContent ? `\n${text}` : text
    }
  }

  const consumeLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return
    const payload = trimmed.slice(5).trim()
    if (!payload || payload === '[DONE]') return
    const chunk = JSON.parse(payload)
    if (typeof chunk?.delta === 'string') {
      sawTextDelta = true
      appendText(chunk.delta)
    }
    if (typeof chunk?.text === 'string') {
      if (String(chunk?.type || '').includes('.done')) {
        rememberFinalText(chunk.text)
      } else {
        sawTextDelta = true
        appendText(chunk.text)
      }
    }
    const choice = Array.isArray(chunk?.choices) ? chunk.choices[0] : null
    if (typeof choice?.delta?.content === 'string') {
      sawTextDelta = true
      appendText(choice.delta.content)
    }
    if (typeof choice?.message?.content === 'string') {
      sawTextDelta = true
      appendText(choice.message.content)
    }
    if (typeof choice?.text === 'string') {
      sawTextDelta = true
      appendText(choice.text)
    }
    if (!sawTextDelta && Array.isArray(chunk?.item?.content)) appendText(textFromContentParts(chunk.item.content))
    if (!sawTextDelta && Array.isArray(chunk?.part?.content)) appendText(textFromContentParts(chunk.part.content))
    if (!sawTextDelta && chunk?.part?.text) appendText(chunk.part.text)
    if (typeof chunk?.output_text === 'string') rememberFinalText(chunk.output_text)
    if (typeof chunk?.response?.output_text === 'string') rememberFinalText(chunk.response.output_text)
    if (Array.isArray(chunk?.output)) rememberFinalText(textFromOutputItems(chunk.output))
    if (Array.isArray(chunk?.response?.output)) rememberFinalText(textFromOutputItems(chunk.response.output))
    if (choice?.finish_reason) finishReason = String(choice.finish_reason)
    if (chunk?.response?.status) finishReason = String(chunk.response.status)
    if (chunk?.status) finishReason = String(chunk.status)
    if (chunk?.response?.usage) usage = chunk.response.usage
    if (chunk?.usage) usage = chunk.usage
    tailChunks.push(chunk)
    if (tailChunks.length > 20) tailChunks.shift()
  }

  while (true) {
    const { value, done } = await readStreamChunk(reader, signal)
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ''
    for (const line of lines) consumeLine(line)
  }

  buffer += decoder.decode()
  for (const line of buffer.split(/\r?\n/)) consumeLine(line)

  return {
    content: content || finalContent,
    output_text: content || finalContent,
    status: finishReason || 'completed',
    finish_reason: finishReason || 'completed',
    usage,
    stream_chunks_tail: tailChunks,
  }
}

export async function readProviderStream(response: Response, selection: RuntimeModelSelection, signal?: AbortSignal): Promise<any> {
  if (isClaudeCodeFormat(selection.apiFormat)) return readClaudeCodeStream(response, signal)
  if (isCodexResponsesFormat(selection.apiFormat)) return readResponsesStream(response, signal)
  return readOpenAIStream(response, signal)
}

export function parseProviderResponsePayload<T = any>(raw: any, selection: RuntimeModelSelection): LLMResponse<T> {
  const resultExtractor = routeDslValue(selection.routeConfig, 'result_extractor', 'resultExtractor')
  if (resultExtractor) {
    const extracted = getValueByPathFromEnvelopes(raw, String(resultExtractor))
    const extractedContent = typeof extracted === 'string' ? extracted : JSON.stringify(extracted ?? '')
    const content = isMediaRouteType(selection.routeType) ? normalizeExtractedMediaContent(extractedContent) : extractedContent
    return normalizeLLMResponse<T>({ ...raw, content })
  }
  if (isMediaRouteType(selection.routeType)) {
    const extracted = extractMediaContent(raw)
    if (extracted) return normalizeLLMResponse<T>({ ...raw, content: extracted })
  }
  if (isClaudeCodeFormat(selection.apiFormat)) return parseAnthropicResponse<T>(raw)
  if (isGeminiNativeFormat(selection.apiFormat)) return parseGeminiGenerateContentResponse<T>(raw)
  if (isCodexResponsesFormat(selection.apiFormat)) return parseResponsesResponse<T>(raw)
  return normalizeLLMResponse<T>(raw)
}

function extractMediaContent(raw: any) {
  for (const candidate of providerEnvelopeCandidates(raw)) {
    const firstData = Array.isArray(candidate?.data) ? candidate.data[0] : null
    if (firstData?.url || firstData?.b64_json) return normalizeExtractedMediaContent(String(firstData.url || firstData.b64_json))
    const firstResult = Array.isArray(candidate?.output?.results) ? candidate.output.results[0] : Array.isArray(candidate?.results) ? candidate.results[0] : null
    if (firstResult?.video_url || firstResult?.image_url || firstResult?.url) return normalizeExtractedMediaContent(String(firstResult.video_url || firstResult.image_url || firstResult.url))
    if (candidate?.output?.video_url || candidate?.output?.image_url || candidate?.output?.url) return normalizeExtractedMediaContent(String(candidate.output.video_url || candidate.output.image_url || candidate.output.url))
    if (candidate?.video_url || candidate?.image_url || candidate?.url) return normalizeExtractedMediaContent(String(candidate.video_url || candidate.image_url || candidate.url))
    const firstVideoResult = Array.isArray(candidate?.video_result) ? candidate.video_result[0] : null
    if (firstVideoResult?.url) return normalizeExtractedMediaContent(String(firstVideoResult.url))
    const choiceContent = candidate?.choices?.[0]?.message?.content || candidate?.choices?.[0]?.text
    if (choiceContent) return normalizeExtractedMediaContent(String(choiceContent))
  }
  return ''
}

function normalizeExtractedMediaContent(content: string) {
  const value = String(content || '').trim()
  if (!value) return ''
  if (/^(https?:|data:|blob:)/i.test(value)) return value
  const markdownMatch = value.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/i)
  if (markdownMatch) return markdownMatch[1]
  const dataMatch = value.match(/(data:(?:image|video)\/[^;]+;base64,[A-Za-z0-9+/=]+)/i)
  if (dataMatch) return dataMatch[1]
  const urlMatch = value.match(/(https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|webp|gif|mp4|webm|mov)(?:\?[^\s"'<>)]*)?)/i)
  if (urlMatch) return urlMatch[1]
  if (value.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(value.slice(0, 120))) return `data:image/png;base64,${value.replace(/\s+/g, '')}`
  return value
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
function isRetryable(status: number, error?: string): boolean {
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

function describeFetchError(error: any): string {
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

function statusFromProviderError(error: any) {
  const status = Number(error?.status ?? error?.statusCode ?? error?.response?.status ?? 0)
  return Number.isFinite(status) ? status : 0
}

function bodyTextFromProviderError(error: any) {
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

function describeProviderRequestContext(selection: RuntimeModelSelection, url: string): string {
  return `POST ${url} | provider=${selection.provider.id} | model=${selection.model.model_name} | format=${selection.apiFormat}`
}

function requestRouteType(request: LLMRequest, model: ModelRecord) {
  const explicit = String((request as any).type || (request as any).mode || (request as any).task_type || '').trim()
  if (explicit) return explicit
  const capabilities = model.capabilities || {}
  const activeModalities = Object.entries(capabilities)
    .filter(([key, enabled]) => enabled === true && key !== 'chat')
    .map(([key]) => key)
  return activeModalities.length === 1 ? activeModalities[0] : ''
}

function routeModelMatchers(route: Record<string, any>) {
  const raw = [route.match, route.matches, route.model, route.model_name, route.modelName, route.models, route.pattern].flat()
  return raw.map(item => String(item || '').trim()).filter(Boolean)
}

function doesModelRouteMatch(route: Record<string, any>, modelName: string) {
  const name = String(modelName || '').trim()
  if (!name) return false
  const normalizedName = name.toLowerCase()
  const matchType = String(route.match_type || route.matchType || route.matcher || 'contains').toLowerCase()
  return routeModelMatchers(route).some(matcher => {
    if (matcher === '*') return true
    if (matchType === 'exact') return normalizedName === matcher.toLowerCase()
    if (matchType === 'regex') {
      try { return new RegExp(matcher, 'i').test(name) } catch { return false }
    }
    return normalizedName.includes(matcher.toLowerCase())
  })
}

function routeConfigForModel(route: any, modelName: string) {
  const modelRoutes = isRouteObject(route) ? route.model_routes ?? route.modelRoutes : undefined
  if (!isRouteObject(route) || !Array.isArray(modelRoutes)) return route
  const matched = modelRoutes.find((item: any) => isRouteObject(item) && doesModelRouteMatch(item, modelName))
  if (!matched) return route
  const { model_routes: _modelRoutes, modelRoutes: _modelRoutesCamel, ...baseRoute } = route
  const {
    match: _match,
    matches: _matches,
    model: _routeModel,
    model_name: _routeModelName,
    modelName: _routeModelNameCamel,
    models: _models,
    pattern: _pattern,
    match_type: _matchType,
    matchType: _matchTypeCamel,
    matcher: _matcher,
    ...overrideRoute
  } = matched
  const merged = { ...baseRoute, ...overrideRoute }
  if (isRouteObject(baseRoute.headers) || isRouteObject(overrideRoute.headers)) {
    merged.headers = { ...(baseRoute.headers || {}), ...(overrideRoute.headers || {}) }
  }
  return merged
}

function usableRouteConfig(value: any): any {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^(undefined|null|none|false)$/i.test(trimmed)) return ''
  return value
}

function firstUsableRouteConfig(...values: any[]) {
  return values.map(usableRouteConfig).find(Boolean) || ''
}

function routeConfigForRequest(provider: ProviderRecord, request: LLMRequest, model: ModelRecord): any {
  const endpoints = provider.endpoints || {}
  const apiFormat = effectiveApiFormat(provider, model)
  if (isClaudeCodeFormat(apiFormat)) return firstUsableRouteConfig(endpoints.messages, endpoints.chat, endpoints.llm)
  if (isCodexResponsesFormat(apiFormat)) return firstUsableRouteConfig(endpoints.responses, endpoints.chat, endpoints.llm)
  const routeType = requestRouteType(request, model)
  const routeConfig = routeType ? usableRouteConfig(endpoints[routeType]) : ''
  if (routeConfig) return routeConfigForModel(routeConfig, model.model_name)
  const broadType = routeType.includes('image') ? 'image' : routeType.includes('video') ? 'video' : ''
  const broadConfig = broadType ? usableRouteConfig(endpoints[broadType]) : ''
  if (broadConfig) return routeConfigForModel(broadConfig, model.model_name)
  return routeConfigForProvider(provider)
}

function normalizeGeminiModelName(modelName = '') {
  return String(modelName || '').replace(/^models\//, '').trim()
}

function endpointForRoute(provider: ProviderRecord, route: any, routeType = '', modelName = '', apiFormat = provider.api_format) {
  const usableRoute = usableRouteConfig(route)
  if (!usableRoute) return fallbackEndpointForProvider(provider, routeType, modelName, apiFormat)
  route = usableRoute
  if (isRouteObject(route)) return String(route.url || route.endpoint || fallbackEndpointForProvider(provider, routeType, modelName, apiFormat))
  if (route) return String(route)
  return fallbackEndpointForProvider(provider, routeType, modelName, apiFormat)
}

function selectionForRequestRoute(selection: RuntimeModelSelection, request: LLMRequest): RuntimeModelSelection {
  const routeType = requestRouteType(request, selection.model)
  const routeConfig = routeConfigForRequest(selection.provider, request, selection.model)
  return {
    ...selection,
    endpoint: endpointForRoute(selection.provider, routeConfig, routeType, selection.model.model_name, selection.apiFormat),
    routeConfig,
    routeType,
  }
}

function asyncTaskStatus(raw: any, routeConfig: Record<string, any>) {
  const statusPath = String(routeDslValue(routeConfig, 'status_extractor', 'statusExtractor') || 'output.task_status')
  const extracted = getValueByPathFromEnvelopes(raw, statusPath)
  for (const candidate of providerEnvelopeCandidates(raw)) {
    const fallback = candidate?.status || candidate?.task_status || candidate?.taskStatus || candidate?.state || candidate?.output?.task_status || candidate?.output?.taskStatus || candidate?.output?.status || candidate?.output?.state
    if (extracted ?? fallback) return String(extracted ?? fallback).toLowerCase()
  }
  return ''
}

function asyncTaskId(raw: any, routeConfig: Record<string, any>) {
  const taskPath = String(routeDslValue(routeConfig, 'task_id_extractor', 'taskIdExtractor') || '')
  const extracted = taskPath ? getValueByPathFromEnvelopes(raw, taskPath) : undefined
  for (const candidate of providerEnvelopeCandidates(raw)) {
    const fallback = candidate?.task_id || candidate?.taskId || candidate?.id || candidate?.output?.task_id || candidate?.output?.taskId || candidate?.output?.id
    const value = extracted ?? fallback
    if (value != null) return String(value).trim()
  }
  return ''
}

function isPendingTaskStatus(status: string) {
  return ['pending', 'processing', 'submitted', 'in_progress', 'queued', 'running'].includes(status)
}

function isCompletedTaskStatus(status: string) {
  return ['succeeded', 'success', 'completed', 'finished', 'done'].includes(status)
}

function isFailedTaskStatus(status: string) {
  const normalized = String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  return [
    'failed',
    'failure',
    'fail',
    'error',
    'errored',
    'cancelled',
    'canceled',
    'aborted',
    'abort',
    'rejected',
    'reject',
    'timeout',
    'timed_out',
    'expired',
  ].includes(normalized)
}

function pollUrlForTask(selection: RuntimeModelSelection, routeConfig: Record<string, any>, taskId: string, initialUrl: string) {
  const template = String(routeDslValue(routeConfig, 'poll_url', 'pollUrl') || '').trim()
  const rendered = (template || `${initialUrl.replace(/\/+$/, '')}/{{task_id}}`).replace(/\{\{\s*task_id\s*\}\}/g, taskId)
  return /^https?:\/\//i.test(rendered) ? rendered : buildUrl(selection.baseUrl, rendered)
}

async function readJsonOrText(response: Response, label: string) {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return { content: text, raw_text: text, label }
  }
}

function waitForPollInterval(ms: number, signal?: AbortSignal) {
  if (ms <= 0) return Promise.resolve()
  if (signal?.aborted) return Promise.reject(new Error('Request canceled'))
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      reject(new Error('Request canceled'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

async function pollAsyncProviderTask(raw: any, selection: RuntimeModelSelection, headers: Record<string, string>, initialUrl: string, options: RuntimeExecutionOptions) {
  if (!isRouteObject(selection.routeConfig)) return raw
  const taskId = asyncTaskId(raw, selection.routeConfig)
  if (!taskId) return raw
  const initialStatus = asyncTaskStatus(raw, selection.routeConfig)
  if (isCompletedTaskStatus(initialStatus) || !isPendingTaskStatus(initialStatus)) return raw

  const pollUrl = pollUrlForTask(selection, selection.routeConfig, taskId, initialUrl)
  const maxAttempts = Math.max(1, Number(routeDslValue(selection.routeConfig, 'poll_max_attempts', 'pollMaxAttempts') || 60))
  const pollIntervalMs = Math.max(0, Number(routeDslValue(selection.routeConfig, 'poll_interval_ms', 'pollIntervalMs') ?? 10_000))

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (options.signal?.aborted) throw new Error('Request canceled')
    if (attempt > 1 && pollIntervalMs > 0) await waitForPollInterval(pollIntervalMs, options.signal)
    const response = await fetch(pollUrl, { method: 'GET', headers, signal: options.signal })
    const pollPayload = await readJsonOrText(response, 'provider async poll')
    if (!response.ok) {
      throw new Error(`Async task poll failed ${response.status}: ${JSON.stringify(pollPayload).slice(0, 500)}`)
    }
    const status = asyncTaskStatus(pollPayload, selection.routeConfig)
    if (isFailedTaskStatus(status)) {
      throw new Error(`Async task failed: ${JSON.stringify(pollPayload).slice(0, 500)}`)
    }
    if (isCompletedTaskStatus(status) || !isPendingTaskStatus(status)) return pollPayload
  }

  throw new Error(`Async task timed out: ${taskId}`)
}

// ── HTTP Request with Retry ─────────────────────────────────

/**
 * Send LLM request with retry logic.
 * Reference: Claude Code's withRetry.ts pattern:
 *   - Base delay 500ms with exponential backoff + 25% jitter
 *   - Max retries configurable (default 5 for foreground requests)
 *   - Timeout: 600s default (Claude Code foreground), env override LLM_TIMEOUT_MS
 *   - Only retry on retryable errors (429, 5xx, network, 524)
 *   - AbortController per-attempt (fresh signal each retry)
 *   - Chunked keep-alive: log progress every 30s for long requests
 */
async function postProviderJson<T = any>(
  selection: RuntimeModelSelection,
  request: LLMRequest,
  options: RuntimeExecutionOptions = {},
): Promise<LLMResponse<T>> {
  const routedSelection = selectionForRequestRoute(selection, request)
  const url = buildUrl(routedSelection.baseUrl, routedSelection.endpoint, routedSelection.apiFormat)
  const body = buildProviderRequestBody(request, routedSelection)
  const isStreaming = Boolean((body as any).stream)
  const headers = buildHeaders(routedSelection)
  if (isStreaming && isCodexResponsesFormat(routedSelection.apiFormat)) headers.Accept = 'text/event-stream'
  const useOpenAIResponsesSdk = shouldUseOpenAIResponsesSdk(routedSelection)
  const maxRetries = Number(options.maxRetries ?? process.env.LLM_MAX_RETRIES ?? 5)
  const timeoutMs = Number(options.timeoutMs ?? process.env.LLM_TIMEOUT_MS ?? 600000) // 600s default, matches Claude Code foreground
  const keyMask = (selection.key.key || '').slice(0, 8) + '...'
  const heartbeatInterval = 30_000 // log progress every 30s
  const requestModelName = String((body as any).model || routedSelection.model.model_name || request.model || '')

  console.log(
    `[provider-runtime] POST ${url} | model: ${requestModelName} | format: ${routedSelection.apiFormat} | transport=${useOpenAIResponsesSdk ? 'openai-sdk' : 'fetch'} | responseMode=${routedSelection.provider.response_mode || 'auto'} | stream=${isStreaming ? 'on' : 'off'} | key: ${keyMask} | timeout=${timeoutMs}ms | retries=${maxRetries}`,
  )
  if (isCodexResponsesFormat(routedSelection.apiFormat)) {
    console.log(`[provider-runtime] Codex body summary: ${JSON.stringify(summarizeProviderRequestBodyForLog(body))}`)
  }

  let lastError: string | null = null
  let lastStatus = 0

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    if (options.signal?.aborted) {
      throw new Error('Request canceled')
    }
    if (attempt > 1) {
      // Claude Code style: exponential backoff with jitter
      const baseDelay = Math.min(500 * Math.pow(2, attempt - 2), 32000)
      const jitter = Math.random() * 0.25 * baseDelay
      const delay = baseDelay + jitter
      console.log(`[provider-runtime] Attempt ${attempt}/${maxRetries + 1}, retrying in ${Math.round(delay)}ms...`)
      await waitForPollInterval(delay, options.signal)
    }

    const controller = new AbortController()
    const startTime = Date.now()
    let heartbeatTimer: NodeJS.Timeout | null = null
    const abortFromParent = () => controller.abort()
    if (options.signal) {
      if (options.signal.aborted) controller.abort()
      else options.signal.addEventListener('abort', abortFromParent, { once: true })
    }
    const timeout = setTimeout(() => {
      controller.abort()
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
      console.warn(`[provider-runtime] ⏰ Request timed out after ${timeoutMs}ms (elapsed ${elapsed}s)`)
    }, timeoutMs)

    // Heartbeat: log progress every 30s so long requests don't look dead
    heartbeatTimer = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
      console.log(`[provider-runtime] ♻️  Still waiting... ${elapsed}s elapsed (attempt ${attempt}/${maxRetries + 1})`)
    }, heartbeatInterval)

    let response: Response
    try {
      if (useOpenAIResponsesSdk) {
        const raw = await createOpenAIResponseViaSdk({
          apiKey: routedSelection.key.key,
          baseURL: openAIResponsesSdkBaseUrl(routedSelection, url),
          headers: headersForOpenAIResponsesSdk(headers),
          body,
          timeoutMs,
          signal: controller.signal,
        })
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
        console.log(`[provider-runtime] Response: sdk | ${routedSelection.model.model_name} | ${isStreaming ? 'streaming' : 'json'} | ${elapsed}s`)
        return parseProviderResponsePayload<T>(raw, routedSelection)
      }

      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (err: any) {
      if (options.signal?.aborted) {
        throw new Error('Request canceled')
      }
      if (useOpenAIResponsesSdk) {
        const status = statusFromProviderError(err)
        if (status > 0) {
          lastStatus = status
          const text = bodyTextFromProviderError(err)
          console.log(
            `[provider-runtime] Response: ${status} | ${routedSelection.model.model_name} | SDK error preview: ${text.slice(0, 300)}`,
          )
          if (status === 401) throw new Error(`Invalid API key (401): ${text.slice(0, 500)}`)
          if (status === 400) throw new Error(`Bad request (400): ${text.slice(0, 500)}`)
          if (status === 404) throw new Error(`Endpoint not found (404): ${text.slice(0, 500)}`)
          const errorMsg = `Provider request failed ${status}: ${text.slice(0, 500)}`
          if (!isRetryable(status, text)) throw new Error(errorMsg)
          lastError = errorMsg
          console.warn(`[provider-runtime] Retryable SDK error ${status}, will retry...`)
          continue
        }
      }
      const errMsg = describeFetchError(err)
      lastError = errMsg
      console.error(`[provider-runtime] Network error: ${errMsg}`)

      // Fetch threw before an HTTP response was available. Retry it like a
      // transient network failure; parent aborts were handled above.
      continue
    } finally {
      clearTimeout(timeout)
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      if (options.signal) options.signal.removeEventListener('abort', abortFromParent)
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    lastStatus = response.status

    // Check for retryable status codes
    if (!response.ok) {
      const text = await response.text()
      console.log(
        `[provider-runtime] Response: ${response.status} | ${routedSelection.model.model_name} | body preview: ${text.slice(0, 300)} | ${elapsed}s`,
      )
      const errorMsg = `Provider request failed ${response.status}: ${text.slice(0, 500)}`

      // 401 Invalid API key — NEVER retry, fail immediately
      if (response.status === 401) {
        throw new Error(`Invalid API key (401): ${text.slice(0, 500)}`)
      }

      // 400 Bad Request — likely a prompt/model issue, don't retry
      if (response.status === 400) {
        throw new Error(`Bad request (400): ${text.slice(0, 500)}`)
      }

      // 404 Not Found — wrong endpoint, don't retry
      if (response.status === 404) {
        throw new Error(`Endpoint not found (404): ${text.slice(0, 500)}`)
      }

      // Provider-side file upload failures are deterministic for the current
      // payload size. Retrying the same request just burns time; callers can
      // shrink the prompt and retry at a higher level.
      if (/upload current user input file|upload file failed/i.test(text)) {
        throw new Error(`Provider upload failed (${response.status}): ${text.slice(0, 500)}`)
      }

      if (!isRetryable(response.status)) {
        throw new Error(errorMsg)
      }

      lastError = errorMsg
      console.warn(`[provider-runtime] Retryable error ${response.status}, will retry...`)
      continue
    }

    // Success — parse response
    let raw: any
    if (isStreaming) {
      const streamController = new AbortController()
      let streamTimedOut = false
      const abortStreamFromParent = () => streamController.abort()
      if (options.signal) {
        if (options.signal.aborted) streamController.abort()
        else options.signal.addEventListener('abort', abortStreamFromParent, { once: true })
      }
      const streamTimeout = setTimeout(() => {
        streamTimedOut = true
        streamController.abort()
        console.warn(`[provider-runtime] ⏰ Stream read timed out after ${timeoutMs}ms`)
      }, timeoutMs)
      try {
        console.log(`[provider-runtime] Response: ${response.status} | ${routedSelection.model.model_name} | streaming | ${elapsed}s`)
        raw = await readProviderStream(response, routedSelection, streamController.signal)
      } catch (error) {
        if (options.signal?.aborted) throw runtimeRequestCanceledError()
        if (streamTimedOut) throw new Error(`Request timed out after ${timeoutMs}ms while reading provider stream`)
        lastError = describeFetchError(error)
        console.error(`[provider-runtime] Stream read error: ${lastError}`)
        throw new Error(`Provider stream read failed: ${lastError}`)
      } finally {
        clearTimeout(streamTimeout)
        if (options.signal) options.signal.removeEventListener('abort', abortStreamFromParent)
      }
    } else {
      const text = await response.text()

      // Log response for debugging
      console.log(
        `[provider-runtime] Response: ${response.status} | ${routedSelection.model.model_name} | body preview: ${text.slice(0, 300)} | ${elapsed}s`,
      )

      try {
        raw = JSON.parse(text)
      } catch {
        raw = { content: text }
      }
    }

    const finalRaw = isStreaming ? raw : await pollAsyncProviderTask(raw, routedSelection, headers, url, options)
    return parseProviderResponsePayload<T>(finalRaw, routedSelection)
  }

  // All retries exhausted
  throw new Error(
    `All ${maxRetries} retries exhausted. ${describeProviderRequestContext(routedSelection, url)}. Last status: ${lastStatus}. Last error: ${lastError}`,
  )
}

// ── Model Selection ─────────────────────────────────────────

export async function selectRuntimeModel(
  activeWorkspace: string,
  preferredModelId?: number,
  options: RuntimeModelSelectionOptions = {},
): Promise<RuntimeModelSelection | null> {
  const [providers, keys, models] = await Promise.all([
    readProviders(activeWorkspace),
    readKeys(activeWorkspace),
    readModels(activeWorkspace),
  ])

  const routingStrategy = normalizeRoutingStrategy(options.routingStrategy)

  console.log(`[provider-runtime] selectRuntimeModel: workspace=${activeWorkspace}, preferredModelId=${preferredModelId}, routingStrategy=${routingStrategy}`)
  console.log(`[provider-runtime] loaded: providers=${providers.length}, keys=${keys.length}, models=${models.length}`)

  const activeProviders = providers.filter(
    p => p.is_active !== false && p.service_type !== 'image',
  )
  const activeKeys = keys.filter(k => k.is_active !== false && k.key)
  const routedActiveKeys = sortRuntimeKeys(activeKeys.filter(keyHasUsableQuota), routingStrategy)

  // ── Model Selection ──────────────────────────────────────
  // Priority: preferredModelId (ignore health) → non-disabled favorite → non-disabled[0] → ANY model
  let availableModels = models.filter(m => m.health_status !== 'disabled')
  if (availableModels.length === 0) {
    console.warn(`[provider-runtime] No non-disabled models, falling back to ALL (${models.length} total)`)
    console.log(`[provider-runtime] model health statuses: ${JSON.stringify(models.map(m => ({ id: m.id, name: m.model_name, health: m.health_status })))}`)
    availableModels = models
  }

  let model: ModelRecord | undefined
  const routedAvailableModels = rankModelsByBalancedKey(availableModels, activeKeys, routedActiveKeys)
  const automaticModels = routedAvailableModels.length ? routedAvailableModels : availableModels

  // 1. Try exact preferredModelId — ignore health_status (user explicitly selected it)
  if (preferredModelId) {
    model = models.find(m => m.id === preferredModelId)
    if (model) {
      console.log(`[provider-runtime] Using preferred model: id=${model.id}, name=${model.model_name}, health=${model.health_status}`)
    }
  }

  // 2. Favorite among available
  if (!model) {
    model = automaticModels.find(m => m.is_favorite)
    if (model) console.log(`[provider-runtime] Using favorite model: id=${model.id}, name=${model.model_name}`)
  }

  // 3. First available
  if (!model) {
    model = automaticModels[0]
    if (model) console.log(`[provider-runtime] Using first available model: id=${model.id}, name=${model.model_name}`)
  }

  // 4. Final fallback: any model at all
  if (!model && models.length > 0) {
    model = models[0]
    console.warn(`[provider-runtime] LAST RESORT: using model id=${model.id}, name=${model.model_name}, health=${model.health_status}`)
  }

  if (!model) {
    console.error(`[provider-runtime] CRITICAL: No models loaded at all from ${activeWorkspace}/models.json`)
    return null
  }

  // ── Provider Resolution ──────────────────────────────────
  let provider = activeProviders.find(
    p => p.id === model.provider || p.id === String(model.provider),
  )
  if (!provider) {
    // Fallback: try ANY provider matching the model's provider, even if inactive
    provider = providers.find(
      p => p.id === model.provider || p.id === String(model.provider),
    )
    if (provider) {
      console.warn(`[provider-runtime] Provider "${provider.id}" is inactive, using anyway`)
    }
  }
  if (!provider) {
    console.error(`[provider-runtime] Provider "${model.provider}" not found among ${providers.length} providers: ${JSON.stringify(providers.map(p => p.id))}`)
    return null
  }

  // ── Key Resolution ───────────────────────────────────────
  let key = routedActiveKeys.find(k => k.id === model.api_key_id)
    || routedActiveKeys.find(k => k.provider === provider.id)
    || routedActiveKeys[0]

  // Final fallback: use ANY key, even if inactive
  if (!key && keys.length > 0) {
    key = keys.find(k => k.provider === provider.id) || keys[0]
    console.warn(`[provider-runtime] Using non-active key as fallback: id=${key.id}`)
  }

  if (!key || !key.key) {
    console.error(`[provider-runtime] No API key found. activeKeys=${activeKeys.length}, allKeys=${keys.length}`)
    return null
  }

  const apiFormat = effectiveApiFormat(provider, model)
  const baseUrl = normalizeBaseUrl(key.base_url || provider.default_base_url || (isGeminiNativeFormat(apiFormat) ? GEMINI_NATIVE_BASE_URL : ''))
  if (!baseUrl) {
    console.error(`[provider-runtime] Provider "${provider.id}" has no base URL on key or provider: ${JSON.stringify({ provider, key: { ...key, key: key.key ? '***' : '' } })}`)
    return null
  }

  console.log(
    `[provider-runtime] ✅ Selected: model=${model.model_name} provider=${provider.id} baseUrl=${baseUrl} key=${(key.key || '').slice(0, 8)}...`,
  )

  const routeConfig = routeConfigForProvider(provider, apiFormat)

  return {
    provider,
    key,
    model,
    baseUrl,
    endpoint: endpointForRoute(provider, routeConfig, '', model.model_name, apiFormat),
    routeConfig,
    apiFormat,
  }
}

// ── Endpoint Resolution ─────────────────────────────────────

export function endpointForProvider(provider: ProviderRecord): string {
  const route = routeConfigForProvider(provider)
  return endpointForRoute(provider, route)
}

function effectiveApiFormat(provider: ProviderRecord, model?: ModelRecord): string {
  const modelFormat = String(model?.api_format || '').trim().toLowerCase()
  if (modelFormat) return modelFormat
  return String(provider.api_format || 'openai_compatible').trim().toLowerCase()
}

function routeConfigForProvider(provider: ProviderRecord, apiFormat = provider.api_format): any {
  const endpoints = provider.endpoints || {}
  if (isClaudeCodeFormat(apiFormat)) return firstUsableRouteConfig(endpoints.messages, endpoints.chat, endpoints.llm)
  if (isCodexResponsesFormat(apiFormat)) return firstUsableRouteConfig(endpoints.responses, endpoints.chat, endpoints.llm)
  return firstUsableRouteConfig(endpoints.chat, endpoints.completions, endpoints.llm)
}

function fallbackEndpointForProvider(provider: ProviderRecord, routeType = '', modelName = '', apiFormat = provider.api_format) {
  if (isClaudeCodeFormat(apiFormat)) return 'messages'
  if (isCodexResponsesFormat(apiFormat)) return 'responses'
  if (isGeminiNativeFormat(apiFormat)) return `models/${encodeURIComponent(normalizeGeminiModelName(modelName || 'gemini-1.5-flash'))}:generateContent`
  if (String(routeType).includes('image')) return 'images/generations'
  if (String(routeType).includes('video')) return 'videos/generations'
  return 'chat/completions'
}

// ── Main Entry Point ────────────────────────────────────────

export async function executeWithRuntimeModel<T = any>(
  activeWorkspace: string,
  request: LLMRequest,
  preferredModelId?: number,
  options: RuntimeExecutionOptions = {},
): Promise<LLMResponse<T> & { runtimeSelection?: RuntimeModelSelection | null }> {
  const selection = await selectRuntimeModel(activeWorkspace, preferredModelId, {
    routingStrategy: options.routingStrategy || (request as any).routingStrategy || (request as any).routing_strategy,
  })
  if (!selection) {
    return {
      content: '',
      parsed: null,
      raw: null,
      tool_calls: [],
      finish_reason: 'error',
      error: 'no_runtime_model_configured',
      runtimeSelection: null,
    }
  }

  const startedAt = Date.now()
  try {
    const normalizedRequest = await requestWithLocalAssetDataUris(activeWorkspace, request)
    const response = await postProviderJson<T>(selection, normalizedRequest, options)
    await recordRuntimeKeyMetrics(activeWorkspace, selection.key.id, startedAt, true)
    return { ...response, runtimeSelection: sanitizeRuntimeSelection(selection) as any }
  } catch (error) {
    await recordRuntimeKeyMetrics(activeWorkspace, selection.key.id, startedAt, false)
    console.error(`[provider-runtime] Request failed: ${error}`)
    return {
      content: '',
      parsed: null,
      raw: null,
      tool_calls: [],
      finish_reason: 'error',
      error: String(error),
      runtimeSelection: sanitizeRuntimeSelection(selection) as any,
    }
  }
}

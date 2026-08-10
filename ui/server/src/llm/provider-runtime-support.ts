import { readKeys, writeKeys, type APIKeyRecord } from '../key-store'
import { type ModelRecord } from '../model-store'
import {
  applyClaudeCodeAuthHeaders,
  anyRouterOfficialMessagesEndpoint,
  applyClaudeCodeHeaders,
} from './anthropic-context'
import {
  mergeHeadersCaseInsensitive,
  modelCustomHeaders,
} from './model-runtime-overrides'
import type {
  RuntimeExecutionOptions,
  RuntimeModelSelection,
  RuntimeModelSelectionOptions,
  RuntimeRequestTransportPreflightOptions,
  RuntimeRoutingStrategy,
} from './provider-runtime-support-types'
import {
  isRouteObject,
  routeDslValue,
} from './provider-runtime-support-route-dsl'
export type {
  RuntimeExecutionOptions,
  RuntimeModelSelection,
  RuntimeModelSelectionOptions,
  RuntimeRequestTransportPreflightOptions,
  RuntimeRoutingStrategy,
} from './provider-runtime-support-types'
export {
  isRouteObject,
  routeDslValue,
}
import {
  buildProviderRequestBody,
  getValueByPathFromEnvelopes,
  isClaudeCodeFormat,
  isCodexResponsesFormat,
  isGeminiNativeFormat,
  isMediaRouteType,
  parseAnthropicResponse,
  parseGeminiGenerateContentResponse,
  parseResponsesResponse,
  providerEnvelopeCandidates,
  requestRouteType,
  requestWithLocalAssetDataUris,
  resolveProviderRequestTransportPlan,
  runtimeRequestCanceledError,
  summarizeProviderRequestBodyForLog,
} from './provider-runtime-support-bodies'
export {
  buildProviderRequestBody,
  getValueByPathFromEnvelopes,
  isClaudeCodeFormat,
  isCodexResponsesFormat,
  isGeminiNativeFormat,
  isMediaRouteType,
  parseAnthropicResponse,
  parseGeminiGenerateContentResponse,
  parseResponsesResponse,
  providerEnvelopeCandidates,
  requestRouteType,
  requestWithLocalAssetDataUris,
  resolveProviderRequestTransportPlan,
  runtimeRequestCanceledError,
  summarizeProviderRequestBodyForLog,
}

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

export const GEMINI_NATIVE_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

function maskSecret(value?: string) {
  const text = String(value || '')
  if (!text) return ''
  if (text.length <= 8) return '***'
  return `${text.slice(0, 4)}***${text.slice(-4)}`
}


type SafeRuntimeModelSelection = Omit<RuntimeModelSelection, 'key'> & {
  key: Omit<APIKeyRecord, 'key'> & {
    has_key: boolean
    key_preview: string
  }
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

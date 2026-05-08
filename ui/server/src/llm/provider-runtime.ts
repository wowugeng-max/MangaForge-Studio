import { readKeys, type APIKeyRecord } from '../key-store'
import { readModels, type ModelRecord } from '../model-store'
import { readProviders, type ProviderRecord } from '../provider-store'
import type { LLMRequest, LLMResponse } from './types'
import { normalizeLLMResponse } from './adapter'

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
  apiFormat: string
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
function buildUrl(baseUrl: string, endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint
  const base = normalizeBaseUrl(baseUrl)
  const ep = String(endpoint || '').replace(/^\/+/, '')

  // Check if base already ends with a version segment like /v1
  if (/\/v\d+$/i.test(base)) return `${base}/${ep}`

  // Check if base already ends with a full endpoint path (e.g. /v1/complete)
  // In this case, just append the sub-path
  return `${base}/${ep}`
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
    ...(selection.provider.custom_headers || {}),
  }

  // Authentication — matches Claude Code's configureApiKeyHeaders
  if (selection.key.key) {
    if (selection.provider.auth_type === 'x-api-key') {
      headers['x-api-key'] = selection.key.key
    } else {
      headers['Authorization'] = `Bearer ${selection.key.key}`
    }
  }

  // Anthropic-specific headers
  if (selection.apiFormat === 'anthropic' && !headers['anthropic-version']) {
    headers['anthropic-version'] = '2023-06-01'
  }

  return headers
}

// ── Request Body ────────────────────────────────────────────

function toOpenAIBody(request: LLMRequest, selection: RuntimeModelSelection): Record<string, any> {
  const body: Record<string, any> = {
    model: selection.model.model_name || request.model,
    messages: request.messages,
    temperature: request.temperature ?? 0.3,
    max_tokens: request.max_tokens ?? 4096,
  }
  if (request.response_format && request.response_format !== 'text') {
    body.response_format = request.response_format
  }
  if (request.tools?.length) body.tools = request.tools
  if (request.tool_choice && request.tool_choice !== 'none') body.tool_choice = request.tool_choice
  return body
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
    model: selection.model.model_name || request.model,
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
  return body
}

// ── Response Parsing ────────────────────────────────────────

function parseAnthropicResponse<T = any>(raw: any): LLMResponse<T> {
  const text = Array.isArray(raw?.content)
    ? raw.content.map((item: any) => item?.text || '').join('\n')
    : String(raw?.content || '')
  return normalizeLLMResponse<T>({ ...raw, content: text })
}

// ── Error Classification ────────────────────────────────────

/**
 * Classify errors for retry decisions.
 * Claude Code (withRetry.ts): retries on 429, 5xx, and network errors.
 * Does NOT retry on 4xx (client errors like 401, 400).
 */
function isRetryable(status: number, error?: string): boolean {
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

// ── HTTP Request with Retry ─────────────────────────────────

/**
 * Send LLM request with retry logic.
 * Reference: Claude Code's withRetry.ts pattern:
 *   - Exponential backoff (1s, 2s, 4s, ...)
 *   - Max retries configurable
 *   - Only retry on retryable errors
 */
async function postProviderJson<T = any>(
  selection: RuntimeModelSelection,
  request: LLMRequest,
): Promise<LLMResponse<T>> {
  const url = buildUrl(selection.baseUrl, selection.endpoint)
  const body = selection.apiFormat === 'anthropic'
    ? toAnthropicBody(request, selection)
    : toOpenAIBody(request, selection)
  const headers = buildHeaders(selection)
  const maxRetries = 3
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 120000)
  const keyMask = (selection.key.key || '').slice(0, 8) + '...'

  console.log(
    `[provider-runtime] POST ${url} | model: ${selection.model.model_name} | format: ${selection.apiFormat} | key: ${keyMask}`,
  )

  let lastError: string | null = null
  let lastStatus = 0

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = 1000 * Math.pow(2, attempt - 1)
      console.log(`[provider-runtime] Attempt ${attempt}/${maxRetries}, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
      console.warn(`[provider-runtime] ⏰ Request timed out after ${timeoutMs}ms`)
    }, timeoutMs)

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (err: any) {
      const errMsg = String(err?.message || err)
      lastError = errMsg
      console.error(`[provider-runtime] Network error: ${errMsg}`)

      if (!isRetryable(0, errMsg)) {
        throw new Error(`Network error (non-retryable): ${errMsg}`)
      }
      continue
    } finally {
      clearTimeout(timeout)
    }

    lastStatus = response.status
    const text = await response.text()

    // Log response for debugging
    console.log(
      `[provider-runtime] Response: ${response.status} | ${selection.model.model_name} | body preview: ${text.slice(0, 300)}`,
    )

    // Check for retryable status codes
    if (!response.ok) {
      const errorMsg = `Provider request failed ${response.status}: ${text.slice(0, 500)}`

      // 401 Invalid API key — NEVER retry, fail immediately
      if (response.status === 401) {
        throw new Error(`Invalid API key (401): ${text.slice(0, 500)}`)
      }

      // 400 Bad Request — likely a prompt/model issue, don't retry
      if (response.status === 400) {
        throw new Error(`Bad request (400): ${text.slice(0, 500)}`)
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
    try {
      raw = JSON.parse(text)
    } catch {
      raw = { content: text }
    }

    return selection.apiFormat === 'anthropic'
      ? parseAnthropicResponse<T>(raw)
      : normalizeLLMResponse<T>(raw)
  }

  // All retries exhausted
  throw new Error(
    `All ${maxRetries} retries exhausted. Last status: ${lastStatus}. Last error: ${lastError}`,
  )
}

// ── Model Selection ─────────────────────────────────────────

export async function selectRuntimeModel(
  activeWorkspace: string,
  preferredModelId?: number,
): Promise<RuntimeModelSelection | null> {
  const [providers, keys, models] = await Promise.all([
    readProviders(activeWorkspace),
    readKeys(activeWorkspace),
    readModels(activeWorkspace),
  ])

  console.log(`[provider-runtime] selectRuntimeModel: workspace=${activeWorkspace}, preferredModelId=${preferredModelId}`)
  console.log(`[provider-runtime] loaded: providers=${providers.length}, keys=${keys.length}, models=${models.length}`)

  const activeProviders = providers.filter(
    p => p.is_active !== false && p.service_type !== 'image',
  )
  const activeKeys = keys.filter(k => k.is_active !== false && k.key)

  // ── Model Selection ──────────────────────────────────────
  // Priority: preferredModelId (ignore health) → non-disabled favorite → non-disabled[0] → ANY model
  let availableModels = models.filter(m => m.health_status !== 'disabled')
  if (availableModels.length === 0) {
    console.warn(`[provider-runtime] No non-disabled models, falling back to ALL (${models.length} total)`)
    console.log(`[provider-runtime] model health statuses: ${JSON.stringify(models.map(m => ({ id: m.id, name: m.model_name, health: m.health_status })))}`)
    availableModels = models
  }

  let model: ModelRecord | undefined

  // 1. Try exact preferredModelId — ignore health_status (user explicitly selected it)
  if (preferredModelId) {
    model = models.find(m => m.id === preferredModelId)
    if (model) {
      console.log(`[provider-runtime] Using preferred model: id=${model.id}, name=${model.model_name}, health=${model.health_status}`)
    }
  }

  // 2. Favorite among available
  if (!model) {
    model = availableModels.find(m => m.is_favorite)
    if (model) console.log(`[provider-runtime] Using favorite model: id=${model.id}, name=${model.model_name}`)
  }

  // 3. First available
  if (!model) {
    model = availableModels[0]
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
  let key = activeKeys.find(k => k.id === model.api_key_id)
    || activeKeys.find(k => k.provider === provider.id)
    || activeKeys[0]

  // Final fallback: use ANY key, even if inactive
  if (!key && keys.length > 0) {
    key = keys.find(k => k.provider === provider.id) || keys[0]
    console.warn(`[provider-runtime] Using non-active key as fallback: id=${key.id}`)
  }

  if (!key || !key.key) {
    console.error(`[provider-runtime] No API key found. activeKeys=${activeKeys.length}, allKeys=${keys.length}`)
    return null
  }

  const baseUrl = normalizeBaseUrl(provider.default_base_url)
  if (!baseUrl) {
    console.error(`[provider-runtime] Provider "${provider.id}" has no default_base_url: ${JSON.stringify(provider)}`)
    return null
  }

  console.log(
    `[provider-runtime] ✅ Selected: model=${model.model_name} provider=${provider.id} baseUrl=${baseUrl} key=${(key.key || '').slice(0, 8)}...`,
  )

  return {
    provider,
    key,
    model,
    baseUrl,
    endpoint: endpointForProvider(provider),
    apiFormat: provider.api_format || 'openai',
  }
}

// ── Endpoint Resolution ─────────────────────────────────────

function endpointForProvider(provider: ProviderRecord): string {
  const endpoints = provider.endpoints || {}
  if (endpoints.chat) return endpoints.chat
  if (endpoints.completions) return endpoints.completions
  if (provider.api_format === 'anthropic') return 'messages'
  return 'chat/completions'
}

// ── Main Entry Point ────────────────────────────────────────

export async function executeWithRuntimeModel<T = any>(
  activeWorkspace: string,
  request: LLMRequest,
  preferredModelId?: number,
): Promise<LLMResponse<T> & { runtimeSelection?: RuntimeModelSelection | null }> {
  const selection = await selectRuntimeModel(activeWorkspace, preferredModelId)
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

  try {
    const response = await postProviderJson<T>(selection, request)
    return { ...response, runtimeSelection: selection }
  } catch (error) {
    console.error(`[provider-runtime] Request failed: ${error}`)
    return {
      content: '',
      parsed: null,
      raw: null,
      tool_calls: [],
      finish_reason: 'error',
      error: String(error),
      runtimeSelection: selection,
    }
  }
}

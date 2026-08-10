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

import type {
  RuntimeExecutionOptions,
  RuntimeModelSelection,
  RuntimeModelSelectionOptions,
  RuntimeRoutingStrategy,
} from './provider-runtime-support'
import {
  GEMINI_NATIVE_BASE_URL,
  bodyTextFromProviderError,
  buildHeaders,
  buildProviderRequestBody,
  buildUrl,
  describeFetchError,
  describeProviderRequestContext,
  headersForOpenAIResponsesSdk,
  isClaudeCodeFormat,
  isCodexResponsesFormat,
  isGeminiNativeFormat,
  isRetryable,
  keyHasUsableQuota,
  normalizeBaseUrl,
  normalizeRoutingStrategy,
  openAIResponsesSdkBaseUrl,
  rankModelsByBalancedKey,
  recordRuntimeKeyMetrics,
  requestWithLocalAssetDataUris,
  resolveProviderRequestTransportPlan,
  runtimeRequestCanceledError,
  sanitizeRuntimeSelection,
  shouldUseOpenAIResponsesSdk,
  sortRuntimeKeys,
  statusFromProviderError,
  summarizeProviderRequestBodyForLog,
} from './provider-runtime-support'
import {
  effectiveApiFormat,
  endpointForProvider,
  endpointForRoute,
  firstUsableRouteConfig,
  normalizeGeminiModelName,
  pollAsyncProviderTask,
  routeConfigForProvider,
  selectionForRequestRoute,
  waitForPollInterval,
} from './provider-runtime-endpoint'
import {
  parseProviderResponsePayload,
  readProviderStream,
} from './provider-runtime-stream'
import { isMultiReferenceTransportError } from './multi-reference-transport'

export type {
  RuntimeExecutionOptions,
  RuntimeModelSelection,
  RuntimeModelSelectionOptions,
  RuntimeRoutingStrategy,
} from './provider-runtime-support'

export {
  GEMINI_NATIVE_BASE_URL,
  bodyTextFromProviderError,
  buildHeaders,
  buildProviderRequestBody,
  buildUrl,
  describeFetchError,
  describeProviderRequestContext,
  headersForOpenAIResponsesSdk,
  isClaudeCodeFormat,
  isCodexResponsesFormat,
  isGeminiNativeFormat,
  isRetryable,
  keyHasUsableQuota,
  normalizeBaseUrl,
  normalizeRoutingStrategy,
  openAIResponsesSdkBaseUrl,
  rankModelsByBalancedKey,
  recordRuntimeKeyMetrics,
  requestWithLocalAssetDataUris,
  runtimeRequestCanceledError,
  sanitizeRuntimeSelection,
  shouldUseOpenAIResponsesSdk,
  sortRuntimeKeys,
  statusFromProviderError,
  summarizeProviderRequestBodyForLog,
} from './provider-runtime-support'
export {
  effectiveApiFormat,
  endpointForProvider,
  endpointForRoute,
  firstUsableRouteConfig,
  normalizeGeminiModelName,
  pollAsyncProviderTask,
  routeConfigForProvider,
  selectionForRequestRoute,
  waitForPollInterval,
} from './provider-runtime-endpoint'
export {
  parseProviderResponsePayload,
  readProviderStream,
} from './provider-runtime-stream'

async function postProviderJson<T = any>(
  selection: RuntimeModelSelection,
  request: LLMRequest,
  options: RuntimeExecutionOptions = {},
): Promise<LLMResponse<T>> {
  const routedSelection = preflightSelectedRuntimeRequestTransport(selection, request)
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
  // Cloudflare 524 burns ~2min per attempt; cap retries so expand/draft can fall back quickly.
  let cloudflare524Attempts = 0
  const maxCloudflare524Attempts = 2

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

      if (response.status === 524) {
        cloudflare524Attempts += 1
        if (cloudflare524Attempts >= maxCloudflare524Attempts) {
          throw new Error(`${errorMsg} (cloudflare_524_retry_cap=${maxCloudflare524Attempts})`)
        }
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

export function preflightSelectedRuntimeRequestTransport(
  selection: RuntimeModelSelection,
  request: LLMRequest,
): RuntimeModelSelection {
  const routedSelection = selectionForRequestRoute(selection, request)
  resolveProviderRequestTransportPlan(request, routedSelection)
  return routedSelection
}

export async function preflightRuntimeRequestTransport(
  activeWorkspace: string,
  request: LLMRequest,
  preferredModelId?: number,
  options: RuntimeModelSelectionOptions = {},
): Promise<RuntimeModelSelection | null> {
  const selection = await selectRuntimeModel(activeWorkspace, preferredModelId, {
    routingStrategy: options.routingStrategy || (request as any).routingStrategy || (request as any).routing_strategy,
  })
  if (!selection) return null
  return preflightSelectedRuntimeRequestTransport(selection, request)
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

  // Multi-reference capability errors are request-shape failures, not provider
  // execution failures. Preserve their typed contract and avoid local asset
  // conversion or key failure metrics before rejecting them.
  const preflightSelection = preflightSelectedRuntimeRequestTransport(selection, request)
  const startedAt = Date.now()
  try {
    const normalizedRequest = await requestWithLocalAssetDataUris(activeWorkspace, request)
    const response = await postProviderJson<T>(preflightSelection, normalizedRequest, options)
    await recordRuntimeKeyMetrics(activeWorkspace, selection.key.id, startedAt, true)
    return { ...response, runtimeSelection: sanitizeRuntimeSelection(selection) as any }
  } catch (error) {
    if (isMultiReferenceTransportError(error)) throw error
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

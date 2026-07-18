import type { LLMRequest, LLMResponse } from './types'
import { buildCodexResponsesBody } from './codex-responses'
import type { APIKeyRecord } from '../key-store'
import type { ModelRecord } from '../model-store'
import type { ProviderRecord } from '../provider-store'
import {
  applyClaudeCodeAuthHeaders,
  applyClaudeCodeBodyMetadata,
  applyClaudeCodeHeaders,
} from './anthropic-context'
import {
  mergeHeadersCaseInsensitive,
  modelCustomHeaders,
} from './model-runtime-overrides'

export {
  type NovelLLMAdapter,
  normalizeToolCalls,
  parseStructuredContent,
  normalizeLLMResponse,
  classifyLLMError,
} from './adapter-support'

import {
  type NovelLLMAdapter,
  normalizeLLMResponse,
  classifyLLMError,
  normalizeToolCallsFromResponse,
  normalizeResponsesPayload,
  isResponsesPayload,
  buildOpenAIChatBody,
  isMediaRouteType,
  buildOpenAIMediaBody,
  buildOpenAIResponsesBody,
  buildAnthropicMessagesBody,
  buildGeminiGenerateContentBody,
  normalizeGeminiGenerateContentPayload,
  isGeminiNativeFormat,
  effectiveApiFormat,
  isClaudeCodeFormat,
  applyProviderAuth,
  postJson,
  shouldUseOpenAIResponsesSdk,
  postOpenAIResponsesViaSdk,
  normalizeBaseUrl,
  routeDslValue,
  requestRouteType,
  selectProviderRoute,
  resolveProviderEndpoint,
  getValueByPathFromEnvelopes,
  extractMediaContent,
  normalizeExtractedMediaContent,
  pollConfiguredTask,
  buildConfiguredRouteBody,
  shouldStreamConfiguredRequest,
} from './adapter-support'

export class ConfiguredProviderAdapter implements NovelLLMAdapter {
  name: string
  constructor(private provider: ProviderRecord, private apiKey: APIKeyRecord, private model: ModelRecord) {
    this.name = `configured:${provider.id}:${model.model_name}`
  }

  async execute<T = any>(request: LLMRequest): Promise<LLMResponse<T>> {
    const routeConfig = selectProviderRoute(this.provider, request, this.model)
    const routeType = requestRouteType(request, this.model)
    const effectiveBaseUrl = normalizeBaseUrl(this.apiKey.base_url || this.provider.default_base_url || '')
    const modelRequest = { ...request, model: this.model.model_name || request.model }
    const providerFormat = effectiveApiFormat(this.provider, this.model)
    const endpoint = resolveProviderEndpoint(this.provider, routeConfig, effectiveBaseUrl, routeType, modelRequest.model, providerFormat)
    if (!endpoint) throw new Error(`provider ${this.provider.id} missing endpoint`)
    const isAnthropic = isClaudeCodeFormat(providerFormat)
    const isCodex = providerFormat.includes('codex')
    const isResponses = providerFormat.includes('responses')
    const isGeminiNative = isGeminiNativeFormat(providerFormat)
    const shouldStream = shouldStreamConfiguredRequest(modelRequest, this.provider, this.model)
    const body = buildConfiguredRouteBody(routeConfig, modelRequest, () => isCodex
      ? buildCodexResponsesBody(modelRequest, this.model.model_name || request.model, shouldStream, {
        baseUrl: effectiveBaseUrl,
        reasoning: this.model.context_ui_params?.reasoning,
        reasoningEffort: this.model.context_ui_params?.reasoning_effort ?? this.model.context_ui_params?.model_reasoning_effort,
      })
      : isResponses ? buildOpenAIResponsesBody(modelRequest) : (isGeminiNative ? buildGeminiGenerateContentBody(modelRequest) : (isAnthropic ? buildAnthropicMessagesBody(modelRequest, this.model, this.provider, effectiveBaseUrl) : (isMediaRouteType(routeType) ? buildOpenAIMediaBody(modelRequest) : buildOpenAIChatBody(modelRequest)))))
    if (isAnthropic && shouldStream) body.stream = true
    const headers: Record<string, string> = {}
    mergeHeadersCaseInsensitive(headers, this.provider.custom_headers || {})
    const routeHeaders = routeDslValue(routeConfig, 'headers', 'customHeaders')
    mergeHeadersCaseInsensitive(headers, routeHeaders)
    mergeHeadersCaseInsensitive(headers, modelCustomHeaders(this.model))
    applyProviderAuth(headers, this.provider, this.apiKey.key, providerFormat, effectiveBaseUrl)
    if (isAnthropic) {
      applyClaudeCodeHeaders(headers, this.model, { provider: this.provider, baseUrl: effectiveBaseUrl })
      if (providerFormat === 'claude_code') {
        applyClaudeCodeBodyMetadata(body, this.model, {
          provider: this.provider,
          baseUrl: effectiveBaseUrl,
        })
      }
      applyClaudeCodeAuthHeaders(headers, this.apiKey.key, this.provider.auth_type, this.model, {
        provider: this.provider,
        baseUrl: effectiveBaseUrl,
      })
    }
    const initialRaw = shouldUseOpenAIResponsesSdk(providerFormat, routeConfig, this.provider, endpoint)
      ? await postOpenAIResponsesViaSdk(endpoint, body, this.apiKey.key, headers, effectiveBaseUrl)
      : await postJson(endpoint, body, undefined, headers)
    const raw = await pollConfiguredTask(this.provider, endpoint, routeConfig, initialRaw, headers, effectiveBaseUrl)
    if (isGeminiNative) return normalizeToolCallsFromResponse(normalizeLLMResponse<T>(normalizeGeminiGenerateContentPayload(raw)))
    const resultExtractor = routeDslValue(routeConfig, 'result_extractor', 'resultExtractor')
    if (resultExtractor) {
      const extracted = getValueByPathFromEnvelopes(raw, String(resultExtractor))
      const extractedContent = typeof extracted === 'string' ? extracted : JSON.stringify(extracted ?? '')
      const content = isMediaRouteType(routeType) ? normalizeExtractedMediaContent(extractedContent) : extractedContent
      return normalizeToolCallsFromResponse(normalizeLLMResponse<T>({ content, raw_response: raw }))
    }
    if (isMediaRouteType(routeType)) {
      const content = extractMediaContent(raw)
      if (content) return normalizeToolCallsFromResponse(normalizeLLMResponse<T>({ content, raw_response: raw }))
    }
    return isResponsesPayload(raw) ? normalizeToolCallsFromResponse(normalizeLLMResponse<T>(normalizeResponsesPayload(raw))) : normalizeToolCallsFromResponse(normalizeLLMResponse<T>(raw))
  }
}

abstract class BaseCompatibleAdapter implements NovelLLMAdapter {
  abstract name: string
  abstract endpointEnv: string
  protected apiKeyEnv?: string
  protected endpointPath = 'chat/completions'
  protected buildRequestBody(request: LLMRequest): any { return buildOpenAIChatBody(request) }
  protected headersExtra(): Record<string, string> { return {} }

  protected async executeViaEndpoint<T = any>(request: LLMRequest): Promise<LLMResponse<T>> {
    const endpoint = process.env[this.endpointEnv]
    if (!endpoint) return normalizeLLMResponse<T>({ content: '', tool_calls: [], usage: {}, finish_reason: 'stop', parsed: null })
    const apiKey = this.apiKeyEnv ? process.env[this.apiKeyEnv] : undefined
    const url = `${endpoint.replace(/\/$/, '')}/${this.endpointPath.replace(/^\//, '')}`
    try {
      const raw = await postJson(url, this.buildRequestBody(request), apiKey, this.headersExtra())
      return normalizeToolCallsFromResponse(normalizeLLMResponse<T>(raw))
    } catch (error) {
      const kind = classifyLLMError(error)
      if (kind === 'parse_error') return normalizeLLMResponse<T>({ content: '', tool_calls: [], usage: {}, finish_reason: 'error', parsed: null, error: String(error) })
      throw error
    }
  }

  async execute<T = any>(request: LLMRequest): Promise<LLMResponse<T>> { return await this.executeViaEndpoint<T>(request) }
}

function getFirstEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]
    if (value && value.trim()) return value
  }
  return ''
}

export class OpenAICompatibleAdapter extends BaseCompatibleAdapter {
  name = 'openai-compatible'
  endpointEnv = 'LLM_OPENAI_ENDPOINT'
  protected endpointPath = 'responses'
}

export class QwenCompatibleAdapter extends BaseCompatibleAdapter {
  name = 'qwen-compatible'
  endpointEnv = 'LLM_QWEN_ENDPOINT'
  protected endpointPath = 'responses'
}

export class AnthropicCompatibleAdapter extends BaseCompatibleAdapter {
  name = 'anthropic-compatible'
  endpointEnv = 'ANTHROPIC_BASE_URL'
  apiKeyEnv = 'ANTHROPIC_AUTH_TOKEN'
  endpointPath = 'v1/messages'

  protected buildRequestBody(request: LLMRequest) { return buildAnthropicMessagesBody(request) }
  protected headersExtra(): Record<string, string> { return { 'anthropic-version': '2023-06-01' } }
}

export class CustomOpenAICompatibleAdapter extends BaseCompatibleAdapter {
  name = 'custom-openai-compatible'
  endpointEnv = 'LLM_CUSTOM_ENDPOINT'
  apiKeyEnv = 'LLM_CUSTOM_API_KEY'
  protected endpointPath = 'responses'

  protected buildRequestBody(request: LLMRequest) { return buildOpenAIResponsesBody(request) }
}

// Backward-compatible aliases while migration finishes.
export class ClaudeCompatibleAdapter extends AnthropicCompatibleAdapter { name = 'claude-compatible' }
export class GeminiCompatibleAdapter extends OpenAICompatibleAdapter { name = 'gemini-compatible' }
export class LocalCompatibleAdapter extends CustomOpenAICompatibleAdapter {
  name = 'cliproxyapi'
  protected async executeViaEndpoint<T = any>(request: LLMRequest): Promise<LLMResponse<T>> {
    const endpoint = getFirstEnv('LLM_LOCAL_ENDPOINT', 'LLM_CUSTOM_ENDPOINT', 'LLM_OPENAI_ENDPOINT')
    if (!endpoint) return normalizeLLMResponse<T>({ content: '', tool_calls: [], usage: {}, finish_reason: 'stop', parsed: null })
    const apiKey = getFirstEnv('LLM_LOCAL_API_KEY', 'LLM_CUSTOM_API_KEY')
    const url = `${endpoint.replace(/\/$/, '')}/${this.endpointPath.replace(/^\//, '')}`
    try {
      const raw = await postJson(url, this.buildRequestBody(request), apiKey, this.headersExtra())
      return normalizeToolCallsFromResponse(normalizeLLMResponse<T>(raw))
    } catch (error) {
      const kind = classifyLLMError(error)
      if (kind === 'parse_error') return normalizeLLMResponse<T>({ content: '', tool_calls: [], usage: {}, finish_reason: 'error', parsed: null, error: String(error) })
      throw error
    }
  }
}
export class AnthropicProxyAdapter extends AnthropicCompatibleAdapter { name = 'anthropic-proxy' }


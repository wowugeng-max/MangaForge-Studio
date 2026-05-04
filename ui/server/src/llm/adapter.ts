import type { LLMRequest, LLMResponse, LLMToolCall } from './types'
import type { APIKeyRecord } from '../key-store'
import type { ModelRecord } from '../model-store'
import type { ProviderRecord } from '../provider-store'

export interface NovelLLMAdapter {
  name: string
  execute<T = any>(request: LLMRequest): Promise<LLMResponse<T>>
}

export function normalizeToolCalls(rawToolCalls: any[]): LLMToolCall[] {
  return (rawToolCalls || []).map((item, index) => {
    const rawArgs = item.arguments ?? item.function?.arguments ?? {}
    let parsedArgs: Record<string, any> = {}
    if (typeof rawArgs === 'string') {
      try { parsedArgs = JSON.parse(rawArgs) } catch { parsedArgs = { _raw: rawArgs } }
    } else if (rawArgs && typeof rawArgs === 'object') {
      parsedArgs = rawArgs
    }
    return {
      id: String(item.id || item.tool_call_id || `${index}`),
      name: String(item.name || item.function?.name || ''),
      arguments: parsedArgs,
    }
  })
}

function tryParseJson(content: string) {
  try { return JSON.parse(content) } catch {
    const match = content.match(/```json\s*([\s\S]*?)\s*```/i)
    if (match) {
      try { return JSON.parse(match[1]) } catch { return null }
    }
    return null
  }
}

export function parseStructuredContent<T = any>(content: string, parsed?: T) {
  if (parsed && typeof parsed === 'object') return parsed
  const json = tryParseJson(content)
  return json || (parsed as T) || null
}

export function normalizeLLMResponse<T = any>(raw: any) {
  const content = String(raw?.content || raw?.message?.content || raw?.choices?.[0]?.message?.content || raw?.choices?.[0]?.text || '')
  const rawToolCalls = raw?.tool_calls || raw?.message?.tool_calls || raw?.choices?.[0]?.message?.tool_calls || []
  const choice = raw?.choices?.[0]?.message || raw?.choices?.[0]
  const contentText = String(raw?.content || raw?.message?.content || choice?.content || choice?.text || '')
  const parsed = parseStructuredContent<T>(contentText, raw?.parsed || choice?.parsed)
  return {
    content: contentText,
    tool_calls: normalizeToolCalls(rawToolCalls),
    usage: raw?.usage ? { input_tokens: raw.usage.input_tokens ?? raw.usage.prompt_tokens, output_tokens: raw.usage.output_tokens ?? raw.usage.completion_tokens, total_tokens: raw.usage.total_tokens ?? (raw.usage.prompt_tokens || 0) + (raw.usage.completion_tokens || 0) } : undefined,
    finish_reason: raw?.finish_reason || raw?.stop_reason || raw?.choices?.[0]?.finish_reason || undefined,
    raw,
    parsed,
  }
}

export function classifyLLMError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes('timeout')) return 'timeout'
    if (message.includes('401') || message.includes('403') || message.includes('auth')) return 'auth'
    if (message.includes('429') || message.includes('rate limit')) return 'rate_limit'
    if (message.includes('fetch') || message.includes('network') || message.includes('econnreset')) return 'network'
    if (message.includes('json') || message.includes('parse')) return 'parse_error'
  }
  return 'unknown'
}

function normalizeLLMRequest(request: LLMRequest): LLMRequest {
  return {
    model: String(request.model || 'balanced'),
    messages: Array.isArray(request.messages) ? request.messages : [],
    temperature: typeof request.temperature === 'number' ? request.temperature : 0.3,
    max_tokens: typeof request.max_tokens === 'number' ? request.max_tokens : 4096,
    tools: Array.isArray(request.tools) ? request.tools : [],
    tool_choice: request.tool_choice || 'auto',
    response_format: request.response_format || 'json',
    metadata: request.metadata && typeof request.metadata === 'object' ? request.metadata : {},
  }
}

function normalizeToolCallsFromResponse<T = any>(response: LLMResponse<T>): LLMResponse<T> {
  return { ...response, tool_calls: normalizeToolCalls(response.tool_calls || []) }
}

function normalizeResponsesPayload(raw: any) {
  const output = Array.isArray(raw?.output) ? raw.output : []
  const text = output
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .map((part: any) => String(part?.text || part?.content || ''))
    .filter(Boolean)
    .join('\n')
  const tool_calls = output
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .filter((part: any) => part?.type === 'tool_call' || part?.type === 'function_call')
    .map((part: any, index: number) => ({ id: String(part?.id || `${index}`), name: String(part?.name || part?.function?.name || ''), arguments: part?.arguments || part?.function?.arguments || {} }))
  const choice = raw?.output_text || text || raw?.content || ''
  return { content: choice, tool_calls, parsed: raw?.parsed || null, usage: raw?.usage, finish_reason: raw?.status || raw?.finish_reason || undefined, raw }
}

function isResponsesPayload(raw: any) {
  return Boolean(raw && (Array.isArray(raw?.output) || raw?.output_text || raw?.type === 'response' || raw?.response?.output))
}

function buildOpenAIChatBody(request: LLMRequest) {
  const normalized = normalizeLLMRequest(request)
  const body: Record<string, any> = { model: normalized.model, messages: normalized.messages, temperature: normalized.temperature, max_tokens: normalized.max_tokens }
  if (normalized.tools?.length) {
    body.tools = normalized.tools.map(tool => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.input_schema } }))
    body.tool_choice = normalized.tool_choice
  }
  if (normalized.response_format) {
    body.response_format = typeof normalized.response_format === 'object' && normalized.response_format.type === 'json_schema'
      ? { type: 'json_object' }
      : normalized.response_format
  }
  return body
}

function buildOpenAIResponsesBody(request: LLMRequest) {
  const normalized = normalizeLLMRequest(request)
  const body: Record<string, any> = { model: normalized.model, input: normalized.messages.map(msg => ({ role: msg.role, content: msg.content })), temperature: normalized.temperature, max_output_tokens: normalized.max_tokens }
  if (normalized.tools?.length) {
    body.tools = normalized.tools.map(tool => ({ type: 'function', name: tool.name, description: tool.description, parameters: tool.input_schema }))
    body.tool_choice = normalized.tool_choice
  }
  if (normalized.response_format) body.text = { format: { type: 'json_object' } }
  return body
}

function buildAnthropicMessagesBody(request: LLMRequest) {
  const normalized = normalizeLLMRequest(request)
  const body: Record<string, any> = { model: normalized.model, max_tokens: normalized.max_tokens, messages: normalized.messages.map(msg => ({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content })), temperature: normalized.temperature }
  if (normalized.tools?.length) body.tools = normalized.tools.map(tool => ({ name: tool.name, description: tool.description, input_schema: tool.input_schema }))
  if (normalized.tool_choice) body.tool_choice = normalized.tool_choice
  return body
}

function applyProviderAuth(headers: Record<string, string>, provider: ProviderRecord, apiKey?: string) {
  const key = String(apiKey || '').trim()
  if (!key || String(provider.auth_type || 'bearer').toLowerCase() === 'none') return headers
  const authType = String(provider.auth_type || 'bearer').toLowerCase()
  if (authType === 'x-api-key' || authType === 'api-key') headers['x-api-key'] = key
  else headers.Authorization = key.toLowerCase().startsWith('bearer ') ? key : `Bearer ${key}`
  return headers
}

async function postJson(url: string, body: any, apiKey?: string, headersExtra: Record<string, string> = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...headersExtra }
  if (apiKey) headers.Authorization = apiKey.toLowerCase().startsWith('bearer ') ? apiKey : `Bearer ${apiKey}`
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  const text = await response.text()
  if (!response.ok) throw new Error(`LLM request failed with status ${response.status}: ${text}`)
  try { return JSON.parse(text) } catch { return { content: text } }
}

function normalizeBaseUrl(url?: string) {
  return String(url || '').replace(/\/$/, '')
}

function resolveProviderEndpoint(provider: ProviderRecord) {
  const endpoints = provider.endpoints || {}
  const explicit = endpoints.responses || endpoints.chat || endpoints.completions || endpoints.llm || ''
  const base = normalizeBaseUrl(explicit || provider.default_base_url || '')
  if (!base) return ''
  if (/\/(chat\/completions|responses|messages|generate)$/.test(base)) return base
  const hasV1 = /\/v1$/.test(base)
  if (String(provider.api_format || '').toLowerCase().includes('anthropic')) return hasV1 ? `${base}/messages` : `${base}/v1/messages`
  return hasV1 ? `${base}/responses` : `${base}/v1/responses`
}

export class ConfiguredProviderAdapter implements NovelLLMAdapter {
  name: string
  constructor(private provider: ProviderRecord, private apiKey: APIKeyRecord, private model: ModelRecord) {
    this.name = `configured:${provider.id}:${model.model_name}`
  }

  async execute<T = any>(request: LLMRequest): Promise<LLMResponse<T>> {
    const endpoint = resolveProviderEndpoint(this.provider)
    if (!endpoint) throw new Error(`provider ${this.provider.id} missing endpoint`)
    const modelRequest = { ...request, model: this.model.model_name || request.model }
    const providerFormat = String(this.provider.api_format || '').toLowerCase()
    const isAnthropic = providerFormat.includes('anthropic')
    const isResponses = providerFormat.includes('responses') || providerFormat.includes('openai_compatible') || providerFormat.includes('openai-compatible') || providerFormat.includes('gpt')
    const body = isResponses ? buildOpenAIResponsesBody(modelRequest) : (isAnthropic ? buildAnthropicMessagesBody(modelRequest) : buildOpenAIChatBody(modelRequest))
    const headers = applyProviderAuth({ ...(this.provider.custom_headers || {}) }, this.provider, this.apiKey.key)
    if (isAnthropic && !headers['anthropic-version']) headers['anthropic-version'] = '2023-06-01'
    const raw = await postJson(endpoint, body, undefined, headers)
    return isResponsesPayload(raw) ? normalizeToolCallsFromResponse(normalizeLLMResponse<T>(normalizeResponsesPayload(raw))) : normalizeToolCallsFromResponse(normalizeLLMResponse<T>(raw))
  }
}

abstract class BaseCompatibleAdapter implements NovelLLMAdapter {
  abstract name: string
  abstract endpointEnv: string
  protected apiKeyEnv?: string
  protected endpointPath = 'responses'
  protected buildRequestBody(request: LLMRequest): any { return buildOpenAIResponsesBody(request) }
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

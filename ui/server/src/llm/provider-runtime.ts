import { readKeys, type APIKeyRecord } from '../key-store'
import { readModels, type ModelRecord } from '../model-store'
import { readProviders, type ProviderRecord } from '../provider-store'
import type { LLMRequest, LLMResponse } from './types'
import { normalizeLLMResponse } from './adapter'

export type RuntimeModelSelection = {
  provider: ProviderRecord
  key: APIKeyRecord
  model: ModelRecord
  baseUrl: string
  endpoint: string
  apiFormat: string
}

function normalizeBaseUrl(url?: string) {
  return String(url || '').replace(/\/$/, '')
}

function endpointForProvider(provider: ProviderRecord) {
  const endpoints = provider.endpoints || {}
  if (endpoints.chat) return endpoints.chat
  if (endpoints.completions) return endpoints.completions
  if (provider.api_format === 'anthropic') return '/v1/messages'
  return '/v1/chat/completions'
}

function joinUrl(baseUrl: string, endpoint: string) {
  if (/^https?:\/\//i.test(endpoint)) return endpoint
  return `${normalizeBaseUrl(baseUrl)}/${String(endpoint || '').replace(/^\//, '')}`
}

function buildHeaders(selection: RuntimeModelSelection) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(selection.provider.custom_headers || {}),
  }
  if (selection.key.key) {
    if (selection.provider.auth_type === 'x-api-key') headers['x-api-key'] = selection.key.key
    else headers.Authorization = `Bearer ${selection.key.key}`
  }
  if (selection.apiFormat === 'anthropic' && !headers['anthropic-version']) headers['anthropic-version'] = '2023-06-01'
  return headers
}

function toOpenAIBody(request: LLMRequest, selection: RuntimeModelSelection) {
  const body: Record<string, any> = {
    model: selection.model.model_name || request.model,
    messages: request.messages,
    temperature: request.temperature ?? 0.3,
    max_tokens: request.max_tokens ?? 4096,
  }
  if (request.response_format && request.response_format !== 'text') body.response_format = request.response_format
  if (request.tools?.length) body.tools = request.tools
  if (request.tool_choice && request.tool_choice !== 'none') body.tool_choice = request.tool_choice
  return body
}

function toAnthropicBody(request: LLMRequest, selection: RuntimeModelSelection) {
  const system = request.messages.find(message => message.role === 'system')?.content
  const messages = request.messages
    .filter(message => message.role !== 'system')
    .map(message => ({ role: message.role === 'assistant' ? 'assistant' : 'user', content: message.content }))
  const body: Record<string, any> = {
    model: selection.model.model_name || request.model,
    messages,
    temperature: request.temperature ?? 0.3,
    max_tokens: request.max_tokens ?? 4096,
  }
  if (system) body.system = system
  if (request.tools?.length) body.tools = request.tools.map(tool => ({ name: tool.name, description: tool.description, input_schema: tool.input_schema }))
  return body
}

function parseAnthropicResponse<T = any>(raw: any): LLMResponse<T> {
  const text = Array.isArray(raw?.content)
    ? raw.content.map((item: any) => item?.text || '').join('\n')
    : String(raw?.content || '')
  return normalizeLLMResponse<T>({ ...raw, content: text })
}

async function postProviderJson<T = any>(selection: RuntimeModelSelection, request: LLMRequest): Promise<LLMResponse<T>> {
  const url = joinUrl(selection.baseUrl, selection.endpoint)
  const body = selection.apiFormat === 'anthropic' ? toAnthropicBody(request, selection) : toOpenAIBody(request, selection)
  const response = await fetch(url, { method: 'POST', headers: buildHeaders(selection), body: JSON.stringify(body) })
  const text = await response.text()
  if (!response.ok) throw new Error(`Provider request failed ${response.status}: ${text}`)
  let raw: any
  try { raw = JSON.parse(text) } catch { raw = { content: text } }
  return selection.apiFormat === 'anthropic' ? parseAnthropicResponse<T>(raw) : normalizeLLMResponse<T>(raw)
}

export async function selectRuntimeModel(activeWorkspace: string, preferredModelId?: number): Promise<RuntimeModelSelection | null> {
  const [providers, keys, models] = await Promise.all([
    readProviders(activeWorkspace),
    readKeys(activeWorkspace),
    readModels(activeWorkspace),
  ])
  const activeProviders = providers.filter(provider => provider.is_active !== false && provider.service_type !== 'image')
  const activeKeys = keys.filter(key => key.is_active !== false && key.key)
  const availableModels = models.filter(model => model.health_status !== 'disabled')
  const model = preferredModelId
    ? availableModels.find(item => item.id === preferredModelId)
    : availableModels.find(item => item.is_favorite) || availableModels[0]
  if (!model) return null
  const provider = activeProviders.find(item => item.id === model.provider) || activeProviders.find(item => item.id === String(model.provider))
  if (!provider) return null
  const key = activeKeys.find(item => item.id === model.api_key_id) || activeKeys.find(item => item.provider === provider.id)
  if (!key) return null
  const baseUrl = normalizeBaseUrl(provider.default_base_url)
  if (!baseUrl) return null
  return {
    provider,
    key,
    model,
    baseUrl,
    endpoint: endpointForProvider(provider),
    apiFormat: provider.api_format || 'openai',
  }
}

export async function executeWithRuntimeModel<T = any>(activeWorkspace: string, request: LLMRequest, preferredModelId?: number): Promise<LLMResponse<T> & { runtimeSelection?: RuntimeModelSelection | null }> {
  const selection = await selectRuntimeModel(activeWorkspace, preferredModelId)
  if (!selection) return { content: '', parsed: null, raw: null, tool_calls: [], finish_reason: 'error', error: 'no_runtime_model_configured', runtimeSelection: null }
  const response = await postProviderJson<T>(selection, request)
  return { ...response, runtimeSelection: selection }
}

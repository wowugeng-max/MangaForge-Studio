import { imageUrlFromLLMContentPart, stringifyLLMMessageContent, stringifyLLMMessageTextContent, textFromLLMContentPart, type LLMRequest, type LLMResponse, type LLMToolCall } from './types'
import { buildCodexResponsesBody } from './codex-responses'
import { applyClaudeCodeBodyMetadata, applyClaudeCodeHeaders, stripAnthropicLocal1mMarker } from './anthropic-context'
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
  const content = String(contentTextFromProviderValue(raw?.content || raw?.message?.content || raw?.choices?.[0]?.message?.content || raw?.choices?.[0]?.text) || '')
  const rawToolCalls = raw?.tool_calls || raw?.message?.tool_calls || raw?.choices?.[0]?.message?.tool_calls || []
  const choice = raw?.choices?.[0]?.message || raw?.choices?.[0]
  const contentText = String(contentTextFromProviderValue(raw?.content || raw?.message?.content || choice?.content || choice?.text) || '')
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

function contentTextFromProviderValue(value: any): string {
  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          if (typeof item.text === 'string') return item.text
          if (typeof item.content === 'string') return item.content
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  if (value === undefined || value === null) return ''
  return String(value)
}

export function classifyLLMError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes('timeout')) return 'timeout'
    if (message.includes('401') || message.includes('403') || message.includes('auth')) return 'auth'
    if (message.includes('429') || message.includes('rate limit')) return 'rate_limit'
    if (message.includes('fetch') || message.includes('network') || message.includes('econnreset') || message.includes('econnrefused') || message.includes('connectionrefused') || message.includes('connection refused') || message.includes('socket')) return 'network'
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
  ])
  for (const [key, value] of Object.entries(request as any)) {
    if (value === undefined || value === null) continue
    if (passthroughBlocked.has(key)) continue
    body[key] = value
  }
  return body
}

function isMediaRouteType(routeType?: string) {
  return ['image', 'video', 'text_to_image', 'image_to_image', 'text_to_video', 'image_to_video'].includes(String(routeType || ''))
}

function buildOpenAIMediaBody(request: LLMRequest) {
  const normalized = normalizeLLMRequest(request)
  const body: Record<string, any> = {
    model: normalized.model,
    prompt: (request as any).prompt || textPromptFromMessages(normalized.messages),
  }
  if ((request as any).image_url) body.image_url = (request as any).image_url
  for (const [key, value] of Object.entries(request as any)) {
    if (value === undefined || value === null) continue
    if (['model', 'messages', 'prompt', 'type', 'mode', 'task_type', 'image_url', 'response_format', 'tools', 'tool_choice', 'metadata', 'stream', 'response_mode'].includes(key)) continue
    body[key] = value
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
  if (normalized.response_format && normalized.response_format !== 'text') body.text = { format: { type: 'json_object' } }
  return body
}

function buildAnthropicMessagesBody(request: LLMRequest) {
  const normalized = normalizeLLMRequest(request)
  const systemMsg = normalized.messages.find(m => m.role === 'system')
  const body: Record<string, any> = { model: stripAnthropicLocal1mMarker(normalized.model), max_tokens: normalized.max_tokens, temperature: normalized.temperature }
  // Anthropic requires 'system' as a top-level field, NOT in messages array
  if (systemMsg?.content) body.system = stringifyLLMMessageContent(systemMsg.content)
  const nonSystemMessages = normalized.messages.filter(m => m.role !== 'system')
  body.messages = nonSystemMessages.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : (msg.role === 'tool' ? 'assistant' : 'user'),
    content: msg.content,
  }))
  if (normalized.tools?.length) {
    body.tools = normalized.tools.map((tool: any) => ({ name: tool.name, description: tool.description, input_schema: tool.input_schema || tool.parameters || {} }))
    if (normalized.tool_choice === 'auto') body.tool_choice = { type: 'auto' }
  }
  return body
}

function buildGeminiGenerateContentBody(request: LLMRequest) {
  const normalized = normalizeLLMRequest(request)
  const systemText = normalized.messages
    .filter(message => message.role === 'system')
    .map(message => stringifyLLMMessageContent(message.content))
    .filter(Boolean)
    .join('\n')
  const contents = normalized.messages
    .filter(message => message.role !== 'system')
    .map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: geminiPartsFromMessageContent(message.content),
    }))
  const body: Record<string, any> = {
    contents: contents.length ? contents : [{ role: 'user', parts: [{ text: promptFromMessages(normalized.messages) }] }],
    generationConfig: {
      temperature: normalized.temperature,
      maxOutputTokens: normalized.max_tokens,
    },
  }
  if (systemText) body.systemInstruction = { parts: [{ text: systemText }] }
  return body
}

function normalizeGeminiGenerateContentPayload(raw: any) {
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
  return {
    content,
    usage,
    finish_reason: candidate?.finishReason || raw?.finishReason,
    raw,
  }
}

function isGeminiNativeFormat(apiFormat: string) {
  return String(apiFormat || '').toLowerCase() === 'gemini_native'
}

function isGeminiNativeProvider(provider: ProviderRecord) {
  return isGeminiNativeFormat(provider.api_format || '')
}

function effectiveApiFormat(provider: ProviderRecord, model?: ModelRecord) {
  return String(model?.api_format || provider.api_format || 'openai_compatible').toLowerCase()
}

function isClaudeCodeFormat(apiFormat: string) {
  const normalized = String(apiFormat || '').toLowerCase()
  return normalized === 'claude_code' || normalized.includes('anthropic')
}

function applyProviderAuth(headers: Record<string, string>, provider: ProviderRecord, apiKey?: string, apiFormat = provider.api_format) {
  const key = String(apiKey || '').trim()
  if (!key || String(provider.auth_type || 'bearer').toLowerCase() === 'none') return headers
  const authType = String(provider.auth_type || 'bearer').toLowerCase()
  if (isGeminiNativeFormat(apiFormat)) {
    headers['x-goog-api-key'] = key
    return headers
  }
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

async function getJson(url: string, headersExtra: Record<string, string> = {}) {
  const response = await fetch(url, { method: 'GET', headers: headersExtra })
  const text = await response.text()
  if (!response.ok) throw new Error(`LLM task poll failed with status ${response.status}: ${text}`)
  try { return JSON.parse(text) } catch { return { content: text } }
}

function normalizeBaseUrl(url?: string) {
  return String(url || '').replace(/\/$/, '')
}

function isRouteObject(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function routeDslValue(routeConfig: unknown, snakeKey: string, camelKey: string = snakeKey) {
  if (!isRouteObject(routeConfig)) return undefined
  return routeConfig[snakeKey] ?? routeConfig[camelKey]
}

function requestRouteType(request: LLMRequest, model?: ModelRecord) {
  const explicit = String((request as any).type || (request as any).mode || (request as any).task_type || '').trim()
  if (explicit) return explicit
  const capabilities = model?.capabilities || {}
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

function selectProviderRoute(provider: ProviderRecord, request?: LLMRequest, model?: ModelRecord) {
  const endpoints = provider.endpoints || {}
  const providerFormat = effectiveApiFormat(provider, model)
  if (isClaudeCodeFormat(providerFormat)) return endpoints.messages || endpoints.chat || endpoints.completions || endpoints.llm || ''
  if (!providerFormat.includes('responses') && !providerFormat.includes('codex')) {
    const routeType = request ? requestRouteType(request, model) : ''
    if (routeType && endpoints[routeType]) return routeConfigForModel(endpoints[routeType], model?.model_name || '')
    const broadType = routeType.includes('image') ? 'image' : routeType.includes('video') ? 'video' : ''
    if (broadType && endpoints[broadType]) return routeConfigForModel(endpoints[broadType], model?.model_name || '')
  }
  return providerFormat.includes('responses') || providerFormat.includes('codex')
    ? endpoints.responses || endpoints.chat || endpoints.completions || endpoints.llm || ''
    : endpoints.chat || endpoints.responses || endpoints.completions || endpoints.llm || ''
}

function defaultEndpointPath(provider: ProviderRecord, routeType = '', apiFormat = provider.api_format) {
  const providerFormat = String(apiFormat || '').toLowerCase()
  if (isClaudeCodeFormat(providerFormat)) return 'messages'
  if (providerFormat.includes('responses') || providerFormat.includes('codex')) return 'responses'
  if (String(routeType).includes('image')) return 'images/generations'
  if (String(routeType).includes('video')) return 'videos/generations'
  return 'chat/completions'
}

function normalizeGeminiModelName(modelName = '') {
  return String(modelName || '').replace(/^models\//, '').trim()
}

function resolveProviderEndpoint(provider: ProviderRecord, routeConfig = selectProviderRoute(provider), baseUrlOverride = '', routeType = '', modelName = '', apiFormat = provider.api_format) {
  const routeUrl = isRouteObject(routeConfig)
    ? String(routeConfig.url || routeConfig.endpoint || '')
    : String(routeConfig || '')
  const baseUrl = normalizeBaseUrl(baseUrlOverride || provider.default_base_url || '')
  const explicit = normalizeBaseUrl(routeUrl)
  if (explicit) {
    if (/^https?:\/\//i.test(explicit)) return explicit
    if (!baseUrl) return explicit
    return `${baseUrl}/${explicit.replace(/^\/+/, '')}`
  }
  const base = baseUrl || (isGeminiNativeFormat(apiFormat) ? 'https://generativelanguage.googleapis.com/v1beta' : '')
  if (!base) return ''
  if (isGeminiNativeFormat(apiFormat)) {
    if (/:generateContent$/.test(base)) return base
    const cleanModelName = normalizeGeminiModelName(modelName || 'gemini-1.5-flash')
    return `${base.replace(/\/+$/, '')}/models/${encodeURIComponent(cleanModelName)}:generateContent`
  }
  // If the URL already ends with a known completion path, use it as-is
  if (/\/(chat\/completions|completions|responses|messages|generate|complete)$/.test(base)) return base
  // If the URL already contains a path beyond base (e.g., /v1/complete, /api/v2/generate), treat it as the endpoint
  const pathParts = base.replace(/^(https?:\/\/[^/]+)/, '').split('/').filter(Boolean)
  if (pathParts.length >= 2) return base
  const hasV1 = /\/v1$/.test(base)
  const path = defaultEndpointPath(provider, routeType, apiFormat)
  if (hasV1) return `${base}/${path}`
  // Default to chat/completions (NOT responses) for OpenAI-compatible providers
  return `${base}/v1/${path}`
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

function asyncTaskStatus(raw: any, routeConfig: Record<string, any>) {
  const extracted = getValueByPathFromEnvelopes(raw, String(routeDslValue(routeConfig, 'status_extractor', 'statusExtractor') || 'output.task_status'))
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

function pollEndpointForTask(provider: ProviderRecord, endpoint: string, routeConfig: Record<string, any>, taskId: string, baseUrlOverride = '') {
  const template = String(routeDslValue(routeConfig, 'poll_url', 'pollUrl') || '').trim()
  const rendered = (template || `${endpoint.replace(/\/+$/, '')}/{{task_id}}`).replace(/\{\{\s*task_id\s*\}\}/g, taskId)
  if (/^https?:\/\//i.test(rendered)) return rendered
  const base = normalizeBaseUrl(baseUrlOverride || provider.default_base_url || '')
  return base ? `${base}/${rendered.replace(/^\/+/, '')}` : rendered
}

async function pollConfiguredTask(provider: ProviderRecord, endpoint: string, routeConfig: unknown, raw: any, headers: Record<string, string>, baseUrlOverride = '') {
  if (!isRouteObject(routeConfig)) return raw
  const taskId = asyncTaskId(raw, routeConfig)
  if (!taskId) return raw
  const initialStatus = asyncTaskStatus(raw, routeConfig)
  if (isCompletedTaskStatus(initialStatus) || !isPendingTaskStatus(initialStatus)) return raw

  const pollUrl = pollEndpointForTask(provider, endpoint, routeConfig, taskId, baseUrlOverride)
  const maxAttempts = Math.max(1, Number(routeDslValue(routeConfig, 'poll_max_attempts', 'pollMaxAttempts') || 60))
  const pollIntervalMs = Math.max(0, Number(routeDslValue(routeConfig, 'poll_interval_ms', 'pollIntervalMs') ?? 10_000))

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (attempt > 1 && pollIntervalMs > 0) await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
    const payload = await getJson(pollUrl, headers)
    const status = asyncTaskStatus(payload, routeConfig)
    if (isFailedTaskStatus(status)) throw new Error(`LLM async task failed: ${JSON.stringify(payload).slice(0, 500)}`)
    if (isCompletedTaskStatus(status) || !isPendingTaskStatus(status)) return payload
  }

  throw new Error(`LLM async task timed out: ${taskId}`)
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

function geminiPartsFromMessageContent(content: LLMRequest['messages'][number]['content']) {
  if (!Array.isArray(content)) return [{ text: stringifyLLMMessageContent(content) }]
  const parts = content.flatMap(part => {
    const text = textFromLLMContentPart(part).trim()
    if (text) return [{ text }]
    const imageUrl = imageUrlFromLLMContentPart(part)
    if (imageUrl) return [{ fileData: { mimeType: 'image/png', fileUri: imageUrl } }]
    return []
  })
  return parts.length ? parts : [{ text: stringifyLLMMessageContent(content) }]
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

function buildTemplateContext(request: LLMRequest) {
  return {
    ...(request as any),
    model: request.model,
    messages: request.messages,
    prompt: (request as any).prompt || promptFromMessages(request.messages),
    size: (request as any).size ?? '1024*1024',
    temperature: request.temperature,
    max_tokens: request.max_tokens,
  }
}

function buildConfiguredRouteBody(routeConfig: unknown, request: LLMRequest, fallback: () => any) {
  const payloadTemplate = routeDslValue(routeConfig, 'payload_template', 'payloadTemplate')
  if (payloadTemplate) {
    return renderTemplateValue(payloadTemplate, buildTemplateContext(request)) ?? {}
  }
  return fallback()
}

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
    const body = buildConfiguredRouteBody(routeConfig, modelRequest, () => isCodex
      ? buildCodexResponsesBody(modelRequest, this.model.model_name || request.model, false, {
        baseUrl: effectiveBaseUrl,
      })
      : isResponses ? buildOpenAIResponsesBody(modelRequest) : (isGeminiNative ? buildGeminiGenerateContentBody(modelRequest) : (isAnthropic ? buildAnthropicMessagesBody(modelRequest) : (isMediaRouteType(routeType) ? buildOpenAIMediaBody(modelRequest) : buildOpenAIChatBody(modelRequest)))))
    const headers = applyProviderAuth({ ...(this.provider.custom_headers || {}) }, this.provider, this.apiKey.key, providerFormat)
    const routeHeaders = routeDslValue(routeConfig, 'headers', 'customHeaders')
    if (routeHeaders && typeof routeHeaders === 'object') Object.assign(headers, routeHeaders)
    if (isAnthropic) {
      applyClaudeCodeHeaders(headers, this.model)
      if (providerFormat === 'claude_code') applyClaudeCodeBodyMetadata(body, this.model)
    }
    const raw = await pollConfiguredTask(this.provider, endpoint, routeConfig, await postJson(endpoint, body, undefined, headers), headers, effectiveBaseUrl)
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

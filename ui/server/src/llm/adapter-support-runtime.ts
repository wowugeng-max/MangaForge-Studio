/** Pure helpers and request/response normalization for LLM adapters. */
import { imageUrlFromLLMContentPart, stringifyLLMMessageContent, stringifyLLMMessageTextContent, textFromLLMContentPart, type LLMRequest, type LLMResponse, type LLMToolCall } from './types'
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
import type { APIKeyRecord } from '../key-store'
import type { ModelRecord } from '../model-store'
import type { ProviderRecord } from '../provider-store'

import {
  effectiveApiFormat,
  isClaudeCodeFormat,
  isGeminiNativeFormat,
  promptFromMessages,
  tryParseJson,
} from './adapter-support-normalize-bodies'

export function applyProviderAuth(headers: Record<string, string>, provider: ProviderRecord, apiKey?: string, apiFormat = provider.api_format, baseUrl = '') {
  const key = String(apiKey || '').trim()
  if (!key || String(provider.auth_type || 'bearer').toLowerCase() === 'none') return headers
  const authType = String(provider.auth_type || 'bearer').toLowerCase()
  if (isClaudeCodeFormat(apiFormat)) {
    return applyClaudeCodeAuthHeaders(headers, key, authType, undefined, {
      provider,
      baseUrl,
    })
  }
  if (isGeminiNativeFormat(apiFormat)) {
    headers['x-goog-api-key'] = key
    return headers
  }
  if (authType === 'x-api-key' || authType === 'api-key') headers['x-api-key'] = key
  else headers.Authorization = key.toLowerCase().startsWith('bearer ') ? key : `Bearer ${key}`
  return headers
}

export async function postJson(url: string, body: any, apiKey?: string, headersExtra: Record<string, string> = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...headersExtra }
  if (body?.stream && !headers.Accept) headers.Accept = 'text/event-stream'
  if (apiKey) headers.Authorization = apiKey.toLowerCase().startsWith('bearer ') ? apiKey : `Bearer ${apiKey}`
  logProviderRequestSummary(url, body, headers)
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  const text = await response.text()
  if (!response.ok) throw new Error(`LLM request failed with status ${response.status}: ${text}`)
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('text/event-stream') || /^\s*data:/m.test(text)) return parseResponsesEventStreamText(text)
  try { return JSON.parse(text) } catch { return { content: text } }
}

function logProviderRequestSummary(url: string, body: any, headers: Record<string, string>) {
  if (process.env.LLM_DEBUG_REQUESTS !== '1') return
  if (!/anyrouter\.top/i.test(url)) return
  console.log(`[llm-adapter] AnyRouter request summary: ${JSON.stringify({
    url,
    model: body?.model,
    stream: body?.stream,
    accept: headers.Accept || headers.accept || '',
    content_type: headers['Content-Type'] || headers['content-type'] || '',
    body_keys: body && typeof body === 'object' ? Object.keys(body).sort() : [],
    input_count: Array.isArray(body?.input) ? body.input.length : 0,
    has_messages: Object.prototype.hasOwnProperty.call(body || {}, 'messages'),
    has_input: Object.prototype.hasOwnProperty.call(body || {}, 'input'),
    include: body?.include,
    reasoning_effort: body?.reasoning?.effort,
  })}`)
}

function parseResponsesEventStreamText(text: string) {
  let content = ''
  let finalResponse: any = null
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line.startsWith('data:')) continue
    const payload = line.slice(5).trim()
    if (!payload || payload === '[DONE]') continue
    const chunk = tryParseJson(payload)
    if (!chunk) continue
    if (typeof chunk.delta === 'string') content += chunk.delta
    if (typeof chunk.text === 'string' && !String(chunk.type || '').includes('.done')) content += chunk.text
    const choice = Array.isArray(chunk.choices) ? chunk.choices[0] : null
    if (typeof choice?.delta?.content === 'string') content += choice.delta.content
    if (typeof choice?.message?.content === 'string') content += choice.message.content
    if (chunk.type === 'response.completed') finalResponse = chunk.response || chunk
  }
  return {
    ...(finalResponse || {}),
    output_text: content || finalResponse?.output_text || '',
    content: content || finalResponse?.output_text || '',
    status: finalResponse?.status || 'completed',
    usage: finalResponse?.usage,
  }
}

function isAnyRouterTopEndpoint(provider: ProviderRecord, endpoint = '', baseUrl = provider.default_base_url || '') {
  return /anyrouter\.top/i.test(`${provider.id || ''} ${provider.display_name || ''} ${provider.default_base_url || ''} ${baseUrl} ${endpoint}`)
}

export function shouldUseOpenAIResponsesSdk(apiFormat: string, routeConfig: unknown, provider: ProviderRecord, endpoint: string) {
  const normalized = String(apiFormat || '').toLowerCase()
  if (!normalized.includes('codex') && !normalized.includes('responses')) return false
  if (isRouteObject(routeConfig)) return false
  if (isAnyRouterTopEndpoint(provider, endpoint)) return false
  if (!/\/responses(?:[?#].*)?$/i.test(endpoint)) return false
  const authType = String(provider.auth_type || 'bearer').toLowerCase()
  return authType === 'bearer' || authType === 'authorization' || authType === 'oauth'
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

function openAIResponsesSdkBaseUrlFromEndpoint(endpoint: string, fallbackBaseUrl: string) {
  const stripped = String(endpoint || '').replace(/\/responses(?:[?#].*)?$/i, '')
  return stripped || fallbackBaseUrl
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

export async function postOpenAIResponsesViaSdk(endpoint: string, body: any, apiKey: string, headers: Record<string, string>, fallbackBaseUrl: string) {
  try {
    return await createOpenAIResponseViaSdk({
      apiKey: String(apiKey || '').replace(/^Bearer\s+/i, ''),
      baseURL: openAIResponsesSdkBaseUrlFromEndpoint(endpoint, fallbackBaseUrl),
      headers: headersForOpenAIResponsesSdk(headers),
      body,
      timeoutMs: 600000,
    })
  } catch (error: any) {
    const status = statusFromProviderError(error)
    if (status) throw new Error(`LLM request failed with status ${status}: ${bodyTextFromProviderError(error)}`)
    throw error
  }
}

async function getJson(url: string, headersExtra: Record<string, string> = {}) {
  const response = await fetch(url, { method: 'GET', headers: headersExtra })
  const text = await response.text()
  if (!response.ok) throw new Error(`LLM task poll failed with status ${response.status}: ${text}`)
  try { return JSON.parse(text) } catch { return { content: text } }
}

export function normalizeBaseUrl(url?: string) {
  return String(url || '').replace(/\/$/, '')
}

function isRouteObject(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function routeDslValue(routeConfig: unknown, snakeKey: string, camelKey: string = snakeKey) {
  if (!isRouteObject(routeConfig)) return undefined
  return routeConfig[snakeKey] ?? routeConfig[camelKey]
}

export function requestRouteType(request: LLMRequest, model?: ModelRecord) {
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

export function selectProviderRoute(provider: ProviderRecord, request?: LLMRequest, model?: ModelRecord) {
  const endpoints = provider.endpoints || {}
  const providerFormat = effectiveApiFormat(provider, model)
  if (isClaudeCodeFormat(providerFormat)) return firstUsableRouteConfig(endpoints.messages, endpoints.chat, endpoints.completions, endpoints.llm)
  if (!providerFormat.includes('responses') && !providerFormat.includes('codex')) {
    const routeType = request ? requestRouteType(request, model) : ''
    const routeConfig = routeType ? usableRouteConfig(endpoints[routeType]) : ''
    if (routeConfig) return routeConfigForModel(routeConfig, model?.model_name || '')
    const broadType = routeType.includes('image') ? 'image' : routeType.includes('video') ? 'video' : ''
    const broadConfig = broadType ? usableRouteConfig(endpoints[broadType]) : ''
    if (broadConfig) return routeConfigForModel(broadConfig, model?.model_name || '')
  }
  return providerFormat.includes('responses') || providerFormat.includes('codex')
    ? firstUsableRouteConfig(endpoints.responses, endpoints.chat, endpoints.completions, endpoints.llm)
    : firstUsableRouteConfig(endpoints.chat, endpoints.completions, endpoints.llm)
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

export function resolveProviderEndpoint(provider: ProviderRecord, routeConfig = selectProviderRoute(provider), baseUrlOverride = '', routeType = '', modelName = '', apiFormat = provider.api_format) {
  const routeUrl = isRouteObject(routeConfig)
    ? String(routeConfig.url || routeConfig.endpoint || '')
    : String(routeConfig || '')
  const baseUrl = normalizeBaseUrl(baseUrlOverride || provider.default_base_url || '')
  const explicit = normalizeBaseUrl(routeUrl)
  if (isClaudeCodeFormat(apiFormat)) {
    const anyRouterMessagesEndpoint = anyRouterOfficialMessagesEndpoint(baseUrl, provider.default_base_url, explicit)
    if (anyRouterMessagesEndpoint) return anyRouterMessagesEndpoint
  }
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

export function getValueByPathFromEnvelopes(raw: any, path: string) {
  for (const candidate of providerEnvelopeCandidates(raw)) {
    const value = getValueByPath(candidate, path)
    if (value !== undefined) return value
  }
  return undefined
}

export function extractMediaContent(raw: any) {
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

export function normalizeExtractedMediaContent(content: string) {
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

export async function pollConfiguredTask(provider: ProviderRecord, endpoint: string, routeConfig: unknown, raw: any, headers: Record<string, string>, baseUrlOverride = '') {
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

export function buildConfiguredRouteBody(routeConfig: unknown, request: LLMRequest, fallback: () => any) {
  const payloadTemplate = routeDslValue(routeConfig, 'payload_template', 'payloadTemplate')
  if (payloadTemplate) {
    return renderTemplateValue(payloadTemplate, buildTemplateContext(request)) ?? {}
  }
  return fallback()
}

export function shouldStreamConfiguredRequest(request: LLMRequest, provider: ProviderRecord, model?: ModelRecord) {
  return shouldStreamWithModelOverride(request, provider, model)
}


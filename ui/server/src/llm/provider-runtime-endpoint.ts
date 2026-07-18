/** Endpoint selection, route config, and async poll helpers for provider runtime. */
import type { ModelRecord } from '../model-store'
import type { ProviderRecord } from '../provider-store'
import type { LLMRequest } from './types'
import {
  buildUrl,
  getValueByPathFromEnvelopes,
  isClaudeCodeFormat,
  isCodexResponsesFormat,
  isGeminiNativeFormat,
  isRouteObject,
  providerEnvelopeCandidates,
  requestRouteType,
  routeDslValue,
  type RuntimeExecutionOptions,
  type RuntimeModelSelection,
} from './provider-runtime-support'

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

export function firstUsableRouteConfig(...values: any[]) {
  return values.map(usableRouteConfig).find(Boolean) || ''
}

export function effectiveApiFormat(provider: ProviderRecord, model?: ModelRecord): string {
  const modelFormat = String(model?.api_format || '').trim().toLowerCase()
  if (modelFormat) return modelFormat
  return String(provider.api_format || 'openai_compatible').trim().toLowerCase()
}

export function routeConfigForProvider(provider: ProviderRecord, apiFormat = provider.api_format): any {
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

export function normalizeGeminiModelName(modelName = '') {
  return String(modelName || '').replace(/^models\//, '').trim()
}

export function endpointForRoute(provider: ProviderRecord, route: any, routeType = '', modelName = '', apiFormat = provider.api_format) {
  const usableRoute = usableRouteConfig(route)
  if (!usableRoute) return fallbackEndpointForProvider(provider, routeType, modelName, apiFormat)
  route = usableRoute
  if (isRouteObject(route)) return String(route.url || route.endpoint || fallbackEndpointForProvider(provider, routeType, modelName, apiFormat))
  if (route) return String(route)
  return fallbackEndpointForProvider(provider, routeType, modelName, apiFormat)
}

export function endpointForProvider(provider: ProviderRecord): string {
  const route = routeConfigForProvider(provider)
  return endpointForRoute(provider, route)
}

export function selectionForRequestRoute(selection: RuntimeModelSelection, request: LLMRequest): RuntimeModelSelection {
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

export function waitForPollInterval(ms: number, signal?: AbortSignal) {
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

export async function pollAsyncProviderTask(raw: any, selection: RuntimeModelSelection, headers: Record<string, string>, initialUrl: string, options: RuntimeExecutionOptions) {
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


import type { Express } from 'express'
import { readKeys, writeKeys, type APIKeyRecord } from '../key-store'
import { readProviders } from '../provider-store'
import { readModels, writeModels, type ModelRecord } from '../model-store'
import { ConfiguredProviderAdapter } from '../llm/adapter'
import { buildCodexResponsesBody } from '../llm/codex-responses'
import { coerceBoolean } from '../boolean-utils'

function redactSecret(value?: string) {
  const text = String(value || '')
  if (!text) return ''
  if (text.length <= 8) return '***'
  return `${text.slice(0, 4)}***${text.slice(-4)}`
}

function logDebug(scope: string, payload: Record<string, any>) {
  console.info(`[${scope}]`, JSON.stringify(payload))
}

function nowIso() {
  return new Date().toISOString()
}

function errorBody(message: unknown, extra: Record<string, any> = {}) {
  const error = String(message)
  return { ...extra, error, detail: error }
}

function queryNumber(value: unknown, fallback: number) {
  if (Array.isArray(value)) return queryNumber(value[0], fallback)
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function queryBoolean(value: unknown): boolean | null {
  if (value === undefined || value === null || value === '') return null
  if (Array.isArray(value)) return queryBoolean(value[0])
  const text = String(value).toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(text)) return true
  if (['false', '0', 'no', 'off'].includes(text)) return false
  return null
}

function tryParseJson<T = any>(value: string, fallback: T): T {
  try { return JSON.parse(value) } catch { return fallback }
}

function extractRetryAfter(errorBody: string): number | undefined {
  const parsed = tryParseJson<any>(errorBody, null)
  const retryAfter = Number(parsed?.retry_after || parsed?.retryAfter || 0)
  return retryAfter > 0 ? retryAfter : undefined
}

function classifyProviderTestFailure(status: number, body: string) {
  const parsed = tryParseJson<any>(body, null)
  const message = String(parsed?.detail || parsed?.message || parsed?.error?.message || parsed?.error || body || '').trim()
  const retryAfter = extractRetryAfter(body)
  const isCloudflare = Boolean(parsed?.cloudflare_error || /cloudflare|ray_id|origin_bad_gateway/i.test(body))
  const retryable = Boolean(parsed?.retryable) || status === 429 || status === 524 || (status >= 500 && status < 600)
  const summary = retryable
    ? `供应商上游临时不可用 (${status})${isCloudflare ? '：Cloudflare/源站网关错误' : ''}${retryAfter ? `，建议 ${retryAfter}s 后重试` : '，稍后重试'}`
    : `供应商测试失败 (${status})`
  return {
    valid: false,
    status,
    retryable,
    retry_after: retryAfter,
    error: message ? `${summary}。${message.slice(0, 220)}` : summary,
  }
}

export function selectProbeModel(models: ModelRecord[], keyId: number, providerId: string): ModelRecord | undefined {
  const candidates = models.filter(model => (
    Number(model.api_key_id || 0) === keyId
    && String(model.provider || '') === providerId
    && model.health_status !== 'disabled'
  ))
  return candidates.find(model => model.is_favorite)
    || candidates.find(model => model.capabilities?.chat)
    || candidates[0]
}

export function buildFallbackTestUrl(rawEndpoint: string, apiFormat: string) {
  const endpoint = rawEndpoint.replace(/\/+$/, '')
  const providerFormat = String(apiFormat || '').toLowerCase()
  if (providerFormat === 'gemini_native') {
    if (/\/models\/[^/]+:generateContent$/i.test(endpoint)) return endpoint
    return /\/v1beta$/i.test(endpoint) ? `${endpoint}/models/test:generateContent` : `${endpoint}/v1beta/models/test:generateContent`
  }
  if (/\/(chat\/completions|responses|messages|generate|models)$/.test(endpoint)) return endpoint
  if (providerFormat.includes('anthropic')) {
    return /\/v1$/.test(endpoint) ? `${endpoint}/messages` : `${endpoint}/v1/messages`
  }
  if (providerFormat.includes('responses') || providerFormat.includes('codex')) {
    return /\/v1$/.test(endpoint) ? `${endpoint}/responses` : `${endpoint}/v1/responses`
  }
  if (providerFormat === 'openai_compatible') {
    return /\/v1$/.test(endpoint) ? `${endpoint}/models` : `${endpoint}/v1/models`
  }
  return /\/v1$/.test(endpoint) ? `${endpoint}/chat/completions` : `${endpoint}/v1/chat/completions`
}

function normalizeKeyInput(body: any, fallback?: APIKeyRecord): APIKeyRecord {
  const quotaTotal = body.quota_total ?? body.quotaTotal ?? fallback?.quota_total ?? 0
  const quotaUsed = body.quota_used ?? body.quotaUsed ?? fallback?.quota_used ?? 0
  const createdAt = String(body.created_at ?? body.createdAt ?? fallback?.created_at ?? nowIso())
  const lastChecked = String(body.last_checked ?? body.lastChecked ?? fallback?.last_checked ?? nowIso())
  const lastUsed = body.last_used !== undefined
    ? body.last_used
    : body.lastUsed !== undefined
      ? body.lastUsed
      : fallback?.last_used ?? null
  const expiresAt = body.expires_at !== undefined
    ? body.expires_at
    : body.expiresAt !== undefined
      ? body.expiresAt
      : fallback?.expires_at ?? null
  return {
    id: Number(body.id ?? fallback?.id ?? 0),
    provider: String(body.provider ?? fallback?.provider ?? ''),
    key: String(body.key ?? body.api_key ?? body.apiKey ?? fallback?.key ?? ''),
    base_url: String(body.base_url ?? body.baseUrl ?? fallback?.base_url ?? ''),
    description: String(body.description ?? fallback?.description ?? ''),
    is_active: coerceBoolean(body.is_active ?? body.isActive, fallback?.is_active ?? true),
    priority: Number(body.priority ?? fallback?.priority ?? 0),
    quota_total: Number(quotaTotal),
    quota_remaining: Number(body.quota_remaining ?? body.quotaRemaining ?? fallback?.quota_remaining ?? quotaTotal),
    quota_used: Number(quotaUsed),
    quota_unit: String(body.quota_unit ?? body.quotaUnit ?? fallback?.quota_unit ?? 'count'),
    price_per_call: Number(body.price_per_call ?? body.pricePerCall ?? fallback?.price_per_call ?? 0),
    service_type: String(body.service_type ?? body.serviceType ?? fallback?.service_type ?? 'llm'),
    success_count: Number(body.success_count ?? body.successCount ?? fallback?.success_count ?? 0),
    failure_count: Number(body.failure_count ?? body.failureCount ?? fallback?.failure_count ?? 0),
    last_checked: lastChecked,
    last_used: lastUsed ? String(lastUsed) : null,
    created_at: createdAt,
    expires_at: expiresAt ? String(expiresAt) : null,
    avg_latency: Number(body.avg_latency ?? body.avgLatency ?? fallback?.avg_latency ?? 0),
    tags: Array.isArray(body.tags) ? body.tags : (fallback?.tags ?? []),
  }
}

function buildProbeRequestBody(apiFormat: string) {
  const providerFormat = String(apiFormat || '').toLowerCase()
  if (providerFormat === 'gemini_native') {
    return {
      contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 1 },
    }
  }
  if (providerFormat.includes('responses') || providerFormat.includes('codex')) {
    return buildCodexResponsesBody({ model: 'test', messages: [{ role: 'user', content: 'ping' }] }, 'test', false)
  }
  if (providerFormat.includes('anthropic')) return { model: 'test', messages: [{ role: 'user', content: 'ping' }], max_tokens: 1, temperature: 0 }
  return { model: 'test', messages: [{ role: 'user', content: 'ping' }], max_tokens: 1, temperature: 0 }
}

function routeUrl(routeConfig: unknown) {
  if (!routeConfig) return ''
  if (typeof routeConfig === 'string') return routeConfig
  if (typeof routeConfig === 'object') {
    const route = routeConfig as Record<string, any>
    return String(route.url || route.endpoint || '')
  }
  return ''
}

function buildKeyProbeHeaders(provider: any, keyValue: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json', ...(provider.custom_headers || {}) }
  const authType = String(provider.auth_type || 'bearer').toLowerCase()
  if (String(provider.api_format || '').toLowerCase() === 'gemini_native') headers['x-goog-api-key'] = keyValue
  else if (authType === 'x-api-key' || authType === 'api-key') headers['x-api-key'] = keyValue
  else if (authType !== 'none') headers.Authorization = keyValue.toLowerCase().startsWith('bearer ') ? keyValue : `Bearer ${keyValue}`
  return headers
}

function isDashScopeProvider(provider: any) {
  return /qwen|dashscope|aliyun/i.test(`${provider?.id || ''} ${provider?.display_name || ''} ${provider?.default_base_url || ''}`)
}

async function fetchDashScopeQuota(provider: any, keyValue: string) {
  if (!isDashScopeProvider(provider) || !keyValue) return undefined
  try {
    const auth = keyValue.toLowerCase().startsWith('bearer ') ? keyValue : `Bearer ${keyValue}`
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/users/quota', {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: auth },
    })
    if (!response.ok) return undefined
    const data = await response.json().catch(() => null)
    const quota = Number(data?.data?.available_quota ?? data?.available_quota ?? data?.quota_remaining)
    return Number.isFinite(quota) ? quota : undefined
  } catch {
    return undefined
  }
}

function resolveKeyProbeEndpoint(provider: any, key: APIKeyRecord) {
  const providerFormat = String(provider.api_format || '').toLowerCase()
  const rawRoute = (
    providerFormat.includes('responses') || providerFormat.includes('codex')
      ? provider.endpoints?.responses || provider.endpoints?.chat || provider.endpoints?.completions || provider.endpoints?.llm || key.base_url || provider.default_base_url || ''
      : provider.endpoints?.chat || provider.endpoints?.responses || provider.endpoints?.completions || provider.endpoints?.llm || key.base_url || provider.default_base_url || '',
  )
  const rawEndpoint = routeUrl(rawRoute).replace(/\/$/, '')
  const baseUrl = String(key.base_url || provider.default_base_url || '').replace(/\/$/, '')
  if (!rawEndpoint) return baseUrl ? buildFallbackTestUrl(baseUrl, provider.api_format) : ''
  if (/^https?:\/\//i.test(rawEndpoint)) return buildFallbackTestUrl(rawEndpoint, provider.api_format)
  return baseUrl ? `${baseUrl}/${rawEndpoint.replace(/^\/+/, '')}` : buildFallbackTestUrl(rawEndpoint, provider.api_format)
}

function buildKeyProbeRequest(provider: any, key: APIKeyRecord, keyValue: string) {
  const testUrl = resolveKeyProbeEndpoint(provider, key)
  if (!testUrl) return null
  const headers = buildKeyProbeHeaders(provider, keyValue)
  const apiFormat = String(provider.api_format || '').toLowerCase()
  if (apiFormat === 'openai_compatible' && /\/models(?:[?#].*)?$/i.test(testUrl)) {
    return {
      testUrl,
      fetchInit: { method: 'GET', headers } as RequestInit,
      requestKind: 'fallback-models',
      requestBodyKeys: [] as string[],
    }
  }
  const requestBody = buildProbeRequestBody(provider.api_format)
  return {
    testUrl,
    fetchInit: { method: 'POST', headers, body: JSON.stringify(requestBody) } as RequestInit,
    requestKind: 'fallback-chat',
    requestBodyKeys: Object.keys(requestBody),
  }
}

export function applyKeyProbeState(key: APIKeyRecord, result: any, latency: number, checkedAt: string) {
  key.last_checked = checkedAt
  if (result?.valid) {
    key.is_active = true
    key.failure_count = 0
    if (result.quota_remaining !== undefined && result.quota_remaining !== null) {
      key.quota_remaining = Number(result.quota_remaining)
    }
    key.avg_latency = key.avg_latency ? Math.round(key.avg_latency * 0.9 + latency * 0.1) : latency
  } else {
    key.failure_count = Number(key.failure_count || 0) + 1
    if (key.failure_count >= 3) key.is_active = false
  }
}

export async function probeKeyWithConfiguredModel(provider: any, key: APIKeyRecord, probeModel: ModelRecord) {
  try {
    const adapter = new ConfiguredProviderAdapter(provider, key, probeModel)
    await adapter.execute({
      model: probeModel.model_name,
      messages: [{ role: 'user', content: 'Return exactly: OK' }],
      temperature: 0,
      max_tokens: 8,
      response_format: 'text',
    })
    return {
      valid: true,
      retryable: false,
      message: `Key test passed (${probeModel.model_name})`,
      model: probeModel.model_name,
      quota_remaining: Math.max((key.quota_total || 0) - (key.quota_used || 0), 0),
    }
  } catch (error: any) {
    const errorText = String(error?.message || error)
    const statusMatch = errorText.match(/status\s+(\d+)/i)
    const status = Number(statusMatch?.[1] || 0)
    if (status) {
      const body = errorText.match(/status\s+\d+:\s*([\s\S]*)$/i)?.[1] || errorText
      return { ...classifyProviderTestFailure(status, body), model: probeModel.model_name }
    }
    return {
      valid: false,
      status: 0,
      retryable: /timeout|network|fetch|socket|econn/i.test(errorText),
      error: `供应商测试失败：${errorText.slice(0, 260)}`,
      model: probeModel.model_name,
    }
  }
}

export async function probeKeyWithBestAvailableMethod(provider: any, key: APIKeyRecord, models: ModelRecord[] = []) {
  const probeModel = selectProbeModel(models, key.id, provider.id)
  if (probeModel) return await probeKeyWithConfiguredModel(provider, key, probeModel)
  return await probeKeyFallback(provider, key)
}

export async function probeKeyFallback(provider: any, key: APIKeyRecord) {
  const keyValue = String(key.key || '').trim()
  if (String(provider.auth_type || 'bearer').toLowerCase() !== 'none' && !keyValue) {
    return { valid: false, status: 400, retryable: false, error: 'API key is empty' }
  }
  const probeRequest = buildKeyProbeRequest(provider, key, keyValue)
  if (!probeRequest) return { valid: false, status: 400, retryable: false, error: 'provider endpoint not configured' }
  try {
    const response = await fetch(probeRequest.testUrl, probeRequest.fetchInit)
    const text = await response.text()
    if (!response.ok) return classifyProviderTestFailure(response.status, text)
    const dashScopeQuota = await fetchDashScopeQuota(provider, keyValue)
    return { valid: true, status: response.status, retryable: false, message: 'Key test passed', quota_remaining: dashScopeQuota ?? Math.max((key.quota_total || 0) - (key.quota_used || 0), 0) }
  } catch (error: any) {
    const errorText = String(error?.message || error)
    return {
      valid: false,
      status: 0,
      retryable: /timeout|network|fetch|socket|econn|connection/i.test(errorText),
      error: `供应商测试失败：${errorText.slice(0, 260)}`,
    }
  }
}

export function registerKeyRoutes(app: Express, getWorkspace: () => string) {
  app.get(['/keys', '/api/keys', '/api/keys/'], async (req, res) => {
    try {
      const provider = String(req.query?.provider || '').trim()
      const activeFilter = queryBoolean(req.query?.is_active)
      const skip = Math.max(0, queryNumber(req.query?.skip, 0))
      const limit = Math.max(1, Math.min(1000, queryNumber(req.query?.limit, 100)))
      let keys = await readKeys(getWorkspace())
      if (provider) keys = keys.filter(key => key.provider === provider)
      if (activeFilter !== null) keys = keys.filter(key => key.is_active === activeFilter)
      res.json(keys.slice(skip, skip + limit))
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.get(['/keys/:id', '/keys/:id/', '/api/keys/:id', '/api/keys/:id/'], async (req, res) => {
    try {
      const keys = await readKeys(getWorkspace())
      const key = keys.find(item => item.id === Number(req.params.id))
      if (!key) return res.status(404).json(errorBody('Key not found'))
      res.json(key)
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.post(['/keys', '/api/keys', '/api/keys/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const keys = await readKeys(activeWorkspace)
      const key = normalizeKeyInput({ ...req.body, id: keys.reduce((max, item) => Math.max(max, item.id), 0) + 1 })
      const next = [...keys, key]
      await writeKeys(activeWorkspace, next)
      res.json(key)
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.put(['/keys/:id', '/keys/:id/', '/api/keys/:id', '/api/keys/:id/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const keys = await readKeys(activeWorkspace)
      const id = Number(req.params.id)
      const current = keys.find(key => key.id === id)
      if (!current) return res.status(404).json(errorBody('key not found'))
      const next = keys.map(key => key.id === id ? normalizeKeyInput({ ...req.body, id }, key) : key)
      await writeKeys(activeWorkspace, next)
      const record = next.find(item => item.id === id)
      res.json(record)
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.delete(['/keys/:id', '/keys/:id/', '/api/keys/:id', '/api/keys/:id/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const keys = await readKeys(activeWorkspace)
      const id = Number(req.params.id)
      if (!keys.some(key => key.id === id)) return res.status(404).json(errorBody('Key not found'))
      // 1. 删除 Key
      await writeKeys(activeWorkspace, keys.filter(key => key.id !== id))
      // 2. 级联删除关联的模型
      const models = await readModels(activeWorkspace)
      await writeModels(activeWorkspace, models.filter(m => Number(m.api_key_id) !== id))
      res.status(204).send()
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.post(['/keys/:id/test', '/keys/:id/test/', '/api/keys/:id/test', '/api/keys/:id/test/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const keys = await readKeys(activeWorkspace)
      const providers = await readProviders(activeWorkspace)
      const id = Number(req.params.id)
      const key = keys.find(item => item.id === id)
      if (!key) return res.status(404).json(errorBody('key not found', { valid: false }))
      if (!key.is_active) return res.status(400).json(errorBody('key is disabled', { valid: false }))
      const provider = providers.find(item => item.id === key.provider)
      if (!provider) return res.status(404).json(errorBody('provider not found', { valid: false }))
      const keyValue = String(key.key || '').trim()
      if (String(provider.auth_type || 'bearer').toLowerCase() !== 'none' && !keyValue) return res.status(400).json(errorBody('API key is empty', { valid: false }))
      const models = await readModels(activeWorkspace)
      const probeModel = selectProbeModel(models, key.id, provider.id)
      if (probeModel) {
        const checkedAt = nowIso()
        const started = Date.now()
        const result = await probeKeyWithConfiguredModel(provider, key, probeModel)
        applyKeyProbeState(key, result, Date.now() - started, checkedAt)
        await writeKeys(activeWorkspace, keys)
        return res.json({ ...result, testedAt: checkedAt })
      }

      const probeRequest = buildKeyProbeRequest(provider, key, keyValue)
      if (!probeRequest) return res.status(400).json(errorBody('provider endpoint not configured', { valid: false }))
      const authType = String(provider.auth_type || 'bearer').toLowerCase()
      const headers = probeRequest.fetchInit.headers as Record<string, string>
      logDebug('key-test', { key_id: key.id, provider_id: provider.id, auth_type: authType, test_url: probeRequest.testUrl, request_kind: probeRequest.requestKind, request_body_keys: probeRequest.requestBodyKeys, headers: { ...headers, Authorization: headers.Authorization ? redactSecret(headers.Authorization) : undefined, 'x-api-key': headers['x-api-key'] ? redactSecret(headers['x-api-key']) : undefined } })
      const checkedAt = nowIso()
      const started = Date.now()
      const result = await probeKeyFallback(provider, key)
      logDebug('key-test-response', { key_id: key.id, provider_id: provider.id, status: result.status, ok: result.valid, response_preview: String(result.message || result.error || '').slice(0, 260) })
      applyKeyProbeState(key, result, Date.now() - started, checkedAt)
      await writeKeys(activeWorkspace, keys)
      res.json({ ...result, testedAt: checkedAt })
    } catch (error) {
      res.status(500).json(errorBody(error, { valid: false }))
    }
  })

  app.post(['/keys/test-all', '/keys/test-all/', '/api/keys/test-all', '/api/keys/test-all/'], async (_req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const [keys, providers, models] = await Promise.all([
        readKeys(activeWorkspace),
        readProviders(activeWorkspace),
        readModels(activeWorkspace),
      ])
      const now = nowIso()
      const results: any[] = []
      const next = [...keys]
      const activeKeys = next.filter(item => item.is_active !== false)
      if (activeKeys.length === 0) return res.json(results)
      for (const key of activeKeys) {
        const provider = providers.find(item => item.id === key.provider)
        if (!provider) {
          results.push({ id: key.id, valid: false, message: `provider ${key.provider} not found` })
          continue
        }
        const started = Date.now()
        const result = await probeKeyWithBestAvailableMethod(provider, key, models)
        const latency = Date.now() - started
        applyKeyProbeState(key, result, latency, now)
        results.push({ id: key.id, provider: key.provider, valid: result.valid, message: result.message || result.error || '', status: result.status, ...(result.model ? { model: result.model } : {}) })
      }
      await writeKeys(activeWorkspace, next)
      res.json(results)
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

}

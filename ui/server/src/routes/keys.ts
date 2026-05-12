import type { Express } from 'express'
import { readKeys, writeKeys, type APIKeyRecord } from '../key-store'
import { syncModelsForKey } from '../key-sync'
import { readProviders } from '../provider-store'
import { readModels, writeModels, type ModelRecord } from '../model-store'
import { ConfiguredProviderAdapter } from '../llm/adapter'

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

function selectProbeModel(models: ModelRecord[], keyId: number, providerId: string): ModelRecord | undefined {
  const candidates = models.filter(model => (
    Number(model.api_key_id || 0) === keyId
    && String(model.provider || '') === providerId
    && model.health_status !== 'disabled'
  ))
  return candidates.find(model => model.is_favorite)
    || candidates.find(model => model.capabilities?.chat)
    || candidates[0]
}

function buildFallbackTestUrl(rawEndpoint: string, apiFormat: string) {
  const endpoint = rawEndpoint.replace(/\/+$/, '')
  if (/\/(chat\/completions|responses|messages|generate)$/.test(endpoint)) return endpoint
  if (String(apiFormat || '').toLowerCase().includes('anthropic')) {
    return /\/v1$/.test(endpoint) ? `${endpoint}/messages` : `${endpoint}/v1/messages`
  }
  return /\/v1$/.test(endpoint) ? `${endpoint}/chat/completions` : `${endpoint}/v1/chat/completions`
}

function normalizeKeyInput(body: any, fallback?: APIKeyRecord): APIKeyRecord {
  return {
    id: Number(body.id ?? fallback?.id ?? 0),
    provider: String(body.provider ?? fallback?.provider ?? ''),
    key: String(body.key ?? fallback?.key ?? ''),
    description: String(body.description ?? fallback?.description ?? ''),
    is_active: Boolean(body.is_active ?? fallback?.is_active ?? true),
    quota_total: Number(body.quota_total ?? fallback?.quota_total ?? 0),
    quota_used: Number(body.quota_used ?? fallback?.quota_used ?? 0),
    tags: Array.isArray(body.tags) ? body.tags : (fallback?.tags ?? []),
  }
}

export function registerKeyRoutes(app: Express, getWorkspace: () => string) {
  app.get(['/keys', '/api/keys', '/api/keys/'], async (_req, res) => {
    try {
      res.json(await readKeys(getWorkspace()))
    } catch (error) {
      res.status(500).json({ error: String(error) })
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
      res.status(500).json({ error: String(error) })
    }
  })

  app.put(['/keys/:id', '/api/keys/:id'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const keys = await readKeys(activeWorkspace)
      const id = Number(req.params.id)
      const next = keys.map(key => key.id === id ? normalizeKeyInput(req.body, key) : key)
      await writeKeys(activeWorkspace, next)
      const record = next.find(item => item.id === id)
      if (!record) return res.status(404).json({ error: 'key not found' })
      res.json(record)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.delete(['/keys/:id', '/api/keys/:id'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const keys = await readKeys(activeWorkspace)
      const id = Number(req.params.id)
      // 1. 删除 Key
      await writeKeys(activeWorkspace, keys.filter(key => key.id !== id))
      // 2. 级联删除关联的模型
      const models = await readModels(activeWorkspace)
      const deletedModelCount = models.filter(m => Number(m.api_key_id) === id).length
      await writeModels(activeWorkspace, models.filter(m => Number(m.api_key_id) !== id))
      res.json({ ok: true, cascaded: { models_deleted: deletedModelCount } })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post(['/keys/:id/test', '/api/keys/:id/test'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const keys = await readKeys(activeWorkspace)
      const providers = await readProviders(activeWorkspace)
      const id = Number(req.params.id)
      const key = keys.find(item => item.id === id)
      if (!key) return res.status(404).json({ valid: false, error: 'key not found' })
      if (!key.is_active) return res.status(400).json({ valid: false, error: 'key is disabled' })
      const provider = providers.find(item => item.id === key.provider)
      if (!provider) return res.status(404).json({ valid: false, error: 'provider not found' })
      const keyValue = String(key.key || '').trim()
      if (provider.auth_type !== 'none' && !keyValue) return res.status(400).json({ valid: false, error: 'API key is empty' })
      const rawEndpoint = String(provider.endpoints?.chat || provider.endpoints?.completions || provider.endpoints?.llm || provider.default_base_url || '').replace(/\/$/, '')
      if (!rawEndpoint) return res.status(400).json({ valid: false, error: 'provider endpoint not configured' })
      const models = await readModels(activeWorkspace)
      const probeModel = selectProbeModel(models, key.id, provider.id)
      if (probeModel) {
        try {
          const adapter = new ConfiguredProviderAdapter(provider, key, probeModel)
          await adapter.execute({
            model: probeModel.model_name,
            messages: [{ role: 'user', content: 'Return exactly: OK' }],
            temperature: 0,
            max_tokens: 8,
            response_format: 'text',
          })
          return res.json({
            valid: true,
            quota_remaining: Math.max((key.quota_total || 0) - (key.quota_used || 0), 0),
            message: `Key test passed (${probeModel.model_name})`,
            testedAt: nowIso(),
            model: probeModel.model_name,
          })
        } catch (error: any) {
          const errorText = String(error?.message || error)
          const statusMatch = errorText.match(/status\s+(\d+)/i)
          const status = Number(statusMatch?.[1] || 0)
          if (status) {
            const body = errorText.match(/status\s+\d+:\s*([\s\S]*)$/i)?.[1] || errorText
            return res.json(classifyProviderTestFailure(status, body))
          }
          return res.json({
            valid: false,
            status: 0,
            retryable: /timeout|network|fetch|socket|econn/i.test(errorText),
            error: `供应商测试失败：${errorText.slice(0, 260)}`,
          })
        }
      }

      const testUrl = buildFallbackTestUrl(rawEndpoint, provider.api_format)
      const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json', ...(provider.custom_headers || {}) }
      const authType = String(provider.auth_type || 'bearer').toLowerCase()
      if (authType === 'x-api-key' || authType === 'api-key') headers['x-api-key'] = keyValue
      else if (authType !== 'none') headers.Authorization = keyValue.toLowerCase().startsWith('bearer ') ? keyValue : `Bearer ${keyValue}`
      const requestBody = String(provider.api_format || '').toLowerCase().includes('anthropic')
        ? { model: 'test', messages: [{ role: 'user', content: 'ping' }], max_tokens: 1, temperature: 0 }
        : { model: 'test', messages: [{ role: 'user', content: 'ping' }], max_tokens: 1, temperature: 0 }
      logDebug('key-test', { key_id: key.id, provider_id: provider.id, auth_type: authType, test_url: testUrl, request_kind: 'fallback-chat', request_body_keys: Object.keys(requestBody), headers: { ...headers, Authorization: headers.Authorization ? redactSecret(headers.Authorization) : undefined, 'x-api-key': headers['x-api-key'] ? redactSecret(headers['x-api-key']) : undefined } })
      const response = await fetch(testUrl, { method: 'POST', headers, body: JSON.stringify(requestBody) })
      const text = await response.text()
      logDebug('key-test-response', { key_id: key.id, provider_id: provider.id, status: response.status, ok: response.ok, response_preview: text.slice(0, 260) })
      if (!response.ok) return res.json(classifyProviderTestFailure(response.status, text))
      res.json({ valid: true, quota_remaining: Math.max((key.quota_total || 0) - (key.quota_used || 0), 0), message: 'Key test passed', testedAt: nowIso(), provider_response: text.slice(0, 200) })
    } catch (error) {
      res.status(500).json({ valid: false, error: String(error) })
    }
  })

  app.post(['/keys/test-all', '/api/keys/test-all'], async (_req, res) => {
    try {
      res.json({ ok: true, testedAt: nowIso() })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post(['/models/sync/:keyId', '/api/models/sync/:keyId'], async (req, res) => {
    try {
      res.json(await syncModelsForKey(getWorkspace(), Number(req.params.keyId), req.body ?? {}))
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}

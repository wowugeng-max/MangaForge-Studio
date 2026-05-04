import type { Express } from 'express'
import { readKeys, writeKeys, type APIKeyRecord } from '../key-store'
import { syncModelsForKey } from '../key-sync'
import { readProviders } from '../provider-store'

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
      await writeKeys(activeWorkspace, keys.filter(key => key.id !== id))
      res.json({ ok: true })
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
      const testUrl = /\/(chat\/completions|responses|messages|generate)$/.test(rawEndpoint)
        ? rawEndpoint
        : /\/v1$/.test(rawEndpoint)
          ? `${rawEndpoint}/responses`
          : `${rawEndpoint}/v1/responses`
      const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json', ...(provider.custom_headers || {}) }
      const authType = String(provider.auth_type || 'bearer').toLowerCase()
      if (authType === 'x-api-key' || authType === 'api-key') headers['x-api-key'] = keyValue
      else if (authType !== 'none') headers.Authorization = keyValue.toLowerCase().startsWith('bearer ') ? keyValue : `Bearer ${keyValue}`
      const requestBody = { model: 'test', input: [{ role: 'user', content: 'ping' }], max_output_tokens: 1, temperature: 0, text: { format: { type: 'json_object' } } }
      logDebug('key-test', { key_id: key.id, provider_id: provider.id, auth_type: authType, test_url: testUrl, request_kind: 'responses', request_body_keys: Object.keys(requestBody), headers: { ...headers, Authorization: headers.Authorization ? redactSecret(headers.Authorization) : undefined, 'x-api-key': headers['x-api-key'] ? redactSecret(headers['x-api-key']) : undefined } })
      const response = await fetch(testUrl, { method: 'POST', headers, body: JSON.stringify(requestBody) })
      const text = await response.text()
      logDebug('key-test-response', { key_id: key.id, provider_id: provider.id, status: response.status, ok: response.ok, response_preview: text.slice(0, 260) })
      if (!response.ok) return res.status(502).json({ valid: false, error: `provider test failed (${response.status}): ${text}` })
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

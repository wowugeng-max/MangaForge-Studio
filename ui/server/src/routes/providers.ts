import type { Express } from 'express'
import { readProviders, writeProviders, type ProviderRecord } from '../provider-store'
import { readKeys, writeKeys, type APIKeyRecord } from '../key-store'
import { readModels, writeModels } from '../model-store'

function normalizeProviderInput(body: any, fallback?: ProviderRecord): ProviderRecord {
  return {
    id: String(body.id ?? fallback?.id ?? `provider-${Date.now()}`),
    display_name: String(body.display_name ?? fallback?.display_name ?? ''),
    service_type: String(body.service_type ?? fallback?.service_type ?? 'llm'),
    api_format: String(body.api_format ?? fallback?.api_format ?? 'openai'),
    auth_type: String(body.auth_type ?? fallback?.auth_type ?? 'bearer'),
    response_mode: ['auto', 'stream', 'non_stream'].includes(String(body.response_mode ?? fallback?.response_mode ?? 'auto'))
      ? String(body.response_mode ?? fallback?.response_mode ?? 'auto') as ProviderRecord['response_mode']
      : 'auto',
    supported_modalities: Array.isArray(body.supported_modalities) ? body.supported_modalities : (fallback?.supported_modalities ?? []),
    default_base_url: String(body.default_base_url ?? fallback?.default_base_url ?? ''),
    is_active: Boolean(body.is_active ?? fallback?.is_active ?? true),
    icon: String(body.icon ?? fallback?.icon ?? ''),
    endpoints: body.endpoints && typeof body.endpoints === 'object' ? body.endpoints : (fallback?.endpoints ?? {}),
    custom_headers: body.custom_headers && typeof body.custom_headers === 'object' ? body.custom_headers : (fallback?.custom_headers ?? {}),
  }
}

export function registerProviderRoutes(app: Express, getWorkspace: () => string) {
  app.get(['/providers', '/api/providers', '/api/providers/'], async (_req, res) => {
    try {
      res.json(await readProviders(getWorkspace()))
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post(['/providers', '/api/providers', '/api/providers/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const providers = await readProviders(activeWorkspace)
      const provider = normalizeProviderInput(req.body, undefined)
      const next = [...providers, provider]
      await writeProviders(activeWorkspace, next)
      res.json(provider)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put(['/providers/:id', '/api/providers/:id'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const providers = await readProviders(activeWorkspace)
      const id = String(req.params.id)
      const next = providers.map(provider => provider.id === id ? normalizeProviderInput(req.body, provider) : provider)
      await writeProviders(activeWorkspace, next)
      const updated = next.find(item => item.id === id)
      if (!updated) return res.status(404).json({ error: 'provider not found' })
      res.json(updated)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.delete(['/providers/:id', '/api/providers/:id'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const id = String(req.params.id)
      // 检查是否有 Key 引用此 Provider
      const keys = await readKeys(activeWorkspace)
      const refs = keys.filter(k => k.provider === id)
      if (refs.length > 0) {
        return res.status(409).json({
          error: `无法删除：该厂商下还有 ${refs.length} 个 API Key 引用（${refs.map(k => `#${k.id}`).join(', ')}）。请先删除或转移这些 Key。`,
        })
      }
      // 无引用，安全删除
      const providers = await readProviders(activeWorkspace)
      await writeProviders(activeWorkspace, providers.filter(provider => provider.id !== id))
      res.json({ ok: true })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}

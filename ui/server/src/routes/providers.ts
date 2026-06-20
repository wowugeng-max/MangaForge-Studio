import type { Express } from 'express'
import { normalizeProviderEndpoints, readProviders, writeProviders, type ProviderRecord } from '../provider-store'
import { readKeys } from '../key-store'
import { coerceBoolean } from '../boolean-utils'

function errorBody(message: unknown) {
  const error = String(message)
  return { error, detail: error }
}

function normalizeProviderInput(body: any, fallback?: ProviderRecord): ProviderRecord {
  const responseMode = body.response_mode ?? body.responseMode ?? fallback?.response_mode ?? 'auto'
  const supportedModalities = Array.isArray(body.supported_modalities)
    ? body.supported_modalities
    : Array.isArray(body.supportedModalities)
      ? body.supportedModalities
      : (fallback?.supported_modalities ?? [])
  return {
    id: String(body.id ?? fallback?.id ?? `provider-${Date.now()}`),
    display_name: String(body.display_name ?? body.displayName ?? fallback?.display_name ?? ''),
    service_type: String(body.service_type ?? body.serviceType ?? fallback?.service_type ?? 'llm'),
    api_format: String(body.api_format ?? body.apiFormat ?? fallback?.api_format ?? 'openai_compatible'),
    auth_type: String(body.auth_type ?? body.authType ?? fallback?.auth_type ?? 'Bearer'),
    response_mode: ['auto', 'stream', 'non_stream'].includes(String(responseMode))
      ? String(responseMode) as ProviderRecord['response_mode']
      : 'auto',
    supported_modalities: supportedModalities,
    default_base_url: String(body.default_base_url ?? body.defaultBaseUrl ?? fallback?.default_base_url ?? ''),
    is_active: coerceBoolean(body.is_active ?? body.isActive, fallback?.is_active ?? true),
    icon: String(body.icon ?? fallback?.icon ?? ''),
    endpoints: normalizeProviderEndpoints(body.endpoints && typeof body.endpoints === 'object' ? body.endpoints : (fallback?.endpoints ?? {})),
    custom_headers: body.custom_headers && typeof body.custom_headers === 'object'
      ? body.custom_headers
      : body.customHeaders && typeof body.customHeaders === 'object'
        ? body.customHeaders
        : (fallback?.custom_headers ?? {}),
  }
}

export function registerProviderRoutes(app: Express, getWorkspace: () => string) {
  app.get(['/providers', '/api/providers', '/api/providers/'], async (req, res) => {
    try {
      const serviceType = String(req.query?.service_type || req.query?.serviceType || '').trim()
      let providers = await readProviders(getWorkspace())
      if (serviceType) providers = providers.filter(provider => provider.service_type === serviceType)
      res.json(providers)
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.post(['/providers', '/api/providers', '/api/providers/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const providers = await readProviders(activeWorkspace)
      const provider = normalizeProviderInput(req.body, undefined)
      if (providers.some(item => item.id === provider.id)) {
        return res.status(400).json(errorBody('厂商标识 ID 已存在'))
      }
      const next = [...providers, provider]
      await writeProviders(activeWorkspace, next)
      res.json({ status: 'success', message: '新厂商配置已注入', provider })
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.put(['/providers/:id', '/providers/:id/', '/api/providers/:id', '/api/providers/:id/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const providers = await readProviders(activeWorkspace)
      const id = String(req.params.id)
      const current = providers.find(provider => provider.id === id)
      if (!current) return res.status(404).json(errorBody('provider not found'))
      const next = providers.map(provider => provider.id === id ? normalizeProviderInput({ ...req.body, id }, provider) : provider)
      await writeProviders(activeWorkspace, next)
      const updated = next.find(item => item.id === id)
      res.json({ status: 'success', message: '配置已更新', provider: updated })
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.delete(['/providers/:id', '/providers/:id/', '/api/providers/:id', '/api/providers/:id/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const id = String(req.params.id)
      // 检查是否有 Key 引用此 Provider
      const keys = await readKeys(activeWorkspace)
      const refs = keys.filter(k => k.provider === id)
      if (refs.length > 0) {
        return res.status(409).json(errorBody(`无法删除：该厂商下还有 ${refs.length} 个 API Key 引用（${refs.map(k => `#${k.id}`).join(', ')}）。请先删除或转移这些 Key。`))
      }
      // 无引用，安全删除
      const providers = await readProviders(activeWorkspace)
      if (!providers.some(provider => provider.id === id)) return res.json({ ok: true, status: 'success' })
      await writeProviders(activeWorkspace, providers.filter(provider => provider.id !== id))
      res.json({ ok: true, status: 'success' })
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })
}

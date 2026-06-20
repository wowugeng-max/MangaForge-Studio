import type { ModelRecord } from '../model-store'
import type { ProviderRecord } from '../provider-store'
import type { LLMRequest } from './types'

export type ResponseMode = 'auto' | 'stream' | 'non_stream'

const RESPONSE_MODES = new Set<ResponseMode>(['auto', 'stream', 'non_stream'])

function objectOrEmpty(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
}

export function normalizeResponseMode(value: unknown, fallback: ResponseMode = 'auto'): ResponseMode {
  const normalized = String(value || '').trim()
  return RESPONSE_MODES.has(normalized as ResponseMode) ? normalized as ResponseMode : fallback
}

export function modelResponseMode(model?: ModelRecord): ResponseMode {
  const params = objectOrEmpty(model?.context_ui_params)
  return normalizeResponseMode(
    (model as any)?.response_mode
      ?? (model as any)?.responseMode
      ?? params.response_mode
      ?? params.responseMode,
    'auto',
  )
}

export function shouldStreamWithModelOverride(request: LLMRequest, provider: ProviderRecord, model?: ModelRecord) {
  const requestMode = normalizeResponseMode((request as any).response_mode, 'auto')
  const modelMode = modelResponseMode(model)
  const providerMode = normalizeResponseMode(provider.response_mode, 'auto')
  if (requestMode === 'stream') return true
  if (requestMode === 'non_stream') return false
  if (modelMode === 'stream') return true
  if (modelMode === 'non_stream') return false
  if (providerMode === 'stream') return true
  if (providerMode === 'non_stream') return false
  return Boolean((request as any).stream)
}

export function modelCustomHeaders(model?: ModelRecord): Record<string, string> {
  const params = objectOrEmpty(model?.context_ui_params)
  const raw = objectOrEmpty(
    (model as any)?.custom_headers
      ?? (model as any)?.customHeaders
      ?? params.custom_headers
      ?? params.customHeaders,
  )
  const headers: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    const name = String(key || '').trim()
    if (!name || value === undefined || value === null) continue
    headers[name] = String(value)
  }
  return headers
}

export function mergeHeadersCaseInsensitive(target: Record<string, string>, source?: Record<string, any>) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return target
  for (const [rawName, rawValue] of Object.entries(source)) {
    const name = String(rawName || '').trim()
    if (!name || rawValue === undefined || rawValue === null) continue
    const existing = Object.keys(target).find(key => key.toLowerCase() === name.toLowerCase())
    if (existing) delete target[existing]
    target[name] = String(rawValue)
  }
  return target
}

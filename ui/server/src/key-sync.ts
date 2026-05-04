import { readKeys } from './key-store'
import { readModels, writeModels, type ModelRecord } from './model-store'
import { readProviders, type ProviderRecord } from './provider-store'

function nowIso() {
  return new Date().toISOString()
}

function normalizeBaseUrl(url?: string) {
  return String(url || '').replace(/\/$/, '')
}

function resolveModelsEndpoint(provider: ProviderRecord) {
  const endpoints = provider.endpoints || {}
  const explicit = endpoints.models || endpoints.model_list || endpoints.list_models || ''
  const base = normalizeBaseUrl(explicit || provider.default_base_url || '')
  if (!base) return ''
  if (/\/models$/.test(base)) return base
  if (/\/v1$/.test(base)) return `${base}/models`
  return `${base}/v1/models`
}

function inferCapabilities(modelName: string) {
  const name = modelName.toLowerCase()
  const isEmbedding = /embed|embedding|rerank|moderation/.test(name)
  const isImage = /image|dall|flux|sdxl|stable-diffusion|midjourney/.test(name)
  const isVideo = /video|veo|sora|kling|hailuo|runway|wan\d/.test(name)
  const isVision = /vision|vl|gpt-4o|qwen-vl|gemini|claude-3|pixtral|llava/.test(name)
  return {
    chat: !isEmbedding && !isImage && !isVideo,
    vision: isVision,
    text_to_image: isImage,
    image_to_image: isImage,
    text_to_video: isVideo,
    image_to_video: isVideo,
  }
}

function extractModels(raw: any) {
  const candidates = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.models) ? raw.models : Array.isArray(raw) ? raw : []
  return candidates
    .map((item: any) => {
      const id = String(item?.id || item?.name || item?.model || item?.model_name || '').trim()
      if (!id) return null
      return {
        model_name: id,
        display_name: String(item?.display_name || item?.name || item?.label || id),
        capabilities: item?.capabilities && typeof item.capabilities === 'object' ? item.capabilities : inferCapabilities(id),
      }
    })
    .filter(Boolean) as Array<Pick<ModelRecord, 'model_name' | 'display_name' | 'capabilities'>>
}

function applyAuthHeaders(headers: Record<string, string>, provider: ProviderRecord, apiKey?: string) {
  const key = String(apiKey || '').trim()
  if (!key || String(provider.auth_type || 'bearer').toLowerCase() === 'none') return headers
  const authType = String(provider.auth_type || 'bearer').toLowerCase()
  if (authType === 'x-api-key' || authType === 'api-key') headers['x-api-key'] = key
  else if (authType === 'query') headers.Authorization = `Bearer ${key}`
  else headers.Authorization = key.toLowerCase().startsWith('bearer ') ? key : `Bearer ${key}`
  return headers
}

async function fetchProviderModels(provider: ProviderRecord, apiKey?: string) {
  const endpoint = resolveModelsEndpoint(provider)
  if (!endpoint) throw new Error(`提供商 ${provider.id} 缺少模型列表 endpoint 或 Base URL`)
  if (String(provider.auth_type || 'bearer').toLowerCase() !== 'none' && !String(apiKey || '').trim()) throw new Error(`Key #${provider.id} 的 API Key 为空，请先在 Key 管理中填写并保存`)
  const headers: Record<string, string> = applyAuthHeaders({ Accept: 'application/json', ...(provider.custom_headers || {}) }, provider, apiKey)
  const response = await fetch(endpoint, { method: 'GET', headers })
  const text = await response.text()
  if (!response.ok) throw new Error(`模型列表同步失败 (${response.status}): ${text}`)
  try { return extractModels(JSON.parse(text)) } catch { throw new Error(`模型列表响应不是有效 JSON: ${text.slice(0, 180)}`) }
}

function mergeSyncedModels(models: ModelRecord[], keyId: number, providerId: string, synced: Array<Pick<ModelRecord, 'model_name' | 'display_name' | 'capabilities'>>) {
  let nextId = models.reduce((max, item) => Math.max(max, item.id), 0) + 1
  let created = 0
  let updated = 0
  const now = nowIso()
  const next = [...models]
  for (const item of synced) {
    const existingIndex = next.findIndex(model => model.api_key_id === keyId && model.provider === providerId && model.model_name === item.model_name)
    if (existingIndex >= 0) {
      const existing = next[existingIndex]
      next[existingIndex] = {
        ...existing,
        display_name: existing.display_name || item.display_name || item.model_name,
        capabilities: { ...(item.capabilities || {}), ...(existing.capabilities || {}) },
        health_status: existing.health_status || 'unknown',
        is_manual: existing.is_manual ?? false,
        last_tested_at: existing.last_tested_at || now,
      }
      updated += 1
    } else {
      next.push({
        id: nextId++,
        api_key_id: keyId,
        provider: providerId,
        display_name: item.display_name || item.model_name,
        model_name: item.model_name,
        capabilities: item.capabilities || inferCapabilities(item.model_name),
        health_status: 'unknown',
        is_favorite: false,
        is_manual: false,
        context_ui_params: {},
        last_tested_at: now,
      })
      created += 1
    }
  }
  return { models: next, created, updated }
}

export async function syncModelsForKey(activeWorkspace: string, keyId: number, payload: any = {}) {
  const keys = await readKeys(activeWorkspace)
  const apiKey = keys.find(item => item.id === keyId)
  if (!apiKey) throw new Error('key not found')
  if (!apiKey.is_active) throw new Error('key is disabled')

  const providers = await readProviders(activeWorkspace)
  const provider = providers.find(item => item.id === apiKey.provider)
  if (!provider) throw new Error(`provider ${apiKey.provider} not found`)

  const models = await readModels(activeWorkspace)
  const manualModels = extractModels(payload)
  const syncedModels = manualModels.length > 0 ? manualModels : await fetchProviderModels(provider, apiKey.key)
  const { models: next, created, updated } = mergeSyncedModels(models, keyId, provider.id, syncedModels)
  await writeModels(activeWorkspace, next)
  return {
    ok: true,
    message: `模型同步完成：新增 ${created} 个，更新 ${updated} 个，共 ${syncedModels.length} 个`,
    created,
    updated,
    synced: syncedModels.length,
    models: next.filter(model => model.api_key_id === keyId),
  }
}

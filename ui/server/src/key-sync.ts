import { readKeys } from './key-store'
import { readModels, writeModels, type ModelRecord } from './model-store'
import { readProviders, type ProviderRecord } from './provider-store'

function nowIso() {
  return new Date().toISOString()
}

function normalizeBaseUrl(url?: string) {
  return String(url || '').replace(/\/$/, '')
}

function routeUrl(routeConfig: unknown) {
  if (!routeConfig) return ''
  if (typeof routeConfig === 'string') return routeConfig
  if (typeof routeConfig === 'object' && routeConfig) {
    const route = routeConfig as Record<string, any>
    return String(route.url || route.endpoint || '')
  }
  return ''
}

function isDashScopeProvider(provider: ProviderRecord) {
  return /qwen|dashscope|aliyun/i.test(`${provider.id} ${provider.display_name}`)
}

function isGeminiProvider(provider: ProviderRecord) {
  return String(provider.api_format || '').toLowerCase() === 'gemini_native'
    || /gemini|google/i.test(`${provider.id} ${provider.display_name}`)
}

function resolveModelsEndpoint(provider: ProviderRecord, baseUrlOverride = '') {
  const endpoints = provider.endpoints || {}
  const explicit = routeUrl(endpoints.models || endpoints.model_list || endpoints.list_models)
  const baseUrl = normalizeBaseUrl(baseUrlOverride || provider.default_base_url || '')
  if (explicit) {
    const endpoint = normalizeBaseUrl(String(explicit))
    if (/^https?:\/\//i.test(endpoint)) return endpoint
    return baseUrl ? `${baseUrl}/${endpoint.replace(/^\/+/, '')}` : endpoint
  }
  const base = baseUrl
  if (!base && isDashScopeProvider(provider)) return 'https://dashscope.aliyuncs.com/compatible-mode/v1/models'
  if (!base && isGeminiProvider(provider)) return 'https://generativelanguage.googleapis.com/v1beta/models'
  if (!base) return ''
  if (/\/models$/.test(base)) return base
  if (/\/v1$/.test(base)) return `${base}/models`
  return `${base}/v1/models`
}

function inferCapabilities(modelName: string) {
  const name = modelName.toLowerCase()
  const capabilities = {
    chat: false,
    vision: false,
    text_to_image: false,
    image_to_image: false,
    text_to_video: false,
    image_to_video: false,
  }
  if (/i2v|image-to-video|img2vid/.test(name)) {
    capabilities.image_to_video = true
  } else if (/sora|kling|runway|veo|cogvideo|vid|t2v|text-to-video|wanx-video|wan\d/.test(name)) {
    capabilities.text_to_video = true
  } else if (/i2i|img2img|cosplay|background/.test(name)) {
    capabilities.image_to_image = true
  } else if (/dall-e|midjourney|mj-|stable-diffusion|sdxl|cogview|wanx-v1|z-image|draw|t2i|image|flux/.test(name)) {
    capabilities.text_to_image = true
  } else if (/vision|vl|gpt-4o|claude-3-5|claude-3-opus|gemini|pixtral|llava/.test(name)) {
    capabilities.chat = true
    capabilities.vision = true
  } else {
    capabilities.chat = true
  }
  return capabilities
}

function normalizeCapabilities(raw: any, modelName = '') {
  const inferred = raw && typeof raw === 'object' ? raw : inferCapabilities(modelName)
  const capabilities: Record<string, boolean> = {
    ...inferred,
    chat: Boolean(inferred.chat),
    vision: Boolean(inferred.vision),
    text_to_image: Boolean(inferred.text_to_image || (inferred.image && !inferred.image_to_image)),
    image_to_image: Boolean(inferred.image_to_image),
    text_to_video: Boolean(inferred.text_to_video || (inferred.video && !inferred.image_to_video)),
    image_to_video: Boolean(inferred.image_to_video),
  }
  if (capabilities.text_to_image || capabilities.image_to_image) capabilities.image = true
  if (capabilities.text_to_video || capabilities.image_to_video) capabilities.video = true
  return capabilities
}

function defaultTextParams() {
  return [
    {
      name: 'context_window',
      label: '上下文窗口',
      type: 'select',
      options: [
        { label: '1M', value: 1_000_000 },
        { label: '256K', value: 256_000 },
        { label: '128K', value: 128_000 },
        { label: '32K', value: 32_000 },
      ],
      default: 1_000_000,
    },
    { name: 'temperature', label: '随机性 (Temp)', type: 'number', default: 0.7, min: 0, max: 2, step: 0.1 },
    { name: 'max_tokens', label: '输出长度限制', type: 'number', default: 8192, min: 1, max: 262144, step: 1 },
  ]
}

function defaultImageParams() {
  return [
    { name: 'size', label: '图像尺寸', type: 'select', options: ['1024*1024', '768*1024', '1024*768'], default: '1024*1024' },
    { name: 'n', label: '生成数量', type: 'number', default: 1, min: 1, max: 4, step: 1 },
  ]
}

function defaultVideoParams() {
  return [
    { name: 'resolution', label: '视频规格', type: 'select', options: ['720P', '1080P'], default: '720P' },
    { name: 'duration', label: '视频时长', type: 'number', default: 5, min: 1, max: 10, step: 1 },
  ]
}

function defaultContextUiParams(capabilities?: ModelRecord['capabilities']) {
  const caps = normalizeCapabilities(capabilities || { chat: true })
  const params: Record<string, unknown> = {
    context_window: 1_000_000,
    max_context: 1_000_000,
    context_window_preset: '1m',
    max_tokens: 8192,
    temperature: 0.7,
  }
  if (caps.chat) params.chat = defaultTextParams()
  if (caps.vision) params.vision = defaultTextParams()
  if (caps.text_to_image) params.text_to_image = defaultImageParams()
  if (caps.image_to_image) params.image_to_image = defaultImageParams()
  if (caps.text_to_video) params.text_to_video = defaultVideoParams()
  if (caps.image_to_video) params.image_to_video = defaultVideoParams()
  if (!caps.chat && !caps.vision && !caps.text_to_image && !caps.image_to_image && !caps.text_to_video && !caps.image_to_video) {
    params.chat = defaultTextParams()
  }
  return params
}

function inferModelApiFormat(modelName: string) {
  const name = String(modelName || '').toLowerCase()
  if (/^claude(?:-|_|$)|anthropic/.test(name)) return 'claude_code'
  return undefined
}

function findModelListCandidate(raw: any, depth = 0): any[] {
  if (Array.isArray(raw)) return raw
  if (!raw || typeof raw !== 'object' || depth > 8) return []
  for (const key of ['data', 'models', 'result', 'output', 'response', 'items']) {
    const found = findModelListCandidate(raw[key], depth + 1)
    if (found.length > 0) return found
  }
  return []
}

function extractModels(raw: any, provider?: ProviderRecord) {
  const isGemini = provider ? isGeminiProvider(provider) : false
  const candidates = findModelListCandidate(raw)
  return candidates
    .map((item: any) => {
      const rawId = String(item?.id || item?.name || item?.model || item?.model_name || '').trim()
      const id = rawId.replace(/^models\//, '')
      if (!id) return null
      if (isGemini && !/gemini/i.test(id)) return null
      return {
        model_name: id,
        display_name: String(item?.display_name || item?.displayName || item?.label || id).replace(/^models\//, ''),
        capabilities: normalizeCapabilities(item?.capabilities, id),
        api_format: String(item?.api_format || item?.apiFormat || inferModelApiFormat(id) || '') || undefined,
      }
    })
    .filter(Boolean) as Array<Pick<ModelRecord, 'model_name' | 'display_name' | 'capabilities' | 'api_format'>>
}

function applyAuthHeaders(headers: Record<string, string>, provider: ProviderRecord, apiKey?: string) {
  const key = String(apiKey || '').trim()
  if (!key || String(provider.auth_type || 'bearer').toLowerCase() === 'none') return headers
  const authType = String(provider.auth_type || 'bearer').toLowerCase()
  if (isGeminiProvider(provider)) {
    headers['x-goog-api-key'] = key
    return headers
  }
  if (authType === 'x-api-key' || authType === 'api-key') headers['x-api-key'] = key
  else if (authType === 'query') headers.Authorization = `Bearer ${key}`
  else headers.Authorization = key.toLowerCase().startsWith('bearer ') ? key : `Bearer ${key}`
  return headers
}

async function fetchProviderModels(provider: ProviderRecord, apiKey?: string, baseUrlOverride = '') {
  const endpoint = resolveModelsEndpoint(provider, baseUrlOverride)
  if (!endpoint) throw new Error(`提供商 ${provider.id} 缺少模型列表 endpoint 或 Base URL`)
  if (String(provider.auth_type || 'bearer').toLowerCase() !== 'none' && !String(apiKey || '').trim()) throw new Error(`Key #${provider.id} 的 API Key 为空，请先在 Key 管理中填写并保存`)
  const headers: Record<string, string> = applyAuthHeaders({ Accept: 'application/json', ...(provider.custom_headers || {}) }, provider, apiKey)
  const response = await fetch(endpoint, { method: 'GET', headers })
  const text = await response.text()
  if (!response.ok) throw new Error(`模型列表同步失败 (${response.status}): ${text}`)
  try { return extractModels(JSON.parse(text), provider) } catch { throw new Error(`模型列表响应不是有效 JSON: ${text.slice(0, 180)}`) }
}

function mergeSyncedModels(models: ModelRecord[], keyId: number, providerId: string, synced: Array<Pick<ModelRecord, 'model_name' | 'display_name' | 'capabilities' | 'api_format'>>) {
  let nextId = models.reduce((max, item) => Math.max(max, item.id), 0) + 1
  let created = 0
  let updated = 0
  const now = nowIso()
  const next = models.map(model => (
    Number(model.api_key_id || 0) === Number(keyId)
      && model.provider === providerId
      && model.is_manual === false
      ? { ...model, is_active: false }
      : model
  ))
  for (const item of synced) {
    const existingIndex = next.findIndex(model => model.api_key_id === keyId && model.provider === providerId && model.model_name === item.model_name)
    if (existingIndex >= 0) {
      const existing = next[existingIndex]
      const mergedCapabilities = normalizeCapabilities({ ...(item.capabilities || {}), ...(existing.capabilities || {}) }, item.model_name)
      next[existingIndex] = {
        ...existing,
        is_active: true,
        display_name: existing.display_name || item.display_name || item.model_name,
        api_format: item.api_format || existing.api_format,
        capabilities: mergedCapabilities,
        health_status: existing.health_status || 'unknown',
        is_manual: existing.is_manual ?? false,
        context_ui_params: existing.context_ui_params && Object.keys(existing.context_ui_params).length > 0
          ? existing.context_ui_params
          : defaultContextUiParams(mergedCapabilities),
        last_tested_at: existing.last_tested_at || now,
      }
      updated += 1
    } else {
      const capabilities = normalizeCapabilities(item.capabilities, item.model_name)
      next.push({
        id: nextId++,
        api_key_id: keyId,
        provider: providerId,
        display_name: item.display_name || item.model_name,
        model_name: item.model_name,
        api_format: item.api_format,
        capabilities,
        health_status: 'unknown',
        is_active: true,
        is_favorite: false,
        is_manual: false,
        context_ui_params: defaultContextUiParams(capabilities),
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
  const syncedModels = manualModels.length > 0 ? manualModels : await fetchProviderModels(provider, apiKey.key, apiKey.base_url)
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

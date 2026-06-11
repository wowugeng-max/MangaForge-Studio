import type { Express } from 'express'
import { readModels, writeModels, type ModelRecord } from '../model-store'
import { readKeys } from '../key-store'
import { readProviders } from '../provider-store'
import { ConfiguredProviderAdapter } from '../llm/adapter'
import type { LLMRequest, LLMMessage } from '../llm/types'
import { syncModelsForKey } from '../key-sync'
import { coerceBoolean } from '../boolean-utils'
import { anthropicModelNameForRequest } from '../llm/anthropic-context'
import type { ProviderRecord } from '../provider-store'

function nowIso() {
  return new Date().toISOString()
}

function errorBody(message: unknown) {
  const error = String(message)
  return { error, detail: error }
}

// ── 模型健康探针 ──

const OFFICIAL_TEST_IMAGE = 'https://img.alicdn.com/tfs/TB1p.bgQXXXXXbFXFXXXXXXXXXX-500-500.png'

export function determineProbeType(capabilities?: Record<string, boolean>): string {
  if (!capabilities) return 'chat'
  for (const priority of ['chat', 'vision', 'text_to_image', 'image_to_image', 'text_to_video', 'image_to_video']) {
    if (capabilities[priority]) return priority
  }
  if (capabilities.image) return 'text_to_image'
  if (capabilities.video) return 'text_to_video'
  return 'chat'
}

function modelMatchesMode(model: ModelRecord, mode: string) {
  const caps = model.capabilities || {}
  if (!mode) return true
  if (mode === 'image') return Boolean(caps.image || caps.text_to_image || caps.image_to_image)
  if (mode === 'video') return Boolean(caps.video || caps.text_to_video || caps.image_to_video)
  return Boolean(caps[mode])
}

export function buildProbeRequest(probeType: string, modelName: string): LLMRequest {
  if (probeType === 'chat') {
    return {
      model: modelName,
      messages: [{ role: 'user', content: 'Return exactly: OK' }],
      temperature: 0,
      max_tokens: 16,
      response_format: 'text',
    }
  }
  if (probeType === 'vision') {
    return {
      model: modelName,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this image.' },
          { type: 'image_url', image_url: { url: OFFICIAL_TEST_IMAGE } },
        ],
      }] as unknown as LLMMessage[],
      temperature: 0,
      max_tokens: 16,
      response_format: 'text',
    }
  }
  // image/video types — send a minimal text-to-image request
  const prompt = 'A simple white circle on a black background.'
  return {
    model: modelName,
    type: probeType,
    prompt,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    max_tokens: 16,
    response_format: 'text',
    image_url: ['image_to_image', 'image_to_video'].includes(probeType) ? OFFICIAL_TEST_IMAGE : undefined,
  }
}

function isClaudeCodeModel(model?: ModelRecord, provider?: ProviderRecord) {
  const fingerprint = [
    model?.api_format,
    provider?.api_format,
    model?.model_name,
    model?.display_name,
  ].map(value => String(value || '').toLowerCase()).join(' ')
  return fingerprint.includes('claude_code')
    || fingerprint.includes('anthropic')
    || /\bclaude(?:-|_|$)/.test(fingerprint)
}

function isAnyRouterProvider(provider?: ProviderRecord) {
  if (!provider) return false
  const fingerprint = [
    provider.id,
    provider.display_name,
    provider.default_base_url,
  ].map(value => String(value || '').toLowerCase()).join(' ')
  return /\banyrouter\b|anyrouter\.(?:top|dev)/.test(fingerprint)
    || String(provider.id || '').toLowerCase() === 'any'
}

function extractUpstreamErrorSummary(error: unknown) {
  const raw = String(error || '')
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      const upstream = parsed?.error?.message || parsed?.message || parsed?.error || ''
      if (upstream) return String(upstream).slice(0, 240)
    } catch {
      // Fall through to raw message below.
    }
  }
  return raw.slice(0, 240)
}

function classifyHealthError(
  error: unknown,
  context: { model?: ModelRecord; provider?: ProviderRecord; sentModelName?: string } = {},
): { status: string; message: string } {
  const msg = String(error || '').toLowerCase()
  if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
    return { status: 'quota_exhausted', message: '测试失败：额度耗尽' }
  }
  if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') || msg.includes('auth')) {
    if (isAnyRouterProvider(context.provider) && isClaudeCodeModel(context.model, context.provider)) {
      const sentModel = context.sentModelName || context.model?.model_name || ''
      const upstream = extractUpstreamErrorSummary(error)
      return {
        status: 'unauthorized',
        message: `测试失败：AnyRouter Claude/Anthropic 模型无权限。请求已按 Claude Messages 格式发送，实际模型 ID: ${sentModel}。请在 AnyRouter 控制台确认该 LLM Key 对 Anthropic/Claude 上游（BYOK/OpenRouter/Anthropic）有权限且额度可用。上游返回：${upstream}`,
      }
    }
    return { status: 'unauthorized', message: '测试失败：认证失败 / 无权限' }
  }
  if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('econnrefused') || msg.includes('connectionrefused') || msg.includes('connection refused') || msg.includes('socket') || msg.includes('fetch') || msg.includes('network')) {
    return { status: 'network_error', message: `测试失败：网络错误 — ${String(error).slice(0, 120)}` }
  }
  return { status: 'error', message: `测试失败：${String(error).slice(0, 200)}` }
}

async function runModelProbe(
  model: ModelRecord,
  activeWorkspace: string,
): Promise<{ status: string; message: string }> {
  const keys = await readKeys(activeWorkspace)
  const providers = await readProviders(activeWorkspace)

  const keyRecord = keys.find(k => k.id === model.api_key_id)
  if (!keyRecord) return { status: 'no_key', message: '该模型未绑定有效的 API Key' }
  if (!keyRecord.is_active) return { status: 'key_disabled', message: '绑定的 API Key 已停用' }

  const providerRecord = providers.find(p => p.id === model.provider)
  if (!providerRecord) return { status: 'no_provider', message: '未找到供应商配置' }
  const effectiveBaseUrl = keyRecord.base_url || providerRecord.default_base_url || ''
  const sentModelName = isClaudeCodeModel(model, providerRecord)
    ? anthropicModelNameForRequest(model.model_name, model, { provider: providerRecord, baseUrl: effectiveBaseUrl })
    : model.model_name

  try {
    const adapter = new ConfiguredProviderAdapter(
      providerRecord,
      keyRecord,
      model,
    )

    const probeType = determineProbeType(model.capabilities)
    const request = buildProbeRequest(probeType, model.model_name)
    request.max_tokens = 16 // minimal tokens for probe

    await adapter.execute(request)
    return { status: 'healthy', message: `探针测试通过 (probe_type: ${probeType})` }
  } catch (error) {
    return classifyHealthError(error, { model, provider: providerRecord, sentModelName })
  }
}

function normalizeModelInput(body: any, fallback?: ModelRecord): ModelRecord {
  return {
    id: Number(body.id ?? fallback?.id ?? 0),
    api_key_id: body.api_key_id ?? body.apiKeyId ?? body.key_id ?? body.keyId ?? fallback?.api_key_id,
    provider: String(body.provider ?? fallback?.provider ?? ''),
    api_format: body.api_format === undefined && body.apiFormat === undefined
      ? fallback?.api_format
      : String(body.api_format ?? body.apiFormat ?? ''),
    display_name: String(body.display_name ?? body.displayName ?? fallback?.display_name ?? ''),
    model_name: String(body.model_name ?? body.modelName ?? fallback?.model_name ?? ''),
    capabilities: body.capabilities && typeof body.capabilities === 'object' ? body.capabilities : (fallback?.capabilities ?? {}),
    health_status: String(body.health_status ?? body.healthStatus ?? fallback?.health_status ?? 'unknown'),
    is_active: coerceBoolean(body.is_active ?? body.isActive, fallback?.is_active ?? true),
    is_favorite: coerceBoolean(body.is_favorite ?? body.isFavorite, fallback?.is_favorite ?? false),
    is_manual: coerceBoolean(body.is_manual ?? body.isManual, fallback?.is_manual ?? true),
    context_ui_params: body.context_ui_params && typeof body.context_ui_params === 'object'
      ? body.context_ui_params
      : body.contextUiParams && typeof body.contextUiParams === 'object'
        ? body.contextUiParams
        : (fallback?.context_ui_params ?? {}),
    last_tested_at: String(body.last_tested_at ?? body.lastTestedAt ?? fallback?.last_tested_at ?? ''),
    last_error: String(body.last_error ?? body.lastError ?? fallback?.last_error ?? ''),
  }
}

export function registerModelRoutes(app: Express, getWorkspace: () => string) {
  app.get(['/models', '/api/models', '/api/models/'], async (req, res) => {
    try {
      const keyId = Number(req.query.key_id || req.query.keyId || req.query.api_key_id || 0)
      const mode = String(req.query.mode || '').trim()
      let models = (await readModels(getWorkspace())).filter(model => model.is_active !== false)
      if (keyId) models = models.filter(model => Number(model.api_key_id || 0) === keyId)
      if (mode) models = models.filter(model => modelMatchesMode(model, mode))
      res.json(models)
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.post(['/models/sync/:keyId', '/models/sync/:keyId/', '/api/models/sync/:keyId', '/api/models/sync/:keyId/'], async (req, res) => {
    try {
      const keyId = Number(req.params.keyId || 0)
      const result = await syncModelsForKey(getWorkspace(), keyId, req.body || {})
      res.json({
        status: 'success',
        message: result.message || `同步完成，为该 Key 更新了 ${result.synced ?? 0} 个模型`,
        ...result,
      })
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error)
      const lower = message.toLowerCase()
      if (lower.includes('key not found')) return res.status(404).json(errorBody('未找到该 API Key，请刷新页面重试'))
      if (lower.includes('key is disabled')) return res.status(400).json(errorBody('该 API Key 未启用，无法同步'))
      return res.status(500).json(errorBody(`同步服务内部错误: ${message}`))
    }
  })

  app.post(['/models', '/api/models', '/api/models/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const models = await readModels(activeWorkspace)
      const apiKeyId = Number(req.body?.api_key_id ?? req.body?.apiKeyId ?? req.body?.key_id ?? req.body?.keyId ?? 0)
      const modelName = String(req.body?.model_name ?? req.body?.modelName ?? '')
      if (apiKeyId) {
        const keys = await readKeys(activeWorkspace)
        if (!keys.some(key => key.id === apiKeyId)) {
          return res.status(404).json(errorBody('绑定的 API Key 不存在'))
        }
      }
      if (models.some(item => Number(item.api_key_id || 0) === apiKeyId && item.model_name === modelName)) {
        return res.status(400).json(errorBody('已存在相同代号的模型，请勿重复添加'))
      }
      const model = normalizeModelInput({ ...req.body, id: models.reduce((max, item) => Math.max(max, item.id), 0) + 1 })
      model.last_tested_at = model.last_tested_at || nowIso()
      const next = [...models, model]
      await writeModels(activeWorkspace, next)
      res.json({ ...model, status: 'success' })
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.put(['/models/:id', '/models/:id/', '/api/models/:id', '/api/models/:id/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const models = await readModels(activeWorkspace)
      const id = Number(req.params.id)
      const current = models.find(model => model.id === id)
      if (!current) return res.status(404).json(errorBody('model not found'))
      const next = models.map(model => model.id === id ? normalizeModelInput({ ...req.body, id }, model) : model)
      await writeModels(activeWorkspace, next)
      const updated = next.find(item => item.id === id)
      res.json({ ...updated, status: 'success', model: updated })
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.delete(['/models/:id', '/models/:id/', '/api/models/:id', '/api/models/:id/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const models = await readModels(activeWorkspace)
      const id = Number(req.params.id)
      const model = models.find(item => item.id === id)
      if (!model) return res.status(404).json(errorBody('model not found'))
      if (model.is_manual === false) return res.status(403).json(errorBody('官方同步的模型禁止手动删除'))
      await writeModels(activeWorkspace, models.filter(model => model.id !== id))
      res.json({ ok: true, status: 'success' })
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.post(['/models/:id/test', '/models/:id/test/', '/api/models/:id/test', '/api/models/:id/test/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const models = await readModels(activeWorkspace)
      const id = Number(req.params.id)
      const model = models.find(item => item.id === id)
      if (!model) return res.status(404).json(errorBody('model not found'))

      const probeResult = await runModelProbe(model, activeWorkspace)

      // Persist health status back to store
      const testedAt = nowIso()
      const lastError = probeResult.status === 'healthy' ? '' : probeResult.message
      const next = models.map(m => m.id === id
        ? { ...m, health_status: probeResult.status, last_tested_at: testedAt, last_error: lastError }
        : m)
      await writeModels(activeWorkspace, next)

      res.json({
        status: probeResult.status,
        message: probeResult.message,
        last_tested_at: testedAt,
        last_error: lastError,
      })
    } catch (error) {
      const classified = classifyHealthError(error)
      res.json({ status: classified.status, message: classified.message, last_tested_at: nowIso() })
    }
  })

  app.put(['/models/bulk/ui-params', '/models/bulk/ui-params/', '/api/models/bulk/ui-params', '/api/models/bulk/ui-params/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const models = await readModels(activeWorkspace)
      const apiKeyId = Number(req.body.api_key_id ?? req.body.apiKeyId ?? req.body.key_id ?? req.body.keyId ?? 0)
      const capability = String(req.body.capability || '')
      const uiParamsArray = Array.isArray(req.body.ui_params_array)
        ? req.body.ui_params_array
        : Array.isArray(req.body.uiParamsArray)
          ? req.body.uiParamsArray
          : []
      let updatedCount = 0
      const updated = models.map(model => {
        if (Number(model.api_key_id || 0) !== apiKeyId || !model.capabilities?.[capability]) return model
        const nextParams = { ...(model.context_ui_params || {}) }
        nextParams[capability] = uiParamsArray
        updatedCount += 1
        return { ...model, context_ui_params: nextParams }
      })
      if (updatedCount === 0) {
        return res.json({ status: 'success', message: '成功更新 0 个模型' })
      }
      await writeModels(activeWorkspace, updated)
      res.json({ status: 'success', message: `成功更新 ${updatedCount} 个模型` })
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.put(['/models/:id/ui-params', '/models/:id/ui-params/', '/api/models/:id/ui-params', '/api/models/:id/ui-params/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const models = await readModels(activeWorkspace)
      const id = Number(req.params.id)
      const model = models.find(item => item.id === id)
      if (!model) return res.status(404).json(errorBody('模型未找到'))
      const contextUiParams = req.body?.context_ui_params && typeof req.body.context_ui_params === 'object'
        ? req.body.context_ui_params
        : req.body?.contextUiParams && typeof req.body.contextUiParams === 'object'
          ? req.body.contextUiParams
          : {}
      const hasApiFormat = req.body && (Object.prototype.hasOwnProperty.call(req.body, 'api_format') || Object.prototype.hasOwnProperty.call(req.body, 'apiFormat'))
      const apiFormat = hasApiFormat ? String(req.body.api_format ?? req.body.apiFormat ?? '') : model.api_format
      const next = models.map(item => item.id === id
        ? {
            ...item,
            api_format: apiFormat,
            context_ui_params: contextUiParams,
          }
        : item)
      await writeModels(activeWorkspace, next)
      res.json({ status: 'success' })
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.patch(['/models/:id/favorite', '/models/:id/favorite/', '/api/models/:id/favorite', '/api/models/:id/favorite/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const models = await readModels(activeWorkspace)
      const id = Number(req.params.id)
      const current = models.find(model => model.id === id)
      if (!current) return res.status(404).json(errorBody('model not found'))
      const next = models.map(model => model.id === id ? { ...model, is_favorite: coerceBoolean(req.body?.is_favorite ?? req.body?.isFavorite, false) } : model)
      await writeModels(activeWorkspace, next)
      const updated = next.find(item => item.id === id)
      res.json({ status: 'success', is_favorite: updated.is_favorite, model: updated })
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })
}

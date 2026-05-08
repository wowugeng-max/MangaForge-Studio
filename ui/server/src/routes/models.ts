import type { Express } from 'express'
import { readModels, writeModels, type ModelRecord } from '../model-store'
import { readKeys } from '../key-store'
import { readProviders } from '../provider-store'
import { ConfiguredProviderAdapter } from '../llm/adapter'
import type { LLMRequest, LLMMessage } from '../llm/types'

function nowIso() {
  return new Date().toISOString()
}

// ── 模型健康探针 ──

const OFFICIAL_TEST_IMAGE = 'https://img.alicdn.com/tfs/TB1p.bgQXXXXXbFXFXXXXXXXXXX-500-500.png'

function determineProbeType(capabilities?: Record<string, boolean>): string {
  if (!capabilities) return 'chat'
  for (const priority of ['text_to_image', 'image_to_image', 'text_to_video', 'image_to_video', 'vision', 'chat']) {
    if (capabilities[priority]) return priority
  }
  return 'chat'
}

function buildProbeRequest(probeType: string, modelName: string): LLMRequest {
  if (probeType === 'chat') {
    return {
      model: modelName,
      messages: [{ role: 'user', content: 'Return exactly: OK' }],
      temperature: 0,
      max_tokens: 16,
    }
  }
  if (probeType === 'vision') {
    return {
      model: modelName,
      messages: [{
        role: 'user',
        content: 'Return exactly: OK',
      }],
      temperature: 0,
      max_tokens: 16,
    }
  }
  // image/video types — send a minimal text-to-image request
  return {
    model: modelName,
    messages: [{ role: 'user', content: 'A simple white circle on a black background.' }],
    temperature: 0,
    max_tokens: 16,
  }
}

function classifyHealthError(error: unknown): { status: string; message: string } {
  const msg = String(error || '').toLowerCase()
  if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
    return { status: 'quota_exhausted', message: '测试失败：额度耗尽' }
  }
  if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') || msg.includes('auth')) {
    return { status: 'unauthorized', message: '测试失败：认证失败 / 无权限' }
  }
  if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('network')) {
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
    return classifyHealthError(error)
  }
}

function normalizeModelInput(body: any, fallback?: ModelRecord): ModelRecord {
  return {
    id: Number(body.id ?? fallback?.id ?? 0),
    api_key_id: body.api_key_id ?? fallback?.api_key_id,
    provider: String(body.provider ?? fallback?.provider ?? ''),
    display_name: String(body.display_name ?? fallback?.display_name ?? ''),
    model_name: String(body.model_name ?? fallback?.model_name ?? ''),
    capabilities: body.capabilities && typeof body.capabilities === 'object' ? body.capabilities : (fallback?.capabilities ?? {}),
    health_status: String(body.health_status ?? fallback?.health_status ?? 'unknown'),
    is_favorite: Boolean(body.is_favorite ?? fallback?.is_favorite ?? false),
    is_manual: Boolean(body.is_manual ?? fallback?.is_manual ?? true),
    context_ui_params: body.context_ui_params && typeof body.context_ui_params === 'object' ? body.context_ui_params : (fallback?.context_ui_params ?? {}),
    last_tested_at: String(body.last_tested_at ?? fallback?.last_tested_at ?? ''),
  }
}

export function registerModelRoutes(app: Express, getWorkspace: () => string) {
  app.get(['/models', '/api/models', '/api/models/'], async (req, res) => {
    try {
      const keyId = Number(req.query.key_id || req.query.keyId || req.query.api_key_id || 0)
      const models = await readModels(getWorkspace())
      res.json(keyId ? models.filter(model => Number(model.api_key_id || 0) === keyId) : models)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post(['/models', '/api/models', '/api/models/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const models = await readModels(activeWorkspace)
      const model = normalizeModelInput({ ...req.body, id: models.reduce((max, item) => Math.max(max, item.id), 0) + 1 })
      model.last_tested_at = model.last_tested_at || nowIso()
      const next = [...models, model]
      await writeModels(activeWorkspace, next)
      res.json(model)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put(['/models/:id', '/api/models/:id'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const models = await readModels(activeWorkspace)
      const id = Number(req.params.id)
      const next = models.map(model => model.id === id ? normalizeModelInput(req.body, model) : model)
      await writeModels(activeWorkspace, next)
      const updated = next.find(item => item.id === id)
      if (!updated) return res.status(404).json({ error: 'model not found' })
      res.json(updated)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.delete(['/models/:id', '/api/models/:id'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const models = await readModels(activeWorkspace)
      const id = Number(req.params.id)
      await writeModels(activeWorkspace, models.filter(model => model.id !== id))
      res.json({ ok: true })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post(['/models/:id/test', '/api/models/:id/test'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const models = await readModels(activeWorkspace)
      const id = Number(req.params.id)
      const model = models.find(item => item.id === id)
      if (!model) return res.status(404).json({ error: 'model not found' })

      const probeResult = await runModelProbe(model, activeWorkspace)

      // Persist health status back to store
      const next = models.map(m => m.id === id
        ? { ...m, health_status: probeResult.status, last_tested_at: nowIso() }
        : m)
      await writeModels(activeWorkspace, next)

      res.json({
        status: probeResult.status,
        message: probeResult.message,
        last_tested_at: nowIso(),
      })
    } catch (error) {
      const classified = classifyHealthError(error)
      res.json({ status: classified.status, message: classified.message, last_tested_at: nowIso() })
    }
  })

  app.put(['/models/bulk/ui-params', '/api/models/bulk/ui-params'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const models = await readModels(activeWorkspace)
      const capability = String(req.body.capability || '')
      const uiParamsArray = Array.isArray(req.body.ui_params_array) ? req.body.ui_params_array : []
      const updated = models.map(model => {
        const nextParams = { ...(model.context_ui_params || {}) }
        nextParams[capability] = uiParamsArray
        return { ...model, context_ui_params: nextParams }
      })
      await writeModels(activeWorkspace, updated)
      res.json({ status: 'success', message: `成功更新 ${updated.length} 个模型` })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.patch(['/models/:id/favorite', '/api/models/:id/favorite'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const models = await readModels(activeWorkspace)
      const id = Number(req.params.id)
      const next = models.map(model => model.id === id ? { ...model, is_favorite: Boolean(req.body?.is_favorite) } : model)
      await writeModels(activeWorkspace, next)
      const updated = next.find(item => item.id === id)
      if (!updated) return res.status(404).json({ error: 'model not found' })
      res.json(updated)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}

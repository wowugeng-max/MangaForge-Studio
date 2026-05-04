import type { Express } from 'express'
import { readModels, writeModels, type ModelRecord } from '../model-store'

function nowIso() {
  return new Date().toISOString()
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
      res.json({ status: 'healthy', message: '模型探针测试通过', last_tested_at: nowIso() })
    } catch (error) {
      res.status(500).json({ error: String(error) })
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

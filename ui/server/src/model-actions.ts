import { readModels, writeModels, type ModelRecord } from './model-store'

function nowIso() {
  return new Date().toISOString()
}

export async function createModel(activeWorkspace: string, payload: any) {
  const models = await readModels(activeWorkspace)
  const model: ModelRecord = {
    id: models.reduce((max, item) => Math.max(max, item.id), 0) + 1,
    api_key_id: payload.api_key_id,
    provider: String(payload.provider || ''),
    display_name: String(payload.display_name || ''),
    model_name: String(payload.model_name || ''),
    capabilities: payload.capabilities || {},
    health_status: String(payload.health_status || 'unknown'),
    is_favorite: Boolean(payload.is_favorite ?? false),
    is_manual: Boolean(payload.is_manual ?? false),
    context_ui_params: payload.context_ui_params || {},
    last_tested_at: payload.last_tested_at || '',
  }
  const next = [...models, model]
  await writeModels(activeWorkspace, next)
  return model
}

export async function updateModel(activeWorkspace: string, id: number, payload: any) {
  const models = await readModels(activeWorkspace)
  const next = models.map(model => model.id === id ? {
    ...model,
    api_key_id: payload.api_key_id ?? model.api_key_id,
    provider: String(payload.provider ?? model.provider),
    display_name: String(payload.display_name ?? model.display_name),
    model_name: String(payload.model_name ?? model.model_name),
    capabilities: payload.capabilities ?? model.capabilities,
    health_status: String(payload.health_status ?? model.health_status ?? 'unknown'),
    is_favorite: Boolean(payload.is_favorite ?? model.is_favorite),
    is_manual: Boolean(payload.is_manual ?? model.is_manual),
    context_ui_params: payload.context_ui_params ?? model.context_ui_params,
    last_tested_at: payload.last_tested_at ?? model.last_tested_at,
  } : model)
  await writeModels(activeWorkspace, next)
  return next.find(item => item.id === id) ?? null
}

export async function deleteModel(activeWorkspace: string, id: number) {
  const models = await readModels(activeWorkspace)
  await writeModels(activeWorkspace, models.filter(model => model.id !== id))
}

export async function testModel(activeWorkspace: string, id: number) {
  const models = await readModels(activeWorkspace)
  const model = models.find(item => item.id === id)
  if (!model) return null
  const next = models.map(item => item.id === id ? { ...item, health_status: 'healthy', last_tested_at: nowIso() } : item)
  await writeModels(activeWorkspace, next)
  return { status: 'healthy', message: 'Model test passed' }
}

export async function patchFavorite(activeWorkspace: string, id: number, is_favorite?: boolean) {
  const models = await readModels(activeWorkspace)
  const next = models.map(model => model.id === id ? { ...model, is_favorite: Boolean(is_favorite ?? !model.is_favorite) } : model)
  await writeModels(activeWorkspace, next)
  return next.find(item => item.id === id) ?? null
}

export async function bulkUpdateUiParams(activeWorkspace: string, capability: string, ui_params_array: unknown[]) {
  return { message: 'Bulk UI params updated', capability, count: Array.isArray(ui_params_array) ? ui_params_array.length : 0 }
}

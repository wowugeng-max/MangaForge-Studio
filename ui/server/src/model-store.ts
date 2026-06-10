import { readFile, writeFile } from 'fs/promises'
import { readFileSync } from 'fs'
import { join } from 'path'
import { coerceBoolean } from './boolean-utils'

export type ModelRecord = {
  id: number
  api_key_id?: number
  provider: string
  api_format?: string
  display_name: string
  model_name: string
  capabilities?: Record<string, boolean>
  health_status?: string
  is_active?: boolean
  is_favorite?: boolean
  is_manual?: boolean
  context_ui_params?: Record<string, unknown>
  last_tested_at?: string
}

const DEFAULT_MODEL_CAPABILITIES = {
  chat: false,
  vision: false,
  text_to_image: false,
  image_to_image: false,
  text_to_video: false,
  image_to_video: false,
}

export function getModelsPath(activeWorkspace: string) {
  return join(activeWorkspace, 'models.json')
}

function objectOrEmpty(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function normalizeModelRecord(raw: Partial<ModelRecord> & Record<string, any>): ModelRecord {
  const modelName = String(raw.model_name ?? raw.modelName ?? '')
  return {
    ...raw,
    id: Number(raw.id ?? 0),
    api_key_id: raw.api_key_id === undefined && raw.apiKeyId === undefined && raw.key_id === undefined && raw.keyId === undefined
      ? undefined
      : Number(raw.api_key_id ?? raw.apiKeyId ?? raw.key_id ?? raw.keyId),
    provider: String(raw.provider ?? ''),
    api_format: raw.api_format === undefined && raw.apiFormat === undefined ? undefined : String(raw.api_format ?? raw.apiFormat ?? ''),
    display_name: String(raw.display_name ?? raw.displayName ?? modelName),
    model_name: modelName,
    capabilities: {
      ...DEFAULT_MODEL_CAPABILITIES,
      ...objectOrEmpty(raw.capabilities),
    } as Record<string, boolean>,
    health_status: String(raw.health_status ?? raw.healthStatus ?? 'unknown'),
    is_active: coerceBoolean(raw.is_active ?? raw.isActive, true),
    is_favorite: coerceBoolean(raw.is_favorite ?? raw.isFavorite, false),
    is_manual: coerceBoolean(raw.is_manual ?? raw.isManual, false),
    context_ui_params: objectOrEmpty(raw.context_ui_params ?? raw.contextUiParams),
    last_tested_at: String(raw.last_tested_at ?? raw.lastTestedAt ?? ''),
  }
}

export async function readModels(activeWorkspace: string): Promise<ModelRecord[]> {
  try {
    const data = JSON.parse(await readFile(getModelsPath(activeWorkspace), 'utf8')) as ModelRecord[]
    // Guard: ensure we always return an array, never undefined/null
    return Array.isArray(data) ? data.map(item => normalizeModelRecord(item as any)) : []
  } catch {
    return []
  }
}

/**
 * Sync wrapper for readModels — ensures callers get a proper array.
 * IMPORTANT: readModels is async; calling it without await returns a Promise,
 * and Promise.find() will throw "readModels().find is not a function".
 * Always use: const models = await readModels(workspace)
 */
export function readModelsSync(activeWorkspace: string): ModelRecord[] {
  try {
    const data = JSON.parse(readFileSync(getModelsPath(activeWorkspace), 'utf8')) as ModelRecord[]
    return Array.isArray(data) ? data.map(item => normalizeModelRecord(item as any)) : []
  } catch {
    return []
  }
}

export async function writeModels(activeWorkspace: string, models: ModelRecord[]) {
  await writeFile(getModelsPath(activeWorkspace), `${JSON.stringify(models, null, 2)}\n`, 'utf8')
}

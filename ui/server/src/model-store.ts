import { readFile, writeFile } from 'fs/promises'
import { readFileSync } from 'fs'
import { join } from 'path'

export type ModelRecord = {
  id: number
  api_key_id?: number
  provider: string
  display_name: string
  model_name: string
  capabilities?: Record<string, boolean>
  health_status?: string
  is_favorite?: boolean
  is_manual?: boolean
  context_ui_params?: Record<string, unknown>
  last_tested_at?: string
}

export function getModelsPath(activeWorkspace: string) {
  return join(activeWorkspace, 'models.json')
}

export async function readModels(activeWorkspace: string): Promise<ModelRecord[]> {
  try {
    const data = JSON.parse(await readFile(getModelsPath(activeWorkspace), 'utf8')) as ModelRecord[]
    // Guard: ensure we always return an array, never undefined/null
    return Array.isArray(data) ? data : []
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
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function writeModels(activeWorkspace: string, models: ModelRecord[]) {
  await writeFile(getModelsPath(activeWorkspace), `${JSON.stringify(models, null, 2)}\n`, 'utf8')
}

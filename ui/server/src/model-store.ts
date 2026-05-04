import { readFile, writeFile } from 'fs/promises'
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
    return JSON.parse(await readFile(getModelsPath(activeWorkspace), 'utf8')) as ModelRecord[]
  } catch {
    return []
  }
}

export async function writeModels(activeWorkspace: string, models: ModelRecord[]) {
  await writeFile(getModelsPath(activeWorkspace), `${JSON.stringify(models, null, 2)}\n`, 'utf8')
}

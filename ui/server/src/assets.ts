import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

export type AssetRecord = {
  id: number
  name: string
  description?: string
  type: string
  tags?: string[]
  project_id?: number | null
  thumbnail?: string
  data?: Record<string, any>
  version?: number
  parent_id?: number | null
  source_asset_ids?: number[]
  file_path?: string
  created_at?: string
  updated_at: string
}

export function getAssetsPath(activeWorkspace: string) {
  return join(activeWorkspace, 'assets.json')
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => String(item)).filter(Boolean) : []
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
}

function optionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeAssetData(data: unknown): Record<string, any> {
  const record = asObject(data)
  const normalized = { ...record }
  if (normalized.file_path === undefined && normalized.filePath !== undefined) normalized.file_path = normalized.filePath
  if (normalized.negative_prompt === undefined && normalized.negativePrompt !== undefined) normalized.negative_prompt = normalized.negativePrompt
  if (normalized.workflow_json === undefined && normalized.workflowJson !== undefined) normalized.workflow_json = normalized.workflowJson
  return normalized
}

export function normalizeAssetRecord(asset: Partial<AssetRecord> & Record<string, any>): AssetRecord {
  const timestamp = String(asset.created_at || asset.createdAt || asset.updated_at || asset.updatedAt || new Date().toISOString())
  const projectId = optionalNumber(asset.project_id ?? asset.projectId)
  const sourceAssetIds = asset.source_asset_ids ?? asset.sourceAssetIds
  const filePath = asset.file_path ?? asset.filePath
  return {
    ...asset,
    id: Number(asset.id || 0),
    name: String(asset.name || '未命名资产'),
    description: String(asset.description ?? ''),
    type: String(asset.type || 'file'),
    tags: asStringArray(asset.tags),
    project_id: projectId,
    thumbnail: String(asset.thumbnail ?? ''),
    data: normalizeAssetData(asset.data),
    version: Number(asset.version || 1),
    parent_id: optionalNumber(asset.parent_id ?? asset.parentId),
    source_asset_ids: Array.isArray(sourceAssetIds)
      ? sourceAssetIds.map((item: unknown) => Number(item)).filter((id: number) => Number.isFinite(id))
      : undefined,
    file_path: filePath == null ? undefined : String(filePath),
    created_at: timestamp,
    updated_at: String(asset.updated_at || asset.updatedAt || timestamp),
  }
}

export async function readAssets(activeWorkspace: string): Promise<AssetRecord[]> {
  try {
    const data = JSON.parse(await readFile(getAssetsPath(activeWorkspace), 'utf8')) as AssetRecord[]
    return Array.isArray(data) ? data.map(item => normalizeAssetRecord(item as any)) : []
  } catch {
    return []
  }
}

export async function writeAssets(activeWorkspace: string, assets: AssetRecord[]) {
  await writeFile(getAssetsPath(activeWorkspace), `${JSON.stringify(assets, null, 2)}\n`, 'utf8')
}

export async function seedAssetsIfEmpty(activeWorkspace: string): Promise<AssetRecord[]> {
  const current = await readAssets(activeWorkspace)
  if (current.length > 0) return current
  await writeAssets(activeWorkspace, [])
  return []
}

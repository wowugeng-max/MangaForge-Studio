import { createHash } from 'node:crypto'
import type { CanvasMediaMode, CanvasReferenceAsset, PromptCompileResult } from './types'

export type CompileCacheInput = {
  packId?: string
  revision?: string
  skillName?: string
  rawPrompt: string
  mode: CanvasMediaMode
  incomingAssets?: CanvasReferenceAsset[]
  nodeParams?: Record<string, unknown>
  arguments?: Record<string, string>
  compilerModelId?: number
}

export type CompileCacheRecord = { key: string; result: PromptCompileResult; createdAt: number; compilerModelId?: number }

const NODE_PARAM_KEYS = ['size', 'aspect_ratio', 'duration', 'cameraParams', 'customMovements'] as const

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`
}

function normalizedAsset(asset: CanvasReferenceAsset) {
  const hasReferenceMetadata = asset.reference_index !== undefined
    || asset.reference_id !== undefined
    || asset.reference_role !== undefined
  const normalized: Record<string, unknown> = {
    type: asset.type,
    content: typeof asset.content === 'string' ? asset.content : undefined,
    url: typeof asset.url === 'string' ? asset.url : undefined,
    // Preserve ordered asset provenance; changing lineage order must invalidate.
    source_asset_ids: Array.isArray(asset.source_asset_ids) ? [...asset.source_asset_ids].map(Number) : undefined,
  }
  // Keep the legacy no-reference canonical string byte-for-byte compatible.
  // Once any binding metadata is present, include all three fields so a change
  // in index, id, or role invalidates the compile cache deterministically.
  if (hasReferenceMetadata) {
    normalized.reference_index = asset.reference_index
    normalized.reference_id = asset.reference_id
    normalized.reference_role = asset.reference_role
  }
  return normalized
}

export function canonicalCompileInput(input: CompileCacheInput): string {
  const params: Record<string, unknown> = {}
  for (const key of NODE_PARAM_KEYS) if (input.nodeParams && input.nodeParams[key] !== undefined) params[key] = input.nodeParams[key]
  const assets = (input.incomingAssets ?? []).map(normalizedAsset)
  const args = Object.fromEntries(Object.entries(input.arguments ?? {}).sort(([a], [b]) => a.localeCompare(b)))
  const canonicalInput: Record<string, unknown> = { packId: input.packId ?? '', revision: input.revision ?? '', skillName: input.skillName ?? '', rawPrompt: input.rawPrompt, mode: input.mode, arguments: args, incomingAssets: assets, nodeParams: params }
  // Keep legacy callers that do not yet supply model identity byte-compatible,
  // while compiler execution always supplies the resolved effective model id.
  if (input.compilerModelId !== undefined) canonicalInput.compilerModelId = input.compilerModelId
  return canonical(canonicalInput)
}

export function computeCompileInputHash(input: CompileCacheInput): string {
  return createHash('sha256').update(canonicalCompileInput(input)).digest('hex')
}

export function createCompileCache() {
  const stores = new Map<string, Map<string, CompileCacheRecord>>()
  const getStore = (workspace: string) => {
    let store = stores.get(workspace)
    if (!store) { store = new Map(); stores.set(workspace, store) }
    return store
  }
  return {
    getCachedCompile(workspace: string, key: string): CompileCacheRecord | undefined { return getStore(workspace).get(key) },
    putCachedCompile(workspace: string, record: CompileCacheRecord): void { getStore(workspace).set(record.key, record) },
    clear(workspace?: string): void { if (workspace) stores.delete(workspace); else stores.clear() },
  }
}

const defaultCache = createCompileCache()
export const getCachedCompile = defaultCache.getCachedCompile
export const putCachedCompile = defaultCache.putCachedCompile
export const clearCompileCache = defaultCache.clear

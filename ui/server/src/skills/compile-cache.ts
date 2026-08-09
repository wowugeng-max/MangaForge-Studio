import { createHash } from 'node:crypto'
import type { CanvasMediaMode, PromptCompileResult } from './types'

export type CompileCacheInput = {
  packId?: string
  revision?: string
  skillName?: string
  rawPrompt: string
  mode: CanvasMediaMode
  incomingAssets?: Array<{ type: 'image' | 'prompt'; url?: string; content?: string; source_asset_ids?: number[] }>
  nodeParams?: Record<string, unknown>
  arguments?: Record<string, string>
}

export type CompileCacheRecord = { key: string; result: PromptCompileResult; createdAt: number; compilerModelId?: number }

const NODE_PARAM_KEYS = ['size', 'aspect_ratio', 'cameraParams', 'customMovements'] as const

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`
}

function normalizedAsset(asset: CompileCacheInput['incomingAssets'] extends Array<infer T> ? T : never) {
  return {
    type: asset.type,
    content: typeof asset.content === 'string' ? asset.content : undefined,
    url: typeof asset.url === 'string' ? asset.url : undefined,
    // Preserve ordered asset provenance; changing lineage order must invalidate.
    source_asset_ids: Array.isArray(asset.source_asset_ids) ? [...asset.source_asset_ids].map(Number) : undefined,
  }
}

export function canonicalCompileInput(input: CompileCacheInput): string {
  const params: Record<string, unknown> = {}
  for (const key of NODE_PARAM_KEYS) if (input.nodeParams && input.nodeParams[key] !== undefined) params[key] = input.nodeParams[key]
  const assets = (input.incomingAssets ?? []).map(normalizedAsset)
  const args = Object.fromEntries(Object.entries(input.arguments ?? {}).sort(([a], [b]) => a.localeCompare(b)))
  return canonical({ packId: input.packId ?? '', revision: input.revision ?? '', skillName: input.skillName ?? '', rawPrompt: input.rawPrompt, mode: input.mode, arguments: args, incomingAssets: assets, nodeParams: params })
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

import type { Express } from 'express'
import { unlink } from 'fs/promises'
import { isAbsolute, relative, resolve } from 'path'
import { ensureWorkspaceStructure } from '../workspace'
import { seedAssetsIfEmpty, readAssets, writeAssets, type AssetRecord } from '../assets'

function nowIso() {
  return new Date().toISOString()
}

function errorBody(message: unknown) {
  const error = String(message)
  return { error, detail: error }
}

function isTruthyQuery(value: unknown) {
  if (Array.isArray(value)) return isTruthyQuery(value[0])
  return ['true', '1', 'yes', 'on'].includes(String(value || '').toLowerCase())
}

function queryNumber(value: unknown) {
  if (Array.isArray(value)) return queryNumber(value[0])
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

class AssetDataValidationError extends Error {}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
}

function hasOwn(value: Record<string, any>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function requireDataField(record: Record<string, any>, field: string) {
  const value = record[field]
  if (value === undefined || value === null || value === '') throw new AssetDataValidationError(`data.${field} is required`)
  return value
}

function optionalNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeSourceAssetIds(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined
  const ids = value.map(item => Number(item)).filter(id => Number.isFinite(id))
  return ids.length ? ids : []
}

function validateOptionalObject(record: Record<string, any>, field: string) {
  const value = record[field]
  if (value !== undefined && (value === null || typeof value !== 'object' || Array.isArray(value))) {
    throw new AssetDataValidationError(`data.${field} must be an object`)
  }
}

function validateAssetData(type: string, data: unknown) {
  const record = asRecord(data)
  const filePath = record.file_path ?? record.filePath
  switch (type) {
    case 'image':
      requireDataField({ ...record, file_path: filePath }, 'file_path')
      return {
        ...record,
        file_path: String(filePath),
        width: optionalNumber(record.width),
        height: optionalNumber(record.height),
        format: record.format == null ? 'png' : String(record.format),
      }
    case 'video':
      requireDataField({ ...record, file_path: filePath }, 'file_path')
      return {
        ...record,
        file_path: String(filePath),
        width: optionalNumber(record.width),
        height: optionalNumber(record.height),
        duration: optionalNumber(record.duration),
        fps: optionalNumber(record.fps),
        format: record.format == null ? undefined : String(record.format),
      }
    case 'prompt':
      requireDataField(record, 'content')
      return {
        ...record,
        content: String(record.content),
        negative_prompt: record.negative_prompt == null && record.negativePrompt == null ? '' : String(record.negative_prompt ?? record.negativePrompt),
      }
    case 'workflow':
      if (record.workflow_json === undefined && record.workflowJson !== undefined) record.workflow_json = record.workflowJson
      validateOptionalObject(record, 'workflow_json')
      validateOptionalObject(record, 'parameters')
      return record
    case 'node_config':
      requireDataField(record, 'nodeType')
      requireDataField(record, 'config')
      validateOptionalObject(record, 'config')
      return { ...record, nodeType: String(record.nodeType) }
    case 'node_template':
      if (!Array.isArray(record.nodes)) throw new AssetDataValidationError('data.nodes must be an array')
      if (!Array.isArray(record.edges)) throw new AssetDataValidationError('data.edges must be an array')
      return record
    default:
      return record
  }
}

function sendAssetError(res: any, error: unknown) {
  if (error instanceof AssetDataValidationError) return res.status(400).json(errorBody(error.message))
  return res.status(500).json(errorBody(error))
}

async function removeLocalMediaFile(activeWorkspace: string, asset?: AssetRecord) {
  const filePath = String(asset?.data?.file_path || asset?.data?.filePath || asset?.file_path || (asset as any)?.filePath || '').trim()
  if (!filePath || /^(https?:|data:)/i.test(filePath)) return
  const mediaRoots = [
    resolve(activeWorkspace, 'assets'),
    resolve(activeWorkspace, 'data', 'assets'),
  ]
  const absolutePath = isAbsolute(filePath) ? resolve(filePath) : resolve(activeWorkspace, filePath)
  const isInsideAllowedMediaRoot = mediaRoots.some(root => {
    const mediaRelative = relative(root, absolutePath)
    return mediaRelative === '' || (!!mediaRelative && !mediaRelative.startsWith('..') && !isAbsolute(mediaRelative))
  })
  if (!isInsideAllowedMediaRoot) return
  try {
    await unlink(absolutePath)
  } catch {
    // Asset records may point at files already cleaned up by external tools.
  }
}

export function registerAssetCrudRoutes(app: Express, getWorkspace: () => string) {
  app.get(['/api/assets', '/api/assets/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      await ensureWorkspaceStructure(activeWorkspace)
      const type = String(req.query.type || '').trim()
      const projectId = queryNumber(req.query.project_id ?? req.query.projectId)
      const isGlobal = isTruthyQuery(req.query.is_global ?? req.query.isGlobal)
      const skip = Math.max(0, queryNumber(req.query.skip) ?? 0)
      const limit = Math.max(1, Math.min(1000, queryNumber(req.query.limit) ?? 100))
      let assets = await seedAssetsIfEmpty(activeWorkspace)
      if (type) assets = assets.filter(asset => asset.type === type)
      if (isGlobal) {
        assets = assets.filter(asset => asset.project_id == null)
      } else if (projectId !== null) {
        assets = assets.filter(asset => Number(asset.project_id) === projectId)
      }
      res.json(assets.slice(skip, skip + limit))
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.get(['/api/assets/:id', '/api/assets/:id/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const assets = await seedAssetsIfEmpty(activeWorkspace)
      const asset = assets.find(item => item.id === Number(req.params.id))
      if (!asset) return res.status(404).json(errorBody('asset not found'))
      res.json(asset)
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.post(['/api/assets', '/api/assets/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const assets = await readAssets(activeWorkspace)
      const timestamp = nowIso()
      const type = String(req.body.type || 'file')
      const data = validateAssetData(type, req.body.data || {})
      const sourceAssetIds = normalizeSourceAssetIds(req.body.source_asset_ids ?? req.body.sourceAssetIds ?? data.source_asset_ids ?? data.sourceAssetIds)
      const filePath = req.body.file_path ?? req.body.filePath ?? data.file_path
      const asset: AssetRecord = {
        id: assets.reduce((max, item) => Math.max(max, item.id), 0) + 1,
        name: String(req.body.name || '未命名资产'),
        description: String(req.body.description || ''),
        type,
        tags: Array.isArray(req.body.tags) ? req.body.tags : [],
        project_id: req.body.project_id ?? req.body.projectId ?? null,
        thumbnail: String(req.body.thumbnail || ''),
        data,
        ...(sourceAssetIds !== undefined ? { source_asset_ids: sourceAssetIds } : {}),
        ...(filePath ? { file_path: String(filePath) } : {}),
        version: 1,
        created_at: timestamp,
        updated_at: timestamp,
      }
      const next = [...assets, asset]
      await writeAssets(activeWorkspace, next)
      res.json(asset)
    } catch (error) {
      sendAssetError(res, error)
    }
  })

  app.put(['/api/assets/:id', '/api/assets/:id/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const assets = await readAssets(activeWorkspace)
      const id = Number(req.params.id)
      const original = assets.find(asset => asset.id === id)
      if (!original) return res.status(404).json(errorBody('asset not found'))
      const timestamp = nowIso()
      const hasProjectId = hasOwn(req.body || {}, 'project_id') || hasOwn(req.body || {}, 'projectId')
      const data = req.body.data !== undefined ? validateAssetData(original.type, req.body.data) : original.data ?? {}
      const asset: AssetRecord = {
        ...original,
        id: assets.reduce((max, item) => Math.max(max, item.id), 0) + 1,
        name: String(req.body.name ?? original.name),
        description: String(req.body.description ?? original.description ?? ''),
        type: original.type,
        tags: Array.isArray(req.body.tags) ? req.body.tags : original.tags,
        project_id: hasProjectId ? (req.body.project_id ?? req.body.projectId ?? null) : (original.project_id ?? null),
        thumbnail: req.body.thumbnail ?? original.thumbnail,
        data,
        version: Number(original.version || 1) + 1,
        parent_id: original.id,
        source_asset_ids: normalizeSourceAssetIds(req.body.source_asset_ids ?? req.body.sourceAssetIds) ?? original.source_asset_ids,
        file_path: req.body.file_path ?? req.body.filePath ?? original.file_path,
        created_at: timestamp,
        updated_at: timestamp,
      }
      const next = [...assets, asset]
      await writeAssets(activeWorkspace, next)
      res.json(asset)
    } catch (error) {
      sendAssetError(res, error)
    }
  })

  app.patch(['/api/assets/:id/project', '/api/assets/:id/project/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const assets = await readAssets(activeWorkspace)
      const id = Number(req.params.id)
      const rawProjectId = req.body.project_id ?? req.body.projectId
      const projectId = rawProjectId == null ? null : Number(rawProjectId)
      const next = assets.map(asset => asset.id === id ? {
        ...asset,
        project_id: Number.isFinite(projectId) ? projectId : null,
        updated_at: nowIso(),
      } : asset)
      const asset = next.find(item => item.id === id)
      if (!asset) return res.status(404).json(errorBody('asset not found'))
      await writeAssets(activeWorkspace, next)
      res.json(asset)
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.delete(['/api/assets/:id', '/api/assets/:id/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const assets = await readAssets(activeWorkspace)
      const id = Number(req.params.id)
      const asset = assets.find(item => item.id === id)
      if (!asset) return res.status(404).json(errorBody('asset not found'))
      await removeLocalMediaFile(activeWorkspace, asset)
      await writeAssets(activeWorkspace, assets.filter(asset => asset.id !== id))
      res.status(204).send()
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })
}

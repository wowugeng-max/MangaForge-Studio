import type { Express } from 'express'
import { ensureWorkspaceStructure } from '../workspace'
import { seedAssetsIfEmpty, readAssets, writeAssets, type AssetRecord } from '../assets'

function nowIso() {
  return new Date().toISOString()
}

export function registerAssetCrudRoutes(app: Express, getWorkspace: () => string) {
  app.get('/api/assets', async (_req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      await ensureWorkspaceStructure(activeWorkspace)
      res.json({ assets: await seedAssetsIfEmpty(activeWorkspace) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/assets/:id', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const assets = await seedAssetsIfEmpty(activeWorkspace)
      const asset = assets.find(item => item.id === Number(req.params.id))
      if (!asset) return res.status(404).json({ error: 'asset not found' })
      res.json({ asset })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/assets', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const assets = await readAssets(activeWorkspace)
      const asset: AssetRecord = {
        id: assets.reduce((max, item) => Math.max(max, item.id), 0) + 1,
        name: String(req.body.name || '未命名资产'),
        description: String(req.body.description || ''),
        type: String(req.body.type || 'file'),
        tags: Array.isArray(req.body.tags) ? req.body.tags : [],
        project_id: req.body.project_id ?? null,
        thumbnail: String(req.body.thumbnail || ''),
        data: req.body.data || {},
        updated_at: nowIso(),
      }
      const next = [...assets, asset]
      await writeAssets(activeWorkspace, next)
      res.json({ asset, assets: next })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/assets/:id', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const assets = await readAssets(activeWorkspace)
      const id = Number(req.params.id)
      const next = assets.map(asset => asset.id === id ? {
        ...asset,
        name: String(req.body.name ?? asset.name),
        description: String(req.body.description ?? asset.description ?? ''),
        type: String(req.body.type ?? asset.type),
        tags: Array.isArray(req.body.tags) ? req.body.tags : asset.tags,
        project_id: req.body.project_id ?? asset.project_id ?? null,
        thumbnail: req.body.thumbnail ?? asset.thumbnail,
        data: req.body.data ?? asset.data ?? {},
        updated_at: nowIso(),
      } : asset)
      await writeAssets(activeWorkspace, next)
      const asset = next.find(item => item.id === id)
      if (!asset) return res.status(404).json({ error: 'asset not found' })
      res.json({ asset })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.delete('/api/assets/:id', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const assets = await readAssets(activeWorkspace)
      const id = Number(req.params.id)
      await writeAssets(activeWorkspace, assets.filter(asset => asset.id !== id))
      res.json({ ok: true })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}

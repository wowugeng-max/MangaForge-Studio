import type { Express } from 'express'
import { ensureWorkspaceStructure } from '../workspace'
import { readCanvasState, writeCanvasState, type CanvasState } from '../canvas-store'

function nowIso() {
  return new Date().toISOString()
}

export function registerCanvasRoutes(app: Express, getWorkspace: () => string) {
  app.get('/api/canvas/:projectId', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projectId = Number(req.params.projectId)
      await ensureWorkspaceStructure(activeWorkspace)
      const state = await readCanvasState(activeWorkspace, projectId)
      res.json({ canvas: state ?? { projectId, nodes: [], edges: [], viewport: { zoom: 1, x: 0, y: 0 }, updated_at: nowIso() } })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/canvas/:projectId', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projectId = Number(req.params.projectId)
      const payload = req.body as Partial<CanvasState>
      const canvas: CanvasState = {
        projectId,
        nodes: Array.isArray(payload.nodes) ? payload.nodes : [],
        edges: Array.isArray(payload.edges) ? payload.edges : [],
        viewport: payload.viewport ?? { zoom: 1, x: 0, y: 0 },
        updated_at: nowIso(),
      }
      await writeCanvasState(activeWorkspace, projectId, canvas)
      res.json({ canvas })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/canvas/:projectId/run', async (req, res) => {
    try {
      const projectId = Number(req.params.projectId)
      res.json({ ok: true, projectId, message: 'canvas run is delegated to pipeline module', payload: req.body ?? {} })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/canvas/:projectId/interrupt', async (req, res) => {
    res.json({ ok: true, projectId: Number(req.params.projectId), interrupted: true })
  })
}

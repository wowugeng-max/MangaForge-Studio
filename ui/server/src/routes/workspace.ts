import type { Express } from 'express'
import {
  WORKSPACE_SWITCH_RESTART_REQUIRED,
  ensureWorkspaceStructure as defaultEnsureWorkspaceStructure,
  saveActiveWorkspace as defaultSaveActiveWorkspace,
} from '../workspace'

type WorkspaceRoutesDeps = {
  ensureWorkspaceStructure?: typeof defaultEnsureWorkspaceStructure
  saveActiveWorkspace?: typeof defaultSaveActiveWorkspace
}

export function registerWorkspaceRoutes(
  app: Express,
  getWorkspace: () => string,
  setWorkspace: (value: string) => void,
  deps: WorkspaceRoutesDeps = {},
) {
  const ensureWorkspaceStructure = deps.ensureWorkspaceStructure || defaultEnsureWorkspaceStructure
  const saveActiveWorkspace = deps.saveActiveWorkspace || defaultSaveActiveWorkspace
  app.get('/api/workspace', async (_req, res) => {
    try {
      await ensureWorkspaceStructure(getWorkspace())
      res.json({ workspace: getWorkspace() })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/workspace/switch', async (req, res) => {
    try {
      const next = String(req.body.workspace || '').trim()
      if (!next) return res.status(400).json({ error: 'workspace is required' })
      setWorkspace(next)
      await ensureWorkspaceStructure(next)
      await saveActiveWorkspace(next)
      res.json({ ok: true, workspace: next })
    } catch (error) {
      if ((error as any)?.code === WORKSPACE_SWITCH_RESTART_REQUIRED) {
        return res.status(409).json({
          error: String((error as any)?.message || error),
          error_code: WORKSPACE_SWITCH_RESTART_REQUIRED,
        })
      }
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/workspace/preflight', async (_req, res) => {
    try {
      await ensureWorkspaceStructure(getWorkspace())
      res.json({
        ok: true,
        workspace: getWorkspace(),
        checks: { workspace_exists: true, story_project_exists: true, series_yaml_exists: true, style_guide_exists: true, episodes_dir_exists: true },
        missing: [],
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}

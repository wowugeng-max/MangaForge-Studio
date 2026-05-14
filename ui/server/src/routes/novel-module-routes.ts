import type { Express } from 'express'
import { novelRouteModules } from './novel-modules'

export function registerNovelModuleRoutes(app: Express) {
  app.get('/api/novel/modules', async (_req, res) => {
    try {
      res.json({ ok: true, modules: novelRouteModules })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}

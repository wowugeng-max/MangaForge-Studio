import type { Express } from 'express'
import { getStatusSnapshot } from '../status'

export function registerStatusRoutes(app: Express, getWorkspace: () => string) {
  app.get('/api/status', async (_req, res) => {
    try {
      res.json(await getStatusSnapshot(getWorkspace()))
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}

import type { Express } from 'express'
import { createLogSnapshot } from '../logs'
import { readLogs } from '../logs-store'

export function registerLogRoutes(app: Express, getWorkspace: () => string) {
  app.get('/api/logs', async (_req, res) => {
    const logs = await readLogs(getWorkspace())
    res.json(createLogSnapshot(logs))
  })
}

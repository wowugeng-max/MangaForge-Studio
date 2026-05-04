import type { Express } from 'express'
import { createRunSnapshot } from '../runs'
import { readRuns } from '../runs-store'

export function registerRunRoutes(app: Express, getWorkspace: () => string) {
  app.get('/api/runs', async (_req, res) => {
    const runs = await readRuns(getWorkspace())
    res.json(createRunSnapshot(runs))
  })
}

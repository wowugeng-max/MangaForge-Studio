import type { Express } from 'express'
import { registerModelRoutes } from '../routes/models'

export function registerModelApi(app: Express, getWorkspace: () => string) {
  return registerModelRoutes(app, getWorkspace)
}

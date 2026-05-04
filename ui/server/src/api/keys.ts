import type { Express } from 'express'
import { registerKeyRoutes } from '../routes/keys'

export function registerKeyApi(app: Express, getWorkspace: () => string) {
  return registerKeyRoutes(app, getWorkspace)
}

import type { Express } from 'express'
import { registerProviderRoutes } from '../routes/providers'

export function registerProviderApi(app: Express, getWorkspace: () => string) {
  return registerProviderRoutes(app, getWorkspace)
}

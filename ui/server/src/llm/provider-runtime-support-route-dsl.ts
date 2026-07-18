/** Route config DSL accessors for provider runtime. */
export function isRouteObject(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function routeDslValue(routeConfig: unknown, snakeKey: string, camelKey: string = snakeKey) {
  if (!isRouteObject(routeConfig)) return undefined
  return routeConfig[snakeKey] ?? routeConfig[camelKey]
}


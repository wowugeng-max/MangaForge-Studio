const productionLeaseCapability = Symbol('mcp-production-lease')
const consumedProductionLeases = new WeakSet<ProductionLease>()

export interface ProductionLease {
  release(): Promise<void>
}

export function attachProductionLease<T extends object>(value: T, lease: ProductionLease): T {
  Object.defineProperty(value, productionLeaseCapability, {
    value: lease,
    enumerable: false,
    configurable: true,
  })
  return value
}

export function takeProductionLease(value: unknown): ProductionLease | undefined {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) return undefined
  if (!Object.prototype.hasOwnProperty.call(value, productionLeaseCapability)) return undefined
  const lease = Reflect.get(value, productionLeaseCapability) as ProductionLease | undefined
  if (!lease || consumedProductionLeases.has(lease)) return undefined
  consumedProductionLeases.add(lease)
  try {
    Reflect.deleteProperty(value, productionLeaseCapability)
  } catch {}
  return lease
}

import type { APIKeyRecord } from '../key-store'
import type { ModelRecord } from '../model-store'
import type { ProviderRecord } from '../provider-store'

export type RuntimeModelSelection = {
  provider: ProviderRecord
  key: APIKeyRecord
  model: ModelRecord
  baseUrl: string
  endpoint: string
  routeConfig?: any
  routeType?: string
  apiFormat: string
}

export type RuntimeRoutingStrategy = 'balanced' | 'cost' | 'speed' | 'random'

export type RuntimeModelSelectionOptions = {
  routingStrategy?: RuntimeRoutingStrategy | string
}

export type RuntimeExecutionOptions = {
  signal?: AbortSignal
  timeoutMs?: number
  maxRetries?: number
  routingStrategy?: RuntimeRoutingStrategy | string
}

type SafeRuntimeModelSelection = Omit<RuntimeModelSelection, 'key'> & {
  key: Omit<APIKeyRecord, 'key'> & {
    has_key: boolean
    key_preview: string
  }
}


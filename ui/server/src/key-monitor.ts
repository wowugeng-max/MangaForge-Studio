import { readKeys, writeKeys, type APIKeyRecord } from './key-store'
import { readProviders, type ProviderRecord } from './provider-store'
import { readModels } from './model-store'
import { applyKeyProbeState, probeKeyWithBestAvailableMethod } from './routes/keys'

export type KeyMonitorResult = {
  id: number
  provider: string
  valid: boolean
  message: string
  status?: number
}

export type KeyMonitorSkip = {
  id: number
  provider: string
  reason: 'disabled' | 'recently_checked' | 'missing_provider'
}

export type KeyMonitorReport = {
  ok: true
  checkedAt: string
  results: KeyMonitorResult[]
  skipped: KeyMonitorSkip[]
}

export type KeyMonitorOptions = {
  now?: Date
  minCheckAgeMs?: number
}

export type KeyMonitorLoopOptions = KeyMonitorOptions & {
  enabled?: boolean
  intervalMs?: number
  runImmediately?: boolean
  onError?: (error: unknown) => void
}

const DEFAULT_CHECK_AGE_MS = 60 * 60 * 1000
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000

function wasCheckedRecently(key: APIKeyRecord, now: Date, minCheckAgeMs: number) {
  if (!key.last_checked) return false
  const lastChecked = Date.parse(String(key.last_checked))
  if (!Number.isFinite(lastChecked)) return false
  return now.getTime() - lastChecked < minCheckAgeMs
}

function providerForKey(providers: ProviderRecord[], key: APIKeyRecord) {
  return providers.find(provider => provider.id === key.provider)
}

export async function checkKeysOnce(activeWorkspace: string, options: KeyMonitorOptions = {}): Promise<KeyMonitorReport> {
  const now = options.now ?? new Date()
  const checkedAt = now.toISOString()
  const minCheckAgeMs = options.minCheckAgeMs ?? DEFAULT_CHECK_AGE_MS
  const [keys, providers, models] = await Promise.all([
    readKeys(activeWorkspace),
    readProviders(activeWorkspace),
    readModels(activeWorkspace),
  ])
  const next = [...keys]
  const results: KeyMonitorResult[] = []
  const skipped: KeyMonitorSkip[] = []

  for (const key of next) {
    if (key.is_active === false) {
      skipped.push({ id: key.id, provider: key.provider, reason: 'disabled' })
      continue
    }
    if (wasCheckedRecently(key, now, minCheckAgeMs)) {
      skipped.push({ id: key.id, provider: key.provider, reason: 'recently_checked' })
      continue
    }
    const provider = providerForKey(providers, key)
    if (!provider) {
      skipped.push({ id: key.id, provider: key.provider, reason: 'missing_provider' })
      continue
    }

    const started = Date.now()
    const result = await probeKeyWithBestAvailableMethod(provider, key, models)
    applyKeyProbeState(key, result, Date.now() - started, checkedAt)
    results.push({
      id: key.id,
      provider: key.provider,
      valid: Boolean(result.valid),
      message: String(result.message || result.error || ''),
      status: result.status,
    })
  }

  await writeKeys(activeWorkspace, next)
  return { ok: true, checkedAt, results, skipped }
}

export function startKeyMonitor(getWorkspace: () => string, options: KeyMonitorLoopOptions = {}) {
  const enabled = options.enabled ?? true
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS
  if (!enabled || intervalMs <= 0) {
    return { started: false, stop: () => {} }
  }

  let running = false
  let stopped = false
  const run = async () => {
    if (running || stopped) return
    running = true
    try {
      await checkKeysOnce(getWorkspace(), options)
    } catch (error) {
      options.onError?.(error)
    } finally {
      running = false
    }
  }

  if (options.runImmediately ?? true) void run()
  const timer = setInterval(() => { void run() }, intervalMs)
  if (typeof timer.unref === 'function') timer.unref()

  return {
    started: true,
    stop: () => {
      stopped = true
      clearInterval(timer)
    },
  }
}

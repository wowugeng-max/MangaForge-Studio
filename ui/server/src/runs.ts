export type RunRecord = {
  id: number
  name: string
  status: 'ok' | 'error' | 'running' | 'queued'
  startedAt: string
  endedAt?: string
  durationMs?: number
  payload?: Record<string, unknown>
  error?: string
}

export function createRunSnapshot(runs: RunRecord[]) {
  return { ok: true, runs }
}

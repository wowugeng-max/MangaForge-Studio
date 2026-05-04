export type RunStepResult = {
  step: string
  status: 'ok' | 'error'
  durationMs: number
  result?: unknown
  error?: string
}

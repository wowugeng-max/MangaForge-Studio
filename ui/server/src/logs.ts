export type LogRecord = {
  id: number
  level: 'info' | 'warn' | 'error'
  message: string
  createdAt: string
  meta?: Record<string, unknown>
}

export function createLogSnapshot(logs: LogRecord[]) {
  return { ok: true, logs }
}

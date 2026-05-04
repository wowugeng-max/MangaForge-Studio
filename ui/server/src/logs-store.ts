import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

export type LogRecord = {
  id: number
  level: 'info' | 'warn' | 'error'
  message: string
  createdAt: string
  meta?: Record<string, unknown>
}

export function getLogsPath(activeWorkspace: string) {
  return join(activeWorkspace, 'logs.json')
}

export async function readLogs(activeWorkspace: string): Promise<LogRecord[]> {
  try {
    return JSON.parse(await readFile(getLogsPath(activeWorkspace), 'utf8')) as LogRecord[]
  } catch {
    return []
  }
}

export async function writeLogs(activeWorkspace: string, logs: LogRecord[]) {
  await writeFile(getLogsPath(activeWorkspace), `${JSON.stringify(logs, null, 2)}\n`, 'utf8')
}

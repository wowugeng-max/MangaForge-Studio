import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

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

export function getRunsPath(activeWorkspace: string) {
  return join(activeWorkspace, 'runs.json')
}

export async function readRuns(activeWorkspace: string): Promise<RunRecord[]> {
  try {
    return JSON.parse(await readFile(getRunsPath(activeWorkspace), 'utf8')) as RunRecord[]
  } catch {
    return []
  }
}

export async function writeRuns(activeWorkspace: string, runs: RunRecord[]) {
  await writeFile(getRunsPath(activeWorkspace), `${JSON.stringify(runs, null, 2)}\n`, 'utf8')
}

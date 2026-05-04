import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

export type CanvasState = {
  projectId: number
  nodes: unknown[]
  edges: unknown[]
  viewport?: { zoom: number; x: number; y: number }
  updated_at: string
}

export function getCanvasPath(activeWorkspace: string, projectId: number) {
  return join(activeWorkspace, 'canvas', `${projectId}.json`)
}

export async function readCanvasState(activeWorkspace: string, projectId: number): Promise<CanvasState | null> {
  try {
    return JSON.parse(await readFile(getCanvasPath(activeWorkspace, projectId), 'utf8')) as CanvasState
  } catch {
    return null
  }
}

export async function writeCanvasState(activeWorkspace: string, projectId: number, state: CanvasState) {
  await writeFile(getCanvasPath(activeWorkspace, projectId), `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

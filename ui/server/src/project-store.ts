import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

export type ProjectRecord = {
  id: number
  name: string
  description?: string
  tags?: string[]
  canvas_data?: Record<string, any>
  created_at?: string
  updated_at: string
}

export function getProjectsPath(activeWorkspace: string) {
  return join(activeWorkspace, 'projects.json')
}

export async function readProjects(activeWorkspace: string): Promise<ProjectRecord[]> {
  try {
    return JSON.parse(await readFile(getProjectsPath(activeWorkspace), 'utf8')) as ProjectRecord[]
  } catch {
    return []
  }
}

export async function writeProjects(activeWorkspace: string, projects: ProjectRecord[]) {
  await writeFile(getProjectsPath(activeWorkspace), `${JSON.stringify(projects, null, 2)}\n`, 'utf8')
}

export async function seedProjectsIfEmpty(activeWorkspace: string): Promise<ProjectRecord[]> {
  const current = await readProjects(activeWorkspace)
  if (current.length > 0) return current
  const ts = new Date().toISOString()
  const seed: ProjectRecord[] = [
    {
      id: 1,
      name: '默认创作项目',
      description: '用于验证 Dashboard / Pipeline 的默认项目',
      tags: ['demo', 'bridge'],
      canvas_data: {},
      created_at: ts,
      updated_at: ts,
    },
  ]
  await writeProjects(activeWorkspace, seed)
  return seed
}

import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

export type ProjectRecord = {
  id: number
  name: string
  description?: string
  tags?: string[]
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
  const seed: ProjectRecord[] = [
    {
      id: 1,
      name: '默认创作项目',
      description: '用于验证 Dashboard / Pipeline 的默认项目',
      tags: ['demo', 'bridge'],
      updated_at: new Date().toISOString(),
    },
  ]
  await writeProjects(activeWorkspace, seed)
  return seed
}

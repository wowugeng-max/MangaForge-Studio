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

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => String(item)).filter(Boolean) : []
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
}

function normalizeProjectRecord(project: Partial<ProjectRecord> & Record<string, any>): ProjectRecord {
  const timestamp = String(project.created_at || project.updated_at || new Date().toISOString())
  return {
    ...project,
    id: Number(project.id || 0),
    name: String(project.name || '未命名项目'),
    description: String(project.description ?? ''),
    tags: asStringArray(project.tags),
    canvas_data: asObject(project.canvas_data ?? project.canvasData),
    created_at: timestamp,
    updated_at: String(project.updated_at || timestamp),
  }
}

export async function readProjects(activeWorkspace: string): Promise<ProjectRecord[]> {
  try {
    const data = JSON.parse(await readFile(getProjectsPath(activeWorkspace), 'utf8')) as ProjectRecord[]
    return Array.isArray(data) ? data.map(item => normalizeProjectRecord(item as any)) : []
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

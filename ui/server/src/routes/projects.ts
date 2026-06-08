import type { Express } from 'express'
import { ensureWorkspaceStructure } from '../workspace'
import { seedProjectsIfEmpty, readProjects, writeProjects, type ProjectRecord } from '../projects'

function nowIso() {
  return new Date().toISOString()
}

function errorBody(message: unknown) {
  const error = String(message)
  return { error, detail: error }
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => String(item)).filter(Boolean) : []
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
}

function hasOwn(value: Record<string, any>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function parseOffset(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback
}

function parseLimit(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export function registerProjectRoutes(app: Express, getWorkspace: () => string) {
  app.get(['/api/projects', '/api/projects/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      await ensureWorkspaceStructure(activeWorkspace)
      const projects = await seedProjectsIfEmpty(activeWorkspace)
      const skip = parseOffset(req.query.skip, 0)
      const limit = parseLimit(req.query.limit, 100)
      res.json(projects.slice(skip, skip + limit))
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.get(['/api/projects/:id', '/api/projects/:id/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projects = await seedProjectsIfEmpty(activeWorkspace)
      const project = projects.find(item => item.id === Number(req.params.id))
      if (!project) return res.status(404).json(errorBody('project not found'))
      res.json(project)
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.post(['/api/projects', '/api/projects/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projects = await readProjects(activeWorkspace)
      const ts = nowIso()
      const project: ProjectRecord = {
        id: projects.reduce((max, item) => Math.max(max, item.id), 0) + 1,
        name: String(req.body.name || '未命名项目'),
        description: String(req.body.description || ''),
        tags: asStringArray(req.body.tags),
        canvas_data: asObject(req.body.canvas_data ?? req.body.canvasData),
        created_at: ts,
        updated_at: ts,
      }
      const next = [...projects, project]
      await writeProjects(activeWorkspace, next)
      res.json(project)
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.put(['/api/projects/:id', '/api/projects/:id/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projects = await readProjects(activeWorkspace)
      const id = Number(req.params.id)
      const current = projects.find(project => project.id === id)
      if (!current) return res.status(404).json(errorBody('project not found'))
      const body = req.body || {}
      const hasCanvasData = hasOwn(body, 'canvas_data') || hasOwn(body, 'canvasData')
      const next = projects.map(project => project.id === id ? {
        ...project,
        name: String(body.name ?? project.name),
        description: String(body.description ?? project.description ?? ''),
        tags: Array.isArray(body.tags) ? asStringArray(body.tags) : project.tags,
        canvas_data: hasCanvasData ? asObject(body.canvas_data ?? body.canvasData) : project.canvas_data,
        created_at: project.created_at || project.updated_at || nowIso(),
        updated_at: nowIso(),
      } : project)
      await writeProjects(activeWorkspace, next)
      const project = next.find(item => item.id === id)
      res.json(project)
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })

  app.delete(['/api/projects/:id', '/api/projects/:id/'], async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projects = await readProjects(activeWorkspace)
      const id = Number(req.params.id)
      if (!projects.some(project => project.id === id)) return res.status(404).json(errorBody('Project not found'))
      await writeProjects(activeWorkspace, projects.filter(project => project.id !== id))
      res.status(204).send()
    } catch (error) {
      res.status(500).json(errorBody(error))
    }
  })
}

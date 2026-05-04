import type { Express } from 'express'
import { ensureWorkspaceStructure } from '../workspace'
import { seedProjectsIfEmpty, readProjects, writeProjects, type ProjectRecord } from '../projects'

function nowIso() {
  return new Date().toISOString()
}

export function registerProjectRoutes(app: Express, getWorkspace: () => string) {
  app.get('/api/projects', async (_req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      await ensureWorkspaceStructure(activeWorkspace)
      res.json({ projects: await seedProjectsIfEmpty(activeWorkspace) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/projects/:id', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projects = await seedProjectsIfEmpty(activeWorkspace)
      const project = projects.find(item => item.id === Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ project })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/projects', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projects = await readProjects(activeWorkspace)
      const project: ProjectRecord = {
        id: projects.reduce((max, item) => Math.max(max, item.id), 0) + 1,
        name: String(req.body.name || '未命名项目'),
        description: String(req.body.description || ''),
        tags: Array.isArray(req.body.tags) ? req.body.tags : [],
        updated_at: nowIso(),
      }
      const next = [...projects, project]
      await writeProjects(activeWorkspace, next)
      res.json({ project, projects: next })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/projects/:id', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projects = await readProjects(activeWorkspace)
      const id = Number(req.params.id)
      const next = projects.map(project => project.id === id ? {
        ...project,
        name: String(req.body.name ?? project.name),
        description: String(req.body.description ?? project.description ?? ''),
        tags: Array.isArray(req.body.tags) ? req.body.tags : project.tags,
        updated_at: nowIso(),
      } : project)
      await writeProjects(activeWorkspace, next)
      const project = next.find(item => item.id === id)
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ project })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.delete('/api/projects/:id', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projects = await readProjects(activeWorkspace)
      const id = Number(req.params.id)
      await writeProjects(activeWorkspace, projects.filter(project => project.id !== id))
      res.json({ ok: true })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}

import type { Express } from 'express'
import { listMemoryPalaceProjects, purgeMemoryPalaceProject } from '../memory-service'

export function registerNovelMemoryRoutes(app: Express) {
  app.get('/api/novel/memory-palace/projects', async (_req, res) => {
    try {
      const projects = await listMemoryPalaceProjects()
      res.json({ projects })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.delete('/api/novel/memory-palace/projects/:id', async (req, res) => {
    try {
      const projectId = Number(req.params.id)
      const projectTitle = req.body?.project_title || req.query?.project_title
      const result = await purgeMemoryPalaceProject(projectId, projectTitle || undefined)
      if (!result.ok) return res.status(400).json({ ok: false, error: result.error })
      res.json({ ok: true, project_id: projectId, message: `已成功删除项目 ${projectId} 的所有记忆数据` })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}

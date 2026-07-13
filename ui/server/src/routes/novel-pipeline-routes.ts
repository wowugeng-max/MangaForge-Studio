import type { Express } from 'express'
import { getNovelPipelineSnapshot, type NovelPipelineSnapshot } from '../novel'
import { buildNovelPipelineSummary } from './novel-pipeline-service'

export type NovelPipelineRoutesContext = {
  getWorkspace: () => string
  getPipelineSnapshot?: (workspace: string, projectId: number) => Promise<NovelPipelineSnapshot | null>
}

export function registerNovelPipelineRoutes(app: Express, ctx: NovelPipelineRoutesContext) {
  app.get('/api/novel/projects/:id/pipeline', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.params.id || 0)
      const snapshot = await (ctx.getPipelineSnapshot || getNovelPipelineSnapshot)(activeWorkspace, projectId)
      if (!snapshot) return res.status(404).json({ error: 'project not found' })

      res.json({
        ok: true,
        pipeline: buildNovelPipelineSummary(snapshot),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}

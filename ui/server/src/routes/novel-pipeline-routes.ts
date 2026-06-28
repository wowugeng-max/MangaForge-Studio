import type { Express } from 'express'
import {
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelWorldbuilding,
} from '../novel'
import { buildNovelPipelineSummary } from './novel-pipeline-service'

export type NovelPipelineRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  listChapters?: (workspace: string, projectId: number) => Promise<any[]>
  listOutlines?: (workspace: string, projectId: number) => Promise<any[]>
  listWorldbuilding?: (workspace: string, projectId: number) => Promise<any[]>
  listCharacters?: (workspace: string, projectId: number) => Promise<any[]>
  listReviews?: (workspace: string, projectId: number) => Promise<any[]>
  listRuns?: (workspace: string, projectId: number) => Promise<any[]>
}

export function registerNovelPipelineRoutes(app: Express, ctx: NovelPipelineRoutesContext) {
  app.get('/api/novel/projects/:id/pipeline', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.params.id || 0)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })

      const [chapters, outlines, worldbuilding, characters, reviews, runs] = await Promise.all([
        (ctx.listChapters || listNovelChapters)(activeWorkspace, project.id),
        (ctx.listOutlines || listNovelOutlines)(activeWorkspace, project.id),
        (ctx.listWorldbuilding || listNovelWorldbuilding)(activeWorkspace, project.id),
        (ctx.listCharacters || listNovelCharacters)(activeWorkspace, project.id),
        (ctx.listReviews || listNovelReviews)(activeWorkspace, project.id),
        (ctx.listRuns || listNovelRuns)(activeWorkspace, project.id),
      ])

      res.json({
        ok: true,
        pipeline: buildNovelPipelineSummary({
          project,
          chapters,
          outlines,
          worldbuilding,
          characters,
          reviews,
          runs,
        }),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}

import type { Express } from 'express'
import {
  createNovelReview,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  updateNovelProject,
} from '../novel'

type ProjectControlRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  getStoredOrBuiltWritingBible: (workspace: string, project: any) => Promise<any>
  getStoryState: (project: any) => any
  buildProductionDashboard: (project: any, chapters: any[], outlines: any[], characters: any[], reviews: any[], runs: any[]) => any
  buildProductionMetrics: (chapters: any[], reviews: any[], runs: any[]) => any
  getApprovalPolicy: (project: any) => any
  getProductionBudget: (project: any) => any
  getProductionBudgetDecision: (project: any, runs: any[]) => any
  getQualityGate: (project: any) => any
  getAgentPromptConfig: (project: any) => any
}

export function registerNovelProjectControlRoutes(app: Express, ctx: ProjectControlRoutesContext) {
  app.get('/api/novel/projects/:id/writing-bible', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, writing_bible: await ctx.getStoredOrBuiltWritingBible(activeWorkspace, project), generated: !project.reference_config?.writing_bible })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/writing-bible', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const writingBible = req.body?.writing_bible || req.body || {}
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          writing_bible: { ...writingBible, updated_at: new Date().toISOString() },
        },
      } as any)
      res.json({ ok: true, writing_bible: updated?.reference_config?.writing_bible || writingBible, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/story-state', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, story_state: ctx.getStoryState(project) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/story-state', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const storyState = req.body?.story_state || req.body || {}
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          story_state: { ...storyState, manually_corrected_at: new Date().toISOString() },
        },
      } as any)
      await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'story_state',
        status: 'ok',
        summary: '故事状态机已人工校正',
        issues: [],
        payload: JSON.stringify({ manual: true, story_state: updated?.reference_config?.story_state || storyState }),
      })
      res.json({ ok: true, story_state: updated?.reference_config?.story_state || storyState, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/production-dashboard', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      res.json({ ok: true, dashboard: ctx.buildProductionDashboard(project, chapters, outlines, characters, reviews, runs) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/production-metrics', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      res.json({ ok: true, metrics: ctx.buildProductionMetrics(chapters, reviews, runs) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/approval-policy', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, policy: ctx.getApprovalPolicy(project) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/approval-policy', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const policy = { ...ctx.getApprovalPolicy(project), ...(req.body?.policy || req.body || {}) }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), approval_policy: policy },
      } as any)
      res.json({ ok: true, policy, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/production-budget', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      res.json({ ok: true, budget: ctx.getProductionBudget(project), decision: ctx.getProductionBudgetDecision(project, runs) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/production-budget', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const budget = { ...ctx.getProductionBudget(project), ...(req.body?.budget || req.body || {}) }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), production_budget: budget },
      } as any)
      res.json({ ok: true, budget, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/quality-gate', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, gate: ctx.getQualityGate(project) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/quality-gate', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const gate = { ...ctx.getQualityGate(project), ...(req.body?.gate || req.body || {}) }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), quality_gate: gate },
      } as any)
      res.json({ ok: true, gate, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/agent-config', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, config: ctx.getAgentPromptConfig(project) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/agent-config', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const prev = ctx.getAgentPromptConfig(project)
      const config = {
        ...prev,
        ...(req.body?.config || req.body || {}),
        version: Number(prev.version || 1) + 1,
        updated_at: new Date().toISOString(),
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), agent_prompt_config: config },
      } as any)
      res.json({ ok: true, config, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}

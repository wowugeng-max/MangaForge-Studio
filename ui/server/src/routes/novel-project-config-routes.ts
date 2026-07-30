import type { Express } from 'express'
import {
  listNovelRuns,
  mutateNovelProjectReferenceConfig,
  updateNovelProject,
} from '../novel'
import {
  normalizeEditorRevisionTimeoutSeconds,
  resolveEditorRevisionRuntimeConfig,
} from '../novel/editor-revision-runtime-config'

type ProjectConfigRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  getApprovalPolicy: (project: any) => any
  getProductionBudget: (project: any) => any
  getProductionBudgetDecision: (project: any, runs: any[]) => any
  getQualityGate: (project: any) => any
  getAgentPromptConfig: (project: any) => any
  buildAgentConfigSnapshot: (project: any, preferredModelId?: number) => any
}

export function registerNovelProjectConfigRoutes(app: Express, ctx: ProjectConfigRoutesContext) {
  app.get('/api/novel/projects/:id/editor-revision-config', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, config: resolveEditorRevisionRuntimeConfig(project) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/editor-revision-config', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const rawTimeout = req.body?.config?.timeout_seconds ?? req.body?.timeout_seconds
      if (typeof rawTimeout !== 'number' || !Number.isFinite(rawTimeout)) {
        return res.status(400).json({ error: 'timeout_seconds must be a finite number' })
      }
      const config = { timeout_seconds: normalizeEditorRevisionTimeoutSeconds(rawTimeout) }
      const mutation = await mutateNovelProjectReferenceConfig(activeWorkspace, {
        projectId: project.id,
        operation: 'update-editor-revision-config',
        mutate: currentConfig => ({
          referenceConfig: {
            ...currentConfig,
            editor_revision: {
              ...(currentConfig.editor_revision || {}),
              ...config,
            },
          },
          result: config,
        }),
      })
      if (!mutation) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, config: mutation.result, project: mutation.project })
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
      res.json({
        ok: true,
        config: ctx.getAgentPromptConfig(project),
        snapshot: ctx.buildAgentConfigSnapshot(project, Number(req.query.model_id || 0) || undefined),
      })
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
      const previousVersion = {
        version: prev.version,
        prompts: prev.prompts || {},
        project_overrides_enabled: prev.project_overrides_enabled !== false,
        updated_at: prev.updated_at || '',
        archived_at: new Date().toISOString(),
      }
      const config = {
        ...prev,
        ...(req.body?.config || req.body || {}),
        version: Number(prev.version || 1) + 1,
        updated_at: new Date().toISOString(),
        history: [previousVersion, ...((prev.history || []) as any[])].slice(0, 30),
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), agent_prompt_config: config },
      } as any)
      res.json({ ok: true, config, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/agent-config/snapshot', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const snapshot = ctx.buildAgentConfigSnapshot(project, Number(req.body?.model_id || 0) || undefined)
      res.json({
        ok: true,
        snapshot,
        replay_plan: {
          project_id: project.id,
          model_strategy: snapshot.model_strategy,
          approval_policy: snapshot.approval_policy,
          agent_prompt_version: snapshot.agent_prompt_version,
          writing_bible_hash: snapshot.writing_bible_hash,
          note: '该快照用于复现生成环境；重新执行时仍会调用当前可用模型，因此输出不保证逐字一致。',
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}

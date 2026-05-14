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
import { parseJsonLikePayload } from './novel-route-utils'

type ProjectControlRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  getStoredOrBuiltWritingBible: (workspace: string, project: any) => Promise<any>
  getStoryState: (project: any) => any
  buildProductionDashboard: (project: any, chapters: any[], outlines: any[], characters: any[], reviews: any[], runs: any[]) => any
  buildProductionMetrics: (chapters: any[], reviews: any[], runs: any[]) => any
  buildCommercialReadiness: (project: any, chapters: any[], outlines: any[], characters: any[], reviews: any[], runs: any[]) => any
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

  app.get('/api/novel/projects/:id/commercial-readiness', async (req, res) => {
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
      res.json({ ok: true, readiness: ctx.buildCommercialReadiness(project, chapters, outlines, characters, reviews, runs) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/continuity-audit', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, characters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const sorted = [...chapters].sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
      const state = ctx.getStoryState(project)
      const issues: any[] = []
      const titleMap = new Map<string, any[]>()
      for (const chapter of sorted) {
        const title = String(chapter.title || '').trim()
        if (title) titleMap.set(title, [...(titleMap.get(title) || []), chapter])
        if (chapter.chapter_no > 1) {
          const prev = sorted.filter(item => Number(item.chapter_no || 0) < Number(chapter.chapter_no || 0)).slice(-1)[0]
          if (chapter.chapter_text && !prev?.chapter_text && !prev?.ending_hook) {
            issues.push({ type: 'timeline_gap', severity: 'high', chapter_no: chapter.chapter_no, title: chapter.title, message: '当前章已有正文，但上一章缺正文和结尾钩子。', action: '补齐上一章正文或结尾钩子后再继续生成。' })
          }
          if (!chapter.continuity_notes?.length && chapter.chapter_text) {
            issues.push({ type: 'continuity_note_missing', severity: 'medium', chapter_no: chapter.chapter_no, title: chapter.title, message: '章节正文已存在，但缺连续性备注。', action: '补充本章结束后的角色、道具、伏笔和时间线变化。' })
          }
        }
        if (chapter.chapter_text && !chapter.ending_hook) {
          issues.push({ type: 'missing_hook', severity: 'medium', chapter_no: chapter.chapter_no, title: chapter.title, message: '章节缺章末钩子。', action: '补充下一章驱动力。' })
        }
      }
      for (const [title, rows] of titleMap.entries()) {
        if (rows.length > 1) {
          issues.push({ type: 'duplicate_title', severity: 'low', chapter_no: rows[0].chapter_no, title, message: `重复章节标题：${rows.map(item => `第${item.chapter_no}章`).join('、')}`, action: '确认是否为占位标题，避免目录混淆。' })
        }
      }
      const writtenMax = Math.max(0, ...sorted.filter(chapter => chapter.chapter_text).map(chapter => Number(chapter.chapter_no || 0)))
      if (writtenMax && Number(state.last_updated_chapter || 0) < writtenMax) {
        issues.push({ type: 'story_state_stale', severity: 'high', chapter_no: writtenMax, title: '', message: `故事状态机只更新到第${state.last_updated_chapter || 0}章，落后正文至第${writtenMax}章。`, action: '运行状态机更新或人工校正故事状态。' })
      }
      const characterNames = new Set(characters.map(char => String(char.name || '').trim()).filter(Boolean))
      const positions = state.character_positions || {}
      for (const name of Object.keys(positions)) {
        if (characterNames.size && !characterNames.has(name)) {
          issues.push({ type: 'unknown_character_state', severity: 'low', chapter_no: 0, title: '', message: `状态机包含未建角色卡：${name}`, action: '创建角色卡或清理状态机冗余角色。' })
        }
      }
      const repeated = Array.isArray(state.recent_repeated_information) ? state.recent_repeated_information : []
      for (const item of repeated.slice(0, 8)) {
        issues.push({ type: 'repeated_information', severity: 'medium', chapter_no: 0, title: '', message: `近期重复信息：${String(item)}`, action: '后续章节避免再次解释该信息，改为推进新信息。' })
      }
      const stateReviews = reviews.filter(item => item.review_type === 'story_state').slice(-10).map(item => parseJsonLikePayload(item.payload) || {})
      const unresolved = state.unresolved_conflicts || state.open_questions || []
      for (const item of (Array.isArray(unresolved) ? unresolved : Object.values(unresolved)).slice(0, 10)) {
        issues.push({ type: 'open_thread', severity: 'medium', chapter_no: 0, title: '', message: `未关闭线索/问题：${String(item)}`, action: '在滚动规划里安排回收或延期。' })
      }
      const severityWeight: Record<string, number> = { high: 12, medium: 6, low: 2 }
      const riskScore = Math.min(100, issues.reduce((sum, item) => sum + (severityWeight[item.severity] || 4), 0))
      res.json({
        ok: true,
        audit: {
          project_id: project.id,
          score: Math.max(0, 100 - riskScore),
          risk_score: riskScore,
          issue_count: issues.length,
          high_count: issues.filter(item => item.severity === 'high').length,
          medium_count: issues.filter(item => item.severity === 'medium').length,
          low_count: issues.filter(item => item.severity === 'low').length,
          issues,
          state_review_samples: stateReviews.length,
          recommendations: [
            issues.some(item => item.type === 'story_state_stale') ? '优先更新故事状态机，避免角色位置、道具归属和伏笔漂移。' : '',
            issues.some(item => item.type === 'timeline_gap') ? '先修补章节间空洞，再批量生成后续章节。' : '',
            issues.some(item => item.type === 'missing_hook') ? '补齐已写章节的章末钩子，提高续写上下文稳定性。' : '',
            repeated.length ? '清理近期重复信息，减少水文和反复解释。' : '',
          ].filter(Boolean),
        },
      })
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

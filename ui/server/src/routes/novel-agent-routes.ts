import type { Express } from 'express'
import { appendNovelRun, createNovelReview, listNovelChapters, listNovelReviews } from '../novel'
import {
  buildContinuityFixes,
  buildNovelAgentPlan,
  buildNovelStrategy,
  buildNovelTools,
  buildPlatformFitAnalysis,
  buildRepairPlan,
} from '../llm'

type AgentRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
}

export function registerNovelAgentRoutes(app: Express, ctx: AgentRoutesContext) {
  app.get('/api/novel/agents/plan', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.query.project_id || 0))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ project_id: project.id, agents: buildNovelAgentPlan(project) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/agents/strategy', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.query.project_id || 0))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ project_id: project.id, strategy: buildNovelStrategy(project) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/agents/tools', async (req, res) => {
    try {
      const projectId = Number(req.query.project_id || 0)
      if (!projectId) return res.status(400).json({ error: 'project_id required' })
      res.json({ project_id: projectId, tools: buildNovelTools(projectId) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/agents/continuity', async (_req, res) => {
    try {
      res.json({ checks: buildContinuityFixes(), repair_plan: buildRepairPlan() })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/agents/platform-fit', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.query.project_id || 0)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const chapters = await listNovelChapters(activeWorkspace, projectId)
      const reviews = await listNovelReviews(activeWorkspace, projectId)
      const continuity = reviews.find(item => item.review_type === 'continuity') || null
      const chapterIds = String(req.query.chapter_ids || '').split(',').map(v => Number(v)).filter(Boolean)
      const selectedChapters = chapterIds.length > 0 ? chapters.filter(item => chapterIds.includes(item.id)) : chapters.slice(0, 3)
      const prose = { prose_chapters: selectedChapters.filter(item => item.chapter_text) }
      const platformFit = await buildPlatformFitAnalysis(project, { plan: { chapters: selectedChapters }, review: continuity, prose, chapters: selectedChapters }, activeWorkspace, Number(req.query.model_id || 0) || undefined)
      await createNovelReview(activeWorkspace, {
        project_id: projectId,
        review_type: 'platform_fit',
        status: platformFit?.is_platform_ready ? 'ok' : 'warn',
        summary: `平台适配评分 ${platformFit?.score ?? '-'}`,
        issues: Array.isArray(platformFit?.risks) ? platformFit.risks : [],
        payload: JSON.stringify(platformFit || {}),
      })
      res.json(platformFit)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/agents/market-review', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id || 0)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const chapters = await listNovelChapters(activeWorkspace, projectId)
      const reviews = await listNovelReviews(activeWorkspace, projectId)
      const proseCount = chapters.filter(item => item.chapter_text).length
      const chapterCount = chapters.length
      const score = Math.max(10, Math.min(95, Math.round(55 + Math.min(chapterCount * 4, 25) + Math.min(proseCount * 6, 20) + Math.min((String(project.genre || '').length > 0 ? 5 : 0), 5))))
      const marketReview = {
        is_market_ready: score >= 70,
        score,
        platform_fit: project.length_target || 'medium',
        strengths: [
          chapterCount > 0 ? `已有 ${chapterCount} 章结构` : '尚未建立章节结构',
          proseCount > 0 ? `已有 ${proseCount} 章正文` : '尚未开始正文',
          String(project.style_tags || []).length > 0 ? '风格标签明确' : '风格标签较少',
        ],
        risks: [
          chapterCount === 0 ? '章节结构不足' : '章节节奏仍需打磨',
          proseCount === 0 ? '正文产出不足' : '部分正文可能仍需增强',
          !project.genre ? '题材信息较少' : '题材需要持续统一风格',
        ],
        recommendations: ['补充章节结构并稳定主线', '确保章节正文持续更新', '结合平台偏好调整节奏与钩子'],
        target_audience: project.target_audience || '',
        notes: `基于 ${chapterCount} 章与 ${proseCount} 章正文的本地市场审计`,
        reviewed_reviews: reviews.length,
      }
      const saved = await createNovelReview(activeWorkspace, {
        project_id: projectId,
        review_type: 'market_review',
        status: marketReview.is_market_ready ? 'ok' : 'warn',
        summary: `市场审计评分 ${marketReview.score}`,
        issues: marketReview.risks,
        payload: JSON.stringify(marketReview),
      })
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'market_review', step_name: 'analysis', status: 'success', output_ref: JSON.stringify(marketReview) })
      res.json({ ...marketReview, review: saved })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}

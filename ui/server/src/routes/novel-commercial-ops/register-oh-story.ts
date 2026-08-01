import type { Express } from 'express'
import { createOhStoryCapabilityService } from '../novel-oh-story-capability-service'
import { describeKnowledgeIntegration, publishOhStoryPlanToKnowledge } from '../../novel-writing/oh-story-knowledge-bridge'
import type { CommercialOpsContext } from './builders'

export function registerNovelCommercialOpsOhStoryRoutes(app: Express, ctx: CommercialOpsContext) {
  const ohStoryCapabilities = createOhStoryCapabilityService()
  app.get('/api/novel/oh-story/capabilities', (_req, res) => {
    res.json(ohStoryCapabilities.listCapabilities())
  })
  app.get('/api/novel/oh-story/genre-prose-cards', (_req, res) => {
    res.json({ ok: true, cards: ohStoryCapabilities.listGenreCards() })
  })
  app.post('/api/novel/oh-story/reader-contract', (req, res) => {
    res.json({ ok: true, contract: ohStoryCapabilities.buildReaderContract(req.body || {}) })
  })
  app.post('/api/novel/oh-story/genre-prose-card', (req, res) => {
    res.json({ ok: true, contract: ohStoryCapabilities.buildGenreCard(req.body || {}) })
  })
  app.post('/api/novel/oh-story/story-unit-card', (req, res) => {
    res.json({ ok: true, card: ohStoryCapabilities.buildStoryUnit(req.body || {}) })
  })
  app.post('/api/novel/oh-story/outline-word-budget', (req, res) => {
    const budget = ohStoryCapabilities.buildOutlineBudget(req.body || {})
    const debt = ohStoryCapabilities.locateBudgetDebt({ budget, actual_words: req.body?.actual_words })
    res.json({ ok: true, budget, debt })
  })
  app.post('/api/novel/oh-story/toxic-debt/scan', (req, res) => {
    res.json({ ok: true, debt: ohStoryCapabilities.scanToxicDebt(String(req.body?.text || req.body?.chapter_text || '')) })
  })
  app.post('/api/novel/oh-story/toxic-debt/gate', (req, res) => {
    res.json({ ok: true, gate: ohStoryCapabilities.evaluateDebtGate(req.body || {}) })
  })
  app.post('/api/novel/oh-story/long-analyze/plan', (req, res) => {
    res.json({ ok: true, plan: ohStoryCapabilities.buildLongAnalyzePlan(req.body || {}) })
  })
  app.post('/api/novel/oh-story/long-scan/plan', (req, res) => {
    res.json({ ok: true, plan: ohStoryCapabilities.buildLongScanPlan(req.body || {}) })
  })
  app.post('/api/novel/oh-story/import/plan', (req, res) => {
    res.json({ ok: true, plan: ohStoryCapabilities.buildImportPlan(req.body || {}) })
  })
  app.post('/api/novel/oh-story/cover/plan', (req, res) => {
    res.json({ ok: true, plan: ohStoryCapabilities.buildCoverPlan(req.body || {}) })
  })
  app.post('/api/novel/oh-story/short-suite/plan', (req, res) => {
    res.json({ ok: true, plan: ohStoryCapabilities.buildShortSuitePlan(req.body || {}) })
  })
  app.post('/api/novel/oh-story/prompt-bundle', (req, res) => {
    res.json({ ok: true, ...ohStoryCapabilities.formatPromptBundle(req.body || {}) })
  })

  app.get('/api/novel/oh-story/knowledge-integration', (_req, res) => {
    res.json({ ok: true, integration: describeKnowledgeIntegration() })
  })
  app.post('/api/novel/oh-story/knowledge/publish', async (req, res) => {
    try {
      const kind = String(req.body?.kind || '') as any
      const projectId = Number(req.body?.project_id || 0) || undefined
      let project: any = null
      if (projectId) {
        const activeWorkspace = ctx.getWorkspace()
        project = await ctx.getProject(activeWorkspace, projectId)
      }
      const result = await publishOhStoryPlanToKnowledge({
        kind,
        project,
        project_id: projectId,
        project_title: req.body?.project_title || project?.title,
        input: req.body?.input || req.body || {},
        auto_store: req.body?.auto_store !== false,
      })
      res.json({ ok: true, ...result })
    } catch (error: any) {
      res.status(500).json({ error: String(error?.message || error) })
    }
  })
}

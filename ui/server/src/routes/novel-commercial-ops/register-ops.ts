import type { Express } from 'express'
import { createHash } from 'crypto'
import {
  appendNovelRun,
  createNovelChapter,
  createNovelCharacter,
  createNovelOutline,
  createNovelProject,
  createNovelReview,
  createNovelWorldbuilding,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  updateNovelOutline,
  updateNovelProject,
} from '../../novel'
import { readKeys } from '../../key-store'
import { readModels } from '../../model-store'
import { readProviders } from '../../provider-store'
import { executeNovelAgent } from '../../llm'
import { asArray, compactText, parseJsonLikePayload, safeJsonStringify } from '../novel-route-utils'
import { createOhStoryCapabilityService } from '../novel-oh-story-capability-service'
import {
  extractEndingReserveLedgerFromProject,
  unlockEndingReserveItem,
  spendEndingReserveItem,
  patchProjectWithEndingReserveLedger,
  evaluateEndingReserveSpendRisk,
} from '../../novel-writing/ending-reserve-ledger'
import { describeKnowledgeIntegration, publishOhStoryPlanToKnowledge } from '../../novel-writing/oh-story-knowledge-bridge'
import {
  buildFirst30RetentionDiagnosis,
  buildFirst30RetentionRepairTasks,
  buildLongformCreationDiagnosis,
  buildLongformGovernanceBrief,
  buildLongformPressureTest,
  buildMechanicalQa,
  buildMechanicalQaLlmPrompt,
  buildPropagationDebt,
  buildPropagationDebtLlmPrompt,
  buildReaderTrialRepairTasks,
  buildReaderTrialReview,
  genreTemplates,
  importBackupAsNewProject,
  interpretCreativeCommand,
  modelUsageRecommendation,
  normalizeBackupPayload,
  opsJson,
  textHash,
  type CommercialOpsContext,
} from './builders'

export function registerNovelCommercialOpsUtilityRoutes(app: Express, ctx: CommercialOpsContext) {
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
  app.get('/api/novel/projects/:id/ending-reserve', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const ledger = extractEndingReserveLedgerFromProject(project)
      res.json({ ok: true, ledger, risk: evaluateEndingReserveSpendRisk(ledger, { volume: req.query.volume, chapter_summary: req.query.summary }) })
    } catch (error: any) {
      res.status(500).json({ error: String(error?.message || error) })
    }
  })
  app.post('/api/novel/projects/:id/ending-reserve/unlock', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.params.id)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const current = extractEndingReserveLedgerFromProject(project)
      const result = unlockEndingReserveItem(current, req.body || {})
      if (!result.ok) return res.status(400).json(result)
      const patch = patchProjectWithEndingReserveLedger(project, result.ledger)
      const updated = await updateNovelProject(activeWorkspace, projectId, { reference_config: patch.reference_config } as any)
      res.json({ ok: true, ledger: result.ledger, project: updated })
    } catch (error: any) {
      res.status(500).json({ error: String(error?.message || error) })
    }
  })
  app.post('/api/novel/projects/:id/ending-reserve/spend', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.params.id)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const current = extractEndingReserveLedgerFromProject(project)
      const result = spendEndingReserveItem(current, req.body || {})
      if (!result.ok) return res.status(400).json(result)
      const patch = patchProjectWithEndingReserveLedger(project, result.ledger)
      const updated = await updateNovelProject(activeWorkspace, projectId, { reference_config: patch.reference_config } as any)
      res.json({ ok: true, ledger: result.ledger, project: updated })
    } catch (error: any) {
      res.status(500).json({ error: String(error?.message || error) })
    }
  })

  app.get('/api/novel/projects/:id/model-diagnostics', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [models, providers, keys, runs] = await Promise.all([
        readModels(activeWorkspace),
        readProviders(activeWorkspace),
        readKeys(activeWorkspace),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const rows = models.map((model: any) => {
        const provider = providers.find(item => item.id === model.provider)
        const key = keys.find(item => item.id === model.api_key_id)
        const recommendation = modelUsageRecommendation(model)
        return {
          id: model.id,
          display_name: model.display_name,
          model_name: model.model_name,
          provider: provider?.display_name || model.provider,
          provider_active: provider?.is_active !== false,
          key_ready: Boolean(key?.has_key || key?.key || key?.key_preview) && key?.is_active !== false,
          health_status: model.health_status || 'unknown',
          last_tested_at: model.last_tested_at || '',
          capabilities: model.capabilities || {},
          recommendation,
          score: [
            provider?.is_active !== false ? 20 : 0,
            key && key.is_active !== false ? 20 : 0,
            model.health_status === 'healthy' ? 25 : model.health_status === 'unknown' ? 10 : 0,
            recommendation.draft ? 15 : 0,
            recommendation.long_context ? 10 : 0,
            model.capabilities?.chat ? 10 : 0,
          ].reduce((sum, item) => sum + item, 0),
        }
      })
      const recentFailures = runs
        .filter(run => ['failed', 'warn'].includes(run.status) || String(run.error_message || run.output_ref || '').includes('Provider'))
        .slice(0, 12)
        .map(run => ({ id: run.id, run_type: run.run_type, step_name: run.step_name, status: run.status, error: compactText(run.error_message || run.output_ref || '', 220), created_at: run.created_at }))
      const report = {
        created_at: new Date().toISOString(),
        model_count: rows.length,
        healthy_count: rows.filter(row => row.health_status === 'healthy').length,
        ready_count: rows.filter(row => row.score >= 70).length,
        rows: rows.sort((a, b) => b.score - a.score),
        recent_failures: recentFailures,
        next_actions: [
          rows.some(row => !row.key_ready) ? '存在模型未绑定有效 Key。' : '',
          rows.some(row => row.health_status !== 'healthy') ? '建议在模型管理里运行健康探针。' : '',
          recentFailures.length ? '近期存在模型调用失败，批量生产前建议切换健康模型或降低并发。' : '',
        ].filter(Boolean),
      }
      res.json({ ok: true, report })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/genre-templates', (_req, res) => {
    res.json({ ok: true, templates: genreTemplates })
  })

  app.post('/api/novel/projects/:id/genre-templates/:templateId/apply', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const template = genreTemplates.find(item => item.id === req.params.templateId)
      if (!template) return res.status(404).json({ error: 'template not found' })
      const currentBible = project.reference_config?.writing_bible || {}
      const writingBible = {
        ...currentBible,
        promise: currentBible.promise || template.promise,
        style_lock: { ...(currentBible.style_lock || {}), ...template.style_lock },
        genre_method: template.structure,
        genre_template_id: template.id,
        updated_at: new Date().toISOString(),
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        genre: project.genre || template.genre,
        reference_config: {
          ...(project.reference_config || {}),
          writing_bible: writingBible,
        },
      } as any)
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'genre_template_apply',
        step_name: template.id,
        status: 'success',
        output_ref: opsJson({ template, writing_bible: writingBible }),
      })
      res.json({ ok: true, template, writing_bible: writingBible, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/backup-package', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, worldbuilding, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelWorldbuilding(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const payload = {
        package_type: 'novel_project_backup',
        exported_at: new Date().toISOString(),
        project,
        chapters,
        outlines,
        characters,
        worldbuilding,
        reviews,
        runs,
      }
      const text = JSON.stringify(payload, null, 2)
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(project.title || `novel-${project.id}`)}-backup-${Date.now()}.json"`)
      res.send(text)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/backup-snapshot', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, worldbuilding, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelWorldbuilding(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const manifest = {
        snapshot_id: `backup-${project.id}-${Date.now()}`,
        created_at: new Date().toISOString(),
        project_id: project.id,
        title: project.title,
        counts: { chapters: chapters.length, outlines: outlines.length, characters: characters.length, worldbuilding: worldbuilding.length, reviews: reviews.length, runs: runs.length },
        text_hash: textHash(JSON.stringify({ project, chapters, outlines, characters, worldbuilding })),
      }
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'project_backup',
        status: 'ok',
        summary: `项目备份快照：${manifest.snapshot_id}`,
        issues: [],
        payload: JSON.stringify({ manifest }),
      })
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'project_backup',
        step_name: manifest.snapshot_id,
        status: 'success',
        output_ref: JSON.stringify({ manifest, review_id: review.id }),
      })
      res.json({ ok: true, manifest, review })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/backup-package/import', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const backup = normalizeBackupPayload(req.body)
      const result = await importBackupAsNewProject(activeWorkspace, backup, req.body?.options || {})
      res.json({ ok: true, ...result })
    } catch (error: any) {
      res.status(400).json({ error: String(error?.message || error) })
    }
  })
}

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

export function registerNovelCommercialOpsLongformRoutes(app: Express, ctx: CommercialOpsContext) {
  app.post('/api/novel/projects/:id/longform-pressure-test', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, worldbuilding, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelWorldbuilding(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildLongformPressureTest(project, chapters, outlines, characters, worldbuilding, reviews)
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'longform_pressure_test',
        status: report.status === 'scalable' ? 'ok' : 'warn',
        summary: `300万字长线压力测试：${report.score} 分，${report.summary}`,
        issues: report.weak_points.slice(0, 30).map((item: any) => `${item.area}：${item.issue}`),
        payload: JSON.stringify({ report }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'longform_pressure_test',
        step_name: 'longform-pressure',
        status: report.status === 'scalable' ? 'success' : 'warn',
        output_ref: JSON.stringify({ report, review_id: review.id }),
      })
      res.json({ ok: true, report, review, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/longform-creation-diagnosis', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, worldbuilding, settingEntities, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelWorldbuilding(activeWorkspace, project.id),
        listNovelSettingEntities(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildLongformCreationDiagnosis(project, chapters, outlines, characters, worldbuilding, settingEntities, reviews)
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'longform_creation_diagnosis',
        status: report.status === 'ready' ? 'ok' : 'warn',
        summary: `长篇创作健康诊断：${report.score} 分，${report.summary}`,
        issues: [...report.blockers, ...report.warnings].slice(0, 30),
        payload: JSON.stringify({ report }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'longform_creation_diagnosis',
        step_name: 'longform-creation-diagnosis',
        status: report.status === 'ready' ? 'success' : 'warn',
        output_ref: JSON.stringify({ report, review_id: review.id }),
      })
      res.json({ ok: true, report, review, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/propagation-debt/refresh', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildPropagationDebt(project, chapters, characters, outlines, reviews)
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          propagation_debt: {
            ...(project.reference_config?.propagation_debt || {}),
            latest_report: report,
            updated_at: new Date().toISOString(),
          },
        },
      } as any)
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'propagation_debt',
        status: report.high_count ? 'warn' : 'ok',
        summary: `传播债务：活跃 ${report.active_count} 项，高风险 ${report.high_count} 项`,
        issues: report.debts.slice(0, 30).map((item: any) => `${item.title}：${item.message}`),
        payload: JSON.stringify({ report }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'propagation_debt',
        step_name: 'refresh',
        status: report.high_count ? 'warn' : 'success',
        output_ref: JSON.stringify({ report, review_id: review.id }),
      })
      res.json({ ok: true, report, project: updated, review, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/propagation-debt/:debtId/resolve', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const old = project.reference_config?.propagation_debt || {}
      const resolved = [{ id: req.params.debtId, note: String(req.body?.note || ''), resolved_at: new Date().toISOString() }, ...asArray(old.resolved)].slice(0, 200)
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), propagation_debt: { ...old, resolved } },
      } as any)
      res.json({ ok: true, project: updated, resolved })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/propagation-debt/llm-plan', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const modelId = req.body?.model_id ? String(req.body.model_id) : undefined
      if (!modelId) return res.status(400).json({ error: 'model_id is required' })
      const [chapters, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildPropagationDebt(project, chapters, characters, outlines, reviews)
      const prompt = buildPropagationDebtLlmPrompt(project, report, chapters, characters, outlines, reviews)
      const result = await executeNovelAgent('review-agent', project, { task: prompt }, {
        activeWorkspace,
        modelId,
        maxTokens: 7000,
        temperature: 0.2,
        skipMemory: true,
      })
      const aiPlan = (result as any).output || parseJsonLikePayload((result as any).content) || { raw: (result as any).content || '' }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          propagation_debt: {
            ...(project.reference_config?.propagation_debt || {}),
            latest_report: report,
            latest_ai_plan: aiPlan,
            updated_at: new Date().toISOString(),
          },
        },
      } as any)
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'propagation_debt_llm',
        status: (result as any).error ? 'warn' : (asArray(aiPlan.do_not_generate_until).length ? 'warn' : 'ok'),
        summary: `AI 传播债务修复方案：${aiPlan.overall_verdict || report.active_count + ' 项债务'}`,
        issues: [
          ...asArray(aiPlan.do_not_generate_until).slice(0, 12).map((item: any) => `生成前阻塞：${item}`),
          ...asArray(aiPlan.repair_plan).slice(0, 12).map((item: any) => `${item.target || '修复'}：${item.action || item.reason || ''}`),
        ].filter(Boolean),
        payload: opsJson({ local_report: report, ai_plan: aiPlan, llm_result: result }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'propagation_debt_llm',
        step_name: 'llm-plan',
        status: (result as any).error ? 'warn' : 'success',
        input_ref: JSON.stringify({ model_id: modelId, local_report_id: report.debt_id }),
        output_ref: opsJson({ local_report: report, ai_plan: aiPlan, review_id: review.id, llm_result: result }),
        error_message: (result as any).error || '',
      })
      res.json({ ok: true, report, ai_plan: aiPlan, llm_result: result, project: updated, review, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

}

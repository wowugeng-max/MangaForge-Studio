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

export function registerNovelCommercialOpsQaRoutes(app: Express, ctx: CommercialOpsContext) {
  app.get('/api/novel/projects/:id/mechanical-qa', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const chapters = await listNovelChapters(activeWorkspace, project.id)
      const report = buildMechanicalQa(project, chapters)
      res.json({ ok: true, report })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/mechanical-qa/run', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const chapters = await listNovelChapters(activeWorkspace, project.id)
      const report = buildMechanicalQa(project, chapters)
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'mechanical_qa',
        status: report.status === 'ok' ? 'ok' : 'warn',
        summary: `机械质检：${report.score} 分，问题 ${report.summary.issue_count} 个`,
        issues: report.issues.slice(0, 30).map((item: any) => `第${item.chapter_no}章 ${item.message}`),
        payload: JSON.stringify({ report }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'mechanical_qa',
        step_name: 'mechanical-qa',
        status: report.status === 'ok' ? 'success' : 'warn',
        output_ref: JSON.stringify({ report, review_id: review.id }),
      })
      res.json({ ok: true, report, review, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/mechanical-qa/repair-queue', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const chapters = await listNovelChapters(activeWorkspace, project.id)
      const report = buildMechanicalQa(project, chapters)
      const tasks = report.issues
        .filter((issue: any) => ['high', 'medium'].includes(issue.severity))
        .map((issue: any) => ({
          task_id: `mqa-fix-${issue.chapter_id}-${issue.type}`,
          chapter_id: issue.chapter_id,
          chapter_no: issue.chapter_no,
          title: issue.title,
          issue_type: issue.type,
          severity: issue.severity,
          message: issue.message,
          action: issue.type === 'missing_text'
            ? '进入章节流水线生成正文。'
            : issue.type === 'long_paragraph'
              ? '拆分超长段落并检查移动端阅读节奏。'
              : issue.type === 'banned_words'
                ? '替换禁用词/弱表达。'
                : '打开章节进行局部修订。',
        }))
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'mechanical_qa_repair',
        step_name: `mechanical-qa-repair-${tasks.length}`,
        status: tasks.length ? 'ready' : 'success',
        input_ref: JSON.stringify({ source_report_id: report.report_id }),
        output_ref: JSON.stringify({ report: { score: report.score, summary: report.summary }, tasks }),
      })
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'mechanical_qa_repair',
        status: tasks.length ? 'warn' : 'ok',
        summary: `机械质检修复任务：${tasks.length} 项`,
        issues: tasks.slice(0, 30).map((item: any) => `第${item.chapter_no}章 ${item.message}`),
        payload: JSON.stringify({ run_id: run.id, tasks, report }),
      })
      res.json({ ok: true, run, review, tasks, report })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/mechanical-qa/llm-review', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const modelId = req.body?.model_id ? String(req.body.model_id) : undefined
      if (!modelId) return res.status(400).json({ error: 'model_id is required' })
      const chapters = await listNovelChapters(activeWorkspace, project.id)
      const report = buildMechanicalQa(project, chapters)
      const prompt = buildMechanicalQaLlmPrompt(project, report, chapters)
      const result = await executeNovelAgent('review-agent', project, { task: prompt }, {
        activeWorkspace,
        modelId,
        maxTokens: 6000,
        temperature: 0.18,
        skipMemory: true,
      })
      const aiReport = (result as any).output || parseJsonLikePayload((result as any).content) || { raw: (result as any).content || '' }
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'mechanical_qa_llm',
        status: (result as any).error ? 'warn' : 'ok',
        summary: `AI 复核机械质检：${aiReport.overall_verdict || report.score + ' 分'}`,
        issues: [
          ...asArray(aiReport.confirmed_issues).slice(0, 12).map((item: any) => `确认：第${item.chapter_no || '-'}章 ${item.issue || item.fix || ''}`),
          ...asArray(aiReport.missed_issues).slice(0, 12).map((item: any) => `漏检：第${item.chapter_no || '-'}章 ${item.issue || item.fix || ''}`),
        ].filter(Boolean),
        payload: opsJson({ local_report: report, ai_report: aiReport, llm_result: result }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'mechanical_qa_llm',
        step_name: 'llm-review',
        status: (result as any).error ? 'warn' : 'success',
        input_ref: JSON.stringify({ model_id: modelId, local_report_id: report.report_id }),
        output_ref: opsJson({ local_report: report, ai_report: aiReport, review_id: review.id, llm_result: result }),
        error_message: (result as any).error || '',
      })
      res.json({ ok: true, report, ai_report: aiReport, llm_result: result, review, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/first30-retention-diagnosis', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildFirst30RetentionDiagnosis(project, chapters, outlines, characters, reviews)
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'first30_retention_diagnosis',
        status: report.status === 'ready' ? 'ok' : 'warn',
        summary: `前30章留存诊断：${report.score} 分，${report.summary}`,
        issues: report.risks.slice(0, 30).map((item: any) => `${item.segment}：${item.issue}`),
        payload: JSON.stringify({ report }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'first30_retention_diagnosis',
        step_name: 'first30-retention',
        status: report.status === 'ready' ? 'success' : 'warn',
        output_ref: JSON.stringify({ report, review_id: review.id }),
      })
      res.json({ ok: true, report, review, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/first30-retention-diagnosis/repair-queue', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildFirst30RetentionDiagnosis(project, chapters, outlines, characters, reviews)
      const tasks = buildFirst30RetentionRepairTasks(report)
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'first30_retention_repair',
        step_name: `first30-retention-repair-${tasks.length}`,
        status: tasks.length ? 'ready' : 'success',
        input_ref: JSON.stringify({ source_report_id: report.report_id }),
        output_ref: JSON.stringify({
          report: { report_id: report.report_id, score: report.score, status: report.status, summary: report.summary },
          tasks,
        }),
      })
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'first30_retention_repair',
        status: tasks.length ? 'warn' : 'ok',
        summary: `前30章留存修复任务：${tasks.length} 项`,
        issues: tasks.slice(0, 30).map((item: any) => item.chapter_no ? `第${item.chapter_no}章 ${item.message}` : `${item.segment || item.task_type}：${item.message}`),
        payload: JSON.stringify({ run_id: run.id, tasks, report }),
      })
      res.json({ ok: true, run, review, tasks, report })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/reader-trial-review', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildReaderTrialReview(project, chapters, outlines, reviews)
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'reader_trial_review',
        status: report.status === 'ready' ? 'ok' : report.status === 'blocked' ? 'blocked' : 'warn',
        summary: `读者试读复盘：${report.score} 分，${report.summary}`,
        issues: report.drop_points.slice(0, 30),
        payload: JSON.stringify({ report }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'reader_trial_review',
        step_name: 'reader-trial-review',
        status: report.status === 'ready' ? 'success' : report.status === 'blocked' ? 'failed' : 'warn',
        output_ref: JSON.stringify({ report, review_id: review.id }),
      })
      res.json({ ok: true, report, review, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/reader-trial-review/repair-queue', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildReaderTrialReview(project, chapters, outlines, reviews)
      const tasks = buildReaderTrialRepairTasks(report)
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'longform_production_repair',
        step_name: `reader-trial-repair-${tasks.length}`,
        status: tasks.length ? 'ready' : 'success',
        input_ref: JSON.stringify({ source: 'reader_trial_review', source_report_id: report.report_id }),
        output_ref: JSON.stringify({
          report: {
            source: 'reader_trial_review',
            report_id: report.report_id,
            score: report.score,
            status: report.status,
            summary: report.summary,
          },
          tasks,
          recommendations: report.repair_actions || [],
        }),
      })
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'reader_trial_repair',
        status: tasks.length ? 'warn' : 'ok',
        summary: `读者试读修复任务：${tasks.length} 项`,
        issues: tasks.slice(0, 30).map((item: any) => item.chapter_no ? `第${item.chapter_no}章 ${item.message}` : item.message),
        payload: JSON.stringify({ run_id: run.id, tasks, report }),
      })
      res.json({ ok: true, run, review, tasks, report })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

}

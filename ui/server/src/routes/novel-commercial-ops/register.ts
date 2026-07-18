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
} from './builders'

export function registerNovelCommercialOpsRoutes(app: Express, ctx: CommercialOpsContext) {
  app.post('/api/novel/projects/:id/creative-command', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const plan = interpretCreativeCommand(String(req.body?.command || ''), project)
      const executable = req.body?.execute === true
      const executed: any[] = []
      if (executable) {
        for (const action of plan.actions.filter((item: any) => item.executable).slice(0, 3)) {
          if (action.key === 'mechanical_qa' || action.key === 'production_check') {
            const chapters = await listNovelChapters(activeWorkspace, project.id)
            const report = buildMechanicalQa(project, chapters)
            const review = await createNovelReview(activeWorkspace, {
              project_id: project.id,
              review_type: 'mechanical_qa',
              status: report.status === 'ok' ? 'ok' : 'warn',
              summary: `指令台机械质检：${report.score} 分，问题 ${report.summary.issue_count} 个`,
              issues: report.issues.slice(0, 30).map((item: any) => `第${item.chapter_no}章 ${item.message}`),
              payload: JSON.stringify({ command: plan.command, report }),
            })
            executed.push({ key: action.key, status: 'success', report, review_id: review.id })
          } else if (action.key === 'first30_retention') {
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
              summary: `指令台前30章留存诊断：${report.score} 分`,
              issues: report.risks.slice(0, 30).map((item: any) => `${item.segment}：${item.issue}`),
              payload: JSON.stringify({ command: plan.command, report }),
            })
            executed.push({ key: action.key, status: 'success', report, review_id: review.id })
          } else if (action.key === 'first30_repair') {
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
              step_name: `creative-command-first30-repair-${tasks.length}`,
              status: tasks.length ? 'ready' : 'success',
              input_ref: JSON.stringify({ command: plan.command, source_report_id: report.report_id }),
              output_ref: JSON.stringify({ report: { report_id: report.report_id, score: report.score, status: report.status, summary: report.summary }, tasks }),
            })
            const review = await createNovelReview(activeWorkspace, {
              project_id: project.id,
              review_type: 'first30_retention_repair',
              status: tasks.length ? 'warn' : 'ok',
              summary: `指令台前30章留存修复任务：${tasks.length} 项`,
              issues: tasks.slice(0, 30).map((item: any) => item.chapter_no ? `第${item.chapter_no}章 ${item.message}` : `${item.segment || item.task_type}：${item.message}`),
              payload: JSON.stringify({ command: plan.command, run_id: run.id, tasks, report }),
            })
            executed.push({ key: action.key, status: 'success', report, tasks, run_id: run.id, review_id: review.id })
          } else if (action.key === 'longform_pressure') {
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
              summary: `指令台300万字长线压力测试：${report.score} 分`,
              issues: report.weak_points.slice(0, 30).map((item: any) => `${item.area}：${item.issue}`),
              payload: JSON.stringify({ command: plan.command, report }),
            })
            executed.push({ key: action.key, status: 'success', report, review_id: review.id })
          } else if (action.key === 'longform_creation_diagnosis') {
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
              payload: JSON.stringify({ command: plan.command, report }),
            })
            executed.push({ key: action.key, status: 'success', report, review_id: review.id })
          } else if (action.key === 'longform_governance_summary') {
            const [runs, reviews] = await Promise.all([
              listNovelRuns(activeWorkspace, project.id),
              listNovelReviews(activeWorkspace, project.id),
            ])
            const report = buildLongformGovernanceBrief(project, runs, reviews)
            executed.push({ key: action.key, status: 'success', report })
          } else if (action.key === 'propagation_debt') {
            const [chapters, characters, outlines, reviews] = await Promise.all([
              listNovelChapters(activeWorkspace, project.id),
              listNovelCharacters(activeWorkspace, project.id),
              listNovelOutlines(activeWorkspace, project.id),
              listNovelReviews(activeWorkspace, project.id),
            ])
            const report = buildPropagationDebt(project, chapters, characters, outlines, reviews)
            await updateNovelProject(activeWorkspace, project.id, {
              reference_config: {
                ...(project.reference_config || {}),
                propagation_debt: {
                  ...(project.reference_config?.propagation_debt || {}),
                  latest_report: report,
                  updated_at: new Date().toISOString(),
                },
              },
            } as any)
            executed.push({ key: action.key, status: 'success', report })
          } else if (action.key === 'model_diagnostics') {
            executed.push({ key: action.key, status: 'ready', message: '模型诊断请在前端打开详情面板查看。' })
          } else if (action.key === 'backup_snapshot') {
            executed.push({ key: action.key, status: 'ready', message: '备份快照请使用交付区按钮创建，以便确认范围。' })
          } else if (action.key === 'genre_templates') {
            executed.push({ key: action.key, status: 'ready', templates: genreTemplates })
          }
        }
      }
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'creative_command',
        step_name: compactText(plan.command, 80) || 'creative-command',
        status: executed.some(item => item.status === 'success') ? 'success' : 'ready',
        input_ref: JSON.stringify({ command: plan.command, execute: executable }),
        output_ref: JSON.stringify({ plan, executed }),
      })
      res.json({ ok: true, plan, executed, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

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

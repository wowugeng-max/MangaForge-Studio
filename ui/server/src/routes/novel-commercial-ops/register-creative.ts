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

export function registerNovelCommercialOpsCreativeRoutes(app: Express, ctx: CommercialOpsContext) {
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

}

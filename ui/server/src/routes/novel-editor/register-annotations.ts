import type { Express } from 'express'
import { createHash } from 'crypto'
import {
  appendNovelRun,
  createNovelReview,
  listChapterVersions,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelWorldbuilding,
  updateNovelChapter,
} from '../../novel'
import { executeNovelAgent, previewNovelKnowledgeInjection } from '../../llm'
import { asArray, buildLLMResultDiagnostics, clampScore, extractLLMText, getNovelPayload, getSafetyPolicy, normalizeIssue, parseJsonLikePayload, safeJsonStringify } from '../novel-route-utils'
import { mergeProseQualityWithDeliveryRisks } from '../../novel-writing/prose-quality-delivery-link'
import { collectPlanAlignmentPatchesAfterProseChange, collectProjectPlanAlignmentPatches } from '../../novel-writing/chapter-plan-from-prose'
import { buildLiveContractChapterPatch, collectClosedBeatFamiliesFromChapters } from '../../novel-writing/closed-beat-canon'
import {
  COMPACT_REVISION_RETRY_MAX_TOKENS,
  type EditorRoutesContext,
  REVISION_MAX_TOKENS,
  applySurgicalRevisionPatch,
  buildChapterDeliveryRiskBrief,
  buildChapterQualityCard,
  buildCompactEditorRevisionPrompt,
  buildDeliveryRiskConvergenceReport,
  buildEditorReportPrompt,
  buildEditorRevisionPrompt,
  buildProseQualityRevisionReport,
  buildReviewAnnotationRepairTasks,
  buildReviewAnnotations,
  buildStorylineDiffDecisionRepairTasks,
  buildStorylineDiffDecisionReviewPayload,
  buildWorkflowRevisionContextBrief,
  createProseQualityReview,
  editorJson,
  focusDeliveryRiskBriefForRevision,
  isRevisionOutputTruncated,
  loadChapterBundle,
  shouldRetryRevisionPatch,
} from './builders'

export function registerNovelEditorAnnotationRoutes(app: Express, ctx: EditorRoutesContext) {
  app.get('/api/novel/projects/:id/review-annotations', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const payload = buildReviewAnnotations(project, chapters, reviews)
      res.json({ ok: true, ...payload })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/review-annotations/repair-queue', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const annotationPayload = buildReviewAnnotations(project, chapters, reviews)
      const taskPayload = buildReviewAnnotationRepairTasks(annotationPayload.annotations, runs, { limit: req.body?.limit })
      const tasks = taskPayload.tasks
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'longform_production_repair',
        step_name: `review-annotation-risk-repair-${tasks.length}`,
        status: tasks.length ? 'ready' : 'success',
        input_ref: JSON.stringify({
          source: 'review_annotation_risk',
          annotations_generated_at: annotationPayload.generated_at,
          open_annotations: annotationPayload.summary.open,
          high_annotations: annotationPayload.summary.high,
          skipped_existing: taskPayload.skipped_existing,
        }),
        output_ref: JSON.stringify({
          report: {
            source: 'review_annotation_risk',
            summary: tasks.length
              ? `从章节审阅批注生成 ${tasks.length} 项交稿风险修复任务。`
              : '当前没有新的交稿风险修复任务需要生成。',
            status: tasks.length ? 'needs_repair' : 'clean',
            task_count: tasks.length,
            skipped_existing: taskPayload.skipped_existing,
            skipped_resolved: taskPayload.skipped_resolved,
          },
          recommendations: [
            '优先处理核心偏移、剧情线禁揭、追读漏项和回报欠账，再恢复安全连写。',
            '每个任务处理后重新复检、同步故事状态，并确认交稿风险收敛。',
          ],
          tasks,
        }),
      })
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'longform_production_repair',
        status: tasks.length ? 'warn' : 'ok',
        summary: `交稿风险修复任务：${tasks.length} 项`,
        issues: tasks.slice(0, 30).map((task: any) => task.chapter_no ? `第${task.chapter_no}章 ${task.message}` : task.message),
        payload: JSON.stringify({ run_id: run.id, source: 'review_annotation_risk', tasks, skipped_existing: taskPayload.skipped_existing }),
      })
      res.json({ ok: true, run, review, ...taskPayload })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/review-annotations/status', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const key = String(req.body?.annotation_key || req.body?.key || '').trim()
      if (!key) return res.status(400).json({ error: 'annotation_key required' })
      const status = String(req.body?.status || 'resolved')
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'review_annotation_status',
        status,
        summary: `${status === 'resolved' ? '已处理' : '已更新'}批注：${key.slice(0, 80)}`,
        issues: [],
        payload: JSON.stringify({
          annotation_key: key,
          status,
          note: String(req.body?.note || ''),
          resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        }),
      })
      res.json({ ok: true, status: saved })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/storyline-diff-decisions', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      let reviewPayload: ReturnType<typeof buildStorylineDiffDecisionReviewPayload>
      try {
        reviewPayload = buildStorylineDiffDecisionReviewPayload(req.body || {})
      } catch (error: any) {
        return res.status(400).json({ error: String(error?.message || error) })
      }
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        ...reviewPayload,
      })
      res.json({ ok: true, decision: saved })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/storyline-diff-decisions/repair-queue', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [reviews, runs] = await Promise.all([
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const taskPayload = buildStorylineDiffDecisionRepairTasks(reviews, runs, { limit: req.body?.limit })
      const tasks = taskPayload.tasks
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'longform_production_repair',
        step_name: `storyline-diff-decision-${tasks.length}`,
        status: tasks.length ? 'ready' : 'success',
        input_ref: JSON.stringify({
          source: 'storyline_diff_decision',
          total_candidates: taskPayload.total_candidates,
          skipped_existing: taskPayload.skipped_existing,
          skipped_ignored: taskPayload.skipped_ignored,
        }),
        output_ref: JSON.stringify({
          report: {
            source: 'storyline_diff_decision',
            summary: tasks.length
              ? `从剧情线差异决策生成 ${tasks.length} 项修复或计划同步任务。`
              : '当前没有新的剧情线差异决策任务需要生成。',
            status: tasks.length ? 'needs_repair' : 'clean',
            task_count: tasks.length,
            skipped_existing: taskPayload.skipped_existing,
            skipped_ignored: taskPayload.skipped_ignored,
          },
          recommendations: [
            '先处理回修正文任务，确认计划内剧情线在正文中兑现，再处理计划同步候选。',
            '接受为新计划前必须确认不破坏全书核心承诺、当前卷爆点和禁揭边界。',
          ],
          tasks,
        }),
      })
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'longform_production_repair',
        status: tasks.length ? 'warn' : 'ok',
        summary: `剧情线决策任务：${tasks.length} 项`,
        issues: tasks.slice(0, 30).map((task: any) => task.chapter_no ? `第${task.chapter_no}章 ${task.message}` : task.message),
        payload: JSON.stringify({ run_id: run.id, source: 'storyline_diff_decision', tasks, skipped_existing: taskPayload.skipped_existing, skipped_ignored: taskPayload.skipped_ignored }),
      })
      res.json({ ok: true, run, review, ...taskPayload })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

}

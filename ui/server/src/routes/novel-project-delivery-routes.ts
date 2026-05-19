import type { Express } from 'express'
import {
  createNovelReview,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  updateNovelProject,
  updateNovelRun,
} from '../novel'
import {
  formatContentType,
  formatExtension,
  normalizeExportFormat,
  renderDocxExport,
  renderEpubExport,
  renderNovelTextExport,
  sanitizeExportFilename,
} from './novel-delivery-export-renderer'
import { buildNovelExportPayload, getExportRange } from './novel-delivery-export-payload'
import {
  buildDeliveryReleaseAudit,
  buildReleaseRepairTasks,
} from './novel-delivery-release-audit'
import { createReleaseRepairQueueRun, executeReleaseBatchRun } from './novel-delivery-repair-runner'
import { parseJsonLikePayload } from './novel-route-utils'

type ProjectDeliveryRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  buildChapterContextPackage: (workspace: string, project: any, chapter: any, chapters: any[], worldbuilding: any[], characters: any[], outlines: any[], reviews: any[]) => Promise<any>
  buildReferenceUsageReport: (workspace: string, project: any, taskType: string, generatedText?: string) => Promise<any>
  buildStructuralSimilarityReport: (chapter: any, referenceReport: any) => any
}

export function registerNovelProjectDeliveryRoutes(app: Express, ctx: ProjectDeliveryRoutesContext) {
  app.get('/api/novel/projects/:id/export-preview', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const payload = buildNovelExportPayload(project, chapters, outlines, getExportRange(req.query))
      const releaseAudit = buildDeliveryReleaseAudit(project, payload, chapters, reviews)
      const exportRecords = reviews
        .filter(item => item.review_type === 'delivery_export')
        .slice()
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        .slice(0, 8)
        .map(item => ({ id: item.id, status: item.status, summary: item.summary, created_at: item.created_at, payload: parseJsonLikePayload(item.payload) || {} }))
      const releaseLocks = reviews
        .filter(item => item.review_type === 'delivery_release_lock')
        .slice()
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        .slice(0, 8)
        .map(item => ({ id: item.id, status: item.status, summary: item.summary, created_at: item.created_at, payload: parseJsonLikePayload(item.payload) || {} }))
      res.json({
        ok: true,
        export: {
          project: payload.project,
          stats: payload.stats,
          gate: payload.gate,
          release_audit: releaseAudit,
          range: payload.range,
          warnings: payload.warnings,
          records: exportRecords,
          release_locks: releaseLocks,
          generated_at: payload.generated_at,
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/export', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const format = normalizeExportFormat(req.query.format)
      const [chapters, outlines] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
      ])
      const payload = buildNovelExportPayload(project, chapters, outlines, getExportRange(req.query))
      const content = format === 'docx'
        ? await renderDocxExport(payload)
        : format === 'epub'
          ? await renderEpubExport(payload)
          : renderNovelTextExport(payload, format)
      const filename = `${sanitizeExportFilename(project.title)}-${new Date().toISOString().slice(0, 10)}.${formatExtension(format)}`
      await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'delivery_export',
        status: payload.gate.status === 'ready' ? 'ok' : payload.gate.status,
        summary: `导出 ${format.toUpperCase()}：${payload.stats.written_count}/${payload.stats.chapter_count} 章，${payload.stats.word_count} 字`,
        issues: [...payload.gate.blockers, ...payload.warnings],
        payload: JSON.stringify({
          format,
          filename,
          stats: payload.stats,
          gate: payload.gate,
          range: payload.range,
          generated_at: payload.generated_at,
        }),
      })
      res.setHeader('Content-Type', formatContentType(format))
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
      res.send(content)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/release-lock', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const payload = buildNovelExportPayload(project, chapters, outlines, getExportRange(req.body || {}))
      const releaseAudit = buildDeliveryReleaseAudit(project, payload, chapters, reviews)
      const force = Boolean(req.body?.force)
      if (!releaseAudit.can_release && !force) {
        return res.status(409).json({
          ok: false,
          error: 'release gate blocked',
          release_audit: releaseAudit,
        })
      }
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'delivery_release_lock',
        status: releaseAudit.can_release ? 'ok' : 'forced',
        summary: `发布包锁定：${releaseAudit.manifest.range_label}，${releaseAudit.manifest.stats.written_count}/${releaseAudit.manifest.stats.chapter_count} 章，评分 ${releaseAudit.score}`,
        issues: [...releaseAudit.blockers, ...releaseAudit.warnings].map((item: any) => `${item.label}：${item.message}`),
        payload: JSON.stringify({
          audit: releaseAudit,
          manifest: releaseAudit.manifest,
          forced: force && !releaseAudit.can_release,
          locked_at: new Date().toISOString(),
        }),
      })
      const locks = Array.isArray(project.reference_config?.delivery_release_locks) ? project.reference_config.delivery_release_locks : []
      const lockSummary = {
        review_id: saved.id,
        package_id: releaseAudit.manifest.package_id,
        range: releaseAudit.manifest.range,
        range_label: releaseAudit.manifest.range_label,
        stats: releaseAudit.manifest.stats,
        score: releaseAudit.score,
        status: saved.status,
        text_hash: releaseAudit.manifest.text_hash,
        locked_at: saved.created_at,
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          latest_delivery_release_lock: lockSummary,
          delivery_release_locks: [lockSummary, ...locks].slice(0, 20),
        },
      } as any)
      res.json({ ok: true, release_lock: lockSummary, review: saved, release_audit: releaseAudit, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/release-repair-plan', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const payload = buildNovelExportPayload(project, chapters, outlines, getExportRange(req.query))
      const releaseAudit = buildDeliveryReleaseAudit(project, payload, chapters, reviews)
      const repairTasks = buildReleaseRepairTasks(releaseAudit)
      res.json({
        ok: true,
        release_audit: releaseAudit,
        repair_plan: {
          status: repairTasks.length ? 'needs_repair' : 'clean',
          task_count: repairTasks.length,
          tasks: repairTasks,
          summary: {
            high: repairTasks.filter(task => task.priority === 'high').length,
            medium: repairTasks.filter(task => task.priority === 'medium').length,
            chapter_task_count: repairTasks.filter(task => task.scope === 'chapters').reduce((sum, task) => sum + Number(task.count || 0), 0),
          },
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/release-repair-queue', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const { queueRun, repairTasks, relatedRuns, releaseAudit } = await createReleaseRepairQueueRun(activeWorkspace, project, chapters, outlines, reviews, req.body || {})
      res.json({ ok: true, run: queueRun, repair_plan: { tasks: repairTasks, related_runs: relatedRuns }, release_audit: releaseAudit })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/release-repair-auto', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const queue = await createReleaseRepairQueueRun(activeWorkspace, project, chapters, outlines, reviews, req.body || {})
      const executed: any[] = []
      for (const run of queue.runnableRuns) {
        const result = await executeReleaseBatchRun(activeWorkspace, project, run, ctx, req.body || {})
        executed.push({
          run_id: result.run?.id || run.id,
          run_type: run.run_type,
          status: result.run?.status || 'unknown',
          processed: result.results.length,
          failed: result.failed.length,
        })
      }
      const [latestChapters, latestOutlines, latestReviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const exportPayload = buildNovelExportPayload(project, latestChapters, latestOutlines, queue.payload.range)
      const releaseAudit = buildDeliveryReleaseAudit(project, exportPayload, latestChapters, latestReviews)
      await updateNovelRun(activeWorkspace, queue.queueRun.id, {
        status: releaseAudit.can_release ? 'success' : executed.some(item => item.status === 'failed') ? 'failed' : 'ready',
        output_ref: JSON.stringify({
          ...(parseJsonLikePayload(queue.queueRun.output_ref) || {}),
          phase: executed.length ? '已执行自动发布修复并重新审核' : '没有可自动执行的发布修复项',
          progress: releaseAudit.can_release ? 100 : 65,
          auto_executed_runs: executed,
          latest_release_audit: {
            status: releaseAudit.status,
            score: releaseAudit.score,
            can_release: releaseAudit.can_release,
            blocker_count: releaseAudit.blockers.length,
            warning_count: releaseAudit.warnings.length,
          },
          updated_at: new Date().toISOString(),
        }),
      })
      res.json({
        ok: true,
        run: queue.queueRun,
        auto_executed_runs: executed,
        repair_plan: { tasks: queue.repairTasks, related_runs: queue.relatedRuns },
        release_audit: releaseAudit,
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/release-repair-runs/:runId/execute', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      const run = runs.find(item => item.id === Number(req.params.runId))
      if (!run || !['release_quality_batch', 'release_similarity_batch'].includes(run.run_type)) {
        return res.status(404).json({ error: 'release repair batch run not found' })
      }
      const result = await executeReleaseBatchRun(activeWorkspace, project, run, ctx, req.body || {})
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const range = parseJsonLikePayload(run.input_ref)?.range || getExportRange(req.body || {})
      const exportPayload = buildNovelExportPayload(project, chapters, outlines, range)
      const releaseAudit = buildDeliveryReleaseAudit(project, exportPayload, chapters, reviews)
      res.json({ ok: true, ...result, release_audit: releaseAudit })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

}

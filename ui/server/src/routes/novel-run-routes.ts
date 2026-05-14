import type { Express } from 'express'
import {
  appendNovelRun,
  listNovelReviews,
  listNovelRuns,
  updateNovelProject,
  updateNovelRun,
} from '../novel'
import { parseJsonLikePayload } from './novel-route-utils'

type RunRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  runQueueWorkers: Map<number, any>
  getProductionBudgetDecision: (project: any, runs: any[]) => any
  buildPipelineSteps: () => any[]
  executeChapterGroupRunRecord: (workspace: string, project: any, run: any, options?: any) => Promise<any>
}

export function registerNovelRunRoutes(app: Express, ctx: RunRoutesContext) {
  app.get('/api/novel/projects/:id/reviews', async (req, res) => {
    try {
      res.json(await listNovelReviews(ctx.getWorkspace(), Number(req.params.id)))
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/runs', async (req, res) => {
    try {
      res.json(await listNovelRuns(ctx.getWorkspace(), Number(req.query.project_id || 0)))
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/run-queue', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.params.id)
      const project = await ctx.getProject(activeWorkspace, projectId)
      const runs = await listNovelRuns(activeWorkspace, projectId)
      const queued = runs.filter(run => ['queued', 'ready', 'paused', 'running'].includes(run.status) && ['chapter_group_generation', 'chapter_generation_pipeline', 'quality_benchmark', 'book_review'].includes(run.run_type))
      const persistentWorker = project?.reference_config?.run_queue_worker || null
      const memoryWorker = ctx.runQueueWorkers.get(projectId)
      const worker = memoryWorker || (persistentWorker?.status === 'running' ? { ...persistentWorker, status: 'stale', phase: '后端进程已重启，可点击恢复 worker' } : persistentWorker) || { status: 'idle' }
      res.json({
        ok: true,
        worker,
        queue: queued.map(run => ({ id: run.id, type: run.run_type, step: run.step_name, status: run.status, created_at: run.created_at, payload: parseJsonLikePayload(run.output_ref) })),
        summary: {
          queued: queued.filter(run => run.status === 'queued' || run.status === 'ready').length,
          running: queued.filter(run => run.status === 'running').length,
          paused: queued.filter(run => run.status === 'paused').length,
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/run-queue/worker-status', async (req, res) => {
    const activeWorkspace = ctx.getWorkspace()
    const projectId = Number(req.params.id)
    const project = await ctx.getProject(activeWorkspace, projectId)
    const persistentWorker = project?.reference_config?.run_queue_worker || null
    const worker = ctx.runQueueWorkers.get(projectId) || (persistentWorker?.status === 'running' ? { ...persistentWorker, status: 'stale', phase: '后端进程已重启，可点击恢复 worker' } : persistentWorker) || { status: 'idle' }
    res.json({ ok: true, worker })
  })

  app.post('/api/novel/projects/:id/run-queue/recover', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      let recoveredRuns = 0
      for (const run of runs.filter(item => item.run_type === 'chapter_group_generation' && item.status === 'running')) {
        const payload = parseJsonLikePayload(run.output_ref) || {}
        await updateNovelRun(activeWorkspace, run.id, {
          status: 'ready',
          output_ref: JSON.stringify({ ...payload, lock: null, phase: '手动恢复：运行中任务已转回待执行', recovered_at: new Date().toISOString() }),
        })
        recoveredRuns += 1
      }
      const worker = {
        ...(project.reference_config?.run_queue_worker || {}),
        status: 'idle',
        stop_requested: false,
        phase: `已恢复 ${recoveredRuns} 个运行中任务`,
        recovered_runs: recoveredRuns,
        updated_at: new Date().toISOString(),
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), run_queue_worker: worker },
      } as any)
      ctx.runQueueWorkers.set(project.id, worker)
      res.json({ ok: true, worker, project: updated, recovered_runs: recoveredRuns })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/run-queue/start-worker', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const existing = ctx.runQueueWorkers.get(project.id)
      if (['running', 'stopping'].includes(existing?.status)) return res.json({ ok: true, worker: existing, message: '后台 worker 已在运行' })
      const staleRuns = (await listNovelRuns(activeWorkspace, project.id)).filter(item => item.run_type === 'chapter_group_generation' && item.status === 'running')
      for (const staleRun of staleRuns) {
        const stalePayload = parseJsonLikePayload(staleRun.output_ref) || {}
        await updateNovelRun(activeWorkspace, staleRun.id, {
          status: 'ready',
          output_ref: JSON.stringify({ ...stalePayload, phase: '后端重启后自动恢复为待执行', recovered_at: new Date().toISOString() }),
        })
      }
      const worker = {
        status: 'running',
        stop_requested: false,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        processed_runs: 0,
        processed_chapters: 0,
        last_error: '',
      }
      ctx.runQueueWorkers.set(project.id, worker)
      await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), run_queue_worker: worker },
      } as any)
      const maxRuns = Math.max(1, Math.min(200, Number(req.body.max_runs || 200)))
      const maxChaptersPerRun = Math.max(1, Math.min(10, Number(req.body.max_chapters_per_run || 1)))
      void (async () => {
        try {
          while (!worker.stop_requested && worker.processed_runs < maxRuns) {
            const latestBudgetProject = await ctx.getProject(activeWorkspace, project.id)
            const budgetProject = latestBudgetProject || project
            const runs = await listNovelRuns(activeWorkspace, project.id)
            const budgetDecision = ctx.getProductionBudgetDecision(budgetProject, runs)
            worker.budget = budgetDecision
            if (budgetDecision.blocked) {
              worker.status = 'paused_budget'
              worker.phase = `预算熔断：${budgetDecision.reasons.join('；')}`
              worker.updated_at = new Date().toISOString()
              await updateNovelProject(activeWorkspace, project.id, {
                reference_config: { ...(budgetProject.reference_config || {}), run_queue_worker: { ...worker } },
              } as any).catch(() => null)
              break
            }
            const isRunDue = (item: any) => {
              const payload = parseJsonLikePayload(item.output_ref) || {}
              const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
              const current = chapters[Number(payload.current_index || 0)] || null
              if (!current?.next_run_at) return true
              return new Date(String(current.next_run_at)).getTime() <= Date.now()
            }
            const run = runs
              .filter(item => item.run_type === 'chapter_group_generation' && ['queued', 'ready'].includes(item.status) && isRunDue(item))
              .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0]
            if (!run) break
            worker.current_run_id = run.id
            worker.phase = `执行任务 ${run.step_name || run.id}`
            worker.updated_at = new Date().toISOString()
            const result = await ctx.executeChapterGroupRunRecord(activeWorkspace, budgetProject, run, {
              ...req.body,
              max_chapters: maxChaptersPerRun,
              model_id: req.body.model_id,
              lock_owner: `worker-${project.id}-${worker.started_at}`,
            })
            worker.processed_runs += 1
            worker.processed_chapters += Number(result.processed || 0)
            worker.last_run_status = result.status
            worker.updated_at = new Date().toISOString()
            const latestProject = await ctx.getProject(activeWorkspace, project.id).catch(() => null)
            if (latestProject) {
              await updateNovelProject(activeWorkspace, project.id, {
                reference_config: { ...(latestProject.reference_config || {}), run_queue_worker: { ...worker } },
              } as any).catch(() => null)
            }
          }
          worker.status = worker.stop_requested ? 'stopped' : 'idle'
          worker.phase = worker.stop_requested ? '已停止' : '队列已空'
          worker.finished_at = new Date().toISOString()
          worker.updated_at = worker.finished_at
        } catch (error: any) {
          worker.status = 'failed'
          worker.last_error = String(error?.message || error)
          worker.finished_at = new Date().toISOString()
          worker.updated_at = worker.finished_at
        } finally {
          ctx.runQueueWorkers.set(project.id, { ...worker })
          const latestProject = await ctx.getProject(activeWorkspace, project.id).catch(() => null)
          if (latestProject) {
            await updateNovelProject(activeWorkspace, project.id, {
              reference_config: { ...(latestProject.reference_config || {}), run_queue_worker: { ...worker } },
            } as any).catch(() => null)
          }
        }
      })()
      res.json({ ok: true, worker, message: '后台 worker 已启动' })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/run-queue/stop-worker', async (req, res) => {
    const projectId = Number(req.params.id)
    const activeWorkspace = ctx.getWorkspace()
    const project = await ctx.getProject(activeWorkspace, projectId).catch(() => null)
    const worker = ctx.runQueueWorkers.get(projectId) || project?.reference_config?.run_queue_worker || { status: 'idle' }
    worker.stop_requested = true
    worker.status = worker.status === 'running' ? 'stopping' : worker.status
    worker.updated_at = new Date().toISOString()
    ctx.runQueueWorkers.set(projectId, worker)
    if (project) {
      await updateNovelProject(activeWorkspace, projectId, {
        reference_config: { ...(project.reference_config || {}), run_queue_worker: worker },
      } as any).catch(() => null)
    }
    res.json({ ok: true, worker })
  })

  app.post('/api/novel/projects/:id/run-queue/drain', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.params.id)
      const runs = await listNovelRuns(activeWorkspace, projectId)
      const executable = runs
        .filter(run => run.run_type === 'chapter_group_generation' && ['queued', 'ready'].includes(run.status))
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        .slice(0, Math.max(1, Math.min(5, Number(req.body.limit || 1))))
      const drained = []
      for (const run of executable) {
        const payload = parseJsonLikePayload(run.output_ref) || {}
        drained.push({ run_id: run.id, execute_endpoint: `/api/novel/projects/${projectId}/chapter-groups/${run.id}/execute`, current_index: payload.current_index || 0 })
      }
      res.json({ ok: true, drained, note: '本地版队列采用可恢复任务记录；前端或调用方按 execute_endpoint 拉起实际执行。' })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/runs/:id/pause', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const runs = await listNovelRuns(activeWorkspace, Number(req.body.project_id || req.query.project_id || 0))
      const run = runs.find(item => item.id === Number(req.params.id))
      if (!run) return res.status(404).json({ error: 'run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'paused',
        output_ref: JSON.stringify({ ...payload, paused_at: new Date().toISOString(), pause_reason: String(req.body.reason || 'manual') }),
      })
      res.json({ ok: true, run: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/runs/:id/resume', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const runs = await listNovelRuns(activeWorkspace, Number(req.body.project_id || req.query.project_id || 0))
      const run = runs.find(item => item.id === Number(req.params.id))
      if (!run) return res.status(404).json({ error: 'run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      if (run.run_type === 'chapter_group_generation') {
        const updated = await updateNovelRun(activeWorkspace, run.id, {
          status: 'ready',
          output_ref: JSON.stringify({ ...payload, phase: '等待继续执行', resumed_at: new Date().toISOString() }),
        })
        return res.json({ ok: true, run: updated, execute_endpoint: `/api/novel/projects/${run.project_id}/chapter-groups/${run.id}/execute`, group: parseJsonLikePayload(updated?.output_ref) })
      }
      const steps = Array.isArray(payload.steps) ? payload.steps : ctx.buildPipelineSteps()
      const currentStep = String(req.body.current_step || payload.can_resume_from || payload.current_step || 'draft')
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'ready',
        output_ref: JSON.stringify({
          ...payload,
          current_step: currentStep,
          resumed_at: new Date().toISOString(),
          steps: steps.map((step: any) => step.key === currentStep ? { ...step, status: step.status === 'pending' ? 'ready' : step.status } : step),
          resume_endpoint: payload.resume_endpoint || `/api/novel/chapters/${payload.chapter_id}/generate-prose`,
        }),
      })
      res.json({ ok: true, run: updated, resume_endpoint: payload.resume_endpoint || `/api/novel/chapters/${payload.chapter_id}/generate-prose`, pipeline: parseJsonLikePayload(updated?.output_ref) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/runs', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id || 0)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const record = await appendNovelRun(activeWorkspace, {
        project_id: projectId,
        run_type: String(req.body.run_type || 'manual'),
        step_name: String(req.body.step_name || 'summary'),
        status: String(req.body.status || 'success'),
        input_ref: typeof req.body.input_ref === 'string' ? req.body.input_ref : JSON.stringify(req.body.input_ref || {}),
        output_ref: typeof req.body.output_ref === 'string' ? req.body.output_ref : JSON.stringify(req.body.output_ref || {}),
        duration_ms: Number(req.body.duration_ms || 0),
        error_message: String(req.body.error_message || ''),
      })
      res.json(record)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}

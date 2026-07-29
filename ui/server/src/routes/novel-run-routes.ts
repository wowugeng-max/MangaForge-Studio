export * from './novel-run-helpers'
import type { Express } from 'express'
import {
  appendNovelRun,
  getNovelReview,
  getNovelRun,
  listNovelChapters,
  listNovelReviewSummaries,
  listNovelReviews,
  listNovelRunSummaries,
  listNovelRuns,
  updateNovelProject,
  updateNovelRun,
} from '../novel'
import { parseJsonLikePayload } from './novel-route-utils'
import { buildPublicEditorRevisionRun } from './novel-editor/revision-run-view'
import {
  RunRoutesContext,
  buildAgentAudit,
  clampNumber,
  findApprovalBlockerResumeGuard,
  findTerminalAdmissionResumeGuard,
  isAbortLikeError,
  isRepairTaskRunType,
  optionalSummaryLimit,
  publicWorkerState,
  rejectInvalidQueryView,
  requireProjectId,
  sleep
} from './novel-run-helpers'

export function registerNovelRunRoutes(app: Express, ctx: RunRoutesContext) {
  app.get('/api/novel/projects/:id/reviews', async (req, res) => {
    try {
      const view = String(req.query?.view || 'full')
      if (!['full', 'summary'].includes(view)) return rejectInvalidQueryView(res, view, ['full', 'summary'])
      const limit = view === 'summary' ? optionalSummaryLimit(req, res) : undefined
      if (limit === null) return
      res.json(view === 'summary'
        ? await listNovelReviewSummaries(ctx.getWorkspace(), Number(req.params.id), limit)
        : await listNovelReviews(ctx.getWorkspace(), Number(req.params.id)))
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/reviews/:reviewId', async (req, res) => {
    try {
      const projectId = requireProjectId(req, res)
      if (projectId === null) return
      const review = await getNovelReview(ctx.getWorkspace(), Number(req.params.reviewId), projectId)
      if (!review) return res.status(404).json({ error: 'review not found' })
      res.json(review)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/runs', async (req, res) => {
    try {
      const view = String(req.query?.view || 'full')
      if (!['full', 'summary'].includes(view)) return rejectInvalidQueryView(res, view, ['full', 'summary'])
      const limit = view === 'summary' ? optionalSummaryLimit(req, res) : undefined
      if (limit === null) return
      const workspace = ctx.getWorkspace()
      const projectId = Number(req.query.project_id || 0)
      if (view === 'summary') {
        const summaries = await listNovelRunSummaries(workspace, projectId, limit)
        if (!summaries.some(run => run.run_type === 'editor_revision')) return res.json(summaries)
        const fullRuns = await listNovelRuns(workspace, projectId)
        const fullById = new Map(fullRuns.map(run => [run.id, run]))
        return res.json(summaries.map(run => run.run_type === 'editor_revision'
          ? buildPublicEditorRevisionRun(fullById.get(run.id) || run as any)
          : run))
      }
      const runs = await listNovelRuns(workspace, projectId)
      return res.json(runs.map(run => run.run_type === 'editor_revision'
        ? buildPublicEditorRevisionRun(run)
        : run))
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/runs/:id', async (req, res) => {
    try {
      const projectId = requireProjectId(req, res)
      if (projectId === null) return
      const run = await getNovelRun(ctx.getWorkspace(), Number(req.params.id), projectId)
      if (!run) return res.status(404).json({ error: 'run not found' })
      res.json(run.run_type === 'editor_revision' ? buildPublicEditorRevisionRun(run) : run)
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

  app.get('/api/novel/projects/:id/tasks', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.params.id)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, projectId)
      const worker = ctx.runQueueWorkers.get(projectId)
        || (project.reference_config?.run_queue_worker?.status === 'running'
          ? { ...project.reference_config.run_queue_worker, status: 'stale', phase: '后端进程已重启，可点击恢复 worker' }
          : project.reference_config?.run_queue_worker)
        || { status: 'idle' }
      const normalizeRun = (run: any) => {
        if (run.run_type === 'editor_revision') {
          const publicRun = buildPublicEditorRevisionRun(run)
          return {
            ...publicRun,
            type_label: '单章修订',
            step_name: `第${publicRun.chapter_no}章 ${publicRun.chapter_title}`.trim(),
          }
        }
        const payload = parseJsonLikePayload(run.output_ref) || {}
        const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
        const terminalAdmission = Boolean(findTerminalAdmissionResumeGuard(payload))
        const repairTasks = Array.isArray(payload.tasks) ? payload.tasks : []
        const isRepairTaskRun = isRepairTaskRunType(run.run_type)
        const done = chapters.filter((item: any) => ['success', 'skipped', 'written'].includes(item.status)).length
        const repairResolved = repairTasks.filter((task: any) => task.task_status === 'resolved').length
        const repairNeedsReview = repairTasks.filter((task: any) => task.task_status === 'needs_review').length
        const repairOpen = repairTasks.filter((task: any) => !task.task_status || task.task_status === 'open' || task.task_status === 'in_progress').length
        const repairPercent = repairTasks.length
          ? Math.round(((repairResolved + repairNeedsReview * 0.5) / repairTasks.length) * 100)
          : 0
        const percent = isRepairTaskRun && repairTasks.length
          ? repairPercent
          : chapters.length
            ? Math.round((done / chapters.length) * 100)
            : ['success', 'ok', 'completed'].includes(run.status) ? 100 : ['running'].includes(run.status) ? 50 : 0
        const repairPhase = repairTasks.length
          ? `待处理 ${repairOpen} 项，需复查 ${repairNeedsReview} 项，已处理 ${repairResolved}/${repairTasks.length}`
          : ''
        const lastError = payload.last_error?.error || payload.error || run.error_message || ''
        return {
          id: run.id,
          run_type: run.run_type,
          type_label: run.run_type === 'chapter_group_generation' ? '章节群生成'
            : run.run_type === 'chapter_generation_pipeline' ? '章节流水线'
              : run.run_type === 'batch_generate_prose' ? '批量正文生成'
                : run.run_type === 'generate_prose' ? '正文生成'
                  : run.run_type === 'original_incubation' ? '原创孵化'
                    : run.run_type === 'plan' ? '全案规划'
                      : run.run_type === 'creative_command' ? '创作指令'
                        : run.run_type === 'release_repair_queue' ? '发布修复队列'
                        : run.run_type === 'release_quality_batch' ? '发布质检批量任务'
                          : run.run_type === 'release_similarity_batch' ? '发布相似度批量任务'
                              : run.run_type === 'regression_benchmark' ? '回归基准'
                                : run.run_type === 'ab_experiment' ? 'A/B 实验'
                                  : run.run_type === 'ab_sandbox' ? 'A/B 沙盒实写'
                                    : run.run_type === 'ab_sandbox_apply' ? 'A/B 沙盒采纳'
                                      : run.run_type === 'mechanical_qa' ? '机械质检'
                                        : run.run_type === 'mechanical_qa_llm' ? 'AI机械质检复核'
                                          : run.run_type === 'propagation_debt' ? '传播债务'
                                            : run.run_type === 'propagation_debt_llm' ? 'AI传播债务方案'
                                              : run.run_type === 'project_backup' ? '项目备份'
                                                : run.run_type === 'project_backup_import' ? '备份导入'
                                                  : run.run_type === 'mechanical_qa_repair' ? '机械质检修复'
                                                    : run.run_type === 'first30_retention_diagnosis' ? '前30章留存诊断'
                                                      : run.run_type === 'first30_retention_repair' ? '前30章留存修复'
                                                        : run.run_type === 'longform_pressure_test' ? '300万字压力测试'
                                                          : run.run_type === 'future_100_skeleton' ? '未来100章骨架'
                                                            : run.run_type === 'future_100_skeleton_apply' ? '应用未来100章骨架'
                                                              : run.run_type === 'longform_production_repair' ? '长线生产修复'
                                                    : run.run_type === 'genre_template_apply' ? '类型模板'
                      : run.run_type,
          step_name: run.step_name,
          status: run.status,
          phase: payload.phase || (isRepairTaskRun ? repairPhase : payload.current_step) || run.step_name || '',
          progress: percent,
          current_index: payload.current_index ?? null,
          chapter_count: chapters.length,
          task_count: repairTasks.length,
          repair_task_summary: isRepairTaskRun ? {
            total: repairTasks.length,
            open: repairOpen,
            needs_review: repairNeedsReview,
            resolved: repairResolved,
          } : null,
          production_mode: payload.production_mode || payload.policy?.production_mode || '',
          failed_count: chapters.filter((item: any) => item.status === 'failed').length,
          approval_count: chapters.filter((item: any) => item.status === 'needs_approval').length,
          can_pause: !isRepairTaskRun && ['running', 'ready'].includes(run.status),
          can_resume: !terminalAdmission && !isRepairTaskRun && ['paused', 'failed', 'ready'].includes(run.status),
          can_execute: !terminalAdmission && run.run_type === 'chapter_group_generation' && ['ready', 'paused', 'failed', 'running'].includes(run.status),
          can_process_repair_tasks: isRepairTaskRun && repairTasks.length > 0 && ['ready', 'paused', 'failed', 'running'].includes(run.status),
          error: lastError,
          recovery_plan: lastError ? (payload.last_error?.recovery_plan || null) : null,
          created_at: run.created_at,
          duration_ms: run.duration_ms,
          payload,
        }
      }
      const tasks = runs
        .filter(run => [
          'chapter_group_generation',
          'chapter_generation_pipeline',
          'batch_generate_prose',
          'generate_prose',
          'original_incubation',
          'plan',
          'creative_command',
          'agent_execute',
          'repair',
          'release_repair_queue',
          'release_quality_batch',
          'release_similarity_batch',
          'regression_benchmark',
          'ab_experiment',
          'ab_sandbox',
          'ab_sandbox_apply',
          'mechanical_qa',
          'propagation_debt',
          'project_backup',
          'project_backup_import',
          'genre_template_apply',
          'mechanical_qa_repair',
          'first30_retention_diagnosis',
          'first30_retention_repair',
          'longform_pressure_test',
          'future_100_skeleton',
          'future_100_skeleton_apply',
          'longform_production_repair',
          'editor_revision',
        ].includes(run.run_type))
        .map(normalizeRun)
      const active = tasks.filter(task => ['queued', 'ready', 'running', 'cancel_requested', 'paused', 'needs_approval'].includes(task.status))
      res.json({
        ok: true,
        worker,
        tasks,
        active,
        summary: {
          total: tasks.length,
          active: active.length,
          running: tasks.filter(task => task.status === 'running').length,
          paused: tasks.filter(task => task.status === 'paused').length,
          failed: tasks.filter(task => task.status === 'failed').length,
          needs_approval: tasks.reduce((sum, task) => sum + Number(task.approval_count || 0), 0),
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/agent-audit', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.params.id)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [runs, reviews, chapters] = await Promise.all([
        listNovelRuns(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
        listNovelChapters(activeWorkspace, projectId),
      ])
      res.json({ ok: true, audit: buildAgentAudit(project, runs, reviews, chapters) })
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
    res.json({ ok: true, worker: publicWorkerState(worker) })
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
        reference_config: { ...(project.reference_config || {}), run_queue_worker: publicWorkerState(worker) },
      } as any)
      ctx.runQueueWorkers.set(project.id, worker)
      res.json({ ok: true, worker: publicWorkerState(worker), project: updated, recovered_runs: recoveredRuns })
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
      if (['running', 'stopping'].includes(existing?.status)) return res.json({ ok: true, worker: publicWorkerState(existing), message: '后台 worker 已在运行' })
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
        reference_config: { ...(project.reference_config || {}), run_queue_worker: publicWorkerState(worker) },
      } as any)
      const maxRuns = Math.max(1, Math.min(200, Number(req.body.max_runs || 200)))
      const maxChaptersPerRun = Math.max(1, Math.min(10, Number(req.body.max_chapters_per_run || 1)))
      const chapterTimeoutMs = Math.max(30_000, Math.min(1_800_000, Number(req.body.chapter_timeout_ms || req.body.chapterTimeoutMs || project.reference_config?.production_budget?.chapter_timeout_ms || 600_000)))
      const idleWaitMs = clampNumber(
        req.body.idle_wait_ms ?? req.body.idleWaitMs ?? project.reference_config?.production_budget?.idle_wait_ms ?? 0,
        0,
        0,
        300_000,
      )
      const idlePollMs = clampNumber(
        req.body.idle_poll_ms ?? req.body.idlePollMs ?? project.reference_config?.production_budget?.idle_poll_ms ?? 1_000,
        1_000,
        10,
        30_000,
      )
      void (async () => {
        try {
          let idleStartedAt: number | null = null
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
                reference_config: { ...(budgetProject.reference_config || {}), run_queue_worker: publicWorkerState(worker) },
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
            const getNextRunAt = (item: any) => {
              const payload = parseJsonLikePayload(item.output_ref) || {}
              const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
              const current = chapters[Number(payload.current_index || 0)] || null
              const nextRunAt = current?.next_run_at ? new Date(String(current.next_run_at)).getTime() : 0
              return Number.isFinite(nextRunAt) ? nextRunAt : 0
            }
            const run = runs
              .filter(item => item.run_type === 'chapter_group_generation' && ['queued', 'ready'].includes(item.status) && isRunDue(item))
              .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0]
            if (!run) {
              const now = Date.now()
              const nextDueAt = runs
                .filter(item => item.run_type === 'chapter_group_generation' && ['queued', 'ready'].includes(item.status))
                .map(getNextRunAt)
                .filter(nextRunAt => nextRunAt > now)
                .sort((a, b) => a - b)[0]
              if (!idleWaitMs || !nextDueAt) break
              if (idleStartedAt === null) idleStartedAt = now
              const remainingWaitMs = idleWaitMs - (now - idleStartedAt)
              if (remainingWaitMs <= 0) break
              const waitMs = Math.max(1, Math.min(idlePollMs, nextDueAt - now, remainingWaitMs))
              worker.phase = `等待下次重试：${new Date(nextDueAt).toISOString()}`
              worker.updated_at = new Date().toISOString()
              await sleep(waitMs)
              continue
            }
            idleStartedAt = null
            worker.current_run_id = run.id
            worker.phase = `执行任务 ${run.step_name || run.id}`
            worker.updated_at = new Date().toISOString()
            const chapterAbortController = new AbortController()
            worker.current_abort_controller = chapterAbortController
            worker.chapter_timeout_ms = chapterTimeoutMs
            const chapterTimeout = setTimeout(() => {
              chapterAbortController.abort()
              worker.stop_requested = true
              worker.phase = `章节执行超时：${Math.round(chapterTimeoutMs / 1000)} 秒`
              worker.updated_at = new Date().toISOString()
            }, chapterTimeoutMs)
            let result: any
            try {
              result = await ctx.executeChapterGroupRunRecord(activeWorkspace, budgetProject, run, {
                ...req.body,
                max_chapters: maxChaptersPerRun,
                model_id: req.body.model_id,
                lock_owner: `worker-${project.id}-${worker.started_at}`,
                abortSignal: chapterAbortController.signal,
                llmTimeoutMs: chapterTimeoutMs,
                chapter_timeout_ms: chapterTimeoutMs,
              })
            } finally {
              clearTimeout(chapterTimeout)
              if (worker.current_abort_controller === chapterAbortController) delete worker.current_abort_controller
            }
            worker.processed_runs += 1
            worker.processed_chapters += Number(result.processed || 0)
            worker.last_run_status = result.status
            worker.updated_at = new Date().toISOString()
            const latestProject = await ctx.getProject(activeWorkspace, project.id).catch(() => null)
            if (latestProject) {
              await updateNovelProject(activeWorkspace, project.id, {
                reference_config: { ...(latestProject.reference_config || {}), run_queue_worker: publicWorkerState(worker) },
              } as any).catch(() => null)
            }
          }
          worker.status = worker.stop_requested ? 'stopped' : 'idle'
          worker.phase = worker.stop_requested ? '已停止' : '队列已空'
          worker.finished_at = new Date().toISOString()
          worker.updated_at = worker.finished_at
        } catch (error: any) {
          if (worker.stop_requested || isAbortLikeError(error)) {
            worker.status = 'stopped'
            worker.phase = worker.phase || '已停止'
            worker.last_error = ''
          } else {
            worker.status = 'failed'
            worker.last_error = String(error?.message || error)
          }
          worker.finished_at = new Date().toISOString()
          worker.updated_at = worker.finished_at
        } finally {
          ctx.runQueueWorkers.set(project.id, { ...worker })
          const latestProject = await ctx.getProject(activeWorkspace, project.id).catch(() => null)
          if (latestProject) {
            await updateNovelProject(activeWorkspace, project.id, {
              reference_config: { ...(latestProject.reference_config || {}), run_queue_worker: publicWorkerState(worker) },
            } as any).catch(() => null)
          }
        }
      })()
      res.json({ ok: true, worker: publicWorkerState(worker), message: '后台 worker 已启动' })
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
    worker.current_abort_controller?.abort()
    worker.updated_at = new Date().toISOString()
    ctx.runQueueWorkers.set(projectId, worker)
    if (project) {
      await updateNovelProject(activeWorkspace, projectId, {
        reference_config: { ...(project.reference_config || {}), run_queue_worker: publicWorkerState(worker) },
      } as any).catch(() => null)
    }
    res.json({ ok: true, worker: publicWorkerState(worker) })
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
      if (run.run_type === 'editor_revision') {
        return res.status(400).json({
          error: 'editor revisions use their dedicated cancel/retry actions',
          error_code: 'EDITOR_REVISION_ACTION_REQUIRED',
          action: 'pause',
        })
      }
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
      if (run.run_type === 'editor_revision') {
        return res.status(400).json({
          error: 'editor revisions use their dedicated cancel/retry actions',
          error_code: 'EDITOR_REVISION_ACTION_REQUIRED',
          action: 'resume',
        })
      }
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const terminalAdmissionGuard = findTerminalAdmissionResumeGuard(payload)
      if (terminalAdmissionGuard) return res.status(409).json(terminalAdmissionGuard)
      if (run.run_type === 'chapter_group_generation') {
        const approvalBlockerGuard = findApprovalBlockerResumeGuard(payload)
        if (approvalBlockerGuard) return res.status(409).json(approvalBlockerGuard)
        const updated = await updateNovelRun(activeWorkspace, run.id, {
          status: 'ready',
          output_ref: JSON.stringify({ ...payload, phase: '等待继续执行', resumed_at: new Date().toISOString() }),
        })
        return res.json({ ok: true, run: updated, execute_endpoint: `/api/novel/projects/${run.project_id}/chapter-groups/${run.id}/execute`, group: parseJsonLikePayload(updated?.output_ref) })
      }
      if (isRepairTaskRunType(run.run_type)) {
        return res.status(400).json({
          error: '修复任务需要在任务详情中逐项处理，不支持流水线继续。',
          error_code: 'REPAIR_TASK_RUN_NOT_RESUMABLE',
        })
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

  app.post('/api/novel/runs/:id/tasks/:taskIndex/status', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const runs = await listNovelRuns(activeWorkspace, projectId)
      const run = runs.find(item => item.id === Number(req.params.id))
      if (!run) return res.status(404).json({ error: 'run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
      const taskIndex = Number(req.params.taskIndex)
      if (!Number.isInteger(taskIndex) || taskIndex < 0 || taskIndex >= tasks.length) {
        return res.status(404).json({ error: 'task not found' })
      }
      const status = String(req.body.status || 'needs_review')
      const allowed = new Set(['open', 'in_progress', 'needs_review', 'resolved'])
      if (!allowed.has(status)) return res.status(400).json({ error: 'invalid task status' })
      const now = new Date().toISOString()
      const nextTasks = tasks.map((task: any, index: number) => index === taskIndex ? {
        ...task,
        task_status: status,
        status_note: String(req.body.note || ''),
        updated_at: now,
        started_at: status === 'in_progress' ? now : task.started_at,
        needs_review_at: status === 'needs_review' ? now : task.needs_review_at,
        resolved_at: status === 'resolved' ? now : task.resolved_at,
      } : task)
      const resolvedCount = nextTasks.filter((task: any) => task.task_status === 'resolved').length
      const needsReviewCount = nextTasks.filter((task: any) => task.task_status === 'needs_review').length
      const nextRunStatus = nextTasks.length > 0 && resolvedCount === nextTasks.length ? 'completed' : run.status === 'completed' ? 'ready' : run.status
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: nextRunStatus,
        output_ref: JSON.stringify({
          ...payload,
          tasks: nextTasks,
          task_status_summary: {
            total: nextTasks.length,
            resolved: resolvedCount,
            needs_review: needsReviewCount,
            open: nextTasks.filter((task: any) => !task.task_status || task.task_status === 'open').length,
            updated_at: now,
          },
        }),
      })
      res.json({ ok: true, run: updated, task: nextTasks[taskIndex], task_status_summary: parseJsonLikePayload(updated?.output_ref)?.task_status_summary })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/runs/:id/tasks/status-bulk', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const runs = await listNovelRuns(activeWorkspace, projectId)
      const run = runs.find(item => item.id === Number(req.params.id))
      if (!run) return res.status(404).json({ error: 'run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
      const rawIndices = Array.isArray(req.body.task_indices) ? req.body.task_indices : []
      const taskIndices = rawIndices.length ? rawIndices.map(Number).filter((index: number) => Number.isInteger(index) && index >= 0 && index < tasks.length) : tasks.map((_: any, index: number) => index)
      if (!taskIndices.length) return res.status(400).json({ error: 'no valid task indices' })
      const status = String(req.body.status || 'resolved')
      const allowed = new Set(['open', 'in_progress', 'needs_review', 'resolved'])
      if (!allowed.has(status)) return res.status(400).json({ error: 'invalid task status' })
      const selected = new Set(taskIndices)
      const now = new Date().toISOString()
      const nextTasks = tasks.map((task: any, index: number) => selected.has(index) ? {
        ...task,
        task_status: status,
        status_note: String(req.body.note || ''),
        updated_at: now,
        started_at: status === 'in_progress' ? now : task.started_at,
        needs_review_at: status === 'needs_review' ? now : task.needs_review_at,
        resolved_at: status === 'resolved' ? now : task.resolved_at,
      } : task)
      const resolvedCount = nextTasks.filter((task: any) => task.task_status === 'resolved').length
      const needsReviewCount = nextTasks.filter((task: any) => task.task_status === 'needs_review').length
      const nextRunStatus = nextTasks.length > 0 && resolvedCount === nextTasks.length ? 'completed' : run.status === 'completed' ? 'ready' : run.status
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: nextRunStatus,
        output_ref: JSON.stringify({
          ...payload,
          tasks: nextTasks,
          task_status_summary: {
            total: nextTasks.length,
            resolved: resolvedCount,
            needs_review: needsReviewCount,
            open: nextTasks.filter((task: any) => !task.task_status || task.task_status === 'open').length,
            updated_at: now,
          },
        }),
      })
      res.json({
        ok: true,
        run: updated,
        updated_count: taskIndices.length,
        task_status_summary: parseJsonLikePayload(updated?.output_ref)?.task_status_summary,
      })
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

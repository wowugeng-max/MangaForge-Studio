import { afterEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { appendNovelRun, createNovelProject, listNovelProjects, listNovelRuns, updateNovelRun } from '../novel'
import { createNovelProductionService } from './novel-production-service'
import { extractChapterRef, extractConfigTrace, extractMaterialTrace, extractModelTrace, registerNovelRunRoutes } from './novel-run-routes'

let workspaces: string[] = []

async function tempWorkspace() {
  const dir = await mkdtemp(join(tmpdir(), 'mangaforge-run-worker-'))
  workspaces.push(dir)
  return dir
}

function createRouteHarness() {
  const handlers = new Map<string, any>()
  const register = (method: string, path: string, handler: any) => {
    handlers.set(`${method.toUpperCase()} ${path}`, handler)
    return app
  }
  const app = {
    get: (path: string, handler: any) => register('GET', path, handler),
    post: (path: string, handler: any) => register('POST', path, handler),
    put: (path: string, handler: any) => register('PUT', path, handler),
    delete: (path: string, handler: any) => register('DELETE', path, handler),
  }
  return { app, handlers }
}

async function callRoute(handler: any, req: any = {}) {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(body: any) {
      this.body = body
      return this
    },
  }
  await handler(req, res)
  return res
}

function waitUntil(predicate: () => boolean | Promise<boolean>, timeoutMs = 1000) {
  const started = Date.now()
  return new Promise<void>((resolve, reject) => {
    const tick = async () => {
      if (await predicate()) return resolve()
      if (Date.now() - started > timeoutMs) return reject(new Error('Timed out waiting for worker route side effect'))
      setTimeout(tick, 10)
    }
    tick()
  })
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('novel run task center source guards', () => {
  test('extracts model and config audit traces from runtime selection payloads', () => {
    const payload = {
      result: {
        runtimeSelection: {
          model: { id: 136, model_name: 'gpt-5.5' },
          provider: { id: 7, name: 'anyrouter' },
        },
        tokenUsage: { input_tokens: 1200, output_tokens: 900 },
      },
      configSnapshot: {
        snapshotId: 'agentcfg-v2-cafe',
        fingerprint: 'cafe',
        agentPromptVersion: 2,
        promptKeys: ['scene_cards', 'review'],
        writingBibleHash: 'bible-hash',
        modelStrategy: {
          stages: {
            draft: { model_id: 136 },
            review: { model_id: 137 },
          },
        },
      },
    }

    expect(extractModelTrace(payload)).toEqual({
      model_name: 'gpt-5.5',
      model_id: 136,
      provider_id: 7,
      usage: { input_tokens: 1200, output_tokens: 900 },
    })
    expect(extractConfigTrace(payload)).toMatchObject({
      has_snapshot: true,
      snapshot_id: 'agentcfg-v2-cafe',
      fingerprint: 'cafe',
      agent_prompt_version: 2,
      prompt_keys: ['scene_cards', 'review'],
      writing_bible_hash: 'bible-hash',
      model_strategy_stages: ['draft', 'review'],
    })
  })

  test('extracts chapter and material audit traces from camelCase run payloads', () => {
    const chaptersById = new Map([[88, { id: 88, chapter_no: 12, title: '第十二章' }]])
    const chaptersByNo = new Map([[12, { id: 88, chapter_no: 12, title: '第十二章' }]])
    const payload = {
      chapterNo: 12,
      qualityCard: { chapterId: 88, chapterNo: 12 },
      contextPackage: {
        chapterTarget: {
          chapterId: 88,
          chapterNo: 12,
          title: '第十二章',
          sceneCards: [{ sceneNo: 1 }, { sceneNo: 2 }],
        },
        preflight: { ready: false, blockers: [{ label: '缺少角色状态' }], warnings: ['缺少上一章钩子回收'] },
        referencePreview: { entries: [{ id: 1 }] },
        characterStates: [{ name: '丁松言' }],
        previousChapters: [{ chapterNo: 11 }],
        writingBible: { style: '紧凑' },
        storyState: { active: true },
      },
    }

    expect(extractChapterRef(payload, {}, { step_name: 'chapter-12' }, chaptersById, chaptersByNo)).toMatchObject({
      chapter_id: 88,
      chapter_no: 12,
      chapter_title: '第十二章',
    })
    expect(extractMaterialTrace(payload)).toMatchObject({
      has_context_package: true,
      preflight_ready: false,
      blocker_count: 1,
      scene_cards_count: 2,
      reference_entries_count: 1,
      character_count: 1,
      has_previous_tail: true,
      has_writing_bible: true,
      has_story_state: true,
    })
  })

  test('treats repair task runs as actionable repair queues instead of resumable worker jobs', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-run-routes.ts'), 'utf8')

    expect(source).toContain('REPAIR_TASK_RUN_TYPES')
    expect(source).toContain('can_process_repair_tasks')
    expect(source).toContain('!isRepairTaskRun && [\'paused\', \'failed\', \'ready\'].includes(run.status)')
    expect(source).toContain('REPAIR_TASK_RUN_NOT_RESUMABLE')
  })

  test('aborts the current unattended chapter execution when the worker is stopped', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-run-routes.ts'), 'utf8')
    const startRoute = source.slice(
      source.indexOf("app.post('/api/novel/projects/:id/run-queue/start-worker'"),
      source.indexOf("app.post('/api/novel/projects/:id/run-queue/stop-worker'"),
    )
    const stopRoute = source.slice(
      source.indexOf("app.post('/api/novel/projects/:id/run-queue/stop-worker'"),
      source.indexOf("app.post('/api/novel/projects/:id/run-queue/drain'"),
    )

    expect(startRoute).toContain('new AbortController()')
    expect(startRoute).toContain('worker.current_abort_controller = chapterAbortController')
    expect(startRoute).toContain('abortSignal: chapterAbortController.signal')
    expect(startRoute).toContain('chapter_timeout_ms')
    expect(stopRoute).toContain('worker.current_abort_controller?.abort()')
  })

  test('does not mark an aborted unattended worker as failed', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-run-routes.ts'), 'utf8')
    const startRoute = source.slice(
      source.indexOf("app.post('/api/novel/projects/:id/run-queue/start-worker'"),
      source.indexOf("app.post('/api/novel/projects/:id/run-queue/stop-worker'"),
    )

    expect(startRoute).toContain('isAbortLikeError(error)')
    expect(startRoute).toContain("worker.status = 'stopped'")
    expect(startRoute).toContain("worker.phase = worker.phase || '已停止'")
  })

  test('rejects a generic resume for chapter groups paused by an approval blocker', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '入库阻断继续保护', reference_config: {} })
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'chapter_group_generation',
      status: 'paused',
      step_name: 'unattended-approval-blocker',
      error_message: '仿写安全阻断：参考桥段相似度过高',
      output_ref: JSON.stringify({
        chapters: [
          {
            id: 301,
            chapter_no: 18,
            title: '第十八章',
            status: 'needs_approval',
            error_code: 'APPROVAL_BLOCKER',
            approval_stage: 'approval_blocker',
            approval_context: { type: 'reference_safety_blocked', label: '仿写安全阻断' },
          },
          { id: 302, chapter_no: 19, title: '第十九章', status: 'pending' },
        ],
        current_index: 0,
        phase: '第18章入库阻断未解除，已暂停',
        last_error: {
          id: 301,
          chapter_no: 18,
          status: 'needs_approval',
          error_code: 'APPROVAL_BLOCKER',
          approval_stage: 'approval_blocker',
          error: '仿写安全阻断：参考桥段相似度过高',
          recovery_plan: {
            type: 'approval_blocker',
            actions: ['按入库阻断原因修订正文', '重新运行正文质检和入库门禁'],
          },
        },
      }),
    })
    const { app, handlers } = createRouteHarness()
    registerNovelRunRoutes(app as any, {
      getWorkspace: () => workspace,
      getProject: async (_workspace: string, id: number) => (await listNovelProjects(_workspace)).find(item => item.id === id) || null,
      runQueueWorkers: new Map(),
      getProductionBudgetDecision: () => ({ blocked: false, reasons: [] }),
      buildPipelineSteps: production.buildPipelineSteps,
      executeChapterGroupRunRecord: async () => ({ status: 'not-used', processed: 0 }),
    })
    const resume = handlers.get('POST /api/novel/runs/:id/resume')

    const response = await callRoute(resume, {
      params: { id: String(run.id) },
      body: { project_id: project.id },
    })
    const storedRun = (await listNovelRuns(workspace, project.id)).find(item => item.id === run.id)
    const storedPayload = JSON.parse(String(storedRun?.output_ref || '{}'))

    expect(response.statusCode).toBe(409)
    expect(response.body.error_code).toBe('APPROVAL_BLOCKER_REQUIRES_REPAIR')
    expect(response.body.recovery_plan.actions).toContain('按入库阻断原因修订正文')
    expect(storedRun?.status).toBe('paused')
    expect(storedPayload.current_index).toBe(0)
    expect(storedPayload.chapters[0].status).toBe('needs_approval')
  })

  test('rejects generic resume and disables actions for a persisted blocked_invalid admission', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '终态正文继续保护', reference_config: {} })
    const output = {
      chapters: [{
        id: 311,
        chapter_no: 20,
        title: '第二十章',
        status: 'failed',
        admission_status: 'blocked_invalid',
        error: '正文传输不完整，未入库',
        error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
      }],
      current_index: 0,
      phase: '第20章正文无效且未入库，已暂停',
      last_error: {
        id: 311,
        chapter_no: 20,
        admission_status: 'blocked_invalid',
        error: '正文传输不完整，未入库',
        error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
      },
    }
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'chapter_group_generation',
      status: 'paused',
      step_name: 'blocked-invalid-resume',
      error_message: '正文传输不完整，未入库',
      output_ref: JSON.stringify(output),
    })
    let executeCalls = 0
    const { app, handlers } = createRouteHarness()
    registerNovelRunRoutes(app as any, {
      getWorkspace: () => workspace,
      getProject: async (_workspace: string, id: number) => (await listNovelProjects(_workspace)).find(item => item.id === id) || null,
      runQueueWorkers: new Map(),
      getProductionBudgetDecision: () => ({ blocked: false, reasons: [] }),
      buildPipelineSteps: production.buildPipelineSteps,
      executeChapterGroupRunRecord: async () => {
        executeCalls += 1
        return { status: 'success', processed: 1 }
      },
    })
    const resume = handlers.get('POST /api/novel/runs/:id/resume')
    const tasks = handlers.get('GET /api/novel/projects/:id/tasks')

    const response = await callRoute(resume, {
      params: { id: String(run.id) },
      body: { project_id: project.id },
    })
    const tasksResponse = await callRoute(tasks, { params: { id: String(project.id) } })
    const storedRun = (await listNovelRuns(workspace, project.id)).find(item => item.id === run.id)
    const storedPayload = JSON.parse(String(storedRun?.output_ref || '{}'))
    const task = tasksResponse.body.tasks.find((item: any) => item.id === run.id)

    expect(response.statusCode).toBe(409)
    expect(response.body).toMatchObject({
      error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
      admission_status: 'blocked_invalid',
    })
    expect(storedRun?.status).toBe('paused')
    expect(storedPayload).toEqual(output)
    expect(executeCalls).toBe(0)
    expect(task.can_resume).toBe(false)
    expect(task.can_execute).toBe(false)
  })

  test('keeps last-error terminal admission authoritative over ordinary chapter-group top-level errors', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '章节群终态来源优先级', reference_config: {} })
    const output = {
      error_code: 'PROSE_GENERATION_FAILED',
      chapters: [{
        id: 411,
        chapter_no: 21,
        status: 'failed',
      }],
      current_index: 0,
      last_error: {
        id: 411,
        chapter_no: 21,
        error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
      },
    }
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'chapter_group_generation',
      status: 'paused',
      step_name: 'last-error-terminal',
      output_ref: JSON.stringify(output),
    })
    const { app, handlers } = createRouteHarness()
    registerNovelRunRoutes(app as any, {
      getWorkspace: () => workspace,
      getProject: async (_workspace: string, id: number) => (await listNovelProjects(_workspace)).find(item => item.id === id) || null,
      runQueueWorkers: new Map(),
      getProductionBudgetDecision: () => ({ blocked: false, reasons: [] }),
      buildPipelineSteps: production.buildPipelineSteps,
      executeChapterGroupRunRecord: async () => ({ status: 'not-used', processed: 0 }),
    })
    const resume = handlers.get('POST /api/novel/runs/:id/resume')
    const tasks = handlers.get('GET /api/novel/projects/:id/tasks')

    const response = await callRoute(resume, {
      params: { id: String(run.id) },
      body: { project_id: project.id },
    })
    const tasksResponse = await callRoute(tasks, { params: { id: String(project.id) } })
    const storedRun = (await listNovelRuns(workspace, project.id)).find(item => item.id === run.id)
    const task = tasksResponse.body.tasks.find((item: any) => item.id === run.id)

    expect(response.statusCode).toBe(409)
    expect(response.body.error_code).toBe('PROSE_ADMISSION_BLOCKED_INVALID')
    expect(storedRun?.status).toBe('paused')
    expect(task.can_resume).toBe(false)
    expect(task.can_execute).toBe(false)
  })

  test('ignores stale top-level terminal admission when a chapter-group current chapter is ordinary', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '章节群残留终态隔离', reference_config: {} })
    const output = {
      admission_status: 'blocked_invalid',
      error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
      chapters: [{
        id: 414,
        chapter_no: 22,
        status: 'failed',
      }],
      current_index: 0,
      last_error: {
        id: 414,
        chapter_no: 22,
        error_code: 'PROSE_GENERATION_FAILED',
      },
    }
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'chapter_group_generation',
      status: 'paused',
      step_name: 'stale-top-level-terminal',
      output_ref: JSON.stringify(output),
    })
    const { app, handlers } = createRouteHarness()
    registerNovelRunRoutes(app as any, {
      getWorkspace: () => workspace,
      getProject: async (_workspace: string, id: number) => (await listNovelProjects(_workspace)).find(item => item.id === id) || null,
      runQueueWorkers: new Map(),
      getProductionBudgetDecision: () => ({ blocked: false, reasons: [] }),
      buildPipelineSteps: production.buildPipelineSteps,
      executeChapterGroupRunRecord: async () => ({ status: 'not-used', processed: 0 }),
    })
    const resume = handlers.get('POST /api/novel/runs/:id/resume')
    const tasks = handlers.get('GET /api/novel/projects/:id/tasks')

    const tasksResponse = await callRoute(tasks, { params: { id: String(project.id) } })
    const response = await callRoute(resume, {
      params: { id: String(run.id) },
      body: { project_id: project.id },
    })
    const storedRun = (await listNovelRuns(workspace, project.id)).find(item => item.id === run.id)
    const task = tasksResponse.body.tasks.find((item: any) => item.id === run.id)

    expect(tasksResponse.statusCode).toBe(200)
    expect(task.can_resume).toBe(true)
    expect(task.can_execute).toBe(true)
    expect(response.statusCode).toBe(200)
    expect(storedRun?.status).toBe('ready')
  })

  test('rejects generic resume and disables actions for a standalone blocked_invalid admission', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '独立正文终态保护', reference_config: {} })
    const output = {
      error: '正文为空或结构无效',
      error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
      admission_status: 'blocked_invalid',
      chapter_id: 412,
      chapter_no: 21,
      pipeline: [{ key: 'review', status: 'failed' }],
    }
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'generate_prose',
      status: 'failed',
      step_name: 'chapter-412',
      error_message: output.error,
      output_ref: JSON.stringify(output),
    })
    const { app, handlers } = createRouteHarness()
    registerNovelRunRoutes(app as any, {
      getWorkspace: () => workspace,
      getProject: async (_workspace: string, id: number) => (await listNovelProjects(_workspace)).find(item => item.id === id) || null,
      runQueueWorkers: new Map(),
      getProductionBudgetDecision: () => ({ blocked: false, reasons: [] }),
      buildPipelineSteps: production.buildPipelineSteps,
      executeChapterGroupRunRecord: async () => ({ status: 'not-used', processed: 0 }),
    })
    const resume = handlers.get('POST /api/novel/runs/:id/resume')
    const tasks = handlers.get('GET /api/novel/projects/:id/tasks')

    const response = await callRoute(resume, {
      params: { id: String(run.id) },
      body: { project_id: project.id },
    })
    const tasksResponse = await callRoute(tasks, { params: { id: String(project.id) } })
    const storedRun = (await listNovelRuns(workspace, project.id)).find(item => item.id === run.id)
    const storedPayload = JSON.parse(String(storedRun?.output_ref || '{}'))
    const task = tasksResponse.body.tasks.find((item: any) => item.id === run.id)

    expect(response.statusCode).toBe(409)
    expect(response.body).toMatchObject({
      error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
      admission_status: 'blocked_invalid',
      chapter_id: 412,
      chapter_no: 21,
    })
    expect(storedRun?.status).toBe('failed')
    expect(storedPayload).toEqual(output)
    expect(task.can_resume).toBe(false)
    expect(task.can_execute).toBe(false)
  })

  test('keeps ordinary standalone prose runs resumable', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '普通独立正文恢复', reference_config: {} })
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'generate_prose',
      status: 'failed',
      step_name: 'chapter-413',
      error_message: '临时模型错误',
      output_ref: JSON.stringify({
        error: '临时模型错误',
        error_code: 'PROSE_GENERATION_FAILED',
        chapter_id: 413,
        chapter_no: 22,
        current_step: 'draft',
      }),
    })
    const { app, handlers } = createRouteHarness()
    registerNovelRunRoutes(app as any, {
      getWorkspace: () => workspace,
      getProject: async (_workspace: string, id: number) => (await listNovelProjects(_workspace)).find(item => item.id === id) || null,
      runQueueWorkers: new Map(),
      getProductionBudgetDecision: () => ({ blocked: false, reasons: [] }),
      buildPipelineSteps: production.buildPipelineSteps,
      executeChapterGroupRunRecord: async () => ({ status: 'not-used', processed: 0 }),
    })
    const resume = handlers.get('POST /api/novel/runs/:id/resume')

    const response = await callRoute(resume, {
      params: { id: String(run.id) },
      body: { project_id: project.id },
    })
    const storedRun = (await listNovelRuns(workspace, project.id)).find(item => item.id === run.id)

    expect(response.statusCode).toBe(200)
    expect(storedRun?.status).toBe('ready')
    expect(response.body.resume_endpoint).toBe('/api/novel/chapters/413/generate-prose')
  })

  test('recovers stale running chapter group runs before starting a worker', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '长线连载', reference_config: {} })
    const staleRun = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'chapter_group_generation',
      status: 'running',
      step_name: '无人值守章节群',
      output_ref: JSON.stringify({
        chapters: [{ id: 12, chapter_no: 1, title: '第一章', status: 'ready' }],
        current_index: 0,
        phase: '上次进程中断',
      }),
    })
    const executedRuns: number[] = []
    const { app, handlers } = createRouteHarness()
    registerNovelRunRoutes(app as any, {
      getWorkspace: () => workspace,
      getProject: async (_workspace: string, id: number) => (await listNovelProjects(_workspace)).find(item => item.id === id) || null,
      runQueueWorkers: new Map(),
      getProductionBudgetDecision: () => ({ blocked: false, reasons: [] }),
      buildPipelineSteps: production.buildPipelineSteps,
      executeChapterGroupRunRecord: async (_workspace: string, _project: any, run: any) => {
        executedRuns.push(run.id)
        return { status: 'success', processed: 1 }
      },
    })
    const startWorker = handlers.get('POST /api/novel/projects/:id/run-queue/start-worker')

    const response = await callRoute(startWorker, {
      params: { id: String(project.id) },
      body: { max_runs: 1, max_chapters_per_run: 1 },
    })
    await waitUntil(() => executedRuns.includes(staleRun.id))
    const runs = await listNovelRuns(workspace, project.id)
    const recoveredRun = runs.find(run => run.id === staleRun.id)
    const payload = JSON.parse(String(recoveredRun?.output_ref || '{}'))

    expect(response.statusCode).toBe(200)
    expect(response.body.worker.status).toBe('running')
    expect(executedRuns).toEqual([staleRun.id])
    expect(payload.recovered_at).toBeTruthy()
    expect(payload.phase).toBe('后端重启后自动恢复为待执行')
  })

  test('keeps draining the same unattended target run when each worker pass writes one chapter', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '目标章连写', reference_config: {} })
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'chapter_group_generation',
      status: 'ready',
      step_name: 'unattended-chapter-1-3',
      output_ref: JSON.stringify({
        chapters: [
          { id: 101, chapter_no: 1, title: '第一章', status: 'pending' },
          { id: 102, chapter_no: 2, title: '第二章', status: 'pending' },
          { id: 103, chapter_no: 3, title: '第三章', status: 'pending' },
        ],
        current_index: 0,
        mode: 'unattended_goal',
      }),
    })
    const executedChapters: number[] = []
    const { app, handlers } = createRouteHarness()
    registerNovelRunRoutes(app as any, {
      getWorkspace: () => workspace,
      getProject: async (_workspace: string, id: number) => (await listNovelProjects(_workspace)).find(item => item.id === id) || null,
      runQueueWorkers: new Map(),
      getProductionBudgetDecision: () => ({ blocked: false, reasons: [] }),
      buildPipelineSteps: production.buildPipelineSteps,
      executeChapterGroupRunRecord: async (activeWorkspace: string, _project: any, currentRun: any) => {
        const payload = JSON.parse(String(currentRun.output_ref || '{}'))
        const index = Number(payload.current_index || 0)
        const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
        const chapter = chapters[index]
        if (!chapter) return { status: 'success', processed: 0 }
        executedChapters.push(Number(chapter.id))
        chapters[index] = { ...chapter, status: 'success' }
        const nextIndex = index + 1
        const status = nextIndex >= chapters.length ? 'success' : 'ready'
        await updateNovelRun(activeWorkspace, currentRun.id, {
          status,
          output_ref: JSON.stringify({ ...payload, chapters, current_index: nextIndex }),
        })
        return { status, processed: 1 }
      },
    })
    const startWorker = handlers.get('POST /api/novel/projects/:id/run-queue/start-worker')

    const response = await callRoute(startWorker, {
      params: { id: String(project.id) },
      body: { max_runs: 5, max_chapters_per_run: 1 },
    })
    await waitUntil(async () => {
      const currentRun = (await listNovelRuns(workspace, project.id)).find(item => item.id === run.id)
      return executedChapters.length === 3 && currentRun?.status === 'success'
    })
    const finalRun = (await listNovelRuns(workspace, project.id)).find(item => item.id === run.id)
    const finalPayload = JSON.parse(String(finalRun?.output_ref || '{}'))

    expect(response.statusCode).toBe(200)
    expect(executedChapters).toEqual([101, 102, 103])
    expect(finalRun?.status).toBe('success')
    expect(finalPayload.current_index).toBe(3)
    expect(finalPayload.chapters.map((chapter: any) => chapter.status)).toEqual(['success', 'success', 'success'])
  })

  test('waits for a scheduled unattended retry before going idle', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '等待重试', reference_config: {} })
    const retryAt = new Date(Date.now() + 50).toISOString()
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'chapter_group_generation',
      status: 'ready',
      step_name: 'unattended-retry-chapter-1',
      output_ref: JSON.stringify({
        chapters: [
          { id: 201, chapter_no: 1, title: '第一章', status: 'retry_scheduled', next_run_at: retryAt },
        ],
        current_index: 0,
        mode: 'unattended_goal',
      }),
    })
    const executedRuns: number[] = []
    const { app, handlers } = createRouteHarness()
    registerNovelRunRoutes(app as any, {
      getWorkspace: () => workspace,
      getProject: async (_workspace: string, id: number) => (await listNovelProjects(_workspace)).find(item => item.id === id) || null,
      runQueueWorkers: new Map(),
      getProductionBudgetDecision: () => ({ blocked: false, reasons: [] }),
      buildPipelineSteps: production.buildPipelineSteps,
      executeChapterGroupRunRecord: async (activeWorkspace: string, _project: any, currentRun: any) => {
        executedRuns.push(currentRun.id)
        const payload = JSON.parse(String(currentRun.output_ref || '{}'))
        await updateNovelRun(activeWorkspace, currentRun.id, {
          status: 'success',
          output_ref: JSON.stringify({
            ...payload,
            current_index: 1,
            chapters: payload.chapters.map((chapter: any) => ({ ...chapter, status: 'success', next_run_at: null })),
          }),
        })
        return { status: 'success', processed: 1 }
      },
    })
    const startWorker = handlers.get('POST /api/novel/projects/:id/run-queue/start-worker')

    const response = await callRoute(startWorker, {
      params: { id: String(project.id) },
      body: { max_runs: 1, max_chapters_per_run: 1, idle_wait_ms: 250, idle_poll_ms: 10 },
    })
    await waitUntil(async () => {
      const currentRun = (await listNovelRuns(workspace, project.id)).find(item => item.id === run.id)
      return executedRuns.includes(run.id) && currentRun?.status === 'success'
    }, 500)
    const finalRun = (await listNovelRuns(workspace, project.id)).find(item => item.id === run.id)

    expect(response.statusCode).toBe(200)
    expect(executedRuns).toEqual([run.id])
    expect(finalRun?.status).toBe('success')
  })
})

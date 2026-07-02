import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { createNovelProductionService, createNovelRunExecutionService } from './novel-production-service'
import { registerNovelGenerationRoutes } from './novel-generation-routes'
import { registerNovelRunRoutes } from './novel-run-routes'
import {
  appendNovelRun,
  createNovelOutline,
  createNovelProject,
  listNovelChapters,
  listNovelRuns,
  updateNovelRun,
  upsertNovelChapterByNumber,
} from '../novel'

let workspaces: string[] = []

async function tempWorkspace() {
  const dir = await mkdtemp(join(tmpdir(), 'mangaforge-unattended-goal-'))
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
      if (Date.now() - started > timeoutMs) return reject(new Error('Timed out waiting for unattended goal side effect'))
      setTimeout(tick, 10)
    }
    tick()
  })
}

function ohStoryStep3Ok() {
  return {
    chapter_title_uniqueness_sync: { status: 'ok' },
    prose_meta_sync: { status: 'ok' },
    chapter_hook_sync: { status: 'ok' },
    chapter_blueprint_sync: { status: 'ok' },
    foreshadowing_delta_sync: { status: 'ok' },
    deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
  }
}

function generationCtx(workspace: string, production = createNovelProductionService(), overrides: any = {}) {
  return {
    getWorkspace: () => workspace,
    getProject: async (_workspace: string, id: number) => {
      const { listNovelProjects } = await import('../novel')
      return (await listNovelProjects(_workspace)).find((project: any) => project.id === id) || null
    },
    getModelStrategy: production.getModelStrategy,
    getApprovalPolicy: production.getApprovalPolicy,
    buildAgentConfigSnapshot: production.buildAgentConfigSnapshot,
    buildChapterGroupStages: production.buildChapterGroupStages,
    updateChapterStages: production.updateChapterStages,
    classifyGenerationFailure: production.classifyGenerationFailure,
    executeChapterGroupRunRecord: async () => ({ status: 'not-used' }),
    buildPipelineSteps: production.buildPipelineSteps,
    updatePipelineStep: production.updatePipelineStep,
    ...overrides,
  }
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('unattended chapter goal integration', () => {
  test('rejects approving an unattended approval blocker as a generic manual confirmation', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '入库阻断确认保护', length_target: 'epic', reference_config: {} })
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'chapter_group_generation',
      status: 'paused',
      step_name: 'unattended-approval-blocker',
      error_message: '仿写安全阻断：参考桥段相似度过高',
      output_ref: JSON.stringify({
        chapters: [
          {
            id: 901,
            chapter_no: 21,
            title: '第二十一章',
            status: 'needs_approval',
            approval_stage: 'approval_blocker',
            approval_context: { type: 'reference_safety_blocked', label: '仿写安全阻断' },
            error_code: 'APPROVAL_BLOCKER',
            error: '仿写安全阻断：参考桥段相似度过高',
            stages: production.buildChapterGroupStages(),
          },
          { id: 902, chapter_no: 22, title: '第二十二章', status: 'pending', stages: production.buildChapterGroupStages() },
        ],
        current_index: 0,
        phase: '第21章入库阻断未解除，已暂停',
        last_error: {
          id: 901,
          chapter_no: 21,
          approval_stage: 'approval_blocker',
          error_code: 'APPROVAL_BLOCKER',
          error: '仿写安全阻断：参考桥段相似度过高',
          recovery_plan: {
            type: 'approval_blocker',
            actions: ['按入库阻断原因修订正文', '重新运行正文质检和入库门禁'],
          },
        },
      }),
    })
    const { app, handlers } = createRouteHarness()
    registerNovelGenerationRoutes(app as any, generationCtx(workspace, production) as any)
    const approve = handlers.get('POST /api/novel/projects/:id/chapter-groups/:runId/approve')

    const response = await callRoute(approve, {
      params: { id: String(project.id), runId: String(run.id) },
      body: { chapter_id: 901, stage: 'approval_blocker' },
    })
    const storedRun = (await listNovelRuns(workspace, project.id)).find(item => item.id === run.id)
    const storedGroup = JSON.parse(String(storedRun?.output_ref || '{}'))

    expect(response.statusCode).toBe(409)
    expect(response.body.error_code).toBe('APPROVAL_BLOCKER_REQUIRES_REPAIR')
    expect(response.body.recovery_plan.actions).toContain('按入库阻断原因修订正文')
    expect(storedRun?.status).toBe('paused')
    expect(storedGroup.current_index).toBe(0)
    expect(storedGroup.chapters[0]).toMatchObject({
      status: 'needs_approval',
      approval_stage: 'approval_blocker',
      error_code: 'APPROVAL_BLOCKER',
    })
    expect(storedGroup.chapters[1].status).toBe('pending')
  })

  test('rejects skipping an unattended approval blocker to continue later chapters', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '入库阻断跳过保护', length_target: 'epic', reference_config: {} })
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'chapter_group_generation',
      status: 'paused',
      step_name: 'unattended-approval-blocker',
      error_message: '仿写安全阻断：参考桥段相似度过高',
      output_ref: JSON.stringify({
        chapters: [
          {
            id: 911,
            chapter_no: 23,
            title: '第二十三章',
            status: 'needs_approval',
            approval_stage: 'approval_blocker',
            approval_context: { type: 'reference_safety_blocked', label: '仿写安全阻断' },
            error_code: 'APPROVAL_BLOCKER',
            error: '仿写安全阻断：参考桥段相似度过高',
            stages: production.buildChapterGroupStages(),
          },
          { id: 912, chapter_no: 24, title: '第二十四章', status: 'pending', stages: production.buildChapterGroupStages() },
        ],
        current_index: 0,
        phase: '第23章入库阻断未解除，已暂停',
        last_error: {
          id: 911,
          chapter_no: 23,
          approval_stage: 'approval_blocker',
          error_code: 'APPROVAL_BLOCKER',
          error: '仿写安全阻断：参考桥段相似度过高',
          recovery_plan: {
            type: 'approval_blocker',
            actions: ['按入库阻断原因修订正文', '重新运行正文质检和入库门禁'],
          },
        },
      }),
    })
    const { app, handlers } = createRouteHarness()
    registerNovelGenerationRoutes(app as any, generationCtx(workspace, production) as any)
    const skip = handlers.get('POST /api/novel/projects/:id/chapter-groups/:runId/skip-chapter')

    const response = await callRoute(skip, {
      params: { id: String(project.id), runId: String(run.id) },
      body: { chapter_id: 911, reason: '跳过阻断章' },
    })
    const storedRun = (await listNovelRuns(workspace, project.id)).find(item => item.id === run.id)
    const storedGroup = JSON.parse(String(storedRun?.output_ref || '{}'))

    expect(response.statusCode).toBe(409)
    expect(response.body.error_code).toBe('APPROVAL_BLOCKER_REQUIRES_REPAIR')
    expect(response.body.recovery_plan.actions).toContain('重新运行正文质检和入库门禁')
    expect(storedRun?.status).toBe('paused')
    expect(storedGroup.current_index).toBe(0)
    expect(storedGroup.chapters[0]).toMatchObject({
      status: 'needs_approval',
      approval_stage: 'approval_blocker',
      error_code: 'APPROVAL_BLOCKER',
    })
    expect(storedGroup.chapters[1].status).toBe('pending')
  })

  test('rejects retrying an unattended approval blocker before repair and gate recheck', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '入库阻断重试保护', length_target: 'epic', reference_config: {} })
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'chapter_group_generation',
      status: 'paused',
      step_name: 'unattended-approval-blocker',
      error_message: '仿写安全阻断：参考桥段相似度过高',
      output_ref: JSON.stringify({
        chapters: [
          {
            id: 921,
            chapter_no: 25,
            title: '第二十五章',
            status: 'needs_approval',
            approval_stage: 'approval_blocker',
            approval_context: { type: 'reference_safety_blocked', label: '仿写安全阻断' },
            error_code: 'APPROVAL_BLOCKER',
            error: '仿写安全阻断：参考桥段相似度过高',
            stages: production.buildChapterGroupStages(),
          },
          { id: 922, chapter_no: 26, title: '第二十六章', status: 'pending', stages: production.buildChapterGroupStages() },
        ],
        current_index: 0,
        phase: '第25章入库阻断未解除，已暂停',
        last_error: {
          id: 921,
          chapter_no: 25,
          approval_stage: 'approval_blocker',
          error_code: 'APPROVAL_BLOCKER',
          error: '仿写安全阻断：参考桥段相似度过高',
          recovery_plan: {
            type: 'approval_blocker',
            actions: ['按入库阻断原因修订正文', '重新运行正文质检和入库门禁'],
          },
        },
      }),
    })
    const { app, handlers } = createRouteHarness()
    registerNovelGenerationRoutes(app as any, generationCtx(workspace, production) as any)
    const retryNow = handlers.get('POST /api/novel/projects/:id/chapter-groups/:runId/retry-now')

    const response = await callRoute(retryNow, {
      params: { id: String(project.id), runId: String(run.id) },
      body: { chapter_id: 921 },
    })
    const storedRun = (await listNovelRuns(workspace, project.id)).find(item => item.id === run.id)
    const storedGroup = JSON.parse(String(storedRun?.output_ref || '{}'))

    expect(response.statusCode).toBe(409)
    expect(response.body.error_code).toBe('APPROVAL_BLOCKER_REQUIRES_REPAIR')
    expect(response.body.recovery_plan.actions).toContain('重新运行正文质检和入库门禁')
    expect(storedRun?.status).toBe('paused')
    expect(storedGroup.current_index).toBe(0)
    expect(storedGroup.chapters[0]).toMatchObject({
      status: 'needs_approval',
      approval_stage: 'approval_blocker',
      error_code: 'APPROVAL_BLOCKER',
    })
    expect(storedGroup.chapters[1].status).toBe('pending')
  })

  test('rejects directly executing an unattended approval blocker before repair and gate recheck', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '入库阻断执行保护', length_target: 'epic', reference_config: {} })
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'chapter_group_generation',
      status: 'paused',
      step_name: 'unattended-approval-blocker',
      error_message: '仿写安全阻断：参考桥段相似度过高',
      output_ref: JSON.stringify({
        chapters: [
          {
            id: 931,
            chapter_no: 27,
            title: '第二十七章',
            status: 'needs_approval',
            approval_stage: 'approval_blocker',
            approval_context: { type: 'reference_safety_blocked', label: '仿写安全阻断' },
            error_code: 'APPROVAL_BLOCKER',
            error: '仿写安全阻断：参考桥段相似度过高',
            stages: production.buildChapterGroupStages(),
          },
          { id: 932, chapter_no: 28, title: '第二十八章', status: 'pending', stages: production.buildChapterGroupStages() },
        ],
        current_index: 0,
        phase: '第27章入库阻断未解除，已暂停',
        last_error: {
          id: 931,
          chapter_no: 27,
          approval_stage: 'approval_blocker',
          error_code: 'APPROVAL_BLOCKER',
          error: '仿写安全阻断：参考桥段相似度过高',
          recovery_plan: {
            type: 'approval_blocker',
            actions: ['按入库阻断原因修订正文', '重新运行正文质检和入库门禁'],
          },
        },
      }),
    })
    const { app, handlers } = createRouteHarness()
    registerNovelGenerationRoutes(app as any, generationCtx(workspace, production) as any)
    const execute = handlers.get('POST /api/novel/projects/:id/chapter-groups/:runId/execute')

    const response = await callRoute(execute, {
      params: { id: String(project.id), runId: String(run.id) },
      body: {},
    })
    const storedRun = (await listNovelRuns(workspace, project.id)).find(item => item.id === run.id)
    const storedGroup = JSON.parse(String(storedRun?.output_ref || '{}'))

    expect(response.statusCode).toBe(409)
    expect(response.body.error_code).toBe('APPROVAL_BLOCKER_REQUIRES_REPAIR')
    expect(response.body.recovery_plan.actions).toContain('重新运行正文质检和入库门禁')
    expect(storedRun?.status).toBe('paused')
    expect(storedGroup.current_index).toBe(0)
    expect(storedGroup.chapters[0]).toMatchObject({
      status: 'needs_approval',
      approval_stage: 'approval_blocker',
      error_code: 'APPROVAL_BLOCKER',
    })
    expect(storedGroup.chapters[1].status).toBe('pending')
  })

  test('rejects a target chapter lower than the requested start chapter', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '剑烛大荒', length_target: 'epic' })
    const { app, handlers } = createRouteHarness()
    registerNovelGenerationRoutes(app as any, generationCtx(workspace, production) as any)
    const startUnattended = handlers.get('POST /api/novel/projects/:id/chapter-groups/start-unattended')

    const response = await callRoute(startUnattended, {
      params: { id: String(project.id) },
      body: { start_chapter: 5, target_chapter: 4, create_missing: true },
    })

    expect(response.statusCode).toBe(400)
    expect(response.body.error_code).toBe('UNATTENDED_TARGET_BEFORE_START')
    expect(await listNovelChapters(workspace, project.id)).toHaveLength(0)
  })

  test('uses the project quality gate as unattended threshold when the request omits a threshold', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, {
      title: '阈值门禁测试',
      length_target: 'epic',
      reference_config: { quality_gate: { min_score: 91 } },
    })
    const { app, handlers } = createRouteHarness()
    registerNovelGenerationRoutes(app as any, generationCtx(workspace, production) as any)
    const startUnattended = handlers.get('POST /api/novel/projects/:id/chapter-groups/start-unattended')

    const response = await callRoute(startUnattended, {
      params: { id: String(project.id) },
      body: { start_chapter: 1, target_chapter: 1, create_missing: true },
    })
    const storedRun = (await listNovelRuns(workspace, project.id)).find(run => run.id === response.body.run.id)
    const storedGroup = JSON.parse(String(storedRun?.output_ref || '{}'))

    expect(response.statusCode).toBe(200)
    expect(response.body.group.policy.quality_threshold).toBe(91)
    expect(response.body.summary.quality_threshold).toBe(91)
    expect(storedGroup.policy.quality_threshold).toBe(91)
  })

  test('runs chapter planning ensure before queuing unattended chapters with missing planning', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '自动补齐规划', length_target: 'epic', reference_config: {} })
    const ensureCalls: any[] = []
    const { app, handlers } = createRouteHarness()
    registerNovelGenerationRoutes(app as any, generationCtx(workspace, production, {
      ensureChapterPlanningForRange: async (_workspace: string, ensuredProject: any, options: any) => {
        ensureCalls.push({ workspace: _workspace, project_id: ensuredProject.id, ...options })
        for (const chapterNo of options.missing_chapter_nos || []) {
          await upsertNovelChapterByNumber(workspace, {
            project_id: project.id,
            chapter_no: chapterNo,
            title: `第${chapterNo}章 已规划`,
            chapter_goal: `第${chapterNo}章自动规划目标，承接主线并制造明确推进。`,
            chapter_summary: `第${chapterNo}章自动规划摘要`,
            conflict: `第${chapterNo}章核心冲突`,
            ending_hook: `第${chapterNo}章结尾钩子`,
            scene_breakdown: [{ title: `第${chapterNo}章场景一`, goal: '推进冲突' }],
          } as any)
        }
        return {
          ok: true,
          status: 'success',
          repaired_chapters: (options.missing_chapter_nos || []).map((chapterNo: number) => ({ chapter_no: chapterNo })),
        }
      },
    }) as any)
    const startUnattended = handlers.get('POST /api/novel/projects/:id/chapter-groups/start-unattended')

    const response = await callRoute(startUnattended, {
      params: { id: String(project.id) },
      body: { start_chapter: 1, target_chapter: 2, create_missing: true, model_id: 7 },
    })
    const chapters = await listNovelChapters(workspace, project.id)

    expect(response.statusCode).toBe(200)
    expect(ensureCalls).toHaveLength(1)
    expect(ensureCalls[0]).toMatchObject({
      workspace,
      project_id: project.id,
      start_chapter: 1,
      target_chapter: 2,
      chapter_count: 2,
      continue_from: 0,
      model_id: 7,
      missing_chapter_nos: [1, 2],
    })
    expect(chapters.map(chapter => chapter.title)).toEqual(['第1章 已规划', '第2章 已规划'])
    expect(chapters.every(chapter => chapter.raw_payload?.unattended_goal?.needs_agent_completion !== true)).toBe(true)
    expect(response.body.group.planning_preflight).toMatchObject({
      enabled: true,
      status: 'success',
      missing_chapter_nos: [1, 2],
    })
    expect(response.body.group.chapters.map((chapter: any) => chapter.title)).toEqual(['第1章 已规划', '第2章 已规划'])
    expect(response.body.group.chapters.every((chapter: any) => chapter.material_score === 80)).toBe(true)
  })

  test('blocks unattended queue creation when planning ensure fails', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '规划失败阻断', length_target: 'epic', reference_config: {} })
    const { app, handlers } = createRouteHarness()
    registerNovelGenerationRoutes(app as any, generationCtx(workspace, production, {
      ensureChapterPlanningForRange: async () => {
        throw new Error('规划模型返回空细纲')
      },
    }) as any)
    const startUnattended = handlers.get('POST /api/novel/projects/:id/chapter-groups/start-unattended')

    const response = await callRoute(startUnattended, {
      params: { id: String(project.id) },
      body: { start_chapter: 1, target_chapter: 2, create_missing: true, model_id: 7 },
    })

    expect(response.statusCode).toBe(424)
    expect(response.body).toMatchObject({
      error_code: 'UNATTENDED_PLANNING_PREFLIGHT_FAILED',
      start_chapter: 1,
      target_chapter: 2,
    })
    expect(response.body.planning_preflight).toMatchObject({
      enabled: true,
      status: 'failed',
      missing_chapter_nos: [1, 2],
    })
    expect(await listNovelChapters(workspace, project.id)).toHaveLength(0)
    expect(await listNovelRuns(workspace, project.id)).toHaveLength(0)
  })

  test('creates missing target chapters without outlines and carries agent material repair into execution', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '无大纲连写', length_target: 'epic', reference_config: {} })
    const { app, handlers } = createRouteHarness()
    registerNovelGenerationRoutes(app as any, generationCtx(workspace, production) as any)
    const startUnattended = handlers.get('POST /api/novel/projects/:id/chapter-groups/start-unattended')

    const response = await callRoute(startUnattended, {
      params: { id: String(project.id) },
      body: { start_chapter: 1, target_chapter: 2, create_missing: true },
    })
    const chapters = await listNovelChapters(workspace, project.id)

    expect(response.statusCode).toBe(200)
    expect(response.body.summary).toMatchObject({ created: 2, queued: 2 })
    expect(chapters.map(chapter => chapter.chapter_no)).toEqual([1, 2])
    expect(chapters.every(chapter => chapter.raw_payload?.unattended_goal?.needs_agent_completion === true)).toBe(true)

    const generateOptions: any[] = []
    const execution = createNovelRunExecutionService({
      getProject: async () => project,
      production,
      listNovelRuns,
      updateNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, chapterId, options) => {
        generateOptions.push({ chapterId, options })
        await options.onStage('material_repair', { status: 'success', repaired: [{ type: 'chapter_blueprint' }] })
        await options.onStage('draft', { status: 'success', scene_status: 'generated' })
        await options.onStage('review', { status: 'success', score: 90 })
        return {
          score: 90,
          revised: false,
          story_state_update: ohStoryStep3Ok(),
          config_snapshot: { snapshot_id: `missing-outline-${chapterId}` },
        }
      },
    })

    const executed = await execution.executeChapterGroupRunRecord(workspace, project, response.body.run, {
      lock_owner: 'missing-outline-integration',
      max_chapters: 2,
    })

    expect(executed.status).toBe('success')
    expect(generateOptions).toHaveLength(2)
    expect(generateOptions.every(call => call.options.auto_repair_missing_material === true)).toBe(true)
    expect(generateOptions.every(call => call.options.force_scene_cards === true)).toBe(true)
    expect(generateOptions.every(call => call.options.allow_incomplete === false)).toBe(true)
  })

  test('start-worker drains a real unattended target run to completion one chapter at a time', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '后台无人值守', length_target: 'epic', reference_config: {} })
    const { app, handlers } = createRouteHarness()
    const getProject = async (_workspace: string, id: number) => {
      const { listNovelProjects } = await import('../novel')
      return (await listNovelProjects(_workspace)).find((item: any) => item.id === id) || null
    }
    registerNovelGenerationRoutes(app as any, generationCtx(workspace, production, { getProject }) as any)
    const executedChapters: number[] = []
    registerNovelRunRoutes(app as any, {
      getWorkspace: () => workspace,
      getProject,
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
        chapters[index] = { ...chapter, status: 'success', score: 92 }
        const nextIndex = index + 1
        const status = nextIndex >= chapters.length ? 'success' : 'ready'
        await updateNovelRun(activeWorkspace, currentRun.id, {
          status,
          output_ref: JSON.stringify({ ...payload, chapters, current_index: nextIndex }),
        })
        return { status, processed: 1 }
      },
    })
    const startUnattended = handlers.get('POST /api/novel/projects/:id/chapter-groups/start-unattended')
    const startWorker = handlers.get('POST /api/novel/projects/:id/run-queue/start-worker')

    const queued = await callRoute(startUnattended, {
      params: { id: String(project.id) },
      body: { start_chapter: 1, target_chapter: 3, create_missing: true },
    })
    const response = await callRoute(startWorker, {
      params: { id: String(project.id) },
      body: { max_runs: 5, max_chapters_per_run: 1 },
    })
    await waitUntil(async () => {
      const run = (await listNovelRuns(workspace, project.id)).find(item => item.id === queued.body.run.id)
      return executedChapters.length === 3 && run?.status === 'success'
    })
    const finalRun = (await listNovelRuns(workspace, project.id)).find(item => item.id === queued.body.run.id)
    const finalGroup = JSON.parse(String(finalRun?.output_ref || '{}'))

    expect(queued.statusCode).toBe(200)
    expect(response.statusCode).toBe(200)
    expect(response.body.worker.status).toBe('running')
    expect(executedChapters).toEqual(queued.body.group.chapters.map((chapter: any) => chapter.id))
    expect(finalRun?.status).toBe('success')
    expect(finalGroup.current_index).toBe(3)
    expect(finalGroup.chapters.map((chapter: any) => chapter.status)).toEqual(['success', 'success', 'success'])
  })

  test('creates an unattended run from target chapter input and executes the queued chapters in order', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '剑烛大荒', length_target: 'epic', reference_config: {} })
    await createNovelOutline(workspace, {
      project_id: project.id,
      outline_type: 'chapter',
      title: '第1章 风起荒原',
      summary: '丁松言踏入大荒，发现异兽规则正在复苏。',
      conflict_points: ['异兽规则压迫主角做出选择'],
      hook: '远处传来第二头异兽的啸声。',
      raw_payload: { chapter_no: 1 },
    })
    await createNovelOutline(workspace, {
      project_id: project.id,
      outline_type: 'chapter',
      title: '第2章 血符初燃',
      summary: '丁松言用血符验证第一条规则。',
      conflict_points: ['血符代价和异兽追击同时升级'],
      hook: '血符亮起了不属于他的名字。',
      raw_payload: { chapter_no: 2 },
    })
    const { app, handlers } = createRouteHarness()
    registerNovelGenerationRoutes(app as any, generationCtx(workspace, production) as any)
    const startUnattended = handlers.get('POST /api/novel/projects/:id/chapter-groups/start-unattended')

    const response = await callRoute(startUnattended, {
      params: { id: String(project.id) },
      body: { start_chapter: 1, target_chapter: 2, create_missing: true, quality_threshold: 86 },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.group).toMatchObject({
      mode: 'unattended_goal',
      production_mode: 'full_auto',
      unattended: {
        enabled: true,
        start_chapter: 1,
        target_chapter: 2,
        auto_repair_missing_material: true,
        auto_repair_quality_gate: true,
      },
      policy: {
        quality_threshold: 86,
        auto_repair_missing_material: true,
        auto_repair_quality_gate: true,
      },
    })
    expect(response.body.group.chapters.map((chapter: any) => chapter.chapter_no)).toEqual([1, 2])

    const generateCalls: number[] = []
    const execution = createNovelRunExecutionService({
      getProject: async () => project,
      production,
      listNovelRuns,
      updateNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, chapterId, options) => {
        generateCalls.push(chapterId)
        await options.onStage('material_repair', { status: 'success', repaired: [] })
        await options.onStage('draft', { status: 'success', scene_status: 'generated' })
        await options.onStage('review', { status: 'success', score: 92 })
        return {
          score: 92,
          revised: false,
          story_state_update: ohStoryStep3Ok(),
          config_snapshot: { snapshot_id: `chapter-${chapterId}` },
        }
      },
    })

    const executed = await execution.executeChapterGroupRunRecord(workspace, project, response.body.run, {
      lock_owner: 'integration-test',
      max_chapters: 2,
    })

    expect(executed.status).toBe('success')
    expect(executed.processed).toBe(2)
    expect(executed.group.current_index).toBe(2)
    expect(executed.group.chapters.map((chapter: any) => chapter.status)).toEqual(['success', 'success'])
    expect(generateCalls).toEqual(response.body.group.chapters.map((chapter: any) => chapter.id))
  })
})

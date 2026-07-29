import { afterEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { appendNovelRun, createNovelProject, createNovelReview, listNovelProjects, listNovelReviews, listNovelRuns, updateNovelRun } from '../novel'
import { setNovelMutationTestHook } from '../novel-test-support'
import { createNovelProductionService } from './novel-production-service'
import { revisionTextHash } from './novel-editor/revision-candidate-admission'
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
  setNovelMutationTestHook(null)
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('novel run task center source guards', () => {
  test('preserves different task-index updates when status requests interleave', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '并发任务关闭', reference_config: {} })
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'longform_production_repair',
      step_name: 'two-task-repair',
      status: 'ready',
      output_ref: JSON.stringify({
        tasks: [
          { title: '修复第一项', task_status: 'open' },
          { title: '修复第二项', task_status: 'open' },
        ],
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
    const updateStatus = handlers.get('POST /api/novel/runs/:id/tasks/:taskIndex/status')
    let releaseFirstWrite!: () => void
    let firstWriteEntered!: () => void
    const firstWriteGate = new Promise<void>(resolve => { releaseFirstWrite = resolve })
    const firstWriteStarted = new Promise<void>(resolve => { firstWriteEntered = resolve })
    let held = false
    setNovelMutationTestHook(async event => {
      if (held || event.phase !== 'before_full_store_write') return
      held = true
      firstWriteEntered()
      await firstWriteGate
    })

    const first = callRoute(updateStatus, {
      params: { id: String(run.id), taskIndex: '0' },
      body: { project_id: project.id, status: 'resolved', note: 'first' },
    })
    await firstWriteStarted
    const second = callRoute(updateStatus, {
      params: { id: String(run.id), taskIndex: '1' },
      body: { project_id: project.id, status: 'resolved', note: 'second' },
    })
    await new Promise(resolve => setTimeout(resolve, 10))
    releaseFirstWrite()
    const responses = await Promise.all([first, second])
    setNovelMutationTestHook(null)

    expect(responses.map(response => response.statusCode)).toEqual([200, 200])
    const stored = (await listNovelRuns(workspace, project.id)).find(item => item.id === run.id)!
    const payload = JSON.parse(String(stored.output_ref || '{}'))
    expect(payload.tasks.map((task: any) => task.task_status)).toEqual(['resolved', 'resolved'])
    expect(payload.task_status_summary).toMatchObject({ total: 2, resolved: 2, open: 0 })
    expect(stored.status).toBe('completed')
  })

  test('preserves an exact-index update when a bulk status request reads concurrently', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '并发批量任务关闭', reference_config: {} })
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'longform_production_repair',
      step_name: 'exact-and-bulk-repair',
      status: 'ready',
      output_ref: JSON.stringify({
        tasks: [
          { title: '修复第一项', task_status: 'open' },
          { title: '修复第二项', task_status: 'open' },
        ],
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
    const updateStatus = handlers.get('POST /api/novel/runs/:id/tasks/:taskIndex/status')
    const bulkUpdateStatus = handlers.get('POST /api/novel/runs/:id/tasks/status-bulk')
    let releaseExactWrite!: () => void
    let exactWriteEntered!: () => void
    const exactWriteGate = new Promise<void>(resolve => { releaseExactWrite = resolve })
    const exactWriteStarted = new Promise<void>(resolve => { exactWriteEntered = resolve })
    let held = false
    setNovelMutationTestHook(async event => {
      if (held || event.phase !== 'before_full_store_write') return
      held = true
      exactWriteEntered()
      await exactWriteGate
    })

    const exact = callRoute(updateStatus, {
      params: { id: String(run.id), taskIndex: '0' },
      body: { project_id: project.id, status: 'resolved', note: 'exact' },
    })
    await exactWriteStarted
    const bulk = callRoute(bulkUpdateStatus, {
      params: { id: String(run.id) },
      body: { project_id: project.id, task_indices: [1], status: 'resolved', note: 'bulk' },
    })
    await new Promise(resolve => setTimeout(resolve, 10))
    releaseExactWrite()
    const responses = await Promise.all([exact, bulk])
    setNovelMutationTestHook(null)

    expect(responses.map(response => response.statusCode)).toEqual([200, 200])
    const stored = (await listNovelRuns(workspace, project.id)).find(item => item.id === run.id)!
    const payload = JSON.parse(String(stored.output_ref || '{}'))
    expect(payload.tasks.map((task: any) => task.task_status)).toEqual(['resolved', 'resolved'])
    expect(payload.task_status_summary).toMatchObject({ total: 2, resolved: 2, open: 0 })
    expect(stored.status).toBe('completed')
  })

  test('keeps full review and run contracts by default while summary views stay below ten percent and detail rows are exact', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '任务摘要体积回归', reference_config: {} })
    const otherProject = await createNovelProject(workspace, { title: '其他任务项目', reference_config: {} })
    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'book_review',
      status: 'ok',
      summary: '较早的全书复盘',
      created_at: '2025-01-01T00:00:00.000Z',
    })
    await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'quality_benchmark',
      step_name: 'older-run',
      status: 'completed',
      created_at: '2025-01-01T00:00:00.000Z',
    })
    const largeDiagnostic = '完整诊断上下文、提示词、模型返回与证据链。'.repeat(1800)
    const review = await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'prose_quality',
      status: 'warn',
      summary: '第十一章已入库，建议修订静态描写。'.repeat(20),
      issues: Array.from({ length: 24 }, (_, index) => `问题${index + 1}：${'环境描写未推动动作。'.repeat(40)}`),
      payload: JSON.stringify({
        chapter_id: 711,
        chapter_no: 11,
        context_package: { chapter_target: { chapter_id: 711, chapter_no: 11, title: '第十一章' } },
        self_check: { review: { score: 82, passed: false, publishable: false } },
        diagnostic_archive: largeDiagnostic,
      }),
    })
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'chapter_group_generation',
      step_name: 'chapter-11',
      status: 'completed',
      input_ref: JSON.stringify({ chapter_id: 711, chapter_no: 11, context_archive: largeDiagnostic }),
      output_ref: JSON.stringify({
        current_index: 1,
        chapters: [
          { id: 700, chapter_no: 10, status: 'success' },
          {
            id: 711,
            chapter_no: 11,
            status: 'success',
            admission_status: 'accepted_with_warnings',
            quality_warnings: [{ code: 'decorative_detail', message: '静态装饰细节偏多' }],
            story_state_status: 'pending',
            post_commit_warnings: [{ stage: 'memory', message: '记忆索引等待补同步' }],
          },
        ],
        diagnostic_archive: largeDiagnostic,
      }),
      duration_ms: 3210,
      error_message: '',
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

    const reviewsRoute = handlers.get('GET /api/novel/projects/:id/reviews')
    const reviewDetailRoute = handlers.get('GET /api/novel/reviews/:reviewId')
    const runsRoute = handlers.get('GET /api/novel/runs')
    const runDetailRoute = handlers.get('GET /api/novel/runs/:id')
    const fullReviews = await listNovelReviews(workspace, project.id)
    const fullRuns = await listNovelRuns(workspace, project.id)
    const storedReview = fullReviews.find(item => item.id === review.id)!
    const storedReviewPayload = JSON.parse(String(storedReview.payload || '{}'))
    expect(storedReviewPayload).not.toHaveProperty('chapter_no')
    expect(storedReviewPayload.context_package.chapter_target.chapter_no).toBe(11)
    expect(storedReviewPayload.self_check.review.passed).toBe(false)
    expect(storedReviewPayload.self_check.review).not.toHaveProperty('publishable')

    const defaultReviews = await callRoute(reviewsRoute, { params: { id: String(project.id) }, query: {} })
    const defaultRuns = await callRoute(runsRoute, { query: { project_id: String(project.id) } })
    expect(defaultReviews.body).toEqual(fullReviews)
    expect(defaultRuns.body).toEqual(fullRuns)

    const summaryReviews = await callRoute(reviewsRoute, { params: { id: String(project.id) }, query: { view: 'summary' } })
    expect(summaryReviews.statusCode).toBe(200)
    expect(summaryReviews.body[0]).toMatchObject({
      id: review.id,
      review_type: 'prose_quality',
      status: 'warn',
      chapter_id: 711,
      chapter_no: 11,
      issue_count: 24,
      score: 82,
      passed: false,
    })
    expect(summaryReviews.body[0].summary.length).toBeLessThanOrEqual(240)
    expect(summaryReviews.body[0].preview).toContain('问题1')
    expect(summaryReviews.body[0].payload_bytes).toBe(Buffer.byteLength(String(storedReview.payload || ''), 'utf8'))
    expect(summaryReviews.body[0]).not.toHaveProperty('issues')
    expect(summaryReviews.body[0]).not.toHaveProperty('payload')
    expect(JSON.stringify(summaryReviews.body).length).toBeLessThan(JSON.stringify(defaultReviews.body).length * 0.1)

    const summaryRuns = await callRoute(runsRoute, { query: { project_id: String(project.id), view: 'summary' } })
    expect(summaryRuns.statusCode).toBe(200)
    expect(summaryRuns.body[0]).toMatchObject({
      id: run.id,
      run_type: 'chapter_group_generation',
      status: 'completed',
      chapter_id: 711,
      chapter_no: 11,
      admission_status: 'accepted_with_warnings',
      admission_warning_count: 1,
      admission_warning_preview: '静态装饰细节偏多',
      story_state_status: 'pending',
      story_state_pending: true,
      post_commit_warning_count: 1,
      post_commit_warning_preview: '记忆索引等待补同步',
    })
    expect(summaryRuns.body[0].input_bytes).toBeGreaterThan(1000)
    expect(summaryRuns.body[0].output_bytes).toBeGreaterThan(1000)
    expect(summaryRuns.body[0]).not.toHaveProperty('input_ref')
    expect(summaryRuns.body[0]).not.toHaveProperty('output_ref')
    expect(JSON.stringify(summaryRuns.body).length).toBeLessThan(JSON.stringify(defaultRuns.body).length * 0.1)

    const limitedReviews = await callRoute(reviewsRoute, { params: { id: String(project.id) }, query: { view: 'summary', limit: '1' } })
    const limitedRuns = await callRoute(runsRoute, { query: { project_id: String(project.id), view: 'summary', limit: '1' } })
    expect(limitedReviews.body).toHaveLength(1)
    expect(limitedRuns.body).toHaveLength(1)
    expect((await callRoute(reviewsRoute, { params: { id: String(project.id) }, query: { view: 'summary', limit: '0' } })).body).toMatchObject({ error_code: 'INVALID_LIMIT' })
    expect((await callRoute(runsRoute, { query: { project_id: String(project.id), view: 'summary', limit: 'all' } })).body).toMatchObject({ error_code: 'INVALID_LIMIT' })

    expect((await callRoute(reviewDetailRoute, { params: { reviewId: String(review.id) }, query: { project_id: String(project.id) } })).body).toEqual(storedReview)
    expect((await callRoute(runDetailRoute, { params: { id: String(run.id) }, query: { project_id: String(project.id) } })).body).toEqual(fullRuns[0])

    const missingReviewProject = await callRoute(reviewDetailRoute, { params: { reviewId: String(review.id) }, query: {} })
    const missingRunProject = await callRoute(runDetailRoute, { params: { id: String(run.id) }, query: {} })
    expect(missingReviewProject.statusCode).toBe(400)
    expect(missingReviewProject.body).toMatchObject({ error_code: 'PROJECT_ID_REQUIRED' })
    expect(missingRunProject.statusCode).toBe(400)
    expect(missingRunProject.body).toMatchObject({ error_code: 'PROJECT_ID_REQUIRED' })

    const crossProjectReview = await callRoute(reviewDetailRoute, { params: { reviewId: String(review.id) }, query: { project_id: String(otherProject.id) } })
    const crossProjectRun = await callRoute(runDetailRoute, { params: { id: String(run.id) }, query: { project_id: String(otherProject.id) } })
    expect(crossProjectReview.statusCode).toBe(404)
    expect(crossProjectReview.body).toEqual({ error: 'review not found' })
    expect(crossProjectRun.statusCode).toBe(404)
    expect(crossProjectRun.body).toEqual({ error: 'run not found' })

    const invalidReviews = await callRoute(reviewsRoute, { params: { id: String(project.id) }, query: { view: '../summary' } })
    const invalidRuns = await callRoute(runsRoute, { query: { project_id: String(project.id), view: 'summary OR 1=1' } })
    expect(invalidReviews.statusCode).toBe(400)
    expect(invalidReviews.body).toMatchObject({ error_code: 'INVALID_VIEW' })
    expect(invalidRuns.statusCode).toBe(400)
    expect(invalidRuns.body).toMatchObject({ error_code: 'INVALID_VIEW' })
    expect(await listNovelReviews(workspace, project.id)).toEqual(fullReviews)
    expect(await listNovelRuns(workspace, project.id)).toEqual(fullRuns)
  })

  test('keeps editor_revision in run projections while redacting raw refs, source prose, and candidate prose', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '单章修订公开投影', reference_config: {} })
    const sourceText = 'SOURCE_SENTINEL 不可公开源正文。'.repeat(40)
    const candidateText = 'CANDIDATE_SENTINEL 不可公开候选正文。'.repeat(40)
    const input = {
      schema_version: 1,
      project_id: project.id,
      chapter_id: 701,
      chapter_no: 1,
      chapter_title: '第一章',
      review_id: 9,
      source_chapter_updated_at: '2030-01-01T00:00:00.000Z',
      source_text: sourceText,
      source_text_hash: revisionTextHash(sourceText),
      source_char_count: sourceText.replace(/\s/g, '').length,
      source_review: { id: 9, review_type: 'prose_quality' },
      report: { chapter_id: 701, must_fix: ['只修第一章'] },
      context_package: { current_chapter: { chapter_id: 701 } },
      revision_mode: 'from_report',
      revision_strategy: 'surgical_patch',
      user_prompt: '不可公开 prompt',
      auto_quality_check: true,
      auto_story_state: true,
      created_at: '2030-01-01T00:00:00.000Z',
    }
    const checkpoint = {
      schema_version: 1,
      phase: 'admit_candidate',
      phases: {
        generate_candidate: {
          status: 'completed',
          attempt: 1,
          summary: { diagnostics: { finish_reason: 'stop', content_preview: candidateText } },
        },
        admit_candidate: {
          status: 'completed',
          attempt: 1,
          summary: {
            source_char_count: input.source_char_count,
            candidate_char_count: candidateText.replace(/\s/g, '').length,
            candidate_text: candidateText,
          },
        },
        persist_chapter: { status: 'pending', attempt: 0 },
        post_quality: { status: 'pending', attempt: 0 },
        sync_current_story_state: { status: 'pending', attempt: 0 },
        record_continuity_warning: { status: 'pending', attempt: 0 },
        completed: { status: 'pending', attempt: 0 },
      },
      candidate: {
        text: candidateText,
        hash: revisionTextHash(candidateText),
        char_count: candidateText.replace(/\s/g, '').length,
        applied_patches: [{ replacement: candidateText }],
        diagnostics: { candidate_text: candidateText },
      },
      prose_persisted: false,
      warnings: [],
    }
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'editor_revision',
      step_name: 'chapter-1',
      status: 'running',
      scope_key: 'chapter:701',
      input_ref: JSON.stringify(input),
      output_ref: JSON.stringify(checkpoint),
    })
    const stored = (await listNovelRuns(workspace, project.id)).find(item => item.id === run.id)!
    expect(JSON.stringify(stored)).toContain('SOURCE_SENTINEL')
    expect(JSON.stringify(stored)).toContain('CANDIDATE_SENTINEL')

    const { app, handlers } = createRouteHarness()
    registerNovelRunRoutes(app as any, {
      getWorkspace: () => workspace,
      getProject: async (_workspace: string, id: number) => (await listNovelProjects(_workspace)).find(item => item.id === id) || null,
      runQueueWorkers: new Map(),
      getProductionBudgetDecision: () => ({ blocked: false, reasons: [] }),
      buildPipelineSteps: production.buildPipelineSteps,
      executeChapterGroupRunRecord: async () => ({ status: 'not-used', processed: 0 }),
    })
    const runsRoute = handlers.get('GET /api/novel/runs')
    const detailRoute = handlers.get('GET /api/novel/runs/:id')
    const tasksRoute = handlers.get('GET /api/novel/projects/:id/tasks')
    const full = await callRoute(runsRoute, { query: { project_id: String(project.id) } })
    const summary = await callRoute(runsRoute, { query: { project_id: String(project.id), view: 'summary' } })
    const detail = await callRoute(detailRoute, {
      params: { id: String(run.id) },
      query: { project_id: String(project.id) },
    })
    const tasks = await callRoute(tasksRoute, { params: { id: String(project.id) } })
    const projections = [
      full.body.find((item: any) => item.id === run.id),
      summary.body.find((item: any) => item.id === run.id),
      detail.body,
      tasks.body.tasks.find((item: any) => item.id === run.id),
    ]

    for (const projection of projections) {
      expect(projection).toMatchObject({
        id: run.id,
        run_type: 'editor_revision',
        chapter_id: 701,
        chapter_no: 1,
        phase: 'admit_candidate',
      })
      expect(projection).not.toHaveProperty('input_ref')
      expect(projection).not.toHaveProperty('output_ref')
      expect(projection).not.toHaveProperty('source_text')
      expect(projection).not.toHaveProperty('candidate')
      const serialized = JSON.stringify(projection)
      expect(serialized).not.toContain('SOURCE_SENTINEL')
      expect(serialized).not.toContain('CANDIDATE_SENTINEL')
      expect(serialized).not.toContain('"source_text"')
      expect(serialized).not.toContain('"candidate":')
    }
  })

  test('redacts revision-owned review prose from ordinary full and detail APIs', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '单章修订 review 脱敏', reference_config: {} })
    const sourceExcerpt = 'SOURCE_REVIEW_SENTINEL 不可公开源文摘录'
    const candidateExcerpt = 'CANDIDATE_REVIEW_SENTINEL 不可公开候选正文'
    const contextExcerpt = 'CONTEXT_REVIEW_SENTINEL 不可公开上下文正文'
    const candidateHash = revisionTextHash(candidateExcerpt)
    const revisionReview = await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'editor_revision',
      status: 'ok',
      summary: '单章修订已提交',
      issues: [],
      payload: JSON.stringify({
        chapter_id: 701,
        chapter_no: 1,
        source_review_id: 9,
        source_run_id: 44,
        candidate_hash: candidateHash,
        requested_revision_mode: 'from_report',
        revision_strategy: 'surgical_patch',
        applied_patches: [{
          type: 'replacement',
          match: 'exact',
          find: sourceExcerpt,
          replace: candidateExcerpt,
        }],
        candidate_diagnostics: {
          source_char_count: 5910,
          candidate_char_count: 5900,
          applied_patch_count: 1,
          context_excerpt: contextExcerpt,
        },
      }),
    })
    const qualityReview = await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'prose_quality',
      status: 'ok',
      summary: '当前版本质检评分 88',
      issues: [],
      payload: JSON.stringify({
        chapter_id: 701,
        chapter_updated_at: '2030-01-01T00:00:01.000Z',
        content_hash: candidateHash,
        source: 'post_revision',
        source_review_id: 9,
        source_run_id: 44,
        candidate_hash: candidateHash,
        current_chapter_only: true,
        context_package: {
          chapter_target: { id: 701, chapter_no: 1 },
          current_chapter: { chapter_text: contextExcerpt },
          continuity: { previous_chapter: { chapter_text: sourceExcerpt } },
        },
        self_check: {
          review: { passed: true, score: 88, issues: [], needs_revision: false },
          revision: null,
          final_text: candidateExcerpt,
          revised: false,
        },
        delivery_link: { version: 'prose_quality_delivery_link_v1', source_count: 1 },
        plan_alignment: { chapter_id: 701, rebuilt: true, reason: 'current_only' },
      }),
    })
    const stored = await listNovelReviews(workspace, project.id)
    expect(JSON.stringify(stored)).toContain(sourceExcerpt)
    expect(JSON.stringify(stored)).toContain(candidateExcerpt)
    expect(JSON.stringify(stored)).toContain(contextExcerpt)

    const { app, handlers } = createRouteHarness()
    registerNovelRunRoutes(app as any, {
      getWorkspace: () => workspace,
      getProject: async (_workspace: string, id: number) => (await listNovelProjects(_workspace)).find(item => item.id === id) || null,
      runQueueWorkers: new Map(),
      getProductionBudgetDecision: () => ({ blocked: false, reasons: [] }),
      buildPipelineSteps: production.buildPipelineSteps,
      executeChapterGroupRunRecord: async () => ({ status: 'not-used', processed: 0 }),
    })
    const reviewsRoute = handlers.get('GET /api/novel/projects/:id/reviews')
    const detailRoute = handlers.get('GET /api/novel/reviews/:reviewId')
    const full = await callRoute(reviewsRoute, { params: { id: String(project.id) }, query: {} })
    const revisionDetail = await callRoute(detailRoute, {
      params: { reviewId: String(revisionReview.id) },
      query: { project_id: String(project.id) },
    })
    const qualityDetail = await callRoute(detailRoute, {
      params: { reviewId: String(qualityReview.id) },
      query: { project_id: String(project.id) },
    })
    const publicReviews = [
      full.body.find((item: any) => item.id === revisionReview.id),
      full.body.find((item: any) => item.id === qualityReview.id),
      revisionDetail.body,
      qualityDetail.body,
    ]

    for (const review of publicReviews) {
      const serialized = JSON.stringify(review)
      expect(serialized).not.toContain(sourceExcerpt)
      expect(serialized).not.toContain(candidateExcerpt)
      expect(serialized).not.toContain(contextExcerpt)
      expect(serialized).not.toContain('context_package')
      expect(serialized).not.toContain('final_text')
      expect(serialized).not.toContain('"find"')
      expect(serialized).not.toContain('"replace"')
    }
    expect(JSON.parse(revisionDetail.body.payload)).toMatchObject({
      chapter_id: 701,
      chapter_no: 1,
      source_run_id: 44,
      candidate_hash: candidateHash,
      applied_patches: [{ type: 'replacement', match: 'exact' }],
      candidate_diagnostics: {
        source_char_count: 5910,
        candidate_char_count: 5900,
        applied_patch_count: 1,
      },
    })
    expect(JSON.parse(qualityDetail.body.payload)).toMatchObject({
      chapter_id: 701,
      source: 'post_revision',
      source_run_id: 44,
      candidate_hash: candidateHash,
      current_chapter_only: true,
      self_check: {
        review: { passed: true, score: 88, needs_revision: false },
        revised: false,
      },
    })
  })

  test('preserves manual prose-quality review payloads in ordinary full and detail APIs', async () => {
    const workspace = await tempWorkspace()
    const production = createNovelProductionService()
    const project = await createNovelProject(workspace, { title: '手动质检 review 兼容性', reference_config: {} })
    const chapterText = 'MANUAL_REVIEW_SENTINEL 手动质检正文应保持原有接口形态'
    const candidateHash = revisionTextHash(chapterText)
    const manualReview = await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'prose_quality',
      status: 'warn',
      summary: '当前版本质检评分 76',
      issues: ['medium｜需要人工调整'],
      payload: JSON.stringify({
        chapter_id: 702,
        chapter_updated_at: '2030-01-01T00:00:02.000Z',
        content_hash: candidateHash,
        source: 'manual_refresh',
        source_review_id: null,
        source_run_id: null,
        candidate_hash: candidateHash,
        current_chapter_only: true,
        context_package: {
          chapter_target: { id: 702, chapter_no: 2 },
          current_chapter: { chapter_text: chapterText },
        },
        self_check: {
          review: { passed: false, score: 76, issues: ['需要人工调整'], needs_revision: true },
          revision: null,
          final_text: chapterText,
          revised: false,
        },
        delivery_link: { version: 'prose_quality_delivery_link_v1', source_count: 0 },
        plan_alignment: { chapter_id: 702, rebuilt: false, reason: 'already_aligned' },
      }),
    })
    const storedReview = (await listNovelReviews(workspace, project.id)).find(item => item.id === manualReview.id)!

    const { app, handlers } = createRouteHarness()
    registerNovelRunRoutes(app as any, {
      getWorkspace: () => workspace,
      getProject: async (_workspace: string, id: number) => (await listNovelProjects(_workspace)).find(item => item.id === id) || null,
      runQueueWorkers: new Map(),
      getProductionBudgetDecision: () => ({ blocked: false, reasons: [] }),
      buildPipelineSteps: production.buildPipelineSteps,
      executeChapterGroupRunRecord: async () => ({ status: 'not-used', processed: 0 }),
    })
    const reviewsRoute = handlers.get('GET /api/novel/projects/:id/reviews')
    const detailRoute = handlers.get('GET /api/novel/reviews/:reviewId')
    const full = await callRoute(reviewsRoute, { params: { id: String(project.id) }, query: {} })
    const detail = await callRoute(detailRoute, {
      params: { reviewId: String(manualReview.id) },
      query: { project_id: String(project.id) },
    })

    expect(full.body.find((item: any) => item.id === manualReview.id)).toEqual(storedReview)
    expect(detail.body).toEqual(storedReview)
  })

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
    const source = [readFileSync(join(import.meta.dir, 'novel-run-routes.ts'), 'utf8'), readFileSync(join(import.meta.dir, 'novel-run-helpers.ts'), 'utf8')].join('\n')

    expect(source).toContain('REPAIR_TASK_RUN_TYPES')
    expect(source).toContain('can_process_repair_tasks')
    expect(source).toContain('!isRepairTaskRun && [\'paused\', \'failed\', \'ready\'].includes(run.status)')
    expect(source).toContain('REPAIR_TASK_RUN_NOT_RESUMABLE')
  })

  test('aborts the current unattended chapter execution when the worker is stopped', () => {
    const source = [readFileSync(join(import.meta.dir, 'novel-run-routes.ts'), 'utf8'), readFileSync(join(import.meta.dir, 'novel-run-helpers.ts'), 'utf8')].join('\n')
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
    const source = [readFileSync(join(import.meta.dir, 'novel-run-routes.ts'), 'utf8'), readFileSync(join(import.meta.dir, 'novel-run-helpers.ts'), 'utf8')].join('\n')
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

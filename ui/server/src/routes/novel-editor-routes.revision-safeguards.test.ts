import { afterEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { rm } from 'fs/promises'
import { join } from 'path'
import {
  appendNovelRun,
  createNovelChapter,
  createNovelProject,
  createNovelReview,
  listNovelProjects,
  listNovelReviews,
  listNovelRuns,
  updateNovelRun,
} from '../novel'
import { openDb } from '../novel/db'
import { tempWorkspace, workspaces } from '../novel/test-utils'
import type {
  EditorRevisionCheckpoint,
  EditorRevisionPhase,
  EditorRevisionPhaseState,
} from './novel-editor/editor-revision-contract'
import { revisionTextHash } from './novel-editor/revision-candidate-admission'
import { registerNovelEditorAnnotationRoutes } from './novel-editor/register-annotations'
import { registerNovelEditorRevisionRoutes } from './novel-editor/register-revision'
import { registerNovelRunRoutes } from './novel-run-routes'
import {
  buildReviewAnnotations,
  buildReviewAnnotationRepairTasks,
  buildStorylineDiffDecisionRepairTasks,
  buildChapterDeliveryRiskBrief,
  buildChapterQualityCard,
  buildDeliveryRiskConvergenceReport,
  buildEditorReportPrompt,
  buildCompactEditorRevisionPrompt,
  buildEditorRevisionPrompt,
  buildStorylineDiffDecisionReviewPayload,
  applySurgicalRevisionPatch,
  isRevisionOutputTruncated,
} from './novel-editor-routes'

const ROUTE_SOURCE_TEXT = '不可泄漏的路由源正文。'.repeat(80)
const ROUTE_CANDIDATE_TEXT = '不可泄漏的路由候选正文。'.repeat(80)
const ROUTE_CONTEXT_SECRET = '完整 context package 秘密'
const ROUTE_USER_PROMPT = '只修改章末钩子，不可泄漏。'
const ROUTE_CLOSURE_SECRET = '不可泄漏的 linked closure 私密字段'

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
  await handler({ body: {}, query: {}, params: {}, ...req }, res)
  return res
}

function initialRevisionCheckpoint(): EditorRevisionCheckpoint {
  const phases = [
    'generate_candidate',
    'admit_candidate',
    'persist_chapter',
    'post_quality',
    'sync_current_story_state',
    'record_continuity_warning',
    'completed',
  ] as const
  return {
    schema_version: 1,
    phase: 'generate_candidate',
    phases: Object.fromEntries(phases.map(phase => [phase, {
      status: 'pending',
      attempt: 0,
    }])) as Record<EditorRevisionPhase, EditorRevisionPhaseState>,
    prose_persisted: false,
    warnings: [],
  }
}

function admittedRevisionCheckpoint(): EditorRevisionCheckpoint {
  const checkpoint = initialRevisionCheckpoint()
  checkpoint.phase = 'admit_candidate'
  checkpoint.phases.generate_candidate = {
    status: 'completed',
    attempt: 1,
    summary: {
      diagnostics: {
        finish_reason: 'stop',
        content_length: ROUTE_CANDIDATE_TEXT.length,
        content_preview: ROUTE_CANDIDATE_TEXT,
      },
    },
  }
  checkpoint.phases.admit_candidate = {
    status: 'completed',
    attempt: 1,
    summary: {
      source_char_count: ROUTE_SOURCE_TEXT.replace(/\s/g, '').length,
      candidate_char_count: ROUTE_CANDIDATE_TEXT.replace(/\s/g, '').length,
      candidate_text: ROUTE_CANDIDATE_TEXT,
    },
  }
  checkpoint.candidate = {
    text: ROUTE_CANDIDATE_TEXT,
    hash: revisionTextHash(ROUTE_CANDIDATE_TEXT),
    char_count: ROUTE_CANDIDATE_TEXT.replace(/\s/g, '').length,
    applied_patches: [{ replacement: ROUTE_CANDIDATE_TEXT }],
    diagnostics: { candidate_text: ROUTE_CANDIDATE_TEXT },
  }
  return checkpoint
}

function failedRevisionCheckpoint(
  code: string,
  options: { prosePersisted?: boolean; diagnostics?: Record<string, unknown> } = {},
): EditorRevisionCheckpoint {
  const checkpoint = options.prosePersisted ? admittedRevisionCheckpoint() : initialRevisionCheckpoint()
  const phase = options.prosePersisted ? 'post_quality' : 'generate_candidate'
  checkpoint.phase = phase
  if (options.prosePersisted) {
    checkpoint.prose_persisted = true
    checkpoint.phases.persist_chapter = { status: 'completed', attempt: 1 }
  }
  checkpoint.phases[phase] = {
    status: 'failed',
    attempt: 1,
    error_code: code,
    error: `${code} message`,
  }
  checkpoint.error = {
    code,
    message: `${code} message`,
    ...(options.diagnostics ? { diagnostics: options.diagnostics } : {}),
  }
  return checkpoint
}

function completedRevisionCheckpoint(): EditorRevisionCheckpoint {
  const checkpoint = admittedRevisionCheckpoint()
  checkpoint.phase = 'completed'
  checkpoint.prose_persisted = true
  checkpoint.linked_task_closure = { status: 'pending' }
  for (const phase of Object.keys(checkpoint.phases) as EditorRevisionPhase[]) {
    checkpoint.phases[phase] = { status: 'completed', attempt: 1 }
  }
  checkpoint.completed_at = '2030-07-29T10:00:00.000Z'
  return checkpoint
}

async function createAsyncRevisionRouteFixture() {
  const workspace = await tempWorkspace()
  const project = await createNovelProject(workspace, { title: '异步单章修订', reference_config: {} })
  const otherProject = await createNovelProject(workspace, { title: '其他项目', reference_config: {} })
  const chapter = await createNovelChapter(workspace, {
    project_id: project.id,
    chapter_no: 12,
    title: '门后名单',
    chapter_text: ROUTE_SOURCE_TEXT,
  })
  const otherChapter = await createNovelChapter(workspace, {
    project_id: project.id,
    chapter_no: 13,
    title: '广播室',
    chapter_text: '第十三章正文。'.repeat(80),
  })
  const review = await createNovelReview(workspace, {
    project_id: project.id,
    review_type: 'prose_quality',
    status: 'warn',
    summary: '建议收紧章末钩子',
    issues: ['章末信息量不足'],
    payload: JSON.stringify({
      chapter_id: chapter.id,
      report: {
        revision_strategy: 'surgical_patch',
        must_fix: ['收紧章末钩子'],
      },
      context_package: { forbidden_full_context: ROUTE_CONTEXT_SECRET },
    }),
  })
  const otherReview = await createNovelReview(workspace, {
    project_id: otherProject.id,
    review_type: 'prose_quality',
    payload: JSON.stringify({ chapter_id: 999, report: { must_fix: ['other project'] } }),
  })
  const enqueued: number[] = []
  const canceled: Array<{ runId: number; persistedStatus: string }> = []
  let revisionAgentCalls = 0
  let enqueueError: unknown = null
  const worker = {
    enqueue(runId: number) {
      if (enqueueError) throw enqueueError
      enqueued.push(runId)
    },
    cancel(runId: number) {
      const db = openDb(workspace)
      try {
        const row = db.query('SELECT status FROM runs WHERE id = ?').get(runId) as any
        canceled.push({ runId, persistedStatus: String(row?.status || '') })
      } finally {
        db.close()
      }
    },
  }
  const getProject = async (activeWorkspace: string, id: number) => (
    (await listNovelProjects(activeWorkspace)).find(item => item.id === id) || null
  )
  const { app, handlers } = createRouteHarness()
  registerNovelEditorRevisionRoutes(app as any, {
    getWorkspace: () => workspace,
    getProject,
    buildChapterContextPackage: async () => ({
      continuity: {
        previous_chapter: '第11章尾名单第一次出现',
        next_chapter: '第13章开篇承接名单归属',
      },
      full_context_secret: ROUTE_CONTEXT_SECRET,
    }),
    getStageModelId: () => 17,
    getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
    buildReferenceUsageReport: async () => ({}),
    buildStructuralSimilarityReport: () => ({}),
    buildReferenceMigrationDryPlan: () => ({}),
    diffTexts: () => ({}),
    executeAgent: async () => {
      revisionAgentCalls += 1
      return { parsed: { chapter_text: ROUTE_CANDIDATE_TEXT }, finish_reason: 'stop' } as any
    },
    updateStoryStateMachine: async () => ({}),
    editorRevisionWorker: worker,
  } as any)
  registerNovelEditorAnnotationRoutes(app as any, {
    getWorkspace: () => workspace,
    getProject,
  } as any)
  registerNovelRunRoutes(app as any, {
    getWorkspace: () => workspace,
    getProject,
    runQueueWorkers: new Map(),
    getProductionBudgetDecision: () => ({ blocked: false, reasons: [] }),
    buildPipelineSteps: () => [],
    executeChapterGroupRunRecord: async () => ({ status: 'not-used', processed: 0 }),
  })
  return {
    workspace,
    project,
    otherProject,
    chapter,
    otherChapter,
    review,
    otherReview,
    enqueued,
    canceled,
    failEnqueue(error: unknown = new Error('worker enqueue failed')) {
      enqueueError = error
    },
    get revisionAgentCalls() {
      return revisionAgentCalls
    },
    handlers,
  }
}

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map(workspace => rm(workspace, { recursive: true, force: true })))
})


function editorBuildersSource() {
  const dir = join(import.meta.dir, 'novel-editor')
  return [
    'builders.ts',
    'builders-annotations.ts',
    'builders-annotations-prose-quality.ts',
    'builders-annotations-prose-quality-types.ts',
    'builders-annotations-prose-quality-core.ts',
    'builders-annotations-prose-quality-craft.ts',
    'builders-annotations-prose-quality-audience.ts',
    'builders-annotations-delivery-risk.ts',
    'builders-annotations-repair-tasks.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}
describe('editor revision route safeguards', () => {
  test('detects max-token truncated revision output before reporting missing patches', () => {
    expect(isRevisionOutputTruncated({
      finish_reason: 'max_tokens',
      usage: { output_tokens: 2600 },
      raw: { stop_reason: 'max_tokens' },
    })).toBe(true)
  })

  test('requests enough output tokens for long local revision patches', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const source = [
      editorBuildersSource(),
      readFileSync(join(import.meta.dir, 'novel-editor/register.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-annotations.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-revision.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-quality.ts'), 'utf8'),
    ].join('\n')

    expect(source).toContain('REVISION_MAX_TOKENS')
    expect(source).not.toContain('maxTokens: 2600')
  })

  test('tells the revision model to keep patch anchors compact and allow deletions', () => {
    const prompt = buildEditorRevisionPrompt({
      project: { title: '超人的规则怪谈世界' },
      chapter: { chapter_text: '旧段落。\n\n下一段。' },
      report: { must_fix: ['删除重复抽象描写'] },
      revisionMode: 'from_report',
      userPrompt: '',
    })

    expect(prompt).toContain('find/anchor 控制在')
    expect(prompt).toContain('replace 允许为空字符串')
  })

  test('asks editor revision to follow workflow-revision context and output receipts', () => {
    const prompt = buildEditorRevisionPrompt({
      project: { title: '超人的规则怪谈世界' },
      chapter: {
        chapter_no: 12,
        title: '门后名单',
        chapter_text: '林青禾按住门牌。\n\n周远把名单推到灯下。',
      },
      report: { must_fix: ['修订后要同步下一章名单伏笔'] },
      deliveryRiskBrief: { revision_directives: ['下一章必须承接名单归属变化'] },
      revisionMode: 'from_report',
      userPrompt: '只改章末名单揭示。',
    })

    expect(prompt).toContain('workflow-revision')
    expect(prompt).toContain('Step 2')
    expect(prompt).toContain('previous_chapter')
    expect(prompt).toContain('next_chapter')
    expect(prompt).toContain('foreshadowing')
    expect(prompt).toContain('character_cards')
    expect(prompt).toContain('timeline')
    expect(prompt).toContain('setting_context')
    expect(prompt).toContain('正文元信息扫描')
    expect(prompt).toContain('禁用词扫描')
    expect(prompt).toContain('原文长度')
    expect(prompt).toContain('30%')
    expect(prompt).toContain('800 字')
    expect(prompt).toContain('revision_context_receipts')
    expect(prompt).toContain('revision_scope_guard')
    expect(prompt).toContain('revision_receipts')
    expect(prompt).toContain('cascade_impacts')
    expect(prompt).toContain('affected_chapters')
    expect(prompt).toContain('人工强制修订指令')
    expect(prompt).toContain('只改章末名单揭示。')
    expect(prompt).toContain('报告必修项')
    expect(prompt).toContain('修订后要同步下一章名单伏笔')
    expect(prompt).toContain('语言硬约束')
  })

  test('prioritizes custom revision directives without dropping report must_fix', () => {
    const prompt = buildEditorRevisionPrompt({
      project: { title: '超人的规则怪谈世界' },
      chapter: { chapter_text: '老陈看着江哲，只用纯肉身力量 and 太极暗劲就一拳轰碎了邪神意志投影。' },
      report: {
        must_fix: ['补足章末钩子'],
        one_click_revision_prompt: '补足章末钩子',
      },
      revisionMode: 'from_report',
      userPrompt: '删除正文中所有英文夹杂，统一改成自然中文。',
    })

    expect(prompt).toContain('【人工强制修订指令（最高优先级，必须先兑现）】')
    expect(prompt).toContain('删除正文中所有英文夹杂，统一改成自然中文。')
    expect(prompt).toContain('【报告必修项（仍须覆盖，不得因人工指令被整体忽略）】')
    expect(prompt).toContain('补足章末钩子')
    expect(prompt).toContain('语言硬约束')
    expect(prompt.indexOf('人工强制修订指令')).toBeLessThan(prompt.indexOf('报告必修项'))
  })

  test('injects actual workflow-revision context slices into editor revision prompt', () => {
    const prompt = buildEditorRevisionPrompt({
      project: { title: '超人的规则怪谈世界' },
      chapter: {
        chapter_no: 12,
        title: '门后名单',
        chapter_text: '林青禾按住门牌。\n\n周远把名单推到灯下。',
      },
      contextPackage: {
        continuity: {
          previous_chapter: '第11章尾：水迹名单第一次出现，周远没有拿到原件。',
          next_chapter: '第13章开篇：名单归属决定广播室门禁。',
        },
        chapter_outline: '细纲_第12章：章末只揭示名单半页，不提前公开全部姓名。',
        foreshadowing_context: ['名单背面的红线是后续伏笔。'],
        story_state: {
          characters: [
            { name: '林青禾', state: '怀疑周远隐瞒名单来源' },
            { name: '周远', state: '暂时持有名单复印件' },
          ],
          timeline: ['门牌翻面后，名单才能被灯照出红线。'],
        },
        setting_context: {
          required: ['广播室门禁', '名单红线'],
          forbidden: ['提前公布名单全名'],
        },
      },
      report: { must_fix: ['修订后要同步下一章名单伏笔'] },
      deliveryRiskBrief: { revision_directives: ['下一章必须承接名单归属变化'] },
      revisionMode: 'from_report',
      userPrompt: '只改章末名单揭示。',
    })

    expect(prompt).toContain('【workflow-revision 上下文包】')
    expect(prompt).toContain('第11章尾')
    expect(prompt).toContain('第13章开篇')
    expect(prompt).toContain('细纲_第12章')
    expect(prompt).toContain('名单背面的红线')
    expect(prompt).toContain('林青禾')
    expect(prompt).toContain('周远')
    expect(prompt).toContain('门牌翻面后')
    expect(prompt).toContain('广播室门禁')
    expect(prompt).toContain('提前公布名单全名')
  })

  test('builds context package before applying editor revision', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const source = [
      editorBuildersSource(),
      readFileSync(join(import.meta.dir, 'novel-editor/register.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-annotations.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-revision.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-quality.ts'), 'utf8'),
    ].join('\n')
    const routeStart = source.indexOf("app.post('/api/novel/reviews/:reviewId/apply-revision'")
    const routeBlock = source.slice(routeStart, source.indexOf("app.post('/api/novel/chapters/:chapterId/quality-card'", routeStart))

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(routeBlock).toContain('listNovelWorldbuilding')
    expect(routeBlock).toContain('listNovelCharacters')
    expect(routeBlock).toContain('listNovelOutlines')
    expect(routeBlock).toContain('ctx.buildChapterContextPackage')
    expect(routeBlock).toContain('contextPackage')
  })

  test('builds a compact retry prompt for truncated revision output', () => {
    const prompt = buildCompactEditorRevisionPrompt({
      project: { title: '超人的规则怪谈世界' },
      chapter: { chapter_text: '第一段。\n\n第二段。\n\n第三段。' },
      report: { must_fix: ['删掉重复抽象描写'] },
      deliveryRiskBrief: { revision_directives: ['削减抽象描写'] },
      revisionMode: 'from_report',
      userPrompt: '',
      previousOutputPreview: '{"replacements":[{"find":"超长未闭合',
    })

    expect(prompt).toContain('上一次修订输出被截断')
    expect(prompt).toContain('最多 6 条 replacements')
    expect(prompt).toContain('不要输出 Markdown')
    expect(prompt).toContain('禁止输出 chapter_text')
    expect(prompt).toContain('find 控制在 20-160 字')
    expect(prompt).toContain('replace 控制在 0-900 字')
  })

})

describe('asynchronous editor revision API safeguards', () => {
  test('the apply route is a create command and never contains synchronous revision writes', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-editor/register-revision.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/reviews/:reviewId/apply-revision'")
    const routeEnd = source.indexOf("app.get('/api/novel/editor-revisions/:runId'", routeStart)
    const routeBlock = source.slice(routeStart, routeEnd > routeStart ? routeEnd : undefined)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(routeBlock).toContain('createEditorRevisionRun')
    expect(routeBlock).toContain('ctx.editorRevisionWorker.enqueue')
    expect(routeBlock).not.toContain("executeNovelAgent('prose-agent'")
    expect(routeBlock).not.toContain('updateNovelChapter(')
    expect(routeBlock).not.toContain('createProseQualityReview(')
    expect(routeBlock).not.toContain('prepareSingleChapterStoryState(')
  })

  test('creates a queued immutable run, returns 202, and conflicts on the same active chapter', async () => {
    const fixture = await createAsyncRevisionRouteFixture()
    const applyRevision = fixture.handlers.get('POST /api/novel/reviews/:reviewId/apply-revision')
    const request = {
      params: { reviewId: String(fixture.review.id) },
      body: {
        project_id: fixture.project.id,
        chapter_id: fixture.chapter.id,
        model_id: 17,
        revision_mode: 'from_report',
        prompt: ROUTE_USER_PROMPT,
        auto_quality_check: true,
        auto_story_state: true,
      },
    }

    const created = await callRoute(applyRevision, request)
    expect(created.statusCode).toBe(202)
    expect(created.body).toMatchObject({
      ok: true,
      status: 'queued',
      chapter_id: fixture.chapter.id,
      status_url: `/api/novel/editor-revisions/${created.body.run_id}?project_id=${fixture.project.id}`,
    })
    expect(fixture.revisionAgentCalls).toBe(0)
    expect(fixture.enqueued).toEqual([created.body.run_id])

    const stored = (await listNovelRuns(fixture.workspace, fixture.project.id)).find(run => run.id === created.body.run_id)!
    const input = JSON.parse(String(stored.input_ref || '{}'))
    const checkpoint = JSON.parse(String(stored.output_ref || '{}'))
    expect(stored).toMatchObject({
      run_type: 'editor_revision',
      status: 'queued',
      scope_key: `chapter:${fixture.chapter.id}`,
    })
    expect(input).toMatchObject({
      schema_version: 1,
      project_id: fixture.project.id,
      chapter_id: fixture.chapter.id,
      chapter_no: 12,
      chapter_title: '门后名单',
      review_id: fixture.review.id,
      source_chapter_updated_at: fixture.chapter.updated_at,
      source_text: ROUTE_SOURCE_TEXT,
      source_text_hash: revisionTextHash(ROUTE_SOURCE_TEXT),
      source_char_count: ROUTE_SOURCE_TEXT.replace(/\s/g, '').length,
      revision_mode: 'from_report',
      revision_strategy: 'surgical_patch',
      user_prompt: ROUTE_USER_PROMPT,
      model_id: 17,
      auto_quality_check: true,
      auto_story_state: true,
      context_package: {
        previous_chapter: '第11章尾名单第一次出现',
        next_chapter: '第13章开篇承接名单归属',
      },
    })
    expect(JSON.stringify(input)).not.toContain(ROUTE_CONTEXT_SECRET)
    expect(input).not.toHaveProperty('prompt')
    expect(checkpoint).toEqual(initialRevisionCheckpoint())

    const conflict = await callRoute(applyRevision, request)
    expect(conflict.statusCode).toBe(409)
    expect(conflict.body).toMatchObject({
      error_code: 'REVISION_ALREADY_ACTIVE',
      run_id: created.body.run_id,
      status_url: created.body.status_url,
    })
    expect(fixture.revisionAgentCalls).toBe(0)
    expect(fixture.enqueued).toEqual([created.body.run_id])
  })

  test('stores a linked repair task privately and rejects premature closure acknowledgement', async () => {
    const fixture = await createAsyncRevisionRouteFixture()
    const sourceRun = await appendNovelRun(fixture.workspace, {
      project_id: fixture.project.id,
      run_type: 'longform_production_repair',
      step_name: 'linked-repair-task',
      status: 'ready',
      output_ref: JSON.stringify({ tasks: [{ title: '不可泄漏的源任务', task_status: 'open' }] }),
    })
    const applyRevision = fixture.handlers.get('POST /api/novel/reviews/:reviewId/apply-revision')
    const created = await callRoute(applyRevision, {
      params: { reviewId: String(fixture.review.id) },
      body: {
        project_id: fixture.project.id,
        chapter_id: fixture.chapter.id,
        repair_task_link: {
          run_id: sourceRun.id,
          task_index: 0,
          task: { title: '不可泄漏的源任务', private_evidence: ROUTE_CONTEXT_SECRET },
        },
      },
    })
    expect(created.statusCode).toBe(202)

    const stored = (await listNovelRuns(fixture.workspace, fixture.project.id))
      .find(run => run.id === created.body.run_id)!
    expect(JSON.parse(String(stored.input_ref || '{}')).repair_task_link).toMatchObject({
      run_id: sourceRun.id,
      task_index: 0,
      task: { title: '不可泄漏的源任务' },
    })
    expect(JSON.parse(String(stored.output_ref || '{}')).linked_task_closure).toEqual({ status: 'pending' })

    const failed = failedRevisionCheckpoint('PROVIDER_FAILED')
    failed.linked_task_closure = { status: 'pending' }
    await updateNovelRun(fixture.workspace, created.body.run_id, {
      status: 'failed',
      output_ref: JSON.stringify(failed),
      error_message: 'PROVIDER_FAILED',
    })

    const acknowledge = fixture.handlers.get('POST /api/novel/editor-revisions/:runId/linked-task-closure')
    expect(typeof acknowledge).toBe('function')
    const revisionBefore = (await listNovelRuns(fixture.workspace, fixture.project.id))
      .find(run => run.id === created.body.run_id)
    const acknowledged = await callRoute(acknowledge, {
      params: { runId: String(created.body.run_id) },
      body: { project_id: fixture.project.id },
    })
    expect(acknowledged.statusCode).toBe(409)
    expect(acknowledged.body).toMatchObject({
      error_code: 'REVISION_LINKED_TASK_CLOSURE_NOT_READY',
    })
    expect((await listNovelRuns(fixture.workspace, fixture.project.id))
      .find(run => run.id === created.body.run_id)).toEqual(revisionBefore)

    const sourceAfter = (await listNovelRuns(fixture.workspace, fixture.project.id))
      .find(run => run.id === sourceRun.id)
    expect(sourceAfter).toMatchObject({
      id: sourceRun.id,
      status: sourceRun.status,
      output_ref: sourceRun.output_ref,
      updated_at: sourceRun.updated_at,
    })
  })

  test('stores a stable exact-task closure receipt when an editor revision status response is replayed', async () => {
    const fixture = await createAsyncRevisionRouteFixture()
    const sourceTask = { title: '关闭章末风险', task_status: 'open' }
    const sourceRun = await appendNovelRun(fixture.workspace, {
      project_id: fixture.project.id,
      run_type: 'longform_production_repair',
      step_name: 'durable-linked-repair-task',
      status: 'ready',
      output_ref: JSON.stringify({ tasks: [sourceTask] }),
    })
    const applyRevision = fixture.handlers.get('POST /api/novel/reviews/:reviewId/apply-revision')
    const created = await callRoute(applyRevision, {
      params: { reviewId: String(fixture.review.id) },
      body: {
        project_id: fixture.project.id,
        chapter_id: fixture.chapter.id,
        repair_task_link: { run_id: sourceRun.id, task_index: 0, task: sourceTask },
      },
    })
    await updateNovelRun(fixture.workspace, created.body.run_id, {
      status: 'completed',
      output_ref: JSON.stringify(completedRevisionCheckpoint()),
    })
    const updateTask = fixture.handlers.get('POST /api/novel/runs/:id/tasks/:taskIndex/status')
    const first = await callRoute(updateTask, {
      params: { id: String(sourceRun.id), taskIndex: '0' },
      body: {
        project_id: fixture.project.id,
        status: 'resolved',
        note: 'first committed response',
        editor_revision_run_id: created.body.run_id,
      },
    })
    expect(first.statusCode).toBe(200)
    const firstTask = first.body.task
    const receipt = firstTask.editor_revision_closure_receipts?.[String(created.body.run_id)]
    expect(receipt).toBeDefined()
    expect(receipt).toMatchObject({
      editor_revision_run_id: created.body.run_id,
      task_status: 'resolved',
    })

    const replay = await callRoute(updateTask, {
      params: { id: String(sourceRun.id), taskIndex: '0' },
      body: {
        project_id: fixture.project.id,
        status: 'resolved',
        note: 'first committed response',
        editor_revision_run_id: created.body.run_id,
      },
    })
    expect(replay.statusCode).toBe(200)
    expect(replay.body.task).toEqual(firstTask)
    const conflict = await callRoute(updateTask, {
      params: { id: String(sourceRun.id), taskIndex: '0' },
      body: {
        project_id: fixture.project.id,
        status: 'needs_review',
        note: 'conflicting replay',
        editor_revision_run_id: created.body.run_id,
      },
    })
    expect(conflict.statusCode).toBe(409)
    expect(conflict.body).toMatchObject({ error_code: 'EDITOR_REVISION_TASK_CLOSURE_CONFLICT' })
    const stored = (await listNovelRuns(fixture.workspace, fixture.project.id)).find(run => run.id === sourceRun.id)!
    expect(JSON.parse(String(stored.output_ref || '{}')).tasks[0]).toEqual(firstTask)

    const manualChange = await callRoute(updateTask, {
      params: { id: String(sourceRun.id), taskIndex: '0' },
      body: {
        project_id: fixture.project.id,
        status: 'needs_review',
        note: 'manual review reopened the task',
      },
    })
    expect(manualChange.statusCode).toBe(200)
    const staleReplay = await callRoute(updateTask, {
      params: { id: String(sourceRun.id), taskIndex: '0' },
      body: {
        project_id: fixture.project.id,
        status: 'resolved',
        note: 'first committed response',
        editor_revision_run_id: created.body.run_id,
      },
    })
    expect(staleReplay.statusCode).toBe(409)
    expect(staleReplay.body).toMatchObject({ error_code: 'EDITOR_REVISION_TASK_CLOSURE_CONFLICT' })
  })

  test('rejects acknowledgement when a bulk update changes the current task note but preserves its receipt', async () => {
    const fixture = await createAsyncRevisionRouteFixture()
    const sourceTask = { title: '关闭章末风险', task_status: 'open' }
    const sourceRun = await appendNovelRun(fixture.workspace, {
      project_id: fixture.project.id,
      run_type: 'longform_production_repair',
      step_name: 'bulk-note-drift-repair-task',
      status: 'ready',
      output_ref: JSON.stringify({ tasks: [sourceTask] }),
    })
    const applyRevision = fixture.handlers.get('POST /api/novel/reviews/:reviewId/apply-revision')
    const created = await callRoute(applyRevision, {
      params: { reviewId: String(fixture.review.id) },
      body: {
        project_id: fixture.project.id,
        chapter_id: fixture.chapter.id,
        repair_task_link: { run_id: sourceRun.id, task_index: 0, task: sourceTask },
      },
    })
    await updateNovelRun(fixture.workspace, created.body.run_id, {
      status: 'completed',
      output_ref: JSON.stringify(completedRevisionCheckpoint()),
    })
    const updateTask = fixture.handlers.get('POST /api/novel/runs/:id/tasks/:taskIndex/status')
    const taskClosure = await callRoute(updateTask, {
      params: { id: String(sourceRun.id), taskIndex: '0' },
      body: {
        project_id: fixture.project.id,
        status: 'resolved',
        note: 'durable receipt note',
        editor_revision_run_id: created.body.run_id,
      },
    })
    expect(taskClosure.statusCode).toBe(200)
    const bulkUpdate = fixture.handlers.get('POST /api/novel/runs/:id/tasks/status-bulk')
    const drifted = await callRoute(bulkUpdate, {
      params: { id: String(sourceRun.id) },
      body: {
        project_id: fixture.project.id,
        task_indices: [0],
        status: 'resolved',
        note: 'bulk changed note',
      },
    })
    expect(drifted.statusCode).toBe(200)
    expect(drifted.body.task_status_summary).toMatchObject({ resolved: 1 })
    const storedTask = JSON.parse(String((await listNovelRuns(fixture.workspace, fixture.project.id))
      .find(run => run.id === sourceRun.id)?.output_ref || '{}')).tasks[0]
    expect(storedTask).toMatchObject({
      task_status: 'resolved',
      status_note: 'bulk changed note',
      editor_revision_closure_receipts: {
        [String(created.body.run_id)]: { note: 'durable receipt note' },
      },
    })

    const acknowledge = fixture.handlers.get('POST /api/novel/editor-revisions/:runId/linked-task-closure')
    const revisionBefore = (await listNovelRuns(fixture.workspace, fixture.project.id))
      .find(run => run.id === created.body.run_id)
    const rejected = await callRoute(acknowledge, {
      params: { runId: String(created.body.run_id) },
      body: { project_id: fixture.project.id },
    })
    expect(rejected.statusCode).toBe(409)
    expect(rejected.body).toMatchObject({ error_code: 'REVISION_LINKED_TASK_CLOSURE_NOT_READY' })
    expect((await listNovelRuns(fixture.workspace, fixture.project.id))
      .find(run => run.id === created.body.run_id)).toEqual(revisionBefore)
  })

  test('upserts one stable annotation receipt when the committed response is replayed', async () => {
    const fixture = await createAsyncRevisionRouteFixture()
    const annotationKey = 'reader_payoff_sync:12:chapter_hook:durable'
    const sourceTask = {
      title: '关闭读者回报风险',
      task_status: 'open',
      source: 'review_annotation_risk',
      annotation_key: annotationKey,
    }
    const sourceRun = await appendNovelRun(fixture.workspace, {
      project_id: fixture.project.id,
      run_type: 'longform_production_repair',
      step_name: 'annotation-linked-repair-task',
      status: 'ready',
      output_ref: JSON.stringify({ tasks: [sourceTask] }),
    })
    const applyRevision = fixture.handlers.get('POST /api/novel/reviews/:reviewId/apply-revision')
    const created = await callRoute(applyRevision, {
      params: { reviewId: String(fixture.review.id) },
      body: {
        project_id: fixture.project.id,
        chapter_id: fixture.chapter.id,
        repair_task_link: { run_id: sourceRun.id, task_index: 0, task: sourceTask },
      },
    })
    await updateNovelRun(fixture.workspace, created.body.run_id, {
      status: 'completed',
      output_ref: JSON.stringify(completedRevisionCheckpoint()),
    })
    const updateTask = fixture.handlers.get('POST /api/novel/runs/:id/tasks/:taskIndex/status')
    await callRoute(updateTask, {
      params: { id: String(sourceRun.id), taskIndex: '0' },
      body: {
        project_id: fixture.project.id,
        status: 'resolved',
        note: 'first annotation closure',
        editor_revision_run_id: created.body.run_id,
        annotation_key: annotationKey,
        annotation_status: 'resolved',
      },
    })
    const updateAnnotation = fixture.handlers.get('POST /api/novel/projects/:id/review-annotations/status')
    const first = await callRoute(updateAnnotation, {
      params: { id: String(fixture.project.id) },
      body: {
        annotation_key: annotationKey,
        status: 'resolved',
        note: 'first annotation closure',
        editor_revision_run_id: created.body.run_id,
      },
    })
    const replay = await callRoute(updateAnnotation, {
      params: { id: String(fixture.project.id) },
      body: {
        annotation_key: annotationKey,
        status: 'resolved',
        note: 'first annotation closure',
        editor_revision_run_id: created.body.run_id,
      },
    })

    expect(first.statusCode).toBe(200)
    expect(replay.statusCode).toBe(200)
    expect(replay.body.status).toEqual(first.body.status)
    const conflict = await callRoute(updateAnnotation, {
      params: { id: String(fixture.project.id) },
      body: {
        annotation_key: annotationKey,
        status: 'open',
        note: 'conflicting annotation replay',
        editor_revision_run_id: created.body.run_id,
      },
    })
    expect(conflict.statusCode).toBe(409)
    expect(conflict.body).toMatchObject({ error_code: 'REVISION_ANNOTATION_STATUS_CONFLICT' })
    const differentKey = await callRoute(updateAnnotation, {
      params: { id: String(fixture.project.id) },
      body: {
        annotation_key: `${annotationKey}:different`,
        status: 'resolved',
        note: 'first annotation closure',
        editor_revision_run_id: created.body.run_id,
      },
    })
    expect(differentKey.statusCode).toBe(409)
    expect(differentKey.body).toMatchObject({ error_code: 'REVISION_ANNOTATION_STATUS_CONFLICT' })
    const receipts = (await listNovelReviews(fixture.workspace, fixture.project.id))
      .filter(review => {
        if (review.review_type !== 'review_annotation_status') return false
        const payload = JSON.parse(String(review.payload || '{}'))
        return payload.editor_revision_run_id === created.body.run_id
      })
    expect(receipts).toHaveLength(1)
  })

  test('rejects resolved editor-revision task closure when the durable task annotation is omitted', async () => {
    const fixture = await createAsyncRevisionRouteFixture()
    const annotationKey = 'reader_payoff_sync:12:required-by-task'
    const sourceTask = {
      title: '关闭必须同步的批注',
      task_status: 'open',
      source: 'review_annotation_risk',
      annotation_key: annotationKey,
    }
    const sourceRun = await appendNovelRun(fixture.workspace, {
      project_id: fixture.project.id,
      run_type: 'longform_production_repair',
      step_name: 'annotation-required-repair-task',
      status: 'ready',
      output_ref: JSON.stringify({ tasks: [sourceTask] }),
    })
    const applyRevision = fixture.handlers.get('POST /api/novel/reviews/:reviewId/apply-revision')
    const created = await callRoute(applyRevision, {
      params: { reviewId: String(fixture.review.id) },
      body: {
        project_id: fixture.project.id,
        chapter_id: fixture.chapter.id,
        repair_task_link: { run_id: sourceRun.id, task_index: 0, task: sourceTask },
      },
    })
    await updateNovelRun(fixture.workspace, created.body.run_id, {
      status: 'completed',
      output_ref: JSON.stringify(completedRevisionCheckpoint()),
    })
    const updateTask = fixture.handlers.get('POST /api/novel/runs/:id/tasks/:taskIndex/status')
    const omitted = await callRoute(updateTask, {
      params: { id: String(sourceRun.id), taskIndex: '0' },
      body: {
        project_id: fixture.project.id,
        status: 'resolved',
        note: 'annotation fields omitted',
        editor_revision_run_id: created.body.run_id,
      },
    })

    expect(omitted.statusCode).toBe(409)
    expect(omitted.body).toMatchObject({ error_code: 'EDITOR_REVISION_TASK_CLOSURE_INVALID' })
    const storedTask = JSON.parse(String((await listNovelRuns(fixture.workspace, fixture.project.id))
      .find(run => run.id === sourceRun.id)?.output_ref || '{}')).tasks[0]
    expect(storedTask).toEqual(sourceTask)
  })

  test('rejects acknowledgement when a resolved durable annotation task has a legacy receipt without annotation fields', async () => {
    const fixture = await createAsyncRevisionRouteFixture()
    const annotationKey = 'reader_payoff_sync:12:legacy-ack-receipt'
    const closureNote = 'legacy closure omitted annotation fields'
    const sourceTask = {
      title: '关闭历史批注风险',
      task_status: 'open',
      source: 'review_annotation_risk',
      annotation_key: annotationKey,
    }
    const sourceRun = await appendNovelRun(fixture.workspace, {
      project_id: fixture.project.id,
      run_type: 'longform_production_repair',
      step_name: 'legacy-annotation-receipt-repair-task',
      status: 'ready',
      output_ref: JSON.stringify({ tasks: [sourceTask] }),
    })
    const applyRevision = fixture.handlers.get('POST /api/novel/reviews/:reviewId/apply-revision')
    const created = await callRoute(applyRevision, {
      params: { reviewId: String(fixture.review.id) },
      body: {
        project_id: fixture.project.id,
        chapter_id: fixture.chapter.id,
        repair_task_link: { run_id: sourceRun.id, task_index: 0, task: sourceTask },
      },
    })
    await updateNovelRun(fixture.workspace, created.body.run_id, {
      status: 'completed',
      output_ref: JSON.stringify(completedRevisionCheckpoint()),
    })
    await updateNovelRun(fixture.workspace, sourceRun.id, {
      output_ref: JSON.stringify({
        tasks: [{
          ...sourceTask,
          task_status: 'resolved',
          status_note: closureNote,
          editor_revision_closure_receipts: {
            [String(created.body.run_id)]: {
              editor_revision_run_id: created.body.run_id,
              repair_run_id: sourceRun.id,
              task_index: 0,
              task_status: 'resolved',
              note: closureNote,
              completed_at: '2026-07-29T00:00:00.000Z',
            },
          },
        }],
      }),
    })

    const acknowledge = fixture.handlers.get('POST /api/novel/editor-revisions/:runId/linked-task-closure')
    const revisionBefore = (await listNovelRuns(fixture.workspace, fixture.project.id))
      .find(run => run.id === created.body.run_id)
    const rejected = await callRoute(acknowledge, {
      params: { runId: String(created.body.run_id) },
      body: { project_id: fixture.project.id },
    })

    expect(rejected.statusCode).toBe(409)
    expect(rejected.body).toMatchObject({ error_code: 'REVISION_LINKED_TASK_CLOSURE_NOT_READY' })
    expect((await listNovelRuns(fixture.workspace, fixture.project.id))
      .find(run => run.id === created.body.run_id)).toEqual(revisionBefore)
  })

  test('requires the durable annotation receipt before acknowledgement and replays a legal acknowledgement', async () => {
    const fixture = await createAsyncRevisionRouteFixture()
    const annotationKey = 'reader_payoff_sync:12:ack-gate'
    const sourceTask = {
      title: '关闭读者回报风险',
      task_status: 'open',
      source: 'review_annotation_risk',
      annotation_key: annotationKey,
    }
    const sourceRun = await appendNovelRun(fixture.workspace, {
      project_id: fixture.project.id,
      run_type: 'longform_production_repair',
      step_name: 'ack-gated-repair-task',
      status: 'ready',
      output_ref: JSON.stringify({ tasks: [sourceTask] }),
    })
    const applyRevision = fixture.handlers.get('POST /api/novel/reviews/:reviewId/apply-revision')
    const created = await callRoute(applyRevision, {
      params: { reviewId: String(fixture.review.id) },
      body: {
        project_id: fixture.project.id,
        chapter_id: fixture.chapter.id,
        repair_task_link: { run_id: sourceRun.id, task_index: 0, task: sourceTask },
      },
    })
    await updateNovelRun(fixture.workspace, created.body.run_id, {
      status: 'completed',
      output_ref: JSON.stringify(completedRevisionCheckpoint()),
    })
    const updateTask = fixture.handlers.get('POST /api/novel/runs/:id/tasks/:taskIndex/status')
    await callRoute(updateTask, {
      params: { id: String(sourceRun.id), taskIndex: '0' },
      body: {
        project_id: fixture.project.id,
        status: 'resolved',
        note: 'durable closure',
        editor_revision_run_id: created.body.run_id,
        annotation_key: annotationKey,
        annotation_status: 'resolved',
      },
    })
    const acknowledge = fixture.handlers.get('POST /api/novel/editor-revisions/:runId/linked-task-closure')
    const revisionBefore = (await listNovelRuns(fixture.workspace, fixture.project.id))
      .find(run => run.id === created.body.run_id)
    const premature = await callRoute(acknowledge, {
      params: { runId: String(created.body.run_id) },
      body: { project_id: fixture.project.id },
    })
    expect(premature.statusCode).toBe(409)
    expect(premature.body).toMatchObject({ error_code: 'REVISION_LINKED_TASK_CLOSURE_NOT_READY' })
    expect((await listNovelRuns(fixture.workspace, fixture.project.id))
      .find(run => run.id === created.body.run_id)).toEqual(revisionBefore)

    const updateAnnotation = fixture.handlers.get('POST /api/novel/projects/:id/review-annotations/status')
    await callRoute(updateAnnotation, {
      params: { id: String(fixture.project.id) },
      body: {
        annotation_key: annotationKey,
        status: 'resolved',
        note: 'durable closure',
        editor_revision_run_id: created.body.run_id,
      },
    })
    const completed = await callRoute(acknowledge, {
      params: { runId: String(created.body.run_id) },
      body: { project_id: fixture.project.id },
    })
    expect(completed.statusCode).toBe(200)
    expect(completed.body.run.linked_task_closure).toMatchObject({ status: 'completed' })
    const replay = await callRoute(acknowledge, {
      params: { runId: String(created.body.run_id) },
      body: { project_id: fixture.project.id },
    })
    expect(replay.statusCode).toBe(200)
    expect(replay.body.run).toEqual(completed.body.run)
  })

  test('rejects acknowledgement when task and annotation receipts commit different notes', async () => {
    const fixture = await createAsyncRevisionRouteFixture()
    const annotationKey = 'reader_payoff_sync:12:ack-note-conflict'
    const sourceTask = {
      title: '关闭批注说明冲突',
      task_status: 'open',
      source: 'review_annotation_risk',
      annotation_key: annotationKey,
    }
    const sourceRun = await appendNovelRun(fixture.workspace, {
      project_id: fixture.project.id,
      run_type: 'longform_production_repair',
      step_name: 'ack-note-conflict-repair-task',
      status: 'ready',
      output_ref: JSON.stringify({ tasks: [sourceTask] }),
    })
    const applyRevision = fixture.handlers.get('POST /api/novel/reviews/:reviewId/apply-revision')
    const created = await callRoute(applyRevision, {
      params: { reviewId: String(fixture.review.id) },
      body: {
        project_id: fixture.project.id,
        chapter_id: fixture.chapter.id,
        repair_task_link: { run_id: sourceRun.id, task_index: 0, task: sourceTask },
      },
    })
    await updateNovelRun(fixture.workspace, created.body.run_id, {
      status: 'completed',
      output_ref: JSON.stringify(completedRevisionCheckpoint()),
    })
    const updateTask = fixture.handlers.get('POST /api/novel/runs/:id/tasks/:taskIndex/status')
    const taskClosure = await callRoute(updateTask, {
      params: { id: String(sourceRun.id), taskIndex: '0' },
      body: {
        project_id: fixture.project.id,
        status: 'resolved',
        note: 'task receipt note',
        editor_revision_run_id: created.body.run_id,
        annotation_key: annotationKey,
        annotation_status: 'resolved',
      },
    })
    expect(taskClosure.statusCode).toBe(200)
    const updateAnnotation = fixture.handlers.get('POST /api/novel/projects/:id/review-annotations/status')
    const annotationClosure = await callRoute(updateAnnotation, {
      params: { id: String(fixture.project.id) },
      body: {
        annotation_key: annotationKey,
        status: 'resolved',
        note: 'different annotation note',
        editor_revision_run_id: created.body.run_id,
      },
    })
    expect(annotationClosure.statusCode).toBe(200)

    const acknowledge = fixture.handlers.get('POST /api/novel/editor-revisions/:runId/linked-task-closure')
    const revisionBefore = (await listNovelRuns(fixture.workspace, fixture.project.id))
      .find(run => run.id === created.body.run_id)
    const rejected = await callRoute(acknowledge, {
      params: { runId: String(created.body.run_id) },
      body: { project_id: fixture.project.id },
    })
    expect(rejected.statusCode).toBe(409)
    expect(rejected.body).toMatchObject({ error_code: 'REVISION_LINKED_TASK_CLOSURE_NOT_READY' })
    expect((await listNovelRuns(fixture.workspace, fixture.project.id))
      .find(run => run.id === created.body.run_id)).toEqual(revisionBefore)
  })

  test('validates project, review, chapter ownership, and immutable source before creating a run', async () => {
    const fixture = await createAsyncRevisionRouteFixture()
    const applyRevision = fixture.handlers.get('POST /api/novel/reviews/:reviewId/apply-revision')

    const crossProjectReview = await callRoute(applyRevision, {
      params: { reviewId: String(fixture.otherReview.id) },
      body: { project_id: fixture.project.id, chapter_id: fixture.chapter.id },
    })
    expect(crossProjectReview.statusCode).toBe(404)
    expect(crossProjectReview.body).toEqual({ error: 'review not found' })

    const mismatchedChapter = await callRoute(applyRevision, {
      params: { reviewId: String(fixture.review.id) },
      body: { project_id: fixture.project.id, chapter_id: fixture.otherChapter.id },
    })
    expect(mismatchedChapter.statusCode).toBe(400)
    expect(mismatchedChapter.body).toMatchObject({ error_code: 'REVISION_REVIEW_CHAPTER_MISMATCH' })

    const emptyChapter = await createNovelChapter(fixture.workspace, {
      project_id: fixture.project.id,
      chapter_no: 14,
      title: '空正文',
      chapter_text: '',
    })
    const emptyReview = await createNovelReview(fixture.workspace, {
      project_id: fixture.project.id,
      review_type: 'prose_quality',
      payload: JSON.stringify({ chapter_id: emptyChapter.id, report: { must_fix: ['fill'] } }),
    })
    const emptySource = await callRoute(applyRevision, {
      params: { reviewId: String(emptyReview.id) },
      body: { project_id: fixture.project.id, chapter_id: emptyChapter.id },
    })
    expect(emptySource.statusCode).toBe(400)
    expect(emptySource.body).toMatchObject({ error_code: 'REVISION_SOURCE_TEXT_REQUIRED' })
    expect(await listNovelRuns(fixture.workspace, fixture.project.id)).toHaveLength(0)
    expect(fixture.revisionAgentCalls).toBe(0)
    expect(fixture.enqueued).toEqual([])
  })

  test('enforces ownership for status/diagnostics and persists cancel before aborting the worker', async () => {
    const fixture = await createAsyncRevisionRouteFixture()
    const applyRevision = fixture.handlers.get('POST /api/novel/reviews/:reviewId/apply-revision')
    const created = await callRoute(applyRevision, {
      params: { reviewId: String(fixture.review.id) },
      body: { project_id: fixture.project.id, chapter_id: fixture.chapter.id },
    })
    const runId = created.body.run_id
    const statusRoute = fixture.handlers.get('GET /api/novel/editor-revisions/:runId')
    const diagnosticsRoute = fixture.handlers.get('GET /api/novel/editor-revisions/:runId/diagnostics')
    const cancelRoute = fixture.handlers.get('POST /api/novel/editor-revisions/:runId/cancel')

    const owned = await callRoute(statusRoute, {
      params: { runId: String(runId) },
      query: { project_id: String(fixture.project.id) },
    })
    expect(owned.statusCode).toBe(200)
    expect(owned.body).toMatchObject({ id: runId, chapter_id: fixture.chapter.id, status: 'queued', progress: null })
    expect(JSON.stringify(owned.body)).not.toContain('input_ref')
    expect(JSON.stringify(owned.body)).not.toContain('output_ref')

    for (const handler of [statusRoute, diagnosticsRoute]) {
      const hidden = await callRoute(handler, {
        params: { runId: String(runId) },
        query: { project_id: String(fixture.otherProject.id) },
      })
      expect(hidden.statusCode).toBe(404)
      expect(hidden.body).toEqual({ error: 'editor revision not found' })
    }

    const missingProject = await callRoute(cancelRoute, { params: { runId: String(runId) } })
    expect(missingProject.statusCode).toBe(400)
    expect(missingProject.body).toMatchObject({ error_code: 'PROJECT_ID_REQUIRED' })

    const canceled = await callRoute(cancelRoute, {
      params: { runId: String(runId) },
      body: { project_id: fixture.project.id },
    })
    expect(canceled.statusCode).toBe(200)
    expect(canceled.body).toMatchObject({
      ok: true,
      action: 'cancel',
      run: { id: runId, status: 'cancel_requested', can_cancel: false },
    })
    expect(fixture.canceled).toEqual([{ runId, persistedStatus: 'cancel_requested' }])
  })

  test('retries or continues the same run id and rejects restart-required failures', async () => {
    const fixture = await createAsyncRevisionRouteFixture()
    const applyRevision = fixture.handlers.get('POST /api/novel/reviews/:reviewId/apply-revision')
    const retryRoute = fixture.handlers.get('POST /api/novel/editor-revisions/:runId/retry')
    const created = await callRoute(applyRevision, {
      params: { reviewId: String(fixture.review.id) },
      body: { project_id: fixture.project.id, chapter_id: fixture.chapter.id },
    })
    const runId = created.body.run_id

    await updateNovelRun(fixture.workspace, runId, {
      status: 'failed',
      output_ref: JSON.stringify(failedRevisionCheckpoint('PROVIDER_FAILED')),
      error_message: 'PROVIDER_FAILED',
    })
    const retried = await callRoute(retryRoute, {
      params: { runId: String(runId) },
      body: { project_id: fixture.project.id },
    })
    expect(retried.statusCode).toBe(200)
    expect(retried.body).toMatchObject({ ok: true, action: 'retry', run: { id: runId, status: 'queued' } })

    await updateNovelRun(fixture.workspace, runId, {
      status: 'failed',
      output_ref: JSON.stringify(failedRevisionCheckpoint('QUALITY_FAILED', { prosePersisted: true })),
      error_message: 'QUALITY_FAILED',
    })
    const continued = await callRoute(retryRoute, {
      params: { runId: String(runId) },
      query: { project_id: String(fixture.project.id) },
    })
    expect(continued.statusCode).toBe(200)
    expect(continued.body).toMatchObject({ ok: true, action: 'continue', run: { id: runId, status: 'queued' } })

    await updateNovelRun(fixture.workspace, runId, {
      status: 'failed',
      output_ref: JSON.stringify(failedRevisionCheckpoint('SOURCE_VERSION_CHANGED')),
      error_message: 'SOURCE_VERSION_CHANGED',
    })
    const restartRequired = await callRoute(retryRoute, {
      params: { runId: String(runId) },
      body: { project_id: fixture.project.id },
    })
    expect(restartRequired.statusCode).toBe(409)
    expect(restartRequired.body).toMatchObject({ error_code: 'REVISION_RESTART_REQUIRED' })
    expect(fixture.enqueued).toEqual([runId, runId, runId])
  })

  test.each([
    {
      label: 'malformed immutable input',
      corrupt: (db: ReturnType<typeof openDb>, runId: number) => {
        const row = db.query('SELECT input_ref FROM runs WHERE id = ?').get(runId) as any
        const input = JSON.parse(String(row?.input_ref || '{}'))
        input.source_text_hash = revisionTextHash(`${ROUTE_SOURCE_TEXT}已损坏`)
        db.query('UPDATE runs SET input_ref = ? WHERE id = ?').run(JSON.stringify(input), runId)
      },
    },
    {
      label: 'mismatched chapter scope',
      corrupt: (db: ReturnType<typeof openDb>, runId: number) => {
        db.query('UPDATE runs SET scope_key = ? WHERE id = ?').run('chapter:999999', runId)
      },
    },
  ])('rejects retry for $label before mutating the durable run', async ({ corrupt }) => {
    const fixture = await createAsyncRevisionRouteFixture()
    const applyRevision = fixture.handlers.get('POST /api/novel/reviews/:reviewId/apply-revision')
    const retryRoute = fixture.handlers.get('POST /api/novel/editor-revisions/:runId/retry')
    const created = await callRoute(applyRevision, {
      params: { reviewId: String(fixture.review.id) },
      body: { project_id: fixture.project.id, chapter_id: fixture.chapter.id },
    })
    const runId = created.body.run_id
    const failedCheckpoint = failedRevisionCheckpoint('PROVIDER_FAILED')
    await updateNovelRun(fixture.workspace, runId, {
      status: 'failed',
      output_ref: JSON.stringify(failedCheckpoint),
      error_message: 'PROVIDER_FAILED',
    })
    const db = openDb(fixture.workspace)
    try {
      corrupt(db, runId)
    } finally {
      db.close()
    }

    const response = await callRoute(retryRoute, {
      params: { runId: String(runId) },
      body: { project_id: fixture.project.id },
    })

    expect(response.statusCode).toBe(409)
    expect(response.body).toMatchObject({ error_code: 'REVISION_ACTION_NOT_ALLOWED' })
    const persisted = (await listNovelRuns(fixture.workspace, fixture.project.id)).find(run => run.id === runId)
    expect(persisted).toMatchObject({
      id: runId,
      status: 'failed',
      output_ref: JSON.stringify(failedCheckpoint),
      error_message: 'PROVIDER_FAILED',
    })
    expect(fixture.enqueued).toEqual([runId])
  })

  test('returns durable retry success when worker enqueue notification fails', async () => {
    const fixture = await createAsyncRevisionRouteFixture()
    const applyRevision = fixture.handlers.get('POST /api/novel/reviews/:reviewId/apply-revision')
    const retryRoute = fixture.handlers.get('POST /api/novel/editor-revisions/:runId/retry')
    const created = await callRoute(applyRevision, {
      params: { reviewId: String(fixture.review.id) },
      body: { project_id: fixture.project.id, chapter_id: fixture.chapter.id },
    })
    const runId = created.body.run_id
    await updateNovelRun(fixture.workspace, runId, {
      status: 'failed',
      output_ref: JSON.stringify(failedRevisionCheckpoint('PROVIDER_FAILED')),
      error_message: 'PROVIDER_FAILED',
    })
    fixture.failEnqueue(new Error('in-memory worker notification failed'))

    const response = await callRoute(retryRoute, {
      params: { runId: String(runId) },
      body: { project_id: fixture.project.id },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({
      ok: true,
      action: 'retry',
      run: { id: runId, status: 'queued', can_cancel: true },
    })
    expect((await listNovelRuns(fixture.workspace, fixture.project.id)).find(run => run.id === runId)).toMatchObject({
      id: runId,
      status: 'queued',
      error_message: '',
    })
    expect(fixture.enqueued).toEqual([runId])
  })

  test('authorizes diagnostics while generic runs and project tasks use the redacted projection', async () => {
    const fixture = await createAsyncRevisionRouteFixture()
    const applyRevision = fixture.handlers.get('POST /api/novel/reviews/:reviewId/apply-revision')
    const created = await callRoute(applyRevision, {
      params: { reviewId: String(fixture.review.id) },
      body: {
        project_id: fixture.project.id,
        chapter_id: fixture.chapter.id,
        prompt: ROUTE_USER_PROMPT,
      },
    })
    const runId = created.body.run_id
    const failed = failedRevisionCheckpoint('REVISION_CANDIDATE_TOO_SHORT', {
      diagnostics: {
        rejected_candidate: {
          text: ROUTE_CANDIDATE_TEXT,
          hash: revisionTextHash(ROUTE_CANDIDATE_TEXT),
          char_count: ROUTE_CANDIDATE_TEXT.replace(/\s/g, '').length,
        },
        finish_reason: 'max_tokens',
        provider_result_ref: 'provider-result://route-redaction',
        source_text: ROUTE_SOURCE_TEXT,
        context_package: ROUTE_CONTEXT_SECRET,
      },
    })
    failed.phase = 'admit_candidate'
    failed.phases.generate_candidate = {
      status: 'completed',
      attempt: 1,
      summary: {
        diagnostics: {
          finish_reason: 'max_tokens',
          content_preview: '候选预览',
          provider_result_ref: 'provider-result://route-redaction',
        },
      },
    }
    failed.phases.admit_candidate = {
      status: 'failed',
      attempt: 1,
      error_code: 'REVISION_CANDIDATE_TOO_SHORT',
      error: 'candidate too short',
    }
    failed.error = {
      code: 'REVISION_CANDIDATE_TOO_SHORT',
      message: 'candidate too short',
      diagnostics: (failed.error as any).diagnostics,
    }
    await updateNovelRun(fixture.workspace, runId, {
      status: 'failed',
      output_ref: JSON.stringify(failed),
      error_message: 'REVISION_CANDIDATE_TOO_SHORT',
    })

    const diagnosticsRoute = fixture.handlers.get('GET /api/novel/editor-revisions/:runId/diagnostics')
    const diagnostics = await callRoute(diagnosticsRoute, {
      params: { runId: String(runId) },
      query: { project_id: String(fixture.project.id) },
    })
    expect(diagnostics.statusCode).toBe(200)
    expect(diagnostics.body).toMatchObject({
      ok: true,
      diagnostics: {
        id: runId,
        rejected_candidate: { text: ROUTE_CANDIDATE_TEXT },
        generation: { provider_result_ref: 'provider-result://route-redaction' },
      },
    })
    expect(JSON.stringify(diagnostics.body)).not.toContain(ROUTE_SOURCE_TEXT)
    expect(JSON.stringify(diagnostics.body)).not.toContain(ROUTE_CONTEXT_SECRET)

    const genericCheckpoint = admittedRevisionCheckpoint()
    ;(genericCheckpoint as any).linked_task_closure = {
      status: 'pending',
      task: { secret: ROUTE_CLOSURE_SECRET },
      arbitrary: ROUTE_CLOSURE_SECRET,
    }
    await updateNovelRun(fixture.workspace, runId, {
      status: 'running',
      output_ref: JSON.stringify(genericCheckpoint),
      error_message: '',
    })
    const ordinary = await appendNovelRun(fixture.workspace, {
      project_id: fixture.project.id,
      run_type: 'quality_benchmark',
      step_name: 'ordinary',
      status: 'completed',
      input_ref: 'ordinary-input-ref',
      output_ref: 'ordinary-output-ref',
    })
    const runsRoute = fixture.handlers.get('GET /api/novel/runs')
    const detailRoute = fixture.handlers.get('GET /api/novel/runs/:id')
    const tasksRoute = fixture.handlers.get('GET /api/novel/projects/:id/tasks')
    const pauseRoute = fixture.handlers.get('POST /api/novel/runs/:id/pause')
    const resumeRoute = fixture.handlers.get('POST /api/novel/runs/:id/resume')

    const full = await callRoute(runsRoute, { query: { project_id: String(fixture.project.id) } })
    const summary = await callRoute(runsRoute, { query: { project_id: String(fixture.project.id), view: 'summary' } })
    const detail = await callRoute(detailRoute, {
      params: { id: String(runId) },
      query: { project_id: String(fixture.project.id) },
    })
    const tasks = await callRoute(tasksRoute, { params: { id: String(fixture.project.id) } })
    const fullRevision = full.body.find((item: any) => item.id === runId)
    const summaryRevision = summary.body.find((item: any) => item.id === runId)
    const task = tasks.body.tasks.find((item: any) => item.id === runId)
    for (const response of [fullRevision, summaryRevision, detail.body, task]) {
      const serialized = JSON.stringify(response)
      for (const secret of [ROUTE_SOURCE_TEXT, ROUTE_CANDIDATE_TEXT, ROUTE_CONTEXT_SECRET, ROUTE_USER_PROMPT, ROUTE_CLOSURE_SECRET, 'input_ref', 'output_ref']) {
        expect(serialized).not.toContain(secret)
      }
    }
    expect(full.body.find((item: any) => item.id === ordinary.id)).toMatchObject({
      input_ref: 'ordinary-input-ref',
      output_ref: 'ordinary-output-ref',
    })
    expect(task).toMatchObject({
      id: runId,
      run_type: 'editor_revision',
      type_label: '单章修订',
      step_name: '第12章 门后名单',
      phase: 'admit_candidate',
      phase_label: '安全检查',
      progress: null,
    })
    expect(tasks.body.active.map((item: any) => item.id)).toContain(runId)

    for (const [handler, action] of [[pauseRoute, 'pause'], [resumeRoute, 'resume']] as const) {
      const response = await callRoute(handler, {
        params: { id: String(runId) },
        body: { project_id: fixture.project.id },
      })
      expect(response.statusCode).toBe(400)
      expect(response.body).toMatchObject({ error_code: 'EDITOR_REVISION_ACTION_REQUIRED', action })
      expect(JSON.stringify(response.body)).not.toContain(ROUTE_CANDIDATE_TEXT)
    }
  })
})

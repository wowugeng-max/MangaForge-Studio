import { afterEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { rm } from 'fs/promises'
import { join } from 'path'
import {
  createNovelChapter,
  createNovelProject,
  getNovelProject,
  listNovelReviews,
} from '../novel'
import { tempWorkspace, workspaces } from '../novel/test-utils'
import { registerNovelEditorQualityRoutes } from './novel-editor/register-quality'
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

function createRouteHarness() {
  const handlers = new Map<string, any>()
  const app: any = {
    get(path: string, handler: any) {
      handlers.set(`GET ${path}`, handler)
      return app
    },
    post(path: string, handler: any) {
      handlers.set(`POST ${path}`, handler)
      return app
    },
  }
  return { app, handlers }
}

async function callRoute(handler: any, req: any) {
  const res: any = {
    statusCode: 200,
    body: null,
    jsonCalls: [] as any[],
    status(code: number) { this.statusCode = code; return this },
    json(body: any) { this.body = body; this.jsonCalls.push(body); return this },
  }
  await handler(req, res)
  return res
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
describe('buildChapterQualityCard', () => {
  test('marks a chapter below the configured word target as needing expansion', () => {
    const card = buildChapterQualityCard({
      id: 7,
      chapter_no: 3,
      title: '短章测试',
      chapter_goal: '完成一次规则冲突。',
      chapter_summary: '主角破解初始规则。',
      conflict: '规则即将惩罚主角。',
      ending_hook: '门后传来第二条规则。',
      chapter_text: '字'.repeat(1483),
      scene_breakdown: [{ scene_no: 1 }, { scene_no: 2 }],
    }, {
      chapter_target: {
        word_target: {
          mode: 'standard',
          label: '标准章',
          target: 3000,
          min: 2800,
          max: 3500,
          rangeText: '2800-3500 字',
        },
      },
      preflight: {
        checks: [
          { key: 'previous_continuity', ok: true },
          { key: 'characters', ok: true },
          { key: 'character_state', ok: true },
        ],
        warnings: [],
      },
      continuity: { previous_chapter: { chapter_no: 2 } },
      story_state: { characters: [{ name: '主角' }], global: {} },
    }, [])

    const wordTargetDimension = card.dimensions.find((item: any) => item.key === 'word_target')

    expect(card.word_count).toBe(1483)
    expect(wordTargetDimension?.score).toBeLessThan(65)
    expect(wordTargetDimension?.evidence).toContain('目标 2800-3500 字')
    expect(card.must_fix.some((item: string) => item.includes('扩写'))).toBe(true)
    expect(card.next_actions.some((item: string) => item.includes('目标字数'))).toBe(true)
  })

  test('manual prose quality uses one chapter task for manual_recheck and closes after durable review persistence', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '人工质检统一来源', reference_config: {} })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '服务端当前正文用于人工质检。',
    })
    const contextPackage = { chapter_target: { chapter_id: chapter.id }, complete: true }
    const beginInputs: any[] = []
    const stages: any[] = []
    const closeOutcomes: any[] = []
    const persistedReviewCountsAtClose: number[] = []
    let buildContextCalls = 0
    let fallbackCalls = 0
    const execution: any = {
      taskId: 'manual-quality-task',
      source: 'mcp',
      fingerprint: 'quality-fingerprint',
      contextVersion: 'quality-context',
      provenance: () => ({}),
      generateDraft: async () => { throw new Error('not used') },
      assertCurrent: async () => {},
      executeAgent: async (stage: string, responseContract: string) => {
        stages.push({ stage, responseContract })
        return {
          parsed: { passed: true, score: 93, issues: [], revision_directives: [] },
          finish_reason: 'stop',
        }
      },
      close: async (outcome: any) => {
        closeOutcomes.push(outcome)
        persistedReviewCountsAtClose.push((await listNovelReviews(workspace, project.id))
          .filter(item => item.review_type === 'prose_quality').length)
      },
    }
    const { app, handlers } = createRouteHarness()
    registerNovelEditorQualityRoutes(app, {
      getWorkspace: () => workspace,
      getProject: (_activeWorkspace: string, id: number) => getNovelProject(workspace, id),
      getStageModelId: () => 217,
      getStageTemperature: (_activeProject: any, _stage: string, fallback: number) => fallback,
      buildChapterContextPackage: async () => {
        buildContextCalls += 1
        return contextPackage
      },
      beginChapterTask: async (input: any) => {
        beginInputs.push(input)
        return execution
      },
      executeAgent: async () => {
        fallbackCalls += 1
        throw new Error('ordinary model fallback must not run')
      },
    } as any)

    const response = await callRoute(
      handlers.get('POST /api/novel/chapters/:chapterId/prose-quality'),
      {
        params: { chapterId: String(chapter.id) },
        query: {},
        body: { project_id: project.id, model_id: 217 },
      },
    )

    expect(response.statusCode).toBe(200)
    expect(beginInputs).toHaveLength(1)
    expect(beginInputs[0]).toMatchObject({
      activeWorkspace: workspace,
      project: { id: project.id },
      chapter: { id: chapter.id },
      contextPackage,
      requestedModelId: 217,
    })
    expect(stages).toEqual([{ stage: 'manual_recheck', responseContract: 'quality_review_json' }])
    expect(buildContextCalls).toBe(1)
    expect(fallbackCalls).toBe(0)
    expect(closeOutcomes).toEqual([{ status: 'success' }])
    expect(persistedReviewCountsAtClose).toEqual([1])
  })

  test('manual prose quality closes failed with the provider error object and never falls back', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '人工质检失败', reference_config: {} })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '人工质检失败正文。',
    })
    const providerError = Object.assign(new Error('injected MCP quality failure'), { code: 'MCP_STAGE_FAILED' })
    const closeOutcomes: any[] = []
    let fallbackCalls = 0
    const { app, handlers } = createRouteHarness()
    registerNovelEditorQualityRoutes(app, {
      getWorkspace: () => workspace,
      getProject: (_activeWorkspace: string, id: number) => getNovelProject(workspace, id),
      getStageModelId: () => 217,
      getStageTemperature: (_activeProject: any, _stage: string, fallback: number) => fallback,
      buildChapterContextPackage: async () => ({ complete: true }),
      beginChapterTask: async () => ({
        taskId: 'manual-quality-failure',
        source: 'mcp',
        fingerprint: 'quality-fingerprint',
        contextVersion: 'quality-context',
        provenance: () => ({}),
        generateDraft: async () => { throw new Error('not used') },
        assertCurrent: async () => {},
        executeAgent: async () => { throw providerError },
        close: async (outcome: any) => { closeOutcomes.push(outcome) },
      } as any),
      executeAgent: async () => {
        fallbackCalls += 1
        return { parsed: {} }
      },
    } as any)

    const response = await callRoute(
      handlers.get('POST /api/novel/chapters/:chapterId/prose-quality'),
      {
        params: { chapterId: String(chapter.id) },
        query: {},
        body: { project_id: project.id },
      },
    )

    expect(response.statusCode).toBe(500)
    expect(closeOutcomes).toHaveLength(1)
    expect(closeOutcomes[0].status).toBe('failed')
    expect(closeOutcomes[0].error).toBe(providerError)
    expect(fallbackCalls).toBe(0)
  })

  test('manual prose quality does not send success before a rejecting task close completes', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '人工质检关闭失败', reference_config: {} })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '关闭来源任务失败时不可先发送成功。',
    })
    const closeError = new Error('injected close failure')
    const { app, handlers } = createRouteHarness()
    registerNovelEditorQualityRoutes(app, {
      getWorkspace: () => workspace,
      getProject: (_activeWorkspace: string, id: number) => getNovelProject(workspace, id),
      getStageModelId: () => 217,
      getStageTemperature: (_activeProject: any, _stage: string, fallback: number) => fallback,
      buildChapterContextPackage: async () => ({ complete: true }),
      beginChapterTask: async () => ({
        taskId: 'manual-quality-close-failure',
        source: 'mcp',
        fingerprint: 'quality-fingerprint',
        contextVersion: 'quality-context',
        provenance: () => ({}),
        generateDraft: async () => { throw new Error('not used') },
        assertCurrent: async () => {},
        executeAgent: async () => ({
          parsed: { passed: true, score: 93, issues: [], revision_directives: [] },
          finish_reason: 'stop',
        }),
        close: async () => { throw closeError },
      } as any),
      executeAgent: async () => { throw new Error('ordinary model fallback must not run') },
    } as any)

    const response = await callRoute(
      handlers.get('POST /api/novel/chapters/:chapterId/prose-quality'),
      {
        params: { chapterId: String(chapter.id) },
        query: {},
        body: { project_id: project.id },
      },
    )

    expect(response.statusCode).toBe(500)
    expect(response.jsonCalls).toHaveLength(1)
    expect(response.jsonCalls[0]).toEqual({ error: String(closeError) })
  })
})

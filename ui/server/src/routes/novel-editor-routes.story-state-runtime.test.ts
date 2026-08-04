import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  createNovelChapter,
  createNovelProject,
  getNovelProject,
  listNovelReviews,
  listNovelRuns,
  updateNovelChapter,
} from '../novel'
import { createStoryStateMachineMethods } from '../novel-writing-service/service/story-state-machine'
import { ChapterSourceLeaseRegistry } from '../novel-writing-service/generation-source/chapter-source-lease'
import { registerNovelEditorQualityRoutes } from './novel-editor/register-quality'
import { registerNovelMcpBindingRoutes } from './novel-mcp-binding-routes'
import { revisionTextHash } from './novel-editor/revision-candidate-admission'

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
    put(path: string, handler: any) {
      handlers.set(`PUT ${path}`, handler)
      return app
    },
    delete(path: string, handler: any) {
      handlers.set(`DELETE ${path}`, handler)
      return app
    },
  }
  return { app, handlers }
}

async function call(handler: any, req: any) {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) { this.statusCode = code; return this },
    json(body: any) { this.body = body; return this },
  }
  await handler(req, res)
  return res
}

describe('novel editor Story State route runtime', () => {
  let workspace = ''

  afterEach(() => {
    if (workspace) rmSync(workspace, { recursive: true, force: true })
  })

  test('preparation failure returns the audited failed Story State response', async () => {
    workspace = mkdtempSync(join(tmpdir(), 'mangaforge-story-state-route-'))
    const project = await createNovelProject(workspace, { title: '状态路由失败审计', reference_config: {} } as any)
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '第一章正文明确发生了一件事。',
    } as any)
    const providerError = new Error('injected Story State preparation failure')
    const beginInputs: any[] = []
    const stages: any[] = []
    const closeOutcomes: any[] = []
    let fallbackCalls = 0
    const { app, handlers } = createRouteHarness()
    const ctx: any = {
      getWorkspace: () => workspace,
      getProject: (_activeWorkspace: string, id: number) => getNovelProject(workspace, id),
      getStageModelId: () => 217,
      getStageTemperature: (_activeProject: any, _stage: string, fallback: number) => fallback,
      buildChapterContextPackage: async () => ({ chapter_target: { chapter_id: chapter.id, chapter_no: chapter.chapter_no } }),
      beginChapterTask: async (input: any) => {
        beginInputs.push(input)
        return {
          taskId: 'manual-story-state-failure',
          source: 'mcp',
          fingerprint: 'story-fingerprint',
          contextVersion: 'story-context',
          provenance: () => ({}),
          generateDraft: async () => { throw new Error('not used') },
          assertCurrent: async () => {},
          executeAgent: async (stage: string, responseContract: string) => {
            stages.push({ stage, responseContract })
            throw providerError
          },
          close: async (outcome: any) => { closeOutcomes.push(outcome) },
        }
      },
      executeAgent: async () => {
        fallbackCalls += 1
        throw new Error('ordinary model fallback must not run')
      },
    }
    registerNovelEditorQualityRoutes(app, ctx)

    const response = await call(
      handlers.get('POST /api/novel/chapters/:chapterId/story-state-sync'),
      {
        params: { chapterId: String(chapter.id) },
        query: {},
        body: { project_id: project.id },
      },
    )
    const runs = (await listNovelRuns(workspace, project.id)).filter(item => item.run_type === 'story_state')

    const convergenceReviews = (await listNovelReviews(workspace, project.id))
      .filter(item => item.review_type === 'delivery_risk_convergence')

    expect(response.statusCode).toBe(502)
    expect(response.body?.ok).toBe(false)
    expect(response.body?.story_state_update).toMatchObject({ ok: false })
    expect(String(response.body?.story_state_update?.error || '')).toContain('injected Story State preparation failure')
    expect(convergenceReviews).toHaveLength(0)
    expect(runs).toHaveLength(1)
    expect(runs[0].status).toBe('failed')
    expect(beginInputs).toHaveLength(1)
    expect(stages).toEqual([{ stage: 'story_state_sync', responseContract: 'story_state_json' }])
    expect(fallbackCalls).toBe(0)
    expect(closeOutcomes).toHaveLength(1)
    expect(closeOutcomes[0].status).toBe('failed')
    expect(closeOutcomes[0].error).toBe(providerError)
  })

  test('manual Story State ignores a stale client receipt after prose changes', async () => {
    workspace = mkdtempSync(join(tmpdir(), 'mangaforge-story-state-live-receipt-'))
    const project = await createNovelProject(workspace, {
      title: '状态路由实时正文收据',
      reference_config: { story_state: {} },
    } as any)
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '旧正文完成第一次状态同步。',
    } as any)
    const oldCandidateHash = revisionTextHash(String(chapter.chapter_text || ''))
    let modelCalls = 0
    let fallbackCalls = 0
    const stages: any[] = []
    const beginInputs: any[] = []
    const closeOutcomes: any[] = []
    const convergenceReviewCountsAtClose: number[] = []
    const successRunCountsAtClose: number[] = []
    const stageResult = async () => {
      modelCalls += 1
      return {
        parsed: {
          state_delta: {
            current_time: `sync-${modelCalls}`,
            progress_summary: { notes: `live-sync-${modelCalls}` },
          },
          character_updates: [],
          setting_updates: [],
          storyline_updates: [],
          discovered_assets: [],
        },
        finish_reason: 'stop',
      }
    }
    const methods = createStoryStateMachineMethods({
      executeAgent: async () => {
        fallbackCalls += 1
        throw new Error('ordinary model fallback must not run')
      },
      getStageModelId: () => 217,
      getStageTemperature: (_activeProject: any, _stage: string, fallback: number) => fallback,
      refreshFollowingChapterSerialStoryStateReadiness: async () => {},
    })
    const { app, handlers } = createRouteHarness()
    const ctx: any = {
      getWorkspace: () => workspace,
      getProject: (_activeWorkspace: string, id: number) => getNovelProject(workspace, id),
      getStageModelId: () => 217,
      getStageTemperature: (_activeProject: any, _stage: string, fallback: number) => fallback,
      buildChapterContextPackage: async () => ({}),
      beginChapterTask: async (input: any) => {
        beginInputs.push(input)
        return {
          taskId: `manual-story-state-${beginInputs.length}`,
          source: 'mcp',
          fingerprint: 'story-fingerprint',
          contextVersion: 'story-context',
          provenance: () => ({}),
          generateDraft: async () => { throw new Error('not used') },
          assertCurrent: async () => {},
          executeAgent: async (stage: string, responseContract: string) => {
            stages.push({ stage, responseContract })
            return stageResult()
          },
          close: async (outcome: any) => {
            closeOutcomes.push(outcome)
            convergenceReviewCountsAtClose.push((await listNovelReviews(workspace, project.id))
              .filter(item => item.review_type === 'delivery_risk_convergence').length)
            successRunCountsAtClose.push((await listNovelRuns(workspace, project.id))
              .filter(item => item.run_type === 'story_state' && item.status === 'success').length)
          },
        }
      },
      executeAgent: async () => {
        fallbackCalls += 1
        throw new Error('ordinary model fallback must not run')
      },
      updateStoryStateMachine: methods.updateStoryStateMachine,
    }
    registerNovelEditorQualityRoutes(app, ctx)
    const handler = handlers.get('POST /api/novel/chapters/:chapterId/story-state-sync')
    const first = await call(handler, {
      params: { chapterId: String(chapter.id) },
      query: {},
      body: { project_id: project.id },
    })
    expect(first.statusCode).toBe(200)
    expect(modelCalls).toBe(1)

    const liveText = '新正文替换旧内容，必须基于此正文重新同步。'
    await updateNovelChapter(workspace, chapter.id, { chapter_text: liveText } as any)
    const response = await call(handler, {
      params: { chapterId: String(chapter.id) },
      query: {},
      body: {
        project_id: project.id,
        source_run_id: null,
        candidate_hash: oldCandidateHash,
      },
    })
    const freshProject = await getNovelProject(workspace, project.id)
    const liveCandidateHash = revisionTextHash(liveText)
    const receipts = freshProject?.reference_config?.story_state_sync_receipts || {}

    expect(response.statusCode).toBe(200)
    expect(modelCalls).toBe(2)
    expect(receipts[`manual:${chapter.id}:${liveCandidateHash}`]).toMatchObject({
      status: 'completed',
      candidate_hash: liveCandidateHash,
      source_run_id: null,
    })
    expect(beginInputs).toHaveLength(2)
    expect(stages).toEqual([
      { stage: 'story_state_sync', responseContract: 'story_state_json' },
      { stage: 'story_state_sync', responseContract: 'story_state_json' },
    ])
    expect(fallbackCalls).toBe(0)
    expect(closeOutcomes).toEqual([{ status: 'success' }, { status: 'success' }])
    expect(convergenceReviewCountsAtClose).toEqual([1, 2])
    expect(successRunCountsAtClose).toEqual([1, 2])
  })

  test('manual prose quality ignores client-supplied receipt identity', async () => {
    workspace = mkdtempSync(join(tmpdir(), 'mangaforge-quality-live-receipt-'))
    const project = await createNovelProject(workspace, { title: '质检路由实时正文收据', reference_config: {} } as any)
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '服务端当前正文用于人工质检。',
    } as any)
    let modelCalls = 0
    let fallbackCalls = 0
    const { app, handlers } = createRouteHarness()
    const ctx: any = {
      getWorkspace: () => workspace,
      getProject: (_activeWorkspace: string, id: number) => getNovelProject(workspace, id),
      getStageModelId: () => 217,
      getStageTemperature: (_activeProject: any, _stage: string, fallback: number) => fallback,
      buildChapterContextPackage: async () => ({}),
      beginChapterTask: async () => ({
        taskId: 'manual-quality-live-receipt',
        source: 'mcp',
        fingerprint: 'quality-fingerprint',
        contextVersion: 'quality-context',
        provenance: () => ({}),
        generateDraft: async () => { throw new Error('not used') },
        assertCurrent: async () => {},
        executeAgent: async () => {
          modelCalls += 1
          return { parsed: { passed: true, score: 93, issues: [], revision_directives: [] }, finish_reason: 'stop' }
        },
        close: async () => {},
      }),
      executeAgent: async () => {
        fallbackCalls += 1
        throw new Error('ordinary model fallback must not run')
      },
    }
    registerNovelEditorQualityRoutes(app, ctx)

    const response = await call(
      handlers.get('POST /api/novel/chapters/:chapterId/prose-quality'),
      {
        params: { chapterId: String(chapter.id) },
        query: {},
        body: {
          project_id: project.id,
          source_run_id: 991,
          candidate_hash: 'client-injected-stale-hash',
        },
      },
    )
    const payload = JSON.parse(String(response.body?.review?.payload || '{}'))

    expect(response.statusCode).toBe(200)
    expect(modelCalls).toBe(1)
    expect(fallbackCalls).toBe(0)
    expect(payload).toMatchObject({
      chapter_id: chapter.id,
      source_run_id: null,
      candidate_hash: revisionTextHash(String(chapter.chapter_text || '')),
      current_chapter_only: true,
    })
  })

  test('aborted manual Story State closes cancelled with the original error and no source fallback', async () => {
    workspace = mkdtempSync(join(tmpdir(), 'mangaforge-story-state-abort-'))
    const project = await createNovelProject(workspace, { title: '状态路由取消', reference_config: {} } as any)
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '等待同步期间请求被取消。',
    } as any)
    const controller = new AbortController()
    const abortError = Object.assign(new Error('manual Story State aborted'), { code: 'REQUEST_ABORTED' })
    const closeOutcomes: any[] = []
    let fallbackCalls = 0
    const { app, handlers } = createRouteHarness()
    registerNovelEditorQualityRoutes(app, {
      getWorkspace: () => workspace,
      getProject: (_activeWorkspace: string, id: number) => getNovelProject(workspace, id),
      getStageModelId: () => 217,
      getStageTemperature: (_activeProject: any, _stage: string, fallback: number) => fallback,
      buildChapterContextPackage: async () => ({ complete: true }),
      beginChapterTask: async (input: any) => ({
        taskId: 'manual-story-state-abort',
        source: 'mcp',
        fingerprint: 'story-fingerprint',
        contextVersion: 'story-context',
        provenance: () => ({}),
        generateDraft: async () => { throw new Error('not used') },
        assertCurrent: async () => {},
        executeAgent: async () => {
          expect(input.signal).toBe(controller.signal)
          controller.abort(abortError)
          throw abortError
        },
        close: async (outcome: any) => { closeOutcomes.push(outcome) },
      }),
      executeAgent: async () => {
        fallbackCalls += 1
        return { parsed: {} }
      },
    } as any)

    const response = await call(
      handlers.get('POST /api/novel/chapters/:chapterId/story-state-sync'),
      {
        params: { chapterId: String(chapter.id) },
        query: {},
        body: { project_id: project.id },
        signal: controller.signal,
      },
    )

    expect(response.statusCode).toBe(502)
    expect(closeOutcomes).toHaveLength(1)
    expect(closeOutcomes[0].status).toBe('cancelled')
    expect(closeOutcomes[0].error).toBe(abortError)
    expect(fallbackCalls).toBe(0)
  })

  test('manual Story State task keeps project source activation locked while its model stage is pending', async () => {
    workspace = mkdtempSync(join(tmpdir(), 'mangaforge-story-state-lease-'))
    const project = await createNovelProject(workspace, {
      title: '状态路由来源租约',
      reference_config: {
        chapter_generation_source: {
          version: 'chapter_generation_source_v1',
          active: 'model',
          model: { model_id: 217 },
        },
      },
    } as any)
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '模型阶段等待时来源不可切换。',
    } as any)
    const chapterSourceLeases = new ChapterSourceLeaseRegistry()
    let releaseStage!: () => void
    let markStageEntered!: () => void
    const stageMayFinish = new Promise<void>(resolve => { releaseStage = resolve })
    const stageEntered = new Promise<void>(resolve => { markStageEntered = resolve })
    let fallbackCalls = 0
    const methods = createStoryStateMachineMethods({
      executeAgent: async () => {
        fallbackCalls += 1
        throw new Error('ordinary model fallback must not run')
      },
      getStageModelId: () => 217,
      getStageTemperature: (_activeProject: any, _stage: string, fallback: number) => fallback,
      refreshFollowingChapterSerialStoryStateReadiness: async () => {},
    })
    const { app, handlers } = createRouteHarness()
    const getProject = (_activeWorkspace: string, id: number) => getNovelProject(workspace, id)
    registerNovelEditorQualityRoutes(app, {
      getWorkspace: () => workspace,
      getProject,
      getStageModelId: () => 217,
      getStageTemperature: (_activeProject: any, _stage: string, fallback: number) => fallback,
      buildChapterContextPackage: async () => ({ complete: true }),
      beginChapterTask: async () => {
        const lease = await chapterSourceLeases.acquire(workspace, project.id, 'manual-story-state-lease')
        return {
          taskId: 'manual-story-state-lease',
          source: 'model',
          modelId: 217,
          fingerprint: 'story-fingerprint',
          contextVersion: 'story-context',
          provenance: () => ({}),
          generateDraft: async () => { throw new Error('not used') },
          assertCurrent: async () => {},
          executeAgent: async () => {
            markStageEntered()
            await stageMayFinish
            return {
              parsed: {
                state_delta: { current_time: 'lease-sync', progress_summary: { notes: 'lease-sync' } },
                character_updates: [],
                setting_updates: [],
                storyline_updates: [],
                discovered_assets: [],
              },
              finish_reason: 'stop',
            }
          },
          close: async () => lease.release(),
        }
      },
      executeAgent: async () => {
        fallbackCalls += 1
        return { parsed: {} }
      },
      updateStoryStateMachine: methods.updateStoryStateMachine,
      chapterSourceLeases,
    } as any)
    registerNovelMcpBindingRoutes(app, {
      getWorkspace: () => workspace,
      getProject,
      chapterSourceLeases,
    })

    const syncing = call(
      handlers.get('POST /api/novel/chapters/:chapterId/story-state-sync'),
      {
        params: { chapterId: String(chapter.id) },
        query: {},
        body: { project_id: project.id },
      },
    )
    await stageEntered
    const activation = await call(
      handlers.get('POST /api/novel/projects/:id/chapter-generation-source/activate'),
      {
        params: { id: String(project.id) },
        query: {},
        body: { active: 'model' },
      },
    )
    releaseStage()
    const response = await syncing

    expect(activation.statusCode).toBe(409)
    expect(activation.body?.error_code).toBe('GENERATION_SOURCE_BUSY')
    expect(response.statusCode).toBe(200)
    expect(fallbackCalls).toBe(0)
  })
})

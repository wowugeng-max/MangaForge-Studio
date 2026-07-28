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
import { registerNovelEditorQualityRoutes } from './novel-editor/register-quality'
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
    const { app, handlers } = createRouteHarness()
    const ctx: any = {
      getWorkspace: () => workspace,
      getProject: (_activeWorkspace: string, id: number) => getNovelProject(workspace, id),
      getStageModelId: () => 217,
      getStageTemperature: (_activeProject: any, _stage: string, fallback: number) => fallback,
      buildChapterContextPackage: async () => ({ chapter_target: { chapter_id: chapter.id, chapter_no: chapter.chapter_no } }),
      executeAgent: async () => { throw new Error('injected Story State preparation failure') },
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
    const executeAgent = async () => {
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
      executeAgent,
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
      executeAgent,
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
    const { app, handlers } = createRouteHarness()
    const ctx: any = {
      getWorkspace: () => workspace,
      getProject: (_activeWorkspace: string, id: number) => getNovelProject(workspace, id),
      getStageModelId: () => 217,
      getStageTemperature: (_activeProject: any, _stage: string, fallback: number) => fallback,
      buildChapterContextPackage: async () => ({}),
      executeAgent: async () => {
        modelCalls += 1
        return { parsed: { passed: true, score: 93, issues: [], revision_directives: [] }, finish_reason: 'stop' }
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
    expect(payload).toMatchObject({
      chapter_id: chapter.id,
      source_run_id: null,
      candidate_hash: revisionTextHash(String(chapter.chapter_text || '')),
      current_chapter_only: true,
    })
  })
})

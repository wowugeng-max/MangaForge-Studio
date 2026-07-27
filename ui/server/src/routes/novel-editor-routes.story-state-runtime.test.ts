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
} from '../novel'
import { registerNovelEditorQualityRoutes } from './novel-editor/register-quality'

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
})

import { describe, expect, test } from 'bun:test'
import { registerNovelPipelineRoutes } from './novel-pipeline-routes'

describe('novel pipeline routes', () => {
  function createRouteHarness() {
    const handlers = new Map<string, any>()
    const app = {
      get: (path: string, handler: any) => {
        handlers.set(path, handler)
        return app
      },
    }
    return { app, handlers }
  }

  async function callHandler(handler: any, params: any = { id: '1' }) {
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
    await handler({ params }, res)
    return res
  }

  test('returns a pipeline summary for an existing project', async () => {
    const { app, handlers } = createRouteHarness()
    registerNovelPipelineRoutes(app as any, {
      getWorkspace: () => '/tmp/workspace',
      getProject: async () => ({
        id: 1,
        title: '剑烛大荒',
        reference_config: {
          writing_bible: {
            reader_promise: '破局爽点',
            protagonist_drive: '少年必须夺回被夺走的火种。',
            current_volume_goal: '进入大荒门',
            core_conflict: '旧规与新火的冲突',
            innovation_hook: '符火审案',
            first30_plan: '前三十章完成入门和第一次公开破局。',
            longform_capacity: '九卷大荒门派和火种谜团支撑长篇推进。',
          },
          story_state: { last_updated_chapter: 0 },
        },
      }),
      listChapters: async () => [{
        id: 11,
        project_id: 1,
        chapter_no: 1,
        title: '荒门初开',
        chapter_goal: '破局',
        conflict: '旧规压迫',
        ending_hook: '血字出现',
      }],
      listOutlines: async () => [],
      listWorldbuilding: async () => [{ id: 1, world_summary: '大荒门以符火和旧规约束修行者。' }],
      listCharacters: async () => [{ id: 1, name: '丁松言', goal: '夺回火种。' }],
      listReviews: async () => [],
      listRuns: async () => [],
    })

    const handler = handlers.get('/api/novel/projects/:id/pipeline')
    expect(handler).toBeTruthy()
    const res = await callHandler(handler)

    expect(res.statusCode).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.pipeline.project_id).toBe(1)
    expect(res.body.pipeline.current_stage).toBe('chapter_writing')
    expect(res.body.pipeline.stages.find((stage: any) => stage.key === 'chapter_writing')?.agent_steps.length).toBeGreaterThan(0)
  })

  test('returns 404 for a missing project', async () => {
    const { app, handlers } = createRouteHarness()
    registerNovelPipelineRoutes(app as any, {
      getWorkspace: () => '/tmp/workspace',
      getProject: async () => null,
      listChapters: async () => [],
      listOutlines: async () => [],
      listReviews: async () => [],
      listRuns: async () => [],
    })

    const handler = handlers.get('/api/novel/projects/:id/pipeline')
    const res = await callHandler(handler, { id: '404' })

    expect(res.statusCode).toBe(404)
    expect(res.body.error).toBe('project not found')
  })
})

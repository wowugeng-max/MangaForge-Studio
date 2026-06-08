import { describe, expect, test } from 'bun:test'

function createRouteHarness() {
  const handlers = new Map<string, any>()
  const app = {
    post: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`POST ${path}`, handler)
      return app
    },
  }
  return { app, handlers }
}

async function call(handler: any, req: any = {}) {
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
  await handler({ body: {}, ...req }, res)
  return res
}

describe('video loop routes', () => {
  test('registers upstream video_loop plus real and cloud task endpoints', async () => {
    const { registerVideoLoopRoutes } = await import('./video-loop')
    const { app, handlers } = createRouteHarness()
    const calls: any[] = []
    registerVideoLoopRoutes(app as any, () => '/tmp/workspace', {
      realExecute: async options => {
        calls.push(options)
        return {
          status: 'completed',
          final_video: '/tmp/workspace/assets/comfy-output/final.mp4',
          media_url: '/api/assets/media/final.mp4',
          segments: ['/tmp/workspace/assets/comfy-output/final.mp4'],
          num_segments: 1,
          asset_id: null,
        }
      },
    })

    expect(handlers.has('POST /api/tasks/video_loop')).toBe(true)
    expect(handlers.has('POST /api/tasks/video_loop/')).toBe(true)
    expect(handlers.has('POST /api/tasks/real_video_loop')).toBe(true)
    expect(handlers.has('POST /api/tasks/real_video_loop/')).toBe(true)
    expect(handlers.has('POST /api/tasks/cloud_video_loop')).toBe(true)
    expect(handlers.has('POST /api/tasks/cloud_video_loop/')).toBe(true)

    const res = await call(handlers.get('POST /api/tasks/real_video_loop'), {
      body: {
        workflow_asset_id: 7,
        segments: [{ frame_a_asset_id: 1, frame_b_asset_id: 2, prompt_asset_id: 3 }],
      },
    })

    expect(res.statusCode).toBe(200)
    expect(calls[0]).toMatchObject({
      workspace: '/tmp/workspace',
      request: {
        workflow_asset_id: 7,
        segments: [{ frame_a_asset_id: 1, frame_b_asset_id: 2, prompt_asset_id: 3 }],
      },
    })
    expect(res.body).toMatchObject({
      status: 'completed',
      media_url: '/api/assets/media/final.mp4',
    })

    const legacyRes = await call(handlers.get('POST /api/tasks/video_loop'), {
      body: {
        workflow_asset_id: 8,
        segments: [{ frame_a_asset_id: 4, frame_b_asset_id: 5, prompt_asset_id: 6 }],
      },
    })

    expect(legacyRes.statusCode).toBe(200)
    expect(calls[1]).toMatchObject({
      workspace: '/tmp/workspace',
      request: {
        workflow_asset_id: 8,
        segments: [{ frame_a_asset_id: 4, frame_b_asset_id: 5, prompt_asset_id: 6 }],
      },
    })
  })

  test('upstream video_loop route dispatches legacy initial-video requests without requiring workflow assets', async () => {
    const { registerVideoLoopRoutes } = await import('./video-loop')
    const { app, handlers } = createRouteHarness()
    const realCalls: any[] = []
    const legacyCalls: any[] = []
    registerVideoLoopRoutes(app as any, () => '/tmp/workspace', {
      realExecute: async options => {
        realCalls.push(options)
        throw new Error('real executor should not receive legacy requests')
      },
      legacyExecute: async options => {
        legacyCalls.push(options)
        return {
          status: 'completed',
          final_video: '/tmp/workspace/assets/comfy-output/legacy.mp4',
          media_url: '/api/assets/media/legacy.mp4',
          segments: ['/tmp/workspace/assets/comfy-output/legacy.mp4'],
          segment_outputs: [],
          num_segments: 2,
          asset_id: null,
        }
      },
    })

    const response = await call(handlers.get('POST /api/tasks/video_loop'), {
      body: {
        initial_video_path: '/tmp/source.mp4',
        total_seconds: 10,
        segment_seconds: 5,
        global_prompt: '延展视频',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(realCalls).toHaveLength(0)
    expect(legacyCalls[0]).toMatchObject({
      workspace: '/tmp/workspace',
      request: {
        initial_video_path: '/tmp/source.mp4',
        total_seconds: 10,
        segment_seconds: 5,
        global_prompt: '延展视频',
      },
    })
    expect(response.body).toMatchObject({
      status: 'completed',
      num_segments: 2,
    })
  })

  test('returns FastAPI-compatible detail field for video loop execution errors', async () => {
    const { registerVideoLoopRoutes } = await import('./video-loop')
    const { app, handlers } = createRouteHarness()
    registerVideoLoopRoutes(app as any, () => '/tmp/workspace', {
      realExecute: async () => {
        throw new Error('缺少 workflow_asset_id')
      },
      cloudExecute: async () => {
        throw new Error('cloud gateway exploded')
      },
    })

    const realResponse = await call(handlers.get('POST /api/tasks/real_video_loop'), {
      body: {},
    })
    expect(realResponse.statusCode).toBe(400)
    expect(realResponse.body).toEqual({
      error: '缺少 workflow_asset_id',
      detail: '缺少 workflow_asset_id',
    })

    const cloudResponse = await call(handlers.get('POST /api/tasks/cloud_video_loop'), {
      body: {},
    })
    expect(cloudResponse.statusCode).toBe(500)
    expect(cloudResponse.body).toEqual({
      error: 'cloud gateway exploded',
      detail: 'cloud gateway exploded',
    })
  })
})

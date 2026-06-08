import { afterEach, describe, expect, test } from 'bun:test'
import { access, mkdtemp, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-rules-route-'))
  workspaces.push(workspace)
  return workspace
}

function createRouteHarness() {
  const handlers = new Map<string, any>()
  const app = {
    get: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`GET ${path}`, handler)
      return app
    },
    post: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`POST ${path}`, handler)
      return app
    },
    put: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`PUT ${path}`, handler)
      return app
    },
    delete: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`DELETE ${path}`, handler)
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
    send(body?: any) {
      this.body = body ?? null
      return this
    },
  }
  await handler({ params: {}, query: {}, body: {}, ...req }, res)
  return res
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('recommendation rules TS routes', () => {
  test('creates, lists, updates, and combines manual recommendation rules', async () => {
    const workspace = await tempWorkspace()
    const { registerRecommendationRoutes } = await import('./recommendation-rules')
    const { app, handlers } = createRouteHarness()
    registerRecommendationRoutes(app as any, () => workspace)

    const create = handlers.get('POST /api/recommendation-rules')
    const list = handlers.get('GET /api/recommendation-rules')
    const update = handlers.get('PUT /api/recommendation-rules/:id')
    const combined = handlers.get('GET /api/recommendation-rules/combined')

    const created = await call(create, {
      body: {
        class_type: 'CLIPTextEncode',
        field: 'text',
        friendly_name: '提示词',
        auto_check: true,
        enabled: true,
        priority: 2,
        threshold: 3,
      },
    })
    expect(created.body.id).toBe(1)

    const listed = await call(list, { query: { enabled: 'true' } })
    expect(listed.body).toHaveLength(1)
    expect(listed.body[0].friendly_name).toBe('提示词')

    const updated = await call(update, { params: { id: '1' }, body: { priority: 1, threshold: 2 } })
    expect(updated.body.priority).toBe(1)
    expect(updated.body.threshold).toBe(2)

    const merged = await call(combined)
    expect(merged.body).toMatchObject([
      {
        id: 1,
        class_type: 'CLIPTextEncode',
        field: 'text',
        source: 'manual',
      },
    ])
  })

  test('accepts camelCase recommendation rule fields from TS clients', async () => {
    const workspace = await tempWorkspace()
    const { registerRecommendationRoutes } = await import('./recommendation-rules')
    const { app, handlers } = createRouteHarness()
    registerRecommendationRoutes(app as any, () => workspace)

    const created = await call(handlers.get('POST /api/recommendation-rules'), {
      body: {
        classType: 'KSampler',
        field: 'steps',
        friendlyName: '采样步数',
        autoCheck: 'true',
        enabled: 'false',
      },
    })

    expect(created.statusCode).toBe(200)
    expect(created.body).toMatchObject({
      class_type: 'KSampler',
      field: 'steps',
      friendly_name: '采样步数',
      auto_check: true,
      enabled: false,
    })

    const updated = await call(handlers.get('PUT /api/recommendation-rules/:id'), {
      params: { id: '1' },
      body: {
        classType: 'KSamplerAdvanced',
        friendlyName: '高级采样步数',
        autoCheck: 'false',
        enabled: 'true',
      },
    })

    expect(updated.statusCode).toBe(200)
    expect(updated.body).toMatchObject({
      class_type: 'KSamplerAdvanced',
      field: 'steps',
      friendly_name: '高级采样步数',
      auto_check: false,
      enabled: true,
    })
  })

  test('filters recommendation rules with Pydantic-style boolean query aliases', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'recommendation-rules.json'), JSON.stringify([
      { id: 1, class_type: 'KSampler', field: 'steps', friendly_name: '采样步数', enabled: true },
      { id: 2, class_type: 'KSampler', field: 'cfg', friendly_name: '提示词相关性', enabled: false },
    ]), 'utf8')
    const { registerRecommendationRoutes } = await import('./recommendation-rules')
    const { app, handlers } = createRouteHarness()
    registerRecommendationRoutes(app as any, () => workspace)

    const disabled = await call(handlers.get('GET /api/recommendation-rules'), {
      query: { enabled: 'no' },
    })
    const enabled = await call(handlers.get('GET /api/recommendation-rules'), {
      query: { enabled: 'on' },
    })

    expect(disabled.body.map((rule: any) => rule.id)).toEqual([2])
    expect(enabled.body.map((rule: any) => rule.id)).toEqual([1])
  })

  test('normalizes legacy recommendation rules before filtering and combining', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'recommendation-rules.json'), JSON.stringify([
      { id: 7, class_type: 'KSampler', field: 'steps', friendly_name: '采样步数' },
    ]), 'utf8')
    const { registerRecommendationRoutes } = await import('./recommendation-rules')
    const { app, handlers } = createRouteHarness()
    registerRecommendationRoutes(app as any, () => workspace)

    const listed = await call(handlers.get('GET /api/recommendation-rules'), {
      query: { enabled: 'true' },
    })
    expect(listed.body).toHaveLength(1)
    expect(listed.body[0]).toMatchObject({
      id: 7,
      class_type: 'KSampler',
      field: 'steps',
      friendly_name: '采样步数',
      auto_check: false,
      enabled: true,
      priority: 0,
      threshold: 1,
    })
    expect(typeof listed.body[0].created_at).toBe('string')
    expect(typeof listed.body[0].updated_at).toBe('string')

    const combined = await call(handlers.get('GET /api/recommendation-rules/combined'))
    expect(combined.body[0]).toMatchObject({
      id: 7,
      source: 'manual',
      count: null,
      enabled: true,
    })
  })

  test('reports learned node parameter stats and hides learned duplicates behind manual rules', async () => {
    const workspace = await tempWorkspace()
    const { registerRecommendationRoutes } = await import('./recommendation-rules')
    const { app, handlers } = createRouteHarness()
    registerRecommendationRoutes(app as any, () => workspace)

    await call(handlers.get('POST /api/suggestions/report'), {
      body: {
        items: [
          { class_type: 'KSampler', field: 'seed' },
          { class_type: 'KSampler', field: 'steps' },
          { class_type: 'KSampler', field: 'steps' },
        ],
      },
    })

    const recommended = await call(handlers.get('GET /api/suggestions/recommend'), {
      query: { class_type: 'KSampler', limit: '10' },
    })
    expect(recommended.body).toEqual([
      { field: 'steps', count: 2 },
      { field: 'seed', count: 1 },
    ])

    await call(handlers.get('POST /api/recommendation-rules'), {
      body: {
        class_type: 'KSampler',
        field: 'seed',
        friendly_name: '随机种子',
      },
    })

    const merged = await call(handlers.get('GET /api/recommendation-rules/combined'))
    expect(merged.body.find((item: any) => item.field === 'seed')?.source).toBe('manual')
    expect(merged.body.find((item: any) => item.field === 'steps')).toMatchObject({
      class_type: 'KSampler',
      field: 'steps',
      count: 2,
      source: 'learned',
    })
  })

  test('accepts camelCase suggestion report items and recommendation query', async () => {
    const workspace = await tempWorkspace()
    const { registerRecommendationRoutes } = await import('./recommendation-rules')
    const { app, handlers } = createRouteHarness()
    registerRecommendationRoutes(app as any, () => workspace)

    const reported = await call(handlers.get('POST /api/suggestions/report'), {
      body: {
        items: [
          { classType: 'KSampler', field: 'cfg' },
          { classType: 'KSampler', field: 'cfg' },
        ],
      },
    })
    expect(reported.statusCode).toBe(200)

    const recommended = await call(handlers.get('GET /api/suggestions/recommend'), {
      query: { classType: 'KSampler' },
    })

    expect(recommended.statusCode).toBe(200)
    expect(recommended.body).toEqual([
      { field: 'cfg', count: 2 },
    ])
  })

  test('aggregates duplicate learned stats in combined recommendation rules', async () => {
    const workspace = await tempWorkspace()
    const { registerRecommendationRoutes } = await import('./recommendation-rules')
    const { app, handlers } = createRouteHarness()
    registerRecommendationRoutes(app as any, () => workspace)

    await writeFile(join(workspace, 'node-parameter-stats.json'), JSON.stringify([
      { class_type: 'KSampler', field: 'steps', count: 2, updated_at: '2026-06-01T00:00:00.000Z' },
      { class_type: 'KSampler', field: 'steps', count: 3, updated_at: '2026-06-02T00:00:00.000Z' },
      { class_type: 'KSampler', field: 'cfg', count: 1, updated_at: '2026-06-01T00:00:00.000Z' },
    ]), 'utf8')

    const merged = await call(handlers.get('GET /api/recommendation-rules/combined'))
    const learnedSteps = merged.body.filter((item: any) => item.class_type === 'KSampler' && item.field === 'steps')

    expect(learnedSteps).toHaveLength(1)
    expect(learnedSteps[0]).toMatchObject({
      class_type: 'KSampler',
      field: 'steps',
      count: 5,
      source: 'learned',
      updated_at: '2026-06-02T00:00:00.000Z',
    })
  })

  test('registers FastAPI-compatible trailing slash aliases for recommendation and suggestion subroutes', async () => {
    const workspace = await tempWorkspace()
    const { registerRecommendationRoutes } = await import('./recommendation-rules')
    const { app, handlers } = createRouteHarness()
    registerRecommendationRoutes(app as any, () => workspace)

    expect(handlers.has('GET /api/recommendation-rules/combined/')).toBe(true)
    expect(handlers.has('GET /api/recommendation-rules/:id/')).toBe(true)
    expect(handlers.has('PUT /api/recommendation-rules/:id/')).toBe(true)
    expect(handlers.has('DELETE /api/recommendation-rules/:id/')).toBe(true)
    expect(handlers.has('POST /api/suggestions/report/')).toBe(true)
    expect(handlers.has('GET /api/suggestions/recommend/')).toBe(true)
  })

  test('returns FastAPI-compatible detail field for validation and missing rule errors', async () => {
    const workspace = await tempWorkspace()
    const { registerRecommendationRoutes } = await import('./recommendation-rules')
    const { app, handlers } = createRouteHarness()
    registerRecommendationRoutes(app as any, () => workspace)

    const invalidCreate = await call(handlers.get('POST /api/recommendation-rules'), {
      body: { class_type: 'KSampler' },
    })
    expect(invalidCreate.statusCode).toBe(400)
    expect(invalidCreate.body).toEqual({
      error: 'class_type and field are required',
      detail: 'class_type and field are required',
    })

    const missingRule = await call(handlers.get('GET /api/recommendation-rules/:id'), {
      params: { id: '999' },
    })
    expect(missingRule.statusCode).toBe(404)
    expect(missingRule.body).toEqual({
      error: 'rule not found',
      detail: 'rule not found',
    })
  })

  test('rejects suggestion recommendations without class_type', async () => {
    const workspace = await tempWorkspace()
    const { registerRecommendationRoutes } = await import('./recommendation-rules')
    const { app, handlers } = createRouteHarness()
    registerRecommendationRoutes(app as any, () => workspace)

    await writeFile(join(workspace, 'node-parameter-stats.json'), JSON.stringify([
      { class_type: 'KSampler', field: 'steps', count: 3, updated_at: '2026-06-01T00:00:00.000Z' },
    ]), 'utf8')

    const missingClassType = await call(handlers.get('GET /api/suggestions/recommend'))

    expect(missingClassType.statusCode).toBe(400)
    expect(missingClassType.body).toEqual({
      error: 'class_type is required',
      detail: 'class_type is required',
    })
  })

  test('does not write learned stats when reported suggestion items are all invalid', async () => {
    const workspace = await tempWorkspace()
    const { registerRecommendationRoutes } = await import('./recommendation-rules')
    const { app, handlers } = createRouteHarness()
    registerRecommendationRoutes(app as any, () => workspace)

    const response = await call(handlers.get('POST /api/suggestions/report'), {
      body: {
        items: [
          { class_type: 'KSampler' },
          { field: 'steps' },
          { class_type: '   ', field: '   ' },
        ],
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.body).toEqual({
      error: 'items with class_type and field are required',
      detail: 'items with class_type and field are required',
    })
    await expect(access(join(workspace, 'node-parameter-stats.json'))).rejects.toThrow()
  })
})

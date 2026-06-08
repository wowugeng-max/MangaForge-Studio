import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { buildProbeRequest, determineProbeType } from './models'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-model-route-'))
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
    patch: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`PATCH ${path}`, handler)
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
  }
  await handler({ params: {}, query: {}, body: {}, ...req }, res)
  return res
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('model health probes', () => {
  test('uses plain text response format for chat probes', () => {
    expect(buildProbeRequest('chat', 'gpt-5-codex')).toMatchObject({
      model: 'gpt-5-codex',
      response_format: 'text',
    })
  })

  test('marks non-chat probes with their upstream modality type', () => {
    expect(buildProbeRequest('text_to_image', 'image-model')).toMatchObject({
      model: 'image-model',
      type: 'text_to_image',
      prompt: 'A simple white circle on a black background.',
      response_format: 'text',
    })
  })

  test('maps legacy broad image and video capabilities to concrete probe types', () => {
    expect(determineProbeType({ image: true } as any)).toBe('text_to_image')
    expect(determineProbeType({ video: true } as any)).toBe('text_to_video')
  })

  test('includes the upstream official image in vision probes', () => {
    const request = buildProbeRequest('vision', 'vision-model') as any

    expect(request.messages?.[0]?.content).toEqual([
      { type: 'text', text: 'Describe this image.' },
      {
        type: 'image_url',
        image_url: { url: 'https://img.alicdn.com/tfs/TB1p.bgQXXXXXbFXFXXXXXXXXXX-500-500.png' },
      },
    ])
  })

  test('includes image_url for image-to-image and image-to-video probes', () => {
    expect(buildProbeRequest('image_to_image', 'i2i-model')).toMatchObject({
      type: 'image_to_image',
      image_url: 'https://img.alicdn.com/tfs/TB1p.bgQXXXXXbFXFXXXXXXXXXX-500-500.png',
    })
    expect(buildProbeRequest('image_to_video', 'i2v-model')).toMatchObject({
      type: 'image_to_video',
      image_url: 'https://img.alicdn.com/tfs/TB1p.bgQXXXXXbFXFXXXXXXXXXX-500-500.png',
    })
  })

  test('classifies connection refused during model probes as a network error', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      {
        id: 'openai',
        display_name: 'OpenAI',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        supported_modalities: ['chat'],
        default_base_url: 'https://gateway.example/v1',
        is_active: true,
      },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 10, provider: 'openai', key: 'sk-network', is_active: true },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      {
        id: 1,
        api_key_id: 10,
        provider: 'openai',
        display_name: 'Network Model',
        model_name: 'gpt-network',
        capabilities: { chat: true },
        health_status: 'unknown',
      },
    ]))

    const previousFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new Error('ConnectionRefused')
    }) as any

    try {
      const { registerModelRoutes } = await import('./models')
      const { app, handlers } = createRouteHarness()
      registerModelRoutes(app as any, () => workspace)

      const response = await call(handlers.get('POST /api/models/:id/test'), { params: { id: '1' } })

      expect(response.statusCode).toBe(200)
      expect(response.body.status).toBe('network_error')
      expect(response.body.message).toContain('ConnectionRefused')

      const stored = JSON.parse(await readFile(join(workspace, 'models.json'), 'utf8'))
      expect(stored[0].health_status).toBe('network_error')
      expect(stored[0].last_tested_at).toBeTruthy()
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('lists models by upstream mode capability and key id filters', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      { id: 1, api_key_id: 10, provider: 'p', display_name: 'Chat', model_name: 'chat', capabilities: { chat: true }, health_status: 'healthy' },
      { id: 2, api_key_id: 10, provider: 'p', display_name: 'Vision', model_name: 'vision', capabilities: { vision: true, chat: true }, health_status: 'healthy' },
      { id: 3, api_key_id: 11, provider: 'p', display_name: 'Image', model_name: 'image', capabilities: { text_to_image: true }, health_status: 'healthy' },
    ]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const vision = await call(handlers.get('GET /api/models'), { query: { mode: 'vision' } })
    expect(vision.body.map((model: any) => model.id)).toEqual([2])

    const imageForKey = await call(handlers.get('GET /api/models'), { query: { mode: 'text_to_image', key_id: '11' } })
    expect(imageForKey.body.map((model: any) => model.id)).toEqual([3])
  })

  test('normalizes legacy model records when listing models', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      { id: 1, provider: 'legacy', display_name: 'Legacy Model', model_name: 'legacy-model' },
    ]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const response = await call(handlers.get('GET /api/models'))

    expect(response.body).toHaveLength(1)
    expect(response.body[0]).toMatchObject({
      id: 1,
      api_key_id: undefined,
      provider: 'legacy',
      display_name: 'Legacy Model',
      model_name: 'legacy-model',
      health_status: 'unknown',
      is_active: true,
      is_favorite: false,
      is_manual: false,
      context_ui_params: {},
      capabilities: {
        chat: false,
        vision: false,
        text_to_image: false,
        image_to_image: false,
        text_to_video: false,
        image_to_video: false,
      },
      last_tested_at: '',
    })
  })

  test('normalizes legacy camelCase model records when listing models', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      {
        id: 1,
        apiKeyId: 10,
        provider: 'legacy',
        displayName: 'Camel Model',
        modelName: 'camel-model',
        healthStatus: 'healthy',
        isActive: true,
        isFavorite: true,
        isManual: true,
        contextUiParams: { chat: [{ name: 'temperature' }] },
        lastTestedAt: '2026-06-01T00:00:00.000Z',
        capabilities: { chat: true },
      },
    ]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const response = await call(handlers.get('GET /api/models'))

    expect(response.body[0]).toMatchObject({
      id: 1,
      api_key_id: 10,
      provider: 'legacy',
      display_name: 'Camel Model',
      model_name: 'camel-model',
      health_status: 'healthy',
      is_active: true,
      is_favorite: true,
      is_manual: true,
      context_ui_params: { chat: [{ name: 'temperature' }] },
      last_tested_at: '2026-06-01T00:00:00.000Z',
      capabilities: {
        chat: true,
        vision: false,
        text_to_image: false,
        image_to_image: false,
        text_to_video: false,
        image_to_video: false,
      },
    })
  })

  test('supports upstream broad image and video mode aliases against six-task capabilities', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      { id: 1, api_key_id: 10, provider: 'p', display_name: 'T2I', model_name: 't2i', capabilities: { text_to_image: true }, health_status: 'healthy' },
      { id: 2, api_key_id: 10, provider: 'p', display_name: 'I2I', model_name: 'i2i', capabilities: { image_to_image: true }, health_status: 'healthy' },
      { id: 3, api_key_id: 10, provider: 'p', display_name: 'T2V', model_name: 't2v', capabilities: { text_to_video: true }, health_status: 'healthy' },
      { id: 4, api_key_id: 10, provider: 'p', display_name: 'I2V', model_name: 'i2v', capabilities: { image_to_video: true }, health_status: 'healthy' },
      { id: 5, api_key_id: 10, provider: 'p', display_name: 'Chat', model_name: 'chat', capabilities: { chat: true }, health_status: 'healthy' },
    ]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const image = await call(handlers.get('GET /api/models'), { query: { mode: 'image' } })
    const video = await call(handlers.get('GET /api/models'), { query: { mode: 'video' } })

    expect(image.body.map((model: any) => model.id)).toEqual([1, 2])
    expect(video.body.map((model: any) => model.id)).toEqual([3, 4])
  })

  test('registers FastAPI-compatible trailing slash aliases for model subroutes', async () => {
    const workspace = await tempWorkspace()
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    expect(handlers.has('POST /api/models/sync/:keyId/')).toBe(true)
    expect(handlers.has('PUT /api/models/:id/')).toBe(true)
    expect(handlers.has('DELETE /api/models/:id/')).toBe(true)
    expect(handlers.has('POST /api/models/:id/test/')).toBe(true)
    expect(handlers.has('PUT /api/models/:id/ui-params/')).toBe(true)
    expect(handlers.has('PUT /api/models/bulk/ui-params/')).toBe(true)
    expect(handlers.has('PATCH /api/models/:id/favorite/')).toBe(true)
  })

  test('blocks manual deletion of synced upstream models', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      { id: 1, api_key_id: 10, provider: 'p', display_name: 'Synced', model_name: 'synced', capabilities: { chat: true }, health_status: 'healthy', is_manual: false },
      { id: 2, api_key_id: 10, provider: 'p', display_name: 'Manual', model_name: 'manual', capabilities: { chat: true }, health_status: 'healthy', is_manual: true },
    ]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const blocked = await call(handlers.get('DELETE /api/models/:id'), { params: { id: '1' } })

    expect(blocked.statusCode).toBe(403)
    expect(blocked.body.error).toContain('官方同步')

    const allowed = await call(handlers.get('DELETE /api/models/:id'), { params: { id: '2' } })
    expect(allowed.statusCode).toBe(200)
    expect(allowed.body.ok).toBe(true)
    expect(allowed.body.status).toBe('success')
  })

  test('persists active state and hides disabled models from selectors', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      { id: 1, api_key_id: 10, provider: 'p', display_name: 'Active', model_name: 'active', capabilities: { chat: true }, health_status: 'healthy', is_active: true },
      { id: 2, api_key_id: 10, provider: 'p', display_name: 'Disabled', model_name: 'disabled', capabilities: { chat: true }, health_status: 'healthy', is_active: false },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 10, provider: 'p', key: 'sk-valid', is_active: true },
    ]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const listed = await call(handlers.get('GET /api/models'))
    expect(listed.body.map((model: any) => model.id)).toEqual([1])

    const created = await call(handlers.get('POST /api/models'), {
      body: {
        api_key_id: 10,
        provider: 'p',
        display_name: 'Created Disabled',
        model_name: 'created-disabled',
        capabilities: { chat: true },
        is_active: false,
      },
    })
    expect(created.body.status).toBe('success')
    expect(typeof created.body.id).toBe('number')
    expect(created.body.is_active).toBe(false)
  })

  test('accepts camelCase model fields from TS clients', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 10, provider: 'p', key: 'sk-valid', is_active: true },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const created = await call(handlers.get('POST /api/models'), {
      body: {
        apiKeyId: 10,
        provider: 'p',
        displayName: 'Camel Model',
        modelName: 'camel-model',
        capabilities: { chat: true },
        healthStatus: 'healthy',
        isActive: 'false',
        isFavorite: 'true',
        isManual: 'true',
        contextUiParams: { chat: [{ name: 'temperature' }] },
      },
    })

    expect(created.statusCode).toBe(200)
    expect(created.body).toMatchObject({
      status: 'success',
      api_key_id: 10,
      provider: 'p',
      display_name: 'Camel Model',
      model_name: 'camel-model',
      health_status: 'healthy',
      is_active: false,
      is_favorite: true,
      is_manual: true,
      context_ui_params: { chat: [{ name: 'temperature' }] },
    })

    const updated = await call(handlers.get('PUT /api/models/:id'), {
      params: { id: String(created.body.id) },
      body: {
        displayName: 'Camel Model Updated',
        modelName: 'camel-model-v2',
        isActive: 'true',
        isFavorite: 'false',
        contextUiParams: { chat: [{ name: 'top_p' }] },
      },
    })

    expect(updated.statusCode).toBe(200)
    expect(updated.body.model).toMatchObject({
      id: created.body.id,
      api_key_id: 10,
      display_name: 'Camel Model Updated',
      model_name: 'camel-model-v2',
      is_active: true,
      is_favorite: false,
      context_ui_params: { chat: [{ name: 'top_p' }] },
    })
  })

  test('requires an existing key when manually creating a bound model', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 10, provider: 'p', key: 'sk-valid', is_active: true },
    ]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const response = await call(handlers.get('POST /api/models'), {
      body: {
        api_key_id: 99,
        provider: 'p',
        display_name: 'Missing Key Model',
        model_name: 'missing-key',
        capabilities: { chat: true },
      },
    })

    expect(response.statusCode).toBe(404)
    expect(response.body.error).toContain('API Key')
  })

  test('rejects duplicate model names under the same key', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 10, provider: 'p', key: 'sk-valid', is_active: true },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      { id: 1, api_key_id: 10, provider: 'p', display_name: 'Existing', model_name: 'same-code', capabilities: { chat: true }, health_status: 'healthy', is_active: true },
    ]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const response = await call(handlers.get('POST /api/models'), {
      body: {
        api_key_id: 10,
        provider: 'p',
        display_name: 'Duplicate',
        model_name: 'same-code',
        capabilities: { chat: true },
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.body.error).toContain('相同代号')
  })

  test('updates models with upstream status payload while preserving route id', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      {
        id: 1,
        api_key_id: 10,
        provider: 'p',
        display_name: 'Old Name',
        model_name: 'old-code',
        capabilities: { chat: true },
        health_status: 'healthy',
        is_active: true,
      },
    ]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const response = await call(handlers.get('PUT /api/models/:id'), {
      params: { id: '1' },
      body: {
        id: 99,
        display_name: 'New Name',
        model_name: 'new-code',
        capabilities: { chat: true, vision: true },
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.status).toBe('success')
    expect(response.body.model).toMatchObject({
      id: 1,
      display_name: 'New Name',
      model_name: 'new-code',
      capabilities: { chat: true, vision: true },
    })
    const stored = JSON.parse(await readFile(join(workspace, 'models.json'), 'utf8'))
    expect(stored.map((model: any) => model.id)).toEqual([1])
    expect(stored[0].display_name).toBe('New Name')
  })

  test('preserves model ownership and UI metadata when updating upstream editable fields', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      {
        id: 1,
        api_key_id: 10,
        provider: 'p',
        display_name: 'Old Name',
        model_name: 'old-code',
        capabilities: { chat: true },
        health_status: 'healthy',
        is_active: true,
        is_favorite: true,
        is_manual: false,
        context_ui_params: { chat: [{ name: 'temperature', type: 'slider' }] },
        last_tested_at: '2026-01-01T00:00:00.000Z',
      },
    ]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const response = await call(handlers.get('PUT /api/models/:id'), {
      params: { id: '1' },
      body: {
        display_name: 'New Name',
        model_name: 'new-code',
        capabilities: { chat: true, vision: true },
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.model).toMatchObject({
      id: 1,
      api_key_id: 10,
      provider: 'p',
      display_name: 'New Name',
      model_name: 'new-code',
      capabilities: { chat: true, vision: true },
      is_favorite: true,
      is_manual: false,
      context_ui_params: { chat: [{ name: 'temperature', type: 'slider' }] },
      last_tested_at: '2026-01-01T00:00:00.000Z',
    })
  })

  test('returns FastAPI-compatible detail field for model management errors', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 10, provider: 'p', key: 'sk-valid', is_active: true },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      {
        id: 1,
        api_key_id: 10,
        provider: 'p',
        display_name: 'Synced',
        model_name: 'same-code',
        capabilities: { chat: true },
        health_status: 'healthy',
        is_manual: false,
      },
    ]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const missingKey = await call(handlers.get('POST /api/models'), {
      body: {
        api_key_id: 99,
        provider: 'p',
        display_name: 'Missing Key Model',
        model_name: 'missing-key',
        capabilities: { chat: true },
      },
    })
    expect(missingKey.statusCode).toBe(404)
    expect(missingKey.body).toEqual({
      error: '绑定的 API Key 不存在',
      detail: '绑定的 API Key 不存在',
    })

    const duplicate = await call(handlers.get('POST /api/models'), {
      body: {
        api_key_id: 10,
        provider: 'p',
        display_name: 'Duplicate',
        model_name: 'same-code',
        capabilities: { chat: true },
      },
    })
    expect(duplicate.statusCode).toBe(400)
    expect(duplicate.body).toEqual({
      error: '已存在相同代号的模型，请勿重复添加',
      detail: '已存在相同代号的模型，请勿重复添加',
    })

    const blockedDelete = await call(handlers.get('DELETE /api/models/:id'), {
      params: { id: '1' },
    })
    expect(blockedDelete.statusCode).toBe(403)
    expect(blockedDelete.body).toEqual({
      error: '官方同步的模型禁止手动删除',
      detail: '官方同步的模型禁止手动删除',
    })
  })

  test('updates ui params for a single model without rewriting siblings', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      {
        id: 1,
        api_key_id: 10,
        provider: 'p',
        display_name: 'Tuned',
        model_name: 'tuned',
        capabilities: { chat: true },
        health_status: 'healthy',
        context_ui_params: { chat: [{ name: 'old' }] },
      },
      {
        id: 2,
        api_key_id: 10,
        provider: 'p',
        display_name: 'Sibling',
        model_name: 'sibling',
        capabilities: { chat: true },
        health_status: 'healthy',
        context_ui_params: { chat: [{ name: 'kept' }] },
      },
    ]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const handler = handlers.get('PUT /api/models/:id/ui-params')
    expect(handler).toBeDefined()

    const response = await call(handler, {
      params: { id: '1' },
      body: {
        context_ui_params: {
          chat: [
            { name: 'temperature', label: '温度', type: 'slider' },
            { name: 'max_tokens', label: '最大输出', type: 'number' },
          ],
        },
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ status: 'success' })

    const stored = JSON.parse(await readFile(join(workspace, 'models.json'), 'utf8'))
    expect(stored[0].display_name).toBe('Tuned')
    expect(stored[0].context_ui_params).toEqual({
      chat: [
        { name: 'temperature', label: '温度', type: 'slider' },
        { name: 'max_tokens', label: '最大输出', type: 'number' },
      ],
    })
    expect(stored[1].context_ui_params).toEqual({ chat: [{ name: 'kept' }] })
  })

  test('accepts camelCase contextUiParams for single model ui params', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      {
        id: 1,
        api_key_id: 10,
        provider: 'p',
        display_name: 'Tuned',
        model_name: 'tuned',
        capabilities: { chat: true },
        health_status: 'healthy',
        context_ui_params: { chat: [{ name: 'old' }] },
      },
    ]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const response = await call(handlers.get('PUT /api/models/:id/ui-params'), {
      params: { id: '1' },
      body: {
        contextUiParams: {
          chat: [{ name: 'temperature', type: 'slider' }],
        },
      },
    })

    expect(response.statusCode).toBe(200)
    const stored = JSON.parse(await readFile(join(workspace, 'models.json'), 'utf8'))
    expect(stored[0].context_ui_params).toEqual({
      chat: [{ name: 'temperature', type: 'slider' }],
    })
  })

  test('bulk ui params only update matching key and capability models', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      {
        id: 1,
        api_key_id: 10,
        provider: 'p',
        display_name: 'Target Chat',
        model_name: 'target-chat',
        capabilities: { chat: true },
        health_status: 'healthy',
        context_ui_params: {},
      },
      {
        id: 2,
        api_key_id: 10,
        provider: 'p',
        display_name: 'Same Key Vision',
        model_name: 'same-key-vision',
        capabilities: { vision: true },
        health_status: 'healthy',
        context_ui_params: {},
      },
      {
        id: 3,
        api_key_id: 11,
        provider: 'p',
        display_name: 'Other Key Chat',
        model_name: 'other-key-chat',
        capabilities: { chat: true },
        health_status: 'healthy',
        context_ui_params: { chat: [{ name: 'existing' }] },
      },
    ]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const response = await call(handlers.get('PUT /api/models/bulk/ui-params'), {
      body: {
        api_key_id: 10,
        capability: 'chat',
        ui_params_array: [{ name: 'temperature', type: 'slider' }],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.message).toContain('1 个模型')

    const stored = JSON.parse(await readFile(join(workspace, 'models.json'), 'utf8'))
    expect(stored[0].context_ui_params).toEqual({
      chat: [{ name: 'temperature', type: 'slider' }],
    })
    expect(stored[1].context_ui_params).toEqual({})
    expect(stored[2].context_ui_params).toEqual({ chat: [{ name: 'existing' }] })
  })

  test('accepts camelCase bulk ui params payload', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      {
        id: 1,
        api_key_id: 10,
        provider: 'p',
        display_name: 'Target Chat',
        model_name: 'target-chat',
        capabilities: { chat: true },
        health_status: 'healthy',
        context_ui_params: {},
      },
    ]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const response = await call(handlers.get('PUT /api/models/bulk/ui-params'), {
      body: {
        apiKeyId: 10,
        capability: 'chat',
        uiParamsArray: [{ name: 'temperature', type: 'slider' }],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.message).toContain('1 个模型')
    const stored = JSON.parse(await readFile(join(workspace, 'models.json'), 'utf8'))
    expect(stored[0].context_ui_params).toEqual({
      chat: [{ name: 'temperature', type: 'slider' }],
    })
  })

  test('does not rewrite model storage when bulk ui params match no models', async () => {
    const workspace = await tempWorkspace()
    const initial = '[{"id":1,"api_key_id":10,"provider":"p","display_name":"Vision","model_name":"vision","capabilities":{"vision":true},"health_status":"healthy","context_ui_params":{}}]'
    await writeFile(join(workspace, 'models.json'), initial)
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const response = await call(handlers.get('PUT /api/models/bulk/ui-params'), {
      body: {
        api_key_id: 10,
        capability: 'chat',
        ui_params_array: [{ name: 'temperature', type: 'slider' }],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.message).toContain('0 个模型')
    expect(await readFile(join(workspace, 'models.json'), 'utf8')).toBe(initial)
  })

  test('favorite toggle returns upstream status payload and persists the flag', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      {
        id: 1,
        api_key_id: 10,
        provider: 'p',
        display_name: 'Favorite Candidate',
        model_name: 'favorite-candidate',
        capabilities: { chat: true },
        health_status: 'healthy',
        is_favorite: false,
      },
    ]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const response = await call(handlers.get('PATCH /api/models/:id/favorite'), {
      params: { id: '1' },
      body: { is_favorite: true },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({ status: 'success', is_favorite: true })

    const stored = JSON.parse(await readFile(join(workspace, 'models.json'), 'utf8'))
    expect(stored[0].is_favorite).toBe(true)
  })

  test('accepts camelCase isFavorite when toggling favorite status', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      {
        id: 1,
        api_key_id: 10,
        provider: 'p',
        display_name: 'Favorite Candidate',
        model_name: 'favorite-candidate',
        capabilities: { chat: true },
        health_status: 'healthy',
        is_favorite: false,
      },
    ]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const response = await call(handlers.get('PATCH /api/models/:id/favorite'), {
      params: { id: '1' },
      body: { isFavorite: true },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({ status: 'success', is_favorite: true })
    const stored = JSON.parse(await readFile(join(workspace, 'models.json'), 'utf8'))
    expect(stored[0].is_favorite).toBe(true)
  })

  test('does not rewrite model storage when updating a missing model', async () => {
    const workspace = await tempWorkspace()
    const initial = '[{"id":1,"api_key_id":10,"provider":"p","display_name":"Keep","model_name":"keep","capabilities":{"chat":true},"health_status":"healthy"}]'
    await writeFile(join(workspace, 'models.json'), initial)

    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const response = await call(handlers.get('PUT /api/models/:id'), {
      params: { id: '404' },
      body: { display_name: 'Missing', model_name: 'missing', capabilities: { chat: true } },
    })

    expect(response.statusCode).toBe(404)
    expect(await readFile(join(workspace, 'models.json'), 'utf8')).toBe(initial)
  })

  test('does not rewrite model storage when toggling favorite on a missing model', async () => {
    const workspace = await tempWorkspace()
    const initial = '[{"id":1,"api_key_id":10,"provider":"p","display_name":"Keep","model_name":"keep","capabilities":{"chat":true},"health_status":"healthy","is_favorite":false}]'
    await writeFile(join(workspace, 'models.json'), initial)

    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const response = await call(handlers.get('PATCH /api/models/:id/favorite'), {
      params: { id: '404' },
      body: { is_favorite: true },
    })

    expect(response.statusCode).toBe(404)
    expect(await readFile(join(workspace, 'models.json'), 'utf8')).toBe(initial)
  })

  test('registers the upstream model sync route and syncs models for a key', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 10, provider: 'p', key: 'sk-valid', is_active: true },
    ]))
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'p', display_name: 'Provider', api_format: 'openai_compatible', auth_type: 'bearer', default_base_url: 'https://provider.example/v1', supported_modalities: ['chat'], is_active: true },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const handler = handlers.get('POST /api/models/sync/:keyId')
    expect(handler).toBeDefined()

    const response = await call(handler, {
      params: { keyId: '10' },
      body: {
        data: [
          { id: 'gpt-test', display_name: 'GPT Test' },
        ],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.status).toBe('success')
    expect(response.body.message).toContain('同步完成')

    const stored = JSON.parse(await readFile(join(workspace, 'models.json'), 'utf8'))
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({
      api_key_id: 10,
      provider: 'p',
      model_name: 'gpt-test',
      display_name: 'GPT Test',
      is_manual: false,
      is_active: true,
    })
  })
})

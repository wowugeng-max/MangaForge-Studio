import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { buildProbeRequest, determineProbeType } from './models'
import { resetOpenAIResponsesCreateForTest, setOpenAIResponsesCreateForTest } from '../llm/openai-responses-sdk'

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

async function writeMuyuanCodexFixture(workspace: string) {
  await writeFile(join(workspace, 'providers.json'), JSON.stringify([
    {
      id: 'jun',
      display_name: 'jun',
      service_type: 'llm',
      api_format: 'codex_responses',
      auth_type: 'bearer',
      supported_modalities: ['chat'],
      default_base_url: 'https://muyuan.do/v1',
      is_active: true,
    },
  ]))
  await writeFile(join(workspace, 'keys.json'), JSON.stringify([
    { id: 6, provider: 'jun', key: 'sk-muyuan-test', is_active: true },
  ]))
  await writeFile(join(workspace, 'models.json'), JSON.stringify([
    {
      id: 131,
      api_key_id: 6,
      provider: 'jun',
      display_name: 'gpt-5.4',
      model_name: 'gpt-5.4',
      capabilities: { chat: true },
      health_status: 'unknown',
    },
  ]))
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
  resetOpenAIResponsesCreateForTest()
})

describe('model health probes b', () => {
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

  test('single model runtime params endpoint can persist protocol override', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      {
        id: 1,
        api_key_id: 10,
        provider: 'p',
        display_name: 'Claude',
        model_name: 'claude-sonnet',
        api_format: '',
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
        api_format: 'claude_code',
        context_ui_params: {
          context_window: 1_000_000,
          max_context: 1_000_000,
          chat: [{ name: 'context_window', default: 1_000_000 }],
        },
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ status: 'success' })

    const stored = JSON.parse(await readFile(join(workspace, 'models.json'), 'utf8'))
    expect(stored[0].api_format).toBe('claude_code')
    expect(stored[0].context_ui_params).toMatchObject({
      context_window: 1_000_000,
      max_context: 1_000_000,
    })
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

  test('preserves model-level protocol override when listing and updating models', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      {
        id: 1,
        api_key_id: 10,
        provider: 'mixed',
        display_name: 'Claude Opus',
        model_name: 'claude-opus-4-8',
        api_format: 'claude_code',
        capabilities: { chat: true },
      },
    ]))
    const { registerModelRoutes } = await import('./models')
    const { app, handlers } = createRouteHarness()
    registerModelRoutes(app as any, () => workspace)

    const listed = await call(handlers.get('GET /api/models'))
    expect(listed.body[0].api_format).toBe('claude_code')

    const updated = await call(handlers.get('PUT /api/models/:id'), {
      params: { id: '1' },
      body: {
        display_name: 'Claude Opus Updated',
        model_name: 'claude-opus-4-8',
        api_format: 'openai_compatible',
        capabilities: { chat: true },
      },
    })

    expect(updated.statusCode).toBe(200)
    expect(updated.body.model.api_format).toBe('openai_compatible')
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

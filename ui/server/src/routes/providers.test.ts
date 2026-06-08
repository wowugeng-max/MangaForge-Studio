import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-provider-route-'))
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
  }
  await handler({ params: {}, query: {}, body: {}, ...req }, res)
  return res
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('provider routes', () => {
  test('lists providers by upstream service_type filter', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'llm-a', display_name: 'LLM A', service_type: 'llm', api_format: 'openai_compatible', auth_type: 'bearer', default_base_url: 'https://llm.example', supported_modalities: ['chat'], is_active: true },
      { id: 'comfy-a', display_name: 'Comfy A', service_type: 'comfyui', api_format: 'comfyui', auth_type: 'none', default_base_url: 'http://comfy.example', supported_modalities: ['text_to_image'], is_active: true },
    ]))

    const { registerProviderRoutes } = await import('./providers')
    const { app, handlers } = createRouteHarness()
    registerProviderRoutes(app as any, () => workspace)

    const response = await call(handlers.get('GET /api/providers'), { query: { service_type: 'comfyui' } })

    expect(response.body.map((provider: any) => provider.id)).toEqual(['comfy-a'])
  })

  test('normalizes legacy provider records when listing providers', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'legacy-anyrouter' },
    ]))

    const { registerProviderRoutes } = await import('./providers')
    const { app, handlers } = createRouteHarness()
    registerProviderRoutes(app as any, () => workspace)

    const response = await call(handlers.get('GET /api/providers'))

    expect(response.body).toEqual([
      {
        id: 'legacy-anyrouter',
        display_name: 'legacy-anyrouter',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'Bearer',
        response_mode: 'auto',
        supported_modalities: [],
        default_base_url: '',
        is_active: true,
        icon: '',
        endpoints: {},
        custom_headers: {},
      },
    ])
  })

  test('normalizes legacy camelCase provider records when listing providers', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      {
        id: 'camel-provider',
        displayName: 'Camel Provider',
        serviceType: 'comfyui',
        apiFormat: 'comfyui',
        authType: 'none',
        responseMode: 'stream',
        supportedModalities: ['text_to_image'],
        defaultBaseUrl: 'http://comfy.local',
        isActive: false,
        customHeaders: { 'X-Test': '1' },
      },
    ]))

    const { registerProviderRoutes } = await import('./providers')
    const { app, handlers } = createRouteHarness()
    registerProviderRoutes(app as any, () => workspace)

    const response = await call(handlers.get('GET /api/providers'))

    expect(response.body[0]).toMatchObject({
      id: 'camel-provider',
      display_name: 'Camel Provider',
      service_type: 'comfyui',
      api_format: 'comfyui',
      auth_type: 'none',
      response_mode: 'stream',
      supported_modalities: ['text_to_image'],
      default_base_url: 'http://comfy.local',
      is_active: false,
      custom_headers: { 'X-Test': '1' },
    })
  })

  test('rejects duplicate provider ids like upstream', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'openai', display_name: 'OpenAI', service_type: 'llm', api_format: 'openai_compatible', auth_type: 'bearer', default_base_url: 'https://api.example/v1', supported_modalities: ['chat'], is_active: true },
    ]))

    const { registerProviderRoutes } = await import('./providers')
    const { app, handlers } = createRouteHarness()
    registerProviderRoutes(app as any, () => workspace)

    const response = await call(handlers.get('POST /api/providers'), {
      body: {
        id: 'openai',
        display_name: 'Duplicate OpenAI',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        default_base_url: 'https://duplicate.example/v1',
        supported_modalities: ['chat'],
        is_active: true,
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.body.error).toContain('厂商标识')
  })

  test('creates minimal providers with upstream defaults and status payload', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([]))

    const { registerProviderRoutes } = await import('./providers')
    const { app, handlers } = createRouteHarness()
    registerProviderRoutes(app as any, () => workspace)

    const response = await call(handlers.get('POST /api/providers'), {
      body: {
        id: 'minimal',
        display_name: 'Minimal Provider',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({
      status: 'success',
      message: '新厂商配置已注入',
      provider: {
        id: 'minimal',
        api_format: 'openai_compatible',
        auth_type: 'Bearer',
        service_type: 'llm',
        is_active: true,
      },
    })

    const stored = JSON.parse(await readFile(join(workspace, 'providers.json'), 'utf8'))
    expect(stored[0]).toMatchObject(response.body.provider)
  })

  test('accepts camelCase provider fields from TS clients', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([]))

    const { registerProviderRoutes } = await import('./providers')
    const { app, handlers } = createRouteHarness()
    registerProviderRoutes(app as any, () => workspace)

    const created = await call(handlers.get('POST /api/providers'), {
      body: {
        id: 'camel',
        displayName: 'Camel Provider',
        serviceType: 'llm',
        apiFormat: 'codex_responses',
        authType: 'bearer',
        responseMode: 'stream',
        supportedModalities: ['chat', 'vision'],
        defaultBaseUrl: 'https://api.example/v1',
        isActive: 'false',
        customHeaders: { 'X-Provider': 'camel' },
      },
    })

    expect(created.statusCode).toBe(200)
    expect(created.body.provider).toMatchObject({
      id: 'camel',
      display_name: 'Camel Provider',
      service_type: 'llm',
      api_format: 'codex_responses',
      auth_type: 'bearer',
      response_mode: 'stream',
      supported_modalities: ['chat', 'vision'],
      default_base_url: 'https://api.example/v1',
      is_active: false,
      custom_headers: { 'X-Provider': 'camel' },
    })

    const updated = await call(handlers.get('PUT /api/providers/:id'), {
      params: { id: 'camel' },
      body: {
        displayName: 'Camel Provider Updated',
        defaultBaseUrl: 'https://api-updated.example/v1',
        isActive: 'false',
      },
    })

    expect(updated.statusCode).toBe(200)
    expect(updated.body.provider).toMatchObject({
      id: 'camel',
      display_name: 'Camel Provider Updated',
      default_base_url: 'https://api-updated.example/v1',
      is_active: false,
      api_format: 'codex_responses',
      response_mode: 'stream',
    })
  })

  test('registers FastAPI-compatible trailing slash aliases for provider subroutes', async () => {
    const workspace = await tempWorkspace()
    const { registerProviderRoutes } = await import('./providers')
    const { app, handlers } = createRouteHarness()
    registerProviderRoutes(app as any, () => workspace)

    expect(handlers.has('PUT /api/providers/:id/')).toBe(true)
    expect(handlers.has('DELETE /api/providers/:id/')).toBe(true)
  })

  test('updates providers with status payload while preserving omitted protocol fields', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      {
        id: 'openai',
        display_name: 'OpenAI',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'Bearer',
        response_mode: 'stream',
        default_base_url: 'https://api.example/v1',
        supported_modalities: ['chat'],
        is_active: true,
        endpoints: { chat: '/chat/completions' },
        custom_headers: { 'X-Test': '1' },
      },
    ]))

    const { registerProviderRoutes } = await import('./providers')
    const { app, handlers } = createRouteHarness()
    registerProviderRoutes(app as any, () => workspace)

    const response = await call(handlers.get('PUT /api/providers/:id'), {
      params: { id: 'openai' },
      body: {
        display_name: 'OpenAI Updated',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({
      status: 'success',
      message: '配置已更新',
      provider: {
        id: 'openai',
        display_name: 'OpenAI Updated',
        api_format: 'openai_compatible',
        auth_type: 'Bearer',
        response_mode: 'stream',
        endpoints: { chat: '/chat/completions' },
        custom_headers: { 'X-Test': '1' },
      },
    })

    const stored = JSON.parse(await readFile(join(workspace, 'providers.json'), 'utf8'))
    expect(stored[0]).toMatchObject(response.body.provider)
  })

  test('does not rename provider id from update request body', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      {
        id: 'openai',
        display_name: 'OpenAI',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'Bearer',
        response_mode: 'stream',
        default_base_url: 'https://api.example/v1',
        supported_modalities: ['chat'],
        is_active: true,
      },
    ]))

    const { registerProviderRoutes } = await import('./providers')
    const { app, handlers } = createRouteHarness()
    registerProviderRoutes(app as any, () => workspace)

    const response = await call(handlers.get('PUT /api/providers/:id'), {
      params: { id: 'openai' },
      body: {
        id: 'renamed',
        display_name: 'OpenAI Updated',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.provider).toMatchObject({
      id: 'openai',
      display_name: 'OpenAI Updated',
    })
    const stored = JSON.parse(await readFile(join(workspace, 'providers.json'), 'utf8'))
    expect(stored.map((provider: any) => provider.id)).toEqual(['openai'])
    expect(stored[0].display_name).toBe('OpenAI Updated')
  })

  test('does not rewrite provider storage when updating a missing provider', async () => {
    const workspace = await tempWorkspace()
    const initial = '[{"id":"openai","display_name":"OpenAI","service_type":"llm","api_format":"openai_compatible","auth_type":"Bearer","supported_modalities":["chat"],"is_active":true}]'
    await writeFile(join(workspace, 'providers.json'), initial)

    const { registerProviderRoutes } = await import('./providers')
    const { app, handlers } = createRouteHarness()
    registerProviderRoutes(app as any, () => workspace)

    const response = await call(handlers.get('PUT /api/providers/:id'), {
      params: { id: 'missing' },
      body: { display_name: 'Missing Provider' },
    })

    expect(response.statusCode).toBe(404)
    expect(await readFile(join(workspace, 'providers.json'), 'utf8')).toBe(initial)
  })

  test('deletes unreferenced providers with upstream status payload while keeping local ok flag', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'unused', display_name: 'Unused', service_type: 'llm', api_format: 'openai_compatible', auth_type: 'Bearer', supported_modalities: ['chat'], is_active: true },
      { id: 'kept', display_name: 'Kept', service_type: 'llm', api_format: 'openai_compatible', auth_type: 'Bearer', supported_modalities: ['chat'], is_active: true },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([]))

    const { registerProviderRoutes } = await import('./providers')
    const { app, handlers } = createRouteHarness()
    registerProviderRoutes(app as any, () => workspace)

    const response = await call(handlers.get('DELETE /api/providers/:id'), {
      params: { id: 'unused' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({ ok: true, status: 'success' })
    const stored = JSON.parse(await readFile(join(workspace, 'providers.json'), 'utf8'))
    expect(stored.map((provider: any) => provider.id)).toEqual(['kept'])
  })

  test('does not rewrite provider storage when deleting a missing provider', async () => {
    const workspace = await tempWorkspace()
    const initial = '[{"id":"openai","display_name":"OpenAI","service_type":"llm","api_format":"openai_compatible","auth_type":"Bearer","supported_modalities":["chat"],"is_active":true}]'
    await writeFile(join(workspace, 'providers.json'), initial)
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([]))

    const { registerProviderRoutes } = await import('./providers')
    const { app, handlers } = createRouteHarness()
    registerProviderRoutes(app as any, () => workspace)

    const response = await call(handlers.get('DELETE /api/providers/:id'), {
      params: { id: 'missing' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({ ok: true, status: 'success' })
    expect(await readFile(join(workspace, 'providers.json'), 'utf8')).toBe(initial)
  })

  test('returns FastAPI-compatible detail field for provider management errors', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'openai', display_name: 'OpenAI', service_type: 'llm', api_format: 'openai_compatible', auth_type: 'Bearer', supported_modalities: ['chat'], is_active: true },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 3, provider: 'openai', key: 'sk-valid', is_active: true },
    ]))

    const { registerProviderRoutes } = await import('./providers')
    const { app, handlers } = createRouteHarness()
    registerProviderRoutes(app as any, () => workspace)

    const duplicate = await call(handlers.get('POST /api/providers'), {
      body: { id: 'openai', display_name: 'Duplicate OpenAI' },
    })
    expect(duplicate.statusCode).toBe(400)
    expect(duplicate.body).toEqual({
      error: '厂商标识 ID 已存在',
      detail: '厂商标识 ID 已存在',
    })

    const missingUpdate = await call(handlers.get('PUT /api/providers/:id'), {
      params: { id: 'missing' },
      body: { display_name: 'Missing' },
    })
    expect(missingUpdate.statusCode).toBe(404)
    expect(missingUpdate.body).toEqual({
      error: 'provider not found',
      detail: 'provider not found',
    })

    const blockedDelete = await call(handlers.get('DELETE /api/providers/:id'), {
      params: { id: 'openai' },
    })
    expect(blockedDelete.statusCode).toBe(409)
    expect(blockedDelete.body.error).toContain('API Key')
    expect(blockedDelete.body.detail).toBe(blockedDelete.body.error)
  })
})

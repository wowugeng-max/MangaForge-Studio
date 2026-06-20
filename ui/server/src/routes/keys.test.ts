import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { buildFallbackTestUrl } from './keys'
import { resetOpenAIResponsesCreateForTest, setOpenAIResponsesCreateForTest } from '../llm/openai-responses-sdk'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-key-route-'))
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
  await handler({ body: {}, params: {}, query: {}, ...req }, res)
  return res
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
  resetOpenAIResponsesCreateForTest()
})

describe('provider key protocol tests', () => {
  test('uses OpenAI-compatible model listing endpoint for plain fallback key tests', () => {
    expect(buildFallbackTestUrl('https://gateway.example/v1', 'openai_compatible')).toBe('https://gateway.example/v1/models')
    expect(buildFallbackTestUrl('https://gateway.example', 'openai_compatible')).toBe('https://gateway.example/v1/models')
  })

  test('uses Responses endpoint for Codex-style provider key tests', () => {
    expect(buildFallbackTestUrl('https://api.openai.com/v1', 'codex_responses')).toBe('https://api.openai.com/v1/responses')
    expect(buildFallbackTestUrl('https://gateway.example.com', 'openai_responses')).toBe('https://gateway.example.com/v1/responses')
  })

  test('uses Gemini native generateContent endpoint for fallback key tests', () => {
    expect(buildFallbackTestUrl('https://generativelanguage.googleapis.com/v1beta', 'gemini_native')).toBe('https://generativelanguage.googleapis.com/v1beta/models/test:generateContent')
  })

  test('keeps AnyRouter top Claude probes on the configured Claude Code gateway URL', () => {
    expect(buildFallbackTestUrl('https://anyrouter.top', 'claude_code')).toBe('https://anyrouter.top/v1/messages')
    expect(buildFallbackTestUrl('https://anyrouter.top/v1', 'claude_code')).toBe('https://anyrouter.top/v1/messages')
    expect(buildFallbackTestUrl('https://anyrouter.dev/api', 'claude_code')).toBe('https://anyrouter.dev/api/v1/messages')
  })

  test('fallback key probe sends Codex CLI-style request body for codex providers', () => {
    const source = readFileSync(join(import.meta.dir, 'keys.ts'), 'utf8')

    expect(source).toContain("provider.endpoints?.responses")
    expect(source).toContain('buildCodexResponsesBody')
    expect(source).not.toContain("input: [{ role: 'user', content: 'ping' }]")
  })

  test('fallback key probe sends AnyRouter Codex Responses requests through fetch SSE transport', async () => {
    const { probeKeyFallback } = await import('./keys')
    const provider = {
      id: 'any',
      display_name: 'AnyRouter',
      api_format: 'codex_responses',
      auth_type: 'bearer',
      default_base_url: 'https://anyrouter.top/v1',
      custom_headers: { 'X-Provider': 'anyrouter' },
      endpoints: {},
    }
    const key = {
      id: 1,
      provider: 'any',
      key: 'sk-test',
      is_active: true,
      quota_total: 0,
      quota_used: 0,
      tags: [],
    } as any

    const calls: any[] = []
    const previousFetch = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({
        url: String(url),
        headers: init?.headers as Record<string, string>,
        body: JSON.parse(String(init?.body || '{}')),
      })
      return new Response([
        'data: {"type":"response.output_text.delta","delta":"OK"}',
        'data: {"type":"response.completed","response":{"status":"completed"}}',
        'data: [DONE]',
        '',
      ].join('\n\n'), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
    }) as any
    setOpenAIResponsesCreateForTest(async call => {
      throw new Error(`OpenAI SDK should not be used for AnyRouter Codex Responses key probes: ${call.baseURL}`)
    })

    try {
      const result = await probeKeyFallback(provider, key)

      expect(result.valid).toBe(true)
      expect(calls).toHaveLength(1)
      expect(calls[0].url).toBe('https://anyrouter.top/v1/responses')
      expect(calls[0].headers.Authorization).toBe('Bearer sk-test')
      expect(calls[0].headers.Accept).toBe('text/event-stream')
      expect(calls[0].headers['X-Provider']).toBe('anyrouter')
      expect(calls[0].body).toMatchObject({
        model: 'gpt-5.5',
        input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'ping' }] }],
        tools: [],
        tool_choice: 'auto',
        parallel_tool_calls: true,
        store: false,
        stream: true,
        include: ['reasoning.encrypted_content'],
        reasoning: { effort: 'xhigh' },
        instructions: 'You are Codex, a coding agent based on GPT-5.',
        text: { format: { type: 'text' } },
      })
      expect(calls[0].body.prompt_cache_key).toBeTruthy()
      expect(calls[0].body.client_metadata).toMatchObject({
        session_id: calls[0].body.prompt_cache_key,
        thread_id: calls[0].body.prompt_cache_key,
      })
      expect(calls[0].body).not.toHaveProperty('messages')
      expect(calls[0].body).not.toHaveProperty('temperature')
      expect(calls[0].body).not.toHaveProperty('max_tokens')
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('fallback key probe sends Codex client compatibility fields through the OpenAI SDK transport', async () => {
    const { probeKeyFallback } = await import('./keys')
    const provider = {
      id: 'codex-proxy',
      display_name: 'Codex Proxy',
      api_format: 'codex_responses',
      auth_type: 'bearer',
      default_base_url: 'https://api.openai.com/v1',
      probe_model: 'gpt-5-codex',
      custom_headers: { 'X-Provider': 'codex-proxy' },
      endpoints: {},
    }
    const key = {
      id: 1,
      provider: 'codex-proxy',
      key: 'sk-test',
      is_active: true,
      quota_total: 0,
      quota_used: 0,
      tags: [],
    } as any

    let capturedCall: any = null
    const previousFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new Error('fetch should not be used for OpenAI SDK Codex Responses key probes')
    }) as any
    setOpenAIResponsesCreateForTest(async call => {
      capturedCall = call
      return { output_text: 'OK', status: 'completed' }
    })

    try {
      const result = await probeKeyFallback(provider, key)

      expect(result.valid).toBe(true)
      expect(capturedCall).toMatchObject({
        apiKey: 'sk-test',
        baseURL: 'https://api.openai.com/v1',
        headers: { 'X-Provider': 'codex-proxy' },
      })
      expect(capturedCall.body).toMatchObject({
        model: 'gpt-5-codex',
        input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'ping' }] }],
        tools: [],
        tool_choice: 'auto',
        parallel_tool_calls: true,
        store: false,
        stream: false,
        include: ['reasoning.encrypted_content'],
        instructions: 'You are Codex, a coding agent based on GPT-5.',
        text: { format: { type: 'text' } },
      })
      expect(capturedCall.body.prompt_cache_key).toBeTruthy()
      expect(capturedCall.body.client_metadata).toMatchObject({
        session_id: capturedCall.body.prompt_cache_key,
        thread_id: capturedCall.body.prompt_cache_key,
      })
      expect(capturedCall.body).not.toHaveProperty('messages')
      expect(capturedCall.body).not.toHaveProperty('temperature')
      expect(capturedCall.body).not.toHaveProperty('max_tokens')
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('does not shadow the upstream model sync route from key routes', () => {
    const source = readFileSync(join(import.meta.dir, 'keys.ts'), 'utf8')

    expect(source).not.toContain('/api/models/sync/:keyId')
    expect(source).not.toContain("'/models/sync/:keyId'")
  })

  test('preserves ComfyUI base_url when creating an execution key', async () => {
    const workspace = await tempWorkspace()
    const { registerKeyRoutes } = await import('./keys')
    const { app, handlers } = createRouteHarness()
    registerKeyRoutes(app as any, () => workspace)

    const res = await call(handlers.get('POST /api/keys'), {
      body: {
        provider: 'local-comfy',
        key: '',
        description: '本地 GPU',
        is_active: true,
        base_url: 'http://127.0.0.1:8188',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      provider: 'local-comfy',
      base_url: 'http://127.0.0.1:8188',
    })
  })

  test('creates keys with upstream quota and routing metadata defaults', async () => {
    const workspace = await tempWorkspace()
    const { registerKeyRoutes } = await import('./keys')
    const { app, handlers } = createRouteHarness()
    registerKeyRoutes(app as any, () => workspace)

    const res = await call(handlers.get('POST /api/keys'), {
      body: {
        provider: 'openai',
        key: 'sk-quota',
        description: 'quota key',
        quota_total: 120,
        quota_unit: 'credits',
        price_per_call: 0.03,
        priority: 7,
        service_type: 'llm',
        tags: ['paid'],
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      provider: 'openai',
      quota_total: 120,
      quota_remaining: 120,
      quota_unit: 'credits',
      price_per_call: 0.03,
      priority: 7,
      service_type: 'llm',
      tags: ['paid'],
    })

    const stored = JSON.parse(await readFile(join(workspace, 'keys.json'), 'utf8'))
    expect(stored[0]).toMatchObject(res.body)
  })

  test('accepts camelCase key fields from TS clients', async () => {
    const workspace = await tempWorkspace()
    const { registerKeyRoutes } = await import('./keys')
    const { app, handlers } = createRouteHarness()
    registerKeyRoutes(app as any, () => workspace)

    const created = await call(handlers.get('POST /api/keys'), {
      body: {
        provider: 'anyrouter',
        apiKey: 'sk-camel',
        baseUrl: 'https://anyrouter.example/v1',
        description: 'camel key',
        isActive: 'false',
        priority: 9,
        quotaTotal: 200,
        quotaRemaining: 150,
        quotaUsed: 50,
        quotaUnit: 'tokens',
        pricePerCall: 0.12,
        serviceType: 'llm',
        successCount: 3,
        failureCount: 1,
        avgLatency: 456,
        tags: ['camel'],
      },
    })

    expect(created.statusCode).toBe(200)
    expect(created.body).toMatchObject({
      provider: 'anyrouter',
      key: 'sk-camel',
      base_url: 'https://anyrouter.example/v1',
      is_active: false,
      priority: 9,
      quota_total: 200,
      quota_remaining: 150,
      quota_used: 50,
      quota_unit: 'tokens',
      price_per_call: 0.12,
      service_type: 'llm',
      success_count: 3,
      failure_count: 1,
      avg_latency: 456,
      tags: ['camel'],
    })

    const updated = await call(handlers.get('PUT /api/keys/:id'), {
      params: { id: String(created.body.id) },
      body: {
        baseUrl: 'https://updated.example/v1',
        isActive: true,
        quotaTotal: 300,
        quotaRemaining: 275,
        quotaUsed: 25,
        pricePerCall: 0.2,
        successCount: 5,
      },
    })

    expect(updated.statusCode).toBe(200)
    expect(updated.body).toMatchObject({
      id: created.body.id,
      base_url: 'https://updated.example/v1',
      is_active: true,
      quota_total: 300,
      quota_remaining: 275,
      quota_used: 25,
      price_per_call: 0.2,
      success_count: 5,
      key: 'sk-camel',
    })
  })

  test('creates and updates keys without dropping upstream monitoring metadata', async () => {
    const workspace = await tempWorkspace()
    const { registerKeyRoutes } = await import('./keys')
    const { app, handlers } = createRouteHarness()
    registerKeyRoutes(app as any, () => workspace)

    const created = await call(handlers.get('POST /api/keys'), {
      body: { provider: 'openai', key: 'sk-metrics', description: 'metrics key' },
    })

    expect(created.body).toMatchObject({
      provider: 'openai',
      success_count: 0,
      failure_count: 0,
      avg_latency: 0,
      last_used: null,
      expires_at: null,
    })
    expect(created.body.created_at).toBeTruthy()
    expect(created.body.last_checked).toBeTruthy()

    const stored = JSON.parse(await readFile(join(workspace, 'keys.json'), 'utf8'))
    stored[0].success_count = 12
    stored[0].last_used = '2026-06-01T00:00:00.000Z'
    stored[0].avg_latency = 345
    await writeFile(join(workspace, 'keys.json'), JSON.stringify(stored))

    const updated = await call(handlers.get('PUT /api/keys/:id'), {
      params: { id: String(created.body.id) },
      body: { id: 999, description: 'renamed key' },
    })

    expect(updated.statusCode).toBe(200)
    expect(updated.body).toMatchObject({
      id: created.body.id,
      description: 'renamed key',
      success_count: 12,
      last_used: '2026-06-01T00:00:00.000Z',
      avg_latency: 345,
      created_at: created.body.created_at,
      expires_at: null,
    })
    const storedAfterUpdate = JSON.parse(await readFile(join(workspace, 'keys.json'), 'utf8'))
    expect(storedAfterUpdate.map((key: any) => key.id)).toEqual([created.body.id])
  })

  test('lists keys by provider, active state, and pagination like upstream', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 1, provider: 'openai', key: 'sk-1', is_active: true },
      { id: 2, provider: 'openai', key: 'sk-2', is_active: false },
      { id: 3, provider: 'comfy', key: '', is_active: true },
      { id: 4, provider: 'openai', key: 'sk-4', is_active: true },
    ]))
    const { registerKeyRoutes } = await import('./keys')
    const { app, handlers } = createRouteHarness()
    registerKeyRoutes(app as any, () => workspace)

    const response = await call(handlers.get('GET /api/keys'), {
      query: { provider: 'openai', is_active: 'true', skip: '1', limit: '1' },
    })

    expect(response.body.map((key: any) => key.id)).toEqual([4])
  })

  test('normalizes legacy key records with upstream APIKeyOut defaults on list and detail', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 1, provider: 'openai', key: 'sk-legacy', is_active: true },
    ]))
    const { registerKeyRoutes } = await import('./keys')
    const { app, handlers } = createRouteHarness()
    registerKeyRoutes(app as any, () => workspace)

    const listed = await call(handlers.get('GET /api/keys'))
    const detail = await call(handlers.get('GET /api/keys/:id'), { params: { id: '1' } })

    for (const body of [listed.body[0], detail.body]) {
      expect(body).toMatchObject({
        id: 1,
        provider: 'openai',
        quota_total: 0,
        quota_remaining: 0,
        quota_used: 0,
        quota_unit: 'count',
        price_per_call: 0,
        priority: 0,
        service_type: 'llm',
        success_count: 0,
        failure_count: 0,
        avg_latency: 0,
        tags: [],
        last_used: null,
        expires_at: null,
      })
      expect(body.created_at).toBeTruthy()
      expect(body.last_checked).toBeTruthy()
    }
  })

  test('normalizes legacy camelCase key records on list and detail', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      {
        id: 1,
        provider: 'anyrouter',
        apiKey: 'sk-old-camel',
        baseUrl: 'https://old.example/v1',
        isActive: false,
        quotaTotal: 500,
        quotaRemaining: 450,
        quotaUsed: 50,
        quotaUnit: 'credits',
        pricePerCall: 0.05,
        serviceType: 'llm',
        successCount: 8,
        failureCount: 2,
        lastChecked: '2026-06-01T00:00:00.000Z',
        lastUsed: '2026-06-02T00:00:00.000Z',
        createdAt: '2026-05-01T00:00:00.000Z',
        expiresAt: '2026-12-31T00:00:00.000Z',
        avgLatency: 321,
        tags: ['legacy-camel'],
      },
    ]))
    const { registerKeyRoutes } = await import('./keys')
    const { app, handlers } = createRouteHarness()
    registerKeyRoutes(app as any, () => workspace)

    const listed = await call(handlers.get('GET /api/keys'))
    const detail = await call(handlers.get('GET /api/keys/:id'), { params: { id: '1' } })

    for (const body of [listed.body[0], detail.body]) {
      expect(body).toMatchObject({
        id: 1,
        provider: 'anyrouter',
        key: 'sk-old-camel',
        base_url: 'https://old.example/v1',
        is_active: false,
        quota_total: 500,
        quota_remaining: 450,
        quota_used: 50,
        quota_unit: 'credits',
        price_per_call: 0.05,
        service_type: 'llm',
        success_count: 8,
        failure_count: 2,
        last_checked: '2026-06-01T00:00:00.000Z',
        last_used: '2026-06-02T00:00:00.000Z',
        created_at: '2026-05-01T00:00:00.000Z',
        expires_at: '2026-12-31T00:00:00.000Z',
        avg_latency: 321,
        tags: ['legacy-camel'],
      })
    }
  })

  test('uses the upstream default key list limit while allowing explicit larger pages', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'keys.json'), JSON.stringify(
      Array.from({ length: 150 }, (_, index) => ({
        id: index + 1,
        provider: 'openai',
        key: `sk-${index + 1}`,
        is_active: true,
      })),
    ))
    const { registerKeyRoutes } = await import('./keys')
    const { app, handlers } = createRouteHarness()
    registerKeyRoutes(app as any, () => workspace)
    const list = handlers.get('GET /api/keys')

    const defaultPage = await call(list)
    const largerPage = await call(list, { query: { limit: '120' } })

    expect(defaultPage.body).toHaveLength(100)
    expect(defaultPage.body.at(0).id).toBe(1)
    expect(defaultPage.body.at(-1).id).toBe(100)
    expect(largerPage.body).toHaveLength(120)
  })

  test('registers FastAPI-compatible trailing slash aliases for key subroutes', async () => {
    const workspace = await tempWorkspace()
    const { registerKeyRoutes } = await import('./keys')
    const { app, handlers } = createRouteHarness()
    registerKeyRoutes(app as any, () => workspace)

    expect(handlers.has('GET /api/keys/:id/')).toBe(true)
    expect(handlers.has('PUT /api/keys/:id/')).toBe(true)
    expect(handlers.has('DELETE /api/keys/:id/')).toBe(true)
    expect(handlers.has('POST /api/keys/:id/test/')).toBe(true)
    expect(handlers.has('POST /api/keys/test-all/')).toBe(true)
  })

  test('gets a single key by id', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 7, provider: 'openai', key: 'sk-7', is_active: true },
    ]))
    const { registerKeyRoutes } = await import('./keys')
    const { app, handlers } = createRouteHarness()
    registerKeyRoutes(app as any, () => workspace)

    const found = await call(handlers.get('GET /api/keys/:id'), { params: { id: '7' } })
    expect(found.statusCode).toBe(200)
    expect(found.body).toMatchObject({ id: 7, provider: 'openai' })

    const missing = await call(handlers.get('GET /api/keys/:id'), { params: { id: '8' } })
    expect(missing.statusCode).toBe(404)
    expect(missing.body.error).toContain('Key not found')
  })

  test('does not rewrite key storage when updating a missing key', async () => {
    const workspace = await tempWorkspace()
    const initial = '[{"id":7,"provider":"openai","key":"sk-7","is_active":true}]'
    await writeFile(join(workspace, 'keys.json'), initial)

    const { registerKeyRoutes } = await import('./keys')
    const { app, handlers } = createRouteHarness()
    registerKeyRoutes(app as any, () => workspace)

    const response = await call(handlers.get('PUT /api/keys/:id'), {
      params: { id: '404' },
      body: { description: 'missing' },
    })

    expect(response.statusCode).toBe(404)
    expect(await readFile(join(workspace, 'keys.json'), 'utf8')).toBe(initial)
  })

  test('deletes a key with upstream 204/404 semantics and cascades models', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 7, provider: 'openai', key: 'sk-7', is_active: true },
      { id: 8, provider: 'qwen', key: 'sk-8', is_active: true },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      { id: 1, api_key_id: 7, provider: 'openai', display_name: 'old', model_name: 'gpt-old' },
      { id: 2, api_key_id: 8, provider: 'qwen', display_name: 'keep', model_name: 'qwen-plus' },
    ]))
    const { registerKeyRoutes } = await import('./keys')
    const { app, handlers } = createRouteHarness()
    registerKeyRoutes(app as any, () => workspace)

    const deleted = await call(handlers.get('DELETE /api/keys/:id'), { params: { id: '7' } })

    expect(deleted.statusCode).toBe(204)
    expect(deleted.body).toBeNull()
    const storedKeys = JSON.parse(await readFile(join(workspace, 'keys.json'), 'utf8'))
    const storedModels = JSON.parse(await readFile(join(workspace, 'models.json'), 'utf8'))
    expect(storedKeys.map((key: any) => key.id)).toEqual([8])
    expect(storedModels.map((model: any) => model.id)).toEqual([2])

    const missing = await call(handlers.get('DELETE /api/keys/:id'), { params: { id: '404' } })
    expect(missing.statusCode).toBe(404)
    expect(missing.body.error).toContain('Key not found')
  })

  test('returns FastAPI-compatible detail field for key management and probe errors', async () => {
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
      { id: 1, provider: 'openai', key: 'sk-disabled', is_active: false },
      { id: 2, provider: 'missing-provider', key: 'sk-missing-provider', is_active: true },
      { id: 3, provider: 'openai', key: '', is_active: true },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([]))
    const { registerKeyRoutes } = await import('./keys')
    const { app, handlers } = createRouteHarness()
    registerKeyRoutes(app as any, () => workspace)

    const missingGet = await call(handlers.get('GET /api/keys/:id'), { params: { id: '404' } })
    expect(missingGet.statusCode).toBe(404)
    expect(missingGet.body).toEqual({
      error: 'Key not found',
      detail: 'Key not found',
    })

    const missingUpdate = await call(handlers.get('PUT /api/keys/:id'), {
      params: { id: '404' },
      body: { description: 'missing' },
    })
    expect(missingUpdate.statusCode).toBe(404)
    expect(missingUpdate.body).toEqual({
      error: 'key not found',
      detail: 'key not found',
    })

    const disabledProbe = await call(handlers.get('POST /api/keys/:id/test'), { params: { id: '1' } })
    expect(disabledProbe.statusCode).toBe(400)
    expect(disabledProbe.body).toEqual({
      valid: false,
      error: 'key is disabled',
      detail: 'key is disabled',
    })

    const missingProviderProbe = await call(handlers.get('POST /api/keys/:id/test'), { params: { id: '2' } })
    expect(missingProviderProbe.statusCode).toBe(404)
    expect(missingProviderProbe.body).toEqual({
      valid: false,
      error: 'provider not found',
      detail: 'provider not found',
    })

    const emptyKeyProbe = await call(handlers.get('POST /api/keys/:id/test'), { params: { id: '3' } })
    expect(emptyKeyProbe.statusCode).toBe(400)
    expect(emptyKeyProbe.body).toEqual({
      valid: false,
      error: 'API key is empty',
      detail: 'API key is empty',
    })
  })

  test('treats none auth type case-insensitively when probing empty execution keys', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      {
        id: 'local-comfy',
        display_name: 'Local Comfy',
        service_type: 'comfyui',
        api_format: 'comfyui',
        auth_type: 'None',
        supported_modalities: ['text_to_image'],
        default_base_url: '',
        is_active: true,
      },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 1, provider: 'local-comfy', key: '', is_active: true },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([]))
    const { registerKeyRoutes } = await import('./keys')
    const { app, handlers } = createRouteHarness()
    registerKeyRoutes(app as any, () => workspace)

    const response = await call(handlers.get('POST /api/keys/:id/test'), { params: { id: '1' } })

    expect(response.statusCode).toBe(400)
    expect(response.body).toMatchObject({
      valid: false,
      error: 'provider endpoint not configured',
    })
  })

  test('single key test writes monitoring state on fallback probe success and failure', async () => {
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
      { id: 1, provider: 'openai', key: 'good-key', is_active: true, quota_total: 10, quota_remaining: 4, quota_used: 6, failure_count: 2 },
      { id: 2, provider: 'openai', key: 'bad-key', is_active: true, quota_total: 10, quota_remaining: 9, quota_used: 1, failure_count: 2 },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([]))

    const previousFetch = globalThis.fetch
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      const auth = String((init?.headers as any)?.Authorization || '')
      if (auth.includes('good-key')) return new Response(JSON.stringify({ ok: true }), { status: 200 })
      return new Response(JSON.stringify({ error: 'bad key' }), { status: 401 })
    }) as any

    try {
      const { registerKeyRoutes } = await import('./keys')
      const { app, handlers } = createRouteHarness()
      registerKeyRoutes(app as any, () => workspace)

      const success = await call(handlers.get('POST /api/keys/:id/test'), { params: { id: '1' } })
      const failure = await call(handlers.get('POST /api/keys/:id/test'), { params: { id: '2' } })

      expect(success.body.valid).toBe(true)
      expect(failure.body.valid).toBe(false)

      const stored = JSON.parse(await readFile(join(workspace, 'keys.json'), 'utf8'))
      expect(stored.find((item: any) => item.id === 1)).toMatchObject({
        is_active: true,
        failure_count: 0,
        quota_remaining: 4,
      })
      expect(stored.find((item: any) => item.id === 1).last_checked).toBeTruthy()
      expect(stored.find((item: any) => item.id === 1).avg_latency).toBeNumber()
      expect(stored.find((item: any) => item.id === 2)).toMatchObject({
        is_active: false,
        failure_count: 3,
      })
      expect(stored.find((item: any) => item.id === 2).last_checked).toBeTruthy()
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('single fallback key test uses key base_url before provider default_base_url', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      {
        id: 'openai',
        display_name: 'OpenAI',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        supported_modalities: ['chat'],
        default_base_url: 'https://provider.example/v1',
        is_active: true,
      },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 1, provider: 'openai', key: 'sk-key-base', base_url: 'https://key.example/v1', is_active: true },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([]))

    const previousFetch = globalThis.fetch
    let capturedUrl = ''
    let capturedInit: RequestInit | undefined
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedInit = init
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }) as any

    try {
      const { registerKeyRoutes } = await import('./keys')
      const { app, handlers } = createRouteHarness()
      registerKeyRoutes(app as any, () => workspace)

      await call(handlers.get('POST /api/keys/:id/test'), { params: { id: '1' } })

      expect(capturedUrl).toBe('https://key.example/v1/models')
      expect(capturedInit?.method).toBe('GET')
      expect(capturedInit?.body).toBeUndefined()
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('single fallback key test combines key base_url with relative provider endpoint DSL', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      {
        id: 'openai',
        display_name: 'OpenAI',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        supported_modalities: ['chat'],
        default_base_url: 'https://provider.example/v1',
        endpoints: { chat: { url: '/custom/chat' } },
        is_active: true,
      },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 1, provider: 'openai', key: 'sk-key-base', base_url: 'https://key.example/v1', is_active: true },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([]))

    const previousFetch = globalThis.fetch
    let capturedUrl = ''
    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = String(url)
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }) as any

    try {
      const { registerKeyRoutes } = await import('./keys')
      const { app, handlers } = createRouteHarness()
      registerKeyRoutes(app as any, () => workspace)

      await call(handlers.get('POST /api/keys/:id/test'), { params: { id: '1' } })

      expect(capturedUrl).toBe('https://key.example/v1/custom/chat')
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('fallback key probe records DashScope quota when the balance endpoint is available', async () => {
    const { probeKeyFallback } = await import('./keys')
    const provider = {
      id: 'qwen',
      display_name: 'Qwen DashScope',
      service_type: 'llm',
      api_format: 'openai_compatible',
      auth_type: 'bearer',
      supported_modalities: ['chat'],
      default_base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      is_active: true,
    }
    const key = { id: 1, provider: 'qwen', key: 'dashscope-key', is_active: true, quota_total: 100, quota_used: 99 }

    const previousFetch = globalThis.fetch
    const urls: string[] = []
    globalThis.fetch = (async (url: string | URL | Request) => {
      urls.push(String(url))
      if (String(url).includes('/users/quota')) {
        return new Response(JSON.stringify({ data: { available_quota: 72 } }), { status: 200 })
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }) as any

    try {
      const result = await probeKeyFallback(provider, key)

      expect(urls).toEqual([
        'https://dashscope.aliyuncs.com/compatible-mode/v1/models',
        'https://dashscope.aliyuncs.com/api/v1/users/quota',
      ])
      expect(result).toMatchObject({ valid: true, quota_remaining: 72 })
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('fallback key probe uses Google API key auth for Gemini native providers', async () => {
    const { probeKeyFallback } = await import('./keys')
    const provider = {
      id: 'gemini',
      display_name: 'Google Gemini',
      service_type: 'llm',
      api_format: 'gemini_native',
      auth_type: 'bearer',
      supported_modalities: ['chat', 'vision'],
      default_base_url: 'https://generativelanguage.googleapis.com/v1beta',
      is_active: true,
    }
    const key = { id: 1, provider: 'gemini', key: 'gemini-key', is_active: true }

    const previousFetch = globalThis.fetch
    let capturedUrl = ''
    let capturedHeaders: Record<string, string> = {}
    let capturedBody: any = null
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedHeaders = init?.headers as Record<string, string>
      capturedBody = JSON.parse(String(init?.body || '{}'))
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'OK' }] } }],
      }), { status: 200 })
    }) as any

    try {
      const result = await probeKeyFallback(provider, key)

      expect(result.valid).toBe(true)
      expect(capturedUrl).toBe('https://generativelanguage.googleapis.com/v1beta/models/test:generateContent')
      expect(capturedHeaders['x-goog-api-key']).toBe('gemini-key')
      expect(capturedHeaders.Authorization).toBeUndefined()
      expect(capturedBody).toMatchObject({
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 1 },
      })
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('fallback key probe sends Claude Code compatible headers for Anthropic messages providers', async () => {
    const { probeKeyFallback } = await import('./keys')
    const provider = {
      id: 'claude-code',
      display_name: 'Claude Code Gateway',
      service_type: 'llm',
      api_format: 'claude_code',
      auth_type: 'bearer',
      supported_modalities: ['chat'],
      default_base_url: 'https://anthropic-gateway.example/v1',
      is_active: true,
    }
    const key = { id: 1, provider: 'claude-code', key: 'claude-key', is_active: true }

    const previousFetch = globalThis.fetch
    let capturedUrl = ''
    let capturedHeaders: Record<string, string> = {}
    let capturedBody: any = null
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedHeaders = init?.headers as Record<string, string>
      capturedBody = JSON.parse(String(init?.body || '{}'))
      return new Response(JSON.stringify({
        content: [{ type: 'text', text: 'OK' }],
      }), { status: 200 })
    }) as any

    try {
      const result = await probeKeyFallback(provider, key)

      expect(result.valid).toBe(true)
      expect(capturedUrl).toBe('https://anthropic-gateway.example/v1/messages')
      expect(capturedHeaders.Authorization).toBe('Bearer claude-key')
      expect(capturedHeaders['anthropic-version']).toBe('2023-06-01')
      expect(capturedHeaders['anthropic-beta']).toContain('claude-code-20250219')
      expect(capturedHeaders['anthropic-dangerous-direct-browser-access']).toBe('true')
      expect(capturedHeaders['x-app']).toBe('cli')
      expect(capturedHeaders['accept-encoding']).toBe('identity')
      expect(capturedHeaders['x-stainless-lang']).toBe('js')
      expect(capturedBody).toMatchObject({
        model: 'test',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      })
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('fallback key probe disables Claude Code experimental betas for AnyRouter', async () => {
    const { probeKeyFallback } = await import('./keys')
    const provider = {
      id: 'any',
      display_name: 'AnyRouter',
      service_type: 'llm',
      api_format: 'claude_code',
      auth_type: 'bearer',
      supported_modalities: ['chat'],
      default_base_url: 'https://anyrouter.top',
      is_active: true,
    }
    const key = { id: 1, provider: 'any', key: 'claude-key', is_active: true }

    const previousFetch = globalThis.fetch
    let capturedUrl = ''
    let capturedHeaders: Record<string, string> = {}
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedHeaders = init?.headers as Record<string, string>
      return new Response(JSON.stringify({
        content: [{ type: 'text', text: 'OK' }],
      }), { status: 200 })
    }) as any

    try {
      const result = await probeKeyFallback(provider, key)

      expect(result.valid).toBe(true)
      expect(capturedUrl).toBe('https://anyrouter.top/v1/messages')
      expect(capturedHeaders.Authorization).toBe('Bearer claude-key')
      expect(capturedHeaders['x-api-key']).toBeUndefined()
      expect(capturedHeaders['anthropic-beta']).toContain('claude-code-20250219')
      expect(capturedHeaders['anthropic-beta']).not.toContain('interleaved-thinking')
      expect(capturedHeaders['x-app']).toBeUndefined()
      expect(capturedHeaders['anthropic-dangerous-direct-browser-access']).toBeUndefined()
      expect(capturedHeaders['x-stainless-lang']).toBeUndefined()
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('fallback key probe reports network errors without throwing the whole batch', async () => {
    const { probeKeyFallback } = await import('./keys')
    const provider = {
      id: 'openai',
      display_name: 'OpenAI',
      service_type: 'llm',
      api_format: 'openai_compatible',
      auth_type: 'bearer',
      supported_modalities: ['chat'],
      default_base_url: 'https://gateway.example/v1',
      is_active: true,
    }
    const key = { id: 1, provider: 'openai', key: 'network-key', is_active: true }

    const previousFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new Error('ConnectionRefused')
    }) as any

    try {
      const result = await probeKeyFallback(provider, key)

      expect(result).toMatchObject({
        valid: false,
        status: 0,
        retryable: true,
      })
      expect(result.error).toContain('ConnectionRefused')
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('single fallback key test reports network errors without returning 500', async () => {
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
      { id: 1, provider: 'openai', key: 'network-key', is_active: true, failure_count: 2 },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([]))

    const previousFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new Error('ConnectionRefused')
    }) as any

    try {
      const { registerKeyRoutes } = await import('./keys')
      const { app, handlers } = createRouteHarness()
      registerKeyRoutes(app as any, () => workspace)

      const response = await call(handlers.get('POST /api/keys/:id/test'), { params: { id: '1' } })

      expect(response.statusCode).toBe(200)
      expect(response.body).toMatchObject({
        valid: false,
        status: 0,
        retryable: true,
      })
      expect(response.body.error).toContain('ConnectionRefused')

      const stored = JSON.parse(await readFile(join(workspace, 'keys.json'), 'utf8'))
      expect(stored[0]).toMatchObject({
        is_active: false,
        failure_count: 3,
      })
      expect(stored[0].last_checked).toBeTruthy()
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('single key test keeps retryable AnyRouter capacity failures from disabling the key', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      {
        id: 'any',
        display_name: 'AnyRouter',
        service_type: 'llm',
        api_format: 'codex_responses',
        auth_type: 'bearer',
        supported_modalities: ['chat'],
        default_base_url: 'https://anyrouter.top/v1',
        is_active: true,
      },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 1, provider: 'any', key: 'sk-test', is_active: true, failure_count: 2 },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      {
        id: 11,
        api_key_id: 1,
        provider: 'any',
        display_name: 'gpt-5.5',
        model_name: 'gpt-5.5',
        capabilities: { chat: true },
        health_status: 'unknown',
      },
    ]))

    const previousFetch = globalThis.fetch
    globalThis.fetch = (async () => new Response(JSON.stringify({
      message: '当前模型 gpt-5.5 负载已经达到上限，请稍后重试',
      type: 'new_api_error',
      code: 'get_channel_failed',
    }), { status: 500 })) as any
    setOpenAIResponsesCreateForTest(async () => {
      throw new Error('OpenAI SDK should not be used for AnyRouter capacity probes')
    })

    try {
      const { registerKeyRoutes } = await import('./keys')
      const { app, handlers } = createRouteHarness()
      registerKeyRoutes(app as any, () => workspace)

      const response = await call(handlers.get('POST /api/keys/:id/test'), { params: { id: '1' } })

      expect(response.statusCode).toBe(200)
      expect(response.body).toMatchObject({
        valid: false,
        status: 500,
        retryable: true,
      })
      expect(response.body.error).toContain('上游临时繁忙')
      expect(response.body.error).toContain('gpt-5.5')

      const stored = JSON.parse(await readFile(join(workspace, 'keys.json'), 'utf8'))
      expect(stored[0]).toMatchObject({
        is_active: true,
        failure_count: 2,
      })
      expect(stored[0].last_checked).toBeTruthy()
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('test-all probes active keys and updates failure counts like upstream monitoring', async () => {
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
      { id: 1, provider: 'openai', key: 'good-key', is_active: true, quota_total: 10, quota_used: 1, failure_count: 2 },
      { id: 2, provider: 'openai', key: 'bad-key', is_active: true, quota_total: 10, quota_used: 1, failure_count: 2 },
      { id: 3, provider: 'openai', key: 'disabled-key', is_active: false, quota_total: 10, quota_used: 1, failure_count: 0 },
    ]))

    const previousFetch = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      const auth = String((init?.headers as any)?.Authorization || '')
      calls.push(auth)
      if (auth.includes('good-key')) return new Response(JSON.stringify({ ok: true }), { status: 200 })
      return new Response(JSON.stringify({ error: 'bad key' }), { status: 401 })
    }) as any

    try {
      const { registerKeyRoutes } = await import('./keys')
      const { app, handlers } = createRouteHarness()
      registerKeyRoutes(app as any, () => workspace)

      const res = await call(handlers.get('POST /api/keys/test-all'))

      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body).toHaveLength(2)
      expect(res.body.map((item: any) => ({ id: item.id, valid: item.valid }))).toEqual([
        { id: 1, valid: true },
        { id: 2, valid: false },
      ])
      expect(calls).toHaveLength(2)
      const stored = JSON.parse(await readFile(join(workspace, 'keys.json'), 'utf8'))
      expect(stored.find((item: any) => item.id === 1)).toMatchObject({ is_active: true, failure_count: 0 })
      expect(stored.find((item: any) => item.id === 2)).toMatchObject({ is_active: false, failure_count: 3 })
      expect(stored.find((item: any) => item.id === 1).last_checked).toBeTruthy()
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('test-all uses bound model probes before fallback key checks', async () => {
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
      { id: 1, provider: 'openai', key: 'model-key', is_active: true, quota_total: 10, quota_used: 3, failure_count: 2 },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      {
        id: 11,
        api_key_id: 1,
        provider: 'openai',
        display_name: 'Real GPT',
        model_name: 'gpt-real',
        capabilities: { chat: true },
        health_status: 'unknown',
      },
    ]))

    const previousFetch = globalThis.fetch
    const calls: Array<{ url: string, method: string, body: any }> = []
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({
        url: String(url),
        method: String(init?.method || 'GET'),
        body: init?.body ? JSON.parse(String(init.body)) : null,
      })
      if (String(init?.method || 'GET') === 'POST') {
        return new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 })
      }
      return new Response(JSON.stringify({ error: 'fallback should not run' }), { status: 404 })
    }) as any

    try {
      const { registerKeyRoutes } = await import('./keys')
      const { app, handlers } = createRouteHarness()
      registerKeyRoutes(app as any, () => workspace)

      const res = await call(handlers.get('POST /api/keys/test-all'))

      expect(res.statusCode).toBe(200)
      expect(res.body).toEqual([
        { id: 1, provider: 'openai', valid: true, message: 'Key test passed (gpt-real)', status: undefined, model: 'gpt-real' },
      ])
      expect(calls).toHaveLength(1)
      expect(calls[0]).toMatchObject({
        url: 'https://gateway.example/v1/chat/completions',
        method: 'POST',
        body: { model: 'gpt-real' },
      })

      const stored = JSON.parse(await readFile(join(workspace, 'keys.json'), 'utf8'))
      expect(stored[0]).toMatchObject({
        is_active: true,
        failure_count: 0,
        quota_remaining: 7,
      })
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('test-all does not rewrite key storage when there are no active keys', async () => {
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
    const initial = '[{"id":1,"provider":"openai","key":"disabled-key","is_active":false,"failure_count":0}]'
    await writeFile(join(workspace, 'keys.json'), initial)

    const previousFetch = globalThis.fetch
    let fetchCalled = false
    globalThis.fetch = (async () => {
      fetchCalled = true
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }) as any

    try {
      const { registerKeyRoutes } = await import('./keys')
      const { app, handlers } = createRouteHarness()
      registerKeyRoutes(app as any, () => workspace)

      const res = await call(handlers.get('POST /api/keys/test-all'))

      expect(res.statusCode).toBe(200)
      expect(res.body).toEqual([])
      expect(fetchCalled).toBe(false)
      expect(await readFile(join(workspace, 'keys.json'), 'utf8')).toBe(initial)
    } finally {
      globalThis.fetch = previousFetch
    }
  })
})

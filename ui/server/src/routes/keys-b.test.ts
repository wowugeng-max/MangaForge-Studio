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

describe('provider key protocol tests b', () => {
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

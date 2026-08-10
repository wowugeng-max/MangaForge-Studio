import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  buildProviderRequestBody,
  endpointForProvider,
  executeWithRuntimeModel,
  parseProviderResponsePayload,
  readProviderStream,
  selectRuntimeModel,
  selectionForRequestRoute,
  summarizeProviderRequestBodyForLog,
  type RuntimeModelSelection,
} from './provider-runtime'
import { resetOpenAIResponsesCreateForTest, setOpenAIResponsesCreateForTest } from './openai-responses-sdk'

function selection(overrides: Partial<RuntimeModelSelection> = {}): RuntimeModelSelection {
  return {
    provider: {
      id: 'codex-proxy',
      display_name: 'Codex Proxy',
      service_type: 'llm',
      api_format: 'codex_responses',
      auth_type: 'bearer',
      response_mode: 'auto',
      supported_modalities: ['chat'],
      default_base_url: 'https://api.openai.com/v1',
      is_active: true,
      endpoints: {},
      custom_headers: {},
    },
    key: {
      id: 1,
      provider: 'codex-proxy',
      key: 'sk-test',
      description: '',
      is_active: true,
      quota_total: 0,
      quota_used: 0,
      tags: [],
    },
    model: {
      id: 1,
      api_key_id: 1,
      provider: 'codex-proxy',
      display_name: 'GPT Codex',
      model_name: 'gpt-5-codex',
      capabilities: { chat: true },
      health_status: 'unknown',
      is_favorite: false,
      is_manual: true,
      context_ui_params: {},
    },
    baseUrl: 'https://api.openai.com/v1',
    endpoint: 'responses',
    apiFormat: 'codex_responses',
    ...overrides,
  }
}

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  resetOpenAIResponsesCreateForTest()
})

describe('codex responses provider runtime b b', () => {
  test('builds Codex Responses bodies for AnyRouter bare GPT models', () => {
    const body = buildProviderRequestBody({
      model: 'balanced',
      messages: [{ role: 'user', content: 'Return exactly: OK' }],
      max_tokens: 16,
      response_format: 'text',
    }, selection({
      baseUrl: 'https://anyrouter.top/v1',
      apiFormat: 'codex_responses',
      provider: {
        ...selection().provider,
        id: 'any',
        display_name: 'AnyRouter',
        default_base_url: 'https://anyrouter.top/v1',
      },
      model: {
        ...selection().model,
        model_name: 'gpt-5.5',
      },
    }))

    expect(body).toMatchObject({
      model: 'gpt-5.5',
      input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Return exactly: OK' }] }],
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
    expect(body.prompt_cache_key).toBeTruthy()
    expect(body.client_metadata).toMatchObject({
      session_id: body.prompt_cache_key,
      thread_id: body.prompt_cache_key,
    })
    expect(body).not.toHaveProperty('messages')
    expect(body).not.toHaveProperty('max_tokens')
    expect(body).not.toHaveProperty('max_output_tokens')
    expect(body).not.toHaveProperty('temperature')
  })
  test('sends default AnyRouter Codex Responses requests through fetch SSE transport', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-anyrouter-sse-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'any',
          display_name: 'AnyRouter',
          service_type: 'llm',
          api_format: 'codex_responses',
          auth_type: 'bearer',
          response_mode: 'auto',
          supported_modalities: ['chat'],
          default_base_url: 'https://anyrouter.top/v1',
          is_active: true,
          endpoints: {},
          custom_headers: { 'X-Provider': 'anyrouter' },
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 5, provider: 'any', key: 'sk-test', description: '', is_active: true, quota_total: 0, quota_used: 0, tags: [] },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 128, api_key_id: 5, provider: 'any', display_name: 'gpt-5.5', model_name: 'gpt-5.5', capabilities: { chat: true }, health_status: 'healthy', is_favorite: false, is_manual: true, context_ui_params: {} },
      ]))

      const calls: any[] = []
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({
          url: String(url),
          headers: init?.headers as Record<string, string>,
          body: JSON.parse(String(init?.body || '{}')),
        })
        return new Response([
          'data: {"type":"response.output_text.delta","delta":"SSE OK"}',
          'data: {"type":"response.completed","response":{"status":"completed","usage":{"input_tokens":1,"output_tokens":2,"total_tokens":3}}}',
          'data: [DONE]',
          '',
        ].join('\n\n'), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
      }) as any
      setOpenAIResponsesCreateForTest(async call => {
        throw new Error(`OpenAI SDK should not be used for AnyRouter Codex Responses runtime requests: ${call.baseURL}`)
      })

      const result = await executeWithRuntimeModel(
        workspace,
        { model: 'balanced', messages: [{ role: 'user', content: 'ping' }], response_format: 'text' },
        128,
        { maxRetries: 0 },
      )

      expect(result.content).toBe('SSE OK')
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
      expect(calls[0].body).not.toHaveProperty('max_tokens')
      expect(calls[0].body).not.toHaveProperty('temperature')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })
  test('omits text format for plain text Codex key probes', () => {
    const body = buildProviderRequestBody({
      model: 'balanced',
      messages: [{ role: 'user', content: 'Return exactly: OK' }],
      max_tokens: 8,
      temperature: 0,
      response_format: 'text',
    }, selection())

    expect(body).toMatchObject({
      model: 'gpt-5-codex',
      input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Return exactly: OK' }] }],
      tools: [],
      tool_choice: 'auto',
      store: false,
      include: ['reasoning.encrypted_content'],
    })
    expect(body).not.toHaveProperty('max_output_tokens')
    expect(body).not.toHaveProperty('temperature')
    expect(body).not.toHaveProperty('text')
  })
  test('sends Codex client compatibility fields through the OpenAI SDK runtime transport', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-codex-sdk-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'codex-proxy',
          display_name: 'Codex Proxy',
          service_type: 'llm',
          api_format: 'codex_responses',
          auth_type: 'bearer',
          response_mode: 'auto',
          supported_modalities: ['chat'],
          default_base_url: 'https://api.openai.com/v1',
          is_active: true,
          endpoints: {},
          custom_headers: { 'X-Provider': 'codex-proxy', 'User-Agent': 'CustomMangaForge/2.0' },
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 6, provider: 'codex-proxy', key: 'sk-test', description: '', is_active: true, quota_total: 0, quota_used: 0, tags: [] },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 129, api_key_id: 6, provider: 'codex-proxy', display_name: 'gpt-5-codex', model_name: 'gpt-5-codex', capabilities: { chat: true }, health_status: 'healthy', is_favorite: false, is_manual: true, context_ui_params: {} },
      ]))

      let capturedCall: any = null
      globalThis.fetch = (async () => {
        throw new Error('fetch should not be used for OpenAI SDK Codex Responses runtime requests')
      }) as any
      setOpenAIResponsesCreateForTest(async call => {
        capturedCall = call
        return { output_text: 'SDK OK', status: 'completed' }
      })

      const result = await executeWithRuntimeModel(
        workspace,
        { model: 'balanced', messages: [{ role: 'user', content: 'ping' }], response_format: 'text' },
        129,
        { maxRetries: 0 },
      )

      expect(result.content).toBe('SDK OK')
      expect(capturedCall).toMatchObject({
        apiKey: 'sk-test',
        baseURL: 'https://api.openai.com/v1',
        headers: { 'X-Provider': 'codex-proxy', 'User-Agent': 'CustomMangaForge/2.0' },
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
      expect(capturedCall.body).not.toHaveProperty('max_tokens')
      expect(capturedCall.body).not.toHaveProperty('temperature')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })
  test('streams Codex auto mode when long-running agents request streaming', () => {
    const body = buildProviderRequestBody({
      model: 'balanced',
      messages: [{ role: 'user', content: 'write prose' }],
      stream: true,
      response_format: 'text',
    }, selection({
      provider: {
        ...selection().provider,
        response_mode: 'auto',
      },
    }))

    expect(body.stream).toBe(true)
  })
  test('lets provider-level stream mode force Codex background tasks to stream', () => {
    const body = buildProviderRequestBody({
      model: 'balanced',
      messages: [{ role: 'user', content: 'write prose' }],
      stream: true,
      response_format: 'text',
    }, selection({
      provider: {
        ...selection().provider,
        response_mode: 'stream',
      },
    }))

    expect(body.stream).toBe(true)
  })
  test('allows Codex streaming when explicitly requested by response mode', () => {
    const body = buildProviderRequestBody({
      model: 'balanced',
      messages: [{ role: 'user', content: 'write prose' }],
      stream: false,
      response_mode: 'stream',
      response_format: 'text',
    }, selection())

    expect(body.stream).toBe(true)
  })
  test('lets model-level response mode override provider stream defaults', () => {
    const body = buildProviderRequestBody({
      model: 'balanced',
      messages: [{ role: 'user', content: 'write prose' }],
      stream: true,
      response_format: 'text',
    }, selection({
      provider: {
        ...selection().provider,
        response_mode: 'stream',
      },
      model: {
        ...selection().model,
        context_ui_params: {
          response_mode: 'non_stream',
        },
      },
    }))

    expect(body.stream).toBe(false)
  })
  test('lets model-level custom headers override provider headers during runtime execution', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-model-headers-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'any',
          display_name: 'AnyRouter',
          service_type: 'llm',
          api_format: 'codex_responses',
          auth_type: 'bearer',
          response_mode: 'non_stream',
          supported_modalities: ['chat'],
          default_base_url: 'https://anyrouter.top/v1',
          is_active: true,
          endpoints: {},
          custom_headers: {
            'X-Client': 'provider-client',
            'User-Agent': 'ProviderUA/1.0',
          },
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 1, provider: 'any', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        {
          id: 1,
          api_key_id: 1,
          provider: 'any',
          display_name: 'GPT Codex',
          model_name: 'gpt-5-codex',
          capabilities: { chat: true },
          health_status: 'healthy',
          context_ui_params: {
            response_mode: 'stream',
            custom_headers: {
              'X-Client': 'model-client',
              'X-Model-Only': 'model-header',
              'User-Agent': 'ModelUA/2.0',
            },
          },
        },
      ]))

      let capturedHeaders: Record<string, string> = {}
      let capturedBody: any = null
      globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
        capturedHeaders = Object.fromEntries(new Headers(init?.headers || {}).entries())
        capturedBody = JSON.parse(String(init?.body || '{}'))
        return new Response([
          'data: {"type":"response.output_text.delta","delta":"OK"}',
          'data: {"type":"response.completed","response":{"status":"completed"}}',
          'data: [DONE]',
          '',
        ].join('\n\n'), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        messages: [{ role: 'user', content: 'ping' }],
        response_format: 'text',
      }, 1, { maxRetries: 0 })

      expect(result.content).toBe('OK')
      expect(capturedBody.stream).toBe(true)
      expect(capturedHeaders.accept).toBe('text/event-stream')
      expect(capturedHeaders['x-client']).toBe('model-client')
      expect(capturedHeaders['x-model-only']).toBe('model-header')
      expect(capturedHeaders['user-agent']).toBe('ModelUA/2.0')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })
  test('parses non-streaming Responses payloads', () => {
    const parsed = parseProviderResponsePayload({
      output_text: 'OK from responses',
      usage: { input_tokens: 3, output_tokens: 4, total_tokens: 7 },
      status: 'completed',
    }, selection())

    expect(parsed.content).toBe('OK from responses')
    expect(parsed.usage?.input_tokens).toBe(3)
    expect(parsed.finish_reason).toBe('completed')
  })
  test('parses streaming Responses output text delta events', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('event: response.output_text.delta\n'))
        controller.enqueue(new TextEncoder().encode('data: {"delta":"Hello"}\n\n'))
        controller.enqueue(new TextEncoder().encode('event: response.output_text.delta\n'))
        controller.enqueue(new TextEncoder().encode('data: {"delta":" Codex"}\n\n'))
        controller.enqueue(new TextEncoder().encode('event: response.completed\n'))
        controller.enqueue(new TextEncoder().encode('data: {"response":{"status":"completed","usage":{"input_tokens":1,"output_tokens":2,"total_tokens":3}}}\n\n'))
        controller.close()
      },
    })

    const raw = await readProviderStream(new Response(stream), selection())

    expect(raw.content).toBe('Hello Codex')
    expect(raw.usage.total_tokens).toBe(3)
    expect(raw.finish_reason).toBe('completed')
  })
  test('parses chat-compatible chunks returned from Responses streams', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n'))
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":" AnyRouter"},"finish_reason":"stop"}],"usage":{"prompt_tokens":1,"completion_tokens":2,"total_tokens":3}}\n\n'))
        controller.close()
      },
    })

    const raw = await readProviderStream(new Response(stream), selection())

    expect(raw.content).toBe('Hello AnyRouter')
    expect(raw.finish_reason).toBe('stop')
    expect(raw.usage.total_tokens).toBe(3)
  })
  test('parses final chat message content from Responses stream chunks', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"message":{"content":"Final chat message"},"finish_reason":"stop"}],"usage":{"prompt_tokens":1,"completion_tokens":2,"total_tokens":3}}\n\n'))
        controller.close()
      },
    })

    const raw = await readProviderStream(new Response(stream), selection())

    expect(raw.content).toBe('Final chat message')
    expect(raw.finish_reason).toBe('stop')
  })
  test('parses final output items from Responses stream done events', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('event: response.output_item.done\n'))
        controller.enqueue(new TextEncoder().encode('data: {"item":{"type":"message","content":[{"type":"output_text","text":"Final text"}]}}\n\n'))
        controller.close()
      },
    })

    const raw = await readProviderStream(new Response(stream), selection())

    expect(raw.content).toBe('Final text')
  })
  test('parses final response output from Responses completed events when no deltas are sent', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('event: response.completed\n'))
        controller.enqueue(new TextEncoder().encode('data: {"response":{"status":"completed","output":[{"type":"message","content":[{"type":"output_text","text":"Completed final text"}]}],"usage":{"input_tokens":10,"output_tokens":20,"total_tokens":30}}}\n\n'))
        controller.close()
      },
    })

    const raw = await readProviderStream(new Response(stream), selection())

    expect(raw.content).toBe('Completed final text')
    expect(raw.usage.total_tokens).toBe(30)
  })
  test('does not append output_text.done over already streamed Responses deltas', async () => {
    const fullText = '{"prose_chapters":[{"chapter_no":2,"chapter_text":"正文"}]}'
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('event: response.output_text.delta\n'))
        controller.enqueue(new TextEncoder().encode('data: {"type":"response.output_text.delta","delta":"{\\"prose_chapters\\":"}\n\n'))
        controller.enqueue(new TextEncoder().encode('event: response.output_text.delta\n'))
        controller.enqueue(new TextEncoder().encode('data: {"type":"response.output_text.delta","delta":"[{\\"chapter_no\\":2,\\"chapter_text\\":\\"正文\\"}]}" }\n\n'))
        controller.enqueue(new TextEncoder().encode('event: response.output_text.done\n'))
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'response.output_text.done', text: fullText })}\n\n`))
        controller.close()
      },
    })

    const raw = await readProviderStream(new Response(stream), selection())

    expect(raw.content).toBe(fullText)
  })
  test('aborts provider stream reads when the parent signal is canceled', async () => {
    const encoder = new TextEncoder()
    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"开头"}}]}\n\n'))
      },
    })
    const abortController = new AbortController()

    const readPromise = readProviderStream(new Response(stream), selection({ apiFormat: 'openai_compatible' }), abortController.signal)
    abortController.abort()
    setTimeout(() => {
      try {
        streamController?.close()
      } catch {}
    }, 20)

    await expect(readPromise).rejects.toThrow('Request canceled')
  })
  test('applies runtime timeout to streaming body reads, not just response headers', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-stream-timeout-'))
    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'slow-stream',
          display_name: 'Slow Stream',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          response_mode: 'stream',
          supported_modalities: ['chat'],
          default_base_url: 'https://slow.example/v1',
          is_active: true,
          endpoints: {},
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 1, provider: 'slow-stream', key: 'sk-test', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        {
          id: 1,
          api_key_id: 1,
          provider: 'slow-stream',
          display_name: 'Slow GPT',
          model_name: 'slow-gpt',
          capabilities: { chat: true },
          health_status: 'healthy',
          context_ui_params: {},
        },
      ]))

      const encoder = new TextEncoder()
      globalThis.fetch = (async () => new Response(new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"开头"}}]}\n\n'))
        },
      }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })) as typeof fetch

      const execution = executeWithRuntimeModel(workspace, {
        model: 'balanced',
        messages: [{ role: 'user', content: 'ping' }],
        response_format: 'text',
        stream: true,
      }, 1, { maxRetries: 0, timeoutMs: 25 })
        .then(result => ({ kind: 'resolved' as const, message: String((result as any)?.error || result.content || '') }))
        .catch(error => ({ kind: 'rejected' as const, message: String(error?.message || error) }))

      const outcome = await Promise.race([
        execution,
        new Promise<{ kind: 'pending'; message: string }>(resolve => setTimeout(() => resolve({ kind: 'pending', message: 'stream read did not respect timeout' }), 160)),
      ])

      if (outcome.kind === 'pending') {
        try {
          streamController?.error(new Error('test cleanup'))
        } catch {}
      }

      expect(outcome.kind).not.toBe('pending')
      expect(outcome.message).toContain('timed out')
    } finally {
      try {
        streamController?.close()
      } catch {}
      await rm(workspace, { recursive: true, force: true })
    }
  })
  test('does not retry a completed streaming response when the body read fails', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-stream-no-retry-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'flaky-stream',
          display_name: 'Flaky Stream',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          response_mode: 'stream',
          supported_modalities: ['chat'],
          default_base_url: 'https://flaky.example/v1',
          is_active: true,
          endpoints: {},
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 1, provider: 'flaky-stream', key: 'sk-test', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        {
          id: 1,
          api_key_id: 1,
          provider: 'flaky-stream',
          display_name: 'Flaky GPT',
          model_name: 'flaky-gpt',
          capabilities: { chat: true },
          health_status: 'healthy',
          context_ui_params: {},
        },
      ]))

      let fetchCalls = 0
      globalThis.fetch = (async () => {
        fetchCalls += 1
        return new Response(new ReadableStream<Uint8Array>({
          start(controller) {
            controller.error(new Error('upstream stream disconnected'))
          },
        }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        messages: [{ role: 'user', content: 'write chapter' }],
        response_format: 'text',
        stream: true,
      }, 1, { maxRetries: 2, timeoutMs: 1000 })

      expect(result.error).toContain('upstream stream disconnected')
      expect(fetchCalls).toBe(1)
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })
  test('summarizes Codex request bodies without leaking prompt text', () => {
    const summary = summarizeProviderRequestBodyForLog({
      model: 'gpt-5-codex',
      input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'secret prompt' }] }],
      tools: [],
      tool_choice: 'auto',
      stream: false,
      include: ['reasoning.encrypted_content'],
    })

    expect(summary).toEqual({
      keys: ['include', 'input', 'model', 'stream', 'tool_choice', 'tools'],
      input_count: 1,
      first_input_role: 'user',
      first_input_content_types: ['input_text'],
      tool_count: 0,
      include: ['reasoning.encrypted_content'],
      has_text: false,
      has_temperature: false,
      has_max_output_tokens: false,
    })
    expect(JSON.stringify(summary)).not.toContain('secret prompt')
  })
  test('includes selected provider and Codex Responses URL when an AnyRouter GPT request cannot connect', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-error-'))
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      {
        id: 'any',
        display_name: 'AnyRouter',
        service_type: 'llm',
        api_format: 'codex_responses',
        auth_type: 'bearer',
        response_mode: 'auto',
        supported_modalities: ['chat'],
        default_base_url: 'https://anyrouter.top/v1',
        is_active: true,
        endpoints: {},
        custom_headers: {},
      },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 5, provider: 'any', key: 'sk-test', description: '', is_active: true, quota_total: 0, quota_used: 0, tags: [] },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      { id: 128, api_key_id: 5, provider: 'any', display_name: 'gpt-5.5', model_name: 'gpt-5.5', capabilities: { chat: true }, health_status: 'healthy', is_favorite: false, is_manual: true, context_ui_params: {} },
    ]))
    globalThis.fetch = (async () => {
      const error: any = new Error('Unable to connect. Is the computer able to access the url?')
      error.cause = { code: 'ConnectionRefused' }
      throw error
    }) as any

    try {
      const result = await executeWithRuntimeModel(
        workspace,
        { model: 'balanced', messages: [{ role: 'user', content: 'ping' }], response_format: 'text' },
        128,
        { maxRetries: 0 },
      )

      expect(result.error).toContain('POST https://anyrouter.top/v1/responses')
      expect(result.error).toContain('provider=any')
      expect(result.error).toContain('model=gpt-5.5')
      expect(result.error).toContain('format=codex_responses')
      expect(result.runtimeSelection?.provider.id).toBe('any')
      expect(result.runtimeSelection?.apiFormat).toBe('codex_responses')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })
})

describe('gemini chat-style image generation routing', () => {
  const openaiSelection = (overrides: Partial<RuntimeModelSelection> = {}) => selection({
    apiFormat: 'openai_compatible',
    provider: { ...selection().provider, api_format: 'openai_compatible', endpoints: {} },
    ...overrides,
  })

  test('media fallback endpoint for gemini image models is chat/completions', () => {
    const routed = selectionForRequestRoute(openaiSelection({
      model: { ...selection().model, model_name: 'gemini-3.1-flash-image', capabilities: { text_to_image: true } },
    }), { model: 'x', messages: [{ role: 'user', content: '画一只猫' }], type: 'text_to_image' } as any)
    expect(routed.endpoint).toBe('chat/completions')
  })

  test('media fallback endpoint for non-gemini image models stays images/generations', () => {
    const routed = selectionForRequestRoute(openaiSelection({
      model: { ...selection().model, model_name: 'gpt-image-2', capabilities: { text_to_image: true } },
    }), { model: 'x', messages: [{ role: 'user', content: 'a cat' }], type: 'text_to_image' } as any)
    expect(routed.endpoint).toBe('images/generations')
  })

  test('image request bound for chat/completions builds a messages body with size hint', () => {
    const body = buildProviderRequestBody({
      model: 'x',
      messages: [{ role: 'user', content: '生成一张美女吃泡面的图' }],
      type: 'text_to_image',
      size: '1344*768',
    } as any, openaiSelection({
      endpoint: 'chat/completions',
      routeType: 'text_to_image',
      model: { ...selection().model, model_name: 'gemini-3.1-flash-image', capabilities: { text_to_image: true } },
    }))
    // chat 通道没有 size 字段可用：比例要求折算成提示语拼进 prompt，否则前端选的比例被静默丢弃
    expect(body.messages).toHaveLength(1)
    expect(body.messages[0].role).toBe('user')
    expect(body.messages[0].content).toContain('生成一张美女吃泡面的图')
    expect(body.messages[0].content).toContain('宽高比 16:9')
    expect(body.messages[0].content).toContain('1344x768')
    expect(body.prompt).toBeUndefined()
    expect(body.size).toBeUndefined()
  })

  test('preset sizes map to the user-facing ratio, not the pixel gcd', () => {
    const body = buildProviderRequestBody({
      model: 'x',
      messages: [{ role: 'user', content: 'a cat' }],
      type: 'text_to_image',
      size: '832*1216',
    } as any, openaiSelection({
      endpoint: 'chat/completions',
      routeType: 'text_to_image',
      model: { ...selection().model, model_name: 'gemini-3.1-flash-image', capabilities: { text_to_image: true } },
    }))
    expect(body.messages[0].content).toContain('宽高比 2:3')
    expect(body.messages[0].content).not.toContain('13:19')
  })

  test('custom sizes fall back to reduced pixel ratio', () => {
    const body = buildProviderRequestBody({
      model: 'x',
      messages: [{ role: 'user', content: 'a cat' }],
      type: 'text_to_image',
      size: '1920x1080',
    } as any, openaiSelection({
      endpoint: 'chat/completions',
      routeType: 'text_to_image',
      model: { ...selection().model, model_name: 'gemini-3.1-flash-image', capabilities: { text_to_image: true } },
    }))
    expect(body.messages[0].content).toContain('宽高比 16:9')
  })

  test('adaptive (empty) size adds no hint', () => {
    const body = buildProviderRequestBody({
      model: 'x',
      messages: [{ role: 'user', content: 'a cat' }],
      type: 'text_to_image',
      size: '',
    } as any, openaiSelection({
      endpoint: 'chat/completions',
      routeType: 'text_to_image',
      model: { ...selection().model, model_name: 'gemini-3.1-flash-image', capabilities: { text_to_image: true } },
    }))
    expect(body.messages[0].content).toBe('a cat')
  })

  test('images/generations body passes size through in openai x-format', () => {
    const body = buildProviderRequestBody({
      model: 'x',
      messages: [{ role: 'user', content: 'a cat' }],
      type: 'text_to_image',
      size: '1344*768',
    } as any, openaiSelection({
      endpoint: 'images/generations',
      routeType: 'text_to_image',
      model: { ...selection().model, model_name: 'gpt-image-2', capabilities: { text_to_image: true } },
    }))
    expect(body.prompt).toBe('a cat')
    expect(body.size).toBe('1344x768')
  })

  test('forwards negative_prompt only on media payloads', () => {
    const mediaBody = buildProviderRequestBody({
      model: 'x',
      messages: [{ role: 'user', content: 'a cat' }],
      type: 'text_to_image',
      negative_prompt: 'blurry',
    } as any, openaiSelection({
      endpoint: 'images/generations',
      routeType: 'text_to_image',
      model: { ...selection().model, model_name: 'gpt-image-2', capabilities: { text_to_image: true } },
    }))
    expect(mediaBody.negative_prompt).toBe('blurry')

    const chatBody = buildProviderRequestBody({
      model: 'x',
      messages: [{ role: 'user', content: 'a cat' }],
      type: 'chat',
      negative_prompt: 'must not leak',
    } as any, openaiSelection({
      endpoint: 'chat/completions',
      routeType: 'chat',
      model: { ...selection().model, model_name: 'gpt-5.5', capabilities: { chat: true } },
    }))
    expect(chatBody.negative_prompt).toBeUndefined()
  })

  test('does not expose negative_prompt through non-media payload templates', () => {
    const routeConfig = {
      payload_template: { prompt: '{{prompt}}', negative: '{{negative_prompt}}' },
    }
    const chatBody = buildProviderRequestBody({
      model: 'x', messages: [{ role: 'user', content: 'chat prompt' }], type: 'chat', negative_prompt: 'secret-negative',
    } as any, openaiSelection({ routeConfig, routeType: 'chat' }))
    expect(chatBody).toEqual({ prompt: 'chat prompt' })

    const mediaBody = buildProviderRequestBody({
      model: 'x', messages: [{ role: 'user', content: 'image prompt' }], type: 'text_to_image', negative_prompt: 'blurry',
    } as any, openaiSelection({ routeConfig, routeType: 'text_to_image' }))
    expect(mediaBody).toEqual({ prompt: 'image prompt', negative: 'blurry' })
  })

  test('image_to_image request bound for chat endpoint attaches the source image', () => {
    const body = buildProviderRequestBody({
      model: 'x',
      messages: [{ role: 'user', content: '改成夜景' }],
      type: 'image_to_image',
      image_url: 'https://example.com/a.png',
      size: '1024*1024',
    } as any, openaiSelection({
      endpoint: 'chat/completions',
      routeType: 'image_to_image',
      model: { ...selection().model, model_name: 'gemini-3.1-flash-image', capabilities: { image_to_image: true } },
    }))
    expect(body.messages[0].content[0].type).toBe('text')
    expect(body.messages[0].content[0].text).toContain('改成夜景')
    expect(body.messages[0].content[0].text).toContain('宽高比 1:1')
    expect(body.messages[0].content[1]).toEqual({ type: 'image_url', image_url: { url: 'https://example.com/a.png' } })
  })

  test('chat media bodies preserve every canonical reference in exact order', () => {
    const body = buildProviderRequestBody({
      model: 'x',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: '首尾帧生成视频' },
          { type: 'image_url', image_url: { url: 'https://example.com/first.png' } },
          { type: 'image_url', image_url: { url: 'https://example.com/last.png' } },
        ],
      }],
      type: 'image_to_video',
      image_url: 'https://example.com/first.png',
      reference_images: [
        { url: 'https://example.com/first.png', reference_index: 1, reference_role: 'first_frame' },
        { url: 'https://example.com/last.png', reference_index: 2, reference_role: 'last_frame' },
      ],
    } as any, openaiSelection({
      endpoint: 'chat/completions',
      routeType: 'image_to_video',
      model: { ...selection().model, model_name: 'gemini-video', capabilities: { image_to_video: true } },
    }))

    expect(body.messages[0].content).toEqual([
      { type: 'text', text: '首尾帧生成视频' },
      { type: 'image_url', image_url: { url: 'https://example.com/first.png' } },
      { type: 'image_url', image_url: { url: 'https://example.com/last.png' } },
    ])
  })

  test('explicit media array capabilities map all URL or metadata references without guessing fields', () => {
    const baseRequest = {
      model: 'x',
      messages: [{ role: 'user', content: '生成视频' }],
      type: 'image_to_video',
      image_url: 'https://example.com/first.png',
      reference_images: [
        { url: 'https://example.com/first.png', reference_index: 1, reference_role: 'first_frame' },
        { url: 'https://example.com/last.png', reference_index: 2, reference_role: 'last_frame' },
      ],
    } as any

    const urlsBody = buildProviderRequestBody(baseRequest, openaiSelection({
      endpoint: 'videos/generations',
      routeType: 'image_to_video',
      model: {
        ...selection().model,
        capabilities: { image_to_video: true },
        context_ui_params: { multi_reference: { supported: true, field: 'input_images', shape: 'urls', max: 9 } },
      },
    }))
    expect(urlsBody.input_images).toEqual([
      'https://example.com/first.png',
      'https://example.com/last.png',
    ])
    expect(urlsBody.reference_images).toBeUndefined()

    const metadataBody = buildProviderRequestBody(baseRequest, openaiSelection({
      endpoint: 'videos/generations',
      routeType: 'image_to_video',
      model: {
        ...selection().model,
        capabilities: { image_to_video: true },
        context_ui_params: { multiReference: { supported: true, field: 'references', shape: 'metadata' } },
      } as any,
    }))
    expect(metadataBody.references).toEqual(baseRequest.reference_images)
  })

  test('undeclared media endpoints reject multiple references at body-build time', () => {
    expect(() => buildProviderRequestBody({
      model: 'x',
      messages: [{ role: 'user', content: '生成视频' }],
      type: 'image_to_video',
      image_url: 'https://example.com/first.png',
      reference_images: [
        { url: 'https://example.com/first.png', reference_index: 1 },
        { url: 'https://example.com/last.png', reference_index: 2 },
      ],
    } as any, openaiSelection({
      endpoint: 'videos/generations',
      routeType: 'image_to_video',
      model: { ...selection().model, capabilities: { image_to_video: true }, context_ui_params: {} },
    }))).toThrow(expect.objectContaining({ code: 'MULTI_REFERENCE_UNSUPPORTED' }))
  })

  test('route DSL renders the full ordered reference collection through nested objects', () => {
    const referenceImages = [
      { url: 'https://example.com/first.png', reference_index: 1, reference_role: 'first_frame' },
      { url: 'https://example.com/last.png', reference_index: 2, reference_role: 'last_frame' },
    ]
    const body = buildProviderRequestBody({
      model: 'x',
      messages: [{ role: 'user', content: '生成视频' }],
      type: 'image_to_video',
      image_url: referenceImages[0].url,
      reference_images: referenceImages,
    } as any, openaiSelection({
      endpoint: 'videos/generations',
      routeType: 'image_to_video',
      routeConfig: {
        payloadTemplate: {
          payload: {
            inputs: [{ references: '{{reference_images}}' }],
          },
        },
      },
    }))

    expect(body).toEqual({ payload: { inputs: [{ references: referenceImages }] } })
  })

  test('Gemini native and Anthropic bodies keep all ordered message image parts', () => {
    const multimodalRequest = {
      model: 'x',
      type: 'image_to_video',
      image_url: 'https://example.com/first.png',
      reference_images: [
        { url: 'https://example.com/first.png', reference_index: 1 },
        { url: 'https://example.com/last.png', reference_index: 2 },
      ],
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: '生成视频' },
          { type: 'image_url', image_url: { url: 'https://example.com/first.png' } },
          { type: 'image_url', image_url: { url: 'https://example.com/last.png' } },
        ],
      }],
    } as any

    const geminiBody = buildProviderRequestBody(multimodalRequest, openaiSelection({
      apiFormat: 'gemini_native',
      endpoint: 'models/gemini-video:generateContent',
    }))
    expect(geminiBody.contents[0].parts).toEqual([
      { text: '生成视频' },
      { fileData: { mimeType: 'image/png', fileUri: 'https://example.com/first.png' } },
      { fileData: { mimeType: 'image/png', fileUri: 'https://example.com/last.png' } },
    ])

    const anthropicBody = buildProviderRequestBody(multimodalRequest, openaiSelection({
      apiFormat: 'anthropic',
      endpoint: 'messages',
    }))
    expect(anthropicBody.messages[0].content).toEqual(multimodalRequest.messages[0].content)
  })

  test('explicit native capabilities still materialize every canonical reference into provider messages', () => {
    const canonicalOnlyRequest = {
      model: 'x',
      type: 'image_to_video',
      image_url: 'https://example.com/first.png',
      reference_images: [
        { url: 'https://example.com/first.png', reference_index: 1 },
        { url: 'https://example.com/last.png', reference_index: 2 },
      ],
      messages: [{ role: 'user', content: '生成视频' }],
    } as any
    const explicitModel = {
      ...selection().model,
      context_ui_params: { multi_reference: { supported: true, max: 9 } },
    }

    const geminiBody = buildProviderRequestBody(canonicalOnlyRequest, openaiSelection({
      apiFormat: 'gemini_native',
      endpoint: 'models/gemini-video:generateContent',
      model: explicitModel,
    }))
    expect(geminiBody.contents[0].parts).toEqual([
      { text: '生成视频' },
      { fileData: { mimeType: 'image/png', fileUri: 'https://example.com/first.png' } },
      { fileData: { mimeType: 'image/png', fileUri: 'https://example.com/last.png' } },
    ])

    const anthropicBody = buildProviderRequestBody(canonicalOnlyRequest, openaiSelection({
      apiFormat: 'anthropic',
      endpoint: 'messages',
      model: explicitModel,
    }))
    expect(anthropicBody.messages[0].content).toEqual([
      { type: 'text', text: '生成视频' },
      { type: 'image_url', image_url: { url: 'https://example.com/first.png' } },
      { type: 'image_url', image_url: { url: 'https://example.com/last.png' } },
    ])
  })
})

describe('gemini chat-style image response extraction', () => {
  const imageSelection = (overrides: Partial<RuntimeModelSelection> = {}) => selection({
    apiFormat: 'openai_compatible',
    endpoint: 'chat/completions',
    routeType: 'text_to_image',
    provider: { ...selection().provider, api_format: 'openai_compatible', endpoints: {} },
    model: { ...selection().model, model_name: 'gemini-3.1-flash-image', capabilities: { text_to_image: true } },
    ...overrides,
  })

  test('extracts image from message.images array with null content', () => {
    const parsed = parseProviderResponsePayload({
      choices: [{
        message: {
          role: 'assistant',
          content: null,
          images: [{ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc123' }, index: 0 }],
        },
        finish_reason: 'stop',
      }],
    }, imageSelection())
    expect(parsed.content).toBe('data:image/jpeg;base64,abc123')
  })

  test('extracts image from multimodal content part array', () => {
    const parsed = parseProviderResponsePayload({
      choices: [{
        message: {
          content: [
            { type: 'text', text: 'here you go' },
            { type: 'image_url', image_url: { url: 'https://cdn.example.com/pic.png' } },
          ],
        },
      }],
    }, imageSelection())
    expect(parsed.content).toBe('https://cdn.example.com/pic.png')
  })
})

import { afterEach, describe, expect, test } from 'bun:test'
import { ConfiguredProviderAdapter, classifyLLMError } from './adapter'
import { resetOpenAIResponsesCreateForTest, setOpenAIResponsesCreateForTest } from './openai-responses-sdk'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  resetOpenAIResponsesCreateForTest()
})

describe('LLM adapter error classification', () => {
  test('classifies connection refused as a network error', () => {
    expect(classifyLLMError(new Error('ConnectionRefused'))).toBe('network')
  })
})
describe('ConfiguredProviderAdapter endpoint normalization', () => {
  test('ignores string undefined endpoints and falls back to OpenAI chat completions', async () => {
    let capturedUrl = ''
    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = String(url)
      return new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 })
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'chatgpt2api',
        display_name: 'chatgpt2api',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'Bearer',
        response_mode: 'stream',
        supported_modalities: ['chat'],
        default_base_url: 'https://gpt2api.example/v1',
        is_active: true,
        endpoints: {
          chat: 'undefined',
          responses: 'undefined',
          messages: 'undefined',
        },
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'chatgpt2api',
        key: 'auth-key',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'chatgpt2api',
        display_name: 'gpt-5',
        model_name: 'gpt-5',
        capabilities: { chat: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    const result = await adapter.execute({
      model: 'balanced',
      messages: [{ role: 'user', content: 'Return OK' }],
      response_format: 'text',
    })

    expect(capturedUrl).toBe('https://gpt2api.example/v1/chat/completions')
    expect(result.content).toBe('OK')
  })
})
describe('ConfiguredProviderAdapter Codex Responses requests', () => {
  test('sends Codex client compatibility fields through the OpenAI SDK transport', async () => {
    let capturedCall: any = null
    let capturedBody: any = null
    setOpenAIResponsesCreateForTest(async call => {
      capturedCall = call
      capturedBody = call.body
      return { output_text: 'OK', status: 'completed' }
    })

    const adapter = new ConfiguredProviderAdapter(
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
        endpoints: { responses: '/responses' },
        custom_headers: { 'X-Provider': 'codex-proxy', 'User-Agent': 'CustomMangaForge/2.0' },
      },
      {
        id: 1,
        provider: 'codex-proxy',
        key: 'sk-test',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
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
    )

    await adapter.execute({
      model: 'balanced',
      messages: [{ role: 'user', content: 'Return exactly: OK' }],
      temperature: 0,
      max_tokens: 8,
      response_format: 'text',
    })

    expect(capturedBody).toMatchObject({
      model: 'gpt-5-codex',
      input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Return exactly: OK' }] }],
      tools: [],
      tool_choice: 'auto',
      parallel_tool_calls: true,
      store: false,
      stream: false,
      include: ['reasoning.encrypted_content'],
      instructions: 'You are Codex, a coding agent based on GPT-5.',
      text: { format: { type: 'text' } },
    })
    expect(capturedBody.prompt_cache_key).toBeTruthy()
    expect(capturedBody.client_metadata).toMatchObject({
      session_id: capturedBody.prompt_cache_key,
      thread_id: capturedBody.prompt_cache_key,
    })
    expect(capturedCall.headers).toMatchObject({
      'X-Provider': 'codex-proxy',
      'User-Agent': 'CustomMangaForge/2.0',
    })
    expect(capturedBody).not.toHaveProperty('reasoning')
    expect(capturedBody).not.toHaveProperty('messages')
    expect(capturedBody).not.toHaveProperty('max_tokens')
    expect(capturedBody).not.toHaveProperty('max_output_tokens')
    expect(capturedBody).not.toHaveProperty('temperature')
    expect(capturedBody.text).not.toEqual({ format: { type: 'json_object' } })
  })

  test('routes AnyRouter bare GPT models through Codex Responses for probes', async () => {
    let capturedBody: any = null
    let capturedUrl = ''
    let capturedHeaders: Record<string, string> = {}
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedHeaders = init?.headers as Record<string, string>
      capturedBody = JSON.parse(String(init?.body || '{}'))
      return new Response([
        'data: {"type":"response.output_text.delta","delta":"OK"}',
        'data: {"type":"response.completed","response":{"status":"completed"}}',
        'data: [DONE]',
        '',
      ].join('\n\n'), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
    }) as typeof fetch
    setOpenAIResponsesCreateForTest(async call => {
      throw new Error(`OpenAI SDK should not be used for AnyRouter Codex Responses probes: ${call.baseURL}`)
    })

    const adapter = new ConfiguredProviderAdapter(
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
        endpoints: { responses: '/responses' },
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'any',
        key: 'sk-test',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'any',
        display_name: 'gpt-5.5',
        model_name: 'gpt-5.5',
        capabilities: { chat: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    await adapter.execute({
      model: 'balanced',
      messages: [{ role: 'user', content: 'Return exactly: OK' }],
      temperature: 0,
      max_tokens: 8,
      response_format: 'text',
    })

    expect(capturedUrl).toBe('https://anyrouter.top/v1/responses')
    expect(capturedHeaders.Accept).toBe('text/event-stream')
    expect(capturedBody).toMatchObject({
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
    expect(capturedBody.prompt_cache_key).toBeTruthy()
    expect(capturedBody.client_metadata).toMatchObject({
      session_id: capturedBody.prompt_cache_key,
      thread_id: capturedBody.prompt_cache_key,
    })
    expect(capturedBody).not.toHaveProperty('messages')
    expect(capturedBody).not.toHaveProperty('max_tokens')
    expect(capturedBody).not.toHaveProperty('max_output_tokens')
    expect(capturedBody).not.toHaveProperty('temperature')
  })

  test('forces AnyRouter top Codex Responses probes to stream for provider stream mode', async () => {
    let capturedBody: any = null
    let capturedHeaders: Record<string, string> = {}
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string>
      capturedBody = JSON.parse(String(init?.body || '{}'))
      return new Response([
        'data: {"type":"response.output_text.delta","delta":"OK"}',
        'data: {"type":"response.completed","response":{"status":"completed"}}',
        'data: [DONE]',
        '',
      ].join('\n\n'), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
    }) as typeof fetch
    setOpenAIResponsesCreateForTest(async call => {
      throw new Error(`OpenAI SDK should not be used for AnyRouter Codex Responses probes: ${call.baseURL}`)
    })

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'any',
        display_name: 'AnyRouter',
        service_type: 'llm',
        api_format: 'codex_responses',
        auth_type: 'bearer',
        response_mode: 'stream',
        supported_modalities: ['chat'],
        default_base_url: 'https://anyrouter.top/v1',
        is_active: true,
        endpoints: {},
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'any',
        key: 'sk-test',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'any',
        display_name: 'codex-test-model',
        model_name: 'codex-test-model',
        capabilities: { chat: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    await adapter.execute({
      model: 'balanced',
      messages: [{ role: 'user', content: 'Return exactly: OK' }],
      response_format: 'text',
    })

    expect(capturedHeaders.Accept).toBe('text/event-stream')
    expect(capturedBody.stream).toBe(true)
  })

  test('applies model-level response mode and custom header overrides for configured probes', async () => {
    let capturedBody: any = null
    let capturedHeaders: Record<string, string> = {}
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
    setOpenAIResponsesCreateForTest(async call => {
      throw new Error(`OpenAI SDK should not be used for AnyRouter Codex Responses probes: ${call.baseURL}`)
    })

    const adapter = new ConfiguredProviderAdapter(
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
      {
        id: 1,
        provider: 'any',
        key: 'sk-test',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'any',
        display_name: 'codex-test-model',
        model_name: 'codex-test-model',
        capabilities: { chat: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {
          response_mode: 'stream',
          custom_headers: {
            'X-Client': 'model-client',
            'X-Model-Only': 'model-header',
            'User-Agent': 'ModelUA/2.0',
          },
        },
      },
    )

    await adapter.execute({
      model: 'balanced',
      messages: [{ role: 'user', content: 'Return exactly: OK' }],
      response_format: 'text',
    })

    expect(capturedBody.stream).toBe(true)
    expect(capturedHeaders.accept).toBe('text/event-stream')
    expect(capturedHeaders['x-client']).toBe('model-client')
    expect(capturedHeaders['x-model-only']).toBe('model-header')
    expect(capturedHeaders['user-agent']).toBe('ModelUA/2.0')
  })
})

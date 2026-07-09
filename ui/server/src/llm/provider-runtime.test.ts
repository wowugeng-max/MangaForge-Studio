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

describe('codex responses provider runtime', () => {
  test('ignores string undefined endpoint placeholders for OpenAI-compatible providers', () => {
    expect(endpointForProvider({
      id: 'chatgpt2api',
      display_name: 'chatgpt2api',
      service_type: 'llm',
      api_format: 'openai_compatible',
      auth_type: 'Bearer',
      supported_modalities: ['chat'],
      default_base_url: 'https://gpt2api.example/v1',
      is_active: true,
      endpoints: {
        chat: 'undefined',
        responses: 'undefined',
      },
      custom_headers: {},
    })).toBe('chat/completions')
  })

  test('routes claude_code providers to the Claude messages endpoint', () => {
    expect(endpointForProvider({
      id: 'claude-code',
      display_name: 'Claude Code Gateway',
      service_type: 'llm',
      api_format: 'claude_code',
      auth_type: 'bearer',
      supported_modalities: ['chat'],
      default_base_url: 'https://gateway.example/v1',
      is_active: true,
      endpoints: {},
      custom_headers: {},
    })).toBe('messages')
  })

  test('builds Claude Code messages request bodies with top-level system and streaming', () => {
    const body = buildProviderRequestBody({
      model: 'claude-opus-4-8',
      messages: [
        { role: 'system', content: 'You are careful.' },
        { role: 'user', content: 'Return OK.' },
      ],
      temperature: 0.2,
      max_tokens: 128,
      response_format: 'text',
      stream: true,
    }, selection({
      provider: {
        id: 'claude-code',
        display_name: 'Claude Code Gateway',
        service_type: 'llm',
        api_format: 'claude_code',
        auth_type: 'bearer',
        response_mode: 'stream',
        supported_modalities: ['chat'],
        default_base_url: 'https://gateway.example/v1',
        is_active: true,
        endpoints: {},
        custom_headers: {},
      },
      model: {
        id: 9,
        api_key_id: 1,
        provider: 'claude-code',
        display_name: 'Claude Opus',
        model_name: 'claude-opus-4-8[1M]',
        capabilities: { chat: true },
        health_status: 'healthy',
        is_favorite: false,
        is_manual: false,
        context_ui_params: {},
      },
      apiFormat: 'claude_code',
      endpoint: 'messages',
    }))

    expect(body).toEqual({
      model: 'claude-opus-4-8',
      messages: [{ role: 'user', content: 'Return OK.' }],
      temperature: 0.2,
      max_tokens: 128,
      system: 'You are careful.',
      stream: true,
      anthropic_beta: ['context-1m-2025-08-07'],
    })
  })

  test('uses model api_format override before provider default during runtime execution', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-claude-override-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'mixed-gateway',
          display_name: 'Mixed Gateway',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          response_mode: 'stream',
          supported_modalities: ['chat'],
          default_base_url: 'https://gateway.example/v1',
          is_active: true,
          endpoints: {},
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 1, provider: 'mixed-gateway', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        {
          id: 1,
          api_key_id: 1,
          provider: 'mixed-gateway',
          display_name: 'Claude Opus',
          model_name: 'claude-opus-4-8',
          api_format: 'claude_code',
          capabilities: { chat: true },
          health_status: 'healthy',
          context_ui_params: {
            context_window: 1_000_000,
            max_context: 1_000_000,
            context_window_preset: '1m',
          },
        },
      ]))

      let capturedUrl = ''
      let capturedHeaders: Record<string, string> = {}
      let capturedBody: any = null
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        capturedUrl = String(url)
        capturedHeaders = Object.fromEntries(new Headers(init?.headers || {}).entries())
        capturedBody = JSON.parse(String(init?.body || '{}'))
        return new Response(JSON.stringify({
          content: [{ type: 'text', text: 'Claude override OK' }],
          stop_reason: 'end_turn',
        }), { status: 200 })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        messages: [
          { role: 'system', content: 'Use Claude messages.' },
          { role: 'user', content: 'Say OK.' },
        ],
        temperature: 0.1,
        max_tokens: 64,
        response_format: 'text',
      }, 1, { maxRetries: 0 })

      expect(capturedUrl).toBe('https://gateway.example/v1/messages')
      expect(capturedHeaders['anthropic-version']).toBe('2023-06-01')
      expect(capturedHeaders['anthropic-beta']).toContain('claude-code-20250219')
      expect(capturedHeaders['anthropic-beta']).toContain('context-1m')
      expect(capturedBody).toMatchObject({
        model: 'claude-opus-4-8',
        system: 'Use Claude messages.',
        messages: [{ role: 'user', content: 'Say OK.' }],
        max_tokens: 64,
        anthropic_beta: expect.arrayContaining(['context-1m-2025-08-07']),
      })
      expect(capturedBody.response_format).toBeUndefined()
      expect(capturedBody.tool_choice).toBeUndefined()
      expect(result.content).toBe('Claude override OK')
      expect(result.runtimeSelection?.apiFormat).toBe('claude_code')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('uses AnyRouter Claude Code compatible request shape for 1M models', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-anyrouter-claude-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'any',
          display_name: 'AnyRouter',
          service_type: 'llm',
          api_format: 'claude_code',
          auth_type: 'bearer',
          response_mode: 'auto',
          supported_modalities: ['chat'],
          default_base_url: 'https://anyrouter.top',
          is_active: true,
          endpoints: {},
          custom_headers: {},
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
          display_name: 'Claude Opus 1M',
          model_name: 'claude-opus-4-8[1m]',
          api_format: 'claude_code',
          capabilities: { chat: true },
          health_status: 'healthy',
          context_ui_params: {
            context_window: 1_000_000,
            max_context: 1_000_000,
            context_window_preset: '1m',
          },
        },
      ]))

      let capturedUrl = ''
      let capturedHeaders: Record<string, string> = {}
      let capturedBody: any = null
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        capturedUrl = String(url)
        capturedHeaders = Object.fromEntries(new Headers(init?.headers || {}).entries())
        capturedBody = JSON.parse(String(init?.body || '{}'))
        return new Response(JSON.stringify({
          content: [{ type: 'text', text: 'AnyRouter Claude OK' }],
          stop_reason: 'end_turn',
        }), { status: 200 })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        messages: [{ role: 'user', content: 'Say OK.' }],
        temperature: 0.1,
        max_tokens: 64,
        response_format: 'text',
      }, 1, { maxRetries: 0 })

      expect(capturedUrl).toBe('https://anyrouter.top/v1/messages')
      expect(capturedHeaders.authorization).toBe('Bearer secret-key')
      expect(capturedHeaders['x-api-key']).toBeUndefined()
      expect(capturedHeaders['anthropic-beta']).toContain('claude-code-20250219')
      expect(capturedHeaders['anthropic-beta']).toContain('context-1m')
      expect(capturedHeaders['anthropic-beta']).not.toContain('interleaved-thinking')
      expect(capturedHeaders['x-app']).toBeUndefined()
      expect(capturedHeaders['anthropic-dangerous-direct-browser-access']).toBeUndefined()
      expect(capturedHeaders['x-stainless-lang']).toBeUndefined()
      expect(capturedBody).toMatchObject({
        model: 'claude-opus-4-8[1m]',
        messages: [{ role: 'user', content: 'Say OK.' }],
        max_tokens: 64,
      })
      expect(capturedBody.anthropic_beta).toBeUndefined()
      expect(result.content).toBe('AnyRouter Claude OK')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('maps synced AnyRouter Claude catalog ids back to Claude Code local role ids for top gateway', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-anyrouter-claude-synced-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'any',
          display_name: 'AnyRouter',
          service_type: 'llm',
          api_format: 'claude_code',
          auth_type: 'bearer',
          response_mode: 'auto',
          supported_modalities: ['chat'],
          default_base_url: 'https://anyrouter.top',
          is_active: true,
          endpoints: {},
          custom_headers: {},
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
          display_name: 'Claude Opus 1M',
          model_name: 'anthropic/claude-opus-4.8',
          api_format: 'claude_code',
          capabilities: { chat: true },
          health_status: 'healthy',
          context_ui_params: {
            context_window: 1_000_000,
            max_context: 1_000_000,
            context_window_preset: '1m',
          },
        },
      ]))

      let capturedBody: any = null
      globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(String(init?.body || '{}'))
        return new Response(JSON.stringify({
          content: [{ type: 'text', text: 'AnyRouter Claude OK' }],
          stop_reason: 'end_turn',
        }), { status: 200 })
      }) as typeof fetch

      await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        messages: [{ role: 'user', content: 'Say OK.' }],
        temperature: 0.1,
        max_tokens: 64,
        response_format: 'text',
      }, 1, { maxRetries: 0 })

      expect(capturedBody.model).toBe('claude-opus-4-8[1m]')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('can preserve AnyRouter Claude Code 1M suffix when explicitly requested', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-anyrouter-claude-preserve-suffix-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'any',
          display_name: 'AnyRouter',
          service_type: 'llm',
          api_format: 'claude_code',
          auth_type: 'bearer',
          response_mode: 'auto',
          supported_modalities: ['chat'],
          default_base_url: 'https://anyrouter.top',
          is_active: true,
          endpoints: {},
          custom_headers: {},
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
          display_name: 'Claude Opus 1M',
          model_name: 'claude-opus-4-8[1m]',
          api_format: 'claude_code',
          capabilities: { chat: true },
          health_status: 'healthy',
          context_ui_params: {
            context_window: 1_000_000,
            max_context: 1_000_000,
            context_window_preset: '1m',
            claude_code_model_suffix_mode: 'preserve',
          },
        },
      ]))

      let capturedBody: any = null
      globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(String(init?.body || '{}'))
        return new Response(JSON.stringify({
          content: [{ type: 'text', text: 'AnyRouter Claude OK' }],
          stop_reason: 'end_turn',
        }), { status: 200 })
      }) as typeof fetch

      await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        messages: [{ role: 'user', content: 'Say OK.' }],
        temperature: 0.1,
        max_tokens: 64,
        response_format: 'text',
      }, 1, { maxRetries: 0 })

      expect(capturedBody.model).toBe('claude-opus-4-8[1m]')
      expect(capturedBody.anthropic_beta).toBeUndefined()
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('uses model api_format override for Gemini native default routing and auth', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-gemini-override-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'mixed-gateway',
          display_name: 'Mixed Gateway',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          response_mode: 'auto',
          supported_modalities: ['chat', 'vision'],
          is_active: true,
          endpoints: {},
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 7, provider: 'mixed-gateway', key: 'gemini-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        {
          id: 7,
          api_key_id: 7,
          provider: 'mixed-gateway',
          display_name: 'Gemini Override',
          model_name: 'gemini-1.5-pro',
          api_format: 'gemini_native',
          capabilities: { chat: true, vision: true },
          health_status: 'healthy',
        },
      ]))

      let capturedUrl = ''
      let capturedHeaders: Record<string, string> = {}
      let capturedBody: any = null
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        capturedUrl = String(url)
        capturedHeaders = Object.fromEntries(new Headers(init?.headers || {}).entries())
        capturedBody = JSON.parse(String(init?.body || '{}'))
        return new Response(JSON.stringify({
          candidates: [{
            content: { parts: [{ text: 'Gemini override OK' }] },
            finishReason: 'STOP',
          }],
        }), { status: 200 })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        messages: [{ role: 'user', content: 'Say OK.' }],
        response_format: 'text',
      }, 7, { maxRetries: 0 })

      expect(capturedUrl).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent')
      expect(capturedHeaders['x-goog-api-key']).toBe('gemini-key')
      expect(capturedHeaders.authorization).toBeUndefined()
      expect(capturedBody).toMatchObject({
        contents: [{ role: 'user', parts: [{ text: 'Say OK.' }] }],
      })
      expect(result.content).toBe('Gemini override OK')
      expect(result.runtimeSelection?.apiFormat).toBe('gemini_native')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('parses Claude Code streaming message deltas', async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode('event: content_block_delta\n'))
        controller.enqueue(encoder.encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"你"}}\n\n'))
        controller.enqueue(encoder.encode('event: content_block_delta\n'))
        controller.enqueue(encoder.encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"好"}}\n\n'))
        controller.enqueue(encoder.encode('event: message_delta\n'))
        controller.enqueue(encoder.encode('data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":2}}\n\n'))
        controller.close()
      },
    })

    const raw = await readProviderStream(new Response(stream), selection({ apiFormat: 'claude_code' }))
    const parsed = parseProviderResponsePayload(raw, selection({ apiFormat: 'claude_code' }))

    expect(parsed.content).toBe('你好')
    expect(parsed.finish_reason).toBe('end_turn')
    expect(parsed.usage?.output_tokens).toBe(2)
  })

  test('routes codex_responses providers to the responses endpoint', () => {
    expect(endpointForProvider({
      id: 'codex-proxy',
      display_name: 'Codex Proxy',
      service_type: 'llm',
      api_format: 'codex_responses',
      auth_type: 'bearer',
      supported_modalities: ['chat'],
      default_base_url: 'https://api.openai.com/v1',
      is_active: true,
      endpoints: {},
      custom_headers: {},
    })).toBe('responses')
  })

  test('executes config-driven endpoint objects with payload templates and result extraction', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-template-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'template-provider',
          display_name: 'Template Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'x-api-key',
          supported_modalities: ['chat'],
          default_base_url: 'https://api.example.com/v1',
          is_active: true,
          endpoints: {
            chat: {
              url: '/tasks/create',
              headers: { 'X-Route-Mode': 'runtime-template' },
              payload_template: {
                modelName: '{{model}}',
                input: '{{prompt}}',
                size: '{{size}}',
              },
              result_extractor: 'output.answer',
            },
          },
          custom_headers: { 'X-Global': 'yes' },
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 1, provider: 'template-provider', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 1, api_key_id: 1, provider: 'template-provider', display_name: 'Template Model', model_name: 'template-model', capabilities: { chat: true }, health_status: 'healthy' },
      ]))

      let capturedUrl = ''
      let capturedHeaders: Record<string, string> = {}
      let capturedBody: any = null
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        capturedUrl = String(url)
        capturedHeaders = Object.fromEntries(new Headers(init?.headers || {}).entries())
        capturedBody = JSON.parse(String(init?.body || '{}'))
        return new Response(JSON.stringify({ output: { answer: '运行时模板响应' } }), { status: 200 })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        messages: [{ role: 'user', content: '请生成运行时内容' }],
        temperature: 0.4,
        max_tokens: 128,
        response_format: 'text',
        size: '1280x720',
      } as any, 1, { maxRetries: 0 })

      expect(capturedUrl).toBe('https://api.example.com/v1/tasks/create')
      expect(capturedHeaders['x-api-key']).toBe('secret-key')
      expect(capturedHeaders['x-global']).toBe('yes')
      expect(capturedHeaders['x-route-mode']).toBe('runtime-template')
      expect(capturedBody).toEqual({
        modelName: 'template-model',
        input: '请生成运行时内容',
        size: '1280*720',
      })
      expect(result.content).toBe('运行时模板响应')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('accepts camelCase endpoint DSL fields in runtime model execution', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-camel-template-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'camel-template-provider',
          display_name: 'Camel Template Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['chat'],
          default_base_url: 'https://api.example.com/v1',
          is_active: true,
          endpoints: {
            chat: {
              endpoint: '/camel/create',
              payloadTemplate: {
                modelName: '{{model}}',
                input: '{{prompt}}',
              },
              resultExtractor: 'output.answer',
            },
          },
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 1, provider: 'camel-template-provider', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 1, api_key_id: 1, provider: 'camel-template-provider', display_name: 'Camel Template Model', model_name: 'camel-template-model', capabilities: { chat: true }, health_status: 'healthy' },
      ]))

      let capturedUrl = ''
      let capturedBody: any = null
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        capturedUrl = String(url)
        capturedBody = JSON.parse(String(init?.body || '{}'))
        return new Response(JSON.stringify({ output: { answer: 'runtime camel ok' } }), { status: 200 })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        messages: [{ role: 'user', content: 'runtime camel payload' }],
        temperature: 0.2,
        max_tokens: 64,
        response_format: 'text',
      }, 1, { maxRetries: 0 })

      expect(capturedUrl).toBe('https://api.example.com/v1/camel/create')
      expect(capturedBody).toEqual({
        modelName: 'camel-template-model',
        input: 'runtime camel payload',
      })
      expect(result.content).toBe('runtime camel ok')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('executes Gemini native providers through generateContent without a configured base URL', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-gemini-native-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'gemini',
          display_name: 'Google Gemini',
          service_type: 'llm',
          api_format: 'gemini_native',
          auth_type: 'bearer',
          supported_modalities: ['chat', 'vision'],
          is_active: true,
          endpoints: {},
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 8, provider: 'gemini', key: 'gemini-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 8, api_key_id: 8, provider: 'gemini', display_name: 'Gemini 1.5 Pro', model_name: 'gemini-1.5-pro', capabilities: { chat: true, vision: true }, health_status: 'healthy' },
      ]))

      let capturedUrl = ''
      let capturedHeaders: Record<string, string> = {}
      let capturedBody: any = null
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        capturedUrl = String(url)
        capturedHeaders = Object.fromEntries(new Headers(init?.headers || {}).entries())
        capturedBody = JSON.parse(String(init?.body || '{}'))
        return new Response(JSON.stringify({
          candidates: [{
            content: { parts: [{ text: 'Gemini runtime OK' }] },
            finishReason: 'STOP',
          }],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 4,
            totalTokenCount: 9,
          },
        }), { status: 200 })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        messages: [
          { role: 'system', content: 'Be concise.' },
          { role: 'user', content: 'Return exactly OK.' },
        ],
        temperature: 0.25,
        max_tokens: 48,
        response_format: 'text',
      }, 8, { maxRetries: 0 })

      expect(capturedUrl).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent')
      expect(capturedHeaders['x-goog-api-key']).toBe('gemini-key')
      expect(capturedHeaders.authorization).toBeUndefined()
      expect(capturedBody).toEqual({
        contents: [
          { role: 'user', parts: [{ text: 'Return exactly OK.' }] },
        ],
        systemInstruction: {
          parts: [{ text: 'Be concise.' }],
        },
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 48,
        },
      })
      expect(result.content).toBe('Gemini runtime OK')
      expect(result.usage).toEqual({ input_tokens: 5, output_tokens: 4, total_tokens: 9 })
      expect(result.finish_reason).toBe('STOP')
      expect(result.runtimeSelection?.baseUrl).toBe('https://generativelanguage.googleapis.com/v1beta')
      expect(result.runtimeSelection?.endpoint).toBe('models/gemini-1.5-pro:generateContent')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('builds media prompts from text parts only when messages include image references', () => {
    const body = buildProviderRequestBody({
      model: 'balanced',
      type: 'image_to_image',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'turn this into ink style' },
          { type: 'image_url', image_url: { url: 'https://cdn.example/input.png' } },
        ],
      }],
      image_url: 'https://cdn.example/input.png',
      response_format: 'text',
    } as any, selection({
      apiFormat: 'openai_compatible',
      routeType: 'image_to_image',
      model: {
        id: 2,
        api_key_id: 1,
        provider: 'image-provider',
        display_name: 'Image Edit',
        model_name: 'image-edit-model',
        capabilities: { image_to_image: true },
        health_status: 'healthy',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    }))

    expect(body).toMatchObject({
      model: 'image-edit-model',
      prompt: 'turn this into ink style',
      image_url: 'https://cdn.example/input.png',
    })
    expect(body.prompt).not.toContain('https://cdn.example/input.png')
  })

  test('uses API key base_url before provider default_base_url for runtime requests', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-key-base-url-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'key-routed-provider',
          display_name: 'Key Routed Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['chat'],
          default_base_url: 'https://provider.example/v1',
          is_active: true,
          endpoints: {},
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 7, provider: 'key-routed-provider', key: 'secret-key', base_url: 'https://key.example/v1', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 7, api_key_id: 7, provider: 'key-routed-provider', display_name: 'Key Routed Model', model_name: 'key-routed-model', capabilities: { chat: true }, health_status: 'healthy' },
      ]))

      let capturedUrl = ''
      globalThis.fetch = (async (url: string | URL | Request) => {
        capturedUrl = String(url)
        return new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        messages: [{ role: 'user', content: 'ping' }],
        response_format: 'text',
      } as any, 7, { maxRetries: 0 })

      expect(capturedUrl).toBe('https://key.example/v1/chat/completions')
      expect(result.content).toBe('OK')
      expect(result.runtimeSelection?.baseUrl).toBe('https://key.example/v1')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('prefers balanced key priority and skips exhausted quota when auto-selecting a runtime model', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-key-routing-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'routed-provider',
          display_name: 'Routed Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['chat'],
          default_base_url: 'https://provider.example/v1',
          is_active: true,
          endpoints: {},
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 1, provider: 'routed-provider', key: 'exhausted-key', is_active: true, priority: 1, quota_total: 100, quota_remaining: 0 },
        { id: 2, provider: 'routed-provider', key: 'healthy-key', is_active: true, priority: 5, quota_total: 100, quota_remaining: 50 },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 1, api_key_id: 1, provider: 'routed-provider', display_name: 'Exhausted Model', model_name: 'same-model', capabilities: { chat: true }, health_status: 'healthy' },
        { id: 2, api_key_id: 2, provider: 'routed-provider', display_name: 'Healthy Model', model_name: 'same-model', capabilities: { chat: true }, health_status: 'healthy' },
      ]))

      const selected = await selectRuntimeModel(workspace)

      expect(selected?.key.id).toBe(2)
      expect(selected?.model.id).toBe(2)
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('supports cost-first key routing when auto-selecting a runtime model', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-cost-routing-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'strategy-provider',
          display_name: 'Strategy Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['chat'],
          default_base_url: 'https://provider.example/v1',
          is_active: true,
          endpoints: {},
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 1, provider: 'strategy-provider', key: 'priority-key', is_active: true, priority: 1, price_per_call: 0.05, quota_total: 100, quota_remaining: 50 },
        { id: 2, provider: 'strategy-provider', key: 'cheap-key', is_active: true, priority: 9, price_per_call: 0.01, quota_total: 100, quota_remaining: 50 },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 1, api_key_id: 1, provider: 'strategy-provider', display_name: 'Priority Model', model_name: 'same-model', capabilities: { chat: true }, health_status: 'healthy' },
        { id: 2, api_key_id: 2, provider: 'strategy-provider', display_name: 'Cheap Model', model_name: 'same-model', capabilities: { chat: true }, health_status: 'healthy' },
      ]))

      const selected = await selectRuntimeModel(workspace, undefined, { routingStrategy: 'cost' })

      expect(selected?.key.id).toBe(2)
      expect(selected?.model.id).toBe(2)
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('supports speed-first key routing when auto-selecting a runtime model', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-speed-routing-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'strategy-provider',
          display_name: 'Strategy Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['chat'],
          default_base_url: 'https://provider.example/v1',
          is_active: true,
          endpoints: {},
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 1, provider: 'strategy-provider', key: 'priority-key', is_active: true, priority: 1, avg_latency: 900, quota_total: 100, quota_remaining: 50 },
        { id: 2, provider: 'strategy-provider', key: 'fast-key', is_active: true, priority: 9, avg_latency: 80, quota_total: 100, quota_remaining: 50 },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 1, api_key_id: 1, provider: 'strategy-provider', display_name: 'Priority Model', model_name: 'same-model', capabilities: { chat: true }, health_status: 'healthy' },
        { id: 2, api_key_id: 2, provider: 'strategy-provider', display_name: 'Fast Model', model_name: 'same-model', capabilities: { chat: true }, health_status: 'healthy' },
      ]))

      const selected = await selectRuntimeModel(workspace, undefined, { routingStrategy: 'speed' })

      expect(selected?.key.id).toBe(2)
      expect(selected?.model.id).toBe(2)
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('uses request routing_strategy when executing through the runtime entrypoint', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-request-routing-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'strategy-provider',
          display_name: 'Strategy Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['chat'],
          default_base_url: 'https://provider.example/v1',
          is_active: true,
          endpoints: {},
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 1, provider: 'strategy-provider', key: 'priority-key', is_active: true, priority: 1, price_per_call: 0.05, quota_total: 100, quota_remaining: 50 },
        { id: 2, provider: 'strategy-provider', key: 'cheap-key', is_active: true, priority: 9, price_per_call: 0.01, quota_total: 100, quota_remaining: 50 },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 1, api_key_id: 1, provider: 'strategy-provider', display_name: 'Priority Model', model_name: 'priority-model', capabilities: { chat: true }, health_status: 'healthy' },
        { id: 2, api_key_id: 2, provider: 'strategy-provider', display_name: 'Cheap Model', model_name: 'cheap-model', capabilities: { chat: true }, health_status: 'healthy' },
      ]))

      let capturedBody: any = null
      globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(String(init?.body || '{}'))
        return new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        messages: [{ role: 'user', content: 'ping' }],
        response_format: 'text',
        routing_strategy: 'cost',
      } as any, undefined, { maxRetries: 0 })

      expect(result.runtimeSelection?.key.id).toBe(2)
      expect(result.runtimeSelection?.model.id).toBe(2)
      expect(capturedBody.model).toBe('cheap-model')
      expect(capturedBody.routing_strategy).toBeUndefined()
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('records runtime key success metrics and quota usage after provider calls', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-key-metrics-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'metrics-provider',
          display_name: 'Metrics Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['chat'],
          default_base_url: 'https://metrics.example/v1',
          is_active: true,
          endpoints: {},
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 1, provider: 'metrics-provider', key: 'metrics-key', is_active: true, quota_total: 10, quota_remaining: 10, quota_used: 0, success_count: 2, avg_latency: 100 },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 1, api_key_id: 1, provider: 'metrics-provider', display_name: 'Metrics Model', model_name: 'metrics-model', capabilities: { chat: true }, health_status: 'healthy' },
      ]))

      globalThis.fetch = (async () => new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 })) as typeof fetch

      await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        messages: [{ role: 'user', content: 'ping' }],
        response_format: 'text',
      } as any, 1, { maxRetries: 0 })

      const stored = JSON.parse(await readFile(join(workspace, 'keys.json'), 'utf8'))
      expect(stored[0]).toMatchObject({
        id: 1,
        success_count: 3,
        quota_remaining: 9,
        quota_used: 1,
      })
      expect(stored[0].last_used).toBeTruthy()
      expect(stored[0].avg_latency).toBeNumber()
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('routes default text_to_image runtime requests to image generations payloads', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-default-image-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'default-image-provider',
          display_name: 'Default Image Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['text_to_image'],
          default_base_url: 'https://api.example.com/v1',
          is_active: true,
          endpoints: {},
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 17, provider: 'default-image-provider', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 17, api_key_id: 17, provider: 'default-image-provider', display_name: 'Image Model', model_name: 'image-model', capabilities: { text_to_image: true }, health_status: 'healthy' },
      ]))

      let capturedUrl = ''
      let capturedBody: any = null
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        capturedUrl = String(url)
        capturedBody = JSON.parse(String(init?.body || '{}'))
        return new Response(JSON.stringify({ data: [{ url: 'https://cdn.example/render.png' }] }), { status: 200 })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        type: 'text_to_image',
        messages: [{ role: 'user', content: 'A white circle' }],
        size: '1024x1024',
        response_format: 'text',
      } as any, 17, { maxRetries: 0 })

      expect(capturedUrl).toBe('https://api.example.com/v1/images/generations')
      expect(capturedBody).toEqual({
        model: 'image-model',
        prompt: 'A white circle',
        size: '1024x1024',
      })
      expect(result.content).toBe('https://cdn.example/render.png')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('extracts media URLs from markdown content returned by runtime image routes', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-markdown-image-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'markdown-runtime-provider',
          display_name: 'Markdown Runtime Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['text_to_image'],
          default_base_url: 'https://api.example.com/v1',
          is_active: true,
          endpoints: {},
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 21, provider: 'markdown-runtime-provider', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 21, api_key_id: 21, provider: 'markdown-runtime-provider', display_name: 'Markdown Image Model', model_name: 'markdown-image-model', capabilities: { text_to_image: true }, health_status: 'healthy' },
      ]))

      globalThis.fetch = (async () => new Response(JSON.stringify({
        choices: [{ message: { content: '渲染完成：![preview](https://cdn.example/runtime-markdown.webp)' } }],
      }), { status: 200 })) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        type: 'text_to_image',
        messages: [{ role: 'user', content: 'A white circle' }],
        response_format: 'text',
      } as any, 21, { maxRetries: 0 })

      expect(result.content).toBe('https://cdn.example/runtime-markdown.webp')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('treats provider x-api-key auth type case-insensitively in runtime requests', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-auth-case-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'upper-x-key',
          display_name: 'Upper X Key',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'X-API-Key',
          supported_modalities: ['chat'],
          default_base_url: 'https://api.example.com/v1',
          is_active: true,
          endpoints: {},
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 1, provider: 'upper-x-key', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 1, api_key_id: 1, provider: 'upper-x-key', display_name: 'Chat', model_name: 'chat-model', capabilities: { chat: true }, health_status: 'healthy' },
      ]))

      let capturedHeaders: Record<string, string> = {}
      globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
        capturedHeaders = Object.fromEntries(new Headers(init?.headers || {}).entries())
        return new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        messages: [{ role: 'user', content: 'ping' }],
        response_format: 'text',
      }, undefined, { maxRetries: 0 })

      expect(result.content).toBe('OK')
      expect(capturedHeaders['x-api-key']).toBe('secret-key')
      expect(capturedHeaders.authorization).toBeUndefined()
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('converts local asset media image inputs to data URIs before cloud provider calls', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-local-image-'))
    try {
      await mkdir(join(workspace, 'assets'), { recursive: true })
      await writeFile(join(workspace, 'assets', 'frame.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'cloud-media-provider',
          display_name: 'Cloud Media Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['image_to_video'],
          default_base_url: 'https://api.example.com/v1',
          is_active: true,
          endpoints: {},
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 19, provider: 'cloud-media-provider', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 19, api_key_id: 19, provider: 'cloud-media-provider', display_name: 'I2V Model', model_name: 'i2v-model', capabilities: { image_to_video: true }, health_status: 'healthy' },
      ]))

      let capturedBody: any = null
      globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(String(init?.body || '{}'))
        return new Response(JSON.stringify({ data: [{ url: 'https://cdn.example/render.mp4' }] }), { status: 200 })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        type: 'image_to_video',
        image_url: '/api/assets/media/assets%2Fframe.png',
        messages: [{ role: 'user', content: '让画面动起来' }],
        response_format: 'text',
      } as any, 19, { maxRetries: 0 })

      expect(capturedBody).toMatchObject({
        model: 'i2v-model',
        prompt: '让画面动起来',
      })
      expect(capturedBody.image_url).toBe('data:image/png;base64,iVBORw==')
      expect(result.content).toBe('https://cdn.example/render.mp4')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('converts upstream temporary image file inputs to data URIs before cloud provider calls', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-local-temp-image-'))
    try {
      await mkdir(join(workspace, 'data', 'temp'), { recursive: true })
      await writeFile(join(workspace, 'data', 'temp', 'legacy.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'cloud-temp-provider',
          display_name: 'Cloud Temp Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['image_to_video'],
          default_base_url: 'https://api.example.com/v1',
          is_active: true,
          endpoints: {},
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 23, provider: 'cloud-temp-provider', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 23, api_key_id: 23, provider: 'cloud-temp-provider', display_name: 'I2V Model', model_name: 'i2v-model', capabilities: { image_to_video: true }, health_status: 'healthy' },
      ]))

      let capturedBody: any = null
      globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(String(init?.body || '{}'))
        return new Response(JSON.stringify({ data: [{ url: 'https://cdn.example/render.mp4' }] }), { status: 200 })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        type: 'image_to_video',
        image_url: '/api/files/legacy.png',
        messages: [{ role: 'user', content: '让旧临时图动起来' }],
        response_format: 'text',
      } as any, 23, { maxRetries: 0 })

      expect(capturedBody.image_url).toBe('data:image/png;base64,iVBORw==')
      expect(result.content).toBe('https://cdn.example/render.mp4')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('converts structured multimodal messages into Gemini native parts', () => {
    const body = buildProviderRequestBody({
      model: 'balanced',
      messages: [
        { role: 'system', content: 'Be precise.' },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this reference image.' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw==' } },
          ],
        },
      ],
      temperature: 0.25,
      max_tokens: 128,
      response_format: 'text',
    } as any, selection({
      provider: {
        ...selection().provider,
        api_format: 'gemini_native',
      },
      apiFormat: 'gemini_native',
    }))

    expect(body).toEqual({
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Describe this reference image.' },
            { inlineData: { mimeType: 'image/png', data: 'iVBORw==' } },
          ],
        },
      ],
      systemInstruction: {
        parts: [{ text: 'Be precise.' }],
      },
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 128,
      },
    })
  })

  test('maps structured vision content into Codex Responses input parts', () => {
    const body = buildProviderRequestBody({
      model: 'balanced',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Compare these frames.' },
            { type: 'image_url', image_url: { url: 'https://cdn.example/frame-a.png' } },
          ],
        },
      ],
      response_format: 'text',
    } as any, selection())

    expect(body.input).toEqual([
      {
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_text', text: 'Compare these frames.' },
          { type: 'input_image', image_url: 'https://cdn.example/frame-a.png' },
        ],
      },
    ])
  })

  test('renders config-driven payload templates with upstream default size and prunes empty nested objects', () => {
    const body = buildProviderRequestBody({
      model: 'balanced',
      messages: [{ role: 'user', content: '生成一张图' }],
      response_format: 'text',
    } as any, selection({
      apiFormat: 'openai_compatible',
      provider: {
        ...selection().provider,
        api_format: 'openai_compatible',
      },
      model: {
        ...selection().model,
        model_name: 'image-model',
        capabilities: { text_to_image: true },
      },
      routeType: 'text_to_image',
      routeConfig: {
        payload_template: {
          model: '{{model}}',
          input: {
            prompt: '{{prompt}}',
            ref_img: '{{image_url}}',
          },
          parameters: {
            size: '{{size}}',
            seed: '{{seed}}',
          },
        },
      },
    }))

    expect(body).toEqual({
      model: 'image-model',
      input: {
        prompt: '生成一张图',
      },
      parameters: {
        size: '1024*1024',
      },
    })
  })

  test('converts local image parts inside multimodal messages before Gemini provider calls', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-local-image-parts-'))
    try {
      await mkdir(join(workspace, 'assets'), { recursive: true })
      await writeFile(join(workspace, 'assets', 'frame.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'gemini',
          display_name: 'Google Gemini',
          service_type: 'llm',
          api_format: 'gemini_native',
          auth_type: 'bearer',
          supported_modalities: ['chat', 'vision'],
          is_active: true,
          endpoints: {},
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 88, provider: 'gemini', key: 'gemini-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 88, api_key_id: 88, provider: 'gemini', display_name: 'Gemini Vision', model_name: 'gemini-1.5-pro', capabilities: { chat: true, vision: true }, health_status: 'healthy' },
      ]))

      let capturedBody: any = null
      globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(String(init?.body || '{}'))
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'OK' }] }, finishReason: 'STOP' }],
        }), { status: 200 })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: '分析画面' },
            { type: 'image_url', image_url: { url: '/api/assets/media/assets%2Fframe.png' } },
          ],
        }],
        response_format: 'text',
      } as any, 88, { maxRetries: 0 })

      expect(capturedBody.contents[0].parts).toEqual([
        { text: '分析画面' },
        { inlineData: { mimeType: 'image/png', data: 'iVBORw==' } },
      ])
      expect(result.content).toBe('OK')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('passes dynamic params through OpenAI-compatible chat payloads', () => {
    const body = buildProviderRequestBody({
      model: 'balanced',
      messages: [{ role: 'user', content: 'Write a short scene' }],
      temperature: 0.55,
      max_tokens: 512,
      response_format: 'text',
      top_p: 0.9,
      seed: 20260607,
      stop: ['END'],
    } as any, selection({
      provider: {
        ...selection().provider,
        api_format: 'openai_compatible',
      },
      apiFormat: 'openai_compatible',
    }))

    expect(body).toMatchObject({
      model: 'gpt-5-codex',
      messages: [{ role: 'user', content: 'Write a short scene' }],
      temperature: 0.55,
      max_tokens: 512,
      top_p: 0.9,
      seed: 20260607,
      stop: ['END'],
    })
  })

  test('polls config-driven async task routes before applying result extraction', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-poll-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'async-provider',
          display_name: 'Async Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['text_to_video'],
          default_base_url: 'https://api.example.com/v1',
          is_active: true,
          endpoints: {
            text_to_video: {
              url: '/tasks/create',
              payload_template: {
                model: '{{model}}',
                prompt: '{{prompt}}',
              },
              task_id_extractor: 'output.task_id',
              status_extractor: 'output.task_status',
              poll_url: '/tasks/{{task_id}}',
              poll_interval_ms: 0,
              poll_max_attempts: 3,
              result_extractor: 'output.results.0.video_url',
            },
          },
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 3, provider: 'async-provider', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 9, api_key_id: 3, provider: 'async-provider', display_name: 'Async Video', model_name: 'async-video', capabilities: { text_to_video: true }, health_status: 'healthy' },
      ]))

      const calls: Array<{ url: string; method: string }> = []
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), method: String(init?.method || 'GET') })
        if (String(url).endsWith('/tasks/create')) {
          return new Response(JSON.stringify({ output: { task_id: 'task-9', task_status: 'queued' } }), { status: 200 })
        }
        if (String(url).endsWith('/tasks/task-9')) {
          return new Response(JSON.stringify({
            output: {
              task_status: calls.filter(call => call.url.endsWith('/tasks/task-9')).length > 1 ? 'completed' : 'processing',
              results: calls.filter(call => call.url.endsWith('/tasks/task-9')).length > 1
                ? [{ video_url: 'https://cdn.example/video.mp4' }]
                : [],
            },
          }), { status: 200 })
        }
        throw new Error(`unexpected fetch: ${url}`)
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        type: 'text_to_video',
        messages: [{ role: 'user', content: '生成一段镜头' }],
        response_format: 'text',
      } as any, 9, { maxRetries: 0 })

      expect(calls).toEqual([
        { url: 'https://api.example.com/v1/tasks/create', method: 'POST' },
        { url: 'https://api.example.com/v1/tasks/task-9', method: 'GET' },
        { url: 'https://api.example.com/v1/tasks/task-9', method: 'GET' },
      ])
      expect(result.content).toBe('https://cdn.example/video.mp4')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('polls async task routes with camelCase endpoint DSL fields', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-camel-poll-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'async-camel-provider',
          display_name: 'Async Camel Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['text_to_video'],
          default_base_url: 'https://api.example.com/v1',
          is_active: true,
          endpoints: {
            text_to_video: {
              url: '/camel/tasks/create',
              payloadTemplate: {
                model: '{{model}}',
                prompt: '{{prompt}}',
              },
              taskIdExtractor: 'output.taskId',
              statusExtractor: 'output.taskStatus',
              pollUrl: '/camel/tasks/{{task_id}}',
              pollIntervalMs: 0,
              pollMaxAttempts: 2,
              resultExtractor: 'output.results.0.video_url',
            },
          },
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 3, provider: 'async-camel-provider', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 9, api_key_id: 3, provider: 'async-camel-provider', display_name: 'Async Camel Video', model_name: 'async-camel-video', capabilities: { text_to_video: true }, health_status: 'healthy' },
      ]))

      const calls: Array<{ url: string; method: string }> = []
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), method: String(init?.method || 'GET') })
        if (String(url).endsWith('/camel/tasks/create')) {
          return new Response(JSON.stringify({ output: { taskId: 'runtime-camel-task', taskStatus: 'queued' } }), { status: 200 })
        }
        if (String(url).endsWith('/camel/tasks/runtime-camel-task')) {
          return new Response(JSON.stringify({
            output: {
              taskStatus: 'completed',
              results: [{ video_url: 'https://cdn.example/runtime-camel-video.mp4' }],
            },
          }), { status: 200 })
        }
        throw new Error(`unexpected fetch: ${url}`)
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        type: 'text_to_video',
        messages: [{ role: 'user', content: '生成一段镜头' }],
        response_format: 'text',
      } as any, 9, { maxRetries: 0 })

      expect(calls).toEqual([
        { url: 'https://api.example.com/v1/camel/tasks/create', method: 'POST' },
        { url: 'https://api.example.com/v1/camel/tasks/runtime-camel-task', method: 'GET' },
      ])
      expect(result.content).toBe('https://cdn.example/runtime-camel-video.mp4')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('fails fast for provider async task failure variants', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-poll-failure-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'async-failure-provider',
          display_name: 'Async Failure Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['text_to_video'],
          default_base_url: 'https://api.example.com/v1',
          is_active: true,
          endpoints: {
            text_to_video: {
              url: '/tasks/create',
              payload_template: {
                model: '{{model}}',
                prompt: '{{prompt}}',
              },
              task_id_extractor: 'output.task_id',
              status_extractor: 'output.task_status',
              poll_url: '/tasks/{{task_id}}',
              poll_interval_ms: 0,
              poll_max_attempts: 2,
              result_extractor: 'output.results.0.video_url',
            },
          },
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 3, provider: 'async-failure-provider', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 9, api_key_id: 3, provider: 'async-failure-provider', display_name: 'Async Video', model_name: 'async-video', capabilities: { text_to_video: true }, health_status: 'healthy' },
      ]))

      const calls: Array<{ url: string; method: string }> = []
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), method: String(init?.method || 'GET') })
        if (String(url).endsWith('/tasks/create')) {
          return new Response(JSON.stringify({ output: { task_id: 'task-failed', task_status: 'queued' } }), { status: 200 })
        }
        if (String(url).endsWith('/tasks/task-failed')) {
          return new Response(JSON.stringify({
            output: {
              task_status: 'FAILURE',
              message: 'provider rejected the job',
            },
          }), { status: 200 })
        }
        throw new Error(`unexpected fetch: ${url}`)
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        type: 'text_to_video',
        messages: [{ role: 'user', content: '生成一段镜头' }],
        response_format: 'text',
      } as any, 9, { maxRetries: 0 })

      expect(result.error).toContain('Async task failed')

      expect(calls).toEqual([
        { url: 'https://api.example.com/v1/tasks/create', method: 'POST' },
        { url: 'https://api.example.com/v1/tasks/task-failed', method: 'GET' },
      ])
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('lets endpoint objects override routes by model name for provider-native model families', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-model-route-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'dashscope-provider',
          display_name: 'DashScope Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['text_to_image'],
          default_base_url: 'https://dashscope.example/api/v1',
          is_active: true,
          endpoints: {
            text_to_image: {
              url: '/services/aigc/multimodal-generation/generation',
              payload_template: {
                model: '{{model}}',
                input: { messages: [{ role: 'user', content: [{ text: '{{prompt}}' }] }] },
              },
              result_extractor: 'output.choices.0.message.content.0.image',
              model_routes: [
                {
                  match: 'wanx',
                  url: '/services/aigc/text2image/image-synthesis',
                  headers: { 'X-DashScope-Async': 'enable' },
                  payload_template: {
                    model: '{{model}}',
                    input: { prompt: '{{prompt}}' },
                    parameters: { size: '{{size}}', seed: '{{seed}}' },
                  },
                  task_id_extractor: 'output.task_id',
                  status_extractor: 'output.task_status',
                  poll_url: '/tasks/{{task_id}}',
                  poll_interval_ms: 0,
                  poll_max_attempts: 2,
                  result_extractor: 'output.results.0.url',
                },
              ],
            },
          },
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 4, provider: 'dashscope-provider', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 4, api_key_id: 4, provider: 'dashscope-provider', display_name: 'Wanx Image', model_name: 'wanx-v1', capabilities: { text_to_image: true }, health_status: 'healthy' },
      ]))

      const calls: Array<{ url: string; method: string; headers: Record<string, string>; body?: any }> = []
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(String(init.body)) : undefined
        calls.push({ url: String(url), method: String(init?.method || 'GET'), headers: Object.fromEntries(new Headers(init?.headers || {}).entries()), body })
        if (String(url).endsWith('/image-synthesis')) {
          return new Response(JSON.stringify({ output: { task_id: 'dash-task-1', task_status: 'queued' } }), { status: 200 })
        }
        if (String(url).endsWith('/tasks/dash-task-1')) {
          return new Response(JSON.stringify({ output: { task_status: 'completed', results: [{ url: 'https://cdn.example/wanx.png' }] } }), { status: 200 })
        }
        throw new Error(`unexpected fetch: ${url}`)
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        type: 'text_to_image',
        messages: [{ role: 'user', content: '一座赛博城市' }],
        size: '1024x1024',
        seed: 42,
        response_format: 'text',
      } as any, 4, { maxRetries: 0 })

      expect(calls.map(call => ({ url: call.url, method: call.method }))).toEqual([
        { url: 'https://dashscope.example/api/v1/services/aigc/text2image/image-synthesis', method: 'POST' },
        { url: 'https://dashscope.example/api/v1/tasks/dash-task-1', method: 'GET' },
      ])
      expect(calls[0].headers['x-dashscope-async']).toBe('enable')
      expect(calls[0].body).toEqual({
        model: 'wanx-v1',
        input: { prompt: '一座赛博城市' },
        parameters: { size: '1024*1024', seed: 42 },
      })
      expect(result.content).toBe('https://cdn.example/wanx.png')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('uses API key base_url for config-driven async task polling', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-key-base-poll-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'key-poll-provider',
          display_name: 'Key Poll Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['text_to_video'],
          default_base_url: 'https://provider.example/v1',
          is_active: true,
          endpoints: {
            text_to_video: {
              url: '/tasks/create',
              payload_template: {
                model: '{{model}}',
                prompt: '{{prompt}}',
              },
              task_id_extractor: 'output.task_id',
              status_extractor: 'output.task_status',
              poll_url: '/tasks/{{task_id}}',
              poll_interval_ms: 0,
              poll_max_attempts: 2,
              result_extractor: 'output.results.0.video_url',
            },
          },
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 8, provider: 'key-poll-provider', key: 'secret-key', base_url: 'https://key.example/v1', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 8, api_key_id: 8, provider: 'key-poll-provider', display_name: 'Key Poll Model', model_name: 'key-poll-model', capabilities: { text_to_video: true }, health_status: 'healthy' },
      ]))

      const calls: Array<{ url: string; method: string }> = []
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), method: String(init?.method || 'GET') })
        if (String(url).endsWith('/tasks/create')) {
          return new Response(JSON.stringify({ output: { task_id: 'task-key-base', task_status: 'queued' } }), { status: 200 })
        }
        return new Response(JSON.stringify({
          output: {
            task_status: 'completed',
            results: [{ video_url: 'https://cdn.example/key-base.mp4' }],
          },
        }), { status: 200 })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        type: 'text_to_video',
        messages: [{ role: 'user', content: '生成一段镜头' }],
        response_format: 'text',
      } as any, 8, { maxRetries: 0 })

      expect(calls).toEqual([
        { url: 'https://key.example/v1/tasks/create', method: 'POST' },
        { url: 'https://key.example/v1/tasks/task-key-base', method: 'GET' },
      ])
      expect(result.content).toBe('https://cdn.example/key-base.mp4')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('passes abort signals through config-driven async task polling requests', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-poll-signal-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'abortable-poll-provider',
          display_name: 'Abortable Poll Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['text_to_video'],
          default_base_url: 'https://provider.example/v1',
          is_active: true,
          endpoints: {
            text_to_video: {
              url: '/tasks/create',
              payload_template: {
                model: '{{model}}',
                prompt: '{{prompt}}',
              },
              task_id_extractor: 'output.task_id',
              status_extractor: 'output.task_status',
              poll_url: '/tasks/{{task_id}}',
              poll_interval_ms: 0,
              poll_max_attempts: 1,
              result_extractor: 'output.results.0.video_url',
            },
          },
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 18, provider: 'abortable-poll-provider', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 18, api_key_id: 18, provider: 'abortable-poll-provider', display_name: 'Abortable Poll Model', model_name: 'abortable-poll-model', capabilities: { text_to_video: true }, health_status: 'healthy' },
      ]))

      const pollSignals: Array<AbortSignal | undefined> = []
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        if (String(url).endsWith('/tasks/create')) {
          return new Response(JSON.stringify({ output: { task_id: 'task-abortable', task_status: 'queued' } }), { status: 200 })
        }
        pollSignals.push(init?.signal || undefined)
        return new Response(JSON.stringify({
          output: {
            task_status: 'completed',
            results: [{ video_url: 'https://cdn.example/abortable.mp4' }],
          },
        }), { status: 200 })
      }) as typeof fetch

      const controller = new AbortController()
      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        type: 'text_to_video',
        messages: [{ role: 'user', content: '生成一段可中断镜头' }],
        response_format: 'text',
      } as any, 18, { maxRetries: 0, signal: controller.signal })

      expect(result.content).toBe('https://cdn.example/abortable.mp4')
      expect(pollSignals).toHaveLength(1)
      expect(pollSignals[0]).toBe(controller.signal)
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('aborts retry backoff before issuing another provider request', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-retry-abort-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'retry-abort-provider',
          display_name: 'Retry Abort Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          response_mode: 'json',
          supported_modalities: ['chat'],
          default_base_url: 'https://retry-abort.example/v1',
          is_active: true,
          endpoints: {},
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 19, provider: 'retry-abort-provider', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 19, api_key_id: 19, provider: 'retry-abort-provider', display_name: 'Retry Abort Model', model_name: 'retry-abort-model', capabilities: { chat: true }, health_status: 'healthy' },
      ]))

      const controller = new AbortController()
      let calls = 0
      globalThis.fetch = (async () => {
        calls += 1
        if (calls === 1) {
          setTimeout(() => controller.abort(), 50)
          return new Response(JSON.stringify({ error: 'temporary overload' }), { status: 500 })
        }
        return new Response(JSON.stringify({ choices: [{ message: { content: 'second request should not run' } }] }), { status: 200 })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        messages: [{ role: 'user', content: 'hello' }],
        response_format: 'text',
      } as any, 19, { maxRetries: 1, signal: controller.signal })

      expect(calls).toBe(1)
      expect(result.finish_reason).toBe('error')
      expect(result.error).toContain('Request canceled')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('polls config-driven async tasks using fallback task id fields when no extractor is configured', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-fallback-poll-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'fallback-poll-provider',
          display_name: 'Fallback Poll Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['text_to_video'],
          default_base_url: 'https://provider.example/v1',
          is_active: true,
          endpoints: {
            text_to_video: {
              url: '/tasks/create',
              payload_template: {
                model: '{{model}}',
                prompt: '{{prompt}}',
              },
              poll_url: '/tasks/{{task_id}}',
              poll_interval_ms: 0,
              poll_max_attempts: 2,
              result_extractor: 'output.results.0.video_url',
            },
          },
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 19, provider: 'fallback-poll-provider', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 19, api_key_id: 19, provider: 'fallback-poll-provider', display_name: 'Fallback Poll Model', model_name: 'fallback-poll-model', capabilities: { text_to_video: true }, health_status: 'healthy' },
      ]))

      const calls: Array<{ url: string; method: string }> = []
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), method: String(init?.method || 'GET') })
        if (String(url).endsWith('/tasks/create')) {
          return new Response(JSON.stringify({ task_id: 'runtime-fallback-task', status: 'queued' }), { status: 200 })
        }
        return new Response(JSON.stringify({
          status: 'completed',
          output: {
            results: [{ video_url: 'https://cdn.example/runtime-fallback.mp4' }],
          },
        }), { status: 200 })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        type: 'text_to_video',
        messages: [{ role: 'user', content: '生成一段可轮询镜头' }],
        response_format: 'text',
      } as any, 19, { maxRetries: 0 })

      expect(calls).toEqual([
        { url: 'https://provider.example/v1/tasks/create', method: 'POST' },
        { url: 'https://provider.example/v1/tasks/runtime-fallback-task', method: 'GET' },
      ])
      expect(result.content).toBe('https://cdn.example/runtime-fallback.mp4')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('polls async task routes through nested data/result/output envelopes', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-envelope-poll-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'envelope-poll-provider',
          display_name: 'Envelope Poll Provider',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['text_to_video'],
          default_base_url: 'https://provider.example/v1',
          is_active: true,
          endpoints: {
            text_to_video: {
              url: '/tasks/create',
              payload_template: {
                model: '{{model}}',
                prompt: '{{prompt}}',
              },
              poll_url: '/tasks/{{task_id}}',
              poll_interval_ms: 0,
              poll_max_attempts: 2,
              result_extractor: 'output.results.0.video_url',
            },
          },
          custom_headers: {},
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 20, provider: 'envelope-poll-provider', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        { id: 20, api_key_id: 20, provider: 'envelope-poll-provider', display_name: 'Envelope Poll Model', model_name: 'envelope-video-model', capabilities: { text_to_video: true }, health_status: 'healthy' },
      ]))

      const calls: Array<{ url: string; method: string }> = []
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), method: String(init?.method || 'GET') })
        if (String(url).endsWith('/tasks/create')) {
          return new Response(JSON.stringify({
            data: {
              result: {
                output: {
                  taskId: 'wrapped-runtime-task',
                  taskStatus: 'queued',
                },
              },
            },
          }), { status: 200 })
        }
        return new Response(JSON.stringify({
          data: {
            result: {
              output: {
                taskStatus: 'SUCCESS',
                results: [{ video_url: 'https://cdn.example/runtime-envelope.mp4' }],
              },
            },
          },
        }), { status: 200 })
      }) as typeof fetch

      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        type: 'text_to_video',
        messages: [{ role: 'user', content: '生成一段网关包装的镜头' }],
        response_format: 'text',
      } as any, 20, { maxRetries: 0 })

      expect(calls).toEqual([
        { url: 'https://provider.example/v1/tasks/create', method: 'POST' },
        { url: 'https://provider.example/v1/tasks/wrapped-runtime-task', method: 'GET' },
      ])
      expect(result.content).toBe('https://cdn.example/runtime-envelope.mp4')
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('builds Codex CLI-style Responses body instead of generic Responses body', () => {
    const body = buildProviderRequestBody({
      model: 'balanced',
      messages: [
        { role: 'system', content: 'You are a coding agent.' },
        { role: 'user', content: 'Inspect the repo.' },
        { role: 'assistant', content: 'I will inspect it.' },
      ],
      max_tokens: 1234,
      temperature: 0.2,
      response_format: { type: 'json_schema', schema: { type: 'object' } },
    }, selection())

    expect(body).toMatchObject({
      model: 'gpt-5-codex',
      instructions: 'You are a coding agent.',
      input: [
        { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Inspect the repo.' }] },
        { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'I will inspect it.' }] },
      ],
      tools: [],
      tool_choice: 'auto',
      parallel_tool_calls: false,
      store: false,
      stream: false,
      include: ['reasoning.encrypted_content'],
      text: { format: { type: 'json_schema', name: 'response', schema: { type: 'object' } } },
    })
    expect(body).not.toHaveProperty('reasoning')
    expect(body).not.toHaveProperty('messages')
    expect(body).not.toHaveProperty('max_tokens')
    expect(body).not.toHaveProperty('max_output_tokens')
    expect(body).not.toHaveProperty('temperature')
  })

  test('builds official Responses schema fields when explicitly requested', () => {
    const body = buildProviderRequestBody({
      model: 'balanced',
      messages: [
        { role: 'system', content: 'You are a coding agent.' },
        {
          role: 'user',
          content: [
            { type: 'input_text', text: 'Inspect this file and image.' },
            { type: 'input_image', image_url: 'data:image/png;base64,abc', detail: 'high' },
            { type: 'input_file', file_url: 'https://example.com/spec.pdf', filename: 'spec.pdf' },
          ],
        },
        { role: 'assistant', content: 'I found the relevant section.', phase: 'final_answer' } as any,
        { role: 'tool', tool_call_id: 'call_1', content: '{"ok":true}' },
      ],
      tools: [{
        name: 'lookup_spec',
        description: 'Look up a spec section',
        parameters: { type: 'object', properties: { section: { type: 'string' } }, required: ['section'] },
        strict: true,
      } as any],
      tool_choice: 'auto',
      response_format: {
        type: 'json_schema',
        name: 'inspection_result',
        schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false },
        strict: true,
      } as any,
      previous_response_id: 'resp_previous',
      max_output_tokens: 2048,
      truncation: 'auto',
    } as any, selection())

    expect(body).toMatchObject({
      model: 'gpt-5-codex',
      instructions: 'You are a coding agent.',
      input: [
        {
          type: 'message',
          role: 'user',
          content: [
            { type: 'input_text', text: 'Inspect this file and image.' },
            { type: 'input_image', image_url: 'data:image/png;base64,abc', detail: 'high' },
            { type: 'input_file', file_url: 'https://example.com/spec.pdf', filename: 'spec.pdf' },
          ],
        },
        {
          type: 'message',
          role: 'assistant',
          phase: 'final_answer',
          content: [{ type: 'output_text', text: 'I found the relevant section.' }],
        },
        { type: 'function_call_output', call_id: 'call_1', output: '{"ok":true}' },
      ],
      tools: [{
        type: 'function',
        name: 'lookup_spec',
        description: 'Look up a spec section',
        parameters: { type: 'object', properties: { section: { type: 'string' } }, required: ['section'] },
        strict: true,
      }],
      text: {
        format: {
          type: 'json_schema',
          name: 'inspection_result',
          schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false },
          strict: true,
        },
      },
      previous_response_id: 'resp_previous',
      max_output_tokens: 2048,
      truncation: 'auto',
      parallel_tool_calls: true,
    })
    expect(body).not.toHaveProperty('messages')
    expect(body).not.toHaveProperty('max_tokens')
    expect(body).not.toHaveProperty('temperature')
  })

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

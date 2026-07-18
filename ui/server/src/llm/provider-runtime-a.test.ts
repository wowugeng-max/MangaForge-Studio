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

describe('codex responses provider runtime a', () => {
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
})

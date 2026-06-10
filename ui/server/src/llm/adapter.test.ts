import { afterEach, describe, expect, test } from 'bun:test'
import { ConfiguredProviderAdapter, classifyLLMError } from './adapter'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('LLM adapter error classification', () => {
  test('classifies connection refused as a network error', () => {
    expect(classifyLLMError(new Error('ConnectionRefused'))).toBe('network')
  })
})

describe('ConfiguredProviderAdapter Codex Responses requests', () => {
  test('does not force json_object text format for plain text probes', async () => {
    let capturedBody: any = null
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body || '{}'))
      return new Response(JSON.stringify({ output_text: 'OK', status: 'completed' }), { status: 200 })
    }) as typeof fetch

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
        custom_headers: {},
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
      parallel_tool_calls: false,
      reasoning: null,
      store: false,
      stream: false,
      include: ['reasoning.encrypted_content'],
    })
    expect(capturedBody).not.toHaveProperty('messages')
    expect(capturedBody).not.toHaveProperty('max_tokens')
    expect(capturedBody).not.toHaveProperty('max_output_tokens')
    expect(capturedBody).not.toHaveProperty('temperature')
    expect(capturedBody).not.toHaveProperty('text')
  })

  test('keeps AnyRouter bare GPT model ids and includes encrypted reasoning in probes', async () => {
    let capturedBody: any = null
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body || '{}'))
      return new Response(JSON.stringify({ output_text: 'OK', status: 'completed' }), { status: 200 })
    }) as typeof fetch

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

    expect(capturedBody.model).toBe('gpt-5.5')
    expect(capturedBody.include).toEqual(['reasoning.encrypted_content'])
  })
})

describe('ConfiguredProviderAdapter config-driven routes', () => {
  test('uses Gemini native generateContent defaults without requiring a provider base URL', async () => {
    let capturedUrl = ''
    let capturedHeaders: Record<string, string> = {}
    let capturedBody: any = null
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedHeaders = Object.fromEntries(new Headers(init?.headers || {}).entries())
      capturedBody = JSON.parse(String(init?.body || '{}'))
      return new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [
              { text: 'OK from Gemini' },
            ],
          },
          finishReason: 'STOP',
        }],
        usageMetadata: {
          promptTokenCount: 4,
          candidatesTokenCount: 3,
          totalTokenCount: 7,
        },
      }), { status: 200 })
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'gemini',
        display_name: 'Google Gemini',
        service_type: 'llm',
        api_format: 'gemini_native',
        auth_type: 'bearer',
        response_mode: 'auto',
        supported_modalities: ['chat', 'vision'],
        is_active: true,
        endpoints: {},
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'gemini',
        key: 'gemini-key',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'gemini',
        display_name: 'Gemini 1.5 Pro',
        model_name: 'gemini-1.5-pro',
        capabilities: { chat: true, vision: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: false,
        context_ui_params: {},
      },
    )

    const result = await adapter.execute({
      model: 'balanced',
      messages: [
        { role: 'system', content: 'Be concise.' },
        { role: 'user', content: 'Return exactly OK.' },
      ],
      temperature: 0.2,
      max_tokens: 32,
      response_format: 'text',
    })

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
        temperature: 0.2,
        maxOutputTokens: 32,
      },
    })
    expect(result.content).toBe('OK from Gemini')
    expect(result.usage).toEqual({ input_tokens: 4, output_tokens: 3, total_tokens: 7 })
    expect(result.finish_reason).toBe('STOP')
  })

  test('uses model api_format override for Gemini native endpoint and auth', async () => {
    let capturedUrl = ''
    let capturedHeaders: Record<string, string> = {}
    let capturedBody: any = null
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedHeaders = Object.fromEntries(new Headers(init?.headers || {}).entries())
      capturedBody = JSON.parse(String(init?.body || '{}'))
      return new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [
              { text: 'Gemini model override OK' },
            ],
          },
          finishReason: 'STOP',
        }],
      }), { status: 200 })
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
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
      {
        id: 1,
        provider: 'mixed-gateway',
        key: 'gemini-key',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'mixed-gateway',
        api_format: 'gemini_native',
        display_name: 'Gemini Override',
        model_name: 'gemini-1.5-pro',
        capabilities: { chat: true, vision: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: false,
        context_ui_params: {},
      },
    )

    const result = await adapter.execute({
      model: 'balanced',
      messages: [{ role: 'user', content: 'Return exactly OK.' }],
      temperature: 0.2,
      max_tokens: 32,
      response_format: 'text',
    })

    expect(capturedUrl).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent')
    expect(capturedHeaders['x-goog-api-key']).toBe('gemini-key')
    expect(capturedHeaders.authorization).toBeUndefined()
    expect(capturedBody.contents).toEqual([
      { role: 'user', parts: [{ text: 'Return exactly OK.' }] },
    ])
    expect(result.content).toBe('Gemini model override OK')
  })

  test('supports endpoint object payload templates, route headers, and result extractors', async () => {
    let capturedUrl = ''
    let capturedHeaders: Record<string, string> = {}
    let capturedBody: any = null
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedHeaders = Object.fromEntries(new Headers(init?.headers || {}).entries())
      capturedBody = JSON.parse(String(init?.body || '{}'))
      return new Response(JSON.stringify({ output: { answer: '模板响应' } }), { status: 200 })
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'template-provider',
        display_name: 'Template Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'x-api-key',
        response_mode: 'auto',
        supported_modalities: ['chat'],
        default_base_url: 'https://api.example.com/v1',
        is_active: true,
        endpoints: {
          chat: {
            url: '/tasks/create',
            headers: { 'X-Route-Mode': 'chat-template' },
            payload_template: {
              modelName: '{{model}}',
              input: '{{prompt}}',
              size: '{{size}}',
              extra: {
                temperature: '{{temperature}}',
              },
            },
            result_extractor: 'output.answer',
          },
        } as any,
        custom_headers: { 'X-Global': 'yes' },
      },
      {
        id: 1,
        provider: 'template-provider',
        key: 'secret-key',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'template-provider',
        display_name: 'Template Model',
        model_name: 'template-model',
        capabilities: { chat: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    const result = await adapter.execute({
      model: 'balanced',
      messages: [{ role: 'user', content: '请生成一段内容' }],
      temperature: 0.6,
      max_tokens: 128,
      response_format: 'text',
      size: '1024x768',
    } as any)

    expect(capturedUrl).toBe('https://api.example.com/v1/tasks/create')
    expect(capturedHeaders['x-api-key']).toBe('secret-key')
    expect(capturedHeaders['x-global']).toBe('yes')
    expect(capturedHeaders['x-route-mode']).toBe('chat-template')
    expect(capturedBody).toEqual({
      modelName: 'template-model',
      input: '请生成一段内容',
      size: '1024*768',
      extra: {
        temperature: 0.6,
      },
    })
    expect(result.content).toBe('模板响应')
  })

  test('accepts camelCase endpoint DSL fields from TS clients', async () => {
    let capturedUrl = ''
    let capturedBody: any = null
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedBody = JSON.parse(String(init?.body || '{}'))
      return new Response(JSON.stringify({ output: { answer: 'camel route ok' } }), { status: 200 })
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'camel-template-provider',
        display_name: 'Camel Template Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        response_mode: 'auto',
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
        } as any,
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'camel-template-provider',
        key: 'secret-key',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'camel-template-provider',
        display_name: 'Camel Template Model',
        model_name: 'camel-template-model',
        capabilities: { chat: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    const result = await adapter.execute({
      model: 'balanced',
      messages: [{ role: 'user', content: 'camel payload' }],
      temperature: 0.2,
      max_tokens: 64,
      response_format: 'text',
    })

    expect(capturedUrl).toBe('https://api.example.com/v1/camel/create')
    expect(capturedBody).toEqual({
      modelName: 'camel-template-model',
      input: 'camel payload',
    })
    expect(result.content).toBe('camel route ok')
  })

  test('renders endpoint payload templates with upstream default size and prunes empty nested objects', async () => {
    let capturedBody: any = null
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body || '{}'))
      return new Response(JSON.stringify({ output: { answer: '模板响应' } }), { status: 200 })
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'template-provider',
        display_name: 'Template Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        response_mode: 'auto',
        supported_modalities: ['text_to_image'],
        default_base_url: 'https://api.example.com/v1',
        is_active: true,
        endpoints: {
          text_to_image: {
            url: '/image/create',
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
            result_extractor: 'output.answer',
          },
        } as any,
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'template-provider',
        key: 'secret-key',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'template-provider',
        display_name: 'Template Model',
        model_name: 'template-image-model',
        capabilities: { text_to_image: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    await adapter.execute({
      model: 'balanced',
      type: 'text_to_image',
      messages: [{ role: 'user', content: '生成一张图' }],
      response_format: 'text',
    } as any)

    expect(capturedBody).toEqual({
      model: 'template-image-model',
      input: {
        prompt: '生成一张图',
      },
      parameters: {
        size: '1024*1024',
      },
    })
  })

  test('uses only text content as media prompt when multimodal messages include image URLs', async () => {
    let capturedBody: any = null
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body || '{}'))
      return new Response(JSON.stringify({
        data: [{ url: 'https://cdn.example/output.png' }],
      }), { status: 200 })
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'media-provider',
        display_name: 'Media Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        response_mode: 'auto',
        supported_modalities: ['image_to_image'],
        default_base_url: 'https://api.example.com/v1',
        is_active: true,
        endpoints: {},
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'media-provider',
        key: 'secret-key',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'media-provider',
        display_name: 'Image Edit',
        model_name: 'image-edit-model',
        capabilities: { image_to_image: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    await adapter.execute({
      model: 'balanced',
      type: 'image_to_image',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'turn this into watercolor' },
          { type: 'image_url', image_url: { url: 'https://cdn.example/input.png' } },
        ],
      }],
      image_url: 'https://cdn.example/input.png',
      response_format: 'text',
    } as any)

    expect(capturedBody).toMatchObject({
      model: 'image-edit-model',
      prompt: 'turn this into watercolor',
      image_url: 'https://cdn.example/input.png',
    })
    expect(capturedBody.prompt).not.toContain('https://cdn.example/input.png')
  })

  test('uses API key base_url before provider default_base_url for configured routes', async () => {
    let capturedUrl = ''
    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = String(url)
      return new Response(JSON.stringify({ output: { answer: '走 key 地址' } }), { status: 200 })
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'key-routed-provider',
        display_name: 'Key Routed Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        response_mode: 'auto',
        supported_modalities: ['chat'],
        default_base_url: 'https://provider.example/v1',
        is_active: true,
        endpoints: {
          chat: {
            url: '/tasks/create',
            payload_template: {
              model: '{{model}}',
              prompt: '{{prompt}}',
            },
            result_extractor: 'output.answer',
          },
        } as any,
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'key-routed-provider',
        key: 'secret-key',
        base_url: 'https://key.example/v1',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'key-routed-provider',
        display_name: 'Key Routed Model',
        model_name: 'key-routed-model',
        capabilities: { chat: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    const result = await adapter.execute({
      model: 'balanced',
      messages: [{ role: 'user', content: '请生成一段内容' }],
      response_format: 'text',
    } as any)

    expect(capturedUrl).toBe('https://key.example/v1/tasks/create')
    expect(result.content).toBe('走 key 地址')
  })

  test('passes dynamic params through default OpenAI-compatible chat payloads', async () => {
    let capturedBody: any = null
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body || '{}'))
      return new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 })
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'dynamic-chat-provider',
        display_name: 'Dynamic Chat Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        response_mode: 'auto',
        supported_modalities: ['chat'],
        default_base_url: 'https://api.example.com/v1',
        is_active: true,
        endpoints: {},
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'dynamic-chat-provider',
        key: 'secret-key',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'dynamic-chat-provider',
        display_name: 'Chat Model',
        model_name: 'chat-model',
        capabilities: { chat: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    await adapter.execute({
      model: 'chat-model',
      messages: [{ role: 'user', content: '写一段内容' }],
      temperature: 0.45,
      max_tokens: 512,
      response_format: 'text',
      top_p: 0.85,
      seed: 1234,
      stop: ['END'],
    } as any)

    expect(capturedBody).toMatchObject({
      model: 'chat-model',
      messages: [{ role: 'user', content: '写一段内容' }],
      temperature: 0.45,
      max_tokens: 512,
      top_p: 0.85,
      seed: 1234,
      stop: ['END'],
    })
  })

  test('selects modality-specific endpoint objects for image and video probes', async () => {
    let capturedUrl = ''
    let capturedBody: any = null
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedBody = JSON.parse(String(init?.body || '{}'))
      return new Response(JSON.stringify({ output: { image_url: 'https://cdn.example/render.png' } }), { status: 200 })
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'modal-provider',
        display_name: 'Modal Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        response_mode: 'auto',
        supported_modalities: ['chat', 'text_to_image'],
        default_base_url: 'https://api.example.com/v1',
        is_active: true,
        endpoints: {
          chat: '/chat/completions',
          text_to_image: {
            url: '/images/generations',
            payload_template: {
              model: '{{model}}',
              prompt: '{{prompt}}',
            },
            result_extractor: 'output.image_url',
          },
        } as any,
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'modal-provider',
        key: 'secret-key',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'modal-provider',
        display_name: 'Image Model',
        model_name: 'image-model',
        capabilities: { text_to_image: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    const result = await adapter.execute({
      model: 'image-model',
      type: 'text_to_image',
      messages: [{ role: 'user', content: 'A white circle' }],
      response_format: 'text',
    })

    expect(capturedUrl).toBe('https://api.example.com/v1/images/generations')
    expect(capturedBody).toEqual({
      model: 'image-model',
      prompt: 'A white circle',
    })
    expect(result.content).toBe('https://cdn.example/render.png')
  })

  test('routes default text_to_image configured requests to image generations payloads', async () => {
    let capturedUrl = ''
    let capturedBody: any = null
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedBody = JSON.parse(String(init?.body || '{}'))
      return new Response(JSON.stringify({ data: [{ url: 'https://cdn.example/default-image.png' }] }), { status: 200 })
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'default-image-provider',
        display_name: 'Default Image Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        response_mode: 'auto',
        supported_modalities: ['text_to_image'],
        default_base_url: 'https://api.example.com/v1',
        is_active: true,
        endpoints: {},
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'default-image-provider',
        key: 'secret-key',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'default-image-provider',
        display_name: 'Image Model',
        model_name: 'image-model',
        capabilities: { text_to_image: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    const result = await adapter.execute({
      model: 'image-model',
      type: 'text_to_image',
      messages: [{ role: 'user', content: 'A white circle' }],
      size: '1024x1024',
      response_format: 'text',
    } as any)

    expect(capturedUrl).toBe('https://api.example.com/v1/images/generations')
    expect(capturedBody).toEqual({
      model: 'image-model',
      prompt: 'A white circle',
      size: '1024x1024',
    })
    expect(result.content).toBe('https://cdn.example/default-image.png')
  })

  test('extracts media URLs from markdown content returned by compatible image routes', async () => {
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({
        choices: [{ message: { content: '渲染完成：![preview](https://cdn.example/markdown-image.webp)' } }],
      }), { status: 200 })
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'markdown-image-provider',
        display_name: 'Markdown Image Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        response_mode: 'auto',
        supported_modalities: ['text_to_image'],
        default_base_url: 'https://api.example.com/v1',
        is_active: true,
        endpoints: {},
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'markdown-image-provider',
        key: 'secret-key',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'markdown-image-provider',
        display_name: 'Markdown Image Model',
        model_name: 'markdown-image-model',
        capabilities: { text_to_image: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    const result = await adapter.execute({
      model: 'markdown-image-model',
      type: 'text_to_image',
      messages: [{ role: 'user', content: 'A white circle' }],
      response_format: 'text',
    } as any)

    expect(result.content).toBe('https://cdn.example/markdown-image.webp')
  })

  test('polls config-driven async task routes before extracting probe results', async () => {
    const calls: Array<{ url: string; method: string }> = []
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), method: String(init?.method || 'GET') })
      if (String(url).endsWith('/tasks/create')) {
        return new Response(JSON.stringify({ output: { task_id: 'adapter-task-1', task_status: 'queued' } }), { status: 200 })
      }
      if (String(url).endsWith('/tasks/adapter-task-1')) {
        return new Response(JSON.stringify({
          output: {
            task_status: calls.filter(call => call.url.endsWith('/tasks/adapter-task-1')).length > 1 ? 'completed' : 'processing',
            results: calls.filter(call => call.url.endsWith('/tasks/adapter-task-1')).length > 1
              ? [{ video_url: 'https://cdn.example/adapter-video.mp4' }]
              : [],
          },
        }), { status: 200 })
      }
      throw new Error(`unexpected fetch: ${url}`)
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'async-adapter-provider',
        display_name: 'Async Adapter Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        response_mode: 'auto',
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
        } as any,
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'async-adapter-provider',
        key: 'secret-key',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'async-adapter-provider',
        display_name: 'Video Model',
        model_name: 'video-model',
        capabilities: { text_to_video: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    const result = await adapter.execute({
      model: 'video-model',
      type: 'text_to_video',
      messages: [{ role: 'user', content: 'A slow pan shot' }],
      response_format: 'text',
    })

    expect(calls).toEqual([
      { url: 'https://api.example.com/v1/tasks/create', method: 'POST' },
      { url: 'https://api.example.com/v1/tasks/adapter-task-1', method: 'GET' },
      { url: 'https://api.example.com/v1/tasks/adapter-task-1', method: 'GET' },
    ])
    expect(result.content).toBe('https://cdn.example/adapter-video.mp4')
  })

  test('polls async task routes with camelCase endpoint DSL fields', async () => {
    const calls: Array<{ url: string; method: string }> = []
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), method: String(init?.method || 'GET') })
      if (String(url).endsWith('/camel/tasks/create')) {
        return new Response(JSON.stringify({ output: { taskId: 'adapter-camel-task', taskStatus: 'queued' } }), { status: 200 })
      }
      if (String(url).endsWith('/camel/tasks/adapter-camel-task')) {
        return new Response(JSON.stringify({
          output: {
            taskStatus: 'completed',
            results: [{ video_url: 'https://cdn.example/adapter-camel-video.mp4' }],
          },
        }), { status: 200 })
      }
      throw new Error(`unexpected fetch: ${url}`)
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'async-adapter-camel-provider',
        display_name: 'Async Adapter Camel Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        response_mode: 'auto',
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
        } as any,
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'async-adapter-camel-provider',
        key: 'secret-key',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'async-adapter-camel-provider',
        display_name: 'Video Model',
        model_name: 'video-model',
        capabilities: { text_to_video: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    const result = await adapter.execute({
      model: 'video-model',
      type: 'text_to_video',
      messages: [{ role: 'user', content: 'A slow pan shot' }],
      response_format: 'text',
    })

    expect(calls).toEqual([
      { url: 'https://api.example.com/v1/camel/tasks/create', method: 'POST' },
      { url: 'https://api.example.com/v1/camel/tasks/adapter-camel-task', method: 'GET' },
    ])
    expect(result.content).toBe('https://cdn.example/adapter-camel-video.mp4')
  })

  test('fails fast for provider async task failure variants during probe execution', async () => {
    const calls: Array<{ url: string; method: string }> = []
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), method: String(init?.method || 'GET') })
      if (String(url).endsWith('/tasks/create')) {
        return new Response(JSON.stringify({ output: { task_id: 'adapter-task-failed', task_status: 'queued' } }), { status: 200 })
      }
      if (String(url).endsWith('/tasks/adapter-task-failed')) {
        return new Response(JSON.stringify({
          output: {
            task_status: 'TIMEOUT',
            message: 'provider task expired',
          },
        }), { status: 200 })
      }
      throw new Error(`unexpected fetch: ${url}`)
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'async-adapter-failure-provider',
        display_name: 'Async Adapter Failure Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        response_mode: 'auto',
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
        } as any,
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'async-adapter-failure-provider',
        key: 'secret-key',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'async-adapter-failure-provider',
        display_name: 'Video Model',
        model_name: 'video-model',
        capabilities: { text_to_video: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    await expect(adapter.execute({
      model: 'video-model',
      type: 'text_to_video',
      messages: [{ role: 'user', content: 'A slow pan shot' }],
      response_format: 'text',
    })).rejects.toThrow('LLM async task failed')

    expect(calls).toEqual([
      { url: 'https://api.example.com/v1/tasks/create', method: 'POST' },
      { url: 'https://api.example.com/v1/tasks/adapter-task-failed', method: 'GET' },
    ])
  })

  test('polls async task routes using fallback task id fields when no extractor is configured', async () => {
    const calls: Array<{ url: string; method: string }> = []
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), method: String(init?.method || 'GET') })
      if (String(url).endsWith('/tasks/create')) {
        return new Response(JSON.stringify({ task_id: 'fallback-task-1', status: 'queued' }), { status: 200 })
      }
      if (String(url).endsWith('/tasks/fallback-task-1')) {
        return new Response(JSON.stringify({
          status: 'completed',
          output: { results: [{ video_url: 'https://cdn.example/fallback-task.mp4' }] },
        }), { status: 200 })
      }
      throw new Error(`unexpected fetch: ${url}`)
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'fallback-async-adapter-provider',
        display_name: 'Fallback Async Adapter Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        response_mode: 'auto',
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
            poll_url: '/tasks/{{task_id}}',
            poll_interval_ms: 0,
            poll_max_attempts: 2,
            result_extractor: 'output.results.0.video_url',
          },
        } as any,
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'fallback-async-adapter-provider',
        key: 'secret-key',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'fallback-async-adapter-provider',
        display_name: 'Video Model',
        model_name: 'video-model',
        capabilities: { text_to_video: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    const result = await adapter.execute({
      model: 'video-model',
      type: 'text_to_video',
      messages: [{ role: 'user', content: 'A slow pan shot' }],
      response_format: 'text',
    })

    expect(calls).toEqual([
      { url: 'https://api.example.com/v1/tasks/create', method: 'POST' },
      { url: 'https://api.example.com/v1/tasks/fallback-task-1', method: 'GET' },
    ])
    expect(result.content).toBe('https://cdn.example/fallback-task.mp4')
  })

  test('polls async task routes through nested data/result/output envelopes', async () => {
    const calls: Array<{ url: string; method: string }> = []
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), method: String(init?.method || 'GET') })
      if (String(url).endsWith('/tasks/create')) {
        return new Response(JSON.stringify({
          data: {
            result: {
              output: {
                taskId: 'adapter-envelope-task',
                taskStatus: 'queued',
              },
            },
          },
        }), { status: 200 })
      }
      if (String(url).endsWith('/tasks/adapter-envelope-task')) {
        return new Response(JSON.stringify({
          data: {
            result: {
              output: {
                taskStatus: 'SUCCESS',
                results: [{ video_url: 'https://cdn.example/adapter-envelope.mp4' }],
              },
            },
          },
        }), { status: 200 })
      }
      throw new Error(`unexpected fetch: ${url}`)
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'envelope-async-adapter-provider',
        display_name: 'Envelope Async Adapter Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        response_mode: 'auto',
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
            poll_url: '/tasks/{{task_id}}',
            poll_interval_ms: 0,
            poll_max_attempts: 2,
            result_extractor: 'output.results.0.video_url',
          },
        } as any,
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'envelope-async-adapter-provider',
        key: 'secret-key',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'envelope-async-adapter-provider',
        display_name: 'Video Model',
        model_name: 'video-model',
        capabilities: { text_to_video: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    const result = await adapter.execute({
      model: 'video-model',
      type: 'text_to_video',
      messages: [{ role: 'user', content: 'A wrapped provider task' }],
      response_format: 'text',
    })

    expect(calls).toEqual([
      { url: 'https://api.example.com/v1/tasks/create', method: 'POST' },
      { url: 'https://api.example.com/v1/tasks/adapter-envelope-task', method: 'GET' },
    ])
    expect(result.content).toBe('https://cdn.example/adapter-envelope.mp4')
  })

  test('uses model-specific route overrides for configured provider probes', async () => {
    const calls: Array<{ url: string; method: string; headers: Record<string, string>; body?: any }> = []
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ url: String(url), method: String(init?.method || 'GET'), headers: Object.fromEntries(new Headers(init?.headers || {}).entries()), body })
      if (String(url).endsWith('/image-synthesis')) {
        return new Response(JSON.stringify({ output: { task_id: 'adapter-wanx', task_status: 'queued' } }), { status: 200 })
      }
      if (String(url).endsWith('/tasks/adapter-wanx')) {
        return new Response(JSON.stringify({ output: { task_status: 'completed', results: [{ url: 'https://cdn.example/adapter-wanx.png' }] } }), { status: 200 })
      }
      throw new Error(`unexpected fetch: ${url}`)
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'dashscope-adapter-provider',
        display_name: 'DashScope Adapter Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        response_mode: 'auto',
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
                  parameters: { size: '{{size}}' },
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
        } as any,
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'dashscope-adapter-provider',
        key: 'secret-key',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'dashscope-adapter-provider',
        display_name: 'Wanx Model',
        model_name: 'wanx-v1',
        capabilities: { text_to_image: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    const result = await adapter.execute({
      model: 'wanx-v1',
      type: 'text_to_image',
      messages: [{ role: 'user', content: '一座赛博城市' }],
      size: '1024x1024',
      response_format: 'text',
    } as any)

    expect(calls.map(call => ({ url: call.url, method: call.method }))).toEqual([
      { url: 'https://dashscope.example/api/v1/services/aigc/text2image/image-synthesis', method: 'POST' },
      { url: 'https://dashscope.example/api/v1/tasks/adapter-wanx', method: 'GET' },
    ])
    expect(calls[0].headers['x-dashscope-async']).toBe('enable')
    expect(calls[0].body).toEqual({
      model: 'wanx-v1',
      input: { prompt: '一座赛博城市' },
      parameters: { size: '1024*1024' },
    })
    expect(result.content).toBe('https://cdn.example/adapter-wanx.png')
  })

  test('uses API key base_url for configured async task polling', async () => {
    const calls: Array<{ url: string; method: string }> = []
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), method: String(init?.method || 'GET') })
      if (String(url).endsWith('/tasks/create')) {
        return new Response(JSON.stringify({ output: { task_id: 'adapter-key-task', task_status: 'queued' } }), { status: 200 })
      }
      return new Response(JSON.stringify({
        output: {
          task_status: 'completed',
          results: [{ video_url: 'https://cdn.example/key-adapter.mp4' }],
        },
      }), { status: 200 })
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'key-async-adapter-provider',
        display_name: 'Key Async Adapter Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        response_mode: 'auto',
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
        } as any,
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'key-async-adapter-provider',
        key: 'secret-key',
        base_url: 'https://key.example/v1',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'key-async-adapter-provider',
        display_name: 'Video Model',
        model_name: 'video-model',
        capabilities: { text_to_video: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    const result = await adapter.execute({
      model: 'video-model',
      type: 'text_to_video',
      messages: [{ role: 'user', content: 'A slow pan shot' }],
      response_format: 'text',
    })

    expect(calls).toEqual([
      { url: 'https://key.example/v1/tasks/create', method: 'POST' },
      { url: 'https://key.example/v1/tasks/adapter-key-task', method: 'GET' },
    ])
    expect(result.content).toBe('https://cdn.example/key-adapter.mp4')
  })
})

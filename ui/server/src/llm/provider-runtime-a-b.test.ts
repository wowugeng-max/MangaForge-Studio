import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  buildProviderRequestBody,
  endpointForProvider,
  executeWithRuntimeModel,
  parseProviderResponsePayload,
  preflightRuntimeRequestTransport,
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

describe('codex responses provider runtime a b', () => {
  test('preflights unsupported multi-reference requests without provider execution', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-multi-preflight-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'single-image-provider',
          display_name: 'Single Image Provider',
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
        { id: 39, provider: 'single-image-provider', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        {
          id: 39,
          api_key_id: 39,
          provider: 'single-image-provider',
          display_name: 'Single Image Video',
          model_name: 'single-image-video',
          capabilities: { image_to_video: true },
          health_status: 'healthy',
          context_ui_params: {},
        },
      ]))

      let fetchCalls = 0
      globalThis.fetch = (async () => {
        fetchCalls += 1
        throw new Error('provider must not be called during preflight')
      }) as typeof fetch

      await expect(preflightRuntimeRequestTransport(workspace, {
        model: 'balanced',
        type: 'image_to_video',
        image_url: '/first.png',
        reference_images: [
          { url: '/first.png', reference_index: 1 },
          { url: '/last.png', reference_index: 2 },
        ],
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: '生成视频' },
            { type: 'image_url', image_url: { url: '/first.png' } },
            { type: 'image_url', image_url: { url: '/last.png' } },
          ],
        }],
      } as any, 39)).rejects.toMatchObject({ code: 'MULTI_REFERENCE_UNSUPPORTED' })
      expect(fetchCalls).toBe(0)
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('execute rejects typed multi-reference preflight errors before fetch or key metrics', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-multi-execute-preflight-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'single-image-provider',
          display_name: 'Single Image Provider',
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
      const originalKeys = [
        { id: 40, provider: 'single-image-provider', key: 'secret-key', is_active: true },
      ]
      await writeFile(join(workspace, 'keys.json'), JSON.stringify(originalKeys))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        {
          id: 40,
          api_key_id: 40,
          provider: 'single-image-provider',
          display_name: 'Single Image Video',
          model_name: 'single-image-video',
          capabilities: { image_to_video: true },
          health_status: 'healthy',
          context_ui_params: {},
        },
      ]))

      let fetchCalls = 0
      globalThis.fetch = (async () => {
        fetchCalls += 1
        throw new Error('provider must not be called during execute preflight')
      }) as typeof fetch

      const outcome = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        type: 'image_to_video',
        image_url: '/first.png',
        reference_images: [
          { url: '/first.png', reference_index: 1 },
          { url: '/last.png', reference_index: 2 },
        ],
        messages: [{ role: 'user', content: '生成视频' }],
      } as any, 40, { maxRetries: 0 }).then(
        value => ({ value }),
        error => ({ error }),
      )
      const keysAfter = JSON.parse(await readFile(join(workspace, 'keys.json'), 'utf8'))

      expect({
        errorCode: (outcome as any).error?.code,
        errorStatus: (outcome as any).error?.status,
        resolvedError: (outcome as any).value?.error,
        fetchCalls,
        keysAfter,
      }).toEqual({
        errorCode: 'MULTI_REFERENCE_UNSUPPORTED',
        errorStatus: 422,
        resolvedError: undefined,
        fetchCalls: 0,
        keysAfter: originalKeys,
      })
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('rejects native transport field collisions before fetch or key metrics without mutating references', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-field-collision-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([{
        id: 'collision-provider',
        display_name: 'Collision Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        supported_modalities: ['image_to_video'],
        default_base_url: 'https://api.example.com/v1',
        is_active: true,
        endpoints: {},
        custom_headers: {},
      }]))
      const originalKeysText = `${JSON.stringify([{
        id: 141,
        provider: 'collision-provider',
        key: 'secret-key',
        is_active: true,
        failure_count: 4,
        last_used: '2026-08-01T00:00:00.000Z',
      }], null, 2)}\n`
      await writeFile(join(workspace, 'keys.json'), originalKeysText)
      await writeFile(join(workspace, 'models.json'), JSON.stringify([{
        id: 141,
        api_key_id: 141,
        provider: 'collision-provider',
        display_name: 'Collision Video',
        model_name: 'collision-video',
        capabilities: { image_to_video: true },
        health_status: 'healthy',
        context_ui_params: {
          multi_reference: { supported: true, field: 'assets', shape: 'metadata', max: 9 },
          negative_prompt: { supported: true, field: 'assets' },
        },
      }]))

      let fetchCalls = 0
      globalThis.fetch = (async () => {
        fetchCalls += 1
        throw new Error('field collision must fail before fetch')
      }) as typeof fetch
      const request = {
        model: 'balanced',
        type: 'image_to_video',
        image_url: '/first.png',
        reference_images: [
          { url: '/first.png', reference_index: 1, reference_role: 'first_frame' },
          { url: '/last.png', reference_index: 2, reference_role: 'last_frame' },
        ],
        negative_prompt: 'NEG',
        messages: [{ role: 'user', content: '生成视频' }],
      } as any
      const originalRequest = structuredClone(request)

      const preflight = await preflightRuntimeRequestTransport(workspace, request, 141).then(
        value => ({ value }),
        error => ({ error }),
      )
      const execution = await executeWithRuntimeModel(workspace, request, 141, { maxRetries: 0 }).then(
        value => ({ value }),
        error => ({ error }),
      )

      expect({
        preflightCode: (preflight as any).error?.code,
        preflightStatus: (preflight as any).error?.status,
        preflightDetail: (preflight as any).error?.message,
        executionCode: (execution as any).error?.code,
        executionStatus: (execution as any).error?.status,
        executionResultError: (execution as any).value?.error,
        fetchCalls,
        keysText: await readFile(join(workspace, 'keys.json'), 'utf8'),
        request,
      }).toEqual({
        preflightCode: 'MULTI_REFERENCE_UNSUPPORTED',
        preflightStatus: 422,
        preflightDetail: expect.stringContaining('assets'),
        executionCode: 'MULTI_REFERENCE_UNSUPPORTED',
        executionStatus: 422,
        executionResultError: undefined,
        fetchCalls: 0,
        keysText: originalKeysText,
        request: originalRequest,
      })
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('preflight and execute reject deterministic unsafe field or template bodies without fetch or metric writes', async () => {
    const invalidConfigs = [
      {
        name: 'unsafe-field',
        endpoints: { image_to_video: { url: 'videos/generations' } },
        contextUiParams: {
          multi_reference: { supported: true, field: '__proto__', shape: 'urls', max: 9 },
        },
      },
      {
        name: 'non-object-template',
        endpoints: {
          image_to_video: { url: 'videos/generations', payload_template: '{{reference_images}}' },
        },
        contextUiParams: {},
      },
    ]

    for (const [index, invalid] of invalidConfigs.entries()) {
      const workspace = await mkdtemp(join(tmpdir(), `mangaforge-runtime-${invalid.name}-`))
      try {
        const keyId = 140 + index
        await writeFile(join(workspace, 'providers.json'), JSON.stringify([
          {
            id: invalid.name,
            display_name: invalid.name,
            service_type: 'llm',
            api_format: 'openai_compatible',
            auth_type: 'bearer',
            supported_modalities: ['image_to_video'],
            default_base_url: 'https://api.example.com/v1',
            is_active: true,
            endpoints: invalid.endpoints,
            custom_headers: {},
          },
        ]))
        const originalKeysText = `${JSON.stringify([
          {
            id: keyId,
            provider: invalid.name,
            key: 'secret-key',
            is_active: true,
            failure_count: 7,
            last_used: '2026-08-01T00:00:00.000Z',
          },
        ], null, 2)}\n`
        await writeFile(join(workspace, 'keys.json'), originalKeysText)
        await writeFile(join(workspace, 'models.json'), JSON.stringify([
          {
            id: keyId,
            api_key_id: keyId,
            provider: invalid.name,
            display_name: invalid.name,
            model_name: invalid.name,
            capabilities: { image_to_video: true },
            health_status: 'healthy',
            context_ui_params: invalid.contextUiParams,
          },
        ]))

        let fetchCalls = 0
        globalThis.fetch = (async () => {
          fetchCalls += 1
          throw new Error('invalid transport must fail before fetch')
        }) as typeof fetch
        const request = {
          model: 'balanced',
          type: 'image_to_video',
          image_url: '/first.png',
          reference_images: [
            { url: '/first.png', reference_index: 1 },
            { url: '/last.png', reference_index: 2 },
          ],
          messages: [{ role: 'user', content: '生成视频' }],
        } as any

        const preflight = await preflightRuntimeRequestTransport(workspace, request, keyId).then(
          value => ({ value }),
          error => ({ error }),
        )
        const execution = await executeWithRuntimeModel(workspace, request, keyId, { maxRetries: 0 }).then(
          value => ({ value }),
          error => ({ error }),
        )

        expect({
          preflightCode: (preflight as any).error?.code,
          preflightStatus: (preflight as any).error?.status,
          executionCode: (execution as any).error?.code,
          executionStatus: (execution as any).error?.status,
          executionResultError: (execution as any).value?.error,
          fetchCalls,
          keysText: await readFile(join(workspace, 'keys.json'), 'utf8'),
        }, invalid.name).toEqual({
          preflightCode: 'MULTI_REFERENCE_UNSUPPORTED',
          preflightStatus: 422,
          executionCode: 'MULTI_REFERENCE_UNSUPPORTED',
          executionStatus: 422,
          executionResultError: undefined,
          fetchCalls: 0,
          keysText: originalKeysText,
        })
      } finally {
        await rm(workspace, { recursive: true, force: true })
      }
    }
  })

  test('preflight leaves existing no-runtime-model handling unchanged', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-empty-preflight-'))
    try {
      await expect(preflightRuntimeRequestTransport(workspace, {
        model: 'balanced',
        type: 'image_to_video',
        image_url: '/first.png',
        reference_images: [
          { url: '/first.png', reference_index: 1 },
          { url: '/last.png', reference_index: 2 },
        ],
        messages: [{ role: 'user', content: '生成视频' }],
      } as any)).resolves.toBeNull()
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('normalizes and preflights camelCase provider capabilities loaded from workspace records', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-provider-capability-'))
    try {
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'provider-multi-images',
          display_name: 'Provider Multi Images',
          service_type: 'llm',
          api_format: 'openai_compatible',
          auth_type: 'bearer',
          supported_modalities: ['image_to_video'],
          default_base_url: 'https://api.example.com/v1',
          is_active: true,
          endpoints: {},
          custom_headers: {},
          contextUiParams: {
            multiReference: { supported: true, field: 'provider_images', shape: 'urls', max: 9 },
          },
        },
      ]))
      await writeFile(join(workspace, 'keys.json'), JSON.stringify([
        { id: 49, provider: 'provider-multi-images', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        {
          id: 49,
          api_key_id: 49,
          provider: 'provider-multi-images',
          display_name: 'Provider Capability Model',
          model_name: 'provider-capability-model',
          capabilities: { image_to_video: true },
          health_status: 'healthy',
          context_ui_params: {},
        },
      ]))

      const selection = await preflightRuntimeRequestTransport(workspace, {
        model: 'balanced',
        type: 'image_to_video',
        image_url: '/first.png',
        reference_images: [
          { url: '/first.png', reference_index: 1 },
          { url: '/last.png', reference_index: 2 },
        ],
        messages: [{ role: 'user', content: '生成视频' }],
      } as any, 49)

      expect(selection?.model.id).toBe(49)
      expect((selection?.provider.context_ui_params as any)?.multiReference.field).toBe('provider_images')
      expect((selection?.provider as any).contextUiParams).toBeUndefined()
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
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
  test('converts every canonical local reference image before explicit array provider calls', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-runtime-local-references-'))
    try {
      await mkdir(join(workspace, 'assets'), { recursive: true })
      await writeFile(join(workspace, 'assets', 'first.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
      await writeFile(join(workspace, 'assets', 'last.png'), Buffer.from([0x89, 0x50, 0x4e, 0x48]))
      await writeFile(join(workspace, 'providers.json'), JSON.stringify([
        {
          id: 'cloud-multi-media-provider',
          display_name: 'Cloud Multi Media Provider',
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
        { id: 29, provider: 'cloud-multi-media-provider', key: 'secret-key', is_active: true },
      ]))
      await writeFile(join(workspace, 'models.json'), JSON.stringify([
        {
          id: 29,
          api_key_id: 29,
          provider: 'cloud-multi-media-provider',
          display_name: 'Multi I2V Model',
          model_name: 'multi-i2v-model',
          capabilities: { image_to_video: true },
          health_status: 'healthy',
          context_ui_params: {
            multi_reference: { supported: true, field: 'input_images', shape: 'urls', max: 9 },
          },
        },
      ]))

      let capturedBody: any = null
      globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(String(init?.body || '{}'))
        return new Response(JSON.stringify({ data: [{ url: 'https://cdn.example/render.mp4' }] }), { status: 200 })
      }) as typeof fetch

      const firstUrl = '/api/assets/media/assets%2Ffirst.png'
      const lastUrl = '/api/assets/media/assets%2Flast.png'
      const result = await executeWithRuntimeModel(workspace, {
        model: 'balanced',
        type: 'image_to_video',
        image_url: firstUrl,
        reference_images: [
          { url: firstUrl, reference_index: 1, reference_role: 'first_frame' },
          { url: lastUrl, reference_index: 2, reference_role: 'last_frame' },
        ],
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: '让首尾帧动起来' },
            { type: 'image_url', image_url: { url: firstUrl } },
            { type: 'image_url', image_url: { url: lastUrl } },
          ],
        }],
        response_format: 'text',
      } as any, 29, { maxRetries: 0 })

      expect(capturedBody.image_url).toBe('data:image/png;base64,iVBORw==')
      expect(capturedBody.input_images).toEqual([
        'data:image/png;base64,iVBORw==',
        'data:image/png;base64,iVBOSA==',
      ])
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

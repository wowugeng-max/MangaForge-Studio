import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { syncModelsForKey } from './key-sync'

let workspaces: string[] = []
const originalFetch = globalThis.fetch

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-key-sync-'))
  workspaces.push(workspace)
  await writeFile(join(workspace, 'keys.json'), JSON.stringify([
    { id: 1, provider: 'universal', key: 'test-key', is_active: true },
  ]))
  await writeFile(join(workspace, 'providers.json'), JSON.stringify([
    {
      id: 'universal',
      display_name: 'Universal',
      service_type: 'llm',
      api_format: 'openai_compatible',
      auth_type: 'bearer',
      supported_modalities: ['chat'],
      default_base_url: 'https://example.com/v1',
      is_active: true,
    },
  ]))
  return workspace
}

afterEach(async () => {
  globalThis.fetch = originalFetch
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('model sync capability inference', () => {
  test('classifies synced models with the upstream six-task heuristic and default UI params', async () => {
    const workspace = await tempWorkspace()

    const result = await syncModelsForKey(workspace, 1, {
      data: [
        { id: 'wan2.2-i2v-plus' },
        { id: 'wan2.2-t2v-plus' },
        { id: 'sdxl-pro' },
        { id: 'background-remix-i2i' },
        { id: 'qwen-vl-plus' },
        { id: 'deepseek-chat' },
      ],
    })

    const byName = Object.fromEntries(result.models.map(model => [model.model_name, model]))
    expect(byName['wan2.2-i2v-plus'].capabilities).toMatchObject({
      chat: false,
      vision: false,
      text_to_video: false,
      image_to_video: true,
    })
    expect(byName['wan2.2-t2v-plus'].capabilities).toMatchObject({
      chat: false,
      text_to_video: true,
      image_to_video: false,
    })
    expect(byName['sdxl-pro'].capabilities).toMatchObject({
      chat: false,
      text_to_image: true,
      image_to_image: false,
    })
    expect(byName['background-remix-i2i'].capabilities).toMatchObject({
      chat: false,
      text_to_image: false,
      image_to_image: true,
    })
    expect(byName['qwen-vl-plus'].capabilities).toMatchObject({
      chat: true,
      vision: true,
      text_to_image: false,
      text_to_video: false,
    })
    expect(byName['deepseek-chat'].capabilities).toMatchObject({
      chat: true,
      vision: false,
      text_to_image: false,
      image_to_image: false,
      text_to_video: false,
      image_to_video: false,
    })
    expect(byName['deepseek-chat'].context_ui_params).toMatchObject({
      chat: [
        { name: 'temperature', type: 'number', min: 0, max: 2, step: 0.1, default: 0.7 },
        { name: 'max_tokens', type: 'number', min: 1, max: 8192, step: 1, default: 2048 },
      ],
    })
    expect(byName['deepseek-chat'].context_ui_params.temperature).toBeUndefined()
    expect(byName['qwen-vl-plus'].context_ui_params.vision).toBeArray()
    expect(byName['sdxl-pro'].context_ui_params.text_to_image).toEqual([
      { name: 'size', label: '图像尺寸', type: 'select', options: ['1024*1024', '768*1024', '1024*768'], default: '1024*1024' },
      { name: 'n', label: '生成数量', type: 'number', min: 1, max: 4, step: 1, default: 1 },
    ])
  })

  test('infers Claude Code protocol overrides from synced Claude model ids', async () => {
    const workspace = await tempWorkspace()

    const result = await syncModelsForKey(workspace, 1, {
      data: [
        { id: 'claude-opus-4-8' },
        { id: 'claude-sonnet-4-6' },
        { id: 'gpt-5.5' },
      ],
    })

    const byName = Object.fromEntries(result.models.map(model => [model.model_name, model]))
    expect(byName['claude-opus-4-8'].api_format).toBe('claude_code')
    expect(byName['claude-sonnet-4-6'].api_format).toBe('claude_code')
    expect(byName['gpt-5.5'].api_format).toBeUndefined()
  })

  test('normalizes legacy upstream image and video capability keys into six task capabilities', async () => {
    const workspace = await tempWorkspace()

    const result = await syncModelsForKey(workspace, 1, {
      data: [
        { id: 'qwen-image-legacy', capabilities: { chat: false, vision: false, image: true, video: false } },
        { id: 'veo-legacy', capabilities: { chat: false, vision: false, image: false, video: true } },
      ],
    })

    const byName = Object.fromEntries(result.models.map(model => [model.model_name, model]))
    expect(byName['qwen-image-legacy'].capabilities).toMatchObject({
      image: true,
      text_to_image: true,
      image_to_image: false,
      text_to_video: false,
      image_to_video: false,
    })
    expect(byName['qwen-image-legacy'].context_ui_params.text_to_image).toBeArray()
    expect(byName['veo-legacy'].capabilities).toMatchObject({
      video: true,
      text_to_image: false,
      image_to_image: false,
      text_to_video: true,
      image_to_video: false,
    })
    expect(byName['veo-legacy'].context_ui_params.text_to_video).toBeArray()
  })

  test('uses API key base_url before provider default_base_url when fetching remote models', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 1, provider: 'universal', key: 'test-key', base_url: 'https://key.example/v1', is_active: true },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([]))

    let capturedUrl = ''
    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = String(url)
      return new Response(JSON.stringify({ data: [{ id: 'key-routed-model' }] }), { status: 200 })
    }) as typeof fetch

    const result = await syncModelsForKey(workspace, 1)

    expect(capturedUrl).toBe('https://key.example/v1/models')
    expect(result.created).toBe(1)
    expect(result.models[0].model_name).toBe('key-routed-model')
  })

  test('uses provider endpoint DSL object url when syncing remote models', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      {
        id: 'universal',
        display_name: 'Universal',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        supported_modalities: ['chat'],
        default_base_url: 'https://provider.example/api',
        endpoints: {
          models: { url: '/catalog/models' },
        },
        is_active: true,
      },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([]))

    let capturedUrl = ''
    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = String(url)
      return new Response(JSON.stringify({ data: [{ id: 'dsl-model' }] }), { status: 200 })
    }) as typeof fetch

    const result = await syncModelsForKey(workspace, 1)

    expect(capturedUrl).toBe('https://provider.example/api/catalog/models')
    expect(result.created).toBe(1)
    expect(result.models[0].model_name).toBe('dsl-model')
  })

  test('uses provider endpoint DSL object endpoint when syncing remote models', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      {
        id: 'universal',
        display_name: 'Universal',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        supported_modalities: ['chat'],
        default_base_url: 'https://provider.example/api',
        endpoints: {
          models: { endpoint: '/catalog/models' },
        },
        is_active: true,
      },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([]))

    let capturedUrl = ''
    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = String(url)
      return new Response(JSON.stringify({ data: [{ id: 'endpoint-dsl-model' }] }), { status: 200 })
    }) as typeof fetch

    const result = await syncModelsForKey(workspace, 1)

    expect(capturedUrl).toBe('https://provider.example/api/catalog/models')
    expect(result.created).toBe(1)
    expect(result.models[0].model_name).toBe('endpoint-dsl-model')
  })

  test('extracts models from deeply wrapped gateway response envelopes', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([]))

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({
        data: {
          result: {
            output: {
              data: [
                { id: 'gateway-chat-model', display_name: 'Gateway Chat' },
              ],
            },
          },
        },
      }), { status: 200 })
    }) as typeof fetch

    const result = await syncModelsForKey(workspace, 1)

    expect(result.created).toBe(1)
    expect(result.models[0]).toMatchObject({
      model_name: 'gateway-chat-model',
      display_name: 'Gateway Chat',
      capabilities: { chat: true },
    })
  })

  test('uses the upstream DashScope model list endpoint for qwen providers without a base url', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 7, provider: 'qwen', key: 'dashscope-key', is_active: true },
    ]))
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      {
        id: 'qwen',
        display_name: 'Qwen',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        supported_modalities: ['chat', 'vision', 'text_to_image'],
        is_active: true,
      },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([]))

    let capturedUrl = ''
    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = String(url)
      return new Response(JSON.stringify({ data: [{ id: 'qwen-vl-plus' }] }), { status: 200 })
    }) as typeof fetch

    const result = await syncModelsForKey(workspace, 7)

    expect(capturedUrl).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1/models')
    expect(result.created).toBe(1)
    expect(result.models[0].model_name).toBe('qwen-vl-plus')
  })

  test('uses the upstream Gemini model list endpoint and cleans model names without a base url', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 8, provider: 'gemini', key: 'gemini-key', is_active: true },
    ]))
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      {
        id: 'gemini',
        display_name: 'Google Gemini',
        service_type: 'llm',
        api_format: 'gemini_native',
        auth_type: 'bearer',
        supported_modalities: ['chat', 'vision'],
        is_active: true,
      },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([]))

    let capturedUrl = ''
    let capturedHeaders: HeadersInit | undefined
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedHeaders = init?.headers
      return new Response(JSON.stringify({
        models: [
          { name: 'models/gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
          { name: 'models/embedding-001', displayName: 'Embedding 001' },
        ],
      }), { status: 200 })
    }) as typeof fetch

    const result = await syncModelsForKey(workspace, 8)

    expect(capturedUrl).toBe('https://generativelanguage.googleapis.com/v1beta/models')
    expect(capturedHeaders).toMatchObject({ 'x-goog-api-key': 'gemini-key' })
    expect(result.created).toBe(1)
    expect(result.models.map(model => model.model_name)).toEqual(['gemini-1.5-pro'])
    expect(result.models[0]).toMatchObject({
      display_name: 'Gemini 1.5 Pro',
      capabilities: {
        chat: true,
        vision: true,
      },
    })
  })

  test('soft-disables stale synced models while preserving manual models for the same key', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      {
        id: 1,
        api_key_id: 1,
        provider: 'universal',
        display_name: 'Old Synced',
        model_name: 'old-synced-model',
        capabilities: { chat: true },
        is_active: true,
        is_manual: false,
      },
      {
        id: 2,
        api_key_id: 1,
        provider: 'universal',
        display_name: 'Manual Local',
        model_name: 'manual-local-model',
        capabilities: { chat: true },
        is_active: true,
        is_manual: true,
      },
    ]))

    const result = await syncModelsForKey(workspace, 1, {
      data: [{ id: 'new-remote-model' }],
    })

    const stored = JSON.parse(await readFile(join(workspace, 'models.json'), 'utf8'))
    expect(stored.find((model: any) => model.model_name === 'old-synced-model')).toMatchObject({
      is_active: false,
      is_manual: false,
    })
    expect(stored.find((model: any) => model.model_name === 'manual-local-model')).toMatchObject({
      is_active: true,
      is_manual: true,
    })
    expect(stored.find((model: any) => model.model_name === 'new-remote-model')).toMatchObject({
      is_active: true,
      is_manual: false,
    })
    expect(result.models.map(model => model.model_name).sort()).toEqual([
      'manual-local-model',
      'new-remote-model',
      'old-synced-model',
    ])
  })
})

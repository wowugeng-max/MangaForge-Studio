import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { writeAssets, readAssets, type AssetRecord } from '../assets'
import { writeModels } from '../model-store'
import { writeProviders } from '../provider-store'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-direct-task-'))
  workspaces.push(workspace)
  return workspace
}

function createRouteHarness() {
  const handlers = new Map<string, any>()
  const app = {
    post: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`POST ${path}`, handler)
      return app
    },
    get: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`GET ${path}`, handler)
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

const asset = (overrides: Partial<AssetRecord>): AssetRecord => ({
  id: 1,
  name: 'asset',
  type: 'prompt',
  description: '',
  tags: [],
  project_id: null,
  thumbnail: '',
  data: {},
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('direct API task migration routes', () => {
  test('registers FastAPI-compatible trailing slash aliases for direct task routes', async () => {
    const workspace = await tempWorkspace()
    const { registerDirectTaskRoutes } = await import('./direct-task')
    const { app, handlers } = createRouteHarness()
    registerDirectTaskRoutes(app as any, () => workspace)

    expect(handlers.has('POST /api/tasks/direct')).toBe(true)
    expect(handlers.has('POST /api/tasks/direct/')).toBe(true)
    expect(handlers.has('GET /api/tasks/:taskId')).toBe(true)
    expect(handlers.has('GET /api/tasks/:taskId/')).toBe(true)
  })

  test('resolves context variables and asset references across direct pipeline steps', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [
      asset({ id: 1, type: 'prompt', name: 'Prompt', data: { content: '核心提示词' } }),
      asset({ id: 2, type: 'character', name: 'Hero', data: { core_prompt: '角色核心', profile: { tone: '冷静' } } }),
    ])
    const calls: any[] = []
    const { registerDirectTaskRoutes } = await import('./direct-task')
    const { app, handlers } = createRouteHarness()
    registerDirectTaskRoutes(app as any, () => workspace, {
      execute: async (_activeWorkspace, request) => {
        calls.push(request)
        return { content: `输出:${request.messages.at(-1)?.content || ''}`, finish_reason: 'stop' } as any
      },
    })

    const response = await call(handlers.get('POST /api/tasks/direct'), {
      body: {
        sync: true,
        pipeline: [
          { provider: 'mock', model: 'm1', prompt: 'A {asset:1} {asset:2.profile.tone}', output_var: 'draft' },
          { provider: 'mock', model: 'm2', prompt: 'B {draft} {asset:2}', output_var: 'final' },
        ],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.status).toBe('completed')
    expect(response.body.visited_asset_ids).toEqual([1, 2])
    expect(calls.map(call => call.messages.at(-1)?.content)).toEqual([
      'A 核心提示词 冷静',
      'B 输出:A 核心提示词 冷静 角色核心',
    ])
    expect(response.body.outputs.final).toBe('输出:B 输出:A 核心提示词 冷静 角色核心')
  })

  test('resolves legacy top-level character core prompts in direct pipeline asset references', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [
      asset({
        id: 7,
        type: 'character',
        name: 'Legacy Hero',
        data: {},
        core_prompt: '旧角色卡核心提示',
      } as any),
    ])
    const seenPrompts: string[] = []
    const { executeDirectPipeline } = await import('./direct-task')

    const response = await executeDirectPipeline(workspace, {
      pipeline: [
        { provider: 'mock', model: 'm1', prompt: '角色：{asset:7}', output_var: 'draft' },
      ],
    }, {
      execute: async (_activeWorkspace, request) => {
        seenPrompts.push(String(request.messages.at(-1)?.content || ''))
        return { content: 'ok', finish_reason: 'stop' } as any
      },
    })

    expect(response.visited_asset_ids).toEqual([7])
    expect(seenPrompts).toEqual(['角色：旧角色卡核心提示'])
  })

  test('resolves explicit field paths from legacy top-level asset fields', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [
      asset({
        id: 8,
        type: 'character',
        name: 'Legacy Hero',
        data: {},
        core_prompt: '顶层角色核心',
        content: '顶层角色正文',
      } as any),
    ])
    const seenPrompts: string[] = []
    const { executeDirectPipeline } = await import('./direct-task')

    const response = await executeDirectPipeline(workspace, {
      pipeline: [
        { provider: 'mock', model: 'm1', prompt: 'A:{asset:8.core_prompt} B:{asset:8.content}', output_var: 'draft' },
      ],
    }, {
      execute: async (_activeWorkspace, request) => {
        seenPrompts.push(String(request.messages.at(-1)?.content || ''))
        return { content: 'ok', finish_reason: 'stop' } as any
      },
    })

    expect(response.visited_asset_ids).toEqual([8])
    expect(seenPrompts).toEqual(['A:顶层角色核心 B:顶层角色正文'])
  })

  test('stores large base64 image outputs as image assets and exposes task status lookup', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [
      asset({ id: 1, type: 'prompt', name: 'Prompt', data: { content: '画面提示' } }),
    ])
    const imageBase64 = Buffer.from('fake-png-bytes').toString('base64')
    const { registerDirectTaskRoutes } = await import('./direct-task')
    const { app, handlers } = createRouteHarness()
    registerDirectTaskRoutes(app as any, () => workspace, {
      execute: async () => ({ content: `data:image/png;base64,${imageBase64}`, finish_reason: 'stop' } as any),
      idFactory: () => 'task-direct-1',
    })

    const response = await call(handlers.get('POST /api/tasks/direct'), {
      body: {
        project_id: 42,
        sync: true,
        pipeline: [{ provider: 'mock', model: 'image-model', prompt: '{asset:1}', output_var: 'cover' }],
      },
    })

    expect(response.body.created_assets.cover).toBeGreaterThan(1)
    const storedAssets = await readAssets(workspace)
    const created = storedAssets.find(item => item.id === response.body.created_assets.cover)
    expect(created).toMatchObject({
      type: 'image',
      name: 'direct-cover.png',
      project_id: 42,
      source_asset_ids: [1],
      file_path: created!.data!.file_path,
      data: {
        source: 'direct_api_task',
        source_output: 'cover',
        source_asset_ids: [1],
      },
    })
    expect(await readFile(created!.data!.file_path, 'utf8')).toBe('fake-png-bytes')

    const status = await call(handlers.get('GET /api/tasks/:taskId'), { params: { taskId: 'task-direct-1' } })
    expect(status.body.status).toBe('completed')
    expect(status.body.result.created_assets.cover).toBe(created!.id)
  })

  test('passes explicit and resolved preferred model ids to runtime execution', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [])
    await writeModels(workspace, [
      {
        id: 88,
        api_key_id: 12,
        provider: 'mock',
        display_name: 'Mock Creative',
        model_name: 'mock-creative',
        capabilities: { chat: true },
        is_active: true,
      },
    ])
    const preferredModelIds: Array<number | undefined> = []
    const { executeDirectPipeline } = await import('./direct-task')

    const response = await executeDirectPipeline(workspace, {
      pipeline: [
        { provider: 'mock', model_id: 77, model: 'explicit-model', prompt: 'A', output_var: 'first' },
        { provider: 'mock', api_key_id: 12, model: 'mock-creative', prompt: 'B {first}', output_var: 'second' },
      ],
    }, {
      execute: async (_activeWorkspace, request, preferredModelId) => {
        preferredModelIds.push(preferredModelId)
        return { content: `ok:${request.model}`, finish_reason: 'stop' } as any
      },
    })

    expect(response.outputs.second).toBe('ok:mock-creative')
    expect(preferredModelIds).toEqual([77, 88])
  })

  test('falls back to the step provider model when direct step model name is not registered', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [])
    await writeModels(workspace, [
      {
        id: 10,
        api_key_id: 10,
        provider: 'other',
        display_name: 'Other Favorite',
        model_name: 'other-model',
        capabilities: { chat: true },
        is_active: true,
        is_favorite: true,
      },
      {
        id: 22,
        api_key_id: 22,
        provider: 'target',
        display_name: 'Target Default',
        model_name: 'target-default',
        capabilities: { chat: true },
        is_active: true,
      },
    ])
    const preferredModelIds: Array<number | undefined> = []
    const { executeDirectPipeline } = await import('./direct-task')

    await executeDirectPipeline(workspace, {
      pipeline: [
        { provider: 'target', model: 'not-yet-synced-model', prompt: 'A', output_var: 'first' },
      ],
    }, {
      execute: async (_activeWorkspace, request, preferredModelId) => {
        preferredModelIds.push(preferredModelId)
        return { content: `ok:${request.model}`, finish_reason: 'stop' } as any
      },
    })

    expect(preferredModelIds).toEqual([22])
  })

  test('passes image inputs and media route type to runtime execution', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [])
    const seenRequests: any[] = []
    const { executeDirectPipeline } = await import('./direct-task')

    await executeDirectPipeline(workspace, {
      pipeline: [
        {
          provider: 'mock',
          model: 'image-edit-model',
          type: 'image_to_image',
          prompt: 'turn it into ink style',
          image: 'https://cdn.example/input.png',
          output_var: 'edited',
        },
      ],
    }, {
      execute: async (_activeWorkspace, request) => {
        seenRequests.push(request)
        return { content: 'https://cdn.example/edited.png', finish_reason: 'stop' } as any
      },
    })

    expect(seenRequests[0]).toMatchObject({
      model: 'image-edit-model',
      type: 'image_to_image',
      image_url: 'https://cdn.example/input.png',
    })
    expect(seenRequests[0].messages.at(-1)?.content).toBe('turn it into ink style')
  })

  test('uses upstream pipeline input field as a text prompt alias', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [])
    const seenRequests: any[] = []
    const { executeDirectPipeline } = await import('./direct-task')

    await executeDirectPipeline(workspace, {
      pipeline: [
        {
          provider: 'mock',
          model: 'chat-model',
          input: 'schema input prompt',
          output_var: 'answer',
        },
      ],
    }, {
      execute: async (_activeWorkspace, request) => {
        seenRequests.push(request)
        return { content: 'ok', finish_reason: 'stop' } as any
      },
    })

    expect(seenRequests[0].messages.at(-1)?.content).toBe('schema input prompt')
  })

  test('passes explicit messages through direct pipeline steps after resolving variables', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [
      asset({ id: 1, type: 'prompt', name: 'Prompt', data: { content: '世界设定' } }),
    ])
    const seenRequests: any[] = []
    const { executeDirectPipeline } = await import('./direct-task')

    await executeDirectPipeline(workspace, {
      pipeline: [
        {
          provider: 'mock',
          model: 'chat-model',
          messages: [
            { role: 'system', content: '只使用{asset:1}' },
            { role: 'user', content: '请生成第一幕' },
          ],
          output_var: 'draft',
        },
      ],
    }, {
      execute: async (_activeWorkspace, request) => {
        seenRequests.push(request)
        return { content: 'ok', finish_reason: 'stop' } as any
      },
    })

    expect(seenRequests[0].messages).toEqual([
      { role: 'system', content: '只使用世界设定' },
      { role: 'user', content: '请生成第一幕' },
    ])
  })

  test('applies input_map as resolved step inputs for downstream direct pipeline steps', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [
      asset({ id: 1, type: 'prompt', name: 'Prompt', data: { content: '角色口吻' } }),
    ])
    const seenRequests: any[] = []
    const { executeDirectPipeline } = await import('./direct-task')

    const response = await executeDirectPipeline(workspace, {
      pipeline: [
        {
          provider: 'mock',
          model: 'outline-model',
          prompt: '先生成大纲',
          output_var: 'outline',
        },
        {
          provider: 'mock',
          model: 'draft-model',
          input_map: {
            prompt: '按{outline}扩写，保持{asset:1}',
            messages: [
              { role: 'system', content: '设定约束：{asset:1}' },
              { role: 'user', content: '正文任务：{outline}' },
            ],
          },
          output_var: 'draft',
        },
      ],
    }, {
      execute: async (_activeWorkspace, request) => {
        seenRequests.push(request)
        return { content: `ok:${request.messages.at(-1)?.content || ''}`, finish_reason: 'stop' } as any
      },
    })

    expect(seenRequests[1].messages).toEqual([
      { role: 'system', content: '设定约束：角色口吻' },
      { role: 'user', content: '正文任务：ok:先生成大纲' },
    ])
    expect(response.outputs.draft).toBe('ok:正文任务：ok:先生成大纲')
    expect(response.visited_asset_ids).toEqual([1])
  })

  test('preserves seed and extra params for direct API runtime calls', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [])
    const seenRequests: any[] = []
    const { executeDirectPipeline } = await import('./direct-task')

    await executeDirectPipeline(workspace, {
      pipeline: [
        {
          provider: 'mock',
          model: 'image-model',
          type: 'text_to_image',
          prompt: 'neon city',
          seed: 12345,
          extra_params: {
            size: '1024x1024',
            prompt_extend: true,
            steps: 28,
            temperature: 0.42,
            max_tokens: 2048,
          },
          output_var: 'image',
        },
      ],
    }, {
      execute: async (_activeWorkspace, request) => {
        seenRequests.push(request)
        return { content: 'https://cdn.example/image.png', finish_reason: 'stop' } as any
      },
    })

    expect(seenRequests[0]).toMatchObject({
      model: 'image-model',
      type: 'text_to_image',
      seed: 12345,
      size: '1024x1024',
      prompt_extend: true,
      steps: 28,
      temperature: 0.42,
      max_tokens: 2048,
    })
  })

  test('uses upstream direct task api_keys as ephemeral credentials without saved keys or models', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [])
    await writeModels(workspace, [])
    await writeProviders(workspace, [
      {
        id: 'inline-provider',
        display_name: 'Inline Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        supported_modalities: ['chat'],
        default_base_url: 'https://inline.example/v1',
        is_active: true,
      },
    ])

    const previousFetch = globalThis.fetch
    let capturedAuth = ''
    let capturedBody: any = null
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe('https://inline.example/v1/chat/completions')
      capturedAuth = String((init?.headers as any)?.Authorization || '')
      capturedBody = JSON.parse(String(init?.body || '{}'))
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'inline direct ok' } }],
      }), { status: 200 })
    }) as any

    try {
      const { executeDirectPipeline } = await import('./direct-task')

      const response = await executeDirectPipeline(workspace, {
        api_keys: { 'inline-provider': 'sk-inline-direct' },
        pipeline: [
          { provider: 'inline-provider', model: 'inline-model', prompt: 'hello inline', output_var: 'answer' },
        ],
      })

      expect(response.outputs.answer).toBe('inline direct ok')
      expect(capturedAuth).toBe('Bearer sk-inline-direct')
      expect(capturedBody).toMatchObject({
        model: 'inline-model',
        messages: [{ role: 'user', content: 'hello inline' }],
      })
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('accepts camelCase apiKeys object fields for direct task ephemeral credentials', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [])
    await writeModels(workspace, [])
    await writeProviders(workspace, [
      {
        id: 'inline-provider',
        display_name: 'Inline Provider',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        supported_modalities: ['chat'],
        default_base_url: 'https://provider.example/v1',
        is_active: true,
      },
    ])

    const previousFetch = globalThis.fetch
    let capturedUrl = ''
    let capturedAuth = ''
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedAuth = String((init?.headers as any)?.Authorization || '')
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'inline direct camel ok' } }],
      }), { status: 200 })
    }) as any

    try {
      const { executeDirectPipeline } = await import('./direct-task')

      const response = await executeDirectPipeline(workspace, {
        apiKeys: {
          'inline-provider': {
            apiKey: 'sk-inline-camel',
            baseUrl: 'https://inline-camel.example/v1',
          },
        },
        pipeline: [
          { provider: 'inline-provider', model: 'inline-model', prompt: 'hello inline', output_var: 'answer' },
        ],
      })

      expect(response.outputs.answer).toBe('inline direct camel ok')
      expect(capturedUrl).toBe('https://inline-camel.example/v1/chat/completions')
      expect(capturedAuth).toBe('Bearer sk-inline-camel')
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('returns FastAPI-compatible detail field for direct task execution errors', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [])
    await writeModels(workspace, [])
    const { registerDirectTaskRoutes } = await import('./direct-task')
    const { app, handlers } = createRouteHarness()
    registerDirectTaskRoutes(app as any, () => workspace)

    const response = await call(handlers.get('POST /api/tasks/direct'), {
      body: { sync: true },
    })

    expect(response.statusCode).toBe(500)
    expect(response.body).toEqual({
      error: 'Error: direct task pipeline is required',
      detail: 'Error: direct task pipeline is required',
    })
  })
})

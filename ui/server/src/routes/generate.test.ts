import { afterEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generate-route-'))
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
  await handler({ body: {}, ...req }, res)
  return res
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('canvas generate route', () => {
  test('builds a runtime LLM request from a GenerateNode payload', async () => {
    const { buildCanvasGenerateLLMRequest } = await import('./generate')

    const request = buildCanvasGenerateLLMRequest({
      model: 'gpt-5.5',
      type: 'text_to_video',
      prompt: '画一个镜头',
      messages: [
        { role: 'system', content: '你是分镜大师' },
        { role: 'user', content: '画一个镜头' },
      ],
      params: { temperature: 0.72, max_tokens: 2048 },
    })

    expect(request).toMatchObject({
      model: 'gpt-5.5',
      type: 'text_to_video',
      temperature: 0.72,
      max_tokens: 2048,
      response_format: { type: 'text' },
    })
    expect(request.messages).toEqual([
      { role: 'system', content: '你是分镜大师' },
      { role: 'user', content: '画一个镜头' },
    ])
  })

  test('preserves canvas media inputs and dynamic generation params for runtime media routes', async () => {
    const { buildCanvasGenerateLLMRequest } = await import('./generate')

    const request = buildCanvasGenerateLLMRequest({
      model: 'wan-video',
      type: 'image_to_video',
      prompt: '让角色转身',
      image_url: '/api/assets/media/uploads%2Ffirst-frame.png',
      params: {
        temperature: 0.65,
        size: '1280*720',
        steps: 18,
        guidance_scale: 7,
        client_id: 'node-123',
        empty_optional: '',
      },
    }) as any

    expect(request).toMatchObject({
      model: 'wan-video',
      type: 'image_to_video',
      image_url: '/api/assets/media/uploads%2Ffirst-frame.png',
      size: '1280*720',
      steps: 18,
      guidance_scale: 7,
    })
    expect(request.client_id).toBeUndefined()
    expect(request.empty_optional).toBeUndefined()
  })

  test('packages incoming canvas assets as multimodal message parts and source lineage', async () => {
    const { buildCanvasGenerateLLMRequest } = await import('./generate')

    const request = buildCanvasGenerateLLMRequest({
      model: 'vision-model',
      type: 'vision',
      prompt: '分析这些参考素材',
      params: {
        incoming_assets: [
          { id: 101, type: 'image', file_path: 'assets/source-a.png' },
          { id: 102, type: 'image', url: 'https://cdn.example/source-b.png' },
          { id: 103, type: 'prompt', content: '主角穿红色外套，画面要有压迫感', source_asset_ids: [201, 202] },
        ],
      },
    }) as any

    expect(request.image_url).toBe('/api/assets/media/assets%2Fsource-a.png')
    expect(request.source_asset_ids).toEqual([101, 102, 103, 201, 202])
    expect(request.incoming_assets).toBeUndefined()
    expect(request.messages).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: '分析这些参考素材\n\n[连线素材]:\n主角穿红色外套，画面要有压迫感' },
          { type: 'image_url', image_url: { url: '/api/assets/media/assets%2Fsource-a.png' } },
          { type: 'image_url', image_url: { url: 'https://cdn.example/source-b.png' } },
        ],
      },
    ])
  })

  test('keeps upstream temporary file URLs as local image inputs in incoming canvas assets', async () => {
    const { buildCanvasGenerateLLMRequest } = await import('./generate')

    const request = buildCanvasGenerateLLMRequest({
      model: 'vision-model',
      type: 'vision',
      prompt: '分析旧临时图',
      params: {
        incoming_assets: [
          { id: 201, type: 'image', file_path: '/api/files/legacy.png' },
        ],
      },
    }) as any

    expect(request.image_url).toBe('/api/files/legacy.png')
    expect(request.messages[0].content).toContainEqual({ type: 'image_url', image_url: { url: '/api/files/legacy.png' } })
  })

  test('preserves top-level routing strategy for runtime key selection', async () => {
    const { buildCanvasGenerateLLMRequest } = await import('./generate')

    const request = buildCanvasGenerateLLMRequest({
      model: 'balanced',
      prompt: '开始',
      routing_strategy: 'cost',
      params: {
        temperature: 0.65,
      },
    }) as any

    expect(request.routing_strategy).toBe('cost')
    expect(request.temperature).toBe(0.65)
  })

  test('returns a synchronous generation result when client_id is absent', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      { id: 12, api_key_id: 5, provider: 'any', display_name: 'GPT', model_name: 'gpt-5.5', health_status: 'healthy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const calls: any[] = []
    registerGenerateRoutes(app as any, () => workspace, {
      execute: async (activeWorkspace, request, preferredModelId) => {
        calls.push({ activeWorkspace, request, preferredModelId })
        return { content: '同步正文', finish_reason: 'stop', parsed: null, runtimeSelection: { model: { model_name: 'gpt-5.5' } } as any }
      },
    })

    const res = await call(handlers.get('POST /api/generate'), {
      body: { api_key_id: 5, model: 'gpt-5.5', type: 'chat', prompt: '开始', params: { temperature: 0.5 } },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ success: true, content: '同步正文' })
    expect(calls[0].preferredModelId).toBe(12)
    expect(calls[0].request.temperature).toBe(0.5)
  })

  test('returns incoming source asset ids with generated results for downstream asset saves', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      { id: 12, api_key_id: 5, provider: 'any', display_name: 'GPT', model_name: 'gpt-5.5', health_status: 'healthy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    registerGenerateRoutes(app as any, () => workspace, {
      execute: async () => ({ content: 'https://cdn.example/out.png', finish_reason: 'stop', parsed: null } as any),
    })

    const res = await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 5,
        model: 'gpt-5.5',
        type: 'vision',
        prompt: '生成',
        params: {
          incoming_assets: [
            { id: 101, type: 'image', file_path: 'assets/source-a.png' },
            { id: 102, type: 'prompt', content: '参考文本' },
          ],
        },
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      source_asset_ids: [101, 102],
      result: {
        content: 'https://cdn.example/out.png',
        source_asset_ids: [101, 102],
      },
    })
  })

  test('resolves preferred model by provider when model names overlap across providers', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      { id: 30, api_key_id: 10, provider: 'other', display_name: 'Shared', model_name: 'shared-model', health_status: 'healthy' },
      { id: 31, api_key_id: 11, provider: 'target', display_name: 'Shared', model_name: 'shared-model', health_status: 'healthy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const preferredModelIds: Array<number | undefined> = []
    registerGenerateRoutes(app as any, () => workspace, {
      execute: async (_activeWorkspace, _request, preferredModelId) => {
        preferredModelIds.push(preferredModelId)
        return { content: '同步正文', finish_reason: 'stop', parsed: null } as any
      },
    })

    await call(handlers.get('POST /api/generate'), {
      body: { provider: 'target', model: 'shared-model', prompt: '开始' },
    })

    expect(preferredModelIds).toEqual([31])
  })

  test('falls back to a model from the requested provider when canvas model name is not synced', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      { id: 40, api_key_id: 20, provider: 'other', display_name: 'Other Favorite', model_name: 'other-model', health_status: 'healthy', is_favorite: true },
      { id: 41, api_key_id: 21, provider: 'target', display_name: 'Target Default', model_name: 'target-default', health_status: 'healthy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const preferredModelIds: Array<number | undefined> = []
    registerGenerateRoutes(app as any, () => workspace, {
      execute: async (_activeWorkspace, _request, preferredModelId) => {
        preferredModelIds.push(preferredModelId)
        return { content: '同步正文', finish_reason: 'stop', parsed: null } as any
      },
    })

    await call(handlers.get('POST /api/generate'), {
      body: { provider: 'target', model: 'not-yet-synced-model', prompt: '开始' },
    })

    expect(preferredModelIds).toEqual([41])
  })

  test('starts an SSE-backed background generation when client_id is present', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      { id: 21, api_key_id: 6, provider: 'any', display_name: 'GPT', model_name: 'gpt-5.5', health_status: 'healthy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const messages: any[] = []
    const registered: any[] = []
    const unregistered: string[] = []
    let executeStarted = false
    let releaseExecute: (() => void) | null = null
    registerGenerateRoutes(app as any, () => workspace, {
      execute: async () => {
        executeStarted = true
        await new Promise<void>(resolve => { releaseExecute = resolve })
        return { content: '异步正文', finish_reason: 'stop', parsed: null } as any
      },
      sendMessage: async (clientId, message) => {
        messages.push({ clientId, message })
        return true
      },
      registerTask: (clientId, adapterId, cancelToken) => registered.push({ clientId, adapterId, cancelToken }),
      unregisterTask: clientId => unregistered.push(clientId),
    })

    const res = await call(handlers.get('POST /api/generate'), {
      body: { api_key_id: 6, model: 'gpt-5.5', prompt: '开始', params: { client_id: 'node-1' } },
    })

    expect(res.body).toMatchObject({ success: true, client_id: 'node-1' })
    expect(registered).toHaveLength(1)
    expect(registered[0].clientId).toBe('node-1')
    expect(messages[0]).toMatchObject({ clientId: 'node-1', message: { type: 'status' } })

    while (!executeStarted || !releaseExecute) await new Promise(resolve => setTimeout(resolve, 0))
    releaseExecute()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(messages.find(item => item.message.type === 'result')).toMatchObject({
      clientId: 'node-1',
      message: { type: 'result', data: { content: '异步正文' } },
    })
    expect(unregistered).toEqual(['node-1'])
  })

  test('accepts camelCase clientId for SSE-backed background generation', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      { id: 21, api_key_id: 6, provider: 'any', display_name: 'GPT', model_name: 'gpt-5.5', health_status: 'healthy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const messages: any[] = []
    const registered: any[] = []
    registerGenerateRoutes(app as any, () => workspace, {
      execute: async () => ({ content: '异步正文', finish_reason: 'stop', parsed: null } as any),
      sendMessage: async (clientId, message) => {
        messages.push({ clientId, message })
        return true
      },
      registerTask: (clientId, adapterId, cancelToken) => registered.push({ clientId, adapterId, cancelToken }),
    })

    const res = await call(handlers.get('POST /api/generate'), {
      body: { api_key_id: 6, model: 'gpt-5.5', prompt: '开始', clientId: 'node-camel' },
    })

    expect(res.body).toMatchObject({ success: true, client_id: 'node-camel' })
    expect(registered[0]).toMatchObject({ clientId: 'node-camel', adapterId: 'canvas-generate' })
    expect(messages[0]).toMatchObject({ clientId: 'node-camel', message: { type: 'status' } })
  })

  test('passes an abort signal to background LLM execution and aborts it from the interrupt hook', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      { id: 24, api_key_id: 6, provider: 'any', display_name: 'GPT', model_name: 'gpt-5.5', health_status: 'healthy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const registered: any[] = []
    let executionStarted = false
    let executionOptions: any = null
    registerGenerateRoutes(app as any, () => workspace, {
      execute: async (_activeWorkspace, _request, _preferredModelId, options) => {
        executionStarted = true
        executionOptions = options
        await new Promise<void>(() => {})
        return { content: 'never', finish_reason: 'stop', parsed: null } as any
      },
      sendMessage: async () => true,
      registerTask: (clientId, adapterId, cancelToken) => registered.push({ clientId, adapterId, cancelToken }),
    })

    await call(handlers.get('POST /api/generate'), {
      body: { api_key_id: 6, model: 'gpt-5.5', prompt: '开始', params: { client_id: 'node-llm-abort' } },
    })

    while (!executionStarted) await new Promise(resolve => setTimeout(resolve, 0))
    expect(executionOptions.signal).toBeInstanceOf(AbortSignal)
    expect(executionOptions.signal.aborted).toBe(false)
    expect(registered[0]).toMatchObject({ clientId: 'node-llm-abort', adapterId: 'canvas-generate' })
    expect(typeof registered[0].cancelToken.interrupt).toBe('function')

    const interrupted = await registered[0].cancelToken.interrupt()
    expect(interrupted).toBe(true)
    expect(executionOptions.signal.aborted).toBe(true)
    expect(registered[0].cancelToken.cancelled).toBe(true)
  })

  test('routes ComfyUI providers to the local Comfy executor instead of the LLM runtime', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'local-comfy', display_name: 'Local Comfy', service_type: 'comfyui', api_format: 'comfyui', auth_type: 'none', default_base_url: 'http://provider-comfy', supported_modalities: ['text_to_image'], is_active: true },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 31, provider: 'local-comfy', description: 'GPU', is_active: true, base_url: 'http://key-comfy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    let llmCalled = false
    const comfyCalls: any[] = []
    registerGenerateRoutes(app as any, () => workspace, {
      execute: async () => {
        llmCalled = true
        return { content: 'wrong path', parsed: null } as any
      },
      comfyExecute: async options => {
        comfyCalls.push(options)
        return {
          prompt_id: 'comfy-1',
          output_files: [{ filename: 'render.png', path: '/tmp/render.png', media_url: '/api/assets/media/render.png', mime_type: 'image/png' }],
          history: {},
        }
      },
    })

    const res = await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 31,
        provider: 'local-comfy',
        model: 'comfyui-workflow',
        prompt: JSON.stringify({ '3': { inputs: { seed: 12 } } }),
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      success: true,
      content: '/api/assets/media/render.png',
      result: {
        content: '/api/assets/media/render.png',
        prompt_id: 'comfy-1',
      },
    })
    expect(llmCalled).toBe(false)
    expect(comfyCalls[0]).toMatchObject({
      workspace,
      baseUrl: 'http://key-comfy',
      workflow: { '3': { inputs: { seed: 12 } } },
    })
  })

  test('accepts ComfyUI workflow objects from params for SDK-style clients', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'local-comfy', display_name: 'Local Comfy', service_type: 'comfyui', api_format: 'comfyui', auth_type: 'none', default_base_url: 'http://provider-comfy', supported_modalities: ['text_to_image'], is_active: true },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 31, provider: 'local-comfy', description: 'GPU', is_active: true, base_url: 'http://key-comfy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const comfyCalls: any[] = []
    registerGenerateRoutes(app as any, () => workspace, {
      comfyExecute: async options => {
        comfyCalls.push(options)
        return { prompt_id: 'comfy-params-workflow', output_files: [], history: {} }
      },
    })

    const res = await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 31,
        provider: 'local-comfy',
        model: 'comfyui-workflow',
        params: {
          workflowJson: { '9': { inputs: { text: 'from params' } } },
        },
      },
    })

    expect(res.statusCode).toBe(200)
    expect(comfyCalls[0].workflow).toEqual({ '9': { inputs: { text: 'from params' } } })
  })

  test('appends RunningHub API keys to ComfyUI proxy base URLs like upstream', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'runninghub', display_name: 'RunningHub', service_type: 'comfyui', api_format: 'comfyui', auth_type: 'bearer', default_base_url: 'https://runninghub.example/proxy', supported_modalities: ['text_to_image'], is_active: true },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 34, provider: 'runninghub', key: 'rh-key', description: 'Cloud GPU', is_active: true, base_url: 'https://runninghub.example/proxy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const comfyCalls: any[] = []
    registerGenerateRoutes(app as any, () => workspace, {
      comfyExecute: async options => {
        comfyCalls.push(options)
        return { prompt_id: 'runninghub-1', output_files: [], history: {} }
      },
    })

    const res = await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 34,
        provider: 'runninghub',
        model: 'comfyui-workflow',
        prompt: JSON.stringify({ '3': { inputs: { seed: 12 } } }),
      },
    })

    expect(res.statusCode).toBe(200)
    expect(comfyCalls[0].baseUrl).toBe('https://runninghub.example/proxy/rh-key')
    expect(comfyCalls[0].headers.Authorization).toBeUndefined()
  })

  test('accepts camelCase RunningHub ComfyUI proxy fields from TS clients', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'runninghub', display_name: 'RunningHub', service_type: 'comfyui', api_format: 'comfyui', auth_type: 'bearer', default_base_url: 'https://provider-runninghub.example/proxy', supported_modalities: ['text_to_image'], is_active: true },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const comfyCalls: any[] = []
    registerGenerateRoutes(app as any, () => workspace, {
      comfyExecute: async options => {
        comfyCalls.push(options)
        return { prompt_id: 'runninghub-camel', output_files: [], history: {} }
      },
    })

    const res = await call(handlers.get('POST /api/generate'), {
      body: {
        provider: 'runninghub',
        model: 'comfyui-workflow',
        baseUrl: 'https://runninghub.example/proxy',
        runninghubApiKey: 'rh-camel',
        prompt: JSON.stringify({ '3': { inputs: { seed: 12 } } }),
      },
    })

    expect(res.statusCode).toBe(200)
    expect(comfyCalls[0].baseUrl).toBe('https://runninghub.example/proxy/rh-camel')
    expect(comfyCalls[0].headers.Authorization).toBeUndefined()
  })

  test('passes request-level ComfyUI API keys as auth headers for generic cloud gateways', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'cloud-comfy', display_name: 'Cloud Comfy', service_type: 'comfyui', api_format: 'comfyui', auth_type: 'bearer', default_base_url: 'https://cloud-comfy.example/api', supported_modalities: ['text_to_image'], is_active: true },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const comfyCalls: any[] = []
    registerGenerateRoutes(app as any, () => workspace, {
      comfyExecute: async options => {
        comfyCalls.push(options)
        return { prompt_id: 'cloud-comfy-1', output_files: [], history: {} }
      },
    })

    const res = await call(handlers.get('POST /api/generate'), {
      body: {
        provider: 'cloud-comfy',
        model: 'comfyui-workflow',
        api_key: 'cloud-secret',
        prompt: JSON.stringify({ '3': { inputs: { seed: 12 } } }),
      },
    })

    expect(res.statusCode).toBe(200)
    expect(comfyCalls[0].baseUrl).toBe('https://cloud-comfy.example/api')
    expect(comfyCalls[0].headers.Authorization).toBe('Bearer cloud-secret')
  })

  test('accepts camelCase apiKey for generic cloud ComfyUI gateways', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'cloud-comfy', display_name: 'Cloud Comfy', service_type: 'comfyui', api_format: 'comfyui', auth_type: 'bearer', default_base_url: 'https://cloud-comfy.example/api', supported_modalities: ['text_to_image'], is_active: true },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const comfyCalls: any[] = []
    registerGenerateRoutes(app as any, () => workspace, {
      comfyExecute: async options => {
        comfyCalls.push(options)
        return { prompt_id: 'cloud-comfy-camel', output_files: [], history: {} }
      },
    })

    const res = await call(handlers.get('POST /api/generate'), {
      body: {
        provider: 'cloud-comfy',
        model: 'comfyui-workflow',
        apiKey: 'cloud-camel-secret',
        prompt: JSON.stringify({ '3': { inputs: { seed: 12 } } }),
      },
    })

    expect(res.statusCode).toBe(200)
    expect(comfyCalls[0].baseUrl).toBe('https://cloud-comfy.example/api')
    expect(comfyCalls[0].headers.Authorization).toBe('Bearer cloud-camel-secret')
  })

  test('passes upstream LocalComfy input file mappings and input directory to workflow execution', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'local-comfy', display_name: 'Local Comfy', service_type: 'comfyui', api_format: 'comfyui', auth_type: 'none', default_base_url: 'http://provider-comfy', supported_modalities: ['text_to_image'], is_active: true },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 35, provider: 'local-comfy', description: 'GPU', is_active: true, base_url: 'http://key-comfy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const comfyCalls: any[] = []
    registerGenerateRoutes(app as any, () => workspace, {
      comfyExecute: async options => {
        comfyCalls.push(options)
        return { prompt_id: 'comfy-input-files', output_files: [], history: {} }
      },
    })

    const res = await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 35,
        provider: 'local-comfy',
        model: 'comfyui-workflow',
        prompt: JSON.stringify({ '3': { inputs: { image: 'placeholder.png' } } }),
        input_files: { image: 'assets/source.png' },
        comfy_input_dir: '/tmp/comfy-input',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(comfyCalls[0]).toMatchObject({
      inputFiles: { image: 'assets/source.png' },
      comfyInputDir: '/tmp/comfy-input',
    })
  })

  test('accepts camelCase inputFiles for LocalComfy input file mappings', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'local-comfy', display_name: 'Local Comfy', service_type: 'comfyui', api_format: 'comfyui', auth_type: 'none', default_base_url: 'http://provider-comfy', supported_modalities: ['text_to_image'], is_active: true },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 35, provider: 'local-comfy', description: 'GPU', is_active: true, base_url: 'http://key-comfy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const comfyCalls: any[] = []
    registerGenerateRoutes(app as any, () => workspace, {
      comfyExecute: async options => {
        comfyCalls.push(options)
        return { prompt_id: 'comfy-input-files-camel', output_files: [], history: {} }
      },
    })

    const res = await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 35,
        provider: 'local-comfy',
        model: 'comfyui-workflow',
        prompt: JSON.stringify({ '3': { inputs: { image: 'placeholder.png' } } }),
        inputFiles: { '3.inputs.image': 'assets/source.png' },
        comfyInputDir: '/tmp/comfy-input',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(comfyCalls[0]).toMatchObject({
      inputFiles: { '3.inputs.image': 'assets/source.png' },
      comfyInputDir: '/tmp/comfy-input',
    })
  })

  test('returns FastAPI-compatible detail field for synchronous generation errors', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'local-comfy', display_name: 'Local Comfy', service_type: 'comfyui', api_format: 'comfyui', auth_type: 'none', default_base_url: 'http://provider-comfy', supported_modalities: ['text_to_image'], is_active: true },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 36, provider: 'local-comfy', description: 'GPU', is_active: true, base_url: 'http://key-comfy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    registerGenerateRoutes(app as any, () => workspace, {
      execute: async () => ({
        content: '',
        error: 'provider failed',
        runtimeSelection: { provider: { id: 'any' }, model: { model_name: 'gpt-5.5' } },
      }) as any,
      comfyExecute: async () => {
        throw new Error('Comfy queue failed')
      },
    })

    const invalidComfy = await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 36,
        provider: 'local-comfy',
        model: 'comfyui-workflow',
        prompt: '{bad-json',
      },
    })
    expect(invalidComfy.statusCode).toBe(400)
    expect(invalidComfy.body).toEqual({
      error: 'Error: ComfyUI workflow must be valid JSON',
      detail: 'Error: ComfyUI workflow must be valid JSON',
    })

    const comfyFailure = await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 36,
        provider: 'local-comfy',
        model: 'comfyui-workflow',
        prompt: JSON.stringify({ '3': { inputs: { seed: 12 } } }),
      },
    })
    expect(comfyFailure.statusCode).toBe(500)
    expect(comfyFailure.body).toEqual({
      error: 'Error: Comfy queue failed',
      detail: 'Error: Comfy queue failed',
    })

    const llmFailure = await call(handlers.get('POST /api/generate'), {
      body: { model: 'gpt-5.5', prompt: '开始' },
    })
    expect(llmFailure.statusCode).toBe(500)
    expect(llmFailure.body).toMatchObject({
      error: 'provider failed',
      detail: 'provider failed',
      runtimeSelection: { provider: { id: 'any' }, model: { model_name: 'gpt-5.5' } },
    })
  })

  test('returns FastAPI-compatible detail field when synchronous LLM execution throws', async () => {
    const workspace = await tempWorkspace()
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    registerGenerateRoutes(app as any, () => workspace, {
      execute: async () => {
        throw new Error('runtime exploded')
      },
    })

    const response = await call(handlers.get('POST /api/generate'), {
      body: { model: 'gpt-5.5', prompt: '开始' },
    })

    expect(response.statusCode).toBe(500)
    expect(response.body).toEqual({
      error: 'Error: runtime exploded',
      detail: 'Error: runtime exploded',
    })
  })

  test('registers a physical ComfyUI interrupt hook for background workflow jobs', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'local-comfy', display_name: 'Local Comfy', service_type: 'comfyui', api_format: 'comfyui', auth_type: 'none', default_base_url: 'http://provider-comfy', supported_modalities: ['text_to_image'], is_active: true },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 32, provider: 'local-comfy', description: 'GPU', is_active: true, base_url: 'http://key-comfy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const registered: any[] = []
    const interrupted: any[] = []
    let releaseExecute: (() => void) | null = null
    registerGenerateRoutes(app as any, () => workspace, {
      comfyExecute: async () => {
        await new Promise<void>(resolve => { releaseExecute = resolve })
        return { prompt_id: 'comfy-2', output_files: [], history: {} }
      },
      comfyInterrupt: async options => {
        interrupted.push(options)
        return true
      },
      sendMessage: async () => true,
      registerTask: (clientId, adapterId, cancelToken) => registered.push({ clientId, adapterId, cancelToken }),
    })

    const res = await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 32,
        provider: 'local-comfy',
        model: 'comfyui-workflow',
        prompt: JSON.stringify({ '3': { inputs: { seed: 12 } } }),
        params: { client_id: 'comfy-node-1' },
      },
    })

    expect(res.body).toMatchObject({ success: true, client_id: 'comfy-node-1' })
    expect(registered[0]).toMatchObject({ clientId: 'comfy-node-1', adapterId: 'local-comfy' })
    expect(typeof registered[0].cancelToken.interrupt).toBe('function')

    const physicalOk = await registered[0].cancelToken.interrupt()
    expect(physicalOk).toBe(true)
    expect(interrupted[0]).toMatchObject({
      workspace,
      baseUrl: 'http://key-comfy',
      workflow: { '3': { inputs: { seed: 12 } } },
    })

    releaseExecute?.()
  })

  test('accepts params.clientId for background ComfyUI execution', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'local-comfy', display_name: 'Local Comfy', service_type: 'comfyui', api_format: 'comfyui', auth_type: 'none', default_base_url: 'http://provider-comfy', supported_modalities: ['text_to_image'], is_active: true },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 32, provider: 'local-comfy', description: 'GPU', is_active: true, base_url: 'http://key-comfy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const registered: any[] = []
    registerGenerateRoutes(app as any, () => workspace, {
      comfyExecute: async () => ({ prompt_id: 'comfy-camel', output_files: [], history: {} }),
      sendMessage: async () => true,
      registerTask: (clientId, adapterId, cancelToken) => registered.push({ clientId, adapterId, cancelToken }),
    })

    const res = await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 32,
        provider: 'local-comfy',
        model: 'comfyui-workflow',
        prompt: JSON.stringify({ '3': { inputs: { seed: 12 } } }),
        params: { clientId: 'comfy-node-camel' },
      },
    })

    expect(res.body).toMatchObject({ success: true, client_id: 'comfy-node-camel' })
    expect(registered[0]).toMatchObject({ clientId: 'comfy-node-camel', adapterId: 'local-comfy' })
  })

  test('passes an abort signal to background ComfyUI execution and aborts it from the interrupt hook', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'local-comfy', display_name: 'Local Comfy', service_type: 'comfyui', api_format: 'comfyui', auth_type: 'none', default_base_url: 'http://provider-comfy', supported_modalities: ['text_to_image'], is_active: true },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 35, provider: 'local-comfy', description: 'GPU', is_active: true, base_url: 'http://key-comfy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const registered: any[] = []
    let executeOptions: any = null
    registerGenerateRoutes(app as any, () => workspace, {
      comfyExecute: async options => {
        executeOptions = options
        await new Promise<void>(() => {})
        return { prompt_id: 'never', output_files: [], history: {} }
      },
      comfyInterrupt: async () => true,
      sendMessage: async () => true,
      registerTask: (clientId, adapterId, cancelToken) => registered.push({ clientId, adapterId, cancelToken }),
    })

    await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 35,
        provider: 'local-comfy',
        model: 'comfyui-workflow',
        prompt: JSON.stringify({ '3': { inputs: { seed: 12 } } }),
        params: { client_id: 'comfy-node-abort' },
      },
    })

    while (!executeOptions) await new Promise(resolve => setTimeout(resolve, 0))
    expect(executeOptions.abortSignal).toBeInstanceOf(AbortSignal)
    expect(executeOptions.abortSignal.aborted).toBe(false)
    expect(executeOptions.isCancelled()).toBe(false)

    const physicalOk = await registered[0].cancelToken.interrupt()
    expect(physicalOk).toBe(true)
    expect(executeOptions.abortSignal.aborted).toBe(true)
    expect(executeOptions.isCancelled()).toBe(true)
  })

  test('forwards ComfyUI executor progress updates through SSE status messages', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'local-comfy', display_name: 'Local Comfy', service_type: 'comfyui', api_format: 'comfyui', auth_type: 'none', default_base_url: 'http://provider-comfy', supported_modalities: ['text_to_image'], is_active: true },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 33, provider: 'local-comfy', description: 'GPU', is_active: true, base_url: 'http://key-comfy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const messages: any[] = []
    registerGenerateRoutes(app as any, () => workspace, {
      comfyExecute: async options => {
        await options.onStatus?.({ phase: 'polling', message: 'GPU 计算中... 5s', elapsed_ms: 5000 })
        return { prompt_id: 'comfy-progress', output_files: [], history: {} }
      },
      sendMessage: async (clientId, message) => {
        messages.push({ clientId, message })
        return true
      },
    })

    await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 33,
        provider: 'local-comfy',
        model: 'comfyui-workflow',
        prompt: JSON.stringify({ '3': { inputs: { seed: 12 } } }),
        params: { client_id: 'comfy-node-progress' },
      },
    })

    while (!messages.some(item => item.message.message === 'GPU 计算中... 5s')) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    expect(messages).toContainEqual(expect.objectContaining({
      clientId: 'comfy-node-progress',
      message: expect.objectContaining({
        type: 'status',
        phase: 'polling',
        message: 'GPU 计算中... 5s',
        elapsed_ms: 5000,
      }),
    }))
  })

  test('source uses the shared task message manager so upstream WebSocket clients receive generation results', () => {
    const source = readFileSync(join(import.meta.dir, 'generate.ts'), 'utf8')

    expect(source).toContain('taskMessageManager')
    expect(source).toContain('deps.sendMessage || ((clientId, message) => taskMessageManager.sendMessage(clientId, message))')
  })
})

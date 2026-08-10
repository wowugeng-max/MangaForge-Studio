import { afterEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generate-route-'))
  workspaces.push(workspace)
  return workspace
}

async function installWorkflowOnlyFixturePack(workspace: string) {
  const revision = 'c'.repeat(40)
  const root = join(workspace, '.mangaforge', 'skill-packs', 'MiniMax-H3', revision)
  const skillRoot = join(root, 'skills', 'brand-promo-video-generator')
  await mkdir(skillRoot, { recursive: true })
  await writeFile(join(root, 'pack.json'), JSON.stringify({
    id: 'MiniMax-H3', sourceUrl: 'https://github.com/MiniMax-AI/MiniMax-H3', owner: 'MiniMax-AI', repo: 'MiniMax-H3',
    revision, installedAt: '2026-08-09T00:00:00.000Z', status: 'installed',
  }))
  await writeFile(join(skillRoot, 'SKILL.md'), `---
name: brand-promo-video-generator
description: Generate a polished brand promotional video through a staged Hub workflow.
allowed-tools:
  - webfetch
  - hub_generate_video
  - hub_video_edit
  - task
---
# Brand Promo Video Generator

Run a multi-stage workflow with tools: verify brand facts, plan shots, generate video, edit, and review delivery.
`)
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

function compiledSkillResult(overrides: Record<string, any> = {}) {
  const skillName = overrides.skillName || 'prompt-optimizer'
  const revision = overrides.revision || 'rev-1'
  return {
    result: {
      skill_name: skillName,
      skill_version: revision,
      mode: overrides.mode || 'text_to_image',
      prompt: overrides.prompt || 'compiled prompt',
      negative_prompt: overrides.negativePrompt || '',
      parameters: {},
      references_used: overrides.references || [],
      warnings: overrides.warnings || [],
      ...(overrides.referenceBindings ? { reference_bindings: overrides.referenceBindings } : {}),
      ...(overrides.referenceModeHint ? { reference_mode_hint: overrides.referenceModeHint } : {}),
    },
    inputHash: overrides.inputHash || 'hash-1',
    cached: false,
    compilerModelId: overrides.compilerModelId || 99,
    skill: {
      name: skillName,
      packId: overrides.packId || 'builtin',
      revision,
      ...(overrides.sourceUrl ? { sourceUrl: overrides.sourceUrl } : {}),
    },
  }
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('canvas generate route', () => {
  test('rejects an explicitly selected workflow-only Hub Skill before compiler model, provider, or media task work', async () => {
    const workspace = await tempWorkspace()
    await installWorkflowOnlyFixturePack(workspace)
    const { createSkillRegistry } = await import('../skills/registry')
    const { createPromptCompiler } = await import('../skills/compiler')
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    let modelReads = 0
    let compilerModelCalls = 0
    let providerCalls = 0
    let comfyCalls = 0
    let taskCalls = 0
    const compiler = createPromptCompiler({
      registry: createSkillRegistry(workspace),
      readModels: async () => { modelReads += 1; return [] },
      executeWithRuntimeModel: async () => { compilerModelCalls += 1; return { content: '{}' } as any },
    })
    registerGenerateRoutes(app as any, () => workspace, {
      compilePromptSkill: compiler,
      execute: async () => { providerCalls += 1; return { content: 'unexpected' } as any },
      comfyExecute: async () => { comfyCalls += 1; return { prompt_id: 'unexpected', output_files: [], history: {} } },
      registerTask: () => { taskCalls += 1 },
    })

    const response = await call(handlers.get('POST /api/generate'), {
      body: {
        model: 'video-provider',
        type: 'text_to_video',
        prompt: 'Create a launch reel from verified brand assets.',
        skill_name: 'brand-promo-video-generator',
        skill_pack_id: 'MiniMax-H3',
        params: { client_id: 'workflow-only-generate-node' },
      },
    })

    expect(response.statusCode).toBe(422)
    expect(response.body).toMatchObject({ error_code: 'SKILL_MODE_INCOMPATIBLE' })
    expect(String(response.body.detail)).toContain('not prompt-ready')
    expect(modelReads).toBe(0)
    expect(compilerModelCalls).toBe(0)
    expect(providerCalls).toBe(0)
    expect(comfyCalls).toBe(0)
    expect(taskCalls).toBe(0)
  })

  test('builds the exact legacy runtime LLM request shape when no Skill is selected', async () => {
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

    expect(request).toEqual({
      model: 'gpt-5.5',
      type: 'text_to_video',
      messages: [
        { role: 'system', content: '你是分镜大师' },
        { role: 'user', content: '画一个镜头' },
      ],
      temperature: 0.72,
      max_tokens: 2048,
      stream: false,
      response_mode: 'auto',
      response_format: { type: 'text' },
    })
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
    expect(request.reference_images).toBeUndefined()
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
      reference_images: [
        { url: '/duplicate-a.png', reference_index: 1 },
        { url: '/duplicate-b.png', reference_index: 2 },
      ],
    }) as any

    expect(request.image_url).toBe('/api/assets/media/assets%2Fsource-a.png')
    expect(request.reference_images).toEqual([
      {
        url: '/api/assets/media/assets%2Fsource-a.png',
        reference_index: 1,
        reference_id: 'reference-1',
        reference_role: 'general',
        source_asset_ids: [101],
      },
      {
        url: 'https://cdn.example/source-b.png',
        reference_index: 2,
        reference_id: 'reference-2',
        reference_role: 'general',
        source_asset_ids: [102],
      },
    ])
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

  test('preserves duplicate image bindings with the same URL in canonical message order', async () => {
    const { buildCanvasGenerateLLMRequest } = await import('./generate')

    const request = buildCanvasGenerateLLMRequest({
      model: 'video-model',
      type: 'image_to_video',
      prompt: 'animate repeated source',
      params: {
        incoming_assets: [
          { type: 'image', url: '/same.png', reference_id: 'first', reference_role: 'first_frame' },
          { type: 'image', url: '/same.png', reference_id: 'character', reference_role: 'character' },
        ],
      },
    }) as any

    expect(request.reference_images).toEqual([
      { url: '/same.png', reference_index: 1, reference_id: 'first', reference_role: 'first_frame' },
      { url: '/same.png', reference_index: 2, reference_id: 'character', reference_role: 'character' },
    ])
    expect(request.messages.at(-1)?.content).toEqual([
      { type: 'text', text: 'animate repeated source' },
      { type: 'image_url', image_url: { url: '/same.png' } },
      { type: 'image_url', image_url: { url: '/same.png' } },
    ])
  })

  test('rebuilds existing user image parts from the authoritative canonical bindings', async () => {
    const { buildCanvasGenerateLLMRequest } = await import('./generate')

    const request = buildCanvasGenerateLLMRequest({
      model: 'video-model',
      type: 'image_to_video',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'existing prompt' },
          { type: 'image_url', image_url: { url: '/b.png' } },
          { type: 'input_file', file_id: 'notes-file' },
          { type: 'image_url', image_url: { url: '/a.png' } },
          { type: 'image_url', image_url: { url: '/b.png' } },
        ],
      }],
      params: {
        incoming_assets: [
          { type: 'image', url: '/a.png', reference_id: 'a-1', reference_role: 'first_frame' },
          { type: 'image', url: '/b.png', reference_id: 'b', reference_role: 'last_frame' },
          { type: 'image', url: '/a.png', reference_id: 'a-2', reference_role: 'character' },
        ],
      },
    }) as any

    expect(request.messages.at(-1)?.content).toEqual([
      { type: 'text', text: 'existing prompt' },
      { type: 'input_file', file_id: 'notes-file' },
      { type: 'image_url', image_url: { url: '/a.png' } },
      { type: 'image_url', image_url: { url: '/b.png' } },
      { type: 'image_url', image_url: { url: '/a.png' } },
    ])
  })

  test('keeps legacy message images without a collection and preserves unrelated images for prompt-only assets', async () => {
    const { buildCanvasGenerateLLMRequest } = await import('./generate')
    const legacyMessages = [{
      role: 'user',
      content: [
        { type: 'text', text: 'legacy prompt' },
        { type: 'image_url', image_url: { url: '/legacy.png' } },
      ],
    }]

    const legacyRequest = buildCanvasGenerateLLMRequest({ model: 'vision-model', type: 'vision', messages: legacyMessages }) as any
    const promptOnlyRequest = buildCanvasGenerateLLMRequest({
      model: 'vision-model',
      type: 'vision',
      messages: legacyMessages,
      params: {
        incoming_assets: [{ type: 'prompt', content: 'keep the original framing', reference_role: 'prompt_context' }],
      },
    }) as any

    expect(legacyRequest.messages).toEqual(legacyMessages)
    expect(legacyRequest.reference_images).toBeUndefined()
    expect(promptOnlyRequest.messages.at(-1)?.content).toEqual([
      { type: 'text', text: 'legacy prompt\n\n[连线素材]:\nkeep the original framing' },
      { type: 'image_url', image_url: { url: '/legacy.png' } },
    ])
  })

  test('preserves file-only structured user messages when canonical image references are appended', async () => {
    const { buildCanvasGenerateLLMRequest } = await import('./generate')

    const request = buildCanvasGenerateLLMRequest({
      model: 'video-model',
      type: 'image_to_video',
      messages: [{ role: 'user', content: [{ type: 'input_file', file_id: 'file-notes' }] }],
      params: {
        incoming_assets: [{ type: 'image', url: '/frame.png', reference_role: 'first_frame' }],
      },
    }) as any

    expect(request.messages).toEqual([{
      role: 'user',
      content: [
        { type: 'text', text: '描述这些参考素材' },
        { type: 'input_file', file_id: 'file-notes' },
        { type: 'image_url', image_url: { url: '/frame.png' } },
      ],
    }])
  })

  test('preserves file-only structured user messages with prompt-only references and filters truly empty messages', async () => {
    const { buildCanvasGenerateLLMRequest } = await import('./generate')

    const promptOnlyRequest = buildCanvasGenerateLLMRequest({
      model: 'vision-model',
      type: 'vision',
      messages: [{ role: 'user', content: [{ type: 'input_file', file_url: '/notes.txt' }] }],
      params: {
        incoming_assets: [{ type: 'prompt', content: 'keep the uploaded notes in context', reference_role: 'prompt_context' }],
      },
    }) as any
    const emptyRequest = buildCanvasGenerateLLMRequest({
      model: 'vision-model',
      type: 'vision',
      messages: [
        { role: 'user', content: [] },
        { role: 'user', content: [null, {}, { type: 'input_file' }] },
        { role: 'user', content: '' },
      ],
    }) as any

    expect(promptOnlyRequest.messages).toEqual([{
      role: 'user',
      content: [
        { type: 'text', text: '[连线素材]:\nkeep the uploaded notes in context' },
        { type: 'input_file', file_url: '/notes.txt' },
      ],
    }])
    expect(emptyRequest.messages).toEqual([])
  })

  test('uses reference bindings and reference images as ordered fallbacks when incoming assets are absent', async () => {
    const { buildCanvasGenerateLLMRequest } = await import('./generate')

    const fromBindings = buildCanvasGenerateLLMRequest({
      model: 'vision-model',
      type: 'image_to_video',
      prompt: '组合参考',
      referenceBindings: [
        { type: 'image', url: '/api/assets/media/a.png', referenceIndex: 1, referenceId: 'a', referenceRole: 'first_frame', sourceAssetIds: [11] },
        { type: 'prompt', content: '保持角色服装一致', referenceIndex: 2, referenceId: 'context', referenceRole: 'prompt_context', sourceAssetIds: [12] },
      ],
    }) as any
    const fromImages = buildCanvasGenerateLLMRequest({
      model: 'vision-model',
      type: 'image_to_video',
      prompt: '组合参考',
      reference_images: [
        { url: '/api/assets/media/a.png', reference_index: 1, reference_id: 'a', reference_role: 'first_frame', source_asset_ids: [11] },
        { url: '/api/assets/media/b.png', reference_index: 2, reference_id: 'b', reference_role: 'last_frame', source_asset_ids: [12] },
      ],
    }) as any

    expect(fromBindings.reference_images).toEqual([
      { url: '/api/assets/media/a.png', reference_index: 1, reference_id: 'a', reference_role: 'first_frame', source_asset_ids: [11] },
    ])
    expect(fromBindings.source_asset_ids).toEqual([11, 12])
    expect(fromBindings.messages[0].content).toEqual([
      { type: 'text', text: '组合参考\n\n[连线素材]:\n保持角色服装一致' },
      { type: 'image_url', image_url: { url: '/api/assets/media/a.png' } },
    ])
    expect(fromImages.reference_images).toEqual([
      { url: '/api/assets/media/a.png', reference_index: 1, reference_id: 'a', reference_role: 'first_frame', source_asset_ids: [11] },
      { url: '/api/assets/media/b.png', reference_index: 2, reference_id: 'b', reference_role: 'last_frame', source_asset_ids: [12] },
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

  test('compiles an explicit canvas Skill before provider execution and returns audit metadata', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      { id: 12, api_key_id: 5, provider: 'any', display_name: 'GPT', model_name: 'gpt-5.5', health_status: 'healthy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const events: string[] = []
    let executedRequest: any
    registerGenerateRoutes(app as any, () => workspace, {
      compilePromptSkill: async input => {
        events.push('compile')
        expect(input).toMatchObject({
          skillName: 'prompt-optimizer',
          packId: 'builtin',
          rawPrompt: '原始可编辑提示词',
          mode: 'text_to_image',
          nodeParams: { size: '1024*1024' },
          arguments: { style: 'cinematic' },
          activeWorkspace: workspace,
        })
        return {
          result: {
            skill_name: 'prompt-optimizer',
            skill_version: 'rev-1',
            mode: 'text_to_image',
            prompt: 'compiled prompt',
            negative_prompt: 'bad anatomy',
            parameters: {},
            references_used: ['references/base.txt'],
            warnings: ['warning'],
          },
          inputHash: 'hash-1',
          cached: false,
          compilerModelId: 99,
          skill: {
            name: 'prompt-optimizer',
            packId: 'builtin',
            revision: 'rev-1',
            sourceUrl: 'https://github.com/mangaforge/builtin-skills',
          },
        }
      },
      execute: async (_workspace, request) => {
        events.push('execute')
        executedRequest = request
        return { content: 'image-result', finish_reason: 'stop', parsed: null } as any
      },
    })

    const res = await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 5,
        model: 'gpt-5.5',
        type: 'text_to_image',
        prompt: '原始可编辑提示词',
        skill_name: 'prompt-optimizer',
        skill_pack_id: 'builtin',
        skill_arguments: { style: 'cinematic' },
        params: { size: '1024*1024', incoming_assets: [{ id: 101, type: 'image', url: 'https://cdn.example/ref.png' }] },
      },
    })

    expect(events).toEqual(['compile', 'execute'])
    expect(executedRequest.prompt).toBe('compiled prompt')
    expect(executedRequest.negative_prompt).toBe('bad anatomy')
    expect(executedRequest.messages).toEqual([{
      role: 'user',
      content: [
        { type: 'text', text: 'compiled prompt' },
        { type: 'image_url', image_url: { url: 'https://cdn.example/ref.png' } },
      ],
    }])
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      skill_name: 'prompt-optimizer',
      skill_pack_id: 'builtin',
      skill_pack_source: 'https://github.com/mangaforge/builtin-skills',
      skill_revision: 'rev-1',
      compiled_prompt: 'compiled prompt',
      compiled_negative_prompt: 'bad anatomy',
      compiled_references: ['references/base.txt'],
      compiled_input_hash: 'hash-1',
      warnings: ['warning'],
      compiler_model_id: 99,
      raw_prompt: '原始可编辑提示词',
      source_asset_ids: [101],
      result: {
        skill_name: 'prompt-optimizer',
        skill_pack_id: 'builtin',
        skill_pack_source: 'https://github.com/mangaforge/builtin-skills',
        skill_revision: 'rev-1',
        compiled_prompt: 'compiled prompt',
        compiled_negative_prompt: 'bad anatomy',
        compiled_references: ['references/base.txt'],
        compiled_input_hash: 'hash-1',
        warnings: ['warning'],
        compiler_model_id: 99,
        raw_prompt: '原始可编辑提示词',
        source_asset_ids: [101],
      },
    })
  })

  test('preserves ordered canonical reference images through Skill compilation, provider execution, audit, and lineage', async () => {
    const workspace = await tempWorkspace()
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    let compileInput: any
    let executeRequest: any
    registerGenerateRoutes(app as any, () => workspace, {
      compilePromptSkill: async input => {
        compileInput = input
        return compiledSkillResult({
          skillName: 'h3-prompt-writing',
          mode: 'image_to_video',
          prompt: 'compiled multi-reference prompt',
          references: ['references/video.md'],
          referenceBindings: input.incomingAssets,
          referenceModeHint: 'FL2VA',
        }) as any
      },
      execute: async (_workspace, request) => {
        executeRequest = request
        return { content: 'video-result', finish_reason: 'stop', parsed: null } as any
      },
    })

    const incomingAssets = [
      {
        id: 41,
        type: 'image',
        url: '/ref-a.png',
        referenceIndex: 1,
        referenceId: 'opening-frame',
        referenceRole: 'first_frame',
        sourceAssetIds: [401, 41, -1, 401],
      },
      {
        id: 42,
        type: 'image',
        url: '/ref-b.png',
        reference_index: 2,
        reference_id: 'closing-frame',
        reference_role: 'last_frame',
        source_asset_ids: [402, 42, 0, 402],
      },
    ]
    const res = await call(handlers.get('POST /api/generate'), {
      body: {
        model: 'video-model',
        type: 'image_to_video',
        prompt: 'animate both frames',
        skill_name: 'h3-prompt-writing',
        params: { incoming_assets: incomingAssets },
        reference_images: incomingAssets.map(item => ({ ...item, type: undefined })),
      },
    })

    expect(compileInput.incomingAssets).toEqual([
      {
        type: 'image',
        url: '/ref-a.png',
        reference_index: 1,
        reference_id: 'opening-frame',
        reference_role: 'first_frame',
        source_asset_ids: [41, 401],
      },
      {
        type: 'image',
        url: '/ref-b.png',
        reference_index: 2,
        reference_id: 'closing-frame',
        reference_role: 'last_frame',
        source_asset_ids: [42, 402],
      },
    ])
    expect(executeRequest.image_url).toBe('/ref-a.png')
    expect(executeRequest.reference_images).toEqual([
      {
        url: '/ref-a.png',
        reference_index: 1,
        reference_id: 'opening-frame',
        reference_role: 'first_frame',
        source_asset_ids: [41, 401],
      },
      {
        url: '/ref-b.png',
        reference_index: 2,
        reference_id: 'closing-frame',
        reference_role: 'last_frame',
        source_asset_ids: [42, 402],
      },
    ])
    expect(executeRequest.messages.at(-1)?.content).toEqual([
      { type: 'text', text: 'compiled multi-reference prompt' },
      { type: 'image_url', image_url: { url: '/ref-a.png' } },
      { type: 'image_url', image_url: { url: '/ref-b.png' } },
    ])
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      source_asset_ids: [41, 401, 42, 402],
      reference_bindings: compileInput.incomingAssets,
      reference_mode_hint: 'FL2VA',
      result: {
        source_asset_ids: [41, 401, 42, 402],
        reference_bindings: compileInput.incomingAssets,
        reference_mode_hint: 'FL2VA',
      },
    })
  })

  test('rejects invalid reference collections before compiler, provider, Comfy, or task work', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), '{invalid-provider-json')
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    let compileCalls = 0
    let executeCalls = 0
    let comfyCalls = 0
    let taskCalls = 0
    registerGenerateRoutes(app as any, () => workspace, {
      compilePromptSkill: async () => {
        compileCalls += 1
        return compiledSkillResult({ skillName: 'h3-prompt-writing', mode: 'image_to_video' }) as any
      },
      execute: async () => { executeCalls += 1; return { content: 'unexpected' } as any },
      comfyExecute: async () => { comfyCalls += 1; return { prompt_id: 'unexpected', output_files: [], history: {} } },
      registerTask: () => { taskCalls += 1 },
    })

    const invalidCases = [
      {
        expectedCode: 'REFERENCE_LIMIT_EXCEEDED',
        assets: Array.from({ length: 10 }, (_, index) => ({ type: 'image', url: `/ref-${index + 1}.png` })),
      },
      { expectedCode: 'REFERENCE_MEDIA_UNSUPPORTED', assets: [{ type: 'video', url: '/clip.mp4' }] },
      { expectedCode: 'REFERENCE_MEDIA_UNSUPPORTED', assets: [{ type: 'audio', url: '/voice.wav' }] },
      { expectedCode: 'REFERENCE_LINEAGE_INVALID', assets: [{ type: 'image', url: '/ref.png', source_asset_ids: 'not-an-array' }] },
    ]

    for (const invalidCase of invalidCases) {
      const res = await call(handlers.get('POST /api/generate'), {
        body: {
          provider: 'local-comfy',
          model: 'comfyui-workflow',
          type: 'image_to_video',
          prompt: 'animate references',
          skill_name: 'h3-prompt-writing',
          workflow_json: { '3': { inputs: { text: 'editable' } } },
          params: { client_id: `invalid-${invalidCase.expectedCode}`, incoming_assets: invalidCase.assets },
        },
      })
      expect(res.statusCode).toBe(422)
      expect(res.body).toMatchObject({ error_code: invalidCase.expectedCode })
    }
    expect(compileCalls).toBe(0)
    expect(executeCalls).toBe(0)
    expect(comfyCalls).toBe(0)
    expect(taskCalls).toBe(0)
  })

  test('detects final-user Skill commands in messages-only payloads and lets them override dropdowns', async () => {
    const workspace = await tempWorkspace()
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const compileInputs: any[] = []
    registerGenerateRoutes(app as any, () => workspace, {
      compilePromptSkill: async input => {
        compileInputs.push(input)
        return compiledSkillResult({ skillName: input.skillName, packId: input.packId, mode: input.mode }) as any
      },
      execute: async () => ({ content: 'ok', finish_reason: 'stop', parsed: null } as any),
    })

    const messagesOnly = await call(handlers.get('POST /api/generate'), {
      body: {
        model: 'gpt-5.5',
        type: 'text_to_image',
        messages: [
          { role: 'system', content: 'system' },
          { role: 'user', content: '/message-pack:message-skill draw from messages only' },
        ],
      },
    })
    const dropdownOverride = await call(handlers.get('POST /api/generate'), {
      body: {
        model: 'gpt-5.5',
        type: 'text_to_video',
        messages: [{ role: 'user', content: '/command-pack:command-skill orbit around the hero' }],
        skill_name: 'dropdown-skill',
        skill_pack_id: 'dropdown-pack',
      },
    })

    expect(messagesOnly.statusCode).toBe(200)
    expect(dropdownOverride.statusCode).toBe(200)
    expect(compileInputs).toHaveLength(2)
    expect(compileInputs[0]).toMatchObject({
      skillName: 'message-skill',
      packId: 'message-pack',
      rawPrompt: '/message-pack:message-skill draw from messages only',
    })
    expect(compileInputs[1]).toMatchObject({
      skillName: 'command-skill',
      packId: 'command-pack',
      rawPrompt: '/command-pack:command-skill orbit around the hero',
    })
  })

  test('short-circuits unsupported route modes and compiler-reported media incompatibility before provider work', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), '{invalid-provider-json')
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    let compileCalls = 0
    let executeCalls = 0
    let comfyCalls = 0
    let taskCalls = 0
    registerGenerateRoutes(app as any, () => workspace, {
      compilePromptSkill: async () => {
        compileCalls += 1
        const error = new Error('Skill is not compatible with text_to_image')
        ;(error as any).code = 'SKILL_MODE_INCOMPATIBLE'
        throw error
      },
      execute: async () => { executeCalls += 1; return { content: 'unexpected' } as any },
      comfyExecute: async () => { comfyCalls += 1; return { prompt_id: 'unexpected', output_files: [], history: {} } },
      registerTask: () => { taskCalls += 1 },
    })

    for (const mode of ['chat', 'vision']) {
      const res = await call(handlers.get('POST /api/generate'), {
        body: {
          provider: 'local-comfy',
          model: 'comfyui-workflow',
          type: mode,
          workflow_json: { '3': { inputs: { text: 'editable' } } },
          skill_prompt: '/builtin:prompt-optimizer draw a hero',
        },
      })
      expect(res.statusCode).toBe(422)
      expect(res.body.error_code).toBe('SKILL_MODE_INCOMPATIBLE')
    }
    const incompatible = await call(handlers.get('POST /api/generate'), {
      body: {
        provider: 'broken-provider',
        model: 'gpt-5.5',
        type: 'text_to_image',
        prompt: '/builtin:video-only draw a hero',
      },
    })

    expect(incompatible.statusCode).toBe(422)
    expect(incompatible.body.error_code).toBe('SKILL_MODE_INCOMPATIBLE')
    expect(compileCalls).toBe(1)
    expect(executeCalls).toBe(0)
    expect(comfyCalls).toBe(0)
    expect(taskCalls).toBe(0)
  })

  test('preserves Skill-enabled SSE result, error, cancellation, and task cleanup behavior', async () => {
    const workspace = await tempWorkspace()
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    const messages: any[] = []
    const registered: any[] = []
    const unregistered: string[] = []
    let executeCalls = 0
    let cancelExecutionStarted = false
    registerGenerateRoutes(app as any, () => workspace, {
      compilePromptSkill: async () => compiledSkillResult({
        sourceUrl: 'https://github.com/acme/prompt-pack',
        referenceBindings: [{
          type: 'image', url: '/audit-ref.png', reference_index: 1, reference_id: 'audit-ref', reference_role: 'general', source_asset_ids: [77],
        }],
        referenceModeHint: 'Ref2VA',
      }) as any,
      execute: async (_activeWorkspace, _request, _preferredModelId, options) => {
        executeCalls += 1
        if (executeCalls === 1) return { content: 'async image', finish_reason: 'stop', parsed: null } as any
        if (executeCalls === 2) return { content: '', error: 'provider failed after compilation' } as any
        cancelExecutionStarted = true
        await new Promise<void>((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
        })
        return { content: 'unexpected' } as any
      },
      sendMessage: async (clientId, message) => {
        messages.push({ clientId, message })
        return true
      },
      registerTask: (clientId, adapterId, cancelToken) => registered.push({ clientId, adapterId, cancelToken }),
      unregisterTask: clientId => unregistered.push(clientId),
    })

    const res = await call(handlers.get('POST /api/generate'), {
      body: {
        model: 'gpt-5.5',
        type: 'text_to_image',
        prompt: '/builtin:prompt-optimizer draw',
        params: { client_id: 'skill-sse-result' },
      },
    })

    expect(res.body).toMatchObject({ success: true, client_id: 'skill-sse-result' })
    expect(registered[0]).toMatchObject({ clientId: 'skill-sse-result', adapterId: 'canvas-generate' })
    while (!messages.some(item => item.message.type === 'done')) await new Promise(resolve => setTimeout(resolve, 0))
    expect(messages.find(item => item.message.type === 'result')).toMatchObject({
      clientId: 'skill-sse-result',
      message: {
        type: 'result',
        data: {
          content: 'async image',
          skill_name: 'prompt-optimizer',
          skill_pack_id: 'builtin',
          skill_pack_source: 'https://github.com/acme/prompt-pack',
          reference_bindings: [{
            type: 'image', url: '/audit-ref.png', reference_index: 1, reference_id: 'audit-ref', reference_role: 'general', source_asset_ids: [77],
          }],
          reference_mode_hint: 'Ref2VA',
          result: {
            skill_pack_id: 'builtin',
            skill_pack_source: 'https://github.com/acme/prompt-pack',
            reference_bindings: [{
              type: 'image', url: '/audit-ref.png', reference_index: 1, reference_id: 'audit-ref', reference_role: 'general', source_asset_ids: [77],
            }],
            reference_mode_hint: 'Ref2VA',
          },
        },
      },
    })
    while (!unregistered.length) await new Promise(resolve => setTimeout(resolve, 0))

    await call(handlers.get('POST /api/generate'), {
      body: {
        model: 'gpt-5.5', type: 'text_to_image', prompt: '/builtin:prompt-optimizer draw',
        params: { client_id: 'skill-sse-error' },
      },
    })

    expect(registered[1]).toMatchObject({ clientId: 'skill-sse-error', adapterId: 'canvas-generate' })
    while (!messages.some(item => item.clientId === 'skill-sse-error' && item.message.type === 'error')) await new Promise(resolve => setTimeout(resolve, 0))
    expect(messages.find(item => item.clientId === 'skill-sse-error' && item.message.type === 'error')).toMatchObject({
      clientId: 'skill-sse-error',
      message: { type: 'error', message: 'provider failed after compilation' },
    })
    while (!unregistered.includes('skill-sse-error')) await new Promise(resolve => setTimeout(resolve, 0))

    await call(handlers.get('POST /api/generate'), {
      body: {
        model: 'gpt-5.5', type: 'text_to_image', prompt: '/builtin:prompt-optimizer draw',
        params: { client_id: 'skill-sse-cancel' },
      },
    })

    while (!cancelExecutionStarted) await new Promise(resolve => setTimeout(resolve, 0))
    expect(registered[2]).toMatchObject({ clientId: 'skill-sse-cancel', adapterId: 'canvas-generate' })
    await registered[2].cancelToken.interrupt()
    while (!unregistered.includes('skill-sse-cancel')) await new Promise(resolve => setTimeout(resolve, 0))
    expect(messages.filter(item => item.clientId === 'skill-sse-cancel').map(item => item.message.type)).toEqual(['status'])
    expect(unregistered).toEqual(['skill-sse-result', 'skill-sse-error', 'skill-sse-cancel'])
  })

  test('short-circuits provider and task creation when Skill compilation fails', async () => {
    const workspace = await tempWorkspace()
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    let executeCalls = 0
    let taskCalls = 0
    registerGenerateRoutes(app as any, () => workspace, {
      compilePromptSkill: async () => {
        const error = new Error('compiler model required')
        ;(error as any).code = 'SKILL_COMPILER_MODEL_REQUIRED'
        throw error
      },
      execute: async () => { executeCalls += 1; return { content: 'should-not-run' } as any },
      registerTask: () => { taskCalls += 1 },
    })

    const res = await call(handlers.get('POST /api/generate'), {
      body: {
        model: 'gpt-5.5', type: 'text_to_image', prompt: '原始提示', skill_name: 'prompt-optimizer',
        params: { client_id: 'skill-failure-node' },
      },
    })

    expect(res.statusCode).toBe(422)
    expect(res.body).toEqual({
      error: 'compiler model required', detail: 'compiler model required', error_code: 'SKILL_COMPILER_MODEL_REQUIRED',
    })
    expect(executeCalls).toBe(0)
    expect(taskCalls).toBe(0)
  })

  test('rejects duplicate leading Skill commands with 409 before compilation', async () => {
    const workspace = await tempWorkspace()
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    let compileCalls = 0
    registerGenerateRoutes(app as any, () => workspace, {
      compilePromptSkill: async () => { compileCalls += 1; throw new Error('unexpected') },
    })

    const res = await call(handlers.get('POST /api/generate'), {
      body: { model: 'gpt-5.5', type: 'text_to_image', prompt: '/first /second' },
    })

    expect(res.statusCode).toBe(409)
    expect(res.body.error_code).toBe('SKILL_COMMAND_DUPLICATE')
    expect(compileCalls).toBe(0)
  })

  test('requires explicit ComfyUI Skill mappings and injects compiled prompt without guessing nodes', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      { id: 'local-comfy', display_name: 'Local Comfy', service_type: 'comfyui', api_format: 'comfyui', auth_type: 'none', default_base_url: 'http://provider-comfy', supported_modalities: ['text_to_image'], is_active: true },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 31, provider: 'local-comfy', description: 'GPU', is_active: true, base_url: 'http://key-comfy' },
    ]))
    const { registerGenerateRoutes } = await import('./generate')
    const { app, handlers } = createRouteHarness()
    let comfyCalls = 0
    const compilePromptSkill = async () => ({
      result: {
        skill_name: 'prompt-optimizer', skill_version: 'rev-1', mode: 'text_to_image' as const,
        prompt: 'compiled', negative_prompt: 'avoid blur', parameters: {}, references_used: [], warnings: [],
      }, inputHash: 'hash-comfy', cached: false, compilerModelId: 8,
      skill: { name: 'prompt-optimizer', packId: 'builtin', revision: 'rev-1' },
    })
    registerGenerateRoutes(app as any, () => workspace, {
      compilePromptSkill,
      comfyExecute: async options => {
        comfyCalls += 1
        expect(options.workflow['3'].inputs.text).toBe('compiled')
        expect(options.workflow['3'].inputs.negative).toBe('avoid blur')
        return { prompt_id: 'comfy-skill', output_files: [], history: {} }
      },
    })

    const workflow = { '3': { inputs: { text: 'editable', negative: 'editable negative', seed: 1 } } }
    const missingMapping = await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 31, provider: 'local-comfy', model: 'comfyui-workflow', type: 'text_to_image',
        prompt: JSON.stringify(workflow), skill_prompt: 'draw a hero', skill_name: 'prompt-optimizer',
      },
    })
    expect(missingMapping.statusCode).toBe(422)
    expect(missingMapping.body.error_code).toBe('SKILL_COMFY_MAPPING_REQUIRED')
    expect(comfyCalls).toBe(0)

    const unsafeMapping = await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 31, provider: 'local-comfy', model: 'comfyui-workflow', type: 'text_to_image',
        prompt: JSON.stringify(workflow), skill_prompt: 'draw a hero', skill_name: 'prompt-optimizer',
        skill_comfy_mapping: { compiled_prompt: '__proto__.toString' },
      },
    })
    expect(unsafeMapping.statusCode).toBe(422)
    expect(unsafeMapping.body.error_code).toBe('SKILL_COMFY_MAPPING_REQUIRED')
    expect(comfyCalls).toBe(0)

    const missingNegativeMapping = await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 31, provider: 'local-comfy', model: 'comfyui-workflow', type: 'text_to_image',
        prompt: JSON.stringify(workflow), skill_prompt: 'draw a hero', skill_name: 'prompt-optimizer',
        skill_comfy_mapping: { compiled_prompt: '3.inputs.text' },
      },
    })
    expect(missingNegativeMapping.statusCode).toBe(422)
    expect(missingNegativeMapping.body.error_code).toBe('SKILL_COMFY_MAPPING_REQUIRED')
    expect(comfyCalls).toBe(0)

    for (const unsafePart of ['__proto__', 'prototype', 'constructor']) {
      const unsafeNegativeMapping = await call(handlers.get('POST /api/generate'), {
        body: {
          api_key_id: 31, provider: 'local-comfy', model: 'comfyui-workflow', type: 'text_to_image',
          prompt: JSON.stringify(workflow), skill_prompt: 'draw a hero', skill_name: 'prompt-optimizer',
          skill_comfy_mapping: {
            compiled_prompt: '3.inputs.text',
            compiled_negative_prompt: `3.inputs.${unsafePart}`,
          },
        },
      })
      expect(unsafeNegativeMapping.statusCode).toBe(422)
      expect(unsafeNegativeMapping.body.error_code).toBe('SKILL_COMFY_MAPPING_REQUIRED')
      expect(comfyCalls).toBe(0)
    }

    const mapped = await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 31, provider: 'local-comfy', model: 'comfyui-workflow', type: 'text_to_image',
        prompt: workflow, skill_prompt: 'draw a hero', skill_name: 'prompt-optimizer',
        skill_comfy_mapping: {
          compiled_prompt: '3.inputs.text',
          compiled_negative_prompt: '3.inputs.negative',
        },
      },
    })
    expect(mapped.statusCode).toBe(200)
    expect(mapped.body).toMatchObject({ skill_name: 'prompt-optimizer', compiled_prompt: 'compiled' })
    expect(comfyCalls).toBe(1)
    expect(workflow['3'].inputs.text).toBe('editable')
    expect(workflow['3'].inputs.negative).toBe('editable negative')

    const providerDetectedMissing = await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 31,
        provider: 'local-comfy',
        model: 'custom-workflow-model',
        type: 'text_to_image',
        prompt: JSON.stringify(workflow),
        skill_prompt: 'draw a hero',
        skill_name: 'prompt-optimizer',
      },
    })
    expect(providerDetectedMissing.statusCode).toBe(422)
    expect(providerDetectedMissing.body.error_code).toBe('SKILL_COMFY_MAPPING_REQUIRED')
    expect(comfyCalls).toBe(1)

    const providerDetectedMapped = await call(handlers.get('POST /api/generate'), {
      body: {
        api_key_id: 31,
        provider: 'local-comfy',
        model: 'custom-workflow-model',
        type: 'text_to_image',
        prompt: JSON.stringify(workflow),
        skill_prompt: 'draw a hero',
        skill_name: 'prompt-optimizer',
        skill_comfy_mapping: {
          compiled_prompt: '3.inputs.text',
          compiled_negative_prompt: '3.inputs.negative',
        },
      },
    })
    expect(providerDetectedMapped.statusCode).toBe(200)
    expect(comfyCalls).toBe(2)
    expect(workflow['3'].inputs.text).toBe('editable')
    expect(workflow['3'].inputs.negative).toBe('editable negative')
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

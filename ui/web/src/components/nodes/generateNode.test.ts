import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildGenerateNodeAssetPayload,
  buildGenerateNodeResultWithFission,
  buildGenerateNodeRequestPayload,
  GENERATE_NODE_ASPECT_RATIO_OPTIONS,
  GENERATE_NODE_ROUTING_STRATEGY_OPTIONS,
  getGenerateNodeAspectRatioSize,
  isGenerateNodeMuted,
  normalizeGenerateNodeGenerationPacket,
  normalizeSelectOptions,
  pickQuickParams,
  normalizeGenerateNodeImageUrl,
  resolveGenerateNodePreviewMediaSrc,
  resolveGenerateNodeSourceAssetIds,
  resolveGenerateNodeSourceContent,
} from './GenerateNode'

describe('GenerateNode migration behavior', () => {
  test('refreshes React Flow handles after generation mode changes', () => {
    const source = [readFileSync(join(import.meta.dir, 'generate-node-model.ts'), 'utf8'), readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')].join('\n')

    expect(source).toContain('const updateNodeInternals = useUpdateNodeInternals()')
    expect(source).toContain('updateNodeInternals(id)')
  })

  test('normalizes connected local image assets through the current TS media route', () => {
    expect(normalizeGenerateNodeImageUrl('https://cdn.example/a.png')).toBe('https://cdn.example/a.png')
    expect(normalizeGenerateNodeImageUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc')
    expect(normalizeGenerateNodeImageUrl('/api/assets/media/uploads%2Fa.png')).toBe('/api/assets/media/uploads%2Fa.png')
    expect(normalizeGenerateNodeImageUrl('http://localhost:8787/api/assets/media/uploads%2Fa.png')).toBe('/api/assets/media/uploads%2Fa.png')
    expect(normalizeGenerateNodeImageUrl('/api/files/legacy.png')).toBe('/api/files/legacy.png')
    expect(normalizeGenerateNodeImageUrl('http://localhost:8000/api/files/legacy.png')).toBe('/api/files/legacy.png')
    expect(normalizeGenerateNodeImageUrl('uploads/a.png')).toBe('/api/assets/media/uploads%2Fa.png')
    expect(normalizeGenerateNodeImageUrl('/uploads/a.png')).toBe('/api/assets/media/uploads%2Fa.png')
    expect(normalizeGenerateNodeImageUrl('assets/comfy-output/frame.png')).toBe('/api/assets/media/assets%2Fcomfy-output%2Fframe.png')
  })

  test('builds browser-safe preview media src values for generated local assets', () => {
    expect(resolveGenerateNodePreviewMediaSrc('/api/assets/media/assets%2Fgenerated%2Fout.png')).toBe('http://localhost:8787/api/assets/media/assets%2Fgenerated%2Fout.png')
    expect(resolveGenerateNodePreviewMediaSrc('assets/generated/out.mp4')).toBe('http://localhost:8787/api/assets/media/assets%2Fgenerated%2Fout.mp4')
    expect(resolveGenerateNodePreviewMediaSrc('https://cdn.example/out.png')).toBe('https://cdn.example/out.png')
  })

  test('resolves source content from result, asset data, and incoming data file paths', () => {
    expect(resolveGenerateNodeSourceContent({ result: { content: 'result text' } })).toBe('result text')
    expect(resolveGenerateNodeSourceContent({ result: { file_path: 'result.png' } })).toBe('result.png')
    expect(resolveGenerateNodeSourceContent({ result: { media_url: '/api/assets/media/assets%2Fvideo-loop%2Ffinal.mp4' } })).toBe('/api/assets/media/assets%2Fvideo-loop%2Ffinal.mp4')
    expect(resolveGenerateNodeSourceContent({ result: { output_files: [{ media_url: '/api/assets/media/assets%2Fcomfy-output%2Fframe.png' }] } })).toBe('/api/assets/media/assets%2Fcomfy-output%2Fframe.png')
    expect(resolveGenerateNodeSourceContent({ asset: { data: { content: 'asset text' } } })).toBe('asset text')
    expect(resolveGenerateNodeSourceContent({ asset: { data: { core_prompt: 'character core prompt' } } })).toBe('character core prompt')
    expect(resolveGenerateNodeSourceContent({ asset: { data: { file_path: 'asset.png' } } })).toBe('asset.png')
    expect(resolveGenerateNodeSourceContent({ incoming_data: { content: 'incoming text' } })).toBe('incoming text')
    expect(resolveGenerateNodeSourceContent({ incoming_data: { core_prompt: 'incoming character prompt' } })).toBe('incoming character prompt')
    expect(resolveGenerateNodeSourceContent({ incoming_data: { file_path: 'incoming.png' } })).toBe('incoming.png')
    expect(resolveGenerateNodeSourceContent({ incoming_data: { url: 'https://cdn.example/incoming.png' } })).toBe('https://cdn.example/incoming.png')
    expect(resolveGenerateNodeSourceContent({ incoming_data: { media_url: '/api/assets/media/assets%2Fvideo-loop%2Fclip.mp4' } })).toBe('/api/assets/media/assets%2Fvideo-loop%2Fclip.mp4')
  })

  test('prefers character core prompts over stale generic content fields', () => {
    expect(resolveGenerateNodeSourceContent({
      asset: {
        type: 'character',
        data: { content: 'stale generic content', core_prompt: 'fresh character core' },
      },
    })).toBe('fresh character core')
    expect(resolveGenerateNodeSourceContent({
      incoming_data: { content: 'stale incoming content', core_prompt: 'fresh incoming character core' },
    })).toBe('fresh incoming character core')
  })

  test('collects direct and inherited source asset ids from upstream nodes', () => {
    expect(resolveGenerateNodeSourceAssetIds({
      asset: { id: 8 },
      result: { source_asset_ids: [8, 9] },
      incoming_data: { sourceAssetIds: [10] },
    })).toEqual([8, 9, 10])
  })

  test('builds project-scoped media asset payloads with lineage for generated results', () => {
    const payload = buildGenerateNodeAssetPayload({
      resultContent: 'https://cdn.example/out.mp4',
      mode: 'image_to_video',
      prompt: '镜头推进到主角',
      selectedModel: 'wan-video',
      provider: 'runninghub',
      selectedRolePrompt: 'cinematic director',
      params: { steps: 18 },
      temperature: 0.7,
      aspectRatio: '16:9',
      ratioSize: '1280*720',
      projectId: 42,
      cameraParams: { focal_length: '85mm' },
      sourceAssetIds: [101, 102],
    })

    expect(payload).toMatchObject({
      name: '🎬 镜头推进到主角...',
      type: 'video',
      file_path: 'https://cdn.example/out.mp4',
      source_asset_ids: [101, 102],
      data: {
        content: 'https://cdn.example/out.mp4',
        file_path: 'https://cdn.example/out.mp4',
        url: 'https://cdn.example/out.mp4',
        source_asset_ids: [101, 102],
        source_provider: 'runninghub',
        source_model: 'wan-video',
        source_mode: 'image_to_video',
        source_prompt: '镜头推进到主角',
        source_system: 'cinematic director',
        source_params: { steps: 18, temperature: 0.7, size: '1280*720' },
        source_aspect_ratio: '16:9',
        source_size: '1280*720',
        source_camera_params: { focal_length: '85mm' },
      },
      tags: ['AI_Generated', 'image_to_video', 'wan-video'],
      project_id: 42,
    })
    expect(payload.thumbnail).toBeUndefined()
    expect(payload.data.source_camera_suffix).toContain('compressed perspective')
  })

  test('preserves source asset lineage from generation route packets', () => {
    expect(normalizeGenerateNodeGenerationPacket({
      content: 'https://cdn.example/out.png',
      result: { content: 'https://cdn.example/out.png' },
      source_asset_ids: [11, 12],
    })).toMatchObject({
      content: 'https://cdn.example/out.png',
      source_asset_ids: [11, 12],
    })

    expect(normalizeGenerateNodeGenerationPacket({
      result: {
        content: 'https://cdn.example/out.mp4',
        source_asset_ids: [21],
      },
    })).toMatchObject({
      content: 'https://cdn.example/out.mp4',
      source_asset_ids: [21],
    })

    expect(normalizeGenerateNodeGenerationPacket({
      result: {
        media_url: '/api/assets/media/assets%2Fvideo-loop%2Ffinal.mp4',
        final_video: 'assets/video-loop/final.mp4',
        source_asset_ids: [31],
      },
    })).toMatchObject({
      content: '/api/assets/media/assets%2Fvideo-loop%2Ffinal.mp4',
      media_url: '/api/assets/media/assets%2Fvideo-loop%2Ffinal.mp4',
      source_asset_ids: [31],
    })
  })

  test('treats generate nodes as muted when the node or parent group is muted', () => {
    const nodes = [
      { id: 'group-a', type: 'nodeGroup', data: { _muted: true } },
      { id: 'muted-by-group', type: 'generate', parentNode: 'group-a', data: {} },
      { id: 'muted-self', type: 'generate', data: { _muted: true } },
      { id: 'active', type: 'generate', parentNode: 'group-b', data: {} },
      { id: 'group-b', type: 'nodeGroup', data: { _muted: false } },
    ]

    expect(isGenerateNodeMuted(nodes, 'muted-by-group')).toBe(true)
    expect(isGenerateNodeMuted(nodes, 'muted-self')).toBe(true)
    expect(isGenerateNodeMuted(nodes, 'active')).toBe(false)
    expect(isGenerateNodeMuted(nodes, 'missing')).toBe(false)
  })

  test('uses the shared full aspect-ratio preset list for generation nodes', () => {
    expect(GENERATE_NODE_ASPECT_RATIO_OPTIONS.map(option => option.value)).toEqual([
      '',
      '1:1',
      '9:16',
      '16:9',
      '3:4',
      '4:3',
      '3:2',
      '2:3',
      '4:5',
      '5:4',
      '21:9',
      'custom',
    ])
    expect(getGenerateNodeAspectRatioSize('21:9')).toBe('1536*640')
    expect(getGenerateNodeAspectRatioSize('', 1600, 900)).toBe('')
    expect(getGenerateNodeAspectRatioSize('custom', 1600, 900)).toBe('1600*900')
  })

  test('exposes upstream key routing strategies in generation node payloads', () => {
    expect(GENERATE_NODE_ROUTING_STRATEGY_OPTIONS.map(option => option.value)).toEqual([
      'balanced',
      'cost',
      'speed',
      'random',
    ])

    const source = [readFileSync(join(import.meta.dir, 'generate-node-model.ts'), 'utf8'), readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')].join('\n')
    expect(source).toContain('routing_strategy: routingStrategy')
    expect(source).toContain('setRoutingStrategy')
  })

  test('loads models through the upstream key and mode filtered selector route', () => {
    const source = [readFileSync(join(import.meta.dir, 'generate-node-model.ts'), 'utf8'), readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')].join('\n')

    expect(source).toContain('&mode=')
  })

  test('builds generation request payloads with routing strategy and camera suffix in the user prompt', async () => {
    const module = await import('./GenerateNode')
    const buildPayload = (module as any).buildGenerateNodeRequestPayload

    expect(typeof buildPayload).toBe('function')
    const payload = buildPayload({
      id: 'node-7',
      prompt: '画一张赛博城市',
      selectedKey: 12,
      provider: 'anyrouter',
      selectedModel: 'gpt-image',
      mode: 'text_to_image',
      routingStrategy: 'cost',
      params: { steps: 24 },
      temperature: 0.63,
      ratioSize: '1024*1024',
      selectedRolePrompt: '你是视觉导演',
      cameraSuffix: ', cinematic lighting',
    })

    expect(payload).toMatchObject({
      api_key_id: 12,
      provider: 'anyrouter',
      model: 'gpt-image',
      type: 'text_to_image',
      routing_strategy: 'cost',
      prompt: '画一张赛博城市, cinematic lighting',
      params: { steps: 24, temperature: 0.63, size: '1024*1024', client_id: 'node-7' },
      messages: [
        { role: 'system', content: '你是视觉导演' },
        { role: 'user', content: '画一张赛博城市, cinematic lighting' },
      ],
    })
  })

  test('adds camera suffix to vision message text without changing the system prompt', async () => {
    const module = await import('./GenerateNode')
    const buildPayload = (module as any).buildGenerateNodeRequestPayload

    const payload = buildPayload({
      id: 'node-vision',
      prompt: '分析构图',
      selectedKey: 7,
      provider: 'vision-proxy',
      selectedModel: 'vision-model',
      mode: 'vision',
      routingStrategy: 'balanced',
      params: {},
      temperature: 0.2,
      ratioSize: '',
      selectedRolePrompt: '你是摄影指导',
      cameraSuffix: ', low angle looking up, dramatic',
      incomingImage: 'https://cdn.example/input.png',
    })

    expect(payload.messages).toEqual([
      { role: 'system', content: '你是摄影指导' },
      {
        role: 'user',
        content: [
          { type: 'text', text: '分析构图, low angle looking up, dramatic' },
          { type: 'image_url', image_url: { url: 'https://cdn.example/input.png' } },
        ],
      },
    ])
  })

  test('builds vision payloads with multiple incoming assets for backend multimodal parsing', async () => {
    const module = await import('./GenerateNode')
    const buildPayload = (module as any).buildGenerateNodeRequestPayload

    const payload = buildPayload({
      id: 'node-multimodal',
      prompt: '综合分析参考图',
      selectedKey: 7,
      provider: 'vision-proxy',
      selectedModel: 'vision-model',
      mode: 'vision',
      routingStrategy: 'balanced',
      params: {},
      temperature: 0.2,
      ratioSize: '',
      selectedRolePrompt: '你是摄影指导',
      incomingAssets: [
        { id: 11, type: 'image', file_path: 'uploads/a.png' },
        { id: 12, type: 'image', url: 'https://cdn.example/b.png' },
        { id: 13, type: 'prompt', content: '角色表情要压抑', source_asset_ids: [21, 22] } as any,
      ],
    })

    expect(payload.image_url).toBe('/api/assets/media/uploads%2Fa.png')
    expect(payload.params.incoming_assets).toEqual([
      { id: 11, type: 'image', file_path: '/api/assets/media/uploads%2Fa.png', url: '/api/assets/media/uploads%2Fa.png', source_asset_ids: [11] },
      { id: 12, type: 'image', file_path: 'https://cdn.example/b.png', url: 'https://cdn.example/b.png', source_asset_ids: [12] },
      { id: 13, type: 'prompt', content: '角色表情要压抑', source_asset_ids: [13, 21, 22] },
    ])
    expect(payload.messages).toEqual([
      { role: 'system', content: '你是摄影指导' },
      {
        role: 'user',
        content: [
          { type: 'text', text: '综合分析参考图\n\n[参考素材]:\n角色表情要压抑' },
          { type: 'image_url', image_url: { url: '/api/assets/media/uploads%2Fa.png' } },
          { type: 'image_url', image_url: { url: 'https://cdn.example/b.png' } },
        ],
      },
    ])
  })

  test('collects all connected image assets instead of only the first one', () => {
    const source = [readFileSync(join(import.meta.dir, 'generate-node-model.ts'), 'utf8'), readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')].join('\n')

    expect(source).toContain('incomingAssets.push')
    expect(source).toContain('incomingAssets,')
    expect(source).not.toContain('&& !incomingImage) incomingImage')
  })

  test('builds fission results from the active run configuration', () => {
    const result = buildGenerateNodeResultWithFission({
      packet: { content: '```json\n["第一格", {"prompt":"第二格"}]\n```' },
      fissionEnabled: true,
      expectedCount: 2,
    })

    expect(result).toMatchObject({
      content: '```json\n["第一格", {"prompt":"第二格"}]\n```',
      _fission: true,
      items: ['第一格', '第二格'],
    })

    expect(buildGenerateNodeResultWithFission({
      packet: { content: '["第一格", "第二格"]' },
      fissionEnabled: true,
      expectedCount: 3,
    })).toEqual({ content: '["第一格", "第二格"]' })
  })
})

describe('normalizeSelectOptions', () => {
  test('wraps legacy string options into label/value objects', () => {
    expect(normalizeSelectOptions(['1024*1024', '768*1344'])).toEqual([
      { label: '1024*1024', value: '1024*1024' },
      { label: '768*1344', value: '768*1344' },
    ])
  })

  test('keeps object options and fills missing labels', () => {
    expect(normalizeSelectOptions([{ label: '1M', value: 1000000 }, { value: 'raw' }])).toEqual([
      { label: '1M', value: 1000000 },
      { label: 'raw', value: 'raw' },
    ])
  })

  test('non-array input degrades to empty list', () => {
    expect(normalizeSelectOptions(undefined)).toEqual([])
    expect(normalizeSelectOptions('1024*1024' as any)).toEqual([])
  })
})

describe('media result must not inflate the node', () => {
  test('node dimensions are frozen before a media preview mounts', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    // 无显式尺寸的节点会被生成图片撑大：媒体结果出现时必须先把当前节点宽高固化进 style
    expect(source).toContain('freezeNodeSizeBeforeMediaPreview')
  })

  test('menu-created generate nodes get an explicit default size', () => {
    const source = readFileSync(join(import.meta.dir, '../../pages/CanvasPage.tsx'), 'utf8')
    expect(source).toMatch(/style: node\.type === 'generate'/)
  })
})

describe('pickQuickParams', () => {
  test('promotes the first two select/number params, excluding size', () => {
    const params = [
      { name: 'size', type: 'select', options: ['1024*1024'] },
      { name: 'style', type: 'string' },
      { name: 'n', type: 'number', default: 1 },
      { name: 'steps', type: 'number', default: 20 },
    ]
    expect(pickQuickParams(params).map(p => p.name)).toEqual(['n', 'steps'])
  })

  test('non-array input degrades to empty list', () => {
    expect(pickQuickParams(undefined)).toEqual([])
    expect(pickQuickParams('nope' as any)).toEqual([])
  })
})

describe('request payload size precedence', () => {
  const basePayloadInput = {
    id: 'node-1',
    prompt: '画一只猫',
    selectedKey: 3,
    provider: 'cliproxyapi',
    selectedModel: 'gemini-3.1-flash-image',
    mode: 'text_to_image',
    routingStrategy: 'balanced',
    temperature: 0.7,
    ratioSize: '1344*768',
    selectedRolePrompt: 'role',
  }

  test('model param size wins over aspect-ratio size', () => {
    const payload = buildGenerateNodeRequestPayload({
      ...basePayloadInput,
      params: { size: '1024*1024', n: 2 },
    } as any)
    expect(payload.params.size).toBe('1024*1024')
    expect(payload.params.n).toBe(2)
  })

  test('aspect-ratio size fills in when the model has no size param', () => {
    const payload = buildGenerateNodeRequestPayload({
      ...basePayloadInput,
      params: {},
    } as any)
    expect(payload.params.size).toBe('1344*768')
  })

  test('node-level temperature still wins over model param defaults', () => {
    const payload = buildGenerateNodeRequestPayload({
      ...basePayloadInput,
      params: { temperature: 1.5 },
    } as any)
    expect(payload.params.temperature).toBe(0.7)
  })
})

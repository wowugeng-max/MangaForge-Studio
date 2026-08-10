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
  parseCanvasSkillCommand,
  resolveGenerateNodePreviewMediaSrc,
  resolveGenerateNodeSourceAssetIds,
  resolveGenerateNodeSourceContent,
} from './GenerateNode'

async function loadGenerateNodeReferenceApi() {
  const module = await import('./GenerateNode')
  return module as typeof module & Record<string, any>
}

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

  test('keeps the editable source prompt and compile provenance in saved assets', () => {
    const payload = buildGenerateNodeAssetPayload({
      resultContent: 'https://cdn.example/out.png',
      mode: 'text_to_image',
      prompt: '/pack-a:h3-prompt-writing hero closeup',
      selectedModel: 'image-model',
      provider: 'skill-provider',
      selectedRolePrompt: 'visual director',
      params: {},
      temperature: 0.7,
      aspectRatio: '1:1',
      ratioSize: '1024*1024',
      compiledPrompt: 'cinematic closeup of a heroic character',
      compiledNegativePrompt: '',
      skillPackId: 'pack-a',
      skillPackSource: 'https://example.com/pack-a.git',
      skillName: 'h3-prompt-writing',
      skillRevision: 'rev-7',
      compiledReferences: [{ asset_id: 42, role: 'character' }],
      compiledInputHash: 'sha256:compiled-input',
      warnings: ['reference was downscaled'],
      compilerModelId: 'compiler-model',
    } as any)

    expect(payload.data).toMatchObject({
      source_prompt: '/pack-a:h3-prompt-writing hero closeup',
      compiled_prompt: 'cinematic closeup of a heroic character',
      compiled_negative_prompt: '',
      skill_pack_id: 'pack-a',
      skill_pack_source: 'https://example.com/pack-a.git',
      skill_name: 'h3-prompt-writing',
      skill_revision: 'rev-7',
      compiled_references: [{ asset_id: 42, role: 'character' }],
      compiled_input_hash: 'sha256:compiled-input',
      warnings: ['reference was downscaled'],
      compiler_model_id: 'compiler-model',
    })
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

  test('merges top-level Skill compile audit fields into normalized generation results', () => {
    expect(normalizeGenerateNodeGenerationPacket({
      content: 'https://cdn.example/out.png',
      result: { content: 'https://cdn.example/out.png' },
      skill_pack_id: 'pack-a',
      skill_pack_source: 'https://example.com/pack-a.git',
      skill_name: 'h3-prompt-writing',
      skill_revision: 'rev-7',
      compiled_prompt: 'compiled prompt',
      compiled_negative_prompt: 'negative prompt',
      compiled_references: ['reference.md'],
      compiled_input_hash: 'sha256:input',
      warnings: ['warning'],
      compiler_model_id: 9,
      raw_prompt: '/pack-a:h3-prompt-writing hero',
    })).toMatchObject({
      skill_pack_id: 'pack-a',
      skill_pack_source: 'https://example.com/pack-a.git',
      skill_name: 'h3-prompt-writing',
      skill_revision: 'rev-7',
      compiled_prompt: 'compiled prompt',
      compiled_negative_prompt: 'negative prompt',
      compiled_references: ['reference.md'],
      compiled_input_hash: 'sha256:input',
      warnings: ['warning'],
      compiler_model_id: 9,
      raw_prompt: '/pack-a:h3-prompt-writing hero',
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

  test('adds selected Skill fields to generation payloads and omits empty optional fields', () => {
    const base = {
      id: 'node-skill',
      prompt: 'hero closeup',
      selectedKey: 7,
      provider: 'skill-provider',
      selectedModel: 'image-model',
      mode: 'text_to_image',
      routingStrategy: 'balanced',
      params: {},
      temperature: 0.7,
      ratioSize: '1024*1024',
      selectedRolePrompt: 'visual director',
    }

    const payload = buildGenerateNodeRequestPayload({
      ...base,
      skillName: 'selected',
      skillPackId: 'pack-a',
      cameraSuffix: ', low angle',
    } as any)

    expect(payload).toMatchObject({
      prompt: 'hero closeup',
      skill_name: 'selected',
      skill_pack_id: 'pack-a',
      skill_compile_enabled: true,
    })
    expect('skill_revision' in payload).toBe(false)
    expect('skill_compiler_model_id' in payload).toBe(false)
    expect('skill_arguments' in payload).toBe(false)
    expect('compiled_input_hash' in payload).toBe(false)

    expect(buildGenerateNodeRequestPayload({
      ...base,
      skillName: 'selected',
      skillPackId: 'pack-a',
      skillRevision: 'rev-7',
      skillCompilerModelId: 'compiler-model',
      skillArguments: { subject: 'hero' },
      compiledInputHash: 'sha256:preview',
    } as any)).toMatchObject({
      skill_revision: 'rev-7',
      skill_compiler_model_id: 'compiler-model',
      skill_arguments: { subject: 'hero' },
      compiled_input_hash: 'sha256:preview',
    })
  })

  test('leading Skill commands override stale dropdown selectors without replacing the editable prompt', () => {
    const base = {
      id: 'node-command',
      selectedKey: 7,
      provider: 'skill-provider',
      selectedModel: 'image-model',
      mode: 'text_to_image',
      routingStrategy: 'balanced',
      params: {},
      temperature: 0.7,
      ratioSize: '1024*1024',
      selectedRolePrompt: 'visual director',
      skillName: 'stale-selection',
      skillPackId: 'stale-pack',
    }

    for (const prompt of ['/h3-prompt-writing hero closeup', '/pack-a:h3-prompt-writing hero']) {
      const payload = buildGenerateNodeRequestPayload({ ...base, prompt } as any)
      expect(payload.prompt).toBe(prompt)
      expect('skill_name' in payload).toBe(false)
      expect('skill_pack_id' in payload).toBe(false)
    }
  })

  test('parses only valid leading canvas Skill commands', async () => {
    const module = await import('./GenerateNode')
    const parseCanvasSkillCommand = (module as any).parseCanvasSkillCommand

    expect(typeof parseCanvasSkillCommand).toBe('function')
    expect(parseCanvasSkillCommand('/h3-prompt-writing hero closeup')).toEqual({
      name: 'h3-prompt-writing',
      argumentsText: 'hero closeup',
    })
    expect(parseCanvasSkillCommand('/pack-a:h3-prompt-writing hero')).toEqual({
      packId: 'pack-a',
      name: 'h3-prompt-writing',
      argumentsText: 'hero',
    })
    expect(parseCanvasSkillCommand('ordinary prompt')).toBeNull()
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
      { reference_index: 1, reference_id: 'reference-1', reference_role: 'general', type: 'image', url: '/api/assets/media/uploads%2Fa.png', source_asset_ids: [11] },
      { reference_index: 2, reference_id: 'reference-2', reference_role: 'general', type: 'image', url: 'https://cdn.example/b.png', source_asset_ids: [12] },
      { reference_index: 3, reference_id: 'reference-3', reference_role: 'general', type: 'prompt', content: '角色表情要压抑', source_asset_ids: [13, 21, 22] },
    ])
    expect(payload.reference_images).toEqual([
      { url: '/api/assets/media/uploads%2Fa.png', reference_index: 1, reference_id: 'reference-1', reference_role: 'general', source_asset_ids: [11] },
      { url: 'https://cdn.example/b.png', reference_index: 2, reference_id: 'reference-2', reference_role: 'general', source_asset_ids: [12] },
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

describe('GenerateNode ordered reference bindings', () => {
  test('re-exports the typed reference error and image limit through the GenerateNode public API', async () => {
    const module = await loadGenerateNodeReferenceApi()

    expect(typeof module.GenerateNodeReferenceError).toBe('function')
    expect(module.MAX_GENERATE_NODE_REFERENCE_IMAGES).toBe(9)
    if (typeof module.GenerateNodeReferenceError !== 'function') return

    expect(new module.GenerateNodeReferenceError('REFERENCE_ROLE_INVALID', 'invalid role', 2)).toMatchObject({
      name: 'GenerateNodeReferenceError',
      code: 'REFERENCE_ROLE_INVALID',
      reference_index: 2,
    })
  })

  test('migrates legacy incoming assets and normalizes persisted camel/snake fields without mutation', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    expect(typeof normalizeBindings).toBe('function')
    if (typeof normalizeBindings !== 'function') return

    const incomingAssets = [
      { id: 21, type: 'image', url: '/api/assets/media/a.png', source_asset_ids: [21] },
    ]
    const incomingSnapshot = JSON.parse(JSON.stringify(incomingAssets))
    expect(normalizeBindings(undefined, incomingAssets)).toEqual([
      {
        reference_index: 1,
        reference_id: 'reference-1',
        reference_role: 'general',
        type: 'image',
        url: '/api/assets/media/a.png',
        source_asset_ids: [21],
      },
    ])
    expect(incomingAssets).toEqual(incomingSnapshot)

    const persisted = [
      {
        referenceIndex: 8,
        referenceId: 'stable-image',
        referenceRole: 'first_frame',
        type: 'image',
        url: '/api/assets/media/first.png',
        sourceAssetIds: ['31', 31, 0, -1, 32],
      },
      {
        reference_index: 2,
        reference_id: 'stable-prompt',
        role: 'prompt_context',
        type: 'prompt',
        content: '  保持角色服装一致  ',
        source_asset_ids: [41, 41],
      },
    ]
    const persistedSnapshot = JSON.parse(JSON.stringify(persisted))
    expect(normalizeBindings(persisted, incomingAssets)).toEqual([
      {
        reference_index: 1,
        reference_id: 'stable-image',
        reference_role: 'first_frame',
        type: 'image',
        url: '/api/assets/media/first.png',
        source_asset_ids: [31, 32],
      },
      {
        reference_index: 2,
        reference_id: 'stable-prompt',
        reference_role: 'prompt_context',
        type: 'prompt',
        content: '保持角色服装一致',
        source_asset_ids: [41],
      },
    ])
    expect(persisted).toEqual(persistedSnapshot)
  })

  test('reorders bindings immutably, renumbers indexes, and keeps stable reference ids', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    const reorderBindings = module.reorderGenerateNodeReferenceBindings
    const buildReferencePayload = module.buildGenerateNodeReferencePayload
    expect(typeof normalizeBindings).toBe('function')
    expect(typeof reorderBindings).toBe('function')
    expect(typeof buildReferencePayload).toBe('function')
    if (typeof normalizeBindings !== 'function' || typeof reorderBindings !== 'function' || typeof buildReferencePayload !== 'function') return

    const bindings = normalizeBindings(undefined, [
      { id: 21, type: 'image', url: '/api/assets/media/a.png', source_asset_ids: [21] },
      { id: 22, type: 'prompt', content: '冷色调', source_asset_ids: [22] },
      { id: 23, type: 'image', url: '/api/assets/media/b.png', source_asset_ids: [23] },
    ])
    const snapshot = JSON.parse(JSON.stringify(bindings))
    const reordered = reorderBindings(bindings, 2, 0)

    expect(reordered.map((item: any) => ({
      reference_index: item.reference_index,
      reference_id: item.reference_id,
    }))).toEqual([
      { reference_index: 1, reference_id: 'reference-3' },
      { reference_index: 2, reference_id: 'reference-1' },
      { reference_index: 3, reference_id: 'reference-2' },
    ])
    expect(bindings).toEqual(snapshot)
    expect(reordered).not.toBe(bindings)

    expect(buildReferencePayload(reordered)).toEqual({
      reference_bindings: reordered,
      reference_images: [
        {
          url: '/api/assets/media/b.png',
          reference_index: 1,
          reference_id: 'reference-3',
          reference_role: 'general',
          source_asset_ids: [23],
        },
        {
          url: '/api/assets/media/a.png',
          reference_index: 2,
          reference_id: 'reference-1',
          reference_role: 'general',
          source_asset_ids: [21],
        },
      ],
    })
  })

  test('allows nine images plus prompt references but rejects a tenth image with a typed error', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    expect(typeof normalizeBindings).toBe('function')
    if (typeof normalizeBindings !== 'function') return

    const nineImagesAndPrompts = [
      ...Array.from({ length: 9 }, (_, index) => ({
        type: 'image',
        url: `/api/assets/media/reference-${index + 1}.png`,
      })),
      { type: 'prompt', content: '角色设定不变' },
      { type: 'prompt', content: '环境保持雨夜' },
    ]
    expect(normalizeBindings(undefined, nineImagesAndPrompts)).toHaveLength(11)

    const tenImages = Array.from({ length: 10 }, (_, index) => ({
      type: 'image',
      url: `/api/assets/media/reference-${index + 1}.png`,
    }))
    const snapshot = JSON.parse(JSON.stringify(tenImages))
    expect(() => normalizeBindings(undefined, tenImages)).toThrow(expect.objectContaining({
      code: 'REFERENCE_LIMIT_EXCEEDED',
    }))
    expect(tenImages).toEqual(snapshot)
  })

  test('rejects duplicate first/last roles and invalid roles with typed errors', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    expect(typeof normalizeBindings).toBe('function')
    if (typeof normalizeBindings !== 'function') return

    expect(() => normalizeBindings([
      { type: 'image', url: '/first-a.png', reference_role: 'first_frame' },
      { type: 'image', url: '/first-b.png', referenceRole: 'first_frame' },
    ], [])).toThrow(expect.objectContaining({ code: 'REFERENCE_ROLE_INVALID' }))
    expect(() => normalizeBindings([
      { type: 'image', url: '/last-a.png', reference_role: 'last_frame' },
      { type: 'image', url: '/last-b.png', role: 'last_frame' },
    ], [])).toThrow(expect.objectContaining({ code: 'REFERENCE_ROLE_INVALID' }))
    expect(() => normalizeBindings([
      { type: 'image', url: '/bad-role.png', reference_role: 'background_only' },
    ], [])).toThrow(expect.objectContaining({ code: 'REFERENCE_ROLE_INVALID' }))
  })

  test('rejects duplicate ids, malformed lineage, and missing type-specific content', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    expect(typeof normalizeBindings).toBe('function')
    if (typeof normalizeBindings !== 'function') return

    expect(() => normalizeBindings([
      { type: 'image', url: '/a.png', reference_id: 'duplicate-id' },
      { type: 'image', url: '/b.png', referenceId: 'duplicate-id' },
    ], [])).toThrow(expect.objectContaining({ code: 'REFERENCE_ID_INVALID' }))
    expect(() => normalizeBindings([
      { type: 'image', url: '/a.png', source_asset_ids: 'not-an-array' },
    ], [])).toThrow(expect.objectContaining({ code: 'REFERENCE_LINEAGE_INVALID' }))

    for (const type of ['image', 'video', 'audio']) {
      expect(() => normalizeBindings([{ type }], [])).toThrow(expect.objectContaining({
        code: 'REFERENCE_ASSET_INVALID',
      }))
    }
    expect(() => normalizeBindings([{ type: 'prompt' }], [])).toThrow(expect.objectContaining({
      code: 'REFERENCE_ASSET_INVALID',
    }))
    expect(() => normalizeBindings([{ type: 'prompt', content: '   ' }], [])).toThrow(expect.objectContaining({
      code: 'REFERENCE_ASSET_INVALID',
    }))
  })

  test('returns an immutable normalized copy for invalid reorder indexes', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    const reorderBindings = module.reorderGenerateNodeReferenceBindings
    expect(typeof normalizeBindings).toBe('function')
    expect(typeof reorderBindings).toBe('function')
    if (typeof normalizeBindings !== 'function' || typeof reorderBindings !== 'function') return

    const bindings = normalizeBindings([
      {
        type: 'image',
        url: '/api/assets/media/a.png',
        reference_index: 9,
        reference_id: 'stable-a',
        source_asset_ids: [81, 82],
      },
      {
        type: 'prompt',
        content: '保持动作连续',
        reference_index: 4,
        reference_id: 'stable-b',
        source_asset_ids: [83],
      },
    ], [])
    const snapshot = JSON.parse(JSON.stringify(bindings))

    for (const [fromIndex, toIndex] of [[-1, 0], [0, 9], [1.5, 0]]) {
      const copy = reorderBindings(bindings, fromIndex, toIndex)
      expect(copy).toEqual(snapshot)
      expect(copy).not.toBe(bindings)
      expect(copy[0]).not.toBe(bindings[0])
      expect(copy[0].source_asset_ids).not.toBe(bindings[0].source_asset_ids)
    }
    expect(bindings).toEqual(snapshot)
  })

  test('locks the exhaustive reference role, type, and nine-image contract matrix', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    expect(typeof normalizeBindings).toBe('function')
    if (typeof normalizeBindings !== 'function') return

    const roles = [
      'general',
      'first_frame',
      'last_frame',
      'character',
      'scene',
      'style',
      'full_reference',
      'prompt_context',
    ]
    expect(roles.map(role => normalizeBindings([
      { type: 'image', url: `/api/assets/media/${role}.png`, reference_role: role },
    ], [])[0].reference_role)).toEqual(roles)

    const typeInputs = [
      { type: 'image', url: '/api/assets/media/reference.png' },
      { type: 'prompt', content: '保持角色一致' },
      { type: 'video', url: '/api/assets/media/reference.mp4' },
      { type: 'audio', url: '/api/assets/media/reference.wav' },
    ]
    expect(typeInputs.map(input => normalizeBindings([input], [])[0].type)).toEqual([
      'image',
      'prompt',
      'video',
      'audio',
    ])

    const nineImages = Array.from({ length: 9 }, (_, index) => ({
      type: 'image',
      url: `/api/assets/media/matrix-${index + 1}.png`,
    }))
    expect(normalizeBindings(undefined, nineImages)).toHaveLength(9)
    expect(() => normalizeBindings(undefined, [
      ...nineImages,
      { type: 'image', url: '/api/assets/media/matrix-10.png' },
    ])).toThrow(expect.objectContaining({ code: 'REFERENCE_LIMIT_EXCEEDED' }))
  })

  test('serializes reserved video/audio references but rejects them for client execution', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    const validateForExecution = module.validateGenerateNodeReferenceBindingsForExecution
    const buildReferencePayload = module.buildGenerateNodeReferencePayload
    expect(typeof normalizeBindings).toBe('function')
    expect(typeof validateForExecution).toBe('function')
    expect(typeof buildReferencePayload).toBe('function')
    if (typeof normalizeBindings !== 'function' || typeof validateForExecution !== 'function' || typeof buildReferencePayload !== 'function') return

    const bindings = normalizeBindings([
      { type: 'video', url: '/api/assets/media/reference.mp4', referenceRole: 'general' },
      { type: 'audio', url: '/api/assets/media/reference.wav', reference_role: 'prompt_context' },
    ], [])
    expect(bindings).toMatchObject([
      { type: 'video', reference_index: 1, reference_id: 'reference-1' },
      { type: 'audio', reference_index: 2, reference_id: 'reference-2' },
    ])
    expect(buildReferencePayload(bindings)).toMatchObject({
      reference_bindings: bindings,
      reference_images: [],
    })
    expect(() => validateForExecution(bindings)).toThrow(expect.objectContaining({
      code: 'REFERENCE_MEDIA_UNSUPPORTED',
      reference_index: 1,
    }))
  })

  test('migrates legacy single-image requests and sends every explicit image binding in order', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    expect(typeof normalizeBindings).toBe('function')
    if (typeof normalizeBindings !== 'function') return

    const base = {
      id: 'node-references',
      prompt: '生成连续镜头',
      selectedKey: 7,
      provider: 'video-provider',
      selectedModel: 'video-model',
      mode: 'image_to_video',
      routingStrategy: 'balanced',
      params: {},
      temperature: 0.2,
      ratioSize: '1280*720',
      selectedRolePrompt: '你是视频导演',
    }

    const legacyPayload = buildGenerateNodeRequestPayload({
      ...base,
      incomingAssets: [
        { id: 51, type: 'image', file_path: '/api/assets/media/legacy.png', source_asset_ids: [51] },
      ],
    } as any)
    expect(legacyPayload.image_url).toBe('/api/assets/media/legacy.png')
    expect(legacyPayload.params.incoming_assets).toEqual([
      {
        reference_index: 1,
        reference_id: 'reference-1',
        reference_role: 'general',
        type: 'image',
        url: '/api/assets/media/legacy.png',
        source_asset_ids: [51],
      },
    ])
    expect(legacyPayload.reference_images).toEqual([
      {
        url: '/api/assets/media/legacy.png',
        reference_index: 1,
        reference_id: 'reference-1',
        reference_role: 'general',
        source_asset_ids: [51],
      },
    ])

    const referenceBindings = normalizeBindings([
      {
        type: 'image',
        url: '/api/assets/media/first.png',
        reference_id: 'first-ref',
        reference_role: 'first_frame',
        source_asset_ids: [61, 62],
      },
      {
        type: 'image',
        url: '/api/assets/media/last.png',
        referenceId: 'last-ref',
        referenceRole: 'last_frame',
        sourceAssetIds: [63],
      },
    ], [])
    const snapshot = JSON.parse(JSON.stringify(referenceBindings))
    const payload = buildGenerateNodeRequestPayload({ ...base, referenceBindings } as any)

    expect(payload.image_url).toBe('/api/assets/media/first.png')
    expect(payload.params.incoming_assets).toEqual(referenceBindings)
    expect(payload.reference_images).toEqual([
      {
        url: '/api/assets/media/first.png',
        reference_index: 1,
        reference_id: 'first-ref',
        reference_role: 'first_frame',
        source_asset_ids: [61, 62],
      },
      {
        url: '/api/assets/media/last.png',
        reference_index: 2,
        reference_id: 'last-ref',
        reference_role: 'last_frame',
        source_asset_ids: [63],
      },
    ])
    expect(referenceBindings).toEqual(snapshot)
  })

  test('persists reference bindings in generated assets and merges all lineage without changing legacy payloads', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    expect(typeof normalizeBindings).toBe('function')
    if (typeof normalizeBindings !== 'function') return

    const base = {
      resultContent: 'https://cdn.example/out.mp4',
      mode: 'image_to_video',
      prompt: '连续动作',
      selectedModel: 'video-model',
      provider: 'video-provider',
      selectedRolePrompt: 'director',
      params: {},
      temperature: 0.7,
      aspectRatio: '16:9',
      ratioSize: '1280*720',
      sourceAssetIds: [71, 72],
    }
    const legacyPayload = buildGenerateNodeAssetPayload(base)
    expect(legacyPayload.source_asset_ids).toEqual([71, 72])
    expect(legacyPayload.data.source_asset_ids).toEqual([71, 72])
    expect('reference_bindings' in legacyPayload.data).toBe(false)

    const referenceBindings = normalizeBindings([
      {
        type: 'image',
        url: '/api/assets/media/first.png',
        reference_role: 'first_frame',
        source_asset_ids: [72, 73],
      },
      {
        type: 'prompt',
        content: '服装保持一致',
        reference_role: 'prompt_context',
        source_asset_ids: [74, 73],
      },
    ], [])
    const snapshot = JSON.parse(JSON.stringify(referenceBindings))
    const payload = buildGenerateNodeAssetPayload({ ...base, referenceBindings } as any)

    expect(payload.source_asset_ids).toEqual([71, 72, 73, 74])
    expect(payload.data.source_asset_ids).toEqual([71, 72, 73, 74])
    expect(payload.data.reference_bindings).toEqual(referenceBindings)
    expect(referenceBindings).toEqual(snapshot)
  })

  test('reconciles live edge changes while preserving user roles, order, ids, and same-url multiplicity', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    const reorderBindings = module.reorderGenerateNodeReferenceBindings
    const reconcileBindings = module.reconcileGenerateNodeReferenceBindings
    expect(typeof reconcileBindings).toBe('function')
    if (typeof reconcileBindings !== 'function') return

    const persisted = reorderBindings(normalizeBindings([
      {
        type: 'image',
        url: '/api/assets/media/shared.png',
        reference_id: 'asset-11-ref',
        reference_role: 'character',
        source_asset_ids: [11],
      },
      {
        type: 'image',
        url: '/api/assets/media/shared.png',
        reference_id: 'asset-22-ref',
        reference_role: 'style',
        source_asset_ids: [22],
      },
      {
        type: 'prompt',
        content: '旧场景约束',
        reference_id: 'asset-33-ref',
        reference_role: 'prompt_context',
        source_asset_ids: [33],
      },
    ], []), 1, 0)
    const persistedSnapshot = JSON.parse(JSON.stringify(persisted))
    const incoming = [
      { id: 11, type: 'image', url: '/api/assets/media/shared.png', source_asset_ids: [11, 111] },
      { id: 22, type: 'image', url: '/api/assets/media/shared.png', source_asset_ids: [22] },
      { id: 44, type: 'prompt', content: '新场景约束', source_asset_ids: [44] },
    ]
    const incomingSnapshot = JSON.parse(JSON.stringify(incoming))

    const result = reconcileBindings(persisted, incoming)

    expect(result.validationError).toBeNull()
    expect(result.bindings).toMatchObject([
      {
        reference_index: 1,
        reference_id: 'asset-22-ref',
        reference_role: 'style',
        type: 'image',
        url: '/api/assets/media/shared.png',
        source_asset_ids: [22],
      },
      {
        reference_index: 2,
        reference_id: 'asset-11-ref',
        reference_role: 'character',
        type: 'image',
        url: '/api/assets/media/shared.png',
        source_asset_ids: [11, 111],
      },
      {
        reference_index: 3,
        reference_role: 'general',
        type: 'prompt',
        content: '新场景约束',
        source_asset_ids: [44],
      },
    ])
    expect(new Set(result.bindings.map((binding: any) => binding.reference_id)).size).toBe(3)
    expect(result.bindings.filter((binding: any) => binding.url === '/api/assets/media/shared.png')).toHaveLength(2)
    expect(result.bindings.some((binding: any) => binding.reference_id === 'asset-33-ref')).toBe(false)
    expect(persisted).toEqual(persistedSnapshot)
    expect(incoming).toEqual(incomingSnapshot)
    expect(result.bindings[0]).not.toBe(persisted[0])
    expect(result.bindings[0].source_asset_ids).not.toBe(persisted[0].source_asset_ids)
  })

  test('keeps stable connected-source identity across reruns without leaking UI identity into canonical payloads', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const buildIncomingSnapshot = module.buildGenerateNodeIncomingContextSnapshot
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    const updateRole = module.updateGenerateNodeReferenceBindingRole
    const reorderBindings = module.reorderGenerateNodeReferenceBindings
    const reconcileBindings = module.reconcileGenerateNodeReferenceBindings
    const buildPersistence = module.buildGenerateNodeReferencePersistencePayload
    const buildPreviewAssets = module.buildGenerateNodeSkillCompileAssets
    const buildReferencePayload = module.buildGenerateNodeReferencePayload
    const edges = [
      { id: 'edge-a', source: 'source-a', target: 'target', targetHandle: 'image' },
      { id: 'edge-b', source: 'source-b', target: 'target', targetHandle: 'image' },
    ]
    const initialSnapshot = buildIncomingSnapshot({
      nodeId: 'target',
      edges,
      nodes: [
        { id: 'source-a', data: { result: { content: '/a-v1.png', source_asset_ids: [11] } } },
        { id: 'source-b', data: { result: { content: '/shared.png', source_asset_ids: [22] } } },
      ],
    })
    const initial = normalizeBindings(undefined, initialSnapshot.incomingAssets)
    const roleA = updateRole(initial, initial[0].reference_id, 'character').bindings
    const roleB = updateRole(roleA, roleA[1].reference_id, 'style').bindings
    const reordered = reorderBindings(roleB, 1, 0)
    const persisted = buildPersistence(reordered).reference_bindings
    const persistedSnapshot = JSON.parse(JSON.stringify(persisted))

    expect(persisted.map((binding: any) => binding.source_edge_id)).toEqual(['edge-b', 'edge-a'])
    const rerunSnapshot = buildIncomingSnapshot({
      nodeId: 'target',
      edges,
      nodes: [
        { id: 'source-a', data: { result: { content: '/shared.png', source_asset_ids: [111] } } },
        { id: 'source-b', data: { result: { content: '/shared.png', source_asset_ids: [22] } } },
      ],
    })
    const reconciled = reconcileBindings(persisted, rerunSnapshot.incomingAssets, { incomingComplete: true })

    expect(reconciled.validationError).toBeNull()
    expect(reconciled.bindings).toMatchObject([
      {
        reference_id: initial[1].reference_id,
        reference_role: 'style',
        url: '/api/assets/media/shared.png',
        source_asset_ids: [22],
        source_edge_id: 'edge-b',
      },
      {
        reference_id: initial[0].reference_id,
        reference_role: 'character',
        url: '/api/assets/media/shared.png',
        source_asset_ids: [111],
        source_edge_id: 'edge-a',
      },
    ])
    expect(reconciled.bindings).toHaveLength(2)
    expect(persisted).toEqual(persistedSnapshot)

    const canonicalOutputs = [
      buildPreviewAssets(reconciled.bindings),
      buildReferencePayload(reconciled.bindings),
      buildGenerateNodeRequestPayload({
        id: 'identity-transport', prompt: 'rerun', selectedKey: 7, provider: 'provider-a', selectedModel: 'model-a',
        mode: 'image_to_image', routingStrategy: 'balanced', params: {}, temperature: 0.7,
        ratioSize: '1024*1024', selectedRolePrompt: 'director', referenceBindings: reconciled.bindings,
      } as any),
      buildGenerateNodeAssetPayload({
        resultContent: '/generated.png', mode: 'image_to_image', prompt: 'rerun', selectedModel: 'model-a',
        provider: 'provider-a', selectedRolePrompt: 'director', params: {}, temperature: 0.7,
        aspectRatio: '1:1', ratioSize: '1024*1024', referenceBindings: reconciled.bindings,
      } as any),
    ]
    for (const output of canonicalOutputs) {
      const serialized = JSON.stringify(output)
      expect(serialized).not.toContain('source_edge_id')
      expect(serialized).not.toContain('source_node_id')
      expect(serialized).not.toContain('source_handle')
    }
  })

  test('keeps persisted bindings while linked React Flow sources are unresolved, then removes true disconnects', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    const reconcileBindings = module.reconcileGenerateNodeReferenceBindings
    const buildIncomingSnapshot = module.buildGenerateNodeIncomingContextSnapshot
    expect(typeof reconcileBindings).toBe('function')
    expect(typeof buildIncomingSnapshot).toBe('function')
    if (typeof reconcileBindings !== 'function' || typeof buildIncomingSnapshot !== 'function') return

    const persisted = normalizeBindings([
      { type: 'image', url: '/persisted.png', reference_id: 'persisted-ref', reference_role: 'character', source_asset_ids: [71] },
    ], [])
    const unresolved = buildIncomingSnapshot({
      nodeId: 'target',
      edges: [{ id: 'edge-unresolved', source: 'source-not-mounted', target: 'target', targetHandle: 'image' }],
      nodes: [],
    })
    expect(unresolved).toMatchObject({
      incomingAssets: [],
      referenceEdgeCount: 1,
      resolvedReferenceEdgeCount: 0,
      unresolvedReferenceEdgeCount: 1,
      referenceValidationError: null,
    })
    expect(reconcileBindings(persisted, unresolved.incomingAssets, {
      incomingComplete: unresolved.unresolvedReferenceEdgeCount === 0,
    })).toEqual({ bindings: persisted, validationError: null })

    const disconnected = buildIncomingSnapshot({ nodeId: 'target', edges: [], nodes: [] })
    expect(disconnected).toMatchObject({
      incomingAssets: [],
      referenceEdgeCount: 0,
      resolvedReferenceEdgeCount: 0,
      unresolvedReferenceEdgeCount: 0,
      referenceValidationError: null,
    })
    expect(reconcileBindings(persisted, disconnected.incomingAssets, {
      incomingComplete: disconnected.unresolvedReferenceEdgeCount === 0,
    })).toEqual({ bindings: [], validationError: null })
  })

  test('treats mounted empty or malformed reference sources as resolved invalid inputs and removes their stale bindings', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    const reconcileBindings = module.reconcileGenerateNodeReferenceBindings
    const buildIncomingSnapshot = module.buildGenerateNodeIncomingContextSnapshot
    const persisted = normalizeBindings([
      {
        type: 'image', url: '/valid-v1.png', reference_id: 'valid-ref', reference_role: 'character',
        source_asset_ids: [71], source_edge_id: 'edge-valid', source_node_id: 'source-valid',
      },
      {
        type: 'image', url: '/empty-v1.png', reference_id: 'empty-ref', reference_role: 'scene',
        source_asset_ids: [72], source_edge_id: 'edge-empty', source_node_id: 'source-empty',
      },
      {
        type: 'prompt', content: 'old prompt', reference_id: 'malformed-ref', reference_role: 'prompt_context',
        source_asset_ids: [73], source_edge_id: 'edge-malformed', source_node_id: 'source-malformed',
      },
    ], [])
    const snapshot = buildIncomingSnapshot({
      nodeId: 'target',
      edges: [
        { id: 'edge-valid', source: 'source-valid', target: 'target', targetHandle: 'image' },
        { id: 'edge-empty', source: 'source-empty', target: 'target', targetHandle: 'image' },
        { id: 'edge-malformed', source: 'source-malformed', target: 'target', targetHandle: 'text' },
      ],
      nodes: [
        { id: 'source-valid', data: { result: { content: '/valid-v2.png', source_asset_ids: [171] } } },
        { id: 'source-empty', data: { result: { content: '   ', source_asset_ids: [172] } } },
        { id: 'source-malformed', data: { result: { content: { unexpected: true }, source_asset_ids: [173] } } },
      ],
    })

    expect(snapshot).toMatchObject({
      referenceEdgeCount: 3,
      resolvedReferenceEdgeCount: 3,
      unresolvedReferenceEdgeCount: 0,
      referenceValidationError: {
        error_code: 'REFERENCE_ASSET_INVALID',
      },
    })
    expect(snapshot.incomingAssets).toMatchObject([
      {
        type: 'image', url: '/api/assets/media/valid-v2.png', source_asset_ids: [171],
        source_edge_id: 'edge-valid', source_node_id: 'source-valid',
      },
    ])

    const reconciled = reconcileBindings(persisted, snapshot.incomingAssets, {
      incomingComplete: snapshot.unresolvedReferenceEdgeCount === 0,
    })
    expect(reconciled.validationError).toBeNull()
    expect(reconciled.bindings).toMatchObject([
      {
        reference_id: 'valid-ref', reference_role: 'character', url: '/api/assets/media/valid-v2.png',
        source_asset_ids: [171], source_edge_id: 'edge-valid',
      },
    ])
  })

  test('flows role and order edits through persistence, hydration, preview assets, request payload, and compile fingerprint', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    const reorderBindings = module.reorderGenerateNodeReferenceBindings
    const updateRole = module.updateGenerateNodeReferenceBindingRole
    const buildPersistence = module.buildGenerateNodeReferencePersistencePayload
    const reconcileBindings = module.reconcileGenerateNodeReferenceBindings
    const buildFingerprint = module.buildGenerateNodeReferenceBindingsFingerprint
    const buildPreviewAssets = module.buildGenerateNodeSkillCompileAssets
    for (const helper of [updateRole, buildPersistence, reconcileBindings, buildFingerprint, buildPreviewAssets]) {
      expect(typeof helper).toBe('function')
    }
    if ([updateRole, buildPersistence, reconcileBindings, buildFingerprint, buildPreviewAssets].some(helper => typeof helper !== 'function')) return

    const incoming = [
      { id: 51, type: 'image', url: '/api/assets/media/first.png', source_asset_ids: [51] },
      { id: 52, type: 'image', url: '/api/assets/media/second.png', source_asset_ids: [52] },
    ]
    const initial = normalizeBindings(undefined, incoming)
    const roleUpdate = updateRole(initial, initial[1].reference_id, 'last_frame')
    expect(roleUpdate.validationError).toBeNull()
    const reordered = reorderBindings(roleUpdate.bindings, 1, 0)
    const persistence = buildPersistence(reordered)

    expect(persistence.referenceBindings).toEqual(reordered)
    expect(persistence.reference_bindings).toEqual(reordered)
    expect(persistence.referenceBindings).not.toBe(persistence.reference_bindings)
    expect(persistence.referenceBindings[0].source_asset_ids).not.toBe(persistence.reference_bindings[0].source_asset_ids)

    const hydrated = reconcileBindings(persistence.reference_bindings, incoming)
    expect(hydrated.validationError).toBeNull()
    expect(hydrated.bindings.map((binding: any) => [binding.reference_id, binding.reference_role])).toEqual([
      [initial[1].reference_id, 'last_frame'],
      [initial[0].reference_id, 'general'],
    ])

    const previewAssets = buildPreviewAssets(hydrated.bindings)
    const requestPayload = buildGenerateNodeRequestPayload({
      id: 'node-reference-flow',
      prompt: '保持连续性',
      selectedKey: 7,
      provider: 'provider-a',
      selectedModel: 'model-a',
      mode: 'image_to_video',
      routingStrategy: 'balanced',
      params: {},
      temperature: 0.7,
      ratioSize: '1280*720',
      selectedRolePrompt: 'director',
      referenceBindings: hydrated.bindings,
    } as any)
    expect(previewAssets).toEqual(hydrated.bindings)
    expect(requestPayload.params.incoming_assets).toEqual(previewAssets)

    const initialFingerprint = buildFingerprint(initial)
    const editedFingerprint = buildFingerprint(hydrated.bindings)
    expect(editedFingerprint).not.toBe(initialFingerprint)
    expect(JSON.parse(editedFingerprint)).toEqual(hydrated.bindings.map((binding: any) => ({
      reference_index: binding.reference_index,
      reference_id: binding.reference_id,
      reference_role: binding.reference_role,
      type: binding.type,
      url: binding.url ?? null,
      content: binding.content ?? null,
      source_asset_ids: binding.source_asset_ids ?? [],
    })))
  })

  test('returns typed validation state without polluting bindings on invalid incoming or role edits', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    const reconcileBindings = module.reconcileGenerateNodeReferenceBindings
    const updateRole = module.updateGenerateNodeReferenceBindingRole
    expect(typeof reconcileBindings).toBe('function')
    expect(typeof updateRole).toBe('function')
    if (typeof reconcileBindings !== 'function' || typeof updateRole !== 'function') return

    const existing = normalizeBindings([
      { type: 'image', url: '/first.png', reference_id: 'first', reference_role: 'first_frame' },
      { type: 'image', url: '/second.png', reference_id: 'second' },
    ], [])
    const snapshot = JSON.parse(JSON.stringify(existing))
    const invalidIncoming = Array.from({ length: 10 }, (_, index) => ({
      id: 100 + index,
      type: 'image',
      url: `/incoming-${index + 1}.png`,
      source_asset_ids: [100 + index],
    }))

    const reconcileResult = reconcileBindings(existing, invalidIncoming)
    expect(reconcileResult.bindings).toEqual(snapshot)
    expect(reconcileResult.validationError).toMatchObject({ error_code: 'REFERENCE_LIMIT_EXCEEDED' })

    const roleResult = updateRole(existing, 'second', 'first_frame')
    expect(roleResult.bindings).toEqual(snapshot)
    expect(roleResult.validationError).toMatchObject({ error_code: 'REFERENCE_ROLE_INVALID' })
    expect(existing).toEqual(snapshot)
  })

  test('blocks run but keeps Skill preview eligible for typed provider multi-reference incompatibility', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const parseCompatibilityError = module.parseGenerateNodeExecutionCompatibilityError
    const resolveBlockState = module.resolveGenerateNodeExecutionBlockState
    expect(typeof parseCompatibilityError).toBe('function')
    expect(typeof resolveBlockState).toBe('function')
    if (typeof parseCompatibilityError !== 'function' || typeof resolveBlockState !== 'function') return

    const unsupported = parseCompatibilityError({
      response: { data: { error_code: 'MULTI_REFERENCE_UNSUPPORTED', detail: 'provider accepts one image only' } },
    })
    expect(unsupported).toEqual({
      error_code: 'MULTI_REFERENCE_UNSUPPORTED',
      detail: 'provider accepts one image only',
    })
    expect(parseCompatibilityError({
      error_code: 'MULTI_REFERENCE_MAPPING_REQUIRED',
      error: 'route needs a reference mapping',
    })).toEqual({
      error_code: 'MULTI_REFERENCE_MAPPING_REQUIRED',
      detail: 'route needs a reference mapping',
    })
    expect(parseCompatibilityError({ error_code: 'SKILL_MODE_INCOMPATIBLE', detail: 'not a provider execution error' })).toBeNull()

    expect(resolveBlockState({ executionCompatibilityError: unsupported })).toEqual({
      previewBlocked: false,
      runBlocked: true,
    })
    expect(resolveBlockState({ skillBlocked: true, executionCompatibilityError: unsupported })).toEqual({
      previewBlocked: true,
      runBlocked: true,
    })
    expect(resolveBlockState({ referenceValidationError: { error_code: 'REFERENCE_MEDIA_UNSUPPORTED', detail: 'video pending' } })).toEqual({
      previewBlocked: true,
      runBlocked: true,
    })
  })

  test('gates programmatic runs with the shared block state before starting any transport', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const resolveBlockState = module.resolveGenerateNodeExecutionBlockState
    expect(resolveBlockState({
      executionCompatibilityError: { error_code: 'MULTI_REFERENCE_UNSUPPORTED', detail: 'provider accepts one image only' },
    })).toMatchObject({ previewBlocked: false, runBlocked: true })
    expect(resolveBlockState({
      referenceValidationError: { error_code: 'REFERENCE_ASSET_INVALID', detail: 'empty mounted source' },
    })).toMatchObject({ previewBlocked: true, runBlocked: true })

    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const handleRunStart = source.indexOf('const handleRun = async () => {')
    const runSignalEffectStart = source.indexOf('useEffect(() => {', handleRunStart)
    const handleRunSource = source.slice(handleRunStart, runSignalEffectStart)
    expect(handleRunSource).toContain('if (runBlocked) {')
    expect(handleRunSource.indexOf('if (runBlocked) {')).toBeLessThan(handleRunSource.indexOf('if (!selectedKey || !selectedModel)'))
    expect(handleRunSource.indexOf('if (runBlocked) {')).toBeLessThan(handleRunSource.indexOf('createSSEClient'))
    expect(handleRunSource).toContain('executionCompatibilityError.error_code')
    expect(handleRunSource).toContain('effectiveReferenceValidationError.error_code')

    const runSignalSource = source.slice(runSignalEffectStart, source.indexOf('const handleInterrupt', runSignalEffectStart))
    expect(runSignalSource).toContain('void handleRun()')
  })

  test('freezes canonical execution references and deduped lineage without mutating inputs', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    const freezeExecutionReferences = module.freezeGenerateNodeExecutionReferences
    expect(typeof freezeExecutionReferences).toBe('function')
    if (typeof freezeExecutionReferences !== 'function') return

    const executionBindings = normalizeBindings([
      {
        type: 'image', url: '/reference.png', reference_id: 'reference-a', reference_role: 'character',
        source_asset_ids: [11, 22], source_edge_id: 'edge-a', source_node_id: 'source-a', source_handle: 'out',
      },
      {
        type: 'prompt', content: 'ink style', reference_id: 'reference-b', reference_role: 'style',
        source_asset_ids: [22, 33], source_edge_id: 'edge-b', source_node_id: 'source-b',
      },
    ], [])
    const packet = { content: '/generated.png', source_asset_ids: [99, 11] }
    const executionSnapshot = JSON.parse(JSON.stringify(executionBindings))
    const packetSnapshot = JSON.parse(JSON.stringify(packet))

    const frozen = freezeExecutionReferences(packet, executionBindings)
    expect(frozen.reference_bindings).toEqual([
      {
        reference_index: 1, reference_id: 'reference-a', reference_role: 'character', type: 'image',
        url: '/api/assets/media/reference.png', source_asset_ids: [11, 22],
      },
      {
        reference_index: 2, reference_id: 'reference-b', reference_role: 'style', type: 'prompt',
        content: 'ink style', source_asset_ids: [22, 33],
      },
    ])
    expect(frozen.source_asset_ids).toEqual([99, 11, 22, 33])
    expect(JSON.stringify(frozen)).not.toContain('source_edge_id')
    expect(executionBindings).toEqual(executionSnapshot)
    expect(packet).toEqual(packetSnapshot)

    executionBindings[0].url = '/changed-after-run.png'
    executionBindings[0].source_asset_ids![0] = 777
    packet.source_asset_ids[0] = 888
    expect(frozen.reference_bindings[0]).toMatchObject({
      url: '/api/assets/media/reference.png', source_asset_ids: [11, 22],
    })
    expect(frozen.source_asset_ids).toEqual([99, 11, 22, 33])
  })

  test('uses the active run reference snapshot for result, downstream, and saved provenance', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    expect(source).toContain('const activeRunReferenceBindingsRef = useRef<GenerateNodeReferenceBinding[] | null>(null)')

    const handleRunStart = source.indexOf('const handleRun = async () => {')
    const runSignalEffectStart = source.indexOf('useEffect(() => {', handleRunStart)
    const handleRunSource = source.slice(handleRunStart, runSignalEffectStart)
    expect(handleRunSource.indexOf('activeRunReferenceBindingsRef.current =')).toBeGreaterThan(-1)
    expect(handleRunSource.indexOf('activeRunReferenceBindingsRef.current =')).toBeLessThan(handleRunSource.indexOf('createSSEClient'))

    const finishStart = source.indexOf('const finishGeneration =')
    const failStart = source.indexOf('const failGeneration =', finishStart)
    const finishSource = source.slice(finishStart, failStart)
    expect(finishSource).toContain('freezeGenerateNodeExecutionReferences')
    expect(finishSource).toContain('activeRunReferenceBindingsRef.current')
    expect(finishSource).toContain('result: finalResult')
    expect(finishSource).toContain('incoming_data: finalResult')
    expect(finishSource).toContain('activeRunReferenceBindingsRef.current = null')

    const failSource = source.slice(failStart, source.indexOf('const handleSSEMessage', failStart))
    expect(failSource).toContain('activeRunReferenceBindingsRef.current = null')

    const saveStart = source.indexOf('const handleSaveToAsset =')
    const saveEnd = source.indexOf('const commitReferenceBindings =', saveStart)
    const saveSource = source.slice(saveStart, saveEnd)
    expect(saveSource).toContain('Array.isArray(result?.reference_bindings)')
    expect(saveSource).toContain('const savedReferenceBindings =')
    expect(saveSource).toContain('referenceBindings: savedReferenceBindings')

    const skillAuditKeysSource = source.slice(source.indexOf('const SKILL_AUDIT_KEYS ='), source.indexOf('function withoutSkillAudit'))
    expect(skillAuditKeysSource).not.toContain("'reference_bindings'")
  })

  test('preserves compiler-owned reference audit fields across packets and asset provenance', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    const referenceBindings = normalizeBindings([
      { type: 'image', url: '/reference.png', reference_id: 'reference-a', reference_role: 'character', source_asset_ids: [91] },
    ], [])
    const normalizedPacket = normalizeGenerateNodeGenerationPacket({
      data: {
        result: {
          content: '/generated.png',
          compiled_prompt: 'compiled',
          reference_bindings: referenceBindings,
          reference_mode_hint: 'Ref2VA',
        },
      },
    })
    expect(normalizedPacket.reference_bindings).toEqual(referenceBindings)
    expect(normalizedPacket.reference_mode_hint).toBe('Ref2VA')

    const asset = buildGenerateNodeAssetPayload({
      resultContent: '/generated.png',
      mode: 'image_to_image',
      prompt: '角色一致',
      selectedModel: 'image-model',
      provider: 'provider-a',
      selectedRolePrompt: 'director',
      params: {},
      temperature: 0.7,
      aspectRatio: '1:1',
      ratioSize: '1024*1024',
      referenceBindings,
      referenceModeHint: 'Ref2VA',
    } as any)
    expect(asset.data.reference_bindings).toEqual(referenceBindings)
    expect(asset.data.reference_mode_hint).toBe('Ref2VA')
  })

  test('wires ordered reference state, media-only controls, shared preview/run assets, and compatibility UX', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')

    expect(source).toContain('const [referenceBindings, setReferenceBindings]')
    expect(source).toContain('data?.referenceBindings ?? data?.reference_bindings')
    expect(source).toContain('const [referenceValidationError, setReferenceValidationError]')
    expect(source).toContain('const [executionCompatibilityError, setExecutionCompatibilityError]')
    expect(source).toContain('buildGenerateNodeReferencePersistencePayload(referenceBindings)')
    expect(source).toContain('reconcileGenerateNodeReferenceBindings')
    expect(source).toContain('buildGenerateNodeReferenceBindingsFingerprint(referenceBindings)')
    expect(source).toContain('buildGenerateNodeSkillCompileAssets(referenceBindings)')
    expect(source).toContain('referenceBindings,')
    expect(source).not.toContain('incoming_assets: incomingAssets.map')
    expect(source).toContain("key: 'references'")
    expect(source).toContain("label: '参考素材'")
    expect(source).toContain('GENERATE_NODE_REFERENCE_ROLE_OPTIONS')
    expect(source).toContain('binding.reference_index')
    expect(source).toContain('binding.source_asset_ids')
    expect(source).toContain('handleReferenceRoleChange')
    expect(source).toContain('handleReferenceReorder')
    expect(source).toContain('referenceModeHint')
    expect(source).toContain('参考模式提示')
    expect(source).toContain('编译哈希')
    expect(source).toContain('executionCompatibilityError.error_code')
    expect(source).toContain('executionCompatibilityError.detail')
    expect(source).toContain('disabled={!hasEffectiveSkill || previewBlocked}')
    expect(source).toContain('disabled={isMuted || (!generating && runBlocked)}')
  })

  test('revalidates the current incoming collection after local role and order edits', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')

    expect(source).toContain('const commitReferenceBindings =')
    expect(source).toContain('commitReferenceBindings(next.bindings)')
    expect(source).toContain('commitReferenceBindings(reorderGenerateNodeReferenceBindings')
  })

  test('does not replay live reconciliation over the initial hydrated validation state', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')

    expect(source).toContain('const reconciledIncomingFingerprintRef = useRef(incomingContext.fingerprint)')
    expect(source).toContain('if (reconciledIncomingFingerprintRef.current === incomingContext.fingerprint) return')
  })

  test('keeps normalized compiler reference audit in scope for result persistence', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const finishGeneration = source.slice(source.indexOf('const finishGeneration ='))

    expect(finishGeneration.indexOf('const compilerOwnedBindings')).toBeLessThan(
      finishGeneration.indexOf('if (finalResult?.compiled_prompt !== undefined)'),
    )
  })
})

describe('GenerateNode Skill review regressions', () => {
  test('accepts only the latest Skill preview request for the current fingerprint', async () => {
    const module = await import('./GenerateNode')
    const createGenerateNodePreviewRequestTracker = (module as any).createGenerateNodePreviewRequestTracker
    expect(typeof createGenerateNodePreviewRequestTracker).toBe('function')
    if (typeof createGenerateNodePreviewRequestTracker !== 'function') return

    const tracker = createGenerateNodePreviewRequestTracker()
    const requestA = tracker.start('fingerprint-a')
    expect(tracker.isCurrent(requestA, 'fingerprint-a')).toBe(true)

    tracker.invalidate()
    expect(tracker.isCurrent(requestA, 'fingerprint-a')).toBe(false)

    const requestB = tracker.start('fingerprint-b')
    const requestB2 = tracker.start('fingerprint-b')
    expect(tracker.isCurrent(requestB, 'fingerprint-b')).toBe(false)
    expect(tracker.isCurrent(requestB2, 'fingerprint-b')).toBe(true)
    expect(tracker.isCurrent(requestB2, 'fingerprint-c')).toBe(false)

    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    expect(source).toContain('skillPreviewRequestTrackerRef.current.isCurrent')
    expect(source).toContain('compileInputFingerprintRef.current')
  })

  test('subscribes to a semantic incoming-context snapshot for Skill audit invalidation', async () => {
    const module = await import('./GenerateNode')
    const buildGenerateNodeIncomingContextSnapshot = (module as any).buildGenerateNodeIncomingContextSnapshot
    expect(typeof buildGenerateNodeIncomingContextSnapshot).toBe('function')
    if (typeof buildGenerateNodeIncomingContextSnapshot !== 'function') return

    const edges = [
      { id: 'edge-text', source: 'source-text', target: 'target', targetHandle: 'text' },
      { id: 'edge-system', source: 'source-system', target: 'target', targetHandle: 'system' },
    ]
    const nodes = [
      { id: 'source-text', data: { result: { content: 'hero', source_asset_ids: [11] } } },
      { id: 'source-system', data: { incoming_data: { content: 'director', source_asset_ids: [12] } } },
      { id: 'unrelated', data: { result: { content: 'ignored' } } },
    ]
    const initial = buildGenerateNodeIncomingContextSnapshot({ nodeId: 'target', edges, nodes })
    expect(initial).toMatchObject({
      incomingAssets: [{ id: 11, type: 'prompt', content: 'hero', source_asset_ids: [11] }],
      externalSystemPrompt: 'director',
    })

    const contentChanged = buildGenerateNodeIncomingContextSnapshot({
      nodeId: 'target',
      edges,
      nodes: nodes.map(node => node.id === 'source-text' ? { ...node, data: { result: { content: 'villain', source_asset_ids: [11] } } } : node),
    })
    expect(contentChanged.fingerprint).not.toBe(initial.fingerprint)

    const lineageChanged = buildGenerateNodeIncomingContextSnapshot({
      nodeId: 'target',
      edges,
      nodes: nodes.map(node => node.id === 'source-text' ? { ...node, data: { result: { content: 'hero', source_asset_ids: [99] } } } : node),
    })
    expect(lineageChanged.fingerprint).not.toBe(initial.fingerprint)

    const unrelatedChanged = buildGenerateNodeIncomingContextSnapshot({
      nodeId: 'target',
      edges,
      nodes: nodes.map(node => node.id === 'unrelated' ? { ...node, data: { result: { content: 'changed but irrelevant' } } } : node),
    })
    expect(unrelatedChanged.fingerprint).toBe(initial.fingerprint)

    const disconnected = buildGenerateNodeIncomingContextSnapshot({ nodeId: 'target', edges: [], nodes })
    expect(disconnected.fingerprint).not.toBe(initial.fingerprint)

    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    expect(source).toContain('const incomingContext = useStore(')
    expect(source).toContain('state.nodeInternals')
    expect(source).not.toContain('const collectIncomingContext = () => {')
  })

  test('invalidates first-mount compile audit only when canonical reconciled references changed', async () => {
    const module = await import('./GenerateNode')
    const normalizeBindings = (module as any).normalizeGenerateNodeReferenceBindings
    const reconcileBindings = (module as any).reconcileGenerateNodeReferenceBindings
    const shouldInvalidateInitialAudit = (module as any).shouldInvalidateGenerateNodeInitialCompileAudit
    expect(typeof shouldInvalidateInitialAudit).toBe('function')
    if (typeof shouldInvalidateInitialAudit !== 'function') return

    const persisted = normalizeBindings([
      {
        type: 'image', url: '/old.png', reference_id: 'reference-a', reference_role: 'character',
        source_asset_ids: [11], source_edge_id: 'edge-a', source_node_id: 'source-a',
      },
    ], [])
    const changed = reconcileBindings(persisted, [
      {
        type: 'image', url: '/new.png', source_asset_ids: [22],
        source_edge_id: 'edge-a', source_node_id: 'source-a',
      },
    ], { incomingComplete: true })
    expect(changed.validationError).toBeNull()
    expect(shouldInvalidateInitialAudit(persisted, changed.bindings)).toBe(true)

    const unchanged = reconcileBindings(persisted, [
      {
        type: 'image', url: '/old.png', source_asset_ids: [11],
        source_edge_id: 'edge-a', source_node_id: 'source-a',
      },
    ], { incomingComplete: true })
    expect(unchanged.validationError).toBeNull()
    expect(shouldInvalidateInitialAudit(persisted, unchanged.bindings)).toBe(false)

    const identityMigration = reconcileBindings([
      {
        type: 'image', url: '/old.png', reference_id: 'reference-a', reference_role: 'character', source_asset_ids: [11],
      },
    ], [
      {
        type: 'image', url: '/old.png', source_asset_ids: [11],
        source_edge_id: 'edge-a', source_node_id: 'source-a',
      },
    ], { incomingComplete: true })
    expect(shouldInvalidateInitialAudit(persisted.map(({ source_edge_id: _edge, source_node_id: _node, ...binding }: any) => binding), identityMigration.bindings)).toBe(false)

    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    expect(source).toContain('const initialReferenceBindingsChangedRef = useRef(')
    expect(source).toContain('initialReferenceBindingsChangedRef.current = false')
    expect(source).toContain('if (previous === null && !initialReferenceBindingsChanged) return')
  })

  test('normalizes and persists command Skill arguments independently across canvas reloads', async () => {
    const module = await import('./GenerateNode')
    const normalizeGenerateNodeCommandSkillArgumentsByCommand = (module as any).normalizeGenerateNodeCommandSkillArgumentsByCommand
    const resolveGenerateNodeSkillArguments = (module as any).resolveGenerateNodeSkillArguments
    expect(typeof normalizeGenerateNodeCommandSkillArgumentsByCommand).toBe('function')
    expect(typeof resolveGenerateNodeSkillArguments).toBe('function')
    if (typeof normalizeGenerateNodeCommandSkillArgumentsByCommand !== 'function') return

    expect(normalizeGenerateNodeCommandSkillArgumentsByCommand(undefined)).toEqual({})
    expect(normalizeGenerateNodeCommandSkillArgumentsByCommand([])).toEqual({})
    const persisted = normalizeGenerateNodeCommandSkillArgumentsByCommand({
      ':other-skill': { style: 'ink', empty: '', numeric: 7 },
      'pack-a:other-skill': { tone: 'dark' },
      invalid_key: { ignored: 'value' },
      ':broken': null,
    })
    expect(persisted).toEqual({
      ':other-skill': { style: 'ink', empty: '' },
      'pack-a:other-skill': { tone: 'dark' },
    })
    expect(resolveGenerateNodeSkillArguments({
      command: parseCanvasSkillCommand('/other-skill hero'),
      commandSkillArguments: persisted[':other-skill'],
      effectiveSkillArgumentSpecs: [{ name: 'style' }],
    })).toEqual({ style: 'ink' })

    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    expect(source).toContain('normalizeGenerateNodeCommandSkillArgumentsByCommand(data?.commandSkillArgumentsByCommand ?? data?.command_skill_arguments_by_command)')
    expect(source).toContain('commandSkillArgumentsByCommand,')
    expect(source).toContain('command_skill_arguments_by_command: commandSkillArgumentsByCommand,')
  })

  test('keeps command Skill arguments completely isolated from dropdown Skill arguments', async () => {
    const module = await import('./GenerateNode')
    const resolveGenerateNodeSkillArguments = (module as any).resolveGenerateNodeSkillArguments
    expect(typeof resolveGenerateNodeSkillArguments).toBe('function')
    if (typeof resolveGenerateNodeSkillArguments !== 'function') return
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    expect(source).toContain('const [commandSkillArgumentsByCommand, setCommandSkillArgumentsByCommand]')
    expect(source).toContain("value={effectiveSkillArguments?.[argument.name] ?? argument.default ?? ''}")
    expect(source).toContain('onChange={event => setEffectiveSkillArgument(argument.name, event.target.value)}')

    const command = parseCanvasSkillCommand('/other-skill hero')
    expect(resolveGenerateNodeSkillArguments({
      command,
      skillArguments: { stale_only: 'old', style: 'anime' },
      effectiveSkillArgumentSpecs: [{ name: 'style' }],
    })).toBeUndefined()
    expect(resolveGenerateNodeSkillArguments({
      command,
      skillArguments: { stale_only: 'old', style: 'anime' },
      commandSkillArguments: { stale_only: 'command-only', style: 'ink' },
      effectiveSkillArgumentSpecs: [{ name: 'style' }],
    })).toEqual({ style: 'ink' })
    expect(resolveGenerateNodeSkillArguments({
      command: null,
      skillArguments: { stale_only: 'selected-skill-value' },
    })).toEqual({ stale_only: 'selected-skill-value' })

    const payload = buildGenerateNodeRequestPayload({
      id: 'node-command-arguments',
      prompt: '/other-skill hero',
      selectedKey: 7,
      provider: 'skill-provider',
      selectedModel: 'image-model',
      mode: 'text_to_image',
      routingStrategy: 'balanced',
      params: {},
      temperature: 0.7,
      ratioSize: '1024*1024',
      selectedRolePrompt: 'visual director',
      skillName: 'stale-dropdown-skill',
      skillPackId: 'stale-pack',
      skillArguments: { stale_only: 'old', style: 'anime' },
      effectiveSkillArgumentSpecs: [{ name: 'style' }],
    } as any)
    expect('skill_arguments' in payload).toBe(false)

    const explicitCommandPayload = buildGenerateNodeRequestPayload({
      id: 'node-explicit-command-arguments',
      prompt: '/other-skill hero',
      selectedKey: 7,
      provider: 'skill-provider',
      selectedModel: 'image-model',
      mode: 'text_to_image',
      routingStrategy: 'balanced',
      params: {},
      temperature: 0.7,
      ratioSize: '1024*1024',
      selectedRolePrompt: 'visual director',
      skillArguments: { style: 'anime' },
      commandSkillArguments: { style: 'ink' },
      effectiveSkillArgumentSpecs: [{ name: 'style' }],
    } as any)
    expect(explicitCommandPayload.skill_arguments).toEqual({ style: 'ink' })
  })

  test('normalizes nullable compiler model IDs without converting null to zero', async () => {
    const module = await import('./GenerateNode')
    const normalizeGenerateNodeCompilerModelId = (module as any).normalizeGenerateNodeCompilerModelId
    expect(typeof normalizeGenerateNodeCompilerModelId).toBe('function')
    if (typeof normalizeGenerateNodeCompilerModelId !== 'function') return

    expect(normalizeGenerateNodeCompilerModelId(null)).toBeNull()
    expect(normalizeGenerateNodeCompilerModelId(undefined)).toBeNull()
    expect(normalizeGenerateNodeCompilerModelId('')).toBeNull()
    expect(normalizeGenerateNodeCompilerModelId(0)).toBe(0)
    expect(normalizeGenerateNodeCompilerModelId('7')).toBe(7)
    expect(normalizeGenerateNodeCompilerModelId('invalid')).toBeNull()
    expect(normalizeGenerateNodeCompilerModelId(-1)).toBeNull()
  })

  test('builds command identity from the resolved Pack and revision without stale dropdown fallback', async () => {
    const module = await import('./GenerateNode')
    const buildGenerateNodeSkillIdentity = (module as any).buildGenerateNodeSkillIdentity
    expect(typeof buildGenerateNodeSkillIdentity).toBe('function')
    if (typeof buildGenerateNodeSkillIdentity !== 'function') return

    expect(buildGenerateNodeSkillIdentity({
      command: parseCanvasSkillCommand('/other-skill hero'),
      selectedPackId: 'stale-pack',
      selectedName: 'stale-skill',
      selectedRevision: 'stale-revision',
      resolvedCommandSkill: { packId: 'pack-b', name: 'other-skill', revision: 'rev-b' },
    })).toEqual({ packId: 'pack-b', name: 'other-skill', revision: 'rev-b' })
    expect(buildGenerateNodeSkillIdentity({
      command: parseCanvasSkillCommand('/pack-a:other-skill hero'),
      selectedPackId: 'stale-pack',
      selectedName: 'stale-skill',
      selectedRevision: 'stale-revision',
      resolvedCommandSkill: { packId: 'pack-a', name: 'other-skill', revision: 'rev-a' },
    })).toEqual({ packId: 'pack-a', name: 'other-skill', revision: 'rev-a' })
    expect(buildGenerateNodeSkillIdentity({
      command: parseCanvasSkillCommand('/other-skill hero'),
      selectedPackId: 'stale-pack',
      selectedName: 'stale-skill',
      selectedRevision: 'stale-revision',
    })).toEqual({ packId: '', name: 'other-skill', revision: '' })
  })
})

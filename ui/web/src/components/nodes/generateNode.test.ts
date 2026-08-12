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
import { collectGenerateNodeActiveKeys } from './generate-node-model'
import { useCanvasStore } from '../../stores/canvasStore'

async function loadGenerateNodeReferenceApi() {
  const module = await import('./GenerateNode')
  return module as typeof module & Record<string, any>
}

async function loadGenerateNodeCompilerSelectorApi() {
  const module = await import('./generate-node-model')
  return module as typeof module & Record<string, any>
}

describe('GenerateNode migration behavior', () => {
  test('wires one stable reference-media materializer through every request and save boundary', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const imports = source.slice(0, source.indexOf('const { TextArea }'))
    const componentSetup = source.slice(source.indexOf('function GenerateNodeImpl'), source.indexOf('const cancelChatSkillCompileRun'))
    const previewSource = source.slice(source.indexOf('const handleSkillPreview ='), source.indexOf('const buildPayload ='))
    const handleRunSource = source.slice(source.indexOf('const handleRun = async () => {'), source.indexOf('useEffect(() => {', source.indexOf('const handleRun = async () => {')))
    const chatStart = handleRunSource.indexOf('if (isChatSkillCompileOnly) {')
    const formalStart = handleRunSource.indexOf('if (!selectedKey || !selectedModel)')
    const chatSource = handleRunSource.slice(chatStart, formalStart)
    const formalSource = handleRunSource.slice(formalStart)
    const saveSource = source.slice(source.indexOf('const handleSaveToAsset ='), source.indexOf('const commitReferenceBindings =', source.indexOf('const handleSaveToAsset =')))
    const mountLifecycleStart = source.indexOf('useEffect(() => {\n    generateNodeMountedRef.current = true')
    const mountLifecycleSource = source.slice(mountLifecycleStart, source.indexOf('useEffect(() => {', mountLifecycleStart + 1))

    expect(imports).toContain('createGenerateNodeReferenceMediaMaterializer')
    expect(imports).toContain('GenerateNodeReferenceMediaError')
    expect(imports).toContain("from './generate-node-reference-media'")
    expect(componentSetup).toContain('const referenceMediaMaterializerRef = useRef')
    expect(componentSetup).toContain('if (referenceMediaMaterializerRef.current === null)')
    expect(componentSetup).toContain('referenceMediaMaterializerRef.current = createGenerateNodeReferenceMediaMaterializer({')
    expect(componentSetup).toContain('const response = await fetch(url)')
    expect(componentSetup).toContain('if (!response.ok) throw new Error(`Reference media fetch failed with status ${response.status}`)')
    expect(componentSetup).toContain('return response.blob()')
    expect(componentSetup).toContain("formData.append('file', blob, filename)")
    expect(componentSetup).toContain("apiClient.post('/assets/upload/image', formData)")
    expect(componentSetup).toContain('response.data?.file_path')
    expect(componentSetup).toContain('normalizeGenerateNodeImageUrl(buildAssetMediaUrl(filePath))')
    expect(componentSetup).not.toContain("'Content-Type': 'multipart/form-data'")
    expect(componentSetup).toContain('const materializeExecutionReferenceBindings = async')
    expect(componentSetup).toContain('const materializeGeneratedImageContent = async')
    expect(componentSetup).toContain("if (/^data:image\\//i.test(content)) return referenceMediaMaterializerRef.current!.materializeUrl(content)")
    expect(componentSetup).toContain("if ((generatedResultMode === 'text_to_image' || generatedResultMode === 'image_to_image') && /^blob:/i.test(content))")
    expect(componentSetup).toContain('return content')

    const previewPrepare = previewSource.indexOf('const previewAssets = prepareReferenceBindingsForExecution()')
    const previewStart = previewSource.indexOf('skillPreviewRequestTrackerRef.current.start(compileInputFingerprint)')
    const previewMaterialize = previewSource.indexOf('await materializeExecutionReferenceBindings(previewAssets)')
    const previewCurrentAfterMaterialize = previewSource.indexOf('skillPreviewRequestTrackerRef.current.isCurrent(previewRequest, compileInputFingerprintRef.current)', previewMaterialize)
    const previewCompile = previewSource.indexOf('compileSkillPreview(buildGenerateNodeSkillCompileRequest({')
    expect(previewPrepare).toBeGreaterThan(-1)
    expect(previewPrepare).toBeLessThan(previewStart)
    expect(previewStart).toBeLessThan(previewMaterialize)
    expect(previewMaterialize).toBeLessThan(previewCurrentAfterMaterialize)
    expect(previewCurrentAfterMaterialize).toBeLessThan(previewCompile)
    expect(previewSource).toContain('references: materializedPreviewAssets')
    expect(previewSource).toContain('executionReferences: materializedPreviewAssets')
    expect(mountLifecycleSource).toContain('skillPreviewRequestTrackerRef.current.invalidate()')

    const chatPrepare = chatSource.indexOf('const executableReferenceBindings = prepareReferenceBindingsForExecution()')
    const chatMaterialize = chatSource.indexOf('await materializeExecutionReferenceBindings(executableReferenceBindings)')
    const chatCanonicalize = chatSource.indexOf('buildGenerateNodeCanonicalReferenceBindings(materializedReferenceBindings)')
    const chatCurrentAfterMaterialize = chatSource.indexOf('if (!generateNodeMountedRef.current || executionInputFingerprintRef.current !== runInputFingerprint) return', chatMaterialize)
    const chatRunStart = chatSource.indexOf('generateRunTrackerRef.current.start(executionReferenceBindings)')
    const chatCompiler = chatSource.indexOf('runGenerateNodeChatSkillCompilation({')
    expect(chatPrepare).toBeGreaterThan(-1)
    expect(chatPrepare).toBeLessThan(chatMaterialize)
    expect(chatMaterialize).toBeLessThan(chatCanonicalize)
    expect(chatCanonicalize).toBeLessThan(chatRunStart)
    expect(chatRunStart).toBeLessThan(chatCompiler)
    expect(chatSource).toContain('const runInputFingerprint = executionInputFingerprint')
    expect(chatCurrentAfterMaterialize).toBeGreaterThan(chatMaterialize)
    expect(chatCurrentAfterMaterialize).toBeLessThan(chatCanonicalize)
    expect(chatSource).toContain('references: executionReferenceBindings')
    expect(chatSource).toContain('executionReferences: executionReferenceBindings')

    const formalPrepare = formalSource.indexOf('const executableReferenceBindings = prepareReferenceBindingsForExecution()')
    const formalMaterialize = formalSource.indexOf('await materializeExecutionReferenceBindings(executableReferenceBindings)')
    const formalCanonicalize = formalSource.indexOf('buildGenerateNodeCanonicalReferenceBindings(materializedReferenceBindings)')
    const formalCurrentAfterMaterialize = formalSource.indexOf('if (!generateNodeMountedRef.current || executionInputFingerprintRef.current !== runInputFingerprint) return', formalMaterialize)
    const formalRunStart = formalSource.indexOf('generateRunTrackerRef.current.start(executionReferenceBindings)')
    const formalSse = formalSource.indexOf('createSSEClient')
    const formalPayload = formalSource.indexOf('buildPayload(executionReferenceBindings)')
    const formalTransport = formalSource.indexOf("url: '/generate'")
    expect(formalPrepare).toBeGreaterThan(-1)
    expect(formalPrepare).toBeLessThan(formalMaterialize)
    expect(formalMaterialize).toBeLessThan(formalCanonicalize)
    expect(formalCanonicalize).toBeLessThan(formalRunStart)
    expect(formalRunStart).toBeLessThan(formalSse)
    expect(formalMaterialize).toBeLessThan(formalTransport)
    expect(formalPayload).toBeGreaterThan(formalSse)
    expect(formalPayload).toBeLessThan(formalTransport)
    expect(formalSource).toContain('const runInputFingerprint = executionInputFingerprint')
    expect(formalCurrentAfterMaterialize).toBeGreaterThan(formalMaterialize)
    expect(formalCurrentAfterMaterialize).toBeLessThan(formalCanonicalize)

    const saveMaterialize = saveSource.indexOf('await materializeGeneratedImageContent(String(result.content))')
    const savePost = saveSource.indexOf("apiClient.post('/assets/'")
    expect(saveMaterialize).toBeGreaterThan(-1)
    expect(saveMaterialize).toBeLessThan(savePost)
    expect(saveSource).toContain('resultContent: persistedResultContent')
    expect(saveSource).toContain('const generatedResultMode = String(result?.source_mode || mode)')
    expect(saveSource).toContain('mode: generatedResultMode')

    const finishSource = source.slice(source.indexOf('const finishGeneration ='), source.indexOf('const failGeneration ='))
    expect(finishSource).toContain('source_mode: executionMode')
  })

  test('surfaces materialization failures and never falls back to Base64 request payloads', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const formatterSource = source.slice(source.indexOf('function formatGenerateNodeReferenceMediaError'), source.indexOf('export function subscribeToGenerateNodeExternalError'))
    const previewSource = source.slice(source.indexOf('const handleSkillPreview ='), source.indexOf('const buildPayload ='))
    const handleRunSource = source.slice(source.indexOf('const handleRun = async () => {'), source.indexOf('useEffect(() => {', source.indexOf('const handleRun = async () => {')))
    const chatStart = handleRunSource.indexOf('if (isChatSkillCompileOnly) {')
    const formalStart = handleRunSource.indexOf('if (!selectedKey || !selectedModel)')
    const chatSource = handleRunSource.slice(chatStart, formalStart)
    const formalSource = handleRunSource.slice(formalStart)
    const saveSource = source.slice(source.indexOf('const handleSaveToAsset ='), source.indexOf('const commitReferenceBindings =', source.indexOf('const handleSaveToAsset =')))

    expect(formatterSource).toContain('error instanceof GenerateNodeReferenceMediaError')
    expect(formatterSource).toContain("REFERENCE_MEDIA_MATERIALIZATION_FAILED")
    expect(previewSource).toContain('setSkillPreviewError(materializationError)')
    expect(previewSource).toContain('message.error(`${materializationError.error_code}: ${materializationError.detail}`)')
    expect(previewSource.slice(previewSource.indexOf('await materializeExecutionReferenceBindings(previewAssets)'), previewSource.indexOf('compileSkillPreview(buildGenerateNodeSkillCompileRequest({'))).not.toContain('data:image/')

    for (const requestSource of [chatSource, formalSource]) {
      const materialize = requestSource.indexOf('await materializeExecutionReferenceBindings(executableReferenceBindings)')
      const errorStatus = requestSource.indexOf("setNodeStatus(id, 'error')", materialize)
      const errorMessage = requestSource.indexOf('message.error(`${materializationError.error_code}: ${materializationError.detail}`)', materialize)
      const earlyReturn = requestSource.indexOf('return', errorMessage)
      const transport = requestSource.indexOf(requestSource === chatSource ? 'runGenerateNodeChatSkillCompilation({' : 'createSSEClient')
      expect(materialize).toBeGreaterThan(-1)
      expect(errorStatus).toBeGreaterThan(materialize)
      expect(errorMessage).toBeGreaterThan(errorStatus)
      expect(earlyReturn).toBeGreaterThan(errorMessage)
      expect(earlyReturn).toBeLessThan(transport)
      expect(requestSource.slice(materialize, transport)).not.toContain('data:image/')
    }

    expect(saveSource).toContain('error instanceof GenerateNodeReferenceMediaError')
    expect(saveSource).toContain('materializationError.error_code')
    expect(saveSource).toContain('materializationError.detail')
    expect(saveSource).toContain("message.error(`入库失败: ${detail}`)")
  })

  test('keeps every saved image asset media field on the short persisted workspace path', () => {
    const persistedContent = '/api/assets/media/materialized.png'
    const payload = buildGenerateNodeAssetPayload({
      resultContent: persistedContent,
      mode: 'text_to_image',
      prompt: 'materialized output',
      selectedModel: 'image-model',
      provider: 'provider-a',
      selectedRolePrompt: 'director',
      params: {},
      temperature: 0.7,
      aspectRatio: '1:1',
      ratioSize: '1024*1024',
    })

    expect(payload.file_path).toBe(persistedContent)
    expect(payload.data.content).toBe(persistedContent)
    expect(payload.data.file_path).toBe(persistedContent)
    expect(payload.data.url).toBe(persistedContent)
    expect(payload.thumbnail).toBe(persistedContent)
    expect(JSON.stringify(payload)).not.toContain('data:image')
  })

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
      skillPreviewCached: false,
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
      skill_preview_cached: false,
    })

    const missingCacheAudit = buildGenerateNodeAssetPayload({
      resultContent: 'compiled text',
      mode: 'chat',
      prompt: 'source',
      selectedModel: 'compiler',
      provider: 'skill-provider',
      selectedRolePrompt: 'director',
      params: {},
      temperature: 0.7,
      aspectRatio: '1:1',
      ratioSize: '1024*1024',
      compiledPrompt: 'compiled text',
      skillName: 'h3-prompt-writing',
    })
    expect(Object.prototype.hasOwnProperty.call(missingCacheAudit.data, 'skill_preview_cached')).toBe(false)

    const componentSource = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    expect(componentSource).toContain('skillPreviewCached: result.skill_preview_cached')
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
      reference_type: 'image',
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
    ], [])).toThrow(expect.objectContaining({ code: 'REFERENCE_ROLE_INVALID', reference_type: 'image' }))
    expect(() => normalizeBindings([
      { type: 'image', url: '/last-a.png', reference_role: 'last_frame' },
      { type: 'image', url: '/last-b.png', role: 'last_frame' },
    ], [])).toThrow(expect.objectContaining({ code: 'REFERENCE_ROLE_INVALID', reference_type: 'image' }))
    expect(() => normalizeBindings([
      { type: 'image', url: '/bad-role.png', reference_role: 'background_only' },
    ], [])).toThrow(expect.objectContaining({ code: 'REFERENCE_ROLE_INVALID', reference_type: 'image' }))
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

  test('does not transfer persisted roles across explicitly different graph identities', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    const reconcileBindings = module.reconcileGenerateNodeReferenceBindings
    const persisted = normalizeBindings([
      {
        type: 'image', url: '/shared.png', reference_id: 'old-ref', reference_role: 'character',
        source_asset_ids: [42], source_edge_id: 'edge-old', source_node_id: 'source-old',
      },
      {
        type: 'image', url: '/shared.png', reference_id: 'keep-ref', reference_role: 'style',
        source_asset_ids: [42], source_edge_id: 'edge-keep', source_node_id: 'source-keep',
      },
    ], [])
    const reconciled = reconcileBindings(persisted, [
      {
        type: 'image', url: '/shared.png', source_asset_ids: [42],
        source_edge_id: 'edge-keep', source_node_id: 'source-keep',
      },
      {
        type: 'image', url: '/shared.png', source_asset_ids: [42],
        source_edge_id: 'edge-new', source_node_id: 'source-new',
      },
    ], { incomingComplete: true })

    expect(reconciled.validationError).toBeNull()
    expect(reconciled.bindings).toMatchObject([
      {
        reference_id: 'keep-ref', reference_role: 'style',
        source_edge_id: 'edge-keep', source_node_id: 'source-keep',
      },
      {
        reference_role: 'general',
        source_edge_id: 'edge-new', source_node_id: 'source-new',
      },
    ])
    expect(reconciled.bindings[1].reference_id).not.toBe('old-ref')
    expect(new Set(reconciled.bindings.map((binding: any) => binding.source_edge_id))).toEqual(new Set(['edge-keep', 'edge-new']))
  })

  test('detects identity-only live reconciliation changes without changing canonical compile inputs', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    const reconcileBindings = module.reconcileGenerateNodeReferenceBindings
    const buildCanonicalFingerprint = module.buildGenerateNodeReferenceBindingsFingerprint
    const buildLocalFingerprint = module.buildGenerateNodeReferenceBindingsLocalFingerprint
    expect(typeof buildLocalFingerprint).toBe('function')
    if (typeof buildLocalFingerprint !== 'function') return

    const legacy = normalizeBindings([
      {
        type: 'image', url: '/same.png', reference_id: 'stable-ref', reference_role: 'character', source_asset_ids: [51],
      },
    ], [])
    const migrated = reconcileBindings(legacy, [
      {
        type: 'image', url: '/same.png', source_asset_ids: [51],
        source_edge_id: 'edge-stable', source_node_id: 'source-stable', source_handle: 'out',
      },
    ], { incomingComplete: true }).bindings

    expect(buildCanonicalFingerprint(migrated)).toBe(buildCanonicalFingerprint(legacy))
    expect(buildLocalFingerprint(migrated)).not.toBe(buildLocalFingerprint(legacy))

    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const liveReconcileStart = source.indexOf('if (reconciledIncomingFingerprintRef.current === incomingContext.fingerprint) return')
    const liveReconcileEnd = source.indexOf('useEffect(() => {', liveReconcileStart + 1)
    const liveReconcileSource = source.slice(liveReconcileStart, liveReconcileEnd)
    expect(liveReconcileSource).toContain('buildGenerateNodeReferenceBindingsLocalFingerprint')
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
      unresolvedReferenceSources: [
        { type: 'image', source_edge_id: 'edge-unresolved', source_node_id: 'source-not-mounted' },
      ],
    })
    expect(reconcileBindings(persisted, unresolved.incomingAssets, {
      unresolvedSources: unresolved.unresolvedReferenceSources,
    })).toEqual({ bindings: persisted, validationError: null })

    const disconnected = buildIncomingSnapshot({ nodeId: 'target', edges: [], nodes: [] })
    expect(disconnected).toMatchObject({
      incomingAssets: [],
      referenceEdgeCount: 0,
      resolvedReferenceEdgeCount: 0,
      unresolvedReferenceEdgeCount: 0,
      referenceValidationError: null,
      unresolvedReferenceSources: [],
    })
    expect(reconcileBindings(persisted, disconnected.incomingAssets, {
      unresolvedSources: disconnected.unresolvedReferenceSources,
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

  test('reconciles mixed valid, invalid, unresolved, disconnected, and legacy sources per binding', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const normalizeBindings = module.normalizeGenerateNodeReferenceBindings
    const reconcileBindings = module.reconcileGenerateNodeReferenceBindings
    const buildIncomingSnapshot = module.buildGenerateNodeIncomingContextSnapshot
    const persisted = normalizeBindings([
      {
        type: 'image', url: '/valid-v1.png', reference_id: 'valid-ref', reference_role: 'character',
        source_asset_ids: [101], source_edge_id: 'edge-valid', source_node_id: 'source-valid',
      },
      {
        type: 'image', url: '/unresolved-v1.png', reference_id: 'unresolved-ref', reference_role: 'style',
        source_asset_ids: [201], source_edge_id: 'edge-unresolved', source_node_id: 'source-unresolved',
      },
      {
        type: 'image', url: '/invalid-v1.png', reference_id: 'invalid-ref', reference_role: 'scene',
        source_asset_ids: [301], source_edge_id: 'edge-invalid', source_node_id: 'source-invalid',
      },
      {
        type: 'image', url: '/disconnected-v1.png', reference_id: 'disconnected-ref', reference_role: 'full_reference',
        source_asset_ids: [401], source_edge_id: 'edge-disconnected', source_node_id: 'source-disconnected',
      },
      {
        type: 'image', url: '/legacy-keep.png', reference_id: 'legacy-keep', reference_role: 'general', source_asset_ids: [501],
      },
      {
        type: 'image', url: '/legacy-drop.png', reference_id: 'legacy-drop', reference_role: 'general', source_asset_ids: [502],
      },
    ], [])
    const persistedSnapshot = JSON.parse(JSON.stringify(persisted))
    const snapshot = buildIncomingSnapshot({
      nodeId: 'target',
      edges: [
        { id: 'edge-valid', source: 'source-valid', target: 'target', targetHandle: 'image' },
        { id: 'edge-unresolved', source: 'source-unresolved', target: 'target', targetHandle: 'image' },
        { id: 'edge-unresolved-legacy', source: 'source-unresolved-legacy', target: 'target', targetHandle: 'image' },
        { id: 'edge-invalid', source: 'source-invalid', target: 'target', targetHandle: 'image' },
      ],
      nodes: [
        { id: 'source-valid', data: { result: { content: '/valid-v2.png', source_asset_ids: [111] } } },
        { id: 'source-invalid', data: { result: { content: '', source_asset_ids: [311] } } },
      ],
    })

    expect(snapshot).toMatchObject({
      referenceEdgeCount: 4,
      resolvedReferenceEdgeCount: 2,
      unresolvedReferenceEdgeCount: 2,
      referenceValidationError: { error_code: 'REFERENCE_ASSET_INVALID' },
      unresolvedReferenceSources: [
        { type: 'image', source_edge_id: 'edge-unresolved', source_node_id: 'source-unresolved' },
        { type: 'image', source_edge_id: 'edge-unresolved-legacy', source_node_id: 'source-unresolved-legacy' },
      ],
    })
    const reconciled = reconcileBindings(persisted, snapshot.incomingAssets, {
      incomingComplete: snapshot.unresolvedReferenceEdgeCount === 0,
      unresolvedSources: snapshot.unresolvedReferenceSources,
    })

    expect(reconciled.validationError).toBeNull()
    expect(reconciled.bindings).toMatchObject([
      {
        reference_id: 'valid-ref', reference_role: 'character', url: '/api/assets/media/valid-v2.png',
        source_asset_ids: [111], source_edge_id: 'edge-valid',
      },
      {
        reference_id: 'unresolved-ref', reference_role: 'style', url: '/api/assets/media/unresolved-v1.png',
        source_edge_id: 'edge-unresolved',
      },
      {
        reference_id: 'legacy-keep', reference_role: 'general', url: '/api/assets/media/legacy-keep.png',
      },
    ])
    expect(reconciled.bindings.map((binding: any) => binding.reference_id)).not.toContain('invalid-ref')
    expect(reconciled.bindings.map((binding: any) => binding.reference_id)).not.toContain('disconnected-ref')
    expect(reconciled.bindings.map((binding: any) => binding.reference_id)).not.toContain('legacy-drop')
    expect(persisted).toEqual(persistedSnapshot)
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

  test('guards manual and run-signal overlap and rejects stale out-of-order completions', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const createRunTracker = module.createGenerateNodeRunTracker
    expect(typeof createRunTracker).toBe('function')
    if (typeof createRunTracker !== 'function') return

    const tracker = createRunTracker()
    const manualBindings = [{
      type: 'image', url: '/manual.png', reference_id: 'manual-ref', reference_role: 'character',
      reference_index: 1, source_asset_ids: [11],
    }]
    const signalBindings = [{
      type: 'image', url: '/signal.png', reference_id: 'signal-ref', reference_role: 'style',
      reference_index: 1, source_asset_ids: [22],
    }]

    const manualRun = tracker.start(manualBindings)
    expect(manualRun).not.toBeNull()
    const overlappingRunSignal = tracker.start(signalBindings)
    expect(overlappingRunSignal).toBeNull()
    manualBindings[0].url = '/edited-after-start.png'
    manualBindings[0].source_asset_ids[0] = 999
    expect(manualRun.referenceBindings[0]).toMatchObject({
      url: '/api/assets/media/manual.png', source_asset_ids: [11],
    })

    expect(tracker.complete(manualRun)).toBe(true)
    const nextRunSignal = tracker.start(signalBindings)
    expect(nextRunSignal).not.toBeNull()
    expect(tracker.complete(manualRun)).toBe(false)
    expect(tracker.isCurrent(nextRunSignal)).toBe(true)
    expect(tracker.complete(nextRunSignal)).toBe(true)

    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    expect(source).toContain('const generateRunTrackerRef = useRef(createGenerateNodeRunTracker())')
    const handleRunStart = source.indexOf('const handleRun = async () => {')
    const runSignalEffectStart = source.indexOf('useEffect(() => {', handleRunStart)
    const handleRunSource = source.slice(handleRunStart, runSignalEffectStart)
    expect(handleRunSource).toContain('generateRunTrackerRef.current.start(executionReferenceBindings)')
    expect(handleRunSource).toContain('if (!runToken) return')
    expect(handleRunSource).toContain('msg => handleSSEMessage(msg, runToken, mode)')
    expect(handleRunSource).toContain('finishGeneration(res.data, runToken, mode)')
    expect(handleRunSource).toContain('failGeneration(error, runToken)')
    const afterConnectSource = handleRunSource.slice(
      handleRunSource.indexOf('await sseClient.connect()'),
      handleRunSource.indexOf("setProgressMsg('正在唤醒云端大脑...')"),
    )
    expect(afterConnectSource).toContain('if (!generateRunTrackerRef.current.isCurrent(runToken)) return')
    const afterRequestSource = handleRunSource.slice(
      handleRunSource.indexOf("await apiClient.request({ url: '/generate'"),
      handleRunSource.indexOf('if (res.data?.client_id'),
    )
    expect(afterRequestSource).toContain('if (!generateRunTrackerRef.current.isCurrent(runToken)) return')

    const finishStart = source.indexOf('const finishGeneration =')
    const failStart = source.indexOf('const failGeneration =', finishStart)
    const finishSource = source.slice(finishStart, failStart)
    expect(finishSource).toContain('generateRunTrackerRef.current.isCurrent(runToken)')
    expect(finishSource).toContain('runToken.referenceBindings')
    const failSource = source.slice(failStart, source.indexOf('const handleSSEMessage', failStart))
    expect(failSource).toContain('generateRunTrackerRef.current.complete(runToken)')
  })

  test('skips invalid run-signal reentry before validation or node-status side effects', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const tracker = module.createGenerateNodeRunTracker()
    expect(typeof tracker.hasActive).toBe('function')
    if (typeof tracker.hasActive !== 'function') return

    const activeRun = tracker.start([{
      type: 'image', url: '/active.png', reference_id: 'active-ref', reference_role: 'general',
      reference_index: 1, source_asset_ids: [31],
    }])
    expect(activeRun).not.toBeNull()
    const sideEffects: string[] = []
    const simulateInvalidRunSignal = () => {
      if (tracker.hasActive()) return
      sideEffects.push('validate-current-config')
      sideEffects.push('set-node-status-error')
    }

    simulateInvalidRunSignal()
    expect(sideEffects).toEqual([])
    expect(tracker.isCurrent(activeRun)).toBe(true)

    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const handleRunStart = source.indexOf('const handleRun = async () => {')
    const handleRunBody = source.slice(
      handleRunStart + 'const handleRun = async () => {'.length,
      source.indexOf('if (runBlocked) {', handleRunStart),
    )
    expect(handleRunBody.trim()).toBe('if (generateRunTrackerRef.current.hasActive()) return')
  })

  test('keeps a run active until terminal side effects succeed so failures can clear it', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const completeAfterEffects = module.completeGenerateNodeRunAfterEffects
    expect(typeof completeAfterEffects).toBe('function')
    if (typeof completeAfterEffects !== 'function') return

    const tracker = module.createGenerateNodeRunTracker()
    const failedRun = tracker.start([{
      type: 'image', url: '/failed.png', reference_id: 'failed-ref', reference_role: 'general',
      reference_index: 1, source_asset_ids: [51],
    }])
    expect(failedRun).not.toBeNull()
    let sideEffectCount = 0
    expect(() => completeAfterEffects(tracker, failedRun, () => {
      sideEffectCount += 1
      throw new Error('downstream persistence failed')
    })).toThrow('downstream persistence failed')
    expect(sideEffectCount).toBe(1)
    expect(tracker.isCurrent(failedRun)).toBe(true)
    expect(tracker.complete(failedRun)).toBe(true)

    const successfulRun = tracker.start([{
      type: 'image', url: '/success.png', reference_id: 'success-ref', reference_role: 'style',
      reference_index: 1, source_asset_ids: [52],
    }])
    expect(successfulRun).not.toBeNull()
    expect(completeAfterEffects(tracker, successfulRun, () => { sideEffectCount += 1 })).toBe(true)
    expect(sideEffectCount).toBe(2)
    expect(tracker.isCurrent(successfulRun)).toBe(false)

    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const finishStart = source.indexOf('const finishGeneration =')
    const failStart = source.indexOf('const failGeneration =', finishStart)
    const finishSource = source.slice(finishStart, failStart)
    expect(finishSource).toContain('completeGenerateNodeRunAfterEffects(')
    expect(finishSource).not.toContain('generateRunTrackerRef.current.complete(runToken)')
    const sseStart = source.indexOf('const handleSSEMessage =', failStart)
    const sseEnd = source.indexOf('const handleRun = async () => {', sseStart)
    const sseSource = source.slice(sseStart, sseEnd)
    expect(sseSource).toContain('catch (error)')
    expect(sseSource).toContain('failGeneration(error, runToken)')
  })

  test('uses the active run reference snapshot for result, downstream, and saved provenance', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    expect(source).toContain('const generateRunTrackerRef = useRef(createGenerateNodeRunTracker())')

    const handleRunStart = source.indexOf('const handleRun = async () => {')
    const runSignalEffectStart = source.indexOf('useEffect(() => {', handleRunStart)
    const handleRunSource = source.slice(handleRunStart, runSignalEffectStart)
    expect(handleRunSource.indexOf('generateRunTrackerRef.current.start(executionReferenceBindings)')).toBeGreaterThan(-1)
    expect(handleRunSource.indexOf('generateRunTrackerRef.current.start(executionReferenceBindings)')).toBeLessThan(handleRunSource.indexOf('createSSEClient'))

    const finishStart = source.indexOf('const finishGeneration =')
    const failStart = source.indexOf('const failGeneration =', finishStart)
    const finishSource = source.slice(finishStart, failStart)
    expect(finishSource).toContain('freezeGenerateNodeExecutionReferences')
    expect(finishSource).toContain('runToken.referenceBindings')
    expect(finishSource).toContain('result: finalResult')
    expect(finishSource).toContain('incoming_data: finalResult')
    expect(finishSource).toContain('completeGenerateNodeRunAfterEffects(')

    const failSource = source.slice(failStart, source.indexOf('const handleSSEMessage', failStart))
    expect(failSource).toContain('generateRunTrackerRef.current.complete(runToken)')

    const saveStart = source.indexOf('const handleSaveToAsset =')
    const saveEnd = source.indexOf('const commitReferenceBindings =', saveStart)
    const saveSource = source.slice(saveStart, saveEnd)
    expect(saveSource).toContain('resolveGenerateNodeResultReferenceBindings(result)')
    expect(saveSource).toContain('const savedReferenceBindings =')
    expect(saveSource).toContain('referenceBindings: savedReferenceBindings')

    const skillAuditKeysSource = source.slice(source.indexOf('const SKILL_AUDIT_KEYS ='), source.indexOf('function withoutSkillAudit'))
    expect(skillAuditKeysSource).not.toContain("'reference_bindings'")
  })

  test('does not fabricate saved provenance from live bindings when the result snapshot is missing or invalid', async () => {
    const module = await loadGenerateNodeReferenceApi()
    const resolveResultBindings = module.resolveGenerateNodeResultReferenceBindings
    expect(typeof resolveResultBindings).toBe('function')
    if (typeof resolveResultBindings !== 'function') return

    const editedLiveBindings = [{
      type: 'image', url: '/edited-after-generation.png', reference_id: 'edited-ref', reference_role: 'style',
      reference_index: 1, source_asset_ids: [999],
    }]
    const legacyResult = { content: '/legacy-output.png', source_asset_ids: [41] }
    const missingSnapshot = resolveResultBindings(legacyResult)
    expect(missingSnapshot).toBeUndefined()
    const invalidSnapshot = resolveResultBindings({
      ...legacyResult,
      reference_bindings: [{ type: 'image', url: '', reference_id: 'broken-ref', reference_role: 'character' }],
    })
    expect(invalidSnapshot).toBeUndefined()

    const savedAsset = buildGenerateNodeAssetPayload({
      resultContent: legacyResult.content,
      mode: 'image_to_image',
      prompt: 'legacy result',
      selectedModel: 'image-model',
      provider: 'provider-a',
      selectedRolePrompt: 'director',
      params: {},
      temperature: 0.7,
      aspectRatio: '1:1',
      ratioSize: '1024*1024',
      sourceAssetIds: legacyResult.source_asset_ids,
      referenceBindings: missingSnapshot,
    })
    expect(savedAsset.source_asset_ids).toEqual([41])
    expect(savedAsset.data.reference_bindings).toBeUndefined()
    expect(JSON.stringify(savedAsset)).not.toContain('edited-ref')
    expect(JSON.stringify(savedAsset)).not.toContain('999')
    expect(editedLiveBindings[0].reference_id).toBe('edited-ref')

    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const saveStart = source.indexOf('const handleSaveToAsset =')
    const saveEnd = source.indexOf('const commitReferenceBindings =', saveStart)
    const saveSource = source.slice(saveStart, saveEnd)
    expect(saveSource).toContain('resolveGenerateNodeResultReferenceBindings(result)')
    expect(saveSource).not.toContain(': referenceBindings')
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
    expect(source).toContain('resolveGenerateNodeEffectiveCompilerReferenceBindings({')
    expect(source).toContain('buildGenerateNodeReferenceBindingsFingerprint(effectiveCompilerReferenceBindings)')
    expect(source).toContain('buildGenerateNodeSkillCompileAssets(effectiveCompilerReferenceBindings)')
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
  test('fails closed without substituting an installed revision for a locked unavailable revision', async () => {
    const module = await import('./GenerateNode')
    const resolveGenerateNodeSkillSelection = (module as any).resolveGenerateNodeSkillSelection
    const buildGenerateNodeSkillIdentity = (module as any).buildGenerateNodeSkillIdentity
    expect(typeof resolveGenerateNodeSkillSelection).toBe('function')
    expect(typeof buildGenerateNodeSkillIdentity).toBe('function')
    if (typeof resolveGenerateNodeSkillSelection !== 'function') return

    const revB = { packId: 'pack-a', name: 'cinematic', revision: 'rev-b' }
    const resolution = resolveGenerateNodeSkillSelection({
      knownSkills: [revB],
      selectedPackId: 'pack-a',
      selectedName: 'cinematic',
      selectedRevision: 'rev-a',
    })

    expect(resolution.selectedSkill).toBeUndefined()
    expect(resolution.requestedIdentity).toEqual({ packId: 'pack-a', name: 'cinematic', revision: 'rev-a' })
    expect(resolution.error).toMatchObject({
      error_code: 'SKILL_REVISION_UNAVAILABLE',
      requested_revision: 'rev-a',
      available_revisions: ['rev-b'],
    })
    expect(buildGenerateNodeSkillIdentity({
      selectedPackId: resolution.requestedIdentity.packId,
      selectedName: resolution.requestedIdentity.name,
      selectedRevision: resolution.requestedIdentity.revision,
    })).toEqual({ packId: 'pack-a', name: 'cinematic', revision: 'rev-a' })
    expect(JSON.stringify(resolution)).not.toContain('"revision":"rev-b","error":null')
  })

  test('keeps an unpinned multi-revision selection ambiguous instead of choosing the first match', async () => {
    const module = await import('./GenerateNode')
    const resolveGenerateNodeSkillSelection = (module as any).resolveGenerateNodeSkillSelection
    expect(typeof resolveGenerateNodeSkillSelection).toBe('function')
    if (typeof resolveGenerateNodeSkillSelection !== 'function') return

    const resolution = resolveGenerateNodeSkillSelection({
      knownSkills: [
        { packId: 'pack-a', name: 'cinematic', revision: 'rev-a' },
        { packId: 'pack-a', name: 'cinematic', revision: 'rev-b' },
      ],
      selectedPackId: 'pack-a',
      selectedName: 'cinematic',
      selectedRevision: '',
    })

    expect(resolution.selectedSkill).toBeUndefined()
    expect(resolution.requestedIdentity).toEqual({ packId: 'pack-a', name: 'cinematic', revision: '' })
    expect(resolution.error).toMatchObject({
      error_code: 'SKILL_AMBIGUOUS',
      available_revisions: ['rev-a', 'rev-b'],
    })
  })

  test('resolves exact locked revisions and unique legacy unpinned selections', async () => {
    const module = await import('./GenerateNode')
    const resolveGenerateNodeSkillSelection = (module as any).resolveGenerateNodeSkillSelection
    expect(typeof resolveGenerateNodeSkillSelection).toBe('function')
    if (typeof resolveGenerateNodeSkillSelection !== 'function') return

    const revA = { packId: 'pack-a', name: 'cinematic', revision: 'rev-a' }
    const revB = { packId: 'pack-a', name: 'cinematic', revision: 'rev-b' }
    expect(resolveGenerateNodeSkillSelection({
      knownSkills: [revA, revB],
      selectedPackId: 'pack-a',
      selectedName: 'cinematic',
      selectedRevision: 'rev-a',
    })).toMatchObject({ selectedSkill: revA, error: null })
    expect(resolveGenerateNodeSkillSelection({
      knownSkills: [revA],
      selectedPackId: 'pack-a',
      selectedName: 'cinematic',
      selectedRevision: '',
    })).toMatchObject({ selectedSkill: revA, error: null })
  })

  test('skill list refresh or removal cannot mutate the requested locked identity or compile fingerprint', async () => {
    const module = await import('./GenerateNode')
    const resolveGenerateNodeSkillSelection = (module as any).resolveGenerateNodeSkillSelection
    expect(typeof resolveGenerateNodeSkillSelection).toBe('function')
    if (typeof resolveGenerateNodeSkillSelection !== 'function') return

    const storedIdentity = { packId: 'pack-a', name: 'cinematic', revision: 'rev-a' }
    const beforeRefresh = resolveGenerateNodeSkillSelection({
      knownSkills: [
        { packId: 'pack-a', name: 'cinematic', revision: 'rev-a' },
        { packId: 'pack-a', name: 'cinematic', revision: 'rev-b' },
      ],
      selectedPackId: storedIdentity.packId,
      selectedName: storedIdentity.name,
      selectedRevision: storedIdentity.revision,
    })
    const afterRemoval = resolveGenerateNodeSkillSelection({
      knownSkills: [{ packId: 'pack-a', name: 'cinematic', revision: 'rev-b' }],
      selectedPackId: storedIdentity.packId,
      selectedName: storedIdentity.name,
      selectedRevision: storedIdentity.revision,
    })

    expect(beforeRefresh.requestedIdentity).toEqual(storedIdentity)
    expect(afterRemoval.requestedIdentity).toEqual(storedIdentity)
    expect(afterRemoval.selectedSkill).toBeUndefined()
    expect(afterRemoval.error).toMatchObject({ error_code: 'SKILL_REVISION_UNAVAILABLE' })
    expect(JSON.stringify({ skill: beforeRefresh.requestedIdentity })).toBe(JSON.stringify({ skill: afterRemoval.requestedIdentity }))
    expect(storedIdentity).toEqual({ packId: 'pack-a', name: 'cinematic', revision: 'rev-a' })
  })

  test('wires typed Skill selection errors into preview, run, persistence, and exact-revision dropdown UX', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')

    expect(source).toContain('resolveGenerateNodeSkillSelection({')
    expect(source).not.toContain('|| matches[0]')
    expect(source).toContain('const effectiveSkillSelectionError =')
    expect(source).toContain('Boolean(hasEffectiveSkill && (effectiveSkillSelectionError || effectiveSkillIncompatible || missingEffectiveCompilerModel))')
    expect(source).toContain('effectiveSkillSelectionError || effectiveSkillIncompatible || missingEffectiveCompilerModel')
    expect(source).toContain('skillRevision: hasEffectiveSkill ? skillRevision : undefined')
    expect(source).toContain('setSkillRevision(skill.revision)')
    expect(source).toContain("effectiveSkillSelectionError.error_code")
    expect(source).toContain("effectiveSkillSelectionError.detail")
    expect(source).toContain('锁定 revision')
    expect(source).toContain('skill.revision')

    const previewSource = source.slice(source.indexOf('const handleSkillPreview ='), source.indexOf('const buildPayload ='))
    expect(previewSource).toContain('if (effectiveSkillSelectionError)')
    expect(previewSource.indexOf('if (effectiveSkillSelectionError)')).toBeLessThan(previewSource.indexOf('compileSkillPreview(buildGenerateNodeSkillCompileRequest({'))
    expect(previewSource).toContain('revision: effectiveSkillRevision')

    const runSource = source.slice(source.indexOf('const handleRun = async () => {'), source.indexOf('useEffect(() => {', source.indexOf('const handleRun = async () => {')))
    expect(runSource).toContain('if (effectiveSkillSelectionError)')
    expect(runSource.indexOf('if (effectiveSkillSelectionError)')).toBeLessThan(runSource.indexOf('createSSEClient'))
  })

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
    expect(source.slice(source.indexOf('const handleSkillPreview ='), source.indexOf('const buildPayload ='))).toContain('revision: effectiveSkillRevision')
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

describe('GenerateNode Skill compiler source selector', () => {
  test('collects a supplying active Key beyond an inactive full page without mutating pages', async () => {
    const pages = [
      Array.from({ length: 100 }, (_, index) => ({ id: index + 1, is_active: false })),
      [{ id: 101, is_active: true }],
    ]
    const before = JSON.stringify(pages)
    const calls: Array<{ skip: number; limit: number }> = []

    const result = await collectGenerateNodeActiveKeys({
      pageSize: 100,
      fetchPage: async (skip: number, limit: number) => {
        calls.push({ skip, limit })
        return pages[skip === 0 ? 0 : 1]
      },
    })

    expect(calls).toEqual([{ skip: 0, limit: 100 }, { skip: 100, limit: 100 }])
    expect(result).toEqual([{ id: 101, is_active: true }])
    expect(JSON.stringify(pages)).toBe(before)
  })

  test('collects more than one full active Key page in stable order', async () => {
    const pages = [
      Array.from({ length: 100 }, (_, index) => ({ id: index + 1, is_active: true })),
      [{ id: 101, is_active: true }, { id: 102, is_active: true }],
    ]
    const calls: Array<{ skip: number; limit: number }> = []

    const result = await collectGenerateNodeActiveKeys({
      pageSize: 100,
      fetchPage: async (skip: number, limit: number) => {
        calls.push({ skip, limit })
        return pages[skip === 0 ? 0 : 1]
      },
    })

    expect(calls).toEqual([{ skip: 0, limit: 100 }, { skip: 100, limit: 100 }])
    expect(result.map((key: { id: number }) => key.id)).toEqual(Array.from({ length: 102 }, (_, index) => index + 1))
  })

  test('waits for settled Key sources before enabling linked Skill compiler selectors', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const keyStateStart = source.indexOf('const [keys, setKeys]')
    const keyStateEnd = source.indexOf('const [allModels, setAllModels]', keyStateStart)
    const keyStateRegion = source.slice(keyStateStart, keyStateEnd)
    const keyRequestAnchor = source.indexOf("apiClient.get('/keys/'")
    const keyRequestStart = source.lastIndexOf('useEffect(() => {', keyRequestAnchor)
    const keyRequestEnd = source.indexOf('  }, [])', keyRequestAnchor)
    const keyRequestRegion = source.slice(keyRequestStart, keyRequestEnd)
    const compilerSelectorStart = source.indexOf('const compilerSelector = useMemo')
    const compilerSelectorEnd = source.indexOf('const renderParams =', compilerSelectorStart)
    const compilerSelectorRegion = source.slice(compilerSelectorStart, compilerSelectorEnd)

    expect(keyStateStart).toBeGreaterThanOrEqual(0)
    expect(keyStateEnd).toBeGreaterThan(keyStateStart)
    expect(keyStateRegion).toContain('const [compilerKeysLoaded, setCompilerKeysLoaded] = useState(false)')
    expect(keyRequestAnchor).toBeGreaterThanOrEqual(0)
    expect(keyRequestStart).toBeGreaterThanOrEqual(0)
    expect(keyRequestEnd).toBeGreaterThan(keyRequestStart)
    expect(keyRequestRegion).toContain('collectGenerateNodeActiveKeys({')
    expect(keyRequestRegion).toContain("apiClient.get('/keys/', {")
    expect(keyRequestRegion).toContain('params: { is_active: true, skip, limit },')
    expect(keyRequestRegion).toContain(".catch(() => setKeys([]))\n      .finally(() => setCompilerKeysLoaded(true))")
    const keysSettledIndex = keyRequestRegion.indexOf('.finally(() => setCompilerKeysLoaded(true))')
    expect(keysSettledIndex).toBeGreaterThan(keyRequestRegion.indexOf('.catch(() => setKeys([]))'))
    expect(keyRequestRegion.slice(0, keysSettledIndex)).not.toContain('setCompilerKeysLoaded(true)')
    expect(compilerSelectorStart).toBeGreaterThanOrEqual(0)
    expect(compilerSelectorEnd).toBeGreaterThan(compilerSelectorStart)
    expect(compilerSelectorRegion).toContain(
      'const compilerSelectorLoading = !compilerKeysLoaded || !skillSettingsLoaded || !compilerModelsLoaded',
    )
  })

  test('renders linked Skill compiler source and model selectors without changing the ordinary model selector', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const compilerControlStart = source.indexOf('Skill 编译模型</Text>')
    const compilerControlEnd = source.indexOf(
      '{hasEffectiveSkill && !effectiveSkillSelectionError && missingEffectiveCompilerModel',
      compilerControlStart,
    )
    const compilerControlRegion = source.slice(compilerControlStart, compilerControlEnd)
    const sourceSelectStart = compilerControlRegion.indexOf('<Select')
    const sourceSelectClose = compilerControlRegion.indexOf('/>', sourceSelectStart)
    const sourceSelectRegion = compilerControlRegion.slice(sourceSelectStart, sourceSelectClose + 2)
    const modelSelectStart = compilerControlRegion.indexOf('<Select', sourceSelectClose)
    const modelSelectClose = compilerControlRegion.indexOf('/>', modelSelectStart)
    const modelSelectRegion = compilerControlRegion.slice(modelSelectStart, modelSelectClose + 2)

    expect(compilerControlStart).toBeGreaterThanOrEqual(0)
    expect(compilerControlEnd).toBeGreaterThan(compilerControlStart)
    expect(compilerControlRegion).toContain('<Space.Compact block>')
    expect(sourceSelectStart).toBeGreaterThanOrEqual(0)
    expect(sourceSelectClose).toBeGreaterThan(sourceSelectStart)
    expect(sourceSelectRegion).toContain('aria-label="Skill 编译模型来源"')
    expect(sourceSelectRegion).toContain('value={compilerSelector.sourceValue}')
    expect(sourceSelectRegion).toContain('options={compilerSelector.sourceOptions}')
    expect(sourceSelectRegion).toContain('loading={compilerSelectorLoading}')
    expect(sourceSelectRegion).toContain('disabled={compilerSelectorLoading}')
    expect(sourceSelectRegion).toContain('onChange={value => setSkillCompilerModelId(resolveGenerateNodeCompilerModelIdForSource({')
    expect(modelSelectStart).toBeGreaterThan(sourceSelectClose)
    expect(modelSelectClose).toBeGreaterThan(modelSelectStart)
    expect(modelSelectRegion).toContain('aria-label="Skill 编译模型"')
    expect(modelSelectRegion).toContain('value={compilerSelector.modelValue}')
    expect(modelSelectRegion).toContain('options={compilerSelector.modelOptions}')
    expect(modelSelectRegion).toContain('disabled={compilerSelectorLoading || compilerSelector.modelDisabled}')
    expect(modelSelectRegion).toContain('onChange={value => setSkillCompilerModelId(Number(value))}')
    expect(source).not.toContain('const compilerModelOptions =')

    const ordinarySelectorStart = source.indexOf('placeholder="选择 Key"')
    const ordinarySelectorClose = source.indexOf('</Space.Compact>', ordinarySelectorStart)
    const ordinarySelectorRegion = source.slice(
      ordinarySelectorStart,
      ordinarySelectorClose + '</Space.Compact>'.length,
    )

    expect(ordinarySelectorStart).toBeGreaterThanOrEqual(0)
    expect(ordinarySelectorClose).toBeGreaterThan(ordinarySelectorStart)
    expect(ordinarySelectorRegion).toContain('options={keys.map')
    expect(ordinarySelectorRegion).toContain('options={selectableModels.map')
    expect(ordinarySelectorRegion).toContain('showOnlyFavorites')
  })

  const keys = [
    { id: 1, description: ' Primary Key ', provider: 'ignored-provider', is_active: true },
    { id: 2, description: '   ', provider: ' Provider Two ', is_active: true },
    { id: 3, description: '', provider: '   ', is_active: true },
    { id: 4, description: 'Inactive Key', provider: 'inactive-provider', is_active: false },
  ]

  const models = [
    {
      id: 11,
      api_key_id: 1,
      display_name: ' First Compiler ',
      model_name: 'first-compiler',
      provider: 'key-provider',
      is_favorite: false,
      capabilities: { chat: true },
    },
    {
      id: 12,
      api_key_id: 1,
      display_name: ' Vision Compiler ',
      model_name: 'vision-compiler',
      provider: 'key-provider',
      is_favorite: true,
      capabilities: { chat: true, vision: true },
    },
    {
      id: 13,
      api_key_id: 2,
      display_name: '   ',
      model_name: ' provider-key-model ',
      provider: 'key-provider-two',
      capabilities: { chat: true },
    },
    {
      id: 14,
      api_key_id: 3,
      display_name: '',
      model_name: '   ',
      capabilities: { chat: true },
    },
    {
      id: 15,
      api_key_id: 4,
      display_name: ' Legacy First ',
      model_name: 'legacy-first',
      provider: ' Legacy Provider ',
      capabilities: { chat: true },
    },
    {
      id: 16,
      display_name: 'Legacy Second',
      model_name: 'legacy-second',
      provider: 'Legacy Provider',
      capabilities: { chat: true },
    },
    {
      id: 17,
      display_name: 'Unbound Compiler',
      model_name: 'unbound-compiler',
      provider: '   ',
      capabilities: { chat: true },
    },
    {
      id: 18,
      display_name: 'Inactive Compiler',
      provider: 'Excluded Inactive Provider',
      is_active: false,
      capabilities: { chat: true },
    },
    {
      id: 19,
      display_name: 'Disabled Compiler',
      provider: 'Excluded Disabled Provider',
      health_status: 'disabled',
      capabilities: { chat: true },
    },
    {
      id: 20,
      display_name: 'Non-chat Compiler',
      provider: 'Excluded Non-chat Provider',
      capabilities: { vision: true },
    },
    {
      id: Number.MAX_SAFE_INTEGER + 1,
      display_name: 'Invalid ID Compiler',
      provider: 'Excluded Invalid ID Provider',
      capabilities: { chat: true },
    },
  ]

  test('rejects inactive, disabled, non-chat, and invalid-id compiler models', async () => {
    const model = await loadGenerateNodeCompilerSelectorApi()
    expect(typeof model.isGenerateNodeCompilerModelEligible).toBe('function')
    if (typeof model.isGenerateNodeCompilerModelEligible !== 'function') return

    const base = { id: 21, capabilities: { chat: true } }
    expect(model.isGenerateNodeCompilerModelEligible(base)).toBe(true)
    expect(model.isGenerateNodeCompilerModelEligible({ ...base, is_active: false })).toBe(false)
    expect(model.isGenerateNodeCompilerModelEligible({ ...base, health_status: 'disabled' })).toBe(false)
    expect(model.isGenerateNodeCompilerModelEligible({ ...base, capabilities: { chat: false } })).toBe(false)
    expect(model.isGenerateNodeCompilerModelEligible({ ...base, id: -1 })).toBe(false)
    expect(model.isGenerateNodeCompilerModelEligible({ ...base, id: Number.MAX_SAFE_INTEGER + 1 })).toBe(false)
  })

  test('groups eligible models by active Key, legacy Provider, and unbound source in first-seen order', async () => {
    const model = await loadGenerateNodeCompilerSelectorApi()
    expect(typeof model.buildGenerateNodeCompilerSelectorModel).toBe('function')
    if (typeof model.buildGenerateNodeCompilerSelectorModel !== 'function') return

    const selector = model.buildGenerateNodeCompilerSelectorModel({
      keys,
      models,
      overrideModelId: 12,
      workspaceDefaultModelId: null,
    })

    expect(selector.sourceOptions).toEqual([
      { value: 'workspace-default', label: '工作区默认' },
      { value: 'key:1', label: 'Primary Key' },
      { value: 'key:2', label: 'Provider Two' },
      { value: 'key:3', label: 'Key 3' },
      { value: 'provider:Legacy Provider', label: 'Legacy Provider' },
      { value: 'unbound', label: '未绑定来源' },
    ])
    expect(selector.sourceValue).toBe('key:1')
    expect(selector.modelOptions).toEqual([
      { value: 11, label: 'First Compiler' },
      { value: 12, label: 'Vision Compiler · Vision' },
    ])
    expect(selector.modelValue).toBe(12)
    expect(selector.modelDisabled).toBe(false)

    const fallbackModelSelector = model.buildGenerateNodeCompilerSelectorModel({
      keys,
      models,
      overrideModelId: 14,
      workspaceDefaultModelId: null,
    })
    expect(fallbackModelSelector.sourceValue).toBe('key:3')
    expect(fallbackModelSelector.modelOptions).toEqual([{ value: 14, label: '模型 #14' }])
  })

  test('shows the configured workspace default with its actual source and model while disabled', async () => {
    const model = await loadGenerateNodeCompilerSelectorApi()
    expect(typeof model.buildGenerateNodeCompilerSelectorModel).toBe('function')
    if (typeof model.buildGenerateNodeCompilerSelectorModel !== 'function') return

    const selector = model.buildGenerateNodeCompilerSelectorModel({
      keys,
      models,
      overrideModelId: null,
      workspaceDefaultModelId: 13,
    })

    expect(selector.sourceValue).toBe('workspace-default')
    expect(selector.sourceOptions).toEqual([
      { value: 'workspace-default', label: '工作区默认 · Provider Two' },
      { value: 'key:1', label: 'Primary Key' },
      { value: 'key:2', label: 'Provider Two' },
      { value: 'key:3', label: 'Key 3' },
      { value: 'provider:Legacy Provider', label: 'Legacy Provider' },
      { value: 'unbound', label: '未绑定来源' },
    ])
    expect(selector.modelValue).toBe(13)
    expect(selector.modelOptions).toEqual([{ value: 13, label: 'provider-key-model' }])
    expect(selector.modelDisabled).toBe(true)
  })

  test('shows an unconfigured sentinel for a null workspace default', async () => {
    const model = await loadGenerateNodeCompilerSelectorApi()
    expect(typeof model.buildGenerateNodeCompilerSelectorModel).toBe('function')
    if (typeof model.buildGenerateNodeCompilerSelectorModel !== 'function') return

    const selector = model.buildGenerateNodeCompilerSelectorModel({
      keys,
      models,
      overrideModelId: null,
      workspaceDefaultModelId: null,
    })

    expect(selector.sourceValue).toBe('workspace-default')
    expect(selector.sourceOptions[0]).toEqual({ value: 'workspace-default', label: '工作区默认' })
    expect(selector.modelValue).toBe('workspace-default-unconfigured')
    expect(selector.modelOptions).toEqual([
      { value: 'workspace-default-unconfigured', label: '未配置' },
    ])
    expect(selector.modelDisabled).toBe(true)
  })

  test('keeps an unavailable workspace default visible while disabled', async () => {
    const model = await loadGenerateNodeCompilerSelectorApi()
    expect(typeof model.buildGenerateNodeCompilerSelectorModel).toBe('function')
    if (typeof model.buildGenerateNodeCompilerSelectorModel !== 'function') return

    const selector = model.buildGenerateNodeCompilerSelectorModel({
      keys,
      models,
      overrideModelId: null,
      workspaceDefaultModelId: 999,
    })

    expect(selector.sourceValue).toBe('workspace-default')
    expect(selector.sourceOptions[0]).toEqual({
      value: 'workspace-default',
      label: '工作区默认 · 来源不可用',
    })
    expect(selector.modelValue).toBe(999)
    expect(selector.modelOptions).toEqual([{ value: 999, label: '模型 #999 · 不可用' }])
    expect(selector.modelDisabled).toBe(true)
  })

  test('derives a valid explicit source and restricts the model choices to that source without mutation', async () => {
    const model = await loadGenerateNodeCompilerSelectorApi()
    expect(typeof model.buildGenerateNodeCompilerSelectorModel).toBe('function')
    if (typeof model.buildGenerateNodeCompilerSelectorModel !== 'function') return
    const before = JSON.stringify({ keys, models })

    const selector = model.buildGenerateNodeCompilerSelectorModel({
      keys,
      models,
      overrideModelId: 16,
      workspaceDefaultModelId: 12,
    })

    expect(selector.sourceValue).toBe('provider:Legacy Provider')
    expect(selector.modelValue).toBe(16)
    expect(selector.modelOptions).toEqual([
      { value: 15, label: 'Legacy First' },
      { value: 16, label: 'Legacy Second' },
    ])
    expect(selector.modelDisabled).toBe(false)
    expect(selector.sourceOptions[0]).toEqual({
      value: 'workspace-default',
      label: '工作区默认 · Primary Key',
    })
    expect(JSON.stringify({ keys, models })).toBe(before)
  })

  test('appends an unavailable source and preserves a stale explicit override', async () => {
    const model = await loadGenerateNodeCompilerSelectorApi()
    expect(typeof model.buildGenerateNodeCompilerSelectorModel).toBe('function')
    if (typeof model.buildGenerateNodeCompilerSelectorModel !== 'function') return

    const selector = model.buildGenerateNodeCompilerSelectorModel({
      keys,
      models,
      overrideModelId: 404,
      workspaceDefaultModelId: null,
    })

    expect(selector.sourceValue).toBe('unavailable')
    expect(selector.sourceOptions).toEqual([
      { value: 'workspace-default', label: '工作区默认' },
      { value: 'key:1', label: 'Primary Key' },
      { value: 'key:2', label: 'Provider Two' },
      { value: 'key:3', label: 'Key 3' },
      { value: 'provider:Legacy Provider', label: 'Legacy Provider' },
      { value: 'unbound', label: '未绑定来源' },
      { value: 'unavailable', label: '来源不可用' },
    ])
    expect(selector.modelValue).toBe(404)
    expect(selector.modelOptions).toEqual([{ value: 404, label: '模型 #404 · 不可用' }])
    expect(selector.modelDisabled).toBe(true)
  })

  test('selects the first favorite model, then the first model, when changing concrete sources', async () => {
    const model = await loadGenerateNodeCompilerSelectorApi()
    expect(typeof model.resolveGenerateNodeCompilerModelIdForSource).toBe('function')
    if (typeof model.resolveGenerateNodeCompilerModelIdForSource !== 'function') return
    const before = JSON.stringify({ keys, models })

    expect(model.resolveGenerateNodeCompilerModelIdForSource({
      keys,
      models,
      sourceValue: 'key:1',
    })).toBe(12)
    expect(model.resolveGenerateNodeCompilerModelIdForSource({
      keys,
      models,
      sourceValue: 'provider:Legacy Provider',
    })).toBe(15)
    expect(model.resolveGenerateNodeCompilerModelIdForSource({
      keys,
      models,
      sourceValue: 'unbound',
    })).toBe(17)
    expect(JSON.stringify({ keys, models })).toBe(before)
  })

  test('returns null for workspace-default and unknown source transitions', async () => {
    const model = await loadGenerateNodeCompilerSelectorApi()
    expect(typeof model.resolveGenerateNodeCompilerModelIdForSource).toBe('function')
    if (typeof model.resolveGenerateNodeCompilerModelIdForSource !== 'function') return

    expect(model.resolveGenerateNodeCompilerModelIdForSource({
      keys,
      models,
      sourceValue: 'workspace-default',
    })).toBeNull()
    expect(model.resolveGenerateNodeCompilerModelIdForSource({
      keys,
      models,
      sourceValue: 'unavailable',
    })).toBeNull()
    expect(model.resolveGenerateNodeCompilerModelIdForSource({
      keys,
      models,
      sourceValue: 'provider:missing',
    })).toBeNull()
  })
})

describe('GenerateNode Chat Skill model helpers', () => {
  test('derives Chat target compiler references without mutating persistent image edges', async () => {
    const model = await import('./generate-node-model')
    const persistent = [
      { reference_index: 1, reference_id: 'image-1', reference_role: 'character', type: 'image', url: '/hero.png', source_asset_ids: [7] },
      { reference_index: 2, reference_id: 'prompt-1', reference_role: 'prompt_context', type: 'prompt', content: 'keep costume details' },
    ] as const
    const before = JSON.stringify(persistent)

    const textTarget = model.resolveGenerateNodeEffectiveCompilerReferenceBindings({
      nodeMode: 'chat',
      effectiveTargetMode: 'text_to_video',
      isChatSkillCompileOnly: true,
      bindings: persistent,
    })
    expect(textTarget.map(binding => binding.reference_id)).toEqual(['prompt-1'])
    expect(model.buildGenerateNodeReferenceBindingsFingerprint(textTarget)).not.toContain('image-1')
    expect(JSON.stringify(persistent)).toBe(before)

    const imageTarget = model.resolveGenerateNodeEffectiveCompilerReferenceBindings({
      nodeMode: 'chat',
      effectiveTargetMode: 'image_to_video',
      isChatSkillCompileOnly: true,
      bindings: persistent,
    })
    expect(imageTarget.map(binding => binding.reference_id)).toEqual(['image-1', 'prompt-1'])

    const nineImages = Array.from({ length: 9 }, (_, index) => ({
      reference_index: index + 1,
      reference_id: `image-${index + 1}`,
      reference_role: 'general' as const,
      type: 'image' as const,
      url: `/image-${index + 1}.png`,
    }))
    expect(model.resolveGenerateNodeEffectiveCompilerReferenceBindings({
      nodeMode: 'chat',
      effectiveTargetMode: 'image_to_image',
      isChatSkillCompileOnly: true,
      bindings: nineImages,
    })).toHaveLength(9)
    expect(model.resolveGenerateNodeEffectiveCompilerReferenceBindings({
      nodeMode: 'image_to_video',
      effectiveTargetMode: 'image_to_video',
      isChatSkillCompileOnly: false,
      bindings: persistent,
    })).toEqual(persistent)
  })

  test('preserves legacy Chat image inputs when no Skill compile-only run is active', async () => {
    const model = await import('./generate-node-model')
    const persistent = [{
      reference_index: 1,
      reference_id: 'legacy-image',
      reference_role: 'general',
      type: 'image',
      url: '/legacy.png',
    }] as const
    const effective = model.resolveGenerateNodeEffectiveCompilerReferenceBindings({
      nodeMode: 'chat',
      effectiveTargetMode: 'text_to_image',
      isChatSkillCompileOnly: false,
      bindings: persistent,
    })
    const payload = model.buildGenerateNodeRequestPayload({
      id: 'legacy-chat', prompt: 'describe', selectedKey: 1, provider: 'provider', selectedModel: 'chat-model',
      mode: 'chat', routingStrategy: 'balanced', params: {}, temperature: 0.7, ratioSize: '1024*1024',
      selectedRolePrompt: 'assistant', referenceBindings: effective,
    })

    expect(effective).toEqual(persistent)
    expect(model.buildGenerateNodeReferenceBindingsFingerprint(effective)).toBe(
      model.buildGenerateNodeReferenceBindingsFingerprint(persistent),
    )
    expect(payload.params.incoming_assets).toMatchObject([{ reference_id: 'legacy-image', type: 'image' }])

    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const effectiveCollectionSource = source.slice(
      source.indexOf('resolveGenerateNodeEffectiveCompilerReferenceBindings({'),
      source.indexOf('bindings: referenceBindings,') + 'bindings: referenceBindings,'.length,
    )
    expect(effectiveCollectionSource).toContain('isChatSkillCompileOnly,')
  })

  test('uses only the effective compiler reference fingerprint in component compile inputs', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const fingerprintSource = source.slice(
      source.indexOf('const compileInputFingerprint ='),
      source.indexOf('compileInputFingerprintRef.current ='),
    )

    expect(fingerprintSource).toContain('referenceBindings: referenceBindingsFingerprint')
    expect(fingerprintSource).not.toContain('buildGenerateNodeReferenceBindingsFingerprint(referenceBindings)')
  })

  test('suppresses only proven hidden-image validation while prompt and unknown errors fail closed', async () => {
    const model = await import('./generate-node-model')
    const imageSnapshot = model.buildGenerateNodeIncomingContextSnapshot({
      nodeId: 'target',
      edges: [{ id: 'edge-image', source: 'empty-image', target: 'target', targetHandle: 'image' }],
      nodes: [{ id: 'empty-image', data: { result: { content: ' ' } } }],
    })
    const promptSnapshot = model.buildGenerateNodeIncomingContextSnapshot({
      nodeId: 'target',
      edges: [{ id: 'edge-prompt', source: 'empty-prompt', target: 'target', targetHandle: 'text' }],
      nodes: [{ id: 'empty-prompt', data: { result: { content: ' ' } } }],
    })
    const mixedSnapshot = model.buildGenerateNodeIncomingContextSnapshot({
      nodeId: 'target',
      edges: [
        { id: 'edge-image', source: 'empty-image', target: 'target', targetHandle: 'image' },
        { id: 'edge-prompt', source: 'empty-prompt', target: 'target', targetHandle: 'text' },
      ],
      nodes: [
        { id: 'empty-image', data: { result: { content: ' ' } } },
        { id: 'empty-prompt', data: { result: { content: ' ' } } },
      ],
    })
    const imageError = imageSnapshot.referenceValidationError
    const promptError = promptSnapshot.referenceValidationError
    const unknownError = { error_code: 'REFERENCE_ASSET_INVALID', detail: 'unknown source' }

    expect(imageError).toMatchObject({ reference_type: 'image', source_edge_id: 'edge-image' })
    expect(promptError).toMatchObject({ reference_type: 'prompt', source_edge_id: 'edge-prompt' })
    expect(mixedSnapshot.referenceValidationError).toMatchObject({
      reference_type: 'prompt',
      source_edge_id: 'edge-prompt',
    })

    expect(model.resolveGenerateNodeEffectiveReferenceValidationError({
      filteringImages: true,
      persistedError: imageError,
      effectiveError: null,
    })).toBeNull()
    expect(model.resolveGenerateNodeEffectiveReferenceValidationError({
      filteringImages: true,
      persistedError: promptError,
      effectiveError: null,
    })).toBe(promptError)
    expect(model.resolveGenerateNodeEffectiveReferenceValidationError({
      filteringImages: true,
      persistedError: mixedSnapshot.referenceValidationError,
      effectiveError: null,
    })).toBe(mixedSnapshot.referenceValidationError)
    expect(model.resolveGenerateNodeEffectiveReferenceValidationError({
      filteringImages: false,
      persistedError: imageError,
      effectiveError: null,
    })).toBe(imageError)
    expect(model.resolveGenerateNodeEffectiveReferenceValidationError({
      filteringImages: true,
      persistedError: unknownError,
      effectiveError: null,
    })).toBe(unknownError)

    const retainedPromptError = { ...promptError, detail: 'effective prompt validation' }
    expect(model.resolveGenerateNodeEffectiveReferenceValidationError({
      filteringImages: true,
      persistedError: imageError,
      effectiveError: retainedPromptError,
    })).toBe(retainedPromptError)
  })

  test('runs one direct Chat Skill compile and returns its positive prompt packet without a Provider fallback', async () => {
    const model = await import('./generate-node-model')
    let compileCalls = 0
    const request = model.buildGenerateNodeSkillCompileRequest({
      skillName: 'h3-prompt-writing', packId: 'h3', revision: 'r1', prompt: 'hero prompt',
      mode: 'image_to_video', compilerModelId: 9, references: [],
    })

    const outcome = await model.runGenerateNodeChatSkillCompilation({
      request,
      compile: async received => {
        compileCalls += 1
        expect(received).toBe(request)
        return {
          data: {
            result: {
              skill_name: 'h3-prompt-writing', skill_version: 'r1', mode: 'image_to_video',
              prompt: 'positive', negative_prompt: 'negative', parameters: {}, references_used: [], warnings: ['trimmed'],
            },
            cache_key: 'sha256:input', cached: false,
          },
        }
      },
      isCurrent: () => true,
      packId: 'h3', packSource: 'https://github.com/MiniMax-AI/MiniMax-H3', compilerModelId: 9, rawPrompt: 'hero prompt',
    })

    expect(compileCalls).toBe(1)
    expect(outcome).toMatchObject({
      status: 'current',
      packet: {
        content: 'positive', negative_prompt: 'negative', compiled_prompt: 'positive', compiled_negative_prompt: 'negative',
        skill_pack_id: 'h3', compiler_model_id: 9, compiled_input_hash: 'sha256:input', warnings: ['trimmed'],
      },
    })
  })

  test('returns stale without a result packet when the direct Chat Skill response is no longer current', async () => {
    const model = await import('./generate-node-model')
    let compileCalls = 0
    const outcome = await model.runGenerateNodeChatSkillCompilation({
      request: model.buildGenerateNodeSkillCompileRequest({
        skillName: 'skill', prompt: 'source', mode: 'text_to_image', compilerModelId: 4, references: [],
      }),
      compile: async () => {
        compileCalls += 1
        return {
          data: {
            result: {
              skill_name: 'skill', skill_version: 'r1', mode: 'text_to_image', prompt: 'late positive',
              negative_prompt: '', parameters: {}, references_used: [], warnings: [],
            },
            cache_key: 'late-hash', cached: true,
          },
        }
      },
      isCurrent: () => false,
      packId: 'pack', compilerModelId: 4, rawPrompt: 'source',
    })

    expect(compileCalls).toBe(1)
    expect(outcome).toEqual({ status: 'stale' })
  })

  test('keeps the frozen execution provenance when a direct compile response omits optional bindings', async () => {
    const model = await import('./generate-node-model')
    const executionReferences = [{
      reference_index: 1, reference_id: 'hero', reference_role: 'character' as const, type: 'image' as const,
      url: 'https://cdn/hero.png', source_asset_ids: [42],
    }]
    const outcome = await model.runGenerateNodeChatSkillCompilation({
      request: model.buildGenerateNodeSkillCompileRequest({
        skillName: 'skill', prompt: 'source', mode: 'image_to_video', compilerModelId: 4, references: executionReferences,
      }),
      compile: async () => ({
        data: {
          result: {
            skill_name: 'skill', skill_version: 'r1', mode: 'image_to_video', prompt: 'positive',
            negative_prompt: '', parameters: {}, references_used: ['hero'], warnings: [],
          },
          cache_key: 'hash', cached: false,
        },
      }),
      isCurrent: () => true,
      executionReferences,
      packId: 'pack', compilerModelId: 4, rawPrompt: 'source',
    })

    expect(outcome).toMatchObject({
      status: 'current',
      packet: { reference_bindings: [{ reference_id: 'hero', source_asset_ids: [42] }], source_asset_ids: [42] },
    })
  })

  test('propagates a typed direct Chat Skill compile failure without invoking a Provider fallback', async () => {
    const model = await import('./generate-node-model')
    const typedFailure = {
      response: { data: { error_code: 'SKILL_COMPILER_VISION_REQUIRED', detail: 'compiler needs Vision' } },
    }
    let compileCalls = 0

    await expect(model.runGenerateNodeChatSkillCompilation({
      request: model.buildGenerateNodeSkillCompileRequest({
        skillName: 'skill', prompt: 'source', mode: 'image_to_video', compilerModelId: 4, references: [],
      }),
      compile: async () => {
        compileCalls += 1
        throw typedFailure
      },
      isCurrent: () => true,
      packId: 'pack', compilerModelId: 4, rawPrompt: 'source',
    })).rejects.toBe(typedFailure)

    expect(compileCalls).toBe(1)
  })

  test('ignores a late direct Chat Skill rejection after the run becomes stale', async () => {
    const model = await import('./generate-node-model')
    const lateFailure = new Error('late compiler failure')

    const outcome = await model.runGenerateNodeChatSkillCompilation({
      request: model.buildGenerateNodeSkillCompileRequest({
        skillName: 'skill', prompt: 'source', mode: 'text_to_image', compilerModelId: 4, references: [],
      }),
      compile: async () => { throw lateFailure },
      isCurrent: () => false,
      packId: 'pack', compilerModelId: 4, rawPrompt: 'source',
    })

    expect(outcome).toEqual({ status: 'stale' })
  })

  test('does not let a stale compile settlement clear or complete its replacement run', async () => {
    const model = await import('./generate-node-model')
    const tracker = model.createGenerateNodeRunTracker()
    const oldToken = tracker.start([])
    expect(oldToken).not.toBeNull()
    let activeChatToken = oldToken
    let generating = true
    let progress = 'old compile'
    let nodeStatus = 'running'

    // Interrupt the old run, then start a replacement before the old promise settles.
    tracker.invalidate()
    activeChatToken = null
    generating = false
    progress = ''
    const replacementToken = tracker.start([])
    expect(replacementToken).not.toBeNull()
    activeChatToken = replacementToken
    generating = true
    progress = 'replacement compile'

    const shouldCleanupOldUi = model.settleGenerateNodeChatSkillRun({
      tracker,
      token: oldToken!,
      activeChatToken,
    })
    if (shouldCleanupOldUi) {
      activeChatToken = null
      generating = false
      progress = ''
      nodeStatus = 'idle'
    }

    expect(shouldCleanupOldUi).toBe(false)
    expect(tracker.isCurrent(replacementToken)).toBe(true)
    expect(activeChatToken).toBe(replacementToken)
    expect(generating).toBe(true)
    expect(progress).toBe('replacement compile')
    expect(nodeStatus).toBe('running')
  })

  test('current stale success and rejection settle idle and allow a replacement run', async () => {
    const model = await import('./generate-node-model')

    for (const settlement of ['success', 'rejection'] as const) {
      const tracker = model.createGenerateNodeRunTracker()
      const runToken = tracker.start([])
      expect(runToken).not.toBeNull()
      let fingerprintCurrent = true
      let resolveCompile!: (value: any) => void
      let rejectCompile!: (error: unknown) => void
      const compilation = model.runGenerateNodeChatSkillCompilation({
        request: model.buildGenerateNodeSkillCompileRequest({
          skillName: 'skill', prompt: settlement, mode: 'text_to_image', compilerModelId: 4, references: [],
        }),
        compile: () => new Promise((resolve, reject) => {
          resolveCompile = resolve
          rejectCompile = reject
        }),
        isCurrent: () => tracker.isCurrent(runToken) && fingerprintCurrent,
        packId: 'pack', compilerModelId: 4, rawPrompt: settlement,
      })
      fingerprintCurrent = false
      if (settlement === 'success') {
        resolveCompile({
          data: {
            result: {
              skill_name: 'skill', skill_version: 'r1', mode: 'text_to_image', prompt: 'stale success',
              negative_prompt: '', parameters: {}, references_used: [], warnings: [],
            },
            cache_key: 'stale', cached: false,
          },
        })
      } else {
        rejectCompile(new Error('stale rejection'))
      }
      expect(await compilation).toEqual({ status: 'stale' })

      let activeChatToken = runToken
      let generating = true
      let progress = 'compiling'
      let nodeStatus = 'running'
      const settled = model.settleGenerateNodeChatSkillRun({
        tracker,
        token: runToken!,
        activeChatToken,
      })
      if (settled) {
        activeChatToken = null
        generating = false
        progress = ''
        nodeStatus = 'idle'
      }

      expect(settled).toBe(true)
      expect(activeChatToken).toBeNull()
      expect(generating).toBe(false)
      expect(progress).toBe('')
      expect(nodeStatus).toBe('idle')
      expect(tracker.start([])).not.toBeNull()
    }
  })

  test('external cancellation invalidates late compile success and rejection while allowing replacement runs', async () => {
    const model = await import('./generate-node-model')
    const tracker = model.createGenerateNodeRunTracker()
    const oldToken = tracker.start([])
    expect(oldToken).not.toBeNull()
    let resolveOld!: (value: any) => void
    const oldSuccess = model.runGenerateNodeChatSkillCompilation({
      request: model.buildGenerateNodeSkillCompileRequest({
        skillName: 'skill', prompt: 'old', mode: 'text_to_image', compilerModelId: 4, references: [],
      }),
      compile: () => new Promise(resolve => { resolveOld = resolve }),
      isCurrent: () => tracker.isCurrent(oldToken),
      packId: 'pack', compilerModelId: 4, rawPrompt: 'old',
    })

    expect(model.cancelGenerateNodeChatSkillRun({ tracker, activeChatToken: oldToken })).toBe(true)
    const replacementToken = tracker.start([])
    expect(replacementToken).not.toBeNull()
    resolveOld({
      data: {
        result: {
          skill_name: 'skill', skill_version: 'r1', mode: 'text_to_image', prompt: 'late success',
          negative_prompt: '', parameters: {}, references_used: [], warnings: [],
        },
        cache_key: 'late', cached: false,
      },
    })
    expect(await oldSuccess).toEqual({ status: 'stale' })
    expect(tracker.isCurrent(replacementToken)).toBe(true)

    expect(tracker.complete(replacementToken)).toBe(true)
    const rejectedToken = tracker.start([])
    expect(rejectedToken).not.toBeNull()
    let rejectOld!: (error: unknown) => void
    const oldRejection = model.runGenerateNodeChatSkillCompilation({
      request: model.buildGenerateNodeSkillCompileRequest({
        skillName: 'skill', prompt: 'reject', mode: 'text_to_image', compilerModelId: 4, references: [],
      }),
      compile: () => new Promise((_resolve, reject) => { rejectOld = reject }),
      isCurrent: () => tracker.isCurrent(rejectedToken),
      packId: 'pack', compilerModelId: 4, rawPrompt: 'reject',
    })
    expect(model.cancelGenerateNodeChatSkillRun({ tracker, activeChatToken: rejectedToken })).toBe(true)
    const secondReplacement = tracker.start([])
    rejectOld(new Error('late rejection'))
    expect(await oldRejection).toEqual({ status: 'stale' })
    expect(tracker.isCurrent(secondReplacement)).toBe(true)
  })

  test('initial status never overwrites an explicit terminal error with or without a prior result', async () => {
    const model = await import('./generate-node-model')

    expect(model.resolveGenerateNodeInitialRunStatus({ currentStatus: undefined, hasResult: false })).toBe('idle')
    expect(model.resolveGenerateNodeInitialRunStatus({ currentStatus: undefined, hasResult: true })).toBe('success')
    expect(model.resolveGenerateNodeInitialRunStatus({ currentStatus: 'error', hasResult: false })).toBeUndefined()
    expect(model.resolveGenerateNodeInitialRunStatus({ currentStatus: 'error', hasResult: true })).toBeUndefined()
  })

  test('routes Chat plus Skill through the compiler before Key/model and keeps legacy generation transport separate', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    expect(source).toContain("const isChatSkillCompileOnly = mode === 'chat' && hasEffectiveSkill")
    const handleRunStart = source.indexOf('const handleRun = async () => {')
    const handleRunEnd = source.indexOf('useEffect(() => {', handleRunStart)
    const handleRunSource = source.slice(handleRunStart, handleRunEnd)
    const directStart = handleRunSource.indexOf('if (isChatSkillCompileOnly) {')
    const legacyStart = handleRunSource.indexOf('if (!selectedKey || !selectedModel)')
    const directSource = handleRunSource.slice(directStart, legacyStart)
    const legacySource = handleRunSource.slice(legacyStart)

    expect(directStart).toBeGreaterThan(-1)
    expect(directStart).toBeLessThan(legacyStart)
    const directReturn = handleRunSource.lastIndexOf('return', legacyStart)
    expect(directReturn).toBeGreaterThan(directStart)
    expect(directReturn).toBeLessThan(legacyStart)
    expect(directSource).toContain('runGenerateNodeChatSkillCompilation({')
    expect(directSource).toContain('compile: compileSkillPreview')
    expect(directSource).toContain('compileInputFingerprintRef.current === runCompileFingerprint')
    expect(directSource).toContain('finishGeneration(outcome.packet, runToken, mode)')
    expect(directSource).not.toContain('resolveProvider()')
    expect(directSource).not.toContain('createSSEClient')
    expect(directSource).not.toContain("url: '/generate'")
    expect(directSource).not.toContain('result: null')
    expect(directSource).toContain('if (settleGenerateNodeChatSkillRun({')
    expect(directSource).not.toContain('generateRunTrackerRef.current.complete(runToken)\n          if (chatSkillCompileRunTokenRef.current === runToken)')
    expect(source).toContain('executionCompatibilityError: isChatSkillCompileOnly ? null : executionCompatibilityError')
    expect(source).toContain('if (isChatSkillCompileOnly && executionCompatibilityError) setExecutionCompatibilityError(null)')
    expect(handleRunSource).toContain('if (!isChatSkillCompileOnly && executionCompatibilityError)')
    expect(source).toContain('mode: (isChatSkillCompileOnly ? effectiveSkillCompileMode : mode) as CanvasSkillMediaMode')
    expect(legacySource).toContain('createSSEClient(id,')
    expect(legacySource).toContain("await apiClient.request({ url: '/generate', method: 'POST', data: payload })")
    expect(legacySource).toContain('updateNodeData(id, { result: null, _finalSourcePrompt: prompt, _finalSystemPrompt: data?._systemPromptOverride || selectedRolePrompt })')
  })

  test('resolves preview cache state only for direct Chat Skill completion', async () => {
    const model = await import('./generate-node-model')

    expect(model.resolveGenerateNodeChatSkillPreviewCached({ isChatSkillCompileOnly: true, cached: true })).toBe(true)
    expect(model.resolveGenerateNodeChatSkillPreviewCached({ isChatSkillCompileOnly: true, cached: undefined })).toBe(false)
    expect(model.resolveGenerateNodeChatSkillPreviewCached({ isChatSkillCompileOnly: false, cached: true })).toBeUndefined()
    expect(model.resolveGenerateNodeChatSkillPreviewCached({ isChatSkillCompileOnly: false, cached: undefined })).toBeUndefined()
  })

  test('commits cache state for direct Chat Skill completion without mutating ordinary compiled results', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const finishStart = source.indexOf('const finishGeneration =')
    const failStart = source.indexOf('const failGeneration =', finishStart)
    const finishSource = source.slice(finishStart, failStart)

    expect(finishSource).toContain('const finalSkillPreviewCached = resolveGenerateNodeChatSkillPreviewCached({')
    expect(finishSource).toContain('isChatSkillCompileOnly,')
    expect(finishSource).toContain('cached: finalResult.skill_preview_cached,')
    expect(finishSource).toContain('if (finalSkillPreviewCached !== undefined) setSkillPreviewCached(finalSkillPreviewCached)')
    expect(finishSource).toContain('...(finalSkillPreviewCached === undefined ? {} : {')
    expect(finishSource).toContain('skillPreviewCached: finalSkillPreviewCached')
    expect(finishSource).toContain('skill_preview_cached: finalSkillPreviewCached')
    expect(finishSource).not.toContain('const finalSkillPreviewCached = Boolean(finalResult.skill_preview_cached)')
    expect(finishSource).not.toMatch(/\n\s*setSkillPreviewCached\(finalSkillPreviewCached\)/)
  })

  test('interrupts a compiler-only Chat run locally while preserving the ordinary backend interrupt', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const interruptStart = source.indexOf('const handleInterrupt = async () => {')
    const interruptEnd = source.indexOf('const handleSaveToAsset =', interruptStart)
    const interruptSource = source.slice(interruptStart, interruptEnd)
    const directEnd = interruptSource.indexOf('return')
    const directInterrupt = interruptSource.slice(0, directEnd)

    expect(interruptSource).toContain('cancelChatSkillCompileRun()')
    expect(directInterrupt).not.toContain('generateRunTrackerRef.current.invalidate()')
    expect(directInterrupt).toContain("setNodeStatus(id, result ? 'success' : 'idle')")
    expect(directInterrupt).not.toContain("apiClient.post(`/interrupt/${id}`)")
    expect(interruptSource).toContain("apiClient.post(`/interrupt/${id}`)")
  })

  test('subscribes to external error stops and preserves explicit lifecycle status', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    expect(source).toContain('useCanvasStore.subscribe((state, previousState) => {')
    expect(source).toContain("state.nodeRunStatus[nodeId] !== 'error'")
    expect(source).toContain("previousState.nodeRunStatus[nodeId] === 'error'")
    expect(source).toContain('subscribeToGenerateNodeExternalError(id, cancelChatSkillCompileRun)')
    expect(source).toContain('cancelChatSkillCompileRun()')
    expect(source).toContain('resolveGenerateNodeInitialRunStatus({')
    expect(source).toContain('currentStatus: useCanvasStore.getState().nodeRunStatus[id]')
    expect(source).not.toContain("setNodeStatus(id, generating ? 'running' : result ? 'success' : 'idle')")

    const failStart = source.indexOf('const failGeneration =')
    const failEnd = source.indexOf('const handleSSEMessage =', failStart)
    expect(source.slice(failStart, failEnd)).toContain("setNodeStatus(id, 'error')")
  })

  test('restores idle only when the current stale Chat Skill run owns settlement', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const staleStart = source.indexOf("if (outcome.status === 'stale') {")
    const staleEnd = source.indexOf('finishGeneration(outcome.packet, runToken, mode)', staleStart)
    const staleBranch = source.slice(staleStart, staleEnd)
    const settledStart = staleBranch.indexOf('if (settleGenerateNodeChatSkillRun({')
    const settledEnd = staleBranch.indexOf('\n          }\n          return', settledStart) + '\n          }'.length
    const settledBranch = staleBranch.slice(settledStart, settledEnd)

    expect(settledBranch).toContain("setNodeStatus(id, 'idle')")
    expect(staleBranch.slice(settledEnd)).not.toContain("setNodeStatus(id, 'idle')")
  })

  test('external error subscription fires synchronously on transitions and cleans up', async () => {
    const model = await loadGenerateNodeReferenceApi()
    expect(typeof model.subscribeToGenerateNodeExternalError).toBe('function')
    const nodeId = 'chat-skill-external-stop-test'
    const previousStatuses = useCanvasStore.getState().nodeRunStatus
    useCanvasStore.setState({
      nodeRunStatus: { ...previousStatuses, [nodeId]: 'idle' },
    })
    let cancellations = 0
    const unsubscribe = model.subscribeToGenerateNodeExternalError(nodeId, () => {
      cancellations += 1
    })
    try {
      useCanvasStore.getState().setNodeStatus(nodeId, 'error')
      expect(cancellations).toBe(1)
      useCanvasStore.getState().setNodeStatus(nodeId, 'error')
      expect(cancellations).toBe(1)

      unsubscribe()
      useCanvasStore.getState().setNodeStatus(nodeId, 'running')
      useCanvasStore.getState().setNodeStatus(nodeId, 'error')
      expect(cancellations).toBe(1)
    } finally {
      unsubscribe()
      useCanvasStore.setState({ nodeRunStatus: previousStatuses })
    }
  })

  test('clears both preview cache aliases when compile inputs change', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const fingerprintStart = source.indexOf('if (previous === compileInputFingerprint) return')
    const fingerprintEnd = source.indexOf('const prepareReferenceBindingsForExecution =', fingerprintStart)
    const invalidation = source.slice(fingerprintStart, fingerprintEnd)

    expect(invalidation).toContain('skillPreviewCached: false')
    expect(invalidation).toContain('skill_preview_cached: false')
  })

  test('builds a canonical locked Skill compile request and omits empty optional fields', async () => {
    const model = await import('./GenerateNode')
    const references = [
      { reference_index: 2, reference_id: 'style', reference_role: 'style', type: 'image', url: 'https://cdn/style.png' },
      { reference_index: 1, reference_id: 'hero', reference_role: 'character', type: 'image', url: 'https://cdn/hero.png' },
    ] as const

    const request = model.buildGenerateNodeSkillCompileRequest({
      skillName: 'portrait-skill',
      packId: 'portrait-pack',
      revision: 'rev-7',
      prompt: 'paint the hero',
      mode: 'text_to_image',
      compilerModelId: 9,
      references,
      nodeParams: {},
      arguments: {},
    })

    expect(request).toEqual({
      skill_name: 'portrait-skill',
      pack_id: 'portrait-pack',
      skill_revision: 'rev-7',
      raw_prompt: 'paint the hero',
      mode: 'text_to_image',
      compiler_model_id: 9,
      incoming_assets: [
        { reference_index: 1, reference_id: 'hero', reference_role: 'character', type: 'image', url: 'https://cdn/hero.png' },
        { reference_index: 2, reference_id: 'style', reference_role: 'style', type: 'image', url: 'https://cdn/style.png' },
      ],
    })
    expect(references[0].reference_index).toBe(2)

    expect(model.buildGenerateNodeSkillCompileRequest({
      skillName: 'portrait-skill', prompt: '', mode: 'text_to_image', compilerModelId: 9, references: [],
    })).toEqual({
      skill_name: 'portrait-skill', raw_prompt: '', mode: 'text_to_image', compiler_model_id: 9,
    })
  })

  test('normalizes compiler-owned Skill compile audit bindings and cache fields without mutating inputs', async () => {
    const model = await import('./GenerateNode')
    const response = {
      result: {
        skill_name: 'portrait-skill', skill_version: 'rev-7', mode: 'text_to_image' as const,
        prompt: 'positive', negative_prompt: 'negative', parameters: {}, references_used: ['hero', 'style'],
        warnings: ['trimmed'], reference_mode_hint: 'Ref2VA' as const,
        reference_bindings: [
          { reference_index: 2, reference_id: 'style', reference_role: 'style' as const, type: 'image' as const, url: 'https://cdn/style.png' },
          { reference_index: 1, reference_id: 'hero', reference_role: 'character' as const, type: 'image' as const, url: 'https://cdn/hero.png' },
        ],
      },
      cache_key: 'sha256:compile', cached: true,
    }
    const fallback = [
      { reference_index: 1, reference_id: 'fallback', reference_role: 'general' as const, type: 'image' as const, url: 'https://cdn/fallback.png' },
    ]
    const snapshot = structuredClone({ response, fallback })

    expect(model.normalizeGenerateNodeSkillCompileAudit({
      response, executionReferences: fallback, packSource: 'https://skills/portrait', compilerModelId: 9,
    })).toEqual({
      compiledPrompt: 'positive',
      compiledNegativePrompt: 'negative',
      compiledReferences: ['hero', 'style'],
      compiledReferenceBindings: [
        { reference_index: 1, reference_id: 'hero', reference_role: 'character', type: 'image', url: 'https://cdn/hero.png' },
        { reference_index: 2, reference_id: 'style', reference_role: 'style', type: 'image', url: 'https://cdn/style.png' },
      ],
      referenceModeHint: 'Ref2VA',
      compiledInputHash: 'sha256:compile',
      compileWarnings: ['trimmed'],
      compilerModelId: 9,
      skillPreviewResult: response.result,
      skillPreviewCached: true,
      skillPackSource: 'https://skills/portrait',
    })
    expect({ response, fallback }).toEqual(snapshot)
  })

  test('falls back to canonical execution references when compiler bindings are invalid', async () => {
    const model = await import('./GenerateNode')
    const fallback = [
      { reference_index: 2, reference_id: 'style', reference_role: 'style' as const, type: 'image' as const, url: 'https://cdn/style.png' },
      { reference_index: 1, reference_id: 'hero', reference_role: 'character' as const, type: 'image' as const, url: 'https://cdn/hero.png' },
    ]
    const result = {
      skill_name: 'portrait-skill', skill_version: 'rev-7', mode: 'text_to_image' as const,
      prompt: 'positive', negative_prompt: '', parameters: {}, references_used: [], warnings: [],
      reference_bindings: [{ reference_index: 1, reference_id: '', reference_role: 'character' as const, type: 'image' as const, url: '' }],
    }

    const audit = model.normalizeGenerateNodeSkillCompileAudit({
      response: { result, cache_key: '', cached: false },
      executionReferences: fallback,
      packSource: '',
      compilerModelId: 12,
    })
    expect(audit.compiledReferenceBindings.map((binding: any) => binding.reference_id)).toEqual(['hero', 'style'])
    expect(audit.compiledInputHash).toBe('')
    expect(audit.skillPreviewCached).toBe(false)
    expect(audit.compilerModelId).toBe(12)
  })

  test('normalizes persisted Chat prompt target aliases and invalid values', async () => {
    const model = await import('./generate-node-model')
    expect(model.normalizeGenerateNodeSkillTargetMode('image_to_video')).toBe('image_to_video')
    expect(model.normalizeGenerateNodeSkillTargetMode({ skillTargetMode: 'image_to_image' })).toBe('image_to_image')
    expect(model.normalizeGenerateNodeSkillTargetMode({ skill_target_mode: 'text_to_video' })).toBe('text_to_video')
    expect(model.normalizeGenerateNodeSkillTargetMode('chat')).toBe('text_to_image')
    expect(model.normalizeGenerateNodeSkillTargetMode('vision')).toBe('text_to_image')
    expect(model.normalizeGenerateNodeSkillTargetMode('invalid')).toBe('text_to_image')
    expect(model.normalizeGenerateNodeSkillTargetMode(undefined)).toBe('text_to_image')
  })

  test('uses Chat target mode only for Skill compilation', async () => {
    const model = await import('./generate-node-model')
    expect(model.resolveGenerateNodeSkillCompileMode({ nodeMode: 'chat', skillTargetMode: 'image_to_video' })).toBe('image_to_video')
    expect(model.resolveGenerateNodeSkillCompileMode({ nodeMode: 'text_to_video', skillTargetMode: 'image_to_image' })).toBe('text_to_video')
    expect(model.resolveGenerateNodeSkillCompileMode({ nodeMode: 'vision', skillTargetMode: 'image_to_image' })).toBeUndefined()
  })

  test('filters prompt-ready Skills by effective target and picks one compatible Skill after install', async () => {
    const model = await import('./generate-node-model')
    const skills = [
      { packId: 'h3', name: 'h3-prompt-writing', revision: 'r1', compatibility: 'prompt_ready', mediaModes: ['text_to_video', 'image_to_video'] },
      { packId: 'other', name: 'image-only', revision: 'r2', compatibility: 'prompt_ready', mediaModes: ['text_to_image'] },
      { packId: 'other', name: 'workflow', revision: 'r2', compatibility: 'workflow_only', mediaModes: [] },
    ]
    expect(model.filterGenerateNodeCompatibleSkills(skills, 'text_to_video')).toEqual([skills[0]])
    expect(model.selectInstalledGenerateNodeSkill({ skills, packId: 'h3', revision: 'r1', targetMode: 'image_to_video' })).toBe(skills[0])
    expect(model.resolveGenerateNodeSkillFallbackTarget({ skill: skills[0], targetMode: 'text_to_image' })).toBe('text_to_video')
    expect(model.resolveGenerateNodeSkillFallbackTarget({ skill: { mediaModes: [] }, targetMode: 'image_to_image' })).toBe('image_to_image')
  })

  test('falls back to the first declared Skill target during hydration and command resolution', async () => {
    const model = await import('./GenerateNode')
    const skill = { mediaModes: ['image_to_video', 'text_to_video'] }

    expect(model.resolveGenerateNodeSkillTargetTransition({
      origin: 'hydration',
      requestedTargetMode: 'text_to_image',
      skill,
    })).toEqual({ targetMode: 'image_to_video', clearSkill: false })
    expect(model.resolveGenerateNodeSkillTargetTransition({
      origin: 'command',
      requestedTargetMode: 'image_to_image',
      skill,
    })).toEqual({ targetMode: 'image_to_video', clearSkill: false })
  })

  test('keeps deliberate target changes and clears only an incompatible selected Skill', async () => {
    const model = await import('./GenerateNode')

    expect(model.resolveGenerateNodeSkillTargetTransition({
      origin: 'user',
      requestedTargetMode: 'text_to_image',
      skill: { mediaModes: ['image_to_video'] },
    })).toEqual({ targetMode: 'text_to_image', clearSkill: true })
    expect(model.resolveGenerateNodeSkillTargetTransition({
      origin: 'user',
      requestedTargetMode: 'image_to_image',
      skill: { mediaModes: [] },
    })).toEqual({ targetMode: 'image_to_image', clearSkill: false })
    expect(model.resolveGenerateNodeSkillTargetTransition({
      origin: 'user',
      requestedTargetMode: 'image_to_video',
      skill: { mediaModes: ['image_to_video'] },
    })).toEqual({ targetMode: 'image_to_video', clearSkill: false })
  })

  test('preserves user target intent while Skill metadata is unresolved, then clears an incompatible dropdown', async () => {
    const model = await import('./GenerateNode')
    const requestedTargetMode = 'text_to_image' as const

    expect(model.resolveGenerateNodeSkillTargetTransition({
      origin: 'user',
      requestedTargetMode,
      skill: undefined,
    })).toEqual({ targetMode: requestedTargetMode, clearSkill: false })
    expect(model.resolveGenerateNodeSkillTargetTransition({
      origin: 'user',
      requestedTargetMode,
      skill: { mediaModes: ['image_to_video'] },
    })).toEqual({ targetMode: requestedTargetMode, clearSkill: true })
  })

  test('Chat target wiring persists aliases, compiles with ordered references, and retains H3 video targets', async () => {
    const model = await import('./GenerateNode')
    const source = [readFileSync(join(import.meta.dir, 'generate-node-model.ts'), 'utf8'), readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')].join('\n')
    const references = Array.from({ length: 9 }, (_, index) => ({
      reference_index: index + 1,
      reference_id: `ref-${index + 1}`,
      reference_role: 'general' as const,
      type: 'image' as const,
      url: `https://cdn.example/ref-${index + 1}.png`,
    }))
    const request = model.buildGenerateNodeSkillCompileRequest({
      skillName: 'h3-prompt-writing',
      packId: 'h3',
      revision: 'r1',
      prompt: 'animate this scene',
      mode: 'image_to_video',
      references,
      nodeParams: {},
      compilerModelId: 9,
    })

    expect(request.mode).toBe('image_to_video')
    expect(request.incoming_assets?.map(reference => reference.reference_id)).toEqual(references.map(reference => reference.reference_id))
    expect(request.incoming_assets).toHaveLength(9)
    expect(model.filterGenerateNodeCompatibleSkills([
      { compatibility: 'prompt_ready', mediaModes: ['text_to_video', 'image_to_video'] },
    ], 'image_to_video')).toHaveLength(1)
    expect(source).toContain('skillTargetMode')
    expect(source).toContain('skill_target_mode')
    expect(source).toContain('effectiveSkillCompileMode')
    expect(source).toContain('GENERATE_NODE_SKILL_TARGET_MODE_OPTIONS')
    expect(source).toContain("mode === 'chat' && (skillTargetMode === 'image_to_image' || skillTargetMode === 'image_to_video')")
    expect(source).toContain('Chat Skill 仅使用 Skill 编译模型，不会调用上方选择的 Chat 模型。')
    expect(source).toContain("mode === 'chat' && hasEffectiveSkill ? '生成提示词' : '运行'")
    expect(source).toContain("if (mode !== 'chat' || !effectiveSkill) {")
    expect(source).toContain("appliedSkillTargetResolutionRef.current = ''")
    expect(source).toContain('pendingSkillTargetUserResolutionRef')
    expect(source).toContain("executionKind: mode === 'chat' && hasEffectiveSkill ? 'skill_compile_only' : 'provider'")
    expect(source).toContain('effectiveTarget: effectiveSkillCompileMode')
    expect(source).toContain('effectiveSkillIdentity')
    expect(source).toContain("'skill_preview_cached'")
    expect(source).toContain('aria-label="目标提示词类型"')
  })

  test('resets target-resolution dedupe when Chat Skill resolution disappears', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const transitionEffect = source.slice(
      source.indexOf("if (mode !== 'chat' || !effectiveSkill)"),
      source.indexOf('const resolutionKey ='),
    )

    expect(transitionEffect).toContain("appliedSkillTargetResolutionRef.current = ''")
    expect(transitionEffect.indexOf("appliedSkillTargetResolutionRef.current = ''")).toBeLessThan(transitionEffect.indexOf('return'))
  })

  test('carries pending user target origin through Skill metadata loading without rewriting commands', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const skillHandler = source.slice(source.indexOf('const selectPromptSkill ='), source.indexOf('const selectSkillTargetMode ='))
    const targetHandler = source.slice(source.indexOf('const selectSkillTargetMode ='), source.indexOf('const compilerSelector ='))
    const transitionEffect = source.slice(source.indexOf("if (mode !== 'chat' || !effectiveSkill)"), source.indexOf('useEffect(() => {\n    if (reconciledIncomingFingerprintRef'))

    expect(targetHandler).toContain('pendingSkillTargetUserResolutionRef.current = true')
    expect(targetHandler).toContain('!effectiveSkill')
    expect(skillHandler).toContain('pendingSkillTargetUserResolutionRef.current = false')
    expect(transitionEffect).toContain("pendingSkillTargetUserResolutionRef.current ? 'user'")
    expect(transitionEffect).toContain('if (transition.clearSkill && !parsedSkillCommand)')
    expect(transitionEffect).toContain("if (origin === 'user' && parsedSkillCommand)")
    expect(targetHandler).toContain("appliedSkillTargetResolutionRef.current = `command:")
    expect(transitionEffect).not.toContain('setPrompt(')
  })

  test('keeps saved dropdown identity when an active command conflicts with a user target change', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
    const targetHandler = source.slice(source.indexOf('const selectSkillTargetMode ='), source.indexOf('const compilerSelector ='))

    expect(targetHandler).toContain("if (transition.clearSkill && !parsedSkillCommand) selectPromptSkill('')")
    expect(targetHandler).not.toContain("if (transition.clearSkill) selectPromptSkill('')")
    expect(targetHandler).not.toContain('setPrompt(')
  })

  test('does not auto-select when multiple installed Skills are compatible', async () => {
    const model = await import('./generate-node-model')
    const skills = [
      { packId: 'pack', name: 'first', revision: 'r1', compatibility: 'prompt_ready', mediaModes: ['text_to_image'] },
      { packId: 'pack', name: 'second', revision: 'r1', compatibility: 'prompt_ready', mediaModes: [] },
    ]

    expect(model.selectInstalledGenerateNodeSkill({
      skills,
      packId: 'pack',
      revision: 'r1',
      targetMode: 'text_to_image',
    })).toBeUndefined()
  })

  test('selects the only compatible Skill from the exact installed pack revision without mutating inputs', async () => {
    const model = await import('./generate-node-model')
    const previousSelection = { packId: 'previous', name: 'kept-unless-replaced', revision: 'old' }
    const skills = [
      { packId: 'h3', name: 'chosen', revision: 'locked-123', compatibility: 'prompt_ready', mediaModes: ['image_to_video'] },
      { packId: 'h3', name: 'wrong-revision', revision: 'latest', compatibility: 'prompt_ready', mediaModes: ['image_to_video'] },
      { packId: 'other', name: 'wrong-pack', revision: 'locked-123', compatibility: 'prompt_ready', mediaModes: ['image_to_video'] },
      { packId: 'h3', name: 'wrong-target', revision: 'locked-123', compatibility: 'prompt_ready', mediaModes: ['text_to_image'] },
      { packId: 'h3', name: 'not-ready', revision: 'locked-123', compatibility: 'workflow_only', mediaModes: [] },
    ]
    const before = JSON.stringify({ skills, previousSelection })

    expect(model.resolveGenerateNodeSkillInstallOutcome({
      skills,
      packId: 'h3',
      revision: 'locked-123',
      targetMode: 'image_to_video',
      previousSelection,
    })).toEqual({
      status: 'selected',
      selection: { packId: 'h3', name: 'chosen', revision: 'locked-123' },
    })
    expect(JSON.stringify({ skills, previousSelection })).toBe(before)
  })

  test('preserves the previous selection when an installed revision needs a choice or has no compatible Skill', async () => {
    const model = await import('./generate-node-model')
    const previousSelection = { packId: 'previous', name: 'portrait', revision: 'old-1' }
    const compatible = (name: string) => ({
      packId: 'pack', name, revision: 'locked', compatibility: 'prompt_ready', mediaModes: ['text_to_image'],
    })

    expect(model.resolveGenerateNodeSkillInstallOutcome({
      skills: [compatible('first'), compatible('second')],
      packId: 'pack',
      revision: 'locked',
      targetMode: 'text_to_image',
      previousSelection,
    })).toEqual({ status: 'choose', selection: previousSelection })

    expect(model.resolveGenerateNodeSkillInstallOutcome({
      skills: [{ ...compatible('video-only'), mediaModes: ['text_to_video'] }],
      packId: 'pack',
      revision: 'locked',
      targetMode: 'text_to_image',
      previousSelection,
    })).toEqual({ status: 'installed_no_compatible', selection: previousSelection })

    expect(model.resolveGenerateNodeSkillInstallOutcome({
      skills: [],
      packId: 'pack',
      revision: 'locked',
      targetMode: 'text_to_image',
      previousSelection: null,
    })).toEqual({ status: 'installed_no_compatible', selection: null })
  })

  test('wires the GitHub Skill Pack installer through the typed API and refreshes both Skill lists', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')

    expect(source).toContain('installSkillPack,')
    expect(source).toContain("placeholder=\"https://github.com/MiniMax-AI/MiniMax-H3\"")
    expect(source).toContain('安装 Skill Pack')
    expect(source).toContain('installSkillPack(skillPackInstallUrl.trim())')
    expect(source).toContain('disabled={skillPackInstalling}')
    expect(source).toContain('loading={skillPackInstalling}')
    expect(source).toContain('skillPackInstallError.error_code')
    expect(source).toContain('skillPackInstallError.detail')
    expect(source).toContain('listSkills()')
    expect(source).toContain('listSkills(effectiveSkillCompileMode, true)')
    expect(source).toContain('setSkillPackInstallUrl(\'\')')
    expect(source).toContain('resolveGenerateNodeSkillInstallApplication({')
    expect(source).toContain('setSkillCompileEnabled(true)')
  })

  test('invalidates pre-install Skill lists and accepts only the latest request in each channel', async () => {
    const model = await import('./generate-node-model')
    const coordinator = model.createGenerateNodeSkillListRequestCoordinator()
    const deferred = <T>() => {
      let resolve!: (value: T) => void
      const promise = new Promise<T>(next => { resolve = next })
      return { promise, resolve }
    }
    const staleAll = deferred<string[]>()
    const preInstallToken = coordinator.start('all')
    const applied: string[][] = []
    const staleApply = staleAll.promise.then(skills => {
      if (coordinator.isCurrent(preInstallToken)) applied.push(skills)
    })

    coordinator.invalidate()
    const postInstallToken = coordinator.start('all')
    expect(coordinator.isCurrent(preInstallToken)).toBe(false)
    expect(coordinator.isCurrent(postInstallToken)).toBe(true)
    staleAll.resolve(['stale-before-install'])
    await staleApply
    expect(applied).toEqual([])

    const installReadyToken = coordinator.start('ready')
    const targetReadyToken = coordinator.start('ready')
    expect(coordinator.isCurrent(installReadyToken)).toBe(false)
    expect(coordinator.isCurrent(targetReadyToken)).toBe(true)
    expect(coordinator.isCurrent(postInstallToken)).toBe(true)
  })

  test('keeps ready-list loading owned by the newest token through install invalidation', async () => {
    const model = await import('./generate-node-model')
    const coordinator = model.createGenerateNodeSkillListRequestCoordinator()
    let loading = false
    const loadingEvents: boolean[] = []
    const setLoading = (value: boolean) => {
      loading = value
      loadingEvents.push(value)
    }
    const deferred = () => {
      let resolve!: () => void
      const promise = new Promise<void>(next => { resolve = next })
      return { promise, resolve }
    }

    const staleRequest = deferred()
    const staleToken = model.beginGenerateNodeSkillReadyListRequest(coordinator, setLoading)
    const staleSettlement = staleRequest.promise.finally(() => {
      model.settleGenerateNodeSkillReadyListRequest(coordinator, staleToken, setLoading)
    })
    expect(loading).toBe(true)

    coordinator.invalidate()
    const installRequest = deferred()
    const installToken = model.beginGenerateNodeSkillReadyListRequest(coordinator, setLoading)
    const installSettlement = installRequest.promise.finally(() => {
      model.settleGenerateNodeSkillReadyListRequest(coordinator, installToken, setLoading)
    })
    staleRequest.resolve()
    await staleSettlement
    expect(loading).toBe(true)

    installRequest.resolve()
    await installSettlement
    expect(loading).toBe(false)
    expect(loadingEvents).toEqual([true, true, false])

    const noTargetToken = model.beginGenerateNodeSkillReadyListRequest(coordinator, setLoading)
    model.settleGenerateNodeSkillReadyListRequest(coordinator, noTargetToken, setLoading)
    expect(loading).toBe(false)
  })

  test('preserves current target and selection when install context changed before a unique result resolves', async () => {
    const model = await import('./generate-node-model')
    const installed = [{
      packId: 'h3', name: 'video', revision: 'locked', compatibility: 'prompt_ready', mediaModes: ['text_to_video'],
    }]
    const requestSelection = { packId: 'old', name: 'portrait', revision: 'r1' }
    const currentSelection = { packId: 'user', name: 'new-choice', revision: 'r2' }
    let resolveInstall!: (value: typeof installed) => void
    const install = new Promise<typeof installed>(resolve => { resolveInstall = resolve })
    const outcomePromise = install.then(skills => model.resolveGenerateNodeSkillInstallApplication({
      skills,
      packId: 'h3',
      revision: 'locked',
      requestTargetMode: 'text_to_video',
      currentTargetMode: 'image_to_video',
      requestSelection,
      currentSelection,
    }))

    resolveInstall(installed)
    expect(await outcomePromise).toEqual({ status: 'installed_preserved', selection: currentSelection })
  })

  test('auto-selects a unique installed Skill only when target and selection context are unchanged', async () => {
    const model = await import('./generate-node-model')
    const previousSelection = { packId: 'old', name: 'portrait', revision: 'r1' }
    const skills = [{
      packId: 'h3', name: 'video', revision: 'locked', compatibility: 'prompt_ready', mediaModes: ['text_to_video'],
    }]

    expect(model.resolveGenerateNodeSkillInstallApplication({
      skills,
      packId: 'h3',
      revision: 'locked',
      requestTargetMode: 'text_to_video',
      currentTargetMode: 'text_to_video',
      requestSelection: previousSelection,
      currentSelection: previousSelection,
    })).toEqual({
      status: 'selected',
      selection: { packId: 'h3', name: 'video', revision: 'locked' },
    })

    expect(model.resolveGenerateNodeSkillInstallApplication({
      skills,
      packId: 'h3',
      revision: 'locked',
      requestTargetMode: 'text_to_video',
      currentTargetMode: 'text_to_video',
      requestSelection: previousSelection,
      currentSelection: { packId: 'user', name: 'new-choice', revision: 'r2' },
    })).toEqual({
      status: 'installed_preserved',
      selection: { packId: 'user', name: 'new-choice', revision: 'r2' },
    })
  })

  test('guards Skill list and install writes with shared request, mount, target, and selection refs', () => {
    const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')

    expect(source).toContain('createGenerateNodeSkillListRequestCoordinator()')
    expect(source).toContain('skillListRequestCoordinatorRef.current.invalidate()')
    expect(source).toContain('skillListRequestCoordinatorRef.current.isCurrent(')
    expect(source).toContain('generateNodeMountedRef.current')
    expect(source).toContain('skillPackInstallRequestRef.current')
    expect(source).toContain('effectiveSkillCompileModeRef.current')
    expect(source).toContain('skillSelectionIdentityRef.current')
    expect(source).toContain('resolveGenerateNodeSkillInstallApplication({')
    expect(source).toContain('beginGenerateNodeSkillReadyListRequest(')
    expect(source).toContain('settleGenerateNodeSkillReadyListRequest(')
  })

  test('builds a Chat direct Skill result packet without losing audit, reference order, or lineage', async () => {
    const model = await import('./generate-node-model')
    const packet = model.buildGenerateNodeChatSkillResultPacket({
      compile: {
        skill_name: 'h3-prompt-writing', skill_version: 'r1', mode: 'image_to_video', prompt: 'positive', negative_prompt: 'negative',
        parameters: {}, references_used: ['hero', 'scene'], warnings: ['trimmed'], reference_mode_hint: 'Ref2VA',
        reference_bindings: [
          { reference_index: 2, reference_id: 'scene', reference_role: 'scene', type: 'image', url: 'https://cdn/scene.png', source_asset_ids: [42, 43] },
          { reference_index: 1, reference_id: 'hero', reference_role: 'character', type: 'image', url: 'https://cdn/hero.png', source_asset_ids: [42] },
        ],
      },
      cacheKey: 'sha256:input', cached: true, packId: 'h3', packSource: 'https://github.com/MiniMax-AI/MiniMax-H3', compilerModelId: 9, rawPrompt: 'hero prompt',
    })
    expect(packet).toMatchObject({
      content: 'positive', negative_prompt: 'negative', compiled_prompt: 'positive', compiled_negative_prompt: 'negative',
      skill_pack_id: 'h3', skill_pack_source: 'https://github.com/MiniMax-AI/MiniMax-H3', skill_name: 'h3-prompt-writing', skill_revision: 'r1',
      compiled_input_hash: 'sha256:input', compiler_model_id: 9, skill_preview_cached: true, warnings: ['trimmed'], reference_mode_hint: 'Ref2VA',
      raw_prompt: 'hero prompt', source_asset_ids: [42, 43],
      reference_bindings: [{ reference_index: 1, reference_id: 'hero' }, { reference_index: 2, reference_id: 'scene' }],
      compiled_references: ['hero', 'scene'],
    })
    expect(packet.content).not.toContain('negative')
  })
})

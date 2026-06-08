import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { buildComfyEngineAssetPayload, collectComfyEngineConnectedInputs, isComfyEngineVideoPreviewContent, resolveComfyEngineParamInputValue, resolveComfyEnginePreviewMediaSrc } from './ComfyUIEngineNode'

describe('ComfyUIEngineNode migration behavior', () => {
  test('builds browser-safe preview media src values for generated local assets', () => {
    expect(resolveComfyEnginePreviewMediaSrc('/api/assets/media/assets%2Fcomfy-output%2Fout.png')).toBe('http://localhost:8787/api/assets/media/assets%2Fcomfy-output%2Fout.png')
    expect(resolveComfyEnginePreviewMediaSrc('assets/comfy-output/out.mp4')).toBe('http://localhost:8787/api/assets/media/assets%2Fcomfy-output%2Fout.mp4')
    expect(resolveComfyEnginePreviewMediaSrc('https://cdn.example/out.png')).toBe('https://cdn.example/out.png')
  })

  test('treats data URL video outputs as video previews', () => {
    expect(isComfyEngineVideoPreviewContent('data:video/mp4;base64,AAAA')).toBe(true)
    expect(isComfyEngineVideoPreviewContent('https://cdn.example/out.webm?token=1')).toBe(true)
    expect(isComfyEngineVideoPreviewContent('https://cdn.example/out.png')).toBe(false)
  })

  test('resolves image parameter values from generated URLs and nested result data', () => {
    expect(resolveComfyEngineParamInputValue({ result: { url: 'https://cdn.example/result.png' } }, 'image')).toBe('https://cdn.example/result.png')
    expect(resolveComfyEngineParamInputValue({ result: { media_url: '/api/assets/media/assets%2Fvideo-loop%2Ffinal.mp4' } }, 'image')).toBe('/api/assets/media/assets%2Fvideo-loop%2Ffinal.mp4')
    expect(resolveComfyEngineParamInputValue({ result: { output_files: [{ media_url: '/api/assets/media/assets%2Fcomfy-output%2Fframe.png' }] } }, 'image')).toBe('/api/assets/media/assets%2Fcomfy-output%2Fframe.png')
    expect(resolveComfyEngineParamInputValue({ result: { data: { file_path: 'nested/result.png' } } }, 'image')).toBe('nested/result.png')
    expect(resolveComfyEngineParamInputValue({ result: { data: { url: 'https://cdn.example/nested.png' } } }, 'image')).toBe('https://cdn.example/nested.png')
    expect(resolveComfyEngineParamInputValue({ asset: { data: { url: 'https://cdn.example/asset.png' } } }, 'image')).toBe('https://cdn.example/asset.png')
    expect(resolveComfyEngineParamInputValue({ incoming_data: { url: 'https://cdn.example/incoming.png' } }, 'image')).toBe('https://cdn.example/incoming.png')
    expect(resolveComfyEngineParamInputValue({ incoming_data: { media_url: '/api/assets/media/assets%2Fvideo-loop%2Fclip.mp4' } }, 'image')).toBe('/api/assets/media/assets%2Fvideo-loop%2Fclip.mp4')
  })

  test('resolves character core prompts for connected text parameters', () => {
    expect(resolveComfyEngineParamInputValue({
      asset: {
        type: 'character',
        data: { content: 'stale generic content', core_prompt: 'fresh character core' },
      },
    }, 'text')).toBe('fresh character core')
    expect(resolveComfyEngineParamInputValue({
      incoming_data: { content: 'stale incoming content', core_prompt: 'fresh incoming character core' },
    }, 'text')).toBe('fresh incoming character core')
  })

  test('builds project-scoped video asset payloads with ComfyUI lineage', () => {
    const payload = buildComfyEngineAssetPayload({
      result: {
        content: 'https://cdn.example/render.mp4',
        source_provider: 'Local Comfy',
        source_model: 'ComfyUI Workflow',
        source_mode: 'comfyui',
        source_workflow: { '10': { inputs: { text: '镜头推进' } } },
        source_params: { positive_prompt: '镜头推进' },
        source_aspect_ratio: '16:9',
        source_size: '1280*720',
        source_camera_params: { lens: 'Arri Signature Prime' },
        source_camera_suffix: ', cinematic film quality',
        source_asset_ids: [7, 8],
      },
      projectId: 12,
    })

    expect(payload).toMatchObject({
      name: '视频 ComfyUI 产物',
      type: 'video',
      project_id: 12,
      file_path: 'https://cdn.example/render.mp4',
      source_asset_ids: [7, 8],
      tags: ['ComfyUI_Rendered'],
      data: {
        file_path: 'https://cdn.example/render.mp4',
        url: 'https://cdn.example/render.mp4',
        content: 'https://cdn.example/render.mp4',
        source_asset_ids: [7, 8],
        source_provider: 'Local Comfy',
        source_model: 'ComfyUI Workflow',
        source_mode: 'comfyui',
        source_workflow: { '10': { inputs: { text: '镜头推进' } } },
        source_params: { positive_prompt: '镜头推进' },
        source_aspect_ratio: '16:9',
        source_size: '1280*720',
        source_camera_params: { lens: 'Arri Signature Prime' },
        source_camera_suffix: ', cinematic film quality',
      },
    })
    expect(payload.thumbnail).toBeUndefined()
  })

  test('builds result lineage from the active run context instead of stale node data', async () => {
    const module = await import('./ComfyUIEngineNode')
    const buildResult = (module as any).buildComfyEngineResultWithLineage

    expect(typeof buildResult).toBe('function')
    const result = buildResult({
      packet: { result: { content: 'https://cdn.example/render.png' } },
      selectedProviderName: 'Local Comfy',
      workflow: { '10': { inputs: { text: '本次运行提示词' } } },
      params: { positive_prompt: '本次运行提示词' },
      fallbackWorkflow: { '10': { inputs: { text: '旧提示词' } } },
      fallbackParams: { positive_prompt: '旧提示词' },
      aspectRatioValue: 'custom',
      customWidth: 1280,
      customHeight: 720,
      cameraParams: { lens: 'Cooke S4' },
      sourceAssetIds: [31, 32],
    })

    expect(result).toMatchObject({
      content: 'https://cdn.example/render.png',
      source_asset_ids: [31, 32],
      source_provider: 'Local Comfy',
      source_model: 'ComfyUI Workflow',
      source_mode: 'comfyui',
      source_workflow: { '10': { inputs: { text: '本次运行提示词' } } },
      source_params: { positive_prompt: '本次运行提示词' },
      source_aspect_ratio: 'custom',
      source_size: '1280*720',
      source_camera_params: { lens: 'Cooke S4' },
    })

    const mediaUrlResult = buildResult({
      packet: { result: { media_url: '/api/assets/media/assets%2Fcomfy-output%2Fclip.mp4' } },
      selectedProviderName: 'Local Comfy',
      workflow: {},
      params: {},
      aspectRatioValue: '16:9',
    })

    expect(mediaUrlResult).toMatchObject({
      content: '/api/assets/media/assets%2Fcomfy-output%2Fclip.mp4',
      media_url: '/api/assets/media/assets%2Fcomfy-output%2Fclip.mp4',
    })
  })

  test('collects connected parameter values and source asset ids for ComfyUI runs', () => {
    const collected = collectComfyEngineConnectedInputs({
      targetNodeId: 'comfy-1',
      activeParameters: {
        frame_a: { node_id: '10', field: 'inputs/image' },
        positive_prompt: { node_id: '11', field: 'inputs/text' },
      },
      edges: [
        { id: 'e1', source: 'image-source', target: 'comfy-1', targetHandle: 'param-frame_a' },
        { id: 'e2', source: 'text-source', target: 'comfy-1', targetHandle: 'param-positive_prompt' },
        { id: 'e3', source: 'ignored', target: 'other', targetHandle: 'param-frame_a' },
      ] as any,
      nodes: [
        { id: 'image-source', data: { asset: { id: 31, data: { file_path: 'assets/source-a.png' } } } },
        { id: 'text-source', data: { asset_id: 32, incoming_data: { content: '镜头推进，压迫感' } } },
      ] as any,
    })

    expect(collected).toEqual({
      connectedValues: {
        frame_a: 'assets/source-a.png',
        positive_prompt: '镜头推进，压迫感',
      },
      sourceAssetIds: [31, 32],
    })
  })

  test('inherits source asset id arrays from upstream generated results', () => {
    const collected = collectComfyEngineConnectedInputs({
      targetNodeId: 'comfy-2',
      activeParameters: {
        positive_prompt: { node_id: '11', field: 'inputs/text' },
      },
      edges: [
        { id: 'e1', source: 'generated-source', target: 'comfy-2', targetHandle: 'param-positive_prompt' },
      ] as any,
      nodes: [
        {
          id: 'generated-source',
          data: {
            result: {
              content: '二次生成提示词',
              source_asset_ids: [41, 42],
            },
          },
        },
      ] as any,
    })

    expect(collected).toEqual({
      connectedValues: { positive_prompt: '二次生成提示词' },
      sourceAssetIds: [41, 42],
    })
  })

  test('selects the first active ComfyUI key for the chosen provider when none is selected', async () => {
    const module = await import('./ComfyUIEngineNode')
    const selectDefaultKey = (module as any).selectDefaultComfyKey

    expect(typeof selectDefaultKey).toBe('function')
    expect(selectDefaultKey(null, 'local-comfy', [
      { id: 1, provider: 'other', is_active: true },
      { id: 2, provider: 'local-comfy', is_active: false },
      { id: 3, provider: 'local-comfy', is_active: true },
    ])).toBe(3)
    expect(selectDefaultKey(4, 'local-comfy', [
      { id: 3, provider: 'local-comfy', is_active: true },
      { id: 4, provider: 'local-comfy', is_active: true },
    ])).toBe(4)
    expect(selectDefaultKey(5, 'local-comfy', [
      { id: 5, provider: 'other', is_active: true },
      { id: 6, provider: 'local-comfy', is_active: true },
    ])).toBe(6)
  })

  test('builds ComfyUI generate payloads with optional cloud proxy fields', async () => {
    const module = await import('./ComfyUIEngineNode')
    const buildPayload = (module as any).buildComfyEngineGeneratePayload

    expect(typeof buildPayload).toBe('function')
    const payload = buildPayload({
      id: 'comfy-node-1',
      selectedKeyId: 44,
      selectedProvider: 'runninghub',
      workflow: { '10': { inputs: { text: '主角登场' } } },
      cloudBaseUrl: 'https://www.runninghub.cn/proxy',
      runninghubApiKey: 'rh-secret',
      comfyInputDir: '/mnt/comfy/input',
    })

    expect(payload).toEqual({
      api_key_id: 44,
      provider: 'runninghub',
      model: 'comfyui-workflow',
      type: 'image',
      prompt: JSON.stringify({ '10': { inputs: { text: '主角登场' } } }),
      params: { client_id: 'comfy-node-1' },
      base_url: 'https://www.runninghub.cn/proxy',
      runninghub_api_key: 'rh-secret',
      comfy_input_dir: '/mnt/comfy/input',
    })
  })

  test('refreshes React Flow internals when dynamic parameter handles change', () => {
    const source = readFileSync(join(import.meta.dir, 'ComfyUIEngineNode.tsx'), 'utf8')

    expect(source).toContain('const updateNodeInternals = useUpdateNodeInternals()')
    expect(source).toContain('updateNodeInternals(id)')
    expect(source).toContain('[id, parameters, updateNodeInternals]')
    expect(source).not.toContain('useUpdateNodeInternals(id)')
  })

  test('does not replace workflow default text with only a camera suffix when no text input is provided', async () => {
    const module = await import('./ComfyUIEngineNode')
    const applyParameters = (module as any).applyComfyEngineParametersToWorkflow

    expect(typeof applyParameters).toBe('function')

    const baseWorkflow = { '6': { inputs: { text: '原始默认提示词' } } }
    const parameters = { positive_prompt: { node_id: '6', field: 'inputs/text' } }

    const untouched = applyParameters({
      workflow: baseWorkflow,
      parameters,
      paramValues: {},
      connectedValues: {},
      cameraParams: { lens: 'Cooke S4' },
    })

    expect(untouched.workflow['6'].inputs.text).toBe('原始默认提示词')
    expect(baseWorkflow['6'].inputs.text).toBe('原始默认提示词')

    const injected = applyParameters({
      workflow: baseWorkflow,
      parameters,
      paramValues: { positive_prompt: '用户提示词' },
      connectedValues: {},
      cameraParams: { lens: 'Cooke S4' },
    })

    expect(injected.workflow['6'].inputs.text).toContain('用户提示词')
    expect(injected.workflow['6'].inputs.text).not.toBe('用户提示词')
    expect(injected.workflow['6'].inputs.text).toMatch(/^用户提示词, /)
  })
})

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildEditedLoadAssetDataPatch,
  buildLoadAssetNodeDataPatch,
  buildLoadAssetRunPropagation,
  buildModifiedAssetPayload,
  resolveEditableAssetContent,
  resolveAssetOutputType,
  resolveAssetPreviewValue,
} from './LoadAssetNode'

describe('LoadAssetNode migration behavior', () => {
  test('maps dropped assets to node data and typed output ports', () => {
    const promptAsset = {
      id: 8,
      name: '角色口吻',
      type: 'prompt',
      data: { content: '嘴硬但靠谱' },
    }

    expect(resolveAssetOutputType(promptAsset as any)).toBe('text')
    expect(buildLoadAssetNodeDataPatch(promptAsset as any)).toEqual({
      asset: promptAsset,
      outputs: { output: { type: 'text', label: '角色口吻' } },
      label: '角色口吻',
    })
  })

  test('treats character assets as text context for downstream generation nodes', () => {
    const characterAsset = {
      id: 18,
      name: '沈墨角色卡',
      type: 'character',
      data: { core_prompt: '沉默寡言，行动前会先观察三秒' },
    }

    expect(resolveAssetOutputType(characterAsset as any)).toBe('text')
    expect(buildLoadAssetNodeDataPatch(characterAsset as any)).toEqual({
      asset: characterAsset,
      outputs: { output: { type: 'text', label: '沈墨角色卡' } },
      label: '沈墨角色卡',
    })
  })

  test('resolves preview values from content, file path and thumbnail', () => {
    expect(resolveAssetPreviewValue({ type: 'prompt', data: { content: '文案' } } as any)).toBe('文案')
    expect(resolveAssetPreviewValue({ type: 'character', data: { core_prompt: '角色核心设定' } } as any)).toBe('角色核心设定')
    expect(resolveAssetPreviewValue({ type: 'image', data: { file_path: 'uploads/a.png' } } as any, 'http://127.0.0.1:18787/api')).toBe('http://127.0.0.1:18787/api/assets/media/uploads%2Fa.png')
    expect(resolveAssetPreviewValue({ type: 'image', thumbnail: 'https://cdn.example/cover.jpg', data: { file_path: 'uploads/a.png' } } as any)).toBe('https://cdn.example/cover.jpg')
    expect(resolveAssetPreviewValue({ type: 'video', thumbnail: 'https://cdn.example/cover.jpg', data: { file_path: 'uploads/a.mp4' } } as any, 'http://127.0.0.1:18787/api')).toBe('http://127.0.0.1:18787/api/assets/media/uploads%2Fa.mp4')
  })

  test('uses character core_prompt as editable text when content is absent', () => {
    expect(resolveEditableAssetContent({
      type: 'character',
      data: { core_prompt: '角色核心设定' },
    } as any)).toBe('角色核心设定')
  })

  test('updates character edits into core_prompt for downstream generation context', () => {
    expect(buildEditedLoadAssetDataPatch({
      id: 18,
      name: '沈墨角色卡',
      type: 'character',
      data: { content: '旧通用内容', core_prompt: '旧角色核心设定' },
    } as any, '新角色核心设定')).toEqual({
      asset: {
        id: 18,
        name: '沈墨角色卡',
        type: 'character',
        data: { core_prompt: '新角色核心设定' },
      },
    })
  })

  test('builds DAG propagation patches from the loaded asset data', () => {
    const plan = buildLoadAssetRunPropagation({
      sourceId: 'asset-1',
      data: { asset: { id: 1, type: 'image', data: { file_path: 'uploads/a.png' } } },
      edges: [
        { id: 'e1', source: 'asset-1', target: 'preview' },
        { id: 'e2', source: 'other', target: 'preview' },
      ] as any,
    })

    expect(plan).toEqual({
      status: 'success',
      targetPatches: { preview: { incoming_data: { file_path: 'uploads/a.png' } } },
    })
  })

  test('marks a DAG run as error when no asset is loaded', () => {
    expect(buildLoadAssetRunPropagation({
      sourceId: 'asset-1',
      data: {},
      edges: [{ id: 'e1', source: 'asset-1', target: 'preview' }] as any,
    })).toEqual({ status: 'error', targetPatches: {} })
  })

  test('builds a new asset payload for edited text content', () => {
    expect(buildModifiedAssetPayload({
      asset: { name: '旧提示词', type: 'prompt', data: { content: '旧' } } as any,
      content: '新内容',
      projectId: 12,
    })).toEqual({
      name: '旧提示词 (修改版)',
      type: 'prompt',
      data: { content: '新内容' },
      tags: ['Modified_Asset'],
      project_id: 12,
    })
  })

  test('builds a modified character asset payload using core_prompt instead of media file_path', () => {
    expect(buildModifiedAssetPayload({
      asset: { name: '旧角色卡', type: 'character', data: { core_prompt: '旧设定' } } as any,
      content: '新角色核心设定',
      projectId: 12,
    })).toEqual({
      name: '旧角色卡 (修改版)',
      type: 'character',
      data: { core_prompt: '新角色核心设定' },
      tags: ['Modified_Asset'],
      project_id: 12,
    })
  })
})

describe('load asset undo integration', () => {
  test('asset drop saves history for undo', () => {
    const code = readFileSync(join(import.meta.dir, 'LoadAssetNode.tsx'), 'utf8')
    expect(code).toContain('saveHistory()')
  })
})

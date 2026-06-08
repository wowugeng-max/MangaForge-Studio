import { describe, expect, test } from 'bun:test'
import {
  buildDisplayAssetPayload,
  buildDisplayPropagationPlan,
  resolveDisplayContent,
} from './DisplayNode'

describe('DisplayNode migration behavior', () => {
  test('resolves text, image and video display content from upstream data', () => {
    expect(resolveDisplayContent({ incoming_data: '纯文本' })).toEqual({
      rawData: '纯文本',
      displayContent: '纯文本',
      mediaSrc: '纯文本',
      mediaType: 'text',
    })

    expect(resolveDisplayContent({ incoming_data: { file_path: 'uploads/a.png', type: 'image' } }, 'http://127.0.0.1:18787/api')).toMatchObject({
      displayContent: 'uploads/a.png',
      mediaSrc: 'http://127.0.0.1:18787/api/assets/media/uploads%2Fa.png',
      mediaType: 'image',
    })

    expect(resolveDisplayContent({ result: { content: 'https://cdn.example/clip.mp4' } })).toMatchObject({
      displayContent: 'https://cdn.example/clip.mp4',
      mediaSrc: 'https://cdn.example/clip.mp4',
      mediaType: 'video',
    })
  })

  test('resolves media URLs from video loop and Comfy-style result envelopes', () => {
    expect(resolveDisplayContent({
      incoming_data: {
        media_url: '/api/assets/media/assets%2Fvideo-loop%2Ffinal.mp4',
        final_video: 'assets/video-loop/final.mp4',
      },
    })).toMatchObject({
      displayContent: '/api/assets/media/assets%2Fvideo-loop%2Ffinal.mp4',
      mediaSrc: 'http://localhost:8787/api/assets/media/assets%2Fvideo-loop%2Ffinal.mp4',
      mediaType: 'video',
    })

    expect(resolveDisplayContent({
      result: {
        output_files: [
          { media_url: '/api/assets/media/assets%2Fcomfy-output%2Fframe.png' },
        ],
      },
    })).toMatchObject({
      displayContent: '/api/assets/media/assets%2Fcomfy-output%2Fframe.png',
      mediaType: 'image',
    })
  })

  test('builds DAG propagation patches when display has data', () => {
    const plan = buildDisplayPropagationPlan({
      sourceId: 'display-1',
      data: { incoming_data: { file_path: 'uploads/a.png', source_model: 'wan' } },
      edges: [
        { id: 'e1', source: 'display-1', target: 'next' },
        { id: 'e2', source: 'other', target: 'ignored' },
      ] as any,
    })

    expect(plan).toEqual({
      status: 'success',
      targetPatches: { next: { incoming_data: { file_path: 'uploads/a.png', source_model: 'wan' } } },
    })
  })

  test('keeps a running display node untouched when it receives a run signal without data', () => {
    expect(buildDisplayPropagationPlan({
      sourceId: 'display-1',
      data: {},
      edges: [{ id: 'e1', source: 'display-1', target: 'next' }] as any,
    })).toEqual({ status: null, targetPatches: {} })
  })

  test('builds saved asset payload with lineage and media dimensions', () => {
    const payload = buildDisplayAssetPayload({
      assetName: '成片首帧',
      projectId: 9,
      mediaDims: '1280 × 720',
      data: {
        incoming_data: {
          file_path: 'assets/comfy-output/frame.png',
          type: 'image',
          source_model: 'wan-image',
          source_prompt: '镜头推进',
          source_asset_ids: [3, 4],
          ignored: 'not lineage',
        },
      },
    })

    expect(payload).toEqual({
      name: '成片首帧',
      type: 'image',
      file_path: 'assets/comfy-output/frame.png',
      source_asset_ids: [3, 4],
      data: {
        content: 'assets/comfy-output/frame.png',
        url: 'assets/comfy-output/frame.png',
        file_path: 'assets/comfy-output/frame.png',
        source_model: 'wan-image',
        source_prompt: '镜头推进',
        source_asset_ids: [3, 4],
        width: 1280,
        height: 720,
      },
      tags: ['Display_Saved'],
      thumbnail: 'assets/comfy-output/frame.png',
      project_id: 9,
    })
  })

  test('builds saved asset payload with lineage from result data when incoming data is absent', () => {
    const payload = buildDisplayAssetPayload({
      assetName: '二次生成图',
      projectId: 9,
      data: {
        result: {
          content: 'assets/generated/second.png',
          type: 'image',
          source_model: 'gpt-image',
          source_prompt: '二次生成',
          source_asset_ids: [11, 12],
        },
      },
    })

    expect(payload).toMatchObject({
      name: '二次生成图',
      type: 'image',
      file_path: 'assets/generated/second.png',
      source_asset_ids: [11, 12],
      data: {
        content: 'assets/generated/second.png',
        file_path: 'assets/generated/second.png',
        source_model: 'gpt-image',
        source_prompt: '二次生成',
        source_asset_ids: [11, 12],
      },
    })
  })

  test('normalizes camelCase source asset ids when saving display results', () => {
    const payload = buildDisplayAssetPayload({
      assetName: '外部客户端图',
      projectId: 9,
      data: {
        incoming_data: {
          file_path: 'assets/generated/camel.png',
          type: 'image',
          sourceAssetIds: [21, 22],
        },
      },
    })

    expect(payload).toMatchObject({
      source_asset_ids: [21, 22],
      data: {
        source_asset_ids: [21, 22],
      },
    })
  })
})

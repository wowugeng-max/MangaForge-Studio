import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { basename, join } from 'path'
import { tmpdir } from 'os'
import { readAssets } from './assets'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-video-loop-'))
  workspaces.push(workspace)
  return workspace
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('video loop executor', () => {
  test('injects segment assets into a workflow and executes each segment with LocalComfy', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'assets.json'), JSON.stringify([
      {
        id: 1,
        name: 'Wan workflow',
        type: 'workflow',
        data: {
          workflow_json: {
            '10': { inputs: { image: '' } },
            '11': { inputs: { image: '' } },
            '12': { inputs: { text: '' } },
          },
          parameters: {
            frame_a: { node_id: '10', field: 'inputs/image' },
            frame_b: { node_id: '11', field: 'inputs/image' },
            prompt: { node_id: '12', field: 'inputs/text' },
          },
        },
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      { id: 2, name: 'first frame', type: 'image', data: { file_path: 'uploads/a.png' }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 3, name: 'last frame', type: 'image', data: { file_path: 'uploads/b.png' }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 4, name: 'motion prompt', type: 'prompt', data: { content: '镜头缓慢推进' }, updated_at: '2026-01-01T00:00:00.000Z' },
    ]))

    const { executeRealVideoLoop } = await import('./video-loop')
    const calls: any[] = []
    const result = await executeRealVideoLoop({
      workspace,
      request: {
        workflow_asset_id: 1,
        project_id: 9,
        source_asset_ids: [2, 3, 4],
        segments: [{ frame_a_asset_id: 2, frame_b_asset_id: 3, prompt_asset_id: 4 }],
      },
      comfyExecute: async options => {
        calls.push(options)
        return {
          prompt_id: 'segment-1',
          output_files: [{
            node_id: '99',
            kind: 'video',
            filename: 'clip.mp4',
            subfolder: '',
            type: 'output',
            path: join(workspace, 'assets', 'comfy-output', 'clip.mp4'),
            media_url: '/api/assets/media/clip.mp4',
            mime_type: 'video/mp4',
          }],
          history: {},
        }
      },
    })

    expect(calls).toHaveLength(1)
    expect(calls[0].workflow).toEqual({
      '10': { inputs: { image: 'uploads/a.png' } },
      '11': { inputs: { image: 'uploads/b.png' } },
      '12': { inputs: { text: '镜头缓慢推进' } },
    })
    expect(result).toMatchObject({
      status: 'completed',
      final_video: join(workspace, 'assets', 'comfy-output', 'clip.mp4'),
      media_url: '/api/assets/media/clip.mp4',
      num_segments: 1,
      segments: [join(workspace, 'assets', 'comfy-output', 'clip.mp4')],
    })
    expect(result.asset_id).toBeGreaterThan(4)
    const storedAssets = await readAssets(workspace)
    const savedVideo = storedAssets.find(asset => asset.id === result.asset_id)
    expect(savedVideo).toMatchObject({
      type: 'video',
      project_id: 9,
      source_asset_ids: [2, 3, 4],
      file_path: join(workspace, 'assets', 'comfy-output', 'clip.mp4'),
    })
  })

  test('accepts camelCase segment asset fields from TS clients', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'assets.json'), JSON.stringify([
      {
        id: 1,
        name: 'Wan workflow',
        type: 'workflow',
        data: {
          workflow_json: {
            '10': { inputs: { image: '' } },
            '11': { inputs: { image: '' } },
            '12': { inputs: { text: '' } },
          },
          parameters: {
            frame_a: { node_id: '10', field: 'inputs/image' },
            frame_b: { node_id: '11', field: 'inputs/image' },
            prompt: { node_id: '12', field: 'inputs/text' },
          },
        },
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      { id: 2, name: 'first frame', type: 'image', data: { file_path: 'uploads/a.png' }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 3, name: 'last frame', type: 'image', data: { file_path: 'uploads/b.png' }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 4, name: 'motion prompt', type: 'prompt', data: { content: '镜头缓慢推进' }, updated_at: '2026-01-01T00:00:00.000Z' },
    ]))

    const { executeRealVideoLoop } = await import('./video-loop')
    const calls: any[] = []
    const result = await executeRealVideoLoop({
      workspace,
      request: {
        workflow_asset_id: 1,
        segments: [{ frameAAssetId: 2, frameBAssetId: 3, promptAssetId: 4 } as any],
      },
      comfyExecute: async options => {
        calls.push(options)
        return {
          prompt_id: 'segment-1',
          output_files: [{
            node_id: '99',
            kind: 'video',
            filename: 'clip.mp4',
            subfolder: '',
            type: 'output',
            path: join(workspace, 'assets', 'comfy-output', 'clip.mp4'),
            media_url: '/api/assets/media/clip.mp4',
            mime_type: 'video/mp4',
          }],
          history: {},
        }
      },
    })

    expect(calls).toHaveLength(1)
    expect(calls[0].workflow).toMatchObject({
      '10': { inputs: { image: 'uploads/a.png' } },
      '11': { inputs: { image: 'uploads/b.png' } },
      '12': { inputs: { text: '镜头缓慢推进' } },
    })
    expect(result.status).toBe('completed')
  })

  test('skips missing workflow parameter targets like the upstream video loop executor', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'assets.json'), JSON.stringify([
      {
        id: 1,
        name: 'Legacy workflow',
        type: 'workflow',
        data: {
          workflow_json: {
            '10': { inputs: { image: '' } },
            '11': { inputs: { image: '' } },
          },
          parameters: {
            frame_a: { node_id: '10', field: 'inputs/image' },
            frame_b: { node_id: '11', field: 'inputs/image' },
            prompt: { node_id: '12', field: 'inputs/text' },
          },
        },
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      { id: 2, name: 'first frame', type: 'image', data: { file_path: 'uploads/a.png' }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 3, name: 'last frame', type: 'image', data: { file_path: 'uploads/b.png' }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 4, name: 'motion prompt', type: 'prompt', data: { content: '镜头缓慢推进' }, updated_at: '2026-01-01T00:00:00.000Z' },
    ]))

    const { executeRealVideoLoop } = await import('./video-loop')
    const calls: any[] = []
    const result = await executeRealVideoLoop({
      workspace,
      request: {
        workflow_asset_id: 1,
        segments: [{ frame_a_asset_id: 2, frame_b_asset_id: 3, prompt_asset_id: 4 }],
      },
      comfyExecute: async options => {
        calls.push(options)
        return {
          prompt_id: 'legacy-segment',
          output_files: [{
            node_id: '99',
            kind: 'video',
            filename: 'legacy.mp4',
            subfolder: '',
            type: 'output',
            path: join(workspace, 'assets', 'comfy-output', 'legacy.mp4'),
            media_url: '/api/assets/media/legacy.mp4',
            mime_type: 'video/mp4',
          }],
          history: {},
        }
      },
    })

    expect(calls).toHaveLength(1)
    expect(calls[0].workflow).toEqual({
      '10': { inputs: { image: 'uploads/a.png' } },
      '11': { inputs: { image: 'uploads/b.png' } },
    })
    expect(result.status).toBe('completed')
  })

  test('rejects workflow assets missing required video loop parameter mappings', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'assets.json'), JSON.stringify([
      {
        id: 1,
        name: 'Bad workflow',
        type: 'workflow',
        data: {
          workflow_json: { '10': { inputs: { image: '' } } },
          parameters: { frame_a: { node_id: '10', field: 'inputs/image' } },
        },
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      { id: 2, name: 'first frame', type: 'image', data: { file_path: 'uploads/a.png' }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 3, name: 'last frame', type: 'image', data: { file_path: 'uploads/b.png' }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 4, name: 'motion prompt', type: 'prompt', data: { content: '镜头缓慢推进' }, updated_at: '2026-01-01T00:00:00.000Z' },
    ]))

    const { executeRealVideoLoop } = await import('./video-loop')
    await expect(executeRealVideoLoop({
      workspace,
      request: {
        workflow_asset_id: 1,
        segments: [{ frame_a_asset_id: 2, frame_b_asset_id: 3, prompt_asset_id: 4 }],
      },
      comfyExecute: async () => {
        throw new Error('should not execute')
      },
    })).rejects.toThrow("工作流模板必须定义参数 'frame_b'")
  })

  test('copies frame assets into the configured ComfyUI input directory before workflow execution', async () => {
    const workspace = await tempWorkspace()
    const inputDir = join(workspace, 'comfy-input')
    const frameAPath = join(workspace, 'a.png')
    const frameBPath = join(workspace, 'b.png')
    await writeFile(frameAPath, 'frame-a')
    await writeFile(frameBPath, 'frame-b')
    await writeFile(join(workspace, 'assets.json'), JSON.stringify([
      {
        id: 1,
        name: 'Wan workflow',
        type: 'workflow',
        data: {
          workflow_json: {
            '10': { inputs: { image: '' } },
            '11': { inputs: { image: '' } },
            '12': { inputs: { text: '' } },
          },
          parameters: {
            frame_a: { node_id: '10', field: 'inputs/image' },
            frame_b: { node_id: '11', field: 'inputs/image' },
            prompt: { node_id: '12', field: 'inputs/text' },
          },
        },
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      { id: 2, name: 'first frame', type: 'image', data: { file_path: frameAPath }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 3, name: 'last frame', type: 'image', data: { file_path: frameBPath }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 4, name: 'motion prompt', type: 'prompt', data: { content: '镜头缓慢推进' }, updated_at: '2026-01-01T00:00:00.000Z' },
    ]))

    const { executeRealVideoLoop } = await import('./video-loop')
    const calls: any[] = []
    await executeRealVideoLoop({
      workspace,
      request: {
        workflow_asset_id: 1,
        comfy_input_dir: inputDir,
        segments: [{ frame_a_asset_id: 2, frame_b_asset_id: 3, prompt_asset_id: 4 }],
      } as any,
      comfyExecute: async options => {
        calls.push(options)
        return {
          prompt_id: 'segment-copy',
          output_files: [{
            node_id: '99',
            kind: 'video',
            filename: 'clip.mp4',
            subfolder: '',
            type: 'output',
            path: join(workspace, 'assets', 'comfy-output', 'clip.mp4'),
            media_url: '/api/assets/media/clip.mp4',
            mime_type: 'video/mp4',
          }],
          history: {},
        }
      },
    })

    const injectedA = calls[0].workflow['10'].inputs.image
    const injectedB = calls[0].workflow['11'].inputs.image
    expect(injectedA).not.toContain(workspace)
    expect(injectedB).not.toContain(workspace)
    expect(injectedA.endsWith(`_${basename(frameAPath)}`)).toBe(true)
    expect(injectedB.endsWith(`_${basename(frameBPath)}`)).toBe(true)
    expect(await readFile(join(inputDir, injectedA), 'utf8')).toBe('frame-a')
    expect(await readFile(join(inputDir, injectedB), 'utf8')).toBe('frame-b')
  })

  test('cloud video loop uploads frame assets to the ComfyUI gateway before queueing the workflow', async () => {
    const workspace = await tempWorkspace()
    const frameAPath = join(workspace, 'cloud-a.png')
    const frameBPath = join(workspace, 'cloud-b.png')
    await writeFile(frameAPath, 'cloud-frame-a')
    await writeFile(frameBPath, 'cloud-frame-b')
    await writeFile(join(workspace, 'assets.json'), JSON.stringify([
      {
        id: 1,
        name: 'Cloud Wan workflow',
        type: 'workflow',
        data: {
          workflow_json: {
            '10': { inputs: { image: '' } },
            '11': { inputs: { image: '' } },
            '12': { inputs: { text: '' } },
          },
          parameters: {
            frame_a: { node_id: '10', field: 'inputs/image' },
            frame_b: { node_id: '11', field: 'inputs/image' },
            prompt: { node_id: '12', field: 'inputs/text' },
          },
        },
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      { id: 2, name: 'first frame', type: 'image', data: { file_path: frameAPath }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 3, name: 'last frame', type: 'image', data: { file_path: frameBPath }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 4, name: 'motion prompt', type: 'prompt', data: { content: '镜头缓慢推进' }, updated_at: '2026-01-01T00:00:00.000Z' },
    ]))

    const { executeCloudVideoLoop } = await import('./video-loop')
    const uploadedNames = ['uploaded-a.png', 'uploaded-b.png']
    const requests: Array<{ url: string; init?: RequestInit }> = []
    const fetcher = async (url: string, init?: RequestInit) => {
      requests.push({ url, init })
      if (url.endsWith('/upload/image')) {
        return new Response(JSON.stringify({ name: uploadedNames.shift() }), { status: 200 })
      }
      if (url.endsWith('/prompt')) {
        const body = JSON.parse(String(init?.body || '{}'))
        expect(body.prompt['10'].inputs.image).toBe('uploaded-a.png')
        expect(body.prompt['11'].inputs.image).toBe('uploaded-b.png')
        expect(body.prompt['12'].inputs.text).toBe('镜头缓慢推进')
        return new Response(JSON.stringify({ prompt_id: 'cloud-segment-1' }), { status: 200 })
      }
      if (url.endsWith('/history/cloud-segment-1')) {
        return new Response(JSON.stringify({
          'cloud-segment-1': {
            outputs: {
              '99': { videos: [{ filename: 'cloud-clip.mp4', subfolder: '', type: 'output' }] },
            },
          },
        }), { status: 200 })
      }
      if (url.includes('/view?')) {
        return new Response('cloud-video-bytes', { status: 200 })
      }
      throw new Error(`unexpected request: ${url}`)
    }

    const result = await executeCloudVideoLoop({
      workspace,
      request: {
        workflow_asset_id: 1,
        base_url: 'https://runninghub.example/proxy',
        api_key: 'rh-key',
        poll_interval_ms: 0,
        segments: [{ frame_a_asset_id: 2, frame_b_asset_id: 3, prompt_asset_id: 4 }],
      } as any,
      fetcher: fetcher as any,
    } as any)

    expect(requests.filter(request => request.url.endsWith('/upload/image'))).toHaveLength(2)
    expect(requests[0].url).toBe('https://runninghub.example/proxy/rh-key/upload/image')
    expect(requests.some(request => request.url.endsWith('/prompt'))).toBe(true)
    expect(result).toMatchObject({
      status: 'completed',
      media_url: `/api/assets/media/${encodeURIComponent(result.final_video)}`,
      num_segments: 1,
      segments: [result.final_video],
    })
    expect(await readFile(result.final_video, 'utf8')).toBe('cloud-video-bytes')
  })

  test('cloud video loop can run a RunningHub template task without a workflow asset', async () => {
    const workspace = await tempWorkspace()
    const frameAPath = join(workspace, 'rh-a.png')
    const frameBPath = join(workspace, 'rh-b.png')
    await writeFile(frameAPath, 'rh-frame-a')
    await writeFile(frameBPath, 'rh-frame-b')
    await writeFile(join(workspace, 'assets.json'), JSON.stringify([
      { id: 2, name: 'first frame', type: 'image', data: { file_path: frameAPath }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 3, name: 'last frame', type: 'image', data: { file_path: frameBPath }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 4, name: 'motion prompt', type: 'prompt', data: { content: '镜头快速拉远' }, updated_at: '2026-01-01T00:00:00.000Z' },
    ]))

    const { executeCloudVideoLoop } = await import('./video-loop')
    const requests: Array<{ url: string; init?: RequestInit }> = []
    const fetcher = async (url: string, init?: RequestInit) => {
      requests.push({ url, init })
      if (url.endsWith('/upload/image')) {
        return new Response(JSON.stringify({ name: requests.length === 1 ? 'rh-upload-a.png' : 'rh-upload-b.png' }), { status: 200 })
      }
      if (url.endsWith('/task/openapi/create')) {
        const body = JSON.parse(String(init?.body || '{}'))
        expect(body.workflow_template_id).toBe('rh-template-9')
        expect(body.inputs).toEqual({
          frame_a: 'rh-upload-a.png',
          frame_b: 'rh-upload-b.png',
          prompt: '镜头快速拉远',
        })
        return new Response(JSON.stringify({ data: { taskId: 'rh-task-1' } }), { status: 200 })
      }
      if (url.endsWith('/task/openapi/status')) {
        const body = JSON.parse(String(init?.body || '{}'))
        expect(body.taskId).toBe('rh-task-1')
        return new Response(JSON.stringify({ data: { status: 'SUCCESS', outputs: [{ url: 'https://cdn.example/rh-segment.mp4' }] } }), { status: 200 })
      }
      if (url === 'https://cdn.example/rh-segment.mp4') {
        return new Response('runninghub-video-bytes', { status: 200 })
      }
      throw new Error(`unexpected request: ${url}`)
    }

    const result = await executeCloudVideoLoop({
      workspace,
      request: {
        workflow_template_id: 'rh-template-9',
        base_url: 'https://runninghub.example/proxy',
        api_key: 'rh-key',
        poll_interval_ms: 0,
        segments: [{ frame_a_asset_id: 2, frame_b_asset_id: 3, prompt_asset_id: 4 }],
      } as any,
      fetcher: fetcher as any,
    } as any)

    expect(requests.some(request => request.url.endsWith('/prompt'))).toBe(false)
    expect(requests.some(request => request.url.endsWith('/task/openapi/create'))).toBe(true)
    expect(requests.some(request => request.url.endsWith('/task/openapi/status'))).toBe(true)
    expect(result).toMatchObject({
      status: 'completed',
      media_url: `/api/assets/media/${encodeURIComponent(result.final_video)}`,
      num_segments: 1,
      segments: [result.final_video],
    })
    expect(await readFile(result.final_video, 'utf8')).toBe('runninghub-video-bytes')
  })

  test('cloud video loop accepts RunningHub camelCase upload filenames for template inputs', async () => {
    const workspace = await tempWorkspace()
    const frameAPath = join(workspace, 'rh-camel-a.png')
    const frameBPath = join(workspace, 'rh-camel-b.png')
    await writeFile(frameAPath, 'rh-camel-frame-a')
    await writeFile(frameBPath, 'rh-camel-frame-b')
    await writeFile(join(workspace, 'assets.json'), JSON.stringify([
      { id: 2, name: 'first frame', type: 'image', data: { file_path: frameAPath }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 3, name: 'last frame', type: 'image', data: { file_path: frameBPath }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 4, name: 'motion prompt', type: 'prompt', data: { content: '镜头平移后定格' }, updated_at: '2026-01-01T00:00:00.000Z' },
    ]))

    const { executeCloudVideoLoop } = await import('./video-loop')
    let uploadCount = 0
    const fetcher = async (url: string, init?: RequestInit) => {
      if (url.endsWith('/upload/image')) {
        uploadCount += 1
        return new Response(JSON.stringify({
          data: {
            fileName: uploadCount === 1 ? 'camel-upload-a.png' : 'camel-upload-b.png',
          },
        }), { status: 200 })
      }
      if (url.endsWith('/task/openapi/create')) {
        const body = JSON.parse(String(init?.body || '{}'))
        expect(body.inputs).toEqual({
          frame_a: 'camel-upload-a.png',
          frame_b: 'camel-upload-b.png',
          prompt: '镜头平移后定格',
        })
        return new Response(JSON.stringify({ data: { taskId: 'rh-camel-task' } }), { status: 200 })
      }
      if (url.endsWith('/task/openapi/status')) {
        return new Response(JSON.stringify({
          data: {
            taskStatus: 'SUCCESS',
            outputUrl: 'https://cdn.example/rh-camel-segment.mp4',
          },
        }), { status: 200 })
      }
      if (url === 'https://cdn.example/rh-camel-segment.mp4') {
        return new Response('runninghub-camel-video-bytes', { status: 200 })
      }
      throw new Error(`unexpected request: ${url}`)
    }

    const result = await executeCloudVideoLoop({
      workspace,
      request: {
        runninghub_template_id: 'rh-template-camel',
        base_url: 'https://runninghub.example/proxy',
        api_key: 'rh-key',
        poll_interval_ms: 0,
        segments: [{ frame_a_asset_id: 2, frame_b_asset_id: 3, prompt_asset_id: 4 }],
      } as any,
      fetcher: fetcher as any,
    } as any)

    expect(uploadCount).toBe(2)
    expect(await readFile(result.final_video, 'utf8')).toBe('runninghub-camel-video-bytes')
  })

  test('cloud video loop accepts camelCase top-level template request fields', async () => {
    const workspace = await tempWorkspace()
    const frameAPath = join(workspace, 'rh-client-a.png')
    const frameBPath = join(workspace, 'rh-client-b.png')
    await writeFile(frameAPath, 'rh-client-frame-a')
    await writeFile(frameBPath, 'rh-client-frame-b')
    await writeFile(join(workspace, 'assets.json'), JSON.stringify([
      { id: 2, name: 'first frame', type: 'image', data: { file_path: frameAPath }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 3, name: 'last frame', type: 'image', data: { file_path: frameBPath }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 4, name: 'motion prompt', type: 'prompt', data: { content: '镜头低角度推近' }, updated_at: '2026-01-01T00:00:00.000Z' },
    ]))

    const { executeCloudVideoLoop } = await import('./video-loop')
    const requests: Array<{ url: string; init?: RequestInit }> = []
    const fetcher = async (url: string, init?: RequestInit) => {
      requests.push({ url, init })
      if (url.endsWith('/upload/image')) {
        return new Response(JSON.stringify({ data: { fileName: requests.length === 1 ? 'client-upload-a.png' : 'client-upload-b.png' } }), { status: 200 })
      }
      if (url.endsWith('/template/create')) {
        const body = JSON.parse(String(init?.body || '{}'))
        expect(body.workflow_template_id).toBe('rh-client-template')
        expect(body.inputs).toEqual({
          firstFrame: 'client-upload-a.png',
          lastFrame: 'client-upload-b.png',
          caption: '镜头低角度推近',
        })
        return new Response(JSON.stringify({ data: { taskId: 'rh-client-task' } }), { status: 200 })
      }
      if (url.endsWith('/template/status')) {
        const body = JSON.parse(String(init?.body || '{}'))
        expect(body.taskId).toBe('rh-client-task')
        return new Response(JSON.stringify({ data: { taskStatus: 'SUCCESS', outputUrl: 'https://cdn.example/rh-client-segment.mp4' } }), { status: 200 })
      }
      if (url === 'https://cdn.example/rh-client-segment.mp4') {
        return new Response('runninghub-client-video-bytes', { status: 200 })
      }
      throw new Error(`unexpected request: ${url}`)
    }

    const result = await executeCloudVideoLoop({
      workspace,
      request: {
        runninghubTemplateId: 'rh-client-template',
        baseUrl: 'https://runninghub.example/proxy',
        apiKey: 'rh-key',
        templateSubmitPath: '/template/create',
        templateStatusPath: '/template/status',
        templateInputKeys: { frameA: 'firstFrame', frameB: 'lastFrame', prompt: 'caption' },
        pollIntervalMs: 0,
        segments: [{ frameAAssetId: 2, frameBAssetId: 3, promptAssetId: 4 }],
      } as any,
      fetcher: fetcher as any,
    } as any)

    expect(requests[0].url).toBe('https://runninghub.example/proxy/rh-key/upload/image')
    expect(await readFile(result.final_video, 'utf8')).toBe('runninghub-client-video-bytes')
  })

  test('cloud video loop accepts deeply nested RunningHub template envelopes', async () => {
    const workspace = await tempWorkspace()
    const frameAPath = join(workspace, 'rh-deep-a.png')
    const frameBPath = join(workspace, 'rh-deep-b.png')
    await writeFile(frameAPath, 'rh-deep-frame-a')
    await writeFile(frameBPath, 'rh-deep-frame-b')
    await writeFile(join(workspace, 'assets.json'), JSON.stringify([
      { id: 2, name: 'first frame', type: 'image', data: { file_path: frameAPath }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 3, name: 'last frame', type: 'image', data: { file_path: frameBPath }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 4, name: 'motion prompt', type: 'prompt', data: { content: '镜头贴地推进' }, updated_at: '2026-01-01T00:00:00.000Z' },
    ]))

    const { executeCloudVideoLoop } = await import('./video-loop')
    let uploadCount = 0
    const fetcher = async (url: string, init?: RequestInit) => {
      if (url.endsWith('/upload/image')) {
        uploadCount += 1
        return new Response(JSON.stringify({
          data: { result: { fileName: uploadCount === 1 ? 'deep-upload-a.png' : 'deep-upload-b.png' } },
        }), { status: 200 })
      }
      if (url.endsWith('/task/openapi/create')) {
        const body = JSON.parse(String(init?.body || '{}'))
        expect(body.inputs).toEqual({
          frame_a: 'deep-upload-a.png',
          frame_b: 'deep-upload-b.png',
          prompt: '镜头贴地推进',
        })
        return new Response(JSON.stringify({ data: { result: { taskId: 'rh-deep-task' } } }), { status: 200 })
      }
      if (url.endsWith('/task/openapi/status')) {
        const body = JSON.parse(String(init?.body || '{}'))
        expect(body.taskId).toBe('rh-deep-task')
        return new Response(JSON.stringify({
          data: {
            result: {
              taskStatus: 'SUCCESS',
              output: { url: 'https://cdn.example/rh-deep-segment.mp4' },
            },
          },
        }), { status: 200 })
      }
      if (url === 'https://cdn.example/rh-deep-segment.mp4') {
        return new Response('runninghub-deep-video-bytes', { status: 200 })
      }
      throw new Error(`unexpected request: ${url}`)
    }

    const result = await executeCloudVideoLoop({
      workspace,
      request: {
        runninghub_template_id: 'rh-template-deep',
        base_url: 'https://runninghub.example/proxy',
        api_key: 'rh-key',
        poll_interval_ms: 0,
        segments: [{ frame_a_asset_id: 2, frame_b_asset_id: 3, prompt_asset_id: 4 }],
      } as any,
      fetcher: fetcher as any,
    } as any)

    expect(uploadCount).toBe(2)
    expect(await readFile(result.final_video, 'utf8')).toBe('runninghub-deep-video-bytes')
  })

  test('cloud video loop keeps polling a completed RunningHub template task until an output URL appears', async () => {
    const workspace = await tempWorkspace()
    const frameAPath = join(workspace, 'rh-delayed-a.png')
    const frameBPath = join(workspace, 'rh-delayed-b.png')
    await writeFile(frameAPath, 'rh-delayed-frame-a')
    await writeFile(frameBPath, 'rh-delayed-frame-b')
    await writeFile(join(workspace, 'assets.json'), JSON.stringify([
      { id: 2, name: 'first frame', type: 'image', data: { file_path: frameAPath }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 3, name: 'last frame', type: 'image', data: { file_path: frameBPath }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 4, name: 'motion prompt', type: 'prompt', data: { content: '镜头先停顿再推近' }, updated_at: '2026-01-01T00:00:00.000Z' },
    ]))

    const { executeCloudVideoLoop } = await import('./video-loop')
    let uploadCount = 0
    let statusCount = 0
    const fetcher = async (url: string, init?: RequestInit) => {
      if (url.endsWith('/upload/image')) {
        uploadCount += 1
        return new Response(JSON.stringify({ data: { fileName: `delayed-upload-${uploadCount}.png` } }), { status: 200 })
      }
      if (url.endsWith('/task/openapi/create')) {
        return new Response(JSON.stringify({ data: { taskId: 'rh-delayed-task' } }), { status: 200 })
      }
      if (url.endsWith('/task/openapi/status')) {
        statusCount += 1
        const payload = statusCount === 1
          ? { data: { status: 'SUCCESS' } }
          : { data: { status: 'SUCCESS', outputs: [{ url: 'https://cdn.example/rh-delayed-segment.mp4' }] } }
        return new Response(JSON.stringify(payload), { status: 200 })
      }
      if (url === 'https://cdn.example/rh-delayed-segment.mp4') {
        return new Response('runninghub-delayed-video-bytes', { status: 200 })
      }
      throw new Error(`unexpected request: ${url}`)
    }

    const result = await executeCloudVideoLoop({
      workspace,
      request: {
        runninghub_template_id: 'rh-template-delayed',
        base_url: 'https://runninghub.example/proxy',
        api_key: 'rh-key',
        poll_interval_ms: 1,
        timeout_ms: 100,
        segments: [{ frame_a_asset_id: 2, frame_b_asset_id: 3, prompt_asset_id: 4 }],
      } as any,
      fetcher: fetcher as any,
    } as any)

    expect(statusCount).toBe(2)
    expect(await readFile(result.final_video, 'utf8')).toBe('runninghub-delayed-video-bytes')
  })

  test('cloud video loop fails fast on RunningHub template failure status variants', async () => {
    const workspace = await tempWorkspace()
    const frameAPath = join(workspace, 'rh-failure-a.png')
    const frameBPath = join(workspace, 'rh-failure-b.png')
    await writeFile(frameAPath, 'rh-failure-frame-a')
    await writeFile(frameBPath, 'rh-failure-frame-b')
    await writeFile(join(workspace, 'assets.json'), JSON.stringify([
      { id: 2, name: 'first frame', type: 'image', data: { file_path: frameAPath }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 3, name: 'last frame', type: 'image', data: { file_path: frameBPath }, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 4, name: 'motion prompt', type: 'prompt', data: { content: '镜头快速推进后断黑' }, updated_at: '2026-01-01T00:00:00.000Z' },
    ]))

    const { executeCloudVideoLoop } = await import('./video-loop')
    let uploadCount = 0
    let statusCount = 0
    const fetcher = async (url: string, init?: RequestInit) => {
      if (url.endsWith('/upload/image')) {
        uploadCount += 1
        return new Response(JSON.stringify({ data: { fileName: `failure-upload-${uploadCount}.png` } }), { status: 200 })
      }
      if (url.endsWith('/task/openapi/create')) {
        return new Response(JSON.stringify({ data: { taskId: 'rh-failure-task' } }), { status: 200 })
      }
      if (url.endsWith('/task/openapi/status')) {
        statusCount += 1
        return new Response(JSON.stringify({
          data: {
            taskStatus: 'FAILURE',
            message: 'template render failed',
          },
        }), { status: 200 })
      }
      throw new Error(`unexpected request: ${url}`)
    }

    await expect(executeCloudVideoLoop({
      workspace,
      request: {
        runninghub_template_id: 'rh-template-failure',
        base_url: 'https://runninghub.example/proxy',
        api_key: 'rh-key',
        poll_interval_ms: 1,
        timeout_ms: 20,
        segments: [{ frame_a_asset_id: 2, frame_b_asset_id: 3, prompt_asset_id: 4 }],
      } as any,
      fetcher: fetcher as any,
    } as any)).rejects.toThrow('云端模板任务失败')

    expect(statusCount).toBe(1)
  })

  test('cloud video loop accepts the upstream legacy initial-video payload without cloud-only fields', async () => {
    const workspace = await tempWorkspace()
    const initialVideo = join(workspace, 'cloud-legacy.mp4')
    await writeFile(initialVideo, 'cloud-legacy-video-bytes')

    const { executeCloudVideoLoop } = await import('./video-loop')
    const result = await executeCloudVideoLoop({
      workspace,
      request: {
        initial_video_path: initialVideo,
        total_seconds: 9,
        segment_seconds: 4,
        global_prompt: '云端旧协议运镜',
      } as any,
    } as any)

    expect(result).toMatchObject({
      status: 'completed',
      num_segments: 3,
      asset_id: null,
    })
    expect(result.segments).toHaveLength(3)
    expect(result.media_url).toBe(`/api/assets/media/${encodeURIComponent(result.final_video)}`)
    expect(await readFile(result.final_video, 'utf8')).toBe('cloud-legacy-video-bytes')
  })

  test('legacy video loop protocol creates segment outputs from an initial video path', async () => {
    const workspace = await tempWorkspace()
    const initialVideo = join(workspace, 'initial.mp4')
    await writeFile(initialVideo, 'legacy-video-bytes')

    const { executeLegacyVideoLoop } = await import('./video-loop')
    const result = await executeLegacyVideoLoop({
      workspace,
      request: {
        initial_video_path: initialVideo,
        total_seconds: 11,
        segment_seconds: 5,
        global_prompt: '整体运镜',
        segment_prompts: ['第一段', '第二段'],
      } as any,
    })

    expect(result).toMatchObject({
      status: 'completed',
      num_segments: 3,
      asset_id: null,
    })
    expect(result.segments).toHaveLength(3)
    expect(result.final_video).toBe(result.segments[0])
    expect(result.media_url).toBe(`/api/assets/media/${encodeURIComponent(result.final_video)}`)
    expect(await readFile(result.final_video, 'utf8')).toBe('legacy-video-bytes')
    expect(result.segment_outputs.map(output => output.kind)).toEqual(['video', 'video', 'video'])
  })
})

import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-comfy-local-'))
  workspaces.push(workspace)
  return workspace
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('local ComfyUI executor', () => {
  test('queues a workflow, polls history, downloads outputs, and saves them in workspace media', async () => {
    const workspace = await tempWorkspace()
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const fetcher = async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      if (url === 'http://127.0.0.1:8188/prompt') {
        return new Response(JSON.stringify({ prompt_id: 'prompt-1' }), { status: 200 })
      }
      if (url === 'http://127.0.0.1:8188/history/prompt-1') {
        return new Response(JSON.stringify({
          'prompt-1': {
            outputs: {
              '9': {
                images: [{ filename: 'image.png', subfolder: '', type: 'output' }],
                gifs: [{ filename: 'clip.gif', subfolder: 'vhs', type: 'output' }],
              },
            },
          },
        }), { status: 200 })
      }
      if (url.startsWith('http://127.0.0.1:8188/view?')) {
        return new Response(Buffer.from(url.includes('clip.gif') ? 'gif-bytes' : 'png-bytes'), { status: 200 })
      }
      return new Response('not found', { status: 404 })
    }

    const { executeLocalComfyWorkflow } = await import('./comfy-local')
    const result = await executeLocalComfyWorkflow({
      workspace,
      baseUrl: 'http://127.0.0.1:8188',
      workflow: { '1': { inputs: { text: 'hello' } } },
      fetcher,
      pollIntervalMs: 0,
    })

    expect(result.prompt_id).toBe('prompt-1')
    expect(result.output_files).toHaveLength(2)
    expect(result.output_files[0]).toMatchObject({
      filename: 'image.png',
      media_url: expect.stringContaining('/api/assets/media/'),
      mime_type: 'image/png',
    })
    expect(await readFile(result.output_files[0].path, 'utf8')).toBe('png-bytes')
    expect(await readFile(result.output_files[1].path, 'utf8')).toBe('gif-bytes')
    expect(calls[0]).toMatchObject({ url: 'http://127.0.0.1:8188/prompt' })
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ prompt: { '1': { inputs: { text: 'hello' } } } })
  })

  test('sends a physical interrupt request to the ComfyUI gateway', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const fetcher = async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    const { interruptLocalComfy } = await import('./comfy-local')
    const ok = await interruptLocalComfy({
      baseUrl: 'http://127.0.0.1:8188/',
      headers: { Authorization: 'Bearer local-token' },
      fetcher,
    })

    expect(ok).toBe(true)
    expect(calls[0]).toMatchObject({
      url: 'http://127.0.0.1:8188/interrupt',
      init: {
        method: 'POST',
        headers: { Authorization: 'Bearer local-token' },
      },
    })
  })

  test('emits queue and polling status updates while waiting for completion', async () => {
    const workspace = await tempWorkspace()
    const statuses: any[] = []
    let historyCalls = 0
    const fetcher = async (url: string) => {
      if (url === 'http://127.0.0.1:8188/prompt') {
        return new Response(JSON.stringify({ prompt_id: 'prompt-progress' }), { status: 200 })
      }
      if (url === 'http://127.0.0.1:8188/history/prompt-progress') {
        historyCalls += 1
        if (historyCalls === 1) return new Response(JSON.stringify({}), { status: 200 })
        return new Response(JSON.stringify({
          'prompt-progress': { outputs: {} },
        }), { status: 200 })
      }
      return new Response('not found', { status: 404 })
    }

    const { executeLocalComfyWorkflow } = await import('./comfy-local')
    await executeLocalComfyWorkflow({
      workspace,
      baseUrl: 'http://127.0.0.1:8188',
      workflow: { '1': { inputs: { text: 'hello' } } },
      fetcher,
      pollIntervalMs: 0,
      onStatus: status => statuses.push(status),
    })

    expect(statuses).toEqual(expect.arrayContaining([
      expect.objectContaining({ phase: 'queued', message: expect.stringContaining('prompt-progress') }),
      expect.objectContaining({ phase: 'polling', message: expect.stringContaining('GPU') }),
      expect.objectContaining({ phase: 'completed', message: expect.stringContaining('完成') }),
    ]))
  })

  test('stops polling promptly when the cancellation signal is aborted', async () => {
    const workspace = await tempWorkspace()
    const abortController = new AbortController()
    let historyCalls = 0
    const fetcher = async (url: string) => {
      if (url === 'http://127.0.0.1:8188/prompt') {
        return new Response(JSON.stringify({ prompt_id: 'prompt-cancel' }), { status: 200 })
      }
      if (url === 'http://127.0.0.1:8188/history/prompt-cancel') {
        historyCalls += 1
        abortController.abort()
        return new Response(JSON.stringify({}), { status: 200 })
      }
      return new Response('not found', { status: 404 })
    }

    const { executeLocalComfyWorkflow } = await import('./comfy-local')
    await expect(executeLocalComfyWorkflow({
      workspace,
      baseUrl: 'http://127.0.0.1:8188',
      workflow: { '1': { inputs: { text: 'hello' } } },
      fetcher,
      pollIntervalMs: 10_000,
      abortSignal: abortController.signal,
    })).rejects.toThrow('ComfyUI task was cancelled')

    expect(historyCalls).toBe(1)
  })

  test('uploads inline base64 and remote image inputs before queueing the workflow', async () => {
    const workspace = await tempWorkspace()
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const uploadedNames = ['inline-upload.png', 'remote-upload.jpg']
    const fetcher = async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      if (url === 'https://cdn.example.com/ref.jpg') {
        return new Response('remote-image-bytes', { status: 200 })
      }
      if (url === 'http://127.0.0.1:8188/upload/image') {
        return new Response(JSON.stringify({ name: uploadedNames.shift() }), { status: 200 })
      }
      if (url === 'http://127.0.0.1:8188/prompt') {
        const body = JSON.parse(String(init?.body || '{}'))
        expect(body.prompt['1'].inputs.image).toBe('inline-upload.png')
        expect(body.prompt['1'].inputs.reference).toBe('remote-upload.jpg')
        expect(body.prompt['1'].inputs.text).toBe('keep text')
        return new Response(JSON.stringify({ prompt_id: 'prompt-inline' }), { status: 200 })
      }
      if (url === 'http://127.0.0.1:8188/history/prompt-inline') {
        return new Response(JSON.stringify({ 'prompt-inline': { outputs: {} } }), { status: 200 })
      }
      return new Response('not found', { status: 404 })
    }

    const { executeLocalComfyWorkflow } = await import('./comfy-local')
    await executeLocalComfyWorkflow({
      workspace,
      baseUrl: 'http://127.0.0.1:8188',
      workflow: {
        '1': {
          inputs: {
            image: `data:image/png;base64,${Buffer.from('inline-image-bytes').toString('base64')}`,
            reference: 'https://cdn.example.com/ref.jpg',
            text: 'keep text',
          },
        },
      },
      fetcher,
      pollIntervalMs: 0,
    })

    expect(calls.filter(call => call.url === 'http://127.0.0.1:8188/upload/image')).toHaveLength(2)
    expect(calls.find(call => call.url === 'https://cdn.example.com/ref.jpg')).toBeTruthy()
  })

  test('accepts deeply nested upload filenames from cloud Comfy gateways', async () => {
    const workspace = await tempWorkspace()
    const fetcher = async (url: string, init?: RequestInit) => {
      if (url === 'https://runninghub.example/proxy/upload/image') {
        return new Response(JSON.stringify({ data: { result: { fileName: 'cloud-upload.png' } } }), { status: 200 })
      }
      if (url === 'https://runninghub.example/proxy/prompt') {
        const body = JSON.parse(String(init?.body || '{}'))
        expect(body.prompt['1'].inputs.image).toBe('cloud-upload.png')
        return new Response(JSON.stringify({ prompt_id: 'prompt-upload-name' }), { status: 200 })
      }
      if (url === 'https://runninghub.example/proxy/history/prompt-upload-name') {
        return new Response(JSON.stringify({ 'prompt-upload-name': { outputs: {} } }), { status: 200 })
      }
      return new Response('not found', { status: 404 })
    }

    const { executeLocalComfyWorkflow } = await import('./comfy-local')
    await executeLocalComfyWorkflow({
      workspace,
      baseUrl: 'https://runninghub.example/proxy',
      workflow: {
        '1': {
          inputs: {
            image: `data:image/png;base64,${Buffer.from('inline-image-bytes').toString('base64')}`,
          },
        },
      },
      fetcher,
      pollIntervalMs: 0,
    })
  })

  test('accepts nested and camelCase prompt ids returned by ComfyUI proxy gateways', async () => {
    const workspace = await tempWorkspace()
    const fetcher = async (url: string) => {
      if (url === 'https://runninghub.example/proxy/prompt') {
        return new Response(JSON.stringify({ data: { promptId: 'proxy-prompt-1' } }), { status: 200 })
      }
      if (url === 'https://runninghub.example/proxy/history/proxy-prompt-1') {
        return new Response(JSON.stringify({
          data: {
            outputs: {
              '99': { videos: [{ filename: 'proxy-video.mp4', subfolder: '', type: 'output' }] },
            },
          },
        }), { status: 200 })
      }
      if (url.startsWith('https://runninghub.example/proxy/view?')) {
        return new Response('proxy-video-bytes', { status: 200 })
      }
      return new Response('not found', { status: 404 })
    }

    const { executeLocalComfyWorkflow } = await import('./comfy-local')
    const result = await executeLocalComfyWorkflow({
      workspace,
      baseUrl: 'https://runninghub.example/proxy',
      workflow: { '1': { inputs: { text: 'hello' } } },
      fetcher,
      pollIntervalMs: 0,
    })

    expect(result.prompt_id).toBe('proxy-prompt-1')
    expect(result.output_files[0]).toMatchObject({
      kind: 'video',
      filename: 'proxy-video.mp4',
    })
    expect(await readFile(result.output_files[0].path, 'utf8')).toBe('proxy-video-bytes')
  })

  test('accepts deeply nested prompt ids and history maps from cloud Comfy gateways', async () => {
    const workspace = await tempWorkspace()
    const fetcher = async (url: string) => {
      if (url === 'https://runninghub.example/proxy/prompt') {
        return new Response(JSON.stringify({ data: { result: { prompt_id: 'deep-prompt-1' } } }), { status: 200 })
      }
      if (url === 'https://runninghub.example/proxy/history/deep-prompt-1') {
        return new Response(JSON.stringify({
          data: {
            result: {
              'deep-prompt-1': {
                outputs: {
                  '42': { images: [{ filename: 'deep-image.png', subfolder: '', type: 'output' }] },
                },
              },
            },
          },
        }), { status: 200 })
      }
      if (url.startsWith('https://runninghub.example/proxy/view?')) {
        return new Response('deep-image-bytes', { status: 200 })
      }
      return new Response('not found', { status: 404 })
    }

    const { executeLocalComfyWorkflow } = await import('./comfy-local')
    const result = await executeLocalComfyWorkflow({
      workspace,
      baseUrl: 'https://runninghub.example/proxy',
      workflow: { '1': { inputs: { text: 'hello' } } },
      fetcher,
      pollIntervalMs: 0,
    })

    expect(result.prompt_id).toBe('deep-prompt-1')
    expect(result.output_files[0]).toMatchObject({
      node_id: '42',
      filename: 'deep-image.png',
      kind: 'image',
    })
    expect(await readFile(result.output_files[0].path, 'utf8')).toBe('deep-image-bytes')
  })

  test('accepts task-wrapped prompt ids and histories from cloud Comfy gateways', async () => {
    const workspace = await tempWorkspace()
    const fetcher = async (url: string) => {
      if (url === 'https://cloud-comfy.example/proxy/prompt') {
        return new Response(JSON.stringify({ data: { task: { taskId: 'task-wrapped-prompt' } } }), { status: 200 })
      }
      if (url === 'https://cloud-comfy.example/proxy/history/task-wrapped-prompt') {
        return new Response(JSON.stringify({
          data: {
            task: {
              outputs: {
                '77': { images: [{ filename: 'task-wrapped.png', subfolder: '', type: 'output' }] },
              },
            },
          },
        }), { status: 200 })
      }
      if (url.startsWith('https://cloud-comfy.example/proxy/view?')) {
        return new Response('task-wrapped-image-bytes', { status: 200 })
      }
      return new Response('not found', { status: 404 })
    }

    const { executeLocalComfyWorkflow } = await import('./comfy-local')
    const result = await executeLocalComfyWorkflow({
      workspace,
      baseUrl: 'https://cloud-comfy.example/proxy',
      workflow: { '1': { inputs: { text: 'hello' } } },
      fetcher,
      pollIntervalMs: 0,
    })

    expect(result.prompt_id).toBe('task-wrapped-prompt')
    expect(result.output_files[0]).toMatchObject({
      node_id: '77',
      filename: 'task-wrapped.png',
      kind: 'image',
    })
    expect(await readFile(result.output_files[0].path, 'utf8')).toBe('task-wrapped-image-bytes')
  })

  test('accepts cloud Comfy history files and direct output URLs', async () => {
    const workspace = await tempWorkspace()
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const fetcher = async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      if (url === 'https://runninghub.example/proxy/prompt') {
        return new Response(JSON.stringify({ prompt_id: 'cloud-prompt-1' }), { status: 200 })
      }
      if (url === 'https://runninghub.example/proxy/history/cloud-prompt-1') {
        return new Response(JSON.stringify({
          'cloud-prompt-1': {
            outputs: {
              '18': {
                files: [{ filename: 'cloud-file.mp4', subfolder: 'videos', type: 'output' }],
              },
              '19': {
                output: [{ url: 'https://cdn.example.com/direct-output.webm' }],
              },
            },
          },
        }), { status: 200 })
      }
      if (url === 'https://runninghub.example/proxy/view?filename=cloud-file.mp4&subfolder=videos&type=output') {
        return new Response('cloud-file-bytes', { status: 200 })
      }
      if (url === 'https://cdn.example.com/direct-output.webm') {
        return new Response('direct-output-bytes', { status: 200 })
      }
      return new Response('not found', { status: 404 })
    }

    const { executeLocalComfyWorkflow } = await import('./comfy-local')
    const result = await executeLocalComfyWorkflow({
      workspace,
      baseUrl: 'https://runninghub.example/proxy',
      workflow: { '1': { inputs: { text: 'hello' } } },
      fetcher,
      pollIntervalMs: 0,
    })

    expect(result.output_files).toHaveLength(2)
    expect(result.output_files.map(file => file.filename)).toEqual(['cloud-file.mp4', 'direct-output.webm'])
    expect(result.output_files.every(file => file.kind === 'video')).toBe(true)
    expect(await readFile(result.output_files[0].path, 'utf8')).toBe('cloud-file-bytes')
    expect(await readFile(result.output_files[1].path, 'utf8')).toBe('direct-output-bytes')
    expect(calls.map(call => call.url)).toContain('https://cdn.example.com/direct-output.webm')
  })

  test('saves direct data URL outputs returned by cloud Comfy gateways', async () => {
    const workspace = await tempWorkspace()
    const imageBase64 = Buffer.from('inline-output-bytes').toString('base64')
    const fetcher = async (url: string) => {
      if (url === 'https://runninghub.example/proxy/prompt') {
        return new Response(JSON.stringify({ prompt_id: 'data-url-prompt' }), { status: 200 })
      }
      if (url === 'https://runninghub.example/proxy/history/data-url-prompt') {
        return new Response(JSON.stringify({
          'data-url-prompt': {
            outputs: {
              '22': {
                output: `data:image/png;base64,${imageBase64}`,
              },
            },
          },
        }), { status: 200 })
      }
      throw new Error(`unexpected fetch: ${url}`)
    }

    const { executeLocalComfyWorkflow } = await import('./comfy-local')
    const result = await executeLocalComfyWorkflow({
      workspace,
      baseUrl: 'https://runninghub.example/proxy',
      workflow: { '1': { inputs: { text: 'hello' } } },
      fetcher,
      pollIntervalMs: 0,
    })

    expect(result.output_files).toHaveLength(1)
    expect(result.output_files[0]).toMatchObject({
      node_id: '22',
      kind: 'image',
      mime_type: 'image/png',
    })
    expect(result.output_files[0].filename).toEndWith('.png')
    expect(await readFile(result.output_files[0].path, 'utf8')).toBe('inline-output-bytes')
  })

  test('saves data URL outputs wrapped in cloud gateway output objects', async () => {
    const workspace = await tempWorkspace()
    const imageBase64 = Buffer.from('object-data-url-bytes').toString('base64')
    const fetcher = async (url: string) => {
      if (url === 'https://runninghub.example/proxy/prompt') {
        return new Response(JSON.stringify({ prompt_id: 'object-data-url-prompt' }), { status: 200 })
      }
      if (url === 'https://runninghub.example/proxy/history/object-data-url-prompt') {
        return new Response(JSON.stringify({
          'object-data-url-prompt': {
            outputs: {
              '28': {
                output: { dataUrl: `data:image/png;base64,${imageBase64}` },
              },
            },
          },
        }), { status: 200 })
      }
      throw new Error(`unexpected fetch: ${url}`)
    }

    const { executeLocalComfyWorkflow } = await import('./comfy-local')
    const result = await executeLocalComfyWorkflow({
      workspace,
      baseUrl: 'https://runninghub.example/proxy',
      workflow: { '1': { inputs: { text: 'hello' } } },
      fetcher,
      pollIntervalMs: 0,
    })

    expect(result.output_files).toHaveLength(1)
    expect(result.output_files[0]).toMatchObject({
      node_id: '28',
      kind: 'image',
      mime_type: 'image/png',
    })
    expect(await readFile(result.output_files[0].path, 'utf8')).toBe('object-data-url-bytes')
  })

  test('copies declared input files into the ComfyUI input directory before queueing', async () => {
    const workspace = await tempWorkspace()
    const inputDir = join(workspace, 'comfy-input')
    const sourcePath = join(workspace, 'assets', 'source.png')
    await mkdir(join(workspace, 'assets'), { recursive: true })
    await writeFile(sourcePath, 'source-image-bytes')
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const fetcher = async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      if (url === 'http://127.0.0.1:8188/prompt') {
        const body = JSON.parse(String(init?.body || '{}'))
        expect(body.prompt['7'].inputs.image).toMatch(/source\.png$/)
        expect(body.prompt['7'].inputs.text).toBe('keep text')
        return new Response(JSON.stringify({ prompt_id: 'prompt-input-files' }), { status: 200 })
      }
      if (url === 'http://127.0.0.1:8188/history/prompt-input-files') {
        return new Response(JSON.stringify({ 'prompt-input-files': { outputs: {} } }), { status: 200 })
      }
      return new Response('not found', { status: 404 })
    }

    const { executeLocalComfyWorkflow } = await import('./comfy-local')
    await executeLocalComfyWorkflow({
      workspace,
      baseUrl: 'http://127.0.0.1:8188',
      workflow: { '7': { inputs: { image: 'placeholder.png', text: 'keep text' } } },
      inputFiles: { image: sourcePath },
      comfyInputDir: inputDir,
      fetcher,
      pollIntervalMs: 0,
    })

    const copiedFiles = await readdir(inputDir)
    expect(copiedFiles).toHaveLength(1)
    expect(copiedFiles[0]).toMatch(/source\.png$/)
    expect(await readFile(join(inputDir, copiedFiles[0]), 'utf8')).toBe('source-image-bytes')
    expect(calls[0].url).toBe('http://127.0.0.1:8188/prompt')
  })

  test('maps full input file selectors like node.inputs.field into workflow inputs', async () => {
    const workspace = await tempWorkspace()
    const inputDir = join(workspace, 'comfy-input')
    const sourcePath = join(workspace, 'assets', 'full-selector.png')
    await mkdir(join(workspace, 'assets'), { recursive: true })
    await writeFile(sourcePath, 'full-selector-image-bytes')
    const fetcher = async (url: string, init?: RequestInit) => {
      if (url === 'http://127.0.0.1:8188/prompt') {
        const body = JSON.parse(String(init?.body || '{}'))
        expect(body.prompt['7'].inputs.image).toMatch(/full-selector\.png$/)
        expect(body.prompt['8'].inputs.image).toBe('other-placeholder.png')
        return new Response(JSON.stringify({ prompt_id: 'prompt-full-selector' }), { status: 200 })
      }
      if (url === 'http://127.0.0.1:8188/history/prompt-full-selector') {
        return new Response(JSON.stringify({ 'prompt-full-selector': { outputs: {} } }), { status: 200 })
      }
      return new Response('not found', { status: 404 })
    }

    const { executeLocalComfyWorkflow } = await import('./comfy-local')
    await executeLocalComfyWorkflow({
      workspace,
      baseUrl: 'http://127.0.0.1:8188',
      workflow: {
        '7': { inputs: { image: 'placeholder.png' } },
        '8': { inputs: { image: 'other-placeholder.png' } },
      },
      inputFiles: { '7.inputs.image': sourcePath },
      comfyInputDir: inputDir,
      fetcher,
      pollIntervalMs: 0,
    })
  })
})

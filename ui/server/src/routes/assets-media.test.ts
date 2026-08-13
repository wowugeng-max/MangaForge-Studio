import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { parseFfprobeVideoMetadata, parseMultipartFileUpload } from './assets-media'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-assets-media-'))
  workspaces.push(workspace)
  return workspace
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

function createRouteHarness() {
  const handlers = new Map<string, any>()
  const app = {
    post: (paths: string | string[], ...fns: any[]) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`POST ${path}`, fns[fns.length - 1])
      return app
    },
    get: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`GET ${path}`, handler)
      return app
    },
  }
  return { app, handlers }
}

async function call(handler: any, req: any = {}) {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null,
    status(code: number) {
      this.statusCode = code
      return this
    },
    setHeader(key: string, value: string) {
      this.headers[key] = value
      return this
    },
    send(body: any) {
      this.body = body
      return this
    },
    json(body: any) {
      this.body = body
      return this
    },
  }
  await handler(req, res)
  return res
}

describe('asset media uploads', () => {
  test('registers FastAPI-style trailing slash aliases for upload routes', async () => {
    const workspace = await tempWorkspace()
    const { registerAssetMediaRoutes } = await import('./assets-media')
    const { app, handlers } = createRouteHarness()

    registerAssetMediaRoutes(app as any, () => workspace)

    expect(handlers.has('POST /api/assets/upload/image/')).toBe(true)
    expect(handlers.has('POST /api/assets/upload/video/')).toBe(true)
  })

  test('extracts filename and binary content from a multipart upload body', () => {
    const boundary = '----mangaforge-boundary'
    const content = Buffer.from([0, 1, 2, 3, 255])
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="shot.png"\r\nContent-Type: image/png\r\n\r\n`, 'utf8'),
      content,
      Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'),
    ])

    const parsed = parseMultipartFileUpload(`multipart/form-data; boundary=${boundary}`, body, 'fallback.png')

    expect(parsed.filename).toBe('shot.png')
    expect(parsed.buffer).toEqual(content)
  })

  test('deduplicates identical upload content when dedupe=content is requested', async () => {
    const workspace = await tempWorkspace()
    const { handleAssetUpload } = await import('./assets-media')
    const makeRes = (): any => ({
      statusCode: 200,
      body: null,
      json(payload: any) { this.body = payload; return this },
      status(code: number) { this.statusCode = code; return this },
    })
    const oneByOnePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64',
    )

    const first = makeRes()
    await handleAssetUpload({
      headers: { 'content-type': 'image/png' },
      query: { filename: 'reference-1.png', dedupe: 'content' },
      body: oneByOnePng,
    } as any, first, workspace, 'image')
    const repeated = makeRes()
    await handleAssetUpload({
      headers: { 'content-type': 'image/png' },
      query: { filename: 'reference-2.png', dedupe: 'content' },
      body: oneByOnePng,
    } as any, repeated, workspace, 'image')
    const different = makeRes()
    await handleAssetUpload({
      headers: { 'content-type': 'application/octet-stream' },
      query: { filename: 'reference-1.png', dedupe: 'content' },
      body: Buffer.from('other-reference-bytes'),
    } as any, different, workspace, 'image')

    expect(first.statusCode).toBe(200)
    expect(repeated.statusCode).toBe(200)
    expect(repeated.body.file_path).toBe(first.body.file_path)
    expect(repeated.body).toMatchObject({ width: 1, height: 1, format: 'png' })
    expect(different.body.file_path).not.toBe(first.body.file_path)
    expect(await readdir(join(workspace, 'assets'))).toHaveLength(2)
  })

  test('keeps default uploads on unique timestamped names when dedupe is not requested', async () => {
    const workspace = await tempWorkspace()
    const { handleAssetUpload } = await import('./assets-media')
    const makeRes = (): any => ({
      statusCode: 200,
      body: null,
      json(payload: any) { this.body = payload; return this },
      status(code: number) { this.statusCode = code; return this },
    })

    const first = makeRes()
    const second = makeRes()
    for (const res of [first, second]) {
      await handleAssetUpload({
        headers: { 'content-type': 'application/octet-stream' },
        query: { filename: 'raw.png' },
        body: Buffer.from('raw-bytes'),
      } as any, res, workspace, 'image')
    }

    expect(second.body.file_path).not.toBe(first.body.file_path)
    expect(await readdir(join(workspace, 'assets'))).toHaveLength(2)
  })

  test('saves raw upload bytes through the image upload route middleware contract', async () => {
    const workspace = await tempWorkspace()
    const { handleAssetUpload } = await import('./assets-media')
    const res: any = {
      statusCode: 200,
      body: null,
      json(payload: any) {
        this.body = payload
        return this
      },
      status(code: number) {
        this.statusCode = code
        return this
      },
    }

    await handleAssetUpload({
      headers: { 'content-type': 'application/octet-stream' },
      query: { filename: 'raw.png' },
      body: Buffer.from('raw-bytes'),
    } as any, res, workspace, 'image')

    expect(res.statusCode).toBe(200)
    expect(res.body.file_path).toContain('raw.png')
    expect(await readFile(res.body.file_path, 'utf8')).toBe('raw-bytes')
  })

  test('rejects explicit unsupported MIME types on image uploads like upstream', async () => {
    const workspace = await tempWorkspace()
    const { handleAssetUpload } = await import('./assets-media')
    const res: any = {
      statusCode: 200,
      body: null,
      json(payload: any) {
        this.body = payload
        return this
      },
      status(code: number) {
        this.statusCode = code
        return this
      },
    }

    await handleAssetUpload({
      headers: { 'content-type': 'text/plain' },
      query: { filename: 'note.txt' },
      body: Buffer.from('not an image'),
    } as any, res, workspace, 'image')

    expect(res.statusCode).toBe(400)
    expect(res.body.error).toContain('不支持的图片格式')
  })

  test('returns FastAPI-compatible detail field for upload validation errors', async () => {
    const workspace = await tempWorkspace()
    const { handleAssetUpload } = await import('./assets-media')
    const res: any = {
      statusCode: 200,
      body: null,
      json(payload: any) {
        this.body = payload
        return this
      },
      status(code: number) {
        this.statusCode = code
        return this
      },
    }

    await handleAssetUpload({
      headers: { 'content-type': 'text/plain' },
      query: { filename: 'note.txt' },
      body: Buffer.from('not an image'),
    } as any, res, workspace, 'image')

    expect(res.statusCode).toBe(400)
    expect(res.body.error).toContain('不支持的图片格式')
    expect(res.body.detail).toBe(res.body.error)
  })

  test('extracts image dimensions and format from uploaded PNG bytes like upstream', async () => {
    const workspace = await tempWorkspace()
    const { handleAssetUpload } = await import('./assets-media')
    const res: any = {
      statusCode: 200,
      body: null,
      json(payload: any) {
        this.body = payload
        return this
      },
      status(code: number) {
        this.statusCode = code
        return this
      },
    }
    const oneByOnePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64',
    )

    await handleAssetUpload({
      headers: { 'content-type': 'image/png' },
      query: { filename: 'pixel.png' },
      body: oneByOnePng,
    } as any, res, workspace, 'image')

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ width: 1, height: 1, format: 'png' })
  })

  test('rejects explicitly typed image uploads that cannot be parsed like upstream', async () => {
    const workspace = await tempWorkspace()
    const { handleAssetUpload } = await import('./assets-media')
    const res: any = {
      statusCode: 200,
      body: null,
      json(payload: any) {
        this.body = payload
        return this
      },
      status(code: number) {
        this.statusCode = code
        return this
      },
    }

    await handleAssetUpload({
      headers: { 'content-type': 'image/png' },
      query: { filename: 'broken.png' },
      body: Buffer.from('not a png'),
    } as any, res, workspace, 'image')

    expect(res.statusCode).toBe(400)
    expect(res.body.error).toContain('无法解析图片文件')
  })

  test('parses ffprobe video metadata into upload response fields like upstream', () => {
    const metadata = parseFfprobeVideoMetadata({
      streams: [
        { codec_type: 'audio', duration: '3.1' },
        { codec_type: 'video', width: 1920, height: 1080, duration: '3.5', r_frame_rate: '24000/1001' },
      ],
    }, 'mp4')

    expect(metadata).toEqual({
      width: 1920,
      height: 1080,
      duration: 3.5,
      fps: 23.98,
      format: 'mp4',
    })
  })

  test('serves upstream /api/files paths from workspace data temp directory', async () => {
    const workspace = await tempWorkspace()
    await mkdir(join(workspace, 'data', 'temp'), { recursive: true })
    await writeFile(join(workspace, 'data', 'temp', 'clip.mp4'), 'legacy-video')
    const { registerAssetMediaRoutes } = await import('./assets-media')
    const { app, handlers } = createRouteHarness()

    registerAssetMediaRoutes(app as any, () => workspace)

    expect(handlers.has('GET /api/files/*')).toBe(true)
    const res = await call(handlers.get('GET /api/files/*'), { path: '/api/files/clip.mp4' })

    expect(res.statusCode).toBe(200)
    expect(res.headers['Content-Type']).toBe('video/mp4')
    expect(Buffer.from(res.body).toString('utf8')).toBe('legacy-video')
  })

  test('serves upstream data/assets media paths from the active workspace', async () => {
    const workspace = await tempWorkspace()
    await mkdir(join(workspace, 'data', 'assets', 'images'), { recursive: true })
    await writeFile(join(workspace, 'data', 'assets', 'images', 'legacy.png'), 'legacy-image')
    const { registerAssetMediaRoutes } = await import('./assets-media')
    const { app, handlers } = createRouteHarness()

    registerAssetMediaRoutes(app as any, () => workspace)

    const res = await call(handlers.get('GET /api/assets/media/*'), {
      path: '/api/assets/media/data/assets/images/legacy.png',
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['Content-Type']).toBe('image/png')
    expect(Buffer.from(res.body).toString('utf8')).toBe('legacy-image')
  })

  test('blocks asset media path traversal to non-media workspace files', async () => {
    const workspace = await tempWorkspace()
    await mkdir(join(workspace, 'assets'), { recursive: true })
    await writeFile(join(workspace, 'secret.txt'), 'secret')
    const { registerAssetMediaRoutes } = await import('./assets-media')
    const { app, handlers } = createRouteHarness()

    registerAssetMediaRoutes(app as any, () => workspace)

    const res = await call(handlers.get('GET /api/assets/media/*'), {
      path: '/api/assets/media/../secret.txt',
    })

    expect(res.statusCode).toBe(404)
    expect(Buffer.isBuffer(res.body)).toBe(false)
  })

  test('blocks upstream /api/files path traversal outside workspace data temp', async () => {
    const workspace = await tempWorkspace()
    await mkdir(join(workspace, 'data', 'temp'), { recursive: true })
    await writeFile(join(workspace, 'secret.txt'), 'secret')
    const { registerAssetMediaRoutes } = await import('./assets-media')
    const { app, handlers } = createRouteHarness()

    registerAssetMediaRoutes(app as any, () => workspace)
    const res = await call(handlers.get('GET /api/files/*'), { path: '/api/files/../secret.txt' })

    expect(res.statusCode).toBe(404)
    expect(Buffer.isBuffer(res.body)).toBe(false)
  })

  test('returns FastAPI-compatible detail field for missing media reads', async () => {
    const workspace = await tempWorkspace()
    const { registerAssetMediaRoutes } = await import('./assets-media')
    const { app, handlers } = createRouteHarness()

    registerAssetMediaRoutes(app as any, () => workspace)

    const media = await call(handlers.get('GET /api/assets/media/*'), {
      path: '/api/assets/media/assets/missing.png',
    })
    expect(media.statusCode).toBe(404)
    expect(media.body.detail).toBe(media.body.error)

    const legacy = await call(handlers.get('GET /api/files/*'), {
      path: '/api/files/missing.mp4',
    })
    expect(legacy.statusCode).toBe(404)
    expect(legacy.body.detail).toBe(legacy.body.error)
  })
})

import { afterEach, describe, expect, test } from 'bun:test'
import { access, mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { tmpdir } from 'os'
import { readAssets, writeAssets, type AssetRecord } from '../assets'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-assets-crud-'))
  workspaces.push(workspace)
  return workspace
}

function createRouteHarness() {
  const handlers = new Map<string, any>()
  const app = {
    get: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`GET ${path}`, handler)
      return app
    },
    post: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`POST ${path}`, handler)
      return app
    },
    put: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`PUT ${path}`, handler)
      return app
    },
    patch: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`PATCH ${path}`, handler)
      return app
    },
    delete: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`DELETE ${path}`, handler)
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
    send(body?: any) {
      this.body = body ?? null
      return this
    },
  }
  await handler({ params: {}, query: {}, body: {}, ...req }, res)
  return res
}

const baseAsset = (overrides: Partial<AssetRecord>): AssetRecord => ({
  id: 1,
  name: 'asset',
  type: 'prompt',
  description: '',
  tags: [],
  project_id: null,
  thumbnail: '',
  data: {},
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('asset CRUD TS routes', () => {
  test('registers FastAPI-style trailing slash aliases for collection routes', async () => {
    const workspace = await tempWorkspace()
    const { registerAssetCrudRoutes } = await import('./assets-crud')
    const { app, handlers } = createRouteHarness()
    registerAssetCrudRoutes(app as any, () => workspace)

    expect(handlers.has('GET /api/assets/')).toBe(true)
    expect(handlers.has('POST /api/assets/')).toBe(true)
  })

  test('registers FastAPI-style trailing slash aliases for asset item routes', async () => {
    const workspace = await tempWorkspace()
    const { registerAssetCrudRoutes } = await import('./assets-crud')
    const { app, handlers } = createRouteHarness()
    registerAssetCrudRoutes(app as any, () => workspace)

    expect(handlers.has('GET /api/assets/:id/')).toBe(true)
    expect(handlers.has('PUT /api/assets/:id/')).toBe(true)
    expect(handlers.has('PATCH /api/assets/:id/project/')).toBe(true)
    expect(handlers.has('DELETE /api/assets/:id/')).toBe(true)
  })

  test('creates assets with upstream response fields and normalizes legacy records on list', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'assets.json'), JSON.stringify([
      { id: 1, name: 'legacy prompt', type: 'prompt', updated_at: '2026-02-03T04:05:06.000Z' },
    ]))
    const { registerAssetCrudRoutes } = await import('./assets-crud')
    const { app, handlers } = createRouteHarness()
    registerAssetCrudRoutes(app as any, () => workspace)

    const created = await call(handlers.get('POST /api/assets'), {
      body: {
        type: 'prompt',
        name: 'new prompt',
        description: 'fresh',
        tags: ['tag'],
        thumbnail: 'thumb.png',
        project_id: 5,
        data: { content: 'hello' },
      },
    })
    expect(created.body).toMatchObject({
      id: 2,
      type: 'prompt',
      name: 'new prompt',
      version: 1,
      project_id: 5,
      thumbnail: 'thumb.png',
    })
    expect(typeof created.body.created_at).toBe('string')
    expect(typeof created.body.updated_at).toBe('string')

    const listed = await call(handlers.get('GET /api/assets'), { query: { type: 'prompt' } })
    expect(Array.isArray(listed.body)).toBe(true)
    const legacy = listed.body.find((asset: AssetRecord) => asset.id === 1)
    expect(legacy).toMatchObject({
      id: 1,
      description: '',
      tags: [],
      project_id: null,
      thumbnail: '',
      data: {},
      parent_id: null,
      version: 1,
      created_at: '2026-02-03T04:05:06.000Z',
    })
  })

  test('preserves top-level lineage fields when creating media assets', async () => {
    const workspace = await tempWorkspace()
    const { registerAssetCrudRoutes } = await import('./assets-crud')
    const { app, handlers } = createRouteHarness()
    registerAssetCrudRoutes(app as any, () => workspace)

    const created = await call(handlers.get('POST /api/assets'), {
      body: {
        type: 'image',
        name: 'lineage image',
        project_id: 5,
        source_asset_ids: [1, 2],
        file_path: 'assets/generated/out.png',
        data: { file_path: 'assets/generated/out.png', width: 640, height: 480 },
      },
    })

    expect(created.statusCode).toBe(200)
    expect(created.body).toMatchObject({
      type: 'image',
      source_asset_ids: [1, 2],
      file_path: 'assets/generated/out.png',
      data: { file_path: 'assets/generated/out.png' },
    })

    const stored = await readAssets(workspace)
    expect(stored[0]).toMatchObject({
      source_asset_ids: [1, 2],
      file_path: 'assets/generated/out.png',
    })
  })

  test('accepts camelCase asset fields from TS clients', async () => {
    const workspace = await tempWorkspace()
    const { registerAssetCrudRoutes } = await import('./assets-crud')
    const { app, handlers } = createRouteHarness()
    registerAssetCrudRoutes(app as any, () => workspace)

    const created = await call(handlers.get('POST /api/assets'), {
      body: {
        type: 'image',
        name: 'camel image',
        projectId: 5,
        sourceAssetIds: [1, 2],
        filePath: 'assets/generated/camel.png',
        data: { filePath: 'assets/generated/camel.png', width: 640, height: 480 },
      },
    })

    expect(created.statusCode).toBe(200)
    expect(created.body).toMatchObject({
      type: 'image',
      project_id: 5,
      source_asset_ids: [1, 2],
      file_path: 'assets/generated/camel.png',
      data: { file_path: 'assets/generated/camel.png', width: 640, height: 480 },
    })

    const patched = await call(handlers.get('PATCH /api/assets/:id/project'), {
      params: { id: String(created.body.id) },
      body: { projectId: 9 },
    })

    expect(patched.statusCode).toBe(200)
    expect(patched.body.project_id).toBe(9)
  })

  test('filters assets by project, global scope, and type like the upstream assets API', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [
      baseAsset({ id: 1, name: 'project image', type: 'image', project_id: 5 }),
      baseAsset({ id: 2, name: 'project prompt', type: 'prompt', project_id: 5 }),
      baseAsset({ id: 3, name: 'other project image', type: 'image', project_id: 9 }),
      baseAsset({ id: 4, name: 'global image', type: 'image', project_id: null }),
    ])
    const { registerAssetCrudRoutes } = await import('./assets-crud')
    const { app, handlers } = createRouteHarness()
    registerAssetCrudRoutes(app as any, () => workspace)
    const list = handlers.get('GET /api/assets')

    const projectAssets = await call(list, { query: { project_id: '5' } })
    expect(projectAssets.body.map((asset: AssetRecord) => asset.id)).toEqual([1, 2])

    const globalAssets = await call(list, { query: { is_global: 'true' } })
    expect(globalAssets.body.map((asset: AssetRecord) => asset.id)).toEqual([4])

    const typedAssets = await call(list, { query: { project_id: '5', type: 'image' } })
    expect(typedAssets.body.map((asset: AssetRecord) => asset.id)).toEqual([1])
  })

  test('uses the upstream default list limit while still allowing explicit larger pages', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, Array.from({ length: 150 }, (_, index) => baseAsset({
      id: index + 1,
      name: `asset ${index + 1}`,
      type: 'prompt',
      data: { content: `prompt ${index + 1}` },
    })))
    const { registerAssetCrudRoutes } = await import('./assets-crud')
    const { app, handlers } = createRouteHarness()
    registerAssetCrudRoutes(app as any, () => workspace)
    const list = handlers.get('GET /api/assets')

    const defaultPage = await call(list)
    const largerPage = await call(list, { query: { limit: '120' } })

    expect(defaultPage.body).toHaveLength(100)
    expect(defaultPage.body.at(0).id).toBe(1)
    expect(defaultPage.body.at(-1).id).toBe(100)
    expect(largerPage.body).toHaveLength(120)
  })

  test('returns a bare asset from the upstream get asset route', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [
      baseAsset({ id: 1, name: 'detail asset', type: 'prompt', data: { content: 'detail' } }),
    ])
    const { registerAssetCrudRoutes } = await import('./assets-crud')
    const { app, handlers } = createRouteHarness()
    registerAssetCrudRoutes(app as any, () => workspace)

    const response = await call(handlers.get('GET /api/assets/:id'), { params: { id: '1' } })

    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({
      id: 1,
      name: 'detail asset',
      data: { content: 'detail' },
    })
    expect(response.body.asset).toBeUndefined()
  })

  test('normalizes legacy camelCase asset records when listing assets', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'assets.json'), JSON.stringify([
      {
        id: 1,
        name: 'legacy camel image',
        type: 'image',
        projectId: 5,
        parentId: 3,
        sourceAssetIds: [7, 8],
        filePath: 'assets/legacy/camel.png',
        data: { filePath: 'assets/legacy/camel.png', width: 320, height: 180 },
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    ]))
    const { registerAssetCrudRoutes } = await import('./assets-crud')
    const { app, handlers } = createRouteHarness()
    registerAssetCrudRoutes(app as any, () => workspace)

    const listed = await call(handlers.get('GET /api/assets'), { query: { projectId: '5' } })

    expect(listed.body).toHaveLength(1)
    expect(listed.body[0]).toMatchObject({
      id: 1,
      project_id: 5,
      parent_id: 3,
      source_asset_ids: [7, 8],
      file_path: 'assets/legacy/camel.png',
      data: { file_path: 'assets/legacy/camel.png', width: 320, height: 180 },
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: '2026-06-01T00:00:00.000Z',
    })
  })

  test('moves an asset between project and global scopes through the upstream project patch route', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [
      baseAsset({ id: 1, name: 'movable', project_id: null }),
    ])
    const { registerAssetCrudRoutes } = await import('./assets-crud')
    const { app, handlers } = createRouteHarness()
    registerAssetCrudRoutes(app as any, () => workspace)

    const patched = await call(handlers.get('PATCH /api/assets/:id/project'), {
      params: { id: '1' },
      body: { project_id: 8 },
    })
    expect(patched.statusCode).toBe(200)
    expect(patched.body.project_id).toBe(8)

    const projectAssets = await call(handlers.get('GET /api/assets'), { query: { project_id: '8' } })
    expect(projectAssets.body.map((asset: AssetRecord) => asset.id)).toEqual([1])
  })

  test('creates a new version instead of overwriting the original asset on update', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [
      baseAsset({
        id: 1,
        name: 'original prompt',
        type: 'prompt',
        description: 'v1',
        tags: ['old'],
        data: { content: 'old text' },
        ...( { version: 1, source_asset_ids: [9], file_path: 'assets/original.json' } as any ),
      }),
    ])
    const { registerAssetCrudRoutes } = await import('./assets-crud')
    const { app, handlers } = createRouteHarness()
    registerAssetCrudRoutes(app as any, () => workspace)

    const updated = await call(handlers.get('PUT /api/assets/:id'), {
      params: { id: '1' },
      body: {
        name: 'edited prompt',
        description: 'v2',
        tags: ['new'],
        data: { content: 'new text' },
      },
    })

    expect(updated.statusCode).toBe(200)
    expect(updated.body).toMatchObject({
      id: 2,
      parent_id: 1,
      version: 2,
      source_asset_ids: [9],
      file_path: 'assets/original.json',
      name: 'edited prompt',
      data: { content: 'new text' },
    })

    const stored = await readAssets(workspace)
    expect(stored).toHaveLength(2)
    expect(stored.find(asset => asset.id === 1)).toMatchObject({
      name: 'original prompt',
      data: { content: 'old text' },
    })
  })

  test('rejects known asset types that do not match upstream data schemas on create', async () => {
    const workspace = await tempWorkspace()
    const { registerAssetCrudRoutes } = await import('./assets-crud')
    const { app, handlers } = createRouteHarness()
    registerAssetCrudRoutes(app as any, () => workspace)

    const created = await call(handlers.get('POST /api/assets'), {
      body: {
        type: 'prompt',
        name: 'invalid prompt',
        data: { negative_prompt: 'missing content' },
      },
    })

    expect(created.statusCode).toBe(400)
    expect(created.body.error).toContain('content')
    expect(await readAssets(workspace)).toEqual([])
  })

  test('rejects invalid known asset data on versioned update without creating a new version', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [
      baseAsset({
        id: 1,
        name: 'image asset',
        type: 'image',
        data: { file_path: 'assets/image.png', width: 640, height: 480 },
        version: 1,
      }),
    ])
    const { registerAssetCrudRoutes } = await import('./assets-crud')
    const { app, handlers } = createRouteHarness()
    registerAssetCrudRoutes(app as any, () => workspace)

    const updated = await call(handlers.get('PUT /api/assets/:id'), {
      params: { id: '1' },
      body: { data: { width: 1024, height: 768 } },
    })

    expect(updated.statusCode).toBe(400)
    expect(updated.body.error).toContain('file_path')
    expect(await readAssets(workspace)).toHaveLength(1)
  })

  test('returns FastAPI-compatible detail field for validation and missing asset errors', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [
      baseAsset({ id: 1, name: 'prompt', type: 'prompt', data: { content: 'ok' } }),
    ])
    const { registerAssetCrudRoutes } = await import('./assets-crud')
    const { app, handlers } = createRouteHarness()
    registerAssetCrudRoutes(app as any, () => workspace)

    const invalidCreate = await call(handlers.get('POST /api/assets'), {
      body: {
        type: 'prompt',
        name: 'invalid prompt',
        data: { negative_prompt: 'missing content' },
      },
    })
    expect(invalidCreate.statusCode).toBe(400)
    expect(invalidCreate.body).toEqual({
      error: 'data.content is required',
      detail: 'data.content is required',
    })

    const missingGet = await call(handlers.get('GET /api/assets/:id'), { params: { id: '404' } })
    expect(missingGet.statusCode).toBe(404)
    expect(missingGet.body).toEqual({
      error: 'asset not found',
      detail: 'asset not found',
    })

    const missingPatch = await call(handlers.get('PATCH /api/assets/:id/project'), {
      params: { id: '404' },
      body: { project_id: 3 },
    })
    expect(missingPatch.statusCode).toBe(404)
    expect(missingPatch.body).toEqual({
      error: 'asset not found',
      detail: 'asset not found',
    })
  })

  test('removes local media files when deleting an asset', async () => {
    const workspace = await tempWorkspace()
    const mediaPath = join(workspace, 'assets', 'old.png')
    await mkdir(dirname(mediaPath), { recursive: true })
    await writeFile(mediaPath, 'old-image')
    await writeAssets(workspace, [
      baseAsset({
        id: 1,
        name: 'local image',
        type: 'image',
        data: { file_path: mediaPath },
      }),
    ])
    const { registerAssetCrudRoutes } = await import('./assets-crud')
    const { app, handlers } = createRouteHarness()
    registerAssetCrudRoutes(app as any, () => workspace)

    const response = await call(handlers.get('DELETE /api/assets/:id'), { params: { id: '1' } })

    expect(response.statusCode).toBe(204)
    expect(await readAssets(workspace)).toHaveLength(0)
    await expect(access(mediaPath)).rejects.toThrow()
  })

  test('removes upstream data assets media files when deleting a migrated asset', async () => {
    const workspace = await tempWorkspace()
    const mediaPath = join(workspace, 'data', 'assets', 'images', 'legacy.png')
    await mkdir(dirname(mediaPath), { recursive: true })
    await writeFile(mediaPath, 'legacy-image')
    await writeAssets(workspace, [
      baseAsset({
        id: 1,
        name: 'legacy image',
        type: 'image',
        data: { file_path: 'data/assets/images/legacy.png' },
      }),
    ])
    const { registerAssetCrudRoutes } = await import('./assets-crud')
    const { app, handlers } = createRouteHarness()
    registerAssetCrudRoutes(app as any, () => workspace)

    const response = await call(handlers.get('DELETE /api/assets/:id'), { params: { id: '1' } })

    expect(response.statusCode).toBe(204)
    expect(await readAssets(workspace)).toHaveLength(0)
    await expect(access(mediaPath)).rejects.toThrow()
  })

  test('removes local media files referenced only by top-level file_path', async () => {
    const workspace = await tempWorkspace()
    const mediaPath = join(workspace, 'assets', 'top-level-only.png')
    await mkdir(dirname(mediaPath), { recursive: true })
    await writeFile(mediaPath, 'top-level-image')
    await writeAssets(workspace, [
      baseAsset({
        id: 1,
        name: 'top-level image',
        type: 'image',
        data: { width: 320, height: 180 },
        file_path: mediaPath,
      } as any),
    ])
    const { registerAssetCrudRoutes } = await import('./assets-crud')
    const { app, handlers } = createRouteHarness()
    registerAssetCrudRoutes(app as any, () => workspace)

    const response = await call(handlers.get('DELETE /api/assets/:id'), { params: { id: '1' } })

    expect(response.statusCode).toBe(204)
    expect(await readAssets(workspace)).toHaveLength(0)
    await expect(access(mediaPath)).rejects.toThrow()
  })

  test('returns upstream delete status codes for removed and missing assets', async () => {
    const workspace = await tempWorkspace()
    await writeAssets(workspace, [
      baseAsset({ id: 1, name: 'deletable' }),
    ])
    const { registerAssetCrudRoutes } = await import('./assets-crud')
    const { app, handlers } = createRouteHarness()
    registerAssetCrudRoutes(app as any, () => workspace)
    const handler = handlers.get('DELETE /api/assets/:id')

    const removed = await call(handler, { params: { id: '1' } })
    const missing = await call(handler, { params: { id: '404' } })

    expect(removed.statusCode).toBe(204)
    expect(removed.body).toBeNull()
    expect(missing.statusCode).toBe(404)
    expect(missing.body.error).toContain('asset not found')
  })
})

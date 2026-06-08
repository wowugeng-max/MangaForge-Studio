import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { readProjects, writeProjects } from '../projects'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-projects-route-'))
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

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('project TS routes', () => {
  test('registers FastAPI-style trailing slash aliases for collection routes', async () => {
    const workspace = await tempWorkspace()
    const { registerProjectRoutes } = await import('./projects')
    const { app, handlers } = createRouteHarness()
    registerProjectRoutes(app as any, () => workspace)

    expect(handlers.has('GET /api/projects/')).toBe(true)
    expect(handlers.has('POST /api/projects/')).toBe(true)
  })

  test('registers FastAPI-style trailing slash aliases for project item routes', async () => {
    const workspace = await tempWorkspace()
    const { registerProjectRoutes } = await import('./projects')
    const { app, handlers } = createRouteHarness()
    registerProjectRoutes(app as any, () => workspace)

    expect(handlers.has('GET /api/projects/:id/')).toBe(true)
    expect(handlers.has('PUT /api/projects/:id/')).toBe(true)
    expect(handlers.has('DELETE /api/projects/:id/')).toBe(true)
  })

  test('lists projects with upstream skip and limit query semantics', async () => {
    const workspace = await tempWorkspace()
    await writeProjects(workspace, [
      { id: 1, name: 'one', updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 2, name: 'two', updated_at: '2026-01-02T00:00:00.000Z' },
      { id: 3, name: 'three', updated_at: '2026-01-03T00:00:00.000Z' },
    ])
    const { registerProjectRoutes } = await import('./projects')
    const { app, handlers } = createRouteHarness()
    registerProjectRoutes(app as any, () => workspace)

    const response = await call(handlers.get('GET /api/projects'), { query: { skip: '1', limit: '1' } })

    expect(Array.isArray(response.body)).toBe(true)
    expect(response.body.map((project: any) => project.id)).toEqual([2])
  })

  test('normalizes legacy project records when listing projects', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'projects.json'), JSON.stringify([
      { id: 1, name: 'legacy project', updated_at: '2026-01-01T00:00:00.000Z' },
    ]))
    const { registerProjectRoutes } = await import('./projects')
    const { app, handlers } = createRouteHarness()
    registerProjectRoutes(app as any, () => workspace)

    const response = await call(handlers.get('GET /api/projects'))

    expect(response.body).toEqual([
      {
        id: 1,
        name: 'legacy project',
        description: '',
        tags: [],
        canvas_data: {},
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ])
  })

  test('normalizes legacy camelCase canvasData when listing projects', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'projects.json'), JSON.stringify([
      { id: 1, name: 'camel project', canvasData: { nodes: [{ id: 'old-node' }], edges: [] }, updated_at: '2026-01-01T00:00:00.000Z' },
    ]))
    const { registerProjectRoutes } = await import('./projects')
    const { app, handlers } = createRouteHarness()
    registerProjectRoutes(app as any, () => workspace)

    const response = await call(handlers.get('GET /api/projects'))

    expect(response.body[0].canvas_data).toEqual({ nodes: [{ id: 'old-node' }], edges: [] })
  })

  test('creates and updates projects with canvas_data while preserving timestamps', async () => {
    const workspace = await tempWorkspace()
    const { registerProjectRoutes } = await import('./projects')
    const { app, handlers } = createRouteHarness()
    registerProjectRoutes(app as any, () => workspace)

    const created = await call(handlers.get('POST /api/projects'), {
      body: {
        name: 'comic project',
        description: 'visual workflow',
        tags: ['comic'],
        canvas_data: { nodes: [{ id: 'n1' }], edges: [] },
      },
    })
    expect(created.body).toMatchObject({
      id: 1,
      name: 'comic project',
      canvas_data: { nodes: [{ id: 'n1' }], edges: [] },
    })
    expect(typeof created.body.created_at).toBe('string')
    expect(typeof created.body.updated_at).toBe('string')

    const updated = await call(handlers.get('PUT /api/projects/:id'), {
      params: { id: '1' },
      body: { canvas_data: { nodes: [{ id: 'n2' }], edges: [{ id: 'e1' }] } },
    })
    expect(updated.body).toMatchObject({
      name: 'comic project',
      tags: ['comic'],
      canvas_data: { nodes: [{ id: 'n2' }], edges: [{ id: 'e1' }] },
    })
    expect(updated.body.created_at).toBe(created.body.created_at)
  })

  test('accepts camelCase canvasData when creating and updating projects', async () => {
    const workspace = await tempWorkspace()
    const { registerProjectRoutes } = await import('./projects')
    const { app, handlers } = createRouteHarness()
    registerProjectRoutes(app as any, () => workspace)

    const created = await call(handlers.get('POST /api/projects'), {
      body: {
        name: 'ts client project',
        canvasData: { nodes: [{ id: 'camel-create' }], edges: [] },
      },
    })

    expect(created.statusCode).toBe(200)
    expect(created.body.canvas_data).toEqual({ nodes: [{ id: 'camel-create' }], edges: [] })

    const updated = await call(handlers.get('PUT /api/projects/:id'), {
      params: { id: '1' },
      body: {
        canvasData: { nodes: [{ id: 'camel-update' }], edges: [{ id: 'edge-1' }] },
      },
    })

    expect(updated.statusCode).toBe(200)
    expect(updated.body.canvas_data).toEqual({
      nodes: [{ id: 'camel-update' }],
      edges: [{ id: 'edge-1' }],
    })
  })

  test('returns a bare project from the upstream get project route', async () => {
    const workspace = await tempWorkspace()
    await writeProjects(workspace, [
      { id: 3, name: 'detail project', description: 'single', tags: ['detail'], canvas_data: { nodes: [] }, updated_at: '2026-01-03T00:00:00.000Z' },
    ])
    const { registerProjectRoutes } = await import('./projects')
    const { app, handlers } = createRouteHarness()
    registerProjectRoutes(app as any, () => workspace)

    const response = await call(handlers.get('GET /api/projects/:id'), { params: { id: '3' } })

    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({
      id: 3,
      name: 'detail project',
      canvas_data: { nodes: [] },
    })
    expect(response.body.project).toBeUndefined()
  })

  test('deletes projects with upstream 204/404 semantics', async () => {
    const workspace = await tempWorkspace()
    await writeProjects(workspace, [
      { id: 1, name: 'keep', updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 2, name: 'delete', updated_at: '2026-01-02T00:00:00.000Z' },
    ])
    const { registerProjectRoutes } = await import('./projects')
    const { app, handlers } = createRouteHarness()
    registerProjectRoutes(app as any, () => workspace)

    const deleted = await call(handlers.get('DELETE /api/projects/:id'), { params: { id: '2' } })

    expect(deleted.statusCode).toBe(204)
    expect(deleted.body).toBeNull()
    expect((await readProjects(workspace)).map(project => project.id)).toEqual([1])

    const missing = await call(handlers.get('DELETE /api/projects/:id'), { params: { id: '404' } })
    expect(missing.statusCode).toBe(404)
    expect(missing.body.error).toContain('Project not found')
  })

  test('returns FastAPI-compatible detail field for missing project errors', async () => {
    const workspace = await tempWorkspace()
    await writeProjects(workspace, [
      { id: 1, name: 'keep', updated_at: '2026-01-01T00:00:00.000Z' },
    ])
    const { registerProjectRoutes } = await import('./projects')
    const { app, handlers } = createRouteHarness()
    registerProjectRoutes(app as any, () => workspace)

    const missingGet = await call(handlers.get('GET /api/projects/:id'), { params: { id: '404' } })
    expect(missingGet.statusCode).toBe(404)
    expect(missingGet.body).toEqual({
      error: 'project not found',
      detail: 'project not found',
    })

    const missingUpdate = await call(handlers.get('PUT /api/projects/:id'), {
      params: { id: '404' },
      body: { name: 'missing' },
    })
    expect(missingUpdate.statusCode).toBe(404)
    expect(missingUpdate.body).toEqual({
      error: 'project not found',
      detail: 'project not found',
    })

    const missingDelete = await call(handlers.get('DELETE /api/projects/:id'), { params: { id: '404' } })
    expect(missingDelete.statusCode).toBe(404)
    expect(missingDelete.body).toEqual({
      error: 'Project not found',
      detail: 'Project not found',
    })
  })
})

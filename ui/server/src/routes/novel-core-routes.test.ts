import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

let workspaces: string[] = []

async function tempDir(prefix: string) {
  const dir = await mkdtemp(join(tmpdir(), prefix))
  workspaces.push(dir)
  return dir
}

function createRouteHarness() {
  const handlers = new Map<string, any>()
  const app = {
    get: () => app,
    post: () => app,
    put: () => app,
    delete: (path: string, handler: any) => {
      handlers.set(path, handler)
      return app
    },
  }
  return { app, handlers }
}

async function callDeleteProject(handler: any, projectId: number) {
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
  }
  await handler({ params: { id: String(projectId) } }, res)
  return res
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('novel core project deletion', () => {
  test('purges memory palace data when deleting a novel project', async () => {
    const workspace = await tempDir('mangaforge-novel-route-')
    process.env.MEMPALACE_DIR = await tempDir('mangaforge-memory-route-')
    const { createNovelProject } = await import('../novel')
    const { listMemories, storeMemory } = await import('../memory-service')
    const { registerNovelCoreRoutes } = await import('./novel-core-routes')

    const project = await createNovelProject(workspace, { title: '待删除项目' })
    await storeMemory(project.id, '待删除项目的世界观记忆', 'world', ['test'])
    expect(await listMemories(project.id)).toHaveLength(1)

    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)
    const handler = handlers.get('/api/novel/projects/:id')
    if (!handler) throw new Error('delete project route not registered')

    const response = await callDeleteProject(handler, project.id)

    expect(response.statusCode).toBe(200)
    expect(await listMemories(project.id)).toHaveLength(0)
  })
})

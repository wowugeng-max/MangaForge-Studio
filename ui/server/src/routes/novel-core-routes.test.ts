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
    const memoryText = `待删除项目的世界观记忆-${Date.now()}`
    await storeMemory(project.id, memoryText, 'world', ['test'])
    expect((await listMemories(project.id)).some(memory => memory.content === memoryText)).toBe(true)

    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)
    const handler = handlers.get('/api/novel/projects/:id')
    if (!handler) throw new Error('delete project route not registered')

    const response = await callDeleteProject(handler, project.id)

    expect(response.statusCode).toBe(200)
    expect(await listMemories(project.id)).toHaveLength(0)
  })
})

describe('novel project seed prompt', () => {
  test('uses the selected length target to shape incubation decisions', async () => {
    const { buildProjectSeedPrompt } = await import('./novel-core-routes')

    const shortPrompt = buildProjectSeedPrompt('双主角规则怪谈', '规则测试', 'short')
    const epicPrompt = buildProjectSeedPrompt('双主角规则怪谈', '规则测试', 'epic')

    expect(shortPrompt).toContain('用户指定篇幅：short')
    expect(shortPrompt).toContain('不要强行扩展为多卷长篇')
    expect(epicPrompt).toContain('用户指定篇幅：epic')
    expect(epicPrompt).toContain('300万字以上')
    expect(epicPrompt).toContain('长期追读')
  })

  test('rejects sparse seeds that would render an empty deep draft review', async () => {
    const { hasUsableProjectSeed } = await import('./novel-core-routes')

    expect(hasUsableProjectSeed({
      title: '怪谈副本里，一个莽夫一个脑子',
      genre: '都市',
      length_target: 'epic',
    })).toBe(false)

    expect(hasUsableProjectSeed({
      title: '怪谈副本里，一个莽夫一个脑子',
      genre: '都市',
      synopsis: '双主角穿越原创规则怪谈世界，一个负责武力战斗和搞笑，一个负责破解规则。',
      worldbuilding: { world_summary: '灰域会把现实地点污染成怪谈副本。' },
      protagonist: { name: '林野', identity: '武力担当', goal: '打穿副本' },
      volume_outlines: [{ title: '午夜员工餐厅', summary: '建立双主角搭档模式' }],
      chapter_outlines: [{ chapter_no: 1, title: '午夜入职', summary: '读到第一份规则' }],
    })).toBe(true)
  })
})

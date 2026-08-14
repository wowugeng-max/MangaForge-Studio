import { describe, expect, test } from 'bun:test'
import { registerOhStoryCoreRoutes } from './novel-oh-story-core-routes'

function routeHarness(deps: Record<string, any> = {}) {
  const handlers = new Map<string, any>()
  const app: any = {}
  for (const method of ['get', 'put', 'post', 'delete']) {
    app[method] = (path: string, handler: any) => {
      handlers.set(`${method.toUpperCase()} ${path}`, handler)
      return app
    }
  }
  registerOhStoryCoreRoutes(app, {
    getWorkspace: () => '/tmp/oh-story-ws',
    getProject: async () => ({ id: 3, title: '怪谈世界' }),
    getChapter: async () => ({ id: 61, chapter_no: 1, chapter_text: '楚弦咽气的时候。' }),
    loadSuite: () => null,
    installSuite: async () => ({ revision: 'abc1234' }),
    runAction: async () => ({ changed: false }),
    ...deps,
  })
  return { app, handlers }
}

async function callRoute(handler: any, req: any = {}) {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) { this.statusCode = code; return this },
    json(body: any) { this.body = body; return this },
  }
  await handler(req, res)
  return res
}

const chapterBody = { body: { project_id: 3, chapter_id: 61 } }

describe('oh-story core routes', () => {
  test('GET core when missing returns installed false', async () => {
    const { handlers } = routeHarness({ loadSuite: () => null })
    const res = await callRoute(handlers.get('GET /api/novel/oh-story/core'))
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ ok: true, installed: false })
  })

  test('GET core when present returns revision and skills', async () => {
    const skills = {
      'story-review': { skill_markdown: '# review', references: [] },
      'story-deslop': { skill_markdown: '# deslop', references: [] },
    }
    const { handlers } = routeHarness({
      loadSuite: () => ({ revision: 'abc1234', skills }),
    })
    const res = await callRoute(handlers.get('GET /api/novel/oh-story/core'))
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      ok: true,
      installed: true,
      revision: 'abc1234',
      skills: ['story-review', 'story-deslop'],
    })
  })

  test('POST install calls installSuite and returns revision', async () => {
    const calls: string[] = []
    const { handlers } = routeHarness({
      getWorkspace: () => '/tmp/install-ws',
      installSuite: async (workspace: string) => {
        calls.push(workspace)
        return { revision: 'deadbeef' }
      },
      loadSuite: () => ({ revision: 'deadbeef', skills: {} }),
    })
    const res = await callRoute(handlers.get('POST /api/novel/oh-story/core/install'))
    expect(calls).toEqual(['/tmp/install-ws'])
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ ok: true, revision: 'deadbeef' })
  })

  test('POST review calls runAction with action review', async () => {
    const calls: any[] = []
    const project = { id: 3, title: '怪谈世界' }
    const chapter = { id: 61, chapter_no: 1, chapter_text: '楚弦咽气的时候。' }
    const { handlers } = routeHarness({
      getWorkspace: () => '/tmp/review-ws',
      getProject: async () => project,
      getChapter: async () => chapter,
      runAction: async (input: any) => {
        calls.push(input)
        return { changed: false, review_id: 9, report_text: '## 编辑审稿' }
      },
    })
    const res = await callRoute(handlers.get('POST /api/novel/oh-story/core/review'), chapterBody)
    expect(calls).toHaveLength(1)
    expect(calls[0].action).toBe('review')
    expect(calls[0].workspace).toBe('/tmp/review-ws')
    expect(calls[0].project).toEqual(project)
    expect(calls[0].chapter).toEqual(chapter)
    expect(res.statusCode).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.review_id).toBe(9)
  })

  test('POST review returns CHAPTER_NOT_FOUND when chapter is missing', async () => {
    const { handlers } = routeHarness({
      getChapter: async () => null,
      runAction: async () => { throw new Error('should not run') },
    })
    const res = await callRoute(handlers.get('POST /api/novel/oh-story/core/review'), chapterBody)
    expect([400, 404]).toContain(res.statusCode)
    expect(res.body.code).toBe('CHAPTER_NOT_FOUND')
  })

  test('POST review maps OH_STORY_CORE_NOT_INSTALLED from the runner', async () => {
    const { handlers } = routeHarness({
      runAction: async () => {
        throw Object.assign(new Error('oh-story core suite is not installed'), {
          code: 'OH_STORY_CORE_NOT_INSTALLED',
        })
      },
    })
    const res = await callRoute(handlers.get('POST /api/novel/oh-story/core/review'), chapterBody)
    expect([400, 404]).toContain(res.statusCode)
    expect(res.body.code).toBe('OH_STORY_CORE_NOT_INSTALLED')
  })

  test('POST deslop calls runAction with action deslop', async () => {
    const calls: any[] = []
    const { handlers } = routeHarness({
      runAction: async (input: any) => {
        calls.push(input)
        return { changed: true, chapter_text: '他点了根烟，没说话。' }
      },
    })
    const res = await callRoute(handlers.get('POST /api/novel/oh-story/core/deslop'), chapterBody)
    expect(calls).toHaveLength(1)
    expect(calls[0].action).toBe('deslop')
    expect(res.statusCode).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.changed).toBe(true)
  })

  test('does not register analyze, scan, or cover routes', () => {
    const { handlers } = routeHarness()
    const paths = [...handlers.keys()]
    expect(paths).toEqual([
      'GET /api/novel/oh-story/core',
      'POST /api/novel/oh-story/core/install',
      'POST /api/novel/oh-story/core/review',
      'POST /api/novel/oh-story/core/deslop',
    ])
    expect(paths.join('\n')).not.toMatch(/analyze|scan|cover/)
  })
})

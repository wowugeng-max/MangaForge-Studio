import { describe, expect, test } from 'bun:test'
import { readOhStoryCoreAgentResult, registerOhStoryCoreRoutes } from './novel-oh-story-core-routes'

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

  test('POST review returns CHAPTER_NOT_FOUND when chapter is missing', async () => {
    const { handlers } = routeHarness({
      getChapter: async () => null,
      createKernelJob: async () => { throw new Error('should not create job') },
    })
    const res = await callRoute(handlers.get('POST /api/novel/oh-story/core/review'), chapterBody)
    expect([400, 404]).toContain(res.statusCode)
    expect(res.body.code).toBe('CHAPTER_NOT_FOUND')
  })

  test('readOhStoryCoreAgentResult throws when the provider returned an error or empty body', () => {
    expect(() => readOhStoryCoreAgentResult({ content: '', error: 'Provider request failed 403' })).toThrow(/403/)
    expect(() => readOhStoryCoreAgentResult({ content: '' })).toThrow(/empty/i)
    expect(readOhStoryCoreAgentResult({ content: '他点了根烟，没说话。' })).toEqual({
      content: '他点了根烟，没说话。',
    })
  })

  test('does not register analyze, scan, or cover routes', () => {
    const { handlers } = routeHarness()
    const paths = [...handlers.keys()]
    expect(paths).toEqual([
      'GET /api/novel/oh-story/core',
      'POST /api/novel/oh-story/core/install',
      'POST /api/novel/oh-story/core/review',
      'POST /api/novel/oh-story/core/deslop',
      'POST /api/novel/oh-story/core/apply',
    ])
    expect(paths.join('\n')).not.toMatch(/analyze|scan|cover/)
  })
})

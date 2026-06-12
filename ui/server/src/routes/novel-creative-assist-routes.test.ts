import { describe, expect, test } from 'bun:test'
import { registerNovelCreativeAssistRoutes } from './novel-creative-assist-routes'

describe('novel creative assist routes', () => {
  function createRouteHarness() {
    const handlers = new Map<string, any>()
    const app = {
      post: (path: string, handler: any) => {
        handlers.set(path, handler)
        return app
      },
    }
    return { app, handlers }
  }

  async function callHandler(handler: any, body: any) {
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
    await handler({ params: { id: '1' }, body }, res)
    return res
  }

  function harnessWith(overrides: any = {}) {
    const { app, handlers } = createRouteHarness()
    const savedReviews: any[] = []
    registerNovelCreativeAssistRoutes(app as any, {
      getWorkspace: () => '/tmp/workspace',
      getProject: async () => ({
        id: 1,
        title: '规则夜航',
        genre: '无限流',
        reference_config: {
          writing_bible: {
            promise: '规则压力与破局爽点',
          },
        },
      }),
      listChapters: async () => [{
        id: 10,
        project_id: 1,
        chapter_no: 1,
        title: '第一夜',
        chapter_text: '门上的规则开始流血。',
        ending_hook: '第二条规则被撕掉。',
      }],
      listWorldbuilding: async () => [],
      listCharacters: async () => [{
        id: 2,
        name: '林昼',
        role: '主角',
        current_state: {
          identity: '新手闯关者',
        },
      }],
      listOutlines: async () => [{
        id: 3,
        title: '前十章',
        summary: '规则逐步升级',
      }],
      listReviews: async () => [],
      createReview: async (_workspace: string, record: any) => {
        savedReviews.push(record)
        return { id: savedReviews.length, ...record }
      },
      buildChapterContextPackage: async () => ({
        chapter_target: {
          chapter_no: 1,
          title: '第一夜',
          ending_hook: '第二条规则被撕掉。',
        },
        writing_bible: {
          promise: '规则压力与破局爽点',
        },
      }),
      executeNovelAgent: overrides.executeNovelAgent,
      fetchResearchText: overrides.fetchResearchText,
    })
    const handler = handlers.get('/api/novel/projects/:id/creative-assist')
    if (!handler) throw new Error('creative assist route not registered')
    return { handler, savedReviews }
  }

  test('rejects unknown mode', async () => {
    const { handler } = harnessWith()
    const res = await callHandler(handler, { mode: 'bad_mode' })

    expect(res.statusCode).toBe(400)
    expect(res.body.error).toContain('unsupported creative assist mode')
  })

  test('returns fallback cards for next chapter assistance', async () => {
    const { handler } = harnessWith()
    const res = await callHandler(handler, { mode: 'next_chapter', chapter_id: 10, save: false })

    expect(res.statusCode).toBe(200)
    expect(res.body.assist.mode).toBe('next_chapter')
    expect(res.body.assist.cards.length).toBeGreaterThan(0)
    expect(res.body.assist.context_status).toContain('chapter_context_ready')
  })

  test('persists creative assist review when save is true', async () => {
    const { handler, savedReviews } = harnessWith()
    const res = await callHandler(handler, { mode: 'prose_review', chapter_id: 10, save: true })

    expect(res.statusCode).toBe(200)
    expect(savedReviews).toHaveLength(1)
    expect(savedReviews[0].review_type).toBe('creative_assist')
    expect(savedReviews[0].payload).toContain('"mode":"prose_review"')
  })

  test('returns research warning when URL fetch fails', async () => {
    const { handler } = harnessWith({
      fetchResearchText: async () => {
        throw new Error('network blocked')
      },
    })
    const res = await callHandler(handler, {
      mode: 'research_cards',
      research_query: 'https://example.com',
      save: false,
    })

    expect(res.statusCode).toBe(200)
    expect(res.body.assist.warnings.join(' ')).toContain('network blocked')
    expect(res.body.assist.cards.length).toBeGreaterThan(0)
  })
})

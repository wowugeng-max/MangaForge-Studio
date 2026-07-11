import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createNovelChapter, createNovelProject, listNovelChapters } from '../novel'
import { registerNovelChapterContextRoutes } from './novel-chapter-context-routes'

function createRouteHarness() {
  const handlers = new Map<string, any>()
  const register = (method: string, path: string, handler: any) => {
    handlers.set(`${method} ${path}`, handler)
  }
  return {
    app: {
      get: (path: string, handler: any) => register('GET', path, handler),
      post: (path: string, handler: any) => register('POST', path, handler),
      put: (path: string, handler: any) => register('PUT', path, handler),
    },
    handlers,
  }
}

async function callRoute(handler: any, req: any) {
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
  await handler(req, res)
  return res
}

describe('novel chapter context repair', () => {
  test('builds a usable fallback character when model repair returns no character cards', async () => {
    const routes = await import('./novel-chapter-context-routes')
    const buildFallbackGeneratedCharacters = (routes as any).buildFallbackGeneratedCharacters

    expect(typeof buildFallbackGeneratedCharacters).toBe('function')

    const characters = buildFallbackGeneratedCharacters(
      { title: '九婴焚世', genre: '玄幻', synopsis: '丁松言进入一个以山海异兽为武学源头的大荒世界。' },
      {
        chapter_no: 1,
        title: '异象初临',
        chapter_goal: '让主角完成穿越后的环境重构认知。',
        chapter_summary: '丁松言穿越至丁家旁系弟子身上，首次确认世界规则。',
        conflict: '现实世界秩序与原身记忆冲突。',
        ending_hook: '门外传来不属于人的低语。',
      },
      { story_state: { global: {} } },
    )

    expect(characters.length).toBeGreaterThan(0)
    expect(characters[0].name).toBe('丁松言')
    expect(characters[0].role_type).toBe('protagonist')
    expect(characters[0].current_state).toMatchObject({
      location: '第1章《异象初临》开场',
      last_seen_chapter: 1,
    })
  })

  test('confirm returns the persisted pre-draft brief and persisted confirmation truth', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-pre-draft-confirm-'))
    try {
      const project = await createNovelProject(workspace, { title: '写前确认真值测试' })
      const chapter = await createNovelChapter(workspace, {
        project_id: project.id,
        chapter_no: 1,
        title: '第一章',
      })
      const oversizedContracts = Object.fromEntries(
        Array.from({ length: 44 }, (_, index) => [
          `extended_${index}_contract`,
          { rules: `第 ${index + 1} 份合同必须保留摘要。`.repeat(200) },
        ]),
      )
      const { app, handlers } = createRouteHarness()
      registerNovelChapterContextRoutes(app as any, {
        getWorkspace: () => workspace,
        getProject: async () => project,
        buildChapterContextPackage: async () => ({
          preflight: { ready: true, strict_ready: true, checks: [], warnings: [], blockers: [] },
          chapter_target: { chapter_no: 1, title: '第一章' },
        }),
      })
      const confirm = handlers.get('POST /api/novel/chapters/:chapterId/pre-draft-brief/confirm')

      const response = await callRoute(confirm, {
        params: { chapterId: String(chapter.id) },
        query: {},
        body: {
          project_id: project.id,
          brief: {
            ...oversizedContracts,
            confirmation_source: 'manual_author_confirmation',
          },
        },
      })
      const [storedChapter] = await listNovelChapters(workspace, project.id)
      const storedBrief = storedChapter.raw_payload.pre_draft_brief

      expect(response.statusCode).toBe(200)
      expect(response.body.brief).toEqual(storedBrief)
      expect(response.body.confirmed).toBe(Boolean(storedBrief.confirmed_at))
      expect(storedBrief.confirmed_at).toBeTruthy()
      expect(storedBrief.confirmation_source).toBe('manual_author_confirmation')
      expect(storedBrief.updated_at).toBeTruthy()
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
  })
})

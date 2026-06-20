import { describe, expect, test } from 'bun:test'

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
})

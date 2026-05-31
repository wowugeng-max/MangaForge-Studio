import { describe, expect, test } from 'bun:test'
import { buildChapterQualityCard } from './novel-editor-routes'

describe('buildChapterQualityCard', () => {
  test('marks a chapter below the configured word target as needing expansion', () => {
    const card = buildChapterQualityCard({
      id: 7,
      chapter_no: 3,
      title: '短章测试',
      chapter_goal: '完成一次规则冲突。',
      chapter_summary: '主角破解初始规则。',
      conflict: '规则即将惩罚主角。',
      ending_hook: '门后传来第二条规则。',
      chapter_text: '字'.repeat(1483),
      scene_breakdown: [{ scene_no: 1 }, { scene_no: 2 }],
    }, {
      chapter_target: {
        word_target: {
          mode: 'standard',
          label: '标准章',
          target: 3000,
          min: 2800,
          max: 3500,
          rangeText: '2800-3500 字',
        },
      },
      preflight: {
        checks: [
          { key: 'previous_continuity', ok: true },
          { key: 'characters', ok: true },
          { key: 'character_state', ok: true },
        ],
        warnings: [],
      },
      continuity: { previous_chapter: { chapter_no: 2 } },
      story_state: { characters: [{ name: '主角' }], global: {} },
    }, [])

    const wordTargetDimension = card.dimensions.find((item: any) => item.key === 'word_target')

    expect(card.word_count).toBe(1483)
    expect(wordTargetDimension?.score).toBeLessThan(65)
    expect(wordTargetDimension?.evidence).toContain('目标 2800-3500 字')
    expect(card.must_fix.some((item: string) => item.includes('扩写'))).toBe(true)
    expect(card.next_actions.some((item: string) => item.includes('目标字数'))).toBe(true)
  })
})

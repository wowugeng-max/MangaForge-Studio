import { describe, expect, test } from 'bun:test'
import {
  CREATIVE_ASSISTANT_MODES,
  buildCreativeAssistantContextChips,
  buildCreativeAssistantFallbackCards,
  normalizeCreativeAssistPayload,
} from './creativeAssistantModel'

describe('creativeAssistantModel', () => {
  test('defines all author assistance modes', () => {
    expect(CREATIVE_ASSISTANT_MODES.map(mode => mode.key)).toEqual([
      'prose_review',
      'next_chapter',
      'outline_expand',
      'foreshadowing',
      'character_arc',
      'system_design',
      'research_cards',
    ])
    expect(CREATIVE_ASSISTANT_MODES.map(mode => mode.label)).toContain('正文评析')
    expect(CREATIVE_ASSISTANT_MODES.map(mode => mode.label)).toContain('联网资料')
  })

  test('builds fallback cards for every mode', () => {
    for (const mode of CREATIVE_ASSISTANT_MODES) {
      const cards = buildCreativeAssistantFallbackCards(mode.key, {
        project: {
          title: '规则夜航',
          reference_config: {
            writing_bible: {
              promise: '规则压力',
            },
          },
        },
        activeChapter: {
          chapter_no: 1,
          title: '第一夜',
          chapter_text: '门上的规则开始流血。',
          ending_hook: '第二条规则被撕掉。',
        },
        characters: [{ name: '林昼' }],
        outlines: [{ title: '前十章' }],
        reviews: [],
      })
      expect(cards.length).toBeGreaterThan(0)
      expect(cards[0].id).toContain(mode.key)
    }
  })

  test('builds context chips from workspace state', () => {
    const chips = buildCreativeAssistantContextChips({
      activeChapter: { id: 1 },
      selectedText: '一段正文',
      project: {
        reference_config: {
          writing_bible: { promise: '承诺' },
          references: [{ project_title: '样本' }],
        },
      },
      contextPackage: { ok: true },
      reviews: [{ review_type: 'prose_quality' }],
    })

    expect(chips.map(chip => chip.label)).toEqual(['当前章', '选中文本', '写作圣经', '上下文包', '质检', '参考'])
  })

  test('normalizes backend cards with stable ids', () => {
    const normalized = normalizeCreativeAssistPayload({
      mode: 'prose_review',
      summary: '可加强开篇',
      cards: [{ title: '加强规则压力', suggestion: '先写违规后果' }],
    })

    expect(normalized.cards[0].id).toBe('prose_review-card-1')
    expect(normalized.cards[0].action).toBe('copy')
  })
})

import { describe, expect, test } from 'bun:test'
import {
  buildGenreProseCardContract,
  formatGenreProseCardPrompt,
  matchGenreProseCard,
} from './genre-prose-cards'
import { buildOutlineWordBudget, locateOutlineWordBudgetDebt } from './outline-word-budget'
import { buildStoryUnitCard } from './story-unit-basics'

describe('genre prose cards and p1 helpers', () => {
  test('matches horror rule card', () => {
    const card = matchGenreProseCard({ genre: '规则怪谈' })
    expect(card?.title).toBe('悬疑灵异')
    const contract = buildGenreProseCardContract({ genre: '规则怪谈' })
    expect(contract.matched).toBe(true)
    expect(formatGenreProseCardPrompt(contract)).toContain('题材散文卡')
    expect(contract.corpus_size).toBe(32)
  })

  test('returns unmatched for genres with no title/alias hit (confidence bonus is tie-break only)', () => {
    // #27: 高置信加分曾无条件执行，任何非空输入都会误配第一张高置信卡（传统玄幻）。
    for (const genre of ['田园种田日常', 'zzzz不存在的类型qqq', '美食探店随笔']) {
      expect(matchGenreProseCard({ genre })).toBeNull()
      const contract = buildGenreProseCardContract({ genre })
      expect(contract.matched).toBe(false)
      expect(contract.card).toBeNull()
    }
    // 空输入维持原行为
    expect(matchGenreProseCard({})).toBeNull()
    // 真命中仍然工作，且高置信卡在同分时仍胜出
    expect(matchGenreProseCard({ genre: '玄幻' })?.confidence).toBe('高')
  })

  test('builds outline word budget and locates dense debt', () => {
    const budget = buildOutlineWordBudget({
      chapter_word_target: 2000,
      points: [
        { label: '开篇', density_level: 'medium' },
        { label: '高潮打脸', density_level: 'dense' },
        { label: '过场', density_level: 'sparse' },
      ],
    })
    expect(budget.version).toBe('oh_story_outline_word_budget_v1')
    expect(budget.points.some((item: any) => item.density_level === 'dense')).toBe(true)
    const debt = locateOutlineWordBudgetDebt({ budget, actual_words: 1200 })
    expect(debt.underwritten.length).toBeGreaterThan(0)
  })

  test('builds unified story unit card', () => {
    const card = buildStoryUnitCard({
      unit_id: 'U12',
      title: '禁库夜闯',
      主推线: '信息线',
      对标剧情参照: '对标书第3单元',
      setup: '潜入',
      obstacle: '门禁',
      costChoice: '暴露',
      payoff: '名单半页',
    })
    expect(card.version).toBe('oh_story_story_unit_card_v1')
    expect(card.primary_push_line).toBe('信息线')
    expect(card.batch_boundary).toContain('一批')
  })
})

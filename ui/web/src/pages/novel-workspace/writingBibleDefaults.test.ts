import { describe, expect, test } from 'bun:test'
import {
  COMMERCIAL_WEB_NOVEL_STYLE_LOCK_DEFAULTS,
  mergeCommercialWebNovelStyleDefaults,
} from './writingBibleDefaults'

describe('writing bible default style lock', () => {
  test('fills blank style lock fields with commercial web novel defaults', () => {
    const styleLock = mergeCommercialWebNovelStyleDefaults({})

    expect(styleLock.narrative_person).toBe(COMMERCIAL_WEB_NOVEL_STYLE_LOCK_DEFAULTS.narrative_person)
    expect(styleLock.sentence_length).toContain('短中句')
    expect(styleLock.dialogue_ratio).toContain('35%-45%')
    expect(styleLock.payoff_density).toContain('800-1200字')
    expect(styleLock.description_density).toContain('低到中')
    expect(styleLock.chapter_word_range).toContain('2800-3500字')
    expect(styleLock.banned_words.length).toBeGreaterThan(3)
    expect(styleLock.preferred_words).toContain('爽点回收')
  })

  test('preserves creator edits while filling only missing fields', () => {
    const styleLock = mergeCommercialWebNovelStyleDefaults({
      narrative_person: '第一人称主视角',
      preferred_words: ['自定义口头禅'],
      payoff_density: '',
    })

    expect(styleLock.narrative_person).toBe('第一人称主视角')
    expect(styleLock.preferred_words).toEqual(['自定义口头禅'])
    expect(styleLock.payoff_density).toBe(COMMERCIAL_WEB_NOVEL_STYLE_LOCK_DEFAULTS.payoff_density)
  })
})

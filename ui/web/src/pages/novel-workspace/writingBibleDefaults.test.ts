import { describe, expect, test } from 'bun:test'
import {
  COMMERCIAL_WEB_NOVEL_STYLE_LOCK_DEFAULTS,
  COMMERCIAL_WEB_NOVEL_STYLE_SAMPLE_BANK_DEFAULTS,
  mergeCommercialWebNovelStyleDefaults,
  mergeCommercialWebNovelStyleSampleDefaults,
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

  test('provides abstract style sample defaults without source prose copying', () => {
    const samples = mergeCommercialWebNovelStyleSampleDefaults([])

    expect(samples.length).toBeGreaterThanOrEqual(3)
    expect(samples.map(sample => sample.sample_key)).toEqual(
      expect.arrayContaining(COMMERCIAL_WEB_NOVEL_STYLE_SAMPLE_BANK_DEFAULTS.map(sample => sample.sample_key)),
    )
    expect(samples[0].abstract_usage).toContain('只学习')
    expect(samples[0].unsafe_direct_phrases).toContain('原句不能照搬')
    expect(samples.every(sample => Array.isArray(sample.applicable_scenes) && sample.applicable_scenes.length > 0)).toBe(true)
    expect(samples.every(sample => Array.isArray(sample.avoid_scenes))).toBe(true)
    expect(samples.every(sample => sample.sample_text === undefined)).toBe(true)
  })

  test('preserves custom style samples and fills only an empty sample bank', () => {
    const custom = [{ sample_key: '作者自定义对白', scene_function: '双主角斗嘴推进信息差' }]

    expect(mergeCommercialWebNovelStyleSampleDefaults(custom)).toEqual(custom)
  })
})

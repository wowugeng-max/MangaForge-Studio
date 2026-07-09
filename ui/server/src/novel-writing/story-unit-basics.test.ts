import { describe, expect, test } from 'bun:test'
import {
  normalizeStoryUnitSyncBeat,
  storyUnitForbiddenTouched,
  storyUnitSyncBeatMatch,
} from './story-unit-basics'

describe('story unit basic sync checks', () => {
  test('normalizes story unit beats with default source and threshold', () => {
    expect(normalizeStoryUnitSyncBeat('entry_hook', '入口钩子', '  主角  进入旧祠堂  ')).toEqual({
      key: 'entry_hook',
      label: '入口钩子',
      text: '主角 进入旧祠堂',
      source: 'story_unit',
      threshold: 58,
    })

    expect(normalizeStoryUnitSyncBeat('entry_hook', '入口钩子', '')).toBeNull()
    expect(normalizeStoryUnitSyncBeat('entry_hook', '入口钩子', null)).toBeNull()
  })

  test('preserves custom story unit source and threshold', () => {
    expect(normalizeStoryUnitSyncBeat('setup_and_storyline_1', '伏笔/剧情线', '账册被换封皮', 'story_unit_setup', 48)).toEqual({
      key: 'setup_and_storyline_1',
      label: '伏笔/剧情线',
      text: '账册被换封皮',
      source: 'story_unit_setup',
      threshold: 48,
    })
  })

  test('checks story unit delivery against the beat threshold', () => {
    const delivered = storyUnitSyncBeatMatch(
      normalizeStoryUnitSyncBeat('current_chapter_role', '当前职责', '甲乙丙丁戊己庚辛壬癸子丑', 'story_unit', 42),
      '本章只落了甲乙x戊己y庚辛z子丑四个锚点。',
    )
    const missed = storyUnitSyncBeatMatch(
      normalizeStoryUnitSyncBeat('current_chapter_role', '当前职责', '甲乙丙丁戊己庚辛壬癸子丑', 'story_unit', 50),
      '本章只落了甲乙x戊己y庚辛z子丑四个锚点。',
    )

    expect(delivered.delivered).toBe(true)
    expect(delivered.evidence.length).toBeGreaterThan(0)
    expect(missed.score).toBeLessThan(50)
    expect(missed.delivered).toBe(false)
  })

  test('strips forbidden prefixes before checking whether the prose touched a rushed beat', () => {
    const touched = storyUnitForbiddenTouched(
      normalizeStoryUnitSyncBeat('forbidden_advance_1', '禁抢跑', '不得提前揭露黑账', 'story_unit_forbidden', 42),
      '这一章提前揭露黑账，让后段悬念被消费。',
    )
    const untouched = storyUnitForbiddenTouched(
      normalizeStoryUnitSyncBeat('forbidden_advance_2', '禁抢跑', '禁止公开最终证人', 'story_unit_forbidden', 42),
      '这一章只处理祠堂账册，没有触及后段证词。',
    )

    expect(touched.touched).toBe(true)
    expect(touched.score).toBe(100)
    expect(touched.evidence).toEqual(['提前揭露黑账'])
    expect(untouched.touched).toBe(false)
  })
})

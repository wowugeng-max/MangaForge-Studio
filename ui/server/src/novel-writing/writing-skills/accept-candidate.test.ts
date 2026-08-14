import { describe, expect, test } from 'bun:test'
import { acceptWritingSkillCandidate } from './accept-candidate'
import { countProseChars } from '../word-target'

const SOURCE_3500 = '林序沿着走廊往前走，纸条边角硌着手指。'.repeat(184)
const GROW_4300 = `${SOURCE_3500}${'他听见灯管又响了一下，没有回头。'.repeat(50)}`
const COLLAPSE_800 = '林序走了。他没有停。走廊空了。'.repeat(53)
const standard = { mode: 'standard' as const, target: 4200, min: 3780, max: 4620, label: '标准章', rangeText: '' }

describe('acceptWritingSkillCandidate', () => {
  test('accepts a 3500-to-4300 polish against the standard chapter target', () => {
    expect(countProseChars(SOURCE_3500)).toBeGreaterThanOrEqual(3400)
    expect(countProseChars(SOURCE_3500)).toBeLessThanOrEqual(3600)
    expect(countProseChars(GROW_4300)).toBeGreaterThanOrEqual(4200)
    expect(countProseChars(GROW_4300)).toBeLessThanOrEqual(4400)
    const gate = acceptWritingSkillCandidate({
      sourceText: SOURCE_3500,
      candidateText: GROW_4300,
      enabledIds: ['fiction-humanizer-zh'],
      wordTarget: standard,
    })
    expect(gate.accepted).toBe(true)
    expect(gate.text).toBe(GROW_4300.replace(/^\s+|\s+$/g, ''))
  })

  test('rejects an 800-char collapse of a 3500-char standard chapter', () => {
    expect(countProseChars(COLLAPSE_800)).toBeGreaterThanOrEqual(750)
    expect(countProseChars(COLLAPSE_800)).toBeLessThanOrEqual(850)
    const gate = acceptWritingSkillCandidate({
      sourceText: SOURCE_3500,
      candidateText: COLLAPSE_800,
      enabledIds: ['fiction-humanizer-zh'],
      wordTarget: standard,
    })
    expect(gate.accepted).toBe(false)
    expect(gate.text).toBe(SOURCE_3500)
    expect(gate.reason).toBe('writing_skill_length')
  })

  test('rejects a raw assistant wrapper before stripping it from valid-length prose', () => {
    const wrapped = `以下是改写后的正文：${SOURCE_3500}`
    const gate = acceptWritingSkillCandidate({
      sourceText: SOURCE_3500,
      candidateText: wrapped,
      enabledIds: ['fiction-humanizer-zh'],
      wordTarget: standard,
    })
    expect(gate.accepted).toBe(false)
    expect(gate.text).toBe(SOURCE_3500)
    expect(gate.reason).toBe('writing_skill_chat_shell')
  })

  test('rejects wrapper variants recognized by the shared stripping helper', () => {
    const wrapped = `修改后正文：${SOURCE_3500}`
    const gate = acceptWritingSkillCandidate({
      sourceText: SOURCE_3500,
      candidateText: wrapped,
      enabledIds: ['fiction-humanizer-zh'],
      wordTarget: standard,
    })
    expect(gate.accepted).toBe(false)
    expect(gate.text).toBe(SOURCE_3500)
    expect(gate.reason).toBe('writing_skill_chat_shell')
  })

  test('rejects author-soul leakage only when humanizer-zh is enabled', () => {
    const leaked = `${SOURCE_3500}我真的不知道该怎么看待。`
    const withSafety = acceptWritingSkillCandidate({
      sourceText: SOURCE_3500,
      candidateText: leaked,
      enabledIds: ['humanizer-zh'],
      wordTarget: standard,
    })
    expect(withSafety.accepted).toBe(false)
    expect(withSafety.reason).toBe('writing_skill_author_soul')

    const withoutSafety = acceptWritingSkillCandidate({
      sourceText: SOURCE_3500,
      candidateText: leaked,
      enabledIds: ['fiction-humanizer-zh'],
      wordTarget: standard,
    })
    expect(withoutSafety.accepted).toBe(true)
  })

  test('rejects a newly added soul marker even when the source has another marker', () => {
    const sourceWithSoul = `${SOURCE_3500}作为作者`
    const leaked = `${sourceWithSoul}我真的不知道该怎么看待。`
    const withSafety = acceptWritingSkillCandidate({
      sourceText: sourceWithSoul,
      candidateText: leaked,
      enabledIds: ['humanizer-zh'],
      wordTarget: standard,
    })
    expect(withSafety.accepted).toBe(false)
    expect(withSafety.text).toBe(sourceWithSoul)
    expect(withSafety.reason).toBe('writing_skill_author_soul')

    const withoutSafety = acceptWritingSkillCandidate({
      sourceText: sourceWithSoul,
      candidateText: leaked,
      enabledIds: ['fiction-humanizer-zh'],
      wordTarget: standard,
    })
    expect(withoutSafety.accepted).toBe(true)
  })
})

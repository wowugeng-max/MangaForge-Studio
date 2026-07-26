import { describe, expect, test } from 'vitest'
import {
  CANONICAL_NAME_GUARD_VERSION,
  collectCanonCharacterNames,
  isNearMissPersonName,
  repairCanonicalNameNearMisses,
  applyCanonicalNameGuard,
} from './canonical-name-guard'

describe('canonical name guard', () => {
  test('version + near-miss detection', () => {
    expect(CANONICAL_NAME_GUARD_VERSION).toContain('canonical_name_guard')
    expect(isNearMissPersonName('林序', '林晓')).toBe(true)
    expect(isNearMissPersonName('林序', '林序')).toBe(false)
    expect(isNearMissPersonName('林序', '李序')).toBe(false)
  })

  test('collects protagonist names from character cards', () => {
    const names = collectCanonCharacterNames({
      characters: [{ name: '林序', role_type: 'protagonist' }, { name: '规则仲裁者', role_type: 'antagonist' }],
    })
    expect(names).toContain('林序')
  })

  test('repairs rare near-miss slips without touching stable multi-mention names', () => {
    const text = [
      '林序把纸条按实。',
      '林晓没抬头。',
      '林序继续往前走。',
      '林序在门口停了一下。',
    ].join('\n\n')
    const result = repairCanonicalNameNearMisses(text, ['林序'])
    expect(result.report.changed).toBe(true)
    expect(result.text).not.toContain('林晓')
    expect(result.text.match(/林序/g)?.length).toBeGreaterThanOrEqual(4)
    expect(result.report.repairs[0]).toMatchObject({ from: '林晓', to: '林序' })
  })

  test('never renames one canon character into another canon character', () => {
    const text = [
      '苏晨推开门。',
      '苏晨看向床边。',
      '苏辰还在昏睡。',
      '苏晨叹了口气。',
    ].join('\n\n')
    const result = repairCanonicalNameNearMisses(text, ['苏晨', '苏辰'])
    expect(result.report.repairs).toEqual([])
    expect(result.report.changed).toBe(false)
    expect(result.text).toContain('苏辰还在昏睡')
    expect(result.text).toBe(text)
  })

  test('does not rename frequent alternate cast names', () => {
    const text = [
      '林序站在门口。',
      '林晓也站在门口。',
      '林晓又说了一句。',
      '林晓把灯打开。',
    ].join('\n\n')
    const result = repairCanonicalNameNearMisses(text, ['林序'])
    // candidate 林晓 appears 3 times (>2) so leave it
    expect(result.text).toContain('林晓')
  })

  test('leaves a longer un-carded name intact when the candidate only appears inside it', () => {
    const text = [
      '林序把纸条按实。',
      '林序继续往前走。',
      '林晚秋端着药碗进来。',
      '林序在门口停了一下。',
    ].join('\n\n')
    const result = repairCanonicalNameNearMisses(text, ['林序'])
    expect(result.report.repairs).toEqual([])
    expect(result.text).not.toContain('林序秋')
    expect(result.text).toContain('林晚秋端着药碗进来')
    expect(result.text).toBe(text)
  })

  test('applyCanonicalNameGuard end-to-end with project characters', () => {
    const text = '林序先推门。\n\n林晓跟着。\n\n林序没回头。'
    const out = applyCanonicalNameGuard(text, {
      characters: [{ name: '林序', role: 'protagonist' }],
    })
    expect(out.text).not.toContain('林晓')
    expect(out.report.changed).toBe(true)
  })
})

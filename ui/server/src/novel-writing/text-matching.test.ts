import { describe, expect, test } from 'bun:test'
import {
  anchorMatchScore,
  anchorTerms,
  normalizedMatchText,
} from './text-matching'

describe('novel writing text matching utilities', () => {
  test('normalizes punctuation whitespace and case for anchor matching', () => {
    expect(normalizedMatchText(' 血契-封条，“OPEN”！ ')).toBe('血契封条open')
  })

  test('returns exact-match score with compact matched evidence', () => {
    const expected = '血契封条揭开祠堂地砖下的账本缺口，逼出第二枚血契编号。'
    const match = anchorMatchScore(expected, `众人退开。${expected}林青禾记下红印。`)

    expect(match.score).toBe(100)
    expect(match.total).toBe(1)
    expect(match.matched).toEqual(['血契封条揭开祠堂地砖下的账本缺口，逼出第二枚血契编号。'.slice(0, 40)])
  })

  test('scores partial CJK and latin anchor term overlap', () => {
    const match = anchorMatchScore('blood-contract 血契封条 指向祠堂地砖', 'Blood contract 被重新按上，血契红印指向祠堂。')

    expect(match.score).toBeGreaterThan(0)
    expect(match.score).toBeLessThan(100)
    expect(match.matched).toEqual(expect.arrayContaining(['blood', 'contract', '血契', '祠堂']))
  })

  test('extracts reusable latin and CJK anchor terms', () => {
    expect(anchorTerms('blood-contract 血契封条')).toEqual(expect.arrayContaining(['blood', 'contract', '血契', '契封', '封条']))
  })

  test('respects tail-only matching scope', () => {
    const earlyOnly = `血契封条打开了暗格。${'旁观者沉默。'.repeat(300)}章尾只剩空厅。`

    expect(anchorMatchScore('血契封条打开暗格', earlyOnly).score).toBeGreaterThan(0)
    expect(anchorMatchScore('血契封条打开暗格', earlyOnly, { tailOnly: true }).score).toBe(0)
  })

  test('uses neutral score when the expected anchor is empty', () => {
    expect(anchorMatchScore('', '正文').score).toBe(55)
    expect(anchorMatchScore(null, '正文').matched).toEqual([])
  })
})

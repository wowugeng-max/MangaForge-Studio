import { describe, expect, test } from 'bun:test'
import { parseWriteContinueParams, writeContinueWindow } from './write-continue-params'

describe('parseWriteContinueParams', () => {
  test('rejects missing from, from 0, count 4, and count 1.5', () => {
    expect(parseWriteContinueParams({}).ok).toBe(false)
    expect(parseWriteContinueParams({ from_chapter_no: 0 }).ok).toBe(false)
    expect(parseWriteContinueParams({ from_chapter_no: 2, count: 4 }).ok).toBe(false)
    expect(parseWriteContinueParams({ from_chapter_no: 2, count: 1.5 }).ok).toBe(false)
  })

  test('defaults omitted count to 2', () => {
    expect(parseWriteContinueParams({ from_chapter_no: 2 })).toEqual({
      ok: true,
      value: { from_chapter_no: 2, count: 2 },
    })
  })
})

describe('writeContinueWindow', () => {
  test('returns consecutive chapter numbers from from+count', () => {
    expect(writeContinueWindow(2, 2)).toEqual([2, 3])
  })
})

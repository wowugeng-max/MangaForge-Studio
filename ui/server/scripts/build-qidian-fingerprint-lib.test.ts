import { describe, expect, test } from 'bun:test'
import {
  extractCatIdFromCategoryUrl,
  recordsFromCategoryListPayload,
  existingBookIdsFromCatalog,
  resolveFingerprintLibPaths,
} from './build-qidian-fingerprint-lib'

describe('extractCatIdFromCategoryUrl', () => {
  test('reads catid and numeric category paths', () => {
    expect(extractCatIdFromCategoryUrl('https://m.qidian.com/category/catid6')).toBe('6')
    expect(extractCatIdFromCategoryUrl('https://m.qidian.com/category/4/')).toBe('4')
    expect(extractCatIdFromCategoryUrl('https://m.qidian.com/rank/yuepiao/')).toBeNull()
  })
})

describe('recordsFromCategoryListPayload', () => {
  test('reads the mobile list envelope used by /webcommon/category/list', () => {
    const parsed = recordsFromCategoryListPayload({
      code: 0,
      data: {
        isLast: 0,
        records: [{ bid: 1, bName: '甲' }, { bid: 2, bName: '乙' }],
      },
    })
    expect(parsed.isLast).toBe(false)
    expect(parsed.records.map((row: any) => row.bid)).toEqual([1, 2])
  })

  test('treats an empty page as last', () => {
    expect(recordsFromCategoryListPayload({ data: { records: [], isLast: 0 } }).isLast).toBe(true)
  })
})

describe('existingBookIdsFromCatalog', () => {
  test('collects book ids from the samples catalog', () => {
    const ids = existingBookIdsFromCatalog({
      a: { book_id: '104' },
      b: { book_id: '105' },
      c: { book_id: '' },
    })
    expect([...ids].sort()).toEqual(['104', '105'])
  })
})

describe('resolveFingerprintLibPaths', () => {
  test('honors FINGERPRINT_LIB_ROOT and FINGERPRINT_WORKSPACE', () => {
    const resolved = resolveFingerprintLibPaths({
      FINGERPRINT_WORKSPACE: '/tmp/ws',
      FINGERPRINT_LIB_ROOT: '/tmp/ws/fingerprint-lib',
    } as NodeJS.ProcessEnv)
    expect(resolved.workspace).toBe('/tmp/ws')
    expect(resolved.lib).toBe('/tmp/ws/fingerprint-lib')
  })
})

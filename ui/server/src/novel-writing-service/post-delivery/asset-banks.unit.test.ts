import { describe, expect, test } from 'bun:test'
import { normalizeDiscoveredAssets, normalizeMemeBank, normalizeStyleSampleBank } from './asset-banks'

describe('normalizeDiscoveredAssets', () => {
  test('keeps novel character and setting candidates with names', () => {
    const rows = normalizeDiscoveredAssets([
      { name: '江哲', entity_type: 'character' },
      { name: '', entity_type: 'character' },
      { name: '镇门', entity_type: 'location' },
    ])
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: '江哲', entity_type: 'character' }),
      expect.objectContaining({ name: '镇门', entity_type: 'location' }),
    ]))
    expect(rows).toHaveLength(2)
  })
})

describe('normalizeMemeBank', () => {
  test('normalizes raw meme rows', () => {
    const rows = normalizeMemeBank([{ meme: '打脸反转', text: '打脸反转', label: '打脸反转' }])
    expect(Array.isArray(rows)).toBe(true)
  })
})

describe('normalizeStyleSampleBank', () => {
  test('accepts sample bank rows', () => {
    const rows = normalizeStyleSampleBank([{ title: '样章A', sample_text: '动作推进。' }])
    expect(Array.isArray(rows)).toBe(true)
  })
})

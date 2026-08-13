import { describe, expect, test } from 'bun:test'
import { resolveAbsoluteMediaUrl } from './copyContent'

describe('resolveAbsoluteMediaUrl', () => {
  test('keeps absolute http urls unchanged', () => {
    expect(resolveAbsoluteMediaUrl('http://localhost:8787/api/assets/media/a.png', 'http://localhost:5173/'))
      .toBe('http://localhost:8787/api/assets/media/a.png')
  })
  test('resolves relative api paths against the page origin', () => {
    expect(resolveAbsoluteMediaUrl('/api/assets/media/a.png', 'http://localhost:5173/canvas/1'))
      .toBe('http://localhost:5173/api/assets/media/a.png')
  })
  test('returns input when it cannot be resolved', () => {
    expect(resolveAbsoluteMediaUrl('not a url', undefined)).toBe('not a url')
  })
})

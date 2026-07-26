import { describe, expect, test } from 'bun:test'
import { hexToRgba } from './color'

describe('hexToRgba', () => {
  test('expands 3-digit hex correctly', () => {
    expect(hexToRgba('#f00', 0.5)).toBe('rgba(255,0,0,0.5)')
    expect(hexToRgba('#0af', 1)).toBe('rgba(0,170,255,1)')
  })
  test('parses 6-digit hex', () => {
    expect(hexToRgba('#0ea5e9', 0.2)).toBe('rgba(14,165,233,0.2)')
  })
  test('falls back to white for invalid input', () => {
    expect(hexToRgba('not-a-color', 0.3)).toBe('rgba(255, 255, 255, 0.3)')
  })
})

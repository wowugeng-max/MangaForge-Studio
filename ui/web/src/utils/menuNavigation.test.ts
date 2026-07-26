import { describe, expect, test } from 'bun:test'
import { moveMenuHighlight } from './menuNavigation'

describe('moveMenuHighlight', () => {
  test('wraps around both directions', () => {
    expect(moveMenuHighlight(0, 1, 4)).toBe(1)
    expect(moveMenuHighlight(3, 1, 4)).toBe(0)
    expect(moveMenuHighlight(0, -1, 4)).toBe(3)
  })
  test('empty list stays at 0', () => {
    expect(moveMenuHighlight(2, 1, 0)).toBe(0)
  })
})

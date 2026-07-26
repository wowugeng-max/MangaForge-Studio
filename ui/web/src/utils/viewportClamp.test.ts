import { describe, expect, test } from 'bun:test'
import { clampToViewport } from './viewportClamp'

describe('clampToViewport', () => {
  test('keeps menu fully inside on right/bottom overflow', () => {
    expect(clampToViewport({ x: 1200, y: 700, width: 300, height: 380, viewportWidth: 1280, viewportHeight: 720 }))
      .toEqual({ x: 1280 - 300 - 8, y: 720 - 380 - 8 })
  })
  test('keeps margin on left/top overflow', () => {
    expect(clampToViewport({ x: -50, y: -10, width: 300, height: 380, viewportWidth: 1280, viewportHeight: 720 }))
      .toEqual({ x: 8, y: 8 })
  })
  test('passes through when already inside', () => {
    expect(clampToViewport({ x: 200, y: 100, width: 300, height: 380, viewportWidth: 1280, viewportHeight: 720 }))
      .toEqual({ x: 200, y: 100 })
  })
})

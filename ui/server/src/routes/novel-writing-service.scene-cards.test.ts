import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into:
// - novel-writing-service.scene-cards.a.test.ts
// - novel-writing-service.scene-cards.b.test.ts

describe('novel-writing-service.scene-cards.test.ts monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.scene-cards.a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.scene-cards.b.test.ts'))).toBe(true)
  })
})

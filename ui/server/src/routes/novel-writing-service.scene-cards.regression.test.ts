import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into:
// - novel-writing-service.scene-cards.regression-a.test.ts
// - novel-writing-service.scene-cards.regression-b.test.ts

describe('scene-cards.regression monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.scene-cards.regression-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.scene-cards.regression-b.test.ts'))).toBe(true)
  })
})

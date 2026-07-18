import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into:
// - novel-writing-service.chapter-context.word-target-a.test.ts
// - novel-writing-service.chapter-context.word-target-b.test.ts

describe('chapter-context.word-target monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.chapter-context.word-target-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.chapter-context.word-target-b.test.ts'))).toBe(true)
  })
})

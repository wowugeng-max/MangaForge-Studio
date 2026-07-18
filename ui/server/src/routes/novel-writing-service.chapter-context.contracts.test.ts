import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into novel-writing-service.chapter-context.contracts-a.test.ts / novel-writing-service.chapter-context.contracts-b.test.ts

describe('chapter context contracts monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.chapter-context.contracts-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.chapter-context.contracts-b.test.ts'))).toBe(true)
  })
})

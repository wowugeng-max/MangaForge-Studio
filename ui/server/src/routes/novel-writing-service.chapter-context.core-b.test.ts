import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into novel-writing-service.chapter-context.core-b-1.test.ts / novel-writing-service.chapter-context.core-b-2.test.ts

describe('chapter context word target source guards monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.chapter-context.core-b-1.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.chapter-context.core-b-2.test.ts'))).toBe(true)
  })
})

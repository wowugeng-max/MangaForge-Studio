import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into:
// - novel-writing-service.prose-word-target.admission-a.test.ts
// - novel-writing-service.prose-word-target.admission-b.test.ts

describe('prose-word-target.admission monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.prose-word-target.admission-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.prose-word-target.admission-b.test.ts'))).toBe(true)
  })
})

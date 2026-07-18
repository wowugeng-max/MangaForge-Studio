import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into:
// - novel-writing-service.prose-word-target.pipeline-a.test.ts
// - novel-writing-service.prose-word-target.pipeline-b.test.ts

describe('prose-word-target.pipeline monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.prose-word-target.pipeline-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.prose-word-target.pipeline-b.test.ts'))).toBe(true)
  })
})

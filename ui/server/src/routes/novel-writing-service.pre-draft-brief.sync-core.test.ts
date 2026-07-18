import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into:
// - novel-writing-service.pre-draft-brief.sync-core-a.test.ts
// - novel-writing-service.pre-draft-brief.sync-core-b.test.ts

describe('novel-writing-service.pre-draft-brief.sync-core.test monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.pre-draft-brief.sync-core-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.pre-draft-brief.sync-core-b.test.ts'))).toBe(true)
  })
})

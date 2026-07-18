import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into:
// - novel-writing-service.storyline-sync-a.test.ts
// - novel-writing-service.storyline-sync-b.test.ts

describe('novel-writing-service.storyline-sync.test monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.storyline-sync-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.storyline-sync-b.test.ts'))).toBe(true)
  })
})

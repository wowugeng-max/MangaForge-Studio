import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into:
// - novel-production-service.behavior-a.test.ts
// - novel-production-service.behavior-b.test.ts

describe('novel-production-service.behavior.test monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'novel-production-service.behavior-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'novel-production-service.behavior-b.test.ts'))).toBe(true)
  })
})

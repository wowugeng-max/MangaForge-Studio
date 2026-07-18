import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into novel-writing-service.quality-wiring-a.test.ts / novel-writing-service.quality-wiring-b.test.ts

describe('novel writing service prose quality wiring monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.quality-wiring-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.quality-wiring-b.test.ts'))).toBe(true)
  })
})

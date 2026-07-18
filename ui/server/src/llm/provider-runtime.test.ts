import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into provider-runtime-a / provider-runtime-b

describe('codex responses provider runtime monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'provider-runtime-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'provider-runtime-b.test.ts'))).toBe(true)
  })
})

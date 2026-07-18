import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into adapter-a / adapter-b

describe('adapter monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'adapter-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'adapter-b.test.ts'))).toBe(true)
  })
})

import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into:
// - director-model.a.test.ts
// - director-model.b.test.ts

describe('director-model monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'director-model.a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'director-model.b.test.ts'))).toBe(true)
  })
})

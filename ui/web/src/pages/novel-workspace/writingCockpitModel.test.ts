import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into:
// - writingCockpitModel.core-a.test.ts
// - writingCockpitModel.core-b.test.ts

describe('writingCockpitModel monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'writingCockpitModel.core-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'writingCockpitModel.core-b.test.ts'))).toBe(true)
  })
})

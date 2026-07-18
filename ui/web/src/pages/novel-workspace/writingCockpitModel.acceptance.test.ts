import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into:
// - writingCockpitModel.acceptance-a.test.ts
// - writingCockpitModel.acceptance-b.test.ts

describe('writingCockpitModel.acceptance monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'writingCockpitModel.acceptance-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'writingCockpitModel.acceptance-b.test.ts'))).toBe(true)
  })
})

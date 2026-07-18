import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into expansion-default-lane-a / expansion-default-lane-b

describe('buildAutoCreationDirectorModel expansion/default-lane monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'director-model.expansion-default-lane-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'director-model.expansion-default-lane-b.test.ts'))).toBe(true)
  })
})

import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into director-model.b-1.test.ts / director-model.b-2.test.ts

describe('buildAutoCreationDirectorModel b monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'director-model.b-1.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'director-model.b-2.test.ts'))).toBe(true)
  })
})

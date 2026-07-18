import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into receipts-gates-a / receipts-gates-b

describe('buildAutoCreationDirectorModel receipts/gates monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'director-model.receipts-gates-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'director-model.receipts-gates-b.test.ts'))).toBe(true)
  })
})

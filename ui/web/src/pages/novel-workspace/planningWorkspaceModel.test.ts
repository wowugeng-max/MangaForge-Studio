import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into:
// - planningWorkspaceModel.a.test.ts
// - planningWorkspaceModel.b.test.ts

describe('planningWorkspaceModel.test monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'planningWorkspaceModel.a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'planningWorkspaceModel.b.test.ts'))).toBe(true)
  })
})

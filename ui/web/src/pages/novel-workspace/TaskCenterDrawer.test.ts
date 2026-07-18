import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into:
// - TaskCenterDrawer.core.test.ts
// - TaskCenterDrawer.repair-tags-recovery.test.ts

describe('TaskCenterDrawer.test.ts monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'TaskCenterDrawer.core.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'TaskCenterDrawer.repair-tags-recovery.test.ts'))).toBe(true)
  })
})

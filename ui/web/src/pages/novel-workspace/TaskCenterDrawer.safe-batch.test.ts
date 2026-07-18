import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into:
// - TaskCenterDrawer.safe-batch-a.test.ts
// - TaskCenterDrawer.safe-batch-b.test.ts

describe('TaskCenterDrawer.safe-batch monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'TaskCenterDrawer.safe-batch-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'TaskCenterDrawer.safe-batch-b.test.ts'))).toBe(true)
  })
})

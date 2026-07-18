import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into:
// - novel-writing-service.pre-draft-brief.sync-receipts-a.test.ts
// - novel-writing-service.pre-draft-brief.sync-receipts-b.test.ts

describe('chapter pre-draft brief sync-receipts monotest shim', () => {
  test('focused sync-receipts suites exist', () => {
    const dir = import.meta.dir
    expect(existsSync(join(dir, 'novel-writing-service.pre-draft-brief.sync-receipts-a.test.ts'))).toBe(true)
    expect(existsSync(join(dir, 'novel-writing-service.pre-draft-brief.sync-receipts-b.test.ts'))).toBe(true)
  })
})

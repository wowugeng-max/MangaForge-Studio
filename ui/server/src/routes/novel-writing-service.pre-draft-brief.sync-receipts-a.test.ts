import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into novel-writing-service.pre-draft-brief.sync-receipts-a-1.test.ts / novel-writing-service.pre-draft-brief.sync-receipts-a-2.test.ts

describe('chapter pre-draft brief sync-receipts a monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.pre-draft-brief.sync-receipts-a-1.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.pre-draft-brief.sync-receipts-a-2.test.ts'))).toBe(true)
  })
})

import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into focused suites:
// - novel-writing-service.pre-draft-brief.core-a.test.ts
// - novel-writing-service.pre-draft-brief.core-b.test.ts
// - plus existing pipeline/sync-* slices

describe('chapter pre-draft brief monotest shim', () => {
  test('focused pre-draft brief suites exist', () => {
    const dir = import.meta.dir
    for (const name of [
      'novel-writing-service.pre-draft-brief.core-a.test.ts',
      'novel-writing-service.pre-draft-brief.core-b.test.ts',
      'novel-writing-service.pre-draft-brief.pipeline-a.test.ts',
      'novel-writing-service.pre-draft-brief.pipeline-b.test.ts',
      'novel-writing-service.pre-draft-brief.sync-receipts-a.test.ts',
      'novel-writing-service.pre-draft-brief.sync-receipts-b.test.ts',
    ]) {
      expect(existsSync(join(dir, name))).toBe(true)
    }
  })
})

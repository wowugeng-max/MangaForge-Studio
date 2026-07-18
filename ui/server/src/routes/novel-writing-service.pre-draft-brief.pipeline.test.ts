import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into:
// - novel-writing-service.pre-draft-brief.pipeline-a.test.ts
// - novel-writing-service.pre-draft-brief.pipeline-b.test.ts

describe('chapter pre-draft brief pipeline monotest shim', () => {
  test('focused pipeline suites exist', () => {
    const dir = import.meta.dir
    expect(existsSync(join(dir, 'novel-writing-service.pre-draft-brief.pipeline-a.test.ts'))).toBe(true)
    expect(existsSync(join(dir, 'novel-writing-service.pre-draft-brief.pipeline-b.test.ts'))).toBe(true)
  })
})

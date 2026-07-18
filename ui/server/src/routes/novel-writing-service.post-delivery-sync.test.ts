import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into post-delivery-sync-a / post-delivery-sync-b

describe('post-delivery-sync monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.post-delivery-sync-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.post-delivery-sync-b.test.ts'))).toBe(true)
  })
})

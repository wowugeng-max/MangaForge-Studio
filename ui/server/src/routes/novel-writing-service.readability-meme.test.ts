import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into novel-writing-service.readability-meme-a.test.ts / novel-writing-service.readability-meme-b.test.ts

describe('readability meme monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.readability-meme-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.readability-meme-b.test.ts'))).toBe(true)
  })
})

import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into novel-writing-service.scene-cards.contracts-a.test.ts / novel-writing-service.scene-cards.contracts-b.test.ts

describe('normalizeSceneCardsPayload contracts monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.scene-cards.contracts-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.scene-cards.contracts-b.test.ts'))).toBe(true)
  })
})

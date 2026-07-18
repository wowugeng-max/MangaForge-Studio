import { describe, expect, test } from 'bun:test'
import { existsSync } from 'fs'
import { join } from 'path'

// Split into novel-writing-service.scene-cards.handoff-a.test.ts / novel-writing-service.scene-cards.handoff-b.test.ts

describe('normalizeSceneCardsPayload handoff monotest shim', () => {
  test('focused suites exist', () => {
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.scene-cards.handoff-a.test.ts'))).toBe(true)
    expect(existsSync(join(import.meta.dir, 'novel-writing-service.scene-cards.handoff-b.test.ts'))).toBe(true)
  })
})

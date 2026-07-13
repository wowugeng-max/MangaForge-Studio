import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('prose candidate continuity wiring', () => {
  test('guards editor, meme polish, and quality revision replacements with the shared continuity-safe selector', () => {
    const routeSource = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')
    const qualityLoopSource = readFileSync(join(import.meta.dir, '../novel-writing/prose-quality-loop.ts'), 'utf8')
    const sharedSelector = 'selectContinuitySafeProseCandidate'

    expect(routeSource).toContain(sharedSelector)
    expect(routeSource.match(new RegExp(`${sharedSelector}\\(`, 'g'))?.length || 0).toBeGreaterThanOrEqual(2)
    expect(qualityLoopSource).toContain(sharedSelector)
    expect(routeSource).toContain("candidate_stage: 'editor'")
    expect(routeSource).toContain("candidate_stage: 'meme_polish'")
    expect(qualityLoopSource).toContain("candidate_stage: 'quality_revision'")
  })
})

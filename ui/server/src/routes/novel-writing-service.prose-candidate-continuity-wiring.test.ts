import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('prose candidate continuity wiring', () => {
  test('guards editor, meme polish, and quality revision replacements with the shared continuity-safe selector', () => {
    const polishSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-polish-methods.ts'), 'utf8')
    const generateSource = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8')].join('\n')
    const qualityLoopSource = readFileSync(join(import.meta.dir, '../novel-writing/prose-quality-loop.ts'), 'utf8')
    const sharedSelector = 'selectContinuitySafeProseCandidate'
    const routeSource = [polishSource, generateSource].join('\n')

    expect(polishSource).toContain(sharedSelector)
    expect(polishSource.match(new RegExp(`${sharedSelector}\\(`, 'g'))?.length || 0).toBeGreaterThanOrEqual(2)
    expect(qualityLoopSource).toContain(sharedSelector)
    expect(polishSource).toContain("candidate_stage: 'editor'")
    expect(polishSource).toContain("candidate_stage: 'meme_polish'")
    expect(qualityLoopSource).toContain("candidate_stage: 'quality_revision'")
    expect(polishSource.match(/selectContinuitySafeProseCandidate\(chapterText, (?:rewrittenText|polishedText), contextPackage,/g)?.length || 0).toBe(2)
    expect(routeSource).toContain('continuityContext: contextPackage')
    expect(qualityLoopSource).toContain('input.continuityContext || input.coreContract')
  })
})

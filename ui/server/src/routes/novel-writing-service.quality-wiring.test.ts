import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { resolveChapterWordTarget, scanProseForQualityLoop } from './novel-writing-service'

describe('novel writing service prose quality wiring', () => {
  test('applies the prose word-target soft cap inside the quality-loop scanner', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 1 }, {})
    const softCapScan = scanProseForQualityLoop('字'.repeat(5219), {}, target)
    const overTargetScan = scanProseForQualityLoop('字'.repeat(5700), {}, target)

    expect(softCapScan.word_target).toMatchObject({
      actual: 5219,
      passed: true,
      soft_cap: true,
    })
    expect(softCapScan.hard_failures.some((item: any) => item.key === 'word_target')).toBe(false)
    expect(overTargetScan.word_target).toMatchObject({
      actual: 5700,
      passed: false,
      soft_cap: false,
    })
    expect(overTargetScan.hard_failures.some((item: any) => item.key === 'word_target')).toBe(true)
  })

  test('rechecks revised prose before unattended quality gate blocks chapter advance', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')
    const qualityLoopStart = source.indexOf('let qualityLoop: Awaited<ReturnType<typeof runProseQualityLoop>>')
    const gateStart = source.indexOf('const preStoreQualityDecision =', qualityLoopStart)
    const reviewCallbackStart = source.indexOf('review: async ({ prompt, round }) => {', qualityLoopStart)
    const reviseCallbackStart = source.indexOf('revise: async ({ prompt, round }) => {', reviewCallbackStart)
    const qualityLoopEnd = source.indexOf('\n    } catch (error: any) {', reviseCallbackStart)
    const beforeGate = source.slice(qualityLoopStart, gateStart)
    const reviewBlock = source.slice(reviewCallbackStart, reviseCallbackStart)
    const reviseBlock = source.slice(reviseCallbackStart, qualityLoopEnd)

    expect(qualityLoopStart).toBeGreaterThanOrEqual(0)
    expect(gateStart).toBeGreaterThan(qualityLoopStart)
    expect(reviewCallbackStart).toBeGreaterThan(qualityLoopStart)
    expect(reviseCallbackStart).toBeGreaterThan(reviewCallbackStart)
    expect(qualityLoopEnd).toBeGreaterThan(reviseCallbackStart)
    expect(beforeGate).toContain('qualityLoop = await runProseQualityLoop')
    expect(beforeGate).toContain('maxRevisionRounds: isDraftReviewOnly || isDraftOnly ? 0 : 2')
    expect(beforeGate).toContain("phase: round > 0 ? 'quality_recheck' : 'quality_review'")
    expect(beforeGate).toContain('assertProseQualityCanStore(qualityLoop.decision, approvals?.quality_gate)')
    expect(beforeGate).not.toContain('runProseSelfReviewAndRevision')
    expect(reviewBlock).toContain('maxTokens: 5000')
    expect(reviseBlock).toContain('maxTokens: proseMaxTokensForWordTarget(wordTarget)')
    expect(reviseBlock).not.toContain('maxTokens: 5000')
  })
})

import { describe, expect, test } from 'bun:test'
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const serverSrc = import.meta.dir

function lineCount(rel: string) {
  const full = join(serverSrc, rel)
  if (!existsSync(full)) return -1
  return readFileSync(full, 'utf8').split(/\r?\n/).length
}

function walkTs(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walkTs(full))
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) out.push(full)
  }
  return out
}

const BASELINES: Record<string, number> = {
  'novel-writing-service/monolith.ts': 47085,
  'routes/novel-writing-service.ts': 2,
  'routes/novel-writing-service.test.ts': 62278,
}

describe('architecture modularization contracts', () => {
  test('writing-service package exists with compatibility barrel', () => {
    expect(existsSync(join(serverSrc, 'novel-writing-service/index.ts'))).toBe(true)
    expect(existsSync(join(serverSrc, 'novel-writing-service/monolith.ts'))).toBe(true)
    expect(existsSync(join(serverSrc, 'novel-writing-service/quality/review-merge.ts'))).toBe(true)
    expect(existsSync(join(serverSrc, 'novel-writing-service/quality/word-count-guard.ts'))).toBe(true)
    expect(existsSync(join(serverSrc, 'novel-writing-service/quality/prose-quality-entry.ts'))).toBe(true)
    const shim = readFileSync(join(serverSrc, 'routes/novel-writing-service.ts'), 'utf8')
    expect(shim).toContain("export * from '../novel-writing-service'")
    expect(shim.split(/\r?\n/).length).toBeLessThanOrEqual(20)
  })

  test('P0 monofiles do not grow beyond recorded baselines', () => {
    for (const [rel, baseline] of Object.entries(BASELINES)) {
      const lines = lineCount(rel)
      expect(lines, rel).toBeGreaterThan(0)
      expect(lines, rel).toBeLessThanOrEqual(baseline + 25)
    }
  })

  test('hot novel package still forbids full-store rewrite API', () => {
    const all = walkTs(join(serverSrc, 'novel')).map(file => readFileSync(file, 'utf8')).join('\n')
    expect(all).not.toContain('async function mutateNovelStore')
  })

  test('writing-service public entry still exports core symbols', async () => {
    const mod = await import('./novel-writing-service')
    expect(typeof (mod as any).formatAdmissionError).toBe('function')
    expect(typeof (mod as any).createNovelWritingService).toBe('function')
    expect(typeof (mod as any).hasFailingReviewChecks).toBe('function')
    expect(typeof (mod as any).applyDeterministicWordCountIssueGuard).toBe('function')
    expect(typeof (mod as any).mergeQualityRecheckReviewWithStructuredEvidence).toBe('function')
    expect(typeof (mod as any).mergePostDeliveryReceiptSyncIntoQualityGateReview).toBe('function')
    expect(typeof (mod as any).scanProseForQualityLoop).toBe('function')
    expect(typeof (mod as any).prepareProseGenerationContract).toBe('function')
  })
})

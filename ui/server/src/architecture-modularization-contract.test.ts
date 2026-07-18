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

const HARD_CAPS: Record<string, number> = {
  'novel-writing-service/monolith.ts': 150,
  'routes/novel-writing-service.ts': 20,
  'routes/novel-writing-service.test.ts': 50,
  'routes/novel-editor-routes.ts': 20,
  'routes/novel-core-routes.ts': 20,
}

const SOFT_BASELINES: Record<string, number> = {
  'routes/novel-editor/builders.ts': 4600,
  'routes/novel-core/builders.ts': 3400,
}

describe('architecture modularization contracts', () => {
  test('writing-service package exists with barrel-only monofile', () => {
    expect(existsSync(join(serverSrc, 'novel-writing-service/index.ts'))).toBe(true)
    expect(existsSync(join(serverSrc, 'novel-writing-service/monolith.ts'))).toBe(true)
    expect(existsSync(join(serverSrc, 'novel-writing-service/public-novel-writing-surface.ts'))).toBe(true)
    expect(existsSync(join(serverSrc, 'novel-writing-service/service/create-novel-writing-service.ts'))).toBe(true)
    expect(existsSync(join(serverSrc, 'novel-writing-service/service/runtime-bindings.ts'))).toBe(true)
    expect(existsSync(join(serverSrc, 'novel-writing-service/quality/review-merge.ts'))).toBe(true)
    expect(existsSync(join(serverSrc, 'novel-writing-service/quality/word-count-guard.ts'))).toBe(true)
    expect(existsSync(join(serverSrc, 'novel-writing-service/quality/prose-quality-entry.ts'))).toBe(true)
    const monofile = readFileSync(join(serverSrc, 'novel-writing-service/monolith.ts'), 'utf8')
    expect(monofile).toContain("import './service/runtime-bindings'")
    expect(monofile).toContain("export * from './public-novel-writing-surface'")
    expect(monofile).not.toMatch(/^export function createNovelWritingService/m)
    const shim = readFileSync(join(serverSrc, 'routes/novel-writing-service.ts'), 'utf8')
    expect(shim).toContain("export * from '../novel-writing-service'")
    expect(shim.split(/\r?\n/).length).toBeLessThanOrEqual(20)
  })

  test('editor and core routes are package-split with compatibility barrels', () => {
    expect(existsSync(join(serverSrc, 'routes/novel-editor/index.ts'))).toBe(true)
    expect(existsSync(join(serverSrc, 'routes/novel-editor/builders.ts'))).toBe(true)
    expect(existsSync(join(serverSrc, 'routes/novel-editor/register.ts'))).toBe(true)
    expect(existsSync(join(serverSrc, 'routes/novel-core/index.ts'))).toBe(true)
    expect(existsSync(join(serverSrc, 'routes/novel-core/builders.ts'))).toBe(true)
    expect(existsSync(join(serverSrc, 'routes/novel-core/register.ts'))).toBe(true)
    expect(readFileSync(join(serverSrc, 'routes/novel-editor-routes.ts'), 'utf8')).toContain("export * from './novel-editor'")
    expect(readFileSync(join(serverSrc, 'routes/novel-core-routes.ts'), 'utf8')).toContain("export * from './novel-core'")
  })

  test('completed monofiles stay under hard caps', () => {
    for (const [rel, cap] of Object.entries(HARD_CAPS)) {
      const lines = lineCount(rel)
      expect(lines, rel).toBeGreaterThan(0)
      expect(lines, rel).toBeLessThanOrEqual(cap)
    }
  })

  test('package builder modules do not regrow beyond soft baselines', () => {
    for (const [rel, baseline] of Object.entries(SOFT_BASELINES)) {
      const lines = lineCount(rel)
      expect(lines, rel).toBeGreaterThan(0)
      expect(lines, rel).toBeLessThanOrEqual(baseline + 50)
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
    expect(typeof (mod as any).scanProseMetaLeaks).toBe('function')
    expect(typeof (mod as any).evaluateProseWordTarget).toBe('function')
    expect(typeof (mod as any).buildReadabilityReviewPrompt).toBe('function')
  })
})

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
  'routes/novel-editor/builders.ts': 900,
  'routes/novel-core/builders.ts': 120,
  'routes/novel-core/builders-seed-outline.ts': 20,
  'routes/novel-core/builders-seed-helpers.ts': 700,
  'routes/novel-core/builders-seed-outline-model.ts': 700,
  'routes/novel-core/builders-seed-normalize.ts': 600,
  'routes/novel-core/builders-seed.ts': 20,
  'routes/novel-core/builders-seed-recovery.ts': 800,
  'routes/novel-core/builders-seed-materialize.ts': 1100,
  'routes/novel-core/builders-seed-fill-gaps.ts': 400,
  'routes/novel-editor/builders-delivery-risk-brief.ts': 700,
  'routes/novel-editor/builders-revision-prompts.ts': 500,
  'routes/novel-writing-service.pre-draft-brief.test.ts': 50,
  'routes/novel-writing-service.pre-draft-brief.core-a.test.ts': 2300,
  'routes/novel-writing-service.pre-draft-brief.pipeline-a.test.ts': 2400,
  'routes/novel-writing-service.pre-draft-brief.sync-receipts-a.test.ts': 2600,
  'routes/novel-writing-service.pre-draft-brief.sync-core-a.test.ts': 1800,
  'routes/novel-writing-service.pre-draft-brief.sync-audience-a.test.ts': 1700,
  'routes/novel-writing-service.scene-cards.test.ts': 50,
  'routes/novel-writing-service.scene-cards.a.test.ts': 1500,
  'routes/novel-writing-service.scene-cards.b.test.ts': 1700,
  'routes/novel-writing-service.chapter-context.test.ts': 3600,
  'routes/novel-writing-service.prose-word-target.test.ts': 1800,
  'routes/novel-writing-service.readability-meme.test.ts': 2200,
  'routes/novel-production-service.ts': 700,
  'routes/novel-production/run-state.ts': 350,
  'routes/novel-production/post-delivery-quality.ts': 900,
  'novel-writing-service/post-delivery/quality-sync-reports-benchmark-audit.ts': 50,
  'novel-writing-service/post-delivery/quality-sync-reports-extended.ts': 50,
  'novel-writing-service/batch-serial/serial-momentum.ts': 50,
  'routes/novel-commercial-ops/builders.ts': 50,
  'novel-writing-service/service/generate-chapter-for-group-methods.ts': 750,
  'novel-writing-service/post-delivery/scene-card-delivery-risk.ts': 20,
  'routes/novel-editor/builders-annotations.ts': 800,
  'knowledge-base.ts': 700,
  'novel-writing-service/post-delivery/delta-sync-reports.ts': 250,
  'novel-writing-service/batch-serial/serial-momentum-briefs.ts': 20,
  'novel-writing/prose-generation-prompt-sections.ts': 20,
  'novel-writing/chapter-progress-ledger.ts': 20,
  'novel-writing-service/quality/pre-draft-brief.ts': 20,
  'novel-writing-service/post-delivery/quality-sync-reports-benchmark-craft.ts': 20,
  'memory-service.ts': 20,
  'novel-writing/closed-beat-canon.ts': 20,
  'novel-writing-service/quality/chapter-blueprint-execution.ts': 20,
  'novel-writing-service/quality/state-tracking-contracts.ts': 20,
  'routes/novel-generation/register.ts': 30,
  'routes/novel-planning/register.ts': 30,
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

  test('major novel routes are package-split with compatibility barrels', () => {
    const packages = [
      ['novel-editor', 'novel-editor-routes.ts'],
      ['novel-core', 'novel-core-routes.ts'],
      ['novel-commercial-ops', 'novel-commercial-ops-routes.ts'],
      ['novel-generation', 'novel-generation-routes.ts'],
      ['novel-planning', 'novel-planning-routes.ts'],
    ] as const
    for (const [pkg, shim] of packages) {
      expect(existsSync(join(serverSrc, `routes/${pkg}/index.ts`)), pkg).toBe(true)
      expect(existsSync(join(serverSrc, `routes/${pkg}/builders.ts`)), pkg).toBe(true)
      expect(existsSync(join(serverSrc, `routes/${pkg}/register.ts`)), pkg).toBe(true)
      expect(readFileSync(join(serverSrc, `routes/${shim}`), 'utf8')).toContain(`export * from './${pkg}'`)
      expect(lineCount(`routes/${shim}`)).toBeLessThanOrEqual(20)
    }
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

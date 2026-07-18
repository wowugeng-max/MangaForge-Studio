import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

// Split into focused suites:
// - novel-editor-routes.quality-card.test.ts
// - novel-editor-routes.surgical-revision.test.ts
// - novel-editor-routes.revision-safeguards.test.ts
// - novel-editor-routes.delivery-risk-brief.test.ts
// - novel-editor-routes.storyline-diff.test.ts
// - novel-editor-routes.annotations-surface.test.ts
// - novel-editor-routes.annotations-repair-tasks-a.test.ts
// - novel-editor-routes.annotations-repair-tasks-b.test.ts
// - novel-editor-routes.story-state-guards.test.ts

function editorBuildersSource() {
  const dir = join(import.meta.dir, 'novel-editor')
  return [
    'builders.ts',
    'builders-annotations.ts',
    'builders-annotations-prose-quality.ts',
    'builders-annotations-delivery-risk.ts',
    'builders-annotations-repair-tasks.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}

describe('novel-editor-routes monotest shim', () => {
  test('builders package source is still joined for contract scans', () => {
    const source = editorBuildersSource()
    expect(source).toContain('buildChapterQualityCard')
    expect(source).toContain('buildReviewAnnotations')
  })
})

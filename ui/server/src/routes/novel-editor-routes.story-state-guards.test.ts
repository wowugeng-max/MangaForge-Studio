import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildReviewAnnotations,
  buildReviewAnnotationRepairTasks,
  buildStorylineDiffDecisionRepairTasks,
  buildChapterDeliveryRiskBrief,
  buildChapterQualityCard,
  buildDeliveryRiskConvergenceReport,
  buildEditorReportPrompt,
  buildCompactEditorRevisionPrompt,
  buildEditorRevisionPrompt,
  buildStorylineDiffDecisionReviewPayload,
  applySurgicalRevisionPatch,
  isRevisionOutputTruncated,
} from './novel-editor-routes'


function editorBuildersSource() {
  const dir = join(import.meta.dir, 'novel-editor')
  return [
    'builders.ts',
    'builders-annotations.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}
describe('story state sync route source guards', () => {
  test('exposes chapter story-state sync for repair task recheck convergence', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const source = [
      editorBuildersSource(),
      readFileSync(join(import.meta.dir, 'novel-editor/register.ts'), 'utf8'),
    ].join('\n')

    expect(source).toContain('/api/novel/chapters/:chapterId/story-state-sync')
    expect(source).toContain('buildDeliveryRiskConvergenceReport')
    expect(source).toContain("run_type: 'story_state'")
    expect(source).toContain('delivery_risk_convergence')
  })
})


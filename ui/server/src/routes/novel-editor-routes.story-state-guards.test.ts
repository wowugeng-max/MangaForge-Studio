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
    'builders-annotations-prose-quality.ts',
    'builders-annotations-prose-quality-types.ts',
    'builders-annotations-prose-quality-core.ts',
    'builders-annotations-prose-quality-craft.ts',
    'builders-annotations-prose-quality-audience.ts',
    'builders-annotations-delivery-risk.ts',
    'builders-annotations-repair-tasks.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}
describe('story state sync route source guards', () => {
  test('exposes chapter story-state sync for repair task recheck convergence', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const source = [
      editorBuildersSource(),
      readFileSync(join(import.meta.dir, 'novel-editor/register.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-annotations.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-revision.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-quality.ts'), 'utf8'),
    ].join('\n')

    expect(source).toContain('/api/novel/chapters/:chapterId/story-state-sync')
    expect(source).toContain('buildDeliveryRiskConvergenceReport')
    expect(source).toContain("run_type: 'story_state'")
    expect(source).toContain('delivery_risk_convergence')
  })

  test('manual Story State entry point uses the exact chapter receipt helper', () => {
    const qualitySource = readFileSync(join(import.meta.dir, 'novel-editor/register-quality.ts'), 'utf8')

    expect(qualitySource).toContain('prepareSingleChapterStoryState')
    expect(qualitySource).toContain('applySingleChapterStoryState')
    expect(qualitySource).toContain('revisionTextHash')
    expect(qualitySource).toContain('chapter_id: chapter.id')
    expect(qualitySource).not.toContain('last_synced_chapter')
  })

  test('post-revision Story State worker uses the exact chapter receipt helper', () => {
    const workerSource = readFileSync(join(import.meta.dir, 'novel-editor/revision-worker.ts'), 'utf8')
    const annotationSource = readFileSync(join(import.meta.dir, 'novel-editor/register-annotations.ts'), 'utf8')
    const buildersSource = readFileSync(join(import.meta.dir, 'novel-editor/builders.ts'), 'utf8')

    expect(workerSource).toContain('prepareSingleChapterStoryState')
    expect(workerSource).toContain('applySingleChapterStoryState')
    expect(workerSource).not.toContain('syncStoryStateFromChapter')
    expect(annotationSource).not.toContain('syncStoryStateFromChapter')
    expect(buildersSource).not.toContain('export async function syncStoryStateFromChapter')
  })

  test('quality and exact Story State source guards forbid follower mutation paths', () => {
    const buildersSource = readFileSync(join(import.meta.dir, 'novel-editor/builders.ts'), 'utf8')
    const qualityStart = buildersSource.indexOf('export async function createProseQualityReview')
    const qualityBlock = buildersSource.slice(qualityStart)
    const updateSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine-update.ts'), 'utf8')

    expect(qualityBlock).toContain('buildCurrentChapterPlanAlignment')
    expect(qualityBlock).not.toContain('collectProjectPlanAlignmentPatches')
    expect(qualityBlock).not.toContain('collectPlanAlignmentPatchesAfterProseChange')
    expect(qualityBlock).not.toContain('followLimit: 0')
    expect(updateSource).toContain('if (!options.exactChapter)')
    expect(updateSource).toContain('refreshFollowingChapterSerialStoryStateReadiness')
    expect(updateSource).toContain('export type StoryStateMachineOptions')
  })
})

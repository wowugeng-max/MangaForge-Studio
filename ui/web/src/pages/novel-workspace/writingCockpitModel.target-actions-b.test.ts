import { describe, expect, test } from 'bun:test'
import {
  buildWritingCockpitModel,
  resolveEditorRevisionChapterId,
  selectTargetChapterForWriting,
} from './writingCockpitModel'
import {
  project,
  outlines,
  chapters,
  contextPackage,
  sceneCardChapter,
  acceptedProject,
  proseQualityReview,
  editorReportReview,
  editorRevisionReview,
  storylineSyncReview,
  qualityAuditSyncReview,
  qualityAuditRepairReceiptSyncReview,
  chapterHandoffSyncReview,
  chapterHandoffDeltaSyncReview,
  intentConfirmationSyncReview,
  benchmarkRecallSyncReview,
  storyUnitSyncReview,
  assetIntakeReview,
  ipSceneIntakeReview,
  readabilityReview,
  chapterAttractionReview,
  storyDriveSyncReview,
  characterArcSyncReview,
  coreDriftReview,
  readerPayoffSyncReview,
  readerRetentionSyncReview,
  chapterBenchmarkSyncReview,
  styleSampleSyncReview,
  readerExpectationSyncReview,
  runwaySyncReview,
  innovationSyncReview,
  signatureSceneSyncReview,
  volumeBeatSyncReview,
  first30RetentionReview,
  deliveryRiskConvergenceReview,
  governanceRecheckSyncReview,
} from './writingCockpitModel.target-actions-fixtures'

describe('writing cockpit target chapter actions b', () => {
  test('blocks the target action when target chapter selection fails', async () => {
    const ready = await selectTargetChapterForWriting({
      targetChapterId: 102,
      activeChapterId: 101,
      selectChapterForWriting: async () => false,
    })

    expect(ready).toBe(false)
  })

  test('resolves editor revision chapter from payload, report, target, then active chapter', () => {
    expect(resolveEditorRevisionChapterId({
      payload: JSON.stringify({ chapter_id: 201 }),
      chapter_id: 202,
    }, 203, 204)).toBe(201)

    expect(resolveEditorRevisionChapterId({
      payload: {},
      chapter_id: 202,
    }, 203, 204)).toBe(202)

    expect(resolveEditorRevisionChapterId({ payload: {} }, 203, 204)).toBe(204)
    expect(resolveEditorRevisionChapterId({ payload: {} }, 203)).toBe(203)
  })
})

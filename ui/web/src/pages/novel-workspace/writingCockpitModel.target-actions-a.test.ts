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

describe('writing cockpit target chapter actions a', () => {
  test('selects the target chapter before running a target action when active differs', async () => {
    const selected: number[] = []

    const ready = await selectTargetChapterForWriting({
      targetChapterId: 102,
      activeChapterId: 101,
      selectChapterForWriting: async (chapterId) => {
        selected.push(chapterId)
        return true
      },
    })

    expect(ready).toBe(true)
    expect(selected).toEqual([102])
  })

  test('does not select again when the target chapter is already active', async () => {
    const selected: number[] = []

    const ready = await selectTargetChapterForWriting({
      targetChapterId: 102,
      activeChapterId: '102',
      selectChapterForWriting: async (chapterId) => {
        selected.push(chapterId)
        return true
      },
    })

    expect(ready).toBe(true)
    expect(selected).toEqual([])
  })

})

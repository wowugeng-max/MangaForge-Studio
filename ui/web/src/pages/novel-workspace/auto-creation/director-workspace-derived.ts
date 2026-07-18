import type { AutoCreationDirectorModel } from '../autoCreationDirectorModel'
import {
  safeBatchChapterNos,
  safeBatchChapterNosText,
} from './director-workspace-chrome'

export function buildDirectorWorkspaceDerived(model: AutoCreationDirectorModel) {
  const targetPercent = model.metrics.targetWords > 0
    ? Math.min(100, Math.round((model.metrics.writtenWords / model.metrics.targetWords) * 100))
    : 0
  const activeStep = model.pipeline.find(step => step.status === 'active')
  const serialCockpit = model.serialCockpit
  const batchPreflight = model.batchGuardrail.preflight
  const recoveryEvidenceTrend = model.batchGuardrail.recoveryEvidenceTrend
  const longformMemoryAnchor = batchPreflight.longformMemoryAnchor || null
  const governanceRecheckMemory = batchPreflight.governanceRecheckMemory || null
  const safeBatchExpansionPolicy = batchPreflight.inputSnapshot?.safe_batch_expansion_policy
    || batchPreflight.inputSnapshot?.safeBatchExpansionPolicy
    || null
  const safeBatchRecoveryRestoreConfirmation = batchPreflight.inputSnapshot?.safe_batch_recovery_restore_confirmation
    || batchPreflight.inputSnapshot?.safeBatchRecoveryRestoreConfirmation
    || null
  const safeBatchRecoveryRestoreChapterNos = Array.isArray(safeBatchRecoveryRestoreConfirmation?.validation_chapter_nos)
    ? safeBatchRecoveryRestoreConfirmation.validation_chapter_nos
    : Array.isArray(safeBatchRecoveryRestoreConfirmation?.validationChapterNos)
      ? safeBatchRecoveryRestoreConfirmation.validationChapterNos
      : []
  const safeBatchExpansionFeedback = safeBatchExpansionPolicy?.expansion_feedback
    || safeBatchExpansionPolicy?.expansionFeedback
    || null
  const safeBatchExpansionFeedbackStatus = String(safeBatchExpansionFeedback?.status || '')
  const safeBatchRecoveryRestoreStabilityEvidence = safeBatchExpansionFeedback?.recovery_restore_stability_evidence
    || safeBatchExpansionFeedback?.recoveryRestoreStabilityEvidence
    || null
  const safeBatchRecoveryRestoreStabilityLane = batchPreflight.inputSnapshot?.safe_batch_recovery_restore_stability_lane
    || batchPreflight.inputSnapshot?.safeBatchRecoveryRestoreStabilityLane
    || model.batchGuardrail.recommendedAction.payload?.recovery_restore_stability_evidence
    || model.batchGuardrail.recommendedAction.payload?.default_five_chapter_lane
    || null
  const safeBatchRecoveryRestoreStabilityReview = safeBatchRecoveryRestoreStabilityLane
    || safeBatchRecoveryRestoreStabilityEvidence
    || null
  const safeBatchRecoveryRestoreLaneReadyFlag = safeBatchRecoveryRestoreStabilityLane?.default_five_chapter_ready
    ?? safeBatchRecoveryRestoreStabilityLane?.defaultFiveChapterReady
  const safeBatchRecoveryRestoreLaneReady = safeBatchRecoveryRestoreLaneReadyFlag === undefined || safeBatchRecoveryRestoreLaneReadyFlag === null
    ? String(safeBatchRecoveryRestoreStabilityLane?.status || '') === 'ready'
    : Boolean(safeBatchRecoveryRestoreLaneReadyFlag)
  const safeBatchRecoveryRestoreLaneLabel = String(
    safeBatchRecoveryRestoreStabilityLane?.label
      || (safeBatchRecoveryRestoreLaneReady ? '默认5章档位' : '5章观察批'),
  )
  const safeBatchRecoveryRestoreRequiredStreakRaw = Number(
    safeBatchRecoveryRestoreStabilityLane?.required_stable_pass_streak
      ?? safeBatchRecoveryRestoreStabilityLane?.requiredStablePassStreak
      ?? 2,
  )
  const safeBatchRecoveryRestoreRequiredStreak = Number.isFinite(safeBatchRecoveryRestoreRequiredStreakRaw) && safeBatchRecoveryRestoreRequiredStreakRaw > 0
    ? safeBatchRecoveryRestoreRequiredStreakRaw
    : 2
  const safeBatchRecoveryRestoreStabilityStreak = Number(
    safeBatchRecoveryRestoreStabilityReview?.stable_pass_streak
      ?? safeBatchRecoveryRestoreStabilityReview?.stablePassStreak
      ?? 0,
  )
  const safeBatchRecoveryRestoreChapterNosForStability = safeBatchChapterNos(
    safeBatchRecoveryRestoreStabilityReview?.restore_chapter_nos
      || safeBatchRecoveryRestoreStabilityReview?.restoreChapterNos,
  )
  const safeBatchRecoveryRestoreValidationNosForStability = safeBatchChapterNos(
    safeBatchRecoveryRestoreStabilityReview?.validation_chapter_nos
      || safeBatchRecoveryRestoreStabilityReview?.validationChapterNos,
  )
  const safeBatchRecoveryRestoreBatchText = safeBatchChapterNosText(safeBatchRecoveryRestoreChapterNosForStability)
  const safeBatchRecoveryRestoreValidationText = safeBatchChapterNosText(safeBatchRecoveryRestoreValidationNosForStability)
  const safeBatchExpansionFeedbackChapterNos = Array.isArray(safeBatchExpansionFeedback?.latest_chapter_nos)
    ? safeBatchExpansionFeedback.latest_chapter_nos
    : Array.isArray(safeBatchExpansionFeedback?.latestChapterNos)
      ? safeBatchExpansionFeedback.latestChapterNos
      : []
  const safeBatchExpansionStablePassStreak = Number(safeBatchExpansionFeedback?.stable_pass_streak || safeBatchExpansionFeedback?.stablePassStreak || 0)
  const safeBatchExpansionRecentBatchCount = Number(safeBatchExpansionFeedback?.recent_expanded_batch_count || safeBatchExpansionFeedback?.recentExpandedBatchCount || 0)
  const safeBatchExpansionRepeatedHotspot = safeBatchExpansionFeedback?.repeated_hotspot_segment
    || safeBatchExpansionFeedback?.repeatedHotspotSegment
    || null
  const safeBatchExpansionStructureTrend = safeBatchExpansionFeedback?.expansion_structure_validation_trend
    || safeBatchExpansionFeedback?.expansionStructureValidationTrend
    || null
  const safeBatchExpansionStructureEffectiveness = safeBatchExpansionFeedback?.expansion_structure_repair_effectiveness
    || safeBatchExpansionFeedback?.expansionStructureRepairEffectiveness
    || null
  const safeBatchExpansionStructureEffectivenessStatus = String(safeBatchExpansionStructureEffectiveness?.status || '')
  const safeBatchExpansionStructureFailureReasons = Array.isArray(safeBatchExpansionStructureTrend?.failure_reasons)
    ? safeBatchExpansionStructureTrend.failure_reasons
    : Array.isArray(safeBatchExpansionStructureTrend?.failureReasons)
      ? safeBatchExpansionStructureTrend.failureReasons
      : []
  const safeBatchExpansionStructureTopFailure = safeBatchExpansionStructureFailureReasons[0] || null
  const safeBatchExpansionStructureRecurrence = safeBatchExpansionStructureTrend?.recurrence_after_restore
    || safeBatchExpansionStructureTrend?.recurrenceAfterRestore
    || null
  const longformCharacterStates = Array.isArray(longformMemoryAnchor?.character_states) ? longformMemoryAnchor.character_states : []
  const longformOpenQuestions = Array.isArray(longformMemoryAnchor?.open_questions) ? longformMemoryAnchor.open_questions : []
  const longformPayoffDebts = Array.isArray(longformMemoryAnchor?.payoff_debts) ? longformMemoryAnchor.payoff_debts : []

  return {
    targetPercent,
    activeStep,
    serialCockpit,
    batchPreflight,
    recoveryEvidenceTrend,
    longformMemoryAnchor,
    governanceRecheckMemory,
    safeBatchExpansionPolicy,
    safeBatchRecoveryRestoreConfirmation,
    safeBatchRecoveryRestoreChapterNos,
    safeBatchExpansionFeedback,
    safeBatchExpansionFeedbackStatus,
    safeBatchRecoveryRestoreStabilityEvidence,
    safeBatchRecoveryRestoreStabilityLane,
    safeBatchRecoveryRestoreStabilityReview,
    safeBatchRecoveryRestoreLaneReadyFlag,
    safeBatchRecoveryRestoreLaneReady,
    safeBatchRecoveryRestoreLaneLabel,
    safeBatchRecoveryRestoreRequiredStreakRaw,
    safeBatchRecoveryRestoreRequiredStreak,
    safeBatchRecoveryRestoreStabilityStreak,
    safeBatchRecoveryRestoreChapterNosForStability,
    safeBatchRecoveryRestoreValidationNosForStability,
    safeBatchRecoveryRestoreBatchText,
    safeBatchRecoveryRestoreValidationText,
    safeBatchExpansionFeedbackChapterNos,
    safeBatchExpansionStablePassStreak,
    safeBatchExpansionRecentBatchCount,
    safeBatchExpansionRepeatedHotspot,
    safeBatchExpansionStructureTrend,
    safeBatchExpansionStructureEffectiveness,
    safeBatchExpansionStructureEffectivenessStatus,
    safeBatchExpansionStructureFailureReasons,
    safeBatchExpansionStructureTopFailure,
    safeBatchExpansionStructureRecurrence,
    longformCharacterStates,
    longformOpenQuestions,
    longformPayoffDebts,
  }
}

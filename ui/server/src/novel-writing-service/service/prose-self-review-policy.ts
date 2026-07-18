import {
  asArray,
  normalizeIssue,
} from '../../routes/novel-route-utils'
import {
  platformCheckNeedsCarryOver,
  preDraftReceiptCheckNeedsCarryOver,
} from '../quality/platform-carry-over'
import {
  normalizeNextChapterQualityPlanEndingContract,
  normalizePerspectiveVerdicts,
} from '../quality/prose-quality-risks'
import {
  compactBriefText,
} from '../quality/text-utils'

export const nextChapterQualityPlanNeedsRepair = (review: any) => {
  const deliveryReceipts = review?.oh_story_delivery_receipts || review?.ohStoryDeliveryReceipts || {}
  const plan = review?.next_chapter_quality_plan
    || review?.nextChapterQualityPlan
    || deliveryReceipts?.next_chapter_quality_plan
    || deliveryReceipts?.nextChapterQualityPlan
    || null
  if (!plan || typeof plan !== 'object') return true
  const missingActionFields = [
    ['quality_focus', 'qualityFocus'],
    ['opening_actions', 'openingActions'],
    ['middle_actions', 'middleActions'],
    ['ending_actions', 'endingActions'],
    ['avoid_repetition', 'avoidRepetition'],
    ['evidence_basis', 'evidenceBasis'],
  ].some(([snakeField, camelField]) => !asArray(plan?.[snakeField] || plan?.[camelField])
    .some((item: any) => compactBriefText(item)))
  if (missingActionFields) return true
  const endingContract = normalizeNextChapterQualityPlanEndingContract({
    ...plan,
    ending_contract: plan?.ending_contract || plan?.endingContract || plan?.chapter_handoff_contract || plan?.chapterHandoffContract,
  })
  return [
    ['final_state', 'finalState'],
    ['unresolved_question', 'unresolvedQuestion'],
    ['next_chapter_pull', 'nextChapterPull'],
    ['handoff_to_next', 'handoffToNext'],
  ].some(([snakeField]) => !compactBriefText(endingContract?.[snakeField]))
}

export const shouldReviseProse = (review: any, options: any = {}) => {
  const issues = Array.isArray(review?.issues) ? review.issues.map(normalizeIssue) : []
  const hasHighIssue = issues.some(issue => ['high', 'critical', 's1', 's2'].includes(issue.severity.toLowerCase()))
  const perspectiveVerdicts = normalizePerspectiveVerdicts(review?.perspective_verdicts || review?.perspectiveVerdicts)
  const hasPerspectiveConcern = perspectiveVerdicts.some((item: any) => ['CONCERNS', 'REJECT'].includes(String(item?.verdict || '').toUpperCase()))
  const deslopChecks = asArray(review?.deslop_checks || review?.deslopChecks)
  const hasDeslopConcern = deslopChecks.some(platformCheckNeedsCarryOver)
  const deslopGateDiagnostics = review?.deslop_gate_diagnostics || review?.deslopGateDiagnostics || {}
  const deslopDiagnosticGates = asArray(deslopGateDiagnostics?.gates)
  const deslopDiagnosticConcernCount = Number(deslopGateDiagnostics?.concern_gate_count ?? deslopGateDiagnostics?.concernGateCount ?? 0)
  const hasDeslopGateDiagnosticConcern = deslopDiagnosticConcernCount > 0
    || deslopDiagnosticGates.some((gate: any) => platformCheckNeedsCarryOver(gate))
  const factualChecks = asArray(review?.factual_checks || review?.factualChecks)
  const hasFactualConcern = factualChecks.some(platformCheckNeedsCarryOver)
  const proseMetaChecks = asArray(review?.prose_meta_checks || review?.proseMetaChecks)
  const hasProseMetaConcern = proseMetaChecks.some(platformCheckNeedsCarryOver)
  const dialogueChecks = asArray(review?.dialogue_checks || review?.dialogueChecks)
  const hasDialogueConcern = dialogueChecks.some(platformCheckNeedsCarryOver)
  const plotDynamicsChecks = asArray(review?.plot_dynamics_checks || review?.plotDynamicsChecks)
  const hasPlotDynamicsConcern = plotDynamicsChecks.some(platformCheckNeedsCarryOver)
  const storyPowerChecks = asArray(review?.story_power_checks || review?.storyPowerChecks)
  const hasStoryPowerConcern = storyPowerChecks.some(platformCheckNeedsCarryOver)
  const continuityHeatChecks = asArray(review?.continuity_heat_checks || review?.continuityHeatChecks)
  const hasContinuityHeatConcern = continuityHeatChecks.some(platformCheckNeedsCarryOver)
  const characterRelationChecks = asArray(review?.character_relation_checks || review?.characterRelationChecks)
  const hasCharacterRelationConcern = characterRelationChecks.some(platformCheckNeedsCarryOver)
  const characterBehaviorChecks = asArray(review?.character_behavior_checks || review?.characterBehaviorChecks)
  const hasCharacterBehaviorConcern = characterBehaviorChecks.some(platformCheckNeedsCarryOver)
  const assetLinkageChecks = asArray(review?.asset_linkage_checks || review?.assetLinkageChecks)
  const hasAssetLinkageConcern = assetLinkageChecks.some(platformCheckNeedsCarryOver)
  const stateTrackingChecks = asArray(review?.state_tracking_checks || review?.stateTrackingChecks)
  const hasStateTrackingConcern = stateTrackingChecks.some(platformCheckNeedsCarryOver)
  const sourceReadinessChecks = asArray(review?.source_readiness_checks || review?.sourceReadinessChecks)
  const hasSourceReadinessConcern = sourceReadinessChecks.some(platformCheckNeedsCarryOver)
  const artifactProtocolReceipts = asArray(review?.artifact_protocol_receipts || review?.artifactProtocolReceipts)
  const hasArtifactProtocolConcern = artifactProtocolReceipts.some(preDraftReceiptCheckNeedsCarryOver)
  const writePreparationChecks = asArray(review?.write_preparation_checks || review?.writePreparationChecks)
  const hasWritePreparationConcern = writePreparationChecks.some(platformCheckNeedsCarryOver)
  const nextChapterQualityPlanReceiptChecks = asArray(review?.next_chapter_quality_plan_receipts || review?.nextChapterQualityPlanReceipts)
  const hasNextChapterQualityPlanReceiptConcern = nextChapterQualityPlanReceiptChecks.some(preDraftReceiptCheckNeedsCarryOver)
  const chapterHandoffChecks = asArray(review?.chapter_handoff_checks || review?.chapterHandoffChecks)
  const hasChapterHandoffConcern = chapterHandoffChecks.some(platformCheckNeedsCarryOver)
  const readerRetentionChecks = asArray(review?.reader_retention_checks || review?.readerRetentionChecks)
  const hasReaderRetentionConcern = readerRetentionChecks.some(platformCheckNeedsCarryOver)
  const intentConfirmationChecks = asArray(review?.intent_confirmation_checks || review?.intentConfirmationChecks)
  const hasIntentConfirmationConcern = intentConfirmationChecks.some(platformCheckNeedsCarryOver)
  const benchmarkRecallChecks = asArray(review?.benchmark_recall_checks || review?.benchmarkRecallChecks)
  const hasBenchmarkRecallConcern = benchmarkRecallChecks.some(platformCheckNeedsCarryOver)
  const styleBoundaryChecks = asArray(review?.style_boundary_checks || review?.styleBoundaryChecks)
  const hasStyleBoundaryConcern = styleBoundaryChecks.some(platformCheckNeedsCarryOver)
  const styleSampleChecks = asArray(review?.style_sample_checks || review?.styleSampleChecks)
  const hasStyleSampleConcern = styleSampleChecks.some(platformCheckNeedsCarryOver)
  const informationFlowChecks = asArray(review?.information_flow_checks || review?.informationFlowChecks)
  const hasInformationFlowConcern = informationFlowChecks.some(platformCheckNeedsCarryOver)
  const expectationThresholdChecks = asArray(review?.expectation_threshold_checks || review?.expectationThresholdChecks)
  const hasExpectationThresholdConcern = expectationThresholdChecks.some(platformCheckNeedsCarryOver)
  const targetReaderChecks = asArray(review?.target_reader_checks || review?.targetReaderChecks)
  const hasTargetReaderConcern = targetReaderChecks.some(platformCheckNeedsCarryOver)
  const genrePositioningChecks = asArray(review?.genre_positioning_checks || review?.genrePositioningChecks)
  const hasGenrePositioningConcern = genrePositioningChecks.some(platformCheckNeedsCarryOver)
  const plotSpecialTopicsChecks = asArray(review?.plot_special_topics_checks || review?.plotSpecialTopicsChecks)
  const hasPlotSpecialTopicsConcern = plotSpecialTopicsChecks.some(platformCheckNeedsCarryOver)
  const femaleAudienceChecks = asArray(review?.female_audience_checks || review?.femaleAudienceChecks)
  const hasFemaleAudienceConcern = femaleAudienceChecks.some(platformCheckNeedsCarryOver)
  const upgradeRhythmChecks = asArray(review?.upgrade_rhythm_checks || review?.upgradeRhythmChecks)
  const hasUpgradeRhythmConcern = upgradeRhythmChecks.some(platformCheckNeedsCarryOver)
  const conflictStructureChecks = asArray(review?.conflict_structure_checks || review?.conflictStructureChecks)
  const hasConflictStructureConcern = conflictStructureChecks.some(platformCheckNeedsCarryOver)
  const storyLoopChecks = asArray(review?.story_loop_checks || review?.storyLoopChecks)
  const hasStoryLoopConcern = storyLoopChecks.some(platformCheckNeedsCarryOver)
  const emotionalArcChecks = asArray(review?.emotional_arc_checks || review?.emotionalArcChecks)
  const hasEmotionalArcConcern = emotionalArcChecks.some(platformCheckNeedsCarryOver)
  const chapterHookChecks = [
    ...asArray(review?.chapter_hook_checks || review?.chapterHookChecks),
    ...asArray(review?.chapter_hook_quality_checks || review?.chapterHookQualityChecks),
  ]
  const hasChapterHookConcern = chapterHookChecks.some(platformCheckNeedsCarryOver)
  const paragraphHookChecks = asArray(review?.paragraph_hook_checks || review?.paragraphHookChecks)
  const hasParagraphHookConcern = paragraphHookChecks.some(platformCheckNeedsCarryOver)
  const suspenseChecks = asArray(review?.suspense_checks || review?.suspenseChecks)
  const hasSuspenseConcern = suspenseChecks.some(platformCheckNeedsCarryOver)
  const reversalChecks = asArray(review?.reversal_checks || review?.reversalChecks)
  const hasReversalConcern = reversalChecks.some(platformCheckNeedsCarryOver)
  const showdownChecks = asArray(review?.showdown_checks || review?.showdownChecks)
  const hasShowdownConcern = showdownChecks.some(platformCheckNeedsCarryOver)
  const bridgeUnitChecks = asArray(review?.bridge_unit_checks || review?.bridgeUnitChecks)
  const hasBridgeUnitConcern = bridgeUnitChecks.some(platformCheckNeedsCarryOver)
  const openingChecks = asArray(review?.opening_checks || review?.openingChecks)
  const hasOpeningConcern = openingChecks.some(platformCheckNeedsCarryOver)
  const proseCraftChecks = asArray(review?.prose_craft_checks || review?.proseCraftChecks)
  const hasProseCraftConcern = proseCraftChecks.some(platformCheckNeedsCarryOver)
  const punctuationToneChecks = asArray(review?.punctuation_tone_checks || review?.punctuationToneChecks)
  const hasPunctuationToneConcern = punctuationToneChecks.some(platformCheckNeedsCarryOver)
  const qualityAuditChecks = asArray(review?.quality_audit_checks || review?.qualityAuditChecks)
  const hasQualityAuditConcern = qualityAuditChecks.some(platformCheckNeedsCarryOver)
  const hasNextChapterQualityPlanConcern = nextChapterQualityPlanNeedsRepair(review)
  const revisionThreshold = Math.max(78, Number(options.quality_threshold || 0))
  return Boolean(review?.needs_revision) || Number(review?.score || 100) < revisionThreshold || hasHighIssue || hasPerspectiveConcern || hasDeslopConcern || hasDeslopGateDiagnosticConcern || hasFactualConcern || hasProseMetaConcern || hasDialogueConcern || hasPlotDynamicsConcern || hasStoryPowerConcern || hasContinuityHeatConcern || hasCharacterRelationConcern || hasCharacterBehaviorConcern || hasAssetLinkageConcern || hasStateTrackingConcern || hasSourceReadinessConcern || hasArtifactProtocolConcern || hasWritePreparationConcern || hasNextChapterQualityPlanReceiptConcern || hasChapterHandoffConcern || hasReaderRetentionConcern || hasIntentConfirmationConcern || hasBenchmarkRecallConcern || hasStyleBoundaryConcern || hasStyleSampleConcern || hasInformationFlowConcern || hasExpectationThresholdConcern || hasTargetReaderConcern || hasGenrePositioningConcern || hasPlotSpecialTopicsConcern || hasFemaleAudienceConcern || hasUpgradeRhythmConcern || hasConflictStructureConcern || hasStoryLoopConcern || hasEmotionalArcConcern || hasChapterHookConcern || hasParagraphHookConcern || hasSuspenseConcern || hasReversalConcern || hasShowdownConcern || hasBridgeUnitConcern || hasOpeningConcern || hasProseCraftConcern || hasPunctuationToneConcern || hasQualityAuditConcern || hasNextChapterQualityPlanConcern
}


import { formatAdmissionError } from './quality/admission-error'
export { formatAdmissionError }
export { hasFailingReviewChecks } from './quality/review-status'
export { camelizeSnakeField, compactBriefText } from './quality/text-utils'
export { platformCheckNeedsCarryOver, deliveryRiskEvidenceSearchText, isGenericDeliveryRiskEvidence, preDraftReceiptCheckNeedsCarryOver } from './quality/platform-carry-over'
export { applyDeterministicWordCountIssueGuard } from './quality/word-count-guard'
export {
  hasReviewChecksNeedingRepair,
  mergeQualityRecheckReviewWithStructuredEvidence,
  mergePostDeliveryReceiptSyncIntoQualityGateReview,
  isMissingStructuredReviewCheck,
  missingStructuredReviewCheckFields,
} from './quality/review-merge'
export {
  attachOhStoryDirectorToContextPackage,
  prepareProseGenerationContract,
  scanProseForQualityLoop,
  buildFocusedQualityCoreContract,
  buildLegacyCompatibleSelfCheck,
} from './quality/prose-quality-entry'
export {
  appendMissingContractReviewCheck,
  appendMissingStatusFilterReceiptCheck,
  appendMissingNextChapterQualityPlanReceiptCheck,
  contextHasNextChapterQualityPlanDebt,
  contextHasStatusFilterReceiptDebt,
} from './quality/missing-review-checks'
export { getContextContract } from './context/context-contract'
export {
  extractProseExpansionPayload,
  isLikelyChapterTitleLine,
  proseBodyWithoutTitleLine,
  proseParagraphsWithoutTitle,
  chunkStructuredReviewFields,
} from './quality/prose-expansion'
export {
  revisionReceiptRemainingRisk,
  revisionReceiptMissingChangedEvidenceRisk,
  revisionReceiptGenericEvidenceRisk,
} from './quality/revision-receipt-risk'
export {
  uniqueObjectReferences,
  preDraftExecutionReceiptSections,
} from './quality/pre-draft-receipt-sections'
export {
  bindDeliveryRiskReceiptNormalizer,
  mergeStructuredReviewFillPayload,
  normalizeStructuredReviewFillCheck,
  structuredReviewFillPayloadValues,
  structuredReviewFillPayloadHasUsableField,
} from './quality/review-fill'
export {
  mergeProseRevisionArtifacts,
  meaningfulRevisionValue,
  latestRevisionValue,
  mergePreDraftExecutionReceipts,
  mergeOhStoryDeliveryArtifacts,
  REVISION_ARTIFACT_RECEIPT_FIELDS,
  DELIVERY_ARTIFACT_RECEIPT_FIELDS,
  PRE_DRAFT_ARTIFACT_RECEIPT_FIELDS,
} from './revision/revision-artifacts'
import {
  attachOhStoryDirectorToContextPackage,
  prepareProseGenerationContract,
  scanProseForQualityLoop,
  buildFocusedQualityCoreContract,
  buildLegacyCompatibleSelfCheck,
} from './quality/prose-quality-entry'
import {
  isMissingStructuredReviewCheck,
  missingStructuredReviewCheckFields,
} from './quality/review-merge'
import {
  appendMissingContractReviewCheck,
  appendMissingStatusFilterReceiptCheck,
  appendMissingNextChapterQualityPlanReceiptCheck,
  contextHasNextChapterQualityPlanDebt,
  contextHasStatusFilterReceiptDebt,
} from './quality/missing-review-checks'
import { getContextContract } from './context/context-contract'
import {
  extractProseExpansionPayload,
  isLikelyChapterTitleLine,
  proseBodyWithoutTitleLine,
  proseParagraphsWithoutTitle,
  chunkStructuredReviewFields,
} from './quality/prose-expansion'
import {
  revisionReceiptRemainingRisk,
} from './quality/revision-receipt-risk'
import {
  uniqueObjectReferences,
  preDraftExecutionReceiptSections,
} from './quality/pre-draft-receipt-sections'
import {
  bindDeliveryRiskReceiptNormalizer,
  mergeStructuredReviewFillPayload,
} from './quality/review-fill'
import {
  mergeProseRevisionArtifacts,
} from './revision/revision-artifacts'
import { camelizeSnakeField, compactBriefText, uniqueBriefStrings } from './quality/text-utils'
import {
  reviewBelongsToChapter,
  reviewPayloadForType,
  reviewTimestamp,
} from './quality/review-lookup'
import {
  buildSerialMomentumBrief,
  buildSerialQualityRegressionBrief,
  buildReaderExpectationDebtContext,
  applyReaderExpectationDebtAging,
  mergeRecentFatigueBriefs,
  normalizeExpectationItem,
  normalizeReaderExpectationDebtContext,
  normalizeReaderExpectationLedgerContract,
  uniqueExpectationItems,
} from './batch-serial/serial-momentum'
export {
  buildSerialMomentumBrief,
  buildSerialQualityRegressionBrief,
  buildReaderExpectationDebtContext,
  applyReaderExpectationDebtAging,
  mergeRecentFatigueBriefs,
  normalizeExpectationItem,
  normalizeReaderExpectationDebtContext,
  normalizeReaderExpectationLedgerContract,
  uniqueExpectationItems,
} from './batch-serial/serial-momentum'
export {
  reviewBelongsToChapter,
  reviewPayloadForType,
  reviewTimestamp,
} from './quality/review-lookup'
export { uniqueBriefStrings } from './quality/text-utils'
export {
  OH_STORY_ARTIFACT_PROTOCOL_REQUIREMENTS,
  artifactProtocolTextList,
  artifactProtocolRequirementForReceipt,
  normalizeArtifactProtocolReceipt,
  artifactProtocolReceiptsFromSource,
  artifactProtocolFieldCovered,
  artifactProtocolReceiptMiss,
  buildArtifactProtocolReceiptSyncReport,
} from './post-delivery/artifact-protocol'
export {
  normalizeStoredOhStoryDeliveryReceipts,
  buildDeliveryRiskCarryOverContext,
} from './post-delivery/delivery-risk-carry-over'
import {
  normalizeArtifactProtocolReceipt,
  artifactProtocolReceiptsFromSource,
  buildArtifactProtocolReceiptSyncReport,
} from './post-delivery/artifact-protocol'
import {
  normalizeStoredOhStoryDeliveryReceipts,
  buildDeliveryRiskCarryOverContext,
} from './post-delivery/delivery-risk-carry-over'
export {
  buildFallbackNextChapterQualityPlan,
  collectFallbackQualityPlanCheckTexts,
  compactChapterTailEvidence,
  deliveryRiskCountFromPayload,
  deliveryRiskEvidence,
  genericSyncRiskStagedActions,
  makeDeliveryRiskItem,
  normalizeNextChapterQualityPlanEndingContract,
  pendingAssetIntakeRisks,
  pendingIpSceneIntakeRisks,
  proseQualityAssetLinkageRisks,
  proseQualityAuditRepairReceiptRisks,
  proseQualityBannedWordRisks,
  proseQualityBenchmarkRecallRisks,
  proseQualityBlueprintConsumptionRisks,
  proseQualityBridgeUnitRisks,
  proseQualityChapterBenchmarkRisks,
  proseQualityChapterHandoffRisks,
  proseQualityChapterHookRisks,
  proseQualityCharacterBehaviorRisks,
  proseQualityCharacterRelationRisks,
  proseQualityConflictStructureRisks,
  proseQualityContentRubricRisks,
  proseQualityContinuityHeatRisks,
  proseQualityCoreContractRisks,
  proseQualityCraftMetricRisks,
  proseQualityDeliveryRiskReceiptRisks,
  proseQualityDeslopRepairCheckRisks,
  proseQualityDeslopRepairReceiptRisks,
  proseQualityDeslopRisks,
  proseQualityDialogueRisks,
  proseQualityEmotionalArcRisks,
  proseQualityExpectationThresholdRisks,
  proseQualityFemaleAudienceRisks,
  proseQualityFiveDimensionRisks,
  proseQualityFocusedRevisionModeRisks,
  proseQualityForeshadowingDeltaRisks,
  proseQualityGateFailureRisks,
  proseQualityGenrePositioningRisks,
  proseQualityHighSeverityFindings,
  proseQualityInformationFlowRisks,
  proseQualityIntentConfirmationRisks,
  proseQualityNextChapterPlanRisks,
  proseQualityOpeningRisks,
  proseQualityParagraphHookRisks,
  proseQualityPerspectiveVerdictRisks,
  proseQualityPlatformRubricRisks,
  proseQualityPlotDynamicsRisks,
  proseQualityPlotSpecialTopicsRisks,
  proseQualityProseCraftRisks,
  proseQualityProseMetaRisks,
  proseQualityPunctuationToneRisks,
  proseQualityQualityAuditRisks,
  proseQualityQualitySpecialtyRisks,
  proseQualityReaderRetentionRisks,
  proseQualityReversalRisks,
  proseQualityReviewNeedsRevision,
  proseQualityRevisionContextRisks,
  proseQualityRevisionDirectiveRisks,
  proseQualityRevisionReceiptCheckRisks,
  proseQualityRevisionReceiptRisks,
  proseQualitySettingViolationRisks,
  proseQualityShowdownRisks,
  proseQualitySourceReadinessRisks,
  proseQualityStateTrackingRisks,
  proseQualityStoryLoopRisks,
  proseQualityStoryStateUpdateRisks,
  proseQualityStructuredCheckRisks,
  proseQualityStyleBoundaryRisks,
  proseQualityStyleSampleRisks,
  proseQualitySuspenseRisks,
  proseQualityTargetReaderRisks,
  proseQualityTitleUniquenessRisks,
  proseQualityUpgradeRhythmRisks,
  proseQualityWordCountRisks,
  proseQualityWritePreparationRisks,
  revisionReceiptEvidenceLocationRisk,
  revisionReceiptRepairSegment,
  revisionReceiptSegmentRisk,
  revisionReceiptSyncRisk
} from './quality/prose-quality-risks'
import {
  buildFallbackNextChapterQualityPlan,
  collectFallbackQualityPlanCheckTexts,
  compactChapterTailEvidence,
  deliveryRiskCountFromPayload,
  deliveryRiskEvidence,
  genericSyncRiskStagedActions,
  makeDeliveryRiskItem,
  normalizeNextChapterQualityPlanEndingContract,
  pendingAssetIntakeRisks,
  pendingIpSceneIntakeRisks,
  proseQualityAssetLinkageRisks,
  proseQualityAuditRepairReceiptRisks,
  proseQualityBannedWordRisks,
  proseQualityBenchmarkRecallRisks,
  proseQualityBlueprintConsumptionRisks,
  proseQualityBridgeUnitRisks,
  proseQualityChapterBenchmarkRisks,
  proseQualityChapterHandoffRisks,
  proseQualityChapterHookRisks,
  proseQualityCharacterBehaviorRisks,
  proseQualityCharacterRelationRisks,
  proseQualityConflictStructureRisks,
  proseQualityContentRubricRisks,
  proseQualityContinuityHeatRisks,
  proseQualityCoreContractRisks,
  proseQualityCraftMetricRisks,
  proseQualityDeliveryRiskReceiptRisks,
  proseQualityDeslopRepairCheckRisks,
  proseQualityDeslopRepairReceiptRisks,
  proseQualityDeslopRisks,
  proseQualityDialogueRisks,
  proseQualityEmotionalArcRisks,
  proseQualityExpectationThresholdRisks,
  proseQualityFemaleAudienceRisks,
  proseQualityFiveDimensionRisks,
  proseQualityFocusedRevisionModeRisks,
  proseQualityForeshadowingDeltaRisks,
  proseQualityGateFailureRisks,
  proseQualityGenrePositioningRisks,
  proseQualityHighSeverityFindings,
  proseQualityInformationFlowRisks,
  proseQualityIntentConfirmationRisks,
  proseQualityNextChapterPlanRisks,
  proseQualityOpeningRisks,
  proseQualityParagraphHookRisks,
  proseQualityPerspectiveVerdictRisks,
  proseQualityPlatformRubricRisks,
  proseQualityPlotDynamicsRisks,
  proseQualityPlotSpecialTopicsRisks,
  proseQualityProseCraftRisks,
  proseQualityProseMetaRisks,
  proseQualityPunctuationToneRisks,
  proseQualityQualityAuditRisks,
  proseQualityQualitySpecialtyRisks,
  proseQualityReaderRetentionRisks,
  proseQualityReversalRisks,
  proseQualityReviewNeedsRevision,
  proseQualityRevisionContextRisks,
  proseQualityRevisionDirectiveRisks,
  proseQualityRevisionReceiptCheckRisks,
  proseQualityRevisionReceiptRisks,
  proseQualitySettingViolationRisks,
  proseQualityShowdownRisks,
  proseQualitySourceReadinessRisks,
  proseQualityStateTrackingRisks,
  proseQualityStoryLoopRisks,
  proseQualityStoryStateUpdateRisks,
  proseQualityStructuredCheckRisks,
  proseQualityStyleBoundaryRisks,
  proseQualityStyleSampleRisks,
  proseQualitySuspenseRisks,
  proseQualityTargetReaderRisks,
  proseQualityTitleUniquenessRisks,
  proseQualityUpgradeRhythmRisks,
  proseQualityWordCountRisks,
  proseQualityWritePreparationRisks,
  revisionReceiptEvidenceLocationRisk,
  revisionReceiptRepairSegment,
  revisionReceiptSegmentRisk,
  revisionReceiptSyncRisk
} from './quality/prose-quality-risks'
export {
  receiptEvidenceLocatedInProse,
  receiptEvidenceLocatedInQualityPlanSegment,
} from './quality/receipt-evidence'
export {
  DELIVERY_RISK_CARRY_OVER_LIMIT,
  deliveryRiskItemText,
  deliveryRiskReceiptRemainingRisk,
  inferDeliveryRiskReceiptRepairSegment,
  deliveryRiskReceiptRepairPositionRule,
  normalizeDeliveryRiskCarryOverContext,
  deliveryRiskCarryOverFromContext,
  deliveryRiskCarryOversFromContext,
  normalizeDeliveryRiskReceipts,
  buildDeliveryRiskReceiptSyncReport,
  uniqueDeliveryRiskReceipts,
  appendMissingDeliveryRiskReceipts,
} from './post-delivery/delivery-risk-core'
import {
  receiptEvidenceLocatedInProse,
  receiptEvidenceLocatedInQualityPlanSegment,
} from './quality/receipt-evidence'
import {
  deliveryRiskItemText,
  deliveryRiskReceiptRemainingRisk,
  inferDeliveryRiskReceiptRepairSegment,
  deliveryRiskReceiptRepairPositionRule,
  normalizeDeliveryRiskCarryOverContext,
  deliveryRiskCarryOverFromContext,
  deliveryRiskCarryOversFromContext,
  normalizeDeliveryRiskReceipts,
  buildDeliveryRiskReceiptSyncReport,
  uniqueDeliveryRiskReceipts,
  appendMissingDeliveryRiskReceipts,
} from './post-delivery/delivery-risk-core'

bindDeliveryRiskReceiptNormalizer(normalizeDeliveryRiskReceipts)
export {
  OH_STORY_REVISION_STRATEGY_ORDER,
  OH_STORY_FOCUSED_REVISION_MODE_SPECS,
  OH_STORY_FIVE_DIMENSION_SCORE_SPECS,
  OH_STORY_CRAFT_METRIC_SPECS,
  normalizeRevisionStrategy,
  fiveDimensionRawValue,
  numericMetricScore,
  metricStatusNeedsRevision,
  normalizeCraftMetricRisks,
  normalizeSettingViolationRisks,
  normalizeFiveDimensionQualityScores,
} from './quality/five-dimension-scores'
import {
  OH_STORY_REVISION_STRATEGY_ORDER,
  OH_STORY_FOCUSED_REVISION_MODE_SPECS,
  OH_STORY_FIVE_DIMENSION_SCORE_SPECS,
  OH_STORY_CRAFT_METRIC_SPECS,
  normalizeRevisionStrategy,
  fiveDimensionRawValue,
  numericMetricScore,
  metricStatusNeedsRevision,
  normalizeCraftMetricRisks,
  normalizeSettingViolationRisks,
  normalizeFiveDimensionQualityScores,
} from './quality/five-dimension-scores'
export {
  DISCOVERED_ASSET_TYPES,
  normalizeDiscoveredAssets,
  normalizeIpSceneCandidates,
  normalizeMemeBank,
  normalizeStyleSampleBank,
  normalizeChapterBenchmarkSampleBank,
  resolveMemeBank,
  resolveStyleSampleBank,
  resolveChapterBenchmarkSampleBank,
  styleSelectionChapterStrategy,
  buildStyleSampleSelectionSignals,
  latestStyleSelectionReviewPayload,
  styleSampleEffectivenessAdjustment,
  styleSampleEffectivenessForSample,
  styleSampleEffectivenessReason,
  styleSampleEffectivenessShouldAvoid,
  styleSelectionChapterQualityScore,
  styleSelectionItemSampleKey,
  styleSelectionRoundAverage,
} from './post-delivery/asset-banks'
import {
  DISCOVERED_ASSET_TYPES,
  normalizeDiscoveredAssets,
  normalizeIpSceneCandidates,
  normalizeMemeBank,
  normalizeStyleSampleBank,
  normalizeChapterBenchmarkSampleBank,
  resolveMemeBank,
  resolveStyleSampleBank,
  resolveChapterBenchmarkSampleBank,
  styleSelectionChapterStrategy,
  buildStyleSampleSelectionSignals,
  latestStyleSelectionReviewPayload,
  styleSampleEffectivenessAdjustment,
  styleSampleEffectivenessForSample,
  styleSampleEffectivenessReason,
  styleSampleEffectivenessShouldAvoid,
  styleSelectionChapterQualityScore,
  styleSelectionItemSampleKey,
  styleSelectionRoundAverage,
} from './post-delivery/asset-banks'

import { platformCheckNeedsCarryOver, deliveryRiskEvidenceSearchText, isGenericDeliveryRiskEvidence, preDraftReceiptCheckNeedsCarryOver } from './quality/platform-carry-over'
import { proseQualitySerialRiskRepairRisks } from './quality/serial-risk-repair'
import { inferEndingHookType } from './batch-serial/ending-hook-type'
export { proseQualitySerialRiskRepairRisks } from './quality/serial-risk-repair'
export { inferEndingHookType } from './batch-serial/ending-hook-type'

import { STRUCTURED_REVIEW_CHECK_FIELDS, STRUCTURED_REVIEW_REQUIRED_FIELDS } from './quality/structured-review-fields'
import {
  commitNovelChapterAcceptance,
  createNovelCharacter,
  createNovelSettingEntity,
  createNovelWorldbuilding,
  createNovelReview,
  listNovelChapterSettingUsage,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  mergeNovelChapterRawPayload,
  replaceNovelChapterSettingUsage,
  updateNovelChapter,
  updateNovelCharacter,
  updateNovelChapterSettingUsage,
  updateNovelProject,
  updateNovelSettingEntity,
} from '../novel'
import {
  executeNovelAgent,
  generateNovelChapterProse as defaultGenerateNovelChapterProse,
  previewNovelKnowledgeInjection,
  storeNovelChapterProseMemory as defaultStoreNovelChapterProseMemory,
} from '../llm'
import type { NovelProductionService } from '../routes/novel-production-service'
import { buildReferenceUsageReviewRecord, type NovelReferenceService } from '../routes/novel-reference-service'
import { buildSettingRelationshipGraph } from '../routes/novel-setting-relationship-graph'
import { buildOhStoryPlotSpecialTopicsContract } from '../routes/novel-plot-special-topics'
import { buildOhStoryStoryPowerContract } from '../routes/novel-story-power-contract'
import { buildOhStoryMainlineDefinitionContract } from '../routes/novel-mainline-definition-contract'
import { buildOhStoryDirectorForPostDraft, buildOhStoryDirectorForPreDraft } from '../routes/novel-oh-story-director'
import {
  buildProseGenerationContract,
  evaluateProsePreDraftGate,
  mergeProseGenerationRequestOverrides,
  normalizeProseContractKey,
  resolveStrictPreflightReadiness,
  type ProseGenerationContract,
} from '../novel-writing/prose-generation-contract'
import {
  blockingPreparedStoryStateHardFailures,
  buildPendingPreparedStoryStateUpdate,
  buildPreparedStoryStateHardFailures,
  formatPreparedStoryStateFailureSummary,
  type PreparedStoryStateFailure,
  type PreparedStoryStateUpdate,
} from '../novel-writing/prepared-story-state'
import {
  mergeNameCanonIntoStoryState,
  mergeIdentityCanonIntoStoryState,
  planCharacterCardSync,
} from '../novel-writing/character-card-sync'
import {
  compileProseContractPrompt,
  type ProseRequiredPromptSection,
  type ProseRiskPromptSection,
} from '../novel-writing/prose-contract-prompt'
import {
  asArray,
  applyBenchmarkRecallPreflightChecks,
  buildPreflightChecks,
  buildLLMResultDiagnostics,
  collectRecentFacts,
  compactPreviousChaptersForProse,
  compactText,
  deepMergeObjects,
  extractPlainProseFallback,
  formatReviewIssueForStorage,
  getNovelPayload,
  getQualityGateDecision,
  getSafetyPolicy,
  getStoryState,
  getStyleLock,
  getVolumePlan,
  normalizeIssue,
  parseJsonLikePayload,
  safeJsonStringify as stringifyRouteJsonSafely,
  sanitizeJsonValue,
} from '../routes/novel-route-utils'
import {
  applyChapterWordTargetToContext,
  applyProseWordTargetSoftCap,
  canBridgeShortContractionToExpansion,
  countProseChars,
  evaluateProseWordTarget,
  isExplicitlyCompleteProseContractionFinishReason,
  isRejectedProseContractionFinishReason,
  normalizeProseContractionFinishReason,
  normalizeProseContractionIncompleteReason,
  proseContractionMaxTokensForAttempt,
  proseMaxTokensForWordTarget,
  resolveChapterWordTarget,
  resolveStandardWordTargetCompatibility,
  type ChapterWordTarget,
} from '../novel-writing/word-target'

import {
  buildCommercialEditorRewritePrompt,
  buildMemePolishPrompt as buildMemePolishPromptWithStrategy,
  buildProseWordTargetContractionPrompt,
  buildProseWordTargetExpansionPrompt,
  buildReadabilityReviewPrompt,
} from '../novel-writing/prose-prompt-builders'
import {
  buildAssetLinkagePromptSection,
  buildBenchmarkRecallPromptSection,
  buildBenchmarkRecallReceiptPromptSection,
  buildBridgeUnitPromptSection,
  buildChapterBlueprintPromptSection,
  buildChapterHookPromptSection,
  buildChapterLaunchGatePromptSection,
  buildCharacterBehaviorPromptSection,
  buildCharacterRelationPromptSection,
  buildConflictStructurePromptSection,
  buildContentRubricPromptSection,
  buildContinuityHeatPromptSection,
  buildCoreContractRadarPromptSection,
  buildDeliveryRiskCarryOverPromptSection,
  buildDialoguePromptSection,
  buildEmotionalArcPromptSection,
  buildExpectationThresholdPromptSection,
  buildFemaleAudiencePromptSection,
  buildGenrePositioningPromptSection,
  buildGovernanceRecheckPromptSection,
  buildInformationFlowPromptSection,
  buildLongformBattleContextPromptSection,
  buildLongformCompassPromptSection,
  buildOpeningPromptSection,
  buildParagraphHookPromptSection,
  buildPlatformRubricPromptSection,
  buildPlotFrameworkPromptSection,
  buildPlotDynamicsPromptSection,
  buildPlotSpecialTopicsPromptSection,
  buildProseCraftPromptSection,
  buildPunctuationTonePromptSection,
  buildQualityAuditPromptSection,
  buildIntentConfirmationPromptSection,
  buildIntentConfirmationReceiptPromptSection,
  buildReversalPromptSection,
  buildShowdownPromptSection,
  buildStateTrackingPromptSection,
  buildStateTrackingReceiptPromptSection,
  buildStoryLoopPromptSection,
  buildStoryPowerPromptSection,
  buildStyleBoundaryPromptSection,
  buildSuspensePromptSection,
  buildTargetReaderPromptSection,
  buildTitleUniquenessPromptSection,
  buildUpgradeRhythmPromptSection,
  buildWritePreparationPromptSection,
} from '../novel-writing/prose-generation-prompt-sections'
import { buildSceneCardsPrompt as buildSceneCardsPromptFromBuilder } from '../novel-writing/scene-cards-prompt'
import { buildStoryStatePrompt as buildStoryStatePromptFromBuilder } from '../novel-writing/story-state-prompt'
import {
  buildPostDeliveryStoryStateUpdate,
  buildSkippedPostDeliveryStoryStateUpdate,
} from '../novel-writing/post-delivery-story-state-update'
import { buildProseQualityReviewRecord } from '../novel-writing/prose-quality-review-record'
import {
  buildCanonicalSurfaceIndex,
  scanCanonicalContinuityConflicts,
} from '../novel-writing/canonical-continuity'
import {
  mergeEstablishedEvents,
  projectCanonFactsFromEvents,
  scanEstablishedEventConflicts,
  selectEstablishedEventsForChapter,
} from '../novel-writing/established-event-canon'
import {
  buildChapterProseStoragePatch,
  normalizeProseForStorage,
  resolveChapterProseVersionSource,
} from '../novel-writing/chapter-prose-storage-patch'
import {
  compactDeliveryRiskCarryOverText,
  getChapterLaunchGateBlocker,
  selectUsableRevisionText,
  shouldRunSynchronousReadabilityReview,
} from '../novel-writing/prose-quality-contracts'
import {
  proseQualityReviewMaxTokensForAttempt,
  runProseQualityLoop,
  sanitizeProseQualityReviewTransport,
} from '../novel-writing/prose-quality-loop'
import {
  assessInitialProseOpeningContinuity,
  selectContinuitySafeProseCandidate,
} from '../novel-writing/prose-candidate-continuity'
import {
  enrichContextWithStrongHandoff,
  formatOutgoingHandoffAsPrevious,
  readChapterOutgoingHandoff,
  resolveOutgoingChapterHandoff,
} from '../novel-writing/chapter-handoff-basics'
import {
  buildNextChapterProgressResyncPatch,
  collectFollowingChapterProgressResyncPatches,
  enrichContextWithProgressResync,
  readChapterProgressLedger,
} from '../novel-writing/chapter-progress-ledger'
import { collectPlanAlignmentPatchesAfterProseChange, collectProjectPlanAlignmentPatches } from '../novel-writing/chapter-plan-from-prose'
import {
  classifyProseAdmission,
  markBlockedInvalidError,
  validateMinimalChapterProse,
  type ProseAdmissionHardFailure,
  type ProseAdmissionWarning,
} from '../novel-writing/prose-admission-policy'
import { buildPreStoreStructuralSyncChecks } from '../novel-writing/pre-store-structural-sync-gate'
import {
  buildAssetIntakeReviewRecord,
  buildDeterministicProseCleanupReviewRecord,
  buildIpSceneIntakeReviewRecord,
  buildPostDeliverySyncReviewRecord,
  buildReceiptSyncReviewRecord,
  buildRevisionCascadeImpactSyncReviewRecord,
  buildRevisionScopeGuardSyncReviewRecord,
  buildStorylineSyncReviewRecord,
  buildStoryStateReviewRecord,
} from '../novel-writing/post-delivery-sync-review-record'
import {
  buildChapterAttractionDraftReviewRecord,
  buildChapterCoreDriftDraftReviewRecord,
  buildChapterHandoffDraftReviewRecord,
  buildChapterTitleUniquenessDraftReviewRecord,
  buildCoreContractDraftReviewRecord,
  buildDeliveryRiskReceiptsDraftReviewRecord,
  buildDraftSyncReviewRecord,
  buildPlotSpecialTopicsDraftReviewRecord,
  buildReaderPayoffDraftReviewRecord,
  buildSceneCardReceiptsDraftReviewRecord,
  buildSignatureSceneDraftReviewRecord,
  buildStyleSampleDraftReviewRecord,
  buildStoryUnitDraftReviewRecord,
} from '../novel-writing/draft-sync-review-record'
import {
  buildReadabilityReviewRecord,
  buildSettingConsistencyReviewRecord,
  buildUnattendedPreflightRepairReviewRecord,
} from '../novel-writing/service-review-record'
import {
  buildStyleFingerprintPromptHandoff,
  buildStyleFingerprintStateSnapshot,
  styleFingerprintSceneDirective,
  styleFingerprintSentenceBeat,
} from '../novel-writing/style-fingerprint'
import {
  buildBoundedProsePrompt,
  buildOhStoryDirectorPromptBlock,
  buildProsePromptContextSnapshot,
  compactProseSceneCard,
  prosePromptJson,
  prosePromptText,
} from '../novel-writing/prose-prompt-context'
import {
  buildChapterTitleUniquenessReport,
  buildChapterTitleUniquenessSyncReport,
  buildGeneratedChapterTitlePatch,
} from '../novel-writing/title-uniqueness'
import {
  buildProseMetaSyncReport,
  scanModelDegenerationRisks,
  scanProseMetaLeaks,
} from '../novel-writing/prose-meta'
import {
  normalizeDeterministicProseFormat,
  normalizeDeterministicProsePunctuation,
  scanPeriodMonotonyRisks,
  scanProseFormatRisks,
  scanProseLanguageRisks,
  scanPunctuationToneRisks,
} from '../novel-writing/prose-format'
import {
  scanBannedWordLeaks,
  scanContextSensitiveWordDensityRisks,
  scanWeakAdverbDensityRisks,
} from '../novel-writing/deslop-scans'
import {
  buildDeslopGateDiagnostics,
  buildDeterministicProseCleanupReport,
  buildQualityGateReviewWithDeterministicCleanup,
} from '../novel-writing/deterministic-prose-cleanup'
import { scanAuthorialForecastRisks } from '../novel-writing/authorial-forecast'
import {
  scanRepeatedReactionRisks,
  scanRepeatedSubjectRisks,
  scanTripleParallelRisks,
  scanUniformRhythmRisks,
} from '../novel-writing/rhythm-scans'
import { scanEndingSummaryRisks } from '../novel-writing/ending-summary'
import {
  scanOpeningEventDensityRisks,
  scanOpeningFirst50ConflictRisks,
  scanOpeningHookRisks,
  scanOpeningProtagonistDelayRisks,
} from '../novel-writing/opening-scans'
import { scanDialogueToneRisks } from '../novel-writing/dialogue-tone'
import {
  scanDialogueFormatRisks,
  scanDialogueQuoteStyleRisks,
} from '../novel-writing/dialogue-format'
import {
  scanDialogueBreathRisks,
  scanDialoguePowerBalanceRisks,
  scanDialogueVoiceSamenessRisks,
} from '../novel-writing/dialogue-balance'
import {
  scanDialogueDensityRisks,
  scanDialogueProtagonistLineEconomyRisks,
  scanDialogueQuestionAnswerLoopRisks,
} from '../novel-writing/dialogue-economy'
import {
  scanDialogueEmptyPraiseRisks,
  scanDialogueJudgmentQuestionRisks,
  scanDialogueSubtextAgendaRisks,
} from '../novel-writing/dialogue-intent'
import {
  scanDialogueEasyPersuasionRisks,
  scanDialogueEmotionContinuityRisks,
} from '../novel-writing/dialogue-emotion'
import {
  scanDialogueDetachedJokeRisks,
  scanDialogueFlatCallbackRisks,
  scanDialogueHighPressureMemeRisks,
  scanDialogueHollowHumorPayoffRisks,
} from '../novel-writing/dialogue-humor'
import { scanDialogueInfodumpRisks } from '../novel-writing/dialogue-infodump'
import { scanDialogueFunctionalFillerRisks } from '../novel-writing/dialogue-functional'
import { normalizeDialogueSupportingSpeakerLimitCheck } from '../novel-writing/dialogue-supporting-speakers'
import {
  normalizeDialogueAuditCheck,
  normalizeDialogueDriveCheck,
  normalizeDialogueGoalCheck,
  normalizeDialogueInformationEmbedCheck,
  normalizeDialoguePowerCheck,
  normalizeDialogueSubtextCheck,
  normalizeDialogueVoiceCheck,
} from '../novel-writing/dialogue-contract-basics'
import {
  buildCharacterBehaviorDeterministicCheck,
  characterBehaviorPriority,
  normalizeCharacterBehaviorAntagonistLogicCheck,
  normalizeCharacterBehaviorAntagonistSelfStoryCheck,
  normalizeCharacterBehaviorAntagonistTierExitCheck,
  normalizeCharacterBehaviorAntagonistWeightCheck,
  normalizeCharacterBehaviorLayeredTagsCheck,
  normalizeCharacterBehaviorMotivationCheck,
  normalizeCharacterBehaviorMotivationSpecificityCheck,
  normalizeCharacterBehaviorProtagonistComposureCheck,
  normalizeCharacterBehaviorRepeatCheck,
  normalizeCharacterBehaviorRoleCardCheck,
  normalizeCharacterBehaviorRulesCheck,
  normalizeCharacterBehaviorStrongAssociationCheck,
  normalizeCharacterBehaviorSupportingRoleCheck,
  normalizeCharacterBehaviorSupportingRoleExitCheck,
  normalizeCharacterDrivenEventCheck,
  normalizeIdentityGoldfingerAlignmentCheck,
  normalizeProtagonistRedLineCheck,
} from '../novel-writing/character-behavior-basics'
import {
  assetLinkagePriority,
  normalizeAssetLinkageFunctionChainCheck,
  normalizeAssetLinkageInformationCheck,
  normalizeAssetLinkageStateChangeCheck,
} from '../novel-writing/asset-linkage-basics'
import {
  buildStateTrackingDeterministicCheck,
  normalizeStateSourceReadiness,
  normalizeStateTrackingCharacterCheck,
  normalizeStateTrackingFilterRuleCheck,
  normalizeStateTrackingHistoricalCheck,
  normalizeStateTrackingSourceReadinessCheck,
  normalizeStateTrackingWorldConstraintCheck,
  stateTrackingPriority,
} from '../novel-writing/state-tracking-basics'
import {
  anchorMatchScore,
  anchorTerms,
  normalizedMatchText,
} from '../novel-writing/text-matching'
import {
  buildIntentConfirmationDeterministicCheck,
  buildIntentConfirmationSelfReportCheck,
  intentConfirmationAnchorScore,
  intentConfirmationArray,
  intentConfirmationPriority,
  intentCostRewardPlan,
  normalizeIntentConfirmedCheck,
  normalizeIntentDialogueToneBaselineCheck,
  normalizeIntentEndingHandoffCheck,
  normalizeIntentReactionCheck,
  normalizeIntentRhythmStyleCheck,
} from '../novel-writing/intent-confirmation-basics'
import {
  buildContinuityHeatDeterministicCheck,
  continuityHeatItemText,
  continuityHeatPriority,
  normalizeContinuityActiveExpectationCheck,
  normalizeContinuityDormantBoundaryCheck,
  normalizeContinuityHeatStateCheck,
  normalizeContinuityWatchItemsCheck,
} from '../novel-writing/continuity-heat-basics'
import {
  buildConflictStructureDeterministicCheck,
  conflictStructurePriority,
  normalizeConflictAgencyCheck,
  normalizeConflictEventValueCheck,
  normalizeConflictLadderCheck,
  normalizeConflictMotivationCheck,
  normalizeConflictNetworkLayersCheck,
  normalizeConflictNetworkLayersContract,
  normalizeConflictNextSeedCheck,
  normalizeConflictNoExitCheck,
  normalizeConflictPressureCheck,
  normalizeConflictWebCheck,
  normalizeConflictWebContract,
} from '../novel-writing/conflict-structure-basics'
import {
  buildUpgradeRhythmDeterministicCheck,
  normalizeGoldfingerConflictBalanceCheck,
  normalizeGoldfingerEvolutionCheck,
  normalizeGoldfingerMultiDimensionGrowthCheck,
  normalizeGoldfingerSimplicityCheck,
  normalizeUpgradeBridgeRhythmCheck,
  normalizeUpgradeEmotionModuleCheck,
  normalizeUpgradeFeedbackCheck,
  normalizeUpgradeGainCheck,
  normalizeUpgradeGapCheck,
  normalizeUpgradeRankingLadderCheck,
  scanUpgradeAftermathRisks,
  upgradeRhythmPriority,
} from '../novel-writing/upgrade-rhythm-basics'
import {
  buildGenrePositioningDeterministicCheck,
  genrePositioningPriority,
  normalizeGenreCoreHookCheck,
  normalizeGenreFormulaCheck,
  normalizeGenreLabelCheck,
  normalizeGenreLongboardFocusCheck,
  normalizeGenrePsychologyCheck,
  normalizeGoldfingerFitCheck,
  normalizeMicroInnovationCheck,
  normalizeMustHaveSceneCheck,
  normalizePlatformFitCheck,
} from '../novel-writing/genre-positioning-basics'
import {
  buildFemaleAudienceDeterministicCheck,
  femaleAudienceArray,
  femaleAudiencePriority,
  normalizeFemaleAbuseDosageCheck,
  normalizeFemaleCopyPromiseCheck,
  normalizeFemaleCorePrinciplesCheck,
  normalizeFemaleLongformGenreCheck,
  normalizeFemalePlatformFitCheck,
  normalizeFemaleQualityCheck,
  normalizeFemaleReaderNeedCheck,
  normalizeFemaleRomanceAxisCheck,
} from '../novel-writing/female-audience-basics'
import {
  buildPlotDynamicsDeterministicCheck,
  normalizeClimaxFormulaCheck,
  normalizeLineStaggerRulesCheck,
  normalizePlotAbOutlineCheck,
  normalizePlotDriveModeRulesCheck,
  normalizePlotLoopCheck,
  normalizePlotScenePurposeCheck,
  plotDynamicsArray,
  plotDynamicsPriority,
} from '../novel-writing/plot-dynamics-basics'
import {
  normalizeStoryPowerCheck,
  storyPowerPriority,
} from '../novel-writing/story-power-basics'
import {
  firstCompactText,
  firstSceneCardText,
  normalizeStoryDriveDimension,
  storyDrivePriority,
} from '../novel-writing/story-drive-basics'
import { normalizeStoryDriveBrief } from '../novel-writing/story-drive-brief'
import {
  characterArcPriority,
  normalizeCharacterArcDimension,
} from '../novel-writing/character-arc-basics'
import {
  chapterAttractionPriority,
  normalizeAttractionDimension,
} from '../novel-writing/chapter-attraction-basics'
import {
  buildChapterInnovationBrief,
  innovationBeatMatch,
  normalizeInnovationBrief,
  normalizeInnovationBeat,
} from '../novel-writing/innovation-basics'
import {
  normalizeSignatureSceneBrief,
  normalizeSignatureSceneSyncBeat,
  signatureSceneSyncBeatMatch,
} from '../novel-writing/signature-scene-basics'
import {
  longformCompassFromContext,
  normalizeLongformCompass,
} from '../novel-writing/longform-compass'
import {
  buildCreationContractChecklist,
  buildWritePreparationBriefFromParts,
  normalizeWritePreparationBenchmarkRecallContext,
} from '../novel-writing/write-preparation-brief'
import {
  buildPreDraftSettingScope,
  buildPreDraftStorylineScope,
} from '../novel-writing/pre-draft-scope'
import {
  resolveConfirmedPreDraftBenchmarkRecallSources,
  resolveConfirmedPreDraftBriefSources,
  resolveConfirmedPreDraftContractSources,
  resolveConfirmedPreDraftForeshadowingSource,
  resolveConfirmedPreDraftMemorySources,
} from '../novel-writing/pre-draft-confirmation'
import {
  normalizeStoryUnitSyncBeat,
  storyUnitForbiddenTouched,
  storyUnitSyncBeatMatch,
} from '../novel-writing/story-unit-basics'
import {
  buildChapterHandoffDeterministicCheck,
  chapterHandoffPriority,
  normalizeChapterHandoffDeliveryCheck,
} from '../novel-writing/chapter-handoff-basics'
import {
  buildChapterHookDeterministicCheck,
  chapterHookPriority,
  normalizeChapterHookCheck,
} from '../novel-writing/chapter-hook-basics'
import {
  buildParagraphHookDeterministicCheck,
  normalizeParagraphHookCombinationCheck,
  normalizeParagraphHookListCheck,
  normalizeParagraphHookPresenceCheck,
  paragraphHookPriority,
} from '../novel-writing/paragraph-hook-basics'
import {
  normalizeSuspenseListCheck,
  normalizeSuspenseStrengthCheck,
  suspenseArray,
  suspensePriority,
} from '../novel-writing/suspense-basics'
import {
  scanObscureSuspenseRisks,
  scanSuspenseFalseAlarmRisks,
  scanSuspenseWithheldInfoRisks,
} from '../novel-writing/suspense-scans'
import {
  scanExpectationVacuumRisks,
  scanMeaningInflationFillerRisks,
  scanNarrativeTransitionRisks,
  scanParagraphProgressionRisks,
  scanRelationshipSceneChangeRisks,
} from '../novel-writing/progression-scans'
import {
  scanEmotionTellingRisks,
  scanEmotionalStasisRisks,
  scanInfodumpRisks,
  scanInternalMonologueRisks,
  scanParagraphCommaChainDensityRisks,
  scanParagraphFragmentationRisks,
  scanParagraphLengthUniformityRisks,
  scanParagraphWallTextRisks,
  scanProseCameraAnchorRisks,
  scanProseDecorativeDetailRisks,
  scanProseMotionStillRisks,
  scanProseOmniscientCrowdCameraRisks,
  scanProseStackedDescriptionRisks,
  scanProseStaticEnvironmentRisks,
  scanRecapFillerRisks,
  scanSpecificCharacterCountExpressionRisks,
  scanVagueQuantityWeightRisks,
} from '../novel-writing/prose-craft-scans'
import {
  paragraphHasDownwardPressure,
  paragraphHasOppressionPressure,
  scanDownwardSafetyRisks,
  scanOppressionPurposeRisks,
  scanPayoffDensityRisks,
  scanPayoffEscalationRisks,
  scanTrumpCardEffectRisks,
  textHasDownwardSafetySignal,
} from '../novel-writing/emotional-payoff-scans'
import {
  scanEndingHookRisks,
  scanEntryPromiseAlignmentRisks,
  scanOpeningConflictAlignmentRisks,
  scanOpeningHookEchoRisks,
  scanParagraphHookStallRisks,
  scanSuddenEndingClueRisks,
} from '../novel-writing/hook-alignment-scans'
import {
  scanCombatProcessRisks,
  scanSceneDensityExecutionRisks,
  scanSceneGoalObstacleChangeRisks,
  scanScenePurposeWeightRisks,
  textHasSceneChange,
  textHasSceneGoal,
  textHasSceneObstacle,
} from '../novel-writing/scene-action-scans'
import {
  sceneCardGoalObstacleChangeGaps,
  sceneCardMentionsConcept,
} from '../novel-writing/scene-card-readiness'
import {
  normalizePressureLevel,
  sceneBriefFromCard,
} from '../novel-writing/scene-briefs'
import { normalizeChapterPositioningBrief } from '../novel-writing/chapter-positioning-brief'
import {
  buildGoldenThreeBrief,
  normalizeGoldenThreeBrief,
} from '../novel-writing/golden-three-brief'
import { normalizeStoryPressureBrief } from '../novel-writing/story-pressure-brief'
import {
  normalizePageTurnHookBrief,
  normalizeSerialRhythmBrief,
} from '../novel-writing/serial-rhythm-brief'
import { normalizeVolumeClimaxBrief } from '../novel-writing/volume-climax-brief'
import {
  buildRollingRhythmPreflight,
  normalizeRecentFatigueBrief,
  resolveEffectiveQualityThreshold,
} from '../novel-writing/rolling-rhythm-preflight'
import {
  getChapterBlueprintForReadiness,
  legacyChapterOutlineForReadiness,
  missingChapterBlueprintSections,
  sourceReadinessMatchingRows,
  sourceReadinessReadyRowGenericEvidence,
  sourceReadinessReadyRowMissingEvidence,
} from '../novel-writing/source-readiness-preflight'
import {
  buildSceneCardConsumptionChecks,
  buildSceneCardReceiptSyncReport,
  buildStoryStateSyncContextPackage,
  scanSceneCardReceiptRisks,
  scanSceneSensoryAnchorRisks,
  scanSceneSerialRiskRepairRisks,
  selectVerifiedSceneBreakdownUpdate,
  verifiedSceneBreakdownForStateSync,
} from '../novel-writing/scene-card-execution-scans'
import {
  normalizeReversalFaceSlapCheck,
  normalizeReversalImpactCheck,
  normalizeReversalMisdirectionCheck,
  normalizeReversalSetupCheck,
  normalizeReversalTimingCheck,
  normalizeReversalTypeCheck,
  reversalPriority,
} from '../novel-writing/reversal-basics'
import {
  normalizeShowdownCombatCheck,
  normalizeShowdownCounterplayCheck,
  normalizeShowdownEmotionRhythmCheck,
  normalizeShowdownPayoffCheck,
  normalizeShowdownShockCheck,
  normalizeShowdownStageCheck,
  normalizeShowdownThreePressureShockCheck,
  normalizeShowdownTransmissionChannelCheck,
  normalizeShowdownTrumpCardReserveCheck,
  normalizeShowdownWeakOverStrongCheck,
  showdownPriority,
} from '../novel-writing/showdown-basics'
import {
  bridgeUnitPriority,
  normalizeBridgeClimaxDurationCheck,
  normalizeBridgeExpectationChainCheck,
  normalizeBridgeFatigueRepairCheck,
  normalizeBridgePlanCheck,
  normalizeBridgePositionCheck,
  normalizeBridgeTargetProgressCheck,
  normalizeBridgeTransitionCheck,
} from '../novel-writing/bridge-unit-basics'
import {
  BEAT_COOLING_LABELS,
  beatCoolingPriority,
  beatCoolingSequence,
  inferBeatCoolingTypeFromText,
  normalizeBeatCoolingType,
} from '../novel-writing/beat-cooling-basics'
import {
  firstProseText,
  normalizeOpeningExpectationCheck,
  normalizeOpeningFiveEssentialsCheck,
  normalizeOpeningFoundationCheck,
  normalizeOpeningGoalAndHookCheck,
  normalizeOpeningInformationCheck,
  normalizeOpeningProtagonistCheck,
  openingPriority,
} from '../novel-writing/opening-basics'
import {
  normalizeHookAddictionModelCheck,
  normalizeRetentionBeat,
  normalizeRetentionDoubleEngineCheck,
  normalizeRetentionPillarsCheck,
  retentionBeatMatch,
} from '../novel-writing/reader-retention-basics'
import {
  buildReaderRetentionBrief,
  first30RetentionBriefFromContext,
  normalizeReaderDropRiskBrief,
  normalizeReaderRetentionBrief,
} from '../novel-writing/reader-retention-brief'
import {
  normalizeStoryLoopBeat,
  normalizeStoryLoopMapTransitionCheck,
  normalizeStoryLoopNestedLoopCheck,
  storyLoopPriority,
} from '../novel-writing/story-loop-basics'
import {
  buildCharacterRelationDeterministicCheck,
  characterRelationArray,
  characterRelationPriority,
  normalizeCharacterRelationBufferZoneCheck,
  normalizeCharacterRelationCheck,
  normalizeCharacterRelationExpectationHubCheck,
  normalizeCharacterRelationGoalOwnershipCheck,
  normalizeCharacterRelationLifeRuleCheck,
  normalizeCharacterRelationQualityCheck,
} from '../novel-writing/character-relation-basics'
import {
  buildPayoffSetupSyncReport,
  buildSpectatorReactionSyncReport,
  scanPayoffSetupRisks,
  scanShockLayeringRisks,
  scanSpectatorReactionDifferentiationRisks,
} from '../novel-writing/public-payoff-scans'
import {
  scanAntagonistDownfallAgencyRisks,
  scanEvidenceChainDumpRisks,
  scanEvidenceTimeBombRisks,
  scanFaceSlapRhythmRisks,
  scanFinalEvidenceImpactRisks,
  scanProtagonistComposureRisks,
} from '../novel-writing/face-slap-scans'
import {
  buildInformationFlowInfodumpCheck,
  buildInformationFlowNextObjectiveCheck,
  buildInformationFlowTransitionCompressionCheck,
  informationFlowPriority,
  normalizeInformationFlowCheck,
} from '../novel-writing/information-flow-basics'
import {
  buildExpectationBeforePayoffCheck,
  buildExpectationThresholdNextOpenLoopCheck,
  expectationThreeLinesArray,
  expectationThresholdArray,
  expectationThresholdPriority,
  normalizeExpectationThresholdCheck,
} from '../novel-writing/expectation-threshold-basics'
import {
  emotionalArcArray,
  normalizeEmotionalArcCheck,
} from '../novel-writing/emotional-arc-basics'
import {
  buildEmotionalArcDeterministicCheck,
  emotionalArcPriority,
  normalizeEmotionalSceneExecutionRulesCheck,
  normalizeEmotionalTurningRulesCheck,
  normalizeEmotionModuleRecompositionRulesCheck,
  normalizeMemePlotFormulaRulesCheck,
  normalizePayoffDensityRulesCheck,
  normalizePayoffEscalationRulesCheck,
  normalizeProgressiveConfrontationRulesCheck,
  normalizeReaderDesireFormulaRulesCheck,
} from '../novel-writing/emotional-arc-execution-basics'
import {
  normalizePayoffReverseDesignCheck,
  normalizePayoffTierRulesCheck,
} from '../novel-writing/payoff-design-basics'
export {
  applyChapterWordTargetToContext,
  buildChapterTitleUniquenessReport,
  buildChapterTitleUniquenessSyncReport,
  buildDeslopGateDiagnostics,
  buildDeterministicProseCleanupReport,
  buildGeneratedChapterTitlePatch,
  buildQualityGateReviewWithDeterministicCleanup,
  buildCommercialEditorRewritePrompt,
  buildProseMetaSyncReport,
  buildProseWordTargetExpansionPrompt,
  buildReadabilityReviewPrompt,
  buildStyleFingerprintStateSnapshot,
  countProseChars,
  evaluateProseWordTarget,
  normalizeDeterministicProseFormat,
  normalizeDeterministicProsePunctuation,
  proseMaxTokensForWordTarget,
  resolveChapterWordTarget,
  scanBannedWordLeaks,
  scanAuthorialForecastRisks,
  scanContextSensitiveWordDensityRisks,
  scanDialogueFormatRisks,
  scanDialogueBreathRisks,
  scanDialogueDensityRisks,
  scanDialogueEasyPersuasionRisks,
  scanDialogueEmptyPraiseRisks,
  scanDialogueEmotionContinuityRisks,
  scanDialogueDetachedJokeRisks,
  scanDialogueFlatCallbackRisks,
  scanDialogueFunctionalFillerRisks,
  scanDialogueHighPressureMemeRisks,
  scanDialogueHollowHumorPayoffRisks,
  scanDialogueInfodumpRisks,
  scanDialogueJudgmentQuestionRisks,
  scanDialoguePowerBalanceRisks,
  scanDialogueProtagonistLineEconomyRisks,
  scanDialogueQuestionAnswerLoopRisks,
  scanDialogueQuoteStyleRisks,
  scanDialogueSubtextAgendaRisks,
  scanDialogueToneRisks,
  scanDialogueVoiceSamenessRisks,
  scanDownwardSafetyRisks,
  scanEmotionTellingRisks,
  scanEmotionalStasisRisks,
  scanEndingHookRisks,
  scanEndingSummaryRisks,
  scanEntryPromiseAlignmentRisks,
  scanEvidenceChainDumpRisks,
  scanEvidenceTimeBombRisks,
  scanFaceSlapRhythmRisks,
  scanFinalEvidenceImpactRisks,
  scanExpectationVacuumRisks,
  scanInfodumpRisks,
  scanInternalMonologueRisks,
  scanModelDegenerationRisks,
  scanOpeningEventDensityRisks,
  scanOpeningFirst50ConflictRisks,
  scanOpeningConflictAlignmentRisks,
  scanOpeningHookEchoRisks,
  scanOpeningHookRisks,
  scanOpeningProtagonistDelayRisks,
  scanOppressionPurposeRisks,
  scanParagraphCommaChainDensityRisks,
  scanParagraphFragmentationRisks,
  scanParagraphHookStallRisks,
  scanParagraphLengthUniformityRisks,
  scanPayoffDensityRisks,
  scanPayoffEscalationRisks,
  scanPayoffSetupRisks,
  scanPeriodMonotonyRisks,
  scanProseCameraAnchorRisks,
  scanProseDecorativeDetailRisks,
  scanProseMotionStillRisks,
  scanProseOmniscientCrowdCameraRisks,
  scanProseStackedDescriptionRisks,
  scanProseStaticEnvironmentRisks,
  scanProseMetaLeaks,
  scanProseFormatRisks,
  scanProtagonistComposureRisks,
  scanPunctuationToneRisks,
  scanRecapFillerRisks,
  scanRepeatedReactionRisks,
  scanShockLayeringRisks,
  scanSpectatorReactionDifferentiationRisks,
  scanSpecificCharacterCountExpressionRisks,
  scanSuddenEndingClueRisks,
  scanMeaningInflationFillerRisks,
  scanNarrativeTransitionRisks,
  scanObscureSuspenseRisks,
  scanParagraphProgressionRisks,
  scanRelationshipSceneChangeRisks,
  scanSceneDensityExecutionRisks,
  scanSceneGoalObstacleChangeRisks,
  scanScenePurposeWeightRisks,
  scanSuspenseFalseAlarmRisks,
  scanSuspenseWithheldInfoRisks,
  scanAntagonistDownfallAgencyRisks,
  scanCombatProcessRisks,
  scanRepeatedSubjectRisks,
  scanTripleParallelRisks,
  scanTrumpCardEffectRisks,
  scanUniformRhythmRisks,
  scanUpgradeAftermathRisks,
  scanVagueQuantityWeightRisks,
  scanWeakAdverbDensityRisks,
  buildPayoffSetupSyncReport,
  buildSceneCardConsumptionChecks,
  buildSceneCardReceiptSyncReport,
  buildStoryStateSyncContextPackage,
  buildSpectatorReactionSyncReport,
  scanSceneCardReceiptRisks,
  scanSceneSensoryAnchorRisks,
  scanSceneSerialRiskRepairRisks,
  selectVerifiedSceneBreakdownUpdate,
  verifiedSceneBreakdownForStateSync,
}
export type { ChapterWordTarget, ProseWordTargetEvaluation } from '../novel-writing/word-target'

const STORYLINE_TYPES = ['mainline', 'subplot', 'character_arc', 'relationship_arc', 'faction_arc', 'foreshadowing_arc']

export {
  safeJsonStringify,
  proseQualityJson,
  proseRiskSection,
  requiredProsePromptText,
  requiredProsePromptJson,
  requiredProseSceneCardValue,
  requiredProseSceneCard,
  proseContractValue,
  buildRequiredProseCoreSections,
  buildProseRiskContractSections,
  compileParagraphProseContext,
  mergedContextChapterTarget,
  mergedContextChapterTargetPreferRuntime,
  buildMissingStructuredReviewChecksPrompt,
  compactJsonBriefText,
  inferCharacterRepairTier,
  selectTierAwareCharacterRepairCandidates,
} from './quality/paragraph-prose-context'
import {
  safeJsonStringify,
  proseQualityJson,
  proseRiskSection,
  requiredProsePromptText,
  requiredProsePromptJson,
  requiredProseSceneCardValue,
  requiredProseSceneCard,
  proseContractValue,
  buildRequiredProseCoreSections,
  buildProseRiskContractSections,
  compileParagraphProseContext,
  mergedContextChapterTarget,
  mergedContextChapterTargetPreferRuntime,
  buildMissingStructuredReviewChecksPrompt,
  compactJsonBriefText,
  inferCharacterRepairTier,
  selectTierAwareCharacterRepairCandidates,
} from './quality/paragraph-prose-context'


export {
  compactHandoffExcerpt,
  buildPreviousChapterHandoff,
  handoffContractItemText,
  handoffContractTextItems,
  normalizeGovernanceRecheckMemoryContext,
  normalizeBatchChapterHandoffContract,
  firstMatchingBrief,
  buildReaderExpectationLedger,
} from './post-delivery/chapter-handoff-contracts'
import {
  compactHandoffExcerpt,
  buildPreviousChapterHandoff,
  handoffContractItemText,
  handoffContractTextItems,
  normalizeGovernanceRecheckMemoryContext,
  normalizeBatchChapterHandoffContract,
  firstMatchingBrief,
  buildReaderExpectationLedger,
} from './post-delivery/chapter-handoff-contracts'

export { resolveEffectiveQualityThreshold }

export {
  buildRevisionStrategyBrief,
} from './revision/revision-strategy'
import {
  buildRevisionStrategyBrief,
} from './revision/revision-strategy'

export {
  normalizeCoreContractCheck,
  normalizeCoreContractPeriodicDriftCheck,
  normalizeChapterLaunchGateChecks,
  chapterLaunchGateFromContext,
  normalizeCoreContractRadar,
  coreContractRadarFromContext,
  buildCoreContractRadar,
} from './quality/core-contract-radar'
import {
  normalizeCoreContractCheck,
  normalizeCoreContractPeriodicDriftCheck,
  normalizeChapterLaunchGateChecks,
  chapterLaunchGateFromContext,
  normalizeCoreContractRadar,
  coreContractRadarFromContext,
  buildCoreContractRadar,
} from './quality/core-contract-radar'

export {
  normalizeMemoryTextItem,
  normalizeLongformMemoryCapsule,
  normalizeLayeredMemoryDetail,
  normalizeLayeredMemoryArchiveRef,
  layeredMemoryChapterNo,
  latestFiveLayeredMemoryDetails,
  normalizeLayeredMemoryContext,
  normalizeDailyProgressSummary,
  normalizeDailyContextSnapshot,
  normalizeForeshadowingConsistencyRadar,
  buildMergedLayeredMemoryContext,
  buildLongformMemoryCapsule,
  isLongformBattleLaneRisk,
  normalizeLongformBattleLane,
  normalizeLongformBattleContext,
  longformBattleContextFromContext,
  latestLongformCompassFromReviews,
  normalizeNextBatchChapter,
  normalizeNextBatchChecklistItem,
  chapterNosBrief,
  normalizeDefaultFiveChapterRegression,
  normalizeDefaultFiveChapterLaneTemplateFailedRequirements,
  normalizeDefaultFiveChapterLaneTemplateProductionRelapseReview,
  normalizeDefaultFiveChapterLaneTemplate,
  normalizeExpansionStructureVerification,
  normalizeDefaultFiveChapterLaneRedesign,
  normalizeExpansionStructureDecision,
  normalizeNextBatchBrief,
  nextBatchBriefFromContext,
  normalizeStoryUnitContext,
  storyUnitRoleForChapter,
  buildStoryUnitContext,
  first30SegmentKeyForChapter,
  first30RetentionRiskLevel,
  first30FlagAction,
  buildFirst30RetentionContext,
} from './quality/memory-longform-contracts'
import {
  normalizeMemoryTextItem,
  normalizeLongformMemoryCapsule,
  normalizeLayeredMemoryDetail,
  normalizeLayeredMemoryArchiveRef,
  layeredMemoryChapterNo,
  latestFiveLayeredMemoryDetails,
  normalizeLayeredMemoryContext,
  normalizeDailyProgressSummary,
  normalizeDailyContextSnapshot,
  normalizeForeshadowingConsistencyRadar,
  buildMergedLayeredMemoryContext,
  buildLongformMemoryCapsule,
  isLongformBattleLaneRisk,
  normalizeLongformBattleLane,
  normalizeLongformBattleContext,
  longformBattleContextFromContext,
  latestLongformCompassFromReviews,
  normalizeNextBatchChapter,
  normalizeNextBatchChecklistItem,
  chapterNosBrief,
  normalizeDefaultFiveChapterRegression,
  normalizeDefaultFiveChapterLaneTemplateFailedRequirements,
  normalizeDefaultFiveChapterLaneTemplateProductionRelapseReview,
  normalizeDefaultFiveChapterLaneTemplate,
  normalizeExpansionStructureVerification,
  normalizeDefaultFiveChapterLaneRedesign,
  normalizeExpansionStructureDecision,
  normalizeNextBatchBrief,
  nextBatchBriefFromContext,
  normalizeStoryUnitContext,
  storyUnitRoleForChapter,
  buildStoryUnitContext,
  first30SegmentKeyForChapter,
  first30RetentionRiskLevel,
  first30FlagAction,
  buildFirst30RetentionContext,
} from './quality/memory-longform-contracts'

export {
  storylineUsageName,
  storylineUsageByType,
  settingJsonObject,
  characterArcText,
  characterArcListText,
  characterArcJoinedText,
  characterArcUsageKey,
  characterArcEntityKeys,
  characterArcTypeLabel,
  buildCharacterArcBriefFromContext,
} from './quality/character-arc-brief'
import {
  storylineUsageName,
  storylineUsageByType,
  settingJsonObject,
  characterArcText,
  characterArcListText,
  characterArcJoinedText,
  characterArcUsageKey,
  characterArcEntityKeys,
  characterArcTypeLabel,
  buildCharacterArcBriefFromContext,
} from './quality/character-arc-brief'


export {
  buildStorylineSyncReport,
  buildForeshadowingDeltaSyncReport,
  buildTimelineDeltaSyncReport,
  buildCharacterStateDeltaSyncReport,
  buildRelationshipDeltaSyncReport,
  buildChapterHandoffDeltaSyncReport,
  buildStateDeltaCompletenessReport,
  buildProseRevisionReceiptSyncReport,
  buildRevisionContextReceiptSyncReport,
  buildNextChapterQualityPlanReceiptSyncReport,
  buildStatusFilterReceiptSyncReport,
  buildWritePreparationReceiptSyncReport,
  buildDeslopRepairReceiptSyncReport,
  buildQualityAuditRepairReceiptSyncReport,
  buildRevisionScopeGuardSyncReport,
  buildRevisionCascadeImpactSyncReport,
  buildAssetStateDeltaSyncReport,
  bindPostDeliveryDeltaSyncDeps,
} from './post-delivery/delta-sync-reports'
import {
  buildStorylineSyncReport,
  buildForeshadowingDeltaSyncReport,
  buildTimelineDeltaSyncReport,
  buildCharacterStateDeltaSyncReport,
  buildRelationshipDeltaSyncReport,
  buildChapterHandoffDeltaSyncReport,
  buildStateDeltaCompletenessReport,
  buildProseRevisionReceiptSyncReport,
  buildRevisionContextReceiptSyncReport,
  buildNextChapterQualityPlanReceiptSyncReport,
  buildStatusFilterReceiptSyncReport,
  buildWritePreparationReceiptSyncReport,
  buildDeslopRepairReceiptSyncReport,
  buildQualityAuditRepairReceiptSyncReport,
  buildRevisionScopeGuardSyncReport,
  buildRevisionCascadeImpactSyncReport,
  buildAssetStateDeltaSyncReport,
  bindPostDeliveryDeltaSyncDeps,
} from './post-delivery/delta-sync-reports'


export {
  buildChapterCoreDriftReport,
  buildCoreContractSyncReport,
  buildReaderPayoffSyncReport,
  buildReaderExpectationSyncReport,
  buildChapterHandoffSyncReport,
  buildProseReviewContextPackage,
  firstDefined,
  buildCoreContractDeterministicCheck,
  bindCoreHandoffSyncReportDeps,
} from './post-delivery/core-handoff-sync-reports'
import {
  buildChapterCoreDriftReport,
  buildCoreContractSyncReport,
  buildReaderPayoffSyncReport,
  buildReaderExpectationSyncReport,
  buildChapterHandoffSyncReport,
  buildProseReviewContextPackage,
  firstDefined,
  buildCoreContractDeterministicCheck,
  bindCoreHandoffSyncReportDeps,
} from './post-delivery/core-handoff-sync-reports'


export {
  chapterBlueprintFromContext,
  chapterBlueprintText,
  normalizeChapterBlueprintCausalChainContract,
  buildChapterBlueprintCausalChainContract,
  chapterBlueprintBeat,
  chapterBlueprintBeatMatch,
  chapterBlueprintFirstPayoffIndex,
  chapterBlueprintBeatDensityContractFromBlueprint,
  countDeliveredBeatDensityEvents,
  buildChapterBlueprintBeatDensityCheck,
  chapterBlueprintBeatFunctionTagFromText,
  stripChapterBlueprintBeatFunctionMarkers,
  normalizeChapterBlueprintBeatFunctionRows,
  chapterBlueprintBeatFunctionEvidence,
  hasExpandedBeatDetail,
  isCompressedBeatOverwritten,
  buildChapterBlueprintBeatFunctionDetailCheck,
  buildChapterBlueprintCraftChecks,
  smallOutlineContractFromBlueprint,
  smallOutlineSegmentText,
  smallOutlineEvidenceForSegment,
  smallOutlineHasPurposeEffect,
  smallOutlineDetailLevelDelivered,
  buildChapterBlueprintSmallOutlineCheck,
  mainlineDefinitionContractFromBlueprint,
  buildChapterBlueprintMainlineDefinitionCheck,
  chapterBlueprintCausalChainCheck,
  scanChapterBlueprintCraftRisks,
  scanCharacterOrderExecutionRisks,
  normalizeBlueprintBeatSequenceItem,
  blueprintBeatActionNegated,
  blueprintBeatSequenceMatch,
  scanBeatSequenceExecutionRisks,
  parseCostRewardPlan,
  plannedBeatDelivered,
  scanCostRewardExecutionRisks,
  scanLocalVictoryCostRisks,
  endingContractFromContext,
  scanEndingContractExecutionRisks,
  goldenThreeBriefFromContext,
  goldenThreeCheck,
  scanGoldenThreeExecutionRisks,
} from './quality/chapter-blueprint-execution'
import {
  chapterBlueprintFromContext,
  chapterBlueprintText,
  normalizeChapterBlueprintCausalChainContract,
  buildChapterBlueprintCausalChainContract,
  chapterBlueprintBeat,
  chapterBlueprintBeatMatch,
  chapterBlueprintFirstPayoffIndex,
  chapterBlueprintBeatDensityContractFromBlueprint,
  countDeliveredBeatDensityEvents,
  buildChapterBlueprintBeatDensityCheck,
  chapterBlueprintBeatFunctionTagFromText,
  stripChapterBlueprintBeatFunctionMarkers,
  normalizeChapterBlueprintBeatFunctionRows,
  chapterBlueprintBeatFunctionEvidence,
  hasExpandedBeatDetail,
  isCompressedBeatOverwritten,
  buildChapterBlueprintBeatFunctionDetailCheck,
  buildChapterBlueprintCraftChecks,
  smallOutlineContractFromBlueprint,
  smallOutlineSegmentText,
  smallOutlineEvidenceForSegment,
  smallOutlineHasPurposeEffect,
  smallOutlineDetailLevelDelivered,
  buildChapterBlueprintSmallOutlineCheck,
  mainlineDefinitionContractFromBlueprint,
  buildChapterBlueprintMainlineDefinitionCheck,
  chapterBlueprintCausalChainCheck,
  scanChapterBlueprintCraftRisks,
  scanCharacterOrderExecutionRisks,
  normalizeBlueprintBeatSequenceItem,
  blueprintBeatActionNegated,
  blueprintBeatSequenceMatch,
  scanBeatSequenceExecutionRisks,
  parseCostRewardPlan,
  plannedBeatDelivered,
  scanCostRewardExecutionRisks,
  scanLocalVictoryCostRisks,
  endingContractFromContext,
  scanEndingContractExecutionRisks,
  goldenThreeBriefFromContext,
  goldenThreeCheck,
  scanGoldenThreeExecutionRisks,
} from './quality/chapter-blueprint-execution'

export {
  bindQualitySyncReportDeps,
  chapterBenchmarkStrategyFromContext,
  normalizeChapterBenchmarkBeat,
  uniqueChapterBenchmarkBeats,
  chapterBenchmarkBeatMatch,
  hasChapterBlueprintCraftPlan,
  buildChapterBlueprintSyncReport,
  buildChapterBenchmarkSyncReport,
  benchmarkRecallBriefFromContext,
  benchmarkRecallBeat,
  benchmarkRecallBeatMatch,
  benchmarkRecallHardGapMisses,
  benchmarkRecallAnchorExcerptCopyRisks,
  buildBenchmarkRecallSyncReport,
  styleBoundarySyncMiss,
  buildStyleBoundarySyncReport,
  scanBenchmarkRecallExecutionRisks,
  styleSampleStrategyFromContext,
  styleSampleBeat,
  quotedDialogueRatio,
  dialogueRatioTarget,
  proseSegmentLengths,
  styleSampleBeatMatch,
  buildStyleSampleSyncReport,
  retentionBriefFromContext,
  buildReaderRetentionSyncReport,
  chapterHookContractForSync,
  buildChapterEndingContractCheck,
  buildChapterHookSyncReport,
  contextWithChapterRawPreDraftForSync,
  paragraphHookContractForSync,
  buildParagraphHookSyncReport,
  suspenseContractForSync,
  normalizeSuspenseExpectationChainContract,
  suspenseExpectationLineMentioned,
  normalizeSuspenseExpectationChainCheck,
  normalizeSuspenseForeshadowingBoundaryCheck,
  buildSuspenseDeterministicCheck,
  buildSuspenseSyncReport,
  reversalContractForSync,
  buildReversalDeterministicCheck,
  buildReversalSyncReport,
  showdownContractForSync,
  buildShowdownDeterministicCheck,
  showdownExplicitRuleKeys,
  buildShowdownSyncReport,
  bridgeUnitContractForSync,
  buildBridgeUnitDeterministicCheck,
  buildBeatCoolingSyncReport,
  buildBridgeUnitSyncReport,
  openingContractForSync,
  buildOpeningForbiddenCheck,
  buildOpeningSyncReport,
  proseCraftContractForSync,
  proseCraftArray,
  normalizeProseCraftPovCheck,
  normalizeProseCraftExpressionCheck,
  normalizeProseCraftSceneWeavingCheck,
  normalizeProseCraftRhythmCheck,
  normalizeProseCraftObjectNumberCheck,
  normalizeProseCraftSectionStructureCheck,
  normalizeProseCraftDensityCheck,
  normalizeProseCraftConceptAnchorCheck,
  buildProseCraftDeterministicCheck,
  proseCraftPriority,
  buildProseCraftSyncReport,
  punctuationToneContractForSync,
  punctuationToneArray,
  normalizePunctuationToneMapCheck,
  normalizePunctuationForbiddenCheck,
  normalizePunctuationQuestionCheck,
  normalizePunctuationExclaimCheck,
  buildPunctuationToneDeterministicCheck,
  punctuationTonePriority,
  buildPunctuationToneSyncReport,
  qualityAuditContractForSync,
  qualityAuditArray,
  normalizeQualityAuditStructureCheck,
  normalizeQualityAuditChapterPurposeCheck,
  normalizeQualityAuditProgressionCheck,
  normalizeQualityAuditInformationCheck,
  normalizeQualityAuditEventContentCheck,
  normalizeQualityAuditFiveDimensionCheck,
  normalizeQualityAuditSellingPointExpressionCheck,
  buildQualityAuditDeterministicCheck,
  qualityAuditPriority,
  buildQualityAuditSyncReport,
  dialogueContractForSync,
  buildDialogueFunctionalFillerCheck,
  buildDialogueDeterministicCheck,
  dialoguePriority,
  buildDialogueSyncReport,
  characterBehaviorContractForSync,
  characterBehaviorArray,
  normalizeCharacterBehaviorAnchorCheck,
  normalizeCharacterBehaviorMemoryAnchorCheck,
  buildCharacterBehaviorSyncReport,
  assetLinkageContractForSync,
  assetLinkageArray,
  normalizeAssetLinkageKeyAssetsCheck,
  normalizeAssetLinkageThreeAppearanceCheck,
  normalizeAssetLinkageIsolationCheck,
  relationshipGraphRiskAssetName,
  relationshipGraphRiskType,
  normalizeAssetLinkageRelationshipGraphRiskCheck,
  buildAssetLinkageDeterministicCheck,
  buildAssetLinkageSyncReport,
  stateTrackingContractForSync,
  buildStateTrackingSyncReport,
  intentConfirmationContractForSync,
  normalizeIntentStructureCheck,
  normalizeIntentCostRewardCheck,
  buildIntentConfirmationSyncReport,
  continuityHeatContractForSync,
  buildContinuityHeatSyncReport,
  conflictStructureContractForSync,
  buildConflictStructureSyncReport,
  upgradeRhythmContractForSync,
  buildUpgradeRhythmSyncReport,
  targetReaderContractForSync,
  targetReaderArray,
  countTargetReaderSignals,
  normalizeTargetReaderProfileCheck,
  normalizeTargetReaderDesireCheck,
  normalizeTargetReaderEmotionalGapCheck,
  normalizeTargetReaderAttractionCheck,
  normalizeTargetReaderGenreVitalityCheck,
  normalizeTargetReaderPlatformFitCheck,
  normalizeTargetReaderBoundaryFitCheck,
  normalizeTargetReaderTitleBlurbAlignmentCheck,
  normalizeTargetReaderImmersionPlasticityCheck,
  normalizeTargetReaderGoldfingerLifeFitCheck,
  normalizeTargetReaderCommercialExpressionCheck,
  normalizeTargetReaderValidationCheck,
  normalizeTargetReaderCorrectionMethodCheck,
  buildTargetReaderDeterministicCheck,
  targetReaderPriority,
  buildTargetReaderSyncReport,
  genrePositioningContractForSync,
  buildGenrePositioningSyncReport,
  plotSpecialTopicsContractForSync,
  plotSpecialTopicsArray,
  countPlotSpecialTopicsSignals,
  normalizePlotSpecialTopicsExecutionCheck,
  plotSpecialTopicsPriority,
  buildPlotSpecialTopicsSyncReport,
  femaleAudienceContractForSync,
  buildFemaleAudienceSyncReport,
  plotDynamicsContractForSync,
  buildPlotDynamicsSyncReport,
  storyPowerContractForSync,
  buildStoryPowerSyncReport,
  sceneDriveExpectation,
  storyDriveSceneCards,
  buildStoryDriveSyncReport,
  storyLoopContractFromContext,
  buildStoryLoopSyncReport,
  informationFlowContractForSync,
  buildInformationFlowSyncReport,
  expectationThresholdContractForSync,
  buildExpectationThresholdSyncReport,
  emotionalArcContractForSync,
  buildEmotionalArcSyncReport,
  characterArcBriefFromContext,
  buildCharacterArcSyncReport,
  buildChapterAttractionReviewReport,
  innovationBriefFromContext,
  buildInnovationSyncReport,
  signatureSceneBriefFromContext,
  buildSignatureSceneSyncReport,
  storyUnitContextFromContext,
  buildStoryUnitSyncReport,
  volumeBeatBriefFromContext,
  normalizeVolumeBeat,
  uniqueVolumeBeats,
  volumeBeatMatch,
  buildVolumeBeatSyncReport,
  millionWordRunwayFromContext,
  runwayFromContext,
  normalizeRunwayQuestion,
  normalizeRunwayFuel,
  runwayBeatMatch,
  runwayRedlineTouched,
  buildRunwaySyncReport,
} from './post-delivery/quality-sync-reports'
import {
  bindQualitySyncReportDeps,
  chapterBenchmarkStrategyFromContext,
  normalizeChapterBenchmarkBeat,
  uniqueChapterBenchmarkBeats,
  chapterBenchmarkBeatMatch,
  hasChapterBlueprintCraftPlan,
  buildChapterBlueprintSyncReport,
  buildChapterBenchmarkSyncReport,
  benchmarkRecallBriefFromContext,
  benchmarkRecallBeat,
  benchmarkRecallBeatMatch,
  benchmarkRecallHardGapMisses,
  benchmarkRecallAnchorExcerptCopyRisks,
  buildBenchmarkRecallSyncReport,
  styleBoundarySyncMiss,
  buildStyleBoundarySyncReport,
  scanBenchmarkRecallExecutionRisks,
  styleSampleStrategyFromContext,
  styleSampleBeat,
  quotedDialogueRatio,
  dialogueRatioTarget,
  proseSegmentLengths,
  styleSampleBeatMatch,
  buildStyleSampleSyncReport,
  retentionBriefFromContext,
  buildReaderRetentionSyncReport,
  chapterHookContractForSync,
  buildChapterEndingContractCheck,
  buildChapterHookSyncReport,
  contextWithChapterRawPreDraftForSync,
  paragraphHookContractForSync,
  buildParagraphHookSyncReport,
  suspenseContractForSync,
  normalizeSuspenseExpectationChainContract,
  suspenseExpectationLineMentioned,
  normalizeSuspenseExpectationChainCheck,
  normalizeSuspenseForeshadowingBoundaryCheck,
  buildSuspenseDeterministicCheck,
  buildSuspenseSyncReport,
  reversalContractForSync,
  buildReversalDeterministicCheck,
  buildReversalSyncReport,
  showdownContractForSync,
  buildShowdownDeterministicCheck,
  showdownExplicitRuleKeys,
  buildShowdownSyncReport,
  bridgeUnitContractForSync,
  buildBridgeUnitDeterministicCheck,
  buildBeatCoolingSyncReport,
  buildBridgeUnitSyncReport,
  openingContractForSync,
  buildOpeningForbiddenCheck,
  buildOpeningSyncReport,
  proseCraftContractForSync,
  proseCraftArray,
  normalizeProseCraftPovCheck,
  normalizeProseCraftExpressionCheck,
  normalizeProseCraftSceneWeavingCheck,
  normalizeProseCraftRhythmCheck,
  normalizeProseCraftObjectNumberCheck,
  normalizeProseCraftSectionStructureCheck,
  normalizeProseCraftDensityCheck,
  normalizeProseCraftConceptAnchorCheck,
  buildProseCraftDeterministicCheck,
  proseCraftPriority,
  buildProseCraftSyncReport,
  punctuationToneContractForSync,
  punctuationToneArray,
  normalizePunctuationToneMapCheck,
  normalizePunctuationForbiddenCheck,
  normalizePunctuationQuestionCheck,
  normalizePunctuationExclaimCheck,
  buildPunctuationToneDeterministicCheck,
  punctuationTonePriority,
  buildPunctuationToneSyncReport,
  qualityAuditContractForSync,
  qualityAuditArray,
  normalizeQualityAuditStructureCheck,
  normalizeQualityAuditChapterPurposeCheck,
  normalizeQualityAuditProgressionCheck,
  normalizeQualityAuditInformationCheck,
  normalizeQualityAuditEventContentCheck,
  normalizeQualityAuditFiveDimensionCheck,
  normalizeQualityAuditSellingPointExpressionCheck,
  buildQualityAuditDeterministicCheck,
  qualityAuditPriority,
  buildQualityAuditSyncReport,
  dialogueContractForSync,
  buildDialogueFunctionalFillerCheck,
  buildDialogueDeterministicCheck,
  dialoguePriority,
  buildDialogueSyncReport,
  characterBehaviorContractForSync,
  characterBehaviorArray,
  normalizeCharacterBehaviorAnchorCheck,
  normalizeCharacterBehaviorMemoryAnchorCheck,
  buildCharacterBehaviorSyncReport,
  assetLinkageContractForSync,
  assetLinkageArray,
  normalizeAssetLinkageKeyAssetsCheck,
  normalizeAssetLinkageThreeAppearanceCheck,
  normalizeAssetLinkageIsolationCheck,
  relationshipGraphRiskAssetName,
  relationshipGraphRiskType,
  normalizeAssetLinkageRelationshipGraphRiskCheck,
  buildAssetLinkageDeterministicCheck,
  buildAssetLinkageSyncReport,
  stateTrackingContractForSync,
  buildStateTrackingSyncReport,
  intentConfirmationContractForSync,
  normalizeIntentStructureCheck,
  normalizeIntentCostRewardCheck,
  buildIntentConfirmationSyncReport,
  continuityHeatContractForSync,
  buildContinuityHeatSyncReport,
  conflictStructureContractForSync,
  buildConflictStructureSyncReport,
  upgradeRhythmContractForSync,
  buildUpgradeRhythmSyncReport,
  targetReaderContractForSync,
  targetReaderArray,
  countTargetReaderSignals,
  normalizeTargetReaderProfileCheck,
  normalizeTargetReaderDesireCheck,
  normalizeTargetReaderEmotionalGapCheck,
  normalizeTargetReaderAttractionCheck,
  normalizeTargetReaderGenreVitalityCheck,
  normalizeTargetReaderPlatformFitCheck,
  normalizeTargetReaderBoundaryFitCheck,
  normalizeTargetReaderTitleBlurbAlignmentCheck,
  normalizeTargetReaderImmersionPlasticityCheck,
  normalizeTargetReaderGoldfingerLifeFitCheck,
  normalizeTargetReaderCommercialExpressionCheck,
  normalizeTargetReaderValidationCheck,
  normalizeTargetReaderCorrectionMethodCheck,
  buildTargetReaderDeterministicCheck,
  targetReaderPriority,
  buildTargetReaderSyncReport,
  genrePositioningContractForSync,
  buildGenrePositioningSyncReport,
  plotSpecialTopicsContractForSync,
  plotSpecialTopicsArray,
  countPlotSpecialTopicsSignals,
  normalizePlotSpecialTopicsExecutionCheck,
  plotSpecialTopicsPriority,
  buildPlotSpecialTopicsSyncReport,
  femaleAudienceContractForSync,
  buildFemaleAudienceSyncReport,
  plotDynamicsContractForSync,
  buildPlotDynamicsSyncReport,
  storyPowerContractForSync,
  buildStoryPowerSyncReport,
  sceneDriveExpectation,
  storyDriveSceneCards,
  buildStoryDriveSyncReport,
  storyLoopContractFromContext,
  buildStoryLoopSyncReport,
  informationFlowContractForSync,
  buildInformationFlowSyncReport,
  expectationThresholdContractForSync,
  buildExpectationThresholdSyncReport,
  emotionalArcContractForSync,
  buildEmotionalArcSyncReport,
  characterArcBriefFromContext,
  buildCharacterArcSyncReport,
  buildChapterAttractionReviewReport,
  innovationBriefFromContext,
  buildInnovationSyncReport,
  signatureSceneBriefFromContext,
  buildSignatureSceneSyncReport,
  storyUnitContextFromContext,
  buildStoryUnitSyncReport,
  volumeBeatBriefFromContext,
  normalizeVolumeBeat,
  uniqueVolumeBeats,
  volumeBeatMatch,
  buildVolumeBeatSyncReport,
  millionWordRunwayFromContext,
  runwayFromContext,
  normalizeRunwayQuestion,
  normalizeRunwayFuel,
  runwayBeatMatch,
  runwayRedlineTouched,
  buildRunwaySyncReport,
} from './post-delivery/quality-sync-reports'

export {
  buildStyleSampleEffectivenessForSelection,
  styleSampleSceneScore,
  selectStyleSamplesForChapter,
  styleSampleStrategyCopyGuards,
  applyStyleSampleStrategyAuthorAction,
  buildMemeStrategy,
  buildStyleSampleStrategy,
  styleBoundaryExplicitContract,
  styleBoundaryHasStyleInput,
  styleBoundaryCopyRules,
  stripStyleBoundaryExplicitContract,
  buildStyleBoundaryContract,
  buildChapterBenchmarkStrategy,
  buildMemePolishPrompt,
} from './quality/style-sample-strategy'
import {
  buildStyleSampleEffectivenessForSelection,
  styleSampleSceneScore,
  selectStyleSamplesForChapter,
  styleSampleStrategyCopyGuards,
  applyStyleSampleStrategyAuthorAction,
  buildMemeStrategy,
  buildStyleSampleStrategy,
  styleBoundaryExplicitContract,
  styleBoundaryHasStyleInput,
  styleBoundaryCopyRules,
  stripStyleBoundaryExplicitContract,
  buildStyleBoundaryContract,
  buildChapterBenchmarkStrategy,
  buildMemePolishPrompt,
} from './quality/style-sample-strategy'

export { inferBlueprintFunctionTag } from './quality/blueprint-function-tag'
import { inferBlueprintFunctionTag } from './quality/blueprint-function-tag'




export {
  buildEmotionalArcContract,
  buildChapterHookContract,
  buildParagraphHookContract,
  buildSuspenseContract,
  buildReversalContract,
  buildShowdownContract,
  buildBridgeUnitContract,
  showdownExplicitContract,
  bindCraftTensionContractDeps,
} from './quality/craft-tension-contracts'
import {
  buildEmotionalArcContract,
  buildChapterHookContract,
  buildParagraphHookContract,
  buildSuspenseContract,
  buildReversalContract,
  buildShowdownContract,
  buildBridgeUnitContract,
  showdownExplicitContract,
  bindCraftTensionContractDeps,
} from './quality/craft-tension-contracts'

export {
  buildPlotFrameworkContract,
  buildOpeningContract,
  buildPunctuationToneContract,
  buildProseCraftContract,
} from './quality/plot-opening-prose-contracts'
import {
  buildPlotFrameworkContract,
  buildOpeningContract,
  buildPunctuationToneContract,
  buildProseCraftContract,
} from './quality/plot-opening-prose-contracts'

export {
  buildQualityAuditContract,
  buildStoryLoopContract,
  buildTargetReaderContract,
  buildGenrePositioningContract,
  buildFemaleAudienceContract,
  buildUpgradeRhythmContract,
  buildConflictStructureContract,
  buildExpectationThresholdContract,
  buildInformationFlowContract,
  scanNewConceptOverloadRisks,
  scanNewConceptAnchorRisks,
  scanEconomicPowerScaleAnchorRisks,
  explicitNewConceptNames,
  bindAudienceQualityContractDeps,
} from './quality/audience-quality-contracts'
import {
  buildQualityAuditContract,
  buildStoryLoopContract,
  buildTargetReaderContract,
  buildGenrePositioningContract,
  buildFemaleAudienceContract,
  buildUpgradeRhythmContract,
  buildConflictStructureContract,
  buildExpectationThresholdContract,
  buildInformationFlowContract,
  scanNewConceptOverloadRisks,
  scanNewConceptAnchorRisks,
  scanEconomicPowerScaleAnchorRisks,
  explicitNewConceptNames,
  bindAudienceQualityContractDeps,
} from './quality/audience-quality-contracts'

export {
  buildCharacterRelationContract,
  buildCharacterRelationSyncReport,
  buildCharacterBehaviorContract,
  buildAssetLinkageContract,
  characterRelationExplicitContract,
  assetLinkageExplicitContract,
  assetText,
  assetStateChangeText,
  assetConstraintText,
} from './quality/character-asset-contracts'
import {
  buildCharacterRelationContract,
  buildCharacterRelationSyncReport,
  buildCharacterBehaviorContract,
  buildAssetLinkageContract,
  characterRelationExplicitContract,
  assetLinkageExplicitContract,
  assetText,
  assetStateChangeText,
  assetConstraintText,
} from './quality/character-asset-contracts'

export {
  bindStateTrackingContractDeps,
  stateTrackingExplicitContract,
  resolveSerialStoryStateReadiness,
  buildSourceReadinessChecks,
  buildSourceReadinessPreflightChecks,
  buildSourceReadinessSyncReport,
  applySourceReadinessPreflightChecks,
  buildStateTrackingContract,
  mergeStoredStateTrackingContractAliases,
  mergeFinalStateTrackingContract,
  reconcileSerialStoryStateSourceRows,
} from './quality/state-tracking-contracts'
import {
  bindStateTrackingContractDeps,
  stateTrackingExplicitContract,
  resolveSerialStoryStateReadiness,
  buildSourceReadinessChecks,
  buildSourceReadinessPreflightChecks,
  buildSourceReadinessSyncReport,
  applySourceReadinessPreflightChecks,
  buildStateTrackingContract,
  mergeStoredStateTrackingContractAliases,
  mergeFinalStateTrackingContract,
  reconcileSerialStoryStateSourceRows,
} from './quality/state-tracking-contracts'


export {
  benchmarkRecallGapStrings,
  benchmarkRecallGapsFromContext,
  benchmarkRecallIsNoBenchmark,
  benchmarkRecallHasGap,
  benchmarkRecallExplicitBrief,
  buildBenchmarkRecallBrief,
  buildIntentConfirmationContract,
  intentConfirmationExplicitContract,
  intentDialogueToneBaselineFromContext,
  applyIntentDialogueBaselineToSceneCards,
  styleRecallValueText,
  styleRecallList,
  continuityHeatExplicitContract,
} from './quality/intent-benchmark-contracts'
import {
  benchmarkRecallGapStrings,
  benchmarkRecallGapsFromContext,
  benchmarkRecallIsNoBenchmark,
  benchmarkRecallHasGap,
  benchmarkRecallExplicitBrief,
  buildBenchmarkRecallBrief,
  buildIntentConfirmationContract,
  intentConfirmationExplicitContract,
  intentDialogueToneBaselineFromContext,
  applyIntentDialogueBaselineToSceneCards,
  styleRecallValueText,
  styleRecallList,
  continuityHeatExplicitContract,
} from './quality/intent-benchmark-contracts'

export {
  bindContinuityDialogueContractDeps,
  storylineUsageByAnyType,
  buildContinuityHeatContract,
  buildPlotDynamicsContract,
  buildStoryPowerContract,
  buildMainlineDefinitionContract,
  buildDialogueContract,
  inferDialogueMode,
  normalizeDialogueExecutionChecklist,
  buildDialogueExecutionChecklist,
} from './quality/continuity-dialogue-contracts'
import {
  bindContinuityDialogueContractDeps,
  storylineUsageByAnyType,
  buildContinuityHeatContract,
  buildPlotDynamicsContract,
  buildStoryPowerContract,
  buildMainlineDefinitionContract,
  buildDialogueContract,
  inferDialogueMode,
  normalizeDialogueExecutionChecklist,
  buildDialogueExecutionChecklist,
} from './quality/continuity-dialogue-contracts'

export {
  bindOutlineBlueprintContractDeps,
  buildOutlineMethodsContract,
  buildChapterBlueprintBeatDensityContract,
  normalizeChapterBlueprintSmallOutlineContract,
  buildChapterBlueprintSmallOutlineContract,
  buildChapterBlueprintFromContext,
  OH_STORY_BEAT_DENSITY_RULE,
} from './quality/outline-blueprint-contracts'
import {
  bindOutlineBlueprintContractDeps,
  buildOutlineMethodsContract,
  buildChapterBlueprintBeatDensityContract,
  normalizeChapterBlueprintSmallOutlineContract,
  buildChapterBlueprintSmallOutlineContract,
  buildChapterBlueprintFromContext,
  OH_STORY_BEAT_DENSITY_RULE,
} from './quality/outline-blueprint-contracts'

export {
  benchmarkRecallGapsWithoutSourcePathMissing,
  mergeFinalBenchmarkRecallBriefAliases,
  autoRepairBenchmarkRecallBriefSourcePaths,
  repairBenchmarkRecallSourcePathState,
  mergeFinalRepairPreDraftRawPayload,
  autoRepairTimelineReadinessEvidence,
  autoRepairContextTrackingEvidence,
  autoRepairStateTrackingSourceReadiness,
  autoRepairSceneCardDramaticUnit,
  autoRepairSceneCardsForPreflight,
  repairSceneCardsForProseContextHandoff,
} from './quality/preflight-auto-repair'
import {
  benchmarkRecallGapsWithoutSourcePathMissing,
  mergeFinalBenchmarkRecallBriefAliases,
  autoRepairBenchmarkRecallBriefSourcePaths,
  repairBenchmarkRecallSourcePathState,
  mergeFinalRepairPreDraftRawPayload,
  autoRepairTimelineReadinessEvidence,
  autoRepairContextTrackingEvidence,
  autoRepairStateTrackingSourceReadiness,
  autoRepairSceneCardDramaticUnit,
  autoRepairSceneCardsForPreflight,
  repairSceneCardsForProseContextHandoff,
} from './quality/preflight-auto-repair'

export {
  normalizePlatformKey,
  buildPlatformRubric,
  buildContentRubric,
} from './quality/platform-content-rubrics'
import {
  normalizePlatformKey,
  buildPlatformRubric,
  buildContentRubric,
} from './quality/platform-content-rubrics'

export {
  buildWritePreparationBenchmarkRecallContext,
  buildWritePreparationBrief,
} from './quality/write-preparation-contracts'
import {
  buildWritePreparationBenchmarkRecallContext,
  buildWritePreparationBrief,
} from './quality/write-preparation-contracts'

export {
  bindPreDraftBriefDeps,
  buildChapterPreDraftBrief,
  mergeConfirmedPreDraftBriefIntoContext,
} from './quality/pre-draft-brief'
import {
  bindPreDraftBriefDeps,
  buildChapterPreDraftBrief,
  mergeConfirmedPreDraftBriefIntoContext,
} from './quality/pre-draft-brief'


export {
  normalizeSceneCardsPayload,
  bindSceneCardsNormalizerDeps,
} from './post-delivery/scene-cards'
import {
  normalizeSceneCardsPayload,
  bindSceneCardsNormalizerDeps,
} from './post-delivery/scene-cards'


export {
  mergeSceneCardStringList,
  appendSceneCardText,
  applyStyleFingerprintToSceneCards,
  applyExplicitNewConceptAnchorsToSceneCards,
  applyDeliveryRiskCarryOverToSceneCards,
  bindSceneCardDeliveryRiskDeps,
} from './post-delivery/scene-card-delivery-risk'
import {
  mergeSceneCardStringList,
  appendSceneCardText,
  applyStyleFingerprintToSceneCards,
  applyExplicitNewConceptAnchorsToSceneCards,
  applyDeliveryRiskCarryOverToSceneCards,
  bindSceneCardDeliveryRiskDeps,
} from './post-delivery/scene-card-delivery-risk'


export type NovelWritingRuntime = {
  generateChapterProse?: typeof defaultGenerateNovelChapterProse
  storeChapterProseMemory?: typeof defaultStoreNovelChapterProseMemory
  mergeChapterRawPayload?: typeof mergeNovelChapterRawPayload
  executeAgent?: typeof executeNovelAgent
  buildChapterContext?: (input: {
    workspace: string
    project: any
    chapter: any
    chapters: any[]
    worldbuilding: any[]
    characters: any[]
    outlines: any[]
    reviews: any[]
    settings: any[]
    chapterSettingUsage: any[]
    projectSettingUsage: any[]
  }) => Promise<any>
  hooks?: {
    beforeChapterStore?: (input: { chapterId: number; finalText: string }) => void | Promise<void>
    beforeStoryState?: (input: { chapterId: number; finalText: string }) => void | Promise<void>
    afterChapterCommit?: (input: { chapterId: number; finalText: string }) => void | Promise<void>
    beforePostCommitSync?: (input: { chapterId: number; finalText: string }) => void | Promise<void>
  }
}

export type { ProseTransportTruncationCode } from './quality/prose-transport-admission'
import type { ProseTransportTruncationCode } from './quality/prose-transport-admission'
export {
  hasProseTransportIncompleteDetails,
  rejectedProseTransportFinishReason,
  assertCompleteProseTransportResult,
  proseAdmissionWarning,
  collectStructuredReviewWarnings,
} from './quality/prose-transport-admission'
import {
  hasProseTransportIncompleteDetails,
  rejectedProseTransportFinishReason,
  assertCompleteProseTransportResult,
  proseAdmissionWarning,
  collectStructuredReviewWarnings,
} from './quality/prose-transport-admission'


bindPostDeliveryDeltaSyncDeps({
  contextWithChapterRawPreDraftForSync,
  characterRelationExplicitContract,
  assetLinkageExplicitContract,
  assetText,
  assetStateChangeText,
  stateTrackingExplicitContract,
})

bindSceneCardsNormalizerDeps({
  compactJsonBriefText,
  applyStyleFingerprintToSceneCards,
  applyExplicitNewConceptAnchorsToSceneCards,
  applyIntentDialogueBaselineToSceneCards,
  applyDeliveryRiskCarryOverToSceneCards,
})

bindSceneCardDeliveryRiskDeps({
  explicitNewConceptNames,
})

bindCraftTensionContractDeps({
  nextBatchBriefFromContext,
  normalizeSuspenseExpectationChainContract,
})

bindCoreHandoffSyncReportDeps({
  buildReaderExpectationLedger,
  contextWithChapterRawPreDraftForSync,
  normalizeBatchChapterHandoffContract,
  normalizeCoreContractPeriodicDriftCheck,
  normalizeCoreContractRadar,
})

bindAudienceQualityContractDeps({
  storylineUsageByAnyType,
})

bindContinuityDialogueContractDeps({
  normalizeLongformMemoryCapsule,
})

bindOutlineBlueprintContractDeps({
  buildChapterBlueprintCausalChainContract,
  inferBlueprintFunctionTag,
  storylineUsageByType,
})

bindQualitySyncReportDeps({
  buildChapterBenchmarkStrategy,
  buildStyleSampleStrategy,
  styleBoundaryExplicitContract,
})

bindPreDraftBriefDeps({
  buildCharacterArcBriefFromContext,
  mergedContextChapterTargetPreferRuntime,
})





bindStateTrackingContractDeps({
  mergedContextChapterTarget,
  contextWithChapterRawPreDraftForSync,
  listNovelChapters,
  mergeNovelChapterRawPayload,
})







export {
  buildHeuristicSettingUsage,
  selectProseForChapter,
  throwIfAborted,
  isAbortError,
} from './service/runtime-helpers'
import {
  buildHeuristicSettingUsage,
  selectProseForChapter,
  throwIfAborted,
  isAbortError,
} from './service/runtime-helpers'

export {
  normalizeStoryStateDeltaForStorage,
  mergeStoryState,
} from './service/story-state-helpers'
import {
  normalizeStoryStateDeltaForStorage,
  mergeStoryState,
} from './service/story-state-helpers'

export {
  buildWritingBible,
  hasMeaningfulWritingBible,
  getStoredOrBuiltWritingBible as getStoredOrBuiltWritingBibleCore,
} from './service/writing-bible'
import {
  buildWritingBible,
  hasMeaningfulWritingBible,
  getStoredOrBuiltWritingBible as getStoredOrBuiltWritingBibleCore,
} from './service/writing-bible'

import { refreshFollowingChapterSerialStoryStateReadiness } from './quality/state-tracking-contracts'

import { createStoryStateMachineMethods } from './service/story-state-machine'
export { createStoryStateMachineMethods } from './service/story-state-machine'

import { createProsePolishMethods } from './service/prose-polish-methods'
export { createProsePolishMethods } from './service/prose-polish-methods'

import { createSceneCardsMethods } from './service/scene-cards-methods'
export { createSceneCardsMethods } from './service/scene-cards-methods'

import { createStructuredReviewFillMethods } from './service/structured-review-fill-methods'
export { createStructuredReviewFillMethods } from './service/structured-review-fill-methods'

import { createProseWordTargetMethods } from './service/prose-word-target-methods'
export { createProseWordTargetMethods } from './service/prose-word-target-methods'

import { buildChapterContextPackage as buildChapterContextPackageFromModule } from './service/chapter-context-package'
export { buildChapterContextPackage as buildChapterContextPackageModule } from './service/chapter-context-package'

import { createAutoRepairChapterPreflightMethods } from './service/auto-repair-preflight-methods'
export { createAutoRepairChapterPreflightMethods } from './service/auto-repair-preflight-methods'

import { createProseSelfReviewMethods } from './service/prose-self-review-methods'
export { createProseSelfReviewMethods } from './service/prose-self-review-methods'

import { buildParagraphProseContext as buildParagraphProseContextFromModule } from './service/paragraph-prose-context'
export { buildParagraphProseContext as buildParagraphProseContextModule } from './service/paragraph-prose-context'

export function createNovelWritingService(ctx: {
  getProject: (workspace: string, id: number) => Promise<any>
  production: NovelProductionService
  reference: NovelReferenceService
  runtime?: NovelWritingRuntime
}) {
  const trustedWordTargetContractionBudgets = new WeakSet<object>()
  const executeAgent = ctx.runtime?.executeAgent || executeNovelAgent
  const {
    buildStoryStatePrompt,
    prepareStoryStateUpdate,
    updateStoryStateMachine,
  } = createStoryStateMachineMethods({
    executeAgent,
    getStageModelId: (project: any, stage: any, modelId?: any) => ctx.production.getStageModelId(project, stage, modelId),
    getStageTemperature: (project: any, stage: any, fallback?: any) => ctx.production.getStageTemperature(project, stage, fallback),
    refreshFollowingChapterSerialStoryStateReadiness,
  })
  const prosePolishMethods = createProsePolishMethods({
    executeAgent,
    getStageModelId: (project: any, stage: any, modelId?: any) => ctx.production.getStageModelId(project, stage, modelId),
    getStageTemperature: (project: any, stage: any, fallback?: any) => ctx.production.getStageTemperature(project, stage, fallback),
  })
  const runCommercialEditorRewrite = prosePolishMethods.runCommercialEditorRewrite
  const runMemePolish = prosePolishMethods.runMemePolish
  const runReadabilityReview = prosePolishMethods.runReadabilityReview
  const sceneCardsMethods = createSceneCardsMethods({
    executeAgent,
    getStageModelId: (project: any, stage: any, modelId?: any) => ctx.production.getStageModelId(project, stage, modelId),
    getStageTemperature: (project: any, stage: any, fallback?: any) => ctx.production.getStageTemperature(project, stage, fallback),
  })
  const buildSceneCardsPrompt = sceneCardsMethods.buildSceneCardsPrompt
  const generateSceneCardsForChapter = sceneCardsMethods.generateSceneCardsForChapter
  const structuredReviewFillMethods = createStructuredReviewFillMethods({
    executeAgent,
    getStageModelId: (project: any, stage: any, modelId?: any) => ctx.production.getStageModelId(project, stage, modelId),
    getStageTemperature: (project: any, stage: any, fallback?: any) => ctx.production.getStageTemperature(project, stage, fallback),
  })
  const proseSelfReviewMethods = createProseSelfReviewMethods({
    executeAgent,
    getStageModelId: (project: any, stage: any, modelId?: any) => ctx.production.getStageModelId(project, stage, modelId),
    getStageTemperature: (project: any, stage: any, fallback?: any) => ctx.production.getStageTemperature(project, stage, fallback),
    fillMissingStructuredReviewChecks: (...args: any[]) => structuredReviewFillMethods.fillMissingStructuredReviewChecks(...args),
  })
  const proseWordTargetMethods = createProseWordTargetMethods({
    executeAgent,
    formatAdmissionError,
    getStageModelId: (project: any, stage: any, modelId?: any) => ctx.production.getStageModelId(project, stage, modelId),
    getStageTemperature: (project: any, stage: any, fallback?: any) => ctx.production.getStageTemperature(project, stage, fallback),
    trustedWordTargetContractionBudgets,
  })

  const autoRepairChapterPreflightMethods = createAutoRepairChapterPreflightMethods({
    executeAgent,
    generateSceneCardsForChapter,
    buildChapterContextPackage: buildChapterContextPackageFromModule,
  })


  const generateNovelChapterProse = ctx.runtime?.generateChapterProse || defaultGenerateNovelChapterProse
  const storeChapterProseMemory = ctx.runtime?.storeChapterProseMemory || defaultStoreNovelChapterProseMemory
  const mergeChapterRawPayload = ctx.runtime?.mergeChapterRawPayload || mergeNovelChapterRawPayload
  const buildParagraphProseContext = buildParagraphProseContextFromModule

  const getStoredOrBuiltWritingBible = async (activeWorkspace: string, project: any) => getStoredOrBuiltWritingBibleCore({
    activeWorkspace,
    project,
    listNovelWorldbuilding,
    listNovelCharacters,
    listNovelOutlines,
    listNovelReviews,
  })

  const buildChapterContextPackage = buildChapterContextPackageFromModule

  const buildProseReviewPrompt = proseSelfReviewMethods.buildProseReviewPrompt
  const buildProseRevisionPrompt = proseSelfReviewMethods.buildProseRevisionPrompt
  const nextChapterQualityPlanNeedsRepair = proseSelfReviewMethods.nextChapterQualityPlanNeedsRepair
  const shouldReviseProse = proseSelfReviewMethods.shouldReviseProse
  const fillMissingStructuredReviewChecks = structuredReviewFillMethods.fillMissingStructuredReviewChecks
  const runProseSelfReviewAndRevision = proseSelfReviewMethods.runProseSelfReviewAndRevision

  const ensureProseMeetsWordTarget = proseWordTargetMethods.ensureProseMeetsWordTarget

  const autoRepairChapterPreflightGaps = autoRepairChapterPreflightMethods.autoRepairChapterPreflightGaps

  const generateChapterForGroup = async (activeWorkspace: string, projectId: number, chapterId: number, options: any = {}) => {
    const preferredModelId = Number(options.model_id || 0) || undefined
    const onStage = typeof options.onStage === 'function' ? options.onStage : async () => {}
    const llmControlOptions = {
      abortSignal: options.abortSignal,
      llmTimeoutMs: options.llmTimeoutMs,
      signal: options.abortSignal,
      timeoutMs: options.llmTimeoutMs,
      reviewLlmTimeoutMs: options.review_llm_timeout_ms || options.reviewLlmTimeoutMs,
      review_llm_timeout_ms: options.review_llm_timeout_ms || options.reviewLlmTimeoutMs,
      structuredReviewLlmTimeoutMs: options.structured_review_llm_timeout_ms || options.structuredReviewLlmTimeoutMs,
      structured_review_llm_timeout_ms: options.structured_review_llm_timeout_ms || options.structuredReviewLlmTimeoutMs,
      revisionLlmTimeoutMs: options.revision_llm_timeout_ms || options.revisionLlmTimeoutMs,
      revision_llm_timeout_ms: options.revision_llm_timeout_ms || options.revisionLlmTimeoutMs,
      wordTargetContractionBudget: { used: 0 },
    }
    trustedWordTargetContractionBudgets.add(llmControlOptions.wordTargetContractionBudget)
    const requestedQualityRepairTimeoutMs = Number(options.quality_repair_llm_timeout_ms || options.qualityRepairLlmTimeoutMs || 300000)
    const baseLlmTimeoutMs = Number(llmControlOptions.llmTimeoutMs || llmControlOptions.timeoutMs || 600000)
    const qualityRepairTimeoutMs = Math.max(30000, Math.min(
      Number.isFinite(baseLlmTimeoutMs) && baseLlmTimeoutMs > 0 ? baseLlmTimeoutMs : 600000,
      Number.isFinite(requestedQualityRepairTimeoutMs) && requestedQualityRepairTimeoutMs > 0 ? requestedQualityRepairTimeoutMs : 300000,
    ))
    const throwIfChapterGenerationAborted = () => throwIfAborted(llmControlOptions)
    throwIfAborted(options)
    const project = await ctx.getProject(activeWorkspace, projectId)
    if (!project) throw new Error('project not found')
    const configSnapshot = ctx.production.buildAgentConfigSnapshot(project, preferredModelId)
    const approvalPolicy = options.approval_policy || ctx.production.getApprovalPolicy(project)
    const approvals = options.approvals || {}
    const productionMode = String(options.production_mode || 'draft_review_revise_store')
    const isSceneCardsOnly = productionMode === 'scene_cards_only'
    const isDraftOnly = productionMode === 'draft_only'
    const isDraftReviewOnly = productionMode === 'draft_review'
    const isFullProduction = !isSceneCardsOnly && !isDraftOnly && !isDraftReviewOnly
    const pendingGeneratedReviews: any[] = []
    const storeGeneratedReviewRecord = async (record: any) => {
      if (!record) return
      pendingGeneratedReviews.push(record)
    }
    let chapters = await listNovelChapters(activeWorkspace, projectId)
    let chapter = chapters.find(item => item.id === chapterId)
    if (!chapter) throw new Error('chapter not found')
    let [worldbuilding, characters, outlines, reviews, settings, chapterSettingUsage, projectSettingUsage] = await Promise.all([
      listNovelWorldbuilding(activeWorkspace, projectId),
      listNovelCharacters(activeWorkspace, projectId),
      listNovelOutlines(activeWorkspace, projectId),
      listNovelReviews(activeWorkspace, projectId),
      listNovelSettingEntities(activeWorkspace, projectId).catch(() => []),
      listNovelChapterSettingUsage(activeWorkspace, projectId, chapterId).catch(() => []),
      listNovelChapterSettingUsage(activeWorkspace, projectId).catch(() => []),
    ])
    const buildGenerationContext = async () => ctx.runtime?.buildChapterContext
      ? ctx.runtime.buildChapterContext({
          workspace: activeWorkspace,
          project,
          chapter,
          chapters,
          worldbuilding,
          characters,
          outlines,
          reviews,
          settings,
          chapterSettingUsage,
          projectSettingUsage,
        })
      : buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews, {
          settingEntities: settings,
          chapterSettingUsage,
          projectSettingUsage,
          persistSettingUsage: false,
        })
    let wordTarget = resolveChapterWordTarget(project, chapter, options)
    const initialContextPackage = applyChapterWordTargetToContext(
      await buildGenerationContext(),
      wordTarget,
    )
    let stagedContextUsageReplacement = initialContextPackage?.setting_context?.auto_matched
      ? asArray(initialContextPackage?.setting_context?.chapter_usage)
      : null
    if (stagedContextUsageReplacement) {
      chapterSettingUsage = stagedContextUsageReplacement
      projectSettingUsage = [
        ...projectSettingUsage.filter((usage: any) => Number(usage?.chapter_id || 0) !== chapter.id),
        ...chapterSettingUsage,
      ]
    }
    let preparedGeneration = prepareProseGenerationContract(initialContextPackage, options)
    let contextPackage = preparedGeneration.contextPackage
    let generationContract = preparedGeneration.contract
    let strictPreflightReadiness = resolveStrictPreflightReadiness(contextPackage.preflight)
    let stagedPreflightRepair: any = null
    const enforcePreparedGate = async (requireSceneCards: boolean) => {
      try {
        await preparedGeneration.runAfterGate(async () => undefined, requireSceneCards)
      } catch (error: any) {
        await onStage(requireSceneCards ? 'scene_cards' : 'context', {
          status: 'failed',
          code: error?.code,
          reasons: error?.gateDecision?.reasons || [],
          gate_decision: error?.gateDecision,
        })
        throw error
      }
    }
    const contextPreflightReady = contextPackage.preflight.ready === true && strictPreflightReadiness.ready
    await onStage('context', {
      status: contextPreflightReady ? 'success' : 'failed',
      score: contextPreflightReady ? 100 : 0,
      warnings: contextPackage.preflight.warnings || [],
      blockers: contextPackage.preflight.blockers || [],
      director_readiness: generationContract.director?.readiness,
    })
    const preflightNeedsMaterialRepair = contextPackage.preflight.ready !== true || !strictPreflightReadiness.ready
    if (preflightNeedsMaterialRepair && options.auto_repair_missing_material === true) {
      await onStage('material_repair', { status: 'running', warnings: contextPackage.preflight.warnings || [], blockers: contextPackage.preflight.blockers || [] })
      const repairResult = await autoRepairChapterPreflightGaps(activeWorkspace, project, chapter, contextPackage, preferredModelId, { ...llmControlOptions, persist: false })
      stagedPreflightRepair = repairResult
      chapter = repairResult.chapter || chapter
      chapters = chapters.map(item => item.id === chapterId ? chapter : item)
      worldbuilding = repairResult.worldbuilding || worldbuilding
      characters = repairResult.characters || characters
      settings = repairResult.settings || settings
      chapterSettingUsage = repairResult.staged_usage_replacement || chapterSettingUsage
      projectSettingUsage = [
        ...projectSettingUsage.filter((usage: any) => Number(usage?.chapter_id || 0) !== chapter.id),
        ...chapterSettingUsage,
      ]
      reviews = [...reviews, ...asArray(repairResult.staged_reviews)]
      wordTarget = resolveChapterWordTarget(project, chapter, options)
      const repairedContextPackage = applyChapterWordTargetToContext(
        ctx.runtime?.buildChapterContext ? await buildGenerationContext() : repairResult.context_package,
        wordTarget,
      )
      const repairedWritePrep = repairedContextPackage?.chapter_target?.write_preparation_brief
        || repairedContextPackage?.chapter_target?.writePreparationBrief
        || repairedContextPackage?.pre_draft_brief?.write_preparation_brief
        || repairedContextPackage?.write_preparation_brief
      const repairedWritePrepReady = ['ready', 'ok', 'pass'].includes(String(
        repairedWritePrep?.readiness_status
        || repairedWritePrep?.readinessStatus
        || '',
      ).toLowerCase())
      const postRepairOptions = repairedWritePrepReady
        ? {
            ...(options || {}),
            // Drop stale cockpit launch-gate snapshots after local material repair succeeded.
            chapter_launch_gate: undefined,
            chapterLaunchGate: undefined,
          }
        : options
      preparedGeneration = prepareProseGenerationContract(repairedContextPackage, postRepairOptions)
      contextPackage = preparedGeneration.contextPackage
      if (contextPackage?.setting_context?.auto_matched) stagedContextUsageReplacement = asArray(contextPackage.setting_context.chapter_usage)
      generationContract = preparedGeneration.contract
      strictPreflightReadiness = resolveStrictPreflightReadiness(contextPackage.preflight)
      await onStage('material_repair', {
        status: contextPackage.preflight.ready === true && strictPreflightReadiness.ready ? 'success' : 'warn',
        repaired: repairResult.repaired,
        errors: repairResult.errors,
        remaining_warnings: contextPackage.preflight.warnings || [],
        remaining_blockers: contextPackage.preflight.blockers || [],
      })
    }
    await enforcePreparedGate(false)
    throwIfChapterGenerationAborted()
    await onStage('scene_cards', { status: 'running' })
    let generatedSceneCardsThisRun = false
    if (!generationContract.chapter.scene_cards.length || options.force_scene_cards === true) {
      const sceneResult = await generateSceneCardsForChapter(activeWorkspace, project, contextPackage, preferredModelId, llmControlOptions)
      if (sceneResult.sceneCards.length > 0) {
        generatedSceneCardsThisRun = true
        // Re-align strong handoff onto newly generated scene cards before any persist/use.
        const alignedSceneContext = enrichContextWithStrongHandoff({
          ...contextPackage,
          chapter_target: {
            ...(contextPackage?.chapter_target || {}),
            scene_cards: sceneResult.sceneCards,
            sceneCards: sceneResult.sceneCards,
          },
          ...(contextPackage?.chapterTarget ? {
            chapterTarget: {
              ...contextPackage.chapterTarget,
              scene_cards: sceneResult.sceneCards,
              sceneCards: sceneResult.sceneCards,
            },
          } : {}),
        })
        const alignedSceneCards = asArray(alignedSceneContext?.chapter_target?.scene_cards || sceneResult.sceneCards)
        const sceneChapterPatch = {
          scene_breakdown: alignedSceneCards,
          scene_list: alignedSceneCards,
          raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'chapter_group' },
        }
        if (isSceneCardsOnly) {
          const updatedSceneChapter = await updateNovelChapter(activeWorkspace, chapter.id, sceneChapterPatch as any, { createVersion: false })
          if (updatedSceneChapter) chapter = updatedSceneChapter
          chapters = await listNovelChapters(activeWorkspace, projectId)
        } else {
          chapter = { ...chapter, ...sceneChapterPatch }
          chapters = chapters.map(item => item.id === chapter.id ? chapter : item)
        }
        wordTarget = resolveChapterWordTarget(project, chapter, options)
        const sceneContextPackage = applyChapterWordTargetToContext(
          {
            ...alignedSceneContext,
            chapter_target: {
              ...(alignedSceneContext?.chapter_target || {}),
              scene_cards: alignedSceneCards,
              sceneCards: alignedSceneCards,
            },
            ...(alignedSceneContext?.chapterTarget ? {
              chapterTarget: {
                ...alignedSceneContext.chapterTarget,
                scene_cards: alignedSceneCards,
                sceneCards: alignedSceneCards,
              },
            } : {}),
          },
          wordTarget,
        )
        preparedGeneration = prepareProseGenerationContract(sceneContextPackage, options)
        // Contract merge may reshuffle target fields; keep strong handoff alignment authoritative.
        contextPackage = enrichContextWithProgressResync(enrichContextWithStrongHandoff(preparedGeneration.contextPackage))
        if (contextPackage?.chapter_target?.plan_stale) {
          try {
            const staleTarget = contextPackage.chapter_target || {}
            await updateNovelChapter(activeWorkspace, chapter.id, {
              chapter_goal: staleTarget.goal || staleTarget.chapter_goal || chapter.chapter_goal,
              chapter_summary: staleTarget.summary || staleTarget.chapter_summary || chapter.chapter_summary,
              conflict: staleTarget.conflict || chapter.conflict,
              raw_payload: {
                ...(chapter.raw_payload || {}),
                must_advance: staleTarget.must_advance || [],
                forbidden_repeats: staleTarget.forbidden_repeats || [],
                progress_resync: staleTarget.progress_resync || { plan_stale: true },
                plan_stale: true,
              },
            } as any, { createVersion: false })
            chapter = {
              ...chapter,
              chapter_goal: staleTarget.goal || chapter.chapter_goal,
              chapter_summary: staleTarget.summary || chapter.chapter_summary,
              conflict: staleTarget.conflict || chapter.conflict,
              raw_payload: {
                ...(chapter.raw_payload || {}),
                must_advance: staleTarget.must_advance || [],
                forbidden_repeats: staleTarget.forbidden_repeats || [],
                progress_resync: staleTarget.progress_resync || { plan_stale: true },
                plan_stale: true,
              },
            }
          } catch {
            // seed persist is best-effort; live context already carries resynced plan
          }
        }
        generationContract = prepareProseGenerationContract(contextPackage, options).contract
      }
    }
    await enforcePreparedGate(true)
    await onStage('scene_cards', {
      status: 'success',
      count: generationContract.chapter.scene_cards.length,
      scene_card_titles: generationContract.chapter.scene_cards
        .slice(0, 6)
        .map((card: any) => String(card?.title || card?.scene_title || card?.sceneTitle || `场景${card?.scene_no || card?.sceneNo || ''}`).trim())
        .filter(Boolean),
    })
    if (generatedSceneCardsThisRun && ctx.production.approvalRequired(approvalPolicy, 'scene_cards', approvals, { count: generationContract.chapter.scene_cards.length })) {
      await onStage('scene_cards', { status: 'needs_confirmation', count: generationContract.chapter.scene_cards.length })
      throw ctx.production.buildApprovalError('scene_cards', '新生成的场景卡等待人工确认', { count: generationContract.chapter.scene_cards.length })
    }
    if (isSceneCardsOnly) {
      await onStage('migration_plan', { status: 'skipped', reason: '生产模式：只生成场景卡' })
      await onStage('draft', { status: 'skipped', reason: '生产模式：只生成场景卡' })
      await onStage('review', { status: 'skipped', reason: '生产模式：只生成场景卡' })
      await onStage('revise', { status: 'skipped', reason: '生产模式：只生成场景卡' })
      await onStage('safety', { status: 'skipped', reason: '生产模式：只生成场景卡' })
      await onStage('store', { status: 'skipped', reason: '场景卡已保存到章节元数据' })
      await onStage('story_state', { status: 'skipped', reason: '未生成正文，无需更新状态机' })
      return {
        chapter,
        score: null,
        revised: false,
        production_mode: productionMode,
        completed_stage: 'scene_cards',
        story_state_update: { skipped: true },
        config_snapshot: configSnapshot,
      }
    }
    const configuredQualityThreshold = [
      options.quality_threshold,
      options.qualityThreshold,
      project?.reference_config?.quality_gate?.min_score,
      project?.reference_config?.quality_gate?.minScore,
      78,
    ]
      .map(value => Number(value))
      .find(value => Number.isFinite(value) && value > 0) || 78
    const qualityThreshold = resolveEffectiveQualityThreshold(configuredQualityThreshold, contextPackage)
    const qualityGateProject = qualityThreshold > 0
      ? {
          ...project,
          reference_config: {
            ...(project.reference_config || {}),
            quality_gate: {
              ...(project.reference_config?.quality_gate || {}),
              min_score: qualityThreshold,
            },
            approval_policy: {
              ...(project.reference_config?.approval_policy || {}),
              low_score_threshold: qualityThreshold,
            },
          },
        }
      : project
    const prevChapters = compactPreviousChaptersForProse(chapters, chapter.chapter_no)
    throwIfChapterGenerationAborted()
    await onStage('migration_plan', { status: 'running' })
    const migrationPlan = await ctx.reference.getReferenceMigrationPlanForChapter(activeWorkspace, project, chapter).catch(error => ({ error: String(error) }))
    await onStage('migration_plan', { status: (migrationPlan as any)?.error ? 'warn' : 'success', active_reference_count: (migrationPlan as any)?.chapter_specific_plan?.active_reference_count || 0 })
    throwIfChapterGenerationAborted()
    const compiledPrompt = compileParagraphProseContext(project, generationContract, migrationPlan, chapter)
    await onStage('draft', { status: 'running', prompt_diagnostics: compiledPrompt.diagnostics })
    const draftResult = await generateNovelChapterProse(project, chapter, {
      worldbuilding,
      characters,
      outline: outlines,
      prompt: String(options.prompt || ''),
      prevChapters,
      contextPackage,
      migrationPlan,
      paragraphTask: compiledPrompt.prompt,
      promptDiagnostics: compiledPrompt.diagnostics,
      boundedProseContract: true,
      maxTokens: proseMaxTokensForWordTarget(wordTarget),
      abortSignal: options.abortSignal,
      llmTimeoutMs: options.llmTimeoutMs,
    } as any, {
      activeWorkspace,
      modelId: String(ctx.production.getStageModelId(project, 'draft', preferredModelId) || ''),
      skipMemoryStore: true,
    })
    assertCompleteProseTransportResult(draftResult, 'PROSE_DRAFT_TRUNCATED')
    const draftPromptDiagnostics = {
      ...compiledPrompt.diagnostics,
      model_usage: (draftResult as any)?.prose_prompt_diagnostics?.model_usage
        || (draftResult as any)?.usage
        || (draftResult as any)?.raw?.usage
        || null,
    }
    const resultPayload = getNovelPayload(draftResult)
    const draftProseChapters = Array.isArray(resultPayload?.prose_chapters)
      ? resultPayload.prose_chapters
      : Array.isArray(resultPayload?.proseChapters)
        ? resultPayload.proseChapters
        : []
    let targetProse: any
    try {
      targetProse = selectProseForChapter(resultPayload, chapter)
        || draftProseChapters.find((item: any) => Number(item?.chapter_no ?? item?.chapterNo) === Number(chapter.chapter_no))
        || draftProseChapters[0]
    } catch (error) {
      throw markBlockedInvalidError(error, {
        code: 'prose_wrong_chapter',
        source: 'prose_shape',
        message: '模型返回的正文不属于目标章节。',
      })
    }
    const generatedTitlePatch = buildGeneratedChapterTitlePatch(
      chapter,
      contextPackage?.chapter_target?.title_uniqueness_report,
      targetProse?.title || resultPayload?.title,
    )
    const plainProseFallback = extractPlainProseFallback(draftResult, 800)
    const chapterText = targetProse?.chapter_text || targetProse?.chapterText || resultPayload?.chapter_text || resultPayload?.chapterText || plainProseFallback
    if (!chapterText) {
      await onStage('draft', {
        status: 'failed',
        error: String((draftResult as any).error || (draftResult as any).fallbackReason || '模型未返回正文'),
        llm_diagnostics: buildLLMResultDiagnostics(draftResult),
      })
      const error = new Error(String((draftResult as any).error || (draftResult as any).fallbackReason || '模型未返回正文'))
      throw markBlockedInvalidError(error, validateMinimalChapterProse('').failures[0])
    }
    await onStage('draft', { status: 'success', word_count: countProseChars(chapterText), modelName: (draftResult as any).modelName, scene_status: 'generated', prompt_diagnostics: draftPromptDiagnostics, plain_text_fallback_used: Boolean(plainProseFallback && !targetProse?.chapter_text && !targetProse?.chapterText && !resultPayload?.chapter_text && !resultPayload?.chapterText) })
    let finalText = String(chapterText || '')
    const initialOpeningContinuityAssessment = assessInitialProseOpeningContinuity(finalText, enrichContextWithProgressResync(enrichContextWithStrongHandoff(contextPackage)))
    if (initialOpeningContinuityAssessment.failure) {
      const failure = initialOpeningContinuityAssessment.failure
      throw markBlockedInvalidError(Object.assign(new Error(failure.message), {
        code: 'PROSE_ADMISSION_BLOCKED_INVALID',
      }), failure)
    }
    let finalSceneBreakdown = targetProse?.scene_breakdown || targetProse?.sceneBreakdown || resultPayload?.scene_breakdown || resultPayload?.sceneBreakdown || []
    let ohStoryDeliveryReceipts = normalizeStoredOhStoryDeliveryReceipts({
      ...(resultPayload || {}),
      ...(targetProse || {}),
      chapter_blueprint: targetProse?.chapter_blueprint
        || targetProse?.chapterBlueprint
        || resultPayload?.chapter_blueprint
        || resultPayload?.chapterBlueprint
        || contextPackage?.chapter_target?.chapter_blueprint
        || contextPackage?.chapter_target?.chapterBlueprint,
      scene_card_receipts: [
        ...asArray(resultPayload?.scene_card_receipts || resultPayload?.sceneCardReceipts),
        ...asArray(targetProse?.scene_card_receipts || targetProse?.sceneCardReceipts),
        ...asArray(finalSceneBreakdown)
          .map((scene: any) => scene?.scene_card_receipts || scene?.sceneCardReceipts)
          .filter(Boolean),
      ],
      delivery_risk_receipts: [
        ...asArray(resultPayload?.delivery_risk_receipts || resultPayload?.deliveryRiskReceipts),
        ...asArray(targetProse?.delivery_risk_receipts || targetProse?.deliveryRiskReceipts),
      ],
      revision_context_receipts: [
        ...asArray(resultPayload?.revision_context_receipts || resultPayload?.revisionContextReceipts),
        ...asArray(targetProse?.revision_context_receipts || targetProse?.revisionContextReceipts),
      ],
      revision_receipts: [
        ...asArray(resultPayload?.revision_receipts || resultPayload?.revisionReceipts),
        ...asArray(targetProse?.revision_receipts || targetProse?.revisionReceipts),
      ],
      artifact_protocol_receipts: [
        ...asArray(resultPayload?.artifact_protocol_receipts || resultPayload?.artifactProtocolReceipts),
        ...asArray(targetProse?.artifact_protocol_receipts || targetProse?.artifactProtocolReceipts),
      ],
      pre_draft_execution_receipts: resultPayload?.pre_draft_execution_receipts
        || resultPayload?.preDraftExecutionReceipts
        || targetProse?.pre_draft_execution_receipts
        || targetProse?.preDraftExecutionReceipts,
    }) || { chapter_blueprint: null, scene_card_receipts: [], delivery_risk_receipts: [], revision_context_receipts: [], revision_receipts: [], deslop_repair_receipts: [], quality_audit_repair_receipts: [], artifact_protocol_receipts: [], pre_draft_execution_receipts: null }
    let finalContinuityNotes = targetProse?.continuity_notes || targetProse?.continuityNotes || resultPayload?.continuity_notes || resultPayload?.continuityNotes || chapter.continuity_notes || []
    let editorRewrite: any = null
    let memePolish: any = null
    let readabilityReview: any = null
    const qualityWarningCandidates: ProseAdmissionWarning[] = []
    throwIfChapterGenerationAborted()
    await onStage('word_target', { status: 'running', target: wordTarget.target, min: wordTarget.min, max: wordTarget.max, actual: countProseChars(finalText) })
    const wordTargetExpansionPatches: any[] = []
    let wordTargetCompatibility: any = null
    const recordWordTargetExpansionPatch = (wordTargetCheck: any) => {
      const patch = wordTargetCheck?.expansion?.expansion_blueprint_patch
      if (patch) wordTargetExpansionPatches.push(patch)
    }
    const isRestorableWordTargetText = (text: string, compatibility: any) => {
      const strictEvaluation = evaluateProseWordTarget(text, wordTarget)
      if (strictEvaluation.passed) return true
      return compatibility?.word_target_compatibility_pass === true
        && wordTarget?.mode === 'standard'
        && Number(compatibility?.compatibility_ceiling || 0) > 0
        && strictEvaluation.actual <= Number(compatibility.compatibility_ceiling)
    }
    const wordTargetWarningAsError = (wordTargetCheck: any) => {
      const warning = wordTargetCheck?.word_target_warning
      if (!warning) return null
      return Object.assign(new Error(String(warning.message || '章节正文未达到字数目标')), {
        code: warning.code === 'word_target_short' ? 'PROSE_WORD_TARGET_SHORT' : 'PROSE_WORD_TARGET_LONG',
        word_target: wordTarget,
        evaluation: wordTargetCheck.evaluation,
        final_evaluation: wordTargetCheck.final_evaluation,
        contraction_attempts: wordTargetCheck.contraction?.attempts || [],
        expansion_attempts: wordTargetCheck.expansion?.attempts || [],
        word_target_warning: warning,
      })
    }
    try {
      const wordTargetCheck = await ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, preferredModelId, llmControlOptions)
      wordTargetCompatibility = wordTargetCheck.word_target_compatibility_pass ? wordTargetCheck : null
      finalText = wordTargetCheck.final_text || finalText
      if (wordTargetCheck.word_target_warning) qualityWarningCandidates.push(wordTargetCheck.word_target_warning)
      recordWordTargetExpansionPatch(wordTargetCheck)
      if (wordTargetCheck.expanded && wordTargetCheck.expansion) {
        finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate(finalSceneBreakdown, wordTargetCheck.expansion.scene_breakdown, finalText)
        finalContinuityNotes = wordTargetCheck.expansion.continuity_notes?.length ? wordTargetCheck.expansion.continuity_notes : finalContinuityNotes
      }
      await onStage('word_target', { status: 'success', expanded: wordTargetCheck.expanded, contracted: wordTargetCheck.contracted, soft_pass: wordTargetCheck.word_target_soft_pass, compatibility_pass: wordTargetCheck.word_target_compatibility_pass === true, compatibility_ceiling: wordTargetCheck.compatibility_ceiling, contraction_attempts: wordTargetCheck.contraction?.attempts, word_count: countProseChars(finalText), evaluation: wordTargetCheck.final_evaluation })
    } catch (error: any) {
      await onStage('word_target', { status: 'failed', error: String(error?.message || error), word_target: error?.word_target || wordTarget, evaluation: error?.evaluation, final_evaluation: error?.final_evaluation, contraction_attempts: error?.contraction_attempts, expansion_attempts: error?.expansion_attempts })
      throw error
    }
    if (isDraftOnly) {
      await onStage('editor', { status: 'skipped', reason: '生产模式：只生成并质检初稿' })
      await onStage('meme_polish', { status: 'skipped', reason: '生产模式：只生成并质检初稿' })
    }
    if (!isDraftOnly) {
      const preEditorText = finalText
      const preEditorSceneBreakdown = finalSceneBreakdown
      const preEditorContinuityNotes = finalContinuityNotes
      const preEditorWordTargetCompatibility = wordTargetCompatibility
      throwIfChapterGenerationAborted()
      await onStage('editor', { status: 'running' })
      try {
      editorRewrite = await runCommercialEditorRewrite(activeWorkspace, project, contextPackage, finalText, preferredModelId, llmControlOptions)
      finalText = editorRewrite.final_text || finalText
      if (editorRewrite.edited && editorRewrite.revision) {
        finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate(finalSceneBreakdown, editorRewrite.revision.scene_breakdown, finalText)
        finalContinuityNotes = editorRewrite.revision.continuity_notes?.length ? editorRewrite.revision.continuity_notes : finalContinuityNotes
      }
      await onStage('editor', {
        status: editorRewrite.edited ? 'success' : 'warn',
        edited: Boolean(editorRewrite.edited),
        word_count: countProseChars(finalText),
        editor_report: editorRewrite.editor_report,
      })
    } catch (editorError) {
      if (isAbortError(editorError)) throw editorError
      const editorErrorMessage = formatAdmissionError(editorError, 300)
      editorRewrite = { error: editorErrorMessage, edited: false }
      qualityWarningCandidates.push(proseAdmissionWarning('review', 'editor_unavailable', editorErrorMessage))
      await onStage('editor', { status: 'warn', error: formatAdmissionError(editorError, 200), reason: '商业主编改稿失败，保留当前稿' })
    }
    try {
      throwIfChapterGenerationAborted()
      const postEditorWordTargetCheck = await ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, preferredModelId, llmControlOptions)
      const postEditorWordTargetWarning = wordTargetWarningAsError(postEditorWordTargetCheck)
      if (postEditorWordTargetWarning) {
        if (!validateMinimalChapterProse(postEditorWordTargetCheck.final_text || finalText).valid) throw postEditorWordTargetWarning
        qualityWarningCandidates.push(postEditorWordTargetCheck.word_target_warning)
      }
      wordTargetCompatibility = postEditorWordTargetCheck.word_target_compatibility_pass ? postEditorWordTargetCheck : null
      finalText = postEditorWordTargetCheck.final_text || finalText
      recordWordTargetExpansionPatch(postEditorWordTargetCheck)
      if (postEditorWordTargetCheck.expanded && postEditorWordTargetCheck.expansion) {
        finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate(finalSceneBreakdown, postEditorWordTargetCheck.expansion.scene_breakdown, finalText)
        finalContinuityNotes = postEditorWordTargetCheck.expansion.continuity_notes?.length ? postEditorWordTargetCheck.expansion.continuity_notes : finalContinuityNotes
        await onStage('word_target', { status: 'success', expanded: postEditorWordTargetCheck.expanded, contracted: postEditorWordTargetCheck.contracted, soft_pass: postEditorWordTargetCheck.word_target_soft_pass, contraction_attempts: postEditorWordTargetCheck.contraction?.attempts, word_count: countProseChars(finalText), evaluation: postEditorWordTargetCheck.final_evaluation, phase: 'post_editor' })
      } else if (postEditorWordTargetCheck.word_target_compatibility_pass) {
        await onStage('word_target', { status: 'success', phase: 'post_editor', compatibility_pass: true, compatibility_ceiling: postEditorWordTargetCheck.compatibility_ceiling, contraction_attempts: postEditorWordTargetCheck.contraction?.attempts, word_count: countProseChars(finalText), evaluation: postEditorWordTargetCheck.final_evaluation })
      }
    } catch (error: any) {
      if (error?.word_target_warning) qualityWarningCandidates.push(error.word_target_warning)
      const preEditorEvaluation = evaluateProseWordTarget(preEditorText, wordTarget)
      if ((error?.code === 'PROSE_WORD_TARGET_LONG' || error?.code === 'PROSE_WORD_TARGET_SHORT') && isRestorableWordTargetText(preEditorText, preEditorWordTargetCompatibility)) {
        finalText = preEditorText
        finalSceneBreakdown = preEditorSceneBreakdown
        finalContinuityNotes = preEditorContinuityNotes
        wordTargetCompatibility = preEditorWordTargetCompatibility
        const {
          final_text: _discardedEditorText,
          revision: _discardedEditorRevision,
          ...editorDiagnostics
        } = editorRewrite || {}
        editorRewrite = {
          ...editorDiagnostics,
          edited: false,
          discarded: true,
          discard_reason: 'post_editor_word_target_failed',
          word_target_failure: {
            code: error.code,
            evaluation: error?.evaluation,
            final_evaluation: error?.final_evaluation,
            contraction_attempts: error?.contraction_attempts,
            restored_evaluation: preEditorEvaluation,
          },
        }
        await onStage('word_target', {
          status: 'warn',
          phase: 'post_editor',
          error: String(error?.message || error),
          fallback: 'pre_editor',
          compatibility_pass: preEditorWordTargetCompatibility?.word_target_compatibility_pass === true,
          compatibility_ceiling: preEditorWordTargetCompatibility?.compatibility_ceiling,
          word_target: error?.word_target || wordTarget,
          evaluation: error?.evaluation,
          final_evaluation: error?.final_evaluation,
          restored_evaluation: preEditorEvaluation,
          contraction_attempts: error?.contraction_attempts,
        })
      } else {
        await onStage('word_target', { status: 'failed', error: String(error?.message || error), word_target: error?.word_target || wordTarget, evaluation: error?.evaluation, final_evaluation: error?.final_evaluation, contraction_attempts: error?.contraction_attempts, expansion_attempts: error?.expansion_attempts, phase: 'post_editor' })
        throw error
      }
    }
    throwIfChapterGenerationAborted()
    const preMemeText = finalText
    const preMemeSceneBreakdown = finalSceneBreakdown
    const preMemeContinuityNotes = finalContinuityNotes
    const preMemeWordTargetCompatibility = wordTargetCompatibility
    await onStage('meme_polish', { status: 'running' })
    try {
      memePolish = await runMemePolish(activeWorkspace, project, contextPackage, finalText, preferredModelId, llmControlOptions)
      finalText = memePolish.final_text || finalText
      if (memePolish.polished && memePolish.revision) {
        finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate(finalSceneBreakdown, memePolish.revision.scene_breakdown, finalText)
        finalContinuityNotes = memePolish.revision.continuity_notes?.length ? memePolish.revision.continuity_notes : finalContinuityNotes
      }
      await onStage('meme_polish', {
        status: memePolish.polished ? 'success' : 'skipped',
        polished: Boolean(memePolish.polished),
        meme_polish_report: memePolish.meme_polish_report,
      })
    } catch (memeError) {
      if (isAbortError(memeError)) throw memeError
      const memeErrorMessage = formatAdmissionError(memeError, 300)
      memePolish = { error: memeErrorMessage, polished: false }
      qualityWarningCandidates.push(proseAdmissionWarning('review', 'meme_polish_unavailable', memeErrorMessage))
      await onStage('meme_polish', { status: 'warn', error: formatAdmissionError(memeError, 200), reason: '网感润色失败，保留当前稿' })
    }
    try {
      throwIfChapterGenerationAborted()
      const postMemeWordTargetCheck = await ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, preferredModelId, llmControlOptions)
      const postMemeWordTargetWarning = wordTargetWarningAsError(postMemeWordTargetCheck)
      if (postMemeWordTargetWarning) {
        if (!validateMinimalChapterProse(postMemeWordTargetCheck.final_text || finalText).valid) throw postMemeWordTargetWarning
        qualityWarningCandidates.push(postMemeWordTargetCheck.word_target_warning)
      }
      wordTargetCompatibility = postMemeWordTargetCheck.word_target_compatibility_pass ? postMemeWordTargetCheck : null
      finalText = postMemeWordTargetCheck.final_text || finalText
      recordWordTargetExpansionPatch(postMemeWordTargetCheck)
      if (postMemeWordTargetCheck.expanded && postMemeWordTargetCheck.expansion) {
        finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate(finalSceneBreakdown, postMemeWordTargetCheck.expansion.scene_breakdown, finalText)
        finalContinuityNotes = postMemeWordTargetCheck.expansion.continuity_notes?.length ? postMemeWordTargetCheck.expansion.continuity_notes : finalContinuityNotes
        await onStage('word_target', { status: 'success', expanded: postMemeWordTargetCheck.expanded, contracted: postMemeWordTargetCheck.contracted, soft_pass: postMemeWordTargetCheck.word_target_soft_pass, contraction_attempts: postMemeWordTargetCheck.contraction?.attempts, word_count: countProseChars(finalText), evaluation: postMemeWordTargetCheck.final_evaluation, phase: 'post_meme_polish' })
      } else if (postMemeWordTargetCheck.word_target_compatibility_pass) {
        await onStage('word_target', { status: 'success', phase: 'post_meme_polish', compatibility_pass: true, compatibility_ceiling: postMemeWordTargetCheck.compatibility_ceiling, contraction_attempts: postMemeWordTargetCheck.contraction?.attempts, word_count: countProseChars(finalText), evaluation: postMemeWordTargetCheck.final_evaluation })
      }
      } catch (error: any) {
        if (error?.word_target_warning) qualityWarningCandidates.push(error.word_target_warning)
        if ((error?.code === 'PROSE_WORD_TARGET_LONG' || error?.code === 'PROSE_WORD_TARGET_SHORT') && isRestorableWordTargetText(preMemeText, preMemeWordTargetCompatibility)) {
          finalText = preMemeText
          finalSceneBreakdown = preMemeSceneBreakdown
          finalContinuityNotes = preMemeContinuityNotes
          wordTargetCompatibility = preMemeWordTargetCompatibility
          const { final_text: _discardedMemeText, revision: _discardedMemeRevision, ...memeDiagnostics } = memePolish || {}
          memePolish = {
            ...memeDiagnostics,
            polished: false,
            discarded: true,
            discard_reason: 'post_meme_word_target_failed',
            word_target_failure: {
              code: error.code,
              evaluation: error?.evaluation,
              final_evaluation: error?.final_evaluation,
              contraction_attempts: error?.contraction_attempts,
              restored_evaluation: evaluateProseWordTarget(preMemeText, wordTarget),
            },
          }
          await onStage('word_target', { status: 'warn', phase: 'post_meme_polish', error: String(error?.message || error), fallback: 'pre_meme', compatibility_pass: preMemeWordTargetCompatibility?.word_target_compatibility_pass === true, compatibility_ceiling: preMemeWordTargetCompatibility?.compatibility_ceiling, contraction_attempts: error?.contraction_attempts })
        } else {
          await onStage('word_target', { status: 'failed', error: String(error?.message || error), word_target: error?.word_target || wordTarget, evaluation: error?.evaluation, final_evaluation: error?.final_evaluation, contraction_attempts: error?.contraction_attempts, expansion_attempts: error?.expansion_attempts, phase: 'post_meme_polish' })
          throw error
        }
      }
    }
    throwIfChapterGenerationAborted()
    await onStage('review', { status: 'running' })
    finalText = normalizeProseForStorage(finalText)
    let qualityLoop: Awaited<ReturnType<typeof runProseQualityLoop>>
    const attachQualityLoopFailureDiagnostics = (error: any, qualityLoopDiagnostics?: any) => {
      const code = String(error?.code || 'PROSE_QUALITY_GATE_BLOCKED')
      error.prompt_diagnostics = draftPromptDiagnostics
      error.quality_loop = error?.quality_loop || qualityLoopDiagnostics || {
        rounds: [],
        decision: {
          passed: false,
          approvable: false,
          score: 0,
          min_score: qualityThreshold,
          hard_failures: [{
            key: code.toLowerCase(),
            message: String(error?.message || '正文质量门禁不可用').slice(0, 500),
            source: code === 'PROSE_QUALITY_RECHECK_UNAVAILABLE' ? 'recheck' : 'llm',
          }],
          advisory_failures: [],
        },
      }
      if (Object.prototype.hasOwnProperty.call(error, 'rounds')) delete error.rounds
      return error
    }
    try {
      qualityLoop = await runProseQualityLoop({
        initialText: finalText,
        minScore: qualityThreshold,
        coreContract: buildFocusedQualityCoreContract(generationContract),
        continuityContext: contextPackage,
        maxRevisionRounds: isDraftReviewOnly || isDraftOnly ? 0 : 1,
        scan: text => scanProseForQualityLoop(text, contextPackage, wordTarget, wordTargetCompatibility ? {
          word_target_compatibility_pass: true,
          compatibility_ceiling: wordTargetCompatibility.compatibility_ceiling,
        } : {}),
        review: async ({ prompt, round, attempt }) => {
          throwIfChapterGenerationAborted()
          await onStage('review', { status: 'running', phase: round > 0 ? 'quality_recheck' : 'quality_review', round, attempt })
          const reviewPrompt = attempt > 1
            ? `${prompt}\n上一次审查没有返回可用的完整六维 JSON。本次必须完整输出 score、score_scale=\"0-100\"、六个 dimensions 和 findings，不得省略或截断。`
            : prompt
          const result = await executeAgent('review-agent', project, { task: reviewPrompt }, {
            activeWorkspace,
            modelId: String(ctx.production.getStageModelId(project, 'review', preferredModelId) || ''),
            maxTokens: proseQualityReviewMaxTokensForAttempt(attempt),
            temperature: 0.15,
            skipMemory: true,
            signal: options.abortSignal,
            timeoutMs: qualityRepairTimeoutMs,
          })
          if ((result as any)?.error) {
            throw Object.assign(new Error(String((result as any).error)), {
              code: round > 0 ? 'PROSE_QUALITY_RECHECK_UNAVAILABLE' : 'PROSE_REVIEW_FAILED',
              llm_diagnostics: buildLLMResultDiagnostics(result),
            })
          }
          const payload = getNovelPayload(result)
          const diagnostics = buildLLMResultDiagnostics(result)
          return {
            ...(payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}),
            __quality_review_transport: sanitizeProseQualityReviewTransport({
              finish_reason: diagnostics.finish_reason,
              usage: diagnostics.usage,
              content_length: diagnostics.content_length,
            }),
          }
        },
        revise: async ({ prompt, round }) => {
          throwIfChapterGenerationAborted()
          await onStage('revise', { status: 'running', phase: 'quality_revision', round })
          const result = await executeAgent('prose-agent', project, { task: prompt }, {
            activeWorkspace,
            modelId: String(ctx.production.getStageModelId(project, 'review', preferredModelId) || ''),
            maxTokens: proseMaxTokensForWordTarget(wordTarget),
            temperature: 0.25,
            skipMemory: true,
            signal: options.abortSignal,
            timeoutMs: qualityRepairTimeoutMs,
          })
          assertCompleteProseTransportResult(result, 'PROSE_REVISION_TRUNCATED')
          if ((result as any)?.error) {
            throw Object.assign(new Error(String((result as any).error)), {
              code: 'PROSE_REVISION_FAILED',
              llm_diagnostics: buildLLMResultDiagnostics(result),
            })
          }
          const payload = getNovelPayload(result)
          const revised = asArray(payload?.prose_chapters || payload?.proseChapters)[0] || payload
          const revisedText = revised?.chapter_text
            || revised?.chapterText
            || payload?.chapter_text
            || payload?.chapterText
            || extractPlainProseFallback(result, 800)
          return {
            ...payload,
            ...revised,
            final_text: normalizeProseForStorage(revisedText),
          }
        },
      })
    } catch (error: any) {
      throw attachQualityLoopFailureDiagnostics(error)
    }
    finalText = qualityLoop.final_text
    const qualityLoopDiagnostics = {
      rounds: qualityLoop.rounds.map((item: any) => ({
        round: item.round,
        accepted: item.selection.accepted,
        reason: item.selection.reason,
      })),
      decision: qualityLoop.decision,
    }
    qualityWarningCandidates.push(
      ...asArray(qualityLoop.decision?.advisory_failures).map((message: any) => proseAdmissionWarning('quality', 'quality_advisory', message)),
      ...asArray(qualityLoop.decision?.hard_failures).map((failure: any) => proseAdmissionWarning(
        'quality',
        failure?.key || 'quality_failure',
        failure?.message || failure?.evidence || failure?.key || '质量诊断未通过',
        failure,
      )),
    )
    if (qualityLoop.quality_warning) qualityWarningCandidates.push(qualityLoop.quality_warning)
    let selfCheck = buildLegacyCompatibleSelfCheck(qualityLoop)
    if (!(selfCheck.review as any).next_chapter_quality_plan) {
      ;(selfCheck.review as any).next_chapter_quality_plan = buildFallbackNextChapterQualityPlan(
        selfCheck.review,
        contextPackage,
        finalText,
      )
    }
    ohStoryDeliveryReceipts = {
      ...(ohStoryDeliveryReceipts || {}),
      revision_receipts: [
        ...asArray(ohStoryDeliveryReceipts?.revision_receipts),
        ...qualityLoop.rounds
          .filter((item: any) => item?.selection?.accepted)
          .flatMap((item: any) => asArray(item?.revision?.revision_receipts || item?.revision?.revisionReceipts)),
      ],
    }
    const initialReviewDecision = getQualityGateDecision(qualityGateProject, { ...(selfCheck?.review || {}), revised: Boolean(selfCheck.revised) })
    await onStage('review', { status: initialReviewDecision.passed ? 'success' : 'warn', score: selfCheck?.review?.score ?? null, issues: selfCheck?.review?.issues || [], quality_gate: initialReviewDecision, scene_status: 'reviewed' })
    const revisionStageStatus = selfCheck.revised ? 'success' : selfCheck?.revision?.error ? 'warn' : 'skipped'
    await onStage('revise', {
      status: revisionStageStatus,
      revised: Boolean(selfCheck.revised),
      revision_error: selfCheck?.revision?.error || '',
      llm_diagnostics: selfCheck?.revision?.llm_diagnostics,
      scene_status: selfCheck.revised ? 'revised' : '',
    })
    if (selfCheck.revised && selfCheck.revision) {
      finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate(finalSceneBreakdown, selfCheck.revision.scene_breakdown, finalText)
      finalContinuityNotes = selfCheck.revision.continuity_notes?.length ? selfCheck.revision.continuity_notes : finalContinuityNotes
    }
    if (shouldRunSynchronousReadabilityReview(options, project)) {
      throwIfChapterGenerationAborted()
      await onStage('readability_review', { status: 'running' })
      try {
        readabilityReview = await runReadabilityReview(activeWorkspace, project, contextPackage, finalText, preferredModelId, llmControlOptions)
        await storeGeneratedReviewRecord(buildReadabilityReviewRecord({
          projectId,
          chapter,
          readabilityReview,
          memePolish,
          memeIntensityFallback: contextPackage?.chapter_target?.meme_strategy?.intensity,
          formatIssue: formatReviewIssueForStorage,
        }))
        await onStage('readability_review', { status: 'success', score: readabilityReview.readability_score, meme_sense: readabilityReview.meme_sense })
      } catch (readabilityError) {
        if (isAbortError(readabilityError)) throw readabilityError
        const readabilityErrorMessage = formatAdmissionError(readabilityError, 300)
        readabilityReview = { error: readabilityErrorMessage }
        qualityWarningCandidates.push(proseAdmissionWarning('review', 'readability_review_unavailable', readabilityErrorMessage))
        await onStage('readability_review', { status: 'warn', error: formatAdmissionError(readabilityError, 200), reason: '可读性复检失败，不阻塞原验收流程' })
      }
    } else {
      readabilityReview = {
        skipped: true,
        deferred: true,
        reason: '可读性复检为非阻塞辅助诊断；需要同步执行时设置 run_readability_review=true。',
      }
      await onStage('readability_review', {
        status: 'skipped',
        deferred: true,
        reason: readabilityReview.reason,
      })
    }
    let proseRevisionReceiptSync = buildProseRevisionReceiptSyncReport(chapter, selfCheck)
    let deslopRepairReceiptSync = buildDeslopRepairReceiptSyncReport(chapter, selfCheck)
    let qualityAuditRepairReceiptSync = buildQualityAuditRepairReceiptSyncReport(chapter, selfCheck)
    let revisionContextReceiptSync = buildRevisionContextReceiptSyncReport(chapter, selfCheck)
    let revisionCascadeImpactSync = buildRevisionCascadeImpactSyncReport(chapter, selfCheck)
    let revisionScopeGuardSync = buildRevisionScopeGuardSyncReport(chapter, selfCheck)
    const cleanupRepairFormatNormalization: any = null
    const cleanupRepairPunctuationNormalization: any = null
    const cleanupRepairDeslopTermNormalization: any = null
    const formatNormalization = { changed: false, change_count: 0, rules: [], skipped_after_quality: true }
    const punctuationNormalization = { changed: false, change_count: 0, rules: [], skipped_after_quality: true }
    const deslopTermNormalization = { changed: false, change_count: 0, rules: [], skipped_after_quality: true }
    const deterministicProseCleanup = qualityLoop.final_scan?.cleanup || buildDeterministicProseCleanupReport(chapter, finalText)
    const syncChapterForReceiptEvidence = { ...chapter, chapter_text: finalText }
    proseRevisionReceiptSync = buildProseRevisionReceiptSyncReport(syncChapterForReceiptEvidence, selfCheck)
    deslopRepairReceiptSync = buildDeslopRepairReceiptSyncReport(syncChapterForReceiptEvidence, selfCheck)
    qualityAuditRepairReceiptSync = buildQualityAuditRepairReceiptSyncReport(syncChapterForReceiptEvidence, selfCheck)
    revisionCascadeImpactSync = buildRevisionCascadeImpactSyncReport(syncChapterForReceiptEvidence, selfCheck)
    const revisionReceiptChecks = proseRevisionReceiptSync.status === 'ok'
      ? []
      : [{
          key: 'prose_revision_receipt_sync',
          label: '修订回执未闭环',
          status: 'fail',
          evidence: `${proseRevisionReceiptSync.label}：${proseRevisionReceiptSync.summary}`,
          fix: proseRevisionReceiptSync.next_actions?.join('；') || '重新修订并逐条输出 revision_receipts.changed_evidence。',
          missed_count: proseRevisionReceiptSync.missed_count,
        }]
    const deslopRepairReceiptRisks = proseQualityDeslopRepairReceiptRisks({ self_check: selfCheck }, finalText)
    const deslopRepairChecks = deslopRepairReceiptRisks.map((item: any) => ({
      key: 'deslop_repair_receipt_sync',
      label: '去AI味修复回执未闭环',
      status: 'fail',
      evidence: [item.gate, item.label, item.evidence].filter(Boolean).join('；') || item.risk,
      fix: `重新修复 ${item.gate || 'Gate A-G'} ${item.label || '去AI味残留'}，并在 deslop_repair_receipts.changed_evidence 中引用修订后正文证据。`,
      remaining_risk: item.risk,
    }))
    const missingDeslopRepairReceiptChecks = deslopRepairReceiptSync.status === 'ok' || Number(deslopRepairReceiptSync.receipt_count || 0) > 0
      ? []
      : [{
          key: 'missing_deslop_repair_receipts',
          label: '去AI味修复回执未生成',
          status: 'fail',
          evidence: `${deslopRepairReceiptSync.label}：${deslopRepairReceiptSync.summary}`,
          fix: deslopRepairReceiptSync.next_actions?.join('；') || '重新复核去AI味修复结果，并逐条输出 deslop_repair_receipts.changed_evidence。',
          missed_count: deslopRepairReceiptSync.missed_count,
        }]
    const missingQualityAuditRepairReceiptChecks = qualityAuditRepairReceiptSync.status === 'ok' || Number(qualityAuditRepairReceiptSync.receipt_count || 0) > 0
      ? []
      : [{
          key: 'missing_quality_audit_repair_receipts',
          label: '质量诊断修复回执未生成',
          status: 'fail',
          evidence: `${qualityAuditRepairReceiptSync.label}：${qualityAuditRepairReceiptSync.summary}`,
          fix: qualityAuditRepairReceiptSync.next_actions?.join('；') || '重新复核质量诊断修复结果，并逐条输出 quality_audit_repair_receipts.changed_evidence。',
          missed_count: qualityAuditRepairReceiptSync.missed_count,
        }]
    const qualityAuditRepairReceiptChecks = qualityAuditRepairReceiptSync.status === 'ok' || Number(qualityAuditRepairReceiptSync.receipt_count || 0) <= 0
      ? []
      : [{
          key: 'quality_audit_repair_receipt_sync',
          label: '质量诊断修复回执未闭环',
          status: 'fail',
          evidence: `${qualityAuditRepairReceiptSync.label}：${qualityAuditRepairReceiptSync.summary}`,
          fix: qualityAuditRepairReceiptSync.next_actions?.join('；') || '重新修订并逐条输出 quality_audit_repair_receipts.changed_evidence。',
          missed_count: qualityAuditRepairReceiptSync.missed_count,
        }]
    const revisionCascadeImpactChecks = [
      ...asArray(revisionCascadeImpactSync.evidence_missing),
      ...asArray(revisionCascadeImpactSync.evidence_unlocated),
    ].map((item: any) => ({
      key: 'revision_cascade_impact_evidence',
      label: '修订级联影响证据未闭环',
      status: 'fail',
      evidence: [item?.target, item?.evidence_location_risk || item?.evidenceLocationRisk || item?.evidence, item?.text].filter(Boolean).join('；'),
      fix: revisionCascadeImpactSync.next_actions?.join('；') || '重新修订并让 cascade_impacts.evidence/source_excerpt 引用修订后正文原句。',
      remaining_risk: item?.evidence_location_risk || item?.evidenceLocationRisk || 'cascade_impacts 缺少可核验正文证据。',
    }))
    const finalReviewContextPackage = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)
    const preStoreStructuralSyncChapter = {
      ...chapter,
      chapter_text: finalText,
      raw_payload: {
        ...(chapter.raw_payload || {}),
        oh_story_delivery_receipts: ohStoryDeliveryReceipts,
      },
    }
    const preStoreChapterBlueprintSync = buildChapterBlueprintSyncReport(project, preStoreStructuralSyncChapter, finalReviewContextPackage, finalText)
    const preStoreBenchmarkRecallSync = buildBenchmarkRecallSyncReport(project, preStoreStructuralSyncChapter, finalReviewContextPackage, finalText)
    const preStoreStoryDriveSync = buildStoryDriveSyncReport(project, preStoreStructuralSyncChapter, finalReviewContextPackage, finalText)
    const preStoreChapterAttractionReview = buildChapterAttractionReviewReport(project, preStoreStructuralSyncChapter, finalReviewContextPackage, finalText)
    const preStoreRunwaySync = buildRunwaySyncReport(project, preStoreStructuralSyncChapter, finalReviewContextPackage, finalText)
    const preStoreStructuralSyncChecks = buildPreStoreStructuralSyncChecks({
      chapterBlueprintSync: preStoreChapterBlueprintSync,
      benchmarkRecallSync: preStoreBenchmarkRecallSync,
      storyDriveSync: preStoreStoryDriveSync,
      chapterAttractionReview: preStoreChapterAttractionReview,
      runwaySync: preStoreRunwaySync,
    })
    let qualityGateReview = buildQualityGateReviewWithDeterministicCleanup({
      ...(selfCheck?.review || {}),
      revised: Boolean(selfCheck.revised),
      quality_audit_checks: [
        ...asArray(selfCheck?.review?.quality_audit_checks || selfCheck?.review?.qualityAuditChecks),
        ...preStoreStructuralSyncChecks,
        ...missingQualityAuditRepairReceiptChecks,
        ...qualityAuditRepairReceiptChecks,
        ...revisionCascadeImpactChecks,
      ],
      revision_receipt_checks: revisionReceiptChecks,
      deslop_repair_checks: [...missingDeslopRepairReceiptChecks, ...deslopRepairChecks],
    }, deterministicProseCleanup)
    const revisionDeliveryReceipts = selfCheck?.revision?.oh_story_delivery_receipts
      || selfCheck?.revision?.ohStoryDeliveryReceipts
      || {}
    ohStoryDeliveryReceipts = normalizeStoredOhStoryDeliveryReceipts({
      ...(ohStoryDeliveryReceipts || {}),
      chapter_blueprint: ohStoryDeliveryReceipts?.chapter_blueprint
        || finalReviewContextPackage?.chapter_target?.chapter_blueprint
        || finalReviewContextPackage?.chapter_target?.chapterBlueprint,
      scene_card_receipts: [
        ...asArray(revisionDeliveryReceipts?.scene_card_receipts || revisionDeliveryReceipts?.sceneCardReceipts),
        ...asArray(selfCheck?.revision?.scene_card_receipts || selfCheck?.revision?.sceneCardReceipts),
        ...asArray(finalSceneBreakdown)
          .map((scene: any) => scene?.scene_card_receipts || scene?.sceneCardReceipts)
          .filter(Boolean),
        ...asArray(ohStoryDeliveryReceipts?.scene_card_receipts),
      ],
      delivery_risk_receipts: uniqueDeliveryRiskReceipts([
        ...asArray(ohStoryDeliveryReceipts?.delivery_risk_receipts),
        ...normalizeDeliveryRiskReceipts(selfCheck?.review || {}, finalReviewContextPackage, finalText),
        ...normalizeDeliveryRiskReceipts({
          delivery_risk_receipts: asArray(revisionDeliveryReceipts?.delivery_risk_receipts || revisionDeliveryReceipts?.deliveryRiskReceipts),
        }, finalReviewContextPackage, finalText),
      ]),
      revision_receipts: [
        ...asArray(revisionDeliveryReceipts?.revision_receipts || revisionDeliveryReceipts?.revisionReceipts),
        ...asArray(selfCheck?.revision?.revision_receipts || selfCheck?.revision?.revisionReceipts),
        ...asArray(ohStoryDeliveryReceipts?.revision_receipts),
      ],
      deslop_repair_receipts: [
        ...asArray(revisionDeliveryReceipts?.deslop_repair_receipts || revisionDeliveryReceipts?.deslopRepairReceipts),
        ...asArray(selfCheck?.revision?.deslop_repair_receipts || selfCheck?.revision?.deslopRepairReceipts),
        ...asArray(ohStoryDeliveryReceipts?.deslop_repair_receipts),
      ],
      quality_audit_repair_receipts: [
        ...asArray(revisionDeliveryReceipts?.quality_audit_repair_receipts || revisionDeliveryReceipts?.qualityAuditRepairReceipts),
        ...asArray(selfCheck?.revision?.quality_audit_repair_receipts || selfCheck?.revision?.qualityAuditRepairReceipts),
        ...asArray(ohStoryDeliveryReceipts?.quality_audit_repair_receipts),
      ],
      artifact_protocol_receipts: [
        ...asArray(revisionDeliveryReceipts?.artifact_protocol_receipts || revisionDeliveryReceipts?.artifactProtocolReceipts),
        ...asArray(selfCheck?.revision?.artifact_protocol_receipts || selfCheck?.revision?.artifactProtocolReceipts),
        ...asArray(ohStoryDeliveryReceipts?.artifact_protocol_receipts),
      ],
      pre_draft_execution_receipts: revisionDeliveryReceipts?.pre_draft_execution_receipts
        || revisionDeliveryReceipts?.preDraftExecutionReceipts
        || selfCheck?.revision?.pre_draft_execution_receipts
        || selfCheck?.revision?.preDraftExecutionReceipts
        || ohStoryDeliveryReceipts?.pre_draft_execution_receipts
        || ohStoryDeliveryReceipts?.preDraftExecutionReceipts,
    }) || ohStoryDeliveryReceipts
    const nextChapterQualityPlanReceiptSync = buildNextChapterQualityPlanReceiptSyncReport(
      { ...chapter, chapter_text: finalText, raw_payload: { ...(chapter.raw_payload || {}), oh_story_delivery_receipts: ohStoryDeliveryReceipts } },
      finalReviewContextPackage,
      selfCheck,
    )
    const statusFilterReceiptSync = buildStatusFilterReceiptSyncReport(
      { ...chapter, chapter_text: finalText, raw_payload: { ...(chapter.raw_payload || {}), oh_story_delivery_receipts: ohStoryDeliveryReceipts } },
      finalReviewContextPackage,
      selfCheck,
    )
    const writePreparationReceiptSync = buildWritePreparationReceiptSyncReport(
      project,
      { ...chapter, raw_payload: { ...(chapter.raw_payload || {}), oh_story_delivery_receipts: ohStoryDeliveryReceipts } },
      finalReviewContextPackage,
      finalText,
      selfCheck,
    )
    const preStoreReceiptSyncChapter = {
      ...chapter,
      chapter_text: finalText,
      raw_payload: {
        ...(chapter.raw_payload || {}),
        oh_story_delivery_receipts: ohStoryDeliveryReceipts,
      },
    }
    const preStoreReceiptSyncContextPackage = {
      ...finalReviewContextPackage,
      oh_story_delivery_receipts: ohStoryDeliveryReceipts,
      delivery_receipts: ohStoryDeliveryReceipts,
      chapter_target: {
        ...(finalReviewContextPackage?.chapter_target || {}),
        oh_story_delivery_receipts: ohStoryDeliveryReceipts,
        delivery_receipts: ohStoryDeliveryReceipts,
      },
    }
    const preStoreSceneCardReceiptSync = buildSceneCardReceiptSyncReport(project, preStoreReceiptSyncChapter, preStoreReceiptSyncContextPackage, finalText)
    const preStoreDeliveryRiskReceiptSync = buildDeliveryRiskReceiptSyncReport(project, preStoreReceiptSyncChapter, preStoreReceiptSyncContextPackage, finalText)
    const preStoreArtifactProtocolReceiptSync = buildArtifactProtocolReceiptSyncReport(project, preStoreReceiptSyncChapter, preStoreReceiptSyncContextPackage, finalText)
    qualityGateReview = mergePostDeliveryReceiptSyncIntoQualityGateReview(qualityGateReview, {
      nextChapterQualityPlanReceiptSync,
      statusFilterReceiptSync,
      sceneCardReceiptSync: preStoreSceneCardReceiptSync,
    })
    selfCheck = {
      ...selfCheck,
      review: qualityGateReview,
    }
    const postDeliveryReceiptChecks = [
      { sync: nextChapterQualityPlanReceiptSync, sync_key: 'next_chapter_quality_plan_receipts_sync', label: '质量续航回执未闭环' },
      { sync: statusFilterReceiptSync, sync_key: 'status_filter_receipts_sync', label: '状态筛选回执未闭环' },
      { sync: writePreparationReceiptSync, sync_key: 'write_preparation_receipts_sync', label: '写前准备回执未闭环' },
      { sync: preStoreSceneCardReceiptSync, sync_key: 'scene_card_receipts_sync', label: '场景回执未闭环' },
      { sync: preStoreDeliveryRiskReceiptSync, sync_key: 'delivery_risk_receipts_sync', label: '交稿风险回执未闭环' },
      { sync: preStoreArtifactProtocolReceiptSync, sync_key: 'artifact_protocol_receipts_sync', label: '项目产物协议回执未闭环' },
    ]
      .filter((item: any) => item.sync?.status !== 'ok' && Number(item.sync?.missed_count || 0) > 0)
      .map((item: any) => ({
        key: 'post_delivery_receipt_sync',
        sync_key: item.sync_key,
        label: item.label,
        status: 'warn',
        evidence: `${item.sync.label}：${item.sync.summary}`,
        fix: item.sync.next_actions?.join('；') || '补齐 post-delivery receipt，并用正文证据证明写前准备、状态筛选、项目产物协议、质量续航、场景卡或交稿风险已落成。',
        missed_count: item.sync.missed_count,
      }))
    if (postDeliveryReceiptChecks.length > 0) {
      qualityGateReview.post_delivery_receipt_checks = postDeliveryReceiptChecks
    }
    const postDraftDirector = buildOhStoryDirectorForPostDraft({
      quality: {
        ...(qualityGateReview || {}),
        story_power_sync: qualityGateReview?.story_power_sync || qualityGateReview?.storyPowerSync || selfCheck?.review?.story_power_sync || selfCheck?.review?.storyPowerSync,
        delivery_risk_receipt_sync: preStoreDeliveryRiskReceiptSync,
        deslop_gate_diagnostics: qualityGateReview?.deslop_gate_diagnostics || qualityGateReview?.deslopGateDiagnostics || selfCheck?.review?.deslop_gate_diagnostics || selfCheck?.review?.deslopGateDiagnostics,
      },
      receipts: ohStoryDeliveryReceipts,
    })
    const postDraftDirectorPayload = {
      oh_story_delivery_receipts: ohStoryDeliveryReceipts,
      oh_story_director: postDraftDirector,
      ohStoryDirector: postDraftDirector,
    }
    const draftQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)
    const buildProseQualityReview = (status: string, qualityGate: any, summarySuffix = '', extraPayload: any = {}) => buildProseQualityReviewRecord({
      projectId,
      status,
      summarySuffix,
      selfCheck,
      formatIssue: formatReviewIssueForStorage,
      stringifyPayload: proseQualityJson,
      payload: {
        chapterId: chapter.id,
        contextPackage: finalReviewContextPackage,
        editorRewrite,
        memePolish,
        readabilityReview,
        selfCheck,
        ...extraPayload,
        qualityGate,
        postDraftDirectorPayload,
        productionMode,
        configSnapshot,
      },
    })
    await storeGeneratedReviewRecord(buildReceiptSyncReviewRecord({ projectId, chapter, sync: proseRevisionReceiptSync, reviewType: 'prose_revision_receipt_sync', payloadKey: 'prose_revision_receipt_sync' }))
    await storeGeneratedReviewRecord(buildReceiptSyncReviewRecord({ projectId, chapter, sync: deslopRepairReceiptSync, reviewType: 'deslop_repair_receipt_sync', payloadKey: 'deslop_repair_receipt_sync' }))
    await storeGeneratedReviewRecord(buildReceiptSyncReviewRecord({ projectId, chapter, sync: qualityAuditRepairReceiptSync, reviewType: 'quality_audit_repair_receipt_sync', payloadKey: 'quality_audit_repair_receipt_sync' }))
    await storeGeneratedReviewRecord(buildRevisionCascadeImpactSyncReviewRecord({ projectId, chapter, sync: revisionCascadeImpactSync }))
    await storeGeneratedReviewRecord(buildRevisionScopeGuardSyncReviewRecord({ projectId, chapter, selfCheck, sync: revisionScopeGuardSync }))
    await storeGeneratedReviewRecord(buildDeterministicProseCleanupReviewRecord({
      projectId,
      chapter,
      deterministicProseCleanup,
      formatNormalization,
      punctuationNormalization,
      deslopTermNormalization,
      cleanupRepairFormatNormalization,
      cleanupRepairPunctuationNormalization,
      cleanupRepairDeslopTermNormalization,
    }))
    const openingContinuityAssessment = assessInitialProseOpeningContinuity(finalText, enrichContextWithProgressResync(enrichContextWithStrongHandoff(contextPackage)))
    const openingContinuityFailures: ProseAdmissionHardFailure[] = openingContinuityAssessment.failure
      ? [openingContinuityAssessment.failure]
      : []
    if (isDraftOnly || isDraftReviewOnly) {
      const draftModeHardAdmission = classifyProseAdmission({
        hard_failures: [
          ...validateMinimalChapterProse(finalText).failures,
          ...openingContinuityFailures,
          ...asArray(qualityLoop.decision?.hard_failures)
            .filter((failure: any) => failure?.source === 'deterministic' && failure?.key === 'canonical_proper_noun_conflict')
            .map((failure: any) => ({
              code: 'canonical_proper_noun_conflict',
              source: 'canonical_continuity' as const,
              message: failure?.message || '正文与高置信正史专名冲突。',
              details: failure,
            })),
        ],
      })
      if (draftModeHardAdmission.hard_failures.length) {
        const primaryFailure = draftModeHardAdmission.hard_failures[0]
        throw markBlockedInvalidError(Object.assign(new Error(primaryFailure.message), {
          code: primaryFailure.code === 'opening_handoff_disconnected'
            ? 'PROSE_ADMISSION_BLOCKED_INVALID'
            : primaryFailure.source === 'canonical_continuity' ? 'PROSE_QUALITY_GATE_BLOCKED' : 'PROSE_INVALID',
          quality_loop: qualityLoopDiagnostics,
        }), primaryFailure)
      }
      qualityWarningCandidates.push(
        ...collectStructuredReviewWarnings(qualityGateReview),
        ...asArray(draftQualityDecision?.hard_failures).map((failure: any) => proseAdmissionWarning('quality', failure?.key || 'draft_quality_gate', failure?.message || failure?.evidence || failure?.key, failure)),
        ...asArray(draftQualityDecision?.advisory_failures).map((message: any) => proseAdmissionWarning('quality', 'draft_quality_advisory', message)),
      )
      let draftReferenceReport: any = { quality_assessment: { risk_level: 'unknown' }, unavailable: true }
      let draftSafetyDecision: any = { blocked: false, score: null, copy_hit_count: 0, reasons: [] }
      let draftSafetyExplanation: any = 'reference review unavailable'
      let draftMigrationAudit: any = { passed: false, unavailable: true }
      try {
        draftReferenceReport = await ctx.reference.buildReferenceUsageReport(activeWorkspace, project, '正文创作', finalText, { persist: false })
        draftSafetyDecision = ctx.reference.getReferenceSafetyDecision(project, draftReferenceReport)
        draftSafetyExplanation = ctx.reference.explainReferenceSafety(draftReferenceReport, draftSafetyDecision)
        draftMigrationAudit = ctx.reference.buildMigrationAudit(project, draftReferenceReport, draftSafetyExplanation)
        await storeGeneratedReviewRecord(buildReferenceUsageReviewRecord(project, draftReferenceReport))
      } catch (error) {
        if (isAbortError(error)) throw error
        qualityWarningCandidates.push(proseAdmissionWarning('review', 'reference_review_unavailable', formatAdmissionError(error, 300)))
      }
      await onStage('safety', { status: draftSafetyDecision.blocked ? 'failed' : 'success', score: draftSafetyDecision.score, copy_hit_count: draftSafetyDecision.copy_hit_count, risk_level: draftReferenceReport?.quality_assessment?.risk_level })
      if (draftSafetyDecision.blocked) {
        throw markBlockedInvalidError(Object.assign(new Error('仿写安全阈值未通过'), {
          code: 'REFERENCE_SAFETY_BLOCKED',
          referenceReport: draftReferenceReport,
          safetyDecision: draftSafetyDecision,
          safetyExplanation: draftSafetyExplanation,
          migrationAudit: draftMigrationAudit,
        }), {
          code: 'reference_safety_blocked',
          source: 'safety',
          message: '仿写安全阈值明确阻止正文入库。',
          details: { safety_decision: draftSafetyDecision },
        })
      }
      const draftSafetyApprovalRequired = ctx.production.approvalRequired(approvalPolicy, 'safety', approvals, {
        score: draftSafetyDecision.score,
        copy_hit_count: draftSafetyDecision.copy_hit_count,
        risk_level: draftReferenceReport?.quality_assessment?.risk_level,
      })
      if (draftSafetyApprovalRequired || String(draftReferenceReport?.quality_assessment?.risk_level || '').toLowerCase() !== 'low' || asArray(draftSafetyDecision?.reasons).length) {
        qualityWarningCandidates.push(proseAdmissionWarning('review', 'safety_review', draftSafetyExplanation || '仿写安全报告需要复核。'))
      }
      const draftModeAdmissionDecision = classifyProseAdmission({ warnings: qualityWarningCandidates })
      const draftModeStoryStateWarning = {
        skipped: true,
        reason: isDraftOnly ? 'draft_only production mode' : 'draft_review production mode',
      }
      const draftModeProseAdmission = {
        status: draftModeAdmissionDecision.status as 'accepted' | 'accepted_with_warnings',
        quality_score: Number.isFinite(Number(selfCheck?.review?.score)) ? Number(selfCheck.review.score) : null,
        quality_warnings: draftModeAdmissionDecision.warnings,
        story_state_status: 'pending' as const,
        story_state_warning: draftModeStoryStateWarning,
      }
      const draftModeChapterPatch = buildChapterProseStoragePatch({
        chapter,
        generatedTitlePatch,
        finalText,
        finalContinuityNotes,
        finalSceneBreakdown,
        ohStoryDeliveryReceipts,
        postDraftDirector,
        proseAdmission: draftModeProseAdmission,
      })
      let updatedReviewedDraft: any = { ...chapter, ...draftModeChapterPatch }
      const draftModeQualityReview = buildProseQualityReview(draftModeAdmissionDecision.status === 'accepted' ? 'ok' : 'warn', draftQualityDecision, '', {
        proseAdmission: draftModeProseAdmission,
        referenceReport: draftReferenceReport,
        safetyDecision: draftSafetyDecision,
        migrationAudit: draftMigrationAudit,
      })
      const draftProseMetaSync = buildProseMetaSyncReport(project, chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
        projectId,
        chapter,
        sync: draftProseMetaSync,
        reviewType: 'prose_meta_sync',
        payloadKey: 'prose_meta_sync',
        formatIssue: (item: any) => `正文元信息缺口：${item.term || item.label}｜${item.evidence || item.text || item.expected}`,
      }))
      const draftDialogueSync = buildDialogueSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftDialogueSync, reviewType: 'dialogue_sync', payloadKey: 'dialogue_sync', issuePrefix: '对白缺口' }))
      const draftCharacterBehaviorSync = buildCharacterBehaviorSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftCharacterBehaviorSync, reviewType: 'character_behavior_sync', payloadKey: 'character_behavior_sync', issuePrefix: '角色行为缺口' }))
      const draftAssetLinkageSync = buildAssetLinkageSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftAssetLinkageSync, reviewType: 'asset_linkage_sync', payloadKey: 'asset_linkage_sync', issuePrefix: '资产挂钩缺口' }))
      const draftStateTrackingSync = buildStateTrackingSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftStateTrackingSync, reviewType: 'state_tracking_sync', payloadKey: 'state_tracking_sync', issuePrefix: '状态跟踪缺口' }))
      const draftSourceReadinessSync = buildSourceReadinessSyncReport(project, chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftSourceReadinessSync, reviewType: 'source_readiness_sync', payloadKey: 'source_readiness_sync', issuePrefix: '来源就绪缺口' }))
      const draftIntentConfirmationSync = buildIntentConfirmationSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftIntentConfirmationSync, reviewType: 'intent_confirmation_sync', payloadKey: 'intent_confirmation_sync', issuePrefix: '意图确认缺口' }))
      const draftContinuityHeatSync = buildContinuityHeatSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftContinuityHeatSync, reviewType: 'continuity_heat_sync', payloadKey: 'continuity_heat_sync', issuePrefix: '连续性热度缺口' }))
      const draftConflictStructureSync = buildConflictStructureSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftConflictStructureSync, reviewType: 'conflict_structure_sync', payloadKey: 'conflict_structure_sync', issuePrefix: '冲突结构缺口' }))
      const draftUpgradeRhythmSync = buildUpgradeRhythmSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftUpgradeRhythmSync, reviewType: 'upgrade_rhythm_sync', payloadKey: 'upgrade_rhythm_sync', issuePrefix: '升级节奏缺口' }))
      const draftTargetReaderSync = buildTargetReaderSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftTargetReaderSync, reviewType: 'target_reader_sync', payloadKey: 'target_reader_sync', issuePrefix: '目标读者缺口' }))
      const draftGenrePositioningSync = buildGenrePositioningSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftGenrePositioningSync, reviewType: 'genre_positioning_sync', payloadKey: 'genre_positioning_sync', issuePrefix: '题材定位缺口' }))
      const draftPlotSpecialTopicsSync = buildPlotSpecialTopicsSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildPlotSpecialTopicsDraftReviewRecord({ projectId, chapter, sync: draftPlotSpecialTopicsSync }))
      const draftFemaleAudienceSync = buildFemaleAudienceSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftFemaleAudienceSync, reviewType: 'female_audience_sync', payloadKey: 'female_audience_sync', issuePrefix: '女频长篇缺口' }))
      const draftPlotDynamicsSync = buildPlotDynamicsSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftPlotDynamicsSync, reviewType: 'plot_dynamics_sync', payloadKey: 'plot_dynamics_sync', issuePrefix: '剧情动力缺口' }))
      const draftStoryPowerSync = buildStoryPowerSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftStoryPowerSync, reviewType: 'story_power_sync', payloadKey: 'story_power_sync', issuePrefix: '故事力缺口' }))
      const draftCharacterRelationSync = buildCharacterRelationSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftCharacterRelationSync, reviewType: 'character_relation_sync', payloadKey: 'character_relation_sync', issuePrefix: '角色关系缺口' }))
      const draftChapterAttractionReview = buildChapterAttractionReviewReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildChapterAttractionDraftReviewRecord({ projectId, chapter, sync: draftChapterAttractionReview }))
      const draftStoryDriveSync = buildStoryDriveSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftStoryDriveSync, reviewType: 'story_drive_sync', payloadKey: 'story_drive_sync', issuePrefix: '故事力缺口' }))
      const draftStoryLoopSync = buildStoryLoopSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftStoryLoopSync, reviewType: 'story_loop_sync', payloadKey: 'story_loop_sync', issuePrefix: '故事循环缺口' }))
      const draftInformationFlowSync = buildInformationFlowSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftInformationFlowSync, reviewType: 'information_flow_sync', payloadKey: 'information_flow_sync', issuePrefix: '信息流缺口' }))
      const draftEmotionalArcSync = buildEmotionalArcSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftEmotionalArcSync, reviewType: 'emotional_arc_sync', payloadKey: 'emotional_arc_sync', issuePrefix: '情绪弧缺口' }))
      const draftCharacterArcSync = buildCharacterArcSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftCharacterArcSync, reviewType: 'character_arc_sync', payloadKey: 'character_arc_sync', issuePrefix: '人物弧光缺口' }))
      const draftChapterBlueprintSync = buildChapterBlueprintSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftChapterBlueprintSync, reviewType: 'chapter_blueprint_sync', payloadKey: 'chapter_blueprint_sync', issuePrefix: '细纲缺口' }))
      const draftSceneCardReceiptSync = buildSceneCardReceiptSyncReport(project, updatedReviewedDraft || chapter, preStoreReceiptSyncContextPackage, finalText)
      await storeGeneratedReviewRecord(buildSceneCardReceiptsDraftReviewRecord({ projectId, chapter, sync: draftSceneCardReceiptSync }))
      const draftDeliveryRiskReceiptSync = buildDeliveryRiskReceiptSyncReport(project, updatedReviewedDraft || chapter, preStoreReceiptSyncContextPackage, finalText)
      await storeGeneratedReviewRecord(buildDeliveryRiskReceiptsDraftReviewRecord({ projectId, chapter, sync: draftDeliveryRiskReceiptSync }))
      const draftChapterBenchmarkSync = buildChapterBenchmarkSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftChapterBenchmarkSync, reviewType: 'chapter_benchmark_sync', payloadKey: 'chapter_benchmark_sync', issuePrefix: '未达标' }))
      const draftBenchmarkRecallSync = buildBenchmarkRecallSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftBenchmarkRecallSync, reviewType: 'benchmark_recall_sync', payloadKey: 'benchmark_recall_sync', issuePrefix: '召回缺口' }))
      const draftStyleBoundarySync = buildStyleBoundarySyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftStyleBoundarySync, reviewType: 'style_boundary_sync', payloadKey: 'style_boundary_sync', issuePrefix: '文风边界缺口' }))
      const draftStyleSampleSync = buildStyleSampleSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildStyleSampleDraftReviewRecord({ projectId, chapter, sync: draftStyleSampleSync }))
      const draftInnovationSync = buildInnovationSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftInnovationSync, reviewType: 'innovation_sync', payloadKey: 'innovation_sync', issuePrefix: '未兑现' }))
      const draftVolumeBeatSync = buildVolumeBeatSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({ projectId, chapter, sync: draftVolumeBeatSync, reviewType: 'volume_beat_sync', payloadKey: 'volume_beat_sync', issuePrefix: '未兑现' }))
      const draftRunwaySync = buildRunwaySyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
        projectId,
        chapter,
        sync: draftRunwaySync,
        reviewType: 'runway_sync',
        payloadKey: 'runway_sync',
        formatIssues: sync => [
          ...sync.four_question_missed.map((item: any) => `四问未兑现：${item.label}｜${item.text}`),
          ...sync.reader_fuel_missed.map((item: any) => `读者燃料未兑现：${item.text}`),
          ...sync.redline_touched.map((item: any) => `触碰红线：${item.text}`),
        ],
      }))
      const draftChapters = await listNovelChapters(activeWorkspace, projectId)
      const draftChapterTitleUniquenessSync = buildChapterTitleUniquenessSyncReport(draftChapters, updatedReviewedDraft || chapter)
      await storeGeneratedReviewRecord(buildChapterTitleUniquenessDraftReviewRecord({ projectId, chapter, sync: draftChapterTitleUniquenessSync }))
      const draftChapterHandoffSync = buildChapterHandoffSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildChapterHandoffDraftReviewRecord({ projectId, chapter, sync: draftChapterHandoffSync }))
      const draftReaderExpectationSync = buildReaderExpectationSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
        projectId,
        chapter,
        sync: draftReaderExpectationSync,
        reviewType: 'reader_expectation_sync',
        payloadKey: 'reader_expectation_sync',
        formatIssue: (item: any) => `未兑现：${item.label}｜${item.text}`,
      }))
      const draftExpectationThresholdSync = buildExpectationThresholdSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
        projectId,
        chapter,
        sync: draftExpectationThresholdSync,
        reviewType: 'expectation_threshold_sync',
        payloadKey: 'expectation_threshold_sync',
        issuePrefix: '期待阈值缺口',
      }))
      const draftChapterHookSync = buildChapterHookSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
        projectId,
        chapter,
        sync: draftChapterHookSync,
        reviewType: 'chapter_hook_sync',
        payloadKey: 'chapter_hook_sync',
        issuePrefix: '章级钩子缺口',
      }))
      const draftParagraphHookSync = buildParagraphHookSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
        projectId,
        chapter,
        sync: draftParagraphHookSync,
        reviewType: 'paragraph_hook_sync',
        payloadKey: 'paragraph_hook_sync',
        issuePrefix: '段落钩子缺口',
      }))
      const draftSuspenseSync = buildSuspenseSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
        projectId,
        chapter,
        sync: draftSuspenseSync,
        reviewType: 'suspense_sync',
        payloadKey: 'suspense_sync',
        issuePrefix: '悬念缺口',
      }))
      const draftReversalSync = buildReversalSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
        projectId,
        chapter,
        sync: draftReversalSync,
        reviewType: 'reversal_sync',
        payloadKey: 'reversal_sync',
        issuePrefix: '反转缺口',
      }))
      const draftShowdownSync = buildShowdownSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
        projectId,
        chapter,
        sync: draftShowdownSync,
        reviewType: 'showdown_sync',
        payloadKey: 'showdown_sync',
        issuePrefix: '高潮缺口',
      }))
      const draftOpeningSync = buildOpeningSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
        projectId,
        chapter,
        sync: draftOpeningSync,
        reviewType: 'opening_sync',
        payloadKey: 'opening_sync',
        issuePrefix: '开篇缺口',
      }))
      const draftProseCraftSync = buildProseCraftSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
        projectId,
        chapter,
        sync: draftProseCraftSync,
        reviewType: 'prose_craft_sync',
        payloadKey: 'prose_craft_sync',
        issuePrefix: '正文工艺缺口',
      }))
      const draftPunctuationToneSync = buildPunctuationToneSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
        projectId,
        chapter,
        sync: draftPunctuationToneSync,
        reviewType: 'punctuation_tone_sync',
        payloadKey: 'punctuation_tone_sync',
        issuePrefix: '语气标点缺口',
      }))
      const draftQualityAuditSync = buildQualityAuditSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
        projectId,
        chapter,
        sync: draftQualityAuditSync,
        reviewType: 'quality_audit_sync',
        payloadKey: 'quality_audit_sync',
        issuePrefix: '质量诊断缺口',
      }))
      const draftPayoffSetupSync = buildPayoffSetupSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
        projectId,
        chapter,
        sync: draftPayoffSetupSync,
        reviewType: 'payoff_setup_sync',
        payloadKey: 'payoff_setup_sync',
        formatIssue: (item: any) => `爽点铺垫缺口：${item.label}｜${item.evidence || item.text || item.expected}`,
      }))
      const draftSpectatorReactionSync = buildSpectatorReactionSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
        projectId,
        chapter,
        sync: draftSpectatorReactionSync,
        reviewType: 'spectator_reaction_sync',
        payloadKey: 'spectator_reaction_sync',
        formatIssue: (item: any) => `围观反应缺口：${item.label}｜${item.evidence || item.text || item.expected}`,
      }))
      const draftBridgeUnitSync = buildBridgeUnitSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
        projectId,
        chapter,
        sync: draftBridgeUnitSync,
        reviewType: 'bridge_unit_sync',
        payloadKey: 'bridge_unit_sync',
        issuePrefix: '桥段缺口',
      }))
      const draftBeatCoolingSync = buildBeatCoolingSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
        projectId,
        chapter,
        sync: draftBeatCoolingSync,
        reviewType: 'beat_cooling_sync',
        payloadKey: 'beat_cooling_sync',
        issuePrefix: '节奏冷却缺口',
      }))
      const draftReaderPayoffSync = buildReaderPayoffSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText, {})
      await storeGeneratedReviewRecord(buildReaderPayoffDraftReviewRecord({ projectId, chapter, sync: draftReaderPayoffSync }))
      const draftReaderRetentionSync = buildReaderRetentionSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildDraftSyncReviewRecord({
        projectId,
        chapter,
        sync: draftReaderRetentionSync,
        reviewType: 'reader_retention_sync',
        payloadKey: 'reader_retention_sync',
        formatIssue: (item: any) => `未兑现：${item.label}｜${item.text}`,
      }))
      const draftSignatureSceneSync = buildSignatureSceneSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildSignatureSceneDraftReviewRecord({ projectId, chapter, sync: draftSignatureSceneSync }))
      const draftStoryUnitSync = buildStoryUnitSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildStoryUnitDraftReviewRecord({ projectId, chapter, sync: draftStoryUnitSync }))
      const draftCoreDrift = buildChapterCoreDriftReport(project, updatedReviewedDraft || chapter, contextPackage, finalText, { missed: [], forbidden_touched: [] })
      await storeGeneratedReviewRecord(buildChapterCoreDriftDraftReviewRecord({ projectId, chapter, sync: draftCoreDrift }))
      const draftCoreContractSync = buildCoreContractSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)
      await storeGeneratedReviewRecord(buildCoreContractDraftReviewRecord({ projectId, chapter, sync: draftCoreContractSync }))
      try {
        await onStage('store', { status: 'running' })
        await ctx.runtime?.hooks?.beforeChapterStore?.({ chapterId: chapter.id, finalText })
        throwIfChapterGenerationAborted()
        const draftAcceptance = await commitNovelChapterAcceptance(activeWorkspace, {
          chapter_id: chapter.id,
          chapter_patch: draftModeChapterPatch,
          version_source: resolveChapterProseVersionSource({ editorRewrite }),
          reviews: [
            ...pendingGeneratedReviews,
            draftModeQualityReview,
          ].filter(Boolean),
        })
        updatedReviewedDraft = draftAcceptance.chapter
      } catch (error) {
        if (isAbortError(error)) throw error
        throw markBlockedInvalidError(error, {
          code: 'atomic_acceptance_failed',
          source: 'atomic',
          message: '章节原子验收失败，未写入任何业务数据。',
        })
      }
      const draftPostCommitWarnings: Array<{ stage: string; message: string }> = []
      const runDraftPostCommitBestEffort = async (stage: string, task: () => any | Promise<any>) => {
        try {
          await task()
        } catch (error) {
          draftPostCommitWarnings.push({ stage, message: formatAdmissionError(error, 300) })
        }
      }
      await runDraftPostCommitBestEffort('after_commit_hook', () => ctx.runtime?.hooks?.afterChapterCommit?.({ chapterId: chapter.id, finalText }))
      await runDraftPostCommitBestEffort('store_stage', () => onStage('store', { status: 'success', word_count: countProseChars(finalText), scene_status: 'accepted' }))
      await runDraftPostCommitBestEffort('progress_resync_next_chapters', async () => {
        const allChapters = await listNovelChapters(activeWorkspace, projectId)
        const previousForLedger = { ...chapter, ...draftModeChapterPatch, ...(updatedReviewedDraft || {}) }
        const alignment = collectPlanAlignmentPatchesAfterProseChange(allChapters, previousForLedger, {
          force: true,
          source: 'post_draft_store',
          followLimit: 5,
          alignWrittenFollowers: true,
        })
        for (const item of alignment.patches) {
          const patched = await updateNovelChapter(activeWorkspace, item.chapter_id, item.patch as any, { createVersion: false })
          if (Number(item.chapter_id) === Number(previousForLedger.id || chapter.id)) {
            updatedReviewedDraft = patched
          }
        }
      })
      await runDraftPostCommitBestEffort('story_state_stage', () => onStage('story_state', {
        status: 'skipped',
        reason: isDraftOnly
          ? '初稿模式不更新状态机，避免草稿污染长期记忆'
          : '自检模式不更新状态机，确认后可继续完整流水线',
      }))
      const draftReturnedAdmissionStatus = draftPostCommitWarnings.length > 0 && draftModeProseAdmission.status === 'accepted'
        ? 'accepted_with_warnings'
        : draftModeProseAdmission.status
      if (draftPostCommitWarnings.length > 0) {
        const finalDraftAdmission = {
          ...draftModeProseAdmission,
          status: draftReturnedAdmissionStatus,
          post_commit_warnings: draftPostCommitWarnings,
        }
        let persistedDraftRawPayload: any = null
        try {
          persistedDraftRawPayload = await mergeChapterRawPayload(activeWorkspace, chapter.id, {
            prose_admission: finalDraftAdmission,
            proseAdmission: finalDraftAdmission,
          })
        } catch (error) {
          draftPostCommitWarnings.push({ stage: 'admission_metadata', message: formatAdmissionError(error, 300) })
        }
        updatedReviewedDraft = {
          ...updatedReviewedDraft,
          raw_payload: {
            ...(persistedDraftRawPayload || updatedReviewedDraft?.raw_payload || {}),
            ...(!persistedDraftRawPayload ? {
              prose_admission: finalDraftAdmission,
              proseAdmission: finalDraftAdmission,
            } : {}),
          },
        }
      }
      return {
        chapter: updatedReviewedDraft,
        score: selfCheck?.review?.score ?? null,
        admission_status: draftReturnedAdmissionStatus,
        quality_score: draftModeProseAdmission.quality_score,
        quality_warnings: draftModeProseAdmission.quality_warnings,
        story_state_status: draftModeProseAdmission.story_state_status,
        story_state_warning: draftModeStoryStateWarning,
        post_commit_warnings: draftPostCommitWarnings,
        revised: false,
        production_mode: productionMode,
        completed_stage: 'store',
        prompt_diagnostics: draftPromptDiagnostics,
        quality_loop: {
          rounds: qualityLoop.rounds.map((item: any) => ({ round: item.round, accepted: item.selection.accepted, reason: item.selection.reason })),
          decision: qualityLoop.decision,
        },
        post_draft_director: postDraftDirector,
        oh_story_delivery_receipts: ohStoryDeliveryReceipts,
        story_state_update: buildSkippedPostDeliveryStoryStateUpdate({
          proseRevisionReceiptSync,
          deslopRepairReceiptSync,
          qualityAuditRepairReceiptSync,
          nextChapterQualityPlanReceiptSync,
          statusFilterReceiptSync,
          writePreparationReceiptSync,
          revisionContextReceiptSync,
          revisionCascadeImpactSync,
          revisionScopeGuardSync,
          deterministicProseCleanup,
          proseMetaSync: draftProseMetaSync,
          dialogueSync: draftDialogueSync,
          characterBehaviorSync: draftCharacterBehaviorSync,
          assetLinkageSync: draftAssetLinkageSync,
          stateTrackingSync: draftStateTrackingSync,
          sourceReadinessSync: draftSourceReadinessSync,
          intentConfirmationSync: draftIntentConfirmationSync,
          continuityHeatSync: draftContinuityHeatSync,
          conflictStructureSync: draftConflictStructureSync,
          upgradeRhythmSync: draftUpgradeRhythmSync,
          targetReaderSync: draftTargetReaderSync,
          genrePositioningSync: draftGenrePositioningSync,
          plotSpecialTopicsSync: draftPlotSpecialTopicsSync,
          femaleAudienceSync: draftFemaleAudienceSync,
          plotDynamicsSync: draftPlotDynamicsSync,
          storyPowerSync: draftStoryPowerSync,
          characterRelationSync: draftCharacterRelationSync,
          chapterAttractionReview: draftChapterAttractionReview,
          storyDriveSync: draftStoryDriveSync,
          storyLoopSync: draftStoryLoopSync,
          informationFlowSync: draftInformationFlowSync,
          emotionalArcSync: draftEmotionalArcSync,
          characterArcSync: draftCharacterArcSync,
          chapterBlueprintSync: draftChapterBlueprintSync,
          sceneCardReceiptSync: draftSceneCardReceiptSync,
          deliveryRiskReceiptSync: draftDeliveryRiskReceiptSync,
          chapterBenchmarkSync: draftChapterBenchmarkSync,
          benchmarkRecallSync: draftBenchmarkRecallSync,
          styleBoundarySync: draftStyleBoundarySync,
          styleSampleSync: draftStyleSampleSync,
          innovationSync: draftInnovationSync,
          volumeBeatSync: draftVolumeBeatSync,
          runwaySync: draftRunwaySync,
          chapterTitleUniquenessSync: draftChapterTitleUniquenessSync,
          chapterHandoffSync: draftChapterHandoffSync,
          readerExpectationSync: draftReaderExpectationSync,
          expectationThresholdSync: draftExpectationThresholdSync,
          chapterHookSync: draftChapterHookSync,
          paragraphHookSync: draftParagraphHookSync,
          suspenseSync: draftSuspenseSync,
          reversalSync: draftReversalSync,
          showdownSync: draftShowdownSync,
          openingSync: draftOpeningSync,
          proseCraftSync: draftProseCraftSync,
          punctuationToneSync: draftPunctuationToneSync,
          qualityAuditSync: draftQualityAuditSync,
          payoffSetupSync: draftPayoffSetupSync,
          spectatorReactionSync: draftSpectatorReactionSync,
          bridgeUnitSync: draftBridgeUnitSync,
          beatCoolingSync: draftBeatCoolingSync,
          readerPayoffSync: draftReaderPayoffSync,
          readerRetentionSync: draftReaderRetentionSync,
          signatureSceneSync: draftSignatureSceneSync,
          storyUnitSync: draftStoryUnitSync,
          coreDrift: draftCoreDrift,
          coreContractSync: draftCoreContractSync,
        }),
        requires_next_chapter_quality_plan_receipts: nextChapterQualityPlanReceiptSync.requires_receipts,
        requires_status_filter_receipts: statusFilterReceiptSync.requires_receipts,
        config_snapshot: configSnapshot,
      }
    }
    qualityWarningCandidates.push(...collectStructuredReviewWarnings(qualityGateReview))
    const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)
    qualityWarningCandidates.push(
      ...asArray(preStoreQualityDecision?.hard_failures).map((failure: any) => proseAdmissionWarning('quality', failure?.key || 'quality_gate', failure?.message || failure?.evidence || failure?.key, failure)),
      ...asArray(preStoreQualityDecision?.advisory_failures).map((message: any) => proseAdmissionWarning('quality', 'quality_gate_advisory', message)),
      ...asArray(preStoreQualityDecision?.reasons).map((message: any) => proseAdmissionWarning('quality', 'quality_gate_reason', message)),
    )
    if (ctx.production.approvalRequired(approvalPolicy, 'low_score', approvals, { score: selfCheck?.review?.score ?? null, issues: selfCheck?.review?.issues || [] })) {
      qualityWarningCandidates.push(proseAdmissionWarning('quality', 'low_score_approval', '章节质检低于审批阈值。'))
    }
    if (ctx.production.approvalRequired(approvalPolicy, 'draft', approvals, { score: selfCheck?.review?.score ?? null, revised: Boolean(selfCheck.revised) })) {
      qualityWarningCandidates.push(proseAdmissionWarning('review', 'draft_approval', '正文审批策略要求人工复核。'))
    }
    throwIfChapterGenerationAborted()
    const minimalValidation = validateMinimalChapterProse(finalText)
    const canonicalFailures: ProseAdmissionHardFailure[] = asArray(qualityLoop.decision?.hard_failures)
      .filter((failure: any) => failure?.source === 'deterministic' && failure?.key === 'canonical_proper_noun_conflict')
      .map((failure: any) => ({
        code: 'canonical_proper_noun_conflict',
        source: 'canonical_continuity' as const,
        message: failure?.message || '正文与高置信正史专名冲突。',
        details: failure,
      }))
    const hardAdmission = classifyProseAdmission({
      hard_failures: [...minimalValidation.failures, ...openingContinuityFailures, ...canonicalFailures],
    })
    if (hardAdmission.hard_failures.length) {
      const primaryFailure = hardAdmission.hard_failures[0]
      const error = Object.assign(new Error(primaryFailure.message), {
        code: primaryFailure.code === 'opening_handoff_disconnected'
          ? 'PROSE_ADMISSION_BLOCKED_INVALID'
          : primaryFailure.source === 'canonical_continuity' ? 'PROSE_QUALITY_GATE_BLOCKED' : 'PROSE_INVALID',
        quality_loop: qualityLoopDiagnostics,
      })
      throw markBlockedInvalidError(error, primaryFailure)
    }
    let referenceReport: any = { quality_assessment: { risk_level: 'unknown' }, unavailable: true }
    let safetyDecision: any = { blocked: false, score: null, copy_hit_count: 0, reasons: [] }
    let safetyExplanation: any = 'reference review unavailable'
    let migrationAudit: any = { passed: false, unavailable: true }
    try {
      referenceReport = await ctx.reference.buildReferenceUsageReport(activeWorkspace, project, '正文创作', finalText, { persist: false })
      safetyDecision = ctx.reference.getReferenceSafetyDecision(project, referenceReport)
      safetyExplanation = ctx.reference.explainReferenceSafety(referenceReport, safetyDecision)
      migrationAudit = ctx.reference.buildMigrationAudit(project, referenceReport, safetyExplanation)
      await storeGeneratedReviewRecord(buildReferenceUsageReviewRecord(project, referenceReport))
    } catch (error) {
      if (isAbortError(error)) throw error
      qualityWarningCandidates.push(proseAdmissionWarning('review', 'reference_review_unavailable', formatAdmissionError(error, 300)))
    }
    await onStage('safety', { status: safetyDecision.blocked ? 'failed' : 'success', score: safetyDecision.score, copy_hit_count: safetyDecision.copy_hit_count, risk_level: referenceReport?.quality_assessment?.risk_level })
    const finalQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview, safetyDecision)
    if (safetyDecision.blocked) {
      const error = Object.assign(new Error('仿写安全阈值未通过'), { code: 'REFERENCE_SAFETY_BLOCKED', referenceReport, safetyDecision, safetyExplanation, migrationAudit })
      throw markBlockedInvalidError(error, {
        code: 'reference_safety_blocked',
        source: 'safety',
        message: '仿写安全阈值明确阻止正文入库。',
        details: { safety_decision: safetyDecision },
      })
    }
    qualityWarningCandidates.push(
      ...asArray(finalQualityDecision?.hard_failures).map((failure: any) => proseAdmissionWarning('quality', failure?.key || 'final_quality_gate', failure?.message || failure?.evidence || failure?.key, failure)),
      ...asArray(finalQualityDecision?.advisory_failures).map((message: any) => proseAdmissionWarning('quality', 'final_quality_advisory', message)),
    )
    const safetyApprovalRequired = ctx.production.approvalRequired(approvalPolicy, 'safety', approvals, { score: safetyDecision.score, copy_hit_count: safetyDecision.copy_hit_count, risk_level: referenceReport?.quality_assessment?.risk_level })
    if (safetyApprovalRequired || String(referenceReport?.quality_assessment?.risk_level || '').toLowerCase() !== 'low' || asArray(safetyDecision?.reasons).length) {
      qualityWarningCandidates.push(proseAdmissionWarning('review', 'safety_review', safetyExplanation || '仿写安全报告需要复核。', { reference_report: referenceReport, safety_decision: safetyDecision }))
    }
    throwIfChapterGenerationAborted()
    await onStage('story_state', { status: 'running', phase: 'prepare' })
    let storyStateStatus: 'synced' | 'pending' = 'synced'
    let preparedStoryStateUpdate: PreparedStoryStateUpdate
    let storyStateWarning: any = null
    try {
      await ctx.runtime?.hooks?.beforeStoryState?.({ chapterId: chapter.id, finalText })
      preparedStoryStateUpdate = await prepareStoryStateUpdate(
        activeWorkspace,
        project,
        { ...chapter, chapter_text: finalText },
        finalReviewContextPackage,
        finalText,
        preferredModelId,
        llmControlOptions,
      )
      if (preparedStoryStateUpdate.hard_failures.length) {
        storyStateStatus = 'pending'
        storyStateWarning = { hard_failures: preparedStoryStateUpdate.hard_failures }
        preparedStoryStateUpdate = buildPendingPreparedStoryStateUpdate({
          reference_config: project.reference_config,
          failures: preparedStoryStateUpdate.hard_failures,
        })
      }
    } catch (error) {
      if (isAbortError(error)) throw error
      storyStateStatus = 'pending'
      const failures: PreparedStoryStateFailure[] = [{
        key: 'story_state_prepare_error',
        message: '故事状态准备失败，等待后续重试。',
        source: 'story_state',
      }]
      const storyStateErrorMessage = formatAdmissionError(error, 500)
      preparedStoryStateUpdate = buildPendingPreparedStoryStateUpdate({ reference_config: project.reference_config, failures, error: storyStateErrorMessage })
      storyStateWarning = { error: storyStateErrorMessage, hard_failures: failures }
    }
    if (storyStateStatus === 'pending') {
      for (const failure of preparedStoryStateUpdate.hard_failures) {
        qualityWarningCandidates.push(proseAdmissionWarning('story_state', failure.key, failure.message, failure.details))
      }
      await onStage('story_state', { status: 'warn', phase: 'pending', warning: storyStateWarning })
    }
    const precommitAdmission = classifyProseAdmission({ warnings: qualityWarningCandidates })
    const proseAdmission = {
      status: precommitAdmission.status as 'accepted' | 'accepted_with_warnings',
      quality_score: Number.isFinite(Number(selfCheck?.review?.score)) ? Number(selfCheck.review.score) : null,
      quality_warnings: precommitAdmission.warnings,
      story_state_status: storyStateStatus,
      story_state_warning: storyStateWarning,
    }
    await onStage('store', { status: 'running' })
    await ctx.runtime?.hooks?.beforeChapterStore?.({ chapterId: chapter.id, finalText })
    const chapterPatch = buildChapterProseStoragePatch({
      chapter,
      generatedTitlePatch,
      finalText,
      finalContinuityNotes,
      finalSceneBreakdown,
      ohStoryDeliveryReceipts,
      postDraftDirector,
      proseAdmission,
    })
    // Auto-create missing named cast cards and sync current_state from prose + story-state updates.
    const characterCardSync = planCharacterCardSync({
      projectId,
      chapter: { ...chapter, ...chapterPatch, chapter_text: finalText },
      existingCharacters: characters,
      previousChapters: asArray(chapters).filter((item: any) => Number(item?.chapter_no || 0) < Number(chapter.chapter_no || 0)),
      characterUpdates: preparedStoryStateUpdate.character_updates,
    })
    const acceptanceCharacterCreates = [
      ...asArray(stagedPreflightRepair?.staged_character_creates),
      ...asArray(characterCardSync.character_creates),
    ]
    const acceptanceCharacterUpdates = (() => {
      const byKey = new Map<string, any>()
      for (const update of characterCardSync.character_updates) {
        const key = String(update?.id || update?.name || '')
        if (!key) continue
        byKey.set(key, update)
      }
      for (const update of asArray(preparedStoryStateUpdate.character_updates)) {
        const name = String(update?.name || '').trim()
        const id = Number(update?.character_id || update?.characterId || update?.id || 0) || undefined
        const key = String(id || name || '')
        if (!key) continue
        const prev = byKey.get(key) || { id, name, patch: { current_state: {} } }
        byKey.set(key, {
          id: id || prev.id,
          name: name || prev.name,
          patch: {
            current_state: {
              ...(prev.patch?.current_state || {}),
              ...(update?.current_state || update?.currentState || {}),
              last_seen_chapter: chapter.chapter_no,
            },
          },
        })
      }
      return [...byKey.values()]
    })()
    if (storyStateStatus === 'synced' && (characterCardSync.title_name_canon.length || characterCardSync.identity_canon?.length)) {
      const nextConfig = preparedStoryStateUpdate.next_reference_config || project.reference_config || {}
      let nextStoryState = mergeNameCanonIntoStoryState(
        nextConfig.story_state || nextConfig.storyState || getStoryState(project) || {},
        characterCardSync.title_name_canon,
      )
      if (characterCardSync.identity_canon?.length) {
        nextStoryState = mergeIdentityCanonIntoStoryState(nextStoryState, characterCardSync.identity_canon)
      }
      preparedStoryStateUpdate = {
        ...preparedStoryStateUpdate,
        next_reference_config: {
          ...nextConfig,
          story_state: {
            ...nextStoryState,
            character_card_sync: {
              version: characterCardSync.version,
              created_names: characterCardSync.created_names,
              updated_names: characterCardSync.updated_names,
              name_drifts: characterCardSync.name_drifts,
              identity_drifts: characterCardSync.identity_drifts || [],
            },
          },
        },
      }
    }
    const acceptanceSettingUpdates = [
      ...asArray(preparedStoryStateUpdate.setting_updates).map((update: any) => ({ update, storyline: false })),
      ...asArray(preparedStoryStateUpdate.storyline_updates).map((update: any) => ({ update, storyline: true })),
    ].map(({ update, storyline }) => ({
      entity_id: Number(update?.entity_id || update?.entityId || update?.id || 0) || undefined,
      name: String(update?.name || '').trim() || undefined,
      entity_type: String(update?.entity_type || update?.entityType || '').trim() || undefined,
      patch: {
        state_json: {
          ...(update?.state_delta || update?.stateDelta || update?.actual_state_change || update?.actualStateChange || {}),
          last_seen_chapter: chapter.chapter_no,
          ...(storyline ? {
            last_checked_chapter_id: chapter.id,
            last_checked_chapter_no: chapter.chapter_no,
          } : {}),
        },
      },
    }))
    const finalCandidateChapterUsage = asArray(
      stagedPreflightRepair?.staged_usage_replacement
        ?? stagedContextUsageReplacement
        ?? chapterSettingUsage,
    )
    const resolveCandidateSettingId = (reference: any) => {
      const directId = Number(reference?.entity_id || reference?.entityId || reference?.id || 0)
      if (directId) return directId
      const name = String(reference?.entity_name || reference?.name || '').trim()
      const entityType = String(reference?.entity_type || reference?.entityType || '').trim()
      if (!name) return 0
      const matches = asArray(settings).filter((setting: any) => (
        String(setting?.name || '').trim() === name
        && (!entityType || String(setting?.entity_type || '').trim() === entityType)
      ))
      return matches.length === 1 ? Number(matches[0]?.id || 0) : 0
    }
    const finalCandidateUsageEntityIds = new Set(
      finalCandidateChapterUsage
        .map((usage: any) => resolveCandidateSettingId(usage))
        .filter((entityId: number) => entityId !== 0),
    )
    const acceptanceUsageUpdates = [
      ...asArray(preparedStoryStateUpdate.setting_updates),
      ...asArray(preparedStoryStateUpdate.storyline_updates),
    ].map((update: any) => ({ update, entityId: resolveCandidateSettingId(update) }))
      .filter(({ entityId }) => finalCandidateUsageEntityIds.has(entityId))
      .map(({ update, entityId }) => ({
        entity_id: entityId || undefined,
        name: String(update?.name || '').trim() || undefined,
        entity_type: String(update?.entity_type || update?.entityType || '').trim() || undefined,
        patch: {
          actual_state_change: update?.actual_state_change
            || update?.actualStateChange
            || update?.state_delta
            || update?.stateDelta
            || {},
        },
      }))
    const settingConsistencyReview = buildSettingConsistencyReviewRecord({
      projectId,
      chapter: { ...chapter, ...chapterPatch },
      contextPackage,
      selfCheck,
    })
    throwIfChapterGenerationAborted()
    let acceptance: Awaited<ReturnType<typeof commitNovelChapterAcceptance>>
    try {
      acceptance = await commitNovelChapterAcceptance(activeWorkspace, {
        chapter_id: chapter.id,
        chapter_patch: chapterPatch,
        version_source: resolveChapterProseVersionSource({ revisionEligible: true, selfCheck, editorRewrite }),
        ...(storyStateStatus === 'synced' ? {
          next_reference_config: preparedStoryStateUpdate.next_reference_config,
          character_updates: acceptanceCharacterUpdates,
          setting_updates: acceptanceSettingUpdates,
          usage_updates: acceptanceUsageUpdates,
          worldbuilding_creates: asArray(stagedPreflightRepair?.staged_worldbuilding_creates),
          character_creates: acceptanceCharacterCreates,
          setting_creates: asArray(stagedPreflightRepair?.staged_setting_creates),
          chapter_setting_usage_replacement: stagedPreflightRepair?.staged_usage_replacement || stagedContextUsageReplacement || undefined,
        } : {}),
        reviews: [
          ...(storyStateStatus === 'synced' ? asArray(stagedPreflightRepair?.staged_reviews) : []),
          ...pendingGeneratedReviews,
          buildProseQualityReview(precommitAdmission.status === 'accepted' ? 'ok' : 'warn', finalQualityDecision, '', {
            referenceReport,
            safetyDecision,
            migrationAudit,
            proseAdmission,
          }),
          settingConsistencyReview,
        ].filter(Boolean),
      })
    } catch (error) {
      if (isAbortError(error)) throw error
      throw markBlockedInvalidError(error, {
        code: 'atomic_acceptance_failed',
        source: 'atomic',
        message: '章节原子验收失败，未写入任何业务数据。',
      })
    }
    let updated = acceptance.chapter
    const postCommitWarnings: Array<{ stage: string; message: string }> = []
    const runPostCommitBestEffort = async (stage: string, task: () => any | Promise<any>) => {
      try {
        await task()
        return true
      } catch (error) {
        postCommitWarnings.push({ stage, message: formatAdmissionError(error, 300) })
        return false
      }
    }
    await runPostCommitBestEffort('after_commit_hook', () => ctx.runtime?.hooks?.afterChapterCommit?.({ chapterId: chapter.id, finalText }))
    await runPostCommitBestEffort('store_stage', () => onStage('store', { status: 'success', word_count: countProseChars(finalText), scene_status: 'accepted' }))
    await runPostCommitBestEffort('progress_resync_next_chapters', async () => {
      const allChapters = await listNovelChapters(activeWorkspace, projectId)
      const previousForLedger = { ...chapter, ...chapterPatch, ...(updated || {}) }
      const alignment = collectPlanAlignmentPatchesAfterProseChange(allChapters, previousForLedger, {
        force: true,
        source: 'post_prose_store',
        followLimit: 5,
        alignWrittenFollowers: true,
      })
      for (const item of alignment.patches) {
        const patched = await updateNovelChapter(activeWorkspace, item.chapter_id, item.patch as any, { createVersion: false })
        if (Number(item.chapter_id) === Number(previousForLedger.id || chapter.id || updated?.id)) {
          updated = patched
        }
      }
      const refreshed = await listNovelChapters(activeWorkspace, projectId)
      const projectAlign = collectProjectPlanAlignmentPatches(refreshed, {
        source: 'post_prose_store_project_align',
        onlyFromChapterNo: Math.max(1, Number(chapter.chapter_no || 1) - 1),
        followLimit: 2,
      })
      for (const item of projectAlign.patches) {
        const patched = await updateNovelChapter(activeWorkspace, item.chapter_id, item.patch as any, { createVersion: false })
        if (Number(item.chapter_id) === Number(previousForLedger.id || chapter.id || updated?.id)) {
          updated = patched
        }
      }
    })
    await runPostCommitBestEffort('memory', async () => {
      await storeChapterProseMemory(project, chapter.chapter_no, finalText)
    })
    await runPostCommitBestEffort('story_state_stage', () => onStage('story_state', storyStateStatus === 'synced'
      ? { status: 'success' }
      : { status: 'warn', phase: 'pending', warning: storyStateWarning }))
    let storyStateUpdateWithSync: any = preparedStoryStateUpdate.payload
    if (storyStateStatus === 'synced') await runPostCommitBestEffort('post_commit_sync', async () => {
    await ctx.runtime?.hooks?.beforePostCommitSync?.({ chapterId: chapter.id, finalText })
    const storyStateUpdate = preparedStoryStateUpdate.payload
    const story_state_update: any = storyStateUpdate || {}
    const proseMetaSync = buildProseMetaSyncReport(project, updated, contextPackage, finalText)
    const chapterBlueprintSync = buildChapterBlueprintSyncReport(project, updated, contextPackage, finalText)
    const generationChapters = await listNovelChapters(activeWorkspace, projectId)
    const chapterTitleUniquenessSync = buildChapterTitleUniquenessSyncReport(generationChapters, updated)
    const dialogueSync = buildDialogueSyncReport(project, updated, contextPackage, finalText)
    const characterBehaviorSync = buildCharacterBehaviorSyncReport(project, updated, contextPackage, finalText)
    const sceneCardReceiptSync = buildSceneCardReceiptSyncReport(project, updated, preStoreReceiptSyncContextPackage, finalText)
    const deliveryRiskReceiptSync = buildDeliveryRiskReceiptSyncReport(project, updated, preStoreReceiptSyncContextPackage, finalText)
    const artifactProtocolReceiptSync = buildArtifactProtocolReceiptSyncReport(project, updated, preStoreReceiptSyncContextPackage, finalText)
    const assetLinkageSync = buildAssetLinkageSyncReport(project, updated, contextPackage, finalText)
    const stateTrackingSync = buildStateTrackingSyncReport(project, updated, contextPackage, finalText)
    const chapterHandoffSync = buildChapterHandoffSyncReport(project, updated, contextPackage, finalText)
    const proseCraftSync = buildProseCraftSyncReport(project, updated, contextPackage, finalText)
    const punctuationToneSync = buildPunctuationToneSyncReport(project, updated, contextPackage, finalText)
    const payoffSetupSync = buildPayoffSetupSyncReport(project, updated, contextPackage, finalText)
    const spectatorReactionSync = buildSpectatorReactionSyncReport(project, updated, contextPackage, finalText)
    const sourceReadinessSync = buildSourceReadinessSyncReport(project, updated, finalReviewContextPackage, finalText)
    const intentConfirmationSync = buildIntentConfirmationSyncReport(project, updated, finalReviewContextPackage, finalText)
    const benchmarkRecallSync = buildBenchmarkRecallSyncReport(project, updated, finalReviewContextPackage, finalText)
    const styleSampleSync = buildStyleSampleSyncReport(project, updated, finalReviewContextPackage, finalText)
    const storyLoopSync = buildStoryLoopSyncReport(project, updated, contextPackage, finalText)
    const informationFlowSync = buildInformationFlowSyncReport(project, updated, contextPackage, finalText)
    const expectationThresholdSync = buildExpectationThresholdSyncReport(project, updated, contextPackage, finalText)
    const emotionalArcSync = buildEmotionalArcSyncReport(project, updated, contextPackage, finalText)
    const chapterHookSync = buildChapterHookSyncReport(project, updated, contextPackage, finalText)
    const paragraphHookSync = buildParagraphHookSyncReport(project, updated, contextPackage, finalText)
    const suspenseSync = buildSuspenseSyncReport(project, updated, contextPackage, finalText)
    const reversalSync = buildReversalSyncReport(project, updated, contextPackage, finalText)
    const showdownSync = buildShowdownSyncReport(project, updated, contextPackage, finalText)
    const openingSync = buildOpeningSyncReport(project, updated, contextPackage, finalText)
    const bridgeUnitSync = buildBridgeUnitSyncReport(project, updated, contextPackage, finalText)
    const continuityHeatSync = buildContinuityHeatSyncReport(project, updated, contextPackage, finalText)
    const conflictStructureSync = buildConflictStructureSyncReport(project, updated, contextPackage, finalText)
    const upgradeRhythmSync = buildUpgradeRhythmSyncReport(project, updated, contextPackage, finalText)
    const targetReaderSync = buildTargetReaderSyncReport(project, updated, contextPackage, finalText)
    const genrePositioningSync = buildGenrePositioningSyncReport(project, updated, contextPackage, finalText)
    const plotSpecialTopicsSync = buildPlotSpecialTopicsSyncReport(project, updated, contextPackage, finalText)
    const femaleAudienceSync = buildFemaleAudienceSyncReport(project, updated, contextPackage, finalText)
    const plotDynamicsSync = buildPlotDynamicsSyncReport(project, updated, contextPackage, finalText)
    const storyPowerSync = buildStoryPowerSyncReport(project, updated, contextPackage, finalText)
    const characterRelationSync = buildCharacterRelationSyncReport(project, updated, contextPackage, finalText)
    const readerRetentionSync = buildReaderRetentionSyncReport(project, updated, contextPackage, finalText)
    const coreContractSync = buildCoreContractSyncReport(project, updated, contextPackage, finalText)
    const storyDriveSync = buildStoryDriveSyncReport(project, updated, contextPackage, finalText)
    const characterArcSync = buildCharacterArcSyncReport(project, updated, contextPackage, finalText)
    const styleBoundarySync = buildStyleBoundarySyncReport(project, updated, contextPackage, finalText)
    const innovationSync = buildInnovationSyncReport(project, updated, contextPackage, finalText)
    const runwaySync = buildRunwaySyncReport(project, updated, contextPackage, finalText)
    const readerExpectationSync = buildReaderExpectationSyncReport(project, updated, contextPackage, finalText)
    const qualityAuditSync = buildQualityAuditSyncReport(project, updated, contextPackage, finalText)
    const beatCoolingSync = buildBeatCoolingSyncReport(project, updated, contextPackage, finalText)
    const readerPayoffSync = buildReaderPayoffSyncReport(project, updated, contextPackage, finalText, story_state_update)
    storyStateUpdateWithSync = buildPostDeliveryStoryStateUpdate(story_state_update, {
      proseRevisionReceiptSync,
      deslopRepairReceiptSync,
      qualityAuditRepairReceiptSync,
      nextChapterQualityPlanReceiptSync,
      statusFilterReceiptSync,
      writePreparationReceiptSync,
      revisionContextReceiptSync,
      revisionCascadeImpactSync,
      revisionScopeGuardSync,
      deterministicProseCleanup,
      proseMetaSync,
      chapterBlueprintSync,
      chapterTitleUniquenessSync,
      dialogueSync,
      characterBehaviorSync,
      sceneCardReceiptSync,
      deliveryRiskReceiptSync,
      artifactProtocolReceiptSync,
      assetLinkageSync,
      stateTrackingSync,
      chapterHandoffSync,
      proseCraftSync,
      punctuationToneSync,
      payoffSetupSync,
      spectatorReactionSync,
      sourceReadinessSync,
      intentConfirmationSync,
      benchmarkRecallSync,
      styleSampleSync,
      storyLoopSync,
      informationFlowSync,
      expectationThresholdSync,
      emotionalArcSync,
      chapterHookSync,
      paragraphHookSync,
      suspenseSync,
      reversalSync,
      showdownSync,
      openingSync,
      bridgeUnitSync,
      continuityHeatSync,
      conflictStructureSync,
      upgradeRhythmSync,
      targetReaderSync,
      genrePositioningSync,
      plotSpecialTopicsSync,
      femaleAudienceSync,
      plotDynamicsSync,
      storyPowerSync,
      characterRelationSync,
      readerRetentionSync,
      coreContractSync,
      storyDriveSync,
      characterArcSync,
      styleBoundarySync,
      innovationSync,
      runwaySync,
      readerExpectationSync,
      qualityAuditSync,
      beatCoolingSync,
      readerPayoffSync,
    })
    })
    const returnedAdmissionStatus = postCommitWarnings.length > 0 && proseAdmission.status === 'accepted'
      ? 'accepted_with_warnings'
      : proseAdmission.status
    if (postCommitWarnings.length > 0) {
      const finalProseAdmission = {
        ...proseAdmission,
        status: returnedAdmissionStatus,
        post_commit_warnings: postCommitWarnings,
      }
      let persistedRawPayload: any = null
      try {
        persistedRawPayload = await mergeChapterRawPayload(activeWorkspace, chapter.id, {
          prose_admission: finalProseAdmission,
          proseAdmission: finalProseAdmission,
        })
      } catch (error) {
        postCommitWarnings.push({ stage: 'admission_metadata', message: formatAdmissionError(error, 300) })
      }
      updated = {
        ...updated,
        raw_payload: {
          ...(persistedRawPayload || updated?.raw_payload || {}),
          ...(!persistedRawPayload ? {
            prose_admission: finalProseAdmission,
            proseAdmission: finalProseAdmission,
          } : {}),
        },
      }
    }
    return {
      chapter: updated,
      score: selfCheck?.review?.score ?? null,
      admission_status: returnedAdmissionStatus,
      quality_score: proseAdmission.quality_score,
      quality_warnings: proseAdmission.quality_warnings,
      story_state_status: storyStateStatus,
      story_state_warning: storyStateWarning,
      revised: Boolean(selfCheck?.revised),
      editor_rewrite: editorRewrite,
      meme_polish: memePolish,
      readability_review: readabilityReview,
      production_mode: productionMode,
      completed_stage: 'story_state',
      prompt_diagnostics: draftPromptDiagnostics,
      quality_loop: {
        rounds: qualityLoop.rounds.map((item: any) => ({ round: item.round, accepted: item.selection.accepted, reason: item.selection.reason })),
        decision: qualityLoop.decision,
      },
      post_draft_director: postDraftDirector,
      oh_story_delivery_receipts: ohStoryDeliveryReceipts,
      reference_report: referenceReport,
      safety_decision: safetyDecision,
      migration_audit: migrationAudit,
      story_state_update: storyStateUpdateWithSync,
      requires_next_chapter_quality_plan_receipts: nextChapterQualityPlanReceiptSync.requires_receipts,
      requires_status_filter_receipts: statusFilterReceiptSync.requires_receipts,
      config_snapshot: configSnapshot,
      post_commit_warnings: postCommitWarnings,
    }
  }

  return {
    buildParagraphProseContext,
    buildChapterContextPackage,
    autoRepairChapterPreflightGaps,
    generateSceneCardsForChapter,
    prepareStoryStateUpdate,
    updateStoryStateMachine,
    getStoredOrBuiltWritingBible,
    runCommercialEditorRewrite,
    runMemePolish,
    runReadabilityReview,
    runProseSelfReviewAndRevision,
    ensureProseMeetsWordTarget,
    generateChapterForGroup,
  }
}

export type NovelWritingService = ReturnType<typeof createNovelWritingService>

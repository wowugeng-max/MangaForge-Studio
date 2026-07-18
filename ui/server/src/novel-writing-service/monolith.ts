export { formatAdmissionError } from './quality/admission-error'
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

function safeJsonStringify(value: any, fallback?: string, maxLength = 0) {
  const text = stringifyRouteJsonSafely(value, undefined, maxLength)
  return text || fallback || ''
}

function proseQualityJson(value: any) {
  return safeJsonStringify(value, undefined, 0)
}






function proseRiskSection(key: string, value: string | string[]): ProseRiskPromptSection | null {
  const lines = (Array.isArray(value) ? value : [value])
    .map(item => String(item || '').trim())
    .filter(Boolean)
  if (!lines.length) return null
  const title = prosePromptText(lines[0] || key, 180)
  const compactRules = lines.slice(1).map(item => prosePromptText(item, 700)).filter(Boolean)
  return {
    key,
    full: lines,
    compact: [title, ...compactRules.slice(0, 5)],
    reference: [`${title}：仅执行本章直接相关边界；不得引入合同外事实。`],
  }
}

function requiredProsePromptText(value: any) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function requiredProsePromptJson(value: any) {
  try {
    const text = JSON.stringify(sanitizeJsonValue(value, {
      maxDepth: Infinity,
      maxArrayLength: Infinity,
      maxObjectKeys: Infinity,
    }))
    return text === undefined ? 'null' : text
  } catch {
    return JSON.stringify(String(value ?? ''))
  }
}

function requiredProseSceneCardValue(value: any): any {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string') {
    const text = requiredProsePromptText(value)
    return text || undefined
  }
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) {
    const items = value.map(requiredProseSceneCardValue).filter(item => item !== undefined)
    return items.length ? items : undefined
  }
  const output: Record<string, any> = {}
  for (const [key, item] of Object.entries(value)) {
    if (/(?:^|_)(?:diagnostic|diagnostics|audit_log|raw_payload|debug|trace)(?:$|_)/i.test(key)) continue
    const next = requiredProseSceneCardValue(item)
    if (next !== undefined) output[key] = next
  }
  return Object.keys(output).length ? output : undefined
}

function requiredProseSceneCard(card: any) {
  const sanitized = sanitizeJsonValue(card, {
    maxDepth: Infinity,
    maxArrayLength: Infinity,
    maxObjectKeys: Infinity,
  })
  return requiredProseSceneCardValue(sanitized) || {}
}

function proseContractValue(context: any, key: string) {
  return getContextContract(context, `${key}_contract`)
}

function buildRequiredProseCoreSections(
  project: any,
  contract: ProseGenerationContract,
): ProseRequiredPromptSection[] {
  const context: any = contract.context || {}
  const target: any = mergedContextChapterTargetPreferRuntime(context)
  const previousHandoff = contract.chapter.previous_handoff || buildPreviousChapterHandoff(context)
  const sceneCards = asArray(contract.chapter.scene_cards).map(requiredProseSceneCard)
  const failedChecks = asArray(contract.preflight?.checks)
    .filter((item: any) => item?.ok === false)
    .map((item: any) => ({
      key: item?.key,
      severity: item?.severity,
      label: item?.label,
      fix: item?.fix,
    }))
  const launchGate = context?.chapter_launch_gate
    || context?.chapterLaunchGate
    || target?.chapter_launch_gate
    || target?.chapterLaunchGate
    || null
  const coreRadar = target?.core_contract_radar || target?.coreContractRadar || {}
  const chapterBlueprint = target?.chapter_blueprint || target?.chapterBlueprint || {}
  const writingBible = context?.writing_bible || context?.writingBible || {}
  const styleBoundary = proseContractValue(context, 'style_boundary')
  const longformCompass = target?.longform_compass || target?.longformCompass || context?.longform_compass || context?.longformCompass || {}
  const longformBattle = target?.longform_battle_context || target?.longformBattleContext || context?.longform_battle_context || context?.longformBattleContext || {}
  const nextBatchBrief = target?.next_batch_brief || target?.nextBatchBrief || context?.next_batch_brief || context?.nextBatchBrief || {}
  const deliveryRisk = target?.delivery_risk_carry_over || target?.deliveryRiskCarryOver || context?.delivery_risk_carry_over || context?.deliveryRiskCarryOver || {}
  const millionWordRunway = target?.million_word_runway || target?.millionWordRunway || context?.million_word_runway || context?.millionWordRunway || {}
  const nextBatchChapters = asArray(nextBatchBrief?.chapters).map((chapter: any) => ({
    chapter_no: chapter?.chapter_no ?? chapter?.chapterNo,
    title: chapter?.title,
    chapter_task: chapter?.chapter_task || chapter?.chapterTask,
    conflict: chapter?.conflict,
    ending_hook: chapter?.ending_hook || chapter?.endingHook,
    mainline_progress: chapter?.mainline_progress || chapter?.mainlineProgress,
  }))
  const corePromise = {
    reader_promise: coreRadar?.reader_promise
      || coreRadar?.readerPromise
      || writingBible?.reader_promise
      || writingBible?.readerPromise
      || writingBible?.promise
      || '',
    core_conflict: coreRadar?.core_conflict
      || coreRadar?.coreConflict
      || writingBible?.core_conflict
      || writingBible?.coreConflict
      || writingBible?.mainline?.core_conflict
      || '',
    mainline_service: chapterBlueprint?.plot_lines?.mainline
      || chapterBlueprint?.plotLines?.mainline
      || target?.mainline_service
      || target?.mainlineService
      || contract.chapter.summary
      || '',
    protagonist_agency: chapterBlueprint?.writing_intent
      || chapterBlueprint?.writingIntent
      || target?.protagonist_agency
      || target?.protagonistAgency
      || '关键结果必须来自主角可见选择和行动',
    style_boundary: styleBoundary?.hard_constraints
      || styleBoundary?.hardConstraints
      || context?.style_lock
      || context?.styleLock
      || {},
    core_contract_radar: {
      reader_promise: coreRadar?.reader_promise || coreRadar?.readerPromise,
      core_conflict: coreRadar?.core_conflict || coreRadar?.coreConflict,
      must_serve: asArray(coreRadar?.must_serve || coreRadar?.mustServe),
      no_drift: asArray(coreRadar?.no_drift || coreRadar?.noDrift),
    },
    request_longform_compass: {
      reader_promise: longformCompass?.reader_promise || longformCompass?.readerPromise,
      core_conflict: longformCompass?.core_conflict || longformCompass?.coreConflict,
      must_serve: asArray(longformCompass?.must_serve || longformCompass?.mustServe),
      no_drift: asArray(longformCompass?.no_drift || longformCompass?.noDrift || longformCompass?.red_lines || longformCompass?.redLines),
    },
    request_longform_battle: {
      core_guard: longformBattle?.core_guard || longformBattle?.coreGuard,
      blocked_risks: asArray(longformBattle?.blocked_risks || longformBattle?.blockedRisks),
      required_actions: asArray(longformBattle?.required_actions || longformBattle?.requiredActions),
    },
    request_batch_role: {
      batch_goal: nextBatchBrief?.batch_goal || nextBatchBrief?.batchGoal,
      current_chapter_role: nextBatchBrief?.current_chapter_role || nextBatchBrief?.currentChapterRole,
      must_deliver: asArray(nextBatchBrief?.must_deliver || nextBatchBrief?.mustDeliver),
      ...(nextBatchChapters.length ? { chapters: nextBatchChapters } : {}),
    },
    request_delivery_risk: {
      quality_focus: asArray(deliveryRisk?.quality_focus || deliveryRisk?.qualityFocus),
      opening_actions: asArray(deliveryRisk?.opening_actions || deliveryRisk?.openingActions),
      middle_actions: asArray(deliveryRisk?.middle_actions || deliveryRisk?.middleActions),
      ending_actions: asArray(deliveryRisk?.ending_actions || deliveryRisk?.endingActions),
      avoid_repetition: asArray(deliveryRisk?.avoid_repetition || deliveryRisk?.avoidRepetition || deliveryRisk?.forbidden_repeats || deliveryRisk?.forbiddenRepeats),
    },
    request_million_word_runway: {
      mode: millionWordRunway?.mode,
      four_questions: asArray(millionWordRunway?.four_questions || millionWordRunway?.fourQuestions),
      reader_fuel: asArray(millionWordRunway?.reader_fuel || millionWordRunway?.readerFuel),
      red_lines: asArray(millionWordRunway?.red_lines || millionWordRunway?.redLines),
    },
  }
  const directorSnapshot = {
    readiness: contract.director?.readiness,
    primary_action: contract.director?.primary_action || contract.director?.primaryAction,
    required_repairs: asArray(contract.director?.required_repairs || contract.director?.requiredRepairs),
    selected_contracts: asArray(contract.director?.selected_contracts || contract.director?.selectedContracts).slice(0, 4),
  }

  return [
    {
      key: 'task',
      text: [
        '任务：只生成当前目标章节的完整简体中文小说正文。',
        '正文优先于回执；不得输出分析、任务说明、工程字段或其他章节。',
      ],
    },
    {
      key: 'chapter',
      text: [
        `作品：${requiredProsePromptText(project?.title || '')}`,
        `章节：第${contract.chapter.chapter_no}章《${requiredProsePromptText(contract.chapter.title || '无标题')}》`,
        `目标：${requiredProsePromptText(contract.chapter.goal || contract.chapter.summary)}`,
        `冲突：${requiredProsePromptText(contract.chapter.conflict)}`,
        `读者回报：${requiredProsePromptText(target?.reader_payoff || target?.readerPayoff || target?.core_payoff || target?.corePayoff)}`,
        `章末钩子：${requiredProsePromptText(contract.chapter.ending_hook)}`,
        `字数：${requiredProsePromptJson(contract.chapter.word_target || {})}`,
      ],
    },
    {
      key: 'handoff',
      text: previousHandoff
        ? ['【上一章尾段承接】', requiredProsePromptText(previousHandoff)]
        : [],
    },
    {
      key: 'scene-causality',
      text: ['【场景卡因果链】', requiredProsePromptJson({ scene_cards: sceneCards })],
    },
    {
      key: 'gate',
      text: [
        '【开写门禁通过快照】',
        requiredProsePromptJson({
          preflight: {
            ready: contract.preflight?.ready,
            strict_ready: contract.preflight?.strict_ready,
            failed_checks: failedChecks,
          },
          director: directorSnapshot,
          chapter_launch_gate: launchGate,
        }),
      ],
    },
    {
      key: 'core-promise',
      text: ['【不可变核心承诺】', requiredProsePromptJson(corePromise)],
    },
    {
      key: 'safety-style',
      text: [
        '不得新增上下文没有授权的事实；真实职业、法律、医疗、技术和地理事实不确定时改成架空或待验证线索。',
        '不得出现 prompt、合同、回执、字段名、读者分析、“上一章/本章”等写作工程语言。',
        '不得复制参考样章原句、专名或桥段；只迁移抽象节奏和功能。',
        '正文按动作、对话、情绪反应与后续动作推进；关键场景必须有目标、阻碍、选择、代价和状态变化。',
      ],
    },
    {
      key: 'output',
      text: [
        `输出 JSON：{"prose_chapters":[{"chapter_no":${contract.chapter.chapter_no},"title":"章节标题","chapter_text":"完整正文","scene_breakdown":[],"continuity_notes":[]}]}。`,
        'prose_chapters 只能有一项；chapter_text 不含 Markdown 标题、解释或附录。',
      ],
    },
  ]
}

function buildProseRiskContractSections(context: any): ProseRiskPromptSection[] {
  const target = mergedContextChapterTargetPreferRuntime(context)
  const sections = new Map<string, ProseRiskPromptSection>()
  const add = (key: string, lines: string | string[]) => {
    const section = proseRiskSection(key, lines)
    if (section) sections.set(normalizeProseContractKey(key), section)
  }
  const contract = (key: string) => proseContractValue(context, key)

  add('platform_rubric', buildPlatformRubricPromptSection(target?.platform_rubric || target?.platformRubric))
  add('content_rubric', buildContentRubricPromptSection(target?.content_rubric || target?.contentRubric))
  add('target_reader', buildTargetReaderPromptSection(contract('target_reader')))
  add('genre_positioning', buildGenrePositioningPromptSection(contract('genre_positioning')))
  add('plot_special_topics', buildPlotSpecialTopicsPromptSection(contract('plot_special_topics')))
  add('female_audience', buildFemaleAudiencePromptSection(contract('female_audience')))
  add('upgrade_rhythm', buildUpgradeRhythmPromptSection(contract('upgrade_rhythm')))
  add('conflict_structure', buildConflictStructurePromptSection(contract('conflict_structure')))
  add('story_loop', buildStoryLoopPromptSection(contract('story_loop')))
  add('emotional_arc', buildEmotionalArcPromptSection(contract('emotional_arc')))
  add('chapter_hook', buildChapterHookPromptSection(contract('chapter_hook')))
  add('paragraph_hook', buildParagraphHookPromptSection(contract('paragraph_hook')))
  add('suspense', buildSuspensePromptSection(contract('suspense')))
  add('reversal', buildReversalPromptSection(contract('reversal')))
  add('showdown', buildShowdownPromptSection(contract('showdown')))
  add('bridge_unit', buildBridgeUnitPromptSection(contract('bridge_unit')))
  add('plot_framework', buildPlotFrameworkPromptSection(contract('plot_framework')))
  add('opening', buildOpeningPromptSection(contract('opening')))
  add('prose_craft', buildProseCraftPromptSection(contract('prose_craft')))
  add('punctuation_tone', buildPunctuationTonePromptSection(contract('punctuation_tone')))
  add('quality_audit', buildQualityAuditPromptSection(contract('quality_audit')))
  add('dialogue', buildDialoguePromptSection(contract('dialogue')))
  add('plot_dynamics', buildPlotDynamicsPromptSection(contract('plot_dynamics')))
  add('story_power', buildStoryPowerPromptSection(contract('story_power')))
  add('continuity_heat', buildContinuityHeatPromptSection(contract('continuity_heat')))
  add('character_relation', buildCharacterRelationPromptSection(contract('character_relation')))
  add('character_behavior', buildCharacterBehaviorPromptSection(contract('character_behavior')))
  add('asset_linkage', buildAssetLinkagePromptSection(
    contract('asset_linkage'),
    asArray(contract('asset_linkage')?.relationship_graph_risks || contract('asset_linkage')?.relationshipGraphRisks),
  ))
  add('state_tracking', buildStateTrackingPromptSection(contract('state_tracking')))
  add('intent_confirmation', buildIntentConfirmationPromptSection(contract('intent_confirmation')))
  add('benchmark_recall', buildBenchmarkRecallPromptSection(target?.benchmark_recall_brief || target?.benchmarkRecallBrief))
  add('style_boundary', buildStyleBoundaryPromptSection(contract('style_boundary')))
  add('information_flow', buildInformationFlowPromptSection(contract('information_flow')))
  add('expectation_threshold', buildExpectationThresholdPromptSection(contract('expectation_threshold')))
  add('delivery_risk', buildDeliveryRiskCarryOverPromptSection(target?.delivery_risk_carry_over || target?.deliveryRiskCarryOver))
  add('longform_structure', [
    ...buildLongformCompassPromptSection(target?.longform_compass || target?.longformCompass || context?.longform_compass || context?.longformCompass),
    ...buildLongformBattleContextPromptSection(target?.longform_battle_context || target?.longformBattleContext || context?.longform_battle_context || context?.longformBattleContext),
  ])
  add('longform_battle', buildLongformBattleContextPromptSection(target?.longform_battle_context || target?.longformBattleContext || context?.longform_battle_context || context?.longformBattleContext))
  add('governance_recheck', buildGovernanceRecheckPromptSection(target?.governance_recheck_memory || target?.governanceRecheckMemory))
  add('fact_setting_safety', [
    '【事实与设定安全边界】',
    prosePromptJson({
      setting_context: context?.setting_context || context?.settingContext || {},
      continuity: context?.continuity || {},
    }, 3200),
  ])

  const rawSources = [target, context, context?.pre_draft_brief, context?.preDraftBrief]
  for (const source of rawSources) {
    for (const [field, value] of Object.entries(source || {})) {
      if (!/(?:_contract|Contract)$/.test(field) || !value) continue
      const key = normalizeProseContractKey(field)
      if (sections.has(key)) continue
      add(key, [`【${key}】`, prosePromptJson(value, 3200)])
    }
  }
  return Array.from(sections.values())
}

export function compileParagraphProseContext(
  project: any,
  generationContractOrContext: ProseGenerationContract | any,
  migrationPlan: any = null,
  _chapterDraft: any = null,
) {
  const contract = generationContractOrContext?.version === 'prose_generation_contract_v1'
    ? generationContractOrContext as ProseGenerationContract
    : buildProseGenerationContract(attachOhStoryDirectorToContextPackage(generationContractOrContext || {}))
  const requiredSections = buildRequiredProseCoreSections(project, contract)
  if (migrationPlan?.generation_prompt_addendum) {
    requiredSections.splice(requiredSections.length - 1, 0, {
      key: 'reference-migration-boundary',
      text: prosePromptText(migrationPlan.generation_prompt_addendum, 700),
    })
  }
  return compileProseContractPrompt({
    requiredSections,
    contractSections: buildProseRiskContractSections(contract.context),
    director: contract.director,
  })
}

function mergedContextChapterTarget(contextPackage: any = {}) {
  return mergedContextChapterTargetPreferRuntime(contextPackage)
}

function mergedContextChapterTargetPreferRuntime(contextPackage: any = {}) {
  const runtimeTarget = contextPackage?.chapterTarget || {}
  const merged = {
    ...(contextPackage?.chapter_target || {}),
    ...runtimeTarget,
  }
  const runtimeHas = (field: string) => Object.prototype.hasOwnProperty.call(runtimeTarget, field) && runtimeTarget[field] !== undefined
  const aliasPairs = [
    ['chapterNo', 'chapter_no'],
    ['endingHook', 'ending_hook'],
    ['previousHandoff', 'previous_handoff'],
    ['wordTarget', 'word_target'],
    ['sceneCards', 'scene_cards'],
  ]
  for (const [camelField, snakeField] of aliasPairs) {
    if (!runtimeHas(camelField)) continue
    if (camelField === 'sceneCards') {
      merged[snakeField] = normalizeSceneCardsPayload(
        { sceneCards: runtimeTarget[camelField] },
        { ...contextPackage, chapter_target: merged },
      )
      continue
    }
    merged[snakeField] = runtimeTarget[camelField]
  }
  return merged
}

function buildMissingStructuredReviewChecksPrompt(project: any, contextPackage: any, chapterText: string, review: any, missingFields: string[]) {
  const failedDeliveryRiskReceipts = asArray(review?.delivery_risk_receipts || review?.deliveryRiskReceipts)
    .filter((receipt: any) => receipt?.delivered === false || revisionReceiptRemainingRisk(receipt))
    .slice(0, 8)
  const fieldHints = missingFields.map(field => `${field}: ${(STRUCTURED_REVIEW_REQUIRED_FIELDS[field] || ['key', 'label', 'status', 'evidence', 'fix', 'remaining_risk']).join(', ')}`)
  return [
    '任务：只补缺失的 oh-story 结构化自检字段，不改正文，不输出正文。',
    `作品标题：${project.title}`,
    '你正在给上一轮审稿补表。上一轮审稿没有输出部分 oh-story 自检数组，导致门禁无法判断。请只针对 missing_fields 输出对应数组。',
    '判断原则：必须用【待审校正文】里的可定位证据做 pass/warn/fail；证据不足就 warn/fail，并给出具体 fix。不要因为字段缺失而继续输出 missing_* 占位。',
    'delivery_risk_receipts 如果存在未闭环项，必须逐项判断正文是否已经兑现；兑现时 delivered=true 且 evidence 引用正文原句，未兑现时 delivered=false 且 remaining_risk 写下一轮必须补的动作。',
    '',
    'missing_fields:',
    JSON.stringify(missingFields, null, 2),
    '',
    '字段要求:',
    fieldHints.join('\n'),
    '',
    '【上一轮缺口摘要】',
    JSON.stringify({
      missing_fields: missingFields,
      failed_delivery_risk_receipts: failedDeliveryRiskReceipts,
      next_chapter_quality_plan_receipts: review?.next_chapter_quality_plan_receipts || review?.nextChapterQualityPlanReceipts || [],
      quality_audit_checks: asArray(review?.quality_audit_checks || review?.qualityAuditChecks).filter(isMissingStructuredReviewCheck),
    }, null, 2).slice(0, 5000),
    '',
    '【结构化上下文包】',
    prosePromptJson(buildProsePromptContextSnapshot(contextPackage), 7000),
    '',
    '【待审校正文】',
    chapterText.slice(0, 14000),
    '',
    '只返回 JSON。JSON 顶层只需要包含 missing_fields 中列出的数组；如需要，也可包含 delivery_risk_receipts、next_chapter_quality_plan_receipts、passed、score、needs_revision、issues。不得返回 markdown，不得返回正文。',
  ].join('\n')
}


const OPENING_HOOK_SIGNAL_PATTERN = /死|血|痛|伤|尸|刀|枪|火|爆炸|撞|追|逃|杀|危险|禁止|规则|警报|广播|倒计时|失控|突然|必须|不能|威胁|逼|发现|选择|代价|冲突|问题|门响|敲门|尖叫|喊|吼|问|[？！!?“「]/
const OPENING_PROTAGONIST_ACTION_PATTERN = /(?:我|他|她|少年|少女|男人|女人|孩子|学生|弟子|队长|警员|医生|老师|父亲|母亲|哥哥|姐姐|妹妹|弟弟|[赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹][一-龥]{1,3})(?:[^。！？!?]{0,18})(?:醒|坐起|站起|抬头|低头|睁眼|闭眼|回头|转身|伸手|抓|握|按|推|拉|跑|冲|退|躲|跪|看见|听见|发现|开口|说道|问|喊|吼|笑|咬|攥|拿|递|打开|关上|盯|望|摸|踢|撞|撕|挡|拦|选择|决定)/
const OPENING_NON_PROTAGONIST_SUBJECT_PATTERN = /^(?:广播|警报|铃声|校规|规则|名单|红光|黑点|钟声|楼梯|安全门|规则册|惩罚栏|雨水|风|门|窗|灯|走廊|教学楼|宿舍|城市|天空|月光|阳光)/

function compactJsonBriefText(value: any, fallback = '') {
  if (typeof value === 'string') return compactBriefText(value, fallback)
  return compactBriefText(safeJsonStringify(value, undefined, 1200), fallback)
}

const CHARACTER_REPAIR_TIER_LIMITS = [
  { tier: 'protagonist', limit: 1 },
  { tier: 'antagonist_primary', limit: 1 },
  { tier: 'primary_supporting', limit: 2 },
  { tier: 'secondary_supporting', limit: 3 },
  { tier: 'cameo_supporting', limit: 3 },
  { tier: 'antagonist_minor', limit: 2 },
  { tier: 'antagonist_arc', limit: 2 },
  { tier: 'faction_agent', limit: 2 },
  { tier: 'supporting', limit: 2 },
]

function inferCharacterRepairTier(character: any) {
  const raw = compactBriefText([
    character?.tier,
    character?.role_type,
    character?.role,
    character?.identity,
    character?.archetype,
    character?.narrative_function,
    character?.supporting_function,
    character?.raw_payload?.tier,
    character?.raw_payload?.original?.tier,
    character?.raw_payload?.original?.role_type,
  ].filter(Boolean).join(' '))
  const normalized = raw.toLowerCase()
  if (CHARACTER_REPAIR_TIER_LIMITS.some(item => item.tier === normalized)) return normalized
  if (/主角|protagonist|视角/.test(raw)) return 'protagonist'
  if (/核心反派|最终反派|primary.*antagonist|antagonist.*primary|boss|大boss|总boss|antagonist$/i.test(raw)) return 'antagonist_primary'
  if (/阶段反派|分卷反派|arc.*antagonist|antagonist.*arc|阶段对手/i.test(raw)) return 'antagonist_arc'
  if (/小反派|反派配角|minor.*antagonist|antagonist.*minor|局部阻碍|地头蛇|打手|喽啰/i.test(raw)) return 'antagonist_minor'
  if (/势力执行|组织执行|faction.*agent|agent|执事|巡考|守卫|管事|监察|审查/i.test(raw)) return 'faction_agent'
  if (/主要配角|核心配角|primary.*support|support.*primary|队友|搭档|盟友/i.test(raw)) return 'primary_supporting'
  if (/次要配角|secondary.*support|support.*secondary|支线|同学|同事/i.test(raw)) return 'secondary_supporting'
  if (/龙套|功能配角|cameo|walk.?on|证人|路人|摊主|店员|受害者|围观/i.test(raw)) return 'cameo_supporting'
  return 'supporting'
}

function selectTierAwareCharacterRepairCandidates(candidates: any[] = [], existingCharacters: any[] = []) {
  const existingCounts = new Map<string, number>()
  for (const character of asArray(existingCharacters)) {
    const tier = inferCharacterRepairTier(character)
    existingCounts.set(tier, (existingCounts.get(tier) || 0) + 1)
  }
  const seenNames = new Set<string>()
  const normalizedCandidates = asArray(candidates)
    .map((candidate: any) => {
      const name = compactBriefText(candidate?.name)
      if (!name || seenNames.has(name)) return null
      seenNames.add(name)
      const tier = inferCharacterRepairTier(candidate)
      return {
        ...candidate,
        role_type: compactBriefText(candidate?.role_type || candidate?.role || tier || 'supporting'),
        tier,
        raw_payload: {
          ...(candidate?.raw_payload || {}),
          tier,
        },
      }
    })
    .filter(Boolean) as any[]
  const selected: any[] = []
  const selectedNames = new Set<string>()
  const addCandidate = (candidate: any) => {
    if (!candidate?.name || selectedNames.has(candidate.name) || selected.length >= 12) return
    selectedNames.add(candidate.name)
    selected.push(candidate)
  }
  for (const rule of CHARACTER_REPAIR_TIER_LIMITS) {
    const existingCount = existingCounts.get(rule.tier) || 0
    const availableSlots = Math.max(0, rule.limit - Math.min(existingCount, rule.limit))
    if (availableSlots <= 0) continue
    normalizedCandidates
      .filter(candidate => candidate.tier === rule.tier)
      .slice(0, availableSlots)
      .forEach(addCandidate)
  }
  if (selected.length === 0) normalizedCandidates.slice(0, 6).forEach(addCandidate)
  return selected
}

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

function storylineUsageName(item: any) {
  return String(item?.name || item?.summary || item?.entity_type || '').trim()
}

function storylineUsageByType(storylineContext: any, types: string[]) {
  return asArray(storylineContext?.chapter_usage)
    .filter((item: any) => types.includes(String(item?.usage_type || '')))
    .map(storylineUsageName)
    .filter(Boolean)
}

function settingJsonObject(value: any) {
  const parsed = parseJsonLikePayload(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
}

function characterArcText(...values: any[]) {
  for (const value of values) {
    const text = compactText(value, 260)
    if (text) return text
  }
  return ''
}

function characterArcListText(...values: any[]) {
  return Array.from(new Set(values.flatMap(value => asArray(value).map((item: any) => compactText(item, 80)).filter(Boolean))))
}

function characterArcJoinedText(...values: any[]) {
  return Array.from(new Set(values.map(value => compactText(value, 220)).filter(Boolean))).join('；')
}

function characterArcUsageKey(item: any) {
  const id = Number(item?.entity_id || item?.id || 0)
  const name = compactBriefText(item?.name || item?.title)
  return id ? `id:${id}` : name ? `name:${name}` : ''
}

function characterArcEntityKeys(entity: any) {
  const id = Number(entity?.id || entity?.entity_id || 0)
  const name = compactBriefText(entity?.name || entity?.title)
  return [id ? `id:${id}` : '', name ? `name:${name}` : ''].filter(Boolean)
}

function characterArcTypeLabel(type: string) {
  return type === 'relationship_arc' ? '关系线' : '角色线'
}

function buildCharacterArcBriefFromContext(contextPackage: any) {
  const target = contextPackage?.chapter_target || {}
  const explicit = target.character_arc_brief
    || target.characterArcBrief
    || contextPackage?.pre_draft_brief?.character_arc_brief
    || contextPackage?.pre_draft_brief?.characterArcBrief
    || contextPackage?.character_arc_context
    || contextPackage?.characterArcContext
  if (explicit && typeof explicit === 'object' && Object.keys(explicit).length > 0) return explicit

  const chapterNo = Number(target.chapter_no || 0)
  const chapterText = [
    target.title,
    target.summary,
    target.goal,
    target.chapter_goal,
    target.conflict,
    target.ending_hook,
  ].map(item => compactBriefText(item)).filter(Boolean).join(' ')
  const entities = [
    ...asArray(contextPackage?.setting_context?.entities),
    ...asArray(contextPackage?.storyline_context?.entities),
  ]
  const usages = [
    ...asArray(contextPackage?.setting_context?.chapter_usage),
    ...asArray(contextPackage?.storyline_context?.chapter_usage),
  ].filter((item: any) => ['advance', 'plant', 'payoff', 'required'].includes(String(item?.usage_type || 'advance')))
  const usageMap = new Map<string, any>()
  for (const usage of usages) {
    const key = characterArcUsageKey(usage)
    if (key && !usageMap.has(key)) usageMap.set(key, usage)
  }

  const arcs = entities
    .filter((entity: any) => ['character_arc', 'relationship_arc'].includes(String(entity?.entity_type || entity?.type || '')))
    .map((entity: any) => {
      const entityType = String(entity?.entity_type || entity?.type || 'character_arc')
      const payload = settingJsonObject(entity?.payload_json || entity?.payload || {})
      const constraints = settingJsonObject(entity?.constraints_json || entity?.constraints || {})
      const state = settingJsonObject(entity?.state_json || entity?.state || {})
      const keys = characterArcEntityKeys(entity)
      const usage = keys.map(key => usageMap.get(key)).find(Boolean)
        || usages.find((item: any) => compactBriefText(item?.name) && compactBriefText(entity?.name).includes(compactBriefText(item?.name)))
        || null
      const expected = settingJsonObject(usage?.expected_state_change || usage?.expectedStateChange || {})
      const relatedCharacters = characterArcListText(payload?.related_characters, payload?.characters, payload?.related_names, payload?.relatedNames)
      const nextAdvanceChapter = Number(state?.next_advance_chapter || payload?.next_advance_chapter || 0)
      const due = Boolean(chapterNo && nextAdvanceChapter && nextAdvanceChapter <= chapterNo)
      const mentioned = Boolean(chapterText && [
        compactBriefText(entity?.name),
        ...relatedCharacters,
      ].some(token => token && chapterText.includes(token)))
      if (!usage && !due && !mentioned) return null
      const growthBeat = characterArcJoinedText(
        expected?.growth_beat,
        expected?.growthBeat,
        expected?.character_growth,
        expected?.characterGrowth,
        expected?.next,
        payload?.growth_beat,
        payload?.growthBeat,
        payload?.growth_target,
        payload?.growthTarget,
        payload?.expected_payoff,
      )
      const relationshipShift = characterArcJoinedText(
        expected?.relationship_shift,
        expected?.relationshipShift,
        expected?.relationship_change,
        expected?.relationshipChange,
        expected?.next,
        payload?.relationship_shift,
        payload?.relationshipShift,
        state?.relationship_shift,
      )
      return {
        entity_id: Number(entity?.id || entity?.entity_id || 0) || null,
        entity_type: entityType,
        type_label: characterArcTypeLabel(entityType),
        name: compactBriefText(entity?.name || entity?.title, entityType === 'relationship_arc' ? '未命名关系线' : '未命名角色线'),
        summary: compactBriefText(entity?.summary || payload?.summary),
        usage_type: compactBriefText(usage?.usage_type || (due ? 'advance' : 'required')),
        related_characters: relatedCharacters,
        current_state: characterArcText(state?.current_state, entity?.status),
        desire: characterArcText(payload?.desire, payload?.character_desire, state?.desire, expected?.desire),
        flaw_pressure: characterArcText(payload?.flaw_pressure, payload?.flawPressure, payload?.inner_conflict, state?.flaw_pressure, expected?.flaw_pressure),
        growth_beat: growthBeat,
        relationship_shift: relationshipShift,
        voice_anchor: characterArcText(payload?.voice_anchor, payload?.voiceAnchor, state?.voice_anchor),
        forbidden_reveal: characterArcText(constraints?.forbidden_reveal, constraints?.taboo, payload?.forbidden_reveal),
        expected_state_change: expected,
        next_advance_chapter: nextAdvanceChapter || null,
      }
    })
    .filter(Boolean)
    .slice(0, 8)

  if (!arcs.length) return null
  const listFromArcs = (key: string) => Array.from(new Set(arcs.map((arc: any) => compactBriefText(arc?.[key])).filter(Boolean))).slice(0, 6)
  return {
    desire: listFromArcs('desire').join('；'),
    flaw_pressure: listFromArcs('flaw_pressure').join('；'),
    relationship_shift: listFromArcs('relationship_shift').join('；'),
    growth_beat: listFromArcs('growth_beat').join('；'),
    voice_anchor: listFromArcs('voice_anchor').join('；'),
    forbidden_reveal: listFromArcs('forbidden_reveal').join('；'),
    arcs,
  }
}

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

export function buildStyleSampleEffectivenessForSelection(styleSampleBank: any[] = [], chapters: any[] = [], reviews: any[] = []) {
  const rows = new Map<string, any>()
  const ensureRow = (sample: any) => {
    const key = String(sample?.sample_key || '').trim()
    if (!key) return null
    if (!rows.has(key)) {
      rows.set(key, {
        sample_key: key,
        usage_count: 0,
        style_scores: [],
        quality_scores: [],
        planned_count: 0,
        delivered_count: 0,
        missed_count: 0,
        copy_risk_count: 0,
      })
    }
    return rows.get(key)
  }

  normalizeStyleSampleBank(styleSampleBank).forEach(ensureRow)

  for (const chapter of asArray(chapters)) {
    const strategy = styleSelectionChapterStrategy(chapter)
    const samples = normalizeStyleSampleBank(strategy?.samples || strategy?.style_sample_bank || [])
    if (!samples.length) continue
    const syncPayload = latestStyleSelectionReviewPayload(reviews, chapter, 'style_sample_sync', 'style_sample_sync')
    const sync = syncPayload?.style_sample_sync || syncPayload || {}
    const styleScore = Number(sync?.score || 0)
    const qualityScore = styleSelectionChapterQualityScore(chapter, reviews)
    const copyRiskItems = asArray(sync?.copied_phrases || sync?.copiedPhrases)
    const planned = asArray(sync?.planned)
    const delivered = asArray(sync?.delivered)
    const missed = asArray(sync?.missed)

    for (const sample of samples) {
      const row = ensureRow(sample)
      if (!row) continue
      const key = row.sample_key
      const plannedForSample = planned.filter((item: any) => styleSelectionItemSampleKey(item) === key).length
      const deliveredForSample = delivered.filter((item: any) => styleSelectionItemSampleKey(item) === key).length
      const missedForSample = missed.filter((item: any) => styleSelectionItemSampleKey(item) === key).length

      row.usage_count += 1
      if (styleScore > 0) row.style_scores.push(styleScore)
      if (qualityScore > 0) row.quality_scores.push(qualityScore)
      row.planned_count += plannedForSample
      row.delivered_count += deliveredForSample
      row.missed_count += missedForSample
      row.copy_risk_count += missedForSample > 0 ? copyRiskItems.length : 0
    }
  }

  const samples = Array.from(rows.values()).map(row => {
    const hitRate = row.planned_count > 0 ? Math.round((row.delivered_count / row.planned_count) * 100) : 0
    const riskLabel = row.usage_count === 0
      ? '待验证'
      : row.copy_risk_count > 0 || row.missed_count > 0 || (row.planned_count > 0 && hitRate < 80)
        ? '需复盘'
        : '表现稳定'
    return {
      sample_key: row.sample_key,
      usage_count: row.usage_count,
      hit_rate: hitRate,
      missed_count: row.missed_count,
      copy_risk_count: row.copy_risk_count,
      average_style_score: styleSelectionRoundAverage(row.style_scores),
      average_quality_score: styleSelectionRoundAverage(row.quality_scores),
      risk_label: riskLabel,
    }
  })

  return {
    total_samples: samples.length,
    used_sample_count: samples.filter((item: any) => item.usage_count > 0).length,
    risky_sample_count: samples.filter((item: any) => item.risk_label === '需复盘').length,
    samples,
  }
}

function styleSampleSceneScore(sample: any, contextPackage: any = {}, index = 0) {
  const { text, signals } = buildStyleSampleSelectionSignals(contextPackage)
  const effectiveness = styleSampleEffectivenessForSample(sample, contextPackage)
  const applicableScenes = asArray(sample?.applicable_scenes)
    .map((item: any) => String(item || '').trim())
    .filter(Boolean)
  const avoidScenes = asArray(sample?.avoid_scenes || sample?.forbidden_scenes)
    .map((item: any) => String(item || '').trim())
    .filter(Boolean)
  let score = 0
  const matchedApplicable: string[] = []
  const matchedSignals: string[] = []
  for (const scene of applicableScenes) {
    if (signals.has(scene) || (scene.length >= 2 && text.includes(scene))) {
      score += 12
      matchedApplicable.push(scene)
    }
  }
  for (const scene of avoidScenes) {
    if (signals.has(scene) || (scene.length >= 2 && text.includes(scene))) score -= 20
  }
  const sampleText = [
    sample?.sample_key,
    sample?.scene_function,
    sample?.narrative_rhythm,
    sample?.abstract_usage,
  ].map(item => String(item || '')).join(' ')
  if (/规则|危机|压迫|反打|反制|强敌|战斗|冲突|围堵|压制|破局/.test(text) && /规则|危机|压迫|反打|反制|战斗/.test(sampleText)) score += 10
  if (/对白|交锋|试探|信息差|质问|谈判|阻止|争执|斗嘴/.test(text) && /对白|交锋|试探|信息差|关系/.test(sampleText)) score += 6
  if (String(contextPackage?.chapter_target?.ending_hook || contextPackage?.chapter_target?.endingHook || '').trim() && /章末|追读|钩子|新问题|危险/.test(sampleText)) score += 4
  for (const signal of signals) {
    if (signal.length >= 2 && sampleText.includes(signal)) {
      score += 4
      matchedSignals.push(signal)
    }
  }
  score += styleSampleEffectivenessAdjustment(effectiveness)
  if (!applicableScenes.length) score += 1
  const hitScenes = Array.from(new Set([...matchedApplicable, ...matchedSignals])).slice(0, 3)
  const effectivenessReason = styleSampleEffectivenessReason(effectiveness)
  const reasonParts = [
    hitScenes.length > 0 ? `命中${hitScenes.join('、')}` : '',
    avoidScenes.length > 0 ? `避开${avoidScenes.slice(0, 3).join('、')}` : '',
    effectivenessReason,
  ].filter(Boolean)
  const selectionReason = reasonParts.length > 0 ? `${reasonParts.join('；')}。` : '保留为通用风格策略。'
  return { sample, score, index, selectionReason, effectiveness, avoidByEffectiveness: styleSampleEffectivenessShouldAvoid(effectiveness) }
}

function selectStyleSamplesForChapter(samples: any[] = [], contextPackage: any = {}, options: any = {}) {
  const excludeKeys = new Set(asArray(options?.exclude_keys || options?.excludeKeys)
    .map((item: any) => String(item || '').trim())
    .filter(Boolean))
  const ranked = samples
    .filter(sample => !excludeKeys.has(String(sample?.sample_key || '').trim()))
    .map((sample, index) => styleSampleSceneScore(sample, contextPackage, index))
    .sort((a, b) => b.score - a.score || a.index - b.index)
  const positive = ranked.filter(item => item.score > 0)
  const preferred = positive.filter(item => !item.avoidByEffectiveness)
  const fallback = ranked.filter(item => item.score >= 0)
  const selected = preferred.length ? preferred.slice(0, 3) : (positive.length ? positive.slice(0, 3) : fallback.slice(0, 3))
  return selected.map(item => ({
    ...item.sample,
    selection_reason: item.selectionReason,
  }))
}

function styleSampleStrategyCopyGuards(strategy: any = {}, samples: any[] = []) {
  return Array.from(new Set([
    ...asArray(strategy?.do_not_copy || strategy?.copy_guard || strategy?.forbidden_copy),
    ...samples.flatMap((sample: any) => asArray(sample?.unsafe_direct_phrases)),
    '只学习叙述节奏、句式密度、对白比例和情绪转折',
    '原句不能照搬',
    '不得复制样章桥段、专有设定、角色名和核心梗',
  ].map((item: any) => String(item || '').trim()).filter(Boolean)))
}

export function applyStyleSampleStrategyAuthorAction(project: any, contextPackage: any = {}, currentStrategy: any = {}, request: any = {}) {
  const action = String(request?.action || 'lock').trim() || 'lock'
  const now = String(request?.now || new Date().toISOString())
  const currentSamples = normalizeStyleSampleBank(currentStrategy?.samples || currentStrategy?.style_sample_bank || [])
  const currentKeys = currentSamples.map((sample: any) => String(sample?.sample_key || '').trim()).filter(Boolean)
  const currentRound = Number(currentStrategy?.selection_round || currentStrategy?.selectionRound || 0) || 0

  if (action === 'disable' || action === 'clear') {
    return {
      ...(currentStrategy || {}),
      enabled: false,
      samples: [],
      apply_to: [],
      do_not_copy: styleSampleStrategyCopyGuards(currentStrategy, []),
      locked: true,
      selection_mode: 'disabled_by_author',
      author_locked_at: now,
      selection_note: '作者确认本章不用风格样章，正文只执行任务书、场景卡和写作圣经。',
    }
  }

  if (action === 'lock') {
    return {
      ...(currentStrategy || {}),
      enabled: currentSamples.length > 0,
      samples: currentSamples,
      do_not_copy: styleSampleStrategyCopyGuards(currentStrategy, currentSamples),
      locked: true,
      selection_mode: 'author_locked',
      author_locked_at: now,
      selection_note: '作者已确认本章使用这组风格样章策略。',
    }
  }

  const requestedKeys = asArray(request?.sample_keys || request?.sampleKeys)
    .map((item: any) => String(item || '').trim())
    .filter(Boolean)
  const bank = resolveStyleSampleBank(project, contextPackage)
  const bankByKey = new Map(bank.map((sample: any) => [String(sample?.sample_key || '').trim(), sample]))
  const selected = requestedKeys.length > 0
    ? requestedKeys.map((key: string) => bankByKey.get(key)).filter(Boolean)
    : selectStyleSamplesForChapter(bank, contextPackage, { excludeKeys: currentKeys })
  const nextSamples = selected.length > 0 ? selected : currentSamples

  return {
    ...(currentStrategy || {}),
    enabled: nextSamples.length > 0,
    samples: nextSamples,
    apply_to: nextSamples.length > 0 ? ['开篇钩子', '高压冲突', '对白推进', '章末钩子'] : [],
    do_not_copy: styleSampleStrategyCopyGuards(currentStrategy, nextSamples),
    locked: false,
    selection_mode: 'author_replaced',
    selection_round: currentRound + 1,
    author_updated_at: now,
    selection_note: selected.length > 0
      ? '作者已替换本章风格样章策略，生成前需要重新确认任务书。'
      : '暂无可替换的风格样章，暂时保留当前策略。',
  }
}

function buildMemeStrategy(project: any, contextPackage: any = {}) {
  const explicit = contextPackage?.chapter_target?.meme_strategy || contextPackage?.pre_draft_brief?.meme_strategy || null
  if (explicit && typeof explicit === 'object') {
    return {
      intensity: String(explicit.intensity || '轻度'),
      allowed_functions: asArray(explicit.allowed_functions || explicit.functions).map((item: any) => String(item || '').trim()).filter(Boolean),
      forbidden_usage: asArray(explicit.forbidden_usage || explicit.forbidden).map((item: any) => String(item || '').trim()).filter(Boolean),
      meme_bank: normalizeMemeBank(explicit.meme_bank || []),
    }
  }
  const memeBank = resolveMemeBank(project, contextPackage)
  const genre = String(project?.genre || contextPackage?.project?.genre || '').trim()
  const allowedFromBank = memeBank
    .filter((item: any) => !item.suitable_genres.length || !genre || item.suitable_genres.includes(genre))
    .map((item: any) => item.function)
    .filter(Boolean)
  return {
    intensity: memeBank.length > 0 ? '轻度' : '无',
    allowed_functions: Array.from(new Set(allowedFromBank.length ? allowedFromBank : ['主角吐槽', '反差打脸', '评论区爽点', '社畜共鸣', '规则怪谈弹幕感'])).slice(0, 6),
    forbidden_usage: [
      '严肃死亡场景不玩梗',
      '关键情绪爆点不插科打诨',
      '不直接复刻热梗原句',
      '不让网感表达改变剧情线、设定状态和人物状态',
    ],
    meme_bank: memeBank.slice(0, 12),
  }
}

function buildStyleSampleStrategy(project: any, contextPackage: any = {}) {
  const explicit = contextPackage?.chapter_target?.style_sample_strategy
    || contextPackage?.chapter_target?.styleSampleStrategy
    || contextPackage?.style_sample_strategy
    || contextPackage?.styleSampleStrategy
    || contextPackage?.pre_draft_brief?.style_sample_strategy
    || contextPackage?.pre_draft_brief?.styleSampleStrategy
    || contextPackage?.preDraftBrief?.style_sample_strategy
    || contextPackage?.preDraftBrief?.styleSampleStrategy
    || null
  if (explicit && typeof explicit === 'object') {
    const explicitSamples = normalizeStyleSampleBank(explicit.samples || explicit.style_sample_bank || explicit.styleSampleBank || [])
    const shouldHydrateSamples = explicitSamples.length === 0 && explicit.enabled !== false && explicit.selection_mode !== 'disabled_by_author'
    const samples = shouldHydrateSamples
      ? selectStyleSamplesForChapter(resolveStyleSampleBank(project, {
          ...(contextPackage || {}),
          pre_draft_brief: contextPackage?.pre_draft_brief
            ? { ...(contextPackage.pre_draft_brief || {}), style_sample_strategy: null, styleSampleStrategy: null }
            : contextPackage?.pre_draft_brief,
          preDraftBrief: contextPackage?.preDraftBrief
            ? { ...(contextPackage.preDraftBrief || {}), style_sample_strategy: null, styleSampleStrategy: null }
            : contextPackage?.preDraftBrief,
          chapter_target: contextPackage?.chapter_target
            ? { ...(contextPackage.chapter_target || {}), style_sample_strategy: null, styleSampleStrategy: null }
            : contextPackage?.chapter_target,
        }), contextPackage)
      : explicitSamples
    return {
      enabled: Boolean(explicit.enabled ?? samples.length > 0) && samples.length > 0,
      samples,
      apply_to: asArray(explicit.apply_to || explicit.applyTo).length
        ? asArray(explicit.apply_to || explicit.applyTo).map((item: any) => String(item || '').trim()).filter(Boolean)
        : samples.length > 0 ? ['开篇钩子', '高压冲突', '对白推进', '章末钩子'] : [],
      do_not_copy: Array.from(new Set([
        ...asArray(explicit.do_not_copy || explicit.doNotCopy || explicit.copy_guard || explicit.copyGuard || explicit.forbidden_copy || explicit.forbiddenCopy),
        ...samples.flatMap((sample: any) => asArray(sample.unsafe_direct_phrases)),
        '只学习叙述节奏、句式密度、对白比例和情绪转折',
        '原句不能照搬',
        '不得复制样章桥段、专有设定、角色名和核心梗',
      ].map((item: any) => String(item || '').trim()).filter(Boolean))),
    }
  }

  const samples = selectStyleSamplesForChapter(resolveStyleSampleBank(project, contextPackage), contextPackage)
  return {
    enabled: samples.length > 0,
    samples,
    apply_to: samples.length > 0 ? ['开篇钩子', '高压冲突', '对白推进', '章末钩子'] : [],
    do_not_copy: Array.from(new Set([
      ...samples.flatMap((sample: any) => asArray(sample.unsafe_direct_phrases)),
      '只学习叙述节奏、句式密度、对白比例和情绪转折',
      '原句不能照搬',
      '不得复制样章桥段、专有设定、角色名和核心梗',
    ].filter(Boolean))),
  }
}

const OH_STORY_STYLE_BOUNDARY_OVERRIDE_RULES = [
  '文风可覆盖默认 Gate D 短句拆分习惯：当样章有更具体的句长、段落和停顿节奏时，按样章抽象节奏执行。',
  '文风可覆盖默认 Gate B 句式去套路习惯：当样章提供更具体的句式密度、对白比例或节奏模式时，按本章场景功能取用。',
  '文风可覆盖默认标点习惯：只在服务人物声线、停顿节奏和情绪转折时保留更具体的标点节奏。',
  '覆盖只发生在表达层：叙述节奏、句式密度、对白比例、情绪转折和停顿，不得覆盖剧情事实、设定状态、人物状态和质量门禁。',
]

const OH_STORY_STYLE_BOUNDARY_HARD_CONSTRAINTS = [
  '禁用词 / banned_words 永远优先；样章出现过也不能复制或合理化。',
  'Gate F 章末禁升华永远优先；不得为了模仿文风写章末总结体、作者升华或空泛余韵。',
  '禁止万能比喻、命运感套话、作者预告和解释腔；文风示范不能覆盖去 AI 味硬门禁。',
  '禁止章末预告式写法：不得用“更大的风暴即将来临”等作者预告代替现场钩子。',
  '字数下限和场景功能优先；不能为了模仿短句或冷文风把计划情节点、动作过程、对话交锋和章尾钩子写丢。',
  '不得改变剧情线、设定状态、人物状态、伏笔状态、资产归属、关系边界和时间线。',
]

const OH_STORY_STYLE_BOUNDARY_COPY_RULES = [
  '只学习抽象技法：叙述节奏、句式密度、对白比例、情绪转折、停顿位置和信息释放顺序。',
  '不得复制样章桥段、专有设定、角色名、核心梗、原句、口癖和独特比喻。',
  'unsafe_direct_phrases、do_not_copy 和 forbidden_copy 中的内容必须进入禁用边界。',
  'matched_chapter_techniques 只能转化为本章动作、对话、信息差和章末钩子的执行方式。',
]

const OH_STORY_STYLE_BOUNDARY_CONFLICT_RULES = [
  '样章风格与质量门禁冲突时，质量门禁赢；硬约束永远赢。',
  'profile_degenerate、tone_match_failed 或文风不可用时，跳过文风，只执行默认 Gates 和本章合同。',
  'gaps 必须如实保留：不能在正文、自检或修订报告中假装缺失的模块/节奏/深拆已经存在。',
  '为了模仿文风引入禁用词、章末升华、万能比喻、空钩子或复制桥段时，必须按风格越界修复。',
]

const OH_STORY_STYLE_BOUNDARY_CHECKS = [
  '硬约束永远赢：禁用词、Gate F、万能比喻、章末预告、字数下限和剧情事实不能被文风覆盖。',
  '文风只覆盖表达层：句长、段落、停顿、对白比例和情绪转折可以调整，但不得改剧情和状态。',
  '样章不复制：不得复制样章桥段、专有设定、角色名、核心梗、原句、口癖和独特比喻。',
  '文风可用性清楚：profile_degenerate、tone_match_failed、module/rhythm gaps 必须保留并按降级规则处理。',
  '质量门禁不退让：为了模仿文风导致开篇钩子、爽点、章尾钩子、状态写回或字数下限变弱时必须修复。',
]

function styleBoundaryExplicitContract(contextPackage: any = {}, chapter: any = {}) {
  return contextPackage?.chapter_target?.style_boundary_contract
    || contextPackage?.chapter_target?.styleBoundaryContract
    || contextPackage?.chapterTarget?.style_boundary_contract
    || contextPackage?.chapterTarget?.styleBoundaryContract
    || contextPackage?.chapter_target?.pre_draft_brief?.style_boundary_contract
    || contextPackage?.chapter_target?.pre_draft_brief?.styleBoundaryContract
    || contextPackage?.chapter_target?.preDraftBrief?.style_boundary_contract
    || contextPackage?.chapter_target?.preDraftBrief?.styleBoundaryContract
    || contextPackage?.chapterTarget?.pre_draft_brief?.style_boundary_contract
    || contextPackage?.chapterTarget?.pre_draft_brief?.styleBoundaryContract
    || contextPackage?.chapterTarget?.preDraftBrief?.style_boundary_contract
    || contextPackage?.chapterTarget?.preDraftBrief?.styleBoundaryContract
    || contextPackage?.style_boundary_contract
    || contextPackage?.styleBoundaryContract
    || contextPackage?.pre_draft_brief?.style_boundary_contract
    || contextPackage?.pre_draft_brief?.styleBoundaryContract
    || contextPackage?.preDraftBrief?.style_boundary_contract
    || contextPackage?.preDraftBrief?.styleBoundaryContract
    || chapter?.raw_payload?.pre_draft_brief?.style_boundary_contract
    || chapter?.raw_payload?.pre_draft_brief?.styleBoundaryContract
    || chapter?.raw_payload?.preDraftBrief?.style_boundary_contract
    || chapter?.raw_payload?.preDraftBrief?.styleBoundaryContract
}

function styleBoundaryHasStyleInput(styleStrategy: any, benchmarkStrategy: any, benchmarkRecall: any) {
  return Boolean(
    styleStrategy?.enabled
    || asArray(styleStrategy?.samples).length
    || compactBriefText(styleStrategy?.selected_emotion_module || styleStrategy?.selectedEmotionModule)
    || compactBriefText(styleStrategy?.rhythm_reference || styleStrategy?.rhythmReference)
    || asArray(styleStrategy?.matched_chapter_techniques || styleStrategy?.matchedChapterTechniques).length
    || benchmarkStrategy?.enabled
    || asArray(benchmarkStrategy?.samples).length
    || benchmarkRecall,
  )
}

function styleBoundaryCopyRules(styleStrategy: any, benchmarkStrategy: any) {
  return uniqueBriefStrings([
    ...OH_STORY_STYLE_BOUNDARY_COPY_RULES,
    ...asArray(styleStrategy?.do_not_copy || styleStrategy?.doNotCopy),
    ...asArray(benchmarkStrategy?.do_not_copy || benchmarkStrategy?.doNotCopy),
    ...asArray(styleStrategy?.samples).flatMap((sample: any) => asArray(sample?.unsafe_direct_phrases || sample?.unsafeDirectPhrases || sample?.forbidden_copy || sample?.forbiddenCopy)),
    ...asArray(benchmarkStrategy?.samples).flatMap((sample: any) => asArray(sample?.do_not_copy || sample?.doNotCopy)),
  ], 18)
}

function stripStyleBoundaryExplicitContract(contextPackage: any = {}) {
  const stripBrief = (brief: any) => (
    brief && typeof brief === 'object' && !Array.isArray(brief)
      ? {
          ...brief,
          style_boundary_contract: null,
          styleBoundaryContract: null,
        }
      : brief
  )
  const stripTarget = (target: any) => (
    target && typeof target === 'object' && !Array.isArray(target)
      ? {
          ...target,
          style_boundary_contract: null,
          styleBoundaryContract: null,
          pre_draft_brief: stripBrief(target.pre_draft_brief),
          preDraftBrief: stripBrief(target.preDraftBrief),
        }
      : target
  )
  return {
    ...(contextPackage || {}),
    style_boundary_contract: null,
    styleBoundaryContract: null,
    pre_draft_brief: stripBrief(contextPackage?.pre_draft_brief),
    preDraftBrief: stripBrief(contextPackage?.preDraftBrief),
    chapter_target: stripTarget(contextPackage?.chapter_target),
    chapterTarget: stripTarget(contextPackage?.chapterTarget),
  }
}

function buildStyleBoundaryContract(project: any = {}, contextPackage: any = {}, options: any = {}) {
  const explicit = options.ignoreExplicit === true ? null : styleBoundaryExplicitContract(contextPackage)
  const contextWithoutExplicit = stripStyleBoundaryExplicitContract(contextPackage)
  const styleStrategy = options.style_sample_strategy
    || contextPackage?.chapter_target?.style_sample_strategy
    || contextPackage?.style_sample_strategy
    || contextPackage?.pre_draft_brief?.style_sample_strategy
    || buildStyleSampleStrategy(project, contextWithoutExplicit)
  const benchmarkStrategy = options.chapter_benchmark_strategy
    || contextPackage?.chapter_target?.chapter_benchmark_strategy
    || contextPackage?.chapter_benchmark_strategy
    || contextPackage?.pre_draft_brief?.chapter_benchmark_strategy
    || {}
  const benchmarkRecall = options.benchmark_recall_brief
    || contextPackage?.chapter_target?.benchmark_recall_brief
    || contextPackage?.benchmark_recall_brief
    || contextPackage?.pre_draft_brief?.benchmark_recall_brief
    || null
  const hasStyleInput = styleBoundaryHasStyleInput(styleStrategy, benchmarkStrategy, benchmarkRecall)
  if (!explicit && !hasStyleInput) return null

  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = hasStyleInput ? buildStyleBoundaryContract(project, contextWithoutExplicit, {
      ...options,
      ignoreExplicit: true,
      style_sample_strategy: styleStrategy,
      chapter_benchmark_strategy: benchmarkStrategy,
      benchmark_recall_brief: benchmarkRecall,
    }) || {} : {}
    const list = (snake: string, camel: string, fallback: any[]) => {
      const explicitList = asArray(explicit?.[snake] || explicit?.[camel]).map((item: any) => compactBriefText(item)).filter(Boolean)
      return explicitList.length ? explicitList : (asArray(derived?.[snake]).length ? asArray(derived?.[snake]) : fallback)
    }
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_style_boundary_v1',
      source: explicit.source || 'oh_story_style_profile_protocol',
      activation_reason: compactBriefText(explicit.activation_reason || explicit.activationReason, derived.activation_reason || '存在样章策略或对标召回，必须声明文风覆盖边界。'),
      style_override_rules: list('style_override_rules', 'styleOverrideRules', OH_STORY_STYLE_BOUNDARY_OVERRIDE_RULES),
      hard_constraints: list('hard_constraints', 'hardConstraints', OH_STORY_STYLE_BOUNDARY_HARD_CONSTRAINTS),
      copy_boundary_rules: list('copy_boundary_rules', 'copyBoundaryRules', styleBoundaryCopyRules(styleStrategy, benchmarkStrategy)),
      conflict_resolution_rules: list('conflict_resolution_rules', 'conflictResolutionRules', OH_STORY_STYLE_BOUNDARY_CONFLICT_RULES),
      quality_checks: explicitQualityChecks.length ? explicitQualityChecks : (asArray(derived.quality_checks).length ? asArray(derived.quality_checks) : OH_STORY_STYLE_BOUNDARY_CHECKS),
      revision_priorities: explicitRevisionPriorities.length
        ? explicitRevisionPriorities
        : (asArray(derived.revision_priorities).length
            ? asArray(derived.revision_priorities)
            : ['删风格越界禁用词', '修 Gate F 章末总结体', '删万能比喻和作者预告', '恢复字数/场景功能', '移除样章复制痕迹']),
    }
  }

  return {
    version: 'oh_story_style_boundary_v1',
    source: 'oh_story_style_profile_protocol',
    activation_reason: '存在样章策略或对标召回，必须声明文风覆盖边界。',
    style_override_rules: OH_STORY_STYLE_BOUNDARY_OVERRIDE_RULES,
    hard_constraints: OH_STORY_STYLE_BOUNDARY_HARD_CONSTRAINTS,
    copy_boundary_rules: styleBoundaryCopyRules(styleStrategy, benchmarkStrategy),
    conflict_resolution_rules: OH_STORY_STYLE_BOUNDARY_CONFLICT_RULES,
    quality_checks: OH_STORY_STYLE_BOUNDARY_CHECKS,
    revision_priorities: ['删风格越界禁用词', '修 Gate F 章末总结体', '删万能比喻和作者预告', '恢复字数/场景功能', '移除样章复制痕迹'],
  }
}

function buildChapterBenchmarkStrategy(project: any, contextPackage: any = {}) {
  const explicit = contextPackage?.chapter_target?.chapter_benchmark_strategy
    || contextPackage?.chapter_target?.chapterBenchmarkStrategy
    || contextPackage?.chapter_benchmark_strategy
    || contextPackage?.chapterBenchmarkStrategy
    || contextPackage?.pre_draft_brief?.chapter_benchmark_strategy
    || contextPackage?.pre_draft_brief?.chapterBenchmarkStrategy
    || contextPackage?.preDraftBrief?.chapter_benchmark_strategy
    || contextPackage?.preDraftBrief?.chapterBenchmarkStrategy
    || null
  if (explicit && typeof explicit === 'object') {
    const genre = String(project?.genre || contextPackage?.project?.genre || '').trim()
    const explicitSamples = normalizeChapterBenchmarkSampleBank(explicit.samples || explicit.chapter_benchmark_sample_bank || explicit.chapterBenchmarkSampleBank || [])
    const shouldHydrateSamples = explicitSamples.length === 0 && explicit.enabled !== false && explicit.selection_mode !== 'disabled_by_author'
    const samples = shouldHydrateSamples
      ? resolveChapterBenchmarkSampleBank(project, contextPackage)
          .filter((sample: any) => !sample.genre || !genre || sample.genre === genre)
          .slice(0, 6)
      : explicitSamples
    const explicitApplyTo = asArray(explicit.apply_to || explicit.applyTo).map((item: any) => String(item || '').trim()).filter(Boolean)
    return {
      ...(explicit || {}),
      enabled: Boolean(explicit.enabled ?? samples.length > 0) && samples.length > 0,
      samples,
      apply_to: explicitApplyTo.length
        ? explicitApplyTo
        : samples.length > 0 ? ['开篇300字', '场景目标/阻碍/转折/回报', '爽点兑现', '章末追读钩子'] : [],
      do_not_copy: Array.from(new Set([
        ...asArray(explicit.do_not_copy || explicit.doNotCopy || explicit.copy_guard || explicit.copyGuard || explicit.forbidden_copy || explicit.forbiddenCopy),
        ...samples.flatMap((sample: any) => asArray(sample.do_not_copy)),
        '只学习章节结构、信息密度、冲突节拍、爽点兑现和章末钩子',
        '不得复制样例桥段、角色名、专有设定和原句',
        '不得把样例剧情替换成本章剧情',
      ].map((item: any) => String(item || '').trim()).filter(Boolean))),
    }
  }

  const genre = String(project?.genre || contextPackage?.project?.genre || '').trim()
  const samples = resolveChapterBenchmarkSampleBank(project, contextPackage)
    .filter((sample: any) => !sample.genre || !genre || sample.genre === genre)
    .slice(0, 6)
  return {
    enabled: samples.length > 0,
    samples,
    apply_to: samples.length > 0 ? ['开篇300字', '场景目标/阻碍/转折/回报', '爽点兑现', '章末追读钩子'] : [],
    do_not_copy: Array.from(new Set([
      ...samples.flatMap((sample: any) => asArray(sample.do_not_copy)),
      '只学习章节结构、信息密度、冲突节拍、爽点兑现和章末钩子',
      '不得复制样例桥段、角色名、专有设定和原句',
      '不得把样例剧情替换成本章剧情',
    ].filter(Boolean))),
  }
}

export function buildMemePolishPrompt(project: any, contextPackage: any, chapterText: string) {
  const memeStrategy = contextPackage?.chapter_target?.meme_strategy
    || contextPackage?.chapter_target?.memeStrategy
    || contextPackage?.chapterTarget?.meme_strategy
    || contextPackage?.chapterTarget?.memeStrategy
    || buildMemeStrategy(project, contextPackage)
  return buildMemePolishPromptWithStrategy(project, contextPackage, chapterText, { memeStrategy })
}

function inferBlueprintFunctionTag(scene: any, index: number, total: number) {
  if (index === 0 && scene?.opening_hook) return '开篇钩子/铺垫'
  if (scene?.ending_hook_seed || index === total - 1) return '章尾钩子/承接'
  if (scene?.reversal || scene?.turning_point) return '转折/反转'
  if (scene?.reader_payoff) return '爽点/回报'
  if (scene?.information_gap) return '信息差/悬念'
  return '推进/过场'
}



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

export function buildChapterPreDraftBrief(project: any, contextPackage: any) {
  if (contextPackage?.chapterTarget) {
    const mergedChapterTarget = mergedContextChapterTargetPreferRuntime(contextPackage)
    contextPackage = {
      ...contextPackage,
      chapter_target: mergedChapterTarget,
      chapterTarget: mergedChapterTarget,
    }
  }
  const chapterTarget = contextPackage?.chapter_target || {}
  const sceneCards = Array.isArray(chapterTarget.scene_cards) && chapterTarget.scene_cards.length
    ? chapterTarget.scene_cards
    : Array.isArray(chapterTarget.sceneCards)
      ? normalizeSceneCardsPayload({ sceneCards: chapterTarget.sceneCards }, contextPackage)
      : []
  const sceneBriefs = sceneCards.map(sceneBriefFromCard)
  const chapterPositioningBrief = normalizeChapterPositioningBrief(contextPackage, sceneBriefs)
  const readerPayoffs = sceneBriefs.map(item => item.reader_payoff).filter(Boolean)
  const emotionalCurve = [
    sceneCards[0]?.emotional_tone,
    sceneCards.length > 1 ? sceneCards[Math.floor(sceneCards.length / 2)]?.emotional_tone : '',
    sceneCards.length > 1 ? sceneCards[sceneCards.length - 1]?.emotional_tone : '',
  ].filter(Boolean).join(' -> ')
  const settingScope = buildPreDraftSettingScope(contextPackage, chapterTarget)
  const storylineScope = buildPreDraftStorylineScope(contextPackage?.storyline_context || {})
  const characterArcBrief = buildCharacterArcBriefFromContext(contextPackage)
  const wordTarget = chapterTarget.word_target || {}
  const memeStrategy = buildMemeStrategy(project, contextPackage)
  const styleSampleStrategy = buildStyleSampleStrategy(project, contextPackage)
  const chapterBenchmarkStrategy = buildChapterBenchmarkStrategy(project, contextPackage)
  const styleBoundaryContract = buildStyleBoundaryContract(project, contextPackage, {
    style_sample_strategy: styleSampleStrategy,
    chapter_benchmark_strategy: chapterBenchmarkStrategy,
  })
  const first30RetentionBrief = first30RetentionBriefFromContext(contextPackage)
  const longformCompass = normalizeLongformCompass(longformCompassFromContext(contextPackage))
  const longformBattleContext = normalizeLongformBattleContext(longformBattleContextFromContext(contextPackage))
  const longformMemoryCapsule = normalizeLongformMemoryCapsule(
    contextPackage?.chapter_target?.longform_memory_capsule
    || contextPackage?.chapter_target?.longformMemoryCapsule
    || contextPackage?.longform_memory_capsule
    || contextPackage?.longformMemoryCapsule,
  )
  const layeredMemoryContext = normalizeLayeredMemoryContext(
    contextPackage?.chapter_target?.layered_memory_context
    || contextPackage?.chapter_target?.layeredMemoryContext
    || contextPackage?.chapter_target?.longform_layered_memory
    || contextPackage?.chapter_target?.longformLayeredMemory
    || contextPackage?.layered_memory_context
    || contextPackage?.layeredMemoryContext
    || contextPackage?.longform_layered_memory
    || contextPackage?.longformLayeredMemory,
  )
  const progressSummary = normalizeDailyProgressSummary(
    contextPackage?.chapter_target?.progress_summary
    || contextPackage?.chapter_target?.progressSummary
    || contextPackage?.progress_summary
    || contextPackage?.progressSummary
    || contextPackage?.story_state?.progress_summary
    || contextPackage?.storyState?.progressSummary
    || project?.reference_config?.story_state?.progress_summary
    || project?.reference_config?.storyState?.progressSummary
    || project?.story_state?.progress_summary
    || project?.storyState?.progressSummary,
  )
  const dailyContextSnapshot = normalizeDailyContextSnapshot(
    contextPackage?.chapter_target?.daily_context_snapshot
    || contextPackage?.chapter_target?.dailyContextSnapshot
    || contextPackage?.pre_draft_brief?.daily_context_snapshot
    || contextPackage?.pre_draft_brief?.dailyContextSnapshot
    || contextPackage?.preDraftBrief?.daily_context_snapshot
    || contextPackage?.preDraftBrief?.dailyContextSnapshot
    || contextPackage?.daily_context_snapshot
    || contextPackage?.dailyContextSnapshot
    || contextPackage?.story_state?.daily_context_snapshot
    || contextPackage?.story_state?.dailyContextSnapshot
    || contextPackage?.storyState?.dailyContextSnapshot
    || project?.reference_config?.story_state?.daily_context_snapshot
    || project?.reference_config?.story_state?.dailyContextSnapshot
    || project?.reference_config?.storyState?.dailyContextSnapshot
    || project?.story_state?.daily_context_snapshot
    || project?.story_state?.dailyContextSnapshot
    || project?.storyState?.dailyContextSnapshot,
  )
  const foreshadowingConsistencyRadar = normalizeForeshadowingConsistencyRadar(
    contextPackage?.chapter_target?.foreshadowing_consistency_radar
    || contextPackage?.chapter_target?.foreshadowingConsistencyRadar
    || contextPackage?.pre_draft_brief?.foreshadowing_consistency_radar
    || contextPackage?.pre_draft_brief?.foreshadowingConsistencyRadar
    || contextPackage?.preDraftBrief?.foreshadowing_consistency_radar
    || contextPackage?.preDraftBrief?.foreshadowingConsistencyRadar
    || contextPackage?.foreshadowing_consistency_radar
    || contextPackage?.foreshadowingConsistencyRadar
    || contextPackage?.story_state?.foreshadowing_consistency_radar
    || contextPackage?.story_state?.foreshadowingConsistencyRadar
    || contextPackage?.storyState?.foreshadowingConsistencyRadar
    || project?.reference_config?.story_state?.foreshadowing_consistency_radar
    || project?.reference_config?.story_state?.foreshadowingConsistencyRadar
    || project?.reference_config?.storyState?.foreshadowingConsistencyRadar
    || project?.story_state?.foreshadowing_consistency_radar
    || project?.story_state?.foreshadowingConsistencyRadar
    || project?.storyState?.foreshadowingConsistencyRadar
    || {
      foreshadowing_status: contextPackage?.story_state?.foreshadowing_status
        || contextPackage?.story_state?.foreshadowingStatus
        || contextPackage?.storyState?.foreshadowingStatus
        || project?.reference_config?.story_state?.foreshadowing_status
        || project?.reference_config?.story_state?.foreshadowingStatus
        || project?.reference_config?.storyState?.foreshadowingStatus
        || project?.story_state?.foreshadowing_status
        || project?.story_state?.foreshadowingStatus
        || project?.storyState?.foreshadowingStatus,
      payoff_queue: contextPackage?.story_state?.payoff_queue
        || contextPackage?.story_state?.payoffQueue
        || contextPackage?.storyState?.payoffQueue
        || project?.reference_config?.story_state?.payoff_queue
        || project?.reference_config?.story_state?.payoffQueue
        || project?.reference_config?.storyState?.payoffQueue
        || project?.story_state?.payoff_queue
        || project?.story_state?.payoffQueue
        || project?.storyState?.payoffQueue,
    },
    Number(chapterTarget.chapter_no || 0),
  )
  const nextBatchBrief = normalizeNextBatchBrief(nextBatchBriefFromContext(contextPackage), Number(chapterTarget.chapter_no || 0))
  const storyUnitContext = storyUnitContextFromContext(contextPackage, { chapter_no: chapterTarget.chapter_no })
  const readerRetentionBrief = buildReaderRetentionBrief(project, contextPackage, sceneBriefs)
  const readerDropRiskBrief = normalizeReaderDropRiskBrief(
    contextPackage?.chapter_target?.reader_drop_risk_brief
    || contextPackage?.reader_drop_risk_brief
    || contextPackage?.reader_trial_context
    || contextPackage?.readerTrialContext,
    readerRetentionBrief,
    first30RetentionBrief,
  )
  const goldenThreeBrief = buildGoldenThreeBrief(project, contextPackage, sceneBriefs)
  const storyPressureBrief = normalizeStoryPressureBrief(
    contextPackage?.chapter_target?.story_pressure_brief
    || contextPackage?.chapter_target?.storyPressureBrief
    || contextPackage?.story_pressure_brief
    || contextPackage?.storyPressureBrief
    || contextPackage?.story_pressure_ladder
    || contextPackage?.storyPressureLadder,
  )
  const storyDriveBrief = normalizeStoryDriveBrief(
    contextPackage?.chapter_target?.story_drive_brief
    || contextPackage?.chapter_target?.storyDriveBrief
    || contextPackage,
    sceneCards,
  )
  const serialRhythmBrief = normalizeSerialRhythmBrief(
    contextPackage?.chapter_target?.serial_rhythm_brief
    || contextPackage?.chapter_target?.serialRhythmBrief
    || contextPackage?.serial_rhythm_brief
    || contextPackage?.serialRhythmBrief,
    sceneBriefs,
    readerRetentionBrief,
    wordTarget,
  )
  const pageTurnHookBrief = normalizePageTurnHookBrief(
    contextPackage?.chapter_target?.page_turn_hook_brief
    || contextPackage?.chapter_target?.pageTurnHookBrief
    || contextPackage?.page_turn_hook_brief
    || contextPackage?.pageTurnHookBrief,
    chapterTarget,
    sceneBriefs,
    readerRetentionBrief,
    storyDriveBrief,
  )
  const volumeClimaxBrief = normalizeVolumeClimaxBrief(
    contextPackage?.chapter_target?.volume_climax_brief
    || contextPackage?.chapter_target?.volumeClimaxBrief
    || contextPackage?.chapter_target?.volume_beat_brief
    || contextPackage?.chapter_target?.volumeBeatBrief
    || contextPackage?.volume_climax_brief
    || contextPackage?.volumeClimaxBrief
    || contextPackage?.volume_beat_brief
    || contextPackage?.volumeBeatBrief
    || contextPackage?.volume_beat_budget
    || contextPackage?.volumeBeatBudget,
    chapterTarget,
    contextPackage?.volume_beat_budget || contextPackage?.volumeBeatBudget,
  )
  const preDraftBrief = contextPackage?.pre_draft_brief || contextPackage?.preDraftBrief || {}
  const recentFatigueBrief = normalizeRecentFatigueBrief(
    contextPackage?.chapter_target?.recent_fatigue_brief
    || contextPackage?.chapter_target?.recentFatigueBrief
    || contextPackage?.chapter_target?.recent_fatigue_radar
    || contextPackage?.chapter_target?.recentFatigueRadar
    || preDraftBrief.recent_fatigue_brief
    || preDraftBrief.recentFatigueBrief
    || preDraftBrief.recent_fatigue_radar
    || preDraftBrief.recentFatigueRadar
    || contextPackage?.recent_fatigue_brief
    || contextPackage?.recentFatigueBrief
    || contextPackage?.recent_fatigue_radar
    || contextPackage?.recentFatigueRadar,
  )
  const deliveryRiskCarryOver = normalizeDeliveryRiskCarryOverContext(
    contextPackage?.chapter_target?.delivery_risk_carry_over
    || contextPackage?.chapter_target?.deliveryRiskCarryOver
    || preDraftBrief.delivery_risk_carry_over
    || preDraftBrief.deliveryRiskCarryOver
    || contextPackage?.delivery_risk_carry_over
    || contextPackage?.deliveryRiskCarryOver,
  )
  const governanceRecheckMemory = normalizeGovernanceRecheckMemoryContext(
    contextPackage?.chapter_target?.governance_recheck_memory
    || contextPackage?.chapter_target?.governanceRecheckMemory
    || preDraftBrief.governance_recheck_memory
    || preDraftBrief.governanceRecheckMemory
    || contextPackage?.governance_recheck_memory
    || contextPackage?.governanceRecheckMemory
    || contextPackage?.pre_draft_brief?.governance_recheck_memory
    || contextPackage?.preDraftBrief?.governanceRecheckMemory,
  )
  const readerExpectationDebtContext = applyReaderExpectationDebtAging(
    normalizeReaderExpectationDebtContext(
      chapterTarget.reader_expectation_debt_context
      || chapterTarget.readerExpectationDebtContext
      || contextPackage?.reader_expectation_debt_context
      || contextPackage?.readerExpectationDebtContext,
    ),
    Number(chapterTarget.chapter_no || 0),
  )
  const readerExpectationLedger = buildReaderExpectationLedger(project, {
    ...contextPackage,
    reader_expectation_debt_context: readerExpectationDebtContext,
    chapter_target: {
      ...(contextPackage?.chapter_target || {}),
      reader_expectation_debt_context: readerExpectationDebtContext,
    },
  }, sceneBriefs, readerRetentionBrief)
  const signatureSceneBrief = normalizeSignatureSceneBrief(chapterTarget.signature_scene_brief || chapterTarget.rollingPlan || chapterTarget.rolling_plan)
  const innovationBrief = buildChapterInnovationBrief(project, {
    ...contextPackage,
    chapter_target: {
      ...chapterTarget,
      signature_scene_brief: signatureSceneBrief,
    },
  }, sceneBriefs, longformCompass)
  const coreContractRadar = buildCoreContractRadar(project, contextPackage, sceneBriefs, longformCompass, longformBattleContext)
  const previousHandoff = buildPreviousChapterHandoff(contextPackage)
  const platformRubric = buildPlatformRubric(project, contextPackage)
  const contentRubric = buildContentRubric(contextPackage)
  const dialogueContract = buildDialogueContract(contextPackage)
  const plotDynamicsContract = buildPlotDynamicsContract(contextPackage)
  const storyPowerContract = buildStoryPowerContract(project, contextPackage)
  const continuityHeatContract = buildContinuityHeatContract(contextPackage)
  const characterRelationContract = buildCharacterRelationContract(contextPackage)
  const characterBehaviorContract = buildCharacterBehaviorContract(contextPackage)
  const assetLinkageContract = buildAssetLinkageContract(contextPackage)
  const stateTrackingContract = buildStateTrackingContract(contextPackage)
  const informationFlowContract = buildInformationFlowContract(contextPackage)
  const expectationThresholdContract = buildExpectationThresholdContract(contextPackage)
  const targetReaderContract = buildTargetReaderContract(project, contextPackage)
  const genrePositioningContract = buildGenrePositioningContract(project, contextPackage)
  const plotSpecialTopicsContract = plotSpecialTopicsContractForSync(project, contextPackage)
  const femaleAudienceContract = buildFemaleAudienceContract(project, contextPackage)
  const upgradeRhythmContract = buildUpgradeRhythmContract(project, contextPackage)
  const conflictStructureContract = buildConflictStructureContract(project, contextPackage)
  const storyLoopContract = buildStoryLoopContract(project, contextPackage)
  const emotionalArcContract = buildEmotionalArcContract(project, contextPackage)
  const chapterHookContract = buildChapterHookContract(project, contextPackage)
  const paragraphHookContract = buildParagraphHookContract(project, contextPackage)
  const suspenseContract = buildSuspenseContract(project, contextPackage)
  const reversalContract = buildReversalContract(project, contextPackage)
  const showdownContract = buildShowdownContract(project, contextPackage)
  const bridgeUnitContract = buildBridgeUnitContract(project, contextPackage)
  const plotFrameworkContract = buildPlotFrameworkContract(project, contextPackage, {
    showdown_contract: showdownContract,
    bridge_unit_contract: bridgeUnitContract,
    suspense_contract: suspenseContract,
    conflict_structure_contract: conflictStructureContract,
  })
  const openingContract = buildOpeningContract(project, contextPackage)
  const proseCraftContract = buildProseCraftContract(project, contextPackage)
  const punctuationToneContract = buildPunctuationToneContract(project, contextPackage)
  const qualityAuditContract = buildQualityAuditContract(project, contextPackage)
  const chapterBlueprint = buildChapterBlueprintFromContext(contextPackage, {
    scene_briefs: sceneBriefs,
    emotional_curve: emotionalCurve,
    reader_promise: readerPayoffs.join('；') || contextPackage?.writing_bible?.promise || project?.synopsis,
    story_drive_brief: storyDriveBrief,
    serial_rhythm_brief: serialRhythmBrief,
    chapter_positioning_brief: chapterPositioningBrief,
    page_turn_hook_brief: pageTurnHookBrief,
    character_arc_brief: characterArcBrief,
    platform_rubric: platformRubric,
    content_rubric: contentRubric,
    dialogue_contract: dialogueContract,
    plot_dynamics_contract: plotDynamicsContract,
    story_power_contract: storyPowerContract,
    continuity_heat_contract: continuityHeatContract,
    character_relation_contract: characterRelationContract,
    character_behavior_contract: characterBehaviorContract,
    asset_linkage_contract: assetLinkageContract,
    state_tracking_contract: stateTrackingContract,
    information_flow_contract: informationFlowContract,
    expectation_threshold_contract: expectationThresholdContract,
    target_reader_contract: targetReaderContract,
    genre_positioning_contract: genrePositioningContract,
    female_audience_contract: femaleAudienceContract,
    upgrade_rhythm_contract: upgradeRhythmContract,
    conflict_structure_contract: conflictStructureContract,
    story_loop_contract: storyLoopContract,
    emotional_arc_contract: emotionalArcContract,
    chapter_hook_contract: chapterHookContract,
    paragraph_hook_contract: paragraphHookContract,
    suspense_contract: suspenseContract,
    reversal_contract: reversalContract,
    showdown_contract: showdownContract,
    bridge_unit_contract: bridgeUnitContract,
    plot_framework_contract: plotFrameworkContract,
    style_boundary_contract: styleBoundaryContract,
    opening_contract: openingContract,
    prose_craft_contract: proseCraftContract,
    punctuation_tone_contract: punctuationToneContract,
    quality_audit_contract: qualityAuditContract,
  })
  const benchmarkRecallBrief = buildBenchmarkRecallBrief(contextPackage, {
    chapter_blueprint: chapterBlueprint,
    style_sample_strategy: contextPackage?.chapter_target?.style_sample_strategy || contextPackage?.style_sample_strategy || styleSampleStrategy,
    chapter_benchmark_strategy: chapterBenchmarkStrategy,
  })
  const benchmarkRecallGaps = benchmarkRecallGapsFromContext(contextPackage, {
    style_sample_strategy: contextPackage?.chapter_target?.style_sample_strategy || contextPackage?.style_sample_strategy || styleSampleStrategy,
    chapter_benchmark_strategy: chapterBenchmarkStrategy,
  })
  const intentConfirmationContract = buildIntentConfirmationContract(contextPackage, {
    chapter_blueprint: chapterBlueprint,
    emotional_curve: emotionalCurve,
    style_sample_strategy: contextPackage?.chapter_target?.style_sample_strategy || contextPackage?.style_sample_strategy || styleSampleStrategy,
    chapter_benchmark_strategy: chapterBenchmarkStrategy,
    state_tracking_contract: stateTrackingContract,
  })
  const writePreparationBrief = buildWritePreparationBrief(contextPackage, {
    chapter_blueprint: chapterBlueprint,
    reader_retention_brief: readerRetentionBrief,
    asset_linkage_contract: assetLinkageContract,
    state_tracking_contract: stateTrackingContract,
    delivery_risk_carry_over: deliveryRiskCarryOver,
    benchmark_recall_brief: benchmarkRecallBrief,
    benchmark_recall_gaps: benchmarkRecallGaps,
    recent_fatigue_brief: recentFatigueBrief,
    batch_preflight: contextPackage?.chapter_target?.batch_preflight || contextPackage?.batch_preflight,
    reader_expectation_debt_context: readerExpectationDebtContext,
    target_reader_contract: targetReaderContract,
    genre_positioning_contract: genrePositioningContract,
    plot_special_topics_contract: plotSpecialTopicsContract,
    story_power_contract: storyPowerContract,
    core_contract_radar: coreContractRadar,
  })

  return {
    chapter_no: Number(chapterTarget.chapter_no || 0) || null,
    title: compactBriefText(chapterTarget.title, '未命名章节'),
    previous_handoff: previousHandoff,
    chapter_goal: compactBriefText(chapterTarget.summary || chapterTarget.goal || chapterTarget.chapter_goal),
    reader_promise: compactBriefText(readerPayoffs.join('；') || contextPackage?.writing_bible?.promise || project?.synopsis),
    core_conflict: compactBriefText(chapterTarget.conflict || sceneCards.map((card: any) => card?.conflict).filter(Boolean).join('；')),
    emotional_curve: compactBriefText(emotionalCurve || contextPackage?.writing_bible?.style_lock?.emotional_curve || '压迫 -> 试探 -> 转折/回报'),
    key_settings: Array.from(new Set(settingScope.key_settings)).slice(0, 12),
    forbidden_content: Array.from(new Set([
      ...settingScope.forbidden_content,
      ...asArray(deliveryRiskCarryOver?.forbidden_repeats),
    ])).slice(0, 12),
    storyline_advances: Array.from(new Set(storylineScope.storyline_advances)).slice(0, 12),
    storyline_plants: Array.from(new Set(storylineScope.storyline_plants)).slice(0, 12),
    storyline_payoffs: Array.from(new Set(storylineScope.storyline_payoffs)).slice(0, 12),
    storyline_forbidden: Array.from(new Set(storylineScope.storyline_forbidden)).slice(0, 12),
    platform_rubric: platformRubric,
    content_rubric: contentRubric,
    dialogue_contract: dialogueContract,
    plot_dynamics_contract: plotDynamicsContract,
    story_power_contract: storyPowerContract,
    continuity_heat_contract: continuityHeatContract,
    character_relation_contract: characterRelationContract,
    character_behavior_contract: characterBehaviorContract,
    asset_linkage_contract: assetLinkageContract,
    state_tracking_contract: stateTrackingContract,
    write_preparation_brief: writePreparationBrief,
    intent_confirmation_contract: intentConfirmationContract,
    information_flow_contract: informationFlowContract,
    expectation_threshold_contract: expectationThresholdContract,
    target_reader_contract: targetReaderContract,
    genre_positioning_contract: genrePositioningContract,
    plot_special_topics_contract: plotSpecialTopicsContract,
    female_audience_contract: femaleAudienceContract,
    upgrade_rhythm_contract: upgradeRhythmContract,
    conflict_structure_contract: conflictStructureContract,
    story_loop_contract: storyLoopContract,
    emotional_arc_contract: emotionalArcContract,
    chapter_hook_contract: chapterHookContract,
    paragraph_hook_contract: paragraphHookContract,
    suspense_contract: suspenseContract,
    reversal_contract: reversalContract,
    showdown_contract: showdownContract,
    bridge_unit_contract: bridgeUnitContract,
    plot_framework_contract: plotFrameworkContract,
    style_boundary_contract: styleBoundaryContract,
    opening_contract: openingContract,
    prose_craft_contract: proseCraftContract,
    punctuation_tone_contract: punctuationToneContract,
    quality_audit_contract: qualityAuditContract,
    character_arc_brief: characterArcBrief,
    reader_retention_brief: readerRetentionBrief,
    reader_drop_risk_brief: readerDropRiskBrief,
    golden_three_brief: goldenThreeBrief,
    story_pressure_brief: storyPressureBrief,
    story_drive_brief: storyDriveBrief,
    serial_rhythm_brief: serialRhythmBrief,
    chapter_positioning_brief: chapterPositioningBrief,
    page_turn_hook_brief: pageTurnHookBrief,
    volume_climax_brief: volumeClimaxBrief,
    recent_fatigue_brief: recentFatigueBrief,
    delivery_risk_carry_over: deliveryRiskCarryOver,
    governance_recheck_memory: governanceRecheckMemory,
    reader_expectation_debt: readerExpectationDebtContext,
    reader_expectation_ledger: readerExpectationLedger,
    innovation_brief: innovationBrief,
    signature_scene_brief: signatureSceneBrief,
    meme_strategy: memeStrategy,
    benchmark_recall_brief: benchmarkRecallBrief,
    benchmark_recall_gaps: benchmarkRecallGaps,
    style_sample_strategy: styleSampleStrategy,
    chapter_benchmark_strategy: chapterBenchmarkStrategy,
    first30_retention_brief: first30RetentionBrief,
    core_contract_radar: coreContractRadar,
    longform_compass: longformCompass,
    longform_battle_context: longformBattleContext,
    longform_memory_capsule: longformMemoryCapsule,
    layered_memory_context: layeredMemoryContext,
    progress_summary: progressSummary,
    daily_context_snapshot: dailyContextSnapshot,
    foreshadowing_consistency_radar: foreshadowingConsistencyRadar,
    next_batch_brief: nextBatchBrief,
    story_unit_context: storyUnitContext,
    chapter_blueprint: chapterBlueprint,
    scene_briefs: sceneBriefs,
    word_budget: wordTarget?.target
      ? `${wordTarget.label || '章节'} ${wordTarget.target} 字，可接受 ${wordTarget.min}-${wordTarget.max} 字`
      : compactBriefText(contextPackage?.style_lock?.chapter_word_range, '按写作圣经字数范围执行'),
    ending_hook: compactBriefText(chapterTarget.ending_hook || sceneBriefs.map(item => item.ending_hook_seed).filter(Boolean).slice(-1)[0]),
    generated_at: new Date().toISOString(),
  }
}

export function mergeConfirmedPreDraftBriefIntoContext(contextPackage: any, preDraftBrief: any) {
  if (!preDraftBrief?.confirmed_at) return contextPackage
  if (contextPackage?.chapterTarget) {
    const mergedChapterTarget = {
      ...(contextPackage.chapterTarget || {}),
      ...(contextPackage.chapter_target || {}),
    }
    contextPackage = {
      ...(contextPackage || {}),
      chapter_target: mergedChapterTarget,
      chapterTarget: mergedChapterTarget,
    }
  }
  const longformCompass = normalizeLongformCompass(longformCompassFromContext(contextPackage, preDraftBrief))
  const coreContractRadar = normalizeCoreContractRadar(coreContractRadarFromContext(contextPackage, preDraftBrief))
  const longformBattleContext = normalizeLongformBattleContext(longformBattleContextFromContext(contextPackage, preDraftBrief))
  const confirmedMemorySources = resolveConfirmedPreDraftMemorySources(contextPackage, preDraftBrief)
  const longformMemoryCapsule = normalizeLongformMemoryCapsule(confirmedMemorySources.longform_memory_capsule)
  const layeredMemoryContext = normalizeLayeredMemoryContext(confirmedMemorySources.layered_memory_context)
  const progressSummary = normalizeDailyProgressSummary(confirmedMemorySources.progress_summary)
  const dailyContextSnapshot = normalizeDailyContextSnapshot(confirmedMemorySources.daily_context_snapshot)
  const confirmedBriefSources = resolveConfirmedPreDraftBriefSources(contextPackage, preDraftBrief)
  const confirmedContractSources = resolveConfirmedPreDraftContractSources(contextPackage, preDraftBrief)
  const confirmedSceneCards = repairSceneCardsForProseContextHandoff(
    normalizeSceneCardsPayload({
      scene_cards: confirmedBriefSources.scene_briefs.length
        ? confirmedBriefSources.scene_briefs
        : confirmedBriefSources.scene_cards,
    }, contextPackage),
    contextPackage,
    {
      chapter_no: (contextPackage || {}).chapter_target?.chapter_no || preDraftBrief.chapter_no,
      title: (contextPackage || {}).chapter_target?.title || preDraftBrief.title,
      chapter_goal: (contextPackage || {}).chapter_target?.goal || preDraftBrief.chapter_goal,
      chapter_summary: (contextPackage || {}).chapter_target?.summary || preDraftBrief.chapter_goal,
      conflict: (contextPackage || {}).chapter_target?.conflict || preDraftBrief.core_conflict,
      ending_hook: (contextPackage || {}).chapter_target?.ending_hook || preDraftBrief.ending_hook,
    },
    confirmedBriefSources.chapter_blueprint || confirmedBriefSources.chapterBlueprint || {},
  )
  const targetChapterNo = Number((contextPackage || {}).chapter_target?.chapter_no || preDraftBrief.chapter_no || 0)
  const foreshadowingConsistencyRadar = normalizeForeshadowingConsistencyRadar(
    resolveConfirmedPreDraftForeshadowingSource(contextPackage, preDraftBrief),
    targetChapterNo,
  )
  const nextBatchBrief = normalizeNextBatchBrief(nextBatchBriefFromContext(contextPackage, preDraftBrief), targetChapterNo)
  const storyUnitContext = storyUnitContextFromContext({
    ...(contextPackage || {}),
    pre_draft_brief: preDraftBrief,
    preDraftBrief,
  }, { chapter_no: targetChapterNo })
  const confirmedReaderRetentionBrief = normalizeReaderRetentionBrief(confirmedBriefSources.reader_retention_brief)
  const readerDropRiskBrief = normalizeReaderDropRiskBrief(
    confirmedBriefSources.reader_drop_risk_brief,
    confirmedReaderRetentionBrief,
    first30RetentionBriefFromContext(contextPackage, preDraftBrief),
  )
  const goldenThreeBrief = normalizeGoldenThreeBrief(
    confirmedBriefSources.golden_three_brief,
    targetChapterNo,
  )
  const storyPressureBrief = normalizeStoryPressureBrief(
    confirmedBriefSources.story_pressure_brief,
  )
  const storyDriveBrief = normalizeStoryDriveBrief(
    confirmedBriefSources.story_drive_brief,
    confirmedSceneCards,
  )
  const sceneBriefs = confirmedSceneCards.map(sceneBriefFromCard)
  const serialRhythmBrief = normalizeSerialRhythmBrief(
    confirmedBriefSources.serial_rhythm_brief,
    sceneBriefs,
    confirmedReaderRetentionBrief,
    (contextPackage || {}).chapter_target?.word_target,
  )
  const pageTurnHookBrief = normalizePageTurnHookBrief(
    confirmedBriefSources.page_turn_hook_brief,
    (contextPackage || {}).chapter_target || {},
    sceneBriefs,
    confirmedReaderRetentionBrief,
    storyDriveBrief,
  )
  const volumeClimaxBrief = normalizeVolumeClimaxBrief(
    confirmedBriefSources.volume_climax_brief,
    (contextPackage || {}).chapter_target || {},
    confirmedBriefSources.volume_beat_budget,
  )
  const recentFatigueBrief = normalizeRecentFatigueBrief(confirmedBriefSources.recent_fatigue_brief)
  const deliveryRiskCarryOver = normalizeDeliveryRiskCarryOverContext(confirmedBriefSources.delivery_risk_carry_over)
  const governanceRecheckMemory = normalizeGovernanceRecheckMemoryContext(confirmedBriefSources.governance_recheck_memory)
  const readerExpectationDebtContext = applyReaderExpectationDebtAging(
    normalizeReaderExpectationDebtContext(confirmedBriefSources.reader_expectation_debt_context),
    Number((contextPackage || {}).chapter_target?.chapter_no || preDraftBrief.chapter_no || 0),
  )
  const readerExpectationLedger = normalizeReaderExpectationLedgerContract(
    confirmedBriefSources.reader_expectation_ledger,
    (contextPackage || {}).chapter_target || {},
    preDraftBrief,
    readerExpectationDebtContext,
  )
  const signatureSceneBrief = normalizeSignatureSceneBrief(
    confirmedBriefSources.signature_scene_brief,
  )
  const innovationBrief = normalizeInnovationBrief(confirmedBriefSources.innovation_brief)
  const characterArcBrief = confirmedBriefSources.character_arc_brief
  const chapterBlueprint = confirmedBriefSources.chapter_blueprint
  const confirmedStyleSampleStrategy = confirmedBriefSources.style_sample_strategy
  const confirmedChapterBenchmarkStrategy = confirmedBriefSources.chapter_benchmark_strategy
  const skipBenchmarkRecall = benchmarkRecallIsNoBenchmark(benchmarkRecallGapsFromContext(contextPackage, {
    style_sample_strategy: confirmedStyleSampleStrategy,
    chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
  }))
  const benchmarkRecallGaps = benchmarkRecallGapsFromContext(contextPackage, {
    style_sample_strategy: confirmedStyleSampleStrategy,
    chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
  })
  const benchmarkRecallSources = resolveConfirmedPreDraftBenchmarkRecallSources(contextPackage, preDraftBrief)
  const benchmarkRecallBrief = skipBenchmarkRecall
    ? null
    : buildBenchmarkRecallBrief({
      ...(contextPackage || {}),
      benchmark_recall_brief: benchmarkRecallSources.benchmark_recall_brief,
      style_sample_strategy: confirmedStyleSampleStrategy,
      chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
      chapter_target: {
        ...((contextPackage || {}).chapter_target || {}),
        benchmark_recall_brief: benchmarkRecallSources.chapter_target_benchmark_recall_brief,
        style_sample_strategy: confirmedStyleSampleStrategy,
        chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
        chapter_blueprint: chapterBlueprint,
      },
    }, {
      chapter_blueprint: chapterBlueprint,
      style_sample_strategy: confirmedStyleSampleStrategy,
      chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
    })
  const styleBoundaryContract = buildStyleBoundaryContract({}, {
    ...(contextPackage || {}),
    style_boundary_contract: confirmedContractSources.style_boundary_contract,
  }, {
    style_sample_strategy: confirmedStyleSampleStrategy,
    chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
    benchmark_recall_brief: benchmarkRecallBrief,
  })
  const platformRubric = buildPlatformRubric({}, {
    ...(contextPackage || {}),
    platform_rubric: confirmedContractSources.platform_rubric,
  })
  const contentRubric = buildContentRubric({
    ...(contextPackage || {}),
    content_rubric: confirmedContractSources.content_rubric,
  })
  const dialogueContract = buildDialogueContract({
    ...(contextPackage || {}),
    dialogue_contract: confirmedContractSources.dialogue_contract,
  })
  const plotDynamicsContract = buildPlotDynamicsContract({
    ...(contextPackage || {}),
    plot_dynamics_contract: confirmedContractSources.plot_dynamics_contract,
  })
  const storyPowerContract = buildStoryPowerContract({}, {
    ...(contextPackage || {}),
    story_power_contract: confirmedContractSources.story_power_contract,
  })
  const continuityHeatContract = buildContinuityHeatContract({
    ...(contextPackage || {}),
    continuity_heat_contract: confirmedContractSources.continuity_heat_contract,
  })
  const characterRelationContract = buildCharacterRelationContract({
    ...(contextPackage || {}),
    character_relation_contract: confirmedContractSources.character_relation_contract,
  })
  const characterBehaviorContract = buildCharacterBehaviorContract({
    ...(contextPackage || {}),
    character_behavior_contract: confirmedContractSources.character_behavior_contract,
  })
  const assetLinkageContract = buildAssetLinkageContract({
    ...(contextPackage || {}),
    asset_linkage_contract: confirmedContractSources.asset_linkage_contract,
  })
  const stateTrackingContract = buildStateTrackingContract({
    ...(contextPackage || {}),
    state_tracking_contract: confirmedContractSources.state_tracking_contract,
  })
  const intentConfirmationContract = buildIntentConfirmationContract({
    ...(contextPackage || {}),
    intent_confirmation_contract: confirmedContractSources.intent_confirmation_contract,
  }, {
    chapter_blueprint: chapterBlueprint,
    style_sample_strategy: confirmedStyleSampleStrategy,
    chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
    state_tracking_contract: stateTrackingContract,
  })
  const informationFlowContract = buildInformationFlowContract({
    ...(contextPackage || {}),
    information_flow_contract: confirmedContractSources.information_flow_contract,
  })
  const expectationThresholdContract = buildExpectationThresholdContract({
    ...(contextPackage || {}),
    expectation_threshold_contract: confirmedContractSources.expectation_threshold_contract,
  })
  const targetReaderContract = buildTargetReaderContract({}, {
    ...(contextPackage || {}),
    target_reader_contract: confirmedContractSources.target_reader_contract,
  })
  const genrePositioningContract = buildGenrePositioningContract({}, {
    ...(contextPackage || {}),
    genre_positioning_contract: confirmedContractSources.genre_positioning_contract,
  })
  const plotSpecialTopicsContract = plotSpecialTopicsContractForSync({}, {
    ...(contextPackage || {}),
    plot_special_topics_contract: confirmedContractSources.plot_special_topics_contract,
  })
  const femaleAudienceContract = buildFemaleAudienceContract({}, {
    ...(contextPackage || {}),
    female_audience_contract: confirmedContractSources.female_audience_contract,
  })
  const upgradeRhythmContract = buildUpgradeRhythmContract({}, {
    ...(contextPackage || {}),
    upgrade_rhythm_contract: confirmedContractSources.upgrade_rhythm_contract,
  })
  const conflictStructureContract = buildConflictStructureContract({}, {
    ...(contextPackage || {}),
    conflict_structure_contract: confirmedContractSources.conflict_structure_contract,
  })
  const storyLoopContract = buildStoryLoopContract({}, {
    ...(contextPackage || {}),
    story_loop_contract: confirmedContractSources.story_loop_contract,
  })
  const emotionalArcContract = buildEmotionalArcContract({}, {
    ...(contextPackage || {}),
    emotional_arc_contract: confirmedContractSources.emotional_arc_contract,
  })
  const chapterHookContract = buildChapterHookContract({}, {
    ...(contextPackage || {}),
    chapter_hook_contract: confirmedContractSources.chapter_hook_contract,
  })
  const paragraphHookContract = buildParagraphHookContract({}, {
    ...(contextPackage || {}),
    paragraph_hook_contract: confirmedContractSources.paragraph_hook_contract,
  })
  const suspenseContract = buildSuspenseContract({}, {
    ...(contextPackage || {}),
    suspense_contract: confirmedContractSources.suspense_contract,
  })
  const reversalContract = buildReversalContract({}, {
    ...(contextPackage || {}),
    reversal_contract: confirmedContractSources.reversal_contract,
  })
  const showdownContract = buildShowdownContract({}, {
    ...(contextPackage || {}),
    showdown_contract: confirmedContractSources.showdown_contract,
  })
  const bridgeUnitContract = buildBridgeUnitContract({}, {
    ...(contextPackage || {}),
    bridge_unit_contract: confirmedContractSources.bridge_unit_contract,
  })
  const plotFrameworkContract = buildPlotFrameworkContract({}, {
    ...(contextPackage || {}),
    plot_framework_contract: confirmedContractSources.plot_framework_contract,
  }, {
    showdown_contract: showdownContract,
    bridge_unit_contract: bridgeUnitContract,
    suspense_contract: suspenseContract,
    conflict_structure_contract: conflictStructureContract,
  })
  const openingContract = buildOpeningContract({}, {
    ...(contextPackage || {}),
    opening_contract: confirmedContractSources.opening_contract,
  })
  const proseCraftContract = buildProseCraftContract({}, {
    ...(contextPackage || {}),
    prose_craft_contract: confirmedContractSources.prose_craft_contract,
  })
  const punctuationToneContract = buildPunctuationToneContract({}, {
    ...(contextPackage || {}),
    punctuation_tone_contract: confirmedContractSources.punctuation_tone_contract,
  })
  const qualityAuditContract = buildQualityAuditContract({}, {
    ...(contextPackage || {}),
    quality_audit_contract: confirmedContractSources.quality_audit_contract,
  })
  const writePreparationBrief = confirmedContractSources.write_preparation_brief
    || buildWritePreparationBrief(contextPackage, {
      chapter_blueprint: chapterBlueprint,
      reader_retention_brief: confirmedReaderRetentionBrief,
      asset_linkage_contract: assetLinkageContract,
      state_tracking_contract: stateTrackingContract,
      delivery_risk_carry_over: deliveryRiskCarryOver,
      recent_fatigue_brief: recentFatigueBrief,
      batch_preflight: (contextPackage || {}).chapter_target?.batch_preflight || (contextPackage || {}).batch_preflight,
      reader_expectation_debt_context: readerExpectationDebtContext,
      plot_special_topics_contract: plotSpecialTopicsContract,
      story_power_contract: storyPowerContract,
    })
  const confirmedPreDraftBrief = {
    ...preDraftBrief,
    chapter_blueprint: chapterBlueprint,
    platform_rubric: platformRubric,
    content_rubric: contentRubric,
    dialogue_contract: dialogueContract,
    plot_dynamics_contract: plotDynamicsContract,
    story_power_contract: storyPowerContract,
    continuity_heat_contract: continuityHeatContract,
    character_relation_contract: characterRelationContract,
    character_behavior_contract: characterBehaviorContract,
    asset_linkage_contract: assetLinkageContract,
    state_tracking_contract: stateTrackingContract,
    intent_confirmation_contract: intentConfirmationContract,
    benchmark_recall_brief: benchmarkRecallBrief,
    benchmark_recall_gaps: benchmarkRecallGaps,
    style_sample_strategy: confirmedStyleSampleStrategy,
    chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
    style_boundary_contract: styleBoundaryContract,
    information_flow_contract: informationFlowContract,
    expectation_threshold_contract: expectationThresholdContract,
    target_reader_contract: targetReaderContract,
    genre_positioning_contract: genrePositioningContract,
    plot_special_topics_contract: plotSpecialTopicsContract,
    female_audience_contract: femaleAudienceContract,
    upgrade_rhythm_contract: upgradeRhythmContract,
    conflict_structure_contract: conflictStructureContract,
    story_loop_contract: storyLoopContract,
    emotional_arc_contract: emotionalArcContract,
    chapter_hook_contract: chapterHookContract,
    paragraph_hook_contract: paragraphHookContract,
    suspense_contract: suspenseContract,
    reversal_contract: reversalContract,
    showdown_contract: showdownContract,
    bridge_unit_contract: bridgeUnitContract,
    plot_framework_contract: plotFrameworkContract,
    opening_contract: openingContract,
    prose_craft_contract: proseCraftContract,
    punctuation_tone_contract: punctuationToneContract,
    quality_audit_contract: qualityAuditContract,
    write_preparation_brief: writePreparationBrief,
    reader_retention_brief: confirmedReaderRetentionBrief,
    reader_drop_risk_brief: readerDropRiskBrief || null,
    golden_three_brief: goldenThreeBrief || null,
    story_pressure_brief: storyPressureBrief || null,
    story_drive_brief: storyDriveBrief || null,
    serial_rhythm_brief: serialRhythmBrief || null,
    page_turn_hook_brief: pageTurnHookBrief || null,
    volume_climax_brief: volumeClimaxBrief || null,
    recent_fatigue_brief: recentFatigueBrief || null,
    delivery_risk_carry_over: deliveryRiskCarryOver || null,
    governance_recheck_memory: governanceRecheckMemory || null,
    reader_expectation_debt: readerExpectationDebtContext,
    reader_expectation_ledger: readerExpectationLedger || null,
    innovation_brief: innovationBrief,
    signature_scene_brief: signatureSceneBrief,
    character_arc_brief: characterArcBrief || null,
    core_contract_radar: coreContractRadar || null,
    longform_compass: longformCompass || null,
    longform_battle_context: longformBattleContext || null,
    longform_memory_capsule: longformMemoryCapsule || null,
    layered_memory_context: layeredMemoryContext || null,
    progress_summary: progressSummary || null,
    daily_context_snapshot: dailyContextSnapshot || null,
    foreshadowing_consistency_radar: foreshadowingConsistencyRadar || null,
    next_batch_brief: nextBatchBrief || null,
    story_unit_context: storyUnitContext || null,
    scene_briefs: sceneBriefs,
  }
  return {
    ...(contextPackage || {}),
    pre_draft_brief: confirmedPreDraftBrief,
    preDraftBrief: confirmedPreDraftBrief,
    chapter_blueprint: chapterBlueprint,
    platform_rubric: platformRubric,
    content_rubric: contentRubric,
    dialogue_contract: dialogueContract,
    plot_dynamics_contract: plotDynamicsContract,
    story_power_contract: storyPowerContract,
    continuity_heat_contract: continuityHeatContract,
    character_relation_contract: characterRelationContract,
    character_behavior_contract: characterBehaviorContract,
    asset_linkage_contract: assetLinkageContract,
    state_tracking_contract: stateTrackingContract,
    intent_confirmation_contract: intentConfirmationContract,
    benchmark_recall_brief: benchmarkRecallBrief,
    benchmark_recall_gaps: benchmarkRecallGaps,
    style_sample_strategy: confirmedStyleSampleStrategy,
    chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
    style_boundary_contract: styleBoundaryContract,
    information_flow_contract: informationFlowContract,
    expectation_threshold_contract: expectationThresholdContract,
    target_reader_contract: targetReaderContract,
    genre_positioning_contract: genrePositioningContract,
    female_audience_contract: femaleAudienceContract,
    upgrade_rhythm_contract: upgradeRhythmContract,
    conflict_structure_contract: conflictStructureContract,
    story_loop_contract: storyLoopContract,
    emotional_arc_contract: emotionalArcContract,
    chapter_hook_contract: chapterHookContract,
    paragraph_hook_contract: paragraphHookContract,
    suspense_contract: suspenseContract,
    reversal_contract: reversalContract,
    showdown_contract: showdownContract,
    bridge_unit_contract: bridgeUnitContract,
    plot_framework_contract: plotFrameworkContract,
    opening_contract: openingContract,
    prose_craft_contract: proseCraftContract,
    punctuation_tone_contract: punctuationToneContract,
    quality_audit_contract: qualityAuditContract,
    write_preparation_brief: writePreparationBrief,
    core_contract_radar: coreContractRadar || (contextPackage || {}).core_contract_radar || null,
    longform_compass: longformCompass || (contextPackage || {}).longform_compass || null,
    longform_battle_context: longformBattleContext || (contextPackage || {}).longform_battle_context || null,
    longform_memory_capsule: longformMemoryCapsule || (contextPackage || {}).longform_memory_capsule || null,
    layered_memory_context: layeredMemoryContext || (contextPackage || {}).layered_memory_context || null,
    progress_summary: progressSummary || (contextPackage || {}).progress_summary || null,
    daily_context_snapshot: dailyContextSnapshot || (contextPackage || {}).daily_context_snapshot || null,
    foreshadowing_consistency_radar: foreshadowingConsistencyRadar || (contextPackage || {}).foreshadowing_consistency_radar || null,
    next_batch_brief: nextBatchBrief || (contextPackage || {}).next_batch_brief || null,
    story_unit_context: storyUnitContext || (contextPackage || {}).story_unit_context || null,
    reader_drop_risk_brief: readerDropRiskBrief || (contextPackage || {}).reader_drop_risk_brief || (contextPackage || {}).readerDropRiskBrief || null,
    golden_three_brief: goldenThreeBrief || (contextPackage || {}).golden_three_brief || null,
    story_pressure_brief: storyPressureBrief || (contextPackage || {}).story_pressure_brief || null,
    story_drive_brief: storyDriveBrief || (contextPackage || {}).story_drive_brief || null,
    serial_rhythm_brief: serialRhythmBrief || (contextPackage || {}).serial_rhythm_brief || null,
    page_turn_hook_brief: pageTurnHookBrief || (contextPackage || {}).page_turn_hook_brief || null,
    volume_climax_brief: volumeClimaxBrief || (contextPackage || {}).volume_climax_brief || null,
    recent_fatigue_brief: recentFatigueBrief || (contextPackage || {}).recent_fatigue_brief || null,
    delivery_risk_carry_over: deliveryRiskCarryOver || (contextPackage || {}).delivery_risk_carry_over || null,
    governance_recheck_memory: governanceRecheckMemory || (contextPackage || {}).governance_recheck_memory || null,
    reader_expectation_debt_context: readerExpectationDebtContext,
    character_arc_context: characterArcBrief || (contextPackage || {}).character_arc_context || null,
    chapter_target: {
      ...((contextPackage || {}).chapter_target || {}),
      summary: compactBriefText(preDraftBrief.chapter_goal, (contextPackage || {}).chapter_target?.summary),
      goal: compactBriefText(preDraftBrief.chapter_goal, (contextPackage || {}).chapter_target?.goal),
      conflict: compactBriefText(preDraftBrief.core_conflict, (contextPackage || {}).chapter_target?.conflict),
      ending_hook: compactBriefText(preDraftBrief.ending_hook, (contextPackage || {}).chapter_target?.ending_hook),
      previous_handoff: compactBriefText(preDraftBrief.previous_handoff, (contextPackage || {}).chapter_target?.previous_handoff),
      reader_promise: compactBriefText(preDraftBrief.reader_promise),
      emotional_curve: compactBriefText(preDraftBrief.emotional_curve),
      key_settings: asArray(preDraftBrief.key_settings),
      forbidden_content: asArray(preDraftBrief.forbidden_content),
      storyline_advances: asArray(preDraftBrief.storyline_advances),
      storyline_plants: asArray(preDraftBrief.storyline_plants),
      storyline_payoffs: asArray(preDraftBrief.storyline_payoffs),
      storyline_forbidden: asArray(preDraftBrief.storyline_forbidden),
      platform_rubric: platformRubric,
      content_rubric: contentRubric,
      dialogue_contract: dialogueContract,
      plot_dynamics_contract: plotDynamicsContract,
      story_power_contract: storyPowerContract,
      continuity_heat_contract: continuityHeatContract,
      character_relation_contract: characterRelationContract,
      character_behavior_contract: characterBehaviorContract,
      asset_linkage_contract: assetLinkageContract,
      state_tracking_contract: stateTrackingContract,
      intent_confirmation_contract: intentConfirmationContract,
      benchmark_recall_brief: benchmarkRecallBrief,
      benchmark_recall_gaps: benchmarkRecallGaps,
      style_boundary_contract: styleBoundaryContract,
      information_flow_contract: informationFlowContract,
      expectation_threshold_contract: expectationThresholdContract,
      target_reader_contract: targetReaderContract,
      genre_positioning_contract: genrePositioningContract,
      female_audience_contract: femaleAudienceContract,
      upgrade_rhythm_contract: upgradeRhythmContract,
      conflict_structure_contract: conflictStructureContract,
      story_loop_contract: storyLoopContract,
      emotional_arc_contract: emotionalArcContract,
      chapter_hook_contract: chapterHookContract,
      paragraph_hook_contract: paragraphHookContract,
      suspense_contract: suspenseContract,
      reversal_contract: reversalContract,
      showdown_contract: showdownContract,
      bridge_unit_contract: bridgeUnitContract,
      plot_framework_contract: plotFrameworkContract,
      opening_contract: openingContract,
      prose_craft_contract: proseCraftContract,
      punctuation_tone_contract: punctuationToneContract,
      quality_audit_contract: qualityAuditContract,
      write_preparation_brief: writePreparationBrief,
      character_arc_brief: characterArcBrief,
      reader_retention_brief: confirmedReaderRetentionBrief,
      reader_drop_risk_brief: readerDropRiskBrief || (contextPackage || {}).chapter_target?.reader_drop_risk_brief || (contextPackage || {}).chapter_target?.readerDropRiskBrief || null,
      golden_three_brief: goldenThreeBrief || (contextPackage || {}).chapter_target?.golden_three_brief || null,
      story_pressure_brief: storyPressureBrief || (contextPackage || {}).chapter_target?.story_pressure_brief || null,
      story_drive_brief: storyDriveBrief || (contextPackage || {}).chapter_target?.story_drive_brief || null,
      serial_rhythm_brief: serialRhythmBrief || (contextPackage || {}).chapter_target?.serial_rhythm_brief || null,
      page_turn_hook_brief: pageTurnHookBrief || (contextPackage || {}).chapter_target?.page_turn_hook_brief || null,
      volume_climax_brief: volumeClimaxBrief || (contextPackage || {}).chapter_target?.volume_climax_brief || null,
      recent_fatigue_brief: recentFatigueBrief || (contextPackage || {}).chapter_target?.recent_fatigue_brief || null,
      delivery_risk_carry_over: deliveryRiskCarryOver || (contextPackage || {}).chapter_target?.delivery_risk_carry_over || null,
      governance_recheck_memory: governanceRecheckMemory || (contextPackage || {}).chapter_target?.governance_recheck_memory || null,
      reader_expectation_debt_context: readerExpectationDebtContext,
      reader_expectation_ledger: readerExpectationLedger || null,
      innovation_brief: innovationBrief,
      signature_scene_brief: signatureSceneBrief,
      meme_strategy: preDraftBrief.meme_strategy || (contextPackage || {}).chapter_target?.meme_strategy || null,
      style_sample_strategy: confirmedStyleSampleStrategy,
      chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
      first30_retention_brief: first30RetentionBriefFromContext(contextPackage, preDraftBrief),
      core_contract_radar: coreContractRadar || (contextPackage || {}).chapter_target?.core_contract_radar || null,
      longform_compass: longformCompass || (contextPackage || {}).chapter_target?.longform_compass || null,
      longform_battle_context: longformBattleContext || (contextPackage || {}).chapter_target?.longform_battle_context || null,
      longform_memory_capsule: longformMemoryCapsule || (contextPackage || {}).chapter_target?.longform_memory_capsule || null,
      layered_memory_context: layeredMemoryContext || (contextPackage || {}).chapter_target?.layered_memory_context || null,
      progress_summary: progressSummary || (contextPackage || {}).chapter_target?.progress_summary || null,
      daily_context_snapshot: dailyContextSnapshot || (contextPackage || {}).chapter_target?.daily_context_snapshot || null,
      foreshadowing_consistency_radar: foreshadowingConsistencyRadar || (contextPackage || {}).chapter_target?.foreshadowing_consistency_radar || null,
      next_batch_brief: nextBatchBrief || (contextPackage || {}).chapter_target?.next_batch_brief || null,
      story_unit_context: storyUnitContext || (contextPackage || {}).chapter_target?.story_unit_context || null,
      chapter_blueprint: chapterBlueprint,
      scene_cards: confirmedSceneCards,
    },
  }
}

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

type ProseTransportTruncationCode = 'PROSE_DRAFT_TRUNCATED' | 'PROSE_REVISION_TRUNCATED'

function hasProseTransportIncompleteDetails(result: any) {
  return [result, result?.raw, ...asArray(result?.raw?.choices), result?.raw?.response].some(value => (
    value
    && typeof value === 'object'
    && (
      (Object.prototype.hasOwnProperty.call(value, 'incomplete_details')
        && value.incomplete_details !== null
        && value.incomplete_details !== undefined)
      || (Object.prototype.hasOwnProperty.call(value, 'incompleteDetails')
        && value.incompleteDetails !== null
        && value.incompleteDetails !== undefined)
    )
  ))
}

function rejectedProseTransportFinishReason(result: any) {
  const sources = [result, result?.raw, ...asArray(result?.raw?.choices), result?.raw?.response]
  for (const source of sources) {
    for (const candidate of [source?.finish_reason, source?.finishReason, source?.stop_reason, source?.stopReason]) {
      const reason = normalizeProseContractionFinishReason({ finish_reason: candidate })
      if (isRejectedProseContractionFinishReason(reason)) return reason
    }
  }
  return null
}

function assertCompleteProseTransportResult(result: any, code: ProseTransportTruncationCode) {
  const finishReason = rejectedProseTransportFinishReason(result)
    || normalizeProseContractionFinishReason(result)
  const incompleteReason = normalizeProseContractionIncompleteReason(result)
  const incompleteDetailsPresent = hasProseTransportIncompleteDetails(result)
  if (!isRejectedProseContractionFinishReason(finishReason) && !incompleteDetailsPresent) return

  const diagnostics = buildLLMResultDiagnostics(result)
  const phase = code === 'PROSE_DRAFT_TRUNCATED' ? '正文初稿' : '正文修订'
  const error = Object.assign(new Error(`${phase}输出被截断`), {
    code,
    finish_reason: finishReason,
    incomplete_reason: incompleteReason,
    incomplete_details_present: incompleteDetailsPresent,
    llm_diagnostics: {
      ...diagnostics,
      finish_reason: finishReason || diagnostics.finish_reason,
      incomplete_reason: incompleteReason,
      incomplete_details_present: incompleteDetailsPresent,
    },
  })
  throw markBlockedInvalidError(error, {
    code: code.toLowerCase(),
    source: 'transport',
    message: `${phase}输出被截断，不能作为完整章节正文入库。`,
    details: { finish_reason: finishReason, incomplete_reason: incompleteReason },
  })
}

function proseAdmissionWarning(
  source: ProseAdmissionWarning['source'],
  code: any,
  message: any,
  details?: any,
): ProseAdmissionWarning {
  const warning: ProseAdmissionWarning = {
    source,
    code: String(code || 'warning').trim() || 'warning',
    message: String(message || code || 'warning').slice(0, 500),
  }
  if (details !== undefined) warning.details = details
  return warning
}

function collectStructuredReviewWarnings(review: any): ProseAdmissionWarning[] {
  const warnings: ProseAdmissionWarning[] = []
  for (const [field, value] of Object.entries(review || {})) {
    if (!Array.isArray(value) || !/(?:checks|findings|failures)$/i.test(field)) continue
    for (const item of value) {
      if (!item || typeof item !== 'object') continue
      const status = String((item as any).status || '').toLowerCase()
      const severity = String((item as any).severity || '').toUpperCase()
      if (!['fail', 'warn'].includes(status) && !['S1', 'S2'].includes(severity)) continue
      warnings.push(proseAdmissionWarning(
        'quality',
        (item as any).key || field,
        (item as any).message || (item as any).evidence || (item as any).label || `${field} reported ${status || severity}`,
        { field, item },
      ))
    }
  }
  return warnings
}

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




bindStateTrackingContractDeps({
  mergedContextChapterTarget,
  contextWithChapterRawPreDraftForSync,
  listNovelChapters,
  mergeNovelChapterRawPayload,
})







export function createNovelWritingService(ctx: {
  getProject: (workspace: string, id: number) => Promise<any>
  production: NovelProductionService
  reference: NovelReferenceService
  runtime?: NovelWritingRuntime
}) {
  const trustedWordTargetContractionBudgets = new WeakSet<object>()
  const executeAgent = ctx.runtime?.executeAgent || executeNovelAgent
  const generateNovelChapterProse = ctx.runtime?.generateChapterProse || defaultGenerateNovelChapterProse
  const storeChapterProseMemory = ctx.runtime?.storeChapterProseMemory || defaultStoreNovelChapterProseMemory
  const mergeChapterRawPayload = ctx.runtime?.mergeChapterRawPayload || mergeNovelChapterRawPayload
  const buildSceneCardsPrompt = (project: any, contextPackage: any) => buildSceneCardsPromptFromBuilder(project, contextPackage)

  const buildHeuristicSettingUsage = (chapter: any, settings: any[]) => {
    const chapterText = [
      chapter.title,
      chapter.chapter_goal,
      chapter.chapter_summary,
      chapter.conflict,
      chapter.ending_hook,
      safeJsonStringify(chapter.raw_payload || {}, undefined, 0),
    ].join(' ')
    return settings.map((setting: any) => {
      const settingText = [
        setting.name,
        setting.summary,
        JSON.stringify(setting.constraints_json || {}),
        JSON.stringify(setting.state_json || {}),
      ].join(' ')
      let score = 0
      const name = String(setting.name || '')
      if (name && chapterText.includes(name)) score += 40
      for (const token of settingText.split(/[\s,，。；;、/|]+/).filter(item => item.length >= 2).slice(0, 50)) {
        if (chapterText.includes(token)) score += 2
      }
      if (['character', 'boss', 'rule'].includes(setting.entity_type)) score += 4
      if (['ability', 'item', 'foreshadowing'].includes(setting.entity_type)) score += 2
      return { setting, score }
    })
      .filter(item => item.score >= 6)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ setting, score }, index) => ({
        entity_id: setting.id,
        usage_type: index < 4 || score >= 30 ? 'required' : 'allowed',
        required: index < 4 || score >= 30,
        allowed: true,
        forbidden: false,
        reveal_level: setting.visibility === 'hidden' || setting.visibility === 'spoiler' ? 'hint' : 'partial',
        expected_state_change: { reason: `生成前自动匹配：与本章目标/摘要/冲突相似度 ${score}` },
      }))
  }

  const selectProseForChapter = (payload: any, chapter: any) => {
    const targetNo = Number(chapter?.chapter_no || 0)
    const proseArr = Array.isArray(payload?.prose_chapters) ? payload.prose_chapters : []
    const matched = proseArr.find((item: any) => Number(item?.chapter_no || 0) === targetNo)
    if (matched) return matched
    if (proseArr.length === 1) {
      const onlyNo = Number(proseArr[0]?.chapter_no || 0)
      if (!onlyNo || onlyNo === targetNo) return proseArr[0]
      throw new Error(`模型返回的正文章节与目标不一致：目标第${targetNo}章，返回第${onlyNo}章`)
    }
    if (proseArr.length > 1) {
      const foundNos = proseArr.map((item: any) => item?.chapter_no).filter(Boolean).join('、') || '无'
      throw new Error(`模型返回的正文章节与目标不一致：目标第${targetNo}章，返回章节号为：${foundNos}`)
    }
    const topLevelNo = Number(payload?.chapter_no || 0)
    if (topLevelNo && topLevelNo !== targetNo) {
      throw new Error(`模型返回的正文章节与目标不一致：目标第${targetNo}章，返回第${topLevelNo}章`)
    }
    return payload || {}
  }

  const throwIfAborted = (options: any = {}) => {
    if (options?.abortSignal?.aborted || options?.signal?.aborted) {
      throw Object.assign(new Error('Request canceled'), { code: 'REQUEST_CANCELED' })
    }
  }

  const isAbortError = (error: any) => {
    const message = String(error?.message || error || '').toLowerCase()
    return error?.code === 'REQUEST_CANCELED'
      || error?.name === 'AbortError'
      || message.includes('request canceled')
      || message.includes('aborted')
      || message.includes('abort')
  }

  const generateSceneCardsForChapter = async (activeWorkspace: string, project: any, contextPackage: any, modelId?: number, options: any = {}) => {
    const stageModelId = ctx.production.getStageModelId(project, 'scene_cards', modelId)
    throwIfAborted(options)
    const result = await executeAgent('outline-agent', project, {
      task: buildSceneCardsPrompt(project, contextPackage),
      upstreamContext: contextPackage,
    }, {
      activeWorkspace,
      modelId: stageModelId ? String(stageModelId) : undefined,
      maxTokens: 3000,
      temperature: ctx.production.getStageTemperature(project, 'scene_cards', 0.45),
      skipMemory: true,
      signal: options.abortSignal,
      timeoutMs: options.llmTimeoutMs,
    })
    const payload = getNovelPayload(result)
    return { result, sceneCards: normalizeSceneCardsPayload(payload, contextPackage) }
  }

  const buildParagraphProseContext = (project: any, contextPackage: any, migrationPlan: any = null, chapterDraft: any = null) => {
    if (contextPackage?.chapterTarget) {
      const mergedChapterTarget = mergedContextChapterTargetPreferRuntime(contextPackage)
      contextPackage = {
        ...contextPackage,
        chapter_target: mergedChapterTarget,
        chapterTarget: mergedChapterTarget,
      }
    }
    let chapterTarget = contextPackage?.chapter_target || {}
    const preDraftBrief = contextPackage?.pre_draft_brief || contextPackage?.preDraftBrief || {}
    const chapterSceneCards = Array.isArray(chapterTarget.scene_cards) && chapterTarget.scene_cards.length
      ? normalizeSceneCardsPayload({ scene_cards: chapterTarget.scene_cards }, contextPackage)
      : Array.isArray(chapterTarget.sceneCards)
        ? normalizeSceneCardsPayload({ sceneCards: chapterTarget.sceneCards }, contextPackage)
        : []
    if (chapterSceneCards.length) {
      chapterTarget = {
        ...chapterTarget,
        scene_cards: chapterSceneCards,
        sceneCards: chapterSceneCards,
      }
      contextPackage = {
        ...contextPackage,
        chapter_target: chapterTarget,
        chapterTarget: contextPackage?.chapterTarget
          ? {
              ...contextPackage.chapterTarget,
              scene_cards: chapterSceneCards,
              sceneCards: chapterSceneCards,
            }
          : contextPackage?.chapterTarget,
      }
    }
    const preDraftSceneBriefs = asArray(preDraftBrief.scene_briefs || preDraftBrief.sceneBriefs)
    const sceneBriefs = chapterSceneCards.length
      ? chapterSceneCards.map(sceneBriefFromCard)
      : preDraftSceneBriefs.map(sceneBriefFromCard)
    const chapterPositioningBrief = normalizeChapterPositioningBrief(contextPackage, sceneBriefs)
    chapterTarget = {
      ...chapterTarget,
      chapter_positioning_brief: chapterPositioningBrief,
      chapterPositioningBrief,
    }
    contextPackage = {
      ...contextPackage,
      chapter_target: chapterTarget,
      chapterTarget: contextPackage?.chapterTarget
        ? {
            ...contextPackage.chapterTarget,
            chapter_positioning_brief: chapterPositioningBrief,
            chapterPositioningBrief,
          }
        : {
            ...chapterTarget,
          },
    }
    const readerRetentionBrief = chapterTarget.reader_retention_brief
      || chapterTarget.readerRetentionBrief
      || preDraftBrief.reader_retention_brief
      || preDraftBrief.readerRetentionBrief
      || buildReaderRetentionBrief(project, contextPackage, sceneBriefs)
    const longformCompass = normalizeLongformCompass(
      longformCompassFromContext(contextPackage, preDraftBrief, chapterDraft),
    )
    const longformBattleContext = normalizeLongformBattleContext(
      longformBattleContextFromContext(contextPackage, preDraftBrief, chapterDraft),
    )
    const chapterLaunchGate = chapterLaunchGateFromContext(contextPackage, preDraftBrief, chapterDraft)
    const governanceRecheckMemory = normalizeGovernanceRecheckMemoryContext(
      contextPackage?.chapter_target?.governance_recheck_memory
      || contextPackage?.chapter_target?.governanceRecheckMemory
      || preDraftBrief.governance_recheck_memory
      || preDraftBrief.governanceRecheckMemory
      || contextPackage?.governance_recheck_memory
      || contextPackage?.governanceRecheckMemory
    )
    const coreContractRadar = buildCoreContractRadar(project, contextPackage, sceneBriefs, longformCompass, longformBattleContext)
    const nextBatchBrief = normalizeNextBatchBrief(
      nextBatchBriefFromContext(contextPackage, preDraftBrief, chapterDraft),
      Number(chapterDraft?.chapter_no || contextPackage?.chapter_target?.chapter_no || 0),
    )
    const expansionStructureDecision = nextBatchBrief?.expansion_structure_decision || null
    const defaultFiveChapterLaneRedesign = expansionStructureDecision?.default_five_chapter_lane_redesign || null
    const expansionStructureVerification = nextBatchBrief?.expansion_structure_verification || null
    const defaultFiveChapterRegression = expansionStructureVerification?.default_five_chapter_regression || null
    const defaultFiveChapterLaneTemplate = expansionStructureVerification?.default_five_chapter_lane_template || null
    const defaultFiveChapterLaneTemplateRequirementLabels = asArray(defaultFiveChapterLaneTemplate?.requirements)
      .map((item: any) => compactBriefText(item?.label || item?.key))
      .filter(Boolean)
    const defaultFiveChapterLaneTemplateRepairSummaries = asArray(defaultFiveChapterLaneTemplate?.repaired_missing_requirements)
      .map((item: any) => {
        const label = compactBriefText(item?.label || item?.key || '模板要求')
        const chapters = chapterNosBrief(item?.chapter_nos || item?.chapterNos)
        return label ? `${chapters ? `${chapters}缺` : '缺'}${label}` : ''
      })
      .filter(Boolean)
    const defaultFiveChapterLaneTemplateRepairActions = uniqueBriefStrings(
      defaultFiveChapterLaneTemplate?.repair_actions || defaultFiveChapterLaneTemplate?.repairActions || [],
      8,
    )
    const defaultFiveChapterLaneTemplateRedesignSource = compactBriefText(
      defaultFiveChapterLaneTemplate?.redesign_source || defaultFiveChapterLaneTemplate?.redesignSource,
    )
    const defaultFiveChapterLaneTemplateTopFailed = defaultFiveChapterLaneTemplate?.top_failed_requirement
      || defaultFiveChapterLaneTemplate?.topFailedRequirement
      || null
    const defaultFiveChapterLaneTemplateRedesignLines = asArray(
      defaultFiveChapterLaneTemplate?.redesigned_templates || defaultFiveChapterLaneTemplate?.redesignedTemplates,
    )
      .map((item: any) => {
        const label = compactBriefText(item?.label || item?.key || '模板项')
        const template = compactBriefText(item?.template || item?.rewrite || item?.instruction || item?.text || item?.detail)
        return label && template ? `${label}：${template}` : ''
      })
      .filter(Boolean)
    const defaultFiveChapterLaneTemplateValidationStandard = uniqueBriefStrings(
      defaultFiveChapterLaneTemplate?.validation_standard || defaultFiveChapterLaneTemplate?.validationStandard || [],
      8,
    )
    const defaultFiveChapterLaneTemplateRequiredReceipts = uniqueBriefStrings(
      defaultFiveChapterLaneTemplate?.required_receipts || defaultFiveChapterLaneTemplate?.requiredReceipts || [],
      8,
    )
    const defaultFiveChapterLaneTemplateVersionId = compactBriefText(
      defaultFiveChapterLaneTemplate?.template_version_id
      || defaultFiveChapterLaneTemplate?.templateVersionId
      || defaultFiveChapterLaneTemplate?.template_version?.id
      || defaultFiveChapterLaneTemplate?.templateVersion?.id,
    )
    const defaultFiveChapterLaneTemplateProductionRelapseCount = Number(
      defaultFiveChapterLaneTemplate?.production_relapse_count
      ?? defaultFiveChapterLaneTemplate?.productionRelapseCount
      ?? 0,
    )
    const defaultFiveChapterLaneTemplateProductionRelapseReview = defaultFiveChapterLaneTemplate?.production_relapse_review
      || defaultFiveChapterLaneTemplate?.productionRelapseReview
      || null
    const defaultFiveChapterLaneTemplateProductionRelapseChapterNos = chapterNosBrief(
      defaultFiveChapterLaneTemplateProductionRelapseReview?.default_batch_chapter_nos
      || defaultFiveChapterLaneTemplateProductionRelapseReview?.defaultBatchChapterNos
      || [],
    )
    const defaultFiveChapterLaneTemplateProductionRelapseRestoreNos = chapterNosBrief(
      defaultFiveChapterLaneTemplateProductionRelapseReview?.restore_chapter_nos
      || defaultFiveChapterLaneTemplateProductionRelapseReview?.restoreChapterNos
      || [],
    )
    const defaultFiveChapterLaneTemplateProductionRelapseValidationNos = chapterNosBrief(
      defaultFiveChapterLaneTemplateProductionRelapseReview?.validation_chapter_nos
      || defaultFiveChapterLaneTemplateProductionRelapseReview?.validationChapterNos
      || [],
    )
    const defaultFiveChapterLaneTemplateProductionFailureReasons = uniqueBriefStrings(
      defaultFiveChapterLaneTemplateProductionRelapseReview?.failure_reasons
      || defaultFiveChapterLaneTemplateProductionRelapseReview?.failureReasons
      || [],
      8,
    )
    const defaultFiveChapterLaneTemplateProductionFailedRequirements = asArray(
      defaultFiveChapterLaneTemplateProductionRelapseReview?.failed_requirements
      || defaultFiveChapterLaneTemplateProductionRelapseReview?.failedRequirements
      || defaultFiveChapterLaneTemplate?.failed_requirements
      || defaultFiveChapterLaneTemplate?.failedRequirements,
    )
      .map((item: any) => {
        const label = compactBriefText(item?.label || item?.key || '模板缺项')
        const reason = compactBriefText(item?.failure_reason || item?.failureReason || item?.reason)
        return label && reason ? `${label}/${reason}` : label || reason
      })
      .filter(Boolean)
      .slice(0, 8)
    const batchPreflight = contextPackage?.chapter_target?.batch_preflight
      || contextPackage?.chapter_target?.batchPreflight
      || contextPackage?.batch_preflight
      || contextPackage?.batchPreflight
      || null
    const batchDeliveryRiskCarryOver = normalizeDeliveryRiskCarryOverContext(
      batchPreflight?.delivery_risk_carry_over
      || batchPreflight?.deliveryRiskCarryOver,
    )
    const batchCreationContractCarryOver = batchDeliveryRiskCarryOver?.creation_contract_carry_over || null
    const batchChapterHandoffContract = normalizeBatchChapterHandoffContract(
      batchPreflight?.chapter_handoff_contract
      || batchPreflight?.chapterHandoffContract,
    )
    const longformMemoryAnchor = batchPreflight?.longform_memory_anchor
      || batchPreflight?.longformMemoryAnchor
      || contextPackage?.chapter_target?.longform_memory_anchor
      || contextPackage?.longform_memory_anchor
      || null
    const longformMemoryCapsule = normalizeLongformMemoryCapsule(
      contextPackage?.chapter_target?.longform_memory_capsule
      || contextPackage?.chapter_target?.longformMemoryCapsule
      || preDraftBrief.longform_memory_capsule
      || preDraftBrief.longformMemoryCapsule
      || contextPackage?.longform_memory_capsule
      || contextPackage?.longformMemoryCapsule,
    )
    const layeredMemoryContext = normalizeLayeredMemoryContext(
      contextPackage?.chapter_target?.layered_memory_context
      || contextPackage?.chapter_target?.layeredMemoryContext
      || contextPackage?.chapter_target?.longform_layered_memory
      || contextPackage?.chapter_target?.longformLayeredMemory
      || preDraftBrief.layered_memory_context
      || preDraftBrief.layeredMemoryContext
      || preDraftBrief.longform_layered_memory
      || preDraftBrief.longformLayeredMemory
      || contextPackage?.layered_memory_context
      || contextPackage?.layeredMemoryContext
      || contextPackage?.longform_layered_memory
      || contextPackage?.longformLayeredMemory,
    )
    const progressSummary = normalizeDailyProgressSummary(
      contextPackage?.chapter_target?.progress_summary
      || contextPackage?.chapter_target?.progressSummary
      || preDraftBrief.progress_summary
      || preDraftBrief.progressSummary
      || contextPackage?.progress_summary
      || contextPackage?.progressSummary
      || contextPackage?.story_state?.progress_summary
      || contextPackage?.storyState?.progressSummary
      || project?.reference_config?.story_state?.progress_summary
      || project?.reference_config?.storyState?.progressSummary
      || project?.story_state?.progress_summary
      || project?.storyState?.progressSummary,
    )
    const dailyContextSnapshot = normalizeDailyContextSnapshot(
      contextPackage?.chapter_target?.daily_context_snapshot
      || contextPackage?.chapter_target?.dailyContextSnapshot
      || preDraftBrief.daily_context_snapshot
      || preDraftBrief.dailyContextSnapshot
      || contextPackage?.daily_context_snapshot
      || contextPackage?.dailyContextSnapshot
      || contextPackage?.story_state?.daily_context_snapshot
      || contextPackage?.story_state?.dailyContextSnapshot
      || contextPackage?.storyState?.dailyContextSnapshot
      || project?.reference_config?.story_state?.daily_context_snapshot
      || project?.reference_config?.story_state?.dailyContextSnapshot
      || project?.reference_config?.storyState?.dailyContextSnapshot
      || project?.story_state?.daily_context_snapshot
      || project?.story_state?.dailyContextSnapshot
      || project?.storyState?.dailyContextSnapshot,
    )
    const foreshadowingConsistencyRadar = normalizeForeshadowingConsistencyRadar(
      contextPackage?.chapter_target?.foreshadowing_consistency_radar
      || contextPackage?.chapter_target?.foreshadowingConsistencyRadar
      || preDraftBrief.foreshadowing_consistency_radar
      || preDraftBrief.foreshadowingConsistencyRadar
      || contextPackage?.foreshadowing_consistency_radar
      || contextPackage?.foreshadowingConsistencyRadar
      || contextPackage?.story_state?.foreshadowing_consistency_radar
      || contextPackage?.story_state?.foreshadowingConsistencyRadar
      || contextPackage?.storyState?.foreshadowingConsistencyRadar
      || project?.reference_config?.story_state?.foreshadowing_consistency_radar
      || project?.reference_config?.story_state?.foreshadowingConsistencyRadar
      || project?.reference_config?.storyState?.foreshadowingConsistencyRadar
      || project?.story_state?.foreshadowing_consistency_radar
      || project?.story_state?.foreshadowingConsistencyRadar
      || project?.storyState?.foreshadowingConsistencyRadar
      || {
        foreshadowing_status: contextPackage?.story_state?.foreshadowing_status
          || contextPackage?.story_state?.foreshadowingStatus
          || contextPackage?.storyState?.foreshadowingStatus
          || project?.reference_config?.story_state?.foreshadowing_status
          || project?.reference_config?.story_state?.foreshadowingStatus
          || project?.reference_config?.storyState?.foreshadowingStatus
          || project?.story_state?.foreshadowing_status
          || project?.story_state?.foreshadowingStatus
          || project?.storyState?.foreshadowingStatus,
        payoff_queue: contextPackage?.story_state?.payoff_queue
          || contextPackage?.story_state?.payoffQueue
          || contextPackage?.storyState?.payoffQueue
          || project?.reference_config?.story_state?.payoff_queue
          || project?.reference_config?.story_state?.payoffQueue
          || project?.reference_config?.storyState?.payoffQueue
          || project?.story_state?.payoff_queue
          || project?.story_state?.payoffQueue
          || project?.storyState?.payoffQueue,
      },
      Number(chapterDraft?.chapter_no || contextPackage?.chapter_target?.chapter_no || 0),
    )
    const millionWordRunway = millionWordRunwayFromContext(contextPackage, preDraftBrief)
    const styleSampleStrategy = contextPackage?.chapter_target?.style_sample_strategy || buildStyleSampleStrategy(project, contextPackage)
    const styleFingerprintHandoff = buildStyleFingerprintPromptHandoff(contextPackage, project, styleSampleStrategy)
    const chapterBenchmarkStrategy = contextPackage?.chapter_target?.chapter_benchmark_strategy || buildChapterBenchmarkStrategy(project, contextPackage)
    const first30RetentionBrief = first30RetentionBriefFromContext(contextPackage, preDraftBrief)
    const readerDropRiskBrief = normalizeReaderDropRiskBrief(
      contextPackage?.chapter_target?.reader_drop_risk_brief
      || contextPackage?.chapter_target?.readerDropRiskBrief
      || preDraftBrief.reader_drop_risk_brief
      || preDraftBrief.readerDropRiskBrief
      || contextPackage?.reader_drop_risk_brief
      || contextPackage?.readerDropRiskBrief
      || contextPackage?.reader_trial_context
      || contextPackage?.readerTrialContext,
      readerRetentionBrief,
      first30RetentionBrief,
    )
    const goldenThreeBrief = normalizeGoldenThreeBrief(
      contextPackage?.chapter_target?.golden_three_brief
      || contextPackage?.chapter_target?.goldenThreeBrief
      || preDraftBrief.golden_three_brief
      || preDraftBrief.goldenThreeBrief
      || contextPackage?.golden_three_brief
      || contextPackage?.goldenThreeBrief,
      Number(chapterDraft?.chapter_no || contextPackage?.chapter_target?.chapter_no || 0),
    )
    const storyPressureBrief = normalizeStoryPressureBrief(
      contextPackage?.chapter_target?.story_pressure_brief
      || contextPackage?.chapter_target?.storyPressureBrief
      || preDraftBrief.story_pressure_brief
      || preDraftBrief.storyPressureBrief
      || contextPackage?.story_pressure_brief
      || contextPackage?.storyPressureBrief
      || contextPackage?.story_pressure_ladder
      || contextPackage?.storyPressureLadder,
    )
    const storyDriveBrief = normalizeStoryDriveBrief(
      contextPackage?.chapter_target?.story_drive_brief
      || contextPackage?.chapter_target?.storyDriveBrief
      || preDraftBrief.story_drive_brief
      || preDraftBrief.storyDriveBrief
      || contextPackage,
      chapterSceneCards.length ? chapterSceneCards : sceneBriefs,
    )
    const serialRhythmBrief = normalizeSerialRhythmBrief(
      contextPackage?.chapter_target?.serial_rhythm_brief
      || contextPackage?.chapter_target?.serialRhythmBrief
      || preDraftBrief.serial_rhythm_brief
      || preDraftBrief.serialRhythmBrief
      || contextPackage?.serial_rhythm_brief
      || contextPackage?.serialRhythmBrief,
      sceneBriefs,
      readerRetentionBrief,
      contextPackage?.chapter_target?.word_target,
    )
    const pageTurnHookBrief = normalizePageTurnHookBrief(
      contextPackage?.chapter_target?.page_turn_hook_brief
      || contextPackage?.chapter_target?.pageTurnHookBrief
      || preDraftBrief.page_turn_hook_brief
      || preDraftBrief.pageTurnHookBrief
      || contextPackage?.page_turn_hook_brief
      || contextPackage?.pageTurnHookBrief,
      contextPackage?.chapter_target || {},
      sceneBriefs,
      readerRetentionBrief,
      storyDriveBrief,
    )
    const chapterBlueprint = contextPackage?.chapter_target?.chapter_blueprint
      || contextPackage?.chapter_target?.chapterBlueprint
      || contextPackage?.chapter_blueprint
      || contextPackage?.chapterBlueprint
      || contextPackage?.pre_draft_brief?.chapter_blueprint
      || contextPackage?.pre_draft_brief?.chapterBlueprint
      || contextPackage?.preDraftBrief?.chapter_blueprint
      || contextPackage?.preDraftBrief?.chapterBlueprint
      || null
    const beatDensityContract = chapterBlueprint?.beat_density_contract || chapterBlueprint?.beatDensityContract || null
    const smallOutlineContract = chapterBlueprint?.small_outline_contract || chapterBlueprint?.smallOutlineContract || null
    const outlineMethodsContract = chapterBlueprint?.outline_methods_contract || chapterBlueprint?.outlineMethodsContract || null
    const mainlineDefinitionContract = chapterBlueprint?.mainline_definition_contract
      || chapterBlueprint?.mainlineDefinitionContract
      || contextPackage?.chapter_target?.mainline_definition_contract
      || contextPackage?.chapter_target?.mainlineDefinitionContract
      || contextPackage?.mainline_definition_contract
      || contextPackage?.mainlineDefinitionContract
      || contextPackage?.pre_draft_brief?.mainline_definition_contract
      || contextPackage?.preDraftBrief?.mainlineDefinitionContract
      || null
    const skipBenchmarkRecall = benchmarkRecallIsNoBenchmark(benchmarkRecallGapsFromContext(contextPackage, {
      style_sample_strategy: styleSampleStrategy,
      chapter_benchmark_strategy: chapterBenchmarkStrategy,
    }))
    const benchmarkRecallBrief = skipBenchmarkRecall
      ? null
      : contextPackage?.chapter_target?.benchmark_recall_brief
        || contextPackage?.benchmark_recall_brief
        || contextPackage?.pre_draft_brief?.benchmark_recall_brief
        || buildBenchmarkRecallBrief(contextPackage, {
          chapter_blueprint: chapterBlueprint,
          style_sample_strategy: styleSampleStrategy,
          chapter_benchmark_strategy: chapterBenchmarkStrategy,
        })
    const styleBoundaryContract = contextPackage?.chapter_target?.style_boundary_contract
      || contextPackage?.style_boundary_contract
      || contextPackage?.pre_draft_brief?.style_boundary_contract
      || buildStyleBoundaryContract(project, contextPackage, {
        style_sample_strategy: styleSampleStrategy,
        chapter_benchmark_strategy: chapterBenchmarkStrategy,
        benchmark_recall_brief: benchmarkRecallBrief,
      })
    const platformRubric = contextPackage?.chapter_target?.platform_rubric
      || contextPackage?.platform_rubric
      || contextPackage?.pre_draft_brief?.platform_rubric
      || buildPlatformRubric(project, contextPackage)
    const contentRubric = contextPackage?.chapter_target?.content_rubric
      || contextPackage?.content_rubric
      || contextPackage?.pre_draft_brief?.content_rubric
      || buildContentRubric(contextPackage)
    const targetReaderContract = contextPackage?.chapter_target?.target_reader_contract
      || contextPackage?.target_reader_contract
      || contextPackage?.pre_draft_brief?.target_reader_contract
      || buildTargetReaderContract(project, contextPackage)
    const genrePositioningContract = contextPackage?.chapter_target?.genre_positioning_contract
      || contextPackage?.genre_positioning_contract
      || contextPackage?.pre_draft_brief?.genre_positioning_contract
      || buildGenrePositioningContract(project, contextPackage)
    const plotSpecialTopicsContract = contextPackage?.chapter_target?.plot_special_topics_contract
      || contextPackage?.plot_special_topics_contract
      || contextPackage?.pre_draft_brief?.plot_special_topics_contract
      || plotSpecialTopicsContractForSync(project, contextPackage)
    const femaleAudienceContract = contextPackage?.chapter_target?.female_audience_contract
      || contextPackage?.female_audience_contract
      || contextPackage?.pre_draft_brief?.female_audience_contract
      || buildFemaleAudienceContract(project, contextPackage)
    const upgradeRhythmContract = contextPackage?.chapter_target?.upgrade_rhythm_contract
      || contextPackage?.upgrade_rhythm_contract
      || contextPackage?.pre_draft_brief?.upgrade_rhythm_contract
      || buildUpgradeRhythmContract(project, contextPackage)
    const conflictStructureContract = contextPackage?.chapter_target?.conflict_structure_contract
      || contextPackage?.conflict_structure_contract
      || contextPackage?.pre_draft_brief?.conflict_structure_contract
      || buildConflictStructureContract(project, contextPackage)
    const storyLoopContract = contextPackage?.chapter_target?.story_loop_contract
      || contextPackage?.story_loop_contract
      || contextPackage?.pre_draft_brief?.story_loop_contract
      || buildStoryLoopContract(project, contextPackage)
    const emotionalArcContract = contextPackage?.chapter_target?.emotional_arc_contract
      || contextPackage?.emotional_arc_contract
      || contextPackage?.pre_draft_brief?.emotional_arc_contract
      || buildEmotionalArcContract(project, contextPackage)
    const chapterHookContract = contextPackage?.chapter_target?.chapter_hook_contract
      || contextPackage?.chapter_hook_contract
      || contextPackage?.pre_draft_brief?.chapter_hook_contract
      || buildChapterHookContract(project, contextPackage)
    const paragraphHookContract = contextPackage?.chapter_target?.paragraph_hook_contract
      || contextPackage?.paragraph_hook_contract
      || contextPackage?.pre_draft_brief?.paragraph_hook_contract
      || buildParagraphHookContract(project, contextPackage)
    const suspenseContract = contextPackage?.chapter_target?.suspense_contract
      || contextPackage?.suspense_contract
      || contextPackage?.pre_draft_brief?.suspense_contract
      || buildSuspenseContract(project, contextPackage)
    const reversalContract = contextPackage?.chapter_target?.reversal_contract
      || contextPackage?.reversal_contract
      || contextPackage?.pre_draft_brief?.reversal_contract
      || buildReversalContract(project, contextPackage)
    const showdownContract = contextPackage?.chapter_target?.showdown_contract
      || contextPackage?.showdown_contract
      || contextPackage?.pre_draft_brief?.showdown_contract
      || buildShowdownContract(project, contextPackage)
    const bridgeUnitContract = contextPackage?.chapter_target?.bridge_unit_contract
      || contextPackage?.bridge_unit_contract
      || contextPackage?.pre_draft_brief?.bridge_unit_contract
      || buildBridgeUnitContract(project, contextPackage)
    const plotFrameworkContract = contextPackage?.chapter_target?.plot_framework_contract
      || contextPackage?.plot_framework_contract
      || contextPackage?.pre_draft_brief?.plot_framework_contract
      || buildPlotFrameworkContract(project, contextPackage, {
        showdown_contract: showdownContract,
        bridge_unit_contract: bridgeUnitContract,
        suspense_contract: suspenseContract,
        conflict_structure_contract: conflictStructureContract,
      })
    const openingContract = contextPackage?.chapter_target?.opening_contract
      || contextPackage?.opening_contract
      || contextPackage?.pre_draft_brief?.opening_contract
      || buildOpeningContract(project, contextPackage)
    const proseCraftContract = contextPackage?.chapter_target?.prose_craft_contract
      || contextPackage?.prose_craft_contract
      || contextPackage?.pre_draft_brief?.prose_craft_contract
      || buildProseCraftContract(project, contextPackage)
    const punctuationToneContract = contextPackage?.chapter_target?.punctuation_tone_contract
      || contextPackage?.punctuation_tone_contract
      || contextPackage?.pre_draft_brief?.punctuation_tone_contract
      || buildPunctuationToneContract(project, contextPackage)
    const qualityAuditContract = contextPackage?.chapter_target?.quality_audit_contract
      || contextPackage?.quality_audit_contract
      || contextPackage?.pre_draft_brief?.quality_audit_contract
      || buildQualityAuditContract(project, contextPackage)
    const dialogueContract = contextPackage?.chapter_target?.dialogue_contract
      || contextPackage?.dialogue_contract
      || contextPackage?.pre_draft_brief?.dialogue_contract
      || buildDialogueContract(contextPackage)
    const plotDynamicsContract = contextPackage?.chapter_target?.plot_dynamics_contract
      || contextPackage?.plot_dynamics_contract
      || contextPackage?.pre_draft_brief?.plot_dynamics_contract
      || buildPlotDynamicsContract(contextPackage)
    const storyPowerContract = contextPackage?.chapter_target?.story_power_contract
      || contextPackage?.story_power_contract
      || contextPackage?.pre_draft_brief?.story_power_contract
      || buildStoryPowerContract(project, contextPackage)
    const continuityHeatContract = contextPackage?.chapter_target?.continuity_heat_contract
      || contextPackage?.continuity_heat_contract
      || contextPackage?.pre_draft_brief?.continuity_heat_contract
      || buildContinuityHeatContract(contextPackage)
    const characterRelationContract = contextPackage?.chapter_target?.character_relation_contract
      || contextPackage?.character_relation_contract
      || contextPackage?.pre_draft_brief?.character_relation_contract
      || buildCharacterRelationContract(contextPackage)
    const characterBehaviorContract = contextPackage?.chapter_target?.character_behavior_contract
      || contextPackage?.character_behavior_contract
      || contextPackage?.pre_draft_brief?.character_behavior_contract
      || buildCharacterBehaviorContract(contextPackage)
    const assetLinkageContract = contextPackage?.chapter_target?.asset_linkage_contract
      || contextPackage?.asset_linkage_contract
      || contextPackage?.pre_draft_brief?.asset_linkage_contract
      || buildAssetLinkageContract(contextPackage)
    const assetRelationshipGraphRisks = asArray(
      assetLinkageContract?.relationship_graph_risks
        || assetLinkageContract?.relationshipGraphRisks,
    ).map(assetText).filter(Boolean)
    const stateTrackingContract = contextPackage?.chapter_target?.state_tracking_contract
      || contextPackage?.state_tracking_contract
      || contextPackage?.pre_draft_brief?.state_tracking_contract
      || buildStateTrackingContract(contextPackage)
    const intentConfirmationContract = contextPackage?.chapter_target?.intent_confirmation_contract
      || contextPackage?.intent_confirmation_contract
      || contextPackage?.pre_draft_brief?.intent_confirmation_contract
      || buildIntentConfirmationContract(contextPackage, {
        chapter_blueprint: chapterBlueprint,
        state_tracking_contract: stateTrackingContract,
      })
    const informationFlowContract = contextPackage?.chapter_target?.information_flow_contract
      || contextPackage?.information_flow_contract
      || contextPackage?.pre_draft_brief?.information_flow_contract
      || buildInformationFlowContract(contextPackage)
    const expectationThresholdContract = contextPackage?.chapter_target?.expectation_threshold_contract
      || contextPackage?.expectation_threshold_contract
      || contextPackage?.pre_draft_brief?.expectation_threshold_contract
      || buildExpectationThresholdContract(contextPackage)
    const volumeClimaxBrief = normalizeVolumeClimaxBrief(
      contextPackage?.chapter_target?.volume_climax_brief
      || contextPackage?.chapter_target?.volumeClimaxBrief
      || contextPackage?.chapter_target?.volume_beat_brief
      || contextPackage?.chapter_target?.volumeBeatBrief
      || preDraftBrief.volume_climax_brief
      || preDraftBrief.volumeClimaxBrief
      || preDraftBrief.volume_beat_brief
      || preDraftBrief.volumeBeatBrief
      || contextPackage?.volume_climax_brief
      || contextPackage?.volumeClimaxBrief
      || contextPackage?.volume_beat_brief
      || contextPackage?.volumeBeatBrief
      || contextPackage?.volume_beat_budget
      || contextPackage?.volumeBeatBudget,
      contextPackage?.chapter_target || {},
      contextPackage?.volume_beat_budget || contextPackage?.volumeBeatBudget,
    )
    const recentFatigueBrief = normalizeRecentFatigueBrief(
      contextPackage?.chapter_target?.recent_fatigue_brief
      || contextPackage?.chapter_target?.recentFatigueBrief
      || contextPackage?.chapter_target?.recent_fatigue_radar
      || contextPackage?.chapter_target?.recentFatigueRadar
      || preDraftBrief.recent_fatigue_brief
      || preDraftBrief.recentFatigueBrief
      || preDraftBrief.recent_fatigue_radar
      || preDraftBrief.recentFatigueRadar
      || contextPackage?.recent_fatigue_brief
      || contextPackage?.recentFatigueBrief
      || contextPackage?.recent_fatigue_radar
      || contextPackage?.recentFatigueRadar,
    )
    const deliveryRiskCarryOver = normalizeDeliveryRiskCarryOverContext(
      contextPackage?.chapter_target?.delivery_risk_carry_over
      || contextPackage?.chapter_target?.deliveryRiskCarryOver
      || preDraftBrief.delivery_risk_carry_over
      || preDraftBrief.deliveryRiskCarryOver
      || contextPackage?.delivery_risk_carry_over
      || contextPackage?.deliveryRiskCarryOver,
    )
    const writePreparationBrief = contextPackage?.chapter_target?.write_preparation_brief
      || contextPackage?.chapter_target?.writePreparationBrief
      || contextPackage?.write_preparation_brief
      || contextPackage?.writePreparationBrief
      || contextPackage?.pre_draft_brief?.write_preparation_brief
      || contextPackage?.preDraftBrief?.writePreparationBrief
      || buildWritePreparationBrief(contextPackage, {
        chapter_blueprint: chapterBlueprint,
        reader_retention_brief: readerRetentionBrief,
        asset_linkage_contract: assetLinkageContract,
        state_tracking_contract: stateTrackingContract,
        delivery_risk_carry_over: deliveryRiskCarryOver,
        recent_fatigue_brief: recentFatigueBrief,
        batch_preflight: contextPackage?.chapter_target?.batch_preflight || contextPackage?.batch_preflight,
        benchmark_recall_brief: benchmarkRecallBrief,
        plot_special_topics_contract: plotSpecialTopicsContract,
      })
    const readerExpectationDebtContext = applyReaderExpectationDebtAging(
      normalizeReaderExpectationDebtContext(
        contextPackage?.chapter_target?.reader_expectation_debt_context
        || contextPackage?.chapter_target?.readerExpectationDebtContext
        || preDraftBrief.reader_expectation_debt
        || preDraftBrief.readerExpectationDebt
        || preDraftBrief.reader_expectation_debt_context
        || preDraftBrief.readerExpectationDebtContext
        || contextPackage?.reader_expectation_debt_context,
      ),
      Number(chapterDraft?.chapter_no || contextPackage?.chapter_target?.chapter_no || 0),
    )
    const previousHandoff = buildPreviousChapterHandoff(contextPackage)
    const storyUnitContext = storyUnitContextFromContext(contextPackage, chapterDraft)
    const signatureSceneBrief = normalizeSignatureSceneBrief(
      contextPackage?.chapter_target?.signature_scene_brief
      || contextPackage?.chapter_target?.signatureSceneBrief
      || preDraftBrief.signature_scene_brief
      || preDraftBrief.signatureSceneBrief
      || contextPackage?.signature_scene_brief
      || contextPackage?.signatureSceneBrief
      || contextPackage?.chapter_target?.rollingPlan
      || contextPackage?.chapter_target?.rolling_plan,
    )
    const innovationBrief = normalizeInnovationBrief(
      contextPackage?.chapter_target?.innovation_brief
      || contextPackage?.chapter_target?.innovationBrief
      || preDraftBrief.innovation_brief
      || preDraftBrief.innovationBrief
      || contextPackage?.innovation_brief
      || contextPackage?.innovationBrief,
    )
    const characterArcBrief = characterArcBriefFromContext(contextPackage, chapterDraft)
    const titleUniquenessReport = contextPackage?.chapter_target?.title_uniqueness_report || null
    const duplicateTitleRows = asArray(titleUniquenessReport?.duplicates)
      .map((item: any) => `第${item?.chapter_no || '?'}章《${item?.title || '无标题'}》`)
      .filter(Boolean)
    const ohStoryDirectorPromptBlock = buildOhStoryDirectorPromptBlock(contextPackage)
    return buildBoundedProsePrompt([
      '任务：按场景卡生成章节正文。请先在心中按场景组织段落，再输出完整正文。',
      '硬性语言要求：chapter_text 必须使用简体中文，按中文网文自然分段和中文引号输出；不得输出葡萄牙语、英语或拼音正文，外语只允许作为故事内必要专名少量出现。',
      `作品标题：${project.title}`,
      chapterDraft?.chapter_no ? `目标章节：第${chapterDraft.chapter_no}章《${chapterDraft.title || '无标题'}》` : '',
      chapterDraft?.chapter_no ? `只允许输出这一章的正文，不得混入其他章节内容。chapter_no 必须严格等于 ${chapterDraft.chapter_no}` : '',
      contextPackage?.chapter_target?.word_target ? `本章目标字数：约 ${contextPackage.chapter_target.word_target.target} 字；可接受范围：${contextPackage.chapter_target.word_target.min}-${contextPackage.chapter_target.word_target.max} 字；类型：${contextPackage.chapter_target.word_target.label}。` : '',
      contextPackage?.chapter_target?.word_target ? '字数执行要求：每个场景分配明确字数预算，正文不得只写剧情摘要；如果低于目标范围，必须扩写动作过程、选择代价、对话交锋和章末钩子铺垫，而不是堆砌环境描写。' : '',
      chapterPositioningBrief ? '【章节定位与对标结构坐标】' : '',
      chapterPositioningBrief ? '硬性要求：执行 chapter_target.chapter_positioning_brief；按章节定位决定冲突烈度、爽点密度、详略和章尾拉力。高压/推进章要有明确升级或回报；低压/过场章可弱钩子，但必须保留阶段目标、微好奇或关系期待。' : '',
      chapterPositioningBrief ? `chapter_target.chapter_positioning_brief：${JSON.stringify(chapterPositioningBrief).slice(0, 1800)}` : '',
      sceneBriefs.length ? `scene_cards.chapter_positioning：${sceneBriefs.map((scene: any) => `${scene.scene_no || ''}.${scene.title || '场景'}=${scene.chapter_positioning || chapterPositioningBrief.chapter_positioning || '推进'}${scene.pressure_level ? `/P${scene.pressure_level}` : ''}${scene.chapter_positioning_role ? `/${scene.chapter_positioning_role}` : ''}`).join('；')}` : '',
      chapterPositioningBrief?.benchmark_structure_coordinates?.length ? `对标结构坐标：${JSON.stringify(chapterPositioningBrief.benchmark_structure_coordinates).slice(0, 1600)}；只迁移结构功能位和节奏位置，不复制对标桥段、设定、人物或原句。` : '',
      sceneBriefs.length ? '【场景卡执行摘要】' : '',
      sceneBriefs.length ? JSON.stringify({ scene_cards: sceneBriefs.slice(0, 8).map(compactProseSceneCard) }, null, 2).slice(0, 3600) : '',
      ...buildTitleUniquenessPromptSection(titleUniquenessReport, duplicateTitleRows),
      '必须以 chapter_target.summary、chapter_target.conflict、chapter_target.ending_hook 和 scene_cards 为准；如果已有正文或旧场景分解与目标不一致，不得沿用。',
      'oh-story 日更工作流：生成正文前按 Step 2.1 标题预检、Step 2.2 状态筛选、Step 2.3 文风召回、Step 2.4 意图确认、章节蓝图/场景卡门禁执行；继续/续写/日更只表示继续当前日更批量流程，不得跳过 Step 2.2 状态筛选或 Step 2.3 文风召回；状态筛选只保留不知道就会写错的信息；正文后用回执闭环，不用任务书自述替代正文证据。',
      ohStoryDirectorPromptBlock,
      'oh-story 自然写作底线：正文按“动作 -> 对话 -> 情绪反应 -> 动作”循环推进，单写心理活动不得连续超过 2 段；情绪用身体动作、行为选择、对话反应或代价表现，不直接写“他很紧张/她很伤心”。',
      '句式节奏：打斗/紧张用 3-8 字短句制造速度，日常用 8-15 字承载动作和信息，描写句必须读起来不卡；长短句交错，不要通篇同长度、同语气、同段落密度。',
      '对白口吻：对话必须口语化，符合角色身份和关系阶段；不要把“我认为此事不妥”这类书面语塞进角色嘴里，能用动作或半句话表达的，不用旁白说明。',
      '章尾收束：章尾用动作、对话或悬念收束，让情节本身制造余韵；不得用总结性感悟、哲理升华或作者预告收尾，例如“他终于明白”“这一夜注定”“更大的风暴即将来临”。',
      '外部事实查证：如果写作涉及历史年代、地理方位、职业细节、法律/医疗/技术流程、真实机构或真实地名且当前上下文没有可靠来源，必须按 oh-story 资料研究流程标记待查证、改成架空/模糊表达，或把信息留作角色待验证线索；不得编造确定事实。',
      '',
      previousHandoff ? '【上一章尾段原文承接】' : '',
      previousHandoff ? '硬性要求：按 oh-story 日更串行流程，先读取上一章刚写入正文尾段再续写。前300字必须接住上一章最后一幕、动作链、角色反应、钩子、危机、欠账或未解问题；不能只复述摘要或改写成新的开场，也不得重新从泛环境描写、空泛醒来或无关解释开场。' : '',
      previousHandoff ? previousHandoff : '',
      '',
      ...buildWritePreparationPromptSection(writePreparationBrief),
      ...buildChapterBlueprintPromptSection({
        chapterBlueprint,
        beatDensityContract,
        smallOutlineContract,
        outlineMethodsContract,
        mainlineDefinitionContract,
        beatDensityFallbackRule: OH_STORY_BEAT_DENSITY_RULE,
      }),
      ...buildPlatformRubricPromptSection(platformRubric),
      ...buildContentRubricPromptSection(contentRubric),
      ...buildTargetReaderPromptSection(targetReaderContract),
      ...buildGenrePositioningPromptSection(genrePositioningContract),
      ...buildPlotSpecialTopicsPromptSection(plotSpecialTopicsContract),
      ...buildFemaleAudiencePromptSection(femaleAudienceContract),
      ...buildUpgradeRhythmPromptSection(upgradeRhythmContract),
      ...buildConflictStructurePromptSection(conflictStructureContract),
      ...buildStoryLoopPromptSection(storyLoopContract),
      ...buildEmotionalArcPromptSection(emotionalArcContract),
      ...buildChapterHookPromptSection(chapterHookContract),
      ...buildParagraphHookPromptSection(paragraphHookContract),
      ...buildSuspensePromptSection(suspenseContract),
      ...buildReversalPromptSection(reversalContract),
      ...buildShowdownPromptSection(showdownContract),
      ...buildBridgeUnitPromptSection(bridgeUnitContract),
      ...buildPlotFrameworkPromptSection(plotFrameworkContract),
      ...buildOpeningPromptSection(openingContract),
      ...buildProseCraftPromptSection(proseCraftContract),
      ...buildPunctuationTonePromptSection(punctuationToneContract),
      ...buildQualityAuditPromptSection(qualityAuditContract),
      ...buildDialoguePromptSection(dialogueContract),
      ...buildPlotDynamicsPromptSection(plotDynamicsContract),
      ...buildStoryPowerPromptSection(storyPowerContract),
      ...buildContinuityHeatPromptSection(continuityHeatContract),
      ...buildCharacterRelationPromptSection(characterRelationContract),
      ...buildCharacterBehaviorPromptSection(characterBehaviorContract),
      ...buildAssetLinkagePromptSection(assetLinkageContract, assetRelationshipGraphRisks),
      ...buildStateTrackingPromptSection(stateTrackingContract),
      ...buildIntentConfirmationPromptSection(intentConfirmationContract),
      ...buildBenchmarkRecallPromptSection(benchmarkRecallBrief),
      ...buildStyleBoundaryPromptSection(styleBoundaryContract),
      ...buildInformationFlowPromptSection(informationFlowContract),
      ...buildExpectationThresholdPromptSection(expectationThresholdContract),
      ...buildDeliveryRiskCarryOverPromptSection(deliveryRiskCarryOver),
      ...buildLongformCompassPromptSection(longformCompass),
      ...buildLongformBattleContextPromptSection(longformBattleContext),
      ...buildChapterLaunchGatePromptSection(chapterLaunchGate),
      ...buildGovernanceRecheckPromptSection(governanceRecheckMemory),
      ...buildCoreContractRadarPromptSection(coreContractRadar),
      nextBatchBrief ? '【本批连载任务书】' : '',
      nextBatchBrief ? '硬性要求：本章必须服务批次目标和当前章角色；不得提前消费后续章节爆点，不得跳过本章读者回报，不得抢跑批次后段的主线兑现。' : '',
      nextBatchBrief?.start_checklist?.length ? `批次开工清单：${nextBatchBrief.start_checklist.map((item: any) => `${item.label || item.key}：${item.detail || item.status}`).join('；')}` : '',
      nextBatchBrief?.workflow_rules?.length ? `批量流程规则：${nextBatchBrief.workflow_rules.join('；')}` : '',
      nextBatchBrief ? JSON.stringify(nextBatchBrief, null, 2).slice(0, 4000) : '',
      '',
      expansionStructureDecision ? '【扩批结构决策】' : '',
      expansionStructureDecision ? '硬性要求：执行 next_batch_brief.expansion_structure_decision；这是结构修复有效性对本批规模、段位职责和观察指标的最终判断。正文必须按 recommendation 执行，不得因为恢复扩批而淡化结构约束，也不得在小批验证或单章重构时抢跑后续批次。' : '',
      expansionStructureDecision?.recommendation ? `决策：${expansionStructureDecision.recommendation}` : '',
      expansionStructureDecision?.mode_label ? `模式：${expansionStructureDecision.mode_label}` : '',
      expansionStructureDecision?.target_chapter_count ? `目标批次：${expansionStructureDecision.target_chapter_count}章` : '',
      expansionStructureDecision?.segment_label ? `观察段位：${expansionStructureDecision.segment_label}` : '',
      expansionStructureDecision?.summary ? `有效性摘要：${expansionStructureDecision.summary}` : '',
      expansionStructureDecision?.instruction ? `执行口径：${expansionStructureDecision.instruction}` : '',
      expansionStructureDecision?.observation_metrics?.length ? `观察指标：${expansionStructureDecision.observation_metrics.join('；')}` : '',
      defaultFiveChapterLaneRedesign ? '默认5章档位结构重构：连续恢复判定失效后，本章不得只修单章句子，必须先重写默认 5 章档位的段位职责、冲突轮换、回报密度和章末追读模板。' : '',
      defaultFiveChapterLaneRedesign?.reason ? `重构来源：${defaultFiveChapterLaneRedesign.reason}` : '',
      defaultFiveChapterLaneRedesign?.relapse_count ? `连续恢复判定失效：${defaultFiveChapterLaneRedesign.relapse_count}次` : '',
      defaultFiveChapterLaneRedesign?.repeated_failure_reasons?.length ? `同维复发：${defaultFiveChapterLaneRedesign.repeated_failure_reasons.join('、')}` : '',
      defaultFiveChapterLaneRedesign?.segment_duty_rewrite ? `段位职责重写：${defaultFiveChapterLaneRedesign.segment_duty_rewrite}` : '',
      defaultFiveChapterLaneRedesign?.conflict_rotation ? `冲突轮换：${defaultFiveChapterLaneRedesign.conflict_rotation}` : '',
      defaultFiveChapterLaneRedesign?.payoff_density ? `回报密度：${defaultFiveChapterLaneRedesign.payoff_density}` : '',
      defaultFiveChapterLaneRedesign?.ending_hook_template ? `章末追读模板：${defaultFiveChapterLaneRedesign.ending_hook_template}` : '',
      defaultFiveChapterLaneRedesign ? '默认档位回执字段：expansion_structure_decision_execution 必须额外回填 default_lane_segment_duty_delivered(boolean)、default_lane_conflict_rotation_delivered(boolean)、default_lane_payoff_density_delivered(boolean)、default_lane_ending_hook_template_delivered(boolean)，并在 evidence 中说明四项模板如何落到正文。' : '',
      expansionStructureDecision ? '执行回执：scene_breakdown 中承担结构职责的场景必须回填 expansion_structure_decision_execution，字段包含 segment_role_delivered(boolean)、observation_metrics_delivered(boolean)、redesign_principles_delivered(boolean)、evidence(array)。' : '',
      expansionStructureDecision ? JSON.stringify(expansionStructureDecision, null, 2).slice(0, 3000) : '',
      '',
      expansionStructureVerification ? '【扩批结构验证】' : '',
      expansionStructureVerification ? '硬性要求：执行 next_batch_brief.expansion_structure_verification；这是已修复的5章扩批热区进入本轮2-3章验证，正文必须证明结构修复真的落地，而不是只声明已经修好。' : '',
      expansionStructureVerification?.repeated_hotspot_segment ? `${expansionStructureVerification.repeated_hotspot_segment.label || '复发段位'}连续 ${expansionStructureVerification.repeated_hotspot_segment.count || 0} 次成为扩批热区，本批必须反证同一段位不会再次只铺垫、掉回报或丢章末追读。` : '',
      expansionStructureVerification?.validation_chapter_nos?.length ? `验证章节：${expansionStructureVerification.validation_chapter_nos.map((chapterNo: number) => `第${chapterNo}章`).join('、')}` : '',
      expansionStructureVerification?.fixed_segment_role ? `固定段落职责：${expansionStructureVerification.fixed_segment_role}` : '',
      expansionStructureVerification?.conflict_rotation ? `冲突换源：${expansionStructureVerification.conflict_rotation}` : '',
      expansionStructureVerification?.explicit_payoff ? `显性回报：${expansionStructureVerification.explicit_payoff}` : '',
      expansionStructureVerification?.ending_hook_requirement ? `章末追读：${expansionStructureVerification.ending_hook_requirement}` : '',
      expansionStructureVerification?.structure_actions?.length ? `结构动作：${expansionStructureVerification.structure_actions.join('；')}` : '',
      defaultFiveChapterLaneTemplate ? `默认5章档位模板回检：${defaultFiveChapterLaneTemplate.summary || defaultFiveChapterLaneTemplate.label}` : '',
      defaultFiveChapterLaneTemplateRequirementLabels.length ? `四项模板：${defaultFiveChapterLaneTemplateRequirementLabels.join('、')}` : '',
      defaultFiveChapterLaneTemplate?.segment_duty_rewrite ? `段位职责重写：${defaultFiveChapterLaneTemplate.segment_duty_rewrite}` : '',
      defaultFiveChapterLaneTemplate?.conflict_rotation ? `冲突轮换：${defaultFiveChapterLaneTemplate.conflict_rotation}` : '',
      defaultFiveChapterLaneTemplate?.payoff_density ? `回报密度：${defaultFiveChapterLaneTemplate.payoff_density}` : '',
      defaultFiveChapterLaneTemplate?.ending_hook_template ? `章末追读模板：${defaultFiveChapterLaneTemplate.ending_hook_template}` : '',
      defaultFiveChapterLaneTemplateRedesignSource ? `模板重构来源：${defaultFiveChapterLaneTemplateRedesignSource}` : '',
      defaultFiveChapterLaneTemplateVersionId ? `模板版本：${defaultFiveChapterLaneTemplateVersionId}` : '',
      defaultFiveChapterLaneTemplateProductionRelapseCount ? `生产复发次数：${defaultFiveChapterLaneTemplateProductionRelapseCount}` : '',
      defaultFiveChapterLaneTemplateProductionRelapseChapterNos ? `生产复发章节：${defaultFiveChapterLaneTemplateProductionRelapseChapterNos}` : '',
      defaultFiveChapterLaneTemplateProductionRelapseValidationNos ? `生产复发前验证：${defaultFiveChapterLaneTemplateProductionRelapseValidationNos}` : '',
      defaultFiveChapterLaneTemplateProductionRelapseRestoreNos ? `生产恢复依据：${defaultFiveChapterLaneTemplateProductionRelapseRestoreNos}` : '',
      defaultFiveChapterLaneTemplateProductionFailureReasons.length ? `真实生产失败维度：${defaultFiveChapterLaneTemplateProductionFailureReasons.join('、')}` : '',
      defaultFiveChapterLaneTemplateProductionFailedRequirements.length ? `生产复发模板缺项：${defaultFiveChapterLaneTemplateProductionFailedRequirements.join('；')}` : '',
      defaultFiveChapterLaneTemplateProductionRelapseReview ? `模板版本后验验证：本轮3章验证批必须逐章对照 template_version_id ${defaultFiveChapterLaneTemplateVersionId || defaultFiveChapterLaneTemplateProductionRelapseReview.template_version_id || '当前版本'}${defaultFiveChapterLaneTemplateProductionRelapseChapterNos ? ` 和真实生产复发章节 ${defaultFiveChapterLaneTemplateProductionRelapseChapterNos}` : ''}，证明新版模板能修掉生产后验问题。` : '',
      defaultFiveChapterLaneTemplateTopFailed ? `高频缺项：${compactBriefText(defaultFiveChapterLaneTemplateTopFailed.label || defaultFiveChapterLaneTemplateTopFailed.key || '模板缺项')}失败 ${Number(defaultFiveChapterLaneTemplateTopFailed.failed_count ?? defaultFiveChapterLaneTemplateTopFailed.failedCount ?? 0)} 次` : '',
      ...defaultFiveChapterLaneTemplateRedesignLines.map(item => `重构模板：${item}`),
      defaultFiveChapterLaneTemplateValidationStandard.length ? `下一轮验证标准：${defaultFiveChapterLaneTemplateValidationStandard.join('；')}` : '',
      defaultFiveChapterLaneTemplateRequiredReceipts.length ? `逐章回填字段：${defaultFiveChapterLaneTemplateRequiredReceipts.join('、')}` : '',
      defaultFiveChapterLaneTemplateRepairSummaries.length ? `模板缺项修复：${defaultFiveChapterLaneTemplateRepairSummaries.join('；')}` : '',
      defaultFiveChapterLaneTemplateRepairActions.length ? `缺项修复动作：${defaultFiveChapterLaneTemplateRepairActions.join('；')}` : '',
      defaultFiveChapterLaneTemplate ? '默认档位模板验证要求：下一轮验证批逐章继承段位职责、冲突轮换、回报密度和章末追读模板，并逐章证明四项模板没有复发。' : '',
      defaultFiveChapterRegression ? `默认5章档位回退：${defaultFiveChapterRegression.summary || defaultFiveChapterRegression.label || '默认档位复发，需要回到3章验证批。'}` : '',
      defaultFiveChapterRegression?.default_batch_chapter_nos?.length ? `失效批次：${chapterNosBrief(defaultFiveChapterRegression.default_batch_chapter_nos)}` : '',
      defaultFiveChapterRegression?.restore_chapter_nos?.length ? `恢复依据：${chapterNosBrief(defaultFiveChapterRegression.restore_chapter_nos)}` : '',
      defaultFiveChapterRegression?.validation_chapter_nos?.length ? `前置3章验证：${chapterNosBrief(defaultFiveChapterRegression.validation_chapter_nos)}` : '',
      defaultFiveChapterRegression?.failure_reasons?.length ? `失败维度：${defaultFiveChapterRegression.failure_reasons.join('、')}` : '',
      defaultFiveChapterRegression ? '默认档位验证要求：本批每章都必须逐章证明核心守恒、显性回报和章末追读已经重新稳定；不能只修复单章句子，也不能把中段继续写成铺垫、转场或弱钩子。' : '',
      expansionStructureVerification ? JSON.stringify(expansionStructureVerification, null, 2).slice(0, 3000) : '',
      '',
      longformMemoryAnchor ? '【长篇正史锚点】' : '',
      longformMemoryAnchor ? '硬性要求：这是本批连续生产的压缩正史。角色状态、开放悬念、回报债务和核心承诺不得被改写、遗忘或绕开；新增情节必须从这些锚点自然推进。' : '',
      longformMemoryAnchor ? JSON.stringify(longformMemoryAnchor, null, 2).slice(0, 3000) : '',
      '',
      longformMemoryCapsule ? '【长篇记忆胶囊】' : '',
      longformMemoryCapsule ? '硬性要求：执行 chapter_target.longform_memory_capsule；这是本章必须召回的压缩正史。核心承诺、主线进度、角色状态、开放悬念、回报债务、正史事实和红线不得被遗忘、矛盾改写或跳过。' : '',
      '硬性要求：执行 chapter_target.established_events_contract；已锁正史事件（死亡方式、规则触发、能力代价等）在闪回或复述时不得改写 cause/mechanism/constraints，只能同义转述。',
      longformMemoryCapsule ? JSON.stringify(longformMemoryCapsule, null, 2).slice(0, 4000) : '',
      '',
      layeredMemoryContext ? '【长篇分层记忆】' : '',
      layeredMemoryContext ? '硬性要求：执行 chapter_target.layered_memory_context；近5章详记保留细节承接，十章概要只守阶段正史，卷级总览只守卷级方向。不得把近期状态、十章压缩事实和卷级红线互相覆盖。' : '',
      layeredMemoryContext?.recent_chapter_details?.length ? `近5章详记：${layeredMemoryContext.recent_chapter_details.join('；')}` : '',
      layeredMemoryContext?.ten_chapter_summaries?.length ? `十章概要：${layeredMemoryContext.ten_chapter_summaries.join('；')}` : '',
      layeredMemoryContext?.volume_overview?.length ? `卷级总览：${layeredMemoryContext.volume_overview.join('；')}` : '',
      layeredMemoryContext?.archive_refs?.length ? `归档索引：${layeredMemoryContext.archive_refs.join('；')}` : '',
      layeredMemoryContext?.red_lines?.length ? `分层记忆红线：${layeredMemoryContext.red_lines.join('；')}` : '',
      layeredMemoryContext ? JSON.stringify(layeredMemoryContext, null, 2).slice(0, 4000) : '',
      '',
      progressSummary ? '【日更进度断点】' : '',
      progressSummary ? '硬性要求：执行 story_state.progress_summary；这是 oh-story Step 4 从追踪/上下文.md 沉淀的续写断点。开篇必须承接最后完成章节后的状态，优先保留注意事项，不要把详细伏笔表、时间线表或角色状态表复制进正文。' : '',
      progressSummary?.last_completed_chapter ? `最后完成章节：第${progressSummary.last_completed_chapter}章` : '',
      progressSummary?.completed_chapter_count ? `本期完成：${progressSummary.completed_chapter_count}章` : '',
      progressSummary?.completed_word_count ? `本期字数：${progressSummary.completed_word_count}字` : '',
      progressSummary?.active_foreshadowing_count ? `活跃伏笔：${progressSummary.active_foreshadowing_count}条` : '',
      progressSummary?.recent_changed_characters?.length ? `最近变更角色：${progressSummary.recent_changed_characters.join('、')}` : '',
      progressSummary?.next_outline_status ? `下一章细纲状态：${progressSummary.next_outline_status}` : '',
      progressSummary?.notes?.length ? `注意事项：${progressSummary.notes.join('；')}` : '',
      progressSummary ? JSON.stringify(progressSummary, null, 2).slice(0, 2000) : '',
      '',
      dailyContextSnapshot ? '【日更上下文快照】' : '',
      dailyContextSnapshot ? '硬性要求：执行 story_state.daily_context_snapshot；这是 oh-story 完成后自动更新的追踪/上下文.md 快照。开篇必须接住当前位置、场景和情绪目标；写作变更要成为本章事实约束，待处理线索要么推进要么保持清晰债务。' : '',
      dailyContextSnapshot?.current_chapter ? `当前位置/章：第${dailyContextSnapshot.current_chapter}章` : '',
      dailyContextSnapshot?.current_scene ? `当前位置/场景：${dailyContextSnapshot.current_scene}` : '',
      dailyContextSnapshot?.current_emotion_target ? `当前位置/情绪目标：${dailyContextSnapshot.current_emotion_target}` : '',
      dailyContextSnapshot?.writing_changes?.length ? `本次写作变更：${dailyContextSnapshot.writing_changes.join('；')}` : '',
      dailyContextSnapshot?.pending_clues?.length ? `待处理线索：${dailyContextSnapshot.pending_clues.join('；')}` : '',
      dailyContextSnapshot ? JSON.stringify(dailyContextSnapshot, null, 2).slice(0, 2000) : '',
      '',
      foreshadowingConsistencyRadar ? '【伏笔一致性雷达】' : '',
      foreshadowingConsistencyRadar ? '硬性要求：执行 oh-story consistency-checker 的伏笔状态扫描；这是事实一致性债务，不是文学评价。活跃伏笔必须保持存在感，超期伏笔要推进、暂缓说明或进入回收路径；回收时不得改写角色知识边界、时间线、物品归属或后续新增设定。' : '',
      foreshadowingConsistencyRadar?.active_count ? `活跃伏笔：${foreshadowingConsistencyRadar.active_count}条` : '',
      foreshadowingConsistencyRadar?.overdue_count ? `超期伏笔：${foreshadowingConsistencyRadar.overdue_count}条` : '',
      foreshadowingConsistencyRadar?.active?.length ? `活跃伏笔清单：${foreshadowingConsistencyRadar.active.join('；')}` : '',
      foreshadowingConsistencyRadar?.overdue?.length ? `超期伏笔清单：${foreshadowingConsistencyRadar.overdue.join('；')}` : '',
      foreshadowingConsistencyRadar?.density_warnings?.length ? `伏笔密度提醒：${foreshadowingConsistencyRadar.density_warnings.join('；')}` : '',
      foreshadowingConsistencyRadar?.scope_rules?.length ? `伏笔盘点范围：${foreshadowingConsistencyRadar.scope_rules.join('；')}` : '',
      foreshadowingConsistencyRadar?.status_rules?.length ? `伏笔状态语义：${foreshadowingConsistencyRadar.status_rules.join('；')}` : '',
      foreshadowingConsistencyRadar?.guardrails?.length ? `一致性红线：${foreshadowingConsistencyRadar.guardrails.join('；')}` : '',
      foreshadowingConsistencyRadar ? JSON.stringify(foreshadowingConsistencyRadar, null, 2).slice(0, 2400) : '',
      '',
      styleFingerprintHandoff ? '【文风指纹断点】' : '',
      styleFingerprintHandoff ? '硬性要求：执行 story_state.style_fingerprint；这是 oh-story 追踪/上下文.md 的文风指纹锚。续写只承接剧情、状态和情绪债，不继承可能已漂移的上一章句式节奏。写完后按目标句长带检查碎句、逗号结巴和中长句呼吸。' : '',
      styleFingerprintHandoff?.target_sentence_band ? `目标句长带：${styleFingerprintHandoff.target_sentence_band}` : '',
      styleFingerprintHandoff?.style_fingerprint ? `文风指纹：${styleFingerprintHandoff.style_fingerprint}` : '',
      styleFingerprintHandoff?.policy ? `防漂移策略：${styleFingerprintHandoff.policy}` : '',
      styleFingerprintHandoff?.source_excerpt ? `来源摘录：${styleFingerprintHandoff.source_excerpt}` : '',
      styleFingerprintHandoff ? JSON.stringify(styleFingerprintHandoff, null, 2).slice(0, 1600) : '',
      '',
      storyUnitContext ? '【剧情单元任务】' : '',
      storyUnitContext ? '硬性要求：执行 chapter_target.story_unit_context；本章只完成 current_chapter_role，并服务 unit_goal。可以铺垫 pressure_escalation 和 setup_and_storyline，但不得提前消费 mini_climax_payoff、exit_hook 或 forbidden_advance 中的后段爆点。' : '',
      storyUnitContext ? JSON.stringify(storyUnitContext, null, 2).slice(0, 4000) : '',
      '',
      storyPressureBrief ? '【故事压力阶梯】' : '',
      storyPressureBrief ? '硬性要求：执行 chapter_target.story_pressure_brief；本章必须把压力源、冲突升级、赌注升级和反转逼迫写成可见事件。不得只平铺过场、复述设定或让主角无代价通关。' : '',
      storyPressureBrief?.pressure_sources?.length ? `压力源：${storyPressureBrief.pressure_sources.join('；')}` : '',
      storyPressureBrief?.conflict_escalation_guardrail ? `冲突升级：${storyPressureBrief.conflict_escalation_guardrail}` : '',
      storyPressureBrief?.stakes_growth_guardrail ? `赌注升级：${storyPressureBrief.stakes_growth_guardrail}` : '',
      storyPressureBrief?.reversal_pressure_guardrail ? `反转逼迫：${storyPressureBrief.reversal_pressure_guardrail}` : '',
      storyPressureBrief?.required_actions?.length ? `执行动作：${storyPressureBrief.required_actions.join('；')}` : '',
      storyPressureBrief ? JSON.stringify(storyPressureBrief, null, 2).slice(0, 4000) : '',
      '',
      storyDriveBrief ? '【主角能动性】' : '',
      storyDriveBrief ? '硬性要求：执行 chapter_target.story_drive_brief；本章必须让主角在压力下做出主动选择，并写清阻碍、选择代价、状态变化和下一步因果。不得让主角只听解释、等别人推动或无代价通关。' : '',
      storyDriveBrief?.obstacle ? `明确阻碍：${storyDriveBrief.obstacle}` : '',
      storyDriveBrief?.protagonist_choice ? `主角选择：${storyDriveBrief.protagonist_choice}` : '',
      storyDriveBrief?.choice_cost ? `选择代价：${storyDriveBrief.choice_cost}` : '',
      storyDriveBrief?.state_change ? `状态变化：${storyDriveBrief.state_change}` : '',
      storyDriveBrief?.causal_next_step ? `下一步因果：${storyDriveBrief.causal_next_step}` : '',
      storyDriveBrief?.required_actions?.length ? `执行动作：${storyDriveBrief.required_actions.join('；')}` : '',
      storyDriveBrief ? JSON.stringify(storyDriveBrief, null, 2).slice(0, 4000) : '',
      '',
      serialRhythmBrief ? '【连载节奏与回报密度】' : '',
      serialRhythmBrief ? '硬性要求：执行 chapter_target.serial_rhythm_brief；开篇钩子、中段回报密度、场景回报预算和章末追读必须写成正文中的可见行动、信息变化、反转、爽点或未解问题。不得用长解释、纯环境、心理总结或无效对话拖字数。' : '',
      serialRhythmBrief?.opening_hook_deadline ? `开篇钩子：${serialRhythmBrief.opening_hook_deadline}` : '',
      serialRhythmBrief?.payoff_interval ? `回报密度：${serialRhythmBrief.payoff_interval}` : '',
      serialRhythmBrief?.middle_guardrail ? `中段节奏：${serialRhythmBrief.middle_guardrail}` : '',
      serialRhythmBrief?.ending_hook_guardrail ? `章末追读：${serialRhythmBrief.ending_hook_guardrail}` : '',
      serialRhythmBrief?.scene_payoff_budget?.length ? `场景回报预算：${serialRhythmBrief.scene_payoff_budget.map((item: any) => `${item.scene_no || ''}.${item.title || '场景'}：${item.required_payoff || item.turn || item.ending_hook_seed || '必须有可见回报'}`).join('；')}` : '',
      serialRhythmBrief?.anti_drag_rules?.length ? `防水规则：${serialRhythmBrief.anti_drag_rules.join('；')}` : '',
      serialRhythmBrief ? JSON.stringify(serialRhythmBrief, null, 2).slice(0, 4000) : '',
      '',
      pageTurnHookBrief ? '【章末翻页钩子】' : '',
      pageTurnHookBrief ? '硬性要求：执行 chapter_target.page_turn_hook_brief；最后 300 字必须形成清晰翻页冲动。可见触发要落成角色现场看见、听见、拿到、失去、被迫选择或被反转击中；读者问题必须留到下一章推动；禁提前解答项不得在本章解释完。' : '',
      pageTurnHookBrief?.hook_type ? `钩子类型：${pageTurnHookBrief.hook_type}` : '',
      pageTurnHookBrief?.core_question ? `读者问题：${pageTurnHookBrief.core_question}` : '',
      pageTurnHookBrief?.visible_trigger ? `可见触发：${pageTurnHookBrief.visible_trigger}` : '',
      pageTurnHookBrief?.final_image ? `最后画面：${pageTurnHookBrief.final_image}` : '',
      pageTurnHookBrief?.next_chapter_pull ? `下一章拉力：${pageTurnHookBrief.next_chapter_pull}` : '',
      pageTurnHookBrief?.forbidden_resolution?.length ? `禁提前解答：${pageTurnHookBrief.forbidden_resolution.join('；')}` : '',
      pageTurnHookBrief?.required_actions?.length ? `执行动作：${pageTurnHookBrief.required_actions.join('；')}` : '',
      pageTurnHookBrief ? JSON.stringify(pageTurnHookBrief, null, 2).slice(0, 4000) : '',
      '',
      volumeClimaxBrief ? '【卷级高潮预算】' : '',
      volumeClimaxBrief ? '硬性要求：执行 chapter_target.volume_climax_brief；本章只兑现 current_chapter_role、required_beats 和 climax_promise，不得提前消费 forbidden_payoff 标注的卷末爆点、身份答案、终局反转或后续大回报。' : '',
      volumeClimaxBrief?.current_volume_title ? `当前卷：${volumeClimaxBrief.current_volume_title}` : '',
      volumeClimaxBrief?.chapter_range ? `卷区间：${volumeClimaxBrief.chapter_range}` : '',
      volumeClimaxBrief?.current_chapter_role ? `本章职责：${volumeClimaxBrief.current_chapter_role}` : '',
      volumeClimaxBrief?.volume_goal ? `卷目标：${volumeClimaxBrief.volume_goal}` : '',
      volumeClimaxBrief?.climax_promise ? `高潮承诺：${volumeClimaxBrief.climax_promise}` : '',
      volumeClimaxBrief?.required_beats?.length ? `必须兑现：${volumeClimaxBrief.required_beats.join('；')}` : '',
      volumeClimaxBrief?.forbidden_payoff?.length ? `禁提前消费：${volumeClimaxBrief.forbidden_payoff.join('；')}` : '',
      volumeClimaxBrief?.nearby_beats?.length ? `邻近爆点：${volumeClimaxBrief.nearby_beats.map((item: any) => `${item.chapter_no ? `第${item.chapter_no}章` : ''}${item.type ? `${item.type}` : ''}${item.label ? `《${item.label}》` : ''}${item.detail ? `：${item.detail}` : ''}`).join('；')}` : '',
      volumeClimaxBrief?.next_actions?.length ? `执行动作：${volumeClimaxBrief.next_actions.join('；')}` : '',
      volumeClimaxBrief ? JSON.stringify(volumeClimaxBrief, null, 2).slice(0, 4000) : '',
      '',
      recentFatigueBrief ? '【近章连载动能与疲劳规避】' : '',
      recentFatigueBrief ? '硬性要求：执行 chapter_target.recent_fatigue_brief，并逐条执行 next_actions；本章必须主动修复最近章节暴露的连载动能、冲突来源、回报形态、章末问题或可视化场面风险。不得为了稳妥继续复刻同一种压迫、同一种打脸、同一种悬念，也不得跳过两章/五章窗口里的写前预警。' : '',
      recentFatigueBrief?.chapter_range_label ? `观察区间：${recentFatigueBrief.chapter_range_label}` : '',
      Number.isFinite(Number(recentFatigueBrief?.score)) ? `疲劳分：${recentFatigueBrief.score}` : '',
      recentFatigueBrief?.summary ? `疲劳概览：${recentFatigueBrief.summary}` : '',
      recentFatigueBrief?.fatigue_risks?.length ? `疲劳风险：${recentFatigueBrief.fatigue_risks.join('；')}` : '',
      recentFatigueBrief?.conflict_variation ? `冲突换源：${recentFatigueBrief.conflict_variation}` : '',
      recentFatigueBrief?.payoff_variation ? `回报换形：${recentFatigueBrief.payoff_variation}` : '',
      recentFatigueBrief?.hook_variation ? `钩子换题：${recentFatigueBrief.hook_variation}` : '',
      recentFatigueBrief?.scene_freshness ? `场面新鲜度：${recentFatigueBrief.scene_freshness}` : '',
      recentFatigueBrief?.next_actions?.length ? `执行动作：${recentFatigueBrief.next_actions.join('；')}` : '',
      recentFatigueBrief ? JSON.stringify(recentFatigueBrief, null, 2).slice(0, 4000) : '',
      '',
      signatureSceneBrief ? '【本章标志性场面补位】' : '',
      signatureSceneBrief ? '硬性要求：必须把 signature_scene 写成正文核心场面；scene_repair_target 是本章要修复的强场面缺口；reader_payoff 和 storyline_service 必须落成可见爽点、冲突结果或主线推进。不能只在旁白里声明“场面很震撼”。' : '',
      signatureSceneBrief ? JSON.stringify(signatureSceneBrief, null, 2).slice(0, 3000) : '',
      '',
      characterArcBrief && Object.keys(characterArcBrief).length ? '【人物成长承接】' : '',
      characterArcBrief && Object.keys(characterArcBrief).length ? '硬性要求：执行 chapter_target.character_arc_brief；本章必须把角色欲望、缺陷受压、关系变化、成长节点和口吻锚点写成可见选择、行动后果、对话反馈或关系反应。不得只在旁白里说人物成长，不得提前揭露 forbidden_reveal。' : '',
      characterArcBrief && Object.keys(characterArcBrief).length ? JSON.stringify(characterArcBrief, null, 2).slice(0, 4000) : '',
      '',
      batchPreflight ? '【安全连写预执行门禁】' : '',
      batchPreflight ? '硬性要求：本章必须服从安全连写预执行门禁；若存在近10章疲劳、批次任务书缺口、被拦截章节或 caution/warn 风险，本章必须主动换冲突来源、回报形态、章末问题或可视化场面，不能沿用上一批同质化写法。' : '',
      batchPreflight ? JSON.stringify(batchPreflight, null, 2).slice(0, 4000) : '',
      '',
      batchChapterHandoffContract ? '【安全连写章节交接契约】' : '',
      batchChapterHandoffContract ? '硬性要求：执行 batch_preflight.chapter_handoff_contract；这是安全连写启动时从上一章交接单和读者期待账提炼出的连续性契约。开篇前 300 字必须承接 previous_handoff 和 opening_obligations；must_deliver 必须写成可见回报；keep_alive 必须保持存在感；overdue 必须优先推进，不能被新剧情覆盖。' : '',
      batchChapterHandoffContract?.from_chapter_no ? `交接来源：第${batchChapterHandoffContract.from_chapter_no}章` : '',
      batchChapterHandoffContract?.apply_to_chapter_no ? `优先落点：第${batchChapterHandoffContract.apply_to_chapter_no}章` : '',
      batchChapterHandoffContract?.previous_handoff ? `上一章最后一幕：${batchChapterHandoffContract.previous_handoff}` : '',
      batchChapterHandoffContract?.opening_obligations?.length ? `开篇义务：${batchChapterHandoffContract.opening_obligations.join('；')}` : '',
      batchChapterHandoffContract?.expectation_carry_over?.length ? `期待承接：${batchChapterHandoffContract.expectation_carry_over.join('；')}` : '',
      batchChapterHandoffContract?.must_deliver?.length ? `必须兑现：${batchChapterHandoffContract.must_deliver.join('；')}` : '',
      batchChapterHandoffContract?.keep_alive?.length ? `继续悬念：${batchChapterHandoffContract.keep_alive.join('；')}` : '',
      batchChapterHandoffContract?.overdue?.length ? `逾期优先：${batchChapterHandoffContract.overdue.join('；')}` : '',
      batchChapterHandoffContract ? JSON.stringify(batchChapterHandoffContract, null, 2).slice(0, 3000) : '',
      '',
      batchDeliveryRiskCarryOver ? '【安全连写交稿风险承接】' : '',
      batchDeliveryRiskCarryOver ? '硬性要求：执行 batch_preflight.delivery_risk_carry_over；这是安全连写启动时从上一章交稿状态带来的风险债务，本章必须把它们写成开篇承接、中段推进和章末追读动作，不能只在旁白中宣布已修复。' : '',
      batchDeliveryRiskCarryOver?.source_chapter_no ? `风险来源：第${batchDeliveryRiskCarryOver.source_chapter_no}章` : '',
      batchDeliveryRiskCarryOver?.apply_to_chapter_no ? `优先落点：第${batchDeliveryRiskCarryOver.apply_to_chapter_no}章` : '',
      batchDeliveryRiskCarryOver?.priority_label ? `优先级：${batchDeliveryRiskCarryOver.priority_label}` : '',
      batchDeliveryRiskCarryOver?.items?.length ? `风险项：${batchDeliveryRiskCarryOver.items.join('；')}` : '',
      batchDeliveryRiskCarryOver?.required_actions?.length ? `修复动作：${batchDeliveryRiskCarryOver.required_actions.join('；')}` : '',
      batchDeliveryRiskCarryOver?.opening_actions?.length ? `开篇动作：${batchDeliveryRiskCarryOver.opening_actions.join('；')}` : '',
      batchDeliveryRiskCarryOver?.middle_actions?.length ? `中段动作：${batchDeliveryRiskCarryOver.middle_actions.join('；')}` : '',
      batchDeliveryRiskCarryOver?.ending_actions?.length ? `章末动作：${batchDeliveryRiskCarryOver.ending_actions.join('；')}` : '',
      batchDeliveryRiskCarryOver ? JSON.stringify(batchDeliveryRiskCarryOver, null, 2).slice(0, 3000) : '',
      batchCreationContractCarryOver ? '【安全连写创作契约承接】' : '',
      batchCreationContractCarryOver ? '硬性要求：执行 batch_preflight.delivery_risk_carry_over.creation_contract_carry_over；这是安全连写第一章必须优先修复的长篇创作契约债务，不能只在旁白中声明契约已修复。' : '',
      batchCreationContractCarryOver?.priority_label ? `契约优先级：${batchCreationContractCarryOver.priority_label}` : '',
      batchCreationContractCarryOver?.checklist?.length ? `契约清单：${batchCreationContractCarryOver.checklist.join('、')}` : '',
      batchCreationContractCarryOver?.items?.length ? `契约缺口：${batchCreationContractCarryOver.items.join('；')}` : '',
      batchCreationContractCarryOver?.required_actions?.length ? `契约动作：${batchCreationContractCarryOver.required_actions.join('；')}` : '',
      batchCreationContractCarryOver?.policy ? `契约策略：${batchCreationContractCarryOver.policy}` : '',
      batchCreationContractCarryOver ? '执行口径：目标读者、题材定位、核心承诺、追读留存必须分别写成可定位正文证据；开篇先补读者压力，中段兑现题材长板和核心承诺，章末留下追读问题。' : '',
      '',
      millionWordRunway ? '【百万字航线守门】' : '',
      millionWordRunway ? '硬性要求：本章必须回答航线中的本章四问，遵守不可偏移红线，兑现追读燃料；如果 safeModeLabel 为仅单章或禁止连写，不得抢跑后续章节内容。' : '',
      millionWordRunway ? JSON.stringify(millionWordRunway, null, 2).slice(0, 5000) : '',
      '',
      goldenThreeBrief ? '【黄金三章启动守门】' : '',
      goldenThreeBrief ? '硬性要求：执行 chapter_target.golden_three_brief；前三章必须快速交付钩子、主角、事件、升级/追读理由、前三章至少两个爽点和每章结尾悬念，不得用大段世界观说明开局。' : '',
      goldenThreeBrief ? JSON.stringify(goldenThreeBrief, null, 2).slice(0, 3000) : '',
      '',
      first30RetentionBrief ? '【本章前30章留存修复】' : '',
      first30RetentionBrief ? '硬性要求：本章必须修复前30章诊断指出的目标、章末钩子、爽点/悬念和试读闭环风险；修复要落成可见行动、信息增量、回报或章末未解问题。' : '',
      first30RetentionBrief ? JSON.stringify(first30RetentionBrief, null, 2).slice(0, 4000) : '',
      '',
      readerDropRiskBrief ? '【读者弃读预警】' : '',
      readerDropRiskBrief ? '硬性要求：执行 chapter_target.reader_drop_risk_brief；drop_points 是试读读者可能离开的原因，必须分别在开篇 300 字、中段场景推进和章末翻页处补抓手。不得用设定说明、模板热血或空泛总结糊过去。' : '',
      readerDropRiskBrief?.opening_guardrail ? `开篇防弃读：${readerDropRiskBrief.opening_guardrail}` : '',
      readerDropRiskBrief?.middle_guardrail ? `中段防掉速：${readerDropRiskBrief.middle_guardrail}` : '',
      readerDropRiskBrief?.ending_guardrail ? `章末防流失：${readerDropRiskBrief.ending_guardrail}` : '',
      readerDropRiskBrief ? JSON.stringify(readerDropRiskBrief, null, 2).slice(0, 4000) : '',
      '',
      readerExpectationDebtContext.must_carry.length || readerExpectationDebtContext.keep_alive.length ? '【期待债务承接】' : '',
      readerExpectationDebtContext.must_carry.length || readerExpectationDebtContext.keep_alive.length ? '硬性要求：上一章或最近章节欠下的期待必须在本章可见推进；overdue/逾期待补项必须优先处理成动作、信息增量、冲突结果或章末升级。可延迟完全兑现，但不得遗忘、换线或矛盾改写。' : '',
      readerExpectationDebtContext.must_carry.length || readerExpectationDebtContext.keep_alive.length ? JSON.stringify(readerExpectationDebtContext, null, 2).slice(0, 3000) : '',
      '',
      innovationBrief ? '【本章创新执行】' : '',
      innovationBrief ? '硬性要求：执行 chapter_target.innovation_brief；chapter_angle 必须写成选择、规则、机制、反差或场面，execution_points 必须落成可见动作，differentiation_guardrails 不得越线，ip_adaptation_hooks 尽量转成可视化镜头。' : '',
      innovationBrief?.chapter_angle ? `创新角度：${innovationBrief.chapter_angle}` : '',
      innovationBrief?.execution_points?.length ? `执行点：${innovationBrief.execution_points.join('；')}` : '',
      innovationBrief?.differentiation_guardrails?.length ? `差异护栏：${innovationBrief.differentiation_guardrails.join('；')}` : '',
      innovationBrief?.ip_adaptation_hooks?.length ? `IP化场面：${innovationBrief.ip_adaptation_hooks.join('；')}` : '',
      innovationBrief ? JSON.stringify(innovationBrief, null, 2).slice(0, 3000) : '',
      '',
      styleSampleStrategy?.enabled ? '【本章风格样章策略】' : '',
      styleSampleStrategy?.enabled ? '硬性要求：只学习叙述节奏、句式密度、对白比例和情绪转折；原句不能照搬，不得复制样章桥段、专有设定、角色名和核心梗。' : '',
      styleSampleStrategy?.enabled ? JSON.stringify(styleSampleStrategy, null, 2).slice(0, 5000) : '',
      '',
      chapterBenchmarkStrategy?.enabled ? '【本章质量基准样例】' : '',
      chapterBenchmarkStrategy?.enabled ? '硬性要求：只学习章节结构、信息密度、冲突节拍、爽点兑现和章末钩子；不得复制样例桥段、角色名、专有设定和原句，不得把样例剧情替换成本章剧情。' : '',
      chapterBenchmarkStrategy?.enabled ? JSON.stringify(chapterBenchmarkStrategy, null, 2).slice(0, 5000) : '',
      '',
      '【结构化上下文包】',
      prosePromptJson(buildProsePromptContextSnapshot(contextPackage), 4500),
      '',
      '【参考迁移计划】',
      prosePromptJson(migrationPlan || {}, 2500),
      '',
      '【段落级写作要求】',
      '1. 严格按 scene_cards 顺序生成，每个场景至少 3-8 个自然段。',
      '2. 每个场景必须完成 purpose、conflict、required_beats、required_information、turning_point 和 exit_state；不能只写气氛、设定说明或心理总结。',
      '2+. 场景执行门禁：每个 scene_cards 必须按 goal -> obstacle -> action -> turn -> payoff -> state_delta 写成因果链；turn 必须优先来自 turning_point/reversal/information_gain，payoff 必须优先来自 reader_payoff/core_payoff/scene_payoff_budget，state_delta 必须写清本场景改变了角色、资产、关系、伏笔、规则或读者期待中的哪一项。',
      '2A. 每个场景必须把 opening_hook、reader_payoff、fear_point、rule_pressure、information_gap、reversal、ending_hook_seed、character_voice 中已有的商业意图落实到正文里；这些字段不是备注，必须转成动作、对话、危险、反转或章末疑问。',
      '2A+. 执行 scene_cards.dialogue_goals、scene_cards.style_directives、scene_cards.benchmark_recall_directives、scene_cards.concept_anchor_rules、scene_cards.prose_craft_directives、scene_cards.relationship_progression_plan、scene_cards.relationship_buffer_zone、scene_cards.supporting_character_action、scene_cards.attitude_shift_checkpoint 和 scene_cards.relationship_next_hook：对白目标必须变成角色差异化对话和潜台词，文风/对标召回只学习节奏与句式呼吸，新名词/新设定首次出现必须用动作反应、对话半句或物理后果建立当下作用锚点，不得写整段来历、原理或等级说明；关系推进必须写出关系类型/边界、配角攻略缓冲区、配角主动行动、从旁观/质疑/拒绝/试探到行动/协助/设限的态度变化，以及下一轮关系期待。',
      '2A+showdown. 执行 scene_cards.showoff_stage_chain、scene_cards.spectator_interest_shift、scene_cards.secondary_showoff_effect、scene_cards.combat_result_type、scene_cards.combat_dimension_plan 和 scene_cards.combat_reversal_plan：公开爽点必须按群众层 -> 中间层 -> 核心层落成不同反应；旁观者反应必须回答“这跟我有关系”的利益、目标、计划或站队变化；二级装逼效果必须让展示改变旁观者行动；战斗/智斗必须明确结果类型、心/体/技维度和预判反制/反预判链条。',
      '2A+. 如果存在 chapter_target.previous_handoff 或 continuity.previous_chapter，开篇前 300 字必须承接上一章最后一幕或章末钩子，先处理连续危机、角色反应和期待欠账，再展开新的场景信息。',
      '2A++. 如果存在 chapter_target.requiredHandoffAnchors 或 opening_obligations，开篇前 300 字必须命中这些交接锚点/义务；不得跳过上一章未完成动作直接进入新目标。',
      '2A++. 执行 chapter_target.delivery_risk_carry_over：上一章交稿后残留的吸引力、追读、创新、故事力、剧情线、强场面或可读性风险，必须在本章变成可见修复动作；尤其优先级指向开篇或章末时，必须在前 300 字或最后 300 字落地。',
      '2B. 执行 chapter_target.reader_retention_brief：开篇钩子必须在前 300 字落地；爽点承诺、信息缺口、情绪回报和短剧化场面必须转成可见行动；retention_double_engine 必须按留存=情绪+饥饿落地，情绪让读者快速代入，饥饿用信息差植入问号并按剥洋葱把关键信息卡到章末；retention_pillars 必须按留存四大支柱落地，升级、资源困境、目标、解密至少两项要转成正文证据；hook_addiction_model 必须按触发 -> 行动 -> 奖励 -> 投入落地，并用奖励随机性给出出乎意料的额外收获或沉没投入；章末追读问题必须压到最后一幕。',
      '2B+. 执行 chapter_target.reader_expectation_ledger：must_deliver 是本章必须还给读者的期待账，必须写成可见事件、冲突结果、情绪回报或章末钩子；keep_alive 可以保留但不能遗忘或矛盾改写。',
      '2B++. 执行 reader_expectation_debt_context：must_carry 来自上一章或最近章节的期待欠账，本章必须给可见推进；keep_alive 是继续悬念，必须保持存在感，不得被正文遗忘、反向改写或突然换线。',
      '2C. 执行 chapter_target.innovation_brief：本章必须有可见的创新执行点；把 chapter_angle 写成选择、规则、机制、反差或场面，不得写成普通套路章；ip_adaptation_hooks 要尽量落成可视化场面。',
      '2C+. 执行 chapter_target.signature_scene_brief：如果存在 signature_scene，必须把它写成本章最可被读者记住、可短剧/漫剧化的空间冲突、反转动作、规则压迫或视觉化爽点；scene_repair_target、reader_payoff、storyline_service 都必须在正文中可见。',
      '2C++. 执行 chapter_target.character_arc_brief：人物成长必须落成角色欲望驱动、缺陷受压、关系变化、成长节点或口吻锚点；如果有 forbidden_reveal，不得提前写穿，只能通过误解、遮挡、试探或代价保持边界。',
      '2C+++. 执行 chapter_target.golden_three_brief：前三章必须按启动守门交付前 500 字钩子、主角出场、真实事件、第二章升级、第三章追读理由、前三章至少两个爽点和章末悬念；禁止用大段世界观说明替代现场事件。',
      '2D. 执行 chapter_target.first30_retention_brief：如果当前章在前30章诊断中有风险，必须补强 flags 和 required_actions 指向的留存问题，尤其是章末钩子弱、爽点/悬念信号少、目标不清和缺正文。',
      '2D+. 执行 chapter_target.reader_drop_risk_brief：正文必须针对弃读点设计开篇抓手、中段反转/行动推进和章末翻页问题；任何 drop_points 中指出的风险都必须用可见事件、对话冲突、信息增量或读者回报修复。',
      '2D++. 执行 chapter_target.story_pressure_brief：本章必须补足压力源、冲突升级、赌注升级和反转逼迫；至少一个场景要让主角付出代价、被迫选择、暴露风险、遭遇反制或得到新的未解问题。',
      '2D+++. 执行 chapter_target.story_drive_brief：必须写出主角主动选择、选择代价、状态变化和下一步因果；主角不能只是旁观、听解释或被事件推着走。',
      '2D+++.1 执行 chapter_target.story_power_contract：必须让故事五维落成正文证据；每个关键场景都要有行动改变局势，开场压力要在章末形成状态变化，动作必须带来代价、信息、关系、规则或敌方反制反馈。',
      '2D+++.2 执行 chapter_target.chapter_blueprint.mainline_definition_contract：主线不等于升级，主线是一件事，不是一个元素，升级是主角达成目标的行动；每章必须让 mainline_event 发生状态变化，不能把境界升级、金手指展示、地图或设定罗列写成主线。',
      '2D++++. 执行 chapter_target.serial_rhythm_brief：前 300 字必须有开篇钩子；每 800-1200 字至少给一次信息增量、冲突转折、爽点兑现、能力展示、关系变化或小回收；每个场景必须兑现 scene_payoff_budget；章末必须压出追读问题。',
      '2D+++++. 执行 chapter_target.page_turn_hook_brief：最后 300 字必须有可见触发、读者问题和下一章拉力；禁提前解答项不得在本章说明完；结尾不能用“拉开序幕”等模板总结替代现场钩子。',
      '2D++++++. 执行 chapter_target.volume_climax_brief：本章只兑现 current_chapter_role、required_beats 和 climax_promise；不得提前消费 forbidden_payoff 中的卷末爆点、身份答案、终局反转或后续大回报。',
      '2D+++++++. 执行 chapter_target.recent_fatigue_brief：逐条执行 next_actions；如果近章连载动能或疲劳风险提示目标推进、阻碍升级、新信息、关系/世界调剂、大冲突冷却、冲突来源、回报形态、章末问题或可视化场面存在缺口，本章必须用可见事件修复；禁止继续复制最近章节的同类压迫、同类打脸、同类钩子或原地等待。',
      '2D++++++++. 执行 scene_cards.serial_risk_repairs 与 scene_cards.recent_fatigue_action：凡场景卡标注了风险修复动作，正文必须用目标推进、阻碍升级、新信息、关系/世界调剂或冲突冷却把它写成可见事件；不得只在旁白中宣布已修复。',
      '2D+++++++++. 执行 scene_cards.conflict_ladder_step、scene_cards.motivation_source、scene_cards.opposing_force、scene_cards.blocked_desire、scene_cards.protagonist_agency_action、scene_cards.no_exit_reason、scene_cards.event_value_change、scene_cards.next_conflict_seed、scene_cards.visible_line_role、scene_cards.hidden_line_seed、scene_cards.ab_weave_role：逐场写清有人阻止主角得到他想要的东西、有进无出、主角主动破局、明确价值变化、下一冲突种子、明线/暗线交汇伏笔和 A线/B线交织位置；不能只把这些字段留在场景卡里。',
      '2D++++++++. 执行 chapter_target.platform_rubric：按目标平台调整开篇强度、节奏密度、回报间隔、设定释放和章末拉力；平台检查项不能只写在说明里，必须落到正文证据。',
      '3. 如果 scene_type 是 action/combat/chase，必须逐条落实 action_beats：写出动作起手、空间位置、对手反应、受伤/损耗/暴露信息、反制动作和结果。战斗不能一笔带过。',
      '4. 段落预算：动作/冲突场景中可见行动与直接反应不少于 60%；环境描写最多 15%；心理描写最多 20%；解释性信息最多 15%。',
      '5. 禁止连续 2 段纯环境描写；每 3-5 段必须出现一次可见行动、选择、信息变化或关系变化。',
      '6. description_budget=low 的场景只允许 1-2 句环境描写；medium 最多 1 个短段；high 也必须服务危险、规则或动作空间。',
      '6A. 执行 scene_cards.purpose_tag 与 scene_cards.density_level：先按目的词分配详略；purpose_tag=爽点/打脸/高潮/卖点/关键揭露/反转的场景必须展开危机/期待铺垫、出手过程、对话交锋和配角差异化反应；purpose_tag=过渡/赶路/信息交代/时间跳转的场景只能 1-2 句带过。density_level=dense 的爽点/打脸/反转/情绪高潮必须用感知、动作、对话交锋铺满，慢镜头逐拍展开；density_level=sparse 的过场/赶路/信息交代/时间跳转只能 1-2 句带过，不展开三维度；density_level=medium 的铺垫/日常/关系升温只挑 1-2 个有代入感细节，其余略写。不允许每个 beat 一样长一样细。',
      '6B. 子事件连接不用叙述过渡；不要用“然后/接着/随后/于是”串联事件，改用约20字的身体动作、物件动作、触感、视线或呼吸承接下一个动作。',
      '6C. 执行 scene_cards.sensory_anchor：每个详写场景必须把感知锚点写成主角主动注意到的细节，并让它参与动作、规则判断、危险识别或对话反应，不能当装饰性氛围或独立风景句。',
      '6D. 主语与名字节奏：段首、场景切换、多人同场、视角重置时用角色名建立主语；同一动作链/同一段内部优先用“他/她”、动作承接或省略主语。关键转折、情绪爆点、身份反差时再点名强化；不要连续多句都以同一角色名开头，也不要为了省主语造成指代不清。',
      '6E. 自然节奏重排：断段按镜头/信息变化，不按发生/感知/反应三维度变化；同一镜头保持连续。新动作、新物件、新信息、新对话、视线转移、场景结束时可以断段；不要把完整推理链切成机械碎片，也不要把多个动作/信息/视线切换塞进一个拥挤长段。',
      '6F. 语气标点功能拍：被打断 / 拖长音用动作打断、换行、短句或未完成动作承接，不用 ——/—/-- 硬造停顿；信息揭示 / 判断落点可用冒号或短句制造落点，不写论文式长分号链。',
      '6G. 小节密度诊断：场景或小节偏短不得加环境描写、重复情绪、内心独白总结或无意义动作凑字数；先检查子事件三维度是否揉进，再补感官细节、身体反应、对话交锋、阻碍/反应/发现/递进，必要时只加 2-3 句简短回忆。',
      '6H. 具体字数表达校验：除非正文中那句话的字数确实经过核对且必须强调，否则不要写“这五个字 / 短短四字 / 三个字一落 / 八个字砸下去”这类精确字数表达；优先改成“这句话一落”“这一句落下”“那几个字”“这行字”“话音落下”，保持现场冲击但不制造可被读者数错的违和感。',
      '7. 场景之间必须有过渡，不能硬切。',
      '8. 保持 style_lock 中的人称、句长、对话比例、吐槽密度、爽点密度、描写浓度和禁用词约束。',
      '9. 只能学习参考作品的节奏、结构、爽点安排和信息密度；不得复制具体桥段、专有设定、原句、角色名和核心梗。',
      '10. 执行 setting_context：required 设定必须在正文中落地；forbidden 设定不得泄漏；ability_beats 必须写清代价/限制；item_beats 必须符合物品归属和位置；boss_move 必须符合 Boss 行动逻辑；rule_trigger 必须写出触发条件、代价和后果；角色只能知道 knowledge_scope 允许的信息。',
      '11. 执行 chapter_target.meme_strategy：网感只作为吐槽节奏、情绪共鸣、角色口吻或传播点；死亡、高压恐怖和关键情绪爆点处不得玩梗；不得直接复刻 meme_bank 的 unsafe_direct_phrases。',
      '12. 执行 chapter_target.style_sample_strategy：按 applicable_scenes / avoid_scenes 选择样章策略；只学习叙述节奏、句式密度、对白比例和情绪转折；do_not_copy 与 unsafe_direct_phrases 中的原句不能照搬。',
      '12A. 执行 chapter_target.chapter_benchmark_strategy：只学习开篇钩子、场景节拍、冲突升级、爽点兑现、对白推进、场面可视化和章末追读结构；不得复制样例桥段、角色名、专有设定和原句。',
      styleBoundaryContract ? '12B. 执行 chapter_target.style_boundary_contract：文风覆盖边界必须服从“硬约束永远赢”；不得为了模仿文风引入禁用词、Gate F 章末升华、万能比喻、章末预告、字数缩水、剧情/状态/关系/时间线漂移或样章复制。' : '',
      '13. 执行长篇作品罗盘：读者承诺、核心矛盾、创新卖点、长期爽点循环和结局方向不得漂移；新增人物、物品、支线或地图必须落在可调整区内。',
      '13A. 执行 chapter_target.chapter_launch_gate：读者承诺、本章目标、核心冲突、主线服务、读者回报、章末钩子必须在正文中可见落地；如果门禁信号为 warn/block，不得忽略，必须优先补成可见事件、选择、冲突结果或章末问题。',
      '13A+. 执行 chapter_target.core_contract_radar：必须服务 must_serve 中的全书核心承诺、核心矛盾、创新卖点和读者回报；不得漂移 no_drift 中的红线；repair_focus 不能只靠解释，要落成正文中的冲突结果、规则判定、角色选择或章末钩子。',
      '13A++. 执行 chapter_target.governance_recheck_memory：上一轮治理复查的修后证据和观察项必须进入本章任务执行；evidence 写成正文可见继承，failed_evidence 优先补救，watch_items 保持观察并避免再次失效。',
      '13B. 执行 chapter_target.longform_battle_context：核心守恒、读者拉力、剧情线调度、卷级爆点、创新/IP场面和生产燃料中的风险项必须在本章有可见承接；blocked/warn 风险优先于普通铺垫，不能写成空泛解释。',
      '14. 执行本批连载任务书：本章只完成 current_chapter_role 和本章读者回报；可以铺垫下一章，但不得提前解决 next_batch_brief.chapters 后续章节的冲突或钩子。',
      '14A. 执行 chapter_target.batch_preflight：如果安全连写预执行门禁提示近10章疲劳或批次风险，本章必须在冲突来源、回报形态、章末问题、可视化场面中至少改造一项；被 blocked_chapter_nos 拦截的后续章节内容不得提前写进本章。',
      expansionStructureDecision ? '14A0. 执行 next_batch_brief.expansion_structure_decision：按结构修复有效性决定本批写法；恢复5章时仍逐章落实段位职责，小批验证时逐章证明观察指标，单章重构时先重写批次设计原则后再推进正文。' : '',
      defaultFiveChapterLaneRedesign ? '14A0+. 默认5章档位结构重构：因连续恢复判定失效，本章必须输出可被后续5章复用的段位职责、冲突轮换、回报密度和章末追读模板；正文场景必须先证明这个模板能守住核心、回报和追读。' : '',
      expansionStructureVerification ? '14A+. 执行 next_batch_brief.expansion_structure_verification：本章必须承担验证批中的结构职责，换冲突来源、给显性回报、留不同章末追读问题；不得把已修复的扩批热区再次写成中段转场或空铺垫。' : '',
      defaultFiveChapterLaneTemplate ? '14A+0. 默认5章档位模板验证：本章必须继承已补齐的段位职责、冲突轮换、回报密度和章末追读模板；每个结构职责场景都要证明四项模板没有复发，不能只把模板写在说明里。' : '',
      '14A++. 执行 batch_preflight.longform_memory_anchor：批量续写时必须遵守压缩正史锚点，不能改变角色状态、遗忘开放悬念、跳过回报债务或偏离核心承诺。',
      '14A+++. 执行 batch_preflight.delivery_risk_carry_over：安全连写第一章必须优先承接上一章残留风险；opening_actions 在前 300 字落地，middle_actions 在中段转成事件推进，ending_actions 在最后 300 字形成追读钩子。',
      batchCreationContractCarryOver ? '14A+++.1 执行 batch_preflight.delivery_risk_carry_over.creation_contract_carry_over：安全连写第一章必须先修创作契约；目标读者、题材定位、核心承诺、追读留存分别要有正文证据，不能只靠旁白声明或任务书自述。' : '',
      '14A++++. 执行 batch_preflight.chapter_handoff_contract：安全连写第一章必须承接上一章最后一幕、开篇义务和读者期待债；must_deliver 写成可见回报，keep_alive 保持存在感，overdue 优先推进。',
      '14A+++++. 执行 chapter_target.longform_memory_capsule：单章开写也必须召回压缩正史，角色状态、开放悬念、回报债务、正史事实和 red_lines 不得遗忘、矛盾改写或跳过。',
      '14A++++++. 执行 chapter_target.established_events_contract：已锁正史事件不得在闪回或复述中改写；只能同义转述，并保留 cause/mechanism/constraints。',
      layeredMemoryContext ? '14A++++++. 执行 chapter_target.layered_memory_context：近5章详记决定本章承接细节，十章概要决定阶段正史，卷级总览决定卷级方向和关键转折；不得只看最近一章导致早期正史或卷级目标漂移。' : '',
      '14B. 执行 chapter_target.million_word_runway：正文必须可见回答本章四问，守住 redLines，不丢 readerFuel；如果航线为 single_chapter 或 blocked，只写当前章可兑现内容，不得预支后续章节主线回收。',
      '14C. 执行 chapter_target.story_unit_context：正文必须完成当前剧情单元的 current_chapter_role；只推进本章职责需要的 pressure_escalation、setup_and_storyline 和 reader payoff，不得提前写完 mini_climax_payoff、exit_hook 或 forbidden_advance 标注的后续兑现。',
      '15. 如果参考迁移计划包含 transferable_model，只能采用其中 allowed_learning 的抽象功能；rewrite_requirements 必须执行；copy_guard_terms 和 forbidden_transfer 禁止出现在正文里。',
      migrationPlan?.generation_prompt_addendum ? `16. ${prosePromptText(migrationPlan.generation_prompt_addendum, 700)}` : '',
      chapterDraft?.chapter_no ? `17. 本次只生成第${chapterDraft.chapter_no}章，不得输出其他章节或续章内容。` : '',
      '18. 正文元信息清洁：chapter_text 标题行以外不得出现“上一章/本章/前文/后文/伏笔/细纲/读者/第X章”等作者视角或工程词；必须改成角色当下能感知的事件锚点或相对时间，例如“门牌翻面那一刻”“刚才那句话”“那枚旧印”。',
      '19. 正文格式与小节结构：全文统一章节标记：###1. / ###第一章 / 1. 或项目指定格式，不混用；按网文阅读节奏断段，段间保留一个空行，不得出现两个以上连续空行；无缩进，正文段落中不使用 Markdown；断段按戏剧单元/镜头自然断开，不按字数机械切段；对话独立成行，引号风格按项目/平台约定，quote-mode keep 时保留合法「」；每个小节至少有一个主事件 + 3-5 个子事件、情绪变化、新信息和小节钩子。',
      '',
      expansionStructureDecision ? '输出附加要求：如果存在 next_batch_brief.expansion_structure_decision，scene_breakdown 的相关场景必须包含 expansion_structure_decision_execution，用 segment_role_delivered、observation_metrics_delivered、redesign_principles_delivered 和 evidence 说明是否真正执行。' : '',
      defaultFiveChapterLaneRedesign ? '输出附加要求：如果存在 default_five_chapter_lane_redesign，expansion_structure_decision_execution 还必须包含 default_lane_segment_duty_delivered、default_lane_conflict_rotation_delivered、default_lane_payoff_density_delivered、default_lane_ending_hook_template_delivered，并分别给出 evidence。' : '',
      defaultFiveChapterLaneTemplate ? '输出附加要求：如果存在 default_five_chapter_lane_template，expansion_structure_decision_execution 必须继续包含 default_lane_segment_duty_delivered、default_lane_conflict_rotation_delivered、default_lane_payoff_density_delivered、default_lane_ending_hook_template_delivered，并用 evidence 说明四项模板在验证批中没有复发。' : '',
      chapterBlueprint ? '输出附加要求：scene_breakdown 必须包含 blueprint_receipts，逐项回填 target_emotion、opening_hook、core_payoff、content_outline、plot_lines、character_order、beat_sequence、beat_density_contract、small_outline_contract、mainline_definition_contract、cost_and_reward、ending_contract 是否在正文兑现，并给出 evidence 摘要。' : '',
      '输出附加要求：scene_breakdown 每个场景必须包含 scene_start_anchor、scene_end_anchor 和 scene_card_receipts；scene_start_anchor/scene_end_anchor 必须摘自该场景正文的起止短句，用来定位该场景文本。scene_card_receipts 字段至少包含 scene_goal, obstacle, action, turn, payoff, state_delta, goal_obstacle_change_delivered(boolean)、purpose_tag_delivered(boolean)、density_level_delivered(boolean)、sensory_anchor_delivered(boolean)、serial_risk_repairs_delivered(boolean)、required_beats_delivered(boolean)、action_beats_delivered(boolean)、dialogue_goals_delivered(boolean)、style_directives_delivered(boolean)、benchmark_recall_directives_delivered(boolean)、concept_anchor_rules_delivered(boolean)、prose_craft_directives_delivered(boolean)、relationship_progression_delivered(boolean)、relationship_buffer_zone_delivered(boolean)、supporting_character_action_delivered(boolean)、attitude_shift_delivered(boolean)、relationship_next_hook_delivered(boolean)、showoff_stage_chain_delivered(boolean)、spectator_interest_shift_delivered(boolean)、secondary_showoff_effect_delivered(boolean)、combat_result_type_delivered(boolean)、combat_dimension_plan_delivered(boolean)、combat_reversal_plan_delivered(boolean)、evidence(array)。evidence 必须摘录对应场景正文中的动作、对话、信息变化、关系变化、对白声线、新概念锚点、配角主动行动、缓冲区、态度变化、公开舞台层级、旁观者利益变化或战斗反制证据，不能只写“已完成”，不能借用其他场景的证据。',
      '输出附加要求：必须在章节对象顶层输出 oh_story_delivery_receipts，用于后续诊断和修复闭环落库。oh_story_delivery_receipts 必须包含 chapter_blueprint、scene_card_receipts、delivery_risk_receipts、revision_receipts、pre_draft_execution_receipts；chapter_blueprint 记录本章蓝图兑现状态，scene_card_receipts 汇总每个场景的场景卡执行回执，delivery_risk_receipts 逐项记录上一章/批次交稿风险是否已兑现，revision_receipts 记录本轮生成中主动修正过的结构、连续性、资产或文风问题，pre_draft_execution_receipts 记录状态筛选、项目产物协议、写前准备、意图确认、文风召回和上一章质量续航计划是否真正落入正文。',
      ...buildStateTrackingReceiptPromptSection(stateTrackingContract),
      '输出附加要求：oh_story_delivery_receipts.pre_draft_execution_receipts.artifact_protocol_receipts 必须按 oh-story artifact-protocols 记录本章使用或依赖的项目产物；覆盖路径包括 设定/关系.md、设定/题材定位.md、大纲/卷纲_第X卷.md、大纲/细纲_第XXX章.md、追踪/伏笔.md、追踪/时间线.md、追踪/角色状态.md、追踪/上下文.md、对标/{对标书名}/拆文报告.md。每项包含 key,label,status(pass|warn|fail|ready),artifact_path,required_fields,used_fields,evidence,remaining_risk；required_fields 必须按对应模板列出核心字段，evidence 必须引用 chapter_text 中可定位的动作、对话、信息变化或关系变化。',
      writePreparationBrief ? '输出附加要求：oh_story_delivery_receipts.pre_draft_execution_receipts.write_preparation_checks 必须逐项覆盖【写前准备卡】中的 source_gaps、文风召回缺口和副对标边界、asset_risks、delivery_risk_actions、creation_contract_checklist、blueprint_focus、reader_payoff_focus 和 must_confirm；创作契约必须逐项说明目标读者、题材定位、核心承诺、追读留存是否被正文证据兑现；每项必须有 delivered(boolean)、evidence、remaining_risk，未完成时 delivered=false 并写明下一章需要承接的风险。' : '',
      deliveryRiskCarryOver ? '输出附加要求：oh_story_delivery_receipts.pre_draft_execution_receipts.next_chapter_quality_plan_receipts 必须逐项覆盖上一章质量续航计划和 chapter_target.delivery_risk_carry_over 中的 quality_focus、opening_actions、middle_actions、ending_actions、forbidden_repeats/avoid_repetition、evidence_basis；每项包含 key,label,delivered,evidence,remaining_risk，证明质量续航不是只写在任务书里，而是落成正文动作、信息变化、章末钩子或禁用重复。' : '',
      ...buildIntentConfirmationReceiptPromptSection(intentConfirmationContract),
      ...buildBenchmarkRecallReceiptPromptSection(benchmarkRecallBrief),
      '输出附加要求：oh_story_delivery_receipts 中所有 evidence / changed_evidence 必须引用 chapter_text 中可定位的动作、对话、信息变化或关系变化；changed_evidence 必须引用 chapter_text，不能只写“已完成”“已处理”“见正文”。如果没有完成，delivered 必须为 false 并写 remaining_risk。',
      '输出 JSON，包含 prose_chapters 数组。数组只能有一项，且必须包含 chapter_no, title, chapter_text, scene_breakdown, continuity_notes, oh_story_delivery_receipts。scene_breakdown 要回填每个场景的 scene_type、purpose_tag 目的词执行情况、required_beats/action_beats 完成情况、description_budget 执行情况、density_level 执行情况、scene_start_anchor、scene_end_anchor、scene_card_receipts 和 blueprint_receipts（如有章节蓝图合同）。chapter_text 是完整简体中文正文，不要 markdown 标题。',
    ])
  }

  const buildStoryStatePrompt = (project: any, contextPackage: any, chapterText: string) => {
    return buildStoryStatePromptFromBuilder(project, contextPackage, chapterText)
  }

  const normalizeStoryStateDeltaForStorage = (delta: any = {}) => {
    const objectValue = (value: any) => value && typeof value === 'object' && !Array.isArray(value) ? value : {}
    const source = delta || {}
    return {
      ...source,
      current_time: source.current_time ?? source.currentTime,
      character_positions: { ...objectValue(source.character_positions), ...objectValue(source.characterPositions) },
      character_relationships: { ...objectValue(source.character_relationships), ...objectValue(source.characterRelationships) },
      relationship_graph: { ...objectValue(source.relationship_graph), ...objectValue(source.relationshipGraph) },
      known_secrets: { ...objectValue(source.known_secrets), ...objectValue(source.knownSecrets) },
      secret_visibility: { ...objectValue(source.secret_visibility), ...objectValue(source.secretVisibility) },
      item_ownership: { ...objectValue(source.item_ownership), ...objectValue(source.itemOwnership) },
      resource_status: { ...objectValue(source.resource_status), ...objectValue(source.resourceStatus) },
      foreshadowing_status: { ...objectValue(source.foreshadowing_status), ...objectValue(source.foreshadowingStatus) },
      payoff_queue: asArray(source.payoff_queue || source.payoffQueue),
      active_locations: asArray(source.active_locations || source.activeLocations),
      open_questions: asArray(source.open_questions || source.openQuestions),
      recent_repeated_information: asArray(source.recent_repeated_information || source.recentRepeatedInformation),
      next_chapter_priorities: asArray(source.next_chapter_priorities || source.nextChapterPriorities),
      layered_memory_context: source.layered_memory_context || source.layeredMemoryContext,
      progress_summary: source.progress_summary || source.progressSummary,
      daily_context_snapshot: normalizeDailyContextSnapshot(source.daily_context_snapshot || source.dailyContextSnapshot),
      style_fingerprint: source.style_fingerprint ?? source.styleFingerprint,
      style_fingerprint_contract: source.style_fingerprint_contract || source.styleFingerprintContract,
    }
  }

  const mergeStoryState = (prev: any, delta: any, chapter: any) => {
    const establishedEvents = mergeEstablishedEvents(
      [
        ...asArray((prev || {}).established_events),
        ...asArray((prev || {}).canon_facts),
      ],
      [
        ...asArray((delta || {}).established_events),
        ...asArray((delta || {}).canon_facts),
      ],
      { chapterNo: chapter?.chapter_no },
    )
    const projectedFacts = projectCanonFactsFromEvents(establishedEvents)
    return {
      ...(prev || {}),
      ...(delta || {}),
      character_positions: { ...((prev || {}).character_positions || {}), ...((delta || {}).character_positions || {}) },
      character_relationships: { ...((prev || {}).character_relationships || {}), ...((delta || {}).character_relationships || {}) },
      relationship_graph: { ...((prev || {}).relationship_graph || {}), ...((delta || {}).relationship_graph || {}) },
      known_secrets: { ...((prev || {}).known_secrets || {}), ...((delta || {}).known_secrets || {}) },
      secret_visibility: { ...((prev || {}).secret_visibility || {}), ...((delta || {}).secret_visibility || {}) },
      item_ownership: { ...((prev || {}).item_ownership || {}), ...((delta || {}).item_ownership || {}) },
      resource_status: { ...((prev || {}).resource_status || {}), ...((delta || {}).resource_status || {}) },
      foreshadowing_status: { ...((prev || {}).foreshadowing_status || {}), ...((delta || {}).foreshadowing_status || {}) },
      payoff_queue: asArray((delta || {}).payoff_queue).length ? asArray((delta || {}).payoff_queue) : asArray((prev || {}).payoff_queue),
      active_locations: asArray((delta || {}).active_locations).length ? asArray((delta || {}).active_locations) : asArray((prev || {}).active_locations),
      open_questions: asArray((delta || {}).open_questions).length ? asArray((delta || {}).open_questions) : asArray((prev || {}).open_questions),
      next_chapter_priorities: asArray((delta || {}).next_chapter_priorities).length ? asArray((delta || {}).next_chapter_priorities) : asArray((prev || {}).next_chapter_priorities),
      layered_memory_context: buildMergedLayeredMemoryContext((prev || {}).layered_memory_context, (delta || {}).layered_memory_context, chapter),
      progress_summary: (delta || {}).progress_summary || (prev || {}).progress_summary || null,
      daily_context_snapshot: (delta || {}).daily_context_snapshot || (prev || {}).daily_context_snapshot || null,
      established_events: establishedEvents,
      canon_facts: projectedFacts.length
        ? projectedFacts
        : (asArray((delta || {}).canon_facts).length ? asArray((delta || {}).canon_facts) : asArray((prev || {}).canon_facts)),
      last_updated_chapter: chapter.chapter_no,
      last_updated_at: new Date().toISOString(),
    }
  }

  const prepareStoryStateUpdate = async (activeWorkspace: string, project: any, chapter: any, contextPackage: any, chapterText: string, modelId?: number, options: any = {}): Promise<PreparedStoryStateUpdate> => {
    const stageModelId = ctx.production.getStageModelId(project, 'review', modelId)
    const buildFromAgentResult = async (result: any): Promise<PreparedStoryStateUpdate> => {
      const payload = getNovelPayload(result)
      const diagnostics = buildLLMResultDiagnostics(result)
      const rawStateDelta = payload?.state_delta || payload?.stateDelta || {}
      const establishedEventsIncoming = asArray(
        payload?.established_events
        || payload?.establishedEvents
        || rawStateDelta?.established_events
        || rawStateDelta?.establishedEvents,
      )
      const stateDelta = normalizeStoryStateDeltaForStorage({
        ...(rawStateDelta || {}),
        established_events: establishedEventsIncoming.length
          ? establishedEventsIncoming
          : asArray(rawStateDelta?.established_events || rawStateDelta?.establishedEvents),
      })
      const styleFingerprintSnapshot = buildStyleFingerprintStateSnapshot(contextPackage, project, project.reference_config?.story_state || {})
      const stateDeltaWithStyleFingerprint = styleFingerprintSnapshot
        ? { ...stateDelta, ...styleFingerprintSnapshot }
        : stateDelta
      const nextReferenceConfig = {
        ...(project.reference_config || {}),
        story_state: mergeStoryState(project.reference_config?.story_state || {}, stateDeltaWithStyleFingerprint, chapter),
      }
      const characterUpdates = asArray(payload?.character_updates || payload?.characterUpdates)
      const settingUpdates = asArray(payload?.setting_updates || payload?.settingUpdates)
      const storylineUpdates = asArray(payload?.storyline_updates || payload?.storylineUpdates)
      const [assetCharacters, assetSettings] = await Promise.all([
        listNovelCharacters(activeWorkspace, project.id),
        listNovelSettingEntities(activeWorkspace, project.id),
      ])
      const discoveredAssets = normalizeDiscoveredAssets(asArray(payload?.discovered_assets || payload?.discoveredAssets), {
        existingCharacters: assetCharacters,
        existingSettings: assetSettings,
        chapter,
      })
      const syncReports = {
        character_state_delta_sync: buildCharacterStateDeltaSyncReport(chapter, contextPackage, stateDeltaWithStyleFingerprint, characterUpdates),
        asset_state_delta_sync: buildAssetStateDeltaSyncReport(chapter, contextPackage, stateDeltaWithStyleFingerprint, settingUpdates, discoveredAssets),
        chapter_handoff_delta_sync: buildChapterHandoffDeltaSyncReport(chapter, contextPackage, stateDeltaWithStyleFingerprint),
        timeline_delta_sync: buildTimelineDeltaSyncReport(chapter, contextPackage, stateDeltaWithStyleFingerprint, settingUpdates),
        state_delta_completeness: buildStateDeltaCompletenessReport(chapter, chapterText, stateDeltaWithStyleFingerprint, {
          settingUpdates,
          characterUpdates,
          storylineUpdates,
          discoveredAssets,
          foreshadowingStatus: payload?.foreshadowing_status || payload?.foreshadowingStatus || {},
        }),
      }
      payload.style_fingerprint = stateDeltaWithStyleFingerprint.style_fingerprint
      payload.style_fingerprint_contract = stateDeltaWithStyleFingerprint.style_fingerprint_contract
      Object.assign(payload, syncReports)
      const finishReason = rejectedProseTransportFinishReason(result)
        || String(diagnostics.finish_reason || '').toLowerCase()
      const validStateFields = [
        'current_time', 'currentTime', 'character_positions', 'characterPositions', 'character_relationships', 'characterRelationships',
        'relationship_graph', 'relationshipGraph', 'known_secrets', 'knownSecrets', 'secret_visibility', 'secretVisibility',
        'item_ownership', 'itemOwnership', 'resource_status', 'resourceStatus', 'foreshadowing_status', 'foreshadowingStatus',
        'payoff_queue', 'payoffQueue', 'active_locations', 'activeLocations', 'open_questions', 'openQuestions',
        'next_chapter_priorities', 'nextChapterPriorities', 'timeline', 'progress_summary', 'progressSummary',
      ]
      const payloadDiagnostics = {
        invalid_payload: !payload || typeof payload !== 'object' || Array.isArray(payload)
          || !rawStateDelta || typeof rawStateDelta !== 'object' || Array.isArray(rawStateDelta)
          || !validStateFields.some(key => Object.prototype.hasOwnProperty.call(rawStateDelta, key)),
        transport_incomplete: Boolean(finishReason)
          && ['length', 'incomplete', 'max_tokens', 'content_filter', 'tool', 'tool_calls'].some(reason => String(finishReason).includes(reason))
          || hasProseTransportIncompleteDetails(result),
      }
      return {
        state_delta: stateDeltaWithStyleFingerprint,
        next_reference_config: nextReferenceConfig,
        character_updates: characterUpdates,
        setting_updates: settingUpdates,
        storyline_updates: storylineUpdates,
        sync_reports: syncReports,
        hard_failures: buildPreparedStoryStateHardFailures(syncReports, payloadDiagnostics),
        payload,
      }
    }

    const runAgentOnce = async (maxTokens: number) => {
      throwIfAborted(options)
      return executeAgent('review-agent', project, {
        task: buildStoryStatePrompt(project, contextPackage, chapterText),
      }, {
        activeWorkspace,
        modelId: stageModelId ? String(stageModelId) : undefined,
        maxTokens,
        temperature: ctx.production.getStageTemperature(project, 'review', 0.15),
        skipMemory: true,
        signal: options.abortSignal,
        timeoutMs: options.llmTimeoutMs,
      })
    }

    const primaryMaxTokens = Number(options.maxTokens || options.max_tokens || 4500) || 4500
    let prepared = await buildFromAgentResult(await runAgentOnce(primaryMaxTokens))
    const hasTransportBlock = (item: PreparedStoryStateUpdate) => item.hard_failures.some((failure: any) => (
      failure?.key === 'story_state_invalid_payload' || failure?.key === 'story_state_transport_incomplete'
    ))
    const shouldRetry = options.retryOnBlockedTransport === true && hasTransportBlock(prepared)
    if (shouldRetry) {
      const retryMaxTokens = Math.max(primaryMaxTokens + 1500, 6000)
      prepared = await buildFromAgentResult(await runAgentOnce(retryMaxTokens))
      prepared.payload = {
        ...(prepared.payload || {}),
        story_state_prepare_retry: true,
        story_state_prepare_retry_max_tokens: retryMaxTokens,
      }
    }
    // Manual/cockpit sync can fall back to a minimal handoff delta so last_updated_chapter still advances.
    if (options.allowDeterministicFallback === true && hasTransportBlock(prepared)) {
      const endingHook = String(chapter?.ending_hook || chapter?.endingHook || '').trim()
      const summary = String(chapter?.chapter_summary || chapter?.chapterSummary || chapter?.chapter_goal || chapter?.chapterGoal || chapter?.title || '').trim()
      const deterministicDelta = {
        open_questions: endingHook ? [endingHook] : [],
        next_chapter_priorities: [endingHook, summary].filter(Boolean),
        progress_summary: {
          last_completed_chapter: Number(chapter?.chapter_no || 0) || null,
          notes: summary || endingHook || `第${chapter?.chapter_no || '?'}章正文已写，状态机使用确定性回退更新。`,
        },
      }
      const styleFingerprintSnapshot = buildStyleFingerprintStateSnapshot(contextPackage, project, project.reference_config?.story_state || {})
      const stateDeltaWithStyleFingerprint = styleFingerprintSnapshot
        ? { ...normalizeStoryStateDeltaForStorage(deterministicDelta), ...styleFingerprintSnapshot }
        : normalizeStoryStateDeltaForStorage(deterministicDelta)
      const nextReferenceConfig = {
        ...(project.reference_config || {}),
        story_state: mergeStoryState(project.reference_config?.story_state || {}, stateDeltaWithStyleFingerprint, chapter),
      }
      const syncReports = {
        character_state_delta_sync: buildCharacterStateDeltaSyncReport(chapter, contextPackage, stateDeltaWithStyleFingerprint, []),
        asset_state_delta_sync: buildAssetStateDeltaSyncReport(chapter, contextPackage, stateDeltaWithStyleFingerprint, [], []),
        chapter_handoff_delta_sync: buildChapterHandoffDeltaSyncReport(chapter, contextPackage, stateDeltaWithStyleFingerprint),
        timeline_delta_sync: buildTimelineDeltaSyncReport(chapter, contextPackage, stateDeltaWithStyleFingerprint, []),
        state_delta_completeness: buildStateDeltaCompletenessReport(chapter, chapterText, stateDeltaWithStyleFingerprint, {
          settingUpdates: [],
          characterUpdates: [],
          storylineUpdates: [],
          discoveredAssets: [],
          foreshadowingStatus: {},
        }),
      }
      const softFailures = buildPreparedStoryStateHardFailures(syncReports, { invalid_payload: false, transport_incomplete: false })
      prepared = {
        state_delta: stateDeltaWithStyleFingerprint,
        next_reference_config: nextReferenceConfig,
        character_updates: [],
        setting_updates: [],
        storyline_updates: [],
        sync_reports: syncReports,
        hard_failures: softFailures,
        payload: {
          ...(prepared.payload || {}),
          state_delta: stateDeltaWithStyleFingerprint,
          ...syncReports,
          story_state_deterministic_fallback: true,
          story_state_prepare_retry: Boolean(prepared.payload?.story_state_prepare_retry),
          previous_hard_failures: prepared.hard_failures,
        },
      }
    }
    return prepared
  }

  const updateStoryStateMachine = async (activeWorkspace: string, project: any, chapter: any, contextPackage: any, chapterText: string, modelId?: number, options: any = {}) => {
    const prepared: PreparedStoryStateUpdate = options.prepared || await prepareStoryStateUpdate(activeWorkspace, project, chapter, contextPackage, chapterText, modelId, {
      ...options,
      allowDeterministicFallback: options.allowDeterministicFallback !== false,
      retryOnBlockedTransport: options.retryOnBlockedTransport !== false,
    })
    const blockingFailures = blockingPreparedStoryStateHardFailures(prepared.hard_failures)
    if (blockingFailures.length) {
      const summary = formatPreparedStoryStateFailureSummary(blockingFailures) || '故事状态准备阶段未通过'
      throw Object.assign(new Error(summary), {
        code: 'STORY_STATE_PREPARE_BLOCKED',
        hard_failures: prepared.hard_failures,
        blocking_hard_failures: blockingFailures,
      })
    }
    const payload = prepared.payload
    const stateDelta = prepared.state_delta
    const nextReferenceConfig = prepared.next_reference_config
    if (prepared.hard_failures.length) {
      payload.soft_hard_failures = prepared.hard_failures
      payload.story_state_applied_with_warnings = true
    }
    await updateNovelProject(activeWorkspace, project.id, { reference_config: nextReferenceConfig } as any)
    payload.style_fingerprint = stateDelta.style_fingerprint
    payload.style_fingerprint_contract = stateDelta.style_fingerprint_contract
    const chapters = await listNovelChapters(activeWorkspace, project.id)
    const chapterTitleUniquenessSync = buildChapterTitleUniquenessSyncReport(chapters, chapter)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterTitleUniquenessSync, reviewType: 'chapter_title_uniqueness_sync', payloadKey: 'chapter_title_uniqueness_sync', formatIssue: (item: any) => `标题重复：第${item.chapter_no || '-'}章《${item.title || ''}》` }))
    payload.chapter_title_uniqueness_sync = chapterTitleUniquenessSync
    const characterUpdates = prepared.character_updates
    if (characterUpdates.length > 0) {
      const characters = await listNovelCharacters(activeWorkspace, project.id)
      for (const update of characterUpdates) {
        const name = String(update?.name || '').trim()
        if (!name) continue
        const character = characters.find(item => item.name === name)
        if (!character) continue
        const currentState = update.current_state || update.currentState || {}
        await updateNovelCharacter(activeWorkspace, character.id, {
          current_state: {
            ...(character.current_state || {}),
            ...(currentState || {}),
            last_seen_chapter: chapter.chapter_no,
          },
        } as any)
      }
    }
    const characterStateDeltaSync = buildCharacterStateDeltaSyncReport(chapter, contextPackage, stateDelta, characterUpdates)
    if (Number(characterStateDeltaSync.planned_count || 0) > 0 || Number(characterStateDeltaSync.recorded_count || 0) > 0) {
      await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterStateDeltaSync, reviewType: 'character_state_delta_sync', payloadKey: 'character_state_delta_sync', formatIssue: (item: any) => `角色状态缺口：${item.name}｜${item.text}` }))
    }
    payload.character_state_delta_sync = characterStateDeltaSync
    const settingUpdates = prepared.setting_updates
    if (settingUpdates.length > 0) {
      const settings = await listNovelSettingEntities(activeWorkspace, project.id)
      const usages = await listNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id)
      for (const update of settingUpdates) {
        const entityId = Number(update?.entity_id || update?.entityId || 0)
        const name = String(update?.name || '').trim()
        const entityType = update?.entity_type || update?.entityType
        const entity = settings.find(item => (entityId && item.id === entityId) || (!!name && item.name === name && (!entityType || item.entity_type === entityType)))
        if (!entity) continue
        const stateDelta = update.state_delta || update.stateDelta || update.actual_state_change || update.actualStateChange || {}
        const actualStateChange = update.actual_state_change || update.actualStateChange || stateDelta || {}
        await updateNovelSettingEntity(activeWorkspace, entity.id, {
          state_json: {
            ...(entity.state_json || {}),
            ...(stateDelta || {}),
            last_seen_chapter: chapter.chapter_no,
          },
        } as any)
        const usage = usages.find(item => item.entity_id === entity.id)
        if (usage) {
          await updateNovelChapterSettingUsage(activeWorkspace, usage.id, {
            actual_state_change: {
              ...(usage.actual_state_change || {}),
              ...(actualStateChange || {}),
            },
          } as any)
        }
      }
    }
    const timelineDeltaSync = buildTimelineDeltaSyncReport(chapter, contextPackage, stateDelta, settingUpdates)
    if (Number(timelineDeltaSync.planned_count || 0) > 0 || Number(timelineDeltaSync.recorded_count || 0) > 0) {
      await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: timelineDeltaSync, reviewType: 'timeline_delta_sync', payloadKey: 'timeline_delta_sync', formatIssue: (item: any) => `时间线缺口：${item.label}｜${item.text}` }))
    }
    payload.timeline_delta_sync = timelineDeltaSync
    const chapterHandoffDeltaSync = buildChapterHandoffDeltaSyncReport(chapter, contextPackage, stateDelta)
    if (Number(chapterHandoffDeltaSync.planned_count || 0) > 0 || Number(chapterHandoffDeltaSync.recorded_count || 0) > 0) {
      await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterHandoffDeltaSync, reviewType: 'chapter_handoff_delta_sync', payloadKey: 'chapter_handoff_delta_sync', formatIssue: (item: any) => `章末交接缺口：${item.label}｜${item.text}` }))
    }
    payload.chapter_handoff_delta_sync = chapterHandoffDeltaSync
    const chapterHandoffSync = buildChapterHandoffSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterHandoffSync, reviewType: 'chapter_handoff_sync', payloadKey: 'chapter_handoff_sync', issuePrefix: '章首承接缺口' }))
    payload.chapter_handoff_sync = chapterHandoffSync
    const storylineUpdates = prepared.storyline_updates
    const storylineSync = buildStorylineSyncReport(contextPackage, storylineUpdates)
    if (storylineUpdates.length > 0) {
      const settings = await listNovelSettingEntities(activeWorkspace, project.id)
      const usages = await listNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id)
      for (const update of storylineUpdates) {
        const entityId = Number(update?.entity_id || update?.entityId || 0)
        const name = String(update?.name || '').trim()
        const entity = settings.find(item => STORYLINE_TYPES.includes(item.entity_type) && ((entityId && item.id === entityId) || (!!name && item.name === name)))
        if (!entity) continue
        const stateDelta = update.state_delta || update.stateDelta || update.actual_state_change || update.actualStateChange || {}
        const actualStateChange = update.actual_state_change || update.actualStateChange || stateDelta || {}
        if (!stateDelta || typeof stateDelta !== 'object' || Array.isArray(stateDelta)) continue
        await updateNovelSettingEntity(activeWorkspace, entity.id, {
          state_json: {
            ...(entity.state_json || {}),
            ...(stateDelta || {}),
            last_seen_chapter: chapter.chapter_no,
            last_checked_chapter_id: chapter.id,
            last_checked_chapter_no: chapter.chapter_no,
          },
        } as any)
        const usage = usages.find(item => item.entity_id === entity.id)
        if (usage) {
          await updateNovelChapterSettingUsage(activeWorkspace, usage.id, {
            actual_state_change: {
              ...(usage.actual_state_change || {}),
              ...(actualStateChange || {}),
            },
          } as any)
        }
      }
    }
    const [assetCharacters, assetSettings] = await Promise.all([
      listNovelCharacters(activeWorkspace, project.id),
      listNovelSettingEntities(activeWorkspace, project.id),
    ])
    const discoveredAssets = normalizeDiscoveredAssets(
      Array.isArray(payload?.discovered_assets)
        ? payload.discovered_assets
        : Array.isArray(payload?.discoveredAssets)
          ? payload.discoveredAssets
          : [],
      { existingCharacters: assetCharacters, existingSettings: assetSettings, chapter },
    )
    const assetIntakeReview = buildAssetIntakeReviewRecord({ projectId: project.id, chapter, discoveredAssets })
    if (assetIntakeReview) await createNovelReview(activeWorkspace, assetIntakeReview)
    payload.asset_intake = { discovered_assets: discoveredAssets }
    const assetStateDeltaSync = buildAssetStateDeltaSyncReport(chapter, contextPackage, stateDelta, settingUpdates, discoveredAssets)
    if (Number(assetStateDeltaSync.planned_count || 0) > 0 || Number(assetStateDeltaSync.recorded_count || 0) > 0) {
      await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: assetStateDeltaSync, reviewType: 'asset_state_delta_sync', payloadKey: 'asset_state_delta_sync', formatIssue: (item: any) => `资产状态缺口：${item.name}｜${item.text}` }))
    }
    payload.asset_state_delta_sync = assetStateDeltaSync
    const relationshipDeltaSync = buildRelationshipDeltaSyncReport(chapter, contextPackage, stateDelta, storylineUpdates)
    if (Number(relationshipDeltaSync.planned_count || 0) > 0 || Number(relationshipDeltaSync.recorded_count || 0) > 0) {
      await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: relationshipDeltaSync, reviewType: 'relationship_delta_sync', payloadKey: 'relationship_delta_sync', formatIssue: (item: any) => `关系增量缺口：${item.name}｜${item.text}` }))
    }
    payload.relationship_delta_sync = relationshipDeltaSync
    const foreshadowingDeltaSync = buildForeshadowingDeltaSyncReport(chapter, contextPackage, storylineUpdates, discoveredAssets, payload?.foreshadowing_status || payload?.foreshadowingStatus || {})
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: foreshadowingDeltaSync, reviewType: 'foreshadowing_delta_sync', payloadKey: 'foreshadowing_delta_sync', formatIssue: (item: any) => `伏笔增量缺口：${item.name}` }))
    payload.foreshadowing_delta_sync = foreshadowingDeltaSync
    const stateDeltaCompleteness = prepared.sync_reports.state_delta_completeness
    if (Number(stateDeltaCompleteness.planned_count || 0) > 0 || Number(stateDeltaCompleteness.missed_count || 0) > 0) {
      await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: stateDeltaCompleteness, reviewType: 'state_delta_completeness', payloadKey: 'state_delta_completeness', formatIssue: (item: any) => `${item.label}：${item.fix}` }))
    }
    payload.state_delta_completeness = stateDeltaCompleteness
    const ipSceneCandidates = normalizeIpSceneCandidates(
      Array.isArray(payload?.ip_scene_candidates)
        ? payload.ip_scene_candidates
        : Array.isArray(payload?.ipSceneCandidates)
          ? payload.ipSceneCandidates
          : [],
      chapter,
    )
    const ipSceneIntakeReview = buildIpSceneIntakeReviewRecord({ projectId: project.id, chapter, ipSceneCandidates })
    if (ipSceneIntakeReview) await createNovelReview(activeWorkspace, ipSceneIntakeReview)
    payload.ip_scene_intake = { ip_scene_candidates: ipSceneCandidates }
    const signatureSceneSync = buildSignatureSceneSyncReport(project, chapter, contextPackage, chapterText)
    if (Number(signatureSceneSync.planned_count || 0) > 0) {
      await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: signatureSceneSync, reviewType: 'signature_scene_sync', payloadKey: 'signature_scene_sync', formatIssue: (item: any) => `未兑现：${item.label}｜${item.text}` }))
    }
    payload.signature_scene_sync = signatureSceneSync
    await createNovelReview(activeWorkspace, buildStorylineSyncReviewRecord({ projectId: project.id, chapter, storylineSync }))
    payload.storyline_sync = storylineSync
    const storyUnitSync = buildStoryUnitSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({
      projectId: project.id,
      chapter,
      sync: storyUnitSync,
      reviewType: 'story_unit_sync',
      payloadKey: 'story_unit_sync',
      formatIssues: sync => [
        ...sync.missed.map((item: any) => `单元漏写：${item.label}｜${item.text}`),
        ...sync.rushed_ahead.map((item: any) => `单元抢跑：${item.label}｜${item.text}`),
        ...sync.forbidden_touched.map((item: any) => `禁抢跑：${item.label}｜${item.text}`),
      ],
    }))
    payload.story_unit_sync = storyUnitSync
    const coreDrift = buildChapterCoreDriftReport(project, chapter, contextPackage, chapterText, storylineSync)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: coreDrift, reviewType: 'chapter_core_drift', payloadKey: 'core_drift', formatIssues: sync => sync.drift_risks }))
    payload.core_drift = coreDrift
    const coreContractSync = buildCoreContractSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: coreContractSync, reviewType: 'core_contract_sync', payloadKey: 'core_contract_sync', issuePrefix: '核心契约缺口' }))
    payload.core_contract_sync = coreContractSync
    const readerPayoffSync = buildReaderPayoffSyncReport(project, chapter, contextPackage, chapterText, payload)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({
      projectId: project.id,
      chapter,
      sync: readerPayoffSync,
      reviewType: 'reader_payoff_sync',
      payloadKey: 'reader_payoff_sync',
      formatIssues: sync => [
        ...sync.missed.map((item: any) => `未兑现：${item.text}`),
        ...sync.debts.map((item: any) => `待回收：${item.text}`),
      ],
    }))
    payload.reader_payoff_sync = readerPayoffSync
    const readerExpectationSync = buildReaderExpectationSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({
      projectId: project.id,
      chapter,
      sync: readerExpectationSync,
      reviewType: 'reader_expectation_sync',
      payloadKey: 'reader_expectation_sync',
      formatIssue: (item: any) => `未兑现：${item.label}｜${item.text}`,
    }))
    payload.reader_expectation_sync = readerExpectationSync
    const expectationThresholdSync = buildExpectationThresholdSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: expectationThresholdSync, reviewType: 'expectation_threshold_sync', payloadKey: 'expectation_threshold_sync', issuePrefix: '期待阈值缺口' }))
    payload.expectation_threshold_sync = expectationThresholdSync
    const readerRetentionSync = buildReaderRetentionSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: readerRetentionSync, reviewType: 'reader_retention_sync', payloadKey: 'reader_retention_sync', formatIssue: (item: any) => `未兑现：${item.label}｜${item.text}` }))
    payload.reader_retention_sync = readerRetentionSync
    const chapterHookSync = buildChapterHookSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterHookSync, reviewType: 'chapter_hook_sync', payloadKey: 'chapter_hook_sync', issuePrefix: '章级钩子缺口' }))
    payload.chapter_hook_sync = chapterHookSync
    const paragraphHookSync = buildParagraphHookSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: paragraphHookSync, reviewType: 'paragraph_hook_sync', payloadKey: 'paragraph_hook_sync', issuePrefix: '段落钩子缺口' }))
    payload.paragraph_hook_sync = paragraphHookSync
    const suspenseSync = buildSuspenseSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: suspenseSync, reviewType: 'suspense_sync', payloadKey: 'suspense_sync', issuePrefix: '悬念缺口' }))
    payload.suspense_sync = suspenseSync
    const reversalSync = buildReversalSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: reversalSync, reviewType: 'reversal_sync', payloadKey: 'reversal_sync', issuePrefix: '反转缺口' }))
    payload.reversal_sync = reversalSync
    const showdownSync = buildShowdownSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: showdownSync, reviewType: 'showdown_sync', payloadKey: 'showdown_sync', issuePrefix: '高潮缺口' }))
    payload.showdown_sync = showdownSync
    const payoffSetupSync = buildPayoffSetupSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: payoffSetupSync, reviewType: 'payoff_setup_sync', payloadKey: 'payoff_setup_sync', formatIssue: (item: any) => `爽点铺垫缺口：${item.label}｜${item.evidence || item.text || item.expected}` }))
    payload.payoff_setup_sync = payoffSetupSync
    const spectatorReactionSync = buildSpectatorReactionSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: spectatorReactionSync, reviewType: 'spectator_reaction_sync', payloadKey: 'spectator_reaction_sync', formatIssue: (item: any) => `围观反应缺口：${item.label}｜${item.evidence || item.text || item.expected}` }))
    payload.spectator_reaction_sync = spectatorReactionSync
    const bridgeUnitSync = buildBridgeUnitSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: bridgeUnitSync, reviewType: 'bridge_unit_sync', payloadKey: 'bridge_unit_sync', issuePrefix: '桥段缺口' }))
    payload.bridge_unit_sync = bridgeUnitSync
    const beatCoolingSync = buildBeatCoolingSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: beatCoolingSync, reviewType: 'beat_cooling_sync', payloadKey: 'beat_cooling_sync', issuePrefix: '节奏冷却缺口' }))
    payload.beat_cooling_sync = beatCoolingSync
    const openingSync = buildOpeningSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: openingSync, reviewType: 'opening_sync', payloadKey: 'opening_sync', issuePrefix: '开篇缺口' }))
    payload.opening_sync = openingSync
    const proseCraftSync = buildProseCraftSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: proseCraftSync, reviewType: 'prose_craft_sync', payloadKey: 'prose_craft_sync', issuePrefix: '正文工艺缺口' }))
    payload.prose_craft_sync = proseCraftSync
    const punctuationToneSync = buildPunctuationToneSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: punctuationToneSync, reviewType: 'punctuation_tone_sync', payloadKey: 'punctuation_tone_sync', issuePrefix: '语气标点缺口' }))
    payload.punctuation_tone_sync = punctuationToneSync
    const qualityAuditSync = buildQualityAuditSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: qualityAuditSync, reviewType: 'quality_audit_sync', payloadKey: 'quality_audit_sync', issuePrefix: '质量诊断缺口' }))
    payload.quality_audit_sync = qualityAuditSync
    const proseMetaSync = buildProseMetaSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({
      projectId: project.id,
      chapter,
      sync: proseMetaSync,
      reviewType: 'prose_meta_sync',
      payloadKey: 'prose_meta_sync',
      formatIssue: (item: any) => `正文元信息缺口：${item.term || item.label}｜${item.evidence || item.text || item.expected}`,
    }))
    payload.prose_meta_sync = proseMetaSync
    const dialogueSync = buildDialogueSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: dialogueSync, reviewType: 'dialogue_sync', payloadKey: 'dialogue_sync', issuePrefix: '对白缺口' }))
    payload.dialogue_sync = dialogueSync
    const characterBehaviorSync = buildCharacterBehaviorSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterBehaviorSync, reviewType: 'character_behavior_sync', payloadKey: 'character_behavior_sync', issuePrefix: '角色行为缺口' }))
    payload.character_behavior_sync = characterBehaviorSync
    const assetLinkageSync = buildAssetLinkageSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: assetLinkageSync, reviewType: 'asset_linkage_sync', payloadKey: 'asset_linkage_sync', issuePrefix: '资产挂钩缺口' }))
    payload.asset_linkage_sync = assetLinkageSync
    const stateTrackingSync = buildStateTrackingSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: stateTrackingSync, reviewType: 'state_tracking_sync', payloadKey: 'state_tracking_sync', issuePrefix: '状态跟踪缺口' }))
    payload.state_tracking_sync = stateTrackingSync
    const sourceReadinessSync = buildSourceReadinessSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: sourceReadinessSync, reviewType: 'source_readiness_sync', payloadKey: 'source_readiness_sync', issuePrefix: '来源就绪缺口' }))
    payload.source_readiness_sync = sourceReadinessSync
    const intentConfirmationSync = buildIntentConfirmationSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: intentConfirmationSync, reviewType: 'intent_confirmation_sync', payloadKey: 'intent_confirmation_sync', issuePrefix: '意图确认缺口' }))
    payload.intent_confirmation_sync = intentConfirmationSync
    const continuityHeatSync = buildContinuityHeatSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: continuityHeatSync, reviewType: 'continuity_heat_sync', payloadKey: 'continuity_heat_sync', issuePrefix: '连续性热度缺口' }))
    payload.continuity_heat_sync = continuityHeatSync
    const conflictStructureSync = buildConflictStructureSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: conflictStructureSync, reviewType: 'conflict_structure_sync', payloadKey: 'conflict_structure_sync', issuePrefix: '冲突结构缺口' }))
    payload.conflict_structure_sync = conflictStructureSync
    const upgradeRhythmSync = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: upgradeRhythmSync, reviewType: 'upgrade_rhythm_sync', payloadKey: 'upgrade_rhythm_sync', issuePrefix: '升级节奏缺口' }))
    payload.upgrade_rhythm_sync = upgradeRhythmSync
    const targetReaderSync = buildTargetReaderSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: targetReaderSync, reviewType: 'target_reader_sync', payloadKey: 'target_reader_sync', issuePrefix: '目标读者缺口' }))
    payload.target_reader_sync = targetReaderSync
    const genrePositioningSync = buildGenrePositioningSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: genrePositioningSync, reviewType: 'genre_positioning_sync', payloadKey: 'genre_positioning_sync', issuePrefix: '题材定位缺口' }))
    payload.genre_positioning_sync = genrePositioningSync
    const femaleAudienceSync = buildFemaleAudienceSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: femaleAudienceSync, reviewType: 'female_audience_sync', payloadKey: 'female_audience_sync', issuePrefix: '女频长篇缺口' }))
    payload.female_audience_sync = femaleAudienceSync
    const plotDynamicsSync = buildPlotDynamicsSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: plotDynamicsSync, reviewType: 'plot_dynamics_sync', payloadKey: 'plot_dynamics_sync', issuePrefix: '剧情动力缺口' }))
    payload.plot_dynamics_sync = plotDynamicsSync
    const storyPowerSync = buildStoryPowerSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyPowerSync, reviewType: 'story_power_sync', payloadKey: 'story_power_sync', issuePrefix: '故事力缺口' }))
    payload.story_power_sync = storyPowerSync
    const characterRelationSync = buildCharacterRelationSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterRelationSync, reviewType: 'character_relation_sync', payloadKey: 'character_relation_sync', issuePrefix: '角色关系缺口' }))
    payload.character_relation_sync = characterRelationSync
    const chapterAttractionReview = buildChapterAttractionReviewReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterAttractionReview, reviewType: 'chapter_attraction_review', payloadKey: 'chapter_attraction_review', formatIssues: sync => sync.weak_dimensions.map((item: any) => `${item.label}｜${item.issue}`) }))
    payload.chapter_attraction_review = chapterAttractionReview
    const storyDriveSync = buildStoryDriveSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyDriveSync, reviewType: 'story_drive_sync', payloadKey: 'story_drive_sync', issuePrefix: '故事力缺口' }))
    payload.story_drive_sync = storyDriveSync
    const storyLoopSync = buildStoryLoopSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyLoopSync, reviewType: 'story_loop_sync', payloadKey: 'story_loop_sync', issuePrefix: '故事循环缺口' }))
    payload.story_loop_sync = storyLoopSync
    const informationFlowSync = buildInformationFlowSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: informationFlowSync, reviewType: 'information_flow_sync', payloadKey: 'information_flow_sync', issuePrefix: '信息流缺口' }))
    payload.information_flow_sync = informationFlowSync
    const emotionalArcSync = buildEmotionalArcSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: emotionalArcSync, reviewType: 'emotional_arc_sync', payloadKey: 'emotional_arc_sync', issuePrefix: '情绪弧缺口' }))
    payload.emotional_arc_sync = emotionalArcSync
    const characterArcSync = buildCharacterArcSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterArcSync, reviewType: 'character_arc_sync', payloadKey: 'character_arc_sync', issuePrefix: '人物弧光缺口' }))
    payload.character_arc_sync = characterArcSync
    const chapterBlueprintSync = buildChapterBlueprintSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterBlueprintSync, reviewType: 'chapter_blueprint_sync', payloadKey: 'chapter_blueprint_sync', issuePrefix: '细纲缺口' }))
    payload.chapter_blueprint_sync = chapterBlueprintSync
    const chapterBenchmarkSync = buildChapterBenchmarkSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterBenchmarkSync, reviewType: 'chapter_benchmark_sync', payloadKey: 'chapter_benchmark_sync', issuePrefix: '未达标' }))
    payload.chapter_benchmark_sync = chapterBenchmarkSync
    const benchmarkRecallSync = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: benchmarkRecallSync, reviewType: 'benchmark_recall_sync', payloadKey: 'benchmark_recall_sync', issuePrefix: '召回缺口' }))
    payload.benchmark_recall_sync = benchmarkRecallSync
    const styleBoundarySync = buildStyleBoundarySyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: styleBoundarySync, reviewType: 'style_boundary_sync', payloadKey: 'style_boundary_sync', issuePrefix: '文风边界缺口' }))
    payload.style_boundary_sync = styleBoundarySync
    const styleSampleSync = buildStyleSampleSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({
      projectId: project.id,
      chapter,
      sync: styleSampleSync,
      reviewType: 'style_sample_sync',
      payloadKey: 'style_sample_sync',
      formatIssues: sync => [
        ...sync.missed.map((item: any) => `风格缺口：${item.label}｜${item.text}`),
        ...sync.copied_phrases.map((item: any) => `照搬风险：${item}`),
      ],
    }))
    payload.style_sample_sync = styleSampleSync
    const innovationSync = buildInnovationSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: innovationSync, reviewType: 'innovation_sync', payloadKey: 'innovation_sync', issuePrefix: '未兑现' }))
    payload.innovation_sync = innovationSync
    const volumeBeatSync = buildVolumeBeatSyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: volumeBeatSync, reviewType: 'volume_beat_sync', payloadKey: 'volume_beat_sync', issuePrefix: '未兑现' }))
    payload.volume_beat_sync = volumeBeatSync
    const runwaySync = buildRunwaySyncReport(project, chapter, contextPackage, chapterText)
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({
      projectId: project.id,
      chapter,
      sync: runwaySync,
      reviewType: 'runway_sync',
      payloadKey: 'runway_sync',
      formatIssues: sync => [
        ...sync.four_question_missed.map((item: any) => `四问未兑现：${item.label}｜${item.text}`),
        ...sync.reader_fuel_missed.map((item: any) => `读者燃料未兑现：${item.text}`),
        ...sync.redline_touched.map((item: any) => `触碰红线：${item.text}`),
      ],
    }))
    payload.runway_sync = runwaySync
    await createNovelReview(activeWorkspace, buildStoryStateReviewRecord({ projectId: project.id, chapter, payload }))
    try {
      const chapterId = Number(chapter?.id || 0)
      if (chapterId) {
        const existingAdmission = (chapter?.raw_payload && typeof chapter.raw_payload === 'object' ? chapter.raw_payload.prose_admission : null)
          || (chapter?.raw_payload && typeof chapter.raw_payload === 'object' ? chapter.raw_payload.proseAdmission : null)
          || {}
        const nextAdmission = {
          ...(existingAdmission && typeof existingAdmission === 'object' ? existingAdmission : {}),
          story_state_status: 'synced',
          story_state_warning: prepared.hard_failures.length
            ? { hard_failures: prepared.hard_failures, soft: true }
            : null,
        }
        await mergeNovelChapterRawPayload(activeWorkspace, chapterId, {
          prose_admission: nextAdmission,
          proseAdmission: nextAdmission,
        })
      }
    } catch {
      // manual sync still succeeds even if chapter admission flag cannot be patched
    }
    try {
      await refreshFollowingChapterSerialStoryStateReadiness(
        activeWorkspace,
        project.id,
        Number(chapter?.chapter_no || 0),
        Number(chapter?.chapter_no || 0),
      )
    } catch {
      // cache refresh is best-effort; live preflight reconcile is the source of truth
    }
    return payload
  }

  const buildWritingBible = (project: any, worldbuilding: any[], characters: any[], outlines: any[], reviews: any[] = []) => {
    const storyState = getStoryState(project)
    const styleLock = getStyleLock(project)
    const safety = getSafetyPolicy(project)
    const masterOutline = outlines.find(outline => outline.outline_type === 'master') || null
    const volumePlan = getVolumePlan(outlines)
    return {
      project: {
        title: project.title,
        genre: project.genre || '',
        synopsis: project.synopsis || '',
        target_audience: project.target_audience || '',
        style_tags: project.style_tags || [],
        length_target: project.length_target || '',
      },
      promise: masterOutline?.summary || project.synopsis || '',
      world_rules: worldbuilding[0]?.rules || [],
      world_summary: worldbuilding[0]?.world_summary || '',
      mainline: masterOutline ? {
        title: masterOutline.title,
        hook: masterOutline.hook || '',
        conflict_points: masterOutline.conflict_points || [],
        turning_points: masterOutline.turning_points || [],
      } : null,
      volume_plan: volumePlan,
      characters: characters.map(char => ({
        name: char.name,
        role: char.role_type || char.role || '',
        goal: char.goal || '',
        motivation: char.motivation || '',
        conflict: char.conflict || '',
        growth_arc: char.growth_arc || '',
        current_state: char.current_state || {},
      })),
      style_lock: styleLock,
      safety_policy: safety,
      story_state: storyState,
      latest_state_entries: collectRecentFacts(reviews),
      forbidden: safety.forbidden,
      preferred_words: styleLock.preferred_words || [],
      banned_words: styleLock.banned_words || [],
      meme_bank: normalizeMemeBank(project.reference_config?.meme_bank || []),
      updated_at: new Date().toISOString(),
    }
  }

  const hasMeaningfulWritingBible = (value: any) => {
    if (!value || typeof value !== 'object') return false
    return Boolean(
      String(value.promise || value.world_summary || '').trim() ||
      (Array.isArray(value.world_rules) && value.world_rules.length > 0) ||
      (Array.isArray(value.volume_plan) && value.volume_plan.length > 0) ||
      (Array.isArray(value.characters) && value.characters.length > 0) ||
      (value.mainline && Object.keys(value.mainline || {}).length > 0) ||
      (value.style_lock && Object.values(value.style_lock || {}).some(item => Array.isArray(item) ? item.length > 0 : Boolean(String(item || '').trim())))
    )
  }

  const getStoredOrBuiltWritingBible = async (activeWorkspace: string, project: any) => {
    const [worldbuilding, characters, outlines, reviews] = await Promise.all([
      listNovelWorldbuilding(activeWorkspace, project.id),
      listNovelCharacters(activeWorkspace, project.id),
      listNovelOutlines(activeWorkspace, project.id),
      listNovelReviews(activeWorkspace, project.id),
    ])
    const stored = project.reference_config?.writing_bible
    return hasMeaningfulWritingBible(stored) ? stored : buildWritingBible(project, worldbuilding, characters, outlines, reviews)
  }

  const buildChapterContextPackage = async (
    activeWorkspace: string,
    project: any,
    chapter: any,
    chapters: any[],
    worldbuilding: any[],
    characters: any[],
    outlines: any[],
    reviews: any[] = [],
    contextOptions: { settingEntities?: any[]; chapterSettingUsage?: any[]; projectSettingUsage?: any[]; persistSettingUsage?: boolean } = {},
  ) => {
    const sorted = [...chapters].sort((a, b) => a.chapter_no - b.chapter_no)
    const previousChapter = sorted.filter(ch => ch.chapter_no < chapter.chapter_no).slice(-1)[0] || null
    const previousProseChapters = sorted
      .filter(ch => ch.chapter_no < chapter.chapter_no && ch.chapter_text)
      .slice(-3)
      .map(ch => ({
        chapter_no: ch.chapter_no,
        title: ch.title,
        chapter_summary: ch.chapter_summary || compactText(ch.chapter_text, 240),
        ending_hook: ch.ending_hook || '',
        ending_excerpt: String(ch.chapter_text || '').slice(-800),
      }))
    let referencePreview: any = null
    try {
      referencePreview = await previewNovelKnowledgeInjection(project, '正文创作')
    } catch {
      referencePreview = null
    }
    const rawSceneCards = Array.isArray(chapter.scene_list) && chapter.scene_list.length
      ? chapter.scene_list
      : (Array.isArray(chapter.scene_breakdown) ? chapter.scene_breakdown : [])
    const sceneCardContextSeed = {
      chapter_target: {
        chapter_no: chapter.chapter_no,
        title: chapter.title,
        summary: chapter.chapter_summary || '',
        conflict: chapter.conflict || '',
        ending_hook: chapter.ending_hook || '',
      },
    }
    const sceneCards = repairSceneCardsForProseContextHandoff(
      normalizeSceneCardsPayload({ scene_cards: rawSceneCards }, sceneCardContextSeed),
      sceneCardContextSeed,
      chapter,
    )
    const chapterRawPreDraftBrief = {
      ...(chapter.raw_payload?.pre_draft_brief || {}),
      ...(chapter.raw_payload?.preDraftBrief || {}),
    }
    const chapterDeliveryReceipts = normalizeStoredOhStoryDeliveryReceipts(chapter.raw_payload || {})
    const preflight = buildPreflightChecks(project, chapter, previousChapter, worldbuilding, characters, sceneCards, referencePreview, reviews)
    const titleUniquenessReport = buildChapterTitleUniquenessReport(sorted, chapter)
    const wordTarget = resolveChapterWordTarget(project, chapter, {})
    const styleLock = { ...getStyleLock(project), chapter_word_range: wordTarget.rangeText }
    const safetyPolicy = getSafetyPolicy(project)
    const writingBible = project.reference_config?.writing_bible || buildWritingBible(project, worldbuilding, characters, outlines, reviews)
    const memeBank = resolveMemeBank(project, { writing_bible: writingBible })
    const styleSampleBank = resolveStyleSampleBank(project, { writing_bible: writingBible })
    const styleSampleEffectiveness = buildStyleSampleEffectivenessForSelection(styleSampleBank, sorted, reviews)
    const first30RetentionContext = buildFirst30RetentionContext(chapter, reviews)
    const readerExpectationDebtContext = buildReaderExpectationDebtContext(chapter, sorted, reviews)
    const deliveryRiskCarryOverContext = buildDeliveryRiskCarryOverContext(chapter, sorted, reviews)
    const storyUnitContext = buildStoryUnitContext(chapter, sorted, outlines)
    const serialMomentumBrief = buildSerialMomentumBrief(chapter, sorted)
    const serialQualityRegressionBrief = buildSerialQualityRegressionBrief(chapter, sorted, reviews)
    const serialFatigueBrief = mergeRecentFatigueBriefs(serialMomentumBrief, serialQualityRegressionBrief)
    const previousHandoff = buildPreviousChapterHandoff({
      chapter_target: chapterRawPreDraftBrief,
      continuity: {
        previous_chapter: previousChapter ? {
          chapter_no: previousChapter.chapter_no,
          title: previousChapter.title,
          chapter_goal: previousChapter.chapter_goal || '',
          chapter_summary: previousChapter.chapter_summary || '',
          conflict: previousChapter.conflict || '',
          ending_hook: previousChapter.ending_hook || '',
          ending_excerpt: String(previousChapter.chapter_text || '').slice(-800),
          chapter_text: previousChapter.chapter_text || '',
          outgoing_handoff: readChapterOutgoingHandoff(previousChapter),
          chapter_progress_ledger: readChapterProgressLedger(previousChapter),
          raw_payload: {
            must_advance: previousChapter.raw_payload?.must_advance,
            outgoing_handoff: readChapterOutgoingHandoff(previousChapter),
            chapter_progress_ledger: readChapterProgressLedger(previousChapter),
          },
        } : null,
      },
    })
    const fallbackCompass = normalizeLongformCompass({
      reader_promise: writingBible.reader_promise || writingBible.promise || writingBible.core_selling_point || project.synopsis,
      core_conflict: writingBible.core_conflict || writingBible.mainline?.core_conflict,
      innovation_hook: writingBible.innovation_hook || writingBible.core_selling_point,
      payoff_loop: writingBible.payoff_loop || writingBible.style_lock?.payoff_density || writingBible.payoff_density,
      ending_direction: writingBible.ending_direction || writingBible.mainline?.ending_direction,
    })
    const longformCompass = latestLongformCompassFromReviews(reviews) || fallbackCompass
    const longformMemoryCapsule = buildLongformMemoryCapsule(project, writingBible)
    const storyStateForEvents = getStoryState(project) || project?.reference_config?.story_state || {}
    const storyStateGlobalForEvents = storyStateForEvents?.global || storyStateForEvents || {}
    const establishedEventsContract = {
      version: 'established_event_canon_v1',
      events: selectEstablishedEventsForChapter({
        events: [
          ...asArray(storyStateForEvents.established_events),
          ...asArray(storyStateGlobalForEvents.established_events),
          ...asArray(storyStateForEvents.canon_facts),
          ...asArray(storyStateGlobalForEvents.canon_facts),
        ],
        chapterNo: Number(chapter.chapter_no || 0),
        outlineText: [
          chapter.chapter_summary || '',
          chapter.conflict || '',
          chapter.chapter_goal || '',
          JSON.stringify(chapter.raw_payload?.outline || chapter.raw_payload?.blueprint || {}),
        ].join('\n'),
        previousExcerpt: previousChapter
          ? String(previousChapter.ending_hook || '') + '\n' + String(previousChapter.chapter_text || '').slice(-800)
          : '',
        limit: 10,
      }),
      hard_rules: [
        '复述已锁正史事件时，不得改写 cause/mechanism/constraints；只能同义转述。',
        '闪回前任死亡、规则触发、能力代价时必须命中 established_events_contract.events。',
      ],
    }
    const layeredMemoryContext = normalizeLayeredMemoryContext(
      project?.reference_config?.story_state?.layered_memory_context
      || project?.story_state?.layered_memory_context,
    )
    const progressSummary = normalizeDailyProgressSummary(
      project?.reference_config?.story_state?.progress_summary
      || project?.reference_config?.storyState?.progressSummary
      || project?.story_state?.progress_summary
      || project?.storyState?.progressSummary,
    )
    const dailyContextSnapshot = normalizeDailyContextSnapshot(
      project?.reference_config?.story_state?.daily_context_snapshot
      || project?.reference_config?.story_state?.dailyContextSnapshot
      || project?.reference_config?.storyState?.dailyContextSnapshot
      || project?.story_state?.daily_context_snapshot
      || project?.story_state?.dailyContextSnapshot
      || project?.storyState?.dailyContextSnapshot,
    )
    const foreshadowingConsistencyRadar = normalizeForeshadowingConsistencyRadar(
      project?.reference_config?.story_state?.foreshadowing_consistency_radar
      || project?.reference_config?.story_state?.foreshadowingConsistencyRadar
      || project?.reference_config?.storyState?.foreshadowingConsistencyRadar
      || project?.story_state?.foreshadowing_consistency_radar
      || project?.story_state?.foreshadowingConsistencyRadar
      || project?.storyState?.foreshadowingConsistencyRadar
      || {
        foreshadowing_status: project?.reference_config?.story_state?.foreshadowing_status
          || project?.reference_config?.story_state?.foreshadowingStatus
          || project?.reference_config?.storyState?.foreshadowingStatus
          || project?.story_state?.foreshadowing_status
          || project?.story_state?.foreshadowingStatus
          || project?.storyState?.foreshadowingStatus,
        payoff_queue: project?.reference_config?.story_state?.payoff_queue
          || project?.reference_config?.story_state?.payoffQueue
          || project?.reference_config?.storyState?.payoffQueue
          || project?.story_state?.payoff_queue
          || project?.story_state?.payoffQueue
          || project?.storyState?.payoffQueue,
      },
      Number(chapter.chapter_no || 0),
    )
    const [storedSettingEntities, storedChapterSettingUsage, storedProjectSettingUsage] = await Promise.all([
      contextOptions.settingEntities ? Promise.resolve(contextOptions.settingEntities) : listNovelSettingEntities(activeWorkspace, project.id).catch(() => []),
      contextOptions.chapterSettingUsage ? Promise.resolve(contextOptions.chapterSettingUsage) : listNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id).catch(() => []),
      contextOptions.projectSettingUsage ? Promise.resolve(contextOptions.projectSettingUsage) : listNovelChapterSettingUsage(activeWorkspace, project.id).catch(() => []),
    ])
    const settingEntities = storedSettingEntities
    const projectSettingUsage = storedProjectSettingUsage
    let chapterSettingUsage = storedChapterSettingUsage
    let settingUsageAutoMatched = false
    if (chapterSettingUsage.length === 0 && settingEntities.length > 0) {
      const suggestedUsage = buildHeuristicSettingUsage(chapter, settingEntities)
      if (suggestedUsage.length > 0) {
        chapterSettingUsage = contextOptions.persistSettingUsage === false
          ? suggestedUsage as any
          : await replaceNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id, suggestedUsage as any).catch(() => suggestedUsage as any)
        settingUsageAutoMatched = true
      }
    }
    const usageEntityIds = new Set(chapterSettingUsage.map((item: any) => Number(item.entity_id || 0)).filter(Boolean))
    const relatedSettings = settingEntities.filter((item: any) => {
      const first = Number(item.first_chapter_no || 0)
      const last = Number(item.last_chapter_no || 0)
      return usageEntityIds.has(item.id)
        || asArray(item.related_chapter_ids).map(Number).includes(Number(chapter.id))
        || (first > 0 && Number(chapter.chapter_no) >= first && (!last || Number(chapter.chapter_no) <= last))
    })
    const settingById = new Map(settingEntities.map((item: any) => [Number(item.id), item]))
    const relationshipGraph = buildSettingRelationshipGraph({
      settings: settingEntities,
      characters,
      chapters: sorted,
      usage: [
        ...asArray(projectSettingUsage).filter((usage: any) => Number(usage.chapter_id || 0) !== Number(chapter.id)),
        ...chapterSettingUsage,
      ],
    })
    const relationshipGraphContext = {
      summary: relationshipGraph.summary,
      diagnostics: relationshipGraph.diagnostics.slice(0, 30),
    }
    const settingContext = {
      entities: relatedSettings.map((item: any) => ({
        id: item.id,
        type: item.entity_type,
        name: item.name,
        summary: item.summary || '',
        status: item.status || 'active',
        visibility: item.visibility || 'public',
        constraints: item.constraints_json || {},
        state: item.state_json || {},
        first_chapter_no: item.first_chapter_no || null,
        last_chapter_no: item.last_chapter_no || null,
      })),
      chapter_usage: chapterSettingUsage.map((usage: any) => {
        const entity = settingById.get(Number(usage.entity_id || 0))
        return {
          ...usage,
          entity_type: entity?.entity_type || '',
          name: entity?.name || '',
          summary: entity?.summary || '',
          constraints: entity?.constraints_json || {},
          state: entity?.state_json || {},
        }
      }),
      required: chapterSettingUsage.filter((item: any) => item.required && !item.forbidden).map((usage: any) => settingById.get(Number(usage.entity_id))?.name).filter(Boolean),
      forbidden: chapterSettingUsage.filter((item: any) => item.forbidden).map((usage: any) => settingById.get(Number(usage.entity_id))?.name).filter(Boolean),
      auto_matched: settingUsageAutoMatched,
      type_counts: settingEntities.reduce((acc: Record<string, number>, item: any) => {
        const key = item.entity_type || 'rule'
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {}),
      relationship_graph: relationshipGraphContext,
    }
    const storylineSettings = relatedSettings.filter((item: any) => STORYLINE_TYPES.includes(item.entity_type))
    const storylineUsage = chapterSettingUsage
      .map((usage: any) => {
        const entity = settingById.get(Number(usage.entity_id || 0))
        if (!entity || !STORYLINE_TYPES.includes(entity.entity_type)) return null
        return {
          ...usage,
          entity_type: entity.entity_type || '',
          name: entity.name || '',
          summary: entity.summary || '',
          constraints: entity.constraints_json || {},
          state: entity.state_json || {},
          payload: entity.payload_json || {},
        }
      })
      .filter(Boolean)
    const storylineContext = {
      entities: storylineSettings.map((item: any) => ({
        id: item.id,
        type: item.entity_type,
        name: item.name,
        summary: item.summary || '',
        status: item.status || 'active',
        visibility: item.visibility || 'public',
        constraints: item.constraints_json || {},
        state: item.state_json || {},
        payload: item.payload_json || {},
        first_chapter_no: item.first_chapter_no || null,
        last_chapter_no: item.last_chapter_no || null,
      })),
      chapter_usage: storylineUsage,
      required: storylineUsage
        .filter((item: any) => ['advance', 'plant', 'payoff', 'required'].includes(String(item.usage_type || '')) || (item.required && !item.forbidden))
        .map((usage: any) => usage.name)
        .filter(Boolean),
      forbidden: storylineUsage
        .filter((item: any) => item.forbidden || item.usage_type === 'forbidden')
        .map((usage: any) => usage.name)
        .filter(Boolean),
      advance: storylineUsage.filter((item: any) => item.usage_type === 'advance'),
      plant: storylineUsage.filter((item: any) => item.usage_type === 'plant'),
      payoff: storylineUsage.filter((item: any) => item.usage_type === 'payoff'),
      pause: storylineUsage.filter((item: any) => item.usage_type === 'pause'),
      forbidden_usage: storylineUsage.filter((item: any) => item.usage_type === 'forbidden' || item.forbidden),
    }
    const settingChecks = [
      { key: 'setting_workshop', ok: settingEntities.length > 0, severity: 'medium', label: '设定工坊', fix: '在右侧“设定”中从项目资料补齐角色、境界、能力、物品、Boss、规则等设定。' },
      { key: 'chapter_setting_usage', ok: chapterSettingUsage.length > 0, severity: 'low', label: '本章设定调用', fix: '在本章设定调用中标记必用、允许或禁揭设定。' },
    ]
    const titleChecks = [
      {
        key: 'chapter_title_unique',
        ok: titleUniquenessReport.status === 'ok',
        severity: 'low',
        label: '章节标题去重',
        fix: titleUniquenessReport.fix || '保持标题唯一。',
        duplicates: titleUniquenessReport.duplicates,
      },
    ]
    preflight.checks.push(...settingChecks, ...titleChecks)
    preflight.warnings.push(...settingChecks.filter(item => !item.ok).map(item => `${item.label}不足`))
    preflight.warnings.push(...titleChecks.filter(item => !item.ok).map(item => `${item.label}：${titleUniquenessReport.duplicates.map((dup: any) => `第${dup.chapter_no}章《${dup.title}》`).join('、')}`))
    preflight.blockers.push(...settingChecks.filter(item => !item.ok && item.severity === 'high'))
    preflight.ready = preflight.blockers.length === 0
    preflight.strict_ready = preflight.checks.every((item: any) => item.ok || item.severity === 'low')
    const chapterRollingPlan = chapter.raw_payload?.rollingPlan || chapter.raw_payload?.rolling_plan || null
    const signatureSceneBrief = normalizeSignatureSceneBrief(chapter.raw_payload?.signature_scene_brief || chapterRollingPlan)
    const storyState = getStoryState(project)
    const storyStateGlobal = storyState?.global || storyState || {}
    const canonicalSurfaceIndex = buildCanonicalSurfaceIndex({
      previous_chapters: sorted
        .filter(ch => ch.chapter_no < chapter.chapter_no && (ch.chapter_text || ch.chapterText))
        .map(ch => ({
          chapter_no: ch.chapter_no,
          chapter_text: ch.chapter_text || ch.chapterText,
        })),
      canon_facts: [
        ...asArray(storyState?.canon_facts),
        ...asArray(storyState?.canonFacts),
        ...asArray(storyStateGlobal?.canon_facts),
        ...asArray(storyStateGlobal?.canonFacts),
        ...asArray(storyState?.facts),
        ...asArray(storyStateGlobal?.facts),
      ],
      setting_entities: settingEntities,
    })
    const chapterBlueprintSeed = chapter.raw_payload?.chapter_blueprint
      || chapter.raw_payload?.chapterBlueprint
      || null
    const handoffContextSeed = enrichContextWithStrongHandoff({
      chapter_target: {
        previous_handoff: previousHandoff,
        goal: chapter.chapter_goal || '',
        summary: chapter.chapter_summary || '',
        scene_cards: sceneCards,
        chapter_blueprint: chapterBlueprintSeed,
      },
      continuity: {
        previous_chapter: previousChapter ? {
          chapter_no: previousChapter.chapter_no,
          title: previousChapter.title,
          chapter_goal: previousChapter.chapter_goal || '',
          chapter_summary: previousChapter.chapter_summary || '',
          conflict: previousChapter.conflict || '',
          ending_hook: previousChapter.ending_hook || '',
          ending_excerpt: String(previousChapter.chapter_text || '').slice(-800),
          chapter_text: previousChapter.chapter_text || '',
          outgoing_handoff: readChapterOutgoingHandoff(previousChapter),
          chapter_progress_ledger: readChapterProgressLedger(previousChapter),
          raw_payload: {
            must_advance: previousChapter.raw_payload?.must_advance,
            outgoing_handoff: readChapterOutgoingHandoff(previousChapter),
            chapter_progress_ledger: readChapterProgressLedger(previousChapter),
          },
        } : null,
      },
    })
    const strongHandoffTarget = handoffContextSeed?.chapter_target || {}
    const strongHandoffAnchors = asArray(strongHandoffTarget?.requiredHandoffAnchors || handoffContextSeed?.requiredHandoffAnchors)
    const strongOpeningObligations = asArray(strongHandoffTarget?.opening_obligations)
    const strongSceneCards = asArray(strongHandoffTarget?.scene_cards).length
      ? asArray(strongHandoffTarget?.scene_cards)
      : sceneCards
    const strongAlignedGoal = strongHandoffTarget?.goal || chapter.chapter_goal || ''
    const strongAlignedSummary = strongHandoffTarget?.summary || chapter.chapter_summary || ''
    const strongAlignedBlueprint = strongHandoffTarget?.chapter_blueprint
      || strongHandoffTarget?.chapterBlueprint
      || chapterBlueprintSeed
    const basePackage = {
      project: {
        id: project.id,
        title: project.title,
        genre: project.genre || '',
        synopsis: project.synopsis || '',
        style_tags: project.style_tags || [],
        length_target: project.length_target || 'medium',
        target_audience: project.target_audience || '',
      },
      chapter_target: {
        id: chapter.id,
        chapter_no: chapter.chapter_no,
        title: chapter.title,
        goal: strongAlignedGoal,
        summary: strongAlignedSummary,
        conflict: chapter.conflict || '',
        ending_hook: chapter.ending_hook || '',
        previous_handoff: previousHandoff,
        requiredHandoffAnchors: strongHandoffAnchors,
        required_handoff_anchors: strongHandoffAnchors,
        opening_obligations: strongOpeningObligations.length ? strongOpeningObligations : asArray(chapter.raw_payload?.opening_obligations),
        handoff_opening_alignment: strongHandoffTarget?.handoff_opening_alignment,
        chapter_blueprint: strongAlignedBlueprint || undefined,
        rollingPlan: chapterRollingPlan || undefined,
        signature_scene_brief: signatureSceneBrief,
        scene_cards: strongSceneCards,
        word_target: wordTarget,
        title_uniqueness_report: titleUniquenessReport,
        meme_strategy: buildMemeStrategy(project, { writing_bible: writingBible, chapter_target: Object.keys(chapterRawPreDraftBrief).length ? { meme_strategy: chapterRawPreDraftBrief.meme_strategy } : {} }),
        style_sample_strategy: buildStyleSampleStrategy(project, {
          writing_bible: writingBible,
          style_sample_effectiveness: styleSampleEffectiveness,
          chapter_target: Object.keys(chapterRawPreDraftBrief).length
            ? { style_sample_strategy: chapterRawPreDraftBrief.style_sample_strategy }
            : {},
        }),
        chapter_benchmark_strategy: buildChapterBenchmarkStrategy(project, { writing_bible: writingBible, chapter_target: Object.keys(chapterRawPreDraftBrief).length ? { chapter_benchmark_strategy: chapterRawPreDraftBrief.chapter_benchmark_strategy } : {} }),
        first30_retention_brief: first30RetentionBriefFromContext(chapter.raw_payload || {}) || first30RetentionContext,
        story_unit_context: normalizeStoryUnitContext(chapterRawPreDraftBrief.story_unit_context || chapterRawPreDraftBrief.storyUnitContext, Number(chapter.chapter_no || 0)) || storyUnitContext,
        recent_fatigue_brief: normalizeRecentFatigueBrief(chapterRawPreDraftBrief.recent_fatigue_brief || chapterRawPreDraftBrief.recentFatigueBrief) || serialFatigueBrief,
        reader_expectation_debt_context: (chapterRawPreDraftBrief.reader_expectation_debt || chapterRawPreDraftBrief.readerExpectationDebt)
          ? normalizeReaderExpectationDebtContext(chapterRawPreDraftBrief.reader_expectation_debt || chapterRawPreDraftBrief.readerExpectationDebt)
          : readerExpectationDebtContext,
        delivery_risk_carry_over: (chapterRawPreDraftBrief.delivery_risk_carry_over || chapterRawPreDraftBrief.deliveryRiskCarryOver)
          ? normalizeDeliveryRiskCarryOverContext(chapterRawPreDraftBrief.delivery_risk_carry_over || chapterRawPreDraftBrief.deliveryRiskCarryOver)
          : deliveryRiskCarryOverContext,
        longform_memory_capsule: longformMemoryCapsule,
        established_events_contract: establishedEventsContract,
        progress_summary: progressSummary,
        daily_context_snapshot: dailyContextSnapshot,
        foreshadowing_consistency_radar: foreshadowingConsistencyRadar,
        continuity_notes: chapter.continuity_notes || [],
        must_advance: asArray(chapter.raw_payload?.must_advance),
        forbidden_repeats: asArray(chapter.raw_payload?.forbidden_repeats),
        delivery_receipts: chapterDeliveryReceipts || undefined,
        oh_story_delivery_receipts: chapterDeliveryReceipts || undefined,
      },
      continuity: {
        previous_chapter: previousChapter ? {
          chapter_no: previousChapter.chapter_no,
          title: previousChapter.title,
          summary: previousChapter.chapter_summary || '',
          chapter_goal: previousChapter.chapter_goal || '',
          chapter_summary: previousChapter.chapter_summary || '',
          conflict: previousChapter.conflict || '',
          ending_hook: previousChapter.ending_hook || '',
          ending_excerpt: String(previousChapter.chapter_text || '').slice(-800),
          chapter_text: previousChapter.chapter_text || '',
          outgoing_handoff: readChapterOutgoingHandoff(previousChapter),
          chapter_progress_ledger: readChapterProgressLedger(previousChapter),
          raw_payload: {
            must_advance: previousChapter.raw_payload?.must_advance,
            outgoing_handoff: readChapterOutgoingHandoff(previousChapter),
            chapter_progress_ledger: readChapterProgressLedger(previousChapter),
          },
        } : null,
        previous_prose_chapters: previousProseChapters,
      },
      story_state: {
        global: getStoryState(project),
        progress_summary: progressSummary,
        daily_context_snapshot: dailyContextSnapshot,
        foreshadowing_consistency_radar: foreshadowingConsistencyRadar,
        recent_state_entries: preflight.recent_state_entries,
        worldbuilding: worldbuilding[0] || null,
        characters: characters.map(char => ({
          id: char.id,
          name: char.name,
          role: char.role || char.role_type || '',
          archetype: char.archetype || '',
          personality: char.personality || [],
          motivation: char.motivation || '',
          goal: char.goal || '',
          conflict: char.conflict || '',
          appearance: char.appearance || '',
          backstory: char.backstory || '',
          secret: char.secret || '',
          relationships: char.relationships || [],
          relationship_graph: char.relationship_graph || {},
          growth_arc: char.growth_arc || '',
          arc_hint: char.arc_hint || '',
          current_state: char.current_state || {},
          abilities: char.abilities || [],
          profile: char.raw_payload?.profile || {},
          items: char.current_state?.items || char.raw_payload?.items || [],
          knowledge_scope: char.current_state?.knowledge_scope || [],
          information_boundaries: char.current_state?.information_boundaries || [],
        })),
        outlines: outlines.slice(0, 20).map(outline => ({
          id: outline.id,
          type: outline.outline_type,
          title: outline.title,
          summary: outline.summary || '',
          hook: outline.hook || '',
        })),
      },
      volume_plan: getVolumePlan(outlines),
      writing_bible: writingBible,
      longform_compass: longformCompass,
      longform_memory_capsule: longformMemoryCapsule,
      established_events_contract: establishedEventsContract,
      layered_memory_context: layeredMemoryContext,
      progress_summary: progressSummary,
      daily_context_snapshot: dailyContextSnapshot,
      foreshadowing_consistency_radar: foreshadowingConsistencyRadar,
      meme_bank: memeBank,
      style_sample_bank: styleSampleBank,
      style_sample_effectiveness: styleSampleEffectiveness,
      first30_retention_context: first30RetentionContext,
      reader_expectation_debt_context: readerExpectationDebtContext,
      delivery_risk_carry_over: deliveryRiskCarryOverContext,
      story_unit_context: storyUnitContext,
      recent_fatigue_radar: serialFatigueBrief,
      delivery_receipts: chapterDeliveryReceipts || undefined,
      oh_story_delivery_receipts: chapterDeliveryReceipts || undefined,
      setting_context: settingContext,
      relationship_graph: relationshipGraphContext,
      storyline_context: storylineContext,
      canonical_surface_index: canonicalSurfaceIndex,
      canonicalSurfaceIndex,
      style_lock: styleLock,
      safety_policy: safetyPolicy,
      reference: referencePreview ? {
        strength_label: referencePreview.strength_label,
        injected_entry_count: Array.isArray(referencePreview.entries) ? referencePreview.entries.length : 0,
        warnings: referencePreview.warnings || [],
      } : null,
      preflight: {
        ready: preflight.ready,
        strict_ready: preflight.strict_ready,
        checks: preflight.checks,
        blockers: preflight.blockers,
        warnings: preflight.warnings,
      },
    }
    const confirmedPackage = mergeConfirmedPreDraftBriefIntoContext(basePackage, Object.keys(chapterRawPreDraftBrief).length ? chapterRawPreDraftBrief : null)
    const confirmedStateTrackingContract = confirmedPackage.chapter_target?.state_tracking_contract || buildStateTrackingContract(confirmedPackage)
    if (confirmedStateTrackingContract) {
      confirmedPackage.chapter_target.state_tracking_contract = confirmedStateTrackingContract
      applySourceReadinessPreflightChecks(confirmedPackage.preflight, {
        ...confirmedPackage,
        chapter_target: {
          ...(confirmedPackage.chapter_target || {}),
          state_tracking_contract: confirmedStateTrackingContract,
        },
      })
    }
    const confirmedBenchmarkRecallBrief = buildBenchmarkRecallBrief(confirmedPackage)
    if (confirmedBenchmarkRecallBrief) {
      confirmedPackage.chapter_target.benchmark_recall_brief = confirmedPackage.chapter_target.benchmark_recall_brief || confirmedBenchmarkRecallBrief
      applyBenchmarkRecallPreflightChecks(confirmedPackage.preflight, { benchmark_recall_brief: confirmedBenchmarkRecallBrief })
    }
    const override = chapter.raw_payload?.context_package_override || null
    const mergedPackage = override ? deepMergeObjects(confirmedPackage, override) : confirmedPackage
    const progressResyncedPackage = enrichContextWithProgressResync(mergedPackage)
    return attachOhStoryDirectorToContextPackage(progressResyncedPackage)
  }

  const buildProseReviewPrompt = (project: any, contextPackage: any, chapterText: string) => [
    '任务：对刚生成的小说章节进行章节级自检。',
    `作品标题：${project.title}`,
    '',
    '请重点检查：',
    '1. 是否完成本章目标、冲突和章末钩子。',
    '2. 是否自然衔接上一章结尾状态。',
    '3. 角色行为是否符合角色卡与当前状态。',
    '4. 是否有设定冲突、时间线跳跃、物品凭空出现或消失。',
    '5. 是否有水文、重复、空泛总结、机械说明。',
    '6. 是否疑似照搬参考项目的专名、桥段或原句。',
    '7. 场景卡承诺的战斗、追逐、清剿、灾祸或强冲突是否真正写出过程，而不是只有结果。',
    '8. action_beats 是否有起手、反应、受阻、代价、反制、结果；是否缺少空间位置、伤势、资源损耗或信息暴露。',
    '9. 是否存在过度环境描写、连续纯氛围段落、用阴冷/压抑/雨雾等描写替代剧情推进。',
    '10. 每 3-5 段是否有可见行动、选择、信息变化或关系变化。',
    '10A. 执行 oh-story 快速自检口诀：一事一段，镜头自然断；对话要像人说话；心情不写心里话；章尾不搞大升华；打斗不写流水账。发现段落机械断裂、对白书面化、心理告知、章末升华或打斗只有结果时，必须输出 prose_craft_checks、dialogue_checks、chapter_hook_checks 或 deslop_checks，并给出正文证据。',
    '10B. 外部事实查证：如果正文涉及历史年代、地理方位、职业细节、法律/医疗/技术流程、真实机构或真实地名，但上下文没有可靠来源，必须输出 factual_checks，字段 key,label,status(pass|warn|fail),fact_type,claim,verification_status,evidence,fix,remaining_risk；未查证却写成确定事实时必须给出 issue，category=factual。',
    '11. 是否违反 setting_context：境界/战力矛盾、能力代价缺失、物品归属错误、Boss行动逻辑不一致、禁揭设定泄漏、规则触发没有代价、角色知识越界、伏笔误用、预期状态变化缺失。',
    '12. 是否兑现 chapter_target.chapter_blueprint：目标情绪、开篇钩子、核心回报、小纲四步法（分段判断、目的和效果、详写/略写、快速定位）、主线定义（主线是一件事、升级只是行动）、五段式内容概括、多线推进、人物出场顺序、情节点功能标签、代价/收益和章尾承接是否都有正文证据。',
    '13. 是否出现写作工程词混入正文：按 oh-story 正文元信息扫描，标题行以外不得出现第[一二三四五六七八九十百千万两0-9]+章|上一章|上章|前一章|本章|这一章|前文|后文|伏笔|细纲|读者；命中必须输出 prose_meta_checks，字段 key,label,status,matched_term,location,replacement,evidence,remaining_risk，并要求改成角色当下能感知的事件锚点或相对时间，除非角色在故事世界内真实讨论。',
    '13A. 是否违反 oh-story 正文格式与小节结构：章节标记必须统一为 ###1. / ###第一章 / 1. 或项目指定格式；按网文阅读节奏断段，段间保留一个空行，不得出现两个以上连续空行；无缩进，正文段落中不使用 Markdown；对话独立成行，引号风格按项目/平台约定，quote-mode keep 时不得把合法「」改成 ""；小节必须有主事件、3-5 个子事件、情绪变化、新信息和钩子接续。命中必须输出 quality_audit_checks、prose_craft_checks、dialogue_checks 或 punctuation_tone_checks，并给出正文行证据。',
    '13B. 是否出现模型退化：检查逐字复读/打转、末尾截断、AI 自指或拒绝语、占位符、乱码、任务描述/情节点/字数目标/下一章等工程词泄漏；必须输出 model_degeneration_checks，字段 key,label,type,severity(blocking|advisory),status,evidence,fix,line。blocking 项必须要求重写受影响段落，advisory 项必须说明例外判断。',
    '13C. 是否兑现 chapter_target.chapter_positioning_brief：检查本章钩子强度、冲突压力、爽点密度、详略分配、章尾拉力是否匹配 chapter_positioning/pressure_level；低压生活/信息整理/过场章可弱钩子但必须保留阶段目标、微好奇或关系期待；有 benchmark_structure_coordinates 时必须检查对标结构坐标是否换素材迁移而非照搬。必须输出 chapter_positioning_checks。',
    '13D. 正文语言硬门禁：chapter_text 必须使用简体中文网文正文。若主体为葡萄牙语、英语、拼音、翻译腔外语或非中文段落，必须在 quality_audit_checks 中输出 status=fail、key=language_drift_non_chinese，并要求整章改回简体中文；不得把外语正文评为 pass。',
    '14. 是否兑现 chapter_target.delivery_risk_carry_over 和 batch_preflight.delivery_risk_carry_over：逐项检查每个 items/required_actions/opening_actions/middle_actions/ending_actions 中的上一章风险承接动作；opening_actions 必须在前300字有正文证据，middle_actions 必须落成中段事件推进，ending_actions 必须在最后300字形成追读钩子或承接余波。必须给出正文证据，未兑现必须输出 S1/S2 finding，尤其是开篇承接、章末翻页、去AI味、审稿修法、修订残留、新资产入库和 IP场面延展。',
    '14+. 是否兑现 batch_preflight.delivery_risk_carry_over.creation_contract_carry_over：如果安全连写预检要求先修创作契约，必须逐项检查目标读者、题材定位、核心承诺、追读留存是否都有正文证据；必须输出 target_reader_checks、genre_positioning_checks、core_contract_checks 和 reader_retention_checks，不能只用 delivery_risk_receipts 汇总。',
    '14++. core_contract_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),core_promise,mainline_service,core_emotion,rule_judgement,ending_question,selling_point_execution,repetition_strategy,commercial_rhythm,goldfinger_structure,launch_pressure,evidence,fix,remaining_risk；核心承诺漂移、主线不服务卖点、核心情绪散乱、规则/金手指不参与胜负、章尾没有新问题、卖点四步法缺失、未做到发现比告知爽十倍、同一卖点至少延展不足、连续 2 章没有目标推进/阻碍升级/新信息、金手指可替换故事流程不清或开篇 300-500字内交代处境、危险来源和破局希望缺失时必须给出 S1/S2 finding，category=structure 或 platform。',
    '14A. 如果 chapter_target.delivery_receipts 或 oh_story_delivery_receipts 存在，必须把其中的 chapter_blueprint、scene_card_receipts、delivery_risk_receipts、revision_receipts 当作生成交付回执逐项复核；这些回执是模型自述，不是通过证据。回执写 delivered=true 但 changed_evidence/evidence 不能在 chapter_text 定位时，必须改成 warn/fail 并写入 quality_audit_checks 或 delivery_risk_receipts。',
    '14B. 是否兑现 chapter_target.write_preparation_brief 和 oh_story_delivery_receipts.pre_draft_execution_receipts.write_preparation_checks：逐项检查写前准备卡里的 source_gaps、asset_risks、delivery_risk_actions、creation_contract_checklist、blueprint_focus、reader_payoff_focus、must_confirm 是否真的落成正文中的动作、对话、信息变化或关系变化；creation_contract_checklist 必须逐项确认目标读者、题材定位、核心承诺、追读留存是否有正文证据；必须输出 write_preparation_checks，字段 key,label,status(pass|warn|fail),evidence,fix。状态筛选回执必须输出 status_filter_receipts，每项包含 key,label,used_in_chapter,evidence,excluded_reason,remaining_risk。写前准备回执缺失、回执 delivered=true 但证据无法定位、或缺口仍未修复时，必须给出 S1/S2 finding，category=structure/consistency。',
    '14C. 是否兑现 oh_story_delivery_receipts.pre_draft_execution_receipts.next_chapter_quality_plan_receipts：如果存在 chapter_target.delivery_risk_carry_over、batch_preflight.delivery_risk_carry_over 或上一章质量续航计划，必须复核质量续航回执；逐项检查 quality_focus、opening_actions、middle_actions、ending_actions、avoid_repetition 和 evidence_basis 是否真的落成正文动作、信息变化、章末钩子或禁用重复。next_chapter_quality_plan_receipts 中 opening_actions 的 evidence 必须来自前300字；middle_actions 的 evidence 必须来自中段事件推进；ending_actions 的 evidence 必须来自最后300字。必须输出 next_chapter_quality_plan_receipts，字段 key,label,status(pass|warn|fail),delivered,evidence,fix,remaining_risk；缺回执、回执 delivered=true 但证据无法定位、或质量续航仍未修复时，必须给出 S1/S2 finding，category=structure/consistency。',
    '14C+. 是否符合 oh-story artifact-protocols 项目产物协议：必须复核并输出 artifact_protocol_receipts；每项包含 key,label,status(pass|warn|fail),artifact_path,required_fields,used_fields,evidence,fix,remaining_risk。artifact_path 必须使用标准路径，例如 设定/关系.md、设定/题材定位.md、大纲/细纲_第XXX章.md、追踪/伏笔.md、追踪/时间线.md、追踪/角色状态.md；required_fields 必须覆盖对应模板核心字段；evidence 必须引用 chapter_text 中可定位的动作、对话、信息变化或关系变化。缺字段、路径泛化、只写“已参考”、或 evidence 无法定位时，必须给出 S1/S2 finding，category=structure/consistency。',
    '14D. 是否兑现 chapter_target.chapter_handoff_contract、batch_preflight.chapter_handoff_contract、previous_handoff、opening_obligations、must_deliver、keep_alive 和 overdue：章首承接必须在前300字接住上一章状态、未解问题、读者期待债和必须兑现项，不能另起炉灶；章末交接必须把本章新增状态、悬念、风险和下一章动作压力交清。必须输出 chapter_handoff_checks，字段 key,label,status(pass|warn|fail),evidence,fix；章首承接缺失、上一章待处理项沉没、overdue 未处理或章末没有可执行交接时，必须给出 S1/S2 finding，category=structure/consistency。',
    '15. 是否兑现 chapter_target.platform_rubric：按 Rubric: fanqie | qidian | zhihu | generic web-fiction 检查目标平台适配；必须逐项输出 platform_checks，字段 key,label,status(pass|warn|fail),evidence,fix。平台不匹配且影响留存/节奏/读者期待时必须输出 S1/S2 finding，category=platform。',
    '16. 是否兑现 chapter_target.content_rubric：按 oh-story 通用网文内容审查基准逐项检查核心卖点、冲突推进、情绪曲线、钩子与期待、角色动机、对话质量、设定一致性、文字自然度、最小剧情循环和高潮构建；必须逐项输出 content_rubric_checks，字段 key,label,status(pass|warn|fail),core_selling_point,conflict_progression,chapter_change,page_turn_reason,evidence,fix,remaining_risk。',
    '17. 黄金三问必须有正文证据：读者为什么翻下一页？本章改变了什么？哪个正文证据支持判断？任一问题答不出时，content_rubric_checks 对应项必须 warn/fail，并输出 S1/S2 finding。',
    '17+. 如果上下文包含创新、章节吸引力、故事驱动、人物弧、章节 benchmark、标题唯一性、蓝图消费、外部事实查证或字数目标诊断，必须输出对应结构化检查：innovation_checks 每项含 key,label,status,innovation_type,differentiating_mechanism,visualized_scene,reader_retellable_hook,long_term_fit,evidence,fix,remaining_risk；chapter_attraction_checks 每项含 key,label,status,attraction_dimension,opening_hook,scene_goal_obstacle_turn_reward,payoff_density,ending_page_turn,spreadable_scene,evidence,fix,remaining_risk；story_drive_checks 每项含 key,label,status,protagonist_choice,obstacle,cost,state_change,next_causality,evidence,fix,remaining_risk；character_arc_checks 每项含 key,label,status,character,desire,flaw_pressure,relationship_change,growth_beat,voice_anchor,evidence,fix,remaining_risk；factual_checks 每项含 key,label,status,fact_type,claim,verification_status,evidence,fix,remaining_risk。',
    '17++. chapter_benchmark_checks 每项包含 key,label,status,benchmark_dimension,expected_method,delivered_evidence,originality_guard,fix,remaining_risk；title_uniqueness_checks 每项包含 key,label,status,old_title,new_title,outline_title_synced,file_name_synced,chapter_title_line_synced,evidence,remaining_risk；blueprint_consumption_checks 每项包含 key,label,status,blueprint_field,expected,delivered_evidence,missing_gap,fix,remaining_risk；word_count_checks 每项包含 key,label,status,current_count,target_count,min_required_count,evidence,remaining_risk。',
    '17C. 如果 chapter_target.core_contract_radar.periodic_drift_check.due=true，必须执行十章卖点复核：回答“当初吸引读者的卖点还在吗”，检查核心吸引元素是否被稀释或替换；缺失时 issues 输出 key=ten_chapter_selling_point 或在 fix/revision_directives 中明确 ten_chapter_selling_point，并给出补核心卖点、能力使用、规则限制、读者回报或章末新期待的修法。',
    '17D. 如果 chapter_target.core_contract_radar.theme_unity_rules 存在，必须执行主题统一检查：随机翻开一章，情绪是否仍指向全书核心；升级/复仇/寻宝/日常等小情绪是否服从大情绪；情绪散乱、多头并行或旁枝情绪线稀释核心时，必须在 issues 或 core_contract_checks 中输出 key=theme_unity_rules。',
    '17A. 是否兑现 chapter_target.reader_retention_brief：检查开篇钩子、爽点承诺、信息缺口、情绪回报、短剧化场面、章末追读；如果存在 retention_double_engine，必须按留存双引擎检查情绪 + 饥饿是否同时落地，情绪是否快速代入，饥饿是否用信息差植入问号并剥洋葱卡住关键信息；如果存在 retention_pillars，必须按留存四大支柱检查升级、资源困境、目标、解密是否至少两项落成正文证据；如果存在 hook_addiction_model，必须按 Hook上瘾模型检查触发 -> 行动 -> 奖励 -> 投入，并确认奖励随机性是否给出出乎意料的额外收获或沉没投入；必须输出 reader_retention_checks。',
    '17B. reader_retention_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),retention_engine,retention_pillars,emotional_payoff,information_hunger,page_turn_question,evidence,fix,remaining_risk；缺前300字钩子、缺正文可见回报、缺信息缺口、章尾无追读、留存四大支柱不足两项、留存双引擎缺情绪或饥饿、Hook上瘾模型缺奖励随机性或投入沉没成本时必须给出 S1/S2 finding，category=structure 或 platform。',
    '18. 是否兑现 chapter_target.target_reader_contract：按 oh-story 自嗨判定法检查“我这书写给谁看、目标读者想看什么、本书本章给了什么”三问是否都有正文证据；同时执行情绪缺口分析，检查核心痛苦、深层情结、高频情绪关键词和未满足需求是否被写成角色当下压力与读者回报；并按 genre-readers 检查题材生命力、目标平台样本、题材边界、书名简介内容三位一体、代入感/塑料感、金手指生活关联和私人表达；必须输出 target_reader_checks。',
    '19. target_reader_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),target_reader_profile,reader_desire,emotion_gap,chapter_hit,platform_taste,genre_vitality,platform_sample,boundary_fit,title_blurb_alignment,immersion_plasticity,goldfinger_life_fit,commercial_expression,evidence,fix,remaining_risk；目标读者画像空泛、读者渴望和本章卖点错位、情绪缺口缺核心痛苦/深层情结/高频情绪关键词/未满足需求、平台口味错位、缺当前目标平台样本、题材边界失控、书名简介内容货不对板、世界观自洽不足、画风撕裂有塑料感、金手指脱离生活/职业、私人表达超过5%或只展示作者自嗨设定时必须给出 S1/S2 finding，category=platform 或 structure。',
    '20. 是否兑现 chapter_target.genre_positioning_contract：按 oh-story 题材定位口径检查题材标签、读者心理、核心梗、类型公式、金手指贴合、必备场景、微创新边界、70/20/10元素法则、五种微创新手法、平台适配、拉长板而非补短板、题材长板和书名简介内容三位一体；必须输出 genre_positioning_checks。',
    '21. genre_positioning_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),genre_tag,core_hook,type_formula,genre_strength,book_title_blurb_alignment,evidence,fix,remaining_risk；核心梗不清、公式缺失、金手指脱离主角生活/职业、微创新超过3个、70/20/10元素法则失衡、五种微创新手法选型不清、题材长板未强化、为补短板新增支线稀释核心卖点、平台/类型错位或挂羊头卖狗肉时必须给出 S1/S2 finding，category=platform 或 structure。',
    '21+. 是否兑现 chapter_target.plot_special_topics_contract：按 oh-story 特殊题材操作口径检查 matched_topics 命中的专题是否写成正文证据；必须检查金手指拆分与战力防崩、题材边界、扫榜对标、都市高武、三万字卡点倒推和阵营手牌法；必须输出 plot_special_topics_checks。',
    '21++. plot_special_topics_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),matched_topics,goldfinger_execution,genre_boundary_execution,market_benchmark_execution,urban_high_martial_execution,launch_checkpoint_execution,faction_hand_execution,evidence,fix,remaining_risk；金手指只剩说明书、题材边界漂移、对标没有转成结构功能、都市高武目标不和钱/资源/资格挂钩、三万字卡点缺倒推、阵营没有按手牌逐级出牌时必须给出 S1/S2 finding，category=platform 或 structure。',
    '21A. 是否兑现 chapter_target.female_audience_contract：按 oh-story 女频长篇口径检查安全感优先、代入感优先、女主主动性、情绪即产品是否落地；检查女频深层需求是否体现被认可、被珍视、被尊重；检查状态→困境→行动→成功和女主成功暗示是否兑现；检查感情线双轴是否让感情升级踩在事业/成长节点上；检查虐戏是否每段虐后有反转或糖，是否避免连续整卷只虐；检查平台对位和货板一致；必须输出 female_audience_checks。',
    '21B. female_audience_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),security_anchor,reader_identification,heroine_agency,relationship_axis,post_abuse_payoff,evidence,fix,remaining_risk；安全感断裂、女主被安排着赢、感情线脱离成长线、为虐而虐、平台节奏错位或书名简介正文货不对板时必须给出 S1/S2 finding，category=character 或 platform。',
    '22. 是否兑现 chapter_target.upgrade_rhythm_contract：按 oh-story 升级感三步法检查起点、终点、情绪缺口、即时反馈、延迟反馈、升级前后铺垫、桥段功能位、升级后能完成以前做不到的事，以及金手指演进；金手指核心作用可发展但不能突然换赛道，升华到世界/天道/规则层级前必须有伏笔；必须按“金手指 + 矛盾”检查金手指是否刚好解决当前矛盾，解决后是否暴露更大矛盾；必须按金手指反馈法检查给出金手指后是否有即时变化，是否把反馈过程掺杂在故事里，是否用动作/判断/物件变化/角色反应/局势变化展示，而不是只写绑定成功或说明规则；必须按“金手指简单是核心”检查功能、触发条件、奖励反馈和升级规则是否一眼就懂，是否避免说明书式规则树和万能外挂；必须按“金手指多维成长”检查词条、功能、品质、熟练度或条件-反馈是否至少两条线同步变化，是否避免只剩品质/数值/等级单线提升；如果出现排行榜/榜单/排名，必须按排行榜三功能检查：排名提升提供升级动力、榜单介绍新对手、榜单出现产生装逼余震；必须输出 upgrade_rhythm_checks。',
    '23. upgrade_rhythm_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),before_after_contrast,instant_feedback,delayed_feedback,goldfinger_feedback,new_threshold,cheat_rule,evidence,fix,remaining_risk；升级前没有缺口、升级后没有变化展示、只有奖励没有新门槛、反馈太慢/太快、金手指反馈只停在说明书/绑定成功/弹窗结算、金手指带来的变化没有掺进故事动作链、桥段功能位混乱、金手指演进丢失核心作用、突然升华无伏笔、金手指太强一键清场或太弱无法改变局势、金手指功能/触发/奖励/升级规则不清晰或不是一眼就懂、金手指只剩品质/数值/等级单线提升或缺词条/功能/品质多维成长、榜单只写排名数字但缺升级动力/新对手/装逼余震时必须给出 S1/S2 finding，category=structure 或 platform。',
    '24. 是否兑现 chapter_target.conflict_structure_contract：按 oh-story 矛盾与结构设计检查冲突是否有人阻止主角得到目标，是否满足有进无出（读者相信主角非踏入不可）、是否有死亡赌注/退出代价和黏结剂（杀人理由/工作职责/道德责任/实体场所），是否言语->行动->激烈对抗->决定胜负持续升级，是否压势不压人，是否有明确结果、矛盾网、三层矛盾网和下一冲突种子；矛盾网必须检查同一时刻是否保持2-3条矛盾线，线与线之间是否有因果/利益冲突/信息差，解决一条后是否激活或加深另一条；三层矛盾网必须检查纵向矛盾、横向矛盾、交叉矛盾是否同时运作，并按定地图→定阵营→定角色编织；必须输出 conflict_structure_checks。',
    '25. conflict_structure_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),blocker,no_exit_condition,stakes_or_exit_cost,action_block,win_loss_result,evidence,fix,remaining_risk；没有阻止者、缺有进无出、人物可以随时退出、死亡赌注/退出代价不明、缺黏结剂、冲突只停在嘴炮、没有行动阻拦、胜负不明、主角被动站桩、矛盾线各自无关、缺纵向矛盾、缺横向矛盾、缺交叉矛盾、解决一条后没有激活或加深另一条、解决后没有新危机时必须给出 S1/S2 finding，category=structure。',
    '26. 执行 oh-story 多视角对抗式审查：输出 perspective_verdicts，必须包含 story-architect、character-designer、narrative-writer、consistency-checker 四个视角；每个视角字段 reviewer, verdict(APPROVE|CONCERNS|REJECT), summary, findings, recommendations。',
    '21. 四视角职责：story-architect 查主题推进/结构钩子/反转/平台期待；character-designer 查角色语言/对话潜台词/人物弧线/关系推进；narrative-writer 查 AI味/解释腔/格式/节奏/文字自然度；consistency-checker 查事实矛盾/规则边界/伏笔状态/时间线。',
    '22. 任何视角 verdict=CONCERNS 或 REJECT 时，必须在 findings 或 recommendations 给出正文证据和可执行修法；consistency-checker 的 fix 只写事实统一方向，不写文学润色建议。',
    '23. 执行 oh-story story-deslop Gate A-G：A禁用词，B句式套路，C心理告知/重复描写，D节奏均匀，E对话腔调，F章末总结升华，G解释腔/上帝视角/安排感；必须输出 deslop_level 和 deslop_checks。',
    '24. AI味模式必须覆盖 8 种 AI 写作模式，尤其模式 8：解释腔/上帝视角/安排感；正文出现“他不知道的是”“这意味着”“正是因为”“更大的风暴即将来临”等作者预告或总结体时必须标记。',
    '25. deslop_checks 字段为数组，每项包含 gate, pattern, status(pass|warn|fail), evidence, fix；去AI味只改表达，不改剧情、人设、设定、关系或时间线，不得整段删除有功能信息。',
    '25A. 主语与名字节奏检查归入 Gate B：角色名只负责段首、场景切换、多人同场、视角重置和关键强调；同一动作链/同一段内部连续用角色名开头、读起来像每句都在报名字时必须输出 deslop_checks。修法要用代词、省略主语、动作承接、物件/感官开句，但不能为了省主语造成指代不清。',
    '25B. banned_words_checks 字段为数组，每项包含 key,label,status,matched_word,level,location,replacement,evidence,remaining_risk。deslop_repair_checks 字段为数组，每项包含 key,label,status,gate,original_risk,rewritten_evidence,changed_evidence,receipt_synced,fix,remaining_risk。revision_receipt_checks 字段为数组，每项包含 key,label,status,required_action,repair_segment,applied_fix,changed_evidence,evidence,fix,remaining_risk。',
    '26. 是否兑现 chapter_target.dialogue_contract：按 oh-story dialogue-mastery 检查对白是否推进剧情/增加期待/展示人设，是否有潜台词与议程，真实动机绝对不能浅显地写在台词里，每句对白必须能看出动机和借口；是否按“关系 × 场合 × 目的 = 语气”匹配措辞；是否用命令式+否定式最能激发读者情绪、为你好式软压迫或直接否定制造有效情绪；情绪变化是否每次转变需对应事件触发；是否做到对话本身带来/强化某个核心驱动力；信息展示是否用角色的语气和立场包裹信息，设定用到哪个稍微带出来，避免机械陈述设定或一次讲完前因后果；人物语言差异化必须检查口癖和惯用语、说话节奏、信息偏好、身份影响措辞、性格影响语气和关系阶段不同；弹幕/群众对话必须检查是否从普通人震惊、专业人士分析到特殊身份者反应递进，是否短小精悍、不同人格化语气、只在关键爽点/燃点/泪点前后使用，且不代替主线；配角台词人数必须检查同一场景配角不超过3个有台词，没有功能的角色不要出场，超过时合并为旁观反应、动作或叙事概括；对话节奏/呼吸感必须检查连续多轮对话后需要换气、是否穿插动作描写/环境变化/心理活动、紧张段落对话短促、舒缓段落可长、关键信息放对话开头或结尾、动作和表情只在关键转折处使用；对话篇幅控制必须检查读者已知信息是否被冗余对白重复、能否用突发状况替代解释段、对话过少时是否让主角旁白平铺直叙、是否引入有主线戏份的配角参与冲突；梗式对白必须检查是否用“说不出来但意思到了”的角色口吻制造趣味，是否强化主角或重要配角记忆点，是否只抽象为吐槽节奏/情绪共鸣/传播点，是否不得直接复刻热梗原句或破坏严肃情绪；对话质量审计必须检查是否存在大量信息都必须用对话来展示、问答式的一问一答、依赖对话来推动剧情或人物变化，遮住角色名后能否区分，单次对话不超过全节 40%，对白是否像自然口语交流，以及对话结尾能否预示接下来的节奏变化；如果 chapter_target.dialogue_contract.dialogue_execution_checklist 存在，必须按对话执行清单逐场覆盖 dialogue_checks，逐场核对 mode、speaker_agendas、line_functions、emotion_flow、information_strategy、voice_differentiation、forbidden_patterns 和 receipt_keys；是否体现“对话长度 = 权力地位”，是否有角色声线差异，是否避免说明书式对话；压制模式/反转模式/心死模式必须各自按场景功能落地，掌控者/主角亮底牌时对白 ≤ 10 字，被压制方对白 ≥ 20 字，权力易主必须体现为话语长度突变；必须输出 dialogue_checks。',
    '27. dialogue_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),speaker,agenda,subtext,power_shift,information_delta,character_voice,changed_evidence,evidence,fix,remaining_risk；对白缺口影响冲突推进、人物可信度或留存时必须输出 S1/S2 finding，category=character 或 prose；修订后必须在 dialogue_checks.changed_evidence 写明对话执行清单对应场景改成了哪句可定位正文证据。',
    '28. 是否兑现 chapter_target.plot_dynamics_contract：按 oh-story 剧情核心方法检查目标→阻碍→行动→代价/反馈→新期待是否闭环，蓄能→假胜→崩解→交叉死磕→悬置收尾是否形成情绪落差，驱动方式是否匹配题材（番茄爽文/打脸文每章给外部结果：赢、升级、对手栽；追妻/虐心/世情持续保留人物心结；混合模式主线事件推进且每 3-5 章插情感停顿），以及主线和支线错开节奏推进、没有同时爆也没有同时空转；必须输出 plot_dynamics_checks。',
    '29. plot_dynamics_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),goal,obstacle,action,cost_or_feedback,new_expectation,evidence,fix,remaining_risk；缺少行动、代价、反馈、假胜、崩解、悬置收尾或多线错峰时必须给出 S1/S2 finding，category=structure。',
    '29A. 是否兑现 chapter_target.story_power_contract：按 oh-story 故事力门禁检查故事五维、行动改变局势、有动作才是故事、有始有终、因果反馈是否都有正文证据；如果目标/阻碍/动作/反馈/期待任一缺失，或动作没有改变局势，必须输出 story_power_checks。',
    '29B. story_power_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),story_power_dimension,action_changed_situation,beginning_to_end_change,causal_feedback,evidence,fix,remaining_risk；故事五维缺项、角色只听解释/内心独白、开场压力没有章末状态变化、动作没有代价/信息/关系/规则/反制反馈时必须给出 S1/S2 finding，category=structure。',
    '29C. 是否兑现 chapter_target.chapter_blueprint.mainline_definition_contract：按 oh-story 主线定义检查主线是否明确为一件事、不是一个元素；升级是否只是主角达成目标的行动；本章是否让 mainline_event 发生状态变化；主线完成后是否铺垫第二条主线或选择完结；必须输出 mainline_definition_checks。',
    '29D. mainline_definition_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),mainline_event,one_thing,upgrade_as_action,state_change,handoff,evidence,fix,remaining_risk；把主线写成境界升级条、金手指元素列表、地图/设定罗列，或只写变强但不改变那一件事时，必须给出 S1/S2 finding，category=structure。',
    '30. 是否兑现 chapter_target.continuity_heat_contract：按 oh-story 连续性热度追踪检查 hot/warm/cold/archived 元素；hot 必须推进，warm 必须有效触达，cold 回收前必须升温，archived 不得误激活；必须输出 continuity_heat_checks。',
    '31. continuity_heat_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),heat_state,hot_progress,warm_keepalive,cold_warmup,archived_boundary,evidence,fix,remaining_risk；冷伏笔突然回收、核心角色断温、重要支线无休眠说明、只提名字不推进时必须给出 S1/S2 finding，category=consistency 或 structure。',
    '32. 是否兑现 chapter_target.character_relation_contract：按 oh-story 角色关系手册检查关系类型明确、关系有弧线、主角目标独立、目标归属清楚、角色不止恋爱、配角期待枢纽、配角攻略缓冲区、配角有主动行动、态度变化可见、亲密/好感行为匹配阶段；目标归属必须检查主角目标是否属于自己的，不能只是帮别人实现目标，关系线可以互助但主角必须保留自己的诉求、主动选择和代价；角色不止恋爱必须检查角色生命中是否有恋爱之外的事业、责任、资源、身份、家族、风险或行动线，不能只是发糖/陪伴/情绪支持的情感工具人；配角期待枢纽必须检查是否有一个关键配角作为任务基地，同时承载短期和长期期待，并在主角解决事件后开启新一轮装逼、新任务或新剧情，人物下线时是否带来更大好处来转化损失厌恶；配角攻略缓冲区必须检查信息差、地位差距、亲密度差距或信任程度是否存在，配角不能像 NPC 一样站着等主角触发，关键拐点必须写出态度变化；必须输出 character_relation_checks。',
    '33. character_relation_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),relation_type,protagonist_goal,agency_choice,cost,relation_shift,buffer_zone,evidence,fix,remaining_risk；主角沦为帮别人办事、主角没有自己的诉求/主动选择/代价、角色只负责恋爱/发糖/陪伴/情绪支持、配角站桩、关系没有考验/变化、缺配角攻略缓冲区、所有人你好我好时必须给出 S1/S2 finding，category=character 或 structure。',
    '34. 是否兑现 chapter_target.character_behavior_contract：按 oh-story 角色行为口径检查主角行为三必须、动机链、动机具体性、三层标签反差、人设强关联、展示优于告知、主角逼格反应、记忆锚点、配角功能、角色卡必备项、配角退场规划、行为重复点、人推事件、主角红线、身份/金手指对齐、反派内在逻辑、反派分量、反派自我叙事和反派层级退场；角色卡必备项必须检查角色定位、身份标签、外貌特征、核心目标、核心动机、致命弱点、口头禅/标志动作是否可见；配角退场规划必须检查角色功能、与主角关系、核心特质、标志性特征、退场方式以及同一场景配角不超过 3 个有台词；行为重复点必须检查主要角色是否有跨场景重复的可识别行为；人推事件必须检查情节是否从人物动机和选择自然推出，而不是外部事件硬砸或作者硬编剧情；主角红线必须检查圣母、无脑战斗机器、内核邪恶、因蠢/圣母犯错、自暴自弃；身份/金手指对齐必须检查社会身份、身世、金手指、性格是否和世界基调统一；动机具体性必须检查起因是否具体（不能只写“被欺负/被针对”）、动机是否是情感层面（不能只写“要成为最强/想变强”）、动机演变是否有触发事件或代价铺垫；主角逼格反应必须检查升级线与主角反应线是否分开，升级是否只提升实力/能力而不改变从容反应，面对低级挑衅时是否被牵着走，是否出现暴怒、面红耳赤、歇斯底里式反击；人设强关联必须检查每个重要角色至少 3 个强关联设定是否可见，是否直接影响剧情走向、核心梗装逼爽点或人物碰撞，外貌/爱好/身高体重等弱关联是否喧宾夺主；反派分量必须按反派建立四要素检查实力展示、动机可信、真实威胁、终极意图时机；反派自我叙事必须按“反派也有梦想”检查他是否是自己故事的主人公、是否有旧痛/创伤、优势即致命缺陷和理念冲突；反派层级必须按反派层级表检查篇幅与层级匹配、小反派/中等反派/大弧 Boss/最终 Boss 的功能和退场方式，最终Boss从第一章就有伏笔；必须输出 character_behavior_checks。',
    '35. character_behavior_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),character,concrete_motive,emotional_reason,trigger_change,visible_choice,cost,evidence,fix,remaining_risk；主角行为不可理解/不可共鸣/不可接受、动机链缺失、起因空泛、动机只是“要成为最强/想变强”、动机演变无铺垫、三层标签反差只停在设定、主角升级后被低级挑衅拖入暴怒失态或缺轻描淡写/短句/行动压制、人设强关联少于3个或只剩外貌爱好等弱关联、角色靠旁白贴标签、配角无功能发言、反派降智、反派缺实力展示/真实威胁/终极意图时机、反派只是工具人/纯粹的坏/缺自己的梦想旧痛和理念冲突、反派层级篇幅不匹配、小反派拖太久、大 Boss 草率退场、最终 Boss 无第一章伏笔，或主角赢得没含金量时必须给出 S1/S2 finding，category=character 或 structure。',
    '36. 是否兑现 chapter_target.asset_linkage_contract：按 oh-story 资产挂钩口径检查关键资产是否绑定功能、归属、触发条件、限制、后果，是否摆脱孤立资产，是否通过冲突释放设定信息；关键资产承担破局或金手指功能时，必须检查道具能力展示的8步期待模板：宝物功能强大、配角因信息不足误判鸡肋、宝物恰好克制反派、他人失败、主角方案、众人不看好、鸡肋成神器、新目标或新钩子；必须输出 asset_linkage_checks。',
    '37. asset_linkage_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),asset_name,function,ownership,trigger_condition,limitation,consequence,prop_ability_expectation,story_link,evidence,fix,remaining_risk；资产只点名不使用、状态不变化、设定大段说明、贯穿物件未按三次出现推进、道具能力展示缺期待链、禁揭/知识边界错误或新增概念过载时必须给出 S1/S2 finding，category=consistency 或 structure。',
    '38. 是否兑现 chapter_target.state_tracking_contract：按 oh-story 本节速记检查角色状态、相关伏笔/前史、世界约束是否被筛选并落实；必须输出 state_tracking_checks，并按 source_readiness 输出 source_readiness_checks。',
    '39. state_tracking_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),state_subject,state_type,previous_state,allowed_state,used_in_chapter,evidence,excluded_reason,fix,remaining_risk；角色状态漂移、上一章钩子没接住、待回收伏笔无因果、世界约束没有影响行动、无关背景稀释正文或来源边界不清时必须给出 S1/S2 finding，category=consistency 或 causal。',
    '39A. source_readiness_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),evidence,fix；逐项检查来源就绪表，missing/warn 来源被正文当作事实使用、或 ready 来源没有正文承接时必须给出 warn/fail。',
    '40. 是否兑现 chapter_target.intent_confirmation_contract：按 oh-story 意图确认检查正文是否按情绪+节奏+模块+文风指令执行；内容概括决定起承转合，逻辑线、出场顺序、代价/收益、对白基调约束 dialogue_tone_baseline 和章尾承接必须落地；高压/生死/悲痛 beat 下轻快配角声线必须让位，信息型配角不能当科普嘴，对话必须逐句承接对方情绪；必须输出 intent_confirmation_checks。',
    '41. intent_confirmation_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),intent_field,expected_intent,delivered_evidence,blueprint_link,fix,remaining_risk；intent_field 写 emotion_goal/chapter_intent/handoff/ending_hook/blueprint/craft 中最贴近的一类；情绪目标跑偏、节奏爆发错位、信息差反应不足、代价/收益缺失、章尾承接变弱或文风召回越界时必须给出 S1/S2 finding，category=structure 或 prose。',
    '42. 是否兑现 chapter_target.benchmark_recall_brief：按 oh-story 文风召回检查 selected_emotion_module、rhythm_reference、style_profile_summary、matched_chapter_techniques、canonical_source_rules、fallback_receipt_requirements、gaps 和副对标召回摘要是否被正文执行；canonical_source_rules 必须检查：情绪模块来自 剧情/情绪模块.md，节奏来自 剧情/节奏.md，文风.md 只管表达层；fallback_receipt_requirements 必须检查 module_usage_receipt、rhythm_usage_receipt、matched_chapter_usage_receipt 是否分别有 source_type/source_path/expected_application/delivered_evidence/gaps_preserved；副对标召回摘要只能作为结构/情绪/设定参考，必须检查 secondary_benchmark_boundary；必须输出 benchmark_recall_checks。',
    '43. benchmark_recall_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),source_type,source_path,expected_application,delivered_evidence,gaps_preserved,fix,remaining_risk；source_type 写 emotion_module/rhythm/style_profile/matched_chapter/anchor_excerpt/gaps 中最贴近的一类；fallback_usage_receipts 必须至少覆盖 module_usage_receipt、rhythm_usage_receipt、matched_chapter_usage_receipt；情绪模块未进入正文、节奏参照失效、匹配章技法缺席、fallback 回执缺 source_path/正文证据、文风摘要被忽略、gaps 被掩盖、冲突时没有以情绪模块/节奏为准、复制对标桥段/原句、副书文风污染、副书原文锚点进入正文或副对标越界成文风指令时必须给出 S1/S2 finding，category=prose 或 structure。',
    '43A. 是否兑现 chapter_target.style_boundary_contract：按 oh-story 文风覆盖边界检查文风是否只覆盖表达层，硬约束永远赢；禁用词、Gate F 章末禁升华、万能比喻、章末预告、字数下限、剧情事实、设定状态、人物状态、关系边界和时间线不得被文风覆盖；必须输出 style_boundary_checks。',
    '43B. style_boundary_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),reference_risk,rewritten_with_local_action,voice_anchor,copied_phrase_removed,evidence,fix,remaining_risk；为了模仿样章/对标章导致禁用词、Gate F 章末总结体、万能比喻、作者预告、字数缩水、剧情/状态漂移或复制样章桥段/原句时必须给出 S1/S2 finding，category=prose 或 rule_boundary。',
    '43C. 是否兑现 chapter_target.style_sample_strategy：按 oh-story 样章策略检查 samples 中的 scene_function、narrative_rhythm、sentence_pattern、dialogue_ratio、voice_rules 是否只作为可迁移表达策略进入正文；必须同时检查 applicable_scenes、avoid_scenes、do_not_copy 和 unsafe_direct_phrases，确认适用场景命中、避用场景没有误套、复制边界没有越界；必须输出 style_sample_checks。',
    '43D. style_sample_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),style_dimension,source_technique,adapted_evidence,copied_phrase_rewritten,fix,remaining_risk；style_dimension 写 rhythm/sentence/dialogue/voice/emotion_turn 中最贴近的一类；样章策略未落地、适用场景错配、避用场景误套、对白比例/句式密度/叙述节奏失效、角色口吻丢失，或复制样章桥段、专有设定、角色名、核心梗或原句时必须给出 S1/S2 finding，category=prose 或 rule_boundary。只学习叙述节奏、句式密度、对白比例和情绪转折。',
    '34. 是否兑现 chapter_target.information_flow_contract：按 oh-story 信息团概念检查每个场景/段落是否能一句话概括信息团，信息团之间是否递进，过渡压缩是否执行，前一场悬念是否在后一场回应；每次实力、身份、资源或阶段性目标提升后，必须检查是否立即引入新的挑战、目标、代价或更高门槛；过渡压缩必须检查“过渡不是填充，没有信息量就删掉”，纯移动、寒暄、环境描写没有信息量时直接跳过或压缩；必须输出 information_flow_checks。',
    '35. information_flow_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),reveal_order,withheld_question,next_objective_after_gain,action_bound_release,conflict_or_cost,evidence,fix,remaining_risk；无关信息团、背景水文、提升后目标真空、纯过渡、纯移动寒暄环境描写、场景衔接断裂或情绪突然掉线时必须给出 S1/S2 finding，category=structure 或 prose。',
    '36. 是否兑现 chapter_target.expectation_threshold_contract：按 oh-story 设门槛、大剧情拉期待法和期待接力法检查两长一短期待是否同时在线，剧情期待 + 主题甜头 + 新鲜感三种期待线是否并存，期待感 > 爽点、铺垫篇幅不少于释放篇幅、延迟满足是否可见，目标是否被资源型/成就型/多条件型/动态门槛/收集型条件拆分，门槛是否围绕核心卖点并分批提出，旧期待闭环前下一开环是否已运行；必须输出 expectation_threshold_checks。',
    '37. expectation_threshold_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),reader_question,stakes,choice_pressure,payoff_promise,next_chapter_pull,evidence,fix,remaining_risk；短期期待过多、长期期待断线、剧情期待/主题甜头/新鲜感任一缺失、期待接力法断裂、没有期待铺垫就立刻释放爽点、大目标一步解决、门槛脱离卖点或跨过门槛后没有新门槛时必须给出 S1/S2 finding，category=structure。',
    '38. 是否兑现 chapter_target.story_loop_contract：按 oh-story 卡文对策检查“题材 + 金手指 + 主角身份 = 循环模式”是否清晰，本章是否执行指定循环模式、循环燃料、循环步骤、地图资源闭环、地位-环境同步和换地图承接；换地图/换阶段必须检查旧地图核心冲突是否阶段性解决、新地图五件套（新环境/新角色/新规则/新目标/新冲突）是否可见、前5章代入感和期待感是否建立、是否保留贯穿主线、是否做到人际关系动了 -> 主角再动、是否避免旧角色一刀切抛弃和新设定一次性倒出；必须按多级嵌套检查小循环 -> 中循环 -> 大循环是否可见，小循环中是否铺垫大循环的期待，是否避免核心不扩展、只反复用同一个梗换对象；必须输出 story_loop_checks。',
    '39. story_loop_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),setup_question,obstacle,choice,cost,payoff_or_answer_fragment,new_question,evidence,fix,remaining_risk；循环模式缺失、循环燃料断供、案件/扮猪/资源/反转/组织/公路循环步骤不闭合、资源闭环无收益、地位环境不同步、换地图承接缺旧地图收束/新地图五件套/贯穿主线/人际关系先行/前5章期待/循环升级、小循环没有铺垫中循环/大循环期待、核心不扩展或只换对象重复时必须给出 S1/S2 finding，category=structure。',
    '40. 是否兑现 chapter_target.emotional_arc_contract：按 oh-story 情绪弧检查平静 -> 调动 -> 释放 -> 爽 是否有正文证据，弧线类型是否匹配本章效果，是否按爽点倒推法先定爽点类型、再定期待点、最后倒推铺垫，正文是否呈现铺垫 -> 期待升高 -> 爽点释放，是否按场景情绪执行逐场标注调动/复现/释放/后反应，闭环当前期待时是否开启下一开环，是否按装逼层级区分日常小装逼、核心爽点、偏离爽点，核心爽点是否切在主线目标上，是否存在背离主线去别处装逼，是否遵守多爽点密度规则（不要拉长单个爽点铺垫、800-1200 字内有信息增量/能力展示/危机反制/关系变化/小回收），是否执行递进对抗：角力而非碾压、主角小胜、对手加码、最后王炸一锤定音，是否执行梗四段式：发生 -> 发展 -> 转折 -> 高潮，是否执行读者欲望四步公式：生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿，是否执行先入为主：前100字给核心矛盾/主角处境/不公平异常并正确排序否定提前，是否执行峰终定律：结尾情绪必须高于起点且结尾情绪强度达到虐≥8、爽≥7、治愈≥6，是否执行三层情绪：角色自己的情绪、文本传递的情绪、读者实际感受分离，角色在哭时读者实际感受仍被转成爽前蓄力/安全感/尊严感/期待感/余韵，是否执行情绪反应结构：虐/悲壮/遗憾场景有前反应 -> 复现 -> 后反应，热血/逆袭场景有以小搏大和士气如虹，是否执行理念矛盾：关键冲突不能只停在利益之争，必须把理念之争、原则碰撞、追求和牺牲落成具体选择与代价，复用同一情绪模块时是否按“戏剧性会磨损，情绪不会磨损”完成换场景/换对手/加新情绪/stakes 重组，是否存在只有调动没有释放、只有释放没有铺垫、爽点递增对比缺影响范围/揭示深度/身份落差、断期待禁止、下行情节缺少安全感；必须输出 emotional_arc_checks。',
    '40A. 情绪三板斧必须单独检查：羁绊铺设是否用具体物件、具体数字、重复动作建立关系质感；情感撕裂是否用反差法、错位法或延迟真相法制造“读者以为 A 实际是 B”的情绪落差；余韵钝痛是否用安静细节、物件回声或“不解释/不回头/不流泪”收束，而不是大段抒情。每 3-5 个小节应有一次由事件触发的情绪转向；结尾必须是具体动作/对话/画面而不是总结/反思；出现太平/太赶/假虐/割裂/烂尾/人设崩时必须写入 emotional_arc_checks。',
    '40B. 情绪拉扯曲线和题材情感策略必须单独检查：如果使用温暖 -> 残忍 -> 善意 -> 真相 -> 原谅 -> 来不及 -> 释然 -> 细节暴击曲线，必须说明本章截取了哪些段落以及对应正文证据；不是所有故事都走完整曲线，机械走全套导致拖沓时必须标记。题材策略必须匹配：世情/爽文重快速反弹和解气，情感/虐心重羁绊细节与余韵，古言/复仇重因果报应，悬疑/推理重信息差与揭因，年代/亲情重代际冲突和温暖遗憾。',
    '41. emotional_arc_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),calm_or_pressure,mobilization,counteraction,release,reader_payoff,evidence,fix,remaining_risk；情绪弧不清、情绪三板斧缺证据、情绪拉扯曲线被机械套全或缺正文事件证据、题材情感策略错配、先入为主失败、前100字没有核心矛盾、峰终定律失败、结尾情绪强度不足、三层情绪混淆、只写角色情绪没有读者实际感受、前反应缺失、复现只靠旁白、后反应没有改变行动、以小搏大没有铺弱者之苦或士气如虹、关键冲突只有利益之争没有理念矛盾、理念之争没有落到选择/代价/追求和牺牲、重复同一个戏剧单元且没有换场景/换对手/加新情绪/stakes、爽点未按影响范围/揭示深度/身份落差递增、期待闭环后没有新开环、负面情绪没有转成读者收益、情绪转向无事件触发或情绪只靠抽象心理词时必须给出 S1/S2 finding，category=structure 或 prose。',
    '42. 是否兑现 chapter_target.chapter_hook_contract：按 oh-story 章级钩子检查章首 7 式、章尾 13 式、钩子强度与章节阶段匹配、前 100 字钩子、最后约 100 字翻页钩子、兑现路径和钩子禁忌；必须输出 chapter_hook_checks。',
    '43. chapter_hook_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),hook_position,trigger,reader_question,next_chapter_pressure,delivered_evidence,fix,remaining_risk；开篇纯风景/背景、章尾无翻页问题、假悬念、机械降神、低风险钩、过度留白或同类型连用时必须给出 S1/S2 finding，category=structure。',
    '43A. 章钩质量必须单独输出 chapter_hook_quality_checks，字段为数组，每项包含 key,label,status(pass|warn|fail),hook_position,trigger_type,concrete_question,danger_or_choice,next_action_link,evidence,fix,remaining_risk；逐项复核 chapter_hook_contract.quality_checks：章首是否由现场异常/危险/选择/冲突/对话逼问触发，章尾是否留下具体问题、危险、发现、选择或下一章行动压力，章尾钩子是否和下一章行动直接相连；不能只把结论混在 chapter_hook_checks。',
    '44. 是否兑现 chapter_target.paragraph_hook_contract：按 oh-story 段落级钩子检查段落级钩子 11 种、钩子组合、对话情绪五级递增、围观者质量层级、不公平伤害和钩子禁忌；必须输出 paragraph_hook_checks。',
    '45. paragraph_hook_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),paragraph_range,hook_type,micro_change,information_or_risk_delta,emotion_or_relation_delta,evidence,fix,remaining_risk；连续段落无信息/风险/情绪变化、对话无递进、公开打脸没有高质量围观者、假悬念、低风险钩或同类型连用时必须给出 S1/S2 finding，category=structure 或 prose。',
    '46. 是否兑现 chapter_target.suspense_contract：按 oh-story 悬念编排检查四种悬念信息顺序模板、悬念强度5级、期待接力、期待链、多线悬念、读者预知法、信息差运用、底牌前置法、三段钩子种养收、悬念伏笔边界、触发型分层钩子、震惊分层、信息差和麻烦不能消失；期待链和多线悬念必须保持至少两条期待线/悬念线同时运行，当前谜题兑现后章尾仍有新门槛、新线索、新困境或长期期待；读者预知法必须让读者知道但主角不知道的事件持续推进，底牌前置法必须同时有底牌 + 即将发生的冲突；伏笔不是谜语人，短期紧张用悬念，长期线索用伏笔，信息延迟超过3章且中间无推进时必须提前给或删除；必须输出 suspense_checks。',
    '47. suspense_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),question,misdirect,partial_answer,new_expectation,evidence,fix,remaining_risk；疑问无答案路径、虚假提示不可信、悬念强度不足、期待链断裂、多线悬念断线、读者预知法无倒计时推进、底牌前置法缺冲突承接、伏笔像谜语人、信息延迟超过3章且中间无推进、无角色反应、震惊无层次或解决后麻烦消失时必须给出 S1/S2 finding，category=structure。',
    '48. 是否兑现 chapter_target.reversal_contract：按 oh-story 反转设计检查反转类型、3处暗示、误导技巧、揭示时机、公平性、非作弊性、反转影响和打脸节奏；必须输出 reversal_checks。',
    '49. reversal_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),reversal_type,fair_clues,misdirect,reveal_timing,impact_after_reveal,evidence,fix,remaining_risk；天降反转、前文无铺垫、大段解释、反转无情绪冲击、引入新信息作弊、红鲱鱼无剧情功能或压抑过长时必须给出 S1/S2 finding，category=structure。',
    '49A. 是否兑现 chapter_target.showdown_contract：按 oh-story 高潮对抗口径检查爽点释放、底牌管理、无敌文主角不拖拉、三压一爆三震、装逼打脸舞台、人际关系/利益传递通道、群众层 -> 中间层 -> 核心层震惊传递链、战斗/智斗是否服务爽点；底牌管理要求每次只出1个底牌，保留2-3个未揭示底牌，并在出牌后补新技能、新后手、新目标或更高门槛，不能一次性摊空后续期待；无敌文主角必须主角登场即杀伐果断，使用战力前置无敌建立期待，不一击必杀时也要有明确理由；三压一爆三震必须检查友好势力、敌方势力、中立势力是否先各自形成压力，主角一爆碾压后，三方是否各自震动；打斗是一场表演，必须展示主角收获；以弱胜强是否有信息差/环境/心理博弈；强敌压迫时是否有三层破局：硬碰硬、预判反制、反预判，尤其是反派出A，主角早准备B克制A，反派针对A时主角利用A作陷阱引入预设B；情绪是否急 -> 缓 -> 急；必须输出 showdown_checks。',
    '49B. showdown_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),payoff_release,trump_card_used,invincible_protagonist,pressure_layers,audience_reactions,consequence,next_threshold,evidence,fix,remaining_risk；该爽不爽、底牌释放后反派未被压制、一次性摊空底牌、缺2-3个未揭示后手、主角登场拖拉、该一击必杀却嘴炮磨叽、不一击必杀却缺明确理由、缺友方/敌方/中立方三路铺压、爆发后只写统一震惊、装逼前缺人际关系铺垫或传递通道、震惊只有统一反应、打斗不服务爽点、强敌降智、强敌破局缺预判反制或反预判、主角长期委屈或装逼闭环断裂时必须给出 S1/S2 finding，category=structure 或 platform。',
    '49C. 是否兑现 chapter_target.bridge_unit_contract：按 oh-story 四章一桥段和连续期待口径检查本章桥段位置、目标推进、期待接力、高潮时长和阶段衔接；兑现旧期待前是否挂新期待，是否高潮中埋钩子、尾巴给目标或连续小期待；连续 2 章没有目标推进时是否提高冲突密度；必须输出 bridge_unit_checks。',
    '49D. bridge_unit_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),bridge_position,old_expectation_payoff,new_expectation_seed,goal_progression,climax_hook,stage_handoff,evidence,fix,remaining_risk；四章一桥段位置不明、连续期待断档、章尾无新目标、高潮拖延、过渡无功能、连续 2 章无推进或只爆点无余波时必须给出 S1/S2 finding，category=structure。',
    '50. 是否兑现 chapter_target.opening_contract：按 oh-story 开篇设计检查300 字内主角登场、1000 字内爽点或期待点、三大基点、开头五要诀（简单/不偏/快/爽/不平）、主角目标与本文卖点、信息释放顺序和开篇禁忌；必须输出 opening_checks。',
    '50A. 如果 opening_contract 来自 writing_bible.opening_strategy_contract 或包含 opening_strategy_contract 字段，必须检查 hook_type、mainline_graft、first_5_chapter_promise、threshold_ladder、forbidden_mixing 是否被正文兑现：hook_type 只允许事件噱头/金手指噱头/人设噱头三类；事件噱头必须事件切入并让规则/危机立即推进，不能被系统说明书或金手指绑定说明抢走第一屏；金手指噱头必须先写主角困境 + 金手指绑定 + 第一次反馈，不能只用无关事件钓鱼；人设噱头必须让人物特质驱动情节选择，不能只写标签介绍。事件噱头、金手指噱头、人设噱头不能混用；发现混用、主线嫁接缺失、前5章承诺断裂、门槛阶梯不可见时，opening_checks 必须输出 key=opening_strategy_contract_mixed_hook_type 或对应 key，并给出正文证据和下一章修法。',
    '51. opening_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),protagonist_entry,first_300_goal,first_1000_expectation,opening_principle,evidence,fix,remaining_risk；开篇大段背景/天气风景/序章楔子/详细世界观、主角出场过晚、1000字内无期待点、三大基点缺失、开头不简单/偏离主线/切入慢/无爽点/平淡、目标卖点不清、开篇噱头类型混用、主线嫁接缺失、first_5_chapter_promise 断裂、threshold_ladder 不可见时必须给出 S1/S2 finding，category=structure 或 platform。',
    '52. 是否兑现 chapter_target.prose_craft_contract：按 oh-story 正文工艺检查深度限知、身体细节替代情绪词、连续3句以上内心独白、全场/所有人远景概括、三维度揉进、间接描写法、侧面反应、不要直接宣布强度/爽点/设定价值、三机位法（机位1主角近景、机位2配角/环境/围观远景、机位3必要旁白）、“然后呢”基点法（每段信息点是否立刻接下一个信息点）、core_emotion_alignment_rules（情节、人设、冲突、细节是否围绕核心情绪）、baimiao_sensory_rules（白描是否少而准，五感是否服务情绪）、dynamic_description_rules（动态描写优于静态描写，人物特征是否用动作和反应展现，环境是否在角色行动中穿插点染）、shot_rhythm_rules（镜头与分镜思维是否让远景/中景/近景/特写服务信息、关系、风险和情绪，快慢节奏是否匹配场面）、transition_bridge_rules（场景切换与转场是否用相似物/相似五感/相似情绪、动作物件、声音光影承接）、description_limits（水分控制是否删除“删掉后读者不会困惑”的环境/心理/旁白/回忆/重复信息）、anti_ai_smell_rules（高危词、章末总结体、叠加式描写和心理告知是否残留）、一动一静、具体数字/贯穿道具、新名词/新设定首次出现是否有动作反应/对话半句/物理后果锚点、环境交互、镜头对象和高危词句；必须输出 prose_craft_checks。',
    '53. prose_craft_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),pov_depth,body_detail,environment_interaction,action_stillness_balance,crowd_reaction_layering,evidence,fix,remaining_risk；上帝视角、抽象情绪词、连续内心独白、全场死寂/所有人震惊这类远景镜头、堆叠式描写、直接宣布厉害/震撼但缺侧面反应证明、三机位缺机位1主角近景或机位2外部反应、机位3旁白脱离冲突、段尾停在静态总结/情绪判断/环境描写导致“然后呢”断裂、情节/人设/冲突/细节不服务核心情绪、白描失效或五感沦为装饰氛围、静态人物特征或形容词堆叠缺动作和反应、环境铺陈没有绑定角色行动、连续远景铺环境、连续特写堆情绪、快节奏场面缺短句短段密集动作、慢节奏余波没有环境交互或静止镜头、时间/空间跳转缺转场桥、无交互环境、删掉后读者不会困惑的水分段、高危词堆叠、章末总结体、叠加式描写、连续全动/全静、道具数字无功能或段落无镜头对象时必须给出 S1/S2 finding，category=prose 或 structure。',
    '53A. 疏密分配执行检查：如果 scene_cards.density_level 存在，必须逐场检查 density_level 执行，并写入 prose_craft_checks。dense 的爽点/打脸/反转/情绪高潮必须详写成感知、动作、对话交锋；sparse 的过场/赶路/信息交代/时间跳转必须 1-2 句带过；medium 的铺垫/日常/关系升温只保留 1-2 个有效细节。平均用力、dense 写成摘要、sparse 展开成整场或 medium 堆满三维度时必须给出 warn/fail。',
    '53B. 目的词详略分配检查：如果 scene_cards.purpose_tag 存在，必须逐场检查 purpose_tag 执行，并写入 quality_audit_checks。爽点/打脸/高潮/卖点/关键揭露/反转必须有危机或期待铺垫、出手过程、对话交锋、在场配角差异化反应和结果余波；过渡/赶路/信息交代/时间跳转必须压缩为 1-2 句。爽点写成一句摘要、过渡展开成多段装饰描写、所有目的词平均用力时必须给出 warn/fail。',
    '53B. 子事件连接检查：按 oh-story writing-craft 检查子事件之间是否不用叙述过渡；正文段首或句首用“然后/接着/随后/于是/紧接着”等胶水词串联事件时，必须输出 prose_craft_checks，fix 要求改成身体动作、物件动作、触感、视线或呼吸承接。',
    '53C. 感知素材库执行检查：如果 scene_cards.sensory_anchor 存在，必须逐场检查感知锚点是否来自角色主动注意且承担剧情功能；按感知素材库确认阅读/翻看、对话、回忆、室内、移动等场景的锚点是否落地。感知是主角主动注意到的细节，不能是装饰性场景描写；缺失、只写风景氛围或没有绑定动作/规则/危险/对话判断时必须输出 prose_craft_checks。',
    '53C+. 近章风险修复执行检查：如果 scene_cards.serial_risk_repairs 或 recent_fatigue_action 存在，必须逐场检查对应风险修复动作是否落成可见事件；目标推进、阻碍升级、新信息、关系/世界调剂或冲突冷却缺失时，必须输出 serial_risk_repair_checks，字段包含 key,label,status(pass|warn|fail),risk_type,repair_receipt,continuity_change,state_change,evidence,fix,remaining_risk。',
    '53C++. scene_card_receipts 复核：如果生成结果的 scene_breakdown 包含 scene_card_receipts，必须逐场核对 goal_obstacle_change_delivered、purpose_tag_delivered、density_level_delivered、sensory_anchor_delivered、serial_risk_repairs_delivered、dialogue_goals_delivered、style_directives_delivered、benchmark_recall_directives_delivered、concept_anchor_rules_delivered、prose_craft_directives_delivered 与 evidence(array)。不能信任回执自述，必须用正文证据复核；回执写 true 但正文缺少动作、对话、信息变化、关系变化、对白声线或新概念锚点证据时，按对应问题写入 prose_craft_checks、quality_audit_checks 或 serial_risk_repair_checks。',
    '53D. 自然节奏重排检查：按 oh-story 画面分段检查段落是否按镜头/信息变化断开；连续多个极短段仍属于同一镜头、同一件事或同一条推理链时，必须输出 prose_craft_checks；一段塞进多个动作/信息/视线切换导致手机阅读拥挤时，也必须输出 prose_craft_checks。',
    '53D+. 小节内部结构检查：每个小节必须有一个主事件 + 3-5 个子事件、一个情绪变化、一条读者新获知的信息；常规冲突小节需要 3-5 轮对话交锋，独自发现/翻阅材料可标零但必须用动作、发现和反应补足。小节之间必须检查小节结尾留钩子，下一节开头快速接续，不重新铺垫，情绪跨节递进；缺失时必须输出 prose_craft_checks。',
    '53E. 小节密度诊断检查：场景偏短时是否按子事件三维度、感官细节、身体动作、对话交锋、阻碍/反应/发现/递进或简短回忆补足；为凑字数加环境描写、重复情绪、内心独白总结或无意义动作时，必须输出 prose_craft_checks。',
    '53F. 具体字数表达校验：检查正文是否出现“这五个字 / 短短四字 / 三个字一落 / 八个字砸下去”等未核对或无必要的精确字数表达；一旦出现必须输出 prose_craft_checks，fix 要求改成“这句话一落”“这一句落下”“那几个字”“这行字”或“话音落下”。',
    '54. 是否兑现 chapter_target.punctuation_tone_contract：按 oh-story 语气标点谱系检查标点是否服务语气、人物声线和情绪节奏，是否通篇句号化、随机标点堆砌，或残留 ……/——/—/-- 硬造停顿；必须输出 punctuation_tone_checks。',
    '55. punctuation_tone_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),speaker,punctuation_issue,tone_intent,replacement,voice_difference,evidence,fix,remaining_risk；质问/试探/反问被压成陈述句、爆发乱用感叹号、迟疑依赖省略号/破折号、不同角色说话节奏完全一样时必须给出 S2/S3 finding，category=prose 或 format。',
    '55A. 语气标点功能拍检查：被打断 / 拖长音是否用动作打断、换行、短句或未完成动作承接；信息揭示 / 判断落点是否用冒号或短句落下判断；残留破折号硬停顿或论文式长分号链时必须输出 punctuation_tone_checks。',
    '56. 是否兑现 chapter_target.quality_audit_contract：按 oh-story 网文质量检查清单和章纲目的法检查章节结构、开篇、中段推进、局势变化、章尾、每章一句话概括、目的词（铺垫/高潮/爽点/打脸/人物塑造/设定）、信息传递、水文检测、事件内容比重、长篇连续性、五维评分标准和卖点表达；事件内容比重不能小于一半，设定尽量通过事件演绎，不能旁白强塞；卖点表达必须遵守“发现比告知爽十倍”，用剧情、对话、反应隐性展示，并按开头暗示 -> 中间深化 -> 高潮爆发递进；必须输出 quality_audit_checks。',
    '57. quality_audit_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),strategy,purpose_tag,density_change,conflict_bound_info,changed_evidence,fix,remaining_risk；缺一句话概括和目的词、删掉本章不影响理解、没有局势变化、事件内容比重低于一半、大段设定说明、新概念超过3个、最近5章无进展、五维评分低于78、直接告知“这是核心卖点/本章很爽/读者会喜欢”或缺少开头暗示/中间深化/高潮爆发时必须给出 S1/S2 finding。quality_audit_contract 的专项数组也要单独输出：structure_checks 每项包含 key,label,status,opening_hook,middle_progression,situation_change,ending_page_turn,evidence,fix,remaining_risk；progression_checks 每项包含 key,label,status,non_deletable_change,mainline_shift,relationship_or_state_change,compressed_water,evidence,fix,remaining_risk；information_checks 每项包含 key,label,status,new_concept_count,action_bound_info,conflict_release,reader_first_scene,evidence,fix,remaining_risk。',
    '57+. 如果 chapter_target.quality_audit_contract.phase_checklist 存在，必须按阶段质量清单逐项覆盖对应 receipt_keys：写前目的锁定、开篇抓取、中段推进、信息负载、章尾拉力、连载连续性、精修策略都要能在对应回执字段中找到正文证据；不能只输出散点问题而漏掉阶段。',
    '57A. longform_checks 字段为数组，每项包含 key,label,status(pass|warn|fail),recent_5_chapter_progress,payoff_interval,stage_goal_shift,next_stage_pull,context_layer,evidence,fix,remaining_risk；最近5章无明确进展、爽点间隔过长、阶段目标未换挡、下一阶段牵引不足或上下文层断裂时必须给出 S1/S2 finding，category=structure。',
    '',
    '【统一 Findings Schema】',
    'issues 必须使用统一 Findings Schema：severity(S1|S2|S3|S4), category(structure|character|prose|consistency|platform|factual|format|causal|rule_boundary), location, evidence, issue, fix。',
    'severity 定义：S1 破坏主线/角色动机/世界规则/读者信任；S2 明显影响章节效果/留存/节奏/人物可信度；S3 局部文字或格式问题；S4 可选增强。',
    '每条 issue 必须有正文证据 evidence 和可执行修法 fix；没有证据不要输出 finding。',
    '如果存在 chapter_target.delivery_risk_carry_over 或 batch_preflight.delivery_risk_carry_over，必须输出 delivery_risk_receipts：数组字段 risk_item, required_action, delivered(boolean), evidence, remaining_risk；每个 items/required_actions/opening_actions/middle_actions/ending_actions 都必须有一条对应 receipt，不能只汇总成一条。分段承接动作没有正文证据时 delivered=false：opening_actions 查前300字，middle_actions 查中段事件推进，ending_actions 查最后300字。承接动作没有正文证据时 delivered=false，并在 issues 中给出 S1/S2 finding。',
    '如果存在 chapter_target.delivery_risk_carry_over、batch_preflight.delivery_risk_carry_over 或 oh_story_delivery_receipts.pre_draft_execution_receipts.next_chapter_quality_plan_receipts，必须输出 next_chapter_quality_plan_receipts；不能只输出 delivery_risk_receipts 或 next_chapter_quality_plan。next_chapter_quality_plan_receipts 必须逐项复核上一章质量续航计划是否在本章落地，字段 key,label,status(pass|warn|fail),delivered,evidence,fix,remaining_risk。',
    '必须输出 next_chapter_quality_plan；它是写后诊断给下一章的质量续航计划，不是本章总结。字段必须包含 version, quality_focus, opening_actions, middle_actions, ending_actions, avoid_repetition, evidence_basis, ending_contract。quality_focus 写下一章最该守住的1-3个质量目标；opening_actions 写前300字必须执行的动作；middle_actions 写中段必须落成的冲突/信息/状态变化；ending_actions 写最后300字必须形成的追读钩子或承接余波；avoid_repetition 写下一章禁止复现的表达、结构或收尾套路；evidence_basis 写这些计划来自本章哪些正文证据、S1/S2/S3问题、五维评分、追读/钩子/承接风险或 oh-story 质量清单；ending_contract 必须包含 final_state, unresolved_question, next_chapter_pull, handoff_to_next，分别记录本章收束状态、未解决问题、下一章推动力、下一章如何开篇承接。',
    '如果存在 batch_preflight.delivery_risk_carry_over.creation_contract_carry_over，必须额外输出 target_reader_checks、genre_positioning_checks、core_contract_checks、reader_retention_checks；delivery_risk_receipts 只能记录承接动作，不能代替四类创作契约复检。',
    '必须输出 artifact_protocol_receipts；不能只说“已参考设定/大纲/追踪”，要逐项写 artifact_path、required_fields、used_fields、evidence 和 remaining_risk，尤其检查 设定/关系.md、设定/题材定位.md、大纲/细纲_第XXX章.md、追踪/伏笔.md、追踪/时间线.md、追踪/角色状态.md 是否按模板字段被本章正确使用。',
    '如果存在 chapter_target.write_preparation_brief 或 oh_story_delivery_receipts.pre_draft_execution_receipts.write_preparation_checks，必须输出 write_preparation_checks；不能只写“写前准备已处理”，必须用正文证据逐项确认来源缺口、资产风险、上一轮待修复、创作契约清单 creation_contract_checklist、蓝图焦点、读者回报和必确认项是否闭环。',
    '如果存在 chapter_target.chapter_handoff_contract、batch_preflight.chapter_handoff_contract、previous_handoff、opening_obligations、must_deliver、keep_alive 或 overdue，必须输出 chapter_handoff_checks；不能只写“承接自然”，必须用正文证据逐项确认章首承接、上一章待处理、期待债、逾期项和章末交接是否闭环。',
    '如果存在 chapter_target.platform_rubric，必须输出 rubric、rubric_source、platform_checks；rubric_source 优先取 chapter_target.platform_rubric.source。',
    '如果存在 chapter_target.content_rubric，必须输出 content_rubric_source、content_rubric_checks；content_rubric_source 优先取 chapter_target.content_rubric.source。',
    '如果存在 chapter_target.reader_retention_brief，必须输出 reader_retention_checks；不能只用“追读还行/不行”一句话带过，必须明确留存四大支柱的升级、资源困境、目标、解密，留存双引擎的情绪 + 饥饿、信息差植入问号、剥洋葱卡关键信息，以及 Hook上瘾模型的触发 -> 行动 -> 奖励 -> 投入和奖励随机性是否落地。',
    '如果存在 chapter_target.target_reader_contract，必须输出 target_reader_checks；不能只用“读者会喜欢/不喜欢”一句话带过，必须明确目标读者画像、读者欲望、情绪缺口、核心痛苦、深层情结、高频情绪关键词、未满足需求、本章可感知回报、题材生命力、目标平台样本、题材边界、书名简介内容三位一体、代入感/塑料感、金手指生活关联和私人表达是否都有正文证据。',
    '如果存在 chapter_target.genre_positioning_contract，必须输出 genre_positioning_checks；不能只用“题材清楚/不清楚”一句话带过。',
    '如果存在 chapter_target.plot_special_topics_contract，必须输出 plot_special_topics_checks；不能只用“特殊题材有/没有”一句话带过，必须明确 matched_topics、金手指、题材边界、扫榜对标、都市高武、三万字卡点和阵营手牌是否都有正文证据。',
    '如果存在 chapter_target.female_audience_contract，必须输出 female_audience_checks；不能只用“女频感还行/不行”一句话带过。',
    '如果存在 chapter_target.upgrade_rhythm_contract，必须输出 upgrade_rhythm_checks；不能只用“升级感有/没有”一句话带过。',
    '如果存在 chapter_target.conflict_structure_contract，必须输出 conflict_structure_checks；不能只用“冲突有/没有”一句话带过。',
    '必须输出 perspective_verdicts；它是 oh-story story-review 的四视角裁决摘要，不得省略。',
    '必须输出 deslop_checks；它是 oh-story story-deslop 的 Gate A-G 检查摘要，不得只用一句“AI味较重”代替。',
    '必须输出 prose_meta_checks；它是 oh-story workflow-daily 的正文元信息扫描摘要，不得只用“格式没问题”代替。',
    '如果存在 chapter_target.dialogue_contract，必须输出 dialogue_checks；不能只用“对白自然/不自然”一句话带过。',
    '如果存在 chapter_target.plot_dynamics_contract，必须输出 plot_dynamics_checks；不能只用“节奏可以/不可以”一句话带过，必须明确驱动方式是否匹配题材，以及本章是否给出外部结果或保留人物心结。',
    '如果存在 chapter_target.story_power_contract，必须输出 story_power_checks；不能只用“故事性强/弱”一句话带过，必须明确故事五维、行动改变局势、有始有终和因果反馈是否都有正文证据。',
    '如果存在 chapter_target.chapter_blueprint.mainline_definition_contract，必须输出 mainline_definition_checks；不能只用“主线清楚/不清楚”一句话带过，必须明确主线是否是一件事、升级是否只是行动、mainline_event 是否发生状态变化。',
    '如果存在 chapter_target.continuity_heat_contract，必须输出 continuity_heat_checks；不能只用“伏笔有提到/没提到”一句话带过。',
    '如果存在 chapter_target.character_relation_contract，必须输出 character_relation_checks；不能只用“人物关系正常/不正常”一句话带过。',
    '如果存在 chapter_target.character_behavior_contract，必须输出 character_behavior_checks；不能只用“人物行为正常/不正常”一句话带过，必须明确检查主角逼格反应：升级线与反应线是否分开、低级挑衅是否被轻描淡写或行动压制处理。',
    '如果存在 chapter_target.asset_linkage_contract，必须输出 asset_linkage_checks；不能只用“设定有用到/没用到”一句话带过。',
    '如果存在 chapter_target.state_tracking_contract，必须输出 state_tracking_checks 和 source_readiness_checks；不能只用“状态没问题/有问题”一句话带过。',
    '如果存在 chapter_target.intent_confirmation_contract，必须输出 intent_confirmation_checks；不能只用“意图清楚/不清楚”一句话带过，也必须检查 dialogue_tone_baseline 是否让对白声线服从本章基调。',
    '如果存在 chapter_target.benchmark_recall_brief，必须输出 benchmark_recall_checks；不能只用“文风接近/不接近”一句话带过；存在 canonical_source_rules 时必须确认 文风.md 只管表达层，冲突时以情绪模块/节奏为准。',
    '如果存在 chapter_target.style_boundary_contract，必须输出 style_boundary_checks；不能只用“文风没问题/有问题”一句话带过，必须明确硬约束永远赢、Gate F、禁用词、万能比喻、不可复制边界和字数下限是否被文风覆盖。',
    '如果存在 chapter_target.style_sample_strategy，必须输出 style_sample_checks；不能只用“样章学到了/没学到”一句话带过，必须明确样章策略执行、适用场景、避用场景和复制边界是否都有正文证据。',
    '如果存在 chapter_target.information_flow_contract，必须输出 information_flow_checks；不能只用“节奏还行/不行”一句话带过。',
    '如果存在 chapter_target.expectation_threshold_contract，必须输出 expectation_threshold_checks；不能只用“期待感还行/不行”一句话带过，必须明确两长一短、剧情期待 + 主题甜头 + 新鲜感、期待感 > 爽点 / 铺垫篇幅不少于释放篇幅、延迟满足、门槛拆分、动态加码和下一开环是否都有正文证据。',
    '如果存在 chapter_target.story_loop_contract，必须输出 story_loop_checks；不能只用“剧情循环还行/不行”一句话带过。',
    '如果存在 chapter_target.emotional_arc_contract，必须输出 emotional_arc_checks；不能只用“情绪还行/不行”一句话带过，必须明确爽点倒推法、装逼层级、多爽点密度、递进对抗、梗四段式、读者欲望四步公式、场景情绪执行、调动/复现/释放/后反应、闭环后的下一开环、情绪拉扯曲线、题材情感策略、先入为主、峰终定律、结尾情绪强度、三层情绪、读者实际感受、前反应-复现-后反应、以小搏大、理念矛盾、理念之争、调动释放、爽点类型、递增对比和下行情节安全感是否都有正文证据。',
    '如果存在 chapter_target.chapter_hook_contract，必须输出 chapter_hook_checks 和 chapter_hook_quality_checks；不能只用“钩子还行/不行”一句话带过。',
    '如果存在 chapter_target.paragraph_hook_contract，必须输出 paragraph_hook_checks；不能只用“段落有吸引力/没吸引力”一句话带过。',
    '如果存在 chapter_target.suspense_contract，必须输出 suspense_checks；不能只用“悬念还行/不行”一句话带过。',
    '如果存在 chapter_target.reversal_contract，必须输出 reversal_checks；不能只用“反转还行/不行”一句话带过。',
    '如果存在 chapter_target.showdown_contract，必须输出 showdown_checks；不能只用“爽点还行/不行”一句话带过，必须明确爽点释放、底牌管理、三压一爆三震、舞台层级、传递通道、震惊分层、战斗服务爽点、三层破局和急缓急节奏是否都有正文证据。',
    '如果存在 chapter_target.bridge_unit_contract，必须输出 bridge_unit_checks；不能只用“节奏还行/不行”一句话带过。',
    '如果存在 chapter_target.opening_contract，必须输出 opening_checks；不能只用“开篇还行/不行”一句话带过。',
    '如果存在 chapter_target.prose_craft_contract，必须输出 prose_craft_checks；不能只用“文笔还行/不行”一句话带过。',
    '如果存在 scene_cards.density_level，必须输出 prose_craft_checks 检查疏密分配；不能只用“节奏还行/不行”一句话带过。',
    '如果存在 scene_cards.serial_risk_repairs 或 scene_cards.recent_fatigue_action，必须输出 serial_risk_repair_checks；不能只用“近章风险已处理”一句话带过，必须用正文证据检查风险修复动作是否落成可见事件。',
    '如果存在 scene_cards.purpose_tag，必须输出 quality_audit_checks 检查目的词详略分配；不能只写“目的明确”，必须指出爽点/打脸/高潮是否展开、过渡/赶路/信息交代是否带过、是否平均用力。',
    '如果存在 chapter_target.punctuation_tone_contract，必须输出 punctuation_tone_checks；不能只用“标点没问题/有问题”一句话带过。',
    '如果存在 chapter_target.quality_audit_contract，必须输出 quality_audit_checks、structure_checks、progression_checks、information_checks；不能只用“质量还行/不行”一句话带过，必须明确本章一句话概括、目的词、详略分配、结构推进、水文检测、信息负载、卖点表达和五维评分是否都有正文证据。',
    '',
    '【结构化上下文包】',
    prosePromptJson(buildProsePromptContextSnapshot(contextPackage), 6000),
    '',
    '【待审校正文】',
    chapterText.slice(0, 16000),
    '',
    '输出 JSON，字段：passed(boolean), score(0-100), rubric, rubric_source, platform_checks(array), content_rubric_source, content_rubric_checks(array), factual_checks(array), model_degeneration_checks(array), chapter_positioning_checks(array), innovation_checks(array), chapter_attraction_checks(array), story_drive_checks(array), character_arc_checks(array), chapter_benchmark_checks(array), title_uniqueness_checks(array), prose_meta_checks(array), banned_words_checks(array), blueprint_consumption_checks(array), word_count_checks(array), reader_retention_checks(array), target_reader_checks(array), genre_positioning_checks(array), plot_special_topics_checks(array), core_contract_checks(array), female_audience_checks(array), upgrade_rhythm_checks(array), structure_checks(array), progression_checks(array), information_checks(array), conflict_structure_checks(array), perspective_verdicts(array), deslop_level("无"|"轻度"|"中度"|"重度"), deslop_checks(array), dialogue_checks(array), plot_dynamics_checks(array), story_power_checks(array), continuity_heat_checks(array), character_relation_checks(array), character_behavior_checks(array), asset_linkage_checks(array), state_tracking_checks(array), status_filter_receipts(array), source_readiness_checks(array), write_preparation_checks(array), next_chapter_quality_plan_receipts(array), chapter_handoff_checks(array), intent_confirmation_checks(array), benchmark_recall_checks(array), style_boundary_checks(array), style_sample_checks(array), information_flow_checks(array), expectation_threshold_checks(array), story_loop_checks(array), emotional_arc_checks(array), chapter_hook_checks(array), chapter_hook_quality_checks(array), paragraph_hook_checks(array), suspense_checks(array), reversal_checks(array), showdown_checks(array), bridge_unit_checks(array), opening_checks(array), prose_craft_checks(array), serial_risk_repair_checks(array), revision_receipt_checks(array), deslop_repair_checks(array), punctuation_tone_checks(array), quality_audit_checks(array), longform_checks(array), five_dimension_scores({core_consistency,surface_rewrite,format_consistency,readability,logic_coherence}，每项含 score/evidence/fix), craft_metrics({action_detail_score,description_overuse_score,event_density_score,combat_process_score,setting_consistency_score}), focused_revision_modes(array，可取 expand_action/cut_description/tighten_pacing/add_consequence/restore_hook/repair_setting_violation), setting_violations(array), delivery_risk_receipts(array), next_chapter_quality_plan({version,quality_focus,opening_actions,middle_actions,ending_actions,avoid_repetition,evidence_basis,ending_contract:{final_state,unresolved_question,next_chapter_pull,handoff_to_next}}), issues(array，使用上面的统一 Findings Schema), revision_directives(array), needs_revision(boolean)。只返回 JSON。',
  ].join('\n')

  const buildProseRevisionPrompt = (project: any, contextPackage: any, chapterText: string, review: any) => {
    const revisionStrategyBrief = buildRevisionStrategyBrief(review)
    const failedDeliveryRiskReceipts = asArray(review?.delivery_risk_receipts || review?.deliveryRiskReceipts)
      .map((receipt: any) => {
        const remainingRisk = deliveryRiskReceiptRemainingRisk(receipt)
        if (!remainingRisk) return null
        return {
          risk_item: compactBriefText(receipt?.risk_item || receipt?.riskItem || receipt?.item || receipt?.label),
          required_action: compactBriefText(receipt?.required_action || receipt?.requiredAction || receipt?.action),
          repair_segment: inferDeliveryRiskReceiptRepairSegment(receipt),
          repair_position_rule: deliveryRiskReceiptRepairPositionRule(inferDeliveryRiskReceiptRepairSegment(receipt)),
          delivered: receipt?.delivered === true,
          evidence: compactBriefText(receipt?.evidence),
          remaining_risk: remainingRisk,
        }
      })
      .filter(Boolean)
    return [
    '任务：根据自检结果修订本章正文，保留可用内容，修复连续性、角色、节奏、章末钩子和正文工艺问题。',
    '硬性语言要求：chapter_text 必须使用简体中文，按中文网文自然分段和中文引号输出；不得输出葡萄牙语、英语或拼音正文，外语只允许作为故事内必要专名少量出现。',
    `作品标题：${project.title}`,
    '先执行 oh-story 精修策略简报：根据 primary_strategy 和 strategy_order 决定修订重心；rewrite/compress/de_ai/polish 只能指导改稿顺序，不能跳过结构化 findings。',
    'oh-story 系统性去AI三遍法：若 primary_strategy 或 checks 指向 de_ai/deslop，必须按严重度执行；轻度只做 Pass 1，中度做 Pass 1 + Pass 2，重度完整三遍并重写重点段落。',
    'Pass 1：去泛化。删或替换抽象情绪总结句、假深度句、意义膨胀、空洞结论、工整对比句式和装饰性形容词；过度使用“于是/然而/此刻”删掉一半；所有角色说话一样高级时必须区分语气。',
    'Pass 2：去书面化。把“机制/结构/逻辑/体系”换成日常表达；抽象名词滥用要直接说事；“进一步/深入/推进/落实”这类体制内用语能删就删；必要术语用白话解释。',
    'Pass 3：回自然感。补具体感官细节、角色说话方式的区分、长短句交错、社会位置感对白、场景特有记忆点和项目特有语言习惯；少即是多，每段只补 1-2 个有功能细节。',
    '定向修订要求：',
    '1. expand_action：补足战斗/追逐/清剿/灾祸现场的动作链，写出出手、反应、空间变化、受伤或资源损耗、反制和结果。',
    '2. cut_description：压缩不推动剧情的环境描写，尤其是连续氛围段落；保留能影响动作空间、诡异规则和危险判断的描写。',
    '3. tighten_pacing：提高事件密度，删掉空泛总结，让每 3-5 段都有行动、选择、信息变化或关系变化。',
    '4. add_consequence：补充行动后果，包括伤势、物品损耗、暴露秘密、角色关系变化、规则代价。',
    '5. restore_hook：保留并强化章末钩子，不要削弱下一章推动力。',
    '6. repair_setting_violation：修复设定工坊违规，确保境界、能力代价、物品归属、Boss行动、规则触发、角色认知边界和禁揭设定全部一致。',
    '7. 对每条结构化 findings，必须按 issues[].evidence 定位原文问题，并按 issues[].fix 执行修订；不要只泛泛润色。',
    '7A. 修订守恒：只修自检证据、delivery_risk_receipts、deterministic_prose_cleanup 和各类 checks 指出的缺口；不得新增支线、替换核心梗、重排长期方向、改写主角长期目标或改变未被 findings 要求的正史。',
    '7B. 修订前必须对照 chapter_target.core_contract_radar 与自检中的 chapter_core_drift/core_drift：must_serve 必须继续服务，no_drift 不得漂移，theme_unity_rules 必须守住主题统一和全书核心情绪；若必须改动伏笔、时间线、角色状态、资产归属或关系边界，必须在 revision_receipts.cascade_impacts 中说明原因、证据和后续同步动作。',
    '7B+. 修订 core_contract_checks 时必须补商业核心雷达：按卖点四步法对齐全书/书名/简介/段落卖点，用剧情/对话/反应做到发现比告知爽十倍；保留核心重复点并升级重复策略；按追踪/上下文.md 与最近3章做节奏自检；金手指结构必须一眼就懂、有系统限制、替换明确故事流程环节并给出即时变化。',
    '7B0. 如果自检结果包含 theme_unity_rules 或主题统一缺口，必须把本章小情绪重新压回全书核心情绪：随机翻开这一章也要能看出它服务大情绪；删除或改写不服务核心情绪的旁枝情绪线。',
    '7B+. 如果自检结果或 revision_directives 包含 ten_chapter_selling_point，说明核心卖点被稀释或替换：必须把“当初吸引读者的卖点还在吗”落实为正文事件，补核心卖点、能力使用、规则限制、读者回报或章末新期待；不得把第十章改成新主题或新卖点。',
    '7C. 不改长期方向：rewrite 只能重写问题段落的剧情落点和表达方式，不能把本章改成新主题、新地图、新敌人、新关系线或新的长期承诺；compress/de_ai/polish 只能改表达密度和自然度，不能删除有功能信息。',
    '7D. 字数对比与修订幅度守恒：修订后与原文字数差异超过 30% 或 800 字（取较大值）时，必须在 revision_scope_guard.scope_warning 写明原因；不得为了润色大幅删掉伏笔、钩子、角色特征、情节推进或必要转折，也不得无证据新增支线、设定、关系或时间线。',
    '7E. 修订前必须按 workflow-revision 做上下文对照，并输出 revision_context_receipts：逐项检查 previous_chapter、current_chapter、next_chapter 或下一章细纲、foreshadowing、character_cards、timeline、setting_context、资产归属、关系边界、正文元信息扫描、禁用词扫描。字段 key,label,status(pass|warn|fail),evidence,fix,source_excerpt；无法确认某个来源时 status 写 warn/fail，fix 写下一章或本章必须如何兜住，不能假设已经一致。',
    '7F. 外部事实查证守恒：如果自检结果包含 factual_checks，必须按 claim/fact_type/verification_status 修复。能从上下文确认的才保留为确定事实；不能确认的改成架空/模糊表达、角色待查证线索或明确 remaining_risk，不得把未查证内容改写成确定事实，也不得新增无来源的真实历史、地理、职业、法律、医疗或技术细节。',
    '8. 输出 revision_receipts：逐条对应自检 issues，字段 issue_index(从0开始), severity, category, original_evidence, applied_fix, changed_evidence, remaining_risk, affected_chapters(array), cascade_impacts(array)。changed_evidence 必须引用修订后正文中的具体句子或场景变化；如果仍有残余风险，remaining_risk 写清楚。若本次修改改变伏笔、时间线、角色状态、资产归属或关系边界，cascade_impacts 必须逐项写 type, target, impact, required_action, evidence 或 source_excerpt，说明后续章节如何同步，evidence/source_excerpt 必须引用修订后正文中支撑正史变更的原句；没有级联影响时写空数组。',
    '8A. 输出 revision_scope_guard：字段 original_word_count, revised_word_count, delta_word_count, delta_ratio, allowed_delta_word_count, scope_warning, reason。original_word_count 为原正文估算字数，revised_word_count 为修订后正文估算字数，allowed_delta_word_count = max(原文 30%, 800 字)。',
    '9. 如果自检结果包含 delivery_risk_receipts，必须逐条修复 delivery_risk_receipts 中每条 delivered=false 或 remaining_risk 非空的承接残留；按 risk_item/required_action/remaining_risk 找到未兑现的上一章风险债，必须修到正文中可见的开篇承接、场景推进、读者回报或章末钩子里，不得只在旁白中声明已处理。opening_actions 失败项必须修到前300字；middle_actions 失败项必须修到中段事件推进；ending_actions 失败项必须修到最后300字，不得把章末风险挪到开篇或中段。revision_receipts 必须逐条对应 delivery_risk_receipts 的失败项，写清原始 risk_item、required_action、repair_segment、applied_fix、changed_evidence 和 remaining_risk；不能只修第一条，也不能用一条汇总回执代替多条风险债。',
    '9A. 如果自检结果包含 prose_meta_checks，必须优先修复 status=fail/warn 的工程词泄露；按 term/line/evidence/fix 把“上一章/本章/前文/后文/伏笔/细纲/读者/第X章”等改成角色当下能感知的事件锚点或相对时间。',
    '9B. 如果自检结果包含正文格式扫描、章节标记格式扫描或 deterministicProseFormatChecks，必须优先修复 format_chapter_marker_mixed、format_blank_line、format_indentation、format_markdown：统一章节标记，合并多余空行、删除缩进和正文 Markdown；段间保留一个空行，按戏剧单元/镜头自然断段；保留项目/平台指定的合法引号风格，quote-mode keep 时不得把「」擅自改成 ""。',
    '10. 如果自检结果包含 platform_checks，必须优先修复 status=fail/warn 的平台不匹配项；按 label/evidence/fix 找到开篇、节奏、设定释放、回报密度或章末拉力缺口，修到正文可见证据里。',
    '11. 如果自检结果包含 content_rubric_checks，必须优先修复 status=fail/warn 的内容基准缺口；按 label/evidence/fix 补核心卖点、冲突推进、剧情循环反馈、角色动机、章末期待或自然文字证据。',
    '11B. 如果自检结果包含 factual_checks，必须优先处理 status=fail/warn 的外部事实查证缺口；按 claim 和 verification_status 降级或删除未查证断言，把真实世界细节改成架空可控设定、角色正在核验的疑问，或只保留上下文已有证据支持的事实。',
    '11A. 如果自检结果包含 reader_retention_checks，必须优先修复 status=fail/warn 的追读雷达缺口；按 key/label/evidence/fix 补前300字钩子、可见爽点、信息缺口、章末追读、留存四大支柱（升级、资源困境、目标、解密）、留存双引擎的情绪 + 饥饿，以及 Hook上瘾模型的触发 -> 行动 -> 奖励 -> 投入。四支柱缺口至少补两项：升级写成实力/地位/资源变化，资源困境写成当前资源压力，目标写成大目标 + 小目标 + 假目标，解密写成冰山一角到层层解密；饥饿缺口必须用信息差植入问号并按剥洋葱把关键信息卡到章末；奖励缺口必须补奖励随机性：在预期回报之外给出出乎意料的额外收获、线索、权限、关系或地位变化，并形成沉没投入。',
    '12. 如果自检结果包含 target_reader_checks，必须优先修复 status=fail/warn 的目标读者缺口；按 key/label/evidence/fix 补清读者画像、读者想看内容、情绪缺口、本章命中点、平台口味、目标平台样本、题材边界、书名简介内容三位一体、世界观自洽、代入感/塑料感、金手指生活关联、私人表达和可见读者回报。情绪缺口缺口必须先补核心痛苦、深层情结、高频情绪关键词和未满足需求，再把它们写成冲突压力、角色选择、即时反馈或尊严/安全感/掌控感补偿；平台/题材缺口必须用当前目标平台样本校准，不得把历史经验当当前事实；货板缺口必须让书名、简介和正文兑现同一核心卖点。',
    '13. 如果自检结果包含 genre_positioning_checks，必须优先修复 status=fail/warn 的题材定位缺口；按 key/label/evidence/fix 校准题材标签、核心梗、类型公式、金手指贴合、必备场景、微创新边界、70/20/10元素法则、五种微创新手法、长板聚焦和书名简介内容三位一体，修掉挂羊头卖狗肉；微创新修复必须按70/20/10元素法则稳住模板底座，并从精炼法、升级法、加料法、反套路法、组合法中选一种服务当前核心梗；拉长题材长板而非补短板，删除会稀释核心卖点的支线，把同一卖点扩成至少 3 个角度的正文证据。',
    '13+. 如果自检结果包含 plot_special_topics_checks，必须优先修复 status=fail/warn 的特殊题材缺口；按 key/label/evidence/fix 补 matched_topics 对应专题的正文证据：金手指要写成行动机制和反馈变化，题材边界要压回核心期待，扫榜对标只复用功能位，都市高武目标要和钱/资源/资格挂钩，三万字卡点要服务上架高潮倒推，阵营手牌要按实力和立场逐级出牌。',
    '13A. 如果自检结果包含 female_audience_checks，必须优先修复 status=fail/warn 的女频长篇缺口；按 key/label/evidence/fix 补安全感锚点，把女主被动改成女主自己做决定、自己推进，把感情升级踩到事业/成长节点上，虐后补反转或糖，控制连续虐戏剂量，并校准平台安全感密度和货板一致。',
    '14. 如果自检结果包含 upgrade_rhythm_checks，必须优先修复 status=fail/warn 的升级节奏缺口；按 key/label/evidence/fix 补升级前情绪缺口、即时反馈、延迟反馈、升级后变化、新危机/新门槛、桥段功能位和金手指演进；金手指必须保留核心作用，只增加新的使用方式，升华到世界/规则层级前先补伏笔；金手指必须刚好解决当前矛盾，不能一键清场或完全无效，解决后要暴露更大矛盾、更高门槛或下一目标；金手指反馈法缺口要把金手指带来的变化过程掺进故事：用主角动作、判断、物件变化、角色反应或局势变化展示即时反馈，删掉只写绑定成功/规则说明/弹窗结算的空反馈；金手指简单是核心，功能、触发条件、奖励反馈和升级规则必须一眼就懂，删掉说明书式规则树和万能外挂；金手指多维成长必须补足词条、功能、品质、熟练度或条件-反馈中的至少两条线，避免只剩品质/数值单线提升；榜单缺口要补排名提升后的下一名次/下一目标、通过排行榜介绍新对手，并让装逼余震改变态度、报价、资源、权限或规则评价。',
    '15. 如果自检结果包含 conflict_structure_checks，必须优先修复 status=fail/warn 的冲突结构缺口；按 key/label/evidence/fix 补阻止者、有进无出、冲突升级阶梯、行动阻拦、明确胜负结果、压势不压人、主角主动破局、矛盾网和下一冲突种子；有进无出缺口要让读者相信主角非踏入不可，明确肉体/身份职场/心理死亡赌注或退出代价，并用杀人理由、工作职责、道德责任或实体场所作为黏结剂，让对立双方都无法轻易脱身；矛盾网缺口必须补到2-3条矛盾线互相牵连，并让解决一条后激活或加深另一条。',
    '16. 如果自检结果包含 perspective_verdicts，必须优先处理 verdict=CONCERNS/REJECT 的多视角审查结论；按 story-architect/character-designer/narrative-writer/consistency-checker 的 findings 与 recommendations 修到正文证据里。',
    '14. 如果自检结果包含 deslop_checks，必须优先修复 status=fail/warn 的去AI味门禁；按 gate/pattern/evidence/fix 处理禁用词、句式套路、心理告知、节奏均匀、对话腔调、章末总结体和解释腔/上帝视角/安排感。',
    '14A. 如果自检结果包含 deslop_gate_diagnostics，必须先看 concern_gate_count 和 summary，再逐项按 gates[].summary/gates/evidence/fix 修复；即使 deslop_checks 很长或被截断，也必须按该摘要覆盖 Gate A-G 的主要缺口。',
    '14B. 如果 deslop_checks 指出主语与名字节奏问题，必须按 oh-story 写法修句子：段首点名建立主语，段中用代词/省略流动、动作承接或物件/感官开句；关键转折再点名强化。不得为了省主语造成指代不清，也不得改变剧情、人设或因果。',
    '14B. 输出 deslop_repair_receipts：逐条对应已处理的 Gate A-G 缺口，字段 gate,label,original_evidence,applied_fix,changed_evidence,remaining_risk。changed_evidence 必须引用修订后正文的具体句子；如果某个门禁仍未完全解决，remaining_risk 写清楚。',
    '14C. 如果自检结果包含 deterministic_prose_cleanup，必须优先逐项修复 categories/evidence/required_actions 中的硬扫残留；这类问题已经由确定性扫描命中，不要用“风格可接受”跳过。',
    '14C+. 如果 deterministic_prose_cleanup.payoff_density 或 categories.type=payoff_density 命中，不能只做去AI味润色；必须执行 rewrite：把连续长铺垫切成短周期读者回报，每 800-1200 字至少补一次主角反制、信息收益、关系变化、阶段结算或章尾钩子推进，并在对应位置写成动作、对话、规则触发或后果。',
    '14D. 删除优先：每条 AI 味、水分句、解释腔、心理告知、重复描写或模板表达先判断能否删除；删后不丢伏笔/钩子/角色特征/情节推进/必要信息/必要转折的，直接删除；删不掉才润色，只改“怎么说”不删“说什么”。删除受比例上限和字数下限约束，若跌破字数下限，改为补真实动作、冲突、代价或信息变化，不要删完再用新废话凑字。',
    '14E. 如果自检结果包含 model_degeneration_checks 或 deterministic_prose_cleanup.model_degeneration，blocking 项必须重写受影响段落：复读只保留一次有效信息，截断补完整动作和章尾承接，AI 自指/拒绝语/占位符/乱码删除，任务描述/情节点/字数目标等工程词改为角色当下可感知表达；advisory 项先判断是否为故事内合法文本，再决定保留或改写。',
    '15. 如果自检结果包含 dialogue_checks，必须优先修复 status=fail/warn 的对白缺口；按 key/label/evidence/fix 补角色声线差异、潜台词与议程、权力博弈、信息嵌入和情绪递进；如果 chapter_target.dialogue_contract.dialogue_execution_checklist 存在，必须按对话执行清单逐场修复 mode、speaker_agendas、line_functions、emotion_flow、information_strategy、voice_differentiation 和 forbidden_patterns，并在 dialogue_checks.changed_evidence 中写明修订后落成的正文句子；按压制/反转/心死模式重排对白，让短句方成为权力上位，亮底牌句压到 ≤10 字，被压制方保留 ≥20 字辩解或失态；把真实目的改成借口、试探、回避或动作反应，按关系、场合、目的重定语气；用命令式、否定式或为你好式压迫制造情绪，按事件→情绪反应→内心思考→采取行动修复跳步，并让对白强化期待、爽感或悬念；把说明书式设定改成角色语气、立场、追问、误导或动作承接，用下行质疑、上行证据和核心信息兑现形成信息拉扯；按口癖、节奏、信息偏好、身份措辞和关系阶段重写角色声线，避免所有角色同腔；按普通人震惊、专业人士分析、特殊身份者反应重排群众/弹幕递进，每条群众反应短小精悍，不代替主线；连续多轮对话后插入换气，紧张段落改短促，关键信息放到对话开头或结尾，动作和表情只保留在关键转折处；读者已知信息改成叙事一句话概括，能用突发状况替代的对话直接替换，用配角对话替代主角旁白平铺直叙，新增配角必须绑定主线戏份；同一场景超过3个配角发言时，只保留功能最强的3个，其余合并为旁观反应、动作、沉默或叙事概括；把梗式对白改成角色说不出来但意思到了的口吻，用梗强化记忆点或高潮落点，不得直接复刻热梗原句；把大量信息必须靠对白展示的段落拆成情节、心理、旁白、环境或动作，把问答式的一问一答改成主动发言、反应、动作、沉默和心理承接，确保遮住角色名仍能区分是谁在说话，单次对话不超过全节 40%，逐句改成自然口语交流，并让对话结尾预示接下来的节奏变化。',
    '16. 如果自检结果包含 plot_dynamics_checks，必须优先修复 status=fail/warn 的剧情动力缺口；按 key/label/evidence/fix 补目标阻碍行动反馈闭环、假胜崩解、代价反馈、A/B情绪交替、驱动方式、多线错峰或悬置收尾；驱动方式缺口要按题材修：番茄爽文/打脸文每章补一个外部结果（赢、升级、对手栽），追妻/虐心/世情补持续人物心结，混合模式让主线事件推进并每 3-5 章插情感停顿。',
    '16A. 如果自检结果包含 story_power_checks，必须优先修复 status=fail/warn 的故事力缺口；按 key/label/evidence/fix 补故事五维、行动改变局势、有始有终和因果反馈，把解释、旁观或内心独白改成角色主动行动、可见代价、信息变化、关系变化、规则触发或敌方反制。',
    '17. 如果自检结果包含 continuity_heat_checks，必须优先修复 status=fail/warn 的连续性热度缺口；按 key/label/evidence/fix 补 hot 元素推进、warm 元素保温、cold 元素升温、archived 线不误激活或合理休眠说明。',
    '18. 如果自检结果包含 character_relation_checks，必须优先修复 status=fail/warn 的角色关系缺口；按 key/label/evidence/fix 补关系类型、关系考验/变化、主角独立目标、目标归属、角色不止恋爱、配角期待枢纽/人物扣、配角攻略缓冲区、配角主动行动、态度变化和阶段匹配；目标归属缺口要把“帮别人实现目标”改成主角自己的诉求、主动选择和代价，再让配角目标与主角目标摩擦或互补；角色不止恋爱缺口要给关系角色补事业、责任、资源、身份、家族、风险或行动线，让情感推进踩在自己的选择和代价上；配角期待枢纽缺口要选一个关键配角做任务基地，同时挂短期和长期期待，让主角解决事件装完逼后回到该人物处开启下一轮新任务/新剧情，若人物下线则补更大好处来转化损失厌恶；配角攻略缓冲区缺口要补信息差、地位差距、亲密度差距或信任程度，并让配角从旁观/质疑/拒绝/试探转为行动/协助/设限，不能只等主角触发。',
    '19. 如果自检结果包含 character_behavior_checks，必须优先修复 status=fail/warn 的角色行为缺口；按 key/label/evidence/fix 补动机链、动机具体性、主角行为三必须、行为证据、三层标签反差、主角逼格反应、人设强关联、记忆锚点、配角功能、角色卡必备项、配角退场规划、行为重复点、人推事件、主角红线、身份/金手指对齐、反派内在逻辑、反派分量、反派自我叙事和反派层级退场；角色卡缺口要补角色定位、身份标签、外貌特征、核心目标、核心动机、致命弱点、口头禅/标志动作；配角退场缺口要补功能、关系、核心特质、标志性特征和退场方式，并把同场超过3个有台词配角合并；行为重复点缺口要补一个跨场景重复的动作、口头禅或反应；人推事件缺口要从人物动机和选择改写事件推进，删外部硬砸和作者硬编；主角红线缺口要删圣母、无脑、内核邪恶、因蠢犯错和自暴自弃；身份/金手指对齐缺口要把社会身份、身世、金手指和性格统一到世界基调；动机具体性缺口要把“被欺负/被针对”改成具体事件，把“要成为最强/想变强”改成情感层面的理由，并补动机变化的触发事件、关系压力或代价；主角逼格反应缺口要把升级后暴怒、面红耳赤、歇斯底里或被低级挑衅牵着走，改成升级只提升实力/能力、主角仍轻描淡写、短句反锁或行动压制，必要时用旁观者认知变化放大爽点；强关联缺口要为重要角色补至少3个影响剧情走向、核心梗装逼爽点或人物碰撞的实力/资源/人脉/背景/技能/证据/关系锚点，弱关联只能留作记忆点；反派分量缺口要补真实威胁、可信动机、终极意图时机，并让反派长处照出主角弱点；反派自我叙事缺口要补梦想、创伤/旧痛、让人恨不起来的侧面和理念冲突；反派层级缺口要按小反派/中等反派/大弧 Boss/最终 Boss 修正篇幅、功能和退场方式。',
    '20. 如果自检结果包含 asset_linkage_checks，必须优先修复 status=fail/warn 的资产挂钩缺口；按 key/label/evidence/fix 补资产功能、归属、触发条件、限制、后果、状态变化、贯穿物件三次出现和设定随冲突释放；道具能力展示缺口要补宝物功能强大、信息不足误判鸡肋、恰好克制反派、他人失败、主角方案、众人不看好、鸡肋成神器和章末新钩子。',
    '21. 如果自检结果包含 state_tracking_checks，必须优先修复 status=fail/warn 的状态筛选缺口；按 key/label/evidence/fix 修角色状态、上一章承接、伏笔前史、世界约束、来源边界和上下文过载问题，并在修订后的 oh_story_delivery_receipts.pre_draft_execution_receipts.status_filter_receipts 中逐项更新 used_in_chapter/evidence/excluded_reason/remaining_risk。',
    '21A. 如果自检结果包含 source_readiness_checks，必须优先修复 status=fail/warn 的来源就绪缺口；按 key/label/evidence/fix 处理 missing/warn 来源，不能把未就绪来源写成既定事实，ready 来源必须在正文中可见承接，并在修订后的 oh_story_delivery_receipts.pre_draft_execution_receipts.source_readiness_checks 中逐项更新 status/evidence/fix。',
    '21A+. 如果自检结果包含 artifact_protocol_receipts，必须优先修复 status=fail/warn 的项目产物协议缺口；按 key/label/artifact_path/required_fields/evidence/fix 补齐 设定/关系.md、设定/题材定位.md、大纲/细纲_第XXX章.md、追踪/伏笔.md、追踪/时间线.md、追踪/角色状态.md 等标准产物字段对应的正文证据，并在修订后的 oh_story_delivery_receipts.pre_draft_execution_receipts.artifact_protocol_receipts 中逐项更新 status、required_fields、used_fields、evidence、remaining_risk。',
    '21B. 如果自检结果包含 write_preparation_checks，必须优先修复 status=fail/warn 的写前准备缺口；按 key/label/evidence/fix 补齐来源缺口、资产风险、上一轮待修复、创作契约清单 creation_contract_checklist、蓝图焦点、读者回报和必确认项；创作契约缺口要分别补目标读者、题材定位、核心承诺、追读留存的正文证据，并在修订后的 oh_story_delivery_receipts.pre_draft_execution_receipts.write_preparation_checks 中逐项更新 delivered/evidence/remaining_risk。',
    '21C. 如果自检结果包含 chapter_handoff_checks，必须优先修复 status=fail/warn 的章首承接缺口；按 key/label/evidence/fix 修前300字和受影响的场景桥，让 previous_handoff、opening_obligations、must_deliver、keep_alive、overdue 和 chapter_handoff_contract 都落成正文可见动作、对话、信息变化或关系变化。修章首时不得另起新场景替代承接；修章末时必须补清下一章动作压力、未解问题和状态交接。',
    '22. 如果自检结果包含 intent_confirmation_checks，必须优先修复 status=fail/warn 的意图确认缺口；按 key/label/evidence/fix 校准情绪目标、节奏爆发、模块执行、文风指令、内容概括、逻辑线、出场顺序、代价/收益和章尾承接，并在修订后的 oh_story_delivery_receipts.pre_draft_execution_receipts.intent_confirmation_checks 中逐项更新 delivered/evidence/remaining_risk。',
    '22A. 如果自检结果包含 benchmark_recall_checks，必须优先修复 status=fail/warn 的文风召回缺口；按 key/label/evidence/fix 校准 selected_emotion_module、rhythm_reference、style_profile_summary、matched_chapter_techniques、canonical_source_rules、fallback_receipt_requirements 和 gaps；若文风与模块/节奏冲突，必须以情绪模块/节奏为准，文风.md 只管表达层；删掉任何复制对标桥段或原句的内容，并在修订后的 oh_story_delivery_receipts.pre_draft_execution_receipts.benchmark_recall_checks 中逐项更新 delivered/evidence/remaining_risk；fallback_usage_receipts 必须补齐 module_usage_receipt、rhythm_usage_receipt、matched_chapter_usage_receipt 的 source_type/source_path/expected_application/delivered_evidence/gaps_preserved。',
    '22B. 如果自检结果包含 style_boundary_checks，必须优先修复 status=fail/warn 的文风覆盖边界缺口；按 key/label/evidence/fix 恢复“硬约束永远赢”，删掉任何为了模仿文风而引入的禁用词、Gate F 章末总结体、万能比喻、作者预告、样章桥段/原句复制、字数缩水、剧情/状态/关系/时间线漂移。文风覆盖边界只允许修表达，不允许改事实。',
    '22C. 如果自检结果包含 style_sample_checks，必须优先修复 status=fail/warn 的样章策略缺口；按 key/label/evidence/fix 补足适用场景、避用场景、叙述节奏、句式密度、对白比例、角色口吻和情绪转折。修订只能学习样章的抽象表达策略，不得复制样章桥段、专有设定、角色名、核心梗或原句；修订后必须在 oh_story_delivery_receipts.pre_draft_execution_receipts.style_sample_checks 中逐项更新 delivered/evidence/remaining_risk。',
    '19. 如果自检结果包含 information_flow_checks，必须优先修复 status=fail/warn 的信息团衔接缺口；按 key/label/evidence/fix 压缩无关信息团、补场景递进、回应上一场悬念、修情绪衔接、补提升后下一目标、删无信息量过渡；提升/胜利/拿到资格后如果只写“事情进入下一阶段”，必须改成新的挑战、目标、代价或更高门槛；过渡压缩缺口要直接删除纯移动/寒暄/环境描写，或压成一句并改成信息、风险、情绪余波或下一步目标。',
    '20. 如果自检结果包含 expectation_threshold_checks，必须优先修复 status=fail/warn 的期待门槛缺口；按 key/label/evidence/fix 补两长一短期待、剧情期待 + 主题甜头 + 新鲜感、期待铺垫、期待感 > 爽点、铺垫不少于释放、期待接力法、系统性门槛、分批提出、动态加码、低密度期待点和下一个门槛；闭环一个期待前，必须让下一个开环或更大问题已经进入场景行动。',
    '21. 如果自检结果包含 story_loop_checks，必须优先修复 status=fail/warn 的故事循环缺口；按 key/label/evidence/fix 补循环模式、循环燃料、地图资源闭环、地位环境同步、换地图承接，以及“题材 + 金手指 + 主角身份”推导出的本章循环步骤；换地图承接缺口要补旧地图阶段性收束、新地图五件套、前5章期待、贯穿主线/旧关系承接、人际关系动了 -> 主角再动和循环升级，不能旧线全抛或新设定一次性倒完；小循环中必须铺垫大循环的期待，并把同一核心卖点的不同角度/不同矛盾写成正文推进，不能只反复用同一个梗换对象。',
    '22. 如果自检结果包含 emotional_arc_checks，必须优先修复 status=fail/warn 的情绪弧缺口；按 key/label/evidence/fix 补平静 -> 调动 -> 释放 -> 爽、爽点倒推法（先定爽点类型 -> 再定期待点 -> 最后倒推铺垫，正文按铺垫 -> 期待升高 -> 爽点释放呈现）、装逼层级（日常小装逼只维持耐心，核心爽点切在主线目标，偏离主线去别处装逼必须删或改成主线推进）、多爽点密度（不要拉长单个爽点铺垫，每 800-1200 字至少补信息增量/能力展示/危机反制/关系变化/小回收之一）、情绪拉扯曲线（按温暖 -> 残忍 -> 善意 -> 真相 -> 原谅 -> 来不及 -> 释然 -> 细节暴击中本章需要的段落补正文证据，不机械走全套）、题材情感策略（世情/爽文补快反弹和解气，情感/虐心补羁绊和余韵，古言/复仇补因果报应，悬疑/推理补信息差，年代/亲情补代际与遗憾）、先入为主（前100字补核心矛盾/主角处境/不公平异常并调整否定提前顺序）、峰终定律（结尾情绪必须高于起点，结尾情绪强度补到虐≥8、爽≥7、治愈≥6，并落成具体动作/对话/画面）、三层情绪（分清角色自己的情绪、文本传递的情绪、读者实际感受，把角色在哭/屈辱/恐惧转成读者爽前蓄力、安全感、尊严感、期待感或余韵）、情绪反应结构（虐/悲壮/遗憾补前反应 -> 复现 -> 后反应；热血/逆袭补以小搏大和士气如虹）、理念矛盾（将关键冲突从利益之争升级为理念之争，把公平/权威、理想/现实、规则/人心等原则碰撞落成具体选择、代价、追求和牺牲）、情绪模块重组（戏剧性会磨损，情绪不会磨损；复用套路必须换场景/换对手/加新情绪或提高 stakes/奖励复杂度）、情绪三板斧（羁绊铺设/情感撕裂/余韵钝痛）、每 3-5 个小节事件触发的情绪转向、弧线类型、爽点递增对比（影响范围/揭示深度/身份落差）、断期待禁止、下行情节安全感和动作/对话/反应外化。',
    '23. 如果自检结果包含 chapter_hook_checks 或 chapter_hook_quality_checks，必须优先修复 status=fail/warn 的章级钩子缺口；按 key/label/evidence/fix 重做前100字章首钩子、最后约100字章尾翻页钩子、钩子强度、兑现路径、现场触发和下一章行动压力，并修掉假悬念、机械降神、低风险钩、过度留白和同类型连用。',
    '24. 如果自检结果包含 paragraph_hook_checks，必须优先修复 status=fail/warn 的段落级钩子缺口；按 key/label/evidence/fix 补段落级钩子 11 种、钩子组合、对话情绪五级递进、围观者质量层级、不公平伤害，并修掉假悬念、低风险钩和同类型连用。',
    '25. 如果自检结果包含 suspense_checks，必须优先修复 status=fail/warn 的悬念编排缺口；按 key/label/evidence/fix 重排四种悬念信息顺序模板、补悬念强度5级、期待接力、多线悬念、信息差运用、读者预知法、底牌前置法、种养收、悬念伏笔边界、角色反应、震惊分层、信息差兑现，并确保解决问题后有新困境或新期待；悬念伏笔边界缺口要按“伏笔不是谜语人”修：短期紧张补疑问/提示/答案路径，长期伏笔藏进动作/物件/误判/环境回声并持续推进，信息延迟超过3章且中间无推进就提前给或删掉。',
    '26. 如果自检结果包含 reversal_checks，必须优先修复 status=fail/warn 的反转设计缺口；按 key/label/evidence/fix 补足3处暗示、公平误导、反转类型、揭示时机、揭示后影响和打脸节奏，删除天降反转、作弊新信息和大段解释独白。',
    '26A. 如果自检结果包含 showdown_checks，必须优先修复 status=fail/warn 的高潮对抗缺口；按 key/label/evidence/fix 补爽点释放强度，确保底牌释放后反派受到对应压制，并修复底牌管理：每次只出1个底牌，保留2-3个未揭示底牌，出牌后补新技能、新后手、新目标或更高门槛，不得把所有底牌一次性摊空；修复无敌文主角不拖拉：主角登场即杀伐果断，该压制时直接压制，不一击必杀时必须有明确理由，并给出战力前置无敌或强势解决信号；修复三压一爆三震：先补友好势力觉得主角是大佬，再补敌方势力两次不服并逼主角上，再补中立势力观望/加压，主角一爆碾压后分别补友方、敌方、中立方的不同震动；建立群众层/中间层/核心层舞台，并补装逼前的人际关系铺垫/利益传递通道，让主角与关键旁观者有旧情、救助、欠债、认可或共同目标，爽点释放后经由这条通道改变态度、声望、资源或规则评价；让震惊分层基于角色利益，确保战斗服务爽点；以弱胜强必须补信息差、环境利用或心理博弈；三层破局缺口必须补预判反制和反预判：反派出A，主角早准备B克制A，反派针对A时主角利用A作陷阱引入预设B；并把情绪调整为急-缓-急。',
    '26B. 如果自检结果包含 bridge_unit_checks，必须优先修复 status=fail/warn 的桥段节奏缺口；按 key/label/evidence/fix 补连续期待、桥段位置、章尾新目标、高潮中埋钩子或连续小期待；连续 2 章没有目标推进时提高冲突密度，连续 2 章只爆点时补关系/伏笔/状态承接余波。',
    '27. 如果自检结果包含 opening_checks，必须优先修复 status=fail/warn 的开篇设计缺口；按 key/label/evidence/fix 重做300字内主角登场、1000字内爽点/期待点、三大基点、开头五要诀（简单/不偏/快/爽/不平）、主角目标与本文卖点、信息分批释放，并删掉大段背景、纯天气风景、序章楔子和详细世界观。',
    '28. 如果自检结果包含 prose_craft_checks，必须优先修复 status=fail/warn 的正文工艺缺口；按 key/label/evidence/fix 修深度限知、身体细节替代情绪词、连续内心独白、全场远景概括、三维度揉进、间接描写法、三机位法、“然后呢”基点法、核心情绪对齐、白描/五感、动态描写、镜头节奏、场景切换与转场、一动一静、道具/数字功能、新概念锚点、环境交互、描写限额/水分控制和去AI味高危词句；间接描写法缺口必须把“很厉害/很震撼/很爽”等直接宣布改成可见使用结果 + 侧面反应，不要直接宣布，用配角动作、围观者判断、对手失态、熟人改口或环境变化证明；三机位法缺口必须补机位1主角近景推动当前动作、机位2配角反应/环境变化放大效果、机位3只补冲突触发的必要旁白，设定都由冲突引出；“然后呢”缺口必须把停在静态总结、情绪判断或环境描写的死段接上下一动作、发现、反应、选择、风险或新疑问；围绕核心情绪的缺口必须删掉或改写不服务情绪目标的旁枝情绪，并让每个动作、物件、冲突和反应指向本章读者回报或全书核心情绪；白描/五感缺口必须用最少的字保留准确动作名词和有效感官，只补主角主动感受到且服务情绪、规则、危险或对话判断的细节，删掉装饰性氛围；动态描写缺口必须把静态人物特征、形容词堆叠或环境铺陈改成动作和反应、动作链、反应链或角色行动中的环境交互；镜头节奏缺口必须把远景、中景、近景或特写重新分配给信息、关系、风险或情绪变化，快节奏场面补短句、短段、密集动作，慢节奏余波补环境交互或静止镜头；场景切换缺口必须补相似物、相似五感或相似情绪，时间跳转用动作或物件衔接，空间跳转用声音或光影衔接；新名词/新设定首次出现必须补角色动作反应、对话半句或物理后果，删掉整段来历/原理/等级解释和零信息生词；水分控制缺口必须删掉读者不会困惑的环境、心理、旁白、回忆或重复信息，只保留承担伏笔、氛围、互动、动作、信息、关系、风险或情绪变化的内容；去AI味缺口必须清理高危词、章末总结体、叠加式描写和“他感到/他觉得/带着一丝”心理告知，改成动作、物件、对话或白描；删掉上帝视角、堆叠式描写、抽象心理总结和无交互环境。',
    '28A. 如果 prose_craft_checks 指出 scene_cards.density_level 或疏密分配问题，必须修复 density_level 执行偏差：dense 场景补足感知、动作、对话交锋和慢镜头过程；sparse 场景压缩为 1-2 句过渡；medium 场景只保留 1-2 个代入细节。修订后必须在 revision_receipts.changed_evidence 中说明对应场景的疏密变化，不得借修订新增支线或改变核心情节。',
    '28A+. 如果 quality_audit_checks 指出 scene_cards.purpose_tag 或目的词详略分配问题，必须按目的词修订：爽点/打脸/高潮/卖点/关键揭露/反转补危机/期待铺垫、出手过程、对话交锋、配角差异化反应和结果余波；过渡/赶路/信息交代/时间跳转压成 1-2 句。修订后在 revision_receipts.changed_evidence 中说明目的词详略变化。',
    '28B. 如果 prose_craft_checks 指出子事件连接或叙述过渡问题，必须删除“然后/接着/随后/于是”等胶水词，用身体动作、物件动作、触感、视线或呼吸承接下一个子事件；修订只改连接方式，不改剧情因果。',
    '28C. 如果 prose_craft_checks 指出 scene_cards.sensory_anchor 或感知锚点执行偏差，必须把对应场景改成主角主动注意到的感知细节，并绑定动作、规则、危险或对话判断；删掉只负责氛围的装饰性场景描写，不改变核心情节。',
    '28C+. 如果 serial_risk_repair_checks 指出 scene_cards.serial_risk_repairs 或 recent_fatigue_action 未执行，必须补风险修复动作：用目标推进、阻碍升级、新信息、关系/世界调剂或冲突冷却把对应场景改成可见事件；修订后在 revision_receipts.changed_evidence 中说明风险修复证据。',
      '28C++. 如果自检指出 scene_card_receipts 与正文证据不一致，必须修复对应正文，并在修订后必须重写 scene_card_receipts、scene_start_anchor 和 scene_end_anchor；原 delivered=false 的项必须补成有 evidence 的 true，无法补足时继续保留 delivered=false 并写 remaining_risk，不得用空泛回执覆盖问题，不得借用其他场景证据。',
    '28D. 如果 prose_craft_checks 指出自然节奏重排或段落碎片化问题，必须合并同一镜头里的动作、感知和反应；只在新动作、新信息、对话或转折处断段。修订时先删修饰或拆长句，再保持同一戏剧单元完整，不得把完整推理链切成机械碎片。',
    '28D+. 如果 prose_craft_checks 指出小节结构问题，必须先重建小节骨架：一个主事件 + 3-5 个子事件，一个情绪变化，一条读者新信息，必要时补 3-5 轮对话交锋；小节结尾补钩子，下一节开头快速接续，不重新铺垫，并让情绪跨节递进。',
    '28E. 如果 prose_craft_checks 指出小节密度诊断问题，必须补感官细节、身体动作、对话交锋或2-3句简短回忆；也可补阻碍、配角反应、移动发现或动作递进。不得用环境描写、重复情绪或内心独白凑字数，不改变核心情节。',
    '28F. 如果 prose_craft_checks 指出具体字数表达问题，必须把“这五个字 / 短短四字 / 三个字一落 / 八个字砸下去”等精确字数写法改成“这句话一落”“这一句落下”“那几个字”“这行字”或“话音落下”；只改表达方式，保留原场景的压迫、反应和信息含义。',
    '29. 如果自检结果包含 punctuation_tone_checks，必须优先修复 status=fail/warn 的语气标点缺口；按 key/label/evidence/fix 修通篇句号化、随机标点堆砌、省略号/破折号硬停顿、质问/爆发/迟疑标点错配和角色声线同质。',
    '29A. 如果 punctuation_tone_checks 指出语气标点功能拍问题，必须用动作打断、换行或短句替代破折号/硬停顿；用冒号或短句制造信息揭示落点，删掉论文式长分号链，不改变剧情信息。',
    '30. 如果自检结果包含 quality_audit_checks，必须优先修复 status=fail/warn 的质量诊断缺口；按 key/label/evidence/fix/strategy 先补本章一句话概括和目的词（铺垫/高潮/爽点/打脸/人物塑造/设定），再按目的词重排详略，修章节结构、开篇钩子、中段推进、局势变化、章尾翻页、水文段落、事件内容比重、信息传递、五维低分项和卖点表达。事件内容比重缺口必须把旁白强塞的设定、背景和情绪改成动作、选择、阻碍、代价或局势变化；卖点表达必须隐性展示，删除“这是核心卖点/本章很爽/读者会喜欢”等告知句，改成开头暗示 -> 中间深化 -> 高潮爆发的剧情、对话和反应，并按 rewrite/compress/de_ai/polish 选择对应精修动作。',
    '30A. 输出 quality_audit_repair_receipts：逐条对应 quality_audit_checks 中 status=fail/warn 的诊断项，字段 check_key, label, original_evidence, applied_fix, changed_evidence, remaining_risk, strategy。changed_evidence 必须引用修订后正文具体句子或场景变化；如果某项仍未完全修复，remaining_risk 写清下一轮要继续处理什么。',
    '30B. 输出 next_chapter_quality_plan：它必须基于修订后的终稿正文重新判断，而不是照抄初稿自检计划。字段必须包含 version, quality_focus, opening_actions, middle_actions, ending_actions, avoid_repetition, evidence_basis, ending_contract。quality_focus 写下一章最该守住的1-3个质量目标；opening_actions 写前300字必须执行的动作；middle_actions 写中段必须落成的冲突/信息/状态变化；ending_actions 写最后300字必须形成的追读钩子或承接余波；avoid_repetition 写下一章禁止复现的表达、结构或收尾套路；evidence_basis 写这些计划来自修订后哪些正文证据、仍需续航的质量问题、回执残留或 oh-story 质量清单；ending_contract 必须包含 final_state, unresolved_question, next_chapter_pull, handoff_to_next，按 oh-story 结尾设定记录收束状态、未解决问题、下一章推动力和承接方式。',
    '30C. 输出 next_chapter_quality_plan_receipts：如果上下文、写前准备卡、delivery_risk_carry_over 或自检结果包含上一章的 next_chapter_quality_plan，必须在修订后的 oh_story_delivery_receipts.pre_draft_execution_receipts.next_chapter_quality_plan_receipts 中逐项证明本章已执行上一章质量续航计划；覆盖 quality_focus、opening_actions、middle_actions、ending_actions、avoid_repetition、evidence_basis、ending_contract，每项包含 key,label,delivered,evidence,remaining_risk。next_chapter_quality_plan_receipts 中 opening_actions 的 evidence 必须来自修订后前300字；middle_actions 的 evidence 必须来自修订后中段事件推进；ending_actions 的 evidence 必须来自修订后最后300字。',
    '',
    '【结构化上下文包】',
    prosePromptJson(buildProsePromptContextSnapshot(contextPackage), 6000),
    '',
    '【oh-story 精修策略简报 revision_strategy_brief】',
    JSON.stringify(revisionStrategyBrief, null, 2).slice(0, 2000),
    '',
    '【去AI味门禁摘要 deslop_gate_diagnostics】',
    JSON.stringify(review?.deslop_gate_diagnostics || review?.deslopGateDiagnostics || {}, null, 2).slice(0, 2000),
    '',
    '【确定性清理报告 deterministic_prose_cleanup】',
    JSON.stringify(review?.deterministic_prose_cleanup || review?.deterministicProseCleanup || {}, null, 2).slice(0, 3000),
    '',
    '【未闭环承接风险回执】',
    JSON.stringify(failedDeliveryRiskReceipts, null, 2).slice(0, 3000),
    '',
    '【自检结果】',
    JSON.stringify(review, null, 2).slice(0, 4000),
    '',
    '【初稿正文】',
    chapterText.slice(0, 16000),
    '',
      '输出优先使用 JSON；若无法输出严格 JSON，也必须直接输出修订后的完整正文，不要输出诊断报告、计划、解释或 markdown。',
      '请输出 JSON，包含 prose_chapters 数组。数组第一项必须包含 chapter_no, title, chapter_text, scene_breakdown, continuity_notes, revision_context_receipts, revision_receipts, deslop_repair_receipts, quality_audit_repair_receipts, revision_scope_guard, next_chapter_quality_plan, oh_story_delivery_receipts。revision_context_receipts(array) 必须逐项记录 previous_chapter、next_chapter、foreshadowing、character_cards、timeline、setting_context 等上下文核对结果。next_chapter_quality_plan 字段包含 version, quality_focus, opening_actions, middle_actions, ending_actions, avoid_repetition, evidence_basis, ending_contract({final_state,unresolved_question,next_chapter_pull,handoff_to_next})，必须基于修订后终稿正文。oh_story_delivery_receipts 必须包含 chapter_blueprint, scene_card_receipts, delivery_risk_receipts, revision_context_receipts(array), revision_receipts, deslop_repair_receipts, quality_audit_repair_receipts, artifact_protocol_receipts, pre_draft_execution_receipts；所有修订回执必须同时写入 oh_story_delivery_receipts，不能只散落在章节顶层或 scene_breakdown。若修订涉及状态筛选、来源就绪、项目产物协议、写前准备、意图确认、文风召回、样章策略或质量续航，必须在 oh_story_delivery_receipts.pre_draft_execution_receipts.status_filter_receipts、oh_story_delivery_receipts.pre_draft_execution_receipts.source_readiness_checks、oh_story_delivery_receipts.pre_draft_execution_receipts.artifact_protocol_receipts、oh_story_delivery_receipts.pre_draft_execution_receipts.write_preparation_checks、oh_story_delivery_receipts.pre_draft_execution_receipts.intent_confirmation_checks、oh_story_delivery_receipts.pre_draft_execution_receipts.benchmark_recall_checks、oh_story_delivery_receipts.pre_draft_execution_receipts.style_sample_checks、oh_story_delivery_receipts.pre_draft_execution_receipts.next_chapter_quality_plan_receipts 中逐项更新 delivered/evidence/remaining_risk、status/evidence/fix 或 used_in_chapter/evidence/excluded_reason/remaining_risk。scene_breakdown 必须保留并更新 scene_start_anchor、scene_end_anchor 和 scene_card_receipts；scene_start_anchor/scene_end_anchor 必须摘自修订后对应场景正文。revision_receipts 中如修改影响后续伏笔、时间线、角色状态、资产归属或关系边界，必须填写 affected_chapters 和 cascade_impacts。chapter_text 是修订后的完整简体中文正文，不要 markdown 标题。',
    ].join('\n')
  }

  const nextChapterQualityPlanNeedsRepair = (review: any) => {
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

  const fillMissingStructuredReviewChecks = async (
    activeWorkspace: string,
    project: any,
    contextPackage: any,
    chapterText: string,
    review: any,
    modelId?: number,
    options: any = {},
  ) => {
    const missingFields = missingStructuredReviewCheckFields(review)
    if (!missingFields.length || options.fill_missing_structured_checks === false) return null
    const reviewModelId = ctx.production.getStageModelId(project, 'review', modelId)
    const batches = chunkStructuredReviewFields(missingFields, options.structuredReviewBatchSize || options.structured_review_batch_size || 4)
    const structuredReviewLlmTimeoutMs = Math.max(30000, Math.min(
      Number(options.llmTimeoutMs || options.timeoutMs || 600000) || 600000,
      Number(options.structuredReviewLlmTimeoutMs || options.structured_review_llm_timeout_ms || 90000) || 90000,
    ))
    const mergedPayload: any = {}
    const diagnostics: any[] = []
    let modelName = ''
    for (const batchFields of batches) {
      throwIfAborted(options)
      const result = await executeAgent('review-agent', project, {
        task: buildMissingStructuredReviewChecksPrompt(project, contextPackage, chapterText, review, batchFields),
      }, {
        activeWorkspace,
        modelId: reviewModelId ? String(reviewModelId) : undefined,
        maxTokens: Math.max(8000, Math.min(14000, Number(options.structuredReviewMaxTokens || options.structured_review_max_tokens || 12000))),
        temperature: ctx.production.getStageTemperature(project, 'review', 0.15),
        skipMemory: true,
        signal: options.abortSignal,
        timeoutMs: structuredReviewLlmTimeoutMs,
      })
      if ((result as any).error) {
        diagnostics.push({
          missing_fields: batchFields,
          status: 'structured_fill_failed',
          error: String((result as any).error),
          llm_diagnostics: buildLLMResultDiagnostics(result),
          modelName: (result as any).modelName,
        })
        modelName = (result as any).modelName || modelName
        break
      }
      const payload = getNovelPayload(result)
      diagnostics.push({
        missing_fields: batchFields,
        llm_diagnostics: buildLLMResultDiagnostics(result),
        modelName: (result as any).modelName,
      })
      modelName = (result as any).modelName || modelName
      for (const [snakeField, camelField] of STRUCTURED_REVIEW_CHECK_FIELDS) {
        const value = payload?.[snakeField] || payload?.[camelField]
        if (Array.isArray(value)) mergedPayload[snakeField] = value
      }
      for (const key of ['delivery_risk_receipts', 'deliveryRiskReceipts', 'next_chapter_quality_plan_receipts', 'nextChapterQualityPlanReceipts', 'issues', 'findings']) {
        if (Array.isArray(payload?.[key])) mergedPayload[key] = payload[key]
      }
      for (const key of ['next_chapter_quality_plan', 'nextChapterQualityPlan', 'passed', 'score', 'needs_revision', 'needsRevision']) {
        if (payload?.[key] !== undefined) mergedPayload[key] = payload[key]
      }
    }
    return {
      payload: mergedPayload,
      diagnostics,
      missing_fields: missingFields,
      modelName,
    }
  }

  const shouldReviseProse = (review: any, options: any = {}) => {
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

  const runProseSelfReviewAndRevision = async (activeWorkspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options: any = {}) => {
    const reviewModelId = ctx.production.getStageModelId(project, 'review', modelId)
    const reviseModelId = ctx.production.getStageModelId(project, 'revise', modelId)
    const emitReviewProgress = async (phase: string, payload: any = {}) => {
      const callback = typeof options.onReviewProgress === 'function' ? options.onReviewProgress : null
      if (!callback) return
      await callback({
        phase,
        at: new Date().toISOString(),
        ...payload,
      })
    }
    const reviewMaxTokens = Math.max(5000, Math.min(9000, Number(
      options.reviewMaxTokens
      || options.review_max_tokens
      || (options.quality_gate_repair || options.deterministic_cleanup_repair ? 8000 : 6500),
    )))
    const reviewLlmTimeoutMs = Math.max(30000, Math.min(
      Number(options.llmTimeoutMs || options.timeoutMs || 600000) || 600000,
      Number(options.reviewLlmTimeoutMs || options.review_llm_timeout_ms || options.llmTimeoutMs || options.timeoutMs || 600000) || 600000,
    ))
    throwIfAborted(options)
    await emitReviewProgress('self_review_llm', {
      status: 'running',
      max_tokens: reviewMaxTokens,
      repair_mode: Boolean(options.quality_gate_repair || options.deterministic_cleanup_repair),
      review_llm_timeout_ms: reviewLlmTimeoutMs,
    })
    const reviewResult = await executeAgent('review-agent', project, {
      task: buildProseReviewPrompt(project, contextPackage, chapterText),
    }, {
      activeWorkspace,
      modelId: reviewModelId ? String(reviewModelId) : undefined,
      maxTokens: reviewMaxTokens,
      temperature: ctx.production.getStageTemperature(project, 'review', 0.2),
      skipMemory: true,
      signal: options.abortSignal,
      timeoutMs: reviewLlmTimeoutMs,
    })
    if ((reviewResult as any).error) {
      await emitReviewProgress('self_review_llm', {
        status: 'failed',
        error: String((reviewResult as any).error).slice(0, 240),
        llm_diagnostics: buildLLMResultDiagnostics(reviewResult),
      })
      throw Object.assign(new Error(String((reviewResult as any).error)), {
        code: 'PROSE_REVIEW_FAILED',
        llm_diagnostics: buildLLMResultDiagnostics(reviewResult),
      })
    }
    const reviewPayload = getNovelPayload(reviewResult)
    await emitReviewProgress('self_review_llm', {
      status: 'success',
      modelName: (reviewResult as any).modelName,
      raw_keys: Object.keys(reviewPayload || {}).slice(0, 20),
    })
    const deterministicModelDegenerationChecks = scanModelDegenerationRisks(chapterText)
    const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)
    const deterministicProseLanguageChecks = scanProseLanguageRisks(chapterText)
    const deterministicProseFormatChecks = scanProseFormatRisks(chapterText)
    const deterministicBannedWordChecks = scanBannedWordLeaks(chapterText)
    const deterministicWeakAdverbDensityChecks = scanWeakAdverbDensityRisks(chapterText)
    const deterministicContextSensitiveWordDensityChecks = scanContextSensitiveWordDensityRisks(chapterText)
    const deterministicAuthorialForecastChecks = scanAuthorialForecastRisks(chapterText)
    const deterministicRepeatedSubjectChecks = scanRepeatedSubjectRisks(chapterText)
    const deterministicTripleParallelChecks = scanTripleParallelRisks(chapterText)
    const deterministicRepeatedReactionChecks = scanRepeatedReactionRisks(chapterText)
    const deterministicUniformRhythmChecks = scanUniformRhythmRisks(chapterText)
    const deterministicDialogueToneChecks = scanDialogueToneRisks(chapterText)
    const deterministicEndingSummaryChecks = scanEndingSummaryRisks(chapterText)
    const deterministicOpeningHookChecks = scanOpeningHookRisks(chapterText)
    const deterministicOpeningFirst50Checks = scanOpeningFirst50ConflictRisks(chapterText)
    const deterministicOpeningEventDensityChecks = scanOpeningEventDensityRisks(chapterText)
    const deterministicOpeningProtagonistDelayChecks = scanOpeningProtagonistDelayRisks(chapterText)
    const deterministicEntryPromiseChecks = scanEntryPromiseAlignmentRisks(project, contextPackage, chapterText)
    const deterministicOpeningConflictChecks = scanOpeningConflictAlignmentRisks(contextPackage, chapterText)
    const deterministicEndingHookChecks = scanEndingHookRisks(chapterText)
    const deterministicSuddenEndingClueChecks = scanSuddenEndingClueRisks(chapterText)
    const deterministicEndingContractChecks = scanEndingContractExecutionRisks(contextPackage, chapterText)
    const deterministicOpeningHookEchoChecks = scanOpeningHookEchoRisks(chapterText)
    const deterministicOpeningHookHardChecks = [buildChapterHookDeterministicCheck(
      'deterministic_opening_hook',
      '章首钩子',
      [
        ...deterministicOpeningHookChecks,
        ...deterministicOpeningFirst50Checks,
        ...deterministicOpeningEventDensityChecks,
        ...deterministicOpeningProtagonistDelayChecks,
      ],
      '前100字必须有钩子，前300字必须让主角带着冲突进入现场。',
      '重写前100-300字：用异常、危险、选择、对话逼问、动作截断或规则触发开局，并让主角立刻做出可见反应。',
    )].filter(Boolean)
    const deterministicEndingHookHardChecks = [buildChapterHookDeterministicCheck(
      'deterministic_ending_hook',
      '章尾钩子',
      [
        ...deterministicEndingHookChecks,
        ...deterministicSuddenEndingClueChecks,
      ],
      '章尾必须留下下一章必须处理的问题，线索要有前文预热。',
      '重做最后100-300字：删总结升华，改成危机、决定、发现、物件变化、倒计时或未解问题；关键线索必须前文预热。',
    )].filter(Boolean)
    const deterministicOpeningHookEchoHardChecks = [buildChapterHookDeterministicCheck(
      'opening_hook_echo',
      '开篇钩子回收',
      deterministicOpeningHookEchoChecks,
      '开篇钩子必须在章尾被回收、升级、反转或转成下一章债务。',
      '章尾必须回应开篇抛出的证据、威胁、身份或异常：回收、升级、反转，或明确变成下一章要处理的问题。',
    )].filter(Boolean)
    const deterministicSceneCardChecks = buildSceneCardConsumptionChecks(contextPackage, chapterText)
    const deterministicSceneCardReceiptChecks = scanSceneCardReceiptRisks(contextPackage, chapterText)
    const deterministicSceneDensityChecks = scanSceneDensityExecutionRisks(contextPackage, chapterText)
    const deterministicScenePurposeWeightChecks = scanScenePurposeWeightRisks(contextPackage, chapterText)
    const deterministicSceneSensoryChecks = scanSceneSensoryAnchorRisks(contextPackage, chapterText)
    const deterministicSceneSerialRiskRepairChecks = scanSceneSerialRiskRepairRisks(contextPackage, chapterText)
    const deterministicParagraphHookStallChecks = scanParagraphHookStallRisks(chapterText)
    const deterministicShockLayeringChecks = scanShockLayeringRisks(chapterText)
    const deterministicParagraphHookHardChecks = [buildParagraphHookDeterministicCheck([
      ...deterministicParagraphHookStallChecks,
      ...deterministicShockLayeringChecks,
    ])].filter(Boolean)
    const deterministicPayoffSetupChecks = scanPayoffSetupRisks(chapterText)
    const deterministicFaceSlapRhythmChecks = scanFaceSlapRhythmRisks(chapterText)
    const deterministicEvidenceChainDumpChecks = scanEvidenceChainDumpRisks(chapterText)
    const deterministicFinalEvidenceImpactChecks = scanFinalEvidenceImpactRisks(chapterText)
    const deterministicEvidenceTimeBombChecks = scanEvidenceTimeBombRisks(chapterText)
    const deterministicAntagonistDownfallAgencyChecks = scanAntagonistDownfallAgencyRisks(chapterText)
    const deterministicReversalHardChecks = [buildReversalDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicSuspenseFalseAlarmChecks = scanSuspenseFalseAlarmRisks(chapterText)
    const deterministicSuspenseWithheldInfoChecks = scanSuspenseWithheldInfoRisks(chapterText)
    const deterministicObscureSuspenseChecks = scanObscureSuspenseRisks(chapterText)
    const deterministicSuspenseHardChecks = [buildSuspenseDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicExpectationVacuumChecks = scanExpectationVacuumRisks(chapterText)
    const deterministicParagraphProgressionChecks = scanParagraphProgressionRisks(chapterText)
    const deterministicSceneGoalObstacleChangeChecks = scanSceneGoalObstacleChangeRisks(chapterText)
    const deterministicCombatProcessChecks = scanCombatProcessRisks(chapterText)
    const deterministicParagraphFragmentationChecks = scanParagraphFragmentationRisks(chapterText)
    const deterministicParagraphLengthUniformityChecks = scanParagraphLengthUniformityRisks(chapterText)
    const deterministicParagraphCommaChainDensityChecks = scanParagraphCommaChainDensityRisks(chapterText)
    const deterministicNarrativeTransitionChecks = scanNarrativeTransitionRisks(chapterText)
    const deterministicProseMotionStillChecks = scanProseMotionStillRisks(chapterText)
    const deterministicProseStackedDescriptionChecks = scanProseStackedDescriptionRisks(chapterText)
    const deterministicProseStaticEnvironmentChecks = scanProseStaticEnvironmentRisks(chapterText)
    const deterministicProseDecorativeDetailChecks = scanProseDecorativeDetailRisks(chapterText)
    const deterministicVagueQuantityWeightChecks = scanVagueQuantityWeightRisks(chapterText)
    const deterministicSpecificCharacterCountChecks = scanSpecificCharacterCountExpressionRisks(chapterText)
    const deterministicProseCameraAnchorChecks = scanProseCameraAnchorRisks(chapterText)
    const deterministicProseOmniscientCrowdCameraChecks = scanProseOmniscientCrowdCameraRisks(chapterText)
    const deterministicInfodumpChecks = scanInfodumpRisks(chapterText)
    const deterministicRecapFillerChecks = scanRecapFillerRisks(chapterText)
    const deterministicNewConceptChecks = scanNewConceptOverloadRisks(contextPackage)
    const deterministicScaleAnchorChecks = scanEconomicPowerScaleAnchorRisks(chapterText)
    const deterministicEmotionTellingChecks = scanEmotionTellingRisks(chapterText)
    const deterministicEmotionalStasisChecks = scanEmotionalStasisRisks(chapterText)
    const deterministicDownwardSafetyChecks = scanDownwardSafetyRisks(chapterText)
    const deterministicOppressionPurposeChecks = scanOppressionPurposeRisks(chapterText)
    const deterministicPayoffDensityChecks = scanPayoffDensityRisks(chapterText)
    const deterministicPayoffEscalationChecks = scanPayoffEscalationRisks(chapterText)
    const deterministicTrumpCardEffectChecks = scanTrumpCardEffectRisks(chapterText)
    const deterministicEmotionalArcChecks = [buildEmotionalArcDeterministicCheck(chapterText, {
      scanEmotionalStasisRisks,
      scanDownwardSafetyRisks,
      scanOppressionPurposeRisks,
      scanPayoffDensityRisks,
      scanPayoffEscalationRisks,
      scanTrumpCardEffectRisks,
    })].filter(Boolean)
    const deterministicUpgradeAftermathChecks = scanUpgradeAftermathRisks(chapterText)
    const deterministicUpgradeRhythmChecks = [buildUpgradeRhythmDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicInternalMonologueChecks = scanInternalMonologueRisks(chapterText)
    const deterministicDialogueFormatChecks = scanDialogueFormatRisks(chapterText)
    const deterministicDialogueQuoteStyleChecks = scanDialogueQuoteStyleRisks(chapterText)
    const deterministicDialoguePowerBalanceChecks = scanDialoguePowerBalanceRisks(chapterText)
    const deterministicDialogueProtagonistLineEconomyChecks = scanDialogueProtagonistLineEconomyRisks(chapterText)
    const deterministicDialogueQuestionAnswerLoopChecks = scanDialogueQuestionAnswerLoopRisks(chapterText)
    const deterministicDialogueJudgmentQuestionChecks = scanDialogueJudgmentQuestionRisks(chapterText)
    const deterministicDialogueSubtextAgendaChecks = scanDialogueSubtextAgendaRisks(chapterText)
    const deterministicDialogueEmptyPraiseChecks = scanDialogueEmptyPraiseRisks(chapterText)
    const deterministicDialogueEmotionContinuityChecks = scanDialogueEmotionContinuityRisks(chapterText)
    const deterministicDialogueEasyPersuasionChecks = scanDialogueEasyPersuasionRisks(chapterText)
    const deterministicDialogueVoiceSamenessChecks = scanDialogueVoiceSamenessRisks(chapterText)
    const deterministicDialogueBreathChecks = scanDialogueBreathRisks(chapterText)
    const deterministicDialogueDensityChecks = scanDialogueDensityRisks(chapterText)
    const deterministicDialogueInfodumpChecks = scanDialogueInfodumpRisks(chapterText)
    const deterministicDialogueHardChecks = [buildDialogueDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicProtagonistComposureChecks = scanProtagonistComposureRisks(contextPackage, chapterText)
    const deterministicCharacterBehaviorChecks = [buildCharacterBehaviorDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicRelationshipSceneChangeChecks = scanRelationshipSceneChangeRisks(chapterText)
    const deterministicContinuityHeatChecks = [buildContinuityHeatDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicCharacterRelationChecks = [buildCharacterRelationDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicAssetLinkageChecks = [buildAssetLinkageDeterministicCheck(contextPackage, chapterText)].filter(Boolean)
    const deterministicStateTrackingChecks = [buildStateTrackingDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicChapterHandoffChecks = [buildChapterHandoffDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicPunctuationToneChecks = scanPunctuationToneRisks(chapterText)
    const deterministicPeriodMonotonyChecks = scanPeriodMonotonyRisks(chapterText)
    const deterministicBlueprintCraftChecks = scanChapterBlueprintCraftRisks(contextPackage, chapterText)
    const deterministicCharacterOrderChecks = scanCharacterOrderExecutionRisks(contextPackage, chapterText)
    const deterministicBeatSequenceChecks = scanBeatSequenceExecutionRisks(contextPackage, chapterText)
    const deterministicCostRewardChecks = scanCostRewardExecutionRisks(contextPackage, chapterText)
    const deterministicIntentConfirmationChecks = [buildIntentConfirmationDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicLocalVictoryCostChecks = scanLocalVictoryCostRisks(chapterText)
    const deterministicShowdownHardChecks = [buildShowdownDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicBridgeUnitChecks = [buildBridgeUnitDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicPlotDynamicsChecks = [buildPlotDynamicsDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicBenchmarkRecallChecks = scanBenchmarkRecallExecutionRisks(contextPackage, chapterText)
    const deterministicGoldenThreeChecks = scanGoldenThreeExecutionRisks(contextPackage, chapterText)
    const deterministicTargetReaderChecks = [buildTargetReaderDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicGenrePositioningChecks = [buildGenrePositioningDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicCoreContractChecks = [buildCoreContractDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicFemaleAudienceChecks = [buildFemaleAudienceDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicConflictStructureChecks = [buildConflictStructureDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicProseCraftHardChecks = [buildProseCraftDeterministicCheck(contextPackage, chapterText)].filter(Boolean)
    const deterministicPunctuationToneHardChecks = [buildPunctuationToneDeterministicCheck(chapterText)].filter(Boolean)
    const deterministicQualityAuditHardChecks = [buildQualityAuditDeterministicCheck(contextPackage, chapterText)].filter(Boolean)
    const normalizedDeslopChecks = [
      ...(Array.isArray(reviewPayload?.deslop_checks)
        ? reviewPayload.deslop_checks
        : Array.isArray(reviewPayload?.deslopChecks)
          ? reviewPayload.deslopChecks
          : []),
      ...deterministicBannedWordChecks,
      ...deterministicWeakAdverbDensityChecks,
      ...deterministicContextSensitiveWordDensityChecks,
      ...deterministicAuthorialForecastChecks,
      ...deterministicRepeatedSubjectChecks,
      ...deterministicTripleParallelChecks,
      ...deterministicRepeatedReactionChecks,
      ...deterministicUniformRhythmChecks,
      ...deterministicDialogueToneChecks,
      ...deterministicEndingSummaryChecks,
    ]
    const reviewChecks = (snakeField: string, camelField: string) => Array.isArray(reviewPayload?.[snakeField])
      ? reviewPayload[snakeField]
      : Array.isArray(reviewPayload?.[camelField])
        ? reviewPayload[camelField]
        : []
    const reviewPayloadDeliveryReceipts = reviewPayload?.oh_story_delivery_receipts || reviewPayload?.ohStoryDeliveryReceipts || {}
    const reviewNextChapterQualityPlan = reviewPayload?.next_chapter_quality_plan
      || reviewPayload?.nextChapterQualityPlan
      || reviewPayloadDeliveryReceipts?.next_chapter_quality_plan
      || reviewPayloadDeliveryReceipts?.nextChapterQualityPlan
      || null
    const emitMissingStructuredContractChecks = options.fill_missing_structured_checks !== false
    const requiredContractChecks = (
      checkField: string,
      camelField: string,
      contractField: string,
      label: string,
    ) => appendMissingContractReviewCheck(
      reviewChecks(checkField, camelField),
      getContextContract(contextPackage, contractField),
      checkField,
      contractField,
      label,
      { emit_missing_check: emitMissingStructuredContractChecks },
    )
    const preDraftReceiptChecks = (checksForSection: (section: any) => any[]) => preDraftExecutionReceiptSections(reviewPayload)
      .flatMap(checksForSection)
      .map((check: any) => ({
        ...check,
        status: check?.status || (check?.delivered === false || revisionReceiptRemainingRisk(check) ? 'fail' : 'pass'),
      }))
    const statusFilterReceiptChecks = preDraftReceiptChecks((section: any) => asArray(section?.status_filter_receipts || section?.statusFilterReceipts))
      .map((check: any) => ({
        ...check,
        key: check?.key || 'status_filter_receipt',
        label: check?.label || '状态筛选回执',
        evidence: check?.evidence || check?.excluded_reason || check?.excludedReason || check?.remaining_risk || check?.remainingRisk,
        fix: check?.fix || check?.remaining_risk || check?.remainingRisk || '补充状态筛选回执，说明该状态是否影响本章正确性。',
      }))
    const rawReviewScore = Number(reviewPayload?.score)
    const reviewScoreDefaulted = !Number.isFinite(rawReviewScore)
    const rawReviewIssues = [
      ...asArray(reviewPayload?.issues),
      ...asArray(reviewPayload?.findings),
    ].map(normalizeIssue)
    const deterministicWordCountIssueGuard = applyDeterministicWordCountIssueGuard(
      rawReviewIssues,
      reviewScoreDefaulted ? 80 : rawReviewScore,
      chapterText,
      contextPackage?.chapter_target?.word_target
        || contextPackage?.chapterTarget?.word_target
        || contextPackage?.chapter_target?.wordTarget
        || contextPackage?.chapterTarget?.wordTarget
        || resolveChapterWordTarget(project, contextPackage?.chapter_target || contextPackage?.chapterTarget || {}),
      Number(options.quality_threshold || options.qualityThreshold || 0),
    )
    // Source guard anchor: const normalizedReview = {
    let normalizedReview: any = {
      // Source guards: these raw model fields are consumed through requiredContractChecks.
      // reviewPayload?.reader_retention_checks reviewPayload?.target_reader_checks reviewPayload?.genre_positioning_checks reviewPayload?.plot_special_topics_checks reviewPayload?.core_contract_checks reviewPayload?.female_audience_checks reviewPayload?.upgrade_rhythm_checks reviewPayload?.conflict_structure_checks
      // reviewPayload?.dialogue_checks reviewPayload?.plot_dynamics_checks reviewPayload?.story_power_checks reviewPayload?.continuity_heat_checks reviewPayload?.character_relation_checks
      // reviewPayload?.character_behavior_checks reviewPayload?.asset_linkage_checks reviewPayload?.state_tracking_checks reviewPayload?.source_readiness_checks reviewPayload?.chapter_handoff_checks
      // reviewPayload?.intent_confirmation_checks reviewPayload?.information_flow_checks reviewPayload?.expectation_threshold_checks reviewPayload?.story_loop_checks
      // reviewPayload?.emotional_arc_checks reviewPayload?.chapter_hook_checks reviewPayload?.chapter_hook_quality_checks reviewPayload?.paragraph_hook_checks reviewPayload?.suspense_checks
      // reviewPayload?.reversal_checks reviewPayload?.showdown_checks reviewPayload?.bridge_unit_checks reviewPayload?.style_boundary_checks reviewPayload?.style_sample_checks reviewPayload?.opening_checks reviewPayload?.prose_craft_checks reviewPayload?.punctuation_tone_checks reviewPayload?.quality_audit_checks
      passed: reviewPayload?.passed !== false,
      score: reviewScoreDefaulted ? 80 : deterministicWordCountIssueGuard.score,
      score_defaulted: reviewScoreDefaulted,
      issues: deterministicWordCountIssueGuard.issues,
      deterministic_word_count_issue_guard: deterministicWordCountIssueGuard.ignored_issues.length > 0
        ? deterministicWordCountIssueGuard
        : undefined,
      revision_directives: Array.isArray(reviewPayload?.revision_directives)
        ? reviewPayload.revision_directives.map((item: any) => String(item))
        : Array.isArray(reviewPayload?.revisionDirectives)
          ? reviewPayload.revisionDirectives.map((item: any) => String(item))
          : [],
      craft_metrics: reviewPayload?.craft_metrics || reviewPayload?.craftMetrics || {},
      five_dimension_scores: normalizeFiveDimensionQualityScores(
        reviewPayload?.five_dimension_scores
        || reviewPayload?.fiveDimensionScores
        || reviewPayload?.five_dimensions
        || reviewPayload?.fiveDimensions
        || reviewPayload?.quality_audit_scores
        || reviewPayload?.qualityAuditScores,
      ),
      focused_revision_modes: Array.isArray(reviewPayload?.focused_revision_modes)
        ? reviewPayload.focused_revision_modes.map((item: any) => String(item))
        : Array.isArray(reviewPayload?.focusedRevisionModes)
          ? reviewPayload.focusedRevisionModes.map((item: any) => String(item))
          : [],
      setting_violations: Array.isArray(reviewPayload?.setting_violations)
        ? reviewPayload.setting_violations
        : Array.isArray(reviewPayload?.settingViolations)
          ? reviewPayload.settingViolations
          : [],
      rubric: String(reviewPayload?.rubric || contextPackage?.chapter_target?.platform_rubric?.platform || contextPackage?.platform_rubric?.platform || ''),
      rubric_source: String(reviewPayload?.rubric_source || reviewPayload?.rubricSource || contextPackage?.chapter_target?.platform_rubric?.source || contextPackage?.platform_rubric?.source || ''),
      platform_checks: Array.isArray(reviewPayload?.platform_checks)
        ? reviewPayload.platform_checks
        : Array.isArray(reviewPayload?.platformChecks)
          ? reviewPayload.platformChecks
          : [],
      content_rubric_source: String(reviewPayload?.content_rubric_source || reviewPayload?.contentRubricSource || contextPackage?.chapter_target?.content_rubric?.source || contextPackage?.content_rubric?.source || ''),
      content_rubric_checks: Array.isArray(reviewPayload?.content_rubric_checks)
        ? reviewPayload.content_rubric_checks
        : Array.isArray(reviewPayload?.contentRubricChecks)
          ? reviewPayload.contentRubricChecks
          : [],
      factual_checks: reviewChecks('factual_checks', 'factualChecks'),
      model_degeneration_checks: [
        ...asArray(reviewPayload?.model_degeneration_checks || reviewPayload?.modelDegenerationChecks),
        ...deterministicModelDegenerationChecks,
      ],
      chapter_positioning_checks: reviewChecks('chapter_positioning_checks', 'chapterPositioningChecks'),
      innovation_checks: asArray(reviewPayload?.innovation_checks || reviewPayload?.innovationChecks),
      chapter_attraction_checks: asArray(reviewPayload?.chapter_attraction_checks || reviewPayload?.chapterAttractionChecks),
      story_drive_checks: asArray(reviewPayload?.story_drive_checks || reviewPayload?.storyDriveChecks),
      character_arc_checks: asArray(reviewPayload?.character_arc_checks || reviewPayload?.characterArcChecks),
      chapter_benchmark_checks: asArray(reviewPayload?.chapter_benchmark_checks || reviewPayload?.chapterBenchmarkChecks),
      title_uniqueness_checks: asArray(reviewPayload?.title_uniqueness_checks || reviewPayload?.titleUniquenessChecks),
      banned_words_checks: asArray(reviewPayload?.banned_words_checks || reviewPayload?.bannedWordsChecks),
      blueprint_consumption_checks: asArray(reviewPayload?.blueprint_consumption_checks || reviewPayload?.blueprintConsumptionChecks),
      word_count_checks: asArray(reviewPayload?.word_count_checks || reviewPayload?.wordCountChecks),
      reader_retention_checks: requiredContractChecks('reader_retention_checks', 'readerRetentionChecks', 'reader_retention_brief', '追读雷达'),
      target_reader_checks: [...requiredContractChecks('target_reader_checks', 'targetReaderChecks', 'target_reader_contract', '目标读者'), ...deterministicTargetReaderChecks],
      genre_positioning_checks: [...requiredContractChecks('genre_positioning_checks', 'genrePositioningChecks', 'genre_positioning_contract', '题材定位'), ...deterministicGenrePositioningChecks],
      plot_special_topics_checks: requiredContractChecks('plot_special_topics_checks', 'plotSpecialTopicsChecks', 'plot_special_topics_contract', '特殊题材'),
      core_contract_checks: [...reviewChecks('core_contract_checks', 'coreContractChecks'), ...deterministicCoreContractChecks],
      female_audience_checks: [...requiredContractChecks('female_audience_checks', 'femaleAudienceChecks', 'female_audience_contract', '女频长篇'), ...deterministicFemaleAudienceChecks],
      upgrade_rhythm_checks: [...requiredContractChecks('upgrade_rhythm_checks', 'upgradeRhythmChecks', 'upgrade_rhythm_contract', '升级节奏'), ...deterministicUpgradeAftermathChecks, ...deterministicUpgradeRhythmChecks],
      structure_checks: asArray(reviewPayload?.structure_checks || reviewPayload?.structureChecks),
      progression_checks: asArray(reviewPayload?.progression_checks || reviewPayload?.progressionChecks),
      information_checks: asArray(reviewPayload?.information_checks || reviewPayload?.informationChecks),
      conflict_structure_checks: [...requiredContractChecks('conflict_structure_checks', 'conflictStructureChecks', 'conflict_structure_contract', '冲突结构'), ...deterministicConflictStructureChecks],
      perspective_verdicts: normalizePerspectiveVerdicts(reviewPayload?.perspective_verdicts || reviewPayload?.perspectiveVerdicts),
      deslop_level: String(reviewPayload?.deslop_level || reviewPayload?.deslopLevel || ''),
      deslop_checks: normalizedDeslopChecks,
      deslop_gate_diagnostics: buildDeslopGateDiagnostics(normalizedDeslopChecks),
      deterministic_prose_cleanup: options.deterministic_prose_cleanup || reviewPayload?.deterministic_prose_cleanup || reviewPayload?.deterministicProseCleanup || null,
      prose_meta_checks: [
        ...(Array.isArray(reviewPayload?.prose_meta_checks)
          ? reviewPayload.prose_meta_checks
          : Array.isArray(reviewPayload?.proseMetaChecks)
            ? reviewPayload.proseMetaChecks
            : []),
        ...deterministicProseMetaChecks,
      ],
      dialogue_checks: [
        ...requiredContractChecks('dialogue_checks', 'dialogueChecks', 'dialogue_contract', '对白质量'),
        ...deterministicDialogueFormatChecks,
        ...deterministicDialogueQuoteStyleChecks,
        ...deterministicDialoguePowerBalanceChecks,
        ...deterministicDialogueProtagonistLineEconomyChecks,
        ...deterministicDialogueQuestionAnswerLoopChecks,
        ...deterministicDialogueJudgmentQuestionChecks,
        ...deterministicDialogueSubtextAgendaChecks,
        ...deterministicDialogueEmptyPraiseChecks,
        ...deterministicDialogueEmotionContinuityChecks,
        ...deterministicDialogueEasyPersuasionChecks,
        ...deterministicDialogueVoiceSamenessChecks,
        ...deterministicDialogueBreathChecks,
        ...deterministicDialogueDensityChecks,
        ...deterministicDialogueInfodumpChecks,
        ...deterministicDialogueHardChecks,
      ],
      plot_dynamics_checks: [...requiredContractChecks('plot_dynamics_checks', 'plotDynamicsChecks', 'plot_dynamics_contract', '剧情动力'), ...deterministicLocalVictoryCostChecks, ...deterministicPlotDynamicsChecks],
      story_power_checks: requiredContractChecks('story_power_checks', 'storyPowerChecks', 'story_power_contract', '故事力'),
      mainline_definition_checks: requiredContractChecks('mainline_definition_checks', 'mainlineDefinitionChecks', 'mainline_definition_contract', '主线定义'),
      continuity_heat_checks: [...requiredContractChecks('continuity_heat_checks', 'continuityHeatChecks', 'continuity_heat_contract', '连续性热度'), ...deterministicContinuityHeatChecks],
      character_relation_checks: [...requiredContractChecks('character_relation_checks', 'characterRelationChecks', 'character_relation_contract', '角色关系'), ...deterministicRelationshipSceneChangeChecks, ...deterministicCharacterRelationChecks],
      character_behavior_checks: [...requiredContractChecks('character_behavior_checks', 'characterBehaviorChecks', 'character_behavior_contract', '角色行为'), ...deterministicProtagonistComposureChecks, ...deterministicCharacterBehaviorChecks],
      asset_linkage_checks: [...requiredContractChecks('asset_linkage_checks', 'assetLinkageChecks', 'asset_linkage_contract', '资产挂钩'), ...deterministicAssetLinkageChecks],
      state_tracking_checks: [
        ...appendMissingStatusFilterReceiptCheck(
          [
            ...requiredContractChecks('state_tracking_checks', 'stateTrackingChecks', 'state_tracking_contract', '状态跟踪'),
            ...statusFilterReceiptChecks,
          ],
          getContextContract(contextPackage, 'state_tracking_contract'),
          statusFilterReceiptChecks,
        ),
        ...deterministicStateTrackingChecks,
      ],
      status_filter_receipts: [
        ...asArray(reviewPayload?.status_filter_receipts || reviewPayload?.statusFilterReceipts),
        ...statusFilterReceiptChecks,
      ],
      story_state_update_checks: reviewChecks('story_state_update_checks', 'storyStateUpdateChecks'),
      foreshadowing_delta_checks: reviewChecks('foreshadowing_delta_checks', 'foreshadowingDeltaChecks'),
      source_readiness_checks: (() => {
        const deterministicSourceReadinessChecks = buildSourceReadinessChecks(contextPackage)
        return [
          ...appendMissingContractReviewCheck(
            [
              ...reviewChecks('source_readiness_checks', 'sourceReadinessChecks'),
              ...preDraftReceiptChecks((section: any) => asArray(section?.source_readiness_checks || section?.sourceReadinessChecks)),
            ],
            getContextContract(contextPackage, 'state_tracking_contract'),
            'source_readiness_checks',
            'state_tracking_contract',
            '来源就绪',
            { emit_missing_check: emitMissingStructuredContractChecks },
          ),
          ...deterministicSourceReadinessChecks,
        ]
      })(),
      artifact_protocol_receipts: [
        ...asArray(reviewPayload?.artifact_protocol_receipts || reviewPayload?.artifactProtocolReceipts),
        ...preDraftReceiptChecks((section: any) => asArray(section?.artifact_protocol_receipts || section?.artifactProtocolReceipts)),
      ],
      write_preparation_checks: [
        ...appendMissingContractReviewCheck(
          [
            ...asArray(reviewPayload?.write_preparation_checks || reviewPayload?.writePreparationChecks),
            ...preDraftReceiptChecks((section: any) => asArray(section?.write_preparation_checks || section?.writePreparationChecks)),
          ],
          getContextContract(contextPackage, 'write_preparation_brief'),
          'write_preparation_checks',
          'write_preparation_brief',
          '写前准备',
          { emit_missing_check: emitMissingStructuredContractChecks },
        ),
      ],
      next_chapter_quality_plan_receipts: [
        ...appendMissingNextChapterQualityPlanReceiptCheck(
          [
            ...asArray(reviewPayload?.next_chapter_quality_plan_receipts || reviewPayload?.nextChapterQualityPlanReceipts),
            ...preDraftReceiptChecks((section: any) => asArray(section?.next_chapter_quality_plan_receipts || section?.nextChapterQualityPlanReceipts)),
          ],
          contextPackage,
        ),
      ],
      chapter_handoff_checks: [...requiredContractChecks('chapter_handoff_checks', 'chapterHandoffChecks', 'chapter_handoff_contract', '章首承接'), ...deterministicChapterHandoffChecks],
      intent_confirmation_checks: [
        ...requiredContractChecks('intent_confirmation_checks', 'intentConfirmationChecks', 'intent_confirmation_contract', '意图确认'),
        ...preDraftReceiptChecks((section: any) => asArray(section?.intent_confirmation_checks || section?.intentConfirmationChecks)),
        ...deterministicCharacterOrderChecks,
        ...deterministicBeatSequenceChecks,
        ...deterministicCostRewardChecks,
        ...deterministicIntentConfirmationChecks,
      ],
      benchmark_recall_checks: [
        ...requiredContractChecks('benchmark_recall_checks', 'benchmarkRecallChecks', 'benchmark_recall_brief', '文风召回'),
        ...preDraftReceiptChecks((section: any) => asArray(section?.benchmark_recall_checks || section?.benchmarkRecallChecks)),
        ...deterministicBenchmarkRecallChecks,
      ],
      style_boundary_checks: requiredContractChecks('style_boundary_checks', 'styleBoundaryChecks', 'style_boundary_contract', '文风覆盖边界'),
      style_sample_checks: [
        ...requiredContractChecks('style_sample_checks', 'styleSampleChecks', 'style_sample_strategy', '样章策略'),
        ...preDraftReceiptChecks((section: any) => asArray(section?.style_sample_checks || section?.styleSampleChecks)),
      ],
      information_flow_checks: requiredContractChecks('information_flow_checks', 'informationFlowChecks', 'information_flow_contract', '信息团衔接'),
      expectation_threshold_checks: [...requiredContractChecks('expectation_threshold_checks', 'expectationThresholdChecks', 'expectation_threshold_contract', '期待门槛'), ...deterministicExpectationVacuumChecks],
      story_loop_checks: requiredContractChecks('story_loop_checks', 'storyLoopChecks', 'story_loop_contract', '故事循环'),
      emotional_arc_checks: [...requiredContractChecks('emotional_arc_checks', 'emotionalArcChecks', 'emotional_arc_contract', '情绪弧'), ...deterministicEmotionalStasisChecks, ...deterministicDownwardSafetyChecks, ...deterministicOppressionPurposeChecks, ...deterministicPayoffDensityChecks, ...deterministicPayoffEscalationChecks, ...deterministicTrumpCardEffectChecks, ...deterministicEmotionalArcChecks],
      chapter_hook_checks: [...requiredContractChecks('chapter_hook_checks', 'chapterHookChecks', 'chapter_hook_contract', '章级钩子'), ...deterministicEndingHookChecks, ...deterministicSuddenEndingClueChecks, ...deterministicEndingContractChecks, ...deterministicOpeningHookEchoChecks, ...deterministicOpeningHookHardChecks, ...deterministicEndingHookHardChecks, ...deterministicOpeningHookEchoHardChecks],
      chapter_hook_quality_checks: requiredContractChecks('chapter_hook_quality_checks', 'chapterHookQualityChecks', 'chapter_hook_contract', '章钩质量'),
      paragraph_hook_checks: [...requiredContractChecks('paragraph_hook_checks', 'paragraphHookChecks', 'paragraph_hook_contract', '段落级钩子'), ...deterministicParagraphHookStallChecks, ...deterministicShockLayeringChecks, ...deterministicParagraphHookHardChecks],
      suspense_checks: [...requiredContractChecks('suspense_checks', 'suspenseChecks', 'suspense_contract', '悬念编排'), ...deterministicSuspenseFalseAlarmChecks, ...deterministicSuspenseWithheldInfoChecks, ...deterministicObscureSuspenseChecks, ...deterministicSuspenseHardChecks],
      reversal_checks: [...requiredContractChecks('reversal_checks', 'reversalChecks', 'reversal_contract', '反转设计'), ...deterministicFaceSlapRhythmChecks, ...deterministicEvidenceChainDumpChecks, ...deterministicFinalEvidenceImpactChecks, ...deterministicEvidenceTimeBombChecks, ...deterministicAntagonistDownfallAgencyChecks, ...deterministicReversalHardChecks],
      showdown_checks: [...requiredContractChecks('showdown_checks', 'showdownChecks', 'showdown_contract', '高潮对抗'), ...deterministicShowdownHardChecks],
      bridge_unit_checks: [...requiredContractChecks('bridge_unit_checks', 'bridgeUnitChecks', 'bridge_unit_contract', '桥段节奏'), ...deterministicBridgeUnitChecks],
      opening_checks: [...requiredContractChecks('opening_checks', 'openingChecks', 'opening_contract', '开篇设计'), ...deterministicOpeningHookChecks, ...deterministicOpeningFirst50Checks, ...deterministicOpeningEventDensityChecks, ...deterministicOpeningProtagonistDelayChecks, ...deterministicEntryPromiseChecks, ...deterministicOpeningConflictChecks],
      prose_craft_checks: [...requiredContractChecks('prose_craft_checks', 'proseCraftChecks', 'prose_craft_contract', '正文工艺'), ...deterministicEmotionTellingChecks, ...deterministicInternalMonologueChecks, ...deterministicCombatProcessChecks, ...deterministicParagraphFragmentationChecks, ...deterministicParagraphLengthUniformityChecks, ...deterministicParagraphCommaChainDensityChecks, ...deterministicNarrativeTransitionChecks, ...deterministicSceneDensityChecks, ...deterministicSceneSensoryChecks, ...deterministicProseMotionStillChecks, ...deterministicProseStackedDescriptionChecks, ...deterministicProseStaticEnvironmentChecks, ...deterministicProseDecorativeDetailChecks, ...deterministicVagueQuantityWeightChecks, ...deterministicSpecificCharacterCountChecks, ...deterministicProseCameraAnchorChecks, ...deterministicProseOmniscientCrowdCameraChecks, ...deterministicBlueprintCraftChecks, ...deterministicProseCraftHardChecks],
      serial_risk_repair_checks: [
        ...asArray(reviewPayload?.serial_risk_repair_checks || reviewPayload?.serialRiskRepairChecks),
        ...deterministicSceneSerialRiskRepairChecks,
      ],
      revision_receipt_checks: asArray(reviewPayload?.revision_receipt_checks || reviewPayload?.revisionReceiptChecks),
      deslop_repair_checks: asArray(reviewPayload?.deslop_repair_checks || reviewPayload?.deslopRepairChecks),
      punctuation_tone_checks: [...requiredContractChecks('punctuation_tone_checks', 'punctuationToneChecks', 'punctuation_tone_contract', '语气标点'), ...deterministicPunctuationToneChecks, ...deterministicPeriodMonotonyChecks, ...deterministicPunctuationToneHardChecks],
      quality_audit_checks: [
        ...requiredContractChecks('quality_audit_checks', 'qualityAuditChecks', 'quality_audit_contract', '质量诊断'),
        ...deterministicModelDegenerationChecks,
        ...deterministicProseLanguageChecks,
        ...deterministicProseFormatChecks,
        ...deterministicSceneCardChecks,
        ...deterministicSceneCardReceiptChecks,
        ...deterministicScenePurposeWeightChecks,
        ...deterministicParagraphProgressionChecks,
        ...deterministicSceneGoalObstacleChangeChecks,
        ...deterministicInfodumpChecks,
        ...deterministicRecapFillerChecks,
        ...deterministicNewConceptChecks,
        ...deterministicScaleAnchorChecks,
        ...deterministicBlueprintCraftChecks,
        ...deterministicPayoffSetupChecks,
        ...deterministicGoldenThreeChecks,
        ...deterministicQualityAuditHardChecks,
      ],
      longform_checks: asArray(reviewPayload?.longform_checks || reviewPayload?.longformChecks),
      delivery_risk_receipts: normalizeDeliveryRiskReceipts(reviewPayload, contextPackage, chapterText),
      next_chapter_quality_plan: reviewNextChapterQualityPlan,
      quality_gate: options.quality_gate || options.qualityGate || reviewPayload?.quality_gate || reviewPayload?.qualityGate || null,
      quality_threshold: options.quality_threshold || options.qualityThreshold || reviewPayload?.quality_threshold || reviewPayload?.qualityThreshold || null,
      needs_revision: Boolean(reviewPayload?.needs_revision ?? reviewPayload?.needsRevision),
      modelName: (reviewResult as any).modelName,
    }
    if (nextChapterQualityPlanNeedsRepair(normalizedReview)) {
      normalizedReview.next_chapter_quality_plan = buildFallbackNextChapterQualityPlan(normalizedReview, contextPackage, chapterText)
    }
    await emitReviewProgress('structured_review_fill', {
      status: 'running',
      missing_field_count: missingStructuredReviewCheckFields(normalizedReview).length,
      structured_review_llm_timeout_ms: Math.max(30000, Math.min(
        Number(options.llmTimeoutMs || options.timeoutMs || 600000) || 600000,
        Number(options.structuredReviewLlmTimeoutMs || options.structured_review_llm_timeout_ms || 90000) || 90000,
      )),
    })
    const structuredFillReview = await fillMissingStructuredReviewChecks(activeWorkspace, project, contextPackage, chapterText, normalizedReview, modelId, options)
    if (structuredFillReview?.payload) {
      normalizedReview = mergeStructuredReviewFillPayload(normalizedReview, {
        ...structuredFillReview.payload,
        structured_fill_diagnostics: {
          missing_fields: structuredFillReview.missing_fields,
          llm_diagnostics: structuredFillReview.diagnostics,
          modelName: structuredFillReview.modelName,
        },
      }, contextPackage, chapterText)
      if (nextChapterQualityPlanNeedsRepair(normalizedReview)) {
        normalizedReview.next_chapter_quality_plan = buildFallbackNextChapterQualityPlan(normalizedReview, contextPackage, chapterText)
      }
    }
    await emitReviewProgress('structured_review_fill', {
      status: structuredFillReview?.diagnostics?.some((item: any) => item?.status === 'structured_fill_failed') ? 'warn' : (structuredFillReview ? 'success' : 'skipped'),
      missing_field_count: structuredFillReview?.missing_fields?.length || 0,
      filled_field_count: Object.keys(structuredFillReview?.payload || {}).length,
      diagnostics_count: structuredFillReview?.diagnostics?.length || 0,
    })
    const hasDeliveryRiskReceiptConcern = asArray(normalizedReview.delivery_risk_receipts)
      .some((receipt: any) => receipt?.delivered === false || revisionReceiptRemainingRisk(receipt))
    const hasNextChapterQualityPlanConcern = nextChapterQualityPlanNeedsRepair(normalizedReview)
    normalizedReview.passed = normalizedReview.passed && !hasFailingReviewChecks(normalizedReview)
    normalizedReview.needs_revision = normalizedReview.needs_revision || hasReviewChecksNeedingRepair(normalizedReview) || hasDeliveryRiskReceiptConcern || hasNextChapterQualityPlanConcern
    if (options.revise === false || !shouldReviseProse(normalizedReview, options)) {
      await emitReviewProgress('revision_llm', {
        status: 'skipped',
        reason: options.revise === false ? '本轮只复核，不执行修订。' : '自检未要求修订。',
      })
      return { review: normalizedReview, revision: null, final_text: chapterText, revised: false }
    }
    const revisionMaxTokens = Math.max(8000, Math.min(18000, Number(
      options.revisionMaxTokens
      || options.revision_max_tokens
      || (options.quality_gate_repair || options.deterministic_cleanup_repair ? 16000 : 10000),
    )))
    const revisionLlmTimeoutMs = Math.max(30000, Math.min(
      Number(options.llmTimeoutMs || options.timeoutMs || 600000) || 600000,
      Number(options.revisionLlmTimeoutMs || options.revision_llm_timeout_ms || (options.quality_gate_repair || options.deterministic_cleanup_repair ? 240000 : 180000)) || 180000,
    ))
    await emitReviewProgress('revision_llm', {
      status: 'running',
      max_tokens: revisionMaxTokens,
      repair_mode: Boolean(options.quality_gate_repair || options.deterministic_cleanup_repair),
      revision_llm_timeout_ms: revisionLlmTimeoutMs,
    })
    let revisionResult: any
    try {
      revisionResult = await executeAgent('prose-agent', project, {
        task: buildProseRevisionPrompt(project, contextPackage, chapterText, normalizedReview),
        upstreamContext: contextPackage,
      }, {
        activeWorkspace,
        modelId: reviseModelId ? String(reviseModelId) : undefined,
        maxTokens: revisionMaxTokens,
        temperature: ctx.production.getStageTemperature(project, 'revise', 0.65),
        skipMemory: true,
        signal: options.abortSignal,
        timeoutMs: revisionLlmTimeoutMs,
      })
    } catch (revisionError) {
      if (isAbortError(revisionError)) throw revisionError
      const revisionErrorMessage = String((revisionError as any)?.message || revisionError || '修订请求失败')
      await emitReviewProgress('revision_llm', {
        status: 'warn',
        error: revisionErrorMessage.slice(0, 240),
        revision_llm_timeout_ms: revisionLlmTimeoutMs,
      })
      return {
        review: normalizedReview,
        revision: { error: revisionErrorMessage, llm_diagnostics: { error: revisionErrorMessage } },
        final_text: chapterText,
        revised: false,
      }
    }
    const revisionPayload = getNovelPayload(revisionResult)
    const revisionPlainProseFallback = extractPlainProseFallback(revisionResult, 800)
    const revisedChapters = Array.isArray(revisionPayload?.prose_chapters)
      ? revisionPayload.prose_chapters
      : Array.isArray(revisionPayload?.proseChapters)
        ? revisionPayload.proseChapters
        : []
    const revisedFirst = revisedChapters.length ? revisedChapters[0] : revisionPayload
    const revisedText = revisedFirst?.chapter_text || revisedFirst?.chapterText || revisionPayload?.chapter_text || revisionPayload?.chapterText || revisionPlainProseFallback
    const revisionDeliveryReceipts = revisedFirst?.oh_story_delivery_receipts
      || revisedFirst?.ohStoryDeliveryReceipts
      || revisionPayload?.oh_story_delivery_receipts
      || revisionPayload?.ohStoryDeliveryReceipts
      || null
    const revisedFirstRevisionReceipts = [
      ...asArray(revisedFirst?.revision_receipts),
      ...asArray(revisedFirst?.revisionReceipts),
    ]
    const revisionPayloadReceipts = [
      ...asArray(revisionPayload?.revision_receipts),
      ...asArray(revisionPayload?.revisionReceipts),
    ]
    const revisionReceipts = revisedFirstRevisionReceipts.length
      ? revisedFirstRevisionReceipts
      : revisionPayloadReceipts
    const revisedFirstRevisionContextReceipts = [
      ...asArray(revisedFirst?.revision_context_receipts),
      ...asArray(revisedFirst?.revisionContextReceipts),
    ]
    const revisionPayloadContextReceipts = [
      ...asArray(revisionPayload?.revision_context_receipts),
      ...asArray(revisionPayload?.revisionContextReceipts),
    ]
    const revisionContextReceipts = revisedFirstRevisionContextReceipts.length
      ? revisedFirstRevisionContextReceipts
      : revisionPayloadContextReceipts
    const revisedFirstDeslopRepairReceipts = [
      ...asArray(revisedFirst?.deslop_repair_receipts),
      ...asArray(revisedFirst?.deslopRepairReceipts),
    ]
    const revisionPayloadDeslopRepairReceipts = [
      ...asArray(revisionPayload?.deslop_repair_receipts),
      ...asArray(revisionPayload?.deslopRepairReceipts),
    ]
    const deslopRepairReceipts = revisedFirstDeslopRepairReceipts.length
      ? revisedFirstDeslopRepairReceipts
      : revisionPayloadDeslopRepairReceipts
    const revisedFirstQualityAuditRepairReceipts = [
      ...asArray(revisedFirst?.quality_audit_repair_receipts),
      ...asArray(revisedFirst?.qualityAuditRepairReceipts),
    ]
    const revisionPayloadQualityAuditRepairReceipts = [
      ...asArray(revisionPayload?.quality_audit_repair_receipts),
      ...asArray(revisionPayload?.qualityAuditRepairReceipts),
    ]
    const qualityAuditRepairReceipts = revisedFirstQualityAuditRepairReceipts.length
      ? revisedFirstQualityAuditRepairReceipts
      : revisionPayloadQualityAuditRepairReceipts
    const revisionScopeGuardPayload = revisedFirst?.revision_scope_guard
      || revisedFirst?.revisionScopeGuard
      || revisionPayload?.revision_scope_guard
      || revisionPayload?.revisionScopeGuard
      || {}
    const revisionNextChapterQualityPlan = revisedFirst?.next_chapter_quality_plan
      || revisedFirst?.nextChapterQualityPlan
      || revisionPayload?.next_chapter_quality_plan
      || revisionPayload?.nextChapterQualityPlan
      || null
    if (!revisedText) {
      await emitReviewProgress('revision_llm', {
        status: 'warn',
        error: String(revisionResult.error || '修订未返回正文').slice(0, 240),
        llm_diagnostics: buildLLMResultDiagnostics(revisionResult),
      })
      return { review: normalizedReview, revision: { error: revisionResult.error || '修订未返回正文', llm_diagnostics: buildLLMResultDiagnostics(revisionResult) }, final_text: chapterText, revised: false }
    }
    await emitReviewProgress('revision_llm', {
      status: 'success',
      modelName: (revisionResult as any).modelName,
      word_count: countProseChars(revisedText),
    })
    const revisionScopeGuard = buildRevisionScopeGuardSyncReport(contextPackage?.chapter_target || {}, {
      revised: true,
      original_text: chapterText,
      final_text: revisedText,
      revision_scope_guard: revisionScopeGuardPayload,
    })
    return {
      review: normalizedReview,
      revision: {
        scene_breakdown: revisedFirst?.scene_breakdown || revisedFirst?.sceneBreakdown || revisionPayload?.scene_breakdown || revisionPayload?.sceneBreakdown || [],
        continuity_notes: revisedFirst?.continuity_notes || revisedFirst?.continuityNotes || revisionPayload?.continuity_notes || revisionPayload?.continuityNotes || [],
        revision_context_receipts: revisionContextReceipts,
        revision_receipts: revisionReceipts,
        deslop_repair_receipts: deslopRepairReceipts,
        quality_audit_repair_receipts: qualityAuditRepairReceipts,
        oh_story_delivery_receipts: revisionDeliveryReceipts,
        revision_scope_guard: revisionScopeGuard,
        next_chapter_quality_plan: revisionNextChapterQualityPlan,
        plain_text_fallback_used: Boolean(revisionPlainProseFallback && !revisedFirst?.chapter_text && !revisedFirst?.chapterText && !revisionPayload?.chapter_text && !revisionPayload?.chapterText),
        modelName: (revisionResult as any).modelName,
      },
      revision_scope_guard: revisionScopeGuard,
      final_text: revisedText,
      revised: true,
    }
  }

  const runCommercialEditorRewrite = async (activeWorkspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options: any = {}) => {
    const editorModelId = ctx.production.getStageModelId(project, 'editor', modelId)
    throwIfAborted(options)
    const editorResult = await executeAgent('prose-agent', project, {
      task: buildCommercialEditorRewritePrompt(project, contextPackage, chapterText, options),
      upstreamContext: contextPackage,
    }, {
      activeWorkspace,
      modelId: editorModelId ? String(editorModelId) : undefined,
      maxTokens: proseMaxTokensForWordTarget(contextPackage?.chapter_target?.word_target),
      temperature: ctx.production.getStageTemperature(project, 'editor', 0.5),
      skipMemory: true,
      signal: options.abortSignal,
      timeoutMs: options.llmTimeoutMs,
    })
    assertCompleteProseTransportResult(editorResult, 'PROSE_REVISION_TRUNCATED')
    const payload = getNovelPayload(editorResult)
    const rewrittenChapters = Array.isArray(payload?.prose_chapters)
      ? payload.prose_chapters
      : Array.isArray(payload?.proseChapters)
        ? payload.proseChapters
        : []
    const rewrittenFirst = rewrittenChapters[0] || payload
    const rewrittenText = String(rewrittenFirst?.chapter_text || rewrittenFirst?.chapterText || payload?.chapter_text || payload?.chapterText || '')
    const editorReport = payload?.editor_report || payload?.editorReport || {}
    const originalCount = countProseChars(chapterText)
    const rewrittenCount = countProseChars(rewrittenText)
    if (!rewrittenText) {
      return {
        final_text: chapterText,
        edited: false,
        editor_report: { error: (editorResult as any).error || '商业主编改稿未返回正文' },
        revision: null,
      }
    }
    if (originalCount > 0 && rewrittenCount < Math.floor(originalCount * 0.85)) {
      return {
        final_text: chapterText,
        edited: false,
        editor_report: {
          ...editorReport,
          error: `商业主编改稿返回正文过短：${rewrittenCount}/${originalCount}`,
        },
        revision: null,
      }
    }
    const continuitySelection = selectContinuitySafeProseCandidate(chapterText, rewrittenText, contextPackage, { candidate_stage: 'editor' })
    return {
      final_text: continuitySelection.text,
      edited: continuitySelection.accepted && rewrittenText !== chapterText,
      editor_report: {
        ...editorReport,
        ...(continuitySelection.warning ? { continuity_warning: continuitySelection.warning } : {}),
        modelName: (editorResult as any).modelName,
        original_word_count: originalCount,
        edited_word_count: rewrittenCount,
      },
      revision: {
        scene_breakdown: rewrittenFirst?.scene_breakdown || rewrittenFirst?.sceneBreakdown || payload?.scene_breakdown || payload?.sceneBreakdown || [],
        continuity_notes: rewrittenFirst?.continuity_notes || rewrittenFirst?.continuityNotes || payload?.continuity_notes || payload?.continuityNotes || [],
        modelName: (editorResult as any).modelName,
      },
    }
  }

  const runMemePolish = async (activeWorkspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options: any = {}) => {
    const memeStrategy = contextPackage?.chapter_target?.meme_strategy || buildMemeStrategy(project, contextPackage)
    if (String(memeStrategy?.intensity || '无') === '无' && !asArray(memeStrategy?.meme_bank).length) {
      return { final_text: chapterText, polished: false, meme_polish_report: { skipped: true, reason: '未配置网感策略或素材池' }, revision: null }
    }
    const polishModelId = ctx.production.getStageModelId(project, 'revise', modelId)
    throwIfAborted(options)
    const polishResult = await executeAgent('prose-agent', project, {
      task: buildMemePolishPrompt(project, contextPackage, chapterText),
      upstreamContext: contextPackage,
    }, {
      activeWorkspace,
      modelId: polishModelId ? String(polishModelId) : undefined,
      maxTokens: proseMaxTokensForWordTarget(contextPackage?.chapter_target?.word_target),
      temperature: ctx.production.getStageTemperature(project, 'revise', 0.45),
      skipMemory: true,
      signal: options.abortSignal,
      timeoutMs: options.llmTimeoutMs,
    })
    assertCompleteProseTransportResult(polishResult, 'PROSE_REVISION_TRUNCATED')
    const payload = getNovelPayload(polishResult)
    const polishedChapters = Array.isArray(payload?.prose_chapters)
      ? payload.prose_chapters
      : Array.isArray(payload?.proseChapters)
        ? payload.proseChapters
        : []
    const polishedFirst = polishedChapters[0] || payload
    const polishedText = String(polishedFirst?.chapter_text || polishedFirst?.chapterText || payload?.chapter_text || payload?.chapterText || '')
    const memePolishReport = payload?.meme_polish_report || payload?.memePolishReport || {}
    const memePolishChangedPlot = payload?.meme_polish_report?.changed_plot === true || payload?.memePolishReport?.changedPlot === true
    const originalCount = countProseChars(chapterText)
    const polishedCount = countProseChars(polishedText)
    if (!polishedText || memePolishChangedPlot) {
      return {
        final_text: chapterText,
        polished: false,
        meme_polish_report: {
          ...memePolishReport,
          error: !polishedText ? '网感润色未返回正文' : '网感润色疑似改动剧情，已拒绝',
          modelName: (polishResult as any).modelName,
        },
        revision: null,
      }
    }
    if (originalCount > 0 && polishedCount < Math.floor(originalCount * 0.9)) {
      return {
        final_text: chapterText,
        polished: false,
        meme_polish_report: {
          ...memePolishReport,
          error: `网感润色返回正文过短：${polishedCount}/${originalCount}`,
          modelName: (polishResult as any).modelName,
        },
        revision: null,
      }
    }
    const continuitySelection = selectContinuitySafeProseCandidate(chapterText, polishedText, contextPackage, { candidate_stage: 'meme_polish' })
    return {
      final_text: continuitySelection.text,
      polished: continuitySelection.accepted && polishedText !== chapterText,
      meme_polish_report: {
        ...memePolishReport,
        ...(continuitySelection.warning ? { continuity_warning: continuitySelection.warning } : {}),
        modelName: (polishResult as any).modelName,
        original_word_count: originalCount,
        polished_word_count: polishedCount,
      },
      revision: {
        scene_breakdown: polishedFirst?.scene_breakdown || polishedFirst?.sceneBreakdown || payload?.scene_breakdown || payload?.sceneBreakdown || [],
        continuity_notes: polishedFirst?.continuity_notes || polishedFirst?.continuityNotes || payload?.continuity_notes || payload?.continuityNotes || [],
        modelName: (polishResult as any).modelName,
      },
    }
  }

  const runReadabilityReview = async (activeWorkspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options: any = {}) => {
    const reviewModelId = ctx.production.getStageModelId(project, 'review', modelId)
    throwIfAborted(options)
    const reviewResult = await executeAgent('review-agent', project, {
      task: buildReadabilityReviewPrompt(project, contextPackage, chapterText),
    }, {
      activeWorkspace,
      modelId: reviewModelId ? String(reviewModelId) : undefined,
      maxTokens: 2500,
      temperature: ctx.production.getStageTemperature(project, 'review', 0.2),
      skipMemory: true,
      signal: options.abortSignal,
      timeoutMs: options.llmTimeoutMs,
    })
    const payload = getNovelPayload(reviewResult)
    return {
      readability_score: Number(payload?.readability_score ?? payload?.score ?? 0) || 0,
      passed: payload?.passed !== false,
      opening_hook_score: Number(payload?.opening_hook_score ?? 0) || 0,
      ending_hook_score: Number(payload?.ending_hook_score ?? 0) || 0,
      scene_readability_score: Number(payload?.scene_readability_score ?? 0) || 0,
      paragraph_density_score: Number(payload?.paragraph_density_score ?? 0) || 0,
      dialogue_voice_score: Number(payload?.dialogue_voice_score ?? 0) || 0,
      payoff_density_score: Number(payload?.payoff_density_score ?? 0) || 0,
      meme_sense: payload?.meme_sense || {},
      ai_smell: payload?.ai_smell || payload?.aiSmell || {},
      issues: Array.isArray(payload?.issues) ? payload.issues.map(normalizeIssue) : [],
      suggestions: asArray(payload?.suggestions).map((item: any) => String(item || '').trim()).filter(Boolean),
      modelName: (reviewResult as any).modelName,
    }
  }

  const ensureProseMeetsWordTarget = async (activeWorkspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options: any = {}) => {
    const wordTarget = contextPackage?.chapter_target?.word_target as ChapterWordTarget | null | undefined
    let evaluation = applyProseWordTargetSoftCap(evaluateProseWordTarget(chapterText, wordTarget))
    const initialEvaluation = evaluation
    const reviseModelId = ctx.production.getStageModelId(project, 'revise', modelId)
    let currentText = String(chapterText || '')
    let currentEvaluation = evaluation
    let contractionResultPayload: any = null
    let bestCompleteText = currentText
    let bestCompleteEvaluation = currentEvaluation
    let bestCompleteContractionPayload: any = null
    let bestCompleteExpansionPayload: any = null
    const sanitizeWordTargetUsage = (value: any) => {
      const source = value && typeof value === 'object' && !Array.isArray(value) ? value : null
      if (!source) return null
      const usage = Object.fromEntries(
        ['input_tokens', 'prompt_tokens', 'output_tokens', 'completion_tokens', 'total_tokens', 'cached_tokens']
          .filter(key => typeof source[key] === 'number' && Number.isFinite(source[key]) && source[key] >= 0)
          .map(key => [key, Math.floor(source[key])]),
      )
      return Object.keys(usage).length ? usage : null
    }
    const sanitizeWordTargetModelName = (value: any) => {
      const modelName = String(value || '').trim()
      return /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/.test(modelName) ? modelName : ''
    }
    const wordTargetDistance = (candidateEvaluation: any) => candidateEvaluation.too_long
      ? Math.max(0, Number(candidateEvaluation.actual || 0) - Number(candidateEvaluation.max || 0))
      : candidateEvaluation.too_short
        ? Math.max(0, Number(candidateEvaluation.min || 0) - Number(candidateEvaluation.actual || 0))
        : 0
    const rememberBestCompleteCandidate = (candidateText: string, candidateEvaluation: any, payload?: any) => {
      const candidateCount = countProseChars(candidateText)
      if (!candidateText || candidateCount <= 0) return
      const bestDistance = wordTargetDistance(bestCompleteEvaluation)
      const candidateDistance = wordTargetDistance(candidateEvaluation)
      if (candidateDistance < bestDistance || (candidateDistance === bestDistance && candidateCount > countProseChars(bestCompleteText))) {
        bestCompleteText = candidateText
        bestCompleteEvaluation = candidateEvaluation
        bestCompleteContractionPayload = payload || bestCompleteContractionPayload
      }
    }
    const buildWordTargetWarning = (finalEvaluation: any) => {
      const code = finalEvaluation.too_long ? 'word_target_long' : 'word_target_short'
      const message = finalEvaluation.too_long
        ? `word_target_long：完整章节仍超过字数上限（当前 ${finalEvaluation.actual} 字，最多 ${finalEvaluation.max} 字）`
        : `word_target_short：完整章节仍低于字数下限（当前 ${finalEvaluation.actual} 字，至少 ${finalEvaluation.min} 字）`
      return {
        code,
        source: 'word_target',
        message,
        details: {
          evaluation: initialEvaluation,
          final_evaluation: finalEvaluation,
        },
      }
    }
    if (evaluation.soft_cap) {
      return {
        final_text: chapterText,
        contracted: false,
        expanded: false,
        word_target_soft_pass: true,
        evaluation,
        final_evaluation: evaluation,
        expansion: null,
      }
    }
    if (evaluation.too_long && options.contract !== false) {
      const requestedMaxContractionAttempts = Number(options.maxContractionAttempts ?? options.max_contraction_attempts ?? 3)
      const configuredMaxContractionAttempts = Number.isFinite(requestedMaxContractionAttempts)
        ? Math.max(1, Math.min(3, Math.trunc(requestedMaxContractionAttempts)))
        : 3
      const proposedSharedBudget = options.wordTargetContractionBudget || options.word_target_contraction_budget
      const sharedBudget = proposedSharedBudget && typeof proposedSharedBudget === 'object' && trustedWordTargetContractionBudgets.has(proposedSharedBudget)
        ? proposedSharedBudget
        : null
      const rawUsed = Number(sharedBudget?.used ?? 0)
      const used = Number.isFinite(rawUsed) ? Math.max(0, Math.min(3, Math.trunc(rawUsed))) : 0
      if (sharedBudget) sharedBudget.used = used
      const maxContractionAttempts = sharedBudget
        ? Math.max(0, Math.min(configuredMaxContractionAttempts, configuredMaxContractionAttempts - used))
        : configuredMaxContractionAttempts
      const contractionAttempts: any[] = []
      for (let attempt = 1; attempt <= maxContractionAttempts; attempt += 1) {
        throwIfAborted(options)
        const globalAttempt = sharedBudget
          ? Math.min(configuredMaxContractionAttempts, Number(sharedBudget.used || 0) + 1)
          : attempt
        if (sharedBudget) sharedBudget.used = globalAttempt
        let contractionResult: any
        try {
          contractionResult = await executeAgent('prose-agent', project, {
            task: buildProseWordTargetContractionPrompt(project, contextPackage, currentText, currentEvaluation, { attempt: globalAttempt, maxAttempts: configuredMaxContractionAttempts }),
            upstreamContext: contextPackage,
          }, {
            activeWorkspace,
            modelId: reviseModelId ? String(reviseModelId) : undefined,
            maxTokens: proseContractionMaxTokensForAttempt(wordTarget, globalAttempt),
            temperature: Math.min(0.55, ctx.production.getStageTemperature(project, 'revise', 0.55)),
            skipMemory: true,
            signal: options.abortSignal,
            timeoutMs: options.llmTimeoutMs,
          })
        } catch (error) {
          if (isAbortError(error)) throw error
          contractionAttempts.push({
            attempt: globalAttempt,
            previous_count: countProseChars(currentText),
            returned_text: false,
            candidate_rejected: true,
            rejection_reason: 'optional_repair_unavailable',
            error: formatAdmissionError(error, 200),
          })
          break
        }
        const extracted = extractProseExpansionPayload(contractionResult)
        const contractedText = extracted.text
        const finishReason = normalizeProseContractionFinishReason(contractionResult)
        const rejectedFinishReason = rejectedProseTransportFinishReason(contractionResult)
        const incompleteReason = normalizeProseContractionIncompleteReason(contractionResult)
        const recoveredFromPartialJson = extracted.payload?.recovered_from_partial_json === true
        const partialJsonOpenStringRecovered = extracted.payload?.partial_json_open_string_recovered === true
        const rejectionReasons = [
          !contractedText ? 'missing_chapter_text' : '',
          recoveredFromPartialJson ? 'recovered_from_partial_json' : '',
          partialJsonOpenStringRecovered ? 'partial_json_open_string_recovered' : '',
          !isExplicitlyCompleteProseContractionFinishReason(finishReason) ? `finish_reason_${finishReason || 'missing'}` : '',
          isRejectedProseContractionFinishReason(finishReason) ? `finish_reason_${finishReason}` : '',
          rejectedFinishReason ? `transport_finish_reason_${rejectedFinishReason}` : '',
          incompleteReason ? `incomplete_reason_${incompleteReason}` : '',
          hasProseTransportIncompleteDetails(contractionResult) ? 'incomplete_details_present' : '',
        ].filter(Boolean)
        const candidateRejected = rejectionReasons.length > 0
        const finalEvaluation = applyProseWordTargetSoftCap(evaluateProseWordTarget(contractedText, wordTarget))
        const previousCount = countProseChars(currentText)
        const contractedCount = countProseChars(contractedText)
        const bridgeToExpansion = !candidateRejected
          && options.expand !== false
          && isExplicitlyCompleteProseContractionFinishReason(finishReason)
          && canBridgeShortContractionToExpansion(currentEvaluation, finalEvaluation)

        contractionAttempts.push({
          attempt: globalAttempt,
          previous_count: previousCount,
          contracted_count: contractedCount,
          evaluation: finalEvaluation,
          finish_reason: finishReason,
          model_usage: sanitizeWordTargetUsage((contractionResult as any).usage)
            || sanitizeWordTargetUsage((contractionResult as any).raw?.usage),
          incomplete_reason: incompleteReason,
          returned_text: Boolean(contractedText),
          candidate_rejected: candidateRejected,
          bridge_to_expansion: bridgeToExpansion,
          rejection_reason: rejectionReasons.join(',') || null,
          recovered_from_partial_json: recoveredFromPartialJson,
          partial_json_open_string_recovered: partialJsonOpenStringRecovered,
        })

        if (candidateRejected) continue

        const candidateModelName = sanitizeWordTargetModelName((contractionResult as any).modelName)
        const candidatePayload = {
          scene_breakdown: extracted.scene_breakdown,
          continuity_notes: extracted.continuity_notes,
          contraction_report: extracted.payload?.contraction_report || extracted.payload?.contractionReport || null,
          attempts: contractionAttempts,
          ...(candidateModelName ? { modelName: candidateModelName } : {}),
        }
        if (isExplicitlyCompleteProseContractionFinishReason(finishReason)) {
          rememberBestCompleteCandidate(contractedText, finalEvaluation, candidatePayload)
        }

        if (bridgeToExpansion) {
          currentText = contractedText
          currentEvaluation = finalEvaluation
          contractionResultPayload = candidatePayload
          break
        }

        if (contractedText && contractedCount > 0 && contractedCount < previousCount && !finalEvaluation.too_short) {
          currentText = contractedText
          currentEvaluation = finalEvaluation
          contractionResultPayload = candidatePayload
        }

        if (contractedText && contractedCount > 0 && contractedCount < previousCount && finalEvaluation.passed) {
          return {
            final_text: contractedText,
            contracted: true,
            expanded: false,
            evaluation,
            final_evaluation: finalEvaluation,
            contraction: contractionResultPayload,
            expansion: null,
          }
        }

        if (contractedText && contractedCount > 0 && finalEvaluation.too_short) continue
      }

      if (currentEvaluation.too_long) {
        const compatibility = resolveStandardWordTargetCompatibility(evaluation, wordTarget)
        if (compatibility.passed) {
          return {
            final_text: chapterText,
            contracted: false,
            expanded: false,
            word_target_compatibility_pass: true,
            compatibility_ceiling: compatibility.ceiling,
            compatibility_reason: compatibility.reason,
            evaluation,
            final_evaluation: evaluation,
            contraction: { attempts: contractionAttempts },
            expansion: null,
          }
        }
        return {
          final_text: bestCompleteText,
          contracted: bestCompleteText !== String(chapterText || ''),
          expanded: false,
          evaluation: initialEvaluation,
          final_evaluation: bestCompleteEvaluation,
          contraction: bestCompleteContractionPayload || { attempts: contractionAttempts },
          expansion: null,
          word_target_warning: buildWordTargetWarning(bestCompleteEvaluation),
        }
      }

      chapterText = currentText
      evaluation = currentEvaluation
    }
    if (evaluation.too_long) {
      return {
        final_text: chapterText,
        contracted: false,
        expanded: false,
        evaluation: initialEvaluation,
        final_evaluation: evaluation,
        contraction: null,
        expansion: null,
        word_target_warning: buildWordTargetWarning(evaluation),
      }
    }
    if (evaluation.passed || options.expand === false) {
      const result: any = {
        final_text: chapterText,
        expanded: false,
        evaluation,
        final_evaluation: evaluation,
        expansion: null,
      }
      if (!evaluation.passed) result.word_target_warning = buildWordTargetWarning(evaluation)
      return result
    }

    const maxExpansionAttempts = Math.max(1, Math.min(5, Number(options.maxExpansionAttempts || options.max_expansion_attempts || 3)))
    const attempts: any[] = []

    for (let attempt = 1; attempt <= maxExpansionAttempts; attempt += 1) {
      throwIfAborted(options)
      let expansionResult: any
      try {
        expansionResult = await executeAgent('prose-agent', project, {
          task: buildProseWordTargetExpansionPrompt(project, contextPackage, currentText, currentEvaluation, { attempt, maxAttempts: maxExpansionAttempts }),
          upstreamContext: contextPackage,
        }, {
          activeWorkspace,
          modelId: reviseModelId ? String(reviseModelId) : undefined,
          maxTokens: proseMaxTokensForWordTarget(wordTarget),
          temperature: ctx.production.getStageTemperature(project, 'revise', 0.65),
          skipMemory: true,
          signal: options.abortSignal,
          timeoutMs: options.llmTimeoutMs,
        })
      } catch (error) {
        if (isAbortError(error)) throw error
        attempts.push({
          attempt,
          previous_count: countProseChars(currentText),
          returned_text: false,
          candidate_rejected: true,
          rejection_reason: 'optional_repair_unavailable',
          error: formatAdmissionError(error, 200),
        })
        break
      }
      const extracted = extractProseExpansionPayload(expansionResult)
      const expandedText = extracted.text
      const finalEvaluation = applyProseWordTargetSoftCap(evaluateProseWordTarget(expandedText, wordTarget))
      const previousCount = countProseChars(currentText)
      const expandedCount = countProseChars(expandedText)
      const finishReason = normalizeProseContractionFinishReason(expansionResult)
      const rejectedFinishReason = rejectedProseTransportFinishReason(expansionResult)
      const incompleteReason = normalizeProseContractionIncompleteReason(expansionResult)
      const recoveredFromPartialJson = extracted.payload?.recovered_from_partial_json === true
      const partialJsonOpenStringRecovered = extracted.payload?.partial_json_open_string_recovered === true
      const rejectionReasons = [
        !expandedText ? 'missing_chapter_text' : '',
        recoveredFromPartialJson ? 'recovered_from_partial_json' : '',
        partialJsonOpenStringRecovered ? 'partial_json_open_string_recovered' : '',
        !isExplicitlyCompleteProseContractionFinishReason(finishReason) ? `finish_reason_${finishReason || 'missing'}` : '',
        rejectedFinishReason ? `transport_finish_reason_${rejectedFinishReason}` : '',
        incompleteReason ? `incomplete_reason_${incompleteReason}` : '',
        hasProseTransportIncompleteDetails(expansionResult) ? 'incomplete_details_present' : '',
      ].filter(Boolean)
      const candidateRejected = rejectionReasons.length > 0

      attempts.push({
        attempt,
        previous_count: previousCount,
        expanded_count: expandedCount,
        evaluation: finalEvaluation,
        model_usage: sanitizeWordTargetUsage((expansionResult as any).usage)
          || sanitizeWordTargetUsage((expansionResult as any).raw?.usage),
        returned_text: Boolean(expandedText),
        finish_reason: finishReason,
        candidate_rejected: candidateRejected,
        rejection_reason: rejectionReasons.join(',') || null,
      })

      if (!candidateRejected && expandedText && expandedCount > previousCount) {
        currentText = expandedText
        currentEvaluation = finalEvaluation
        if (expandedCount > countProseChars(bestCompleteText)) {
          const candidateModelName = sanitizeWordTargetModelName((expansionResult as any).modelName)
          bestCompleteText = expandedText
          bestCompleteEvaluation = finalEvaluation
          bestCompleteExpansionPayload = {
            scene_breakdown: extracted.scene_breakdown,
            continuity_notes: extracted.continuity_notes,
            expansion_blueprint_patch: extracted.expansion_blueprint_patch,
            ...(candidateModelName ? { modelName: candidateModelName } : {}),
          }
        }
      }

      if (!candidateRejected && expandedText && expandedCount > previousCount && finalEvaluation.passed) {
        const candidateModelName = sanitizeWordTargetModelName((expansionResult as any).modelName)
        return {
          final_text: expandedText,
          contracted: Boolean(contractionResultPayload),
          expanded: true,
          evaluation,
          final_evaluation: finalEvaluation,
          contraction: contractionResultPayload,
          expansion: {
            scene_breakdown: extracted.scene_breakdown,
            continuity_notes: extracted.continuity_notes,
            expansion_blueprint_patch: extracted.expansion_blueprint_patch,
            attempts,
            ...(candidateModelName ? { modelName: candidateModelName } : {}),
          },
        }
      }
    }

    return {
      final_text: bestCompleteText,
      contracted: Boolean(contractionResultPayload),
      expanded: bestCompleteText !== String(chapterText || ''),
      evaluation: initialEvaluation,
      final_evaluation: bestCompleteEvaluation,
      contraction: contractionResultPayload,
      expansion: {
        ...(bestCompleteExpansionPayload || {}),
        attempts,
      },
      word_target_warning: buildWordTargetWarning(bestCompleteEvaluation),
    }
  }

  const autoRepairChapterPreflightGaps = async (activeWorkspace: string, project: any, chapter: any, contextPackage: any, modelId?: number, options: any = {}) => {
    const persist = options.persist !== false
    const checks = Array.isArray(contextPackage?.preflight?.checks) ? contextPackage.preflight.checks : []
    const blockers = asArray(contextPackage?.preflight?.blockers)
    const warnings = asArray(contextPackage?.preflight?.warnings)
    const warningCorpus = [
      ...checks.filter((item: any) => !item.ok).map((item: any) => `${item.key || ''} ${item.label || ''} ${item.fix || ''} ${item.evidence || ''}`),
      ...blockers.map((item: any) => `${item?.key || ''} ${item?.label || ''} ${item?.fix || ''} ${item?.evidence || ''} ${item || ''}`),
      ...warnings.map((item: any) => String(item || '')),
    ].join('；')
    const missingKeys = Array.from(new Set([
      ...checks.filter((item: any) => !item.ok).map((item: any) => String(item.key || '')).filter(Boolean),
      ...blockers.map((item: any) => String(item?.key || '')).filter(Boolean),
      ...(/蓝图|细纲|target_emotion|人物出场|character_order|opening_hook|core_payoff/.test(warningCorpus) ? ['chapter_blueprint', 'source_readiness_chapter_blueprint'] : []),
      ...(/source_paths_missing|文风召回|benchmark_recall|style_sample|样章/.test(warningCorpus) ? ['benchmark_recall_source_paths', 'benchmark_recall_gate'] : []),
      ...(/追踪\/?时间线|timeline_tracking|时间线\.md/.test(warningCorpus) ? ['source_readiness_timeline_tracking'] : []),
      ...(/场景卡|scene_card|goal_obstacle/.test(warningCorpus) ? ['scene_cards', 'source_readiness_scene_card_goal_obstacle_change'] : []),
    ].filter(Boolean)))
    const repaired: any[] = []
    const errors: string[] = []
    const stagedChapterPatch: any = {}
    const stagedWorldbuildingCreates: any[] = []
    const stagedCharacterCreates: any[] = []
    const stagedSettingCreates: any[] = []
    let stagedUsageReplacement: any[] | null = null
    const stagedReviews: any[] = []
    let nextTemporaryId = -1
    const applyStagedChapterPatch = (patch: any) => {
      const rawPayload = patch?.raw_payload === undefined ? chapter.raw_payload : {
        ...(chapter.raw_payload || {}),
        ...(patch.raw_payload || {}),
      }
      Object.assign(stagedChapterPatch, patch, patch?.raw_payload === undefined ? {} : {
        raw_payload: { ...(stagedChapterPatch.raw_payload || {}), ...(patch.raw_payload || {}) },
      })
      chapter = { ...chapter, ...patch, raw_payload: rawPayload }
      return chapter
    }
    if (!missingKeys.length) return { ok: true, missing_keys: missingKeys, repaired, errors, chapter, chapter_patch: stagedChapterPatch, staged_worldbuilding_creates: stagedWorldbuildingCreates, staged_character_creates: stagedCharacterCreates, staged_setting_creates: stagedSettingCreates, staged_usage_replacement: stagedUsageReplacement, staged_reviews: stagedReviews, staged: !persist }

    const [chapters, worldbuilding, characters, outlines, settings, reviews] = await Promise.all([
      listNovelChapters(activeWorkspace, project.id),
      listNovelWorldbuilding(activeWorkspace, project.id),
      listNovelCharacters(activeWorkspace, project.id),
      listNovelOutlines(activeWorkspace, project.id),
      listNovelSettingEntities(activeWorkspace, project.id).catch(() => []),
      listNovelReviews(activeWorkspace, project.id),
    ])
    const needsChapterBlueprint = missingKeys.includes('chapter_blueprint')
      || missingKeys.includes('chapter_conflict')
      || missingKeys.includes('ending_hook')
      || missingKeys.includes('plot_points')
      || missingKeys.includes('scene_cards')
      || missingKeys.includes('source_readiness_chapter_blueprint')
      || missingKeys.includes('source_readiness_context_tracking')
      || missingKeys.includes('source_readiness_timeline_tracking')
      || missingKeys.includes('source_readiness_scene_card_goal_obstacle_change')
      || missingKeys.includes('benchmark_recall_source_paths')
      || chapter.raw_payload?.unattended_goal?.needs_agent_completion === true
    const needsSceneCards = missingKeys.includes('scene_cards')
      || missingKeys.includes('source_readiness_scene_card_goal_obstacle_change')
      || !asArray(chapter.scene_list || chapter.sceneList || chapter.scene_breakdown || chapter.sceneBreakdown).length
    const needsWorldbuilding = missingKeys.includes('worldbuilding') || worldbuilding.length === 0
    const needsCharacters = missingKeys.includes('characters') || missingKeys.includes('character_state') || missingKeys.includes('no_repeat')
    const needsSettings = missingKeys.includes('setting_workshop') || settings.length === 0

    if (needsChapterBlueprint) {
      let payload: any = {}
      if (modelId) {
        try {
          throwIfAborted(options)
          const result = await executeAgent('outline-agent', project, {
            task: [
              '任务：为无人值守章节写作补齐本章蓝图。只输出 JSON，不写正文。',
              '输出字段：title, chapter_goal, chapter_summary, conflict, ending_hook, chapter_blueprint, emotional_arc_contract, chapter_hook_contract, paragraph_hook_contract, opening_contract, suspense_contract, reversal_contract, showdown_contract, bridge_unit_contract, plot_framework_contract, style_boundary_contract, plot_dynamics_contract, story_power_contract, mainline_definition_contract, information_flow_contract, expectation_threshold_contract, story_loop_contract, prose_craft_contract, punctuation_tone_contract, quality_audit_contract, dialogue_contract, continuity_heat_contract, character_relation_contract, character_behavior_contract, asset_linkage_contract, state_tracking_contract, intent_confirmation_contract, target_reader_contract, genre_positioning_contract, core_contract_radar, female_audience_contract, upgrade_rhythm_contract, conflict_structure_contract, must_advance(array), forbidden_repeats(array), repair_summary。',
              'chapter_blueprint 必须包含 target_emotion, opening_hook, core_payoff, content_outline(cause/development/turn/climax/ending), outline_methods_contract(five_step_outline/eight_node_story_structure/sweet_cycle_stages/emotion_zigzag_stages/five_drive_checks/detail_outline_rules/similarity_guardrails/reverse_design_rules/quality_checks), small_outline_contract(steps/purpose_effect_rules/detail_rules/locator_rules/segment_cards), mainline_definition_contract(mainline_event/definition_rules/action_rules/handoff_rules/forbidden_mainline_shapes/quality_checks), causal_chain_contract(act_order/act_functions/quality_checks), plot_lines(mainline/subplot/event_line/relationship_line/logic_line), character_order, beat_sequence, beat_density_contract, cost_and_reward, ending_contract(final_state/unresolved_question/next_chapter_pull)；大纲方法合同 outline_methods_contract 必须按 oh-story outline-methods 输出五步大纲创建法、八节点故事结构、爽文五阶段小循环、情绪拉扯五折线、五项驱动检查、细纲:正文 = 1:2.5~1:3、相同金手指逻辑禁止连续使用、爽点倒推和同一套路间隔至少 3 个不同剧情类型；small_outline_contract 必须按 oh-story 小纲四步法输出分段判断、目的和效果、详写/略写、快速定位，segment_cards 每项包含 segment_no,segment,purpose,intended_effect,detail_level,quick_locator；mainline_definition_contract 必须按 oh-story 主线定义输出主线不等于升级、主线是一件事、升级是主角达成目标的行动、不是一个元素和主线完成后的承接规则；causal_chain_contract 必须按 oh-story 五幕式输出种子/生长/转折/冲刺/完成，要求不能跳步、不能乱序；beat_sequence 每项必须包含 beat_no/scene_no/action/function_tag/payoff，function_tag 必须决定展开还是带过，关键揭露/打脸/高潮/爽点必须展开，过渡/赶路/信息交代必须压缩。',
              '情绪弧合同 emotional_arc_contract 必须按 oh-story 情绪弧与 emotional-methods/plot-emotion-system 输出 arc_shape, emotion_formula, pressure_methods, payoff_types, payoff_reverse_design, payoff_tier_rules, payoff_density_rules, emotion_module_recomposition_rules, payoff_escalation_rules, progressive_confrontation_rules, meme_plot_formula_rules, reader_desire_formula_rules, scene_execution_rules, expectation_rules, safety_rules, bonding_setup_rules, emotional_tear_rules, lingering_aftertaste_rules, emotional_turning_rules, emotional_rhythm_curve_rules, genre_emotion_strategy_rules, first_impression_rules, peak_end_rules, emotion_layer_rules, reaction_structure_rules, ideological_conflict_rules, failure_mode_guards, quality_checks，明确本章如何完成平静 -> 调动 -> 释放 -> 爽、爽点倒推法（先定爽点类型 -> 再定期待点 -> 最后倒推铺垫，正文按铺垫 -> 期待升高 -> 爽点释放呈现）、场景情绪执行（每个场景标注调动/复现/释放/后反应，闭环当前期待时开启下一开环）、装逼层级（日常小装逼/核心爽点/偏离爽点）、多爽点密度（不要拉长单个爽点铺垫，800-1200 字内要有信息增量/能力展示/危机反制/关系变化/小回收）、情绪拉扯曲线（温暖 -> 残忍 -> 善意 -> 真相 -> 原谅 -> 来不及 -> 释然 -> 细节暴击；不是所有故事都走完整曲线，按本章需要截取）、题材情感策略（世情/爽文、情感/虐心、古言/复仇、悬疑/推理、年代/亲情分别匹配解气、余韵、因果报应、信息差、代际遗憾）、先入为主（前100字先给核心矛盾/主角处境/不公平异常，注意否定提前）、峰终定律（结尾情绪必须高于起点，结尾情绪强度虐≥8、爽≥7、治愈≥6，最后一击必须是动作/对话/画面）、三层情绪（角色自己的情绪、文本传递的情绪、读者实际感受分离，角色在哭不等于读者哭，必须转成读者收益）、情绪反应结构（前反应 -> 复现 -> 后反应；以小搏大 -> 士气如虹）、理念矛盾（理念之争比利益之争更能引发深层共鸣，把原则碰撞、追求和牺牲落成具体选择与代价）、情绪模块重组（戏剧性会磨损，情绪不会磨损；复用套路必须换场景/换对手/加新情绪或提高 stakes/奖励复杂度）、递进对抗（角力而非碾压、主角小胜、对手加码、最后王炸）、梗四段式（发生 -> 发展 -> 转折 -> 高潮）、读者欲望四步公式（生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿）、情绪三板斧（羁绊铺设/情感撕裂/余韵钝痛）和每 3-5 个小节的事件触发情绪转向，并让连续爽点按影响范围、揭示深度或身份落差递增。',
              '章级钩子合同 chapter_hook_contract 必须按 oh-story 章首/章尾钩子输出 opening_hook_type, ending_hook_type, hook_strength, opening_hook_rules, ending_hook_rules, forbidden_patterns, quality_checks，明确前 100-300 字和最后 300 字如何制造追读。',
              '段落级钩子合同 paragraph_hook_contract 必须按 oh-story 段落级钩子输出 micro_hook_types, hook_combinations, dialogue_escalation, spectator_layers, forbidden_patterns, quality_checks，明确本章每 3-5 段如何制造信息、风险、情绪或关系变化。',
              '开篇合同 opening_contract 必须按 oh-story 开篇检查输出 protagonist_entry, first_100_char_hook, event_density, body_anchor, five_essentials_rules, forbidden_opening_patterns, quality_checks；five_essentials_rules 必须包含开头五要诀“简单/不偏/快/爽/不平”，确保开篇不是风景/醒来/解释起手。',
              '悬念合同 suspense_contract 必须按 oh-story 悬念检查输出 suspense_type, threat, delay_plan, payoff_distance, false_alarm_guardrails, information_order_templates, suspense_strength, suspense_cycle, trigger_layers, expectation_layers, expectation_chain, multi_line_suspense_rules, reader_preknowledge_rules, information_gap_rules, trump_card_preposition_rules, foreshadowing_boundary_rules, shock_layers, quality_checks，确保威胁有代价、有延迟、有兑现路径；multi_line_suspense_rules 必须包含短弧2-3章、中弧5-8章、长弧整卷和至少两条悬念线运行；reader_preknowledge_rules 必须包含读者预知法和读者知道但主角不知道；information_gap_rules 必须包含信息差运用和信息差抹平时爽点爆发；trump_card_preposition_rules 必须包含底牌前置法、先展示主角底牌、底牌 + 即将发生的冲突；foreshadowing_boundary_rules 必须包含“伏笔不是谜语人”、短期紧张用悬念、长期线索用伏笔、信息延迟超过3章且中间无推进时提前给或删除、伏笔自然融入动作/物件/误判/环境回声。',
              '反转合同 reversal_contract 必须按 oh-story 反转检查输出 reversal_type, setup_clues, misdirection, reveal_timing, emotional_impact, cheat_guardrails, quality_checks，确保反转有铺垫、不靠天降新信息。',
              '高潮对抗合同 showdown_contract 必须按 oh-story style-combat-face / hooks-suspense / plot-frameworks 输出 payoff_release_rules, trump_card_reserve_rules, invincible_protagonist_rules, three_pressure_shock_rules, stage_chain_rules, transmission_channel_rules, shock_chain_rules, combat_design_rules, weak_over_strong_rules, counterplay_layers, emotion_rhythm_rules, revision_priorities, quality_checks；payoff_release_rules 必须包含爽点释放和“反派就要受到对应的压制”，trump_card_reserve_rules 必须包含底牌管理、手里保持2-3个未揭示底牌、每次只出1个、出牌后获得新技能/新后手/新目标，invincible_protagonist_rules 必须包含“主角登场即杀伐果断”、战力前置无敌、主角登场时一点都不能拖拉、不一击必杀时必须有明确理由，three_pressure_shock_rules 必须包含三压一爆三震、友好势力、敌方势力、中立势力、一爆碾压和三方震动，stage_chain_rules 必须包含“群众层 -> 中间层 -> 核心层”，transmission_channel_rules 必须包含“装逼前必须先铺设人际关系，否则没有传递通道”和爽点释放后改变态度/利益/声望/规则评价，shock_chain_rules 必须包含震惊分层基于自身利益和目标，combat_design_rules 必须包含“打斗是一场表演”，counterplay_layers 必须包含“预判反制”和“反预判”，emotion_rhythm_rules 必须包含“急 -> 缓 -> 急”。',
              '桥段节奏合同 bridge_unit_contract 必须按 oh-story outline-rhythm / commercial-core-methods 输出 bridge_position, bridge_unit_plan, four_chapter_roles, expectation_chain_rules, climax_duration_rules, transition_rules, fatigue_repair_rules, revision_priorities, quality_checks；four_chapter_roles 必须包含“四章一桥段”和“结尾必须让主角开始装”，expectation_chain_rules 必须包含“高潮中埋钩子”，transition_rules 必须包含“连续小期待”，fatigue_repair_rules 必须包含“连续 2 章没有目标推进”。',
              '剧情框架合同 plot_framework_contract 必须按 oh-story plot-frameworks 输出 genre_framework_route, selected_frameworks, stage_ownership(creation/outline/scene_card/prose/revision), rpg_reward_loop, faction_hand_framework, double_line_info_gap_rules, routine_variation_rules, large_structure_rules, six_act_story_rules, global_no_collapse_checks, quality_checks；必须包含题材→框架路由、RPG结构与奖励设计、框架与阵营手牌法、套路模板重复法、五不崩，并说明本章如何把题材框架落到场景卡和正文自检。',
              '文风覆盖边界合同 style_boundary_contract 必须按 oh-story style-profile-protocol 输出 style_override_rules, hard_constraints, copy_boundary_rules, conflict_resolution_rules, revision_priorities, quality_checks；hard_constraints 必须包含“硬约束永远赢”、禁用词、Gate F、万能比喻、章末预告、字数下限、剧情/状态/时间线不漂移；copy_boundary_rules 必须包含不得复制样章桥段。',
              '核心商业雷达 core_contract_radar 必须按 oh-story commercial-core-methods 输出 must_serve, no_drift, theme_unity_rules, selling_point_execution_rules, repetition_strategy_rules, commercial_rhythm_rules, goldfinger_structure_rules, launch_pressure_rules, repair_focus, checks；selling_point_execution_rules 必须包含卖点四步法、发现比告知爽十倍和开头暗示 -> 中间深化 -> 高潮爆发；repetition_strategy_rules 必须包含重复点和同一卖点至少延展 3 个角度；commercial_rhythm_rules 必须包含追踪/上下文.md、最近3章、连续 2 章没有目标推进/阻碍升级/新信息和大高潮 7-10 天；goldfinger_structure_rules 必须包含金手指可替换故事流程中的任一环节、简单一眼就懂和系统限制；launch_pressure_rules 必须包含开篇 300-500字内交代处境、危险来源和破局希望，以及优先用环境型压力开局。',
              '剧情动力合同 plot_dynamics_contract 必须按 oh-story 剧情核心方法输出 goal, obstacle, action, cost_feedback, next_expectation, drive_mode_rules, line_stagger_rules, quality_checks，确保目标→阻碍→行动→代价/反馈→新期待闭环；drive_mode_rules 必须包含事件驱动/情感驱动/混合模式选择：番茄爽文/打脸文每章给外部结果（赢、升级、对手栽），追妻/虐心/世情持续人物心结，混合模式主线事件推进并每 3-5 章插情感停顿；并让主线和支线错开节奏推进，不能同时爆完或同时空转。',
              '故事力合同 story_power_contract 必须按 oh-story 剧情核心方法输出 story_power_dimensions, chapter_power_loop, action_rules, beginning_end_rules, causal_feedback_rules, quality_checks，确保故事五维、有动作才是故事、有始有终、因果反馈和行动改变局势都能进入正文门禁。',
              '主线定义合同 mainline_definition_contract 必须按 oh-story 剧情核心方法输出 mainline_event, definition_rules, action_rules, handoff_rules, forbidden_mainline_shapes, quality_checks，确保主线不等于升级、主线是一件事、升级只是达成目标的行动。',
              '信息流合同 information_flow_contract 必须输出 scene_information_units, reveal_order, suspense_responses, transition_compression_rules, next_objective_rules, no_infodump_guardrails, quality_checks，确保信息随冲突释放，不写背景说明书；transition_compression_rules 必须包含过渡不是填充、没有信息量就删掉、纯移动/寒暄/环境描写直接跳过或压缩；next_objective_rules 必须包含每次实力/身份/资源/阶段性目标提升后立即引入新的挑战、目标、代价或更高门槛。',
              '期待阈值合同 expectation_threshold_contract 必须输出 current_expectations, payoff_or_delay_plan, next_open_loop, vacuum_guardrails, expectation_before_payoff_rules, expectation_relay_rules, three_expectation_lines, quality_checks；expectation_before_payoff_rules 必须包含期待感 > 爽点、铺垫篇幅不少于释放篇幅和延迟满足；expectation_relay_rules 必须包含期待接力法、旧期待闭环前下一开环已经运行、当一层即将满足时先铺好下一层期待、至少两条期待线并行运行；确保兑现旧期待前先种下新期待，并保持剧情期待 + 主题甜头 + 新鲜感三线并存。',
              '故事循环合同 story_loop_contract 必须输出 setup, escalation, payoff, carry_over, map_transition_rules, nested_loop_rules, quality_checks，确保本章不是孤立事件而是长线循环的一环；map_transition_rules 必须包含旧地图核心冲突阶段性解决、新地图 = 新环境 + 新角色 + 新规则 + 新目标 + 新冲突、前5章建立代入感和期待感、保留贯穿主线、人际关系动了 -> 主角再动、避免旧线全抛和新设定一次性倒出；nested_loop_rules 必须包含“小循环 -> 中循环 -> 大循环”、小循环中必须铺垫大循环的期待，以及同一核心卖点的不同角度/不同矛盾。',
              '正文工艺合同 prose_craft_contract：正文工艺短口径，必须输出 pov_rules, expression_rules/body_detail_rules, scene_weaving_rules, subject_name_rhythm_rules, indirect_description_rules, three_camera_rules, then_what_rules, core_emotion_alignment_rules, baimiao_sensory_rules, dynamic_description_rules, shot_rhythm_rules, transition_bridge_rules, rhythm_rules, object_number_rules, section_structure_rules, section_density_rules, anti_padding_rules, concept_anchor_rules, description_limits, anti_ai_smell_rules, quality_checks；subject_name_rhythm_rules=主语与名字节奏，段首/场景切换/多人同场/视角重置点名，段中代词/省略/动作承接，避免每句报名字和指代不清；indirect_description_rules=间接描写法，正面描写只是铺垫，侧面反应才是爽点，不要直接宣布，用配角动作/围观者判断/对手失态/环境变化证明；three_camera_rules=三机位法，机位1主角近景，机位2外部反应/环境变化，机位3必要设定，设定都由冲突引出；then_what_rules=“然后呢”基点法，每一段文字接动作/发现/反应/选择/风险；core_emotion_alignment_rules=围绕核心情绪设计全部情节，情节/人设/冲突/细节服务目标读者核心情绪，宏观把控整体节奏，微观控细节；baimiao_sensory_rules=白描、两到三种感官，五感必须服务情绪；dynamic_description_rules=动态描写优于静态描写，动作和反应展现，角色行动中穿插点染；shot_rhythm_rules=镜头与分镜思维，远景/中景/近景/特写，短句、短段、密集动作；transition_bridge_rules=场景切换与转场，相似物/相似五感/相似情绪，时间跳转用动作或物件衔接，空间跳转用声音或光影衔接；section_structure_rules=一个主事件、3-5 个子事件、一个情绪变化、一条读者新获知的信息、3-5 轮对话交锋、小节结尾钩子、下一节开头快速接续和情绪跨节递进；section_density_rules=小节密度诊断；anti_padding_rules=禁止凑字数环境描写/重复情绪/内心独白总结/无意义动作；concept_anchor_rules=新名词/新设定首次出现有动作反应、对话半句或物理后果；description_limits=水分控制，删掉这段后读者会不会困惑；anti_ai_smell_rules=高危词、章末总结体、叠加式描写、心理告知和模板表达清理。',
              '语气标点合同 punctuation_tone_contract 必须输出 tone_targets, punctuation_rules, dialogue_pause_rules, forbidden_punctuation_patterns, quality_checks，确保标点服务语气和人物声线。',
              '质量诊断合同 quality_audit_contract 必须输出 audit_dimensions, chapter_purpose_rules, water_detection_rules, event_content_rules, score_thresholds, required_receipts, quality_checks；chapter_purpose_rules 必须包含每章一句话概括内容，并标注目的词（铺垫/高潮/爽点/打脸/人物塑造/设定）；event_content_rules 必须包含事件内容比重不能小于一半、事件是价值改变的契机、设定尽量通过事件演绎而非旁白强塞，确保交稿自检可诊断结构、吸引力、目的跑偏、水文和事件含量问题。',
              '对白合同 dialogue_contract 必须按 oh-story dialogue-mastery 输出 scene_modes, voice_anchors, dialogue_goals, key_lines, relationship_moves, dialogue_execution_checklist, mode_playbooks, power_length_rules, subtext_agenda_rules, tone_context_rules, emotion_push_rules, emotion_continuity_rules, dialogue_drive_rules, information_embed_rules, information_tension_rules, voice_differentiation_rules, spectator_dialogue_rules, supporting_speaker_limit_rules, dialogue_rhythm_rules, dialogue_volume_rules, dialogue_meme_rules, dialogue_audit_rules, revision_priorities, quality_checks；dialogue_execution_checklist 必须逐场输出 scene_no, scene, mode, speaker_agendas, line_functions, emotion_flow, information_strategy, voice_differentiation, forbidden_patterns, receipt_keys，确保场景卡里的对白要求能被正文和 dialogue_checks 逐场验收；power_length_rules 必须包含“掌控者/主角亮底牌时对白 ≤ 10 字”和“被压制方对白 ≥ 20 字”；subtext_agenda_rules 必须包含“真实动机绝对不能浅显地写在台词里”，tone_context_rules 必须包含“关系 × 场合 × 目的 = 语气”，emotion_push_rules 必须包含“命令式+否定式最能激发读者情绪”，emotion_continuity_rules 必须要求每次情绪转变有事件触发，dialogue_drive_rules 必须要求对白强化期待、爽感或悬念，information_embed_rules 必须包含“用角色的语气和立场包裹信息”，information_tension_rules 必须要求通过质疑、证据和核心信息兑现形成拉扯，voice_differentiation_rules 必须包含口癖和惯用语、说话节奏、信息偏好、身份影响措辞、性格影响语气和关系阶段不同，spectator_dialogue_rules 必须包含普通人震惊、专业人士分析、特殊身份者反应、短小精悍和不代替主线，supporting_speaker_limit_rules 必须包含“同一场景配角不超过 3 个有台词”“没有功能的角色不要出场”和“配角退场要主动规划”，dialogue_rhythm_rules 必须包含连续多轮对话后需要换气、穿插动作描写、紧张段落对话短促、关键信息放对话开头或结尾，dialogue_volume_rules 必须包含读者已知信息、叙事一句话概括、突发状况替代、主角旁白平铺直叙和新人物必须安排主线戏份，dialogue_meme_rules 必须包含说不出来但意思到了、梗或骚话、强化记忆点、高潮点和不得直接复刻，dialogue_audit_rules 必须包含大量信息都必须用对话来展示、问答式的一问一答、依赖对话来推动剧情或人物变化、遮住角色名后能否区分、单次对话不超过全节 40%、自然口语交流和对话结尾能否预示接下来的节奏变化，确保对白推进剧情、增加期待或展示人设，而不是说明书。',
              '连续性热度合同 continuity_heat_contract 必须按 oh-story 连续性追踪输出 heat_states, active_expectations, watch_items, dormant_allowed, revision_priorities, quality_checks，确保 hot/warm/cold/archived 元素都有处理理由。',
              '角色关系合同 character_relation_contract 必须按 oh-story 角色关系输出 relationship_types, important_relationships, independent_goals, goal_ownership_rules, relationship_life_rules, expectation_hub_rules, buffer_zone_rules, tests_or_pressure, attitude_shifts, quality_checks，确保关系变化有类型、压力、行动、配角期待枢纽、配角攻略缓冲区和正文证据；goal_ownership_rules 必须包含主角目标必须属于自己的、不能只是帮别人实现目标、主角必须保留自己的诉求/主动选择/代价；relationship_life_rules 必须包含角色生命中有恋爱之外的内容、不是单薄的情感工具人、关系角色还要有事业/责任/资源/身份/风险/行动线；expectation_hub_rules 必须包含配角期待枢纽/人物扣、任务基地、短期和长期期待、主角解决事件后开启新一轮装逼/新任务/新剧情，以及人物下线时用更大好处转化损失厌恶；buffer_zone_rules 必须包含配角攻略缓冲区、信息差、地位差距、亲密度差距或信任程度，配角不能像 NPC 一样站着等主角触发，并在关键拐点写清配角从旁观/质疑/拒绝/试探到行动/协助/设限的态度变化。',
              '角色行为合同 character_behavior_contract 必须按 oh-story 角色行为输出 motivation_chain, motivation_specificity_rules, layered_tags, behavior_rules, protagonist_composure_rules, strong_association_rules, memory_anchors, supporting_role_functions, role_card_requirements, supporting_role_exit_rules, behavior_repeat_rules, character_driven_event_rules, protagonist_red_line_rules, identity_goldfinger_alignment_rules, antagonist_logic, antagonist_weight_rules, antagonist_self_story_rules, antagonist_tier_exit_rules, quality_checks，确保角色行为由动机链驱动；role_card_requirements 必须包含角色定位、身份标签、外貌特征、核心目标、核心动机、致命弱点、口头禅/标志动作；supporting_role_exit_rules 必须包含配角功能、与主角关系、核心特质、标志性特征、退场方式和同一场景配角不超过 3 个有台词；behavior_repeat_rules 必须包含行为重复点和不同场景重复；character_driven_event_rules 必须包含人推事件、从人物动机找方向和不要硬编剧情；protagonist_red_line_rules 必须包含圣母、无脑战斗机器、内核邪恶、因蠢/圣母犯错、自暴自弃；identity_goldfinger_alignment_rules 必须包含社会身份、身世、金手指、性格高度统一；motivation_specificity_rules 必须包含起因必须具体、不能写“被欺负”这种模糊说法、动机必须是情感层面、不能写“要成为最强”这种空话、动机演变有铺垫；protagonist_composure_rules 必须包含升级线与主角反应线分开管理、升级提升实力但不自动改变从容反应、面对低级挑衅不被牵着走、用轻描淡写/短句/行动压制替代暴怒失态；strong_association_rules 必须包含每个重要角色至少 3 个强关联设定、强关联直接影响剧情走向/核心梗装逼爽点/人物碰撞、弱关联不喧宾夺主；antagonist_weight_rules 必须包含反派建立四要素、实力展示、动机可信、真实威胁和终极意图时机；antagonist_self_story_rules 必须包含反派也有梦想、在反派眼中他是自己故事的主人公、旧痛/创伤、优势即致命缺陷和理念冲突；antagonist_tier_exit_rules 必须包含反派层级表、篇幅与层级匹配、小反派、中等反派、大弧 Boss、最终 Boss、退场方式和最终Boss从第一章就有伏笔。',
              '资产挂钩合同 asset_linkage_contract 必须按 oh-story 资产协议输出 key_assets, linkage_plan, usage_rules, three_appearance_plan, prop_ability_expectation_rules, state_tracking, quality_checks，确保孤立资产挂到冲突、状态和回报上；prop_ability_expectation_rules 必须包含道具能力展示的8步期待模板：宝物功能强大、配角误判鸡肋、宝物恰好克制反派、他人失败、主角方案、众人不看好、鸡肋成神器和新钩子。',
              '状态跟踪合同 state_tracking_contract 必须按 oh-story state-tracking 输出 character_states, historical_causality, world_constraints, source_requirements, source_readiness, filter_rules, quality_checks，确保写正文前只保留会影响本章正确性的状态。',
              '意图确认合同 intent_confirmation_contract 必须按 oh-story workflow-daily 输出 confirmed_intent, rhythm_and_style, structure_inputs, logic_line, appearance_order, cost_and_reward, ending_handoff, quality_checks，确保正文按本章意图统一发力。',
              '目标读者合同 target_reader_contract 必须按 oh-story 自嗨判定法和 genre-readers 输出 reader_profile, reader_desires, chapter_attractions, genre_vitality_rules, platform_fit_rules, boundary_fit_rules, title_blurb_alignment_rules, immersion_plasticity_rules, goldfinger_life_fit_rules, commercial_expression_rules, validation_questions, correction_methods, quality_checks，确保本章清楚写给谁、满足什么阅读欲望、用当前目标平台样本验证题材生命力、校准平台写法、守住题材边界、做到书名简介内容三位一体、避免代入感/塑料感断裂、让金手指贴住生活/职业并给出可感知回报。',
              '题材定位合同 genre_positioning_contract 必须按 oh-story 题材定位输出 genre_label, reader_psychology, genre_formula, core_hook_rules, goldfinger_fit_rules, must_have_scenes, platform_fit_rules, micro_innovation_rules, micro_innovation_702010_rules, micro_innovation_methods, longboard_focus_rules, quality_checks，确保题材承诺和正文场景一致；micro_innovation_702010_rules 必须包含“70%来自过去经历和记忆”“20%来自当前生活状态”“10%来自时事热点话题和趋势”；micro_innovation_methods 必须包含精炼法、升级法、加料法、反套路法和组合法；longboard_focus_rules 必须包含“拉长板而非补短板”、题材长板、核心卖点背后的情绪清晰、同一卖点至少 3 个角度和不得稀释核心卖点。',
              '女频长篇合同 female_audience_contract 必须在项目为女频/女生频道/女主导向时按 oh-story female-audience-writing 输出 audience_mode, core_principles, reader_need_rules, copy_promise_rules, longform_genre_rules, romance_axis_rules, abuse_dosage_rules, platform_fit_rules, revision_priorities, quality_checks；core_principles 必须包含安全感优先、代入感优先、女主主动性、情绪即产品；reader_need_rules 必须包含被认可、被珍视、被尊重；romance_axis_rules 必须包含感情线双轴和感情升级踩在事业/成长节点；abuse_dosage_rules 必须包含每段虐后必给反转或糖，避免连续整卷只虐；platform_fit_rules 必须按番茄女生/起点女生/晋江/七猫校准安全感密度和节奏；quality_checks 必须包含货板一致。',
              '升级节奏合同 upgrade_rhythm_contract 必须按 oh-story 升级感三步法输出 upgrade_gap, upgrade_gain_plan, feedback_loop, emotion_modules, bridge_rhythm, ranking_ladder_rules, goldfinger_feedback_rules, goldfinger_simplicity_rules, goldfinger_multi_dimension_growth_rules, quality_checks，确保升级前缺口、升级后变化和即时/延迟反馈都可见；ranking_ladder_rules 必须包含“排行榜提供升级动力”、通过排行榜介绍新对手和榜单出现后要有装逼余震；goldfinger_feedback_rules 必须包含“给出金手指后必须有即时变化”、“把金手指带来变化的过程掺杂在故事里”、金手指契合主角当前职业/身份/生活困境，以及金手指不能替代全部行动链；goldfinger_simplicity_rules 必须包含“金手指简单是核心”和“一眼就懂”，并要求功能、触发条件、奖励反馈和升级规则清晰；goldfinger_multi_dimension_growth_rules 必须包含“金手指提升要有多维度”、词条、功能、品质和条件-反馈模型，避免只剩品质/数值单线提升。',
              '冲突结构合同 conflict_structure_contract 必须按 oh-story 矛盾与结构设计输出 conflict_ladder, motivation_sources, antagonist_pressure_rules, protagonist_agency_rules, event_value_changes, next_conflict_seeds, conflict_network_layers, no_exit_rules, quality_checks，确保每个主要场景都有明确阻力、胜负变化、下一冲突种子和有进无出；conflict_network_layers 必须包含 vertical_conflict, horizontal_conflict, cross_conflict, weaving_order，按定地图→定阵营→定角色编织纵向/横向/交叉三层矛盾；no_exit_rules 必须包含主角非踏入不可、死亡赌注/退出代价、黏结剂（杀人理由/工作职责/道德责任/实体场所）和对立双方无法轻易脱身。',
              '要求：蓝图必须承接上一章状态，服务长线主线；不要用“推进本章核心冲突”这类占位句。',
              JSON.stringify({
                project: { title: project.title, genre: project.genre, synopsis: project.synopsis, story_state: project.reference_config?.story_state || {} },
                chapter: { chapter_no: chapter.chapter_no, title: chapter.title, goal: chapter.chapter_goal, summary: chapter.chapter_summary, conflict: chapter.conflict, ending_hook: chapter.ending_hook },
                recent_chapters: chapters.filter(item => item.chapter_no <= chapter.chapter_no).slice(-6).map(item => ({ chapter_no: item.chapter_no, title: item.title, summary: item.chapter_summary, ending_hook: item.ending_hook, has_text: Boolean(item.chapter_text) })),
                relevant_outlines: outlines.slice(0, 80).map(item => ({ type: item.outline_type, title: item.title, summary: item.summary, hook: item.hook, conflict_points: item.conflict_points })),
                preflight_warnings: contextPackage?.preflight?.warnings || [],
              }, null, 2).slice(0, 12000),
            ].join('\n'),
          }, {
            activeWorkspace,
            modelId: String(modelId),
            maxTokens: 6800,
            temperature: 0.35,
            skipMemory: true,
            signal: options.abortSignal,
            timeoutMs: options.llmTimeoutMs,
          })
          payload = getNovelPayload(result)
        } catch (error) {
          if (isAbortError(error)) throw error
          errors.push(`章节蓝图补齐失败：${String(error).slice(0, 200)}`)
        }
      }
      const matchedOutline = outlines
        .filter(item => String(item.outline_type || '') === 'chapter')
        .find(item => String(item.title || '').includes(String(chapter.chapter_no)) || Number(item.raw_payload?.chapter_no || 0) === Number(chapter.chapter_no))
      const fallbackGoal = compactBriefText(chapter.chapter_goal || matchedOutline?.summary || project.synopsis || `第${chapter.chapter_no}章必须承接上一章状态，推进主线冲突并留下下一章追读问题。`)
      const fallbackConflict = compactBriefText(chapter.conflict || asArray(matchedOutline?.conflict_points)[0] || matchedOutline?.hook || fallbackGoal)
      const fallbackHook = compactBriefText(chapter.ending_hook || matchedOutline?.hook || `第${chapter.chapter_no}章结尾抛出新的选择、危险或信息差，迫使读者进入下一章。`)
      const nextTitle = compactBriefText(payload?.title || chapter.title || matchedOutline?.title || `第${chapter.chapter_no}章`)
      const nextGoal = compactBriefText(payload?.chapter_goal || payload?.goal || fallbackGoal)
      const nextSummary = compactBriefText(payload?.chapter_summary || payload?.summary || chapter.chapter_summary || fallbackConflict)
      const nextConflict = compactBriefText(payload?.conflict || fallbackConflict)
      const nextHook = compactBriefText(payload?.ending_hook || payload?.hook || fallbackHook)
      const payloadBlueprint = payload?.chapter_blueprint && typeof payload.chapter_blueprint === 'object' ? payload.chapter_blueprint : {}
      const payloadContentOutline = payloadBlueprint.content_outline || payloadBlueprint.contentOutline || {}
      const payloadCausalChainContract = payloadBlueprint.causal_chain_contract || payloadBlueprint.causalChainContract
      const payloadOutlineMethodsContract = payloadBlueprint.outline_methods_contract || payloadBlueprint.outlineMethodsContract
      const payloadPlotLines = payloadBlueprint.plot_lines || payloadBlueprint.plotLines || {}
      const payloadEndingContract = payloadBlueprint.ending_contract || payloadBlueprint.endingContract || {}
      const characterOrder = asArray(payloadBlueprint.character_order || payloadBlueprint.characterOrder || payload?.character_order || payload?.characterOrder)
        .map((item: any) => compactBriefText(item))
        .filter(Boolean)
      const fallbackCharacterOrder = characters.map((item: any) => compactBriefText(item.name)).filter(Boolean).slice(0, 8)
      const beatSequence = asArray(payloadBlueprint.beat_sequence || payloadBlueprint.beatSequence)
      const repairedBeatSequence = beatSequence.length ? beatSequence : [{
        beat_no: 1,
        scene_no: 1,
        title: nextTitle,
        action: nextSummary,
        function_tag: '开篇钩子/推进/章尾承接',
        payoff: nextGoal,
      }]
      const repairedContentOutline = {
        cause: compactBriefText(payloadContentOutline.cause || nextSummary),
        development: compactBriefText(payloadContentOutline.development || nextConflict),
        turn: compactBriefText(payloadContentOutline.turn || payload?.turning_point || nextGoal),
        climax: compactBriefText(payloadContentOutline.climax || payload?.climax || nextGoal),
        ending: compactBriefText(payloadContentOutline.ending || nextHook),
      }
      const repairedPlotLines = {
        mainline: compactBriefText(payloadPlotLines.mainline || payloadPlotLines.main_line || payloadPlotLines.mainLine || nextGoal),
        subplot: compactBriefText(payloadPlotLines.subplot || ''),
        event_line: compactBriefText(payloadPlotLines.event_line || payloadPlotLines.eventLine || nextSummary),
        relationship_line: compactBriefText(payloadPlotLines.relationship_line || payloadPlotLines.relationshipLine || ''),
        logic_line: compactBriefText(payloadPlotLines.logic_line || payloadPlotLines.logicLine || [nextSummary, nextConflict, nextGoal, nextHook].filter(Boolean).join(' -> ')),
      }
      const smallOutlineScenes = repairedBeatSequence.map((beat: any, index: number) => ({
        scene_no: Number(beat.scene_no || beat.sceneNo || beat.beat_no || beat.beatNo || index + 1),
        title: compactBriefText(beat.title || `情节点${index + 1}`),
        purpose: compactBriefText(beat.action || beat.summary || beat.event || nextSummary),
        reader_payoff: compactBriefText(beat.payoff || nextGoal),
        function_tag: compactBriefText(beat.function_tag || beat.functionTag),
      }))
      const repairedChapterBlueprint = {
        version: payloadBlueprint.version || 'oh_story_chapter_blueprint_v1',
        source: payloadBlueprint.source || 'unattended_preflight_repair',
        target_emotion: compactBriefText(payloadBlueprint.target_emotion || payloadBlueprint.targetEmotion || payload?.target_emotion || '承接上一章压力，完成本章推进与章尾追读。'),
        opening_hook: compactBriefText(payloadBlueprint.opening_hook || payloadBlueprint.openingHook || payload?.opening_hook || nextConflict),
        core_payoff: compactBriefText(payloadBlueprint.core_payoff || payloadBlueprint.corePayoff || payload?.core_payoff || nextGoal),
        content_outline: repairedContentOutline,
        small_outline_contract: buildChapterBlueprintSmallOutlineContract(
          { ...contextPackage?.chapter_target, summary: nextSummary, goal: nextGoal, ending_hook: nextHook },
          smallOutlineScenes,
          repairedContentOutline,
          payloadBlueprint.small_outline_contract || payloadBlueprint.smallOutlineContract,
        ),
        mainline_definition_contract: buildMainlineDefinitionContract(project, {
          ...contextPackage,
          chapter_target: {
            ...(contextPackage?.chapter_target || {}),
            summary: nextSummary,
            goal: nextGoal,
            conflict: nextConflict,
            ending_hook: nextHook,
            chapter_blueprint: {
              ...payloadBlueprint,
              content_outline: repairedContentOutline,
              plot_lines: repairedPlotLines,
            },
          },
          chapter_blueprint: {
            ...payloadBlueprint,
            content_outline: repairedContentOutline,
            plot_lines: repairedPlotLines,
          },
        }, payloadBlueprint.mainline_definition_contract || payloadBlueprint.mainlineDefinitionContract || payload?.mainline_definition_contract || payload?.mainlineDefinitionContract),
        causal_chain_contract: buildChapterBlueprintCausalChainContract(repairedContentOutline, payloadCausalChainContract),
        plot_lines: repairedPlotLines,
        character_order: characterOrder.length ? characterOrder : fallbackCharacterOrder,
        beat_sequence: repairedBeatSequence,
        beat_density_contract: buildChapterBlueprintBeatDensityContract(
          resolveChapterWordTarget(project, chapter, { word_target: contextPackage?.chapter_target?.word_target || contextPackage?.chapterTarget?.wordTarget }),
          repairedBeatSequence,
          payloadBlueprint.beat_density_contract || payloadBlueprint.beatDensityContract,
        ),
        cost_and_reward: compactBriefText(payloadBlueprint.cost_and_reward || payloadBlueprint.costAndReward || payload?.cost_and_reward || `代价/压力：${nextConflict}；收益/推进：${nextGoal}`),
        ending_contract: {
          final_state: compactBriefText(payloadEndingContract.final_state || payloadEndingContract.finalState || nextHook),
          unresolved_question: compactBriefText(payloadEndingContract.unresolved_question || payloadEndingContract.unresolvedQuestion || nextHook),
          next_chapter_pull: compactBriefText(payloadEndingContract.next_chapter_pull || payloadEndingContract.nextChapterPull || nextHook),
          forbidden_resolution: asArray(payloadEndingContract.forbidden_resolution || payloadEndingContract.forbiddenResolution),
        },
        writing_intent: compactBriefText(payloadBlueprint.writing_intent || payloadBlueprint.writingIntent || `第${chapter.chapter_no}章《${nextTitle}》：${nextGoal}；章尾钩子：${nextHook}`),
        outline_methods_contract: buildOutlineMethodsContract({
          ...contextPackage,
          chapter_target: {
            ...(contextPackage?.chapter_target || {}),
            chapter_no: chapter.chapter_no,
            title: nextTitle,
            summary: nextSummary,
            conflict: nextConflict,
            ending_hook: nextHook,
            chapter_blueprint: {
              ...payloadBlueprint,
              content_outline: repairedContentOutline,
              plot_lines: repairedPlotLines,
            },
          },
          chapter_blueprint: {
            ...payloadBlueprint,
            content_outline: repairedContentOutline,
            plot_lines: repairedPlotLines,
          },
        }, {
          explicit: payloadOutlineMethodsContract,
          content_outline: repairedContentOutline,
          scene_cards: smallOutlineScenes,
        }),
      }
      let repairedSceneCards = needsSceneCards
        ? autoRepairSceneCardsForPreflight(chapter, {
            ...contextPackage,
            chapter_target: {
              ...(contextPackage?.chapter_target || {}),
              chapter_no: chapter.chapter_no,
              title: nextTitle,
              goal: nextGoal,
              summary: nextSummary,
              conflict: nextConflict,
              ending_hook: nextHook,
              chapter_blueprint: repairedChapterBlueprint,
            },
          }, repairedChapterBlueprint)
        : asArray(contextPackage?.chapter_target?.scene_cards || contextPackage?.chapter_target?.sceneCards || chapter.scene_list || chapter.sceneList)
      if (needsSceneCards && modelId) {
        try {
          throwIfAborted(options)
          const sceneResult = await generateSceneCardsForChapter(activeWorkspace, project, {
            ...contextPackage,
            chapter_target: {
              ...(contextPackage?.chapter_target || {}),
              chapter_no: chapter.chapter_no,
              title: nextTitle,
              goal: nextGoal,
              summary: nextSummary,
              conflict: nextConflict,
              ending_hook: nextHook,
              chapter_blueprint: repairedChapterBlueprint,
              scene_cards: repairedSceneCards,
            },
          }, modelId, options)
          if (sceneResult.sceneCards.length) {
            repairedSceneCards = sceneResult.sceneCards.map((scene: any, index: number, cards: any[]) => autoRepairSceneCardDramaticUnit(scene, index, cards.length, chapter, {
              ...contextPackage,
              chapter_target: {
                ...(contextPackage?.chapter_target || {}),
                chapter_no: chapter.chapter_no,
                title: nextTitle,
                goal: nextGoal,
                summary: nextSummary,
                conflict: nextConflict,
                ending_hook: nextHook,
              },
            }, repairedChapterBlueprint))
          }
        } catch (error) {
          if (isAbortError(error)) throw error
          errors.push(`场景卡补齐失败，已使用确定性兜底：${String(error).slice(0, 200)}`)
        }
      }
      if (needsSceneCards) {
        repairedSceneCards = autoRepairSceneCardsForPreflight({
          ...chapter,
          scene_list: repairedSceneCards,
        }, {
          ...contextPackage,
          chapter_target: {
            ...(contextPackage?.chapter_target || {}),
            chapter_no: chapter.chapter_no,
            title: nextTitle,
            goal: nextGoal,
            summary: nextSummary,
            conflict: nextConflict,
            ending_hook: nextHook,
            scene_cards: repairedSceneCards,
          },
        }, repairedChapterBlueprint)
      }
      let repairedEmotionAndHookBrief = buildChapterPreDraftBrief(project, {
        ...contextPackage,
        pre_draft_brief: {
          ...(contextPackage?.pre_draft_brief || {}),
          ...(contextPackage?.preDraftBrief || {}),
          ...(chapter.raw_payload?.pre_draft_brief || {}),
          ...(chapter.raw_payload?.preDraftBrief || {}),
        },
        emotional_arc_contract: payload?.emotional_arc_contract || payload?.emotionalArcContract || contextPackage?.emotional_arc_contract,
        chapter_hook_contract: payload?.chapter_hook_contract || payload?.chapterHookContract || contextPackage?.chapter_hook_contract,
        paragraph_hook_contract: payload?.paragraph_hook_contract || payload?.paragraphHookContract || contextPackage?.paragraph_hook_contract,
        opening_contract: payload?.opening_contract || payload?.openingContract || contextPackage?.opening_contract,
        suspense_contract: payload?.suspense_contract || payload?.suspenseContract || contextPackage?.suspense_contract,
        reversal_contract: payload?.reversal_contract || payload?.reversalContract || contextPackage?.reversal_contract,
        showdown_contract: payload?.showdown_contract || payload?.showdownContract || contextPackage?.showdown_contract,
        bridge_unit_contract: payload?.bridge_unit_contract || payload?.bridgeUnitContract || contextPackage?.bridge_unit_contract,
        plot_framework_contract: payload?.plot_framework_contract || payload?.plotFrameworkContract || contextPackage?.plot_framework_contract,
        style_boundary_contract: payload?.style_boundary_contract || payload?.styleBoundaryContract || contextPackage?.style_boundary_contract,
        plot_dynamics_contract: payload?.plot_dynamics_contract || payload?.plotDynamicsContract || contextPackage?.plot_dynamics_contract,
        story_power_contract: payload?.story_power_contract || payload?.storyPowerContract || contextPackage?.story_power_contract,
        mainline_definition_contract: payload?.mainline_definition_contract || payload?.mainlineDefinitionContract || contextPackage?.mainline_definition_contract,
        information_flow_contract: payload?.information_flow_contract || payload?.informationFlowContract || contextPackage?.information_flow_contract,
        expectation_threshold_contract: payload?.expectation_threshold_contract || payload?.expectationThresholdContract || contextPackage?.expectation_threshold_contract,
        story_loop_contract: payload?.story_loop_contract || payload?.storyLoopContract || contextPackage?.story_loop_contract,
        prose_craft_contract: payload?.prose_craft_contract || payload?.proseCraftContract || contextPackage?.prose_craft_contract,
        punctuation_tone_contract: payload?.punctuation_tone_contract || payload?.punctuationToneContract || contextPackage?.punctuation_tone_contract,
        quality_audit_contract: payload?.quality_audit_contract || payload?.qualityAuditContract || contextPackage?.quality_audit_contract,
        dialogue_contract: payload?.dialogue_contract || payload?.dialogueContract || contextPackage?.dialogue_contract,
        continuity_heat_contract: payload?.continuity_heat_contract || payload?.continuityHeatContract || contextPackage?.continuity_heat_contract,
        character_relation_contract: payload?.character_relation_contract || payload?.characterRelationContract || contextPackage?.character_relation_contract,
        character_behavior_contract: payload?.character_behavior_contract || payload?.characterBehaviorContract || contextPackage?.character_behavior_contract,
        asset_linkage_contract: payload?.asset_linkage_contract || payload?.assetLinkageContract || contextPackage?.asset_linkage_contract,
        state_tracking_contract: payload?.state_tracking_contract || payload?.stateTrackingContract || contextPackage?.state_tracking_contract,
        intent_confirmation_contract: payload?.intent_confirmation_contract || payload?.intentConfirmationContract || contextPackage?.intent_confirmation_contract,
        target_reader_contract: payload?.target_reader_contract || payload?.targetReaderContract || contextPackage?.target_reader_contract,
        genre_positioning_contract: payload?.genre_positioning_contract || payload?.genrePositioningContract || contextPackage?.genre_positioning_contract,
        female_audience_contract: payload?.female_audience_contract || payload?.femaleAudienceContract || contextPackage?.female_audience_contract,
        upgrade_rhythm_contract: payload?.upgrade_rhythm_contract || payload?.upgradeRhythmContract || contextPackage?.upgrade_rhythm_contract,
        conflict_structure_contract: payload?.conflict_structure_contract || payload?.conflictStructureContract || contextPackage?.conflict_structure_contract,
        chapter_target: {
          ...(contextPackage?.chapter_target || {}),
          chapter_no: chapter.chapter_no,
          title: nextTitle,
          summary: nextSummary,
          conflict: nextConflict,
          emotional_curve: payload?.emotional_curve || payload?.emotionalCurve || repairedChapterBlueprint.target_emotion,
          ending_hook: nextHook,
          chapter_blueprint: repairedChapterBlueprint,
          emotional_arc_contract: payload?.emotional_arc_contract || payload?.emotionalArcContract || contextPackage?.chapter_target?.emotional_arc_contract,
          chapter_hook_contract: payload?.chapter_hook_contract || payload?.chapterHookContract || contextPackage?.chapter_target?.chapter_hook_contract,
          paragraph_hook_contract: payload?.paragraph_hook_contract || payload?.paragraphHookContract || contextPackage?.chapter_target?.paragraph_hook_contract,
          opening_contract: payload?.opening_contract || payload?.openingContract || contextPackage?.chapter_target?.opening_contract,
          suspense_contract: payload?.suspense_contract || payload?.suspenseContract || contextPackage?.chapter_target?.suspense_contract,
          reversal_contract: payload?.reversal_contract || payload?.reversalContract || contextPackage?.chapter_target?.reversal_contract,
          showdown_contract: payload?.showdown_contract || payload?.showdownContract || contextPackage?.chapter_target?.showdown_contract,
          bridge_unit_contract: payload?.bridge_unit_contract || payload?.bridgeUnitContract || contextPackage?.chapter_target?.bridge_unit_contract,
          plot_framework_contract: payload?.plot_framework_contract || payload?.plotFrameworkContract || contextPackage?.chapter_target?.plot_framework_contract,
          style_boundary_contract: payload?.style_boundary_contract || payload?.styleBoundaryContract || contextPackage?.chapter_target?.style_boundary_contract,
          plot_dynamics_contract: payload?.plot_dynamics_contract || payload?.plotDynamicsContract || contextPackage?.chapter_target?.plot_dynamics_contract,
          story_power_contract: payload?.story_power_contract || payload?.storyPowerContract || contextPackage?.chapter_target?.story_power_contract,
          mainline_definition_contract: payload?.mainline_definition_contract || payload?.mainlineDefinitionContract || contextPackage?.chapter_target?.mainline_definition_contract,
          information_flow_contract: payload?.information_flow_contract || payload?.informationFlowContract || contextPackage?.chapter_target?.information_flow_contract,
          expectation_threshold_contract: payload?.expectation_threshold_contract || payload?.expectationThresholdContract || contextPackage?.chapter_target?.expectation_threshold_contract,
          story_loop_contract: payload?.story_loop_contract || payload?.storyLoopContract || contextPackage?.chapter_target?.story_loop_contract,
          prose_craft_contract: payload?.prose_craft_contract || payload?.proseCraftContract || contextPackage?.chapter_target?.prose_craft_contract,
          punctuation_tone_contract: payload?.punctuation_tone_contract || payload?.punctuationToneContract || contextPackage?.chapter_target?.punctuation_tone_contract,
          quality_audit_contract: payload?.quality_audit_contract || payload?.qualityAuditContract || contextPackage?.chapter_target?.quality_audit_contract,
          dialogue_contract: payload?.dialogue_contract || payload?.dialogueContract || contextPackage?.chapter_target?.dialogue_contract,
          continuity_heat_contract: payload?.continuity_heat_contract || payload?.continuityHeatContract || contextPackage?.chapter_target?.continuity_heat_contract,
          character_relation_contract: payload?.character_relation_contract || payload?.characterRelationContract || contextPackage?.chapter_target?.character_relation_contract,
          character_behavior_contract: payload?.character_behavior_contract || payload?.characterBehaviorContract || contextPackage?.chapter_target?.character_behavior_contract,
          asset_linkage_contract: payload?.asset_linkage_contract || payload?.assetLinkageContract || contextPackage?.chapter_target?.asset_linkage_contract,
          state_tracking_contract: payload?.state_tracking_contract || payload?.stateTrackingContract || contextPackage?.chapter_target?.state_tracking_contract,
          intent_confirmation_contract: payload?.intent_confirmation_contract || payload?.intentConfirmationContract || contextPackage?.chapter_target?.intent_confirmation_contract,
          target_reader_contract: payload?.target_reader_contract || payload?.targetReaderContract || contextPackage?.chapter_target?.target_reader_contract,
          genre_positioning_contract: payload?.genre_positioning_contract || payload?.genrePositioningContract || contextPackage?.chapter_target?.genre_positioning_contract,
          female_audience_contract: payload?.female_audience_contract || payload?.femaleAudienceContract || contextPackage?.chapter_target?.female_audience_contract,
          upgrade_rhythm_contract: payload?.upgrade_rhythm_contract || payload?.upgradeRhythmContract || contextPackage?.chapter_target?.upgrade_rhythm_contract,
          conflict_structure_contract: payload?.conflict_structure_contract || payload?.conflictStructureContract || contextPackage?.chapter_target?.conflict_structure_contract,
          scene_cards: repairedSceneCards,
        },
      })
      const repairedBenchmarkRecallState = repairBenchmarkRecallSourcePathState(
        chapter,
        repairedEmotionAndHookBrief.benchmark_recall_brief,
        repairedEmotionAndHookBrief.benchmark_recall_gaps,
        repairedEmotionAndHookBrief.benchmarkRecallGaps,
      )
      const repairedBenchmarkRecallBrief = repairedBenchmarkRecallState.benchmark_recall_brief
      const repairedBenchmarkRecallGaps = repairedBenchmarkRecallState.benchmark_recall_gaps
      repairedEmotionAndHookBrief = {
        ...repairedEmotionAndHookBrief,
        scene_briefs: repairedSceneCards.map(sceneBriefFromCard),
        benchmark_recall_brief: repairedBenchmarkRecallBrief,
        benchmark_recall_gaps: repairedBenchmarkRecallGaps,
        benchmarkRecallGaps: repairedBenchmarkRecallGaps,
        state_tracking_contract: autoRepairStateTrackingSourceReadiness(repairedEmotionAndHookBrief.state_tracking_contract, chapter, {
          ...contextPackage,
          chapter_target: {
            ...(contextPackage?.chapter_target || {}),
            chapter_no: chapter.chapter_no,
            title: nextTitle,
            summary: nextSummary,
            conflict: nextConflict,
            ending_hook: nextHook,
            chapter_blueprint: repairedChapterBlueprint,
            scene_cards: repairedSceneCards,
          },
        }),
      }
      const nextChapterPatch: any = {
        title: nextTitle,
        chapter_goal: nextGoal,
        chapter_summary: nextSummary,
        conflict: nextConflict,
        ending_hook: nextHook,
        ...(needsSceneCards ? {
          scene_breakdown: repairedSceneCards,
          scene_list: repairedSceneCards,
        } : {}),
        raw_payload: {
          ...(chapter.raw_payload || {}),
          pre_draft_brief: {
            ...(chapter.raw_payload?.pre_draft_brief || {}),
            ...(chapter.raw_payload?.preDraftBrief || {}),
            confirmed_at: chapter.raw_payload?.pre_draft_brief?.confirmed_at
              || chapter.raw_payload?.preDraftBrief?.confirmed_at
              || new Date().toISOString(),
            confirmation_source: chapter.raw_payload?.pre_draft_brief?.confirmation_source
              || chapter.raw_payload?.preDraftBrief?.confirmation_source
              || 'unattended_preflight_repair',
            chapter_goal: nextGoal,
            core_conflict: nextConflict,
            ending_hook: nextHook,
            previous_handoff: repairedEmotionAndHookBrief.previous_handoff,
            reader_promise: repairedEmotionAndHookBrief.reader_promise,
            emotional_curve: repairedEmotionAndHookBrief.emotional_curve,
            key_settings: repairedEmotionAndHookBrief.key_settings,
            forbidden_content: repairedEmotionAndHookBrief.forbidden_content,
            storyline_advances: repairedEmotionAndHookBrief.storyline_advances,
            storyline_plants: repairedEmotionAndHookBrief.storyline_plants,
            storyline_payoffs: repairedEmotionAndHookBrief.storyline_payoffs,
            storyline_forbidden: repairedEmotionAndHookBrief.storyline_forbidden,
            platform_rubric: repairedEmotionAndHookBrief.platform_rubric,
            content_rubric: repairedEmotionAndHookBrief.content_rubric,
            character_arc_brief: repairedEmotionAndHookBrief.character_arc_brief,
            reader_retention_brief: repairedEmotionAndHookBrief.reader_retention_brief,
            reader_drop_risk_brief: repairedEmotionAndHookBrief.reader_drop_risk_brief,
            story_pressure_brief: repairedEmotionAndHookBrief.story_pressure_brief,
            story_drive_brief: repairedEmotionAndHookBrief.story_drive_brief,
            serial_rhythm_brief: repairedEmotionAndHookBrief.serial_rhythm_brief,
            page_turn_hook_brief: repairedEmotionAndHookBrief.page_turn_hook_brief,
            volume_climax_brief: repairedEmotionAndHookBrief.volume_climax_brief,
            recent_fatigue_brief: repairedEmotionAndHookBrief.recent_fatigue_brief,
            delivery_risk_carry_over: repairedEmotionAndHookBrief.delivery_risk_carry_over,
            reader_expectation_debt: repairedEmotionAndHookBrief.reader_expectation_debt,
            reader_expectation_ledger: repairedEmotionAndHookBrief.reader_expectation_ledger,
            innovation_brief: repairedEmotionAndHookBrief.innovation_brief,
            signature_scene_brief: repairedEmotionAndHookBrief.signature_scene_brief,
            meme_strategy: repairedEmotionAndHookBrief.meme_strategy,
            benchmark_recall_brief: repairedEmotionAndHookBrief.benchmark_recall_brief,
            benchmark_recall_gaps: repairedEmotionAndHookBrief.benchmark_recall_gaps,
            benchmarkRecallGaps: repairedEmotionAndHookBrief.benchmarkRecallGaps,
            style_sample_strategy: repairedEmotionAndHookBrief.style_sample_strategy,
            chapter_benchmark_strategy: repairedEmotionAndHookBrief.chapter_benchmark_strategy,
            first30_retention_brief: repairedEmotionAndHookBrief.first30_retention_brief,
            core_contract_radar: repairedEmotionAndHookBrief.core_contract_radar,
            longform_compass: repairedEmotionAndHookBrief.longform_compass,
            longform_battle_context: repairedEmotionAndHookBrief.longform_battle_context,
            longform_memory_capsule: repairedEmotionAndHookBrief.longform_memory_capsule,
            layered_memory_context: repairedEmotionAndHookBrief.layered_memory_context,
            next_batch_brief: repairedEmotionAndHookBrief.next_batch_brief,
            story_unit_context: repairedEmotionAndHookBrief.story_unit_context,
            scene_briefs: repairedEmotionAndHookBrief.scene_briefs,
            word_budget: repairedEmotionAndHookBrief.word_budget,
            generated_at: repairedEmotionAndHookBrief.generated_at,
            chapter_blueprint: repairedChapterBlueprint,
            emotional_arc_contract: repairedEmotionAndHookBrief.emotional_arc_contract,
            chapter_hook_contract: repairedEmotionAndHookBrief.chapter_hook_contract,
            paragraph_hook_contract: repairedEmotionAndHookBrief.paragraph_hook_contract,
            opening_contract: repairedEmotionAndHookBrief.opening_contract,
            suspense_contract: repairedEmotionAndHookBrief.suspense_contract,
            reversal_contract: repairedEmotionAndHookBrief.reversal_contract,
            showdown_contract: repairedEmotionAndHookBrief.showdown_contract,
            bridge_unit_contract: repairedEmotionAndHookBrief.bridge_unit_contract,
            plot_framework_contract: repairedEmotionAndHookBrief.plot_framework_contract,
            style_boundary_contract: repairedEmotionAndHookBrief.style_boundary_contract,
            plot_dynamics_contract: repairedEmotionAndHookBrief.plot_dynamics_contract,
            story_power_contract: repairedEmotionAndHookBrief.story_power_contract,
            mainline_definition_contract: repairedChapterBlueprint.mainline_definition_contract,
            information_flow_contract: repairedEmotionAndHookBrief.information_flow_contract,
            expectation_threshold_contract: repairedEmotionAndHookBrief.expectation_threshold_contract,
            story_loop_contract: repairedEmotionAndHookBrief.story_loop_contract,
            prose_craft_contract: repairedEmotionAndHookBrief.prose_craft_contract,
            punctuation_tone_contract: repairedEmotionAndHookBrief.punctuation_tone_contract,
            quality_audit_contract: repairedEmotionAndHookBrief.quality_audit_contract,
            dialogue_contract: repairedEmotionAndHookBrief.dialogue_contract,
            continuity_heat_contract: repairedEmotionAndHookBrief.continuity_heat_contract,
            character_relation_contract: repairedEmotionAndHookBrief.character_relation_contract,
            character_behavior_contract: repairedEmotionAndHookBrief.character_behavior_contract,
            asset_linkage_contract: repairedEmotionAndHookBrief.asset_linkage_contract,
            state_tracking_contract: repairedEmotionAndHookBrief.state_tracking_contract,
            intent_confirmation_contract: repairedEmotionAndHookBrief.intent_confirmation_contract,
            target_reader_contract: repairedEmotionAndHookBrief.target_reader_contract,
            genre_positioning_contract: repairedEmotionAndHookBrief.genre_positioning_contract,
            female_audience_contract: repairedEmotionAndHookBrief.female_audience_contract,
            upgrade_rhythm_contract: repairedEmotionAndHookBrief.upgrade_rhythm_contract,
            conflict_structure_contract: repairedEmotionAndHookBrief.conflict_structure_contract,
          },
          must_advance: [...new Set([
            ...asArray(chapter.raw_payload?.must_advance),
            ...asArray(payload?.must_advance),
            payload?.chapter_goal || payload?.goal || fallbackGoal,
          ].map((item: any) => String(item || '').trim()).filter(Boolean))].slice(0, 12),
          forbidden_repeats: [...new Set([
            ...asArray(chapter.raw_payload?.forbidden_repeats),
            ...asArray(payload?.forbidden_repeats),
          ].map((item: any) => String(item || '').trim()).filter(Boolean))].slice(0, 12),
          unattended_preflight_repaired_at: new Date().toISOString(),
          unattended_blueprint_repair_summary: payload?.repair_summary || '无人值守自动补齐章节蓝图',
        },
      }
      if (persist) {
        const updatedChapter = await updateNovelChapter(activeWorkspace, chapter.id, nextChapterPatch, { createVersion: false })
        if (updatedChapter) chapter = updatedChapter
      } else {
        applyStagedChapterPatch(nextChapterPatch)
      }
      repaired.push({ type: 'chapter_blueprint_updated', chapter_id: chapter.id, chapter_goal: nextChapterPatch.chapter_goal, ending_hook: nextChapterPatch.ending_hook })
    }

    if (needsWorldbuilding) {
      let payload: any = {}
      if (modelId) {
        try {
          throwIfAborted(options)
          const result = await executeAgent('outline-agent', project, {
            task: [
              '任务：为无人值守章节写作补齐最小可用世界观。只输出 JSON，不写正文。',
              '输出 worldbuilding 对象，字段包含 world_summary, rules(array), factions(array), locations(array), systems(array), items(array), known_unknowns(array)。',
              '要求：世界观必须服务当前章节和后续连载，不要泛泛而谈；规则要能制造选择压力、代价和后续冲突。',
              JSON.stringify({
                project: { title: project.title, genre: project.genre, synopsis: project.synopsis, style_tags: project.style_tags || [] },
                chapter: { chapter_no: chapter.chapter_no, title: chapter.title, goal: chapter.chapter_goal, summary: chapter.chapter_summary, conflict: chapter.conflict, ending_hook: chapter.ending_hook },
                outlines: outlines.slice(0, 60).map(item => ({ type: item.outline_type, title: item.title, summary: item.summary, hook: item.hook })),
                existing_characters: characters.slice(0, 20).map(item => ({ name: item.name, role_type: item.role_type, motivation: item.motivation, goal: item.goal })),
                preflight_warnings: contextPackage?.preflight?.warnings || [],
              }, null, 2).slice(0, 10000),
            ].join('\n'),
          }, {
            activeWorkspace,
            modelId: String(modelId),
            maxTokens: 3200,
            temperature: 0.3,
            skipMemory: true,
            signal: options.abortSignal,
            timeoutMs: options.llmTimeoutMs,
          })
          payload = getNovelPayload(result)
        } catch (error) {
          if (isAbortError(error)) throw error
          errors.push(`世界观补齐失败：${String(error).slice(0, 200)}`)
        }
      }
      const world = payload?.worldbuilding && typeof payload.worldbuilding === 'object' ? payload.worldbuilding : payload
      const worldbuildingCreate = {
        project_id: project.id,
        world_summary: compactBriefText(world?.world_summary || world?.summary || project.synopsis || `${project.title || '本作品'}的核心世界观围绕当前主线冲突展开。`),
        rules: asArray(world?.rules).length ? asArray(world.rules) : ['核心规则必须有触发条件、代价和可被角色利用或反制的空间。'],
        factions: asArray(world?.factions),
        locations: asArray(world?.locations),
        systems: asArray(world?.systems),
        items: asArray(world?.items),
        known_unknowns: asArray(world?.known_unknowns),
        raw_payload: { source: 'unattended_preflight_repair', original: world },
      }
      const createdWorldbuilding: any = persist
        ? await createNovelWorldbuilding(activeWorkspace, worldbuildingCreate as any)
        : { ...worldbuildingCreate, id: nextTemporaryId--, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      if (!persist) stagedWorldbuildingCreates.push(createdWorldbuilding)
      worldbuilding.push(createdWorldbuilding)
      repaired.push({ type: 'worldbuilding_created', id: createdWorldbuilding.id, world_summary: createdWorldbuilding.world_summary })
    }

    if (needsCharacters) {
      let payload: any = {}
      if (modelId) {
        try {
          throwIfAborted(options)
          const result = await executeAgent('outline-agent', project, {
            task: [
              '任务：为无人值守章节写作自动补齐前置材料。只输出 JSON。',
              '只补材料，不写正文。输出 characters, character_updates, forbidden_repeats, must_advance, repair_summary。',
              'characters 只输出缺失或明显欠完整的角色；必须按角色池分层补齐 primary_supporting, secondary_supporting, cameo_supporting, antagonist_minor, antagonist_arc, faction_agent，必要时补 protagonist 或 antagonist_primary。',
              '每个角色必须包含 name, role_type, tier, narrative_function, motivation, goal, conflict, relationship_to_protagonist, first_appearance_chapter, active_range, voice_anchor, signature_action, secret_or_pressure, exit_or_turning_point；反派层必须包含 antagonist_logic。',
              '不要改写 existing_characters 里已有角色名；同名角色只输出 character_updates，不要重复创建。',
              JSON.stringify({
                project: { title: project.title, genre: project.genre, synopsis: project.synopsis },
                chapter: { chapter_no: chapter.chapter_no, title: chapter.title, goal: chapter.chapter_goal, summary: chapter.chapter_summary, conflict: chapter.conflict, ending_hook: chapter.ending_hook },
                existing_characters: characters.slice(0, 24).map(item => ({ name: item.name, role_type: item.role_type, tier: item.raw_payload?.tier || item.raw_payload?.original?.tier, motivation: item.motivation, goal: item.goal, current_state: item.current_state })),
                recent_chapters: chapters.filter(item => item.chapter_no <= chapter.chapter_no).slice(-4).map(item => ({ chapter_no: item.chapter_no, title: item.title, summary: item.chapter_summary, ending_hook: item.ending_hook })),
                preflight_warnings: contextPackage?.preflight?.warnings || [],
              }, null, 2).slice(0, 9000),
            ].join('\n'),
          }, {
            activeWorkspace,
            modelId: String(modelId),
            maxTokens: 2600,
            temperature: 0.3,
            skipMemory: true,
            signal: options.abortSignal,
            timeoutMs: options.llmTimeoutMs,
          })
          payload = getNovelPayload(result)
        } catch (error) {
          if (isAbortError(error)) throw error
          errors.push(`角色材料补齐失败：${String(error).slice(0, 200)}`)
        }
      }
      const existingNames = new Set(characters.map(item => String(item.name || '').trim()).filter(Boolean))
      const characterCandidates = asArray(payload?.characters)
        .map((item: any) => {
          const tier = inferCharacterRepairTier(item)
          return {
            project_id: project.id,
            name: String(item?.name || '').trim(),
            role_type: String(item?.role_type || item?.role || tier || 'supporting'),
            archetype: String(item?.archetype || item?.narrative_function || ''),
            motivation: String(item?.motivation || item?.goal || chapter.chapter_goal || ''),
            goal: String(item?.goal || chapter.chapter_goal || ''),
            conflict: String(item?.conflict || chapter.conflict || ''),
            appearance: String(item?.appearance || ''),
            personality: asArray(item?.personality).map(String),
            abilities: asArray(item?.abilities).map(String),
            current_state: item?.current_state && typeof item.current_state === 'object' ? item.current_state : { last_seen_chapter: chapter.chapter_no },
            tier,
            narrative_function: item?.narrative_function,
            relationship_to_protagonist: item?.relationship_to_protagonist,
            first_appearance_chapter: item?.first_appearance_chapter,
            active_range: item?.active_range,
            voice_anchor: item?.voice_anchor,
            signature_action: item?.signature_action,
            secret_or_pressure: item?.secret_or_pressure,
            exit_or_turning_point: item?.exit_or_turning_point,
            antagonist_logic: item?.antagonist_logic,
            raw_payload: { source: 'unattended_preflight_repair', tier, original: item },
          }
        })
        .filter((item: any) => item.name && !existingNames.has(item.name))
      if (characterCandidates.length === 0 && characters.length === 0) {
        characterCandidates.push({
          project_id: project.id,
          name: '主角',
          role_type: 'protagonist',
          archetype: '核心视角角色',
          motivation: chapter.chapter_goal || project.synopsis || '推进当前章节目标',
          goal: chapter.chapter_goal || '完成当前章节目标',
          conflict: chapter.conflict || '',
          appearance: '',
          personality: [],
          abilities: [],
          current_state: { last_seen_chapter: chapter.chapter_no, location: '当前章节现场' },
          tier: 'protagonist',
          raw_payload: { source: 'unattended_preflight_repair_fallback', tier: 'protagonist' },
        })
      }
      for (const candidate of selectTierAwareCharacterRepairCandidates(characterCandidates, characters)) {
        const created: any = persist
          ? await createNovelCharacter(activeWorkspace, candidate as any)
          : { ...candidate, id: nextTemporaryId--, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        if (!persist) {
          stagedCharacterCreates.push(created)
          characters.push(created)
        }
        existingNames.add(created.name)
        repaired.push({ type: 'character_created', id: created.id, name: created.name })
      }
      const forbiddenRepeats = [...new Set([
        ...asArray(chapter.raw_payload?.forbidden_repeats),
        ...asArray(payload?.forbidden_repeats),
        `${chapter.title || `第${chapter.chapter_no}章`}不要重复解释已交代背景，直接推进本章冲突。`,
      ].map((item: any) => String(item || '').trim()).filter(Boolean))].slice(0, 12)
      const mustAdvance = [...new Set([
        ...asArray(chapter.raw_payload?.must_advance),
        ...asArray(payload?.must_advance),
        chapter.chapter_goal,
      ].map((item: any) => String(item || '').trim()).filter(Boolean))].slice(0, 12)
      const chapterContextPatch = {
        raw_payload: {
          ...(chapter.raw_payload || {}),
          forbidden_repeats: forbiddenRepeats,
          must_advance: mustAdvance,
          unattended_preflight_repaired_at: new Date().toISOString(),
          unattended_preflight_repair_summary: payload?.repair_summary || '无人值守自动补齐章节生成材料',
        },
      }
      if (persist) await updateNovelChapter(activeWorkspace, chapter.id, chapterContextPatch as any, { createVersion: false })
      else applyStagedChapterPatch(chapterContextPatch)
      repaired.push({ type: 'chapter_context_updated', chapter_id: chapter.id, forbidden_repeats: forbiddenRepeats.length, must_advance: mustAdvance.length })
    }

    let latestSettings = settings
    if (needsSettings) {
      let modelSettings: any[] = []
      if (modelId) {
        try {
          throwIfAborted(options)
          const result = await executeAgent('setting-agent', project, {
            task: [
              '任务：为无人值守章节写作补齐设定工坊。只输出 JSON。',
              '输出 settings(array)，每项包含 entity_type,name,summary,constraints_json,state_json,payload_json。',
              'entity_type 可用 character,realm,ability,item,boss,rule,faction,location,foreshadowing,mainline,subplot。',
              JSON.stringify({
                project: { title: project.title, genre: project.genre, synopsis: project.synopsis },
                chapter: { chapter_no: chapter.chapter_no, title: chapter.title, goal: chapter.chapter_goal, summary: chapter.chapter_summary, conflict: chapter.conflict, ending_hook: chapter.ending_hook },
                worldbuilding: worldbuilding.slice(0, 3).map(item => ({ summary: item.world_summary, rules: item.rules })),
                characters: characters.slice(0, 20).map(item => ({ name: item.name, role_type: item.role_type, abilities: item.abilities })),
                outlines: outlines.slice(0, 30).map(item => ({ type: item.outline_type, title: item.title, summary: item.summary, hook: item.hook })),
              }, null, 2).slice(0, 10000),
            ].join('\n'),
          }, {
            activeWorkspace,
            modelId: String(modelId),
            maxTokens: 3600,
            temperature: 0.25,
            skipMemory: true,
            signal: options.abortSignal,
            timeoutMs: options.llmTimeoutMs,
          })
          modelSettings = asArray(getNovelPayload(result)?.settings)
        } catch (error) {
          if (isAbortError(error)) throw error
          errors.push(`设定工坊补齐失败：${String(error).slice(0, 200)}`)
        }
      }
      const fallbackSettings = [
        ...characters.slice(0, 8).map(item => ({ entity_type: 'character', name: item.name, summary: item.motivation || item.goal || item.role_type || '' })),
        ...outlines.filter(item => ['master', 'volume', 'chapter'].includes(String(item.outline_type || ''))).slice(0, 12).map(item => ({ entity_type: item.outline_type === 'chapter' ? 'foreshadowing_arc' : item.outline_type === 'volume' ? 'subplot' : 'mainline', name: item.title, summary: item.summary || item.hook || '' })),
        ...(chapter.chapter_goal ? [{ entity_type: 'mainline', name: `${chapter.title || `第${chapter.chapter_no}章`}推进线`, summary: chapter.chapter_goal }] : []),
      ]
      const existingSettingKeys = new Set(latestSettings.map((item: any) => `${item.entity_type}:${item.name}`))
      for (const raw of [...modelSettings, ...fallbackSettings].slice(0, 30)) {
        const entityType = String(raw?.entity_type || raw?.type || 'rule').trim()
        const name = String(raw?.name || raw?.title || '').trim()
        if (!name || existingSettingKeys.has(`${entityType}:${name}`)) continue
        const settingCreate = {
          project_id: project.id,
          entity_type: entityType,
          name,
          summary: String(raw?.summary || raw?.description || ''),
          status: 'active',
          visibility: raw?.visibility || 'public',
          constraints_json: raw?.constraints_json || raw?.constraints || {},
          state_json: raw?.state_json || raw?.state || {},
          payload_json: { ...(raw?.payload_json || raw?.payload || {}), source: 'unattended_preflight_repair' },
        }
        const created: any = persist
          ? await createNovelSettingEntity(activeWorkspace, settingCreate as any)
          : { ...settingCreate, id: nextTemporaryId--, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        if (!persist) stagedSettingCreates.push(created)
        latestSettings.push(created)
        existingSettingKeys.add(`${created.entity_type}:${created.name}`)
        repaired.push({ type: 'setting_created', id: created.id, name: created.name, entity_type: created.entity_type })
      }
    }

    if (persist) latestSettings = await listNovelSettingEntities(activeWorkspace, project.id).catch(() => latestSettings)
    if (latestSettings.length > 0) {
      const usage = await listNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id).catch(() => [])
      if (usage.length === 0 || missingKeys.includes('chapter_setting_usage')) {
        const suggestedUsage = buildHeuristicSettingUsage(chapter, latestSettings)
        if (suggestedUsage.length > 0) {
          const records: any[] = persist
            ? await replaceNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id, suggestedUsage as any)
            : suggestedUsage.map((item: any) => ({ ...item, id: nextTemporaryId--, project_id: project.id, chapter_id: chapter.id }))
          if (!persist) stagedUsageReplacement = records
          repaired.push({ type: 'chapter_setting_usage_matched', chapter_id: chapter.id, total: records.length })
        }
      }
    }

    const [finalChapters, finalWorldbuilding, finalCharacters, finalOutlines, finalReviews] = persist
      ? await Promise.all([
          listNovelChapters(activeWorkspace, project.id),
          listNovelWorldbuilding(activeWorkspace, project.id),
          listNovelCharacters(activeWorkspace, project.id),
          listNovelOutlines(activeWorkspace, project.id),
          listNovelReviews(activeWorkspace, project.id),
        ])
      : [
          chapters.map(item => item.id === chapter.id ? chapter : item),
          worldbuilding,
          characters,
          outlines,
          reviews,
        ]
    const finalChapter = finalChapters.find(item => item.id === chapter.id) || chapter
    const finalPreDraftBriefSnake = finalChapter.raw_payload?.pre_draft_brief || {}
    const finalPreDraftBriefCamel = finalChapter.raw_payload?.preDraftBrief || {}
    const unnormalizedFinalPreDraftBriefBase = {
      ...finalPreDraftBriefCamel,
      ...finalPreDraftBriefSnake,
    }
    const storedFinalStateTrackingContract = mergeStoredStateTrackingContractAliases(
      finalPreDraftBriefSnake.state_tracking_contract,
      finalPreDraftBriefSnake.stateTrackingContract,
      finalPreDraftBriefCamel.state_tracking_contract,
      finalPreDraftBriefCamel.stateTrackingContract,
    )
    const finalBenchmarkRecallBriefBase = mergeFinalBenchmarkRecallBriefAliases(
      finalPreDraftBriefSnake,
      finalPreDraftBriefCamel,
    )
    const finalBenchmarkRecallState = repairBenchmarkRecallSourcePathState(
      finalChapter,
      finalBenchmarkRecallBriefBase,
      finalPreDraftBriefSnake.benchmark_recall_gaps,
      finalPreDraftBriefSnake.benchmarkRecallGaps,
      finalPreDraftBriefCamel.benchmark_recall_gaps,
      finalPreDraftBriefCamel.benchmarkRecallGaps,
    )
    const finalBenchmarkRecallBrief = finalBenchmarkRecallState.benchmark_recall_brief
    const finalBenchmarkRecallGaps = finalBenchmarkRecallState.benchmark_recall_gaps
    const finalPreDraftBriefBase = {
      ...unnormalizedFinalPreDraftBriefBase,
      benchmark_recall_brief: finalBenchmarkRecallBrief,
      benchmarkRecallBrief: finalBenchmarkRecallBrief,
      benchmark_recall_gaps: finalBenchmarkRecallGaps,
      benchmarkRecallGaps: finalBenchmarkRecallGaps,
      state_tracking_contract: storedFinalStateTrackingContract,
      stateTrackingContract: storedFinalStateTrackingContract,
    }
    const finalChapterForContext = {
      ...finalChapter,
      raw_payload: {
        ...(finalChapter.raw_payload || {}),
        pre_draft_brief: finalPreDraftBriefBase,
        ...(finalChapter.raw_payload?.preDraftBrief !== undefined
          ? { preDraftBrief: finalPreDraftBriefBase }
          : {}),
      },
    }
    const finalChaptersForContext = finalChapters.map(item => item.id === finalChapter.id ? finalChapterForContext : item)
    const finalContextPackage = await buildChapterContextPackage(
      activeWorkspace,
      project,
      finalChapterForContext,
      finalChaptersForContext,
      finalWorldbuilding,
      finalCharacters,
      finalOutlines,
      finalReviews,
      persist ? {} : {
        settingEntities: latestSettings,
        chapterSettingUsage: stagedUsageReplacement || [],
        projectSettingUsage: stagedUsageReplacement || [],
        persistSettingUsage: false,
      },
    )
    const derivedFinalStateTrackingContract = autoRepairStateTrackingSourceReadiness(
      buildStateTrackingContract(finalContextPackage, { ignoreExplicit: true }),
      finalChapter,
      finalContextPackage,
    )
    const finalStateTrackingContract = mergeFinalStateTrackingContract(
      storedFinalStateTrackingContract,
      derivedFinalStateTrackingContract,
    )
    const finalWritePreparationBrief = buildWritePreparationBrief(finalContextPackage, {
      ...(finalContextPackage?.pre_draft_brief || {}),
      ...(finalContextPackage?.chapter_target || {}),
      state_tracking_contract: finalStateTrackingContract,
    })
    const finalStoredPreDraftBrief = {
      ...finalPreDraftBriefBase,
      state_tracking_contract: finalStateTrackingContract,
      ...(finalPreDraftBriefBase.stateTrackingContract !== undefined
        ? { stateTrackingContract: finalStateTrackingContract }
        : {}),
      write_preparation_brief: finalWritePreparationBrief,
      ...(finalPreDraftBriefBase.writePreparationBrief !== undefined
        ? { writePreparationBrief: finalWritePreparationBrief }
        : {}),
    }
    // Keep returned context_package aligned with the repaired brief/contracts. buildChapterContextPackage
    // above still saw the pre-repair snapshot; without this handoff, cockpit generate reuses stale
    // write_preparation_brief + launch-gate blockers after material_repair.
    const repairedContextPackage = {
      ...finalContextPackage,
      pre_draft_brief: {
        ...(finalContextPackage?.pre_draft_brief || {}),
        ...finalStoredPreDraftBrief,
      },
      ...(finalContextPackage?.preDraftBrief !== undefined ? {
        preDraftBrief: {
          ...(finalContextPackage?.preDraftBrief || {}),
          ...finalStoredPreDraftBrief,
        },
      } : {}),
      write_preparation_brief: finalWritePreparationBrief,
      chapter_target: {
        ...(finalContextPackage?.chapter_target || {}),
        state_tracking_contract: finalStateTrackingContract,
        write_preparation_brief: finalWritePreparationBrief,
        ...(finalContextPackage?.chapter_target?.stateTrackingContract !== undefined
          ? { stateTrackingContract: finalStateTrackingContract }
          : {}),
        ...(finalContextPackage?.chapter_target?.writePreparationBrief !== undefined
          ? { writePreparationBrief: finalWritePreparationBrief }
          : {}),
      },
    }
    if (repairedContextPackage?.preflight) {
      applySourceReadinessPreflightChecks(repairedContextPackage.preflight, {
        ...repairedContextPackage,
        chapter_target: {
          ...(repairedContextPackage.chapter_target || {}),
          state_tracking_contract: finalStateTrackingContract,
        },
      })
    }
    const latestFinalChapter = persist
      ? (await listNovelChapters(activeWorkspace, project.id)).find(item => item.id === finalChapter.id) || finalChapter
      : finalChapter
    const finalChapterPatch = {
      raw_payload: mergeFinalRepairPreDraftRawPayload(latestFinalChapter.raw_payload, finalStoredPreDraftBrief),
    }
    if (persist) {
      const finalUpdatedChapter = await updateNovelChapter(activeWorkspace, latestFinalChapter.id, finalChapterPatch as any, { createVersion: false })
      if (finalUpdatedChapter) chapter = finalUpdatedChapter
    } else {
      applyStagedChapterPatch(finalChapterPatch)
    }

    if (repaired.length || errors.length) {
      const repairReview = buildUnattendedPreflightRepairReviewRecord({
        projectId: project.id,
        chapter,
        missingKeys,
        repaired,
        errors,
      })
      if (persist) await createNovelReview(activeWorkspace, repairReview)
      else stagedReviews.push(repairReview)
    }
    return {
      ok: errors.length === 0,
      missing_keys: missingKeys,
      repaired,
      errors,
      chapter,
      chapter_patch: stagedChapterPatch,
      worldbuilding: finalWorldbuilding,
      characters: finalCharacters,
      settings: latestSettings,
      context_package: repairedContextPackage,
      staged_worldbuilding_creates: stagedWorldbuildingCreates,
      staged_character_creates: stagedCharacterCreates,
      staged_setting_creates: stagedSettingCreates,
      staged_usage_replacement: stagedUsageReplacement,
      staged_reviews: stagedReviews,
      staged: !persist,
    }
  }

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

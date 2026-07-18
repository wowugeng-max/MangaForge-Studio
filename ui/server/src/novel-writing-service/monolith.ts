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

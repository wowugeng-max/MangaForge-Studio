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

import { createGenerateChapterForGroupMethods } from './service/generate-chapter-for-group-methods'
export { createGenerateChapterForGroupMethods } from './service/generate-chapter-for-group-methods'

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

  const generateChapterForGroupMethods = createGenerateChapterForGroupMethods({
    executeAgent,
    getProject: ctx.getProject,
    runtime: ctx.runtime,
    getStageModelId: (project: any, stage: any, modelId?: any) => ctx.production.getStageModelId(project, stage, modelId),
    getStageTemperature: (project: any, stage: any, fallback?: any) => ctx.production.getStageTemperature(project, stage, fallback),
    getApprovalPolicy: (project: any) => ctx.production.getApprovalPolicy(project),
    approvalRequired: (...args: any[]) => ctx.production.approvalRequired(...args),
    buildAgentConfigSnapshot: (...args: any[]) => ctx.production.buildAgentConfigSnapshot(...args),
    buildApprovalError: (...args: any[]) => ctx.production.buildApprovalError(...args),
    buildMigrationAudit: (...args: any[]) => ctx.reference.buildMigrationAudit(...args),
    buildReferenceUsageReport: (...args: any[]) => ctx.reference.buildReferenceUsageReport(...args),
    explainReferenceSafety: (...args: any[]) => ctx.reference.explainReferenceSafety(...args),
    getReferenceMigrationPlanForChapter: (...args: any[]) => ctx.reference.getReferenceMigrationPlanForChapter(...args),
    getReferenceSafetyDecision: (...args: any[]) => ctx.reference.getReferenceSafetyDecision(...args),
    generateNovelChapterProse,
    storeChapterProseMemory,
    mergeChapterRawPayload,
    buildChapterContextPackage,
    autoRepairChapterPreflightGaps,
    generateSceneCardsForChapter,
    ensureProseMeetsWordTarget,
    runCommercialEditorRewrite,
    runMemePolish,
    runReadabilityReview,
    prepareStoryStateUpdate,
    trustedWordTargetContractionBudgets,
  })
  const generateChapterForGroup = generateChapterForGroupMethods.generateChapterForGroup

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

import {
  scanAuthorialForecastRisks,
} from '../../novel-writing/authorial-forecast'
import {
  buildChapterHandoffDeterministicCheck,
} from '../../novel-writing/chapter-handoff-basics'
import {
  buildChapterHookDeterministicCheck,
} from '../../novel-writing/chapter-hook-basics'
import {
  buildCharacterBehaviorDeterministicCheck,
} from '../../novel-writing/character-behavior-basics'
import {
  buildCharacterRelationDeterministicCheck,
} from '../../novel-writing/character-relation-basics'
import {
  buildConflictStructureDeterministicCheck,
} from '../../novel-writing/conflict-structure-basics'
import {
  buildContinuityHeatDeterministicCheck,
} from '../../novel-writing/continuity-heat-basics'
import {
  scanBannedWordLeaks,
  scanContextSensitiveWordDensityRisks,
  scanWeakAdverbDensityRisks,
} from '../../novel-writing/deslop-scans'
import {
  buildDeslopGateDiagnostics,
} from '../../novel-writing/deterministic-prose-cleanup'
import {
  scanDialogueBreathRisks,
  scanDialoguePowerBalanceRisks,
  scanDialogueVoiceSamenessRisks,
} from '../../novel-writing/dialogue-balance'
import {
  scanDialogueDensityRisks,
  scanDialogueProtagonistLineEconomyRisks,
  scanDialogueQuestionAnswerLoopRisks,
} from '../../novel-writing/dialogue-economy'
import {
  scanDialogueEasyPersuasionRisks,
  scanDialogueEmotionContinuityRisks,
} from '../../novel-writing/dialogue-emotion'
import {
  scanDialogueFormatRisks,
  scanDialogueQuoteStyleRisks,
} from '../../novel-writing/dialogue-format'
import {
  scanDialogueInfodumpRisks,
} from '../../novel-writing/dialogue-infodump'
import {
  scanDialogueEmptyPraiseRisks,
  scanDialogueJudgmentQuestionRisks,
  scanDialogueSubtextAgendaRisks,
} from '../../novel-writing/dialogue-intent'
import {
  scanDialogueToneRisks,
} from '../../novel-writing/dialogue-tone'
import {
  buildEmotionalArcDeterministicCheck,
} from '../../novel-writing/emotional-arc-execution-basics'
import {
  scanDownwardSafetyRisks,
  scanOppressionPurposeRisks,
  scanPayoffDensityRisks,
  scanPayoffEscalationRisks,
  scanTrumpCardEffectRisks,
} from '../../novel-writing/emotional-payoff-scans'
import {
  scanEndingSummaryRisks,
} from '../../novel-writing/ending-summary'
import {
  scanAntagonistDownfallAgencyRisks,
  scanEvidenceChainDumpRisks,
  scanEvidenceTimeBombRisks,
  scanFaceSlapRhythmRisks,
  scanFinalEvidenceImpactRisks,
  scanProtagonistComposureRisks,
} from '../../novel-writing/face-slap-scans'
import {
  buildFemaleAudienceDeterministicCheck,
} from '../../novel-writing/female-audience-basics'
import {
  buildGenrePositioningDeterministicCheck,
} from '../../novel-writing/genre-positioning-basics'
import {
  scanEndingHookRisks,
  scanEntryPromiseAlignmentRisks,
  scanOpeningConflictAlignmentRisks,
  scanOpeningHookEchoRisks,
  scanParagraphHookStallRisks,
  scanSuddenEndingClueRisks,
} from '../../novel-writing/hook-alignment-scans'
import {
  buildIntentConfirmationDeterministicCheck,
} from '../../novel-writing/intent-confirmation-basics'
import {
  scanOpeningEventDensityRisks,
  scanOpeningFirst50ConflictRisks,
  scanOpeningHookRisks,
  scanOpeningProtagonistDelayRisks,
} from '../../novel-writing/opening-scans'
import {
  buildParagraphHookDeterministicCheck,
} from '../../novel-writing/paragraph-hook-basics'
import {
  buildPlotDynamicsDeterministicCheck,
} from '../../novel-writing/plot-dynamics-basics'
import {
  scanExpectationVacuumRisks,
  scanNarrativeTransitionRisks,
  scanParagraphProgressionRisks,
  scanRelationshipSceneChangeRisks,
} from '../../novel-writing/progression-scans'
import {
  scanEmotionalStasisRisks,
  scanEmotionTellingRisks,
  scanInfodumpRisks,
  scanInternalMonologueRisks,
  scanParagraphCommaChainDensityRisks,
  scanParagraphFragmentationRisks,
  scanParagraphLengthUniformityRisks,
  scanProseCameraAnchorRisks,
  scanProseDecorativeDetailRisks,
  scanProseMotionStillRisks,
  scanProseOmniscientCrowdCameraRisks,
  scanProseStackedDescriptionRisks,
  scanProseStaticEnvironmentRisks,
  scanRecapFillerRisks,
  scanSpecificCharacterCountExpressionRisks,
  scanVagueQuantityWeightRisks,
} from '../../novel-writing/prose-craft-scans'
import {
  scanPeriodMonotonyRisks,
  scanProseFormatRisks,
  scanProseLanguageRisks,
  scanPunctuationToneRisks,
} from '../../novel-writing/prose-format'
import {
  scanModelDegenerationRisks,
  scanProseMetaLeaks,
} from '../../novel-writing/prose-meta'
import {
  buildProsePromptContextSnapshot,
  prosePromptJson,
} from '../../novel-writing/prose-prompt-context'
import {
  scanPayoffSetupRisks,
  scanShockLayeringRisks,
} from '../../novel-writing/public-payoff-scans'
import {
  scanRepeatedReactionRisks,
  scanRepeatedSubjectRisks,
  scanTripleParallelRisks,
  scanUniformRhythmRisks,
} from '../../novel-writing/rhythm-scans'
import {
  scanCombatProcessRisks,
  scanSceneDensityExecutionRisks,
  scanSceneGoalObstacleChangeRisks,
  scanScenePurposeWeightRisks,
} from '../../novel-writing/scene-action-scans'
import {
  buildSceneCardConsumptionChecks,
  scanSceneCardReceiptRisks,
  scanSceneSensoryAnchorRisks,
  scanSceneSerialRiskRepairRisks,
} from '../../novel-writing/scene-card-execution-scans'
import {
  buildStateTrackingDeterministicCheck,
} from '../../novel-writing/state-tracking-basics'
import {
  scanObscureSuspenseRisks,
  scanSuspenseFalseAlarmRisks,
  scanSuspenseWithheldInfoRisks,
} from '../../novel-writing/suspense-scans'
import {
  buildUpgradeRhythmDeterministicCheck,
  scanUpgradeAftermathRisks,
} from '../../novel-writing/upgrade-rhythm-basics'
import {
  countProseChars,
  resolveChapterWordTarget,
} from '../../novel-writing/word-target'
import {
  asArray,
  buildLLMResultDiagnostics,
  extractPlainProseFallback,
  getNovelPayload,
  normalizeIssue,
} from '../../routes/novel-route-utils'
import {
  getContextContract,
} from '../context/context-contract'
import {
  buildCoreContractDeterministicCheck,
} from '../post-delivery/core-handoff-sync-reports'
import {
  deliveryRiskReceiptRemainingRisk,
  deliveryRiskReceiptRepairPositionRule,
  inferDeliveryRiskReceiptRepairSegment,
  normalizeDeliveryRiskReceipts,
} from '../post-delivery/delivery-risk-core'
import {
  buildRevisionScopeGuardSyncReport,
} from '../post-delivery/delta-sync-reports'
import {
  buildAssetLinkageDeterministicCheck,
  buildBridgeUnitDeterministicCheck,
  buildDialogueDeterministicCheck,
  buildProseCraftDeterministicCheck,
  buildPunctuationToneDeterministicCheck,
  buildQualityAuditDeterministicCheck,
  buildReversalDeterministicCheck,
  buildShowdownDeterministicCheck,
  buildSuspenseDeterministicCheck,
  buildTargetReaderDeterministicCheck,
  scanBenchmarkRecallExecutionRisks,
} from '../post-delivery/quality-sync-reports'
import {
  scanEconomicPowerScaleAnchorRisks,
  scanNewConceptOverloadRisks,
} from '../quality/audience-quality-contracts'
import {
  scanBeatSequenceExecutionRisks,
  scanChapterBlueprintCraftRisks,
  scanCharacterOrderExecutionRisks,
  scanCostRewardExecutionRisks,
  scanEndingContractExecutionRisks,
  scanGoldenThreeExecutionRisks,
  scanLocalVictoryCostRisks,
} from '../quality/chapter-blueprint-execution'
import {
  normalizeFiveDimensionQualityScores,
} from '../quality/five-dimension-scores'
import {
  appendMissingContractReviewCheck,
  appendMissingNextChapterQualityPlanReceiptCheck,
  appendMissingStatusFilterReceiptCheck,
} from '../quality/missing-review-checks'
import {
  platformCheckNeedsCarryOver,
  preDraftReceiptCheckNeedsCarryOver,
} from '../quality/platform-carry-over'
import {
  preDraftExecutionReceiptSections,
} from '../quality/pre-draft-receipt-sections'
import {
  buildFallbackNextChapterQualityPlan,
  normalizeNextChapterQualityPlanEndingContract,
  normalizePerspectiveVerdicts,
} from '../quality/prose-quality-risks'
import {
  mergeStructuredReviewFillPayload,
} from '../quality/review-fill'
import {
  hasReviewChecksNeedingRepair,
  missingStructuredReviewCheckFields,
} from '../quality/review-merge'
import {
  hasFailingReviewChecks,
} from '../quality/review-status'
import {
  revisionReceiptRemainingRisk,
} from '../quality/revision-receipt-risk'
import {
  buildSourceReadinessChecks,
} from '../quality/state-tracking-contracts'
import {
  compactBriefText,
} from '../quality/text-utils'
import {
  applyDeterministicWordCountIssueGuard,
} from '../quality/word-count-guard'
import {
  buildRevisionStrategyBrief,
} from '../revision/revision-strategy'
import {
  isAbortError,
  throwIfAborted,
} from './runtime-helpers'

import {
  buildProseReviewPrompt,
  buildProseRevisionPrompt,
} from './prose-self-review-prompts'
import {
  nextChapterQualityPlanNeedsRepair,
  shouldReviseProse,
} from './prose-self-review-policy'
import { createProseSelfReviewRunner } from './prose-self-review-run'

export function createProseSelfReviewMethods(deps: {
  executeAgent: (...args: any[]) => any
  getStageModelId: (...args: any[]) => any
  getStageTemperature: (...args: any[]) => any
  fillMissingStructuredReviewChecks: (...args: any[]) => any
}) {
  const executeAgent = deps.executeAgent
  const getStageModelId = deps.getStageModelId
  const getStageTemperature = deps.getStageTemperature
  const fillMissingStructuredReviewChecks = deps.fillMissingStructuredReviewChecks

  return {
    buildProseReviewPrompt,
    buildProseRevisionPrompt,
    nextChapterQualityPlanNeedsRepair,
    shouldReviseProse,
    runProseSelfReviewAndRevision: createProseSelfReviewRunner({
      executeAgent,
      getStageModelId,
      getStageTemperature,
      fillMissingStructuredReviewChecks,
    }),
  }
}


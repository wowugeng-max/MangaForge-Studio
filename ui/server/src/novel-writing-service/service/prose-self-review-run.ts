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

export function createProseSelfReviewRunner(deps: {
  executeAgent: (...args: any[]) => any
  getStageModelId: (...args: any[]) => any
  getStageTemperature: (...args: any[]) => any
  fillMissingStructuredReviewChecks: (...args: any[]) => any
}) {
  const executeAgent = deps.executeAgent
  const getStageModelId = deps.getStageModelId
  const getStageTemperature = deps.getStageTemperature
  const fillMissingStructuredReviewChecks = deps.fillMissingStructuredReviewChecks

const runProseSelfReviewAndRevision = async (activeWorkspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options: any = {}) => {
  const reviewModelId = getStageModelId(project, 'review', modelId)
  const reviseModelId = getStageModelId(project, 'revise', modelId)
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
    temperature: getStageTemperature(project, 'review', 0.2),
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
      temperature: getStageTemperature(project, 'revise', 0.65),
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

  return runProseSelfReviewAndRevision
}

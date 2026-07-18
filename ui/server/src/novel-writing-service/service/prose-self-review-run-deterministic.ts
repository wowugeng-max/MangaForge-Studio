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
  buildCoreContractDeterministicCheck,
} from '../post-delivery/core-handoff-sync-reports'
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

export function collectDeterministicProseSelfReviewChecks(
  project: any,
  contextPackage: any,
  chapterText: string,
) {
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

  return {
    deterministicModelDegenerationChecks,
    deterministicProseMetaChecks,
    deterministicProseLanguageChecks,
    deterministicProseFormatChecks,
    deterministicBannedWordChecks,
    deterministicWeakAdverbDensityChecks,
    deterministicContextSensitiveWordDensityChecks,
    deterministicAuthorialForecastChecks,
    deterministicRepeatedSubjectChecks,
    deterministicTripleParallelChecks,
    deterministicRepeatedReactionChecks,
    deterministicUniformRhythmChecks,
    deterministicDialogueToneChecks,
    deterministicEndingSummaryChecks,
    deterministicOpeningHookChecks,
    deterministicOpeningFirst50Checks,
    deterministicOpeningEventDensityChecks,
    deterministicOpeningProtagonistDelayChecks,
    deterministicEntryPromiseChecks,
    deterministicOpeningConflictChecks,
    deterministicEndingHookChecks,
    deterministicSuddenEndingClueChecks,
    deterministicEndingContractChecks,
    deterministicOpeningHookEchoChecks,
    deterministicOpeningHookHardChecks,
    deterministicEndingHookHardChecks,
    deterministicOpeningHookEchoHardChecks,
    deterministicSceneCardChecks,
    deterministicSceneCardReceiptChecks,
    deterministicSceneDensityChecks,
    deterministicScenePurposeWeightChecks,
    deterministicSceneSensoryChecks,
    deterministicSceneSerialRiskRepairChecks,
    deterministicParagraphHookStallChecks,
    deterministicShockLayeringChecks,
    deterministicParagraphHookHardChecks,
    deterministicPayoffSetupChecks,
    deterministicFaceSlapRhythmChecks,
    deterministicEvidenceChainDumpChecks,
    deterministicFinalEvidenceImpactChecks,
    deterministicEvidenceTimeBombChecks,
    deterministicAntagonistDownfallAgencyChecks,
    deterministicReversalHardChecks,
    deterministicSuspenseFalseAlarmChecks,
    deterministicSuspenseWithheldInfoChecks,
    deterministicObscureSuspenseChecks,
    deterministicSuspenseHardChecks,
    deterministicExpectationVacuumChecks,
    deterministicParagraphProgressionChecks,
    deterministicSceneGoalObstacleChangeChecks,
    deterministicCombatProcessChecks,
    deterministicParagraphFragmentationChecks,
    deterministicParagraphLengthUniformityChecks,
    deterministicParagraphCommaChainDensityChecks,
    deterministicNarrativeTransitionChecks,
    deterministicProseMotionStillChecks,
    deterministicProseStackedDescriptionChecks,
    deterministicProseStaticEnvironmentChecks,
    deterministicProseDecorativeDetailChecks,
    deterministicVagueQuantityWeightChecks,
    deterministicSpecificCharacterCountChecks,
    deterministicProseCameraAnchorChecks,
    deterministicProseOmniscientCrowdCameraChecks,
    deterministicInfodumpChecks,
    deterministicRecapFillerChecks,
    deterministicNewConceptChecks,
    deterministicScaleAnchorChecks,
    deterministicEmotionTellingChecks,
    deterministicEmotionalStasisChecks,
    deterministicDownwardSafetyChecks,
    deterministicOppressionPurposeChecks,
    deterministicPayoffDensityChecks,
    deterministicPayoffEscalationChecks,
    deterministicTrumpCardEffectChecks,
    deterministicEmotionalArcChecks,
    deterministicUpgradeAftermathChecks,
    deterministicUpgradeRhythmChecks,
    deterministicInternalMonologueChecks,
    deterministicDialogueFormatChecks,
    deterministicDialogueQuoteStyleChecks,
    deterministicDialoguePowerBalanceChecks,
    deterministicDialogueProtagonistLineEconomyChecks,
    deterministicDialogueQuestionAnswerLoopChecks,
    deterministicDialogueJudgmentQuestionChecks,
    deterministicDialogueSubtextAgendaChecks,
    deterministicDialogueEmptyPraiseChecks,
    deterministicDialogueEmotionContinuityChecks,
    deterministicDialogueEasyPersuasionChecks,
    deterministicDialogueVoiceSamenessChecks,
    deterministicDialogueBreathChecks,
    deterministicDialogueDensityChecks,
    deterministicDialogueInfodumpChecks,
    deterministicDialogueHardChecks,
    deterministicProtagonistComposureChecks,
    deterministicCharacterBehaviorChecks,
    deterministicRelationshipSceneChangeChecks,
    deterministicContinuityHeatChecks,
    deterministicCharacterRelationChecks,
    deterministicAssetLinkageChecks,
    deterministicStateTrackingChecks,
    deterministicChapterHandoffChecks,
    deterministicPunctuationToneChecks,
    deterministicPeriodMonotonyChecks,
    deterministicBlueprintCraftChecks,
    deterministicCharacterOrderChecks,
    deterministicBeatSequenceChecks,
    deterministicCostRewardChecks,
    deterministicIntentConfirmationChecks,
    deterministicLocalVictoryCostChecks,
    deterministicShowdownHardChecks,
    deterministicBridgeUnitChecks,
    deterministicPlotDynamicsChecks,
    deterministicBenchmarkRecallChecks,
    deterministicGoldenThreeChecks,
    deterministicTargetReaderChecks,
    deterministicGenrePositioningChecks,
    deterministicCoreContractChecks,
    deterministicFemaleAudienceChecks,
    deterministicConflictStructureChecks,
    deterministicProseCraftHardChecks,
    deterministicPunctuationToneHardChecks,
    deterministicQualityAuditHardChecks,
  }
}

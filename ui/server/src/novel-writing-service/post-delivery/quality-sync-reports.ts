type AnyFn = (...args: any[]) => any
let buildChapterBenchmarkStrategy: AnyFn = (_project: any = {}, _contextPackage: any = {}) => ({ samples: [] })
let buildStyleSampleStrategy: AnyFn = (_project: any = {}, _contextPackage: any = {}) => ({ samples: [] })
let styleBoundaryExplicitContract: AnyFn = (_contextPackage: any = {}, _chapter: any = {}) => null

export function bindQualitySyncReportDeps(deps: {
  buildChapterBenchmarkStrategy?: AnyFn
  buildStyleSampleStrategy?: AnyFn
  styleBoundaryExplicitContract?: AnyFn
} = {}) {
  if (deps.buildChapterBenchmarkStrategy) buildChapterBenchmarkStrategy = deps.buildChapterBenchmarkStrategy
  if (deps.buildStyleSampleStrategy) buildStyleSampleStrategy = deps.buildStyleSampleStrategy
  if (deps.styleBoundaryExplicitContract) styleBoundaryExplicitContract = deps.styleBoundaryExplicitContract
}

import {
  assetLinkagePriority,
  normalizeAssetLinkageFunctionChainCheck,
  normalizeAssetLinkageInformationCheck,
  normalizeAssetLinkageStateChangeCheck,
} from '../../novel-writing/asset-linkage-basics'
import {
  BEAT_COOLING_LABELS,
  beatCoolingPriority,
  beatCoolingSequence,
} from '../../novel-writing/beat-cooling-basics'
import {
  bridgeUnitPriority,
  normalizeBridgeClimaxDurationCheck,
  normalizeBridgeExpectationChainCheck,
  normalizeBridgeFatigueRepairCheck,
  normalizeBridgePlanCheck,
  normalizeBridgePositionCheck,
  normalizeBridgeTargetProgressCheck,
  normalizeBridgeTransitionCheck,
} from '../../novel-writing/bridge-unit-basics'
import {
  chapterAttractionPriority,
  normalizeAttractionDimension,
} from '../../novel-writing/chapter-attraction-basics'
import {
  buildChapterHookDeterministicCheck,
  chapterHookPriority,
  normalizeChapterHookCheck,
} from '../../novel-writing/chapter-hook-basics'
import {
  characterArcPriority,
  normalizeCharacterArcDimension,
} from '../../novel-writing/character-arc-basics'
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
} from '../../novel-writing/character-behavior-basics'
import {
  buildConflictStructureDeterministicCheck,
  conflictStructurePriority,
  normalizeConflictAgencyCheck,
  normalizeConflictEventValueCheck,
  normalizeConflictLadderCheck,
  normalizeConflictMotivationCheck,
  normalizeConflictNetworkLayersCheck,
  normalizeConflictNextSeedCheck,
  normalizeConflictNoExitCheck,
  normalizeConflictPressureCheck,
  normalizeConflictWebCheck,
} from '../../novel-writing/conflict-structure-basics'
import {
  buildContinuityHeatDeterministicCheck,
  continuityHeatPriority,
  normalizeContinuityActiveExpectationCheck,
  normalizeContinuityDormantBoundaryCheck,
  normalizeContinuityHeatStateCheck,
  normalizeContinuityWatchItemsCheck,
} from '../../novel-writing/continuity-heat-basics'
import {
  scanDialogueBreathRisks,
  scanDialoguePowerBalanceRisks,
  scanDialogueVoiceSamenessRisks,
} from '../../novel-writing/dialogue-balance'
import {
  normalizeDialogueAuditCheck,
  normalizeDialogueDriveCheck,
  normalizeDialogueGoalCheck,
  normalizeDialogueInformationEmbedCheck,
  normalizeDialoguePowerCheck,
  normalizeDialogueSubtextCheck,
  normalizeDialogueVoiceCheck,
} from '../../novel-writing/dialogue-contract-basics'
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
import { scanDialogueFunctionalFillerRisks } from '../../novel-writing/dialogue-functional'
import {
  scanDialogueDetachedJokeRisks,
  scanDialogueFlatCallbackRisks,
  scanDialogueHighPressureMemeRisks,
  scanDialogueHollowHumorPayoffRisks,
} from '../../novel-writing/dialogue-humor'
import { scanDialogueInfodumpRisks } from '../../novel-writing/dialogue-infodump'
import {
  scanDialogueEmptyPraiseRisks,
  scanDialogueJudgmentQuestionRisks,
  scanDialogueSubtextAgendaRisks,
} from '../../novel-writing/dialogue-intent'
import { normalizeDialogueSupportingSpeakerLimitCheck } from '../../novel-writing/dialogue-supporting-speakers'
import { scanDialogueToneRisks } from '../../novel-writing/dialogue-tone'
import { normalizeEmotionalArcCheck } from '../../novel-writing/emotional-arc-basics'
import {
  buildEmotionalArcDeterministicCheck,
  emotionalArcPriority,
  normalizeEmotionModuleRecompositionRulesCheck,
  normalizeEmotionalSceneExecutionRulesCheck,
  normalizeEmotionalTurningRulesCheck,
  normalizeMemePlotFormulaRulesCheck,
  normalizePayoffDensityRulesCheck,
  normalizePayoffEscalationRulesCheck,
  normalizeProgressiveConfrontationRulesCheck,
  normalizeReaderDesireFormulaRulesCheck,
} from '../../novel-writing/emotional-arc-execution-basics'
import {
  scanDownwardSafetyRisks,
  scanOppressionPurposeRisks,
  scanPayoffDensityRisks,
  scanPayoffEscalationRisks,
  scanTrumpCardEffectRisks,
} from '../../novel-writing/emotional-payoff-scans'
import {
  buildExpectationBeforePayoffCheck,
  buildExpectationThresholdNextOpenLoopCheck,
  expectationThreeLinesArray,
  expectationThresholdArray,
  expectationThresholdPriority,
  normalizeExpectationThresholdCheck,
} from '../../novel-writing/expectation-threshold-basics'
import {
  scanAntagonistDownfallAgencyRisks,
  scanEvidenceChainDumpRisks,
  scanEvidenceTimeBombRisks,
  scanFaceSlapRhythmRisks,
  scanFinalEvidenceImpactRisks,
} from '../../novel-writing/face-slap-scans'
import {
  buildFemaleAudienceDeterministicCheck,
  femaleAudiencePriority,
  normalizeFemaleAbuseDosageCheck,
  normalizeFemaleCopyPromiseCheck,
  normalizeFemaleCorePrinciplesCheck,
  normalizeFemaleLongformGenreCheck,
  normalizeFemalePlatformFitCheck,
  normalizeFemaleQualityCheck,
  normalizeFemaleReaderNeedCheck,
  normalizeFemaleRomanceAxisCheck,
} from '../../novel-writing/female-audience-basics'
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
  buildInformationFlowInfodumpCheck,
  buildInformationFlowNextObjectiveCheck,
  buildInformationFlowTransitionCompressionCheck,
  informationFlowPriority,
  normalizeInformationFlowCheck,
} from '../../novel-writing/information-flow-basics'
import {
  innovationBeatMatch,
  normalizeInnovationBeat,
} from '../../novel-writing/innovation-basics'
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
} from '../../novel-writing/intent-confirmation-basics'
import {
  firstProseText,
  normalizeOpeningExpectationCheck,
  normalizeOpeningFiveEssentialsCheck,
  normalizeOpeningFoundationCheck,
  normalizeOpeningGoalAndHookCheck,
  normalizeOpeningInformationCheck,
  normalizeOpeningProtagonistCheck,
  openingPriority,
} from '../../novel-writing/opening-basics'
import {
  scanOpeningEventDensityRisks,
  scanOpeningFirst50ConflictRisks,
  scanOpeningHookRisks,
  scanOpeningProtagonistDelayRisks,
} from '../../novel-writing/opening-scans'
import {
  buildParagraphHookDeterministicCheck,
  normalizeParagraphHookCombinationCheck,
  normalizeParagraphHookListCheck,
  normalizeParagraphHookPresenceCheck,
  paragraphHookPriority,
} from '../../novel-writing/paragraph-hook-basics'
import {
  normalizePayoffReverseDesignCheck,
  normalizePayoffTierRulesCheck,
} from '../../novel-writing/payoff-design-basics'
import {
  buildPlotDynamicsDeterministicCheck,
  normalizeClimaxFormulaCheck,
  normalizeLineStaggerRulesCheck,
  normalizePlotAbOutlineCheck,
  normalizePlotDriveModeRulesCheck,
  normalizePlotLoopCheck,
  normalizePlotScenePurposeCheck,
  plotDynamicsPriority,
} from '../../novel-writing/plot-dynamics-basics'
import {
  scanExpectationVacuumRisks,
  scanMeaningInflationFillerRisks,
  scanNarrativeTransitionRisks,
  scanParagraphProgressionRisks,
} from '../../novel-writing/progression-scans'
import {
  scanEmotionTellingRisks,
  scanInfodumpRisks,
  scanInternalMonologueRisks,
  scanParagraphFragmentationRisks,
  scanParagraphLengthUniformityRisks,
  scanProseCameraAnchorRisks,
  scanProseDecorativeDetailRisks,
  scanProseMotionStillRisks,
  scanProseOmniscientCrowdCameraRisks,
  scanProseStackedDescriptionRisks,
  scanProseStaticEnvironmentRisks,
  scanRecapFillerRisks,
  scanVagueQuantityWeightRisks,
  scanEmotionalStasisRisks,
} from '../../novel-writing/prose-craft-scans'
import {
  scanPeriodMonotonyRisks,
  scanProseFormatRisks,
  scanPunctuationToneRisks,
} from '../../novel-writing/prose-format'
import {
  scanPayoffSetupRisks,
  scanShockLayeringRisks,
  scanSpectatorReactionDifferentiationRisks,
} from '../../novel-writing/public-payoff-scans'
import {
  normalizeHookAddictionModelCheck,
  normalizeRetentionBeat,
  normalizeRetentionDoubleEngineCheck,
  normalizeRetentionPillarsCheck,
  retentionBeatMatch,
} from '../../novel-writing/reader-retention-basics'
import {
  normalizeReversalFaceSlapCheck,
  normalizeReversalImpactCheck,
  normalizeReversalMisdirectionCheck,
  normalizeReversalSetupCheck,
  normalizeReversalTimingCheck,
  normalizeReversalTypeCheck,
  reversalPriority,
} from '../../novel-writing/reversal-basics'
import {
  scanCombatProcessRisks,
  scanSceneDensityExecutionRisks,
  scanSceneGoalObstacleChangeRisks,
} from '../../novel-writing/scene-action-scans'
import { scanSceneSensoryAnchorRisks } from '../../novel-writing/scene-card-execution-scans'
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
} from '../../novel-writing/showdown-basics'
import {
  normalizeSignatureSceneBrief,
  normalizeSignatureSceneSyncBeat,
  signatureSceneSyncBeatMatch,
} from '../../novel-writing/signature-scene-basics'
import {
  buildStateTrackingDeterministicCheck,
  normalizeStateTrackingCharacterCheck,
  normalizeStateTrackingFilterRuleCheck,
  normalizeStateTrackingHistoricalCheck,
  normalizeStateTrackingSourceReadinessCheck,
  normalizeStateTrackingWorldConstraintCheck,
  stateTrackingPriority,
} from '../../novel-writing/state-tracking-basics'
import {
  firstCompactText,
  firstSceneCardText,
  normalizeStoryDriveDimension,
  storyDrivePriority,
} from '../../novel-writing/story-drive-basics'
import {
  normalizeStoryLoopBeat,
  normalizeStoryLoopMapTransitionCheck,
  normalizeStoryLoopNestedLoopCheck,
  storyLoopPriority,
} from '../../novel-writing/story-loop-basics'
import {
  normalizeStoryPowerCheck,
  storyPowerPriority,
} from '../../novel-writing/story-power-basics'
import {
  normalizeStoryUnitSyncBeat,
  storyUnitForbiddenTouched,
  storyUnitSyncBeatMatch,
} from '../../novel-writing/story-unit-basics'
import { styleFingerprintSentenceBeat } from '../../novel-writing/style-fingerprint'
import {
  normalizeSuspenseListCheck,
  normalizeSuspenseStrengthCheck,
  suspenseArray,
  suspensePriority,
} from '../../novel-writing/suspense-basics'
import {
  scanObscureSuspenseRisks,
  scanSuspenseFalseAlarmRisks,
  scanSuspenseWithheldInfoRisks,
} from '../../novel-writing/suspense-scans'
import {
  anchorMatchScore,
  normalizedMatchText,
} from '../../novel-writing/text-matching'
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
  upgradeRhythmPriority,
} from '../../novel-writing/upgrade-rhythm-basics'
import { countProseChars } from '../../novel-writing/word-target'
import { buildOhStoryPlotSpecialTopicsContract } from '../../routes/novel-plot-special-topics'
import {
  asArray,
  compactText,
} from '../../routes/novel-route-utils'
import { getContextContract } from '../context/context-contract'
import { firstDefined } from './core-handoff-sync-reports'
import {
  buildConflictStructureContract,
  buildFemaleAudienceContract,
  buildGenrePositioningContract,
  buildQualityAuditContract,
  buildTargetReaderContract,
  buildUpgradeRhythmContract,
  explicitNewConceptNames,
  scanEconomicPowerScaleAnchorRisks,
  scanNewConceptAnchorRisks,
  scanNewConceptOverloadRisks,
} from '../quality/audience-quality-contracts'
import {
  buildChapterBlueprintCraftChecks,
  buildChapterBlueprintMainlineDefinitionCheck,
  buildChapterBlueprintSmallOutlineCheck,
  chapterBlueprintBeat,
  chapterBlueprintBeatMatch,
  chapterBlueprintCausalChainCheck,
  chapterBlueprintFromContext,
  chapterBlueprintText,
  endingContractFromContext,
  scanBeatSequenceExecutionRisks,
  scanChapterBlueprintCraftRisks,
  scanCharacterOrderExecutionRisks,
  scanCostRewardExecutionRisks,
  scanEndingContractExecutionRisks,
  scanGoldenThreeExecutionRisks,
  scanLocalVictoryCostRisks,
} from '../quality/chapter-blueprint-execution'
import {
  assetText,
  buildAssetLinkageContract,
  buildCharacterBehaviorContract,
} from '../quality/character-asset-contracts'
import {
  buildContinuityHeatContract,
  buildDialogueContract,
  buildPlotDynamicsContract,
  buildStoryPowerContract,
} from '../quality/continuity-dialogue-contracts'
import {
  buildBridgeUnitContract,
  buildParagraphHookContract,
  buildReversalContract,
  buildShowdownContract,
  buildSuspenseContract,
  showdownExplicitContract,
} from '../quality/craft-tension-contracts'
import {
  benchmarkRecallGapStrings,
  benchmarkRecallHasGap,
  buildBenchmarkRecallBrief,
  buildIntentConfirmationContract,
} from '../quality/intent-benchmark-contracts'
import {
  nextBatchBriefFromContext,
  normalizeStoryUnitContext,
} from '../quality/memory-longform-contracts'
import {
  buildOpeningContract,
  buildProseCraftContract,
  buildPunctuationToneContract,
} from '../quality/plot-opening-prose-contracts'
import { proseParagraphsWithoutTitle } from '../quality/prose-expansion'
import { buildStateTrackingContract } from '../quality/state-tracking-contracts'
import {
  compactBriefText,
  uniqueBriefStrings,
} from '../quality/text-utils'

export function chapterBenchmarkStrategyFromContext(project: any, contextPackage: any, chapter: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = {
    ...(target?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
    ...(chapter?.raw_payload?.pre_draft_brief || {}),
    ...(chapter?.raw_payload?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(contextPackage?.preDraftBrief || {}),
  }
  return buildChapterBenchmarkStrategy(project, {
    ...(contextPackage || {}),
    chapter_target: {
      ...target,
      chapter_benchmark_strategy: target.chapter_benchmark_strategy || target.chapterBenchmarkStrategy || brief.chapter_benchmark_strategy || brief.chapterBenchmarkStrategy,
    },
    pre_draft_brief: {
      ...brief,
      chapter_benchmark_strategy: brief.chapter_benchmark_strategy || brief.chapterBenchmarkStrategy || target.chapter_benchmark_strategy || target.chapterBenchmarkStrategy,
    },
  })
}

export function normalizeChapterBenchmarkBeat(key: string, label: string, value: any, sample: any, matchScope: 'opening' | 'tail' | 'full' = 'full') {
  const text = compactText(value, 180)
  if (!text) return null
  return {
    key,
    label,
    text,
    sample_key: sample?.sample_key || '',
    match_scope: matchScope,
  }
}

export function uniqueChapterBenchmarkBeats(items: any[]) {
  const seen = new Set<string>()
  const rows: any[] = []
  for (const item of items.filter(Boolean)) {
    const key = `${item.key}:${normalizedMatchText(item.text)}`
    if (!key || seen.has(key)) continue
    seen.add(key)
    rows.push(item)
  }
  return rows
}

export function chapterBenchmarkBeatMatch(beat: any, chapterText: string) {
  const scopedText = beat.match_scope === 'opening'
    ? chapterText.slice(0, 1000)
    : beat.match_scope === 'tail'
      ? chapterText.slice(-1400)
      : chapterText
  const match = anchorMatchScore(beat.text, scopedText, { tailOnly: beat.match_scope === 'tail' })
  const threshold = beat.match_scope === 'opening'
    ? 24
    : beat.match_scope === 'tail'
      ? 28
      : beat.key === 'scene_budget_pattern'
        ? 18
        : 26
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered: match.score >= threshold,
  }
}


export function hasChapterBlueprintCraftPlan(blueprint: any) {
  const contentOutline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  return Boolean(
    blueprint?.target_emotion
    || blueprint?.targetEmotion
    || blueprint?.opening_hook
    || blueprint?.openingHook
    || blueprint?.core_payoff
    || blueprint?.corePayoff
    || Object.values(contentOutline || {}).some(Boolean)
    || Object.values(plotLines || {}).some(Boolean)
    || asArray(blueprint?.character_order || blueprint?.characterOrder).length
    || asArray(blueprint?.beat_sequence || blueprint?.beatSequence).length
    || blueprint?.cost_and_reward
    || blueprint?.costAndReward
    || Object.keys(blueprint?.ending_contract || blueprint?.endingContract || {}).length
  )
}

export function buildChapterBlueprintSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const blueprint = chapterBlueprintFromContext(contextPackage, chapter)
  const contentOutline = blueprint?.content_outline || blueprint?.contentOutline || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  const endingContract = blueprint?.ending_contract || blueprint?.endingContract || {}
  const planned = uniqueChapterBenchmarkBeats([
    chapterBlueprintBeat('target_emotion', '目标情绪', blueprint?.target_emotion || blueprint?.targetEmotion),
    chapterBlueprintBeat('opening_hook', '开篇钩子', blueprint?.opening_hook || blueprint?.openingHook, 'opening'),
    chapterBlueprintBeat('core_payoff', '核心回报', blueprint?.core_payoff || blueprint?.corePayoff),
    chapterBlueprintBeat('content_outline_cause', '内容概括', contentOutline?.cause),
    chapterBlueprintBeat('content_outline_development', '内容概括', contentOutline?.development),
    chapterBlueprintBeat('content_outline_turn', '内容概括', contentOutline?.turn),
    chapterBlueprintBeat('content_outline_climax', '内容概括', contentOutline?.climax),
    chapterBlueprintBeat('content_outline_ending', '内容概括', contentOutline?.ending, 'tail'),
    chapterBlueprintBeat(
      'plot_lines',
      '多线推进',
      chapterBlueprintText(plotLines, ['mainline', 'subplot', 'event_line', 'eventLine', 'logic_line', 'logicLine', 'relationship_line', 'relationshipLine']),
    ),
    chapterBlueprintBeat('character_order', '人物出场顺序', blueprint?.character_order || blueprint?.characterOrder),
    chapterBlueprintBeat('relationship_change', '人物关系变化', blueprint?.relationship_change || blueprint?.relationshipChange),
    chapterBlueprintBeat('cost_and_reward', '代价/收益', blueprint?.cost_and_reward || blueprint?.costAndReward),
    chapterBlueprintBeat('ending_contract_next_pull', '章尾承接', endingContract?.next_chapter_pull || endingContract?.nextChapterPull || blueprint?.ending_hook || blueprint?.endingHook, 'tail'),
  ])
  const checked = planned.map(item => chapterBlueprintBeatMatch(item, chapterText))
  const craftChecks = hasChapterBlueprintCraftPlan(blueprint) ? buildChapterBlueprintCraftChecks(blueprint, chapterText) : []
  const smallOutlineCheck = buildChapterBlueprintSmallOutlineCheck(blueprint, chapterText)
  const smallOutlineChecks = smallOutlineCheck ? [smallOutlineCheck] : []
  const mainlineDefinitionCheck = buildChapterBlueprintMainlineDefinitionCheck(blueprint, chapterText)
  const mainlineDefinitionChecks = mainlineDefinitionCheck ? [mainlineDefinitionCheck] : []
  const causalChainCheck = chapterBlueprintCausalChainCheck(blueprint, chapterText)
  const causalChainChecks = causalChainCheck ? [causalChainCheck] : []
  const craftMissed = craftChecks
    .filter((item: any) => item.status === 'warn')
    .map((item: any) => ({
      key: `craft_${item.key}`,
      label: item.label,
      text: item.fix,
      evidence: item.evidence,
      delivered: false,
      status: 'warn',
      score: 0,
    }))
  const causalChainMissed = causalChainChecks
    .filter((item: any) => !item.delivered)
    .map((item: any) => ({
      ...item,
      text: item.text || item.expected,
    }))
  const smallOutlineMissed = smallOutlineChecks
    .filter((item: any) => item.status === 'warn')
    .map((item: any) => ({
      key: item.key,
      label: item.label,
      text: item.text || item.fix,
      evidence: item.evidence,
      delivered: false,
      status: 'warn',
      score: 0,
      missed_items: item.missed_items || [],
      fix: item.fix,
    }))
  const mainlineDefinitionMissed = mainlineDefinitionChecks
    .filter((item: any) => item.status === 'warn')
    .map((item: any) => ({
      key: item.key,
      label: item.label,
      text: item.text || item.fix,
      evidence: item.evidence,
      delivered: false,
      status: 'warn',
      score: 0,
      missed_items: item.missed_items || [],
      fix: item.fix,
    }))
  const beatDensityMissed = craftMissed.some((item: any) => item.key === 'craft_beat_density')
  const beatFunctionDetailMissed = craftMissed.some((item: any) => item.key === 'craft_beat_function_detail_balance')
  const delivered = checked.filter(item => item.delivered)
  const missed = [...checked.filter(item => !item.delivered), ...craftMissed, ...smallOutlineMissed, ...mainlineDefinitionMissed, ...causalChainMissed]
  const missedCount = missed.length
  const deliveredCausalChainCount = causalChainChecks.filter((item: any) => item.delivered).length
  const deliveredSmallOutlineCount = smallOutlineChecks.filter((item: any) => item.status === 'ok').length
  const deliveredMainlineDefinitionCount = mainlineDefinitionChecks.filter((item: any) => item.status === 'ok').length
  const totalBlueprintChecks = planned.length + craftChecks.length + smallOutlineChecks.length + mainlineDefinitionChecks.length + causalChainChecks.length
  const score = Math.max(0, Math.min(100, Math.round(
    totalBlueprintChecks
      ? ((delivered.length + craftChecks.filter((item: any) => item.status === 'ok').length + deliveredSmallOutlineCount + deliveredMainlineDefinitionCount + deliveredCausalChainCount) / Math.max(1, totalBlueprintChecks)) * 100
      : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const hasBlueprintPlan = planned.length || craftChecks.length || smallOutlineChecks.length || mainlineDefinitionChecks.length || causalChainChecks.length

  return {
    report_id: `chapter-blueprint-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: !hasBlueprintPlan ? '细纲未配置' : status === 'ok' ? '细纲 OK' : `细纲缺口 ${missedCount}`,
    summary: !hasBlueprintPlan
      ? '本章没有配置章节细纲蓝图。'
      : status === 'ok'
        ? '正文已基本兑现章节细纲中的开篇钩子、核心回报、小纲四步法、主线定义、五段式概括、多线推进、人物顺序、代价收益和章尾承接。'
        : `正文有 ${missedCount} 项章节细纲任务未充分落地。`,
    missed_count: missedCount,
    planned,
    delivered,
    missed,
    craft_checks: craftChecks,
    small_outline_checks: smallOutlineChecks,
    mainline_definition_checks: mainlineDefinitionChecks,
    causal_chain_checks: causalChainChecks,
    next_actions: status === 'ok'
      ? ['保持章节细纲闭环：开篇、推进、转折、回报、代价收益和章尾承接都要有正文证据。']
      : [
          '下一次修订优先补足章节细纲 missed 项，把缺口写成可见事件、人物动作、信息反转、关系变化、代价兑现或章尾新问题。',
          causalChainMissed.length ? '按五幕因果链修复：开局埋因，发展让果变下一因，转折让冲突性质质变，行动白热化，结局收束并埋下一因；不能跳步、不能乱序。' : '',
          beatDensityMissed ? '按情节点密度修复：约 200-300 字/个情节点，先补足动作过程、对话交锋、信息变化、选择代价、收益兑现和章尾钩子铺垫，再扩写句子。' : '',
          beatFunctionDetailMissed ? '按目的词详略修复：爽点/打脸/高潮/卖点/关键揭露/反转必须展开，过渡/赶路/信息交代/时间跳转压成 1-2 句，避免平均用力或装饰性水文。' : '',
          smallOutlineMissed.length ? '按小纲四步法修复：先分段判断，再补每段目的和效果，按详写/略写分配篇幅，并让 quick_locator 在正文中可定位。' : '',
          mainlineDefinitionMissed.length ? '按主线定义修复：主线不等于升级，主线是一件事，不是一个元素；把升级、金手指、地图和资源改成达成 mainline_event 的行动，并写出那一件事的状态变化。' : '',
          '按 oh-story craft 修复：爽点前补危机/期待铺垫，揭露/打脸后补在场配角差异化反应，过渡点压缩、卖点和回报点展开。',
          '如果正文只是概述大纲，按章节细纲重排开篇钩子、五段式内容概括、多线推进和章尾承接。',
        ].filter(Boolean),
  }
}

export function buildChapterBenchmarkSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const strategy = chapterBenchmarkStrategyFromContext(project, contextPackage, chapter)
  const samples = asArray(strategy?.samples)
  const planned = uniqueChapterBenchmarkBeats(samples.flatMap((sample: any) => [
    normalizeChapterBenchmarkBeat('opening_hook', '开篇钩子', sample.opening_hook, sample, 'opening'),
    normalizeChapterBenchmarkBeat('conflict_pattern', '冲突推进', sample.conflict_pattern, sample),
    normalizeChapterBenchmarkBeat('payoff_pattern', '爽点兑现', sample.payoff_pattern, sample),
    normalizeChapterBenchmarkBeat('ending_hook_pattern', '章末追读', sample.ending_hook_pattern, sample, 'tail'),
    normalizeChapterBenchmarkBeat('scene_budget_pattern', '场景节拍', sample.scene_budget_pattern, sample),
    String(sample.dialogue_pattern || '').includes('对白必须推动冲突')
      ? null
      : normalizeChapterBenchmarkBeat('dialogue_pattern', '对白推进', sample.dialogue_pattern, sample),
    normalizeChapterBenchmarkBeat('visual_pattern', '场面可视化', sample.visual_pattern, sample),
  ]))
  const checked = planned.map(item => chapterBenchmarkBeatMatch(item, chapterText))
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    planned.length ? (delivered.length / planned.length) * 100 : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `chapter-benchmark-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: planned.length === 0 ? '基准未配置' : status === 'ok' ? '基准 OK' : `基准缺口 ${missedCount}`,
    summary: planned.length === 0
      ? '本章没有配置章节质量基准样例。'
      : status === 'ok'
        ? '正文已基本兑现质量基准样例中的开篇、冲突、爽点、节拍、场面和章末追读结构。'
        : `正文有 ${missedCount} 项质量基准结构未充分落地。`,
    missed_count: missedCount,
    planned,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持质量基准样例：只学习结构、节拍、爽点兑现和章末追读，不复制桥段。']
      : [
          '下一次修订优先补足质量基准样例 missed 项，把缺口写成可见冲突、行动结果、信息增量或章末问题。',
          '如果正文只复述设定或顺滑过场，按质量基准样例重排开篇钩子、冲突推进、爽点兑现和章末追读。',
        ],
  }
}

export function benchmarkRecallBriefFromContext(contextPackage: any, chapter: any = {}) {
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const brief = {
    ...(target?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
    ...(chapter?.raw_payload?.pre_draft_brief || {}),
    ...(chapter?.raw_payload?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(contextPackage?.preDraftBrief || {}),
  }
  return buildBenchmarkRecallBrief({
    ...(contextPackage || {}),
    chapter_target: {
      ...target,
      benchmark_recall_brief: target.benchmark_recall_brief || target.benchmarkRecallBrief || brief.benchmark_recall_brief || brief.benchmarkRecallBrief,
      style_sample_strategy: target.style_sample_strategy || target.styleSampleStrategy || brief.style_sample_strategy || brief.styleSampleStrategy,
      chapter_benchmark_strategy: target.chapter_benchmark_strategy || target.chapterBenchmarkStrategy || brief.chapter_benchmark_strategy || brief.chapterBenchmarkStrategy,
      chapter_blueprint: target.chapter_blueprint || target.chapterBlueprint || brief.chapter_blueprint || brief.chapterBlueprint,
    },
    pre_draft_brief: {
      ...brief,
      benchmark_recall_brief: brief.benchmark_recall_brief || brief.benchmarkRecallBrief || target.benchmark_recall_brief || target.benchmarkRecallBrief,
    },
  })
}

export function benchmarkRecallBeat(key: string, label: string, value: any) {
  const text = compactText(value, 220)
  return text ? { key, label, text } : null
}

export function benchmarkRecallBeatMatch(beat: any, chapterText: string) {
  const text = String(chapterText || '')
  const expectedText = String(beat?.text || '')
  if (beat.key === 'benchmark_authority_rule' || beat.key === 'benchmark_canonical_source_rule') {
    const hasPressure = /压问|质问|逼问|压迫|抢先定义|改口/.test(text)
    const hasEvidenceBurst = /证据|反证|旧账|旧印|账册|缺页|亮出|对上|真相/.test(text)
    const hasPayoffRelease = /失控|倒戈|怀疑|沉默|退后|改口|站队|震惊|哗然/.test(text)
    const hasCoolingHook = /冷却|短暂|章尾|钩子|露出|未解|没有解释|背面|印记|名字/.test(text)
    const evidence = [
      hasPressure ? '压迫/压问' : '',
      hasEvidenceBurst ? '证据爆发' : '',
      hasPayoffRelease ? '爽感释放/反应变化' : '',
      hasCoolingHook ? '冷却承接/章尾钩子' : '',
    ].filter(Boolean)
    return {
      ...beat,
      score: evidence.length * 25,
      evidence,
      delivered: hasPressure && hasEvidenceBurst && hasPayoffRelease && hasCoolingHook,
    }
  }
  if (beat.key === 'selected_emotion_module' && /信息差|反杀|反证/.test(expectedText)) {
    const hasInformationTurn = /证据|反证|旧印|账册|真相|线索|名字|认出/.test(text)
    const hasPayoffReaction = /失控|倒戈|怀疑|沉默|退后|改口|站队|震惊|哗然/.test(text)
    if (hasInformationTurn && hasPayoffReaction) {
      return {
        ...beat,
        score: 84,
        evidence: ['信息差证据', '反应反转'],
        delivered: true,
      }
    }
  }
  if (beat.key === 'matched_chapter_technique' && /差异化反应|旁观者/.test(expectedText)) {
    const reactionKinds = ['怀疑', '倒戈', '沉默', '退后', '改口', '站队', '震惊', '哗然', '失控']
      .filter(term => text.includes(term))
    if (reactionKinds.length >= 2) {
      return {
        ...beat,
        score: 86,
        evidence: reactionKinds.slice(0, 4),
        delivered: true,
      }
    }
  }
  const match = anchorMatchScore(beat.text, chapterText)
  const threshold = beat.key === 'style_profile_summary'
    ? 5
    : beat.key === 'selected_emotion_module'
      ? 22
      : 28
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered: match.score >= threshold,
  }
}

export function benchmarkRecallHardGapMisses(brief: any = {}) {
  const gaps = benchmarkRecallGapStrings(brief?.gaps, brief?.recall_gaps, brief?.recallGaps)
  if (benchmarkRecallHasGap(gaps, /no_benchmark|无对标参考|无对标项目|没有对标/i)) return []
  const hasLegacyFallback = benchmarkRecallHasGap(gaps, /legacy_deconstruction|旧版拆文|旧拆文/i)
  const hardGaps = gaps.filter((gap: string) => {
    const normalized = gap.toLowerCase()
    return /missing_primary_contract|profile_missing/.test(normalized)
      || (!hasLegacyFallback && /module_missing|rhythm_missing/.test(normalized))
  })
  if (!hardGaps.length) return []
  return [{
    key: 'benchmark_missing_primary_contract',
    label: '召回主契约缺失',
    text: `oh-story Step 2.3 文风召回存在阻断缺口：${hardGaps.join('；')}`,
    evidence: hardGaps.join('；'),
    delivered: false,
    status: 'warn',
    score: 0,
    fix: '重跑 /story-long-analyze Stage 3+ 或重新 /story-import；补齐剧情/情绪模块.md、剧情/节奏.md 或文风.md 后再进入正文生成。',
  }]
}

export function benchmarkRecallAnchorExcerptCopyRisks(brief: any = {}, chapterText: string) {
  const text = String(chapterText || '')
  return asArray(brief?.anchor_excerpts || brief?.anchorExcerpts)
    .map((excerpt: any, index: number) => {
      const rawExcerpt = String(excerpt || '').replace(/\s+/g, ' ').trim()
      if (!rawExcerpt) return null
      const candidates = uniqueBriefStrings([
        rawExcerpt,
        ...rawExcerpt.split(/[。！？!?；;\n\r]+/g),
        ...rawExcerpt.split(/[，,、：:]/g),
      ].map((item: any) => String(item || '').trim()).filter(item => countProseChars(item) >= 10), 12)
      const copied = candidates.find(candidate => text.includes(candidate))
      if (!copied) return null
      return {
        key: 'benchmark_anchor_excerpt_copy_risk',
        label: '原文锚点复制风险',
        text: `anchor_excerpts 第${index + 1}段出现可定位原句复制：${compactBriefText(copied, 120)}`,
        evidence: copied,
        delivered: false,
        status: 'warn',
        score: 0,
        fix: '删除或改写锚点原句；只保留句长、停顿、潜台词和信息释放手法，换成本书人物、事件、设定和措辞。',
      }
    })
    .filter(Boolean)
}

export function buildBenchmarkRecallSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const brief = benchmarkRecallBriefFromContext(contextPackage, chapter)
  const hasCanonicalConflict = [
    ...asArray(brief?.gaps),
    ...asArray(brief?.authority_rules),
    compactBriefText(brief?.conflict_resolution),
  ].some((item: any) => /module_rhythm_conflict|conflict|冲突|文风.*情绪|情绪.*文风|节奏.*文风|文风.*节奏/.test(assetText(item)))
  const planned = uniqueChapterBenchmarkBeats([
    benchmarkRecallBeat('selected_emotion_module', '情绪模块', brief?.selected_emotion_module),
    benchmarkRecallBeat('rhythm_reference', '节奏参照', brief?.rhythm_reference),
    benchmarkRecallBeat('style_profile_summary', '文风摘要', brief?.style_profile_summary),
    ...asArray(brief?.matched_chapter_techniques).map((item: any) => benchmarkRecallBeat('matched_chapter_technique', '匹配章技法', item)),
    ...asArray(brief?.style_directives).map((item: any) => benchmarkRecallBeat('style_directive', '文风指令', item)),
    ...asArray(brief?.authority_rules).map((item: any) => benchmarkRecallBeat('benchmark_authority_rule', '召回权威规则', item)),
    ...(hasCanonicalConflict ? asArray(brief?.canonical_source_rules).map((item: any) => benchmarkRecallBeat('benchmark_canonical_source_rule', '召回来源权威', item)) : []),
  ])
  const checked = planned.map(item => benchmarkRecallBeatMatch(item, chapterText))
  const delivered = checked.filter(item => item.delivered)
  const hardGapMisses = benchmarkRecallHardGapMisses(brief)
  const anchorCopyRisks = benchmarkRecallAnchorExcerptCopyRisks(brief, chapterText)
  const missed = [...hardGapMisses, ...anchorCopyRisks, ...checked.filter(item => !item.delivered)]
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    hardGapMisses.length ? 0 : planned.length ? (delivered.length / planned.length) * 100 - anchorCopyRisks.length * 18 : 82 - anchorCopyRisks.length * 18,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `benchmark-recall-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: planned.length === 0 && !hardGapMisses.length ? '召回未配置' : status === 'ok' ? '召回 OK' : `召回缺口 ${missedCount}`,
    summary: planned.length === 0 && !hardGapMisses.length
      ? '本章没有配置文风召回简报。'
      : status === 'ok'
        ? '正文已基本兑现文风召回中的情绪模块、节奏参照、文风摘要和匹配章技法。'
        : `正文有 ${missedCount} 项文风召回要求未充分落地。`,
    missed_count: missedCount,
    gaps: asArray(brief?.gaps),
    planned,
    delivered,
    missed,
    copied_anchor_excerpts: anchorCopyRisks.map((item: any) => item.evidence),
    next_actions: status === 'ok'
      ? ['保持文风召回：模块进情绪，节奏进爆发，技法只学抽象功能，不复制原文。']
      : [
          '下一次修订优先补足文风召回 missed 项，把节奏参照、情绪模块和匹配章技法写成正文可见的压迫、爆发、冷却、反应或章尾承接。',
          anchorCopyRisks.length ? '存在原文锚点复制风险：删除或改写锚点原句，只保留句长、停顿、潜台词和信息释放手法。' : '',
          missed.some((item: any) => item.key === 'benchmark_authority_rule') ? '存在召回权威缺口：情绪模块/节奏参照优先，文风只管表达，不得压低情绪爆发或覆盖节奏。' : '',
          missed.some((item: any) => item.key === 'benchmark_canonical_source_rule') ? '存在召回来源权威缺口：按 剧情/情绪模块.md 和 剧情/节奏.md 执行，情绪模块/节奏参照优先，文风.md 只管表达层。' : '',
          hardGapMisses.length ? '重跑 /story-long-analyze Stage 3+ 或重新 /story-import，补齐情绪模块、节奏参照或文风画像后再进入正文生成。' : '',
          '保留 gaps 中的缺口，不要把缺失的深度拆解、冲突来源或文风偏差误判为已经解决。',
        ].filter(Boolean),
  }
}

export function styleBoundarySyncMiss(key: string, label: string, text: string, evidence: string, fix: string) {
  return {
    key,
    label,
    text: compactBriefText(text, ''),
    evidence: compactBriefText(evidence, ''),
    fix: compactBriefText(fix, ''),
  }
}

export function buildStyleBoundarySyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = styleBoundaryExplicitContract(contextPackage, chapter)
  const text = String(chapterText || '')
  const planned = uniqueBriefStrings([
    ...asArray(contract?.hard_constraints || contract?.hardConstraints),
    ...asArray(contract?.copy_boundary_rules || contract?.copyBoundaryRules),
    ...asArray(contract?.quality_checks || contract?.qualityChecks),
    ...asArray(contract?.conflict_resolution_rules || contract?.conflictResolutionRules),
  ], 20).map((item: any, index: number) => ({
    key: `style_boundary_rule_${index + 1}`,
    label: '文风边界规则',
    text: compactBriefText(item, 180),
  }))

  const misses = [
    /这一切只是开始|新的开始|才刚刚开始|并未结束|真正的(?:考验|风暴|危机)才/.test(text)
      ? styleBoundarySyncMiss(
          'gate_f_uplift_ending',
          'Gate F 章末升华',
          '章末出现总结式升华或空泛余韵。',
          text.match(/这一切只是开始|新的开始|才刚刚开始|并未结束|真正的(?:考验|风暴|危机)才/)?.[0] || '章末升华',
          '删章末升华，改成现场可见的新信息、危险、选择或动作钩子。',
        )
      : null,
    /更大的风暴(?:已经|即将|正在)?(?:开始|来临|降临|酝酿)?|风暴即将来临|即将(?:到来|来临)|命运的?齿轮/.test(text)
      ? styleBoundarySyncMiss(
          'author_preview',
          '作者预告',
          '正文用作者预告替代现场钩子。',
          text.match(/更大的风暴(?:已经|即将|正在)?(?:开始|来临|降临|酝酿)?|风暴即将来临|即将(?:到来|来临)|命运的?齿轮/)?.[0] || '作者预告',
          '删作者预告，改成本章现场已经触发的物件、声音、倒计时或角色动作。',
        )
      : null,
    /命运像|命运.*无形.*网|无形的大网|命运.*笼罩|命运.*安排/.test(text)
      ? styleBoundarySyncMiss(
          'universal_metaphor',
          '万能比喻',
          '正文出现命运感套话或万能比喻。',
          text.match(/命运像.{0,20}|命运.{0,20}无形.{0,20}网|无形的大网|命运.{0,20}笼罩|命运.{0,20}安排/)?.[0] || '命运感套话',
          '删万能比喻，改成角色能看见、听见或必须处理的具体压力。',
        )
      : null,
    /三次敲桌|同一句口癖|样章里那句口癖|样章.*原句|复制样章桥段/.test(text)
      ? styleBoundarySyncMiss(
          'sample_copy_risk',
          '样章复制风险',
          '正文出现样章桥段、口癖或原句复制风险。',
          text.match(/三次敲桌|同一句口癖|样章里那句口癖|样章.{0,20}原句|复制样章桥段/)?.[0] || '样章复制风险',
          '只保留抽象节奏，删除样章桥段、口癖、原句和独特比喻。',
        )
      : null,
  ].filter(Boolean)

  const missed = uniqueBriefStrings(misses.map((item: any) => `${item.key}::${item.label}::${item.text}::${item.evidence}::${item.fix}`), 12)
    .map((row: string) => {
      const [key, label, missText, evidence, fix] = row.split('::')
      return { key, label, text: missText, evidence, fix }
    })
  const missedCount = missed.length
  const status = missedCount > 0 ? 'warn' : 'ok'
  const score = contract
    ? Math.max(0, 100 - missedCount * 18)
    : 82

  return {
    report_id: `style-boundary-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: !contract ? '文风边界未配置' : status === 'ok' ? '文风边界 OK' : `文风边界缺口 ${missedCount}`,
    summary: !contract
      ? '本章没有配置文风覆盖边界合同。'
      : status === 'ok'
        ? '正文没有触发 Gate F 章末升华、作者预告、万能比喻或样章复制风险。'
        : `正文有 ${missedCount} 项文风覆盖边界风险。`,
    missed_count: missedCount,
    planned,
    delivered: status === 'ok' ? planned : [],
    missed,
    next_actions: status === 'ok'
      ? ['保持文风边界：文风只覆盖表达层，硬约束永远赢，不复制样章桥段。']
      : [
          '下一章必须恢复硬约束永远赢：删章末升华、作者预告和样章复制，只保留抽象节奏。',
          '文风只允许改句长、停顿、对白比例和情绪转折，不允许覆盖禁用词、Gate F、万能比喻、字数下限、剧情事实、状态、关系和时间线。',
        ],
  }
}

export function scanBenchmarkRecallExecutionRisks(contextPackage: any = {}, chapterText: string) {
  const brief = benchmarkRecallBriefFromContext(contextPackage, contextPackage?.chapter_target || {})
  const planned = uniqueChapterBenchmarkBeats([
    benchmarkRecallBeat('selected_emotion_module', '情绪模块', brief?.selected_emotion_module),
    benchmarkRecallBeat('rhythm_reference', '节奏参照', brief?.rhythm_reference),
    benchmarkRecallBeat('style_profile_summary', '文风摘要', brief?.style_profile_summary),
    ...asArray(brief?.matched_chapter_techniques).map((item: any) => benchmarkRecallBeat('matched_chapter_technique', '匹配章技法', item)),
    ...asArray(brief?.style_directives).map((item: any) => benchmarkRecallBeat('style_directive', '文风指令', item)),
  ])
  if (!planned.length) return []
  const checked = planned.map(item => benchmarkRecallBeatMatch(item, chapterText))
  return checked
    .filter(item => !item.delivered)
    .map(item => ({
      key: `benchmark_recall_${item.key}_missing`,
      label: '文风召回执行扫描',
      status: 'warn' as const,
      evidence: `${item.label}未充分落地：${compactBriefText(item.text, 180)}；命中证据：${asArray(item.evidence).map((row: any) => compactBriefText(row)).filter(Boolean).join('、') || '无'}。`,
      fix: '按 oh-story Step 2.3 修复：selected_emotion_module 进入情绪目标，rhythm_reference 进入蓄势/爆发/冷却/章尾承接，matched_chapter_techniques 只学抽象技法并写成正文可见的压迫、半拍、潜台词、反应或钩子；不得复制对标章节桥段或原句。',
      source: 'benchmark_recall_execution',
    }))
}

export function styleSampleStrategyFromContext(project: any, contextPackage: any, chapter: any = {}) {
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const brief = {
    ...(target?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
    ...(chapter?.raw_payload?.pre_draft_brief || {}),
    ...(chapter?.raw_payload?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(contextPackage?.preDraftBrief || {}),
  }
  return buildStyleSampleStrategy(project, {
    ...(contextPackage || {}),
    chapter_target: {
      ...target,
      style_sample_strategy: target.style_sample_strategy || target.styleSampleStrategy || brief.style_sample_strategy || brief.styleSampleStrategy,
    },
    pre_draft_brief: {
      ...brief,
      style_sample_strategy: brief.style_sample_strategy || brief.styleSampleStrategy || target.style_sample_strategy || target.styleSampleStrategy,
    },
  })
}

export function styleSampleBeat(key: string, label: string, value: any, sample: any) {
  const text = compactText(value, 180)
  return text ? { key, label, text, sample_key: sample?.sample_key || '' } : null
}

export function quotedDialogueRatio(chapterText: string) {
  const text = String(chapterText || '')
  if (!text.trim()) return 0
  const quoted = Array.from(text.matchAll(/[“"「『]([^”"」』]{1,300})[”"」』]/g))
    .reduce((sum, match) => sum + String(match[1] || '').length, 0)
  const proseChars = Math.max(1, countProseChars(text))
  return quoted / proseChars
}

export function dialogueRatioTarget(text: string) {
  const match = String(text || '').match(/(\d{1,2})\s*%\s*[-~至到]\s*(\d{1,2})\s*%/)
  if (!match) return null
  const low = Number(match[1]) / 100
  const high = Number(match[2]) / 100
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null
  return { low: Math.min(low, high), high: Math.max(low, high) }
}

export function proseSegmentLengths(chapterText: string) {
  return String(chapterText || '')
    .split(/[。！？!?，,、；;：:\n\r]+/g)
    .map(segment => countProseChars(String(segment || '').replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '')))
    .filter(length => length > 0)
}

export function styleSampleBeatMatch(beat: any, chapterText: string) {
  if (beat.key === 'style_drift_sentence_fingerprint') {
    const lengths = proseSegmentLengths(chapterText)
    const minSentenceChars = Number(beat.min_sentence_chars || 16)
    const maxSentenceChars = Number(beat.max_sentence_chars || minSentenceChars)
    const shortCutoff = Math.max(6, Math.floor(minSentenceChars * 0.45))
    const shortCount = lengths.filter(length => length <= shortCutoff).length
    const avgSegmentChars = lengths.length
      ? lengths.reduce((sum, length) => sum + length, 0) / lengths.length
      : 0
    const shortRatio = lengths.length ? shortCount / lengths.length : 0
    const drifted = lengths.length >= 8 && shortRatio >= 0.5 && avgSegmentChars < minSentenceChars * 0.7
    return {
      ...beat,
      score: drifted ? Math.max(20, Math.round(78 - shortRatio * 60)) : 86,
      evidence: `目标句长 ${minSentenceChars}-${maxSentenceChars} 字；短片段 ${shortCount}/${lengths.length}；平均片段 ${Math.round(avgSegmentChars)} 字`,
      delivered: !drifted,
      fix: '按文风指纹/文风.md 目标句长带合并碎句，恢复中长句呼吸；不要模仿可能已漂移的上一章句式节奏。',
    }
  }

  if (beat.key === 'sentence_pattern') {
    const sentenceCount = Math.max(1, (String(chapterText || '').match(/[。！？!?]/g) || []).length)
    const avgSentenceChars = countProseChars(chapterText) / sentenceCount
    const wantsShortMiddle = /短中句|短句|解释压短|短中/.test(String(beat.text || ''))
    const delivered = wantsShortMiddle ? avgSentenceChars <= 45 : avgSentenceChars <= 70
    return {
      ...beat,
      score: delivered ? 86 : Math.max(30, Math.round(86 - Math.max(0, avgSentenceChars - 45))),
      evidence: `平均句长 ${Math.round(avgSentenceChars)} 字`,
      delivered,
    }
  }

  if (beat.key === 'dialogue_ratio') {
    const ratio = quotedDialogueRatio(chapterText)
    const target = dialogueRatioTarget(beat.text)
    const delivered = target
      ? ratio >= Math.max(0, target.low - 0.12) && ratio <= Math.min(1, target.high + 0.18)
      : ratio >= 0.12
    return {
      ...beat,
      score: delivered ? 84 : Math.round(Math.max(20, Math.min(72, ratio * 220))),
      evidence: `对白占比约 ${Math.round(ratio * 100)}%`,
      delivered,
    }
  }

  const match = anchorMatchScore(beat.text, chapterText)
  const threshold = beat.key === 'voice_rules' || beat.key === 'scene_function' ? 12 : 22
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered: match.score >= threshold,
  }
}

export function buildStyleSampleSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const strategy = styleSampleStrategyFromContext(project, contextPackage, chapter)
  const samples = asArray(strategy?.samples)
  const planned = uniqueChapterBenchmarkBeats([
    ...samples.flatMap((sample: any) => [
      styleSampleBeat('scene_function', '场景功能', sample.scene_function, sample),
      styleSampleBeat('narrative_rhythm', '叙述节奏', sample.narrative_rhythm, sample),
      styleSampleBeat('sentence_pattern', '句式密度', sample.sentence_pattern, sample),
      styleSampleBeat('dialogue_ratio', '对白比例', sample.dialogue_ratio, sample),
      ...asArray(sample.voice_rules).map((rule: any) => styleSampleBeat('voice_rules', '角色口吻', rule, sample)),
    ]),
    styleFingerprintSentenceBeat(contextPackage, strategy),
  ])
  const checked = planned.map(item => styleSampleBeatMatch(item, chapterText))
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const copiedPhrases = Array.from(new Set([
    ...asArray(strategy?.do_not_copy),
    ...samples.flatMap((sample: any) => asArray(sample.unsafe_direct_phrases)),
  ].map((item: any) => String(item || '').trim()).filter(item => item.length >= 6 && String(chapterText || '').includes(item))))
  const missedCount = missed.length
  const copyRiskCount = copiedPhrases.length
  const hasStyleFingerprintDrift = missed.some((item: any) => item.key === 'style_drift_sentence_fingerprint')
  const score = Math.max(0, Math.min(100, Math.round(
    planned.length ? (delivered.length / planned.length) * 100 - copyRiskCount * 12 : 82,
  )))
  const status = missedCount > 0 || copyRiskCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `style-sample-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: planned.length === 0 ? '风格未配置' : status === 'ok' ? '风格 OK' : `风格缺口 ${missedCount + copyRiskCount}`,
    summary: planned.length === 0
      ? '本章没有配置风格样章策略。'
      : status === 'ok'
        ? '正文已基本执行风格样章中的节奏、句式、对白和角色口吻策略，且没有照搬原句。'
        : `正文有 ${missedCount} 项风格策略未充分落地，照搬风险 ${copyRiskCount} 项。`,
    missed_count: missedCount,
    copy_risk_count: copyRiskCount,
    planned,
    delivered,
    missed,
    copied_phrases: copiedPhrases,
    next_actions: status === 'ok'
      ? ['保持风格样章约束：学习节奏、句式密度、对白比例和情绪转折，不复制桥段和原句。']
      : [
          hasStyleFingerprintDrift ? '优先按文风指纹/文风.md 目标句长带合并逗号碎句，恢复中长句呼吸，不要模仿可能已漂移的上一章句式节奏。' : '',
          '下一次修订按风格样章补足 missed 项，把节奏、句式、对白比例和角色口吻改成正文可感知的表达。',
          '不得照搬样章原句；copied_phrases 中的表达必须替换成作者当前章节自己的说法。',
        ].filter(Boolean),
  }
}

export function retentionBriefFromContext(contextPackage: any, chapter: any = {}) {
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const brief = {
    ...(chapter?.raw_payload?.pre_draft_brief || {}),
    ...(chapter?.raw_payload?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(contextPackage?.preDraftBrief || {}),
    ...(target?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
  }
  return target.reader_retention_brief
    || target.readerRetentionBrief
    || brief.reader_retention_brief
    || brief.readerRetentionBrief
    || {}
}

export function buildReaderRetentionSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const retentionBrief = retentionBriefFromContext(contextPackage, chapter)
  const planned = [
    normalizeRetentionBeat('opening_hook', '开篇钩子', retentionBrief.opening_hook || retentionBrief.openingHook, 'opening'),
    normalizeRetentionBeat('payoff_promise', '爽点承诺', retentionBrief.payoff_promise || retentionBrief.payoffPromise),
    normalizeRetentionBeat('information_gap', '信息缺口', retentionBrief.information_gap || retentionBrief.informationGap),
    normalizeRetentionBeat('emotional_reward', '情绪回报', retentionBrief.emotional_reward || retentionBrief.emotionalReward),
    normalizeRetentionBeat('short_drama_scene', '短剧场面', retentionBrief.short_drama_scene || retentionBrief.shortDramaScene),
    normalizeRetentionBeat('ending_question', '章末追读', retentionBrief.ending_question || retentionBrief.endingQuestion, 'tail'),
    normalizeHookAddictionModelCheck(retentionBrief.hook_addiction_model || retentionBrief.hookAddictionModel, chapterText),
    normalizeRetentionDoubleEngineCheck(retentionBrief.retention_double_engine || retentionBrief.retentionDoubleEngine, chapterText),
    normalizeRetentionPillarsCheck(retentionBrief.retention_pillars || retentionBrief.retentionPillars, chapterText),
  ].filter(Boolean)
  const checked = planned.map(item => Object.prototype.hasOwnProperty.call(item, 'delivered') ? item : retentionBeatMatch(item, chapterText))
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    planned.length ? (delivered.length / planned.length) * 100 : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `reader-retention-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '追读 OK' : `漏追读 ${missedCount}`,
    summary: status === 'ok'
      ? '追读雷达的开篇钩子、爽点承诺、信息缺口和章末追读已基本兑现。'
      : `追读雷达有 ${missedCount} 项未在正文中充分兑现。`,
    missed_count: missedCount,
    planned,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持开写任务书的追读雷达和写后复盘闭环。']
      : [
          '下一次修订优先补足追读雷达 missed 项，尤其是前 300 字钩子和最后一幕追读问题。',
          '优先补Hook上瘾模型：按触发 -> 行动 -> 奖励 -> 投入重写，并强化奖励随机性，让收获不只兑现预期，还留下资源、关系、权限、排名或线索沉没成本。',
          '补足留存双引擎：情绪 + 饥饿必须同时落地；情绪要让读者快速代入，饥饿要用信息差植入问号，并按剥洋葱方式把关键信息卡到章末。',
          '补足留存四大支柱：升级、资源困境、目标、解密至少两项必须在正文落地，避免只写氛围或说明。',
          '如果正文只是解释设定或铺氛围，改为现场危机、可视化冲突和明确读者回报。',
        ],
  }
}

export function chapterHookContractForSync(contextPackage: any = {}, chapter: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = {
    ...(target?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(contextPackage?.preDraftBrief || {}),
    ...(chapter?.raw_payload?.pre_draft_brief || {}),
    ...(chapter?.raw_payload?.preDraftBrief || {}),
  }
  const hookContract = target.chapter_hook_contract
    || target.chapterHookContract
    || contextPackage?.chapter_hook_contract
    || contextPackage?.chapterHookContract
    || brief.chapter_hook_contract
    || brief.chapterHookContract
    || {}
  const retention = target.reader_retention_brief || brief.reader_retention_brief || {}
  const blueprint = target.chapter_blueprint || target.chapterBlueprint || contextPackage?.chapter_blueprint || {}
  return {
    opening_hook: target.opening_hook
      || target.openingHook
      || target.hook_opening
      || target.hookOpening
      || hookContract.opening_hook
      || hookContract.openingHook
      || brief.opening_hook
      || brief.openingHook
      || retention.opening_hook
      || retention.openingHook
      || blueprint.opening_hook
      || blueprint.openingHook,
    ending_hook: target.ending_hook
      || target.endingHook
      || target.page_turn_hook
      || target.pageTurnHook
      || hookContract.ending_hook
      || hookContract.endingHook
      || hookContract.page_turn_hook
      || hookContract.pageTurnHook
      || brief.ending_hook
      || brief.endingHook
      || retention.ending_question
      || retention.endingQuestion
      || blueprint.ending_hook
      || blueprint.endingHook,
    ending_contract: endingContractFromContext(contextPackage),
    quality_checks: target.chapter_hook_quality_checks
      || target.chapterHookQualityChecks
      || hookContract.quality_checks
      || hookContract.qualityChecks
      || hookContract.chapter_hook_quality_checks
      || hookContract.chapterHookQualityChecks
      || brief.chapter_hook_quality_checks
      || brief.chapterHookQualityChecks
      || [],
  }
}

export function buildChapterEndingContractCheck(contextPackage: any, chapterText: string) {
  const contract = endingContractFromContext(contextPackage)
  const expected = uniqueBriefStrings([
    contract?.final_state || contract?.finalState,
    contract?.unresolved_question || contract?.unresolvedQuestion,
    contract?.next_chapter_pull || contract?.nextChapterPull,
  ].map((item: any) => compactBriefText(item)).filter(Boolean), 8)
  if (!expected.length) return null
  const risks = scanEndingContractExecutionRisks(contextPackage, chapterText)
  return {
    key: 'ending_contract',
    label: '章尾合同',
    text: expected.join('；'),
    expected: expected.join('；'),
    score: risks.length ? Math.max(0, 100 - risks.length * 24) : 86,
    evidence: risks.length
      ? risks.map((item: any) => compactBriefText(item.evidence || item.fix)).filter(Boolean).slice(0, 8)
      : ['章尾已交代状态变化、未解问题或下一章行动压力。'],
    delivered: risks.length === 0,
    status: risks.length === 0 ? 'ok' : 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: risks.length ? '章尾没有完整兑现结尾设定和下一章推动力。' : '',
    repair_instruction: risks.length
      ? '最后300-900字必须同时落下状态变化、未解问题和下一章行动压力，不能只抛一句疑问或总结感悟。'
      : '',
  }
}

export function buildChapterHookSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = chapterHookContractForSync(contextPackage, chapter)
  const openingRisks = [
    ...scanOpeningHookRisks(chapterText),
    ...scanOpeningFirst50ConflictRisks(chapterText),
    ...scanOpeningEventDensityRisks(chapterText),
    ...scanOpeningProtagonistDelayRisks(chapterText),
  ]
  const endingRisks = [
    ...scanEndingHookRisks(chapterText),
    ...scanSuddenEndingClueRisks(chapterText),
  ]
  const checks = [
    normalizeChapterHookCheck(
      'opening_hook',
      '章首钩子',
      contract.opening_hook,
      chapterText,
      'opening',
      '前100字必须先给异常、危险、选择、冲突、对话逼问或规则触发；不要先铺风景、心情或背景。',
      22,
    ),
    buildChapterHookDeterministicCheck(
      'deterministic_opening_hook',
      '章首钩子',
      openingRisks,
      '前100字必须有钩子，前300字必须让主角带着冲突进入现场。',
      '重写前100-300字：用异常、危险、选择、对话逼问、动作截断或规则触发开局，并让主角立刻做出可见反应。',
    ),
    normalizeChapterHookCheck(
      'ending_hook',
      '章尾钩子',
      contract.ending_hook,
      chapterText,
      'ending',
      '最后100字必须留下可追读的问题、危险、发现、选择或反转，并和下一章行动直接相连。',
      24,
    ),
    buildChapterHookDeterministicCheck(
      'deterministic_ending_hook',
      '章尾钩子',
      endingRisks,
      '章尾必须留下下一章必须处理的问题，线索要有前文预热。',
      '重做最后100-300字：删总结升华，改成危机、决定、发现、物件变化、倒计时或未解问题；关键线索必须前文预热。',
    ),
    buildChapterHookDeterministicCheck(
      'opening_hook_echo',
      '开篇钩子回收',
      scanOpeningHookEchoRisks(chapterText),
      '开篇钩子必须在章尾被回收、升级、反转或转成下一章债务。',
      '章尾必须回应开篇抛出的证据、威胁、身份或异常：回收、升级、反转，或明确变成下一章要处理的问题。',
    ),
    buildChapterEndingContractCheck(contextPackage, chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = chapterHookPriority(missed)

  return {
    report_id: `chapter-hook-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '章级钩子未配置' : status === 'ok' ? '章级钩子 OK' : `章级钩子缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置章首/章尾钩子，建议补充 opening_hook、ending_hook 和 ending_contract。'
      : status === 'ok'
        ? '正文已基本兑现章首钩子、章尾钩子和章尾合同，开篇钩子有回收或承接。'
        : `正文有 ${missedCount} 项章级钩子缺口，${priorityRepair || '优先修章首和章尾翻页'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持章级钩子：前100字立刻给异常/冲突，最后100字留下下一章必须回应的问题。']
      : [
          '下一次修订必须补章级钩子：前100字先给冲突、异常、危险、选择或对话逼问，最后100字留下下一章必须处理的问题。',
          '章尾不要用总结、感悟或“新的开始”收束；关键线索必须有前文预热，开篇钩子必须在章尾被回收、升级或转成债务。',
        ],
  }
}

export function contextWithChapterRawPreDraftForSync(contextPackage: any = {}, chapter: any = {}) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const target = {
    ...(rawPayload?.context_package?.chapterTarget || {}),
    ...(rawPayload?.context_package?.chapter_target || {}),
    ...(rawPayload?.contextPackage?.chapterTarget || {}),
    ...(rawPayload?.contextPackage?.chapter_target || {}),
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const mergedPreDraftBrief = {
    ...(rawPayload?.context_package?.preDraftBrief || {}),
    ...(rawPayload?.context_package?.pre_draft_brief || {}),
    ...(rawPayload?.contextPackage?.preDraftBrief || {}),
    ...(rawPayload?.contextPackage?.pre_draft_brief || {}),
    ...(rawPayload?.pre_draft_brief || {}),
    ...(rawPayload?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(contextPackage?.preDraftBrief || {}),
    ...(target?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
  }
  const hasRuntimeChapterTarget = Boolean(contextPackage?.chapterTarget)
  const hasRawChapterTarget = Boolean(
    rawPayload?.context_package?.chapter_target
    || rawPayload?.context_package?.chapterTarget
    || rawPayload?.contextPackage?.chapter_target
    || rawPayload?.contextPackage?.chapterTarget,
  )
  if (!Object.keys(mergedPreDraftBrief).length && !hasRuntimeChapterTarget && !hasRawChapterTarget) return contextPackage
  return {
    ...(contextPackage || {}),
    chapter_target: target,
    chapterTarget: target,
    pre_draft_brief: mergedPreDraftBrief,
    preDraftBrief: mergedPreDraftBrief,
  }
}

export function paragraphHookContractForSync(project: any = {}, contextPackage: any = {}, chapter: any = {}) {
  return buildParagraphHookContract(project, contextWithChapterRawPreDraftForSync(contextPackage, chapter))
}

export function buildParagraphHookSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = paragraphHookContractForSync(project, contextPackage, chapter)
  const deterministicRisks = [
    ...scanParagraphHookStallRisks(chapterText),
    ...scanShockLayeringRisks(chapterText),
  ]
  const checks = [
    normalizeParagraphHookListCheck(
      'micro_hook_types',
      '微钩子类型',
      contract.micro_hook_types || contract.microHookTypes,
      chapterText,
      '按本章 paragraph_hook_contract 补出段落级钩子 11 种中的目标类型，并让它们带来信息、风险、情绪或关系变化。',
      { requireAll: false },
    ),
    normalizeParagraphHookCombinationCheck(contract.hook_combinations || contract.hookCombinations, chapterText),
    normalizeParagraphHookPresenceCheck(
      'dialogue_escalation',
      '对话递进',
      contract.dialogue_escalation || contract.dialogueEscalation,
      chapterText,
      /[“「][^”」]{1,80}[”」][\s\S]{0,200}(?:逼|命令|认罪|滚|闭嘴|必须|否则|你确定|你怕|跪下|交出|取消资格)|(?:逼|命令|认罪|滚|闭嘴|必须|否则|跪下|交出|取消资格)[\s\S]{0,200}[“「]/,
      '对话冲突必须体现递进：从事实/建议推进到指责、命令、威胁或压迫，不能只互相解释设定。',
    ),
    normalizeParagraphHookPresenceCheck(
      'spectator_layers',
      '围观者层级',
      contract.spectator_layers || contract.spectatorLayers,
      chapterText,
      /(?:长老|执事|审判庭|导师|考官|内行|熟人|敌对者|受害者|林青禾|权威|负责人|全场|众人).{0,80}(?:证明|看清|改口|脸色变|态度|局面|名单|资格|真相)/,
      '公开打脸、揭露或反证场景必须有中/高质量旁观者反应，并让反应改变舆论、权力、关系或下一步选择。',
    ),
    normalizeParagraphHookPresenceCheck(
      'unfair_injury',
      '不公平伤害',
      contract.unfair_injury_hooks || contract.unfairInjuryHooks,
      chapterText,
      /(?:逼|甩给|嫁祸|认罪|取消资格|承担|惩罚|损失|不公平|无辜|压迫|陷害|算计|做局|不留活路)/,
      '不公平伤害必须写成可见损失、压迫或责任转嫁，并让读者看见主角的反击窗口。',
    ),
    buildParagraphHookDeterministicCheck(deterministicRisks),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = paragraphHookPriority(missed)

  return {
    report_id: `paragraph-hook-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '段落钩子未配置' : status === 'ok' ? '段落钩子 OK' : `段落钩子缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 paragraph_hook_contract，建议补充微钩子类型、钩子组合、对话递进和围观者层级。'
      : status === 'ok'
        ? '正文已基本兑现段落级微钩子、钩子组合、对话递进、围观者层级和不公平伤害。'
        : `正文有 ${missedCount} 项段落钩子缺口，${priorityRepair || '优先补每 3-5 段的微推进'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持段落钩子：每 3-5 段都有信息、风险、情绪或关系变化，关键段落使用钩子组合。']
      : [
          '下一次修订必须补段落级钩子：每 3-5 段出现信息、风险、情绪或关系变化。',
          '关键段落至少使用一组钩子组合；对话要递进，公开打脸要有中/高质量围观者反应，不公平伤害要给反击窗口。',
        ],
  }
}

export function suspenseContractForSync(project: any = {}, contextPackage: any = {}, chapter: any = {}) {
  return buildSuspenseContract(project, contextWithChapterRawPreDraftForSync(contextPackage, chapter))
}

export function normalizeSuspenseExpectationChainContract(value: any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const activeLines = uniqueBriefStrings(asArray(value.active_lines || value.activeLines || value.lines).map((item: any) => compactBriefText(item)).filter(Boolean), 8)
  const carryRules = uniqueBriefStrings(asArray(value.carry_rules || value.carryRules || value.rules).map((item: any) => compactBriefText(item)).filter(Boolean), 8)
  const nextOpenLoop = uniqueBriefStrings(asArray(value.next_open_loop || value.nextOpenLoop || value.open_loop || value.openLoop).map((item: any) => compactBriefText(item)).filter(Boolean), 8)
  if (!activeLines.length && !carryRules.length && !nextOpenLoop.length) return null
  return {
    active_lines: activeLines,
    carry_rules: carryRules,
    next_open_loop: nextOpenLoop,
  }
}

export function suspenseExpectationLineMentioned(line: string, chapterText: string) {
  const text = String(chapterText || '')
  const rawLine = compactBriefText(line)
  const lineCore = rawLine
    .replace(/^(短期|中期|长期|远期)期待[:：]?\s*/g, '')
    .replace(/^(短期|中期|长期|远期)[:：]?\s*/g, '')
  if (!rawLine) return false
  if (text.includes(rawLine) || (lineCore && text.includes(lineCore))) return true
  return anchorMatchScore(rawLine, text).score >= 18 || (lineCore ? anchorMatchScore(lineCore, text).score >= 20 : false)
}

export function normalizeSuspenseExpectationChainCheck(value: any, expectationLayers: any, chapterText: string) {
  const contract = normalizeSuspenseExpectationChainContract(value)
  const fallbackLines = expectationThresholdArray(expectationLayers)
  if (!contract && !fallbackLines.length) return null
  const activeLines = contract?.active_lines?.length ? contract.active_lines : fallbackLines
  const carryRules = asArray(contract?.carry_rules)
  const nextOpenLoop = asArray(contract?.next_open_loop)
  const text = String(chapterText || '')
  const mentionedLines = activeLines.filter((line: string) => suspenseExpectationLineMentioned(line, text))
  const unresolvedSignals = /还没|未解|没有答案|新门槛|新线索|新困境|新期待|重新拉起|继续|下一|否则|必须|长期|中期|短期/.test(text)
  const ending = text.slice(-900)
  const hasEndingOpenLoop = /章尾|新门槛|新线索|新困境|新期待|重新拉起|还没|没有答案|下一|否则|必须|子时|长期|中期|短期/.test(ending)
  const explicitEmpty = /所有期待都兑现|期待都兑现|期待清空|没有新的期待|没有新期待|没有新的期待线|麻烦彻底消失|麻烦消失了|谜题彻底解决/.test(text)
  const enoughLines = mentionedLines.length >= Math.min(2, activeLines.length || 2)
  const delivered = !explicitEmpty && enoughLines && unresolvedSignals && hasEndingOpenLoop
  return {
    key: 'expectation_chain',
    label: '期待链',
    text: uniqueBriefStrings([
      activeLines.length ? `活跃期待线：${activeLines.join('、')}` : '',
      carryRules.length ? `承接规则：${carryRules.join('；')}` : '',
      nextOpenLoop.length ? `下一开环：${nextOpenLoop.join('；')}` : '',
    ], 8).join('；'),
    expected: '期待链不断裂：至少两条期待线并行，当前谜题兑现后必须留下新门槛、新线索、新困境或长期期待。',
    score: delivered ? 88 : explicitEmpty ? 14 : Math.max(30, [enoughLines, unresolvedSignals, hasEndingOpenLoop].filter(Boolean).length * 24),
    evidence: uniqueBriefStrings([
      mentionedLines.length ? `命中期待线：${mentionedLines.join('、')}` : '',
      unresolvedSignals ? '未解期待信号可见' : '',
      hasEndingOpenLoop ? '章尾新开环可见' : '',
      explicitEmpty ? '正文显式清空期待/麻烦消失' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !enoughLines ? '缺少至少两条并行期待线' : '',
      !unresolvedSignals ? '缺少未解期待或持续拉力' : '',
      !hasEndingOpenLoop ? '章尾缺少新门槛/新线索/新困境' : '',
      explicitEmpty ? '正文把期待链清空或让麻烦消失' : '',
    ], 8),
    issue: delivered ? '' : '期待链断裂：当前谜题兑现后没有保留至少两条期待线，或章尾没有新开环。',
    repair_instruction: delivered ? '' : '补期待链：至少两条期待线同时运行，当前谜题兑现后立刻留下新门槛、新线索、新困境或长期期待。',
  }
}

export function normalizeSuspenseForeshadowingBoundaryCheck(values: any, chapterText: string) {
  const planned = suspenseArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const mysteryBoxSignals = /故意不说|暂时不能说|以后会揭晓|日后自会知道|别问|不能告诉|作者故意|作者不说|只说很神秘|说不清原因/.test(text)
  const delayedWithoutProgress = /超过\s*3\s*章[^。！？\n]*(没有任何推进|无任何推进|中间没有推进)|信息延迟超过\s*3\s*章|三章[^。！？\n]*(没有任何推进|无任何推进|不推进)/.test(text)
  const hasSuspenseQuestion = /[？?]|到底|为什么|是谁|什么规则|藏着什么|疑问|问题/.test(text)
  const deniesAnswerPath = /不给提示|不给代价|不给可推理线索|不给线索|没有提示|没有线索|没有可推理|无提示|无线索/.test(text)
  const hasAnswerPath = !deniesAnswerPath && /提示|线索|证据|可查|可推理|水痕|划痕|门牌|旧铃铛|旧钥匙|钟声|缺页|代价|答案|公布|揭示|指向|证明/.test(text)
  const hasNaturalForeshadowing = /(旧铃铛|旧钥匙|门牌|水痕|划痕|缺页|夹页|旧印章|半枚|钟声|符号|旧物|物件)[^。！？\n]{0,80}(顺手|随口|擦干|收起|收进|看见|碰到|压住|夹着|露出|哑火|短短|再次|又|仍|还没|继续)|(顺手|随口|擦干|收起|收进|看见|碰到|压住|夹着|露出|哑火|短短|再次|又)[^。！？\n]{0,80}(旧铃铛|旧钥匙|门牌|水痕|划痕|缺页|夹页|旧印章|半枚|钟声|符号|旧物|物件)/.test(text)
  const hasProgress = /推进|第二次|再次|又|仍|继续|重新|看见|确认|查|追查|答案|公布|揭示|指向|证明|还没查完|没查完/.test(text)
  const confusedTerms = /把悬念当伏笔|把伏笔当悬念|悬念伏笔混淆|短期紧张[^。！？\n]*长期伏笔|长期线索[^。！？\n]*短期悬念/.test(text)
  const hasLongForeshadowingIntent = /伏笔|长期线索|旧铃铛|旧钥匙|门牌水痕|水痕|划痕|旧物|物件|后续揭示|原来如此/.test(text)
  const hasBoundary = hasSuspenseQuestion && hasAnswerPath && hasProgress && (!hasLongForeshadowingIntent || hasNaturalForeshadowing)
  const delivered = hasBoundary && !mysteryBoxSignals && !delayedWithoutProgress && !confusedTerms
  return {
    key: 'foreshadowing_boundary_rules',
    label: '悬念伏笔边界',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(10, [hasSuspenseQuestion, hasAnswerPath, hasNaturalForeshadowing, hasProgress, !mysteryBoxSignals, !delayedWithoutProgress, !confusedTerms].filter(Boolean).length * 12),
    evidence: uniqueBriefStrings([
      hasSuspenseQuestion ? '短期疑问/悬念可见' : '',
      hasAnswerPath ? '提示/线索/答案路径可见' : '',
      hasNaturalForeshadowing ? '长期线索自然融入动作或物件' : '',
      hasProgress ? '延迟信息有推进或回声' : '',
      mysteryBoxSignals ? '故意藏信息/以后揭晓' : '',
      delayedWithoutProgress ? '信息延迟超过3章且中间无推进' : '',
      confusedTerms ? '悬念和伏笔混淆' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      mysteryBoxSignals ? '故意藏信息像谜语人' : '',
      delayedWithoutProgress ? '信息延迟超过3章且中间无推进' : '',
      confusedTerms ? '悬念和伏笔混淆' : '',
      !hasSuspenseQuestion ? '缺短期悬念疑问' : '',
      !hasAnswerPath ? '缺少可推理提示/代价/自然线索' : '',
      hasLongForeshadowingIntent && !hasNaturalForeshadowing ? '长期伏笔没有自然融入动作或物件' : '',
      !hasProgress ? '延迟信息缺少推进或回声' : '',
    ], 8),
    issue: delivered ? '' : '悬念和伏笔边界不清：短期紧张没有答案路径，长期线索没有自然融入或推进，容易变成谜语人。',
    repair_instruction: delivered ? '' : '补悬念伏笔边界：伏笔不是谜语人；短期紧张要给疑问、提示、代价或答案路径，长期伏笔要藏进动作、物件、误判或环境回声，并在延迟期间持续推进。信息延迟超过3章且中间无推进时，删掉或提前给。',
  }
}

export function buildSuspenseDeterministicCheck(chapterText: string) {
  const risks = [
    ...scanSuspenseFalseAlarmRisks(chapterText),
    ...scanSuspenseWithheldInfoRisks(chapterText),
    ...scanObscureSuspenseRisks(chapterText),
  ]
  if (!risks.length) return null
  return {
    key: 'suspense_forbidden',
    label: '悬念禁忌',
    text: '悬念不能是假悬念、无理由藏信息或故弄玄虚。',
    expected: '悬念不能是假悬念、无理由藏信息或故弄玄虚。',
    score: Math.max(0, 100 - risks.length * 22),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项悬念禁忌确定性风险。`,
    repair_instruction: '按 oh-story 悬念禁忌修复：威胁不能立刻解除，藏信息要有理由/代价/线索，神秘词必须落成具体物件、规则、倒计时或角色选择。',
  }
}

export function buildSuspenseSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = suspenseContractForSync(project, contextPackage, chapter)
  const checks = [
    normalizeSuspenseListCheck(
      'information_order',
      '信息顺序',
      contract.information_order_templates || contract.informationOrderTemplates,
      chapterText,
      '按四种悬念信息顺序模板重排：先提出疑问，再给正常提示或可信误导，最后公布答案或延迟引爆。',
      { requireAll: false },
    ),
    normalizeSuspenseStrengthCheck(contract.suspense_strength || contract.suspenseStrength, chapterText),
    normalizeSuspenseListCheck(
      'suspense_cycle',
      '三段钩子',
      contract.suspense_cycle || contract.suspenseCycle,
      chapterText,
      '按种、养、收修复：前30%提出可追问题，中50%提示/误导/加压，末20%引爆或延迟引爆到下一章。',
      { requireAll: true },
    ),
    normalizeSuspenseListCheck(
      'trigger_layers',
      '触发分层',
      contract.trigger_layers || contract.triggerLayers,
      chapterText,
      '触发型分层钩子必须逐层展示成果、非最终结果、超预期元素和下一段钩子，并给角色反应验证力度。',
      { requireAll: false },
    ),
    normalizeSuspenseListCheck(
      'expectation_layers',
      '期待接力',
      contract.expectation_layers || contract.expectationLayers,
      chapterText,
      '保持两长一短：短期期待爆发后立刻生成新问题，中长期期待继续保温，不能让麻烦解决后消失。',
      { requireAll: false },
    ),
    normalizeSuspenseExpectationChainCheck(
      contract.expectation_chain || contract.expectationChain,
      contract.expectation_layers || contract.expectationLayers,
      chapterText,
    ),
    normalizeSuspenseForeshadowingBoundaryCheck(contract.foreshadowing_boundary_rules || contract.foreshadowingBoundaryRules, chapterText),
    normalizeSuspenseListCheck(
      'shock_layers',
      '震惊分层',
      contract.shock_layers || contract.shockLayers,
      chapterText,
      '震惊必须有点、网、深度或高位者反应，并伴随信息展露、关系进展、局势变化或可视化道具变化。',
      { requireAll: false },
    ),
    buildSuspenseDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = suspensePriority(missed)

  return {
    report_id: `suspense-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '悬念编排未配置' : status === 'ok' ? '悬念编排 OK' : `悬念缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 suspense_contract，建议补充信息顺序、悬念强度、种养收、期待接力和震惊分层。'
      : status === 'ok'
        ? '正文已基本兑现悬念信息顺序、强度、种养收、期待接力和震惊分层。'
        : `正文有 ${missedCount} 项悬念编排缺口，${priorityRepair || '优先补疑问、提示、答案和新期待'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持悬念编排：疑问、提示/误导、答案、新期待、至少两条期待线和角色反应持续成链。']
      : [
          '下一次修订必须补悬念编排：先提出疑问，再给可信提示或误导，最后公布答案或延迟引爆，并立起新期待。',
          missed.some((item: any) => item.key === 'foreshadowing_boundary_rules') ? '补悬念伏笔边界：伏笔不是谜语人，短期悬念要有答案路径，长期伏笔要自然融入动作/物件/误判并持续推进；信息延迟超过3章且中间无推进就提前给或删掉。' : '',
          missed.some((item: any) => item.key === 'expectation_chain') ? '补期待链：至少两条期待线同时运行，当前谜题兑现后立刻留下新门槛、新线索、新困境或长期期待。' : '',
          '解决一个麻烦后必须打开新困境；威胁不能立刻无代价解除，藏信息必须有理由、代价或可推理线索。',
      ].filter(Boolean),
  }
}

export function reversalContractForSync(project: any = {}, contextPackage: any = {}, chapter: any = {}) {
  return buildReversalContract(project, contextWithChapterRawPreDraftForSync(contextPackage, chapter))
}

export function buildReversalDeterministicCheck(chapterText: string) {
  const text = String(chapterText || '')
  const risks = [
    ...scanFaceSlapRhythmRisks(chapterText),
    ...scanEvidenceChainDumpRisks(chapterText),
    ...scanFinalEvidenceImpactRisks(chapterText),
    ...scanEvidenceTimeBombRisks(chapterText),
    ...scanAntagonistDownfallAgencyRisks(chapterText),
  ].filter((risk: any) => {
    if (risk?.key !== 'evidence_chain_dumped_once') return true
    return !/分批|逐步|一层|第二层|第三层|先[^。！？!?]{0,40}再[^。！？!?]{0,40}(?:最后|最终)|提前备份|提前布局/.test(text)
  })
  if (!risks.length) return null
  return {
    key: 'reversal_forbidden',
    label: '反转毒点',
    text: '反转不能缺压迫、一次性倒证据、最终证据无影响、缺提前布局或让外力替主角清算。',
    expected: '反转不能缺压迫、一次性倒证据、最终证据无影响、缺提前布局或让外力替主角清算。',
    score: Math.max(0, 100 - risks.length * 22),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项反转确定性风险。`,
    repair_instruction: '按 oh-story 反转/证据链修复：先压迫，证据分批释放，最终证据改变全局，至少有一个提前布局，反派结局必须由主角行动导致。',
  }
}

export function buildReversalSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = reversalContractForSync(project, contextPackage, chapter)
  const setupCheck = normalizeReversalSetupCheck(contract, chapterText)
  const checks = [
    normalizeReversalTypeCheck(contract.reversal_types || contract.reversalTypes, chapterText),
    setupCheck,
    normalizeReversalMisdirectionCheck(contract.misdirection_methods || contract.misdirectionMethods, chapterText),
    normalizeReversalTimingCheck(contract.timing_rules || contract.timingRules, chapterText, setupCheck),
    normalizeReversalImpactCheck(chapterText),
    normalizeReversalFaceSlapCheck(contract.face_slap_rhythm || contract.faceSlapRhythm, chapterText),
    buildReversalDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = reversalPriority(missed)

  return {
    report_id: `reversal-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '反转设计未配置' : status === 'ok' ? '反转设计 OK' : `反转缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 reversal_contract，建议补充反转类型、3处暗示、公平误导、揭示时机、揭示后影响和打脸节奏。'
      : status === 'ok'
        ? '正文已基本兑现反转类型、3处暗示、公平误导、揭示时机、揭示后影响和打脸节奏。'
        : `正文有 ${missedCount} 项反转设计缺口，${priorityRepair || '优先补3处暗示、公平误导和揭示后影响'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持反转设计：反转前有公平暗示和误导，揭示后改变局势，并形成打脸闭环。']
      : [
          '下一次修订必须补反转设计：补足3处暗示、公平误导、揭示时机、揭示后影响和打脸节奏。',
          '删除天降反转和大段解释；证据分批释放，最终证据必须改变全局，反派结局必须由主角行动导致。',
      ],
  }
}

export function showdownContractForSync(project: any = {}, contextPackage: any = {}, chapter: any = {}) {
  return buildShowdownContract(project, contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function buildShowdownDeterministicCheck(chapterText: string) {
  const risks = [
    ...scanShockLayeringRisks(chapterText),
    ...scanSpectatorReactionDifferentiationRisks(chapterText),
    ...scanCombatProcessRisks(chapterText),
    ...scanPayoffDensityRisks(chapterText),
    ...scanPayoffEscalationRisks(chapterText),
    ...scanTrumpCardEffectRisks(chapterText),
    ...scanLocalVictoryCostRisks(chapterText),
  ]
  if (!risks.length) return null
  return {
    key: 'showdown_forbidden',
    label: '高潮毒点',
    text: '高潮对抗不能只有统一震惊、跳过动作过程、爽点密度不足、重复兑现、底牌无效果或胜利无新代价。',
    expected: '高潮对抗不能只有统一震惊、跳过动作过程、爽点密度不足、重复兑现、底牌无效果或胜利无新代价。',
    score: Math.max(0, 100 - risks.length * 18),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项高潮对抗确定性风险。`,
    repair_instruction: '按 oh-story 高潮对抗修复：补动作过程、爽点回报、震惊分层、底牌效果、胜利后新代价或新目标。',
  }
}

export function showdownExplicitRuleKeys(contextPackage: any = {}) {
  const explicit = showdownExplicitContract(contextPackage)
  if (!explicit || typeof explicit !== 'object' || Array.isArray(explicit)) return new Set<string>()
  const fields = [
    ['payoff_release', 'payoff_release_rules', 'payoffReleaseRules'],
    ['trump_card_reserve', 'trump_card_reserve_rules', 'trumpCardReserveRules'],
    ['three_pressure_shock', 'three_pressure_shock_rules', 'threePressureShockRules'],
    ['stage_chain', 'stage_chain_rules', 'stageChainRules'],
    ['transmission_channel', 'transmission_channel_rules', 'transmissionChannelRules'],
    ['shock_chain', 'shock_chain_rules', 'shockChainRules'],
    ['combat_design', 'combat_design_rules', 'combatDesignRules'],
    ['weak_over_strong', 'weak_over_strong_rules', 'weakOverStrongRules'],
    ['counterplay_layers', 'counterplay_layers', 'counterplayLayers'],
    ['emotion_rhythm', 'emotion_rhythm_rules', 'emotionRhythmRules'],
  ]
  return new Set(fields
    .filter(([, snake, camel]) => asArray(explicit?.[snake] || explicit?.[camel]).length > 0)
    .map(([key]) => key))
}

export function buildShowdownSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const mergedContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const contract = showdownContractForSync(project, contextPackage, chapter)
  const explicitRuleKeys = showdownExplicitRuleKeys(mergedContextPackage)
  const checks = [
    normalizeShowdownPayoffCheck(contract.payoff_release_rules || contract.payoffReleaseRules, chapterText),
    normalizeShowdownTrumpCardReserveCheck(contract.trump_card_reserve_rules || contract.trumpCardReserveRules, chapterText),
    normalizeShowdownThreePressureShockCheck(contract.three_pressure_shock_rules || contract.threePressureShockRules, chapterText),
    normalizeShowdownStageCheck(contract.stage_chain_rules || contract.stageChainRules, chapterText),
    normalizeShowdownTransmissionChannelCheck(contract.transmission_channel_rules || contract.transmissionChannelRules, chapterText),
    normalizeShowdownShockCheck(contract.shock_chain_rules || contract.shockChainRules, chapterText),
    normalizeShowdownCombatCheck(contract.combat_design_rules || contract.combatDesignRules, chapterText),
    normalizeShowdownWeakOverStrongCheck(contract.weak_over_strong_rules || contract.weakOverStrongRules, chapterText),
    normalizeShowdownCounterplayCheck(contract.counterplay_layers || contract.counterplayLayers, chapterText),
    normalizeShowdownEmotionRhythmCheck(contract.emotion_rhythm_rules || contract.emotionRhythmRules, chapterText),
    buildShowdownDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = showdownPriority(missed, explicitRuleKeys)

  return {
    report_id: `showdown-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '高潮对抗未配置' : status === 'ok' ? '高潮对抗 OK' : `高潮缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 showdown_contract，建议补充爽点释放、底牌管理、三压一爆三震、舞台层级、传递通道、震惊分层、战斗/智斗逻辑、以弱胜强依据和急-缓-急节奏。'
      : status === 'ok'
        ? '正文已基本兑现爽点释放、底牌管理、三压一爆三震、舞台层级、传递通道、震惊分层、战斗/智斗逻辑、以弱胜强依据、三层破局和急-缓-急节奏。'
        : `正文有 ${missedCount} 项高潮对抗缺口，${priorityRepair || '优先补爽点释放、底牌管理、三压一爆三震、舞台层级和震惊分层'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持高潮对抗：底牌释放后对手受到压制，每次只出1个底牌并留下2-3个未揭示后手；爆发前完成友好势力、敌方势力、中立势力三路铺压，爆发后分别写三方震动；群众层/中间层/核心层有差异反应，并有关系/利益传递通道把结果扩散出去；战斗服务爽点，强敌破局显得主角早一层。']
      : [
          '下一次修订必须补高潮对抗：补爽点释放、底牌管理、三压一爆三震、舞台层级、传递通道、震惊分层、战斗/智斗逻辑、以弱胜强依据和急-缓-急节奏。',
          missed.some((item: any) => item.key === 'trump_card_reserve') ? '补底牌管理：每次只出1个底牌，只解决当前矛盾关键扣；保留2-3个未揭示底牌，并补新技能、新后手、新目标或更高门槛。' : '',
          missed.some((item: any) => item.key === 'three_pressure_shock') ? '补三压一爆三震：友好势力先觉得主角是大佬，敌方势力两次不服并逼主角上，中立势力给第三重压力；主角一爆碾压后，友方、敌方、中立方各自震动。' : '',
          missed.some((item: any) => item.key === 'counterplay_layers') ? '补三层破局：写清预判反制和反预判，反派出A，主角早准备B克制A；反派针对A时，主角利用A作陷阱引入预设B。' : '',
          missed.some((item: any) => item.key === 'transmission_channel') ? '补传递通道：先铺主角与关键旁观者的旧情、救助、利益或认可，再让爽点经由群众层/中间层/核心层向上或反向传回，改变态度、声望、资源或规则评价。' : '',
          '底牌释放后必须压制对手；群众层、中间层、核心层要有不同反应；战斗/智斗必须展示主角收获并承接新目标。',
      ].filter(Boolean),
  }
}

export function bridgeUnitContractForSync(project: any = {}, contextPackage: any = {}, chapter: any = {}) {
  return buildBridgeUnitContract(project, contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function buildBridgeUnitDeterministicCheck(chapterText: string) {
  const risks = [
    ...scanExpectationVacuumRisks(chapterText),
    ...scanLocalVictoryCostRisks(chapterText),
  ]
  if (!risks.length) return null
  return {
    key: 'bridge_forbidden',
    label: '桥段断档',
    text: '桥段不能旧期待兑现后空窗，也不能局部胜利没有新代价、新风险或下一目标。',
    expected: '桥段不能旧期待兑现后空窗，也不能局部胜利没有新代价、新风险或下一目标。',
    score: Math.max(0, 100 - risks.length * 22),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项桥段节奏确定性风险。`,
    repair_instruction: '按 oh-story 桥段节奏修复：旧期待兑现前挂新期待，局部胜利后给新代价、新风险、下一目标或承接余波。',
  }
}

export function buildBeatCoolingSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const sequence = beatCoolingSequence(chapter, contextPackage, chapterText)
  const checks: any[] = []
  if (sequence.length > 0) {
    const tailConflictRun: any[] = []
    for (let index = sequence.length - 1; index >= 0; index -= 1) {
      if (sequence[index]?.beat_type !== 'conflict_thrill') break
      tailConflictRun.unshift(sequence[index])
    }
    if (tailConflictRun.length > 2) {
      checks.push({
        key: 'conflict_thrill_overrun',
        label: '大冲突冷却',
        text: 'conflict_thrill 最多连续 2 章。',
        expected: '大冲突/打斗后必须轮换到关系深化、世界观展开、势力建设或压力升级的不同节拍。',
        score: 34,
        delivered: false,
        status: 'warn',
        evidence: [`连续 ${tailConflictRun.length} 章 conflict_thrill：${tailConflictRun.map(item => `第${item.chapter_no || '?'}章${item.label ? `《${item.label}》` : ''}`).join('、')}`],
        missed_items: ['大冲突连续超出冷却线'],
        issue: '连续大冲突/打斗超过 oh-story 冷却线，容易让章节读感单一和疲劳。',
        repair_instruction: '下一章轮换桥段类型：优先写关系深化、世界观展开、势力建设或冲突余波，而不是继续开打。',
      })
    }
    const recentFive = sequence.slice(-5)
    const hasTextureBeat = recentFive.some((item: any) => ['bond_deepening', 'world_painting'].includes(String(item?.beat_type || '')))
    if (recentFive.length >= 5 && !hasTextureBeat) {
      checks.push({
        key: 'five_chapter_texture_gap',
        label: '五章调剂',
        text: '每 5 章必须包含 bond_deepening 或 world_painting。',
        expected: '最近 5 章至少有一章推进关系质变或展开可记忆的世界观/地图/制度信息。',
        score: 40,
        delivered: false,
        status: 'warn',
        evidence: [`最近 5 章节拍：${recentFive.map(item => `${item.chapter_no ? `第${item.chapter_no}章` : '本章'}${BEAT_COOLING_LABELS[item.beat_type] || item.beat_type || item.label}`).join('、')}`],
        missed_items: ['最近五章缺关系深化或世界观展开'],
        issue: '最近五章缺少关系深化或世界观展开，连续压迫/冲突会削弱连载层次。',
        repair_instruction: '下一章补关系深化或世界观展开：让人物关系、组织结构、地图规则或制度代价发生可见变化。',
      })
    }
  }
  if (!checks.length) {
    checks.push({
      key: 'beat_cooling_ok',
      label: '节奏冷却',
      text: '事件类型冷却未触发风险。',
      expected: '大冲突不过量，最近五章有关系/世界观调剂。',
      score: 88,
      delivered: true,
      status: 'ok',
      evidence: sequence.length ? [`节拍序列：${sequence.slice(-5).map(item => BEAT_COOLING_LABELS[item.beat_type] || item.beat_type || item.label).join('、')}`] : ['未提供最近章节节拍，使用当前正文弱推断未触发风险'],
      missed_items: [],
      issue: '',
      repair_instruction: '',
    })
  }
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length)))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = beatCoolingPriority(missed)
  return {
    report_id: `beat-cooling-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '节奏冷却 OK' : `节奏冷却缺口 ${missedCount}`,
    summary: status === 'ok'
      ? '最近章节节拍未触发 oh-story 事件冷却风险。'
      : `最近章节触发 ${missedCount} 项事件冷却风险，${priorityRepair || '优先轮换事件类型'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    recent_beats: sequence.slice(-8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持事件冷却：大冲突后轮换关系深化、世界观展开、势力建设或压力升级，避免同类桥段连续堆叠。']
      : [
          '下一章优先轮换桥段类型：大冲突后补关系深化、世界观展开、势力建设或冲突余波。',
          '最近五章缺调剂时，必须让关系、地图规则、组织结构或制度代价发生可见变化。',
        ],
  }
}

export function buildBridgeUnitSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = bridgeUnitContractForSync(project, contextPackage, chapter)
  const checks = [
    normalizeBridgePositionCheck(contract.bridge_position || contract.bridgePosition, chapterText),
    normalizeBridgePlanCheck(contract.bridge_unit_plan || contract.bridgeUnitPlan, chapterText),
    normalizeBridgeExpectationChainCheck(contract.expectation_chain_rules || contract.expectationChainRules, chapterText),
    normalizeBridgeTargetProgressCheck(chapterText),
    normalizeBridgeClimaxDurationCheck(contract.climax_duration_rules || contract.climaxDurationRules, chapterText),
    normalizeBridgeTransitionCheck(contract.transition_rules || contract.transitionRules, chapterText),
    normalizeBridgeFatigueRepairCheck(contract.fatigue_repair_rules || contract.fatigueRepairRules, chapterText),
    buildBridgeUnitDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = bridgeUnitPriority(missed)

  return {
    report_id: `bridge-unit-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '桥段节奏未配置' : status === 'ok' ? '桥段节奏 OK' : `桥段缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 bridge_unit_contract，建议补充桥段位置、连续期待、目标推进、高潮时长、阶段衔接和疲劳修复。'
      : status === 'ok'
        ? '正文已基本兑现桥段位置、连续期待、目标推进、高潮时长、阶段衔接和疲劳修复。'
        : `正文有 ${missedCount} 项桥段节奏缺口，${priorityRepair || '优先补连续期待、章尾新目标和目标推进'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持桥段节奏：旧期待兑现前挂新期待，目标推进可见，章尾继续给下一步目标。']
      : [
          '下一次修订必须补桥段节奏：补连续期待、桥段位置、目标推进、高潮中埋钩子、章尾新目标和承接余波。',
          '旧期待兑现前必须挂新期待；连续 2 章没有目标推进时提高冲突密度，连续只爆点时补关系/伏笔/状态承接余波。',
      ],
  }
}

export function openingContractForSync(project: any = {}, contextPackage: any = {}, chapter: any = {}) {
  return buildOpeningContract(project, contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function buildOpeningForbiddenCheck(project: any, contextPackage: any, chapterText: string) {
  const risks = [
    ...scanOpeningHookRisks(chapterText),
    ...scanOpeningFirst50ConflictRisks(chapterText),
    ...scanOpeningEventDensityRisks(chapterText),
    ...scanOpeningProtagonistDelayRisks(chapterText),
    ...scanEntryPromiseAlignmentRisks(project, contextPackage, chapterText),
    ...scanOpeningConflictAlignmentRisks(contextPackage, chapterText),
  ]
  if (!risks.length) return null
  return {
    key: 'opening_forbidden',
    label: '开篇禁忌',
    text: '开头不得以大段背景、纯天气风景、序章楔子、详细世界观、回忆梦境或低事件密度拖慢。',
    expected: '开头不得以大段背景、纯天气风景、序章楔子、详细世界观、回忆梦境或低事件密度拖慢。',
    score: Math.max(0, 100 - risks.length * 18),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项开篇确定性风险。`,
    repair_instruction: '按 oh-story 开篇设计修复：前50字有冲突/异常，前100字事件密度足，前300字主角入场，前1000字给期待点。',
  }
}

export function buildOpeningSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = openingContractForSync(project, contextPackage, chapter)
  const checks = [
    normalizeOpeningProtagonistCheck(contract.required_beats || contract.requiredBeats, chapterText),
    normalizeOpeningExpectationCheck([...(contract.required_beats || contract.requiredBeats || []), ...(contract.opening_plan || contract.openingPlan || [])], chapterText),
    normalizeOpeningFoundationCheck(contract.foundation_points || contract.foundationPoints, chapterText),
    normalizeOpeningGoalAndHookCheck(chapterText),
    normalizeOpeningFiveEssentialsCheck(contract.five_essentials_rules || contract.fiveEssentialsRules, chapterText),
    normalizeOpeningInformationCheck(contract.information_priority || contract.informationPriority, chapterText),
    buildOpeningForbiddenCheck(project, contextPackage, chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = openingPriority(missed)

  return {
    report_id: `opening-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '开篇设计未配置' : status === 'ok' ? '开篇设计 OK' : `开篇缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 opening_contract，建议补充前300字主角登场、1000字期待点、三大基点、目标卖点、开头五要诀和信息释放顺序。'
      : status === 'ok'
        ? '正文已基本兑现前300字主角登场、1000字期待点、三大基点、目标卖点、开头五要诀和信息分批释放。'
        : `正文有 ${missedCount} 项开篇设计缺口，${priorityRepair || '优先补前300字主角登场、1000字期待点和三大基点'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持开篇设计：前300字主角带压入场，前1000字有期待点，三大基点、开头五要诀和目标卖点持续兑现。']
      : [
          '下一次修订必须补开篇设计：重做前300字主角登场，1000字内补爽点/期待点、三大基点、主角目标和本文卖点。',
          '补开头五要诀：简单/不偏/快/爽/不平同时落地，第一章要让读者立刻知道谁在哪里、遇到什么、为什么要做、要做什么。',
          '删除纯天气风景、大段背景、详细世界观和低事件密度开头；信息按危机感、人设、金手指暗示、世界观分批进入。',
      ],
  }
}

export function proseCraftContractForSync(project: any = {}, contextPackage: any = {}, chapter: any = {}) {
  return buildProseCraftContract(project, contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function proseCraftArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => compactBriefText(item)).filter(Boolean), 20)
}

export function normalizeProseCraftPovCheck(values: any[], chapterText: string) {
  const planned = proseCraftArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasGodView = /他不知道的是|她不知道的是|此时的[他她][^。！？!?]{0,12}还不知道|如果[他她][^。！？!?]{0,12}知道真相|所有人都(?:已经)?(?:看穿|知道|发现)|没人知道|无人知道/.test(text)
  const closeAnchorCount = (text.match(/看见|听见|闻到|摸到|触到|盯着|低头|抬头|手腕|指尖|呼吸|肩|背|喉咙|眼|纸页|桌沿/g) || []).length
  const delivered = !hasGodView && closeAnchorCount >= 2
  return {
    key: 'pov_rules',
    label: '深度限知',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 90 : Math.max(24, (!hasGodView ? 42 : 0) + Math.min(36, closeAnchorCount * 12)),
    evidence: delivered ? ['限知镜头', '身体/感官锚点'] : (hasGodView ? ['上帝视角预告'] : []),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '正文没有稳定锁在角色当下感知，或出现“他不知道的是/如果知道真相”等上帝视角预告。',
    repair_instruction: delivered ? '' : '补深度限知：删除上帝预告，只写角色此刻看见、听见、触到、身体感到和能当场推断出的信息。',
  }
}

export function normalizeProseCraftExpressionCheck(values: any[], chapterText: string) {
  const planned = proseCraftArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const emotionHits = (text.match(/(?:很|非常|十分|无比)?(?:愤怒|悲伤|委屈|难过|害怕|恐惧|绝望|痛苦|慌乱|紧张|不安|压抑)|感到[^。！？!?]{0,12}(?:愤怒|悲伤|委屈|害怕|绝望|痛苦)|心里[^。！？!?]{0,12}(?:难受|委屈|害怕|绝望|悲伤)/g) || []).length
  const bodyHits = (text.match(/手腕|指尖|指节|呼吸|肩背|肩|背|喉咙|眼眶|牙|嘴唇|旧疤|伤疤|血|汗|停了一下|绷紧|攥|握|按|推|翻|抬头|低头/g) || []).length
  const delivered = bodyHits >= 3 && emotionHits <= 1
  return {
    key: 'expression_rules',
    label: '身体细节',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(20, Math.min(56, bodyHits * 14) + (emotionHits ? 0 : 24)),
    evidence: delivered ? ['身体/动作替代情绪词'] : (emotionHits ? [`抽象情绪词 ${emotionHits} 处`] : []),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '情绪没有充分落到身体、动作、对话或选择代价，仍偏抽象说明。',
    repair_instruction: delivered ? '' : '把愤怒、悲伤、委屈、害怕等抽象词改成手、呼吸、肩背、旧疤、动作停顿、对白反应或可见选择。',
  }
}

export function normalizeProseCraftSceneWeavingCheck(values: any[], chapterText: string) {
  const planned = proseCraftArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasEvent = /推|翻|问|递|压|拿|承认|确认|逼|锁死|暴露|推进|出现|改变|落地|打开/.test(text)
  const hasPerceptionOrObject = /看见|听见|盯着|纸页|账本|转账单|旧疤|桌沿|封皮|名单|证据|尾号/.test(text)
  const hasBodyResponse = /手腕|指尖|呼吸|肩背|肩|背|喉咙|停了一下|绷紧|低头|抬头|攥|握|按/.test(text)
  const delivered = hasEvent && hasPerceptionOrObject && hasBodyResponse
  return {
    key: 'scene_weaving_rules',
    label: '三维度揉进',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(24, [hasEvent, hasPerceptionOrObject, hasBodyResponse].filter(Boolean).length * 28),
    evidence: [hasEvent ? '事件推进' : '', hasPerceptionOrObject ? '感知/物件' : '', hasBodyResponse ? '身体回应' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '详写子事件没有同时交付发生了什么、主角注意到什么、身体怎么回应。',
    repair_instruction: delivered ? '' : '按三维度揉进重写：同一现场必须有事件推进、感官/物件锚点和身体反应，不能拆成空泛解释。',
  }
}

export function normalizeProseCraftRhythmCheck(values: any[], chapterText: string) {
  const planned = proseCraftArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasAction = /推|翻|问|递|压|拿|走|停|按|锁|打开|抬|低|逼|承认|确认|改变/.test(text)
  const hasStillBeat = /静下来|停了一下|没有抬头|盯着|沉默|等|屋里静|只把|半寸|尾号/.test(text)
  const delivered = hasAction && hasStillBeat
  return {
    key: 'rhythm_rules',
    label: '一动一静',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 84 : Math.max(28, [hasAction, hasStillBeat].filter(Boolean).length * 36),
    evidence: [hasAction ? '动作推进' : '', hasStillBeat ? '静态观察/停顿' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '正文缺少动作推进和静态观察的交替，容易全动疲劳或全静拖沓。',
    repair_instruction: delivered ? '' : '补一动一静：冲突推进后安排短暂停顿、观察或身体反应；静态段后立刻用动作或信息变化推进。',
  }
}

export function normalizeProseCraftObjectNumberCheck(values: any[], sceneAnchors: any[], chapterText: string) {
  const planned = proseCraftArray(values, sceneAnchors)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasNumber = /[零一二三四五六七八九十百千万亿\d]+(?:块|万|年|天|次|页|号|寸|份)|\d+/.test(text)
  const hasObject = /账本|账册|转账单|旧疤|伤疤|名单|证据|印章|桌沿|封皮|纸页|尾号/.test(text)
  const hasFunction = /承认|确认|锁死|改变|推进|暴露|抬高|代价|风向|证据|逼|目标|签收|对应/.test(text)
  const delivered = hasNumber && hasObject && hasFunction
  return {
    key: 'object_number_rules',
    label: '道具/数字功能',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(24, [hasNumber, hasObject, hasFunction].filter(Boolean).length * 28),
    evidence: [hasNumber ? '具体数字' : '', hasObject ? '贯穿道具' : '', hasFunction ? '剧情/情绪功能' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '具体数字或道具没有承担剧情、情绪、证据或关系变化功能。',
    repair_instruction: delivered ? '' : '补道具/数字功能：让金额、次数、时间、账本、旧疤、名单等改变现场判断、代价、证据链或读者理解。',
  }
}

export function normalizeProseCraftSectionStructureCheck(values: any[], chapterText: string) {
  const planned = proseCraftArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const paragraphCount = proseParagraphsWithoutTitle(text).length
  const eventHits = (text.match(/推|翻|问|递|压|拿|承认|确认|逼|锁死|暴露|推进|出现|改变|接住|核对|签|敲|按|亮出|停住/g) || []).length
  const dialogueTurns = (text.match(/[“"][^”"\n]{1,80}[”"]/g) || []).length
  const hasMainEvent = /主事件|目标|必须|先用|从[^。！？!?]{0,24}变成|逼|核对|签|确认|承认|推进|改变|暴露|锁死/.test(text)
  const hasSubEvents = eventHits >= 5 || paragraphCount >= 6
  const hasEmotionChange = /第一次|停住|失控|倒戈|沉默|笑意|绷紧|震惊|改口|风向|情绪|从[^。！？!?]{0,18}到/.test(text)
  const hasNewInfo = /发现|确认|暴露|露出|线索|尾号|缺页|转账单|印章|证据|信息|新获知|位置|签收/.test(text)
  const hasDialogueExchange = dialogueTurns >= 3 || /独自发现|翻阅|标零/.test(text)
  const hasHookBridge = /下一节|接住|立刻接|随即|马上|门外|敲|背后|下一|必须接|钩子|露出|未解|指向/.test(text)
  const hasResetPadding = /重新铺垫|又从[^。！？!?]{0,12}开始|事情要从|清晨的光|夜色落下来|天气|风景|回忆起很久以前|大厅很宽|墙壁很旧|空气显得/.test(text)
  const hasEmotionDrop = /突然平静|骤然冷掉|情绪掉下去|毫无波澜|恢复平静|回到平静|等待事情结束/.test(text)
  const delivered = hasMainEvent
    && hasSubEvents
    && hasEmotionChange
    && hasNewInfo
    && hasDialogueExchange
    && hasHookBridge
    && !hasResetPadding
    && !hasEmotionDrop
  const evidence = [
    hasMainEvent ? '主事件' : '',
    hasSubEvents ? '3-5子事件/多动作推进' : '',
    hasEmotionChange ? '情绪变化' : '',
    hasNewInfo ? '读者新信息' : '',
    hasDialogueExchange ? '对话交锋/独自发现豁免' : '',
    hasHookBridge ? '小节钩子接续' : '',
    !hasResetPadding ? '无重新铺垫' : '',
    !hasEmotionDrop ? '情绪未骤降' : '',
  ].filter(Boolean)
  return {
    key: 'section_structure_rules',
    label: '小节结构',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(18, evidence.length * 10),
    evidence,
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '小节内部结构或小节之间衔接不足：缺主事件、子事件、情绪变化、新信息、对话交锋、钩子接续，或下一节重新铺垫/情绪骤降。',
    repair_instruction: delivered ? '' : '补小节结构：每个小节先明确一个主事件 + 3-5 个子事件，写出一个情绪变化、一条读者新信息和必要的 3-5 轮对话交锋；小节结尾留钩子，下一节开头快速接续，不重新铺垫，情绪跨节递进。',
  }
}

export function normalizeProseCraftDensityCheck(sectionRules: any[], antiPaddingRules: any[], chapterText: string) {
  const planned = proseCraftArray(sectionRules, antiPaddingRules)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasConcreteProgress = (text.match(/目标|阻碍|确认|承认|改变|推进|暴露|锁死|代价|风向|证据|逼|下一步|必须|否则|信息|发现/g) || []).length >= 2
  const hasPadding = /大厅很宽|墙壁很旧|风从窗外|空气显得|命运就是这样|想了很多很多|大家都在等待|事情结束|显得十分压抑/.test(text)
  const sectionCount = Math.max(
    proseParagraphsWithoutTitle(text).length,
    text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).length,
  )
  const delivered = hasConcreteProgress && !hasPadding && sectionCount >= 2
  return {
    key: 'section_density_rules',
    label: '小节密度',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(22, [hasConcreteProgress, !hasPadding, sectionCount >= 2].filter(Boolean).length * 26),
    evidence: [hasConcreteProgress ? '目标/信息/代价推进' : '', !hasPadding ? '无明显水文填充' : '', sectionCount >= 2 ? '小节可检查' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '小节密度不足：目标、阻碍、信息增量或情绪变化不够，或出现无功能环境/情绪填充。',
    repair_instruction: delivered ? '' : '补小节密度：优先补动作过程、阻碍、信息增量、关系变化、身体细节和对话交锋；删无功能环境描写和重复情绪。',
  }
}

export function normalizeProseCraftConceptAnchorCheck(values: any[], contextPackage: any, chapterText: string) {
  const planned = proseCraftArray(values)
  if (!planned.length) return null
  const names = explicitNewConceptNames(contextPackage)
  if (!names.length) return null
  const risks = scanNewConceptAnchorRisks(contextPackage, chapterText)
  const delivered = risks.length === 0
  return {
    key: 'concept_anchor_rules',
    label: '新概念锚点',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : 36,
    evidence: delivered
      ? [`新增概念已检查：${names.join('、')}`]
      : risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 6),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 6),
    issue: delivered ? '' : '新名词/新设定首次出现缺少当下作用锚点，读者只能看到生词或来历解释。',
    repair_instruction: delivered ? '' : '补新概念锚点：用角色动作反应、对话半句或物理后果带出当下作用；不要整段讲来历/原理/等级，也不要只甩零信息生词。',
  }
}

export function buildProseCraftDeterministicCheck(contextPackage: any, chapterText: string) {
  const text = String(chapterText || '')
  const localRisks = [
    /他不知道的是|她不知道的是|如果[他她][^。！？!?]{0,12}知道真相|所有人都(?:已经)?(?:看穿|知道|发现)/.test(text)
      ? { label: '深度限知毒点', evidence: '出现上帝视角预告或全知概括', fix: '删除上帝视角预告，改成角色当下能感知到的证据。' }
      : null,
    /(?:很|非常|十分|无比)?(?:愤怒|悲伤|委屈|难过|害怕|绝望)|感到[^。！？!?]{0,12}(?:愤怒|悲伤|委屈|害怕|绝望)/.test(text)
      ? { label: '抽象情绪毒点', evidence: '抽象情绪词替代正文证据', fix: '改成身体动作、对白反应、选择代价或可见行为。' }
      : null,
    /大厅很宽|墙壁很旧|风从窗外|空气显得|命运就是这样|想了很多很多|大家都在等待|事情结束/.test(text)
      ? { label: '水文填充毒点', evidence: '无功能环境、命运总结或等待结束', fix: '删除填充，补目标、阻碍、信息增量或关系变化。' }
      : null,
  ].filter(Boolean) as any[]
  const risks = [
    ...localRisks,
    ...scanEmotionTellingRisks(chapterText),
    ...scanInternalMonologueRisks(chapterText),
    ...scanNarrativeTransitionRisks(chapterText),
    ...scanParagraphFragmentationRisks(chapterText),
    ...scanParagraphLengthUniformityRisks(chapterText),
    ...scanProseMotionStillRisks(chapterText),
    ...scanProseStackedDescriptionRisks(chapterText),
    ...scanProseStaticEnvironmentRisks(chapterText),
    ...scanProseDecorativeDetailRisks(chapterText),
    ...scanVagueQuantityWeightRisks(chapterText),
    ...scanProseCameraAnchorRisks(chapterText),
    ...scanProseOmniscientCrowdCameraRisks(chapterText),
    ...scanNewConceptAnchorRisks(contextPackage, chapterText),
    ...scanSceneDensityExecutionRisks(contextPackage, chapterText),
    ...scanSceneSensoryAnchorRisks(contextPackage, chapterText),
  ]
  if (!risks.length) return null
  return {
    key: 'prose_craft_forbidden',
    label: '正文工艺毒点',
    text: '正文不得出现上帝视角、抽象情绪、水文环境、连续内心独白、镜头失焦、动静失衡或场景疏密失控。',
    expected: '正文不得出现上帝视角、抽象情绪、水文环境、连续内心独白、镜头失焦、动静失衡或场景疏密失控。',
    score: Math.max(0, 100 - risks.length * 12),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项正文工艺确定性风险。`,
    repair_instruction: '按 oh-story 正文工艺修复：限知镜头、身体细节、三维度揉进、一动一静、道具/数字功能、小节结构和小节密度必须同时回到正文证据。',
  }
}

export function proseCraftPriority(missed: any[]) {
  if (missed.some(item => item.key === 'prose_craft_forbidden')) return '优先清正文工艺毒点'
  if (missed.some(item => item.key === 'pov_rules')) return '优先补深度限知'
  if (missed.some(item => item.key === 'expression_rules')) return '优先补身体细节'
  if (missed.some(item => item.key === 'scene_weaving_rules')) return '优先补三维度揉进'
  if (missed.some(item => item.key === 'object_number_rules')) return '优先补道具/数字功能'
  if (missed.some(item => item.key === 'concept_anchor_rules')) return '优先补新概念锚点'
  if (missed.some(item => item.key === 'section_structure_rules')) return '优先补小节结构'
  if (missed.some(item => item.key === 'section_density_rules')) return '优先补小节密度'
  if (missed.some(item => item.key === 'rhythm_rules')) return '优先补一动一静'
  return ''
}

export function buildProseCraftSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const mergedContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const contract = proseCraftContractForSync(project, contextPackage, chapter)
  const checks = [
    normalizeProseCraftPovCheck(contract.pov_rules || contract.povRules, chapterText),
    normalizeProseCraftExpressionCheck(contract.expression_rules || contract.expressionRules || contract.body_detail_rules || contract.bodyDetailRules, chapterText),
    normalizeProseCraftSceneWeavingCheck(contract.scene_weaving_rules || contract.sceneWeavingRules, chapterText),
    normalizeProseCraftRhythmCheck(contract.rhythm_rules || contract.rhythmRules, chapterText),
    normalizeProseCraftObjectNumberCheck(contract.object_number_rules || contract.objectNumberRules, contract.scene_anchors || contract.sceneAnchors, chapterText),
    normalizeProseCraftSectionStructureCheck(contract.section_structure_rules || contract.sectionStructureRules, chapterText),
    normalizeProseCraftDensityCheck(contract.section_density_rules || contract.sectionDensityRules, contract.anti_padding_rules || contract.antiPaddingRules, chapterText),
    normalizeProseCraftConceptAnchorCheck(contract.concept_anchor_rules || contract.conceptAnchorRules, mergedContextPackage, chapterText),
    buildProseCraftDeterministicCheck(mergedContextPackage, chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = proseCraftPriority(missed)

  return {
    report_id: `prose-craft-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '正文工艺未配置' : status === 'ok' ? '正文工艺 OK' : `正文工艺缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 prose_craft_contract，建议补充深度限知、身体细节、三维度揉进、一动一静、道具/数字功能、小节结构、新概念锚点和小节密度。'
      : status === 'ok'
        ? '正文已基本兑现深度限知、身体细节、三维度揉进、一动一静、道具/数字功能、小节结构、新概念锚点和小节密度。'
        : `正文有 ${missedCount} 项正文工艺缺口，${priorityRepair || '优先补深度限知、身体细节和三维度揉进'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持正文工艺：限知镜头、身体细节、三维度揉进、一动一静、道具/数字功能、小节结构和小节密度继续作为下一章写作底线。']
      : [
          '下一章必须补正文工艺：坚持深度限知，用身体细节替代抽象情绪，把事件推进、感知/物件和身体反应揉进同一现场；小节结构必须有主事件、3-5个子事件、情绪变化、新信息和钩子接续；新概念首次出现必须有动作反应、对话半句或物理后果锚点。',
          '同时补一动一静、道具/数字功能和小节密度；删除上帝视角、无功能环境描写、重复情绪和连续内心独白总结。',
      ],
  }
}

export function punctuationToneContractForSync(project: any = {}, contextPackage: any = {}, chapter: any = {}) {
  return buildPunctuationToneContract(project, contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function punctuationToneArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => compactBriefText(item)).filter(Boolean), 20)
}

export function normalizePunctuationToneMapCheck(values: any[], scenePlan: any[], chapterText: string) {
  const planned = punctuationToneArray(values, scenePlan)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasQuestion = /[？?]|凭什么|为什么|谁|哪|怎么/.test(text)
  const hasExclaim = /[！!]/.test(text)
  const hasLanding = /：|:“|：“|。/.test(text) && /停了一拍|停了|静了|沉|按住|摊开|压在|短句|冒号/.test(text)
  const hasDialogue = /[“「][^”」]{2,80}[”」]/.test(text)
  const delivered = hasDialogue && (hasQuestion || hasExclaim) && hasLanding
  return {
    key: 'tone_punctuation_map',
    label: '语气谱系',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(24, [hasDialogue, hasQuestion || hasExclaim, hasLanding].filter(Boolean).length * 28),
    evidence: [hasDialogue ? '对白声线' : '', hasQuestion ? '质问/反问' : '', hasExclaim ? '爆点感叹' : '', hasLanding ? '动作/冒号落点' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '正文没有把问号、感叹号、冒号、短句和动作停顿用于语气、人物声线或情绪节奏。',
    repair_instruction: delivered ? '' : '补语气谱系：按质问、试探、爆发、压迫、迟疑分别选择问号、少量感叹号、冒号、短句、换行或动作 beat。',
  }
}

export function normalizePunctuationForbiddenCheck(values: any[], chapterText: string) {
  const planned = punctuationToneArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const forbiddenHits = text.match(/…+|\.{3,}|——|—|--+|[!?？！]{3,}/g) || []
  const delivered = forbiddenHits.length === 0
  return {
    key: 'forbidden_marks',
    label: '禁用标点',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 92 : Math.max(0, 92 - forbiddenHits.length * 24),
    evidence: delivered ? ['无省略号/破折号/随机标点堆砌'] : forbiddenHits.slice(0, 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '正文残留省略号、破折号、连续英文点或随机问号/感叹号堆砌。',
    repair_instruction: delivered ? '' : '把 ……、...、——、—、-- 改成动作停顿、换行、短句、逗号或句号；随机标点堆砌压成单个功能性标点。',
  }
}

export function normalizePunctuationQuestionCheck(values: any[], chapterText: string) {
  const planned = punctuationToneArray(values).filter(item => /质问|试探|反问|问号|追问/.test(item))
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasQuestionMark = /[？?]/.test(text)
  const hasQuestionPurpose = /凭什么|为什么|谁|哪|怎么|真假|真的|碰过|要不要|是不是|敢不敢/.test(text)
  const delivered = hasQuestionMark && hasQuestionPurpose
  return {
    key: 'question_tone',
    label: '功能性问号',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(24, [hasQuestionMark, hasQuestionPurpose].filter(Boolean).length * 36),
    evidence: [hasQuestionMark ? '问号' : '', hasQuestionPurpose ? '质问/追问目的' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '质问、试探或反问被压成陈述句，缺少功能性问号和短促追问。',
    repair_instruction: delivered ? '' : '补功能性问号：关键追问保留问号，并用动作停顿或短句承接，不能把质问全部写成平铺陈述。',
  }
}

export function normalizePunctuationExclaimCheck(values: any[], chapterText: string) {
  const planned = punctuationToneArray(values).filter(item => /爆发|打脸|惊讶|感叹|爆点/.test(item))
  if (!planned.length) return null
  const text = String(chapterText || '')
  const exclaimCount = (text.match(/[！!]/g) || []).length
  const hasPayoffContext = /真的|赢|证据|印|账本|名单|站了起来|脸色|震惊|摊开|对上|打脸|爆点/.test(text)
  const delivered = exclaimCount >= 1 && exclaimCount <= 2 && hasPayoffContext
  return {
    key: 'exclaim_tone',
    label: '爆点标点',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 84 : Math.max(20, (exclaimCount >= 1 && exclaimCount <= 2 ? 38 : 0) + (hasPayoffContext ? 36 : 0)),
    evidence: [exclaimCount ? `感叹号 ${exclaimCount} 处` : '', hasPayoffContext ? '爆点/打脸语境' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '爆点标点没有服务打脸/揭露/爆发，或感叹号过多变成随机喊叫。',
    repair_instruction: delivered ? '' : '只在真正爆点保留少量感叹号，前后用短句、动作或反应承接；不是爆点的感叹号改成句号或逗号。',
  }
}

export function buildPunctuationToneDeterministicCheck(chapterText: string) {
  const risks = [
    ...scanPunctuationToneRisks(chapterText),
    ...scanPeriodMonotonyRisks(chapterText),
  ]
  if (!risks.length) return null
  return {
    key: 'punctuation_tone_forbidden',
    label: '语气标点硬伤',
    text: '正文不得用省略号/破折号硬造停顿，不得随机堆砌问号/感叹号，也不得通篇句号化压平语气。',
    expected: '正文不得用省略号/破折号硬造停顿，不得随机堆砌问号/感叹号，也不得通篇句号化压平语气。',
    score: Math.max(0, 100 - risks.length * 18),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项语气标点确定性风险。`,
    repair_instruction: '按 oh-story 语气标点谱系修复：用动作停顿、换行、短句或冒号替代硬标点；问号/感叹号只服务质问、反问、爆发和打脸。',
  }
}

export function punctuationTonePriority(missed: any[]) {
  if (missed.some(item => item.key === 'punctuation_tone_forbidden')) return '优先清语气标点硬伤'
  if (missed.some(item => item.key === 'forbidden_marks')) return '优先删禁用标点'
  if (missed.some(item => item.key === 'question_tone')) return '优先补功能性问号'
  if (missed.some(item => item.key === 'exclaim_tone')) return '优先校爆点标点'
  if (missed.some(item => item.key === 'tone_punctuation_map')) return '优先补语气谱系'
  return ''
}

export function buildPunctuationToneSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = punctuationToneContractForSync(project, contextPackage, chapter)
  const toneMap = contract.tone_punctuation_map || contract.tonePunctuationMap || contract.tone_targets || contract.toneTargets || contract.punctuation_rules || contract.punctuationRules
  const checks = [
    normalizePunctuationToneMapCheck(toneMap, contract.scene_tone_plan || contract.sceneTonePlan, chapterText),
    normalizePunctuationForbiddenCheck(contract.forbidden_marks || contract.forbiddenMarks || contract.forbidden_punctuation_patterns || contract.forbiddenPunctuationPatterns, chapterText),
    normalizePunctuationQuestionCheck(toneMap, chapterText),
    normalizePunctuationExclaimCheck(toneMap, chapterText),
    buildPunctuationToneDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = punctuationTonePriority(missed)

  return {
    report_id: `punctuation-tone-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '语气标点未配置' : status === 'ok' ? '语气标点 OK' : `语气标点缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 punctuation_tone_contract，建议补充语气谱系、禁用标点、功能性问号、爆点标点和动作停顿。'
      : status === 'ok'
        ? '正文已基本兑现语气谱系、禁用标点、功能性问号、爆点标点和动作/短句停顿。'
        : `正文有 ${missedCount} 项语气标点缺口，${priorityRepair || '优先补功能性问号、动作停顿和爆点标点'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持语气标点谱系：问号、感叹号、冒号、短句、换行和动作停顿都继续服务人物声线与情绪节奏。']
      : [
          '下一章必须补语气标点：用动作停顿、换行、短句或冒号替代省略号/破折号，质问保留功能性问号。',
          '爆点只保留少量功能性感叹号；删除随机标点堆砌，避免通篇句号化压平人物声线。',
      ],
  }
}

export function qualityAuditContractForSync(project: any = {}, contextPackage: any = {}, chapter: any = {}) {
  return buildQualityAuditContract(project, contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function qualityAuditArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => compactBriefText(item)).filter(Boolean), 20)
}

export function normalizeQualityAuditStructureCheck(values: any[], chapterText: string) {
  const planned = qualityAuditArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const opening = firstProseText(chapterText, 500)
  const tail = text.slice(Math.max(0, text.length - 500))
  const hasOpeningHook = /证据|账本|危机|反派|抢先|宣布|压在|灯下|尾号|对不上|倒计时|敲门|异常/.test(opening)
  const hasMiddleProgress = /推进|核对|当场|确认|承认|解释|证明|变成|开始倒向|失去主动|局势变化|拿出|放出/.test(text)
  const hasSituationChange = /局势变化|从[^。！？!?]{0,24}变成|开始倒向|失去主动|改变局势|推进到|主线从/.test(text)
  const hasEndingHook = /章尾|最后一页|第三个证人|证人|指向|名字|撕掉|下一|翻页|钩子|祠堂|地砖/.test(tail)
  const delivered = hasOpeningHook && hasMiddleProgress && hasSituationChange && hasEndingHook
  return {
    key: 'structure_checks',
    label: '章节结构',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 90 : Math.max(20, [hasOpeningHook, hasMiddleProgress, hasSituationChange, hasEndingHook].filter(Boolean).length * 22),
    evidence: [hasOpeningHook ? '开头钩子' : '', hasMiddleProgress ? '中段推进' : '', hasSituationChange ? '局势变化' : '', hasEndingHook ? '章尾翻页' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '章节结构没有同时交付开头钩子、中段推进、局势变化和章尾翻页。',
    repair_instruction: delivered ? '' : '补章节结构：开头给具体异常/证据/危机，中段让行动推进，局势必须发生变化，章尾落在危机、决定、发现或反转。',
  }
}

export function normalizeQualityAuditChapterPurposeCheck(values: any[], chapterText: string) {
  const planned = qualityAuditArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const purposeWords = ['铺垫', '高潮', '爽点', '打脸', '人物塑造', '设定']
  const matchedPurposeWords = purposeWords.filter(word => text.includes(word))
  const hasOneSentenceSummary = /(?:本章|这一章|章纲|一句话)[^。！？!?]{0,24}(?:概括|目的|讲|内容)|(?:一句话目的|本章一句话目的)/.test(text)
  const hasPurposeLabel = /目的词|章节目的|本章目的/.test(text) && matchedPurposeWords.length > 0
  const hasDensityByPurpose = /详写|展开|带过|压缩|略写|只保留|平均用力|详略/.test(text)
    && /铺垫|高潮|爽点|打脸|人物塑造|设定/.test(text)
  const delivered = hasOneSentenceSummary && hasPurposeLabel && hasDensityByPurpose
  return {
    key: 'chapter_purpose_rules',
    label: '章纲目的词',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(22, [hasOneSentenceSummary, hasPurposeLabel, hasDensityByPurpose].filter(Boolean).length * 28),
    evidence: [
      hasOneSentenceSummary ? '一句话概括' : '',
      hasPurposeLabel ? `目的词：${matchedPurposeWords.join('/')}` : '',
      hasDensityByPurpose ? '按目的分配详略' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasOneSentenceSummary ? '缺每章一句话概括内容' : '',
      !hasPurposeLabel ? '缺目的词：铺垫/高潮/爽点/打脸/人物塑造/设定' : '',
      !hasDensityByPurpose ? '缺按目的词分配详略，容易平均用力或跑偏' : '',
    ], 8),
    issue: delivered ? '' : '章纲目的词缺失：本章没有明确一句话内容和目的词，正文容易跑偏或平均用力。',
    repair_instruction: delivered ? '' : '按 oh-story 章纲目的法修复：先用一句话概括本章内容，再标注目的词（铺垫/高潮/爽点/打脸/人物塑造/设定）；正文按目的词分配详略，爽点/打脸/高潮展开，铺垫/设定只保留有功能信息。',
  }
}

export function normalizeQualityAuditProgressionCheck(values: any[], chapterText: string) {
  const planned = qualityAuditArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const provesNotDeletable = /删掉[^。！？!?]{0,18}影响理解|这章删掉会影响理解|不可删除|不能删除|主线从|推进到|改变局势/.test(text)
  const hasCoreEvent = /第二份证据|证据|账本|第三个证人|反派|主角|沈砚|反证|证人/.test(text)
  const hasProgress = /改变局势|推进|从[^。！？!?]{0,24}变成|开始倒向|失去主动|拿出新证据|放出第二份证据|指向第三个证人/.test(text)
  const hasNoFlatEnding = !/事情暂时没有变化|没有变化|暂时还没有进入正题|大家坐着等了很久|等待事情结束/.test(text)
  const delivered = provesNotDeletable && hasCoreEvent && hasProgress && hasNoFlatEnding
  return {
    key: 'progression_checks',
    label: '章节推进',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(22, [provesNotDeletable, hasCoreEvent, hasProgress, hasNoFlatEnding].filter(Boolean).length * 22),
    evidence: [provesNotDeletable ? '删章会影响理解' : '', hasCoreEvent ? '核心事件' : '', hasProgress ? '主线/局势推进' : '', hasNoFlatEnding ? '非原地等待' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '章节推进不足：删掉这章可能不影响理解，或主线、关系、设定没有可见变化。',
    repair_instruction: delivered ? '' : '补章节推进：明确本章不可删除的证据、选择、代价、关系变化或主线位移；删掉不影响理解的段落要压缩。',
  }
}

export function normalizeQualityAuditInformationCheck(values: any[], contextPackage: any, chapterText: string) {
  const planned = qualityAuditArray(values)
  if (!planned.length) return null
  const conceptRisks = scanNewConceptOverloadRisks(contextPackage)
  const infodumpRisks = scanInfodumpRisks(chapterText)
  const text = String(chapterText || '')
  const hasInfoThroughConflict = /没有解释设定|当场核对|通过事件|跟着冲突|反派[^。！？!?]{0,30}解释|主角[^。！？!?]{0,30}证明|账房[^。！？!?]{0,30}核对/.test(text)
  const delivered = conceptRisks.length === 0 && infodumpRisks.length === 0 && hasInfoThroughConflict
  return {
    key: 'information_checks',
    label: '信息负载',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(16, [conceptRisks.length === 0, infodumpRisks.length === 0, hasInfoThroughConflict].filter(Boolean).length * 28),
    evidence: delivered
      ? ['新概念可控', '信息跟冲突走']
      : [...conceptRisks, ...infodumpRisks].map((item: any) => compactBriefText(item.evidence || item.fix)).filter(Boolean).slice(0, 6),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '信息负载失控：新概念过多、大段设定说明，或信息没有跟着冲突和行动释放。',
    repair_instruction: delivered ? '' : '压缩新概念到 3 个以内；把设定说明改成角色行动、质疑、证据核对或冲突反馈中的可见信息。',
  }
}

export function normalizeQualityAuditEventContentCheck(values: any[], chapterText: string) {
  const planned = qualityAuditArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const sentences = text
    .split(/[。！？!?\n]+/)
    .map(item => compactBriefText(item))
    .filter(Boolean)
  const eventSentences = sentences.filter(sentence => /(?:翻开|压在|宣布|核对|证明|逼|问|追问|递|拿出|放出|改口|退开|倒向|撕|指向|发现|决定|选择|行动|阻碍|代价|局势|改变|推进|从[^，。！？]{0,24}变成|失去主动|出手|拦住|打开|暴露|触发|击中|转身|冲|退|停住|沉默|看见|听见|反应|对话|证据|结果|事件)/.test(sentence))
  const expositionSentences = sentences.filter(sentence => /(?:阳光|风吹|屋檐|空气|安静|历史|来历|意义|背景|设定|原理|制度|等级|回顾|前文已经说过|只是再次|很多年|复杂)/.test(sentence)
    && !/(?:核对|证明|冲突|证据|行动|反应|改变|推进|事件)/.test(sentence))
  const hasValueChange = /(?:价值改变|改变局势|局势变化|失去主动|开始倒向|关系变化|主线从|推进到|从[^。！？!?]{0,32}变成|改变现场风向|结果|代价)/.test(text)
  const hasRatioReceipt = /事件(?:内容)?(?:含量|比重)[^。！？!?]{0,24}(?:超过|不低于|大于|至少|一半)|事件内容比重不能小于一半/.test(text)
  const hasEventDrivenSetting = /通过事件演绎|设定[^。！？!?]{0,24}(?:通过|跟着|借)[^。！？!?]{0,24}(?:事件|证据|动作|对话|反应|核对|冲突)|(?:事件|证据|动作|对话|反应|核对|冲突)[^。！？!?]{0,24}(?:演绎|带出|承载)[^。！？!?]{0,24}设定/.test(text)
  const eventDominates = hasRatioReceipt || (eventSentences.length >= Math.max(3, expositionSentences.length + 1) && eventSentences.length >= Math.ceil(sentences.length / 2))
  const delivered = eventDominates && hasValueChange && hasEventDrivenSetting
  return {
    key: 'event_content_rules',
    label: '事件含量',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(18, [eventDominates, hasValueChange, hasEventDrivenSetting].filter(Boolean).length * 29),
    evidence: delivered
      ? [
          `事件句 ${eventSentences.length}/${Math.max(1, sentences.length)}`,
          hasValueChange ? '有价值/局势变化' : '',
          hasEventDrivenSetting ? '设定通过事件演绎' : '',
        ].filter(Boolean)
      : uniqueBriefStrings([
          eventDominates ? '' : `事件句不足或说明句偏多：事件句 ${eventSentences.length}，说明/氛围句 ${expositionSentences.length}`,
          hasValueChange ? '' : '缺少主角、主线、关系或局势的价值改变',
          hasEventDrivenSetting ? '' : '设定没有通过动作、证据、对话、反应或冲突演绎',
        ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '事件含量不足：正文偏氛围、背景、设定或意义回顾，事件内容比重未达到一半，且缺少价值改变证据。',
    repair_instruction: delivered ? '' : '按 oh-story 事件驱动修复：事件内容比重不能小于一半；把旁白强塞的设定、背景和情绪改成动作、选择、阻碍、代价或局势变化，让设定通过事件演绎。',
  }
}

export function normalizeQualityAuditFiveDimensionCheck(values: any[], chapterText: string) {
  const planned = qualityAuditArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasFiveDimension = /核心一致度/.test(text) && /表层重写度/.test(text) && /格式一致度/.test(text) && /可读性/.test(text) && /逻辑连贯/.test(text)
  const hasThreshold = /(?:超过|达到|高于)\s*78|78\s*(?:以上|分)/.test(text)
  const hasStrategy = /rewrite|compress|de_ai|polish|精修|最低分/.test(text)
  const delivered = hasFiveDimension && hasThreshold && hasStrategy
  return {
    key: 'five_dimension_rubric',
    label: '五维底线',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 84 : Math.max(20, [hasFiveDimension, hasThreshold, hasStrategy].filter(Boolean).length * 28),
    evidence: [hasFiveDimension ? '五维评分' : '', hasThreshold ? '达到78阈值' : '', hasStrategy ? '最低分修订策略' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '没有给出五维评分达线证据，或最低分维度缺少 rewrite/compress/de_ai/polish 精修策略。',
    repair_instruction: delivered ? '' : '补五维底线：核心一致度、表层重写度、格式一致度、可读性、逻辑连贯都要给证据；低于阈值的维度必须指定精修策略。',
  }
}

export function normalizeQualityAuditSellingPointExpressionCheck(values: any[], chapterText: string) {
  const planned = qualityAuditArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const directTelling = /(?:本章|这一章|这章|本文|这本书)?[^。！？!?\n]{0,12}(?:核心卖点|卖点|爽点)[^。！？!?\n]{0,24}(?:很爽|读者会|读者喜欢|值得看|看点)|这是(?:本章|这一章|这章|本文)?[^。！？!?\n]{0,12}(?:核心卖点|卖点|爽点)|读者会(?:很)?喜欢/.test(text)
  const hasImplicitShow = /隐性展示|通过剧情|通过对话|通过反应|动作|对话|反应|看见|听见|倒吸|迟疑|追问|沉默|变黑|核对/.test(text)
  const hasOpeningHint = /开头[^。！？!?\n]{0,32}(?:暗示|提示)|(?:暗示|提示)[^。！？!?\n]{0,32}开头/.test(text)
  const hasMiddleDeepening = /(?:中段|中间)[^。！？!?\n]{0,32}(?:深化|加深)|(?:深化|加深)[^。！？!?\n]{0,32}(?:中段|中间)/.test(text)
  const hasClimaxPayoff = /高潮[^。！？!?\n]{0,32}(?:爆发|兑现|释放|看见|反应)|(?:爆发|兑现|释放)[^。！？!?\n]{0,32}高潮/.test(text)
  const delivered = !directTelling && hasImplicitShow && hasOpeningHint && hasMiddleDeepening && hasClimaxPayoff
  return {
    key: 'selling_point_expression_rules',
    label: '卖点表达',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(18, [!directTelling, hasImplicitShow, hasOpeningHint, hasMiddleDeepening, hasClimaxPayoff].filter(Boolean).length * 17),
    evidence: [
      !directTelling ? '无作者告知式卖点声明' : '',
      hasImplicitShow ? '剧情/对话/反应承载卖点' : '',
      hasOpeningHint ? '开头暗示' : '',
      hasMiddleDeepening ? '中间深化' : '',
      hasClimaxPayoff ? '高潮爆发' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      directTelling ? '不要直接告诉读者“这是核心卖点/本章很爽/读者会喜欢”' : '',
      !hasImplicitShow ? '缺剧情、对话或角色反应中的隐性展示' : '',
      !hasOpeningHint ? '缺开头暗示' : '',
      !hasMiddleDeepening ? '缺中间深化' : '',
      !hasClimaxPayoff ? '缺高潮爆发' : '',
    ], 8),
    issue: delivered ? '' : '卖点表达停留在作者告知或静态设定展示，读者没有通过剧情、对话和反应自己发现卖点。',
    repair_instruction: delivered ? '' : '按 oh-story 卖点表达修复：删除“本章核心卖点很爽/读者会喜欢/这是爽点”这类告知句，把卖点改成开头暗示、中间用剧情/对话/反应深化、高潮由结果和旁观反应爆发。',
  }
}

export function buildQualityAuditDeterministicCheck(contextPackage: any, chapterText: string) {
  const risks = [
    ...scanProseFormatRisks(chapterText),
    ...scanParagraphProgressionRisks(chapterText),
    ...scanMeaningInflationFillerRisks(chapterText),
    ...scanSceneGoalObstacleChangeRisks(chapterText),
    ...scanInfodumpRisks(chapterText),
    ...scanRecapFillerRisks(chapterText),
    ...scanNewConceptOverloadRisks(contextPackage),
    ...scanEconomicPowerScaleAnchorRisks(chapterText),
    ...scanChapterBlueprintCraftRisks(contextPackage, chapterText),
    ...scanPayoffSetupRisks(chapterText),
    ...scanGoldenThreeExecutionRisks(contextPackage, chapterText),
  ]
  if (!risks.length) return null
  return {
    key: 'quality_audit_forbidden',
    label: '质量诊断硬伤',
    text: '质量诊断不得放过正文格式、段落无推进、场景无目标阻碍变化、设定说明、水文复述、新概念过载、尺度无锚点、细纲工艺、爽点铺垫和黄金三章硬伤。',
    expected: '质量诊断不得放过正文格式、段落无推进、场景无目标阻碍变化、设定说明、水文复述、新概念过载、尺度无锚点、细纲工艺、爽点铺垫和黄金三章硬伤。',
    score: Math.max(0, 100 - risks.length * 10),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项质量诊断确定性风险。`,
    repair_instruction: '按 oh-story 质量诊断修复：先证明本章不可删除，补结构推进和局势变化，再压缩水文、设定说明和新概念负载。',
  }
}

export function qualityAuditPriority(missed: any[]) {
  if (missed.some(item => item.key === 'quality_audit_forbidden')) return '优先清质量硬伤'
  if (missed.some(item => item.key === 'selling_point_expression_rules')) return '优先改卖点表达'
  if (missed.some(item => item.key === 'chapter_purpose_rules')) return '优先补章纲目的词'
  if (missed.some(item => item.key === 'progression_checks')) return '优先证明本章不可删除'
  if (missed.some(item => item.key === 'event_content_rules')) return '优先补事件含量'
  if (missed.some(item => item.key === 'structure_checks')) return '优先补章节结构'
  if (missed.some(item => item.key === 'information_checks')) return '优先压信息负载'
  if (missed.some(item => item.key === 'five_dimension_rubric')) return '优先补五维底线'
  return ''
}

export function buildQualityAuditSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const mergedContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const contract = qualityAuditContractForSync(project, contextPackage, chapter)
  const contextWithProject = { ...(mergedContextPackage || {}), project }
  const checks = [
    normalizeQualityAuditStructureCheck(contract.structure_checks || contract.structureChecks || contract.audit_dimensions || contract.auditDimensions, chapterText),
    normalizeQualityAuditChapterPurposeCheck(contract.chapter_purpose_rules || contract.chapterPurposeRules, chapterText),
    normalizeQualityAuditProgressionCheck(contract.progression_checks || contract.progressionChecks || contract.water_detection_rules || contract.waterDetectionRules, chapterText),
    normalizeQualityAuditInformationCheck(contract.information_checks || contract.informationChecks, contextWithProject, chapterText),
    normalizeQualityAuditEventContentCheck(contract.event_content_rules || contract.eventContentRules, chapterText),
    normalizeQualityAuditFiveDimensionCheck(contract.five_dimension_rubric || contract.fiveDimensionRubric || contract.score_thresholds || contract.scoreThresholds, chapterText),
    normalizeQualityAuditSellingPointExpressionCheck(contract.selling_point_expression_rules || contract.sellingPointExpressionRules, chapterText),
    buildQualityAuditDeterministicCheck(contextWithProject, chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = qualityAuditPriority(missed)

  return {
    report_id: `quality-audit-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '质量诊断未配置' : status === 'ok' ? '质量诊断 OK' : `质量诊断缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 quality_audit_contract，建议补充章节结构、章纲目的词、章节推进、信息负载、事件含量、长篇连续性和五维评分。'
      : status === 'ok'
        ? '正文已基本兑现章节结构、章纲目的词、章节推进、信息负载控制、事件含量、五维底线、卖点表达和质量硬伤扫描。'
        : `正文有 ${missedCount} 项质量诊断缺口，${priorityRepair || '优先证明本章不可删除、补局势变化并压缩水文'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持质量诊断：每章都要有一句话概括和目的词，证明不可删除，结构完整，事件内容比重不低于一半，信息跟冲突走，五维评分达线，卖点靠剧情、对话和反应隐性展示。']
      : [
          '下一章必须补质量诊断：先写清本章一句话概括和目的词，再证明本章不可删除，补开头钩子、中段推进、局势变化和章尾翻页。',
          '压缩水文、复述和大段设定说明；事件内容比重必须不低于一半，新概念控制在 3 个以内，并让信息跟冲突和行动释放；卖点不能直接告知，要按开头暗示、中间深化、高潮爆发写成剧情、对话和反应。',
        ],
  }
}

export function dialogueContractForSync(contextPackage: any = {}, chapter: any = {}) {
  return buildDialogueContract(contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function buildDialogueFunctionalFillerCheck(chapterText: string) {
  const risks = scanDialogueFunctionalFillerRisks(chapterText)
  if (!risks.length) return null
  return {
    key: 'dialogue_functional_filler',
    label: '可删除对白',
    text: '每句对白必须承载推进剧情、增加期待感或展示人设之一；删掉这段对话后情节、期待和情绪都不受影响，则判定为水字数。',
    expected: '每句对白必须承载推进剧情、增加期待感或展示人设之一；删掉这段对话后情节、期待和情绪都不受影响，则判定为水字数。',
    score: Math.max(0, 100 - risks.length * 28),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 段对白删除测试风险。`,
    repair_instruction: '按 oh-story 对话删除测试修复：删掉这段对话后如果情节还能推进、期待感还在、情绪还到位，就直接删；必须保留时，把寒暄、附和、夸赞或复述改成新信息、悬念、行动、关系变化或角色独有声线。',
  }
}

export function buildDialogueDeterministicCheck(chapterText: string) {
  const risks = [
    ...scanDialogueToneRisks(chapterText),
    ...scanDialogueFormatRisks(chapterText),
    ...scanDialogueQuoteStyleRisks(chapterText),
    ...scanDialoguePowerBalanceRisks(chapterText),
    ...scanDialogueProtagonistLineEconomyRisks(chapterText),
    ...scanDialogueQuestionAnswerLoopRisks(chapterText),
    ...scanDialogueJudgmentQuestionRisks(chapterText),
    ...scanDialogueSubtextAgendaRisks(chapterText),
    ...scanDialogueEmptyPraiseRisks(chapterText),
    ...scanDialogueEmotionContinuityRisks(chapterText),
    ...scanDialogueEasyPersuasionRisks(chapterText),
    ...scanDialogueHighPressureMemeRisks(chapterText),
    ...scanDialogueDetachedJokeRisks(chapterText),
    ...scanDialogueFlatCallbackRisks(chapterText),
    ...scanDialogueHollowHumorPayoffRisks(chapterText),
    ...scanDialogueVoiceSamenessRisks(chapterText),
    ...scanDialogueBreathRisks(chapterText),
    ...scanDialogueDensityRisks(chapterText),
    ...scanDialogueInfodumpRisks(chapterText),
  ]
  if (!risks.length) return null
  return {
    key: 'dialogue_forbidden',
    label: '对白硬伤',
    text: '对白不得变成说明书、一问一答、同腔、空泛夸赞、容易说服、权力关系错位、对白墙或格式混乱。',
    expected: '对白不得变成说明书、一问一答、同腔、空泛夸赞、容易说服、权力关系错位、对白墙或格式混乱。',
    score: Math.max(0, 100 - risks.length * 10),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项对白确定性风险。`,
    repair_instruction: '按 oh-story dialogue-mastery 修复：删说明书式对白，补潜台词、议程、声线差异、权力博弈和动作换气；情绪场景里逐句回应上一句对方的情绪状态，不能在恐惧/崩溃/求助后直接切流程；高压/生死/悲痛/严肃 beat 中让轻快声线让位，梗只在安全或喘息 beat 放；普通幽默来自角色欲望、偏见、固执或误判，不能脱离剧情讲段子；铺垫要短，回报要清晰，余波比包袱本身更重要；回调必须升级，至少更尴尬、更公开或更严重。',
  }
}

export function dialoguePriority(missed: any[]) {
  if (missed.some(item => item.key === 'supporting_speaker_limit_rules')) return '优先控配角台词人数'
  if (missed.some(item => item.key === 'dialogue_functional_filler')) return '优先删可删除对白'
  if (missed.some(item => item.key === 'dialogue_forbidden')) return '优先清对白硬伤'
  if (missed.some(item => item.key === 'dialogue_drive_rules')) return '优先补对白三功能'
  if (missed.some(item => item.key === 'information_embed_rules')) return '优先修信息嵌入'
  if (missed.some(item => item.key === 'dialogue_audit_rules')) return '优先做对话审计'
  if (missed.some(item => item.key === 'voice_differentiation_rules')) return '优先修声线差异'
  if (missed.some(item => item.key === 'subtext_agenda_rules')) return '优先补潜台词与议程'
  if (missed.some(item => item.key === 'power_length_rules')) return '优先补权力博弈'
  if (missed.some(item => item.key === 'dialogue_goals')) return '优先补对白目标'
  return ''
}

export function buildDialogueSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const mergedContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const contract = dialogueContractForSync(contextPackage, chapter)
  const checks = [
    normalizeDialogueGoalCheck(contract.dialogue_goals || contract.dialogueGoals, contract.key_lines || contract.keyLines, contract.relationship_moves || contract.relationshipMoves, chapterText),
    normalizeDialoguePowerCheck(contract.power_length_rules || contract.powerLengthRules || contract.mode_playbooks || contract.modePlaybooks, chapterText),
    normalizeDialogueSubtextCheck(contract.subtext_agenda_rules || contract.subtextAgendaRules, chapterText),
    normalizeDialogueDriveCheck(contract.dialogue_drive_rules || contract.dialogueDriveRules, chapterText),
    normalizeDialogueInformationEmbedCheck(contract.information_embed_rules || contract.informationEmbedRules, chapterText),
    normalizeDialogueAuditCheck(contract.dialogue_audit_rules || contract.dialogueAuditRules, chapterText),
    buildDialogueFunctionalFillerCheck(chapterText),
    normalizeDialogueVoiceCheck(contract.voice_anchors || contract.voiceAnchors || contract.voice_differentiation_rules || contract.voiceDifferentiationRules, chapterText),
    normalizeDialogueSupportingSpeakerLimitCheck(contract.supporting_speaker_limit_rules || contract.supportingSpeakerLimitRules, mergedContextPackage, chapterText),
    buildDialogueDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = dialoguePriority(missed)

  return {
    report_id: `dialogue-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '对白质量未配置' : status === 'ok' ? '对白质量 OK' : `对白缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 dialogue_contract，建议补充对白目标、权力博弈、潜台词与议程、对白三功能、信息嵌入、对话审计、声线差异和对白硬伤扫描。'
      : status === 'ok'
        ? '正文已基本兑现对白目标、权力博弈、潜台词与议程、对白三功能、信息嵌入、对话审计、声线差异和对白硬伤扫描。'
        : `正文有 ${missedCount} 项对白质量缺口，${priorityRepair || '优先修声线差异、潜台词与议程和说明书式对白'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持对白质量：每句对白继续承担推进剧情、增加期待或展示人设；信息用角色语气、立场、追问、误导或动作承接；对话结尾继续预示下一步节奏，并保持声线差异和权力博弈。']
      : [
          '下一章必须补对白：删说明书式对白和问答式一问一答，让角色带着借口、试探、回避和行动反应说话。',
          '按权力地位重排句长：主角/掌控者短句亮底牌，被压制方长句辩解；每句对白至少承担推进剧情、增加期待或展示人设之一；信息型配角不能当科普嘴；让对话结尾预示接下来的节奏变化；同时拆出角色声线差异和动作换气；同一场景最多保留 3 个配角发言，其余合并为旁观反应、动作或叙事概括。',
      ],
  }
}

export function characterBehaviorContractForSync(contextPackage: any = {}, chapter: any = {}) {
  return buildCharacterBehaviorContract(contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function characterBehaviorArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => compactBriefText(item)).filter(Boolean), 20)
}

export function normalizeCharacterBehaviorAnchorCheck(key: string, label: string, values: any[], chapterText: string, fix: string, threshold = 28) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const checked = planned.map(text => {
    const match = anchorMatchScore(text, chapterText)
    return {
      text,
      score: match.score,
      evidence: match.matched,
      delivered: match.score >= threshold,
    }
  })
  const missed = checked.filter(item => !item.delivered)
  return {
    key,
    label,
    text: planned.join('；'),
    expected: planned.join('；'),
    score: Math.round(checked.reduce((sum, item) => sum + Number(item.score || 0), 0) / Math.max(1, checked.length)),
    evidence: checked.flatMap(item => item.evidence).filter(Boolean).slice(0, 8),
    delivered: missed.length === 0,
    status: missed.length === 0 ? 'ok' : 'warn',
    missed_items: missed.map(item => item.text),
    issue: missed.length === 0 ? '' : `${label}未充分落地：${missed.map(item => item.text).join('；')}`,
    repair_instruction: missed.length === 0 ? '' : fix,
  }
}

export function normalizeCharacterBehaviorMemoryAnchorCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasAnchor = planned.some(item => {
    const match = anchorMatchScore(item, text)
    return match.score >= 24
  }) || /旧夹克|袖口|口头禅|标志动作|短句反问|疤|铃|刀|伞|左手/.test(text)
  return {
    key: 'memory_anchors',
    label: '记忆锚点',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: hasAnchor ? 86 : 24,
    evidence: hasAnchor ? ['记忆锚点可见'] : [],
    delivered: hasAnchor,
    status: hasAnchor ? 'ok' : 'warn',
    missed_items: hasAnchor ? [] : planned,
    issue: hasAnchor ? '' : '角色记忆锚点没有在正文出现，读者缺少可复述的口头禅、动作或外物。',
    repair_instruction: hasAnchor ? '' : '补记忆锚点：让口头禅、标志动作、外物或行为习惯在关键选择前后出现一次。',
  }
}

export function buildCharacterBehaviorSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = characterBehaviorContractForSync(contextPackage, chapter)
  const checks = [
    normalizeCharacterBehaviorMotivationCheck(contract.motivation_chain || contract.motivationChain, chapterText),
    normalizeCharacterBehaviorMotivationSpecificityCheck(contract.motivation_specificity_rules || contract.motivationSpecificityRules, chapterText),
    normalizeCharacterBehaviorLayeredTagsCheck(contract.layered_tags || contract.layeredTags, chapterText),
    normalizeCharacterBehaviorRulesCheck(contract.behavior_rules || contract.behaviorRules || contract.quality_checks || contract.qualityChecks, chapterText),
    normalizeCharacterBehaviorProtagonistComposureCheck(contract.protagonist_composure_rules || contract.protagonistComposureRules, chapterText),
    normalizeCharacterBehaviorStrongAssociationCheck(contract.strong_association_rules || contract.strongAssociationRules, chapterText),
    normalizeCharacterBehaviorMemoryAnchorCheck(contract.memory_anchors || contract.memoryAnchors, chapterText),
    normalizeCharacterBehaviorSupportingRoleCheck(contract.supporting_role_functions || contract.supportingRoleFunctions, chapterText),
    normalizeCharacterBehaviorRoleCardCheck(contract.role_card_requirements || contract.roleCardRequirements, chapterText),
    normalizeCharacterBehaviorSupportingRoleExitCheck(contract.supporting_role_exit_rules || contract.supportingRoleExitRules, chapterText),
    normalizeCharacterBehaviorRepeatCheck(contract.behavior_repeat_rules || contract.behaviorRepeatRules, chapterText),
    normalizeCharacterDrivenEventCheck(contract.character_driven_event_rules || contract.characterDrivenEventRules, chapterText),
    normalizeProtagonistRedLineCheck(contract.protagonist_red_line_rules || contract.protagonistRedLineRules, chapterText),
    normalizeIdentityGoldfingerAlignmentCheck(contract.identity_goldfinger_alignment_rules || contract.identityGoldfingerAlignmentRules, chapterText),
    normalizeCharacterBehaviorAntagonistLogicCheck(contract.antagonist_logic || contract.antagonistLogic, chapterText),
    normalizeCharacterBehaviorAntagonistWeightCheck(contract.antagonist_weight_rules || contract.antagonistWeightRules, chapterText),
    normalizeCharacterBehaviorAntagonistSelfStoryCheck(contract.antagonist_self_story_rules || contract.antagonistSelfStoryRules, chapterText),
    normalizeCharacterBehaviorAntagonistTierExitCheck(contract.antagonist_tier_exit_rules || contract.antagonistTierExitRules, chapterText),
    buildCharacterBehaviorDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = characterBehaviorPriority(missed)

  return {
    report_id: `character-behavior-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '角色行为未配置' : status === 'ok' ? '角色行为 OK' : `角色行为缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 character_behavior_contract，建议补充动机链、动机具体性、三层标签、行为规则、主角逼格反应、人设强关联、记忆锚点、配角功能、角色卡必备项、配角退场规划、行为重复点、人推事件、主角红线、身份/金手指对齐、反派逻辑、反派分量、反派自我叙事和反派层级退场。'
      : status === 'ok'
        ? '正文已基本兑现动机链、动机具体性、三层标签、行为规则、主角逼格反应、人设强关联、记忆锚点、配角功能、角色卡必备项、配角退场规划、行为重复点、人推事件、主角红线、身份/金手指对齐、反派逻辑、反派分量、反派自我叙事和反派层级退场。'
        : `正文有 ${missedCount} 项角色行为缺口，${priorityRepair || '优先补动机链、起因具体性、行为证据、主角逼格反应、人设强关联、角色卡、配角退场规划、行为重复点、人推事件、主角红线、身份/金手指对齐、反派逻辑、反派分量、反派自我叙事和反派层级退场'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持角色行为：行动继续由动机链驱动，起因具体、动机有情感层面且演变有铺垫；升级线与主角反应线分开，面对低级挑衅保持轻描淡写、短句或行动压制；重要角色保留至少3个能推动剧情/爽点/人物碰撞的强关联；角色卡必备项、配角退场规划、行为重复点、人推事件、主角红线和身份/金手指对齐继续有证据；用动作、对白和反应展示人设，配角有功能，反派有内在逻辑、真实分量、自我叙事和层级匹配的退场规划。']
      : [
          '下一章必须补角色行为：先写清起因、意图、约束、风险；起因具体到谁、何时、当众如何伤害，动机落到情感层面，再让关键行动从这条动机链推出。',
          '修主角逼格反应：升级线与主角反应线分开管理，升级只提升实力/能力；面对低级挑衅时删掉暴怒、面红耳赤和歇斯底里，改成轻描淡写、短句反锁或动作压制。',
          '补人设强关联：每个重要角色至少3个强关联设定，直接影响剧情走向、核心梗、装逼爽点或人物碰撞；外貌、爱好、身高体重只能做弱关联记忆点。',
          '补角色卡必备项：角色定位、身份标签、外貌特征、核心目标、核心动机、致命弱点、口头禅/标志动作必须能被正文或写前合同定位。',
          '补配角退场规划：每个有台词配角要有现场功能、与主角关系、核心特质、标志性特征和退场方式；同一场景配角不超过3个有台词。',
          '补行为重复点：选一个读者喜欢的动作、口头禅或反应，在不同场景重复并承担不同功能。',
          '改成人推事件：从人物动机和选择找方向，不要让剧情需要、外部事件或作者硬编剧情替角色做决定。',
          '守主角红线和身份/金手指对齐：删圣母、无脑、内核邪恶、因蠢犯错和自暴自弃；社会身份、身世、金手指、性格必须和世界基调统一。',
          '把人设写成动作、对白和反应；配角必须承担证据、阻碍、反应或代价功能，反派必须从自身目标和约束出发行动。',
          '补反派分量：先展示实力/手段和可信动机，制造真实威胁或至少一次压制；真实目的留到关键反转点，反派长处要照出主角弱点。',
          '补反派自我叙事：让反派在自己眼中是主人公，补梦想/旧痛/避免的痛苦，并把他的优势写成会继续制造冲突的致命缺陷。',
          '补反派层级退场：按小反派/中等反派/大弧 Boss/最终 Boss 匹配篇幅、功能和退场方式，避免小反派拖太久、大 Boss 草率退场或最终 Boss 无伏笔。',
      ],
  }
}

export function assetLinkageContractForSync(contextPackage: any = {}, chapter: any = {}) {
  return buildAssetLinkageContract(contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function assetLinkageArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => assetText(item) || compactBriefText(item)).filter(Boolean), 24)
}

export function normalizeAssetLinkageKeyAssetsCheck(values: any[], chapterText: string) {
  const planned = assetLinkageArray(values)
  if (!planned.length) return null
  const checked = planned.map(text => {
    const match = anchorMatchScore(text, chapterText)
    const firstName = compactBriefText(text.split(/[：:｜(（]/)[0] || text)
    const nameHit = firstName ? normalizedMatchText(chapterText).includes(normalizedMatchText(firstName)) : false
    return {
      text,
      score: Math.max(match.score, nameHit ? 70 : 0),
      evidence: uniqueBriefStrings([...(match.matched || []), nameHit ? firstName : ''], 4),
      delivered: match.score >= 26 || nameHit,
    }
  })
  const missed = checked.filter(item => !item.delivered)
  return {
    key: 'key_assets',
    label: '关键资产',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: Math.round(checked.reduce((sum, item) => sum + Number(item.score || 0), 0) / Math.max(1, checked.length)),
    evidence: checked.flatMap(item => item.evidence).filter(Boolean).slice(0, 8),
    delivered: missed.length === 0,
    status: missed.length === 0 ? 'ok' : 'warn',
    missed_items: missed.map(item => item.text),
    issue: missed.length === 0 ? '' : `关键资产未进入正文：${missed.map(item => item.text).join('；')}`,
    repair_instruction: missed.length === 0 ? '' : '把关键资产写进现场动作、对话压力、规则触发或章尾钩子，不能只留在设定表。',
  }
}

export function normalizeAssetLinkageThreeAppearanceCheck(values: any[], chapterText: string) {
  const planned = assetLinkageArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const assetNames = planned
    .map(item => compactBriefText(item.split(/[：:｜(（]/)[0] || item)
      .replace(/三次出现|第\d次|前段|中段|结尾/g, ''))
    .filter(Boolean)
  const maxHits = assetNames.reduce((max, name) => {
    const normalizedName = normalizedMatchText(name)
    if (!normalizedName) return max
    const count = normalizedMatchText(text).split(normalizedName).length - 1
    return Math.max(max, count)
  }, 0)
  const hasThreeStages = /三次出现|第三次|袖口[^。！？!?]{0,80}案|案上[^。！？!?]{0,80}章尾|前段[^。！？!?]{0,80}中段[^。！？!?]{0,80}结尾/.test(text)
  const hasMeaningShift = /初始意义|意义|颠覆|回扣|从[^。！？!?]{0,30}变成|证据冲击|改变局势|露出血契编号/.test(text)
  const delivered = (maxHits >= 3 || hasThreeStages) && hasMeaningShift
  return {
    key: 'three_appearance_plan',
    label: '贯穿道具',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(20, [maxHits >= 3, hasThreeStages, hasMeaningShift].filter(Boolean).length * 28),
    evidence: [maxHits >= 3 ? '资产多次出现' : '', hasThreeStages ? '三段出现' : '', hasMeaningShift ? '意义/局势变化' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '贯穿道具没有完成三次出现或每次意义变化，容易变成重复点名。',
    repair_instruction: delivered ? '' : '按三次出现修复：第一次建立意义，第二次在冲突中颠覆意义，第三次在结尾兑现证据、情绪或钩子。',
  }
}

export function normalizeAssetLinkageIsolationCheck(contract: any, chapterText: string) {
  const text = String(chapterText || '')
  const assetMentions = assetLinkageArray(contract.key_assets || contract.keyAssets)
    .map(item => compactBriefText(item.split(/[：:｜(（]/)[0] || item))
    .filter(Boolean)
    .filter(name => normalizedMatchText(text).includes(normalizedMatchText(name)))
  const hasUse = /打开|撬开|触发|证明|卡进|锁死|留下|亮出|露出|改变|兑现|逼出/.test(text)
  const hasStoryLink = /目标|冲突|阻碍|回报|章尾|钩子|旁观者|站位|局势|证据|账本原件|血契编号/.test(text)
  const isolated = /没有人真的使用|只被反复提起|只被点名|很重要|复杂来历|顺便介绍|事情就解决了/.test(text)
  const delivered = assetMentions.length === 0 || (!isolated && hasUse && hasStoryLink)
  return {
    key: 'isolated_assets',
    label: '孤立资产',
    text: '本章出现的关键资产必须推进目标、制造阻碍、兑现伏笔、改变关系或打开章尾钩子。',
    expected: '本章出现的关键资产必须推进目标、制造阻碍、兑现伏笔、改变关系或打开章尾钩子。',
    score: delivered ? 86 : 18,
    evidence: [assetMentions.length ? `出现资产：${assetMentions.join('、')}` : '', hasUse ? '有使用动作' : '', hasStoryLink ? '接到故事功能' : '', isolated ? '孤立点名' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : assetMentions,
    issue: delivered ? '' : '关键资产出现在正文里，但没有推进目标、制造阻碍、兑现伏笔、改变关系或打开章尾钩子。',
    repair_instruction: delivered ? '' : '消灭孤立资产：每个资产至少绑定一个现场功能，不能只介绍、点名或当背景摆件。',
  }
}

export function relationshipGraphRiskAssetName(risk: string) {
  return compactBriefText(String(risk || '').split(/[：:]/)[0].replace(/\([^)]*\)|（[^）]*）/g, ''))
}

export function relationshipGraphRiskType(risk: string) {
  const match = String(risk || '').match(/\(([^)]+)\)|（([^）]+)）/)
  return compactBriefText(match?.[1] || match?.[2] || '')
}

export function normalizeAssetLinkageRelationshipGraphRiskCheck(contract: any, chapterText: string) {
  const risks = assetLinkageArray(contract.relationship_graph_risks || contract.relationshipGraphRisks)
  if (!risks.length) return null
  const text = String(chapterText || '')
  const normalizedText = normalizedMatchText(text)
  const unresolvedPattern = /没有人真的使用|没有人使用|没人说明|无法判断|归谁|只被反复提起|只被点名|事情很快就解决|很重要/.test(text)
  const hasUse = /打开|撬开|触发|证明|卡进|锁死|留下|亮出|露出|改变|兑现|逼出|压进|连在一起/.test(text)
  const hasOwner = /归属当场落到|落到[^。！？!?]{0,20}手上|属于|继承权|交到|由[^。！？!?]{1,18}(持有|保管|触发|承担)/.test(text)
  const hasRelation = /连在一起|关联到|绑定|指向|证明|反过来|钩出|牵出|接到|打开章尾钩子/.test(text)
  const hasConsequence = /代价|后果|锁死|红印|承担|限制|改变局势|状态变化/.test(text)
  const checked = risks.map(risk => {
    const riskText = compactBriefText(risk)
    const assetName = relationshipGraphRiskAssetName(riskText)
    const type = relationshipGraphRiskType(riskText)
    const appears = assetName ? normalizedText.includes(normalizedMatchText(assetName)) : true
    const requiresOwner = ['missing_owner', 'owner_ability_mismatch'].includes(type)
    const requiresRelation = ['isolated_key_asset', 'dangling_relation', 'owner_ability_mismatch'].includes(type)
    const delivered = appears
      && !unresolvedPattern
      && hasUse
      && (!requiresOwner || (hasOwner && hasConsequence))
      && (!requiresRelation || hasRelation)
    return {
      risk: riskText,
      assetName,
      type,
      delivered,
      evidence: [
        appears && assetName ? `出现资产：${assetName}` : '',
        hasUse ? '有使用/触发动作' : '',
        hasOwner ? '归属/触发者明确' : '',
        hasRelation ? '接入核心关系' : '',
        hasConsequence ? '后果/代价可见' : '',
        unresolvedPattern ? '仍有悬空表述' : '',
      ].filter(Boolean),
    }
  })
  const missed = checked.filter(item => !item.delivered)
  const delivered = missed.length === 0
  return {
    key: 'relationship_graph_risks',
    label: '关系图风险',
    text: risks.join('；'),
    expected: '关系图风险必须在正文中被改写成资产归属、功能、触发、代价、关系连接或章尾钩子，不能继续孤立、缺归属或悬空引用。',
    score: delivered ? 88 : Math.max(20, Math.round(((checked.length - missed.length) / Math.max(1, checked.length)) * 88)),
    evidence: checked.flatMap(item => item.evidence).filter(Boolean).slice(0, 10),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: missed.map(item => item.risk),
    issue: delivered ? '' : `仍有 ${missed.length} 项关系图风险没有被正文消解。`,
    repair_instruction: delivered ? '' : '优先处理关系图风险：把孤立资产、缺拥有者、悬空引用写成现场功能，明确归属/触发者/限制/代价，并接到目标、冲突、回报或章尾钩子。',
  }
}

export function buildAssetLinkageDeterministicCheck(contextPackage: any, chapterText: string) {
  const risks = [
    /没有人真的使用|只被反复提起|只被点名|很重要，它有很多复杂来历|事情就解决了/.test(String(chapterText || '')) ? {
      key: 'isolated_asset_telling',
      label: '孤立资产点名',
      evidence: '正文点名资产重要，却没有让资产承担现场功能。',
      fix: '让资产触发规则、制造阻碍、改变归属、兑现伏笔或打开章尾钩子。',
    } : null,
    /复杂来历|一整套设定|顺便介绍|完整解释|规则非常复杂/.test(String(chapterText || '')) ? {
      key: 'asset_infodump',
      label: '资产设定说明',
      evidence: '资产信息以说明书方式释放。',
      fix: '把资产信息塞进冲突、质疑、使用、触发和代价反馈。',
    } : null,
    ...scanNewConceptOverloadRisks(contextPackage).map((item: any) => ({
      key: item.key || 'new_concept_overload',
      label: item.label || '新概念过载',
      evidence: item.evidence || item.fix || '本章新增资产/设定概念过多。',
      fix: item.fix || '压缩新概念，优先用已有资产的状态变化制造新鲜感。',
    })),
  ].filter(Boolean)
  if (!risks.length) return null
  return {
    key: 'asset_linkage_forbidden',
    label: '资产挂钩硬伤',
    text: '资产不得只点名、只说明设定、只当背景摆件，也不得让新概念抢走主线。',
    expected: '资产不得只点名、只说明设定、只当背景摆件，也不得让新概念抢走主线。',
    score: Math.max(0, 100 - risks.length * 22),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项资产挂钩确定性风险。`,
    repair_instruction: '按 oh-story 资产挂钩修复：资产要接目标、冲突、回报、章尾钩子和状态变化；设定信息跟冲突走。',
  }
}

export function buildAssetLinkageSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const mergedContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const contract = assetLinkageContractForSync(contextPackage, chapter)
  const checks = [
    normalizeAssetLinkageKeyAssetsCheck(contract.key_assets || contract.keyAssets, chapterText),
    normalizeAssetLinkageFunctionChainCheck(contract.linkage_plan || contract.linkagePlan || contract.usage_rules || contract.usageRules, chapterText),
    normalizeAssetLinkageStateChangeCheck(contract.state_tracking || contract.stateTracking, chapterText),
    normalizeAssetLinkageThreeAppearanceCheck(contract.three_appearance_plan || contract.threeAppearancePlan, chapterText),
    normalizeAssetLinkageInformationCheck(contract.usage_rules || contract.usageRules, chapterText),
    normalizeAssetLinkageIsolationCheck(contract, chapterText),
    normalizeAssetLinkageRelationshipGraphRiskCheck(contract, chapterText),
    buildAssetLinkageDeterministicCheck({ ...(mergedContextPackage || {}), project }, chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = assetLinkagePriority(missed)

  return {
    report_id: `asset-linkage-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '资产挂钩未配置' : status === 'ok' ? '资产挂钩 OK' : `资产挂钩缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 asset_linkage_contract，建议补充关键资产、功能链、状态变化、贯穿道具和信息释放规则。'
      : status === 'ok'
        ? '正文已基本兑现关键资产、功能链、状态变化、贯穿道具和信息随冲突释放。'
        : `正文有 ${missedCount} 项资产挂钩缺口，${priorityRepair || '优先消灭孤立资产并补功能链'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持资产挂钩：关键资产继续接目标、冲突、回报和章尾钩子，信息随冲突释放，状态变化可追踪。']
      : [
          missed.some((item: any) => item.key === 'relationship_graph_risks')
            ? '下一章必须先处理关系图风险：孤立资产要接核心关系，缺拥有者资产要明确归属、触发者、限制和代价。'
            : '',
          '下一章必须补资产挂钩：每个关键资产都要绑定功能、归属、触发条件、限制、后果，并接到目标、冲突、回报或章尾钩子。',
          '删掉只点名、只介绍来历、只当背景摆件的孤立资产；设定信息必须通过使用、质疑、触发、误判或代价反馈释放。',
      ].filter(Boolean),
  }
}

export function stateTrackingContractForSync(contextPackage: any = {}, chapter: any = {}) {
  return buildStateTrackingContract(contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function buildStateTrackingSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = stateTrackingContractForSync(contextPackage, chapter)
  const checks = [
    normalizeStateTrackingCharacterCheck(contract.character_states || contract.characterStates, chapterText),
    normalizeStateTrackingHistoricalCheck(contract.historical_causality || contract.historicalCausality, chapterText),
    normalizeStateTrackingWorldConstraintCheck(contract.world_constraints || contract.worldConstraints, chapterText),
    normalizeStateTrackingSourceReadinessCheck(contract.source_readiness || contract.sourceReadiness),
    normalizeStateTrackingFilterRuleCheck(contract.filter_rules || contract.filterRules, chapterText),
    buildStateTrackingDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = stateTrackingPriority(missed)

  return {
    report_id: `state-tracking-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '状态跟踪未配置' : status === 'ok' ? '状态跟踪 OK' : `状态跟踪缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 state_tracking_contract，建议补充角色状态、前史因果、世界约束、来源就绪和筛选规则。'
      : status === 'ok'
        ? '正文已基本兑现角色状态、前史因果、世界约束、来源就绪和上下文筛选。'
        : `正文有 ${missedCount} 项状态跟踪缺口，${priorityRepair || '优先修角色状态、前史因果和世界约束'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持状态跟踪：只带入本章会写错的角色状态、伏笔前史、世界约束和知识边界。']
      : [
          '下一章必须补状态跟踪：角色状态、前史因果、世界约束和知识边界要在行动选择、阻碍、代价或信息释放中生效。',
          '删掉不改变本章行动选择的背景和百科设定；missing/warn 来源不能被正文写成既定事实。',
      ],
  }
}

export function intentConfirmationContractForSync(contextPackage: any = {}, chapter: any = {}) {
  return buildIntentConfirmationContract(contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function normalizeIntentStructureCheck(values: any[], contextPackage: any, chapterText: string) {
  const planned = intentConfirmationArray(values)
  const scannerRisks = [
    ...scanCharacterOrderExecutionRisks(contextPackage, chapterText),
    ...scanBeatSequenceExecutionRisks(contextPackage, chapterText),
  ]
  if (!planned.length && !scannerRisks.length) return null
  const anchor = intentConfirmationAnchorScore(planned, chapterText, 20)
  const text = String(chapterText || '')
  const hasStructureEvidence = /内容概括|逻辑线|出场顺序|周薄森|林青禾|李玄|压问|反击|信息差|章尾|下一问|下一章/.test(text)
  const generic = /大家讨论很久|事情就解决了|本章只是过渡|说了很多背景/.test(text)
  const delivered = scannerRisks.length === 0 && !generic && (planned.length ? (anchor.missed.length === 0 || hasStructureEvidence) : hasStructureEvidence)
  return {
    key: 'structure_inputs',
    label: '结构输入',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, generic ? 18 : 50),
    evidence: uniqueBriefStrings([
      ...anchor.evidence,
      hasStructureEvidence ? '结构输入信号可见' : '',
      ...scannerRisks.map((item: any) => item.evidence),
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      ...anchor.missed.map(item => item.text),
      ...scannerRisks.map((item: any) => item.label),
    ], 8),
    issue: delivered ? '' : '内容概括、逻辑线、人物出场顺序或情节点序列没有按写前结构落地。',
    repair_instruction: delivered ? '' : '补结构输入：按内容概括、逻辑线、出场顺序和情节点序列重排压力铺垫、转折、爽点兑现和承接。',
  }
}

export function normalizeIntentCostRewardCheck(contract: any, contextPackage: any, chapterText: string) {
  const plan = intentCostRewardPlan(contract)
  const scannerRisks = scanCostRewardExecutionRisks(contextPackage, chapterText)
  if (!plan && !scannerRisks.length) return null
  const match = anchorMatchScore(plan, chapterText)
  const text = String(chapterText || '')
  const negated = /没有代价|没有收益|不需要付出|毫无代价|之后再说/.test(text)
  const hasCost = /代价|公开得罪|得罪|开罪|暴露|付出|风险|惩罚|敌视|站队/.test(text)
  const hasReward = /收益|拿到|夺回|获得|解释权|反证入口|洗清|证明|赢下/.test(text)
  const delivered = scannerRisks.length === 0 && !negated && hasCost && hasReward && (match.score >= 18 || hasCost || hasReward)
  return {
    key: 'cost_reward',
    label: '代价/收益',
    text: plan,
    expected: plan,
    score: delivered ? Math.max(84, match.score) : Math.min(match.score, negated ? 12 : 48),
    evidence: uniqueBriefStrings([
      ...match.matched,
      hasCost ? '代价可见' : '',
      hasReward ? '收益可见' : '',
      negated ? '否定代价/收益' : '',
      ...scannerRisks.map((item: any) => item.evidence),
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasCost ? '缺代价' : '',
      !hasReward ? '缺收益' : '',
      ...scannerRisks.map((item: any) => item.label),
    ], 8),
    issue: delivered ? '' : '代价兑现和收益兑现没有拆开落到正文，或被“没有代价/没有收益”跳过。',
    repair_instruction: delivered ? '' : '补代价/收益：写清谁付出代价、谁获得收益、后续账是什么，不能只写结果。',
  }
}

export function buildIntentConfirmationSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const mergedContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const contract = intentConfirmationContractForSync(contextPackage, chapter)
  const checks = [
    normalizeIntentConfirmedCheck(contract.confirmed_intent || contract.confirmedIntent, chapterText),
    normalizeIntentRhythmStyleCheck(contract.rhythm_and_style || contract.rhythmAndStyle, chapterText),
    normalizeIntentStructureCheck(contract.structure_inputs || contract.structureInputs, mergedContextPackage, chapterText),
    normalizeIntentCostRewardCheck(contract, mergedContextPackage, chapterText),
    normalizeIntentEndingHandoffCheck(contract, chapterText),
    normalizeIntentReactionCheck(contract.execution_focus || contract.executionFocus, chapterText),
    normalizeIntentDialogueToneBaselineCheck(contract.dialogue_tone_baseline || contract.dialogueToneBaseline, chapterText),
    buildIntentConfirmationSelfReportCheck(chapterText),
    buildIntentConfirmationDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = intentConfirmationPriority(missed)

  return {
    report_id: `intent-confirmation-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '意图确认未配置' : status === 'ok' ? '意图确认 OK' : `意图确认缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 intent_confirmation_contract，建议补充确认意图、节奏/文风、结构输入、代价/收益和章尾承接。'
      : status === 'ok'
        ? '正文已基本兑现确认意图、节奏/文风、结构输入、代价/收益、章尾承接和信息差反应。'
        : `正文有 ${missedCount} 项意图确认缺口，${priorityRepair || '优先修本章意图、代价收益和章尾承接'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持意图确认：继续让本章意图、节奏文风、结构输入、代价收益和章尾承接在正文中可见。']
      : [
          '下一章必须补意图确认：先重申本章意图，再把代价收益、信息差反应和章尾承接写成可见事件和正文证据。',
          '删掉泛化过渡、讨论后解决、无代价收益和背景说明；按确认意图重排压力铺垫、短句爆发、冷却承接和下一章追问。',
        ],
  }
}

export function continuityHeatContractForSync(contextPackage: any = {}, chapter: any = {}) {
  return buildContinuityHeatContract(contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function buildContinuityHeatSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = continuityHeatContractForSync(contextPackage, chapter)
  const checks = [
    normalizeContinuityHeatStateCheck(contract.heat_states || contract.heatStates, chapterText),
    normalizeContinuityActiveExpectationCheck(contract.active_expectations || contract.activeExpectations, chapterText),
    normalizeContinuityWatchItemsCheck(contract.watch_items || contract.watchItems, chapterText),
    normalizeContinuityDormantBoundaryCheck(contract.dormant_allowed || contract.dormantAllowed, chapterText),
    buildContinuityHeatDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = continuityHeatPriority(missed)

  return {
    report_id: `continuity-heat-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '连续性热度未配置' : status === 'ok' ? '连续性热度 OK' : `连续性热度缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 continuity_heat_contract，建议补充 hot/warm/cold/archived 热度状态、活跃期待、关注项和休眠边界。'
      : status === 'ok'
        ? '正文已基本兑现 hot/warm/cold/archived 热度管理，活跃期待、关注项和休眠边界都有处理。'
        : `正文有 ${missedCount} 项连续性热度缺口，${priorityRepair || '优先推进活跃期待、触达关注项并修休眠边界'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持连续性热度：hot 推进，warm 触达，cold 回收前升温，archived 保持休眠边界。']
      : [
          '下一章必须补连续性热度：把活跃伏笔和期待写成当场压力、行动门槛、证据变化或章尾问题。',
          '解释允许休眠的元素为什么不能解决当前危机；cold 线回收前必须先升温，避免空 callback 和“以后再说”。',
      ],
  }
}

export function conflictStructureContractForSync(project: any = {}, contextPackage: any = {}, chapter: any = {}) {
  return buildConflictStructureContract(project, contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function buildConflictStructureSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = conflictStructureContractForSync(project, contextPackage, chapter)
  const checks = [
    normalizeConflictLadderCheck(contract.conflict_ladder || contract.conflictLadder, chapterText),
    normalizeConflictMotivationCheck(contract.motivation_sources || contract.motivationSources, chapterText),
    normalizeConflictPressureCheck(contract.antagonist_pressure_rules || contract.antagonistPressureRules, chapterText),
    normalizeConflictAgencyCheck(contract.protagonist_agency_rules || contract.protagonistAgencyRules, chapterText),
    normalizeConflictEventValueCheck(contract.event_value_changes || contract.eventValueChanges, chapterText),
    normalizeConflictNextSeedCheck(contract.next_conflict_seeds || contract.nextConflictSeeds, chapterText),
    normalizeConflictNetworkLayersCheck(contract.conflict_network_layers || contract.conflictNetworkLayers, chapterText),
    normalizeConflictWebCheck(contract.conflict_web || contract.conflictWeb, chapterText),
    normalizeConflictNoExitCheck(contract.no_exit_rules || contract.noExitRules, chapterText),
    buildConflictStructureDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = conflictStructurePriority(missed)
  const hasConflictWebMiss = missed.some((item: any) => item.key === 'conflict_web')
  const hasConflictNetworkLayerMiss = missed.some((item: any) => item.key === 'conflict_network_layers')

  return {
    report_id: `conflict-structure-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '冲突结构未配置' : status === 'ok' ? '冲突结构 OK' : `冲突结构缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 conflict_structure_contract，建议补充冲突阶梯、动机来源、压势规则、主角行动力、胜负变化和下一冲突。'
      : status === 'ok'
        ? '正文已基本兑现冲突阶梯、动机来源、压势规则、主角行动力、胜负变化和下一冲突种子。'
        : `正文有 ${missedCount} 项冲突结构缺口，${priorityRepair || '优先补阻止者、冲突阶梯和胜负变化'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持冲突结构：继续让阻止者、升级阶梯、主角破局、胜负变化、矛盾网和下一冲突种子可见。']
      : [
          '下一章必须补冲突结构：先设置真实阻止者，再把言语压力升级成行动阻碍、激烈对抗和明确胜负。',
          missed.some((item: any) => item.key === 'no_exit_rules')
            ? '补有进无出：让读者相信主角非踏入不可，明确死亡赌注/退出代价，并用杀人理由、工作职责、道德责任或实体场所把对立双方黏住。'
            : '',
          hasConflictNetworkLayerMiss ? '补三层矛盾网：同时写清纵向/横向/交叉矛盾，按定地图→定阵营→定角色编织，让解决一层时牵动另一层。' : '',
          '让主角主动破局，补清资格/资源/信息/关系/局势变化，并从结果里自然埋下下一冲突种子。',
          hasConflictWebMiss ? '补矛盾网：同一时刻保持2-3条矛盾线互相牵连，解决一条后必须激活或加深另一条。' : '',
      ].filter(Boolean),
  }
}

export function upgradeRhythmContractForSync(project: any = {}, contextPackage: any = {}, chapter: any = {}) {
  return buildUpgradeRhythmContract(project, contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function buildUpgradeRhythmSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = upgradeRhythmContractForSync(project, contextPackage, chapter)
  const checks = [
    normalizeUpgradeGapCheck(contract.upgrade_gap || contract.upgradeGap, chapterText),
    normalizeUpgradeGainCheck(contract.upgrade_gain_plan || contract.upgradeGainPlan, chapterText),
    normalizeUpgradeFeedbackCheck(contract.feedback_loop || contract.feedbackLoop, chapterText),
    normalizeUpgradeEmotionModuleCheck(contract.emotion_modules || contract.emotionModules, chapterText),
    normalizeUpgradeBridgeRhythmCheck(contract.bridge_rhythm || contract.bridgeRhythm, chapterText),
    normalizeGoldfingerEvolutionCheck(contract.goldfinger_evolution || contract.goldfingerEvolution, chapterText),
    normalizeGoldfingerConflictBalanceCheck(contract.goldfinger_conflict_balance_rules || contract.goldfingerConflictBalanceRules, chapterText),
    normalizeGoldfingerSimplicityCheck(contract.goldfinger_simplicity_rules || contract.goldfingerSimplicityRules, chapterText),
    normalizeGoldfingerMultiDimensionGrowthCheck(contract.goldfinger_multi_dimension_growth_rules || contract.goldfingerMultiDimensionGrowthRules, chapterText),
    normalizeUpgradeRankingLadderCheck(contract.ranking_ladder_rules || contract.rankingLadderRules, chapterText),
    buildUpgradeRhythmDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = upgradeRhythmPriority(missed)

  return {
    report_id: `upgrade-rhythm-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '升级节奏未配置' : status === 'ok' ? '升级节奏 OK' : `升级节奏缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 upgrade_rhythm_contract，建议补充升级前缺口、升级收获、反馈闭环、情绪模块、桥段节奏和榜单升级动力。'
      : status === 'ok'
        ? '正文已基本兑现升级前缺口、升级收获、即时/延迟反馈、情绪模块、桥段承接和榜单升级动力。'
        : `正文有 ${missedCount} 项升级节奏缺口，${priorityRepair || '优先补升级前缺口、反馈闭环、榜单升级动力和下一门槛'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持升级节奏：升级前缺口、即时反馈、新能力展示、延迟反馈、榜单升级动力和下一门槛都要可见。']
      : [
          '下一章必须补升级节奏：先补升级前缺口，再展示新能力或以前做不到的事。',
          '升级后立刻给即时反馈和阶段收益，同时引入更高门槛、延迟奖励或下一目标，避免奖励到账后事情结束。',
          missed.some((item: any) => item.key === 'ranking_ladder_rules')
            ? '补榜单升级动力：排名提升后挂出下一名次或下一目标，通过排行榜介绍新对手，并写出装逼余震如何改变态度、报价、资源、权限或规则评价。'
            : '',
          missed.some((item: any) => item.key === 'goldfinger_conflict_balance')
            ? '金手指必须刚好解决当前矛盾，不能一键清场或完全没用；解决后必须暴露更大矛盾、更高门槛或下一目标。'
            : '',
          missed.some((item: any) => item.key === 'goldfinger_simplicity_rules')
            ? '简化金手指：功能、触发条件、奖励反馈和升级规则必须一眼就懂，删掉说明书式规则树和万能外挂。'
            : '',
          missed.some((item: any) => item.key === 'goldfinger_multi_dimension_growth_rules')
            ? '补金手指多维成长：至少让词条、功能、品质、熟练度或条件-反馈中的两条线同步变化，避免只剩品质/数值单线提升。'
            : '',
          missed.some((item: any) => item.key === 'goldfinger_evolution_drift')
            ? '金手指演进必须保留核心作用，只增加新的使用方式；升华到世界/规则层级前先补伏笔。'
            : '',
      ].filter(Boolean),
  }
}

export function targetReaderContractForSync(project: any, contextPackage: any, chapter: any = {}) {
  return buildTargetReaderContract(project, contextWithChapterRawPreDraftForSync(contextPackage, chapter))
}

export function targetReaderArray(values: any) {
  return asArray(values).map((item: any) => compactBriefText(item)).filter(Boolean)
}

export function countTargetReaderSignals(chapterText: string, patterns: RegExp[]) {
  const text = String(chapterText || '')
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0)
}

export function normalizeTargetReaderProfileCheck(value: any, chapterText: string) {
  const expected = compactBriefText(value)
  if (!expected) return null
  const match = anchorMatchScore(expected, chapterText)
  const signalCount = countTargetReaderSignals(chapterText, [
    /番茄|男频|女频|平台|类型读者|目标读者/,
    /碎片|追更|短平快|快节奏/,
    /快速反馈|即时反馈|当场反馈/,
    /爽感|掌控感|尊严|补偿/,
  ])
  const hollowReaderClaim = /读者会喜欢|大家会喜欢/.test(String(chapterText || ''))
  const delivered = !hollowReaderClaim && (match.score >= 36 || signalCount >= 2)
  return {
    key: 'reader_profile',
    label: '读者画像',
    text: expected,
    expected,
    score: delivered ? Math.max(84, match.score) : Math.min(match.score, hollowReaderClaim ? 24 : 52),
    evidence: uniqueBriefStrings([
      ...match.matched,
      signalCount >= 2 ? '目标读者画像代理信号可见' : '',
      hollowReaderClaim ? '空泛读者判断' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : ['缺少可见目标读者画像或只写空泛读者判断'],
    issue: delivered ? '' : '目标读者画像没有转成正文可见的口味、平台、追更节奏或情绪需求。',
    repair_instruction: delivered ? '' : '补目标读者画像：用追更节奏、平台口味、爽感/掌控感/快速反馈等信号校准本章表达。',
  }
}

export function normalizeTargetReaderDesireCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const text = String(chapterText || '')
  const desireSignals = countTargetReaderSignals(text, [
    /规则反制|反制|规则边界/,
    /智斗|信息差|破局/,
    /不公平|拿掉|反打|压迫/,
    /爽点|爽感|掌控感/,
    /升级|即时反馈|快速反馈/,
  ])
  const deliveredItems = scored.filter(item => item.match.score >= 32).length
  const delivered = deliveredItems >= Math.max(1, Math.ceil(planned.length * 0.4)) || desireSignals >= 3
  return {
    key: 'reader_desires',
    label: '读者欲望',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(18, desireSignals * 16),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      desireSignals >= 3 ? '读者欲望代理信号可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 32).slice(0, 8),
    issue: delivered ? '' : '目标读者想看的规则反制、信息差、不公平移除、爽点或即时反馈没有落成正文事件。',
    repair_instruction: delivered ? '' : '补读者欲望：把目标读者想看的内容写成主角行动、现场反制、即时反馈和可见结果。',
  }
}

export function normalizeTargetReaderEmotionalGapCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const gapSignals = countTargetReaderSignals(text, [
    /情绪缺口|核心痛苦|深层情结|未满足需求/,
    /不甘|渴望|逃避|爱|恨/,
    /掌控感|安全感|尊严|补偿|解气/,
    /被规则压着走|被安排|不公平|被轻视|被否定/,
    /快速反馈|即时反馈|亲手反制|拿回/,
  ])
  const hollowReaderClaim = /读者会喜欢|大家会喜欢/.test(text) && !/核心痛苦|情绪缺口|不甘|掌控感|未满足需求/.test(text)
  const deliveredItems = scored.filter(item => item.match.score >= 30).length
  const delivered = !hollowReaderClaim && (deliveredItems >= Math.max(1, Math.ceil(planned.length * 0.35)) || gapSignals >= 3)
  return {
    key: 'emotional_gap_analysis',
    label: '情绪缺口',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(18, gapSignals * 16),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      gapSignals >= 3 ? '情绪缺口代理信号可见' : '',
      hollowReaderClaim ? '空泛读者判断未触及核心痛苦' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 30).slice(0, 8),
    issue: delivered ? '' : '目标读者的核心痛苦、深层情结、高频情绪关键词或未满足需求没有落成正文情绪缺口。',
    repair_instruction: delivered ? '' : '按 oh-story 情绪缺口分析修复：从目标读者画像推核心痛苦和深层情结，把不甘、渴望、掌控、安全感、尊严补偿等未满足需求写成冲突压力和读者回报。',
  }
}

export function normalizeTargetReaderAttractionCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const text = String(chapterText || '')
  const attractionSignals = countTargetReaderSignals(text, [
    /超人蛮力|规则反制|信息差/,
    /门外水声|旧钥匙缺口|可见线索/,
    /可见回报|回报|章尾期待|下一章/,
    /客户.*反应|退让|结果/,
  ])
  const deliveredItems = scored.filter(item => item.match.score >= 34).length
  const delivered = deliveredItems >= Math.max(1, Math.ceil(planned.length * 0.45)) || attractionSignals >= 2
  return {
    key: 'chapter_attractions',
    label: '本章吸引点',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(18, attractionSignals * 18),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      attractionSignals >= 2 ? '本章吸引点代理信号可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 34).slice(0, 8),
    issue: delivered ? '' : '本章吸引点没有写成可复述的场面、线索、反制结果或章尾期待。',
    repair_instruction: delivered ? '' : '补本章吸引点：把卖点落成具体场景，让读者看见线索、反应、结果和章尾问题。',
  }
}

export function normalizeTargetReaderGenreVitalityCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const sampleSignals = countTargetReaderSignals(text, [/当前.*样本|目标平台样本|近期样本|样本验证|scan|analyze/])
  const stageSignals = countTargetReaderSignals(text, [/新鲜期|成熟期|审美疲劳期/])
  const actionSignals = countTargetReaderSignals(text, [/边界期待|微创新|新切入点|保守满足|当前事实/])
  const historicalAssumption = /曾经很火|不用.*样本验证|不需要.*样本|不用.*判断.*新鲜期|不用.*判断.*成熟期|历史经验.*当前事实|历史热度.*当前事实/.test(text)
  const delivered = !historicalAssumption && sampleSignals >= 1 && stageSignals >= 1 && actionSignals >= 1
  return {
    key: 'genre_vitality_rules',
    label: '题材生命力',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(16, (sampleSignals + stageSignals + actionSignals) * 18 - (historicalAssumption ? 18 : 0)),
    evidence: uniqueBriefStrings([
      sampleSignals ? '当前目标平台样本验证可见' : '',
      stageSignals ? '题材阶段判断可见' : '',
      actionSignals ? '阶段对应写法可见' : '',
      historicalAssumption ? '用历史热度或否定样本验证替代当前事实' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !sampleSignals ? '缺当前目标平台样本验证' : '',
      !stageSignals ? '缺新鲜期/成熟期/审美疲劳期判断' : '',
      !actionSignals ? '缺阶段对应写法' : '',
      historicalAssumption ? '不能把历史经验当作当前事实' : '',
    ], 8),
    issue: delivered ? '' : '题材生命力没有用当前目标平台样本和阶段判断校准。',
    repair_instruction: delivered ? '' : '补题材生命力：用当前目标平台样本验证题材阶段，明确新鲜期/成熟期/审美疲劳期下本章该稳边界还是给新切入点。',
  }
}

export function normalizeTargetReaderPlatformFitCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const crossSiteSignals = countTargetReaderSignals(text, [/不能用A网站.*B网站|A网站.*样本.*B网站|不同平台|同一题材.*不同平台|没有把.*样本.*硬套|不.*样本.*硬套/])
  const targetPlatformSignals = countTargetReaderSignals(text, [/目标平台|平台.*校准|读者期待|节奏|雷点/])
  const platformTasteSignals = countTargetReaderSignals(text, [/番茄.*强情绪|强情绪.*番茄|爽感直给|起点.*慢节奏|慢节奏.*起点|正常剧情推进/])
  const copiedPlatform = /直接.*A网站.*套.*B网站|把A网站.*套到B网站|不用看.*番茄.*起点|不需要看.*平台.*差异/.test(text)
  const delivered = !copiedPlatform && targetPlatformSignals >= 1 && platformTasteSignals >= 1 && crossSiteSignals >= 1
  return {
    key: 'platform_fit_rules',
    label: '平台适配',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(16, (crossSiteSignals + targetPlatformSignals + platformTasteSignals) * 18 - (copiedPlatform ? 18 : 0)),
    evidence: uniqueBriefStrings([
      crossSiteSignals ? '跨网站差异意识可见' : '',
      targetPlatformSignals ? '目标平台样本校准可见' : '',
      platformTasteSignals ? '平台口味差异可见' : '',
      copiedPlatform ? '直接套用其他平台样本' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !crossSiteSignals ? '缺跨网站样本不可直接套用的约束' : '',
      !targetPlatformSignals ? '缺目标平台样本校准' : '',
      !platformTasteSignals ? '缺番茄/起点等平台口味差异' : '',
      copiedPlatform ? '不能把A网站样本硬套到B网站' : '',
    ], 8),
    issue: delivered ? '' : '平台适配没有落到目标平台样本、节奏、读者期待或雷点校准。',
    repair_instruction: delivered ? '' : '补平台适配：用目标平台样本校准写法，明确番茄强情绪/爽感直给、起点慢节奏代入等差异，禁止A站样本硬套B站。',
  }
}

export function normalizeTargetReaderBoundaryFitCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const boundarySignals = countTargetReaderSignals(text, [/边界感|题材边界|成熟题材|创新题材|混搭/])
  const supportSignals = countTargetReaderSignals(text, [/素材、知识储备和篇幅|素材.*知识储备.*篇幅|能支撑|支撑所选题材|降低篇幅|创新数量/])
  const unsupported = /素材.*不够|知识储备.*不够|篇幅.*不够|硬写混搭|边界.*漂移/.test(text)
    || (/无法支撑/.test(text) && !/没有.*无法支撑|避免.*无法支撑|不.*无法支撑/.test(text))
  const delivered = !unsupported && boundarySignals >= 1 && supportSignals >= 1
  return {
    key: 'boundary_fit_rules',
    label: '题材边界',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(16, (boundarySignals + supportSignals) * 22 - (unsupported ? 18 : 0)),
    evidence: uniqueBriefStrings([
      boundarySignals ? '题材边界意识可见' : '',
      supportSignals ? '素材/知识/篇幅支撑可见' : '',
      unsupported ? '明知素材/知识/篇幅不支撑仍硬写' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !boundarySignals ? '缺题材边界感确认' : '',
      !supportSignals ? '缺素材、知识储备和篇幅支撑判断' : '',
      unsupported ? '题材混搭或创新超出当前支撑能力' : '',
    ], 8),
    issue: delivered ? '' : '题材边界没有确认素材、知识储备和篇幅是否支撑。',
    repair_instruction: delivered ? '' : '补题材边界：压回当前素材、知识储备和篇幅能支撑的范围；创新题材降低篇幅和创新数量，成熟题材稳住边界期待。',
  }
}

export function normalizeTargetReaderTitleBlurbAlignmentCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const titleSignals = countTargetReaderSignals(text, [/书名.*3秒|3秒.*抓人|书名.*核心卖点|书名.*钩子/])
  const blurbSignals = countTargetReaderSignals(text, [/简介.*安全感.*钩子|安全感.*钩子|主角会赢|悬念/])
  const alignmentSignals = countTargetReaderSignals(text, [/书名简介内容.*三位一体|书名.*简介.*正文|货板一致|货不对板/])
  const mismatch = /书名、简介和正文.*各写各的|各写各的|货不对板.*没关系|卖点.*不一致/.test(text)
  const delivered = !mismatch && titleSignals >= 1 && blurbSignals >= 1 && alignmentSignals >= 1
  return {
    key: 'title_blurb_alignment_rules',
    label: '书名简介一致',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(16, (titleSignals + blurbSignals + alignmentSignals) * 18 - (mismatch ? 18 : 0)),
    evidence: uniqueBriefStrings([
      titleSignals ? '书名3秒钩子可见' : '',
      blurbSignals ? '简介安全感+钩子可见' : '',
      alignmentSignals ? '书名简介内容一致性可见' : '',
      mismatch ? '书名简介正文货不对板' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !titleSignals ? '缺书名3秒抓人/核心卖点信号' : '',
      !blurbSignals ? '缺简介安全感+钩子信号' : '',
      !alignmentSignals ? '缺书名简介内容三位一体' : '',
      mismatch ? '存在货不对板风险' : '',
    ], 8),
    issue: delivered ? '' : '书名、简介和正文承诺没有证明同一核心卖点。',
    repair_instruction: delivered ? '' : '补书名简介内容一致：书名3秒传卖点，简介给安全感+钩子，正文兑现同一件事，修掉货不对板。',
  }
}

export function normalizeTargetReaderImmersionPlasticityCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const immersionSignals = countTargetReaderSignals(text, [/代入感|读者代入|投射进主角/])
  const cohesionSignals = countTargetReaderSignals(text, [/世界观自洽|画风统一|同一画风|规则.*自洽|像真实存在/])
  const plasticitySignals = countTargetReaderSignals(text, [/塑料感|仙侠搞科研|画风撕裂|不仙|不侠/])
  const rupture = (/塑料感.*明显|画风撕裂|仙侠世界.*搞科研|仙侠.*搞科研|武侠不侠/.test(text))
    && !/没有.*塑料感|无塑料感|避免.*塑料感|没有.*仙侠.*搞科研|避免.*仙侠.*搞科研|画风统一/.test(text)
  const delivered = !rupture && immersionSignals >= 1 && cohesionSignals >= 1 && plasticitySignals >= 1
  return {
    key: 'immersion_plasticity_rules',
    label: '代入与塑料感',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(16, (immersionSignals + cohesionSignals + plasticitySignals) * 18 - (rupture ? 18 : 0)),
    evidence: uniqueBriefStrings([
      immersionSignals ? '代入感信号可见' : '',
      cohesionSignals ? '世界观自洽/画风统一可见' : '',
      plasticitySignals ? '塑料感防线可见' : '',
      rupture ? '画风撕裂或塑料感明显' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !immersionSignals ? '缺代入感锚点' : '',
      !cohesionSignals ? '缺世界观自洽/画风统一' : '',
      !plasticitySignals ? '缺塑料感风险检查' : '',
      rupture ? '存在仙侠搞科研式画风撕裂' : '',
    ], 8),
    issue: delivered ? '' : '代入感与塑料感没有被校准，世界规则或画风可能撕裂。',
    repair_instruction: delivered ? '' : '补代入与去塑料感：让主角行动、世界规则和读者期待同向，保持世界观自洽和画风统一，删掉撕裂设定。',
  }
}

export function normalizeTargetReaderGoldfingerLifeFitCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const lifeFitSignals = countTargetReaderSignals(text, [/金手指.*生活\/职业|金手指.*生活.*职业|生活\/职业.*息息相关|职业.*息息相关|当下生活处境/])
  const mainlineSignals = countTargetReaderSignals(text, [/服务主线|主线.*有关|技能.*升级|一个技能.*不同效果|职业技能|资源变化/])
  const unrelated = (/和生活职业无关|职业无关|生活无关|硬贴外挂|医生.*隐身|频繁开新金手指/.test(text))
    && !/不是硬贴外挂|不是.*硬贴|不.*硬贴|避免.*硬贴|不要.*硬贴/.test(text)
  const delivered = !unrelated && lifeFitSignals >= 1 && mainlineSignals >= 1
  return {
    key: 'goldfinger_life_fit_rules',
    label: '金手指生活关联',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(16, (lifeFitSignals + mainlineSignals) * 22 - (unrelated ? 18 : 0)),
    evidence: uniqueBriefStrings([
      lifeFitSignals ? '金手指与生活/职业关联可见' : '',
      mainlineSignals ? '金手指服务主线可见' : '',
      unrelated ? '金手指与主角生活/职业脱节' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !lifeFitSignals ? '缺金手指与主角生活/职业关联' : '',
      !mainlineSignals ? '缺金手指服务主线或升级反馈' : '',
      unrelated ? '金手指硬贴且脱离人物处境' : '',
    ], 8),
    issue: delivered ? '' : '金手指没有证明与主角生活/职业和主线处境紧密相关。',
    repair_instruction: delivered ? '' : '补金手指生活关联：把能力绑定主角职业、生活困境、主线问题和可升级反馈，删除硬贴外挂或无关新能力。',
  }
}

export function normalizeTargetReaderCommercialExpressionCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const ratioSignals = countTargetReaderSignals(text, [/私人表达.*5%|没有超过5%|不超过全篇5%/])
  const serviceSignals = countTargetReaderSignals(text, [/服务核心卖点|服务.*主线|不能独立于主线|不得独立于主线|没有.*作者自己的观点/])
  const overExpressed = /私人表达占.*很多|私人表达.*很多篇幅|独立于主线卖点|作者自己的观点.*很多|打断叙事节奏/.test(text)
  const delivered = !overExpressed && ratioSignals >= 1 && serviceSignals >= 1
  return {
    key: 'commercial_expression_rules',
    label: '商业表达',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(16, (ratioSignals + serviceSignals) * 22 - (overExpressed ? 18 : 0)),
    evidence: uniqueBriefStrings([
      ratioSignals ? '私人表达占比控制可见' : '',
      serviceSignals ? '私人表达服务核心卖点/主线可见' : '',
      overExpressed ? '私人表达过量或脱离主线' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !ratioSignals ? '缺私人表达不超过5%的占比约束' : '',
      !serviceSignals ? '缺私人表达服务核心卖点/主线约束' : '',
      overExpressed ? '私人表达过量或独立于主线' : '',
    ], 8),
    issue: delivered ? '' : '商业表达没有证明私人表达受控并服务核心卖点。',
    repair_instruction: delivered ? '' : '补商业表达控制：私人表达不超过5%，且必须服务核心卖点和主线剧情；删掉独立观点输出。',
  }
}

export function normalizeTargetReaderValidationCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const profileSignals = countTargetReaderSignals(text, [/目标读者|男频|女频|番茄|追更|碎片/, /爽感|掌控感|快速反馈/])
  const desireSignals = countTargetReaderSignals(text, [/规则反制|信息差|不公平|爽点|即时反馈/])
  const payoffSignals = countTargetReaderSignals(text, [/回报|结果|反应|章尾期待|可见线索|下一章/])
  const delivered = profileSignals >= 1 && desireSignals >= 1 && payoffSignals >= 1
  return {
    key: 'validation_questions',
    label: '三问验证',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(18, (profileSignals + desireSignals + payoffSignals) * 18),
    evidence: uniqueBriefStrings([
      profileSignals ? '写给谁可见' : '',
      desireSignals ? '想看什么可见' : '',
      payoffSignals ? '本章回报可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !profileSignals ? '缺写给谁' : '',
      !desireSignals ? '缺目标读者想看什么' : '',
      !payoffSignals ? '缺本章可感知回报' : '',
    ], 8),
    issue: delivered ? '' : '目标读者三问缺少正文证据：写给谁、想看什么、本章给了什么回报。',
    repair_instruction: delivered ? '' : '补三问验证：明确读者画像、读者欲望和本章可感知回报，每项都必须有正文证据。',
  }
}

export function normalizeTargetReaderCorrectionMethodCheck(values: any[], chapterText: string) {
  const planned = targetReaderArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const correctionSignals = countTargetReaderSignals(text, [
    /删掉|删除|没有停在|不再停在/,
    /自嗨|设定展示|展示设定/,
    /动作|反应|结果/,
    /章尾期待|可感知回报|卖点/,
  ])
  const selfIndulgent = /作者觉得|世界观很有意思|主要展示设定|只是介绍设定/.test(text) && !/动作|反应|结果|回报/.test(text)
  const delivered = !selfIndulgent && correctionSignals >= 3
  return {
    key: 'correction_methods',
    label: '修正方法',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(16, correctionSignals * 18),
    evidence: uniqueBriefStrings([
      correctionSignals >= 3 ? '修正方法已转成正文执行信号' : '',
      selfIndulgent ? '仍停留在作者自嗨/设定展示' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : ['缺少把设定展示改成动作、反应、结果和章尾期待的执行证据'],
    issue: delivered ? '' : '修正方法没有落地，正文仍可能停在作者自嗨设定展示。',
    repair_instruction: delivered ? '' : '按修正方法重写：删掉作者自嗨设定展示，把卖点落成动作、反应、结果和章尾期待。',
  }
}

export function buildTargetReaderDeterministicCheck(chapterText: string) {
  const text = String(chapterText || '')
  const risks = [
    /读者会喜欢|大家会喜欢/.test(text) ? {
      key: 'hollow_reader_claim',
      label: '空泛读者判断',
      evidence: '正文用“读者会喜欢/大家会喜欢”替代目标读者证据。',
      fix: '改成具体读者画像、想看内容和可感知回报。',
    } : null,
    /作者觉得|我觉得|世界观很有意思/.test(text) ? {
      key: 'author_self_indulgence',
      label: '作者自嗨',
      evidence: '正文站在作者角度评价设定有趣，没有证明读者为什么追。',
      fix: '把作者判断改成读者能看见的冲突、反制、收益和期待。',
    } : null,
    /主要展示设定|没有明显回报|没有可感知回报|只是介绍设定/.test(text) ? {
      key: 'no_reader_payoff',
      label: '缺可感知回报',
      evidence: '正文直接承认本章只展示设定或没有明显回报。',
      fix: '补动作结果、角色反应、线索兑现和章尾期待。',
    } : null,
  ].filter(Boolean)
  if (!risks.length) return null
  return {
    key: 'target_reader_forbidden',
    label: '目标读者硬伤',
    text: '目标读者检查不得用空泛喜欢、作者自嗨或设定展示替代正文回报。',
    expected: '目标读者检查不得用空泛喜欢、作者自嗨或设定展示替代正文回报。',
    score: Math.max(0, 100 - risks.length * 28),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项目标读者确定性风险。`,
    repair_instruction: '按 oh-story 自嗨判定法修复：写清给谁看、读者想看什么、本章给了什么可感知回报。',
  }
}

export function targetReaderPriority(missed: any[]) {
  if (missed.some(item => item.key === 'target_reader_forbidden')) return '优先清目标读者硬伤'
  if (missed.some(item => item.key === 'genre_vitality_rules')) return '优先补题材生命力样本验证'
  if (missed.some(item => item.key === 'platform_fit_rules')) return '优先校准目标平台写法'
  if (missed.some(item => item.key === 'title_blurb_alignment_rules')) return '优先修书名简介正文一致'
  if (missed.some(item => item.key === 'boundary_fit_rules')) return '优先压回题材边界'
  if (missed.some(item => item.key === 'immersion_plasticity_rules')) return '优先修代入感和塑料感'
  if (missed.some(item => item.key === 'goldfinger_life_fit_rules')) return '优先修金手指生活关联'
  if (missed.some(item => item.key === 'commercial_expression_rules')) return '优先收束私人表达'
  if (missed.some(item => item.key === 'emotional_gap_analysis')) return '优先补情绪缺口'
  if (missed.some(item => item.key === 'reader_desires')) return '优先补读者欲望'
  if (missed.some(item => item.key === 'chapter_attractions')) return '优先补本章吸引点'
  if (missed.some(item => item.key === 'validation_questions')) return '优先补目标读者三问'
  if (missed.some(item => item.key === 'reader_profile')) return '优先补读者画像'
  if (missed.some(item => item.key === 'correction_methods')) return '优先落修正方法'
  return ''
}

export function buildTargetReaderSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = targetReaderContractForSync(project, contextPackage, chapter)
  const checks = [
    normalizeTargetReaderProfileCheck(contract.reader_profile || contract.readerProfile, chapterText),
    normalizeTargetReaderDesireCheck(contract.reader_desires || contract.readerDesires || contract.desires, chapterText),
    normalizeTargetReaderEmotionalGapCheck(contract.emotional_gap_analysis || contract.emotionalGapAnalysis, chapterText),
    normalizeTargetReaderAttractionCheck(contract.chapter_attractions || contract.chapterAttractions || contract.attractions, chapterText),
    normalizeTargetReaderGenreVitalityCheck(contract.genre_vitality_rules || contract.genreVitalityRules || contract.genre_lifecycle_rules || contract.genreLifecycleRules, chapterText),
    normalizeTargetReaderPlatformFitCheck(contract.platform_fit_rules || contract.platformFitRules || contract.platform_adaptation_rules || contract.platformAdaptationRules, chapterText),
    normalizeTargetReaderBoundaryFitCheck(contract.boundary_fit_rules || contract.boundaryFitRules || contract.genre_boundary_rules || contract.genreBoundaryRules, chapterText),
    normalizeTargetReaderTitleBlurbAlignmentCheck(contract.title_blurb_alignment_rules || contract.titleBlurbAlignmentRules || contract.copy_alignment_rules || contract.copyAlignmentRules, chapterText),
    normalizeTargetReaderImmersionPlasticityCheck(contract.immersion_plasticity_rules || contract.immersionPlasticityRules || contract.immersion_rules || contract.immersionRules, chapterText),
    normalizeTargetReaderGoldfingerLifeFitCheck(contract.goldfinger_life_fit_rules || contract.goldfingerLifeFitRules || contract.goldfinger_fit_rules || contract.goldfingerFitRules, chapterText),
    normalizeTargetReaderCommercialExpressionCheck(contract.commercial_expression_rules || contract.commercialExpressionRules || contract.private_expression_rules || contract.privateExpressionRules, chapterText),
    normalizeTargetReaderValidationCheck(contract.validation_questions || contract.validationQuestions, chapterText),
    normalizeTargetReaderCorrectionMethodCheck(contract.correction_methods || contract.correctionMethods, chapterText),
    buildTargetReaderDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = targetReaderPriority(missed)

  return {
    report_id: `target-reader-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '目标读者未配置' : status === 'ok' ? '目标读者 OK' : `目标读者缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 target_reader_contract，建议补充读者画像、读者欲望、题材生命力、平台适配、题材边界、书名简介内容一致、本章吸引点、三问验证和修正方法。'
      : status === 'ok'
        ? '正文已基本兑现目标读者画像、读者欲望、情绪缺口、题材生命力、平台适配、题材边界、书名简介一致、代入感、金手指生活关联、商业表达、本章吸引点、三问验证和修正方法。'
        : `正文有 ${missedCount} 项目标读者缺口，${priorityRepair || '优先补目标读者三问和可感知回报'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持目标读者兑现：写给谁、想看什么、本章回报和章尾期待都要有正文证据。']
      : [
          '下一章必须补目标读者：先写清本章给谁看、目标读者想看什么，再把卖点写成现场行动。',
          '补 genre-readers 适配：用当前目标平台样本判断题材生命力，校准平台写法、题材边界、代入感和雷点。',
          '修书名简介内容三位一体：书名3秒传核心卖点，简介给安全感+钩子，正文兑现同一承诺，避免货不对板。',
          '校准金手指和商业表达：金手指必须贴住主角生活/职业并服务主线，私人表达不超过5%且服务核心卖点。',
          '补情绪缺口：从核心痛苦、深层情结、高频情绪关键词和未满足需求里挑一项，写成角色当下压力和读者可见回报。',
          '把规则反制、信息差、不公平移除或升级反馈落成可感知回报，避免只说读者会喜欢或只展示设定。',
        ],
  }
}

export function genrePositioningContractForSync(project: any, contextPackage: any, chapter: any = {}) {
  return buildGenrePositioningContract(project, contextWithChapterRawPreDraftForSync(contextPackage, chapter))
}

export function buildGenrePositioningSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = genrePositioningContractForSync(project, contextPackage, chapter)
  const checks = [
    normalizeGenreLabelCheck(contract.genre_label || contract.genreLabel, chapterText),
    normalizeGenrePsychologyCheck(contract.reader_psychology || contract.readerPsychology, chapterText),
    normalizeGenreFormulaCheck(contract.genre_formula || contract.genreFormula, chapterText),
    normalizeGenreCoreHookCheck(contract.core_hook_rules || contract.coreHookRules, chapterText),
    normalizeGoldfingerFitCheck(contract.goldfinger_fit_rules || contract.goldfingerFitRules, chapterText),
    normalizeMustHaveSceneCheck(contract.must_have_scenes || contract.mustHaveScenes, chapterText),
    normalizePlatformFitCheck(contract.platform_fit_rules || contract.platformFitRules, chapterText),
    normalizeMicroInnovationCheck(contract.micro_innovation_rules || contract.microInnovationRules, chapterText),
    normalizeGenreLongboardFocusCheck(contract.longboard_focus_rules || contract.longboardFocusRules, chapterText),
    buildGenrePositioningDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = genrePositioningPriority(missed)

  return {
    report_id: `genre-positioning-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '题材定位未配置' : status === 'ok' ? '题材定位 OK' : `题材定位缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 genre_positioning_contract，建议补充题材标签、读者心理、类型公式、核心梗、金手指贴合、必备场景、平台适配、微创新边界和题材长板。'
      : status === 'ok'
        ? '正文已基本兑现题材标签、读者心理、类型公式、核心梗、金手指贴合、必备场景、平台适配、微创新边界和题材长板。'
        : `正文有 ${missedCount} 项题材定位缺口，${priorityRepair || '优先统一题材承诺和正文桥段'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持题材定位：题材标签、核心梗、金手指、必备场景、题材长板和平台回报必须持续同一承诺。']
      : [
          '下一章必须补题材定位：先统一题材标签、核心梗和金手指贴合，再把必备场景写成正文桥段。',
          '拉题材长板：优先强化核心卖点、目标情绪和最高频爽点，删除会稀释核心卖点的补短板支线。',
          '避免挂羊头卖狗肉：书名简介承诺什么，正文就必须用场景、能力、订单结果和平台回报兑现什么。',
      ],
  }
}

export function plotSpecialTopicsContractForSync(project: any, contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const writingBible = syncContextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const explicit = getContextContract(syncContextPackage, 'plot_special_topics_contract')
    || writingBible?.plot_special_topics_contract
    || writingBible?.plotSpecialTopicsContract
    || project?.reference_config?.plot_special_topics_contract
    || project?.reference_config?.plotSpecialTopicsContract
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) return explicit
  return buildOhStoryPlotSpecialTopicsContract(project, syncContextPackage, chapter)
}

export function plotSpecialTopicsArray(values: any) {
  return asArray(values).map((item: any) => compactBriefText(item)).filter(Boolean)
}

export function countPlotSpecialTopicsSignals(chapterText: string, patterns: RegExp[]) {
  const text = String(chapterText || '')
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0)
}

export function normalizePlotSpecialTopicsExecutionCheck(
  key: string,
  label: string,
  values: any,
  chapterText: string,
  patterns: RegExp[],
  issue: string,
  repairInstruction: string,
  options: { minSignals?: number } = {},
) {
  const planned = plotSpecialTopicsArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const deliveredItems = scored.filter(item => item.match.score >= 28).length
  const signalCount = countPlotSpecialTopicsSignals(chapterText, patterns)
  const minSignals = Number(options.minSignals || 2)
  const delivered = deliveredItems >= 1 || signalCount >= minSignals
  return {
    key,
    label,
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100), signalCount * 24) : Math.max(16, signalCount * 18),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      signalCount >= minSignals ? `${label}代理信号可见` : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    matched_topics: [],
    goldfinger_execution: key === 'goldfinger_execution' ? (delivered ? '金手指拆分、多维成长或反馈证据已进入正文。' : '金手指拆分、多维成长或反馈证据不足。') : '',
    genre_boundary_execution: key === 'genre_boundary_execution' ? (delivered ? '题材边界和核心卖点循环已有正文证据。' : '题材边界和核心卖点循环缺正文证据。') : '',
    market_benchmark_execution: key === 'market_benchmark_execution' ? (delivered ? '扫榜/对标方法已转成可见桥段或结构证据。' : '扫榜/对标方法未转成正文证据。') : '',
    urban_high_martial_execution: key === 'urban_high_martial_execution' ? (delivered ? '都市高武的钱、资源、资格或赛事压力已落地。' : '都市高武的钱、资源、资格或赛事压力不足。') : '',
    launch_checkpoint_execution: key === 'launch_checkpoint_execution' ? (delivered ? '三万字卡点、上架高潮或倒推目标已有正文证据。' : '三万字卡点、上架高潮或倒推目标缺正文证据。') : '',
    faction_hand_execution: key === 'faction_hand_execution' ? (delivered ? '阵营手牌、逐级出牌或第三方逻辑已有正文证据。' : '阵营手牌、逐级出牌或第三方逻辑缺正文证据。') : '',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 28).slice(0, 8),
    issue: delivered ? '' : issue,
    fix: delivered ? '' : repairInstruction,
    repair_instruction: delivered ? '' : repairInstruction,
    remaining_risk: delivered ? '' : issue,
  }
}

export function plotSpecialTopicsPriority(missed: any[]) {
  if (missed.some(item => item.key === 'launch_checkpoint_execution')) return '优先补三万字卡点倒推'
  if (missed.some(item => item.key === 'goldfinger_execution')) return '优先补金手指执行'
  if (missed.some(item => item.key === 'genre_boundary_execution')) return '优先校题材边界'
  if (missed.some(item => item.key === 'faction_hand_execution')) return '优先补阵营手牌'
  if (missed.some(item => item.key === 'urban_high_martial_execution')) return '优先补都市高武目标'
  if (missed.some(item => item.key === 'market_benchmark_execution')) return '优先补扫榜对标'
  return ''
}

export function buildPlotSpecialTopicsSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = plotSpecialTopicsContractForSync(project, contextPackage, chapter)
  const matchedTopics = uniqueBriefStrings(contract?.matched_topics || contract?.matchedTopics, 10)
  const checks = [
    normalizePlotSpecialTopicsExecutionCheck(
      'goldfinger_execution',
      '金手指拆分与战力防崩',
      [
        ...asArray(contract?.goldfinger_design_rules || contract?.goldfingerDesignRules),
        ...asArray(contract?.goldfinger_advanced_rules || contract?.goldfingerAdvancedRules),
      ],
      chapterText,
      [/金手指|系统|面板|抽卡|熟练度|词条|加点|商城|兑换/, /不倒退|没有倒退|重复提升|多维成长|多条线/, /反馈|奖励|条件|阶段|功能/],
      '金手指没有拆成可循环元素，或后期成长/反馈只剩单线说明。',
      '补金手指执行：把面板/条件/反馈/重复提升写成行动过程和局势变化，避免只解释规则。',
    ),
    normalizePlotSpecialTopicsExecutionCheck(
      'genre_boundary_execution',
      '题材边界',
      contract?.genre_boundary_rules || contract?.genreBoundaryRules,
      chapterText,
      [/题材边界|同题材|类型边界|核心期待/, /核心卖点|核心循环|读者.*进来|持续给/, /边界内|不突破|不越界|共同元素/],
      '正文没有证明核心卖点循环仍在题材边界内，可能出现越界创新或挂羊头卖狗肉。',
      '补题材边界执行：把当前场景拉回同题材读者买账的共同元素，并让金手指核心循环服务本题材期待。',
    ),
    normalizePlotSpecialTopicsExecutionCheck(
      'market_benchmark_execution',
      '扫榜对标',
      [
        ...asArray(contract?.market_benchmark_rules || contract?.marketBenchmarkRules),
        ...asArray(contract?.benchmark_selection_rules || contract?.benchmarkSelectionRules),
        ...asArray(contract?.three_book_fusion_rules || contract?.threeBookFusionRules),
      ],
      chapterText,
      [/扫榜|对标|竞品|拆书|同平台|同题材|同类型/, /精品|万订|读者评论|样本|近期数据/, /结构|情绪|节奏模块|功能位/],
      '扫榜、对标或三书融合没有转成正文里的结构、情绪或节奏功能证据。',
      '补扫榜对标执行：只复用功能位和节奏/情绪结构，把对标价值写成当前章节的桥段功能。',
    ),
    normalizePlotSpecialTopicsExecutionCheck(
      'urban_high_martial_execution',
      '都市高武',
      contract?.urban_high_martial_rules || contract?.urbanHighMartialRules,
      chapterText,
      [/钱|奖金|资源|资格|名额|补贴|收入/, /联考|武馆|军校|治安局|军部|月考|赛事|武道会/, /物质|学业|职业|亲情|激励|感情/],
      '都市高武目标没有和钱、资源、资格、赛事或现实发展挂钩。',
      '补都市高武执行：把升级收益换算成钱/资源/资格，并用联考、武馆、赛事、治安局或军部任务承载事件。',
    ),
    normalizePlotSpecialTopicsExecutionCheck(
      'launch_checkpoint_execution',
      '三万字卡点',
      contract?.launch_checkpoint_rules || contract?.launchCheckpointRules,
      chapterText,
      [/三万字|3万字|上架高潮|首秀|卡点|倒推/, /核心反派|阶段目标|关键爽点|上架/, /围绕.*卡点|卡点.*设计/],
      '正文没有服务三万字卡点、上架高潮或倒推阶段目标。',
      '补三万字卡点执行：删掉无关装逼打脸，把核心反派、阶段目标和关键爽点写回卡点倒推链路。',
    ),
    normalizePlotSpecialTopicsExecutionCheck(
      'faction_hand_execution',
      '阵营手牌',
      [
        ...asArray(contract?.faction_hand_rules || contract?.factionHandRules),
        ...asArray(contract?.faction_motivation_rules || contract?.factionMotivationRules),
      ],
      chapterText,
      [/阵营|友军|敌方|第三方|观众|配角|反派/, /实力高低|依次出牌|逐级递进|先抑后扬|最后出手|手牌/, /队长|教练|高人|大BOSS|boss|碾压/i],
      '阵营冲突没有按手牌/实力顺序逐级出牌，第三方逻辑或动机铺垫不足。',
      '补阵营手牌执行：按观众/配角/敌人/主角/大BOSS逐级递进，让不同立场角色对同一事件给出不同态度。',
    ),
  ].filter(Boolean)
    .map((check: any) => ({
      ...check,
      matched_topics: matchedTopics,
    }))
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = plotSpecialTopicsPriority(missed)

  return {
    report_id: `plot-special-topics-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '特殊题材未配置' : status === 'ok' ? '特殊题材 OK' : `特殊题材缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 plot_special_topics_contract，建议补充金手指、题材边界、扫榜对标、都市高武、三万字卡点和阵营手牌规则。'
      : status === 'ok'
        ? '正文已基本兑现特殊题材合同：金手指、题材边界、扫榜对标、都市高武、三万字卡点和阵营手牌均有正文证据。'
        : `正文有 ${missedCount} 项特殊题材缺口，${priorityRepair || '优先补特殊题材操作证据'}。`,
    matched_topics: matchedTopics,
    check_count: checks.length,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: plotSpecialTopicsArray(contract?.quality_checks || contract?.qualityChecks).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持特殊题材执行：每章继续让金手指、题材边界、阶段卡点和阵营手牌变成正文事件。']
      : [
          '下一章必须补特殊题材：把 plot_special_topics_checks 的缺口先转成开篇目标、中段事件或章末卡点。',
          '金手指与题材边界优先：能力反馈必须参与胜负或资源变化，不能只做说明书。',
          '如果命中三万字卡点或阵营手牌，删除无关桥段，把阶段目标、核心反派和逐级出牌写成可见正文证据。',
        ],
  }
}

export function femaleAudienceContractForSync(project: any, contextPackage: any, chapter: any = {}) {
  return buildFemaleAudienceContract(project, contextWithChapterRawPreDraftForSync(contextPackage, chapter))
}

export function buildFemaleAudienceSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = femaleAudienceContractForSync(project, contextPackage, chapter)
  const checks = contract ? [
    normalizeFemaleCorePrinciplesCheck(contract.core_principles || contract.corePrinciples, chapterText),
    normalizeFemaleReaderNeedCheck(contract.reader_need_rules || contract.readerNeedRules, chapterText),
    normalizeFemaleCopyPromiseCheck(contract.copy_promise_rules || contract.copyPromiseRules, chapterText),
    normalizeFemaleLongformGenreCheck(contract.longform_genre_rules || contract.longformGenreRules, chapterText),
    normalizeFemaleRomanceAxisCheck(contract.romance_axis_rules || contract.romanceAxisRules, chapterText),
    normalizeFemaleAbuseDosageCheck(contract.abuse_dosage_rules || contract.abuseDosageRules, chapterText),
    normalizeFemalePlatformFitCheck(contract.platform_fit_rules || contract.platformFitRules, chapterText),
    normalizeFemaleQualityCheck(contract.quality_checks || contract.qualityChecks, chapterText),
    buildFemaleAudienceDeterministicCheck(chapterText),
  ].filter(Boolean) : []
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = femaleAudiencePriority(missed)

  return {
    report_id: `female-audience-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '女频长篇未配置' : status === 'ok' ? '女频长篇 OK' : `女频长篇缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 female_audience_contract；只有女性向项目才需要该同步报告。'
      : status === 'ok'
        ? '正文已基本兑现安全感、代入感、女主主动性、深层需求、文案承诺、感情线双轴、虐戏剂量和平台适配。'
        : `正文有 ${missedCount} 项女频长篇缺口，${priorityRepair || '优先补安全感、女主主动性和虐后回补'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract?.quality_checks || contract?.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持女频长篇兑现：安全感、女主主动选择、成长节点上的感情升级和虐后回补都要可见。']
      : [
          '下一章必须补女频长篇：先补安全感锚点，再让女主亲自做决定、亲自推进、亲自承担结果。',
          '受委屈后必须立刻给反转、糖、退路或阶段胜利；感情升级要踩在女主事业/成长节点上。',
      ],
  }
}

export function plotDynamicsContractForSync(contextPackage: any, chapter: any = {}) {
  return buildPlotDynamicsContract(contextWithChapterRawPreDraftForSync(contextPackage, chapter))
}

export function buildPlotDynamicsSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = plotDynamicsContractForSync(contextPackage, chapter)
  const checks = [
    normalizePlotLoopCheck(contract.plot_loop || contract.plotLoop, chapterText),
    normalizeClimaxFormulaCheck(contract.climax_formula || contract.climaxFormula, chapterText),
    normalizePlotAbOutlineCheck(contract.ab_outline || contract.abOutline, chapterText),
    normalizePlotScenePurposeCheck(contract.scene_purpose_map || contract.scenePurposeMap, chapterText),
    normalizePlotDriveModeRulesCheck(contract.drive_mode_rules || contract.driveModeRules, chapterText),
    normalizeLineStaggerRulesCheck(contract.line_stagger_rules || contract.lineStaggerRules, chapterText),
    buildPlotDynamicsDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = plotDynamicsPriority(missed)

  return {
    report_id: `plot-dynamics-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '剧情动力未配置' : status === 'ok' ? '剧情动力 OK' : `剧情动力缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 plot_dynamics_contract，建议补充目标、阻碍、行动、代价/反馈、新期待、高潮公式、驱动方式和多线错峰。'
      : status === 'ok'
        ? '正文已基本兑现目标、阻碍、行动、代价/反馈、新期待、高潮公式、A/B节奏、场景功能、驱动方式和多线错峰。'
        : `正文有 ${missedCount} 项剧情动力缺口，${priorityRepair || '优先补剧情闭环和高潮落差'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持剧情动力：目标、阻碍、行动、代价/反馈、新期待、高潮情绪落差、题材匹配的驱动方式和主线/支线错峰推进都要可见。']
      : [
          '下一章必须补剧情动力：先立清目标和阻碍，再写主角行动、代价/反馈和新的章末期待，并让主线和支线错开节奏推进。',
          '按题材修驱动方式：番茄爽文/打脸文每章给一个外部结果（赢、升级、对手栽）；情感驱动保留人物心结；混合模式主线事件推进，每 3-5 章插情感停顿。',
          '高潮必须有蓄能、假胜、崩解、交叉死磕和悬置收尾，避免顺滑解决后直接结束。',
        ],
  }
}

export function storyPowerContractForSync(contextPackage: any, chapter: any = {}) {
  return buildStoryPowerContract({}, contextWithChapterRawPreDraftForSync(contextPackage, chapter))
}

export function buildStoryPowerSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = storyPowerContractForSync(contextPackage, chapter)
  const checks = [
    normalizeStoryPowerCheck('story_power_dimensions', '故事五维', contract.story_power_dimensions || contract.storyPowerDimensions, chapterText),
    normalizeStoryPowerCheck('chapter_power_loop', '本章故事力循环', contract.chapter_power_loop || contract.chapterPowerLoop, chapterText),
    normalizeStoryPowerCheck('action_rules', '有动作才是故事', contract.action_rules || contract.actionRules, chapterText),
    normalizeStoryPowerCheck('beginning_end_rules', '有始有终', contract.beginning_end_rules || contract.beginningEndRules, chapterText),
    normalizeStoryPowerCheck('causal_feedback_rules', '因果反馈', contract.causal_feedback_rules || contract.causalFeedbackRules, chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = storyPowerPriority(missed)
  return {
    report_id: `story-power-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '故事力未配置' : status === 'ok' ? '故事力 OK' : `故事力缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 story_power_contract，建议补充故事五维、可见行动、有始有终和因果反馈。'
      : status === 'ok'
        ? '正文已基本兑现故事五维、行动改变局势、有始有终和因果反馈。'
        : `正文有 ${missedCount} 项故事力缺口，${priorityRepair || '优先补可见行动和因果反馈'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持故事力：故事五维、行动改变局势、章首到章末状态变化和因果反馈都要可见。']
      : [
          '下一章必须补故事力：先补目标和阻碍，再写角色主动行动，让行动带来代价、信息、关系、规则或敌方反制反馈。',
          '开场压力必须在章末转成状态变化、下一步选择或新期待；不要用解释、旁观或内心独白替代行动。',
        ],
  }
}

export function sceneDriveExpectation(contextPackage: any, chapter: any = {}) {
  const sceneCards = storyDriveSceneCards(contextPackage, chapter)
  const card = sceneCards.find((item: any) => compactText(
    item?.goal
    || item?.purpose
    || item?.conflict
    || item?.turning_point
    || item?.turningPoint
    || item?.reader_payoff
    || item?.readerPayoff,
    80,
  )) || {}
  return [
    card?.goal || card?.purpose,
    card?.conflict,
    card?.turning_point || card?.turningPoint || card?.turn || card?.reversal,
    card?.reader_payoff || card?.readerPayoff,
  ].filter(Boolean).join('；')
}

export function storyDriveSceneCards(contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const brief = syncContextPackage?.pre_draft_brief || syncContextPackage?.preDraftBrief || {}
  return [
    ...asArray(target.scene_cards || target.sceneCards),
    ...asArray(syncContextPackage?.scene_cards || syncContextPackage?.sceneCards),
    ...asArray(brief.scene_briefs || brief.sceneBriefs),
    ...asArray(brief.scene_cards || brief.sceneCards),
  ]
}

export function buildStoryDriveSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const brief = syncContextPackage?.pre_draft_brief || syncContextPackage?.preDraftBrief || {}
  const sceneCards = storyDriveSceneCards(syncContextPackage, chapter)
  const dimensions = [
    normalizeStoryDriveDimension(
      'chapter_goal',
      '本章目标',
      firstCompactText(
        target.chapter_goal,
        target.chapterGoal,
        target.goal,
        target.objective,
        brief.chapter_goal,
        brief.chapterGoal,
        brief.chapter_objective,
        brief.chapterObjective,
        firstSceneCardText(sceneCards, ['goal', 'purpose', 'reader_payoff', 'payoff']),
      ),
      chapterText,
      42,
    ),
    normalizeStoryDriveDimension(
      'obstacle',
      '明确阻碍',
      firstCompactText(
        target.core_conflict,
        target.coreConflict,
        target.conflict,
        brief.core_conflict,
        brief.coreConflict,
        brief.conflict,
        firstSceneCardText(sceneCards, ['conflict', 'obstacle', 'pressure']),
      ),
      chapterText,
      40,
    ),
    normalizeStoryDriveDimension(
      'protagonist_choice',
      '主角选择',
      firstCompactText(
        target.protagonist_choice,
        target.protagonistChoice,
        target.active_choice,
        target.activeChoice,
        target.main_character_choice,
        target.mainCharacterChoice,
        brief.protagonist_choice,
        brief.protagonistChoice,
        firstSceneCardText(sceneCards, ['protagonist_choice', 'protagonistChoice', 'active_choice', 'activeChoice', 'turning_point', 'turningPoint', 'turn', 'reversal']),
      ),
      chapterText,
      42,
    ),
    normalizeStoryDriveDimension(
      'choice_cost',
      '选择代价',
      firstCompactText(
        target.choice_cost,
        target.choiceCost,
        target.cost,
        target.consequence,
        target.stakes,
        brief.choice_cost,
        brief.choiceCost,
        brief.cost,
        firstSceneCardText(sceneCards, ['choice_cost', 'cost', 'consequence', 'stakes', 'risk']),
      ),
      chapterText,
      42,
    ),
    normalizeStoryDriveDimension(
      'state_change',
      '状态变化',
      firstCompactText(
        target.state_change,
        target.stateChange,
        target.exit_state,
        target.exitState,
        target.chapter_state_change,
        target.chapterStateChange,
        brief.state_change,
        brief.stateChange,
        firstSceneCardText(sceneCards, ['exit_state', 'exitState', 'state_change', 'stateChange', 'result', 'scene_result', 'sceneResult']),
      ),
      chapterText,
      42,
    ),
    normalizeStoryDriveDimension(
      'causal_next_step',
      '下一步因果',
      firstCompactText(
        target.causal_next_step,
        target.causalNextStep,
        target.next_step,
        target.nextStep,
        target.ending_hook,
        target.endingHook,
        brief.causal_next_step,
        brief.causalNextStep,
        brief.ending_hook,
        brief.endingHook,
        firstSceneCardText(sceneCards, ['causal_next_step', 'causalNextStep', 'next_step', 'nextStep', 'ending_hook', 'endingHook', 'exit_hook', 'exitHook']),
      ),
      chapterText,
      42,
    ),
  ].filter(Boolean)

  const delivered = dimensions.filter((item: any) => item.delivered)
  const missed = dimensions.filter((item: any) => !item.delivered)
  const score = Math.max(0, Math.min(100, Math.round(
    dimensions.length ? dimensions.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / dimensions.length : 82,
  )))
  const status = missed.length > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = storyDrivePriority(missed)

  return {
    report_id: `story-drive-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: dimensions.length === 0 ? '故事力未配置' : status === 'ok' ? '故事力 OK' : `故事力缺口 ${missed.length}`,
    summary: dimensions.length === 0
      ? '本章没有明确的故事驱动力任务书，建议补充主角选择、阻碍、代价和状态变化。'
      : status === 'ok'
        ? '本章目标、阻碍、主角选择、选择代价、状态变化和下一步因果已形成可追踪行动链。'
        : `本章有 ${missed.length} 项故事驱动力缺口，${priorityRepair || '优先补主角主动选择和代价反馈'}。`,
    missed_count: missed.length,
    priority_repair: priorityRepair,
    dimensions,
    planned: dimensions,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持本章主角主动选择、外部阻碍、选择代价、状态变化和下一步因果的连续执行。']
      : [
          '下一次修订必须补出主角主动选择、明确阻碍、选择代价、局面变化和下一步因果。',
          '不能只用旁白解释剧情推进；缺口必须写成现场行动、对话交锋、代价反馈或状态变化。',
          '如果本章原本只是过场，至少让主角做一个不可逆的小选择，并让下一章承接其后果。',
        ],
  }
}

export function storyLoopContractFromContext(contextPackage: any = {}, chapter: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = {
    ...(target?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(contextPackage?.preDraftBrief || {}),
    ...(chapter?.raw_payload?.pre_draft_brief || {}),
    ...(chapter?.raw_payload?.preDraftBrief || {}),
  }
  return target.story_loop_contract
    || target.storyLoopContract
    || brief.story_loop_contract
    || brief.storyLoopContract
    || contextPackage?.story_loop_contract
    || contextPackage?.storyLoopContract
    || {}
}

export function buildStoryLoopSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = storyLoopContractFromContext(contextPackage, chapter)
  const beats = [
    normalizeStoryLoopBeat('setup', '铺垫入局', firstCompactText(contract.setup, contract.opening_setup, contract.openingSetup), chapterText, 36),
    normalizeStoryLoopBeat('escalation', '升级阻碍', firstCompactText(contract.escalation, contract.obstacle_escalation, contract.obstacleEscalation), chapterText, 36),
    normalizeStoryLoopBeat('payoff', '兑现反馈', firstCompactText(contract.payoff, contract.feedback, contract.result), chapterText, 36),
    normalizeStoryLoopBeat('carry_over', '承接期待', firstCompactText(contract.carry_over, contract.carryOver, contract.next_expectation, contract.nextExpectation), chapterText, 36),
    normalizeStoryLoopMapTransitionCheck(contract.map_transition_rules || contract.mapTransitionRules, chapterText),
    normalizeStoryLoopNestedLoopCheck(contract.nested_loop_rules || contract.nestedLoopRules, chapterText),
  ].filter(Boolean)
  const delivered = beats.filter((item: any) => item.delivered)
  const missed = beats.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    beats.length ? beats.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / beats.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = storyLoopPriority(missed)

  return {
    report_id: `story-loop-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: beats.length === 0 ? '故事循环未配置' : status === 'ok' ? '故事循环 OK' : `故事循环缺口 ${missedCount}`,
    summary: beats.length === 0
      ? '本章没有配置 story_loop_contract，建议补充 setup、escalation、payoff 和 carry_over。'
      : status === 'ok'
        ? '本章已形成 setup -> escalation -> payoff -> carry_over 的故事循环闭环。'
        : `正文有 ${missedCount} 项故事循环缺口，${priorityRepair || '优先补兑现反馈和承接期待'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: beats,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持 setup -> escalation -> payoff -> carry_over：每章既完成本章反馈，也把下一章期待接上。']
      : [
          '下一次修订必须补足 setup -> escalation -> payoff -> carry_over，把铺垫、阻碍升级、兑现反馈和承接期待写成正文可见事件。',
          '不能只用“事情进入下一阶段”或旁白总结替代承接；章尾必须留下由本章反馈触发的新目标、新风险、新线索或新期待。',
          missed.some((item: any) => item.key === 'map_transition_rules')
            ? '补换地图承接：旧地图核心冲突先阶段性解决，再用过渡人物/旧关系/贯穿主线带出新地图五件套；必须先让人际关系动了 -> 主角再动，前5章建立代入感和期待感，避免旧线全抛和新设定一次性倒出。'
            : '',
          missed.some((item: any) => item.key === 'nested_loop_rules')
            ? '补故事循环嵌套：小循环 -> 中循环 -> 大循环必须同时可见，小循环中必须铺垫大循环的期待，并把同一核心卖点换不同角度/不同矛盾推进。'
            : '',
        ],
  }
}

export function informationFlowContractForSync(contextPackage: any = {}, chapter: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = {
    ...(target?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(contextPackage?.preDraftBrief || {}),
    ...(chapter?.raw_payload?.pre_draft_brief || {}),
    ...(chapter?.raw_payload?.preDraftBrief || {}),
  }
  return target?.information_flow_contract
    || target?.informationFlowContract
    || contextPackage?.information_flow_contract
    || contextPackage?.informationFlowContract
    || brief?.information_flow_contract
    || brief?.informationFlowContract
    || {}
}

export function buildInformationFlowSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = informationFlowContractForSync(contextPackage, chapter)
  const checks = [
    normalizeInformationFlowCheck(
      'information_units',
      '信息团',
      [
        contract.information_units,
        contract.informationUnits,
        contract.scene_information_units,
        contract.sceneInformationUnits,
      ],
      chapterText,
      '补足每个场景的信息团，让读者能一句话概括这段在推进什么信息。',
    ),
    normalizeInformationFlowCheck(
      'reveal_order',
      '揭示顺序',
      [
        contract.reveal_order,
        contract.revealOrder,
        contract.progression_chain,
        contract.progressionChain,
      ],
      chapterText,
      '按发现、验证、反转、回收、升级或推出新目标的顺序重排信息释放。',
      30,
    ),
    normalizeInformationFlowCheck(
      'suspense_responses',
      '悬念回应',
      [
        contract.suspense_responses,
        contract.suspenseResponses,
        contract.transition_rules,
        contract.transitionRules,
      ],
      chapterText,
      '回应、升级或明确延迟上一场悬念，不能断裂换题。',
    ),
    buildInformationFlowNextObjectiveCheck(contract, chapterText),
    buildInformationFlowTransitionCompressionCheck(contract, chapterText),
    buildInformationFlowInfodumpCheck(contract, chapterText, {
      scanInfodumpRisks,
      scanDialogueInfodumpRisks,
    }),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = informationFlowPriority(missed)

  return {
    report_id: `information-flow-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '信息流未配置' : status === 'ok' ? '信息流 OK' : `信息流缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 information_flow_contract，建议补充信息团、揭示顺序、悬念回应、过渡压缩和无背景说明书规则。'
      : status === 'ok'
        ? '正文的信息团、揭示顺序、悬念回应、过渡压缩和无背景说明书规则已基本落地。'
        : `正文有 ${missedCount} 项信息流缺口，${priorityRepair || '优先保证信息随冲突释放'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持信息流：每个场景都有可概括信息团，信息随冲突释放，揭示顺序递进，悬念有回应或明确延迟，提升后立刻给出下一目标，无信息量过渡直接删除或压缩。']
      : [
          '下一次修订必须补足信息流：信息随冲突释放，按揭示顺序递进，回应上一场悬念，提升后补下一目标，删无信息量过渡和背景说明书。',
          '每个场景至少交付一个可概括信息团；纯移动、寒暄、环境描写和设定说明没有信息量时直接删除或压缩。',
        ],
  }
}

export function expectationThresholdContractForSync(contextPackage: any = {}, chapter: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = {
    ...(target?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(contextPackage?.preDraftBrief || {}),
    ...(chapter?.raw_payload?.pre_draft_brief || {}),
    ...(chapter?.raw_payload?.preDraftBrief || {}),
  }
  return target?.expectation_threshold_contract
    || target?.expectationThresholdContract
    || contextPackage?.expectation_threshold_contract
    || contextPackage?.expectationThresholdContract
    || brief?.expectation_threshold_contract
    || brief?.expectationThresholdContract
    || {}
}

export function buildExpectationThresholdSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = expectationThresholdContractForSync(contextPackage, chapter)
  const twoLongOneShort = expectationThresholdArray(
    contract.short_expectation,
    contract.shortExpectation,
    contract.current_expectations,
    contract.currentExpectations,
    contract.medium_expectations,
    contract.mediumExpectations,
    contract.long_expectations,
    contract.longExpectations,
  )
  const checks = [
    normalizeExpectationThresholdCheck(
      'two_long_one_short',
      '两长一短',
      twoLongOneShort,
      chapterText,
      '恢复两长一短：短期期待驱动当前单元，1-2条长期期待保持远期拉力。',
      30,
    ),
    normalizeExpectationThresholdCheck(
      'thresholds',
      '门槛拆分',
      [
        contract.thresholds,
        contract.gates,
        contract.conditions,
        contract.payoff_or_delay_plan,
        contract.payoffOrDelayPlan,
      ],
      chapterText,
      '把大目标拆成资源型、成就型、多条件型、动态门槛或收集型条件，不能一步解决。',
      30,
    ),
    normalizeExpectationThresholdCheck(
      'dynamic_thresholds',
      '动态加码',
      [
        contract.dynamic_thresholds,
        contract.dynamicThresholds,
      ],
      chapterText,
      '每跨越一个门槛就立刻设立下一个门槛、代价或更高条件。',
      30,
    ),
    normalizeExpectationThresholdCheck(
      'three_expectation_lines',
      '三种期待线',
      expectationThreeLinesArray(contract.three_expectation_lines || contract.threeExpectationLines),
      chapterText,
      '补齐三种期待线：剧情期待负责吊胃口，主题甜头负责持续满足，新鲜感负责间歇刺激，三者必须同时有正文证据。',
      30,
    ),
    buildExpectationBeforePayoffCheck(contract, chapterText),
    buildExpectationThresholdNextOpenLoopCheck(contract, chapterText, {
      scanExpectationVacuumRisks,
    }),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = expectationThresholdPriority(missed)

  return {
    report_id: `expectation-threshold-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '期待阈值未配置' : status === 'ok' ? '期待阈值 OK' : `期待阈值缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 expectation_threshold_contract，建议补充两长一短、三种期待线、门槛拆分、动态加码、期待铺垫和下一开环。'
      : status === 'ok'
        ? '正文已基本兑现两长一短、三种期待线、门槛拆分、动态加码、期待铺垫和下一开环。'
        : `正文有 ${missedCount} 项期待阈值缺口，${priorityRepair || '优先恢复两长一短和下一开环'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持期待阈值：两长一短和三种期待线同时在线，门槛分批提出，期待铺垫不少于爽点释放，兑现当前目标前先立下一开环。']
      : [
          '下一次修订必须补期待阈值：恢复两长一短，补剧情期待 + 主题甜头 + 新鲜感，拆分系统性门槛，补动态加码，补期待感 > 爽点的铺垫，先立下一开环，再兑现旧期待。',
          '不能让大目标一步解决；每跨过一个门槛，就要立刻给出新门槛、新代价、新线索或更大的长期期待。',
        ],
  }
}

export function emotionalArcContractForSync(contextPackage: any = {}, chapter: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = {
    ...(target?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(contextPackage?.preDraftBrief || {}),
    ...(chapter?.raw_payload?.pre_draft_brief || {}),
    ...(chapter?.raw_payload?.preDraftBrief || {}),
  }
  return target?.emotional_arc_contract
    || target?.emotionalArcContract
    || contextPackage?.emotional_arc_contract
    || contextPackage?.emotionalArcContract
    || brief?.emotional_arc_contract
    || brief?.emotionalArcContract
    || {}
}

export function buildEmotionalArcSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = emotionalArcContractForSync(contextPackage, chapter)
  const checks = [
    normalizeEmotionalArcCheck(
      'emotion_formula',
      '情绪公式',
      [
        contract.emotion_formula,
        contract.emotionFormula,
        contract.arc_shape,
        contract.arcShape,
      ],
      chapterText,
      '正文必须让读者看见平静 -> 调动 -> 释放 -> 爽，而不是只把事件写正确。',
      26,
    ),
    normalizeEmotionalArcCheck(
      'scene_emotion_steps',
      '调动释放',
      [
        contract.scene_emotion_steps,
        contract.sceneEmotionSteps,
        contract.pressure_methods,
        contract.pressureMethods,
      ],
      chapterText,
      '补出调动和释放：先让压力、期待或不该如此可感，再用行动结果、反应差异或新信息完成释放。',
      28,
    ),
    normalizeEmotionalArcCheck(
      'payoff_types',
      '爽点释放',
      [
        contract.payoff_types,
        contract.payoffTypes,
      ],
      chapterText,
      '补出目标达成、态度转变、收获盘点、能力碾压或其他可见读者收益。',
      28,
    ),
    normalizePayoffReverseDesignCheck(contract, chapterText),
    normalizePayoffTierRulesCheck(contract, chapterText),
    normalizePayoffDensityRulesCheck(contract, chapterText, { scanPayoffDensityRisks }),
    normalizeEmotionModuleRecompositionRulesCheck(contract, chapterText),
    normalizePayoffEscalationRulesCheck(contract, chapterText, { scanPayoffEscalationRisks }),
    normalizeProgressiveConfrontationRulesCheck(contract, chapterText),
    normalizeMemePlotFormulaRulesCheck(contract, chapterText),
    normalizeReaderDesireFormulaRulesCheck(contract, chapterText),
    normalizeEmotionalSceneExecutionRulesCheck(contract, chapterText),
    normalizeEmotionalArcCheck(
      'expectation_rules',
      '断期待禁止',
      [
        contract.expectation_rules,
        contract.expectationRules,
      ],
      chapterText,
      '闭环一个期待时，必须同时开启新的期待或更大问题。',
      28,
    ),
    normalizeEmotionalArcCheck(
      'safety_rules',
      '下行情节安全感',
      [
        contract.safety_rules,
        contract.safetyRules,
      ],
      chapterText,
      '下行情节中必须给读者看见底牌、潜在解法、盟友动作、规则漏洞或反击窗口。',
      28,
    ),
    normalizeEmotionalArcCheck(
      'emotional_three_blades',
      '情绪三板斧',
      [
        contract.bonding_setup_rules,
        contract.bondingSetupRules,
        contract.emotional_tear_rules,
        contract.emotionalTearRules,
        contract.lingering_aftertaste_rules,
        contract.lingeringAftertasteRules,
      ],
      chapterText,
      '补情绪三板斧：前段用具体物件/数字/重复动作铺羁绊，中段用反差/错位/延迟真相撕裂，结尾用安静细节或物件回声收束。',
      30,
    ),
    normalizeEmotionalTurningRulesCheck(contract, chapterText),
    buildEmotionalArcDeterministicCheck(chapterText, {
      scanEmotionalStasisRisks,
      scanDownwardSafetyRisks,
      scanOppressionPurposeRisks,
      scanPayoffDensityRisks,
      scanPayoffEscalationRisks,
      scanTrumpCardEffectRisks,
    }),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = emotionalArcPriority(missed)

  return {
    report_id: `emotional-arc-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '情绪弧未配置' : status === 'ok' ? '情绪弧 OK' : `情绪弧缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 emotional_arc_contract，建议补充情绪公式、调动释放、爽点类型、爽点倒推法、装逼层级、多爽点密度、情绪模块重组、爽点递增对比、递进对抗、梗四段式、读者欲望四步公式、期待规则和安全感规则。'
      : status === 'ok'
        ? '正文已基本兑现情绪公式、调动释放、爽点释放、爽点倒推法、装逼层级、多爽点密度、情绪模块重组、爽点递增对比、递进对抗、梗四段式、读者欲望四步公式和下行情节安全感。'
        : `正文有 ${missedCount} 项情绪弧缺口，${priorityRepair || '优先补调动释放和安全感'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持情绪弧：平静 -> 调动 -> 释放 -> 爽，先按爽点类型 -> 期待点 -> 铺垫倒推章纲，正文再按铺垫 -> 期待升高 -> 爽点释放呈现；核心爽点切在主线上，日常小装逼只维持耐心，避免偏离爽点；不要拉长单个爽点铺垫，800-1200 字内要有信息增量、能力展示、危机反制、关系变化或小回收；复用同一情绪模块时换场景/换对手/加新情绪或提高 stakes；递进对抗保持角力而非碾压，梗按发生 -> 发展 -> 转折 -> 高潮，读者欲望按生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿；爽点按影响范围、揭示深度或身份落差递增，下压有安全感。']
      : [
          '下一次修订必须补情绪弧：每个场景标注调动/复现/释放/后反应，恢复平静 -> 调动 -> 释放 -> 爽；先定爽点类型，再拉期待点，最后倒推铺垫；正文按铺垫 -> 期待升高 -> 爽点释放呈现，核心爽点必须服务主线目标，删掉或改写偏离主线的爽点；不要拉长单个爽点铺垫，要拆出多个小回报；复用同一情绪模块时必须换场景/换对手/加新情绪或提高 stakes；递进对抗必须角力而非碾压，梗四段式必须发生 -> 发展 -> 转折 -> 高潮，读者欲望四步公式必须生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿，并按影响范围、揭示深度或身份落差兑现递增释放。',
          '连续下压不能只让主角受辱受损；必须给出底牌、潜在解法、盟友动作、规则漏洞、反击窗口或明确读者收益。',
        ],
  }
}

export function characterArcBriefFromContext(contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const brief = syncContextPackage?.pre_draft_brief || syncContextPackage?.preDraftBrief || {}
  return target.character_arc_brief
    || target.characterArcBrief
    || brief.character_arc_brief
    || brief.characterArcBrief
    || syncContextPackage?.character_arc_context
    || syncContextPackage?.characterArcContext
    || {}
}

export function buildCharacterArcSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const arc = characterArcBriefFromContext(contextPackage, chapter)
  const sceneCards = storyDriveSceneCards(contextWithChapterRawPreDraftForSync(contextPackage, chapter), chapter)
  const dimensions = [
    normalizeCharacterArcDimension(
      'desire',
      '角色欲望',
      firstCompactText(
        arc.desire,
        arc.character_desire,
        arc.characterDesire,
        arc.goal,
        firstSceneCardText(sceneCards, ['character_goal', 'characterGoal', 'desire', 'goal']),
      ),
      chapterText,
      40,
    ),
    normalizeCharacterArcDimension(
      'flaw_pressure',
      '缺陷受压',
      firstCompactText(
        arc.flaw_pressure,
        arc.flawPressure,
        arc.inner_conflict,
        arc.innerConflict,
        arc.fear,
        firstSceneCardText(sceneCards, ['flaw_pressure', 'flawPressure', 'inner_conflict', 'fear', 'pressure']),
      ),
      chapterText,
      40,
    ),
    normalizeCharacterArcDimension(
      'relationship_shift',
      '关系变化',
      firstCompactText(
        arc.relationship_shift,
        arc.relationshipShift,
        arc.relationship_change,
        arc.relationshipChange,
        firstSceneCardText(sceneCards, ['relationship_shift', 'relationshipShift', 'relationship_change', 'relationshipChange']),
      ),
      chapterText,
      40,
    ),
    normalizeCharacterArcDimension(
      'growth_beat',
      '成长节点',
      firstCompactText(
        arc.growth_beat,
        arc.growthBeat,
        arc.character_growth,
        arc.characterGrowth,
        arc.arc_step,
        arc.arcStep,
        firstSceneCardText(sceneCards, ['growth_beat', 'growthBeat', 'character_growth', 'arc_step', 'exit_state']),
      ),
      chapterText,
      40,
    ),
    normalizeCharacterArcDimension(
      'voice_anchor',
      '口吻锚点',
      firstCompactText(
        arc.voice_anchor,
        arc.voiceAnchor,
        arc.voice_rule,
        arc.voiceRule,
        arc.dialogue_style,
        firstSceneCardText(sceneCards, ['voice_anchor', 'voiceAnchor', 'voice_rule', 'dialogue_style']),
      ),
      chapterText,
      36,
    ),
  ].filter(Boolean)

  const delivered = dimensions.filter((item: any) => item.delivered)
  const missed = dimensions.filter((item: any) => !item.delivered)
  const score = Math.max(0, Math.min(100, Math.round(
    dimensions.length ? dimensions.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / dimensions.length : 82,
  )))
  const status = missed.length > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = characterArcPriority(missed)

  return {
    report_id: `character-arc-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: dimensions.length === 0 ? '人物弧光未配置' : status === 'ok' ? '人物弧光 OK' : `人物弧光缺口 ${missed.length}`,
    summary: dimensions.length === 0
      ? '本章没有明确的人物弧光任务，建议在开写任务书中补角色欲望、缺陷受压、关系变化和成长节点。'
      : status === 'ok'
        ? '本章角色欲望、缺陷受压、关系变化、成长节点和口吻锚点已基本落地。'
        : `本章有 ${missed.length} 项人物弧光缺口，${priorityRepair || '优先补人物成长节点'}。`,
    missed_count: missed.length,
    priority_repair: priorityRepair,
    dimensions,
    planned: dimensions,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持角色欲望、缺陷受压、关系变化、成长节点和口吻锚点的连续执行。']
      : [
          '下一次修订必须补出人物成长：角色欲望、缺陷受压、关系变化、成长节点和口吻锚点至少落地主要缺口。',
          '不能只补心理旁白；新增内容必须写成角色行动、选择、对话反应、关系反馈或可见状态变化。',
          '人物成长不能改长期方向；只推进本章应承担的阶段性变化。',
        ],
  }
}

export function buildChapterAttractionReviewReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const retentionBrief = retentionBriefFromContext(contextPackage, chapter)
  const dimensions = [
    normalizeAttractionDimension('opening_hook', '开篇钩子', retentionBrief.opening_hook || retentionBrief.openingHook || target.opening_hook || target.openingHook || target.summary, chapterText, { openingOnly: true, threshold: 44 }),
    normalizeAttractionDimension('scene_drive', '场景推进', sceneDriveExpectation(syncContextPackage, chapter) || target.conflict || target.core_conflict || target.coreConflict, chapterText, { threshold: 40 }),
    normalizeAttractionDimension('payoff_density', '爽点密度', retentionBrief.payoff_promise || retentionBrief.payoffPromise || target.reader_payoff || target.readerPayoff || target.payoff, chapterText, { threshold: 42 }),
    normalizeAttractionDimension('page_turn', '章末翻页', retentionBrief.ending_question || retentionBrief.endingQuestion || target.ending_hook || target.endingHook, chapterText, { tailOnly: true, threshold: 42 }),
    normalizeAttractionDimension('spread_scene', '传播场面', retentionBrief.short_drama_scene || retentionBrief.shortDramaScene || target.signature_scene_brief?.signature_scene || target.signatureSceneBrief?.signatureScene || target.ip_scene_hook || target.ipSceneHook, chapterText, { threshold: 42 }),
  ]
  const weak = dimensions.filter(item => item.status === 'warn')
  const score = Math.max(0, Math.min(100, Math.round(dimensions.reduce((sum, item) => sum + Number(item.score || 0), 0) / Math.max(1, dimensions.length))))
  const status = weak.length > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = chapterAttractionPriority(dimensions)
  return {
    report_id: `chapter-attraction-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '吸引力 OK' : `吸引力缺口 ${weak.length}`,
    summary: status === 'ok'
      ? '本章开篇钩子、场景推进、爽点密度、章末翻页和传播场面已形成连续读者拉力。'
      : `本章有 ${weak.length} 项吸引力执行缺口，${priorityRepair || '优先处理读者翻页动力'}。`,
    weak_count: weak.length,
    priority_repair: priorityRepair,
    dimensions,
    weak_dimensions: weak,
    next_actions: status === 'ok'
      ? ['保持当前章的读者拉力执行结构，并在下一章继续承接章末问题。']
      : [
          '前300字必须尽快给出异常、危险、欲望或反常信息。',
          '每个场景补齐目标、阻碍、转折、回报，避免纯解释或纯氛围过场。',
          '最后300字必须留下下一章非看不可的危险、选择、反转或未解答案。',
          '补出可视化传播场面和短周期爽点，让读者能复述本章最有记忆点的一幕。',
        ],
  }
}

export function innovationBriefFromContext(contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const brief = syncContextPackage?.pre_draft_brief || syncContextPackage?.preDraftBrief || {}
  return target.innovation_brief || target.innovationBrief || brief.innovation_brief || brief.innovationBrief || {}
}

export function buildInnovationSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const innovationBrief = innovationBriefFromContext(contextPackage, chapter)
  const planned = [
    normalizeInnovationBeat('chapter_angle', '创新角度', innovationBrief.chapter_angle || innovationBrief.chapterAngle),
    ...asArray(innovationBrief.execution_points || innovationBrief.executionPoints).map((item: any, index: number) => normalizeInnovationBeat(`execution_point_${index + 1}`, '执行点', item)),
    ...asArray(innovationBrief.differentiation_guardrails || innovationBrief.differentiationGuardrails).map((item: any, index: number) => normalizeInnovationBeat(`differentiation_guardrail_${index + 1}`, '差异护栏', item)),
    ...asArray(innovationBrief.ip_adaptation_hooks || innovationBrief.ipAdaptationHooks).map((item: any, index: number) => normalizeInnovationBeat(`ip_adaptation_hook_${index + 1}`, 'IP化场面', item)),
  ].filter(Boolean)
  const checked = planned.map(item => innovationBeatMatch(item, chapterText))
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    planned.length ? (delivered.length / planned.length) * 100 : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `innovation-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '创新 OK' : `创新缺口 ${missedCount}`,
    summary: status === 'ok'
      ? '本章创新角度、执行点、差异护栏和可视化场面已基本落地。'
      : `创新执行有 ${missedCount} 项未在正文中充分兑现。`,
    missed_count: missedCount,
    planned,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持开写任务书的创新执行和写后复盘闭环。']
      : [
          '下一次修订优先补足创新执行 missed 项，避免把本章写成普通套路章。',
          '把创新角度转成可见选择、机制反差、规则代价或 IP 化场面，不要只靠旁白解释卖点。',
      ],
  }
}

export function signatureSceneBriefFromContext(contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  return normalizeSignatureSceneBrief(
    syncContextPackage?.chapter_target?.signature_scene_brief
      || syncContextPackage?.chapter_target?.signatureSceneBrief
      || syncContextPackage?.signature_scene_brief
      || syncContextPackage?.signatureSceneBrief
      || syncContextPackage?.pre_draft_brief?.signature_scene_brief
      || syncContextPackage?.pre_draft_brief?.signatureSceneBrief
      || syncContextPackage?.preDraftBrief?.signature_scene_brief
      || syncContextPackage?.preDraftBrief?.signatureSceneBrief
      || chapter?.raw_payload?.signature_scene_brief
      || chapter?.raw_payload?.signatureSceneBrief,
  )
}

export function buildSignatureSceneSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const signatureSceneBrief = signatureSceneBriefFromContext(contextPackage, chapter)
  const planned = [
    normalizeSignatureSceneSyncBeat('signature_scene', '标志性场面', signatureSceneBrief?.signature_scene, 58),
    normalizeSignatureSceneSyncBeat('scene_repair_target', '补位目标', signatureSceneBrief?.scene_repair_target, 50),
    normalizeSignatureSceneSyncBeat('reader_payoff', '读者回报', signatureSceneBrief?.reader_payoff, 42),
    normalizeSignatureSceneSyncBeat('storyline_service', '剧情线服务', signatureSceneBrief?.storyline_service, 50),
  ].filter(Boolean)

  if (!planned.length) {
    return {
      report_id: `signature-scene-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
      chapter_id: chapter?.id || null,
      chapter_no: chapter?.chapter_no || null,
      score: null,
      status: 'ok',
      label: '强场面未计划',
      summary: '本章没有明确标志性强场面补位任务，不做兑现复盘。',
      planned_count: 0,
      missed_count: 0,
      planned: [],
      delivered: [],
      missed: [],
      next_actions: ['后续如近10章强场面覆盖不足，先在滚动规划和开写任务书中补标志性场面。'],
    }
  }

  const rawChecked = planned.map(item => signatureSceneSyncBeatMatch(item, chapterText))
  const signatureDelivered = rawChecked.some(item => item.key === 'signature_scene' && item.delivered)
  const checked = rawChecked.map(item => {
    if (item.key !== 'scene_repair_target' || item.delivered || !signatureDelivered) return item
    return {
      ...item,
      score: Math.max(Number(item.score || 0), 80),
      evidence: ['标志性场面已落地'],
      delivered: true,
    }
  })
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round((delivered.length / planned.length) * 100)))
  const signatureSceneMissed = missed.some(item => item.key === 'signature_scene')
  const status = signatureSceneMissed || missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `signature-scene-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '强场面 OK' : `强场面漏写 ${missedCount}`,
    summary: status === 'ok'
      ? '本章开写任务书里的标志性场面、补位目标、读者回报和剧情线服务已基本落地。'
      : `标志性强场面补位有 ${missedCount} 项未在正文中充分兑现。`,
    planned_count: planned.length,
    missed_count: missedCount,
    planned,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持强场面补位从滚动规划到正文交稿的兑现闭环。']
      : [
          '下一次修订优先补回开写任务书指定的标志性场面，把它写成可视化动作、空间冲突、规则代价或公开反转。',
          '不要只补气氛描写；必须让 scene_repair_target、reader_payoff 和 storyline_service 在正文事件中可见。',
      ],
  }
}

export function storyUnitContextFromContext(contextPackage: any, chapter: any = {}) {
  const target = contextPackage?.chapter_target || contextPackage?.chapterTarget || {}
  return normalizeStoryUnitContext(
    target?.story_unit_context
      || target?.storyUnitContext
      || contextPackage?.story_unit_context
      || contextPackage?.storyUnitContext
      || contextPackage?.pre_draft_brief?.story_unit_context
      || contextPackage?.pre_draft_brief?.storyUnitContext
      || contextPackage?.preDraftBrief?.story_unit_context
      || contextPackage?.preDraftBrief?.storyUnitContext
      || chapter?.raw_payload?.pre_draft_brief?.story_unit_context
      || chapter?.raw_payload?.pre_draft_brief?.storyUnitContext
      || chapter?.raw_payload?.preDraftBrief?.story_unit_context
      || chapter?.raw_payload?.preDraftBrief?.storyUnitContext
      || chapter?.raw_payload?.story_unit_context
      || chapter?.raw_payload?.storyUnitContext,
    Number(chapter?.chapter_no || target?.chapter_no || target?.chapterNo || 0),
  )
}

export function buildStoryUnitSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const storyUnit = storyUnitContextFromContext(contextPackage, chapter)
  if (!storyUnit) {
    return {
      report_id: `story-unit-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
      chapter_id: chapter?.id || null,
      chapter_no: chapter?.chapter_no || null,
      score: null,
      status: 'ok',
      label: '剧情单元未计划',
      summary: '本章没有明确剧情单元任务，不做单元职责复盘。',
      missed_count: 0,
      rushed_count: 0,
      forbidden_count: 0,
      story_unit: null,
      planned: [],
      delivered: [],
      missed: [],
      rushed_ahead: [],
      forbidden_touched: [],
      next_actions: [],
    }
  }

  const role = compactBriefText(storyUnit.current_chapter_role)
  const roleText = normalizedMatchText(role)
  const roleRequired = [
    /入口|开场|进场/.test(role)
      ? normalizeStoryUnitSyncBeat('entry_hook', '入口钩子', storyUnit.entry_hook || role, 'story_unit', 50)
      : null,
    /高潮|回报|兑现|打脸|结算/.test(role)
      ? normalizeStoryUnitSyncBeat('mini_climax_payoff', '小高潮/回报', storyUnit.mini_climax_payoff || role, 'story_unit', 58)
      : null,
    /出单元|出场|收束|转入|承接下一|下一段/.test(role)
      ? normalizeStoryUnitSyncBeat('exit_hook', '出单元钩子', storyUnit.exit_hook || role, 'story_unit', 58)
      : null,
    /压力|升级|推进|冲突/.test(role)
      ? normalizeStoryUnitSyncBeat('pressure_escalation', '压力升级', asArray(storyUnit.pressure_escalation)[0] || role, 'story_unit', 50)
      : null,
  ].filter(Boolean)
  const fallbackRequired = roleRequired.length
    ? []
    : [
        normalizeStoryUnitSyncBeat('current_chapter_role', '当前职责', role || storyUnit.unit_goal, 'story_unit', 46),
      ].filter(Boolean)
  const setupOptional = asArray(storyUnit.setup_and_storyline)
    .slice(0, 3)
    .map((item: any, index: number) => normalizeStoryUnitSyncBeat(`setup_and_storyline_${index + 1}`, '伏笔/剧情线', item, 'story_unit_setup', 48))
    .filter(Boolean)
  const required = [...roleRequired, ...fallbackRequired]
  const planned = [...required, ...setupOptional]
  const checkedRequired = required.map(item => storyUnitSyncBeatMatch(item, chapterText))
  const checkedOptional = setupOptional.map(item => storyUnitSyncBeatMatch(item, chapterText))
  const delivered = [...checkedRequired, ...checkedOptional].filter(item => item.delivered)
  const missed = checkedRequired.filter(item => !item.delivered)
  const rushCandidates = [
    !/高潮|回报|兑现|打脸|结算/.test(role)
      ? normalizeStoryUnitSyncBeat('mini_climax_payoff', '后段小高潮', storyUnit.mini_climax_payoff, 'story_unit_rush', 58)
      : null,
    !/出单元|收束|转入/.test(role)
      ? normalizeStoryUnitSyncBeat('exit_hook', '出单元钩子', storyUnit.exit_hook, 'story_unit_rush', 58)
      : null,
  ].filter(Boolean)
  const rushedAhead = rushCandidates
    .map(item => storyUnitSyncBeatMatch(item, chapterText))
    .filter(item => item.delivered)
  const forbiddenTouched = asArray(storyUnit.forbidden_advance)
    .slice(0, 6)
    .map((item: any, index: number) => normalizeStoryUnitSyncBeat(`forbidden_advance_${index + 1}`, '禁抢跑', item, 'story_unit_forbidden', 42))
    .filter(Boolean)
    .map(item => storyUnitForbiddenTouched(item, chapterText))
    .filter(item => item.touched)

  const missedCount = missed.length
  const rushedCount = rushedAhead.length
  const forbiddenCount = forbiddenTouched.length
  const status = missedCount || rushedCount || forbiddenCount ? 'warn' : 'ok'
  const score = Math.max(0, Math.min(100, Math.round(100 - missedCount * 24 - rushedCount * 22 - forbiddenCount * 28)))
  const riskParts = [
    missedCount ? `单元漏写 ${missedCount}` : '',
    rushedCount ? `单元抢跑 ${rushedCount}` : '',
    forbiddenCount ? `禁抢跑 ${forbiddenCount}` : '',
  ].filter(Boolean)

  return {
    report_id: `story-unit-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '剧情单元 OK' : riskParts.join(' · '),
    summary: status === 'ok'
      ? '本章已完成当前剧情单元职责，且未明显提前消费后段小高潮或出单元钩子。'
      : `本章剧情单元职责存在 ${missedCount + rushedCount + forbiddenCount} 项风险。`,
    missed_count: missedCount,
    rushed_count: rushedCount,
    forbidden_count: forbiddenCount,
    story_unit: {
      title: storyUnit.title,
      chapter_range_label: storyUnit.chapter_range_label,
      current_chapter_role: storyUnit.current_chapter_role,
      unit_goal: storyUnit.unit_goal,
    },
    role_key: roleText,
    planned,
    delivered,
    missed,
    rushed_ahead: rushedAhead,
    forbidden_touched: forbiddenTouched,
    next_actions: status === 'ok'
      ? ['保持剧情单元任务书、正文生成和交稿复盘闭环。']
      : [
          '下一次修订优先补足当前剧情单元职责 missed 项，尤其是入口钩子、压力升级或本章回报。',
          '把 rushed_ahead 和 forbidden_touched 中的后段内容改成暗示、误导或延迟兑现，不要在本章提前解决。',
      ],
  }
}

const volumeBeatPattern = /小高潮|中高潮|卷末|高潮|爆点|转折|反转|大回报|强冲突|阶段收束|收束|破局|打脸|揭底|真相|压轴/

export function volumeBeatBriefFromContext(contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const brief = syncContextPackage?.pre_draft_brief || syncContextPackage?.preDraftBrief || {}
  return {
    explicit: target.volume_beat_brief || target.volumeBeatBrief || brief.volume_beat_brief || brief.volumeBeatBrief || {},
    nextBatch: nextBatchBriefFromContext(contextPackage, brief, chapter) || {},
    sceneCards: [
      ...asArray(target.scene_cards || target.sceneCards),
      ...asArray(brief.scene_briefs || brief.sceneBriefs),
    ],
  }
}

export function normalizeVolumeBeat(key: string, label: string, value: any, source = 'volume_beat') {
  const text = compactText(value, 180)
  return text ? { key, label, text, source } : null
}

export function uniqueVolumeBeats(items: any[]) {
  const seen = new Set<string>()
  const rows: any[] = []
  for (const item of items.filter(Boolean)) {
    const key = normalizedMatchText(item.text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    rows.push(item)
  }
  return rows
}

export function volumeBeatMatch(beat: any, chapterText: string) {
  const match = anchorMatchScore(beat.text, chapterText)
  const threshold = beat.key === 'current_chapter_role' ? 44 : 70
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered: match.score >= threshold,
  }
}

export function buildVolumeBeatSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const beatContext = volumeBeatBriefFromContext(contextPackage, chapter)
  const currentRole = firstDefined(
    beatContext.explicit.current_chapter_role,
    beatContext.explicit.currentChapterRole,
    beatContext.explicit.chapter_role,
    beatContext.explicit.chapterRole,
    beatContext.nextBatch.current_chapter_role,
    beatContext.nextBatch.currentChapterRole,
  )
  const explicitBeats = [
    normalizeVolumeBeat('volume_goal', '卷级目标', beatContext.explicit.volume_goal || beatContext.explicit.volumeGoal || beatContext.explicit.goal),
    normalizeVolumeBeat('climax_promise', '高潮承诺', beatContext.explicit.climax_promise || beatContext.explicit.climaxPromise || beatContext.explicit.climax),
    ...asArray(beatContext.explicit.required_beats || beatContext.explicit.requiredBeats).map((item: any, index: number) => normalizeVolumeBeat(`required_beat_${index + 1}`, '爆点动作', item)),
  ].filter(Boolean)
  const hasExplicitVolumeBeat = explicitBeats.length > 0 || volumeBeatPattern.test(currentRole)
  const sceneBeats = beatContext.sceneCards.flatMap((card: any, index: number) => {
    const candidates = [
      normalizeVolumeBeat(`turning_point_${index + 1}`, '转折点', card?.turning_point || card?.turningPoint || card?.turn || card?.reversal, 'scene_card'),
      normalizeVolumeBeat(`reader_payoff_${index + 1}`, '读者回报', card?.reader_payoff || card?.readerPayoff || card?.payoff || card?.reader_reward || card?.readerReward, 'scene_card'),
      normalizeVolumeBeat(`ending_hook_${index + 1}`, '钩子推进', card?.ending_hook_seed || card?.endingHookSeed || card?.ending_hook || card?.endingHook, 'scene_card'),
    ].filter(Boolean)
    return hasExplicitVolumeBeat ? candidates : candidates.filter(item => volumeBeatPattern.test(item.text))
  })
  const planned = uniqueVolumeBeats([
    volumeBeatPattern.test(currentRole) ? normalizeVolumeBeat('current_chapter_role', '本章爆点职责', currentRole) : null,
    ...explicitBeats,
    ...sceneBeats,
  ])
  const checked = planned.map(item => volumeBeatMatch(item, chapterText))
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    planned.length ? (delivered.length / planned.length) * 100 : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `volume-beat-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: planned.length === 0 ? '爆点未计划' : status === 'ok' ? '爆点 OK' : `爆点漏兑现 ${missedCount}`,
    summary: planned.length === 0
      ? '本章没有明确卷级高潮或爆点承诺。'
      : status === 'ok'
        ? '本章卷级爆点、转折和读者回报已基本兑现。'
        : `本章有 ${missedCount} 项卷级爆点或小高潮承诺未在正文中充分兑现。`,
    missed_count: missedCount,
    planned,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持卷级爆点预算、章节任务书和正文兑现闭环。']
      : [
          '下一次修订优先补足卷级爆点 missed 项，把小高潮/中高潮/卷末爆点写成可见行动、反转和回报。',
          '如果正文只铺信息没有兑现转折，优先补现场冲突、选择代价、反制结果和章末升级。',
        ],
  }
}

export function millionWordRunwayFromContext(contextPackage: any = {}, preDraftBrief: any = null) {
  const chapterTarget = contextPackage?.chapter_target || {}
  const brief = preDraftBrief || contextPackage?.pre_draft_brief || contextPackage?.preDraftBrief || {}
  return chapterTarget.million_word_runway
    || chapterTarget.millionWordRunway
    || brief.million_word_runway
    || brief.millionWordRunway
    || contextPackage?.million_word_runway
    || contextPackage?.millionWordRunway
    || null
}

export function runwayFromContext(contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  return millionWordRunwayFromContext(syncContextPackage) || {}
}

export function normalizeRunwayQuestion(item: any, index: number) {
  const text = compactText(item?.answer || item?.text || item?.summary || item?.value || '', 180)
  if (!text) return null
  return {
    key: String(item?.key || `question_${index + 1}`),
    label: compactText(item?.label || item?.title || `本章四问 ${index + 1}`, 60),
    text,
  }
}

export function normalizeRunwayFuel(item: any, index: number) {
  const text = compactText(typeof item === 'string' ? item : item?.text || item?.name || item?.title || item?.summary || item?.description || '', 180)
  return text ? { key: `reader_fuel_${index + 1}`, text } : null
}

export function runwayBeatMatch(beat: any, chapterText: string) {
  const match = anchorMatchScore(beat.text, chapterText)
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered: match.score >= 44,
  }
}

export function runwayRedlineTouched(redLines: any[], chapterText: string) {
  const normalizedChapterText = normalizedMatchText(chapterText)
  return redLines
    .map((item: any) => ({ text: compactText(typeof item === 'string' ? item : item?.text || item?.name || item?.title || item?.summary || item?.description || '', 180) }))
    .filter((item: any) => item.text && normalizedChapterText.includes(normalizedMatchText(item.text)))
}

export function buildRunwaySyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const runway = runwayFromContext(contextPackage, chapter)
  const fourQuestions = [
    ...asArray(runway?.fourQuestions),
    ...asArray(runway?.four_questions),
  ]
    .map(normalizeRunwayQuestion)
    .filter(Boolean)
  const readerFuel = [
    ...asArray(runway?.readerFuel),
    ...asArray(runway?.reader_fuel),
  ]
    .map(normalizeRunwayFuel)
    .filter(Boolean)
  const redLines = [
    ...asArray(runway?.redLines),
    ...asArray(runway?.red_lines),
  ]

  const questionChecks = fourQuestions.map(item => runwayBeatMatch(item, chapterText))
  const fuelChecks = readerFuel.map(item => runwayBeatMatch(item, chapterText))
  const fourQuestionDelivered = questionChecks.filter(item => item.delivered)
  const fourQuestionMissed = questionChecks.filter(item => !item.delivered)
  const readerFuelDelivered = fuelChecks.filter(item => item.delivered)
  const readerFuelMissed = fuelChecks.filter(item => !item.delivered)
  const redlineTouched = runwayRedlineTouched(redLines, chapterText)
  const riskCount = fourQuestionMissed.length + readerFuelMissed.length + redlineTouched.length
  const plannedCount = fourQuestions.length + readerFuel.length
  const deliveredCount = fourQuestionDelivered.length + readerFuelDelivered.length
  const score = Math.max(0, Math.min(100, Math.round(
    plannedCount
      ? (deliveredCount / plannedCount) * 100 - redlineTouched.length * 22
      : redlineTouched.length ? 62 - redlineTouched.length * 12 : 82,
  )))
  const status = riskCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `runway-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '航线 OK' : `航线风险 ${riskCount}`,
    summary: status === 'ok'
      ? '本章已基本兑现百万字航线的本章四问、读者燃料和红线约束。'
      : `百万字航线存在 ${riskCount} 项兑现风险。`,
    risk_count: riskCount,
    four_questions: questionChecks,
    four_question_delivered: fourQuestionDelivered,
    four_question_missed: fourQuestionMissed,
    reader_fuel: fuelChecks,
    reader_fuel_delivered: readerFuelDelivered,
    reader_fuel_missed: readerFuelMissed,
    redline_touched: redlineTouched,
    next_actions: status === 'ok'
      ? ['保持百万字航线：本章四问、读者燃料、禁用红线要继续进入开写任务书和交稿复盘。']
      : [
          '下一次修订优先补足 four_question_missed 和 reader_fuel_missed，避免章节只完成事件但不服务长期追读。',
          '如果 redline_touched 有内容，必须改掉提前揭露、越级回收或破坏长期核心的段落。',
        ],
  }
}


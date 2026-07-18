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
  buildChapterHookDeterministicCheck,
  chapterHookPriority,
  normalizeChapterHookCheck,
} from '../../novel-writing/chapter-hook-basics'
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
import {
  scanDialogueFunctionalFillerRisks,
} from '../../novel-writing/dialogue-functional'
import {
  scanDialogueDetachedJokeRisks,
  scanDialogueFlatCallbackRisks,
  scanDialogueHighPressureMemeRisks,
  scanDialogueHollowHumorPayoffRisks,
} from '../../novel-writing/dialogue-humor'
import {
  scanDialogueInfodumpRisks,
} from '../../novel-writing/dialogue-infodump'
import {
  scanDialogueEmptyPraiseRisks,
  scanDialogueJudgmentQuestionRisks,
  scanDialogueSubtextAgendaRisks,
} from '../../novel-writing/dialogue-intent'
import {
  normalizeDialogueSupportingSpeakerLimitCheck,
} from '../../novel-writing/dialogue-supporting-speakers'
import {
  scanDialogueToneRisks,
} from '../../novel-writing/dialogue-tone'
import {
  scanPayoffDensityRisks,
  scanPayoffEscalationRisks,
  scanTrumpCardEffectRisks,
} from '../../novel-writing/emotional-payoff-scans'
import {
  expectationThresholdArray,
} from '../../novel-writing/expectation-threshold-basics'
import {
  scanAntagonistDownfallAgencyRisks,
  scanEvidenceChainDumpRisks,
  scanEvidenceTimeBombRisks,
  scanFaceSlapRhythmRisks,
  scanFinalEvidenceImpactRisks,
} from '../../novel-writing/face-slap-scans'
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
import {
  scanSceneSensoryAnchorRisks,
} from '../../novel-writing/scene-card-execution-scans'
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
  buildStateTrackingDeterministicCheck,
  normalizeStateTrackingCharacterCheck,
  normalizeStateTrackingFilterRuleCheck,
  normalizeStateTrackingHistoricalCheck,
  normalizeStateTrackingSourceReadinessCheck,
  normalizeStateTrackingWorldConstraintCheck,
  stateTrackingPriority,
} from '../../novel-writing/state-tracking-basics'
import {
  styleFingerprintSentenceBeat,
} from '../../novel-writing/style-fingerprint'
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
import {
  countProseChars,
} from '../../novel-writing/word-target'
import {
  asArray,
  compactText,
} from '../../routes/novel-route-utils'
import {
  buildConflictStructureContract,
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
  buildOpeningContract,
  buildProseCraftContract,
  buildPunctuationToneContract,
} from '../quality/plot-opening-prose-contracts'
import {
  proseParagraphsWithoutTitle,
} from '../quality/prose-expansion'
import {
  buildStateTrackingContract,
} from '../quality/state-tracking-contracts'
import {
  compactBriefText,
  uniqueBriefStrings,
} from '../quality/text-utils'
import {
  chapterBenchmarkStrategyFromContext,
  normalizeChapterBenchmarkBeat,
} from './quality-sync-reports-core'
import {
  buildStyleSampleStrategy,
  styleBoundaryExplicitContract,
} from '../quality/style-sample-strategy'
import {
  contextWithChapterRawPreDraftForSync,
} from './quality-sync-reports-benchmark'

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

export * from './quality-sync-reports-benchmark-craft'

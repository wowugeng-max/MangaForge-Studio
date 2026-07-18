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
  contextWithChapterRawPreDraftForSync,
  bridgeUnitContractForSync,
  buildBridgeUnitDeterministicCheck,
} from './quality-sync-reports-benchmark'

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


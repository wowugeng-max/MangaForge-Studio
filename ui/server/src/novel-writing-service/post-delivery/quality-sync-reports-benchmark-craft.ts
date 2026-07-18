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

export * from './quality-sync-reports-benchmark-audit'

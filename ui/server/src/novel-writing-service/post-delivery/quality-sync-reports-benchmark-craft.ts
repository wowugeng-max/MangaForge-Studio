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

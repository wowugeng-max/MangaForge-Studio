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

import {
  stateTrackingContractForSync,
} from './quality-sync-reports-benchmark-audit-b'
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

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


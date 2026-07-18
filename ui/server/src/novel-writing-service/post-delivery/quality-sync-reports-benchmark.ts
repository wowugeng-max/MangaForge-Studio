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

export * from './quality-sync-reports-benchmark-craft'

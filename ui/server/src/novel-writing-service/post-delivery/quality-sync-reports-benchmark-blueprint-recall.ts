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
  uniqueChapterBenchmarkBeats,
} from './quality-sync-reports-benchmark-blueprint-core'

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


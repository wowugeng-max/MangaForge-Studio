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
  benchmarkRecallBeat,
  benchmarkRecallBeatMatch,
  benchmarkRecallBriefFromContext,
  uniqueChapterBenchmarkBeats,
} from './quality-sync-reports-benchmark-blueprint'
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


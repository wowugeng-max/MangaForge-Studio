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


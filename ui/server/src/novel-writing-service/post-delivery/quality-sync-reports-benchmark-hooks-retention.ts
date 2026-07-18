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


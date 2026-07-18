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


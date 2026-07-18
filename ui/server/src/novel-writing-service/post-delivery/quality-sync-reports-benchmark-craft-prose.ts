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


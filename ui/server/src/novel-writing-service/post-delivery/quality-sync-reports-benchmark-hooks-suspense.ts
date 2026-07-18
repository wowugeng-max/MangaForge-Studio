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


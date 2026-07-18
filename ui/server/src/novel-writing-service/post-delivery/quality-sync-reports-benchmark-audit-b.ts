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
  buildDialogueDeterministicCheck,
  buildDialogueFunctionalFillerCheck,
  dialogueContractForSync,
  dialoguePriority,
} from './quality-sync-reports-benchmark-audit-a'
export function buildDialogueSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const mergedContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const contract = dialogueContractForSync(contextPackage, chapter)
  const checks = [
    normalizeDialogueGoalCheck(contract.dialogue_goals || contract.dialogueGoals, contract.key_lines || contract.keyLines, contract.relationship_moves || contract.relationshipMoves, chapterText),
    normalizeDialoguePowerCheck(contract.power_length_rules || contract.powerLengthRules || contract.mode_playbooks || contract.modePlaybooks, chapterText),
    normalizeDialogueSubtextCheck(contract.subtext_agenda_rules || contract.subtextAgendaRules, chapterText),
    normalizeDialogueDriveCheck(contract.dialogue_drive_rules || contract.dialogueDriveRules, chapterText),
    normalizeDialogueInformationEmbedCheck(contract.information_embed_rules || contract.informationEmbedRules, chapterText),
    normalizeDialogueAuditCheck(contract.dialogue_audit_rules || contract.dialogueAuditRules, chapterText),
    buildDialogueFunctionalFillerCheck(chapterText),
    normalizeDialogueVoiceCheck(contract.voice_anchors || contract.voiceAnchors || contract.voice_differentiation_rules || contract.voiceDifferentiationRules, chapterText),
    normalizeDialogueSupportingSpeakerLimitCheck(contract.supporting_speaker_limit_rules || contract.supportingSpeakerLimitRules, mergedContextPackage, chapterText),
    buildDialogueDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = dialoguePriority(missed)

  return {
    report_id: `dialogue-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '对白质量未配置' : status === 'ok' ? '对白质量 OK' : `对白缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 dialogue_contract，建议补充对白目标、权力博弈、潜台词与议程、对白三功能、信息嵌入、对话审计、声线差异和对白硬伤扫描。'
      : status === 'ok'
        ? '正文已基本兑现对白目标、权力博弈、潜台词与议程、对白三功能、信息嵌入、对话审计、声线差异和对白硬伤扫描。'
        : `正文有 ${missedCount} 项对白质量缺口，${priorityRepair || '优先修声线差异、潜台词与议程和说明书式对白'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持对白质量：每句对白继续承担推进剧情、增加期待或展示人设；信息用角色语气、立场、追问、误导或动作承接；对话结尾继续预示下一步节奏，并保持声线差异和权力博弈。']
      : [
          '下一章必须补对白：删说明书式对白和问答式一问一答，让角色带着借口、试探、回避和行动反应说话。',
          '按权力地位重排句长：主角/掌控者短句亮底牌，被压制方长句辩解；每句对白至少承担推进剧情、增加期待或展示人设之一；信息型配角不能当科普嘴；让对话结尾预示接下来的节奏变化；同时拆出角色声线差异和动作换气；同一场景最多保留 3 个配角发言，其余合并为旁观反应、动作或叙事概括。',
      ],
  }
}

export function characterBehaviorContractForSync(contextPackage: any = {}, chapter: any = {}) {
  return buildCharacterBehaviorContract(contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function characterBehaviorArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => compactBriefText(item)).filter(Boolean), 20)
}

export function normalizeCharacterBehaviorAnchorCheck(key: string, label: string, values: any[], chapterText: string, fix: string, threshold = 28) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const checked = planned.map(text => {
    const match = anchorMatchScore(text, chapterText)
    return {
      text,
      score: match.score,
      evidence: match.matched,
      delivered: match.score >= threshold,
    }
  })
  const missed = checked.filter(item => !item.delivered)
  return {
    key,
    label,
    text: planned.join('；'),
    expected: planned.join('；'),
    score: Math.round(checked.reduce((sum, item) => sum + Number(item.score || 0), 0) / Math.max(1, checked.length)),
    evidence: checked.flatMap(item => item.evidence).filter(Boolean).slice(0, 8),
    delivered: missed.length === 0,
    status: missed.length === 0 ? 'ok' : 'warn',
    missed_items: missed.map(item => item.text),
    issue: missed.length === 0 ? '' : `${label}未充分落地：${missed.map(item => item.text).join('；')}`,
    repair_instruction: missed.length === 0 ? '' : fix,
  }
}

export function normalizeCharacterBehaviorMemoryAnchorCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasAnchor = planned.some(item => {
    const match = anchorMatchScore(item, text)
    return match.score >= 24
  }) || /旧夹克|袖口|口头禅|标志动作|短句反问|疤|铃|刀|伞|左手/.test(text)
  return {
    key: 'memory_anchors',
    label: '记忆锚点',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: hasAnchor ? 86 : 24,
    evidence: hasAnchor ? ['记忆锚点可见'] : [],
    delivered: hasAnchor,
    status: hasAnchor ? 'ok' : 'warn',
    missed_items: hasAnchor ? [] : planned,
    issue: hasAnchor ? '' : '角色记忆锚点没有在正文出现，读者缺少可复述的口头禅、动作或外物。',
    repair_instruction: hasAnchor ? '' : '补记忆锚点：让口头禅、标志动作、外物或行为习惯在关键选择前后出现一次。',
  }
}

export function buildCharacterBehaviorSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = characterBehaviorContractForSync(contextPackage, chapter)
  const checks = [
    normalizeCharacterBehaviorMotivationCheck(contract.motivation_chain || contract.motivationChain, chapterText),
    normalizeCharacterBehaviorMotivationSpecificityCheck(contract.motivation_specificity_rules || contract.motivationSpecificityRules, chapterText),
    normalizeCharacterBehaviorLayeredTagsCheck(contract.layered_tags || contract.layeredTags, chapterText),
    normalizeCharacterBehaviorRulesCheck(contract.behavior_rules || contract.behaviorRules || contract.quality_checks || contract.qualityChecks, chapterText),
    normalizeCharacterBehaviorProtagonistComposureCheck(contract.protagonist_composure_rules || contract.protagonistComposureRules, chapterText),
    normalizeCharacterBehaviorStrongAssociationCheck(contract.strong_association_rules || contract.strongAssociationRules, chapterText),
    normalizeCharacterBehaviorMemoryAnchorCheck(contract.memory_anchors || contract.memoryAnchors, chapterText),
    normalizeCharacterBehaviorSupportingRoleCheck(contract.supporting_role_functions || contract.supportingRoleFunctions, chapterText),
    normalizeCharacterBehaviorRoleCardCheck(contract.role_card_requirements || contract.roleCardRequirements, chapterText),
    normalizeCharacterBehaviorSupportingRoleExitCheck(contract.supporting_role_exit_rules || contract.supportingRoleExitRules, chapterText),
    normalizeCharacterBehaviorRepeatCheck(contract.behavior_repeat_rules || contract.behaviorRepeatRules, chapterText),
    normalizeCharacterDrivenEventCheck(contract.character_driven_event_rules || contract.characterDrivenEventRules, chapterText),
    normalizeProtagonistRedLineCheck(contract.protagonist_red_line_rules || contract.protagonistRedLineRules, chapterText),
    normalizeIdentityGoldfingerAlignmentCheck(contract.identity_goldfinger_alignment_rules || contract.identityGoldfingerAlignmentRules, chapterText),
    normalizeCharacterBehaviorAntagonistLogicCheck(contract.antagonist_logic || contract.antagonistLogic, chapterText),
    normalizeCharacterBehaviorAntagonistWeightCheck(contract.antagonist_weight_rules || contract.antagonistWeightRules, chapterText),
    normalizeCharacterBehaviorAntagonistSelfStoryCheck(contract.antagonist_self_story_rules || contract.antagonistSelfStoryRules, chapterText),
    normalizeCharacterBehaviorAntagonistTierExitCheck(contract.antagonist_tier_exit_rules || contract.antagonistTierExitRules, chapterText),
    buildCharacterBehaviorDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = characterBehaviorPriority(missed)

  return {
    report_id: `character-behavior-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '角色行为未配置' : status === 'ok' ? '角色行为 OK' : `角色行为缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 character_behavior_contract，建议补充动机链、动机具体性、三层标签、行为规则、主角逼格反应、人设强关联、记忆锚点、配角功能、角色卡必备项、配角退场规划、行为重复点、人推事件、主角红线、身份/金手指对齐、反派逻辑、反派分量、反派自我叙事和反派层级退场。'
      : status === 'ok'
        ? '正文已基本兑现动机链、动机具体性、三层标签、行为规则、主角逼格反应、人设强关联、记忆锚点、配角功能、角色卡必备项、配角退场规划、行为重复点、人推事件、主角红线、身份/金手指对齐、反派逻辑、反派分量、反派自我叙事和反派层级退场。'
        : `正文有 ${missedCount} 项角色行为缺口，${priorityRepair || '优先补动机链、起因具体性、行为证据、主角逼格反应、人设强关联、角色卡、配角退场规划、行为重复点、人推事件、主角红线、身份/金手指对齐、反派逻辑、反派分量、反派自我叙事和反派层级退场'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持角色行为：行动继续由动机链驱动，起因具体、动机有情感层面且演变有铺垫；升级线与主角反应线分开，面对低级挑衅保持轻描淡写、短句或行动压制；重要角色保留至少3个能推动剧情/爽点/人物碰撞的强关联；角色卡必备项、配角退场规划、行为重复点、人推事件、主角红线和身份/金手指对齐继续有证据；用动作、对白和反应展示人设，配角有功能，反派有内在逻辑、真实分量、自我叙事和层级匹配的退场规划。']
      : [
          '下一章必须补角色行为：先写清起因、意图、约束、风险；起因具体到谁、何时、当众如何伤害，动机落到情感层面，再让关键行动从这条动机链推出。',
          '修主角逼格反应：升级线与主角反应线分开管理，升级只提升实力/能力；面对低级挑衅时删掉暴怒、面红耳赤和歇斯底里，改成轻描淡写、短句反锁或动作压制。',
          '补人设强关联：每个重要角色至少3个强关联设定，直接影响剧情走向、核心梗、装逼爽点或人物碰撞；外貌、爱好、身高体重只能做弱关联记忆点。',
          '补角色卡必备项：角色定位、身份标签、外貌特征、核心目标、核心动机、致命弱点、口头禅/标志动作必须能被正文或写前合同定位。',
          '补配角退场规划：每个有台词配角要有现场功能、与主角关系、核心特质、标志性特征和退场方式；同一场景配角不超过3个有台词。',
          '补行为重复点：选一个读者喜欢的动作、口头禅或反应，在不同场景重复并承担不同功能。',
          '改成人推事件：从人物动机和选择找方向，不要让剧情需要、外部事件或作者硬编剧情替角色做决定。',
          '守主角红线和身份/金手指对齐：删圣母、无脑、内核邪恶、因蠢犯错和自暴自弃；社会身份、身世、金手指、性格必须和世界基调统一。',
          '把人设写成动作、对白和反应；配角必须承担证据、阻碍、反应或代价功能，反派必须从自身目标和约束出发行动。',
          '补反派分量：先展示实力/手段和可信动机，制造真实威胁或至少一次压制；真实目的留到关键反转点，反派长处要照出主角弱点。',
          '补反派自我叙事：让反派在自己眼中是主人公，补梦想/旧痛/避免的痛苦，并把他的优势写成会继续制造冲突的致命缺陷。',
          '补反派层级退场：按小反派/中等反派/大弧 Boss/最终 Boss 匹配篇幅、功能和退场方式，避免小反派拖太久、大 Boss 草率退场或最终 Boss 无伏笔。',
      ],
  }
}

export function assetLinkageContractForSync(contextPackage: any = {}, chapter: any = {}) {
  return buildAssetLinkageContract(contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function assetLinkageArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => assetText(item) || compactBriefText(item)).filter(Boolean), 24)
}

export function normalizeAssetLinkageKeyAssetsCheck(values: any[], chapterText: string) {
  const planned = assetLinkageArray(values)
  if (!planned.length) return null
  const checked = planned.map(text => {
    const match = anchorMatchScore(text, chapterText)
    const firstName = compactBriefText(text.split(/[：:｜(（]/)[0] || text)
    const nameHit = firstName ? normalizedMatchText(chapterText).includes(normalizedMatchText(firstName)) : false
    return {
      text,
      score: Math.max(match.score, nameHit ? 70 : 0),
      evidence: uniqueBriefStrings([...(match.matched || []), nameHit ? firstName : ''], 4),
      delivered: match.score >= 26 || nameHit,
    }
  })
  const missed = checked.filter(item => !item.delivered)
  return {
    key: 'key_assets',
    label: '关键资产',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: Math.round(checked.reduce((sum, item) => sum + Number(item.score || 0), 0) / Math.max(1, checked.length)),
    evidence: checked.flatMap(item => item.evidence).filter(Boolean).slice(0, 8),
    delivered: missed.length === 0,
    status: missed.length === 0 ? 'ok' : 'warn',
    missed_items: missed.map(item => item.text),
    issue: missed.length === 0 ? '' : `关键资产未进入正文：${missed.map(item => item.text).join('；')}`,
    repair_instruction: missed.length === 0 ? '' : '把关键资产写进现场动作、对话压力、规则触发或章尾钩子，不能只留在设定表。',
  }
}

export function normalizeAssetLinkageThreeAppearanceCheck(values: any[], chapterText: string) {
  const planned = assetLinkageArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const assetNames = planned
    .map(item => compactBriefText(item.split(/[：:｜(（]/)[0] || item)
      .replace(/三次出现|第\d次|前段|中段|结尾/g, ''))
    .filter(Boolean)
  const maxHits = assetNames.reduce((max, name) => {
    const normalizedName = normalizedMatchText(name)
    if (!normalizedName) return max
    const count = normalizedMatchText(text).split(normalizedName).length - 1
    return Math.max(max, count)
  }, 0)
  const hasThreeStages = /三次出现|第三次|袖口[^。！？!?]{0,80}案|案上[^。！？!?]{0,80}章尾|前段[^。！？!?]{0,80}中段[^。！？!?]{0,80}结尾/.test(text)
  const hasMeaningShift = /初始意义|意义|颠覆|回扣|从[^。！？!?]{0,30}变成|证据冲击|改变局势|露出血契编号/.test(text)
  const delivered = (maxHits >= 3 || hasThreeStages) && hasMeaningShift
  return {
    key: 'three_appearance_plan',
    label: '贯穿道具',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(20, [maxHits >= 3, hasThreeStages, hasMeaningShift].filter(Boolean).length * 28),
    evidence: [maxHits >= 3 ? '资产多次出现' : '', hasThreeStages ? '三段出现' : '', hasMeaningShift ? '意义/局势变化' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '贯穿道具没有完成三次出现或每次意义变化，容易变成重复点名。',
    repair_instruction: delivered ? '' : '按三次出现修复：第一次建立意义，第二次在冲突中颠覆意义，第三次在结尾兑现证据、情绪或钩子。',
  }
}

export function normalizeAssetLinkageIsolationCheck(contract: any, chapterText: string) {
  const text = String(chapterText || '')
  const assetMentions = assetLinkageArray(contract.key_assets || contract.keyAssets)
    .map(item => compactBriefText(item.split(/[：:｜(（]/)[0] || item))
    .filter(Boolean)
    .filter(name => normalizedMatchText(text).includes(normalizedMatchText(name)))
  const hasUse = /打开|撬开|触发|证明|卡进|锁死|留下|亮出|露出|改变|兑现|逼出/.test(text)
  const hasStoryLink = /目标|冲突|阻碍|回报|章尾|钩子|旁观者|站位|局势|证据|账本原件|血契编号/.test(text)
  const isolated = /没有人真的使用|只被反复提起|只被点名|很重要|复杂来历|顺便介绍|事情就解决了/.test(text)
  const delivered = assetMentions.length === 0 || (!isolated && hasUse && hasStoryLink)
  return {
    key: 'isolated_assets',
    label: '孤立资产',
    text: '本章出现的关键资产必须推进目标、制造阻碍、兑现伏笔、改变关系或打开章尾钩子。',
    expected: '本章出现的关键资产必须推进目标、制造阻碍、兑现伏笔、改变关系或打开章尾钩子。',
    score: delivered ? 86 : 18,
    evidence: [assetMentions.length ? `出现资产：${assetMentions.join('、')}` : '', hasUse ? '有使用动作' : '', hasStoryLink ? '接到故事功能' : '', isolated ? '孤立点名' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : assetMentions,
    issue: delivered ? '' : '关键资产出现在正文里，但没有推进目标、制造阻碍、兑现伏笔、改变关系或打开章尾钩子。',
    repair_instruction: delivered ? '' : '消灭孤立资产：每个资产至少绑定一个现场功能，不能只介绍、点名或当背景摆件。',
  }
}

export function relationshipGraphRiskAssetName(risk: string) {
  return compactBriefText(String(risk || '').split(/[：:]/)[0].replace(/\([^)]*\)|（[^）]*）/g, ''))
}

export function relationshipGraphRiskType(risk: string) {
  const match = String(risk || '').match(/\(([^)]+)\)|（([^）]+)）/)
  return compactBriefText(match?.[1] || match?.[2] || '')
}

export function normalizeAssetLinkageRelationshipGraphRiskCheck(contract: any, chapterText: string) {
  const risks = assetLinkageArray(contract.relationship_graph_risks || contract.relationshipGraphRisks)
  if (!risks.length) return null
  const text = String(chapterText || '')
  const normalizedText = normalizedMatchText(text)
  const unresolvedPattern = /没有人真的使用|没有人使用|没人说明|无法判断|归谁|只被反复提起|只被点名|事情很快就解决|很重要/.test(text)
  const hasUse = /打开|撬开|触发|证明|卡进|锁死|留下|亮出|露出|改变|兑现|逼出|压进|连在一起/.test(text)
  const hasOwner = /归属当场落到|落到[^。！？!?]{0,20}手上|属于|继承权|交到|由[^。！？!?]{1,18}(持有|保管|触发|承担)/.test(text)
  const hasRelation = /连在一起|关联到|绑定|指向|证明|反过来|钩出|牵出|接到|打开章尾钩子/.test(text)
  const hasConsequence = /代价|后果|锁死|红印|承担|限制|改变局势|状态变化/.test(text)
  const checked = risks.map(risk => {
    const riskText = compactBriefText(risk)
    const assetName = relationshipGraphRiskAssetName(riskText)
    const type = relationshipGraphRiskType(riskText)
    const appears = assetName ? normalizedText.includes(normalizedMatchText(assetName)) : true
    const requiresOwner = ['missing_owner', 'owner_ability_mismatch'].includes(type)
    const requiresRelation = ['isolated_key_asset', 'dangling_relation', 'owner_ability_mismatch'].includes(type)
    const delivered = appears
      && !unresolvedPattern
      && hasUse
      && (!requiresOwner || (hasOwner && hasConsequence))
      && (!requiresRelation || hasRelation)
    return {
      risk: riskText,
      assetName,
      type,
      delivered,
      evidence: [
        appears && assetName ? `出现资产：${assetName}` : '',
        hasUse ? '有使用/触发动作' : '',
        hasOwner ? '归属/触发者明确' : '',
        hasRelation ? '接入核心关系' : '',
        hasConsequence ? '后果/代价可见' : '',
        unresolvedPattern ? '仍有悬空表述' : '',
      ].filter(Boolean),
    }
  })
  const missed = checked.filter(item => !item.delivered)
  const delivered = missed.length === 0
  return {
    key: 'relationship_graph_risks',
    label: '关系图风险',
    text: risks.join('；'),
    expected: '关系图风险必须在正文中被改写成资产归属、功能、触发、代价、关系连接或章尾钩子，不能继续孤立、缺归属或悬空引用。',
    score: delivered ? 88 : Math.max(20, Math.round(((checked.length - missed.length) / Math.max(1, checked.length)) * 88)),
    evidence: checked.flatMap(item => item.evidence).filter(Boolean).slice(0, 10),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: missed.map(item => item.risk),
    issue: delivered ? '' : `仍有 ${missed.length} 项关系图风险没有被正文消解。`,
    repair_instruction: delivered ? '' : '优先处理关系图风险：把孤立资产、缺拥有者、悬空引用写成现场功能，明确归属/触发者/限制/代价，并接到目标、冲突、回报或章尾钩子。',
  }
}

export function buildAssetLinkageDeterministicCheck(contextPackage: any, chapterText: string) {
  const risks = [
    /没有人真的使用|只被反复提起|只被点名|很重要，它有很多复杂来历|事情就解决了/.test(String(chapterText || '')) ? {
      key: 'isolated_asset_telling',
      label: '孤立资产点名',
      evidence: '正文点名资产重要，却没有让资产承担现场功能。',
      fix: '让资产触发规则、制造阻碍、改变归属、兑现伏笔或打开章尾钩子。',
    } : null,
    /复杂来历|一整套设定|顺便介绍|完整解释|规则非常复杂/.test(String(chapterText || '')) ? {
      key: 'asset_infodump',
      label: '资产设定说明',
      evidence: '资产信息以说明书方式释放。',
      fix: '把资产信息塞进冲突、质疑、使用、触发和代价反馈。',
    } : null,
    ...scanNewConceptOverloadRisks(contextPackage).map((item: any) => ({
      key: item.key || 'new_concept_overload',
      label: item.label || '新概念过载',
      evidence: item.evidence || item.fix || '本章新增资产/设定概念过多。',
      fix: item.fix || '压缩新概念，优先用已有资产的状态变化制造新鲜感。',
    })),
  ].filter(Boolean)
  if (!risks.length) return null
  return {
    key: 'asset_linkage_forbidden',
    label: '资产挂钩硬伤',
    text: '资产不得只点名、只说明设定、只当背景摆件，也不得让新概念抢走主线。',
    expected: '资产不得只点名、只说明设定、只当背景摆件，也不得让新概念抢走主线。',
    score: Math.max(0, 100 - risks.length * 22),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项资产挂钩确定性风险。`,
    repair_instruction: '按 oh-story 资产挂钩修复：资产要接目标、冲突、回报、章尾钩子和状态变化；设定信息跟冲突走。',
  }
}

export function buildAssetLinkageSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const mergedContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const contract = assetLinkageContractForSync(contextPackage, chapter)
  const checks = [
    normalizeAssetLinkageKeyAssetsCheck(contract.key_assets || contract.keyAssets, chapterText),
    normalizeAssetLinkageFunctionChainCheck(contract.linkage_plan || contract.linkagePlan || contract.usage_rules || contract.usageRules, chapterText),
    normalizeAssetLinkageStateChangeCheck(contract.state_tracking || contract.stateTracking, chapterText),
    normalizeAssetLinkageThreeAppearanceCheck(contract.three_appearance_plan || contract.threeAppearancePlan, chapterText),
    normalizeAssetLinkageInformationCheck(contract.usage_rules || contract.usageRules, chapterText),
    normalizeAssetLinkageIsolationCheck(contract, chapterText),
    normalizeAssetLinkageRelationshipGraphRiskCheck(contract, chapterText),
    buildAssetLinkageDeterministicCheck({ ...(mergedContextPackage || {}), project }, chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = assetLinkagePriority(missed)

  return {
    report_id: `asset-linkage-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '资产挂钩未配置' : status === 'ok' ? '资产挂钩 OK' : `资产挂钩缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 asset_linkage_contract，建议补充关键资产、功能链、状态变化、贯穿道具和信息释放规则。'
      : status === 'ok'
        ? '正文已基本兑现关键资产、功能链、状态变化、贯穿道具和信息随冲突释放。'
        : `正文有 ${missedCount} 项资产挂钩缺口，${priorityRepair || '优先消灭孤立资产并补功能链'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持资产挂钩：关键资产继续接目标、冲突、回报和章尾钩子，信息随冲突释放，状态变化可追踪。']
      : [
          missed.some((item: any) => item.key === 'relationship_graph_risks')
            ? '下一章必须先处理关系图风险：孤立资产要接核心关系，缺拥有者资产要明确归属、触发者、限制和代价。'
            : '',
          '下一章必须补资产挂钩：每个关键资产都要绑定功能、归属、触发条件、限制、后果，并接到目标、冲突、回报或章尾钩子。',
          '删掉只点名、只介绍来历、只当背景摆件的孤立资产；设定信息必须通过使用、质疑、触发、误判或代价反馈释放。',
      ].filter(Boolean),
  }
}

export function stateTrackingContractForSync(contextPackage: any = {}, chapter: any = {}) {
  return buildStateTrackingContract(contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}


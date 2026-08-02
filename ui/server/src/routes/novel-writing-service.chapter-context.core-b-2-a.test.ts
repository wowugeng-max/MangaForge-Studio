import '../novel-writing-service/quality/review-merge.unit.test'
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  createNovelChapter,
  createNovelCharacter,
  createNovelProject,
  createNovelSettingEntity,
  createNovelWorldbuilding,
  listNovelChapters,
  listNovelCharacters,
  listChapterVersions,
  listNovelOutlines,
  listNovelReviews,
  listNovelWorldbuilding,
  updateNovelChapter,
} from '../novel'
import {
  buildCommercialEditorRewritePrompt,
  buildChapterPreDraftBrief,
  buildChapterTitleUniquenessReport,
  buildChapterTitleUniquenessSyncReport,
  buildGeneratedChapterTitlePatch,
  buildChapterCoreDriftReport,
  buildCoreContractSyncReport,
  buildChapterAttractionReviewReport,
  buildChapterHandoffSyncReport,
  buildDeslopGateDiagnostics,
  appendMissingContractReviewCheck,
  appendMissingStatusFilterReceiptCheck,
  getContextContract,
  hasFailingReviewChecks,
  hasReviewChecksNeedingRepair,
  buildStoryDriveSyncReport,
  buildStoryLoopSyncReport,
  buildInformationFlowSyncReport,
  buildExpectationThresholdSyncReport,
  buildEmotionalArcSyncReport,
  buildChapterHookSyncReport,
  buildParagraphHookSyncReport,
  buildSuspenseSyncReport,
  buildReversalSyncReport,
  buildShowdownSyncReport,
  buildBridgeUnitSyncReport,
  buildBeatCoolingSyncReport,
  buildOpeningSyncReport,
  buildProseCraftSyncReport,
  buildPunctuationToneSyncReport,
  buildQualityAuditRepairReceiptSyncReport,
  buildRevisionContextReceiptSyncReport,
  buildNextChapterQualityPlanReceiptSyncReport,
  buildStatusFilterReceiptSyncReport,
  buildWritePreparationReceiptSyncReport,
  buildArtifactProtocolReceiptSyncReport,
  buildQualityAuditSyncReport,
  buildDialogueSyncReport,
  buildCharacterBehaviorSyncReport,
  buildAssetLinkageSyncReport,
  buildStateTrackingSyncReport,
  buildIntentConfirmationSyncReport,
  buildContinuityHeatSyncReport,
  buildConflictStructureSyncReport,
  buildUpgradeRhythmSyncReport,
  buildTargetReaderSyncReport,
  buildGenrePositioningSyncReport,
  buildFemaleAudienceSyncReport,
  buildPlotDynamicsSyncReport,
  buildStoryPowerSyncReport,
  buildCharacterRelationSyncReport,
  buildCharacterArcSyncReport,
  buildDeliveryRiskCarryOverContext,
  buildDeliveryRiskReceiptSyncReport,
  normalizeDeliveryRiskReceipts,
  uniqueDeliveryRiskReceipts,
  buildReaderExpectationDebtContext,
  buildInnovationSyncReport,
  buildSignatureSceneSyncReport,
  buildSceneCardReceiptSyncReport,
  buildChapterBlueprintSyncReport,
  buildChapterBenchmarkSyncReport,
  buildBenchmarkRecallSyncReport,
  buildStyleBoundarySyncReport,
  scanBenchmarkRecallExecutionRisks,
  buildStyleSampleSyncReport,
  buildStyleSampleEffectivenessForSelection,
  buildFirst30RetentionContext,
  buildReaderExpectationSyncReport,
  buildReaderPayoffSyncReport,
  buildReaderRetentionSyncReport,
  buildRunwaySyncReport,
  buildSerialMomentumBrief,
  buildSerialQualityRegressionBrief,
  buildRevisionStrategyBrief,
  normalizeFiveDimensionQualityScores,
  resolveEffectiveQualityThreshold,
  buildStoryUnitSyncReport,
  buildVolumeBeatSyncReport,
  buildStoryStateSyncContextPackage,
  buildStyleFingerprintStateSnapshot,
  buildSceneCardConsumptionChecks,
  scanSceneCardReceiptRisks,
  verifiedSceneBreakdownForStateSync,
  selectVerifiedSceneBreakdownUpdate,
  buildMemePolishPrompt,
  buildReadabilityReviewPrompt,
  scanAuthorialForecastRisks,
  scanBannedWordLeaks,
  scanContextSensitiveWordDensityRisks,
  scanWeakAdverbDensityRisks,
  scanDialogueBreathRisks,
  scanDialogueDensityRisks,
  scanDialogueInfodumpRisks,
  scanDialogueJudgmentQuestionRisks,
  scanDialogueEmptyPraiseRisks,
  scanDialogueEasyPersuasionRisks,
  scanDialogueEmotionContinuityRisks,
  scanDialogueFormatRisks,
  scanDialoguePowerBalanceRisks,
  scanDialogueProtagonistLineEconomyRisks,
  scanDialogueQuestionAnswerLoopRisks,
  scanDialogueQuoteStyleRisks,
  scanDialogueSubtextAgendaRisks,
  scanDialogueToneRisks,
  scanDialogueVoiceSamenessRisks,
  scanEmotionTellingRisks,
  scanEmotionalStasisRisks,
  scanDownwardSafetyRisks,
  scanOppressionPurposeRisks,
  scanPayoffDensityRisks,
  scanPayoffEscalationRisks,
  scanTrumpCardEffectRisks,
  scanUpgradeAftermathRisks,
  scanInternalMonologueRisks,
  scanEndingHookRisks,
  scanSuddenEndingClueRisks,
  scanEndingSummaryRisks,
  scanExpectationVacuumRisks,
  scanInfodumpRisks,
  scanRecapFillerRisks,
  scanOpeningEventDensityRisks,
  scanOpeningFirst50ConflictRisks,
  scanEntryPromiseAlignmentRisks,
  scanOpeningConflictAlignmentRisks,
  scanOpeningHookRisks,
  scanOpeningHookEchoRisks,
  scanOpeningProtagonistDelayRisks,
  scanParagraphHookStallRisks,
  scanEvidenceChainDumpRisks,
  scanEvidenceTimeBombRisks,
  scanFinalEvidenceImpactRisks,
  scanAntagonistDownfallAgencyRisks,
  scanFaceSlapRhythmRisks,
  scanProtagonistComposureRisks,
  scanPayoffSetupRisks,
  buildPayoffSetupSyncReport,
  scanShockLayeringRisks,
  scanSpectatorReactionDifferentiationRisks,
  buildSpectatorReactionSyncReport,
  scanSuspenseFalseAlarmRisks,
  scanSuspenseWithheldInfoRisks,
  scanObscureSuspenseRisks,
  scanRelationshipSceneChangeRisks,
  scanParagraphFragmentationRisks,
  scanParagraphLengthUniformityRisks,
  scanParagraphCommaChainDensityRisks,
  scanParagraphProgressionRisks,
  scanMeaningInflationFillerRisks,
  scanNarrativeTransitionRisks,
  scanSceneGoalObstacleChangeRisks,
  scanSceneDensityExecutionRisks,
  scanScenePurposeWeightRisks,
  scanSceneSensoryAnchorRisks,
  scanSceneSerialRiskRepairRisks,
  scanCombatProcessRisks,
  scanPeriodMonotonyRisks,
  scanPunctuationToneRisks,
  scanProseCameraAnchorRisks,
  scanProseDecorativeDetailRisks,
  scanProseStaticEnvironmentRisks,
  scanProseMotionStillRisks,
  scanProseStackedDescriptionRisks,
  scanProseOmniscientCrowdCameraRisks,
  scanSpecificCharacterCountExpressionRisks,
  scanProseFormatRisks,
  scanProseMetaLeaks,
  scanModelDegenerationRisks,
  buildProseMetaSyncReport,
  scanChapterBlueprintCraftRisks,
  scanCharacterOrderExecutionRisks,
  scanBeatSequenceExecutionRisks,
  scanEndingContractExecutionRisks,
  scanCostRewardExecutionRisks,
  scanLocalVictoryCostRisks,
  scanGoldenThreeExecutionRisks,
  scanRepeatedReactionRisks,
  scanRepeatedSubjectRisks,
  scanTripleParallelRisks,
  scanEconomicPowerScaleAnchorRisks,
  scanVagueQuantityWeightRisks,
  scanNewConceptOverloadRisks,
  scanNewConceptAnchorRisks,
  buildSourceReadinessChecks,
  buildSourceReadinessPreflightChecks,
  resolveSerialStoryStateReadiness,
  buildSourceReadinessSyncReport,
  scanUniformRhythmRisks,
  buildStorylineSyncReport,
  buildStateDeltaCompletenessReport,
  buildForeshadowingDeltaSyncReport,
  buildTimelineDeltaSyncReport,
  buildCharacterStateDeltaSyncReport,
  buildAssetStateDeltaSyncReport,
  buildRelationshipDeltaSyncReport,
  buildChapterHandoffDeltaSyncReport,
  buildProseRevisionReceiptSyncReport,
  applyDeterministicWordCountIssueGuard,
  mergeProseRevisionArtifacts,
  mergeQualityRecheckReviewWithStructuredEvidence,
  mergePostDeliveryReceiptSyncIntoQualityGateReview,
  mergeStructuredReviewFillPayload,
  buildDeslopRepairReceiptSyncReport,
  buildRevisionCascadeImpactSyncReport,
  buildRevisionScopeGuardSyncReport,
  normalizeDeterministicProseFormat,
  normalizeDeterministicProsePunctuation,
  buildDeterministicProseCleanupReport,
  buildQualityGateReviewWithDeterministicCleanup,
  buildMergedLayeredMemoryContext,
  applyStyleSampleStrategyAuthorAction,
  applyChapterWordTargetToContext,
  buildProseWordTargetExpansionPrompt,
  countProseChars,
  compileParagraphProseContext,
  createNovelWritingService,
  evaluateProseWordTarget,
  extractProseExpansionPayload,
  mergeConfirmedPreDraftBriefIntoContext,
  normalizeDiscoveredAssets,
  normalizeIpSceneCandidates,
  normalizeMemeBank,
  normalizeChapterBenchmarkSampleBank,
  normalizeStyleSampleBank,
  normalizeSceneCardsPayload,
  proseMaxTokensForWordTarget,
  prepareProseGenerationContract,
  mergeFinalStateTrackingContract,
  mergeFinalRepairPreDraftRawPayload,
  repairBenchmarkRecallSourcePathState,
  resolveChapterWordTarget,
} from '../novel-writing-service'
import { buildLLMResultDiagnostics, buildPreflightChecks, deepMergeObjects, extractPlainProseFallback, formatReviewIssueForStorage, getNovelPayload, getQualityGateDecision, getStyleLock, normalizeIssue } from './novel-route-utils'
import { buildProseGenerationContract } from '../novel-writing/prose-generation-contract'
import { buildProsePromptContextSnapshot } from '../novel-writing/prose-prompt-context'
import { normalizeProseForStorage } from '../novel-writing/chapter-prose-storage-patch'
import { buildPipelineProse, createProsePipelineHarness as createProsePipelineHarnessWithService, proseQualityScores } from './novel-writing-service.test-support'

function proseQualityRisksSource() {
  const dir = join(import.meta.dir, '../novel-writing-service/quality')
  return [
    'prose-quality-risks.ts',
    'prose-quality-risks-extended.ts',
    'prose-quality-risks-extended-core.ts',
    'prose-quality-risks-extended-handoff.ts',
    'prose-quality-risks-extended-audience.ts',
    'prose-quality-risks-audience.ts',
    'prose-quality-risks-audience-core.ts',
    'prose-quality-risks-audience-hooks.ts',
    'prose-quality-risks-audience-craft.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}
const createProsePipelineHarness = (options?: any) => createProsePipelineHarnessWithService(createNovelWritingService, options)
const readSceneCardsPromptSource = () => readFileSync(join(import.meta.dir, '../novel-writing/scene-cards-prompt.ts'), 'utf8')
const readPostDeliveryStoryStateUpdateSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-story-state-update.ts'), 'utf8')
const readChapterProseStoragePatchSource = () => readFileSync(join(import.meta.dir, '../novel-writing/chapter-prose-storage-patch.ts'), 'utf8')
const readPostDeliverySyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-sync-review-record.ts'), 'utf8')
const readDraftSyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/draft-sync-review-record.ts'), 'utf8')

describe('chapter context word target source guards 2 a', () => {
  test('auto-repairs unattended chapter blueprint with a persisted oh-story blueprint contract', () => {
    const source = ['auto-repair-preflight-methods.ts','auto-repair-preflight-materials.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('chapter_blueprint')
    expect(repairBlock).toContain('target_emotion')
    expect(repairBlock).toContain('core_payoff')
    expect(repairBlock).toContain('content_outline')
    expect(repairBlock).toContain('beat_density_contract')
    expect(repairBlock).toContain('function_tag 必须决定展开还是带过')
    expect(repairBlock).toContain('beat_density_contract: buildChapterBlueprintBeatDensityContract')
    expect(repairBlock).toContain('ending_contract')
    expect(repairBlock).toContain('const repairedChapterBlueprint =')
    expect(repairBlock).toContain('pre_draft_brief:')
    expect(repairBlock).toContain('chapter_blueprint: repairedChapterBlueprint')
  })
  test('auto-repairs unattended chapter blueprint with an oh-story outline methods contract', () => {
    const source = ['auto-repair-preflight-methods.ts','auto-repair-preflight-materials.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('outline_methods_contract')
    expect(repairBlock).toContain('大纲方法合同')
    expect(repairBlock).toContain('五步大纲创建法')
    expect(repairBlock).toContain('八节点故事结构')
    expect(repairBlock).toContain('爽文五阶段小循环')
    expect(repairBlock).toContain('情绪拉扯五折线')
    expect(repairBlock).toContain('相同金手指逻辑禁止连续使用')
    expect(repairBlock).toContain('outline_methods_contract: buildOutlineMethodsContract')
  })
  test('auto-repairs unattended chapter blueprint with oh-story emotion and paragraph hook contracts', () => {
    const source = ['auto-repair-preflight-methods.ts','auto-repair-preflight-materials.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('emotional_arc_contract')
    expect(repairBlock).toContain('chapter_hook_contract')
    expect(repairBlock).toContain('paragraph_hook_contract')
    expect(repairBlock).toContain('opening_contract')
    expect(repairBlock).toContain('suspense_contract')
    expect(repairBlock).toContain('reversal_contract')
    expect(repairBlock).toContain('let repairedEmotionAndHookBrief = buildChapterPreDraftBrief')
    expect(repairBlock).toContain('emotional_arc_contract: repairedEmotionAndHookBrief.emotional_arc_contract')
    expect(repairBlock).toContain('chapter_hook_contract: repairedEmotionAndHookBrief.chapter_hook_contract')
    expect(repairBlock).toContain('paragraph_hook_contract: repairedEmotionAndHookBrief.paragraph_hook_contract')
    expect(repairBlock).toContain('opening_contract: repairedEmotionAndHookBrief.opening_contract')
    expect(repairBlock).toContain('suspense_contract: repairedEmotionAndHookBrief.suspense_contract')
    expect(repairBlock).toContain('reversal_contract: repairedEmotionAndHookBrief.reversal_contract')
    expect(repairBlock).toContain('情绪弧合同')
    expect(repairBlock).toContain('章级钩子合同')
    expect(repairBlock).toContain('段落级钩子合同')
    expect(repairBlock).toContain('开篇合同')
    expect(repairBlock).toContain('悬念合同')
    expect(repairBlock).toContain('reader_preknowledge_rules')
    expect(repairBlock).toContain('trump_card_preposition_rules')
    expect(repairBlock).toContain('读者预知法')
    expect(repairBlock).toContain('底牌前置法')
    expect(repairBlock).toContain('first_impression_rules')
    expect(repairBlock).toContain('peak_end_rules')
    expect(repairBlock).toContain('emotion_layer_rules')
    expect(repairBlock).toContain('reaction_structure_rules')
    expect(repairBlock).toContain('ideological_conflict_rules')
    expect(repairBlock).toContain('先入为主')
    expect(repairBlock).toContain('峰终定律')
    expect(repairBlock).toContain('三层情绪')
    expect(repairBlock).toContain('前反应')
    expect(repairBlock).toContain('以小搏大')
    expect(repairBlock).toContain('理念矛盾')
    expect(repairBlock).toContain('反转合同')
  })
  test('auto-repairs unattended chapter blueprint with oh-story plot and prose quality contracts', () => {
    const source = ['auto-repair-preflight-methods.ts','auto-repair-preflight-materials.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('plot_dynamics_contract')
    expect(repairBlock).toContain('information_flow_contract')
    expect(repairBlock).toContain('expectation_threshold_contract')
    expect(repairBlock).toContain('story_loop_contract')
    expect(repairBlock).toContain('prose_craft_contract')
    expect(repairBlock).toContain('punctuation_tone_contract')
    expect(repairBlock).toContain('quality_audit_contract')
    expect(repairBlock).toContain('plot_dynamics_contract: repairedEmotionAndHookBrief.plot_dynamics_contract')
    expect(repairBlock).toContain('information_flow_contract: repairedEmotionAndHookBrief.information_flow_contract')
    expect(repairBlock).toContain('expectation_threshold_contract: repairedEmotionAndHookBrief.expectation_threshold_contract')
    expect(repairBlock).toContain('story_loop_contract: repairedEmotionAndHookBrief.story_loop_contract')
    expect(repairBlock).toContain('prose_craft_contract: repairedEmotionAndHookBrief.prose_craft_contract')
    expect(repairBlock).toContain('punctuation_tone_contract: repairedEmotionAndHookBrief.punctuation_tone_contract')
    expect(repairBlock).toContain('quality_audit_contract: repairedEmotionAndHookBrief.quality_audit_contract')
    expect(repairBlock).toContain('剧情动力合同')
    expect(repairBlock).toContain('信息流合同')
    expect(repairBlock).toContain('期待阈值合同')
    expect(repairBlock).toContain('expectation_relay_rules')
    expect(repairBlock).toContain('期待接力法')
    expect(repairBlock).toContain('故事循环合同')
    expect(repairBlock).toContain('正文工艺合同')
    expect(repairBlock).toContain('正文工艺短口径')
    expect(repairBlock).toContain('subject_name_rhythm_rules')
    expect(repairBlock).toContain('主语与名字节奏')
    expect(repairBlock).not.toContain('subject_name_rhythm_rules 必须包含主语与名字节奏')
    expect(repairBlock).toContain('indirect_description_rules')
    expect(repairBlock).toContain('间接描写法')
    expect(repairBlock).toContain('侧面反应才是爽点')
    expect(repairBlock).toContain('three_camera_rules')
    expect(repairBlock).toContain('三机位法')
    expect(repairBlock).toContain('设定都由冲突引出')
    expect(repairBlock).toContain('then_what_rules')
    expect(repairBlock).toContain('然后呢')
    expect(repairBlock).toContain('每一段文字')
    expect(repairBlock).toContain('core_emotion_alignment_rules')
    expect(repairBlock).toContain('围绕核心情绪设计全部情节')
    expect(repairBlock).toContain('宏观把控整体节奏')
    expect(repairBlock).toContain('baimiao_sensory_rules')
    expect(repairBlock).toContain('白描')
    expect(repairBlock).toContain('五感必须服务情绪')
    expect(repairBlock).not.toContain('baimiao_sensory_rules 必须包含白描 = 最少的字')
    expect(repairBlock).toContain('dynamic_description_rules')
    expect(repairBlock).toContain('动态描写优于静态描写')
    expect(repairBlock).toContain('动作和反应展现')
    expect(repairBlock).toContain('角色行动中穿插点染')
    expect(repairBlock).toContain('shot_rhythm_rules')
    expect(repairBlock).toContain('镜头与分镜思维')
    expect(repairBlock).toContain('远景/中景/近景/特写')
    expect(repairBlock).toContain('短句、短段、密集动作')
    expect(repairBlock).toContain('transition_bridge_rules')
    expect(repairBlock).toContain('场景切换与转场')
    expect(repairBlock).toContain('时间跳转')
    expect(repairBlock).toContain('动作或物件衔接')
    expect(repairBlock).toContain('声音或光影衔接')
    expect(repairBlock).toContain('section_density_rules')
    expect(repairBlock).toContain('anti_padding_rules')
    expect(repairBlock).toContain('小节密度诊断')
    expect(repairBlock).toContain('description_limits')
    expect(repairBlock).toContain('水分控制')
    expect(repairBlock).toContain('删掉这段后读者会不会困惑')
    expect(repairBlock).toContain('anti_ai_smell_rules')
    expect(repairBlock).toContain('高危词')
    expect(repairBlock).toContain('章末总结体')
    expect(repairBlock).toContain('叠加式描写')
    expect(repairBlock).toContain('语气标点合同')
    expect(repairBlock).toContain('质量诊断合同')
    expect(repairBlock).toContain('maxTokens: 6800')
  })
  test('auto-repairs unattended chapter blueprint with oh-story character asset and state contracts', () => {
    const source = ['auto-repair-preflight-methods.ts','auto-repair-preflight-materials.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('dialogue_contract')
    expect(repairBlock).toContain('continuity_heat_contract')
    expect(repairBlock).toContain('character_relation_contract')
    expect(repairBlock).toContain('character_behavior_contract')
    expect(repairBlock).toContain('asset_linkage_contract')
    expect(repairBlock).toContain('state_tracking_contract')
    expect(repairBlock).toContain('intent_confirmation_contract')
    expect(repairBlock).toContain('dialogue_contract: repairedEmotionAndHookBrief.dialogue_contract')
    expect(repairBlock).toContain('continuity_heat_contract: repairedEmotionAndHookBrief.continuity_heat_contract')
    expect(repairBlock).toContain('character_relation_contract: repairedEmotionAndHookBrief.character_relation_contract')
    expect(repairBlock).toContain('character_behavior_contract: repairedEmotionAndHookBrief.character_behavior_contract')
    expect(repairBlock).toContain('asset_linkage_contract: repairedEmotionAndHookBrief.asset_linkage_contract')
    expect(repairBlock).toContain('state_tracking_contract: repairedEmotionAndHookBrief.state_tracking_contract')
    expect(repairBlock).toContain('intent_confirmation_contract: repairedEmotionAndHookBrief.intent_confirmation_contract')
    expect(repairBlock).toContain('对白合同')
    expect(repairBlock).toContain('mode_playbooks')
    expect(repairBlock).toContain('power_length_rules')
    expect(repairBlock).toContain('subtext_agenda_rules')
    expect(repairBlock).toContain('tone_context_rules')
    expect(repairBlock).toContain('emotion_push_rules')
    expect(repairBlock).toContain('emotion_continuity_rules')
    expect(repairBlock).toContain('dialogue_drive_rules')
    expect(repairBlock).toContain('information_embed_rules')
    expect(repairBlock).toContain('information_tension_rules')
    expect(repairBlock).toContain('voice_differentiation_rules')
    expect(repairBlock).toContain('spectator_dialogue_rules')
    expect(repairBlock).toContain('dialogue_rhythm_rules')
    expect(repairBlock).toContain('dialogue_volume_rules')
    expect(repairBlock).toContain('dialogue_meme_rules')
    expect(repairBlock).toContain('dialogue_audit_rules')
    expect(repairBlock).toContain('掌控者/主角亮底牌时对白 ≤ 10 字')
    expect(repairBlock).toContain('真实动机绝对不能浅显地写在台词里')
    expect(repairBlock).toContain('命令式+否定式最能激发读者情绪')
    expect(repairBlock).toContain('用角色的语气和立场包裹信息')
    expect(repairBlock).toContain('口癖和惯用语')
    expect(repairBlock).toContain('关系阶段不同')
    expect(repairBlock).toContain('普通人震惊')
    expect(repairBlock).toContain('专业人士分析')
    expect(repairBlock).toContain('不代替主线')
    expect(repairBlock).toContain('连续多轮对话后需要换气')
    expect(repairBlock).toContain('关键信息放对话开头或结尾')
    expect(repairBlock).toContain('读者已知信息')
    expect(repairBlock).toContain('突发状况替代')
    expect(repairBlock).toContain('新人物必须安排主线戏份')
    expect(repairBlock).toContain('说不出来但意思到了')
    expect(repairBlock).toContain('不得直接复刻')
    expect(repairBlock).toContain('大量信息都必须用对话来展示')
    expect(repairBlock).toContain('问答式的一问一答')
    expect(repairBlock).toContain('依赖对话来推动剧情或人物变化')
    expect(repairBlock).toContain('遮住角色名后能否区分')
    expect(repairBlock).toContain('单次对话不超过全节 40%')
    expect(repairBlock).toContain('自然口语交流')
    expect(repairBlock).toContain('对话结尾能否预示接下来的节奏变化')
    expect(repairBlock).toContain('连续性热度合同')
    expect(repairBlock).toContain('角色关系合同')
    expect(repairBlock).toContain('expectation_hub_rules')
    expect(repairBlock).toContain('buffer_zone_rules')
    expect(repairBlock).toContain('配角期待枢纽')
    expect(repairBlock).toContain('任务基地')
    expect(repairBlock).toContain('短期和长期期待')
    expect(repairBlock).toContain('配角攻略缓冲区')
    expect(repairBlock).toContain('信息差、地位差距、亲密度差距或信任程度')
    expect(repairBlock).toContain('配角不能像 NPC 一样站着等主角触发')
    expect(repairBlock).toContain('角色行为合同')
    expect(repairBlock).toContain('strong_association_rules')
    expect(repairBlock).toContain('每个重要角色至少 3 个强关联设定')
    expect(repairBlock).toContain('资产挂钩合同')
    expect(repairBlock).toContain('prop_ability_expectation_rules')
    expect(repairBlock).toContain('道具能力展示的8步期待模板')
    expect(repairBlock).toContain('鸡肋成神器')
    expect(repairBlock).toContain('状态跟踪合同')
    expect(repairBlock).toContain('意图确认合同')
  })
  test('unattended character repair asks for layered missing role pools', () => {
    const source = ['auto-repair-preflight-methods.ts','auto-repair-preflight-materials.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const repairStart = source.indexOf('任务：为无人值守章节写作自动补齐前置材料')
    const characterCreateStart = source.indexOf('const existingNames = new Set', repairStart)
    const repairBlock = source.slice(repairStart, characterCreateStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(characterCreateStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('primary_supporting')
    expect(repairBlock).toContain('secondary_supporting')
    expect(repairBlock).toContain('cameo_supporting')
    expect(repairBlock).toContain('antagonist_minor')
    expect(repairBlock).toContain('faction_agent')
    expect(repairBlock).toContain('antagonist_logic')
  })
  test('unattended character repair uses tier-aware candidate limits instead of first six', () => {
    const source = ['auto-repair-preflight-methods.ts','auto-repair-preflight-materials.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain('selectTierAwareCharacterRepairCandidates')
    expect(source).not.toContain('characterCandidates.slice(0, 6)')
  })
  test('auto-repairs unattended chapter blueprint with oh-story reader genre upgrade and conflict contracts', () => {
    const source = ['auto-repair-preflight-methods.ts','auto-repair-preflight-materials.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('target_reader_contract')
    expect(repairBlock).toContain('genre_positioning_contract')
    expect(repairBlock).toContain('upgrade_rhythm_contract')
    expect(repairBlock).toContain('conflict_structure_contract')
    expect(repairBlock).toContain('target_reader_contract: repairedEmotionAndHookBrief.target_reader_contract')
    expect(repairBlock).toContain('genre_positioning_contract: repairedEmotionAndHookBrief.genre_positioning_contract')
    expect(repairBlock).toContain('upgrade_rhythm_contract: repairedEmotionAndHookBrief.upgrade_rhythm_contract')
    expect(repairBlock).toContain('conflict_structure_contract: repairedEmotionAndHookBrief.conflict_structure_contract')
    expect(repairBlock).toContain('目标读者合同')
    expect(repairBlock).toContain('题材定位合同')
    expect(repairBlock).toContain('micro_innovation_702010_rules')
    expect(repairBlock).toContain('70%来自过去经历和记忆')
    expect(repairBlock).toContain('micro_innovation_methods')
    expect(repairBlock).toContain('精炼法')
    expect(repairBlock).toContain('升级节奏合同')
    expect(repairBlock).toContain('ranking_ladder_rules')
    expect(repairBlock).toContain('排行榜提供升级动力')
    expect(repairBlock).toContain('goldfinger_feedback_rules')
    expect(repairBlock).toContain('把金手指带来变化的过程掺杂在故事里')
    expect(repairBlock).toContain('冲突结构合同')
    expect(repairBlock).toContain('maxTokens: 6800')
  })
  test('auto-repairs unattended chapter blueprint with oh-story female audience contract', () => {
    const source = ['auto-repair-preflight-methods.ts','auto-repair-preflight-materials.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('female_audience_contract')
    expect(repairBlock).toContain('female_audience_contract: repairedEmotionAndHookBrief.female_audience_contract')
    expect(repairBlock).toContain('女频长篇合同')
    expect(repairBlock).toContain('安全感优先')
    expect(repairBlock).toContain('女主主动性')
    expect(repairBlock).toContain('感情线双轴')
    expect(repairBlock).toContain('每段虐后必给反转或糖')
    expect(repairBlock).toContain('番茄女生')
    expect(repairBlock).toContain('货板一致')
  })
  test('auto-repairs unattended chapter blueprint with oh-story showdown contract', () => {
    const source = ['auto-repair-preflight-methods.ts','auto-repair-preflight-materials.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('showdown_contract')
    expect(repairBlock).toContain('showdown_contract: repairedEmotionAndHookBrief.showdown_contract')
    expect(repairBlock).toContain('高潮对抗合同')
    expect(repairBlock).toContain('爽点释放')
    expect(repairBlock).toContain('三压一爆三震')
    expect(repairBlock).toContain('友好势力')
    expect(repairBlock).toContain('群众层 -> 中间层 -> 核心层')
    expect(repairBlock).toContain('打斗是一场表演')
    expect(repairBlock).toContain('急 -> 缓 -> 急')
    expect(repairBlock).toContain('底牌管理')
    expect(repairBlock).toContain('每次只出1个')
    expect(repairBlock).toContain('invincible_protagonist_rules')
    expect(repairBlock).toContain('主角登场即杀伐果断')
  })
  test('auto-repairs unattended chapter blueprint with oh-story bridge unit contract', () => {
    const source = ['auto-repair-preflight-methods.ts','auto-repair-preflight-materials.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('bridge_unit_contract')
    expect(repairBlock).toContain('bridge_unit_contract: repairedEmotionAndHookBrief.bridge_unit_contract')
    expect(repairBlock).toContain('桥段节奏合同')
    expect(repairBlock).toContain('四章一桥段')
    expect(repairBlock).toContain('高潮中埋钩子')
    expect(repairBlock).toContain('连续 2 章没有目标推进')
  })
  test('auto-repairs unattended chapter blueprint with oh-story plot framework contract', () => {
    const source = ['auto-repair-preflight-methods.ts','auto-repair-preflight-materials.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('plot_framework_contract')
    expect(repairBlock).toContain('plot_framework_contract: repairedEmotionAndHookBrief.plot_framework_contract')
    expect(repairBlock).toContain('剧情框架合同')
    expect(repairBlock).toContain('题材→框架路由')
    expect(repairBlock).toContain('RPG结构与奖励设计')
    expect(repairBlock).toContain('框架与阵营手牌法')
    expect(repairBlock).toContain('套路模板重复法')
    expect(repairBlock).toContain('五不崩')
  })
  test('auto-repairs unattended chapter blueprint with oh-story style boundary contract', () => {
    const source = ['auto-repair-preflight-methods.ts','auto-repair-preflight-materials.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('style_boundary_contract')
    expect(repairBlock).toContain('style_boundary_contract: repairedEmotionAndHookBrief.style_boundary_contract')
    expect(repairBlock).toContain('文风覆盖边界合同')
    expect(repairBlock).toContain('硬约束永远赢')
    expect(repairBlock).toContain('Gate F')
    expect(repairBlock).toContain('禁用词')
  })
  test('auto-repairs unattended chapter blueprint with persisted pre-draft launch briefs', () => {
    const source = ['auto-repair-preflight-methods.ts','auto-repair-preflight-materials.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('previous_handoff: repairedEmotionAndHookBrief.previous_handoff')
    expect(repairBlock).toContain('reader_promise: repairedEmotionAndHookBrief.reader_promise')
    expect(repairBlock).toContain('emotional_curve: repairedEmotionAndHookBrief.emotional_curve')
    expect(repairBlock).toContain('platform_rubric: repairedEmotionAndHookBrief.platform_rubric')
    expect(repairBlock).toContain('content_rubric: repairedEmotionAndHookBrief.content_rubric')
    expect(repairBlock).toContain('reader_retention_brief: repairedEmotionAndHookBrief.reader_retention_brief')
    expect(repairBlock).toContain('story_drive_brief: repairedEmotionAndHookBrief.story_drive_brief')
    expect(repairBlock).toContain('serial_rhythm_brief: repairedEmotionAndHookBrief.serial_rhythm_brief')
    expect(repairBlock).toContain('page_turn_hook_brief: repairedEmotionAndHookBrief.page_turn_hook_brief')
    expect(repairBlock).toContain('benchmark_recall_brief: repairedEmotionAndHookBrief.benchmark_recall_brief')
    expect(repairBlock).toContain('core_contract_radar: repairedEmotionAndHookBrief.core_contract_radar')
  })
  test('auto-repairs unattended chapter blueprint with persisted longform continuity launch briefs', () => {
    const source = ['auto-repair-preflight-methods.ts','auto-repair-preflight-materials.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('key_settings: repairedEmotionAndHookBrief.key_settings')
    expect(repairBlock).toContain('forbidden_content: repairedEmotionAndHookBrief.forbidden_content')
    expect(repairBlock).toContain('storyline_advances: repairedEmotionAndHookBrief.storyline_advances')
    expect(repairBlock).toContain('storyline_plants: repairedEmotionAndHookBrief.storyline_plants')
    expect(repairBlock).toContain('storyline_payoffs: repairedEmotionAndHookBrief.storyline_payoffs')
    expect(repairBlock).toContain('storyline_forbidden: repairedEmotionAndHookBrief.storyline_forbidden')
    expect(repairBlock).toContain('reader_drop_risk_brief: repairedEmotionAndHookBrief.reader_drop_risk_brief')
    expect(repairBlock).toContain('story_pressure_brief: repairedEmotionAndHookBrief.story_pressure_brief')
    expect(repairBlock).toContain('volume_climax_brief: repairedEmotionAndHookBrief.volume_climax_brief')
    expect(repairBlock).toContain('recent_fatigue_brief: repairedEmotionAndHookBrief.recent_fatigue_brief')
    expect(repairBlock).toContain('delivery_risk_carry_over: repairedEmotionAndHookBrief.delivery_risk_carry_over')
    expect(repairBlock).toContain('reader_expectation_debt: repairedEmotionAndHookBrief.reader_expectation_debt')
    expect(repairBlock).toContain('reader_expectation_ledger: repairedEmotionAndHookBrief.reader_expectation_ledger')
    expect(repairBlock).toContain('longform_compass: repairedEmotionAndHookBrief.longform_compass')
    expect(repairBlock).toContain('longform_memory_capsule: repairedEmotionAndHookBrief.longform_memory_capsule')
    expect(repairBlock).toContain('layered_memory_context: repairedEmotionAndHookBrief.layered_memory_context')
    expect(repairBlock).toContain('next_batch_brief: repairedEmotionAndHookBrief.next_batch_brief')
    expect(repairBlock).toContain('story_unit_context: repairedEmotionAndHookBrief.story_unit_context')
  })
})

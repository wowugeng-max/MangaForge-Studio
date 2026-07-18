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
} from './novel-writing-service'
import { buildLLMResultDiagnostics, buildPreflightChecks, deepMergeObjects, extractPlainProseFallback, formatReviewIssueForStorage, getNovelPayload, getQualityGateDecision, getStyleLock, normalizeIssue } from './novel-route-utils'
import { buildProseGenerationContract } from '../novel-writing/prose-generation-contract'
import { buildProsePromptContextSnapshot } from '../novel-writing/prose-prompt-context'
import { normalizeProseForStorage } from '../novel-writing/chapter-prose-storage-patch'
import { buildPipelineProse, createProsePipelineHarness as createProsePipelineHarnessWithService, proseQualityScores } from './novel-writing-service.test-support'
const createProsePipelineHarness = (options?: any) => createProsePipelineHarnessWithService(createNovelWritingService, options)
const readSceneCardsPromptSource = () => readFileSync(join(import.meta.dir, '../novel-writing/scene-cards-prompt.ts'), 'utf8')
const readPostDeliveryStoryStateUpdateSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-story-state-update.ts'), 'utf8')
const readChapterProseStoragePatchSource = () => readFileSync(join(import.meta.dir, '../novel-writing/chapter-prose-storage-patch.ts'), 'utf8')
const readPostDeliverySyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-sync-review-record.ts'), 'utf8')
const readDraftSyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/draft-sync-review-record.ts'), 'utf8')

describe('normalizeSceneCardsPayload contracts a b', () => {
  test('projects source-readiness carry-over into scene information and setting fields', () => {
    const sourceReadinessRepair = '下一章必须补来源就绪：旧印编号、禁库权限和林青禾证词都要有来源依据，缺口必须先写入场景信息需求，不能靠正文临时编。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧印复核',
          purpose: '复核旧印编号来源',
          beat: '李玄把旧印编号交给林青禾核验。',
        },
        {
          title: '禁库权限',
          purpose: '确认禁库权限依据',
          beat: '林青禾拿出上一章留下的权限凭条。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [sourceReadinessRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(sourceReadinessRepair)
    expect(sceneCards[1].required_information).toContain(sourceReadinessRepair)
    expect(sceneCards[0].used_settings).toContain(sourceReadinessRepair)
    expect(sceneCards[1].used_settings).toContain(sourceReadinessRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('来源就绪')
    expect(sceneCards[1].serial_risk_repairs).toContain('来源就绪')
  })
  test('projects intent-confirmation carry-over into scene purpose and beat fields', () => {
    const intentConfirmationRepair = '下一章必须补意图确认：所有场景都要服务本章目标“拿到禁库入口”，不能偏去解释旧城历史；每场结束要验证目标推进。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '入口目标',
          purpose: '把本章目标压到场面里',
          beat: '李玄要求先拿禁库入口位置。',
        },
        {
          title: '目标推进',
          purpose: '验证禁库入口是否推进',
          beat: '林青禾指出入口权限还差一枚旧印。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [intentConfirmationRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(intentConfirmationRepair)
    expect(sceneCards[1].purpose_tags).not.toContain(intentConfirmationRepair)
    expect(sceneCards[0].required_beats).toContain(intentConfirmationRepair)
    expect(sceneCards[1].required_beats).toContain(intentConfirmationRepair)
    expect(sceneCards[0].state_changes_expected).toContain(intentConfirmationRepair)
    expect(sceneCards[1].state_changes_expected).toContain(intentConfirmationRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('意图确认')
    expect(sceneCards[1].serial_risk_repairs).toContain('意图确认')
  })
  test('projects chapter-blueprint carry-over into scene beat sequence fields', () => {
    const chapterBlueprintRepair = '下一章必须补章节细纲：按细纲顺序执行 线索确认 -> 行动受阻 -> 付出代价 -> 小胜奖励，不能跳过代价只给奖励。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '线索确认',
          purpose: '确认旧印线索',
          beat: '李玄先确认旧印编号对应禁库。',
        },
        {
          title: '代价小胜',
          purpose: '受阻后付出代价再拿奖励',
          beat: '李玄冒着权限反噬打开第一道门。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [chapterBlueprintRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(chapterBlueprintRepair)
    expect(sceneCards[1].required_beats).toContain(chapterBlueprintRepair)
    expect(sceneCards[0].action_beats).toContain(chapterBlueprintRepair)
    expect(sceneCards[1].action_beats).toContain(chapterBlueprintRepair)
    expect(sceneCards[1].reader_payoff).toContain(chapterBlueprintRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('章节细纲')
    expect(sceneCards[1].serial_risk_repairs).toContain('章节细纲')
  })
  test('projects blueprint-consumption carry-over into scene execution fields', () => {
    const blueprintConsumptionRepair = '下一章必须补 blueprint_consumption_checks：blueprint_field=cost_reward，expected 是行动受阻后付出代价再拿奖励，missing_gap 是正文只给结果没有代价；本章要把缺口写成可见事件和章尾承接。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '行动受阻',
          purpose: '让细纲阻碍先落地',
          beat: '禁库门拒绝旧印权限。',
        },
        {
          title: '代价承接',
          purpose: '用代价换小胜并承接章尾',
          beat: '李玄割开掌心补齐旧印血线。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [blueprintConsumptionRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(blueprintConsumptionRepair)
    expect(sceneCards[0].required_beats).toContain(blueprintConsumptionRepair)
    expect(sceneCards[1].action_beats).toContain(blueprintConsumptionRepair)
    expect(sceneCards[1].state_changes_expected).toContain(blueprintConsumptionRepair)
    expect(sceneCards[1].reader_payoff).toContain(blueprintConsumptionRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(blueprintConsumptionRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('细纲兑现')
    expect(sceneCards[1].serial_risk_repairs).toContain('细纲兑现')
  })
  test('projects word-count carry-over into scene expansion guard fields', () => {
    const wordCountRepair = '下一章必须补 word_count_checks：current_count=2400，target_count=4200，min_required_count=3600；remaining_risk 是正文低于字数下限，但不得靠环境描写、重复情绪或内心独白凑字数，必须扩写动作过程、选择代价、对话交锋和章末钩子铺垫。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '动作过程',
          purpose: '把字数缺口补成动作链',
          beat: '李玄拆开旧印边角。',
        },
        {
          title: '对话代价',
          purpose: '用对话交锋和选择代价补足篇幅',
          beat: '林青禾逼他在保密和救人之间选择。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [wordCountRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(wordCountRepair)
    expect(sceneCards[0].required_beats).toContain(wordCountRepair)
    expect(sceneCards[1].action_beats).toContain(wordCountRepair)
    expect(sceneCards[1].dialogue_goals).toContain(wordCountRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(wordCountRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(wordCountRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('字数执行')
    expect(sceneCards[1].serial_risk_repairs).toContain('字数执行')
  })
  test('projects core-contract carry-over into scene promise and payoff fields', () => {
    const coreContractRepair = '下一章必须补核心契约：核心承诺是旧城规则反制带来可见翻盘，前中后都不能漂移成单纯查案；必须把核心冲突和读者回报写进场景。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '规则压身',
          purpose: '把核心冲突压到现场',
          beat: '旧城管事按规则拒绝李玄入库。',
        },
        {
          title: '规则反制',
          purpose: '兑现旧城规则反制的核心承诺',
          beat: '李玄用旧印反过来锁住管事权限。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [coreContractRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(coreContractRepair)
    expect(sceneCards[1].purpose_tags).not.toContain(coreContractRepair)
    expect(sceneCards[0].conflict).toContain(coreContractRepair)
    expect(sceneCards[1].reader_payoff).toContain(coreContractRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(coreContractRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('核心契约')
    expect(sceneCards[1].serial_risk_repairs).toContain('核心契约')
  })
  test('projects setting-violation carry-over into scene setting guard fields', () => {
    const settingViolationRepair = '下一章必须修复 setting_violations：设定违规-规则触发，旧印只能在禁库门三息内触发，能力代价是左臂失温，物品归属仍属于林青禾；角色认知边界不能提前知道黑塔许可，禁揭设定不得泄露终局门名。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '三息触发',
          purpose: '按正确规则触发旧印',
          beat: '李玄等禁库门第三声落下才按住旧印。',
        },
        {
          title: '认知边界',
          purpose: '守住角色不知道黑塔许可的边界',
          beat: '林青禾只说旧印归她保管，没有说出终局门名。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [settingViolationRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(settingViolationRepair)
    expect(sceneCards[0].used_settings).toContain(settingViolationRepair)
    expect(sceneCards[1].forbidden_settings).toContain(settingViolationRepair)
    expect(sceneCards[1].state_changes_expected).toContain(settingViolationRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(settingViolationRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('设定违规')
    expect(sceneCards[1].serial_risk_repairs).toContain('设定违规')
  })
  test('projects female-audience carry-over into scene emotion and relationship fields', () => {
    const femaleAudienceRepair = '下一章必须补女频长篇：把关系张力、情感选择、女性视角安全感和尊严感写成场景变化，不能只写升级打脸。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '边界选择',
          purpose: '让林青禾作出情感选择',
          beat: '林青禾拒绝替李玄背锅，但主动递出证词。',
        },
        {
          title: '尊严回收',
          purpose: '让关系张力变成尊严感回报',
          beat: '李玄当众承认她的证词价值。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [femaleAudienceRepair],
        },
      },
    })

    expect(sceneCards[0].emotional_tone).toContain(femaleAudienceRepair)
    expect(sceneCards[1].emotional_tone).toContain(femaleAudienceRepair)
    expect(sceneCards[0].character_voice).toContain(femaleAudienceRepair)
    expect(sceneCards[1].state_changes_expected).toContain(femaleAudienceRepair)
    expect(sceneCards[1].reader_payoff).toContain(femaleAudienceRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('女频长篇')
    expect(sceneCards[1].serial_risk_repairs).toContain('女频长篇')
  })
  test('projects chapter-benchmark carry-over into scene benchmark and beat fields', () => {
    const chapterBenchmarkRepair = '下一章必须补章节基准：按对标章节节奏基准安排开局压迫、三段升级和章尾回收，只学节奏不复制桥段。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '开局压迫',
          purpose: '按节奏基准先压主角',
          beat: '旧城管事先关掉禁库外门。',
        },
        {
          title: '章尾回收',
          purpose: '用章尾回收承接下一章',
          beat: '第一道门打开后露出第二层禁令。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [chapterBenchmarkRepair],
        },
      },
    })

    expect(sceneCards[0].benchmark_recall_directives).toContain(chapterBenchmarkRepair)
    expect(sceneCards[1].benchmark_recall_directives).toContain(chapterBenchmarkRepair)
    expect(sceneCards[0].required_beats).toContain(chapterBenchmarkRepair)
    expect(sceneCards[1].required_beats).toContain(chapterBenchmarkRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(chapterBenchmarkRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('章节基准')
    expect(sceneCards[1].serial_risk_repairs).toContain('章节基准')
  })
  test('projects runway carry-over into scene long-line direction fields', () => {
    const runwayRepair = '下一章必须补航线：所有场景都要把旧城禁库线推向主线终点，不能被支线查案带偏；章尾必须留下通往黑塔许可的新航点。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '禁库航点',
          purpose: '把旧城禁库线推向主线',
          beat: '李玄确认禁库权限和黑塔许可有关。',
        },
        {
          title: '黑塔许可',
          purpose: '章尾留下新航点',
          beat: '禁库门后露出黑塔许可编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [runwayRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(runwayRepair)
    expect(sceneCards[1].purpose_tags).not.toContain(runwayRepair)
    expect(sceneCards[0].required_beats).toContain(runwayRepair)
    expect(sceneCards[1].state_changes_expected).toContain(runwayRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(runwayRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('航线')
    expect(sceneCards[1].serial_risk_repairs).toContain('航线')
  })
  test('projects longform-check carry-over into scene serial quality fields', () => {
    const longformRepair = '下一章必须补 longform_checks：recent_5_chapter_progress 无明确进展，payoff_interval 过长，stage_goal_shift 未换挡，next_stage_pull 不足；本章要把长篇专项风险写成阶段目标推进、爽点回报和下一阶段牵引。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '阶段换挡',
          purpose: '推动最近五章停滞的主线',
          beat: '李玄把禁库许可从线索改成当场交易目标。',
        },
        {
          title: '下一阶段',
          purpose: '给读者明确下一阶段牵引',
          beat: '黑塔许可背后浮出试炼名册。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [longformRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(longformRepair)
    expect(sceneCards[0].required_beats).toContain(longformRepair)
    expect(sceneCards[1].state_changes_expected).toContain(longformRepair)
    expect(sceneCards[1].reader_payoff).toContain(longformRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(longformRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('长篇专项')
    expect(sceneCards[1].serial_risk_repairs).toContain('长篇专项')
  })
  test('projects signature-scene carry-over into scene spectacle and payoff fields', () => {
    const signatureSceneRepair = '下一章必须补招牌场面：禁库门开启要有强画面、可传播动作和读者记忆点，用旧印反锁全场权限形成视觉爽点。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧印反锁',
          purpose: '制造招牌动作',
          beat: '李玄把旧印按进门心阵槽。',
        },
        {
          title: '权限倒转',
          purpose: '形成视觉爽点',
          beat: '全场权限灯从红色倒转成金色。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [signatureSceneRepair],
        },
      },
    })

    expect(sceneCards[0].action_beats).toContain(signatureSceneRepair)
    expect(sceneCards[1].action_beats).toContain(signatureSceneRepair)
    expect(sceneCards[0].sensory_anchor).toContain(signatureSceneRepair)
    expect(sceneCards[1].reader_payoff).toContain(signatureSceneRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('招牌场面')
    expect(sceneCards[1].serial_risk_repairs).toContain('招牌场面')
  })
  test('projects story-unit carry-over into scene unit setup and payoff fields', () => {
    const storyUnitRepair = '下一章必须补剧情单元：本章单元要完成 目标建立 -> 阻碍升级 -> 代价选择 -> 结果回收，并把未闭合部分转成下一章承接。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '目标建立',
          purpose: '建立禁库入口目标',
          beat: '李玄明确本章必须拿到禁库入口。',
        },
        {
          title: '结果回收',
          purpose: '回收代价选择并留下承接',
          beat: '禁库打开，但黑塔许可变成下一章压力。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [storyUnitRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(storyUnitRepair)
    expect(sceneCards[0].required_beats).toContain(storyUnitRepair)
    expect(sceneCards[1].required_beats).toContain(storyUnitRepair)
    expect(sceneCards[1].reader_payoff).toContain(storyUnitRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(storyUnitRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('剧情单元')
    expect(sceneCards[1].serial_risk_repairs).toContain('剧情单元')
  })
  test('projects chapter-handoff carry-over into scene opening transition fields', () => {
    const chapterHandoffRepair = '下一章必须补章首承接：第一场先接上一章禁库门开启后的余波、角色状态和未解债务，再把余波转成新目标。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '禁库余波',
          purpose: '承接上一章禁库门开启',
          beat: '门后的冷光还压在众人脸上。',
        },
        {
          title: '新目标',
          purpose: '把未解债务转成新目标',
          beat: '黑塔许可编号逼李玄继续追查。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [chapterHandoffRepair],
        },
      },
    })

    expect(sceneCards[0].transition_from_previous).toContain(chapterHandoffRepair)
    expect(sceneCards[0].required_beats).toContain(chapterHandoffRepair)
    expect(sceneCards[0].state_changes_expected).toContain(chapterHandoffRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(chapterHandoffRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('章首承接')
    expect(sceneCards[1].serial_risk_repairs).toContain('章首承接')
  })
  test('projects opening carry-over into scene first-hook fields', () => {
    const openingRepair = '下一章必须补开篇设计：前50字先给异常、冲突或对话逼问，第一段就让主角进入压力，不能慢写环境。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '冷光逼问',
          purpose: '前50字给异常逼问',
          beat: '禁库门里的冷光照出第二枚旧印。',
        },
        {
          title: '压力推进',
          purpose: '让主角进入压力',
          beat: '管事要求李玄立刻解释旧印来源。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [openingRepair],
        },
      },
    })

    expect(sceneCards[0].opening_hook).toContain(openingRepair)
    expect(sceneCards[0].required_beats).toContain(openingRepair)
    expect(sceneCards[0].conflict).toContain(openingRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('开篇设计')
    expect(sceneCards[1].serial_risk_repairs).toContain('开篇设计')
  })
  test('projects paragraph-hook carry-over into scene paragraph tension fields', () => {
    const paragraphHookRepair = '下一章必须补paragraph_hook：每个小节至少有段落级推进钩子，段尾用新动作、新问题或反应差异推进，不能连续三段平铺。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '段尾动作',
          purpose: '让段尾用新动作推进',
          beat: '李玄把旧印从阵槽里拔出来。',
        },
        {
          title: '段尾问题',
          purpose: '让段尾留下新问题',
          beat: '第二枚旧印背面没有编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [paragraphHookRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(paragraphHookRepair)
    expect(sceneCards[1].required_beats).toContain(paragraphHookRepair)
    expect(sceneCards[0].information_gap).toContain(paragraphHookRepair)
    expect(sceneCards[1].information_gap).toContain(paragraphHookRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('段落钩子')
    expect(sceneCards[1].serial_risk_repairs).toContain('段落钩子')
  })
  test('projects prose-meta carry-over into scene prose craft fields', () => {
    const proseMetaRepair = '下一章必须补正文元信息：正文里不能出现章节标题说明、创作提示、作者备注或“本章将”这类元叙述，所有信息必须写成角色当场感知和行动。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧印现场',
          purpose: '把信息写成角色感知',
          beat: '李玄看见旧印边缘裂开。',
        },
        {
          title: '禁库动作',
          purpose: '把提示改成当场行动',
          beat: '林青禾按住凭条不让管事拿走。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [proseMetaRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(proseMetaRepair)
    expect(sceneCards[1].prose_craft_directives).toContain(proseMetaRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('正文元信息')
    expect(sceneCards[1].serial_risk_repairs).toContain('正文元信息')
  })
  test('projects punctuation-tone carry-over into scene prose craft fields', () => {
    const punctuationToneRepair = '下一章必须补语气标点：感叹号、破折号、省略号只能服务动作打断、情绪压迫和信息转折，不能连续堆叠制造假高能。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '动作打断',
          purpose: '让标点服务动作打断',
          beat: '管事刚开口，禁库门突然回锁。',
        },
        {
          title: '信息转折',
          purpose: '让标点服务信息转折',
          beat: '旧印编号停在黑塔许可前一位。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [punctuationToneRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(punctuationToneRepair)
    expect(sceneCards[1].prose_craft_directives).toContain(punctuationToneRepair)
    expect(sceneCards[0].style_directives).toContain(punctuationToneRepair)
    expect(sceneCards[1].serial_risk_repairs).toContain('语气标点')
  })
  test('projects style-boundary and sample carry-over into scene style fields', () => {
    const styleBoundaryRepair = '下一章必须补文风边界和风格样本：保留冷静短句和动作后果，但不能复制样本文句、桥段和比喻；叙述视角保持限知。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '冷静短句',
          purpose: '保留冷静短句',
          beat: '李玄松开旧印，没有解释。',
        },
        {
          title: '动作后果',
          purpose: '用动作后果承接风格样本',
          beat: '禁库门又往内退了一寸。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [styleBoundaryRepair],
        },
      },
    })

    expect(sceneCards[0].style_directives).toContain(styleBoundaryRepair)
    expect(sceneCards[1].style_directives).toContain(styleBoundaryRepair)
    expect(sceneCards[0].benchmark_recall_directives).toContain(styleBoundaryRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('文风边界')
    expect(sceneCards[1].serial_risk_repairs).toContain('风格样本')
  })
  test('projects style-sample receipt carry-over into scene sample strategy fields', () => {
    const styleSampleReceiptRepair = '下一章必须复核样章策略回执：style_sample_checks delivered=false，remaining_risk 是叙述节奏、对白比例、角色口吻和情绪转折没有落成正文；本章只学习样章抽象表达策略，不得复制样章桥段、角色名、核心梗或原句。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '节奏改写',
          purpose: '按样章策略调整叙述节奏',
          beat: '李玄先停一息，再把旧印按上缺页。',
        },
        {
          title: '对白比例',
          purpose: '用对白推动情绪转折',
          beat: '林青禾追问来历，李玄只答编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [styleSampleReceiptRepair],
        },
      },
    })

    expect(sceneCards[0].style_directives).toContain(styleSampleReceiptRepair)
    expect(sceneCards[0].benchmark_recall_directives).toContain(styleSampleReceiptRepair)
    expect(sceneCards[0].prose_craft_directives).toContain(styleSampleReceiptRepair)
    expect(sceneCards[1].dialogue_goals).toContain(styleSampleReceiptRepair)
    expect(sceneCards[1].required_beats).toContain(styleSampleReceiptRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(styleSampleReceiptRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('样章策略回执')
    expect(sceneCards[1].serial_risk_repairs).toContain('样章策略回执')
  })
})

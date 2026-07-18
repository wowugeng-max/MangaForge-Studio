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

describe('chapter pre-draft brief sync-core b 1 a', () => {
  test('adds an oh-story genre positioning contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '离婚后系统让我翻盘',
      genre: '都市系统逆袭',
      target_platform: 'fanqie',
      target_audience: '30岁上下、有经济压力、喜欢系统吐槽和生活化逆袭的番茄男频读者',
      synopsis: '中年失业又离婚的主角获得职业成长系统，用生活化技能逐步翻盘。',
      reference_config: {
        writing_bible: {
          golden_finger: '职业成长系统会给出讽刺数据和新手奖励',
          protagonist_identity: '刚离婚的中年维修师',
          commercial_positioning: {
            selling_points: ['中年危机翻盘', '系统评价吐槽', '新手奖励立刻见效'],
            innovation_hook: '维修技能和系统奖励绑定现实订单',
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 2,
        title: '报废边缘',
        summary: '主角收到系统面板，发现自己被评价为报废边缘，随后用新手奖励接下第一单。',
        conflict: '前妻质疑主角没能力翻身，系统用刺眼数据把现实困境摆出来。',
        ending_hook: '系统弹出第一份隐藏装备奖励。',
        scene_cards: [
          {
            scene_no: 1,
            title: '系统面板',
            purpose: '展示系统评价+主角吐槽这个核心笑点。',
            conflict: '系统给出报废边缘评分。',
            reader_payoff: '系统面板讽刺数据让中年危机变成可翻盘目标。',
          },
          {
            scene_no: 2,
            title: '新手奖励',
            purpose: '新手礼包立刻见效。',
            conflict: '主角必须用维修技能证明自己还能接单。',
            reader_payoff: '系统奖励和现实订单绑定。',
            ending_hook_seed: '隐藏装备奖励出现。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 2, title: '报废边缘' },
    )

    expect(brief.genre_positioning_contract.version).toBe('oh_story_genre_positioning_v1')
    expect(brief.genre_positioning_contract.genre_label).toContain('都市系统/逆袭长篇')
    expect(brief.genre_positioning_contract.reader_psychology.join('｜')).toContain('中年危机')
    expect(brief.genre_positioning_contract.genre_formula.join('｜')).toContain('系统面板+新手奖励')
    expect(brief.genre_positioning_contract.core_hook_rules.join('｜')).toContain('核心梗')
    expect(brief.genre_positioning_contract.goldfinger_fit_rules.join('｜')).toContain('生活/职业')
    expect(brief.genre_positioning_contract.micro_innovation_rules.join('｜')).toContain('最多3个')
    expect(brief.genre_positioning_contract.micro_innovation_702010_rules.join('｜')).toContain('70%来自过去经历和记忆')
    expect(brief.genre_positioning_contract.micro_innovation_702010_rules.join('｜')).toContain('20%来自当前生活状态')
    expect(brief.genre_positioning_contract.micro_innovation_702010_rules.join('｜')).toContain('10%来自时事热点话题和趋势')
    expect(brief.genre_positioning_contract.micro_innovation_methods.join('｜')).toContain('精炼法')
    expect(brief.genre_positioning_contract.micro_innovation_methods.join('｜')).toContain('升级法')
    expect(brief.genre_positioning_contract.micro_innovation_methods.join('｜')).toContain('加料法')
    expect(brief.genre_positioning_contract.micro_innovation_methods.join('｜')).toContain('反套路法')
    expect(brief.genre_positioning_contract.micro_innovation_methods.join('｜')).toContain('组合法')
    expect(brief.genre_positioning_contract.longboard_focus_rules.join('｜')).toContain('拉长板而非补短板')
    expect(brief.genre_positioning_contract.longboard_focus_rules.join('｜')).toContain('核心卖点背后的情绪清晰')
    expect(brief.genre_positioning_contract.longboard_focus_rules.join('｜')).toContain('至少 3 个角度')
    expect(brief.genre_positioning_contract.longboard_focus_rules.join('｜')).toContain('题材长板')
    expect(confirmedContext.chapter_target.genre_positioning_contract.quality_checks.join('｜')).toContain('书名简介内容三位一体')
    expect(prompt).toContain('【题材定位合同】')
    expect(prompt).toContain('执行 chapter_target.genre_positioning_contract')
    expect(prompt).toContain('都市系统/逆袭长篇')
    expect(prompt).toContain('系统评价+主角吐槽')
    expect(prompt).toContain('70/20/10元素法则')
    expect(prompt).toContain('五种微创新手法')
    expect(prompt).toContain('拉长板而非补短板')
    expect(prompt).toContain('题材长板')
    expect(prompt).toContain('genre_positioning_checks')
    expect(prompt.indexOf('【题材定位合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('routes oh-story genre writing formulas into the genre positioning contract', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '婚礼当天我收回股份',
      genre: '现代复仇打脸短篇',
      target_platform: 'fanqie',
      target_audience: '喜欢公开审判、证据链打脸和冷静复仇的爽文读者',
      synopsis: '未婚夫在婚礼当天当众背叛，女主冷静收回股份，用监控和合同逐层揭露真相。',
      reference_config: {
        writing_bible: {
          protagonist_identity: '被当众背叛的公司继承人',
          commercial_positioning: {
            selling_points: ['当众背叛开场', '证据链公开审判', '反派求饶后彻底出局'],
            innovation_hook: '婚礼现场变成股权审判场',
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 1,
        title: '婚礼背叛',
        summary: '婚礼现场男方公开偏袒白月光，女主用股权文件当场反击。',
        conflict: '反派以为当众羞辱已经赢了，主角必须用证据夺回主动权。',
        ending_hook: '监控备份开始播放。',
        scene_cards: [
          {
            scene_no: 1,
            title: '当众背叛',
            purpose: '让反派先赢，制造公开羞辱。',
            conflict: '白月光抢走戒指和话筒。',
            reader_payoff: '主角冷静到可怕地拿出第一份证据。',
          },
          {
            scene_no: 2,
            title: '证据开场',
            purpose: '把婚礼现场变成公开审判。',
            conflict: '反派否认证据真实性。',
            reader_payoff: '监控和合同逐层揭露。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-28T10:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 1, title: '婚礼背叛' },
    )

    expect(brief.genre_positioning_contract.genre_formula.join('｜')).toContain('公式一：现代复仇/打脸')
    expect(brief.genre_positioning_contract.genre_formula.join('｜')).toContain('当众背叛 -> 冷静处理 -> 对方反扑 -> 揭示真相 -> 求饶 -> 加冕')
    expect(brief.genre_positioning_contract.genre_formula.join('｜')).toContain('公式二十一：公开审判式打脸')
    expect(brief.genre_positioning_contract.must_have_scenes.join('｜')).toContain('当众羞辱开场')
    expect(brief.genre_positioning_contract.must_have_scenes.join('｜')).toContain('逐层揭露证据')
    expect(brief.genre_positioning_contract.quality_checks.join('｜')).toContain('公式对位')
    expect(brief.genre_positioning_contract.quality_checks.join('｜')).toContain('情绪节拍完整')
    expect(prompt).toContain('公式一：现代复仇/打脸')
    expect(prompt).toContain('公式二十一：公开审判式打脸')
  })
  test('hydrates incomplete explicit genre positioning contract from project and scene context', () => {
    const project = {
      title: '离婚后系统让我翻盘',
      genre: '都市系统逆袭',
      target_audience: '30岁上下、有经济压力、喜欢系统吐槽和生活化逆袭的番茄男频读者',
      synopsis: '中年失业又离婚的主角获得职业成长系统，用生活化技能逐步翻盘。',
      reference_config: {
        writing_bible: {
          golden_finger: '职业成长系统会给出讽刺数据和新手奖励',
          protagonist_identity: '刚离婚的中年维修师',
          commercial_positioning: {
            selling_points: ['中年危机翻盘', '系统评价吐槽', '新手奖励立刻见效'],
            innovation_hook: '维修技能和系统奖励绑定现实订单',
          },
        },
      },
    }
    const contextPackage = {
      genre_positioning_contract: {
        source: 'manual_incomplete',
        genre_label: '手填题材：都市系统逆袭。',
        quality_checks: ['必须确认题材承诺和正文场景一致。'],
      },
      chapter_target: {
        chapter_no: 2,
        title: '报废边缘',
        summary: '主角收到系统面板，发现自己被评价为报废边缘，随后用新手奖励接下第一单。',
        conflict: '前妻质疑主角没能力翻身，系统用刺眼数据把现实困境摆出来。',
        scene_cards: [
          {
            scene_no: 1,
            title: '系统面板',
            purpose: '展示系统评价+主角吐槽这个核心笑点。',
            conflict: '系统给出报废边缘评分。',
            reader_payoff: '系统面板讽刺数据让中年危机变成可翻盘目标。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.genre_positioning_contract.source).toBe('manual_incomplete')
    expect(brief.genre_positioning_contract.genre_label).toBe('手填题材：都市系统逆袭。')
    expect(brief.genre_positioning_contract.quality_checks).toEqual(['必须确认题材承诺和正文场景一致。'])
    expect(brief.genre_positioning_contract.reader_psychology.join('｜')).toContain('中年危机')
    expect(brief.genre_positioning_contract.genre_formula.join('｜')).toContain('系统面板+新手奖励')
    expect(brief.genre_positioning_contract.core_hook_rules.join('｜')).toContain('系统评价+主角吐槽')
    expect(brief.genre_positioning_contract.must_have_scenes.join('｜')).toContain('系统面板')
    expect(brief.genre_positioning_contract.platform_fit_rules.join('｜')).toContain('番茄偏快节奏')
    expect(brief.genre_positioning_contract.longboard_focus_rules.join('｜')).toContain('拉长板而非补短板')
    expect(brief.genre_positioning_contract.micro_innovation_702010_rules.join('｜')).toContain('70%来自过去经历和记忆')
  })
  test('hydrates explicit genre micro innovation methods from camel case input', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '离婚后系统让我翻盘',
        genre: '都市系统逆袭',
        synopsis: '中年失业又离婚的主角获得职业成长系统，用生活化技能逐步翻盘。',
      },
      {
        chapter_target: {
          chapter_no: 2,
          title: '报废边缘',
          summary: '主角收到系统面板，发现自己被评价为报废边缘。',
          genre_positioning_contract: {
            source: 'manual_genre',
            microInnovation702010Rules: ['自定义：70%生活记忆，20%当下压力，10%热搜话题。'],
            microInnovationMethods: ['自定义：只用升级法做订单场景升级。'],
          },
        },
      },
    )

    expect(brief.genre_positioning_contract.source).toBe('manual_genre')
    expect(brief.genre_positioning_contract.micro_innovation_702010_rules).toEqual(['自定义：70%生活记忆，20%当下压力，10%热搜话题。'])
    expect(brief.genre_positioning_contract.micro_innovation_methods).toEqual(['自定义：只用升级法做订单场景升级。'])
    expect(brief.genre_positioning_contract.micro_innovation_rules.join('｜')).toContain('最多3个')
  })
  test('adds an oh-story female audience contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '八零换亲后我靠经商翻盘',
      genre: '年代重生先婚后爱女频',
      target_platform: 'fanqie_girls',
      target_audience: '番茄女生读者，喜欢重生改命、先婚后爱、事业翻盘和早给安全感',
      synopsis: '女主重生回换亲前，选择先婚后爱路线，用经商能力改命并逐步被珍视。',
      reference_config: {
        writing_bible: {
          protagonist_identity: '被换亲的重生女主',
          relationship_core: '先婚后爱，感情升级绑定女主事业节点',
          commercial_positioning: {
            selling_points: ['重生改命', '经商事业线', '先婚后爱安全感'],
            retention_strategy: '前三章给女主主动选择和翻盘方向。',
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 3,
        title: '第一笔订单',
        summary: '女主主动接下供销社订单，用上一世经验避开极品家人的陷阱。',
        conflict: '极品家人逼她交出彩礼，男主家也怀疑她只是临时忍让。',
        ending_hook: '男主第一次发现她提前准备好了退路。',
        scene_cards: [
          {
            scene_no: 1,
            title: '当众拒交',
            purpose: '展示女主主动性和安全感锚点。',
            conflict: '极品亲戚逼她交出钱。',
            reader_payoff: '女主没有继续被虐，而是用订单合同反打。',
          },
          {
            scene_no: 2,
            title: '订单落地',
            purpose: '让事业节点推动感情线升温。',
            conflict: '男主质疑她是不是冲动。',
            reader_payoff: '男主看到她的能力和边界，关系从试探转为尊重。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-23T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 3, title: '第一笔订单' },
    )

    expect(brief.female_audience_contract.version).toBe('oh_story_female_audience_v1')
    expect(brief.female_audience_contract.core_principles.join('｜')).toContain('安全感优先')
    expect(brief.female_audience_contract.core_principles.join('｜')).toContain('代入感优先')
    expect(brief.female_audience_contract.core_principles.join('｜')).toContain('女主主动性')
    expect(brief.female_audience_contract.core_principles.join('｜')).toContain('情绪即产品')
    expect(brief.female_audience_contract.reader_need_rules.join('｜')).toContain('被认可、被珍视、被尊重')
    expect(brief.female_audience_contract.copy_promise_rules.join('｜')).toContain('状态 → 困境 → 行动 → 成功')
    expect(brief.female_audience_contract.copy_promise_rules.join('｜')).toContain('女主成功暗示')
    expect(brief.female_audience_contract.romance_axis_rules.join('｜')).toContain('感情升级最好踩在女主的一次事业进展或成长节点上')
    expect(brief.female_audience_contract.romance_axis_rules.join('｜')).toContain('暧昧→确认→危机→升华')
    expect(brief.female_audience_contract.abuse_dosage_rules.join('｜')).toContain('每段虐后必给反转或糖')
    expect(brief.female_audience_contract.abuse_dosage_rules.join('｜')).toContain('连续整卷只虐')
    expect(brief.female_audience_contract.platform_fit_rules.join('｜')).toContain('番茄女生')
    expect(brief.female_audience_contract.platform_fit_rules.join('｜')).toContain('安全感要早给')
    expect(confirmedContext.chapter_target.female_audience_contract.quality_checks.join('｜')).toContain('货板一致')
    expect(prompt).toContain('【女频长篇合同】')
    expect(prompt).toContain('执行 chapter_target.female_audience_contract')
    expect(prompt).toContain('安全感优先')
    expect(prompt).toContain('女主主动性')
    expect(prompt).toContain('感情线双轴')
    expect(prompt).toContain('female_audience_checks')
    expect(prompt.indexOf('【女频长篇合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('hydrates incomplete explicit female audience contract from project and scene context', () => {
    const project = {
      title: '八零换亲后我靠经商翻盘',
      genre: '年代重生先婚后爱女频',
      target_platform: 'fanqie_girls',
      target_audience: '番茄女生读者，喜欢重生改命、先婚后爱、事业翻盘和早给安全感',
      synopsis: '女主重生回换亲前，选择先婚后爱路线，用经商能力改命并逐步被珍视。',
    }
    const contextPackage = {
      female_audience_contract: {
        source: 'manual_incomplete',
        core_principles: ['手填原则：安全感不能断。'],
        quality_checks: ['必须确认女主不是被安排着赢。'],
      },
      chapter_target: {
        chapter_no: 4,
        title: '第一笔订单',
        summary: '女主主动接下供销社订单，用上一世经验避开极品家人的陷阱。',
        conflict: '极品家人逼她交出彩礼，男主家也怀疑她只是临时忍让。',
        scene_cards: [
          {
            scene_no: 1,
            title: '当众拒交',
            purpose: '展示女主主动性和安全感锚点。',
            conflict: '极品亲戚逼她交出钱。',
            reader_payoff: '女主没有继续被虐，而是用订单合同反打。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.female_audience_contract.source).toBe('manual_incomplete')
    expect(brief.female_audience_contract.core_principles).toEqual(['手填原则：安全感不能断。'])
    expect(brief.female_audience_contract.quality_checks).toEqual(['必须确认女主不是被安排着赢。'])
    expect(brief.female_audience_contract.reader_need_rules.join('｜')).toContain('被认可、被珍视、被尊重')
    expect(brief.female_audience_contract.copy_promise_rules.join('｜')).toContain('女主成功暗示')
    expect(brief.female_audience_contract.romance_axis_rules.join('｜')).toContain('感情升级最好踩在女主的一次事业进展或成长节点上')
    expect(brief.female_audience_contract.platform_fit_rules.join('｜')).toContain('番茄女生')
    expect(brief.female_audience_contract.revision_priorities.join('｜')).toContain('补安全感锚点')
  })
})

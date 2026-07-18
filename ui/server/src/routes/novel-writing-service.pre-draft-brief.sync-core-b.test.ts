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

describe('chapter pre-draft brief sync-core b', () => {
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

  test('uses project-level female audience activation mode before keyword auto detection', () => {
    const disabledProject = {
      title: '换亲以后',
      genre: '年代先婚后爱女频',
      target_audience: '番茄女生读者',
      synopsis: '女主换亲后先婚后爱。',
      reference_config: {
        oh_story_controls: {
          female_audience_mode: 'disabled',
        },
      },
    }
    const neutralContext = {
      chapter_target: {
        chapter_no: 1,
        title: '新婚第一日',
        summary: '新婚第一日出现误会。',
      },
    }

    const disabledBrief = buildChapterPreDraftBrief(disabledProject, neutralContext)
    expect(disabledBrief.female_audience_contract).toBeNull()

    const forcedProject = {
      title: '她在废土修灯塔',
      genre: '末世科幻',
      target_audience: '全向读者',
      synopsis: '女主在废土修复灯塔，带领社区重建。',
      reference_config: {
        oh_story_controls: {
          female_audience_mode: 'enabled',
        },
      },
    }

    const forcedBrief = buildChapterPreDraftBrief(forcedProject, neutralContext)
    expect(forcedBrief.female_audience_contract.version).toBe('oh_story_female_audience_v1')
    expect(forcedBrief.female_audience_contract.activation_mode).toBe('enabled')
    expect(forcedBrief.female_audience_contract.activation_source).toContain('project.reference_config.oh_story_controls.female_audience_mode')
  })

  test('adds an oh-story upgrade rhythm contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '从报废维修师开始逆袭',
      genre: '都市系统升级',
      target_platform: 'fanqie',
      synopsis: '中年维修师绑定职业成长系统，通过订单经验、技能奖励和客户反应逐步翻身。',
      reference_config: {
        writing_bible: {
          golden_finger: '职业成长系统会把维修订单转成经验值、技能熟练度和装备奖励',
          protagonist_identity: '被前妻家看不起的中年维修师',
          commercial_positioning: {
            selling_points: ['维修订单升级', '客户态度反转', '系统奖励即时反馈'],
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 1,
        title: '第一单翻身',
        summary: '主角接下被同行放弃的维修单，用新手技能修好进口设备。',
        conflict: '客户和前妻弟弟都质疑主角只是报废维修师。',
        ending_hook: '系统提示等级提升，并解锁隐藏工具箱。',
        scene_cards: [
          {
            scene_no: 1,
            title: '接单前嘲讽',
            purpose: '铺垫升级前待遇差距。',
            conflict: '客户质疑主角没有资格碰进口设备。',
            reader_payoff: '主角被轻视，读者等他翻身。',
          },
          {
            scene_no: 2,
            title: '系统判定',
            purpose: '让订单经验和技能熟练度形成即时反馈。',
            action_beats: ['拆开旧机', '系统提示熟练度+10', '主角发现隐藏磨损点'],
            reader_payoff: '系统面板反馈立刻改变局面。',
          },
          {
            scene_no: 3,
            title: '交付翻身',
            purpose: '展示升级后的能力差距。',
            reversal: '主角修好同行判断报废的进口设备。',
            reader_payoff: '客户主动加价，前妻弟弟说不出话。',
            ending_hook_seed: '系统解锁隐藏工具箱。',
            state_changes_expected: ['客户主动加价', '系统解锁隐藏工具箱'],
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
      { chapter_no: 3, title: '第一单翻身' },
    )

    expect(brief.upgrade_rhythm_contract.version).toBe('oh_story_upgrade_rhythm_v1')
    expect(brief.upgrade_rhythm_contract.upgrade_gap.join('｜')).toContain('起点')
    expect(brief.upgrade_rhythm_contract.upgrade_gain_plan.join('｜')).toContain('客户主动加价')
    expect(brief.upgrade_rhythm_contract.feedback_loop.join('｜')).toContain('即时反馈')
    expect(brief.upgrade_rhythm_contract.feedback_loop.join('｜')).toContain('延迟反馈')
    expect(brief.upgrade_rhythm_contract.emotion_modules.join('｜')).toContain('装逼')
    expect(brief.upgrade_rhythm_contract.goldfinger_simplicity_rules.join('｜')).toContain('金手指简单是核心')
    expect(brief.upgrade_rhythm_contract.goldfinger_simplicity_rules.join('｜')).toContain('一眼就懂')
    expect(brief.upgrade_rhythm_contract.goldfinger_simplicity_rules.join('｜')).toContain('功能、触发条件、奖励反馈和升级规则')
    expect(brief.upgrade_rhythm_contract.goldfinger_multi_dimension_growth_rules.join('｜')).toContain('金手指提升要有多维度')
    expect(brief.upgrade_rhythm_contract.goldfinger_multi_dimension_growth_rules.join('｜')).toContain('词条、功能、品质')
    expect(brief.upgrade_rhythm_contract.goldfinger_multi_dimension_growth_rules.join('｜')).toContain('条件-反馈模型')
    expect(brief.upgrade_rhythm_contract.goldfinger_conflict_balance_rules.join('｜')).toContain('金手指刚好解决当前矛盾')
    expect(brief.upgrade_rhythm_contract.goldfinger_conflict_balance_rules.join('｜')).toContain('暴露更大矛盾')
    expect(brief.upgrade_rhythm_contract.goldfinger_feedback_rules.join('｜')).toContain('给出金手指后必须有即时变化')
    expect(brief.upgrade_rhythm_contract.goldfinger_feedback_rules.join('｜')).toContain('掺杂在故事里')
    expect(brief.upgrade_rhythm_contract.goldfinger_feedback_rules.join('｜')).toContain('打开困境的钥匙')
    expect(brief.upgrade_rhythm_contract.ranking_ladder_rules.join('｜')).toContain('排行榜提供升级动力')
    expect(brief.upgrade_rhythm_contract.ranking_ladder_rules.join('｜')).toContain('新对手')
    expect(brief.upgrade_rhythm_contract.ranking_ladder_rules.join('｜')).toContain('装逼余震')
    expect(confirmedContext.chapter_target.upgrade_rhythm_contract.quality_checks.join('｜')).toContain('升级后能完成以前做不到的事')
    expect(prompt).toContain('【升级节奏合同】')
    expect(prompt).toContain('执行 chapter_target.upgrade_rhythm_contract')
    expect(prompt).toContain('升级感三步法')
    expect(prompt).toContain('金手指 + 矛盾')
    expect(prompt).toContain('金手指简单是核心')
    expect(prompt).toContain('一眼就懂')
    expect(prompt).toContain('金手指多维成长')
    expect(prompt).toContain('词条、功能、品质')
    expect(prompt).toContain('刚好解决当前矛盾')
    expect(prompt).toContain('金手指反馈法')
    expect(prompt).toContain('把金手指带来变化的过程掺杂在故事里')
    expect(prompt).toContain('排行榜')
    expect(prompt).toContain('新对手')
    expect(prompt).toContain('装逼余震')
    expect(prompt).toContain('即时反馈')
    expect(prompt).toContain('upgrade_rhythm_checks')
    expect(prompt.indexOf('【升级节奏合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit upgrade rhythm contract from project and scene context', () => {
    const project = {
      title: '从报废维修师开始逆袭',
      genre: '都市系统升级',
      synopsis: '中年维修师绑定职业成长系统，通过订单经验、技能奖励和客户反应逐步翻身。',
      reference_config: {
        writing_bible: {
          golden_finger: '职业成长系统会把维修订单转成经验值、技能熟练度和装备奖励',
          protagonist_identity: '被前妻家看不起的中年维修师',
          commercial_positioning: {
            selling_points: ['维修订单升级', '客户态度反转', '系统奖励即时反馈'],
          },
        },
      },
    }
    const contextPackage = {
      upgrade_rhythm_contract: {
        source: 'manual_incomplete',
        quality_checks: ['必须确认升级前缺口和升级后变化都被正文看见。'],
      },
      chapter_target: {
        chapter_no: 3,
        title: '第一单翻身',
        summary: '主角接下被同行放弃的维修单，用新手技能修好进口设备。',
        conflict: '客户和前妻弟弟都质疑主角只是报废维修师。',
        ending_hook: '系统提示等级提升，并解锁隐藏工具箱。',
        scene_cards: [
          {
            scene_no: 1,
            title: '接单前嘲讽',
            purpose: '铺垫升级前待遇差距。',
            conflict: '客户质疑主角没有资格碰进口设备。',
            reader_payoff: '主角被轻视，读者等他翻身。',
          },
          {
            scene_no: 2,
            title: '系统判定',
            purpose: '让订单经验和技能熟练度形成即时反馈。',
            action_beats: ['拆开旧机', '系统提示熟练度+10', '主角发现隐藏磨损点'],
            reader_payoff: '系统面板反馈立刻改变局面。',
          },
          {
            scene_no: 3,
            title: '交付翻身',
            purpose: '展示升级后的能力差距。',
            reversal: '主角修好同行判断报废的进口设备。',
            reader_payoff: '客户主动加价，前妻弟弟说不出话。',
            ending_hook_seed: '系统解锁隐藏工具箱。',
            state_changes_expected: ['客户主动加价', '系统解锁隐藏工具箱'],
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.upgrade_rhythm_contract.source).toBe('manual_incomplete')
    expect(brief.upgrade_rhythm_contract.quality_checks).toEqual(['必须确认升级前缺口和升级后变化都被正文看见。'])
    expect(brief.upgrade_rhythm_contract.upgrade_gap.join('｜')).toContain('被前妻家看不起')
    expect(brief.upgrade_rhythm_contract.upgrade_gap.join('｜')).toContain('客户质疑主角没有资格')
    expect(brief.upgrade_rhythm_contract.upgrade_gain_plan.join('｜')).toContain('客户主动加价')
    expect(brief.upgrade_rhythm_contract.upgrade_gain_plan.join('｜')).toContain('系统解锁隐藏工具箱')
    expect(brief.upgrade_rhythm_contract.feedback_loop.join('｜')).toContain('系统提示熟练度+10')
    expect(brief.upgrade_rhythm_contract.emotion_modules.join('｜')).toContain('装逼')
    expect(brief.upgrade_rhythm_contract.bridge_rhythm.join('｜')).toContain('四章一桥段')
    expect(brief.upgrade_rhythm_contract.goldfinger_simplicity_rules.join('｜')).toContain('金手指简单是核心')
    expect(brief.upgrade_rhythm_contract.goldfinger_simplicity_rules.join('｜')).toContain('一眼就懂')
    expect(brief.upgrade_rhythm_contract.goldfinger_multi_dimension_growth_rules.join('｜')).toContain('金手指提升要有多维度')
    expect(brief.upgrade_rhythm_contract.goldfinger_multi_dimension_growth_rules.join('｜')).toContain('词条、功能、品质')
    expect(brief.upgrade_rhythm_contract.goldfinger_conflict_balance_rules.join('｜')).toContain('金手指太强')
    expect(brief.upgrade_rhythm_contract.goldfinger_feedback_rules.join('｜')).toContain('给出金手指后必须有即时变化')
  })

  test('hydrates explicit upgrade rhythm goldfinger feedback rules from camel case input', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '从报废维修师开始逆袭',
        genre: '都市系统升级',
        synopsis: '中年维修师绑定职业成长系统，通过订单经验、技能奖励和客户反应逐步翻身。',
      },
      {
        chapter_target: {
          chapter_no: 3,
          title: '第一单翻身',
          summary: '主角接下被同行放弃的维修单，用新手技能修好进口设备。',
          conflict: '客户和前妻弟弟都质疑主角只是报废维修师。',
          upgrade_rhythm_contract: {
            source: 'manual_upgrade',
            goldfingerFeedbackRules: ['自定义：系统反馈必须先改变主角手上的维修动作。'],
          },
        },
      },
    )

    expect(brief.upgrade_rhythm_contract.source).toBe('manual_upgrade')
    expect(brief.upgrade_rhythm_contract.goldfinger_feedback_rules).toEqual(['自定义：系统反馈必须先改变主角手上的维修动作。'])
    expect(brief.upgrade_rhythm_contract.feedback_loop.join('｜')).toContain('即时反馈')
  })

  test('adds an oh-story conflict structure contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '旧城订单',
      genre: '都市系统逆袭',
      synopsis: '中年维修师靠职业成长系统接单翻身，但旧城区维修协会持续打压外来维修师。',
      reference_config: {
        writing_bible: {
          golden_finger: '职业成长系统能识别设备隐藏故障并给出技能反馈',
          protagonist_identity: '被维修协会排挤的外来维修师',
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 4,
        title: '协会封单',
        summary: '维修协会用封单规则阻止主角接触旧城设备，主角必须当场证明封单规则有漏洞。',
        conflict: '协会会长不许主角碰设备，客户也担心惹怒协会。',
        ending_hook: '协会会长拿出第二份封单，指向主角刚接的医院设备。',
        scene_cards: [
          {
            scene_no: 1,
            title: '口头封单',
            purpose: '先用言语压迫制造冲突。',
            conflict: '协会会长当众宣布外来维修师不得接旧城订单。',
            reader_payoff: '主角被公开压制，读者等待反证。',
          },
          {
            scene_no: 2,
            title: '设备现场',
            purpose: '冲突升级到行动阻拦。',
            conflict: '协会成员挡住设备间门口，不让主角拆机。',
            action_beats: ['主角绕到旧线路口', '协会成员抢走工具箱', '客户要求立刻给结果'],
            reader_payoff: '主角必须用别人想不到的方法破局。',
          },
          {
            scene_no: 3,
            title: '当场反证',
            purpose: '决定胜负并留下下一冲突。',
            conflict: '会长要求客户签封单确认书。',
            reversal: '主角用系统识别的隐藏故障证明协会规则掩盖事故。',
            reader_payoff: '客户从犹豫变成公开支持主角。',
            ending_hook_seed: '第二份封单指向医院设备。',
            state_changes_expected: ['客户资格从拒绝到认可', '协会会长失去现场主动权'],
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
      { chapter_no: 4, title: '协会封单' },
    )

    expect(brief.conflict_structure_contract.version).toBe('oh_story_conflict_structure_v1')
    expect(brief.conflict_structure_contract.conflict_ladder.join('｜')).toContain('言语->行动->激烈对抗->决定胜负')
    expect(brief.conflict_structure_contract.motivation_sources.join('｜')).toContain('金手指')
    expect(brief.conflict_structure_contract.antagonist_pressure_rules.join('｜')).toContain('压势不压人')
    expect(brief.conflict_structure_contract.protagonist_agency_rules.join('｜')).toContain('做别人不敢做')
    expect(brief.conflict_structure_contract.event_value_changes.join('｜')).toContain('客户资格从拒绝到认可')
    expect(brief.conflict_structure_contract.no_exit_rules.join('｜')).toContain('读者必须相信主角非踏入不可')
    expect(brief.conflict_structure_contract.no_exit_rules.join('｜')).toContain('黏结剂')
    expect(brief.conflict_structure_contract.conflict_web.active_lines.join('｜')).toContain('协会会长当众宣布外来维修师不得接旧城订单')
    expect(brief.conflict_structure_contract.conflict_web.link_rules.join('｜')).toContain('因果')
    expect(brief.conflict_structure_contract.conflict_web.activation_rules.join('｜')).toContain('激活或加深')
    expect(brief.conflict_structure_contract.conflict_network_layers.vertical_conflict).toContain('纵向矛盾')
    expect(brief.conflict_structure_contract.conflict_network_layers.horizontal_conflict).toContain('横向矛盾')
    expect(brief.conflict_structure_contract.conflict_network_layers.cross_conflict).toContain('交叉矛盾')
    expect(brief.conflict_structure_contract.conflict_network_layers.weaving_order.join('｜')).toContain('定地图→定阵营→定角色')
    expect(confirmedContext.chapter_target.conflict_structure_contract.quality_checks.join('｜')).toContain('明确结果')
    expect(prompt).toContain('【冲突结构合同】')
    expect(prompt).toContain('执行 chapter_target.conflict_structure_contract')
    expect(prompt).toContain('有人阻止主角得到他想要的东西')
    expect(prompt).toContain('压势不压人')
    expect(prompt).toContain('有进无出')
    expect(prompt).toContain('非踏入不可')
    expect(prompt).toContain('矛盾网')
    expect(prompt).toContain('纵向矛盾')
    expect(prompt).toContain('横向矛盾')
    expect(prompt).toContain('交叉矛盾')
    expect(prompt).toContain('定地图→定阵营→定角色')
    expect(prompt).toContain('conflict_structure_checks')
    expect(prompt.indexOf('【冲突结构合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit conflict structure contract from scene conflict context', () => {
    const project = {
      title: '旧城订单',
      genre: '都市系统逆袭',
      synopsis: '中年维修师靠职业成长系统接单翻身，但旧城区维修协会持续打压外来维修师。',
      reference_config: {
        writing_bible: {
          golden_finger: '职业成长系统能识别设备隐藏故障并给出技能反馈',
          protagonist_identity: '被维修协会排挤的外来维修师',
        },
      },
    }
    const contextPackage = {
      conflict_structure_contract: {
        source: 'manual_incomplete',
        quality_checks: ['必须确认每个主要场景都有明确阻力和胜负变化。'],
      },
      chapter_target: {
        chapter_no: 4,
        title: '协会封单',
        summary: '维修协会用封单规则阻止主角接触旧城设备，主角必须当场证明封单规则有漏洞。',
        conflict: '协会会长不许主角碰设备，客户也担心惹怒协会。',
        ending_hook: '协会会长拿出第二份封单，指向主角刚接的医院设备。',
        scene_cards: [
          {
            scene_no: 1,
            title: '口头封单',
            purpose: '先用言语压迫制造冲突。',
            conflict: '协会会长当众宣布外来维修师不得接旧城订单。',
            reader_payoff: '主角被公开压制，读者等待反证。',
          },
          {
            scene_no: 2,
            title: '设备现场',
            purpose: '冲突升级到行动阻拦。',
            conflict: '协会成员挡住设备间门口，不让主角拆机。',
            action_beats: ['主角绕到旧线路口', '协会成员抢走工具箱', '客户要求立刻给结果'],
            reader_payoff: '主角必须用别人想不到的方法破局。',
          },
          {
            scene_no: 3,
            title: '当场反证',
            purpose: '决定胜负并留下下一冲突。',
            conflict: '会长要求客户签封单确认书。',
            reversal: '主角用系统识别的隐藏故障证明协会规则掩盖事故。',
            ending_hook_seed: '第二份封单指向医院设备。',
            state_changes_expected: ['客户资格从拒绝到认可', '协会会长失去现场主动权'],
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.conflict_structure_contract.source).toBe('manual_incomplete')
    expect(brief.conflict_structure_contract.quality_checks).toEqual(['必须确认每个主要场景都有明确阻力和胜负变化。'])
    expect(brief.conflict_structure_contract.conflict_ladder.join('｜')).toContain('协会成员挡住设备间门口')
    expect(brief.conflict_structure_contract.motivation_sources.join('｜')).toContain('金手指')
    expect(brief.conflict_structure_contract.motivation_sources.join('｜')).toContain('世界背景')
    expect(brief.conflict_structure_contract.antagonist_pressure_rules.join('｜')).toContain('压势不压人')
    expect(brief.conflict_structure_contract.protagonist_agency_rules.join('｜')).toContain('做别人不敢做')
    expect(brief.conflict_structure_contract.event_value_changes.join('｜')).toContain('客户资格从拒绝到认可')
    expect(brief.conflict_structure_contract.next_conflict_seeds.join('｜')).toContain('第二份封单指向医院设备')
    expect(brief.conflict_structure_contract.no_exit_rules.join('｜')).toContain('读者必须相信主角非踏入不可')
    expect(brief.conflict_structure_contract.conflict_web.active_lines.join('｜')).toContain('协会成员挡住设备间门口')
    expect(brief.conflict_structure_contract.conflict_web.activation_rules.join('｜')).toContain('解决一条矛盾线后')
  })

  test('adds an oh-story story loop contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      synopsis: '超人蛮力被规则限制，必须和理性搭档一起破局。',
      reference_config: {
        writing_bible: {
          golden_finger: '超人级身体能力，但被规则边界限制',
          protagonist_identity: '被卷入规则宿舍的超人学生',
          commercial_positioning: {
            selling_points: ['超人蛮力被规则克制', '每章用信息差破解一条规则'],
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 16,
        title: '第二条规则',
        summary: '主角用上一章的判定边界破解第二条宿舍规则。',
        conflict: '门外学生给出假线索，主角必须判断哪条规则是真的。',
        ending_hook: '广播宣布第三条规则只对超人有效。',
        scene_cards: [
          {
            scene_no: 1,
            title: '假线索',
            purpose: '进入新规则案件。',
            conflict: '门外学生提供的规则和墙上规则矛盾。',
            information_gap: '哪条规则是真的。',
            reader_payoff: '读者看到主角用信息差验证规则。',
          },
          {
            scene_no: 2,
            title: '部分真相',
            purpose: '解出规则判定条件，同时抛出更大谜团。',
            reversal: '真正危险不是开门，而是回应名字。',
            reader_payoff: '部分真相带来新规则谜团。',
            ending_hook_seed: '第三条规则只对超人有效。',
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
      { chapter_no: 16, title: '第二条规则' },
    )

    expect(brief.story_loop_contract.version).toBe('oh_story_story_loop_v1')
    expect(brief.story_loop_contract.loop_formula).toContain('题材 + 金手指 + 主角身份')
    expect(brief.story_loop_contract.core_elements.join('｜')).toContain('规则怪谈')
    expect(brief.story_loop_contract.core_elements.join('｜')).toContain('超人级身体能力')
    expect(brief.story_loop_contract.loop_mode).toContain('案件串循环')
    expect(brief.story_loop_contract.loop_fuel).toContain('信息差')
    expect(brief.story_loop_contract.loop_steps.join('｜')).toContain('案件')
    expect(brief.story_loop_contract.loop_steps.join('｜')).toContain('更大谜团')
    expect(brief.story_loop_contract.map_resource_loop.join('｜')).toContain('资源闭环')
    expect(brief.story_loop_contract.map_transition_rules.join('｜')).toContain('新地图 = 新环境 + 新角色 + 新规则 + 新目标 + 新冲突')
    expect(brief.story_loop_contract.map_transition_rules.join('｜')).toContain('旧地图核心冲突至少阶段性解决')
    expect(brief.story_loop_contract.map_transition_rules.join('｜')).toContain('前5章必须快速建立新的代入感和期待感')
    expect(brief.story_loop_contract.map_transition_rules.join('｜')).toContain('人际关系动了 -> 主角再动')
    expect(brief.story_loop_contract.nested_loop_rules.join('｜')).toContain('小循环 -> 中循环')
    expect(brief.story_loop_contract.nested_loop_rules.join('｜')).toContain('小循环中必须铺垫大循环的期待')
    expect(brief.story_loop_contract.nested_loop_rules.join('｜')).toContain('同一核心卖点的不同角度')
    expect(confirmedContext.chapter_target.story_loop_contract.quality_checks.join('｜')).toContain('循环模式')
    expect(prompt).toContain('【故事循环合同】')
    expect(prompt).toContain('执行 chapter_target.story_loop_contract')
    expect(prompt).toContain('题材 + 金手指 + 主角身份')
    expect(prompt).toContain('换地图承接')
    expect(prompt).toContain('新地图 = 新环境 + 新角色 + 新规则 + 新目标 + 新冲突')
    expect(prompt).toContain('人际关系动了 -> 主角再动')
    expect(prompt).toContain('循环嵌套')
    expect(prompt).toContain('小循环 -> 中循环 -> 大循环')
    expect(prompt).toContain('story_loop_checks')
    expect(prompt.indexOf('【故事循环合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit story loop contract from project and scene context', () => {
    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      synopsis: '超人蛮力被规则限制，必须和理性搭档一起破局。',
      reference_config: {
        writing_bible: {
          golden_finger: '超人级身体能力，但被规则边界限制',
          protagonist_identity: '被卷入规则宿舍的超人学生',
          commercial_positioning: {
            selling_points: ['超人蛮力被规则克制', '每章用信息差破解一条规则'],
          },
        },
      },
    }
    const contextPackage = {
      story_loop_contract: {
        source: 'manual_incomplete',
        quality_checks: ['必须确认本章推进一次可持续循环。'],
      },
      chapter_target: {
        chapter_no: 16,
        title: '第二条规则',
        summary: '主角用上一章的判定边界破解第二条宿舍规则。',
        conflict: '门外学生给出假线索，主角必须判断哪条规则是真的。',
        ending_hook: '广播宣布第三条规则只对超人有效。',
        scene_cards: [
          {
            scene_no: 1,
            title: '假线索',
            purpose: '进入新规则案件。',
            conflict: '门外学生提供的规则和墙上规则矛盾。',
            information_gap: '哪条规则是真的。',
            reader_payoff: '读者看到主角用信息差验证规则。',
          },
          {
            scene_no: 2,
            title: '部分真相',
            purpose: '解出规则判定条件，同时抛出更大谜团。',
            reversal: '真正危险不是开门，而是回应名字。',
            reader_payoff: '部分真相带来新规则谜团。',
            ending_hook_seed: '第三条规则只对超人有效。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.story_loop_contract.source).toBe('manual_incomplete')
    expect(brief.story_loop_contract.quality_checks).toEqual(['必须确认本章推进一次可持续循环。'])
    expect(brief.story_loop_contract.core_elements.join('｜')).toContain('规则怪谈')
    expect(brief.story_loop_contract.core_elements.join('｜')).toContain('超人级身体能力')
    expect(brief.story_loop_contract.loop_mode).toContain('案件串循环')
    expect(brief.story_loop_contract.loop_fuel).toContain('信息差')
    expect(brief.story_loop_contract.loop_steps.join('｜')).toContain('哪条规则是真的')
    expect(brief.story_loop_contract.loop_steps.join('｜')).toContain('第三条规则只对超人有效')
    expect(brief.story_loop_contract.map_resource_loop.join('｜')).toContain('资源闭环')
    expect(brief.story_loop_contract.escalation_rules.join('｜')).toContain('地位升高')
    expect(brief.story_loop_contract.nested_loop_rules.join('｜')).toContain('小循环 -> 中循环')
    expect(brief.story_loop_contract.nested_loop_rules.join('｜')).toContain('小循环中必须铺垫大循环的期待')
  })

  test('adds an oh-story emotional arc contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '当众反证',
      genre: '都市逆袭',
      synopsis: '主角被诬告后在公开场合逐步反证，完成打脸翻盘。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 17,
        title: '审判庭反证',
        summary: '主角在公开审判庭从被诬告到拿出证据完成反证。',
        conflict: '对手当众羞辱并逼主角认罪，主角必须忍住压力等待证据。',
        emotional_curve: '压迫 -> 代价加速 -> 反证释放 -> 爽感',
        ending_hook: '真正的幕后证人从屏风后走出。',
        scene_cards: [
          {
            scene_no: 1,
            title: '公开羞辱',
            purpose: '把私下诬告升级到公开审判。',
            conflict: '长老逼主角认罪。',
            emotional_tone: '压迫和不该如此',
            reader_payoff: '读者替主角憋着等反击。',
          },
          {
            scene_no: 2,
            title: '证据反打',
            purpose: '用账本印记完成反证。',
            reversal: '账本反而证明对手调包。',
            emotional_tone: '释放和爽感',
            reader_payoff: '当众打脸，旁观者态度转变。',
            ending_hook_seed: '幕后证人出现。',
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
      { chapter_no: 17, title: '审判庭反证' },
    )

    expect(brief.emotional_arc_contract.version).toBe('oh_story_emotional_arc_v1')
    expect(brief.emotional_arc_contract.emotion_formula).toContain('平静 -> 调动 -> 释放 -> 爽')
    expect(brief.emotional_arc_contract.arc_shape).toContain('递进形')
    expect(brief.emotional_arc_contract.pressure_methods.join('｜')).toContain('公开升级')
    expect(brief.emotional_arc_contract.payoff_types.join('｜')).toContain('态度转变')
    expect(brief.emotional_arc_contract.payoff_reverse_design.design_order.join('｜')).toContain('先确定用什么方式让读者满足')
    expect(brief.emotional_arc_contract.payoff_reverse_design.design_order.join('｜')).toContain('再设计如何拉起期待')
    expect(brief.emotional_arc_contract.payoff_reverse_design.design_order.join('｜')).toContain('最后设计如何铺垫')
    expect(brief.emotional_arc_contract.payoff_tier_rules.join('｜')).toContain('核心爽点')
    expect(brief.emotional_arc_contract.payoff_tier_rules.join('｜')).toContain('偏离爽点')
    expect(brief.emotional_arc_contract.payoff_density_rules.join('｜')).toContain('不要拉长单个爽点')
    expect(brief.emotional_arc_contract.payoff_density_rules.join('｜')).toContain('多想几个爽点')
    expect(brief.emotional_arc_contract.emotion_module_recomposition_rules.join('｜')).toContain('戏剧性会磨损')
    expect(brief.emotional_arc_contract.emotion_module_recomposition_rules.join('｜')).toContain('情绪不会磨损')
    expect(brief.emotional_arc_contract.emotion_module_recomposition_rules.join('｜')).toContain('换场景')
    expect(brief.emotional_arc_contract.emotion_module_recomposition_rules.join('｜')).toContain('换对手')
    expect(brief.emotional_arc_contract.emotion_module_recomposition_rules.join('｜')).toContain('加新情绪')
    expect(brief.emotional_arc_contract.payoff_escalation_rules.join('｜')).toContain('影响范围')
    expect(brief.emotional_arc_contract.payoff_escalation_rules.join('｜')).toContain('揭示深度')
    expect(brief.emotional_arc_contract.payoff_escalation_rules.join('｜')).toContain('身份落差')
    expect(brief.emotional_arc_contract.expectation_rules.join('｜')).toContain('断期待禁止')
    expect(brief.emotional_arc_contract.bonding_setup_rules.join('｜')).toContain('具体物件')
    expect(brief.emotional_arc_contract.bonding_setup_rules.join('｜')).toContain('具体数字')
    expect(brief.emotional_arc_contract.emotional_tear_rules.join('｜')).toContain('反差法')
    expect(brief.emotional_arc_contract.emotional_tear_rules.join('｜')).toContain('错位法')
    expect(brief.emotional_arc_contract.emotional_tear_rules.join('｜')).toContain('延迟真相法')
    expect(brief.emotional_arc_contract.lingering_aftertaste_rules.join('｜')).toContain('安静细节')
    expect(brief.emotional_arc_contract.emotional_turning_rules.join('｜')).toContain('每 3-5 个小节')
    expect(brief.emotional_arc_contract.first_impression_rules.join('｜')).toContain('先入为主')
    expect(brief.emotional_arc_contract.first_impression_rules.join('｜')).toContain('前100字')
    expect(brief.emotional_arc_contract.first_impression_rules.join('｜')).toContain('否定提前')
    expect(brief.emotional_arc_contract.peak_end_rules.join('｜')).toContain('峰终定律')
    expect(brief.emotional_arc_contract.peak_end_rules.join('｜')).toContain('结尾情绪必须高于起点')
    expect(brief.emotional_arc_contract.peak_end_rules.join('｜')).toContain('爽≥7')
    expect(brief.emotional_arc_contract.emotion_layer_rules.join('｜')).toContain('角色自己的情绪')
    expect(brief.emotional_arc_contract.emotion_layer_rules.join('｜')).toContain('文本传递的情绪')
    expect(brief.emotional_arc_contract.emotion_layer_rules.join('｜')).toContain('读者实际感受')
    expect(brief.emotional_arc_contract.emotion_layer_rules.join('｜')).toContain('角色在哭')
    expect(brief.emotional_arc_contract.emotion_layer_rules.join('｜')).toContain('读者在爽')
    expect(brief.emotional_arc_contract.reaction_structure_rules.join('｜')).toContain('前反应')
    expect(brief.emotional_arc_contract.reaction_structure_rules.join('｜')).toContain('复现')
    expect(brief.emotional_arc_contract.reaction_structure_rules.join('｜')).toContain('后反应')
    expect(brief.emotional_arc_contract.reaction_structure_rules.join('｜')).toContain('以小搏大')
    expect(brief.emotional_arc_contract.reaction_structure_rules.join('｜')).toContain('士气如虹')
    expect(brief.emotional_arc_contract.ideological_conflict_rules.join('｜')).toContain('理念之争')
    expect(brief.emotional_arc_contract.ideological_conflict_rules.join('｜')).toContain('利益之争')
    expect(brief.emotional_arc_contract.ideological_conflict_rules.join('｜')).toContain('理念认同')
    expect(brief.emotional_arc_contract.ideological_conflict_rules.join('｜')).toContain('人设认同')
    expect(brief.emotional_arc_contract.ideological_conflict_rules.join('｜')).toContain('追求和牺牲')
    expect(brief.emotional_arc_contract.failure_mode_guards.join('｜')).toContain('假虐')
    expect(brief.emotional_arc_contract.progressive_confrontation_rules.join('｜')).toContain('角力而非碾压')
    expect(brief.emotional_arc_contract.progressive_confrontation_rules.join('｜')).toContain('最后主角王炸')
    expect(brief.emotional_arc_contract.meme_plot_formula_rules.join('｜')).toContain('发生 -> 发展 -> 转折 -> 高潮')
    expect(brief.emotional_arc_contract.reader_desire_formula_rules.join('｜')).toContain('生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿')
    expect(brief.emotional_arc_contract.emotional_rhythm_curve_rules.join('｜')).toContain('温暖 -> 残忍 -> 善意 -> 真相')
    expect(brief.emotional_arc_contract.emotional_rhythm_curve_rules.join('｜')).toContain('不是所有故事都走完整曲线')
    expect(brief.emotional_arc_contract.genre_emotion_strategy_rules.join('｜')).toContain('世情/爽文')
    expect(brief.emotional_arc_contract.genre_emotion_strategy_rules.join('｜')).toContain('情感/虐心')
    expect(brief.emotional_arc_contract.genre_emotion_strategy_rules.join('｜')).toContain('古言/复仇')
    expect(brief.emotional_arc_contract.genre_emotion_strategy_rules.join('｜')).toContain('悬疑/推理')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('调动')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('先入为主')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('峰终定律')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('三层情绪')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('前反应')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('读者欲望四步公式')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('题材情感策略')
    expect(prompt).toContain('【情绪弧合同】')
    expect(prompt).toContain('执行 chapter_target.emotional_arc_contract')
    expect(prompt).toContain('情绪三板斧')
    expect(prompt).toContain('羁绊铺设')
    expect(prompt).toContain('情感撕裂')
    expect(prompt).toContain('余韵钝痛')
    expect(prompt).toContain('每 3-5 个小节')
    expect(prompt).toContain('平静 -> 调动 -> 释放 -> 爽')
    expect(prompt).toContain('爽点倒推法')
    expect(prompt).toContain('先确定用什么方式让读者满足')
    expect(prompt).toContain('装逼层级')
    expect(prompt).toContain('核心爽点')
    expect(prompt).toContain('偏离爽点')
    expect(prompt).toContain('多爽点密度')
    expect(prompt).toContain('不要拉长单个爽点')
    expect(prompt).toContain('情绪模块重组')
    expect(prompt).toContain('戏剧性会磨损')
    expect(prompt).toContain('情绪不会磨损')
    expect(prompt).toContain('换场景')
    expect(prompt).toContain('换对手')
    expect(prompt).toContain('加新情绪')
    expect(prompt).toContain('爽点递增对比')
    expect(prompt).toContain('先入为主')
    expect(prompt).toContain('峰终定律')
    expect(prompt).toContain('结尾情绪强度')
    expect(prompt).toContain('三层情绪')
    expect(prompt).toContain('读者实际感受')
    expect(prompt).toContain('角色在哭')
    expect(prompt).toContain('前反应')
    expect(prompt).toContain('复现')
    expect(prompt).toContain('后反应')
    expect(prompt).toContain('以小搏大')
    expect(prompt).toContain('理念矛盾')
    expect(prompt).toContain('理念之争')
    expect(prompt).toContain('追求和牺牲')
    expect(prompt).toContain('递进对抗')
    expect(prompt).toContain('角力而非碾压')
    expect(prompt).toContain('梗四段式')
    expect(prompt).toContain('发生 -> 发展 -> 转折 -> 高潮')
    expect(prompt).toContain('读者欲望四步公式')
    expect(prompt).toContain('生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿')
    expect(prompt).toContain('情绪拉扯曲线')
    expect(prompt).toContain('温暖 -> 残忍 -> 善意 -> 真相 -> 原谅 -> 来不及 -> 释然 -> 细节暴击')
    expect(prompt).toContain('题材情感策略')
    expect(prompt).toContain('世情/爽文')
    expect(prompt).toContain('情感/虐心')
    expect(prompt).toContain('古言/复仇')
    expect(prompt).toContain('悬疑/推理')
    expect(prompt).toContain('年代/亲情')
    expect(prompt).toContain('emotional_arc_checks')
    expect(prompt.indexOf('【情绪弧合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit emotional arc contract from scene emotion context', () => {
    const project = {
      title: '当众反证',
      genre: '都市逆袭',
      synopsis: '主角被诬告后在公开场合逐步反证，完成打脸翻盘。',
    }
    const contextPackage = {
      emotional_arc_contract: {
        source: 'manual_incomplete',
        quality_checks: ['必须确认调动、释放和爽感都有正文证据。'],
      },
      chapter_target: {
        chapter_no: 17,
        title: '审判庭反证',
        summary: '主角在公开审判庭从被诬告到拿出证据完成反证。',
        conflict: '对手当众羞辱并逼主角认罪，主角必须忍住压力等待证据。',
        emotional_curve: '压迫 -> 代价加速 -> 反证释放 -> 爽感',
        ending_hook: '真正的幕后证人从屏风后走出。',
        scene_cards: [
          {
            scene_no: 1,
            title: '公开羞辱',
            purpose: '把私下诬告升级到公开审判。',
            conflict: '长老逼主角认罪。',
            emotional_tone: '压迫和不该如此',
            reader_payoff: '读者替主角憋着等反击。',
          },
          {
            scene_no: 2,
            title: '证据反打',
            purpose: '用账本印记完成反证。',
            reversal: '账本反而证明对手调包。',
            emotional_tone: '释放和爽感',
            reader_payoff: '当众打脸，旁观者态度转变。',
            ending_hook_seed: '幕后证人出现。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.emotional_arc_contract.source).toBe('manual_incomplete')
    expect(brief.emotional_arc_contract.quality_checks).toEqual(['必须确认调动、释放和爽感都有正文证据。'])
    expect(brief.emotional_arc_contract.arc_shape).toContain('递进形')
    expect(brief.emotional_arc_contract.scene_emotion_steps.join('｜')).toContain('压迫和不该如此')
    expect(brief.emotional_arc_contract.scene_emotion_steps.join('｜')).toContain('释放和爽感')
    expect(brief.emotional_arc_contract.pressure_methods.join('｜')).toContain('公开升级')
    expect(brief.emotional_arc_contract.payoff_types.join('｜')).toContain('态度转变')
    expect(brief.emotional_arc_contract.payoff_escalation_rules.join('｜')).toContain('影响范围')
    expect(brief.emotional_arc_contract.expectation_rules.join('｜')).toContain('断期待禁止')
    expect(brief.emotional_arc_contract.safety_rules.join('｜')).toContain('下行情节')
    expect(brief.emotional_arc_contract.bonding_setup_rules.join('｜')).toContain('具体物件')
    expect(brief.emotional_arc_contract.emotional_tear_rules.join('｜')).toContain('延迟真相法')
    expect(brief.emotional_arc_contract.lingering_aftertaste_rules.join('｜')).toContain('安静细节')
    expect(brief.emotional_arc_contract.first_impression_rules.join('｜')).toContain('先入为主')
    expect(brief.emotional_arc_contract.peak_end_rules.join('｜')).toContain('峰终定律')
    expect(brief.emotional_arc_contract.emotion_layer_rules.join('｜')).toContain('读者实际感受')
    expect(brief.emotional_arc_contract.reaction_structure_rules.join('｜')).toContain('前反应')
    expect(brief.emotional_arc_contract.ideological_conflict_rules.join('｜')).toContain('理念之争')
  })

  test('preserves explicit camelCase emotional arc first-impression peak-end emotion-layer and ideology rules', () => {
    const project = {
      title: '当众反证',
      genre: '都市逆袭',
      synopsis: '主角被诬告后在公开场合逐步反证，完成打脸翻盘。',
    }
    const contextPackage = {
      emotionalArcContract: {
        source: 'manual_complete',
        firstImpressionRules: ['自定义先入为主：前100字先给核心矛盾。'],
        peakEndRules: ['自定义峰终定律：结尾情绪必须高于起点。'],
        emotionLayerRules: ['自定义三层情绪：角色情绪屈辱，文本传递隐忍，读者实际感受爽前蓄力。'],
        reactionStructureRules: ['自定义前反应-复现-后反应：先预知坏结果，再复现冲击，最后让主角振作。'],
        ideologicalConflictRules: ['自定义理念矛盾：把公平和权威的冲突写成主角与对手的原则碰撞。'],
      },
      chapter_target: {
        chapter_no: 17,
        title: '审判庭反证',
        summary: '主角在公开审判庭从被诬告到拿出证据完成反证。',
        conflict: '对手当众羞辱并逼主角认罪。',
        emotional_curve: '压迫 -> 反证释放 -> 爽感',
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.emotional_arc_contract.source).toBe('manual_complete')
    expect(brief.emotional_arc_contract.first_impression_rules).toEqual(['自定义先入为主：前100字先给核心矛盾。'])
    expect(brief.emotional_arc_contract.peak_end_rules).toEqual(['自定义峰终定律：结尾情绪必须高于起点。'])
    expect(brief.emotional_arc_contract.emotion_layer_rules).toEqual(['自定义三层情绪：角色情绪屈辱，文本传递隐忍，读者实际感受爽前蓄力。'])
    expect(brief.emotional_arc_contract.reaction_structure_rules).toEqual(['自定义前反应-复现-后反应：先预知坏结果，再复现冲击，最后让主角振作。'])
    expect(brief.emotional_arc_contract.ideological_conflict_rules).toEqual(['自定义理念矛盾：把公平和权威的冲突写成主角与对手的原则碰撞。'])
  })

  test('asks prose self review to enforce oh-story emotional three-blade methods', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )

    expect(reviewPrompt).toContain('情绪三板斧')
    expect(reviewPrompt).toContain('羁绊铺设')
    expect(reviewPrompt).toContain('具体物件')
    expect(reviewPrompt).toContain('具体数字')
    expect(reviewPrompt).toContain('重复动作')
    expect(reviewPrompt).toContain('情感撕裂')
    expect(reviewPrompt).toContain('反差法')
    expect(reviewPrompt).toContain('错位法')
    expect(reviewPrompt).toContain('延迟真相法')
    expect(reviewPrompt).toContain('余韵钝痛')
    expect(reviewPrompt).toContain('安静细节')
    expect(reviewPrompt).toContain('每 3-5 个小节')
    expect(reviewPrompt).toContain('太平/太赶/假虐/割裂/烂尾/人设崩')
    expect(reviewPrompt).toContain('emotional_arc_checks')
  })

  test('adds an oh-story chapter hook contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      synopsis: '超人蛮力被规则限制，必须用信息差破解宿舍规则。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 2,
        title: '第二条规则',
        summary: '主角用倒计时压迫进入第二条规则。',
        conflict: '十点前必须判断门外学生是否是诱饵。',
        ending_hook: '广播宣布第三条规则只对超人有效。',
        scene_cards: [
          {
            scene_no: 1,
            title: '十点倒计时',
            purpose: '开篇建立紧迫感。',
            conflict: '钟声只剩三分钟。',
            opening_hook: '距离宿舍熄灯还有三分钟。',
            information_gap: '门外学生到底是不是违规者。',
          },
          {
            scene_no: 2,
            title: '广播揭示',
            purpose: '章尾抛出改变规则的新信息。',
            reader_payoff: '主角验证第二条规则边界。',
            ending_hook_seed: '第三条规则只对超人有效。',
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
      { chapter_no: 2, title: '第二条规则' },
    )

    expect(brief.chapter_hook_contract.version).toBe('oh_story_chapter_hook_v1')
    expect(brief.chapter_hook_contract.opening_hook_type).toContain('倒计时开局')
    expect(brief.chapter_hook_contract.ending_hook_type).toContain('突然揭示')
    expect(brief.chapter_hook_contract.hook_strength).toContain('强')
    expect(brief.chapter_hook_contract.opening_hook_rules.join('｜')).toContain('章首 7 式')
    expect(brief.chapter_hook_contract.ending_hook_rules.join('｜')).toContain('章尾 13 式')
    expect(brief.chapter_hook_contract.forbidden_patterns.join('｜')).toContain('假悬念')
    expect(confirmedContext.chapter_target.chapter_hook_contract.quality_checks.join('｜')).toContain('前 100 字')
    expect(prompt).toContain('【章级钩子合同】')
    expect(prompt).toContain('执行 chapter_target.chapter_hook_contract')
    expect(prompt).toContain('章首 7 式')
    expect(prompt).toContain('章尾 13 式')
    expect(prompt).toContain('chapter_hook_checks')
    expect(prompt.indexOf('【章级钩子合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit chapter hook contract from scene hooks', () => {
    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      synopsis: '超人蛮力被规则限制，必须用信息差破解宿舍规则。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 2,
        title: '第二条规则',
        summary: '主角用倒计时压迫进入第二条规则。',
        conflict: '十点前必须判断门外学生是否是诱饵。',
        ending_hook: '广播宣布第三条规则只对超人有效。',
        chapter_hook_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认章首和章尾钩子都由现场触发。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '十点倒计时',
            purpose: '开篇建立紧迫感。',
            conflict: '钟声只剩三分钟。',
            opening_hook: '距离宿舍熄灯还有三分钟。',
          },
          {
            scene_no: 2,
            title: '广播揭示',
            purpose: '章尾抛出改变规则的新信息。',
            reader_payoff: '主角验证第二条规则边界。',
            ending_hook_seed: '第三条规则只对超人有效。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.chapter_hook_contract.source).toBe('manual_incomplete')
    expect(brief.chapter_hook_contract.quality_checks).toEqual(['必须确认章首和章尾钩子都由现场触发。'])
    expect(brief.chapter_hook_contract.opening_hook_type).toContain('倒计时开局')
    expect(brief.chapter_hook_contract.ending_hook_type).toContain('突然揭示')
    expect(brief.chapter_hook_contract.hook_strength).toContain('强')
    expect(brief.chapter_hook_contract.opening_hook_rules.join('｜')).toContain('章首 7 式')
    expect(brief.chapter_hook_contract.ending_hook_rules.join('｜')).toContain('章尾 13 式')
    expect(brief.chapter_hook_contract.forbidden_patterns.join('｜')).toContain('假悬念')
  })

  test('adds an oh-story paragraph hook contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '当众反证',
      genre: '都市逆袭',
      synopsis: '主角在公开审判庭藏住证据，等对手得意后完成反打。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '账本反打',
        summary: '主角用暗牌等对手得意，再拿出账本完成打脸。',
        conflict: '对手当众逼主角认罪，旁观者都以为主角无证可辩。',
        ending_hook: '第二个证人从屏风后走出。',
        scene_cards: [
          {
            scene_no: 1,
            title: '审判庭压迫',
            purpose: '让读者知道主角藏着账本暗牌。',
            conflict: '对手要求立刻认罪。',
            information_gap: '主角是否还有证据。',
            emotional_tone: '压迫',
          },
          {
            scene_no: 2,
            title: '暗牌打脸',
            purpose: '主角拿出账本，围观者分层震惊。',
            reversal: '账本证明对手调包。',
            reader_payoff: '暗牌 + 打脸，审判庭态度转变。',
            characters_present: ['江辰', '周薄森', '长老', '旁观弟子'],
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
      { chapter_no: 18, title: '账本反打' },
    )

    expect(brief.paragraph_hook_contract.version).toBe('oh_story_paragraph_hook_v1')
    expect(brief.paragraph_hook_contract.micro_hook_types.join('｜')).toContain('暗牌')
    expect(brief.paragraph_hook_contract.micro_hook_types.join('｜')).toContain('打脸')
    expect(brief.paragraph_hook_contract.hook_combinations.join('｜')).toContain('暗牌 + 打脸')
    expect(brief.paragraph_hook_contract.dialogue_escalation.join('｜')).toContain('对话情绪五级递增')
    expect(brief.paragraph_hook_contract.spectator_layers.join('｜')).toContain('高质量')
    expect(confirmedContext.chapter_target.paragraph_hook_contract.quality_checks.join('｜')).toContain('段落级钩子')
    expect(prompt).toContain('【段落级钩子合同】')
    expect(prompt).toContain('执行 chapter_target.paragraph_hook_contract')
    expect(prompt).toContain('段落级钩子 11 种')
    expect(prompt).toContain('围观者质量层级')
    expect(prompt).toContain('paragraph_hook_checks')
    expect(prompt.indexOf('【段落级钩子合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit paragraph hook contract from scene hook context', () => {
    const project = {
      title: '当众反证',
      genre: '都市逆袭',
      synopsis: '主角在公开审判庭藏住证据，等对手得意后完成反打。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '账本反打',
        summary: '主角用暗牌等对手得意，再拿出账本完成打脸。',
        conflict: '对手当众逼主角认罪，旁观者都以为主角无证可辩。',
        ending_hook: '第二个证人从屏风后走出。',
        paragraph_hook_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认关键段落有信息、风险或关系变化。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '审判庭压迫',
            purpose: '让读者知道主角藏着账本暗牌。',
            conflict: '对手要求立刻认罪。',
            information_gap: '主角是否还有证据。',
          },
          {
            scene_no: 2,
            title: '暗牌打脸',
            purpose: '主角拿出账本，围观者分层震惊。',
            reversal: '账本证明对手调包。',
            reader_payoff: '暗牌 + 打脸，审判庭态度转变。',
            characters_present: ['江辰', '周薄森', '长老', '旁观弟子'],
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.paragraph_hook_contract.source).toBe('manual_incomplete')
    expect(brief.paragraph_hook_contract.quality_checks).toEqual(['必须确认关键段落有信息、风险或关系变化。'])
    expect(brief.paragraph_hook_contract.micro_hook_types.join('｜')).toContain('暗牌')
    expect(brief.paragraph_hook_contract.micro_hook_types.join('｜')).toContain('打脸')
    expect(brief.paragraph_hook_contract.micro_hook_types).not.toContain('代价')
    expect(brief.paragraph_hook_contract.micro_hook_types).not.toContain('冷发现')
    expect(brief.paragraph_hook_contract.hook_combinations.join('｜')).toContain('暗牌 + 打脸')
    expect(brief.paragraph_hook_contract.dialogue_escalation.join('｜')).toContain('对话情绪五级递增')
    expect(brief.paragraph_hook_contract.spectator_layers.join('｜')).toContain('高质量')
  })

  test('adds an oh-story suspense orchestration contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '午夜规则簿',
      genre: '规则怪谈',
      synopsis: '主角在倒计时里发现规则簿缺页，读者知道钟声逼近但角色还不知道真相。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 7,
        title: '缺页钟声',
        summary: '主角提出规则簿缺页疑问，追查时收到真假提示，章末发现缺页对应今晚零点。',
        conflict: '宿舍成员争论是否立刻公开缺页，广播倒计时不断逼近。',
        ending_hook: '零点钟声响起，缺页背面浮出第二行字。',
        scene_cards: [
          {
            scene_no: 1,
            title: '缺页',
            purpose: '提出规则簿缺页疑问。',
            information_gap: '缺页到底藏着什么规则。',
            opening_hook: '规则簿第七页被撕掉。',
          },
          {
            scene_no: 2,
            title: '假提示',
            purpose: '让角色以为缺页只是旧规则。',
            reversal: '广播倒计时证明这是假提示。',
            reader_payoff: '读者知道零点前必须找到答案。',
          },
          {
            scene_no: 3,
            title: '零点',
            purpose: '公布答案同时开启下一层期待。',
            ending_hook_seed: '缺页背面浮出第二行字。',
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
      { chapter_no: 7, title: '缺页钟声' },
    )

    expect(brief.suspense_contract.version).toBe('oh_story_suspense_v1')
    expect(brief.suspense_contract.information_order_templates.join('｜')).toContain('意外剧情')
    expect(brief.suspense_contract.suspense_strength).toContain('中悬念')
    expect(brief.suspense_contract.expectation_layers.join('｜')).toContain('两长一短')
    expect(brief.suspense_contract.multi_line_suspense_rules.join('｜')).toContain('任何时刻至少两条悬念线运行')
    expect(brief.suspense_contract.reader_preknowledge_rules.join('｜')).toContain('读者知道但主角不知道')
    expect(brief.suspense_contract.information_gap_rules.join('｜')).toContain('读者知道')
    expect(brief.suspense_contract.trump_card_preposition_rules.join('｜')).toContain('底牌 + 即将发生的冲突')
    expect(brief.suspense_contract.foreshadowing_boundary_rules.join('｜')).toContain('谜语人是故意不说明')
    expect(brief.suspense_contract.foreshadowing_boundary_rules.join('｜')).toContain('信息延迟超过3章')
    expect(brief.suspense_contract.shock_layers.join('｜')).toContain('深度震惊')
    expect(confirmedContext.chapter_target.suspense_contract.quality_checks.join('｜')).toContain('悬念等级')
    expect(prompt).toContain('【悬念编排合同】')
    expect(prompt).toContain('执行 chapter_target.suspense_contract')
    expect(prompt).toContain('四种悬念信息顺序模板')
    expect(prompt).toContain('悬念强度5级')
    expect(prompt).toContain('读者预知法')
    expect(prompt).toContain('底牌前置法')
    expect(prompt).toContain('多线悬念')
    expect(prompt).toContain('伏笔不是谜语人')
    expect(prompt).toContain('信息延迟超过3章')
    expect(prompt).toContain('suspense_checks')
    expect(prompt.indexOf('【悬念编排合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit suspense contract from scene suspense context', () => {
    const project = {
      title: '午夜规则簿',
      genre: '规则怪谈',
      synopsis: '主角在倒计时里发现规则簿缺页，读者知道钟声逼近但角色还不知道真相。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 7,
        title: '缺页钟声',
        summary: '主角提出规则簿缺页疑问，追查时收到真假提示，章末发现缺页对应今晚零点。',
        conflict: '宿舍成员争论是否立刻公开缺页，广播倒计时不断逼近。',
        ending_hook: '零点钟声响起，缺页背面浮出第二行字。',
        suspense_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认疑问、误导、答案和新期待都有正文证据。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '缺页',
            purpose: '提出规则簿缺页疑问。',
            information_gap: '缺页到底藏着什么规则。',
            opening_hook: '规则簿第七页被撕掉。',
          },
          {
            scene_no: 2,
            title: '假提示',
            purpose: '让角色以为缺页只是旧规则。',
            reversal: '广播倒计时证明这是假提示。',
            reader_payoff: '读者知道零点前必须找到答案。',
          },
          {
            scene_no: 3,
            title: '零点',
            purpose: '公布答案同时开启下一层期待。',
            ending_hook_seed: '缺页背面浮出第二行字。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.suspense_contract.source).toBe('manual_incomplete')
    expect(brief.suspense_contract.quality_checks).toEqual(['必须确认疑问、误导、答案和新期待都有正文证据。'])
    expect(brief.suspense_contract.information_order_templates.join('｜')).toContain('意外剧情')
    expect(brief.suspense_contract.suspense_strength).toContain('中悬念')
    expect(brief.suspense_contract.suspense_cycle.join('｜')).toContain('缺页到底藏着什么规则')
    expect(brief.suspense_contract.suspense_cycle.join('｜')).toContain('假提示')
    expect(brief.suspense_contract.suspense_cycle.join('｜')).toContain('第二行字')
    expect(brief.suspense_contract.expectation_layers.join('｜')).toContain('两长一短')
    expect(brief.suspense_contract.multi_line_suspense_rules.join('｜')).toContain('短弧2-3章')
    expect(brief.suspense_contract.reader_preknowledge_rules.join('｜')).toContain('读者知道但主角不知道')
    expect(brief.suspense_contract.information_gap_rules.join('｜')).toContain('信息差抹平时')
    expect(brief.suspense_contract.trump_card_preposition_rules.join('｜')).toContain('先展示主角底牌')
    expect(brief.suspense_contract.shock_layers.join('｜')).toContain('深度震惊')
  })

  test('preserves explicit suspense information-gap rules from camelCase contract', () => {
    const project = {
      title: '午夜规则簿',
      genre: '规则怪谈',
      synopsis: '读者提前知道广播倒计时，主角还不知道缺页和钟声有关。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 8,
        title: '钟声前夜',
        summary: '主角追查广播倒计时。',
        conflict: '学生会要求立刻交出规则簿。',
        ending_hook: '旧钟背面出现下一次倒计时。',
        suspenseContract: {
          source: 'manual_camel_case',
          informationGapRules: ['读者知道旧钟是底牌，但学生会不知道。'],
          readerPreknowledgeRules: ['读者知道但主角不知道：零点会锁门。'],
          trumpCardPrepositionRules: ['底牌 + 即将发生的冲突：先展示旧钟裂纹，再安排学生会逼交规则簿。'],
          multiLineSuspenseRules: ['短弧2-3章，中弧5-8章，任何时刻至少两条悬念线运行。'],
        },
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.suspense_contract.source).toBe('manual_camel_case')
    expect(brief.suspense_contract.information_gap_rules).toEqual(['读者知道旧钟是底牌，但学生会不知道。'])
    expect(brief.suspense_contract.reader_preknowledge_rules).toEqual(['读者知道但主角不知道：零点会锁门。'])
    expect(brief.suspense_contract.trump_card_preposition_rules).toEqual(['底牌 + 即将发生的冲突：先展示旧钟裂纹，再安排学生会逼交规则簿。'])
    expect(brief.suspense_contract.multi_line_suspense_rules).toEqual(['短弧2-3章，中弧5-8章，任何时刻至少两条悬念线运行。'])
    expect(brief.suspense_contract.quality_checks.join('｜')).toContain('读者预知法')
  })

})

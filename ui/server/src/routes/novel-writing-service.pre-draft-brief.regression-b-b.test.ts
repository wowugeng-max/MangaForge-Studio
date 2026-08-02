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
const createProsePipelineHarness = (options?: any) => createProsePipelineHarnessWithService(createNovelWritingService, options)
const readSceneCardsPromptSource = () => readFileSync(join(import.meta.dir, '../novel-writing/scene-cards-prompt.ts'), 'utf8')
const readPostDeliveryStoryStateUpdateSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-story-state-update.ts'), 'utf8')
const readChapterProseStoragePatchSource = () => readFileSync(join(import.meta.dir, '../novel-writing/chapter-prose-storage-patch.ts'), 'utf8')
const readPostDeliverySyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-sync-review-record.ts'), 'utf8')
const readDraftSyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/draft-sync-review-record.ts'), 'utf8')

describe('chapter pre-draft brief regression b b', () => {
  test('merges camelCase confirmed style sample strategy into downstream prose contracts', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 19,
          title: '雨巷旧证',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 19,
        chapter_goal: '李玄用雨巷旧证逼执事露出换证破绽。',
        core_conflict: '执事连续压问，旁观弟子开始倒向他。',
        chapterBlueprint: {
          targetEmotion: '压迫后信息差反杀',
          contentOutline: {
            cause: '执事抢先定义证词。',
            development: '李玄发现雨巷旧证和袖口旧印对应。',
            turn: '林青禾顶住压力说出旧证来源。',
            climax: '李玄当众反证执事换证。',
            ending: '旧证背面出现内门编号。',
          },
          plotLines: {
            logicLine: '旧证 -> 袖口旧印 -> 换证破绽',
          },
          characterOrder: ['执事', '林青禾', '李玄'],
          costAndReward: '代价：林青禾公开得罪执事；收益：李玄夺回解释权。',
        },
        styleSampleStrategy: {
          selectedEmotionModule: 'M03 信息差反杀',
          rhythmReference: '三轮压问后半拍亮证据，爆发后短冷却接章尾钩子',
          styleProfileSummary: '短句推进审讯压力，对白留半拍。',
          matchedChapterTechniques: ['三轮压问', '半拍亮证据'],
          styleDirectives: ['对白短促，动作承接情绪余波'],
          samples: [{ sample_key: '雨巷审讯样章', unsafe_direct_phrases: ['样章原句不能照搬'] }],
          doNotCopy: ['不得复制雨巷样章桥段'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.chapter_target.style_sample_strategy.selectedEmotionModule).toContain('信息差反杀')
    expect(context.chapter_target.benchmark_recall_brief.rhythm_reference).toContain('三轮压问')
    expect(context.chapter_target.benchmark_recall_brief.matched_chapter_techniques).toContain('半拍亮证据')
    expect(context.chapter_target.style_boundary_contract.copy_boundary_rules.join('｜')).toContain('不得复制雨巷样章桥段')
    expect(context.chapter_target.style_boundary_contract.copy_boundary_rules.join('｜')).toContain('样章原句不能照搬')
    expect(context.chapter_target.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('三轮压问')
    expect(context.chapter_target.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('半拍亮证据')
  })

  test('keeps confirmed pre-draft gates in top-level pre_draft_brief for downstream repairs', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 19,
          title: '雨巷旧证',
          summary: '旧目标',
          scene_cards: [
            {
              title: '雨巷审讯',
              purpose: '李玄顶住三轮压问，半拍亮出旧证。',
              conflict: '执事抢先定义旧证为伪证。',
              reader_payoff: '旧证反杀，执事失去话语权。',
            },
          ],
        },
      },
      {
        chapter_no: 19,
        chapter_goal: '李玄用雨巷旧证逼执事露出换证破绽。',
        core_conflict: '执事连续压问，旁观弟子开始倒向他。',
        styleSampleStrategy: {
          selectedEmotionModule: 'M03 信息差反杀',
          rhythmReference: '三轮压问后半拍亮证据，爆发后短冷却接章尾钩子',
          styleProfileSummary: '短句推进审讯压力，对白留半拍。',
          matchedChapterTechniques: ['三轮压问', '半拍亮证据'],
          styleDirectives: ['对白短促，动作承接情绪余波'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('三轮压问')
    expect(context.pre_draft_brief.benchmark_recall_brief.selected_emotion_module).toContain('信息差反杀')
    expect(context.pre_draft_brief.write_preparation_brief.execution_order.join('｜')).toContain('Step 2.2 状态筛选')
    expect(context.pre_draft_brief.style_sample_strategy.selectedEmotionModule || context.pre_draft_brief.style_sample_strategy.selected_emotion_module).toContain('信息差反杀')
    expect(context.preDraftBrief).toBe(context.pre_draft_brief)
  })

  test('merges camelCase confirmed signature scene brief into prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 20,
          title: '旧证审判',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 20,
        chapter_goal: '李玄把旧证缺页变成当众审判会长的铁证。',
        signatureSceneBrief: {
          signatureScene: '雨巷长案前，李玄把带血旧证拍进烛火阴影里，满堂执事同时失声。',
          sceneRepairTarget: '补足本章可截图传播的审判场面。',
          readerPayoff: '证据反杀，会长第一次失去话语权。',
          storylineService: '推进旧证换人主线并把矛头指向禁库。',
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      context,
      null,
      { chapter_no: 20, title: '旧证审判' },
    )

    expect(context.chapter_target.signature_scene_brief.signature_scene).toContain('雨巷长案')
    expect(context.chapter_target.signature_scene_brief.scene_repair_target).toContain('可截图传播')
    expect(prompt).toContain('【本章标志性场面补位】')
    expect(prompt).toContain('雨巷长案前')
    expect(prompt).toContain('必须把 signature_scene 写成正文核心场面')
  })

  test('preserves runtime camelCase chapterTarget when confirming pre-draft brief', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapterTarget: {
          chapterNo: 21,
          title: '旧证追问',
          summary: '李玄继续追问旧证缺页。',
          conflict: '执事试图把缺页解释成抄录错误。',
          endingHook: '缺页背面露出会长私印。',
          readerRetentionBrief: {
            openingHook: '开篇先让会长私印差点被烧掉。',
            payoffPromise: '李玄用旧证缺页反压执事。',
            endingQuestion: '会长私印为什么出现在缺页背面。',
          },
          sceneCards: [],
        },
      },
      {
        chapter_no: 21,
        chapter_goal: '李玄把旧证缺页继续推进到会长私印。',
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      context,
      null,
      { chapter_no: 21, title: '旧证追问' },
    )

    expect(context.chapter_target.chapterNo).toBe(21)
    expect(context.chapter_target.reader_retention_brief.opening_hook).toContain('会长私印差点被烧掉')
    expect(context.chapter_target.reader_retention_brief.ending_question).toContain('会长私印为什么')
    expect(prompt).toContain('开篇先让会长私印差点被烧掉')
    expect(prompt).toContain('会长私印为什么出现在缺页背面')
  })

  test('merges camelCase confirmed reader retention brief into rhythm and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 21,
          title: '门槛旧影',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 21,
        chapter_goal: '李玄在雨巷门槛处验证旧影规则。',
        readerRetentionBrief: {
          openingHook: '第一段直接落在雨巷门槛旧影回头。',
          payoffPromise: '读者看到李玄用旧证反制执事。',
          informationGap: '旧影为什么只在门槛内回头。',
          emotionalReward: '压迫后给一次证据反杀的爽感。',
          shortDramaScene: '雨巷门槛内外对峙，烛火把旧影压成两半。',
          endingQuestion: '旧影回头后指向的禁库门牌是谁留下的。',
          retentionPillars: {
            upgrade: '李玄拿到禁库门牌权限。',
            resourcePressure: '旧证缺页只能换一次开门机会。',
            goalStack: '大目标 + 小目标 + 假目标：查禁库，先过雨巷门槛。',
            mysteryUnlock: '旧影为什么只在门槛内回头。',
          },
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      context,
      null,
      { chapter_no: 21, title: '门槛旧影' },
    )

    expect(context.chapter_target.reader_retention_brief.opening_hook).toContain('雨巷门槛')
    expect(context.chapter_target.reader_retention_brief.ending_question).toContain('禁库门牌')
    expect(context.chapter_target.reader_retention_brief.retention_pillars.goal_stack).toContain('大目标 + 小目标 + 假目标')
    expect(context.chapter_target.serial_rhythm_brief.opening_hook_deadline).toContain('雨巷门槛')
    expect(context.chapter_target.serial_rhythm_brief.ending_hook_guardrail).toContain('禁库门牌')
    expect(prompt).toContain('执行 chapter_target.reader_retention_brief')
    expect(prompt).toContain('留存四大支柱')
    expect(prompt).toContain('升级、资源困境、目标、解密')
    expect(prompt).toContain('第一段直接落在雨巷门槛旧影回头')
    expect(prompt).toContain('旧影回头后指向的禁库门牌')
  })

  test('normalizes existing camelCase reader drop risk brief during confirmed merge', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 22,
          title: '雨巷迟疑',
          summary: '旧目标',
          scene_cards: [],
          readerDropRiskBrief: {
            dropPoints: ['开篇三百字没有现场危险，读者会以为只是复盘。'],
            pullPoints: ['门槛旧影回头时立刻给出未解问题。'],
            repairActions: ['开篇直接写旧影拦门，中段用证据推进，章末留下禁库门牌。'],
            openingGuardrail: '前 300 字必须让旧影拦门并压出危险。',
            middleGuardrail: '中段必须用旧证推进，而不是解释设定。',
            endingGuardrail: '章末必须留下禁库门牌问题。',
          },
        },
      },
      {
        chapter_no: 22,
        chapter_goal: '李玄在雨巷门槛处验证旧影规则。',
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.chapter_target.reader_drop_risk_brief.opening_guardrail).toContain('旧影拦门')
    expect(context.chapter_target.reader_drop_risk_brief.middle_guardrail).toContain('旧证推进')
    expect(context.chapter_target.reader_drop_risk_brief.ending_guardrail).toContain('禁库门牌')
    expect(context.reader_drop_risk_brief.drop_points).toContain('开篇三百字没有现场危险，读者会以为只是复盘。')
  })

  test('merges camelCase confirmed innovation brief into prose context', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 22,
          title: '旧印反制',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 22,
        chapter_goal: '李玄用旧印规则代价反制执事。',
        innovationBrief: {
          chapterAngle: '规则代价反差：越强行抢证，旧印反噬越明显。',
          executionPoints: ['让执事抢证动作触发旧印反噬，而不是普通争抢。'],
          differentiationGuardrails: ['不得写成普通证据摊牌。'],
          ipAdaptationHooks: ['旧印在掌心倒转，雨巷长案上的烛火同时变青。'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      context,
      null,
      { chapter_no: 22, title: '旧印反制' },
    )

    expect(context.chapter_target.innovation_brief.chapter_angle).toContain('规则代价反差')
    expect(context.chapter_target.innovation_brief.execution_points).toContain('让执事抢证动作触发旧印反噬，而不是普通争抢。')
    expect(context.chapter_target.innovation_brief.differentiation_guardrails).toContain('不得写成普通证据摊牌。')
    expect(context.chapter_target.innovation_brief.ip_adaptation_hooks).toContain('旧印在掌心倒转，雨巷长案上的烛火同时变青。')
    expect(prompt).toContain('执行 chapter_target.innovation_brief')
    expect(prompt).toContain('规则代价反差')
    expect(prompt).toContain('旧印在掌心倒转')
  })

  test('merges camelCase confirmed longform compass into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 2,
        chapter_goal: '验证十点门槛。',
        longformCompass: {
          readerPromise: '超人力量必须持续撞上规则判定。',
          coreConflict: '蛮力破局与规则边界互相反制。',
          immutableRules: ['超人力量不能变成无代价清场'],
          flexibleZones: ['副本可变化，但必须服务规则破局主线'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.longformCompass.readerPromise).toContain('规则判定')
    expect(context.chapter_target.longform_compass.immutable_rules).toContain('超人力量不能变成无代价清场')
    expect(context.longform_compass.axes.find((axis: any) => axis.key === 'core_conflict')?.value).toContain('规则边界')
  })

  test('merges camelCase confirmed reader expectation ledger into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 9,
          title: '账册启封',
          scene_cards: [],
        },
      },
      {
        chapter_no: 9,
        readerExpectationLedger: {
          chapterPromise: '本章必须兑现旧案账册。',
          mustDeliver: [
            { key: 'ledger_payoff', label: '读者期待', type: 'payoff', text: '旧案账册必须被打开。' },
          ],
          keepAlive: [
            { key: 'old_case_backer', label: '保留悬念', type: 'question', text: '旧案幕后供奉是谁。' },
          ],
          mustNotBreak: ['不能提前公开供奉身份'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.chapter_target.reader_expectation_ledger.chapter_promise).toContain('旧案账册')
    expect(context.chapter_target.reader_expectation_ledger.must_deliver[0].text).toContain('旧案账册必须被打开')
    expect(context.chapter_target.reader_expectation_ledger.keep_alive[0].text).toContain('旧案幕后供奉是谁')
    expect(context.chapter_target.reader_expectation_ledger.must_not_break).toContain('不能提前公开供奉身份')
  })

  test('merges confirmed core contract radar into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 2,
        chapter_goal: '验证十点门槛。',
        core_contract_radar: {
          summary: '本章必须把超人力量撞上规则判定写成可见事件。',
          must_serve: ['超人力量和规则判定持续碰撞', '蛮力破局与规则判定的对抗'],
          no_drift: ['不能把规则怪谈写成纯打怪'],
          repair_focus: ['补足规则判定反制蛮力'],
          checks: [{ key: 'reader_promise', label: '读者承诺', status: 'warn', reason: '碰撞不够可见' }],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.core_contract_radar.must_serve).toContain('超人力量和规则判定持续碰撞')
    expect(context.chapter_target.core_contract_radar.no_drift).toContain('不能把规则怪谈写成纯打怪')
    expect(context.core_contract_radar.repair_focus).toContain('补足规则判定反制蛮力')
  })

  test('merges camelCase confirmed core contract radar into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 2,
        chapter_goal: '验证十点门槛。',
        coreContractRadar: {
          summary: '本章必须把规则反制爽点写成现场事件。',
          mustServe: ['读者承诺必须维持规则反制爽点'],
          noDrift: ['不能把校园怪谈改写成纯战斗副本'],
          repairFocus: ['补足规则判定压住蛮力的可见代价'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.coreContractRadar.mustServe).toContain('读者承诺必须维持规则反制爽点')
    expect(context.chapter_target.core_contract_radar.no_drift).toContain('不能把校园怪谈改写成纯战斗副本')
    expect(context.core_contract_radar.repair_focus).toContain('补足规则判定压住蛮力的可见代价')
  })

  test('merges camelCase confirmed longform battle context into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 2,
        chapter_goal: '验证十点门槛。',
        longformBattleContext: {
          status: 'needs_action',
          summary: '本章必须把长篇核心拉回规则反制。',
          riskChips: ['核心漂移', '读者拉力弱'],
          primaryAction: {
            key: 'repair_story_core',
            label: '修复核心守恒',
            reason: '正文必须让超人力量被规则判定反制。',
          },
          riskLanes: [
            {
              key: 'story_core',
              label: '核心守恒',
              status: 'warn',
              detail: '核心漂移：超人力量像普通无敌流。',
              requiredAction: '写出规则判定压住蛮力的现场代价。',
            },
          ],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.longformBattleContext.riskChips).toContain('核心漂移')
    expect(context.chapter_target.longform_battle_context.summary).toContain('长篇核心拉回规则反制')
    expect(context.longform_battle_context.risk_lanes[0].required_action).toContain('规则判定压住蛮力')
  })

  test('builds storyline context in the chapter context package', () => {
    const contextPackageSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/chapter-context-package.ts'), 'utf8')
    const outlineSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/outline-blueprint-contracts.ts'), 'utf8')
    const handoffSource = readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/core-handoff-sync-reports-core.ts'), 'utf8')
    const storylineSource = [contextPackageSource, outlineSource, handoffSource].join('\n')

    expect(storylineSource).toContain('storyline_context')
    expect(storylineSource).toContain('STORYLINE_TYPES')
    expect(storylineSource).toContain('storylineAdvances')
    expect(storylineSource).toContain('storylineForbidden')
  })

})

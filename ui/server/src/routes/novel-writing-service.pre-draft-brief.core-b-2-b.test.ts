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

describe('chapter pre-draft brief core b 2 b', () => {
  test('reads camelCase preDraftBrief Step 2 contracts in paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      {
        preDraftBrief: {
          stateTrackingContract: {
            version: 'oh_story_state_tracking_v1',
            sourceReadiness: [{ key: 'previous_chapter', label: '上一章正文', status: 'ready', evidence: '旧印裂口已出现第二枚门牌。' }],
            characterStates: ['李玄左手仍握旧印，不能突然空手。'],
            historicalCausality: ['第二枚门牌来自上一章旧印裂口，必须先接住。'],
            worldConstraints: ['门牌归属只能由当场证据触发。'],
            filterRules: ['旧案旁支不影响本章判定，不进入正文解释。'],
            sourceRequirements: ['上一章结尾', '追踪/伏笔.md'],
            qualityChecks: ['只使用会影响本章正确性的状态。'],
          },
          intentConfirmationContract: {
            version: 'oh_story_intent_confirmation_v1',
            confirmedIntent: '本章只写第二枚门牌的代价归属，不扩展外门大案。',
            rhythmAndStyle: ['先压三轮，再半拍亮证据。'],
            structureInputs: ['旧印裂口 -> 执事索印 -> 门牌显名'],
            executionFocus: ['爽点出手前先铺可指认危机。'],
            dialogueToneBaseline: ['高压场景里配角不能轻快插科打诨。'],
            qualityChecks: ['必须证明意图确认已落正文。'],
          },
          benchmarkRecallBrief: {
            version: 'oh_story_benchmark_recall_v1',
            selectedEmotionModule: 'M03 信息差反杀',
            rhythmReference: '三轮压问后半拍亮证据',
            styleProfileSummary: '短句推进审讯压力，对白留半拍。',
            matchedChapterTechniques: ['证据晚半拍亮出'],
            styleDirectives: ['动作压对白'],
            canonicalSourceRules: ['文风.md 只管表达层'],
            gaps: ['matched_deep_dive_missing'],
            qualityChecks: ['不得复制对标桥段。'],
          },
          styleBoundaryContract: {
            version: 'oh_story_style_boundary_v1',
            styleOverrideRules: ['只调整句长、停顿和对白比例。'],
            hardConstraints: ['硬约束永远赢。'],
            copyBoundaryRules: ['不得复制样章桥段。'],
            qualityChecks: ['检查文风覆盖边界。'],
          },
        },
        chapter_target: {
          chapter_no: 22,
          title: '第二枚门牌',
          summary: '李玄用第二枚门牌逼出归属代价。',
          conflict: '执事要夺走旧印。',
          ending_hook: '第二枚门牌背面出现母亲旧名。',
          scene_cards: [
            { scene_no: 1, title: '旧印裂口', purpose: '承接第二枚门牌。', conflict: '执事索印。' },
          ],
        },
      },
      null,
      { chapter_no: 22, title: '第二枚门牌' },
    )

    expect(prompt).toContain('【状态筛选合同】')
    expect(prompt).toContain('旧印裂口已出现第二枚门牌')
    expect(prompt).toContain('李玄左手仍握旧印')
    expect(prompt).toContain('旧案旁支不影响本章判定')
    expect(prompt).toContain('【意图确认合同】')
    expect(prompt).toContain('本章只写第二枚门牌的代价归属')
    expect(prompt).toContain('先压三轮，再半拍亮证据')
    expect(prompt).toContain('【文风召回简报】')
    expect(prompt).toContain('M03 信息差反杀')
    expect(prompt).toContain('三轮压问后半拍亮证据')
    expect(prompt).toContain('【文风覆盖边界合同】')
    expect(prompt).toContain('只调整句长、停顿和对白比例')
    expect(prompt).toContain('硬约束永远赢')
    expect(prompt).toContain('不得复制样章桥段')
  })
  test('turns oh-story daily workflow into explicit prose execution gates', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 21,
        title: '门牌追问',
        summary: '李玄只追问会影响门牌归属判定的状态，用旧印逼执事露出规则漏洞。',
        conflict: '执事试图用无关旧案分散注意力。',
        state_tracking_contract: {
          version: 'oh_story_state_tracking_v1',
          character_states: ['李玄左手持有旧印，不能突然空手。'],
          historical_causality: ['门牌翻面后会改写归属判定。'],
          world_constraints: ['归属判定只能由当场证据触发。'],
          filter_rules: ['旧案旁支不影响本章判定，不进入正文解释。'],
          quality_checks: ['只使用会影响本章正确性的状态。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '旧印追问',
            goal: '逼执事承认门牌归属判定条件。',
            conflict: '执事抛出旧案旁支转移焦点。',
            turning_point: '旧印烫出当前归属人姓名。',
            reader_payoff: '李玄用当场证据反制执事。',
          },
        ],
      },
    }

    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      contextPackage,
      null,
      { chapter_no: 21, title: '门牌追问' },
    )

    expect(prompt).toContain('oh-story 日更工作流')
    expect(prompt).toContain('状态筛选')
    expect(prompt).toContain('只加载/只使用会影响本章正确性的状态')
    expect(prompt).toContain('不知道就会写错')
    expect(prompt).toContain('status_filter_receipts')
    expect(prompt).toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.source_readiness_checks')
    expect(prompt).toContain('场景执行门禁')
    expect(prompt).toContain('goal -> obstacle -> action -> turn -> payoff -> state_delta')
    expect(prompt).toContain('turning_point')
    expect(prompt).toContain('reader_payoff')
    expect(prompt).toContain('scene_card_receipts')
  })
  test('keeps matched chapter source paths in benchmark recall brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '雨夜反证',
        summary: '李玄在雨夜审讯中用旧账册反证执事换证。',
        conflict: '执事抢先定义证词，旁观弟子准备倒向他。',
        style_sample_strategy: {
          style_profile_summary: '短句推进审讯压力，对白留半拍。',
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发。',
          style_profile_path: '对标/旧城诡案/文风.md',
          module_source_path: '对标/旧城诡案/剧情/情绪模块.md',
          rhythm_source_path: '对标/旧城诡案/剧情/节奏.md',
          benchmark_recall: {
            matched_chapter_summary_path: '对标/旧城诡案/章节/第12章_摘要.md',
            matched_chapter_deep_dive_path: '对标/旧城诡案/章节/第12章_深度拆解.md',
          },
        },
        chapter_benchmark_strategy: {
          benchmark_recall: {
            matched_chapter_K: '第12章_雨巷审讯',
            fallback_deep_dive_path: '对标/旧城诡案/章节/第1-3章_深度拆解.md',
          },
        },
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:01:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )

    expect(brief.benchmark_recall_brief.source_paths).toEqual(expect.arrayContaining([
      '对标/旧城诡案/文风.md',
      '对标/旧城诡案/剧情/情绪模块.md',
      '对标/旧城诡案/剧情/节奏.md',
      '对标/旧城诡案/章节/第12章_摘要.md',
      '对标/旧城诡案/章节/第12章_深度拆解.md',
      '对标/旧城诡案/章节/第1-3章_深度拆解.md',
    ]))
    expect(brief.benchmark_recall_brief.style_profile_path).toBe('对标/旧城诡案/文风.md')
    expect(brief.benchmark_recall_brief.module_source_path).toBe('对标/旧城诡案/剧情/情绪模块.md')
    expect(brief.benchmark_recall_brief.rhythm_source_path).toBe('对标/旧城诡案/剧情/节奏.md')
    expect(brief.benchmark_recall_brief.matched_chapter_summary_path).toBe('对标/旧城诡案/章节/第12章_摘要.md')
    expect(brief.benchmark_recall_brief.matched_chapter_deep_dive_path).toBe('对标/旧城诡案/章节/第12章_深度拆解.md')
    expect(brief.benchmark_recall_brief.fallback_deep_dive_path).toBe('对标/旧城诡案/章节/第1-3章_深度拆解.md')
    expect(brief.benchmark_recall_brief.canonical_source_rules.join('｜')).toContain('剧情/情绪模块.md')
    expect(brief.benchmark_recall_brief.canonical_source_rules.join('｜')).toContain('剧情/节奏.md')
    expect(brief.benchmark_recall_brief.canonical_source_rules.join('｜')).toContain('文风.md 只管表达层')
    expect(brief.benchmark_recall_brief.canonical_source_rules.join('｜')).toContain('冲突时以情绪模块/节奏为准')
    expect(prompt).toContain('source_paths：对标/旧城诡案/文风.md')
    expect(prompt).toContain('style_profile_path：对标/旧城诡案/文风.md')
    expect(prompt).toContain('module_source_path：对标/旧城诡案/剧情/情绪模块.md')
    expect(prompt).toContain('rhythm_source_path：对标/旧城诡案/剧情/节奏.md')
    expect(prompt).toContain('matched_chapter_summary_path：对标/旧城诡案/章节/第12章_摘要.md')
    expect(prompt).toContain('matched_chapter_deep_dive_path：对标/旧城诡案/章节/第12章_深度拆解.md')
    expect(prompt).toContain('fallback_deep_dive_path：对标/旧城诡案/章节/第1-3章_深度拆解.md')
    expect(prompt).toContain('canonical_source_rules')
    expect(prompt).toContain('文风.md 只管表达层')
    expect(prompt).toContain('冲突时以情绪模块/节奏为准')
    expect(prompt).toContain('对标/旧城诡案/章节/第12章_摘要.md')
    expect(prompt).toContain('对标/旧城诡案/章节/第12章_深度拆解.md')
    expect(prompt).toContain('对标/旧城诡案/章节/第1-3章_深度拆解.md')
  })
  test('keeps secondary benchmark recall as structure-only context and blocks style contamination', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '雨夜反证',
        summary: '李玄在雨夜审讯中用旧账册反证执事换证。',
        conflict: '执事抢先定义证词，旁观弟子准备倒向他。',
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发。',
          style_profile_summary: '主对标文风：短句推进审讯压力，对白留半拍。',
          matched_chapter: '主对标第12章_雨巷审讯',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出'],
          source_paths: [
            '对标/旧城诡案/文风.md',
            '对标/旧城诡案/章节/第12章_深度拆解.md',
          ],
          secondary_benchmark_recall_summary: [
            {
              book_title: '副书A',
              citation_strength: '辅',
              relevance: '同题材',
              recall_stage: '大纲',
              recall_count: 2,
              usage: '只参考证据链分批释放结构，不进入文风/原文锚点。',
            },
            {
              book_title: '副书B',
              citation_strength: '参考',
              relevance: '弱相关',
              recall_stage: '设定',
              recall_count: 1,
              usage: '只参考协会层级压迫，不读取副书文风.md。',
            },
          ],
        },
        scene_cards: [],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:02:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewPromptBlock = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )

    expect(brief.benchmark_recall_brief.secondary_benchmark_recall_summary).toHaveLength(2)
    expect(brief.benchmark_recall_brief.secondary_benchmark_boundary_rules.join('｜')).toContain('副对标只用于结构/情绪/设定参考')
    expect(brief.benchmark_recall_brief.secondary_benchmark_boundary_rules.join('｜')).toContain('副书不进文风')
    expect(prompt).toContain('副对标召回摘要')
    expect(prompt).toContain('副书A')
    expect(prompt).toContain('只参考证据链分批释放结构')
    expect(prompt).toContain('副书不进文风、不进原文锚点')
    expect(prompt).toContain('secondary_benchmark_boundary')
    expect(prompt).toContain('主对标最多 1 本用于文风和原文锚点')
    expect(reviewPromptBlock).toContain('副对标召回摘要')
    expect(reviewPromptBlock).toContain('副书文风污染')
  })
  test('orders secondary benchmark recall by oh-story relevance and trims entries within stage budget', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '雨夜反证',
        summary: '李玄在雨夜审讯中用旧账册反证执事换证。',
        conflict: '执事抢先定义证词，旁观弟子准备倒向他。',
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发。',
          style_profile_summary: '主对标文风：短句推进审讯压力，对白留半拍。',
          secondary_benchmark_total_budget: 5,
          benchmark_registry_missing: true,
          secondary_benchmark_recall_summary: [
            {
              book_title: '副弱书',
              citation_strength: '参考',
              relevance: '弱相关',
              recall_stage: '设定',
              recall_count: 2,
              usage: '只参考组织层级，不进入文风。',
            },
            {
              book_title: '副同题材辅书',
              citation_strength: '辅',
              relevance: '同题材',
              recall_stage: '大纲',
              recall_count: 4,
              registry_order: 2,
              usage: '只参考证据链分批释放结构。',
            },
            {
              book_title: '副同题材参考书',
              citation_strength: '参考',
              relevance: '同题材',
              recall_stage: '大纲',
              recall_count: 3,
              registry_order: 1,
              usage: '只参考章节钩子组合。',
            },
          ],
        },
        scene_cards: [],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:02:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )
    const rows = brief.benchmark_recall_brief.secondary_benchmark_recall_summary

    expect(rows.map((row: any) => row.book_title)).toEqual(['副同题材辅书', '副同题材参考书', '副弱书'])
    expect(rows.reduce((sum: number, row: any) => sum + Number(row.recall_count || 0), 0)).toBe(5)
    expect(rows[1].budget_trimmed).toBe(true)
    expect(rows[1].recall_count).toBe(1)
    expect(rows[2].recall_count).toBe(0)
    expect(brief.benchmark_recall_brief.gaps.join('｜')).toContain('benchmark_registry_missing')
    expect(brief.benchmark_recall_brief.secondary_benchmark_boundary_rules.join('｜')).toContain('同题材 > 弱相关 > 参考')
    expect(brief.benchmark_recall_brief.secondary_benchmark_boundary_rules.join('｜')).toContain('裁剪召回条目，不删除书目记录')
    expect(prompt).toContain('副同题材辅书')
    expect(prompt.indexOf('副同题材辅书')).toBeLessThan(prompt.indexOf('副同题材参考书'))
    expect(prompt).toContain('benchmark_registry_missing')
    expect(prompt).toContain('裁剪召回条目，不删除书目记录')
  })
  test('carries secondary benchmark boundaries into write preparation checks', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '雨夜反证',
        summary: '李玄在雨夜审讯中用旧账册反证执事换证。',
        conflict: '执事抢先定义证词，旁观弟子准备倒向他。',
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发。',
          style_profile_summary: '主对标文风：短句推进审讯压力，对白留半拍。',
          gaps: ['gaps.main_benchmark_unspecified: true'],
          benchmark_registry_missing: true,
          secondary_benchmark_recall_summary: [
            {
              book_title: '副书A',
              citation_strength: '辅',
              relevance: '同题材',
              recall_stage: '大纲',
              recall_count: 2,
              usage: '只参考证据链分批释放结构，不进入文风/原文锚点。',
            },
          ],
        },
        scene_cards: [],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-28T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )
    const writePreparationBrief = brief.write_preparation_brief

    expect(writePreparationBrief.readiness_status).toBe('needs_context')
    expect(writePreparationBrief.source_gaps.join('｜')).toContain('benchmark_registry_missing')
    expect(writePreparationBrief.source_gaps.join('｜')).toContain('main_benchmark_unspecified')
    expect(writePreparationBrief.must_confirm.join('｜')).toContain('主对标最多 1 本')
    expect(writePreparationBrief.must_confirm.join('｜')).toContain('副书不进文风、不进原文锚点')
    expect(writePreparationBrief.execution_order.join('｜')).toContain('secondary_benchmark_boundary')
    expect(prompt).toContain('文风召回：benchmark_registry_missing')
    expect(prompt).toContain('benchmark_registry_missing')
    expect(prompt).toContain('写前必确认')
    expect(prompt).toContain('副书不进文风、不进原文锚点')
    expect(prompt).toContain('文风召回缺口和副对标边界')
    expect(prompt.indexOf('benchmark_registry_missing')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
})

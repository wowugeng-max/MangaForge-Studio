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

describe('chapter pre-draft brief sync-core a a', () => {
  test('asks prose generation to output intent confirmation and benchmark recall execution receipts', () => {
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
        emotional_curve: '压迫 -> 试探 -> 信息差反杀',
        style_sample_strategy: {
          style_profile_summary: '短句推进审讯压力，对白留半拍。',
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出'],
          anchor_excerpts: ['原文锚点只学半拍亮证据的停顿，不进入正文。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '雨夜审讯',
            purpose: '让执事连续压问，制造证词被抢占的压力。',
            conflict: '李玄必须在证词被定性前找到反证入口。',
            reader_payoff: '证据反杀，执事失态。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )

    expect(prompt).toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.intent_confirmation_checks')
    expect(prompt).toContain('confirmed_intent')
    expect(prompt).toContain('rhythm_and_style')
    expect(prompt).toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.benchmark_recall_checks')
    expect(prompt).toContain('selected_emotion_module')
    expect(prompt).toContain('matched_chapter_techniques')
    expect(prompt).toContain('style_directives、anchor_excerpts、canonical_source_rules')
    expect(prompt).toContain('未完成时 delivered=false')
  })

  test('adds oh-story benchmark fallback receipt requirements to pre-draft brief and prose prompt', () => {
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
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          matched_chapter_K: '第12章_雨巷审讯',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出'],
          module_source_path: '对标/旧城诡案/剧情/情绪模块.md',
          rhythm_source_path: '对标/旧城诡案/剧情/节奏.md',
          style_profile_path: '对标/旧城诡案/文风.md',
          benchmark_recall: {
            matched_chapter_summary_path: '对标/旧城诡案/章节/第12章_摘要.md',
            fallback_deep_dive_path: '对标/旧城诡案/章节/第1-3章_深度拆解.md',
          },
          gaps: ['legacy_deconstruction', 'matched_deep_dive_missing'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '雨夜审讯',
            purpose: '让执事连续压问，制造证词被抢占的压力。',
            conflict: '李玄必须在证词被定性前找到反证入口。',
            reader_payoff: '证据反杀，执事失态。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-28T13:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )
    const fallbackRequirements = brief.benchmark_recall_brief.fallback_receipt_requirements.join('｜')

    expect(fallbackRequirements).toContain('module_usage_receipt')
    expect(fallbackRequirements).toContain('source_type=emotion_module')
    expect(fallbackRequirements).toContain('对标/旧城诡案/剧情/情绪模块.md')
    expect(fallbackRequirements).toContain('rhythm_usage_receipt')
    expect(fallbackRequirements).toContain('source_type=rhythm')
    expect(fallbackRequirements).toContain('对标/旧城诡案/剧情/节奏.md')
    expect(fallbackRequirements).toContain('matched_chapter_usage_receipt')
    expect(fallbackRequirements).toContain('source_type=matched_chapter')
    expect(fallbackRequirements).toContain('对标/旧城诡案/章节/第12章_摘要.md')
    expect(fallbackRequirements).toContain('gaps_preserved')
    expect(prompt).toContain('fallback_receipt_requirements')
    expect(prompt).toContain('module_usage_receipt')
    expect(prompt).toContain('rhythm_usage_receipt')
    expect(prompt).toContain('matched_chapter_usage_receipt')
    expect(prompt).toContain('fallback_usage_receipts')
    expect(prompt).toContain('source_type/source_path/expected_application/delivered_evidence/gaps_preserved')
  })

  test('injects mixed-case pre-draft benchmark recall brief into prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师', reference_config: {} },
      {
        pre_draft_brief: {
          benchmarkRecallBrief: {
            selectedEmotionModule: 'M03 信息差反杀',
            rhythmReference: '先压三轮，再半拍亮证据',
            styleProfileSummary: '短句推进，章尾只留未解问题',
            matchedChapter: '第12章_雨巷审讯',
            matchedChapterTechniques: ['三轮压问', '半拍亮证据'],
            styleDirectives: ['爆发后短冷却，不提前解释动机'],
            gaps: ['matched_deep_dive_missing'],
          },
          styleBoundaryContract: {
            hardConstraints: ['硬约束永远赢', 'Gate F 章末禁升华'],
            copyBoundaryRules: ['不得复制样章桥段'],
            qualityChecks: ['文风召回不能覆盖剧情事实。'],
          },
        },
        chapter_target: {
          chapter_no: 18,
          title: '雨夜反证',
          summary: '李玄在雨夜审讯中用旧账册反证执事换证。',
          conflict: '执事抢先定义证词，旁观弟子准备倒向他。',
          ending_hook: '旧账册缺页露出内门印记。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )
    const recallStart = prompt.indexOf('【文风召回简报】')
    const recallEnd = prompt.indexOf('【文风覆盖边界合同】') >= 0
      ? prompt.indexOf('【文风覆盖边界合同】')
      : prompt.indexOf('【结构化上下文包】')
    const recallSection = prompt.slice(recallStart, recallEnd)

    expect(recallStart).toBeGreaterThanOrEqual(0)
    expect(recallSection).toContain('selected_emotion_module：M03 信息差反杀')
    expect(recallSection).toContain('rhythm_reference：先压三轮，再半拍亮证据')
    expect(recallSection).toContain('style_profile_summary：短句推进，章尾只留未解问题')
    expect(recallSection).toContain('matched_chapter：第12章_雨巷审讯')
    expect(recallSection).toContain('matched_chapter_techniques：三轮压问；半拍亮证据')
    expect(recallSection).toContain('爆发后短冷却')
    expect(recallSection).toContain('matched_deep_dive_missing')
  })

  test('drops matched chapter inputs when benchmark tone matching failed', () => {
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
          style_profile_summary: '整书文风：短句推进审讯压力，对白留半拍。',
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          matched_chapter_K: '第99章_轻松日常',
          matched_chapter_techniques: ['轻松吐槽', '日常慢铺'],
          gaps: {
            tone_match_failed: true,
          },
        },
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:05:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )
    const recallSection = prompt.slice(
      prompt.indexOf('【文风召回简报】'),
      prompt.indexOf('【结构化上下文包】'),
    )

    expect(brief.benchmark_recall_brief.gaps.join('｜')).toContain('tone_match_failed')
    expect(brief.benchmark_recall_brief.style_profile_summary).toContain('整书文风')
    expect(brief.benchmark_recall_brief.matched_chapter).toBe('')
    expect(brief.benchmark_recall_brief.matched_chapter_techniques).toEqual([])
    expect(brief.intent_confirmation_contract.confirmed_intent).not.toContain('轻松吐槽')
    expect(brief.intent_confirmation_contract.rhythm_and_style.join('｜')).not.toContain('日常慢铺')
    expect(recallSection).toContain('tone_match_failed')
    expect(recallSection).toContain('整书文风')
    expect(recallSection).not.toContain('第99章_轻松日常')
    expect(recallSection).not.toContain('轻松吐槽')
    expect(prompt).not.toContain('轻松吐槽')
    expect(prompt).not.toContain('日常慢铺')
  })

  test('drops unusable style profile when benchmark profile is degenerate', () => {
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
          style_profile_summary: '退化文风画像：空泛形容词堆叠，无法指导正文。',
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          matched_chapter_K: '第12章_雨巷审讯',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出'],
          style_directives: ['照退化画像写空泛冷调'],
          gaps: {
            profile_degenerate: true,
          },
        },
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:06:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )
    const recallSection = prompt.slice(
      prompt.indexOf('【文风召回简报】'),
      prompt.indexOf('【结构化上下文包】'),
    )

    expect(brief.benchmark_recall_brief.gaps.join('｜')).toContain('profile_degenerate')
    expect(brief.benchmark_recall_brief.selected_emotion_module).toContain('信息差反杀')
    expect(brief.benchmark_recall_brief.rhythm_reference).toContain('先压三轮')
    expect(brief.benchmark_recall_brief.style_profile_summary).toBe('')
    expect(brief.benchmark_recall_brief.matched_chapter).toBe('')
    expect(brief.benchmark_recall_brief.matched_chapter_techniques).toEqual([])
    expect(brief.benchmark_recall_brief.style_directives).toEqual([])
    expect(brief.intent_confirmation_contract.confirmed_intent).not.toContain('照退化画像')
    expect(brief.intent_confirmation_contract.rhythm_and_style.join('｜')).not.toContain('照退化画像')
    expect(recallSection).toContain('profile_degenerate')
    expect(recallSection).not.toContain('退化文风画像')
    expect(recallSection).not.toContain('第12章_雨巷审讯')
    expect(recallSection).not.toContain('照退化画像')
    expect(prompt).not.toContain('照退化画像')
  })

  test('skips benchmark recall when no benchmark project is configured', () => {
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
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          gaps: {
            no_benchmark: true,
          },
        },
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:07:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )

    expect(brief.benchmark_recall_brief).toBeNull()
    expect(brief.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('无对标参考')
    expect(prompt).not.toContain('【文风召回简报】')
    expect(prompt).not.toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.benchmark_recall_checks')
    expect(prompt).toContain('无对标参考')
  })

  test('turns benchmark module rhythm conflicts into authority rules for pre-draft and prose prompt', () => {
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
        emotional_curve: '压迫 -> 试探 -> 信息差反杀',
        style_sample_strategy: {
          style_profile_summary: '文风摘要建议冷静旁观，低情绪慢铺陈。',
          selected_emotion_module: 'M03 信息差反杀：压迫后必须强爽感释放。',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子。',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出'],
          gaps: {
            conflict: '文风摘要偏冷，情绪模块要求更强爽感释放',
            module_rhythm_conflict: true,
          },
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '雨夜审讯',
            purpose: '让执事连续压问，制造证词被抢占的压力。',
            conflict: '李玄必须在证词被定性前找到反证入口。',
            reader_payoff: '证据反杀，执事失态。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T13:10:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 18, title: '雨夜反证' },
    )

    expect(brief.benchmark_recall_brief.authority_rules.join('｜')).toContain('情绪模块/节奏参照优先')
    expect(brief.benchmark_recall_brief.authority_rules.join('｜')).toContain('文风只管表达')
    expect(brief.benchmark_recall_brief.conflict_resolution).toContain('文风摘要偏冷')
    expect(confirmedContext.chapter_target.benchmark_recall_brief.authority_rules.join('｜')).toContain('selected_emotion_module')
    expect(prompt).toContain('benchmark_authority_rules')
    expect(prompt).toContain('情绪模块/节奏参照优先')
    expect(prompt).toContain('文风只管表达')
    expect(prompt).toContain('文风摘要偏冷')
  })

  test('hydrates incomplete explicit benchmark recall from style strategy', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 19,
        title: '雨巷旧证',
        summary: '李玄用雨巷旧证逼执事露出换证破绽。',
        conflict: '执事连续压问，旁观弟子开始倒向他。',
        benchmark_recall_brief: {
          version: 'oh_story_benchmark_recall_v1',
          source: 'manual_incomplete',
          quality_checks: ['文风召回必须落到正文动作。'],
        },
        style_sample_strategy: {
          style_profile_summary: '短句推进审讯压力，对白留半拍，动作句只保留能改变信息差的细节。',
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出'],
          gaps: {
            matched_deep_dive_missing: true,
          },
        },
        chapter_benchmark_strategy: {
          benchmark_recall: {
            matched_chapter_K: '第12章_雨巷审讯',
          },
          style_directives: ['章末只留未解问题'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '雨巷压问',
            purpose: '执事压住证词解释权。',
            conflict: '李玄必须在证词被定性前找到旧证入口。',
            reader_payoff: '证据反杀，执事失态。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)

    expect(brief.benchmark_recall_brief.source).toBe('manual_incomplete')
    expect(brief.benchmark_recall_brief.selected_emotion_module).toContain('信息差反杀')
    expect(brief.benchmark_recall_brief.rhythm_reference).toContain('先压三轮')
    expect(brief.benchmark_recall_brief.style_profile_summary).toContain('短句推进')
    expect(brief.benchmark_recall_brief.matched_chapter_techniques).toContain('三轮压问')
    expect(brief.benchmark_recall_brief.matched_chapter).toContain('第12章')
    expect(brief.benchmark_recall_brief.gaps.join('｜')).toContain('matched_deep_dive_missing')
    expect(brief.benchmark_recall_brief.quality_checks).toEqual(['文风召回必须落到正文动作。'])
  })

  test('derives benchmark recall from hydrated chapter benchmark samples', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 20,
        title: '门槛旧证',
        summary: '李玄用门槛旧证把执事逼出破绽。',
        conflict: '执事抢先定义证词，旁观弟子开始倒向他。',
        chapter_benchmark_strategy: {
          enabled: true,
        },
      },
    }
    const project = {
      title: '旧城维修师',
      genre: '规则怪谈',
      reference_config: {
        chapter_benchmark_sample_bank: [
          {
            sample_key: '规则审讯第一夜',
            genre: '规则怪谈',
            opening_hook: '开篇 300 字内抛出门槛禁令和证词反常点',
            conflict_pattern: '三轮压问后半拍亮证据',
            payoff_pattern: '证据反杀，旁观者立场翻转',
            ending_hook_pattern: '章末只留未解问题，不解释幕后动机',
            abstract_usage: '学习三轮压问、半拍亮证据、旁观者差异化反应的章节节奏。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.chapter_benchmark_strategy.samples.map((sample: any) => sample.sample_key)).toEqual(['规则审讯第一夜'])
    expect(brief.benchmark_recall_brief.matched_chapter).toContain('规则审讯第一夜')
    expect(brief.benchmark_recall_brief.style_profile_summary).toContain('三轮压问')
    expect(brief.benchmark_recall_brief.matched_chapter_techniques.join('｜')).toContain('半拍亮证据')
    expect(brief.benchmark_recall_brief.style_directives.join('｜')).toContain('章末只留未解问题')
  })

  test('wires benchmark recall checks into prose self-review and revision', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPromptBlock = source.slice(
      source.indexOf('const buildProseReviewPrompt ='),
      source.indexOf('const buildProseRevisionPrompt ='),
    )
    const revisionPromptBlock = source.slice(
      source.indexOf('const buildProseRevisionPrompt ='),
      source.indexOf('function latestProseReviewPayload'),
    )
    const shouldReviseBlock = source.slice(
      source.indexOf('const shouldReviseProse ='),
      source.indexOf('const runProseSelfReviewAndRevision ='),
    )
    const normalizedReviewBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false || !shouldReviseProse'),
    )
    const reviewNormalizeSetupBlock = source.slice(
      source.indexOf('const preDraftReceiptChecks ='),
      source.indexOf('const normalizedReview = {', source.indexOf('const preDraftReceiptChecks =')),
    )

    expect(reviewPromptBlock).toContain('chapter_target.benchmark_recall_brief')
    expect(reviewPromptBlock).toContain('benchmark_recall_checks')
    expect(reviewPromptBlock).toContain('source_type')
    expect(reviewPromptBlock).toContain('expected_application')
    expect(reviewPromptBlock).toContain('gaps_preserved')
    expect(reviewPromptBlock).toContain('canonical_source_rules')
    expect(reviewPromptBlock).toContain('文风.md 只管表达层')
    expect(revisionPromptBlock).toContain('benchmark_recall_checks')
    expect(revisionPromptBlock).toContain('情绪模块/节奏为准')
    expect(shouldReviseBlock).toContain('benchmark_recall_checks')
    expect(normalizedReviewBlock).toContain('benchmark_recall_checks')
    expect(reviewNormalizeSetupBlock).toContain('preDraftExecutionReceiptSections(reviewPayload)')
    expect(normalizedReviewBlock).toContain('section?.benchmark_recall_checks || section?.benchmarkRecallChecks')
  })

  test('asks prose self review and revision to enforce reader retention Hook addiction checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPromptBlock = source.slice(
      source.indexOf('const buildProseReviewPrompt ='),
      source.indexOf('const buildProseRevisionPrompt ='),
    )
    const revisionPromptBlock = source.slice(
      source.indexOf('const buildProseRevisionPrompt ='),
      source.indexOf('function latestProseReviewPayload'),
    )
    const shouldReviseBlock = source.slice(
      source.indexOf('const shouldReviseProse ='),
      source.indexOf('const runProseSelfReviewAndRevision ='),
    )
    const normalizedReviewBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false || !shouldReviseProse'),
    )

    expect(reviewPromptBlock).toContain('chapter_target.reader_retention_brief')
    expect(reviewPromptBlock).toContain('reader_retention_checks')
    expect(reviewPromptBlock).toContain('retention_engine')
    expect(reviewPromptBlock).toContain('emotional_payoff')
    expect(reviewPromptBlock).toContain('information_hunger')
    expect(reviewPromptBlock).toContain('page_turn_question')
    expect(reviewPromptBlock).toContain('Hook上瘾模型')
    expect(reviewPromptBlock).toContain('触发 -> 行动 -> 奖励 -> 投入')
    expect(reviewPromptBlock).toContain('留存四大支柱')
    expect(reviewPromptBlock).toContain('升级、资源困境、目标、解密')
    expect(revisionPromptBlock).toContain('reader_retention_checks')
    expect(revisionPromptBlock).toContain('奖励随机性')
    expect(revisionPromptBlock).toContain('留存四大支柱')
    expect(shouldReviseBlock).toContain('reader_retention_checks')
    expect(normalizedReviewBlock).toContain('reader_retention_checks')
    expect(normalizedReviewBlock).toContain('reviewPayload?.reader_retention_checks')
  })

  test('asks prose self review and revision to enforce oh-story style boundary checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPromptBlock = source.slice(
      source.indexOf('const buildProseReviewPrompt ='),
      source.indexOf('const buildProseRevisionPrompt ='),
    )
    const revisionPromptBlock = source.slice(
      source.indexOf('const buildProseRevisionPrompt ='),
      source.indexOf('function latestProseReviewPayload'),
    )
    const shouldReviseBlock = source.slice(
      source.indexOf('const shouldReviseProse ='),
      source.indexOf('const runProseSelfReviewAndRevision ='),
    )
    const normalizedReviewBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false || !shouldReviseProse'),
    )

    expect(reviewPromptBlock).toContain('chapter_target.style_boundary_contract')
    expect(reviewPromptBlock).toContain('style_boundary_checks')
    expect(reviewPromptBlock).toContain('硬约束永远赢')
    expect(reviewPromptBlock).toContain('Gate F')
    expect(revisionPromptBlock).toContain('style_boundary_checks')
    expect(revisionPromptBlock).toContain('文风覆盖边界')
    expect(revisionPromptBlock).toContain('删掉任何为了模仿文风而引入的禁用词')
    expect(shouldReviseBlock).toContain('style_boundary_checks')
    expect(normalizedReviewBlock).toContain('style_boundary_checks')
    expect(normalizedReviewBlock).toContain('reviewPayload?.style_boundary_checks')
  })

  test('asks prose self review and revision to enforce style sample strategy checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPromptBlock = source.slice(
      source.indexOf('const buildProseReviewPrompt ='),
      source.indexOf('const buildProseRevisionPrompt ='),
    )
    const revisionPromptBlock = source.slice(
      source.indexOf('const buildProseRevisionPrompt ='),
      source.indexOf('function latestProseReviewPayload'),
    )
    const shouldReviseBlock = source.slice(
      source.indexOf('const shouldReviseProse ='),
      source.indexOf('const runProseSelfReviewAndRevision ='),
    )
    const normalizedReviewBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false || !shouldReviseProse'),
    )

    expect(reviewPromptBlock).toContain('chapter_target.style_sample_strategy')
    expect(reviewPromptBlock).toContain('style_sample_checks')
    expect(reviewPromptBlock).toContain('style_dimension')
    expect(reviewPromptBlock).toContain('source_technique')
    expect(reviewPromptBlock).toContain('adapted_evidence')
    expect(reviewPromptBlock).toContain('copied_phrase_rewritten')
    expect(reviewPromptBlock).toContain('适用场景、避用场景和复制边界')
    expect(reviewPromptBlock).toContain('只学习叙述节奏、句式密度、对白比例和情绪转折')
    expect(revisionPromptBlock).toContain('style_sample_checks')
    expect(revisionPromptBlock).toContain('样章策略')
    expect(revisionPromptBlock).toContain('不得复制样章桥段、专有设定、角色名、核心梗或原句')
    expect(shouldReviseBlock).toContain('style_sample_checks')
    expect(normalizedReviewBlock).toContain('style_sample_checks')
    expect(normalizedReviewBlock).toContain('reviewPayload?.style_sample_checks')
  })

})

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

describe('chapter context handoff b', () => {
  test('stores deterministic normalization audits with deterministic cleanup review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8')
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()
    const storeStart = source.indexOf('buildDeterministicProseCleanupReviewRecord({')
    const storeEnd = source.indexOf('})', storeStart) + 2
    const storeBlock = source.slice(storeStart, storeEnd)

    expect(storeBlock).toContain('formatNormalization,')
    expect(storeBlock).toContain('punctuationNormalization,')
    expect(reviewRecordSource).toContain('Number(cleanup.risk_count || 0) <= 0')
    expect(reviewRecordSource).toContain('!input.formatNormalization?.changed')
    expect(reviewRecordSource).toContain('!input.punctuationNormalization?.changed')
    expect(reviewRecordSource).toContain('deterministic_format_normalization: input.formatNormalization')
    expect(reviewRecordSource).toContain('deterministic_punctuation_normalization: input.punctuationNormalization')
  })

  test('turns deterministic prose cleanup residuals into quality gate blockers', () => {
    const cleanup = buildDeterministicProseCleanupReport({
      id: 42,
      chapter_no: 3,
    }, '第三章 风起\n上一章的伏笔还没有结束……他缓缓抬头。')
    const review = buildQualityGateReviewWithDeterministicCleanup({
      passed: true,
      score: 92,
      issues: [],
      revised: true,
    }, cleanup)

    expect(review.needs_revision).toBe(true)
    expect(review.issues.map((item: any) => item.severity)).toContain('critical')
    expect(review.issues.map((item: any) => item.category)).toContain('format')
    expect(review.issues.map((item: any) => item.issue).join('｜')).toContain('确定性清理残留')
    expect(review.issues.map((item: any) => item.fix).join('｜')).toContain('角色当下能感知')

    const decision = getQualityGateDecision({
      reference_config: {
        quality_gate: {
          enabled: true,
          min_score: 78,
          max_critical_issues: 0,
          max_high_issues: 1,
        },
      },
    }, review)
    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('严重问题')
  })

  test('does not promote nonblocking deterministic cleanup warnings to critical gate failures', () => {
    const review = buildQualityGateReviewWithDeterministicCleanup({
      passed: true,
      score: 92,
      issues: [],
      revised: true,
      next_chapter_quality_plan: {
        quality_focus: ['继续压住规则危机'],
        opening_actions: ['承接清算倒计时'],
        middle_actions: ['兑现资产代价'],
        ending_actions: ['留下镇门钩子'],
        avoid_repetition: ['不要解释设定'],
        evidence_basis: ['上一章门禁'],
      },
    }, {
      risk_count: 2,
      categories: [
        {
          type: 'payoff_density',
          label: '回报密度不足',
          count: 1,
          has_blocking: false,
          evidence: ['中段偏长'],
          required_actions: ['下一章继续补阶段回报'],
        },
        {
          type: 'deslop',
          label: '去AI味硬伤',
          count: 1,
          has_blocking: false,
          evidence: ['冰冷'],
          required_actions: ['替换冰冷'],
        },
      ],
    })

    expect(review.issues.map((item: any) => item.severity)).not.toContain('critical')
    const decision = getQualityGateDecision({
      reference_config: {
        quality_gate: {
          enabled: true,
          min_score: 78,
          max_critical_issues: 0,
          max_high_issues: 1,
        },
      },
    }, review)
    expect(decision.passed).toBe(true)
  })

  test('uses a conservative passing score only when score was defaulted and cleanup is clean', () => {
    const review = buildQualityGateReviewWithDeterministicCleanup({
      passed: true,
      score: 80,
      score_defaulted: true,
      issues: [],
      revised: true,
      next_chapter_quality_plan: {
        quality_focus: ['继续压住规则危机'],
        opening_actions: ['承接清算倒计时'],
        middle_actions: ['兑现资产代价'],
        ending_actions: ['留下镇门钩子'],
        avoid_repetition: ['不要解释设定'],
        evidence_basis: ['上一章门禁'],
      },
    }, {
      status: 'ok',
      risk_count: 0,
      categories: [],
    })

    expect(review.score).toBeGreaterThanOrEqual(85)
    expect(review.score_defaulted).toBe(true)
    expect(review.deterministic_score_fallback.reason).toBe('clean_after_deterministic_cleanup')

    const decision = getQualityGateDecision({
      reference_config: {
        quality_gate: {
          enabled: true,
          min_score: 85,
          max_critical_issues: 0,
          max_high_issues: 1,
        },
      },
    }, review)
    expect(decision.passed).toBe(true)
  })

  test('keeps a defaulted review below gate when deterministic cleanup still has residuals', () => {
    const review = buildQualityGateReviewWithDeterministicCleanup({
      passed: true,
      score: 80,
      score_defaulted: true,
      issues: [],
      revised: true,
      next_chapter_quality_plan: {
        quality_focus: ['继续压住规则危机'],
        opening_actions: ['承接清算倒计时'],
        middle_actions: ['兑现资产代价'],
        ending_actions: ['留下镇门钩子'],
        avoid_repetition: ['不要解释设定'],
        evidence_basis: ['上一章门禁'],
      },
    }, {
      risk_count: 1,
      categories: [
        {
          type: 'deslop',
          label: '去AI味硬伤',
          count: 1,
          has_blocking: false,
          evidence: ['缓缓'],
          required_actions: ['替换缓缓'],
        },
      ],
    })

    expect(review.score).toBeLessThan(85)
    expect(review.deterministic_score_fallback.reason).toBe('deterministic_cleanup_residuals')

    const decision = getQualityGateDecision({
      reference_config: {
        quality_gate: {
          enabled: true,
          min_score: 85,
          max_critical_issues: 0,
          max_high_issues: 1,
        },
      },
    }, review)
    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('质检评分')
  })

  test('quality gates evaluate deterministic prose cleanup residuals before storing prose', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const cleanupStart = source.indexOf('qualityLoop.final_scan?.cleanup || buildDeterministicProseCleanupReport(chapter, finalText)', groupStart)
    const gateReviewStart = source.indexOf('let qualityGateReview = buildQualityGateReviewWithDeterministicCleanup', cleanupStart)
    const preStoreStart = source.indexOf('const preStoreQualityDecision =', gateReviewStart)
    const finalStart = source.indexOf('const finalQualityDecision =', preStoreStart)
    const gateBlock = source.slice(cleanupStart, finalStart + 260)

    expect(cleanupStart).toBeGreaterThan(groupStart)
    expect(gateReviewStart).toBeGreaterThan(cleanupStart)
    expect(preStoreStart).toBeGreaterThan(gateReviewStart)
    expect(finalStart).toBeGreaterThan(preStoreStart)
    expect(gateBlock).toContain('buildQualityGateReviewWithDeterministicCleanup({')
    expect(gateBlock).toContain('...(selfCheck?.review || {})')
    expect(gateBlock).toContain('revised: Boolean(selfCheck.revised)')
    expect(gateBlock).toContain('}, deterministicProseCleanup')
    expect(gateBlock).toContain('getQualityGateDecision(qualityGateProject, qualityGateReview)')
    expect(gateBlock).toContain('getQualityGateDecision(qualityGateProject, qualityGateReview, safetyDecision)')
  })

  test('quality gates include prose revision receipt sync failures before storing prose', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const syncStart = source.indexOf('let proseRevisionReceiptSync = buildProseRevisionReceiptSyncReport(chapter, selfCheck)', groupStart)
    const gateReviewStart = source.indexOf('let qualityGateReview =', syncStart)
    const preStoreStart = source.indexOf('const preStoreQualityDecision =', gateReviewStart)
    const gateBlock = source.slice(syncStart, preStoreStart)

    expect(syncStart).toBeGreaterThan(groupStart)
    expect(gateReviewStart).toBeGreaterThan(syncStart)
    expect(gateBlock).toContain('revision_receipt_checks')
    expect(gateBlock).toContain('proseRevisionReceiptSync.status ===')
    expect(gateBlock).toContain('proseRevisionReceiptSync.missed_count')
    expect(gateBlock).toContain('修订回执未闭环')
  })

  test('quality gates include deslop repair receipt residual risks before storing prose', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const deslopCheckStart = source.indexOf('let deslopRepairReceiptSync = buildDeslopRepairReceiptSyncReport(chapter, selfCheck)', groupStart)
    const gateReviewStart = source.indexOf('let qualityGateReview =', deslopCheckStart)
    const preStoreStart = source.indexOf('const preStoreQualityDecision =', gateReviewStart)
    const gateBlock = source.slice(deslopCheckStart, preStoreStart)

    expect(deslopCheckStart).toBeGreaterThan(groupStart)
    expect(gateReviewStart).toBeGreaterThan(groupStart)
    expect(preStoreStart).toBeGreaterThan(gateReviewStart)
    expect(gateBlock).toContain('deslopRepairReceiptRisks')
    expect(gateBlock).toContain('deslopRepairReceiptSync')
    expect(gateBlock).toContain('missingDeslopRepairReceiptChecks')
    expect(gateBlock).toContain('proseQualityDeslopRepairReceiptRisks')
    expect(gateBlock).toContain('deslop_repair_checks: [...missingDeslopRepairReceiptChecks, ...deslopRepairChecks]')
    expect(gateBlock).toContain('去AI味修复回执未闭环')
    expect(gateBlock).toContain('去AI味修复回执未生成')
  })

  test('quality gates include quality audit repair receipt failures before storing prose', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const qualityCheckStart = source.indexOf('let qualityAuditRepairReceiptSync = buildQualityAuditRepairReceiptSyncReport(chapter, selfCheck)', groupStart)
    const gateReviewStart = source.indexOf('let qualityGateReview =', qualityCheckStart)
    const preStoreStart = source.indexOf('const preStoreQualityDecision =', gateReviewStart)
    const gateBlock = source.slice(qualityCheckStart, preStoreStart)

    expect(qualityCheckStart).toBeGreaterThan(groupStart)
    expect(gateReviewStart).toBeGreaterThan(groupStart)
    expect(preStoreStart).toBeGreaterThan(gateReviewStart)
    expect(gateBlock).toContain('qualityAuditRepairReceiptSync')
    expect(gateBlock).toContain('missingQualityAuditRepairReceiptChecks')
    expect(gateBlock).toContain('quality_audit_checks: [')
    expect(gateBlock).toContain('...missingQualityAuditRepairReceiptChecks')
    expect(gateBlock).toContain('质量诊断修复回执未生成')
  })

  test('quality gates recompute receipt syncs against final prose text before blocking storage', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const syncChapterStart = source.indexOf('const syncChapterForReceiptEvidence = { ...chapter, chapter_text: finalText }', groupStart)
    const gateReviewStart = source.indexOf('let qualityGateReview =', syncChapterStart)
    const syncBlock = source.slice(syncChapterStart, gateReviewStart)

    expect(syncChapterStart).toBeGreaterThan(groupStart)
    expect(gateReviewStart).toBeGreaterThan(syncChapterStart)
    expect(syncBlock).toContain('proseRevisionReceiptSync = buildProseRevisionReceiptSyncReport(syncChapterForReceiptEvidence, selfCheck)')
    expect(syncBlock).toContain('deslopRepairReceiptSync = buildDeslopRepairReceiptSyncReport(syncChapterForReceiptEvidence, selfCheck)')
    expect(syncBlock).toContain('qualityAuditRepairReceiptSync = buildQualityAuditRepairReceiptSyncReport(syncChapterForReceiptEvidence, selfCheck)')
    expect(syncBlock).toContain('revisionCascadeImpactSync = buildRevisionCascadeImpactSyncReport(syncChapterForReceiptEvidence, selfCheck)')
    expect(syncBlock).toContain('proseQualityDeslopRepairReceiptRisks({ self_check: selfCheck }, finalText)')
  })

  test('quality gates keep post-delivery receipt sync failures as advisory diagnostics before storing prose', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const postDeliveryCheckStart = source.indexOf('const postDeliveryReceiptChecks =', groupStart)
    const preStoreStart = source.indexOf('const preStoreQualityDecision =', postDeliveryCheckStart)
    const gateBlock = source.slice(postDeliveryCheckStart, preStoreStart)

    expect(postDeliveryCheckStart).toBeGreaterThan(groupStart)
    expect(preStoreStart).toBeGreaterThan(postDeliveryCheckStart)
    expect(gateBlock).toContain('nextChapterQualityPlanReceiptSync')
    expect(gateBlock).toContain('statusFilterReceiptSync')
    expect(gateBlock).toContain('writePreparationReceiptSync')
    expect(gateBlock).toContain('preStoreSceneCardReceiptSync')
    expect(gateBlock).toContain('preStoreDeliveryRiskReceiptSync')
    expect(gateBlock).toContain("sync_key: 'scene_card_receipts_sync'")
    expect(gateBlock).toContain("sync_key: 'delivery_risk_receipts_sync'")
    expect(gateBlock).toContain('post_delivery_receipt_sync')
    expect(gateBlock).toContain('qualityGateReview.post_delivery_receipt_checks = postDeliveryReceiptChecks')
    expect(gateBlock).not.toContain('qualityGateReview.quality_audit_checks =')
  })

  test('draft review quality decision excludes post-delivery receipt sync advisories from the hard gate', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8')
    const groupSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const postDeliveryCheckStart = source.indexOf('const postDeliveryReceiptChecks =')
    const postDeliveryAdvisoryStart = source.indexOf('qualityGateReview.post_delivery_receipt_checks = postDeliveryReceiptChecks', postDeliveryCheckStart)
    const draftQualityDecisionStart = source.indexOf('const draftQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', postDeliveryCheckStart)
    const draftReviewOnlyStart = groupSource.indexOf('if ((isDraftOnly || isDraftReviewOnly) && !isZhuqueFast)')
    const draftModeStoreStart = groupSource.indexOf('return await runDraftModeAdmissionAndStore', draftReviewOnlyStart)
    const advisoryBlock = source.slice(postDeliveryCheckStart, draftQualityDecisionStart)

    expect(postDeliveryCheckStart).toBeGreaterThanOrEqual(0)
    expect(postDeliveryAdvisoryStart).toBeGreaterThan(postDeliveryCheckStart)
    expect(draftQualityDecisionStart).toBeGreaterThan(postDeliveryAdvisoryStart)
    expect(draftReviewOnlyStart).toBeGreaterThanOrEqual(0)
    expect(draftModeStoreStart).toBeGreaterThan(draftReviewOnlyStart)
    expect(groupSource).toContain("runQualityLoopAndPrestoreSetup")
    expect(advisoryBlock).toContain("status: 'warn'")
    expect(advisoryBlock).toContain('qualityGateReview.post_delivery_receipt_checks = postDeliveryReceiptChecks')
    expect(advisoryBlock).not.toContain('qualityGateReview.quality_audit_checks =')
  })

  test('returns quality audit repair receipt sync in story state update summaries', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()

    expect(source).toContain("reviewType: 'quality_audit_repair_receipt_sync'")
    expect(reviewRecordSource).toContain('review_type: input.reviewType')
    expect(source).toContain('buildQualityAuditRepairReceiptSyncReport(chapter, selfCheck)')
    expect(postDeliverySource).toContain("['qualityAuditRepairReceiptSync', 'quality_audit_repair_receipt_sync']")
    expect(source).toContain('qualityAuditRepairReceiptSync,')
  })

  test('returns deterministic prose hygiene sync in draft review only summaries', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const draftReviewRecordSource = readDraftSyncReviewRecordSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('return await runFullProductionAdmissionAndStore', draftReviewOnlyStart)
    const draftBlock = [source.slice(draftReviewOnlyStart, draftReviewOnlyEnd), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')

    expect(draftBlock).toContain('const draftProseMetaSync = buildProseMetaSyncReport(project, chapter, contextPackage, finalText)')
    expect(draftBlock).toContain('const draftSourceReadinessSync = buildSourceReadinessSyncReport(project, chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'prose_meta_sync'")
    expect(draftBlock).toContain("payloadKey: 'prose_meta_sync'")
    expect(draftBlock).toContain("reviewType: 'source_readiness_sync'")
    expect(draftBlock).toContain("payloadKey: 'source_readiness_sync'")
    expect(draftReviewRecordSource).toContain('review_type: input.reviewType')
    expect(draftReviewRecordSource).toContain('[input.payloadKey]: sync')
  })

  test('returns chapter title uniqueness sync in draft review only summaries', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('return await runFullProductionAdmissionAndStore', draftReviewOnlyStart)
    const draftBlock = [source.slice(draftReviewOnlyStart, draftReviewOnlyEnd), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')

    expect(draftBlock).toContain('const draftChapters = await listNovelChapters(activeWorkspace, projectId)')
    expect(draftBlock).toContain('const draftChapterTitleUniquenessSync = buildChapterTitleUniquenessSyncReport(draftChapters, updatedReviewedDraft || chapter)')
    expect(draftBlock).toContain('buildChapterTitleUniquenessDraftReviewRecord({ projectId, chapter, sync: draftChapterTitleUniquenessSync })')
    expect(draftBlock).toContain('chapterTitleUniquenessSync: draftChapterTitleUniquenessSync')
  })

  test('returns chapter handoff sync in draft review only summaries', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('return await runFullProductionAdmissionAndStore', draftReviewOnlyStart)
    const draftBlock = [source.slice(draftReviewOnlyStart, draftReviewOnlyEnd), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')

    expect(draftBlock).toContain('const draftChapterHandoffSync = buildChapterHandoffSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain('buildChapterHandoffDraftReviewRecord({ projectId, chapter, sync: draftChapterHandoffSync })')
    expect(draftBlock).toContain('chapterHandoffSync: draftChapterHandoffSync')
  })

  test('returns reader expectation sync in draft review only summaries', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('return await runFullProductionAdmissionAndStore', draftReviewOnlyStart)
    const draftBlock = [source.slice(draftReviewOnlyStart, draftReviewOnlyEnd), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')

    expect(draftBlock).toContain('const draftReaderExpectationSync = buildReaderExpectationSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'reader_expectation_sync'")
    expect(draftBlock).toContain("payloadKey: 'reader_expectation_sync'")
  })

  test('returns reader payoff and retention sync in draft review only summaries', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('return await runFullProductionAdmissionAndStore', draftReviewOnlyStart)
    const draftBlock = [source.slice(draftReviewOnlyStart, draftReviewOnlyEnd), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')

    expect(draftBlock).toContain('const draftReaderPayoffSync = buildReaderPayoffSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText, {})')
    expect(draftBlock).toContain('buildReaderPayoffDraftReviewRecord({ projectId, chapter, sync: draftReaderPayoffSync })')
    expect(draftBlock).toContain('readerPayoffSync: draftReaderPayoffSync')
    expect(draftBlock).toContain('const draftReaderRetentionSync = buildReaderRetentionSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'reader_retention_sync'")
    expect(draftBlock).toContain("payloadKey: 'reader_retention_sync'")
  })

  test('returns expectation threshold sync in draft review only summaries', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('return await runFullProductionAdmissionAndStore', draftReviewOnlyStart)
    const draftBlock = [source.slice(draftReviewOnlyStart, draftReviewOnlyEnd), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')

    expect(draftBlock).toContain('const draftExpectationThresholdSync = buildExpectationThresholdSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'expectation_threshold_sync'")
    expect(draftBlock).toContain("payloadKey: 'expectation_threshold_sync'")
  })

  test('returns hook sync in draft review only summaries', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('return await runFullProductionAdmissionAndStore', draftReviewOnlyStart)
    const draftBlock = [source.slice(draftReviewOnlyStart, draftReviewOnlyEnd), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')

    expect(draftBlock).toContain('const draftChapterHookSync = buildChapterHookSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'chapter_hook_sync'")
    expect(draftBlock).toContain("payloadKey: 'chapter_hook_sync'")
    expect(draftBlock).toContain('const draftParagraphHookSync = buildParagraphHookSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'paragraph_hook_sync'")
    expect(draftBlock).toContain("payloadKey: 'paragraph_hook_sync'")
  })

  test('returns prose craft quality sync in draft review only summaries', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('return await runFullProductionAdmissionAndStore', draftReviewOnlyStart)
    const draftBlock = [source.slice(draftReviewOnlyStart, draftReviewOnlyEnd), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')

    expect(draftBlock).toContain('const draftOpeningSync = buildOpeningSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'opening_sync'")
    expect(draftBlock).toContain("payloadKey: 'opening_sync'")
    expect(draftBlock).toContain('const draftProseCraftSync = buildProseCraftSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'prose_craft_sync'")
    expect(draftBlock).toContain("payloadKey: 'prose_craft_sync'")
    expect(draftBlock).toContain('const draftQualityAuditSync = buildQualityAuditSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'quality_audit_sync'")
    expect(draftBlock).toContain("payloadKey: 'quality_audit_sync'")
  })

  test('returns payoff and scene rhythm sync in draft review only summaries', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('return await runFullProductionAdmissionAndStore', draftReviewOnlyStart)
    const draftBlock = [source.slice(draftReviewOnlyStart, draftReviewOnlyEnd), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')

    expect(draftBlock).toContain('const draftPayoffSetupSync = buildPayoffSetupSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'payoff_setup_sync'")
    expect(draftBlock).toContain("payloadKey: 'payoff_setup_sync'")
    expect(draftBlock).toContain('const draftSpectatorReactionSync = buildSpectatorReactionSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'spectator_reaction_sync'")
    expect(draftBlock).toContain("payloadKey: 'spectator_reaction_sync'")
    expect(draftBlock).toContain('const draftBridgeUnitSync = buildBridgeUnitSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'bridge_unit_sync'")
    expect(draftBlock).toContain("payloadKey: 'bridge_unit_sync'")
    expect(draftBlock).toContain('const draftBeatCoolingSync = buildBeatCoolingSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'beat_cooling_sync'")
    expect(draftBlock).toContain("payloadKey: 'beat_cooling_sync'")
  })

  test('returns dramatic turn sync in draft review only summaries', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('return await runFullProductionAdmissionAndStore', draftReviewOnlyStart)
    const draftBlock = [source.slice(draftReviewOnlyStart, draftReviewOnlyEnd), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')

    expect(draftBlock).toContain('const draftSuspenseSync = buildSuspenseSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'suspense_sync'")
    expect(draftBlock).toContain("payloadKey: 'suspense_sync'")
    expect(draftBlock).toContain('const draftReversalSync = buildReversalSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'reversal_sync'")
    expect(draftBlock).toContain("payloadKey: 'reversal_sync'")
    expect(draftBlock).toContain('const draftShowdownSync = buildShowdownSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'showdown_sync'")
    expect(draftBlock).toContain("payloadKey: 'showdown_sync'")
  })

  test('returns character asset state sync in draft review only summaries', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const draftReviewRecordSource = readDraftSyncReviewRecordSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('return await runFullProductionAdmissionAndStore', draftReviewOnlyStart)
    const draftBlock = [source.slice(draftReviewOnlyStart, draftReviewOnlyEnd), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')

    expect(draftBlock).toContain('const draftDialogueSync = buildDialogueSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'dialogue_sync'")
    expect(draftBlock).toContain("payloadKey: 'dialogue_sync'")
    expect(draftBlock).toContain('const draftCharacterBehaviorSync = buildCharacterBehaviorSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'character_behavior_sync'")
    expect(draftBlock).toContain("payloadKey: 'character_behavior_sync'")
    expect(draftBlock).toContain('const draftAssetLinkageSync = buildAssetLinkageSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'asset_linkage_sync'")
    expect(draftBlock).toContain("payloadKey: 'asset_linkage_sync'")
    expect(draftBlock).toContain('const draftStateTrackingSync = buildStateTrackingSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'state_tracking_sync'")
    expect(draftBlock).toContain("payloadKey: 'state_tracking_sync'")
    expect(draftReviewRecordSource).toContain('summary: `${sync.label}：${sync.summary}`')
    expect(draftReviewRecordSource).toContain('issues: (sync.missed || [])')
  })

  test('returns receipt syncs in draft review only summaries from the same pre-store receipt context as quality gates', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('return await runFullProductionAdmissionAndStore', draftReviewOnlyStart)
    const draftBlock = [source.slice(draftReviewOnlyStart, draftReviewOnlyEnd), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')

    expect(draftBlock).toContain('const draftSceneCardReceiptSync = buildSceneCardReceiptSyncReport(project, updatedReviewedDraft || chapter, preStoreReceiptSyncContextPackage, finalText)')
    expect(draftBlock).toContain('buildSceneCardReceiptsDraftReviewRecord({ projectId, chapter, sync: draftSceneCardReceiptSync })')
    expect(draftBlock).toContain('const draftDeliveryRiskReceiptSync = buildDeliveryRiskReceiptSyncReport(project, updatedReviewedDraft || chapter, preStoreReceiptSyncContextPackage, finalText)')
    expect(draftBlock).toContain('buildDeliveryRiskReceiptsDraftReviewRecord({ projectId, chapter, sync: draftDeliveryRiskReceiptSync })')
  })

  test('returns dialogue and character behavior sync in full pipeline story state update', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const fullPipelineStart = source.indexOf('const story_state_update: any = args.storyStateUpdate || {}', groupStart)
    const fullPipelineEnd = source.indexOf('return buildPostDeliveryStoryStateUpdate', fullPipelineStart)
    const fullPipelineBlock = source.slice(fullPipelineStart, fullPipelineEnd)

    expect(fullPipelineBlock).toContain('const dialogueSync = buildDialogueSyncReport(project, updated, contextPackage, finalText)')
    expect(fullPipelineBlock).toContain('const characterBehaviorSync = buildCharacterBehaviorSyncReport(project, updated, contextPackage, finalText)')
    expect(postDeliverySource).toContain("['dialogueSync', 'dialogue_sync']")
    expect(postDeliverySource).toContain("['characterBehaviorSync', 'character_behavior_sync']")
  })

  test('returns scene-card receipt sync in full pipeline story state update', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const fullPipelineStart = source.indexOf('const story_state_update: any = args.storyStateUpdate || {}', groupStart)
    const fullPipelineEnd = source.indexOf('return buildPostDeliveryStoryStateUpdate', fullPipelineStart)
    const fullPipelineBlock = source.slice(fullPipelineStart, fullPipelineEnd)

    expect(fullPipelineBlock).toContain('const sceneCardReceiptSync = buildSceneCardReceiptSyncReport(project, updated, preStoreReceiptSyncContextPackage, finalText)')
    expect(postDeliverySource).toContain("['sceneCardReceiptSync', 'scene_card_receipts_sync']")
  })

  test('returns delivery-risk receipt sync in full pipeline story state update', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const fullPipelineStart = source.indexOf('const story_state_update: any = args.storyStateUpdate || {}', groupStart)
    const fullPipelineEnd = source.indexOf('return buildPostDeliveryStoryStateUpdate', fullPipelineStart)
    const fullPipelineBlock = source.slice(fullPipelineStart, fullPipelineEnd)

    expect(fullPipelineBlock).toContain('const deliveryRiskReceiptSync = buildDeliveryRiskReceiptSyncReport(project, updated, preStoreReceiptSyncContextPackage, finalText)')
    expect(postDeliverySource).toContain("['deliveryRiskReceiptSync', 'delivery_risk_receipts_sync']")
  })

  test('returns revision-context receipt sync in full pipeline story state update', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const fullPipelineStart = source.indexOf('const story_state_update: any = args.storyStateUpdate || {}', groupStart)
    const fullPipelineEnd = source.indexOf('return buildPostDeliveryStoryStateUpdate', fullPipelineStart)
    const fullPipelineBlock = source.slice(fullPipelineStart, fullPipelineEnd)

    expect(source).toContain('let revisionContextReceiptSync = buildRevisionContextReceiptSyncReport(chapter, selfCheck)')
    expect(source).toContain('revisionContextReceiptSync = buildRevisionContextReceiptSyncReport(chapter, selfCheck)')
    expect(postDeliverySource).toContain("['revisionContextReceiptSync', 'revision_context_receipts_sync']")
  })

  test('stores common post-delivery sync reviews through the shared record builder', () => {
    const source = ['story-state-machine-update-phase-a.ts', 'story-state-machine-update-phase-b.ts']
      .map(name => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8'))
      .join('\n')
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()
    const updateStoryStateBlock = source

    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterHandoffSync, reviewType: 'chapter_handoff_sync'")
    expect(updateStoryStateBlock).toContain('sync: readerExpectationSync')
    expect(updateStoryStateBlock).toContain("reviewType: 'reader_expectation_sync'")
    expect(updateStoryStateBlock).toContain("payloadKey: 'reader_expectation_sync'")
    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: expectationThresholdSync, reviewType: 'expectation_threshold_sync'")
    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterHookSync, reviewType: 'chapter_hook_sync'")
    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: paragraphHookSync, reviewType: 'paragraph_hook_sync'")
    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: suspenseSync, reviewType: 'suspense_sync'")
    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: reversalSync, reviewType: 'reversal_sync'")
    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: showdownSync, reviewType: 'showdown_sync'")
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: openingSync, reviewType: 'opening_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: proseCraftSync, reviewType: 'prose_craft_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: punctuationToneSync, reviewType: 'punctuation_tone_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: qualityAuditSync, reviewType: 'quality_audit_sync'"].forEach((token) => expect(updateStoryStateBlock).toContain(token))
    expect(updateStoryStateBlock).toContain('sync: proseMetaSync')
    expect(updateStoryStateBlock).toContain("reviewType: 'prose_meta_sync'")
    expect(updateStoryStateBlock).toContain("payloadKey: 'prose_meta_sync'")
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: dialogueSync, reviewType: 'dialogue_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterBehaviorSync, reviewType: 'character_behavior_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: assetLinkageSync, reviewType: 'asset_linkage_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: stateTrackingSync, reviewType: 'state_tracking_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: sourceReadinessSync, reviewType: 'source_readiness_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: intentConfirmationSync, reviewType: 'intent_confirmation_sync'"].forEach((token) => expect(updateStoryStateBlock).toContain(token))
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: payoffSetupSync, reviewType: 'payoff_setup_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: spectatorReactionSync, reviewType: 'spectator_reaction_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: bridgeUnitSync, reviewType: 'bridge_unit_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: beatCoolingSync, reviewType: 'beat_cooling_sync'"].forEach((token) => expect(updateStoryStateBlock).toContain(token))
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: continuityHeatSync, reviewType: 'continuity_heat_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: conflictStructureSync, reviewType: 'conflict_structure_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: upgradeRhythmSync, reviewType: 'upgrade_rhythm_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: targetReaderSync, reviewType: 'target_reader_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: genrePositioningSync, reviewType: 'genre_positioning_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: femaleAudienceSync, reviewType: 'female_audience_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: plotDynamicsSync, reviewType: 'plot_dynamics_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyPowerSync, reviewType: 'story_power_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterRelationSync, reviewType: 'character_relation_sync'"].forEach((token) => expect(updateStoryStateBlock).toContain(token))
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyDriveSync, reviewType: 'story_drive_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyLoopSync, reviewType: 'story_loop_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: informationFlowSync, reviewType: 'information_flow_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: emotionalArcSync, reviewType: 'emotional_arc_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterArcSync, reviewType: 'character_arc_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterBlueprintSync, reviewType: 'chapter_blueprint_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterBenchmarkSync, reviewType: 'chapter_benchmark_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: benchmarkRecallSync, reviewType: 'benchmark_recall_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: styleBoundarySync, reviewType: 'style_boundary_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: innovationSync, reviewType: 'innovation_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: volumeBeatSync, reviewType: 'volume_beat_sync'"].forEach((token) => expect(updateStoryStateBlock).toContain(token))
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterTitleUniquenessSync, reviewType: 'chapter_title_uniqueness_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterStateDeltaSync, reviewType: 'character_state_delta_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: timelineDeltaSync, reviewType: 'timeline_delta_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterHandoffDeltaSync, reviewType: 'chapter_handoff_delta_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: assetStateDeltaSync, reviewType: 'asset_state_delta_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: relationshipDeltaSync, reviewType: 'relationship_delta_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: foreshadowingDeltaSync, reviewType: 'foreshadowing_delta_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: stateDeltaCompleteness, reviewType: 'state_delta_completeness'"].forEach((token) => expect(updateStoryStateBlock).toContain(token))
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: signatureSceneSync, reviewType: 'signature_scene_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyUnitSync, reviewType: 'story_unit_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: coreDrift, reviewType: 'chapter_core_drift'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: coreContractSync, reviewType: 'core_contract_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: readerPayoffSync, reviewType: 'reader_payoff_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: readerRetentionSync, reviewType: 'reader_retention_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterAttractionReview, reviewType: 'chapter_attraction_review'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: styleSampleSync, reviewType: 'style_sample_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: runwaySync, reviewType: 'runway_sync'"].forEach((token) => expect(updateStoryStateBlock.replace(/\s+/g, ' ')).toContain(token))
    expect(reviewRecordSource).toContain('export function buildPostDeliverySyncReviewRecord')
    expect(reviewRecordSource).toContain('payload: chapterPayload(input.chapter, input.payloadKey, sync)')
  })

  test('returns continuity and conflict sync in draft review only summaries', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('return await runFullProductionAdmissionAndStore', draftReviewOnlyStart)
    const draftBlock = [source.slice(draftReviewOnlyStart, draftReviewOnlyEnd), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')

    expect(draftBlock).toContain('const draftIntentConfirmationSync = buildIntentConfirmationSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'intent_confirmation_sync'")
    expect(draftBlock).toContain("payloadKey: 'intent_confirmation_sync'")
    expect(draftBlock).toContain('const draftContinuityHeatSync = buildContinuityHeatSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'continuity_heat_sync'")
    expect(draftBlock).toContain("payloadKey: 'continuity_heat_sync'")
    expect(draftBlock).toContain('const draftConflictStructureSync = buildConflictStructureSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'conflict_structure_sync'")
    expect(draftBlock).toContain("payloadKey: 'conflict_structure_sync'")
    expect(draftBlock).toContain('const draftUpgradeRhythmSync = buildUpgradeRhythmSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'upgrade_rhythm_sync'")
    expect(draftBlock).toContain("payloadKey: 'upgrade_rhythm_sync'")
  })

})

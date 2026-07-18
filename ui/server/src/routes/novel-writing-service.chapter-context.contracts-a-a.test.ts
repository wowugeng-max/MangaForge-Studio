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
} from './novel-writing-service'
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

const readGenerateChapterForGroupSource = () => {
  const serviceDir = join(import.meta.dir, '../novel-writing-service/service')
  const postDeliveryDir = join(import.meta.dir, '../novel-writing-service/post-delivery')
  return [
    readFileSync(join(serviceDir, 'generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(serviceDir, 'generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(serviceDir, 'generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(serviceDir, 'generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(serviceDir, 'generate-chapter-quality-prestore.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-draft-mode-store.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-full-production-store.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-acceptance-prep.ts'), 'utf8'),
    readFileSync(join(postDeliveryDir, 'post-commit-sync-bundle.ts'), 'utf8'),
  ].join('\n')
}

describe('chapter context contracts a a', () => {
  test('returns market promise sync in draft review only summaries', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('return await runFullProductionAdmissionAndStore', draftReviewOnlyStart)
    const draftBlock = [source.slice(draftReviewOnlyStart, draftReviewOnlyEnd), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')

    expect(draftBlock).toContain('const draftTargetReaderSync = buildTargetReaderSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'target_reader_sync'")
    expect(draftBlock).toContain("payloadKey: 'target_reader_sync'")
    expect(draftBlock).toContain('const draftGenrePositioningSync = buildGenrePositioningSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'genre_positioning_sync'")
    expect(draftBlock).toContain("payloadKey: 'genre_positioning_sync'")
    expect(draftBlock).toContain('const draftFemaleAudienceSync = buildFemaleAudienceSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'female_audience_sync'")
    expect(draftBlock).toContain("payloadKey: 'female_audience_sync'")
    expect(draftBlock).toContain('const draftPlotDynamicsSync = buildPlotDynamicsSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'plot_dynamics_sync'")
    expect(draftBlock).toContain("payloadKey: 'plot_dynamics_sync'")
    expect(draftBlock).toContain('const draftCharacterRelationSync = buildCharacterRelationSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'character_relation_sync'")
    expect(draftBlock).toContain("payloadKey: 'character_relation_sync'")
  })
  test('returns story structure sync in draft review only summaries', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('return await runFullProductionAdmissionAndStore', draftReviewOnlyStart)
    const draftBlock = [source.slice(draftReviewOnlyStart, draftReviewOnlyEnd), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')

    expect(draftBlock).toContain('const draftStoryDriveSync = buildStoryDriveSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'story_drive_sync'")
    expect(draftBlock).toContain("payloadKey: 'story_drive_sync'")
    expect(draftBlock).toContain('const draftStoryLoopSync = buildStoryLoopSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'story_loop_sync'")
    expect(draftBlock).toContain("payloadKey: 'story_loop_sync'")
    expect(draftBlock).toContain('const draftInformationFlowSync = buildInformationFlowSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'information_flow_sync'")
    expect(draftBlock).toContain("payloadKey: 'information_flow_sync'")
    expect(draftBlock).toContain('const draftEmotionalArcSync = buildEmotionalArcSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'emotional_arc_sync'")
    expect(draftBlock).toContain("payloadKey: 'emotional_arc_sync'")
    expect(draftBlock).toContain('const draftCharacterArcSync = buildCharacterArcSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'character_arc_sync'")
    expect(draftBlock).toContain("payloadKey: 'character_arc_sync'")
  })
  test('returns blueprint benchmark style sync in draft review only summaries', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('return await runFullProductionAdmissionAndStore', draftReviewOnlyStart)
    const draftBlock = [source.slice(draftReviewOnlyStart, draftReviewOnlyEnd), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')

    expect(draftBlock).toContain('const draftChapterBlueprintSync = buildChapterBlueprintSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'chapter_blueprint_sync'")
    expect(draftBlock).toContain("payloadKey: 'chapter_blueprint_sync'")
    expect(draftBlock).toContain('const draftChapterBenchmarkSync = buildChapterBenchmarkSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'chapter_benchmark_sync'")
    expect(draftBlock).toContain("payloadKey: 'chapter_benchmark_sync'")
    expect(draftBlock).toContain('const draftBenchmarkRecallSync = buildBenchmarkRecallSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'benchmark_recall_sync'")
    expect(draftBlock).toContain("payloadKey: 'benchmark_recall_sync'")
    expect(draftBlock).toContain('const draftStyleBoundarySync = buildStyleBoundarySyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'style_boundary_sync'")
    expect(draftBlock).toContain("payloadKey: 'style_boundary_sync'")
    expect(draftBlock).toContain('const draftStyleSampleSync = buildStyleSampleSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain('buildStyleSampleDraftReviewRecord({ projectId, chapter, sync: draftStyleSampleSync })')
    expect(draftBlock).toContain('styleSampleSync: draftStyleSampleSync')
    expect(draftBlock).toContain('const draftInnovationSync = buildInnovationSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'innovation_sync'")
    expect(draftBlock).toContain("payloadKey: 'innovation_sync'")
    expect(draftBlock).toContain('const draftVolumeBeatSync = buildVolumeBeatSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'volume_beat_sync'")
    expect(draftBlock).toContain("payloadKey: 'volume_beat_sync'")
    expect(draftBlock).toContain('const draftRunwaySync = buildRunwaySyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'runway_sync'")
    expect(draftBlock).toContain("payloadKey: 'runway_sync'")
  })
  test('returns remaining deterministic story sync in draft review only summaries', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('return await runFullProductionAdmissionAndStore', draftReviewOnlyStart)
    const draftBlock = [source.slice(draftReviewOnlyStart, draftReviewOnlyEnd), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')

    expect(draftBlock).toContain('const draftChapterAttractionReview = buildChapterAttractionReviewReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain('buildChapterAttractionDraftReviewRecord({ projectId, chapter, sync: draftChapterAttractionReview })')
    expect(draftBlock).toContain('chapterAttractionReview: draftChapterAttractionReview')
    expect(draftBlock).toContain('const draftPunctuationToneSync = buildPunctuationToneSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'punctuation_tone_sync'")
    expect(draftBlock).toContain("payloadKey: 'punctuation_tone_sync'")
    expect(draftBlock).toContain('const draftSignatureSceneSync = buildSignatureSceneSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain('buildSignatureSceneDraftReviewRecord({ projectId, chapter, sync: draftSignatureSceneSync })')
    expect(draftBlock).toContain('signatureSceneSync: draftSignatureSceneSync')
    expect(draftBlock).toContain('const draftStoryUnitSync = buildStoryUnitSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain('buildStoryUnitDraftReviewRecord({ projectId, chapter, sync: draftStoryUnitSync })')
    expect(draftBlock).toContain('storyUnitSync: draftStoryUnitSync')
  })
  test('returns core drift and contract sync in draft review only summaries', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('return await runFullProductionAdmissionAndStore', draftReviewOnlyStart)
    const draftBlock = [source.slice(draftReviewOnlyStart, draftReviewOnlyEnd), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')

    expect(draftBlock).toContain('const draftCoreDrift = buildChapterCoreDriftReport(project, updatedReviewedDraft || chapter, contextPackage, finalText, { missed: [], forbidden_touched: [] })')
    expect(draftBlock).toContain('buildChapterCoreDriftDraftReviewRecord({ projectId, chapter, sync: draftCoreDrift })')
    expect(draftBlock).toContain('coreDrift: draftCoreDrift')
    expect(draftBlock).toContain('const draftCoreContractSync = buildCoreContractSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain('buildCoreContractDraftReviewRecord({ projectId, chapter, sync: draftCoreContractSync })')
    expect(draftBlock).toContain('coreContractSync: draftCoreContractSync')
  })
  test('queues prose sync diagnostics until minimal validation and atomic acceptance complete', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const storeFnsStart = source.indexOf('const storeGeneratedReviewRecord = async (record: any) =>', groupStart)
    const preGateStart = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', storeFnsStart)
    const storeFnsBlock = source.slice(storeFnsStart, source.indexOf('let chapters = await listNovelChapters', storeFnsStart))
    const preGateBlock = source.slice(preGateStart, source.indexOf('const referenceReport =', preGateStart))
    const hardAdmissionStart = source.indexOf('const hardAdmission = classifyProseAdmission({', preGateStart)
    const atomicCommitStart = source.indexOf('acceptance = await commitNovelChapterAcceptance(activeWorkspace, {', preGateStart)
    const atomicCommitBlock = source.slice(atomicCommitStart, source.indexOf('const updated = acceptance.chapter', atomicCommitStart))

    expect(storeFnsStart).toBeGreaterThan(groupStart)
    expect(preGateStart).toBeGreaterThan(storeFnsStart)
    expect(storeFnsBlock).toContain('pendingGeneratedReviews.push(record)')
    expect(preGateBlock).not.toContain('createNovelReview')
    expect(hardAdmissionStart).toBeGreaterThan(preGateStart)
    expect(atomicCommitStart).toBeGreaterThan(hardAdmissionStart)
    expect(atomicCommitBlock).toContain('...pendingGeneratedReviews')
  })
  test('records pre-store quality failures as warnings instead of approval errors', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const preGateStart = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', groupStart)
    const warningStart = source.indexOf('qualityWarningCandidates.push(', preGateStart)
    const hardAdmissionStart = source.indexOf('const hardAdmission = classifyProseAdmission({', preGateStart)
    const preGateBlock = source.slice(preGateStart, hardAdmissionStart)

    expect(preGateStart).toBeGreaterThan(groupStart)
    expect(warningStart).toBeGreaterThan(preGateStart)
    expect(hardAdmissionStart).toBeGreaterThan(warningStart)
    expect(preGateBlock).toContain("proseAdmissionWarning('quality', failure?.key || 'quality_gate'")
    expect(preGateBlock).not.toContain("buildApprovalError('quality_gate'")
  })
  test('keeps explicit safety blocks hard while recording final quality failures as warnings', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const finalGateStart = source.indexOf('const finalQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview, safetyDecision)', groupStart)
    const safetyBlockStart = source.indexOf('if (safetyDecision.blocked)', finalGateStart)
    const warningStart = source.indexOf('qualityWarningCandidates.push(', safetyBlockStart)
    const storyStateStart = source.indexOf("await onStage('story_state', { status: 'running', phase: 'prepare' })", warningStart)
    const finalGateBlock = source.slice(finalGateStart, storyStateStart)

    expect(finalGateStart).toBeGreaterThan(groupStart)
    expect(safetyBlockStart).toBeGreaterThan(finalGateStart)
    expect(warningStart).toBeGreaterThan(safetyBlockStart)
    expect(finalGateBlock).toContain("code: 'REFERENCE_SAFETY_BLOCKED'")
    expect(finalGateBlock).toContain("proseAdmissionWarning('quality', failure?.key || 'final_quality_gate'")
    expect(finalGateBlock).not.toContain("buildApprovalError('quality_gate'")
  })
  test('converts low-score and draft approval policies into review warnings', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const lowScoreStart = source.indexOf("if (approvalRequired(approvalPolicy, 'low_score'", groupStart)
    const draftStart = source.indexOf("if (approvalRequired(approvalPolicy, 'draft'", lowScoreStart)
    const hardAdmissionStart = source.indexOf('const hardAdmission = classifyProseAdmission({', draftStart)
    const warningBlock = source.slice(lowScoreStart, hardAdmissionStart)

    expect(lowScoreStart).toBeGreaterThan(groupStart)
    expect(draftStart).toBeGreaterThan(lowScoreStart)
    expect(hardAdmissionStart).toBeGreaterThan(draftStart)
    expect(warningBlock).toContain("proseAdmissionWarning('quality', 'low_score_approval'")
    expect(warningBlock).toContain("proseAdmissionWarning('review', 'draft_approval'")
    expect(warningBlock).not.toContain("buildApprovalError('low_score'")
    expect(warningBlock).not.toContain("buildApprovalError('draft'")
  })
  test('keeps explicit reference safety blocks hard and records review-only safety concerns as warnings', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8')].join('\n')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const safetyBlockedStart = source.indexOf('if (safetyDecision.blocked)', groupStart)
    const safetyBlockedThrowStart = source.indexOf("const error = Object.assign(new Error('仿写安全阈值未通过')", safetyBlockedStart)
    const safetyBlockedBlock = source.slice(safetyBlockedStart, safetyBlockedThrowStart)
    const safetyApprovalStart = source.indexOf("const safetyApprovalRequired = approvalRequired(approvalPolicy, 'safety'", safetyBlockedThrowStart)
    const storyStateStart = source.indexOf("await onStage('story_state', { status: 'running', phase: 'prepare' })", safetyApprovalStart)
    const safetyApprovalBlock = source.slice(safetyApprovalStart, storyStateStart)

    expect(safetyBlockedStart).toBeGreaterThan(groupStart)
    expect(safetyBlockedThrowStart).toBeGreaterThan(safetyBlockedStart)
    expect(safetyBlockedBlock).not.toContain('createNovelReview')

    expect(safetyApprovalStart).toBeGreaterThan(safetyBlockedThrowStart)
    expect(storyStateStart).toBeGreaterThan(safetyApprovalStart)
    expect(safetyApprovalBlock).toContain("proseAdmissionWarning('review', 'safety_review'")
    expect(safetyApprovalBlock).not.toContain("buildApprovalError('safety'")
  })
  test('passes deterministic cleanup report into cleanup repair prompts', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )

    expect(revisionPrompt).toContain('deterministic_prose_cleanup')
    expect(revisionPrompt).toContain('【确定性清理报告 deterministic_prose_cleanup】')
    expect(revisionPrompt).toContain('deterministic_prose_cleanup.payoff_density')
    expect(revisionPrompt).toContain('短周期读者回报')
    expect(reviewNormalizeBlock).toContain('deterministic_prose_cleanup')
    expect(reviewNormalizeBlock).toContain('options.deterministic_prose_cleanup')
  })
  test('asks prose self review and revision to enforce oh-story dialogue checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const shouldReviseBlock = source.slice(
      source.indexOf('const shouldReviseProse'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )

    expect(reviewPrompt).toContain('chapter_target.dialogue_contract')
    expect(reviewPrompt).toContain('dialogue_checks')
    expect(reviewPrompt).toContain('潜台词')
    expect(reviewPrompt).toContain('对话长度 = 权力地位')
    expect(reviewPrompt).toContain('压制模式')
    expect(reviewPrompt).toContain('掌控者/主角亮底牌时对白 ≤ 10 字')
    expect(reviewPrompt).toContain('真实动机绝对不能浅显地写在台词里')
    expect(reviewPrompt).toContain('关系 × 场合 × 目的 = 语气')
    expect(reviewPrompt).toContain('命令式+否定式最能激发读者情绪')
    expect(reviewPrompt).toContain('每次转变需对应事件触发')
    expect(reviewPrompt).toContain('对话本身带来/强化某个核心驱动力')
    expect(reviewPrompt).toContain('用角色的语气和立场包裹信息')
    expect(reviewPrompt).toContain('设定用到哪个稍微带出来')
    expect(reviewPrompt).toContain('口癖和惯用语')
    expect(reviewPrompt).toContain('说话节奏')
    expect(reviewPrompt).toContain('信息偏好')
    expect(reviewPrompt).toContain('身份影响措辞')
    expect(reviewPrompt).toContain('关系阶段不同')
    expect(reviewPrompt).toContain('弹幕/群众对话')
    expect(reviewPrompt).toContain('普通人震惊')
    expect(reviewPrompt).toContain('专业人士分析')
    expect(reviewPrompt).toContain('不代替主线')
    expect(reviewPrompt).toContain('对话节奏/呼吸感')
    expect(reviewPrompt).toContain('连续多轮对话后需要换气')
    expect(reviewPrompt).toContain('关键信息放对话开头或结尾')
    expect(reviewPrompt).toContain('对话篇幅控制')
    expect(reviewPrompt).toContain('读者已知信息')
    expect(reviewPrompt).toContain('突发状况替代')
    expect(reviewPrompt).toContain('主角旁白平铺直叙')
    expect(reviewPrompt).toContain('梗式对白')
    expect(reviewPrompt).toContain('说不出来但意思到了')
    expect(reviewPrompt).toContain('不得直接复刻')
    expect(reviewPrompt).toContain('对话质量审计')
    expect(reviewPrompt).toContain('大量信息都必须用对话来展示')
    expect(reviewPrompt).toContain('问答式的一问一答')
    expect(reviewPrompt).toContain('依赖对话来推动剧情或人物变化')
    expect(reviewPrompt).toContain('遮住角色名后能否区分')
    expect(reviewPrompt).toContain('单次对话不超过全节 40%')
    expect(reviewPrompt).toContain('自然口语交流')
    expect(reviewPrompt).toContain('对话结尾能否预示接下来的节奏变化')
    expect(revisionPrompt).toContain('dialogue_checks')
    expect(revisionPrompt).toContain('对白')
    expect(revisionPrompt).toContain('压制/反转/心死模式')
    expect(revisionPrompt).toContain('短句方成为权力上位')
    expect(revisionPrompt).toContain('把真实目的改成借口、试探、回避或动作反应')
    expect(revisionPrompt).toContain('按关系、场合、目的重定语气')
    expect(revisionPrompt).toContain('用命令式、否定式或为你好式压迫制造情绪')
    expect(revisionPrompt).toContain('按事件→情绪反应→内心思考→采取行动修复跳步')
    expect(revisionPrompt).toContain('把说明书式设定改成角色语气、立场、追问、误导或动作承接')
    expect(revisionPrompt).toContain('用下行质疑、上行证据和核心信息兑现形成信息拉扯')
    expect(revisionPrompt).toContain('按口癖、节奏、信息偏好、身份措辞和关系阶段重写角色声线')
    expect(revisionPrompt).toContain('按普通人震惊、专业人士分析、特殊身份者反应重排群众/弹幕递进')
    expect(revisionPrompt).toContain('每条群众反应短小精悍')
    expect(revisionPrompt).toContain('连续多轮对话后插入换气')
    expect(revisionPrompt).toContain('紧张段落改短促')
    expect(revisionPrompt).toContain('关键信息放到对话开头或结尾')
    expect(revisionPrompt).toContain('读者已知信息改成叙事一句话概括')
    expect(revisionPrompt).toContain('能用突发状况替代的对话直接替换')
    expect(revisionPrompt).toContain('用配角对话替代主角旁白平铺直叙')
    expect(revisionPrompt).toContain('把梗式对白改成角色说不出来但意思到了的口吻')
    expect(revisionPrompt).toContain('不得直接复刻热梗原句')
    expect(revisionPrompt).toContain('把大量信息必须靠对白展示的段落拆成情节、心理、旁白、环境或动作')
    expect(revisionPrompt).toContain('把问答式的一问一答改成主动发言、反应、动作、沉默和心理承接')
    expect(revisionPrompt).toContain('遮住角色名仍能区分是谁在说话')
    expect(revisionPrompt).toContain('单次对话不超过全节 40%')
    expect(revisionPrompt).toContain('逐句改成自然口语交流')
    expect(revisionPrompt).toContain('让对话结尾预示接下来的节奏变化')
    expect(shouldReviseBlock).toContain('dialogue_checks')
    expect(reviewNormalizeBlock).toContain('dialogue_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.dialogue_checks')
  })
  test('asks prose self review and revision to enforce oh-story plot dynamics checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const shouldReviseBlock = source.slice(
      source.indexOf('const shouldReviseProse'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )

    expect(reviewPrompt).toContain('chapter_target.plot_dynamics_contract')
    expect(reviewPrompt).toContain('plot_dynamics_checks')
    expect(reviewPrompt).toContain('目标→阻碍→行动')
    expect(reviewPrompt).toContain('蓄能→假胜→崩解')
    expect(reviewPrompt).toContain('主线和支线错开')
    expect(revisionPrompt).toContain('plot_dynamics_checks')
    expect(revisionPrompt).toContain('剧情动力')
    expect(revisionPrompt).toContain('多线错峰')
    expect(shouldReviseBlock).toContain('plot_dynamics_checks')
    expect(reviewNormalizeBlock).toContain('plot_dynamics_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.plot_dynamics_checks')
  })
  test('asks prose self review and revision to enforce oh-story story power checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const shouldReviseBlock = source.slice(
      source.indexOf('const shouldReviseProse'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )

    expect(reviewPrompt).toContain('chapter_target.story_power_contract')
    expect(reviewPrompt).toContain('story_power_checks')
    expect(reviewPrompt).toContain('故事五维')
    expect(reviewPrompt).toContain('有动作才是故事')
    expect(reviewPrompt).toContain('因果反馈')
    expect(revisionPrompt).toContain('story_power_checks')
    expect(revisionPrompt).toContain('故事力')
    expect(revisionPrompt).toContain('行动改变局势')
    expect(shouldReviseBlock).toContain('story_power_checks')
    expect(reviewNormalizeBlock).toContain('story_power_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.story_power_checks')
  })
  test('builds a deterministic story power sync report', () => {
    const contextPackage = {
      chapter_target: {
        story_power_contract: {
          story_power_dimensions: ['故事五维：目标、阻碍、动作、反馈、期待'],
          action_rules: ['有动作才是故事：主角必须用动作改变局势。'],
          beginning_end_rules: ['有始有终：开场目标必须在章末形成状态变化。'],
          causal_feedback_rules: ['因果反馈：动作必须带来代价、信息或关系变化。'],
          quality_checks: ['行动是否改变局势。'],
        },
      },
    }

    const report = buildStoryPowerSyncReport(
      { title: '寒门阵师' },
      { id: 9, chapter_no: 11, title: '阵盘入局' },
      contextPackage,
      '主角当众押上裂纹阵盘。执事封锁证物，他没有退，反手启动残阵。阵纹反向亮起，证人脸色发白，内门库房第一次被指向。这个动作让旧案从无头案变成可追查的线索。',
    )

    expect(report.status).toBe('ok')
    expect(report.label).toContain('故事力')
    expect(report.quality_checks.join('｜')).toContain('行动是否改变局势')
    expect(report.delivered.map((item: any) => item.key).join('｜')).toContain('action_rules')
    expect(report.delivered.map((item: any) => item.key).join('｜')).toContain('causal_feedback_rules')
  })
  test('asks prose self review and revision to enforce oh-story continuity heat checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const shouldReviseBlock = source.slice(
      source.indexOf('const shouldReviseProse'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )

    expect(reviewPrompt).toContain('chapter_target.continuity_heat_contract')
    expect(reviewPrompt).toContain('continuity_heat_checks')
    expect(reviewPrompt).toContain('hot/warm/cold/archived')
    expect(revisionPrompt).toContain('continuity_heat_checks')
    expect(revisionPrompt).toContain('连续性热度')
    expect(shouldReviseBlock).toContain('continuity_heat_checks')
    expect(reviewNormalizeBlock).toContain('continuity_heat_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.continuity_heat_checks')
  })
  test('asks prose self review and revision to enforce oh-story character relation checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const shouldReviseBlock = source.slice(
      source.indexOf('const shouldReviseProse'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )

    expect(reviewPrompt).toContain('chapter_target.character_relation_contract')
    expect(reviewPrompt).toContain('character_relation_checks')
    expect(reviewPrompt).toContain('关系类型明确')
    expect(reviewPrompt).toContain('配角期待枢纽')
    expect(reviewPrompt).toContain('任务基地')
    expect(reviewPrompt).toContain('短期和长期期待')
    expect(revisionPrompt).toContain('character_relation_checks')
    expect(revisionPrompt).toContain('角色关系')
    expect(revisionPrompt).toContain('配角期待枢纽')
    expect(revisionPrompt).toContain('人物扣')
    expect(shouldReviseBlock).toContain('character_relation_checks')
    expect(reviewNormalizeBlock).toContain('character_relation_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.character_relation_checks')
  })
  test('asks prose self review and revision to enforce oh-story information flow checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const shouldReviseBlock = source.slice(
      source.indexOf('const shouldReviseProse'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )

    expect(reviewPrompt).toContain('chapter_target.information_flow_contract')
    expect(reviewPrompt).toContain('information_flow_checks')
    expect(reviewPrompt).toContain('信息团')
    expect(revisionPrompt).toContain('information_flow_checks')
    expect(revisionPrompt).toContain('信息团衔接')
    expect(shouldReviseBlock).toContain('information_flow_checks')
    expect(reviewNormalizeBlock).toContain('information_flow_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.information_flow_checks')
  })
})

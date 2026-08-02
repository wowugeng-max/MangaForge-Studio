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
    'prose-quality-risks-specialty.ts',
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
    readFileSync(join(serviceDir, 'generate-chapter-quality-prestore-loop.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-quality-prestore-finalize.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-draft-mode-store.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-full-production-store.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-acceptance-prep.ts'), 'utf8'),
    readFileSync(join(postDeliveryDir, 'post-commit-sync-bundle.ts'), 'utf8'),
  ].join('\n')
}

describe('chapter context contracts a b', () => {
  test('asks prose self review and revision to enforce oh-story expectation threshold checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
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
    const riskSource = proseQualityRisksSource()
    const riskStart = riskSource.indexOf('export function proseQualityExpectationThresholdRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.expectation_threshold_contract')
    expect(reviewPrompt).toContain('expectation_threshold_checks')
    expect(reviewPrompt).toContain('两长一短')
    expect(reviewPrompt).toContain('设门槛')
    expect(reviewPrompt).toContain('期待感 > 爽点')
    expect(reviewPrompt).toContain('期待接力法')
    expect(revisionPrompt).toContain('expectation_threshold_checks')
    expect(revisionPrompt).toContain('期待门槛')
    expect(revisionPrompt).toContain('期待铺垫')
    expect(revisionPrompt).toContain('闭环一个期待')
    expect(shouldReviseBlock).toContain('expectation_threshold_checks')
    expect(reviewNormalizeBlock).toContain('expectation_threshold_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.expectation_threshold_checks')
    expect(riskCarryOverBlock).toContain('expectation_threshold_checks')
    expect(riskCarryOverBlock).toContain('期待门槛')
  })
  test('asks prose self review and revision to enforce oh-story target reader checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
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
    const riskSource = proseQualityRisksSource()
    const riskStart = riskSource.indexOf('export function proseQualityTargetReaderRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.target_reader_contract')
    expect(reviewPrompt).toContain('target_reader_checks')
    expect(reviewPrompt).toContain('target_reader_profile')
    expect(reviewPrompt).toContain('reader_desire')
    expect(reviewPrompt).toContain('emotion_gap')
    expect(reviewPrompt).toContain('chapter_hit')
    expect(reviewPrompt).toContain('platform_taste')
    expect(reviewPrompt).toContain('自嗨判定')
    expect(reviewPrompt).toContain('我这书写给谁看')
    expect(reviewPrompt).toContain('情绪缺口')
    expect(reviewPrompt).toContain('核心痛苦')
    expect(reviewPrompt).toContain('深层情结')
    expect(reviewPrompt).toContain('高频情绪关键词')
    expect(reviewPrompt).toContain('题材生命力')
    expect(reviewPrompt).toContain('目标平台样本')
    expect(reviewPrompt).toContain('题材边界')
    expect(reviewPrompt).toContain('书名简介内容三位一体')
    expect(reviewPrompt).toContain('代入感/塑料感')
    expect(reviewPrompt).toContain('金手指生活关联')
    expect(reviewPrompt).toContain('私人表达')
    expect(revisionPrompt).toContain('target_reader_checks')
    expect(revisionPrompt).toContain('目标读者')
    expect(revisionPrompt).toContain('情绪缺口')
    expect(revisionPrompt).toContain('核心痛苦')
    expect(revisionPrompt).toContain('未满足需求')
    expect(revisionPrompt).toContain('目标平台样本')
    expect(revisionPrompt).toContain('书名简介内容')
    expect(revisionPrompt).toContain('世界观自洽')
    expect(revisionPrompt).toContain('私人表达')
    expect(shouldReviseBlock).toContain('target_reader_checks')
    expect(reviewNormalizeBlock).toContain('target_reader_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.target_reader_checks')
    expect(riskCarryOverBlock).toContain('target_reader_checks')
    expect(riskCarryOverBlock).toContain('目标读者')
  })
  test('asks prose self review and revision to enforce oh-story genre positioning checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
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
    const riskSource = proseQualityRisksSource()
    const riskStart = riskSource.indexOf('export function proseQualityGenrePositioningRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.genre_positioning_contract')
    expect(reviewPrompt).toContain('genre_positioning_checks')
    expect(reviewPrompt).toContain('genre_tag')
    expect(reviewPrompt).toContain('core_hook')
    expect(reviewPrompt).toContain('type_formula')
    expect(reviewPrompt).toContain('genre_strength')
    expect(reviewPrompt).toContain('book_title_blurb_alignment')
    expect(reviewPrompt).toContain('核心梗')
    expect(reviewPrompt).toContain('挂羊头卖狗肉')
    expect(reviewPrompt).toContain('拉长板而非补短板')
    expect(reviewPrompt).toContain('题材长板')
    expect(reviewPrompt).toContain('70/20/10元素法则')
    expect(reviewPrompt).toContain('五种微创新手法')
    expect(revisionPrompt).toContain('genre_positioning_checks')
    expect(revisionPrompt).toContain('题材定位')
    expect(revisionPrompt).toContain('长板')
    expect(revisionPrompt).toContain('稀释核心卖点')
    expect(revisionPrompt).toContain('70/20/10')
    expect(shouldReviseBlock).toContain('genre_positioning_checks')
    expect(reviewNormalizeBlock).toContain('genre_positioning_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.genre_positioning_checks')
    expect(riskCarryOverBlock).toContain('genre_positioning_checks')
    expect(riskCarryOverBlock).toContain('题材定位')
  })
  test('asks prose self review and revision to enforce oh-story plot special topic checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
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
    const structuredFieldsSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/structured-review-fields.ts'), 'utf8')
    const structuredFieldsBlock = structuredFieldsSource.slice(
      structuredFieldsSource.indexOf('export const STRUCTURED_REVIEW_CHECK_FIELDS'),
      structuredFieldsSource.indexOf('export const STRUCTURED_REVIEW_REQUIRED_FIELDS'),
    )
    const riskSource = proseQualityRisksSource()
    const riskStart = riskSource.indexOf('export function proseQualityPlotSpecialTopicsRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.plot_special_topics_contract')
    expect(reviewPrompt).toContain('plot_special_topics_checks')
    expect(reviewPrompt).toContain('matched_topics')
    expect(reviewPrompt).toContain('goldfinger_execution')
    expect(reviewPrompt).toContain('genre_boundary_execution')
    expect(reviewPrompt).toContain('launch_checkpoint_execution')
    expect(reviewPrompt).toContain('faction_hand_execution')
    expect(reviewPrompt).toContain('题材边界')
    expect(reviewPrompt).toContain('三万字卡点')
    expect(revisionPrompt).toContain('plot_special_topics_checks')
    expect(revisionPrompt).toContain('特殊题材')
    expect(shouldReviseBlock).toContain('plot_special_topics_checks')
    expect(reviewNormalizeBlock).toContain('plot_special_topics_checks')
    expect(source).toContain('reviewPayload?.plot_special_topics_checks')
    expect(structuredFieldsBlock).toContain('plot_special_topics_checks')
    expect(riskCarryOverBlock).toContain('plot_special_topics_checks')
    expect(riskCarryOverBlock).toContain('特殊题材')
  })
  test('asks prose self review and revision to enforce oh-story female audience checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
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

    expect(reviewPrompt).toContain('chapter_target.female_audience_contract')
    expect(reviewPrompt).toContain('female_audience_checks')
    expect(reviewPrompt).toContain('安全感优先')
    expect(reviewPrompt).toContain('代入感优先')
    expect(reviewPrompt).toContain('女主主动性')
    expect(reviewPrompt).toContain('情绪即产品')
    expect(reviewPrompt).toContain('货板一致')
    expect(revisionPrompt).toContain('female_audience_checks')
    expect(revisionPrompt).toContain('女频长篇')
    expect(revisionPrompt).toContain('补安全感锚点')
    expect(revisionPrompt).toContain('把女主被动改成女主自己做决定')
    expect(revisionPrompt).toContain('感情升级踩到事业/成长节点')
    expect(revisionPrompt).toContain('虐后补反转或糖')
    expect(shouldReviseBlock).toContain('female_audience_checks')
    expect(reviewNormalizeBlock).toContain('female_audience_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.female_audience_checks')
  })
  test('names required rich contract fields in prose self review prompt', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const requiredFieldsByCheck = {
      content_rubric_checks: ['core_selling_point', 'conflict_progression', 'chapter_change', 'page_turn_reason'],
      quality_audit_checks: ['strategy', 'purpose_tag', 'density_change', 'conflict_bound_info', 'changed_evidence'],
      core_contract_checks: ['core_promise', 'mainline_service', 'core_emotion', 'rule_judgement', 'ending_question'],
      innovation_checks: ['innovation_type', 'differentiating_mechanism', 'visualized_scene', 'reader_retellable_hook', 'long_term_fit'],
      chapter_attraction_checks: ['attraction_dimension', 'opening_hook', 'scene_goal_obstacle_turn_reward', 'payoff_density', 'ending_page_turn', 'spreadable_scene'],
      story_drive_checks: ['protagonist_choice', 'obstacle', 'cost', 'state_change', 'next_causality'],
      character_arc_checks: ['character', 'desire', 'flaw_pressure', 'relationship_change', 'growth_beat', 'voice_anchor'],
      chapter_benchmark_checks: ['benchmark_dimension', 'expected_method', 'delivered_evidence', 'originality_guard'],
      title_uniqueness_checks: ['old_title', 'new_title', 'outline_title_synced', 'file_name_synced', 'chapter_title_line_synced'],
      prose_meta_checks: ['matched_term', 'location', 'replacement'],
      banned_words_checks: ['matched_word', 'level', 'location', 'replacement'],
      blueprint_consumption_checks: ['blueprint_field', 'expected', 'delivered_evidence', 'missing_gap'],
      word_count_checks: ['current_count', 'target_count', 'min_required_count'],
      female_audience_checks: ['security_anchor', 'reader_identification', 'heroine_agency', 'relationship_axis', 'post_abuse_payoff'],
      upgrade_rhythm_checks: ['before_after_contrast', 'instant_feedback', 'delayed_feedback', 'new_threshold', 'cheat_rule'],
      structure_checks: ['opening_hook', 'middle_progression', 'situation_change', 'ending_page_turn'],
      progression_checks: ['non_deletable_change', 'mainline_shift', 'relationship_or_state_change', 'compressed_water'],
      information_checks: ['new_concept_count', 'action_bound_info', 'conflict_release', 'reader_first_scene'],
      style_boundary_checks: ['reference_risk', 'rewritten_with_local_action', 'voice_anchor', 'copied_phrase_removed'],
      information_flow_checks: ['reveal_order', 'withheld_question', 'action_bound_release', 'conflict_or_cost'],
      expectation_threshold_checks: ['reader_question', 'stakes', 'choice_pressure', 'payoff_promise', 'next_chapter_pull'],
      story_loop_checks: ['setup_question', 'obstacle', 'choice', 'cost', 'payoff_or_answer_fragment', 'new_question'],
      emotional_arc_checks: ['calm_or_pressure', 'mobilization', 'counteraction', 'release', 'reader_payoff'],
      chapter_hook_checks: ['hook_position', 'trigger', 'reader_question', 'next_chapter_pressure', 'delivered_evidence'],
      chapter_hook_quality_checks: ['hook_position', 'trigger_type', 'concrete_question', 'danger_or_choice', 'next_action_link'],
      paragraph_hook_checks: ['paragraph_range', 'hook_type', 'micro_change', 'information_or_risk_delta', 'emotion_or_relation_delta'],
      suspense_checks: ['question', 'misdirect', 'partial_answer', 'new_expectation'],
      asset_linkage_checks: ['asset_name', 'function', 'ownership', 'trigger_condition', 'limitation', 'consequence', 'story_link'],
      dialogue_checks: ['speaker', 'agenda', 'subtext', 'power_shift', 'information_delta', 'character_voice'],
      plot_dynamics_checks: ['goal', 'obstacle', 'action', 'cost_or_feedback', 'new_expectation'],
      continuity_heat_checks: ['heat_state', 'hot_progress', 'warm_keepalive', 'cold_warmup', 'archived_boundary'],
      character_relation_checks: ['relation_type', 'protagonist_goal', 'agency_choice', 'cost', 'relation_shift'],
      character_behavior_checks: ['character', 'concrete_motive', 'emotional_reason', 'trigger_change', 'visible_choice', 'cost'],
      conflict_structure_checks: ['blocker', 'no_exit_condition', 'stakes_or_exit_cost', 'action_block', 'win_loss_result'],
      state_tracking_checks: ['state_subject', 'state_type', 'previous_state', 'allowed_state', 'used_in_chapter', 'excluded_reason'],
      opening_checks: ['protagonist_entry', 'first_300_goal', 'first_1000_expectation', 'opening_principle'],
      bridge_unit_checks: ['bridge_position', 'old_expectation_payoff', 'new_expectation_seed', 'goal_progression', 'climax_hook', 'stage_handoff'],
      reversal_checks: ['reversal_type', 'fair_clues', 'misdirect', 'reveal_timing', 'impact_after_reveal'],
      showdown_checks: ['payoff_release', 'trump_card_used', 'pressure_layers', 'audience_reactions', 'consequence', 'next_threshold'],
      prose_craft_checks: ['pov_depth', 'body_detail', 'environment_interaction', 'action_stillness_balance', 'crowd_reaction_layering'],
      serial_risk_repair_checks: ['risk_type', 'repair_receipt', 'continuity_change', 'state_change'],
      revision_receipt_checks: ['required_action', 'repair_segment', 'applied_fix', 'changed_evidence'],
      deslop_repair_checks: ['gate', 'original_risk', 'rewritten_evidence', 'changed_evidence', 'receipt_synced'],
      status_filter_receipts: ['used_in_chapter', 'excluded_reason'],
      next_chapter_quality_plan_receipts: ['delivered', 'evidence', 'remaining_risk'],
      longform_checks: ['recent_5_chapter_progress', 'payoff_interval', 'stage_goal_shift', 'next_stage_pull', 'context_layer'],
      punctuation_tone_checks: ['speaker', 'punctuation_issue', 'tone_intent', 'replacement', 'voice_difference'],
    }

    for (const [checkField, requiredFields] of Object.entries(requiredFieldsByCheck)) {
      expect(reviewPrompt).toContain(checkField)
      for (const field of requiredFields) {
        expect(reviewPrompt).toContain(field)
      }
    }
  })
  test('asks prose self review and revision to enforce oh-story showdown checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
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

    expect(reviewPrompt).toContain('chapter_target.showdown_contract')
    expect(reviewPrompt).toContain('showdown_checks')
    expect(reviewPrompt).toContain('爽点释放')
    expect(reviewPrompt).toContain('群众层 -> 中间层 -> 核心层')
    expect(reviewPrompt).toContain('打斗是一场表演')
    expect(reviewPrompt).toContain('三层破局')
    expect(reviewPrompt).toContain('预判反制')
    expect(reviewPrompt).toContain('反预判')
    expect(reviewPrompt).toContain('无敌文主角不拖拉')
    expect(reviewPrompt).toContain('主角登场即杀伐果断')
    expect(revisionPrompt).toContain('showdown_checks')
    expect(revisionPrompt).toContain('高潮对抗')
    expect(revisionPrompt).toContain('补爽点释放强度')
    expect(revisionPrompt).toContain('群众层/中间层/核心层')
    expect(revisionPrompt).toContain('反派出A')
    expect(revisionPrompt).toContain('预设B')
    expect(revisionPrompt).toContain('不一击必杀时必须有明确理由')
    expect(revisionPrompt).toContain('急-缓-急')
    expect(shouldReviseBlock).toContain('showdown_checks')
    expect(reviewNormalizeBlock).toContain('showdown_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.showdown_checks')
  })
  test('asks prose self review and revision to enforce oh-story bridge unit checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
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

    expect(reviewPrompt).toContain('chapter_target.bridge_unit_contract')
    expect(reviewPrompt).toContain('bridge_unit_checks')
    expect(reviewPrompt).toContain('四章一桥段')
    expect(reviewPrompt).toContain('连续 2 章没有目标推进')
    expect(revisionPrompt).toContain('bridge_unit_checks')
    expect(revisionPrompt).toContain('桥段节奏')
    expect(revisionPrompt).toContain('补连续期待')
    expect(revisionPrompt).toContain('高潮中埋钩子')
    expect(revisionPrompt).toContain('连续小期待')
    expect(shouldReviseBlock).toContain('bridge_unit_checks')
    expect(reviewNormalizeBlock).toContain('bridge_unit_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.bridge_unit_checks')
  })
  test('asks prose self review and revision to enforce oh-story upgrade rhythm checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
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
    const riskSource = proseQualityRisksSource()
    const riskStart = riskSource.indexOf('export function proseQualityUpgradeRhythmRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.upgrade_rhythm_contract')
    expect(reviewPrompt).toContain('upgrade_rhythm_checks')
    expect(reviewPrompt).toContain('升级感三步法')
    expect(reviewPrompt).toContain('升级后能完成以前做不到的事')
    expect(reviewPrompt).toContain('金手指演进')
    expect(reviewPrompt).toContain('核心作用可发展但不能突然换赛道')
    expect(reviewPrompt).toContain('金手指简单是核心')
    expect(reviewPrompt).toContain('一眼就懂')
    expect(reviewPrompt).toContain('金手指多维成长')
    expect(reviewPrompt).toContain('词条、功能、品质')
    expect(reviewPrompt).toContain('金手指 + 矛盾')
    expect(reviewPrompt).toContain('刚好解决当前矛盾')
    expect(reviewPrompt).toContain('金手指反馈法')
    expect(reviewPrompt).toContain('掺杂在故事里')
    expect(revisionPrompt).toContain('upgrade_rhythm_checks')
    expect(revisionPrompt).toContain('升级节奏')
    expect(revisionPrompt).toContain('金手指演进')
    expect(revisionPrompt).toContain('金手指简单')
    expect(revisionPrompt).toContain('金手指多维成长')
    expect(revisionPrompt).toContain('词条、功能、品质')
    expect(revisionPrompt).toContain('金手指必须刚好解决当前矛盾')
    expect(revisionPrompt).toContain('金手指带来的变化过程掺进故事')
    expect(shouldReviseBlock).toContain('upgrade_rhythm_checks')
    expect(reviewNormalizeBlock).toContain('upgrade_rhythm_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.upgrade_rhythm_checks')
    expect(riskCarryOverBlock).toContain('upgrade_rhythm_checks')
    expect(riskCarryOverBlock).toContain('升级节奏')
  })
  test('asks prose self review and revision to enforce oh-story conflict structure checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
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
    const riskSource = proseQualityRisksSource()
    const riskStart = riskSource.indexOf('export function proseQualityConflictStructureRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.conflict_structure_contract')
    expect(reviewPrompt).toContain('conflict_structure_checks')
    expect(reviewPrompt).toContain('言语->行动')
    expect(reviewPrompt).toContain('压势不压人')
    expect(reviewPrompt).toContain('矛盾网')
    expect(reviewPrompt).toContain('2-3条矛盾线')
    expect(reviewPrompt).toContain('有进无出')
    expect(reviewPrompt).toContain('非踏入不可')
    expect(revisionPrompt).toContain('conflict_structure_checks')
    expect(revisionPrompt).toContain('冲突结构')
    expect(revisionPrompt).toContain('激活或加深')
    expect(revisionPrompt).toContain('有进无出')
    expect(shouldReviseBlock).toContain('conflict_structure_checks')
    expect(reviewNormalizeBlock).toContain('conflict_structure_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.conflict_structure_checks')
    expect(riskCarryOverBlock).toContain('conflict_structure_checks')
    expect(riskCarryOverBlock).toContain('冲突结构')
  })
  test('asks prose self review and revision to enforce oh-story character behavior checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
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
    const riskSource = proseQualityRisksSource()
    const riskStart = riskSource.indexOf('export function proseQualityCharacterBehaviorRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.character_behavior_contract')
    expect(reviewPrompt).toContain('character_behavior_checks')
    expect(reviewPrompt).toContain('主角行为三必须')
    expect(reviewPrompt).toContain('三层标签反差')
    expect(reviewPrompt).toContain('人设强关联')
    expect(reviewPrompt).toContain('每个重要角色至少 3 个强关联设定')
    expect(reviewPrompt).toContain('反派建立四要素')
    expect(reviewPrompt).toContain('实力展示')
    expect(reviewPrompt).toContain('真实威胁')
    expect(reviewPrompt).toContain('反派也有梦想')
    expect(reviewPrompt).toContain('自己故事的主人公')
    expect(reviewPrompt).toContain('理念冲突')
    expect(reviewPrompt).toContain('反派层级表')
    expect(reviewPrompt).toContain('篇幅与层级匹配')
    expect(reviewPrompt).toContain('最终Boss从第一章就有伏笔')
    expect(reviewPrompt).toContain('角色卡必备项')
    expect(reviewPrompt).toContain('配角退场规划')
    expect(reviewPrompt).toContain('行为重复点')
    expect(reviewPrompt).toContain('人推事件')
    expect(reviewPrompt).toContain('主角红线')
    expect(reviewPrompt).toContain('身份/金手指对齐')
    expect(revisionPrompt).toContain('character_behavior_checks')
    expect(revisionPrompt).toContain('角色行为')
    expect(revisionPrompt).toContain('强关联')
    expect(revisionPrompt).toContain('反派分量')
    expect(revisionPrompt).toContain('终极意图')
    expect(revisionPrompt).toContain('反派自我叙事')
    expect(revisionPrompt).toContain('创伤')
    expect(revisionPrompt).toContain('反派层级')
    expect(revisionPrompt).toContain('退场')
    expect(revisionPrompt).toContain('行为重复点')
    expect(revisionPrompt).toContain('人推事件')
    expect(revisionPrompt).toContain('主角红线')
    expect(shouldReviseBlock).toContain('character_behavior_checks')
    expect(reviewNormalizeBlock).toContain('character_behavior_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.character_behavior_checks')
    expect(riskCarryOverBlock).toContain('character_behavior_checks')
    expect(riskCarryOverBlock).toContain('角色行为')
  })
})

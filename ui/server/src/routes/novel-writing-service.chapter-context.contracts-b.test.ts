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

describe('chapter context contracts b', () => {
  test('asks prose self review and revision to enforce oh-story asset linkage checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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
    const riskStart = riskSource.indexOf('export function proseQualityAssetLinkageRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.asset_linkage_contract')
    expect(reviewPrompt).toContain('asset_linkage_checks')
    expect(reviewPrompt).toContain('孤立资产')
    expect(reviewPrompt).toContain('功能、归属、触发条件、限制、后果')
    expect(reviewPrompt).toContain('道具能力展示的8步期待模板')
    expect(reviewPrompt).toContain('鸡肋成神器')
    expect(revisionPrompt).toContain('asset_linkage_checks')
    expect(revisionPrompt).toContain('资产挂钩')
    expect(revisionPrompt).toContain('道具能力展示')
    expect(revisionPrompt).toContain('宝物功能强大')
    expect(shouldReviseBlock).toContain('asset_linkage_checks')
    expect(reviewNormalizeBlock).toContain('asset_linkage_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.asset_linkage_checks')
    expect(riskCarryOverBlock).toContain('asset_linkage_checks')
    expect(riskCarryOverBlock).toContain('资产挂钩')
  })
  test('asks prose self review and revision to enforce oh-story state tracking checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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
    const riskStart = riskSource.indexOf('export function proseQualityStateTrackingRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.state_tracking_contract')
    expect(reviewPrompt).toContain('state_tracking_checks')
    expect(reviewPrompt).toContain('source_readiness_checks')
    expect(reviewPrompt).toContain('来源就绪表')
    expect(reviewPrompt).toContain('本节速记')
    expect(reviewPrompt).toContain('角色状态、相关伏笔/前史、世界约束')
    expect(revisionPrompt).toContain('state_tracking_checks')
    expect(revisionPrompt).toContain('source_readiness_checks')
    expect(revisionPrompt).toContain('状态筛选')
    expect(revisionPrompt).toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.status_filter_receipts')
    expect(revisionPrompt).toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.source_readiness_checks')
    expect(shouldReviseBlock).toContain('state_tracking_checks')
    expect(shouldReviseBlock).toContain('source_readiness_checks')
    expect(reviewNormalizeBlock).toContain('state_tracking_checks')
    expect(reviewNormalizeBlock).toContain('source_readiness_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.state_tracking_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.source_readiness_checks')
    expect(reviewNormalizeBlock).toContain('appendMissingStatusFilterReceiptCheck')
    expect(reviewNormalizeBlock).toContain('statusFilterReceiptChecks')
    expect(reviewNormalizeBlock).toContain('source_readiness_checks || section?.sourceReadinessChecks')
    expect(reviewNormalizeBlock).toContain('const deterministicSourceReadinessChecks = buildSourceReadinessChecks(contextPackage)')
    expect(reviewNormalizeBlock).toContain('...deterministicSourceReadinessChecks')
    expect(riskCarryOverBlock).toContain('state_tracking_checks')
    expect(riskCarryOverBlock).toContain('状态筛选')
    const sourceReadinessRiskStart = riskSource.indexOf('export function proseQualitySourceReadinessRisks')
    const sourceReadinessRiskBlock = riskSource.slice(
      sourceReadinessRiskStart,
      riskSource.indexOf('\nexport function', sourceReadinessRiskStart + 1),
    )
    expect(sourceReadinessRiskBlock).toContain('source_readiness_checks')
  })
  test('asks prose self review and revision to enforce oh-story intent confirmation checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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
    const reviewNormalizeSetupBlock = source.slice(
      source.indexOf('const preDraftReceiptChecks ='),
      source.indexOf('const normalizedReview = {', source.indexOf('const preDraftReceiptChecks =')),
    )
    const riskSource = proseQualityRisksSource()
    const riskStart = riskSource.indexOf('export function proseQualityIntentConfirmationRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.intent_confirmation_contract')
    expect(reviewPrompt).toContain('intent_confirmation_checks')
    expect(reviewPrompt).toContain('intent_field')
    expect(reviewPrompt).toContain('expected_intent')
    expect(reviewPrompt).toContain('delivered_evidence')
    expect(reviewPrompt).toContain('blueprint_link')
    expect(reviewPrompt).toContain('情绪+节奏+模块+文风指令')
    expect(reviewPrompt).toContain('内容概括决定起承转合')
    expect(revisionPrompt).toContain('intent_confirmation_checks')
    expect(revisionPrompt).toContain('意图确认')
    expect(shouldReviseBlock).toContain('intent_confirmation_checks')
    expect(reviewNormalizeBlock).toContain('intent_confirmation_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.intent_confirmation_checks')
    expect(reviewNormalizeSetupBlock).toContain('preDraftExecutionReceiptSections(reviewPayload)')
    expect(reviewNormalizeBlock).toContain('section?.intent_confirmation_checks || section?.intentConfirmationChecks')
    expect(riskCarryOverBlock).toContain('intent_confirmation_checks')
    expect(riskCarryOverBlock).toContain('意图确认')
  })
  test('asks prose self review and revision to enforce write-preparation execution checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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
    const riskStart = riskSource.indexOf('export function proseQualityWritePreparationRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('write_preparation_checks')
    expect(reviewPrompt).toContain('写前准备')
    expect(reviewPrompt).toContain('creation_contract_checklist')
    expect(reviewPrompt).toContain('创作契约')
    expect(revisionPrompt).toContain('write_preparation_checks')
    expect(revisionPrompt).toContain('写前准备')
    expect(revisionPrompt).toContain('creation_contract_checklist')
    expect(revisionPrompt).toContain('创作契约')
    expect(shouldReviseBlock).toContain('write_preparation_checks')
    expect(reviewNormalizeBlock).toContain('write_preparation_checks')
    expect(source).toContain('reviewPayload?.write_preparation_checks')
    expect(reviewNormalizeBlock).toContain('write_preparation_brief')
    expect(reviewNormalizeBlock).toContain('appendMissingContractReviewCheck')
    expect(reviewNormalizeBlock).toContain("'写前准备'")
    expect(source).toContain('preDraftExecutionReceiptSections(reviewPayload)')
    expect(structuredFieldsBlock).toContain('write_preparation_checks')
    expect(riskCarryOverBlock).toContain('write_preparation_checks')
    expect(riskCarryOverBlock).toContain('写前准备')
  })
  test('asks prose self review and revision to enforce next-chapter quality plan receipts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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

    expect(reviewPrompt).toContain('next_chapter_quality_plan_receipts')
    expect(reviewPrompt).toContain('质量续航')
    expect(reviewPrompt).toContain('quality_focus')
    expect(reviewPrompt).toContain('opening_actions')
    expect(reviewPrompt).toContain('avoid_repetition')
    expect(reviewPrompt).toContain('next_chapter_quality_plan_receipts 中 opening_actions 的 evidence 必须来自前300字')
    expect(reviewPrompt).toContain('middle_actions 的 evidence 必须来自中段事件推进')
    expect(reviewPrompt).toContain('ending_actions 的 evidence 必须来自最后300字')
    expect(revisionPrompt).toContain('next_chapter_quality_plan_receipts')
    expect(revisionPrompt).toContain('next_chapter_quality_plan_receipts 中 opening_actions 的 evidence 必须来自修订后前300字')
    expect(revisionPrompt).toContain('middle_actions 的 evidence 必须来自修订后中段事件推进')
    expect(revisionPrompt).toContain('ending_actions 的 evidence 必须来自修订后最后300字')
    expect(shouldReviseBlock).toContain('next_chapter_quality_plan_receipts')
    expect(reviewNormalizeBlock).toContain('next_chapter_quality_plan_receipts')
    expect(reviewNormalizeBlock).toContain('preDraftReceiptChecks((section: any) => asArray(section?.next_chapter_quality_plan_receipts')
    expect(reviewNormalizeBlock).toContain('appendMissingNextChapterQualityPlanReceiptCheck')
    expect(structuredFieldsBlock).toContain('next_chapter_quality_plan_receipts')
  })
  test('returns next-chapter quality plan receipt sync for unattended post-delivery gates', () => {
    const source = readGenerateChapterForGroupSource()
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildNextChapterQualityPlanReceiptSyncReport')
    expect(generationReturnBlock).toContain('next_chapter_quality_plan_receipts_sync')
    expect(source).toContain('requires_next_chapter_quality_plan_receipts')
    expect(source).toContain('nextChapterQualityPlanReceiptSync.requires_receipts')
  })
  test('builds write-preparation receipt sync from pre-draft execution receipts', () => {
    const report = buildWritePreparationReceiptSyncReport(
      { title: '旧城维修师' },
      {
        id: 901,
        chapter_no: 18,
        raw_payload: {
          oh_story_delivery_receipts: {
            pre_draft_execution_receipts: {
              write_preparation_checks: [
                {
                  key: 'source_gaps',
                  label: '来源缺口',
                  delivered: true,
                  evidence: '李玄把上一章铜锁裂纹拿给执事看，说明来源已承接。',
                  remaining_risk: '',
                },
                {
                  key: 'reader_payoff_focus',
                  label: '读者回报',
                  delivered: false,
                  evidence: '只写了“会让读者爽”。',
                  remaining_risk: '没有落成正文动作或对白证据。',
                },
              ],
            },
          },
        },
      },
      {
        chapter_target: {
          write_preparation_brief: {
            source_gaps: ['上一章铜锁裂纹'],
            reader_payoff_focus: ['证据反杀'],
          },
        },
      },
      '李玄把上一章铜锁裂纹拿给执事看。',
    )

    expect(report).toMatchObject({
      chapter_id: 901,
      chapter_no: 18,
      status: 'warn',
      label: '写前准备缺口 1',
      requires_receipts: true,
      receipt_count: 2,
      missed_count: 1,
    })
    expect(report.missed[0]).toMatchObject({
      key: 'reader_payoff_focus',
      label: '读者回报',
      text: '没有落成正文动作或对白证据。',
    })
    expect(report.next_actions.join('｜')).toContain('write_preparation_checks')
  })
  test('keeps write-preparation receipt sync open when delivered evidence cannot be located in prose', () => {
    const report = buildWritePreparationReceiptSyncReport(
      { title: '旧城维修师' },
      { id: 902, chapter_no: 19, title: '证据错位' },
      {
        chapter_target: {
          write_preparation_brief: {
            source_gaps: ['上一章青玉簪去向'],
          },
        },
      },
      '李玄只递出旧账，执事当场改口。',
      {
        review: {
          oh_story_delivery_receipts: {
            pre_draft_execution_receipts: {
              write_preparation_checks: [
                {
                  key: 'source_gaps',
                  label: '来源缺口',
                  delivered: true,
                  evidence: '林青禾在雨巷交出青玉簪。',
                  remaining_risk: '',
                },
              ],
            },
          },
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'source_gaps',
      label: '来源缺口',
    })
    expect(report.missed[0].text).toContain('无法定位')
  })
  test('keeps write-preparation receipt sync open when staged delivery-risk evidence lands in the wrong section', () => {
    const chapterText = [
      '李玄刚推门，林青禾只递出半枚印纹，先把旧印归属压回现场。',
      '第一幕继续追认来源边界。'.repeat(40),
      '他走到阵堂深处，才让账册缺页变成执事必须改口的新证据。',
      '中段继续推进资产边界。'.repeat(40),
      '钟声响起前，账册背页忽然浮出下一枚旧印的名字。',
    ].join('')
    const report = buildWritePreparationReceiptSyncReport(
      { title: '旧城维修师' },
      { id: 903, chapter_no: 20, title: '落点错位' },
      {
        chapter_target: {
          write_preparation_brief: {
            delivery_risk_actions: [
              '开篇动作：前300字必须递出半枚印纹。',
              '中段动作：账册缺页必须改变执事选择。',
              '章末动作：旧印名字必须形成下一章钩子。',
            ],
          },
        },
      },
      chapterText,
      {
        review: {
          oh_story_delivery_receipts: {
            pre_draft_execution_receipts: {
              write_preparation_checks: [
                {
                  key: 'delivery_risk_actions.opening_actions',
                  label: '开篇动作',
                  delivered: true,
                  evidence: '他走到阵堂深处，才让账册缺页变成执事必须改口的新证据。',
                  remaining_risk: '',
                },
                {
                  key: 'delivery_risk_actions.middle_actions',
                  label: '中段动作',
                  delivered: true,
                  evidence: '李玄刚推门，林青禾只递出半枚印纹，先把旧印归属压回现场。',
                  remaining_risk: '',
                },
                {
                  key: 'delivery_risk_actions.ending_actions',
                  label: '章末动作',
                  delivered: true,
                  evidence: '他走到阵堂深处，才让账册缺页变成执事必须改口的新证据。',
                  remaining_risk: '',
                },
              ],
            },
          },
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(3)
    expect(report.missed_count).toBe(3)
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('前300字')
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('中段')
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('最后300字')
  })
  test('returns write-preparation receipt sync for unattended post-delivery gates', () => {
    const source = readGenerateChapterForGroupSource()
    const draftReturnBlock = readPostDeliveryStoryStateUpdateSource()
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildWritePreparationReceiptSyncReport')
    expect(draftReturnBlock).toContain('write_preparation_receipts_sync')
    expect(generationReturnBlock).toContain('write_preparation_receipts_sync')
  })
  test('returns Step 2 preparation syncs in full pipeline story state update', () => {
    const source = readGenerateChapterForGroupSource()
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildSourceReadinessSyncReport(project, updated, finalReviewContextPackage, finalText)')
    expect(source).toContain('buildIntentConfirmationSyncReport(project, updated, finalReviewContextPackage, finalText)')
    expect(source).toContain('buildBenchmarkRecallSyncReport(project, updated, finalReviewContextPackage, finalText)')
    expect(source).toContain('buildStyleSampleSyncReport(project, updated, finalReviewContextPackage, finalText)')
    expect(generationReturnBlock).toContain('source_readiness_sync')
    expect(generationReturnBlock).toContain('intent_confirmation_sync')
    expect(generationReturnBlock).toContain('benchmark_recall_sync')
    expect(generationReturnBlock).toContain('style_sample_sync')
  })
  test('persists the style fingerprint snapshot through the story state machine update', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')
    const generateSource = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8')].join('\n')
    const prepareStart = source.indexOf('const prepareStoryStateUpdate = async')
    const prepareEnd = source.indexOf('const updateStoryStateMachine = async', prepareStart)
    const prepareBlock = source.slice(prepareStart, prepareEnd > prepareStart ? prepareEnd : source.length)
    const acceptanceStart = generateSource.indexOf('acceptance = await commitNovelChapterAcceptance(')
    const acceptanceEnd = generateSource.indexOf('const updated = acceptance.chapter', acceptanceStart)
    const acceptanceBlock = generateSource.slice(acceptanceStart, acceptanceEnd)

    expect(prepareBlock).toContain('buildStyleFingerprintStateSnapshot(contextPackage, project, project.reference_config?.story_state || {})')
    expect(prepareBlock).toContain('stateDeltaWithStyleFingerprint')
    expect(prepareBlock).toContain('story_state: mergeStoryState(project.reference_config?.story_state || {}, stateDeltaWithStyleFingerprint, chapter)')
    expect(prepareBlock).toContain('payload.style_fingerprint = stateDeltaWithStyleFingerprint.style_fingerprint')
    expect(prepareBlock).toContain('next_reference_config: nextReferenceConfig')
    expect(acceptanceBlock).toContain('next_reference_config: preparedStoryStateUpdate.next_reference_config')
  })
  test('returns status filter receipt sync for unattended post-delivery gates', () => {
    const source = readGenerateChapterForGroupSource()
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildStatusFilterReceiptSyncReport')
    expect(generationReturnBlock).toContain('status_filter_receipts_sync')
    expect(source).toContain('requires_status_filter_receipts')
    expect(source).toContain('statusFilterReceiptSync.requires_receipts')
  })
  test('returns prose craft step-3 syncs for unattended post-delivery gates', () => {
    const source = readGenerateChapterForGroupSource()
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildProseCraftSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildPayoffSetupSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildSpectatorReactionSyncReport(project, updated, contextPackage, finalText)')
    expect(generationReturnBlock).toContain('prose_craft_sync')
    expect(generationReturnBlock).toContain('payoff_setup_sync')
    expect(generationReturnBlock).toContain('spectator_reaction_sync')
  })
  test('returns story quality step-3 syncs in full pipeline story state update', () => {
    const source = readGenerateChapterForGroupSource()
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildStoryLoopSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildInformationFlowSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildExpectationThresholdSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildEmotionalArcSyncReport(project, updated, contextPackage, finalText)')
    expect(generationReturnBlock).toContain('story_loop_sync')
    expect(generationReturnBlock).toContain('information_flow_sync')
    expect(generationReturnBlock).toContain('expectation_threshold_sync')
    expect(generationReturnBlock).toContain('emotional_arc_sync')
  })
  test('returns narrative technique step-3 syncs in full pipeline story state update', () => {
    const source = readGenerateChapterForGroupSource()
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildChapterHookSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildParagraphHookSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildSuspenseSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildReversalSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildShowdownSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildOpeningSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildBridgeUnitSyncReport(project, updated, contextPackage, finalText)')
    expect(generationReturnBlock).toContain('chapter_hook_sync')
    expect(generationReturnBlock).toContain('paragraph_hook_sync')
    expect(generationReturnBlock).toContain('suspense_sync')
    expect(generationReturnBlock).toContain('reversal_sync')
    expect(generationReturnBlock).toContain('showdown_sync')
    expect(generationReturnBlock).toContain('opening_sync')
    expect(generationReturnBlock).toContain('bridge_unit_sync')
  })
  test('returns long-form contract syncs in full pipeline story state update', () => {
    const source = readGenerateChapterForGroupSource()
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildContinuityHeatSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildConflictStructureSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildUpgradeRhythmSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildTargetReaderSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildGenrePositioningSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildPlotSpecialTopicsSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildFemaleAudienceSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildPlotDynamicsSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildCharacterRelationSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildReaderRetentionSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildCoreContractSyncReport(project, updated, contextPackage, finalText)')
    expect(generationReturnBlock).toContain('continuity_heat_sync')
    expect(generationReturnBlock).toContain('conflict_structure_sync')
    expect(generationReturnBlock).toContain('upgrade_rhythm_sync')
    expect(generationReturnBlock).toContain('target_reader_sync')
    expect(generationReturnBlock).toContain('genre_positioning_sync')
    expect(generationReturnBlock).toContain('plot_special_topics_sync')
    expect(generationReturnBlock).toContain('female_audience_sync')
    expect(generationReturnBlock).toContain('plot_dynamics_sync')
    expect(generationReturnBlock).toContain('character_relation_sync')
    expect(generationReturnBlock).toContain('reader_retention_sync')
    expect(generationReturnBlock).toContain('core_contract_sync')
  })
  test('builds a plot special topics sync report from contract checks and prose evidence', async () => {
    const { buildPlotSpecialTopicsSyncReport } = await import('./novel-writing-service')
    expect(typeof buildPlotSpecialTopicsSyncReport).toBe('function')

    const report = buildPlotSpecialTopicsSyncReport(
      { title: '拳证星河' },
      { id: 2201, chapter_no: 27, title: '联考前夜' },
      {
        chapter_target: {
          plot_special_topics_contract: {
            matched_topics: ['金手指拆分与战力防崩', '都市高武情节模板', '三万字卡点倒推', '阵营剧情/手牌法'],
            goldfinger_design_rules: ['金手指拆分成面板/不倒退/重复提升'],
            genre_boundary_rules: ['金手指核心卖点循环必须在题材边界内'],
            urban_high_martial_rules: ['所有目标必须和钱挂钩'],
            launch_checkpoint_rules: ['三万字内无关卡点的装逼打脸一个字不要写'],
            faction_hand_rules: ['按实力高低排序各阵营角色'],
          },
        },
      },
      [
        '林骁打开面板，熟练度没有倒退，抽卡系统的重复提升让拳力涨了一截。',
        '全国联考名额和奖金挂钩，他必须先拿下武馆联赛资格。',
        '几个阵营按实力高低依次出牌，校队队长先压价，武馆教练再给出交换条件。',
      ].join('\n'),
    )

    expect(report.status).toBe('warn')
    expect(report.missed.map((item: any) => item.key)).toContain('launch_checkpoint_execution')
    expect(report.missed.map((item: any) => item.key)).not.toContain('goldfinger_execution')
    expect(report.summary).toContain('特殊题材')
  })
  test('returns serial quality assurance syncs in full pipeline story state update', () => {
    const source = readGenerateChapterForGroupSource()
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildStoryDriveSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildCharacterArcSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildStyleBoundarySyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildInnovationSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildRunwaySyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildReaderExpectationSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildQualityAuditSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildBeatCoolingSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildReaderPayoffSyncReport(project, updated, contextPackage, finalText, story_state_update)')
    expect(generationReturnBlock).toContain('story_drive_sync')
    expect(generationReturnBlock).toContain('character_arc_sync')
    expect(generationReturnBlock).toContain('style_boundary_sync')
    expect(generationReturnBlock).toContain('innovation_sync')
    expect(generationReturnBlock).toContain('runway_sync')
    expect(generationReturnBlock).toContain('reader_expectation_sync')
    expect(generationReturnBlock).toContain('quality_audit_sync')
    expect(generationReturnBlock).toContain('beat_cooling_sync')
    expect(generationReturnBlock).toContain('reader_payoff_sync')
  })
  test('returns deterministic base step-3 syncs in full pipeline story state update', () => {
    const source = readGenerateChapterForGroupSource()
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildProseMetaSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildChapterBlueprintSyncReport(project, updated, contextPackage, finalText)')
    expect(source).toContain('buildChapterTitleUniquenessSyncReport(generationChapters, updated)')
    expect(generationReturnBlock).toContain('prose_meta_sync')
    expect(generationReturnBlock).toContain('chapter_blueprint_sync')
    expect(generationReturnBlock).toContain('chapter_title_uniqueness_sync')
  })
  test('returns chapter handoff sync for unattended post-delivery gates', () => {
    const source = readGenerateChapterForGroupSource()
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildChapterHandoffSyncReport(project, updated, contextPackage, finalText)')
    expect(generationReturnBlock).toContain('chapter_handoff_sync')
  })
  test('returns state tracking sync for unattended post-delivery gates', () => {
    const source = readGenerateChapterForGroupSource()
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildStateTrackingSyncReport(project, updated, contextPackage, finalText)')
    expect(generationReturnBlock).toContain('state_tracking_sync')
  })
  test('returns punctuation tone sync for unattended post-delivery gates', () => {
    const source = readGenerateChapterForGroupSource()
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildPunctuationToneSyncReport(project, updated, contextPackage, finalText)')
    expect(generationReturnBlock).toContain('punctuation_tone_sync')
  })
  test('returns asset linkage sync for unattended post-delivery gates', () => {
    const source = readGenerateChapterForGroupSource()
    const generationReturnBlock = readPostDeliveryStoryStateUpdateSource()

    expect(source).toContain('buildAssetLinkageSyncReport(project, updated, contextPackage, finalText)')
    expect(generationReturnBlock).toContain('asset_linkage_sync')
  })
  test('asks prose self review and revision to enforce chapter handoff checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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

    expect(reviewPrompt).toContain('chapter_handoff_checks')
    expect(reviewPrompt).toContain('chapter_handoff_contract')
    expect(reviewPrompt).toContain('章首承接')
    expect(revisionPrompt).toContain('chapter_handoff_checks')
    expect(revisionPrompt).toContain('章首承接')
    expect(shouldReviseBlock).toContain('chapter_handoff_checks')
    expect(reviewNormalizeBlock).toContain('chapter_handoff_checks')
    expect(source).toContain('reviewPayload?.chapter_handoff_checks')
    expect(structuredFieldsBlock).toContain('chapter_handoff_checks')
  })
  test('wires deterministic chapter handoff hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicChapterHandoffChecks = [buildChapterHandoffDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicChapterHandoffChecks')
  })
  test('scans prose meta words outside the title line', () => {
    const hits = scanProseMetaLeaks([
      '第十五章 袖口旧印',
      '林青禾按住袖口，想起上一章那枚旧印。',
      '账册夹页里还藏着一处伏笔，读者会在这里明白代价。',
    ].join('\n'))

    expect(hits.map((item: any) => item.term)).toEqual(['上一章', '伏笔', '读者'])
    expect(hits[0].line).toBe(2)
    expect(hits[0].status).toBe('warn')
    expect(hits[0].fix).toContain('角色当下能感知')
  })
  test('asks prose self review and revision to enforce oh-story prose meta checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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
    const riskStart = riskSource.indexOf('export function proseQualityProseMetaRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('prose_meta_checks')
    expect(reviewPrompt).toContain('第[一二三四五六七八九十百千万两0-9]+章|上一章|上章|前一章|本章|这一章|前文|后文|伏笔|细纲|读者')
    expect(reviewPrompt).toContain('角色当下能感知的事件锚点或相对时间')
    expect(revisionPrompt).toContain('prose_meta_checks')
    expect(revisionPrompt).toContain('工程词')
    expect(shouldReviseBlock).toContain('prose_meta_checks')
    expect(reviewNormalizeBlock).toContain('prose_meta_checks')
    expect(source).toContain('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')
    expect(riskCarryOverBlock).toContain('prose_meta_checks')
    expect(riskCarryOverBlock).toContain('工程词')
  })
  test('asks prose self review and revision to enforce oh-story story loop checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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
    const riskStart = riskSource.indexOf('export function proseQualityStoryLoopRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.story_loop_contract')
    expect(reviewPrompt).toContain('story_loop_checks')
    expect(reviewPrompt).toContain('题材 + 金手指 + 主角身份')
    expect(reviewPrompt).toContain('循环模式')
    expect(reviewPrompt).toContain('小循环 -> 中循环 -> 大循环')
    expect(reviewPrompt).toContain('核心不扩展')
    expect(revisionPrompt).toContain('story_loop_checks')
    expect(revisionPrompt).toContain('故事循环')
    expect(revisionPrompt).toContain('小循环中必须铺垫大循环的期待')
    expect(revisionPrompt).toContain('同一核心卖点的不同角度')
    expect(shouldReviseBlock).toContain('story_loop_checks')
    expect(reviewNormalizeBlock).toContain('story_loop_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.story_loop_checks')
    expect(riskCarryOverBlock).toContain('story_loop_checks')
    expect(riskCarryOverBlock).toContain('故事循环')
  })
  test('asks prose self review and revision to enforce oh-story emotional arc checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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
    const riskStart = riskSource.indexOf('export function proseQualityEmotionalArcRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.emotional_arc_contract')
    expect(reviewPrompt).toContain('emotional_arc_checks')
    expect(reviewPrompt).toContain('平静 -> 调动 -> 释放 -> 爽')
    expect(reviewPrompt).toContain('影响范围')
    expect(reviewPrompt).toContain('断期待禁止')
    expect(reviewPrompt).toContain('先入为主')
    expect(reviewPrompt).toContain('峰终定律')
    expect(reviewPrompt).toContain('结尾情绪强度')
    expect(reviewPrompt).toContain('三层情绪')
    expect(reviewPrompt).toContain('读者实际感受')
    expect(reviewPrompt).toContain('前反应')
    expect(reviewPrompt).toContain('以小搏大')
    expect(reviewPrompt).toContain('理念矛盾')
    expect(reviewPrompt).toContain('理念之争')
    expect(revisionPrompt).toContain('emotional_arc_checks')
    expect(revisionPrompt).toContain('情绪弧')
    expect(revisionPrompt).toContain('爽点递增')
    expect(revisionPrompt).toContain('先入为主')
    expect(revisionPrompt).toContain('峰终定律')
    expect(revisionPrompt).toContain('结尾情绪强度')
    expect(revisionPrompt).toContain('三层情绪')
    expect(revisionPrompt).toContain('读者实际感受')
    expect(revisionPrompt).toContain('前反应')
    expect(revisionPrompt).toContain('以小搏大')
    expect(revisionPrompt).toContain('理念矛盾')
    expect(revisionPrompt).toContain('追求和牺牲')
    expect(shouldReviseBlock).toContain('emotional_arc_checks')
    expect(reviewNormalizeBlock).toContain('emotional_arc_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.emotional_arc_checks')
    expect(riskCarryOverBlock).toContain('emotional_arc_checks')
    expect(riskCarryOverBlock).toContain('情绪弧')
  })
})

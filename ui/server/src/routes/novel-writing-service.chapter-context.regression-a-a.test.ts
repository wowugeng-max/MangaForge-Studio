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

describe('chapter context regression a a', () => {
  test('asks prose self review and revision to enforce oh-story chapter hook checks', () => {
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
    const riskStart = riskSource.indexOf('export function proseQualityChapterHookRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.chapter_hook_contract')
    expect(reviewPrompt).toContain('chapter_hook_checks')
    expect(reviewPrompt).toContain('chapter_hook_quality_checks')
    expect(reviewPrompt).toContain('章首 7 式')
    expect(reviewPrompt).toContain('章尾 13 式')
    expect(revisionPrompt).toContain('chapter_hook_checks')
    expect(revisionPrompt).toContain('chapter_hook_quality_checks')
    expect(revisionPrompt).toContain('章级钩子')
    expect(shouldReviseBlock).toContain('chapter_hook_checks')
    expect(shouldReviseBlock).toContain('chapter_hook_quality_checks')
    expect(reviewNormalizeBlock).toContain('chapter_hook_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.chapter_hook_checks')
    expect(reviewNormalizeBlock).toContain('chapter_hook_quality_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.chapter_hook_quality_checks')
    expect(riskCarryOverBlock).toContain('chapter_hook_checks')
    expect(riskCarryOverBlock).toContain('chapter_hook_quality_checks')
    expect(riskCarryOverBlock).toContain('章级钩子')
  })

  test('asks prose self review and revision to enforce oh-story paragraph hook checks', () => {
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
    const riskStart = riskSource.indexOf('export function proseQualityParagraphHookRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.paragraph_hook_contract')
    expect(reviewPrompt).toContain('paragraph_hook_checks')
    expect(reviewPrompt).toContain('段落级钩子 11 种')
    expect(reviewPrompt).toContain('围观者质量层级')
    expect(revisionPrompt).toContain('paragraph_hook_checks')
    expect(revisionPrompt).toContain('段落级钩子')
    expect(shouldReviseBlock).toContain('paragraph_hook_checks')
    expect(reviewNormalizeBlock).toContain('paragraph_hook_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.paragraph_hook_checks')
    expect(riskCarryOverBlock).toContain('paragraph_hook_checks')
    expect(riskCarryOverBlock).toContain('段落级钩子')
  })

  test('asks prose self review and revision to enforce oh-story suspense checks', () => {
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
    const riskStart = riskSource.indexOf('export function proseQualitySuspenseRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.suspense_contract')
    expect(reviewPrompt).toContain('suspense_checks')
    expect(reviewPrompt).toContain('四种悬念信息顺序模板')
    expect(reviewPrompt).toContain('悬念强度5级')
    expect(reviewPrompt).toContain('期待链')
    expect(reviewPrompt).toContain('至少两条期待线')
    expect(reviewPrompt).toContain('读者预知法')
    expect(reviewPrompt).toContain('底牌前置法')
    expect(reviewPrompt).toContain('多线悬念')
    expect(reviewPrompt).toContain('伏笔不是谜语人')
    expect(reviewPrompt).toContain('信息延迟超过3章')
    expect(revisionPrompt).toContain('suspense_checks')
    expect(revisionPrompt).toContain('悬念编排')
    expect(revisionPrompt).toContain('信息差运用')
    expect(revisionPrompt).toContain('读者预知法')
    expect(revisionPrompt).toContain('底牌前置法')
    expect(revisionPrompt).toContain('伏笔不是谜语人')
    expect(shouldReviseBlock).toContain('suspense_checks')
    expect(reviewNormalizeBlock).toContain('suspense_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.suspense_checks')
    expect(riskCarryOverBlock).toContain('suspense_checks')
    expect(riskCarryOverBlock).toContain('悬念编排')
  })

  test('asks prose self review and revision to enforce oh-story reversal checks', () => {
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
    const riskStart = riskSource.indexOf('export function proseQualityReversalRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.reversal_contract')
    expect(reviewPrompt).toContain('reversal_checks')
    expect(reviewPrompt).toContain('反转类型')
    expect(reviewPrompt).toContain('误导技巧')
    expect(revisionPrompt).toContain('reversal_checks')
    expect(revisionPrompt).toContain('反转设计')
    expect(shouldReviseBlock).toContain('reversal_checks')
    expect(reviewNormalizeBlock).toContain('reversal_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.reversal_checks')
    expect(riskCarryOverBlock).toContain('reversal_checks')
    expect(riskCarryOverBlock).toContain('反转设计')
  })

  test('asks prose self review and revision to enforce oh-story opening checks', () => {
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
    const riskStart = riskSource.indexOf('export function proseQualityOpeningRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.opening_contract')
    expect(reviewPrompt).toContain('opening_checks')
    expect(reviewPrompt).toContain('300 字内主角登场')
    expect(reviewPrompt).toContain('三大基点')
    expect(reviewPrompt).toContain('开头五要诀')
    expect(reviewPrompt).toContain('简单/不偏/快/爽/不平')
    expect(revisionPrompt).toContain('opening_checks')
    expect(revisionPrompt).toContain('开篇设计')
    expect(revisionPrompt).toContain('简单/不偏/快/爽/不平')
    expect(shouldReviseBlock).toContain('opening_checks')
    expect(reviewNormalizeBlock).toContain('opening_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.opening_checks')
    expect(riskCarryOverBlock).toContain('opening_checks')
    expect(riskCarryOverBlock).toContain('开篇设计')
  })

  test('asks prose self review to enforce opening hook strategy contract', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )

    expect(reviewPrompt).toContain('opening_strategy_contract')
    expect(reviewPrompt).toContain('hook_type')
    expect(reviewPrompt).toContain('事件噱头')
    expect(reviewPrompt).toContain('金手指噱头')
    expect(reviewPrompt).toContain('人设噱头')
    expect(reviewPrompt).toContain('不能混用')
    expect(reviewPrompt).toContain('mainline_graft')
    expect(reviewPrompt).toContain('first_5_chapter_promise')
    expect(reviewPrompt).toContain('threshold_ladder')
    expect(reviewPrompt).toContain('forbidden_mixing')
    expect(reviewPrompt).toContain('opening_strategy_contract_mixed_hook_type')
    expect(reviewPrompt).toContain('opening_checks')
  })

  test('carries opening hook strategy failures into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '第二条规则' },
      [
        { id: 2, chapter_no: 2, title: '十点门槛' },
        { id: 3, chapter_no: 3, title: '第二条规则' },
      ],
      [
        {
          id: 610,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:07:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                opening_checks: [
                  {
                    key: 'opening_strategy_contract_mixed_hook_type',
                    label: '开篇噱头策略',
                    status: 'fail',
                    evidence: '正文同时把第一章写成规则事件开局和系统觉醒说明书。',
                    fix: '下一章必须回到事件噱头：用十点门槛推进规则事件，不要再补系统说明书。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = {
      title: '灰域双生',
      reference_config: {},
    }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '第二条规则',
        summary: '继续推进规则事件，不转成系统说明。',
        conflict: '林野想靠蛮力开门，沈砚要求按十点门槛验证。',
        ending_hook: '门外响起第二条规则。',
        scene_cards: [
          { scene_no: 1, title: '二次敲门', conflict: '十点门槛继续压迫两人选择。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 3, title: '第二条规则' },
    )

    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('开篇设计：开篇缺口')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('开篇噱头策略')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('事件噱头')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('不要再补系统说明书')
    expect(prompt).toContain('开篇噱头策略')
    expect(prompt).toContain('事件噱头')
    expect(prompt).toContain('不要再补系统说明书')
  })

  test('carries prose review opening check execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '门槛白线' },
      [
        { id: 3, chapter_no: 3, title: '第三声敲门' },
        { id: 4, chapter_no: 4, title: '门槛白线' },
      ],
      [
        {
          id: 611,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                opening_checks: [
                  {
                    key: 'opening_first_1000_expectation_missing',
                    label: '开篇期待点',
                    status: 'fail',
                    protagonist_entry: '主角第420字才出现。',
                    first_300_goal: '前300字没有让主角追问门槛白线。',
                    first_1000_expectation: '1000字内没有血缘系统反馈。',
                    opening_principle: '不快：先写三段校规说明。',
                    evidence: '正文前三段都是校规说明。',
                    fix: '下一章第一段用门槛白线逼主角做选择。',
                    remaining_risk: '下一章不能再从校规说明书开场。',
                  },
                  {
                    key: 'opening_entry_ok',
                    label: '主角登场',
                    status: 'pass',
                    protagonist_entry: '主角第一段登场。',
                    first_300_goal: '前300字已有目标。',
                    first_1000_expectation: '1000字内已有期待点。',
                    opening_principle: '快。',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '午夜校规', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '门槛白线',
        summary: '主角追问门槛白线和血缘系统反馈。',
        conflict: '规则要求他先跨线，系统却只给出半条反馈。',
        ending_hook: '白线背后出现第二个家属签名。',
        scene_cards: [
          { scene_no: 1, title: '白线问答', conflict: '门槛白线逼主角立刻选择。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 4, title: '门槛白线' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修开篇设计')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('开篇设计：开篇缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('opening_checks.开篇期待点')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('主角第420字才出现')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('1000字内没有血缘系统反馈')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('下一章不能再从校规说明书开场')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('主角第一段登场')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('前300字')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('门槛白线')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('1000字')
    expect(prompt).toContain('opening_checks.开篇期待点')
    expect(prompt).toContain('血缘系统反馈')
    expect(prompt).toContain('校规说明书开场')
  })

  test('maps delivery-risk carry-over into existing scene cards before building prose prompts', () => {
    const project = {
      title: '灰域双生',
      reference_config: {},
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 4,
        title: '旧账审判',
        summary: '主角用旧账反制执事。',
        conflict: '执事拒认旧账，盟友立场摇摆。',
        ending_hook: '第三个名字出现在旧账背面。',
        delivery_risk_carry_over: {
          opening_actions: ['前300字先让旧账压迫重新逼近主角'],
          middle_actions: ['中段用新证据推动目标并改变盟友立场'],
          ending_actions: ['章末抛出第三个名字作为追读钩子'],
          forbidden_repeats: ['不要再用旁白宣布风险已修复'],
        },
        scene_cards: [
          { scene_no: 1, title: '旧账压门', purpose: '主角带着账册入场', beat: '主角抵达审判厅' },
          { scene_no: 2, title: '证据翻面', purpose: '主角逼执事回应证据', conflict: '执事拒认旧账', beat: '主角公开账册缺页' },
          { scene_no: 3, title: '新名单落地', purpose: '用名单留下下一章追问', beat: '第三个名字出现' },
        ],
      },
      preflight: { ready: true, blockers: [] },
    }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      contextPackage,
      null,
      { chapter_no: 4, title: '旧账审判' },
    )

    expect(prompt).toContain('"serial_risk_repairs"')
    expect(prompt).toContain('delivery_risk_carry_over')
    expect(prompt).toContain('质量续航')
    expect(prompt).toContain('"recent_fatigue_action": "前300字先让旧账压迫重新逼近主角"')
    expect(prompt).toContain('"state_changes_expected"')
    expect(prompt).toContain('中段用新证据推动目标并改变盟友立场')
    expect(prompt).toContain('"ending_hook_seed": "章末抛出第三个名字作为追读钩子"')
    expect(prompt).toContain('不要再用旁白宣布风险已修复')
  })

  test('keeps paragraph prose prompt within budget when context package has bulky assets', () => {
    const noisyText = 'RAW_NOISE_BLOCK_不要把整段资产噪音塞进正文任务。'.repeat(1000)
    const project = {
      title: '灰域双生',
      reference_config: {},
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 2,
        title: '玻璃娃娃的眼泪',
        summary: '主角必须确认玻璃娃娃和旧账之间的关系。',
        conflict: '旧账执事阻止主角触碰玻璃娃娃。',
        ending_hook: '玻璃娃娃眼眶里浮出第三个名字。',
        scene_cards: [
          {
            scene_no: 1,
            title: '旧账压门',
            purpose: '主角带着旧账进入审判厅',
            conflict: '执事拒绝承认旧账缺页',
            reader_payoff: '确认玻璃娃娃不是装饰，而是证据容器。',
          },
        ],
      },
      setting_context: {
        entities: Array.from({ length: 80 }, (_, index) => ({
          id: index + 1,
          name: `资产${index + 1}`,
          entity_type: 'item',
          summary: noisyText,
          constraints_json: { knowledge_scope: noisyText, forbidden_reveal: noisyText },
          state_json: { current_owner: noisyText, risk: noisyText },
        })),
      },
      story_state: {
        progress_summary: { notes: noisyText },
        daily_context_snapshot: { current_scene: noisyText, pending_clues: [noisyText] },
        character_positions: Object.fromEntries(
          Array.from({ length: 40 }, (_, index) => [`角色${index + 1}`, noisyText]),
        ),
      },
      relationship_graph: {
        diagnostics: Array.from({ length: 120 }, (_, index) => ({
          id: index + 1,
          issue: noisyText,
        })),
      },
      writing_bible: {
        style: noisyText,
        forbidden: noisyText,
      },
      preflight: { ready: true, blockers: [] },
    }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      contextPackage,
      { generation_prompt_addendum: noisyText },
      { chapter_no: 2, title: '玻璃娃娃的眼泪' },
    )

    expect(prompt.length).toBeLessThanOrEqual(180000)
    expect(prompt).toContain('【结构化上下文包】')
    expect(prompt).toContain('玻璃娃娃的眼泪')
    expect(prompt).toContain('旧账压门')
    expect(prompt).not.toContain(noisyText.slice(0, 1000))
  })

  test('asks prose self review and revision to enforce oh-story prose craft checks', () => {
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
    const riskStart = riskSource.indexOf('export function proseQualityProseCraftRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.prose_craft_contract')
    expect(reviewPrompt).toContain('prose_craft_checks')
    expect(reviewPrompt).toContain('身体细节替代情绪词')
    expect(reviewPrompt).toContain('三维度揉进')
    expect(reviewPrompt).toContain('间接描写法')
    expect(reviewPrompt).toContain('侧面反应')
    expect(reviewPrompt).toContain('三机位法')
    expect(reviewPrompt).toContain('机位1')
    expect(reviewPrompt).toContain('机位2')
    expect(reviewPrompt).toContain('然后呢')
    expect(reviewPrompt).toContain('信息点')
    expect(reviewPrompt).toContain('core_emotion_alignment_rules')
    expect(reviewPrompt).toContain('情节、人设、冲突、细节')
    expect(reviewPrompt).toContain('baimiao_sensory_rules')
    expect(reviewPrompt).toContain('白描')
    expect(reviewPrompt).toContain('五感')
    expect(reviewPrompt).toContain('dynamic_description_rules')
    expect(reviewPrompt).toContain('动态描写优于静态描写')
    expect(reviewPrompt).toContain('动作和反应')
    expect(reviewPrompt).toContain('shot_rhythm_rules')
    expect(reviewPrompt).toContain('镜头与分镜思维')
    expect(reviewPrompt).toContain('远景/中景/近景/特写')
    expect(reviewPrompt).toContain('transition_bridge_rules')
    expect(reviewPrompt).toContain('场景切换与转场')
    expect(reviewPrompt).toContain('相似物')
    expect(reviewPrompt).toContain('description_limits')
    expect(reviewPrompt).toContain('水分控制')
    expect(reviewPrompt).toContain('anti_ai_smell_rules')
    expect(reviewPrompt).toContain('高危词')
    expect(reviewPrompt).toContain('章末总结体')
    expect(reviewPrompt).toContain('叠加式描写')
    expect(revisionPrompt).toContain('prose_craft_checks')
    expect(revisionPrompt).toContain('正文工艺')
    expect(revisionPrompt).toContain('间接描写法')
    expect(revisionPrompt).toContain('不要直接宣布')
    expect(revisionPrompt).toContain('三机位法')
    expect(revisionPrompt).toContain('设定都由冲突引出')
    expect(revisionPrompt).toContain('然后呢')
    expect(revisionPrompt).toContain('接上')
    expect(revisionPrompt).toContain('围绕核心情绪')
    expect(revisionPrompt).toContain('每个动作、物件、冲突和反应')
    expect(revisionPrompt).toContain('白描')
    expect(revisionPrompt).toContain('最少的字')
    expect(revisionPrompt).toContain('感官')
    expect(revisionPrompt).toContain('动态描写')
    expect(revisionPrompt).toContain('动作和反应')
    expect(revisionPrompt).toContain('环境铺陈')
    expect(revisionPrompt).toContain('镜头节奏')
    expect(revisionPrompt).toContain('远景、中景、近景或特写')
    expect(revisionPrompt).toContain('快节奏')
    expect(revisionPrompt).toContain('场景切换')
    expect(revisionPrompt).toContain('时间跳转')
    expect(revisionPrompt).toContain('声音或光影')
    expect(revisionPrompt).toContain('水分控制')
    expect(revisionPrompt).toContain('删掉读者不会困惑')
    expect(revisionPrompt).toContain('高危词')
    expect(revisionPrompt).toContain('章末总结体')
    expect(revisionPrompt).toContain('叠加式描写')
    expect(shouldReviseBlock).toContain('prose_craft_checks')
    expect(reviewNormalizeBlock).toContain('prose_craft_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.prose_craft_checks')
    expect(riskCarryOverBlock).toContain('prose_craft_checks')
    expect(riskCarryOverBlock).toContain('正文工艺')
  })

})

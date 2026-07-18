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
    'prose-quality-risks-audience.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}
const createProsePipelineHarness = (options?: any) => createProsePipelineHarnessWithService(createNovelWritingService, options)
const readSceneCardsPromptSource = () => readFileSync(join(import.meta.dir, '../novel-writing/scene-cards-prompt.ts'), 'utf8')
const readPostDeliveryStoryStateUpdateSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-story-state-update.ts'), 'utf8')
const readChapterProseStoragePatchSource = () => readFileSync(join(import.meta.dir, '../novel-writing/chapter-prose-storage-patch.ts'), 'utf8')
const readPostDeliverySyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-sync-review-record.ts'), 'utf8')
const readDraftSyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/draft-sync-review-record.ts'), 'utf8')

describe('chapter context regression', () => {
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

  test('asks prose generation self review and revision to enforce oh-story subject name rhythm', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const promptSectionsSource = readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const proseCraftSnippetStart = promptSectionsSource.indexOf('function formatProseCraftPromptSnippet')
    const proseCraftSnippetEnd = promptSectionsSource.indexOf('function formatQualityAuditPhaseChecklist', proseCraftSnippetStart)
    const proseCraftPromptSource = `${prosePromptBlock}\n${promptSectionsSource.slice(proseCraftSnippetStart, proseCraftSnippetEnd)}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(proseCraftSnippetStart).toBeGreaterThanOrEqual(0)
    expect(proseCraftSnippetEnd).toBeGreaterThan(proseCraftSnippetStart)
    expect(proseCraftPromptSource).toContain('主语与名字节奏')
    expect(proseCraftPromptSource).toContain('段首、场景切换、多人同场、视角重置')
    expect(proseCraftPromptSource).toContain('同一动作链/同一段内部')
    expect(proseCraftPromptSource).toContain('优先用“他/她”、动作承接或省略主语')
    expect(proseCraftPromptSource).toContain('不要连续多句都以同一角色名开头')
    expect(reviewPrompt).toContain('主语与名字节奏')
    expect(reviewPrompt).toContain('每句都在报名字')
    expect(reviewPrompt).toContain('指代不清')
    expect(revisionPrompt).toContain('主语与名字节奏')
    expect(revisionPrompt).toContain('段首点名建立主语')
    expect(revisionPrompt).toContain('段中用代词/省略流动')
  })

  test('asks prose generation self review and revision to enforce oh-story natural paragraph rhythm', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('自然节奏重排')
    expect(prosePromptBlock).toContain('断段按镜头/信息变化')
    expect(prosePromptBlock).toContain('新动作、新物件、新信息、新对话、视线转移、场景结束')
    expect(prosePromptBlock).toContain('不要把完整推理链切成机械碎片')
    expect(reviewPrompt).toContain('自然节奏重排')
    expect(reviewPrompt).toContain('连续多个极短段仍属于同一镜头')
    expect(reviewPrompt).toContain('一段塞进多个动作/信息/视线切换')
    expect(revisionPrompt).toContain('自然节奏重排')
    expect(revisionPrompt).toContain('同一镜头里的动作、感知和反应')
    expect(revisionPrompt).toContain('只在新动作、新信息、对话或转折处断段')
  })

  test('asks prose generation self review and revision to enforce oh-story specific character-count expression guard', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('具体字数表达校验')
    expect(prosePromptBlock).toContain('这五个字 / 短短四字 / 三个字一落 / 八个字砸下去')
    expect(prosePromptBlock).toContain('这句话一落')
    expect(reviewPrompt).toContain('具体字数表达校验')
    expect(reviewPrompt).toContain('短短四字')
    expect(reviewPrompt).toContain('prose_craft_checks')
    expect(revisionPrompt).toContain('具体字数表达')
    expect(revisionPrompt).toContain('这句话一落')
  })

  test('asks prose generation self review and revision to enforce oh-story external fact research guard', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('外部事实查证')
    expect(prosePromptBlock).toContain('历史年代、地理方位、职业细节')
    expect(prosePromptBlock).toContain('不得编造')
    expect(prosePromptBlock).toContain('资料研究')
    expect(reviewPrompt).toContain('外部事实查证')
    expect(reviewPrompt).toContain('factual_checks')
    expect(reviewPrompt).toContain('category=factual')
    expect(revisionPrompt).toContain('factual_checks')
    expect(revisionPrompt).toContain('不得把未查证内容改写成确定事实')
  })

  test('asks prose generation self review and revision to enforce oh-story supporting-character buffer zones', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('配角攻略缓冲区')
    expect(prosePromptBlock).toContain('信息差、地位差距、亲密度差距或信任程度')
    expect(prosePromptBlock).toContain('配角不能像 NPC 一样站着等主角触发')
    expect(reviewPrompt).toContain('配角攻略缓冲区')
    expect(reviewPrompt).toContain('buffer_zone')
    expect(reviewPrompt).toContain('character_relation_checks')
    expect(revisionPrompt).toContain('配角攻略缓冲区')
    expect(revisionPrompt).toContain('信息差、地位差距、亲密度差距或信任程度')
  })

  test('asks prose generation self review and revision to enforce oh-story section density diagnosis', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const promptSectionsSource = readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const proseCraftSnippetStart = promptSectionsSource.indexOf('function formatProseCraftPromptSnippet')
    const proseCraftSnippetEnd = promptSectionsSource.indexOf('function formatQualityAuditPhaseChecklist', proseCraftSnippetStart)
    const proseCraftPromptSource = `${prosePromptBlock}\n${promptSectionsSource.slice(proseCraftSnippetStart, proseCraftSnippetEnd)}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(proseCraftSnippetStart).toBeGreaterThanOrEqual(0)
    expect(proseCraftSnippetEnd).toBeGreaterThan(proseCraftSnippetStart)
    expect(proseCraftPromptSource).toContain('小节内部结构')
    expect(proseCraftPromptSource).toContain('一个主事件')
    expect(proseCraftPromptSource).toContain('3-5 个子事件')
    expect(proseCraftPromptSource).toContain('一个情绪变化')
    expect(proseCraftPromptSource).toContain('一条读者新获知的信息')
    expect(proseCraftPromptSource).toContain('3-5 轮对话交锋')
    expect(proseCraftPromptSource).toContain('小节结尾留一个钩子')
    expect(proseCraftPromptSource).toContain('下一节开头快速接续')
    expect(proseCraftPromptSource).toContain('情绪跨节递进')
    expect(proseCraftPromptSource).toContain('小节密度诊断')
    expect(proseCraftPromptSource).toContain('偏短不得加环境描写')
    expect(proseCraftPromptSource).toContain('子事件三维度')
    expect(proseCraftPromptSource).toContain('对话交锋')
    expect(proseCraftPromptSource).toContain('简短回忆')
    expect(reviewPrompt).toContain('小节密度诊断检查')
    expect(reviewPrompt).toContain('小节内部结构')
    expect(reviewPrompt).toContain('下一节开头快速接续')
    expect(reviewPrompt).toContain('情绪跨节递进')
    expect(reviewPrompt).toContain('为凑字数加环境描写')
    expect(reviewPrompt).toContain('无意义动作')
    expect(reviewPrompt).toContain('prose_craft_checks')
    expect(revisionPrompt).toContain('小节密度诊断')
    expect(revisionPrompt).toContain('小节结构')
    expect(revisionPrompt).toContain('主事件 + 3-5 个子事件')
    expect(revisionPrompt).toContain('下一节开头快速接续')
    expect(revisionPrompt).toContain('补感官细节、身体动作、对话交锋或2-3句简短回忆')
    expect(revisionPrompt).toContain('不得用环境描写、重复情绪或内心独白凑字数')
  })

  test('asks prose generation self review and revision to enforce oh-story event content ratio', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const promptSectionsSource = readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const qualityAuditPromptStart = promptSectionsSource.indexOf('export function buildQualityAuditPromptSection')
    const prosePromptSource = `${prosePromptBlock}\n${promptSectionsSource.slice(qualityAuditPromptStart)}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(qualityAuditPromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptSource).toContain('事件内容比重不能小于一半')
    expect(prosePromptSource).toContain('事件是价值改变的契机')
    expect(prosePromptSource).toContain('设定尽量通过事件演绎')
    expect(reviewPrompt).toContain('事件内容比重')
    expect(reviewPrompt).toContain('设定尽量通过事件演绎')
    expect(reviewPrompt).toContain('quality_audit_checks')
    expect(revisionPrompt).toContain('事件内容比重')
    expect(revisionPrompt).toContain('旁白强塞')
    expect(revisionPrompt).toContain('动作、选择、阻碍、代价或局势变化')
  })

  test('asks prose self review and revision to enforce scene-card density execution', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(reviewPrompt).toContain('scene_cards.density_level')
    expect(reviewPrompt).toContain('疏密分配')
    expect(reviewPrompt).toContain('dense 的爽点/打脸/反转/情绪高潮')
    expect(reviewPrompt).toContain('sparse 的过场/赶路/信息交代/时间跳转')
    expect(reviewPrompt).toContain('medium 的铺垫/日常/关系升温')
    expect(reviewPrompt).toContain('prose_craft_checks')
    expect(reviewPrompt).toContain('density_level 执行')
    expect(revisionPrompt).toContain('scene_cards.density_level')
    expect(revisionPrompt).toContain('疏密分配')
    expect(revisionPrompt).toContain('density_level 执行偏差')
    expect(revisionPrompt).toContain('revision_receipts')
  })

  test('asks prose self review and revision to enforce scene-card sensory anchors', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(reviewPrompt).toContain('scene_cards.sensory_anchor')
    expect(reviewPrompt).toContain('感知素材库')
    expect(reviewPrompt).toContain('感知是主角主动注意到的细节')
    expect(reviewPrompt).toContain('装饰性场景描写')
    expect(revisionPrompt).toContain('scene_cards.sensory_anchor')
    expect(revisionPrompt).toContain('感知锚点执行偏差')
    expect(revisionPrompt).toContain('主角主动注意到')
  })

  test('asks prose generation self review and revision to enforce scene-card serial risk repairs', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )
    const structuredFieldsSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/structured-review-fields.ts'), 'utf8')
    const reviewFieldList = structuredFieldsSource.slice(
      structuredFieldsSource.indexOf('export const STRUCTURED_REVIEW_CHECK_FIELDS'),
      structuredFieldsSource.indexOf('export const STRUCTURED_REVIEW_REQUIRED_FIELDS'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('scene_cards.serial_risk_repairs')
    expect(prosePromptBlock).toContain('scene_cards.recent_fatigue_action')
    expect(prosePromptBlock).toContain('风险修复动作')
    expect(prosePromptBlock).toContain('目标推进、阻碍升级、新信息、关系/世界调剂或冲突冷却')
    expect(reviewPrompt).toContain('scene_cards.serial_risk_repairs')
    expect(reviewPrompt).toContain('recent_fatigue_action')
    expect(reviewPrompt).toContain('serial_risk_repair_checks')
    expect(reviewPrompt).toContain('可见事件')
    expect(revisionPrompt).toContain('scene_cards.serial_risk_repairs')
    expect(revisionPrompt).toContain('serial_risk_repair_checks')
    expect(revisionPrompt).toContain('风险修复动作')
    expect(reviewFieldList).toContain("['serial_risk_repair_checks', 'serialRiskRepairChecks']")
  })

  test('asks prose generation to output per-scene scene-card execution receipts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = source.slice(prosePromptStart, prosePromptEnd)

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('scene_card_receipts')
    expect(prosePromptBlock).toContain('goal_obstacle_change_delivered')
    expect(prosePromptBlock).toContain('purpose_tag_delivered')
    expect(prosePromptBlock).toContain('density_level_delivered')
    expect(prosePromptBlock).toContain('sensory_anchor_delivered')
    expect(prosePromptBlock).toContain('serial_risk_repairs_delivered')
    expect(prosePromptBlock).toContain('dialogue_goals_delivered')
    expect(prosePromptBlock).toContain('style_directives_delivered')
    expect(prosePromptBlock).toContain('benchmark_recall_directives_delivered')
    expect(prosePromptBlock).toContain('concept_anchor_rules_delivered')
    expect(prosePromptBlock).toContain('prose_craft_directives_delivered')
    expect(prosePromptBlock).toContain('evidence(array)')
    expect(prosePromptBlock).toContain('scene_start_anchor')
    expect(prosePromptBlock).toContain('scene_end_anchor')
    expect(prosePromptBlock).toContain('不能只写“已完成”')
  })

  test('asks prose generation to output top-level oh-story delivery receipts for storage', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = source.slice(prosePromptStart, prosePromptEnd)

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('oh_story_delivery_receipts')
    expect(prosePromptBlock).toContain('chapter_blueprint')
    expect(prosePromptBlock).toContain('scene_card_receipts')
    expect(prosePromptBlock).toContain('delivery_risk_receipts')
    expect(prosePromptBlock).toContain('revision_receipts')
    expect(prosePromptBlock).toContain('artifact_protocol_receipts')
    expect(prosePromptBlock).toContain('设定/关系.md')
    expect(prosePromptBlock).toContain('大纲/细纲_第XXX章.md')
    expect(prosePromptBlock).toContain('追踪/角色状态.md')
    expect(prosePromptBlock).toContain('changed_evidence 必须引用 chapter_text')
  })

  test('asks prose self review and revision to enforce artifact protocol receipts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(reviewPrompt).toContain('artifact_protocol_receipts')
    expect(reviewPrompt).toContain('artifact_path')
    expect(reviewPrompt).toContain('required_fields')
    expect(reviewPrompt).toContain('设定/题材定位.md')
    expect(revisionPrompt).toContain('artifact_protocol_receipts')
    expect(revisionPrompt).toContain('设定/关系.md')
    expect(revisionPrompt).toContain('追踪/时间线.md')
  })

  test('asks prose self review and revision to verify scene-card execution receipts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(reviewPrompt).toContain('scene_card_receipts')
    expect(reviewPrompt).toContain('goal_obstacle_change_delivered')
    expect(reviewPrompt).toContain('concept_anchor_rules_delivered')
    expect(reviewPrompt).toContain('prose_craft_directives_delivered')
    expect(reviewPrompt).toContain('不能信任回执自述')
    expect(reviewPrompt).toContain('正文证据')
    expect(revisionPrompt).toContain('scene_card_receipts')
    expect(revisionPrompt).toContain('scene_start_anchor')
    expect(revisionPrompt).toContain('scene_end_anchor')
    expect(revisionPrompt).toContain('修订后必须重写')
    expect(revisionPrompt).toContain('delivered=false')
  })

  test('asks prose self review and revision to enforce oh-story quality audit checks', () => {
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
    const reviewPreparationBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('const normalizedReview = {', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )
    const riskSource = proseQualityRisksSource()
    const riskStart = riskSource.indexOf('export function proseQualityQualityAuditRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.quality_audit_contract')
    expect(reviewPrompt).toContain('quality_audit_checks')
    expect(reviewPrompt).toContain('五维评分标准')
    expect(reviewPrompt).toContain('five_dimension_scores')
    expect(reviewPrompt).toContain('水文检测')
    expect(reviewPrompt).toContain('卖点表达')
    expect(reviewPrompt).toContain('发现比告知爽十倍')
    expect(reviewPrompt).toContain('开头暗示')
    expect(reviewPrompt).toContain('中间深化')
    expect(reviewPrompt).toContain('高潮爆发')
    expect(reviewPrompt).toContain('phase_checklist')
    expect(reviewPrompt).toContain('按阶段质量清单逐项覆盖对应 receipt_keys')
    expect(revisionPrompt).toContain('quality_audit_checks')
    expect(revisionPrompt).toContain('质量诊断')
    expect(revisionPrompt).toContain('卖点表达')
    expect(revisionPrompt).toContain('隐性展示')
    expect(revisionPrompt).toContain('开头暗示')
    expect(revisionPrompt).toContain('中间深化')
    expect(revisionPrompt).toContain('高潮爆发')
    expect(revisionPrompt).toContain('quality_audit_repair_receipts')
    expect(revisionPrompt).toContain('逐条对应 quality_audit_checks 中 status=fail/warn 的诊断项')
    expect(revisionPrompt).toContain('check_key, label, original_evidence, applied_fix, changed_evidence, remaining_risk')
    expect(shouldReviseBlock).toContain('quality_audit_checks')
    expect(reviewNormalizeBlock).toContain('quality_audit_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.quality_audit_checks')
    expect(reviewNormalizeBlock).toContain('five_dimension_scores: normalizeFiveDimensionQualityScores')
    expect(reviewPreparationBlock).toContain('const deterministicNewConceptChecks = scanNewConceptOverloadRisks(contextPackage)')
    expect(reviewPreparationBlock).toContain('const deterministicScaleAnchorChecks = scanEconomicPowerScaleAnchorRisks(chapterText)')
    expect(reviewNormalizeBlock).toContain('...deterministicNewConceptChecks')
    expect(reviewNormalizeBlock).toContain('...deterministicScaleAnchorChecks')
    expect(riskCarryOverBlock).toContain('quality_audit_checks')
    expect(riskCarryOverBlock).toContain('质量诊断')
  })

  test('asks prose self review and revision to enforce oh-story punctuation tone checks', () => {
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
    const riskStart = riskSource.indexOf('export function proseQualityPunctuationToneRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.punctuation_tone_contract')
    expect(reviewPrompt).toContain('punctuation_tone_checks')
    expect(reviewPrompt).toContain('通篇句号化')
    expect(reviewPrompt).toContain('随机标点堆砌')
    expect(revisionPrompt).toContain('punctuation_tone_checks')
    expect(revisionPrompt).toContain('语气标点')
    expect(shouldReviseBlock).toContain('punctuation_tone_checks')
    expect(reviewNormalizeBlock).toContain('punctuation_tone_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.punctuation_tone_checks')
    expect(riskCarryOverBlock).toContain('punctuation_tone_checks')
    expect(riskCarryOverBlock).toContain('语气标点')
  })

  test('asks prose generation self review and revision to enforce oh-story punctuation function beats', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('被打断 / 拖长音')
    expect(prosePromptBlock).toContain('动作打断、换行、短句或未完成动作')
    expect(prosePromptBlock).toContain('信息揭示 / 判断落点')
    expect(prosePromptBlock).toContain('冒号或短句制造落点')
    expect(prosePromptBlock).toContain('不写论文式长分号链')
    expect(reviewPrompt).toContain('被打断 / 拖长音')
    expect(reviewPrompt).toContain('信息揭示 / 判断落点')
    expect(reviewPrompt).toContain('论文式长分号链')
    expect(revisionPrompt).toContain('动作打断、换行或短句')
    expect(revisionPrompt).toContain('冒号或短句制造信息揭示落点')
  })

  test('keeps prose revision receipts for post-revision quality audit', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const revisionParseBlock = source.slice(
      source.indexOf('const revisionPayload = getNovelPayload(revisionResult)'),
      source.indexOf('const runCommercialEditorRewrite', source.indexOf('const revisionPayload = getNovelPayload(revisionResult)')),
    )

    expect(revisionPrompt).toContain('字数对比')
    expect(revisionPrompt).toContain('30%')
    expect(revisionPrompt).toContain('800 字')
    expect(revisionPrompt).toContain('revision_scope_guard')
    expect(revisionParseBlock).toContain('revisionPayload?.proseChapters')
    expect(revisionParseBlock).toContain('revisedFirst?.chapterText')
    expect(revisionParseBlock).toContain('revisionPayload?.chapterText')
    expect(revisionParseBlock).toContain('revisedFirst?.sceneBreakdown')
    expect(revisionParseBlock).toContain('revisionPayload?.sceneBreakdown')
    expect(revisionParseBlock).toContain('revisedFirst?.continuityNotes')
    expect(revisionParseBlock).toContain('revisionPayload?.continuityNotes')
    expect(revisionParseBlock).toContain('revision_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.revision_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.revisionReceipts')
    expect(revisionParseBlock).toContain('revisionPayload?.revision_receipts')
    expect(revisionParseBlock).toContain('revisionPayload?.revisionReceipts')
    expect(revisionParseBlock).toContain('deslop_repair_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.deslop_repair_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.deslopRepairReceipts')
    expect(revisionParseBlock).toContain('revisionPayload?.deslop_repair_receipts')
    expect(revisionParseBlock).toContain('revisionPayload?.deslopRepairReceipts')
    expect(revisionParseBlock).toContain('quality_audit_repair_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.quality_audit_repair_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.qualityAuditRepairReceipts')
    expect(revisionParseBlock).toContain('revisionPayload?.quality_audit_repair_receipts')
    expect(revisionParseBlock).toContain('revisionPayload?.qualityAuditRepairReceipts')
    expect(revisionParseBlock).toContain('revision_scope_guard')
  })

  test('keeps nested oh-story revision receipts for post-revision quality audit', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionStart = source.indexOf('const revisionPayload = getNovelPayload(revisionResult)')
    const revisionParseBlock = source.slice(
      revisionStart,
      source.indexOf('oh_story_delivery_receipts: revisionDeliveryReceipts', revisionStart) + 'oh_story_delivery_receipts: revisionDeliveryReceipts'.length + 80,
    )

    expect(revisionParseBlock).toContain('revisedFirst?.oh_story_delivery_receipts')
    expect(revisionParseBlock).toContain('revisedFirst?.ohStoryDeliveryReceipts')
    expect(revisionParseBlock).toContain('revisionPayload?.oh_story_delivery_receipts')
    expect(revisionParseBlock).toContain('revisionPayload?.ohStoryDeliveryReceipts')
    expect(revisionParseBlock).toContain('oh_story_delivery_receipts: revisionDeliveryReceipts')
  })

  test('normalizes oh-story findings without dropping evidence or fix fields', () => {
    const issue = normalizeIssue({
      severity: 'S2',
      category: 'prose',
      location: '第3段',
      evidence: '眼神复杂',
      issue: '抽象心理和AI高频套话',
      fix: '改成具体动作和对白反应',
    })

    expect(issue.severity).toBe('S2')
    expect(issue.type).toBe('prose')
    expect(issue.category).toBe('prose')
    expect(issue.location).toBe('第3段')
    expect(issue.evidence).toBe('眼神复杂')
    expect(issue.description).toBe('抽象心理和AI高频套话')
    expect(issue.fix).toBe('改成具体动作和对白反应')
    expect(issue.suggestion).toBe('改成具体动作和对白反应')
  })

  test('normalizes camelCase review control fields from model output', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewNormalizeStart = source.indexOf('const rawReviewIssues = [')
    const reviewNormalizeBlock = source.slice(
      reviewNormalizeStart,
      source.indexOf('if (options.revise === false || !shouldReviseProse', reviewNormalizeStart),
    )

    expect(reviewNormalizeStart).toBeGreaterThan(-1)
    expect(reviewNormalizeBlock).toContain('reviewPayload?.needsRevision')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.revisionDirectives')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.focusedRevisionModes')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.settingViolations')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.craftMetrics')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.findings')
    expect(reviewNormalizeBlock).toContain('...asArray(reviewPayload?.issues)')
    expect(reviewNormalizeBlock).toContain('...asArray(reviewPayload?.findings)')
  })

  const buildUsableV2NextChapterQualityPlan = () => ({
    version: 'oh_story_next_chapter_quality_plan_v1',
    quality_focus: ['下一章继续压住当前冲突。'],
    opening_actions: ['前300字原地承接本章章末动作。'],
    middle_actions: ['中段兑现一次规则反制。'],
    ending_actions: ['章末留下可追读的新问题。'],
    avoid_repetition: ['不要重复解释本章规则。'],
    evidence_basis: ['本章已经写出当前冲突的可定位证据。'],
  })

  test('v2 final decision blocks a structured quality failure even when the v2 score passes', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: true,
            approvable: true,
            score: 92,
            hard_failures: [],
            advisory_failures: [],
          },
        },
        quality_audit_checks: [
          {
            key: 'pre_store_structural_sync',
            status: 'fail',
            label: '细纲兑现未闭环',
          },
        ],
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.approvable).toBe(false)
    expect(decision.hard_failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'structured_quality_gate', source: 'deterministic' }),
    ]))
  })

  test('v2 final decision blocks a structured carry-over claim that only provides a fix', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: true,
            approvable: true,
            score: 92,
            hard_failures: [],
            advisory_failures: [],
          },
        },
        quality_audit_checks: [
          {
            key: 'pre_store_structural_sync',
            status: 'fail',
            label: '细纲兑现未闭环',
            fix: '下一章写入追踪文档。',
          },
        ],
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.hard_failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'structured_quality_gate', source: 'deterministic' }),
    ]))
  })

  test('v2 final decision allows a structured carry-over with locatable prose evidence', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: true,
            approvable: true,
            score: 92,
            hard_failures: [],
            advisory_failures: [],
          },
        },
        quality_audit_checks: [
          {
            key: 'pre_store_structural_sync',
            status: 'fail',
            label: '细纲兑现未闭环',
            evidence: '门槛白线后退半步，当前冲突已经在正文中落地。',
            fix: '下一章写入追踪文档。',
          },
        ],
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.approvable).toBe(true)
    expect(decision.hard_failures).toEqual([])
  })

  test('v2 final decision blocks an undelivered current-chapter delivery risk', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: true,
            approvable: true,
            score: 92,
            hard_failures: [],
            advisory_failures: [],
          },
        },
        delivery_risk_receipts: [
          {
            risk_item: '当前冲突兑现',
            delivered: false,
            evidence: '',
            remaining_risk: '正文未兑现当前冲突。',
          },
        ],
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.approvable).toBe(false)
    expect(decision.hard_failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'delivery_risk_receipt', source: 'deterministic' }),
    ]))
  })

  test('v2 final decision allows a locatable delivery receipt with only next-chapter carry-over', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: true,
            approvable: true,
            score: 92,
            hard_failures: [],
            advisory_failures: [],
          },
        },
        delivery_risk_receipts: [
          {
            risk_item: '下一章冲突强化',
            delivered: false,
            evidence: '门槛白线后退半步，玻璃门内外的当前冲突已经落成正文。',
            remaining_risk: '下一章继续强化冲突并写回状态。',
          },
        ],
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.approvable).toBe(true)
    expect(decision.hard_failures).toEqual([])
  })

  test('v2 final decision blocks a missing next-chapter quality plan', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: true,
            approvable: true,
            score: 92,
            hard_failures: [],
            advisory_failures: [],
          },
        },
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.approvable).toBe(false)
    expect(decision.hard_failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'next_chapter_quality_plan', source: 'deterministic' }),
    ]))
  })

  test('v2 final decision is not approvable when an original v2 hard failure remains', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: false,
            approvable: true,
            score: 92,
            hard_failures: [
              {
                key: 'non_chinese_leak',
                message: '正文出现连续英文段落',
                source: 'deterministic',
              },
            ],
            advisory_failures: [],
          },
        },
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.approvable).toBe(false)
    expect(decision.hard_failures).toHaveLength(1)
  })

  test('v2 final decision preserves and deduplicates v2 hard failures while adding safety', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        prose_quality_v2: {
          decision: {
            passed: false,
            approvable: true,
            score: 92,
            hard_failures: [
              {
                key: 'non_chinese_leak',
                message: '正文出现连续英文段落',
                source: 'deterministic',
                evidence: 'Chapter summary leaked into the prose.',
                severity: 'S1',
              },
              { key: 'non_chinese_leak', message: '正文出现连续英文段落', source: 'deterministic' },
            ],
            advisory_failures: ['节奏仍可继续收紧'],
          },
        },
        next_chapter_quality_plan: buildUsableV2NextChapterQualityPlan(),
      },
      {
        blocked: true,
        reasons: ['命中禁止仿写表达'],
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.approvable).toBe(false)
    expect(decision.hard_failures.filter((item: any) => item.key === 'non_chinese_leak')).toHaveLength(1)
    expect(decision.hard_failures.find((item: any) => item.key === 'non_chinese_leak')).toMatchObject({
      evidence: 'Chapter summary leaked into the prose.',
      severity: 'S1',
    })
    expect(decision.hard_failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'reference_safety', source: 'deterministic' }),
    ]))
    expect(decision.reasons).toEqual(expect.arrayContaining([
      '正文出现连续英文段落',
      '仿写安全未通过：命中禁止仿写表达',
      '节奏仍可继续收紧',
    ]))
  })

  test('blocks quality gate when oh-story contract checks fail even if the score passes', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        score: 88,
        issues: [],
        quality_audit_checks: [
          {
            key: 'missing_quality_audit_checks',
            label: '缺少质量诊断自检',
            status: 'fail',
            evidence: 'chapter_target.quality_audit_contract 存在，但模型没有输出 quality_audit_checks。',
            fix: '补充 quality_audit_checks。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('质量诊断自检')
  })

  test('summarizes anonymous structured gate failures without leaking prose excerpts', () => {
    const proseExcerpt = '江哲却注意到，老陈说出“诡序天平”四个字时，所有追索者的枪口同时向下沉了半寸。不是害怕，是训练出来的避让。'
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 88,
        issues: [],
        next_chapter_quality_plan: {
          quality_focus: ['继续压住公开诱捕压力。'],
          opening_actions: ['用镇门封锁承接。'],
          middle_actions: ['让规则复核升级。'],
          ending_actions: ['章末留下镇门诱捕。'],
          avoid_repetition: ['不重复解释天平规则。'],
          evidence_basis: ['本章已经写出诡序天平反制。'],
        },
        quality_audit_checks: [
          {
            status: 'fail',
            evidence: proseExcerpt,
            fix: '补成可复核的质量诊断回执。',
          },
        ],
      },
    )

    const reasonText = decision.reasons.join('｜')
    expect(decision.passed).toBe(false)
    expect(reasonText).toContain('质量诊断')
    expect(reasonText).not.toContain('江哲却注意到')
  })

  test('blocks quality gate when prose revision receipts are missing after revision', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 90,
        issues: [],
        revision_receipt_checks: [
          {
            key: 'missing_revision_receipts',
            label: '修订回执未生成',
            status: 'fail',
            evidence: '自检要求修复承接风险，但修订结果没有逐条 revision_receipts。',
            fix: '重新修订并逐条输出 revision_receipts.changed_evidence。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('修订回执未生成')
  })

  test('blocks quality gate when deslop repair receipts still have residual risks', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 90,
        issues: [],
        deslop_repair_checks: [
          {
            key: 'deslop_repair_receipt_sync',
            label: '去AI味修复回执未闭环',
            status: 'fail',
            evidence: 'Gate F 章末总结体仍残留。',
            fix: '重新修订并给出 deslop_repair_receipts.changed_evidence。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('去AI味修复回执未闭环')
  })

  test('does not block quality gate on post-repair sync carry-over when prose score and hard issues pass', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 85,
            max_critical_issues: 0,
            max_high_issues: 1,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 85,
        issues: [],
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章继续兑现镇门诱捕。'],
          opening_actions: ['从江哲踏上石板路后的第一步写起。'],
          middle_actions: ['让镇门筛口触发一次真实代价。'],
          ending_actions: ['露出陆长风遗留物的一角。'],
          avoid_repetition: ['不要重复一次天平复核。'],
          evidence_basis: ['本章结尾已经完成镇门邀请和捕兽夹钩子。'],
        },
        quality_audit_checks: [
          {
            key: 'pre_store_structural_sync',
            sync_key: 'chapter_blueprint_sync',
            label: '细纲兑现未闭环',
            status: 'fail',
            evidence: '章节蓝图同步：仍有 2 项需要写回追踪。',
            fix: '后续同步章节蓝图和追踪文档。',
            missed_count: 2,
          },
          {
            key: 'quality_audit_repair_receipt_sync',
            label: '质量诊断修复回执未闭环',
            status: 'fail',
            evidence: '质量诊断修复回执残留 3：需要下一轮继续处理。',
            fix: '下一轮优先处理剩余质量诊断回执。',
            missed_count: 3,
          },
          {
            key: 'revision_cascade_impact_evidence',
            label: '修订级联影响证据未闭环',
            status: 'fail',
            evidence: '资产状态需同步到后续章节。',
            fix: '写入状态追踪，不影响本章正文入库。',
          },
        ],
        revision_receipt_checks: [
          {
            key: 'prose_revision_receipt_sync',
            label: '修订回执未闭环',
            status: 'fail',
            evidence: '修订回执残留 5：需要下一章或同步任务继续处理。',
            fix: '下一章继续处理回执残留。',
            missed_count: 5,
          },
        ],
        deslop_repair_checks: [
          {
            key: 'deslop_repair_receipt_sync',
            label: '去AI味修复回执未闭环',
            status: 'fail',
            evidence: '去AI味修复回执残留 2：仍有轻度模板风险需下轮继续压。',
            fix: '下一轮继续压去AI味残留。',
            missed_count: 2,
          },
        ],
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.reasons.join('｜')).not.toContain('结构化自检失败')
  })

  test('does not block quality gate on benchmark recall sync and Gate B carry-over after successful repair', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 85,
            max_critical_issues: 0,
            max_high_issues: 1,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 86,
        issues: [],
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章进入镇门内部，减少同类颜色词重复。'],
          opening_actions: ['前300字从镇门门槛和老陈伤势承接。'],
          middle_actions: ['中段让封锁令权限和秩序核心代价继续压迫主角。'],
          ending_actions: ['章末露出陆长风线索的下一层钩子。'],
          avoid_repetition: ['不要重复废墟封锁和天平复核。'],
          evidence_basis: ['本章已经写出镇门邀请、秩序核心耗损和陆长风线索钩子。'],
        },
        benchmark_recall_checks: [
          {
            key: 'benchmark_recall_sync',
            label: '文风召回未闭环',
            status: 'fail',
            evidence: '文风召回同步：本章已按三轮压问推进，剩余节奏差异写入下一章继续处理。',
            fix: '下一章继续把对标节奏转成镇门内部的压迫、爆发、冷却和反应。',
            missed_count: 1,
          },
        ],
        deslop_repair_checks: [
          {
            key: 'deslop_repair_receipt_sync',
            label: '去AI味修复回执未闭环',
            status: 'fail',
            evidence: 'Gate B 句式套路与主语节奏：多人对峙场景仍需保持主语清晰，不能过度省略。',
            fix: '下一章多人对峙仍需继续用物件和动作承接。',
            missed_count: 1,
          },
          {
            key: 'deslop_repair_receipt_sync',
            label: '去AI味修复回执未闭环',
            status: 'fail',
            evidence: 'Gate B 句式套路与主语节奏：多人对峙场景仍需清晰点名，未完全消除人名起句。',
            fix: '下一轮继续压去AI味残留，但不重写整章。',
            missed_count: 1,
          },
        ],
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.reasons.join('｜')).not.toContain('文风召回未闭环')
    expect(decision.reasons.join('｜')).not.toContain('去AI味修复回执未闭环')
  })

  test('does not block quality gate on repaired receipt evidence-location misses and state carry-over', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 85,
            max_critical_issues: 0,
            max_high_issues: 1,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 85,
        issues: [],
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章继续压住镇门内部识别机制和左手代价。'],
          opening_actions: ['前300字从镇门封锁和老陈伤势承接。'],
          middle_actions: ['中段让第二枚秩序核心来源进入可见代价。'],
          ending_actions: ['章末留下诡序之主资产状态的下一层钩子。'],
          avoid_repetition: ['不要重复雾、复眼、符文同组意象。'],
          evidence_basis: ['本章已经写出镇门邀请、秩序核心耗损和规则反制。'],
        },
        quality_audit_checks: [
          {
            key: 'pre_store_structural_sync',
            sync_key: 'chapter_blueprint_sync',
            label: '细纲兑现未闭环',
            status: 'fail',
            evidence: '章节蓝图同步：当前正文部分目标未充分落地，但第二枚秩序核心来源需后续同步写回。',
            fix: '下一章继续解释镇门内部识别机制，但不能一次性讲完。',
            missed_count: 1,
          },
          {
            key: 'pre_store_structural_sync',
            sync_key: 'benchmark_recall_sync',
            label: '文风召回未闭环',
            status: 'fail',
            evidence: '文风召回同步：当前正文部分节奏未充分落地；剩余节奏差异进入下一章继续处理。',
            fix: '后续继续压住压迫、爆发、冷却和反应。',
            missed_count: 1,
          },
          {
            key: 'quality_audit_repair_receipt_sync',
            label: '质量诊断修复回执未闭环',
            status: 'fail',
            evidence: 'changed_evidence 无法定位到修订后正文。',
            fix: '后续需延续左手代价。',
            remaining_risk: '镇门内部识别机制需下一章继续解释但不能一次性讲完。',
          },
          {
            key: 'revision_cascade_impact_evidence',
            label: '修订级联影响证据未闭环',
            status: 'fail',
            evidence: '第二枚秩序核心、暗金信件、江哲左掌代价需同步到后续追踪。',
            fix: '写入状态追踪，不影响本章正文入库。',
            remaining_risk: '资产状态写回义务。',
          },
        ],
        revision_receipt_checks: [
          {
            key: 'prose_revision_receipt_sync',
            label: '修订回执未闭环',
            status: 'fail',
            evidence: 'changed_evidence 无法定位到修订后正文。',
            fix: '诡序之主本体仍未直接出场，符合当前认知边界；下一章需从镇门前继续。',
            remaining_risk: '下一章继续承接敌方视觉体系。',
          },
        ],
        deslop_repair_checks: [
          {
            key: 'deslop_repair_receipt_sync',
            label: '去AI味修复回执未闭环',
            status: 'fail',
            evidence: 'Gate A changed_evidence 无法定位到修订后正文。',
            fix: '旧回执证据片段已被修订改写，后续继续避免模板表达。',
            remaining_risk: 'changed_evidence 无法定位到修订后正文。',
          },
          {
            key: 'deslop_repair_receipt_sync',
            label: '去AI味修复回执未闭环',
            status: 'fail',
            evidence: 'Gate G changed_evidence 无法定位到修订后正文。',
            fix: '旧回执证据片段已被修订改写，下一章继续避免章末总结体。',
            remaining_risk: 'changed_evidence 无法定位到修订后正文。',
          },
        ],
        delivery_risk_receipts: [
          {
            risk_item: '补资产状态：诡序之主',
            required_action: '补资产状态：诡序之主。',
            delivered: false,
            evidence: '诡序之主本体仍未直接出场，符合当前认知边界。',
            remaining_risk: '承接回执缺失：补资产状态：诡序之主。',
          },
          {
            risk_item: '补角色状态：江哲',
            required_action: '补角色状态：江哲左掌代价。',
            delivered: false,
            evidence: '江哲左掌代价已经进入下一章质量续航计划。',
            remaining_risk: '承接回执缺失：补角色状态：角色状态增量缺口 2｜修复：江哲：主角。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.reasons.join('｜')).not.toContain('结构化自检失败')
    expect(decision.reasons.join('｜')).not.toContain('承接回执未兑现')
  })

  test('does not block quality gate on benchmark recall sync wording and quality-continuation delivery receipts', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 85,
            max_critical_issues: 0,
            max_high_issues: 1,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 86,
        issues: [],
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章直接验证镇门内陆长风声音真假。'],
          opening_actions: ['前300字承接镇门声音和江哲即时选择。'],
          middle_actions: ['中段让镇门夹缝触发一次规则反制。'],
          ending_actions: ['章末留下陆长风真实状态碎片。'],
          avoid_repetition: ['不要重复封锁令宣读。'],
          evidence_basis: ['本章已经留下镇门内声音和核心裂痕代价。'],
        },
        quality_audit_checks: [
          {
            key: 'pre_store_structural_sync',
            sync_key: 'benchmark_recall_sync',
            label: '文风召回未闭环',
            status: 'fail',
            evidence: '召回缺口 1：正文有 1 项文风召回要求未充分落地。',
            fix: '下一次修订优先补足文风召回 missed 项；保留 gaps 中的缺口，不要把缺失的深度拆解、冲突来源或文风偏差误判为已经解决。',
            missed_count: 1,
          },
        ],
        delivery_risk_receipts: [
          {
            risk_item: '补追读：漏追读 7',
            required_action: '把反派长期目标转入下一章追读计划。',
            delivered: false,
            evidence: '自检没有提供可定位正文证据，无法证明承接风险已兑现。',
            remaining_risk: '承接回执缺失：补追读：漏追读 7｜修复：诡序之主：通过不断降临怪谈副本，彻底蚕食蓝星人类的理智，将蓝星转化为怪谈世界的一部分，实现真身降临。',
          },
          {
            risk_item: '修吸引力：吸引力缺口 4',
            required_action: '把核心卖点转入下一章质量续航。',
            delivered: false,
            evidence: '自检没有提供可定位正文证据，无法证明承接风险已兑现。',
            remaining_risk: '承接回执缺失：修吸引力：吸引力缺口 4｜修复：江哲：破解怪谈世界：我是超人，怪谈你随意的核心规则。',
          },
          {
            risk_item: '补循环：故事循环缺口 2',
            required_action: '把资产状态写回下一轮状态更新。',
            delivered: false,
            evidence: '自检没有提供可定位正文证据，无法证明承接风险已兑现。',
            remaining_risk: '承接回执缺失：补循环：故事循环缺口 2｜修复：不要重写全设定表；只处理本章计划触达且正文实际改变的关键资产。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.reasons.join('｜')).not.toContain('文风召回未闭环')
    expect(decision.reasons.join('｜')).not.toContain('承接回执未兑现')
  })

  test('blocks quality gate when deslop diagnostic gates fail even if the score passes', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 88,
        issues: [],
        deslop_gate_diagnostics: {
          gates: [
            {
              gate: 'A',
              label: '禁用词/模板表达',
              status: 'fail',
              evidence: '那不是普通水迹，而是一种更深的规则。',
              fix: '直接写水迹倒流。',
            },
          ],
        },
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('禁用词/模板表达')
  })

  test('blocks quality gate when delivery risk receipts remain undelivered even if the score passes', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 90,
        issues: [],
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章继续把门槛白线写成规则边界。'],
          opening_actions: ['前300字用门槛白线承接玻璃门对峙。'],
          middle_actions: ['中段让白线规则反制一次硬闯。'],
          ending_actions: ['章末用白线另一侧的新脚印形成追读。'],
          avoid_repetition: ['不要再用旁白总结“危机才刚开始”。'],
          evidence_basis: ['本章已把门槛白线写成新的规则边界。'],
        },
        delivery_risk_receipts: [
          {
            risk_item: 'IP场面延展：待延展 1',
            required_action: '延展玻璃门内外对峙的门槛白线强画面。',
            delivered: false,
            evidence: '',
            remaining_risk: '正文没有延展玻璃门内外对峙。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('承接回执未兑现')
    expect(decision.reasons.join('｜')).toContain('IP场面延展')
  })

  test('does not block quality gate when delivery risk receipts are delivered with no remaining risk', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 90,
        issues: [],
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章继续把门槛白线写成规则边界。'],
          opening_actions: ['前300字用门槛白线承接玻璃门对峙。'],
          middle_actions: ['中段让白线规则反制一次硬闯。'],
          ending_actions: ['章末用白线另一侧的新脚印形成追读。'],
          avoid_repetition: ['不要再用旁白总结“危机才刚开始”。'],
          evidence_basis: ['本章已把门槛白线写成新的规则边界。'],
        },
        delivery_risk_receipts: [
          {
            risk_item: 'IP场面延展：待延展 1',
            required_action: '延展玻璃门内外对峙的门槛白线强画面。',
            delivered: true,
            evidence: '门槛白线后退半步，玻璃门内外对峙被写成新的规则边界。',
            remaining_risk: '无',
          },
        ],
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.reasons.join('｜')).not.toContain('承接回执未兑现')
  })

  test('does not block quality gate for delivery risk receipts that only need post-delivery sync or next-chapter carry-over', () => {
    const decision = getQualityGateDecision(
      {
        reference_config: {
          quality_gate: {
            enabled: true,
            min_score: 78,
          },
        },
      },
      {
        passed: true,
        revised: true,
        score: 90,
        issues: [],
        next_chapter_quality_plan: {
          version: 'oh_story_next_chapter_quality_plan_v1',
          quality_focus: ['下一章继续压住镇门危局。'],
          opening_actions: ['前300字原地承接镇门倒计时。'],
          middle_actions: ['中段用资产代价换一次规则反制。'],
          ending_actions: ['章末留下镇门新权限钩子。'],
          avoid_repetition: ['不要重复解释镇门来历。'],
          evidence_basis: ['本章已经写出镇门封锁和资产消耗。'],
        },
        delivery_risk_receipts: [
          {
            risk_item: '资产挂钩',
            required_action: '让关键资产参与胜负。',
            delivered: false,
            evidence: '秩序残核白光与照胆鼎残影共同压住完美超人基因。',
            remaining_risk: '资产台账需同步。',
          },
          {
            risk_item: '伏笔追踪',
            required_action: '把新门名写入追踪。',
            delivered: false,
            evidence: '入门者，留名。',
            remaining_risk: '需更新追踪/伏笔.md。',
          },
          {
            risk_item: '回报密度',
            required_action: '保持阶段性物理爽点。',
            delivered: false,
            evidence: '复核前不得强夺随身物。',
            remaining_risk: '下一章需补更强物理爽点或规则反制。',
          },
          {
            risk_item: '状态跟踪',
            required_action: '中段跟踪江哲、老陈、敌方封锁状态。',
            delivered: false,
            evidence: '江哲黑符收紧且临时通行；老陈污染爬向喉咙；追索者被令牌约束但履带车跟随。',
            remaining_risk: 'delivery_risk_receipts middle_actions 的 evidence 未落在中段事件推进。',
          },
        ],
      },
    )

    expect(decision.passed).toBe(true)
    expect(decision.reasons.join('｜')).not.toContain('承接回执未兑现')
  })

  test('persists a warning prose quality review when valid prose is admitted with advisory quality failures', async () => {
    const failedReview = (evidence: string) => ({
      score: 61,
      publishable: false,
      dimensions: { ...proseQualityScores, prose_style: 4 },
      findings: [{
        key: 'prose_style',
        severity: 'S2',
        dimension: 'prose_style',
        evidence,
        required_change: '减少模板化表达并保留具体动作',
        acceptance_test: '正文以动作和对白推进，不使用抽象总结',
      }],
    })
    const revisedText = buildPipelineProse(
      '江澈撞断路灯，追兵的包围线被飞石逼开。',
      '沿自己制造的缺口夺下通讯器并继续推进',
    )
    const harness = await createProsePipelineHarness({
      reviewPayloads: [
        failedReview('倒数压到最后三秒，江澈停在围墙阴影里等待。'),
        failedReview('江澈撞断路灯，追兵的包围线被飞石逼开。'),
      ],
      revisionTexts: [revisedText],
    })

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
      quality_threshold: 78,
    })
    const proseQualityReview = (await listNovelReviews(harness.workspace, harness.project.id))
      .filter(review => review.review_type === 'prose_quality')
      .at(-1)
    const payload = JSON.parse(String(proseQualityReview?.payload || '{}'))

    expect(result.admission_status).toBe('accepted_with_warnings')
    expect(result.quality_warnings).toContainEqual(expect.objectContaining({ source: 'quality' }))
    expect(proseQualityReview?.status).toBe('warn')
    expect(payload.self_check?.review).toMatchObject({
      passed: false,
      score: 61,
      needs_revision: true,
    })
    expect(payload.self_check?.review?.issues?.length).toBeGreaterThan(0)
  })

  test('reports review stage status from quality gate decisions', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const reviewStart = source.indexOf("await onStage('review', { status: 'running' })")
    const qualityGateStart = source.indexOf('let qualityGateReview = buildQualityGateReviewWithDeterministicCleanup')
    const reviewBlock = source.slice(reviewStart, qualityGateStart)

    expect(reviewBlock).toContain('const initialReviewDecision = getQualityGateDecision(qualityGateProject')
    expect(reviewBlock).toContain("status: initialReviewDecision.passed ? 'success' : 'warn'")
    expect(reviewBlock).toContain("phase: round > 0 ? 'quality_recheck' : 'quality_review'")
    expect(reviewBlock).toContain("await onStage('revise', { status: 'running', phase: 'quality_revision', round })")
    expect(reviewBlock).toContain('maxRevisionRounds: isDraftReviewOnly || isDraftOnly ? 0 : 1')
    expect(reviewBlock).toContain('qualityWarningCandidates.push(')
    expect(reviewBlock).not.toContain('assertProseQualityCanStore')
  })

  test('formats structured review findings for stored issue summaries', () => {
    const summary = formatReviewIssueForStorage({
      severity: 'S2',
      category: 'prose',
      location: '第3段',
      evidence: '眼神复杂',
      issue: '抽象心理和AI高频套话',
      fix: '改成具体动作和对白反应',
    })

    expect(summary).toContain('S2')
    expect(summary).toContain('prose')
    expect(summary).toContain('第3段')
    expect(summary).toContain('抽象心理和AI高频套话')
    expect(summary).toContain('证据：眼神复杂')
    expect(summary).toContain('修法：改成具体动作和对白反应')
  })

  test('formats scene-card receipt findings with scene and field metadata for repair tasks', () => {
    const summary = formatReviewIssueForStorage({
      key: 'scene_card_receipt_2_undelivered',
      label: '场景卡回执证据复核',
      status: 'fail',
      scene_no: 2,
      fields: ['目标/阻碍/状态变化', '感知锚点'],
      evidence: '场景2《盟友改口》scene_card_receipts 标记未兑现。',
      fix: '按 delivered=false 的字段修正文，再重写 scene_card_receipts。',
    })

    expect(summary).toContain('fail')
    expect(summary).toContain('场景卡回执证据复核')
    expect(summary).toContain('场景2')
    expect(summary).toContain('目标/阻碍/状态变化、感知锚点')
    expect(summary).toContain('scene_card_receipt_2_undelivered')
    expect(summary).not.toContain('[object Object]')
  })

  test('exposes pre-draft brief routes for build, save, and confirm', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-chapter-context-routes.ts'), 'utf8')

    expect(source).toContain("app.get('/api/novel/chapters/:chapterId/pre-draft-brief'")
    expect(source).toContain("app.put('/api/novel/chapters/:chapterId/pre-draft-brief'")
    expect(source).toContain("app.post('/api/novel/chapters/:chapterId/pre-draft-brief/confirm'")
    expect(source).toContain("app.post('/api/novel/chapters/:chapterId/pre-draft-brief/style-samples'")
    expect(source).toContain('applyStyleSampleStrategyAuthorAction')
    expect(source).toContain('raw_payload.pre_draft_brief')
  })
})

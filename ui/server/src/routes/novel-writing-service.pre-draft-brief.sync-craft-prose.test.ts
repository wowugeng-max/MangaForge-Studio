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

describe('chapter pre-draft brief sync-craft/prose-review', () => {
  test('carries prose review title uniqueness checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '半印缺页' },
      [
        { id: 1, chapter_no: 1, title: '第1章 门外学生' },
        { id: 2, chapter_no: 2, title: '门外学生' },
        { id: 3, chapter_no: 3, title: '半印缺页' },
      ],
      [
        {
          id: 205,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:06:30.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                title_uniqueness_checks: [
                  {
                    key: 'title_duplicate',
                    label: '标题重复',
                    status: 'fail',
                    old_title: '门外学生',
                    new_title: '半印照出缺页',
                    outline_title_synced: false,
                    file_name_synced: false,
                    chapter_title_line_synced: false,
                    evidence: '旧标题与第1章重复，且正文开篇没有半印照缺页的差异化画面。',
                    remaining_risk: '需要同步大纲标题、文件名和正文标题行。',
                  },
                  {
                    key: 'title_line_synced',
                    label: '标题行同步',
                    status: 'pass',
                    evidence: '正文标题行已经更新。',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '半印缺页',
        summary: '半枚旧印照出缺页背后的名字。',
        conflict: '追查缺页会触发禁库规则。',
        ending_hook: '缺页背面显出门外学生的死亡日期。',
        scene_cards: [
          { scene_no: 1, title: '半印入灯', reader_payoff: '让标题承诺变成可见画面。' },
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
      { chapter_no: 3, title: '半印缺页' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修章节标题')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('章节标题：标题缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('半印照出缺页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('同步大纲标题、文件名和正文标题行')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('正文标题行已经更新')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('old_title')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('new_title')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('正文标题行')
    expect(prompt).toContain('章节标题：标题缺口 1')
    expect(prompt).toContain('旧标题与第1章重复')
    expect(prompt).toContain('半印照缺页')
  })

  test('carries prose review blueprint consumption checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '门卡代价' },
      [
        { id: 3, chapter_no: 3, title: '半印缺页' },
        { id: 4, chapter_no: 4, title: '门卡代价' },
      ],
      [
        {
          id: 206,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:07:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                blueprint_consumption_checks: [
                  {
                    key: 'cost_reward',
                    label: '代价收益',
                    status: 'fail',
                    blueprint_field: 'cost_and_reward',
                    expected: '行动受阻后付出代价再拿奖励。',
                    delivered_evidence: '正文只写主角拿到门卡。',
                    missing_gap: '只给结果没有代价。',
                    fix: '下一章必须让主角先被禁库门拒绝，再用半印血线换一次门卡权限。',
                    remaining_risk: '章尾还要把门卡权限转成下一章承接。',
                  },
                  {
                    key: 'opening_hook',
                    label: '开篇钩子',
                    status: 'pass',
                    delivered_evidence: '开头有禁库门响。',
                    missing_gap: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '门卡代价',
        summary: '主角用半印血线换门卡权限。',
        conflict: '禁库门拒绝没有代价的通行。',
        ending_hook: '门卡只亮了半格权限。',
        scene_cards: [
          { scene_no: 1, title: '门前受阻', reader_payoff: '把门卡权限写成有代价的小胜。' },
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
      { chapter_no: 4, title: '门卡代价' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补细纲兑现')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('细纲兑现：执行缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('半印血线换一次门卡权限')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('只给结果没有代价')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('开头有禁库门响')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('blueprint_field')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('expected')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('章尾还要把门卡权限转成下一章承接')
    expect(prompt).toContain('细纲兑现：执行缺口 1')
    expect(prompt).toContain('正文只写主角拿到门卡')
    expect(prompt).toContain('章尾还要把门卡权限转成下一章承接')
  })

  test('carries prose review word count checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '门卡代价' },
      [
        { id: 3, chapter_no: 3, title: '半印缺页' },
        { id: 4, chapter_no: 4, title: '门卡代价' },
      ],
      [
        {
          id: 207,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:07:30.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                word_count_checks: [
                  {
                    key: 'min_required_count',
                    label: '字数下限',
                    status: 'warn',
                    current_count: 2400,
                    target_count: 4200,
                    min_required_count: 3600,
                    evidence: '正文低于字数下限，关键动作只写结果。',
                    remaining_risk: '不得靠环境描写、重复情绪或内心独白凑字数。',
                    fix: '下一章扩写动作过程、选择代价、对话交锋和章末钩子铺垫。',
                  },
                  {
                    key: 'format_count',
                    label: '格式统计',
                    status: 'pass',
                    evidence: '段落完整。',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '门卡代价',
        summary: '主角用半印血线换门卡权限。',
        conflict: '禁库门拒绝没有代价的通行。',
        ending_hook: '门卡只亮了半格权限。',
        scene_cards: [
          { scene_no: 1, title: '门前受阻', reader_payoff: '把门卡权限写成有代价的小胜。' },
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
      { chapter_no: 4, title: '门卡代价' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补字数执行')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('字数执行：扩写缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('current_count=2400')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('扩写动作过程、选择代价、对话交锋')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('段落完整')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('current_count')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('target_count')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('min_required_count')
    expect(prompt).toContain('字数执行：扩写缺口 1')
    expect(prompt).toContain('正文低于字数下限')
    expect(prompt).toContain('不得靠环境描写、重复情绪或内心独白凑字数')
  })

  test('carries prose review chapter benchmark checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '门卡代价' },
      [
        { id: 3, chapter_no: 3, title: '半印缺页' },
        { id: 4, chapter_no: 4, title: '门卡代价' },
      ],
      [
        {
          id: 208,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                chapter_benchmark_checks: [
                  {
                    key: 'rhythm_benchmark',
                    label: '对标章节节奏基准',
                    status: 'warn',
                    benchmark_dimension: '节奏基准',
                    expected_method: '开局压迫、三段升级、章尾回收，只学节奏不复制桥段。',
                    delivered_evidence: '正文中段直接跳到拿门卡，没有三段升级。',
                    originality_guard: '不得复制对标章门派审判桥段和原句。',
                    fix: '下一章按开局压迫、三段升级和章尾回收重排门卡事件。',
                    remaining_risk: '章尾需要回收门卡权限并承接下一层禁令。',
                  },
                  {
                    key: 'copy_guard',
                    label: '原创边界',
                    status: 'pass',
                    delivered_evidence: '没有复制原句。',
                    originality_guard: '已遵守。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '门卡代价',
        summary: '主角用半印血线换门卡权限。',
        conflict: '禁库门拒绝没有代价的通行。',
        ending_hook: '门卡只亮了半格权限。',
        scene_cards: [
          { scene_no: 1, title: '门前受阻', reader_payoff: '把门卡权限写成有代价的小胜。' },
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
      { chapter_no: 4, title: '门卡代价' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补章节基准')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('章节基准：基准缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('开局压迫、三段升级和章尾回收')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('不得复制对标章门派审判桥段和原句')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('没有复制原句')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('benchmark_dimension')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('expected_method')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('originality_guard')
    expect(prompt).toContain('章节基准：基准缺口 1')
    expect(prompt).toContain('正文中段直接跳到拿门卡')
    expect(prompt).toContain('下一层禁令')
  })

  test('carries prose review creation quality checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '门卡代价' },
      [
        { id: 3, chapter_no: 3, title: '半印缺页' },
        { id: 4, chapter_no: 4, title: '门卡代价' },
      ],
      [
        {
          id: 209,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:30.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                innovation_checks: [
                  {
                    key: 'rule_contrast',
                    label: '创新执行',
                    status: 'warn',
                    innovation_type: '规则反差',
                    differentiating_mechanism: '用半印血线反制禁库门规。',
                    visualized_scene: '门规读数沿血线倒转。',
                    reader_retellable_hook: '玄灯许可在裂纹里亮起。',
                    long_term_fit: '服务超人规则怪谈的核心卖点。',
                    fix: '下一章必须把半印血线写成规则反差和可视化IP场面。',
                  },
                ],
                chapter_attraction_checks: [
                  {
                    key: 'opening_to_page_turn',
                    label: '吸引力缺口',
                    status: 'fail',
                    attraction_dimension: '开篇钩子到章末翻页',
                    opening_hook: '开篇没有反常响动。',
                    scene_goal_obstacle_turn_reward: '缺目标阻碍转折回报。',
                    ending_page_turn: '章末没有黑塔许可选择。',
                    fix: '下一章开篇给旧城门反常响动，中段补目标阻碍转折回报，章末留下黑塔许可选择。',
                  },
                ],
                story_drive_checks: [
                  {
                    key: 'protagonist_choice',
                    label: '故事驱动',
                    status: 'warn',
                    protagonist_choice: '主角没有主动押上裂纹阵盘。',
                    obstacle: '执事封锁资格。',
                    cost: '暴露暗伤。',
                    state_change: '转为主动入局。',
                    next_causality: '内门长老点名让他明日入塔。',
                    fix: '下一章必须写主角主动选择、明确阻碍、选择代价、状态变化和下一步因果。',
                  },
                ],
                character_arc_checks: [
                  {
                    key: 'growth_beat',
                    label: '人物弧光',
                    status: 'warn',
                    character: '李玄',
                    desire: '保住试炼资格。',
                    flaw_pressure: '害怕暴露裂纹阵盘。',
                    relationship_change: '主动向林青禾求证。',
                    growth_beat: '公开承认残阵缺陷。',
                    voice_anchor: '短句反问。',
                    fix: '下一章必须把欲望、缺陷受压、关系变化、成长节点和口吻锚点落成场景。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '门卡代价',
        summary: '主角用半印血线换门卡权限。',
        conflict: '禁库门拒绝没有代价的通行。',
        ending_hook: '门卡只亮了半格权限。',
        scene_cards: [
          { scene_no: 1, title: '门前受阻', reader_payoff: '把门卡权限写成有代价的小胜。' },
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
      { chapter_no: 4, title: '门卡代价' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 4')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补创新')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('创新：创新缺口 1')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修吸引力：吸引力缺口 1')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('故事力：驱动缺口 1')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('人物弧光：弧光缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('规则反差和可视化IP场面')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('黑塔许可选择')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('主动选择、明确阻碍、选择代价')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('公开承认残阵缺陷')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('故事力开篇修复')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('protagonist_choice')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('cost')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('next_causality')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('人物弧光开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('relationship_change')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('voice_anchor')
    expect(prompt).toContain('创新：创新缺口 1')
    expect(prompt).toContain('修吸引力：吸引力缺口 1')
    expect(prompt).toContain('故事力：驱动缺口 1')
    expect(prompt).toContain('人物弧光：弧光缺口 1')
  })

  test('carries prose review core contract checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '门卡代价' },
      [
        { id: 3, chapter_no: 3, title: '半印缺页' },
        { id: 4, chapter_no: 4, title: '门卡代价' },
      ],
      [
        {
          id: 212,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:45.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                core_contract_checks: [
                  {
                    key: 'core_promise_drift',
                    label: '核心承诺漂移',
                    status: 'fail',
                    core_promise: '超人力量与规则怪谈互相反制，带来可见翻盘。',
                    mainline_service: '本章只在查门卡，没有让门卡规则改变胜负。',
                    core_emotion: '压迫后反制的爽感不足。',
                    rule_judgement: '门卡规则没有参与胜负判定。',
                    ending_question: '章末没有把半格权限转成下一章新问题。',
                    evidence: '主角拿到门卡后只是离开禁库门。',
                    fix: '下一章必须让半格门卡权限当场限制主角，再被半印血线反制，章尾留下黑塔许可的新问题。',
                    remaining_risk: '不能继续写成单纯查案或解释规则。',
                  },
                  {
                    key: 'core_contract_ok',
                    label: '核心契约已兑现',
                    status: 'pass',
                    core_promise: '旧城规则反制。',
                    evidence: '正文已有规则反制。',
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
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '门卡代价',
        summary: '主角用半印血线换门卡权限。',
        conflict: '禁库门拒绝没有代价的通行。',
        ending_hook: '门卡只亮了半格权限。',
        scene_cards: [
          { scene_no: 1, title: '门前受阻', reader_payoff: '把门卡权限写成有代价的小胜。' },
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
      { chapter_no: 4, title: '门卡代价' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('创作契约：核心承诺缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('core_contract_checks')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('超人力量与规则怪谈互相反制')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('半格门卡权限当场限制主角')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('核心契约已兑现')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('前300字')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('规则判定')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('黑塔许可的新问题')
    expect(prompt).toContain('创作契约：核心承诺缺口 1')
    expect(prompt).toContain('门卡规则没有参与胜负判定')
    expect(prompt).toContain('不能继续写成单纯查案或解释规则')
  })

  test('carries prose review banned word checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '门卡代价' },
      [
        { id: 3, chapter_no: 3, title: '半印缺页' },
        { id: 4, chapter_no: 4, title: '门卡代价' },
      ],
      [
        {
          id: 210,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                banned_words_checks: [
                  {
                    key: 'mode_one_ai_signature',
                    label: '硬禁词',
                    status: 'fail',
                    matched_word: '命运齿轮',
                    level: 'hard',
                    location: 'ending',
                    replacement: '用门卡只亮半格权限的物理动作替代。',
                    evidence: '章末写了“命运齿轮开始转动”。',
                    remaining_risk: '下一章不得复现命运齿轮、此时此刻等模板表达。',
                  },
                  {
                    key: 'dialogue_tag',
                    label: '对白标签',
                    status: 'pass',
                    matched_word: '',
                    evidence: '对白无标签污染。',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '门卡代价',
        summary: '主角用半印血线换门卡权限。',
        conflict: '禁库门拒绝没有代价的通行。',
        ending_hook: '门卡只亮了半格权限。',
        scene_cards: [
          { scene_no: 1, title: '门前受阻', reader_payoff: '把门卡权限写成有代价的小胜。' },
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
      { chapter_no: 4, title: '门卡代价' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修禁用词')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('禁用词：硬禁缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('matched_word=命运齿轮')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门卡只亮半格权限')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('对白无标签污染')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('matched_word')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('replacement')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('命运齿轮开始转动')
    expect(prompt).toContain('禁用词：硬禁缺口 1')
    expect(prompt).toContain('命运齿轮开始转动')
    expect(prompt).toContain('下一章不得复现命运齿轮')
  })

  test('carries prose review longform checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '黑塔许可' },
      [
        { id: 7, chapter_no: 7, title: '门卡代价' },
        { id: 8, chapter_no: 8, title: '黑塔许可' },
      ],
      [
        {
          id: 211,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:30.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                longform_checks: [
                  {
                    key: 'recent_progress',
                    label: '长篇专项',
                    status: 'warn',
                    recent_5_chapter_progress: '最近5章主线没有明确进展。',
                    payoff_interval: '爽点间隔过长。',
                    stage_goal_shift: '阶段目标仍停在查门卡。',
                    next_stage_pull: '下一阶段牵引不足。',
                    context_layer: '黑塔许可线没有进入当前场景。',
                    evidence: '连续几章都在解释门卡规则，没有推进黑塔许可。',
                    fix: '下一章必须把黑塔许可写成新航点，用阶段目标推进、爽点回报和下一阶段牵引承接。',
                    remaining_risk: '不能继续写门卡规则原地解释。',
                  },
                  {
                    key: 'context_layer_ok',
                    label: '上下文层',
                    status: 'pass',
                    evidence: '角色状态已同步。',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '黑塔许可',
        summary: '主角拿门卡权限追到黑塔许可。',
        conflict: '黑塔许可要求更高阶段代价。',
        ending_hook: '许可编号背后露出下一阶段入口。',
        scene_cards: [
          { scene_no: 1, title: '许可显影', reader_payoff: '把黑塔许可写成新航点。' },
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
      { chapter_no: 8, title: '黑塔许可' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补长篇专项')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('长篇专项：长线缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('最近5章主线没有明确进展')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('阶段目标推进、爽点回报和下一阶段牵引')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('角色状态已同步')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('长篇专项开篇修复')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('recent_5_chapter_progress')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('payoff_interval')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('next_stage_pull')
    expect(prompt).toContain('长篇专项：长线缺口 1')
    expect(prompt).toContain('连续几章都在解释门卡规则')
    expect(prompt).toContain('不能继续写门卡规则原地解释')
  })

  test('carries prose craft execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '签收印复核' },
      [
        { id: 7, chapter_no: 7, title: '旧名单显影' },
        { id: 8, chapter_no: 8, title: '签收印复核' },
      ],
      [
        {
          id: 212,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:40.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                prose_craft_checks: [
                  {
                    key: 'pov_body_anchor_missing',
                    label: '深度限知失焦',
                    status: 'fail',
                    pov_depth: '删掉“所有人都没发现”的上帝视角，只写沈砚能看见的签收印、呼吸和手背反应。',
                    body_detail: '把愤怒改成指节压白、喉结停住、袖口擦过印泥。',
                    environment_interaction: '让签收印蹭到门槛灰，灰线暴露编号被改过。',
                    action_stillness_balance: '一动一静交替：按印、停顿、抬眼、逼问。',
                    crowd_reaction_layering: '旁观者不能统一震惊，账房先沉默，执事抢话，旧仆后退。',
                    evidence: '本章连续用“所有人都震惊、他心里很愤怒”概括，缺身体细节和环境交互。',
                    fix: '下一章必须用深度限知、身体细节、环境交互和分层反应重写签收印复核场。',
                    remaining_risk: '不能再用上帝视角和抽象情绪替代现场动作。',
                  },
                  {
                    key: 'sensory_anchor_ok',
                    label: '感知锚点',
                    status: 'pass',
                    pov_depth: '已兑现。',
                    body_detail: '已兑现。',
                    environment_interaction: '已兑现。',
                    action_stillness_balance: '已兑现。',
                    crowd_reaction_layering: '已兑现。',
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
    const project = { title: '旧城账册', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '签收印复核',
        summary: '沈砚复核旧名单签收印，用可见动作压住对手。',
        conflict: '执事试图把签收印解释成普通印泥污渍。',
        ending_hook: '门槛灰线里露出被改过的编号。',
        scene_cards: [
          { scene_no: 1, title: '签收印复核', reader_payoff: '正文工艺字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:09:40.000Z',
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
      { chapter_no: 8, title: '签收印复核' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修正文工艺')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('正文工艺：行文缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('prose_craft_checks.深度限知失焦')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('pov_depth=删掉“所有人都没发现”的上帝视角')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('body_detail=把愤怒改成指节压白')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('environment_interaction=让签收印蹭到门槛灰')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('action_stillness_balance=一动一静交替')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('crowd_reaction_layering=旁观者不能统一震惊')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('感知锚点')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('pov_depth')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('environment_interaction')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('crowd_reaction_layering')
    expect(prompt).toContain('prose_craft_checks.深度限知失焦')
    expect(prompt).toContain('不能再用上帝视角和抽象情绪替代现场动作')
  })

  test('carries punctuation tone execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '签收印追问' },
      [
        { id: 7, chapter_no: 7, title: '旧名单显影' },
        { id: 8, chapter_no: 8, title: '签收印追问' },
      ],
      [
        {
          id: 214,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:42.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                punctuation_tone_checks: [
                  {
                    key: 'question_tone_flattened',
                    label: '质问语气被压平',
                    status: 'warn',
                    speaker: '沈砚',
                    punctuation_issue: '关键追问全写成句号，迟疑依赖省略号和破折号硬停顿。',
                    tone_intent: '签收印真假必须是逼问，不是平铺陈述。',
                    replacement: '用短句、换行和动作打断替代省略号/破折号，追问处保留问号。',
                    voice_difference: '沈砚冷静短问，执事抢话用短促否认，旧仆迟疑用动作停顿。',
                    evidence: '“这枚印是真的。”连续三句句号，缺质问压力和人物声线差异。',
                    fix: '下一章必须把签收印追问改成有问号、动作停顿和声线差异的对话交锋。',
                    remaining_risk: '不能再用统一句号和硬停顿抹平对白语气。',
                  },
                  {
                    key: 'colon_reveal_ok',
                    label: '信息落点',
                    status: 'pass',
                    speaker: '已兑现。',
                    punctuation_issue: '已兑现。',
                    tone_intent: '已兑现。',
                    replacement: '已兑现。',
                    voice_difference: '已兑现。',
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
    const project = { title: '旧城账册', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '签收印追问',
        summary: '沈砚用签收印追问执事，逼出旧名单编号。',
        conflict: '执事试图把质问降成普通陈述，拖掉现场压力。',
        ending_hook: '旧仆在沈砚的短问后说出另一个仓库编号。',
        scene_cards: [
          { scene_no: 1, title: '签收印追问', reader_payoff: '语气标点字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:09:42.000Z',
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
      { chapter_no: 8, title: '签收印追问' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修语气标点')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('语气标点：标点缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('punctuation_tone_checks.质问语气被压平')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('speaker=沈砚')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('punctuation_issue=关键追问全写成句号')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('tone_intent=签收印真假必须是逼问')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('replacement=用短句、换行和动作打断替代省略号/破折号')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('voice_difference=沈砚冷静短问')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('信息落点')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('speaker')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('replacement')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('voice_difference')
    expect(prompt).toContain('punctuation_tone_checks.质问语气被压平')
    expect(prompt).toContain('不能再用统一句号和硬停顿抹平对白语气')
  })

  test('carries quality audit execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '签收印反压' },
      [
        { id: 7, chapter_no: 7, title: '旧名单显影' },
        { id: 8, chapter_no: 8, title: '签收印反压' },
      ],
      [
        {
          id: 215,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:44.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                quality_audit_checks: [
                  {
                    key: 'purpose_density_flat',
                    label: '目的词详略平均',
                    status: 'fail',
                    strategy: 'rewrite',
                    purpose_tag: '打脸/关键揭露',
                    density_change: '把签收印揭露从一句摘要扩成危机铺垫、出手过程、对话交锋、分层反应和结果余波。',
                    conflict_bound_info: '签收印编号必须随执事抢证、旧仆迟疑和主角反压逐步释放。',
                    changed_evidence: '下一章需要出现“编号被灰线截断，执事伸手抢印，沈砚按住账页”的现场变化。',
                    evidence: '本章把关键揭露写成一句解释，删掉不影响理解，事件内容比重不足。',
                    fix: '下一章必须按打脸/关键揭露目的词重排详略，让信息跟冲突走，并制造不可删除的局势变化。',
                    remaining_risk: '不能再用摘要式解释替代事件推进。',
                  },
                  {
                    key: 'opening_hook_ok',
                    label: '开篇钩子',
                    status: 'pass',
                    strategy: 'polish',
                    purpose_tag: '已兑现。',
                    density_change: '已兑现。',
                    conflict_bound_info: '已兑现。',
                    changed_evidence: '已兑现。',
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
    const project = { title: '旧城账册', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '签收印反压',
        summary: '沈砚用签收印编号反压执事，制造不可删除的局势变化。',
        conflict: '执事抢证，旧仆迟疑，签收印编号必须随冲突释放。',
        ending_hook: '编号背后的旧仓库门禁亮起。',
        scene_cards: [
          { scene_no: 1, title: '签收印反压', reader_payoff: '质量诊断字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:09:44.000Z',
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
      { chapter_no: 8, title: '签收印反压' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修质量诊断')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('质量诊断：诊断缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('quality_audit_checks.目的词详略平均')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('strategy=rewrite')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('purpose_tag=打脸/关键揭露')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('density_change=把签收印揭露从一句摘要扩成危机铺垫')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('conflict_bound_info=签收印编号必须随执事抢证')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('changed_evidence=下一章需要出现“编号被灰线截断')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('开篇钩子')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('purpose_tag')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('density_change')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('changed_evidence')
    expect(prompt).toContain('quality_audit_checks.目的词详略平均')
    expect(prompt).toContain('不能再用摘要式解释替代事件推进')
  })

  test('carries prose review foreshadowing delta checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '黑塔许可' },
      [
        { id: 7, chapter_no: 7, title: '门卡代价' },
        { id: 8, chapter_no: 8, title: '黑塔许可' },
      ],
      [
        {
          id: 213,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:45.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                foreshadowing_delta_checks: [
                  {
                    key: 'missing_tracking_entry',
                    label: '新增伏笔未登记',
                    status: 'fail',
                    clue_name: '第二枚旧印缺编号',
                    delta_type: '新增',
                    current_status: '已入场但未登记台账',
                    chapter: '第7章',
                    source_excerpt: '旧印背面露出一块被刮掉的编号。',
                    ledger_path: '伏笔台账/黑塔许可.md',
                    fix: '下一章必须让第二枚旧印缺编号作为可见线索入场，并把缺编号转成黑塔许可问题。',
                    remaining_risk: '不能继续只写门卡规则，必须同步伏笔台账路径和当前状态。',
                  },
                  {
                    key: 'foreshadowing_delta_ok',
                    label: '伏笔增量已登记',
                    status: 'pass',
                    clue_name: '门卡裂纹',
                    source_excerpt: '门卡裂纹已写回台账。',
                    ledger_path: '伏笔台账/门卡.md',
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
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '黑塔许可',
        summary: '主角拿门卡权限追到黑塔许可。',
        conflict: '黑塔许可要求更高阶段代价。',
        ending_hook: '许可编号背后露出下一阶段入口。',
        scene_cards: [
          { scene_no: 1, title: '许可显影', reader_payoff: '把黑塔许可写成新航点。' },
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
      { chapter_no: 8, title: '黑塔许可' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补伏笔增量')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('伏笔增量：台账缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('foreshadowing_delta_checks')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('第二枚旧印缺编号')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('伏笔台账/黑塔许可.md')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('门卡裂纹已写回台账')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('可见线索')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('黑塔许可问题')
    expect(prompt).toContain('伏笔增量：台账缺口 1')
    expect(prompt).toContain('旧印背面露出一块被刮掉的编号')
    expect(prompt).toContain('必须同步伏笔台账路径和当前状态')
  })

  test('carries prose review story state update checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '黑塔许可' },
      [
        { id: 7, chapter_no: 7, title: '门卡代价' },
        { id: 8, chapter_no: 8, title: '黑塔许可' },
      ],
      [
        {
          id: 214,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:50.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                story_state_update_checks: [
                  {
                    key: 'character_updates_missing',
                    label: '角色状态未写回',
                    status: 'fail',
                    state_domain: 'character',
                    target_file: '追踪/角色状态.md',
                    update_path: 'character_updates.周远',
                    before_state: '昏迷未醒',
                    after_state: '短暂苏醒但行动受限',
                    source_excerpt: '周远醒来只撑住半句话，手臂仍不能抬。',
                    evidence: '正文让周远醒来，但状态机仍停在昏迷未醒。',
                    fix: '下一章必须让周远行动受限影响黑塔许可调查选择，并把短暂苏醒写成可追踪状态变化。',
                    remaining_risk: '不能让周远像完全恢复一样参与行动。',
                  },
                  {
                    key: 'asset_updates_ok',
                    label: '资产状态已写回',
                    status: 'pass',
                    state_domain: 'asset',
                    target_file: '追踪/资产状态.md',
                    update_path: 'asset_updates.门卡',
                    before_state: '门卡未激活',
                    after_state: '门卡半格权限',
                    source_excerpt: '门卡只亮了半格。',
                    evidence: '门卡状态已同步。',
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
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '黑塔许可',
        summary: '主角拿门卡权限追到黑塔许可。',
        conflict: '黑塔许可要求更高阶段代价。',
        ending_hook: '许可编号背后露出下一阶段入口。',
        scene_cards: [
          { scene_no: 1, title: '许可显影', reader_payoff: '把黑塔许可写成新航点。' },
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
      { chapter_no: 8, title: '黑塔许可' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修状态写回')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('状态写回：状态缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('story_state_update_checks')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('character_updates.周远')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('短暂苏醒但行动受限')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('门卡状态已同步')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('状态变化')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('行动后果')
    expect(prompt).toContain('状态写回：状态缺口 1')
    expect(prompt).toContain('周远醒来只撑住半句话')
    expect(prompt).toContain('不能让周远像完全恢复一样参与行动')
  })

  test('carries high severity prose review findings into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 204,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:05:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                score: 72,
                passed: false,
                issues: [
                  {
                    severity: 'S2',
                    category: 'logic',
                    location: '章末',
                    evidence: '门外学生突然消失，没人追问他的来历。',
                    issue: '章末悬念没有转成下一章调查目标。',
                    fix: '下一章开篇必须让主角追查湿漉漉学生身份，并给出第一条证据。',
                  },
                  {
                    severity: 'S4',
                    category: 'style',
                    evidence: '局部句子重复。',
                    issue: '句式略重复。',
                    fix: '润色即可。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 1,
        title: '门外学生',
        summary: '判断门外学生是否是规则诱饵。',
        conflict: '救人还是守规。',
        ending_hook: '玻璃门上的水迹拼出一个名字。',
        scene_cards: [
          { scene_no: 1, title: '门前对峙', reader_payoff: '识破门外学生的第一层规则诱饵。' },
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
      { chapter_no: 3, title: '门外学生' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('复盘审稿：S2问题 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('下一章开篇必须让主角追查湿漉漉学生身份')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('润色即可')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('湿漉漉学生身份')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('第一条证据')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('门外学生突然消失')
    expect(prompt).toContain('复盘审稿：S2问题 1')
    expect(prompt).toContain('门外学生突然消失')
    expect(prompt).toContain('下一章开篇必须让主角追查湿漉漉学生身份')
  })

})

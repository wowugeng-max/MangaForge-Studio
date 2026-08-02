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

describe('chapter pre-draft brief sync-craft/prose-review a', () => {
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

})

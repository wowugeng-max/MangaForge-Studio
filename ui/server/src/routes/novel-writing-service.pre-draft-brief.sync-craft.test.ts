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

describe('chapter pre-draft brief sync-craft', () => {
  test('carries reader retention execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '第二声广播' },
      [
        { id: 2, chapter_no: 2, title: '门外学生' },
        { id: 3, chapter_no: 3, title: '第二声广播' },
      ],
      [
        {
          id: 217,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:16:30.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                reader_retention_checks: [
                  {
                    key: 'reward_randomness_gap',
                    label: '随机奖励不足',
                    status: 'fail',
                    retention_engine: 'Hook上瘾模型 + 留存双引擎',
                    emotional_payoff: '主角救下门外学生后获得半句感谢和同名恐惧，而不是只确认身份。',
                    information_hunger: '广播来源只给“第二个同名者”线索，保留谁在播报的问号。',
                    page_turn_question: '第二个和主角同名的人为什么会提前出现在广播里？',
                    evidence: '本章只确认学生身份，没有额外线索、沉没投入和章尾信息差。',
                    fix: '下一章必须补随机奖励、沉没投入和章尾翻页问题，让广播来源卡到最后300字。',
                    remaining_risk: '不能再让身份确认后追读饥饿归零。',
                  },
                  {
                    key: 'payoff_ok',
                    label: '即时回报',
                    status: 'pass',
                    retention_engine: '已兑现。',
                    emotional_payoff: '已兑现。',
                    information_hunger: '已兑现。',
                    page_turn_question: '已兑现。',
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
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '第二声广播',
        summary: '主角追问门外学生，并听见第二个同名者的广播。',
        conflict: '门外学生给出半句线索，广播却提前念出另一个同名者。',
        ending_hook: '广播里出现第二个和主角同名的人。',
        scene_cards: [
          { scene_no: 1, title: '第二声广播', reader_payoff: '追读留存字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:16:30.000Z',
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
      { chapter_no: 3, title: '第二声广播' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('创作契约：追读留存缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reader_retention_checks.随机奖励不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('retention_engine=Hook上瘾模型 + 留存双引擎')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('emotional_payoff=主角救下门外学生后获得半句感谢')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('information_hunger=广播来源只给“第二个同名者”线索')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('page_turn_question=第二个和主角同名的人为什么会提前出现在广播里')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('即时回报')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('retention_engine')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('emotional_payoff')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('page_turn_question')
    expect(prompt).toContain('reader_retention_checks.随机奖励不足')
    expect(prompt).toContain('不能再让身份确认后追读饥饿归零')
  })

  test('carries target reader execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '规则反制' },
      [
        { id: 2, chapter_no: 2, title: '门外学生' },
        { id: 3, chapter_no: 3, title: '规则反制' },
      ],
      [
        {
          id: 218,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:17:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                target_reader_checks: [
                  {
                    key: 'reader_desire_missing',
                    label: '目标读者爽点缺席',
                    status: 'fail',
                    target_reader_profile: '规则怪谈爽文读者，想看主角用超人能力反制规则漏洞。',
                    reader_desire: '看主角识破广播规则，利用力量和规则边界反将一军。',
                    emotion_gap: '前章只压迫主角，没有给读者“我也看懂规则”的参与感。',
                    chapter_hit: '本章必须让主角用门槛白线反制广播判定。',
                    platform_taste: '快节奏、强钩子、规则反制爽点，少解释设定。',
                    evidence: '本章一直解释门外学生来历，没有命中规则反制爽点。',
                    fix: '下一章必须先给目标读者能立刻看懂的规则漏洞，再让主角用超人能力反制。',
                    remaining_risk: '不能再把目标读者想看的反制爽点写成背景说明。',
                  },
                  {
                    key: 'platform_taste_ok',
                    label: '平台口味',
                    status: 'pass',
                    target_reader_profile: '已兑现。',
                    reader_desire: '已兑现。',
                    emotion_gap: '已兑现。',
                    chapter_hit: '已兑现。',
                    platform_taste: '已兑现。',
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
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '规则反制',
        summary: '主角识破广播规则漏洞，用门槛白线反制判定。',
        conflict: '广播试图把门外学生的身份判定转嫁给主角。',
        ending_hook: '白线另一侧出现第二个同名者的脚印。',
        scene_cards: [
          { scene_no: 1, title: '白线反制', reader_payoff: '目标读者字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:17:00.000Z',
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
      { chapter_no: 3, title: '规则反制' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('创作契约：目标读者缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('target_reader_checks.目标读者爽点缺席')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('target_reader_profile=规则怪谈爽文读者')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reader_desire=看主角识破广播规则')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('emotion_gap=前章只压迫主角')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('chapter_hit=本章必须让主角用门槛白线反制广播判定')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('platform_taste=快节奏、强钩子、规则反制爽点')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('平台口味')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('target_reader_profile')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('reader_desire')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('chapter_hit')
    expect(prompt).toContain('target_reader_checks.目标读者爽点缺席')
    expect(prompt).toContain('不能再把目标读者想看的反制爽点写成背景说明')
  })

  test('carries genre positioning execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '白线反制' },
      [
        { id: 2, chapter_no: 2, title: '门外学生' },
        { id: 3, chapter_no: 3, title: '白线反制' },
      ],
      [
        {
          id: 219,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:17:30.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                genre_positioning_checks: [
                  {
                    key: 'genre_promise_drift',
                    label: '题材承诺漂移',
                    status: 'fail',
                    genre_tag: '规则怪谈 + 超人爽文',
                    core_hook: '超人能力不是横推，而是用来反制规则漏洞。',
                    type_formula: '规则压迫 -> 发现漏洞 -> 超人能力执行反制 -> 新规则门槛。',
                    genre_strength: '强规则、强反制、强章尾门槛，少日常解释。',
                    book_title_blurb_alignment: '标题和简介都承诺超人规则反制，正文不能转成校园日常推理。',
                    evidence: '本章大量解释门外学生来历，题材长板没有进入正文事件。',
                    fix: '下一章必须把白线规则和超人能力写成反制桥段，章尾继续抬新规则门槛。',
                    remaining_risk: '不能再把题材承诺漂成普通校园悬疑。',
                  },
                  {
                    key: 'genre_strength_ok',
                    label: '题材长板',
                    status: 'pass',
                    genre_tag: '已兑现。',
                    core_hook: '已兑现。',
                    type_formula: '已兑现。',
                    genre_strength: '已兑现。',
                    book_title_blurb_alignment: '已兑现。',
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
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '白线反制',
        summary: '主角用超人能力测试门槛白线，反制广播判定。',
        conflict: '广播规则试图逼主角横推失败，主角必须发现漏洞。',
        ending_hook: '白线背后出现新规则门槛。',
        scene_cards: [
          { scene_no: 1, title: '白线反制', reader_payoff: '题材定位字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:17:30.000Z',
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
      { chapter_no: 3, title: '白线反制' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('创作契约：题材定位缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('genre_positioning_checks.题材承诺漂移')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('genre_tag=规则怪谈 + 超人爽文')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('core_hook=超人能力不是横推')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('type_formula=规则压迫 -> 发现漏洞')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('genre_strength=强规则、强反制、强章尾门槛')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('book_title_blurb_alignment=标题和简介都承诺超人规则反制')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('题材长板')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('genre_tag')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('type_formula')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('genre_strength')
    expect(prompt).toContain('genre_positioning_checks.题材承诺漂移')
    expect(prompt).toContain('不能再把题材承诺漂成普通校园悬疑')
  })

  test('carries unresolved female audience checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '她自己开门' },
      [
        { id: 2, chapter_no: 2, title: '雨夜旧宅' },
        { id: 3, chapter_no: 3, title: '她自己开门' },
      ],
      [
        {
          id: 210,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:18:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                female_audience_checks: [
                  {
                    key: 'female_agency_missing',
                    label: '女主主动性',
                    status: 'fail',
                    evidence: '雨夜旧宅里所有关键决定都由男主替女主做，女主只被安排着赢。',
                    fix: '下一章必须让女主自己做决定、自己推进开门行动，并由她承担选择代价。',
                  },
                  {
                    key: 'abuse_dosage_no_sugar',
                    label: '虐戏剂量',
                    status: 'warn',
                    evidence: '连续两场压迫后没有给安全感、反转或糖，情绪只向下压。',
                    fix: '下一章必须在压迫后补一个安全感锚点，并给出反转或糖，避免连续整卷只虐。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '她在雨夜改写命运', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '她自己开门',
        summary: '女主主动推开旧宅内门，拿回决定权。',
        conflict: '男主想替她挡下风险，女主必须自己选择是否进入。',
        ending_hook: '门后传出母亲留下的第二句录音。',
        scene_cards: [
          { scene_no: 1, title: '自己开门', reader_payoff: '女主主动做决定并获得安全感锚点。' },
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
      { chapter_no: 3, title: '她自己开门' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修女频长篇')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('女频长篇：女频缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('女主自己做决定')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('安全感锚点')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('反转或糖')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('女频长篇：女频缺口 2')
    expect(prompt).toContain('避免连续整卷只虐')
  })

  test('carries female audience execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '她自己开门' },
      [
        { id: 2, chapter_no: 2, title: '雨夜旧宅' },
        { id: 3, chapter_no: 3, title: '她自己开门' },
      ],
      [
        {
          id: 220,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:18:30.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                female_audience_checks: [
                  {
                    key: 'agency_and_security_missing',
                    label: '主动性和安全感缺口',
                    status: 'fail',
                    security_anchor: '女主推门前必须获得自己确认的安全锚点：母亲录音里的旧称呼。',
                    reader_identification: '让读者代入她终于不再被安排，而是自己选择进门。',
                    heroine_agency: '关键动作由女主完成：她拒绝男主代替，自己按下门锁。',
                    relationship_axis: '男主从替她挡风险，转为尊重她的决定并守在门外。',
                    post_abuse_payoff: '压迫后给一个反转或糖：门后录音证明母亲一直给她留路。',
                    evidence: '前章所有关键决定都由男主替她做，压迫后没有安全感锚点。',
                    fix: '下一章必须让女主自己做决定、自己推门，并用安全感锚点和反转回报承接压迫。',
                    remaining_risk: '不能再让女主只被保护、被安排着赢。',
                  },
                  {
                    key: 'relationship_axis_ok',
                    label: '关系轴',
                    status: 'pass',
                    security_anchor: '已兑现。',
                    reader_identification: '已兑现。',
                    heroine_agency: '已兑现。',
                    relationship_axis: '已兑现。',
                    post_abuse_payoff: '已兑现。',
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
    const project = { title: '她在雨夜改写命运', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '她自己开门',
        summary: '女主主动推开旧宅内门，拿回决定权。',
        conflict: '男主想替她挡下风险，女主必须自己选择是否进入。',
        ending_hook: '门后传出母亲留下的第二句录音。',
        scene_cards: [
          { scene_no: 1, title: '自己开门', reader_payoff: '女频长篇字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:18:30.000Z',
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
      { chapter_no: 3, title: '她自己开门' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修女频长篇')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('女频长篇：女频缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('female_audience_checks.主动性和安全感缺口')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('security_anchor=女主推门前必须获得自己确认的安全锚点')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reader_identification=让读者代入她终于不再被安排')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('heroine_agency=关键动作由女主完成')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('relationship_axis=男主从替她挡风险')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('post_abuse_payoff=压迫后给一个反转或糖')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('关系轴')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('security_anchor')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('heroine_agency')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('post_abuse_payoff')
    expect(prompt).toContain('female_audience_checks.主动性和安全感缺口')
    expect(prompt).toContain('不能再让女主只被保护、被安排着赢')
  })

  test('carries upgrade rhythm execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '半格权限' },
      [
        { id: 3, chapter_no: 3, title: '门卡代价' },
        { id: 4, chapter_no: 4, title: '半格权限' },
      ],
      [
        {
          id: 221,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:19:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                upgrade_rhythm_checks: [
                  {
                    key: 'upgrade_feedback_missing',
                    label: '升级反馈不足',
                    status: 'fail',
                    before_after_contrast: '升级前门卡只能开外门，升级后能短暂点亮内库半格权限。',
                    instant_feedback: '主角按下门卡时，门缝白线退后半寸。',
                    delayed_feedback: '半格权限只能维持三息，三息后反噬主角旧伤。',
                    new_threshold: '下一门槛是必须找到黑塔许可编号。',
                    cheat_rule: '门卡升级必须以半印血线为代价，不能无成本横推。',
                    evidence: '本章写主角拿到权限，但没有前后对比、即时反馈和新门槛。',
                    fix: '下一章必须补升级前后对比、即时反馈、延迟代价和下一门槛。',
                    remaining_risk: '不能再让升级只停在系统提示。',
                  },
                  {
                    key: 'threshold_ok',
                    label: '新门槛',
                    status: 'pass',
                    before_after_contrast: '已兑现。',
                    instant_feedback: '已兑现。',
                    delayed_feedback: '已兑现。',
                    new_threshold: '已兑现。',
                    cheat_rule: '已兑现。',
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
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '半格权限',
        summary: '主角用半印血线换来半格门卡权限。',
        conflict: '权限只能维持三息，广播规则逼他继续付代价。',
        ending_hook: '门卡上浮出黑塔许可编号。',
        scene_cards: [
          { scene_no: 1, title: '半格权限', reader_payoff: '升级节奏字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:19:00.000Z',
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
      { chapter_no: 4, title: '半格权限' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修升级节奏')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('升级节奏：升级缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('upgrade_rhythm_checks.升级反馈不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('before_after_contrast=升级前门卡只能开外门')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('instant_feedback=主角按下门卡时')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('delayed_feedback=半格权限只能维持三息')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('new_threshold=下一门槛是必须找到黑塔许可编号')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('cheat_rule=门卡升级必须以半印血线为代价')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('新门槛')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('before_after_contrast')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('instant_feedback')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('new_threshold')
    expect(prompt).toContain('upgrade_rhythm_checks.升级反馈不足')
    expect(prompt).toContain('不能再让升级只停在系统提示')
  })

  test('carries conflict structure execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '封门票据' },
      [
        { id: 3, chapter_no: 3, title: '旧仓口供' },
        { id: 4, chapter_no: 4, title: '封门票据' },
      ],
      [
        {
          id: 222,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                conflict_structure_checks: [
                  {
                    key: 'blocker_and_result_missing',
                    label: '冲突缺口 1',
                    status: 'fail',
                    blocker: '仓库管事锁住唯一出口，并拿账册逼主角认下假债。',
                    no_exit_condition: '主角若离开旧仓，妹妹的赎身票据会被当场烧掉。',
                    stakes_or_exit_cost: '退出代价是妹妹身份被卖、主角失去翻案证据。',
                    action_block: '管事派人抢走半张票据，逼主角当场夺回并公开账册页码。',
                    win_loss_result: '主角夺回票据但暴露自己藏着账册副页，换来下一轮追捕。',
                    evidence: '上一章只有口头争执，没有真正阻止主角得到目标，也没有明确胜负。',
                    fix: '下一章必须让阻止者实际封门，设置有进无出的退出代价，并用行动阻拦打出胜负变化。',
                    remaining_risk: '不能再让冲突停在嘴炮和可随时离场。',
                  },
                  {
                    key: 'stakes_ok',
                    label: '结构闭环已完成',
                    status: 'pass',
                    blocker: '已兑现。',
                    no_exit_condition: '已兑现。',
                    stakes_or_exit_cost: '已兑现。',
                    action_block: '已兑现。',
                    win_loss_result: '已兑现。',
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
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '封门票据',
        summary: '主角被锁进旧仓，只能夺回票据并公开账册页码。',
        conflict: '管事封门抢票据，主角必须在无法退出的局面里夺回证据。',
        ending_hook: '账册副页暴露后，巡捕开始追他。',
        scene_cards: [
          { scene_no: 1, title: '封门抢票', reader_payoff: '冲突结构字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:20:00.000Z',
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
      { chapter_no: 4, title: '封门票据' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修冲突结构')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('冲突结构：冲突缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('conflict_structure_checks.冲突缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('blocker=仓库管事锁住唯一出口')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('no_exit_condition=主角若离开旧仓')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('stakes_or_exit_cost=退出代价是妹妹身份被卖')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('action_block=管事派人抢走半张票据')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('win_loss_result=主角夺回票据但暴露自己藏着账册副页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('结构闭环已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('blocker')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('action_block')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('win_loss_result')
    expect(prompt).toContain('conflict_structure_checks.冲突缺口 1')
    expect(prompt).toContain('不能再让冲突停在嘴炮和可随时离场')
  })

  test('carries story loop execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 5, chapter_no: 5, title: '缺页换门' },
      [
        { id: 4, chapter_no: 4, title: '封门票据' },
        { id: 5, chapter_no: 5, title: '缺页换门' },
      ],
      [
        {
          id: 223,
          chapter_id: 4,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:21:00.000Z',
          payload: JSON.stringify({
            chapter_id: 4,
            chapter_no: 4,
            self_check: {
              review: {
                story_loop_checks: [
                  {
                    key: 'loop_payoff_missing',
                    label: '循环闭环不足',
                    status: 'warn',
                    setup_question: '账册缺页到底能换到哪扇门的通行权。',
                    obstacle: '巡捕和管事都想抢先拿到缺页，阻断主角验证。',
                    choice: '主角必须选择先救妹妹，还是先用缺页换门。',
                    cost: '选择换门会让妹妹短暂落入管事手里。',
                    payoff_or_answer_fragment: '缺页只能换到后巷侧门，不是库房正门。',
                    new_question: '侧门后为什么贴着妹妹的旧名牌。',
                    evidence: '上一章提出缺页和门，却没有形成提问、阻碍、选择、代价、部分答案和新问题的循环。',
                    fix: '下一章必须按提问->阻碍->选择->代价->部分答案->新问题闭合一轮循环。',
                    remaining_risk: '不能再只抛新设定而不回收本章循环。',
                  },
                  {
                    key: 'loop_setup_ok',
                    label: '循环设问已完成',
                    status: 'pass',
                    setup_question: '已兑现。',
                    obstacle: '已兑现。',
                    choice: '已兑现。',
                    cost: '已兑现。',
                    payoff_or_answer_fragment: '已兑现。',
                    new_question: '已兑现。',
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
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 5,
        title: '缺页换门',
        summary: '主角用账册缺页换到后巷侧门通行权。',
        conflict: '巡捕和管事同时追索缺页，主角必须在救妹妹和换门之间做选择。',
        ending_hook: '侧门后贴着妹妹的旧名牌。',
        scene_cards: [
          { scene_no: 1, title: '缺页换门', reader_payoff: '故事循环字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:21:00.000Z',
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
      { chapter_no: 5, title: '缺页换门' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修故事循环')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('故事循环：循环缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('story_loop_checks.循环闭环不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('setup_question=账册缺页到底能换到哪扇门的通行权')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('obstacle=巡捕和管事都想抢先拿到缺页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('choice=主角必须选择先救妹妹')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('cost=选择换门会让妹妹短暂落入管事手里')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('payoff_or_answer_fragment=缺页只能换到后巷侧门')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('new_question=侧门后为什么贴着妹妹的旧名牌')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('循环设问已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('setup_question')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('choice')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('new_question')
    expect(prompt).toContain('story_loop_checks.循环闭环不足')
    expect(prompt).toContain('不能再只抛新设定而不回收本章循环')
  })

  test('carries emotional arc execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 6, chapter_no: 6, title: '旧名牌回声' },
      [
        { id: 5, chapter_no: 5, title: '缺页换门' },
        { id: 6, chapter_no: 6, title: '旧名牌回声' },
      ],
      [
        {
          id: 224,
          chapter_id: 5,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:22:00.000Z',
          payload: JSON.stringify({
            chapter_id: 5,
            chapter_no: 5,
            self_check: {
              review: {
                emotional_arc_checks: [
                  {
                    key: 'release_without_payoff',
                    label: '释放回报不足',
                    status: 'fail',
                    calm_or_pressure: '开篇用旧名牌和锁门声制造低压安静感。',
                    mobilization: '妹妹旧名被喊出后，主角必须被调动到主动护人。',
                    counteraction: '主角用账册副页反制管事，把羞辱转成公开质询。',
                    release: '管事被迫承认旧名牌对应的赎身记录。',
                    reader_payoff: '读者获得妹妹身份被看见、主角终于护住她的安全感回报。',
                    evidence: '上一章只揭露旧名牌，没有从低压调动到反制释放，也缺读者回报。',
                    fix: '下一章必须按低压->调动->反制->释放->读者回报写完整情绪弧。',
                    remaining_risk: '不能再只揭信息而不给情绪释放和安全感。',
                  },
                  {
                    key: 'mobilization_ok',
                    label: '情绪调动已完成',
                    status: 'pass',
                    calm_or_pressure: '已兑现。',
                    mobilization: '已兑现。',
                    counteraction: '已兑现。',
                    release: '已兑现。',
                    reader_payoff: '已兑现。',
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
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 6,
        title: '旧名牌回声',
        summary: '主角用账册副页逼管事承认妹妹旧名牌的赎身记录。',
        conflict: '管事想用旧名羞辱妹妹，主角必须把羞辱反打成公开证据。',
        ending_hook: '赎身记录背面出现第二个旧名。',
        scene_cards: [
          { scene_no: 1, title: '旧名牌回声', reader_payoff: '情绪弧字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:22:00.000Z',
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
      { chapter_no: 6, title: '旧名牌回声' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修情绪弧')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('情绪弧：情绪缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('emotional_arc_checks.释放回报不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('calm_or_pressure=开篇用旧名牌和锁门声制造低压安静感')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('mobilization=妹妹旧名被喊出后')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('counteraction=主角用账册副页反制管事')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('release=管事被迫承认旧名牌对应的赎身记录')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reader_payoff=读者获得妹妹身份被看见')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('情绪调动已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('calm_or_pressure')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('counteraction')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('reader_payoff')
    expect(prompt).toContain('emotional_arc_checks.释放回报不足')
    expect(prompt).toContain('不能再只揭信息而不给情绪释放和安全感')
  })

  test('carries dialogue execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 7, chapter_no: 7, title: '副页对质' },
      [
        { id: 6, chapter_no: 6, title: '旧名牌回声' },
        { id: 7, chapter_no: 7, title: '副页对质' },
      ],
      [
        {
          id: 225,
          chapter_id: 6,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:23:00.000Z',
          payload: JSON.stringify({
            chapter_id: 6,
            chapter_no: 6,
            self_check: {
              review: {
                dialogue_checks: [
                  {
                    key: 'flat_dialogue_no_shift',
                    label: '对白缺少潜台词和权力变化',
                    status: 'warn',
                    speaker: '主角和管事',
                    agenda: '主角要逼管事承认副页来源，管事要把副页说成伪造。',
                    subtext: '主角表面问票据编号，实际试探管事是否知道妹妹旧名。',
                    power_shift: '对话前管事压主角，对话后主角用编号让管事失声。',
                    information_delta: '读者获得副页编号对应赎身记录的新增信息。',
                    character_voice: '主角短句冷问，管事拖长句绕开关键编号。',
                    evidence: '上一章对白只是互相说明立场，没有潜台词、权力转移和信息增量。',
                    fix: '下一章必须让对白承载诉求、潜台词、权力变化和信息增量，并拉开主角与管事声线。',
                    remaining_risk: '不能再写成两个人轮流解释剧情。',
                  },
                  {
                    key: 'voice_ok',
                    label: '声线区分已完成',
                    status: 'pass',
                    speaker: '已兑现。',
                    agenda: '已兑现。',
                    subtext: '已兑现。',
                    power_shift: '已兑现。',
                    information_delta: '已兑现。',
                    character_voice: '已兑现。',
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
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 7,
        title: '副页对质',
        summary: '主角在众人面前用账册副页逼管事承认赎身记录。',
        conflict: '管事把副页说成伪造，主角必须用编号和旧名逼他露怯。',
        ending_hook: '管事失声后，副页背面浮出第二个编号。',
        scene_cards: [
          { scene_no: 1, title: '副页对质', reader_payoff: '对白字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:23:00.000Z',
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
      { chapter_no: 7, title: '副页对质' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修对白')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修对白：对白缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('dialogue_checks.对白缺少潜台词和权力变化')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('speaker=主角和管事')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('agenda=主角要逼管事承认副页来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('subtext=主角表面问票据编号')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('power_shift=对话前管事压主角')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('information_delta=读者获得副页编号对应赎身记录')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('character_voice=主角短句冷问')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('声线区分已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('speaker')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('power_shift')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('information_delta')
    expect(prompt).toContain('dialogue_checks.对白缺少潜台词和权力变化')
    expect(prompt).toContain('不能再写成两个人轮流解释剧情')
  })

  test('carries plot dynamics execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '第二编号' },
      [
        { id: 7, chapter_no: 7, title: '副页对质' },
        { id: 8, chapter_no: 8, title: '第二编号' },
      ],
      [
        {
          id: 226,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:24:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                plot_dynamics_checks: [
                  {
                    key: 'no_action_feedback',
                    label: '行动反馈不足',
                    status: 'fail',
                    goal: '主角要用第二编号找到真正赎身记录。',
                    obstacle: '巡捕把副页扣为伪证，管事派人封住账房。',
                    action: '主角必须先偷回副页，再用编号换到账房钥匙。',
                    cost_or_feedback: '偷回副页会暴露妹妹藏身处，换来追捕升级。',
                    new_expectation: '第二编号指向账房暗格里的另一份契约。',
                    evidence: '上一章有新编号，但没有目标、阻碍、行动、代价和下一期待的连续推进。',
                    fix: '下一章必须让目标遇到阻碍，由主角行动破局，并付出代价后打开新期待。',
                    remaining_risk: '不能再让剧情只靠发现新线索原地转圈。',
                  },
                  {
                    key: 'goal_ok',
                    label: '动力闭环已完成',
                    status: 'pass',
                    goal: '已兑现。',
                    obstacle: '已兑现。',
                    action: '已兑现。',
                    cost_or_feedback: '已兑现。',
                    new_expectation: '已兑现。',
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
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '第二编号',
        summary: '主角偷回副页，用第二编号换到账房钥匙。',
        conflict: '巡捕扣住副页，管事封住账房，主角必须付出藏身处暴露的代价。',
        ending_hook: '账房暗格里出现另一份契约。',
        scene_cards: [
          { scene_no: 1, title: '第二编号', reader_payoff: '剧情动力字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:24:00.000Z',
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
      { chapter_no: 8, title: '第二编号' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修剧情动力')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修剧情动力：动力缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('plot_dynamics_checks.行动反馈不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('goal=主角要用第二编号找到真正赎身记录')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('obstacle=巡捕把副页扣为伪证')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('action=主角必须先偷回副页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('cost_or_feedback=偷回副页会暴露妹妹藏身处')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('new_expectation=第二编号指向账房暗格')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('动力闭环已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('goal')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('action')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('new_expectation')
    expect(prompt).toContain('plot_dynamics_checks.行动反馈不足')
    expect(prompt).toContain('不能再让剧情只靠发现新线索原地转圈')
  })

  test('carries continuity heat execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '内库编号' },
      [
        { id: 8, chapter_no: 8, title: '第二编号' },
        { id: 9, chapter_no: 9, title: '内库编号' },
      ],
      [
        {
          id: 230,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:24:30.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            self_check: {
              review: {
                continuity_heat_checks: [
                  {
                    key: 'thread_heat_missing',
                    label: '热度追踪断层',
                    status: 'warn',
                    heat_state: 'hot=沈峤旧案必须推进；warm=妹妹赎身线保温；cold=巡捕内库编号预热；archived=管事旧仓线休眠。',
                    hot_progress: '让沈峤旧案从旧印推进到父亲案卷缺页。',
                    warm_keepalive: '用妹妹旧名牌回声提醒赎身线仍是主角情感目标。',
                    cold_warmup: '巡捕内库编号先以契约缺角编号出现，不直接回收。',
                    archived_boundary: '管事旧仓线暂休眠，只用追捕后果保留边界，不误激活新旧仓冲突。',
                    evidence: '上一章只提契约和编号，没有推进 hot 线，也没有保温妹妹线或预热内库线。',
                    fix: '下一章必须推进沈峤旧案，保温妹妹赎身线，预热内库编号，并说明管事旧仓线暂休眠。',
                    remaining_risk: '不能再让长线只靠名字露面而没有热度变化。',
                  },
                  {
                    key: 'heat_ok',
                    label: '热度追踪已完成',
                    status: 'pass',
                    heat_state: '已兑现。',
                    hot_progress: '已兑现。',
                    warm_keepalive: '已兑现。',
                    cold_warmup: '已兑现。',
                    archived_boundary: '已兑现。',
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
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '内库编号',
        summary: '主角顺着契约缺角编号发现巡捕内库与沈峤旧案有关。',
        conflict: '沈峤想压住旧案，主角必须用契约缺角逼他承认内库编号。',
        ending_hook: '内库编号对应的案卷缺了一页。',
        scene_cards: [
          { scene_no: 1, title: '编号缺角', reader_payoff: '连续性热度字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:24:30.000Z',
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
      { chapter_no: 9, title: '内库编号' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修连续性热度')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('连续性热度：热度缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('continuity_heat_checks.热度追踪断层')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('heat_state=hot=沈峤旧案必须推进')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('hot_progress=让沈峤旧案从旧印推进到父亲案卷缺页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('warm_keepalive=用妹妹旧名牌回声提醒赎身线')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('cold_warmup=巡捕内库编号先以契约缺角编号出现')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('archived_boundary=管事旧仓线暂休眠')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('热度追踪已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('hot_progress')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('warm_keepalive')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('archived_boundary')
    expect(prompt).toContain('continuity_heat_checks.热度追踪断层')
    expect(prompt).toContain('不能再让长线只靠名字露面而没有热度变化')
  })

  test('carries character relation execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '暗格同盟' },
      [
        { id: 8, chapter_no: 8, title: '第二编号' },
        { id: 9, chapter_no: 9, title: '暗格同盟' },
      ],
      [
        {
          id: 227,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:25:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            self_check: {
              review: {
                character_relation_checks: [
                  {
                    key: 'helper_without_protagonist_goal',
                    label: '主角目标归属不足',
                    status: 'fail',
                    relation_type: '交易同盟转信任同盟。',
                    protagonist_goal: '主角要拿到账房暗格里的契约，证明妹妹赎身记录被篡改。',
                    agency_choice: '主角必须主动选择把半张副页交给账房少女，让她验证编号。',
                    cost: '交出副页会让主角短暂失去唯一证据，并承担被背叛风险。',
                    relation_shift: '账房少女从只求自保，转为愿意替主角打开暗格。',
                    evidence: '上一章账房少女只负责提供帮助，主角像是在替她完成目标，缺少自己的选择和代价。',
                    fix: '下一章必须把目标归还给主角，让关系角色有自己的诉求，并通过主角主动选择和代价推动关系变化。',
                    remaining_risk: '不能再让关系角色只当工具人递线索。',
                  },
                  {
                    key: 'relation_arc_ok',
                    label: '关系弧线已完成',
                    status: 'pass',
                    relation_type: '已兑现。',
                    protagonist_goal: '已兑现。',
                    agency_choice: '已兑现。',
                    cost: '已兑现。',
                    relation_shift: '已兑现。',
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
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '暗格同盟',
        summary: '主角用半张副页换到账房少女验证暗格契约。',
        conflict: '账房少女只想自保，主角必须冒着失去证据的风险换取她开暗格。',
        ending_hook: '暗格契约上的印章指向巡捕。',
        scene_cards: [
          { scene_no: 1, title: '半页换门', reader_payoff: '角色关系字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:25:00.000Z',
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
      { chapter_no: 9, title: '暗格同盟' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修角色关系')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('角色关系：关系缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('character_relation_checks.主角目标归属不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('relation_type=交易同盟转信任同盟')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('protagonist_goal=主角要拿到账房暗格里的契约')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('agency_choice=主角必须主动选择把半张副页交给账房少女')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('cost=交出副页会让主角短暂失去唯一证据')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('relation_shift=账房少女从只求自保')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('关系弧线已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('protagonist_goal')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('agency_choice')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('relation_shift')
    expect(prompt).toContain('character_relation_checks.主角目标归属不足')
    expect(prompt).toContain('不能再让关系角色只当工具人递线索')
  })

  test('carries character behavior execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 10, chapter_no: 10, title: '巡捕旧痛' },
      [
        { id: 9, chapter_no: 9, title: '暗格同盟' },
        { id: 10, chapter_no: 10, title: '巡捕旧痛' },
      ],
      [
        {
          id: 228,
          chapter_id: 9,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:26:00.000Z',
          payload: JSON.stringify({
            chapter_id: 9,
            chapter_no: 9,
            self_check: {
              review: {
                character_behavior_checks: [
                  {
                    key: 'motive_chain_too_generic',
                    label: '动机链空泛',
                    status: 'warn',
                    character: '巡捕沈峤',
                    concrete_motive: '沈峤扣下契约不是单纯贪权，而是契约牵出他父亲当年被诬陷的旧案。',
                    emotional_reason: '他害怕旧案重开后父亲最后一点清名也被毁。',
                    trigger_change: '主角拿出暗格契约上的旧印，触发沈峤从压案转为试探合作。',
                    visible_choice: '沈峤必须亲手放走主角三十息，换取主角带回第二份契约。',
                    cost: '他放人会被同僚记名，失去巡捕内部的信任。',
                    evidence: '上一章沈峤只作为追捕压力出现，缺具体动机、情感理由和可见选择。',
                    fix: '下一章必须补沈峤的具体旧案动机、情感理由、触发变化、可见选择和代价。',
                    remaining_risk: '不能再让反派/阻力角色只是工具化追捕。',
                  },
                  {
                    key: 'visible_choice_ok',
                    label: '行为选择已完成',
                    status: 'pass',
                    character: '已兑现。',
                    concrete_motive: '已兑现。',
                    emotional_reason: '已兑现。',
                    trigger_change: '已兑现。',
                    visible_choice: '已兑现。',
                    cost: '已兑现。',
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
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 10,
        title: '巡捕旧痛',
        summary: '主角用旧印触发沈峤的旧案动机，让他短暂放行。',
        conflict: '沈峤扣住契约压案，主角必须让他看见旧案和父亲清名的关联。',
        ending_hook: '沈峤放人后，巡捕名册上划掉了他的名字。',
        scene_cards: [
          { scene_no: 1, title: '旧印试探', reader_payoff: '角色行为字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:26:00.000Z',
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
      { chapter_no: 10, title: '巡捕旧痛' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修角色行为')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('角色行为：人设缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('character_behavior_checks.动机链空泛')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('character=巡捕沈峤')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('concrete_motive=沈峤扣下契约不是单纯贪权')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('emotional_reason=他害怕旧案重开后')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('trigger_change=主角拿出暗格契约上的旧印')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('visible_choice=沈峤必须亲手放走主角三十息')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('cost=他放人会被同僚记名')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('行为选择已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('concrete_motive')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('visible_choice')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('cost')
    expect(prompt).toContain('character_behavior_checks.动机链空泛')
    expect(prompt).toContain('不能再让反派/阻力角色只是工具化追捕')
  })

  test('carries asset linkage execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 11, chapter_no: 11, title: '暗格契约' },
      [
        { id: 10, chapter_no: 10, title: '巡捕旧痛' },
        { id: 11, chapter_no: 11, title: '暗格契约' },
      ],
      [
        {
          id: 229,
          chapter_id: 10,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:27:00.000Z',
          payload: JSON.stringify({
            chapter_id: 10,
            chapter_no: 10,
            self_check: {
              review: {
                asset_linkage_checks: [
                  {
                    key: 'contract_isolated',
                    label: '暗格契约孤立',
                    status: 'fail',
                    asset_name: '账房暗格契约',
                    function: '证明沈峤父亲旧案与妹妹赎身记录被篡改有关。',
                    ownership: '主角暂持半张副页，账房少女掌握暗格开法。',
                    trigger_condition: '只有沈峤看到旧印并放行三十息，主角才能打开暗格。',
                    limitation: '契约缺右下角验印，不能直接定罪，只能换来下一份证据。',
                    consequence: '使用契约会暴露账房少女协助主角，让她被管事盯上。',
                    story_link: '把妹妹赎身线、沈峤旧案和巡捕内鬼线挂在同一份证据上。',
                    evidence: '上一章只点名暗格契约，没有写功能、归属、触发条件、限制和后果。',
                    fix: '下一章必须让暗格契约承担证明功能，明确归属与触发条件，并用限制和后果连接下一条线。',
                    remaining_risk: '不能再让关键资产只作为设定名词出现。',
                  },
                  {
                    key: 'asset_function_ok',
                    label: '资产功能已完成',
                    status: 'pass',
                    asset_name: '已兑现。',
                    function: '已兑现。',
                    ownership: '已兑现。',
                    trigger_condition: '已兑现。',
                    limitation: '已兑现。',
                    consequence: '已兑现。',
                    story_link: '已兑现。',
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
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 11,
        title: '暗格契约',
        summary: '主角打开账房暗格，拿到能串起赎身记录和旧案的契约。',
        conflict: '契约缺验印，主角必须决定是否暴露账房少女来换下一份证据。',
        ending_hook: '契约缺角处留下巡捕内库的编号。',
        scene_cards: [
          { scene_no: 1, title: '契约缺角', reader_payoff: '资产挂钩字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:27:00.000Z',
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
      { chapter_no: 11, title: '暗格契约' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修资产挂钩')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('资产挂钩：孤立资产 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('asset_linkage_checks.暗格契约孤立')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('asset_name=账房暗格契约')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('function=证明沈峤父亲旧案')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('ownership=主角暂持半张副页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('trigger_condition=只有沈峤看到旧印')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('limitation=契约缺右下角验印')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('consequence=使用契约会暴露账房少女')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('story_link=把妹妹赎身线')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('资产功能已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('asset_name')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('trigger_condition')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('story_link')
    expect(prompt).toContain('asset_linkage_checks.暗格契约孤立')
    expect(prompt).toContain('不能再让关键资产只作为设定名词出现')
  })

  test('carries state tracking execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 12, chapter_no: 12, title: '旧伤边界' },
      [
        { id: 11, chapter_no: 11, title: '暗格契约' },
        { id: 12, chapter_no: 12, title: '旧伤边界' },
      ],
      [
        {
          id: 231,
          chapter_id: 11,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:28:00.000Z',
          payload: JSON.stringify({
            chapter_id: 11,
            chapter_no: 11,
            self_check: {
              review: {
                state_tracking_checks: [
                  {
                    key: 'stale_injury_state',
                    label: '旧伤状态误用',
                    status: 'fail',
                    state_subject: '主角左肩旧伤',
                    state_type: '角色身体状态',
                    previous_state: '上一章旧伤只是被沈峤按住后发麻，没有真正复发。',
                    allowed_state: '本章只能写发麻、动作受限和短暂疼痛，不能写成重伤复发。',
                    used_in_chapter: '用左肩发麻影响开锁动作，但不让主角因此倒地。',
                    excluded_reason: '排除“旧伤复发到吐血”，因为前文没有触发重伤条件。',
                    evidence: '上一章把左肩旧伤写成突然复发，导致状态漂移。',
                    fix: '下一章必须按允许状态使用左肩旧伤，并明确排除重伤复发写法。',
                    remaining_risk: '不能再把未触发的旧状态当成当前事实使用。',
                  },
                  {
                    key: 'state_ok',
                    label: '状态边界已完成',
                    status: 'pass',
                    state_subject: '已兑现。',
                    state_type: '已兑现。',
                    previous_state: '已兑现。',
                    allowed_state: '已兑现。',
                    used_in_chapter: '已兑现。',
                    evidence: '已兑现。',
                    excluded_reason: '已兑现。',
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
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 12,
        title: '旧伤边界',
        summary: '主角带着左肩发麻打开内库，但不能把旧伤写成无因复发。',
        conflict: '左肩发麻影响开锁速度，巡捕追近，主角必须在状态边界内完成动作。',
        ending_hook: '内库门开后，主角发现验印台被搬空。',
        scene_cards: [
          { scene_no: 1, title: '发麻开锁', reader_payoff: '状态筛选字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:28:00.000Z',
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
      { chapter_no: 12, title: '旧伤边界' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修状态筛选')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('状态筛选：上下文缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('state_tracking_checks.旧伤状态误用')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('state_subject=主角左肩旧伤')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('state_type=角色身体状态')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('previous_state=上一章旧伤只是被沈峤按住后发麻')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('allowed_state=本章只能写发麻')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('used_in_chapter=用左肩发麻影响开锁动作')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('excluded_reason=排除“旧伤复发到吐血”')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('状态边界已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('previous_state')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('used_in_chapter')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('excluded_reason')
    expect(prompt).toContain('state_tracking_checks.旧伤状态误用')
    expect(prompt).toContain('不能再把未触发的旧状态当成当前事实使用')
  })

  test('carries suspense execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '名册缺页' },
      [
        { id: 2, chapter_no: 2, title: '账页背面' },
        { id: 3, chapter_no: 3, title: '名册缺页' },
      ],
      [
        {
          id: 213,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:23:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                suspense_checks: [
                  {
                    key: 'answer_path_missing',
                    label: '答案路径断裂',
                    status: 'fail',
                    question: '账页背面的编号到底指向谁',
                    misdirect: '执事故意把编号解释成库房货号',
                    partial_answer: '编号其实是证人名册页码',
                    new_expectation: '名册缺掉的一页指向第三个证人',
                    evidence: '本章只抛出编号，没有可信提示、部分答案和新的期待接力。',
                    fix: '下一章必须先让编号触发可信误导，中段给出名册页码的部分答案，章尾挂出第三个证人。',
                    remaining_risk: '不能再只制造谜面而不给答案路径。',
                  },
                  {
                    key: 'misdirect_landed',
                    label: '误导可信',
                    status: 'pass',
                    question: '已兑现。',
                    misdirect: '已兑现。',
                    partial_answer: '已兑现。',
                    new_expectation: '已兑现。',
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
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '名册缺页',
        summary: '主角顺着账页背面的编号找到被撕掉的证人名册。',
        conflict: '执事试图把编号解释成普通货号，拖断答案路径。',
        ending_hook: '缺页边缘露出第三个证人的姓氏。',
        scene_cards: [
          { scene_no: 1, title: '编号误导', reader_payoff: '悬念编排字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:23:00.000Z',
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
      { chapter_no: 3, title: '名册缺页' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修悬念编排')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('悬念编排：悬念缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('suspense_checks.答案路径断裂')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('question=账页背面的编号到底指向谁')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('misdirect=执事故意把编号解释成库房货号')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('partial_answer=编号其实是证人名册页码')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('new_expectation=名册缺掉的一页指向第三个证人')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('误导可信')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('question')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('partial_answer')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('new_expectation')
    expect(prompt).toContain('suspense_checks.答案路径断裂')
    expect(prompt).toContain('不能再只制造谜面而不给答案路径')
  })

  test('carries reversal execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '证词反咬' },
      [
        { id: 2, chapter_no: 2, title: '旧账作证' },
        { id: 3, chapter_no: 3, title: '证词反咬' },
      ],
      [
        {
          id: 214,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:24:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                reversal_checks: [
                  {
                    key: 'fair_clue_missing',
                    label: '公平暗示不足',
                    status: 'warn',
                    reversal_type: '身份反转 + 信息反转',
                    fair_clues: '账页墨迹、证人称呼、执事避开的旧印三处暗示必须提前入场。',
                    misdirect: '让读者先以为旧印只证明账册调包。',
                    reveal_timing: '70-85% 段落揭示证人其实是旧案当事人。',
                    impact_after_reveal: '揭示后必须改变主角处境，让执事的指控反咬自己。',
                    evidence: '本章反转只靠章末一句新证人身份，前文缺公平暗示。',
                    fix: '下一章必须先补三处公平暗示，再用可信误导遮住身份反转，揭示后立刻改变局势。',
                    remaining_risk: '不能再用天降身份解释反转。',
                  },
                  {
                    key: 'timing_ok',
                    label: '揭示时机',
                    status: 'pass',
                    reversal_type: '已兑现。',
                    fair_clues: '已兑现。',
                    misdirect: '已兑现。',
                    reveal_timing: '已兑现。',
                    impact_after_reveal: '已兑现。',
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
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '证词反咬',
        summary: '旧案证人的身份反转让执事的指控反咬自己。',
        conflict: '执事把旧印解释成伪证，主角必须让暗示链在揭示前成立。',
        ending_hook: '证人喊出执事二十年前的旧名。',
        scene_cards: [
          { scene_no: 1, title: '旧印暗示', reader_payoff: '反转设计字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:24:00.000Z',
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
      { chapter_no: 3, title: '证词反咬' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修反转设计')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('反转设计：反转缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reversal_checks.公平暗示不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reversal_type=身份反转 + 信息反转')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('fair_clues=账页墨迹、证人称呼、执事避开的旧印')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('misdirect=让读者先以为旧印只证明账册调包')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reveal_timing=70-85%')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('impact_after_reveal=揭示后必须改变主角处境')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('揭示时机')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('fair_clues')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('reveal_timing')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('impact_after_reveal')
    expect(prompt).toContain('reversal_checks.公平暗示不足')
    expect(prompt).toContain('不能再用天降身份解释反转')
  })

  test('carries unresolved showdown checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '三方震动' },
      [
        { id: 2, chapter_no: 2, title: '旧台压阵' },
        { id: 3, chapter_no: 3, title: '三方震动' },
      ],
      [
        {
          id: 211,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                showdown_checks: [
                  {
                    key: 'trump_card_management_broken',
                    label: '底牌管理',
                    status: 'fail',
                    evidence: '旧台对抗里一次性摊空三张底牌，反派没有被对应压制，也没有补新后手。',
                    fix: '下一章必须只出一个底牌，保留两到三个未揭示底牌，出牌后补新技能、新后手、新目标或更高门槛。',
                  },
                  {
                    key: 'three_pressure_three_shock_missing',
                    label: '三压一爆三震',
                    status: 'warn',
                    evidence: '主角爆发后只写全场震惊，缺友方、敌方、中立方的不同震动和利益变化。',
                    fix: '下一章必须补友方、敌方、中立方三路压力，主角一爆碾压后分别写三方不同震动。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧台登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '三方震动',
        summary: '主角在旧台上用一张底牌压住三方质疑。',
        conflict: '友方怀疑、敌方逼战、中立方观望同时压上来。',
        ending_hook: '旧台背后的更高门槛亮起。',
        scene_cards: [
          { scene_no: 1, title: '三方压阵', reader_payoff: '主角只出一张底牌并造成三方不同震动。' },
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
      { chapter_no: 3, title: '三方震动' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修高潮对抗')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('高潮对抗：爽点缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('只出一个底牌')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('两到三个未揭示底牌')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('三方不同震动')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('高潮对抗：爽点缺口 2')
    expect(prompt).toContain('更高门槛')
  })

  test('carries showdown execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '一印压阵' },
      [
        { id: 3, chapter_no: 3, title: '三方逼战' },
        { id: 4, chapter_no: 4, title: '一印压阵' },
      ],
      [
        {
          id: 215,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:25:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                showdown_checks: [
                  {
                    key: 'payoff_release_weak',
                    label: '爽点释放不足',
                    status: 'fail',
                    payoff_release: '主角亮出一枚旧印后必须立刻压住敌方质疑。',
                    trump_card_used: '只使用旧印一张底牌，保留名册缺页和第三证人。',
                    pressure_layers: '友方先怀疑、敌方逼战、中立方观望加码。',
                    audience_reactions: '友方松口气，敌方失声，中立方改口记录。',
                    consequence: '执事的罚令当场失效，主角拿到翻旧案资格。',
                    next_threshold: '更高门槛是内库封印需要第三证人亲自开启。',
                    evidence: '本章铺了三方压力，但主角出牌后没有压制反派，也没有新门槛。',
                    fix: '下一章必须让一张底牌释放爽点，三方分别震动，并在结果后补更高门槛。',
                    remaining_risk: '不能再让底牌亮出后只换来统一震惊。',
                  },
                  {
                    key: 'stage_ok',
                    label: '舞台层级',
                    status: 'pass',
                    payoff_release: '已兑现。',
                    trump_card_used: '已兑现。',
                    pressure_layers: '已兑现。',
                    audience_reactions: '已兑现。',
                    consequence: '已兑现。',
                    next_threshold: '已兑现。',
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
    const project = { title: '旧台登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '一印压阵',
        summary: '主角只用旧印这一张底牌压住旧台三方。',
        conflict: '敌方逼主角摊空底牌，友方和中立方都在看他的出牌后果。',
        ending_hook: '内库封印亮出第三证人的名字。',
        scene_cards: [
          { scene_no: 1, title: '一印压阵', reader_payoff: '高潮对抗字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:25:00.000Z',
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
      { chapter_no: 4, title: '一印压阵' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修高潮对抗')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('高潮对抗：爽点缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('showdown_checks.爽点释放不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('payoff_release=主角亮出一枚旧印后必须立刻压住敌方质疑')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('trump_card_used=只使用旧印一张底牌')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('pressure_layers=友方先怀疑、敌方逼战、中立方观望加码')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('audience_reactions=友方松口气，敌方失声，中立方改口记录')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('consequence=执事的罚令当场失效')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('next_threshold=更高门槛是内库封印需要第三证人亲自开启')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('舞台层级')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('pressure_layers')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('trump_card_used')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('next_threshold')
    expect(prompt).toContain('showdown_checks.爽点释放不足')
    expect(prompt).toContain('不能再让底牌亮出后只换来统一震惊')
  })

  test('carries unresolved bridge unit checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '旧巷新目标' },
      [
        { id: 2, chapter_no: 2, title: '桥段断档' },
        { id: 3, chapter_no: 3, title: '旧巷新目标' },
      ],
      [
        {
          id: 212,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:22:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                bridge_unit_checks: [
                  {
                    key: 'continuous_expectation_broken',
                    label: '连续期待',
                    status: 'fail',
                    evidence: '本章兑现旧期待后没有挂新期待，章尾没有新目标或连续小期待。',
                    fix: '下一章必须在兑现旧期待前挂新期待，并在章尾给出新目标或连续小期待。',
                  },
                  {
                    key: 'two_chapter_momentum_stall',
                    label: '连续两章无推进',
                    status: 'warn',
                    evidence: '连续两章只复盘旧线索，没有目标推进、状态变化或阶段衔接。',
                    fix: '下一章必须提高冲突密度，让目标推进、关系/伏笔/状态承接余波至少落地一项。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧巷登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '旧巷新目标',
        summary: '主角兑现旧线索前先挂出旧巷里的新目标。',
        conflict: '旧线索能解眼前危机，但新目标会暴露更高层追踪。',
        ending_hook: '旧巷尽头出现下一阶段的门牌。',
        scene_cards: [
          { scene_no: 1, title: '挂新期待', reader_payoff: '兑现旧期待前挂出新目标，并留下连续小期待。' },
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
      { chapter_no: 3, title: '旧巷新目标' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修桥段节奏')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('桥段节奏：节奏缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('兑现旧期待前挂新期待')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('章尾给出新目标')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('关系/伏笔/状态承接余波')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('桥段节奏：节奏缺口 2')
    expect(prompt).toContain('连续小期待')
  })

  test('carries bridge unit execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 5, chapter_no: 5, title: '旧门新路' },
      [
        { id: 4, chapter_no: 4, title: '旧门余波' },
        { id: 5, chapter_no: 5, title: '旧门新路' },
      ],
      [
        {
          id: 216,
          chapter_id: 4,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:26:00.000Z',
          payload: JSON.stringify({
            chapter_id: 4,
            chapter_no: 4,
            self_check: {
              review: {
                bridge_unit_checks: [
                  {
                    key: 'stage_handoff_missing',
                    label: '阶段交接断档',
                    status: 'fail',
                    bridge_position: '四章桥段后的第1章，必须承接旧门余波并开启新阶段。',
                    old_expectation_payoff: '先兑现旧门封印为什么失效。',
                    new_expectation_seed: '再种下内库第三证人必须亲自开门的新期待。',
                    goal_progression: '主角目标从洗清旧账推进到进入内库找原始名册。',
                    climax_hook: '高潮中让内库门牌亮出半个证人姓氏。',
                    stage_handoff: '章尾交接到内库调查线，明确下一阶段行动地点和代价。',
                    evidence: '本章只处理旧门余波，没有给新目标、新期待和阶段交接。',
                    fix: '下一章必须先兑现旧门旧期待，再种新期待，并在章尾交接到内库调查线。',
                    remaining_risk: '不能再让过渡章只复盘旧信息。',
                  },
                  {
                    key: 'goal_progression_ok',
                    label: '目标推进',
                    status: 'pass',
                    bridge_position: '已兑现。',
                    old_expectation_payoff: '已兑现。',
                    new_expectation_seed: '已兑现。',
                    goal_progression: '已兑现。',
                    climax_hook: '已兑现。',
                    stage_handoff: '已兑现。',
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
    const project = { title: '旧巷登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 5,
        title: '旧门新路',
        summary: '主角兑现旧门余波，同时把目标推进到内库原始名册。',
        conflict: '旧期待必须收束，但新阶段的地点和代价也必须亮出来。',
        ending_hook: '内库门牌亮出半个证人姓氏。',
        scene_cards: [
          { scene_no: 1, title: '旧门新路', reader_payoff: '桥段节奏字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:26:00.000Z',
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
      { chapter_no: 5, title: '旧门新路' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修桥段节奏')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('桥段节奏：节奏缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('bridge_unit_checks.阶段交接断档')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('bridge_position=四章桥段后的第1章')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('old_expectation_payoff=先兑现旧门封印为什么失效')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('new_expectation_seed=再种下内库第三证人必须亲自开门的新期待')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('goal_progression=主角目标从洗清旧账推进到进入内库找原始名册')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('climax_hook=高潮中让内库门牌亮出半个证人姓氏')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('stage_handoff=章尾交接到内库调查线')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('目标推进')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('old_expectation_payoff')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('goal_progression')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('stage_handoff')
    expect(prompt).toContain('bridge_unit_checks.阶段交接断档')
    expect(prompt).toContain('不能再让过渡章只复盘旧信息')
  })

  test('carries unresolved source readiness checks as source risks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门牌来源' },
      [
        { id: 2, chapter_no: 2, title: '旧门牌' },
        { id: 3, chapter_no: 3, title: '门牌来源' },
      ],
      [
        {
          id: 213,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:24:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                source_readiness_checks: [
                  {
                    key: 'source_readiness_previous_chapter',
                    label: '上一章正文来源',
                    status: 'fail',
                    evidence: '上一章正文没有读到，但本章把旧楼门牌变化写成既定事实。',
                    fix: '下一章必须先补齐上一章正文来源，再把旧楼门牌变化写成当前行动依据。',
                  },
                  {
                    key: 'source_readiness_character_state',
                    label: '角色状态来源',
                    status: 'warn',
                    evidence: '角色认知边界未确认，却写成主角已经知道门牌规则。',
                    fix: '下一章必须补齐角色状态和认知边界，不能把未就绪来源写成既定事实。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧楼门牌', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '门牌来源',
        summary: '主角先确认上一章门牌变化来源，再行动。',
        conflict: '门牌规则可用，但角色认知边界仍未补齐。',
        ending_hook: '门牌背面出现上一章遗漏的编号。',
        scene_cards: [
          { scene_no: 1, title: '补齐来源', reader_payoff: '来源就绪缺口被转成当前行动依据。' },
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
      { chapter_no: 3, title: '门牌来源' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补来源就绪')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('来源就绪：来源缺口 2')
    expect(brief.delivery_risk_carry_over.items.join('｜')).not.toContain('状态筛选：上下文缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('上一章正文来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('角色状态和认知边界')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('来源就绪：来源缺口 2')
    expect(prompt).toContain('未就绪来源')
  })

  test('carries nested source readiness receipts into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '补读来源' },
      [
        { id: 2, chapter_no: 2, title: '断章来源' },
        { id: 3, chapter_no: 3, title: '补读来源' },
      ],
      [
        {
          id: 214,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:25:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                oh_story_delivery_receipts: {
                  pre_draft_execution_receipts: {
                    source_readiness_checks: [
                      {
                        key: 'source_readiness_timeline',
                        label: '时间线来源',
                        status: 'fail',
                        evidence: '时间线来源未确认，却把门牌翻面时间写成既定事实。',
                        fix: '下一章先补时间线来源，再把门牌翻面时间写成角色能确认的行动依据。',
                      },
                    ],
                  },
                },
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧楼门牌', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '补读来源',
        summary: '主角先补读时间线来源，再决定是否触发门牌。',
        conflict: '门牌翻面可用，但时间线来源未确认。',
        ending_hook: '时间线背后出现新断点。',
        scene_cards: [
          { scene_no: 1, title: '补读时间线', reader_payoff: '来源缺口转成当前行动依据。' },
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
      { chapter_no: 3, title: '补读来源' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补来源就绪')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('来源就绪：来源缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('时间线来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门牌翻面时间')
    expect(prompt).toContain('来源就绪：来源缺口 1')
    expect(prompt).toContain('补时间线来源')
  })

  test('carries source readiness execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '旧档案缺页' },
      [
        { id: 3, chapter_no: 3, title: '门牌来源' },
        { id: 4, chapter_no: 4, title: '旧档案缺页' },
      ],
      [
        {
          id: 216,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:27:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                source_readiness_checks: [
                  {
                    key: 'source_archive_missing',
                    label: '旧档案来源',
                    status: 'fail',
                    source_name: '旧档案第七页',
                    source_path: '设定/旧档案.md#第七页',
                    read_status: 'missing',
                    used_as_fact: true,
                    chapter_evidence: '正文直接说第七页证明门牌归属。',
                    evidence: '旧档案第七页未读，却被写成铁证。',
                    fix: '下一章必须先找到第七页残片，才能让门牌归属成为行动依据。',
                    remaining_risk: '不能继续把未读档案当成既定事实。',
                  },
                  {
                    key: 'source_character_ready',
                    label: '角色状态来源',
                    status: 'pass',
                    source_name: '角色状态表',
                    source_path: '状态/角色.md',
                    read_status: 'ready',
                    used_as_fact: false,
                    chapter_evidence: '已按角色状态表限制主角认知。',
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
    const project = { title: '旧楼门牌', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '旧档案缺页',
        summary: '主角先找到旧档案第七页残片，再判断门牌归属。',
        conflict: '档案缺页会误导门牌归属。',
        ending_hook: '第七页残片背面出现新门牌编号。',
        scene_cards: [
          { scene_no: 1, title: '找第七页', reader_payoff: '来源就绪缺口变成可见取证动作。' },
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
      { chapter_no: 4, title: '旧档案缺页' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补来源就绪')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('来源就绪：来源缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('source_readiness_checks.旧档案来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旧档案第七页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('设定/旧档案.md#第七页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('read_status=missing')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('used_as_fact=true')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('角色状态表')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('来源就绪')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('未就绪来源')
    expect(prompt).toContain('source_readiness_checks.旧档案来源')
    expect(prompt).toContain('不能继续把未读档案当成既定事实')
  })

  test('carries nested status filter receipts into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '状态补线' },
      [
        { id: 2, chapter_no: 2, title: '错读状态' },
        { id: 3, chapter_no: 3, title: '状态补线' },
      ],
      [
        {
          id: 215,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:26:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                oh_story_delivery_receipts: {
                  pre_draft_execution_receipts: {
                    status_filter_receipts: [
                      {
                        key: 'character_state_boundary',
                        label: '角色认知边界',
                        used_in_chapter: true,
                        evidence: '主角还没看到旧印回光，却提前知道门牌归属。',
                        excluded_reason: '',
                        remaining_risk: '下一章必须把角色认知边界补成可见证据，不能继续让主角提前知道门牌归属。',
                      },
                    ],
                  },
                },
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧楼门牌', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '状态补线',
        summary: '主角先看到旧印回光，再确认门牌归属。',
        conflict: '门牌归属可推断，但角色认知边界不能跳过。',
        ending_hook: '旧印回光照出新名字。',
        scene_cards: [
          { scene_no: 1, title: '补角色认知', reader_payoff: '状态筛选缺口变成可见证据。' },
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
      { chapter_no: 3, title: '状态补线' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修状态筛选')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('状态筛选：上下文缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('角色认知边界')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门牌归属')
    expect(prompt).toContain('状态筛选：上下文缺口 1')
    expect(prompt).toContain('角色认知边界补成可见证据')
  })

  test('carries duplicate chapter title sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '校徽敲门' },
      [
        { id: 1, chapter_no: 1, title: '第1章 门外学生' },
        { id: 2, chapter_no: 2, title: '门外学生' },
        { id: 3, chapter_no: 3, title: '校徽敲门' },
      ],
      [
        {
          id: 204,
          chapter_id: 2,
          review_type: 'chapter_title_uniqueness_sync',
          created_at: '2026-06-09T08:06:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            chapter_title_uniqueness_sync: {
              status: 'warn',
              label: '章节标题重复 1',
              missed_count: 1,
              duplicates: [{ chapter_no: 1, title: '第1章 门外学生' }],
              missed: [{ chapter_no: 1, title: '第1章 门外学生' }],
              next_actions: ['下一章必须先修标题：按本章核心事件、冲突转折、关键资产或章尾钩子改名，并同步章节标题。'],
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
        title: '校徽敲门',
        summary: '校徽成为开门规则的新证据。',
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
      { chapter_no: 3, title: '校徽敲门' },
    )

    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修章节标题')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修标题：章节标题重复 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('核心事件、冲突转折、关键资产或章尾钩子改名')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('修标题：章节标题重复 1')
    expect(prompt).toContain('核心事件、冲突转折、关键资产或章尾钩子改名')
  })

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

  test('asks prose review to output a next-chapter quality continuity plan', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )

    expect(reviewPrompt).toContain('next_chapter_quality_plan')
    expect(reviewPrompt).toContain('quality_focus')
    expect(reviewPrompt).toContain('opening_actions')
    expect(reviewPrompt).toContain('middle_actions')
    expect(reviewPrompt).toContain('ending_actions')
    expect(reviewPrompt).toContain('avoid_repetition')
    expect(reviewPrompt).toContain('evidence_basis')
    expect(reviewPrompt).toContain('ending_contract')
    expect(reviewPrompt).toContain('final_state')
    expect(reviewPrompt).toContain('unresolved_question')
    expect(reviewPrompt).toContain('next_chapter_pull')
    expect(reviewPrompt).toContain('handoff_to_next')
  })

  test('asks prose revision to output a final next-chapter quality continuity plan', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(revisionPrompt).toContain('next_chapter_quality_plan')
    expect(revisionPrompt).toContain('quality_focus')
    expect(revisionPrompt).toContain('opening_actions')
    expect(revisionPrompt).toContain('middle_actions')
    expect(revisionPrompt).toContain('ending_actions')
    expect(revisionPrompt).toContain('avoid_repetition')
    expect(revisionPrompt).toContain('evidence_basis')
    expect(revisionPrompt).toContain('ending_contract')
    expect(revisionPrompt).toContain('final_state')
    expect(revisionPrompt).toContain('unresolved_question')
    expect(revisionPrompt).toContain('next_chapter_pull')
    expect(revisionPrompt).toContain('handoff_to_next')
    expect(revisionPrompt).toContain('修订后')
    expect(revisionPrompt).toContain('next_chapter_quality_plan_receipts')
  })

  test('carries next-chapter quality plan into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 206,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:06:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                score: 82,
                passed: true,
                next_chapter_quality_plan: {
                  version: 'oh_story_next_chapter_quality_plan_v1',
                  quality_focus: ['把门外学生身份追查变成下一章主目标。'],
                  opening_actions: ['前300字让主角拿水迹样本验证门外学生身份。'],
                  middle_actions: ['中段让玻璃门规则反制蛮力，形成新信息。'],
                  ending_actions: ['章末用校徽反光露出第二条规则。'],
                  avoid_repetition: ['不要再用“他知道，这只是开始”总结体收尾。'],
                  evidence_basis: ['上一章章末只留下门外学生消失，没有行动压力。'],
                },
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 3, title: '门外学生' })

    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('质量续航：下一章计划')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门外学生身份追查变成下一章主目标')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('前300字让主角拿水迹样本验证门外学生身份')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('玻璃门规则反制蛮力')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('校徽反光露出第二条规则')
    expect(brief.write_preparation_brief.delivery_risk_actions.join('｜')).toContain('前300字让主角拿水迹样本验证门外学生身份')
    expect(brief.write_preparation_brief.delivery_risk_actions.join('｜')).toContain('玻璃门规则反制蛮力')
    expect(brief.write_preparation_brief.delivery_risk_actions.join('｜')).toContain('校徽反光露出第二条规则')
    expect(brief.write_preparation_brief.must_confirm.join('｜')).toContain('前300字让主角拿水迹样本验证门外学生身份')
    expect(prompt).toContain('质量续航：下一章计划')
    expect(prompt).toContain('不要再用“他知道，这只是开始”总结体收尾')
    expect(prompt).toContain('上一章章末只留下门外学生消失')
    expect(prompt).toContain('next_chapter_quality_plan_receipts')
  })

  test('carries next-chapter quality plan ending contracts into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 207,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:07:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                score: 84,
                passed: true,
                next_chapter_quality_plan: {
                  version: 'oh_story_next_chapter_quality_plan_v1',
                  quality_focus: ['下一章必须接住校徽反光，不改成新支线。'],
                  opening_actions: ['前300字让主角用半枚校徽反光定位值班室。'],
                  middle_actions: ['中段让第二条规则改变救人判断。'],
                  ending_actions: ['章末让值班室名单出现主角母亲旧名。'],
                  avoid_repetition: ['不要再用门口犹豫开篇。'],
                  evidence_basis: ['上一章最后只剩半枚校徽反光，没有解释第二条规则。'],
                  ending_contract: {
                    final_state: '门外学生消失后，玻璃门只剩半枚校徽反光。',
                    unresolved_question: '第二条规则是谁写在校徽背面？',
                    next_chapter_pull: '值班室名单里出现主角母亲旧名。',
                    handoff_to_next: '开篇必须从半枚校徽反光直接追到值班室名单。',
                  },
                },
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 3, title: '门外学生' })

    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('上章最后状态：门外学生消失后，玻璃门只剩半枚校徽反光')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('开篇必须从半枚校徽反光直接追到值班室名单')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('未解决问题：第二条规则是谁写在校徽背面')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('下一章推动力：值班室名单里出现主角母亲旧名')
    expect(prompt).toContain('ending_contract')
    expect(prompt).toContain('final_state')
    expect(prompt).toContain('第二条规则是谁写在校徽背面')
    expect(prompt).toContain('开篇必须从半枚校徽反光直接追到值班室名单')
  })

  test('turns next-chapter avoid-repetition plan into forbidden repeats', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 208,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              revision: {
                next_chapter_quality_plan: {
                  version: 'oh_story_next_chapter_quality_plan_v1',
                  quality_focus: ['把门外学生身份追查变成下一章主目标。'],
                  opening_actions: ['前300字让主角拿水迹样本验证门外学生身份。'],
                  avoid_repetition: ['不要再用“他知道，这只是开始”总结体收尾。'],
                  evidence_basis: ['上一章章末只留下门外学生消失，没有行动压力。'],
                },
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 3, title: '门外学生' })

    expect(deliveryRiskCarryOver?.forbidden_repeats).toContain('不要再用“他知道，这只是开始”总结体收尾。')
    expect(brief.delivery_risk_carry_over.forbidden_repeats).toContain('不要再用“他知道，这只是开始”总结体收尾。')
    expect(brief.forbidden_content).toContain('不要再用“他知道，这只是开始”总结体收尾。')
    expect(context.chapter_target.forbidden_content).toContain('不要再用“他知道，这只是开始”总结体收尾。')
    expect(prompt).toContain('禁用重复：不要再用“他知道，这只是开始”总结体收尾。')
  })

  test('carries nested next-chapter quality plan from oh-story delivery receipts', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '校徽反光' },
      [
        { id: 2, chapter_no: 2, title: '门外学生' },
        { id: 3, chapter_no: 3, title: '校徽反光' },
      ],
      [
        {
          id: 209,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                score: 78,
                passed: false,
              },
              revision: {
                oh_story_delivery_receipts: {
                  next_chapter_quality_plan: {
                    version: 'oh_story_next_chapter_quality_plan_v1',
                    quality_focus: ['嵌套计划：下一章必须追查校徽反光里的第二条规则。'],
                    opening_actions: ['嵌套计划：前300字用校徽反光定位值班室名单。'],
                    middle_actions: ['嵌套计划：中段让假学生被门禁反噬。'],
                    ending_actions: ['嵌套计划：章末让名单缺页指向新门牌。'],
                    avoid_repetition: ['嵌套计划：不要再用门口犹豫开篇。'],
                    evidence_basis: ['嵌套计划来自修订后 oh_story_delivery_receipts。'],
                  },
                },
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
        title: '校徽反光',
        summary: '追查校徽反光里的第二条规则。',
        conflict: '假学生消失，但校徽反光留下新证据。',
        ending_hook: '名单缺页背面出现新门牌。',
        scene_cards: [
          { scene_no: 1, title: '校徽定位', reader_payoff: '校徽反光定位值班室名单。' },
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 3, title: '校徽反光' })

    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('质量续航：下一章计划')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('嵌套计划：下一章必须追查校徽反光里的第二条规则')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('嵌套计划：前300字用校徽反光定位值班室名单')
    expect(brief.forbidden_content).toContain('嵌套计划：不要再用门口犹豫开篇。')
    expect(prompt).toContain('嵌套计划：前300字用校徽反光定位值班室名单')
    expect(prompt).toContain('嵌套计划：不要再用门口犹豫开篇')
  })

  test('keeps next-chapter quality plan in normalized prose self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('next_chapter_quality_plan')
    expect(reviewBlock).toContain('reviewPayload?.next_chapter_quality_plan')
    expect(reviewBlock).toContain('reviewPayload?.nextChapterQualityPlan')
    expect(reviewBlock).toContain('reviewPayloadDeliveryReceipts')
    expect(reviewBlock).toContain('reviewPayloadDeliveryReceipts?.next_chapter_quality_plan')
    expect(reviewBlock).toContain('reviewPayloadDeliveryReceipts?.nextChapterQualityPlan')
  })

  test('treats a missing next-chapter quality plan as a prose revision trigger', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionDecisionBlock = source.slice(
      source.indexOf('const nextChapterQualityPlanNeedsRepair'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const normalizedReview = {')),
    )

    expect(revisionDecisionBlock).toContain('nextChapterQualityPlanNeedsRepair')
    expect(revisionDecisionBlock).toContain('quality_focus')
    expect(revisionDecisionBlock).toContain('opening_actions')
    expect(revisionDecisionBlock).toContain('middle_actions')
    expect(revisionDecisionBlock).toContain('ending_actions')
    expect(revisionDecisionBlock).toContain('avoid_repetition')
    expect(revisionDecisionBlock).toContain('evidence_basis')
    expect(revisionDecisionBlock).toContain('ending_contract')
    expect(revisionDecisionBlock).toContain('final_state')
    expect(revisionDecisionBlock).toContain('unresolved_question')
    expect(revisionDecisionBlock).toContain('next_chapter_pull')
    expect(revisionDecisionBlock).toContain('handoff_to_next')
    expect(revisionDecisionBlock).toContain('hasNextChapterQualityPlanConcern')
    expect(reviewNormalizeBlock).toContain('const hasNextChapterQualityPlanConcern = nextChapterQualityPlanNeedsRepair(normalizedReview)')
    expect(reviewNormalizeBlock).toContain('normalizedReview.needs_revision =')
    expect(reviewNormalizeBlock).toContain('|| hasNextChapterQualityPlanConcern')
  })

  test('keeps final next-chapter quality plan in prose revision result', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionStart = source.indexOf('const revisionPayload = getNovelPayload(revisionResult)')
    const revisionBlock = source.slice(
      revisionStart,
      source.indexOf('next_chapter_quality_plan: revisionNextChapterQualityPlan', revisionStart) + 'next_chapter_quality_plan: revisionNextChapterQualityPlan'.length + 40,
    )

    expect(revisionBlock).toContain('const revisionNextChapterQualityPlan =')
    expect(revisionBlock).toContain('revisedFirst?.next_chapter_quality_plan')
    expect(revisionBlock).toContain('revisedFirst?.nextChapterQualityPlan')
    expect(revisionBlock).toContain('revisionPayload?.next_chapter_quality_plan')
    expect(revisionBlock).toContain('revisionPayload?.nextChapterQualityPlan')
    expect(revisionBlock).toContain('next_chapter_quality_plan: revisionNextChapterQualityPlan')
  })

})

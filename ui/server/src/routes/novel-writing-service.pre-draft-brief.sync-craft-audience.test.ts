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

describe('chapter pre-draft brief sync-craft/audience', () => {
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

})

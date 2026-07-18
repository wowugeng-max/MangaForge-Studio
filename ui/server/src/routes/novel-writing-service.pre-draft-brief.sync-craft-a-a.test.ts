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

describe('chapter pre-draft brief sync-craft a a', () => {
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

})

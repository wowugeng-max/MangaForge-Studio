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

describe('chapter pre-draft brief sync-craft a', () => {
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

})

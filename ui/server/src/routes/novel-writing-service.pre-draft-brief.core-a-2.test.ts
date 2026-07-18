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

describe('chapter pre-draft brief core a 2', () => {
  test('adds an oh-story plot dynamics contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 10,
        title: '假胜崩解',
        summary: '主角以为账本反证成功，却发现证人提前被换。',
        conflict: '旧证据能洗清罪名，但证人倒戈会反咬主角。',
        ending_hook: '被换掉的证人从屏风后走出来。',
        scene_cards: [
          {
            scene_no: 1,
            title: '证据上桌',
            purpose: '让主角获得阶段性假胜。',
            conflict: '对手质疑账本来源。',
            reader_payoff: '旧印章证明账本是真的。',
          },
          {
            scene_no: 2,
            title: '证人倒戈',
            purpose: '击碎假胜并推入绝境。',
            conflict: '证人当众改口。',
            reversal: '证人说账本是主角伪造。',
            reader_payoff: '读者意识到对手提前换了证人。',
            ending_hook_seed: '真正证人从屏风后走出来。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '反证长篇' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '反证长篇' },
      confirmedContext,
      null,
      { chapter_no: 10, title: '假胜崩解' },
    )

    expect(brief.plot_dynamics_contract.version).toBe('oh_story_plot_dynamics_v1')
    expect(brief.plot_dynamics_contract.plot_loop.join('｜')).toContain('目标')
    expect(brief.plot_dynamics_contract.climax_formula.join('｜')).toContain('假胜')
    expect(brief.plot_dynamics_contract.climax_formula.join('｜')).toContain('崩解')
    expect(brief.plot_dynamics_contract.ab_outline.join('｜')).toContain('A 蓄压')
    expect(brief.plot_dynamics_contract.drive_mode_rules.join('｜')).toContain('事件驱动')
    expect(brief.plot_dynamics_contract.drive_mode_rules.join('｜')).toContain('每章给一个外部结果')
    expect(brief.plot_dynamics_contract.drive_mode_rules.join('｜')).toContain('每 3-5 章插一段情感停顿')
    expect(brief.plot_dynamics_contract.line_stagger_rules.join('｜')).toContain('主线和支线错开')
    expect(brief.plot_dynamics_contract.line_stagger_rules.join('｜')).toContain('战力提升线')
    expect(brief.plot_dynamics_contract.line_stagger_rules.join('｜')).toContain('装备收获线')
    expect(confirmedContext.chapter_target.plot_dynamics_contract.quality_checks.join('｜')).toContain('目标→阻碍→行动')
    expect(prompt).toContain('【剧情动力合同】')
    expect(prompt).toContain('执行 chapter_target.plot_dynamics_contract')
    expect(prompt).toContain('蓄能 → 假胜 → 崩解')
    expect(prompt).toContain('驱动方式')
    expect(prompt).toContain('每章给一个外部结果')
    expect(prompt).toContain('多线错峰')
    expect(prompt).toContain('plot_dynamics_checks')
    expect(prompt.indexOf('【剧情动力合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('adds an oh-story story power contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      writing_bible: {
        story_power_contract: {
          source: 'manual_story_power',
          action_rules: ['每个场景必须让主角用动作改变局势。'],
        },
      },
      chapter_target: {
        chapter_no: 11,
        title: '阵盘入局',
        summary: '主角要用裂纹阵盘证明旧案有人动手脚。',
        conflict: '执事封锁证物，证人不敢开口。',
        ending_hook: '裂纹阵盘反向亮起，指向内门库房。',
        scene_cards: [
          {
            scene_no: 1,
            title: '封锁证物',
            goal: '主角要拿到旧案阵盘。',
            conflict: '执事不许任何人碰证物。',
            action: '主角当众押上自己的残阵盘换一次验阵机会。',
            reader_payoff: '阵盘裂纹和旧案证物对上。',
            state_delta: '主角从被堵门变成掌握验阵资格。',
          },
          {
            scene_no: 2,
            title: '反向亮阵',
            goal: '主角证明证物被动过。',
            conflict: '证人害怕内门报复。',
            action: '主角用残阵盘逼出反向阵纹。',
            reader_payoff: '读者看到幕后线索指向内门库房。',
            exit_state: '旧案从无头案变成可追查的内门线索。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '寒门阵师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '寒门阵师' },
      confirmedContext,
      null,
      { chapter_no: 11, title: '阵盘入局' },
    )

    expect(brief.story_power_contract.source).toBe('manual_story_power')
    expect(brief.story_power_contract.story_power_dimensions.join('｜')).toContain('故事五维')
    expect(brief.story_power_contract.action_rules.join('｜')).toContain('每个场景必须让主角用动作改变局势')
    expect(brief.story_power_contract.beginning_end_rules.join('｜')).toContain('有始有终')
    expect(brief.story_power_contract.causal_feedback_rules.join('｜')).toContain('因果反馈')
    expect(confirmedContext.chapter_target.story_power_contract.quality_checks.join('｜')).toContain('行动是否改变局势')
    expect(prompt).toContain('【故事力合同】')
    expect(prompt).toContain('执行 chapter_target.story_power_contract')
    expect(prompt).toContain('故事五维')
    expect(prompt).toContain('有动作才是故事')
    expect(prompt).toContain('有始有终')
    expect(prompt).toContain('因果反馈')
    expect(prompt).toContain('story_power_checks')
    expect(prompt.indexOf('【故事力合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('hydrates incomplete explicit plot dynamics contract from scene progression context', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 10,
        title: '假胜崩解',
        summary: '主角以为账本反证成功，却发现证人提前被换。',
        conflict: '旧证据能洗清罪名，但证人倒戈会反咬主角。',
        ending_hook: '被换掉的证人从屏风后走出来。',
        plot_dynamics_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认本章有假胜、崩解和新的悬置收尾。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '证据上桌',
            purpose: '让主角获得阶段性假胜。',
            conflict: '对手质疑账本来源。',
            reader_payoff: '旧印章证明账本是真的。',
          },
          {
            scene_no: 2,
            title: '证人倒戈',
            purpose: '击碎假胜并推入绝境。',
            conflict: '证人当众改口。',
            reversal: '证人说账本是主角伪造。',
            reader_payoff: '读者意识到对手提前换了证人。',
            ending_hook_seed: '真正证人从屏风后走出来。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '反证长篇' }, contextPackage)

    expect(brief.plot_dynamics_contract.source).toBe('manual_incomplete')
    expect(brief.plot_dynamics_contract.quality_checks).toEqual(['必须确认本章有假胜、崩解和新的悬置收尾。'])
    expect(brief.plot_dynamics_contract.plot_loop.join('｜')).toContain('主角以为账本反证成功')
    expect(brief.plot_dynamics_contract.plot_loop.join('｜')).toContain('证人倒戈会反咬主角')
    expect(brief.plot_dynamics_contract.plot_loop.join('｜')).toContain('被换掉的证人从屏风后走出来')
    expect(brief.plot_dynamics_contract.climax_formula.join('｜')).toContain('假胜')
    expect(brief.plot_dynamics_contract.climax_formula.join('｜')).toContain('崩解')
    expect(brief.plot_dynamics_contract.ab_outline.join('｜')).toContain('场景2')
    expect(brief.plot_dynamics_contract.scene_purpose_map.join('｜')).toContain('击碎假胜并推入绝境')
    expect(brief.plot_dynamics_contract.revision_priorities.join('｜')).toContain('补目标阻碍行动反馈闭环')
  })
  test('adds an oh-story continuity heat contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      longform_memory_capsule: {
        open_questions: [
          { text: '湿漉漉学生到底是谁', age_chapters: 2 },
        ],
        payoff_debts: [
          { text: '旧钥匙需要回收', age_chapters: 4 },
        ],
      },
      reader_expectation_debt_context: {
        must_carry: [
          { text: '门外水声必须继续施压', source_chapter_no: 7 },
        ],
        keep_alive: [
          { text: '宿舍门锁规则不能突然消失' },
        ],
      },
      storyline_context: {
        required: ['追查湿漉漉学生身份'],
        chapter_usage: [
          { type: 'plant', name: '旧钥匙缺口', summary: '旧钥匙和宿舍旧锁有关' },
          { type: 'payoff', name: '水迹名字', summary: '水迹名字指向三年前失踪者' },
        ],
      },
      character_arc_context: {
        relationship_shift: '李超和室友从互相隐瞒变成共同验证规则。',
      },
      chapter_target: {
        chapter_no: 11,
        title: '旧钥匙回声',
        summary: '主角用旧钥匙验证宿舍门锁规则。',
        conflict: '规则要求不能开门，但旧钥匙只对门外锁孔有反应。',
        ending_hook: '旧钥匙插进锁孔后，门内传来另一个李超的声音。',
        scene_cards: [
          {
            scene_no: 1,
            title: '钥匙试锁',
            purpose: '让旧钥匙从冷伏笔升温为当前压力。',
            conflict: '室友阻止主角靠近门。',
            reader_payoff: '确认旧钥匙与门锁规则相关。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '超人的规则怪谈世界' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      confirmedContext,
      null,
      { chapter_no: 11, title: '旧钥匙回声' },
    )

    expect(brief.continuity_heat_contract.version).toBe('oh_story_continuity_heat_v1')
    expect(brief.continuity_heat_contract.heat_states.join('｜')).toContain('hot')
    expect(brief.continuity_heat_contract.heat_states.join('｜')).toContain('warm')
    expect(brief.continuity_heat_contract.heat_states.join('｜')).toContain('cold')
    expect(brief.continuity_heat_contract.heat_states.join('｜')).toContain('archived')
    expect(brief.continuity_heat_contract.watch_items.join('｜')).toContain('湿漉漉学生到底是谁')
    expect(brief.continuity_heat_contract.watch_items.join('｜')).toContain('旧钥匙需要回收')
    expect(brief.continuity_heat_contract.watch_items.join('｜')).toContain('旧钥匙缺口')
    expect(brief.continuity_heat_contract.watch_items.join('｜')).toContain('李超和室友')
    expect(confirmedContext.chapter_target.continuity_heat_contract.watch_items.join('｜')).toContain('门外水声')
    expect(prompt).toContain('【连续性热度合同】')
    expect(prompt).toContain('执行 chapter_target.continuity_heat_contract')
    expect(prompt).toContain('hot/warm/cold/archived')
    expect(prompt).toContain('continuity_heat_checks')
    expect(prompt.indexOf('【连续性热度合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('hydrates incomplete explicit continuity heat contract from memory and expectation context', () => {
    const contextPackage = {
      longform_memory_capsule: {
        open_questions: [
          { text: '湿漉漉学生到底是谁', age_chapters: 2 },
        ],
        payoff_debts: [
          { text: '旧钥匙需要回收', age_chapters: 4 },
        ],
      },
      reader_expectation_debt_context: {
        must_carry: [
          { text: '门外水声必须继续施压', source_chapter_no: 7 },
        ],
        keep_alive: [
          { text: '宿舍门锁规则不能突然消失' },
        ],
      },
      storyline_context: {
        required: ['追查湿漉漉学生身份'],
        forbidden: ['不能让旧钥匙凭空消失'],
        chapter_usage: [
          { type: 'plant', name: '旧钥匙缺口', summary: '旧钥匙和宿舍旧锁有关' },
          { type: 'dormant', name: '镜中脚印', summary: '本章暂不推进镜中脚印' },
        ],
      },
      character_arc_context: {
        relationship_shift: '李超和室友从互相隐瞒变成共同验证规则。',
      },
      chapter_target: {
        chapter_no: 11,
        title: '旧钥匙回声',
        summary: '主角用旧钥匙验证宿舍门锁规则。',
        conflict: '规则要求不能开门，但旧钥匙只对门外锁孔有反应。',
        ending_hook: '旧钥匙插进锁孔后，门内传来另一个李超的声音。',
        continuity_heat_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认 hot/warm/cold 元素都有处理理由。'],
        },
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '规则怪谈长篇' }, contextPackage)

    expect(brief.continuity_heat_contract.source).toBe('manual_incomplete')
    expect(brief.continuity_heat_contract.quality_checks).toEqual(['必须确认 hot/warm/cold 元素都有处理理由。'])
    expect(brief.continuity_heat_contract.heat_states.join('｜')).toContain('hot')
    expect(brief.continuity_heat_contract.active_expectations.join('｜')).toContain('门外水声必须继续施压')
    expect(brief.continuity_heat_contract.active_expectations.join('｜')).toContain('旧钥匙插进锁孔后')
    expect(brief.continuity_heat_contract.watch_items.join('｜')).toContain('湿漉漉学生到底是谁')
    expect(brief.continuity_heat_contract.watch_items.join('｜')).toContain('旧钥匙需要回收')
    expect(brief.continuity_heat_contract.watch_items.join('｜')).toContain('旧钥匙缺口')
    expect(brief.continuity_heat_contract.watch_items.join('｜')).toContain('李超和室友')
    expect(brief.continuity_heat_contract.dormant_allowed.join('｜')).toContain('不能让旧钥匙凭空消失')
    expect(brief.continuity_heat_contract.dormant_allowed.join('｜')).toContain('镜中脚印')
    expect(brief.continuity_heat_contract.revision_priorities.join('｜')).toContain('升温冷伏笔')
  })
  test('adds an oh-story character relation contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      character_arc_context: {
        desire: '李玄要保住试炼资格，不能只是替林青禾完成调查。',
        relationship_shift: '林青禾从旁观者转为愿意公开作证。',
        voice_anchor: '李玄克制短句，林青禾只给事实，执事用命令压人。',
      },
      setting_context: {
        entities: [
          {
            id: 801,
            entity_type: 'relationship_arc',
            name: '李玄与林青禾互信线',
            summary: '从互相试探走向公开作证。',
            payload_json: {
              related_characters: ['李玄', '林青禾'],
              relationship_type: '联盟型',
              test: '林青禾必须冒着被执事记恨的风险作证。',
              attitude_shift: '旁观 -> 试探 -> 公开作证',
            },
          },
          {
            id: 802,
            entity_type: 'relationship_arc',
            name: '李玄与执事压迫线',
            summary: '执事用权威逼李玄交出阵图。',
            payload_json: {
              related_characters: ['李玄', '执事'],
              relationship_type: '权威型',
              test: '李玄必须在不彻底暴露底牌的情况下顶住命令。',
            },
          },
        ],
        chapter_usage: [
          { entity_id: 801, name: '李玄与林青禾互信线', usage_type: 'advance', expected_state_change: { relationship_shift: '林青禾公开作证' } },
          { entity_id: 802, name: '李玄与执事压迫线', usage_type: 'advance', expected_state_change: { pressure: '执事当众命令交出阵图' } },
        ],
      },
      chapter_target: {
        chapter_no: 12,
        title: '试炼前夜',
        summary: '李玄在试炼前夜被执事逼着交出阵图，林青禾必须决定是否作证。',
        conflict: '执事用权威压住所有人，林青禾担心作证会牵连家族。',
        ending_hook: '林青禾刚开口，执事身后的阵盘裂开第二道光。',
        scene_cards: [
          {
            scene_no: 1,
            title: '执事逼供',
            purpose: '制造权威压迫，让李玄主动争取试炼资格。',
            conflict: '执事命令李玄交出阵图。',
            characters_present: ['李玄', '林青禾', '执事'],
            relationship_type: '权威型',
            relationship_test: '李玄顶住命令但不能完全暴露残阵。',
          },
          {
            scene_no: 2,
            title: '公开作证',
            purpose: '让林青禾从旁观转为公开作证。',
            conflict: '作证会让林青禾得罪执事。',
            characters_present: ['李玄', '林青禾'],
            relationship_type: '联盟型',
            relationship_shift: '林青禾从旁观者变成同盟。',
            reader_payoff: '互信线出现第一次可见推进。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '残阵问道' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '残阵问道' },
      confirmedContext,
      null,
      { chapter_no: 12, title: '试炼前夜' },
    )

    expect(brief.character_relation_contract.version).toBe('oh_story_character_relation_v1')
    expect(brief.character_relation_contract.relationship_types.join('｜')).toContain('联盟型')
    expect(brief.character_relation_contract.relationship_types.join('｜')).toContain('权威型')
    expect(brief.character_relation_contract.important_relationships.join('｜')).toContain('李玄与林青禾互信线')
    expect(brief.character_relation_contract.tests_or_pressure.join('｜')).toContain('公开作证')
    expect(brief.character_relation_contract.independent_goals.join('｜')).toContain('保住试炼资格')
    expect(brief.character_relation_contract.goal_ownership_rules.join('｜')).toContain('主角目标必须属于自己的')
    expect(brief.character_relation_contract.goal_ownership_rules.join('｜')).toContain('帮别人实现目标')
    expect(brief.character_relation_contract.relationship_life_rules.join('｜')).toContain('角色生命中有恋爱之外的内容')
    expect(brief.character_relation_contract.relationship_life_rules.join('｜')).toContain('情感工具人')
    expect(brief.character_relation_contract.expectation_hub_rules.join('｜')).toContain('配角期待枢纽')
    expect(brief.character_relation_contract.expectation_hub_rules.join('｜')).toContain('任务基地')
    expect(brief.character_relation_contract.expectation_hub_rules.join('｜')).toContain('短期和长期期待')
    expect(brief.character_relation_contract.expectation_hub_rules.join('｜')).toContain('损失厌恶')
    expect(brief.character_relation_contract.attitude_shifts.join('｜')).toContain('旁观')
    expect(confirmedContext.chapter_target.character_relation_contract.quality_checks.join('｜')).toContain('关系类型明确')
    expect(prompt).toContain('【角色关系合同】')
    expect(prompt).toContain('执行 chapter_target.character_relation_contract')
    expect(prompt).toContain('目标归属')
    expect(prompt).toContain('主角目标必须属于自己的')
    expect(prompt).toContain('角色不止恋爱')
    expect(prompt).toContain('恋爱之外的内容')
    expect(prompt).toContain('配角期待枢纽')
    expect(prompt).toContain('任务基地')
    expect(prompt).toContain('短期和长期期待')
    expect(prompt).toContain('关系类型明确')
    expect(prompt).toContain('character_relation_checks')
    expect(prompt.indexOf('【角色关系合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('hydrates incomplete explicit character relation contract from relation context', () => {
    const contextPackage = {
      character_arc_context: {
        desire: '李玄要保住试炼资格，不能只是替林青禾完成调查。',
        relationship_shift: '林青禾从旁观者转为愿意公开作证。',
      },
      setting_context: {
        entities: [
          {
            id: 801,
            entity_type: 'relationship_arc',
            name: '李玄与林青禾互信线',
            summary: '从互相试探走向公开作证。',
            payload_json: {
              relationship_type: '联盟型',
              test: '林青禾必须冒着被执事记恨的风险作证。',
              attitude_shift: '旁观 -> 试探 -> 公开作证',
            },
          },
        ],
        chapter_usage: [
          { entity_id: 801, name: '李玄与林青禾互信线', usage_type: 'advance', expected_state_change: { relationship_shift: '林青禾公开作证' } },
        ],
      },
      chapter_target: {
        chapter_no: 12,
        title: '试炼前夜',
        summary: '李玄在试炼前夜被执事逼着交出阵图，林青禾必须决定是否作证。',
        conflict: '执事用权威压住所有人，林青禾担心作证会牵连家族。',
        character_relation_contract: {
          version: 'oh_story_character_relation_v1',
          source: 'manual_incomplete',
          quality_checks: ['必须确认关系变化有正文证据。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '公开作证',
            purpose: '让林青禾从旁观转为公开作证。',
            conflict: '作证会让林青禾得罪执事。',
            relationship_type: '联盟型',
            relationship_shift: '林青禾从旁观者变成同盟。',
            reader_payoff: '互信线出现第一次可见推进。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '残阵问道' }, contextPackage)

    expect(brief.character_relation_contract.source).toBe('manual_incomplete')
    expect(brief.character_relation_contract.quality_checks).toEqual(['必须确认关系变化有正文证据。'])
    expect(brief.character_relation_contract.relationship_types.join('｜')).toContain('联盟型')
    expect(brief.character_relation_contract.important_relationships.join('｜')).toContain('李玄与林青禾互信线')
    expect(brief.character_relation_contract.independent_goals.join('｜')).toContain('保住试炼资格')
    expect(brief.character_relation_contract.goal_ownership_rules.join('｜')).toContain('主角目标必须属于自己的')
    expect(brief.character_relation_contract.relationship_life_rules.join('｜')).toContain('角色生命中有恋爱之外的内容')
    expect(brief.character_relation_contract.expectation_hub_rules.join('｜')).toContain('配角期待枢纽')
    expect(brief.character_relation_contract.expectation_hub_rules.join('｜')).toContain('任务基地')
    expect(brief.character_relation_contract.tests_or_pressure.join('｜')).toContain('公开作证')
    expect(brief.character_relation_contract.attitude_shifts.join('｜')).toContain('旁观')
  })
  test('adds an oh-story character behavior contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 9,
        title: '旧夹克的录音',
        summary: '主角看似退让，实际用旧夹克里的录音笔收集执事勒索证据。',
        conflict: '执事逼主角交出维修资格，反派学徒试图让主角当众失态。',
        ending_hook: '录音里传出执事和协会会长的真实交易。',
        character_arc_brief: {
          desire: '保住维修资格并拿回母亲旧铺。',
          flaw_pressure: '遇到权威压迫时习惯先装作退让。',
          growth_beat: '不再只躲在暗处，而是当众按下录音播放键。',
          voice_anchor: '短句反问，动作克制。',
          forbidden_reveal: '不能提前说出他已经录音。',
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '旧夹克',
            purpose: '展示身份标签和表现标签反差。',
            conflict: '执事当众嘲笑主角只敢低头。',
            characters_present: ['李玄', '执事', '林青禾'],
            reader_payoff: '主角表面沉默，实际摸到旧夹克里的录音笔。',
          },
          {
            scene_no: 2,
            title: '当众播放',
            purpose: '用行为亮出内核标签。',
            conflict: '反派学徒抢先指认主角伪造资格。',
            characters_present: ['李玄', '执事', '反派学徒'],
            action_beats: ['李玄没有争辩', '他把旧夹克挂到扩音阵旁', '录音笔开始播放'],
            reversal: '执事的勒索原话被全场听见。',
            reader_payoff: '冷静有计划的内核显形。',
          },
        ],
      },
      story_state: {
        characters: [
          { name: '李玄', role: '落魄维修师', traits: ['嘴毒心软', '看似退让', '冷静有计划'], goal: '拿回母亲旧铺', flaw: '面对权威时习惯藏招' },
          { name: '执事', role: '阶段小反派', traits: ['贪财', '爱用规则压人'], goal: '逼主角交出维修资格' },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 9, title: '旧夹克的录音' },
    )

    expect(brief.character_behavior_contract.version).toBe('oh_story_character_behavior_v1')
    expect(brief.character_behavior_contract.motivation_chain.join('｜')).toContain('起因')
    expect(brief.character_behavior_contract.motivation_chain.join('｜')).toContain('保住维修资格')
    expect(brief.character_behavior_contract.motivation_specificity_rules.join('｜')).toContain('起因必须具体')
    expect(brief.character_behavior_contract.motivation_specificity_rules.join('｜')).toContain('被欺负')
    expect(brief.character_behavior_contract.motivation_specificity_rules.join('｜')).toContain('情感层面')
    expect(brief.character_behavior_contract.motivation_specificity_rules.join('｜')).toContain('要成为最强')
    expect(brief.character_behavior_contract.layered_tags.join('｜')).toContain('身份标签')
    expect(brief.character_behavior_contract.layered_tags.join('｜')).toContain('内核标签')
    expect(brief.character_behavior_contract.behavior_rules.join('｜')).toContain('展示优于告知')
    expect(brief.character_behavior_contract.protagonist_composure_rules.join('｜')).toContain('升级线与主角反应线分开管理')
    expect(brief.character_behavior_contract.protagonist_composure_rules.join('｜')).toContain('低级挑衅')
    expect(brief.character_behavior_contract.protagonist_composure_rules.join('｜')).toContain('轻描淡写')
    expect(brief.character_behavior_contract.strong_association_rules.join('｜')).toContain('每个重要角色至少 3 个强关联设定')
    expect(brief.character_behavior_contract.strong_association_rules.join('｜')).toContain('核心梗装逼爽点')
    expect(brief.character_behavior_contract.strong_association_rules.join('｜')).toContain('弱关联不喧宾夺主')
    expect(brief.character_behavior_contract.memory_anchors.join('｜')).toContain('旧夹克')
    expect((brief.character_behavior_contract.role_card_requirements || []).join('｜')).toContain('角色定位')
    expect((brief.character_behavior_contract.role_card_requirements || []).join('｜')).toContain('身份标签')
    expect((brief.character_behavior_contract.role_card_requirements || []).join('｜')).toContain('外貌特征')
    expect((brief.character_behavior_contract.role_card_requirements || []).join('｜')).toContain('核心目标')
    expect((brief.character_behavior_contract.role_card_requirements || []).join('｜')).toContain('核心动机')
    expect((brief.character_behavior_contract.role_card_requirements || []).join('｜')).toContain('致命弱点')
    expect((brief.character_behavior_contract.role_card_requirements || []).join('｜')).toContain('口头禅/标志动作')
    expect((brief.character_behavior_contract.supporting_role_exit_rules || []).join('｜')).toContain('退场方式')
    expect((brief.character_behavior_contract.supporting_role_exit_rules || []).join('｜')).toContain('同一场景配角不超过 3 个有台词')
    expect((brief.character_behavior_contract.behavior_repeat_rules || []).join('｜')).toContain('行为重复点')
    expect((brief.character_behavior_contract.behavior_repeat_rules || []).join('｜')).toContain('不同场景重复')
    expect((brief.character_behavior_contract.character_driven_event_rules || []).join('｜')).toContain('人推事件')
    expect((brief.character_behavior_contract.character_driven_event_rules || []).join('｜')).toContain('从人物动机找方向')
    expect((brief.character_behavior_contract.character_driven_event_rules || []).join('｜')).toContain('不要硬编剧情')
    expect((brief.character_behavior_contract.protagonist_red_line_rules || []).join('｜')).toContain('圣母')
    expect((brief.character_behavior_contract.protagonist_red_line_rules || []).join('｜')).toContain('无脑战斗机器')
    expect((brief.character_behavior_contract.protagonist_red_line_rules || []).join('｜')).toContain('自暴自弃')
    expect((brief.character_behavior_contract.identity_goldfinger_alignment_rules || []).join('｜')).toContain('社会身份')
    expect((brief.character_behavior_contract.identity_goldfinger_alignment_rules || []).join('｜')).toContain('身世')
    expect((brief.character_behavior_contract.identity_goldfinger_alignment_rules || []).join('｜')).toContain('金手指')
    expect((brief.character_behavior_contract.identity_goldfinger_alignment_rules || []).join('｜')).toContain('性格')
    expect(brief.character_behavior_contract.antagonist_logic.join('｜')).toContain('反派的行为必须有内在逻辑')
    expect(brief.character_behavior_contract.antagonist_weight_rules.join('｜')).toContain('反派建立四要素')
    expect(brief.character_behavior_contract.antagonist_weight_rules.join('｜')).toContain('实力展示')
    expect(brief.character_behavior_contract.antagonist_weight_rules.join('｜')).toContain('动机可信')
    expect(brief.character_behavior_contract.antagonist_weight_rules.join('｜')).toContain('真实威胁')
    expect(brief.character_behavior_contract.antagonist_self_story_rules.join('｜')).toContain('反派也有梦想')
    expect(brief.character_behavior_contract.antagonist_self_story_rules.join('｜')).toContain('自己故事')
    expect(brief.character_behavior_contract.antagonist_self_story_rules.join('｜')).toContain('理念冲突')
    expect(brief.character_behavior_contract.antagonist_tier_exit_rules.join('｜')).toContain('反派层级表')
    expect(brief.character_behavior_contract.antagonist_tier_exit_rules.join('｜')).toContain('小反派')
    expect(brief.character_behavior_contract.antagonist_tier_exit_rules.join('｜')).toContain('中等反派')
    expect(brief.character_behavior_contract.antagonist_tier_exit_rules.join('｜')).toContain('退场')
    expect(confirmedContext.chapter_target.character_behavior_contract.quality_checks.join('｜')).toContain('主角行为三必须')
    expect(prompt).toContain('【角色行为合同】')
    expect(prompt).toContain('执行 chapter_target.character_behavior_contract')
    expect(prompt).toContain('动机链')
    expect(prompt).toContain('动机具体性')
    expect(prompt).toContain('起因必须具体')
    expect(prompt).toContain('情感层面')
    expect(prompt).toContain('三层标签反差')
    expect(prompt).toContain('主角逼格反应')
    expect(prompt).toContain('升级线与主角反应线分开管理')
    expect(prompt).toContain('低级挑衅')
    expect(prompt).toContain('人设强关联')
    expect(prompt).toContain('每个重要角色至少 3 个强关联')
    expect(prompt).toContain('角色卡必备项')
    expect(prompt).toContain('配角退场规划')
    expect(prompt).toContain('行为重复点')
    expect(prompt).toContain('人推事件')
    expect(prompt).toContain('主角红线')
    expect(prompt).toContain('身份/金手指对齐')
    expect(prompt).toContain('反派建立四要素')
    expect(prompt).toContain('反派分量')
    expect(prompt).toContain('反派自我叙事')
    expect(prompt).toContain('反派层级')
    expect(prompt).toContain('character_behavior_checks')
    expect(prompt.indexOf('【角色行为合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('hydrates incomplete explicit character behavior contract from character context', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 9,
        title: '旧夹克的录音',
        summary: '主角看似退让，实际用旧夹克里的录音笔收集执事勒索证据。',
        conflict: '执事逼主角交出维修资格，反派学徒试图让主角当众失态。',
        ending_hook: '录音里传出执事和协会会长的真实交易。',
        character_arc_brief: {
          desire: '保住维修资格并拿回母亲旧铺。',
          flaw_pressure: '遇到权威压迫时习惯先装作退让。',
          growth_beat: '不再只躲在暗处，而是当众按下录音播放键。',
          voice_anchor: '短句反问，动作克制。',
        },
        character_behavior_contract: {
          version: 'oh_story_character_behavior_v1',
          source: 'manual_incomplete',
          quality_checks: ['必须确认角色行为由动机链驱动。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '旧夹克',
            purpose: '展示身份标签和表现标签反差。',
            conflict: '执事当众嘲笑主角只敢低头。',
            characters_present: ['李玄', '执事', '林青禾'],
            reader_payoff: '主角表面沉默，实际摸到旧夹克里的录音笔。',
          },
          {
            scene_no: 2,
            title: '当众播放',
            purpose: '用行为亮出内核标签。',
            conflict: '反派学徒抢先指认主角伪造资格。',
            characters_present: ['李玄', '执事', '反派学徒'],
            action_beats: ['李玄没有争辩', '他把旧夹克挂到扩音阵旁', '录音笔开始播放'],
          },
        ],
      },
      story_state: {
        characters: [
          { name: '李玄', role: '落魄维修师', traits: ['嘴毒心软', '看似退让', '冷静有计划'], goal: '拿回母亲旧铺', flaw: '面对权威时习惯藏招' },
          { name: '执事', role: '阶段小反派', traits: ['贪财', '爱用规则压人'], goal: '逼主角交出维修资格' },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)

    expect(brief.character_behavior_contract.source).toBe('manual_incomplete')
    expect(brief.character_behavior_contract.quality_checks).toEqual(['必须确认角色行为由动机链驱动。'])
    expect(brief.character_behavior_contract.motivation_chain.join('｜')).toContain('保住维修资格')
    expect(brief.character_behavior_contract.motivation_specificity_rules.join('｜')).toContain('起因必须具体')
    expect(brief.character_behavior_contract.motivation_specificity_rules.join('｜')).toContain('动机演变有铺垫')
    expect(brief.character_behavior_contract.layered_tags.join('｜')).toContain('身份标签')
    expect(brief.character_behavior_contract.strong_association_rules.join('｜')).toContain('每个重要角色至少 3 个强关联设定')
    expect(brief.character_behavior_contract.memory_anchors.join('｜')).toContain('旧夹克')
    expect(brief.character_behavior_contract.supporting_role_functions.join('｜')).toContain('执事')
    expect((brief.character_behavior_contract.role_card_requirements || []).join('｜')).toContain('角色定位')
    expect((brief.character_behavior_contract.supporting_role_exit_rules || []).join('｜')).toContain('退场方式')
    expect((brief.character_behavior_contract.behavior_repeat_rules || []).join('｜')).toContain('行为重复点')
    expect((brief.character_behavior_contract.character_driven_event_rules || []).join('｜')).toContain('人推事件')
    expect((brief.character_behavior_contract.protagonist_red_line_rules || []).join('｜')).toContain('圣母')
    expect((brief.character_behavior_contract.identity_goldfinger_alignment_rules || []).join('｜')).toContain('金手指')
    expect(brief.character_behavior_contract.antagonist_logic.join('｜')).toContain('反派的行为必须有内在逻辑')
    expect(brief.character_behavior_contract.antagonist_weight_rules.join('｜')).toContain('反派建立四要素')
    expect(brief.character_behavior_contract.antagonist_weight_rules.join('｜')).toContain('真实威胁')
    expect(brief.character_behavior_contract.antagonist_self_story_rules.join('｜')).toContain('反派也有梦想')
    expect(brief.character_behavior_contract.antagonist_self_story_rules.join('｜')).toContain('理念冲突')
    expect(brief.character_behavior_contract.antagonist_tier_exit_rules.join('｜')).toContain('反派层级表')
    expect(brief.character_behavior_contract.antagonist_tier_exit_rules.join('｜')).toContain('最终 Boss')
  })
  test('adds an oh-story asset linkage contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      setting_context: {
        required: ['旧钥匙', '禁门规则'],
        entities: [
          {
            id: 901,
            entity_type: 'item',
            name: '旧钥匙',
            summary: '母亲旧铺留下的铜钥匙，齿纹能触发禁门规则。',
            constraints: { owner_rule: '只能由李玄持有', location: '旧夹克内袋' },
            state: { location: '旧夹克内袋', meaning: '母亲留下的信物' },
          },
          {
            id: 902,
            entity_type: 'rule',
            name: '禁门规则',
            summary: '午夜后禁门只能被带有旧铺印记的钥匙打开。',
            constraints: { trigger: '钥匙触碰门锁', cost: '暴露旧铺继承权' },
            state: { visibility: '半公开' },
          },
        ],
        chapter_usage: [
          {
            entity_id: 901,
            name: '旧钥匙',
            entity_type: 'item',
            usage_type: 'payoff',
            required: true,
            summary: '用旧钥匙证明主角拥有旧铺继承权。',
            expected_state_change: { meaning: '从信物变成证据' },
            constraints: { owner_rule: '只能由李玄持有' },
            state: { location: '旧夹克内袋' },
          },
          {
            entity_id: 902,
            name: '禁门规则',
            entity_type: 'rule',
            usage_type: 'trigger',
            required: true,
            summary: '触发禁门规则，让门锁当众显出旧铺印记。',
            expected_state_change: { visibility: '从传闻变成公开规则' },
            constraints: { trigger: '钥匙触碰门锁', cost: '暴露旧铺继承权' },
          },
        ],
      },
      chapter_target: {
        chapter_no: 14,
        title: '禁门开锁',
        summary: '李玄用旧钥匙触发禁门规则，证明旧铺继承权。',
        conflict: '执事说旧钥匙只是废铜，逼李玄交出维修资格。',
        ending_hook: '门锁亮出的旧铺印记，正好和协会会长袖口的印记一致。',
        scene_cards: [
          {
            scene_no: 1,
            title: '旧钥匙被嘲笑',
            purpose: '建立旧钥匙的初始意义和被轻视的压力。',
            conflict: '执事嘲笑旧钥匙只是废铜。',
            reader_payoff: '读者知道旧钥匙仍在李玄手里。',
          },
          {
            scene_no: 2,
            title: '禁门亮印',
            purpose: '让旧钥匙触发禁门规则，完成证据反转。',
            conflict: '触发规则会暴露李玄旧铺继承权。',
            action_beats: ['李玄把旧钥匙按进门锁', '禁门亮出旧铺印记', '执事第一次失声'],
            reader_payoff: '旧钥匙从信物变成证据。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const graphPromptService = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = graphPromptService.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 14, title: '禁门开锁' },
    )

    expect(brief.asset_linkage_contract.version).toBe('oh_story_asset_linkage_v1')
    expect(brief.asset_linkage_contract.key_assets.join('｜')).toContain('旧钥匙')
    expect(brief.asset_linkage_contract.key_assets.join('｜')).toContain('禁门规则')
    expect(brief.asset_linkage_contract.linkage_plan.join('｜')).toContain('从信物变成证据')
    expect(brief.asset_linkage_contract.usage_rules.join('｜')).toContain('信息跟着冲突走')
    expect(brief.asset_linkage_contract.three_appearance_plan.join('｜')).toContain('三次出现')
    const propAbilityRules = Array.isArray(brief.asset_linkage_contract.prop_ability_expectation_rules)
      ? brief.asset_linkage_contract.prop_ability_expectation_rules.join('｜')
      : ''
    expect(propAbilityRules).toContain('道具能力展示的8步期待模板')
    expect(propAbilityRules).toContain('鸡肋成神器')
    expect(confirmedContext.chapter_target.asset_linkage_contract.quality_checks.join('｜')).toContain('孤立资产')
    expect(prompt).toContain('【资产挂钩合同】')
    expect(prompt).toContain('执行 chapter_target.asset_linkage_contract')
    expect(prompt).toContain('旧钥匙')
    expect(prompt).toContain('功能、归属、触发条件、限制、后果')
    expect(prompt).toContain('道具能力展示的8步期待模板')
    expect(prompt).toContain('宝物功能强大')
    expect(prompt).toContain('鸡肋成神器')
    expect(prompt).toContain('asset_linkage_checks')
    expect(prompt.indexOf('【资产挂钩合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('carries relationship graph diagnostics into the asset linkage contract', () => {
    const contextPackage = {
      relationship_graph: {
        summary: {
          isolated_key_asset_count: 2,
          missing_owner_count: 1,
          dangling_relation_count: 1,
        },
        diagnostics: [
          {
            type: 'isolated_key_asset',
            severity: 'high',
            entity_id: 901,
            entity_name: '旧钥匙',
            message: '旧钥匙还没有和其他核心资产建立关系',
            evidence: 'relationship_graph',
          },
          {
            type: 'missing_owner',
            severity: 'warning',
            entity_id: 902,
            entity_name: '禁门规则',
            message: '禁门规则缺少拥有者或触发方',
            evidence: 'state_json.owner',
          },
        ],
      },
      setting_context: {
        entities: [
          { id: 901, entity_type: 'item', name: '旧钥匙', summary: '母亲旧铺留下的铜钥匙。' },
          { id: 902, entity_type: 'rule', name: '禁门规则', summary: '午夜后禁门只能被旧铺印记打开。' },
        ],
      },
      chapter_target: {
        chapter_no: 14,
        title: '禁门开锁',
        summary: '李玄用旧钥匙触发禁门规则，证明旧铺继承权。',
        conflict: '执事逼李玄交出维修资格。',
        ending_hook: '门锁亮出的旧铺印记，正好和协会会长袖口的印记一致。',
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const graphPromptService = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = graphPromptService.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 14, title: '禁门开锁' },
    )

    expect(brief.asset_linkage_contract.relationship_graph_risks.join('｜')).toContain('旧钥匙')
    expect(brief.asset_linkage_contract.relationship_graph_risks.join('｜')).toContain('缺少拥有者')
    expect(brief.asset_linkage_contract.quality_checks.join('｜')).toContain('关系图诊断')
    expect(brief.asset_linkage_contract.linkage_plan.join('｜')).toContain('旧钥匙还没有和其他核心资产建立关系')
    expect(prompt).toContain('关系图风险：旧钥匙')
    expect(prompt).toContain('不得让这些资产继续孤立')
    expect(prompt.indexOf('关系图风险：旧钥匙')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('adds an oh-story write preparation brief before prose generation', () => {
    const contextPackage = {
      relationship_graph: {
        diagnostics: [
          {
            type: 'isolated_key_asset',
            entity_name: '旧钥匙',
            message: '旧钥匙还没有和禁门规则建立现场关系',
          },
        ],
      },
      setting_context: {
        entities: [
          { id: 901, entity_type: 'item', name: '旧钥匙', summary: '母亲旧铺留下的铜钥匙。' },
        ],
      },
      chapter_target: {
        chapter_no: 14,
        title: '禁门开锁',
        summary: '李玄用旧钥匙触发禁门规则，证明旧铺继承权。',
        conflict: '执事逼李玄交出维修资格。',
        ending_hook: '门锁亮出的旧铺印记，正好和协会会长袖口的印记一致。',
        target_reader_contract: {
          reader_profile: '喜欢旧城规则破解的男频读者',
          reader_desires: ['旧钥匙规则破解爽点'],
        },
        genre_positioning_contract: {
          genre_tags: ['都市规则维修'],
          selling_points: ['旧城规则破解'],
        },
        core_contract_radar: {
          must_serve: ['旧钥匙必须服务旧城规则破解承诺'],
        },
        reader_retention_brief: {
          opening_hook: '前300字承接禁门规则代价',
        },
        state_tracking_contract: {
          version: 'oh_story_state_tracking_v1',
          source_readiness: [
            { key: 'chapter_blueprint', label: '本章细纲/场景卡', status: 'ready', evidence: '已有章节目标' },
            { key: 'previous_chapter', label: '上一章正文或上一章承接', status: 'missing', evidence: '缺少上一章承接' },
            { key: 'character_state', label: '角色状态', status: 'warn', evidence: '李玄持钥匙状态未确认' },
          ],
          source_requirements: ['本章细纲/场景卡', '上一章正文或上一章承接', '追踪/角色状态.md'],
        },
      },
      delivery_risk_carry_over: {
        label: '待修复 1',
        required_actions: ['补上旧钥匙的现场功能和代价。'],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const graphPromptService = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = graphPromptService.buildParagraphProseContext(
      { title: '旧城维修师' },
      confirmedContext,
      null,
      { chapter_no: 14, title: '禁门开锁' },
    )

    expect(brief.write_preparation_brief.version).toBe('oh_story_write_preparation_v1')
    expect(brief.write_preparation_brief.readiness_status).toBe('needs_context')
    expect(brief.write_preparation_brief.source_gaps.join('｜')).toContain('上一章正文或上一章承接')
    expect(brief.write_preparation_brief.source_gaps.join('｜')).toContain('角色状态')
    expect(brief.write_preparation_brief.asset_risks.join('｜')).toContain('旧钥匙')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('目标读者')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('题材定位')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('特殊题材')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('核心承诺')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('追读留存')
    expect(brief.write_preparation_brief.must_confirm.join('｜')).toContain('补上旧钥匙')
    expect(brief.write_preparation_brief.execution_order.join('｜')).toContain('状态筛选')
    expect(brief.write_preparation_brief.execution_order.join('｜')).toContain('文风召回')
    expect(brief.write_preparation_brief.execution_order.join('｜')).toContain('意图确认')
    expect(brief.write_preparation_brief.execution_order.findIndex((item: string) => item.includes('状态筛选'))).toBeLessThan(
      brief.write_preparation_brief.execution_order.findIndex((item: string) => item.includes('文风召回')),
    )
    expect(brief.write_preparation_brief.execution_order.findIndex((item: string) => item.includes('文风召回'))).toBeLessThan(
      brief.write_preparation_brief.execution_order.findIndex((item: string) => item.includes('意图确认')),
    )
    expect(brief.write_preparation_brief.execution_order.findIndex((item: string) => item.includes('意图确认'))).toBeLessThan(
      brief.write_preparation_brief.execution_order.findIndex((item: string) => item.includes('章节蓝图')),
    )
    expect(confirmedContext.chapter_target.write_preparation_brief.source_gaps.join('｜')).toContain('上一章正文')
    expect(prompt).toContain('【写前准备卡】')
    expect(prompt).toContain('必须先确认来源就绪、资产关系、章节蓝图和读者回报')
    expect(prompt).toContain('上一章正文或上一章承接')
    expect(prompt).toContain('关系图风险')
    expect(prompt).toContain('creation_contract_checklist')
    expect(prompt).toContain('创作契约清单')
    expect(prompt).toContain('旧钥匙规则破解爽点')
    expect(prompt).toContain('pre_draft_execution_receipts')
    expect(prompt).toContain('write_preparation_checks')
    expect(prompt).toContain('写前准备回执')
    expect(prompt.indexOf('【写前准备卡】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('hydrates incomplete explicit asset linkage contract from setting usage', () => {
    const contextPackage = {
      setting_context: {
        required: ['旧钥匙', '禁门规则'],
        entities: [
          {
            id: 901,
            entity_type: 'item',
            name: '旧钥匙',
            summary: '母亲旧铺留下的铜钥匙，齿纹能触发禁门规则。',
            constraints: { owner_rule: '只能由李玄持有', location: '旧夹克内袋' },
            state: { location: '旧夹克内袋', meaning: '母亲留下的信物' },
          },
          {
            id: 902,
            entity_type: 'rule',
            name: '禁门规则',
            summary: '午夜后禁门只能被带有旧铺印记的钥匙打开。',
            constraints: { trigger: '钥匙触碰门锁', cost: '暴露旧铺继承权' },
          },
        ],
        chapter_usage: [
          {
            entity_id: 901,
            name: '旧钥匙',
            entity_type: 'item',
            usage_type: 'payoff',
            required: true,
            summary: '用旧钥匙证明主角拥有旧铺继承权。',
            expected_state_change: { meaning: '从信物变成证据' },
          },
          {
            entity_id: 902,
            name: '禁门规则',
            entity_type: 'rule',
            usage_type: 'trigger',
            required: true,
            summary: '触发禁门规则，让门锁当众显出旧铺印记。',
            expected_state_change: { visibility: '从传闻变成公开规则' },
          },
        ],
      },
      chapter_target: {
        chapter_no: 14,
        title: '禁门开锁',
        summary: '李玄用旧钥匙触发禁门规则，证明旧铺继承权。',
        conflict: '执事说旧钥匙只是废铜，逼李玄交出维修资格。',
        asset_linkage_contract: {
          version: 'oh_story_asset_linkage_v1',
          source: 'manual_incomplete',
          quality_checks: ['必须确认孤立资产已经挂到冲突和回报上。'],
        },
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '旧城维修师' }, contextPackage)

    expect(brief.asset_linkage_contract.source).toBe('manual_incomplete')
    expect(brief.asset_linkage_contract.quality_checks).toEqual(['必须确认孤立资产已经挂到冲突和回报上。'])
    expect(brief.asset_linkage_contract.key_assets.join('｜')).toContain('旧钥匙')
    expect(brief.asset_linkage_contract.key_assets.join('｜')).toContain('禁门规则')
    expect(brief.asset_linkage_contract.linkage_plan.join('｜')).toContain('从信物变成证据')
    expect(brief.asset_linkage_contract.state_tracking.join('｜')).toContain('旧钥匙')
    expect(brief.asset_linkage_contract.three_appearance_plan.join('｜')).toContain('三次出现')
  })
})

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

describe('chapter pre-draft brief core a 2 a', () => {
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
})

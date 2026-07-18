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

describe('readability meme polish b', () => {
  test('adds camelCase first30 retention brief from pre-draft context to prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      {
        preDraftBrief: {
          first30RetentionBrief: {
            segmentLabel: '试读十章',
            flags: ['章末钩子弱'],
            requiredActions: ['前300字给危机', '章末留下门外学生悬念'],
            repairFocus: '补开篇钩子和章末追读',
          },
        },
        chapter_target: {
          id: 3,
          chapter_no: 3,
          title: '门外学生',
          summary: '门外学生带来新的阵法失控线索。',
          conflict: '主角必须判断救人还是守住阵图秘密。',
          ending_hook: '学生袖口露出失传阵纹。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(prompt).toContain('本章前30章留存修复')
    expect(prompt).toContain('前300字给危机')
    expect(prompt).toContain('章末留下门外学生悬念')
  })

  test('adds reader drop risk brief to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      reader_trial_context: {
        status: 'needs_repair',
        score: 66,
        quality_bar: '起点1万均订试读基准',
        drop_points: ['第7章中段解释阵法过密，试读用户可能弃读。', '章末钩子只交代结果，没有未解问题。'],
        pull_points: ['主角用残阵反压执事时有追读爽点。'],
        repair_actions: ['开篇 300 字先给阵图被夺的现场压力。', '中段减少设定解释，用动作验证阵法规则。', '章末留下第二层阵纹的代价问题。'],
      },
      chapter_target: {
        id: 7,
        chapter_no: 7,
        title: '夜闯阵堂',
        summary: '主角夜闯阵堂，试图找回被夺走的阵图。',
        conflict: '守堂执事阻拦，主角必须证明阵图归属。',
        ending_hook: '阵图背面露出第二层阵纹。',
        scene_cards: [
          { title: '阵堂对峙', reader_payoff: '主角用残阵反压守堂执事', conflict: '阵图归属争夺', ending_hook_seed: '第二层阵纹显形' },
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
      { chapter_no: 7, title: '夜闯阵堂' },
    )

    expect(brief.reader_drop_risk_brief.status).toBe('needs_repair')
    expect(brief.reader_drop_risk_brief.quality_bar).toContain('起点1万均订')
    expect(brief.reader_drop_risk_brief.drop_points[0]).toContain('中段解释阵法过密')
    expect(brief.reader_drop_risk_brief.opening_guardrail).toContain('开篇 300 字')
    expect(brief.reader_drop_risk_brief.middle_guardrail).toContain('中段减少设定解释')
    expect(brief.reader_drop_risk_brief.ending_guardrail).toContain('章末留下第二层阵纹')
    expect(context.chapter_target.reader_drop_risk_brief.drop_points[0]).toContain('试读用户可能弃读')
    expect(prompt).toContain('【读者弃读预警】')
    expect(prompt).toContain('开篇 300 字')
    expect(prompt).toContain('中段减少设定解释')
    expect(prompt).toContain('章末留下第二层阵纹')
    expect(prompt).toContain('执行 chapter_target.reader_drop_risk_brief')
  })

  test('injects camelCase pre-draft reader drop risk brief into prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      {
        preDraftBrief: {
          readerDropRiskBrief: {
            status: 'needs_repair',
            qualityBar: '起点1万均订试读基准',
            dropPoints: ['中段解释阵法过密，试读用户可能弃读。'],
            repairActions: ['中段减少设定解释，用动作验证阵法规则。'],
            openingGuardrail: '开篇 300 字先给阵图被夺的现场压力。',
            middleGuardrail: '中段减少设定解释，用动作验证阵法规则。',
            endingGuardrail: '章末留下第二层阵纹的代价问题。',
          },
        },
        chapter_target: {
          id: 7,
          chapter_no: 7,
          title: '夜闯阵堂',
          summary: '主角夜闯阵堂，试图找回被夺走的阵图。',
          conflict: '守堂执事阻拦，主角必须证明阵图归属。',
          ending_hook: '阵图背面露出第二层阵纹。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 7, title: '夜闯阵堂' },
    )
    const dropRiskSection = prompt.slice(
      prompt.indexOf('【读者弃读预警】'),
      prompt.indexOf('【结构化上下文包】'),
    )

    expect(dropRiskSection).toContain('【读者弃读预警】')
    expect(dropRiskSection).toContain('中段解释阵法过密')
    expect(dropRiskSection).toContain('中段减少设定解释')
    expect(dropRiskSection).toContain('章末留下第二层阵纹')
  })

  test('adds golden-three launch guardrail for the first three chapters', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      chapter_target: {
        id: 1,
        chapter_no: 1,
        title: '残阵开局',
        summary: '主角在残阵事故中被迫证明自己没有偷阵图。',
        conflict: '执事当众栽赃，主角必须用残阵反证。',
        ending_hook: '阵图背面显出第二层阵纹。',
        scene_cards: [
          {
            title: '残阵事故',
            reader_payoff: '主角用残阵反证栽赃',
            conflict: '执事栽赃主角偷阵图',
            ending_hook_seed: '第二层阵纹显形',
          },
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
      { chapter_no: 1, title: '残阵开局' },
    )

    expect(brief.golden_three_brief.version).toBe('oh_story_golden_three_v1')
    expect(brief.golden_three_brief.chapter_no).toBe(1)
    expect(brief.golden_three_brief.phase_label).toBe('第一章启动')
    expect(brief.golden_three_brief.opening_requirements.join('｜')).toContain('前 500 字有钩子')
    expect(brief.golden_three_brief.hard_requirements.join('｜')).toContain('主角第一章就出场')
    expect(brief.golden_three_brief.hard_requirements.join('｜')).toContain('第一章有事件')
    expect(brief.golden_three_brief.forbidden_patterns).toContain('大段世界观说明')
    expect(brief.golden_three_brief.payoff_target_count).toBe(2)
    expect(brief.golden_three_brief.current_chapter_payoffs.join('｜')).toContain('主角用残阵反证栽赃')
    expect(context.chapter_target.golden_three_brief.phase_label).toBe('第一章启动')
    expect(prompt).toContain('【黄金三章启动守门】')
    expect(prompt).toContain('执行 chapter_target.golden_three_brief')
    expect(prompt).toContain('前三章至少两个爽点')
    expect(prompt).toContain('不得用大段世界观说明开局')
  })

  test('adds story pressure ladder to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      story_pressure_ladder: {
        status: 'needs_attention',
        score: 64,
        chapterRangeLabel: '第7-12章',
        pressureSources: [
          { label: '执事压迫', count: 4, chapters: [7, 8, 9, 10], riskLevel: 'warn' },
        ],
        signals: [
          { key: 'pressure_source', label: '压力源', status: 'warn', detail: '未来章节压力源过于集中。' },
          { key: 'conflict_escalation', label: '冲突升级', status: 'ok', detail: '未来章节能看到压力加码。' },
          { key: 'stakes_growth', label: '赌注升级', status: 'warn', detail: '未来章节缺少可感知赌注。' },
          { key: 'reversal_pressure', label: '反转逼迫', status: 'warn', detail: '未来章节缺少两难选择。' },
        ],
        nextActions: ['下一批章节要明确压力源、升级赌注和反转逼迫。'],
      },
      chapter_target: {
        id: 7,
        chapter_no: 7,
        title: '夜闯阵堂',
        summary: '主角夜闯阵堂，试图找回被夺走的阵图。',
        conflict: '守堂执事阻拦，主角必须证明阵图归属。',
        ending_hook: '阵图背面露出第二层阵纹。',
        scene_cards: [
          { title: '阵堂对峙', reader_payoff: '主角用残阵反压守堂执事', conflict: '阵图归属争夺', ending_hook_seed: '第二层阵纹显形' },
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
      { chapter_no: 7, title: '夜闯阵堂' },
    )

    expect(brief.story_pressure_brief.status).toBe('needs_attention')
    expect(brief.story_pressure_brief.pressure_sources[0]).toContain('执事压迫')
    expect(brief.story_pressure_brief.weak_signals.map((item: any) => item.key)).toContain('stakes_growth')
    expect(brief.story_pressure_brief.stakes_growth_guardrail).toContain('可感知赌注')
    expect(brief.story_pressure_brief.reversal_pressure_guardrail).toContain('两难选择')
    expect(context.chapter_target.story_pressure_brief.required_actions[0]).toContain('升级赌注')
    expect(prompt).toContain('【故事压力阶梯】')
    expect(prompt).toContain('执行 chapter_target.story_pressure_brief')
    expect(prompt).toContain('执事压迫')
    expect(prompt).toContain('赌注升级')
    expect(prompt).toContain('反转逼迫')
  })

  test('injects camelCase pre-draft story pressure brief into prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      {
        preDraftBrief: {
          storyPressureBrief: {
            status: 'needs_attention',
            pressureSources: ['协会会长当众封锁账册'],
            stakesGrowthGuardrail: '如果失败，主角会失去试炼资格。',
            reversalPressureGuardrail: '必须逼主角在公开证据和保护证人之间二选一。',
            requiredActions: ['至少一个场景写出证人被反制后的新代价。'],
          },
        },
        chapter_target: {
          id: 7,
          chapter_no: 7,
          title: '夜闯阵堂',
          summary: '主角夜闯阵堂，试图找回被夺走的阵图。',
          conflict: '守堂执事阻拦，主角必须证明阵图归属。',
          ending_hook: '阵图背面露出第二层阵纹。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 7, title: '夜闯阵堂' },
    )
    const pressureSection = prompt.slice(
      prompt.indexOf('【故事压力阶梯】'),
      prompt.indexOf('【主角能动性】'),
    )

    expect(pressureSection).toContain('【故事压力阶梯】')
    expect(pressureSection).toContain('协会会长当众封锁账册')
    expect(pressureSection).toContain('失去试炼资格')
    expect(pressureSection).toContain('保护证人')
    expect(pressureSection).toContain('证人被反制后的新代价')
  })

  test('adds protagonist agency story drive to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      chapter_target: {
        id: 12,
        chapter_no: 12,
        title: '试炼资格',
        chapter_goal: '主角拿到试炼资格',
        core_conflict: '执事设局阻拦主角参加试炼',
        protagonist_choice: '主角当众选择用残阵反证阵图归属',
        choice_cost: '暴露阵盘裂纹，招来内门势力注意',
        state_change: '主角从被动挨压转为主动入局',
        ending_hook: '内门长老盯上阵盘裂纹。',
        scene_cards: [
          {
            title: '阵堂对峙',
            conflict: '执事设局阻拦主角参加试炼',
            turning_point: '主角当众选择用残阵反证阵图归属',
            reader_payoff: '主角拿到试炼资格',
            exit_state: '主角从被动挨压转为主动入局',
          },
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
      { chapter_no: 12, title: '试炼资格' },
    )

    expect(brief.story_drive_brief.protagonist_choice).toContain('当众选择')
    expect(brief.story_drive_brief.choice_cost).toContain('暴露阵盘裂纹')
    expect(brief.story_drive_brief.state_change).toContain('主动入局')
    expect(brief.story_drive_brief.obstacle).toContain('执事设局')
    expect(brief.story_drive_brief.causal_next_step).toContain('内门长老')
    expect(context.chapter_target.story_drive_brief.required_actions[0]).toContain('主角主动选择')
    expect(prompt).toContain('【主角能动性】')
    expect(prompt).toContain('执行 chapter_target.story_drive_brief')
    expect(prompt).toContain('主角选择')
    expect(prompt).toContain('选择代价')
    expect(prompt).toContain('状态变化')
  })

  test('adds serial rhythm payoff density to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', synopsis: '废柴阵师靠残阵翻盘。', reference_config: {} }
    const contextPackage = {
      chapter_target: {
        id: 15,
        chapter_no: 15,
        title: '阵堂打脸',
        summary: '主角在阵堂公开拆穿执事偷换阵图。',
        conflict: '执事拖延审查，主角必须当场逼出破绽。',
        ending_hook: '破阵声中，内门长老认出残阵来源。',
        word_target: { label: '标准章', target: 3200, min: 2800, max: 3500 },
        scene_cards: [
          {
            scene_no: 1,
            title: '堂前拦路',
            opening_hook: '执事把假阵图拍在主角脸前。',
            conflict: '执事当众污蔑主角偷阵。',
            reader_payoff: '主角用一句反问逼执事露怯。',
            reversal: '假阵图上的裂纹反而证明执事动过手脚。',
            ending_hook_seed: '众弟子开始怀疑执事。',
            word_budget: '1000 字',
          },
          {
            scene_no: 2,
            title: '残阵反证',
            conflict: '主角必须在阵纹崩毁前复原真图。',
            reader_payoff: '残阵亮起，执事的伪证当场反噬。',
            reversal: '内门长老发现残阵源自禁库。',
            ending_hook_seed: '长老问主角从哪里学来这道阵。',
            word_budget: '1800 字',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T09:00:00.000Z',
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
      { chapter_no: 15, title: '阵堂打脸' },
    )

    expect(brief.serial_rhythm_brief.opening_hook_deadline).toContain('前 300 字')
    expect(brief.serial_rhythm_brief.payoff_interval).toContain('800-1200')
    expect(brief.serial_rhythm_brief.scene_payoff_budget).toHaveLength(2)
    expect(brief.serial_rhythm_brief.scene_payoff_budget[0].required_payoff).toContain('逼执事露怯')
    expect(brief.serial_rhythm_brief.scene_payoff_budget[1].turn).toContain('禁库')
    expect(brief.serial_rhythm_brief.anti_drag_rules.join('；')).toContain('连续')
    expect(context.chapter_target.serial_rhythm_brief.scene_payoff_budget[1].title).toBe('残阵反证')
    expect(prompt).toContain('【连载节奏与回报密度】')
    expect(prompt).toContain('执行 chapter_target.serial_rhythm_brief')
    expect(prompt).toContain('每 800-1200 字')
    expect(prompt).toContain('残阵反证')
    expect(prompt).toContain('伪证当场反噬')
  })

  test('adds page-turn hook execution brief to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      chapter_target: {
        id: 16,
        chapter_no: 16,
        title: '禁库旧阵',
        summary: '主角用残阵反证执事伪造证据。',
        conflict: '执事试图把禁库旧阵嫁祸给主角。',
        ending_hook: '内门长老盯着亮起的残阵，问主角从哪里学来禁库旧阵。',
        story_drive_brief: {
          causal_next_step: '下一章必须追问禁库旧阵来源，并逼主角解释师承。',
        },
        scene_cards: [
          {
            scene_no: 2,
            title: '残阵亮名',
            reader_payoff: '执事伪证被残阵反噬。',
            reversal: '内门长老认出残阵源自禁库。',
            ending_hook_seed: '长老当众问出禁库旧阵来源。',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T10:00:00.000Z',
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
      { chapter_no: 16, title: '禁库旧阵' },
    )

    expect(brief.page_turn_hook_brief.core_question).toContain('禁库旧阵')
    expect(brief.page_turn_hook_brief.visible_trigger).toContain('内门长老认出')
    expect(brief.page_turn_hook_brief.next_chapter_pull).toContain('追问禁库旧阵来源')
    expect(brief.page_turn_hook_brief.forbidden_resolution.join('；')).toContain('不得在本章解释完整答案')
    expect(context.chapter_target.page_turn_hook_brief.final_image).toContain('长老当众问出')
    expect(prompt).toContain('【章末翻页钩子】')
    expect(prompt).toContain('执行 chapter_target.page_turn_hook_brief')
    expect(prompt).toContain('最后 300 字')
    expect(prompt).toContain('内门长老认出残阵源自禁库')
    expect(prompt).toContain('不得在本章解释完整答案')
  })

  test('adds volume climax budget brief to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      volume_beat_budget: {
        status: 'needs_attention',
        score: 62,
        current_volume_title: '第一卷 阵堂起势',
        chapter_range: '第1-60章',
        summary: '当前卷缺中高潮和卷末爆点，本章承担第一次小高潮回报。',
        beats: [
          {
            chapter_no: 18,
            type: '小高潮',
            label: '阵堂公开打脸',
            detail: '主角公开反证执事偷换阵图。',
          },
          {
            chapter_no: 45,
            type: '卷末爆点',
            label: '禁库真相',
            detail: '禁库旧阵牵出主角师承真相。',
          },
        ],
        next_actions: ['本章只兑现阵堂公开打脸，不提前揭穿禁库真相。'],
      },
      chapter_target: {
        id: 18,
        chapter_no: 18,
        title: '阵堂公开打脸',
        summary: '主角在阵堂公开反证执事偷换阵图。',
        conflict: '执事逼主角认罪，主角必须反证阵图来源。',
        ending_hook: '禁库旧阵的第二层纹路亮起。',
        volume_beat_brief: {
          current_chapter_role: '完成第一卷第一次小高潮：阵堂公开打脸。',
          volume_goal: '让主角在阵堂立住起势资格。',
          climax_promise: '公开反证执事偷换阵图，给读者阶段性打脸回报。',
          required_beats: ['执事当众失势', '主角得到试炼资格'],
          forbidden_payoff: ['不得提前揭穿禁库真相', '不得提前解决卷末师承身份'],
        },
        scene_cards: [
          {
            title: '阵堂对证',
            conflict: '执事逼主角认罪。',
            reader_payoff: '主角公开反证执事偷换阵图。',
            reversal: '执事伪证被残阵反噬。',
            ending_hook_seed: '禁库旧阵第二层纹路亮起。',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T11:00:00.000Z',
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
      { chapter_no: 18, title: '阵堂公开打脸' },
    )

    expect(brief.volume_climax_brief.current_chapter_role).toContain('第一次小高潮')
    expect(brief.volume_climax_brief.volume_goal).toContain('起势资格')
    expect(brief.volume_climax_brief.climax_promise).toContain('阶段性打脸回报')
    expect(brief.volume_climax_brief.required_beats).toContain('执事当众失势')
    expect(brief.volume_climax_brief.forbidden_payoff).toContain('不得提前揭穿禁库真相')
    expect(brief.volume_climax_brief.nearby_beats[0].label).toContain('阵堂公开打脸')
    expect(context.chapter_target.volume_climax_brief.forbidden_payoff[1]).toContain('师承身份')
    expect(prompt).toContain('【卷级高潮预算】')
    expect(prompt).toContain('执行 chapter_target.volume_climax_brief')
    expect(prompt).toContain('第一次小高潮')
    expect(prompt).toContain('不得提前揭穿禁库真相')
  })

  test('adds recent fatigue avoidance brief to the pre-draft brief and prose prompt', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      recent_fatigue_radar: {
        status: 'needs_attention',
        score: 61,
        chapter_range_label: '第9-18章',
        summary: '近10章存在 3 类同质化风险：冲突变化、回报变化、钩子变化。',
        signals: [
          { key: 'conflict_variety', label: '冲突变化', status: 'warn', detail: '近10章「执事压迫」出现 7 次，冲突来源变化不足。' },
          { key: 'payoff_variety', label: '回报变化', status: 'warn', detail: '近10章「公开打脸」出现 6 次，回报形态变化不足。' },
          { key: 'hook_variety', label: '钩子变化', status: 'warn', detail: '近10章「试炼将至」出现 6 次，章末问题变化不足。' },
          { key: 'scene_freshness', label: '场面新鲜度', status: 'warn', detail: '近10章缺少稳定的标志性场面记录。' },
        ],
        next_actions: ['下一章要更换压迫来源、回报形态、章末问题或可视化场面，避免十章连续同质化。'],
      },
      chapter_target: {
        id: 19,
        chapter_no: 19,
        title: '旧阵异响',
        summary: '主角发现旧阵异响来自藏书阁而非阵堂。',
        conflict: '旧执事余党仍想用阵堂规矩压人，主角转向藏书阁追查。',
        ending_hook: '藏书阁地砖下传出第二道阵鸣。',
        scene_cards: [
          {
            title: '藏书阁转场',
            conflict: '旧执事余党继续用阵堂规矩压人。',
            reader_payoff: '主角不再重复公开打脸，而是用旧阵异响反向设局。',
            ending_hook_seed: '藏书阁地砖下传出第二道阵鸣。',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T12:00:00.000Z',
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
      { chapter_no: 19, title: '旧阵异响' },
    )

    expect(brief.recent_fatigue_brief.chapter_range_label).toContain('第9-18章')
    expect(brief.recent_fatigue_brief.fatigue_risks.join('；')).toContain('执事压迫')
    expect(brief.recent_fatigue_brief.conflict_variation).toContain('更换压迫来源')
    expect(brief.recent_fatigue_brief.payoff_variation).toContain('更换回报形态')
    expect(brief.recent_fatigue_brief.hook_variation).toContain('更换章末问题')
    expect(brief.recent_fatigue_brief.scene_freshness).toContain('可视化场面')
    expect(context.chapter_target.recent_fatigue_brief.next_actions[0]).toContain('十章连续同质化')
    expect(prompt).toContain('【近章连载动能与疲劳规避】')
    expect(prompt).toContain('执行 chapter_target.recent_fatigue_brief')
    expect(prompt).toContain('逐条执行 next_actions')
    expect(prompt).toContain('执事压迫')
    expect(prompt).toContain('更换压迫来源')
  })

})

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

describe('chapter pre-draft brief sync-core b 1 b', () => {
  test('uses project-level female audience activation mode before keyword auto detection', () => {
    const disabledProject = {
      title: '换亲以后',
      genre: '年代先婚后爱女频',
      target_audience: '番茄女生读者',
      synopsis: '女主换亲后先婚后爱。',
      reference_config: {
        oh_story_controls: {
          female_audience_mode: 'disabled',
        },
      },
    }
    const neutralContext = {
      chapter_target: {
        chapter_no: 1,
        title: '新婚第一日',
        summary: '新婚第一日出现误会。',
      },
    }

    const disabledBrief = buildChapterPreDraftBrief(disabledProject, neutralContext)
    expect(disabledBrief.female_audience_contract).toBeNull()

    const forcedProject = {
      title: '她在废土修灯塔',
      genre: '末世科幻',
      target_audience: '全向读者',
      synopsis: '女主在废土修复灯塔，带领社区重建。',
      reference_config: {
        oh_story_controls: {
          female_audience_mode: 'enabled',
        },
      },
    }

    const forcedBrief = buildChapterPreDraftBrief(forcedProject, neutralContext)
    expect(forcedBrief.female_audience_contract.version).toBe('oh_story_female_audience_v1')
    expect(forcedBrief.female_audience_contract.activation_mode).toBe('enabled')
    expect(forcedBrief.female_audience_contract.activation_source).toContain('project.reference_config.oh_story_controls.female_audience_mode')
  })
  test('adds an oh-story upgrade rhythm contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '从报废维修师开始逆袭',
      genre: '都市系统升级',
      target_platform: 'fanqie',
      synopsis: '中年维修师绑定职业成长系统，通过订单经验、技能奖励和客户反应逐步翻身。',
      reference_config: {
        writing_bible: {
          golden_finger: '职业成长系统会把维修订单转成经验值、技能熟练度和装备奖励',
          protagonist_identity: '被前妻家看不起的中年维修师',
          commercial_positioning: {
            selling_points: ['维修订单升级', '客户态度反转', '系统奖励即时反馈'],
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 1,
        title: '第一单翻身',
        summary: '主角接下被同行放弃的维修单，用新手技能修好进口设备。',
        conflict: '客户和前妻弟弟都质疑主角只是报废维修师。',
        ending_hook: '系统提示等级提升，并解锁隐藏工具箱。',
        scene_cards: [
          {
            scene_no: 1,
            title: '接单前嘲讽',
            purpose: '铺垫升级前待遇差距。',
            conflict: '客户质疑主角没有资格碰进口设备。',
            reader_payoff: '主角被轻视，读者等他翻身。',
          },
          {
            scene_no: 2,
            title: '系统判定',
            purpose: '让订单经验和技能熟练度形成即时反馈。',
            action_beats: ['拆开旧机', '系统提示熟练度+10', '主角发现隐藏磨损点'],
            reader_payoff: '系统面板反馈立刻改变局面。',
          },
          {
            scene_no: 3,
            title: '交付翻身',
            purpose: '展示升级后的能力差距。',
            reversal: '主角修好同行判断报废的进口设备。',
            reader_payoff: '客户主动加价，前妻弟弟说不出话。',
            ending_hook_seed: '系统解锁隐藏工具箱。',
            state_changes_expected: ['客户主动加价', '系统解锁隐藏工具箱'],
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 3, title: '第一单翻身' },
    )

    expect(brief.upgrade_rhythm_contract.version).toBe('oh_story_upgrade_rhythm_v1')
    expect(brief.upgrade_rhythm_contract.upgrade_gap.join('｜')).toContain('起点')
    expect(brief.upgrade_rhythm_contract.upgrade_gain_plan.join('｜')).toContain('客户主动加价')
    expect(brief.upgrade_rhythm_contract.feedback_loop.join('｜')).toContain('即时反馈')
    expect(brief.upgrade_rhythm_contract.feedback_loop.join('｜')).toContain('延迟反馈')
    expect(brief.upgrade_rhythm_contract.emotion_modules.join('｜')).toContain('装逼')
    expect(brief.upgrade_rhythm_contract.goldfinger_simplicity_rules.join('｜')).toContain('金手指简单是核心')
    expect(brief.upgrade_rhythm_contract.goldfinger_simplicity_rules.join('｜')).toContain('一眼就懂')
    expect(brief.upgrade_rhythm_contract.goldfinger_simplicity_rules.join('｜')).toContain('功能、触发条件、奖励反馈和升级规则')
    expect(brief.upgrade_rhythm_contract.goldfinger_multi_dimension_growth_rules.join('｜')).toContain('金手指提升要有多维度')
    expect(brief.upgrade_rhythm_contract.goldfinger_multi_dimension_growth_rules.join('｜')).toContain('词条、功能、品质')
    expect(brief.upgrade_rhythm_contract.goldfinger_multi_dimension_growth_rules.join('｜')).toContain('条件-反馈模型')
    expect(brief.upgrade_rhythm_contract.goldfinger_conflict_balance_rules.join('｜')).toContain('金手指刚好解决当前矛盾')
    expect(brief.upgrade_rhythm_contract.goldfinger_conflict_balance_rules.join('｜')).toContain('暴露更大矛盾')
    expect(brief.upgrade_rhythm_contract.goldfinger_feedback_rules.join('｜')).toContain('给出金手指后必须有即时变化')
    expect(brief.upgrade_rhythm_contract.goldfinger_feedback_rules.join('｜')).toContain('掺杂在故事里')
    expect(brief.upgrade_rhythm_contract.goldfinger_feedback_rules.join('｜')).toContain('打开困境的钥匙')
    expect(brief.upgrade_rhythm_contract.ranking_ladder_rules.join('｜')).toContain('排行榜提供升级动力')
    expect(brief.upgrade_rhythm_contract.ranking_ladder_rules.join('｜')).toContain('新对手')
    expect(brief.upgrade_rhythm_contract.ranking_ladder_rules.join('｜')).toContain('装逼余震')
    expect(confirmedContext.chapter_target.upgrade_rhythm_contract.quality_checks.join('｜')).toContain('升级后能完成以前做不到的事')
    expect(prompt).toContain('【升级节奏合同】')
    expect(prompt).toContain('执行 chapter_target.upgrade_rhythm_contract')
    expect(prompt).toContain('升级感三步法')
    expect(prompt).toContain('金手指 + 矛盾')
    expect(prompt).toContain('金手指简单是核心')
    expect(prompt).toContain('一眼就懂')
    expect(prompt).toContain('金手指多维成长')
    expect(prompt).toContain('词条、功能、品质')
    expect(prompt).toContain('刚好解决当前矛盾')
    expect(prompt).toContain('金手指反馈法')
    expect(prompt).toContain('把金手指带来变化的过程掺杂在故事里')
    expect(prompt).toContain('排行榜')
    expect(prompt).toContain('新对手')
    expect(prompt).toContain('装逼余震')
    expect(prompt).toContain('即时反馈')
    expect(prompt).toContain('upgrade_rhythm_checks')
    expect(prompt.indexOf('【升级节奏合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('hydrates incomplete explicit upgrade rhythm contract from project and scene context', () => {
    const project = {
      title: '从报废维修师开始逆袭',
      genre: '都市系统升级',
      synopsis: '中年维修师绑定职业成长系统，通过订单经验、技能奖励和客户反应逐步翻身。',
      reference_config: {
        writing_bible: {
          golden_finger: '职业成长系统会把维修订单转成经验值、技能熟练度和装备奖励',
          protagonist_identity: '被前妻家看不起的中年维修师',
          commercial_positioning: {
            selling_points: ['维修订单升级', '客户态度反转', '系统奖励即时反馈'],
          },
        },
      },
    }
    const contextPackage = {
      upgrade_rhythm_contract: {
        source: 'manual_incomplete',
        quality_checks: ['必须确认升级前缺口和升级后变化都被正文看见。'],
      },
      chapter_target: {
        chapter_no: 3,
        title: '第一单翻身',
        summary: '主角接下被同行放弃的维修单，用新手技能修好进口设备。',
        conflict: '客户和前妻弟弟都质疑主角只是报废维修师。',
        ending_hook: '系统提示等级提升，并解锁隐藏工具箱。',
        scene_cards: [
          {
            scene_no: 1,
            title: '接单前嘲讽',
            purpose: '铺垫升级前待遇差距。',
            conflict: '客户质疑主角没有资格碰进口设备。',
            reader_payoff: '主角被轻视，读者等他翻身。',
          },
          {
            scene_no: 2,
            title: '系统判定',
            purpose: '让订单经验和技能熟练度形成即时反馈。',
            action_beats: ['拆开旧机', '系统提示熟练度+10', '主角发现隐藏磨损点'],
            reader_payoff: '系统面板反馈立刻改变局面。',
          },
          {
            scene_no: 3,
            title: '交付翻身',
            purpose: '展示升级后的能力差距。',
            reversal: '主角修好同行判断报废的进口设备。',
            reader_payoff: '客户主动加价，前妻弟弟说不出话。',
            ending_hook_seed: '系统解锁隐藏工具箱。',
            state_changes_expected: ['客户主动加价', '系统解锁隐藏工具箱'],
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.upgrade_rhythm_contract.source).toBe('manual_incomplete')
    expect(brief.upgrade_rhythm_contract.quality_checks).toEqual(['必须确认升级前缺口和升级后变化都被正文看见。'])
    expect(brief.upgrade_rhythm_contract.upgrade_gap.join('｜')).toContain('被前妻家看不起')
    expect(brief.upgrade_rhythm_contract.upgrade_gap.join('｜')).toContain('客户质疑主角没有资格')
    expect(brief.upgrade_rhythm_contract.upgrade_gain_plan.join('｜')).toContain('客户主动加价')
    expect(brief.upgrade_rhythm_contract.upgrade_gain_plan.join('｜')).toContain('系统解锁隐藏工具箱')
    expect(brief.upgrade_rhythm_contract.feedback_loop.join('｜')).toContain('系统提示熟练度+10')
    expect(brief.upgrade_rhythm_contract.emotion_modules.join('｜')).toContain('装逼')
    expect(brief.upgrade_rhythm_contract.bridge_rhythm.join('｜')).toContain('四章一桥段')
    expect(brief.upgrade_rhythm_contract.goldfinger_simplicity_rules.join('｜')).toContain('金手指简单是核心')
    expect(brief.upgrade_rhythm_contract.goldfinger_simplicity_rules.join('｜')).toContain('一眼就懂')
    expect(brief.upgrade_rhythm_contract.goldfinger_multi_dimension_growth_rules.join('｜')).toContain('金手指提升要有多维度')
    expect(brief.upgrade_rhythm_contract.goldfinger_multi_dimension_growth_rules.join('｜')).toContain('词条、功能、品质')
    expect(brief.upgrade_rhythm_contract.goldfinger_conflict_balance_rules.join('｜')).toContain('金手指太强')
    expect(brief.upgrade_rhythm_contract.goldfinger_feedback_rules.join('｜')).toContain('给出金手指后必须有即时变化')
  })
  test('hydrates explicit upgrade rhythm goldfinger feedback rules from camel case input', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '从报废维修师开始逆袭',
        genre: '都市系统升级',
        synopsis: '中年维修师绑定职业成长系统，通过订单经验、技能奖励和客户反应逐步翻身。',
      },
      {
        chapter_target: {
          chapter_no: 3,
          title: '第一单翻身',
          summary: '主角接下被同行放弃的维修单，用新手技能修好进口设备。',
          conflict: '客户和前妻弟弟都质疑主角只是报废维修师。',
          upgrade_rhythm_contract: {
            source: 'manual_upgrade',
            goldfingerFeedbackRules: ['自定义：系统反馈必须先改变主角手上的维修动作。'],
          },
        },
      },
    )

    expect(brief.upgrade_rhythm_contract.source).toBe('manual_upgrade')
    expect(brief.upgrade_rhythm_contract.goldfinger_feedback_rules).toEqual(['自定义：系统反馈必须先改变主角手上的维修动作。'])
    expect(brief.upgrade_rhythm_contract.feedback_loop.join('｜')).toContain('即时反馈')
  })
  test('adds an oh-story conflict structure contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '旧城订单',
      genre: '都市系统逆袭',
      synopsis: '中年维修师靠职业成长系统接单翻身，但旧城区维修协会持续打压外来维修师。',
      reference_config: {
        writing_bible: {
          golden_finger: '职业成长系统能识别设备隐藏故障并给出技能反馈',
          protagonist_identity: '被维修协会排挤的外来维修师',
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 4,
        title: '协会封单',
        summary: '维修协会用封单规则阻止主角接触旧城设备，主角必须当场证明封单规则有漏洞。',
        conflict: '协会会长不许主角碰设备，客户也担心惹怒协会。',
        ending_hook: '协会会长拿出第二份封单，指向主角刚接的医院设备。',
        scene_cards: [
          {
            scene_no: 1,
            title: '口头封单',
            purpose: '先用言语压迫制造冲突。',
            conflict: '协会会长当众宣布外来维修师不得接旧城订单。',
            reader_payoff: '主角被公开压制，读者等待反证。',
          },
          {
            scene_no: 2,
            title: '设备现场',
            purpose: '冲突升级到行动阻拦。',
            conflict: '协会成员挡住设备间门口，不让主角拆机。',
            action_beats: ['主角绕到旧线路口', '协会成员抢走工具箱', '客户要求立刻给结果'],
            reader_payoff: '主角必须用别人想不到的方法破局。',
          },
          {
            scene_no: 3,
            title: '当场反证',
            purpose: '决定胜负并留下下一冲突。',
            conflict: '会长要求客户签封单确认书。',
            reversal: '主角用系统识别的隐藏故障证明协会规则掩盖事故。',
            reader_payoff: '客户从犹豫变成公开支持主角。',
            ending_hook_seed: '第二份封单指向医院设备。',
            state_changes_expected: ['客户资格从拒绝到认可', '协会会长失去现场主动权'],
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 4, title: '协会封单' },
    )

    expect(brief.conflict_structure_contract.version).toBe('oh_story_conflict_structure_v1')
    expect(brief.conflict_structure_contract.conflict_ladder.join('｜')).toContain('言语->行动->激烈对抗->决定胜负')
    expect(brief.conflict_structure_contract.motivation_sources.join('｜')).toContain('金手指')
    expect(brief.conflict_structure_contract.antagonist_pressure_rules.join('｜')).toContain('压势不压人')
    expect(brief.conflict_structure_contract.protagonist_agency_rules.join('｜')).toContain('做别人不敢做')
    expect(brief.conflict_structure_contract.event_value_changes.join('｜')).toContain('客户资格从拒绝到认可')
    expect(brief.conflict_structure_contract.no_exit_rules.join('｜')).toContain('读者必须相信主角非踏入不可')
    expect(brief.conflict_structure_contract.no_exit_rules.join('｜')).toContain('黏结剂')
    expect(brief.conflict_structure_contract.conflict_web.active_lines.join('｜')).toContain('协会会长当众宣布外来维修师不得接旧城订单')
    expect(brief.conflict_structure_contract.conflict_web.link_rules.join('｜')).toContain('因果')
    expect(brief.conflict_structure_contract.conflict_web.activation_rules.join('｜')).toContain('激活或加深')
    expect(brief.conflict_structure_contract.conflict_network_layers.vertical_conflict).toContain('纵向矛盾')
    expect(brief.conflict_structure_contract.conflict_network_layers.horizontal_conflict).toContain('横向矛盾')
    expect(brief.conflict_structure_contract.conflict_network_layers.cross_conflict).toContain('交叉矛盾')
    expect(brief.conflict_structure_contract.conflict_network_layers.weaving_order.join('｜')).toContain('定地图→定阵营→定角色')
    expect(confirmedContext.chapter_target.conflict_structure_contract.quality_checks.join('｜')).toContain('明确结果')
    expect(prompt).toContain('【冲突结构合同】')
    expect(prompt).toContain('每个主要场景用场上具体阻力回答')
    expect(prompt).toContain('压势不压人')
    expect(prompt).toContain('有进无出')
    expect(prompt).toContain('非踏入不可')
    expect(prompt).toContain('矛盾网')
    expect(prompt).toContain('纵向矛盾')
    expect(prompt).toContain('横向矛盾')
    expect(prompt).toContain('交叉矛盾')
    expect(prompt).toContain('conflict_structure_checks')
    expect(prompt.indexOf('【冲突结构合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('hydrates incomplete explicit conflict structure contract from scene conflict context', () => {
    const project = {
      title: '旧城订单',
      genre: '都市系统逆袭',
      synopsis: '中年维修师靠职业成长系统接单翻身，但旧城区维修协会持续打压外来维修师。',
      reference_config: {
        writing_bible: {
          golden_finger: '职业成长系统能识别设备隐藏故障并给出技能反馈',
          protagonist_identity: '被维修协会排挤的外来维修师',
        },
      },
    }
    const contextPackage = {
      conflict_structure_contract: {
        source: 'manual_incomplete',
        quality_checks: ['必须确认每个主要场景都有明确阻力和胜负变化。'],
      },
      chapter_target: {
        chapter_no: 4,
        title: '协会封单',
        summary: '维修协会用封单规则阻止主角接触旧城设备，主角必须当场证明封单规则有漏洞。',
        conflict: '协会会长不许主角碰设备，客户也担心惹怒协会。',
        ending_hook: '协会会长拿出第二份封单，指向主角刚接的医院设备。',
        scene_cards: [
          {
            scene_no: 1,
            title: '口头封单',
            purpose: '先用言语压迫制造冲突。',
            conflict: '协会会长当众宣布外来维修师不得接旧城订单。',
            reader_payoff: '主角被公开压制，读者等待反证。',
          },
          {
            scene_no: 2,
            title: '设备现场',
            purpose: '冲突升级到行动阻拦。',
            conflict: '协会成员挡住设备间门口，不让主角拆机。',
            action_beats: ['主角绕到旧线路口', '协会成员抢走工具箱', '客户要求立刻给结果'],
            reader_payoff: '主角必须用别人想不到的方法破局。',
          },
          {
            scene_no: 3,
            title: '当场反证',
            purpose: '决定胜负并留下下一冲突。',
            conflict: '会长要求客户签封单确认书。',
            reversal: '主角用系统识别的隐藏故障证明协会规则掩盖事故。',
            ending_hook_seed: '第二份封单指向医院设备。',
            state_changes_expected: ['客户资格从拒绝到认可', '协会会长失去现场主动权'],
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.conflict_structure_contract.source).toBe('manual_incomplete')
    expect(brief.conflict_structure_contract.quality_checks).toEqual(['必须确认每个主要场景都有明确阻力和胜负变化。'])
    expect(brief.conflict_structure_contract.conflict_ladder.join('｜')).toContain('协会成员挡住设备间门口')
    expect(brief.conflict_structure_contract.motivation_sources.join('｜')).toContain('金手指')
    expect(brief.conflict_structure_contract.motivation_sources.join('｜')).toContain('世界背景')
    expect(brief.conflict_structure_contract.antagonist_pressure_rules.join('｜')).toContain('压势不压人')
    expect(brief.conflict_structure_contract.protagonist_agency_rules.join('｜')).toContain('做别人不敢做')
    expect(brief.conflict_structure_contract.event_value_changes.join('｜')).toContain('客户资格从拒绝到认可')
    expect(brief.conflict_structure_contract.next_conflict_seeds.join('｜')).toContain('第二份封单指向医院设备')
    expect(brief.conflict_structure_contract.no_exit_rules.join('｜')).toContain('读者必须相信主角非踏入不可')
    expect(brief.conflict_structure_contract.conflict_web.active_lines.join('｜')).toContain('协会成员挡住设备间门口')
    expect(brief.conflict_structure_contract.conflict_web.activation_rules.join('｜')).toContain('解决一条矛盾线后')
  })
})

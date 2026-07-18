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

describe('chapter pre-draft brief sync-core b 2', () => {
  test('adds an oh-story story loop contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      synopsis: '超人蛮力被规则限制，必须和理性搭档一起破局。',
      reference_config: {
        writing_bible: {
          golden_finger: '超人级身体能力，但被规则边界限制',
          protagonist_identity: '被卷入规则宿舍的超人学生',
          commercial_positioning: {
            selling_points: ['超人蛮力被规则克制', '每章用信息差破解一条规则'],
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 16,
        title: '第二条规则',
        summary: '主角用上一章的判定边界破解第二条宿舍规则。',
        conflict: '门外学生给出假线索，主角必须判断哪条规则是真的。',
        ending_hook: '广播宣布第三条规则只对超人有效。',
        scene_cards: [
          {
            scene_no: 1,
            title: '假线索',
            purpose: '进入新规则案件。',
            conflict: '门外学生提供的规则和墙上规则矛盾。',
            information_gap: '哪条规则是真的。',
            reader_payoff: '读者看到主角用信息差验证规则。',
          },
          {
            scene_no: 2,
            title: '部分真相',
            purpose: '解出规则判定条件，同时抛出更大谜团。',
            reversal: '真正危险不是开门，而是回应名字。',
            reader_payoff: '部分真相带来新规则谜团。',
            ending_hook_seed: '第三条规则只对超人有效。',
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
      { chapter_no: 16, title: '第二条规则' },
    )

    expect(brief.story_loop_contract.version).toBe('oh_story_story_loop_v1')
    expect(brief.story_loop_contract.loop_formula).toContain('题材 + 金手指 + 主角身份')
    expect(brief.story_loop_contract.core_elements.join('｜')).toContain('规则怪谈')
    expect(brief.story_loop_contract.core_elements.join('｜')).toContain('超人级身体能力')
    expect(brief.story_loop_contract.loop_mode).toContain('案件串循环')
    expect(brief.story_loop_contract.loop_fuel).toContain('信息差')
    expect(brief.story_loop_contract.loop_steps.join('｜')).toContain('案件')
    expect(brief.story_loop_contract.loop_steps.join('｜')).toContain('更大谜团')
    expect(brief.story_loop_contract.map_resource_loop.join('｜')).toContain('资源闭环')
    expect(brief.story_loop_contract.map_transition_rules.join('｜')).toContain('新地图 = 新环境 + 新角色 + 新规则 + 新目标 + 新冲突')
    expect(brief.story_loop_contract.map_transition_rules.join('｜')).toContain('旧地图核心冲突至少阶段性解决')
    expect(brief.story_loop_contract.map_transition_rules.join('｜')).toContain('前5章必须快速建立新的代入感和期待感')
    expect(brief.story_loop_contract.map_transition_rules.join('｜')).toContain('人际关系动了 -> 主角再动')
    expect(brief.story_loop_contract.nested_loop_rules.join('｜')).toContain('小循环 -> 中循环')
    expect(brief.story_loop_contract.nested_loop_rules.join('｜')).toContain('小循环中必须铺垫大循环的期待')
    expect(brief.story_loop_contract.nested_loop_rules.join('｜')).toContain('同一核心卖点的不同角度')
    expect(confirmedContext.chapter_target.story_loop_contract.quality_checks.join('｜')).toContain('循环模式')
    expect(prompt).toContain('【故事循环合同】')
    expect(prompt).toContain('执行 chapter_target.story_loop_contract')
    expect(prompt).toContain('题材 + 金手指 + 主角身份')
    expect(prompt).toContain('换地图承接')
    expect(prompt).toContain('新地图 = 新环境 + 新角色 + 新规则 + 新目标 + 新冲突')
    expect(prompt).toContain('人际关系动了 -> 主角再动')
    expect(prompt).toContain('循环嵌套')
    expect(prompt).toContain('小循环 -> 中循环 -> 大循环')
    expect(prompt).toContain('story_loop_checks')
    expect(prompt.indexOf('【故事循环合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('hydrates incomplete explicit story loop contract from project and scene context', () => {
    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      synopsis: '超人蛮力被规则限制，必须和理性搭档一起破局。',
      reference_config: {
        writing_bible: {
          golden_finger: '超人级身体能力，但被规则边界限制',
          protagonist_identity: '被卷入规则宿舍的超人学生',
          commercial_positioning: {
            selling_points: ['超人蛮力被规则克制', '每章用信息差破解一条规则'],
          },
        },
      },
    }
    const contextPackage = {
      story_loop_contract: {
        source: 'manual_incomplete',
        quality_checks: ['必须确认本章推进一次可持续循环。'],
      },
      chapter_target: {
        chapter_no: 16,
        title: '第二条规则',
        summary: '主角用上一章的判定边界破解第二条宿舍规则。',
        conflict: '门外学生给出假线索，主角必须判断哪条规则是真的。',
        ending_hook: '广播宣布第三条规则只对超人有效。',
        scene_cards: [
          {
            scene_no: 1,
            title: '假线索',
            purpose: '进入新规则案件。',
            conflict: '门外学生提供的规则和墙上规则矛盾。',
            information_gap: '哪条规则是真的。',
            reader_payoff: '读者看到主角用信息差验证规则。',
          },
          {
            scene_no: 2,
            title: '部分真相',
            purpose: '解出规则判定条件，同时抛出更大谜团。',
            reversal: '真正危险不是开门，而是回应名字。',
            reader_payoff: '部分真相带来新规则谜团。',
            ending_hook_seed: '第三条规则只对超人有效。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.story_loop_contract.source).toBe('manual_incomplete')
    expect(brief.story_loop_contract.quality_checks).toEqual(['必须确认本章推进一次可持续循环。'])
    expect(brief.story_loop_contract.core_elements.join('｜')).toContain('规则怪谈')
    expect(brief.story_loop_contract.core_elements.join('｜')).toContain('超人级身体能力')
    expect(brief.story_loop_contract.loop_mode).toContain('案件串循环')
    expect(brief.story_loop_contract.loop_fuel).toContain('信息差')
    expect(brief.story_loop_contract.loop_steps.join('｜')).toContain('哪条规则是真的')
    expect(brief.story_loop_contract.loop_steps.join('｜')).toContain('第三条规则只对超人有效')
    expect(brief.story_loop_contract.map_resource_loop.join('｜')).toContain('资源闭环')
    expect(brief.story_loop_contract.escalation_rules.join('｜')).toContain('地位升高')
    expect(brief.story_loop_contract.nested_loop_rules.join('｜')).toContain('小循环 -> 中循环')
    expect(brief.story_loop_contract.nested_loop_rules.join('｜')).toContain('小循环中必须铺垫大循环的期待')
  })
  test('adds an oh-story emotional arc contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '当众反证',
      genre: '都市逆袭',
      synopsis: '主角被诬告后在公开场合逐步反证，完成打脸翻盘。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 17,
        title: '审判庭反证',
        summary: '主角在公开审判庭从被诬告到拿出证据完成反证。',
        conflict: '对手当众羞辱并逼主角认罪，主角必须忍住压力等待证据。',
        emotional_curve: '压迫 -> 代价加速 -> 反证释放 -> 爽感',
        ending_hook: '真正的幕后证人从屏风后走出。',
        scene_cards: [
          {
            scene_no: 1,
            title: '公开羞辱',
            purpose: '把私下诬告升级到公开审判。',
            conflict: '长老逼主角认罪。',
            emotional_tone: '压迫和不该如此',
            reader_payoff: '读者替主角憋着等反击。',
          },
          {
            scene_no: 2,
            title: '证据反打',
            purpose: '用账本印记完成反证。',
            reversal: '账本反而证明对手调包。',
            emotional_tone: '释放和爽感',
            reader_payoff: '当众打脸，旁观者态度转变。',
            ending_hook_seed: '幕后证人出现。',
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
      { chapter_no: 17, title: '审判庭反证' },
    )

    expect(brief.emotional_arc_contract.version).toBe('oh_story_emotional_arc_v1')
    expect(brief.emotional_arc_contract.emotion_formula).toContain('平静 -> 调动 -> 释放 -> 爽')
    expect(brief.emotional_arc_contract.arc_shape).toContain('递进形')
    expect(brief.emotional_arc_contract.pressure_methods.join('｜')).toContain('公开升级')
    expect(brief.emotional_arc_contract.payoff_types.join('｜')).toContain('态度转变')
    expect(brief.emotional_arc_contract.payoff_reverse_design.design_order.join('｜')).toContain('先确定用什么方式让读者满足')
    expect(brief.emotional_arc_contract.payoff_reverse_design.design_order.join('｜')).toContain('再设计如何拉起期待')
    expect(brief.emotional_arc_contract.payoff_reverse_design.design_order.join('｜')).toContain('最后设计如何铺垫')
    expect(brief.emotional_arc_contract.payoff_tier_rules.join('｜')).toContain('核心爽点')
    expect(brief.emotional_arc_contract.payoff_tier_rules.join('｜')).toContain('偏离爽点')
    expect(brief.emotional_arc_contract.payoff_density_rules.join('｜')).toContain('不要拉长单个爽点')
    expect(brief.emotional_arc_contract.payoff_density_rules.join('｜')).toContain('多想几个爽点')
    expect(brief.emotional_arc_contract.emotion_module_recomposition_rules.join('｜')).toContain('戏剧性会磨损')
    expect(brief.emotional_arc_contract.emotion_module_recomposition_rules.join('｜')).toContain('情绪不会磨损')
    expect(brief.emotional_arc_contract.emotion_module_recomposition_rules.join('｜')).toContain('换场景')
    expect(brief.emotional_arc_contract.emotion_module_recomposition_rules.join('｜')).toContain('换对手')
    expect(brief.emotional_arc_contract.emotion_module_recomposition_rules.join('｜')).toContain('加新情绪')
    expect(brief.emotional_arc_contract.payoff_escalation_rules.join('｜')).toContain('影响范围')
    expect(brief.emotional_arc_contract.payoff_escalation_rules.join('｜')).toContain('揭示深度')
    expect(brief.emotional_arc_contract.payoff_escalation_rules.join('｜')).toContain('身份落差')
    expect(brief.emotional_arc_contract.expectation_rules.join('｜')).toContain('断期待禁止')
    expect(brief.emotional_arc_contract.bonding_setup_rules.join('｜')).toContain('具体物件')
    expect(brief.emotional_arc_contract.bonding_setup_rules.join('｜')).toContain('具体数字')
    expect(brief.emotional_arc_contract.emotional_tear_rules.join('｜')).toContain('反差法')
    expect(brief.emotional_arc_contract.emotional_tear_rules.join('｜')).toContain('错位法')
    expect(brief.emotional_arc_contract.emotional_tear_rules.join('｜')).toContain('延迟真相法')
    expect(brief.emotional_arc_contract.lingering_aftertaste_rules.join('｜')).toContain('安静细节')
    expect(brief.emotional_arc_contract.emotional_turning_rules.join('｜')).toContain('每 3-5 个小节')
    expect(brief.emotional_arc_contract.first_impression_rules.join('｜')).toContain('先入为主')
    expect(brief.emotional_arc_contract.first_impression_rules.join('｜')).toContain('前100字')
    expect(brief.emotional_arc_contract.first_impression_rules.join('｜')).toContain('否定提前')
    expect(brief.emotional_arc_contract.peak_end_rules.join('｜')).toContain('峰终定律')
    expect(brief.emotional_arc_contract.peak_end_rules.join('｜')).toContain('结尾情绪必须高于起点')
    expect(brief.emotional_arc_contract.peak_end_rules.join('｜')).toContain('爽≥7')
    expect(brief.emotional_arc_contract.emotion_layer_rules.join('｜')).toContain('角色自己的情绪')
    expect(brief.emotional_arc_contract.emotion_layer_rules.join('｜')).toContain('文本传递的情绪')
    expect(brief.emotional_arc_contract.emotion_layer_rules.join('｜')).toContain('读者实际感受')
    expect(brief.emotional_arc_contract.emotion_layer_rules.join('｜')).toContain('角色在哭')
    expect(brief.emotional_arc_contract.emotion_layer_rules.join('｜')).toContain('读者在爽')
    expect(brief.emotional_arc_contract.reaction_structure_rules.join('｜')).toContain('前反应')
    expect(brief.emotional_arc_contract.reaction_structure_rules.join('｜')).toContain('复现')
    expect(brief.emotional_arc_contract.reaction_structure_rules.join('｜')).toContain('后反应')
    expect(brief.emotional_arc_contract.reaction_structure_rules.join('｜')).toContain('以小搏大')
    expect(brief.emotional_arc_contract.reaction_structure_rules.join('｜')).toContain('士气如虹')
    expect(brief.emotional_arc_contract.ideological_conflict_rules.join('｜')).toContain('理念之争')
    expect(brief.emotional_arc_contract.ideological_conflict_rules.join('｜')).toContain('利益之争')
    expect(brief.emotional_arc_contract.ideological_conflict_rules.join('｜')).toContain('理念认同')
    expect(brief.emotional_arc_contract.ideological_conflict_rules.join('｜')).toContain('人设认同')
    expect(brief.emotional_arc_contract.ideological_conflict_rules.join('｜')).toContain('追求和牺牲')
    expect(brief.emotional_arc_contract.failure_mode_guards.join('｜')).toContain('假虐')
    expect(brief.emotional_arc_contract.progressive_confrontation_rules.join('｜')).toContain('角力而非碾压')
    expect(brief.emotional_arc_contract.progressive_confrontation_rules.join('｜')).toContain('最后主角王炸')
    expect(brief.emotional_arc_contract.meme_plot_formula_rules.join('｜')).toContain('发生 -> 发展 -> 转折 -> 高潮')
    expect(brief.emotional_arc_contract.reader_desire_formula_rules.join('｜')).toContain('生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿')
    expect(brief.emotional_arc_contract.emotional_rhythm_curve_rules.join('｜')).toContain('温暖 -> 残忍 -> 善意 -> 真相')
    expect(brief.emotional_arc_contract.emotional_rhythm_curve_rules.join('｜')).toContain('不是所有故事都走完整曲线')
    expect(brief.emotional_arc_contract.genre_emotion_strategy_rules.join('｜')).toContain('世情/爽文')
    expect(brief.emotional_arc_contract.genre_emotion_strategy_rules.join('｜')).toContain('情感/虐心')
    expect(brief.emotional_arc_contract.genre_emotion_strategy_rules.join('｜')).toContain('古言/复仇')
    expect(brief.emotional_arc_contract.genre_emotion_strategy_rules.join('｜')).toContain('悬疑/推理')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('调动')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('先入为主')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('峰终定律')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('三层情绪')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('前反应')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('读者欲望四步公式')
    expect(confirmedContext.chapter_target.emotional_arc_contract.quality_checks.join('｜')).toContain('题材情感策略')
    expect(prompt).toContain('【情绪弧合同】')
    expect(prompt).toContain('执行 chapter_target.emotional_arc_contract')
    expect(prompt).toContain('情绪三板斧')
    expect(prompt).toContain('羁绊铺设')
    expect(prompt).toContain('情感撕裂')
    expect(prompt).toContain('余韵钝痛')
    expect(prompt).toContain('每 3-5 个小节')
    expect(prompt).toContain('平静 -> 调动 -> 释放 -> 爽')
    expect(prompt).toContain('爽点倒推法')
    expect(prompt).toContain('先确定用什么方式让读者满足')
    expect(prompt).toContain('装逼层级')
    expect(prompt).toContain('核心爽点')
    expect(prompt).toContain('偏离爽点')
    expect(prompt).toContain('多爽点密度')
    expect(prompt).toContain('不要拉长单个爽点')
    expect(prompt).toContain('情绪模块重组')
    expect(prompt).toContain('戏剧性会磨损')
    expect(prompt).toContain('情绪不会磨损')
    expect(prompt).toContain('换场景')
    expect(prompt).toContain('换对手')
    expect(prompt).toContain('加新情绪')
    expect(prompt).toContain('爽点递增对比')
    expect(prompt).toContain('先入为主')
    expect(prompt).toContain('峰终定律')
    expect(prompt).toContain('结尾情绪强度')
    expect(prompt).toContain('三层情绪')
    expect(prompt).toContain('读者实际感受')
    expect(prompt).toContain('角色在哭')
    expect(prompt).toContain('前反应')
    expect(prompt).toContain('复现')
    expect(prompt).toContain('后反应')
    expect(prompt).toContain('以小搏大')
    expect(prompt).toContain('理念矛盾')
    expect(prompt).toContain('理念之争')
    expect(prompt).toContain('追求和牺牲')
    expect(prompt).toContain('递进对抗')
    expect(prompt).toContain('角力而非碾压')
    expect(prompt).toContain('梗四段式')
    expect(prompt).toContain('发生 -> 发展 -> 转折 -> 高潮')
    expect(prompt).toContain('读者欲望四步公式')
    expect(prompt).toContain('生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿')
    expect(prompt).toContain('情绪拉扯曲线')
    expect(prompt).toContain('温暖 -> 残忍 -> 善意 -> 真相 -> 原谅 -> 来不及 -> 释然 -> 细节暴击')
    expect(prompt).toContain('题材情感策略')
    expect(prompt).toContain('世情/爽文')
    expect(prompt).toContain('情感/虐心')
    expect(prompt).toContain('古言/复仇')
    expect(prompt).toContain('悬疑/推理')
    expect(prompt).toContain('年代/亲情')
    expect(prompt).toContain('emotional_arc_checks')
    expect(prompt.indexOf('【情绪弧合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('hydrates incomplete explicit emotional arc contract from scene emotion context', () => {
    const project = {
      title: '当众反证',
      genre: '都市逆袭',
      synopsis: '主角被诬告后在公开场合逐步反证，完成打脸翻盘。',
    }
    const contextPackage = {
      emotional_arc_contract: {
        source: 'manual_incomplete',
        quality_checks: ['必须确认调动、释放和爽感都有正文证据。'],
      },
      chapter_target: {
        chapter_no: 17,
        title: '审判庭反证',
        summary: '主角在公开审判庭从被诬告到拿出证据完成反证。',
        conflict: '对手当众羞辱并逼主角认罪，主角必须忍住压力等待证据。',
        emotional_curve: '压迫 -> 代价加速 -> 反证释放 -> 爽感',
        ending_hook: '真正的幕后证人从屏风后走出。',
        scene_cards: [
          {
            scene_no: 1,
            title: '公开羞辱',
            purpose: '把私下诬告升级到公开审判。',
            conflict: '长老逼主角认罪。',
            emotional_tone: '压迫和不该如此',
            reader_payoff: '读者替主角憋着等反击。',
          },
          {
            scene_no: 2,
            title: '证据反打',
            purpose: '用账本印记完成反证。',
            reversal: '账本反而证明对手调包。',
            emotional_tone: '释放和爽感',
            reader_payoff: '当众打脸，旁观者态度转变。',
            ending_hook_seed: '幕后证人出现。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.emotional_arc_contract.source).toBe('manual_incomplete')
    expect(brief.emotional_arc_contract.quality_checks).toEqual(['必须确认调动、释放和爽感都有正文证据。'])
    expect(brief.emotional_arc_contract.arc_shape).toContain('递进形')
    expect(brief.emotional_arc_contract.scene_emotion_steps.join('｜')).toContain('压迫和不该如此')
    expect(brief.emotional_arc_contract.scene_emotion_steps.join('｜')).toContain('释放和爽感')
    expect(brief.emotional_arc_contract.pressure_methods.join('｜')).toContain('公开升级')
    expect(brief.emotional_arc_contract.payoff_types.join('｜')).toContain('态度转变')
    expect(brief.emotional_arc_contract.payoff_escalation_rules.join('｜')).toContain('影响范围')
    expect(brief.emotional_arc_contract.expectation_rules.join('｜')).toContain('断期待禁止')
    expect(brief.emotional_arc_contract.safety_rules.join('｜')).toContain('下行情节')
    expect(brief.emotional_arc_contract.bonding_setup_rules.join('｜')).toContain('具体物件')
    expect(brief.emotional_arc_contract.emotional_tear_rules.join('｜')).toContain('延迟真相法')
    expect(brief.emotional_arc_contract.lingering_aftertaste_rules.join('｜')).toContain('安静细节')
    expect(brief.emotional_arc_contract.first_impression_rules.join('｜')).toContain('先入为主')
    expect(brief.emotional_arc_contract.peak_end_rules.join('｜')).toContain('峰终定律')
    expect(brief.emotional_arc_contract.emotion_layer_rules.join('｜')).toContain('读者实际感受')
    expect(brief.emotional_arc_contract.reaction_structure_rules.join('｜')).toContain('前反应')
    expect(brief.emotional_arc_contract.ideological_conflict_rules.join('｜')).toContain('理念之争')
  })
  test('preserves explicit camelCase emotional arc first-impression peak-end emotion-layer and ideology rules', () => {
    const project = {
      title: '当众反证',
      genre: '都市逆袭',
      synopsis: '主角被诬告后在公开场合逐步反证，完成打脸翻盘。',
    }
    const contextPackage = {
      emotionalArcContract: {
        source: 'manual_complete',
        firstImpressionRules: ['自定义先入为主：前100字先给核心矛盾。'],
        peakEndRules: ['自定义峰终定律：结尾情绪必须高于起点。'],
        emotionLayerRules: ['自定义三层情绪：角色情绪屈辱，文本传递隐忍，读者实际感受爽前蓄力。'],
        reactionStructureRules: ['自定义前反应-复现-后反应：先预知坏结果，再复现冲击，最后让主角振作。'],
        ideologicalConflictRules: ['自定义理念矛盾：把公平和权威的冲突写成主角与对手的原则碰撞。'],
      },
      chapter_target: {
        chapter_no: 17,
        title: '审判庭反证',
        summary: '主角在公开审判庭从被诬告到拿出证据完成反证。',
        conflict: '对手当众羞辱并逼主角认罪。',
        emotional_curve: '压迫 -> 反证释放 -> 爽感',
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.emotional_arc_contract.source).toBe('manual_complete')
    expect(brief.emotional_arc_contract.first_impression_rules).toEqual(['自定义先入为主：前100字先给核心矛盾。'])
    expect(brief.emotional_arc_contract.peak_end_rules).toEqual(['自定义峰终定律：结尾情绪必须高于起点。'])
    expect(brief.emotional_arc_contract.emotion_layer_rules).toEqual(['自定义三层情绪：角色情绪屈辱，文本传递隐忍，读者实际感受爽前蓄力。'])
    expect(brief.emotional_arc_contract.reaction_structure_rules).toEqual(['自定义前反应-复现-后反应：先预知坏结果，再复现冲击，最后让主角振作。'])
    expect(brief.emotional_arc_contract.ideological_conflict_rules).toEqual(['自定义理念矛盾：把公平和权威的冲突写成主角与对手的原则碰撞。'])
  })
  test('asks prose self review to enforce oh-story emotional three-blade methods', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )

    expect(reviewPrompt).toContain('情绪三板斧')
    expect(reviewPrompt).toContain('羁绊铺设')
    expect(reviewPrompt).toContain('具体物件')
    expect(reviewPrompt).toContain('具体数字')
    expect(reviewPrompt).toContain('重复动作')
    expect(reviewPrompt).toContain('情感撕裂')
    expect(reviewPrompt).toContain('反差法')
    expect(reviewPrompt).toContain('错位法')
    expect(reviewPrompt).toContain('延迟真相法')
    expect(reviewPrompt).toContain('余韵钝痛')
    expect(reviewPrompt).toContain('安静细节')
    expect(reviewPrompt).toContain('每 3-5 个小节')
    expect(reviewPrompt).toContain('太平/太赶/假虐/割裂/烂尾/人设崩')
    expect(reviewPrompt).toContain('emotional_arc_checks')
  })
  test('adds an oh-story chapter hook contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      synopsis: '超人蛮力被规则限制，必须用信息差破解宿舍规则。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 2,
        title: '第二条规则',
        summary: '主角用倒计时压迫进入第二条规则。',
        conflict: '十点前必须判断门外学生是否是诱饵。',
        ending_hook: '广播宣布第三条规则只对超人有效。',
        scene_cards: [
          {
            scene_no: 1,
            title: '十点倒计时',
            purpose: '开篇建立紧迫感。',
            conflict: '钟声只剩三分钟。',
            opening_hook: '距离宿舍熄灯还有三分钟。',
            information_gap: '门外学生到底是不是违规者。',
          },
          {
            scene_no: 2,
            title: '广播揭示',
            purpose: '章尾抛出改变规则的新信息。',
            reader_payoff: '主角验证第二条规则边界。',
            ending_hook_seed: '第三条规则只对超人有效。',
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
      { chapter_no: 2, title: '第二条规则' },
    )

    expect(brief.chapter_hook_contract.version).toBe('oh_story_chapter_hook_v1')
    expect(brief.chapter_hook_contract.opening_hook_type).toContain('倒计时开局')
    expect(brief.chapter_hook_contract.ending_hook_type).toContain('突然揭示')
    expect(brief.chapter_hook_contract.hook_strength).toContain('强')
    expect(brief.chapter_hook_contract.opening_hook_rules.join('｜')).toContain('章首 7 式')
    expect(brief.chapter_hook_contract.ending_hook_rules.join('｜')).toContain('章尾 13 式')
    expect(brief.chapter_hook_contract.forbidden_patterns.join('｜')).toContain('假悬念')
    expect(confirmedContext.chapter_target.chapter_hook_contract.quality_checks.join('｜')).toContain('前 100 字')
    expect(prompt).toContain('【章级钩子合同】')
    expect(prompt).toContain('执行 chapter_target.chapter_hook_contract')
    expect(prompt).toContain('章首 7 式')
    expect(prompt).toContain('章尾 13 式')
    expect(prompt).toContain('chapter_hook_checks')
    expect(prompt.indexOf('【章级钩子合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('hydrates incomplete explicit chapter hook contract from scene hooks', () => {
    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      synopsis: '超人蛮力被规则限制，必须用信息差破解宿舍规则。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 2,
        title: '第二条规则',
        summary: '主角用倒计时压迫进入第二条规则。',
        conflict: '十点前必须判断门外学生是否是诱饵。',
        ending_hook: '广播宣布第三条规则只对超人有效。',
        chapter_hook_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认章首和章尾钩子都由现场触发。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '十点倒计时',
            purpose: '开篇建立紧迫感。',
            conflict: '钟声只剩三分钟。',
            opening_hook: '距离宿舍熄灯还有三分钟。',
          },
          {
            scene_no: 2,
            title: '广播揭示',
            purpose: '章尾抛出改变规则的新信息。',
            reader_payoff: '主角验证第二条规则边界。',
            ending_hook_seed: '第三条规则只对超人有效。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.chapter_hook_contract.source).toBe('manual_incomplete')
    expect(brief.chapter_hook_contract.quality_checks).toEqual(['必须确认章首和章尾钩子都由现场触发。'])
    expect(brief.chapter_hook_contract.opening_hook_type).toContain('倒计时开局')
    expect(brief.chapter_hook_contract.ending_hook_type).toContain('突然揭示')
    expect(brief.chapter_hook_contract.hook_strength).toContain('强')
    expect(brief.chapter_hook_contract.opening_hook_rules.join('｜')).toContain('章首 7 式')
    expect(brief.chapter_hook_contract.ending_hook_rules.join('｜')).toContain('章尾 13 式')
    expect(brief.chapter_hook_contract.forbidden_patterns.join('｜')).toContain('假悬念')
  })
  test('adds an oh-story paragraph hook contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '当众反证',
      genre: '都市逆袭',
      synopsis: '主角在公开审判庭藏住证据，等对手得意后完成反打。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '账本反打',
        summary: '主角用暗牌等对手得意，再拿出账本完成打脸。',
        conflict: '对手当众逼主角认罪，旁观者都以为主角无证可辩。',
        ending_hook: '第二个证人从屏风后走出。',
        scene_cards: [
          {
            scene_no: 1,
            title: '审判庭压迫',
            purpose: '让读者知道主角藏着账本暗牌。',
            conflict: '对手要求立刻认罪。',
            information_gap: '主角是否还有证据。',
            emotional_tone: '压迫',
          },
          {
            scene_no: 2,
            title: '暗牌打脸',
            purpose: '主角拿出账本，围观者分层震惊。',
            reversal: '账本证明对手调包。',
            reader_payoff: '暗牌 + 打脸，审判庭态度转变。',
            characters_present: ['江辰', '周薄森', '长老', '旁观弟子'],
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
      { chapter_no: 18, title: '账本反打' },
    )

    expect(brief.paragraph_hook_contract.version).toBe('oh_story_paragraph_hook_v1')
    expect(brief.paragraph_hook_contract.micro_hook_types.join('｜')).toContain('暗牌')
    expect(brief.paragraph_hook_contract.micro_hook_types.join('｜')).toContain('打脸')
    expect(brief.paragraph_hook_contract.hook_combinations.join('｜')).toContain('暗牌 + 打脸')
    expect(brief.paragraph_hook_contract.dialogue_escalation.join('｜')).toContain('对话情绪五级递增')
    expect(brief.paragraph_hook_contract.spectator_layers.join('｜')).toContain('高质量')
    expect(confirmedContext.chapter_target.paragraph_hook_contract.quality_checks.join('｜')).toContain('段落级钩子')
    expect(prompt).toContain('【段落级钩子合同】')
    expect(prompt).toContain('执行 chapter_target.paragraph_hook_contract')
    expect(prompt).toContain('段落级钩子 11 种')
    expect(prompt).toContain('围观者质量层级')
    expect(prompt).toContain('paragraph_hook_checks')
    expect(prompt.indexOf('【段落级钩子合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('hydrates incomplete explicit paragraph hook contract from scene hook context', () => {
    const project = {
      title: '当众反证',
      genre: '都市逆袭',
      synopsis: '主角在公开审判庭藏住证据，等对手得意后完成反打。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '账本反打',
        summary: '主角用暗牌等对手得意，再拿出账本完成打脸。',
        conflict: '对手当众逼主角认罪，旁观者都以为主角无证可辩。',
        ending_hook: '第二个证人从屏风后走出。',
        paragraph_hook_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认关键段落有信息、风险或关系变化。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '审判庭压迫',
            purpose: '让读者知道主角藏着账本暗牌。',
            conflict: '对手要求立刻认罪。',
            information_gap: '主角是否还有证据。',
          },
          {
            scene_no: 2,
            title: '暗牌打脸',
            purpose: '主角拿出账本，围观者分层震惊。',
            reversal: '账本证明对手调包。',
            reader_payoff: '暗牌 + 打脸，审判庭态度转变。',
            characters_present: ['江辰', '周薄森', '长老', '旁观弟子'],
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.paragraph_hook_contract.source).toBe('manual_incomplete')
    expect(brief.paragraph_hook_contract.quality_checks).toEqual(['必须确认关键段落有信息、风险或关系变化。'])
    expect(brief.paragraph_hook_contract.micro_hook_types.join('｜')).toContain('暗牌')
    expect(brief.paragraph_hook_contract.micro_hook_types.join('｜')).toContain('打脸')
    expect(brief.paragraph_hook_contract.micro_hook_types).not.toContain('代价')
    expect(brief.paragraph_hook_contract.micro_hook_types).not.toContain('冷发现')
    expect(brief.paragraph_hook_contract.hook_combinations.join('｜')).toContain('暗牌 + 打脸')
    expect(brief.paragraph_hook_contract.dialogue_escalation.join('｜')).toContain('对话情绪五级递增')
    expect(brief.paragraph_hook_contract.spectator_layers.join('｜')).toContain('高质量')
  })
  test('adds an oh-story suspense orchestration contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '午夜规则簿',
      genre: '规则怪谈',
      synopsis: '主角在倒计时里发现规则簿缺页，读者知道钟声逼近但角色还不知道真相。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 7,
        title: '缺页钟声',
        summary: '主角提出规则簿缺页疑问，追查时收到真假提示，章末发现缺页对应今晚零点。',
        conflict: '宿舍成员争论是否立刻公开缺页，广播倒计时不断逼近。',
        ending_hook: '零点钟声响起，缺页背面浮出第二行字。',
        scene_cards: [
          {
            scene_no: 1,
            title: '缺页',
            purpose: '提出规则簿缺页疑问。',
            information_gap: '缺页到底藏着什么规则。',
            opening_hook: '规则簿第七页被撕掉。',
          },
          {
            scene_no: 2,
            title: '假提示',
            purpose: '让角色以为缺页只是旧规则。',
            reversal: '广播倒计时证明这是假提示。',
            reader_payoff: '读者知道零点前必须找到答案。',
          },
          {
            scene_no: 3,
            title: '零点',
            purpose: '公布答案同时开启下一层期待。',
            ending_hook_seed: '缺页背面浮出第二行字。',
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
      { chapter_no: 7, title: '缺页钟声' },
    )

    expect(brief.suspense_contract.version).toBe('oh_story_suspense_v1')
    expect(brief.suspense_contract.information_order_templates.join('｜')).toContain('意外剧情')
    expect(brief.suspense_contract.suspense_strength).toContain('中悬念')
    expect(brief.suspense_contract.expectation_layers.join('｜')).toContain('两长一短')
    expect(brief.suspense_contract.multi_line_suspense_rules.join('｜')).toContain('任何时刻至少两条悬念线运行')
    expect(brief.suspense_contract.reader_preknowledge_rules.join('｜')).toContain('读者知道但主角不知道')
    expect(brief.suspense_contract.information_gap_rules.join('｜')).toContain('读者知道')
    expect(brief.suspense_contract.trump_card_preposition_rules.join('｜')).toContain('底牌 + 即将发生的冲突')
    expect(brief.suspense_contract.foreshadowing_boundary_rules.join('｜')).toContain('谜语人是故意不说明')
    expect(brief.suspense_contract.foreshadowing_boundary_rules.join('｜')).toContain('信息延迟超过3章')
    expect(brief.suspense_contract.shock_layers.join('｜')).toContain('深度震惊')
    expect(confirmedContext.chapter_target.suspense_contract.quality_checks.join('｜')).toContain('悬念等级')
    expect(prompt).toContain('【悬念编排合同】')
    expect(prompt).toContain('执行 chapter_target.suspense_contract')
    expect(prompt).toContain('四种悬念信息顺序模板')
    expect(prompt).toContain('悬念强度5级')
    expect(prompt).toContain('读者预知法')
    expect(prompt).toContain('底牌前置法')
    expect(prompt).toContain('多线悬念')
    expect(prompt).toContain('伏笔不是谜语人')
    expect(prompt).toContain('信息延迟超过3章')
    expect(prompt).toContain('suspense_checks')
    expect(prompt.indexOf('【悬念编排合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })
  test('hydrates incomplete explicit suspense contract from scene suspense context', () => {
    const project = {
      title: '午夜规则簿',
      genre: '规则怪谈',
      synopsis: '主角在倒计时里发现规则簿缺页，读者知道钟声逼近但角色还不知道真相。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 7,
        title: '缺页钟声',
        summary: '主角提出规则簿缺页疑问，追查时收到真假提示，章末发现缺页对应今晚零点。',
        conflict: '宿舍成员争论是否立刻公开缺页，广播倒计时不断逼近。',
        ending_hook: '零点钟声响起，缺页背面浮出第二行字。',
        suspense_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认疑问、误导、答案和新期待都有正文证据。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '缺页',
            purpose: '提出规则簿缺页疑问。',
            information_gap: '缺页到底藏着什么规则。',
            opening_hook: '规则簿第七页被撕掉。',
          },
          {
            scene_no: 2,
            title: '假提示',
            purpose: '让角色以为缺页只是旧规则。',
            reversal: '广播倒计时证明这是假提示。',
            reader_payoff: '读者知道零点前必须找到答案。',
          },
          {
            scene_no: 3,
            title: '零点',
            purpose: '公布答案同时开启下一层期待。',
            ending_hook_seed: '缺页背面浮出第二行字。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.suspense_contract.source).toBe('manual_incomplete')
    expect(brief.suspense_contract.quality_checks).toEqual(['必须确认疑问、误导、答案和新期待都有正文证据。'])
    expect(brief.suspense_contract.information_order_templates.join('｜')).toContain('意外剧情')
    expect(brief.suspense_contract.suspense_strength).toContain('中悬念')
    expect(brief.suspense_contract.suspense_cycle.join('｜')).toContain('缺页到底藏着什么规则')
    expect(brief.suspense_contract.suspense_cycle.join('｜')).toContain('假提示')
    expect(brief.suspense_contract.suspense_cycle.join('｜')).toContain('第二行字')
    expect(brief.suspense_contract.expectation_layers.join('｜')).toContain('两长一短')
    expect(brief.suspense_contract.multi_line_suspense_rules.join('｜')).toContain('短弧2-3章')
    expect(brief.suspense_contract.reader_preknowledge_rules.join('｜')).toContain('读者知道但主角不知道')
    expect(brief.suspense_contract.information_gap_rules.join('｜')).toContain('信息差抹平时')
    expect(brief.suspense_contract.trump_card_preposition_rules.join('｜')).toContain('先展示主角底牌')
    expect(brief.suspense_contract.shock_layers.join('｜')).toContain('深度震惊')
  })
  test('preserves explicit suspense information-gap rules from camelCase contract', () => {
    const project = {
      title: '午夜规则簿',
      genre: '规则怪谈',
      synopsis: '读者提前知道广播倒计时，主角还不知道缺页和钟声有关。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 8,
        title: '钟声前夜',
        summary: '主角追查广播倒计时。',
        conflict: '学生会要求立刻交出规则簿。',
        ending_hook: '旧钟背面出现下一次倒计时。',
        suspenseContract: {
          source: 'manual_camel_case',
          informationGapRules: ['读者知道旧钟是底牌，但学生会不知道。'],
          readerPreknowledgeRules: ['读者知道但主角不知道：零点会锁门。'],
          trumpCardPrepositionRules: ['底牌 + 即将发生的冲突：先展示旧钟裂纹，再安排学生会逼交规则簿。'],
          multiLineSuspenseRules: ['短弧2-3章，中弧5-8章，任何时刻至少两条悬念线运行。'],
        },
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.suspense_contract.source).toBe('manual_camel_case')
    expect(brief.suspense_contract.information_gap_rules).toEqual(['读者知道旧钟是底牌，但学生会不知道。'])
    expect(brief.suspense_contract.reader_preknowledge_rules).toEqual(['读者知道但主角不知道：零点会锁门。'])
    expect(brief.suspense_contract.trump_card_preposition_rules).toEqual(['底牌 + 即将发生的冲突：先展示旧钟裂纹，再安排学生会逼交规则簿。'])
    expect(brief.suspense_contract.multi_line_suspense_rules).toEqual(['短弧2-3章，中弧5-8章，任何时刻至少两条悬念线运行。'])
    expect(brief.suspense_contract.quality_checks.join('｜')).toContain('读者预知法')
  })
})

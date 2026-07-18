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

describe('prose word target expansion', () => {
  test('injects camelCase safe batchPreflight into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        batchPreflight: {
          source: 'runtime_safe_batch_preflight',
          chapterHandoffContract: {
            source: 'runtime_safe_batch_handoff',
            fromChapterNo: 7,
            applyToChapterNo: 8,
            previousHandoff: '第7章最后一幕：禁库门牌背面响起旧广播室的铃声。',
            openingObligations: ['开篇前300字必须接住禁库门牌和旧广播室铃声。'],
            mustDeliver: ['确认旧广播室铃声不是普通设备，而是规则召唤。'],
          },
        },
        chapter_target: {
          chapter_no: 8,
          title: '旧广播室',
          summary: '验证旧广播室铃声。',
          conflict: '是否相信门牌背面的铃声。',
          ending_hook: '铃声倒放。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '旧广播室' },
    )

    expect(prompt).toContain('【安全连写预执行门禁】')
    expect(prompt).toContain('runtime_safe_batch_preflight')
    expect(prompt).toContain('【安全连写章节交接契约】')
    expect(prompt).toContain('禁库门牌背面响起旧广播室的铃声')
    expect(prompt).toContain('确认旧广播室铃声不是普通设备')
  })

  test('injects camelCase chapterTarget safe preflight and memory anchors into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapterTarget: {
          chapterNo: 8,
          title: '旧广播室',
          summary: '验证旧广播室铃声。',
          conflict: '是否相信门牌背面的铃声。',
          endingHook: '铃声倒放。',
          sceneCards: [],
          batchPreflight: {
            source: 'runtime_chapter_target_safe_batch',
            longformMemoryAnchor: {
              corePromise: '李超用超人蛮力碰撞规则怪谈，张智负责拆解规则。',
              openQuestions: ['旧广播室铃声是谁发出的'],
              payoffDebts: ['规则边界反制蛮力'],
            },
            chapterHandoffContract: {
              previousHandoff: '第7章最后一幕：禁库门牌背面响起旧广播室的铃声。',
              openingObligations: ['开篇前300字必须接住禁库门牌和旧广播室铃声。'],
              mustDeliver: ['确认旧广播室铃声不是普通设备，而是规则召唤。'],
            },
          },
        },
      },
      null,
      { chapter_no: 8, title: '旧广播室' },
    )

    expect(prompt).toContain('【安全连写预执行门禁】')
    expect(prompt).toContain('runtime_chapter_target_safe_batch')
    expect(prompt).toContain('【安全连写章节交接契约】')
    expect(prompt).toContain('禁库门牌背面响起旧广播室的铃声')
    expect(prompt).toContain('【长篇正史锚点】')
    expect(prompt).toContain('李超用超人蛮力碰撞规则怪谈')
    expect(prompt).toContain('旧广播室铃声是谁发出的')
  })

  test('injects safe batch expansion structure verification into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第18-20章',
          batch_goal: '验证修后的中段扩批结构。',
          expansion_structure_verification: {
            source: 'safe_batch_expansion_structure_repair',
            label: '扩批结构验证',
            repeated_hotspot_segment: { key: 'middle', label: '中段', count: 2 },
            validation_chapter_nos: [18, 19, 20],
            fixed_segment_role: '中段固定职责：每批第3-4章必须完成主线转折、显性回报和章末追读。',
            conflict_rotation: '未来验证批次每章必须更换冲突来源。',
            explicit_payoff: '每章至少一个显性回报，不能只铺垫。',
            ending_hook_requirement: '每章章末必须留下不同的追读问题。',
            structure_actions: ['前段抛压，中段兑现并升级，后段留钩。'],
          },
        },
        chapter_target: {
          chapter_no: 18,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 18, title: '外门夜钟' },
    )

    expect(prompt).toContain('【扩批结构验证】')
    expect(prompt).toContain('执行 next_batch_brief.expansion_structure_verification')
    expect(prompt).toContain('中段连续 2 次')
    expect(prompt).toContain('每章必须更换冲突来源')
    expect(prompt).toContain('每章至少一个显性回报')
    expect(prompt).toContain('每章章末必须留下不同的追读问题')
  })

  test('injects default five-chapter rollback evidence into expansion validation prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第68-70章',
          batch_goal: '默认5章档位回退后的3章验证。',
          expansion_structure_verification: {
            source: 'safe_batch_expansion_structure_repair',
            label: '扩批结构验证',
            repeated_hotspot_segment: { key: 'middle', label: '中段', count: 1 },
            validation_chapter_nos: [68, 69, 70],
            fixed_segment_role: '默认档位回退：中段必须重新证明主线转折、显性回报和章末追读。',
            conflict_rotation: '验证批每章必须更换冲突来源。',
            explicit_payoff: '每章至少一个显性回报。',
            ending_hook_requirement: '每章章末必须留下不同追读问题。',
            default_five_chapter_regression: {
              status: 'regressed',
              label: '默认5章档位回退原因',
              default_batch_chapter_nos: [63, 64, 65, 66, 67],
              restore_chapter_nos: [58, 59, 60, 61, 62],
              validation_chapter_nos: [50, 51, 52],
              repeated_hotspot_segment: { key: 'middle', label: '中段', risk_count: 3 },
              failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
              summary: '默认5章档位回退原因：连续 2 批恢复稳定后，第63、64、65、66、67章默认档位在中段复发。',
            },
          },
        },
        chapter_target: {
          chapter_no: 68,
          title: '外门夜钟',
          summary: '验证默认档位回退后的中段结构。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 68, title: '外门夜钟' },
    )

    expect(prompt).toContain('默认5章档位回退')
    expect(prompt).toContain('失效批次：第63章、第64章、第65章、第66章、第67章')
    expect(prompt).toContain('恢复依据：第58章、第59章、第60章、第61章、第62章')
    expect(prompt).toContain('前置3章验证：第50章、第51章、第52章')
    expect(prompt).toContain('失败维度：核心偏移、回报欠账、追读拉力')
    expect(prompt).toContain('逐章证明核心守恒、显性回报和章末追读')
  })

  test('injects default five-chapter lane template verification into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第90-92章',
          batch_goal: '默认档位模板修复后进入3章验证批。',
          expansion_structure_verification: {
            source: 'safe_batch_expansion_structure_decision_mismatch',
            validation_chapter_nos: [90, 91, 92],
            fixed_segment_role: '默认 5 章档位验证批必须逐章继承前段、中段、后段的段位职责模板。',
            conflict_rotation: '默认 5 章档位验证批必须逐章轮换冲突来源。',
            explicit_payoff: '默认 5 章档位验证批必须逐章交付显性回报。',
            ending_hook_requirement: '默认 5 章档位验证批必须逐章落地章末追读模板。',
            default_five_chapter_lane_template: {
              visible: true,
              status: 'fulfilled',
              label: '默认5章档位模板回检',
              summary: '默认5章档位模板已补齐。下一轮验证批逐章继承四项模板。',
              segment_duty_rewrite: '段位职责重写：前段压迫、中段兑现、后段升级钩子。',
              conflict_rotation: '冲突轮换：规则压迫、人物对抗、信息误导三类轮换。',
              payoff_density: '回报密度：每章至少交付一个显性回报。',
              ending_hook_template: '章末追读模板：最后 300 字落触发事件、读者问题、下一章风险。',
              repaired_missing_requirements: [
                { key: 'default_lane_payoff_density', label: '回报密度', chapter_nos: [91] },
              ],
              repair_actions: [
                '回报密度修复：第91章必须补出显性回报，让读者看到收益、反制结果或阶段结算。',
              ],
              requirements: [
                { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
                { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
                { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
                { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
              ],
            },
          },
        },
        chapter_target: {
          chapter_no: 90,
          title: '模板验证一',
          summary: '验证默认档位模板是否稳定。',
          conflict: '是否按新模板推进第一章。',
          ending_hook: '新模板第一处风险抬头。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 90, title: '模板验证一' },
    )

    expect(prompt).toContain('默认5章档位模板回检')
    expect(prompt).toContain('下一轮验证批逐章继承')
    expect(prompt).toContain('默认档位段位职责、冲突轮换、回报密度、章末追读模板')
    expect(prompt).toContain('段位职责重写：前段压迫')
    expect(prompt).toContain('冲突轮换：规则压迫')
    expect(prompt).toContain('回报密度：每章至少交付')
    expect(prompt).toContain('章末追读模板：最后 300 字')
    expect(prompt).toContain('模板缺项修复：第91章缺回报密度')
    expect(prompt).toContain('缺项修复动作：回报密度修复：第91章必须补出显性回报')
    expect(prompt).toContain('逐章证明四项模板没有复发')
    expect(prompt).toContain('default_lane_segment_duty_delivered')
    expect(prompt).toContain('default_lane_conflict_rotation_delivered')
    expect(prompt).toContain('default_lane_payoff_density_delivered')
    expect(prompt).toContain('default_lane_ending_hook_template_delivered')
  })

  test('injects default lane template redesign execution standards into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第96-98章',
          batch_goal: '默认档位模板重构后进入3章验证批。',
          expansion_structure_verification: {
            source: 'safe_batch_expansion_structure_repair',
            validation_chapter_nos: [96, 97, 98],
            fixed_segment_role: '中段固定职责：验证新默认档位模板。',
            conflict_rotation: '验证批每章更换冲突来源。',
            explicit_payoff: '验证批每章必须有显性回报。',
            ending_hook_requirement: '验证批每章章末必须留下追读问题。',
            default_five_chapter_lane_template: {
              visible: true,
              status: 'fulfilled',
              label: '默认5章档位模板重构',
              source: 'safe_batch_expansion_structure_repair',
              redesign_source: 'default_five_chapter_lane_template_redesign_queue',
              summary: '默认档位模板已重构：回报密度失败 2 次已改为逐章显性结算。',
              top_failed_requirement: {
                key: 'default_lane_payoff_density',
                label: '回报密度',
                failed_count: 2,
              },
              segment_duty_rewrite: '新模板：第1章抛出规则压迫，第2章制造误导反转，第3章兑现阶段收益。',
              conflict_rotation: '新模板：规则压迫、人物对抗、信息误导按章轮换。',
              payoff_density: '新模板：每章必须有可见收益、反制结果或阶段结算。',
              ending_hook_template: '新模板：最后300字必须落触发事件、读者问题和下一章风险。',
              redesigned_templates: [
                { key: 'default_lane_payoff_density', label: '回报密度', template: '新模板：每章必须有可见收益、反制结果或阶段结算。' },
              ],
              validation_standard: [
                '下一轮3章验证批必须逐章回填 default_lane_*_delivered。',
                '连续2批模板全过后才能恢复默认5章档位。',
              ],
              required_receipts: [
                'default_lane_segment_duty_delivered',
                'default_lane_conflict_rotation_delivered',
                'default_lane_payoff_density_delivered',
                'default_lane_ending_hook_template_delivered',
              ],
              requirements: [
                { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
                { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
                { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
                { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
              ],
            },
          },
        },
        chapter_target: {
          chapter_no: 96,
          title: '模板重构验证一',
          summary: '验证默认档位模板重构是否稳定。',
          conflict: '新模板第一章是否能守住回报密度。',
          ending_hook: '验证失败的风险抬头。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 96, title: '模板重构验证一' },
    )

    expect(prompt).toContain('模板重构来源：default_five_chapter_lane_template_redesign_queue')
    expect(prompt).toContain('高频缺项：回报密度失败 2 次')
    expect(prompt).toContain('重构模板：回报密度：新模板：每章必须有可见收益')
    expect(prompt).toContain('下一轮验证标准：下一轮3章验证批必须逐章回填 default_lane_*_delivered。；连续2批模板全过后才能恢复默认5章档位。')
    expect(prompt).toContain('逐章回填字段：default_lane_segment_duty_delivered、default_lane_conflict_rotation_delivered、default_lane_payoff_density_delivered、default_lane_ending_hook_template_delivered')
    expect(prompt).toContain('默认5章档位模板验证：本章必须继承已补齐的段位职责')
  })

  test('injects production relapse template version proof into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第114-116章',
          batch_goal: '默认档位模板生产复发后进入3章验证批。',
          expansion_structure_verification: {
            source: 'safe_batch_expansion_structure_repair',
            validation_chapter_nos: [114, 115, 116],
            fixed_segment_role: '中段固定职责：验证生产后验新模板。',
            conflict_rotation: '验证批每章更换冲突来源。',
            explicit_payoff: '验证批每章必须有显性回报。',
            ending_hook_requirement: '验证批每章章末必须留下追读问题。',
            default_five_chapter_lane_template: {
              visible: true,
              status: 'fulfilled',
              label: '默认档位模板生产复发重构',
              source: 'safe_batch_expansion_structure_repair',
              redesign_source: 'default_five_chapter_lane_template_redesign_queue',
              summary: '默认档位模板版本 safe_batch_expansion_structure_repair:668 在真实5章生产复发，已按生产后验重构。',
              template_version_id: 'safe_batch_expansion_structure_repair:668',
              production_relapse_count: 1,
              production_relapse_review: {
                template_version_id: 'safe_batch_expansion_structure_repair:668',
                default_batch_chapter_nos: [109, 110, 111, 112, 113],
                restore_chapter_nos: [104, 105, 106, 107, 108],
                validation_chapter_nos: [96, 97, 98],
                failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
                failed_requirements: [
                  { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移' },
                  { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账' },
                  { key: 'default_lane_ending_hook_template', label: '章末追读模板', failure_reason: '追读拉力' },
                ],
                summary: '第109-113章真实生产复发，当前模板版本必须证明核心、回报、追读三项后验修复。',
              },
              failed_requirements: [
                { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移', failed_count: 1 },
                { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账', failed_count: 1 },
                { key: 'default_lane_ending_hook_template', label: '章末追读模板', failure_reason: '追读拉力', failed_count: 1 },
              ],
              redesigned_templates: [
                { key: 'default_lane_payoff_density', label: '回报密度', template: '生产后验新模板：每章必须落一个可见收益、反制结果或阶段结算。' },
              ],
              validation_standard: [
                '下一轮3章验证批必须逐章对照 template_version_id safe_batch_expansion_structure_repair:668 和真实生产复发章节。',
                '逐章证明新版模板已修掉真实生产失败维度：核心偏移、回报欠账、追读拉力。',
              ],
              required_receipts: [
                'default_lane_segment_duty_delivered',
                'default_lane_conflict_rotation_delivered',
                'default_lane_payoff_density_delivered',
                'default_lane_ending_hook_template_delivered',
              ],
              requirements: [
                { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
                { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
                { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
                { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
              ],
            },
          },
        },
        chapter_target: {
          chapter_no: 114,
          title: '生产后验验证一',
          summary: '验证当前模板版本是否修掉真实生产复发。',
          conflict: '新模板第一章是否能守住核心和回报。',
          ending_hook: '复发风险再次抬头。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 114, title: '生产后验验证一' },
    )

    expect(prompt).toContain('模板版本：safe_batch_expansion_structure_repair:668')
    expect(prompt).toContain('生产复发次数：1')
    expect(prompt).toContain('生产复发章节：第109章、第110章、第111章、第112章、第113章')
    expect(prompt).toContain('生产复发前验证：第96章、第97章、第98章')
    expect(prompt).toContain('生产恢复依据：第104章、第105章、第106章、第107章、第108章')
    expect(prompt).toContain('真实生产失败维度：核心偏移、回报欠账、追读拉力')
    expect(prompt).toContain('生产复发模板缺项：默认档位段位职责/核心偏移；回报密度/回报欠账；章末追读模板/追读拉力')
    expect(prompt).toContain('模板版本后验验证：本轮3章验证批必须逐章对照 template_version_id safe_batch_expansion_structure_repair:668')
    expect(prompt).toContain('逐章证明新版模板已修掉真实生产失败维度：核心偏移、回报欠账、追读拉力')
  })

  test('injects expansion structure decision into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第70-74章',
          batch_goal: '恢复五章扩批但继续执行段位职责。',
          expansion_structure_decision: {
            visible: true,
            label: '结构修复决策',
            recommendation: 'restore_five_chapter',
            target_chapter_count: 5,
            mode_label: '恢复5章扩批',
            segment_label: '中段',
            summary: '中段结构修复有效性：通过率 67% -> 100%，失败主因 3 -> 0，修复后暂无同段复发。',
            instruction: '恢复 5 章扩批，但每章必须明确前段/中段/后段职责，不能因为放大批次而淡化结构约束。',
            observation_metrics: ['通过率 67% -> 100%', '失败主因 3 -> 0', '修复后暂无同段复发'],
          },
        },
        chapter_target: {
          chapter_no: 70,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          conflict: '是否相信敌人提示。',
          ending_hook: '钟声倒数。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 70, title: '外门夜钟' },
    )

    expect(prompt).toContain('【扩批结构决策】')
    expect(prompt).toContain('执行 next_batch_brief.expansion_structure_decision')
    expect(prompt).toContain('restore_five_chapter')
    expect(prompt).toContain('恢复 5 章扩批')
    expect(prompt).toContain('通过率 67% -> 100%')
    expect(prompt).toContain('失败主因 3 -> 0')
    expect(prompt).toContain('expansion_structure_decision_execution')
    expect(prompt).toContain('segment_role_delivered')
    expect(prompt).toContain('observation_metrics_delivered')
  })

  test('injects default five-chapter lane redesign obligations into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapter_range_label: '第89章',
          batch_goal: '恢复判定连续失效后先重写默认五章档位。',
          expansion_structure_decision: {
            visible: true,
            label: '结构修复决策',
            recommendation: 'escalate_structure_redesign',
            target_chapter_count: 1,
            mode_label: '单章结构重构',
            segment_label: '中段',
            summary: '连续 2 次恢复判定失效：核心偏移、回报欠账、追读拉力同维复发，默认档位结构重构。',
            instruction: '默认 5 章档位连续恢复判定失效，本章先重写默认档位结构。',
            observation_metrics: ['恢复判定连续失效 2 次', '同维复发：核心偏移、回报欠账、追读拉力'],
            default_five_chapter_lane_redesign: {
              reason: 'repeated_recovery_verdict_relapse',
              relapse_count: 2,
              repeated_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
              segment_duty_rewrite: '段位职责重写：定义默认 5 章内前段、中段、后段各自承担的冲突、信息、回报和钩子职责。',
              conflict_rotation: '冲突轮换：五章内至少更换规则压迫、人物对抗、信息误导三类冲突来源。',
              payoff_density: '回报密度：每章都要有显性回报，不能连续两章只铺垫。',
              ending_hook_template: '章末追读模板：每章最后 300 字给出触发事件、读者问题、下一章风险升级。',
            },
          },
        },
        chapter_target: {
          chapter_no: 89,
          title: '默认档重构',
          summary: '重写五章档位结构。',
          conflict: '是否暂停扩批并重设节奏。',
          ending_hook: '新的五章模板露出第一处风险。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 89, title: '默认档重构' },
    )

    expect(prompt).toContain('默认5章档位结构重构')
    expect(prompt).toContain('连续恢复判定失效')
    expect(prompt).toContain('核心偏移、回报欠账、追读拉力')
    expect(prompt).toContain('段位职责重写')
    expect(prompt).toContain('冲突轮换')
    expect(prompt).toContain('回报密度')
    expect(prompt).toContain('章末追读模板')
    expect(prompt).toContain('repeated_recovery_verdict_relapse')
    expect(prompt).toContain('default_lane_segment_duty_delivered')
    expect(prompt).toContain('default_lane_conflict_rotation_delivered')
    expect(prompt).toContain('default_lane_payoff_density_delivered')
    expect(prompt).toContain('default_lane_ending_hook_template_delivered')
  })

  test('injects longform memory anchor from safe batch preflight into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        batch_preflight: {
          source: 'auto_creation_safe_batch_preflight',
          longform_memory_anchor: {
            last_updated_chapter: 7,
            core_promise: '李超用超人蛮力碰撞规则怪谈，张智负责拆解规则。',
            current_volume_goal: '午夜校园中活过第一轮规则。',
            character_states: ['李超：力量觉醒但不懂规则@宿舍楼大厅'],
            open_questions: ['广播是谁发出的'],
            payoff_debts: ['规则边界反制蛮力'],
          },
        },
        chapter_target: {
          chapter_no: 8,
          title: '宿舍水痕',
          summary: '追查广播与门外学生的联系。',
          conflict: '蛮力试探规则边界。',
          ending_hook: '广播第一次叫出李超真名。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '宿舍水痕' },
    )

    expect(prompt).toContain('【长篇正史锚点】')
    expect(prompt).toContain('李超用超人蛮力碰撞规则怪谈')
    expect(prompt).toContain('广播是谁发出的')
    expect(prompt).toContain('规则边界反制蛮力')
  })

  test('injects longform memory capsule into paragraph prose prompt for single chapter drafting', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '万古长夜' },
      {
        longform_memory_capsule: {
          last_updated_chapter: 7,
          core_promise: '寒门少年以阵法改写宗门秩序。',
          mainline_progress: '外门压迫线推进到试炼前夜。',
          character_states: ['李玄：仍在藏拙，但已经被执事逼到试炼边缘'],
          open_questions: ['残阵缺口为什么会回应旧案禁制'],
          payoff_debts: ['试炼资格被夺后的公开打脸回报'],
          canon_facts: ['残阵缺口不能被普通阵图修复'],
          red_lines: ['主角不能脱离阵法成长线'],
        },
        chapter_target: {
          chapter_no: 8,
          title: '试炼前夜',
          summary: '李玄必须决定是否公开承认残阵缺陷。',
          conflict: '藏拙保命还是公开争取试炼资格。',
          ending_hook: '阵盘裂纹在众人面前亮起。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '试炼前夜' },
    )

    expect(prompt).toContain('【长篇记忆胶囊】')
    expect(prompt).toContain('寒门少年以阵法改写宗门秩序')
    expect(prompt).toContain('残阵缺口为什么会回应旧案禁制')
    expect(prompt).toContain('试炼资格被夺后的公开打脸回报')
    expect(prompt).toContain('主角不能脱离阵法成长线')
    expect(prompt).toContain('执行 chapter_target.longform_memory_capsule')
  })

  test('injects camelCase longform memory capsule item states into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '万古长夜' },
      {
        preDraftBrief: {
          longformMemoryCapsule: {
            corePromise: '寒门少年以阵法改写宗门秩序。',
            characterStates: [
              { name: '李玄', currentState: '右手阵纹失控，仍被迫藏拙', lastUpdatedChapter: 7 },
            ],
            openQuestions: [
              { name: '旧案禁制', currentState: '残阵缺口为什么会回应旧案禁制', lastUpdatedChapter: 7 },
            ],
            redLines: ['主角不能脱离阵法成长线'],
          },
        },
        chapter_target: {
          chapter_no: 8,
          title: '试炼前夜',
          summary: '李玄必须决定是否公开承认残阵缺陷。',
          conflict: '藏拙保命还是公开争取试炼资格。',
          ending_hook: '阵盘裂纹在众人面前亮起。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 8, title: '试炼前夜' },
    )

    expect(prompt).toContain('【长篇记忆胶囊】')
    expect(prompt).toContain('李玄：右手阵纹失控，仍被迫藏拙@第7章')
    expect(prompt).toContain('旧案禁制：残阵缺口为什么会回应旧案禁制@第7章')
  })

  test('injects million word runway into paragraph prose prompt as the chapter course guard', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        million_word_runway: {
          status: 'ready',
          label: '航线可连续',
          bandLabel: '第1个10万字',
          safeModeLabel: '小批量连写 3 章',
          fourQuestions: [
            { key: 'why_now', label: '这章为什么必须写', answer: '第一次证明规则边界能被利用', status: 'ok' },
            { key: 'page_turn', label: '读者为什么翻页', answer: '门外学生说出李超的死因', status: 'ok' },
            { key: 'mainline_move', label: '主线推进了什么', answer: '双主角确认规则并非不可破解', status: 'ok' },
            { key: 'freshness', label: '这一章的新意在哪', answer: '超人力量先被规则压制再反制', status: 'ok' },
          ],
          redLines: ['超人力量不能无代价碾压规则'],
          readerFuel: ['规则反制爽点', '门外学生章末钩子'],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【百万字航线守门】')
    expect(prompt).toContain('本章四问')
    expect(prompt).toContain('第一次证明规则边界能被利用')
    expect(prompt).toContain('超人力量不能无代价碾压规则')
    expect(prompt).toContain('规则反制爽点')
    expect(prompt).toContain('执行 chapter_target.million_word_runway')
  })

  test('injects camelCase million word runway from pre-draft context into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        preDraftBrief: {
          millionWordRunway: {
            status: 'ready',
            label: '航线可连续',
            bandLabel: '第1个10万字',
            safeModeLabel: '小批量连写 3 章',
            fourQuestions: [
              { key: 'why_now', label: '这章为什么必须写', answer: '第一次证明规则边界能被利用', status: 'ok' },
              { key: 'page_turn', label: '读者为什么翻页', answer: '门外学生说出李超的死因', status: 'ok' },
            ],
            redLines: ['超人力量不能无代价碾压规则'],
            readerFuel: ['规则反制爽点', '门外学生章末钩子'],
          },
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【百万字航线守门】')
    expect(prompt).toContain('第一次证明规则边界能被利用')
    expect(prompt).toContain('超人力量不能无代价碾压规则')
    expect(prompt).toContain('门外学生章末钩子')
  })

  test('injects camelCase million word runway from runtime chapterTarget into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapterTarget: {
          chapterNo: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          endingHook: '门外出现湿漉漉的学生。',
          sceneCards: [],
          millionWordRunway: {
            status: 'ready',
            label: '航线可连续',
            bandLabel: '第1个10万字',
            safeModeLabel: '小批量连写 3 章',
            fourQuestions: [
              { key: 'why_now', label: '这章为什么必须写', answer: '第一次证明规则边界能被利用', status: 'ok' },
              { key: 'page_turn', label: '读者为什么翻页', answer: '门外学生说出李超的死因', status: 'ok' },
            ],
            redLines: ['超人力量不能无代价碾压规则'],
            readerFuel: ['规则反制爽点', '门外学生章末钩子'],
          },
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【百万字航线守门】')
    expect(prompt).toContain('第一次证明规则边界能被利用')
    expect(prompt).toContain('超人力量不能无代价碾压规则')
    expect(prompt).toContain('门外学生章末钩子')
  })

  test('injects chapter launch gate into paragraph prose prompt as pre-draft guardrails', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_launch_gate: {
          status: 'ready',
          summary: '当前章已对齐读者承诺、章节目标、核心冲突、主线服务、读者回报和章末钩子。',
          signals: [
            { key: 'reader_promise', label: '读者承诺', status: 'ok', detail: '本章必须服务：超人力量和规则判定持续碰撞。' },
            { key: 'core_conflict', label: '核心冲突', status: 'ok', detail: '冲突：是否用蛮力冲出宿舍。' },
          ],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【本章开写门禁】')
    expect(prompt).toContain('读者承诺、章节目标、核心冲突、主线服务、读者回报和章末钩子')
    expect(prompt).toContain('超人力量和规则判定持续碰撞')
    expect(prompt).toContain('是否用蛮力冲出宿舍')
    expect(prompt).toContain('执行 chapter_target.chapter_launch_gate')
  })

  test('injects camelCase pre-draft chapter launch gate into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        preDraftBrief: {
          chapterLaunchGate: {
            status: 'warn',
            summary: '当前章必须补强读者承诺、章节目标和章末钩子。',
            signals: [
              { key: 'reader_promise', label: '读者承诺', status: 'warn', detail: '本章必须服务：超人力量和规则判定持续碰撞。' },
              { key: 'ending_hook', label: '章末钩子', status: 'warn', detail: '章末必须留下门外学生身份问题。' },
            ],
          },
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【本章开写门禁】')
    expect(prompt).toContain('当前章必须补强读者承诺、章节目标和章末钩子')
    expect(prompt).toContain('超人力量和规则判定持续碰撞')
    expect(prompt).toContain('门外学生身份问题')
  })

  test('injects governance recheck memory into paragraph prose prompt as single-chapter guardrails', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        governance_recheck_memory: {
          source_run_id: 44,
          status: 'closed',
          label: '治理复查已记录',
          summary: '恢复依据闭环 2/2，本章必须继续继承上一轮修后证据。',
          evidence: ['第42章对白交锋已补回样章节奏'],
          failed_evidence: [],
          watch_items: ['下一章继续观察样章策略命中率'],
          storyline_decision_task_count: 0,
        },
        chapter_target: {
          chapter_no: 43,
          title: '复查后的新局',
          summary: '主角用新证据逼对手公开应答。',
          conflict: '对手试图绕开上一轮修复后的对白交锋。',
          ending_hook: '旧账本出现第二个签名。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 43, title: '复查后的新局' },
    )

    expect(prompt).toContain('【治理复查承接】')
    expect(prompt).toContain('第42章对白交锋已补回样章节奏')
    expect(prompt).toContain('下一章继续观察样章策略命中率')
    expect(prompt).toContain('执行 chapter_target.governance_recheck_memory')
  })

  test('injects core contract radar into paragraph prose prompt as hard guardrails', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
          core_contract_radar: {
            summary: '本章必须把超人力量撞上规则判定写成可见事件。',
            must_serve: ['超人力量和规则判定持续碰撞', '蛮力破局与规则判定的对抗'],
            no_drift: ['不能把规则怪谈写成纯打怪'],
            repair_focus: ['补足规则判定反制蛮力'],
            periodic_drift_check: {
              cadence: '每10章',
              due: true,
              question: '当初吸引读者的卖点还在吗？',
              selling_points: ['超人能力被规则空间反制。'],
            },
            checks: [{ key: 'reader_promise', label: '读者承诺', status: 'warn', reason: '碰撞不够可见' }],
          },
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【核心契约】')
    expect(prompt).toContain('必须服务')
    expect(prompt).toContain('不得漂移')
    expect(prompt).toContain('超人力量和规则判定持续碰撞')
    expect(prompt).toContain('不能把规则怪谈写成纯打怪')
    expect(prompt).toContain('执行 chapter_target.core_contract_radar')
    expect(prompt).toContain('十章卖点复核')
    expect(prompt).toContain('当初吸引读者的卖点还在吗')
  })

  test('injects camelCase pre-draft core contract radar into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        preDraftBrief: {
          coreContractRadar: {
            summary: '本章必须把规则反制爽点写成现场事件。',
            mustServe: ['读者承诺必须维持规则反制爽点'],
            noDrift: ['不能把校园怪谈改写成纯战斗副本'],
            repairFocus: ['补足规则判定压住蛮力的可见代价'],
          },
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【核心契约】')
    expect(prompt).toContain('必须服务：读者承诺必须维持规则反制爽点')
    expect(prompt).toContain('不得漂移：不能把校园怪谈改写成纯战斗副本')
    expect(prompt).toContain('优先修正：补足规则判定压住蛮力的可见代价')
  })

  test('injects longform battle context into paragraph prose prompt as chapter obligations', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
          longform_battle_context: {
            status: 'needs_action',
            summary: '先修复读者拉力和核心守恒。',
            risk_chips: ['核心偏移', '前30章留存'],
            primary_action: { label: '运行前30章诊断', reason: '补开篇钩子和章末追读。' },
            risk_lanes: [
              {
                key: 'story_core',
                label: '核心守恒',
                status: 'warn',
                detail: '核心偏移：超人力量被写成普通无敌碾压。',
                required_action: '本章必须写出规则判定反制蛮力。',
              },
              {
                key: 'reader_pull',
                label: '读者拉力',
                status: 'block',
                detail: '前30章留存弱：开篇钩子不足。',
                required_action: '前300字给危机，章末留下门外学生悬念。',
              },
            ],
          },
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【长篇作战承接】')
    expect(prompt).toContain('先修复读者拉力和核心守恒')
    expect(prompt).toContain('本章必须写出规则判定反制蛮力')
    expect(prompt).toContain('前300字给危机')
    expect(prompt).toContain('执行 chapter_target.longform_battle_context')
  })

  test('injects camelCase pre-draft longform battle context into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        preDraftBrief: {
          longformBattleContext: {
            status: 'needs_action',
            summary: '本章必须把长篇核心拉回规则反制。',
            riskChips: ['核心漂移', '读者拉力弱'],
            primaryAction: {
              key: 'repair_story_core',
              label: '修复核心守恒',
              reason: '正文必须让超人力量被规则判定反制。',
            },
            riskLanes: [
              {
                key: 'story_core',
                label: '核心守恒',
                status: 'warn',
                detail: '核心漂移：超人力量像普通无敌流。',
                requiredAction: '写出规则判定压住蛮力的现场代价。',
              },
            ],
          },
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【长篇作战承接】')
    expect(prompt).toContain('本章必须把长篇核心拉回规则反制')
    expect(prompt).toContain('写出规则判定压住蛮力的现场代价')
    expect(prompt).toContain('执行 chapter_target.longform_battle_context')
  })

  test('merges runtime chapterTarget longform battle context into paragraph prose prompt when chapter_target already exists', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          conflict: '是否用蛮力冲出宿舍。',
          ending_hook: '门外出现湿漉漉的学生。',
          scene_cards: [],
        },
        chapterTarget: {
          chapterNo: 2,
          longformBattleContext: {
            status: 'needs_action',
            summary: '运行时诊断要求本章补回长篇作战风险。',
            riskChips: ['作战台漏接'],
            riskLanes: [
              {
                key: 'reader_pull',
                label: '读者拉力',
                status: 'block',
                detail: '上一轮诊断发现章末追读不足。',
                requiredAction: '章末必须留下湿漉漉学生的身份悬念。',
              },
            ],
          },
        },
      },
      null,
      { chapter_no: 2, title: '第一条规则' },
    )

    expect(prompt).toContain('【长篇作战承接】')
    expect(prompt).toContain('运行时诊断要求本章补回长篇作战风险')
    expect(prompt).toContain('章末必须留下湿漉漉学生的身份悬念')
  })

  test('injects reader expectation debt into paragraph prose prompt as carry-over obligations', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        reader_expectation_debt_context: {
          must_carry: [
            { from_chapter_no: 2, key: 'ending_hook', label: '章末追读', type: 'hook', text: '湿漉漉学生敲响玻璃门' },
          ],
          keep_alive: [
            { from_chapter_no: 2, key: 'open_question', label: '保留悬念', type: 'question', text: '广播是谁发出的' },
          ],
        },
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '判断门外学生是否是规则诱饵。',
          conflict: '救人还是守规。',
          ending_hook: '玻璃门上的水迹拼出一个名字。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(prompt).toContain('【期待债务承接】')
    expect(prompt).toContain('上一章或最近章节欠下的期待必须在本章可见推进')
    expect(prompt).toContain('湿漉漉学生敲响玻璃门')
    expect(prompt).toContain('广播是谁发出的')
  })

  test('injects previous chapter handoff into paragraph prose prompt as opening obligation', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '判断门外学生是否是规则诱饵。',
          conflict: '救人还是守规。',
          previous_handoff: '上一章最后一幕：湿漉漉学生敲响玻璃门，林晓警告不能开门。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(prompt).toContain('【上一章尾段原文承接】')
    expect(prompt).toContain('前300字必须接住上一章最后一幕')
    expect(prompt).toContain('湿漉漉学生敲响玻璃门')
    expect(prompt).toContain('不能只复述摘要或改写成新的开场')
    expect(prompt).toContain('不得重新从泛环境描写、空泛醒来或无关解释开场')
  })

  test('injects camelCase chapter handoff contract previousHandoff into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '判断门外学生是否是规则诱饵。',
          conflict: '救人还是守规。',
          chapterHandoffContract: {
            previousHandoff: '上一章最后一幕：湿漉漉学生敲响玻璃门，林晓警告不能开门。',
          },
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(prompt).toContain('【上一章尾段原文承接】')
    expect(prompt).toContain('前300字必须接住上一章最后一幕')
    expect(prompt).toContain('湿漉漉学生敲响玻璃门')
    expect(prompt).toContain('不能只复述摘要或改写成新的开场')
  })

  test('injects pre-draft camelCase chapter handoff contract into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        pre_draft_brief: {
          chapterHandoffContract: {
            previousHandoff: '上一章最后一幕：湿漉漉学生敲响玻璃门，林晓警告不能开门。',
          },
        },
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '判断门外学生是否是规则诱饵。',
          conflict: '救人还是守规。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(prompt).toContain('【上一章尾段原文承接】')
    expect(prompt).toContain('前300字必须接住上一章最后一幕')
    expect(prompt).toContain('湿漉漉学生敲响玻璃门')
    expect(prompt).toContain('不能只复述摘要或改写成新的开场')
  })

  test('injects pre-draft camelCase chapter blueprint into paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        pre_draft_brief: {
          chapterBlueprint: {
            version: 'oh_story_chapter_blueprint_v1',
            targetEmotion: '压迫后反制释放',
            openingHook: '湿漉漉学生敲响玻璃门',
            corePayoff: '主角当场识破暗号诱导',
            contentOutline: {
              cause: '门外学生用暗号诱导开门',
              development: '主角用规则反问拖住对方',
              turn: '暗号露出破绽',
              climax: '主角识破诱饵',
              ending: '玻璃门水痕拼出新名字',
            },
          },
        },
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '判断门外学生是否是规则诱饵。',
          conflict: '救人还是守规。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(prompt).toContain('【章节蓝图合同】')
    expect(prompt).toContain('必须先执行 chapter_target.chapter_blueprint')
    expect(prompt).toContain('主角当场识破暗号诱导')
  })

  test('builds a chapter attraction review from hooks, scene drive, payoff, page-turn and spread scene', () => {
    const report = buildChapterAttractionReviewReport(
      { id: 5, title: '超人的规则怪谈世界' },
      { id: 8, chapter_no: 2, title: '第一条规则' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          reader_retention_brief: {
            opening_hook: '十点整，宿舍外所有路灯同时熄灭。',
            payoff_promise: '李超第一次发现蛮力会被规则边界反制。',
            short_drama_scene: '玻璃门外黑暗贴着门槛白线移动。',
            ending_question: '门外湿漉漉的学生说出李超的死因。',
          },
          scene_cards: [
            {
              title: '十点门槛',
              goal: '验证十点后不得离开宿舍的规则。',
              conflict: '李超想冲出去，张智必须阻止。',
              turning_point: '饼干碎屑越过门槛后被黑暗清除。',
              reader_payoff: '规则第一次反制超人蛮力。',
            },
          ],
        },
      },
      [
        '十点整，宿舍外所有路灯同时熄灭。',
        '宿舍大厅里，三个人听见挂钟咔哒一声。',
        '李超站在门口，想冲出去试试自己的力量。',
        '张智拦住他，用饼干碎屑试探门槛。',
        '碎屑越过门槛后消失，黑暗贴着白线移动。',
        '他第一次清楚发现，蛮力会被规则边界反制，自己再强也绕不过判定。',
        '门外湿漉漉的学生敲了敲玻璃，说出了李超的死因。',
      ].join('\n\n'),
    )

    expect(report.status).toBe('ok')
    expect(report.score).toBeGreaterThanOrEqual(80)
    expect(report.label).toBe('吸引力 OK')
    expect(report.dimensions.map((item: any) => item.key)).toEqual([
      'opening_hook',
      'scene_drive',
      'payoff_density',
      'page_turn',
      'spread_scene',
    ])
    expect(report.priority_repair).toBe('')
  })

  test('reads raw camelCase attraction briefs after delivery', () => {
    const report = buildChapterAttractionReviewReport(
      { id: 5, title: '超人的规则怪谈世界' },
      {
        id: 28,
        chapter_no: 28,
        title: '倒放录音',
        raw_payload: {
          preDraftBrief: {
            readerRetentionBrief: {
              openingHook: '旧广播室磁带突然倒放。',
              payoffPromise: '李超用倒放录音反制门锁规则。',
              shortDramaScene: '磁带倒转时，未来回答先于提问响起。',
              endingQuestion: '下一盘磁带为什么写着李超的名字。',
            },
            sceneBriefs: [
              {
                goal: '确认旧广播室磁带来源。',
                conflict: '门锁规则会反噬硬闯者。',
                turningPoint: '倒放录音暴露门锁暗号。',
                readerPayoff: '李超反制门锁规则。',
              },
            ],
          },
        },
      },
      {},
      [
        '旧广播室磁带突然倒放。',
        '李超想确认旧广播室磁带来源，却发现门锁规则会反噬硬闯者。',
        '倒放录音暴露门锁暗号，他用倒放录音反制门锁规则。',
        '磁带倒转时，未来回答先于提问响起。',
        '最后，下一盘磁带写着李超的名字。',
      ].join('\n\n'),
    )

    expect(report.dimensions.find((item: any) => item.key === 'scene_drive')?.expected).toContain('倒放录音暴露门锁暗号')
    expect(report.dimensions.find((item: any) => item.key === 'payoff_density')?.expected).toContain('反制门锁规则')
    expect(report.status).toBe('ok')
  })

  test('warns when chapter attraction misses page-turn and visible payoff', () => {
    const report = buildChapterAttractionReviewReport(
      { id: 5, title: '超人的规则怪谈世界' },
      { id: 8, chapter_no: 2, title: '第一条规则' },
      {
        chapter_target: {
          reader_retention_brief: {
            opening_hook: '十点整，宿舍外所有路灯同时熄灭。',
            payoff_promise: '李超第一次发现蛮力会被规则边界反制。',
            short_drama_scene: '玻璃门外黑暗贴着门槛白线移动。',
            ending_question: '门外湿漉漉的学生说出李超的死因。',
          },
          scene_cards: [
            { title: '十点门槛', goal: '验证规则', conflict: '想出去但不能出去', reader_payoff: '规则反制蛮力' },
          ],
        },
      },
      '李超和张智在大厅里讨论规则。林晓解释自己见过很多人消失。三个人坐着等天亮。',
    )

    expect(report.status).toBe('warn')
    expect(report.label).toContain('吸引力缺口')
    expect(report.weak_count).toBeGreaterThanOrEqual(2)
    expect(report.priority_repair).toContain('章末')
    expect(report.dimensions.find((item: any) => item.key === 'page_turn')?.status).toBe('warn')
    expect(report.next_actions.join('；')).toContain('前300字')
    expect(report.next_actions.join('；')).toContain('最后300字')
  })

  test('checks protagonist choice, cost and state change as story drive after delivery', () => {
    const project = { title: '寒门阵师' }
    const chapter = { id: 12, chapter_no: 12, title: '试炼资格' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        chapter_goal: '主角拿到试炼资格',
        core_conflict: '执事设局阻拦主角参加试炼',
        protagonist_choice: '主角当众选择用残阵反证阵图归属',
        choice_cost: '暴露阵盘裂纹，招来内门势力注意',
        state_change: '主角从被动挨压转为主动入局',
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
    const drivenText = [
      '执事设局阻拦主角参加试炼，当众逼他交出阵图。',
      '主角没有退。他当众选择用残阵反证阵图归属，把残阵压在长案上。',
      '阵盘裂纹随之暴露，内门势力第一次注意到他，这就是选择代价。',
      '但他也因此拿到试炼资格，从被动挨压转为主动入局。',
    ].join('\n')
    const flatText = '执事在阵堂说了很多规矩，众人议论纷纷。主角听完解释，决定以后再想办法。夜色渐深，大家散去。'

    const okReport = buildStoryDriveSyncReport(project, chapter, contextPackage, drivenText)
    const warnReport = buildStoryDriveSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('故事力 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.score).toBeGreaterThanOrEqual(80)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('故事力缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('主角选择')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('选择代价')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('状态变化')
    expect(warnReport.next_actions.join('；')).toContain('主角主动选择')
  })

  test('reads raw camelCase story drive scene briefs after delivery', () => {
    const project = { title: '超人的规则怪谈世界' }
    const chapter = {
      id: 25,
      chapter_no: 25,
      title: '旧广播室',
      raw_payload: {
        preDraftBrief: {
          chapterGoal: '李超进入旧广播室拿到原始录音',
          coreConflict: '旧广播室门锁会按蛮力反噬闯入者',
          protagonistChoice: '李超选择收住蛮力，让张智用暗号反解门锁',
          choiceCost: '李超暴露自己会被录音提前预判的风险',
          stateChange: '小队从被广播追杀转为掌握第一段反证录音',
          causalNextStep: '下一章必须查出录音是谁提前录下的',
          sceneBriefs: [
            {
              goal: '进入旧广播室',
              conflict: '门锁按蛮力反噬闯入者',
              turningPoint: '张智用暗号反解门锁',
              readerPayoff: '小队拿到第一段反证录音',
              exitState: '小队掌握反证录音',
            },
          ],
        },
      },
    }
    const report = buildStoryDriveSyncReport(
      project,
      chapter,
      {},
      [
        '李超进入旧广播室前，门锁按蛮力反噬闯入者，拳风刚起就被弹回。',
        '他选择收住蛮力，让张智用暗号反解门锁。',
        '门开后，小队拿到第一段反证录音，也暴露自己会被录音提前预判的风险。',
        '小队从被广播追杀转为掌握第一段反证录音，下一章必须查出录音是谁提前录下的。',
      ].join('\n'),
    )

    expect(report.label).not.toBe('故事力未配置')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['本章目标', '明确阻碍', '主角选择', '选择代价', '状态变化', '下一步因果']))
    expect(report.status).toBe('ok')
  })

  test('story state sync persists a story_drive_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyDriveSync, reviewType: 'story_drive_sync'")
    expect(source).toContain('buildStoryDriveSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.story_drive_sync = storyDriveSync')
  })

  test('checks oh-story setup escalation payoff carry-over after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 12, chapter_no: 12, title: '旧账反证' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        story_loop_contract: {
          setup: '旧账册当众压罪，沈砚必须先承压',
          escalation: '执事逼证人改口并抢走解释权',
          payoff: '沈砚用旧印章反证账册被调换',
          carry_over: '旧印章背面露出第二个证人的名字',
          nested_loop_rules: [
            '多级嵌套：小循环 -> 中循环（次级目标）-> 大循环（卷目标）。',
            '小循环中必须铺垫大循环的期待。',
            '在重复中变化：同一核心卖点要换不同角度/不同矛盾，不能只反复用同一个梗换对象。',
          ],
          quality_checks: ['目标 -> 阻碍 -> 行动 -> 反馈 -> 新期待必须闭环。'],
        },
      },
    }
    const loopText = [
      '旧账册当众压罪，沈砚先被迫承压，审判席上无人替他说话。',
      '执事逼证人改口，又抢走解释权，把所有旁观弟子压进同一个结论。',
      '沈砚等他话音落尽，才用旧印章反证账册被调换，执事第一次失声。',
      '反馈落下后，旧印章背面露出第二个证人的名字，新的期待接到下一章。',
      '这个小循环完成旧账反证，中循环转向查出调包链，大循环继续指向宗门账册背后的资源黑幕；同一反证核心卖点换成证人、印章和账册三种角度推进。',
    ].join('\n')
    const flatText = '沈砚解释了账册问题。执事有些尴尬，大家知道他没有错。事情进入下一阶段。后面只是反复用同一个梗换对象。'

    const okReport = buildStoryLoopSyncReport(project, chapter, contextPackage, loopText)
    const warnReport = buildStoryLoopSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('故事循环 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['铺垫入局', '升级阻碍', '兑现反馈', '承接期待', '循环嵌套期待']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('故事循环缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['升级阻碍', '兑现反馈', '承接期待', '循环嵌套期待']))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('nested_loop_rules')
    expect(warnReport.next_actions.join('；')).toContain('setup -> escalation -> payoff -> carry_over')
    expect(warnReport.next_actions.join('；')).toContain('小循环 -> 中循环 -> 大循环')
  })

  test('reads story loop sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '残阵问道' }
    const chapter = {
      id: 27,
      chapter_no: 27,
      title: '旧印背名',
      raw_payload: {
        preDraftBrief: {
          storyLoopContract: {
            setup: '旧印章背面露出第二个证人的名字',
            escalation: '执事抢先派人封住证人住处',
            payoff: '沈砚用账册编号反锁执事封门时间',
            carryOver: '第二个证人留下赤炉城矿脉账册线索',
            nestedLoopRules: [
              '小循环 -> 中循环 -> 大循环必须同时可见。',
              '小循环中必须铺垫大循环的期待。',
            ],
            qualityChecks: ['本章必须形成 setup -> escalation -> payoff -> carry_over。'],
          },
        },
      },
    }

    const report = buildStoryLoopSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 27, title: '旧印背名' } },
      '沈砚解释了一些旧账历史。众人听完后，事情进入下一阶段。',
    )

    expect(report.label).toContain('故事循环缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('第二个证人')
    expect(report.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['升级阻碍', '兑现反馈', '承接期待', '循环嵌套期待']))
    expect(report.quality_checks.join('｜')).toContain('setup -> escalation -> payoff -> carry_over')
  })

  test('checks oh-story map transition continuity after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 31, chapter_no: 31, title: '入赤炉城' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 31,
        story_loop_contract: {
          setup: '沈砚带着旧城税契进入赤炉城',
          escalation: '赤炉城铸堂新规要求外来者先交炼炉保',
          payoff: '沈砚用旧城税契换到第一块炉牌',
          carry_over: '炉牌背面指向赤炉城上层矿脉账册',
          map_transition_rules: [
            '换地图前旧地图核心冲突至少阶段性解决。',
            '新地图 = 新环境 + 新角色 + 新规则 + 新目标 + 新冲突。',
            '换地图后前5章必须快速建立新的代入感和期待感。',
            '保留至少一条贯穿主线，不能旧角色一刀切全部抛弃。',
            '新设定不能一次性全部倒出，每次换地图循环要升级。',
          ],
          nested_loop_rules: ['多级嵌套：小循环 -> 中循环 -> 大循环。'],
        },
      },
    }
    const transitionText = [
      '旧城账册案已阶段性收束，沈砚带着旧城税契和证人阿洛入赤炉城。',
      '赤炉城不是旧城的换名：城门外是炉烟和矿车，新角色铸堂掌炉人挡路，新规则要求外来者先交炼炉保。',
      '沈砚的新目标是拿到第一块炉牌，新的冲突是上层矿脉账册被赤炉城地头蛇扣住。',
      '这条税契主线继续牵住旧城黑账，阿洛作为旧日关系线跟来作证。',
      '去赤炉城前，阿洛先收到旧城证人来信，旧日关系线先动起来，主角才决定带着税契进城。',
      '前五章目标被明确成炉牌、矿脉账册和掌炉人试炼，赤炉城的更高门槛和更强对手已经压到眼前。',
      '新规只露出炼炉保和炉牌两项，没有把整座赤炉城设定一次性倒完。',
    ].join('\n')
    const brokenText = [
      '沈砚突然来到赤炉城。',
      '这里很大，设定很多，作者介绍了所有宗门、矿脉、炉法和历史。',
      '旧城的人和事全部不再提，旧目标结束了。',
      '他逛了一圈，准备开始新的生活。',
    ].join('\n')

    const okReport = buildStoryLoopSyncReport(project, chapter, contextPackage, transitionText)
    const warnReport = buildStoryLoopSyncReport(project, chapter, contextPackage, brokenText)

    expect(okReport.delivered.map((item: any) => item.label)).toContain('换地图承接')
    expect(okReport.missed.map((item: any) => item.key)).not.toContain('map_transition_rules')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('map_transition_rules')
    expect(warnReport.missed.find((item: any) => item.key === 'map_transition_rules')?.missed_items).toEqual(expect.arrayContaining([
      '旧地图核心冲突未阶段性解决',
      '新地图五件套不足',
      '缺贯穿主线或旧关系承接',
      '缺人际关系先行铺垫',
    ]))
    expect(warnReport.next_actions.join('；')).toContain('换地图承接')
  })

  test('story state sync persists a story_loop_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyLoopSync, reviewType: 'story_loop_sync'")
    expect(source).toContain('buildStoryLoopSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.story_loop_sync = storyLoopSync')
  })

  test('checks oh-story information flow after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 12, chapter_no: 12, title: '旧账反证' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        information_flow_contract: {
          version: 'oh_story_information_flow_v1',
          scene_information_units: [
            '旧账册来源被质疑',
            '证人被执事逼迫改口',
            '旧印章证明账册被调换',
          ],
          reveal_order: [
            '先让执事压旧账册',
            '再让证人改口',
            '最后亮旧印章',
          ],
          suspense_responses: ['旧印章背面还有第二个证人'],
          transition_compression_rules: [
            '过渡不是填充，没有信息量就删掉。',
            '纯移动、寒暄、环境描写没有信息量时直接跳过或压缩。',
          ],
          no_infodump_guardrails: ['信息必须随审问冲突释放，不写背景说明书。'],
          quality_checks: ['每个信息团必须能一句话概括，并随冲突递进。'],
        },
      },
    }
    const flowText = [
      '执事先压旧账册，把账册来源当众质疑，逼沈砚认罪。',
      '证人被执事逼迫改口，审问冲突随之升级。',
      '沈砚没有解释背景，只在众人逼问最紧时最后亮旧印章。',
      '旧印章证明账册被调换，旧印章背面还有第二个证人的名字。',
      '去审判庭的路程被一句带过，过渡不是填充，纯移动和寒暄直接跳过。',
    ].join('\n')
    const flatText = [
      '阵堂账册制度分为内账、外账和执事账三类，每类都有漫长历史和不同权限。',
      '两人走过长廊，看了窗外天气，又互相寒暄了几句。',
      '沈砚解释了很多背景，大家终于明白规则。事情进入下一阶段。',
    ].join('\n')

    const okReport = buildInformationFlowSyncReport(project, chapter, contextPackage, flowText)
    const warnReport = buildInformationFlowSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('信息流 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['信息团', '揭示顺序', '悬念回应', '过渡压缩']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('信息流缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['信息团', '揭示顺序', '悬念回应', '过渡压缩', '背景说明书']))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('transition_compression_rules')
    expect(warnReport.next_actions.join('；')).toContain('信息随冲突释放')
  })

  test('checks next objective after gain in oh-story information flow sync', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 18, chapter_no: 18, title: '筑基新门' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        information_flow_contract: {
          version: 'oh_story_information_flow_v1',
          scene_information_units: ['沈砚突破筑基', '内门令牌指向禁库试炼'],
          next_objective_rules: [
            '每次实力、身份、资源或阶段性目标提升后，必须立即引入新的挑战、目标、代价或更高门槛。',
            '兑现当前信息或胜利后，下一步干什么要在场景内可见，不能只写事情进入下一阶段。',
          ],
          transition_compression_rules: ['过渡不是填充，没有信息量就删掉。'],
          quality_checks: ['提升后立刻给出下一目标，避免主角变强但下一步干什么不清楚。'],
        },
      },
    }
    const okText = [
      '沈砚突破筑基，内门令牌当场亮起。',
      '执事没有让欢呼落地，立刻把禁库试炼的新目标压到他面前：三日内取回残阵核心，否则筑基资格作废。',
      '突破后的下一步目标、三日期限和更高门槛同时落进场景。',
    ].join('\n')
    const vacuumText = [
      '沈砚终于突破筑基，众人欢呼许久。',
      '他收起灵力，事情进入下一阶段。',
      '众人散去，他暂时没有新的目标。',
    ].join('\n')

    const okReport = buildInformationFlowSyncReport(project, chapter, contextPackage, okText)
    const warnReport = buildInformationFlowSyncReport(project, chapter, contextPackage, vacuumText)

    expect(okReport.delivered.map((item: any) => item.key)).toContain('next_objective_after_gain')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('next_objective_after_gain')
    expect(warnReport.missed.find((item: any) => item.key === 'next_objective_after_gain')?.label).toBe('提升后下一目标')
    expect(warnReport.next_actions.join('；')).toContain('提升后')
  })

  test('reads information flow sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '残阵问道' }
    const chapter = {
      id: 26,
      chapter_no: 26,
      title: '旧账缺页',
      raw_payload: {
        preDraftBrief: {
          informationFlowContract: {
            sceneInformationUnits: ['旧账缺页被质疑', '证人被执事逼迫改口', '空白账页证明编号被调换'],
            revealOrder: ['先让执事压旧账缺页', '再让证人改口', '最后亮空白账页'],
            suspenseResponses: ['空白账页背面还有禁库编号'],
            transitionCompressionRules: ['过渡不是填充，没有信息量就删掉。'],
            noInfodumpGuardrails: ['信息必须随审问冲突释放，不写背景说明书。'],
            qualityChecks: ['每个信息团必须能一句话概括。'],
          },
        },
      },
    }

    const report = buildInformationFlowSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 26, title: '旧账缺页' } },
      '旧账制度有很多历史，众人走过长廊，又互相寒暄。事情进入下一阶段。',
    )

    expect(report.label).toContain('信息流缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('空白账页')
    expect(report.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['信息团', '过渡压缩', '背景说明书']))
    expect(report.quality_checks.join('｜')).toContain('每个信息团必须能一句话概括')
  })

  test('story state sync persists an information_flow_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: informationFlowSync, reviewType: 'information_flow_sync'")
    expect(source).toContain('buildInformationFlowSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.information_flow_sync = informationFlowSync')
  })

})

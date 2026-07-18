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

describe('prose word target expansion a', () => {
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
})

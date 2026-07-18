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

describe('normalizeSceneCardsPayload b b', () => {
  test('projects timeline-delta carry-over into scene continuity fields', () => {
    const timelineRepair = '下一章必须补时间线：当前时间写回玄灯夜审，活动地点写回旧城西门，事件顺序必须先验许可再付代价，并给 source_excerpt 证据。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '夜审开场',
          purpose: '承接玄灯夜审时间',
          beat: '旧城西门的夜审钟声响起。',
        },
        {
          title: '先验许可',
          purpose: '先验许可再谈代价',
          beat: '李玄先让石碑核验许可刻痕。',
        },
        {
          title: '代价落下',
          purpose: '把代价写成顺序结果',
          beat: '许可通过后，石碑才落下代价条文。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [timelineRepair],
        },
      },
    })

    expect(sceneCards[0].transition_from_previous).toContain(timelineRepair)
    expect(sceneCards[0].required_information).toContain(timelineRepair)
    expect(sceneCards[1].required_information).toContain(timelineRepair)
    expect(sceneCards[2].state_changes_expected).toContain(timelineRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('时间线')
    expect(sceneCards[2].serial_risk_repairs).toContain('时间线')
  })

  test('projects character-state carry-over into scene state continuity fields', () => {
    const characterStateRepair = '下一章必须补角色状态：李玄位置写回旧城西门夜审，伤势是右臂裂纹灼痛，持有物是玄灯许可半亮，关系态度是对林青禾暂时信任，知识边界是只知道门规代价未知道幕后主使，并给 source_excerpt 证据。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '夜审伤势',
          purpose: '承接李玄位置和伤势',
          beat: '李玄站在旧城西门，右臂裂纹仍在发烫。',
        },
        {
          title: '半亮许可',
          purpose: '承接持有物和信任态度',
          beat: '他把半亮的玄灯许可递给林青禾核验。',
        },
        {
          title: '知识边界',
          purpose: '守住未知幕后主使',
          beat: '李玄只确认门规代价，还不知道是谁改过石碑。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [characterStateRepair],
        },
      },
    })

    expect(sceneCards[0].transition_from_previous).toContain(characterStateRepair)
    expect(sceneCards[0].required_information).toContain(characterStateRepair)
    expect(sceneCards[1].state_changes_expected).toContain(characterStateRepair)
    expect(sceneCards[2].character_voice).toContain(characterStateRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('角色状态')
    expect(sceneCards[0].serial_risk_repairs).not.toContain('时间线')
  })

  test('projects asset-state carry-over into scene setting state fields', () => {
    const assetStateRepair = '下一章必须补资产状态：关键资产玄灯许可归属写回李玄临时持有，可见性是半亮不可公开，触发条件是旧城西门夜审通过，限制是只能用一次，风险和后果是暴露裂纹阵盘，并给 source_excerpt 证据。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '临时持有',
          purpose: '确认玄灯许可归属',
          beat: '李玄把半亮的玄灯许可收进袖中。',
        },
        {
          title: '夜审触发',
          purpose: '确认触发条件和限制',
          beat: '夜审通过后，许可只亮起一次。',
        },
        {
          title: '暴露风险',
          purpose: '让风险和后果进入局势',
          beat: '许可熄灭时，裂纹阵盘的纹路被门规石碑照出。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [assetStateRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(assetStateRepair)
    expect(sceneCards[0].used_settings).toContain(assetStateRepair)
    expect(sceneCards[1].revealed_settings).toContain(assetStateRepair)
    expect(sceneCards[2].state_changes_expected).toContain(assetStateRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('资产状态')
  })

  test('projects relationship-delta carry-over into scene relationship state fields', () => {
    const relationshipDeltaRepair = '下一章必须补关系增量：李玄和林青禾的信任从试探转为临时联盟，阶段边界是仍不共享幕后主使，代价是林青禾替他作证后欠下门规人情。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '试探联盟',
          purpose: '让信任从试探推进到临时联盟',
          beat: '林青禾没有立刻交出证词，而是先问李玄准备付什么代价。',
        },
        {
          title: '替他作证',
          purpose: '让关系代价落地',
          beat: '林青禾替李玄作证，门规石碑记下她的人情。',
        },
        {
          title: '边界保留',
          purpose: '守住仍不共享幕后主使的阶段边界',
          beat: '李玄谢过她，却没有说出自己怀疑的幕后主使。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [relationshipDeltaRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(relationshipDeltaRepair)
    expect(sceneCards[1].action_beats).toContain(relationshipDeltaRepair)
    expect(sceneCards[1].character_voice).toContain(relationshipDeltaRepair)
    expect(sceneCards[2].state_changes_expected).toContain(relationshipDeltaRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('关系增量')
  })

  test('projects chapter-handoff-delta carry-over into scene handoff fields', () => {
    const handoffDeltaRepair = '下一章必须补章末交接：最后一幕是玄灯许可半亮，开放问题是谁改过门规石碑，下一章拉力是李玄必须在夜审前找到第二个证人，开篇承接义务是先接住许可代价。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '许可代价',
          purpose: '先接住上一章许可代价',
          beat: '李玄看着半亮的玄灯许可，没有立刻离开旧城西门。',
        },
        {
          title: '门规疑点',
          purpose: '推进谁改过门规石碑的开放问题',
          beat: '门规石碑的刻痕比夜审前多出一道。',
        },
        {
          title: '第二个证人',
          purpose: '留下夜审前找到第二个证人的拉力',
          beat: '钟声再响前，李玄必须找到第二个证人。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [handoffDeltaRepair],
        },
      },
    })

    expect(sceneCards[0].transition_from_previous).toContain(handoffDeltaRepair)
    expect(sceneCards[0].required_information).toContain(handoffDeltaRepair)
    expect(sceneCards[1].state_changes_expected).toContain(handoffDeltaRepair)
    expect(sceneCards[2].reader_payoff).toContain(handoffDeltaRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(handoffDeltaRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('章末交接')
    expect(sceneCards[0].serial_risk_repairs).not.toContain('章首承接')
  })

  test('projects revision-cascade carry-over into scene continuity fields', () => {
    const revisionCascadeRepair = '下一章必须处理 revision_cascade_impact：修订后正史从“林青禾直接交出旧印”改为“只交半枚印纹”，后续状态边界不能回滚；开篇用半枚印纹承接，中段用有限作证推进，章末提示缺页连锁影响。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '半枚印纹',
          purpose: '承接修订后的正史',
          beat: '林青禾只把半枚印纹按在桌沿。',
        },
        {
          title: '有限作证',
          purpose: '按修订后的边界推进',
          beat: '她替李玄证明印纹来源，却没有交出完整旧印。',
        },
        {
          title: '缺页连锁',
          purpose: '把修订影响传到后续章节',
          beat: '半枚印纹只能对上账册缺页的一角。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [revisionCascadeRepair],
        },
      },
    })

    expect(sceneCards[0].transition_from_previous).toContain(revisionCascadeRepair)
    expect(sceneCards[0].required_information).toContain(revisionCascadeRepair)
    expect(sceneCards[1].action_beats).toContain(revisionCascadeRepair)
    expect(sceneCards[1].state_changes_expected).toContain(revisionCascadeRepair)
    expect(sceneCards[2].reader_payoff).toContain(revisionCascadeRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(revisionCascadeRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('修订级联')
    expect(sceneCards[2].serial_risk_repairs).toContain('修订级联')
  })

  test('projects prose-revision-receipt carry-over into scene repair fields', () => {
    const revisionReceiptRepair = '下一章必须复核 prose_revision_receipt：上一章修订回执仍有 delivered=false，证据泛化，remaining_risk 是“修订后仍用概括句跳过破局过程”；本章每场必须把修订残留改成可验证的现场证据。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '重新验印',
          purpose: '把修订残留转成现场证据',
          beat: '李玄重新把半枚印纹压到灯下。',
        },
        {
          title: '补破局过程',
          purpose: '不再用概括句跳过破局',
          beat: '他逐步比对印纹缺口和账册缺页。',
        },
        {
          title: '证据落点',
          purpose: '让读者看到修订残留被补回',
          beat: '缺页边角和半枚印纹严丝合缝。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [revisionReceiptRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(revisionReceiptRepair)
    expect(sceneCards[1].required_beats).toContain(revisionReceiptRepair)
    expect(sceneCards[1].action_beats).toContain(revisionReceiptRepair)
    expect(sceneCards[0].required_information).toContain(revisionReceiptRepair)
    expect(sceneCards[2].reader_payoff).toContain(revisionReceiptRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('修订回执')
    expect(sceneCards[2].serial_risk_repairs).toContain('修订回执')
  })

  test('projects revision-receipt-check carry-over into scene repair fields', () => {
    const revisionReceiptCheckRepair = '下一章必须补 revision_receipt_checks：required_action 是重做破局过程，repair_segment 缺少现场动作，changed_evidence 不能只写“已修复”；本章要把 applied_fix 写成可定位动作和证据变化。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '重做破局',
          purpose: '把修订要求变成现场动作',
          beat: '李玄重新拆开旧印边角。',
        },
        {
          title: '证据变化',
          purpose: '让改动证据可定位',
          beat: '旧印内侧多出一行被刮掉的编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [revisionReceiptCheckRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(revisionReceiptCheckRepair)
    expect(sceneCards[0].required_information).toContain(revisionReceiptCheckRepair)
    expect(sceneCards[0].required_beats).toContain(revisionReceiptCheckRepair)
    expect(sceneCards[1].action_beats).toContain(revisionReceiptCheckRepair)
    expect(sceneCards[1].reader_payoff).toContain(revisionReceiptCheckRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('修订回执检查')
    expect(sceneCards[1].serial_risk_repairs).toContain('修订回执检查')
  })

  test('projects revision-scope-guard carry-over into scene scope fields', () => {
    const revisionScopeRepair = '下一章必须执行 revision_scope_guard：上一轮修订差异超过 allowed_delta_word_count，后续修订只能局部补证据，不能新增支线、替换核心梗、删除伏笔钩子或角色特征；本章场景要先标明保留项再推进。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '保留半印',
          purpose: '先标明必须保留的伏笔',
          beat: '李玄把半枚印纹重新摊开。',
        },
        {
          title: '局部补证据',
          purpose: '只补缺口不重写方向',
          beat: '他只核对缺页边角，没有另开新支线。',
        },
        {
          title: '钩子不删',
          purpose: '保留章末拉力',
          beat: '缺页背面的旧编号仍指向禁库。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [revisionScopeRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(revisionScopeRepair)
    expect(sceneCards[0].required_information).toContain(revisionScopeRepair)
    expect(sceneCards[1].required_beats).toContain(revisionScopeRepair)
    expect(sceneCards[1].state_changes_expected).toContain(revisionScopeRepair)
    expect(sceneCards[2].reader_payoff).toContain(revisionScopeRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('修订幅度')
    expect(sceneCards[2].serial_risk_repairs).toContain('修订幅度')
  })

  test('projects revision-directive carry-over into scene execution fields', () => {
    const revisionDirectiveRepair = 'revision_directives: preserve the witness choice, show the clue handoff on page, add a consequence, and keep the next-scene state change explicit.'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '选择落地',
          purpose: '让证人选择可见',
          beat: '证人把编号推回桌面。',
        },
        {
          title: '线索交接',
          purpose: '现场完成线索交接',
          beat: '林青禾接过缺页，立刻改口。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [revisionDirectiveRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(revisionDirectiveRepair)
    expect(sceneCards[0].required_information).toContain(revisionDirectiveRepair)
    expect(sceneCards[0].required_beats).toContain(revisionDirectiveRepair)
    expect(sceneCards[1].action_beats).toContain(revisionDirectiveRepair)
    expect(sceneCards[1].state_changes_expected).toContain(revisionDirectiveRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(revisionDirectiveRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('修订指令')
    expect(sceneCards[1].serial_risk_repairs).toContain('修订指令')
  })

  test('projects focused revision modes into scene execution fields', () => {
    const focusedModeRepair = 'focused_revision_modes: expand_action, cut_description, tighten_pacing, add_consequence; action_detail must become visible scene action instead of summary.'
    const hookModeRepair = 'focused_revision_modes: restore_hook; ending pull must remain visible for the next chapter.'
    const settingModeRepair = 'focused_revision_modes: repair_setting_violation; ability cost, item ownership, rule trigger, and knowledge boundary must remain consistent.'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '动作补足',
          purpose: '把模式修订落成动作',
          beat: '李玄压低肩线冲进旧巷。',
        },
        {
          title: '代价落地',
          purpose: '补后果和设定代价',
          beat: '旧印发冷，他把左手藏进袖口。',
        },
        {
          title: '钩子保留',
          purpose: '保留章末拉力',
          beat: '巷底门缝里传来同频敲击。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [focusedModeRepair, hookModeRepair, settingModeRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(focusedModeRepair)
    expect(sceneCards[1].required_beats).toContain(focusedModeRepair)
    expect(sceneCards[1].action_beats).toContain(focusedModeRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(focusedModeRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(hookModeRepair)
    expect(sceneCards[0].used_settings).toContain(settingModeRepair)
    expect(sceneCards[1].forbidden_settings).toContain(settingModeRepair)
    expect(sceneCards[2].state_changes_expected).toContain(settingModeRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('定向修订')
    expect(sceneCards[2].serial_risk_repairs).toContain('定向修订')
  })

  test('projects craft metric carry-over into scene execution fields', () => {
    const actionMetricRepair = 'craft_metrics.action_detail_score=54: fix action_detail_score by writing start, reaction, space change, resource loss, counter, result.'
    const densityMetricRepair = 'craft_metrics.event_density_score=61: fix event_density_score so every 3-5 paragraphs changes action, choice, information, or relationship.'
    const descriptionMetricRepair = 'craft_metrics.description_overuse_score=86: fix description_overuse_score by keeping only details that affect action space or danger judgment.'
    const settingMetricRepair = 'craft_metrics.setting_consistency_score=58: fix setting_consistency_score for ability cost, item ownership, rule trigger, and knowledge boundary.'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '起手反应',
          purpose: '补动作链',
          beat: '李玄先出手试门，再被门内寒意逼退。',
        },
        {
          title: '信息变化',
          purpose: '提高事件密度',
          beat: '林青禾从账册缺页里找出旧门编号。',
        },
        {
          title: '设定校准',
          purpose: '校准设定一致性',
          beat: '旧印只在三息内发冷，归属仍由林青禾保管。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [actionMetricRepair, densityMetricRepair, descriptionMetricRepair, settingMetricRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(actionMetricRepair)
    expect(sceneCards[0].action_beats).toContain(actionMetricRepair)
    expect(sceneCards[1].required_beats).toContain(densityMetricRepair)
    expect(sceneCards[1].action_beats).toContain(densityMetricRepair)
    expect(sceneCards[0].style_directives).toContain(descriptionMetricRepair)
    expect(sceneCards[2].used_settings).toContain(settingMetricRepair)
    expect(sceneCards[2].forbidden_settings).toContain(settingMetricRepair)
    expect(sceneCards[2].state_changes_expected).toContain(settingMetricRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('正文工艺指标')
    expect(sceneCards[2].serial_risk_repairs).toContain('正文工艺指标')
  })

  test('projects five-dimension score carry-over into scene execution fields', () => {
    const coreScoreRepair = 'five_dimension_scores.core_consistency=72: restore the chapter core conflict around rule pressure and visible payoff.'
    const surfaceScoreRepair = 'five_dimension_scores.surface_rewrite=69; readability=70: replace summary prose with concrete action, clipped dialogue, and cleaner sentence rhythm.'
    const logicScoreRepair = 'five_dimension_scores.format_consistency=73; logic_coherence=71: preserve scene format and make cause, consequence, state change, and clue handoff explicit.'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '核心冲突',
          purpose: '把核心压力压回现场',
          beat: '李玄被旧门规则挡住，只能当场反制。',
        },
        {
          title: '动作替代',
          purpose: '用动作和短对白替换总结',
          beat: '林青禾看向他袖口，他只说：别碰。',
        },
        {
          title: '因果交接',
          purpose: '把线索和状态交接清楚',
          beat: '旧印冷下去，门缝里多出下一枚编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [coreScoreRepair, surfaceScoreRepair, logicScoreRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(coreScoreRepair)
    expect(sceneCards[0].conflict).toContain(coreScoreRepair)
    expect(sceneCards[1].prose_craft_directives).toContain(surfaceScoreRepair)
    expect(sceneCards[1].style_directives).toContain(surfaceScoreRepair)
    expect(sceneCards[2].required_information).toContain(logicScoreRepair)
    expect(sceneCards[2].state_changes_expected).toContain(logicScoreRepair)
    expect(sceneCards[2].action_beats).toContain(logicScoreRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('质量五维')
    expect(sceneCards[2].serial_risk_repairs).toContain('质量五维')
  })

  test('projects quality structure progression information checks into scene execution fields', () => {
    const structureRepair = 'structure_checks.opening_hook=missing; middle_progression=weak; situation_change=unclear; ending_page_turn=missing.'
    const progressionRepair = 'progression_checks.non_deletable_change=false; mainline_shift=missing; relationship_or_state_change=missing; compressed_water=required.'
    const informationRepair = 'information_checks.new_concept_count=5; action_bound_info=missing; conflict_release=missing; reader_first_scene=unclear.'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '开头钩子',
          purpose: '先给结构钩子',
          beat: '旧门先响了一声。',
        },
        {
          title: '中段推进',
          purpose: '把推进写成不可删除变化',
          beat: '林青禾用缺页逼管事改口。',
        },
        {
          title: '信息收束',
          purpose: '让信息跟冲突走',
          beat: '编号只露出一半，指向下一扇门。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [structureRepair, progressionRepair, informationRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(structureRepair)
    expect(sceneCards[0].opening_hook).toContain(structureRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(structureRepair)
    expect(sceneCards[1].required_beats).toContain(progressionRepair)
    expect(sceneCards[1].action_beats).toContain(progressionRepair)
    expect(sceneCards[1].state_changes_expected).toContain(progressionRepair)
    expect(sceneCards[2].required_information).toContain(informationRepair)
    expect(sceneCards[2].information_gap).toContain(informationRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('质量专项')
    expect(sceneCards[2].serial_risk_repairs).toContain('质量专项')
  })

  test('projects platform and content rubric checks into scene execution fields', () => {
    const platformRepair = 'platform_checks.opening_pace=weak; payoff_density=low; reader_expectation=unclear; page_turn_pull=missing.'
    const contentRepair = 'content_rubric_checks.core_selling_point=unclear; conflict_progression=flat; chapter_change=missing; page_turn_reason=missing.'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '平台开头',
          purpose: '先满足平台节奏',
          beat: '旧门第一声响起，学生证同时变黑。',
        },
        {
          title: '内容变化',
          purpose: '把黄金三问落到正文',
          beat: '李玄用旧印逼规则露出新编号。',
        },
        {
          title: '翻页理由',
          purpose: '保留下一章拉力',
          beat: '编号背后还有半个名字没有显出来。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [platformRepair, contentRepair],
        },
      },
    })

    expect(sceneCards[0].opening_hook).toContain(platformRepair)
    expect(sceneCards[2].reader_payoff).toContain(platformRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(platformRepair)
    expect(sceneCards[0].purpose_tags).not.toContain(contentRepair)
    expect(sceneCards[1].conflict).toContain(contentRepair)
    expect(sceneCards[1].required_beats).toContain(contentRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(contentRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('平台/内容基准')
    expect(sceneCards[2].serial_risk_repairs).toContain('平台/内容基准')
  })

  test('projects deterministic-cleanup carry-over into scene prose hygiene fields', () => {
    const deterministicCleanupRepair = '下一章必须执行 deterministic_prose_cleanup：硬扫残留 Gate A 禁用词和模板表达，删除“某种意义上”“此时此刻”等 AI 签名，把抽象总结改成动作反应；每个场景都要保留为去AI味指令。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '动作替代',
          purpose: '用动作替代抽象总结',
          beat: '李玄把半枚印纹按到灯下。',
        },
        {
          title: '删除模板',
          purpose: '清掉模板表达',
          beat: '他不再解释意义，只让缺页边角自己对上印纹。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [deterministicCleanupRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(deterministicCleanupRepair)
    expect(sceneCards[1].prose_craft_directives).toContain(deterministicCleanupRepair)
    expect(sceneCards[0].style_directives).toContain(deterministicCleanupRepair)
    expect(sceneCards[1].required_beats).toContain(deterministicCleanupRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('确定性清理')
    expect(sceneCards[1].serial_risk_repairs).toContain('确定性清理')
  })

  test('projects banned-word carry-over into scene prose hygiene fields', () => {
    const bannedWordRepair = 'Next chapter must resolve banned_words_checks: matched_word=ceremonial abstraction, level=hard, location=ending; replacement=physical action and clipped reply; remaining_risk=the banned phrase must not appear again.'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '动作替换',
          purpose: '用动作替换禁用词',
          beat: '李玄把旧印压进烛泪里。',
        },
        {
          title: '短对白收束',
          purpose: '用短对白替代章末抽象总结',
          beat: '林青禾问他还剩多久，他只答：三息。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [bannedWordRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(bannedWordRepair)
    expect(sceneCards[0].style_directives).toContain(bannedWordRepair)
    expect(sceneCards[1].required_beats).toContain(bannedWordRepair)
    expect(sceneCards[1].recent_fatigue_action).toContain(bannedWordRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('禁用词')
    expect(sceneCards[1].serial_risk_repairs).toContain('禁用词')
  })

  test('projects deslop-repair receipt carry-over into scene anti-ai repair fields', () => {
    const deslopReceiptRepair = '下一章必须复核去AI回执：deslop_repair_receipts remaining_risk 是 Gate A 模板表达仍残留，changed_evidence 无法定位；本章每场要把抽象总结改成动作反应，用短对白和物件变化证明去AI味已经落成。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '动作反应',
          purpose: '把抽象总结改成动作',
          beat: '李玄把旧账册摊开，指尖停在缺页毛边。',
        },
        {
          title: '短对白',
          purpose: '用短对白替代解释腔',
          beat: '林青禾问证据，他只答：看编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [deslopReceiptRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(deslopReceiptRepair)
    expect(sceneCards[0].style_directives).toContain(deslopReceiptRepair)
    expect(sceneCards[1].required_beats).toContain(deslopReceiptRepair)
    expect(sceneCards[1].action_beats).toContain(deslopReceiptRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(deslopReceiptRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('去AI回执')
    expect(sceneCards[1].serial_risk_repairs).toContain('去AI回执')
  })


})

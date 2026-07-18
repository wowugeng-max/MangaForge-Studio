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

describe('normalizeSceneCardsPayload contracts a', () => {
  test('projects readability-review carry-over into scene readability fields', () => {
    const readabilityRepair = '下一章必须调可读性：readability_review 分数低于 78，梗感不足，长句过密；把句子切短，优先动作和对白，减少解释腔，每个高密场景都要给读者一个能复述的爽点。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '短句推进',
          purpose: '用动作和对白推进',
          beat: '李玄把半枚印纹按亮，直接问林青禾缺页在哪里。',
        },
        {
          title: '复述爽点',
          purpose: '让读者能复述破局点',
          beat: '缺页边角和半枚印纹扣在一起，旧编号反亮。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [readabilityRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(readabilityRepair)
    expect(sceneCards[1].prose_craft_directives).toContain(readabilityRepair)
    expect(sceneCards[0].style_directives).toContain(readabilityRepair)
    expect(sceneCards[0].dialogue_goals).toContain(readabilityRepair)
    expect(sceneCards[1].reader_payoff).toContain(readabilityRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('可读性')
    expect(sceneCards[1].serial_risk_repairs).toContain('可读性')
  })
  test('projects governance-recheck carry-over into scene recovery fields', () => {
    const governanceRepair = '下一章必须验恢复依据：governance_recheck_sync 发现 failed_evidence 是样章策略没有落到对白交锋，watch_items 是继续观察节奏恢复；本章要把恢复依据写成可见冲突推进和读者回报。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '恢复依据入场',
          purpose: '把样章策略恢复依据放进现场',
          beat: '李玄没有旁白解释，直接把半枚印纹推到林青禾面前。',
        },
        {
          title: '对白交锋',
          purpose: '让节奏恢复落到对白交锋',
          beat: '林青禾追问来源，李玄用三句短答逼她作证。',
        },
        {
          title: '回报复查',
          purpose: '让读者看到治理恢复结果',
          beat: '她终于指向缺页背面的旧编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [governanceRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(governanceRepair)
    expect(sceneCards[1].required_beats).toContain(governanceRepair)
    expect(sceneCards[1].action_beats).toContain(governanceRepair)
    expect(sceneCards[1].state_changes_expected).toContain(governanceRepair)
    expect(sceneCards[2].reader_payoff).toContain(governanceRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('治理复查')
    expect(sceneCards[2].serial_risk_repairs).toContain('治理复查')
  })
  test('projects chapter-title carry-over into scene promise fields', () => {
    const titleRepair = '下一章必须修标题：chapter_title_uniqueness_sync 发现标题“旧印追查”与前文重复，标题承诺要改成“半印照出缺页”，正文开篇必须立起半印照缺页的差异化画面，章末回收标题卖点。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '半印入灯',
          purpose: '让标题承诺先入场',
          beat: '李玄把半枚印纹压到灯下，缺页边缘泛出旧光。',
        },
        {
          title: '缺页成证',
          purpose: '推进标题差异化画面',
          beat: '缺页边角和半枚印纹扣住同一道旧编号。',
        },
        {
          title: '标题回收',
          purpose: '让章末回收标题卖点',
          beat: '旧编号在缺页背面照出禁库门名。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [titleRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(titleRepair)
    expect(sceneCards[0].required_information).toContain(titleRepair)
    expect(sceneCards[0].opening_hook).not.toContain(titleRepair)
    expect(sceneCards[1].required_beats).toContain(titleRepair)
    expect(sceneCards[2].reader_payoff).toContain(titleRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(titleRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('章节标题')
    expect(sceneCards[2].serial_risk_repairs).toContain('章节标题')
  })
  test('projects prose-quality gate carry-over into scene quality fields', () => {
    const qualityGateRepair = '下一章必须修质量门禁：prose_quality 复盘审稿出现 S1 问题，质量五维低分，平台适配和内容基准都未过；本章每场必须补清晰冲突、短周期回报和可见角色选择，章末给出质量门禁可复核的读者回报。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '清晰冲突',
          purpose: '先补平台适配需要的清晰冲突',
          beat: '执事当场拒绝李玄入库。',
        },
        {
          title: '角色选择',
          purpose: '让内容基准落到角色选择',
          beat: '李玄选择押上半枚印纹换一次核验。',
        },
        {
          title: '短周期回报',
          purpose: '让读者看到章内回报',
          beat: '禁库门名在缺页背面亮起。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [qualityGateRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(qualityGateRepair)
    expect(sceneCards[1].required_beats).toContain(qualityGateRepair)
    expect(sceneCards[1].action_beats).toContain(qualityGateRepair)
    expect(sceneCards[0].purpose_tags).not.toContain(qualityGateRepair)
    expect(sceneCards[2].reader_payoff).toContain(qualityGateRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('质量门禁')
    expect(sceneCards[2].serial_risk_repairs).toContain('质量门禁')
  })
  test('projects quality-audit repair receipt carry-over into scene quality repair fields', () => {
    const qualityAuditReceiptRepair = '下一章必须复核质量修复回执：quality_audit_repair_receipts 显示 quality_audit_checks 的事件内容比重仍低，changed_evidence 只写“已加强”，remaining_risk 是短周期回报没有正文证据；本章要把现场冲突、信息变化和读者回报写成可定位事件。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '现场冲突',
          purpose: '把事件内容比重拉高',
          beat: '执事当众扣住账本残页。',
        },
        {
          title: '信息变化',
          purpose: '让信息跟冲突走',
          beat: '李玄逼证人改口，旧编号被说出。',
        },
        {
          title: '短回报',
          purpose: '补短周期回报证据',
          beat: '缺页背面亮出禁库门名。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [qualityAuditReceiptRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(qualityAuditReceiptRepair)
    expect(sceneCards[1].required_beats).toContain(qualityAuditReceiptRepair)
    expect(sceneCards[1].action_beats).toContain(qualityAuditReceiptRepair)
    expect(sceneCards[1].state_changes_expected).toContain(qualityAuditReceiptRepair)
    expect(sceneCards[2].reader_payoff).toContain(qualityAuditReceiptRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('质量修复回执')
    expect(sceneCards[2].serial_risk_repairs).toContain('质量修复回执')
  })
  test('projects perspective-review carry-over into scene editorial repair fields', () => {
    const perspectiveRepair = '下一章必须处理多视角审查：perspective_review 里商业编辑 CONCERNS 认为冲突不够可见，读者视角 REJECT 认为回报不清楚；本章要把 reviewer evidence 改成现场阻碍、角色选择和可复述读者回报。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '阻碍上桌',
          purpose: '把商业编辑指出的冲突写成现场阻碍',
          beat: '执事把禁库钥牌扣在桌下。',
        },
        {
          title: '选择押注',
          purpose: '让角色选择承担代价',
          beat: '李玄押上半枚旧印换一次开门核验。',
        },
        {
          title: '回报清楚',
          purpose: '让读者视角能复述本章回报',
          beat: '禁库门名在旧印背面反亮。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [perspectiveRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(perspectiveRepair)
    expect(sceneCards[0].purpose_tags).not.toContain(perspectiveRepair)
    expect(sceneCards[1].required_beats).toContain(perspectiveRepair)
    expect(sceneCards[1].conflict).toContain(perspectiveRepair)
    expect(sceneCards[2].reader_payoff).toContain(perspectiveRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('多视角审查')
    expect(sceneCards[2].serial_risk_repairs).toContain('多视角审查')
  })
  test('projects delivery-risk-receipt carry-over into scene handoff repair fields', () => {
    const deliveryReceiptRepair = '下一章必须复核承接：delivery_risk_receipts delivered=false，risk_item 是上一章章末第三个名字未兑现，required_action 是开篇承接第三个名字，中段让第三个名字改变证人立场，ending_actions 要留下新风险；remaining_risk 不能只在旁白里声明已处理。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '第三个名字开篇',
          purpose: '承接上一章章末名字',
          beat: '李玄把第三个名字写到案桌中央。',
        },
        {
          title: '证人立场变化',
          purpose: '让第三个名字改变证人立场',
          beat: '证人看见名字后撤回旧证词。',
        },
        {
          title: '新风险章末',
          purpose: '留下新风险',
          beat: '名字背后浮出禁库追缉令。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [deliveryReceiptRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(deliveryReceiptRepair)
    expect(sceneCards[1].required_beats).toContain(deliveryReceiptRepair)
    expect(sceneCards[1].action_beats).toContain(deliveryReceiptRepair)
    expect(sceneCards[1].state_changes_expected).toContain(deliveryReceiptRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(deliveryReceiptRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('交稿回执')
    expect(sceneCards[2].serial_risk_repairs).toContain('交稿回执')
  })
  test('projects serial-risk-repair carry-over into scene momentum repair fields', () => {
    const serialRepair = '下一章必须补近章风险修复：serial_risk_repair_checks 显示 scene_cards.serial_risk_repairs 和 recent_fatigue_action 未落成正文；本章要把目标推进、阻碍升级、新信息、关系/世界调剂或冲突冷却写成可见事件。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '目标推进',
          purpose: '把近章风险修复改成目标推进',
          beat: '李玄拿到账本编号的新线索。',
        },
        {
          title: '阻碍升级',
          purpose: '让阻碍升级成现场压力',
          beat: '执事封住证人家门。',
        },
        {
          title: '关系调剂',
          purpose: '用关系调剂缓冲连续冲突',
          beat: '林青禾提醒李玄换路查证。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [serialRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(serialRepair)
    expect(sceneCards[1].action_beats).toContain(serialRepair)
    expect(sceneCards[1].state_changes_expected).toContain(serialRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(serialRepair)
    expect(sceneCards[2].reader_payoff).toContain(serialRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('近章风险修复')
    expect(sceneCards[2].serial_risk_repairs).toContain('近章风险修复')
  })
  test('projects next-chapter-quality-plan receipt carry-over into scene quality handoff fields', () => {
    const qualityPlanReceiptRepair = '下一章必须复检质量续航：next_chapter_quality_plan_receipts 缺失，quality_focus 是开篇压迫、middle_actions 是中段验证账本、ending_actions 是章末留下追问，avoid_repetition 避免空钩子；本章要把 evidence_basis 写成可定位正文证据。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '压迫开篇',
          purpose: '把质量焦点落到开篇压力',
          beat: '执事当众扣住账本残页。',
        },
        {
          title: '中段验证',
          purpose: '用现场动作验证账本',
          beat: '李玄把账本编号和库门铭牌逐项对照。',
        },
        {
          title: '章末追问',
          purpose: '留下下一章追问',
          beat: '铭牌背后浮出第二本账册的编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [qualityPlanReceiptRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(qualityPlanReceiptRepair)
    expect(sceneCards[1].required_beats).toContain(qualityPlanReceiptRepair)
    expect(sceneCards[1].action_beats).toContain(qualityPlanReceiptRepair)
    expect(sceneCards[1].state_changes_expected).toContain(qualityPlanReceiptRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(qualityPlanReceiptRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('质量续航回执')
    expect(sceneCards[2].serial_risk_repairs).toContain('质量续航回执')
  })
  test('projects scene-card-receipt carry-over into scene evidence repair fields', () => {
    const sceneCardReceiptRepair = '下一章必须补场景回执：scene_card_receipts delivered=false，scene_start_anchor 和 scene_end_anchor 缺失，evidence 借用其他场景；本章要把 scene_goal、obstacle、action、turn、payoff、state_delta 写成可定位正文证据。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '目标上桌',
          purpose: '把场景目标写成可定位事件',
          beat: '李玄把账本残页推到审案桌中央。',
        },
        {
          title: '阻碍动作',
          purpose: '让阻碍和行动都可验证',
          beat: '执事夺页失败，反把库门印痕露出来。',
        },
        {
          title: '回报状态',
          purpose: '用回报和状态变化收场',
          beat: '林青禾确认印痕属于禁库内门。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [sceneCardReceiptRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(sceneCardReceiptRepair)
    expect(sceneCards[1].required_beats).toContain(sceneCardReceiptRepair)
    expect(sceneCards[1].action_beats).toContain(sceneCardReceiptRepair)
    expect(sceneCards[1].prose_craft_directives).toContain(sceneCardReceiptRepair)
    expect(sceneCards[1].state_changes_expected).toContain(sceneCardReceiptRepair)
    expect(sceneCards[2].reader_payoff).toContain(sceneCardReceiptRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('场景回执')
    expect(sceneCards[2].serial_risk_repairs).toContain('场景回执')
  })
  test('projects revision-context carry-over into scene continuity fields', () => {
    const revisionContextRepair = '下一章必须复核 revision_context_receipts：previous_chapter 半枚旧印仍在李玄手里，next_chapter 要承接禁库门名，foreshadowing、character_cards、timeline、setting_context、资产归属和关系边界都要用正文证据核对；本章第一场先接住上章缺口，中段同步状态，章末留下可追踪证据。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '接上半印',
          purpose: '先承接上章旧印缺口',
          beat: '李玄从袖中取出半枚旧印。',
        },
        {
          title: '核对状态',
          purpose: '同步角色和资产状态',
          beat: '他把旧印、缺页和林青禾证词逐项对上。',
        },
        {
          title: '留下证据',
          purpose: '把禁库门名留给下一章追踪',
          beat: '缺页背面的门名被拓进铜片。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [revisionContextRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(revisionContextRepair)
    expect(sceneCards[1].state_changes_expected).toContain(revisionContextRepair)
    expect(sceneCards[1].used_settings).toContain(revisionContextRepair)
    expect(sceneCards[2].revealed_settings).toContain(revisionContextRepair)
    expect(sceneCards[0].transition_from_previous).toContain(revisionContextRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('修订上下文')
    expect(sceneCards[2].serial_risk_repairs).toContain('修订上下文')
  })
  test('projects write-preparation carry-over into scene preparation fields', () => {
    const writePreparationRepair = '下一章必须修写前准备：write_preparation_checks 发现 source_gaps、asset_risks、creation_contract_checklist、blueprint_focus、reader_payoff_focus 和 must_confirm 没有落入正文；本章第一场补来源证据和资产风险，中段执行章节蓝图焦点，章末兑现读者回报。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '补来源证据',
          purpose: '把来源缺口放到现场',
          beat: '李玄翻出旧印来历的登记残页。',
        },
        {
          title: '执行蓝图焦点',
          purpose: '按细纲焦点推进',
          beat: '他用登记残页逼林青禾确认资产风险。',
        },
        {
          title: '回报兑现',
          purpose: '让读者看到写前准备落成',
          beat: '旧印风险变成可进入禁库的代价。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [writePreparationRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(writePreparationRepair)
    expect(sceneCards[0].required_information).toContain(writePreparationRepair)
    expect(sceneCards[0].used_settings).toContain(writePreparationRepair)
    expect(sceneCards[1].required_beats).toContain(writePreparationRepair)
    expect(sceneCards[2].reader_payoff).toContain(writePreparationRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('写前准备')
    expect(sceneCards[2].serial_risk_repairs).toContain('写前准备')
  })
  test('projects target-reader carry-over into scene reader payoff and action fields', () => {
    const targetReaderRepair = '下一章必须补目标读者：把规则反制爽点写成现场行动，让读者欲望、本章吸引点和可感知回报落到每个场景。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '规则压门',
          purpose: '让规则反制目标入场',
          beat: '协会会长宣布外来维修师不得接旧城订单。',
        },
        {
          title: '现场反制',
          purpose: '用现场行动满足读者欲望',
          beat: '李玄当众拆开旧印编号，逼协会改口。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [targetReaderRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(targetReaderRepair)
    expect(sceneCards[1].purpose_tags).not.toContain(targetReaderRepair)
    expect(sceneCards[0].action_beats).toContain(targetReaderRepair)
    expect(sceneCards[1].action_beats).toContain(targetReaderRepair)
    expect(sceneCards[0].reader_payoff).toContain(targetReaderRepair)
    expect(sceneCards[1].reader_payoff).toContain(targetReaderRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('目标读者')
    expect(sceneCards[1].serial_risk_repairs).toContain('目标读者')
  })
  test('projects conflict-structure carry-over into scene conflict and turning fields', () => {
    const conflictStructureRepair = '下一章必须补冲突结构：每个主要场景都要有真实阻止者、有进无出、行动阻拦和明确胜负变化，解决一条矛盾后激活下一冲突种子。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '协会封门',
          purpose: '让阻止者压住主角目标',
          beat: '协会成员挡在设备间门口。',
        },
        {
          title: '强验旧印',
          purpose: '让胜负结果翻转',
          beat: '李玄强行核验旧印编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [conflictStructureRepair],
        },
      },
    })

    expect(sceneCards[0].conflict).toContain(conflictStructureRepair)
    expect(sceneCards[1].conflict).toContain(conflictStructureRepair)
    expect(sceneCards[0].state_changes_expected).toContain(conflictStructureRepair)
    expect(sceneCards[1].state_changes_expected).toContain(conflictStructureRepair)
    expect(sceneCards[1].turning_point).toContain(conflictStructureRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('冲突结构')
    expect(sceneCards[1].serial_risk_repairs).toContain('冲突结构')
  })
  test('projects genre-positioning carry-over into scene genre promise fields', () => {
    const genrePositioningRepair = '下一章必须补题材定位：把赛博修仙品类卖点写成门派规则、法器交易和旧城升级承诺，不能偏成纯悬疑。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '门规压价',
          purpose: '让门派规则压住法器交易',
          beat: '外门执事按门规压低旧法器估价。',
        },
        {
          title: '旧城升级承诺',
          purpose: '兑现赛博修仙的品类卖点',
          beat: '李玄用阵纹芯片重算旧城灵轨。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [genrePositioningRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(genrePositioningRepair)
    expect(sceneCards[1].purpose_tags).not.toContain(genrePositioningRepair)
    expect(sceneCards[0].required_beats).toContain(genrePositioningRepair)
    expect(sceneCards[1].required_beats).toContain(genrePositioningRepair)
    expect(sceneCards[1].reader_payoff).toContain(genrePositioningRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('题材定位')
    expect(sceneCards[1].serial_risk_repairs).toContain('题材定位')
  })
  test('projects upgrade-rhythm carry-over into scene progression and payoff fields', () => {
    const upgradeRhythmRepair = '下一章必须补升级节奏：本章要给小目标升级、资源增量、能力反馈和新门槛，章尾打开下一层升级压力。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '小目标升级',
          purpose: '拿到旧城灵轨临时权限',
          beat: '李玄用旧印换到一次临时核验。',
        },
        {
          title: '新门槛',
          purpose: '把资源增量转成下一层压力',
          beat: '临时权限只够打开第一段灵轨。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [upgradeRhythmRepair],
        },
      },
    })

    expect(sceneCards[0].action_beats).toContain(upgradeRhythmRepair)
    expect(sceneCards[1].action_beats).toContain(upgradeRhythmRepair)
    expect(sceneCards[0].state_changes_expected).toContain(upgradeRhythmRepair)
    expect(sceneCards[1].reader_payoff).toContain(upgradeRhythmRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(upgradeRhythmRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('升级节奏')
    expect(sceneCards[1].serial_risk_repairs).toContain('升级节奏')
  })
  test('projects continuity-heat carry-over into scene heat handoff fields', () => {
    const continuityHeatRepair = '下一章必须补连续性热度：承接上一章爆点余温，前半章兑现旧热度，中段加新压力，章末留高热未解问题。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '爆点余温',
          purpose: '承接上一章旧印翻面的热度',
          beat: '围观者还在争论旧印编号。',
        },
        {
          title: '高热未解',
          purpose: '章末留下新压力',
          beat: '旧印编号指向更高一层的禁库。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [continuityHeatRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(continuityHeatRepair)
    expect(sceneCards[1].required_beats).toContain(continuityHeatRepair)
    expect(sceneCards[0].information_gap).toContain(continuityHeatRepair)
    expect(sceneCards[1].information_gap).toContain(continuityHeatRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(continuityHeatRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('连续性热度')
    expect(sceneCards[1].serial_risk_repairs).toContain('连续性热度')
  })
  test('projects source-readiness carry-over into scene information and setting fields', () => {
    const sourceReadinessRepair = '下一章必须补来源就绪：旧印编号、禁库权限和林青禾证词都要有来源依据，缺口必须先写入场景信息需求，不能靠正文临时编。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧印复核',
          purpose: '复核旧印编号来源',
          beat: '李玄把旧印编号交给林青禾核验。',
        },
        {
          title: '禁库权限',
          purpose: '确认禁库权限依据',
          beat: '林青禾拿出上一章留下的权限凭条。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [sourceReadinessRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(sourceReadinessRepair)
    expect(sceneCards[1].required_information).toContain(sourceReadinessRepair)
    expect(sceneCards[0].used_settings).toContain(sourceReadinessRepair)
    expect(sceneCards[1].used_settings).toContain(sourceReadinessRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('来源就绪')
    expect(sceneCards[1].serial_risk_repairs).toContain('来源就绪')
  })
  test('projects intent-confirmation carry-over into scene purpose and beat fields', () => {
    const intentConfirmationRepair = '下一章必须补意图确认：所有场景都要服务本章目标“拿到禁库入口”，不能偏去解释旧城历史；每场结束要验证目标推进。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '入口目标',
          purpose: '把本章目标压到场面里',
          beat: '李玄要求先拿禁库入口位置。',
        },
        {
          title: '目标推进',
          purpose: '验证禁库入口是否推进',
          beat: '林青禾指出入口权限还差一枚旧印。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [intentConfirmationRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(intentConfirmationRepair)
    expect(sceneCards[1].purpose_tags).not.toContain(intentConfirmationRepair)
    expect(sceneCards[0].required_beats).toContain(intentConfirmationRepair)
    expect(sceneCards[1].required_beats).toContain(intentConfirmationRepair)
    expect(sceneCards[0].state_changes_expected).toContain(intentConfirmationRepair)
    expect(sceneCards[1].state_changes_expected).toContain(intentConfirmationRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('意图确认')
    expect(sceneCards[1].serial_risk_repairs).toContain('意图确认')
  })
  test('projects chapter-blueprint carry-over into scene beat sequence fields', () => {
    const chapterBlueprintRepair = '下一章必须补章节细纲：按细纲顺序执行 线索确认 -> 行动受阻 -> 付出代价 -> 小胜奖励，不能跳过代价只给奖励。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '线索确认',
          purpose: '确认旧印线索',
          beat: '李玄先确认旧印编号对应禁库。',
        },
        {
          title: '代价小胜',
          purpose: '受阻后付出代价再拿奖励',
          beat: '李玄冒着权限反噬打开第一道门。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [chapterBlueprintRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(chapterBlueprintRepair)
    expect(sceneCards[1].required_beats).toContain(chapterBlueprintRepair)
    expect(sceneCards[0].action_beats).toContain(chapterBlueprintRepair)
    expect(sceneCards[1].action_beats).toContain(chapterBlueprintRepair)
    expect(sceneCards[1].reader_payoff).toContain(chapterBlueprintRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('章节细纲')
    expect(sceneCards[1].serial_risk_repairs).toContain('章节细纲')
  })
  test('projects blueprint-consumption carry-over into scene execution fields', () => {
    const blueprintConsumptionRepair = '下一章必须补 blueprint_consumption_checks：blueprint_field=cost_reward，expected 是行动受阻后付出代价再拿奖励，missing_gap 是正文只给结果没有代价；本章要把缺口写成可见事件和章尾承接。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '行动受阻',
          purpose: '让细纲阻碍先落地',
          beat: '禁库门拒绝旧印权限。',
        },
        {
          title: '代价承接',
          purpose: '用代价换小胜并承接章尾',
          beat: '李玄割开掌心补齐旧印血线。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [blueprintConsumptionRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(blueprintConsumptionRepair)
    expect(sceneCards[0].required_beats).toContain(blueprintConsumptionRepair)
    expect(sceneCards[1].action_beats).toContain(blueprintConsumptionRepair)
    expect(sceneCards[1].state_changes_expected).toContain(blueprintConsumptionRepair)
    expect(sceneCards[1].reader_payoff).toContain(blueprintConsumptionRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(blueprintConsumptionRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('细纲兑现')
    expect(sceneCards[1].serial_risk_repairs).toContain('细纲兑现')
  })
  test('projects word-count carry-over into scene expansion guard fields', () => {
    const wordCountRepair = '下一章必须补 word_count_checks：current_count=2400，target_count=4200，min_required_count=3600；remaining_risk 是正文低于字数下限，但不得靠环境描写、重复情绪或内心独白凑字数，必须扩写动作过程、选择代价、对话交锋和章末钩子铺垫。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '动作过程',
          purpose: '把字数缺口补成动作链',
          beat: '李玄拆开旧印边角。',
        },
        {
          title: '对话代价',
          purpose: '用对话交锋和选择代价补足篇幅',
          beat: '林青禾逼他在保密和救人之间选择。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [wordCountRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(wordCountRepair)
    expect(sceneCards[0].required_beats).toContain(wordCountRepair)
    expect(sceneCards[1].action_beats).toContain(wordCountRepair)
    expect(sceneCards[1].dialogue_goals).toContain(wordCountRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(wordCountRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(wordCountRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('字数执行')
    expect(sceneCards[1].serial_risk_repairs).toContain('字数执行')
  })
  test('projects core-contract carry-over into scene promise and payoff fields', () => {
    const coreContractRepair = '下一章必须补核心契约：核心承诺是旧城规则反制带来可见翻盘，前中后都不能漂移成单纯查案；必须把核心冲突和读者回报写进场景。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '规则压身',
          purpose: '把核心冲突压到现场',
          beat: '旧城管事按规则拒绝李玄入库。',
        },
        {
          title: '规则反制',
          purpose: '兑现旧城规则反制的核心承诺',
          beat: '李玄用旧印反过来锁住管事权限。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [coreContractRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(coreContractRepair)
    expect(sceneCards[1].purpose_tags).not.toContain(coreContractRepair)
    expect(sceneCards[0].conflict).toContain(coreContractRepair)
    expect(sceneCards[1].reader_payoff).toContain(coreContractRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(coreContractRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('核心契约')
    expect(sceneCards[1].serial_risk_repairs).toContain('核心契约')
  })
  test('projects setting-violation carry-over into scene setting guard fields', () => {
    const settingViolationRepair = '下一章必须修复 setting_violations：设定违规-规则触发，旧印只能在禁库门三息内触发，能力代价是左臂失温，物品归属仍属于林青禾；角色认知边界不能提前知道黑塔许可，禁揭设定不得泄露终局门名。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '三息触发',
          purpose: '按正确规则触发旧印',
          beat: '李玄等禁库门第三声落下才按住旧印。',
        },
        {
          title: '认知边界',
          purpose: '守住角色不知道黑塔许可的边界',
          beat: '林青禾只说旧印归她保管，没有说出终局门名。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [settingViolationRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(settingViolationRepair)
    expect(sceneCards[0].used_settings).toContain(settingViolationRepair)
    expect(sceneCards[1].forbidden_settings).toContain(settingViolationRepair)
    expect(sceneCards[1].state_changes_expected).toContain(settingViolationRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(settingViolationRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('设定违规')
    expect(sceneCards[1].serial_risk_repairs).toContain('设定违规')
  })
  test('projects female-audience carry-over into scene emotion and relationship fields', () => {
    const femaleAudienceRepair = '下一章必须补女频长篇：把关系张力、情感选择、女性视角安全感和尊严感写成场景变化，不能只写升级打脸。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '边界选择',
          purpose: '让林青禾作出情感选择',
          beat: '林青禾拒绝替李玄背锅，但主动递出证词。',
        },
        {
          title: '尊严回收',
          purpose: '让关系张力变成尊严感回报',
          beat: '李玄当众承认她的证词价值。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [femaleAudienceRepair],
        },
      },
    })

    expect(sceneCards[0].emotional_tone).toContain(femaleAudienceRepair)
    expect(sceneCards[1].emotional_tone).toContain(femaleAudienceRepair)
    expect(sceneCards[0].character_voice).toContain(femaleAudienceRepair)
    expect(sceneCards[1].state_changes_expected).toContain(femaleAudienceRepair)
    expect(sceneCards[1].reader_payoff).toContain(femaleAudienceRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('女频长篇')
    expect(sceneCards[1].serial_risk_repairs).toContain('女频长篇')
  })
  test('projects chapter-benchmark carry-over into scene benchmark and beat fields', () => {
    const chapterBenchmarkRepair = '下一章必须补章节基准：按对标章节节奏基准安排开局压迫、三段升级和章尾回收，只学节奏不复制桥段。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '开局压迫',
          purpose: '按节奏基准先压主角',
          beat: '旧城管事先关掉禁库外门。',
        },
        {
          title: '章尾回收',
          purpose: '用章尾回收承接下一章',
          beat: '第一道门打开后露出第二层禁令。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [chapterBenchmarkRepair],
        },
      },
    })

    expect(sceneCards[0].benchmark_recall_directives).toContain(chapterBenchmarkRepair)
    expect(sceneCards[1].benchmark_recall_directives).toContain(chapterBenchmarkRepair)
    expect(sceneCards[0].required_beats).toContain(chapterBenchmarkRepair)
    expect(sceneCards[1].required_beats).toContain(chapterBenchmarkRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(chapterBenchmarkRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('章节基准')
    expect(sceneCards[1].serial_risk_repairs).toContain('章节基准')
  })
  test('projects runway carry-over into scene long-line direction fields', () => {
    const runwayRepair = '下一章必须补航线：所有场景都要把旧城禁库线推向主线终点，不能被支线查案带偏；章尾必须留下通往黑塔许可的新航点。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '禁库航点',
          purpose: '把旧城禁库线推向主线',
          beat: '李玄确认禁库权限和黑塔许可有关。',
        },
        {
          title: '黑塔许可',
          purpose: '章尾留下新航点',
          beat: '禁库门后露出黑塔许可编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [runwayRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(runwayRepair)
    expect(sceneCards[1].purpose_tags).not.toContain(runwayRepair)
    expect(sceneCards[0].required_beats).toContain(runwayRepair)
    expect(sceneCards[1].state_changes_expected).toContain(runwayRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(runwayRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('航线')
    expect(sceneCards[1].serial_risk_repairs).toContain('航线')
  })
  test('projects longform-check carry-over into scene serial quality fields', () => {
    const longformRepair = '下一章必须补 longform_checks：recent_5_chapter_progress 无明确进展，payoff_interval 过长，stage_goal_shift 未换挡，next_stage_pull 不足；本章要把长篇专项风险写成阶段目标推进、爽点回报和下一阶段牵引。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '阶段换挡',
          purpose: '推动最近五章停滞的主线',
          beat: '李玄把禁库许可从线索改成当场交易目标。',
        },
        {
          title: '下一阶段',
          purpose: '给读者明确下一阶段牵引',
          beat: '黑塔许可背后浮出试炼名册。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [longformRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(longformRepair)
    expect(sceneCards[0].required_beats).toContain(longformRepair)
    expect(sceneCards[1].state_changes_expected).toContain(longformRepair)
    expect(sceneCards[1].reader_payoff).toContain(longformRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(longformRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('长篇专项')
    expect(sceneCards[1].serial_risk_repairs).toContain('长篇专项')
  })
  test('projects signature-scene carry-over into scene spectacle and payoff fields', () => {
    const signatureSceneRepair = '下一章必须补招牌场面：禁库门开启要有强画面、可传播动作和读者记忆点，用旧印反锁全场权限形成视觉爽点。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧印反锁',
          purpose: '制造招牌动作',
          beat: '李玄把旧印按进门心阵槽。',
        },
        {
          title: '权限倒转',
          purpose: '形成视觉爽点',
          beat: '全场权限灯从红色倒转成金色。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [signatureSceneRepair],
        },
      },
    })

    expect(sceneCards[0].action_beats).toContain(signatureSceneRepair)
    expect(sceneCards[1].action_beats).toContain(signatureSceneRepair)
    expect(sceneCards[0].sensory_anchor).toContain(signatureSceneRepair)
    expect(sceneCards[1].reader_payoff).toContain(signatureSceneRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('招牌场面')
    expect(sceneCards[1].serial_risk_repairs).toContain('招牌场面')
  })
  test('projects story-unit carry-over into scene unit setup and payoff fields', () => {
    const storyUnitRepair = '下一章必须补剧情单元：本章单元要完成 目标建立 -> 阻碍升级 -> 代价选择 -> 结果回收，并把未闭合部分转成下一章承接。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '目标建立',
          purpose: '建立禁库入口目标',
          beat: '李玄明确本章必须拿到禁库入口。',
        },
        {
          title: '结果回收',
          purpose: '回收代价选择并留下承接',
          beat: '禁库打开，但黑塔许可变成下一章压力。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [storyUnitRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(storyUnitRepair)
    expect(sceneCards[0].required_beats).toContain(storyUnitRepair)
    expect(sceneCards[1].required_beats).toContain(storyUnitRepair)
    expect(sceneCards[1].reader_payoff).toContain(storyUnitRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(storyUnitRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('剧情单元')
    expect(sceneCards[1].serial_risk_repairs).toContain('剧情单元')
  })
  test('projects chapter-handoff carry-over into scene opening transition fields', () => {
    const chapterHandoffRepair = '下一章必须补章首承接：第一场先接上一章禁库门开启后的余波、角色状态和未解债务，再把余波转成新目标。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '禁库余波',
          purpose: '承接上一章禁库门开启',
          beat: '门后的冷光还压在众人脸上。',
        },
        {
          title: '新目标',
          purpose: '把未解债务转成新目标',
          beat: '黑塔许可编号逼李玄继续追查。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [chapterHandoffRepair],
        },
      },
    })

    expect(sceneCards[0].transition_from_previous).toContain(chapterHandoffRepair)
    expect(sceneCards[0].required_beats).toContain(chapterHandoffRepair)
    expect(sceneCards[0].state_changes_expected).toContain(chapterHandoffRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(chapterHandoffRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('章首承接')
    expect(sceneCards[1].serial_risk_repairs).toContain('章首承接')
  })
  test('projects opening carry-over into scene first-hook fields', () => {
    const openingRepair = '下一章必须补开篇设计：前50字先给异常、冲突或对话逼问，第一段就让主角进入压力，不能慢写环境。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '冷光逼问',
          purpose: '前50字给异常逼问',
          beat: '禁库门里的冷光照出第二枚旧印。',
        },
        {
          title: '压力推进',
          purpose: '让主角进入压力',
          beat: '管事要求李玄立刻解释旧印来源。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [openingRepair],
        },
      },
    })

    expect(sceneCards[0].opening_hook).toContain(openingRepair)
    expect(sceneCards[0].required_beats).toContain(openingRepair)
    expect(sceneCards[0].conflict).toContain(openingRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('开篇设计')
    expect(sceneCards[1].serial_risk_repairs).toContain('开篇设计')
  })
  test('projects paragraph-hook carry-over into scene paragraph tension fields', () => {
    const paragraphHookRepair = '下一章必须补paragraph_hook：每个小节至少有段落级推进钩子，段尾用新动作、新问题或反应差异推进，不能连续三段平铺。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '段尾动作',
          purpose: '让段尾用新动作推进',
          beat: '李玄把旧印从阵槽里拔出来。',
        },
        {
          title: '段尾问题',
          purpose: '让段尾留下新问题',
          beat: '第二枚旧印背面没有编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [paragraphHookRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(paragraphHookRepair)
    expect(sceneCards[1].required_beats).toContain(paragraphHookRepair)
    expect(sceneCards[0].information_gap).toContain(paragraphHookRepair)
    expect(sceneCards[1].information_gap).toContain(paragraphHookRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('段落钩子')
    expect(sceneCards[1].serial_risk_repairs).toContain('段落钩子')
  })
  test('projects prose-meta carry-over into scene prose craft fields', () => {
    const proseMetaRepair = '下一章必须补正文元信息：正文里不能出现章节标题说明、创作提示、作者备注或“本章将”这类元叙述，所有信息必须写成角色当场感知和行动。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧印现场',
          purpose: '把信息写成角色感知',
          beat: '李玄看见旧印边缘裂开。',
        },
        {
          title: '禁库动作',
          purpose: '把提示改成当场行动',
          beat: '林青禾按住凭条不让管事拿走。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [proseMetaRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(proseMetaRepair)
    expect(sceneCards[1].prose_craft_directives).toContain(proseMetaRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('正文元信息')
    expect(sceneCards[1].serial_risk_repairs).toContain('正文元信息')
  })
  test('projects punctuation-tone carry-over into scene prose craft fields', () => {
    const punctuationToneRepair = '下一章必须补语气标点：感叹号、破折号、省略号只能服务动作打断、情绪压迫和信息转折，不能连续堆叠制造假高能。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '动作打断',
          purpose: '让标点服务动作打断',
          beat: '管事刚开口，禁库门突然回锁。',
        },
        {
          title: '信息转折',
          purpose: '让标点服务信息转折',
          beat: '旧印编号停在黑塔许可前一位。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [punctuationToneRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(punctuationToneRepair)
    expect(sceneCards[1].prose_craft_directives).toContain(punctuationToneRepair)
    expect(sceneCards[0].style_directives).toContain(punctuationToneRepair)
    expect(sceneCards[1].serial_risk_repairs).toContain('语气标点')
  })
  test('projects style-boundary and sample carry-over into scene style fields', () => {
    const styleBoundaryRepair = '下一章必须补文风边界和风格样本：保留冷静短句和动作后果，但不能复制样本文句、桥段和比喻；叙述视角保持限知。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '冷静短句',
          purpose: '保留冷静短句',
          beat: '李玄松开旧印，没有解释。',
        },
        {
          title: '动作后果',
          purpose: '用动作后果承接风格样本',
          beat: '禁库门又往内退了一寸。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [styleBoundaryRepair],
        },
      },
    })

    expect(sceneCards[0].style_directives).toContain(styleBoundaryRepair)
    expect(sceneCards[1].style_directives).toContain(styleBoundaryRepair)
    expect(sceneCards[0].benchmark_recall_directives).toContain(styleBoundaryRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('文风边界')
    expect(sceneCards[1].serial_risk_repairs).toContain('风格样本')
  })
  test('projects style-sample receipt carry-over into scene sample strategy fields', () => {
    const styleSampleReceiptRepair = '下一章必须复核样章策略回执：style_sample_checks delivered=false，remaining_risk 是叙述节奏、对白比例、角色口吻和情绪转折没有落成正文；本章只学习样章抽象表达策略，不得复制样章桥段、角色名、核心梗或原句。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '节奏改写',
          purpose: '按样章策略调整叙述节奏',
          beat: '李玄先停一息，再把旧印按上缺页。',
        },
        {
          title: '对白比例',
          purpose: '用对白推动情绪转折',
          beat: '林青禾追问来历，李玄只答编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [styleSampleReceiptRepair],
        },
      },
    })

    expect(sceneCards[0].style_directives).toContain(styleSampleReceiptRepair)
    expect(sceneCards[0].benchmark_recall_directives).toContain(styleSampleReceiptRepair)
    expect(sceneCards[0].prose_craft_directives).toContain(styleSampleReceiptRepair)
    expect(sceneCards[1].dialogue_goals).toContain(styleSampleReceiptRepair)
    expect(sceneCards[1].required_beats).toContain(styleSampleReceiptRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(styleSampleReceiptRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('样章策略回执')
    expect(sceneCards[1].serial_risk_repairs).toContain('样章策略回执')
  })
})

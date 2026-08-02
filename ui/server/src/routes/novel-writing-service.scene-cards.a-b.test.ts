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

describe('normalizeSceneCardsPayload a b', () => {
  test('projects story-state style fingerprint sentence band into scene style directives', () => {
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '雨巷开门',
          purpose: '承接上一章审讯余波',
          beat: '李玄带着旧账进入雨巷。',
        },
        {
          title: '账册复核',
          purpose: '复核旧账证据',
          beat: '第二个证人确认旧账缺页。',
        },
      ],
    }, {
      story_state: {
        style_fingerprint: '文风指纹：目标句长带 18-36 字，允许半拍停顿，但整体保持中长句呼吸。',
      },
    })

    expect(sceneCards[0].style_directives.join('｜')).toContain('目标句长带 18-36 字')
    expect(sceneCards[1].style_directives.join('｜')).toContain('按文风指纹/文风.md')
    expect(sceneCards[0].style_directives.join('｜')).toContain('不要模仿可能已漂移的上一章句式节奏')
    expect(sceneCards[0].serial_risk_repairs).toContain('文风指纹')
  })

  test('builds a durable story-state style fingerprint snapshot from the target sentence band', () => {
    const snapshot = buildStyleFingerprintStateSnapshot({
      chapter_target: {
        style_sample_strategy: {
          style_profile_summary: '文风指纹：目标句长带 18-36 字，允许半拍停顿，但整体保持中长句呼吸。',
        },
      },
    })

    expect(snapshot?.style_fingerprint).toContain('目标句长带 18-36 字')
    expect(snapshot?.style_fingerprint_contract?.target_sentence_band).toBe('18-36字')
    expect(snapshot?.style_fingerprint_contract?.policy).toContain('不以可能已漂移的上一章句式节奏为准')
  })

  test('keeps an existing story-state style fingerprint instead of overwriting it', () => {
    const snapshot = buildStyleFingerprintStateSnapshot({
      chapter_target: {
        style_sample_strategy: {
          style_profile_summary: '文风指纹：目标句长带 18-36 字。',
        },
      },
    }, {}, {
      style_fingerprint: '文风指纹：目标句长带 20-42 字，旧上下文已锁定。',
    })

    expect(snapshot?.style_fingerprint).toContain('20-42 字')
    expect(snapshot?.style_fingerprint).not.toContain('18-36 字')
    expect(snapshot?.style_fingerprint_contract?.source).toBe('existing_story_state')
  })

  test('projects dialogue carry-over into scene dialogue goals', () => {
    const dialogueRepair = '按 oh-story dialogue-mastery 修复：删说明书式对白和问答式一问一答；信息型配角不能当科普嘴；高压/生死/悲痛 beat 中轻快声线让位；每句对白必须回应上一句情绪。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '证人开口',
          purpose: '让第二个证人交代旧账来源',
          beat: '证人被执事逼问时说漏证据来源。',
        },
        {
          title: '执事抢话',
          purpose: '让执事暴露真实立场',
          beat: '执事试图用长段解释压过证人。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [dialogueRepair],
        },
      },
    })

    expect(sceneCards[0].dialogue_goals).toContain(dialogueRepair)
    expect(sceneCards[1].dialogue_goals).toContain(dialogueRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('对白质量')
    expect(sceneCards[1].serial_risk_repairs).toContain('对白质量')
  })

  test('projects new-concept carry-over into scene concept anchor rules', () => {
    const conceptRepair = '给新名词/新设定补当下作用锚点：用角色动作反应、对话半句或物理后果带出功能；删掉整段来历、原理和等级说明。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '蓝晶入手',
          purpose: '让蓝晶第一次改变证据判断',
          beat: '李玄从旧匣里取出蓝晶。',
        },
        {
          title: '记忆碎片',
          purpose: '让蓝晶触发证人记忆',
          beat: '证人碰到蓝晶后看见缺页当晚。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [conceptRepair],
        },
      },
    })

    expect(sceneCards[0].concept_anchor_rules).toContain(conceptRepair)
    expect(sceneCards[1].concept_anchor_rules).toContain(conceptRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('新概念锚点')
    expect(sceneCards[1].serial_risk_repairs).toContain('新概念锚点')
  })

  test('projects explicit first-appearance setting usage into scene concept anchor rules', () => {
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '蓝晶入手',
          purpose: '让蓝晶第一次改变证据判断',
          beat: '李玄从旧匣里取出蓝晶。',
        },
        {
          title: '账册复核',
          purpose: '复核旧账证据',
          beat: '第二个证人确认旧账缺页。',
        },
      ],
    }, {
      setting_context: {
        chapter_usage: [
          {
            name: '蓝晶',
            entity_type: 'item',
            new_concept: true,
          },
        ],
      },
    })

    expect(sceneCards[0].concept_anchor_rules.join('｜')).toContain('“蓝晶”首次出现')
    expect(sceneCards[0].concept_anchor_rules.join('｜')).toContain('动作反应、对话半句或物理后果')
    expect(sceneCards[0].serial_risk_repairs).toContain('新概念锚点')
    expect(sceneCards[1].concept_anchor_rules.join('｜')).not.toContain('蓝晶')
  })

  test('projects benchmark recall carry-over into scene benchmark directives', () => {
    const benchmarkRepair = '下一章必须补足文风召回 missed 项，把节奏参照和匹配章技法写成正文可见的压迫、爆发、冷却或反应；只学习节奏，不复制桥段。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '三轮压问',
          purpose: '按对标节奏压出证人反应',
          beat: '执事连续压问，李玄晚半拍亮出旧印章。',
        },
        {
          title: '旁观分裂',
          purpose: '让旁观者差异化反应放大信息差',
          beat: '弟子分成怀疑、倒戈、沉默三组。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [benchmarkRepair],
        },
      },
    })

    expect(sceneCards[0].benchmark_recall_directives).toContain(benchmarkRepair)
    expect(sceneCards[1].benchmark_recall_directives).toContain(benchmarkRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('文风召回')
    expect(sceneCards[1].serial_risk_repairs).toContain('文风召回')
  })

  test('projects prose craft carry-over into scene prose craft directives', () => {
    const proseCraftRepair = '下一章必须补正文工艺：坚持深度限知，用身体细节替代抽象情绪，把道具/数字写成剧情功能，删掉上帝视角和无交互环境。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧名单复核',
          purpose: '让旧名单改变证据判断',
          beat: '沈砚按住旧名单，呼吸停了一拍。',
        },
        {
          title: '签收印反证',
          purpose: '把签收印写成剧情功能',
          beat: '签收印编号对上仓库暗格。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [proseCraftRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(proseCraftRepair)
    expect(sceneCards[1].prose_craft_directives).toContain(proseCraftRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('正文工艺')
    expect(sceneCards[1].serial_risk_repairs).toContain('正文工艺')
  })

  test('projects quality-audit carry-over into scene prose craft directives', () => {
    const qualityAuditRepair = '下一章必须补质量诊断：先证明本章不可删除，事件内容比重不能小于一半，让信息跟冲突走，删掉水文复述。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '第三个证人',
          purpose: '让第三个证人改变账本局势',
          beat: '沈砚赶到祠堂，第三个证人被反派封口。',
        },
        {
          title: '地砖账本',
          purpose: '让账本原件产生不可逆证据变化',
          beat: '地砖下露出账本原件，祠堂长老改变态度。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [qualityAuditRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(qualityAuditRepair)
    expect(sceneCards[1].prose_craft_directives).toContain(qualityAuditRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('质量诊断')
    expect(sceneCards[1].serial_risk_repairs).toContain('质量诊断')
  })

  test('projects asset-linkage carry-over into scene setting fields', () => {
    const assetRepair = '下一章必须补资产挂钩：旧钥匙要触发暗格并留下锁死代价，禁门规则要逼出账本原件位置。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧钥匙开缝',
          purpose: '让旧钥匙改变追查路径',
          beat: '李玄把旧钥匙压进地砖缝。',
        },
        {
          title: '禁门锁死',
          purpose: '让禁门规则制造阻碍',
          beat: '暗格打开后三息，禁门开始锁死。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [assetRepair],
        },
      },
    })

    expect(sceneCards[0].used_settings).toContain(assetRepair)
    expect(sceneCards[1].used_settings).toContain(assetRepair)
    expect(sceneCards[0].revealed_settings).toContain(assetRepair)
    expect(sceneCards[1].revealed_settings).toContain(assetRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('资产挂钩')
    expect(sceneCards[1].serial_risk_repairs).toContain('资产挂钩')
  })

  test('projects asset-intake carry-over into scene asset confirmation fields', () => {
    const assetIntakeRepair = '下一章必须确认新资产入库：asset_intake 待确认“青铜回声盘”，类型 item，summary 是能记录禁库门响三次；本章要先给正文证据，再决定归属、可见性和后续状态，不允许只把新资产留在设定表。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '回声盘入场',
          purpose: '让新资产先有正文证据',
          beat: '李玄把青铜回声盘放到禁库门前。',
        },
        {
          title: '三次门响',
          purpose: '确认新资产功能和归属',
          beat: '回声盘记下三次门响，归入李玄手中。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [assetIntakeRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(assetIntakeRepair)
    expect(sceneCards[0].used_settings).toContain(assetIntakeRepair)
    expect(sceneCards[1].revealed_settings).toContain(assetIntakeRepair)
    expect(sceneCards[1].state_changes_expected).toContain(assetIntakeRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('新资产入库')
    expect(sceneCards[1].serial_risk_repairs).toContain('新资产入库')
  })

  test('projects ip-scene-intake carry-over into visual scene fields', () => {
    const ipSceneRepair = '下一章必须延展 IP场面：ip_scene_intake 待延展“禁库门三响”，visualHook 是青铜盘贴门后三圈回声同时反亮，adaptationValue 是可做封面和短视频传播点；本章要把强画面写成可见动作链和读者能复述的场面。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '青铜盘贴门',
          purpose: '让强画面先入场',
          beat: '李玄把青铜盘贴上禁库门。',
        },
        {
          title: '三圈反亮',
          purpose: '把传播点写成现场动作',
          beat: '三圈回声同时反亮，门缝里吐出旧编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [ipSceneRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(ipSceneRepair)
    expect(sceneCards[0].required_beats).toContain(ipSceneRepair)
    expect(sceneCards[1].action_beats).toContain(ipSceneRepair)
    expect(sceneCards[1].sensory_anchor).toContain(ipSceneRepair)
    expect(sceneCards[1].reader_payoff).toContain(ipSceneRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('IP场面延展')
    expect(sceneCards[1].serial_risk_repairs).toContain('IP场面延展')
  })

  test('projects state-tracking carry-over into scene state changes', () => {
    const stateRepair = '下一章必须补状态跟踪：李玄仍受左臂旧伤和残阵三息限制，禁门三息锁死规则必须继续生效。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '暗格三息',
          purpose: '让三息限制改变取证动作',
          beat: '李玄左臂发麻，只能用三息撬开暗格。',
        },
        {
          title: '禁门锁死',
          purpose: '让禁门规则造成局势变化',
          beat: '三息一过，禁门锁死半边通道。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [stateRepair],
        },
      },
    })

    expect(sceneCards[0].state_changes_expected).toContain(stateRepair)
    expect(sceneCards[1].state_changes_expected).toContain(stateRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('状态跟踪')
    expect(sceneCards[1].serial_risk_repairs).toContain('状态跟踪')
  })

  test('projects status-filter carry-over into scene state filter fields', () => {
    const statusFilterRepair = '下一章必须修状态筛选：status_filter_receipts 缺少 used_in_chapter、excluded_reason 和 source_requirements；filter_rules 要说明哪些上章状态会影响本章正确性，哪些上下文过载必须排除。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '筛掉旧噪音',
          purpose: '只保留会写错的上章状态',
          beat: '李玄只拿出会影响禁库判断的半印记录。',
        },
        {
          title: '状态生效',
          purpose: '让筛选后的状态改变现场选择',
          beat: '他放弃无关传闻，改查禁库权限来源。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [statusFilterRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(statusFilterRepair)
    expect(sceneCards[1].state_changes_expected).toContain(statusFilterRepair)
    expect(sceneCards[0].used_settings).toContain(statusFilterRepair)
    expect(sceneCards[0].transition_from_previous).toContain(statusFilterRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('状态筛选')
    expect(sceneCards[1].serial_risk_repairs).toContain('状态筛选')
  })

  test('projects information-flow carry-over into scene required information', () => {
    const informationRepair = '下一章必须补足信息流：信息随冲突释放，按揭示顺序递进，先让执事压旧账册，再让证人改口，最后亮旧印章，删背景说明书。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧账压问',
          purpose: '让执事先压旧账册',
          beat: '执事把旧账册推到李玄面前。',
        },
        {
          title: '证人改口',
          purpose: '让证人改口后再亮旧印章',
          beat: '证人看见旧印章裂纹后改口。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [informationRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(informationRepair)
    expect(sceneCards[1].required_information).toContain(informationRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('信息流')
    expect(sceneCards[1].serial_risk_repairs).toContain('信息流')
  })

  test('projects expectation and chapter-hook carry-over into scene hook fields', () => {
    const expectationRepair = '下一章必须补期待阈值：恢复两长一短，先立下一开环，再兑现旧期待。'
    const hookRepair = '下一章必须补章级钩子：前100字先给冲突、异常或对话逼问，最后100字留下下一章必须处理的问题。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '证人现身',
          purpose: '先立下一开环',
          beat: '第二个证人被押进审判庭。',
        },
        {
          title: '第三个名字',
          purpose: '把旧期待转成新问题',
          beat: '证人说出第三个名字。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [expectationRepair, hookRepair],
        },
      },
    })

    expect(sceneCards[0].information_gap).toContain(expectationRepair)
    expect(sceneCards[1].information_gap).toContain(expectationRepair)
    expect(sceneCards[0].opening_hook).toContain(hookRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(hookRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('期待/钩子')
    expect(sceneCards[1].serial_risk_repairs).toContain('期待/钩子')
  })

  test('projects chapter-hook-quality carry-over into scene executable hook beats', () => {
    const hookQualityRepair = '下一章必须补 chapter_hook_quality_checks：章首 hook_position=opening，trigger_type 需要现场异常或危险选择；章尾必须留下 concrete_question、danger_or_choice 和 next_action_link，不能再用低风险空钩子。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '门缝异响',
          purpose: '用现场异常触发章首钩子',
          beat: '门缝里响起第二个人的呼吸。',
        },
        {
          title: '编号追问',
          purpose: '章尾留下下一章行动压力',
          beat: '残页编号指向明早必须去的禁库。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [hookQualityRepair],
        },
      },
    })

    expect(sceneCards[0].opening_hook).toContain(hookQualityRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(hookQualityRepair)
    expect(sceneCards[0].required_beats).toContain(hookQualityRepair)
    expect(sceneCards[1].required_beats).toContain(hookQualityRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(hookQualityRepair)
    expect(sceneCards[1].reader_payoff).toContain(hookQualityRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('章钩质量')
    expect(sceneCards[1].serial_risk_repairs).toContain('章钩质量')
  })

  test('projects suspense carry-over into scene information gaps', () => {
    const suspenseRepair = '下一章必须补悬念编排：先提出疑问，再给可信提示或误导，最后公布答案并立起新期待。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧印疑问',
          purpose: '先提出旧印章背面名字的疑问',
          beat: '李玄看见旧印章背面的半个名字。',
        },
        {
          title: '证人误导',
          purpose: '让证人给出可信误导',
          beat: '证人只承认见过账册缺页。',
        },
        {
          title: '第三个人',
          purpose: '公布答案并立起新期待',
          beat: '证人说旧案当晚还有第三个人。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [suspenseRepair],
        },
      },
    })

    expect(sceneCards[0].information_gap).toContain(suspenseRepair)
    expect(sceneCards[1].information_gap).toContain(suspenseRepair)
    expect(sceneCards[2].information_gap).toContain(suspenseRepair)
    expect(sceneCards[0].required_information).toContain(suspenseRepair)
    expect(sceneCards[1].required_information).toContain(suspenseRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(suspenseRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('悬念编排')
    expect(sceneCards[2].serial_risk_repairs).toContain('悬念编排')
  })

  test('projects reversal carry-over into scene reversal and payoff fields', () => {
    const reversalRepair = '下一章必须补反转设计：补足3处暗示、公平误导、揭示后影响和打脸节奏。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '暗示一',
          purpose: '先补第一处公平暗示',
          beat: '李玄注意到账册缺页边角的旧印。',
        },
        {
          title: '误导证词',
          purpose: '让证词形成可信误导',
          beat: '证人把矛头指向账房。',
        },
        {
          title: '身份翻面',
          purpose: '揭示执事身份并改变审判局势',
          beat: '旧印编号证明真正调账的是执事。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [reversalRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(reversalRepair)
    expect(sceneCards[1].required_beats).toContain(reversalRepair)
    expect(sceneCards[2].reversal).toContain(reversalRepair)
    expect(sceneCards[2].reader_payoff).toContain(reversalRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('反转设计')
    expect(sceneCards[2].serial_risk_repairs).toContain('反转设计')
  })

})

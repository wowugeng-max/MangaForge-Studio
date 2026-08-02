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

describe('normalizeSceneCardsPayload b a', () => {
  test('does not project reversal fair-misdirection carry-over as suspense', () => {
    const reversalRepair = '下一章必须补反转设计：补足3处暗示、公平误导、揭示后影响和打脸节奏。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '暗示落点',
          purpose: '补反转前的公平暗示',
          beat: '李玄发现旧印编号能反证执事。',
        },
        {
          title: '反转兑现',
          purpose: '让揭示后影响改变局势',
          beat: '执事身份揭开后，审判席改口。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [reversalRepair],
        },
      },
    })

    expect(sceneCards[0].serial_risk_repairs).toContain('反转设计')
    expect(sceneCards[0].serial_risk_repairs).not.toContain('悬念编排')
    expect(sceneCards[1].serial_risk_repairs).not.toContain('悬念编排')
    expect(sceneCards[0].information_gap).not.toContain(reversalRepair)
    expect(sceneCards[1].information_gap).not.toContain(reversalRepair)
  })

  test('projects showdown carry-over into scene action and payoff fields', () => {
    const showdownRepair = '下一章必须补高潮对抗：补舞台层级、震惊分层、底牌压制和急-缓-急情绪节奏。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '阵台重压',
          purpose: '让群众层先感到阵台压迫',
          beat: '执事残党逼李玄复盘阵盘依据。',
        },
        {
          title: '核心层追问',
          purpose: '让核心层追问底牌来源',
          beat: '长老席要求李玄当众重演阵盘残纹。',
        },
        {
          title: '底牌压制',
          purpose: '用底牌压制完成高潮余波',
          beat: '李玄重演残纹，执事残党当场失声。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [showdownRepair],
        },
      },
    })

    expect(sceneCards[0].action_beats).toContain(showdownRepair)
    expect(sceneCards[1].action_beats).toContain(showdownRepair)
    expect(sceneCards[2].reader_payoff).toContain(showdownRepair)
    expect(sceneCards[2].turning_point).toContain(showdownRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('高潮对抗')
    expect(sceneCards[2].serial_risk_repairs).toContain('高潮对抗')
  })

  test('projects bridge-unit carry-over into scene expectation and handoff fields', () => {
    const bridgeRepair = '下一章必须补桥段节奏：补连续期待、章尾新目标、高潮中埋钩子和承接余波。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '会审余波',
          purpose: '承接上一章旧账本兑现后的余波',
          beat: '李玄带着旧账本离开会审厅。',
        },
        {
          title: '投资人目标',
          purpose: '把旧账本胜利转成新投资人目标',
          beat: '林青禾指出投资人签字才是下一步门槛。',
        },
        {
          title: '三日名单',
          purpose: '章尾挂出第二份旧城名单目标',
          beat: '投资人要求三日内拿出第二份旧城名单。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [bridgeRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(bridgeRepair)
    expect(sceneCards[1].information_gap).toContain(bridgeRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(bridgeRepair)
    expect(sceneCards[0].transition_from_previous).toContain(bridgeRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('桥段节奏')
    expect(sceneCards[2].serial_risk_repairs).toContain('桥段节奏')
  })

  test('projects beat-cooling carry-over into scene pacing fields', () => {
    const beatCoolingRepair = '下一章优先轮换桥段类型：大冲突后补关系深化、世界观展开、势力建设或冲突余波。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '会审后街',
          purpose: '从上一章会审大冲突切到关系余波',
          beat: '林青禾拦住李玄，提醒他别继续硬打。',
        },
        {
          title: '旧城街巷',
          purpose: '借旧城制度展开世界观',
          beat: '税契墙上贴着旧城势力分布。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [beatCoolingRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(beatCoolingRepair)
    expect(sceneCards[1].purpose_tags).not.toContain(beatCoolingRepair)
    expect(sceneCards[0].required_beats).toContain(beatCoolingRepair)
    expect(sceneCards[0].transition_from_previous).toContain(beatCoolingRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('节奏冷却')
    expect(sceneCards[1].serial_risk_repairs).toContain('节奏冷却')
  })

  test('projects plot-dynamics carry-over into scene goal obstacle and feedback fields', () => {
    const plotDynamicsRepair = '下一章必须补剧情动力：先给账本编号目标和协会阻碍，再写主角行动、代价反馈和新的章末期待。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '编号目标',
          purpose: '李玄确认账本编号目标',
          beat: '李玄在旧账边角找到医院设备编号。',
        },
        {
          title: '协会阻碍',
          purpose: '协会会长压住编号核验',
          beat: '协会会长宣布没有授权不得核验。',
        },
        {
          title: '代价反馈',
          purpose: '主角行动后付出代价并留下新期待',
          beat: '李玄强行验印，左臂旧伤复发。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [plotDynamicsRepair],
        },
      },
    })

    expect(sceneCards[0].action_beats).toContain(plotDynamicsRepair)
    expect(sceneCards[1].conflict).toContain(plotDynamicsRepair)
    expect(sceneCards[2].state_changes_expected).toContain(plotDynamicsRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(plotDynamicsRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('剧情动力')
    expect(sceneCards[2].serial_risk_repairs).toContain('剧情动力')
  })

  test('projects character-relation carry-over into scene relationship action fields', () => {
    const relationRepair = '下一章必须补角色关系：明确合作互信但仍有边界，让林青禾带着洗清代签责任的独立目标主动作证。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '共同证词',
          purpose: '林青禾主动提出作证',
          beat: '林青禾把代签责任写进证词。',
          character_voice: '林青禾说话克制，没有替李玄包揽风险。',
        },
        {
          title: '边界互信',
          purpose: '合作互信但保留边界',
          beat: '李玄接受证词，但不让她替自己承担审判。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [relationRepair],
        },
      },
    })

    expect(sceneCards[0].action_beats).toContain(relationRepair)
    expect(sceneCards[1].action_beats).toContain(relationRepair)
    expect(sceneCards[0].character_voice).toContain(relationRepair)
    expect(sceneCards[1].state_changes_expected).toContain(relationRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('角色关系')
    expect(sceneCards[1].serial_risk_repairs).toContain('角色关系')
  })

  test('projects character-relation carry-over into staged relationship progression fields', () => {
    const relationRepair = '下一章必须补角色关系：维持配角攻略缓冲区，林青禾从旁观/质疑转为主动协助，主角解决追责后回到她这里开启下一轮账册任务。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '仍有信息差',
          purpose: '保留互信但仍有边界',
          beat: '林青禾只交出半页账册，不说钥匙来源。',
        },
        {
          title: '主动作证',
          purpose: '让配角带着自己的目标行动',
          beat: '林青禾为了洗清代签责任主动拿出证词。',
        },
        {
          title: '下一轮任务',
          purpose: '主角回到林青禾这里承接新任务',
          beat: '追责结束后，她递出新账册编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [relationRepair],
        },
      },
    })

    expect(sceneCards[0].relationship_progression_plan).toContain('关系类型/边界')
    expect(sceneCards[0].relationship_buffer_zone).toContain('信息差')
    expect(sceneCards[1].supporting_character_action).toContain('配角主动行动')
    expect(sceneCards[1].attitude_shift_checkpoint).toContain('旁观/质疑')
    expect(sceneCards[2].relationship_next_hook).toContain('下一轮')
    expect(sceneCards[2].state_changes_expected).toContain(relationRepair)
    expect(sceneCards[2].serial_risk_repairs).toContain('角色关系')
  })

  test('projects story-loop carry-over into scene loop and payoff fields', () => {
    const storyLoopRepair = '下一章必须补故事循环：让旧印章背面名字完成 setup -> escalation -> payoff -> carry_over，并承接期待。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '名字落点',
          purpose: '用旧印章背面名字完成 setup',
          beat: '李玄翻到旧印章背面，看见第二个证人的姓。',
        },
        {
          title: '证人受阻',
          purpose: '让证人线索进入 escalation',
          beat: '执事抢先派人堵住证人家门。',
        },
        {
          title: '旧案第三人',
          purpose: '兑现 payoff 并留下 carry_over',
          beat: '证人说出旧案当晚还有第三个人。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [storyLoopRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(storyLoopRepair)
    expect(sceneCards[1].required_beats).toContain(storyLoopRepair)
    expect(sceneCards[2].reader_payoff).toContain(storyLoopRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(storyLoopRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('故事循环')
    expect(sceneCards[2].serial_risk_repairs).toContain('故事循环')
  })

  test('projects emotional-arc carry-over into scene emotional tone and payoff fields', () => {
    const emotionalArcRepair = '下一章必须补情绪弧：恢复平静 -> 调动 -> 释放 -> 爽，先给安全感，再兑现释放。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '安全感落点',
          purpose: '先给读者安全感',
          beat: '李玄摸到旧印章，确认还有反证底牌。',
          emotional_tone: '压迫后短暂稳住。',
        },
        {
          title: '调动压力',
          purpose: '让执事封口调动情绪',
          beat: '执事抢先堵住第二个证人。',
        },
        {
          title: '反证释放',
          purpose: '兑现释放和爽点',
          beat: '李玄亮出旧印章背面名字，证人当场改口。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [emotionalArcRepair],
        },
      },
    })

    expect(sceneCards[0].emotional_tone).toContain(emotionalArcRepair)
    expect(sceneCards[1].required_beats).toContain(emotionalArcRepair)
    expect(sceneCards[2].reader_payoff).toContain(emotionalArcRepair)
    expect(sceneCards[2].emotional_tone).toContain(emotionalArcRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('情绪弧')
    expect(sceneCards[2].serial_risk_repairs).toContain('情绪弧')
  })

  test('projects emotional-arc carry-over into staged scene execution fields', () => {
    const emotionalArcRepair = '下一章必须补情绪弧：每个场景标注当前是调动还是释放；虐点按前反应->复现->后反应，闭环当前期待时开启下一开环。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '坏信预知',
          purpose: '让读者先知道坏结果',
          beat: '信使把血书压在门缝里。',
        },
        {
          title: '血书复现',
          purpose: '让坏结果真的发生',
          beat: '妹妹的旧名牌被当众摔碎。',
        },
        {
          title: '反手立誓',
          purpose: '让主角作出改变并开启新开环',
          beat: '主角收起碎片，决定查到第三个证人。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [emotionalArcRepair],
        },
      },
    })

    expect(sceneCards[0].emotional_arc_stage).toContain('调动/前反应')
    expect(sceneCards[0].reader_emotion_goal).toContain('读者提前知道坏结果')
    expect(sceneCards[1].emotional_arc_stage).toContain('复现/反制')
    expect(sceneCards[1].reaction_structure).toContain('复现')
    expect(sceneCards[2].emotional_arc_stage).toContain('后反应/释放')
    expect(sceneCards[2].expectation_bridge).toContain('下一开环')
    expect(sceneCards[2].reader_payoff).toContain(emotionalArcRepair)
    expect(sceneCards[2].serial_risk_repairs).toContain('情绪弧')
  })

  test('projects reader-retention carry-over into scene hook hunger and payoff fields', () => {
    const readerRetentionRepair = '下一章必须补追读留存：前300字给Hook上瘾触发，信息差植入问号并按剥洋葱卡住关键线索，章末用湿漉漉的旧名单制造翻页问题。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '十点门槛',
          purpose: '前300字给追读触发',
          beat: '李玄赶到旧城门口，十点钟声正要敲响。',
        },
        {
          title: '旧名单缺页',
          purpose: '用信息差制造饥饿',
          beat: '旧名单少了一页，墨迹还没有干。',
        },
        {
          title: '湿名单章尾',
          purpose: '用章末问题逼读者翻页',
          beat: '李玄发现名单背面贴着一枚湿漉漉的旧印。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [readerRetentionRepair],
        },
      },
    })

    expect(sceneCards[0].opening_hook).toContain(readerRetentionRepair)
    expect(sceneCards[0].information_gap).toContain(readerRetentionRepair)
    expect(sceneCards[1].information_gap).toContain(readerRetentionRepair)
    expect(sceneCards[2].reader_payoff).toContain(readerRetentionRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(readerRetentionRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('追读留存')
    expect(sceneCards[2].serial_risk_repairs).toContain('追读留存')
  })

  test('projects reader-payoff carry-over into scene payoff and beat fields', () => {
    const readerPayoffRepair = '下一章必须补读者回报：把青铜腰牌待回收期待写成现场反制、显性回报和章末新代价，不能只推进设定。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '腰牌失效',
          purpose: '把待回收期待压成现场问题',
          beat: '李玄拿出青铜腰牌，却被守门弟子判为失效。',
        },
        {
          title: '反制兑现',
          purpose: '给出显性回报',
          beat: '李玄用腰牌暗纹反制守门规则。',
        },
        {
          title: '新代价',
          purpose: '章末留下新代价',
          beat: '门开后，腰牌裂出一道新刻痕。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [readerPayoffRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(readerPayoffRepair)
    expect(sceneCards[1].required_beats).toContain(readerPayoffRepair)
    expect(sceneCards[0].reader_payoff).toContain(readerPayoffRepair)
    expect(sceneCards[1].reader_payoff).toContain(readerPayoffRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(readerPayoffRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('读者回报')
    expect(sceneCards[2].serial_risk_repairs).toContain('读者回报')
  })

  test('projects chapter-attraction carry-over into scene attraction fields', () => {
    const attractionRepair = '下一章必须修吸引力：开篇钩子先给旧城门反常响动，场景推进补目标阻碍转折回报，章末翻页留下黑塔许可选择。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '反常响动',
          purpose: '先给旧城门反常响动',
          beat: '旧城门无人推动却自己响了一声。',
        },
        {
          title: '推进反制',
          purpose: '补目标阻碍转折回报',
          beat: '李玄借门轴暗纹反制守门弟子的盘问。',
        },
        {
          title: '黑塔选择',
          purpose: '章末留下黑塔许可选择',
          beat: '黑塔许可从门缝里滑出来，只写着李玄的名字。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [attractionRepair],
        },
      },
    })

    expect(sceneCards[0].opening_hook).toContain(attractionRepair)
    expect(sceneCards[0].required_beats).toContain(attractionRepair)
    expect(sceneCards[1].required_beats).toContain(attractionRepair)
    expect(sceneCards[1].reader_payoff).toContain(attractionRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(attractionRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('章节吸引力')
    expect(sceneCards[2].serial_risk_repairs).toContain('章节吸引力')
  })

  test('projects story-drive carry-over into scene drive fields', () => {
    const storyDriveRepair = '下一章必须补故事力：主角选择当众押上裂纹阵盘，明确阻碍是执事封锁资格，选择代价是暴露暗伤，状态变化是转为主动入局，章末留下下一步因果。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '封锁资格',
          purpose: '明确阻碍',
          beat: '执事宣布散修不得进入试炼阵堂。',
        },
        {
          title: '押上阵盘',
          purpose: '主角选择',
          beat: '李玄把裂纹阵盘按在长案上。',
        },
        {
          title: '主动入局',
          purpose: '状态变化和下一步因果',
          beat: '阵盘亮起，内门长老点名让他明日入塔。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [storyDriveRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(storyDriveRepair)
    expect(sceneCards[1].action_beats).toContain(storyDriveRepair)
    expect(sceneCards[0].conflict).toContain(storyDriveRepair)
    expect(sceneCards[2].state_changes_expected).toContain(storyDriveRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(storyDriveRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('故事驱动')
    expect(sceneCards[2].serial_risk_repairs).toContain('故事驱动')
  })

  test('projects storyline-sync carry-over into scene storyline fields', () => {
    const storylineRepair = '下一章必须校剧情线：storyline_sync 发现 missed 主线节点、unplanned 旁支悬疑和 forbidden_touched 禁用支线；本章要把账本主线拉回当前目标，用现场阻碍、状态变化和章末主线钩子修复。'
    const actionableStorylineRepair = '本章要把账本主线拉回当前目标，用现场阻碍、状态变化和章末主线钩子修复。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '账本主线',
          purpose: '把主线目标拉回账本',
          beat: '李玄重新把账本残页摆到执事面前。',
        },
        {
          title: '旁支截断',
          purpose: '截掉无关悬疑',
          beat: '他拒绝追查无关黑影，只核验账本编号。',
        },
        {
          title: '主线钩子',
          purpose: '章末回到主线问题',
          beat: '账本编号指向禁库最深层。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [storylineRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(storylineRepair)
    expect(sceneCards[1].required_beats).toContain(storylineRepair)
    expect(sceneCards[1].conflict).toContain(actionableStorylineRepair)
    expect(sceneCards[1].conflict).not.toContain('storyline_sync')
    expect(sceneCards[1].conflict).not.toContain('missed')
    expect(sceneCards[1].state_changes_expected).toContain(storylineRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(storylineRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('剧情线')
    expect(sceneCards[2].serial_risk_repairs).toContain('剧情线')
  })

  test('projects character-arc carry-over into scene growth fields', () => {
    const characterArcRepair = '下一章必须补人物弧光：李玄的欲望是保住试炼资格，缺陷受压是害怕暴露裂纹阵盘，关系变化是主动向林青禾求证，成长节点是公开承认残阵缺陷，口吻锚点保持短句反问。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '资格封口',
          purpose: '让李玄的保住资格欲望被压迫',
          beat: '执事要求李玄交出裂纹阵盘并退出试炼。',
        },
        {
          title: '向林青禾求证',
          purpose: '让关系变化落成主动求证',
          beat: '李玄拦下林青禾，只问她是否见过阵盘旧纹。',
        },
        {
          title: '公开承认残阵',
          purpose: '让成长节点落到公开选择',
          beat: '李玄当众承认阵盘有缺，却指出缺口正是钥匙。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [characterArcRepair],
        },
      },
    })

    expect(sceneCards[0].action_beats).toContain(characterArcRepair)
    expect(sceneCards[1].character_voice).toContain(characterArcRepair)
    expect(sceneCards[2].state_changes_expected).toContain(characterArcRepair)
    expect(sceneCards[0].emotional_tone).toContain(characterArcRepair)
    expect(sceneCards[2].reader_payoff).toContain(characterArcRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('人物弧光')
    expect(sceneCards[2].serial_risk_repairs).toContain('人物弧光')
  })

  test('projects innovation carry-over into scene novelty fields', () => {
    const innovationRepair = '下一章必须补创新：把旧城阵盘修复写成规则反差和可视化IP场面，执行点是用裂纹阵盘反制门规，差异护栏是不能写成普通打脸，读者能复述玄灯许可亮起的一幕。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '门规压阵盘',
          purpose: '让旧城门规先压住阵盘修复',
          beat: '门规石碑判定裂纹阵盘无效。',
        },
        {
          title: '裂纹反制',
          purpose: '用裂纹阵盘反制门规',
          beat: '李玄把裂纹对准石碑缺口，门规读数倒转。',
        },
        {
          title: '玄灯许可',
          purpose: '让玄灯许可变成可复述场面',
          beat: '玄灯许可在石碑裂纹里亮起。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [innovationRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(innovationRepair)
    expect(sceneCards[1].required_beats).toContain(innovationRepair)
    expect(sceneCards[1].action_beats).toContain(innovationRepair)
    expect(sceneCards[2].sensory_anchor).toContain(innovationRepair)
    expect(sceneCards[2].reader_payoff).toContain(innovationRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('创新')
    expect(sceneCards[2].serial_risk_repairs).toContain('创新')
  })

  test('projects volume-beat carry-over into scene climax fields', () => {
    const volumeBeatRepair = '下一章必须补爆点：卷级目标是拿到玄灯许可，本章高潮承诺是让裂纹阵盘压过门规，爆点动作是现场破局，章末把许可代价升级成下一场硬仗。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '许可受阻',
          purpose: '让卷级目标遇到门规阻碍',
          beat: '门规石碑拒绝给李玄玄灯许可。',
        },
        {
          title: '现场破局',
          purpose: '兑现爆点动作',
          beat: '李玄把裂纹阵盘压在石碑缺口，许可刻痕反亮。',
        },
        {
          title: '许可代价',
          purpose: '把章末升级到下一场硬仗',
          beat: '许可落下时，石碑追加一行代价。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [volumeBeatRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(volumeBeatRepair)
    expect(sceneCards[1].action_beats).toContain(volumeBeatRepair)
    expect(sceneCards[1].turning_point).toContain(volumeBeatRepair)
    expect(sceneCards[2].reader_payoff).toContain(volumeBeatRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(volumeBeatRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('卷级爆点')
    expect(sceneCards[2].serial_risk_repairs).toContain('卷级爆点')
  })

  test('projects core-drift carry-over into scene core alignment fields', () => {
    const coreDriftRepair = '下一章必须守核心：读者承诺是旧城修复反制门规，主角驱动是主动承担许可代价，阶段目标是拿回玄灯许可，章末钩子必须回到许可新规则，不能写成旁支悬疑。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '门规压住许可',
          purpose: '把读者承诺拉回旧城修复',
          beat: '门规石碑拒绝承认李玄的修复资格。',
        },
        {
          title: '主动承担代价',
          purpose: '让主角驱动落成选择',
          beat: '李玄主动把裂纹阵盘押作许可代价。',
        },
        {
          title: '许可新规则',
          purpose: '把章末钩子拉回许可新规则',
          beat: '玄灯许可亮起后，多出一条必须当夜执行的新规。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [coreDriftRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(coreDriftRepair)
    expect(sceneCards[1].required_beats).toContain(coreDriftRepair)
    expect(sceneCards[0].conflict).toContain(coreDriftRepair)
    expect(sceneCards[1].state_changes_expected).toContain(coreDriftRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(coreDriftRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('核心守恒')
    expect(sceneCards[2].serial_risk_repairs).toContain('核心守恒')
  })

})

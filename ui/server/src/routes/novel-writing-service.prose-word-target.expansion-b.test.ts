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

describe('prose word target expansion b', () => {
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

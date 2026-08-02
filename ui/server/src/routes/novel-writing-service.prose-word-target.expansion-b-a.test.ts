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

describe('prose word target expansion b a', () => {
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
})

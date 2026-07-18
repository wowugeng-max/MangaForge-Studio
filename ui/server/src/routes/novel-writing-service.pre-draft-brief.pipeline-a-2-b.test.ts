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

describe('chapter pre-draft brief pipeline a 2 b', () => {
  test('carries continuity heat sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 27, chapter_no: 27, title: '值夜室' },
      [
        { id: 26, chapter_no: 26, title: '门外水声' },
        { id: 27, chapter_no: 27, title: '值夜室' },
      ],
      [
        {
          id: 237,
          chapter_id: 26,
          review_type: 'continuity_heat_sync',
          created_at: '2026-06-09T09:25:00.000Z',
          payload: JSON.stringify({
            chapter_id: 26,
            chapter_no: 26,
            continuity_heat_sync: {
              status: 'warn',
              label: '连续性热度缺口 2',
              summary: '正文有 2 项连续性热度缺口。',
              missed_count: 2,
              missed: [
                { label: '活跃期待', text: '门外水声没有继续施压，也没有转成值夜室行动。' },
                { label: '休眠边界', text: '夜巡司令牌被突然激活解决门外水声。' },
              ],
              next_actions: [
                '下一章必须补连续性热度：让门外水声逼出值夜室行动，并解释夜巡司令牌为什么不能解决当前危机。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '午夜校规', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 27,
        title: '值夜室',
        summary: '李辰进入值夜室追查门外水声来源。',
        conflict: '夜巡司令牌不能使用，值夜室门禁只认湿鞋印。',
        ending_hook: '镜中脚印和水声指向同一个失踪学生。',
        scene_cards: [
          { scene_no: 1, title: '值夜室', reader_payoff: '连续性热度缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 27, title: '值夜室' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补连续性热度')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补热度：连续性热度缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门外水声逼出值夜室行动')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('休眠边界')
    expect(prompt).toContain('补热度：连续性热度缺口 2')
    expect(prompt).toContain('夜巡司令牌为什么不能解决当前危机')
  })
  test('carries conflict structure sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 29, chapter_no: 29, title: '医院设备' },
      [
        { id: 28, chapter_no: 28, title: '设备间门口' },
        { id: 29, chapter_no: 29, title: '医院设备' },
      ],
      [
        {
          id: 238,
          chapter_id: 28,
          review_type: 'conflict_structure_sync',
          created_at: '2026-06-09T09:30:00.000Z',
          payload: JSON.stringify({
            chapter_id: 28,
            chapter_no: 28,
            conflict_structure_sync: {
              status: 'warn',
              label: '冲突结构缺口 2',
              summary: '正文有 2 项冲突结构缺口。',
              missed_count: 2,
              missed: [
                { label: '冲突阶梯', text: '协会成员没有从言语升级到行动阻碍。' },
                { label: '胜负变化', text: '客户资格从拒绝到认可没有落地。' },
              ],
              next_actions: [
                '下一章必须补冲突结构：先让协会会长真实阻止主角进入医院设备间，再写清客户资格胜负变化。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城设备师', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 29,
        title: '医院设备',
        summary: '主角进入医院设备间核验第二份封单。',
        conflict: '协会会长亲自封锁设备间，要求客户撤回授权。',
        ending_hook: '医院设备错误码指向协会内部账本。',
        scene_cards: [
          { scene_no: 1, title: '医院设备', reader_payoff: '冲突结构缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 29, title: '医院设备' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补冲突结构')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补冲突：冲突结构缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('协会会长真实阻止主角')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('胜负变化')
    expect(prompt).toContain('补冲突：冲突结构缺口 2')
    expect(prompt).toContain('客户资格胜负变化')
  })
  test('carries upgrade rhythm sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 31, chapter_no: 31, title: '医院红色警报' },
      [
        { id: 30, chapter_no: 30, title: '隐藏工具箱' },
        { id: 31, chapter_no: 31, title: '医院红色警报' },
      ],
      [
        {
          id: 239,
          chapter_id: 30,
          review_type: 'upgrade_rhythm_sync',
          created_at: '2026-06-09T09:35:00.000Z',
          payload: JSON.stringify({
            chapter_id: 30,
            chapter_no: 30,
            upgrade_rhythm_sync: {
              status: 'warn',
              label: '升级节奏缺口 2',
              summary: '正文有 2 项升级节奏缺口。',
              missed_count: 2,
              missed: [
                { label: '反馈闭环', text: '系统解锁隐藏工具箱后没有展示以前做不到的事。' },
                { label: '桥段节奏', text: '升级后没有接到医院设备这个更高门槛。' },
              ],
              next_actions: [
                '下一章必须补升级节奏：先展示隐藏工具箱能识别红色警报，再把医院设备写成更高门槛。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城设备师', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 31,
        title: '医院红色警报',
        summary: '主角用隐藏工具箱识别医院设备红色警报。',
        conflict: '医院设备故障等级高于旧城设备间，工具箱只能识别不能直接修复。',
        ending_hook: '红色警报背后出现协会内部账本编号。',
        scene_cards: [
          { scene_no: 1, title: '红色警报', reader_payoff: '升级节奏缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 31, title: '医院红色警报' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补升级节奏')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补升级：升级节奏缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('隐藏工具箱能识别红色警报')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('桥段节奏')
    expect(prompt).toContain('补升级：升级节奏缺口 2')
    expect(prompt).toContain('医院设备写成更高门槛')
  })
  test('carries target reader sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 32, chapter_no: 32, title: '水声后的账本' },
      [
        { id: 31, chapter_no: 31, title: '旧钥匙缺口' },
        { id: 32, chapter_no: 32, title: '水声后的账本' },
      ],
      [
        {
          id: 240,
          chapter_id: 31,
          review_type: 'target_reader_sync',
          created_at: '2026-06-09T09:45:00.000Z',
          payload: JSON.stringify({
            chapter_id: 31,
            chapter_no: 31,
            target_reader_sync: {
              status: 'warn',
              label: '目标读者缺口 2',
              summary: '正文有 2 项目标读者缺口。',
              missed_count: 2,
              missed: [
                { label: '读者欲望', text: '规则反制爽点没有落成正文事件。' },
                { label: '本章吸引点', text: '旧钥匙缺口没有给出可感知回报。' },
              ],
              next_actions: [
                '下一章必须补目标读者：把规则反制写成现场行动，并让旧钥匙缺口给出可感知回报。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城设备师', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 32,
        title: '水声后的账本',
        summary: '主角顺着旧钥匙缺口和门外水声找到协会账本。',
        conflict: '协会会长试图用规则阻断主角继续核验。',
        ending_hook: '账本编号指向医院设备。',
        scene_cards: [
          { scene_no: 1, title: '规则反制', reader_payoff: '目标读者缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 32, title: '水声后的账本' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补目标读者')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补读者：目标读者缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('规则反制写成现场行动')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('读者欲望')
    expect(prompt).toContain('补读者：目标读者缺口 2')
    expect(prompt).toContain('旧钥匙缺口给出可感知回报')
  })
  test('carries genre positioning sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 33, chapter_no: 33, title: '医院设备新门槛' },
      [
        { id: 32, chapter_no: 32, title: '报废设备订单' },
        { id: 33, chapter_no: 33, title: '医院设备新门槛' },
      ],
      [
        {
          id: 241,
          chapter_id: 32,
          review_type: 'genre_positioning_sync',
          created_at: '2026-06-09T09:55:00.000Z',
          payload: JSON.stringify({
            chapter_id: 32,
            chapter_no: 32,
            genre_positioning_sync: {
              status: 'warn',
              label: '题材定位缺口 2',
              summary: '正文有 2 项题材定位缺口。',
              missed_count: 2,
              missed: [
                { label: '核心梗', text: '旧城设备师用隐藏工具箱修报废设备的核心梗没有落成正文场景。' },
                { label: '金手指贴合', text: '金手指变成血脉神通，脱离维修职业和设备订单。' },
              ],
              next_actions: [
                '下一章必须补题材定位：回到都市系统逆袭，把隐藏工具箱贴回维修职业，并用医院设备订单兑现强回报。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城设备师', genre: '都市系统逆袭', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 33,
        title: '医院设备新门槛',
        summary: '主角用隐藏工具箱处理医院设备订单。',
        conflict: '医院设备故障超过旧城区订单难度，协会会长继续压制授权。',
        ending_hook: '医院设备编号牵出协会账本。',
        scene_cards: [
          { scene_no: 1, title: '医院设备订单', reader_payoff: '题材定位缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 33, title: '医院设备新门槛' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补题材定位')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补题材：题材定位缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('隐藏工具箱贴回维修职业')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('核心梗')
    expect(prompt).toContain('补题材：题材定位缺口 2')
    expect(prompt).toContain('医院设备订单兑现强回报')
  })
  test('carries female audience sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 35, chapter_no: 35, title: '她亲自签字' },
      [
        { id: 34, chapter_no: 34, title: '她自己的合同' },
        { id: 35, chapter_no: 35, title: '她亲自签字' },
      ],
      [
        {
          id: 242,
          chapter_id: 34,
          review_type: 'female_audience_sync',
          created_at: '2026-06-09T10:05:00.000Z',
          payload: JSON.stringify({
            chapter_id: 34,
            chapter_no: 34,
            female_audience_sync: {
              status: 'warn',
              label: '女频长篇缺口 2',
              summary: '正文有 2 项女频长篇缺口。',
              missed_count: 2,
              missed: [
                { label: '核心原则', text: '女主缺安全感锚点，关键选择由男主安排。' },
                { label: '虐戏剂量', text: '连续只虐，没有反转或糖。' },
              ],
              next_actions: [
                '下一章必须补女频长篇：让女主亲自做决定、亲自签字，并在受委屈后立刻给反转或糖。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '春风不误', genre: '番茄女生现言', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 35,
        title: '她亲自签字',
        summary: '女主拿回合同主动权，亲自签下新条款。',
        conflict: '合作方试图让男主代签，女主拒绝并重谈边界。',
        ending_hook: '新条款背后出现母亲旧案线索。',
        scene_cards: [
          { scene_no: 1, title: '亲自签字', reader_payoff: '女频长篇缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 35, title: '她亲自签字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补女频长篇')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补女频：女频长篇缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('女主亲自做决定')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('核心原则')
    expect(prompt).toContain('补女频：女频长篇缺口 2')
    expect(prompt).toContain('受委屈后立刻给反转或糖')
  })
  test('carries plot dynamics sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 37, chapter_no: 37, title: '账本编号' },
      [
        { id: 36, chapter_no: 36, title: '红色阀门' },
        { id: 37, chapter_no: 37, title: '账本编号' },
      ],
      [
        {
          id: 243,
          chapter_id: 36,
          review_type: 'plot_dynamics_sync',
          created_at: '2026-06-09T10:15:00.000Z',
          payload: JSON.stringify({
            chapter_id: 36,
            chapter_no: 36,
            plot_dynamics_sync: {
              status: 'warn',
              label: '剧情动力缺口 2',
              summary: '正文有 2 项剧情动力缺口。',
              missed_count: 2,
              missed: [
                { label: '剧情闭环', text: '红色阀门没有形成目标、阻碍、行动、代价/反馈、新期待闭环。' },
                { label: '高潮公式', text: '缺少假胜、崩解和交叉死磕，高潮直接顺滑结束。' },
              ],
              next_actions: [
                '下一章必须补剧情动力：先给账本编号目标和协会阻碍，再写主角行动、代价反馈和新的章末期待。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城设备师', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 37,
        title: '账本编号',
        summary: '主角追查红色阀门编号背后的协会账本。',
        conflict: '协会会长用医院停机责任逼客户撤回授权。',
        ending_hook: '账本编号对应前一批报废设备。',
        scene_cards: [
          { scene_no: 1, title: '账本编号', reader_payoff: '剧情动力缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 37, title: '账本编号' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补剧情动力')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补动力：剧情动力缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('账本编号目标和协会阻碍')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('剧情闭环')
    expect(prompt).toContain('补动力：剧情动力缺口 2')
    expect(prompt).toContain('主角行动、代价反馈和新的章末期待')
  })
})

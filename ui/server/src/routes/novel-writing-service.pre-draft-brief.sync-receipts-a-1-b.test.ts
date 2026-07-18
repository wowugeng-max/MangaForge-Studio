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

describe('chapter pre-draft brief sync-receipts a 1 b', () => {
  test('carries pending discovered assets into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 6, chapter_no: 6, title: '钥匙归属' },
      [
        { id: 5, chapter_no: 5, title: '水迹名单' },
        { id: 6, chapter_no: 6, title: '钥匙归属' },
      ],
      [
        {
          id: 208,
          chapter_id: 5,
          review_type: 'asset_intake',
          status: 'pending',
          created_at: '2026-06-09T08:09:00.000Z',
          payload: JSON.stringify({
            chapter_id: 5,
            chapter_no: 5,
            discovered_assets: [
              {
                entity_type: 'character',
                name: '周远',
                summary: '新来的宿舍管理员，掌握禁闭室钥匙。',
                evidence: '周远站在门口，手里转着一枚黑色钥匙。',
              },
              {
                entity_type: 'item',
                name: '黑色钥匙',
                summary: '能打开禁闭室，离身会触发广播警告。',
                evidence: '黑色钥匙落在掌心时，广播忽然停顿。',
              },
            ],
            applied_asset_names: [],
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 6,
        title: '钥匙归属',
        summary: '主角追查黑色钥匙为什么会触发广播。',
        conflict: '周远拒绝交代钥匙来源。',
        ending_hook: '钥匙齿痕对应禁闭室门后的旧编号。',
        scene_cards: [
          { scene_no: 1, title: '钥匙追问', reader_payoff: '确认周远和黑色钥匙不是一次性道具。' },
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
      { chapter_no: 6, title: '钥匙归属' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先确认新资产')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('新资产入库：待确认 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('周远')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('黑色钥匙')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('新资产开篇确认')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('周远')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('状态、归属、限制或关系变化')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('黑色钥匙')
    expect(prompt).toContain('新资产入库：待确认 2')
    expect(prompt).toContain('周远站在门口')
    expect(prompt).toContain('黑色钥匙落在掌心')
  })
  test('carries pending IP scene candidates into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 7, chapter_no: 7, title: '门槛白线' },
      [
        { id: 6, chapter_no: 6, title: '钥匙归属' },
        { id: 7, chapter_no: 7, title: '门槛白线' },
      ],
      [
        {
          id: 209,
          chapter_id: 6,
          review_type: 'ip_scene_intake',
          status: 'ready',
          created_at: '2026-06-09T08:10:00.000Z',
          payload: JSON.stringify({
            chapter_id: 6,
            chapter_no: 6,
            ip_scene_candidates: [
              {
                title: '玻璃门内外对峙',
                summary: '门外湿漉漉学生敲门，门内三人被规则边界困住。',
                visual_hook: '黑暗贴着玻璃爬动，门槛白线像判定边界。',
                adaptation_value: '适合短剧第一集结尾和漫剧分镜。',
                spread_point: '救不救门外学生的评论区争议。',
                evidence: '湿漉漉的校服男生站在玻璃门外。',
                source_excerpt: '玻璃门外的黑暗贴着门槛蠕动。',
                tags: ['短剧钩子', '规则怪谈强画面'],
              },
            ],
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 7,
        title: '门槛白线',
        summary: '主角确认玻璃门门槛白线的判定边界。',
        conflict: '门外学生逼迫他们越过白线救人。',
        ending_hook: '白线后退半步，露出门内曾经站过第四个人。',
        scene_cards: [
          { scene_no: 1, title: '白线试探', reader_payoff: '延展玻璃门内外对峙的强画面。' },
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
      { chapter_no: 7, title: '门槛白线' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先延展IP场面')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('IP场面延展：待延展 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('玻璃门内外对峙')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门槛白线')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('短剧第一集结尾')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('IP场面开篇延展')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('黑暗贴着玻璃爬动')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('行动、冲突或章末钩子')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('短剧第一集结尾')
    expect(prompt).toContain('IP场面延展：待延展 1')
    expect(prompt).toContain('玻璃门内外对峙')
    expect(prompt).toContain('救不救门外学生')
  })
  test('carries failed platform rubric checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 207,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                rubric: 'fanqie',
                rubric_source: 'oh_story_embedded_fallback',
                platform_checks: [
                  {
                    key: 'opening_hook',
                    label: '前三段钩子',
                    status: 'fail',
                    evidence: '前三段都在解释宿舍规则，没有现场事件。',
                    fix: '下一章开篇改成对手当众撕毁证据。',
                  },
                  {
                    key: 'emotional_feedback',
                    label: '情绪回报',
                    status: 'warn',
                    evidence: '主角只分析规则，缺少被羞辱后的反击反馈。',
                    fix: '下一章补一个让主角当场赢回主动权的小反转。',
                  },
                  {
                    key: 'ending_hook',
                    label: '章末钩子',
                    status: 'pass',
                    evidence: '水迹拼出第二个名字。',
                    fix: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修平台适配')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('平台适配：平台缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('对手当众撕毁证据')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('主角当场赢回主动权')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('水迹拼出第二个名字')
    expect(prompt).toContain('平台适配：平台缺口 2')
    expect(prompt).toContain('前三段都在解释宿舍规则')
    expect(prompt).toContain('下一章补一个让主角当场赢回主动权的小反转')
  })
  test('carries platform rubric execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 208,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:30.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                rubric: 'fanqie',
                platform_checks: [
                  {
                    key: 'opening_hook',
                    label: '前三段钩子',
                    status: 'warn',
                    opening_pace: '前三段先给对手撕毁证据的现场事件。',
                    payoff_density: '每场至少有一次主角反击或信息收益。',
                    reader_expectation: '读者期待主角用超人听力反制广播。',
                    page_turn_pull: '章尾把广播来源推到墙内水声。',
                    evidence: '前三段仍在解释宿舍规则。',
                    fix: '下一章必须先开事件再补规则。',
                    remaining_risk: '不能继续用平台说明替代现场冲突。',
                  },
                  {
                    key: 'paragraph_spacing',
                    label: '段落留白',
                    status: 'pass',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修平台适配')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('平台适配：平台缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('platform_checks.前三段钩子')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('key=opening_hook')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('platform=fanqie')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('opening_pace=前三段先给对手撕毁证据')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('payoff_density=每场至少有一次主角反击')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reader_expectation=读者期待主角用超人听力反制广播')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('page_turn_pull=章尾把广播来源推到墙内水声')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('段落留白')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('opening_pace')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('payoff_density')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('page_turn_pull')
    expect(prompt).toContain('platform_checks.前三段钩子')
    expect(prompt).toContain('不能继续用平台说明替代现场冲突')
  })
  test('carries failed content rubric checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 208,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                content_rubric_checks: [
                  {
                    key: 'plot_loop',
                    label: '最小剧情循环',
                    status: 'fail',
                    evidence: '主角一直解释规则，没有目标、行动和反馈闭环。',
                    fix: '下一章开篇给主角一个必须立刻验证水迹名字的目标，并写出失败代价。',
                  },
                  {
                    key: 'core_payoff',
                    label: '核心卖点',
                    status: 'warn',
                    evidence: '超人能力没有和规则怪谈形成反差回报。',
                    fix: '下一章用超人听力发现门外水声来自墙内，形成规则反差。',
                  },
                  {
                    key: 'format_readability',
                    label: '格式可读性',
                    status: 'pass',
                    evidence: '对话独立成段。',
                    fix: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修内容基准')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('内容基准：基准缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('必须立刻验证水迹名字')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('超人听力发现门外水声来自墙内')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('对话独立成段')
    expect(prompt).toContain('内容基准：基准缺口 2')
    expect(prompt).toContain('主角一直解释规则')
    expect(prompt).toContain('规则反差')
  })
  test('carries content rubric execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 209,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:10:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                content_rubric_checks: [
                  {
                    label: '黄金三问缺口',
                    status: 'warn',
                    core_selling_point: '超人能力被规则限制后反制广播。',
                    conflict_progression: '从救不救门外学生推进到追查广播来源。',
                    chapter_change: '主角确认门外学生不是诱饵，而是被广播冒名。',
                    page_turn_reason: '广播为什么提前知道主角名字。',
                    evidence: '本章只解释宿舍规则，没有把广播来源变成下一章问题。',
                    fix: '下一章必须让水迹名字触发广播来源追查。',
                    remaining_risk: '不要停在规则说明，要给读者一个翻页问题。',
                  },
                  {
                    label: '文字自然度',
                    status: 'pass',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修内容基准')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('内容基准：基准缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('content_rubric_checks.黄金三问缺口')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('core_selling_point=超人能力被规则限制后反制广播')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('conflict_progression=从救不救门外学生推进到追查广播来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('chapter_change=主角确认门外学生不是诱饵')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('page_turn_reason=广播为什么提前知道主角名字')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('文字自然度')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('core_selling_point')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('conflict_progression')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('page_turn_reason')
    expect(prompt).toContain('content_rubric_checks.黄金三问缺口')
    expect(prompt).toContain('不要停在规则说明')
  })
})

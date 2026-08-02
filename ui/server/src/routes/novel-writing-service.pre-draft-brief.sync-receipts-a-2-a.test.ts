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

describe('chapter pre-draft brief sync-receipts a 2 a', () => {
  test('carries failed quality specialty checks into the next pre-draft brief and prose prompt', () => {
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
          created_at: '2026-06-09T08:09:30.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                structure_checks: [
                  {
                    key: 'opening_hook',
                    label: 'structure_checks 开篇钩子',
                    status: 'fail',
                    opening_hook: '前三段都在复述宿舍规则。',
                    evidence: '开头没有水迹名字触发目标。',
                    fix: '下一章第一幕让水迹名字直接出现在失踪名单背面。',
                  },
                  {
                    key: 'ending_page_turn',
                    label: 'structure_checks 章尾翻页',
                    status: 'pass',
                    evidence: '章尾露出第二个名字。',
                    fix: '',
                  },
                ],
                progression_checks: [
                  {
                    key: 'non_deletable_change',
                    label: 'progression_checks 不可删除变化',
                    status: 'warn',
                    non_deletable_change: '删掉本章仍能接下一章。',
                    evidence: '主角只讨论规则，没有让关系或主线状态变化。',
                    fix: '下一章中段必须让主角用半张名单逼室友交出门卡。',
                  },
                ],
                information_checks: [
                  {
                    key: 'new_concept_count',
                    label: 'information_checks 信息负载',
                    status: 'missing',
                    new_concept_count: 5,
                    evidence: '一次性塞入水迹、旧门、门卡、名单和黑章五个概念。',
                    fix: '下一章只保留水迹名字和门卡两个信息点，其余用动作延后。',
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

    expect(deliveryRiskCarryOver?.label).toBe('待修复 3')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修质量专项')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('质量专项：结构推进信息缺口 3')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('失踪名单背面')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('半张名单逼室友交出门卡')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('只保留水迹名字和门卡两个信息点')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('章尾露出第二个名字')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('质量专项开篇修复')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('opening_hook')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('non_deletable_change')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('new_concept_count')
    expect(prompt).toContain('质量专项：结构推进信息缺口 3')
    expect(prompt).toContain('开头没有水迹名字触发目标')
    expect(prompt).toContain('一次性塞入水迹、旧门、门卡、名单和黑章五个概念')
  })
  test('carries prose review revision receipt checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 210,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:10:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                revision_receipt_checks: [
                  {
                    key: 'missing_changed_evidence',
                    label: '修订回执检查',
                    status: 'fail',
                    required_action: '下一章必须重做破局过程，用现场动作证明门卡权限真的改变。',
                    repair_segment: 'middle',
                    applied_fix: '上一章声称已补破局过程。',
                    changed_evidence: '已修复。',
                    fix: '中段让主角当场折断旧门卡，再用半印血线换到半格权限。',
                    remaining_risk: '修订回执仍缺可定位动作，不能只写“危机解决”。',
                  },
                  {
                    key: 'revision_receipt_ok',
                    label: '修订回执已同步',
                    status: 'pass',
                    required_action: '已逐条同步修订回执。',
                    changed_evidence: '门卡权限已落到正文。',
                    remaining_risk: '',
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
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先复核修订')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修订回执检查：检查缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('revision_receipt_checks')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('重做破局过程')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('半印血线换到半格权限')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('已逐条同步修订回执')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('修订回执检查开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('repair_segment=middle')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('changed_evidence')
    expect(prompt).toContain('修订回执检查：检查缺口 1')
    expect(prompt).toContain('repair_segment=middle')
    expect(prompt).toContain('修订回执仍缺可定位动作')
  })
  test('carries prose review deslop repair checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 211,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:11:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                deslop_repair_checks: [
                  {
                    gate: 'F',
                    label: '章末总结体',
                    status: 'warn',
                    original_risk: '上一章章末仍用“这一切才刚刚开始”的抽象总结。',
                    rewritten_evidence: '水迹在玻璃上停住。',
                    changed_evidence: '已经去AI味。',
                    receipt_synced: false,
                    fix: '下一章开篇用水迹倒流、门卡发烫和一句短对白承接，不写抽象总结。',
                    remaining_risk: '去AI味回执没有同步 changed_evidence，Gate F 总结体可能复现。',
                  },
                  {
                    gate: 'B',
                    label: '解释腔',
                    status: 'pass',
                    changed_evidence: '对话已经替代解释。',
                    fix: '无需继续修复。',
                    remaining_risk: '',
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
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先去AI味')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('去AI味检查：闭环缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('deslop_repair_checks')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('Gate F')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('水迹倒流、门卡发烫和一句短对白')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('无需继续修复')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('去AI味检查开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('rewritten_evidence')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('receipt_synced=false')
    expect(prompt).toContain('去AI味检查：闭环缺口 1')
    expect(prompt).toContain('receipt_synced=false')
    expect(prompt).toContain('Gate F 总结体可能复现')
  })
  test('carries adversarial perspective verdicts into the next pre-draft brief and prose prompt', () => {
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
                perspective_verdicts: [
                  {
                    reviewer: 'story-architect',
                    verdict: 'CONCERNS',
                    summary: '结构钩子弱，章末没有把水迹名字转成下一章目标。',
                    recommendations: ['下一章开篇让主角把水迹名字和失踪名单对上。'],
                  },
                  {
                    reviewer: 'consistency-checker',
                    verdict: 'REJECT',
                    findings: [
                      {
                        severity: 'S1',
                        category: 'consistency',
                        evidence: '前文规则说不能触碰门外水迹，本章却直接用手擦掉。',
                        fix: '下一章必须统一为不能直接触碰水迹，并补一个隔物验证动作。',
                      },
                    ],
                  },
                  {
                    reviewer: 'narrative-writer',
                    verdict: 'APPROVE',
                    summary: '文字自然度可接受。',
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
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先处理多视角审查')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('多视角审查：视角风险 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('失踪名单对上')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('隔物验证动作')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('文字自然度可接受')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('多视角审查开篇修复')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('失踪名单对上')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('隔物验证动作')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('多视角审查章尾修复')
    expect(prompt).toContain('多视角审查：视角风险 2')
    expect(prompt).toContain('不能直接触碰水迹')
    expect(prompt).toContain('结构钩子弱')
  })
  test('carries failed deslop gate checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 210,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:11:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                deslop_level: '中度',
                deslop_checks: [
                  {
                    gate: 'B',
                    pattern: '否定铺垫后接肯定翻转',
                    status: 'fail',
                    evidence: '那不是普通水迹，而是一种更深的规则。',
                    fix: '下一章删掉否定铺垫，直接写水迹在墙内倒流的可见现象。',
                  },
                  {
                    gate: 'G',
                    pattern: '解释腔/上帝视角/安排感',
                    status: 'warn',
                    evidence: '他不知道的是，更大的风暴已经开始。',
                    fix: '下一章用门外水声和名单缺页制造悬念，不写作者预告。',
                  },
                  {
                    gate: 'E',
                    pattern: '对话标签',
                    status: 'pass',
                    evidence: '对话用动作承接。',
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
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先去AI味')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('去AI味：门禁缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('水迹在墙内倒流')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门外水声和名单缺页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('对话用动作承接')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('去AI味门禁开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('水迹在墙内倒流')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('Gate G')
    expect(prompt).toContain('去AI味：门禁缺口 2')
    expect(prompt).toContain('那不是普通水迹')
    expect(prompt).toContain('更大的风暴已经开始')
  })
  test('carries deslop gate diagnostics summary into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 211,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:12:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                deslop_gate_diagnostics: {
                  version: 'oh_story_deslop_gate_diagnostics_v1',
                  summary: '去AI味门禁 2/7 项需处理，优先修复 fail，其次修复 warn。',
                  total: 3,
                  concern_gate_count: 2,
                  gates: [
                    {
                      gate: 'A',
                      label: '禁用词/模板表达',
                      status: 'fail',
                      count: 2,
                      patterns: ['不是A，而是B', '一丝'],
                      evidence: '那不是普通水迹，而是一种更深的规则。',
                      fix: '下一章直接写水迹倒流，不要再用不是A而是B。',
                    },
                    {
                      gate: 'E',
                      label: '对话腔调',
                      status: 'warn',
                      count: 1,
                      patterns: ['对话腔调模板化'],
                      evidence: '你要明白，这件事没那么简单。',
                      fix: '下一章让管理员用逼问和遮掩推进信息。',
                    },
                    { gate: 'G', label: '解释腔/上帝视角/安排感', status: 'pass', count: 0 },
                  ],
                },
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

    expect(deliveryRiskCarryOver?.priority_label).toBe('优先去AI味')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('去AI味：门禁摘要 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('去AI味门禁 2/7')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('水迹倒流')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('逼问和遮掩')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('去AI味门禁开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('Gate A')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('Gate E')
    expect(prompt).toContain('去AI味：门禁摘要 2')
    expect(prompt).toContain('Gate A 禁用词/模板表达')
    expect(prompt).toContain('Gate E 对话腔调')
  })
})

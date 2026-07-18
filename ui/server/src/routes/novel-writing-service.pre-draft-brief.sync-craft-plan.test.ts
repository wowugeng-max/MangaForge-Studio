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

describe('chapter pre-draft brief sync-craft/next-chapter-plan', () => {
  test('asks prose review to output a next-chapter quality continuity plan', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )

    expect(reviewPrompt).toContain('next_chapter_quality_plan')
    expect(reviewPrompt).toContain('quality_focus')
    expect(reviewPrompt).toContain('opening_actions')
    expect(reviewPrompt).toContain('middle_actions')
    expect(reviewPrompt).toContain('ending_actions')
    expect(reviewPrompt).toContain('avoid_repetition')
    expect(reviewPrompt).toContain('evidence_basis')
    expect(reviewPrompt).toContain('ending_contract')
    expect(reviewPrompt).toContain('final_state')
    expect(reviewPrompt).toContain('unresolved_question')
    expect(reviewPrompt).toContain('next_chapter_pull')
    expect(reviewPrompt).toContain('handoff_to_next')
  })

  test('asks prose revision to output a final next-chapter quality continuity plan', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(revisionPrompt).toContain('next_chapter_quality_plan')
    expect(revisionPrompt).toContain('quality_focus')
    expect(revisionPrompt).toContain('opening_actions')
    expect(revisionPrompt).toContain('middle_actions')
    expect(revisionPrompt).toContain('ending_actions')
    expect(revisionPrompt).toContain('avoid_repetition')
    expect(revisionPrompt).toContain('evidence_basis')
    expect(revisionPrompt).toContain('ending_contract')
    expect(revisionPrompt).toContain('final_state')
    expect(revisionPrompt).toContain('unresolved_question')
    expect(revisionPrompt).toContain('next_chapter_pull')
    expect(revisionPrompt).toContain('handoff_to_next')
    expect(revisionPrompt).toContain('修订后')
    expect(revisionPrompt).toContain('next_chapter_quality_plan_receipts')
  })

  test('carries next-chapter quality plan into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 206,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:06:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                score: 82,
                passed: true,
                next_chapter_quality_plan: {
                  version: 'oh_story_next_chapter_quality_plan_v1',
                  quality_focus: ['把门外学生身份追查变成下一章主目标。'],
                  opening_actions: ['前300字让主角拿水迹样本验证门外学生身份。'],
                  middle_actions: ['中段让玻璃门规则反制蛮力，形成新信息。'],
                  ending_actions: ['章末用校徽反光露出第二条规则。'],
                  avoid_repetition: ['不要再用“他知道，这只是开始”总结体收尾。'],
                  evidence_basis: ['上一章章末只留下门外学生消失，没有行动压力。'],
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
        chapter_no: 3,
        title: '门外学生',
        summary: '判断门外学生是否是规则诱饵。',
        conflict: '救人还是守规。',
        ending_hook: '玻璃门上的水迹拼出一个名字。',
        scene_cards: [
          { scene_no: 1, title: '门前对峙', reader_payoff: '识破门外学生的第一层规则诱饵。' },
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 3, title: '门外学生' })

    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('质量续航：下一章计划')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门外学生身份追查变成下一章主目标')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('前300字让主角拿水迹样本验证门外学生身份')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('玻璃门规则反制蛮力')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('校徽反光露出第二条规则')
    expect(brief.write_preparation_brief.delivery_risk_actions.join('｜')).toContain('前300字让主角拿水迹样本验证门外学生身份')
    expect(brief.write_preparation_brief.delivery_risk_actions.join('｜')).toContain('玻璃门规则反制蛮力')
    expect(brief.write_preparation_brief.delivery_risk_actions.join('｜')).toContain('校徽反光露出第二条规则')
    expect(brief.write_preparation_brief.must_confirm.join('｜')).toContain('前300字让主角拿水迹样本验证门外学生身份')
    expect(prompt).toContain('质量续航：下一章计划')
    expect(prompt).toContain('不要再用“他知道，这只是开始”总结体收尾')
    expect(prompt).toContain('上一章章末只留下门外学生消失')
    expect(prompt).toContain('next_chapter_quality_plan_receipts')
  })

  test('carries next-chapter quality plan ending contracts into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 207,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:07:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                score: 84,
                passed: true,
                next_chapter_quality_plan: {
                  version: 'oh_story_next_chapter_quality_plan_v1',
                  quality_focus: ['下一章必须接住校徽反光，不改成新支线。'],
                  opening_actions: ['前300字让主角用半枚校徽反光定位值班室。'],
                  middle_actions: ['中段让第二条规则改变救人判断。'],
                  ending_actions: ['章末让值班室名单出现主角母亲旧名。'],
                  avoid_repetition: ['不要再用门口犹豫开篇。'],
                  evidence_basis: ['上一章最后只剩半枚校徽反光，没有解释第二条规则。'],
                  ending_contract: {
                    final_state: '门外学生消失后，玻璃门只剩半枚校徽反光。',
                    unresolved_question: '第二条规则是谁写在校徽背面？',
                    next_chapter_pull: '值班室名单里出现主角母亲旧名。',
                    handoff_to_next: '开篇必须从半枚校徽反光直接追到值班室名单。',
                  },
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
        chapter_no: 3,
        title: '门外学生',
        summary: '判断门外学生是否是规则诱饵。',
        conflict: '救人还是守规。',
        ending_hook: '玻璃门上的水迹拼出一个名字。',
        scene_cards: [
          { scene_no: 1, title: '门前对峙', reader_payoff: '识破门外学生的第一层规则诱饵。' },
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 3, title: '门外学生' })

    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('上章最后状态：门外学生消失后，玻璃门只剩半枚校徽反光')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('开篇必须从半枚校徽反光直接追到值班室名单')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('未解决问题：第二条规则是谁写在校徽背面')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('下一章推动力：值班室名单里出现主角母亲旧名')
    expect(prompt).toContain('ending_contract')
    expect(prompt).toContain('final_state')
    expect(prompt).toContain('第二条规则是谁写在校徽背面')
    expect(prompt).toContain('开篇必须从半枚校徽反光直接追到值班室名单')
  })

  test('turns next-chapter avoid-repetition plan into forbidden repeats', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 208,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              revision: {
                next_chapter_quality_plan: {
                  version: 'oh_story_next_chapter_quality_plan_v1',
                  quality_focus: ['把门外学生身份追查变成下一章主目标。'],
                  opening_actions: ['前300字让主角拿水迹样本验证门外学生身份。'],
                  avoid_repetition: ['不要再用“他知道，这只是开始”总结体收尾。'],
                  evidence_basis: ['上一章章末只留下门外学生消失，没有行动压力。'],
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
        chapter_no: 3,
        title: '门外学生',
        summary: '判断门外学生是否是规则诱饵。',
        conflict: '救人还是守规。',
        ending_hook: '玻璃门上的水迹拼出一个名字。',
        scene_cards: [
          { scene_no: 1, title: '门前对峙', reader_payoff: '识破门外学生的第一层规则诱饵。' },
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 3, title: '门外学生' })

    expect(deliveryRiskCarryOver?.forbidden_repeats).toContain('不要再用“他知道，这只是开始”总结体收尾。')
    expect(brief.delivery_risk_carry_over.forbidden_repeats).toContain('不要再用“他知道，这只是开始”总结体收尾。')
    expect(brief.forbidden_content).toContain('不要再用“他知道，这只是开始”总结体收尾。')
    expect(context.chapter_target.forbidden_content).toContain('不要再用“他知道，这只是开始”总结体收尾。')
    expect(prompt).toContain('禁用重复：不要再用“他知道，这只是开始”总结体收尾。')
  })

  test('carries nested next-chapter quality plan from oh-story delivery receipts', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '校徽反光' },
      [
        { id: 2, chapter_no: 2, title: '门外学生' },
        { id: 3, chapter_no: 3, title: '校徽反光' },
      ],
      [
        {
          id: 209,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:09:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                score: 78,
                passed: false,
              },
              revision: {
                oh_story_delivery_receipts: {
                  next_chapter_quality_plan: {
                    version: 'oh_story_next_chapter_quality_plan_v1',
                    quality_focus: ['嵌套计划：下一章必须追查校徽反光里的第二条规则。'],
                    opening_actions: ['嵌套计划：前300字用校徽反光定位值班室名单。'],
                    middle_actions: ['嵌套计划：中段让假学生被门禁反噬。'],
                    ending_actions: ['嵌套计划：章末让名单缺页指向新门牌。'],
                    avoid_repetition: ['嵌套计划：不要再用门口犹豫开篇。'],
                    evidence_basis: ['嵌套计划来自修订后 oh_story_delivery_receipts。'],
                  },
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
        chapter_no: 3,
        title: '校徽反光',
        summary: '追查校徽反光里的第二条规则。',
        conflict: '假学生消失，但校徽反光留下新证据。',
        ending_hook: '名单缺页背面出现新门牌。',
        scene_cards: [
          { scene_no: 1, title: '校徽定位', reader_payoff: '校徽反光定位值班室名单。' },
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 3, title: '校徽反光' })

    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('质量续航：下一章计划')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('嵌套计划：下一章必须追查校徽反光里的第二条规则')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('嵌套计划：前300字用校徽反光定位值班室名单')
    expect(brief.forbidden_content).toContain('嵌套计划：不要再用门口犹豫开篇。')
    expect(prompt).toContain('嵌套计划：前300字用校徽反光定位值班室名单')
    expect(prompt).toContain('嵌套计划：不要再用门口犹豫开篇')
  })

  test('keeps next-chapter quality plan in normalized prose self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('next_chapter_quality_plan')
    expect(reviewBlock).toContain('reviewPayload?.next_chapter_quality_plan')
    expect(reviewBlock).toContain('reviewPayload?.nextChapterQualityPlan')
    expect(reviewBlock).toContain('reviewPayloadDeliveryReceipts')
    expect(reviewBlock).toContain('reviewPayloadDeliveryReceipts?.next_chapter_quality_plan')
    expect(reviewBlock).toContain('reviewPayloadDeliveryReceipts?.nextChapterQualityPlan')
  })

  test('treats a missing next-chapter quality plan as a prose revision trigger', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const revisionDecisionBlock = source.slice(
      source.indexOf('const nextChapterQualityPlanNeedsRepair'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const normalizedReview = {')),
    )

    expect(revisionDecisionBlock).toContain('nextChapterQualityPlanNeedsRepair')
    expect(revisionDecisionBlock).toContain('quality_focus')
    expect(revisionDecisionBlock).toContain('opening_actions')
    expect(revisionDecisionBlock).toContain('middle_actions')
    expect(revisionDecisionBlock).toContain('ending_actions')
    expect(revisionDecisionBlock).toContain('avoid_repetition')
    expect(revisionDecisionBlock).toContain('evidence_basis')
    expect(revisionDecisionBlock).toContain('ending_contract')
    expect(revisionDecisionBlock).toContain('final_state')
    expect(revisionDecisionBlock).toContain('unresolved_question')
    expect(revisionDecisionBlock).toContain('next_chapter_pull')
    expect(revisionDecisionBlock).toContain('handoff_to_next')
    expect(revisionDecisionBlock).toContain('hasNextChapterQualityPlanConcern')
    expect(reviewNormalizeBlock).toContain('const hasNextChapterQualityPlanConcern = nextChapterQualityPlanNeedsRepair(normalizedReview)')
    expect(reviewNormalizeBlock).toContain('normalizedReview.needs_revision =')
    expect(reviewNormalizeBlock).toContain('|| hasNextChapterQualityPlanConcern')
  })

  test('keeps final next-chapter quality plan in prose revision result', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const revisionStart = source.indexOf('const revisionPayload = getNovelPayload(revisionResult)')
    const revisionBlock = source.slice(
      revisionStart,
      source.indexOf('next_chapter_quality_plan: revisionNextChapterQualityPlan', revisionStart) + 'next_chapter_quality_plan: revisionNextChapterQualityPlan'.length + 40,
    )

    expect(revisionBlock).toContain('const revisionNextChapterQualityPlan =')
    expect(revisionBlock).toContain('revisedFirst?.next_chapter_quality_plan')
    expect(revisionBlock).toContain('revisedFirst?.nextChapterQualityPlan')
    expect(revisionBlock).toContain('revisionPayload?.next_chapter_quality_plan')
    expect(revisionBlock).toContain('revisionPayload?.nextChapterQualityPlan')
    expect(revisionBlock).toContain('next_chapter_quality_plan: revisionNextChapterQualityPlan')
  })
})

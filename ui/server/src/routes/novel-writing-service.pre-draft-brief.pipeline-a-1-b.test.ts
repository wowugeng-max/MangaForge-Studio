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

describe('chapter pre-draft brief pipeline a 1 b', () => {
  test('carries intent confirmation sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 25, chapter_no: 25, title: '封条来源' },
      [
        { id: 24, chapter_no: 24, title: '第二枚编号' },
        { id: 25, chapter_no: 25, title: '封条来源' },
      ],
      [
        {
          id: 236,
          chapter_id: 24,
          review_type: 'intent_confirmation_sync',
          created_at: '2026-06-09T09:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 24,
            chapter_no: 24,
            intent_confirmation_sync: {
              status: 'warn',
              label: '意图确认缺口 2',
              summary: '正文有 2 项意图确认缺口。',
              missed_count: 2,
              missed: [
                { label: '代价/收益', text: '林青禾公开得罪会长的代价没有落地。' },
                { label: '章尾承接', text: '第二枚编号没有接到下一章问题。' },
              ],
              next_actions: [
                '下一章必须补意图确认：先让代价收益可见，再把第二枚编号接成章尾追问。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 25,
        title: '封条来源',
        summary: '李玄追问第二枚编号背后的封条来源。',
        conflict: '会长试图把林青禾公开作证的代价转成对她的惩罚。',
        ending_hook: '封条来源指向禁门外的第三个证人。',
        scene_cards: [
          { scene_no: 1, title: '封条来源', reader_payoff: '意图确认缺口被正文补上。' },
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
      { chapter_no: 25, title: '封条来源' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修意图确认')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修意图：意图确认缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('先让代价收益可见')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('章尾承接')
    expect(prompt).toContain('修意图：意图确认缺口 2')
    expect(prompt).toContain('第二枚编号接成章尾追问')
  })
  test('carries nested pre-draft execution receipt misses from prose quality into the next pre-draft brief', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 31, chapter_no: 31, title: '第三枚封条' },
      [
        {
          id: 30,
          chapter_no: 30,
          title: '封条滴血',
          raw_payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                intent_confirmation_checks: [
                  {
                    key: 'emotion_target',
                    label: '情绪目标',
                    delivered: false,
                    evidence: '正文只写了发现封条，没有从压迫转到反制。',
                    remaining_risk: '压迫后的反制情绪没有落到正文。',
                  },
                ],
                benchmark_recall_checks: [
                  {
                    key: 'rhythm_reference',
                    label: '节奏参照',
                    delivered: false,
                    evidence: '没有三轮压问，证据一出现就结束。',
                    remaining_risk: '文风召回里的先压后爆没有执行。',
                  },
                ],
              },
            },
          },
        },
        { id: 31, chapter_no: 31, title: '第三枚封条' },
      ],
      [
        {
          id: 730,
          chapter_id: 30,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 30,
            chapter_no: 30,
            score: 86,
            passed: true,
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                intent_confirmation_checks: [
                  {
                    key: 'emotion_target',
                    label: '情绪目标',
                    delivered: false,
                    evidence: '正文只写了发现封条，没有从压迫转到反制。',
                    remaining_risk: '压迫后的反制情绪没有落到正文。',
                  },
                ],
                benchmark_recall_checks: [
                  {
                    key: 'rhythm_reference',
                    label: '节奏参照',
                    delivered: false,
                    evidence: '没有三轮压问，证据一出现就结束。',
                    remaining_risk: '文风召回里的先压后爆没有执行。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 31,
        title: '第三枚封条',
        summary: '李玄追查第三枚封条的来源。',
        conflict: '会长试图把封条滴血解释成旧规误判。',
        ending_hook: '第三枚封条指向内门供词。',
        scene_cards: [
          { scene_no: 1, title: '第三枚封条', reader_payoff: '写前执行缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:30:00.000Z',
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
      { chapter_no: 31, title: '第三枚封条' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修意图确认')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('意图确认：执行偏移 1')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('文风召回：召回缺口 1')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('压迫后的反制情绪没有落到正文')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('文风召回里的先压后爆没有执行')
    expect(prompt).toContain('压迫后的反制情绪没有落到正文')
    expect(prompt).toContain('文风召回里的先压后爆没有执行')
  })
  test('carries intent confirmation execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 32, chapter_no: 32, title: '反制封条' },
      [
        { id: 31, chapter_no: 31, title: '第三枚封条' },
        { id: 32, chapter_no: 32, title: '反制封条' },
      ],
      [
        {
          id: 731,
          chapter_id: 31,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:31:00.000Z',
          payload: JSON.stringify({
            chapter_id: 31,
            chapter_no: 31,
            self_check: {
              review: {
                intent_confirmation_checks: [
                  {
                    key: 'chapter_goal_drift',
                    label: '章节目标偏移',
                    status: 'fail',
                    intent_field: 'chapter_goal',
                    expected_intent: '本章目标必须让李玄用第三枚封条反制会长。',
                    delivered_evidence: '正文只解释封条来历，没有让李玄形成反制。',
                    blueprint_link: 'chapter_blueprint.core_turn',
                    evidence: '章节目标从反制会长偏成解释设定。',
                    fix: '下一章开篇先让第三枚封条造成会长规则误判，中段让李玄用误判反制。',
                    remaining_risk: '不能继续把第三枚封条写成设定说明。',
                  },
                  {
                    key: 'emotion_target_ok',
                    label: '情绪目标',
                    status: 'pass',
                    intent_field: 'emotion_target',
                    expected_intent: '从压迫转为反制。',
                    delivered_evidence: '已兑现。',
                    blueprint_link: 'chapter_blueprint.emotion',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 32,
        title: '反制封条',
        summary: '李玄用第三枚封条造成会长规则误判。',
        conflict: '会长试图把封条误判解释成旧规误差。',
        ending_hook: '误判结果指向第四枚封条。',
        scene_cards: [
          { scene_no: 1, title: '封条误判', reader_payoff: '意图确认字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:32:00.000Z',
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
      { chapter_no: 32, title: '反制封条' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修意图确认')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('意图确认：执行偏移 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('intent_confirmation_checks.章节目标偏移')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('intent_field=chapter_goal')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('expected_intent=本章目标必须让李玄用第三枚封条反制会长')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('blueprint_link=chapter_blueprint.core_turn')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('情绪目标')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('意图确认')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('intent_field')
    expect(prompt).toContain('intent_confirmation_checks.章节目标偏移')
    expect(prompt).toContain('不能继续把第三枚封条写成设定说明')
  })
  test('carries write-preparation execution receipt misses into the next pre-draft brief', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 32, chapter_no: 32, title: '钥匙回声' },
      [
        {
          id: 31,
          chapter_no: 31,
          title: '第三枚封条',
          raw_payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    key: 'asset_linkage',
                    label: '旧钥匙挂钩',
                    delivered: false,
                    evidence: '正文用了旧钥匙开门，但没有交代旧钥匙和母亲旧铺印记的关系。',
                    remaining_risk: '孤立资产仍未挂到主线证据链。',
                  },
                ],
              },
            },
          },
        },
        { id: 32, chapter_no: 32, title: '钥匙回声' },
      ],
      [
        {
          id: 731,
          chapter_id: 31,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:40:00.000Z',
          payload: JSON.stringify({
            chapter_id: 31,
            chapter_no: 31,
            score: 84,
            passed: true,
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    key: 'asset_linkage',
                    label: '旧钥匙挂钩',
                    delivered: false,
                    evidence: '正文用了旧钥匙开门，但没有交代旧钥匙和母亲旧铺印记的关系。',
                    remaining_risk: '孤立资产仍未挂到主线证据链。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 32,
        title: '钥匙回声',
        summary: '李玄用旧钥匙反查母亲旧铺印记。',
        conflict: '会长试图把旧钥匙解释成伪造证据。',
        ending_hook: '旧钥匙的回声指向旧铺账本。',
        scene_cards: [
          { scene_no: 1, title: '钥匙回声', reader_payoff: '写前准备缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:45:00.000Z',
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
      { chapter_no: 32, title: '钥匙回声' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修写前准备')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('写前准备：执行缺口 1')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('孤立资产仍未挂到主线证据链')
    expect(prompt).toContain('写前准备：执行缺口 1')
    expect(prompt).toContain('旧钥匙和母亲旧铺印记')
  })
  test('carries write preparation execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 33, chapter_no: 33, title: '钥匙归属' },
      [
        { id: 32, chapter_no: 32, title: '钥匙回声' },
        { id: 33, chapter_no: 33, title: '钥匙归属' },
      ],
      [
        {
          id: 733,
          chapter_id: 32,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:45:30.000Z',
          payload: JSON.stringify({
            chapter_id: 32,
            chapter_no: 32,
            self_check: {
              review: {
                write_preparation_checks: [
                  {
                    key: 'asset_risk_old_key',
                    label: '旧钥匙资产风险',
                    status: 'fail',
                    preparation_type: 'asset_risks',
                    expected: '旧钥匙必须和母亲旧铺印记挂钩，并成为主线证据。',
                    delivered_evidence: '正文只让旧钥匙开门，没有说明旧铺印记。',
                    chapter_location: '中段开门场',
                    evidence: '旧钥匙仍像孤立道具。',
                    fix: '下一章中段让旧钥匙回声指向母亲旧铺印记。',
                    remaining_risk: '不能继续把旧钥匙只当开门工具。',
                  },
                  {
                    key: 'blueprint_focus_ok',
                    label: '蓝图焦点',
                    status: 'pass',
                    preparation_type: 'blueprint_focus',
                    expected: '本章必须追查钥匙来源。',
                    delivered_evidence: '已兑现。',
                    chapter_location: '第一场',
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 33,
        title: '钥匙归属',
        summary: '李玄把旧钥匙回声和母亲旧铺印记挂钩。',
        conflict: '会长试图把旧钥匙解释成普通钥匙。',
        ending_hook: '旧铺印记背面露出第二把钥匙编号。',
        scene_cards: [
          { scene_no: 1, title: '钥匙归属', reader_payoff: '写前准备字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:46:00.000Z',
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
      { chapter_no: 33, title: '钥匙归属' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修写前准备')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('写前准备：执行缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('write_preparation_checks.旧钥匙资产风险')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('preparation_type=asset_risks')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('母亲旧铺印记')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('chapter_location=中段开门场')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('蓝图焦点')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('写前准备')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('asset_risks')
    expect(prompt).toContain('write_preparation_checks.旧钥匙资产风险')
    expect(prompt).toContain('不能继续把旧钥匙只当开门工具')
  })
})

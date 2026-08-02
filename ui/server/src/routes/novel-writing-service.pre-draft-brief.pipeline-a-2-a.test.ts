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

describe('chapter pre-draft brief pipeline a 2 a', () => {
  test('carries creation contract execution misses as priority work into the next pre-draft brief', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 33, chapter_no: 33, title: '第二条规则' },
      [
        {
          id: 32,
          chapter_no: 32,
          title: '钥匙回声',
          raw_payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    key: 'creation_contract_checklist_target_reader',
                    label: '创作契约：目标读者',
                    delivered: false,
                    evidence: '正文只写旧钥匙开门，没有给规则破解读者可感知的反制回报。',
                    remaining_risk: '目标读者想看的规则破解爽点没有落成正文证据。',
                  },
                ],
              },
            },
          },
        },
        { id: 33, chapter_no: 33, title: '第二条规则' },
      ],
      [
        {
          id: 732,
          chapter_id: 32,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:46:00.000Z',
          payload: JSON.stringify({
            chapter_id: 32,
            chapter_no: 32,
            score: 86,
            passed: true,
            self_check: {
              review: {
                write_preparation_checks: [
                  {
                    key: 'creation_contract_checklist_target_reader',
                    label: '创作契约：目标读者',
                    status: 'warn',
                    evidence: '正文只写旧钥匙开门，没有给规则破解读者可感知的反制回报。',
                    fix: '下一章补出规则破解爽点：让旧钥匙触发规则判定、代价和反制结果。',
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
        title: '第二条规则',
        summary: '李玄用旧钥匙反推第二条规则。',
        conflict: '会长试图把反制结果解释成偶然。',
        ending_hook: '旧钥匙浮出第二个旧铺印记。',
        scene_cards: [
          { scene_no: 1, title: '第二条规则', reader_payoff: '规则破解爽点被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:47:00.000Z',
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
      { chapter_no: 33, title: '第二条规则' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('创作契约：执行缺口 1')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('规则破解爽点')
    expect(prompt).toContain('创作契约：执行缺口 1')
    expect(prompt).toContain('规则破解读者可感知的反制回报')
  })
  test('turns creation contract carry-over into staged repair actions for the next chapter', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 34, chapter_no: 34, title: '第三条规则' },
      [
        {
          id: 33,
          chapter_no: 33,
          title: '第二条规则',
          raw_payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    key: 'creation_contract_checklist_reader_retention',
                    label: '创作契约：追读留存',
                    delivered: false,
                    evidence: '章末只解释第二条规则，没有把规则破解后的新威胁挂到下一章。',
                    remaining_risk: '追读留存契约没有落成章末新问题和下一章行动压力。',
                  },
                ],
              },
            },
          },
        },
        { id: 34, chapter_no: 34, title: '第三条规则' },
      ],
      [
        {
          id: 733,
          chapter_id: 33,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:48:00.000Z',
          payload: JSON.stringify({
            chapter_id: 33,
            chapter_no: 33,
            self_check: {
              review: {
                write_preparation_checks: [
                  {
                    key: 'creation_contract_checklist_reader_retention',
                    label: '创作契约：追读留存',
                    status: 'warn',
                    evidence: '章末只解释第二条规则，没有把规则破解后的新威胁挂到下一章。',
                    fix: '下一章开篇先承接第二条规则的后果，中段让第三条规则制造反制代价，章尾抛出更高一级的新问题。',
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
        chapter_no: 34,
        title: '第三条规则',
        summary: '李玄追查第三条规则的代价。',
        conflict: '第三条规则要求他在救人和保留证据之间做选择。',
        ending_hook: '第三条规则背后浮出旧铺真正主人。',
        scene_cards: [
          { scene_no: 1, title: '第三条规则', reader_payoff: '追读留存缺口被转成新威胁。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:49:00.000Z',
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
      { chapter_no: 34, title: '第三条规则' },
    )

    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('创作契约')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('创作契约')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('创作契约')
    expect(prompt).toContain('下一章开篇先承接第二条规则的后果')
    expect(prompt).toContain('章尾抛出更高一级的新问题')
  })
  test('prioritizes creation contract misses over ordinary delivery risks', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 35, chapter_no: 35, title: '第四条规则' },
      [
        {
          id: 34,
          chapter_no: 34,
          title: '第三条规则',
          raw_payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    key: 'creation_contract_checklist_core_promise',
                    label: '创作契约：核心承诺',
                    delivered: false,
                    evidence: '正文写了规则解释，但没有兑现主角用规则反杀的核心承诺。',
                    remaining_risk: '核心承诺没有落成读者可感知的规则反杀证据。',
                  },
                ],
              },
            },
          },
        },
        { id: 35, chapter_no: 35, title: '第四条规则' },
      ],
      [
        {
          id: 734,
          chapter_id: 34,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-10T08:50:00.000Z',
          payload: JSON.stringify({
            chapter_id: 34,
            chapter_no: 34,
            chapter_core_drift: {
              status: 'warn',
              label: '核心偏移',
              risk_count: 1,
              issues: [{ label: '核心偏移', issue: '章末只总结规则，没有留下新的追查目标。' }],
            },
          }),
        },
        {
          id: 735,
          chapter_id: 34,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:51:00.000Z',
          payload: JSON.stringify({
            chapter_id: 34,
            chapter_no: 34,
            self_check: {
              review: {
                write_preparation_checks: [
                  {
                    key: 'creation_contract_checklist_core_promise',
                    label: '创作契约：核心承诺',
                    status: 'warn',
                    evidence: '正文写了规则解释，但没有兑现主角用规则反杀的核心承诺。',
                    fix: '下一章必须先用第四条规则写出主角主动设局、触发规则、反制对手的正文证据。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(deliveryRiskCarryOver?.items[0]).toContain('创作契约：执行缺口 1')
    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('守核心：核心偏移')
    expect(deliveryRiskCarryOver?.required_actions.join('｜')).toContain('规则反杀')
  })
  test('treats target reader and genre positioning misses as creation contract carry-over', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 36, chapter_no: 36, title: '第五条规则' },
      [
        { id: 35, chapter_no: 35, title: '第四条规则' },
        { id: 36, chapter_no: 36, title: '第五条规则' },
      ],
      [
        {
          id: 736,
          chapter_id: 35,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:52:00.000Z',
          payload: JSON.stringify({
            chapter_id: 35,
            chapter_no: 35,
            self_check: {
              review: {
                target_reader_checks: [
                  {
                    key: 'reader_desire_visible_payoff',
                    label: '目标读者：规则破解爽点',
                    status: 'warn',
                    evidence: '正文让主角解释规则，但没有给读者看到规则破解后的反制快感。',
                    fix: '下一章必须把目标读者想看的规则破解爽点写成主角主动验证、触发规则、反制对手的现场证据。',
                  },
                ],
                genre_positioning_checks: [
                  {
                    key: 'genre_formula_anchor',
                    label: '题材定位：规则怪谈公式',
                    status: 'fail',
                    evidence: '本章规则只像背景设定，没有形成规则压力、试探代价和破局公式。',
                    fix: '下一章必须用规则压力、试探代价、破局公式三步拉回规则怪谈题材长板。',
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
        chapter_no: 36,
        title: '第五条规则',
        summary: '李玄用第五条规则反查旧铺主人。',
        conflict: '旧铺主人试图让规则反噬李玄。',
        ending_hook: '第五条规则指向母亲旧案真正证人。',
        scene_cards: [
          { scene_no: 1, title: '第五条规则', reader_payoff: '目标读者和题材定位缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:53:00.000Z',
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
      { chapter_no: 36, title: '第五条规则' },
    )

    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('创作契约：目标读者缺口 1')
    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('创作契约：题材定位缺口 1')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('创作契约')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('规则压力、试探代价、破局公式')
    expect(prompt).toContain('规则破解后的反制快感')
    expect(prompt).toContain('规则压力、试探代价、破局公式')
  })
  test('carries prose self-review chapter handoff misses into the next pre-draft brief', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 34, chapter_no: 34, title: '水痕名单' },
      [
        { id: 33, chapter_no: 33, title: '门外水痕' },
        { id: 34, chapter_no: 34, title: '水痕名单' },
      ],
      [
        {
          id: 733,
          chapter_id: 33,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:50:00.000Z',
          payload: JSON.stringify({
            chapter_id: 33,
            chapter_no: 33,
            score: 86,
            passed: true,
            self_check: {
              review: {
                chapter_handoff_checks: [
                  {
                    key: 'opening_obligation',
                    label: '开篇义务',
                    status: 'warn',
                    evidence: '前300字直接切到新场景，没有接住上一章玻璃门水痕。',
                    fix: '下一章开篇先回到玻璃门前确认水痕名单，再推进新线索。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '午夜校规', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 34,
        title: '水痕名单',
        summary: '李辰回到玻璃门前核对水痕名单。',
        conflict: '宿舍规则阻止他公开查名单。',
        ending_hook: '名单末尾出现主角自己的名字。',
        scene_cards: [
          { scene_no: 1, title: '核对水痕', reader_payoff: '章首承接缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:55:00.000Z',
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
      { chapter_no: 34, title: '水痕名单' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修章首承接')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('章首承接：承接缺口 1')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('前300字直接切到新场景')
    expect(prompt).toContain('章首承接：承接缺口 1')
    expect(prompt).toContain('玻璃门前确认水痕名单')
  })
  test('carries prose review chapter handoff execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 35, chapter_no: 35, title: '旧广播室' },
      [
        { id: 34, chapter_no: 34, title: '水痕名单' },
        { id: 35, chapter_no: 35, title: '旧广播室' },
      ],
      [
        {
          id: 734,
          chapter_id: 34,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:56:00.000Z',
          payload: JSON.stringify({
            chapter_id: 34,
            chapter_no: 34,
            self_check: {
              review: {
                chapter_handoff_checks: [
                  {
                    key: 'previous_handoff_unresolved',
                    label: '上一章承接',
                    status: 'fail',
                    previous_handoff: '名单末尾出现主角自己的名字。',
                    opening_obligation: '下一章前300字必须让主角先核对名单水痕和自己的名字。',
                    opening_evidence: '正文开篇直接跳到旧广播室，没有回看水痕名单。',
                    location: '前300字',
                    continuity_action: '先让主角用湿鞋印反查名单来源，再进入旧广播室。',
                    evidence: '上一章章末钩子沉没。',
                    fix: '下一章第一场先处理名单末尾自己的名字，再推进广播室。',
                    remaining_risk: '不能把名单钩子留到中段旁白解释。',
                  },
                  {
                    key: 'handoff_ok',
                    label: '章末交接',
                    status: 'pass',
                    previous_handoff: '已承接湿鞋印。',
                    opening_obligation: '已完成。',
                    opening_evidence: '已兑现。',
                    location: '前300字',
                    continuity_action: '已落地。',
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
    const project = { title: '午夜校规', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 35,
        title: '旧广播室',
        summary: '李辰带着水痕名单追到旧广播室。',
        conflict: '广播室门禁要求他先证明名单来源。',
        ending_hook: '广播里念出名单第二个名字。',
        scene_cards: [
          { scene_no: 1, title: '名单回看', conflict: '水痕名单逼主角先核对自己的名字。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T09:00:00.000Z',
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
      { chapter_no: 35, title: '旧广播室' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修章首承接')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('章首承接：承接缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('chapter_handoff_checks.上一章承接')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('名单末尾出现主角自己的名字')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('先让主角用湿鞋印反查名单来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('已承接湿鞋印')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('前300字')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('水痕名单')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('continuity_action')
    expect(prompt).toContain('chapter_handoff_checks.上一章承接')
    expect(prompt).toContain('不能把名单钩子留到中段旁白解释')
  })
})

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

describe('chapter pre-draft brief sync-audience b b', () => {
  test('carries failed quality gate reasons into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '门槛复查' },
      [
        { id: 3, chapter_no: 3, title: '门槛旧章' },
        { id: 4, chapter_no: 4, title: '门槛复查' },
      ],
      [
        {
          id: 700,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                score: 91,
                passed: true,
                issues: [],
              },
            },
            quality_gate: {
              passed: false,
              score: 91,
              reasons: [
                '结构化自检失败 1 项：场景回执未闭环：场景2证据不在正文中',
                '承接回执未兑现 1 项：开篇承接没有前300字证据',
              ],
              gate: { min_score: 78 },
            },
          }),
        },
      ],
    )
    const project = { title: '午夜校规', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '门槛复查',
        summary: '复查上一章没有落地的场景回执和开篇承接。',
        conflict: '主角必须用现场证据补齐门槛旧章的承接债。',
        ending_hook: '门槛白线后出现第二条未确认回执。',
        scene_cards: [
          { scene_no: 1, title: '白线复查', reader_payoff: '把上一章漏掉的承接证据写成现场推进。' },
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
      { chapter_no: 4, title: '门槛复查' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('质量门禁：门禁未过 2')
    expect(brief.delivery_risk_carry_over.items.join('｜')).not.toContain('质量门禁：低分未过 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('场景回执未闭环')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('开篇承接没有前300字证据')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('质量门禁')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('质量门禁')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('质量门禁')
    expect(prompt).toContain('质量门禁')
    expect(prompt).toContain('质量门禁：门禁未过 2')
    expect(prompt).toContain('场景回执未闭环')
    expect(prompt).toContain('开篇承接没有前300字证据')
    expect(prompt).not.toContain('质量分 91 低于 78')
  })

  test('carries nested oh-story revision receipt residuals into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '账册缺页' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 204,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:06:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              revision: {
                oh_story_delivery_receipts: {
                  revision_receipts: [
                    {
                      issue_index: 0,
                      severity: 'S2',
                      category: 'structure',
                      applied_fix: '补章末现场钩子',
                      changed_evidence: '第三声钟响后，守将闯入。',
                      remaining_risk: '守将动机仍需下一章补证据。',
                    },
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
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先复核修订')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('复核修订：修订残留 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('守将动机仍需下一章补证据')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('复核修订开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('补证据')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('守将动机仍需下一章补证据')
    expect(prompt).toContain('复核修订：修订残留 1')
    expect(prompt).toContain('守将动机仍需下一章补证据')
  })

  test('carries unresolved scene-card serial risk repair checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '旧盟约重签' },
      [
        { id: 2, chapter_no: 2, title: '账册缺页' },
        { id: 3, chapter_no: 3, title: '旧盟约重签' },
      ],
      [
        {
          id: 204,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:06:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                serial_risk_repair_checks: [
                  {
                    key: 'scene_serial_risk_repair_1_missing',
                    label: '场景近章风险修复检查',
                    status: 'warn',
                    evidence: '场景1《旧盟约重签》标注风险修复 two_chapter_momentum_stall，但正文窗口缺少目标推进和关系变化证据。',
                    fix: '下一章必须把账册新证据写成可见目标推进，并让盟友关系发生一次明确变化。',
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
        chapter_no: 3,
        title: '旧盟约重签',
        summary: '用账册缺页逼盟友改口。',
        conflict: '盟友仍怕牵连，不肯作证。',
        ending_hook: '账册背面浮出第二个签名。',
        scene_cards: [
          { scene_no: 1, title: '账册对质', reader_payoff: '账册证据迫使盟友改口。' },
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
      { chapter_no: 3, title: '旧盟约重签' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修近章风险')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('近章风险修复：修复缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('下一章必须把账册新证据写成可见目标推进')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('近章风险修复：修复缺口 1')
    expect(prompt).toContain('账册新证据写成可见目标推进')
  })

  test('carries serial risk repair execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '第二个签名' },
      [
        { id: 2, chapter_no: 2, title: '账册缺页' },
        { id: 3, chapter_no: 3, title: '第二个签名' },
      ],
      [
        {
          id: 205,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:07:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                serial_risk_repair_checks: [
                  {
                    label: '近章动能空转',
                    status: 'warn',
                    risk_type: 'two_chapter_momentum_stall',
                    repair_receipt: '场景卡要求账册新证据推进目标，但正文只复述旧盟约。',
                    continuity_change: '盟友从拒绝作证改为答应带路。',
                    state_change: '账册缺页从线索变成公开证据。',
                    evidence: '场景2仍停在旧盟约复述，缺少目标推进和状态变化。',
                    fix: '下一章必须让账册证据触发新阻碍，并让盟友关系发生一次明确变化。',
                    remaining_risk: '不要再只解释账册缺页，要把它写成现场阻碍。',
                  },
                  {
                    label: '关系调剂已完成',
                    status: 'pass',
                    evidence: '盟友已经递出半枚印纹。',
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
        chapter_no: 3,
        title: '第二个签名',
        summary: '查出第二个签名是谁留下的。',
        conflict: '盟友带路后发现账册证据会引来新阻碍。',
        ending_hook: '第二个签名在雨水里倒写出主角的名字。',
        scene_cards: [
          { scene_no: 1, title: '雨巷验账', reader_payoff: '账册证据触发新阻碍。' },
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
      { chapter_no: 3, title: '第二个签名' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修近章风险')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('近章风险修复：修复缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('serial_risk_repair_checks.近章动能空转')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('risk_type=two_chapter_momentum_stall')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('repair_receipt=场景卡要求账册新证据推进目标')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('continuity_change=盟友从拒绝作证改为答应带路')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('state_change=账册缺页从线索变成公开证据')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('关系调剂已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('risk_type')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('repair_receipt')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('state_change')
    expect(prompt).toContain('serial_risk_repair_checks.近章动能空转')
    expect(prompt).toContain('不要再只解释账册缺页')
  })

  test('carries unresolved revision directives into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '第二个签名' },
      [
        { id: 2, chapter_no: 2, title: '账册缺页' },
        { id: 3, chapter_no: 3, title: '第二个签名' },
      ],
      [
        {
          id: 205,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                revision_directives: [
                  'ten_chapter_selling_point：补核心卖点、能力使用、规则限制、读者回报或章末新期待。',
                  '压缩不推动剧情、信息或情绪变化的环境描写。',
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
        chapter_no: 3,
        title: '第二个签名',
        summary: '追查账册背面的第二个签名。',
        conflict: '盟友只肯交出半页证据。',
        ending_hook: '签名墨迹和主角掌心发出同一种冷光。',
        scene_cards: [
          { scene_no: 1, title: '半页账册', reader_payoff: '第二个签名指向更高层的规则漏洞。' },
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
      { chapter_no: 3, title: '第二个签名' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先执行修订指令')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修订指令：明确指令 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('ten_chapter_selling_point')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('压缩不推动剧情')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('ten_chapter_selling_point')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('压缩不推动剧情')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('章末新期待')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('修订指令：明确指令 2')
    expect(prompt).toContain('补核心卖点')
    expect(prompt).toContain('压缩不推动剧情')
  })

  test('carries unresolved focused revision modes into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '追入旧巷' },
      [
        { id: 2, chapter_no: 2, title: '账册缺页' },
        { id: 3, chapter_no: 3, title: '追入旧巷' },
      ],
      [
        {
          id: 206,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:10:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                focused_revision_modes: ['expand_action', 'cut_description', 'restore_hook'],
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
        title: '追入旧巷',
        summary: '主角追查账册缺页对应的旧巷入口。',
        conflict: '追踪目标钻入规则禁止靠近的巷口。',
        ending_hook: '巷底旧门上响起和账册同频的敲击。',
        scene_cards: [
          { scene_no: 1, title: '旧巷追踪', reader_payoff: '追踪动作揭开账册缺页的下一层入口。' },
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
      { chapter_no: 3, title: '追入旧巷' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 3')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先执行定向修订')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('定向修订：修订模式 3')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('expand_action')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('动作链')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('cut_description')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('restore_hook')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('expand_action')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('cut_description')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('restore_hook')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('定向修订：修订模式 3')
    expect(prompt).toContain('压缩不推动剧情')
    expect(prompt).toContain('章末钩子')
  })

  test('carries unresolved craft metric risks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '旧巷反制' },
      [
        { id: 2, chapter_no: 2, title: '追入旧巷' },
        { id: 3, chapter_no: 3, title: '旧巷反制' },
      ],
      [
        {
          id: 207,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:12:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                craft_metrics: {
                  action_detail_score: 58,
                  description_overuse_score: 82,
                  setting_consistency_score: 63,
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
        title: '旧巷反制',
        summary: '主角在旧巷里反制账册规则。',
        conflict: '旧巷规则限制主角能力使用。',
        ending_hook: '旧门背后传来第二页账册的翻动声。',
        scene_cards: [
          { scene_no: 1, title: '旧巷反制', reader_payoff: '主角用可见动作反制旧巷规则。' },
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
      { chapter_no: 3, title: '旧巷反制' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 3')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修正文工艺指标')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('正文工艺指标：指标风险 3')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('action_detail_score')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('动作链')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('description_overuse_score')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('压缩不推动剧情')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('setting_consistency_score')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('action_detail_score')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('description_overuse_score')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('setting_consistency_score')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('正文工艺指标：指标风险 3')
    expect(prompt).toContain('能力代价')
  })

  test('carries unresolved setting violations into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '旧印章回声' },
      [
        { id: 2, chapter_no: 2, title: '旧巷反制' },
        { id: 3, chapter_no: 3, title: '旧印章回声' },
      ],
      [
        {
          id: 208,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:14:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                setting_violations: [
                  {
                    setting_name: '旧印章',
                    type: 'ownership',
                    severity: 'high',
                    description: '正文写成主角已经拿到完整旧印章，但设定中只有半枚印纹，旧印章仍在祠堂封存。',
                    fix: '下一章必须保持主角只拿到半枚印纹，旧印章仍在祠堂封存；能力触发只能来自半枚印纹的残留规则。',
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
        chapter_no: 3,
        title: '旧印章回声',
        summary: '主角确认半枚印纹的残留规则。',
        conflict: '敌人诱导主角承认已经拿到完整旧印章。',
        ending_hook: '祠堂封存的旧印章背面响起回声。',
        scene_cards: [
          { scene_no: 1, title: '半枚印纹', reader_payoff: '主角用半枚印纹的规则反制诱导。' },
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
      { chapter_no: 3, title: '旧印章回声' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修设定违规')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('设定违规：违规风险 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旧印章')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('半枚印纹')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('祠堂封存')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('旧印章')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('能力触发')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('祠堂封存')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('设定违规：违规风险 1')
    expect(prompt).toContain('祠堂封存')
  })

  test('carries unresolved reader retention checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门后第二声' },
      [
        { id: 2, chapter_no: 2, title: '湿漉漉学生' },
        { id: 3, chapter_no: 3, title: '门后第二声' },
      ],
      [
        {
          id: 209,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:16:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                reader_retention_checks: [
                  {
                    key: 'hook_addiction_reward_randomness_missing',
                    label: 'Hook上瘾模型-奖励随机性',
                    status: 'warn',
                    evidence: '门外学生身份只被确认，没有给出额外收获、线索、权限、关系或地位变化。',
                    fix: '下一章必须在确认门外学生身份之外，补一个出乎意料的额外线索，并让主角产生沉没投入。',
                  },
                  {
                    key: 'retention_double_engine_hunger_missing',
                    label: '留存双引擎-饥饿缺口',
                    status: 'fail',
                    evidence: '章尾没有把广播是谁发出的信息差卡到下一章。',
                    fix: '下一章必须用信息差植入问号，把广播来源按剥洋葱方式卡到章末。',
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
        chapter_no: 3,
        title: '门后第二声',
        summary: '主角追问门外学生背后的广播来源。',
        conflict: '学生只肯说半句，广播却提前念出主角名字。',
        ending_hook: '广播里出现第二个和主角同名的人。',
        scene_cards: [
          { scene_no: 1, title: '第二声广播', reader_payoff: '门外学生身份之外出现新的广播线索。' },
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
      { chapter_no: 3, title: '门后第二声' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('创作契约：追读留存缺口 2')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('创作契约')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('Hook上瘾模型')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('剥洋葱')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('Hook上瘾模型')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('额外线索')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('广播来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('剥洋葱')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('创作契约：追读留存缺口 2')
    expect(prompt).toContain('沉没投入')
  })

})

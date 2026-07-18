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

describe('chapter pre-draft brief sync-receipts a', () => {
  test('prefers revised final next-chapter quality plan over stale initial review plan', () => {
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
                score: 71,
                passed: false,
                next_chapter_quality_plan: {
                  version: 'oh_story_next_chapter_quality_plan_v1',
                  quality_focus: ['旧计划：下一章只追门外学生。'],
                  opening_actions: ['旧计划：前300字继续站在门口犹豫。'],
                  middle_actions: ['旧计划：中段继续解释玻璃门。'],
                  ending_actions: ['旧计划：章末再写门外学生消失。'],
                  avoid_repetition: ['旧计划：避免旧收尾。'],
                  evidence_basis: ['旧计划来自初稿。'],
                },
              },
              revision: {
                next_chapter_quality_plan: {
                  version: 'oh_story_next_chapter_quality_plan_v1',
                  quality_focus: ['终稿计划：下一章改为追查校徽反光里的第二条规则。'],
                  opening_actions: ['终稿计划：前300字让主角用校徽反光定位第二条规则。'],
                  middle_actions: ['终稿计划：中段让门禁规则反噬假学生，形成新证据。'],
                  ending_actions: ['终稿计划：章末让第二条规则指向值班室名单。'],
                  avoid_repetition: ['终稿计划：不要再用初稿的门口犹豫开篇。'],
                  evidence_basis: ['终稿已经把门外学生消失改成校徽反光证据。'],
                },
              },
            },
          }),
        },
      ],
    )
    const allActions = [
      ...(deliveryRiskCarryOver?.items || []),
      ...(deliveryRiskCarryOver?.required_actions || []),
      ...(deliveryRiskCarryOver?.opening_actions || []),
      ...(deliveryRiskCarryOver?.middle_actions || []),
      ...(deliveryRiskCarryOver?.ending_actions || []),
    ].join('｜')

    expect(allActions).toContain('终稿计划：下一章改为追查校徽反光里的第二条规则')
    expect(allActions).toContain('终稿计划：前300字让主角用校徽反光定位第二条规则')
    expect(allActions).toContain('终稿计划：中段让门禁规则反噬假学生')
    expect(allActions).toContain('终稿计划：章末让第二条规则指向值班室名单')
    expect(allActions).not.toContain('旧计划：下一章只追门外学生')
    expect(allActions).not.toContain('旧计划：前300字继续站在门口犹豫')
  })

  test('carries high severity oh-story findings alias into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 205,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:05:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                score: 71,
                passed: false,
                findings: [
                  {
                    severity: 'S1',
                    category: 'structure',
                    location: '章尾',
                    evidence: '主角拿到名单后直接睡下，没有验证第三个名字。',
                    issue: '关键证据没有转成下一章行动压力。',
                    fix: '下一章开篇必须让主角立刻验证第三个名字，并遇到阻拦。',
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
        chapter_no: 1,
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
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('复盘审稿：S1问题 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('下一章开篇必须让主角立刻验证第三个名字')
    expect(prompt).toContain('复盘审稿：S1问题 1')
    expect(prompt).toContain('主角拿到名单后直接睡下')
    expect(prompt).toContain('下一章开篇必须让主角立刻验证第三个名字')
  })

  test('carries low five-dimension quality scores into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 205,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:06:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                five_dimension_scores: {
                  core_consistency: { score: 72, evidence: '核心冲突从守规救人偏成宿舍闲聊。', fix: '下一章开篇必须让门外学生身份和第一条规则重新形成正面冲突。' },
                  readability: { score: 69, evidence: '章末仍有“他知道，这只是开始”式总结。', fix: '下一章章末必须用现场证据或动作反转收束。' },
                  logic_coherence: { score: 82, evidence: '因果基本成立。' },
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

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('质量五维：低分维度 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门外学生身份和第一条规则重新形成正面冲突')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('现场证据或动作反转收束')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('正面冲突')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('他知道，这只是开始')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('现场证据或动作反转收束')
    expect(prompt).toContain('质量五维：低分维度 2')
    expect(prompt).toContain('核心冲突从守规救人偏成宿舍闲聊')
    expect(prompt).toContain('他知道，这只是开始')
  })

  test('carries readability ai smell findings into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 205,
          chapter_id: 2,
          review_type: 'readability_review',
          created_at: '2026-06-09T08:06:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            readability_review: {
              readability_score: 73,
              passed: false,
              ai_smell: {
                level: '中度',
                pattern_hits: [
                  { type: '章末总结体', evidence: '他知道，这只是开始。', location: '章末' },
                  { type: '抽象心理', evidence: '一种复杂的情绪涌上心头。', location: '中段' },
                ],
                rewrite_tactics: [
                  '下一章用可见动作和具体物件替代抽象心理。',
                  '章末必须用现场反转或新证据收束，不写总结句。',
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
        chapter_no: 1,
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

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('去AI味：AI味中度 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('下一章用可见动作和具体物件替代抽象心理')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('他知道，这只是开始')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('可读性开篇去AI味')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('具体物件')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('他知道，这只是开始')
    expect(prompt).toContain('去AI味：AI味中度 2')
    expect(prompt).toContain('章末必须用现场反转或新证据收束')
    expect(prompt).toContain('一种复杂的情绪涌上心头')
  })

  test('carries missed delivery risk receipts into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 206,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:07:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                score: 82,
                passed: true,
                delivery_risk_receipts: [
                  {
                    risk_item: '复盘审稿：S2问题 1',
                    required_action: '开篇追查湿漉漉学生身份。',
                    delivered: false,
                    evidence: '',
                    remaining_risk: '湿漉漉学生身份仍没有被追查，只写了宿舍环境。',
                  },
                  {
                    risk_item: '去AI味：AI味中度 2',
                    required_action: '章末用现场反转收束。',
                    delivered: true,
                    evidence: '水迹拼出第二个名字。',
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
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('复核承接：承接残留 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('湿漉漉学生身份仍没有被追查')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('章末用现场反转收束')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('开篇追查湿漉漉学生身份')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('只写了宿舍环境')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('湿漉漉学生身份仍没有被追查')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).not.toContain('不得拖到中段或章末补一句')
    expect(prompt).toContain('复核承接：承接残留 1')
    expect(prompt).toContain('湿漉漉学生身份仍没有被追查')
  })

  test('carries generic failed quality gate issues into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 5, chapter_no: 5, title: '水迹名单' },
      [
        { id: 4, chapter_no: 4, title: '水迹名字' },
        { id: 5, chapter_no: 5, title: '水迹名单' },
      ],
      [
        {
          id: 207,
          chapter_id: 4,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:00.000Z',
          payload: JSON.stringify({
            chapter_id: 4,
            chapter_no: 4,
            self_check: {
              review: {
                score: 71,
                passed: false,
                issues: [
                  {
                    severity: 'medium',
                    category: 'opening',
                    description: '开篇三段都在交代宿舍背景，没有冲突触发。',
                    suggestion: '下一章前300字用玻璃门新证据触发对抗。',
                  },
                  {
                    severity: 'low',
                    category: 'prose',
                    description: '个别句子略长。',
                    suggestion: '压短说明句。',
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
        chapter_no: 5,
        title: '水迹名单',
        summary: '主角追查水迹名单对应的旧床位。',
        conflict: '规则阻止他们公开查名单。',
        ending_hook: '名单末尾出现主角自己的名字。',
        scene_cards: [
          { scene_no: 1, title: '名单对抗', reader_payoff: '新证据触发当场对抗。' },
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
      { chapter_no: 5, title: '水迹名单' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修质量门禁')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('质量门禁：低分未过 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('玻璃门新证据触发对抗')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('压短说明句')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('玻璃门新证据触发对抗')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('开篇三段都在交代宿舍背景')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('质量分 71 低于 78')
    expect(prompt).toContain('质量门禁：低分未过 1')
    expect(prompt).toContain('开篇三段都在交代宿舍背景')
    expect(prompt).toContain('下一章前300字用玻璃门新证据触发对抗')
  })

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

  test('carries failed dialogue checks into the next pre-draft brief and prose prompt', () => {
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
                dialogue_checks: [
                  {
                    key: 'voice_distinction',
                    label: '角色声线差异',
                    status: 'fail',
                    evidence: '李超、张智、门外学生都在用同一种解释规则的口吻。',
                    fix: '下一章让李超用短句顶回去，张智只拆规则漏洞，门外学生只重复一句求救。',
                  },
                  {
                    key: 'subtext_agenda',
                    label: '潜台词与议程',
                    status: 'warn',
                    evidence: '角色把真实目的直接说出来，没有借口和试探。',
                    fix: '下一章把“我想进门”改成门外学生借丢失校牌试探开门规则。',
                  },
                  {
                    key: 'dialogue_format',
                    label: '对话独立成行',
                    status: 'pass',
                    evidence: '对白格式清楚。',
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
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修对白')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修对白：对白缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('李超用短句顶回去')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('丢失校牌试探开门规则')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('对白格式清楚')
    expect(prompt).toContain('修对白：对白缺口 2')
    expect(prompt).toContain('同一种解释规则的口吻')
    expect(prompt).toContain('真实目的直接说出来')
  })

  test('carries failed plot dynamics checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 212,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:13:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                plot_dynamics_checks: [
                  {
                    key: 'minimum_loop',
                    label: '目标阻碍反馈闭环',
                    status: 'fail',
                    evidence: '主角只是解释规则，没有行动、代价或新期待。',
                    fix: '下一章开篇让主角立刻验证水迹名字，并付出被宿管发现的代价。',
                  },
                  {
                    key: 'false_victory_collapse',
                    label: '假胜与崩解',
                    status: 'warn',
                    evidence: '主角发现线索后直接顺利推进，没有先给希望再击碎。',
                    fix: '下一章让水迹名字先指向安全答案，再被失踪名单推翻。',
                  },
                  {
                    key: 'ending_suspension',
                    label: '悬置收尾',
                    status: 'pass',
                    evidence: '章末留下水迹名字。',
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
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修剧情动力')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修剧情动力：动力缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('被宿管发现的代价')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('失踪名单推翻')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('章末留下水迹名字')
    expect(prompt).toContain('修剧情动力：动力缺口 2')
    expect(prompt).toContain('没有行动、代价或新期待')
    expect(prompt).toContain('先给希望再击碎')
  })

  test('carries failed continuity heat checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 5, chapter_no: 5, title: '旧钥匙缺口' },
      [
        { id: 4, chapter_no: 4, title: '水迹名字' },
        { id: 5, chapter_no: 5, title: '旧钥匙缺口' },
      ],
      [
        {
          id: 213,
          chapter_id: 4,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:13:00.000Z',
          payload: JSON.stringify({
            chapter_id: 4,
            chapter_no: 4,
            self_check: {
              review: {
                continuity_heat_checks: [
                  {
                    key: 'cold_foreshadowing',
                    label: '冷伏笔突然回收',
                    status: 'fail',
                    evidence: '旧钥匙三章未出现，章末突然成为破局答案。',
                    fix: '下一章先让角色发现钥匙缺口和旧锁痕，再推向回收。',
                  },
                  {
                    key: 'hot_element',
                    label: '当前 hot 元素',
                    status: 'warn',
                    evidence: '湿漉漉学生线索被搁置，改写无关宿舍闲聊。',
                    fix: '下一章开篇必须用湿漉漉学生继续施压。',
                  },
                  {
                    key: 'archived',
                    label: '已完结线',
                    status: 'pass',
                    evidence: '宿管查房线已自然关闭。',
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
        chapter_no: 5,
        title: '旧钥匙缺口',
        summary: '主角回收旧钥匙线索，确认它和宿舍门锁规则有关。',
        conflict: '湿漉漉学生再次施压，但室友想隐藏旧钥匙。',
        ending_hook: '旧锁痕里卡着三年前的学生证。',
        scene_cards: [
          { scene_no: 1, title: '钥匙缺口', reader_payoff: '旧钥匙从冷伏笔重新升温。' },
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
      { chapter_no: 5, title: '旧钥匙缺口' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修连续性热度')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('连续性热度：热度缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('钥匙缺口和旧锁痕')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('湿漉漉学生继续施压')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('宿管查房线已自然关闭')
    expect(prompt).toContain('连续性热度：热度缺口 2')
    expect(prompt).toContain('旧钥匙三章未出现')
    expect(prompt).toContain('无关宿舍闲聊')
  })

  test('carries failed character relation checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 6, chapter_no: 6, title: '公开作证' },
      [
        { id: 5, chapter_no: 5, title: '旧钥匙缺口' },
        { id: 6, chapter_no: 6, title: '公开作证' },
      ],
      [
        {
          id: 214,
          chapter_id: 5,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:13:00.000Z',
          payload: JSON.stringify({
            chapter_id: 5,
            chapter_no: 5,
            self_check: {
              review: {
                character_relation_checks: [
                  {
                    key: 'independent_goal',
                    label: '主角目标独立性',
                    status: 'fail',
                    evidence: '李玄整章只是在帮林青禾找证据，没有自己的试炼资格诉求。',
                    fix: '下一章开篇必须让李玄明确为了保住试炼资格主动要求复核阵图。',
                  },
                  {
                    key: 'npc_support',
                    label: '配角站桩',
                    status: 'warn',
                    evidence: '林青禾只在主角需要时作证，没有自己的顾虑和行动。',
                    fix: '下一章让林青禾先拒绝，再因家族风险选择有限作证。',
                  },
                  {
                    key: 'relationship_type',
                    label: '关系类型明确',
                    status: 'pass',
                    evidence: '执事权威压迫成立。',
                    fix: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 6,
        title: '公开作证',
        summary: '李玄要求复核阵图，林青禾在家族风险和事实之间做选择。',
        conflict: '林青禾作证会得罪执事，但沉默会让李玄失去试炼资格。',
        ending_hook: '林青禾作证后，阵盘裂出第二道光。',
        scene_cards: [
          { scene_no: 1, title: '复核阵图', reader_payoff: '李玄主动争取试炼资格。' },
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
      { chapter_no: 6, title: '公开作证' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修角色关系')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('角色关系：关系缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('保住试炼资格')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('有限作证')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('执事权威压迫成立')
    expect(prompt).toContain('角色关系：关系缺口 2')
    expect(prompt).toContain('没有自己的试炼资格诉求')
    expect(prompt).toContain('配角站桩')
  })

  test('carries failed benchmark recall checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 7, chapter_no: 7, title: '旧印章反推' },
      [
        { id: 6, chapter_no: 6, title: '公开作证' },
        { id: 7, chapter_no: 7, title: '旧印章反推' },
      ],
      [
        {
          id: 215,
          chapter_id: 6,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:13:00.000Z',
          payload: JSON.stringify({
            chapter_id: 6,
            chapter_no: 6,
            self_check: {
              review: {
                benchmark_recall_checks: [
                  {
                    key: 'rhythm_reference_missing',
                    label: '节奏参照失效',
                    status: 'fail',
                    evidence: '正文直接亮出旧印章，没有执行“先压三轮质问，再用证据爆发”。',
                    fix: '下一章开篇先让执事连续压问三轮，再让李玄晚半拍亮出旧印章反证。',
                  },
                  {
                    key: 'matched_technique_missing',
                    label: '匹配章技法缺席',
                    status: 'warn',
                    evidence: '旁观弟子反应只有整齐震惊，没有差异化反应。',
                    fix: '下一章让旁观弟子分成怀疑、倒戈、沉默三种反应，放大信息差反杀。',
                  },
                  {
                    key: 'copy_guard',
                    label: '未复制原文',
                    status: 'pass',
                    evidence: '没有发现对标章节原句。',
                    fix: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 7,
        title: '旧印章反推',
        summary: '李玄用旧印章反推出执事换证，逼旁观弟子重新站队。',
        conflict: '执事连续压问，试图抢走证词解释权。',
        ending_hook: '旧印章背面刻着第二个证人的名字。',
        scene_cards: [
          { scene_no: 1, title: '三轮压问', reader_payoff: '信息差反杀，执事失态。' },
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
      { chapter_no: 7, title: '旧印章反推' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修文风召回')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('文风召回：召回缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('连续压问三轮')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('怀疑、倒戈、沉默三种反应')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('没有发现对标章节原句')
    expect(prompt).toContain('文风召回：召回缺口 2')
    expect(prompt).toContain('没有执行“先压三轮质问，再用证据爆发”')
    expect(prompt).toContain('差异化反应')
  })

  test('carries benchmark recall execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '旧印反问' },
      [
        { id: 7, chapter_no: 7, title: '旧印章反推' },
        { id: 8, chapter_no: 8, title: '旧印反问' },
      ],
      [
        {
          id: 218,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:18:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                benchmark_recall_checks: [
                  {
                    key: 'rhythm_reference_missing',
                    label: '节奏参照失效',
                    status: 'fail',
                    source_type: 'rhythm',
                    source_path: '剧情/节奏.md',
                    expected_application: '先让执事三轮压问，再让李玄半拍亮出旧印证据。',
                    delivered_evidence: '正文开场直接交出旧印，缺少压问、停顿和半拍爆发。',
                    gaps_preserved: false,
                    evidence: '节奏参照没有落到正文动作。',
                    fix: '下一章开篇按三轮压问建立压迫，中段用半拍亮证据爆发。',
                    remaining_risk: '不能继续把对标节奏写成一句总结。',
                  },
                  {
                    key: 'style_boundary_ok',
                    label: '未复制桥段',
                    status: 'pass',
                    source_type: 'matched_chapter',
                    source_path: '对标/第12章.md',
                    expected_application: '只学习停顿节奏。',
                    delivered_evidence: '已兑现。',
                    gaps_preserved: true,
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
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '旧印反问',
        summary: '李玄用旧印反问执事，逼出旧证缺口。',
        conflict: '执事试图用连续压问夺回解释权。',
        ending_hook: '旧印缺口指向第三个证人。',
        scene_cards: [
          { scene_no: 1, title: '三轮压问', reader_payoff: '文风召回字段被正文执行。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:18:00.000Z',
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
      { chapter_no: 8, title: '旧印反问' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修文风召回')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('文风召回：召回缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('benchmark_recall_checks.节奏参照失效')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('source_type=rhythm')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('source_path=剧情/节奏.md')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('expected_application=先让执事三轮压问')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('delivered_evidence=正文开场直接交出旧印')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('gaps_preserved=false')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('未复制桥段')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('文风召回')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('expected_application')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('gaps_preserved')
    expect(prompt).toContain('benchmark_recall_checks.节奏参照失效')
    expect(prompt).toContain('不能继续把对标节奏写成一句总结')
  })

  test('carries failed style boundary checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 7, chapter_no: 7, title: '旧印章反推' },
      [
        { id: 6, chapter_no: 6, title: '公开作证' },
        { id: 7, chapter_no: 7, title: '旧印章反推' },
      ],
      [
        {
          id: 216,
          chapter_id: 6,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:14:00.000Z',
          payload: JSON.stringify({
            chapter_id: 6,
            chapter_no: 6,
            self_check: {
              review: {
                style_boundary_checks: [
                  {
                    key: 'gate_f_overridden_by_style',
                    label: '文风覆盖 Gate F',
                    status: 'fail',
                    evidence: '章尾为了模仿样章冷感，写成“这一切只是开始”的作者预告。',
                    fix: '下一章删掉为了模仿文风引入的章末升华，用旧印章背面的第二个名字做现场钩子。',
                  },
                  {
                    key: 'copy_boundary_breach',
                    label: '复制样章桥段',
                    status: 'warn',
                    evidence: '审判场景复用了样章的三次敲桌和同一句口癖。',
                    fix: '下一章保留压迫节奏，但改成证物裂纹、旁观倒戈和执事抢证，不复制样章桥段。',
                  },
                  {
                    key: 'hard_constraints_pass',
                    label: '硬约束通过',
                    status: 'pass',
                    evidence: '未发现禁用词。',
                    fix: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 7,
        title: '旧印章反推',
        summary: '李玄用旧印章反推出执事换证，逼旁观弟子重新站队。',
        conflict: '执事连续压问，试图抢走证词解释权。',
        ending_hook: '旧印章背面刻着第二个证人的名字。',
        scene_cards: [
          { scene_no: 1, title: '旧印章反推', reader_payoff: '信息差反杀，执事失态。' },
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
      { chapter_no: 7, title: '旧印章反推' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修文风边界')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('文风边界：边界缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('章末升华')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('不复制样章桥段')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('未发现禁用词')
    expect(prompt).toContain('文风边界：边界缺口 2')
    expect(prompt).toContain('模仿样章冷感')
    expect(prompt).toContain('复制样章桥段')
  })

})

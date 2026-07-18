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

describe('chapter pre-draft brief sync-craft b', () => {
  test('carries suspense execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '名册缺页' },
      [
        { id: 2, chapter_no: 2, title: '账页背面' },
        { id: 3, chapter_no: 3, title: '名册缺页' },
      ],
      [
        {
          id: 213,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:23:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                suspense_checks: [
                  {
                    key: 'answer_path_missing',
                    label: '答案路径断裂',
                    status: 'fail',
                    question: '账页背面的编号到底指向谁',
                    misdirect: '执事故意把编号解释成库房货号',
                    partial_answer: '编号其实是证人名册页码',
                    new_expectation: '名册缺掉的一页指向第三个证人',
                    evidence: '本章只抛出编号，没有可信提示、部分答案和新的期待接力。',
                    fix: '下一章必须先让编号触发可信误导，中段给出名册页码的部分答案，章尾挂出第三个证人。',
                    remaining_risk: '不能再只制造谜面而不给答案路径。',
                  },
                  {
                    key: 'misdirect_landed',
                    label: '误导可信',
                    status: 'pass',
                    question: '已兑现。',
                    misdirect: '已兑现。',
                    partial_answer: '已兑现。',
                    new_expectation: '已兑现。',
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
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '名册缺页',
        summary: '主角顺着账页背面的编号找到被撕掉的证人名册。',
        conflict: '执事试图把编号解释成普通货号，拖断答案路径。',
        ending_hook: '缺页边缘露出第三个证人的姓氏。',
        scene_cards: [
          { scene_no: 1, title: '编号误导', reader_payoff: '悬念编排字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:23:00.000Z',
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
      { chapter_no: 3, title: '名册缺页' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修悬念编排')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('悬念编排：悬念缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('suspense_checks.答案路径断裂')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('question=账页背面的编号到底指向谁')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('misdirect=执事故意把编号解释成库房货号')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('partial_answer=编号其实是证人名册页码')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('new_expectation=名册缺掉的一页指向第三个证人')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('误导可信')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('question')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('partial_answer')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('new_expectation')
    expect(prompt).toContain('suspense_checks.答案路径断裂')
    expect(prompt).toContain('不能再只制造谜面而不给答案路径')
  })

  test('carries reversal execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '证词反咬' },
      [
        { id: 2, chapter_no: 2, title: '旧账作证' },
        { id: 3, chapter_no: 3, title: '证词反咬' },
      ],
      [
        {
          id: 214,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:24:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                reversal_checks: [
                  {
                    key: 'fair_clue_missing',
                    label: '公平暗示不足',
                    status: 'warn',
                    reversal_type: '身份反转 + 信息反转',
                    fair_clues: '账页墨迹、证人称呼、执事避开的旧印三处暗示必须提前入场。',
                    misdirect: '让读者先以为旧印只证明账册调包。',
                    reveal_timing: '70-85% 段落揭示证人其实是旧案当事人。',
                    impact_after_reveal: '揭示后必须改变主角处境，让执事的指控反咬自己。',
                    evidence: '本章反转只靠章末一句新证人身份，前文缺公平暗示。',
                    fix: '下一章必须先补三处公平暗示，再用可信误导遮住身份反转，揭示后立刻改变局势。',
                    remaining_risk: '不能再用天降身份解释反转。',
                  },
                  {
                    key: 'timing_ok',
                    label: '揭示时机',
                    status: 'pass',
                    reversal_type: '已兑现。',
                    fair_clues: '已兑现。',
                    misdirect: '已兑现。',
                    reveal_timing: '已兑现。',
                    impact_after_reveal: '已兑现。',
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
    const project = { title: '旧账登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '证词反咬',
        summary: '旧案证人的身份反转让执事的指控反咬自己。',
        conflict: '执事把旧印解释成伪证，主角必须让暗示链在揭示前成立。',
        ending_hook: '证人喊出执事二十年前的旧名。',
        scene_cards: [
          { scene_no: 1, title: '旧印暗示', reader_payoff: '反转设计字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:24:00.000Z',
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
      { chapter_no: 3, title: '证词反咬' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修反转设计')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('反转设计：反转缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reversal_checks.公平暗示不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reversal_type=身份反转 + 信息反转')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('fair_clues=账页墨迹、证人称呼、执事避开的旧印')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('misdirect=让读者先以为旧印只证明账册调包')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reveal_timing=70-85%')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('impact_after_reveal=揭示后必须改变主角处境')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('揭示时机')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('fair_clues')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('reveal_timing')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('impact_after_reveal')
    expect(prompt).toContain('reversal_checks.公平暗示不足')
    expect(prompt).toContain('不能再用天降身份解释反转')
  })

  test('carries unresolved showdown checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '三方震动' },
      [
        { id: 2, chapter_no: 2, title: '旧台压阵' },
        { id: 3, chapter_no: 3, title: '三方震动' },
      ],
      [
        {
          id: 211,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                showdown_checks: [
                  {
                    key: 'trump_card_management_broken',
                    label: '底牌管理',
                    status: 'fail',
                    evidence: '旧台对抗里一次性摊空三张底牌，反派没有被对应压制，也没有补新后手。',
                    fix: '下一章必须只出一个底牌，保留两到三个未揭示底牌，出牌后补新技能、新后手、新目标或更高门槛。',
                  },
                  {
                    key: 'three_pressure_three_shock_missing',
                    label: '三压一爆三震',
                    status: 'warn',
                    evidence: '主角爆发后只写全场震惊，缺友方、敌方、中立方的不同震动和利益变化。',
                    fix: '下一章必须补友方、敌方、中立方三路压力，主角一爆碾压后分别写三方不同震动。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧台登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '三方震动',
        summary: '主角在旧台上用一张底牌压住三方质疑。',
        conflict: '友方怀疑、敌方逼战、中立方观望同时压上来。',
        ending_hook: '旧台背后的更高门槛亮起。',
        scene_cards: [
          { scene_no: 1, title: '三方压阵', reader_payoff: '主角只出一张底牌并造成三方不同震动。' },
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
      { chapter_no: 3, title: '三方震动' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修高潮对抗')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('高潮对抗：爽点缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('只出一个底牌')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('两到三个未揭示底牌')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('三方不同震动')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('高潮对抗：爽点缺口 2')
    expect(prompt).toContain('更高门槛')
  })

  test('carries showdown execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '一印压阵' },
      [
        { id: 3, chapter_no: 3, title: '三方逼战' },
        { id: 4, chapter_no: 4, title: '一印压阵' },
      ],
      [
        {
          id: 215,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:25:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                showdown_checks: [
                  {
                    key: 'payoff_release_weak',
                    label: '爽点释放不足',
                    status: 'fail',
                    payoff_release: '主角亮出一枚旧印后必须立刻压住敌方质疑。',
                    trump_card_used: '只使用旧印一张底牌，保留名册缺页和第三证人。',
                    pressure_layers: '友方先怀疑、敌方逼战、中立方观望加码。',
                    audience_reactions: '友方松口气，敌方失声，中立方改口记录。',
                    consequence: '执事的罚令当场失效，主角拿到翻旧案资格。',
                    next_threshold: '更高门槛是内库封印需要第三证人亲自开启。',
                    evidence: '本章铺了三方压力，但主角出牌后没有压制反派，也没有新门槛。',
                    fix: '下一章必须让一张底牌释放爽点，三方分别震动，并在结果后补更高门槛。',
                    remaining_risk: '不能再让底牌亮出后只换来统一震惊。',
                  },
                  {
                    key: 'stage_ok',
                    label: '舞台层级',
                    status: 'pass',
                    payoff_release: '已兑现。',
                    trump_card_used: '已兑现。',
                    pressure_layers: '已兑现。',
                    audience_reactions: '已兑现。',
                    consequence: '已兑现。',
                    next_threshold: '已兑现。',
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
    const project = { title: '旧台登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '一印压阵',
        summary: '主角只用旧印这一张底牌压住旧台三方。',
        conflict: '敌方逼主角摊空底牌，友方和中立方都在看他的出牌后果。',
        ending_hook: '内库封印亮出第三证人的名字。',
        scene_cards: [
          { scene_no: 1, title: '一印压阵', reader_payoff: '高潮对抗字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:25:00.000Z',
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
      { chapter_no: 4, title: '一印压阵' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修高潮对抗')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('高潮对抗：爽点缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('showdown_checks.爽点释放不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('payoff_release=主角亮出一枚旧印后必须立刻压住敌方质疑')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('trump_card_used=只使用旧印一张底牌')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('pressure_layers=友方先怀疑、敌方逼战、中立方观望加码')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('audience_reactions=友方松口气，敌方失声，中立方改口记录')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('consequence=执事的罚令当场失效')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('next_threshold=更高门槛是内库封印需要第三证人亲自开启')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('舞台层级')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('pressure_layers')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('trump_card_used')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('next_threshold')
    expect(prompt).toContain('showdown_checks.爽点释放不足')
    expect(prompt).toContain('不能再让底牌亮出后只换来统一震惊')
  })

  test('carries unresolved bridge unit checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '旧巷新目标' },
      [
        { id: 2, chapter_no: 2, title: '桥段断档' },
        { id: 3, chapter_no: 3, title: '旧巷新目标' },
      ],
      [
        {
          id: 212,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:22:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                bridge_unit_checks: [
                  {
                    key: 'continuous_expectation_broken',
                    label: '连续期待',
                    status: 'fail',
                    evidence: '本章兑现旧期待后没有挂新期待，章尾没有新目标或连续小期待。',
                    fix: '下一章必须在兑现旧期待前挂新期待，并在章尾给出新目标或连续小期待。',
                  },
                  {
                    key: 'two_chapter_momentum_stall',
                    label: '连续两章无推进',
                    status: 'warn',
                    evidence: '连续两章只复盘旧线索，没有目标推进、状态变化或阶段衔接。',
                    fix: '下一章必须提高冲突密度，让目标推进、关系/伏笔/状态承接余波至少落地一项。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧巷登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '旧巷新目标',
        summary: '主角兑现旧线索前先挂出旧巷里的新目标。',
        conflict: '旧线索能解眼前危机，但新目标会暴露更高层追踪。',
        ending_hook: '旧巷尽头出现下一阶段的门牌。',
        scene_cards: [
          { scene_no: 1, title: '挂新期待', reader_payoff: '兑现旧期待前挂出新目标，并留下连续小期待。' },
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
      { chapter_no: 3, title: '旧巷新目标' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修桥段节奏')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('桥段节奏：节奏缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('兑现旧期待前挂新期待')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('章尾给出新目标')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('关系/伏笔/状态承接余波')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('桥段节奏：节奏缺口 2')
    expect(prompt).toContain('连续小期待')
  })

  test('carries bridge unit execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 5, chapter_no: 5, title: '旧门新路' },
      [
        { id: 4, chapter_no: 4, title: '旧门余波' },
        { id: 5, chapter_no: 5, title: '旧门新路' },
      ],
      [
        {
          id: 216,
          chapter_id: 4,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:26:00.000Z',
          payload: JSON.stringify({
            chapter_id: 4,
            chapter_no: 4,
            self_check: {
              review: {
                bridge_unit_checks: [
                  {
                    key: 'stage_handoff_missing',
                    label: '阶段交接断档',
                    status: 'fail',
                    bridge_position: '四章桥段后的第1章，必须承接旧门余波并开启新阶段。',
                    old_expectation_payoff: '先兑现旧门封印为什么失效。',
                    new_expectation_seed: '再种下内库第三证人必须亲自开门的新期待。',
                    goal_progression: '主角目标从洗清旧账推进到进入内库找原始名册。',
                    climax_hook: '高潮中让内库门牌亮出半个证人姓氏。',
                    stage_handoff: '章尾交接到内库调查线，明确下一阶段行动地点和代价。',
                    evidence: '本章只处理旧门余波，没有给新目标、新期待和阶段交接。',
                    fix: '下一章必须先兑现旧门旧期待，再种新期待，并在章尾交接到内库调查线。',
                    remaining_risk: '不能再让过渡章只复盘旧信息。',
                  },
                  {
                    key: 'goal_progression_ok',
                    label: '目标推进',
                    status: 'pass',
                    bridge_position: '已兑现。',
                    old_expectation_payoff: '已兑现。',
                    new_expectation_seed: '已兑现。',
                    goal_progression: '已兑现。',
                    climax_hook: '已兑现。',
                    stage_handoff: '已兑现。',
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
    const project = { title: '旧巷登阶', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 5,
        title: '旧门新路',
        summary: '主角兑现旧门余波，同时把目标推进到内库原始名册。',
        conflict: '旧期待必须收束，但新阶段的地点和代价也必须亮出来。',
        ending_hook: '内库门牌亮出半个证人姓氏。',
        scene_cards: [
          { scene_no: 1, title: '旧门新路', reader_payoff: '桥段节奏字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:26:00.000Z',
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
      { chapter_no: 5, title: '旧门新路' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修桥段节奏')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('桥段节奏：节奏缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('bridge_unit_checks.阶段交接断档')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('bridge_position=四章桥段后的第1章')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('old_expectation_payoff=先兑现旧门封印为什么失效')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('new_expectation_seed=再种下内库第三证人必须亲自开门的新期待')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('goal_progression=主角目标从洗清旧账推进到进入内库找原始名册')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('climax_hook=高潮中让内库门牌亮出半个证人姓氏')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('stage_handoff=章尾交接到内库调查线')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('目标推进')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('old_expectation_payoff')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('goal_progression')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('stage_handoff')
    expect(prompt).toContain('bridge_unit_checks.阶段交接断档')
    expect(prompt).toContain('不能再让过渡章只复盘旧信息')
  })

  test('carries unresolved source readiness checks as source risks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门牌来源' },
      [
        { id: 2, chapter_no: 2, title: '旧门牌' },
        { id: 3, chapter_no: 3, title: '门牌来源' },
      ],
      [
        {
          id: 213,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:24:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                source_readiness_checks: [
                  {
                    key: 'source_readiness_previous_chapter',
                    label: '上一章正文来源',
                    status: 'fail',
                    evidence: '上一章正文没有读到，但本章把旧楼门牌变化写成既定事实。',
                    fix: '下一章必须先补齐上一章正文来源，再把旧楼门牌变化写成当前行动依据。',
                  },
                  {
                    key: 'source_readiness_character_state',
                    label: '角色状态来源',
                    status: 'warn',
                    evidence: '角色认知边界未确认，却写成主角已经知道门牌规则。',
                    fix: '下一章必须补齐角色状态和认知边界，不能把未就绪来源写成既定事实。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧楼门牌', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '门牌来源',
        summary: '主角先确认上一章门牌变化来源，再行动。',
        conflict: '门牌规则可用，但角色认知边界仍未补齐。',
        ending_hook: '门牌背面出现上一章遗漏的编号。',
        scene_cards: [
          { scene_no: 1, title: '补齐来源', reader_payoff: '来源就绪缺口被转成当前行动依据。' },
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
      { chapter_no: 3, title: '门牌来源' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补来源就绪')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('来源就绪：来源缺口 2')
    expect(brief.delivery_risk_carry_over.items.join('｜')).not.toContain('状态筛选：上下文缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('上一章正文来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('角色状态和认知边界')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('来源就绪：来源缺口 2')
    expect(prompt).toContain('未就绪来源')
  })

  test('carries nested source readiness receipts into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '补读来源' },
      [
        { id: 2, chapter_no: 2, title: '断章来源' },
        { id: 3, chapter_no: 3, title: '补读来源' },
      ],
      [
        {
          id: 214,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:25:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                oh_story_delivery_receipts: {
                  pre_draft_execution_receipts: {
                    source_readiness_checks: [
                      {
                        key: 'source_readiness_timeline',
                        label: '时间线来源',
                        status: 'fail',
                        evidence: '时间线来源未确认，却把门牌翻面时间写成既定事实。',
                        fix: '下一章先补时间线来源，再把门牌翻面时间写成角色能确认的行动依据。',
                      },
                    ],
                  },
                },
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧楼门牌', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '补读来源',
        summary: '主角先补读时间线来源，再决定是否触发门牌。',
        conflict: '门牌翻面可用，但时间线来源未确认。',
        ending_hook: '时间线背后出现新断点。',
        scene_cards: [
          { scene_no: 1, title: '补读时间线', reader_payoff: '来源缺口转成当前行动依据。' },
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
      { chapter_no: 3, title: '补读来源' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补来源就绪')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('来源就绪：来源缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('时间线来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门牌翻面时间')
    expect(prompt).toContain('来源就绪：来源缺口 1')
    expect(prompt).toContain('补时间线来源')
  })

  test('carries source readiness execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '旧档案缺页' },
      [
        { id: 3, chapter_no: 3, title: '门牌来源' },
        { id: 4, chapter_no: 4, title: '旧档案缺页' },
      ],
      [
        {
          id: 216,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:27:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                source_readiness_checks: [
                  {
                    key: 'source_archive_missing',
                    label: '旧档案来源',
                    status: 'fail',
                    source_name: '旧档案第七页',
                    source_path: '设定/旧档案.md#第七页',
                    read_status: 'missing',
                    used_as_fact: true,
                    chapter_evidence: '正文直接说第七页证明门牌归属。',
                    evidence: '旧档案第七页未读，却被写成铁证。',
                    fix: '下一章必须先找到第七页残片，才能让门牌归属成为行动依据。',
                    remaining_risk: '不能继续把未读档案当成既定事实。',
                  },
                  {
                    key: 'source_character_ready',
                    label: '角色状态来源',
                    status: 'pass',
                    source_name: '角色状态表',
                    source_path: '状态/角色.md',
                    read_status: 'ready',
                    used_as_fact: false,
                    chapter_evidence: '已按角色状态表限制主角认知。',
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
    const project = { title: '旧楼门牌', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '旧档案缺页',
        summary: '主角先找到旧档案第七页残片，再判断门牌归属。',
        conflict: '档案缺页会误导门牌归属。',
        ending_hook: '第七页残片背面出现新门牌编号。',
        scene_cards: [
          { scene_no: 1, title: '找第七页', reader_payoff: '来源就绪缺口变成可见取证动作。' },
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
      { chapter_no: 4, title: '旧档案缺页' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补来源就绪')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('来源就绪：来源缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('source_readiness_checks.旧档案来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旧档案第七页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('设定/旧档案.md#第七页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('read_status=missing')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('used_as_fact=true')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('角色状态表')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('来源就绪')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('未就绪来源')
    expect(prompt).toContain('source_readiness_checks.旧档案来源')
    expect(prompt).toContain('不能继续把未读档案当成既定事实')
  })

  test('carries nested status filter receipts into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '状态补线' },
      [
        { id: 2, chapter_no: 2, title: '错读状态' },
        { id: 3, chapter_no: 3, title: '状态补线' },
      ],
      [
        {
          id: 215,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:26:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                oh_story_delivery_receipts: {
                  pre_draft_execution_receipts: {
                    status_filter_receipts: [
                      {
                        key: 'character_state_boundary',
                        label: '角色认知边界',
                        used_in_chapter: true,
                        evidence: '主角还没看到旧印回光，却提前知道门牌归属。',
                        excluded_reason: '',
                        remaining_risk: '下一章必须把角色认知边界补成可见证据，不能继续让主角提前知道门牌归属。',
                      },
                    ],
                  },
                },
              },
            },
          }),
        },
      ],
    )
    const project = { title: '旧楼门牌', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '状态补线',
        summary: '主角先看到旧印回光，再确认门牌归属。',
        conflict: '门牌归属可推断，但角色认知边界不能跳过。',
        ending_hook: '旧印回光照出新名字。',
        scene_cards: [
          { scene_no: 1, title: '补角色认知', reader_payoff: '状态筛选缺口变成可见证据。' },
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
      { chapter_no: 3, title: '状态补线' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修状态筛选')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('状态筛选：上下文缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('角色认知边界')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门牌归属')
    expect(prompt).toContain('状态筛选：上下文缺口 1')
    expect(prompt).toContain('角色认知边界补成可见证据')
  })

  test('carries duplicate chapter title sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '校徽敲门' },
      [
        { id: 1, chapter_no: 1, title: '第1章 门外学生' },
        { id: 2, chapter_no: 2, title: '门外学生' },
        { id: 3, chapter_no: 3, title: '校徽敲门' },
      ],
      [
        {
          id: 204,
          chapter_id: 2,
          review_type: 'chapter_title_uniqueness_sync',
          created_at: '2026-06-09T08:06:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            chapter_title_uniqueness_sync: {
              status: 'warn',
              label: '章节标题重复 1',
              missed_count: 1,
              duplicates: [{ chapter_no: 1, title: '第1章 门外学生' }],
              missed: [{ chapter_no: 1, title: '第1章 门外学生' }],
              next_actions: ['下一章必须先修标题：按本章核心事件、冲突转折、关键资产或章尾钩子改名，并同步章节标题。'],
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
        title: '校徽敲门',
        summary: '校徽成为开门规则的新证据。',
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
      { chapter_no: 3, title: '校徽敲门' },
    )

    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修章节标题')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修标题：章节标题重复 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('核心事件、冲突转折、关键资产或章尾钩子改名')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('修标题：章节标题重复 1')
    expect(prompt).toContain('核心事件、冲突转折、关键资产或章尾钩子改名')
  })

})

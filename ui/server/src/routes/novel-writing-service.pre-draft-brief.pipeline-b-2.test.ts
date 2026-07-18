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

describe('chapter pre-draft brief pipeline b 2', () => {
  test('carries revision scope guard misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '修订幅度回稳' },
      [
        { id: 8, chapter_no: 8, title: '修订过量的一章' },
        { id: 9, chapter_no: 9, title: '修订幅度回稳' },
      ],
      [
        {
          id: 225,
          chapter_id: 8,
          review_type: 'revision_scope_guard_sync',
          created_at: '2026-06-09T08:49:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            revision_scope_guard_sync: {
              status: 'warn',
              label: '修订幅度过大 1600',
              summary: '修订前后字数差异 1600 字，超过 max(原文 30%, 800 字) 的警戒线 1200 字。',
              missed_count: 1,
              missed: [
                {
                  label: '修订幅度过大',
                  text: '修订缩短 1600 字，超过允许差异 1200 字。',
                  evidence: '原 4000 字；修订后 2400 字；差异 1600 字',
                  fix: '恢复被误删的伏笔、钩子、角色特征、情节推进和必要转折。',
                },
              ],
              next_actions: [
                '下一轮修订不要重写整章；只按自检证据、修订回执残留和确定性检查缺口做局部修复。',
                '先恢复被误删的伏笔、钩子、角色特征、情节推进和必要转折。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '修订幅度回稳',
        summary: '李玄回到旧证词现场，补回上一章修订时被削弱的钩子和必要转折。',
        conflict: '他必须只修证据缺口，不能把整章改成新支线。',
        ending_hook: '被误删的半枚印纹重新指向缺页。',
        scene_cards: [
          { scene_no: 1, title: '局部回稳', reader_payoff: '修订幅度风险被正文接住。' },
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
      { chapter_no: 9, title: '修订幅度回稳' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先稳修订幅度')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('稳修订幅度：修订幅度过大 1600')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('不要重写整章')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('恢复被误删的伏笔')
    expect(prompt).toContain('稳修订幅度：修订幅度过大 1600')
    expect(prompt).toContain('只按自检证据')
  })
  test('carries revision context receipt misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '半印追查' },
      [
        { id: 8, chapter_no: 8, title: '修订后的旧印' },
        { id: 9, chapter_no: 9, title: '半印追查' },
      ],
      [
        {
          id: 226,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:52:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            self_check: {
              revision: {
                revision_context_receipts: [
                  {
                    key: 'next_chapter_context',
                    label: '后续章节衔接',
                    status: 'warn',
                    evidence: '修订后把旧印章交给林青禾，但下一章仍按李玄持有旧印章推进。',
                    fix: '下一章开篇必须同步旧印章归属，改成林青禾只递出半枚印纹。',
                  },
                  {
                    key: 'character_cards',
                    label: '角色卡一致性',
                    status: 'fail',
                    evidence: '修订后林青禾无条件结盟，违背角色卡“有限作证”。',
                    fix: '下一章维持有限作证边界，不写成无条件结盟。',
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
        chapter_no: 9,
        title: '半印追查',
        summary: '李玄按修订上下文继续追查旧印。',
        conflict: '林青禾只能递出半枚印纹，不能被写成无条件结盟。',
        ending_hook: '半枚印纹对上账册缺页。',
        scene_cards: [
          { scene_no: 1, title: '半印边界', reader_payoff: '修订上下文风险被正文接住。' },
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
      { chapter_no: 9, title: '半印追查' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先复核修订上下文')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修订上下文：上下文缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旧印章归属')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('半枚印纹')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('有限作证边界')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('修订上下文开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('有限作证边界')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('next_chapter_context')
    expect(prompt).toContain('修订上下文：上下文缺口 2')
    expect(prompt).toContain('优先复核修订上下文')
    expect(prompt).toContain('不写成无条件结盟')
  })
  test('builds a revision-context receipt sync report from unresolved revision context receipts', () => {
    const report = buildRevisionContextReceiptSyncReport(
      { id: 9, chapter_no: 9, title: '半印追查' },
      {
        revised: true,
        revision: {
          revision_context_receipts: [
            {
              key: 'next_chapter_context',
              label: '后续章节衔接',
              status: 'warn',
              evidence: '修订后把旧印章交给林青禾，但下一章仍按李玄持有旧印章推进。',
              fix: '下一章开篇必须同步旧印章归属，改成林青禾只递出半枚印纹。',
            },
            {
              key: 'timeline',
              label: '时间线',
              status: 'pass',
              evidence: '审判庭复核仍发生在同日夜间。',
              fix: '无需修订，时间线一致。',
              source_excerpt: '审判庭复核仍发生在同日夜间。',
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订上下文残留 1')
    expect(report.receipt_count).toBe(2)
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'next_chapter_context',
      label: '后续章节衔接',
    })
    expect(report.next_actions.join('｜')).toContain('revision_context_receipts')
  })
  test('keeps revision-context receipt sync open when pass receipts omit required audit fields', () => {
    const report = buildRevisionContextReceiptSyncReport(
      { id: 9, chapter_no: 9, title: '半印追查' },
      {
        revised: true,
        revision: {
          revision_context_receipts: [
            {
              key: 'timeline',
              label: '时间线',
              status: 'pass',
              evidence: '审判庭复核仍发生在同日夜间。',
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订上下文残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'timeline',
      label: '时间线',
      status: 'warn',
    })
    expect(report.missed[0].evidence).toContain('缺少字段')
    expect(report.missed[0].evidence).toContain('source_excerpt')
    expect(report.next_actions.join('｜')).toContain('source_excerpt')
  })
  test('carries failed information flow checks into the next pre-draft brief and prose prompt', () => {
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
                information_flow_checks: [
                  {
                    key: 'unrelated_info_group',
                    label: '无关信息团',
                    status: 'fail',
                    evidence: '主角识破伪证后，正文转去讲反派童年背景，和当前审判没有递进关系。',
                    fix: '下一章把反派背景压缩成伪证动机证据，服务旧印章反推。',
                  },
                  {
                    key: 'transition_gap',
                    label: '场景衔接断裂',
                    status: 'warn',
                    evidence: '第一场留下旧印章悬念，第二场开头却改写闲聊，没有回应悬念。',
                    fix: '下一章开篇必须直接回应旧印章是谁留下的。',
                  },
                  {
                    key: 'unit_summary',
                    label: '信息团可概括',
                    status: 'pass',
                    evidence: '第一场可概括为主角识破伪证。',
                    fix: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '反证长篇', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 7,
        title: '旧印章反推',
        summary: '主角把旧印章和伪证动机连起来，逼出第二个证人。',
        conflict: '对手想继续用无关背景拖延审判。',
        ending_hook: '第二个证人从屏风后走出。',
        scene_cards: [
          { scene_no: 1, title: '回应旧印章', reader_payoff: '旧印章指向证人。' },
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
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修信息团衔接')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('信息团衔接：信息缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('伪证动机证据')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旧印章是谁留下的')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('第一场可概括为主角识破伪证')
    expect(prompt).toContain('信息团衔接：信息缺口 2')
    expect(prompt).toContain('反派童年背景')
    expect(prompt).toContain('场景衔接断裂')
  })
  test('carries information flow execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '第二个证人' },
      [
        { id: 7, chapter_no: 7, title: '旧印章反推' },
        { id: 8, chapter_no: 8, title: '第二个证人' },
      ],
      [
        {
          id: 216,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:14:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                information_flow_checks: [
                  {
                    key: 'withheld_question_not_answered',
                    label: '悬念回应断裂',
                    status: 'fail',
                    reveal_order: '先让证人承认旧印来源，再揭示伪证动机。',
                    withheld_question: '旧印章是谁留下的。',
                    action_bound_release: '主角逼证人按下旧印，信息随动作释放。',
                    conflict_or_cost: '证人承认后会被会长逐出审判席。',
                    evidence: '正文先解释会长童年，再回到旧印章，信息顺序打散。',
                    fix: '下一章第一场直接用按旧印动作回答旧印来源，再把伪证动机压到冲突中释放。',
                    remaining_risk: '不能再用无动作背景段落解释旧印来源。',
                  },
                  {
                    key: 'flow_ok',
                    label: '信息团递进',
                    status: 'pass',
                    reveal_order: '已按动作释放。',
                    withheld_question: '已回应。',
                    action_bound_release: '已兑现。',
                    conflict_or_cost: '已兑现。',
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
    const project = { title: '反证长篇', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '第二个证人',
        summary: '主角用旧印章逼第二个证人承认证词来源。',
        conflict: '会长试图阻止证人按下旧印。',
        ending_hook: '证人的证词指向第三枚旧印。',
        scene_cards: [
          { scene_no: 1, title: '按下旧印', reader_payoff: '信息流缺口被动作释放。' },
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
      { chapter_no: 8, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修信息团衔接')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('信息团衔接：信息缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('information_flow_checks.悬念回应断裂')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reveal_order=先让证人承认旧印来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('withheld_question=旧印章是谁留下的')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('action_bound_release=主角逼证人按下旧印')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('conflict_or_cost=证人承认后会被会长逐出审判席')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('信息团递进')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('信息团')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('action_bound_release')
    expect(prompt).toContain('information_flow_checks.悬念回应断裂')
    expect(prompt).toContain('不能再用无动作背景段落解释旧印来源')
  })
  test('carries expectation threshold execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第三道资格门槛' },
      [
        { id: 8, chapter_no: 8, title: '第二个证人' },
        { id: 9, chapter_no: 9, title: '第三道资格门槛' },
      ],
      [
        {
          id: 217,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            self_check: {
              review: {
                expectation_threshold_checks: [
                  {
                    key: 'threshold_after_payoff_missing',
                    label: '爽点后没有新门槛',
                    status: 'fail',
                    reader_question: '第三枚旧印到底会把谁拖进审判席。',
                    stakes: '如果新门槛不成立，第二个证人的证词就只剩单章爽点。',
                    choice_pressure: '李玄必须在公开验印和保护证人之间二选一。',
                    payoff_promise: '公开验印会给出父亲线索，但同时暴露证人身份。',
                    next_chapter_pull: '章尾必须把第三枚旧印变成下一章资格门槛。',
                    evidence: '正文让证人承认证词后直接收束，没有提出下一道条件。',
                    fix: '下一章开篇把第三枚旧印设成公开验印资格，中段用二选一压力拖住爽点释放。',
                    remaining_risk: '不能在承认旧印后立刻发放父亲线索，必须先设新门槛。',
                  },
                  {
                    key: 'two_long_one_short_ok',
                    label: '两长一短',
                    status: 'pass',
                    reader_question: '已兑现。',
                    stakes: '已兑现。',
                    choice_pressure: '已兑现。',
                    payoff_promise: '已兑现。',
                    next_chapter_pull: '已兑现。',
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
    const project = { title: '反证长篇', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '第三道资格门槛',
        summary: '李玄把第三枚旧印变成公开验印资格。',
        conflict: '公开验印会暴露证人身份。',
        ending_hook: '旧印验明后出现父亲留下的第二层暗记。',
        scene_cards: [
          { scene_no: 1, title: '公开验印', reader_payoff: '期待门槛字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:20:00.000Z',
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
      { chapter_no: 9, title: '第三道资格门槛' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修期待门槛')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('期待门槛：门槛缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('expectation_threshold_checks.爽点后没有新门槛')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reader_question=第三枚旧印到底会把谁拖进审判席')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('stakes=如果新门槛不成立')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('choice_pressure=李玄必须在公开验印和保护证人之间二选一')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('payoff_promise=公开验印会给出父亲线索')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('两长一短')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('期待门槛')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('choice_pressure')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('next_chapter_pull')
    expect(prompt).toContain('expectation_threshold_checks.爽点后没有新门槛')
    expect(prompt).toContain('不能在承认旧印后立刻发放父亲线索')
  })
  test('carries single-chapter governance recheck misses into the next delivery risk brief', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 43, chapter_no: 43, title: '复查后的新局' },
      [
        { id: 42, chapter_no: 42, title: '旧证重审' },
        { id: 43, chapter_no: 43, title: '复查后的新局' },
      ],
      [
        {
          id: 301,
          chapter_id: 42,
          review_type: 'governance_recheck_sync',
          created_at: '2026-06-13T08:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 42,
            chapter_no: 42,
            governance_recheck_sync: {
              status: 'warn',
              label: '恢复依据缺口 2',
              missed_count: 2,
              failed_evidence: ['第42章对白交锋已补回样章节奏'],
              watch_items: ['下一章继续观察样章策略命中率'],
            },
          }),
        },
      ],
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先验恢复依据')
    expect(deliveryRiskCarryOver?.items).toContain('验恢复依据：恢复依据缺口 2')
    expect(deliveryRiskCarryOver?.required_actions.join('｜')).toContain('修复：第42章对白交锋已补回样章节奏')
  })
  test('marks aged reader expectation debt as overdue in context, brief, and prose prompt', () => {
    const debtContext = buildReaderExpectationDebtContext(
      { id: 6, chapter_no: 6, title: '旧债压场' },
      [
        { id: 1, chapter_no: 1, title: '双魂降临' },
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '夜巡脚步' },
        { id: 5, chapter_no: 5, title: '宿舍水痕' },
        { id: 6, chapter_no: 6, title: '旧债压场' },
      ],
      [
        {
          id: 101,
          chapter_id: 2,
          review_type: 'reader_expectation_sync',
          created_at: '2026-06-09T08:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            reader_expectation_sync: {
              status: 'warn',
              missed: [
                { key: 'ending_hook', label: '章末追读', type: 'hook', text: '湿漉漉学生敲响玻璃门后消失' },
              ],
              keep_alive: [
                { key: 'open_question', label: '保留悬念', type: 'question', text: '广播是谁发出的' },
              ],
            },
          }),
        },
      ],
    )
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        reader_expectation_debt_context: debtContext,
        chapter_target: {
          chapter_no: 6,
          title: '旧债压场',
          summary: '把前面积压的门外学生悬念推进成宿舍规则危机。',
          conflict: '继续守规还是反查广播源头。',
          ending_hook: '广播第一次叫出了李超的真名。',
          scene_cards: [],
        },
      },
    )
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        reader_expectation_debt_context: debtContext,
        chapter_target: {
          chapter_no: 6,
          title: '旧债压场',
          summary: '把前面积压的门外学生悬念推进成宿舍规则危机。',
          conflict: '继续守规还是反查广播源头。',
          ending_hook: '广播第一次叫出了李超的真名。',
          scene_cards: [],
        },
      },
      null,
      { chapter_no: 6, title: '旧债压场' },
    )

    expect(debtContext.must_carry[0].age_chapters).toBe(4)
    expect(debtContext.must_carry[0].overdue).toBe(true)
    expect(debtContext.keep_alive[0].overdue).toBe(true)
    expect(debtContext.overdue_count).toBe(2)
    expect(debtContext.overdue.map((item: any) => item.text).join('｜')).toContain('湿漉漉学生')
    expect(brief.reader_expectation_debt.overdue_count).toBe(2)
    expect(brief.reader_expectation_debt.summary).toContain('逾期 2 项')
    expect(prompt).toContain('逾期待补')
    expect(prompt).toContain('湿漉漉学生敲响玻璃门后消失')
  })
  test('adds storyline advances, plants, payoffs, and forbidden items to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 12,
          title: '旧规则失效',
          summary: '林晓旧经验失效，张智发现新规则漏洞。',
          conflict: '继续相信旧守则还是冒险验证第零条规则。',
          ending_hook: '第零条规则第一次显形。',
          word_target: { target: 3000, rangeText: '标准章 2800-3500字' },
          scene_cards: [],
        },
        storyline_context: {
          required: ['规则之源调查', '林晓求生支线'],
          forbidden: ['编织者真名'],
          chapter_usage: [
            { usage_type: 'advance', name: '规则之源调查', expected_state_change: { next: '获得第一块真相拼图' } },
            { usage_type: 'plant', name: '第零条规则回收线', expected_state_change: { clue: '守则页脚异常' } },
            { usage_type: 'payoff', name: '林晓求生支线', expected_state_change: { payoff: '证明林晓两天经验不完整' } },
            { usage_type: 'forbidden', name: '编织者真名', expected_state_change: { forbidden: '不可揭露幕后外神身份' } },
          ],
        },
      },
    )

    expect(brief.storyline_advances).toContain('规则之源调查')
    expect(brief.storyline_advances).toContain('林晓求生支线')
    expect(brief.storyline_plants).toContain('第零条规则回收线')
    expect(brief.storyline_payoffs).toContain('林晓求生支线')
    expect(brief.storyline_forbidden).toContain('编织者真名')
  })
  test('adds character growth obligations to the pre-draft brief and prose context', () => {
    const characterArcEntity = {
      id: 701,
      entity_type: 'character_arc',
      name: '李玄藏拙到公开争取',
      summary: '李玄从害怕暴露残阵，转向主动承认缺陷并争取试炼资格。',
      constraints_json: {
        forbidden_reveal: '不得提前写成彻底公开身份。',
      },
      state_json: {
        current_state: '仍在藏拙，但已经被执事逼到边缘。',
        last_advanced_chapter: 4,
        next_advance_chapter: 8,
      },
      payload_json: {
        related_characters: ['李玄'],
        desire: '保住试炼资格并证明阵图属于自己',
        flaw_pressure: '害怕暴露残阵裂纹，只想继续藏拙',
        growth_target: '第一次主动承认残阵缺陷，把藏拙改成公开争取',
        voice_anchor: '克制、冷静，但遇到阵法归属寸步不让',
      },
    }
    const relationshipArcEntity = {
      id: 702,
      entity_type: 'relationship_arc',
      name: '李玄与林青禾互信线',
      summary: '林青禾从旁观者转为愿意替李玄作证。',
      constraints_json: {
        forbidden_reveal: '不得提前写成完全信任。',
      },
      state_json: {
        current_state: '林青禾仍在观察李玄。',
        next_advance_chapter: 8,
      },
      payload_json: {
        related_characters: ['李玄', '林青禾'],
        relationship_shift: '林青禾从旁观转为愿意替他作证',
      },
    }
    const brief = buildChapterPreDraftBrief(
      { title: '残阵问道' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '试炼前夜',
          summary: '李玄在试炼前夜被迫公开残阵缺陷。',
          conflict: '执事逼他交出阵图，林青禾必须决定是否作证。',
          ending_hook: '残阵亮起第二道裂纹。',
          scene_cards: [],
        },
        setting_context: {
          entities: [characterArcEntity, relationshipArcEntity],
          chapter_usage: [
            { entity_id: 701, usage_type: 'advance', expected_state_change: { growth_beat: '主动承认残阵缺陷' } },
            { entity_id: 702, usage_type: 'advance', expected_state_change: { relationship_shift: '林青禾第一次公开作证' } },
          ],
        },
      },
    )
    const confirmedAt = '2026-06-10T09:00:00.000Z'
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 8,
          title: '试炼前夜',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      { ...brief, confirmed_at: confirmedAt },
    )
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '残阵问道' },
      context,
      null,
      { chapter_no: 8, title: '试炼前夜' },
    )

    expect(brief.character_arc_brief.desire).toContain('保住试炼资格')
    expect(brief.character_arc_brief.flaw_pressure).toContain('继续藏拙')
    expect(brief.character_arc_brief.growth_beat).toContain('公开争取')
    expect(brief.character_arc_brief.relationship_shift).toContain('公开作证')
    expect(brief.character_arc_brief.voice_anchor).toContain('寸步不让')
    expect(brief.character_arc_brief.forbidden_reveal).toContain('完全信任')
    expect(brief.character_arc_brief.arcs.map((item: any) => item.name)).toContain('李玄藏拙到公开争取')
    expect(context.chapter_target.character_arc_brief.growth_beat).toContain('公开争取')
    expect(prompt).toContain('【人物成长承接】')
    expect(prompt).toContain('主动承认残阵缺陷')
    expect(prompt).toContain('不得只在旁白里说人物成长')
  })
  test('adds longform compass boundaries to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          axes: [
            { key: 'core_conflict', label: '核心矛盾', value: '蛮力不能直接碾压规则。' },
            { key: 'payoff_loop', label: '长期爽点循环', value: '每章一次规则发现或力量反制。' },
          ],
          immutable_rules: ['超人力量不能无代价碾压规则', '双主角互补不能拆散'],
          flexible_zones: ['副本题材可换，但必须服务规则破局主线'],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          scene_cards: [{ scene_no: 1, title: '门槛', reader_payoff: '规则边界第一次显形。' }],
        },
      },
    )

    expect(brief.longform_compass.reader_promise).toContain('规则判定')
    expect(brief.longform_compass.immutable_rules).toContain('超人力量不能无代价碾压规则')
    expect(brief.longform_compass.flexible_zones).toContain('副本题材可换，但必须服务规则破局主线')
    expect(brief.longform_compass.axes.find((axis: any) => axis.key === 'core_conflict')?.value).toContain('蛮力')
  })
  test('adds camelCase chapter longform compass boundaries to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          scene_cards: [{ scene_no: 1, title: '门槛', reader_payoff: '规则边界第一次显形。' }],
          longformCompass: {
            readerPromise: '超人力量必须持续撞上规则判定。',
            coreConflict: '蛮力破局与规则边界互相反制。',
            immutableRules: ['超人力量不能变成无代价清场'],
            flexibleZones: ['副本可变化，但必须服务规则破局主线'],
          },
        },
      },
    )

    expect(brief.longform_compass.reader_promise).toContain('规则判定')
    expect(brief.longform_compass.immutable_rules).toContain('超人力量不能变成无代价清场')
    expect(brief.longform_compass.flexible_zones).toContain('副本可变化，但必须服务规则破局主线')
    expect(brief.longform_compass.axes.find((axis: any) => axis.key === 'core_conflict')?.value).toContain('规则边界')
  })
})

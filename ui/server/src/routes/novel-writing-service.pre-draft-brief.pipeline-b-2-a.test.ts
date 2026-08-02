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

describe('chapter pre-draft brief pipeline b 2 a', () => {
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
})

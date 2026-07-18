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

describe('chapter pre-draft brief sync-receipts b 2 a', () => {
  test('carries chapter hook sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 222,
          chapter_id: 8,
          review_type: 'chapter_hook_sync',
          created_at: '2026-06-09T08:23:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            chapter_hook_sync: {
              status: 'warn',
              label: '章级钩子缺口 2',
              summary: '正文有 2 项章级钩子缺口。',
              missed_count: 2,
              missed: [
                { label: '章首钩子', text: '前100字没有执事逼交旧账册。' },
                { label: '章尾钩子', text: '章尾没有第三个证人的名字。' },
              ],
              next_actions: [
                '下一章必须补章级钩子：前100字先给冲突、异常或对话逼问，最后100字留下下一章必须处理的问题。',
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
        title: '第二个证人',
        summary: '沈砚顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事抢先封口，试图让上一章的章尾钩子断掉。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '章级钩子缺口被正文补上。' },
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
      { chapter_no: 9, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补章级钩子')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补章钩子：章级钩子缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('前100字')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('第三个证人的名字')
    expect(prompt).toContain('补章钩子：章级钩子缺口 2')
    expect(prompt).toContain('章尾钩子')
  })
  test('carries paragraph hook execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 233,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:26:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            self_check: {
              review: {
                paragraph_hook_checks: [
                  {
                    key: 'middle_paragraph_stall',
                    label: '中段段落停滞',
                    status: 'fail',
                    paragraph_range: '第4-7段',
                    hook_type: '信息差 + 暗牌',
                    micro_change: '每3段必须出现一次旧印裂纹、证人迟疑或执事抢证带来的新变化。',
                    information_or_risk_delta: '旧印裂纹暴露第三个证人还活着。',
                    emotion_or_relation_delta: '旁观弟子从整齐震惊分裂成怀疑、沉默和倒戈。',
                    evidence: '第4-7段连续解释旧账背景，没有信息、风险、情绪或关系变化。',
                    fix: '下一章中段每3-5段插入信息差或暗牌推进，用旧印裂纹和旁观分裂制造微变化。',
                    remaining_risk: '不能再让连续段落只停在解释旧账背景。',
                  },
                  {
                    key: 'dialogue_escalation_ok',
                    label: '对话递进',
                    status: 'pass',
                    paragraph_range: '第8-10段',
                    hook_type: '对话压迫',
                    micro_change: '已兑现。',
                    information_or_risk_delta: '已兑现。',
                    emotion_or_relation_delta: '已兑现。',
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
        chapter_no: 9,
        title: '第二个证人',
        summary: '沈砚顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事抢先封口，试图让证人段落停在解释里。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '段落级钩子字段被正文补上。' },
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
      { chapter_no: 9, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修段落级钩子')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('段落级钩子：微钩子缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('paragraph_hook_checks.中段段落停滞')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('paragraph_range=第4-7段')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('hook_type=信息差 + 暗牌')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('micro_change=每3段必须出现一次旧印裂纹')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('information_or_risk_delta=旧印裂纹暴露第三个证人还活着')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('emotion_or_relation_delta=旁观弟子从整齐震惊分裂')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('对话递进')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('段落级钩子')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('information_or_risk_delta')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('emotion_or_relation_delta')
    expect(prompt).toContain('paragraph_hook_checks.中段段落停滞')
    expect(prompt).toContain('不能再让连续段落只停在解释旧账背景')
  })
  test('carries paragraph hook sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 223,
          chapter_id: 8,
          review_type: 'paragraph_hook_sync',
          created_at: '2026-06-09T08:24:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            paragraph_hook_sync: {
              status: 'warn',
              label: '段落钩子缺口 2',
              summary: '正文有 2 项段落级钩子缺口。',
              missed_count: 2,
              missed: [
                { label: '段落停滞', text: '第2-5段缺少信息/风险/选择/异常推进。' },
                { label: '钩子组合', text: '暗牌 + 打脸没有形成段落内兑现。' },
              ],
              next_actions: [
                '下一章必须补段落级钩子：每 3-5 段出现信息、风险、情绪或关系变化。',
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
        title: '第二个证人',
        summary: '沈砚顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事抢先封口，试图让证人段落停在解释里。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '段落钩子缺口被正文补上。' },
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
      { chapter_no: 9, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补段落钩子')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补段钩子：段落钩子缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('每 3-5 段')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('第2-5段')
    expect(prompt).toContain('补段钩子：段落钩子缺口 2')
    expect(prompt).toContain('钩子组合')
  })
  test('carries suspense sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 224,
          chapter_id: 8,
          review_type: 'suspense_sync',
          created_at: '2026-06-09T08:25:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            suspense_sync: {
              status: 'warn',
              label: '悬念缺口 2',
              summary: '正文有 2 项悬念编排缺口。',
              missed_count: 2,
              missed: [
                { label: '信息顺序', text: '疑问、虚假提示和答案乱序。' },
                { label: '期待接力', text: '旧账册问题解决后没有第三个证人的新期待。' },
              ],
              next_actions: [
                '下一章必须补悬念编排：先提出疑问，再给可信提示或误导，最后公布答案并立起新期待。',
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
        title: '第二个证人',
        summary: '沈砚顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事抢先封口，试图让第三个证人的线索中断。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '悬念编排缺口被正文补上。' },
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
      { chapter_no: 9, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补悬念编排')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补悬念：悬念缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('先提出疑问')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('第三个证人')
    expect(prompt).toContain('补悬念：悬念缺口 2')
    expect(prompt).toContain('期待接力')
  })
  test('carries reversal sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 225,
          chapter_id: 8,
          review_type: 'reversal_sync',
          created_at: '2026-06-09T08:26:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            reversal_sync: {
              status: 'warn',
              label: '反转缺口 2',
              summary: '正文有 2 项反转设计缺口。',
              missed_count: 2,
              missed: [
                { label: '铺垫暗示', text: '反转前没有3处公平暗示。' },
                { label: '揭示后影响', text: '执事身份揭示后没有改变审判局势。' },
              ],
              next_actions: [
                '下一章必须补反转设计：补足3处暗示、公平误导、揭示后影响和打脸节奏。',
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
        title: '第二个证人',
        summary: '沈砚顺着上一章旧账册追出第二个证人。',
        conflict: '执事抢先封口，试图让反转影响中断。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '反转设计缺口被正文补上。' },
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
      { chapter_no: 9, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补反转设计')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补反转：反转缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('3处暗示')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('审判局势')
    expect(prompt).toContain('补反转：反转缺口 2')
    expect(prompt).toContain('公平误导')
  })
  test('carries showdown sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 10, chapter_no: 10, title: '阵台余波' },
      [
        { id: 9, chapter_no: 9, title: '阵盘亮底' },
        { id: 10, chapter_no: 10, title: '阵台余波' },
      ],
      [
        {
          id: 226,
          chapter_id: 9,
          review_type: 'showdown_sync',
          created_at: '2026-06-09T08:27:00.000Z',
          payload: JSON.stringify({
            chapter_id: 9,
            chapter_no: 9,
            showdown_sync: {
              status: 'warn',
              label: '高潮缺口 2',
              summary: '正文有 2 项高潮对抗缺口。',
              missed_count: 2,
              missed: [
                { label: '舞台层级', text: '群众层、中间层、核心层震惊没有传递链。' },
                { label: '爽点释放', text: '底牌释放后执事没有受到对应压制。' },
              ],
              next_actions: [
                '下一章必须补高潮对抗：补舞台层级、震惊分层、底牌压制和急-缓-急情绪节奏。',
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
        chapter_no: 10,
        title: '阵台余波',
        summary: '沈砚在阵台余波里接住上一章没写透的底牌影响。',
        conflict: '执事残党试图淡化失败，长老席要求沈砚复盘阵盘依据。',
        ending_hook: '核心层长老要求打开内库阵图。',
        scene_cards: [
          { scene_no: 1, title: '余波追认', reader_payoff: '高潮对抗缺口被正文补上。' },
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
      { chapter_no: 10, title: '阵台余波' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补高潮对抗')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补高潮：高潮缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('舞台层级')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('底牌释放')
    expect(prompt).toContain('补高潮：高潮缺口 2')
    expect(prompt).toContain('震惊分层')
  })
})

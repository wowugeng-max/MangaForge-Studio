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

describe('chapter pre-draft brief sync-receipts b 2', () => {
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
  test('carries bridge unit sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 16, chapter_no: 16, title: '投资人签字' },
      [
        { id: 15, chapter_no: 15, title: '旧城会审' },
        { id: 16, chapter_no: 16, title: '投资人签字' },
      ],
      [
        {
          id: 227,
          chapter_id: 15,
          review_type: 'bridge_unit_sync',
          created_at: '2026-06-09T08:28:00.000Z',
          payload: JSON.stringify({
            chapter_id: 15,
            chapter_no: 15,
            bridge_unit_sync: {
              status: 'warn',
              label: '桥段缺口 2',
              summary: '正文有 2 项桥段节奏缺口。',
              missed_count: 2,
              missed: [
                { label: '连续期待', text: '旧账本兑现后没有挂上新投资人目标。' },
                { label: '阶段衔接', text: '章尾没有说明下一步要争什么。' },
              ],
              next_actions: [
                '下一章必须补桥段节奏：补连续期待、章尾新目标、高潮中埋钩子和承接余波。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城账册', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 16,
        title: '投资人签字',
        summary: '沈砚接住上一章会审后的新投资人目标。',
        conflict: '对手抢先截断签字流程，试图让旧城资金入口失效。',
        ending_hook: '投资人要求沈砚三日内拿出第二份旧城名单。',
        scene_cards: [
          { scene_no: 1, title: '签字前夜', reader_payoff: '桥段节奏缺口被正文补上。' },
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
      { chapter_no: 16, title: '投资人签字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补桥段节奏')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补桥段：桥段缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('连续期待')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('新投资人目标')
    expect(prompt).toContain('补桥段：桥段缺口 2')
    expect(prompt).toContain('章尾新目标')
  })
  test('carries opening sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 2, chapter_no: 2, title: '第二位妈妈' },
      [
        { id: 1, chapter_no: 1, title: '门外有三个妈妈' },
        { id: 2, chapter_no: 2, title: '第二位妈妈' },
      ],
      [
        {
          id: 228,
          chapter_id: 1,
          review_type: 'opening_sync',
          created_at: '2026-06-09T08:29:00.000Z',
          payload: JSON.stringify({
            chapter_id: 1,
            chapter_no: 1,
            opening_sync: {
              status: 'warn',
              label: '开篇缺口 2',
              summary: '正文有 2 项开篇设计缺口。',
              missed_count: 2,
              missed: [
                { label: '爽点/期待点', text: '1000字内没有血缘系统或三位妈妈反常身份。' },
                { label: '三大基点', text: '金手指基点没有早段兑现。' },
              ],
              next_actions: [
                '下一章必须补开篇设计：前300字重拉主角现场，1000字内补期待点、金手指基点和本文卖点。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '规则妈妈们找上门', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 2,
        title: '第二位妈妈',
        summary: '李岚顺着第一章缺口补回血缘系统和第二位妈妈的反常身份。',
        conflict: '第二位妈妈要求李岚签字认亲，系统倒计时继续逼近。',
        ending_hook: '系统提示第二位妈妈的血缘匹配率仍然异常。',
        scene_cards: [
          { scene_no: 1, title: '倒计时续接', reader_payoff: '开篇设计缺口被正文补上。' },
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
      { chapter_no: 2, title: '第二位妈妈' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补开篇设计')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补开篇：开篇缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('1000字内')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('金手指基点')
    expect(prompt).toContain('补开篇：开篇缺口 2')
    expect(prompt).toContain('本文卖点')
  })
  test('carries prose craft sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 17, chapter_no: 17, title: '第二份旧名单' },
      [
        { id: 16, chapter_no: 16, title: '一块钱转账单' },
        { id: 17, chapter_no: 17, title: '第二份旧名单' },
      ],
      [
        {
          id: 229,
          chapter_id: 16,
          review_type: 'prose_craft_sync',
          created_at: '2026-06-09T08:35:00.000Z',
          payload: JSON.stringify({
            chapter_id: 16,
            chapter_no: 16,
            prose_craft_sync: {
              status: 'warn',
              label: '正文工艺缺口 2',
              summary: '正文有 2 项正文工艺缺口。',
              missed_count: 2,
              missed: [
                { label: '深度限知', text: '出现他不知道的是、所有人都没有发现等上帝视角。' },
                { label: '身体细节', text: '愤怒、委屈、悲伤没有落到手、呼吸、肩背或动作。' },
              ],
              next_actions: [
                '下一章必须补正文工艺：坚持深度限知，用身体细节替代抽象情绪，把道具/数字写成剧情功能。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城账册', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 17,
        title: '第二份旧名单',
        summary: '沈砚用第二份旧名单接住上一章账本风向。',
        conflict: '对手转移账本原件，试图让转账单失效。',
        ending_hook: '第二份名单上出现沈砚旧疤对应的签收印。',
        scene_cards: [
          { scene_no: 1, title: '旧名单复核', reader_payoff: '正文工艺缺口被正文补上。' },
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
      { chapter_no: 17, title: '第二份旧名单' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补正文工艺')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补工艺：正文工艺缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('身体细节')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('深度限知')
    expect(prompt).toContain('补工艺：正文工艺缺口 2')
    expect(prompt).toContain('身体细节')
  })
  test('carries punctuation tone sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 18, chapter_no: 18, title: '印章追问' },
      [
        { id: 17, chapter_no: 17, title: '签收印' },
        { id: 18, chapter_no: 18, title: '印章追问' },
      ],
      [
        {
          id: 230,
          chapter_id: 17,
          review_type: 'punctuation_tone_sync',
          created_at: '2026-06-09T08:38:00.000Z',
          payload: JSON.stringify({
            chapter_id: 17,
            chapter_no: 17,
            punctuation_tone_sync: {
              status: 'warn',
              label: '语气标点缺口 2',
              summary: '正文有 2 项语气标点缺口。',
              missed_count: 2,
              missed: [
                { label: '禁用标点', text: '残留 …… 和 —— 硬造迟疑或打断。' },
                { label: '功能性问号', text: '签收印真假追问被压成陈述句，缺少人物声线。' },
              ],
              next_actions: [
                '下一章必须补语气标点：用动作停顿、换行或短句替代省略号/破折号，质问保留功能性问号。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城账册', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 18,
        title: '印章追问',
        summary: '沈砚继续追问签收印对应的旧名单。',
        conflict: '对手试图把真假签收印变成无效争论。',
        ending_hook: '真正的印章编号指向另一个仓库。',
        scene_cards: [
          { scene_no: 1, title: '追问编号', reader_payoff: '语气标点缺口被正文补上。' },
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
      { chapter_no: 18, title: '印章追问' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补语气标点')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补标点：语气标点缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('动作停顿')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('功能性问号')
    expect(prompt).toContain('补标点：语气标点缺口 2')
    expect(prompt).toContain('省略号/破折号')
  })
  test('carries quality audit sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 19, chapter_no: 19, title: '第三个证人' },
      [
        { id: 18, chapter_no: 18, title: '第二份证据' },
        { id: 19, chapter_no: 19, title: '第三个证人' },
      ],
      [
        {
          id: 231,
          chapter_id: 18,
          review_type: 'quality_audit_sync',
          created_at: '2026-06-09T08:42:00.000Z',
          payload: JSON.stringify({
            chapter_id: 18,
            chapter_no: 18,
            quality_audit_sync: {
              status: 'warn',
              label: '质量诊断缺口 2',
              summary: '正文有 2 项质量诊断缺口。',
              missed_count: 2,
              missed: [
                { label: '章节推进', text: '删掉这章不影响理解，第二份证据没有改变局势。' },
                { label: '信息负载', text: '一章新增 4 个概念，信息没有跟冲突走。' },
              ],
              next_actions: [
                '下一章必须补质量诊断：先证明本章不可删除，再把新概念压到 3 个以内，让信息跟冲突走。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '长夜账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 19,
        title: '第三个证人',
        summary: '沈砚找到第三个证人，让上一章证据真正改变局势。',
        conflict: '反派试图抢先封口第三个证人。',
        ending_hook: '第三个证人指出账本原件在祠堂地砖下。',
        scene_cards: [
          { scene_no: 1, title: '证人封口', reader_payoff: '质量诊断缺口被正文补上。' },
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
      { chapter_no: 19, title: '第三个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补质量诊断')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补诊断：质量诊断缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('本章不可删除')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('信息负载')
    expect(prompt).toContain('补诊断：质量诊断缺口 2')
    expect(prompt).toContain('新概念')
  })
  test('carries dialogue sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 20, chapter_no: 20, title: '当堂反问' },
      [
        { id: 19, chapter_no: 19, title: '当众试探' },
        { id: 20, chapter_no: 20, title: '当堂反问' },
      ],
      [
        {
          id: 232,
          chapter_id: 19,
          review_type: 'dialogue_sync',
          created_at: '2026-06-09T08:45:00.000Z',
          payload: JSON.stringify({
            chapter_id: 19,
            chapter_no: 19,
            dialogue_sync: {
              status: 'warn',
              label: '对白缺口 2',
              summary: '正文有 2 项对白质量缺口。',
              missed_count: 2,
              missed: [
                { label: '声线差异', text: '李玄、周薄森、林青禾都在用同一种解释规则的口吻。' },
                { label: '潜台词与议程', text: '角色把真实目的直接说出来，没有借口和试探。' },
              ],
              next_actions: [
                '下一章必须补对白：李玄用短句反问，周薄森长句辩解，林青禾只说事实；真实目的藏进借口和试探。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '反证长篇', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 20,
        title: '当堂反问',
        summary: '李玄用一句反问继续逼周薄森说漏证据来源。',
        conflict: '周薄森想用长篇说辞重新夺回话语权。',
        ending_hook: '林青禾拿出第二枚封条。',
        scene_cards: [
          { scene_no: 1, title: '反问压场', reader_payoff: '对白缺口被正文补上。' },
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
      { chapter_no: 20, title: '当堂反问' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修对白')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修对白：对白缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('李玄用短句反问')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('声线差异')
    expect(prompt).toContain('修对白：对白缺口 2')
    expect(prompt).toContain('真实目的藏进借口和试探')
  })
  test('carries character behavior sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 21, chapter_no: 21, title: '证人上堂' },
      [
        { id: 20, chapter_no: 20, title: '当堂反问' },
        { id: 21, chapter_no: 21, title: '证人上堂' },
      ],
      [
        {
          id: 233,
          chapter_id: 20,
          review_type: 'character_behavior_sync',
          created_at: '2026-06-09T08:55:00.000Z',
          payload: JSON.stringify({
            chapter_id: 20,
            chapter_no: 20,
            character_behavior_sync: {
              status: 'warn',
              label: '角色行为缺口 2',
              summary: '正文有 2 项角色行为缺口。',
              missed_count: 2,
              missed: [
                { label: '动机链', text: '李玄突然冲上去，没有写出起因、意图、约束和风险。' },
                { label: '反派逻辑', text: '周薄森明明可以销毁账本，却降智站桩嘲讽。' },
              ],
              next_actions: [
                '下一章必须补角色行为：先写清李玄的动机链，再让周薄森的反派逻辑从保住账本来源出发。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '反证长篇', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 21,
        title: '证人上堂',
        summary: '林青禾作为证人上堂，李玄继续保护证据来源。',
        conflict: '周薄森试图把证据来源抹成私怨。',
        ending_hook: '真正的账本原件被指出在祠堂地砖下。',
        scene_cards: [
          { scene_no: 1, title: '证人上堂', reader_payoff: '角色行为缺口被正文补上。' },
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
      { chapter_no: 21, title: '证人上堂' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补角色行为')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补行为：角色行为缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('李玄的动机链')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('反派逻辑')
    expect(prompt).toContain('补行为：角色行为缺口 2')
    expect(prompt).toContain('保住账本来源')
  })
})

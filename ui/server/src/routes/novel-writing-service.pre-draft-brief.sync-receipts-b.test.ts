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

describe('chapter pre-draft brief sync-receipts b', () => {
  test('carries style boundary execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '旧印反问' },
      [
        { id: 7, chapter_no: 7, title: '旧印章反推' },
        { id: 8, chapter_no: 8, title: '旧印反问' },
      ],
      [
        {
          id: 219,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:19:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                style_boundary_checks: [
                  {
                    key: 'secondary_benchmark_voice_leak',
                    label: '副对标口吻污染',
                    status: 'fail',
                    reference_risk: '为了学习副对标冷讽口吻，把李玄写成旁观式嘲弄。',
                    rewritten_with_local_action: '改成李玄按住旧印裂纹、逼执事当场回应，讽刺只保留在动作结果里。',
                    voice_anchor: '李玄克制、短句、先证据后反问。',
                    copied_phrase_removed: false,
                    evidence: '正文用了副对标原句“你也配看见门后”。',
                    fix: '下一章删掉副对标原句，把冷讽改成本书旧印动作和证据后果。',
                    remaining_risk: '不能让副对标口吻覆盖本书角色声音。',
                  },
                  {
                    key: 'hard_constraints_ok',
                    label: '硬约束通过',
                    status: 'pass',
                    reference_risk: '已兑现。',
                    rewritten_with_local_action: '已兑现。',
                    voice_anchor: '已兑现。',
                    copied_phrase_removed: true,
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
          { scene_no: 1, title: '旧印反问', reader_payoff: '文风边界字段被正文执行。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:19:00.000Z',
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
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修文风边界')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('文风边界：边界缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('style_boundary_checks.副对标口吻污染')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('reference_risk=为了学习副对标冷讽口吻')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('rewritten_with_local_action=改成李玄按住旧印裂纹')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('voice_anchor=李玄克制、短句、先证据后反问')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('copied_phrase_removed=false')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('硬约束通过')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('文风边界')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('rewritten_with_local_action')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('copied_phrase_removed')
    expect(prompt).toContain('style_boundary_checks.副对标口吻污染')
    expect(prompt).toContain('不能让副对标口吻覆盖本书角色声音')
  })

  test('carries failed style sample checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 7, chapter_no: 7, title: '旧印章反推' },
      [
        { id: 6, chapter_no: 6, title: '公开作证' },
        { id: 7, chapter_no: 7, title: '旧印章反推' },
      ],
      [
        {
          id: 218,
          chapter_id: 6,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:15:00.000Z',
          payload: JSON.stringify({
            chapter_id: 6,
            chapter_no: 6,
            self_check: {
              review: {
                style_sample_checks: [
                  {
                    key: 'applicable_scene_mismatch',
                    label: '样章适用场景错配',
                    status: 'fail',
                    evidence: '本章是高压审讯，却套用了低压背景说明样章，导致三轮压问和半拍亮证据没有落地。',
                    fix: '下一章改用审讯样章的三轮压问、半拍亮证据和短冷却，但只学习节奏，不复制桥段。',
                  },
                  {
                    key: 'copy_boundary_breach',
                    label: '样章复制边界越界',
                    status: 'warn',
                    evidence: '正文直接复用了样章“雨巷三次敲桌”的桥段。',
                    fix: '下一章把敲桌改成旧印章裂纹、证人退后和执事抢证，保留压迫节奏但换成本书资产动作。',
                  },
                  {
                    key: 'dialogue_ratio_ok',
                    label: '对白比例通过',
                    status: 'pass',
                    evidence: '对白比例接近 40%。',
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
          { scene_no: 1, title: '旧印章反推', reader_payoff: '样章策略缺口被正文补上。' },
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
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修样章策略')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('样章策略：策略缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('三轮压问')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旧印章裂纹')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('对白比例接近 40%')
    expect(prompt).toContain('样章策略：策略缺口 2')
    expect(prompt).toContain('高压审讯')
    expect(prompt).toContain('复制边界')
  })

  test('carries style sample execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '旧印反问' },
      [
        { id: 7, chapter_no: 7, title: '旧印章反推' },
        { id: 8, chapter_no: 8, title: '旧印反问' },
      ],
      [
        {
          id: 220,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:21:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                style_sample_checks: [
                  {
                    key: 'sample_technique_not_adapted',
                    label: '样章技法未本土化',
                    status: 'fail',
                    style_dimension: '审讯节奏',
                    source_technique: '三轮压问后半拍亮证据',
                    adapted_evidence: '正文只复述样章敲桌桥段，没有改成旧印裂纹和证人退后。',
                    copied_phrase_rewritten: false,
                    evidence: '样章策略停在模仿桥段，没有落成本书资产动作。',
                    fix: '下一章把三轮压问改成执事抢证、旧印裂纹、证人退后，再半拍亮出旧印反问。',
                    remaining_risk: '不能继续照搬样章敲桌桥段和原句。',
                  },
                  {
                    key: 'sample_ratio_ok',
                    label: '样章节奏通过',
                    status: 'pass',
                    style_dimension: '对白比例',
                    source_technique: '短句推进',
                    adapted_evidence: '已兑现。',
                    copied_phrase_rewritten: true,
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
          { scene_no: 1, title: '旧印反问', reader_payoff: '样章策略字段被正文执行。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:21:00.000Z',
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
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修样章策略')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('样章策略：策略缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('style_sample_checks.样章技法未本土化')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('style_dimension=审讯节奏')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('source_technique=三轮压问后半拍亮证据')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('adapted_evidence=正文只复述样章敲桌桥段')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('copied_phrase_rewritten=false')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('样章节奏通过')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('样章策略')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('adapted_evidence')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('copied_phrase_rewritten')
    expect(prompt).toContain('style_sample_checks.样章技法未本土化')
    expect(prompt).toContain('不能继续照搬样章敲桌桥段和原句')
  })

  test('carries benchmark recall sync misses into the next pre-draft brief and prose prompt', () => {
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
          review_type: 'benchmark_recall_sync',
          created_at: '2026-06-09T08:14:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            benchmark_recall_sync: {
              status: 'warn',
              label: '召回缺口 2',
              summary: '正文有 2 项文风召回要求未充分落地。',
              missed_count: 2,
              missed: [
                { label: '节奏参照', text: '先压三轮质问，再用证据爆发' },
                { label: '匹配章技法', text: '旁观者差异化反应' },
              ],
              next_actions: [
                '下一章必须补足文风召回 missed 项，把节奏参照和匹配章技法写成正文可见的压迫、爆发、冷却或反应。',
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
        chapter_no: 8,
        title: '第二个证人',
        summary: '李玄顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事试图抢先灭口，旁观弟子开始分裂站队。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '文风召回缺口被正文补上。' },
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

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补召回')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补召回：召回缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('先压三轮质问')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旁观者差异化反应')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('先压三轮质问')
    expect(prompt).toContain('补召回：召回缺口 2')
    expect(prompt).toContain('旁观者差异化反应')
  })

  test('carries copied benchmark anchor excerpt risk into staged next-chapter repair actions', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '第二个证人' },
      [
        { id: 7, chapter_no: 7, title: '旧印章反推' },
        { id: 8, chapter_no: 8, title: '第二个证人' },
      ],
      [
        {
          id: 217,
          chapter_id: 7,
          review_type: 'benchmark_recall_sync',
          created_at: '2026-06-09T08:16:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            benchmark_recall_sync: {
              status: 'warn',
              label: '召回缺口 1',
              summary: '正文复制了原文锚点片段。',
              missed_count: 1,
              missed: [
                {
                  key: 'benchmark_anchor_excerpt_copy_risk',
                  label: '原文锚点复制风险',
                  text: 'anchor_excerpts 第1段出现可定位原句复制：账册翻到缺页前一行',
                  evidence: '账册翻到缺页前一行',
                  fix: '删除或改写锚点原句；只保留句长、停顿、潜台词和信息释放手法。',
                },
              ],
              copied_anchor_excerpts: ['账册翻到缺页前一行'],
              next_actions: [
                '存在原文锚点复制风险：删除或改写锚点原句，只保留句长、停顿、潜台词和信息释放手法。',
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
        chapter_no: 8,
        title: '第二个证人',
        summary: '李玄顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事试图抢先灭口，旁观弟子开始分裂站队。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '清理锚点复制后继续执行召回技法。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:02:00.000Z',
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

    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补召回')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('benchmark_anchor_excerpt_copy_risk')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('删除或改写锚点原句')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('锚点原句')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('信息释放手法')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('锚点复制')
    expect(prompt).toContain('删除或改写锚点原句')
    expect(prompt).toContain('只保留句长、停顿、潜台词和信息释放手法')
  })

  test('carries style boundary sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '第二个证人' },
      [
        { id: 7, chapter_no: 7, title: '旧印章反推' },
        { id: 8, chapter_no: 8, title: '第二个证人' },
      ],
      [
        {
          id: 217,
          chapter_id: 7,
          review_type: 'style_boundary_sync',
          created_at: '2026-06-09T08:16:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            style_boundary_sync: {
              status: 'warn',
              label: '文风边界缺口 2',
              summary: '正文有 2 项文风覆盖边界风险。',
              missed_count: 2,
              missed: [
                { label: 'Gate F 章末升华', text: '这一切只是开始' },
                { label: '样章复制风险', text: '三次敲桌和同一句口癖' },
              ],
              next_actions: [
                '下一章必须恢复硬约束永远赢：删章末升华、作者预告和样章复制，只保留抽象节奏。',
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
        chapter_no: 8,
        title: '第二个证人',
        summary: '李玄顺着旧印章背面的名字追出第二个证人。',
        conflict: '执事试图抢先灭口，旁观弟子开始分裂站队。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '文风边界缺口被正文补上。' },
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

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修文风边界')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补文风边界：文风边界缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('删章末升华')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('三次敲桌')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('同步风险开篇承接')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('style_boundary_sync')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('同步风险中段兑现')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('同步风险章尾复核')
    expect(prompt).toContain('补文风边界：文风边界缺口 2')
    expect(prompt).toContain('硬约束永远赢')
  })

  test('carries story loop sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 218,
          chapter_id: 8,
          review_type: 'story_loop_sync',
          created_at: '2026-06-09T08:18:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            story_loop_sync: {
              status: 'warn',
              label: '故事循环缺口 2',
              summary: '正文有 2 项故事循环缺口。',
              missed_count: 2,
              missed: [
                { label: '兑现反馈', text: '沈砚用旧印章反证账册被调换' },
                { label: '承接期待', text: '旧印章背面露出第二个证人的名字' },
              ],
              next_actions: [
                '下一章必须补足 setup -> escalation -> payoff -> carry_over，把上一章缺失的兑现反馈和承接期待写成现场后果。',
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
        conflict: '执事抢先封口，试图切断旧账反证的后果。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '故事循环缺口被正文补上。' },
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
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补故事循环')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补循环：故事循环缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('setup -> escalation -> payoff -> carry_over')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('旧印章背面露出第二个证人的名字')
    expect(prompt).toContain('补循环：故事循环缺口 2')
    expect(prompt).toContain('承接期待')
  })

  test('carries information flow sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 219,
          chapter_id: 8,
          review_type: 'information_flow_sync',
          created_at: '2026-06-09T08:19:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            information_flow_sync: {
              status: 'warn',
              label: '信息流缺口 2',
              summary: '正文有 2 项信息流缺口。',
              missed_count: 2,
              missed: [
                { label: '揭示顺序', text: '先让执事压旧账册 -> 再让证人改口 -> 最后亮旧印章' },
                { label: '背景说明书', text: '信息必须随审问冲突释放，不写背景说明书' },
              ],
              next_actions: [
                '下一章必须补足信息流：信息随冲突释放，按揭示顺序递进，删背景说明书。',
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
        conflict: '执事抢先封口，试图切断旧账反证的信息后果。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '信息流缺口被正文补上。' },
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
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补信息流')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补信息流：信息流缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('信息随冲突释放')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('背景说明书')
    expect(prompt).toContain('补信息流：信息流缺口 2')
    expect(prompt).toContain('揭示顺序')
  })

  test('carries beat cooling sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 16, chapter_no: 16, title: '账册余波' },
      [
        { id: 15, chapter_no: 15, title: '第三次会审压迫' },
        { id: 16, chapter_no: 16, title: '账册余波' },
      ],
      [
        {
          id: 231,
          chapter_id: 15,
          review_type: 'beat_cooling_sync',
          created_at: '2026-06-09T08:22:00.000Z',
          payload: JSON.stringify({
            chapter_id: 15,
            chapter_no: 15,
            beat_cooling_sync: {
              status: 'warn',
              label: '节奏冷却缺口 2',
              summary: '最近章节触发 2 项事件冷却风险。',
              missed_count: 2,
              missed: [
                { label: '大冲突冷却', text: 'conflict_thrill 最多连续 2 章。' },
                { label: '五章调剂', text: '每 5 章必须包含 bond_deepening 或 world_painting。' },
              ],
              next_actions: [
                '下一章优先轮换桥段类型：大冲突后补关系深化、世界观展开、势力建设或冲突余波。',
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
        chapter_no: 16,
        title: '账册余波',
        summary: '沈砚从第三次会审压迫后转入关系和旧城制度余波。',
        conflict: '林青禾担心他继续硬打会被长老席抓住破绽。',
        ending_hook: '旧城税契背面露出新地图入口。',
        scene_cards: [
          { scene_no: 1, title: '余波复盘', reader_payoff: '关系深化和世界观展开承接上一章大冲突。' },
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
      { chapter_no: 16, title: '账册余波' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先轮换桥段类型')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('换节奏：节奏冷却缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('关系深化')
    expect(prompt).toContain('换节奏：节奏冷却缺口 2')
    expect(prompt).toContain('优先轮换桥段类型')
  })

  test('carries expectation threshold sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 220,
          chapter_id: 8,
          review_type: 'expectation_threshold_sync',
          created_at: '2026-06-09T08:21:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            expectation_threshold_sync: {
              status: 'warn',
              label: '期待阈值缺口 2',
              summary: '正文有 2 项期待阈值缺口。',
              missed_count: 2,
              missed: [
                { label: '两长一短', text: '幕后长老为什么放任主角进入内层' },
                { label: '下一开环', text: '拿到资格前先露出第三个证人的名字' },
              ],
              next_actions: [
                '下一章必须补期待阈值：恢复两长一短，先立下一开环，再兑现旧期待。',
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
        conflict: '执事抢先封口，试图让旧账反证停在当前胜利。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '期待阈值缺口被正文补上。' },
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
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补期待阈值')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补期待阈值：期待阈值缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('两长一短')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('第三个证人的名字')
    expect(prompt).toContain('补期待阈值：期待阈值缺口 2')
    expect(prompt).toContain('下一开环')
  })

  test('carries emotional arc sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 221,
          chapter_id: 8,
          review_type: 'emotional_arc_sync',
          created_at: '2026-06-09T08:22:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            emotional_arc_sync: {
              status: 'warn',
              label: '情绪弧缺口 2',
              summary: '正文有 2 项情绪弧缺口。',
              missed_count: 2,
              missed: [
                { label: '调动释放', text: '只有旧账册压罪，没有旧印章反证释放' },
                { label: '下行情节安全感', text: '连续下压但缺少旧印章底牌或潜在解法' },
              ],
              next_actions: [
                '下一章必须补情绪弧：恢复平静 -> 调动 -> 释放 -> 爽，先给安全感，再兑现释放。',
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
        conflict: '执事抢先封口，试图让上一章的情绪停在压迫里。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '情绪弧缺口被正文补上。' },
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
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补情绪弧')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补情绪弧：情绪弧缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('平静 -> 调动 -> 释放 -> 爽')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('旧印章底牌')
    expect(prompt).toContain('补情绪弧：情绪弧缺口 2')
    expect(prompt).toContain('下行情节安全感')
  })

  test('carries chapter hook quality execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二个证人' },
      [
        { id: 8, chapter_no: 8, title: '旧账反证' },
        { id: 9, chapter_no: 9, title: '第二个证人' },
      ],
      [
        {
          id: 232,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:25:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            self_check: {
              review: {
                chapter_hook_quality_checks: [
                  {
                    key: 'ending_low_risk_hook',
                    label: '章尾低风险空钩子',
                    status: 'fail',
                    hook_position: 'ending',
                    trigger_type: '低风险口头预告',
                    concrete_question: '第三个证人究竟是谁。',
                    danger_or_choice: '第二个证人如果开口就会被执事当场封口。',
                    next_action_link: '下一章必须先保护第二个证人，再追第三个人。',
                    evidence: '章尾只写“事情还没完”，没有现场触发、危险选择或下一章行动压力。',
                    fix: '下一章最后300字必须把第三个证人的名字压到现场证物上，并让执事当场封口制造行动压力。',
                    remaining_risk: '不能再用低风险空话当章尾钩子。',
                  },
                  {
                    key: 'opening_hook_ok',
                    label: '章首现场异常',
                    status: 'pass',
                    hook_position: 'opening',
                    trigger_type: '现场异常',
                    concrete_question: '已兑现。',
                    danger_or_choice: '已兑现。',
                    next_action_link: '已兑现。',
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
        conflict: '执事抢先封口，试图切断旧账反证的后果。',
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        scene_cards: [
          { scene_no: 1, title: '证人现身', reader_payoff: '章钩质量缺口被正文补上。' },
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
      { chapter_no: 9, title: '第二个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修章级钩子')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('章级钩子：钩子缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('chapter_hook_quality_checks.章尾低风险空钩子')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('hook_position=ending')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('trigger_type=低风险口头预告')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('concrete_question=第三个证人究竟是谁')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('danger_or_choice=第二个证人如果开口就会被执事当场封口')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('next_action_link=下一章必须先保护第二个证人')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('章首现场异常')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('章级钩子')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('danger_or_choice')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('next_action_link')
    expect(prompt).toContain('chapter_hook_quality_checks.章尾低风险空钩子')
    expect(prompt).toContain('不能再用低风险空话当章尾钩子')
  })

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

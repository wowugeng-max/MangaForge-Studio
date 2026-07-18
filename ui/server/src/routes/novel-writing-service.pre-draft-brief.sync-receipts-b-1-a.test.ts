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

describe('chapter pre-draft brief sync-receipts b 1 a', () => {
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
})

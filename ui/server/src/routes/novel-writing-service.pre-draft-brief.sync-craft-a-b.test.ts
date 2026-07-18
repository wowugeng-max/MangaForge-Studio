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

describe('chapter pre-draft brief sync-craft a b', () => {
  test('carries continuity heat execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '内库编号' },
      [
        { id: 8, chapter_no: 8, title: '第二编号' },
        { id: 9, chapter_no: 9, title: '内库编号' },
      ],
      [
        {
          id: 230,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:24:30.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            self_check: {
              review: {
                continuity_heat_checks: [
                  {
                    key: 'thread_heat_missing',
                    label: '热度追踪断层',
                    status: 'warn',
                    heat_state: 'hot=沈峤旧案必须推进；warm=妹妹赎身线保温；cold=巡捕内库编号预热；archived=管事旧仓线休眠。',
                    hot_progress: '让沈峤旧案从旧印推进到父亲案卷缺页。',
                    warm_keepalive: '用妹妹旧名牌回声提醒赎身线仍是主角情感目标。',
                    cold_warmup: '巡捕内库编号先以契约缺角编号出现，不直接回收。',
                    archived_boundary: '管事旧仓线暂休眠，只用追捕后果保留边界，不误激活新旧仓冲突。',
                    evidence: '上一章只提契约和编号，没有推进 hot 线，也没有保温妹妹线或预热内库线。',
                    fix: '下一章必须推进沈峤旧案，保温妹妹赎身线，预热内库编号，并说明管事旧仓线暂休眠。',
                    remaining_risk: '不能再让长线只靠名字露面而没有热度变化。',
                  },
                  {
                    key: 'heat_ok',
                    label: '热度追踪已完成',
                    status: 'pass',
                    heat_state: '已兑现。',
                    hot_progress: '已兑现。',
                    warm_keepalive: '已兑现。',
                    cold_warmup: '已兑现。',
                    archived_boundary: '已兑现。',
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
        chapter_no: 9,
        title: '内库编号',
        summary: '主角顺着契约缺角编号发现巡捕内库与沈峤旧案有关。',
        conflict: '沈峤想压住旧案，主角必须用契约缺角逼他承认内库编号。',
        ending_hook: '内库编号对应的案卷缺了一页。',
        scene_cards: [
          { scene_no: 1, title: '编号缺角', reader_payoff: '连续性热度字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:24:30.000Z',
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
      { chapter_no: 9, title: '内库编号' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修连续性热度')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('连续性热度：热度缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('continuity_heat_checks.热度追踪断层')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('heat_state=hot=沈峤旧案必须推进')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('hot_progress=让沈峤旧案从旧印推进到父亲案卷缺页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('warm_keepalive=用妹妹旧名牌回声提醒赎身线')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('cold_warmup=巡捕内库编号先以契约缺角编号出现')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('archived_boundary=管事旧仓线暂休眠')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('热度追踪已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('hot_progress')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('warm_keepalive')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('archived_boundary')
    expect(prompt).toContain('continuity_heat_checks.热度追踪断层')
    expect(prompt).toContain('不能再让长线只靠名字露面而没有热度变化')
  })

  test('carries character relation execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '暗格同盟' },
      [
        { id: 8, chapter_no: 8, title: '第二编号' },
        { id: 9, chapter_no: 9, title: '暗格同盟' },
      ],
      [
        {
          id: 227,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:25:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            self_check: {
              review: {
                character_relation_checks: [
                  {
                    key: 'helper_without_protagonist_goal',
                    label: '主角目标归属不足',
                    status: 'fail',
                    relation_type: '交易同盟转信任同盟。',
                    protagonist_goal: '主角要拿到账房暗格里的契约，证明妹妹赎身记录被篡改。',
                    agency_choice: '主角必须主动选择把半张副页交给账房少女，让她验证编号。',
                    cost: '交出副页会让主角短暂失去唯一证据，并承担被背叛风险。',
                    relation_shift: '账房少女从只求自保，转为愿意替主角打开暗格。',
                    evidence: '上一章账房少女只负责提供帮助，主角像是在替她完成目标，缺少自己的选择和代价。',
                    fix: '下一章必须把目标归还给主角，让关系角色有自己的诉求，并通过主角主动选择和代价推动关系变化。',
                    remaining_risk: '不能再让关系角色只当工具人递线索。',
                  },
                  {
                    key: 'relation_arc_ok',
                    label: '关系弧线已完成',
                    status: 'pass',
                    relation_type: '已兑现。',
                    protagonist_goal: '已兑现。',
                    agency_choice: '已兑现。',
                    cost: '已兑现。',
                    relation_shift: '已兑现。',
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
        chapter_no: 9,
        title: '暗格同盟',
        summary: '主角用半张副页换到账房少女验证暗格契约。',
        conflict: '账房少女只想自保，主角必须冒着失去证据的风险换取她开暗格。',
        ending_hook: '暗格契约上的印章指向巡捕。',
        scene_cards: [
          { scene_no: 1, title: '半页换门', reader_payoff: '角色关系字段被正文补上。' },
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
      { chapter_no: 9, title: '暗格同盟' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修角色关系')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('角色关系：关系缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('character_relation_checks.主角目标归属不足')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('relation_type=交易同盟转信任同盟')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('protagonist_goal=主角要拿到账房暗格里的契约')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('agency_choice=主角必须主动选择把半张副页交给账房少女')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('cost=交出副页会让主角短暂失去唯一证据')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('relation_shift=账房少女从只求自保')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('关系弧线已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('protagonist_goal')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('agency_choice')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('relation_shift')
    expect(prompt).toContain('character_relation_checks.主角目标归属不足')
    expect(prompt).toContain('不能再让关系角色只当工具人递线索')
  })

  test('carries character behavior execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 10, chapter_no: 10, title: '巡捕旧痛' },
      [
        { id: 9, chapter_no: 9, title: '暗格同盟' },
        { id: 10, chapter_no: 10, title: '巡捕旧痛' },
      ],
      [
        {
          id: 228,
          chapter_id: 9,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:26:00.000Z',
          payload: JSON.stringify({
            chapter_id: 9,
            chapter_no: 9,
            self_check: {
              review: {
                character_behavior_checks: [
                  {
                    key: 'motive_chain_too_generic',
                    label: '动机链空泛',
                    status: 'warn',
                    character: '巡捕沈峤',
                    concrete_motive: '沈峤扣下契约不是单纯贪权，而是契约牵出他父亲当年被诬陷的旧案。',
                    emotional_reason: '他害怕旧案重开后父亲最后一点清名也被毁。',
                    trigger_change: '主角拿出暗格契约上的旧印，触发沈峤从压案转为试探合作。',
                    visible_choice: '沈峤必须亲手放走主角三十息，换取主角带回第二份契约。',
                    cost: '他放人会被同僚记名，失去巡捕内部的信任。',
                    evidence: '上一章沈峤只作为追捕压力出现，缺具体动机、情感理由和可见选择。',
                    fix: '下一章必须补沈峤的具体旧案动机、情感理由、触发变化、可见选择和代价。',
                    remaining_risk: '不能再让反派/阻力角色只是工具化追捕。',
                  },
                  {
                    key: 'visible_choice_ok',
                    label: '行为选择已完成',
                    status: 'pass',
                    character: '已兑现。',
                    concrete_motive: '已兑现。',
                    emotional_reason: '已兑现。',
                    trigger_change: '已兑现。',
                    visible_choice: '已兑现。',
                    cost: '已兑现。',
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
        chapter_no: 10,
        title: '巡捕旧痛',
        summary: '主角用旧印触发沈峤的旧案动机，让他短暂放行。',
        conflict: '沈峤扣住契约压案，主角必须让他看见旧案和父亲清名的关联。',
        ending_hook: '沈峤放人后，巡捕名册上划掉了他的名字。',
        scene_cards: [
          { scene_no: 1, title: '旧印试探', reader_payoff: '角色行为字段被正文补上。' },
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
      { chapter_no: 10, title: '巡捕旧痛' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修角色行为')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('角色行为：人设缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('character_behavior_checks.动机链空泛')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('character=巡捕沈峤')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('concrete_motive=沈峤扣下契约不是单纯贪权')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('emotional_reason=他害怕旧案重开后')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('trigger_change=主角拿出暗格契约上的旧印')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('visible_choice=沈峤必须亲手放走主角三十息')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('cost=他放人会被同僚记名')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('行为选择已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('concrete_motive')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('visible_choice')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('cost')
    expect(prompt).toContain('character_behavior_checks.动机链空泛')
    expect(prompt).toContain('不能再让反派/阻力角色只是工具化追捕')
  })

  test('carries asset linkage execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 11, chapter_no: 11, title: '暗格契约' },
      [
        { id: 10, chapter_no: 10, title: '巡捕旧痛' },
        { id: 11, chapter_no: 11, title: '暗格契约' },
      ],
      [
        {
          id: 229,
          chapter_id: 10,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:27:00.000Z',
          payload: JSON.stringify({
            chapter_id: 10,
            chapter_no: 10,
            self_check: {
              review: {
                asset_linkage_checks: [
                  {
                    key: 'contract_isolated',
                    label: '暗格契约孤立',
                    status: 'fail',
                    asset_name: '账房暗格契约',
                    function: '证明沈峤父亲旧案与妹妹赎身记录被篡改有关。',
                    ownership: '主角暂持半张副页，账房少女掌握暗格开法。',
                    trigger_condition: '只有沈峤看到旧印并放行三十息，主角才能打开暗格。',
                    limitation: '契约缺右下角验印，不能直接定罪，只能换来下一份证据。',
                    consequence: '使用契约会暴露账房少女协助主角，让她被管事盯上。',
                    story_link: '把妹妹赎身线、沈峤旧案和巡捕内鬼线挂在同一份证据上。',
                    evidence: '上一章只点名暗格契约，没有写功能、归属、触发条件、限制和后果。',
                    fix: '下一章必须让暗格契约承担证明功能，明确归属与触发条件，并用限制和后果连接下一条线。',
                    remaining_risk: '不能再让关键资产只作为设定名词出现。',
                  },
                  {
                    key: 'asset_function_ok',
                    label: '资产功能已完成',
                    status: 'pass',
                    asset_name: '已兑现。',
                    function: '已兑现。',
                    ownership: '已兑现。',
                    trigger_condition: '已兑现。',
                    limitation: '已兑现。',
                    consequence: '已兑现。',
                    story_link: '已兑现。',
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
        chapter_no: 11,
        title: '暗格契约',
        summary: '主角打开账房暗格，拿到能串起赎身记录和旧案的契约。',
        conflict: '契约缺验印，主角必须决定是否暴露账房少女来换下一份证据。',
        ending_hook: '契约缺角处留下巡捕内库的编号。',
        scene_cards: [
          { scene_no: 1, title: '契约缺角', reader_payoff: '资产挂钩字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:27:00.000Z',
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
      { chapter_no: 11, title: '暗格契约' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修资产挂钩')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('资产挂钩：孤立资产 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('asset_linkage_checks.暗格契约孤立')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('asset_name=账房暗格契约')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('function=证明沈峤父亲旧案')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('ownership=主角暂持半张副页')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('trigger_condition=只有沈峤看到旧印')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('limitation=契约缺右下角验印')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('consequence=使用契约会暴露账房少女')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('story_link=把妹妹赎身线')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('资产功能已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('asset_name')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('trigger_condition')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('story_link')
    expect(prompt).toContain('asset_linkage_checks.暗格契约孤立')
    expect(prompt).toContain('不能再让关键资产只作为设定名词出现')
  })

  test('carries state tracking execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 12, chapter_no: 12, title: '旧伤边界' },
      [
        { id: 11, chapter_no: 11, title: '暗格契约' },
        { id: 12, chapter_no: 12, title: '旧伤边界' },
      ],
      [
        {
          id: 231,
          chapter_id: 11,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:28:00.000Z',
          payload: JSON.stringify({
            chapter_id: 11,
            chapter_no: 11,
            self_check: {
              review: {
                state_tracking_checks: [
                  {
                    key: 'stale_injury_state',
                    label: '旧伤状态误用',
                    status: 'fail',
                    state_subject: '主角左肩旧伤',
                    state_type: '角色身体状态',
                    previous_state: '上一章旧伤只是被沈峤按住后发麻，没有真正复发。',
                    allowed_state: '本章只能写发麻、动作受限和短暂疼痛，不能写成重伤复发。',
                    used_in_chapter: '用左肩发麻影响开锁动作，但不让主角因此倒地。',
                    excluded_reason: '排除“旧伤复发到吐血”，因为前文没有触发重伤条件。',
                    evidence: '上一章把左肩旧伤写成突然复发，导致状态漂移。',
                    fix: '下一章必须按允许状态使用左肩旧伤，并明确排除重伤复发写法。',
                    remaining_risk: '不能再把未触发的旧状态当成当前事实使用。',
                  },
                  {
                    key: 'state_ok',
                    label: '状态边界已完成',
                    status: 'pass',
                    state_subject: '已兑现。',
                    state_type: '已兑现。',
                    previous_state: '已兑现。',
                    allowed_state: '已兑现。',
                    used_in_chapter: '已兑现。',
                    evidence: '已兑现。',
                    excluded_reason: '已兑现。',
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
        chapter_no: 12,
        title: '旧伤边界',
        summary: '主角带着左肩发麻打开内库，但不能把旧伤写成无因复发。',
        conflict: '左肩发麻影响开锁速度，巡捕追近，主角必须在状态边界内完成动作。',
        ending_hook: '内库门开后，主角发现验印台被搬空。',
        scene_cards: [
          { scene_no: 1, title: '发麻开锁', reader_payoff: '状态筛选字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:28:00.000Z',
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
      { chapter_no: 12, title: '旧伤边界' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修状态筛选')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('状态筛选：上下文缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('state_tracking_checks.旧伤状态误用')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('state_subject=主角左肩旧伤')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('state_type=角色身体状态')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('previous_state=上一章旧伤只是被沈峤按住后发麻')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('allowed_state=本章只能写发麻')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('used_in_chapter=用左肩发麻影响开锁动作')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('excluded_reason=排除“旧伤复发到吐血”')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('状态边界已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('previous_state')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('used_in_chapter')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('excluded_reason')
    expect(prompt).toContain('state_tracking_checks.旧伤状态误用')
    expect(prompt).toContain('不能再把未触发的旧状态当成当前事实使用')
  })

})

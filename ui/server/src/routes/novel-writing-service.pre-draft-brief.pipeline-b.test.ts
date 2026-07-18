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

describe('chapter pre-draft brief pipeline b', () => {
  test('carries character relation sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 38, chapter_no: 38, title: '共同证词' },
      [
        { id: 37, chapter_no: 37, title: '代签追责' },
        { id: 38, chapter_no: 38, title: '共同证词' },
      ],
      [
        {
          id: 244,
          chapter_id: 37,
          review_type: 'character_relation_sync',
          created_at: '2026-06-09T10:30:00.000Z',
          payload: JSON.stringify({
            chapter_id: 37,
            chapter_no: 37,
            character_relation_sync: {
              status: 'warn',
              label: '角色关系缺口 2',
              summary: '正文有 2 项角色关系缺口。',
              missed_count: 2,
              missed: [
                { label: '关系弧线', text: '林青禾和主角仍停在互相支持，没有压力测试后的态度变化。' },
                { label: '独立目标', text: '配角只围着主角转，没有洗清代签责任的独立目标。' },
              ],
              next_actions: [
                '下一章必须补角色关系：明确合作互信但仍有边界，让林青禾带着洗清代签责任的独立目标主动作证。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城设备师', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 38,
        title: '共同证词',
        summary: '主角和林青禾在追责会上拆穿代签陷阱。',
        conflict: '协会会长用客户撤授权压两人分开承担责任。',
        ending_hook: '林青禾提交的证词牵出旧设备采购名单。',
        scene_cards: [
          { scene_no: 1, title: '共同证词', reader_payoff: '角色关系缺口被正文补上。' },
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
      { chapter_no: 38, title: '共同证词' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补角色关系')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补关系线：角色关系缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('合作互信但仍有边界')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('关系弧线')
    expect(prompt).toContain('补关系线：角色关系缺口 2')
    expect(prompt).toContain('洗清代签责任的独立目标主动作证')
  })

  test('carries core contract sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 19, chapter_no: 19, title: '广播室名单' },
      [
        { id: 18, chapter_no: 18, title: '玻璃暗号' },
        { id: 19, chapter_no: 19, title: '广播室名单' },
      ],
      [
        {
          id: 245,
          chapter_id: 18,
          review_type: 'core_contract_sync',
          created_at: '2026-06-09T11:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 18,
            chapter_no: 18,
            core_contract_sync: {
              status: 'warn',
              label: '核心契约缺口 2',
              summary: '正文有 2 项核心契约缺口。',
              missed_count: 2,
              missed: [
                { label: '必须服务', text: '超人蛮力被规则反制没有落成现场判定。' },
                { label: '不得漂移', text: '规则怪谈被写成纯打怪，主角靠蛮力无代价通关。' },
              ],
              next_actions: [
                '下一章必须补核心契约：广播室名单要继续服务规则反制，写出蛮力被判定限制和广播来源新问题。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 19,
        title: '广播室名单',
        summary: '主角追查废弃广播室名单。',
        conflict: '规则判定禁止强拆广播室门。',
        ending_hook: '名单里出现下一位播音者。',
        scene_cards: [
          { scene_no: 1, title: '广播室名单', reader_payoff: '核心契约缺口被正文补上。' },
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
      { chapter_no: 19, title: '广播室名单' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('创作契约：核心承诺缺口 2')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('创作契约')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('规则反制')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('广播来源新问题')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('广播室名单要继续服务规则反制')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('必须服务')
    expect(prompt).toContain('创作契约：核心承诺缺口 2')
    expect(prompt).toContain('蛮力被判定限制和广播来源新问题')
  })

  test('carries chapter blueprint sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第二扇门' },
      [
        { id: 8, chapter_no: 8, title: '第二本账册' },
        { id: 9, chapter_no: 9, title: '第二扇门' },
      ],
      [
        {
          id: 217,
          chapter_id: 8,
          review_type: 'chapter_blueprint_sync',
          created_at: '2026-06-09T08:15:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            chapter_blueprint_sync: {
              status: 'warn',
              label: '细纲缺口 2',
              summary: '正文有 2 项章节细纲任务未充分落地。',
              missed_count: 2,
              missed: [
                { label: '章尾承接', text: '禁地钥匙对应第二扇门，门后有人等江辰' },
                { label: '代价/收益', text: '江辰暴露第二本账册的同时洗清罪名' },
              ],
              next_actions: [
                '下一章必须补足章节细纲 missed 项，把章尾承接和代价收益写成正文可见的新问题与后果。',
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
        title: '第二扇门',
        summary: '江辰用禁地钥匙打开第二扇门，接住上一章留下的人影。',
        conflict: '门后的人要求江辰交出第二本账册。',
        ending_hook: '门后阵纹亮起第三个旧印。',
        scene_cards: [
          { scene_no: 1, title: '门后人影', reader_payoff: '细纲缺口被正文补上。' },
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
      { chapter_no: 9, title: '第二扇门' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补细纲')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补细纲：细纲缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('章尾承接')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('代价/收益')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('禁地钥匙对应第二扇门')
    expect(prompt).toContain('补细纲：细纲缺口 2')
    expect(prompt).toContain('江辰暴露第二本账册')
  })

  test('carries foreshadowing delta sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '旧臣回声' },
      [
        { id: 8, chapter_no: 8, title: '腰牌裂痕' },
        { id: 9, chapter_no: 9, title: '旧臣回声' },
      ],
      [
        {
          id: 218,
          chapter_id: 8,
          review_type: 'foreshadowing_delta_sync',
          created_at: '2026-06-09T08:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            foreshadowing_delta_sync: {
              status: 'warn',
              label: '伏笔增量缺口 2',
              summary: '本章新增/推进/回收的伏笔有 2 项未写回。',
              missed_count: 2,
              missed: [
                { name: '旧臣背刺伏笔线', text: '旧臣避开腰牌，说明他认识边军暗记。' },
                { name: '暗门钥匙伏笔', text: '门环背面缺口和钥匙齿痕对应。' },
              ],
              next_actions: [
                '下一章只补本轮伏笔增量：把旧臣避开腰牌写成可见反应，并把暗门钥匙状态写回伏笔台账。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '镜州旧案', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 9,
        title: '旧臣回声',
        summary: '主角追查腰牌裂痕，确认旧臣与暗门钥匙有关。',
        conflict: '旧臣拒绝承认认识边军暗记。',
        ending_hook: '暗门内传来旧臣年轻时的声音。',
        scene_cards: [
          { scene_no: 1, title: '腰牌复核', reader_payoff: '伏笔增量被正文补回。' },
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
      { chapter_no: 9, title: '旧臣回声' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补伏笔增量')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补伏笔增量：伏笔增量缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旧臣背刺伏笔线')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('暗门钥匙伏笔')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('下一章只补本轮伏笔增量')
    expect(prompt).toContain('补伏笔增量：伏笔增量缺口 2')
    expect(prompt).toContain('暗门钥匙状态写回伏笔台账')
  })

  test('carries character state delta sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '旁听席之后' },
      [
        { id: 8, chapter_no: 8, title: '公开作证' },
        { id: 9, chapter_no: 9, title: '旁听席之后' },
      ],
      [
        {
          id: 219,
          chapter_id: 8,
          review_type: 'character_state_delta_sync',
          created_at: '2026-06-09T08:25:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            character_state_delta_sync: {
              status: 'warn',
              label: '角色状态增量缺口 1',
              summary: '林青禾的关系态度和公众形象没有写回。',
              missed_count: 1,
              missed: [
                { name: '林青禾', text: '关系态度：愿意有限作证；公众形象：仍被家族盯着。' },
              ],
              next_actions: [
                '下一章只补本章角色状态增量：林青禾先保持有限作证立场，并承受家族目光压力。',
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
        title: '旁听席之后',
        summary: '林青禾离开旁听席后被家族逼问，李玄必须判断她还能不能继续作证。',
        conflict: '林青禾想有限作证，但家族压力逼她收回证词。',
        ending_hook: '她递给李玄一枚被折断的旧印章。',
        scene_cards: [
          { scene_no: 1, title: '旁听席外', reader_payoff: '角色状态缺口被正文补回。' },
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
      { chapter_no: 9, title: '旁听席之后' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补角色状态')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补角色状态：角色状态增量缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('林青禾')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('有限作证')
    expect(prompt).toContain('补角色状态：角色状态增量缺口 1')
    expect(prompt).toContain('林青禾先保持有限作证立场')
  })

  test('carries asset state delta sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '旧印半痕' },
      [
        { id: 8, chapter_no: 8, title: '公开作证' },
        { id: 9, chapter_no: 9, title: '旧印半痕' },
      ],
      [
        {
          id: 220,
          chapter_id: 8,
          review_type: 'asset_state_delta_sync',
          created_at: '2026-06-09T08:30:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            asset_state_delta_sync: {
              status: 'warn',
              label: '资产状态增量缺口 1',
              summary: '旧印章的可见性没有写回。',
              missed_count: 1,
              missed: [
                { name: '旧印章', text: '只露出半枚印纹，不能提前公开完整归属。' },
              ],
              next_actions: [
                '下一章只补本章资产状态增量：旧印章继续保持半枚印纹状态，并用可见限制推动李玄追查。',
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
        title: '旧印半痕',
        summary: '李玄拿着半枚旧印章追查账册来源。',
        conflict: '旧印章只能显出半枚印纹，不能直接证明完整归属。',
        ending_hook: '半枚印纹在月光下补出另一个家族姓氏。',
        scene_cards: [
          { scene_no: 1, title: '半印追查', reader_payoff: '资产状态缺口被正文补回。' },
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
      { chapter_no: 9, title: '旧印半痕' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补资产状态')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补资产状态：资产状态增量缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旧印章')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('半枚印纹')
    expect(prompt).toContain('补资产状态：资产状态增量缺口 1')
    expect(prompt).toContain('旧印章继续保持半枚印纹状态')
  })

  test('carries relationship delta sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '有限作证之后' },
      [
        { id: 8, chapter_no: 8, title: '公开作证' },
        { id: 9, chapter_no: 9, title: '有限作证之后' },
      ],
      [
        {
          id: 221,
          chapter_id: 8,
          review_type: 'relationship_delta_sync',
          created_at: '2026-06-09T08:35:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            relationship_delta_sync: {
              status: 'warn',
              label: '关系增量缺口 1',
              summary: '李玄与林青禾互信线没有写回关系图。',
              missed_count: 1,
              missed: [
                { name: '李玄与林青禾互信线', text: '林青禾从旁观转为有限作证，双方形成有代价的互信。' },
              ],
              next_actions: [
                '下一章只补本章关系增量：林青禾仍保持有限作证，不要突然变成无条件盟友。',
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
        title: '有限作证之后',
        summary: '李玄判断林青禾的证词还能否继续使用。',
        conflict: '林青禾愿意有限作证，但不愿把家族拖进审判。',
        ending_hook: '她把证词改成只保护李玄一次。',
        scene_cards: [
          { scene_no: 1, title: '证词边界', reader_payoff: '关系增量缺口被正文补回。' },
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
      { chapter_no: 9, title: '有限作证之后' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补关系')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补关系：关系增量缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('李玄与林青禾互信线')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('有限作证')
    expect(prompt).toContain('补关系：关系增量缺口 1')
    expect(prompt).toContain('林青禾仍保持有限作证')
  })

  test('carries chapter handoff delta sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '第三个证人' },
      [
        { id: 8, chapter_no: 8, title: '第二个证人' },
        { id: 9, chapter_no: 9, title: '第三个证人' },
      ],
      [
        {
          id: 222,
          chapter_id: 8,
          review_type: 'chapter_handoff_delta_sync',
          created_at: '2026-06-09T08:40:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            chapter_handoff_delta_sync: {
              status: 'warn',
              label: '章末交接缺口 1',
              summary: '第二个证人的章末追读没有写入下一章优先事项。',
              missed_count: 1,
              missed: [
                { label: '下一章拉力', text: '第二个证人说出旧案当晚还有第三个人。' },
              ],
              next_actions: [
                '下一章开篇必须接住第二个证人的最后一句话，先追查第三个人而不是重开新场景。',
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
        title: '第三个证人',
        summary: '李玄追查旧案当晚的第三个人。',
        conflict: '第二个证人只肯说半句，执事试图切断追问。',
        ending_hook: '第三个人的名字出现在旧账册缺页背面。',
        scene_cards: [
          { scene_no: 1, title: '证词追问', reader_payoff: '章末交接缺口被正文补回。' },
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
      { chapter_no: 9, title: '第三个证人' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补章末交接')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补章末交接：章末交接缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('第二个证人')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('第三个人')
    expect(prompt).toContain('补章末交接：章末交接缺口 1')
    expect(prompt).toContain('先追查第三个人')
  })

  test('carries chapter handoff sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 22, chapter_no: 22, title: '水痕名单' },
      [
        { id: 21, chapter_no: 21, title: '门外暗号' },
        { id: 22, chapter_no: 22, title: '水痕名单' },
      ],
      [
        {
          id: 246,
          chapter_id: 21,
          review_type: 'chapter_handoff_sync',
          created_at: '2026-06-09T11:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 21,
            chapter_no: 21,
            chapter_handoff_sync: {
              status: 'warn',
              label: '章首承接缺口 2',
              summary: '正文有 2 项章首承接缺口。',
              missed_count: 2,
              missed: [
                { label: '开篇义务', text: '开篇没有接住敲门、湿漉漉学生和不能开门的警告。' },
                { label: '逾期待办', text: '玻璃门水痕没有优先推进。' },
              ],
              next_actions: [
                '下一章必须补章首承接：开篇先回到玻璃门水痕，接住湿漉漉学生和不能开门警告，再推进名单线索。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 22,
        title: '水痕名单',
        summary: '主角追查玻璃门水痕对应的名单。',
        conflict: '规则判定阻止他们直接开门。',
        ending_hook: '名单里出现门外学生的旧床位。',
        scene_cards: [
          { scene_no: 1, title: '水痕名单', reader_payoff: '章首承接缺口被正文补上。' },
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
      { chapter_no: 22, title: '水痕名单' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补章首承接')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('接章首：章首承接缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('开篇先回到玻璃门水痕')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('开篇义务')
    expect(prompt).toContain('接章首：章首承接缺口 2')
    expect(prompt).toContain('接住湿漉漉学生和不能开门警告')
  })

  test('carries prose revision receipt sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '审稿残留复写' },
      [
        { id: 8, chapter_no: 8, title: '修订后的裂缝' },
        { id: 9, chapter_no: 9, title: '审稿残留复写' },
      ],
      [
        {
          id: 223,
          chapter_id: 8,
          review_type: 'prose_revision_receipt_sync',
          created_at: '2026-06-09T08:45:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            prose_revision_receipt_sync: {
              status: 'warn',
              label: '修订回执残留 1',
              summary: '修订后仍有 1 项残留风险。',
              missed_count: 1,
              missed: [
                {
                  label: 'S2｜prose',
                  text: '仍有抽象心理描写，没有改成动作和对白。',
                  evidence: '他心中泛起复杂情绪。',
                },
              ],
              next_actions: [
                '下一章开篇不能复现抽象心理描写，必须用动作、对白和可见反应替代。',
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
        title: '审稿残留复写',
        summary: '李玄继续追查修订后残留的证词漏洞。',
        conflict: '他必须用可见行动逼出新证词，而不是旁白解释心理。',
        ending_hook: '证词背面出现被擦掉的第二行字。',
        scene_cards: [
          { scene_no: 1, title: '证词复核', reader_payoff: '修订残留被正文补回。' },
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
      { chapter_no: 9, title: '审稿残留复写' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先复核修订')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('复核修订：修订回执残留 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('抽象心理描写')
    expect(prompt).toContain('复核修订：修订回执残留 1')
    expect(prompt).toContain('必须用动作、对白和可见反应替代')
  })

  test('carries revision cascade impact sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '半印追查' },
      [
        { id: 8, chapter_no: 8, title: '修订后的旧印' },
        { id: 9, chapter_no: 9, title: '半印追查' },
      ],
      [
        {
          id: 224,
          chapter_id: 8,
          review_type: 'revision_cascade_impact_sync',
          created_at: '2026-06-09T08:47:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            revision_cascade_impact_sync: {
              status: 'warn',
              label: '修订级联影响 2',
              summary: '本章修订改变了旧印章归属和互信边界，后续章节需要同步。',
              missed_count: 2,
              missed: [
                {
                  type: 'foreshadowing',
                  target: '旧印章归属',
                  text: '后续不能让林青禾直接持有旧印章。',
                  required_action: '第9章开篇改为林青禾只递出半枚印纹。',
                },
                {
                  type: 'relationship',
                  target: '李玄与林青禾互信线',
                  text: '有限作证仍成立，但不能写成无条件结盟。',
                  required_action: '保持有限作证边界。',
                },
              ],
              next_actions: [
                '下一章必须先同步修订后的资产归属和关系边界，再推进新冲突。',
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
        title: '半印追查',
        summary: '李玄按修订后的旧印章归属继续追查。',
        conflict: '林青禾只能提供半枚印纹，不能直接交出旧印章。',
        ending_hook: '半枚印纹对上账册缺页。',
        scene_cards: [
          { scene_no: 1, title: '半印边界', reader_payoff: '修订级联影响被正文接住。' },
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
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先级联修订')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('级联修订：修订级联影响 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('林青禾只递出半枚印纹')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('有限作证边界')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('第9章开篇改为林青禾只递出半枚印纹')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('保持有限作证边界')
    expect(prompt).toContain('级联修订：修订级联影响 2')
    expect(prompt).toContain('开篇动作：')
    expect(prompt).toContain('第9章开篇改为林青禾只递出半枚印纹')
    expect(prompt).toContain('中段动作：')
    expect(prompt).toContain('保持有限作证边界')
    expect(prompt).toContain('开篇动作必须在前300字')
    expect(prompt).toContain('中段动作必须落成中段事件推进')
    expect(prompt).toContain('章末动作必须在最后300字')
    expect(prompt).toContain('先同步修订后的资产归属和关系边界')
  })

  test('carries revision cascade evidence location risks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 9, chapter_no: 9, title: '半印追查' },
      [
        { id: 8, chapter_no: 8, title: '修订后的旧印' },
        { id: 9, chapter_no: 9, title: '半印追查' },
      ],
      [
        {
          id: 225,
          chapter_id: 8,
          review_type: 'revision_cascade_impact_sync',
          created_at: '2026-06-09T08:49:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            revision_cascade_impact_sync: {
              status: 'warn',
              label: '修订级联影响 1',
              summary: '旧印章归属证据来自旧稿，后续章节不能直接沿用。',
              missed_count: 1,
              evidence_unlocated_count: 1,
              missed: [
                {
                  type: 'foreshadowing',
                  target: '旧印章归属',
                  text: '后续不能让林青禾直接持有旧印章。',
                  required_action: '第9章开篇改为林青禾只递出半枚印纹。',
                  evidence: '执事把旧印章扣进袖中，只留半枚印纹。',
                  evidence_location_risk: 'cascade_impacts evidence/source_excerpt 无法定位到修订后正文。',
                },
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
        title: '半印追查',
        summary: '李玄按修订后的旧印章归属继续追查。',
        conflict: '林青禾只能提供半枚印纹，不能直接交出旧印章。',
        ending_hook: '半枚印纹对上账册缺页。',
        scene_cards: [
          { scene_no: 1, title: '半印边界', reader_payoff: '修订级联影响被正文接住。' },
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

    expect(deliveryRiskCarryOver?.priority_label).toBe('优先级联修订')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('无法定位到修订后正文')
    expect(prompt).toContain('无法定位到修订后正文')
    expect(prompt).toContain('第9章开篇改为林青禾只递出半枚印纹')
  })

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

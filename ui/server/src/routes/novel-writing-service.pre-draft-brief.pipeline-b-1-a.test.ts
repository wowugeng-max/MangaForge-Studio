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

describe('chapter pre-draft brief pipeline b 1 a', () => {
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
})

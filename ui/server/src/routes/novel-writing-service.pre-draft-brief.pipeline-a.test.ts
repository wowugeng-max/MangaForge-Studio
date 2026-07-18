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

describe('chapter pre-draft brief pipeline a', () => {
  test('carries asset linkage sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 23, chapter_no: 23, title: '地砖原件' },
      [
        { id: 22, chapter_no: 22, title: '旧钥匙开缝' },
        { id: 23, chapter_no: 23, title: '地砖原件' },
      ],
      [
        {
          id: 234,
          chapter_id: 22,
          review_type: 'asset_linkage_sync',
          created_at: '2026-06-09T09:05:00.000Z',
          payload: JSON.stringify({
            chapter_id: 22,
            chapter_no: 22,
            asset_linkage_sync: {
              status: 'warn',
              label: '资产挂钩缺口 2',
              summary: '正文有 2 项资产挂钩缺口。',
              missed_count: 2,
              missed: [
                { label: '功能链', text: '旧钥匙只被点名，没有绑定功能、触发条件、限制和后果。' },
                { label: '孤立资产', text: '禁门规则没有推进目标、制造阻碍、兑现伏笔或打开章尾钩子。' },
              ],
              next_actions: [
                '下一章必须补资产挂钩：旧钥匙要触发暗格并留下锁死代价，禁门规则要逼出账本原件位置。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 23,
        title: '地砖原件',
        summary: '李玄用旧钥匙打开地砖暗格，找到账本原件。',
        conflict: '周薄森试图抢先触发禁门规则锁死李玄。',
        ending_hook: '账本原件最后一页出现第二枚血契编号。',
        scene_cards: [
          { scene_no: 1, title: '地砖原件', reader_payoff: '资产挂钩缺口被正文补上。' },
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
      { chapter_no: 23, title: '地砖原件' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补资产挂钩')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('挂资产：资产挂钩缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旧钥匙要触发暗格')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('孤立资产')
    expect(prompt).toContain('挂资产：资产挂钩缺口 2')
    expect(prompt).toContain('禁门规则要逼出账本原件位置')
  })

  test('carries state tracking sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 24, chapter_no: 24, title: '第二枚编号' },
      [
        { id: 23, chapter_no: 23, title: '地砖原件' },
        { id: 24, chapter_no: 24, title: '第二枚编号' },
      ],
      [
        {
          id: 235,
          chapter_id: 23,
          review_type: 'state_tracking_sync',
          created_at: '2026-06-09T09:15:00.000Z',
          payload: JSON.stringify({
            chapter_id: 23,
            chapter_no: 23,
            state_tracking_sync: {
              status: 'warn',
              label: '状态跟踪缺口 2',
              summary: '正文有 2 项状态跟踪缺口。',
              missed_count: 2,
              missed: [
                { label: '角色状态', text: '李玄左臂旧伤和残阵三息限制被写反。' },
                { label: '世界约束', text: '禁门三息锁死规则没有生效。' },
              ],
              next_actions: [
                '下一章必须补状态跟踪：李玄仍受左臂旧伤和残阵三息限制，禁门三息锁死规则必须继续生效。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 24,
        title: '第二枚编号',
        summary: '李玄在三息限制内追查第二枚血契编号。',
        conflict: '禁门开始锁死，周薄森试图把李玄困在暗格前。',
        ending_hook: '第二枚编号对应林青禾的封条来源。',
        scene_cards: [
          { scene_no: 1, title: '第二枚编号', reader_payoff: '状态跟踪缺口被正文补上。' },
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
      { chapter_no: 24, title: '第二枚编号' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补状态跟踪')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补状态：状态跟踪缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('李玄仍受左臂旧伤')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('世界约束')
    expect(prompt).toContain('补状态：状态跟踪缺口 2')
    expect(prompt).toContain('禁门三息锁死规则必须继续生效')
  })

  test('carries source readiness sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 25, chapter_no: 25, title: '补齐来源' },
      [
        { id: 24, chapter_no: 24, title: '缺源测试' },
        { id: 25, chapter_no: 25, title: '补齐来源' },
      ],
      [
        {
          id: 247,
          chapter_id: 24,
          review_type: 'source_readiness_sync',
          created_at: '2026-06-09T11:40:00.000Z',
          payload: JSON.stringify({
            chapter_id: 24,
            chapter_no: 24,
            source_readiness_sync: {
              status: 'warn',
              label: '来源就绪缺口 2',
              summary: '写前来源有 2 项未就绪。',
              missed_count: 2,
              missed: [
                { label: '上一章正文/章尾钩子', text: '上一章正文缺失，不能确认旧楼门牌变化。' },
                { label: '角色状态', text: '角色状态只有名字，没有当前位置和认知边界。' },
              ],
              next_actions: [
                '下一章必须补来源就绪：先补齐上一章正文、角色状态和认知边界，再把旧楼门牌变化写成当前行动依据。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧楼规则', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 25,
        title: '补齐来源',
        summary: '主角确认旧楼门牌变化来自上一章最后一幕。',
        conflict: '角色状态和认知边界决定他们不能直接打开旧楼门。',
        ending_hook: '旧楼门牌背面出现新的时间戳。',
        scene_cards: [
          { scene_no: 1, title: '来源补齐', reader_payoff: '来源就绪缺口被正文补上。' },
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
      { chapter_no: 25, title: '补齐来源' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补来源就绪')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补来源：来源就绪缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('先补齐上一章正文')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('角色状态')
    expect(prompt).toContain('补来源：来源就绪缺口 2')
    expect(prompt).toContain('旧楼门牌变化写成当前行动依据')
  })

  test('carries prose meta sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 16, chapter_no: 16, title: '火漆背面' },
      [
        { id: 15, chapter_no: 15, title: '袖口旧印' },
        { id: 16, chapter_no: 16, title: '火漆背面' },
      ],
      [
        {
          id: 248,
          chapter_id: 15,
          review_type: 'prose_meta_sync',
          created_at: '2026-06-09T12:10:00.000Z',
          payload: JSON.stringify({
            chapter_id: 15,
            chapter_no: 15,
            prose_meta_sync: {
              status: 'warn',
              label: '正文元信息缺口 3',
              summary: '正文有 3 处作者视角元信息。',
              missed_count: 3,
              missed: [
                { term: '上一章', line: 2, evidence: '林青禾按住袖口，想起上一章那枚旧印。' },
                { term: '伏笔', line: 3, evidence: '账册夹页里还藏着一处伏笔。' },
                { term: '读者', line: 3, evidence: '读者会在这里明白代价。' },
              ],
              next_actions: [
                '下一章必须修正文元信息：把“上一章/伏笔/读者”改成角色当下能感知的事件锚点或相对时间。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '袖口旧印', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 16,
        title: '火漆背面',
        summary: '林青禾翻看火漆背面的旧印来源。',
        conflict: '她必须在会长追问前把旧印来源变成现场证据。',
        ending_hook: '火漆背面露出第二枚编号。',
        scene_cards: [
          { scene_no: 1, title: '火漆背面', reader_payoff: '正文元信息缺口被现场事件锚点替代。' },
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
      { chapter_no: 16, title: '火漆背面' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 3')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修正文元信息')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修元信息：正文元信息缺口 3')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('角色当下能感知')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('上一章')
    expect(prompt).toContain('修元信息：正文元信息缺口 3')
    expect(prompt).toContain('上一章/伏笔/读者')
  })

  test('carries prose meta execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 16, chapter_no: 16, title: '火漆背面' },
      [
        { id: 15, chapter_no: 15, title: '袖口旧印' },
        { id: 16, chapter_no: 16, title: '火漆背面' },
      ],
      [
        {
          id: 249,
          chapter_id: 15,
          review_type: 'prose_quality',
          created_at: '2026-06-09T12:12:00.000Z',
          payload: JSON.stringify({
            chapter_id: 15,
            chapter_no: 15,
            self_check: {
              review: {
                prose_meta_checks: [
                  {
                    label: '工程词泄露',
                    status: 'warn',
                    matched_term: '上一章',
                    location: '第2段第1句',
                    replacement: '刚才袖口旧印烫亮的那一刻',
                    evidence: '林青禾按住袖口，想起上一章那枚旧印。',
                    fix: '下一章必须把上一章改成角色当下能感知的事件锚点。',
                    remaining_risk: '不要再出现上一章、本章、读者等工程词。',
                  },
                  {
                    label: '标题行安全',
                    status: 'pass',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '袖口旧印', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 16,
        title: '火漆背面',
        summary: '林青禾翻看火漆背面的旧印来源。',
        conflict: '她必须在会长追问前把旧印来源变成现场证据。',
        ending_hook: '火漆背面露出第二枚编号。',
        scene_cards: [
          { scene_no: 1, title: '火漆背面', reader_payoff: '正文元信息缺口被现场事件锚点替代。' },
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
      { chapter_no: 16, title: '火漆背面' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修工程词')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('正文元信息：工程词泄露 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('prose_meta_checks.工程词泄露')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('matched_term=上一章')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('location=第2段第1句')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('replacement=刚才袖口旧印烫亮的那一刻')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('标题行安全')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('matched_term')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('replacement')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('remaining_risk')
    expect(prompt).toContain('prose_meta_checks.工程词泄露')
    expect(prompt).toContain('不要再出现上一章')
  })

  test('carries spectator reaction sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 10, chapter_no: 10, title: '账房改口' },
      [
        { id: 9, chapter_no: 9, title: '公审台' },
        { id: 10, chapter_no: 10, title: '账房改口' },
      ],
      [
        {
          id: 249,
          chapter_id: 9,
          review_type: 'spectator_reaction_sync',
          created_at: '2026-06-09T12:30:00.000Z',
          payload: JSON.stringify({
            chapter_id: 9,
            chapter_no: 9,
            spectator_reaction_sync: {
              status: 'warn',
              label: '围观反应缺口 1',
              summary: '公开反证只写了统一震惊，没有差异化围观者反应。',
              missed_count: 1,
              missed: [
                {
                  key: 'spectator_reaction_unified',
                  label: '围观反应分层',
                  evidence: '全场瞬间震惊，所有人都倒吸一口凉气。',
                  fix: '补普通人、懂行者、反派至少两层差异化反应。',
                },
              ],
              next_actions: [
                '下一章必须补围观反应：普通人停喊、懂行者核对账册、反派后退或改口，至少两层基于利益目标的差异化反应。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '公审账册', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 10,
        title: '账房改口',
        summary: '账房老吏被迫解释账册墨色和旧印来源。',
        conflict: '周薄森试图用全场喧哗盖过账房证词。',
        ending_hook: '账房说出第二个证人的名字。',
        scene_cards: [
          { scene_no: 1, title: '账房改口', reader_payoff: '围观反应从统一震惊变成可见立场翻转。' },
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
      { chapter_no: 10, title: '账房改口' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补围观反应')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补围观：围观反应缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('普通人停喊')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('全场瞬间震惊')
    expect(prompt).toContain('补围观：围观反应缺口 1')
    expect(prompt).toContain('至少两层基于利益目标的差异化反应')
  })

  test('carries payoff setup sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 11, chapter_no: 11, title: '录音来源' },
      [
        { id: 10, chapter_no: 10, title: '公审台' },
        { id: 11, chapter_no: 11, title: '录音来源' },
      ],
      [
        {
          id: 250,
          chapter_id: 10,
          review_type: 'payoff_setup_sync',
          created_at: '2026-06-09T12:45:00.000Z',
          payload: JSON.stringify({
            chapter_id: 10,
            chapter_no: 10,
            payoff_setup_sync: {
              status: 'warn',
              label: '爽点铺垫缺口 1',
              summary: '检测报告打脸前缺少可指认的危机、暗牌或来源铺垫。',
              missed_count: 1,
              missed: [
                {
                  key: 'payoff_without_setup_3',
                  label: '爽点铺垫扫描',
                  evidence: '他突然拿出一份检测报告，当众打脸所有质疑者。',
                  fix: '在兑现前补线索、暗牌、录音/报告来源、角色提前准备或反派得意误判。',
                },
              ],
              next_actions: [
                '下一章必须补爽点铺垫：先写录音键红点、档案室报告来源和反派得意误判，再兑现检测报告反证。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '公审账册', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 11,
        title: '录音来源',
        summary: '李辰解释检测报告和录音来源，让上一章打脸变成可回看的证据链。',
        conflict: '周薄森试图质疑报告来源，逼李辰补全证据链。',
        ending_hook: '录音里出现第二个证人的声音。',
        scene_cards: [
          { scene_no: 1, title: '录音来源', reader_payoff: '爽点铺垫缺口被证据来源补上。' },
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
      { chapter_no: 11, title: '录音来源' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补爽点铺垫')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补铺垫：爽点铺垫缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('录音键红点')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('突然拿出一份检测报告')
    expect(prompt).toContain('补铺垫：爽点铺垫缺口 1')
    expect(prompt).toContain('先写录音键红点')
  })

  test('carries intent confirmation sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 25, chapter_no: 25, title: '封条来源' },
      [
        { id: 24, chapter_no: 24, title: '第二枚编号' },
        { id: 25, chapter_no: 25, title: '封条来源' },
      ],
      [
        {
          id: 236,
          chapter_id: 24,
          review_type: 'intent_confirmation_sync',
          created_at: '2026-06-09T09:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 24,
            chapter_no: 24,
            intent_confirmation_sync: {
              status: 'warn',
              label: '意图确认缺口 2',
              summary: '正文有 2 项意图确认缺口。',
              missed_count: 2,
              missed: [
                { label: '代价/收益', text: '林青禾公开得罪会长的代价没有落地。' },
                { label: '章尾承接', text: '第二枚编号没有接到下一章问题。' },
              ],
              next_actions: [
                '下一章必须补意图确认：先让代价收益可见，再把第二枚编号接成章尾追问。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 25,
        title: '封条来源',
        summary: '李玄追问第二枚编号背后的封条来源。',
        conflict: '会长试图把林青禾公开作证的代价转成对她的惩罚。',
        ending_hook: '封条来源指向禁门外的第三个证人。',
        scene_cards: [
          { scene_no: 1, title: '封条来源', reader_payoff: '意图确认缺口被正文补上。' },
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
      { chapter_no: 25, title: '封条来源' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修意图确认')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修意图：意图确认缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('先让代价收益可见')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('章尾承接')
    expect(prompt).toContain('修意图：意图确认缺口 2')
    expect(prompt).toContain('第二枚编号接成章尾追问')
  })

  test('carries nested pre-draft execution receipt misses from prose quality into the next pre-draft brief', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 31, chapter_no: 31, title: '第三枚封条' },
      [
        {
          id: 30,
          chapter_no: 30,
          title: '封条滴血',
          raw_payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                intent_confirmation_checks: [
                  {
                    key: 'emotion_target',
                    label: '情绪目标',
                    delivered: false,
                    evidence: '正文只写了发现封条，没有从压迫转到反制。',
                    remaining_risk: '压迫后的反制情绪没有落到正文。',
                  },
                ],
                benchmark_recall_checks: [
                  {
                    key: 'rhythm_reference',
                    label: '节奏参照',
                    delivered: false,
                    evidence: '没有三轮压问，证据一出现就结束。',
                    remaining_risk: '文风召回里的先压后爆没有执行。',
                  },
                ],
              },
            },
          },
        },
        { id: 31, chapter_no: 31, title: '第三枚封条' },
      ],
      [
        {
          id: 730,
          chapter_id: 30,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 30,
            chapter_no: 30,
            score: 86,
            passed: true,
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                intent_confirmation_checks: [
                  {
                    key: 'emotion_target',
                    label: '情绪目标',
                    delivered: false,
                    evidence: '正文只写了发现封条，没有从压迫转到反制。',
                    remaining_risk: '压迫后的反制情绪没有落到正文。',
                  },
                ],
                benchmark_recall_checks: [
                  {
                    key: 'rhythm_reference',
                    label: '节奏参照',
                    delivered: false,
                    evidence: '没有三轮压问，证据一出现就结束。',
                    remaining_risk: '文风召回里的先压后爆没有执行。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 31,
        title: '第三枚封条',
        summary: '李玄追查第三枚封条的来源。',
        conflict: '会长试图把封条滴血解释成旧规误判。',
        ending_hook: '第三枚封条指向内门供词。',
        scene_cards: [
          { scene_no: 1, title: '第三枚封条', reader_payoff: '写前执行缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:30:00.000Z',
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
      { chapter_no: 31, title: '第三枚封条' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修意图确认')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('意图确认：执行偏移 1')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('文风召回：召回缺口 1')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('压迫后的反制情绪没有落到正文')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('文风召回里的先压后爆没有执行')
    expect(prompt).toContain('压迫后的反制情绪没有落到正文')
    expect(prompt).toContain('文风召回里的先压后爆没有执行')
  })

  test('carries intent confirmation execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 32, chapter_no: 32, title: '反制封条' },
      [
        { id: 31, chapter_no: 31, title: '第三枚封条' },
        { id: 32, chapter_no: 32, title: '反制封条' },
      ],
      [
        {
          id: 731,
          chapter_id: 31,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:31:00.000Z',
          payload: JSON.stringify({
            chapter_id: 31,
            chapter_no: 31,
            self_check: {
              review: {
                intent_confirmation_checks: [
                  {
                    key: 'chapter_goal_drift',
                    label: '章节目标偏移',
                    status: 'fail',
                    intent_field: 'chapter_goal',
                    expected_intent: '本章目标必须让李玄用第三枚封条反制会长。',
                    delivered_evidence: '正文只解释封条来历，没有让李玄形成反制。',
                    blueprint_link: 'chapter_blueprint.core_turn',
                    evidence: '章节目标从反制会长偏成解释设定。',
                    fix: '下一章开篇先让第三枚封条造成会长规则误判，中段让李玄用误判反制。',
                    remaining_risk: '不能继续把第三枚封条写成设定说明。',
                  },
                  {
                    key: 'emotion_target_ok',
                    label: '情绪目标',
                    status: 'pass',
                    intent_field: 'emotion_target',
                    expected_intent: '从压迫转为反制。',
                    delivered_evidence: '已兑现。',
                    blueprint_link: 'chapter_blueprint.emotion',
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
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 32,
        title: '反制封条',
        summary: '李玄用第三枚封条造成会长规则误判。',
        conflict: '会长试图把封条误判解释成旧规误差。',
        ending_hook: '误判结果指向第四枚封条。',
        scene_cards: [
          { scene_no: 1, title: '封条误判', reader_payoff: '意图确认字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:32:00.000Z',
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
      { chapter_no: 32, title: '反制封条' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修意图确认')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('意图确认：执行偏移 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('intent_confirmation_checks.章节目标偏移')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('intent_field=chapter_goal')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('expected_intent=本章目标必须让李玄用第三枚封条反制会长')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('blueprint_link=chapter_blueprint.core_turn')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('情绪目标')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('意图确认')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('intent_field')
    expect(prompt).toContain('intent_confirmation_checks.章节目标偏移')
    expect(prompt).toContain('不能继续把第三枚封条写成设定说明')
  })

  test('carries write-preparation execution receipt misses into the next pre-draft brief', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 32, chapter_no: 32, title: '钥匙回声' },
      [
        {
          id: 31,
          chapter_no: 31,
          title: '第三枚封条',
          raw_payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    key: 'asset_linkage',
                    label: '旧钥匙挂钩',
                    delivered: false,
                    evidence: '正文用了旧钥匙开门，但没有交代旧钥匙和母亲旧铺印记的关系。',
                    remaining_risk: '孤立资产仍未挂到主线证据链。',
                  },
                ],
              },
            },
          },
        },
        { id: 32, chapter_no: 32, title: '钥匙回声' },
      ],
      [
        {
          id: 731,
          chapter_id: 31,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:40:00.000Z',
          payload: JSON.stringify({
            chapter_id: 31,
            chapter_no: 31,
            score: 84,
            passed: true,
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    key: 'asset_linkage',
                    label: '旧钥匙挂钩',
                    delivered: false,
                    evidence: '正文用了旧钥匙开门，但没有交代旧钥匙和母亲旧铺印记的关系。',
                    remaining_risk: '孤立资产仍未挂到主线证据链。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 32,
        title: '钥匙回声',
        summary: '李玄用旧钥匙反查母亲旧铺印记。',
        conflict: '会长试图把旧钥匙解释成伪造证据。',
        ending_hook: '旧钥匙的回声指向旧铺账本。',
        scene_cards: [
          { scene_no: 1, title: '钥匙回声', reader_payoff: '写前准备缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:45:00.000Z',
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
      { chapter_no: 32, title: '钥匙回声' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修写前准备')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('写前准备：执行缺口 1')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('孤立资产仍未挂到主线证据链')
    expect(prompt).toContain('写前准备：执行缺口 1')
    expect(prompt).toContain('旧钥匙和母亲旧铺印记')
  })

  test('carries write preparation execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 33, chapter_no: 33, title: '钥匙归属' },
      [
        { id: 32, chapter_no: 32, title: '钥匙回声' },
        { id: 33, chapter_no: 33, title: '钥匙归属' },
      ],
      [
        {
          id: 733,
          chapter_id: 32,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:45:30.000Z',
          payload: JSON.stringify({
            chapter_id: 32,
            chapter_no: 32,
            self_check: {
              review: {
                write_preparation_checks: [
                  {
                    key: 'asset_risk_old_key',
                    label: '旧钥匙资产风险',
                    status: 'fail',
                    preparation_type: 'asset_risks',
                    expected: '旧钥匙必须和母亲旧铺印记挂钩，并成为主线证据。',
                    delivered_evidence: '正文只让旧钥匙开门，没有说明旧铺印记。',
                    chapter_location: '中段开门场',
                    evidence: '旧钥匙仍像孤立道具。',
                    fix: '下一章中段让旧钥匙回声指向母亲旧铺印记。',
                    remaining_risk: '不能继续把旧钥匙只当开门工具。',
                  },
                  {
                    key: 'blueprint_focus_ok',
                    label: '蓝图焦点',
                    status: 'pass',
                    preparation_type: 'blueprint_focus',
                    expected: '本章必须追查钥匙来源。',
                    delivered_evidence: '已兑现。',
                    chapter_location: '第一场',
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
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 33,
        title: '钥匙归属',
        summary: '李玄把旧钥匙回声和母亲旧铺印记挂钩。',
        conflict: '会长试图把旧钥匙解释成普通钥匙。',
        ending_hook: '旧铺印记背面露出第二把钥匙编号。',
        scene_cards: [
          { scene_no: 1, title: '钥匙归属', reader_payoff: '写前准备字段被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:46:00.000Z',
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
      { chapter_no: 33, title: '钥匙归属' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修写前准备')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('写前准备：执行缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('write_preparation_checks.旧钥匙资产风险')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('preparation_type=asset_risks')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('母亲旧铺印记')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('chapter_location=中段开门场')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('蓝图焦点')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('写前准备')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('asset_risks')
    expect(prompt).toContain('write_preparation_checks.旧钥匙资产风险')
    expect(prompt).toContain('不能继续把旧钥匙只当开门工具')
  })

  test('carries creation contract execution misses as priority work into the next pre-draft brief', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 33, chapter_no: 33, title: '第二条规则' },
      [
        {
          id: 32,
          chapter_no: 32,
          title: '钥匙回声',
          raw_payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    key: 'creation_contract_checklist_target_reader',
                    label: '创作契约：目标读者',
                    delivered: false,
                    evidence: '正文只写旧钥匙开门，没有给规则破解读者可感知的反制回报。',
                    remaining_risk: '目标读者想看的规则破解爽点没有落成正文证据。',
                  },
                ],
              },
            },
          },
        },
        { id: 33, chapter_no: 33, title: '第二条规则' },
      ],
      [
        {
          id: 732,
          chapter_id: 32,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:46:00.000Z',
          payload: JSON.stringify({
            chapter_id: 32,
            chapter_no: 32,
            score: 86,
            passed: true,
            self_check: {
              review: {
                write_preparation_checks: [
                  {
                    key: 'creation_contract_checklist_target_reader',
                    label: '创作契约：目标读者',
                    status: 'warn',
                    evidence: '正文只写旧钥匙开门，没有给规则破解读者可感知的反制回报。',
                    fix: '下一章补出规则破解爽点：让旧钥匙触发规则判定、代价和反制结果。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 33,
        title: '第二条规则',
        summary: '李玄用旧钥匙反推第二条规则。',
        conflict: '会长试图把反制结果解释成偶然。',
        ending_hook: '旧钥匙浮出第二个旧铺印记。',
        scene_cards: [
          { scene_no: 1, title: '第二条规则', reader_payoff: '规则破解爽点被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:47:00.000Z',
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
      { chapter_no: 33, title: '第二条规则' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('创作契约：执行缺口 1')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('规则破解爽点')
    expect(prompt).toContain('创作契约：执行缺口 1')
    expect(prompt).toContain('规则破解读者可感知的反制回报')
  })

  test('turns creation contract carry-over into staged repair actions for the next chapter', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 34, chapter_no: 34, title: '第三条规则' },
      [
        {
          id: 33,
          chapter_no: 33,
          title: '第二条规则',
          raw_payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    key: 'creation_contract_checklist_reader_retention',
                    label: '创作契约：追读留存',
                    delivered: false,
                    evidence: '章末只解释第二条规则，没有把规则破解后的新威胁挂到下一章。',
                    remaining_risk: '追读留存契约没有落成章末新问题和下一章行动压力。',
                  },
                ],
              },
            },
          },
        },
        { id: 34, chapter_no: 34, title: '第三条规则' },
      ],
      [
        {
          id: 733,
          chapter_id: 33,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:48:00.000Z',
          payload: JSON.stringify({
            chapter_id: 33,
            chapter_no: 33,
            self_check: {
              review: {
                write_preparation_checks: [
                  {
                    key: 'creation_contract_checklist_reader_retention',
                    label: '创作契约：追读留存',
                    status: 'warn',
                    evidence: '章末只解释第二条规则，没有把规则破解后的新威胁挂到下一章。',
                    fix: '下一章开篇先承接第二条规则的后果，中段让第三条规则制造反制代价，章尾抛出更高一级的新问题。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 34,
        title: '第三条规则',
        summary: '李玄追查第三条规则的代价。',
        conflict: '第三条规则要求他在救人和保留证据之间做选择。',
        ending_hook: '第三条规则背后浮出旧铺真正主人。',
        scene_cards: [
          { scene_no: 1, title: '第三条规则', reader_payoff: '追读留存缺口被转成新威胁。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:49:00.000Z',
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
      { chapter_no: 34, title: '第三条规则' },
    )

    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('创作契约')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('创作契约')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('创作契约')
    expect(prompt).toContain('下一章开篇先承接第二条规则的后果')
    expect(prompt).toContain('章尾抛出更高一级的新问题')
  })

  test('prioritizes creation contract misses over ordinary delivery risks', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 35, chapter_no: 35, title: '第四条规则' },
      [
        {
          id: 34,
          chapter_no: 34,
          title: '第三条规则',
          raw_payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    key: 'creation_contract_checklist_core_promise',
                    label: '创作契约：核心承诺',
                    delivered: false,
                    evidence: '正文写了规则解释，但没有兑现主角用规则反杀的核心承诺。',
                    remaining_risk: '核心承诺没有落成读者可感知的规则反杀证据。',
                  },
                ],
              },
            },
          },
        },
        { id: 35, chapter_no: 35, title: '第四条规则' },
      ],
      [
        {
          id: 734,
          chapter_id: 34,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-10T08:50:00.000Z',
          payload: JSON.stringify({
            chapter_id: 34,
            chapter_no: 34,
            chapter_core_drift: {
              status: 'warn',
              label: '核心偏移',
              risk_count: 1,
              issues: [{ label: '核心偏移', issue: '章末只总结规则，没有留下新的追查目标。' }],
            },
          }),
        },
        {
          id: 735,
          chapter_id: 34,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:51:00.000Z',
          payload: JSON.stringify({
            chapter_id: 34,
            chapter_no: 34,
            self_check: {
              review: {
                write_preparation_checks: [
                  {
                    key: 'creation_contract_checklist_core_promise',
                    label: '创作契约：核心承诺',
                    status: 'warn',
                    evidence: '正文写了规则解释，但没有兑现主角用规则反杀的核心承诺。',
                    fix: '下一章必须先用第四条规则写出主角主动设局、触发规则、反制对手的正文证据。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(deliveryRiskCarryOver?.items[0]).toContain('创作契约：执行缺口 1')
    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('守核心：核心偏移')
    expect(deliveryRiskCarryOver?.required_actions.join('｜')).toContain('规则反杀')
  })

  test('treats target reader and genre positioning misses as creation contract carry-over', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 36, chapter_no: 36, title: '第五条规则' },
      [
        { id: 35, chapter_no: 35, title: '第四条规则' },
        { id: 36, chapter_no: 36, title: '第五条规则' },
      ],
      [
        {
          id: 736,
          chapter_id: 35,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:52:00.000Z',
          payload: JSON.stringify({
            chapter_id: 35,
            chapter_no: 35,
            self_check: {
              review: {
                target_reader_checks: [
                  {
                    key: 'reader_desire_visible_payoff',
                    label: '目标读者：规则破解爽点',
                    status: 'warn',
                    evidence: '正文让主角解释规则，但没有给读者看到规则破解后的反制快感。',
                    fix: '下一章必须把目标读者想看的规则破解爽点写成主角主动验证、触发规则、反制对手的现场证据。',
                  },
                ],
                genre_positioning_checks: [
                  {
                    key: 'genre_formula_anchor',
                    label: '题材定位：规则怪谈公式',
                    status: 'fail',
                    evidence: '本章规则只像背景设定，没有形成规则压力、试探代价和破局公式。',
                    fix: '下一章必须用规则压力、试探代价、破局公式三步拉回规则怪谈题材长板。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '禁门账本', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 36,
        title: '第五条规则',
        summary: '李玄用第五条规则反查旧铺主人。',
        conflict: '旧铺主人试图让规则反噬李玄。',
        ending_hook: '第五条规则指向母亲旧案真正证人。',
        scene_cards: [
          { scene_no: 1, title: '第五条规则', reader_payoff: '目标读者和题材定位缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:53:00.000Z',
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
      { chapter_no: 36, title: '第五条规则' },
    )

    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('创作契约：目标读者缺口 1')
    expect(deliveryRiskCarryOver?.items.join('｜')).toContain('创作契约：题材定位缺口 1')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('创作契约')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('规则压力、试探代价、破局公式')
    expect(prompt).toContain('规则破解后的反制快感')
    expect(prompt).toContain('规则压力、试探代价、破局公式')
  })

  test('carries prose self-review chapter handoff misses into the next pre-draft brief', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 34, chapter_no: 34, title: '水痕名单' },
      [
        { id: 33, chapter_no: 33, title: '门外水痕' },
        { id: 34, chapter_no: 34, title: '水痕名单' },
      ],
      [
        {
          id: 733,
          chapter_id: 33,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:50:00.000Z',
          payload: JSON.stringify({
            chapter_id: 33,
            chapter_no: 33,
            score: 86,
            passed: true,
            self_check: {
              review: {
                chapter_handoff_checks: [
                  {
                    key: 'opening_obligation',
                    label: '开篇义务',
                    status: 'warn',
                    evidence: '前300字直接切到新场景，没有接住上一章玻璃门水痕。',
                    fix: '下一章开篇先回到玻璃门前确认水痕名单，再推进新线索。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '午夜校规', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 34,
        title: '水痕名单',
        summary: '李辰回到玻璃门前核对水痕名单。',
        conflict: '宿舍规则阻止他公开查名单。',
        ending_hook: '名单末尾出现主角自己的名字。',
        scene_cards: [
          { scene_no: 1, title: '核对水痕', reader_payoff: '章首承接缺口被正文补上。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:55:00.000Z',
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
      { chapter_no: 34, title: '水痕名单' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修章首承接')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('章首承接：承接缺口 1')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('前300字直接切到新场景')
    expect(prompt).toContain('章首承接：承接缺口 1')
    expect(prompt).toContain('玻璃门前确认水痕名单')
  })

  test('carries prose review chapter handoff execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 35, chapter_no: 35, title: '旧广播室' },
      [
        { id: 34, chapter_no: 34, title: '水痕名单' },
        { id: 35, chapter_no: 35, title: '旧广播室' },
      ],
      [
        {
          id: 734,
          chapter_id: 34,
          review_type: 'prose_quality',
          created_at: '2026-06-10T08:56:00.000Z',
          payload: JSON.stringify({
            chapter_id: 34,
            chapter_no: 34,
            self_check: {
              review: {
                chapter_handoff_checks: [
                  {
                    key: 'previous_handoff_unresolved',
                    label: '上一章承接',
                    status: 'fail',
                    previous_handoff: '名单末尾出现主角自己的名字。',
                    opening_obligation: '下一章前300字必须让主角先核对名单水痕和自己的名字。',
                    opening_evidence: '正文开篇直接跳到旧广播室，没有回看水痕名单。',
                    location: '前300字',
                    continuity_action: '先让主角用湿鞋印反查名单来源，再进入旧广播室。',
                    evidence: '上一章章末钩子沉没。',
                    fix: '下一章第一场先处理名单末尾自己的名字，再推进广播室。',
                    remaining_risk: '不能把名单钩子留到中段旁白解释。',
                  },
                  {
                    key: 'handoff_ok',
                    label: '章末交接',
                    status: 'pass',
                    previous_handoff: '已承接湿鞋印。',
                    opening_obligation: '已完成。',
                    opening_evidence: '已兑现。',
                    location: '前300字',
                    continuity_action: '已落地。',
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
    const project = { title: '午夜校规', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 35,
        title: '旧广播室',
        summary: '李辰带着水痕名单追到旧广播室。',
        conflict: '广播室门禁要求他先证明名单来源。',
        ending_hook: '广播里念出名单第二个名字。',
        scene_cards: [
          { scene_no: 1, title: '名单回看', conflict: '水痕名单逼主角先核对自己的名字。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T09:00:00.000Z',
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
      { chapter_no: 35, title: '旧广播室' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修章首承接')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('章首承接：承接缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('chapter_handoff_checks.上一章承接')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('名单末尾出现主角自己的名字')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('先让主角用湿鞋印反查名单来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('已承接湿鞋印')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('前300字')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('水痕名单')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('continuity_action')
    expect(prompt).toContain('chapter_handoff_checks.上一章承接')
    expect(prompt).toContain('不能把名单钩子留到中段旁白解释')
  })

  test('carries continuity heat sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 27, chapter_no: 27, title: '值夜室' },
      [
        { id: 26, chapter_no: 26, title: '门外水声' },
        { id: 27, chapter_no: 27, title: '值夜室' },
      ],
      [
        {
          id: 237,
          chapter_id: 26,
          review_type: 'continuity_heat_sync',
          created_at: '2026-06-09T09:25:00.000Z',
          payload: JSON.stringify({
            chapter_id: 26,
            chapter_no: 26,
            continuity_heat_sync: {
              status: 'warn',
              label: '连续性热度缺口 2',
              summary: '正文有 2 项连续性热度缺口。',
              missed_count: 2,
              missed: [
                { label: '活跃期待', text: '门外水声没有继续施压，也没有转成值夜室行动。' },
                { label: '休眠边界', text: '夜巡司令牌被突然激活解决门外水声。' },
              ],
              next_actions: [
                '下一章必须补连续性热度：让门外水声逼出值夜室行动，并解释夜巡司令牌为什么不能解决当前危机。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '午夜校规', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 27,
        title: '值夜室',
        summary: '李辰进入值夜室追查门外水声来源。',
        conflict: '夜巡司令牌不能使用，值夜室门禁只认湿鞋印。',
        ending_hook: '镜中脚印和水声指向同一个失踪学生。',
        scene_cards: [
          { scene_no: 1, title: '值夜室', reader_payoff: '连续性热度缺口被正文补上。' },
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
      { chapter_no: 27, title: '值夜室' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补连续性热度')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补热度：连续性热度缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('门外水声逼出值夜室行动')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('休眠边界')
    expect(prompt).toContain('补热度：连续性热度缺口 2')
    expect(prompt).toContain('夜巡司令牌为什么不能解决当前危机')
  })

  test('carries conflict structure sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 29, chapter_no: 29, title: '医院设备' },
      [
        { id: 28, chapter_no: 28, title: '设备间门口' },
        { id: 29, chapter_no: 29, title: '医院设备' },
      ],
      [
        {
          id: 238,
          chapter_id: 28,
          review_type: 'conflict_structure_sync',
          created_at: '2026-06-09T09:30:00.000Z',
          payload: JSON.stringify({
            chapter_id: 28,
            chapter_no: 28,
            conflict_structure_sync: {
              status: 'warn',
              label: '冲突结构缺口 2',
              summary: '正文有 2 项冲突结构缺口。',
              missed_count: 2,
              missed: [
                { label: '冲突阶梯', text: '协会成员没有从言语升级到行动阻碍。' },
                { label: '胜负变化', text: '客户资格从拒绝到认可没有落地。' },
              ],
              next_actions: [
                '下一章必须补冲突结构：先让协会会长真实阻止主角进入医院设备间，再写清客户资格胜负变化。',
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
        chapter_no: 29,
        title: '医院设备',
        summary: '主角进入医院设备间核验第二份封单。',
        conflict: '协会会长亲自封锁设备间，要求客户撤回授权。',
        ending_hook: '医院设备错误码指向协会内部账本。',
        scene_cards: [
          { scene_no: 1, title: '医院设备', reader_payoff: '冲突结构缺口被正文补上。' },
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
      { chapter_no: 29, title: '医院设备' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补冲突结构')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补冲突：冲突结构缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('协会会长真实阻止主角')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('胜负变化')
    expect(prompt).toContain('补冲突：冲突结构缺口 2')
    expect(prompt).toContain('客户资格胜负变化')
  })

  test('carries upgrade rhythm sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 31, chapter_no: 31, title: '医院红色警报' },
      [
        { id: 30, chapter_no: 30, title: '隐藏工具箱' },
        { id: 31, chapter_no: 31, title: '医院红色警报' },
      ],
      [
        {
          id: 239,
          chapter_id: 30,
          review_type: 'upgrade_rhythm_sync',
          created_at: '2026-06-09T09:35:00.000Z',
          payload: JSON.stringify({
            chapter_id: 30,
            chapter_no: 30,
            upgrade_rhythm_sync: {
              status: 'warn',
              label: '升级节奏缺口 2',
              summary: '正文有 2 项升级节奏缺口。',
              missed_count: 2,
              missed: [
                { label: '反馈闭环', text: '系统解锁隐藏工具箱后没有展示以前做不到的事。' },
                { label: '桥段节奏', text: '升级后没有接到医院设备这个更高门槛。' },
              ],
              next_actions: [
                '下一章必须补升级节奏：先展示隐藏工具箱能识别红色警报，再把医院设备写成更高门槛。',
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
        chapter_no: 31,
        title: '医院红色警报',
        summary: '主角用隐藏工具箱识别医院设备红色警报。',
        conflict: '医院设备故障等级高于旧城设备间，工具箱只能识别不能直接修复。',
        ending_hook: '红色警报背后出现协会内部账本编号。',
        scene_cards: [
          { scene_no: 1, title: '红色警报', reader_payoff: '升级节奏缺口被正文补上。' },
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
      { chapter_no: 31, title: '医院红色警报' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补升级节奏')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补升级：升级节奏缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('隐藏工具箱能识别红色警报')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('桥段节奏')
    expect(prompt).toContain('补升级：升级节奏缺口 2')
    expect(prompt).toContain('医院设备写成更高门槛')
  })

  test('carries target reader sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 32, chapter_no: 32, title: '水声后的账本' },
      [
        { id: 31, chapter_no: 31, title: '旧钥匙缺口' },
        { id: 32, chapter_no: 32, title: '水声后的账本' },
      ],
      [
        {
          id: 240,
          chapter_id: 31,
          review_type: 'target_reader_sync',
          created_at: '2026-06-09T09:45:00.000Z',
          payload: JSON.stringify({
            chapter_id: 31,
            chapter_no: 31,
            target_reader_sync: {
              status: 'warn',
              label: '目标读者缺口 2',
              summary: '正文有 2 项目标读者缺口。',
              missed_count: 2,
              missed: [
                { label: '读者欲望', text: '规则反制爽点没有落成正文事件。' },
                { label: '本章吸引点', text: '旧钥匙缺口没有给出可感知回报。' },
              ],
              next_actions: [
                '下一章必须补目标读者：把规则反制写成现场行动，并让旧钥匙缺口给出可感知回报。',
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
        chapter_no: 32,
        title: '水声后的账本',
        summary: '主角顺着旧钥匙缺口和门外水声找到协会账本。',
        conflict: '协会会长试图用规则阻断主角继续核验。',
        ending_hook: '账本编号指向医院设备。',
        scene_cards: [
          { scene_no: 1, title: '规则反制', reader_payoff: '目标读者缺口被正文补上。' },
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
      { chapter_no: 32, title: '水声后的账本' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补目标读者')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补读者：目标读者缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('规则反制写成现场行动')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('读者欲望')
    expect(prompt).toContain('补读者：目标读者缺口 2')
    expect(prompt).toContain('旧钥匙缺口给出可感知回报')
  })

  test('carries genre positioning sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 33, chapter_no: 33, title: '医院设备新门槛' },
      [
        { id: 32, chapter_no: 32, title: '报废设备订单' },
        { id: 33, chapter_no: 33, title: '医院设备新门槛' },
      ],
      [
        {
          id: 241,
          chapter_id: 32,
          review_type: 'genre_positioning_sync',
          created_at: '2026-06-09T09:55:00.000Z',
          payload: JSON.stringify({
            chapter_id: 32,
            chapter_no: 32,
            genre_positioning_sync: {
              status: 'warn',
              label: '题材定位缺口 2',
              summary: '正文有 2 项题材定位缺口。',
              missed_count: 2,
              missed: [
                { label: '核心梗', text: '旧城设备师用隐藏工具箱修报废设备的核心梗没有落成正文场景。' },
                { label: '金手指贴合', text: '金手指变成血脉神通，脱离维修职业和设备订单。' },
              ],
              next_actions: [
                '下一章必须补题材定位：回到都市系统逆袭，把隐藏工具箱贴回维修职业，并用医院设备订单兑现强回报。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '旧城设备师', genre: '都市系统逆袭', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 33,
        title: '医院设备新门槛',
        summary: '主角用隐藏工具箱处理医院设备订单。',
        conflict: '医院设备故障超过旧城区订单难度，协会会长继续压制授权。',
        ending_hook: '医院设备编号牵出协会账本。',
        scene_cards: [
          { scene_no: 1, title: '医院设备订单', reader_payoff: '题材定位缺口被正文补上。' },
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
      { chapter_no: 33, title: '医院设备新门槛' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补题材定位')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补题材：题材定位缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('隐藏工具箱贴回维修职业')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('核心梗')
    expect(prompt).toContain('补题材：题材定位缺口 2')
    expect(prompt).toContain('医院设备订单兑现强回报')
  })

  test('carries female audience sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 35, chapter_no: 35, title: '她亲自签字' },
      [
        { id: 34, chapter_no: 34, title: '她自己的合同' },
        { id: 35, chapter_no: 35, title: '她亲自签字' },
      ],
      [
        {
          id: 242,
          chapter_id: 34,
          review_type: 'female_audience_sync',
          created_at: '2026-06-09T10:05:00.000Z',
          payload: JSON.stringify({
            chapter_id: 34,
            chapter_no: 34,
            female_audience_sync: {
              status: 'warn',
              label: '女频长篇缺口 2',
              summary: '正文有 2 项女频长篇缺口。',
              missed_count: 2,
              missed: [
                { label: '核心原则', text: '女主缺安全感锚点，关键选择由男主安排。' },
                { label: '虐戏剂量', text: '连续只虐，没有反转或糖。' },
              ],
              next_actions: [
                '下一章必须补女频长篇：让女主亲自做决定、亲自签字，并在受委屈后立刻给反转或糖。',
              ],
            },
          }),
        },
      ],
    )
    const project = { title: '春风不误', genre: '番茄女生现言', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 35,
        title: '她亲自签字',
        summary: '女主拿回合同主动权，亲自签下新条款。',
        conflict: '合作方试图让男主代签，女主拒绝并重谈边界。',
        ending_hook: '新条款背后出现母亲旧案线索。',
        scene_cards: [
          { scene_no: 1, title: '亲自签字', reader_payoff: '女频长篇缺口被正文补上。' },
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
      { chapter_no: 35, title: '她亲自签字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补女频长篇')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补女频：女频长篇缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('女主亲自做决定')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('核心原则')
    expect(prompt).toContain('补女频：女频长篇缺口 2')
    expect(prompt).toContain('受委屈后立刻给反转或糖')
  })

  test('carries plot dynamics sync misses into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 37, chapter_no: 37, title: '账本编号' },
      [
        { id: 36, chapter_no: 36, title: '红色阀门' },
        { id: 37, chapter_no: 37, title: '账本编号' },
      ],
      [
        {
          id: 243,
          chapter_id: 36,
          review_type: 'plot_dynamics_sync',
          created_at: '2026-06-09T10:15:00.000Z',
          payload: JSON.stringify({
            chapter_id: 36,
            chapter_no: 36,
            plot_dynamics_sync: {
              status: 'warn',
              label: '剧情动力缺口 2',
              summary: '正文有 2 项剧情动力缺口。',
              missed_count: 2,
              missed: [
                { label: '剧情闭环', text: '红色阀门没有形成目标、阻碍、行动、代价/反馈、新期待闭环。' },
                { label: '高潮公式', text: '缺少假胜、崩解和交叉死磕，高潮直接顺滑结束。' },
              ],
              next_actions: [
                '下一章必须补剧情动力：先给账本编号目标和协会阻碍，再写主角行动、代价反馈和新的章末期待。',
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
        chapter_no: 37,
        title: '账本编号',
        summary: '主角追查红色阀门编号背后的协会账本。',
        conflict: '协会会长用医院停机责任逼客户撤回授权。',
        ending_hook: '账本编号对应前一批报废设备。',
        scene_cards: [
          { scene_no: 1, title: '账本编号', reader_payoff: '剧情动力缺口被正文补上。' },
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
      { chapter_no: 37, title: '账本编号' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先补剧情动力')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补动力：剧情动力缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('账本编号目标和协会阻碍')
    expect(brief.delivery_risk_carry_over.evidence.join('｜')).toContain('剧情闭环')
    expect(prompt).toContain('补动力：剧情动力缺口 2')
    expect(prompt).toContain('主角行动、代价反馈和新的章末期待')
  })

})

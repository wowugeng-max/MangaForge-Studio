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

describe('chapter pre-draft brief pipeline', () => {
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

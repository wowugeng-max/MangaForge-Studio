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

describe('chapter pre-draft brief sync-receipts b 2 b', () => {
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

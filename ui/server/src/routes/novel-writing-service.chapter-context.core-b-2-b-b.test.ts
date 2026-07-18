import '../novel-writing-service/quality/review-merge.unit.test'
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

function proseQualityRisksSource() {
  const dir = join(import.meta.dir, '../novel-writing-service/quality')
  return [
    'prose-quality-risks.ts',
    'prose-quality-risks-extended.ts',
    'prose-quality-risks-extended-core.ts',
    'prose-quality-risks-extended-handoff.ts',
    'prose-quality-risks-extended-audience.ts',
    'prose-quality-risks-audience.ts',
    'prose-quality-risks-audience-core.ts',
    'prose-quality-risks-audience-hooks.ts',
    'prose-quality-risks-audience-craft.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}
const createProsePipelineHarness = (options?: any) => createProsePipelineHarnessWithService(createNovelWritingService, options)
const readSceneCardsPromptSource = () => readFileSync(join(import.meta.dir, '../novel-writing/scene-cards-prompt.ts'), 'utf8')
const readPostDeliveryStoryStateUpdateSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-story-state-update.ts'), 'utf8')
const readChapterProseStoragePatchSource = () => readFileSync(join(import.meta.dir, '../novel-writing/chapter-prose-storage-patch.ts'), 'utf8')
const readPostDeliverySyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-sync-review-record.ts'), 'utf8')
const readDraftSyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/draft-sync-review-record.ts'), 'utf8')

describe('chapter context word target source guards 2 b b', () => {
  test('auto-repairs unattended preflight scene cards and tracking context gaps', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-preflight-repair-scene-cards-'))
    const project = await createNovelProject(workspace, {
      title: '红雾电梯',
      genre: '规则怪谈',
      synopsis: '主角进入红雾规则区，发现旧规则被篡改。',
      reference_config: {},
    })
    await createNovelWorldbuilding(workspace, {
      project_id: project.id,
      world_summary: '红雾规则区会把错误解法放大成封印裂缝。',
      rules: ['规则被篡改后会留下金色符文痕迹。'],
    })
    await createNovelCharacter(workspace, {
      project_id: project.id,
      name: '江哲',
      role_type: '主角',
      current_state: {
        location: '红雾入口',
        knowledge_scope: '知道规则五被篡改，但不知道谁改了规则。',
      },
    })
    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '异常入局',
      chapter_summary: '江哲发现规则五被金色符文篡改。',
      ending_hook: '金色符文说明规则背后有人动手脚。',
      chapter_text: '江哲看见规则五下方的金色符文，随即踏入红雾。',
    })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '旧法失准',
      chapter_goal: '江哲进入红雾后确认旧办法不再可靠。',
      chapter_summary: '江哲进入红雾后确认旧办法不再可靠，并把旧答案反推成新的危险证据。',
      conflict: '暴力硬抗会让封印裂缝扩大。',
      ending_hook: '旧答案指向更危险的证据。',
      scene_list: [{ scene_no: 1, title: '红雾深处' }],
      raw_payload: {
        pre_draft_brief: {
          benchmark_recall_brief: {
            selected_emotion_module: '调动：旧答案失效后的规则压力。',
            rhythm_reference: '蓄势 -> 误判 -> 反证 -> 新钩子。',
            source_paths: [],
          },
          state_tracking_contract: {
            version: 'oh_story_state_tracking_v1',
            source_requirements: [
              '本章细纲/场景卡',
              '上一章正文或上一章承接',
              '追踪/上下文.md',
              '追踪/时间线.md',
            ],
            source_readiness: [
              { key: 'chapter_blueprint', label: '本章细纲/蓝图', status: 'ready', evidence: '江哲进入红雾后确认旧办法不再可靠。' },
              { key: 'previous_chapter', label: '上一章正文/章尾钩子', status: 'ready', evidence: '金色符文说明规则背后有人动手脚。' },
              { key: 'context_tracking', label: '追踪/上下文', status: 'warn', evidence: '', fix: '补齐追踪上下文。' },
              { key: 'timeline_tracking', label: '追踪/时间线', status: 'warn', evidence: '', fix: '补齐追踪/时间线.md。' },
            ],
          },
        },
      },
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      preflight: {
        checks: [
          { key: 'scene_cards', ok: false, severity: 'medium' },
          { key: 'benchmark_recall_source_paths', ok: false, severity: 'medium' },
          { key: 'source_readiness_context_tracking', ok: false, severity: 'medium' },
          { key: 'source_readiness_timeline_tracking', ok: false, severity: 'medium' },
          { key: 'source_readiness_chapter_blueprint', ok: false, severity: 'high' },
          { key: 'source_readiness_scene_card_goal_obstacle_change', ok: false, severity: 'high' },
        ],
        warnings: ['场景卡不足', '追踪上下文缺失', '追踪/时间线缺失', '本章细纲/蓝图缺核心字段'],
      },
      chapter_target: {
        chapter_no: 2,
        title: '旧法失准',
        summary: chapter.chapter_summary,
        conflict: chapter.conflict,
        ending_hook: chapter.ending_hook,
        scene_cards: chapter.scene_list,
      },
      continuity: {
        previous_chapter: {
          chapter_no: 1,
          title: '异常入局',
          ending_hook: '金色符文说明规则背后有人动手脚。',
          ending_excerpt: '江哲看见规则五下方的金色符文，随即踏入红雾。',
        },
      },
      story_state: {
        current_time: '承接第一章章尾之后',
        active_locations: ['红雾入口'],
        recent_state_entries: ['规则五被金色符文篡改；江哲已踏入红雾。'],
        characters: [{ name: '江哲', current_state: { location: '红雾入口', knowledge_scope: '知道规则五被篡改' } }],
      },
    }

    await service.autoRepairChapterPreflightGaps(workspace, project, chapter, contextPackage, undefined)
    const repaired = (await listNovelChapters(workspace, project.id)).find(item => item.id === chapter.id)
    const preDraft = repaired?.raw_payload?.pre_draft_brief || {}
    const sourceReadiness = preDraft.state_tracking_contract?.source_readiness || []
    const contextRow = sourceReadiness.find((item: any) => item.key === 'context_tracking')
    const timelineRow = sourceReadiness.find((item: any) => item.key === 'timeline_tracking')
    const repairedSceneCards = repaired?.scene_list || []

    expect(contextRow?.status).toBe('ready')
    expect(contextRow?.evidence).toContain('最后完成章节')
    expect(timelineRow?.status).toBe('ready')
    expect(repairedSceneCards.length).toBeGreaterThanOrEqual(2)
    expect(repairedSceneCards.length).toBeLessThanOrEqual(6)
    for (const scene of repairedSceneCards) {
      expect(scene.purpose || scene.goal || scene.scene_goal).toBeTruthy()
      expect(scene.conflict || scene.obstacle || scene.rule_pressure).toBeTruthy()
      expect(scene.reader_payoff || scene.turning_point || scene.event_value_change || scene.exit_state || scene.state_changes_expected?.length).toBeTruthy()
    }

    const rebuiltChapters = await listNovelChapters(workspace, project.id)
    const rebuiltChapter = rebuiltChapters.find(item => item.id === chapter.id)
    const rebuiltContext = await service.buildChapterContextPackage(
      workspace,
      project,
      rebuiltChapter,
      rebuiltChapters,
      await listNovelWorldbuilding(workspace, project.id),
      await listNovelCharacters(workspace, project.id),
      await listNovelOutlines(workspace, project.id),
      await listNovelReviews(workspace, project.id),
    )
    const remainingKeys = (rebuiltContext.preflight?.checks || [])
      .filter((item: any) => !item.ok)
      .map((item: any) => item.key)

    expect(remainingKeys).not.toContain('scene_cards')
    expect(remainingKeys).not.toContain('source_readiness_context_tracking')
    expect(remainingKeys).not.toContain('source_readiness_scene_card_goal_obstacle_change')
    expect(rebuiltContext.oh_story_director.stage).toBe('pre_draft')
    expect(rebuiltContext.ohStoryDirector).toBe(rebuiltContext.oh_story_director)
  })
  test('auto-repairs scene card gaps without overflowing on cyclic scene metadata', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-preflight-repair-cyclic-scene-'))
    const project = await createNovelProject(workspace, {
      title: '红雾电梯',
      genre: '规则怪谈',
      synopsis: '主角进入红雾规则区，发现旧规则被篡改。',
      reference_config: {},
    })
    await createNovelWorldbuilding(workspace, {
      project_id: project.id,
      world_summary: '红雾规则区会把错误解法放大成封印裂缝。',
      rules: ['规则被篡改后会留下金色符文痕迹。'],
    })
    await createNovelCharacter(workspace, {
      project_id: project.id,
      name: '江哲',
      role_type: '主角',
      current_state: { location: '红雾入口' },
    })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '旧法失准',
      chapter_goal: '江哲进入红雾后确认旧办法不再可靠。',
      chapter_summary: '江哲进入红雾后确认旧办法不再可靠。',
      conflict: '暴力硬抗会让封印裂缝扩大。',
      ending_hook: '旧答案指向更危险的证据。',
      scene_list: [{ scene_no: 1, title: '红雾深处' }],
    })
    const cyclicScene: any = {
      scene_no: 1,
      title: '红雾深处',
      purpose_tags: ['铺垫'],
      state_changes_expected: [],
    }
    cyclicScene.state_changes_expected.push(cyclicScene)
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    await service.autoRepairChapterPreflightGaps(workspace, project, chapter, {
      preflight: {
        checks: [
          { key: 'source_readiness_chapter_blueprint', ok: false, severity: 'high' },
          { key: 'source_readiness_scene_card_goal_obstacle_change', ok: false, severity: 'high' },
        ],
        warnings: ['场景卡戏剧单元缺口'],
      },
      chapter_target: {
        chapter_no: 2,
        title: '旧法失准',
        summary: chapter.chapter_summary,
        conflict: chapter.conflict,
        ending_hook: chapter.ending_hook,
        scene_cards: [cyclicScene],
      },
      continuity: {
        previous_chapter: {
          chapter_no: 1,
          title: '异常入局',
          ending_hook: '金色符文说明规则背后有人动手脚。',
        },
      },
      story_state: {
        recent_state_entries: ['规则五被金色符文篡改。'],
      },
    }, undefined)

    const repaired = (await listNovelChapters(workspace, project.id)).find(item => item.id === chapter.id)
    expect(repaired?.scene_list?.length).toBeGreaterThanOrEqual(2)
    expect(repaired?.scene_list?.[0]?.state_changes_expected?.join('；') || '').toContain('确认')
    expect(() => JSON.stringify(repaired?.scene_list || [])).not.toThrow()
    expect(() => JSON.stringify(repaired?.raw_payload?.pre_draft_brief || {})).not.toThrow()
  })
  test('feeds unconfirmed unattended pre-draft brief into paragraph prose planning', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '镜城规则', genre: '规则怪谈', reference_config: {} },
      {
        pre_draft_brief: {
          scene_briefs: [
            {
              scene_no: 1,
              title: '倒悬教室',
              opening_hook: '天花板倒悬的课桌忽然点名主角。',
              reader_payoff: '主角用镜面规则反证监考人撒谎。',
              information_gap: '谁改了点名册。',
              ending_hook_seed: '粉笔灰拼出下一间教室的编号。',
            },
          ],
          reader_expectation_debt: {
            must_carry: ['镜面规则欠账必须推进'],
            keep_alive: ['点名册是谁改的要保持存在感'],
          },
          delivery_risk_carry_over: {
            items: ['上一章章末钩子不能空承接'],
            required_actions: ['开篇用倒悬教室直接承接上一章镜面异动'],
          },
          longform_battle_context: {
            status: 'warn',
            risk_items: ['核心规则解释过多，必须转成现场危险'],
          },
          story_unit_context: {
            current_chapter_role: '规则验证章',
            unit_goal: '三章内完成镜面规则第一轮验证。',
            forbidden_advance: ['不得提前揭晓点名册幕后者'],
          },
        },
        chapter_target: {
          chapter_no: 8,
          title: '倒悬教室',
          summary: '主角进入倒悬教室验证镜面规则。',
          conflict: '监考人试图用点名册抹掉主角身份。',
          word_target: { label: '标准章', target: 3000, min: 2600, max: 3400 },
        },
      },
      null,
      { chapter_no: 8, title: '倒悬教室' },
    )
    const planningPrompt = prompt.slice(0, prompt.indexOf('【结构化上下文包】'))

    expect(planningPrompt).toContain('前 300 字必须落地：天花板倒悬的课桌忽然点名主角')
    expect(planningPrompt).toContain('主角用镜面规则反证监考人撒谎')
    expect(planningPrompt).toContain('粉笔灰拼出下一间教室的编号')
    expect(planningPrompt).toContain('镜面规则欠账必须推进')
    expect(planningPrompt).toContain('上一章章末钩子不能空承接')
    expect(planningPrompt).toContain('核心规则解释过多，必须转成现场危险')
    expect(planningPrompt).toContain('规则验证章')
    expect(planningPrompt).toContain('不得提前揭晓点名册幕后者')
  })
  test('builds chapter context from raw camelCase pre-draft briefs for unattended prose planning', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-context-camel-brief-'))
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const chapter = {
      id: 808,
      project_id: 88,
      chapter_no: 8,
      title: '倒悬教室',
      chapter_summary: '主角进入倒悬教室验证镜面规则。',
      conflict: '监考人试图用点名册抹掉主角身份。',
      ending_hook: '粉笔灰拼出下一间教室编号。',
      scene_list: [],
      raw_payload: {
        preDraftBrief: {
          previousHandoff: {
            immediateCarry: ['镜面异动必须在开篇被角色处理'],
          },
          first30RetentionBrief: {
            segmentLabel: '试读十章',
            flags: ['开篇钩子弱'],
            requiredActions: ['前300字给倒悬教室危机'],
          },
          storyUnitContext: {
            currentChapterRole: '规则验证章',
            forbiddenAdvance: ['不得提前揭晓点名册幕后者'],
          },
          recentFatigueBrief: {
            nextActions: ['减少解释，改成现场危险'],
          },
          readerExpectationDebt: {
            mustCarry: ['镜面规则欠账必须推进'],
          },
          deliveryRiskCarryOver: {
            requiredActions: ['上一章章末钩子不能空承接'],
          },
        },
      },
    }

    const context = await service.buildChapterContextPackage(
      workspace,
      { id: 88, title: '镜城规则', genre: '规则怪谈', reference_config: {} },
      chapter,
      [
        {
          id: 807,
          chapter_no: 7,
          title: '镜面异动',
          chapter_text: '镜面忽然倒映出下一间教室。',
          ending_hook: '镜面忽然倒映出下一间教室。',
        },
        chapter,
      ],
      [],
      [],
      [],
      [],
    )

    expect(context.chapter_target.previous_handoff || '').toContain('镜面异动必须在开篇被角色处理')
    expect(context.chapter_target.first30_retention_brief?.required_actions?.join('；') || '').toContain('前300字给倒悬教室危机')
    expect(context.chapter_target.story_unit_context?.current_chapter_role || '').toBe('规则验证章')
    expect(context.chapter_target.recent_fatigue_brief?.next_actions?.join('；') || '').toContain('减少解释，改成现场危险')
    expect(context.chapter_target.reader_expectation_debt_context?.must_carry?.map((item: any) => item.text).join('；') || '').toContain('镜面规则欠账必须推进')
    expect(context.chapter_target.delivery_risk_carry_over?.required_actions?.join('；') || '').toContain('上一章章末钩子不能空承接')
    expect(context.oh_story_director.stage).toBe('pre_draft')
    expect(context.ohStoryDirector).toBe(context.oh_story_director)
    expect(['needs_repair', 'blocked']).toContain(context.oh_story_director.readiness)
    expect(['repair_pre_draft_materials', 'confirm_missing_choice']).toContain(context.oh_story_director.primary_action.key)
    expect(context.oh_story_director.required_repairs.map((item: any) => item.category)).toEqual(
      expect.arrayContaining(['missing_blueprint']),
    )
  })
  test('builds pre-draft director from final context package after override preflight is merged', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-context-director-override-'))
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const chapter = {
      id: 809,
      project_id: 89,
      chapter_no: 9,
      title: '改线确认',
      chapter_summary: '主角发现旧规则可能需要改线确认。',
      conflict: '是否沿用原本主线。',
      ending_hook: '旧档案翻出反向证词。',
      scene_list: [
        {
          title: '档案室',
          goal: '找出旧规则反向证据',
          conflict: '继续主线还是改线',
          turning_point: '反向证词出现',
        },
      ],
      raw_payload: {
        context_package_override: {
          preflight: {
            ready: false,
            strict_ready: false,
            checks: [],
            blockers: [],
            warnings: ['先人工确认主线方向是否改变'],
          },
        },
      },
    }

    const context = await service.buildChapterContextPackage(
      workspace,
      { id: 89, title: '镜城规则', genre: '规则怪谈', reference_config: {} },
      chapter,
      [chapter],
      [{ id: 1, project_id: 89, world_summary: '镜城规则会反向记录证据。', rules: ['镜面证据不可直接改写'] }],
      [{ id: 1, project_id: 89, name: '林镜', role: 'protagonist', goal: '找出镜城源头' }],
      [],
      [],
    )

    expect(context.preflight.warnings).toContain('先人工确认主线方向是否改变')
    expect(context.oh_story_director.stage).toBe('pre_draft')
    expect(context.ohStoryDirector).toBe(context.oh_story_director)
    expect(context.oh_story_director.readiness).toBe('blocked')
    expect(context.oh_story_director.primary_action.key).toBe('confirm_missing_choice')
    expect(context.oh_story_director.required_repairs).toContainEqual(expect.objectContaining({
      category: 'manual_confirmation_required',
    }))
  })
  test('sanitizes stored scene-card diagnostic noise when building chapter context', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-context-stored-scene-noise-'))
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const noisyRisk = '主角必须同时保住身份、线索和身边人的安全。；同步风险开篇承接：前300字先回应 story_drive_sync 的上一章缺口；同步风险中段兑现：按 character_state_delta_sync 的 missed/next_actions 写出可见行动；下一次修订优先补足 reader_fuel_missed。'
    const chapter = {
      id: 810,
      project_id: 90,
      chapter_no: 10,
      title: '镇门危局',
      chapter_summary: '江哲在封锁令压到门前时守住身份和线索。',
      conflict: '镇门封锁会暴露江哲的异常身份。',
      ending_hook: '门外传来第二份封锁令。',
      scene_list: [
        {
          scene_no: 1,
          title: '封锁压门',
          purpose: '封锁令压到江哲门前。',
          conflict: noisyRisk,
          obstacle: noisyRisk,
          opposing_force: noisyRisk,
          no_exit_reason: `否则${noisyRisk}`,
          event_value_change: '确认同步风险开篇承接：前300字先回应 story_loop_sync 的上一章缺口。',
        },
      ],
      raw_payload: {},
    }

    const context = await service.buildChapterContextPackage(
      workspace,
      { id: 90, title: '怪谈世界', genre: '规则怪谈', reference_config: {} },
      chapter,
      [chapter],
      [{ id: 1, project_id: 90, world_summary: '镇门封锁会放大异常身份风险。', rules: ['封锁令必须当场处理'] }],
      [{ id: 1, project_id: 90, name: '江哲', role: 'protagonist', goal: '保住身份并追出封锁源头' }],
      [],
      [],
    )
    const scene = context.chapter_target.scene_cards[0]
    const coreText = [
      scene.conflict,
      scene.obstacle,
      scene.opposing_force,
      scene.no_exit_reason,
      scene.event_value_change,
    ].join('；')

    expect(scene.conflict).toContain('主角必须同时保住身份、线索和身边人的安全')
    expect(coreText).not.toContain('同步风险')
    expect(coreText).not.toContain('_sync')
    expect(coreText).not.toContain('missed')
    expect(coreText).not.toContain('下一次修订')
  })
  test('sanitizes confirmed pre-draft scene briefs before prose context handoff', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-context-confirmed-scene-noise-'))
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const noisyRisk = '江哲必须守住镇门线索。；同步风险中段兑现：按 asset_state_delta_sync 的 missed/next_actions 写出资产变化；下一次修订优先补 chapter_handoff_delta_sync。'
    const chapter = {
      id: 811,
      project_id: 91,
      chapter_no: 11,
      title: '镇门反证',
      chapter_summary: '江哲用镇门线索反证封锁令来源。',
      conflict: '封锁令来源被人伪装。',
      ending_hook: '镇门背后亮起第二枚印记。',
      scene_list: [
        {
          scene_no: 1,
          title: '干净兜底',
          purpose: '保留干净旧场景。',
          conflict: '伪装来源阻止江哲确认真相。',
        },
      ],
      raw_payload: {
        pre_draft_brief: {
          confirmed_at: '2026-07-07T10:00:00.000Z',
          scene_briefs: [
            {
              scene_no: 1,
              title: '反证封锁',
              purpose: '江哲用镇门线索反证封锁令来源。',
              conflict: noisyRisk,
              obstacle: noisyRisk,
              event_value_change: '确认同步风险开篇承接：回应 story_loop_sync。',
            },
          ],
        },
      },
    }

    const context = await service.buildChapterContextPackage(
      workspace,
      { id: 91, title: '怪谈世界', genre: '规则怪谈', reference_config: {} },
      chapter,
      [chapter],
      [{ id: 1, project_id: 91, world_summary: '镇门印记会记录封锁令来源。', rules: ['封锁令来源不可被旁白直接解释'] }],
      [{ id: 1, project_id: 91, name: '江哲', role: 'protagonist', goal: '查出封锁令源头' }],
      [],
      [],
    )
    const scene = context.chapter_target.scene_cards[0]
    const coreText = [scene.conflict, scene.obstacle, scene.event_value_change].join('；')

    expect(scene.conflict).toContain('江哲必须守住镇门线索')
    expect(scene.event_value_change || scene.reader_payoff || scene.turning_point || scene.exit_state).toContain('局势变成下一步必须处理的新状态')
    expect(coreText).not.toContain('同步风险')
    expect(coreText).not.toContain('_sync')
    expect(coreText).not.toContain('missed')
    expect(coreText).not.toContain('下一次修订')
  })
})

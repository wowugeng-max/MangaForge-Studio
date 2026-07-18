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

describe('chapter context word target source guards 2 b a', () => {
  test('auto-repairs unattended chapter blueprint with persisted commercial style and scene briefs', () => {
    const source = ['auto-repair-preflight-methods.ts','auto-repair-preflight-materials.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('character_arc_brief: repairedEmotionAndHookBrief.character_arc_brief')
    expect(repairBlock).toContain('innovation_brief: repairedEmotionAndHookBrief.innovation_brief')
    expect(repairBlock).toContain('signature_scene_brief: repairedEmotionAndHookBrief.signature_scene_brief')
    expect(repairBlock).toContain('meme_strategy: repairedEmotionAndHookBrief.meme_strategy')
    expect(repairBlock).toContain('style_sample_strategy: repairedEmotionAndHookBrief.style_sample_strategy')
    expect(repairBlock).toContain('chapter_benchmark_strategy: repairedEmotionAndHookBrief.chapter_benchmark_strategy')
    expect(repairBlock).toContain('first30_retention_brief: repairedEmotionAndHookBrief.first30_retention_brief')
    expect(repairBlock).toContain('longform_battle_context: repairedEmotionAndHookBrief.longform_battle_context')
    expect(repairBlock).toContain('scene_briefs: repairedEmotionAndHookBrief.scene_briefs')
    expect(repairBlock).toContain('word_budget: repairedEmotionAndHookBrief.word_budget')
    expect(repairBlock).toContain('generated_at: repairedEmotionAndHookBrief.generated_at')
  })
  test('repairs benchmark source paths across aliases without clearing unrepaired gaps', () => {
    const repairedCamelPath = repairBenchmarkRecallSourcePathState({ chapter_no: 2 }, {
      source_paths: [],
      sourcePaths: ['MangaForge/manual/chapter-2/rhythm-reference'],
      gaps: ['source_paths_missing', 'module_rhythm_conflict'],
    }, ['source_paths_missing', 'module_rhythm_conflict'])

    expect(repairedCamelPath.benchmark_recall_brief.source_paths).toEqual(['MangaForge/manual/chapter-2/rhythm-reference'])
    expect(repairedCamelPath.benchmark_recall_gaps).toEqual(['module_rhythm_conflict'])

    const unresolvedPath = repairBenchmarkRecallSourcePathState({ chapter_no: 2 }, {
      source_paths: [],
      sourcePaths: [],
      gaps: ['source_paths_missing'],
    }, ['source_paths_missing', 'module_rhythm_conflict'])

    expect(unresolvedPath.benchmark_recall_brief.source_paths || []).toEqual([])
    expect(unresolvedPath.benchmark_recall_gaps).toContain('source_paths_missing')
    expect(unresolvedPath.benchmark_recall_gaps).toContain('module_rhythm_conflict')
  })
  test('removes only reliable source-path clauses from composite benchmark gaps', () => {
    const repaired = repairBenchmarkRecallSourcePathState({ chapter_no: 2 }, {
      source_paths: ['MangaForge/manual/chapter-2/rhythm-reference'],
      gaps: [
        'Step 2.3 source_paths_missing；module_rhythm_conflict',
        'Step 2.3 source_paths_missing',
        'source_paths_missing module_voice_conflict',
      ],
    })

    expect(repaired.benchmark_recall_brief.gaps).toContain('module_rhythm_conflict')
    expect(repaired.benchmark_recall_gaps).toContain('module_rhythm_conflict')
    expect(repaired.benchmark_recall_brief.gaps).not.toContain('Step 2.3 source_paths_missing')
    expect(repaired.benchmark_recall_gaps).not.toContain('Step 2.3 source_paths_missing')
    expect(repaired.benchmark_recall_brief.gaps).toContain('source_paths_missing module_voice_conflict')
    expect(repaired.benchmark_recall_gaps).toContain('source_paths_missing module_voice_conflict')
  })
  test('merges final repair contracts into the freshest pre-draft payload', () => {
    const latestRawPayload = {
      unrelated_top_level_key: 'keep latest top-level value',
      pre_draft_brief: {
        confirmed_at: '2026-07-11T09:30:00.000Z',
        confirmation_source: 'manual_user_confirmation',
        user_added_key: 'keep latest snake key',
      },
      preDraftBrief: {
        camel_user_added_key: 'keep latest camel key',
      },
    }
    const computedPreDraftBrief = {
      confirmed_at: '2026-07-11T08:00:00.000Z',
      confirmation_source: 'stale_repair_snapshot',
      user_added_key: 'stale value',
      benchmark_recall_brief: { source_paths: ['MangaForge/final/benchmark'], gaps: ['module_rhythm_conflict'] },
      benchmarkRecallBrief: { sourcePaths: ['MangaForge/final/benchmark'], gaps: ['module_rhythm_conflict'] },
      benchmark_recall_gaps: ['module_rhythm_conflict'],
      benchmarkRecallGaps: ['module_rhythm_conflict'],
      state_tracking_contract: { source_readiness: [{ key: 'custom', label: 'custom', status: 'missing' }] },
      stateTrackingContract: { sourceReadiness: [{ key: 'custom', label: 'custom', status: 'missing' }] },
      write_preparation_brief: { readiness_status: 'needs_context', source_gaps: ['custom missing'] },
      writePreparationBrief: { readiness_status: 'needs_context', source_gaps: ['custom missing'] },
    }

    const mergedRawPayload = mergeFinalRepairPreDraftRawPayload(latestRawPayload, computedPreDraftBrief)
    const mergedBrief = mergedRawPayload.pre_draft_brief

    expect(mergedRawPayload.unrelated_top_level_key).toBe('keep latest top-level value')
    expect(mergedBrief.confirmed_at).toBe('2026-07-11T09:30:00.000Z')
    expect(mergedBrief.confirmation_source).toBe('manual_user_confirmation')
    expect(mergedBrief.user_added_key).toBe('keep latest snake key')
    expect(mergedBrief.camel_user_added_key).toBe('keep latest camel key')
    expect(mergedBrief.benchmark_recall_brief).toMatchObject(computedPreDraftBrief.benchmark_recall_brief)
    expect(mergedBrief.benchmarkRecallBrief).toEqual(mergedBrief.benchmark_recall_brief)
    expect(mergedBrief.benchmark_recall_gaps).toEqual(computedPreDraftBrief.benchmark_recall_gaps)
    expect(mergedBrief.benchmarkRecallGaps).toEqual(computedPreDraftBrief.benchmark_recall_gaps)
    expect(mergedBrief.state_tracking_contract).toMatchObject(computedPreDraftBrief.state_tracking_contract)
    expect(mergedBrief.stateTrackingContract).toEqual(mergedBrief.state_tracking_contract)
    expect(mergedBrief.write_preparation_brief).toEqual(computedPreDraftBrief.write_preparation_brief)
    expect(mergedBrief.writePreparationBrief).toEqual(computedPreDraftBrief.write_preparation_brief)
    expect(mergedRawPayload.preDraftBrief).toEqual(mergedBrief)
  })
  test('merges final state tracking with derived dynamic fields and preserved custom policy', () => {
    const storedContract = {
      version: 'oh_story_state_tracking_v1',
      source: 'stored_contract',
      character_states: ['旧角色状态'],
      characterStates: ['旧角色状态 camel'],
      historical_causality: ['旧前史因果'],
      historicalCausality: ['旧前史因果 camel'],
      world_constraints: ['旧世界约束'],
      worldConstraints: ['旧世界约束 camel'],
      filter_rules: [],
      filterRules: ['保留 camel 自定义状态筛选约束'],
      source_requirements: [],
      sourceRequirements: ['保留 camel 自定义来源要求'],
      quality_checks: [],
      qualityChecks: ['保留 camel 自定义质量检查'],
      revision_priorities: [],
      revisionPriorities: ['保留 camel 自定义修订优先级'],
      custom_policy: { mode: 'manual_review' },
      source_readiness: [
        { key: 'chapter_blueprint', label: '本章细纲/蓝图', status: 'missing', evidence: '旧 snake 行' },
        { key: 'serial_story_state', label: '连载故事状态', status: 'ready', evidence: '已过期标准行' },
        { key: 'custom_archive', label: '自定义档案', status: 'ready', evidence: '人工档案已读' },
      ],
      sourceReadiness: [
        { key: 'chapter_blueprint', label: '本章细纲/蓝图', status: 'warn', evidence: '旧 camel 行' },
        { key: 'character_state', label: '角色状态', status: 'missing', evidence: '旧 camel 角色行' },
        { key: 'custom_approval', label: '自定义审批', status: 'missing', evidence: '', fix: '等待人工审批' },
      ],
    }
    const derivedContract = {
      version: 'oh_story_state_tracking_v1',
      source: 'oh_story_embedded_fallback',
      character_states: ['江哲：位置：红雾回廊；认知边界：不知道幕后主使'],
      historical_causality: ['上一章章尾：第二张规则页亮起'],
      world_constraints: ['红雾裂缝规则：暴力破坏会扩大裂缝'],
      source_readiness: [
        { key: 'chapter_blueprint', label: '本章细纲/蓝图', status: 'ready', evidence: '最终蓝图已读取' },
        { key: 'character_state', label: '角色状态', status: 'ready', evidence: '最终角色 DB 已读取' },
        { key: 'world_constraints', label: '世界约束', status: 'ready', evidence: '最终世界观 DB 已读取' },
      ],
      filter_rules: ['派生默认筛选规则'],
    }

    const merged = mergeFinalStateTrackingContract(storedContract, derivedContract)
    const sourceRows = merged.source_readiness || []
    const sourceRowsCamel = merged.sourceReadiness || []

    expect(merged.character_states).toEqual(derivedContract.character_states)
    expect(merged.characterStates).toEqual(derivedContract.character_states)
    expect(merged.historical_causality).toEqual(derivedContract.historical_causality)
    expect(merged.historicalCausality).toEqual(derivedContract.historical_causality)
    expect(merged.world_constraints).toEqual(derivedContract.world_constraints)
    expect(merged.worldConstraints).toEqual(derivedContract.world_constraints)
    expect(sourceRows.find((row: any) => row.key === 'chapter_blueprint')).toEqual(derivedContract.source_readiness[0])
    expect(sourceRows.find((row: any) => row.key === 'character_state')).toEqual(derivedContract.source_readiness[1])
    expect(sourceRows.some((row: any) => row.key === 'serial_story_state')).toBe(false)
    expect(sourceRows.find((row: any) => row.key === 'custom_archive')?.status).toBe('ready')
    expect(sourceRows.find((row: any) => row.key === 'custom_approval')).toMatchObject({ status: 'missing', fix: '等待人工审批' })
    expect(sourceRowsCamel).toEqual(sourceRows)
    expect(merged.filter_rules).toEqual(storedContract.filterRules)
    expect(merged.filterRules).toEqual(storedContract.filterRules)
    expect(merged.source_requirements).toEqual(storedContract.sourceRequirements)
    expect(merged.sourceRequirements).toEqual(storedContract.sourceRequirements)
    expect(merged.quality_checks).toEqual(storedContract.qualityChecks)
    expect(merged.qualityChecks).toEqual(storedContract.qualityChecks)
    expect(merged.revision_priorities).toEqual(storedContract.revisionPriorities)
    expect(merged.revisionPriorities).toEqual(storedContract.revisionPriorities)
    expect(merged.custom_policy).toEqual(storedContract.custom_policy)
  })
  test('normalizes benchmark source path gaps after a character-only repair', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-preflight-final-benchmark-recall-'))
    const project = await createNovelProject(workspace, {
      title: '红雾回廊',
      genre: '规则怪谈',
      synopsis: '主角沿红雾回廊追查被替换的规则。',
      reference_config: {
        story_state: {
          current_time: '紧接第一章章尾',
          active_locations: ['红雾回廊'],
        },
      },
    })
    await createNovelWorldbuilding(workspace, {
      project_id: project.id,
      world_summary: '红雾规则被改写后会留下金色裂纹。',
      rules: ['暴力破坏规则载体会扩大红雾裂缝。'],
    })
    await createNovelSettingEntity(workspace, {
      project_id: project.id,
      entity_type: 'rule',
      name: '红雾裂缝规则',
      summary: '暴力破坏规则载体会扩大红雾裂缝。',
      constraints_json: { trigger: '暴力破坏规则载体', cost: '红雾裂缝扩大' },
      state_json: {},
      payload_json: {},
    } as any)
    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '规则换页',
      chapter_summary: '金色裂纹证明规则页被人替换。',
      ending_hook: '回廊尽头出现第二张规则页。',
      chapter_text: '金色裂纹沿规则页一路延伸，回廊尽头随即亮起第二张规则页。',
    })
    const benchmarkBrief = {
      selected_emotion_module: 'snake canonical 情绪模块',
      rhythm_reference: '蓄势 -> 误判 -> 反证 -> 新钩子。',
      source_paths: [],
      sourcePaths: [],
      gaps: ['source_paths_missing', 'module_rhythm_conflict'],
      recall_gaps: ['来源路径缺失', 'module_rhythm_conflict'],
      recallGaps: ['source_paths_missing', 'module_rhythm_conflict'],
    }
    const preDraftBrief = {
      confirmed_at: '2026-07-11T00:00:00.000Z',
      confirmation_source: 'test_fixture',
      benchmark_recall_brief: benchmarkBrief,
      benchmarkRecallBrief: {
        ...benchmarkBrief,
        source_paths: [],
        sourcePaths: [],
      },
      benchmark_recall_gaps: ['source_paths_missing', 'module_rhythm_conflict'],
      benchmarkRecallGaps: ['来源路径缺失', 'module_rhythm_conflict'],
      state_tracking_contract: {
        filter_rules: ['snake 状态筛选策略'],
        source_requirements: [],
        source_readiness: [
          { key: 'custom_snake_archive', label: 'snake 自定义档案', status: 'ready', evidence: 'snake 档案已读' },
        ],
      },
      stateTrackingContract: {
        filterRules: ['camel 状态筛选策略'],
        sourceRequirements: ['camel 自定义来源要求'],
        qualityChecks: ['camel 自定义质量检查'],
        revisionPriorities: ['camel 自定义修订优先级'],
        sourceReadiness: [
          { key: 'custom_camel_approval', label: 'camel 自定义审批', status: 'missing', evidence: '', fix: '等待 camel 审批' },
        ],
      },
      writePreparationBrief: {
        readinessStatus: 'needs_context',
        sourceGaps: ['stale_camel_write_preparation_gap'],
      },
      chapter_blueprint: {
        target_emotion: '压迫 -> 试探 -> 反证',
        opening_hook: '第二张规则页在主角面前自行翻开。',
        core_payoff: '主角从金色裂纹确认规则被替换。',
        content_outline: {
          cause: '主角追到回廊尽头。',
          development: '第二张规则页给出冲突答案。',
          turn: '金色裂纹证明答案同样被改写。',
          climax: '主角反推替换规则的时间。',
          ending: '裂纹指向回廊深处。',
        },
        ending_contract: {
          final_state: '主角放弃照搬旧答案。',
          unresolved_question: '谁替换了第二张规则页？',
          next_chapter_pull: '裂纹指向回廊深处。',
        },
      },
    }
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '第二张规则页',
      chapter_goal: '确认第二张规则页同样被替换。',
      chapter_summary: '主角沿金色裂纹确认第二张规则页同样被替换。',
      conflict: '照搬旧答案会让红雾裂缝扩大。',
      ending_hook: '裂纹指向回廊深处。',
      scene_list: [
        {
          scene_no: 1,
          title: '回廊尽头',
          purpose: '验证第二张规则页。',
          conflict: '旧答案会扩大红雾裂缝。',
          reader_payoff: '确认规则页被替换。',
          ending_hook: '裂纹指向回廊深处。',
        },
      ],
      raw_payload: {
        pre_draft_brief: preDraftBrief,
        preDraftBrief: {
          ...preDraftBrief,
          benchmark_recall_brief: {
            selected_emotion_module: 'camel outer 情绪模块不得覆盖 canonical snake',
            sourcePaths: ['MangaForge/manual/chapter-2/rhythm-reference'],
            gaps: ['source_paths_missing', 'camel_outer_extension_gap'],
            camel_outer_extension: { mode: 'preserve_me' },
          },
          benchmark_recall_gaps: ['来源路径缺失', 'module_rhythm_conflict'],
          benchmarkRecallGaps: ['source_paths_missing', 'module_rhythm_conflict'],
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
        checks: [{ key: 'characters', ok: false, severity: 'high' }],
        warnings: ['角色材料不足'],
      },
      chapter_target: {
        chapter_no: 2,
        title: chapter.title,
        summary: chapter.chapter_summary,
        conflict: chapter.conflict,
        ending_hook: chapter.ending_hook,
        scene_cards: chapter.scene_list,
      },
    }

    const result = await service.autoRepairChapterPreflightGaps(workspace, project, chapter, contextPackage, undefined)
    const repairedChapter = (await listNovelChapters(workspace, project.id)).find(item => item.id === chapter.id)

    expect(result.repaired.map((item: any) => item.type)).toContain('character_created')
    expect(result.repaired.map((item: any) => item.type)).not.toContain('chapter_blueprint_updated')
    for (const storedBrief of [repairedChapter?.raw_payload?.pre_draft_brief, repairedChapter?.raw_payload?.preDraftBrief]) {
      expect(storedBrief?.benchmark_recall_brief?.source_paths).toEqual(['MangaForge/manual/chapter-2/rhythm-reference'])
      expect(storedBrief?.benchmark_recall_brief?.selected_emotion_module).toBe('snake canonical 情绪模块')
      expect(storedBrief?.benchmark_recall_brief?.camel_outer_extension).toEqual({ mode: 'preserve_me' })
      expect(storedBrief?.benchmark_recall_brief?.gaps).toEqual(expect.arrayContaining(['module_rhythm_conflict', 'camel_outer_extension_gap']))
      expect(storedBrief?.benchmarkRecallBrief).toEqual(storedBrief?.benchmark_recall_brief)
      expect(storedBrief?.benchmark_recall_gaps).toEqual(expect.arrayContaining(['module_rhythm_conflict', 'camel_outer_extension_gap']))
      expect(storedBrief?.benchmarkRecallGaps).toEqual(storedBrief?.benchmark_recall_gaps)
      expect(storedBrief?.write_preparation_brief?.source_gaps.join('｜')).not.toMatch(/source_paths_missing|来源路径.*缺/)
      expect(storedBrief?.write_preparation_brief?.source_gaps.join('｜')).toContain('module_rhythm_conflict')
      expect(storedBrief?.write_preparation_brief?.source_gaps.join('｜')).toContain('camel_outer_extension_gap')
      const stateTracking = storedBrief?.state_tracking_contract
      expect(stateTracking?.source_readiness.find((row: any) => row.key === 'custom_snake_archive')?.status).toBe('ready')
      expect(stateTracking?.source_readiness.find((row: any) => row.key === 'custom_camel_approval')).toMatchObject({ status: 'missing', fix: '等待 camel 审批' })
      expect(stateTracking?.filter_rules).toEqual(expect.arrayContaining(['snake 状态筛选策略', 'camel 状态筛选策略']))
      expect(stateTracking?.source_requirements).toContain('camel 自定义来源要求')
      expect(stateTracking?.quality_checks).toContain('camel 自定义质量检查')
      expect(stateTracking?.revision_priorities).toContain('camel 自定义修订优先级')
      expect(storedBrief?.stateTrackingContract).toEqual(stateTracking)
      expect(storedBrief?.writePreparationBrief).toEqual(storedBrief?.write_preparation_brief)
      expect(storedBrief?.writePreparationBrief?.source_gaps.join('｜')).not.toContain('stale_camel_write_preparation_gap')
    }
  })
  test('auto-repairs unattended preflight source paths, timeline readiness, and blueprint fields', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-preflight-repair-sources-'))
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
      current_state: '刚踏入红雾，发现规则五被篡改。',
    })
    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '异常入局',
      chapter_summary: '江哲发现规则五被篡改。',
      ending_hook: '金色符文说明规则背后有人动手脚。',
      chapter_text: '江哲看见规则五下方的金色符文，随即踏入红雾。',
    })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '旧法失准',
      chapter_goal: '江哲进入红雾后确认旧办法不再可靠。',
      chapter_summary: '江哲进入红雾后确认旧办法不再可靠。',
      conflict: '暴力硬抗会让封印裂缝扩大。',
      ending_hook: '旧答案指向更危险的证据。',
      scene_list: [
        {
          scene_no: 1,
          title: '红雾深处',
          purpose: '承接规则五和金色符文',
          conflict: '旧办法会扩大封印裂缝',
          reader_payoff: '确认规则曾被篡改',
        },
      ],
      raw_payload: {
        pre_draft_brief: {
          benchmark_recall_gaps: ['source_paths_missing', 'module_rhythm_conflict'],
          benchmarkRecallGaps: ['来源路径缺失', 'module_rhythm_conflict'],
          benchmark_recall_brief: {
            selected_emotion_module: '调动：旧答案失效后的规则压力。',
            rhythm_reference: '蓄势 -> 误判 -> 反证 -> 新钩子。',
            source_paths: ['MangaForge/manual/chapter-2/rhythm-reference'],
            gaps: ['source_paths_missing', 'module_rhythm_conflict'],
          },
          state_tracking_contract: {
            version: 'oh_story_state_tracking_v1',
            source_requirements: [
              '本章细纲/场景卡',
              '上一章正文或上一章承接',
              '追踪/时间线.md',
            ],
            source_readiness: [
              { key: 'chapter_blueprint', label: '本章细纲/蓝图', status: 'ready', evidence: '江哲进入红雾后确认旧办法不再可靠。' },
              { key: 'previous_chapter', label: '上一章正文/章尾钩子', status: 'ready', evidence: '金色符文说明规则背后有人动手脚。' },
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
          { key: 'benchmark_recall_source_paths', ok: false, severity: 'medium' },
          { key: 'source_readiness_timeline_tracking', ok: false, severity: 'medium' },
          { key: 'source_readiness_chapter_blueprint', ok: false, severity: 'high' },
        ],
        warnings: ['文风召回来源缺失', '追踪/时间线缺失', '本章细纲/蓝图缺核心字段'],
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
        characters: [{ name: '江哲', current_state: { location: '红雾入口', knowledge_scope: '知道规则五被篡改' } }],
      },
    }

    await service.autoRepairChapterPreflightGaps(workspace, project, chapter, contextPackage, undefined)
    const repaired = (await listNovelChapters(workspace, project.id)).find(item => item.id === chapter.id)
    const preDraft = repaired?.raw_payload?.pre_draft_brief || {}
    const sourceReadiness = preDraft.state_tracking_contract?.source_readiness || []
    const timelineRow = sourceReadiness.find((item: any) => item.key === 'timeline_tracking')
    const sourcePaths = preDraft.benchmark_recall_brief?.source_paths || []
    const blueprint = preDraft.chapter_blueprint || {}
    const persistedWritePreparationGaps = preDraft.write_preparation_brief?.source_gaps || []

    expect(sourcePaths.length).toBeGreaterThan(0)
    expect(sourcePaths.join('｜')).toContain('MangaForge')
    expect(persistedWritePreparationGaps.join('｜')).not.toMatch(/source_paths_missing|来源路径.*缺/)
    expect(persistedWritePreparationGaps.join('｜')).toContain('module_rhythm_conflict')
    expect(preDraft.benchmark_recall_brief?.gaps || []).not.toContain('source_paths_missing')
    expect(preDraft.benchmark_recall_brief?.gaps || []).toContain('module_rhythm_conflict')
    expect(preDraft.benchmark_recall_gaps || []).toEqual(['module_rhythm_conflict'])
    expect(preDraft.benchmarkRecallGaps || []).toEqual(['module_rhythm_conflict'])
    expect(timelineRow?.status).toBe('ready')
    expect(timelineRow?.evidence).toContain('当前时间')
    expect(timelineRow?.evidence).toContain('当前地点')
    expect(blueprint.target_emotion).toBeTruthy()
    expect(blueprint.content_outline?.cause).toBeTruthy()
    expect(blueprint.plot_lines?.logic_line).toBeTruthy()
    expect(blueprint.ending_contract?.next_chapter_pull).toBeTruthy()
    expect(preDraft.write_preparation_brief?.readiness_status).toBe('needs_context')

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
    const rebuiltWritePreparationGaps = rebuiltContext.chapter_target.write_preparation_brief?.source_gaps || []

    expect(remainingKeys).not.toContain('benchmark_recall_source_paths')
    expect(remainingKeys).not.toContain('source_readiness_timeline_tracking')
    expect(remainingKeys).not.toContain('source_readiness_chapter_blueprint')
    expect(rebuiltContext.oh_story_director.stage).toBe('pre_draft')
    expect(rebuiltContext.ohStoryDirector).toBe(rebuiltContext.oh_story_director)
    expect(rebuiltContext.oh_story_director.readiness).not.toBe('blocked')
    expect(rebuiltWritePreparationGaps.join('｜')).not.toMatch(/source_paths_missing|来源路径.*缺/)
    expect(rebuiltWritePreparationGaps.join('｜')).toContain('module_rhythm_conflict')
    if (rebuiltContext.oh_story_director.readiness === 'ready') {
      expect(rebuiltContext.oh_story_director.primary_action.key).toBe('generate_prose')
    } else {
      expect(rebuiltContext.oh_story_director.primary_action.key).toBe('repair_pre_draft_materials')
    }
    const rebuiltRepairCategories = rebuiltContext.oh_story_director.required_repairs.map((item: any) => item.category)
    const rebuiltRepairText = rebuiltContext.oh_story_director.required_repairs
      .map((item: any) => `${item.label || ''}\n${item.detail || ''}`)
      .join('\n')
    expect(rebuiltRepairText).not.toContain('文风召回来源缺失')
    expect(rebuiltRepairText).not.toContain('追踪/时间线缺失')
    expect(rebuiltRepairText).not.toContain('本章细纲/蓝图缺核心字段')
    if (rebuiltRepairCategories.includes('missing_blueprint')) {
      expect(
        rebuiltRepairText.includes('场景卡戏剧单元')
          || remainingKeys.includes('source_readiness_scene_card_goal_obstacle_change'),
      ).toBe(true)
    }
  })
  test('recomputes persisted write preparation after a worldbuilding-only repair', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-preflight-final-write-preparation-'))
    const project = await createNovelProject(workspace, {
      title: '红雾电梯',
      genre: '规则怪谈',
      synopsis: '江哲在红雾中追查被篡改的规则。',
      reference_config: {
        story_state: {
          current_time: '紧接第一章章尾',
          active_locations: ['红雾入口'],
        },
      },
    })
    await createNovelCharacter(workspace, {
      project_id: project.id,
      name: '江哲',
      role_type: '主角',
      current_state: {
        location: '红雾入口',
        knowledge_scope: '知道规则五被篡改，但不知道幕后主使。',
      },
    })
    await createNovelSettingEntity(workspace, {
      project_id: project.id,
      entity_type: 'rule',
      name: '红雾裂缝规则',
      summary: '暴力硬抗会让封印裂缝扩大。',
      constraints_json: { trigger: '暴力破坏规则载体', cost: '封印裂缝扩大' },
      state_json: {},
      payload_json: {},
    } as any)
    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '异常入局',
      chapter_summary: '江哲发现规则五被篡改。',
      ending_hook: '金色符文说明规则背后有人动手脚。',
      chapter_text: '江哲看见规则五下方的金色符文，随即踏入红雾。',
    })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '旧法失准',
      chapter_goal: '江哲确认旧办法不再可靠。',
      chapter_summary: '江哲确认旧办法不再可靠，并把旧答案反推成危险证据。',
      conflict: '暴力硬抗会让封印裂缝扩大。',
      ending_hook: '旧答案指向更危险的证据。',
      scene_list: [
        {
          scene_no: 1,
          title: '红雾深处',
          purpose: '江哲验证旧办法为何失效。',
          conflict: '旧办法会扩大封印裂缝。',
          reader_payoff: '确认规则曾被篡改，并留下新的证据。',
          ending_hook: '旧答案指向更危险的证据。',
        },
      ],
      raw_payload: {
        pre_draft_brief: {
          confirmed_at: '2026-07-11T00:00:00.000Z',
          confirmation_source: 'test_fixture',
          chapter_blueprint: {
            target_emotion: '压迫 -> 试探 -> 反证',
            opening_hook: '旧办法在红雾中当场失效。',
            core_payoff: '江哲把失败反推成规则被篡改的证据。',
            content_outline: {
              cause: '江哲进入红雾。',
              development: '旧办法扩大裂缝。',
              turn: '失败痕迹与金色符文一致。',
              climax: '江哲确认规则被篡改。',
              ending: '旧答案指向更危险的证据。',
            },
            ending_contract: {
              final_state: '江哲放弃旧办法。',
              unresolved_question: '谁篡改了规则？',
              next_chapter_pull: '旧答案指向更危险的证据。',
            },
          },
          state_tracking_contract: {
            version: 'oh_story_state_tracking_v1',
            character_states: ['过期角色状态'],
            characterStates: ['过期角色状态 camel'],
            historical_causality: ['过期前史因果'],
            historicalCausality: ['过期前史因果 camel'],
            world_constraints: ['过期世界约束'],
            worldConstraints: ['过期世界约束 camel'],
            filter_rules: ['保留自定义状态筛选约束'],
            source_readiness: [
              { key: 'chapter_blueprint', label: '本章细纲/蓝图', status: 'ready', evidence: '旧法失准蓝图已确认。' },
              { key: 'previous_chapter', label: '上一章正文/章尾钩子', status: 'ready', evidence: '第一章金色符文章尾已读取。' },
              { key: 'context_tracking', label: '追踪/上下文', status: 'ready', evidence: '最后完成第一章，江哲已进入红雾。' },
              { key: 'timeline_tracking', label: '追踪/时间线', status: 'ready', evidence: '紧接第一章章尾，地点为红雾入口。' },
              { key: 'character_state', label: '角色状态', status: 'ready', evidence: '江哲位于红雾入口，知道规则五被篡改。' },
              { key: 'foreshadowing_history', label: '伏笔/前史', status: 'ready', evidence: '金色符文指向规则被篡改。' },
              { key: 'world_constraints', label: '世界约束', status: 'missing', evidence: '' },
            ],
            sourceReadiness: [
              { key: 'character_state', label: '角色状态', status: 'missing', evidence: '过期 camel 角色行' },
              { key: 'world_constraints', label: '世界约束', status: 'missing', evidence: '过期 camel 世界观行' },
            ],
          },
          write_preparation_brief: {
            version: 'oh_story_write_preparation_v1',
            readiness_status: 'needs_context',
            source_gaps: ['世界观｜状态=missing｜缺少世界观或核心规则'],
          },
        },
      },
    })
    const chapterWithAliases = await updateNovelChapter(workspace, chapter.id, {
      raw_payload: {
        ...(chapter.raw_payload || {}),
        preDraftBrief: {
          ...(chapter.raw_payload?.pre_draft_brief || {}),
          state_tracking_contract: {
            version: 'oh_story_state_tracking_v1',
            source_readiness: [
              { key: 'world_constraints', label: '世界约束', status: 'missing', evidence: '' },
            ],
          },
        },
      },
    } as any, { createVersion: false })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      preflight: {
        checks: [
          { key: 'worldbuilding', ok: false, severity: 'high' },
        ],
        warnings: ['世界观不足'],
      },
      chapter_target: {
        chapter_no: 2,
        title: chapter.title,
        summary: chapter.chapter_summary,
        conflict: chapter.conflict,
        ending_hook: chapter.ending_hook,
        scene_cards: chapter.scene_list,
      },
    }

    const result = await service.autoRepairChapterPreflightGaps(workspace, project, chapterWithAliases || chapter, contextPackage, undefined)
    const repairedChapters = await listNovelChapters(workspace, project.id)
    const repairedChapter = repairedChapters.find(item => item.id === chapter.id)
    const repairedStateTracking = repairedChapter?.raw_payload?.pre_draft_brief?.state_tracking_contract
    const repairedWorldConstraints = (repairedStateTracking?.source_readiness || [])
      .find((item: any) => item.key === 'world_constraints')
    const writePreparation = repairedChapter?.raw_payload?.pre_draft_brief?.write_preparation_brief

    expect(result.repaired.map((item: any) => item.type)).toContain('worldbuilding_created')
    expect(result.repaired.map((item: any) => item.type)).not.toContain('chapter_blueprint_updated')
    expect((await listNovelWorldbuilding(workspace, project.id)).length).toBe(1)
    expect(repairedWorldConstraints?.status).toBe('ready')
    expect(repairedWorldConstraints?.evidence).toContain('红雾裂缝规则')
    expect(repairedStateTracking?.character_states.join('｜')).toContain('江哲')
    expect(repairedStateTracking?.character_states.join('｜')).not.toContain('过期角色状态')
    expect(repairedStateTracking?.characterStates).toEqual(repairedStateTracking?.character_states)
    expect(repairedStateTracking?.historical_causality.join('｜')).not.toContain('过期前史因果')
    expect(repairedStateTracking?.historicalCausality).toEqual(repairedStateTracking?.historical_causality)
    expect(repairedStateTracking?.world_constraints.join('｜')).toContain('红雾裂缝规则')
    expect(repairedStateTracking?.world_constraints.join('｜')).not.toContain('过期世界约束')
    expect(repairedStateTracking?.worldConstraints).toEqual(repairedStateTracking?.world_constraints)
    expect(repairedStateTracking?.sourceReadiness).toEqual(repairedStateTracking?.source_readiness)
    expect(repairedStateTracking?.filter_rules).toContain('保留自定义状态筛选约束')
    expect(writePreparation).toBeTruthy()
    expect(writePreparation?.source_gaps).toEqual([])
    expect(writePreparation?.readiness_status).toBe('ready')

    const rebuiltContext = await service.buildChapterContextPackage(
      workspace,
      project,
      repairedChapter,
      repairedChapters,
      await listNovelWorldbuilding(workspace, project.id),
      await listNovelCharacters(workspace, project.id),
      await listNovelOutlines(workspace, project.id),
      await listNovelReviews(workspace, project.id),
    )
    const rebuiltStateTracking = rebuiltContext.chapter_target.state_tracking_contract
    const rebuiltWorldConstraints = (rebuiltStateTracking?.source_readiness || [])
      .find((item: any) => item.key === 'world_constraints')
    expect(rebuiltWorldConstraints?.status).toBe('ready')
    expect(rebuiltStateTracking?.filter_rules).toContain('保留自定义状态筛选约束')
    expect(rebuiltContext.chapter_target.write_preparation_brief?.source_gaps).toEqual([])
    expect(rebuiltContext.chapter_target.write_preparation_brief?.readiness_status).toBe('ready')
  })
})

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
    'prose-quality-risks-audience.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}
const createProsePipelineHarness = (options?: any) => createProsePipelineHarnessWithService(createNovelWritingService, options)
const readSceneCardsPromptSource = () => readFileSync(join(import.meta.dir, '../novel-writing/scene-cards-prompt.ts'), 'utf8')
const readPostDeliveryStoryStateUpdateSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-story-state-update.ts'), 'utf8')
const readChapterProseStoragePatchSource = () => readFileSync(join(import.meta.dir, '../novel-writing/chapter-prose-storage-patch.ts'), 'utf8')
const readPostDeliverySyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-sync-review-record.ts'), 'utf8')
const readDraftSyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/draft-sync-review-record.ts'), 'utf8')

describe('chapter context word target source guards', () => {
  test('blocks prose preflight when benchmark recall has hard setup gaps', () => {
    const preflight = buildPreflightChecks(
      { title: '门禁测试', reference_config: {} },
      {
        id: 1,
        chapter_no: 1,
        chapter_goal: '主角拿到关键证据并逼出反派破绽。',
        chapter_summary: '主角用旧账册制造信息差。',
        conflict: '反派试图否认旧账册的真实性。',
        ending_hook: '反派背后的人露出名字。',
        raw_payload: {
          pre_draft_brief: {
            benchmark_recall_brief: {
              version: 'oh_story_benchmark_recall_v1',
              gaps: ['missing_primary_contract'],
            },
          },
        },
      },
      null,
      [{ world_summary: '核心规则完整。' }],
      [{ name: '林照', current_state: { location: '公堂' } }],
      [{ scene_no: 1, goal: '对峙' }],
      null,
      [],
    )

    expect(preflight.ready).toBe(false)
    expect(preflight.blockers.some((item: any) => item.key === 'benchmark_recall_gate')).toBe(true)
    expect(preflight.warnings.join('｜')).toContain('文风召回门禁')
  })
  test('blocks prose preflight when v12 benchmark recall is missing canonical module or rhythm', () => {
    const preflight = buildPreflightChecks(
      { title: '模块门禁测试', reference_config: {} },
      {
        id: 1,
        chapter_no: 1,
        chapter_goal: '主角用证据反杀执事。',
        chapter_summary: '主角在审判庭公开旧账册。',
        conflict: '执事试图把账册说成伪造。',
        ending_hook: '旧账册背面浮出第二个名字。',
        raw_payload: {
          pre_draft_brief: {
            benchmark_recall_brief: {
              version: 'oh_story_benchmark_recall_v1',
              gaps: ['module_missing', 'rhythm_missing'],
            },
          },
        },
      },
      null,
      [{ world_summary: '宗门审判规则完整。' }],
      [{ name: '李玄', current_state: { location: '审判庭' } }],
      [{ scene_no: 1, goal: '公开旧账册' }],
      null,
      [],
    )

    expect(preflight.ready).toBe(false)
    expect(preflight.blockers.some((item: any) => item.key === 'benchmark_recall_gate')).toBe(true)
    expect(preflight.warnings.join('｜')).toContain('module_missing')
    expect(preflight.warnings.join('｜')).toContain('rhythm_missing')
  })
  test('keeps legacy benchmark recall module and rhythm gaps as soft carry-over warnings', () => {
    const preflight = buildPreflightChecks(
      { title: '旧拆文回退测试', reference_config: {} },
      {
        id: 1,
        chapter_no: 1,
        chapter_goal: '主角用证据反杀执事。',
        chapter_summary: '主角在审判庭公开旧账册。',
        conflict: '执事试图把账册说成伪造。',
        ending_hook: '旧账册背面浮出第二个名字。',
        raw_payload: {
          pre_draft_brief: {
            benchmark_recall_brief: {
              version: 'oh_story_benchmark_recall_v1',
              gaps: ['legacy_deconstruction', 'module_missing', 'rhythm_missing'],
            },
          },
        },
      },
      null,
      [{ world_summary: '宗门审判规则完整。' }],
      [{ name: '李玄', current_state: { location: '审判庭' } }],
      [{ scene_no: 1, goal: '公开旧账册' }],
      null,
      [],
    )

    expect(preflight.ready).toBe(true)
    expect(preflight.blockers.some((item: any) => item.key === 'benchmark_recall_gate')).toBe(false)
    expect(preflight.checks.some((item: any) => item.key === 'benchmark_recall_gaps')).toBe(true)
    expect(preflight.warnings.join('｜')).toContain('legacy_deconstruction')
  })
  test('does not block benchmark preflight when no benchmark project is configured', () => {
    const preflight = buildPreflightChecks(
      { title: '无对标项目测试', reference_config: {} },
      {
        id: 1,
        chapter_no: 1,
        chapter_goal: '主角用证据反杀执事。',
        chapter_summary: '主角在审判庭公开旧账册。',
        conflict: '执事试图把账册说成伪造。',
        ending_hook: '旧账册背面浮出第二个名字。',
        raw_payload: {
          pre_draft_brief: {
            benchmark_recall_brief: {
              version: 'oh_story_benchmark_recall_v1',
              gaps: ['no_benchmark', 'module_missing', 'rhythm_missing', 'profile_missing'],
            },
          },
        },
      },
      null,
      [{ world_summary: '宗门审判规则完整。' }],
      [{ name: '李玄', current_state: { location: '审判庭' } }],
      [{ scene_no: 1, goal: '公开旧账册' }],
      null,
      [],
    )

    expect(preflight.ready).toBe(true)
    expect(preflight.blockers.some((item: any) => item.key === 'benchmark_recall_gate')).toBe(false)
    expect(preflight.checks.some((item: any) => item.key === 'benchmark_recall_gaps')).toBe(false)
    expect(preflight.warnings.join('｜')).not.toContain('module_missing')
  })
  test('warns when benchmark recall has no concrete source paths', () => {
    const preflight = buildPreflightChecks(
      { title: '召回来源测试', reference_config: {} },
      {
        id: 1,
        chapter_no: 1,
        chapter_goal: '主角用证据反杀执事。',
        chapter_summary: '主角在审判庭公开旧账册。',
        conflict: '执事试图把账册说成伪造。',
        ending_hook: '旧账册背面浮出第二个名字。',
        raw_payload: {
          pre_draft_brief: {
            benchmark_recall_brief: {
              version: 'oh_story_benchmark_recall_v1',
              source: 'oh_story_workflow_daily_step_2_3',
              selected_emotion_module: 'M03 信息差反杀',
              rhythm_reference: '先压三轮质问，再用证据爆发。',
              style_profile_summary: '短句推进审讯压力，对白留半拍。',
              matched_chapter_techniques: ['三轮压问', '半拍亮证据'],
            },
          },
        },
      },
      null,
      [{ world_summary: '宗门审判规则完整。' }],
      [{ name: '李玄', current_state: { location: '审判庭' } }],
      [{ scene_no: 1, goal: '公开旧账册' }],
      null,
      [],
    )

    expect(preflight.ready).toBe(true)
    expect(preflight.blockers.some((item: any) => item.key === 'benchmark_recall_source_paths')).toBe(false)
    expect(preflight.checks.some((item: any) => item.key === 'benchmark_recall_source_paths')).toBe(true)
    expect(preflight.warnings.join('｜')).toContain('source_paths')
    expect(preflight.warnings.join('｜')).toContain('Step 2.3')
  })
  test('rechecks benchmark recall preflight after confirmed context is merged', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/chapter-context-package.ts'), 'utf8')
    const contextStart = source.indexOf('export async function buildChapterContextPackage')
    const mergeStart = source.indexOf('const confirmedPackage = mergeConfirmedPreDraftBriefIntoContext', contextStart)
    const overrideStart = source.indexOf('const override = chapter.raw_payload?.context_package_override', mergeStart)
    const mergeBlock = source.slice(mergeStart, overrideStart)

    expect(contextStart).toBeGreaterThanOrEqual(0)
    expect(mergeStart).toBeGreaterThan(contextStart)
    expect(mergeBlock).toContain('buildBenchmarkRecallBrief(confirmedPackage')
    expect(mergeBlock).toContain('applyBenchmarkRecallPreflightChecks')
  })
  test('rechecks source readiness preflight after confirmed context is merged', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/chapter-context-package.ts'), 'utf8')
    const contextStart = source.indexOf('export async function buildChapterContextPackage')
    const mergeStart = source.indexOf('const confirmedPackage = mergeConfirmedPreDraftBriefIntoContext', contextStart)
    const overrideStart = source.indexOf('const override = chapter.raw_payload?.context_package_override', mergeStart)
    const mergeBlock = source.slice(mergeStart, overrideStart)

    expect(contextStart).toBeGreaterThanOrEqual(0)
    expect(mergeStart).toBeGreaterThan(contextStart)
    expect(mergeBlock).toContain('applySourceReadinessPreflightChecks')
    expect(mergeBlock).toContain('state_tracking_contract')
  })
  test('declares word target inside chapter context builder instead of writing bible builder', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/chapter-context-package.ts'), 'utf8')
    const bibleSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/writing-bible.ts'), 'utf8')
    const bibleStart = bibleSource.indexOf('export function buildWritingBible')
    const bibleEnd = bibleSource.indexOf('export function hasMeaningfulWritingBible', bibleStart)
    const contextStart = source.indexOf('export async function buildChapterContextPackage')
    const basePackageStart = source.indexOf('const basePackage =', contextStart)
    const bibleBlock = bibleSource.slice(bibleStart, bibleEnd > bibleStart ? bibleEnd : bibleSource.length)
    const contextSetupBlock = source.slice(contextStart, basePackageStart)

    expect(bibleStart).toBeGreaterThanOrEqual(0)
    expect(contextStart).toBeGreaterThanOrEqual(0)
    expect(bibleBlock).not.toContain('resolveChapterWordTarget(project, chapter')
    expect(contextSetupBlock).toContain('const wordTarget = resolveChapterWordTarget(project, chapter, {})')
    expect(contextSetupBlock).toContain('const styleLock = { ...getStyleLock(project), chapter_word_range: wordTarget.rangeText }')
  })
  test('uses multiple completion attempts before failing a short chapter', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-word-target-methods.ts'), 'utf8')
    const ensureStart = source.indexOf('const ensureProseMeetsWordTarget =')
    const groupStart = source.indexOf('return {\n    ensureProseMeetsWordTarget,', ensureStart)
    const ensureBlock = source.slice(ensureStart, groupStart > ensureStart ? groupStart : source.length)

    expect(ensureStart).toBeGreaterThanOrEqual(0)
    expect(ensureBlock).toContain('maxExpansionAttempts')
    expect(ensureBlock).toContain('for (let attempt = 1; attempt <= maxExpansionAttempts; attempt += 1)')
    expect(ensureBlock).toContain('attempts.push')
  })
  test('passes word-target expansion blueprint patches into prose review context', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const helperSource = readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/core-handoff-sync-reports.ts'), 'utf8')
    const helperStart = helperSource.indexOf('export function buildProseReviewContextPackage')
    const helperEnd = helperSource.indexOf('\nexport function', helperStart + 1)
    const helperBlock = helperSource.slice(helperStart, helperEnd > helperStart ? helperEnd : undefined)
    const generationStart = source.indexOf("await onStage('word_target', { status: 'running'")
    const generationEnd = source.indexOf('const initialReviewDecision = getQualityGateDecision', generationStart)
    const generationBlock = source.slice(generationStart, generationEnd)

    expect(helperBlock).toContain('wordTargetExpansionPatches')
    expect(helperBlock).toContain('word_target_expansion_patches')
    expect(generationBlock).toContain('const wordTargetExpansionPatches: any[] = []')
    expect(generationBlock).toContain('wordTargetExpansionPatches.push')
    expect(generationBlock).toContain('scan: text => scanProseForQualityLoop(text, contextPackage, wordTarget, wordTargetCompatibility ? {')
    expect(generationBlock).toContain('word_target_compatibility_pass: true')
    expect(generationBlock).toContain('compatibility_ceiling: wordTargetCompatibility.compatibility_ceiling')
    expect(generationBlock).toContain('finalSceneBreakdown = selectVerifiedSceneBreakdownUpdate')
  })
  test('does not fail chapter production solely because a recovered draft result still has an error field', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const draftStart = source.indexOf('const resultPayload = getNovelPayload(draftResult)')
    const draftEnd = source.indexOf('let editorRewrite', draftStart)
    const failureBlock = source.slice(draftStart, draftEnd)

    expect(draftStart).toBeGreaterThanOrEqual(0)
    expect(failureBlock).toContain('const chapterText =')
    expect(failureBlock).toContain('resultPayload?.proseChapters')
    expect(failureBlock).toContain('targetProse?.chapterText')
    expect(failureBlock).toContain('resultPayload?.chapterText')
    expect(failureBlock).toContain('targetProse?.sceneBreakdown')
    expect(failureBlock).toContain('resultPayload?.sceneBreakdown')
    expect(failureBlock).toContain('targetProse?.continuityNotes')
    expect(failureBlock).toContain('resultPayload?.continuityNotes')
    expect(failureBlock).toContain('if (!chapterText)')
    expect(failureBlock).not.toContain('(draftResult as any).error || !chapterText')
  })
  test('accepts camelCase commercial editor rewrite payloads', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-polish-methods.ts'), 'utf8')
    const editorStart = source.indexOf('const runCommercialEditorRewrite =')
    const editorEnd = source.indexOf('const runMemePolish =', editorStart)
    const editorBlock = source.slice(editorStart, editorEnd)

    expect(editorStart).toBeGreaterThanOrEqual(0)
    expect(editorEnd).toBeGreaterThan(editorStart)
    expect(editorBlock).toContain('payload?.proseChapters')
    expect(editorBlock).toContain('rewrittenFirst?.chapterText')
    expect(editorBlock).toContain('payload?.chapterText')
    expect(editorBlock).toContain('payload?.editorReport')
    expect(editorBlock).toContain('rewrittenFirst?.sceneBreakdown')
    expect(editorBlock).toContain('payload?.sceneBreakdown')
    expect(editorBlock).toContain('rewrittenFirst?.continuityNotes')
    expect(editorBlock).toContain('payload?.continuityNotes')
  })
  test('accepts camelCase meme polish payloads without losing safety reports', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-polish-methods.ts'), 'utf8')
    const memeStart = source.indexOf('const runMemePolish =')
    const memeEnd = source.indexOf('const runReadabilityReview =', memeStart)
    const memeBlock = source.slice(memeStart, memeEnd)

    expect(memeStart).toBeGreaterThanOrEqual(0)
    expect(memeEnd).toBeGreaterThan(memeStart)
    expect(memeBlock).toContain('payload?.proseChapters')
    expect(memeBlock).toContain('polishedFirst?.chapterText')
    expect(memeBlock).toContain('payload?.chapterText')
    expect(memeBlock).toContain('payload?.memePolishReport?.changedPlot')
    expect(memeBlock).toContain('payload?.memePolishReport')
    expect(memeBlock).toContain('polishedFirst?.sceneBreakdown')
    expect(memeBlock).toContain('payload?.sceneBreakdown')
    expect(memeBlock).toContain('polishedFirst?.continuityNotes')
    expect(memeBlock).toContain('payload?.continuityNotes')
  })
  test('requires scene-card prompts to plan commercial reader hooks before prose generation', () => {
    const promptBlock = readSceneCardsPromptSource()

    expect(promptBlock).toContain('opening_hook')
    expect(promptBlock).toContain('reader_payoff')
    expect(promptBlock).toContain('fear_point')
    expect(promptBlock).toContain('rule_pressure')
    expect(promptBlock).toContain('information_gap')
    expect(promptBlock).toContain('reversal')
    expect(promptBlock).toContain('ending_hook_seed')
    expect(promptBlock).toContain('每个场景必须同时声明：人物要什么、什么挡着、结束后哪里不同')
    expect(promptBlock).toContain('purpose 不得只写“观察/进入/等待/经过”')
    expect(promptBlock).toContain('conflict 必须是可见阻碍/规则压力/对手动作/代价')
    expect(promptBlock).toContain('turning_point/exit_state/state_changes_expected 必须写出局势、关系、信息或状态变化')
    expect(promptBlock).toContain('缺任一项不得输出该场景卡')
  })
  test('requires scene-card prompts to repair recent serial fatigue before prose generation', () => {
    const promptBlock = readSceneCardsPromptSource()

    expect(promptBlock).toContain('recent_fatigue_brief')
    expect(promptBlock).toContain('risk_signals')
    expect(promptBlock).toContain('next_actions')
    expect(promptBlock).toContain('two_chapter_momentum_stall')
    expect(promptBlock).toContain('five_chapter_texture_gap')
    expect(promptBlock).toContain('conflict_thrill_overrun')
    expect(promptBlock).toContain('场景卡阶段')
    expect(promptBlock).toContain('正文生成前')
    expect(promptBlock).toContain('目标推进、阻碍升级、新信息')
    expect(promptBlock).toContain('关系/世界调剂')
    expect(promptBlock).toContain('冲突冷却')
  })
  test('requires scene-card prompts to consume rolling rhythm preflight before prose generation', () => {
    const promptBlock = readSceneCardsPromptSource()

    expect(promptBlock).toContain('rolling_rhythm_preflight')
    expect(promptBlock).toContain('拉期待速度 > 断期待速度')
    expect(promptBlock).toContain('期待真空期急救')
    expect(promptBlock).toContain('反派视角转接')
    expect(promptBlock).toContain('突发意外')
    expect(promptBlock).toContain('配角杠杆')
    expect(promptBlock).toContain('超额收获')
    expect(promptBlock).toContain('卖点偏移')
    expect(promptBlock).toContain('同一核心梗连续3次以上无差异化')
    expect(promptBlock).toContain('serial_risk_repairs')
    expect(promptBlock).toContain('recent_fatigue_action')
  })
  test('requires scene-card prompts to plan delivery-risk carry-over before prose generation', () => {
    const promptBlock = readSceneCardsPromptSource()

    expect(promptBlock).toContain('delivery_risk_carry_over')
    expect(promptBlock).toContain('质量续航')
    expect(promptBlock).toContain('opening_actions')
    expect(promptBlock).toContain('middle_actions')
    expect(promptBlock).toContain('ending_actions')
    expect(promptBlock).toContain('forbidden_repeats')
    expect(promptBlock).toContain('场景卡阶段')
    expect(promptBlock).toContain('serial_risk_repairs')
    expect(promptBlock).toContain('opening_hook')
    expect(promptBlock).toContain('ending_hook_seed')
  })
  test('requires scene-card prompts and briefs to preserve serial risk repair fields', () => {
    const sceneBriefSource = readFileSync(join(import.meta.dir, '../novel-writing/scene-briefs.ts'), 'utf8')
    const promptBlock = readSceneCardsPromptSource()
    const briefStart = sceneBriefSource.indexOf('export function sceneBriefFromCard')
    const briefBlock = sceneBriefSource.slice(briefStart)

    expect(briefStart).toBeGreaterThanOrEqual(0)
    expect(promptBlock).toContain('serial_risk_repairs(array)')
    expect(promptBlock).toContain('recent_fatigue_action')
    expect(promptBlock).toContain('每个风险修复场景')
    expect(promptBlock).toContain('写入 serial_risk_repairs')
    expect(promptBlock).toContain('写入 recent_fatigue_action')
    expect(briefBlock).toContain('serial_risk_repairs')
    expect(briefBlock).toContain('recent_fatigue_action')
  })
  test('requires scene-card prompts to plan and prose prompts to execute beat density levels', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const scenePromptBlock = readSceneCardsPromptSource()
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = source.slice(prosePromptStart, prosePromptEnd)

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(scenePromptBlock).toContain('density_level')
    expect(scenePromptBlock).toContain('疏密分配')
    expect(scenePromptBlock).toContain('dense/medium/sparse')
    expect(scenePromptBlock).toContain('爽点/打脸/反转/情绪高潮')
    expect(scenePromptBlock).toContain('过场/赶路/信息交代/时间跳转')
    expect(scenePromptBlock).toContain('铺垫/日常/关系升温')
    expect(scenePromptBlock).toContain('详写必须集中在情绪节点')
    expect(prosePromptBlock).toContain('density_level=dense')
    expect(prosePromptBlock).toContain('density_level=sparse')
    expect(prosePromptBlock).toContain('density_level=medium')
    expect(prosePromptBlock).toContain('不允许每个 beat 一样长一样细')
  })
  test('requires prose generation prompts to apply oh-story natural writing baselines', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = source.slice(prosePromptStart, prosePromptEnd)

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('oh-story 自然写作底线')
    expect(prosePromptBlock).toContain('动作 -> 对话 -> 情绪反应')
    expect(prosePromptBlock).toContain('单写心理活动不得连续超过 2 段')
    expect(prosePromptBlock).toContain('打斗/紧张用 3-8 字短句')
    expect(prosePromptBlock).toContain('对话必须口语化')
    expect(prosePromptBlock).toContain('章尾用动作、对话或悬念收束')
    expect(prosePromptBlock).toContain('不得用总结性感悟、哲理升华或作者预告收尾')
  })
  test('requires scene-card prompts and prose prompts to preserve purpose tags for detail allocation', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const scenePromptBlock = readSceneCardsPromptSource()
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(scenePromptBlock).toContain('purpose_tag')
    expect(scenePromptBlock).toContain('目的词')
    expect(scenePromptBlock).toContain('铺垫/高潮/爽点/打脸/人物塑造/设定/过渡/信息交代')
    expect(scenePromptBlock).toContain('爽点/打脸/高潮展开')
    expect(scenePromptBlock).toContain('过渡/赶路/信息交代带过')
    expect(prosePromptBlock).toContain('scene_cards.purpose_tag')
    expect(prosePromptBlock).toContain('按目的词分配详略')
    expect(reviewPrompt).toContain('scene_cards.purpose_tag')
    expect(reviewPrompt).toContain('quality_audit_checks')
    expect(reviewPrompt).toContain('平均用力')
    expect(revisionPrompt).toContain('scene_cards.purpose_tag')
    expect(revisionPrompt).toContain('目的词详略分配')
  })
  test('requires scene-card prompts to plan and prose prompts to execute sensory anchors', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const scenePromptBlock = readSceneCardsPromptSource()
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = source.slice(prosePromptStart, prosePromptEnd)

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(scenePromptBlock).toContain('sensory_anchor')
    expect(scenePromptBlock).toContain('感知素材库')
    expect(scenePromptBlock).toContain('字迹深浅、纸张触感、墨水洇开、页角卷曲')
    expect(scenePromptBlock).toContain('对方表情变化、语气停顿、空气里的沉默')
    expect(scenePromptBlock).toContain('脚步声、地面的触感、风的方向')
    expect(scenePromptBlock).toContain('感知是主角主动注意到的细节')
    expect(scenePromptBlock).toContain('感知不能是装饰性场景描写')
    expect(prosePromptBlock).toContain('scene_cards.sensory_anchor')
    expect(prosePromptBlock).toContain('主角主动注意到')
    expect(prosePromptBlock).toContain('不能当装饰性氛围')
  })
  test('runs commercial editor rewrite between word-target expansion and self-review in chapter group generation', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftOnlyStart = source.indexOf('if (isDraftOnly)', groupStart)
    const reviewStart = source.indexOf('let qualityLoop: Awaited<ReturnType<typeof runProseQualityLoop>>', groupStart)
    const beforeReviewBlock = source.slice(draftOnlyStart, reviewStart)

    expect(groupStart).toBeGreaterThanOrEqual(0)
    expect(reviewStart).toBeGreaterThan(groupStart)
    expect(beforeReviewBlock).toContain('runCommercialEditorRewrite(')
    expect(beforeReviewBlock).toContain("onStage('editor'")
  })
  test('auto-repairs generation preflight gaps before unattended chapter group generation blocks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const gateStart = source.indexOf('await enforcePreparedGate(false)', groupStart)
    const beforeGate = source.slice(groupStart, gateStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(groupStart).toBeGreaterThan(repairStart)
    expect(gateStart).toBeGreaterThan(groupStart)
    expect(beforeGate).toContain('options.auto_repair_missing_material === true')
    expect(beforeGate).toContain('autoRepairChapterPreflightGaps(')
    expect(beforeGate).toContain("onStage('material_repair'")
    expect(beforeGate).toContain('const repairedContextPackage = applyChapterWordTargetToContext(')
    expect(beforeGate).toContain('preparedGeneration = prepareProseGenerationContract(repairedContextPackage, postRepairOptions)')
    expect(beforeGate).not.toContain('options.allow_incomplete !== true')
  })
  test('returns repaired write preparation brief on context_package after preflight repair', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const returnStart = source.indexOf('return {', source.indexOf('const finalWritePreparationBrief = buildWritePreparationBrief', repairStart))
    const returnBlock = source.slice(returnStart, returnStart + 900)
    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(returnBlock).toContain('context_package: repairedContextPackage')
    expect(source.slice(repairStart, returnStart + 900)).toContain('write_preparation_brief: finalWritePreparationBrief')
    expect(source.slice(repairStart, returnStart + 900)).toContain('Keep returned context_package aligned with the repaired brief/contracts')
  })
  test('infers material repair keys from preflight warning corpus, not only failed check keys', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const needsStart = source.indexOf('const needsChapterBlueprint =', repairStart)
    const repairHeader = source.slice(repairStart, needsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(needsStart).toBeGreaterThan(repairStart)
    expect(repairHeader).toContain('const warningCorpus =')
    expect(repairHeader).toContain("target_emotion|人物出场|character_order")
    expect(repairHeader).toContain('source_paths_missing|文风召回|benchmark_recall')
    expect(repairHeader).toContain('追踪\\/?时间线|timeline_tracking')
    expect(repairHeader).toContain("['chapter_blueprint', 'source_readiness_chapter_blueprint']")
    expect(repairHeader).toContain("['benchmark_recall_source_paths', 'benchmark_recall_gate']")
    expect(repairHeader).toContain("['source_readiness_timeline_tracking']")
  })
  test('blocks unattended prose generation when scene cards remain missing after auto repair', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const sceneCardsStage = source.indexOf("await onStage('scene_cards', { status: 'running' })", groupStart)
    const promptCompileStart = source.indexOf('const compiledPrompt = compileParagraphProseContext', groupStart)
    const sceneCardsBlock = source.slice(sceneCardsStage, promptCompileStart)

    expect(groupStart).toBeGreaterThanOrEqual(0)
    expect(sceneCardsStage).toBeGreaterThan(groupStart)
    expect(promptCompileStart).toBeGreaterThan(sceneCardsStage)
    expect(sceneCardsBlock).toContain('if (!generationContract.chapter.scene_cards.length || options.force_scene_cards === true)')
    expect(sceneCardsBlock).toContain('preparedGeneration = prepareProseGenerationContract(sceneContextPackage, options)')
    expect(sceneCardsBlock).toContain('await enforcePreparedGate(true)')
    expect(sceneCardsBlock).not.toContain('options.allow_incomplete !== true')
  })
  test('refreshes repaired worldbuilding before unattended preflight is evaluated again', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const repairCall = source.indexOf('const repairResult = await autoRepairChapterPreflightGaps', groupStart)
    const rebuildStart = source.indexOf('const repairedContextPackage = applyChapterWordTargetToContext(', repairCall)
    const gateStart = source.indexOf('await enforcePreparedGate(false)', rebuildStart)
    const repairRefreshBlock = source.slice(repairCall, rebuildStart)
    const rebuiltContractBlock = source.slice(rebuildStart, gateStart)

    expect(groupStart).toBeGreaterThanOrEqual(0)
    expect(repairCall).toBeGreaterThan(groupStart)
    expect(rebuildStart).toBeGreaterThan(repairCall)
    expect(repairRefreshBlock).toContain('persist: false')
    expect(repairRefreshBlock).toContain('worldbuilding = repairResult.worldbuilding || worldbuilding')
    expect(repairRefreshBlock).toContain('characters = repairResult.characters || characters')
    expect(repairRefreshBlock).toContain('settings = repairResult.settings || settings')
    expect(repairRefreshBlock).toContain('chapterSettingUsage = repairResult.staged_usage_replacement || chapterSettingUsage')
    expect(repairRefreshBlock).toContain('reviews = [...reviews, ...asArray(repairResult.staged_reviews)]')
    expect(repairRefreshBlock).not.toContain('await listNovelWorldbuilding')
    expect(repairRefreshBlock).not.toContain('await createNovel')
    expect(repairRefreshBlock).not.toContain('await updateNovel')
    expect(rebuiltContractBlock).toContain('runtime?.buildChapterContext ? await buildGenerationContext() : repairResult.context_package')
    expect(rebuiltContractBlock).toContain('preparedGeneration = prepareProseGenerationContract(repairedContextPackage, postRepairOptions)')
    expect(rebuiltContractBlock).toContain('generationContract = preparedGeneration.contract')
  })
  test('auto-repairs missing unattended chapter blueprint before prose generation', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('const needsChapterBlueprint =')
    expect(repairBlock).toContain("missingKeys.includes('chapter_blueprint')")
    expect(repairBlock).toContain("missingKeys.includes('ending_hook')")
    expect(repairBlock).toContain("executeAgent('outline-agent'")
    expect(repairBlock).toContain('chapter_goal:')
    expect(repairBlock).toContain('ending_hook:')
    expect(repairBlock).toContain("type: 'chapter_blueprint_updated'")
  })
  test('auto-repairs unattended chapter blueprint with a persisted oh-story blueprint contract', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('chapter_blueprint')
    expect(repairBlock).toContain('target_emotion')
    expect(repairBlock).toContain('core_payoff')
    expect(repairBlock).toContain('content_outline')
    expect(repairBlock).toContain('beat_density_contract')
    expect(repairBlock).toContain('function_tag 必须决定展开还是带过')
    expect(repairBlock).toContain('beat_density_contract: buildChapterBlueprintBeatDensityContract')
    expect(repairBlock).toContain('ending_contract')
    expect(repairBlock).toContain('const repairedChapterBlueprint =')
    expect(repairBlock).toContain('pre_draft_brief:')
    expect(repairBlock).toContain('chapter_blueprint: repairedChapterBlueprint')
  })
  test('auto-repairs unattended chapter blueprint with an oh-story outline methods contract', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('outline_methods_contract')
    expect(repairBlock).toContain('大纲方法合同')
    expect(repairBlock).toContain('五步大纲创建法')
    expect(repairBlock).toContain('八节点故事结构')
    expect(repairBlock).toContain('爽文五阶段小循环')
    expect(repairBlock).toContain('情绪拉扯五折线')
    expect(repairBlock).toContain('相同金手指逻辑禁止连续使用')
    expect(repairBlock).toContain('outline_methods_contract: buildOutlineMethodsContract')
  })
  test('auto-repairs unattended chapter blueprint with oh-story emotion and paragraph hook contracts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('emotional_arc_contract')
    expect(repairBlock).toContain('chapter_hook_contract')
    expect(repairBlock).toContain('paragraph_hook_contract')
    expect(repairBlock).toContain('opening_contract')
    expect(repairBlock).toContain('suspense_contract')
    expect(repairBlock).toContain('reversal_contract')
    expect(repairBlock).toContain('let repairedEmotionAndHookBrief = buildChapterPreDraftBrief')
    expect(repairBlock).toContain('emotional_arc_contract: repairedEmotionAndHookBrief.emotional_arc_contract')
    expect(repairBlock).toContain('chapter_hook_contract: repairedEmotionAndHookBrief.chapter_hook_contract')
    expect(repairBlock).toContain('paragraph_hook_contract: repairedEmotionAndHookBrief.paragraph_hook_contract')
    expect(repairBlock).toContain('opening_contract: repairedEmotionAndHookBrief.opening_contract')
    expect(repairBlock).toContain('suspense_contract: repairedEmotionAndHookBrief.suspense_contract')
    expect(repairBlock).toContain('reversal_contract: repairedEmotionAndHookBrief.reversal_contract')
    expect(repairBlock).toContain('情绪弧合同')
    expect(repairBlock).toContain('章级钩子合同')
    expect(repairBlock).toContain('段落级钩子合同')
    expect(repairBlock).toContain('开篇合同')
    expect(repairBlock).toContain('悬念合同')
    expect(repairBlock).toContain('reader_preknowledge_rules')
    expect(repairBlock).toContain('trump_card_preposition_rules')
    expect(repairBlock).toContain('读者预知法')
    expect(repairBlock).toContain('底牌前置法')
    expect(repairBlock).toContain('first_impression_rules')
    expect(repairBlock).toContain('peak_end_rules')
    expect(repairBlock).toContain('emotion_layer_rules')
    expect(repairBlock).toContain('reaction_structure_rules')
    expect(repairBlock).toContain('ideological_conflict_rules')
    expect(repairBlock).toContain('先入为主')
    expect(repairBlock).toContain('峰终定律')
    expect(repairBlock).toContain('三层情绪')
    expect(repairBlock).toContain('前反应')
    expect(repairBlock).toContain('以小搏大')
    expect(repairBlock).toContain('理念矛盾')
    expect(repairBlock).toContain('反转合同')
  })
  test('auto-repairs unattended chapter blueprint with oh-story plot and prose quality contracts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('plot_dynamics_contract')
    expect(repairBlock).toContain('information_flow_contract')
    expect(repairBlock).toContain('expectation_threshold_contract')
    expect(repairBlock).toContain('story_loop_contract')
    expect(repairBlock).toContain('prose_craft_contract')
    expect(repairBlock).toContain('punctuation_tone_contract')
    expect(repairBlock).toContain('quality_audit_contract')
    expect(repairBlock).toContain('plot_dynamics_contract: repairedEmotionAndHookBrief.plot_dynamics_contract')
    expect(repairBlock).toContain('information_flow_contract: repairedEmotionAndHookBrief.information_flow_contract')
    expect(repairBlock).toContain('expectation_threshold_contract: repairedEmotionAndHookBrief.expectation_threshold_contract')
    expect(repairBlock).toContain('story_loop_contract: repairedEmotionAndHookBrief.story_loop_contract')
    expect(repairBlock).toContain('prose_craft_contract: repairedEmotionAndHookBrief.prose_craft_contract')
    expect(repairBlock).toContain('punctuation_tone_contract: repairedEmotionAndHookBrief.punctuation_tone_contract')
    expect(repairBlock).toContain('quality_audit_contract: repairedEmotionAndHookBrief.quality_audit_contract')
    expect(repairBlock).toContain('剧情动力合同')
    expect(repairBlock).toContain('信息流合同')
    expect(repairBlock).toContain('期待阈值合同')
    expect(repairBlock).toContain('expectation_relay_rules')
    expect(repairBlock).toContain('期待接力法')
    expect(repairBlock).toContain('故事循环合同')
    expect(repairBlock).toContain('正文工艺合同')
    expect(repairBlock).toContain('正文工艺短口径')
    expect(repairBlock).toContain('subject_name_rhythm_rules')
    expect(repairBlock).toContain('主语与名字节奏')
    expect(repairBlock).not.toContain('subject_name_rhythm_rules 必须包含主语与名字节奏')
    expect(repairBlock).toContain('indirect_description_rules')
    expect(repairBlock).toContain('间接描写法')
    expect(repairBlock).toContain('侧面反应才是爽点')
    expect(repairBlock).toContain('three_camera_rules')
    expect(repairBlock).toContain('三机位法')
    expect(repairBlock).toContain('设定都由冲突引出')
    expect(repairBlock).toContain('then_what_rules')
    expect(repairBlock).toContain('然后呢')
    expect(repairBlock).toContain('每一段文字')
    expect(repairBlock).toContain('core_emotion_alignment_rules')
    expect(repairBlock).toContain('围绕核心情绪设计全部情节')
    expect(repairBlock).toContain('宏观把控整体节奏')
    expect(repairBlock).toContain('baimiao_sensory_rules')
    expect(repairBlock).toContain('白描')
    expect(repairBlock).toContain('五感必须服务情绪')
    expect(repairBlock).not.toContain('baimiao_sensory_rules 必须包含白描 = 最少的字')
    expect(repairBlock).toContain('dynamic_description_rules')
    expect(repairBlock).toContain('动态描写优于静态描写')
    expect(repairBlock).toContain('动作和反应展现')
    expect(repairBlock).toContain('角色行动中穿插点染')
    expect(repairBlock).toContain('shot_rhythm_rules')
    expect(repairBlock).toContain('镜头与分镜思维')
    expect(repairBlock).toContain('远景/中景/近景/特写')
    expect(repairBlock).toContain('短句、短段、密集动作')
    expect(repairBlock).toContain('transition_bridge_rules')
    expect(repairBlock).toContain('场景切换与转场')
    expect(repairBlock).toContain('时间跳转')
    expect(repairBlock).toContain('动作或物件衔接')
    expect(repairBlock).toContain('声音或光影衔接')
    expect(repairBlock).toContain('section_density_rules')
    expect(repairBlock).toContain('anti_padding_rules')
    expect(repairBlock).toContain('小节密度诊断')
    expect(repairBlock).toContain('description_limits')
    expect(repairBlock).toContain('水分控制')
    expect(repairBlock).toContain('删掉这段后读者会不会困惑')
    expect(repairBlock).toContain('anti_ai_smell_rules')
    expect(repairBlock).toContain('高危词')
    expect(repairBlock).toContain('章末总结体')
    expect(repairBlock).toContain('叠加式描写')
    expect(repairBlock).toContain('语气标点合同')
    expect(repairBlock).toContain('质量诊断合同')
    expect(repairBlock).toContain('maxTokens: 6800')
  })
  test('auto-repairs unattended chapter blueprint with oh-story character asset and state contracts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('dialogue_contract')
    expect(repairBlock).toContain('continuity_heat_contract')
    expect(repairBlock).toContain('character_relation_contract')
    expect(repairBlock).toContain('character_behavior_contract')
    expect(repairBlock).toContain('asset_linkage_contract')
    expect(repairBlock).toContain('state_tracking_contract')
    expect(repairBlock).toContain('intent_confirmation_contract')
    expect(repairBlock).toContain('dialogue_contract: repairedEmotionAndHookBrief.dialogue_contract')
    expect(repairBlock).toContain('continuity_heat_contract: repairedEmotionAndHookBrief.continuity_heat_contract')
    expect(repairBlock).toContain('character_relation_contract: repairedEmotionAndHookBrief.character_relation_contract')
    expect(repairBlock).toContain('character_behavior_contract: repairedEmotionAndHookBrief.character_behavior_contract')
    expect(repairBlock).toContain('asset_linkage_contract: repairedEmotionAndHookBrief.asset_linkage_contract')
    expect(repairBlock).toContain('state_tracking_contract: repairedEmotionAndHookBrief.state_tracking_contract')
    expect(repairBlock).toContain('intent_confirmation_contract: repairedEmotionAndHookBrief.intent_confirmation_contract')
    expect(repairBlock).toContain('对白合同')
    expect(repairBlock).toContain('mode_playbooks')
    expect(repairBlock).toContain('power_length_rules')
    expect(repairBlock).toContain('subtext_agenda_rules')
    expect(repairBlock).toContain('tone_context_rules')
    expect(repairBlock).toContain('emotion_push_rules')
    expect(repairBlock).toContain('emotion_continuity_rules')
    expect(repairBlock).toContain('dialogue_drive_rules')
    expect(repairBlock).toContain('information_embed_rules')
    expect(repairBlock).toContain('information_tension_rules')
    expect(repairBlock).toContain('voice_differentiation_rules')
    expect(repairBlock).toContain('spectator_dialogue_rules')
    expect(repairBlock).toContain('dialogue_rhythm_rules')
    expect(repairBlock).toContain('dialogue_volume_rules')
    expect(repairBlock).toContain('dialogue_meme_rules')
    expect(repairBlock).toContain('dialogue_audit_rules')
    expect(repairBlock).toContain('掌控者/主角亮底牌时对白 ≤ 10 字')
    expect(repairBlock).toContain('真实动机绝对不能浅显地写在台词里')
    expect(repairBlock).toContain('命令式+否定式最能激发读者情绪')
    expect(repairBlock).toContain('用角色的语气和立场包裹信息')
    expect(repairBlock).toContain('口癖和惯用语')
    expect(repairBlock).toContain('关系阶段不同')
    expect(repairBlock).toContain('普通人震惊')
    expect(repairBlock).toContain('专业人士分析')
    expect(repairBlock).toContain('不代替主线')
    expect(repairBlock).toContain('连续多轮对话后需要换气')
    expect(repairBlock).toContain('关键信息放对话开头或结尾')
    expect(repairBlock).toContain('读者已知信息')
    expect(repairBlock).toContain('突发状况替代')
    expect(repairBlock).toContain('新人物必须安排主线戏份')
    expect(repairBlock).toContain('说不出来但意思到了')
    expect(repairBlock).toContain('不得直接复刻')
    expect(repairBlock).toContain('大量信息都必须用对话来展示')
    expect(repairBlock).toContain('问答式的一问一答')
    expect(repairBlock).toContain('依赖对话来推动剧情或人物变化')
    expect(repairBlock).toContain('遮住角色名后能否区分')
    expect(repairBlock).toContain('单次对话不超过全节 40%')
    expect(repairBlock).toContain('自然口语交流')
    expect(repairBlock).toContain('对话结尾能否预示接下来的节奏变化')
    expect(repairBlock).toContain('连续性热度合同')
    expect(repairBlock).toContain('角色关系合同')
    expect(repairBlock).toContain('expectation_hub_rules')
    expect(repairBlock).toContain('buffer_zone_rules')
    expect(repairBlock).toContain('配角期待枢纽')
    expect(repairBlock).toContain('任务基地')
    expect(repairBlock).toContain('短期和长期期待')
    expect(repairBlock).toContain('配角攻略缓冲区')
    expect(repairBlock).toContain('信息差、地位差距、亲密度差距或信任程度')
    expect(repairBlock).toContain('配角不能像 NPC 一样站着等主角触发')
    expect(repairBlock).toContain('角色行为合同')
    expect(repairBlock).toContain('strong_association_rules')
    expect(repairBlock).toContain('每个重要角色至少 3 个强关联设定')
    expect(repairBlock).toContain('资产挂钩合同')
    expect(repairBlock).toContain('prop_ability_expectation_rules')
    expect(repairBlock).toContain('道具能力展示的8步期待模板')
    expect(repairBlock).toContain('鸡肋成神器')
    expect(repairBlock).toContain('状态跟踪合同')
    expect(repairBlock).toContain('意图确认合同')
  })
  test('unattended character repair asks for layered missing role pools', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('任务：为无人值守章节写作自动补齐前置材料')
    const characterCreateStart = source.indexOf('const existingNames = new Set', repairStart)
    const repairBlock = source.slice(repairStart, characterCreateStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(characterCreateStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('primary_supporting')
    expect(repairBlock).toContain('secondary_supporting')
    expect(repairBlock).toContain('cameo_supporting')
    expect(repairBlock).toContain('antagonist_minor')
    expect(repairBlock).toContain('faction_agent')
    expect(repairBlock).toContain('antagonist_logic')
  })
  test('unattended character repair uses tier-aware candidate limits instead of first six', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')

    expect(source).toContain('selectTierAwareCharacterRepairCandidates')
    expect(source).not.toContain('characterCandidates.slice(0, 6)')
  })
  test('auto-repairs unattended chapter blueprint with oh-story reader genre upgrade and conflict contracts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('target_reader_contract')
    expect(repairBlock).toContain('genre_positioning_contract')
    expect(repairBlock).toContain('upgrade_rhythm_contract')
    expect(repairBlock).toContain('conflict_structure_contract')
    expect(repairBlock).toContain('target_reader_contract: repairedEmotionAndHookBrief.target_reader_contract')
    expect(repairBlock).toContain('genre_positioning_contract: repairedEmotionAndHookBrief.genre_positioning_contract')
    expect(repairBlock).toContain('upgrade_rhythm_contract: repairedEmotionAndHookBrief.upgrade_rhythm_contract')
    expect(repairBlock).toContain('conflict_structure_contract: repairedEmotionAndHookBrief.conflict_structure_contract')
    expect(repairBlock).toContain('目标读者合同')
    expect(repairBlock).toContain('题材定位合同')
    expect(repairBlock).toContain('micro_innovation_702010_rules')
    expect(repairBlock).toContain('70%来自过去经历和记忆')
    expect(repairBlock).toContain('micro_innovation_methods')
    expect(repairBlock).toContain('精炼法')
    expect(repairBlock).toContain('升级节奏合同')
    expect(repairBlock).toContain('ranking_ladder_rules')
    expect(repairBlock).toContain('排行榜提供升级动力')
    expect(repairBlock).toContain('goldfinger_feedback_rules')
    expect(repairBlock).toContain('把金手指带来变化的过程掺杂在故事里')
    expect(repairBlock).toContain('冲突结构合同')
    expect(repairBlock).toContain('maxTokens: 6800')
  })
  test('auto-repairs unattended chapter blueprint with oh-story female audience contract', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('female_audience_contract')
    expect(repairBlock).toContain('female_audience_contract: repairedEmotionAndHookBrief.female_audience_contract')
    expect(repairBlock).toContain('女频长篇合同')
    expect(repairBlock).toContain('安全感优先')
    expect(repairBlock).toContain('女主主动性')
    expect(repairBlock).toContain('感情线双轴')
    expect(repairBlock).toContain('每段虐后必给反转或糖')
    expect(repairBlock).toContain('番茄女生')
    expect(repairBlock).toContain('货板一致')
  })
  test('auto-repairs unattended chapter blueprint with oh-story showdown contract', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('showdown_contract')
    expect(repairBlock).toContain('showdown_contract: repairedEmotionAndHookBrief.showdown_contract')
    expect(repairBlock).toContain('高潮对抗合同')
    expect(repairBlock).toContain('爽点释放')
    expect(repairBlock).toContain('三压一爆三震')
    expect(repairBlock).toContain('友好势力')
    expect(repairBlock).toContain('群众层 -> 中间层 -> 核心层')
    expect(repairBlock).toContain('打斗是一场表演')
    expect(repairBlock).toContain('急 -> 缓 -> 急')
    expect(repairBlock).toContain('底牌管理')
    expect(repairBlock).toContain('每次只出1个')
    expect(repairBlock).toContain('invincible_protagonist_rules')
    expect(repairBlock).toContain('主角登场即杀伐果断')
  })
  test('auto-repairs unattended chapter blueprint with oh-story bridge unit contract', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('bridge_unit_contract')
    expect(repairBlock).toContain('bridge_unit_contract: repairedEmotionAndHookBrief.bridge_unit_contract')
    expect(repairBlock).toContain('桥段节奏合同')
    expect(repairBlock).toContain('四章一桥段')
    expect(repairBlock).toContain('高潮中埋钩子')
    expect(repairBlock).toContain('连续 2 章没有目标推进')
  })
  test('auto-repairs unattended chapter blueprint with oh-story plot framework contract', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('plot_framework_contract')
    expect(repairBlock).toContain('plot_framework_contract: repairedEmotionAndHookBrief.plot_framework_contract')
    expect(repairBlock).toContain('剧情框架合同')
    expect(repairBlock).toContain('题材→框架路由')
    expect(repairBlock).toContain('RPG结构与奖励设计')
    expect(repairBlock).toContain('框架与阵营手牌法')
    expect(repairBlock).toContain('套路模板重复法')
    expect(repairBlock).toContain('五不崩')
  })
  test('auto-repairs unattended chapter blueprint with oh-story style boundary contract', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('style_boundary_contract')
    expect(repairBlock).toContain('style_boundary_contract: repairedEmotionAndHookBrief.style_boundary_contract')
    expect(repairBlock).toContain('文风覆盖边界合同')
    expect(repairBlock).toContain('硬约束永远赢')
    expect(repairBlock).toContain('Gate F')
    expect(repairBlock).toContain('禁用词')
  })
  test('auto-repairs unattended chapter blueprint with persisted pre-draft launch briefs', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('previous_handoff: repairedEmotionAndHookBrief.previous_handoff')
    expect(repairBlock).toContain('reader_promise: repairedEmotionAndHookBrief.reader_promise')
    expect(repairBlock).toContain('emotional_curve: repairedEmotionAndHookBrief.emotional_curve')
    expect(repairBlock).toContain('platform_rubric: repairedEmotionAndHookBrief.platform_rubric')
    expect(repairBlock).toContain('content_rubric: repairedEmotionAndHookBrief.content_rubric')
    expect(repairBlock).toContain('reader_retention_brief: repairedEmotionAndHookBrief.reader_retention_brief')
    expect(repairBlock).toContain('story_drive_brief: repairedEmotionAndHookBrief.story_drive_brief')
    expect(repairBlock).toContain('serial_rhythm_brief: repairedEmotionAndHookBrief.serial_rhythm_brief')
    expect(repairBlock).toContain('page_turn_hook_brief: repairedEmotionAndHookBrief.page_turn_hook_brief')
    expect(repairBlock).toContain('benchmark_recall_brief: repairedEmotionAndHookBrief.benchmark_recall_brief')
    expect(repairBlock).toContain('core_contract_radar: repairedEmotionAndHookBrief.core_contract_radar')
  })
  test('auto-repairs unattended chapter blueprint with persisted longform continuity launch briefs', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
    const repairStart = source.indexOf('const autoRepairChapterPreflightGaps =')
    const settingsStart = source.indexOf('let latestSettings = settings', repairStart)
    const repairBlock = source.slice(repairStart, settingsStart)

    expect(repairStart).toBeGreaterThanOrEqual(0)
    expect(settingsStart).toBeGreaterThan(repairStart)
    expect(repairBlock).toContain('key_settings: repairedEmotionAndHookBrief.key_settings')
    expect(repairBlock).toContain('forbidden_content: repairedEmotionAndHookBrief.forbidden_content')
    expect(repairBlock).toContain('storyline_advances: repairedEmotionAndHookBrief.storyline_advances')
    expect(repairBlock).toContain('storyline_plants: repairedEmotionAndHookBrief.storyline_plants')
    expect(repairBlock).toContain('storyline_payoffs: repairedEmotionAndHookBrief.storyline_payoffs')
    expect(repairBlock).toContain('storyline_forbidden: repairedEmotionAndHookBrief.storyline_forbidden')
    expect(repairBlock).toContain('reader_drop_risk_brief: repairedEmotionAndHookBrief.reader_drop_risk_brief')
    expect(repairBlock).toContain('story_pressure_brief: repairedEmotionAndHookBrief.story_pressure_brief')
    expect(repairBlock).toContain('volume_climax_brief: repairedEmotionAndHookBrief.volume_climax_brief')
    expect(repairBlock).toContain('recent_fatigue_brief: repairedEmotionAndHookBrief.recent_fatigue_brief')
    expect(repairBlock).toContain('delivery_risk_carry_over: repairedEmotionAndHookBrief.delivery_risk_carry_over')
    expect(repairBlock).toContain('reader_expectation_debt: repairedEmotionAndHookBrief.reader_expectation_debt')
    expect(repairBlock).toContain('reader_expectation_ledger: repairedEmotionAndHookBrief.reader_expectation_ledger')
    expect(repairBlock).toContain('longform_compass: repairedEmotionAndHookBrief.longform_compass')
    expect(repairBlock).toContain('longform_memory_capsule: repairedEmotionAndHookBrief.longform_memory_capsule')
    expect(repairBlock).toContain('layered_memory_context: repairedEmotionAndHookBrief.layered_memory_context')
    expect(repairBlock).toContain('next_batch_brief: repairedEmotionAndHookBrief.next_batch_brief')
    expect(repairBlock).toContain('story_unit_context: repairedEmotionAndHookBrief.story_unit_context')
  })
  test('auto-repairs unattended chapter blueprint with persisted commercial style and scene briefs', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/auto-repair-preflight-methods.ts'), 'utf8')
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

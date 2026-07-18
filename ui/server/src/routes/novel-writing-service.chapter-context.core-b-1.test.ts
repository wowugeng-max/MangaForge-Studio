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

describe('chapter context word target source guards 1', () => {
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
    const source = [
      readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-word-target-helpers.ts'), 'utf8'),
    ].join('\n')
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
    expect(generationBlock).toContain('recordWordTargetExpansionPatch(wordTargetExpansionPatches')
    expect(source).toContain('wordTargetExpansionPatches.push')
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
})

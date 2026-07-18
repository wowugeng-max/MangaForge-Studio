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

describe('chapter context regression a b', () => {
  test('asks prose generation self review and revision to enforce oh-story subject name rhythm', () => {
    const source = ['paragraph-prose-context.ts','paragraph-prose-context-prepare.ts','paragraph-prose-context-prepare-default-five.ts','paragraph-prose-context-prepare-batch-memory.ts','paragraph-prose-context-sections.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const selfReviewSource = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const promptSectionsSource = [readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-shared.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-prep.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-hooks.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-craft.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-governance.ts'), 'utf8')].join('\n')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const proseCraftSnippetStart = promptSectionsSource.indexOf('function formatProseCraftPromptSnippet')
    const proseCraftSnippetEnd = promptSectionsSource.indexOf('function formatQualityAuditPhaseChecklist', proseCraftSnippetStart)
    const proseCraftPromptSource = `${prosePromptBlock}\n${promptSectionsSource.slice(proseCraftSnippetStart, proseCraftSnippetEnd)}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(proseCraftSnippetStart).toBeGreaterThanOrEqual(0)
    expect(proseCraftSnippetEnd).toBeGreaterThan(proseCraftSnippetStart)
    expect(proseCraftPromptSource).toContain('主语与名字节奏')
    expect(proseCraftPromptSource).toContain('段首、场景切换、多人同场、视角重置')
    expect(proseCraftPromptSource).toContain('同一动作链/同一段内部')
    expect(proseCraftPromptSource).toContain('优先用“他/她”、动作承接或省略主语')
    expect(proseCraftPromptSource).toContain('不要连续多句都以同一角色名开头')
    expect(reviewPrompt).toContain('主语与名字节奏')
    expect(reviewPrompt).toContain('每句都在报名字')
    expect(reviewPrompt).toContain('指代不清')
    expect(revisionPrompt).toContain('主语与名字节奏')
    expect(revisionPrompt).toContain('段首点名建立主语')
    expect(revisionPrompt).toContain('段中用代词/省略流动')
  })

  test('asks prose generation self review and revision to enforce oh-story natural paragraph rhythm', () => {
    const source = ['paragraph-prose-context.ts','paragraph-prose-context-prepare.ts','paragraph-prose-context-prepare-default-five.ts','paragraph-prose-context-prepare-batch-memory.ts','paragraph-prose-context-sections.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const selfReviewSource = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
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
    expect(prosePromptBlock).toContain('自然节奏重排')
    expect(prosePromptBlock).toContain('断段按镜头/信息变化')
    expect(prosePromptBlock).toContain('新动作、新物件、新信息、新对话、视线转移、场景结束')
    expect(prosePromptBlock).toContain('不要把完整推理链切成机械碎片')
    expect(reviewPrompt).toContain('自然节奏重排')
    expect(reviewPrompt).toContain('连续多个极短段仍属于同一镜头')
    expect(reviewPrompt).toContain('一段塞进多个动作/信息/视线切换')
    expect(revisionPrompt).toContain('自然节奏重排')
    expect(revisionPrompt).toContain('同一镜头里的动作、感知和反应')
    expect(revisionPrompt).toContain('只在新动作、新信息、对话或转折处断段')
  })

  test('asks prose generation self review and revision to enforce oh-story specific character-count expression guard', () => {
    const source = ['paragraph-prose-context.ts','paragraph-prose-context-prepare.ts','paragraph-prose-context-prepare-default-five.ts','paragraph-prose-context-prepare-batch-memory.ts','paragraph-prose-context-sections.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const selfReviewSource = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
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
    expect(prosePromptBlock).toContain('具体字数表达校验')
    expect(prosePromptBlock).toContain('这五个字 / 短短四字 / 三个字一落 / 八个字砸下去')
    expect(prosePromptBlock).toContain('这句话一落')
    expect(reviewPrompt).toContain('具体字数表达校验')
    expect(reviewPrompt).toContain('短短四字')
    expect(reviewPrompt).toContain('prose_craft_checks')
    expect(revisionPrompt).toContain('具体字数表达')
    expect(revisionPrompt).toContain('这句话一落')
  })

  test('asks prose generation self review and revision to enforce oh-story external fact research guard', () => {
    const source = ['paragraph-prose-context.ts','paragraph-prose-context-prepare.ts','paragraph-prose-context-prepare-default-five.ts','paragraph-prose-context-prepare-batch-memory.ts','paragraph-prose-context-sections.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const selfReviewSource = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
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
    expect(prosePromptBlock).toContain('外部事实查证')
    expect(prosePromptBlock).toContain('历史年代、地理方位、职业细节')
    expect(prosePromptBlock).toContain('不得编造')
    expect(prosePromptBlock).toContain('资料研究')
    expect(reviewPrompt).toContain('外部事实查证')
    expect(reviewPrompt).toContain('factual_checks')
    expect(reviewPrompt).toContain('category=factual')
    expect(revisionPrompt).toContain('factual_checks')
    expect(revisionPrompt).toContain('不得把未查证内容改写成确定事实')
  })

  test('asks prose generation self review and revision to enforce oh-story supporting-character buffer zones', () => {
    const source = ['paragraph-prose-context.ts','paragraph-prose-context-prepare.ts','paragraph-prose-context-prepare-default-five.ts','paragraph-prose-context-prepare-batch-memory.ts','paragraph-prose-context-sections.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const selfReviewSource = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
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
    expect(prosePromptBlock).toContain('配角攻略缓冲区')
    expect(prosePromptBlock).toContain('信息差、地位差距、亲密度差距或信任程度')
    expect(prosePromptBlock).toContain('配角不能像 NPC 一样站着等主角触发')
    expect(reviewPrompt).toContain('配角攻略缓冲区')
    expect(reviewPrompt).toContain('buffer_zone')
    expect(reviewPrompt).toContain('character_relation_checks')
    expect(revisionPrompt).toContain('配角攻略缓冲区')
    expect(revisionPrompt).toContain('信息差、地位差距、亲密度差距或信任程度')
  })

  test('asks prose generation self review and revision to enforce oh-story section density diagnosis', () => {
    const source = ['paragraph-prose-context.ts','paragraph-prose-context-prepare.ts','paragraph-prose-context-prepare-default-five.ts','paragraph-prose-context-prepare-batch-memory.ts','paragraph-prose-context-sections.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const selfReviewSource = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const promptSectionsSource = [readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-shared.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-prep.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-hooks.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-craft.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-governance.ts'), 'utf8')].join('\n')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const proseCraftSnippetStart = promptSectionsSource.indexOf('function formatProseCraftPromptSnippet')
    const proseCraftSnippetEnd = promptSectionsSource.indexOf('function formatQualityAuditPhaseChecklist', proseCraftSnippetStart)
    const proseCraftPromptSource = `${prosePromptBlock}\n${promptSectionsSource.slice(proseCraftSnippetStart, proseCraftSnippetEnd)}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(proseCraftSnippetStart).toBeGreaterThanOrEqual(0)
    expect(proseCraftSnippetEnd).toBeGreaterThan(proseCraftSnippetStart)
    expect(proseCraftPromptSource).toContain('小节内部结构')
    expect(proseCraftPromptSource).toContain('一个主事件')
    expect(proseCraftPromptSource).toContain('3-5 个子事件')
    expect(proseCraftPromptSource).toContain('一个情绪变化')
    expect(proseCraftPromptSource).toContain('一条读者新获知的信息')
    expect(proseCraftPromptSource).toContain('3-5 轮对话交锋')
    expect(proseCraftPromptSource).toContain('小节结尾留一个钩子')
    expect(proseCraftPromptSource).toContain('下一节开头快速接续')
    expect(proseCraftPromptSource).toContain('情绪跨节递进')
    expect(proseCraftPromptSource).toContain('小节密度诊断')
    expect(proseCraftPromptSource).toContain('偏短不得加环境描写')
    expect(proseCraftPromptSource).toContain('子事件三维度')
    expect(proseCraftPromptSource).toContain('对话交锋')
    expect(proseCraftPromptSource).toContain('简短回忆')
    expect(reviewPrompt).toContain('小节密度诊断检查')
    expect(reviewPrompt).toContain('小节内部结构')
    expect(reviewPrompt).toContain('下一节开头快速接续')
    expect(reviewPrompt).toContain('情绪跨节递进')
    expect(reviewPrompt).toContain('为凑字数加环境描写')
    expect(reviewPrompt).toContain('无意义动作')
    expect(reviewPrompt).toContain('prose_craft_checks')
    expect(revisionPrompt).toContain('小节密度诊断')
    expect(revisionPrompt).toContain('小节结构')
    expect(revisionPrompt).toContain('主事件 + 3-5 个子事件')
    expect(revisionPrompt).toContain('下一节开头快速接续')
    expect(revisionPrompt).toContain('补感官细节、身体动作、对话交锋或2-3句简短回忆')
    expect(revisionPrompt).toContain('不得用环境描写、重复情绪或内心独白凑字数')
  })

  test('asks prose generation self review and revision to enforce oh-story event content ratio', () => {
    const source = ['paragraph-prose-context.ts','paragraph-prose-context-prepare.ts','paragraph-prose-context-prepare-default-five.ts','paragraph-prose-context-prepare-batch-memory.ts','paragraph-prose-context-sections.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const selfReviewSource = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const promptSectionsSource = [readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-shared.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-prep.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-hooks.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-craft.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-governance.ts'), 'utf8')].join('\n')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = `${source.slice(prosePromptStart, prosePromptEnd)}
${selfReviewSource}`
    const qualityAuditPromptStart = promptSectionsSource.indexOf('export function buildQualityAuditPromptSection')
    const prosePromptSource = `${prosePromptBlock}\n${promptSectionsSource.slice(qualityAuditPromptStart)}`
    const reviewPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseReviewPrompt'),
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = selfReviewSource.slice(
      selfReviewSource.indexOf('const buildProseRevisionPrompt'),
      selfReviewSource.indexOf('const shouldReviseProse'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(qualityAuditPromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptSource).toContain('事件内容比重不能小于一半')
    expect(prosePromptSource).toContain('事件是价值改变的契机')
    expect(prosePromptSource).toContain('设定尽量通过事件演绎')
    expect(reviewPrompt).toContain('事件内容比重')
    expect(reviewPrompt).toContain('设定尽量通过事件演绎')
    expect(reviewPrompt).toContain('quality_audit_checks')
    expect(revisionPrompt).toContain('事件内容比重')
    expect(revisionPrompt).toContain('旁白强塞')
    expect(revisionPrompt).toContain('动作、选择、阻碍、代价或局势变化')
  })

  test('asks prose self review and revision to enforce scene-card density execution', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(reviewPrompt).toContain('scene_cards.density_level')
    expect(reviewPrompt).toContain('疏密分配')
    expect(reviewPrompt).toContain('dense 的爽点/打脸/反转/情绪高潮')
    expect(reviewPrompt).toContain('sparse 的过场/赶路/信息交代/时间跳转')
    expect(reviewPrompt).toContain('medium 的铺垫/日常/关系升温')
    expect(reviewPrompt).toContain('prose_craft_checks')
    expect(reviewPrompt).toContain('density_level 执行')
    expect(revisionPrompt).toContain('scene_cards.density_level')
    expect(revisionPrompt).toContain('疏密分配')
    expect(revisionPrompt).toContain('density_level 执行偏差')
    expect(revisionPrompt).toContain('revision_receipts')
  })

  test('asks prose self review and revision to enforce scene-card sensory anchors', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(reviewPrompt).toContain('scene_cards.sensory_anchor')
    expect(reviewPrompt).toContain('感知素材库')
    expect(reviewPrompt).toContain('感知是主角主动注意到的细节')
    expect(reviewPrompt).toContain('装饰性场景描写')
    expect(revisionPrompt).toContain('scene_cards.sensory_anchor')
    expect(revisionPrompt).toContain('感知锚点执行偏差')
    expect(revisionPrompt).toContain('主角主动注意到')
  })

  test('asks prose generation self review and revision to enforce scene-card serial risk repairs', () => {
    const source = ['paragraph-prose-context.ts','paragraph-prose-context-prepare.ts','paragraph-prose-context-prepare-default-five.ts','paragraph-prose-context-prepare-batch-memory.ts','paragraph-prose-context-sections.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const selfReviewSource = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
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
    const structuredFieldsSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/structured-review-fields.ts'), 'utf8')
    const reviewFieldList = structuredFieldsSource.slice(
      structuredFieldsSource.indexOf('export const STRUCTURED_REVIEW_CHECK_FIELDS'),
      structuredFieldsSource.indexOf('export const STRUCTURED_REVIEW_REQUIRED_FIELDS'),
    )

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('scene_cards.serial_risk_repairs')
    expect(prosePromptBlock).toContain('scene_cards.recent_fatigue_action')
    expect(prosePromptBlock).toContain('风险修复动作')
    expect(prosePromptBlock).toContain('目标推进、阻碍升级、新信息、关系/世界调剂或冲突冷却')
    expect(reviewPrompt).toContain('scene_cards.serial_risk_repairs')
    expect(reviewPrompt).toContain('recent_fatigue_action')
    expect(reviewPrompt).toContain('serial_risk_repair_checks')
    expect(reviewPrompt).toContain('可见事件')
    expect(revisionPrompt).toContain('scene_cards.serial_risk_repairs')
    expect(revisionPrompt).toContain('serial_risk_repair_checks')
    expect(revisionPrompt).toContain('风险修复动作')
    expect(reviewFieldList).toContain("['serial_risk_repair_checks', 'serialRiskRepairChecks']")
  })

  test('asks prose generation to output per-scene scene-card execution receipts', () => {
    const source = ['paragraph-prose-context.ts','paragraph-prose-context-prepare.ts','paragraph-prose-context-prepare-default-five.ts','paragraph-prose-context-prepare-batch-memory.ts','paragraph-prose-context-sections.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = source.slice(prosePromptStart, prosePromptEnd)

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('scene_card_receipts')
    expect(prosePromptBlock).toContain('goal_obstacle_change_delivered')
    expect(prosePromptBlock).toContain('purpose_tag_delivered')
    expect(prosePromptBlock).toContain('density_level_delivered')
    expect(prosePromptBlock).toContain('sensory_anchor_delivered')
    expect(prosePromptBlock).toContain('serial_risk_repairs_delivered')
    expect(prosePromptBlock).toContain('dialogue_goals_delivered')
    expect(prosePromptBlock).toContain('style_directives_delivered')
    expect(prosePromptBlock).toContain('benchmark_recall_directives_delivered')
    expect(prosePromptBlock).toContain('concept_anchor_rules_delivered')
    expect(prosePromptBlock).toContain('prose_craft_directives_delivered')
    expect(prosePromptBlock).toContain('evidence(array)')
    expect(prosePromptBlock).toContain('scene_start_anchor')
    expect(prosePromptBlock).toContain('scene_end_anchor')
    expect(prosePromptBlock).toContain('不能只写“已完成”')
  })

  test('asks prose generation to output top-level oh-story delivery receipts for storage', () => {
    const source = ['paragraph-prose-context.ts','paragraph-prose-context-prepare.ts','paragraph-prose-context-prepare-default-five.ts','paragraph-prose-context-prepare-batch-memory.ts','paragraph-prose-context-sections.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const prosePromptStart = source.indexOf('任务：按场景卡生成章节正文')
    const prosePromptEnd = source.length
    const prosePromptBlock = source.slice(prosePromptStart, prosePromptEnd)

    expect(prosePromptStart).toBeGreaterThanOrEqual(0)
    expect(prosePromptBlock).toContain('oh_story_delivery_receipts')
    expect(prosePromptBlock).toContain('chapter_blueprint')
    expect(prosePromptBlock).toContain('scene_card_receipts')
    expect(prosePromptBlock).toContain('delivery_risk_receipts')
    expect(prosePromptBlock).toContain('revision_receipts')
    expect(prosePromptBlock).toContain('artifact_protocol_receipts')
    expect(prosePromptBlock).toContain('设定/关系.md')
    expect(prosePromptBlock).toContain('大纲/细纲_第XXX章.md')
    expect(prosePromptBlock).toContain('追踪/角色状态.md')
    expect(prosePromptBlock).toContain('changed_evidence 必须引用 chapter_text')
  })

  test('asks prose self review and revision to enforce artifact protocol receipts', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(reviewPrompt).toContain('artifact_protocol_receipts')
    expect(reviewPrompt).toContain('artifact_path')
    expect(reviewPrompt).toContain('required_fields')
    expect(reviewPrompt).toContain('设定/题材定位.md')
    expect(revisionPrompt).toContain('artifact_protocol_receipts')
    expect(revisionPrompt).toContain('设定/关系.md')
    expect(revisionPrompt).toContain('追踪/时间线.md')
  })

  test('asks prose self review and revision to verify scene-card execution receipts', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(reviewPrompt).toContain('scene_card_receipts')
    expect(reviewPrompt).toContain('goal_obstacle_change_delivered')
    expect(reviewPrompt).toContain('concept_anchor_rules_delivered')
    expect(reviewPrompt).toContain('prose_craft_directives_delivered')
    expect(reviewPrompt).toContain('不能信任回执自述')
    expect(reviewPrompt).toContain('正文证据')
    expect(revisionPrompt).toContain('scene_card_receipts')
    expect(revisionPrompt).toContain('scene_start_anchor')
    expect(revisionPrompt).toContain('scene_end_anchor')
    expect(revisionPrompt).toContain('修订后必须重写')
    expect(revisionPrompt).toContain('delivered=false')
  })

  test('asks prose self review and revision to enforce oh-story quality audit checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const shouldReviseBlock = source.slice(
      source.indexOf('const shouldReviseProse'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )
    const reviewPreparationBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('const normalizedReview = {', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )
    const riskSource = proseQualityRisksSource()
    const riskStart = riskSource.indexOf('export function proseQualityQualityAuditRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.quality_audit_contract')
    expect(reviewPrompt).toContain('quality_audit_checks')
    expect(reviewPrompt).toContain('五维评分标准')
    expect(reviewPrompt).toContain('five_dimension_scores')
    expect(reviewPrompt).toContain('水文检测')
    expect(reviewPrompt).toContain('卖点表达')
    expect(reviewPrompt).toContain('发现比告知爽十倍')
    expect(reviewPrompt).toContain('开头暗示')
    expect(reviewPrompt).toContain('中间深化')
    expect(reviewPrompt).toContain('高潮爆发')
    expect(reviewPrompt).toContain('phase_checklist')
    expect(reviewPrompt).toContain('按阶段质量清单逐项覆盖对应 receipt_keys')
    expect(revisionPrompt).toContain('quality_audit_checks')
    expect(revisionPrompt).toContain('质量诊断')
    expect(revisionPrompt).toContain('卖点表达')
    expect(revisionPrompt).toContain('隐性展示')
    expect(revisionPrompt).toContain('开头暗示')
    expect(revisionPrompt).toContain('中间深化')
    expect(revisionPrompt).toContain('高潮爆发')
    expect(revisionPrompt).toContain('quality_audit_repair_receipts')
    expect(revisionPrompt).toContain('逐条对应 quality_audit_checks 中 status=fail/warn 的诊断项')
    expect(revisionPrompt).toContain('check_key, label, original_evidence, applied_fix, changed_evidence, remaining_risk')
    expect(shouldReviseBlock).toContain('quality_audit_checks')
    expect(reviewNormalizeBlock).toContain('quality_audit_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.quality_audit_checks')
    expect(reviewNormalizeBlock).toContain('five_dimension_scores: normalizeFiveDimensionQualityScores')
    expect(reviewPreparationBlock).toContain('const deterministicNewConceptChecks = scanNewConceptOverloadRisks(contextPackage)')
    expect(reviewPreparationBlock).toContain('const deterministicScaleAnchorChecks = scanEconomicPowerScaleAnchorRisks(chapterText)')
    expect(reviewNormalizeBlock).toContain('...deterministicNewConceptChecks')
    expect(reviewNormalizeBlock).toContain('...deterministicScaleAnchorChecks')
    expect(riskCarryOverBlock).toContain('quality_audit_checks')
    expect(riskCarryOverBlock).toContain('质量诊断')
  })

  test('asks prose self review and revision to enforce oh-story punctuation tone checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const shouldReviseBlock = source.slice(
      source.indexOf('const shouldReviseProse'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )
    const riskSource = proseQualityRisksSource()
    const riskStart = riskSource.indexOf('export function proseQualityPunctuationToneRisks')
    const riskCarryOverBlock = riskSource.slice(riskStart, riskSource.indexOf('\nexport function', riskStart + 1))

    expect(reviewPrompt).toContain('chapter_target.punctuation_tone_contract')
    expect(reviewPrompt).toContain('punctuation_tone_checks')
    expect(reviewPrompt).toContain('通篇句号化')
    expect(reviewPrompt).toContain('随机标点堆砌')
    expect(revisionPrompt).toContain('punctuation_tone_checks')
    expect(revisionPrompt).toContain('语气标点')
    expect(shouldReviseBlock).toContain('punctuation_tone_checks')
    expect(reviewNormalizeBlock).toContain('punctuation_tone_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.punctuation_tone_checks')
    expect(riskCarryOverBlock).toContain('punctuation_tone_checks')
    expect(riskCarryOverBlock).toContain('语气标点')
  })

  test('asks prose generation self review and revision to enforce oh-story punctuation function beats', () => {
    const source = ['paragraph-prose-context.ts','paragraph-prose-context-prepare.ts','paragraph-prose-context-prepare-default-five.ts','paragraph-prose-context-prepare-batch-memory.ts','paragraph-prose-context-sections.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const selfReviewSource = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
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
    expect(prosePromptBlock).toContain('被打断 / 拖长音')
    expect(prosePromptBlock).toContain('动作打断、换行、短句或未完成动作')
    expect(prosePromptBlock).toContain('信息揭示 / 判断落点')
    expect(prosePromptBlock).toContain('冒号或短句制造落点')
    expect(prosePromptBlock).toContain('不写论文式长分号链')
    expect(reviewPrompt).toContain('被打断 / 拖长音')
    expect(reviewPrompt).toContain('信息揭示 / 判断落点')
    expect(reviewPrompt).toContain('论文式长分号链')
    expect(revisionPrompt).toContain('动作打断、换行或短句')
    expect(revisionPrompt).toContain('冒号或短句制造信息揭示落点')
  })

})

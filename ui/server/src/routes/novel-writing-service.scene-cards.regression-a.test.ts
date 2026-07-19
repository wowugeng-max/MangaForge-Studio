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

const readWritingServicePackageSource = () => [
  readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'),
  ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n'),
  ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/service/chapter-context-package.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/quality/review-merge.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/quality/missing-review-checks.ts'), 'utf8'),
  [readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/delta-sync-reports.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/delta-sync-reports-storyline.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/delta-sync-reports-receipts.ts'), 'utf8')].join('\n'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/core-handoff-sync-reports.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports.ts'), 'utf8'),
  [readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-benchmark-audit.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-benchmark-audit-quality.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-benchmark-audit-dialogue.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-benchmark-audit-character.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-benchmark-audit-asset.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-benchmark-audit-state.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-benchmark-audit-structure.ts'), 'utf8')].join('\n'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/quality-sync-reports-core.ts'), 'utf8'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8'),
].join('\n')

describe('normalizeSceneCardsPayload regression a', () => {
  test('wires deterministic dialogue density risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueDensityChecks = scanDialogueDensityRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueDensityChecks')
  })

  test('detects embedded dialogue and mechanical dialogue tags as oh-story format risks', () => {
    const checks = scanDialogueFormatRisks([
      '第12章 管理员',
      '',
      '她把杯子放下，说道：“你走吧。”他没有动。',
      '林智道：“门外那个人在撒谎。”',
      '"别动。"',
    ].join('\n'))

    expect(checks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'dialogue_embedded_line_3',
      'dialogue_mechanical_tag_line_3',
      'dialogue_mechanical_tag_line_4',
    ]))
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('对白独立成行')
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('动作或上下文')
    expect(checks.map((item: any) => item.evidence).join('｜')).not.toContain('"别动。"')
  })

  test('detects trailing formulaic dialogue tags from oh-story examples', () => {
    const checks = scanDialogueFormatRisks([
      '第12章 管理员',
      '',
      '"好的。"他说道。',
      '"门外有人。"她问道。',
      '"别动。"他点了根烟。',
    ].join('\n'))

    const mechanicalTagChecks = checks.filter((item: any) => String(item.key || '').startsWith('dialogue_mechanical_tag_line_'))
    expect(mechanicalTagChecks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'dialogue_mechanical_tag_line_3',
      'dialogue_mechanical_tag_line_4',
    ]))
    expect(mechanicalTagChecks.map((item: any) => item.evidence).join('｜')).toContain('"好的。"他说道')
    expect(mechanicalTagChecks.map((item: any) => item.fix).join('｜')).toContain('动作或上下文')
    expect(mechanicalTagChecks.map((item: any) => item.evidence).join('｜')).not.toContain('点了根烟')
  })

  test('wires deterministic dialogue-format risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueFormatChecks = scanDialogueFormatRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueFormatChecks')
  })

  test('detects mixed dialogue quote styles before relying on model self review', () => {
    const checks = scanDialogueQuoteStyleRisks([
      '第12章 管理员',
      '',
      '"别开门。"',
      '「你听见了吗？」',
      '"门外那个人在撒谎。"',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_quote_style_mixed')
    expect(checks[0].label).toBe('对白引号风格扫描')
    expect(checks[0].evidence).toContain('"别开门。"')
    expect(checks[0].evidence).toContain('「你听见了吗？」')
    expect(checks[0].fix).toContain('统一')
    expect(checks[0].fix).toContain('项目/平台')
  })

  test('wires deterministic dialogue quote style risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueQuoteStyleChecks = scanDialogueQuoteStyleRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueQuoteStyleChecks')
  })

  test('detects dialogue power balance risks when both sides use long speeches in pressure scenes', () => {
    const checks = scanDialoguePowerBalanceRisks([
      '第12章 管理员',
      '',
      '「你以为把门关上就有用吗？我告诉你，今晚宿舍每个人都看见你拿了那张卡，你现在不开门，明天就等着全楼一起指认你。」',
      '「你不要以为这样就能吓住我，我已经把监控时间、值班表和门锁记录都查过了，你们所谓的证据只是诱导我违反规则。」',
      '门缝里的水迹停住了。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toContain('dialogue_power_balance')
    expect(checks[0].label).toBe('对白权力差扫描')
    expect(checks[0].evidence).toContain('你以为把门关上就有用吗')
    expect(checks[0].evidence).toContain('你不要以为这样就能吓住我')
    expect(checks[0].fix).toContain('掌控者')
    expect(checks[0].fix).toContain('短句')
  })

  test('wires deterministic dialogue power balance risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialoguePowerBalanceChecks = scanDialoguePowerBalanceRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialoguePowerBalanceChecks')
  })

  test('detects face-slap dialogue where protagonist explains longer than the antagonist pressures', () => {
    const checks = scanDialogueProtagonistLineEconomyRisks([
      '第12章 公审台',
      '',
      '执事把旧账册摔到审判桌上。',
      '"你输了。"',
      '"我没有输，因为昨晚监控少了三分钟，账册第三页也不是我撕的，录音和检测报告都能证明你们诱导我承认。"',
      '"解释没有用。"',
      '"转账截图、旧印编号和报告编号已经连起来了，足够反证旧账册。"',
      '李辰把报告推到灯下，执事脸色惨白。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_protagonist_line_economy')
    expect(checks[0].label).toBe('主角台词短句扫描')
    expect(checks[0].evidence).toContain('你输了')
    expect(checks[0].evidence).toContain('我没有输')
    expect(checks[0].fix).toContain('主角台词')
    expect(checks[0].fix).toContain('短')
  })

  test('does not flag face-slap dialogue when antagonist talks longer and protagonist uses short control lines', () => {
    const checks = scanDialogueProtagonistLineEconomyRisks([
      '第12章 公审台',
      '',
      '执事把旧账册摔到审判桌上。',
      '"你以为把报告拿出来就能翻案吗？旧账册、库房记录和昨晚值守名单全都指向你，现在认罪还来得及。"',
      '"第三页。"',
      '"什么第三页？"',
      '"念。"',
      '李辰把检测报告推到灯下，旧账册当场被反证。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic protagonist line economy risks into dialogue self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueProtagonistLineEconomyChecks = scanDialogueProtagonistLineEconomyRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueProtagonistLineEconomyChecks')
  })

  test('detects interview-like question answer dialogue loops', () => {
    const checks = scanDialogueQuestionAnswerLoopRisks([
      '第12章 管理员',
      '"你昨晚在哪里？"',
      '"宿舍。"',
      '"谁能证明？"',
      '"张智。"',
      '"你为什么离开过三楼？"',
      '"广播让我去楼梯口。"',
      '门缝里的水迹往里挪了一寸。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_question_answer_loop')
    expect(checks[0].label).toBe('问答式对白扫描')
    expect(checks[0].evidence).toContain('你昨晚在哪里')
    expect(checks[0].evidence).toContain('广播让我去楼梯口')
    expect(checks[0].fix).toContain('一问一答')
    expect(checks[0].fix).toContain('动作/表情/心理')
  })

  test('wires deterministic dialogue question answer loops into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueQuestionAnswerLoopChecks = scanDialogueQuestionAnswerLoopRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueQuestionAnswerLoopChecks')
  })

  test('detects face-slap dialogue that explains evidence without judgment questions', () => {
    const checks = scanDialogueJudgmentQuestionRisks([
      '第12章 公审台',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼李辰认罪。',
      '"你现在解释也没用，旧账册已经写明你昨晚进过库房。"',
      '"我没有进库房，监控少了三分钟，账册缺页也不是我撕的，你们所谓的证据只是诱导我承认。"',
      '"那你倒是拿出证据。"',
      '"录音、检测报告和转账截图都在这里，足够反证旧账册。"',
      '李辰把报告推到灯下，执事脸色惨白。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_judgment_questions_missing')
    expect(checks[0].label).toBe('审判式对白扫描')
    expect(checks[0].evidence).toContain('旧账册')
    expect(checks[0].fix).toContain('审判式提问')
    expect(checks[0].fix).toContain('自爆')
  })

  test('does not flag face-slap dialogue when short judgment questions force self-incrimination', () => {
    const checks = scanDialogueJudgmentQuestionRisks([
      '第12章 公审台',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼李辰认罪。',
      '"第三页是谁撕的？"',
      '"我怎么知道第三页被撕了？"',
      '"那枚旧印为什么在你袖口？"',
      '"不可能，我明明把旧印收进暗格了。"',
      '李辰把录音和检测报告推到灯下，旧账册当场被反证。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic judgment-question risks into dialogue self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueJudgmentQuestionChecks = scanDialogueJudgmentQuestionRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueJudgmentQuestionChecks')
  })

  test('detects dialogue that states true motive instead of subtext and agenda', () => {
    const checks = scanDialogueSubtextAgendaRisks([
      '第12章 管理员',
      '"我的目的就是让你开门，然后把规则册交出来。"',
      '李辰没有动。',
      '"你不该把真正想要的东西说得这么清楚。"',
    ].join('\n'))

    expect(checks).toHaveLength(2)
    expect(checks[0].key).toBe('dialogue_subtext_agenda_line_2')
    expect(checks[0].label).toBe('潜台词与议程扫描')
    expect(checks[0].evidence).toContain('我的目的')
    expect(checks[0].fix).toContain('真实动机')
    expect(checks[0].fix).toContain('借口')
    expect(checks[0].fix).toContain('试探')
  })

  test('wires deterministic dialogue subtext agenda risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueSubtextAgendaChecks = scanDialogueSubtextAgendaRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueSubtextAgendaChecks')
  })

  test('detects empty side-character praise dialogue as fake support', () => {
    const checks = scanDialogueEmptyPraiseRisks([
      '第12章 管理员',
      '"李辰，你太厉害了，大家全靠你了。"',
      '"不愧是你，没人比得上你。"',
      '张智只看着门缝，没有接话。',
    ].join('\n'))

    expect(checks).toHaveLength(2)
    expect(checks[0].key).toBe('dialogue_empty_praise_line_2')
    expect(checks[0].label).toBe('空泛夸赞对白扫描')
    expect(checks[0].evidence).toContain('你太厉害了')
    expect(checks[0].fix).toContain('配角无脑夸主角')
    expect(checks[0].fix).toContain('代价')
  })

  test('wires deterministic empty praise dialogue risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueEmptyPraiseChecks = scanDialogueEmptyPraiseRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueEmptyPraiseChecks')
  })

  test('detects abrupt dialogue emotion jumps without transition beats', () => {
    const checks = scanDialogueEmotionContinuityRisks([
      '第12章 管理员',
      '"我快撑不住了，门后那东西一直在笑。"',
      '"哈哈，别紧张，今晚还挺有意思的。"',
      '走廊的灯没有任何变化。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_emotion_continuity_lines_2_3')
    expect(checks[0].label).toBe('对白情绪连续性扫描')
    expect(checks[0].evidence).toContain('快撑不住了')
    expect(checks[0].evidence).toContain('还挺有意思')
    expect(checks[0].fix).toContain('过渡动作')
    expect(checks[0].fix).toContain('情绪台阶')
  })

  test('detects dialogue that ignores the previous line emotion and switches to procedure', () => {
    const brokenChecks = scanDialogueEmotionContinuityRisks([
      '第12章 管理员',
      '"我怕，手一直在抖，求你别开门。"',
      '"按流程，先把钥匙编号，再记录门牌和名单。"',
      '走廊里只有纸页翻动的声音。',
    ].join('\n'))
    const anchoredChecks = scanDialogueEmotionContinuityRisks([
      '第12章 管理员',
      '"我怕，手一直在抖，求你别开门。"',
      '"我知道你怕。看着我，先呼吸，钥匙给我，我来编号。"',
      '张智把手压在门把上，没有立刻开门。',
    ].join('\n'))

    expect(brokenChecks).toHaveLength(1)
    expect(brokenChecks[0].key).toBe('dialogue_emotion_nonresponse_lines_2_3')
    expect(brokenChecks[0].label).toBe('对白情绪承接扫描')
    expect(brokenChecks[0].evidence).toContain('求你别开门')
    expect(brokenChecks[0].evidence).toContain('按流程')
    expect(brokenChecks[0].fix).toContain('回应上一句对方的情绪状态')
    expect(anchoredChecks).toHaveLength(0)
  })

  test('wires deterministic dialogue emotion continuity risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueEmotionContinuityChecks = scanDialogueEmotionContinuityRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueEmotionContinuityChecks')
  })

  test('detects dialogue that makes a character instantly persuaded by explanation', () => {
    const checks = scanDialogueEasyPersuasionRisks([
      '第12章 管理员',
      '"因为广播只在整点响，所以门后的不是管理员。"',
      '"只要你现在把钥匙交给我，我们就能避开下一轮点名。"',
      '"你说得对，我被你说服了，就按你说的办。"',
      '门外仍然没有任何动静。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_easy_persuasion_lines_2_4')
    expect(checks[0].label).toBe('对白说服人物扫描')
    expect(checks[0].evidence).toContain('因为广播只在整点响')
    expect(checks[0].evidence).toContain('你说得对')
    expect(checks[0].fix).toContain('突发状况')
    expect(checks[0].fix).toContain('证据')
  })

  test('wires deterministic dialogue easy persuasion risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueEasyPersuasionChecks = scanDialogueEasyPersuasionRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueEasyPersuasionChecks')
  })

  test('detects ending summary uplift as Gate F prose smell', () => {
    const checks = scanEndingSummaryRisks([
      '第13章 门后名单',
      '',
      '李辰把书本收进书包，走廊终于安静下来。',
      '经历了这一切，他终于明白，这只是新的开始，未来还有更大的挑战等着他。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('F')
    expect(checks[0].pattern).toContain('章末总结')
    expect(checks[0].evidence).toContain('终于明白')
    expect(checks[0].fix).toContain('具体钩子')
  })

  test('detects philosophical final-line slogans instead of concrete page-turn hooks', () => {
    const checks = scanEndingSummaryRisks([
      '第13章 门后名单',
      '',
      '李辰把校牌按回掌心，门外的脚步声渐渐远了。',
      '他终于明白了生活的真谛：有时候，放手才是最好的选择。',
      '这一夜，注定无人入眠。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].pattern).toContain('章末总结')
    expect(checks[0].evidence).toContain('生活的真谛')
    expect(checks[0].fix).toContain('动作')
  })

  test('detects universal happy-ending conclusions without unresolved tension', () => {
    const checks = scanEndingSummaryRisks([
      '第13章 门后名单',
      '',
      '李辰收起黑名单，众人终于松了一口气。',
      '这一刻，所有人都相信未来可期，前途无量。',
      '走廊尽头重新充满希望。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].pattern).toContain('章末总结')
    expect(checks[0].evidence).toContain('未来可期')
    expect(checks[0].fix).toContain('动作')
  })

  test('detects sentimental time-passing endings from oh-story rewrite examples', () => {
    const checks = scanEndingSummaryRisks([
      '第13章 门后名单',
      '',
      '李辰把校牌塞进口袋，门外那串脚印停在楼梯口。',
      '岁月如流水般悄然流逝。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('F')
    expect(checks[0].pattern).toContain('章末总结')
    expect(checks[0].evidence).toContain('岁月如流水')
    expect(checks[0].fix).toContain('直接删掉')
  })

  test('wires deterministic ending-summary risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEndingSummaryChecks = scanEndingSummaryRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicEndingSummaryChecks')
  })

  test('detects punctuation tone issues before relying on model self review', () => {
    const checks = scanPunctuationToneRisks([
      '第14章 第三个证人',
      '',
      '证人低着头，说：“我……我不知道——真的不知道!!!”',
      '李辰盯着他：“你确定？？？”',
    ].join('\n'))

    expect(checks.map(item => item.key)).toContain('punctuation_hard_pause_line_3')
    expect(checks.map(item => item.key)).toContain('punctuation_random_pile_line_3')
    expect(checks.map(item => item.key)).toContain('punctuation_random_pile_line_4')
    expect(checks[0].label).toBe('语气标点谱系扫描')
    expect(checks[0].fix).toContain('动作')
  })

  test('detects period-only monotony as punctuation tone risk', () => {
    const checks = scanPeriodMonotonyRisks([
      '第14章 第三个证人',
      '李辰站在门口。',
      '门外没有声音。',
      '水迹停在脚边。',
      '张智看着墙上的表。',
      '秒针停在十二点。',
      '宿舍里的人都没有动。',
      '广播里的电流声慢慢变轻。',
      '管理员的影子贴在玻璃上。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('punctuation_period_monotony')
    expect(checks[0].label).toBe('通篇句号化扫描')
    expect(checks[0].evidence).toContain('李辰站在门口')
    expect(checks[0].evidence).toContain('管理员的影子')
    expect(checks[0].fix).toContain('质问')
    expect(checks[0].fix).toContain('语气')
  })

  test('wires deterministic punctuation tone risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicPunctuationToneChecks = scanPunctuationToneRisks(chapterText)')
    expect(reviewBlock).toContain('const deterministicPeriodMonotonyChecks = scanPeriodMonotonyRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicPunctuationToneChecks')
    expect(reviewBlock).toContain('...deterministicPeriodMonotonyChecks')
  })

  test('summarizes deslop gate checks into stable diagnostics for the workspace UI', () => {
    const diagnostics = buildDeslopGateDiagnostics([
      { gate: 'A', pattern: '不是A，而是B', status: 'fail', evidence: '不是害怕，而是规则变了。', fix: '直接写事实。' },
      { gate: 'A', pattern: '一丝', status: 'warn', evidence: '眼中闪过一丝光。', fix: '改成动作。' },
      { gate: 'E', pattern: '对话腔调模板化', status: 'warn', evidence: '你要明白，这件事没那么简单。', fix: '补议程。' },
    ])

    expect(diagnostics.version).toBe('oh_story_deslop_gate_diagnostics_v1')
    expect(diagnostics.gates.map(item => item.gate).join('')).toBe('ABCDEFG')
    expect(diagnostics.total).toBe(3)
    expect(diagnostics.concern_gate_count).toBe(2)
    expect(diagnostics.gates.find(item => item.gate === 'A')?.status).toBe('fail')
    expect(diagnostics.gates.find(item => item.gate === 'A')?.count).toBe(2)
    expect(diagnostics.gates.find(item => item.gate === 'E')?.evidence).toContain('你要明白')
    expect(diagnostics.gates.find(item => item.gate === 'G')?.status).toBe('pass')
  })

  test('wires deslop gate diagnostics into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const normalizedDeslopChecks = [')
    expect(reviewBlock).toContain('deslop_checks: normalizedDeslopChecks')
    expect(reviewBlock).toContain('deslop_gate_diagnostics: buildDeslopGateDiagnostics(normalizedDeslopChecks)')
  })


})

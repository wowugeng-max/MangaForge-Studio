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

describe('chapter context handoff a', () => {
  test('scans direct feeling-telling phrasing into Gate A deslop checks', () => {
    const hits = scanBannedWordLeaks([
      '她感到害怕，手指停在门锁边。',
      '他感到无比不安，广播里的名字还在重复。',
      '她摸到门把手发冷，立刻把手缩回来。',
    ].join('\n'))

    const feelingHits = hits.filter((item: any) => item.pattern === '他/她感到……')
    expect(feelingHits).toHaveLength(2)
    expect(feelingHits[0].evidence).toContain('感到害怕')
    expect(feelingHits[1].evidence).toContain('感到无比不安')
    expect(feelingHits.every((item: any) => item.gate === 'A')).toBe(true)
    expect(feelingHits.map((item: any) => item.fix).join('｜')).toContain('身体动作')
    expect(hits.some((item: any) => item.evidence.includes('摸到门把手'))).toBe(false)
  })

  test('scans direct realization-telling phrasing into Gate A deslop checks', () => {
    const hits = scanBannedWordLeaks([
      '他意识到事情不对，广播里的名字少了一个。',
      '她明白账本不是警告，而是筛选。',
      '“我意识到你在保护我。”林青禾把伞递过去。',
    ].join('\n'))

    const realizationHits = hits.filter((item: any) => item.pattern === '他/她意识到……')
    expect(realizationHits).toHaveLength(2)
    expect(realizationHits[0].evidence).toContain('意识到事情不对')
    expect(realizationHits[1].evidence).toContain('明白账本')
    expect(realizationHits.every((item: any) => item.gate === 'A')).toBe(true)
    expect(realizationHits.map((item: any) => item.fix).join('｜')).toContain('现场证据')
    expect(hits.some((item: any) => item.evidence.includes('我意识到你在保护我'))).toBe(false)
  })

  test('scans contrast template phrasing into deslop gate checks', () => {
    const hits = scanBannedWordLeaks([
      '这并非巧合，而是有人提前清理了现场。',
      '与其说他在退让，不如说他在等门外那个人犯错。',
      '走廊看似安静，实则每盏灯都换过位置。',
    ].join('\n'))

    const patterns = hits.map((item: any) => item.pattern)
    expect(patterns).toEqual(expect.arrayContaining([
      '并非A，而是B',
      '与其说A，不如说B',
      '看似A，实则B',
    ]))
    expect(hits.every((item: any) => item.gate === 'A')).toBe(true)
    expect(hits.every((item: any) => item.status === 'fail')).toBe(true)
    expect(hits.map((item: any) => item.fix).join('｜')).toContain('删掉对照解释')
  })

  test('detects weak adverb density as an oh-story AI signature', () => {
    const hits = scanWeakAdverbDensityRisks([
      '第15章 第四张名单',
      '李辰微微侧身。',
      '她淡淡开口。',
      '门缝缓缓合上。',
      '管理员轻轻敲了两下。',
      '字'.repeat(1000),
    ].join('\n'))

    expect(hits).toHaveLength(1)
    expect(hits[0].gate).toBe('A')
    expect(hits[0].pattern).toContain('弱化副词密度')
    expect(hits[0].evidence).toContain('4 次')
    expect(hits[0].fix).toContain('每1000字不超过 3 个')
  })

  test('detects high-frequency context-sensitive transition words as oh-story AI signature', () => {
    const hits = scanContextSensitiveWordDensityRisks([
      '第15章 第四张名单',
      '门外突然响了一声。',
      '名单好像自己翻到第二页。',
      '灯光瞬间压下来。',
      '广播突然换成倒放。',
      '钥匙好像在掌心发烫。',
      '锁孔瞬间合拢。',
      '字'.repeat(1000),
    ].join('\n'))
    const safeHits = scanContextSensitiveWordDensityRisks([
      '第15章 第四张名单',
      '门外突然响了一声。',
      '字'.repeat(1000),
    ].join('\n'))

    expect(hits).toHaveLength(1)
    expect(hits[0].gate).toBe('A')
    expect(hits[0].pattern).toContain('语境敏感词密度')
    expect(hits[0].evidence).toContain('突然 2')
    expect(hits[0].evidence).toContain('好像 2')
    expect(hits[0].evidence).toContain('瞬间 2')
    expect(hits[0].fix).toContain('角色口语')
    expect(safeHits).toHaveLength(0)
  })

  test('scans bookish phrasing into Gate A colloquial replacement checks', () => {
    const hits = scanBannedWordLeaks([
      '他的防线在那句话里彻底瓦解。',
      '一股无名火从胸口窜上来。',
      '这句话像往我心上捅刀子。',
      '李辰无可奈何地把钥匙交了出去。',
    ].join('\n'))

    const bookishHits = hits.filter((item: any) => item.pattern === '书面腔口语化')
    expect(bookishHits).toHaveLength(4)
    expect(bookishHits[0].evidence).toContain('瓦解')
    expect(bookishHits[0].fix).toContain('散了')
    expect(bookishHits[1].evidence).toContain('无名火')
    expect(bookishHits[1].fix).toContain('烦躁')
    expect(bookishHits[2].evidence).toContain('往我心上捅刀子')
    expect(bookishHits[2].fix).toContain('心烦意乱')
    expect(bookishHits[3].evidence).toContain('无可奈何')
    expect(bookishHits[3].fix).toContain('没办法')
    expect(bookishHits.every((item: any) => item.gate === 'A')).toBe(true)
  })

  test('scans formulaic AI weather description from oh-story rewrite examples', () => {
    const hits = scanBannedWordLeaks([
      '天空阴沉沉的，乌云密布，随时都会下起倾盆大雨。',
      '寒风呼啸而过，刺骨的寒意钻进每个人衣领。',
    ].join('\n'))

    const weatherHits = hits.filter((item: any) => item.pattern === 'AI风天气套话')
    expect(weatherHits).toHaveLength(2)
    expect(weatherHits[0].evidence).toContain('乌云密布')
    expect(weatherHits[0].fix).toContain('晾在外面的衣服')
    expect(weatherHits[1].evidence).toContain('寒风呼啸')
    expect(weatherHits.every((item: any) => item.gate === 'A')).toBe(true)
  })

  test('scans formulaic AI scene atmosphere from oh-story rewrite examples', () => {
    const hits = scanBannedWordLeaks([
      '阳光透过窗帘的缝隙洒进来，在地板上投下斑驳的光影。',
      '空气中弥漫着花香，整个世界都沉浸在一片宁静祥和的氛围中。',
    ].join('\n'))

    const sceneHits = hits.filter((item: any) => item.pattern === 'AI风场景套话')
    expect(sceneHits).toHaveLength(2)
    expect(sceneHits[0].evidence).toContain('斑驳的光影')
    expect(sceneHits[0].fix).toContain('客厅里只有钟在走')
    expect(sceneHits[1].evidence).toContain('宁静祥和')
    expect(sceneHits.every((item: any) => item.gate === 'A')).toBe(true)
  })

  test('scans formulaic AI combat description from oh-story rewrite examples', () => {
    const hits = scanBannedWordLeaks([
      '他的拳势疾风骤雨，每一击都带着压迫性的力量。',
      '对手没料到如此凌厉的攻势，只能连连后退。',
    ].join('\n'))

    const combatHits = hits.filter((item: any) => item.pattern === 'AI风打斗套话')
    expect(combatHits).toHaveLength(2)
    expect(combatHits[0].evidence).toContain('疾风骤雨')
    expect(combatHits[0].fix).toContain('一拳怼过去')
    expect(combatHits[1].evidence).toContain('凌厉的攻势')
    expect(combatHits.every((item: any) => item.gate === 'A')).toBe(true)
  })

  test('merges deterministic oh-story banned word scan into deslop checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedDeslopChecks = ['),
      source.indexOf('const normalizedReview = {', source.indexOf('const normalizedDeslopChecks = [')),
    )

    expect(source).toContain('const deterministicBannedWordChecks = scanBannedWordLeaks(chapterText)')
    expect(source).toContain('const deterministicWeakAdverbDensityChecks = scanWeakAdverbDensityRisks(chapterText)')
    expect(source).toContain('const deterministicContextSensitiveWordDensityChecks = scanContextSensitiveWordDensityRisks(chapterText)')
    expect(reviewNormalizeBlock).toContain('deslop_checks')
    expect(reviewNormalizeBlock).toContain('...deterministicBannedWordChecks')
    expect(reviewNormalizeBlock).toContain('...deterministicWeakAdverbDensityChecks')
    expect(reviewNormalizeBlock).toContain('...deterministicContextSensitiveWordDensityChecks')
  })

  test('builds deterministic prose cleanup report from hard text scans', () => {
    const report = buildDeterministicProseCleanupReport({
      id: 42,
      chapter_no: 3,
    }, '第三章 风起\n上一章的伏笔还没有结束……他缓缓抬头，眼中闪过一丝迟疑！！！')

    expect(report.status).toBe('warn')
    expect(report.risk_count).toBeGreaterThanOrEqual(4)
    expect(report.categories.map((item: any) => item.type)).toEqual(expect.arrayContaining([
      'prose_meta',
      'deslop',
      'punctuation_tone',
    ]))
    expect(report.priority_repair).toBe('优先清理工程词')
    expect(report.required_actions.join('｜')).toContain('角色当下能感知')
    expect(report.evidence.join('｜')).toContain('上一章的伏笔')
  })

  test('detects model degeneration risks with deterministic blocking and advisory severity', () => {
    const checks = scanModelDegenerationRisks([
      '第三章 风起',
      '门外的铜铃忽然响了，所有人都停在原地。',
      '门外的铜铃忽然响了，所有人都停在原地。',
      '门外的铜铃忽然响了，所有人都停在原地。',
      '任务描述：继续生成本章正文。',
      '作为AI，我无法继续生成本章。',
      '门缝里只剩',
    ].join('\n'))

    expect(checks.map((item: any) => item.type)).toEqual(expect.arrayContaining([
      'repetition',
      'engineering_meta',
      'ai_self_reference',
      'truncation',
    ]))
    expect(checks.filter((item: any) => item.severity === 'blocking').map((item: any) => item.type)).toEqual(expect.arrayContaining([
      'repetition',
      'engineering_meta',
      'ai_self_reference',
      'truncation',
    ]))
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('重写受影响段落')
  })

  test('includes model degeneration as the first deterministic cleanup priority', () => {
    const report = buildDeterministicProseCleanupReport({
      id: 42,
      chapter_no: 3,
    }, [
      '第三章 风起',
      '门外的铜铃忽然响了，所有人都停在原地。',
      '门外的铜铃忽然响了，所有人都停在原地。',
      '门外的铜铃忽然响了，所有人都停在原地。',
      '任务描述：继续生成本章正文。',
      '门缝里只剩',
    ].join('\n'))

    expect(report.status).toBe('warn')
    expect(report.categories.map((item: any) => item.type)).toContain('model_degeneration')
    expect(report.priority_repair).toBe('优先处理模型退化')
    expect(report.required_actions.join('｜')).toContain('重写受影响段落')
    expect(report.evidence.join('｜')).toContain('任务描述')
  })

  test('revision prompt uses delete-first deslop repair before polishing', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const revisionStart = source.indexOf('const buildProseRevisionPrompt =')
    const revisionEnd = source.indexOf('const nextChapterQualityPlanNeedsRepair =', revisionStart)
    const revisionBlock = source.slice(revisionStart, revisionEnd)

    expect(revisionStart).toBeGreaterThanOrEqual(0)
    expect(revisionBlock).toContain('删除优先')
    expect(revisionBlock).toContain('删后不丢伏笔')
    expect(revisionBlock).toContain('删不掉才润色')
    expect(revisionBlock).toContain('跌破字数下限')
  })

  test('ignores yaml front matter when building deterministic prose cleanup report', () => {
    const report = buildDeterministicProseCleanupReport({
      id: 42,
      chapter_no: 3,
    }, [
      '---',
      'title: 上一章……旧案未结',
      'range: 7 - 9',
      'style: **draft**',
      '---',
      '第三章 风起',
      '门外的影子动了一下。',
      '她把账册压回抽屉。',
    ].join('\n'))

    expect(report.status).toBe('ok')
    expect(report.risk_count).toBe(0)
    expect(report.evidence.join('｜')).not.toContain('上一章')
    expect(report.evidence.join('｜')).not.toContain('……')
    expect(report.evidence.join('｜')).not.toContain('**draft**')
  })

  test('normalizes oh-story hard punctuation before deterministic cleanup scans', () => {
    const result = normalizeDeterministicProsePunctuation([
      '第三章 风起',
      '',
      '他停了……门外的影子动了——又像没动。',
      '她看了看3-5号门--都锁着。',
      '守卫从7 - 9号廊桥退回来。',
      '火光在10—12层之间跳了一下。',
      '真相……原来账册不是证据。',
      '他停了……。影子动了……，又停下。',
      '他把账册按在桌上……',
      '他停了。……影子动了。',
      '……他抬头看向门外。',
      '他停了…门开了。',
      '他停下---门开了。',
      '---',
      '「别动……」',
      '「……别动」',
    ].join('\n'))

    expect(result.text).toContain('他停了，门外的影子动了，又像没动。')
    expect(result.text).toContain('她看了看3到5号门，都锁着。')
    expect(result.text).toContain('守卫从7到9号廊桥退回来。')
    expect(result.text).toContain('火光在10到12层之间跳了一下。')
    expect(result.text).toContain('真相：原来账册不是证据。')
    expect(result.text).toContain('他停了。影子动了，又停下。')
    expect(result.text).toContain('他把账册按在桌上。')
    expect(result.text).toContain('他停了。影子动了。')
    expect(result.text).toContain('他抬头看向门外。')
    expect(result.text).toContain('他停了，门开了。')
    expect(result.text).toContain('他停下，门开了。')
    expect(result.text).toContain('「别动。」')
    expect(result.text).toContain('「别动」')
    expect(result.text).not.toContain('「，')
    expect(result.text).not.toContain('，」')
    expect(result.text).not.toContain('，。')
    expect(result.text).not.toContain('，，')
    expect(result.text).not.toContain('，\n')
    expect(result.text).not.toContain('。，')
    expect(result.text).not.toContain('\n，')
    expect(result.text).not.toContain('……')
    expect(result.text).not.toContain('…')
    expect(result.text).not.toContain('——')
    expect(result.text).not.toContain('--')
    expect(result.text).not.toContain('-门')
    expect(result.text.split('\n')).not.toContain('---')
    expect(result.changed).toBe(true)
    expect(result.change_count).toBeGreaterThanOrEqual(4)
    expect(result.rules).toEqual(expect.arrayContaining([
      'ellipsis_to_comma',
      'dash_to_comma',
      'leading_pause_removed',
      'numeric_range_to_chinese',
      'closing_quote_pause_to_period',
      'explanation_pause_to_colon',
      'opening_pause_removed',
      'punctuation_adjacent_pause_removed',
      'standalone_rule_line_removed',
      'terminal_pause_to_period',
    ]))
  })

  test('preserves yaml front matter while normalizing deterministic prose punctuation', () => {
    const result = normalizeDeterministicProsePunctuation([
      '---',
      'title: 旧案……未结',
      'range: 7 - 9',
      'dash: a--b',
      '---',
      '第三章 风起',
      '他停了……门外的影子动了。',
      '---',
    ].join('\n'))

    expect(result.text).toBe([
      '---',
      'title: 旧案……未结',
      'range: 7 - 9',
      'dash: a--b',
      '---',
      '第三章 风起',
      '他停了，门外的影子动了。',
      '',
    ].join('\n'))
    expect(result.changed).toBe(true)
    expect(result.rules).toEqual(expect.arrayContaining([
      'ellipsis_to_comma',
      'standalone_rule_line_removed',
    ]))
    expect(result.rules).not.toContain('numeric_range_to_chinese')
  })

  test('preserves fenced blocks while normalizing deterministic prose punctuation', () => {
    const result = normalizeDeterministicProsePunctuation([
      '第三章 风起',
      '```note',
      '引用：他停了……这里不是正文。',
      'range: 7 - 9',
      'dash: a--b',
      '```',
      '他停了……门外的影子动了。',
      '---',
    ].join('\n'))

    expect(result.text).toBe([
      '第三章 风起',
      '```note',
      '引用：他停了……这里不是正文。',
      'range: 7 - 9',
      'dash: a--b',
      '```',
      '他停了，门外的影子动了。',
      '',
    ].join('\n'))
    expect(result.changed).toBe(true)
    expect(result.rules).toEqual(expect.arrayContaining([
      'ellipsis_to_comma',
      'standalone_rule_line_removed',
    ]))
    expect(result.rules).not.toContain('numeric_range_to_chinese')
  })

  test('detects oh-story prose format violations before relying on model self review', () => {
    const checks = scanProseFormatRisks([
      '第三章 风起',
      '他停在门口。',
      '',
      '',
      '　　门外的影子动了一下。',
      '**这不是正文应该保留的加粗标记。**',
    ].join('\n'))

    expect(checks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'format_blank_line_4',
      'format_indentation_line_5',
      'format_markdown_line_6',
    ]))
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('合并多余空行')
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('删除正文 Markdown')
  })

  test('detects mixed chapter marker styles as prose format risks', () => {
    const checks = scanProseFormatRisks([
      '###1.',
      '门外传来第一声敲门。',
      '###第二章',
      '广播改了规则。',
      '3.',
      '名单上多出一个名字。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('format_chapter_marker_mixed')
    expect(checks[0].label).toBe('章节标记格式扫描')
    expect(checks[0].evidence).toContain('###1.')
    expect(checks[0].evidence).toContain('###第二章')
    expect(checks[0].evidence).toContain('3.')
    expect(checks[0].fix).toContain('全文统一一种章节标记格式')
  })

  test('normalizes oh-story prose format before deterministic cleanup scans', () => {
    const result = normalizeDeterministicProseFormat([
      '第三章 风起',
      '',
      '　　门外的影子动了一下。',
      '**他把门推开。**',
      '> 走廊里没有脚步声。',
      '- 水迹停在门缝外。',
    ].join('\n'))

    expect(result.text).toBe([
      '第三章 风起',
      '',
      '门外的影子动了一下。',
      '他把门推开。',
      '走廊里没有脚步声。',
      '水迹停在门缝外。',
    ].join('\n'))
    expect(result.changed).toBe(true)
    expect(result.change_count).toBeGreaterThanOrEqual(4)
    expect(result.rules).toEqual(expect.arrayContaining([
      'indentation_removed',
      'markdown_bold_removed',
      'markdown_quote_marker_removed',
      'markdown_list_marker_removed',
    ]))
    expect(scanProseFormatRisks(result.text)).toHaveLength(0)
  })

  test('preserves yaml front matter while normalizing deterministic prose format', () => {
    const result = normalizeDeterministicProseFormat([
      '---',
      'title: **旧案**',
      'stage: draft',
      '---',
      '第三章 风起',
      '',
      '　　门外的影子动了一下。',
      '**他把门推开。**',
    ].join('\n'))

    expect(result.text).toBe([
      '---',
      'title: **旧案**',
      'stage: draft',
      '---',
      '第三章 风起',
      '',
      '门外的影子动了一下。',
      '他把门推开。',
    ].join('\n'))
    expect(result.changed).toBe(true)
    expect(result.rules).toEqual(expect.arrayContaining([
      'indentation_removed',
      'markdown_bold_removed',
    ]))
    expect(result.rules).not.toContain('markdown_block_marker_removed')
  })

  test('includes prose format violations in deterministic cleanup quality gate blockers', () => {
    const cleanup = buildDeterministicProseCleanupReport({
      id: 42,
      chapter_no: 3,
    }, [
      '第三章 风起',
      '他停在门口。',
      '',
      '　　门外的影子动了一下。',
    ].join('\n'))

    expect(cleanup.status).toBe('warn')
    expect(cleanup.categories.map((item: any) => item.type)).toContain('prose_format')
    expect(cleanup.priority_repair).toBe('优先修正文格式')

    const review = buildQualityGateReviewWithDeterministicCleanup({
      passed: true,
      score: 92,
      issues: [],
      revised: true,
    }, cleanup)
    expect(review.needs_revision).toBe(true)
    expect(review.issues.map((item: any) => item.category)).toContain('format')
    expect(review.issues.map((item: any) => item.issue).join('｜')).toContain('正文格式硬伤')
  })

  test('treats failed write-preparation checks as quality gate blockers', () => {
    const review = {
      passed: true,
      score: 92,
      write_preparation_checks: [
        {
          key: 'asset_linkage',
          label: '旧钥匙挂钩',
          status: 'fail',
          evidence: '正文只写旧钥匙开门，没有交代旧钥匙和母亲旧铺印记的关系。',
          fix: '补出旧钥匙与旧铺印记的证据链。',
        },
      ],
    }

    expect(hasFailingReviewChecks(review)).toBe(true)
    expect(hasReviewChecksNeedingRepair(review)).toBe(true)
  })

  test('wires deterministic prose format risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicProseFormatChecks = scanProseFormatRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicProseFormatChecks')
  })

  test('does not mutate prose after the authoritative quality decision', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8')
    const decisionStart = source.indexOf('const preStoreQualityDecision = getQualityGateDecision')
    const storeStart = source.indexOf("await onStage('store', { status: 'running' })", decisionStart)
    const postDecisionBlock = source.slice(decisionStart, storeStart)

    expect(decisionStart).toBeGreaterThanOrEqual(0)
    expect(storeStart).toBeGreaterThan(decisionStart)
    expect(postDecisionBlock).not.toContain('finalText = normalizeDeterministicProseFormat')
    expect(postDecisionBlock).not.toContain('finalText = normalizeDeterministicProsePunctuation')
    expect(postDecisionBlock).not.toContain('postReviewWordTargetCheck')
  })
  test('carries deterministic prose cleanup misses into the next pre-draft brief and prose prompt', () => {
    const currentChapter = { id: 2, chapter_no: 4, title: '下一章' }
    const chapters = [
      { id: 1, chapter_no: 3, title: '上一章' },
      currentChapter,
    ]
    const reviews = [
      {
        id: 901,
        review_type: 'deterministic_prose_cleanup',
        status: 'warn',
        payload: JSON.stringify({
          chapter_id: 1,
          chapter_no: 3,
          deterministic_prose_cleanup: {
            status: 'warn',
            risk_count: 2,
            priority_repair: '优先清理工程词',
            required_actions: ['把“上一章”改成角色当下能感知的事件锚点。'],
            evidence: ['上一章的伏笔还没有结束。'],
          },
        }),
        created_at: '2026-06-22T08:00:00.000Z',
      },
    ]

    const carryOver = buildDeliveryRiskCarryOverContext(currentChapter, chapters, reviews)

    expect(carryOver?.items.join('｜')).toContain('确定性清理')
    expect(carryOver?.priority_label).toBe('优先清理工程词')
    expect(carryOver?.required_actions.join('｜')).toContain('角色当下能感知')

    const brief = buildChapterPreDraftBrief({ id: 1 }, {
      chapter_no: 4,
      title: '下一章',
      chapter_target: {
        chapter_no: 4,
        title: '下一章',
        delivery_risk_carry_over: carryOver,
      },
      scene_cards: [],
    })
    expect(brief.delivery_risk_carry_over?.items.join('｜')).toContain('确定性清理')
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext({ title: '项目' }, {
      chapter_no: 4,
      title: '下一章',
      chapter_target: brief,
      scene_cards: [],
    } as any)
    expect(prompt).toContain('确定性清理')
    expect(prompt).toContain('角色当下能感知')
  })

  test('prose generation stores deterministic prose cleanup review', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-prestore-receipt-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-sync-reviews.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-mode-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-full-production-store.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/post-commit-sync-bundle.ts'), 'utf8')].join('\n')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()

    expect(source).toContain('qualityLoop.final_scan?.cleanup || buildDeterministicProseCleanupReport(chapter, finalText)')
    expect(source).toContain('buildDeterministicProseCleanupReviewRecord({')
    expect(reviewRecordSource).toContain("review_type: 'deterministic_prose_cleanup'")
    expect(postDeliverySource).toContain("['deterministicProseCleanup', 'deterministic_prose_cleanup']")
    expect(source).toContain('deterministicProseCleanup,')
  })

})

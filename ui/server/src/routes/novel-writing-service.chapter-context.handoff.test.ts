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

describe('chapter context handoff', () => {
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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicProseFormatChecks = scanProseFormatRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicProseFormatChecks')
  })

  test('does not mutate prose after the authoritative quality decision', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const decisionStart = source.indexOf('finalText = qualityLoop.final_text')
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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()

    expect(source).toContain('qualityLoop.final_scan?.cleanup || buildDeterministicProseCleanupReport(chapter, finalText)')
    expect(source).toContain('buildDeterministicProseCleanupReviewRecord({')
    expect(reviewRecordSource).toContain("review_type: 'deterministic_prose_cleanup'")
    expect(postDeliverySource).toContain("['deterministicProseCleanup', 'deterministic_prose_cleanup']")
    expect(source).toContain('deterministicProseCleanup,')
  })

  test('stores deterministic normalization audits with deterministic cleanup review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()
    const storeStart = source.indexOf('buildDeterministicProseCleanupReviewRecord({')
    const storeEnd = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', storeStart)
    const storeBlock = source.slice(storeStart, storeEnd)

    expect(storeBlock).toContain('formatNormalization,')
    expect(storeBlock).toContain('punctuationNormalization,')
    expect(reviewRecordSource).toContain('Number(cleanup.risk_count || 0) <= 0')
    expect(reviewRecordSource).toContain('!input.formatNormalization?.changed')
    expect(reviewRecordSource).toContain('!input.punctuationNormalization?.changed')
    expect(reviewRecordSource).toContain('deterministic_format_normalization: input.formatNormalization')
    expect(reviewRecordSource).toContain('deterministic_punctuation_normalization: input.punctuationNormalization')
  })

  test('turns deterministic prose cleanup residuals into quality gate blockers', () => {
    const cleanup = buildDeterministicProseCleanupReport({
      id: 42,
      chapter_no: 3,
    }, '第三章 风起\n上一章的伏笔还没有结束……他缓缓抬头。')
    const review = buildQualityGateReviewWithDeterministicCleanup({
      passed: true,
      score: 92,
      issues: [],
      revised: true,
    }, cleanup)

    expect(review.needs_revision).toBe(true)
    expect(review.issues.map((item: any) => item.severity)).toContain('critical')
    expect(review.issues.map((item: any) => item.category)).toContain('format')
    expect(review.issues.map((item: any) => item.issue).join('｜')).toContain('确定性清理残留')
    expect(review.issues.map((item: any) => item.fix).join('｜')).toContain('角色当下能感知')

    const decision = getQualityGateDecision({
      reference_config: {
        quality_gate: {
          enabled: true,
          min_score: 78,
          max_critical_issues: 0,
          max_high_issues: 1,
        },
      },
    }, review)
    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('严重问题')
  })

  test('does not promote nonblocking deterministic cleanup warnings to critical gate failures', () => {
    const review = buildQualityGateReviewWithDeterministicCleanup({
      passed: true,
      score: 92,
      issues: [],
      revised: true,
      next_chapter_quality_plan: {
        quality_focus: ['继续压住规则危机'],
        opening_actions: ['承接清算倒计时'],
        middle_actions: ['兑现资产代价'],
        ending_actions: ['留下镇门钩子'],
        avoid_repetition: ['不要解释设定'],
        evidence_basis: ['上一章门禁'],
      },
    }, {
      risk_count: 2,
      categories: [
        {
          type: 'payoff_density',
          label: '回报密度不足',
          count: 1,
          has_blocking: false,
          evidence: ['中段偏长'],
          required_actions: ['下一章继续补阶段回报'],
        },
        {
          type: 'deslop',
          label: '去AI味硬伤',
          count: 1,
          has_blocking: false,
          evidence: ['冰冷'],
          required_actions: ['替换冰冷'],
        },
      ],
    })

    expect(review.issues.map((item: any) => item.severity)).not.toContain('critical')
    const decision = getQualityGateDecision({
      reference_config: {
        quality_gate: {
          enabled: true,
          min_score: 78,
          max_critical_issues: 0,
          max_high_issues: 1,
        },
      },
    }, review)
    expect(decision.passed).toBe(true)
  })

  test('uses a conservative passing score only when score was defaulted and cleanup is clean', () => {
    const review = buildQualityGateReviewWithDeterministicCleanup({
      passed: true,
      score: 80,
      score_defaulted: true,
      issues: [],
      revised: true,
      next_chapter_quality_plan: {
        quality_focus: ['继续压住规则危机'],
        opening_actions: ['承接清算倒计时'],
        middle_actions: ['兑现资产代价'],
        ending_actions: ['留下镇门钩子'],
        avoid_repetition: ['不要解释设定'],
        evidence_basis: ['上一章门禁'],
      },
    }, {
      status: 'ok',
      risk_count: 0,
      categories: [],
    })

    expect(review.score).toBeGreaterThanOrEqual(85)
    expect(review.score_defaulted).toBe(true)
    expect(review.deterministic_score_fallback.reason).toBe('clean_after_deterministic_cleanup')

    const decision = getQualityGateDecision({
      reference_config: {
        quality_gate: {
          enabled: true,
          min_score: 85,
          max_critical_issues: 0,
          max_high_issues: 1,
        },
      },
    }, review)
    expect(decision.passed).toBe(true)
  })

  test('keeps a defaulted review below gate when deterministic cleanup still has residuals', () => {
    const review = buildQualityGateReviewWithDeterministicCleanup({
      passed: true,
      score: 80,
      score_defaulted: true,
      issues: [],
      revised: true,
      next_chapter_quality_plan: {
        quality_focus: ['继续压住规则危机'],
        opening_actions: ['承接清算倒计时'],
        middle_actions: ['兑现资产代价'],
        ending_actions: ['留下镇门钩子'],
        avoid_repetition: ['不要解释设定'],
        evidence_basis: ['上一章门禁'],
      },
    }, {
      risk_count: 1,
      categories: [
        {
          type: 'deslop',
          label: '去AI味硬伤',
          count: 1,
          has_blocking: false,
          evidence: ['缓缓'],
          required_actions: ['替换缓缓'],
        },
      ],
    })

    expect(review.score).toBeLessThan(85)
    expect(review.deterministic_score_fallback.reason).toBe('deterministic_cleanup_residuals')

    const decision = getQualityGateDecision({
      reference_config: {
        quality_gate: {
          enabled: true,
          min_score: 85,
          max_critical_issues: 0,
          max_high_issues: 1,
        },
      },
    }, review)
    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('｜')).toContain('质检评分')
  })

  test('quality gates evaluate deterministic prose cleanup residuals before storing prose', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const cleanupStart = source.indexOf('qualityLoop.final_scan?.cleanup || buildDeterministicProseCleanupReport(chapter, finalText)', groupStart)
    const gateReviewStart = source.indexOf('let qualityGateReview = buildQualityGateReviewWithDeterministicCleanup', cleanupStart)
    const preStoreStart = source.indexOf('const preStoreQualityDecision =', gateReviewStart)
    const finalStart = source.indexOf('const finalQualityDecision =', preStoreStart)
    const gateBlock = source.slice(cleanupStart, finalStart + 260)

    expect(cleanupStart).toBeGreaterThan(groupStart)
    expect(gateReviewStart).toBeGreaterThan(cleanupStart)
    expect(preStoreStart).toBeGreaterThan(gateReviewStart)
    expect(finalStart).toBeGreaterThan(preStoreStart)
    expect(gateBlock).toContain('buildQualityGateReviewWithDeterministicCleanup({')
    expect(gateBlock).toContain('...(selfCheck?.review || {})')
    expect(gateBlock).toContain('revised: Boolean(selfCheck.revised)')
    expect(gateBlock).toContain('}, deterministicProseCleanup')
    expect(gateBlock).toContain('getQualityGateDecision(qualityGateProject, qualityGateReview)')
    expect(gateBlock).toContain('getQualityGateDecision(qualityGateProject, qualityGateReview, safetyDecision)')
  })

  test('quality gates include prose revision receipt sync failures before storing prose', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const syncStart = source.indexOf('let proseRevisionReceiptSync = buildProseRevisionReceiptSyncReport(chapter, selfCheck)', groupStart)
    const gateReviewStart = source.indexOf('let qualityGateReview =', syncStart)
    const preStoreStart = source.indexOf('const preStoreQualityDecision =', gateReviewStart)
    const gateBlock = source.slice(syncStart, preStoreStart)

    expect(syncStart).toBeGreaterThan(groupStart)
    expect(gateReviewStart).toBeGreaterThan(syncStart)
    expect(gateBlock).toContain('revision_receipt_checks')
    expect(gateBlock).toContain('proseRevisionReceiptSync.status ===')
    expect(gateBlock).toContain('proseRevisionReceiptSync.missed_count')
    expect(gateBlock).toContain('修订回执未闭环')
  })

  test('quality gates include deslop repair receipt residual risks before storing prose', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const deslopCheckStart = source.indexOf('let deslopRepairReceiptSync = buildDeslopRepairReceiptSyncReport(chapter, selfCheck)', groupStart)
    const gateReviewStart = source.indexOf('let qualityGateReview =', deslopCheckStart)
    const preStoreStart = source.indexOf('const preStoreQualityDecision =', gateReviewStart)
    const gateBlock = source.slice(deslopCheckStart, preStoreStart)

    expect(deslopCheckStart).toBeGreaterThan(groupStart)
    expect(gateReviewStart).toBeGreaterThan(groupStart)
    expect(preStoreStart).toBeGreaterThan(gateReviewStart)
    expect(gateBlock).toContain('deslopRepairReceiptRisks')
    expect(gateBlock).toContain('deslopRepairReceiptSync')
    expect(gateBlock).toContain('missingDeslopRepairReceiptChecks')
    expect(gateBlock).toContain('proseQualityDeslopRepairReceiptRisks')
    expect(gateBlock).toContain('deslop_repair_checks: [...missingDeslopRepairReceiptChecks, ...deslopRepairChecks]')
    expect(gateBlock).toContain('去AI味修复回执未闭环')
    expect(gateBlock).toContain('去AI味修复回执未生成')
  })

  test('quality gates include quality audit repair receipt failures before storing prose', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const qualityCheckStart = source.indexOf('let qualityAuditRepairReceiptSync = buildQualityAuditRepairReceiptSyncReport(chapter, selfCheck)', groupStart)
    const gateReviewStart = source.indexOf('let qualityGateReview =', qualityCheckStart)
    const preStoreStart = source.indexOf('const preStoreQualityDecision =', gateReviewStart)
    const gateBlock = source.slice(qualityCheckStart, preStoreStart)

    expect(qualityCheckStart).toBeGreaterThan(groupStart)
    expect(gateReviewStart).toBeGreaterThan(groupStart)
    expect(preStoreStart).toBeGreaterThan(gateReviewStart)
    expect(gateBlock).toContain('qualityAuditRepairReceiptSync')
    expect(gateBlock).toContain('missingQualityAuditRepairReceiptChecks')
    expect(gateBlock).toContain('quality_audit_checks: [')
    expect(gateBlock).toContain('...missingQualityAuditRepairReceiptChecks')
    expect(gateBlock).toContain('质量诊断修复回执未生成')
  })

  test('quality gates recompute receipt syncs against final prose text before blocking storage', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const syncChapterStart = source.indexOf('const syncChapterForReceiptEvidence = { ...chapter, chapter_text: finalText }', groupStart)
    const gateReviewStart = source.indexOf('let qualityGateReview =', syncChapterStart)
    const syncBlock = source.slice(syncChapterStart, gateReviewStart)

    expect(syncChapterStart).toBeGreaterThan(groupStart)
    expect(gateReviewStart).toBeGreaterThan(syncChapterStart)
    expect(syncBlock).toContain('proseRevisionReceiptSync = buildProseRevisionReceiptSyncReport(syncChapterForReceiptEvidence, selfCheck)')
    expect(syncBlock).toContain('deslopRepairReceiptSync = buildDeslopRepairReceiptSyncReport(syncChapterForReceiptEvidence, selfCheck)')
    expect(syncBlock).toContain('qualityAuditRepairReceiptSync = buildQualityAuditRepairReceiptSyncReport(syncChapterForReceiptEvidence, selfCheck)')
    expect(syncBlock).toContain('revisionCascadeImpactSync = buildRevisionCascadeImpactSyncReport(syncChapterForReceiptEvidence, selfCheck)')
    expect(syncBlock).toContain('proseQualityDeslopRepairReceiptRisks({ self_check: selfCheck }, finalText)')
  })

  test('quality gates keep post-delivery receipt sync failures as advisory diagnostics before storing prose', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const postDeliveryCheckStart = source.indexOf('const postDeliveryReceiptChecks =', groupStart)
    const preStoreStart = source.indexOf('const preStoreQualityDecision =', postDeliveryCheckStart)
    const gateBlock = source.slice(postDeliveryCheckStart, preStoreStart)

    expect(postDeliveryCheckStart).toBeGreaterThan(groupStart)
    expect(preStoreStart).toBeGreaterThan(postDeliveryCheckStart)
    expect(gateBlock).toContain('nextChapterQualityPlanReceiptSync')
    expect(gateBlock).toContain('statusFilterReceiptSync')
    expect(gateBlock).toContain('writePreparationReceiptSync')
    expect(gateBlock).toContain('preStoreSceneCardReceiptSync')
    expect(gateBlock).toContain('preStoreDeliveryRiskReceiptSync')
    expect(gateBlock).toContain("sync_key: 'scene_card_receipts_sync'")
    expect(gateBlock).toContain("sync_key: 'delivery_risk_receipts_sync'")
    expect(gateBlock).toContain('post_delivery_receipt_sync')
    expect(gateBlock).toContain('qualityGateReview.post_delivery_receipt_checks = postDeliveryReceiptChecks')
    expect(gateBlock).not.toContain('qualityGateReview.quality_audit_checks =')
  })

  test('draft review quality decision excludes post-delivery receipt sync advisories from the hard gate', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const postDeliveryCheckStart = source.indexOf('const postDeliveryReceiptChecks =', groupStart)
    const postDeliveryAdvisoryStart = source.indexOf('qualityGateReview.post_delivery_receipt_checks = postDeliveryReceiptChecks', postDeliveryCheckStart)
    const draftQualityDecisionStart = source.indexOf('const draftQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', groupStart)
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', draftQualityDecisionStart)
    const advisoryBlock = source.slice(postDeliveryCheckStart, draftQualityDecisionStart)

    expect(postDeliveryCheckStart).toBeGreaterThan(groupStart)
    expect(postDeliveryAdvisoryStart).toBeGreaterThan(postDeliveryCheckStart)
    expect(draftQualityDecisionStart).toBeGreaterThan(postDeliveryAdvisoryStart)
    expect(draftReviewOnlyStart).toBeGreaterThan(draftQualityDecisionStart)
    expect(advisoryBlock).toContain("status: 'warn'")
    expect(advisoryBlock).toContain('qualityGateReview.post_delivery_receipt_checks = postDeliveryReceiptChecks')
    expect(advisoryBlock).not.toContain('qualityGateReview.quality_audit_checks =')
  })

  test('returns quality audit repair receipt sync in story state update summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()

    expect(source).toContain("reviewType: 'quality_audit_repair_receipt_sync'")
    expect(reviewRecordSource).toContain('review_type: input.reviewType')
    expect(source).toContain('buildQualityAuditRepairReceiptSyncReport(chapter, selfCheck)')
    expect(postDeliverySource).toContain("['qualityAuditRepairReceiptSync', 'quality_audit_repair_receipt_sync']")
    expect(source).toContain('qualityAuditRepairReceiptSync,')
  })

  test('returns deterministic prose hygiene sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const draftReviewRecordSource = readDraftSyncReviewRecordSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftProseMetaSync = buildProseMetaSyncReport(project, chapter, contextPackage, finalText)')
    expect(draftBlock).toContain('const draftSourceReadinessSync = buildSourceReadinessSyncReport(project, chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'prose_meta_sync'")
    expect(draftBlock).toContain("payloadKey: 'prose_meta_sync'")
    expect(draftBlock).toContain("reviewType: 'source_readiness_sync'")
    expect(draftBlock).toContain("payloadKey: 'source_readiness_sync'")
    expect(draftReviewRecordSource).toContain('review_type: input.reviewType')
    expect(draftReviewRecordSource).toContain('[input.payloadKey]: sync')
  })

  test('returns chapter title uniqueness sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftChapters = await listNovelChapters(activeWorkspace, projectId)')
    expect(draftBlock).toContain('const draftChapterTitleUniquenessSync = buildChapterTitleUniquenessSyncReport(draftChapters, updatedReviewedDraft || chapter)')
    expect(draftBlock).toContain('buildChapterTitleUniquenessDraftReviewRecord({ projectId, chapter, sync: draftChapterTitleUniquenessSync })')
    expect(draftBlock).toContain('chapterTitleUniquenessSync: draftChapterTitleUniquenessSync')
  })

  test('returns chapter handoff sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftChapterHandoffSync = buildChapterHandoffSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain('buildChapterHandoffDraftReviewRecord({ projectId, chapter, sync: draftChapterHandoffSync })')
    expect(draftBlock).toContain('chapterHandoffSync: draftChapterHandoffSync')
  })

  test('returns reader expectation sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftReaderExpectationSync = buildReaderExpectationSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'reader_expectation_sync'")
    expect(draftBlock).toContain("payloadKey: 'reader_expectation_sync'")
  })

  test('returns reader payoff and retention sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftReaderPayoffSync = buildReaderPayoffSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText, {})')
    expect(draftBlock).toContain('buildReaderPayoffDraftReviewRecord({ projectId, chapter, sync: draftReaderPayoffSync })')
    expect(draftBlock).toContain('readerPayoffSync: draftReaderPayoffSync')
    expect(draftBlock).toContain('const draftReaderRetentionSync = buildReaderRetentionSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'reader_retention_sync'")
    expect(draftBlock).toContain("payloadKey: 'reader_retention_sync'")
  })

  test('returns expectation threshold sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftExpectationThresholdSync = buildExpectationThresholdSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'expectation_threshold_sync'")
    expect(draftBlock).toContain("payloadKey: 'expectation_threshold_sync'")
  })

  test('returns hook sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftChapterHookSync = buildChapterHookSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'chapter_hook_sync'")
    expect(draftBlock).toContain("payloadKey: 'chapter_hook_sync'")
    expect(draftBlock).toContain('const draftParagraphHookSync = buildParagraphHookSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'paragraph_hook_sync'")
    expect(draftBlock).toContain("payloadKey: 'paragraph_hook_sync'")
  })

  test('returns prose craft quality sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftOpeningSync = buildOpeningSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'opening_sync'")
    expect(draftBlock).toContain("payloadKey: 'opening_sync'")
    expect(draftBlock).toContain('const draftProseCraftSync = buildProseCraftSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'prose_craft_sync'")
    expect(draftBlock).toContain("payloadKey: 'prose_craft_sync'")
    expect(draftBlock).toContain('const draftQualityAuditSync = buildQualityAuditSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'quality_audit_sync'")
    expect(draftBlock).toContain("payloadKey: 'quality_audit_sync'")
  })

  test('returns payoff and scene rhythm sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftPayoffSetupSync = buildPayoffSetupSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'payoff_setup_sync'")
    expect(draftBlock).toContain("payloadKey: 'payoff_setup_sync'")
    expect(draftBlock).toContain('const draftSpectatorReactionSync = buildSpectatorReactionSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'spectator_reaction_sync'")
    expect(draftBlock).toContain("payloadKey: 'spectator_reaction_sync'")
    expect(draftBlock).toContain('const draftBridgeUnitSync = buildBridgeUnitSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'bridge_unit_sync'")
    expect(draftBlock).toContain("payloadKey: 'bridge_unit_sync'")
    expect(draftBlock).toContain('const draftBeatCoolingSync = buildBeatCoolingSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'beat_cooling_sync'")
    expect(draftBlock).toContain("payloadKey: 'beat_cooling_sync'")
  })

  test('returns dramatic turn sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftSuspenseSync = buildSuspenseSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'suspense_sync'")
    expect(draftBlock).toContain("payloadKey: 'suspense_sync'")
    expect(draftBlock).toContain('const draftReversalSync = buildReversalSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'reversal_sync'")
    expect(draftBlock).toContain("payloadKey: 'reversal_sync'")
    expect(draftBlock).toContain('const draftShowdownSync = buildShowdownSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'showdown_sync'")
    expect(draftBlock).toContain("payloadKey: 'showdown_sync'")
  })

  test('returns character asset state sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const draftReviewRecordSource = readDraftSyncReviewRecordSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftDialogueSync = buildDialogueSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'dialogue_sync'")
    expect(draftBlock).toContain("payloadKey: 'dialogue_sync'")
    expect(draftBlock).toContain('const draftCharacterBehaviorSync = buildCharacterBehaviorSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'character_behavior_sync'")
    expect(draftBlock).toContain("payloadKey: 'character_behavior_sync'")
    expect(draftBlock).toContain('const draftAssetLinkageSync = buildAssetLinkageSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'asset_linkage_sync'")
    expect(draftBlock).toContain("payloadKey: 'asset_linkage_sync'")
    expect(draftBlock).toContain('const draftStateTrackingSync = buildStateTrackingSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'state_tracking_sync'")
    expect(draftBlock).toContain("payloadKey: 'state_tracking_sync'")
    expect(draftReviewRecordSource).toContain('summary: `${sync.label}：${sync.summary}`')
    expect(draftReviewRecordSource).toContain('issues: (sync.missed || [])')
  })

  test('returns receipt syncs in draft review only summaries from the same pre-store receipt context as quality gates', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftSceneCardReceiptSync = buildSceneCardReceiptSyncReport(project, updatedReviewedDraft || chapter, preStoreReceiptSyncContextPackage, finalText)')
    expect(draftBlock).toContain('buildSceneCardReceiptsDraftReviewRecord({ projectId, chapter, sync: draftSceneCardReceiptSync })')
    expect(draftBlock).toContain('const draftDeliveryRiskReceiptSync = buildDeliveryRiskReceiptSyncReport(project, updatedReviewedDraft || chapter, preStoreReceiptSyncContextPackage, finalText)')
    expect(draftBlock).toContain('buildDeliveryRiskReceiptsDraftReviewRecord({ projectId, chapter, sync: draftDeliveryRiskReceiptSync })')
  })

  test('returns dialogue and character behavior sync in full pipeline story state update', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const fullPipelineStart = source.indexOf('const story_state_update: any = storyStateUpdate || {}', groupStart)
    const fullPipelineEnd = source.indexOf('return {', fullPipelineStart)
    const fullPipelineBlock = source.slice(fullPipelineStart, fullPipelineEnd)

    expect(fullPipelineBlock).toContain('const dialogueSync = buildDialogueSyncReport(project, updated, contextPackage, finalText)')
    expect(fullPipelineBlock).toContain('const characterBehaviorSync = buildCharacterBehaviorSyncReport(project, updated, contextPackage, finalText)')
    expect(postDeliverySource).toContain("['dialogueSync', 'dialogue_sync']")
    expect(postDeliverySource).toContain("['characterBehaviorSync', 'character_behavior_sync']")
  })

  test('returns scene-card receipt sync in full pipeline story state update', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const fullPipelineStart = source.indexOf('const story_state_update: any = storyStateUpdate || {}', groupStart)
    const fullPipelineEnd = source.indexOf('return {', fullPipelineStart)
    const fullPipelineBlock = source.slice(fullPipelineStart, fullPipelineEnd)

    expect(fullPipelineBlock).toContain('const sceneCardReceiptSync = buildSceneCardReceiptSyncReport(project, updated, preStoreReceiptSyncContextPackage, finalText)')
    expect(postDeliverySource).toContain("['sceneCardReceiptSync', 'scene_card_receipts_sync']")
  })

  test('returns delivery-risk receipt sync in full pipeline story state update', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const fullPipelineStart = source.indexOf('const story_state_update: any = storyStateUpdate || {}', groupStart)
    const fullPipelineEnd = source.indexOf('return {', fullPipelineStart)
    const fullPipelineBlock = source.slice(fullPipelineStart, fullPipelineEnd)

    expect(fullPipelineBlock).toContain('const deliveryRiskReceiptSync = buildDeliveryRiskReceiptSyncReport(project, updated, preStoreReceiptSyncContextPackage, finalText)')
    expect(postDeliverySource).toContain("['deliveryRiskReceiptSync', 'delivery_risk_receipts_sync']")
  })

  test('returns revision-context receipt sync in full pipeline story state update', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const fullPipelineStart = source.indexOf('const story_state_update: any = storyStateUpdate || {}', groupStart)
    const fullPipelineEnd = source.indexOf('return {', fullPipelineStart)
    const fullPipelineBlock = source.slice(fullPipelineStart, fullPipelineEnd)

    expect(source).toContain('let revisionContextReceiptSync = buildRevisionContextReceiptSyncReport(chapter, selfCheck)')
    expect(source).toContain('revisionContextReceiptSync = buildRevisionContextReceiptSyncReport(chapter, selfCheck)')
    expect(postDeliverySource).toContain("['revisionContextReceiptSync', 'revision_context_receipts_sync']")
  })

  test('stores common post-delivery sync reviews through the shared record builder', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()
    const updateStoryStateStart = source.indexOf('const updateStoryStateMachine = async')
    const updateStoryStateEnd = source.indexOf('return {', updateStoryStateStart)
    const updateStoryStateBlock = source.slice(updateStoryStateStart, updateStoryStateEnd > updateStoryStateStart ? updateStoryStateEnd : source.length)

    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterHandoffSync, reviewType: 'chapter_handoff_sync'")
    expect(updateStoryStateBlock).toContain('sync: readerExpectationSync')
    expect(updateStoryStateBlock).toContain("reviewType: 'reader_expectation_sync'")
    expect(updateStoryStateBlock).toContain("payloadKey: 'reader_expectation_sync'")
    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: expectationThresholdSync, reviewType: 'expectation_threshold_sync'")
    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterHookSync, reviewType: 'chapter_hook_sync'")
    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: paragraphHookSync, reviewType: 'paragraph_hook_sync'")
    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: suspenseSync, reviewType: 'suspense_sync'")
    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: reversalSync, reviewType: 'reversal_sync'")
    expect(updateStoryStateBlock).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: showdownSync, reviewType: 'showdown_sync'")
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: openingSync, reviewType: 'opening_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: proseCraftSync, reviewType: 'prose_craft_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: punctuationToneSync, reviewType: 'punctuation_tone_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: qualityAuditSync, reviewType: 'quality_audit_sync'"].forEach((token) => expect(updateStoryStateBlock).toContain(token))
    expect(updateStoryStateBlock).toContain('sync: proseMetaSync')
    expect(updateStoryStateBlock).toContain("reviewType: 'prose_meta_sync'")
    expect(updateStoryStateBlock).toContain("payloadKey: 'prose_meta_sync'")
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: dialogueSync, reviewType: 'dialogue_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterBehaviorSync, reviewType: 'character_behavior_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: assetLinkageSync, reviewType: 'asset_linkage_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: stateTrackingSync, reviewType: 'state_tracking_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: sourceReadinessSync, reviewType: 'source_readiness_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: intentConfirmationSync, reviewType: 'intent_confirmation_sync'"].forEach((token) => expect(updateStoryStateBlock).toContain(token))
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: payoffSetupSync, reviewType: 'payoff_setup_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: spectatorReactionSync, reviewType: 'spectator_reaction_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: bridgeUnitSync, reviewType: 'bridge_unit_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: beatCoolingSync, reviewType: 'beat_cooling_sync'"].forEach((token) => expect(updateStoryStateBlock).toContain(token))
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: continuityHeatSync, reviewType: 'continuity_heat_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: conflictStructureSync, reviewType: 'conflict_structure_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: upgradeRhythmSync, reviewType: 'upgrade_rhythm_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: targetReaderSync, reviewType: 'target_reader_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: genrePositioningSync, reviewType: 'genre_positioning_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: femaleAudienceSync, reviewType: 'female_audience_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: plotDynamicsSync, reviewType: 'plot_dynamics_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyPowerSync, reviewType: 'story_power_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterRelationSync, reviewType: 'character_relation_sync'"].forEach((token) => expect(updateStoryStateBlock).toContain(token))
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyDriveSync, reviewType: 'story_drive_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyLoopSync, reviewType: 'story_loop_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: informationFlowSync, reviewType: 'information_flow_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: emotionalArcSync, reviewType: 'emotional_arc_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterArcSync, reviewType: 'character_arc_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterBlueprintSync, reviewType: 'chapter_blueprint_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterBenchmarkSync, reviewType: 'chapter_benchmark_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: benchmarkRecallSync, reviewType: 'benchmark_recall_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: styleBoundarySync, reviewType: 'style_boundary_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: innovationSync, reviewType: 'innovation_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: volumeBeatSync, reviewType: 'volume_beat_sync'"].forEach((token) => expect(updateStoryStateBlock).toContain(token))
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterTitleUniquenessSync, reviewType: 'chapter_title_uniqueness_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterStateDeltaSync, reviewType: 'character_state_delta_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: timelineDeltaSync, reviewType: 'timeline_delta_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterHandoffDeltaSync, reviewType: 'chapter_handoff_delta_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: assetStateDeltaSync, reviewType: 'asset_state_delta_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: relationshipDeltaSync, reviewType: 'relationship_delta_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: foreshadowingDeltaSync, reviewType: 'foreshadowing_delta_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: stateDeltaCompleteness, reviewType: 'state_delta_completeness'"].forEach((token) => expect(updateStoryStateBlock).toContain(token))
    ;["buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: signatureSceneSync, reviewType: 'signature_scene_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyUnitSync, reviewType: 'story_unit_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: coreDrift, reviewType: 'chapter_core_drift'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: coreContractSync, reviewType: 'core_contract_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: readerPayoffSync, reviewType: 'reader_payoff_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: readerRetentionSync, reviewType: 'reader_retention_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterAttractionReview, reviewType: 'chapter_attraction_review'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: styleSampleSync, reviewType: 'style_sample_sync'", "buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: runwaySync, reviewType: 'runway_sync'"].forEach((token) => expect(updateStoryStateBlock.replace(/\s+/g, ' ')).toContain(token))
    expect(reviewRecordSource).toContain('export function buildPostDeliverySyncReviewRecord')
    expect(reviewRecordSource).toContain('payload: chapterPayload(input.chapter, input.payloadKey, sync)')
  })

  test('returns continuity and conflict sync in draft review only summaries', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8')
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const draftReviewOnlyStart = source.indexOf('if (isDraftOnly || isDraftReviewOnly)', groupStart)
    const draftReviewOnlyEnd = source.indexOf('const preStoreQualityDecision = getQualityGateDecision(qualityGateProject, qualityGateReview)', draftReviewOnlyStart)
    const draftBlock = source.slice(draftReviewOnlyStart, draftReviewOnlyEnd)

    expect(draftBlock).toContain('const draftIntentConfirmationSync = buildIntentConfirmationSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'intent_confirmation_sync'")
    expect(draftBlock).toContain("payloadKey: 'intent_confirmation_sync'")
    expect(draftBlock).toContain('const draftContinuityHeatSync = buildContinuityHeatSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'continuity_heat_sync'")
    expect(draftBlock).toContain("payloadKey: 'continuity_heat_sync'")
    expect(draftBlock).toContain('const draftConflictStructureSync = buildConflictStructureSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'conflict_structure_sync'")
    expect(draftBlock).toContain("payloadKey: 'conflict_structure_sync'")
    expect(draftBlock).toContain('const draftUpgradeRhythmSync = buildUpgradeRhythmSyncReport(project, updatedReviewedDraft || chapter, contextPackage, finalText)')
    expect(draftBlock).toContain("reviewType: 'upgrade_rhythm_sync'")
    expect(draftBlock).toContain("payloadKey: 'upgrade_rhythm_sync'")
  })

})

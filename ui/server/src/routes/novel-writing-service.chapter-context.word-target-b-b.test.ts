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

describe('chapter context word-target b b', () => {
  test('asks prose revision to repair missed delivery risk receipts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(revisionPrompt).toContain('delivery_risk_receipts')
    expect(revisionPrompt).toContain('delivered=false')
    expect(revisionPrompt).toContain('remaining_risk')
    expect(revisionPrompt).toContain('承接残留')
    expect(revisionPrompt).toContain('必须修到正文中可见')
    expect(revisionPrompt).toContain('逐条修复 delivery_risk_receipts')
    expect(revisionPrompt).toContain('每条 delivered=false 或 remaining_risk 非空')
    expect(revisionPrompt).toContain('revision_receipts 必须逐条对应 delivery_risk_receipts')
    expect(revisionPrompt).toContain('不能只修第一条')
    expect(revisionPrompt).toContain('failedDeliveryRiskReceipts')
    expect(revisionPrompt).toContain('deliveryRiskReceiptRemainingRisk')
    expect(revisionPrompt).toContain('repair_segment')
    expect(revisionPrompt).toContain('opening_actions 失败项必须修到前300字')
    expect(revisionPrompt).toContain('ending_actions 失败项必须修到最后300字')
    expect(revisionPrompt).toContain('不得把章末风险挪到开篇或中段')
    expect(revisionPrompt).toContain('【未闭环承接风险回执】')
  })

  test('asks prose revision to output nested oh-story delivery receipts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    const outputContract = revisionPrompt.slice(
      revisionPrompt.indexOf('请输出 JSON'),
      revisionPrompt.indexOf('].join', revisionPrompt.indexOf('请输出 JSON')),
    )

    expect(outputContract).toContain('oh_story_delivery_receipts')
    expect(outputContract).toContain('chapter_blueprint')
    expect(outputContract).toContain('scene_card_receipts')
    expect(outputContract).toContain('delivery_risk_receipts')
    expect(outputContract).toContain('revision_receipts')
    expect(outputContract).toContain('deslop_repair_receipts')
    expect(outputContract).toContain('quality_audit_repair_receipts')
    expect(outputContract).toContain('pre_draft_execution_receipts')
    expect(outputContract).toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.intent_confirmation_checks')
    expect(outputContract).toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.benchmark_recall_checks')
    expect(outputContract).toContain('所有修订回执必须同时写入 oh_story_delivery_receipts')
  })

  test('asks prose revision to output context comparison receipts before rewriting', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const outputContract = revisionPrompt.slice(
      revisionPrompt.indexOf('请输出 JSON'),
      revisionPrompt.indexOf('].join', revisionPrompt.indexOf('请输出 JSON')),
    )

    expect(revisionPrompt).toContain('revision_context_receipts')
    expect(revisionPrompt).toContain('previous_chapter')
    expect(revisionPrompt).toContain('next_chapter')
    expect(revisionPrompt).toContain('foreshadowing')
    expect(revisionPrompt).toContain('character_cards')
    expect(revisionPrompt).toContain('timeline')
    expect(revisionPrompt).toContain('setting_context')
    expect(revisionPrompt).toContain('正文元信息扫描')
    expect(revisionPrompt).toContain('禁用词扫描')
    expect(revisionPrompt).toContain('无法确认')
    expect(outputContract).toContain('revision_context_receipts')
    expect(outputContract).toContain('oh_story_delivery_receipts 必须包含')
    expect(outputContract).toContain('revision_context_receipts(array)')
  })

  test('asks prose self review for oh-story style findings and keeps them for revision', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const runProseSelfReviewAndRevision'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(reviewPrompt).toContain('统一 Findings Schema')
    expect(reviewPrompt).toContain('severity(S1|S2|S3|S4)')
    expect(reviewPrompt).toContain('category(structure|character|prose|consistency|platform|factual|format|causal|rule_boundary)')
    expect(reviewPrompt).toContain('location')
    expect(reviewPrompt).toContain('evidence')
    expect(reviewPrompt).toContain('fix')
    expect(revisionPrompt).toContain('issues[].evidence')
    expect(revisionPrompt).toContain('issues[].fix')
    expect(revisionPrompt).toContain('revision_receipts')
    expect(revisionPrompt).toContain('issue_index')
    expect(revisionPrompt).toContain('changed_evidence')
    expect(revisionPrompt).toContain('remaining_risk')
  })

  test('asks prose self review and revision to enforce platform rubric checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedDeslopChecks = ['),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedDeslopChecks = [')),
    )

    expect(reviewPrompt).toContain('chapter_target.platform_rubric')
    expect(reviewPrompt).toContain('platform_checks')
    expect(reviewPrompt).toContain('rubric_source')
    expect(reviewPrompt).toContain('Rubric: fanqie | qidian | zhihu | generic web-fiction')
    expect(revisionPrompt).toContain('platform_checks')
    expect(revisionPrompt).toContain('平台不匹配')
    expect(reviewNormalizeBlock).toContain('platform_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.platform_checks')
    expect(reviewNormalizeBlock).toContain('rubric_source')
  })

  test('asks prose self review and revision to enforce content rubric checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )
    const reviewNormalizeBlock = source.slice(
      source.indexOf('const normalizedDeslopChecks = ['),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedDeslopChecks = [')),
    )

    expect(reviewPrompt).toContain('chapter_target.content_rubric')
    expect(reviewPrompt).toContain('content_rubric_checks')
    expect(reviewPrompt).toContain('黄金三问')
    expect(revisionPrompt).toContain('content_rubric_checks')
    expect(revisionPrompt).toContain('内容基准')
    expect(reviewNormalizeBlock).toContain('content_rubric_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.content_rubric_checks')
  })

  test('asks prose self review and revision to use oh-story adversarial perspectives', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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
    const reviewNormalizeSetupBlock = source.slice(
      source.indexOf('const preDraftReceiptChecks ='),
      source.indexOf('const normalizedReview = {', source.indexOf('const preDraftReceiptChecks =')),
    )

    expect(reviewPrompt).toContain('perspective_verdicts')
    expect(reviewPrompt).toContain('story-architect')
    expect(reviewPrompt).toContain('character-designer')
    expect(reviewPrompt).toContain('narrative-writer')
    expect(reviewPrompt).toContain('consistency-checker')
    expect(revisionPrompt).toContain('perspective_verdicts')
    expect(revisionPrompt).toContain('多视角审查')
    expect(shouldReviseBlock).toContain('perspective_verdicts')
    expect(reviewNormalizeBlock).toContain('perspective_verdicts')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.perspective_verdicts')
  })

  test('asks prose self review and revision to enforce oh-story deslop gates', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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
      source.indexOf('const normalizedDeslopChecks = ['),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedDeslopChecks = [')),
    )

    expect(reviewPrompt).toContain('deslop_checks')
    expect(reviewPrompt).toContain('Gate A-G')
    expect(reviewPrompt).toContain('模式 8')
    expect(reviewPrompt).toContain('解释腔/上帝视角/安排感')
    expect(revisionPrompt).toContain('deslop_checks')
    expect(revisionPrompt).toContain('deslop_gate_diagnostics')
    expect(revisionPrompt).toContain('concern_gate_count')
    expect(revisionPrompt).toContain('summary/gates/evidence/fix')
    expect(revisionPrompt).toContain('deslop_repair_receipts')
    expect(revisionPrompt).toContain('去AI味')
    expect(shouldReviseBlock).toContain('deslop_checks')
    expect(shouldReviseBlock).toContain('deslop_gate_diagnostics')
    expect(shouldReviseBlock).toContain('concern_gate_count')
    expect(reviewNormalizeBlock).toContain('deslop_checks')
    expect(reviewNormalizeBlock).toContain('reviewPayload?.deslop_checks')
    expect(reviewNormalizeBlock).toContain('deslop_gate_diagnostics')
  })

  test('scans oh-story banned words into deslop gate checks', () => {
    const hits = scanBannedWordLeaks('他不是冷漠，而是绝望。她缓缓抬头，眼中闪过一丝迟疑。')

    expect(hits.map((item: any) => item.pattern).join('｜')).toContain('不是A，而是B')
    expect(hits.map((item: any) => item.pattern).join('｜')).toContain('缓缓')
    expect(hits.map((item: any) => item.pattern).join('｜')).toContain('眼中闪过')
    expect(hits[0].gate).toBe('A')
    expect(hits[0].status).toBe('fail')
    expect(hits[0].fix).toContain('直接写')
  })

  test('scans cross-line negative-positive AI pattern variants into deslop gate checks', () => {
    const hits = scanBannedWordLeaks([
      '他不是害怕。',
      '而是听见门缝里有人倒着念他的名字。',
      '林青禾不是犹豫',
      '是袖口里的旧印正在发烫。',
    ].join('\n'))

    expect(hits.filter((item: any) => item.pattern === '不是A，而是B')).toHaveLength(2)
    expect(hits[0].evidence).toContain('他不是害怕')
    expect(hits[0].evidence).toContain('而是听见')
    expect(hits[1].evidence).toContain('林青禾不是犹豫')
    expect(hits[1].evidence).toContain('是袖口里的旧印')
    expect(hits.every((item: any) => item.gate === 'A')).toBe(true)
  })

  test('does not flag oh-story negative-positive false-positive variants', () => {
    const hits = scanBannedWordLeaks([
      '门外的声音不是敲门就是抓墙。',
      '他低声问：“你是不是听见它在叫你，是吗？”',
      '那不是雨声，也不是风声。',
    ].join('\n'))

    expect(hits.some((item: any) => item.pattern === '不是A，而是B')).toBe(false)
  })

  test('scans three-part cross-line negative-positive AI pattern variants into deslop gate checks', () => {
    const hits = scanBannedWordLeaks([
      '那不是普通水迹。',
      '也不是屋檐滴水。',
      '而是墙内有人倒着呼吸。',
    ].join('\n'))

    const patternHits = hits.filter((item: any) => item.pattern === '不是A，不是B，而是C')
    expect(patternHits).toHaveLength(1)
    expect(patternHits[0].evidence).toContain('那不是普通水迹')
    expect(patternHits[0].evidence).toContain('也不是屋檐滴水')
    expect(patternHits[0].evidence).toContain('而是墙内有人倒着呼吸')
    expect(patternHits[0].status).toBe('fail')
    expect(patternHits[0].fix).toContain('直接写最终事实')
  })

  test('scans cross-line contrast template AI pattern variants into deslop gate checks', () => {
    const hits = scanBannedWordLeaks([
      '与其说他是在退让。',
      '不如说他在等门后的脚步声靠近。',
      '那张名单看似普通。',
      '实则每一行都在倒着改名。',
    ].join('\n'))

    expect(hits.some((item: any) => item.pattern === '与其说A，不如说B' && item.evidence.includes('不如说他在等'))).toBe(true)
    expect(hits.some((item: any) => item.pattern === '看似A，实则B' && item.evidence.includes('实则每一行'))).toBe(true)
    expect(hits.filter((item: any) => item.status === 'fail')).toHaveLength(2)
  })

  test('scans remaining oh-story mode one AI signature words into Gate A', () => {
    const hits = scanBannedWordLeaks([
      '只见走廊尽头的名单映入眼帘。',
      '此时此刻，管理员目光如炬。',
      '他沉声道：“别动。”',
      '她脸色一变，嘴角微扬。',
    ].join('\n'))

    const patterns = hits.map((item: any) => item.pattern)
    expect(patterns).toEqual(expect.arrayContaining([
      '只见',
      '映入眼帘',
      '此时此刻',
      '目光如炬',
      '沉声道',
      '脸色一变',
      '嘴角微扬',
    ]))
    expect(hits.every((item: any) => item.gate === 'A')).toBe(true)
    expect(hits.map((item: any) => item.fix).join('｜')).toContain('具体')
  })

  test('scans universal metaphor phrasing into Gate A deslop checks', () => {
    const hits = scanBannedWordLeaks([
      '压力像潮水般涌上来，挤得他喘不过气。',
      '那枚旧印像命运的齿轮，终于开始转动。',
      '管理员扣住他的手腕，力道大得像是要把骨头捏碎。',
      '他蹲在门边，像一头被抛弃的野狗。',
      '她脸色惨白得像这漫天的雪。',
      '她哭得梨花带雨，所有人都沉默下来。',
      '长老一句话说完，厅里众人如沐春风。',
      '他像平时一样把钥匙放回柜台。',
    ].join('\n'))

    const universalMetaphors = hits.filter((item: any) => item.pattern === '万能比喻')
    expect(universalMetaphors).toHaveLength(7)
    expect(universalMetaphors[0].evidence).toContain('像潮水般')
    expect(universalMetaphors[1].evidence).toContain('像命运的齿轮')
    expect(universalMetaphors[2].evidence).toContain('像是要把骨头捏碎')
    expect(universalMetaphors[3].evidence).toContain('像一头被抛弃的野狗')
    expect(universalMetaphors[4].evidence).toContain('像这漫天的雪')
    expect(universalMetaphors[5].evidence).toContain('梨花带雨')
    expect(universalMetaphors[6].evidence).toContain('如沐春风')
    expect(universalMetaphors.every((item: any) => item.gate === 'A')).toBe(true)
    expect(universalMetaphors.map((item: any) => item.fix).join('｜')).toContain('白描')
    expect(hits.some((item: any) => item.evidence.includes('像平时一样'))).toBe(false)
  })

  test('scans summary realization phrasing into Gate A deslop checks', () => {
    const hits = scanBannedWordLeaks([
      '他终于明白，管理员从第一夜就在筛选学生。',
      '她这才意识到，账本最后一页不是欠款。',
      '此刻，他再也没有退路。',
      '一切证词都指向门后的第四个人。',
      '原来名单从第一夜就在筛选他。',
      '这就是规则塔真正的入口。',
      '“原来你在这里。”林青禾把伞递过去。',
    ].join('\n'))

    const summaryHits = hits.filter((item: any) => item.pattern === '总结句式')
    expect(summaryHits).toHaveLength(6)
    expect(summaryHits[0].evidence).toContain('终于明白')
    expect(summaryHits[1].evidence).toContain('这才意识到')
    expect(summaryHits[2].evidence).toContain('此刻')
    expect(summaryHits[3].evidence).toContain('一切证词都')
    expect(summaryHits[4].evidence).toContain('原来名单')
    expect(summaryHits[5].evidence).toContain('这就是规则塔')
    expect(summaryHits.every((item: any) => item.gate === 'A')).toBe(true)
    expect(summaryHits.map((item: any) => item.fix).join('｜')).toContain('现场证据')
    expect(hits.some((item: any) => item.evidence.includes('原来你在这里'))).toBe(false)
  })

  test('scans this-moment elevation phrasing into Gate A deslop checks', () => {
    const hits = scanBannedWordLeaks([
      '这一刻，所有人都相信未来可期。',
      '这一刻，门后的名单终于露出第四个名字。',
      '“就这一刻。”林青禾把钥匙按进锁孔。',
    ].join('\n'))

    const summaryHits = hits.filter((item: any) => item.pattern === '总结句式')
    expect(summaryHits).toHaveLength(2)
    expect(summaryHits[0].evidence).toContain('这一刻，所有人')
    expect(summaryHits[1].evidence).toContain('这一刻，门后的名单')
    expect(summaryHits.every((item: any) => item.gate === 'A')).toBe(true)
    expect(summaryHits.map((item: any) => item.fix).join('｜')).toContain('现场证据')
    expect(hits.some((item: any) => item.evidence.includes('就这一刻'))).toBe(false)
  })

})

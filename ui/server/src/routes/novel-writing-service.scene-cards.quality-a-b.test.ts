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
  ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n'),
  readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8'),
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

describe('normalizeSceneCardsPayload quality a b', () => {
  test('does not flag character order when prose follows the blueprint', () => {
    const checks = scanCharacterOrderExecutionRisks({
      chapter_target: {
        chapter_blueprint: {
          character_order: ['会长', '林青禾', '李玄'],
        },
      },
    }, [
      '会长坐在主位上，指尖敲着旧账册的封皮。',
      '林青禾被带到证人席，袖口还压着昨夜留下的泥点。',
      '李玄最后踏进审判庭，把第二本账册放在所有人面前。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic character order risks into intent confirmation checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicCharacterOrderChecks = scanCharacterOrderExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicCharacterOrderChecks')
  })
  test('detects missing or out-of-order chapter blueprint beat sequence', () => {
    const checks = scanBeatSequenceExecutionRisks({
      chapter_target: {
        chapter_blueprint: {
          beat_sequence: [
            { beat_no: 1, action: '会长当众压问林青禾', function_tag: '铺垫压力' },
            { beat_no: 2, action: '林青禾交出旧账册缺页', function_tag: '信息差反转' },
            { beat_no: 3, action: '李玄用第二本账册反证会长', function_tag: '爽点兑现' },
          ],
        },
      },
    }, [
      '李玄先把第二本账册摊在审判桌上，当众反证会长。',
      '会长脸色一沉，这才开始压问林青禾。',
      '林青禾始终攥着袖口，没有交出旧账册缺页。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('beat_sequence_missing_and_out_of_order')
    expect(checks[0].label).toBe('情节点序列扫描')
    expect(checks[0].evidence).toContain('缺失：2.信息差反转')
    expect(checks[0].evidence).toContain('乱序')
    expect(checks[0].fix).toContain('谁做了什么')
    expect(checks[0].fix).toContain('功能标签')
  })
  test('does not flag beat sequence when planned beats are delivered in order', () => {
    const checks = scanBeatSequenceExecutionRisks({
      chapter_target: {
        chapter_blueprint: {
          beat_sequence: [
            { beat_no: 1, action: '会长当众压问林青禾', function_tag: '铺垫压力' },
            { beat_no: 2, action: '林青禾交出旧账册缺页', function_tag: '信息差反转' },
            { beat_no: 3, action: '李玄用第二本账册反证会长', function_tag: '爽点兑现' },
          ],
        },
      },
    }, [
      '会长当众压问林青禾，逼她说明昨夜为何进过账房。',
      '林青禾把袖中的旧账册缺页交出来，缺页上的编号立刻形成信息差反转。',
      '李玄接过缺页，用第二本账册反证会长，让审判庭的局势彻底翻过来。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic beat sequence risks into intent confirmation checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicBeatSequenceChecks = scanBeatSequenceExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicBeatSequenceChecks')
  })
  test('detects missing cost when chapter blueprint only delivers the reward', () => {
    const checks = scanCostRewardExecutionRisks({
      chapter_target: {
        chapter_blueprint: {
          cost_and_reward: '代价：林青禾公开得罪会长；收益：李玄夺回审讯解释权。',
        },
      },
    }, [
      '李玄把旧账册按在桌上，会长被迫改口。',
      '审讯席上的解释权终于回到李玄手里，他夺回了所有人的视线。',
      '林青禾站在旁边，没有开口。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('cost_reward_missing_cost')
    expect(checks[0].label).toBe('代价/收益兑现扫描')
    expect(checks[0].evidence).toContain('计划代价：林青禾公开得罪会长')
    expect(checks[0].evidence).toContain('计划收益：李玄夺回审讯解释权')
    expect(checks[0].fix).toContain('谁付出代价')
    expect(checks[0].fix).toContain('谁获得收益')
  })
  test('does not flag cost reward execution when both sides are visible', () => {
    const checks = scanCostRewardExecutionRisks({
      chapter_target: {
        chapter_blueprint: {
          cost_and_reward: '代价：林青禾公开得罪会长；收益：李玄夺回审讯解释权。',
        },
      },
    }, [
      '林青禾当着所有人的面走出旁听席，公开作证，等于当场得罪会长。',
      '李玄抓住她递出的账册编号，把审讯解释权重新夺回手里。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic cost reward risks into intent confirmation checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicCostRewardChecks = scanCostRewardExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicCostRewardChecks')
  })
  test('detects local victories that close without a new cost or risk', () => {
    const checks = scanLocalVictoryCostRisks([
      '第12章 资格门',
      '',
      '李玄把最后一枚阵牌按进门缝，红光熄灭，资格门终于通过。',
      '',
      '执事退后一步，众人松了一口气，这一关总算赢了。',
      '',
      '他拿到奖励，回到住处休息。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('local_victory_without_cost_1_3')
    expect(checks[0].label).toBe('局部胜利代价扫描')
    expect(checks[0].evidence).toContain('资格门终于通过')
    expect(checks[0].fix).toContain('新的代价')
    expect(checks[0].fix).toContain('风险')
  })
  test('does not flag local victories that open a new cost risk or next pressure', () => {
    const checks = scanLocalVictoryCostRisks([
      '第12章 资格门',
      '',
      '李玄把最后一枚阵牌按进门缝，红光熄灭，资格门终于通过。',
      '',
      '但阵牌背面的旧印也随之暴露，执事记下他的名字，下一轮核验被提前到十息之后。',
      '',
      '他拿到奖励，却必须立刻赶去禁库，否则林青禾会被取消作证资格。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic local victory cost risks into plot dynamics checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicLocalVictoryCostChecks = scanLocalVictoryCostRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicLocalVictoryCostChecks')
  })
  test('wires deterministic blueprint craft risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicBlueprintCraftChecks = scanChapterBlueprintCraftRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicBlueprintCraftChecks')
  })
  test('turns missing source readiness rows into deterministic state tracking checks', () => {
    const checks = buildSourceReadinessChecks({
      chapter_target: {
        state_tracking_contract: {
          source_readiness: [
            {
              key: 'previous_chapter',
              label: '上一章正文/章尾钩子',
              status: 'missing',
              evidence: '',
              fix: '补齐上一章正文、摘要或章尾钩子后再写承接。',
            },
            {
              key: 'character_state',
              label: '角色状态',
              status: 'warn',
              evidence: '只有角色名，没有当前位置和认知边界。',
              fix: '补齐本章出场角色状态。',
            },
            {
              key: 'world_constraints',
              label: '世界约束',
              status: 'ready',
              evidence: '禁门规则已就绪。',
            },
          ],
        },
      },
    })

    expect(checks).toHaveLength(2)
    expect(checks[0].key).toBe('source_readiness_previous_chapter')
    expect(checks[0].status).toBe('fail')
    expect(checks[0].fix).toContain('补齐上一章')
    expect(checks[1].key).toBe('source_readiness_character_state')
    expect(checks[1].status).toBe('warn')
    expect(checks.map(item => item.key)).not.toContain('source_readiness_world_constraints')
  })
  test('reads runtime camelCase chapterTarget source readiness rows for deterministic checks', () => {
    const checks = buildSourceReadinessChecks({
      chapterTarget: {
        stateTrackingContract: {
          sourceReadiness: [
            {
              key: 'previous_chapter',
              label: '上一章正文/章尾钩子',
              status: 'missing',
              fix: '补齐上一章正文、摘要或章尾钩子后再写承接。',
            },
            {
              key: 'character_state',
              label: '角色状态',
              status: 'warn',
              evidence: '缺当前位置和认知边界。',
              fix: '补齐本章出场角色状态。',
            },
          ],
        },
      },
    })

    expect(checks).toHaveLength(2)
    expect(checks[0].key).toBe('source_readiness_previous_chapter')
    expect(checks[0].status).toBe('fail')
    expect(checks[1].key).toBe('source_readiness_character_state')
    expect(checks[1].status).toBe('warn')
  })
  test('turns critical missing source readiness rows into prose preflight blockers', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        state_tracking_contract: {
          source_readiness: [
            {
              key: 'previous_chapter',
              label: '上一章正文/章尾钩子',
              status: 'missing',
              fix: '补齐上一章正文、摘要或章尾钩子后再写承接。',
            },
            {
              key: 'character_state',
              label: '角色状态',
              status: 'warn',
              evidence: '缺认知边界。',
              fix: '补齐本章出场角色状态。',
            },
            {
              key: 'world_constraints',
              label: '世界约束',
              status: 'ready',
            },
          ],
        },
      },
    })

    expect(checks).toHaveLength(2)
    expect(checks[0].key).toBe('source_readiness_previous_chapter')
    expect(checks[0].severity).toBe('high')
    expect(checks[0].ok).toBe(false)
    expect(checks[1].key).toBe('source_readiness_character_state')
    expect(checks[1].severity).toBe('medium')
  })
  test('reads runtime camelCase chapterTarget source readiness rows for prose preflight blockers', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapterTarget: {
        stateTrackingContract: {
          sourceReadiness: [
            {
              key: 'previous_chapter',
              label: '上一章正文/章尾钩子',
              status: 'missing',
              fix: '补齐上一章正文、摘要或章尾钩子后再写承接。',
            },
            {
              key: 'character_state',
              label: '角色状态',
              status: 'warn',
              evidence: '缺认知边界。',
              fix: '补齐本章出场角色状态。',
            },
          ],
        },
      },
    })

    expect(checks).toHaveLength(2)
    expect(checks[0].key).toBe('source_readiness_previous_chapter')
    expect(checks[0].severity).toBe('high')
    expect(checks[1].key).toBe('source_readiness_character_state')
    expect(checks[1].severity).toBe('medium')
  })
  test('requires timeline tracking when daily workflow source requirements mention timeline', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        chapter_no: 8,
        state_tracking_contract: {
          source_requirements: ['追踪/上下文.md', '追踪/伏笔.md', '追踪/时间线.md'],
          source_readiness: [
            {
              key: 'previous_chapter',
              label: '上一章正文/章尾钩子',
              status: 'ready',
              evidence: '上一章以旧楼门牌变化收束。',
            },
            {
              key: 'context_tracking',
              label: '追踪/上下文',
              status: 'ready',
              evidence: '最近状态摘要已加载。',
            },
            {
              key: 'foreshadowing_history',
              label: '伏笔/前史',
              status: 'ready',
              evidence: '旧楼门牌伏笔已筛选。',
            },
          ],
        },
      },
    })

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('source_readiness_timeline_tracking')
    expect(checks[0].severity).toBe('medium')
    expect(checks[0].label).toBe('追踪/时间线')
    expect(checks[0].fix).toContain('追踪/时间线.md')
  })
  test('requires all daily workflow source requirements to have readiness rows', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        chapter_no: 8,
        chapter_blueprint: {
          target_emotion: '紧张追查',
          opening_hook: '旧楼门牌变化。',
          core_payoff: '确认门牌变化来源。',
          content_outline: {
            cause: '门牌变化',
            development: '核对线索',
            turn: '时间戳提前',
            climax: '规则阻止开门',
            ending: '新时间戳出现',
          },
          plot_lines: {
            mainline: '追查旧楼门牌变化',
            logic_line: '门牌变化 -> 时间戳 -> 规则判定',
          },
          character_order: ['李玄', '林青禾'],
          beat_sequence: ['核对门牌', '发现时间戳', '阻止开门'],
          cost_and_reward: '代价：错过安全窗口；收益：确认规则。',
          ending_contract: {
            next_chapter_pull: '新时间戳指向下一处门牌。',
          },
        },
        state_tracking_contract: {
          source_requirements: [
            '本章细纲/场景卡',
            '上一章正文或上一章承接',
            '追踪/上下文.md',
            '追踪/伏笔.md',
            '追踪/时间线.md',
            '追踪/角色状态.md',
          ],
          source_readiness: [
            {
              key: 'chapter_blueprint',
              label: '本章细纲/场景卡',
              status: 'ready',
              evidence: '第8章蓝图已确认。',
            },
          ],
        },
      },
    })

    expect(checks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'source_readiness_previous_chapter',
      'source_readiness_context_tracking',
      'source_readiness_foreshadowing_tracking',
      'source_readiness_timeline_tracking',
      'source_readiness_character_state',
    ]))
    expect(checks.find((item: any) => item.key === 'source_readiness_previous_chapter')?.severity).toBe('high')
    expect(checks.find((item: any) => item.key === 'source_readiness_context_tracking')?.label).toBe('追踪/上下文')
    expect(checks.find((item: any) => item.key === 'source_readiness_foreshadowing_tracking')?.fix).toContain('追踪/伏笔.md')
    expect(checks.find((item: any) => item.key === 'source_readiness_character_state')?.fix).toContain('追踪/角色状态.md')
  })
  test('requires daily workflow ready source rows to carry concrete evidence', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        chapter_no: 9,
        state_tracking_contract: {
          source_requirements: [
            '上一章正文或上一章承接',
            '追踪/角色状态.md',
          ],
          source_readiness: [
            {
              key: 'previous_chapter',
              label: '上一章正文/章尾钩子',
              status: 'ready',
              evidence: '',
            },
            {
              key: 'character_state',
              label: '追踪/角色状态',
              status: 'ready',
            },
          ],
        },
      },
    })

    expect(checks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'source_readiness_previous_chapter',
      'source_readiness_character_state',
    ]))
    expect(checks.find((item: any) => item.key === 'source_readiness_previous_chapter')?.severity).toBe('high')
    expect(checks.find((item: any) => item.key === 'source_readiness_previous_chapter')?.evidence).toContain('缺少 evidence')
    expect(checks.find((item: any) => item.key === 'source_readiness_character_state')?.fix).toContain('角色状态')
  })
})

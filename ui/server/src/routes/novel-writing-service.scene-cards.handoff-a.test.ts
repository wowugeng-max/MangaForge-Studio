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

describe('normalizeSceneCardsPayload handoff a', () => {
  test('does not flag opening hooks when the ending pays off or converts the hook into a next debt', () => {
    const checks = scanOpeningHookEchoRisks([
      '第10章 公审台',
      '',
      '证据刚摆上桌就被执事当众撕毁，碎纸落在李辰脚边。',
      '',
      '台下的人跟着起哄，催他立刻认罪。',
      '',
      '李辰把碎纸背面的半枚印章拼回去，执事脸色第一次变了。',
      '',
      '那枚印章不是执事的，背后的名字指向审判长。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic opening-hook echo risks into chapter hook self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicOpeningHookEchoChecks = scanOpeningHookEchoRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicOpeningHookEchoChecks')
  })
  test('detects golden-three launch execution gaps in the first chapter', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 1,
        golden_three_brief: {
          version: 'oh_story_golden_three_v1',
          chapter_no: 1,
          phase_label: '第一章启动',
          current_chapter_payoffs: ['主角用残阵反证栽赃'],
          payoff_target_count: 2,
        },
      },
    }

    const checks = scanGoldenThreeExecutionRisks(contextPackage, [
      '第1章 残阵开局',
      '',
      '九州大陆的阵修体系分为九品，寒门弟子必须从最基础的聚灵纹开始，宗门历史可以追溯到三百年前。',
      '外门规矩很多，阵堂规矩更多，每一条规矩都关系到弟子的未来。',
      '这一切都说明，属于他的故事才刚刚开始。',
    ].join('\n'))

    expect(checks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'golden_three_opening_hook_missing',
      'golden_three_protagonist_missing',
      'golden_three_event_missing',
      'golden_three_worldbuilding_infodump',
      'golden_three_payoff_missing',
      'golden_three_ending_hook_missing',
    ]))
    expect(checks.map((item: any) => item.label)).toContain('黄金三章启动扫描')
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('第一章前 500 字')
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('大段世界观说明')
  })
  test('reads runtime camelCase chapterTarget goldenThreeBrief during deterministic review', () => {
    const contextPackage = {
      chapterTarget: {
        chapterNo: 1,
        goldenThreeBrief: {
          version: 'oh_story_golden_three_v1',
          chapterNo: 1,
          phaseLabel: '第一章启动',
          currentChapterPayoffs: ['主角用残阵反证栽赃'],
          payoffTargetCount: 2,
        },
      },
    }

    const checks = scanGoldenThreeExecutionRisks(contextPackage, [
      '第1章 残阵开局',
      '',
      '九州大陆的阵修体系分为九品，寒门弟子必须从最基础的聚灵纹开始，宗门历史可以追溯到三百年前。',
      '外门规矩很多，阵堂规矩更多，每一条规矩都关系到弟子的未来。',
      '这一切都说明，属于他的故事才刚刚开始。',
    ].join('\n'))

    expect(checks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'golden_three_opening_hook_missing',
      'golden_three_protagonist_missing',
      'golden_three_event_missing',
      'golden_three_worldbuilding_infodump',
      'golden_three_payoff_missing',
      'golden_three_ending_hook_missing',
    ]))
  })
  test('does not flag golden-three launch when first chapter delivers hook protagonist payoff and ending question', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 1,
        golden_three_brief: {
          version: 'oh_story_golden_three_v1',
          chapter_no: 1,
          phase_label: '第一章启动',
          current_chapter_payoffs: ['李玄用残阵反证执事栽赃'],
          payoff_target_count: 2,
        },
      },
    }

    const checks = scanGoldenThreeExecutionRisks(contextPackage, [
      '第1章 残阵开局',
      '',
      '阵堂门突然炸开，李玄一把按住飞来的阵图碎片，掌心立刻渗出血。',
      '执事冷声逼问：“偷阵图的人是不是你？”',
      '李玄没有退，反手把残阵纹路压在桌上，当众反证执事栽赃。',
      '旁观弟子从怀疑到沉默，阵图背面却露出第二层阵纹。',
      '第二层阵纹为什么只在他掌心流血时显形？',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic golden-three risks into quality audit checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicGoldenThreeChecks = scanGoldenThreeExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicGoldenThreeChecks')
  })
  test('detects consecutive paragraphs without paragraph-level hook signals', () => {
    const checks = scanParagraphHookStallRisks([
      '第8章 雨夜',
      '',
      '雨水顺着旧楼外墙往下淌，窗框边缘积着灰。',
      '',
      '走廊尽头的灯亮得很慢，墙面被照出一层发黄的斑。',
      '',
      '李辰站在门边，衣袖被冷风吹得贴住手腕。',
      '',
      '桌上的课本摊开着，纸页边角微微卷起。',
      '',
      '广播忽然响起：“十秒后核验身份。”',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('paragraph_hook_stall_1_4')
    expect(checks[0].label).toBe('段落级钩子扫描')
    expect(checks[0].evidence).toContain('第1-4段')
    expect(checks[0].fix).toContain('信息差')
    expect(checks[0].fix).toContain('倒计时')
    expect(checks[0].fix).toContain('异常物件')
  })
  test('wires deterministic paragraph hook stall risks into paragraph hook self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicParagraphHookStallChecks = scanParagraphHookStallRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicParagraphHookStallChecks')
  })
  test('detects crowd-only shock without layered observer payoff', () => {
    const checks = scanShockLayeringRisks([
      '第9章 公审台',
      '',
      '李辰把检测报告摔在桌上，屏幕里的数值一路飙红。',
      '',
      '全场瞬间震惊，所有人都倒吸一口凉气，现场一片哗然。',
      '',
      '众人面面相觑，没有人说得出话来。',
      '',
      '他收回报告，转身走下台。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('shock_layering_crowd_only_2')
    expect(checks[0].label).toBe('震惊分层扫描')
    expect(checks[0].evidence).toContain('全场瞬间震惊')
    expect(checks[0].fix).toContain('围观者质量层级')
    expect(checks[0].fix).toContain('懂行')
  })
  test('does not flag shock when an expert observer reveals why it matters', () => {
    const checks = scanShockLayeringRisks([
      '第9章 公审台',
      '',
      '李辰把检测报告摔在桌上，屏幕里的数值一路飙红。',
      '',
      '全场瞬间震惊，所有人都倒吸一口凉气。',
      '',
      '主考官脸色变了：“这个数值意味着他不是作弊，而是把旧记录翻了三倍。”',
      '',
      '台下那几个刚才嘲笑他的学生同时闭上了嘴。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('detects public payoff scenes without differentiated spectator reactions', () => {
    const checks = scanSpectatorReactionDifferentiationRisks([
      '第9章 公审台',
      '',
      '李辰把第二本账册摊开，当众反证周薄森的指控。',
      '',
      '全场瞬间震惊，所有人都倒吸一口凉气，现场一片哗然。',
      '',
      '周薄森脸色发白，事情终于真相大白。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('spectator_reaction_unified')
    expect(checks[0].label).toBe('围观反应分层')
    expect(checks[0].evidence).toContain('全场瞬间震惊')
    expect(checks[0].fix).toContain('普通人')
    expect(checks[0].fix).toContain('懂行者')
    expect(checks[0].fix).toContain('反派')
  })
  test('does not flag public payoff scenes with layered spectator reactions', () => {
    const checks = scanSpectatorReactionDifferentiationRisks([
      '第9章 公审台',
      '',
      '李辰把第二本账册摊开，当众反证周薄森的指控。',
      '',
      '旁听席先炸开，几个刚才起哄的商户停住脚步，不敢再跟着喊。',
      '',
      '账房老吏把算盘珠拨回去，低声说：“这页墨色是三年前的，周家账册对不上。”',
      '',
      '周薄森脸色发白，按住桌角往后退了半步。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('builds spectator reaction sync report from public payoff delivery', () => {
    const okReport = buildSpectatorReactionSyncReport(
      { title: '公审账册' },
      { id: 9, chapter_no: 9, title: '公审台' },
      {},
      [
        '李辰把第二本账册摊开，当众反证周薄森的指控。',
        '旁听席先炸开，几个刚才起哄的商户停住脚步，不敢再跟着喊。',
        '账房老吏把算盘珠拨回去，低声说：“这页墨色是三年前的。”',
        '周薄森脸色发白，按住桌角往后退了半步。',
      ].join('\n'),
    )
    const warnReport = buildSpectatorReactionSyncReport(
      { title: '公审账册' },
      { id: 9, chapter_no: 9, title: '公审台' },
      {},
      [
        '李辰把第二本账册摊开，当众反证周薄森的指控。',
        '全场瞬间震惊，所有人都倒吸一口凉气，现场一片哗然。',
        '周薄森脸色发白，事情终于真相大白。',
      ].join('\n'),
    )

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('围观反应 OK')
    expect(okReport.missed_count).toBe(0)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('围观反应缺口')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('spectator_reaction_unified')
    expect(warnReport.next_actions.join('；')).toContain('差异化反应')
  })
  test('wires deterministic shock layering risks into paragraph hook self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicShockLayeringChecks = scanShockLayeringRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicShockLayeringChecks')
  })
  test('detects evidence payoff without prior setup', () => {
    const checks = scanPayoffSetupRisks([
      '第10章 公审台',
      '',
      '李辰站在台前，灯光照得他脸色发白。',
      '',
      '对面的人冷笑着催他认输，台下也有人跟着起哄。',
      '',
      '他突然拿出一份检测报告，当众打脸所有质疑者。',
      '',
      '真相公开后，反派脸色惨白，再也说不出话。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('payoff_without_setup_3')
    expect(checks[0].label).toBe('爽点铺垫扫描')
    expect(checks[0].evidence).toContain('检测报告')
    expect(checks[0].fix).toContain('证据链')
    expect(checks[0].fix).toContain('铺垫')
  })
  test('does not flag evidence payoff when prior clues establish the setup', () => {
    const checks = scanPayoffSetupRisks([
      '第10章 公审台',
      '',
      '李辰把手机倒扣在掌心，录音键还亮着红点。',
      '',
      '他昨晚从档案室带出的检测报告，被他压在外套里。',
      '',
      '对面的人冷笑着催他认输，台下也有人跟着起哄。',
      '',
      '他这才把检测报告摊开，当众打脸所有质疑者。',
      '',
      '真相公开后，反派脸色惨白，再也说不出话。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('builds payoff setup sync report from evidence payoff setup risks', () => {
    const okReport = buildPayoffSetupSyncReport(
      { title: '公审账册' },
      { id: 10, chapter_no: 10, title: '公审台' },
      {},
      [
        '李辰把手机倒扣在掌心，录音键还亮着红点。',
        '他昨晚从档案室带出的检测报告，被他压在外套里。',
        '对面的人冷笑着催他认输，台下也有人跟着起哄。',
        '他这才把检测报告摊开，当众打脸所有质疑者。',
        '真相公开后，反派脸色惨白，再也说不出话。',
      ].join('\n'),
    )
    const warnReport = buildPayoffSetupSyncReport(
      { title: '公审账册' },
      { id: 10, chapter_no: 10, title: '公审台' },
      {},
      [
        '李辰站在台前，灯光照得他脸色发白。',
        '',
        '对面的人冷笑着催他认输，台下也有人跟着起哄。',
        '',
        '他突然拿出一份检测报告，当众打脸所有质疑者。',
        '',
        '真相公开后，反派脸色惨白，再也说不出话。',
      ].join('\n'),
    )

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('爽点铺垫 OK')
    expect(okReport.missed_count).toBe(0)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('爽点铺垫缺口')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('payoff_without_setup_3')
    expect(warnReport.next_actions.join('；')).toContain('可指认的危机')
  })
  test('wires deterministic payoff setup risks into quality audit self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicPayoffSetupChecks = scanPayoffSetupRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicPayoffSetupChecks')
  })
  test('detects face-slap payoff without antagonist pressure or gloating first', () => {
    const checks = scanFaceSlapRhythmRisks([
      '第10章 公审台',
      '',
      '李辰把昨晚留下的录音备份按在掌心。',
      '',
      '他走到审判桌前，把检测报告摊开。',
      '',
      '报告上的数值直接反证旧账册，所有人都知道执事栽赃失败。',
      '',
      '执事脸色惨白，再也说不出话。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('face_slap_without_antagonist_pressure')
    expect(checks[0].label).toBe('打脸节奏扫描')
    expect(checks[0].evidence).toContain('检测报告')
    expect(checks[0].fix).toContain('反派')
    expect(checks[0].fix).toContain('得意')
  })
  test('does not flag face-slap payoff when antagonist pressure sets up the reversal', () => {
    const checks = scanFaceSlapRhythmRisks([
      '第10章 公审台',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼李辰认罪。',
      '',
      '台下的人跟着起哄，催他现在就交出阵牌。',
      '',
      '李辰把昨晚留下的录音备份按在掌心。',
      '',
      '他这才把检测报告摊开，当众反证旧账册。',
      '',
      '执事脸色惨白，再也说不出话。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic face-slap rhythm risks into reversal self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicFaceSlapRhythmChecks = scanFaceSlapRhythmRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicFaceSlapRhythmChecks')
  })
  test('detects revenge evidence chains dumped all at once instead of released in steps', () => {
    const checks = scanEvidenceChainDumpRisks([
      '第10章 公审台',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼李辰认罪。',
      '',
      '李辰没有争辩。',
      '',
      '他把录音、监控视频、检测报告和转账截图一起投到大屏上，旧账册当场被反证。',
      '',
      '执事脸色惨白，再也说不出话。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('evidence_chain_dumped_once')
    expect(checks[0].label).toBe('证据链分批释放扫描')
    expect(checks[0].evidence).toContain('录音')
    expect(checks[0].fix).toContain('分批释放')
    expect(checks[0].fix).toContain('最终证据')
  })
  test('does not flag evidence chains when clues and evidence are released in stages', () => {
    const checks = scanEvidenceChainDumpRisks([
      '第10章 公审台',
      '',
      '李辰把手机倒扣在掌心，录音红点还亮着。',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼他认罪。',
      '',
      '台下有人指出昨晚监控少了三分钟，执事脸上的笑僵了一下。',
      '',
      '李辰这才把检测报告推到灯下，报告编号正好对应那三分钟。',
      '',
      '最后，他亮出转账截图，执事的名字压在收款栏里。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic evidence-chain dump risks into reversal self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEvidenceChainDumpChecks = scanEvidenceChainDumpRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicEvidenceChainDumpChecks')
  })
  test('detects evidence chains whose final evidence does not change the global understanding', () => {
    const checks = scanFinalEvidenceImpactRisks([
      '第10章 公审台',
      '',
      '李辰先放出录音，证明执事昨晚改过证词。',
      '',
      '台下有人指出监控少了三分钟，执事脸上的笑僵了一下。',
      '',
      '李辰最后把检测报告推到灯下，报告显示旧账册上的墨迹确实更晚。',
      '',
      '执事脸色发白，没人再替他说话。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('final_evidence_lacks_global_impact')
    expect(checks[0].label).toBe('最终证据强度扫描')
    expect(checks[0].evidence).toContain('检测报告')
    expect(checks[0].fix).toContain('最终证据')
    expect(checks[0].fix).toContain('全局认知')
  })
  test('does not flag evidence chains when the final evidence reveals the decisive global turn', () => {
    const checks = scanFinalEvidenceImpactRisks([
      '第10章 公审台',
      '',
      '李辰先放出录音，证明执事昨晚改过证词。',
      '',
      '台下有人指出监控少了三分钟，执事脸上的笑僵了一下。',
      '',
      '李辰最后亮出转账截图，收款人不是执事，而是审判长本人。',
      '',
      '公审台彻底变了性质，旧账册不再是私人栽赃，而是整个审判庭的黑幕资金链。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic final-evidence impact risks into reversal self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicFinalEvidenceImpactChecks = scanFinalEvidenceImpactRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicFinalEvidenceImpactChecks')
  })
  test('detects evidence chains without a protagonist-planted time-bomb proof', () => {
    const checks = scanEvidenceTimeBombRisks([
      '第10章 公审台',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼李辰认罪。',
      '',
      '李辰先放出录音，证明执事昨晚改过证词。',
      '',
      '台下有人指出监控少了三分钟，执事脸上的笑僵了一下。',
      '',
      '李辰最后亮出转账截图，收款人不是执事，而是审判长本人。',
      '',
      '公审台彻底变了性质，旧账册不再是私人栽赃，而是整个审判庭的黑幕资金链。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('evidence_time_bomb_missing')
    expect(checks[0].label).toBe('定时炸弹证据扫描')
    expect(checks[0].evidence).toContain('录音')
    expect(checks[0].fix).toContain('定时炸弹')
    expect(checks[0].fix).toContain('提前')
  })
  test('does not flag evidence chains when the protagonist planted delayed proof before the payoff', () => {
    const checks = scanEvidenceTimeBombRisks([
      '第10章 公审台',
      '',
      '李辰把手机倒扣在掌心，录音红点从开场就亮着。',
      '',
      '他昨晚提前把备份文件设成定时发送，只等审判长亲口否认。',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼李辰认罪。',
      '',
      '李辰先放出录音，证明执事昨晚改过证词。',
      '',
      '台下有人指出监控少了三分钟，执事脸上的笑僵了一下。',
      '',
      '李辰最后亮出转账截图，收款人不是执事，而是审判长本人。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic evidence time-bomb risks into reversal self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEvidenceTimeBombChecks = scanEvidenceTimeBombRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicEvidenceTimeBombChecks')
  })
  test('detects antagonist downfall that is unrelated to protagonist action', () => {
    const checks = scanAntagonistDownfallAgencyRisks([
      '第10章 公审台',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼李辰认罪。',
      '',
      '李辰还没来得及开口，警局的人突然冲进大厅。',
      '',
      '执事当场被带走，资格被取消，所有人都知道他再也翻不了身。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('antagonist_downfall_without_protagonist_agency')
    expect(checks[0].label).toBe('反派结局因果扫描')
    expect(checks[0].evidence).toContain('执事当场被带走')
    expect(checks[0].fix).toContain('主角行动')
  })
  test('does not flag antagonist downfall when protagonist action causes the collapse', () => {
    const checks = scanAntagonistDownfallAgencyRisks([
      '第10章 公审台',
      '',
      '李辰把提前备份的录音推到审判桌上，只问执事一句：“这段话也是我伪造的？”',
      '',
      '执事下意识否认，屏幕上的转账截图却自动跳出他的名字。',
      '',
      '审判长当场取消执事资格，警局的人顺着李辰提交的证据把他带走。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic antagonist-downfall agency risks into reversal self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicAntagonistDownfallAgencyChecks = scanAntagonistDownfallAgencyRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicAntagonistDownfallAgencyChecks')
  })
  test('detects revenge face-slap scenes where the protagonist loses composure without a calm action anchor', () => {
    const checks = scanProtagonistComposureRisks({
      chapter_target: {
        genre_positioning_contract: { genre_tags: ['复仇', '打脸'] },
        character_behavior_contract: { protagonist_name: '江辰' },
      },
    }, [
      '第12章 长案灯下',
      '',
      '执事把旧账册摔到长案上，冷笑着逼江辰低头。',
      '',
      '江辰猛地吼道：“你们凭什么这样对我！我明明没有碰过账册，你们都在撒谎！”',
      '',
      '他气得浑身发抖，眼眶发红，冲上去和执事争抢账册。',
      '',
      '执事仍旧靠在椅背上，只说他现在已经输了。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('protagonist_composure_missing')
    expect(checks[0].label).toBe('主角冷静度扫描')
    expect(checks[0].evidence).toContain('江辰猛地吼道')
    expect(checks[0].fix).toContain('冷静动作')
    expect(checks[0].fix).toContain('反派')
  })
  test('reads runtime camelCase chapterTarget face-slap context for protagonist composure scan', () => {
    const checks = scanProtagonistComposureRisks({
      chapter_target: {
        chapter_no: 12,
        title: '长案灯下',
      },
      chapterTarget: {
        summary: '江辰当众反证执事栽赃，完成公审打脸。',
        genrePositioningContract: { genreTags: ['复仇', '打脸'] },
        characterBehaviorContract: { protagonistName: '江辰' },
      },
    }, [
      '第12章 长案灯下',
      '',
      '执事把旧账册摔到长案上，冷笑着逼江辰低头。',
      '',
      '江辰猛地吼道：“你们凭什么这样对我！我明明没有碰过账册，你们都在撒谎！”',
      '',
      '他气得浑身发抖，眼眶发红，冲上去和执事争抢账册。',
      '',
      '执事仍旧靠在椅背上，只说他现在已经输了。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('protagonist_composure_missing')
    expect(checks[0].evidence).toContain('江辰猛地吼道')
  })
  test('does not flag face-slap scenes when the protagonist stays controlled and the antagonist loses ground', () => {
    const checks = scanProtagonistComposureRisks({
      chapter_target: {
        genre_positioning_contract: { genre_tags: ['复仇', '打脸'] },
        character_behavior_contract: { protagonist_name: '江辰' },
      },
    }, [
      '第12章 公审反证',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼江辰认罪。',
      '',
      '江辰没有争辩，只把袖口压平，指尖按住账册缺页。',
      '',
      '“第三页，念。”',
      '',
      '执事脸色骤变，声音拔高：“不可能，那一页早就被烧了！”',
      '',
      '江辰把备份账册推到灯下。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic protagonist composure risks into character behavior self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicProtagonistComposureChecks = scanProtagonistComposureRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicProtagonistComposureChecks')
  })
})

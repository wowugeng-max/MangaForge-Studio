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
} from '../novel-writing-service'
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

describe('normalizeSceneCardsPayload contracts b b', () => {
  test('reads runtime camelCase chapterTarget reader promise for entry promise alignment', () => {
    const checks = scanEntryPromiseAlignmentRisks(
      { title: '旧楼铃声' },
      {
        chapterTarget: {
          chapterNo: 1,
          title: '旧楼铃声',
          readerPromise: '血缘系统第一次检测揭开三位妈妈身份反转。',
        },
      },
      [
        '第1章 旧楼铃声',
        '',
        '李岚推开旧楼的门，走廊里只有一盏坏掉的灯。',
        '',
        '广播重复着陌生的校规，所有人必须在十点前回到房间。',
        '',
        '他握紧手里的裁员信，知道今晚不能再出错。',
      ].join('\n'),
    )

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('entry_promise_mismatch')
    expect(checks[0].evidence).toContain('血缘系统')
    expect(checks[0].evidence).toContain('三位妈妈')
  })
  test('uses runtime camelCase chapterTarget chapter number over stale chapter_target for entry promise alignment', () => {
    const checks = scanEntryPromiseAlignmentRisks(
      { title: '旧楼铃声' },
      {
        chapter_target: {
          chapter_no: 12,
          title: '陈旧章节',
        },
        chapterTarget: {
          chapterNo: 1,
          title: '旧楼铃声',
          readerPromise: '血缘系统第一次检测揭开三位妈妈身份反转。',
        },
      },
      [
        '第1章 旧楼铃声',
        '',
        '李岚推开旧楼的门，走廊里只有一盏坏掉的灯。',
        '',
        '广播重复着陌生的校规，所有人必须在十点前回到房间。',
      ].join('\n'),
    )

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('entry_promise_mismatch')
    expect(checks[0].evidence).toContain('血缘系统')
  })
  test('does not flag entry promise alignment when the opening shows the promised hook', () => {
    const checks = scanEntryPromiseAlignmentRisks(
      {
        title: '血缘系统：我有三位隐藏妈妈',
        synopsis: '主角开局被裁员后觉醒血缘系统，第一次检测就发现三位妈妈身份反常。',
        reference_config: {
          writing_bible: {
            commercial_positioning: {
              selling_points: ['血缘系统检测', '三位妈妈身份反转'],
            },
          },
        },
      },
      {
        chapter_target: {
          chapter_no: 1,
          title: '第一次检测',
        },
      },
      [
        '第1章 第一次检测',
        '',
        '李岚把裁员信塞进口袋，眼前忽然弹出血缘系统的蓝色面板。',
        '',
        '第一次检测结果跳出来：三位妈妈的身份栏全部亮成红色。',
      ].join('\n'),
    )

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic entry promise alignment into opening self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEntryPromiseChecks = scanEntryPromiseAlignmentRisks(project, contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicEntryPromiseChecks')
  })
  test('detects openings that do not surface the planned core conflict early', () => {
    const checks = scanOpeningConflictAlignmentRisks({
      chapter_target: {
        chapter_no: 12,
        conflict: '执事设局阻拦主角参加试炼',
      },
    }, [
      '第12章 试炼资格',
      '',
      '晨光落在演武场边，石阶被雨水洗得发亮。',
      '李玄把书册收进袖中，沿着长廊往前走。',
      '远处钟声响了三下，弟子们陆续聚到看台下。',
      '他想起昨夜没有睡好，只能先整理呼吸。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_core_conflict_missing')
    expect(checks[0].label).toBe('开篇核心冲突扫描')
    expect(checks[0].evidence).toContain('执事设局阻拦主角参加试炼')
    expect(checks[0].fix).toContain('前 300 字')
    expect(checks[0].fix).toContain('本章核心矛盾')
  })
  test('reads camelCase preDraftBrief core conflict for opening alignment scan', () => {
    const checks = scanOpeningConflictAlignmentRisks({
      preDraftBrief: {
        coreConflict: '执事设局阻拦主角参加试炼',
      },
    }, [
      '第12章 试炼资格',
      '',
      '晨光落在演武场边，石阶被雨水洗得发亮。',
      '李玄把书册收进袖中，沿着长廊往前走。',
      '远处钟声响了三下，弟子们陆续聚到看台下。',
      '他想起昨夜没有睡好，只能先整理呼吸。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_core_conflict_missing')
    expect(checks[0].evidence).toContain('执事设局阻拦主角参加试炼')
  })
  test('reads runtime camelCase chapterTarget core conflict for opening alignment scan', () => {
    const checks = scanOpeningConflictAlignmentRisks({
      chapterTarget: {
        chapterNo: 12,
        coreConflict: '执事设局阻拦主角参加试炼',
      },
    }, [
      '第12章 试炼资格',
      '',
      '晨光落在演武场边，石阶被雨水洗得发亮。',
      '李玄把书册收进袖中，沿着长廊往前走。',
      '远处钟声响了三下，弟子们陆续聚到看台下。',
      '他想起昨夜没有睡好，只能先整理呼吸。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_core_conflict_missing')
    expect(checks[0].evidence).toContain('执事设局阻拦主角参加试炼')
  })
  test('does not flag opening conflict alignment when the planned obstacle appears early', () => {
    const checks = scanOpeningConflictAlignmentRisks({
      chapter_target: {
        chapter_no: 12,
        conflict: '执事设局阻拦主角参加试炼',
      },
    }, [
      '第12章 试炼资格',
      '',
      '执事在演武场门口拦住李玄，把试炼名册当众合上。',
      '“你的资格作废。”',
      '李玄抬头，看见名册边角压着昨夜那枚残阵印。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic opening conflict alignment into opening self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicOpeningConflictChecks = scanOpeningConflictAlignmentRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicOpeningConflictChecks')
  })
  test('detects summary-style endings that do not leave a page-turn hook', () => {
    const checks = scanEndingHookRisks([
      '李辰关上门，教室终于安静下来。',
      '经历了这一切，他明白自己必须更加努力。',
      '新的生活才刚刚开始。',
    ].join('\n'))

    expect(checks.some(item => item.key === 'ending_summary_without_hook')).toBe(true)
    expect(checks.some(item => item.key === 'ending_hook_missing')).toBe(true)
    expect(checks[0].fix).toContain('最后100字')
  })
  test('wires deterministic ending hook risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEndingHookChecks = scanEndingHookRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicEndingHookChecks')
  })
  test('detects important clues that suddenly appear at the ending without warmup', () => {
    const checks = scanSuddenEndingClueRisks([
      '第8章 审判庭',
      '',
      '李玄把执事逼退半步，审判庭终于安静下来。',
      '',
      '众人开始整理散落的卷宗，林青禾低声问他下一步怎么办。',
      '',
      '他正要离开，桌下突然掉出第二本账册，夹页里还露出禁地钥匙。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('sudden_ending_clue_without_warmup')
    expect(checks[0].label).toBe('章尾线索预热扫描')
    expect(checks[0].evidence).toContain('突然掉出第二本账册')
    expect(checks[0].fix).toContain('预热')
    expect(checks[0].fix).toContain('章尾')
  })
  test('does not flag ending clues that were warmed up earlier in the chapter', () => {
    const checks = scanSuddenEndingClueRisks([
      '第8章 审判庭',
      '',
      '审判开始前，李玄注意到桌下抽屉合不严，旧账册缺页卡在缝里。',
      '',
      '林青禾拖住证人时，他用指腹摸到夹层里有一枚钥匙齿痕。',
      '',
      '他正要离开，桌下突然掉出第二本账册，夹页里还露出禁地钥匙。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic sudden ending clue risks into chapter hook checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSuddenEndingClueChecks = scanSuddenEndingClueRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicSuddenEndingClueChecks')
  })
  test('detects missing ending contract state or next chapter pull when only a question is visible', () => {
    const contextPackage = {
      chapter_target: {
        chapter_blueprint: {
          ending_contract: {
            final_state: '江辰公开旧账后被逐出内门候选名单。',
            unresolved_question: '第二本账册是谁藏进禁库的。',
            next_chapter_pull: '江辰必须在子时前潜入禁库查第二本账册。',
          },
        },
      },
    }

    const checks = scanEndingContractExecutionRisks(contextPackage, [
      '第12章 旧账',
      '',
      '江辰盯着账册缺页，终于问出口：“第二本账册是谁藏进禁库的？”',
    ].join('\n'))

    expect(checks.some(item => item.key === 'ending_contract_missing_final_state_and_next_chapter_pull')).toBe(true)
    expect(checks[0].fix).toContain('收束状态')
    expect(checks[0].fix).toContain('下一章推动力')
  })
  test('reads direct camelCase ending contract from preDraftBrief during deterministic review', () => {
    const contextPackage = {
      preDraftBrief: {
        endingContract: {
          finalState: '江辰公开旧账后被逐出内门候选名单。',
          unresolvedQuestion: '第二本账册是谁藏进禁库的。',
          nextChapterPull: '江辰必须在子时前潜入禁库查第二本账册。',
        },
      },
    }

    const checks = scanEndingContractExecutionRisks(contextPackage, [
      '第12章 旧账',
      '',
      '江辰盯着账册缺页，终于问出口：“第二本账册是谁藏进禁库的？”',
    ].join('\n'))

    expect(checks.some(item => item.key === 'ending_contract_missing_final_state_and_next_chapter_pull')).toBe(true)
    expect(checks[0].fix).toContain('收束状态')
    expect(checks[0].fix).toContain('下一章推动力')
  })
  test('reads runtime camelCase chapterTarget endingContract during deterministic review', () => {
    const contextPackage = {
      chapterTarget: {
        chapterNo: 12,
        title: '旧账',
        endingContract: {
          finalState: '江辰公开旧账后被逐出内门候选名单。',
          unresolvedQuestion: '第二本账册是谁藏进禁库的。',
          nextChapterPull: '江辰必须在子时前潜入禁库查第二本账册。',
        },
      },
    }

    const checks = scanEndingContractExecutionRisks(contextPackage, [
      '第12章 旧账',
      '',
      '江辰盯着账册缺页，终于问出口：“第二本账册是谁藏进禁库的？”',
    ].join('\n'))

    expect(checks.some(item => item.key === 'ending_contract_missing_final_state_and_next_chapter_pull')).toBe(true)
    expect(checks[0].fix).toContain('收束状态')
    expect(checks[0].fix).toContain('下一章推动力')
  })
  test('does not flag ending contract when state question and next pull are visible in the tail', () => {
    const contextPackage = {
      chapter_target: {
        chapter_blueprint: {
          ending_contract: {
            final_state: '江辰公开旧账后被逐出内门候选名单。',
            unresolved_question: '第二本账册是谁藏进禁库的。',
            next_chapter_pull: '江辰必须在子时前潜入禁库查第二本账册。',
          },
        },
      },
    }

    const checks = scanEndingContractExecutionRisks(contextPackage, [
      '江辰公开旧账，执事当场把他的内门候选玉牌摘下。',
      '他被逐出内门候选名单，只剩账册缺页贴在掌心。',
      '“第二本账册是谁藏进禁库的？”',
      '子时前，他必须潜入禁库查清第二本账册，否则旧账会被彻底封死。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
  test('wires deterministic ending contract risks into chapter hook checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEndingContractChecks = scanEndingContractExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicEndingContractChecks')
  })
  test('detects opening hooks that are neither paid off nor carried forward at the ending', () => {
    const checks = scanOpeningHookEchoRisks([
      '第10章 公审台',
      '',
      '证据刚摆上桌就被执事当众撕毁，碎纸落在李辰脚边。',
      '',
      '台下的人跟着起哄，催他立刻认罪。',
      '',
      '李辰穿过侧门，按照旧流程完成了内门报名。',
      '',
      '夜色落下来，他终于可以回去休息。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_hook_not_echoed')
    expect(checks[0].label).toBe('开篇钩子回收扫描')
    expect(checks[0].evidence).toContain('证据')
    expect(checks[0].fix).toContain('回收')
  })
})

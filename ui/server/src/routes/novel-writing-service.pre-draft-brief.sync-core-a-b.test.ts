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

describe('chapter pre-draft brief sync-core a b', () => {
  test('asks prose revision to preserve core direction and only repair evidenced findings', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const monofileSource = ['paragraph-prose-context.ts','paragraph-prose-context-prepare.ts','paragraph-prose-context-sections.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const prosePromptSource = [readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-shared.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-prep.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-hooks.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-craft.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing/prose-generation-prompt-sections-governance.ts'), 'utf8')].join('\n')
    const prosePromptBlock = prosePromptSource.slice(
      prosePromptSource.indexOf('export function buildCoreContractRadarPromptSection'),
    )
    const prosePromptCallBlock = monofileSource.slice(
      monofileSource.indexOf('...buildLongformCompassPromptSection(longformCompass)'),
      monofileSource.indexOf("nextBatchBrief ? '【本批连载任务书】'"),
    )
    const reviewPromptBlock = source.slice(
      source.indexOf('const buildProseReviewPrompt ='),
      source.indexOf('const buildProseRevisionPrompt ='),
    )
    const revisionPromptBlock = source.slice(
      source.indexOf('const buildProseRevisionPrompt ='),
      source.indexOf('const shouldReviseProse ='),
    )

    expect(prosePromptCallBlock).toContain('buildCoreContractRadarPromptSection(coreContractRadar)')
    expect(prosePromptBlock).toContain('主题统一')
    expect(prosePromptBlock).toContain('全书核心情绪')
    expect(prosePromptBlock).toContain('小情绪服从大情绪')
    expect(prosePromptBlock).toContain('卖点四步法')
    expect(prosePromptBlock).toContain('发现比告知爽十倍')
    expect(prosePromptBlock).toContain('重复策略')
    expect(prosePromptBlock).toContain('节奏自检')
    expect(prosePromptBlock).toContain('金手指结构')
    expect(prosePromptBlock).toContain('开篇压力')
    expect(reviewPromptBlock).toContain('主题统一')
    expect(reviewPromptBlock).toContain('随机翻开一章')
    expect(reviewPromptBlock).toContain('core_contract_radar')
    expect(reviewPromptBlock).toContain('卖点四步法')
    expect(reviewPromptBlock).toContain('同一卖点至少延展')
    expect(reviewPromptBlock).toContain('连续 2 章没有目标推进')
    expect(reviewPromptBlock).toContain('金手指可替换故事流程')
    expect(reviewPromptBlock).toContain('300-500字内交代处境、危险来源和破局希望')
    expect(revisionPromptBlock).toContain('修订守恒')
    expect(revisionPromptBlock).toContain('不得新增支线')
    expect(revisionPromptBlock).toContain('不改长期方向')
    expect(revisionPromptBlock).toContain('只修自检证据')
    expect(revisionPromptBlock).toContain('core_contract_radar')
    expect(revisionPromptBlock).toContain('chapter_core_drift')
    expect(revisionPromptBlock).toContain('主题统一')
    expect(revisionPromptBlock).toContain('全书核心情绪')
    expect(revisionPromptBlock).toContain('卖点四步法')
    expect(revisionPromptBlock).toContain('重复策略')
    expect(revisionPromptBlock).toContain('节奏自检')
    expect(revisionPromptBlock).toContain('金手指结构')
  })

  test('asks prose self review and revision to enforce ten-chapter core selling point drift checks', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewPromptBlock = source.slice(
      source.indexOf('const buildProseReviewPrompt ='),
      source.indexOf('const buildProseRevisionPrompt ='),
    )
    const revisionPromptBlock = source.slice(
      source.indexOf('const buildProseRevisionPrompt ='),
      source.indexOf('function latestProseReviewPayload'),
    )

    expect(reviewPromptBlock).toContain('periodic_drift_check')
    expect(reviewPromptBlock).toContain('当初吸引读者的卖点还在吗')
    expect(reviewPromptBlock).toContain('十章卖点复核')
    expect(revisionPromptBlock).toContain('ten_chapter_selling_point')
    expect(revisionPromptBlock).toContain('核心卖点被稀释或替换')
  })

  test('detects benchmark recall techniques that are mentioned but not executed in prose', () => {
    const contextPackage = {
      chapter_target: {
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          style_profile_summary: '短句推进审讯压力，对白留半拍。',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出', '旁观者差异化反应'],
        },
      },
    }
    const checks = scanBenchmarkRecallExecutionRisks(contextPackage, [
      '李玄拿出旧印章，直接证明执事换证。',
      '所有旁观弟子都震惊了。',
      '执事很生气，事情进入下一阶段。',
    ].join('\n'))

    expect(checks.length).toBeGreaterThan(0)
    expect(checks[0].key).toContain('benchmark_recall_')
    expect(checks[0].label).toBe('文风召回执行扫描')
    expect(checks.map((item: any) => item.evidence).join('｜')).toContain('匹配章技法')
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('matched_chapter_techniques')
  })

  test('does not flag benchmark recall when rhythm and matched techniques are visible', () => {
    const contextPackage = {
      chapter_target: {
        benchmark_recall_brief: {
          selected_emotion_module: 'M03 信息差反杀',
          rhythm_reference: '先压三轮质问，再用证据爆发，爆发后短冷却接章尾钩子',
          style_profile_summary: '短句推进审讯压力，对白留半拍。',
          matched_chapter_techniques: ['三轮压问', '证据晚半拍亮出', '旁观者差异化反应'],
        },
      },
    }
    const checks = scanBenchmarkRecallExecutionRisks(contextPackage, [
      '执事第一轮压问旧账册从哪里来，李玄没有急着答。',
      '第二轮，他逼林青禾改口；第三轮，他把旁观弟子也压进证词里。',
      '李玄等他话音落尽，才晚半拍亮出旧印章。证据爆发的瞬间，执事脸色第一次失控。',
      '旁观弟子分成三拨：有人怀疑，有人倒戈，有人沉默退后。',
      '短暂冷却后，旧印章背面露出第二个证人的名字，章尾钩子压住没有解释。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic benchmark recall risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse'),
    )

    expect(reviewBlock).toContain('const deterministicBenchmarkRecallChecks = scanBenchmarkRecallExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicBenchmarkRecallChecks')
  })

  test('adds an oh-story information flow contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      chapter_target: {
        chapter_no: 13,
        title: '伪证裂口',
        summary: '主角先识破伪证，再用旧印章反推出幕后换账本的人。',
        conflict: '对手试图用反派背景解释拖住审判节奏。',
        ending_hook: '旧印章背面刻着第二个证人的名字。',
        scene_cards: [
          {
            scene_no: 1,
            title: '识破伪证',
            purpose: '让主角发现账本墨迹时间不对。',
            required_information: ['账本是新墨伪造', '执事昨夜接触过账本'],
            information_gap: '谁在昨夜换走真账本。',
            reader_payoff: '主角识破骗局。',
            ending_hook_seed: '伪证背面有旧印章。',
          },
          {
            scene_no: 2,
            title: '旧印章反推',
            purpose: '用旧印章把伪证线推进到幕后证人。',
            required_information: ['旧印章属于三年前的证人', '证人还活着'],
            information_gap: '证人为什么躲在审判庭附近。',
            reader_payoff: '旧印章回应上一场悬念。',
            reversal: '旧印章不是物证，而是求救信号。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '反证长篇' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '反证长篇' },
      confirmedContext,
      null,
      { chapter_no: 13, title: '伪证裂口' },
    )

    expect(brief.information_flow_contract.version).toBe('oh_story_information_flow_v1')
    expect(brief.information_flow_contract.information_units.join('｜')).toContain('主角识破骗局')
    expect(brief.information_flow_contract.information_units.join('｜')).toContain('旧印章回应上一场悬念')
    expect(brief.information_flow_contract.progression_chain.join('｜')).toContain('识破伪证')
    expect(brief.information_flow_contract.progression_chain.join('｜')).toContain('旧印章反推')
    expect(brief.information_flow_contract.transition_rules.join('｜')).toContain('前一个场景留下悬念')
    expect(brief.information_flow_contract.transition_compression_rules.join('｜')).toContain('过渡不是填充')
    expect(brief.information_flow_contract.transition_compression_rules.join('｜')).toContain('没有信息量就删掉')
    expect(brief.information_flow_contract.next_objective_rules.join('｜')).toContain('每次实力、身份、资源或阶段性目标提升后')
    expect(brief.information_flow_contract.water_risk_guards.join('｜')).toContain('反派背景')
    expect(confirmedContext.chapter_target.information_flow_contract.quality_checks.join('｜')).toContain('信息团')
    expect(prompt).toContain('【信息团与场景衔接合同】')
    expect(prompt).toContain('执行 chapter_target.information_flow_contract')
    expect(prompt).toContain('每个信息团必须能一句话概括')
    expect(prompt).toContain('过渡压缩')
    expect(prompt).toContain('过渡不是填充')
    expect(prompt).toContain('提升后下一目标')
    expect(prompt).toContain('每次实力、身份、资源或阶段性目标提升后')
    expect(prompt).toContain('information_flow_checks')
    expect(prompt.indexOf('【信息团与场景衔接合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit information flow contract from scene cards', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 13,
        title: '伪证裂口',
        summary: '主角先识破伪证，再用旧印章反推出幕后换账本的人。',
        conflict: '对手试图用反派背景解释拖住审判节奏。',
        information_flow_contract: {
          version: 'oh_story_information_flow_v1',
          source: 'manual_incomplete',
          quality_checks: ['必须确认每个场景都有信息团。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '识破伪证',
            purpose: '让主角发现账本墨迹时间不对。',
            required_information: ['账本是新墨伪造', '执事昨夜接触过账本'],
            information_gap: '谁在昨夜换走真账本。',
            reader_payoff: '主角识破骗局。',
            ending_hook_seed: '伪证背面有旧印章。',
          },
          {
            scene_no: 2,
            title: '旧印章反推',
            purpose: '用旧印章把伪证线推进到幕后证人。',
            required_information: ['旧印章属于三年前的证人', '证人还活着'],
            information_gap: '证人为什么躲在审判庭附近。',
            reader_payoff: '旧印章回应上一场悬念。',
            reversal: '旧印章不是物证，而是求救信号。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '反证长篇' }, contextPackage)

    expect(brief.information_flow_contract.source).toBe('manual_incomplete')
    expect(brief.information_flow_contract.quality_checks).toEqual(['必须确认每个场景都有信息团。'])
    expect(brief.information_flow_contract.information_units.join('｜')).toContain('主角识破骗局')
    expect(brief.information_flow_contract.information_units.join('｜')).toContain('旧印章回应上一场悬念')
    expect(brief.information_flow_contract.progression_chain.join('｜')).toContain('识破伪证')
    expect(brief.information_flow_contract.progression_chain.join('｜')).toContain('旧印章反推')
    expect(brief.information_flow_contract.transition_compression_rules.join('｜')).toContain('过渡不是填充')
    expect(brief.information_flow_contract.water_risk_guards.join('｜')).toContain('反派背景')
  })

  test('adds an oh-story expectation threshold contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const contextPackage = {
      reader_expectation_debt_context: {
        must_carry: [
          { text: '旧印章背后的证人必须露出行动痕迹', source_chapter_no: 13 },
        ],
        keep_alive: [
          { text: '幕后长老是谁仍然不能揭开' },
        ],
      },
      storyline_context: {
        required: ['主角必须先拿到证人保护资格'],
        chapter_usage: [
          { type: 'advance', name: '证人保护资格', summary: '进入审判庭内层前必须获得临时资格' },
        ],
      },
      chapter_target: {
        chapter_no: 14,
        title: '资格门槛',
        summary: '主角想见到真正证人，但必须先拿到三项资格条件。',
        conflict: '执事提出气血达标、独自取回阵牌、公开验明旧印三项条件。',
        ending_hook: '第三项条件刚通过，证人保护室里传出主角父亲的声音。',
        scene_cards: [
          {
            scene_no: 1,
            title: '资格公布',
            purpose: '把见证人的大目标拆成三项门槛。',
            conflict: '执事要求气血达标、取回阵牌、验明旧印。',
            required_thresholds: ['气血达标', '独自取回阵牌', '公开验明旧印'],
            reader_payoff: '读者明确短期目标：先过资格门槛。',
          },
          {
            scene_no: 2,
            title: '动态加码',
            purpose: '主角通过前两项后，执事临时提高第三项难度。',
            conflict: '旧印必须在众目睽睽下验明。',
            dynamic_threshold: '资源超标时提高门槛：公开验印会暴露父亲线索。',
            reader_payoff: '通过门槛但付出暴露线索的代价。',
            ending_hook_seed: '证人保护室里传出父亲声音。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '反证长篇' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      { title: '反证长篇' },
      confirmedContext,
      null,
      { chapter_no: 14, title: '资格门槛' },
    )

    expect(brief.expectation_threshold_contract.version).toBe('oh_story_expectation_threshold_v1')
    expect(brief.expectation_threshold_contract.short_expectation).toContain('先过资格门槛')
    expect(brief.expectation_threshold_contract.long_expectations.join('｜')).toContain('幕后长老是谁')
    expect(brief.expectation_threshold_contract.thresholds.join('｜')).toContain('气血达标')
    expect(brief.expectation_threshold_contract.thresholds.join('｜')).toContain('公开验明旧印')
    expect(brief.expectation_threshold_contract.dynamic_thresholds.join('｜')).toContain('公开验印会暴露父亲线索')
    expect(brief.expectation_threshold_contract.expectation_before_payoff_rules.join('｜')).toContain('期待感 > 爽点')
    expect(brief.expectation_threshold_contract.expectation_before_payoff_rules.join('｜')).toContain('铺垫的篇幅')
    expect(brief.expectation_threshold_contract.expectation_relay_rules.join('｜')).toContain('期待接力法')
    expect(brief.expectation_threshold_contract.expectation_relay_rules.join('｜')).toContain('当一层即将满足时，先铺好下一层的期待')
    expect(brief.expectation_threshold_contract.expectation_relay_rules.join('｜')).toContain('至少两条期待线并行运行')
    expect(brief.expectation_threshold_contract.three_expectation_lines.plot_expectation).toContain('幕后长老是谁')
    expect(brief.expectation_threshold_contract.three_expectation_lines.theme_payoff).toContain('先过资格门槛')
    expect(brief.expectation_threshold_contract.three_expectation_lines.freshness_hook).toContain('公开验印会暴露父亲线索')
    expect(brief.expectation_threshold_contract.quality_checks.join('｜')).toContain('两长一短')
    expect(confirmedContext.chapter_target.expectation_threshold_contract.thresholds.join('｜')).toContain('独自取回阵牌')
    expect(confirmedContext.chapter_target.expectation_threshold_contract.three_expectation_lines.freshness_hook).toContain('公开验印会暴露父亲线索')
    expect(prompt).toContain('【期待门槛合同】')
    expect(prompt).toContain('执行 chapter_target.expectation_threshold_contract')
    expect(prompt).toContain('两长一短')
    expect(prompt).toContain('剧情期待 + 主题甜头 + 新鲜感')
    expect(prompt).toContain('期待感 > 爽点')
    expect(prompt).toContain('期待接力法')
    expect(prompt).toContain('当一层即将满足时，先铺好下一层的期待')
    expect(prompt).toContain('每跨越一个门槛就立刻设立下一个')
    expect(prompt).toContain('expectation_threshold_checks')
    expect(prompt.indexOf('【期待门槛合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit expectation threshold contract from reader expectation context', () => {
    const contextPackage = {
      expectation_threshold_contract: {
        source: 'manual_incomplete',
        short_expectation: '手填短期待：先拿到入场资格。',
        quality_checks: ['必须确认两长一短没有断线。'],
      },
      reader_expectation_debt_context: {
        must_carry: [
          { text: '父亲旧案的真相必须继续保温', source_chapter_no: 8 },
        ],
        keep_alive: [
          { text: '幕后长老为什么放任主角进入内层仍然不能揭开' },
        ],
      },
      storyline_context: {
        required: ['主角必须先证明自己有审判庭行动资格'],
        chapter_usage: [
          { type: 'advance', name: '审判庭资格', summary: '进入内层前必须获得临时行动资格' },
        ],
      },
      chapter_target: {
        chapter_no: 15,
        title: '入场门槛',
        summary: '主角要进入审判庭内层，但必须分三步证明自己。',
        conflict: '执事提出气血达标、找回阵牌、公开验明旧印三项条件。',
        ending_hook: '第三项通过后，内层传出父亲的声音。',
        scene_cards: [
          {
            scene_no: 1,
            title: '三项门槛',
            purpose: '把进入内层的目标拆成三项条件。',
            required_thresholds: ['气血达标', '找回阵牌', '公开验明旧印'],
            reader_payoff: '读者明确当前章先解决入场资格。',
          },
          {
            scene_no: 2,
            title: '临时加码',
            purpose: '主角通过前两项后被迫公开旧印。',
            dynamic_threshold: '公开验印会暴露父亲线索。',
            reader_payoff: '通过门槛但付出线索暴露代价。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '反证长篇' }, contextPackage)

    expect(brief.expectation_threshold_contract.source).toBe('manual_incomplete')
    expect(brief.expectation_threshold_contract.short_expectation).toBe('手填短期待：先拿到入场资格。')
    expect(brief.expectation_threshold_contract.quality_checks).toEqual(['必须确认两长一短没有断线。'])
    expect(brief.expectation_threshold_contract.medium_expectations.join('｜')).toContain('审判庭行动资格')
    expect(brief.expectation_threshold_contract.long_expectations.join('｜')).toContain('幕后长老为什么放任主角进入内层')
    expect(brief.expectation_threshold_contract.thresholds.join('｜')).toContain('气血达标')
    expect(brief.expectation_threshold_contract.thresholds.join('｜')).toContain('公开验明旧印')
    expect(brief.expectation_threshold_contract.dynamic_thresholds.join('｜')).toContain('公开验印会暴露父亲线索')
    expect(brief.expectation_threshold_contract.nested_units.join('｜')).toContain('主角要进入审判庭内层')
    expect(brief.expectation_threshold_contract.expectation_relay_rules.join('｜')).toContain('期待接力法')
  })

  test('hydrates explicit expectation relay rules from camel case input', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '反证长篇' },
      {
        chapter_target: {
          chapter_no: 16,
          title: '接力钩子',
          summary: '主角即将完成当前门槛，但必须先埋下一层期待。',
          expectation_threshold_contract: {
            source: 'manual_expectation',
            expectationRelayRules: ['自定义：旧期待闭环前，新开环必须已经进入场景行动。'],
          },
        },
      },
    )

    expect(brief.expectation_threshold_contract.source).toBe('manual_expectation')
    expect(brief.expectation_threshold_contract.expectation_relay_rules).toEqual(['自定义：旧期待闭环前，新开环必须已经进入场景行动。'])
    expect(brief.expectation_threshold_contract.expectation_before_payoff_rules.join('｜')).toContain('期待感 > 爽点')
  })

  test('adds an oh-story target reader contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      target_platform: 'fanqie',
      target_audience: '18-30岁喜欢强钩子、规则反制和双主角互补的番茄男频读者',
      synopsis: '超人蛮力被规则限制，必须和理性搭档一起破局。',
      reference_config: {
        writing_bible: {
          target_reader: {
            age_range: '18-30',
            occupation: '学生和通勤上班族',
            gender: '男频为主',
            platform: '番茄',
            life_situation: '碎片时间追更，需要低门槛强反馈',
            desires: ['规则反制爽点', '双主角互补', '章末强钩子'],
            emotional_gap: '现实里被规则和流程压着走，缺少掌控感。',
            hidden_complexes: ['不甘被安排', '渴望亲手反制不公平'],
            comment_emotion_keywords: ['不甘', '掌控', '解气'],
            unmet_needs: ['快速反馈', '尊严补偿'],
          },
          commercial_positioning: {
            selling_points: ['超人蛮力被规则克制', '智斗规则边界'],
            retention_strategy: '前三章快速展示规则反制和双主角互补。',
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 15,
        title: '门外判定',
        summary: '主角用超人力量试探门槛，却被规则反制。',
        conflict: '救门外学生会违规，不救又会错过证人线索。',
        ending_hook: '门外学生报出主角只有搭档才知道的暗号。',
        scene_cards: [
          {
            scene_no: 1,
            title: '门槛试探',
            purpose: '用低门槛危机展示规则反制。',
            conflict: '超人力量不能越过宿舍白线。',
            reader_payoff: '超人蛮力被规则反制，理性搭档找到判定边界。',
            opening_hook: '十点整，门外学生把脸贴在玻璃上。',
            ending_hook_seed: '学生说出搭档暗号。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 15, title: '门外判定' },
    )

    expect(brief.target_reader_contract.version).toBe('oh_story_target_reader_v1')
    expect(brief.target_reader_contract.reader_profile).toContain('18-30')
    expect(brief.target_reader_contract.reader_profile).toContain('番茄')
    expect(brief.target_reader_contract.reader_desires.join('｜')).toContain('规则反制爽点')
    expect(brief.target_reader_contract.emotional_gap_analysis.join('｜')).toContain('核心痛苦')
    expect(brief.target_reader_contract.emotional_gap_analysis.join('｜')).toContain('深层情结')
    expect(brief.target_reader_contract.emotional_gap_analysis.join('｜')).toContain('高频情绪关键词')
    expect(brief.target_reader_contract.emotional_gap_analysis.join('｜')).toContain('未满足需求')
    expect(brief.target_reader_contract.emotional_gap_analysis.join('｜')).toContain('掌控感')
    expect(brief.target_reader_contract.chapter_attractions.join('｜')).toContain('超人蛮力被规则反制')
    expect(brief.target_reader_contract.genre_vitality_rules.join('｜')).toContain('样本验证')
    expect(brief.target_reader_contract.genre_vitality_rules.join('｜')).toContain('新鲜期')
    expect(brief.target_reader_contract.genre_vitality_rules.join('｜')).toContain('成熟期')
    expect(brief.target_reader_contract.genre_vitality_rules.join('｜')).toContain('审美疲劳期')
    expect(brief.target_reader_contract.platform_fit_rules.join('｜')).toContain('不能用A网站的样本直接套到B网站')
    expect(brief.target_reader_contract.platform_fit_rules.join('｜')).toContain('番茄')
    expect(brief.target_reader_contract.platform_fit_rules.join('｜')).toContain('强情绪')
    expect(brief.target_reader_contract.platform_fit_rules.join('｜')).toContain('起点')
    expect(brief.target_reader_contract.platform_fit_rules.join('｜')).toContain('慢节奏')
    expect(brief.target_reader_contract.boundary_fit_rules.join('｜')).toContain('边界感')
    expect(brief.target_reader_contract.boundary_fit_rules.join('｜')).toContain('素材、知识储备和篇幅')
    expect(brief.target_reader_contract.title_blurb_alignment_rules.join('｜')).toContain('书名3秒抓人')
    expect(brief.target_reader_contract.title_blurb_alignment_rules.join('｜')).toContain('简介有安全感+钩子')
    expect(brief.target_reader_contract.title_blurb_alignment_rules.join('｜')).toContain('书名简介内容三位一体')
    expect(brief.target_reader_contract.immersion_plasticity_rules.join('｜')).toContain('代入感')
    expect(brief.target_reader_contract.immersion_plasticity_rules.join('｜')).toContain('塑料感')
    expect(brief.target_reader_contract.immersion_plasticity_rules.join('｜')).toContain('世界观自洽')
    expect(brief.target_reader_contract.goldfinger_life_fit_rules.join('｜')).toContain('金手指必须与主角生活/职业息息相关')
    expect(brief.target_reader_contract.commercial_expression_rules.join('｜')).toContain('私人表达')
    expect(brief.target_reader_contract.commercial_expression_rules.join('｜')).toContain('5%')
    expect(brief.target_reader_contract.validation_questions.join('｜')).toContain('我这书写给谁看')
    expect(confirmedContext.chapter_target.target_reader_contract.quality_checks.join('｜')).toContain('三问')
    expect(prompt).toContain('【目标读者合同】')
    expect(prompt).toContain('执行 chapter_target.target_reader_contract')
    expect(prompt).toContain('自嗨判定法')
    expect(prompt).toContain('情绪缺口')
    expect(prompt).toContain('核心痛苦')
    expect(prompt).toContain('高频情绪关键词')
    expect(prompt).toContain('题材生命力')
    expect(prompt).toContain('目标平台样本')
    expect(prompt).toContain('书名简介内容三位一体')
    expect(prompt).toContain('代入感/塑料感')
    expect(prompt).toContain('金手指生活关联')
    expect(prompt).toContain('target_reader_checks')
    expect(prompt.indexOf('【目标读者合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit target reader contract from project and chapter context', () => {
    const project = {
      title: '超人的规则怪谈世界',
      genre: '规则怪谈',
      target_platform: 'fanqie',
      synopsis: '超人蛮力被规则限制，必须和理性搭档一起破局。',
      reference_config: {
        writing_bible: {
          target_reader: {
            desires: ['规则反制爽点', '双主角互补', '章末强钩子'],
            emotional_gap: '现实里被规则和流程压着走，缺少掌控感。',
            hidden_complexes: ['不甘被安排'],
            unmet_needs: ['快速反馈'],
          },
          commercial_positioning: {
            selling_points: ['超人蛮力被规则克制', '智斗规则边界'],
            retention_strategy: '前三章快速展示规则反制和双主角互补。',
          },
        },
      },
    }
    const contextPackage = {
      target_reader_contract: {
        source: 'manual_incomplete',
        reader_profile: '手填读者画像：碎片时间追更的番茄男频读者。',
        quality_checks: ['必须确认本章给了目标读者可感知回报。'],
      },
      chapter_target: {
        chapter_no: 16,
        title: '门外判定',
        summary: '主角用超人力量试探门槛，却被规则反制。',
        conflict: '救门外学生会违规，不救又会错过证人线索。',
        ending_hook: '门外学生报出主角只有搭档才知道的暗号。',
        scene_cards: [
          {
            scene_no: 1,
            title: '门槛试探',
            purpose: '用低门槛危机展示规则反制。',
            conflict: '超人力量不能越过宿舍白线。',
            reader_payoff: '超人蛮力被规则反制，理性搭档找到判定边界。',
            opening_hook: '十点整，门外学生把脸贴在玻璃上。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.target_reader_contract.source).toBe('manual_incomplete')
    expect(brief.target_reader_contract.reader_profile).toBe('手填读者画像：碎片时间追更的番茄男频读者。')
    expect(brief.target_reader_contract.quality_checks).toEqual(['必须确认本章给了目标读者可感知回报。'])
    expect(brief.target_reader_contract.reader_desires.join('｜')).toContain('规则反制爽点')
    expect(brief.target_reader_contract.reader_desires.join('｜')).toContain('智斗规则边界')
    expect(brief.target_reader_contract.emotional_gap_analysis.join('｜')).toContain('核心痛苦')
    expect(brief.target_reader_contract.emotional_gap_analysis.join('｜')).toContain('深层情结')
    expect(brief.target_reader_contract.chapter_attractions.join('｜')).toContain('超人蛮力被规则反制')
    expect(brief.target_reader_contract.genre_vitality_rules.join('｜')).toContain('样本验证')
    expect(brief.target_reader_contract.platform_fit_rules.join('｜')).toContain('不能用A网站的样本直接套到B网站')
    expect(brief.target_reader_contract.boundary_fit_rules.join('｜')).toContain('素材、知识储备和篇幅')
    expect(brief.target_reader_contract.title_blurb_alignment_rules.join('｜')).toContain('书名简介内容三位一体')
    expect(brief.target_reader_contract.immersion_plasticity_rules.join('｜')).toContain('世界观自洽')
    expect(brief.target_reader_contract.goldfinger_life_fit_rules.join('｜')).toContain('生活/职业')
    expect(brief.target_reader_contract.commercial_expression_rules.join('｜')).toContain('私人表达')
    expect(brief.target_reader_contract.validation_questions.join('｜')).toContain('我这书写给谁看')
    expect(brief.target_reader_contract.correction_methods.join('｜')).toContain('目标读者画像')
  })

})

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

describe('prose word target regression b', () => {
  test('wires deterministic target reader hard risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicTargetReaderChecks = [buildTargetReaderDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicTargetReaderChecks')
  })

  test('story state sync persists a target_reader_sync review', () => {
    const source = ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: targetReaderSync, reviewType: 'target_reader_sync'")
    expect(source).toContain('buildTargetReaderSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.target_reader_sync = targetReaderSync')
  })

  test('checks genre positioning contract delivery after chapter text is written', () => {
    const project = { title: '旧城设备师', genre: '都市系统逆袭' }
    const chapter = { id: 32, chapter_no: 32, title: '报废设备订单' }
    const contextPackage = {
      chapter_target: {
        genre_positioning_contract: {
          version: 'oh_story_genre_positioning_v1',
          source: 'manual',
          genre_label: '都市系统/逆袭长篇',
          reader_psychology: ['中年危机、经济压力和被轻视后的翻盘补偿。', '掌控感：把混乱生活量化成可升级、可验证、可反击的目标。'],
          genre_formula: ['低谷压迫 -> 系统面板 -> 小胜兑现 -> 新门槛出现。'],
          core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
          goldfinger_fit_rules: ['金手指必须贴合主角维修职业、设备订单和现实生活困境。'],
          must_have_scenes: ['系统面板首次给出刺眼评价或任务。', '质疑者/压力源在场，主角用结果反证。'],
          platform_fit_rules: ['番茄偏快节奏、强回报、清晰冲突和短周期爽点。'],
          micro_innovation_rules: ['微创新最多3个，必须服务都市系统逆袭模板。'],
          longboard_focus_rules: [
            '拉长板而非补短板：优先强化题材长板、核心卖点、目标情绪和最高频爽点。',
            '不得为补短板引入稀释核心卖点的支线。',
            '开书前检查：核心卖点背后的情绪清晰；同一卖点能延展出至少 3 个角度；题材长板与现有素材/对标资产匹配。',
          ],
          quality_checks: ['书名简介内容三位一体，系统逆袭承诺必须在正文场景兑现。'],
        },
      },
    }
    const positionedText = [
      '这一章继续都市系统逆袭长篇的承诺：失业后的中年设备师接到报废设备订单，经济压力和被轻视的翻盘补偿都在现场。',
      '系统面板弹出刺眼评价，隐藏工具箱贴着他的维修职业生效，把混乱设备故障量化成可升级、可验证、可反击的目标。',
      '客户当众质疑他没有资质，协会也压住订单，他却用隐藏工具箱修出第一段线路结果，拿结果反证自己。',
      '旧城设备师用隐藏工具箱把报废设备修成新订单，系统面板给出即时反馈，小胜兑现后又出现医院设备的新门槛。',
      '节奏按番茄口味推进：快节奏、强回报、清晰冲突、短周期爽点；微创新只服务维修职业，没有跑出都市系统逆袭模板。',
      '本章没有为补短板新增旁枝支线，而是拉长题材长板：中年危机翻盘、系统评价吐槽、新手奖励立刻见效三个角度都服务核心卖点和目标情绪。',
    ].join('\n')
    const driftText = [
      '这一章改成古风权谋，主角进入修仙秘境。',
      '没有系统面板，也没有维修订单。',
      '金手指突然变成血脉神通，和设备维修职业无关。',
      '本章主要展示宏大世界观，微创新很多，暂时没有现实回报。',
      '为了补感情短板，作者新增一条豪门恋爱支线，冲淡了核心卖点和题材长板。',
      '这属于挂羊头卖狗肉，但作者觉得设定更有意思。',
    ].join('\n')

    const okReport = buildGenrePositioningSyncReport(project, chapter, contextPackage, positionedText)
    const warnReport = buildGenrePositioningSyncReport(project, chapter, contextPackage, driftText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('题材定位 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['题材标签', '读者心理', '类型公式', '核心梗', '金手指贴合', '必备场景', '平台适配', '微创新边界', '长板聚焦']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('题材定位缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['核心梗', '金手指贴合', '长板聚焦', '题材定位硬伤']))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('longboard_focus_rules')
    expect(warnReport.next_actions.join('；')).toMatch(/题材定位|挂羊头卖狗肉/)
    expect(warnReport.next_actions.join('；')).toContain('题材长板')
  })

  test('wires deterministic genre positioning hard risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicGenrePositioningChecks = [buildGenrePositioningDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicGenrePositioningChecks')
  })

  test('story state sync persists a genre_positioning_sync review', () => {
    const source = ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: genrePositioningSync, reviewType: 'genre_positioning_sync'")
    expect(source).toContain('buildGenrePositioningSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.genre_positioning_sync = genrePositioningSync')
  })

  test('checks female audience contract delivery after chapter text is written', () => {
    const project = { title: '春风不误', genre: '番茄女生现言', target_audience: '女性读者' }
    const chapter = { id: 34, chapter_no: 34, title: '她自己的合同' }
    const contextPackage = {
      chapter_target: {
        female_audience_contract: {
          version: 'oh_story_female_audience_v1',
          source: 'manual',
          audience_mode: 'female_longform',
          core_principles: ['安全感优先：本章必须给女主退路、能力或同盟锚点。', '代入感优先：处境、选择和反应要能投射。', '女主主动性：关键选择必须由女主自己做决定、自己推进。', '情绪即产品：主情绪要清楚。'],
          reader_need_rules: ['女频深层需求是被认可、被珍视、被尊重。'],
          copy_promise_rules: ['状态 → 困境 → 行动 → 成功，正文必须给女主成功暗示。'],
          romance_axis_rules: ['感情升级最好踩在女主的一次事业进展或成长节点上。'],
          abuse_dosage_rules: ['每段虐后必给反转或糖，避免连续整卷只虐。'],
          platform_fit_rules: ['番茄女生安全感要早给，节奏要快，回报要清楚。'],
          quality_checks: ['货板一致：书名简介内容与正文交付一致。'],
        },
      },
    }
    const femaleFacingText = [
      '女主先被合作方质疑，但她没有等男主救场，而是自己做决定，把合同退路和备份报价摆到桌面上。',
      '她用专业能力重新拆分条款，拿到客户认可，也让对方当场尊重她的边界，安全感来自能力、退路和同盟锚点。',
      '这一段让女性读者能代入她被轻视后的反击：她被认可、被珍视、被尊重，不再只是被安排赢。',
      '状态是被压价，困境是合同被抢，行动是她亲自谈判，成功是签回自己的合同，女主成功暗示已经落地。',
      '感情线没有抢走事业线，男主只在她完成成长节点后递来一杯热茶，暧昧升级踩在事业进展上。',
      '前面受委屈后立刻给反转和一点糖，没有连续只虐；番茄女生节奏保持快回报，货板一致。',
    ].join('\n')
    const passiveText = [
      '女主一直被虐，没有退路，也没有安全感。',
      '关键选择都由男主安排，女主被安排着赢。',
      '感情线脱离成长线，男主出面解决所有事业问题。',
      '这一章连续只虐，没有反转或糖。',
      '书名简介说女主事业翻盘，正文却只写她被迫等待别人施舍。',
    ].join('\n')

    const okReport = buildFemaleAudienceSyncReport(project, chapter, contextPackage, femaleFacingText)
    const warnReport = buildFemaleAudienceSyncReport(project, chapter, contextPackage, passiveText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('女频长篇 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['核心原则', '读者深层需求', '文案承诺', '感情线双轴', '虐戏剂量', '平台适配']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('女频长篇缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['核心原则', '感情线双轴', '女频长篇硬伤']))
    expect(warnReport.next_actions.join('；')).toMatch(/安全感|女主主动/)
  })

  test('story state sync persists a female_audience_sync review', () => {
    const source = ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: femaleAudienceSync, reviewType: 'female_audience_sync'")
    expect(source).toContain('buildFemaleAudienceSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.female_audience_sync = femaleAudienceSync')
  })

  test('wires deterministic female audience hard risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicFemaleAudienceChecks = [buildFemaleAudienceDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicFemaleAudienceChecks')
  })

  test('checks plot dynamics contract delivery after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 36, chapter_no: 36, title: '红色阀门' }
    const contextPackage = {
      chapter_target: {
        plot_dynamics_contract: {
          version: 'oh_story_plot_dynamics_v1',
          source: 'manual',
          plot_loop: [
            '目标：主角必须在医院停机前找到红色阀门故障。',
            '阻碍：协会会长封锁设备间，客户授权也被临时冻结。',
            '行动：主角拆开旧控制箱，用隐藏工具箱核验阀门线路。',
            '代价/反馈：线路核验暴露主角违规进入，客户信任提高但协会追责升级。',
            '新期待：章末红色阀门编号指向协会账本。',
          ],
          climax_formula: ['蓄能', '假胜', '崩解', '交叉死磕', '悬置收尾'],
          ab_outline: ['A 蓄压：协会封门提高阻碍。', 'B 抬情绪：主角用工具箱给出小反转。'],
          scene_purpose_map: ['场景1：核验红色阀门 -> 暴露协会账本线索。'],
          drive_mode_rules: [
            '番茄爽文/打脸文使用事件驱动：每章给一个外部结果，至少赢了、升级了、对手栽了之一可见。',
            '混合模式主线用事件往前推，每 3-5 章插一段情感停顿，但情感停顿也必须保留人物心结。',
          ],
          line_stagger_rules: [
            '主线和支线错开节奏推进，没有同时爆也没有同时空转。',
            '战力提升线、装备收获线、情感线、声望线不同步推进，避免同质化。',
          ],
          quality_checks: ['目标、阻碍、行动、代价/反馈、新期待必须闭环。'],
        },
      },
    }
    const drivenText = [
      '目标很明确：主角必须在医院停机前找到红色阀门故障。',
      '阻碍随即压上来，协会会长封锁设备间，客户授权也被临时冻结。',
      '他没有等人通融，直接拆开旧控制箱，用隐藏工具箱核验阀门线路。',
      '蓄能阶段，故障倒计时压低所有人的声音；假胜时，系统先显示阀门恢复。',
      '下一秒崩解出现，备用线路反向烧红，协会会长借机追责。',
      '交叉死磕里，主角一边稳住客户，一边当场追出协会账本编号。',
      '代价/反馈落地：违规进入被记录，客户信任提高，但协会追责升级。',
      '悬置收尾没有关门，章末红色阀门编号指向协会账本，留下新期待。',
      'A 蓄压和 B 抬情绪交替出现，红色阀门场景暴露了账本线索。',
      '本章按番茄爽文事件驱动执行，给出外部结果：主角赢下设备间处置权，工具箱升级出隐藏芯片，协会会长当众栽了一回。',
      '多线错峰也可见：主线推进到设备间账本，装备收获隐藏工具箱芯片，声望线只让客户信任提高，情感线保持待推进；主线和支线错开节奏推进，没有同时爆，也没有同时空转。',
    ].join('\n')
    const flatText = [
      '本章没有明确目标。',
      '也没有真正阻碍，主角一路顺利解决。',
      '他解释了很多背景，事情自然结束。',
      '没有代价反馈，也没有新期待。',
      '高潮没有假胜、崩解和交叉死磕，事情到这里结束。',
      '它明明是番茄爽文，却只有内心独白和两个人坐着闲谈，没有赢、没有升级、没有对手栽了，也没有任何外部结果。',
      '主线、支线、情感线和声望线同时爆完，后面又一起空转。',
    ].join('\n')

    const okReport = buildPlotDynamicsSyncReport(project, chapter, contextPackage, drivenText)
    const warnReport = buildPlotDynamicsSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('剧情动力 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['剧情闭环', '高潮公式', 'A/B节奏', '场景功能', '驱动方式', '多线错峰']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('剧情动力缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['剧情闭环', '高潮公式', '驱动方式', '多线错峰', '剧情动力硬伤']))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('drive_mode_rules')
    expect(warnReport.next_actions.join('；')).toMatch(/目标|阻碍|代价/)
    expect(warnReport.next_actions.join('；')).toContain('外部结果')
    expect(warnReport.next_actions.join('；')).toContain('主线和支线错开')
  })

  test('story state sync persists a plot_dynamics_sync review', () => {
    const source = ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: plotDynamicsSync, reviewType: 'plot_dynamics_sync'")
    expect(source).toContain('buildPlotDynamicsSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.plot_dynamics_sync = plotDynamicsSync')
  })

  test('wires deterministic plot dynamics hard risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicPlotDynamicsChecks = [buildPlotDynamicsDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicPlotDynamicsChecks')
  })

  test('checks character relation contract delivery after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 37, chapter_no: 37, title: '代签追责' }
    const contextPackage = {
      chapter_target: {
        character_relation_contract: {
          relationship_types: ['主角与林青禾：合作互信但仍有边界'],
          important_relationships: ['林青禾不能只是支持者，必须在追责会上主动拿出证据。'],
          independent_goals: ['主角要保住客户授权；林青禾要洗清代签责任。'],
          goal_ownership_rules: ['主角目标必须属于自己的，不能只是帮别人实现目标，否则主角会变成配角/工具人。'],
          relationship_life_rules: ['角色生命中必须有恋爱之外的内容，不能只是单薄的情感工具人。'],
          expectation_hub_rules: ['林青禾作为配角期待枢纽/任务基地，必须同时承载短期期待和长期期待；主角每次解决事件装完逼后回到她这里开启新一轮装逼，新剧情单元结束也由她递出下一轮新任务；她下线时要带来更大好处，转化损失厌恶。'],
          tests_or_pressure: ['协会追责、代签背锅、客户撤授权形成关系压力测试。'],
          attitude_shifts: ['林青禾从旁观/质疑转为主动作证并愿意协助。'],
          quality_checks: ['关系类型、独立目标、压力测试、态度变化和阶段匹配必须落进正文。'],
        },
      },
    }
    const relationText = [
      '关系类型：合作互信但仍有边界，林青禾没有立刻站到主角身后。',
      '主角的独立目标是保住客户授权，林青禾的独立目标是洗清代签责任。',
      '主角目标属于自己的：他不是帮林青禾完成调查，而是为了自己的客户授权、维修铺和后续接单资格主动追责。',
      '林青禾除了关系线里的信任变化，还有洗清代签责任、守住家族账册和承担作证后果这些恋爱之外的内容。',
      '林青禾作为配角期待枢纽和任务基地，同时承载短期期待：追责会作证，长期期待：后续账册线索。',
      '主角解决代签追责并完成装逼后回到林青禾这里，林青禾递出新账册线索，开启下一轮新任务和新一轮装逼。',
      '如果她暂时下线，也带来更大好处：家族账册钥匙和新客户授权，让读者从损失厌恶转为歪打误撞收获更多。',
      '协会追责、代签背锅和客户撤授权一起压下来，逼两人接受关系压力测试。',
      '林青禾不再只是支持者，她在追责会上主动拿出证据，替自己也替主角作证。',
      '她从旁观/质疑转为主动作证并愿意协助，但仍保留边界，没有直接越过当前亲密阶段。',
    ].join('\n')
    const flatText = [
      '两人只是互相支持。',
      '关系没有变化。',
      '配角只围着主角转，没有自己的目标。',
      '主角整章只是帮林青禾洗清代签责任，没有自己的客户授权诉求。',
      '她只负责恋爱和情绪支持，是单薄的情感工具人。',
      '林青禾只在旁边夸主角厉害，没有短期期待，也没有长期期待。',
      '主角解决事件后没有回到她这里开启新任务。',
      '她下线没有带来更大好处，只是消失。',
      '男主替主角解决全部问题。',
    ].join('\n')

    const okReport = buildCharacterRelationSyncReport(project, chapter, contextPackage, relationText)
    const warnReport = buildCharacterRelationSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('角色关系 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['关系类型', '独立目标', '目标归属', '角色不止恋爱', '配角期待枢纽', '关系压力', '态度变化']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('角色关系缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['关系弧线', '独立目标', '目标归属', '角色不止恋爱', '配角期待枢纽', '配角攻略缓冲区', '角色关系硬伤']))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('goal_ownership_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('relationship_life_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('expectation_hub_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('buffer_zone_rules')
    expect(warnReport.priority_repair).toContain('配角攻略缓冲区')
    expect(warnReport.next_actions.join('；')).toMatch(/关系类型|独立目标|压力/)
    expect(warnReport.next_actions.join('；')).toMatch(/任务基地|新一轮期待/)
    expect(warnReport.next_actions.join('；')).toContain('主角自己的目标')
  })

  test('checks character relation buffer-zone progression after delivery', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 42, chapter_no: 42, title: '半页账册' }
    const contextPackage = {
      chapter_target: {
        character_relation_contract: {
          relationship_types: ['主角与林青禾：联盟型，合作互信但仍有边界。'],
          buffer_zone_rules: [
            '配角攻略缓冲区必须始终存在：信息差、地位差距、亲密度差距或信任程度至少保留一种。',
            '关键拐点必须写清配角从旁观/质疑/拒绝/试探到行动/协助/设限的态度变化。',
            '配角不能像 NPC 一样站着等主角触发，必须有自己的行动和动机。',
          ],
          attitude_shifts: ['林青禾从旁观/质疑转为主动协助，但仍设下账册来源边界。'],
          quality_checks: ['缓冲区、配角主动行动和态度变化必须有正文证据。'],
        },
      },
    }
    const progressedText = [
      '两人的关系类型是联盟型，合作互信但仍有边界。',
      '配角攻略缓冲区仍在：林青禾只交出半页账册，保留钥匙来源这个信息差；她信任沈砚查账，却还没有共享家族账册全貌。',
      '关键拐点写清态度变化：她从旁观/质疑转为主动协助并设限，同时为了洗清自己的代签责任行动。',
      '林青禾不是 NPC 式站桩等待触发，她先联系账房、拿到证词，再设下“只查半页、不碰家族钥匙”的边界。',
    ].join('\n')
    const flatText = [
      '林青禾站在旁边等主角问话。',
      '她完全信任主角，把所有信息一次性交出来。',
      '两人关系很好，没有信息差、没有地位差距、没有信任程度变化。',
      '她没有自己的行动和动机，也没有从旁观质疑到协助设限的态度变化。',
    ].join('\n')

    const okReport = buildCharacterRelationSyncReport(project, chapter, contextPackage, progressedText)
    const warnReport = buildCharacterRelationSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.delivered.map((item: any) => item.key)).toContain('buffer_zone_rules')
    expect(okReport.delivered.find((item: any) => item.key === 'buffer_zone_rules')?.evidence.join('｜')).toContain('信息差')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.find((item: any) => item.key === 'buffer_zone_rules')?.label).toBe('配角攻略缓冲区')
    expect(warnReport.missed.find((item: any) => item.key === 'buffer_zone_rules')?.missed_items).toEqual(expect.arrayContaining([
      '缺信息差/地位差距/亲密度差距/信任程度缓冲区',
      '配角像 NPC 一样站桩等待触发',
      '缺旁观/质疑/拒绝/试探到行动/协助/设限的态度变化',
    ]))
    expect(warnReport.priority_repair).toBe('优先补配角攻略缓冲区')
    expect(warnReport.next_actions.join('；')).toContain('配角攻略缓冲区')
  })

  test('story state sync persists a character_relation_sync review', () => {
    const source = ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterRelationSync, reviewType: 'character_relation_sync'")
    expect(source).toContain('buildCharacterRelationSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.character_relation_sync = characterRelationSync')
  })

  test('wires deterministic character relation hard risks into normalized self review', () => {
    const source = ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicCharacterRelationChecks = [buildCharacterRelationDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicCharacterRelationChecks')
  })

  test('checks character desire, flaw pressure and growth beat after delivery', () => {
    const project = { title: '寒门阵师' }
    const chapter = { id: 13, chapter_no: 13, title: '裂纹代价' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 13,
        character_arc_brief: {
          character_name: '沈砚',
          desire: '沈砚想保住试炼资格并证明阵图属于自己',
          flaw_pressure: '他害怕暴露阵盘裂纹，只想继续藏拙',
          relationship_shift: '林青禾从旁观转为愿意替他作证',
          growth_beat: '沈砚第一次主动承认残阵缺陷，把藏拙改成公开争取',
          voice_anchor: '克制、冷静，但遇到阵法归属会寸步不让',
        },
        scene_cards: [
          {
            title: '裂纹作证',
            character_goal: '沈砚保住试炼资格并证明阵图属于自己',
            flaw_pressure: '害怕暴露阵盘裂纹',
            relationship_shift: '林青禾愿意替他作证',
            growth_beat: '主动承认残阵缺陷',
          },
        ],
      },
    }
    const grownText = [
      '沈砚想保住试炼资格，也要证明阵图属于自己。',
      '他原本害怕暴露阵盘裂纹，只想继续藏拙。',
      '可这一次，他没有再退，主动承认残阵缺陷，把藏拙改成公开争取。',
      '林青禾看见他把裂纹摆上台面，终于从旁观转为愿意替他作证。',
      '他的语气仍然克制冷静，可谈到阵法归属时寸步不让。',
    ].join('\n')
    const flatText = '沈砚在阵堂听别人争执。林青禾站在人群里没有表态。众人讨论许久，试炼资格暂时搁置。'

    const okReport = buildCharacterArcSyncReport(project, chapter, contextPackage, grownText)
    const warnReport = buildCharacterArcSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('人物弧光 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.score).toBeGreaterThanOrEqual(80)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('人物弧光缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('角色欲望')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('缺陷受压')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('成长节点')
    expect(warnReport.next_actions.join('；')).toContain('人物成长')
  })

  test('reads raw camelCase character arc brief after delivery', () => {
    const report = buildCharacterArcSyncReport(
      { title: '超人的规则怪谈世界' },
      {
        id: 26,
        chapter_no: 26,
        title: '旧广播室',
        raw_payload: {
          preDraftBrief: {
            characterArcBrief: {
              desire: '李超想证明自己不只能靠蛮力破局。',
              flawPressure: '他害怕一收住蛮力就会拖累张智。',
              relationshipShift: '李超第一次主动把判断权交给张智。',
              growthBeat: '李超从硬闯转为主动配合规则实验。',
              voiceAnchor: '李超嘴硬但行动开始克制。',
            },
          },
        },
      },
      {},
      '李超想证明自己不只能靠蛮力破局。门锁反噬时，他害怕一收住蛮力就会拖累张智，可这一次他没有硬闯，而是第一次主动把判断权交给张智。李超从硬闯转为主动配合规则实验，嘴上仍说别磨蹭，行动却开始克制。',
    )

    expect(report.label).not.toBe('人物弧光未配置')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['角色欲望', '缺陷受压', '关系变化', '成长节点', '口吻锚点']))
    expect(report.status).toBe('ok')
  })

  test('story state sync persists a character_arc_sync review', () => {
    const source = ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts','story-state-machine-update-phase-a.ts','story-state-machine-update-phase-b.ts'].map((name) => readFileSync(join(import.meta.dir, '../novel-writing-service/service', name), 'utf8')).join('\n')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterArcSync, reviewType: 'character_arc_sync'")
    expect(source).toContain('buildCharacterArcSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.character_arc_sync = characterArcSync')
  })

  test('supports a manually edited chapter word target', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 8 }, { word_target_mode: 'custom', target_word_count: 5200 })

    expect(target.mode).toBe('custom')
    expect(target.target).toBe(5200)
    expect(target.min).toBe(4680)
    expect(target.max).toBe(5720)
    expect(target.rangeText).toBe('4680-5720 字')
  })

  test('builds a commercial editor rewrite prompt with concrete improvement dimensions', () => {
    const prompt = buildCommercialEditorRewritePrompt(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 1,
          title: '双魂降临',
          ending_hook: '午夜广播公布第一条规则。',
          word_target: resolveChapterWordTarget({}, { chapter_no: 1 }, {}),
          scene_cards: [
            {
              scene_no: 1,
              title: '操场醒来',
              opening_hook: '车祸后的第一口冷风。',
              reader_payoff: '超人力量与规则压制第一次碰撞。',
              fear_point: '尾音被黑暗吞掉。',
              rule_pressure: '十点后不得离开宿舍。',
              ending_hook_seed: '钟表停在九点五十八分。',
            },
          ],
        },
      },
      '初稿正文',
    )

    expect(prompt).toContain('商业主编改稿')
    expect(prompt).toContain('开篇钩子')
    expect(prompt).toContain('人物声音')
    expect(prompt).toContain('规则压力')
    expect(prompt).toContain('恐怖具象化')
    expect(prompt).toContain('爽点密度')
    expect(prompt).toContain('章末钩子')
    expect(prompt).toContain('删除模板句')
    expect(prompt).toContain('prose_chapters')
    expect(prompt).toContain('scene_start_anchor')
    expect(prompt).toContain('scene_end_anchor')
    expect(prompt).toContain('scene_card_receipts')
  })

  test('asks commercial editor rewrite to preserve facts while applying oh-story natural prose rules', () => {
    const prompt = buildCommercialEditorRewritePrompt(
      { title: '审判庭旧账' },
      {
        chapter_target: {
          chapter_no: 3,
          title: '第二枚封条',
          word_target: resolveChapterWordTarget({}, { chapter_no: 3 }, {}),
        },
        setting_context: {
          forbidden: ['不能提前公开第三枚封条'],
        },
      },
      '初稿正文',
    )

    expect(prompt).toContain('oh-story 自然改稿底线')
    expect(prompt).toContain('动作 -> 对话 -> 情绪反应')
    expect(prompt).toContain('对话要像人说话')
    expect(prompt).toContain('心情不写心里话')
    expect(prompt).toContain('章尾不搞大升华')
    expect(prompt).toContain('打斗不写流水账')
    expect(prompt).toContain('修订守恒')
    expect(prompt).toContain('不得改写主线事实')
    expect(prompt).toContain('不得新增支线、设定、关系或时间线')
  })

  test('uses compact context snapshots for commercial editor prompts without leaking circular context', () => {
    const contextPackage: any = {
      chapter_target: {
        chapter_no: 2,
        title: '循环改稿',
        word_target: resolveChapterWordTarget({}, { chapter_no: 2 }, {}),
        scene_cards: [
          {
            title: '门锁回响',
            goal: `逼主角立刻处理上一章钩子；${'模型自检：scene_cards.goal_obstacle_change_delivered=false；'.repeat(20)}`,
          },
        ],
      },
    }
    contextPackage.self = contextPackage

    const prompt = buildCommercialEditorRewritePrompt(
      { title: '循环测试' },
      contextPackage,
      '初稿正文',
    )

    expect(prompt).toContain('循环改稿')
    expect(prompt).toContain('门锁回响')
    expect(prompt).toContain('逼主角立刻处理上一章钩子')
    expect(prompt).not.toContain('[Circular]')
    expect(prompt).not.toContain('goal_obstacle_change_delivered=false')
  })

  test('uses safe json for prose quality review payloads that include context packages', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).not.toContain('payload: JSON.stringify({ chapter_id: chapter.id, context_package')
    expect(source).not.toContain('payload: JSON.stringify({\n          chapter_id: chapter.id,\n          context_package: finalReviewContextPackage')
    expect(source).not.toContain('JSON.stringify(chapter.raw_payload || {})')
  })

  test('reads runtime camelCase chapterTarget word target when building editor rewrite prompts', () => {
    const runtimeTarget = resolveChapterWordTarget({}, { chapter_no: 8 }, { word_target_mode: 'custom', target_word_count: 5200 })
    const prompt = buildCommercialEditorRewritePrompt(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '旧标题',
        },
        chapterTarget: {
          chapterNo: 8,
          title: '会长私印',
          wordTarget: runtimeTarget,
        },
      },
      '初稿正文',
    )

    expect(prompt).toContain('目标章节：第8章《会长私印》')
    expect(prompt).toContain('字数约束：目标 5200 字，可接受范围 4680-5720 字')
  })
})

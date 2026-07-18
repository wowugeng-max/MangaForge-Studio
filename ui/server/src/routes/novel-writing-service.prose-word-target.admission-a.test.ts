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

describe('prose word target admission a', () => {
  test('checks oh-story expectation threshold after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 12, chapter_no: 12, title: '旧账反证' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        expectation_threshold_contract: {
          version: 'oh_story_expectation_threshold_v1',
          short_expectation: '沈砚先拿到审判庭行动资格',
          medium_expectations: ['公开验明旧印，证明旧账册被调换'],
          long_expectations: ['幕后长老为什么放任主角进入内层', '父亲旧案还有第三个证人'],
          thresholds: ['气血达标', '公开验明旧印', '独自取回阵牌'],
          dynamic_thresholds: ['公开验印会暴露父亲线索'],
          nested_units: ['拿到资格前先露出第三个证人的名字'],
          expectation_before_payoff_rules: [
            '期待感 > 爽点：铺垫的篇幅不少于释放的篇幅。',
            '爽点到来前一刻是张力最高处，不要提前泄气。',
          ],
          quality_checks: ['两长一短必须同时在线。'],
        },
      },
    }
    const thresholdText = [
      '沈砚先拿到审判庭行动资格，但气血达标只是第一道门槛。',
      '执事要求他公开验明旧印，他又必须独自取回阵牌。',
      '公开验明旧印会暴露父亲线索，证明旧账册被调换也会牵出幕后长老为什么放任主角进入内层。',
      '期待感大于爽点：他没有立刻兑现反证，而是先用三段铺垫拉长需求，让资格、旧印和第三个证人逐层压到释放前一刻。',
      '资格到手之前，旧印章背面先露出第三个证人的名字，父亲旧案还有第三个证人的长期期待没有断。',
    ].join('\n')
    const flatText = [
      '沈砚解释清楚账册问题，很快拿到资格。',
      '执事不再阻拦，众人都点头认可。',
      '没有期待铺垫，爽点立刻释放，读者还没开始等就结束了。',
      '当前目标顺利完成，事情结束。',
    ].join('\n')

    const okReport = buildExpectationThresholdSyncReport(project, chapter, contextPackage, thresholdText)
    const warnReport = buildExpectationThresholdSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('期待阈值 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['两长一短', '门槛拆分', '动态加码', '期待大于爽点', '下一开环']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('期待阈值缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['两长一短', '门槛拆分', '动态加码', '期待大于爽点', '下一开环']))
    expect(warnReport.next_actions.join('；')).toContain('两长一短')
    expect(warnReport.next_actions.join('；')).toContain('期待感')
  })

  test('reads expectation threshold sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '残阵问道' }
    const chapter = {
      id: 28,
      chapter_no: 28,
      title: '矿账新门',
      raw_payload: {
        preDraftBrief: {
          expectationThresholdContract: {
            shortExpectation: '沈砚先找到赤炉城矿脉账册入口',
            mediumExpectations: ['矿脉账册会证明执事封门时间造假'],
            longExpectations: ['赤炉城矿脉账册背后还有上层供奉'],
            thresholds: ['拿到炉牌', '找到矿账入口', '避开封门追捕'],
            dynamicThresholds: ['找到矿账入口后必须面对上层供奉审查'],
            expectationBeforePayoffRules: ['期待感 > 爽点：先拉长矿账入口门槛，再兑现证据反转。'],
            nextOpenLoop: '赤炉城矿脉账册背面出现供奉私印',
            qualityChecks: ['两长一短和下一开环必须同时在线。'],
          },
        },
      },
    }

    const report = buildExpectationThresholdSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 28, title: '矿账新门' } },
      '沈砚当场解决麻烦。众人点头散去。没有期待铺垫，爽点立刻释放，新的目标没有出现，事情到这里结束。',
    )

    expect(report.label).toContain('期待阈值缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('赤炉城矿脉账册')
    expect(report.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['两长一短', '动态加码', '期待大于爽点', '下一开环']))
    expect(report.quality_checks.join('｜')).toContain('两长一短和下一开环')
  })

  test('checks three expectation lines after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 13, chapter_no: 13, title: '旧印新门' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 13,
        expectation_threshold_contract: {
          version: 'oh_story_expectation_threshold_v1',
          three_expectation_lines: {
            plot_expectation: '旧账册被调换背后是谁在操盘。',
            theme_payoff: '沈砚用证据反杀执事，继续兑现证据流反转甜头。',
            freshness_hook: '旧印验明时会暴露父亲线索，把普通审判变成血缘旧案。',
          },
        },
      },
    }
    const okText = [
      '沈砚没有急着解释，他盯着旧账册缺页，问旧账册被调换背后是谁在操盘。',
      '执事逼他认错时，沈砚拿出第二枚旧印，用证据反杀执事，继续兑现证据流反转甜头。',
      '旧印验明时会暴露父亲线索，这场普通审判突然变成血缘旧案，所有人都意识到门后还有新东西。',
    ].join('\n')
    const staleText = [
      '沈砚查清旧账册被调换背后是谁在操盘。',
      '执事逼他认错时，沈砚拿出第二枚旧印，用证据反杀执事，继续兑现证据流反转甜头。',
      '众人点头，审判结束。',
    ].join('\n')

    const okReport = buildExpectationThresholdSyncReport(project, chapter, contextPackage, okText)
    const warnReport = buildExpectationThresholdSyncReport(project, chapter, contextPackage, staleText)

    expect(okReport.status).toBe('ok')
    expect(okReport.delivered.map((item: any) => item.key)).toContain('three_expectation_lines')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('three_expectation_lines')
    expect(warnReport.missed.find((item: any) => item.key === 'three_expectation_lines')?.label).toBe('三种期待线')
    expect(warnReport.next_actions.join('；')).toContain('剧情期待 + 主题甜头 + 新鲜感')
  })

  test('story state sync persists an expectation_threshold_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'expectation_threshold_sync'")
    expect(source).toContain("payloadKey: 'expectation_threshold_sync'")
    expect(source).toContain('buildExpectationThresholdSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.expectation_threshold_sync = expectationThresholdSync')
  })

  test('checks oh-story emotional arc after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 12, chapter_no: 12, title: '旧账反证' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        emotional_arc_contract: {
          version: 'oh_story_emotional_arc_v1',
          emotion_formula: '平静 -> 调动 -> 释放 -> 爽',
          arc_shape: '递进形',
          scene_emotion_steps: [
            '调动：旧账册当众压罪，制造压迫和不该如此',
            '释放：沈砚用旧印章反证，执事改口，全场态度转变',
          ],
          pressure_methods: ['公开升级：把私下伤害搬到公开场合。'],
          payoff_types: ['目标达成', '态度转变'],
          payoff_escalation_rules: [
            '影响范围：个人 -> 群体 -> 社会',
            '揭示深度：表象 -> 本质 -> 颠覆',
            '身份落差：路人 -> 大佬 -> 全场震惊',
          ],
          payoff_reverse_design: {
            design_order: [
              '先确定用什么方式让读者满足（爽点类型）。',
              '再设计如何拉起期待（期待点）。',
              '最后设计如何铺垫（铺垫）。',
            ],
            quality_checks: ['章纲必须按爽点类型 -> 期待点 -> 铺垫倒推。'],
          },
          payoff_tier_rules: [
            '日常小装逼：距离下个大爽点远时，用日常优势维持读者耐心。',
            '核心爽点：必须切在主线上，围绕主线目标装逼。',
            '偏离爽点：背离主线去别处装逼，必须避免。',
          ],
          payoff_density_rules: [
            '不要拉长单个爽点的铺垫，而是多想几个爽点。',
            '每 800-1200 字至少交付一次信息增量、能力展示、危机反制、关系变化或小回收。',
          ],
          emotion_module_recomposition_rules: [
            '戏剧性会磨损，情绪不会磨损；同一种爽感可以重复，但不能重复同一个戏剧单元。',
            '套路重复时必须至少换场景、换对手、加新情绪、提高 stakes/奖励复杂度之一。',
          ],
          expectation_rules: ['断期待禁止：下一个期待立起来之前，不能结束当前期待。'],
          safety_rules: ['下行情节中必须给读者看见底牌或潜在解法。'],
          quality_checks: ['调动、释放和爽感都必须有正文证据。'],
        },
      },
    }
    const arcText = [
      '旧账册当众压罪，沈砚先被迫承压，旁观弟子都觉得这不该如此。',
      '他没有争辩，只按住袖口里的旧印章，让读者看见底牌和潜在解法。',
      '执事继续公开升级压迫，逼他认罪。',
      '沈砚最后用旧印章反证账册被调换，执事当众改口，全场态度转变。',
      '这一段章纲按爽点倒推：先确定爽点类型是目标达成和态度转变，再用旧账册压罪拉起期待点，最后把旧印章、袖口底牌和公开审判铺垫到释放前。',
      '这次核心爽点切在主线目标上：反证旧账、拿回审判资格；日常小装逼只用一句旧印章辨伪维持耐心，没有离开主线去别处装逼。',
      '铺垫没有只拖一个大爽点：第一段确认旧账册墨色异常形成信息增量，第二段用袖口底牌反制执事催认罪，第三段林青禾公开站到他身侧带来关系变化，最后才反证旧账完成大爽点。',
      '这一次递增先从个人洗清冤屈，扩散到全场弟子改口，再逼宗门长老公开承认旧案牵连整座审判庭；揭示深度也从账册表象推进到账房本质黑幕，最后颠覆执事身份。',
      '这次仍然使用当众打脸的情绪模块，但没有重复同一个戏剧单元：场景从酒楼换到审判庭，对手从路人换成执事，新增“旧案牵连师门”的愧疚情绪，stakes 从个人清白提高到审判资格和宗门规则。',
      '场景1标注为调动/前反应，让读者提前知道旧账册压罪的坏结果；场景2标注为复现，执事逼认罪让坏结果真的发生；场景3标注为后反应/释放，沈砚作出改变并追查第二个证人，下一开环同时开启。',
      '下行情节中读者一直看得见底牌或潜在解法：旧印章、袖口暗牌和账册墨色都在反击前露过面。',
      '目标达成后，旧印章背面露出第二个证人的名字，新的期待立起来。',
      '下一个期待立起来之前，当前期待没有被散场打断。',
    ].join('\n')
    const flatText = [
      '沈砚很压抑，也很痛苦。',
      '众人说了几句，场面停住。',
      '他离开审判庭去酒楼随手打脸路人，和旧账主线无关。',
      '接下来一千多字都在反复铺垫同一个大爽点，作者拉长单个爽点的铺垫，读者没有新的信息增量、能力展示、危机反制、关系变化或小回收。',
      '本章继续重复同一个英雄救美打脸模板，还是同样结构，没有换场景、没有换对手、没有新情绪，stakes 和奖励也没有变化。',
      '直到最后他才忽然赢了，众人还是震惊。',
      '最后事情暂时结束，大家都散了。',
    ].join('\n')

    const okReport = buildEmotionalArcSyncReport(project, chapter, contextPackage, arcText)
    const warnReport = buildEmotionalArcSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('情绪弧 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['情绪公式', '调动释放', '爽点倒推法', '装逼层级', '多爽点密度', '情绪模块重组', '爽点递增对比', '场景情绪执行', '下行情节安全感']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('情绪弧缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['情绪公式', '调动释放', '爽点倒推法', '装逼层级', '多爽点密度', '情绪模块重组', '爽点递增对比', '下行情节安全感']))
    expect(warnReport.missed.find((item: any) => item.key === 'emotion_module_recomposition_rules')?.missed_items).toEqual(expect.arrayContaining([
      '重复戏剧单元没有换场景/对手/新情绪/stakes',
    ]))
    expect(warnReport.missed.find((item: any) => item.key === 'payoff_density_rules')?.repair_instruction).toContain('多想几个爽点')
    expect(warnReport.missed.find((item: any) => item.key === 'payoff_tier_rules')?.missed_items).toEqual(expect.arrayContaining([
      '缺核心爽点服务主线目标',
      '偏离爽点背离主线',
    ]))
    expect(warnReport.missed.find((item: any) => item.key === 'payoff_reverse_design')?.missed_items).toEqual(expect.arrayContaining([
      '缺期待点设计',
      '缺铺垫 -> 期待升高 -> 爽点释放链条',
    ]))
    expect(warnReport.missed.find((item: any) => item.key === 'payoff_escalation_rules')?.repair_instruction).toContain('影响范围')
    expect(warnReport.next_actions.join('；')).toContain('平静 -> 调动 -> 释放 -> 爽')
    expect(warnReport.next_actions.join('；')).toContain('换场景/换对手/加新情绪')
    expect(warnReport.next_actions.join('；')).toContain('影响范围')
  })

  test('checks oh-story plot emotion formulas after delivery', () => {
    const project = { title: '维修订单系统' }
    const chapter = { id: 33, chapter_no: 33, title: '停业单反杀' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 33,
        emotional_arc_contract: {
          version: 'oh_story_emotional_arc_v1',
          progressive_confrontation_rules: [
            '递进对抗写法：主角与反派是角力而非碾压。',
            '每次小角力主角稍占上风，反派继续加码，最后主角王炸一锤定音。',
          ],
          meme_plot_formula_rules: [
            '以梗构建剧情法：发生 -> 发展 -> 转折 -> 高潮。',
            '用梗作为高潮点倒推剧情，避免流水账。',
          ],
          reader_desire_formula_rules: [
            '驱动读者欲望四步公式：生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿。',
            '困境层级层层递进，解决方式也要多样。',
          ],
          quality_checks: ['递进对抗、梗四段式和读者欲望四步公式都必须有正文证据。'],
        },
      },
    }
    const formulaText = [
      '这一章的递进对抗不是一路碾压，而是角力而非碾压：第一轮主角只用检测笔小胜，会长马上加码拿出停业单，第二轮主角用客户记录顶住压力，最后才用备份订单王炸一锤定音。',
      '梗四段式完整落地：发生是协会停业单压到门口，发展是客户不断撤单和围观维修师误判，转折是系统订单记录反向证明会长造假，高潮是主角公开备份记录让协会当场改口。',
      '读者欲望四步公式也跑完：先生产诉求，让读者看见失业维修师被强权停业的不公；再给予希望，检测笔和备份订单提前露面；中段努力解决，主角逐项核对客户记录；最后得偿所愿，停业单作废、客户恢复授权，并抛出医院备用电源的新困境。',
    ].join('\n')
    const flatText = [
      '会长拿出停业单，主角立刻打开系统赢了。',
      '众人都震惊，协会也认错。',
      '事情结束，主角回家休息。',
    ].join('\n')

    const okReport = buildEmotionalArcSyncReport(project, chapter, contextPackage, formulaText)
    const warnReport = buildEmotionalArcSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['递进对抗', '梗四段式', '读者欲望四步公式']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['递进对抗', '梗四段式', '读者欲望四步公式']))
    expect(warnReport.next_actions.join('；')).toContain('角力而非碾压')
    expect(warnReport.next_actions.join('；')).toContain('发生 -> 发展 -> 转折 -> 高潮')
    expect(warnReport.next_actions.join('；')).toContain('生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿')
  })

  test('flags emotional turning self-claims when no triggering event is visible', () => {
    const project = { title: '长夜账本' }
    const chapter = { id: 88, chapter_no: 88, title: '忽然释然' }
    const contextPackage = {
      chapter_target: {
        emotional_arc_contract: {
          version: 'oh_story_emotional_arc_v1',
          source: 'manual',
          emotional_turning_rules: [
            '每 3-5 个小节有一次情绪转向，不能一路虐到底或一路爽到底。',
            '每次情绪转向都必须由事件触发，不能无理由从愤怒跳到释然、从压迫跳到爽感。',
          ],
          failure_mode_guards: ['太平：连续 5+ 小节没有情绪转折时，必须插入意外事件或新信息。'],
          quality_checks: ['情绪转向必须有触发事件证据。'],
        },
      },
    }
    const selfClaimText = [
      '沈砚一直很压抑，众人也一直沉默。',
      '本章每 3-5 个小节有一次情绪转向，他从愤怒变成释然，从压迫跳到爽感。',
      '但现场没有新证据、没有新动作、没有新代价，也没有任何人改口。',
      '他只是忽然觉得想开了，气氛突然变好。',
    ].join('\n')
    const triggeredText = [
      '沈砚一直被执事逼认罪，怒意压在喉间。',
      '账房忽然递出第二份账册，缺页上的尾号和执事袖口墨痕对上。',
      '这个新证据触发情绪转向：他从压迫里的愤怒转成冷静反击。',
      '执事当众改口，旁观者站到沈砚身侧，爽感由事件释放出来。',
    ].join('\n')

    const warnReport = buildEmotionalArcSyncReport(project, chapter, contextPackage, selfClaimText)
    const okReport = buildEmotionalArcSyncReport(project, chapter, contextPackage, triggeredText)

    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.find((item: any) => item.key === 'emotional_turning_rules')?.label).toBe('情绪转向')
    expect(warnReport.missed.find((item: any) => item.key === 'emotional_turning_rules')?.repair_instruction).toContain('事件触发')
    expect(warnReport.missed.find((item: any) => item.key === 'emotional_turning_rules')?.repair_instruction).toContain('新证据')
    expect(okReport.status).toBe('ok')
    expect(okReport.delivered.find((item: any) => item.key === 'emotional_turning_rules')?.evidence.join('｜')).toContain('事件触发')
  })

  test('checks emotional arc scene execution and expectation relay after delivery', () => {
    const project = { title: '长夜账本' }
    const chapter = { id: 91, chapter_no: 91, title: '血书回声' }
    const contextPackage = {
      chapter_target: {
        emotional_arc_contract: {
          version: 'oh_story_emotional_arc_v1',
          scene_execution_rules: [
            '每个场景必须标注读者当前情绪阶段：调动、复现、释放或后反应。',
            '虐/悲壮/遗憾场景必须按前反应 -> 复现 -> 后反应执行。',
            '闭环当前期待时必须同时开启下一开环。',
          ],
          reaction_structure_rules: [
            '前反应：让读者提前知道坏结果。',
            '复现：让坏结果真的发生。',
            '后反应：主角真情流露并作出改变。',
          ],
          expectation_rules: ['闭环一个期待时，必须同时开启新的期待或更大问题。'],
          quality_checks: ['场景卡和正文必须能对应调动、复现、后反应、下一开环。'],
        },
      },
    }
    const okText = [
      '场景1标注为调动/前反应：读者提前知道坏结果，血书压在门缝里，妹妹还在笑着收拾旧名牌。',
      '场景2标注为复现：坏结果真的发生，旧名牌被当众摔碎，压迫从预知落到现场。',
      '场景3标注为后反应/释放：主角真情流露，把碎片收进掌心，作出改变，决定查第三个证人。',
      '当前期待闭环为旧名牌真相，章尾同时开启下一开环：第三个证人为什么知道血书背面的名字。',
    ].join('\n')
    const flatText = [
      '主角很难过，妹妹也很难过。',
      '坏事发生了，大家沉默。',
      '最后他觉得应该振作，事情暂时结束。',
    ].join('\n')

    const okReport = buildEmotionalArcSyncReport(project, chapter, contextPackage, okText)
    const warnReport = buildEmotionalArcSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.delivered.map((item: any) => item.key)).toContain('scene_execution_rules')
    expect(okReport.delivered.find((item: any) => item.key === 'scene_execution_rules')?.evidence.join('｜')).toContain('下一开环')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.find((item: any) => item.key === 'scene_execution_rules')?.label).toBe('场景情绪执行')
    expect(warnReport.missed.find((item: any) => item.key === 'scene_execution_rules')?.missed_items).toEqual(expect.arrayContaining([
      '缺场景情绪阶段标注',
      '缺前反应-复现-后反应链条',
      '缺闭环期待后的下一开环',
    ]))
    expect(warnReport.priority_repair).toBe('优先补场景情绪执行')
    expect(warnReport.next_actions.join('；')).toContain('每个场景标注调动/复现/释放/后反应')
  })

  test('reads emotional arc sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '残阵问道' }
    const chapter = {
      id: 29,
      chapter_no: 29,
      title: '封门反压',
      raw_payload: {
        preDraftBrief: {
          emotionalArcContract: {
            emotionFormula: '压迫 -> 反压 -> 公开释放 -> 新期待',
            sceneEmotionSteps: ['执事封门制造压迫', '沈砚用矿账编号反压', '众人公开改口释放爽感'],
            payoffTypes: ['公开改口', '证据反压'],
            payoffEscalationRules: ['影响范围：院内 -> 审判庭 -> 赤炉城矿堂'],
            safetyRules: ['封门下压时必须露出矿账编号这张底牌。'],
            qualityChecks: ['压迫、反压和公开释放必须都有正文证据。'],
          },
        },
      },
    }

    const report = buildEmotionalArcSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 29, title: '封门反压' } },
      '沈砚觉得很难受。众人沉默。事情慢慢结束。',
    )

    expect(report.label).toContain('情绪弧缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('矿账编号')
    expect(report.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['情绪公式', '调动释放', '下行情节安全感']))
    expect(report.quality_checks.join('｜')).toContain('压迫、反压和公开释放')
  })

  test('story state sync persists an emotional_arc_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: emotionalArcSync, reviewType: 'emotional_arc_sync'")
    expect(source).toContain('buildEmotionalArcSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.emotional_arc_sync = emotionalArcSync')
  })

  test('checks oh-story chapter hooks after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 12, chapter_no: 12, title: '旧账反证' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        opening_hook: '执事当众逼沈砚交出旧账册，旧印章倒计时亮起。',
        ending_hook: '旧印章背面露出第三个证人的名字，执事必须在天亮前封口。',
        conflict: '执事抢旧账册，沈砚必须用旧印章反证。',
        ending_contract: {
          final_state: '沈砚用旧印章反证旧账册被调换。',
          unresolved_question: '第三个证人的名字露出。',
          next_chapter_pull: '执事必须在天亮前封口第三个证人。',
        },
      },
    }
    const hookedText = [
      '“交出旧账册。”执事当众逼近沈砚，旧印章忽然亮起倒计时，必须在天亮前验完。',
      '沈砚抓住旧印章，退半步又站稳，把账册缺页递到众人眼前。',
      '执事伸手抢账册，林青禾拦住他，问：“你怕哪一页？”',
      '沈砚用旧印章反证旧账册被调换，审判庭的灯一盏盏亮起。',
      '最后，旧印章背面露出第三个证人的名字。',
      '执事脸色骤变，门外响起急促脚步声：天亮前，必须封口第三个证人。',
    ].join('\n')
    const flatText = [
      '清晨，院子里很安静。',
      '沈砚想了很多过去的事情，也觉得未来仍然很难。',
      '他和执事谈了一会儿，大家终于明白这件事并不简单。',
      '经历了这一切，沈砚意识到新的开始才刚刚开始。',
    ].join('\n')

    const okReport = buildChapterHookSyncReport(project, chapter, contextPackage, hookedText)
    const warnReport = buildChapterHookSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('章级钩子 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['章首钩子', '章尾钩子', '章尾合同']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('章级钩子缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['章首钩子', '章尾钩子', '章尾合同']))
    expect(warnReport.next_actions.join('；')).toContain('前100字')
  })

  test('reads chapter hook sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '残阵问道' }
    const chapter = {
      id: 30,
      chapter_no: 30,
      title: '矿账私印',
      raw_payload: {
        preDraftBrief: {
          chapterHookContract: {
            openingHook: '矿账编号在封门令上自己亮起，沈砚必须立刻判断谁改过账。',
            endingHook: '赤炉城矿脉账册背面出现供奉私印，封门人转身灭口。',
            qualityChecks: ['章首必须用矿账编号触发现场冲突，章尾必须留下供奉私印和灭口压力。'],
          },
        },
      },
    }

    const report = buildChapterHookSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 30, title: '矿账私印' } },
      '清晨的院子很安静。沈砚想起很多旧事，众人也各自沉默。经历这些之后，他知道新的开始才刚刚开始。',
    )

    expect(report.label).toContain('章级钩子缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('矿账编号')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('供奉私印')
    expect(report.quality_checks.join('｜')).toContain('灭口压力')
  })

  test('story state sync persists a chapter_hook_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'chapter_hook_sync'")
    expect(source).toContain("payloadKey: 'chapter_hook_sync'")
    expect(source).toContain('buildChapterHookSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.chapter_hook_sync = chapterHookSync')
  })

  test('checks oh-story paragraph hooks after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 12, chapter_no: 12, title: '旧账反证' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        paragraph_hook_contract: {
          version: 'oh_story_paragraph_hook_v1',
          micro_hook_types: ['暗牌', '打脸', '代价', '冷发现'],
          hook_combinations: ['暗牌 + 打脸', '倒计时 + 代价'],
          dialogue_escalation: ['对话情绪五级递增：客观陈述事实 -> 主观指责 + 强制命令。'],
          spectator_layers: ['高质量：审判庭执事和林青禾反应必须改变局面。'],
          unfair_injury_hooks: ['损失转嫁型：执事把账册调换的责任甩给沈砚。'],
          forbidden_patterns: ['假悬念', '低风险钩', '同类型连用'],
          quality_checks: ['每 3-5 段必须出现信息、风险、情绪或关系变化。'],
        },
      },
    }
    const hookedText = [
      '执事把旧账册摔到案上，逼沈砚立刻认罪，否则天亮前取消试炼资格。',
      '沈砚没有争辩，只让袖口里的录音继续跑，暗牌还没亮出来。',
      '林青禾低声问：“你确定要等他把话说完？”沈砚点头：“还差一句。”',
      '执事冷笑着命令他跪下，全场都以为沈砚完了。',
      '沈砚这才拿出旧印章和录音，证明账册被调换，执事当众改口。',
      '审判庭长老看清印痕，脸色变了：“这不是普通缺页，是内库名单。”',
      '沈砚冷静地看见名单末尾多出第三个证人的名字，代价也跟着来了：他必须马上去内库。',
    ].join('\n\n')
    const flatText = [
      '沈砚走过长廊，石壁很旧，灯火安静。',
      '他想起过去几年修炼不易，心里有些感慨。',
      '院子里的人站得很整齐，大家都等着结果。',
      '执事说了几句流程，旁边弟子互相看了看。',
      '沈砚觉得事情应该会有办法，只是暂时还没有答案。',
      '风吹过廊柱，天色慢慢暗下来。',
    ].join('\n\n')

    const okReport = buildParagraphHookSyncReport(project, chapter, contextPackage, hookedText)
    const warnReport = buildParagraphHookSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('段落钩子 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['微钩子类型', '钩子组合', '对话递进', '围观者层级', '不公平伤害']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('段落钩子缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['微钩子类型', '钩子组合', '段落停滞']))
    expect(warnReport.next_actions.join('；')).toContain('每 3-5 段')
  })

  test('reads paragraph hook sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '残阵问道' }
    const chapter = {
      id: 31,
      chapter_no: 31,
      title: '封门代价',
      raw_payload: {
        preDraftBrief: {
          paragraphHookContract: {
            microHookTypes: ['矿账暗牌', '封门代价'],
            hookCombinations: ['矿账暗牌 + 封门代价'],
            dialogueEscalation: ['执事先解释流程，再强制沈砚认下封门代价。'],
            spectatorLayers: ['矿堂供奉必须当场改口，证明封门代价影响权力关系。'],
            qualityChecks: ['关键段落必须出现矿账暗牌和封门代价组合。'],
          },
        },
      },
    }

    const report = buildParagraphHookSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 31, title: '封门代价' } },
      '沈砚走过长廊。石壁很旧。众人沉默。事情暂时没有变化。',
    )

    expect(report.label).toContain('段落钩子缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('矿账暗牌')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('封门代价')
    expect(report.quality_checks.join('｜')).toContain('矿账暗牌和封门代价组合')
  })

  test('story state sync persists a paragraph_hook_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'paragraph_hook_sync'")
    expect(source).toContain("payloadKey: 'paragraph_hook_sync'")
    expect(source).toContain('buildParagraphHookSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.paragraph_hook_sync = paragraphHookSync')
  })

  test('checks oh-story suspense choreography after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 12, chapter_no: 12, title: '旧账反证' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        suspense_contract: {
          version: 'oh_story_suspense_v1',
          information_order_templates: ['意外剧情：提出疑问 -> 虚假提示 -> 公布答案。'],
          suspense_strength: '3 中悬念',
          suspense_cycle: [
            '种：缺页到底藏着什么规则',
            '养：执事给出假提示，声称缺页只是旧账册虫蛀',
            '收：旧印章背面露出第二行字，答案指向第三个证人',
          ],
          trigger_layers: [
            '第1层：展示旧印章初步成果 -> 旁观者初步反应。',
            '第2层：揭示这还不是最终结果 -> 观众期待升级。',
            '第3层：展示超出预期的第三个证人 -> 观众震惊。',
          ],
          expectation_layers: ['两长一短：短期查第三个证人，中期查内库名单，长期查父亲旧案。'],
          shock_layers: ['深度震惊：执事改口 -> 长老发现内库名单 -> 第三个证人名字引爆。'],
          quality_checks: ['疑问、误导、答案和新期待都有正文证据。'],
        },
      },
    }
    const suspenseText = [
      '缺页到底藏着什么规则？沈砚把旧账册摊开时，审判庭里所有人都盯着那道撕痕。',
      '执事先给出假提示，冷笑说：“只是虫蛀，别拿旧纸装神弄鬼，否则天亮前取消你的资格。”旁观弟子稍稍松了口气。',
      '沈砚没有立刻公布答案，只把旧印章按在缺页边缘，第一层印痕亮起，林青禾脸色变了。',
      '可这还不是最终结果，印痕下方又浮出第二行字，长老立刻上前：“这不是旧账，是内库名单。”',
      '答案终于公布：旧账册缺页指向第三个证人，执事当众改口，全场震惊。',
      '第三个证人只是短期期待，内库名单还没查完，父亲旧案背后的长期秘密也被重新拉起。',
    ].join('\n')
    const flatText = [
      '沈砚觉得这件事很神秘，但暂时不能说。',
      '大家都很紧张，不过很快发现只是误会。',
      '执事解释了一下，缺页没有什么特别。',
      '众人松了口气，事情暂时结束。',
    ].join('\n')

    const okReport = buildSuspenseSyncReport(project, chapter, contextPackage, suspenseText)
    const warnReport = buildSuspenseSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('悬念编排 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['信息顺序', '悬念强度', '三段钩子', '期待接力', '震惊分层']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('悬念缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['信息顺序', '三段钩子', '期待接力', '悬念禁忌']))
    expect(warnReport.next_actions.join('；')).toContain('疑问')
  })

  test('reads suspense sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '残阵问道' }
    const chapter = {
      id: 32,
      chapter_no: 32,
      title: '矿账谜题',
      raw_payload: {
        preDraftBrief: {
          suspenseContract: {
            informationOrderTemplates: ['矿账谜题：提出疑问 -> 封门误导 -> 供奉私印答案。'],
            suspenseStrength: '3 中悬念',
            suspenseCycle: [
              '种：矿账缺页到底藏着哪位供奉私印',
              '养：封门人误导沈砚，说缺页只是矿堂旧规',
              '收：账册背面露出供奉私印答案',
            ],
            expectationLayers: ['短期查供奉私印，中期查矿堂账册，长期查赤炉城上层供奉。'],
            shockLayers: ['高位者震惊：矿堂供奉当场改口。'],
            qualityChecks: ['矿账谜题必须有疑问、误导、答案和新期待。'],
          },
        },
      },
    }

    const report = buildSuspenseSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 32, title: '矿账谜题' } },
      '沈砚觉得这件事很神秘，但暂时不能说。大家很快发现只是误会，事情结束。',
    )

    expect(report.label).toContain('悬念缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('矿账谜题')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('供奉私印')
    expect(report.quality_checks.join('｜')).toContain('疑问、误导、答案和新期待')
  })

  test('checks oh-story suspense expectation chain after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 13, chapter_no: 13, title: '内库名单' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 13,
        suspense_contract: {
          version: 'oh_story_suspense_v1',
          information_order_templates: ['意外剧情：提出疑问 -> 虚假提示 -> 公布答案。'],
          suspense_strength: '3 中悬念',
          suspense_cycle: [
            '种：缺页到底藏着什么规则',
            '养：执事给出假提示，声称缺页只是旧账册虫蛀',
            '收：旧印章背面露出第二行字，答案指向第三个证人',
          ],
          trigger_layers: [
            '第1层：展示旧印章初步成果 -> 旁观者初步反应。',
            '第2层：揭示这还不是最终结果 -> 观众期待升级。',
            '第3层：展示超出预期的第三个证人 -> 观众震惊。',
          ],
          expectation_chain: {
            active_lines: ['短期期待：追查第三个证人', '中期期待：内库名单背后的失踪账册', '长期期待：父亲旧案真相'],
            carry_rules: ['至少两条期待线必须同时运行，当前谜题兑现后不能清空期待。'],
            next_open_loop: ['解决第三个证人后，必须留下内库名单的新门槛或父亲旧案的新线索。'],
          },
          expectation_layers: ['短期查第三个证人，中期查内库名单，长期查父亲旧案。'],
          shock_layers: ['深度震惊：执事改口 -> 长老发现内库名单 -> 第三个证人名字引爆。'],
          quality_checks: ['期待链不断裂，多线并行，麻烦不能消失。'],
        },
      },
    }
    const chainedText = [
      '缺页到底藏着什么规则？沈砚追查第三个证人，把旧账册摊开时，审判庭里所有人都盯着那道撕痕。',
      '执事先给出假提示，冷笑说：“只是虫蛀，别拿旧纸装神弄鬼，否则天亮前取消你的资格。”旁观弟子稍稍松了口气。',
      '沈砚没有立刻公布答案，只把旧印章按在缺页边缘，第一层印痕亮起，林青禾脸色变了。',
      '可这还不是最终结果，印痕下方又浮出第二行字，长老立刻上前：“这不是旧账，是内库名单。”',
      '答案终于公布：旧账册缺页指向第三个证人，执事当众改口，全场震惊。',
      '第三个证人只是短期期待，内库名单背后的失踪账册还没查完，中期期待被铜牌重新吊起；父亲旧案真相仍然没有答案，长期期待也被重新拉起。',
      '章尾新门槛压下来：内库只在子时开门，沈砚必须带铜牌进去，否则名单会被焚毁。',
    ].join('\n')
    const emptiedText = [
      '缺页到底藏着什么规则？沈砚追查第三个证人，把旧账册摊开时，审判庭里所有人都盯着那道撕痕。',
      '执事先给出假提示，冷笑说：“只是虫蛀，别拿旧纸装神弄鬼，否则天亮前取消你的资格。”旁观弟子稍稍松了口气。',
      '沈砚没有立刻公布答案，只把旧印章按在缺页边缘，第一层印痕亮起，林青禾脸色变了。',
      '可这还不是最终结果，印痕下方又浮出第二行字，长老立刻上前：“这不是旧账，是内库名单。”',
      '答案终于公布：旧账册缺页指向第三个证人，执事当众改口，全场震惊。',
      '第三个证人、内库名单和父亲旧案都解释完了，所有期待都兑现。',
      '当前谜题彻底解决，麻烦彻底消失了，也没有新的期待线。',
    ].join('\n')

    const okReport = buildSuspenseSyncReport(project, chapter, contextPackage, chainedText)
    const warnReport = buildSuspenseSyncReport(project, chapter, contextPackage, emptiedText)

    expect(okReport.status).toBe('ok')
    expect(okReport.delivered.map((item: any) => item.label)).toContain('期待链')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先补期待链')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('expectation_chain')
    expect(warnReport.next_actions.join('；')).toContain('至少两条期待线')
  })

  test('checks oh-story suspense and foreshadowing boundary after delivery', () => {
    const project = { title: '残阵问道' }
    const chapter = { id: 14, chapter_no: 14, title: '零点铃声' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 14,
        suspense_contract: {
          version: 'oh_story_suspense_v1',
          foreshadowing_boundary_rules: [
            '谜语人是故意不说明，伏笔是巧妙融入剧情、自然不刻意。',
            '信息延迟超过3章且中间无任何推进，就是谜语人，必须删掉或提前给。',
            '短期紧张用悬念，长期线索用伏笔，两者不能混淆。',
          ],
        },
      },
    }
    const boundaryText = [
      '缺页到底藏着什么？沈砚当场提出疑问，又从钟声和门牌水痕里拿到两个可查提示。',
      '旧铃铛沾水就哑了一息，他只是顺手擦干收进袖中，没有解释。',
      '第二次钟声响起时，铃铛又短短哑火，林青禾看见铃口水痕，意识到这不是普通旧物。',
      '章尾答案公布：缺页对应零点钟声，但父亲旧案里的铃铛水痕还没查完，长期线索继续推进。',
    ].join('\n')
    const mysteryBoxText = [
      '这件事很神秘，沈砚知道原因，但作者故意不说。',
      '他只说以后会揭晓真相，超过三章中间没有任何推进。',
      '所有人都在等答案，可正文不给提示、不给代价、也不给可推理线索。',
    ].join('\n')

    const okReport = buildSuspenseSyncReport(project, chapter, contextPackage, boundaryText)
    const warnReport = buildSuspenseSyncReport(project, chapter, contextPackage, mysteryBoxText)

    expect(okReport.delivered.map((item: any) => item.label)).toContain('悬念伏笔边界')
    expect(okReport.missed.map((item: any) => item.key)).not.toContain('foreshadowing_boundary_rules')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先修悬念伏笔边界')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('foreshadowing_boundary_rules')
    expect(warnReport.missed.find((item: any) => item.key === 'foreshadowing_boundary_rules')?.missed_items).toEqual(expect.arrayContaining([
      '故意藏信息像谜语人',
      '信息延迟超过3章且中间无推进',
      '缺少可推理提示/代价/自然线索',
    ]))
    expect(warnReport.next_actions.join('；')).toContain('伏笔不是谜语人')
  })

  test('story state sync persists a suspense_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'suspense_sync'")
    expect(source).toContain("payloadKey: 'suspense_sync'")
    expect(source).toContain('buildSuspenseSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.suspense_sync = suspenseSync')
  })


})

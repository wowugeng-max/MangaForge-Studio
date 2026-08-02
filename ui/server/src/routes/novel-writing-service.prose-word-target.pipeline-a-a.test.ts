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

describe('prose word target pipeline a a', () => {
  test('reads character behavior sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 41,
      chapter_no: 41,
      title: '旧印动机',
      raw_payload: {
        preDraftBrief: {
          characterBehaviorContract: {
            motivationChain: ['赤炉旧印动机链：沈砚为保住矿账证人，必须冒险当众验印。'],
            layeredTags: ['身份标签：旧城证人；表现标签：冷静反锁；内核标签：不再替别人背账。'],
            behaviorRules: ['沈砚必须用验印动作展示选择，而不是口头解释成长。'],
            memoryAnchors: ['沈砚每次判断前都会按住旧印缺口。'],
            qualityChecks: ['旧印动机、验印动作和按住旧印缺口必须同时可见。'],
          },
        },
      },
    }

    const report = buildCharacterBehaviorSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 41, title: '旧印动机' } },
      '沈砚突然决定帮忙。他解释自己已经成长，众人听完后表示理解。',
    )

    expect(report.label).toContain('角色行为缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('赤炉旧印动机链')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('旧印缺口')
    expect(report.quality_checks.join('｜')).toContain('验印动作')
  })

  test('reads asset linkage sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 42,
      chapter_no: 42,
      title: '炉牌归属',
      raw_payload: {
        preDraftBrief: {
          assetLinkageContract: {
            keyAssets: ['赤炉炉牌', '第七号矿账封条'],
            linkagePlan: ['赤炉炉牌必须推进入城目标，第七号矿账封条必须制造守门阻碍。'],
            stateTracking: ['赤炉炉牌从未登记变为临时归属沈砚。'],
            threeAppearancePlan: ['炉牌第一次拦门，第二次验印，第三次打开供奉私印线索。'],
            qualityChecks: ['赤炉炉牌和第七号矿账封条都必须绑定目标、阻碍和章尾钩子。'],
          },
        },
      },
    }

    const report = buildAssetLinkageSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 42, title: '炉牌归属' } },
      '沈砚拿到一个东西。大家讨论了一会儿，事情解决。',
    )

    expect(report.label).toContain('资产挂钩缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('赤炉炉牌')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('第七号矿账封条')
    expect(report.quality_checks.join('｜')).toContain('章尾钩子')
  })

  test('reads state tracking sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 43,
      chapter_no: 43,
      title: '矿账状态',
      raw_payload: {
        preDraftBrief: {
          stateTrackingContract: {
            characterStates: ['沈砚当前状态：持有未登记赤炉炉牌，但身份仍被守门人质疑。'],
            historicalCausality: ['上一章赤炉封条被调换，所以本章必须追问第七号矿账来源。'],
            worldConstraints: ['赤炉城规则：未登记炉牌不能直接进入矿堂内库。'],
            filterRules: ['只带入会影响本章验印选择的状态，不写百科背景。'],
            qualityChecks: ['未登记炉牌、封条调换和内库限制必须影响本章行动。'],
          },
        },
      },
    }

    const report = buildStateTrackingSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 43, title: '矿账状态' } },
      '沈砚进入矿堂。背景很多，规则很多，大家等待后续再处理。',
    )

    expect(report.label).toContain('状态跟踪缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('未登记赤炉炉牌')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('第七号矿账来源')
    expect(report.quality_checks.join('｜')).toContain('内库限制')
  })

  test('reads intent confirmation sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 44,
      chapter_no: 44,
      title: '反锁意图',
      raw_payload: {
        preDraftBrief: {
          intentConfirmationContract: {
            confirmedIntent: '本章意图：用第七号矿账封条反锁守门人的解释权。',
            rhythmAndStyle: ['蓄势三段后短句爆发，再用账房反应冷却。'],
            structureInputs: ['代价/收益：公开得罪守门人，但夺回矿账解释权。', '章尾承接：供奉私印来源变成下一问。'],
            executionFocus: ['信息差反应：账房、守门人、旁观矿工必须有差异化反应。'],
            qualityChecks: ['反锁解释权、公开得罪守门人和供奉私印下一问必须同时可见。'],
          },
        },
      },
    }

    const report = buildIntentConfirmationSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 44, title: '反锁意图' } },
      '大家讨论很久，事情就解决了。本章只是过渡，之后再说。',
    )

    expect(report.label).toContain('意图确认缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('第七号矿账封条')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('供奉私印')
    expect(report.quality_checks.join('｜')).toContain('反锁解释权')
  })

  test('reads continuity heat sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 45,
      chapter_no: 45,
      title: '热度接力',
      raw_payload: {
        preDraftBrief: {
          continuityHeatContract: {
            heatStates: ['hot：第七号矿账封条必须继续施压', 'warm：赤炉炉牌归属要触达一次', 'cold：镜中供奉私印只能升温不能揭完'],
            activeExpectations: ['读者正在等第七号矿账封条来源'],
            watchItems: ['赤炉炉牌归属', '镜中供奉私印'],
            dormantAllowed: ['旧城外账名单本章允许休眠'],
            qualityChecks: ['hot 封条、warm 炉牌和 cold 私印必须有热度层级。'],
          },
        },
      },
    }

    const report = buildContinuityHeatSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 45, title: '热度接力' } },
      '沈砚处理新事情。旧线索没有再提，事情继续发展。',
    )

    expect(report.label).toContain('连续性热度缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('第七号矿账封条')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('镜中供奉私印')
    expect(report.quality_checks.join('｜')).toContain('热度层级')
  })

  test('reads conflict structure sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 46,
      chapter_no: 46,
      title: '封门冲突',
      raw_payload: {
        preDraftBrief: {
          conflictStructureContract: {
            conflictLadder: ['封门冲突必须从言语压迫升级到炉牌扣押，再升级到内库资格判定。'],
            motivationSources: ['世界背景：赤炉城登记规则阻止沈砚进入矿堂。'],
            antagonistPressureRules: ['守门人用登记规则压势，不只站桩嘲讽。'],
            protagonistAgencyRules: ['沈砚必须用第七号封条做别人想不到的反锁。'],
            nextConflictSeeds: ['章尾留下供奉私印是谁盖的下一冲突。'],
            qualityChecks: ['封门冲突必须有升级阶梯、登记规则压势和供奉私印种子。'],
          },
        },
      },
    }

    const report = buildConflictStructureSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 46, title: '封门冲突' } },
      '沈砚和守门人争了几句。守门人让开，事情结束。',
    )

    expect(report.label).toContain('冲突结构缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('炉牌扣押')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('第七号封条')
    expect(report.quality_checks.join('｜')).toContain('供奉私印种子')
  })

  test('reads upgrade rhythm sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 47,
      chapter_no: 47,
      title: '旧印升级',
      raw_payload: {
        preDraftBrief: {
          upgradeRhythmContract: {
            upgradeGap: ['升级前缺口：旧印只能验普通账册，无法识别供奉私印。'],
            upgradeGainPlan: ['升级后获得赤炉私印识别能力，但只能识别一次。'],
            feedbackLoop: ['验出私印 -> 众人反应 -> 解锁一次性识别反馈 -> 留下更高门槛。'],
            emotionModules: ['点石成金：不起眼旧印验出供奉私印价值。'],
            qualityChecks: ['旧印升级必须有缺口、一次性识别反馈和更高门槛。'],
          },
        },
      },
    }

    const report = buildUpgradeRhythmSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 47, title: '旧印升级' } },
      '沈砚忽然变强，直接解决了所有问题，没有新门槛。',
    )

    expect(report.label).toContain('升级节奏缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('供奉私印')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('一次性识别')
    expect(report.quality_checks.join('｜')).toContain('更高门槛')
  })

  test('reads target reader sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 48,
      chapter_no: 48,
      title: '读者回报',
      raw_payload: {
        preDraftBrief: {
          targetReaderContract: {
            readerProfile: '目标读者：喜欢规则反制、证据流打脸和短周期追更回报的男频读者。',
            readerDesires: ['想看沈砚用第七号封条移除不公平登记规则。'],
            emotionalGapAnalysis: ['核心痛苦：被规则压着走；未满足需求：亲手拿回解释权。'],
            chapterAttractions: ['第七号封条当场反制守门人，章尾挂供奉私印。'],
            qualityChecks: ['目标读者必须看到规则反制、解释权回收和供奉私印期待。'],
          },
        },
      },
    }

    const report = buildTargetReaderSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 48, title: '读者回报' } },
      '作者觉得这个世界观很有意思。读者会喜欢。主要展示设定，没有明显回报。',
    )

    expect(report.label).toContain('目标读者缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('规则反制')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('供奉私印')
    expect(report.quality_checks.join('｜')).toContain('解释权回收')
  })

  test('reads genre positioning sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 49,
      chapter_no: 49,
      title: '类型承诺',
      raw_payload: {
        preDraftBrief: {
          genrePositioningContract: {
            genreLabel: '证据流玄幻升级文',
            readerPsychology: ['读者要看到寒门主角用证据反制规则压迫。'],
            genreFormula: ['封条证据 -> 规则压迫 -> 旧印验证 -> 当场反打。'],
            coreHookRules: ['核心梗：旧印能验出矿账封条真伪。'],
            mustHaveScenes: ['必须有第七号封条验真场面。'],
            qualityChecks: ['证据流、旧印验真和规则反打必须三位一体。'],
          },
        },
      },
    }

    const report = buildGenrePositioningSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 49, title: '类型承诺' } },
      '这一章忽然写成古风权谋闲谈。没有旧印，没有验真，也没有规则反打。',
    )

    expect(report.label).toContain('题材定位缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('证据流玄幻升级文')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('第七号封条验真')
    expect(report.quality_checks.join('｜')).toContain('三位一体')
  })

  test('reads female audience sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '换亲账本', genre: '女频宅斗' }
    const chapter = {
      id: 50,
      chapter_no: 50,
      title: '账本退路',
      raw_payload: {
        preDraftBrief: {
          femaleAudienceContract: {
            corePrinciples: ['安全感：女主必须握住嫁妆账本退路。', '女主主动性：关键选择由女主亲自谈判。'],
            readerNeedRules: ['深层需求：女主被尊重，被珍视，而不是只被拯救。'],
            copyPromiseRules: ['状态 -> 困境 -> 行动 -> 成功：女主用账本条款拿回铺子。'],
            romanceAxisRules: ['感情升温必须踩在女主拿回铺子的成长节点上。'],
            qualityChecks: ['账本退路、亲自谈判和成长节点升温必须同时可见。'],
          },
        },
      },
    }

    const report = buildFemaleAudienceSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 50, title: '账本退路' } },
      '女主被安排着赢，关键选择都由男主安排。她一直被虐，没有退路。',
    )

    expect(report.label).toContain('女频长篇缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('嫁妆账本退路')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('亲自谈判')
    expect(report.quality_checks.join('｜')).toContain('成长节点升温')
  })

  test('reads plot dynamics sync contract from camelCase chapter raw preDraftBrief', () => {
    const project = { title: '赤炉账册' }
    const chapter = {
      id: 51,
      chapter_no: 51,
      title: '动力闭环',
      raw_payload: {
        preDraftBrief: {
          plotDynamicsContract: {
            plotLoop: ['目标：拿到第七号矿账封条', '阻碍：守门人扣押炉牌', '行动：沈砚当场验印', '代价/反馈：公开得罪守门人', '新期待：供奉私印来源'],
            climaxFormula: ['蓄能：守门人压规则', '假胜：炉牌看似被没收', '崩解：第七号封条反咬', '悬置收尾：供奉私印未解'],
            abOutline: ['A 蓄压：扣押炉牌', 'B 抬情绪：验印反制'],
            qualityChecks: ['剧情动力必须有第七号封条目标、炉牌阻碍、验印行动和供奉私印新期待。'],
          },
        },
      },
    }

    const report = buildPlotDynamicsSyncReport(
      project,
      chapter,
      { chapter_target: { chapter_no: 51, title: '动力闭环' } },
      '没有明确目标，没有真正阻碍，一路顺利解决。没有代价反馈，没有新期待。',
    )

    expect(report.label).toContain('剧情动力缺口')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('第七号矿账封条')
    expect(report.planned.map((item: any) => item.text).join('｜')).toContain('守门人扣押炉牌')
    expect(report.quality_checks.join('｜')).toContain('供奉私印新期待')
  })

})

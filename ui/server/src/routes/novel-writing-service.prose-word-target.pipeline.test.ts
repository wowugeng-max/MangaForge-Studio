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

describe('prose word target pipeline', () => {
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

  test('checks oh-story beat cooling after repeated conflict chapters', () => {
    const project = { title: '旧城账册' }
    const conflictChapter = { id: 151, chapter_no: 15, title: '第三次会审压迫' }
    const recentConflictContext = {
      chapter_target: {
        chapter_no: 15,
        beat_type: 'conflict_thrill',
        recent_chapter_beats: [
          { chapter_no: 11, beat_type: 'tension_escalation', label: '对手改规则' },
          { chapter_no: 12, beat_type: 'conflict_thrill', label: '会审开打' },
          { chapter_no: 13, beat_type: 'conflict_thrill', label: '执事压问' },
          { chapter_no: 14, beat_type: 'conflict_thrill', label: '长老翻案' },
        ],
      },
    }
    const rotatedChapter = { id: 152, chapter_no: 16, title: '账册余波' }
    const rotatedContext = {
      chapter_target: {
        chapter_no: 16,
        beat_type: 'bond_deepening',
        recent_chapter_beats: [
          { chapter_no: 12, beat_type: 'conflict_thrill', label: '会审开打' },
          { chapter_no: 13, beat_type: 'conflict_thrill', label: '执事压问' },
          { chapter_no: 14, beat_type: 'tension_escalation', label: '长老翻案' },
          { chapter_no: 15, beat_type: 'world_painting', label: '旧城账册规则展开' },
        ],
      },
    }

    const conflictReport = buildBeatCoolingSyncReport(project, conflictChapter, recentConflictContext, '沈砚第三次冲进会审厅，执事再次拔剑，长老席继续加压，所有人都被迫看这场大冲突。')
    const rotatedReport = buildBeatCoolingSyncReport(project, rotatedChapter, rotatedContext, '沈砚没有继续开打，而是和林青禾复盘旧城账册背后的地契规则。两人的信任关系推进，旧城税契世界观也被展开。')

    expect(conflictReport.status).toBe('warn')
    expect(conflictReport.priority_repair).toBe('优先轮换桥段类型')
    expect(conflictReport.missed.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'conflict_thrill_overrun',
      'five_chapter_texture_gap',
    ]))
    expect(conflictReport.next_actions.join('；')).toContain('关系深化')
    expect(rotatedReport.status).toBe('ok')
    expect(rotatedReport.missed_count).toBe(0)
  })

  test('story state sync persists a beat_cooling_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: beatCoolingSync, reviewType: 'beat_cooling_sync'")
    expect(source).toContain('buildBeatCoolingSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.beat_cooling_sync = beatCoolingSync')
  })

  test('checks opening contract protagonist entry, expectation point and foundations after delivery', () => {
    const project = { title: '规则妈妈们找上门' }
    const chapter = { id: 1, chapter_no: 1, title: '门外有三个妈妈' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 1,
        opening_contract: {
          version: 'oh_story_opening_v1',
          source: 'manual',
          activation_scope: '前3章强制执行。',
          opening_strategy: '危机开局',
          required_beats: [
            '300 字内主角登场，且带着危机、优势或陌生环境进入现场。',
            '1000 字内必须出现爽点或期待点。',
            '第一章必须说明：主角目标 + 本文卖点。',
          ],
          foundation_points: [
            '人设基点：展示主角核心性格和处境。',
            '切入点基点：主角遭遇第一个冲突。',
            '金手指基点：展示主角独特优势。',
          ],
          opening_plan: [
            '李岚把裁员信塞进口袋时，门外响起三道一模一样的敲门声。',
            '1000字内出现血缘系统和三位妈妈的反常身份。',
            '系统给出第一次检测。',
          ],
          five_essentials_rules: [
            '简单点：第一章交代谁/在哪里/有什么/为什么/要做什么。',
            '不能偏：开头剧情必须符合主线。',
            '要快：切入剧情速度要快。',
            '要爽：第一个小剧情必须有爽点。',
            '不能平：必须有冲突矛盾，不能平淡如水。',
          ],
          information_priority: ['危机感 > 人设 > 金手指暗示 > 世界观。'],
          forbidden_patterns: ['大段背景介绍', '天气/风景开头', '世界观详细解说'],
          quality_checks: ['主角登场、期待点和金手指基点都在正文早段兑现。'],
        },
      },
    }
    const openingText = [
      '李岚把裁员信塞进口袋时，门外响起三道一模一样的敲门声。',
      '房租催缴短信还亮在屏幕上，七天倒计时忽然跳出来：请在三位母亲中确认真正血缘，否则账户冻结。',
      '第一位女人递来认亲协议，第二位女人直接叫出他小时候的小名，第三位女人却拿着一张没有照片的出生证明。',
      '李岚的目标很清楚：先活过七天，再查清真正血缘；本文卖点就是普通失业中年被病娇妈妈和血缘系统同时拖进规则认亲局。',
      '系统给出第一次检测：第一位妈妈血缘匹配率为零。爽点和期待点同时落地，读者立刻想知道另外两位妈妈是真是假。',
      '他没有一次性解释世界观，只先确认裁员危机、三位妈妈、血缘系统和倒计时；更多规则留到下一章。',
      '这个开头五要诀都落地：谁在哪里、有什么压力、为什么要选择、要做什么都简单清楚；剧情不偏主线，切入快，第一个小剧情有认亲爽点和倒计时冲突，绝不平淡。',
    ].join('\n')
    const slowText = [
      '清晨的阳光落在城市边缘，风吹过老小区的梧桐树。',
      '这座城市有很多年的历史，李岚所在的街区也经历过复杂变迁。',
      '过了很久，李岚才慢慢想起自己昨天失业了。',
      '门外似乎有人，但故事暂时还没有进入正题。',
    ].join('\n')

    const okReport = buildOpeningSyncReport(project, chapter, contextPackage, openingText)
    const warnReport = buildOpeningSyncReport(project, chapter, contextPackage, slowText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('开篇设计 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['主角登场', '爽点/期待点', '三大基点', '目标与卖点', '开头五要诀', '信息释放']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('开篇缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['主角登场', '爽点/期待点', '三大基点', '开头五要诀', '开篇禁忌']))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('five_essentials_rules')
    expect(warnReport.next_actions.join('；')).toContain('前300字')
    expect(warnReport.next_actions.join('；')).toContain('简单/不偏/快/爽/不平')
  })

  test('opening sync carries planned core conflict alignment into forbidden checks', () => {
    const project = { title: '试炼资格' }
    const chapter = { id: 16, chapter_no: 16, title: '资格作废' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 16,
        conflict: '执事设局阻拦李玄参加试炼。',
      },
    }
    const chapterText = [
      '李玄刚踏进演武场，玉牌突然炸出倒计时：十息内交出袖中账册，否则资格作废。',
      '执法弟子伸手来抢，他按住账册后退一步，问是谁改了规矩。',
      '看台下的人群被红光逼得散开，他抓住玉牌，决定先保住账册再查倒计时来源。',
    ].join('\n')

    const report = buildOpeningSyncReport(project, chapter, contextPackage, chapterText)
    const forbiddenCheck = report.missed.find((item: any) => item.key === 'opening_forbidden')

    expect(forbiddenCheck).toBeTruthy()
    expect(forbiddenCheck.missed_items).toContain('开篇核心冲突扫描')
    expect(forbiddenCheck.evidence.join('；')).toContain('执事设局阻拦李玄参加试炼')
  })

  test('story state sync persists an opening_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'opening_sync', payloadKey: 'opening_sync'")
    expect(source).toContain('buildOpeningSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.opening_sync = openingSync')
  })

  test('checks prose craft contract delivery after chapter text is written', () => {
    const project = { title: '旧城账册' }
    const chapter = { id: 16, chapter_no: 16, title: '一块钱转账单' }
    const contextPackage = {
      chapter_target: {
        prose_craft_contract: {
          version: 'oh_story_prose_craft_v1',
          source: 'manual',
          pov_rules: ['深度限知：只写沈砚当下能看见、听见、触到和推断出的内容。'],
          expression_rules: ['身体细节替代情绪词：愤怒、委屈、悲伤必须落到手、呼吸、肩背或具体动作。'],
          scene_weaving_rules: ['三维度揉进：事件推进、感官/物件、身体反应必须同场出现。'],
          rhythm_rules: ['一动一静：动作推进和静态观察交替，不能连续空想。'],
          object_number_rules: ['具体数字和道具必须承担剧情功能：八万块、一块钱、账本、旧疤。'],
          section_structure_rules: [
            '小节内部结构：一个主事件 + 3-5 个子事件，一个情绪变化，一条读者新获知的信息，必要时 3-5 轮对话交锋。',
            '小节之间衔接：小节结尾留钩子，下一节开头快速接续，不重新铺垫，情绪跨节递进。',
          ],
          section_density_rules: ['小节密度诊断：每个小节至少有目标、阻碍、信息增量或情绪变化。'],
          anti_padding_rules: ['不得为凑字数加环境描写、重复情绪、内心独白总结或无意义动作。'],
          concept_anchor_rules: ['新名词/新设定首次出现时，必须靠动作反应、对话半句或物理后果给读者一个当下作用锚点。'],
          scene_anchors: ['沈砚手腕旧疤被桌沿压住', '对手把账本推过来', '八万块欠款和一块钱转账单'],
          forbidden_patterns: ['他不知道的是', '如果她知道真相', '所有人都没有发现'],
          quality_checks: ['每个详写子事件必须让动作、身体细节和数字承担剧情功能。'],
        },
      },
      setting_context: {
        chapter_usage: [
          { name: '蓝晶', usage_type: 'new_concept', summary: '首次出现的记忆载体。' },
        ],
      },
    }
    const craftedText = [
      '沈砚看见对手把账本推到灯下，封皮边缘压住那张一块钱的转账单。',
      '他没有抬头，手腕旧疤被桌沿硌住，指尖先停了一下，再把八万块欠款那一页翻出来。',
      '“签。”执事把笔往前一推。',
      '“这页不对。”沈砚把账本压回灯下。',
      '“哪里不对？”',
      '“尾号少了一笔。”',
      '这一节的主事件从签认罪书变成核对尾号：账本暴露信息，八万块抬高代价，一块钱转账单改变现场风向，执事的笑意第一次停住。',
      '林青禾立刻接住尾号线索，把蓝晶按上太阳穴，陌生人的记忆碎片在她眼前炸开，旧账本缺页的位置随之浮出来。',
      '执事问他还要拖多久，沈砚听见纸页摩擦声，肩背绷紧，却只把账本往前推了半寸。',
      '这一动之后，屋里静下来。他盯着转账单的尾号，确认对方昨夜只付了一块钱。',
      '“你现在还要我签吗？”',
      '执事没有答，门外却有人敲了三下，下一节必须接这张转账单背后的签收印章。',
    ].join('\n')
    const paddedText = [
      '他不知道的是，所有人都已经看穿了一切。',
      '如果她知道真相，她一定会很悲伤，他也很愤怒、很委屈、很难过。',
      '蓝晶是旧王朝留下来的记忆器，源于三百年前的祭司制度，分为七阶九品，后续再解释具体用法。',
      '大厅很宽，墙壁很旧，风从窗外吹进来，空气显得十分压抑。',
      '他想了很多很多，觉得命运就是这样，大家都在等待事情结束。',
    ].join('\n')

    const okReport = buildProseCraftSyncReport(project, chapter, contextPackage, craftedText)
    const warnReport = buildProseCraftSyncReport(project, chapter, contextPackage, paddedText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('正文工艺 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['深度限知', '身体细节', '三维度揉进', '道具/数字功能', '小节结构', '小节密度', '新概念锚点']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('正文工艺缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['深度限知', '身体细节', '小节结构', '新概念锚点', '正文工艺毒点']))
    expect(warnReport.missed.find((item: any) => item.key === 'section_structure_rules')?.repair_instruction).toContain('主事件')
    expect(warnReport.missed.find((item: any) => item.key === 'section_structure_rules')?.repair_instruction).toContain('下一节开头快速接续')
    expect(warnReport.missed.find((item: any) => item.key === 'concept_anchor_rules')?.repair_instruction).toContain('动作反应')
    expect(warnReport.next_actions.join('；')).toContain('身体细节')
    expect(warnReport.next_actions.join('；')).toContain('小节结构')
    expect(warnReport.next_actions.join('；')).toContain('新概念')
  })

  test('story state sync persists a prose_craft_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'prose_craft_sync', payloadKey: 'prose_craft_sync'")
    expect(source).toContain('buildProseCraftSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.prose_craft_sync = proseCraftSync')
  })

  test('checks punctuation tone contract delivery after chapter text is written', () => {
    const project = { title: '旧城账册' }
    const chapter = { id: 17, chapter_no: 17, title: '签收印' }
    const contextPackage = {
      chapter_target: {
        punctuation_tone_contract: {
          version: 'oh_story_punctuation_tone_v1',
          source: 'manual',
          tone_punctuation_map: [
            '质问 / 试探 / 反问：关键问题用问号和短促追问片段，配合动作停顿。',
            '惊讶 / 爆发 / 打脸：真正爆点只保留少量感叹号，爆点前后用短句承接。',
            '压迫 / 冷静 / 克制：用短句、逗号、句号或冒号压出判断落点。',
          ],
          forbidden_marks: ['不得使用 ……、...、——、—、-- 硬造停顿。'],
          scene_tone_plan: [
            '场景1：质问 / 试探 / 反问；签收印真假用短促追问推进。',
            '场景2：惊讶 / 爆发 / 打脸；爆点只保留一次功能性感叹。',
          ],
          quality_checks: ['标点必须服务语气、人物声线和情绪节奏，不能通篇句号化。'],
        },
      },
    }
    const tunedText = [
      '执事按住签收印：“你凭什么说它是真的？”',
      '沈砚把账本翻到尾页，停了一拍：“印泥缺口在这里。昨夜谁碰过柜门？”',
      '对方脸色一沉。',
      '第二份名单摊开时，长老席有人站了起来：“这枚印，是真的！”',
      '沈砚没有追喊。他只把一块钱转账单压在印章旁边：欠款、签收、尾号，全对上了。',
      '屋里静了三息。',
    ].join('\n')
    const noisyText = [
      '执事按住签收印……你凭什么说它是真的——',
      '沈砚想解释很多很多。',
      '众人震惊！！！？？',
      '他很冷静。',
      '他看着账本。',
      '他继续等待。',
      '他觉得事情会结束。',
      '他最后点了点头。',
      '大家都没有再说话。',
      '夜色很深。',
    ].join('\n')

    const okReport = buildPunctuationToneSyncReport(project, chapter, contextPackage, tunedText)
    const warnReport = buildPunctuationToneSyncReport(project, chapter, contextPackage, noisyText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('语气标点 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['语气谱系', '禁用标点', '功能性问号', '爆点标点']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('语气标点缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['禁用标点', '语气标点硬伤']))
    expect(warnReport.next_actions.join('；')).toContain('动作停顿')
  })

  test('story state sync persists a punctuation_tone_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'punctuation_tone_sync', payloadKey: 'punctuation_tone_sync'")
    expect(source).toContain('buildPunctuationToneSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.punctuation_tone_sync = punctuationToneSync')
  })

  test('checks quality audit contract delivery after chapter text is written', () => {
    const project = { title: '长夜账本' }
    const chapter = { id: 18, chapter_no: 18, title: '第二份证据' }
    const okContextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '第二份证据',
        summary: '主角放出第二份证据，让反派第一次失去主动。',
        conflict: '反派试图用新设定解释旧账本，主角必须证明这不是水剧情而是局势变化。',
        ending_hook: '最后一页账本指向第三个证人。',
        quality_audit_contract: {
          version: 'oh_story_quality_audit_v1',
          source: 'manual',
          structure_checks: ['章节结构：开头有钩子，中段有推进，局势有变化，结尾落在变化上而不是总结。'],
          chapter_purpose_rules: ['每章一句话概括内容，并标注目的词：铺垫/高潮/爽点/打脸/人物塑造/设定。'],
          progression_checks: ['水文检测：删掉这章会影响理解吗？不会就是水了。'],
          information_checks: ['信息必须跟着冲突走，一章不超 3 个新概念。'],
          event_content_rules: ['事件驱动：正文章节必须由事件组成，事件内容比重不能小于一半；事件是价值改变的契机；设定尽量通过事件演绎，而非旁白强塞。'],
          longform_checks: ['最近 5 章是否有明确进展，爽点间隔是否过长。'],
          five_dimension_rubric: ['五维评分必须都达到 78：核心一致度、表层重写度、格式一致度、可读性、逻辑连贯。'],
          selling_point_expression_rules: ['卖点表达：发现比告知爽十倍；用剧情、对话、反应隐性展示；按开头暗示 -> 中间深化 -> 高潮爆发递进。'],
          chapter_focus: ['本章核心事件：第二份证据改变局势', '章尾必须落在第三个证人翻页钩子'],
          revision_strategies: ['rewrite', 'compress', 'de_ai', 'polish'],
          quality_checks: ['必须确认本章不可删除，且最低分维度有精修策略。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '证据开场',
            purpose: '开头有钩子并推进核心事件。',
            conflict: '反派抢先宣布账本无效。',
            reader_payoff: '第二份证据改变局势。',
          },
        ],
      },
      setting_context: {
        chapter_usage: [
          { name: '血契账本', usage_type: 'introduce', summary: '本章唯一新增概念。' },
        ],
      },
    }
    const warnContextPackage = {
      ...okContextPackage,
      setting_context: {
        chapter_usage: [
          { name: '镜州旧印', usage_type: 'introduce' },
          { name: '血契账本', usage_type: 'new_concept' },
          { name: '盐商暗码', status: '首次引入' },
          { name: '夜巡司令牌', is_new: true },
        ],
      },
    }
    const auditedText = [
      '账本第二页翻开时，沈砚先把第一份证据压在灯下：反派昨夜说过的尾号，和新账页完全对不上。',
      '反派抢先宣布账本无效，沈砚没有解释设定，只让账房当场核对血契账本的红印。',
      '开头只暗示血契账本和尾号对不上，中段借账房的迟疑和反派的追问深化卖点，高潮时旁观者看见红印变黑才同时倒吸一口气。',
      '本章一句话目的：第二份证据把审判从旧账争辩推到第三证人线索；目的词是打脸和爽点，证据核对详写，铺垫只保留少量功能信息。',
      '旁观者开始倒向主角，局势变化很清楚：反派从主动指控变成必须解释旧账本来源。',
      '本章事件含量超过一半：翻账、逼问、核对、改口、撕页五个事件连续改变现场价值，设定都通过证据核对和旁观反应演绎出来。',
      '这章删掉会影响理解，因为第二份证据让主线从真假账本推进到第三个证人的身份。',
      '章尾落在具体翻页钩子上：最后一页账本指向第三个证人，证人名字正好被撕掉一半。',
      '五维自检：核心一致度、表层重写度、格式一致度、可读性、逻辑连贯都超过78；最低分用 polish 修句间衔接。',
    ].join('\n')
    const wateryText = [
      '清晨的阳光落在长街上，风吹过屋檐，空气显得十分安静。',
      '这座城有很多年的历史，镜州旧印、血契账本、盐商暗码、夜巡司令牌都有复杂来历。',
      '本章核心卖点很爽，读者会很喜欢这个设定，这是本章爽点。',
      '关于这些设定，前文已经说过很多，本章只是再次回顾它们的意义和背景。',
      '大家坐着等了很久，反派没有失去主动，主角也没有拿出新证据。',
      '事情暂时没有变化。',
    ].join('\n')

    const okReport = buildQualityAuditSyncReport(project, chapter, okContextPackage, auditedText)
    const warnReport = buildQualityAuditSyncReport(project, chapter, warnContextPackage, wateryText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('质量诊断 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['章节结构', '章纲目的词', '章节推进', '信息负载', '事件含量', '五维底线', '卖点表达']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('质量诊断缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['章节结构', '章纲目的词', '章节推进', '事件含量', '卖点表达', '质量诊断硬伤']))
    expect(warnReport.missed.find((item: any) => item.key === 'event_content_rules')?.repair_instruction).toContain('事件内容比重')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('selling_point_expression_rules')
    expect(warnReport.next_actions.join('；')).toContain('水文')
    expect(warnReport.next_actions.join('；')).toContain('事件')
    expect(warnReport.next_actions.join('；')).toContain('目的词')
    expect(warnReport.next_actions.join('；')).toContain('卖点')
  })

  test('story state sync persists a quality_audit_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'quality_audit_sync', payloadKey: 'quality_audit_sync'")
    expect(source).toContain('buildQualityAuditSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.quality_audit_sync = qualityAuditSync')
  })

  test('checks dialogue contract delivery after chapter text is written', () => {
    const project = { title: '反证长篇' }
    const chapter = { id: 19, chapter_no: 19, title: '当众试探' }
    const contextPackage = {
      chapter_target: {
        dialogue_contract: {
          version: 'oh_story_dialogue_contract_v1',
          source: 'manual',
          scene_modes: ['反转模式', '压制模式'],
          voice_anchors: ['李玄短句反问；周薄森长篇压迫；林青禾克制给事实。'],
          dialogue_goals: ['让周薄森说漏证据来源。'],
          key_lines: ['“你怎么知道账本在我手里？”'],
          relationship_moves: ['旁观者从中立转为愿意作证。'],
          mode_playbooks: ['反转模式：对方嚣张 2-3 行 -> 主角亮出 1 行事实 -> 对方沉默。'],
          power_length_rules: ['掌控者/主角亮底牌时对白 ≤ 10 字', '被压制方对白 ≥ 20 字'],
          subtext_agenda_rules: ['真实动机绝对不能浅显地写在台词里，台词只露出借口、试探或防御。'],
          dialogue_drive_rules: ['对话本身带来/强化期待、爽感或悬念。'],
          information_embed_rules: ['用角色的语气和立场包裹信息，避免说明书式对话。'],
          voice_differentiation_rules: ['口癖、节奏、信息偏好和身份措辞必须不同。'],
          dialogue_rhythm_rules: ['连续多轮对话后需要换气，穿插动作描写。'],
          dialogue_audit_rules: ['遮住角色名后能否区分是谁在说话。'],
          quality_checks: ['每句对白至少承担推进剧情、增加期待感或展示人设之一。'],
        },
      },
    }
    const dialogueText = [
      '周薄森把袖口往案上一压。',
      '“李玄，你若真要当众翻旧账，就先说清楚昨夜谁把账本送进祠堂。别拿一句怀疑糊弄长老席，周家不是任你泼脏水的地方。”',
      '李玄看着他袖口的墨点。',
      '“你怎么知道账本在我手里？”',
      '周薄森顿住。',
      '林青禾把封条递给长老。',
      '“封口是今晨开的。”',
      '旁观者的低声议论停了，原本站在周薄森身后的人退开半步。',
      '李玄只补了一句。',
      '“说漏了。”',
    ].join('\n')
    const badText = [
      '“你知道吗，血契账本是一种非常复杂的设定，它的来源、规则、使用方法和历史背景都很长，所以我现在要完整解释给你听。”',
      '“好的，那么请你告诉我血契账本是什么？”',
      '“血契账本就是用血验证身份的账本，这意味着它可以证明谁拿过账本。”',
      '“原来如此，那么你为什么要这样做？”',
      '“因为我的真实目的就是进门拿账本，我没有别的借口。”',
      '“你说得太好了，你真厉害。”',
    ].join('\n')

    const okReport = buildDialogueSyncReport(project, chapter, contextPackage, dialogueText)
    const warnReport = buildDialogueSyncReport(project, chapter, contextPackage, badText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('对白质量 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['对白目标', '权力博弈', '潜台词与议程', '对白驱动力', '信息嵌入', '对话审计', '声线差异']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('对白缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['潜台词与议程', '对白驱动力', '信息嵌入', '对话审计', '对白硬伤']))
    expect(warnReport.missed.find((item: any) => item.key === 'dialogue_drive_rules')?.repair_instruction).toContain('推进剧情、增加期待感或展示人设')
    expect(warnReport.missed.find((item: any) => item.key === 'information_embed_rules')?.repair_instruction).toContain('科普嘴')
    expect(warnReport.missed.find((item: any) => item.key === 'dialogue_audit_rules')?.repair_instruction).toContain('对话结尾')
    expect(warnReport.next_actions.join('；')).toContain('说明书式对白')
  })

  test('flags dialogue blocks that can be deleted without losing plot expectation or characterization', () => {
    const project = { title: '反证长篇' }
    const chapter = { id: 1901, chapter_no: 19, title: '空转寒暄' }
    const contextPackage = {
      chapter_target: {
        dialogue_contract: {
          version: 'oh_story_dialogue_contract_v1',
          dialogue_drive_rules: ['每句对白至少承担推进剧情、增加期待感或展示人设之一，否则删除。'],
          dialogue_audit_rules: ['删掉这段对话后，情节、期待和情绪都不受影响，则判定为水字数。'],
        },
      },
    }
    const fillerText = [
      '“你来了。”',
      '“嗯，我来了。”',
      '“今天辛苦了。”',
      '“还好，不算辛苦。”',
      '“那我们继续吧。”',
      '“好，继续。”',
      '“你真的很厉害。”',
      '“哪里哪里。”',
      '两人说完，事情没有新变化，也没有任何线索、行动、悬念或关系变化。',
    ].join('\n')
    const functionalText = [
      '周薄森把空白封条拍到桌上。',
      '“昨夜送账本的人，左袖有墨。”',
      '李玄没有接话，只把第二份账册翻到缺页。',
      '“你怎么知道是左袖？”',
      '周薄森的手指僵住。',
      '林青禾退到长老身侧。',
      '“我作证，他刚才说漏了。”',
      '原本站在周薄森身后的人退开半步。',
    ].join('\n')

    const fillerReport = buildDialogueSyncReport(project, chapter, contextPackage, fillerText)
    const functionalReport = buildDialogueSyncReport(project, chapter, contextPackage, functionalText)

    expect(fillerReport.status).toBe('warn')
    expect(fillerReport.missed.map((item: any) => item.label)).toContain('可删除对白')
    expect(fillerReport.missed.find((item: any) => item.key === 'dialogue_functional_filler')?.repair_instruction).toContain('删掉这段对话')
    expect(fillerReport.priority_repair).toBe('优先删可删除对白')
    expect(functionalReport.missed.map((item: any) => item.label)).not.toContain('可删除对白')
  })

  test('flags meme jokes that break high pressure dialogue beats', () => {
    const project = { title: '禁门账本' }
    const chapter = { id: 1902, chapter_no: 19, title: '血封条' }
    const contextPackage = {
      chapter_target: {
        dialogue_contract: {
          version: 'oh_story_dialogue_contract_v1',
          dialogue_meme_rules: ['高压/生死/悲痛/严肃 beat 里，搞笑担当与轻快配角的玩笑、口头梗、插科打诨一律收敛。'],
          quality_checks: ['这句玩笑放进当前基调会不会让读者出戏？会就删/改。'],
        },
      },
    }
    const badText = [
      '血从封条下渗出来，周薄森的护卫倒在门槛边，呼吸只剩半截。',
      '“笑死，这也太会整活了吧，咱们今天算不算大型翻车现场？”',
      '李玄按住伤口，脸色沉下去。',
    ].join('\n')
    const restrainedText = [
      '血从封条下渗出来，周薄森的护卫倒在门槛边，呼吸只剩半截。',
      '“别说话。”',
      '李玄按住伤口，声音压得很低。',
      '“先封门。”',
    ].join('\n')

    const badReport = buildDialogueSyncReport(project, chapter, contextPackage, badText)
    const okReport = buildDialogueSyncReport(project, chapter, contextPackage, restrainedText)
    const forbidden = badReport.missed.find((item: any) => item.key === 'dialogue_forbidden')

    expect(forbidden?.missed_items || []).toContain('高压玩梗扫描')
    expect(forbidden?.repair_instruction).toContain('梗只在安全或喘息 beat 放')
    expect(okReport.missed.find((item: any) => item.key === 'dialogue_forbidden')?.missed_items || []).not.toContain('高压玩梗扫描')
  })

  test('flags joke delivery that is detached from character desire relationship or consequence', () => {
    const project = { title: '禁门账本' }
    const chapter = { id: 1903, chapter_no: 19, title: '账本笑点' }
    const contextPackage = {
      chapter_target: {
        dialogue_contract: {
          version: 'oh_story_dialogue_contract_v1',
          dialogue_meme_rules: ['幽默来自角色的欲望/偏见/固执/误判，不是脱离剧情的段子。'],
          quality_checks: ['包袱改变地位、暴露关系、制造未来代价。'],
        },
      },
    }
    const badText = [
      '李玄和林青禾正准备查账。',
      '“我给你讲个和剧情无关的段子，保证大家都笑死，哈哈。”',
      '他说完以后，账本、关系和下一步行动都没有任何变化。',
    ].join('\n')
    const functionalText = [
      '李玄想装作没看见账本缺页，手却先把封条压歪了。',
      '林青禾看着他的手。',
      '“你这叫冷静？账本都被你按出指纹了。”',
      '旁边的执事憋住笑，随即意识到封条被碰过，立刻改口愿意作证。',
      '李玄欠了林青禾一个人情，下一场审问必须先替她挡住会长。',
    ].join('\n')

    const badReport = buildDialogueSyncReport(project, chapter, contextPackage, badText)
    const okReport = buildDialogueSyncReport(project, chapter, contextPackage, functionalText)
    const forbidden = badReport.missed.find((item: any) => item.key === 'dialogue_forbidden')

    expect(forbidden?.missed_items || []).toContain('脱剧情段子扫描')
    expect(forbidden?.repair_instruction).toContain('幽默来自角色欲望、偏见、固执或误判')
    expect(okReport.missed.find((item: any) => item.key === 'dialogue_forbidden')?.missed_items || []).not.toContain('脱剧情段子扫描')
  })

  test('flags humor callbacks that repeat without escalating embarrassment publicity or consequence', () => {
    const project = { title: '禁门账本' }
    const chapter = { id: 1904, chapter_no: 19, title: '回调封条' }
    const contextPackage = {
      chapter_target: {
        dialogue_contract: {
          version: 'oh_story_dialogue_contract_v1',
          dialogue_meme_rules: ['回调必须升级：更尴尬、更公开、更严重。'],
          quality_checks: ['同一个梗回调时，必须带来更强的处境、关系或代价。'],
        },
      },
    }
    const flatText = [
      '上一场林青禾说李玄按歪封条很好笑。',
      '这一场她又把同一个梗重复了一遍，说法和上次一样，没有更尴尬、没有更公开，也没有更严重的后果。',
      '众人听完只是笑了一下，账本审问继续原样推进。',
    ].join('\n')
    const upgradedText = [
      '上一场林青禾说李玄按歪封条很好笑。',
      '这一场她没再重复笑话，只把封条举给满堂长老看。',
      '“这回不是按歪，是按出了会长的指纹。”',
      '笑声停住，周薄森当众失去解释权，李玄也因此欠下林青禾一次公开作证的人情。',
    ].join('\n')

    const flatReport = buildDialogueSyncReport(project, chapter, contextPackage, flatText)
    const upgradedReport = buildDialogueSyncReport(project, chapter, contextPackage, upgradedText)
    const forbidden = flatReport.missed.find((item: any) => item.key === 'dialogue_forbidden')

    expect(forbidden?.missed_items || []).toContain('回调未升级扫描')
    expect(forbidden?.repair_instruction).toContain('回调必须升级')
    expect(upgradedReport.missed.find((item: any) => item.key === 'dialogue_forbidden')?.missed_items || []).not.toContain('回调未升级扫描')
  })

  test('flags humor payoffs that land without aftermath reaction or consequence', () => {
    const project = { title: '禁门账本' }
    const chapter = { id: 1905, chapter_no: 19, title: '空包袱' }
    const contextPackage = {
      chapter_target: {
        dialogue_contract: {
          version: 'oh_story_dialogue_contract_v1',
          dialogue_meme_rules: ['铺垫要短，回报要清晰，余波比包袱本身更重要。'],
          quality_checks: ['包袱改变地位、暴露关系、制造未来代价。'],
        },
      },
    }
    const hollowText = [
      '李玄想装得很稳，袖口却把封条蹭歪。',
      '林青禾看了一眼。',
      '“你这不叫冷静，这叫翻车现场。”',
      '众人只是笑了一下，审问继续原样推进，没有关系变化，也没有后续代价。',
    ].join('\n')
    const aftermathText = [
      '李玄想装得很稳，袖口却把封条蹭歪。',
      '林青禾看了一眼。',
      '“你这不叫冷静，这叫翻车现场。”',
      '笑声刚起就停住，执事发现封条上的指纹，当场改口作证。',
      '李玄欠下林青禾一个公开人情，下一场审问必须替她挡住会长。',
    ].join('\n')

    const hollowReport = buildDialogueSyncReport(project, chapter, contextPackage, hollowText)
    const aftermathReport = buildDialogueSyncReport(project, chapter, contextPackage, aftermathText)
    const forbidden = hollowReport.missed.find((item: any) => item.key === 'dialogue_forbidden')

    expect(forbidden?.missed_items || []).toContain('包袱无余波扫描')
    expect(forbidden?.repair_instruction).toContain('余波比包袱本身更重要')
    expect(aftermathReport.missed.find((item: any) => item.key === 'dialogue_forbidden')?.missed_items || []).not.toContain('包袱无余波扫描')
  })

  test('warns when one scene gives dialogue to more than three supporting characters', () => {
    const project = { title: '反证长篇' }
    const chapter = { id: 191, chapter_no: 19, title: '当众试探' }
    const contextPackage = {
      chapter_target: {
        protagonist_name: '李玄',
        scene_cards: [
          {
            scene_no: 1,
            title: '公开试探',
            characters_present: ['李玄', '周薄森', '林青禾', '钱越', '赵执事', '宋管事'],
          },
        ],
        dialogue_contract: {
          version: 'oh_story_dialogue_contract_v1',
          source: 'manual',
          supporting_speaker_limit_rules: [
            '同一场景配角不超过 3 个有台词；没有功能的角色不要出场。',
          ],
          quality_checks: ['检查配角台词人数，避免多人同场抢主线。'],
        },
      },
    }
    const okText = [
      '李玄：“够了。”',
      '周薄森：“李玄，你若真要当众翻旧账，就先说清楚昨夜谁把账本送进祠堂。”',
      '林青禾：“封口是今晨开的。”',
      '钱越：“我只看见一盏灯。”',
      '李玄：“说漏了。”',
    ].join('\n')
    const crowdedText = [
      '李玄：“够了。”',
      '周薄森：“李玄，你若真要当众翻旧账，就先说清楚昨夜谁把账本送进祠堂。”',
      '林青禾：“封口是今晨开的。”',
      '钱越：“我只看见一盏灯。”',
      '赵执事：“我能证明他进过后院。”',
      '宋管事：“我也听见了更夫报时。”',
      '李玄：“说漏了。”',
    ].join('\n')

    const okReport = buildDialogueSyncReport(project, chapter, contextPackage, okText)
    const warnReport = buildDialogueSyncReport(project, chapter, contextPackage, crowdedText)

    expect(okReport.delivered.map((item: any) => item.key)).toContain('supporting_speaker_limit_rules')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('配角台词人数')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('supporting_speaker_limit_rules')
    expect(warnReport.priority_repair).toContain('配角台词人数')
    expect(warnReport.next_actions.join('；')).toContain('同一场景最多保留 3 个配角发言')
  })

  test('story state sync persists a dialogue_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'dialogue_sync', payloadKey: 'dialogue_sync'")
    expect(source).toContain('buildDialogueSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.dialogue_sync = dialogueSync')
  })

  test('checks character behavior contract delivery after chapter text is written', () => {
    const project = { title: '反证长篇' }
    const chapter = { id: 20, chapter_no: 20, title: '当堂反问' }
    const contextPackage = {
      chapter_target: {
        character_behavior_contract: {
          version: 'oh_story_character_behavior_v1',
          source: 'manual',
          motivation_chain: [
            '起因：周薄森抢先把伪账本压到长老席上。',
            '意图：李玄必须保住证据来源并逼周薄森说漏。',
            '约束：李玄不能直接暴露林青禾的证人身份。',
            '风险：若反问失败，旁观者会重新倒向周薄森。',
          ],
          motivation_specificity_rules: [
            '起因必须具体，不写“被欺负”这种模糊说法；动机必须是情感层面的，不写“要成为最强”这种空话。',
          ],
          layered_tags: [
            '身份标签：被逐出宗祠的账房学徒。',
            '表现标签：克制、短句、先看证据再说话。',
            '内核标签：对证据归属寸步不让。',
          ],
          behavior_rules: ['展示优于告知：态度、弱点和成长必须通过行动/对话/反应体现。'],
          protagonist_composure_rules: [
            '升级线与主角反应线分开管理：升级提升的是实力，不自动改变主角从容反应。',
            '面对低级挑衅时，主角应表现为不被牵着走；高实力/高阅历角色用轻描淡写、短句或行动压制回应。',
          ],
          strong_association_rules: [
            '人设关联分层：每个重要角色至少 3 个强关联设定。',
            '强关联必须直接影响剧情走向、核心梗、装逼爽点或人物碰撞。',
            '弱关联如外貌、爱好、身高体重只能做记忆点，不能喧宾夺主。',
          ],
          memory_anchors: ['李玄习惯先按住旧夹克袖口，再用短句反问。'],
          supporting_role_functions: ['林青禾：只给事实证据，不替主角解释。'],
          role_card_requirements: [
            '主角卡必须包含角色定位、身份标签、外貌特征、核心目标、核心动机、致命弱点、口头禅/标志动作。',
          ],
          supporting_role_exit_rules: [
            '配角卡必须包含角色功能、与主角关系、核心特质、标志性特征、退场方式；同一场景配角不超过 3 个有台词。',
          ],
          behavior_repeat_rules: [
            '人物行为重复点：抓住读者喜欢的人物行为特质，并在不同场景重复。',
          ],
          character_driven_event_rules: [
            '人推事件优先：情节从人物性格、动机和选择自然推出；卡文时从人物动机找方向，不要硬编剧情。',
          ],
          protagonist_red_line_rules: [
            '主角红线：不能写圣母型主角、无脑战斗机器、内核邪恶、因蠢/圣母犯错、自暴自弃。',
          ],
          identity_goldfinger_alignment_rules: [
            '主角人设必须与全书气质相符：社会身份、身世、金手指、性格高度统一。',
          ],
          antagonist_logic: ['周薄森为了保住账本来源，必须先用身份压人再转移证据焦点。'],
          antagonist_weight_rules: [
            '反派建立四要素：实力展示、动机可信、真实威胁、终极意图时机缺一不可。',
            '反派的智商/实力决定主角的含金量；反派弱，主角赢没意义。',
            '中等反派及以上必须至少赢主角一次，或在本章造成真实威胁。',
            '反派真实目的不要开场说尽，终极意图留到关键反转点。',
            '反派是主角的镜子，长处要照出主角弱点。',
          ],
          antagonist_self_story_rules: [
            '反派也有梦想：在反派眼中他是自己故事的主人公。',
            '反派要有自己的目标、旧痛和避免的痛苦，不能只是纯工具人。',
            '反派的优势本身也是致命缺陷，遭遇逆境时会强化缺陷。',
            '大弧 Boss 要有让读者恨不起来的侧面，并和主角形成理念冲突。',
          ],
          antagonist_tier_exit_rules: [
            '按反派层级表设计，篇幅与层级匹配。',
            '小反派 1-5 章，只承担单个小弧线障碍，1-2 个鲜明特征，退场要被打败或揭穿、干脆利落。',
            '中等反派 10-30 章，是一卷主要对手，必须有动机、手段、至少赢主角一次，退场要被主角正面击败并有爽感。',
            '大弧 Boss 代表阶段核心矛盾，要有完整人弧、理念冲突、绝境对决、让人恨不起来的侧面和有仪式感的终战落幕。',
            '最终 Boss 是全书核心矛盾具象化，必须从第一章伏笔，代表主题反面，实力碾压且有信念。',
          ],
          quality_checks: ['角色行为必须由动机链驱动。'],
        },
      },
    }
    const behaviorText = [
      '周薄森抢先把伪账本压到长老席上，李玄先按住旧夹克袖口，没有立刻看林青禾。',
      '他想保住证据来源，也要逼周薄森说漏账本来路；可他不能直接暴露林青禾的证人身份。',
      '李玄只抬眼问了一句：“你怎么知道账本在我手里？”',
      '旁观者原本要倒向周薄森，听见这句短问后停住。',
      '反派学徒低声骂他废物，李玄没有被这句低级挑衅牵着走，只轻描淡写地把封条推到灯下：“看字。”',
      '这次旧印升级只提升他的验印能力，没有改变他的从容反应；他的压制来自短句和动作，而不是暴怒反击。',
      '林青禾没有替他解释，只把今晨开的封条放到案边。',
      '林青禾的配角功能是事实证人，与李玄是互相保密的同盟；她的核心特质是谨慎，标志性特征是只递证据不解释，退场方式已规划为封条作证完成后主动退到旁听席。',
      '周薄森为了保住账本来源，先用长老席身份压人，又急着转移证据焦点，反倒露出昨夜进祠堂的破绽。',
      '周薄森先亮出长老席背书和账房封锁令，展示实力和手段；他想保住账本来源，这个动机从他的视角说得通。',
      '他没有立刻说出终极意图，只用资格封锁和证据反咬压住李玄一次，让李玄短暂失去主动。',
      '周薄森擅长借规则压人，正好照出李玄面对权威时习惯退让的弱点。',
      '周薄森不是只想害李玄；在他眼中，自己才是守住宗祠账权的主人公。',
      '他当年被旧账牵连失去师门，所以宁可用规则压人，也要避免再次被证据拖下水；这种守规则的长处正是他的致命缺陷。',
      '他还有给病重幼妹保住药账的侧面，让人恨不起来一点；但他相信秩序必须压过个人证词，和李玄的证据公道形成理念冲突。',
      '李玄不是因为被欺负才反问；具体起因是母亲旧铺的账权在众目睽睽下被伪账本夺走，他要保住母亲留下的证据和林青禾的安全。',
      '这个动机是羞辱、亲情和亏欠压出来的情感驱动，不是“要成为最强”这种空话；他后续从隐忍到公开反问，也有封条递上案边作为铺垫。',
      '李玄的人设强关联有三条：第一是账房审证能力，能直接拆伪账本；第二是母亲旧铺的人脉，能调动林青禾作证；第三是旧夹克里的录音证据，能制造当堂反转和装逼爽点。',
      '这些强关联都影响剧情走向和人物碰撞，不只是身高、外貌、爱吃甜糕这种弱关联爱好。',
      '李玄的角色定位是落魄账房证人，身份标签是被逐出宗祠的账房学徒；外貌特征是瘦高、旧夹克、左手有疤，核心目标是夺回母亲旧铺，核心动机是守住亲情和尊严，致命弱点是面对权威先藏招，口头禅和标志动作是按住旧夹克袖口后短句反问。',
      '他每到关键选择都会先按住旧夹克袖口，这个行为重复点在开场藏证据、中段推封条、章尾反问前重复出现。',
      '这场不是外部事件硬砸他，而是李玄保住母亲旧铺和林青禾安全的动机，把当堂反问自然推出来；情节坚持人推事件，不靠作者硬编剧情。',
      '他没有触碰主角红线：不圣母、不无脑战斗机器、不内核邪恶、不因蠢犯错、不自暴自弃。',
      '他的显性身份是落魄账房学徒，隐性身世连到母亲旧铺账权，显性金手指是验印能力，隐性金手指是克制短句，社会身份、身世、金手指、性格高度统一。',
      '这场戏按反派层级表定位为中等反派阶段：周薄森是一卷主要对手，靠账房资源和长老席权谋连续施压。',
      '他已经短暂赢主角一次，后续退场规划是被李玄用证据链正面击败，揭穿账权骗局并给读者爽感。',
    ].join('\n')
    const badText = [
      '李玄忽然性格大变，什么也没想就冲上去大喊。',
      '他刚刚升级成功，被反派学徒骂了一句废物，立刻气得要死，面红耳赤地暴怒反击，被这个低级挑衅牵着走。',
      '他的起因就是被欺负，动机就是要成为最强，后面又毫无铺垫地变成只想回家。',
      '他的人设很复杂，也很聪明，大家都知道他不会犯错。',
      '他只有身高、外貌、爱吃甜糕和喜欢黑衣这些弱关联爱好，没有任何能影响剧情走向的强关联。',
      '林青禾只在旁边说：“你太厉害了。”',
      '周薄森明明可以销毁账本，却站在原地嘲讽，主动把秘密告诉所有人。',
      '反派很弱，只是纯粹的坏，赢了也没意义。',
      '他开场就把真实目的主动说完，然后降智送赢。',
      '周薄森只是纯工具人，只负责阻碍主角，没有原因，也没有自己的目标。',
      '他是脸谱化疯子怪物，只是纯粹的坏。',
      '反派层级和篇幅不匹配，小反派拖成三十章，大弧 Boss 像路人一样随便退场。',
      '最终 Boss 没有第一章伏笔，也没有信念，只是突然冒出来的怪物。',
      '配角退场方式没有规划，写着写着忘了，五个配角一直发言。',
      '他没有行为重复点，口头禅和标志动作写着写着忘了。',
      '剧情需要一个外部事件突然砸来，和他的动机无关；作者硬编剧情让事情自己解决。',
      '他是圣母型主角，明知道对方会害人仍因蠢犯错原谅反派，后来又自暴自弃。',
      '他开场职业是账房，突然靠毫无铺垫的战神系统横扫所有人，社会身份、身世、金手指、性格完全不统一。',
      '事情很快解决，旁观者都觉得主角做得对。',
    ].join('\n')

    const okReport = buildCharacterBehaviorSyncReport(project, chapter, contextPackage, behaviorText)
    const warnReport = buildCharacterBehaviorSyncReport(project, chapter, contextPackage, badText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('角色行为 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['动机链', '动机具体性', '行为规则', '主角逼格反应', '人设强关联', '记忆锚点', '配角功能', '角色卡必备项', '配角退场规划', '行为重复点', '人推事件', '主角红线', '身份/金手指对齐', '反派逻辑', '反派分量', '反派自我叙事', '反派层级退场']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('角色行为缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['动机链', '动机具体性', '主角逼格反应', '人设强关联', '配角退场规划', '行为重复点', '人推事件', '主角红线', '身份/金手指对齐', '反派逻辑', '反派分量', '反派自我叙事', '反派层级退场', '角色行为硬伤']))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('protagonist_composure_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('strong_association_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('motivation_specificity_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('antagonist_weight_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('antagonist_self_story_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('antagonist_tier_exit_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('supporting_role_exit_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('behavior_repeat_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('character_driven_event_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('protagonist_red_line_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('identity_goldfinger_alignment_rules')
    expect(warnReport.next_actions.join('；')).toContain('强关联')
    expect(warnReport.next_actions.join('；')).toContain('动机链')
    expect(warnReport.next_actions.join('；')).toContain('起因具体')
    expect(warnReport.next_actions.join('；')).toContain('低级挑衅')
    expect(warnReport.next_actions.join('；')).toMatch(/反派分量|真实威胁/)
    expect(warnReport.next_actions.join('；')).toMatch(/反派自我叙事|自己的故事/)
    expect(warnReport.next_actions.join('；')).toMatch(/反派层级|退场/)
    expect(warnReport.next_actions.join('；')).toContain('人推事件')
    expect(warnReport.next_actions.join('；')).toContain('行为重复点')
  })

  test('story state sync persists a character_behavior_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'character_behavior_sync', payloadKey: 'character_behavior_sync'")
    expect(source).toContain('buildCharacterBehaviorSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.character_behavior_sync = characterBehaviorSync')
  })

  test('checks asset linkage contract delivery after chapter text is written', () => {
    const project = { title: '禁门账本' }
    const chapter = { id: 22, chapter_no: 22, title: '旧钥匙开缝' }
    const contextPackage = {
      chapter_target: {
        asset_linkage_contract: {
          version: 'oh_story_asset_linkage_v1',
          source: 'manual',
          key_assets: ['旧钥匙：祠堂禁门信物', '禁门规则：血契封条触发暗格'],
          linkage_plan: [
            '旧钥匙从信物变成证据，打开祠堂地砖暗格。',
            '禁门规则通过周薄森封口动作触发，逼出账本原件位置。',
          ],
          usage_rules: [
            '信息跟着冲突走：设定、物件、能力、势力必须通过事件、选择、阻碍或对话压力释放，不能整段说明。',
            '每个关键资产必须绑定功能、归属、触发条件、限制、后果。',
          ],
          state_tracking: ['旧钥匙归属从李玄私藏变成长老席见证，血契封条被触发后留下红印。'],
          three_appearance_plan: ['旧钥匙三次出现：袖口藏住，案上撞开暗格，章尾露出血契编号。'],
          forbidden_boundaries: ['不得提前揭露账本原件在地砖下。'],
          quality_checks: ['孤立资产检查：每个关键资产都必须与本章目标、冲突、回报或章尾钩子至少一项相连。'],
        },
      },
    }
    const linkedText = [
      '李玄把旧钥匙从袖口滑到掌心，先不解释它的来历，只让周薄森继续逼问证据来源。',
      '周薄森抢封祠堂禁门，血契封条被他按上去的一瞬间亮出红印，禁门规则在冲突里触发。',
      '旧钥匙撞上案角，钥齿裂开的缺口正好卡进地砖暗缝，暗格被撬开半寸。',
      '长老席看见钥匙从李玄私藏变成当堂证据，旁观者的站位跟着改了。',
      '代价也落下：红印记住了开门人，李玄若带走钥匙，下一次禁门会直接锁死他。',
      '章尾，旧钥匙第三次出现，裂缝里露出的血契编号指向账本原件在祠堂地砖下。',
    ].join('\n')
    const isolatedText = [
      '旧钥匙很重要，它有很多复杂来历。',
      '禁门规则也很重要，血契封条、暗格、编号、祠堂地砖都有一整套设定。',
      '大家站在厅里说了很久，旧钥匙被反复提起，但没有人真的使用它。',
      '周薄森忽然承认账本原件在地砖下，事情就解决了。',
      '本章还顺便介绍了盐契暗码、夜巡司令牌、族谱黑页和禁门钟声。',
    ].join('\n')

    const okReport = buildAssetLinkageSyncReport(project, chapter, contextPackage, linkedText)
    const warnReport = buildAssetLinkageSyncReport(project, chapter, contextPackage, isolatedText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('资产挂钩 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['关键资产', '功能链', '状态变化', '贯穿道具', '信息随冲突']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('资产挂钩缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['功能链', '孤立资产', '资产挂钩硬伤']))
    expect(warnReport.next_actions.join('；')).toContain('孤立资产')
  })

  test('checks relationship graph risks after chapter text is written', () => {
    const project = { title: '禁门账本' }
    const chapter = { id: 24, chapter_no: 24, title: '血契编号' }
    const contextPackage = {
      chapter_target: {
        asset_linkage_contract: {
          version: 'oh_story_asset_linkage_v1',
          source: 'relationship_graph',
          relationship_graph_risks: [
            '旧钥匙(isolated_key_asset)：旧钥匙还没有和其他核心资产建立关系',
            '禁门规则(missing_owner)：缺少拥有者，无法判断由谁触发和承担代价',
          ],
          quality_checks: ['关系图诊断：不得让这些资产继续孤立、缺归属或悬空引用。'],
        },
      },
    }
    const linkedText = [
      '第一次，李玄把旧钥匙压进禁门锁眼，没有解释来历，只让周薄森继续逼问。',
      '钥齿触发禁门规则，血契封条亮起红印，规则的归属当场落到李玄手上。',
      '中段，旧钥匙和禁门规则连在一起：钥匙证明旧铺继承权，规则反过来锁死伪造账本的人，意义从信物变成当堂证据。',
      '代价也落下，李玄若拔走钥匙，下一次禁门会先锁住他的右手。',
      '结尾，旧钥匙第三次出现，裂开的钥齿露出血契编号，把下一章的账本原件钩出来。',
    ].join('\n')
    const isolatedText = [
      '旧钥匙很重要，禁门规则也很重要。',
      '大家都知道它们和关系图有关，但没有人使用旧钥匙，也没人说明禁门规则归谁触发。',
      '这些设定被反复提起，事情很快就解决了。',
    ].join('\n')

    const okReport = buildAssetLinkageSyncReport(project, chapter, contextPackage, linkedText)
    const warnReport = buildAssetLinkageSyncReport(project, chapter, contextPackage, isolatedText)

    expect(okReport.status).toBe('ok')
    expect(okReport.delivered.map((item: any) => item.label)).toContain('关系图风险')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('relationship_graph_risks')
    expect(warnReport.missed.map((item: any) => item.label)).toContain('关系图风险')
    expect(warnReport.next_actions.join('；')).toContain('关系图风险')
  })

  test('story state sync persists an asset_linkage_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'asset_linkage_sync', payloadKey: 'asset_linkage_sync'")
    expect(source).toContain('buildAssetLinkageSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.asset_linkage_sync = assetLinkageSync')
  })

  test('wires deterministic asset linkage hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicAssetLinkageChecks = [buildAssetLinkageDeterministicCheck(contextPackage, chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicAssetLinkageChecks')
  })

  test('checks state tracking contract delivery after chapter text is written', () => {
    const project = { title: '禁门账本' }
    const chapter = { id: 23, chapter_no: 23, title: '地砖原件' }
    const contextPackage = {
      chapter_target: {
        state_tracking_contract: {
          version: 'oh_story_state_tracking_v1',
          source: 'manual',
          character_states: [
            '李玄：左臂旧伤未愈，残阵只能维持三息，持有旧钥匙。',
            '林青禾：公开作证后被周家盯上，只能用封条事实说话。',
          ],
          historical_causality: [
            '上一章旧钥匙裂开缺口，指向祠堂地砖下的账本原件。',
            '第13章血契封条规则已经确认：红印会记录开门人。',
          ],
          world_constraints: [
            '禁门规则：血契封条被触发后三息内必须退出，否则禁门会锁死开门人。',
            '知识边界：李玄不知道账本原件最后一页的第二枚血契编号。',
          ],
          source_requirements: ['本章细纲/场景卡', '上一章正文或上一章承接', '追踪/角色状态.md', '追踪/伏笔.md', '追踪/时间线.md'],
          source_readiness: [
            { key: 'chapter_blueprint', label: '本章细纲', status: 'ready', evidence: '地砖原件场景卡已确认。' },
            { key: 'previous_chapter', label: '上一章正文', status: 'ready', evidence: '旧钥匙裂开缺口。' },
            { key: 'character_state', label: '角色状态', status: 'ready', evidence: '李玄左臂旧伤；林青禾公开作证。' },
            { key: 'world_constraints', label: '世界约束', status: 'ready', evidence: '禁门三息锁死规则。' },
          ],
          filter_rules: ['只保留如果不知道这个本章会写错的信息。'],
          quality_checks: ['角色状态、前史因果和世界约束必须在正文中可见承接。'],
        },
      },
    }
    const trackedText = [
      '李玄左臂旧伤还没好，抬起旧钥匙时手指明显慢了半拍。',
      '他记得上一章旧钥匙裂开的缺口，那道缺口正对祠堂地砖下的暗缝。',
      '林青禾公开作证后已经被周家盯上，所以她没有解释，只把封条事实放到长老席前。',
      '血契封条被触发，禁门规则开始计三息：三息内不退出，开门人会被锁死。',
      '李玄的残阵只能维持三息，他不知道账本原件最后一页还有第二枚血契编号，只能先撬开暗格。',
      '红印记住开门人，账本原件露出时，第二枚血契编号才在最后一页亮出来。',
    ].join('\n')
    const driftText = [
      '李玄左臂完全好了，残阵可以一直维持，他轻松把禁门推开。',
      '林青禾像从没作证一样站在人群外，没有被周家盯上。',
      '旧钥匙裂开的缺口没有任何影响，上一章发生了什么并不重要。',
      '禁门规则这次没有生效，李玄想待多久就待多久。',
      '他早就知道账本原件最后一页有第二枚血契编号。',
      '本章还介绍了祠堂三百年历史、十二支旁系、盐契制度和夜巡司完整来历。',
    ].join('\n')

    const okReport = buildStateTrackingSyncReport(project, chapter, contextPackage, trackedText)
    const warnReport = buildStateTrackingSyncReport(project, chapter, contextPackage, driftText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('状态跟踪 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['角色状态', '前史因果', '世界约束', '来源就绪']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('状态跟踪缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['角色状态', '世界约束', '状态跟踪硬伤']))
    expect(warnReport.next_actions.join('；')).toContain('状态')
  })

  test('story state sync persists a state_tracking_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'state_tracking_sync', payloadKey: 'state_tracking_sync'")
    expect(source).toContain('buildStateTrackingSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.state_tracking_sync = stateTrackingSync')
  })

  test('wires deterministic state tracking hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicStateTrackingChecks = [buildStateTrackingDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicStateTrackingChecks')
  })

  test('checks intent confirmation contract delivery after chapter text is written', () => {
    const project = { title: '禁门账本' }
    const chapter = { id: 24, chapter_no: 24, title: '第二枚编号' }
    const contextPackage = {
      chapter_target: {
        intent_confirmation_contract: {
          version: 'oh_story_intent_confirmation_v1',
          source: 'manual',
          confirmed_intent: '信息差反杀：李玄用第二枚血契编号夺回审讯解释权',
          rhythm_and_style: ['三轮压问', '短句反击', '爆发后冷却承接'],
          structure_inputs: [
            '内容概括：周薄森三轮压问证据来源，李玄用第二枚血契编号反证。',
            '逻辑线：压问升级 -> 短句反击 -> 信息差反杀 -> 代价收益落地 -> 章尾追问封条来源。',
            '出场顺序：周薄森先逼问，林青禾冒险作证，李玄最后亮出编号。',
            '代价/收益：林青禾公开得罪会长，李玄夺回解释权并拿到反证入口。',
            '章尾承接：第二枚编号指向林青禾封条来源。',
          ],
          execution_focus: ['爽点出手前先铺危机/期待', '信息差反应可见'],
          dialogue_tone_baseline: [
            '高压/生死/悲痛 beat 下，轻快配角声线让位。',
            '信息型配角不当科普嘴。',
            '对话逐句承接对方情绪。',
          ],
          quality_checks: ['本章意图、节奏文风、结构输入、代价收益和章尾承接必须可见。'],
        },
      },
    }
    const confirmedText = [
      '周薄森第一轮压问证据来源，第二轮逼林青禾改口，第三轮把会长令牌压到案上，危机先铺满。',
      '李玄只回了三个短句，每一句都把第二枚血契编号往前推半寸。',
      '编号亮出来时，旁听席先静了一息，周薄森脸色变了，林青禾立刻看懂这是信息差反杀。',
      '林青禾公开作证等于得罪会长，这是她付出的代价；李玄则夺回审讯解释权，拿到反证入口。',
      '爆发后他没有继续炫耀，只把编号压回账本，冷却承接到下一问：林青禾封条来源是谁给的？',
      '章尾，第二枚编号指向封条来源，下一章必须追问这个未解口。',
    ].join('\n')
    const genericText = [
      '大家讨论很久，事情就解决了。',
      '本章只是过渡，人物陆续表达了自己的想法。',
      '周薄森和李玄说了很多背景，林青禾像说明书一样科普封条制度，轻快吐槽把压迫感冲掉。',
      '没有代价，也没有收益，第二枚编号之后再说。',
    ].join('\n')

    const okReport = buildIntentConfirmationSyncReport(project, chapter, contextPackage, confirmedText)
    const warnReport = buildIntentConfirmationSyncReport(project, chapter, contextPackage, genericText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('意图确认 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['确认意图', '节奏/文风', '结构输入', '代价/收益', '章尾承接', '对白基调']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('意图确认缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['代价/收益', '章尾承接', '对白基调', '意图确认硬伤']))
    expect(warnReport.next_actions.join('；')).toContain('本章意图')
  })

  test('keeps intent confirmation sync open when chapter text only self-reports delivery', () => {
    const project = { title: '禁门账本' }
    const chapter = { id: 25, chapter_no: 25, title: '自证意图' }
    const contextPackage = {
      chapter_target: {
        intent_confirmation_contract: {
          version: 'oh_story_intent_confirmation_v1',
          source: 'manual',
          confirmed_intent: '信息差反杀：李玄用第二枚血契编号夺回审讯解释权',
          rhythm_and_style: ['三轮压问', '短句反击', '爆发后冷却承接'],
          structure_inputs: [
            '内容概括：周薄森三轮压问证据来源，李玄用第二枚血契编号反证。',
            '逻辑线：压问升级 -> 短句反击 -> 信息差反杀 -> 代价收益落地 -> 章尾追问封条来源。',
            '代价/收益：林青禾公开得罪会长，李玄夺回解释权并拿到反证入口。',
            '章尾承接：第二枚编号指向林青禾封条来源。',
          ],
          execution_focus: ['爽点出手前先铺危机/期待', '信息差反应可见'],
          dialogue_tone_baseline: ['高压 beat 下短句压问，对话逐句承接对方情绪。'],
        },
      },
    }
    const selfReportText = [
      '信息差反杀和第二枚血契编号已经确认，李玄夺回审讯解释权已完成。',
      '三轮压问、短句反击、爆发后冷却承接都已落地。',
      '内容概括、逻辑线、出场顺序、代价/收益和章尾承接都已完成。',
      '林青禾公开得罪会长、李玄拿到反证入口、章尾下一问封条来源全部已确认。',
      '对白基调已确认，信息差反应可见。',
    ].join('\n')

    const report = buildIntentConfirmationSyncReport(project, chapter, contextPackage, selfReportText)

    expect(report.status).toBe('warn')
    expect(report.label).toContain('意图确认缺口')
    expect(report.missed.map((item: any) => item.label)).toContain('意图确认自证')
    expect(report.next_actions.join('；')).toContain('正文证据')
  })

  test('story state sync persists an intent_confirmation_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("reviewType: 'intent_confirmation_sync', payloadKey: 'intent_confirmation_sync'")
    expect(source).toContain('buildIntentConfirmationSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.intent_confirmation_sync = intentConfirmationSync')
  })

})

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

describe('prose word target regression a', () => {
  test('wires deterministic intent confirmation hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicIntentConfirmationChecks = [buildIntentConfirmationDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicIntentConfirmationChecks')
  })

  test('checks continuity heat contract delivery after chapter text is written', () => {
    const project = { title: '午夜校规' }
    const chapter = { id: 26, chapter_no: 26, title: '门外水声' }
    const contextPackage = {
      chapter_target: {
        continuity_heat_contract: {
          version: 'oh_story_continuity_heat_v1',
          source: 'manual',
          heat_states: ['hot：门外水声必须推进成当场压力', 'warm：旧钥匙缺口需要触达一次', 'cold：镜中脚印回收前必须先升温', 'archived：夜巡司令牌不得误激活'],
          active_expectations: ['门外水声必须继续施压，逼李辰在十息内开门或换路。'],
          watch_items: ['旧钥匙缺口需要回收', '镜中脚印是谁留下的', '李辰和室友互信线不能断温'],
          dormant_allowed: ['夜巡司令牌本章休眠，不能突然解决门外水声。'],
          quality_checks: ['hot 必须推进，warm 必须触达，cold 回收前必须升温，archived 不得误激活。'],
        },
      },
    }
    const heatedText = [
      '门外水声贴着门缝往里灌，十息倒计时压下来，李辰被迫放弃正门，改从窗沿绕到值夜室。',
      '他摸到旧钥匙缺口时停了一下，缺口正好卡住门锁里那道新划痕，旧钥匙没有消失，而是把线索往前推了一寸。',
      '镜中脚印没有立刻揭开身份，只在玻璃上多出半枚湿鞋印，先把这条冷线升温。',
      '室友没有被甩在背景里，他按住广播线替李辰争来三息，互信线继续被触达。',
      '夜巡司令牌始终躺在抽屉里，没有突然替他们解决门外水声。',
    ].join('\n')
    const coldText = [
      '门外水声暂时不重要，大家讨论了一会儿就换了话题。',
      '旧钥匙缺口、镜中脚印和室友关系以后再说。',
      '李辰忽然掏出夜巡司令牌，令牌亮了一下，门外水声立刻消失，事情就解决了。',
      '本章只是过渡，没有必要处理那些伏笔。',
    ].join('\n')

    const okReport = buildContinuityHeatSyncReport(project, chapter, contextPackage, heatedText)
    const warnReport = buildContinuityHeatSyncReport(project, chapter, contextPackage, coldText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('连续性热度 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['热度状态', '活跃期待', '关注项', '休眠边界']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('连续性热度缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['活跃期待', '关注项', '休眠边界', '连续性热度硬伤']))
    expect(warnReport.next_actions.join('；')).toContain('伏笔')
  })

  test('story state sync persists a continuity_heat_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: continuityHeatSync, reviewType: 'continuity_heat_sync'")
    expect(source).toContain('buildContinuityHeatSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.continuity_heat_sync = continuityHeatSync')
  })

  test('wires deterministic continuity heat hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicContinuityHeatChecks = [buildContinuityHeatDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicContinuityHeatChecks')
  })

  test('wires deterministic conflict structure hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicConflictStructureChecks = [buildConflictStructureDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicConflictStructureChecks')
  })

  test('checks conflict structure contract delivery after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 28, chapter_no: 28, title: '设备间门口' }
    const contextPackage = {
      chapter_target: {
        conflict_structure_contract: {
          version: 'oh_story_conflict_structure_v1',
          source: 'manual',
          conflict_ladder: [
            '言语->行动->激烈对抗->决定胜负',
            '协会成员挡住设备间门口，先质疑资格，再扣设备钥匙，最后叫保安封门。',
          ],
          motivation_sources: ['金手指：隐藏工具箱给出错误码反证。', '世界背景：协会资质规则卡住设备间权限。'],
          antagonist_pressure_rules: ['压势不压人：协会成员依靠规则、资质和设备权限压主角。'],
          protagonist_agency_rules: ['主角必须主动破局，做别人不敢做：当众拆开封条核验错误码。'],
          event_value_changes: ['客户资格从拒绝到认可，协会封门从压制变成失证。'],
          next_conflict_seeds: ['第二份封单指向医院设备，协会会长亲自追责。'],
          quality_checks: ['冲突必须持续升级，有明确结果和下一冲突种子。'],
        },
      },
    }
    const structuredText = [
      '协会成员先冷声质疑他没有资质，话音刚落就把设备间门口堵住。',
      '主角往前一步，协会成员立刻扣下设备钥匙，又叫保安封门，言语压力升级成行动阻碍。',
      '主角非踏入不可：客户设备停摆会让全楼停电，他作为值班维修师不能撤；协会封单是会长亲自下的工作职责，对方也退不了。',
      '死亡赌注压在眼前，失败就等于旧城维修资格归零，身份/职场死亡会当场落下。',
      '对方不是单纯骂人，而是拿协会资质规则和设备权限压住客户，客户也被迫后退。',
      '主角没有等人通融，他当众拆开封条，用隐藏工具箱读出错误码反证，做了旁人不敢做的核验。',
      '激烈对抗后胜负落地：客户资格从拒绝到认可，协会封门从压制变成失证。',
      '章尾，第二份封单指向医院设备，协会会长亲自追责，下一冲突种子已经点燃。',
    ].join('\n')
    const flatText = [
      '大家争执了一会儿，协会成员态度不好。',
      '主角解释了很多背景，客户听完觉得有道理。',
      '没有真正阻力，也没有明确胜负，事情很快解决了。',
      '本章只是过渡，下一章再安排新的冲突。',
    ].join('\n')

    const okReport = buildConflictStructureSyncReport(project, chapter, contextPackage, structuredText)
    const warnReport = buildConflictStructureSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('冲突结构 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['冲突阶梯', '动机来源', '压势规则', '主角行动力', '胜负变化', '下一冲突']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('冲突结构缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['冲突阶梯', '主角行动力', '胜负变化', '冲突结构硬伤']))
    expect(warnReport.next_actions.join('；')).toContain('阻止者')
  })

  test('checks oh-story conflict web lines after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 29, chapter_no: 29, title: '医院封单' }
    const contextPackage = {
      chapter_target: {
        conflict_structure_contract: {
          version: 'oh_story_conflict_structure_v1',
          source: 'manual',
          conflict_ladder: ['协会封锁设备间权限，主角必须当场破局。'],
          motivation_sources: ['世界背景：协会资质规则卡住设备间权限。', '人物关系：林青禾担保主角进入医院设备间。'],
          antagonist_pressure_rules: ['压势不压人：协会用资质规则、医院封单和客户授权施压。'],
          protagonist_agency_rules: ['主角必须主动核验错误链，不能等客户通融。'],
          event_value_changes: ['解决设备间权限后，医院封单追责升级。'],
          next_conflict_seeds: ['医院封单背后指向协会账本。'],
          conflict_web: {
            active_lines: ['设备间权限线', '医院封单追责线', '林青禾担保关系线'],
            link_rules: ['三条线必须通过因果、利益冲突或信息差互相牵连。'],
            activation_rules: ['解决设备间权限线后，必须激活或加深医院封单追责线或林青禾担保关系线。'],
          },
          quality_checks: ['同一时刻保持2-3条矛盾线同时运行，解决一条必须激活或加深另一条。'],
        },
      },
    }
    const webText = [
      '协会用资质规则封锁设备间权限，设备间权限线先压住主角。',
      '林青禾以个人名义担保他进入医院设备间，担保关系线同时承压。',
      '主角非踏入不可：医院设备停摆会影响病区供电，他有工作职责；协会封单来自会长命令，对方也退不了。',
      '退出代价很清楚，主角若失败就是维修资格归零，身份/职场死亡，林青禾的担保也会被追责。',
      '主角主动核验错误链，靠信息差证明封锁规则被协会账本篡改。',
      '设备间权限线阶段解决，但结果没有让麻烦消失：医院封单追责线立刻升级，协会会长要求追查林青禾担保责任。',
      '三条矛盾线形成因果和利益冲突，医院封单背后继续指向协会账本。',
    ].join('\n')
    const singleLineText = [
      '协会封锁设备间权限，主角核验后权限问题解决。',
      '主角非踏入不可：医院设备停摆影响病区供电，他有工作职责；协会封单来自会长命令，对方也退不了。',
      '失败就是维修资格归零，身份/职场死亡会当场落下。',
      '其他矛盾暂时没有关联，也没有新的利益冲突。',
      '解决后没有激活新矛盾，林青禾担保关系线和医院封单追责线都没有继续施压。',
    ].join('\n')

    const okReport = buildConflictStructureSyncReport(project, chapter, contextPackage, webText)
    const warnReport = buildConflictStructureSyncReport(project, chapter, contextPackage, singleLineText)

    expect(okReport.status).toBe('ok')
    expect(okReport.delivered.map((item: any) => item.label)).toContain('矛盾网')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先补矛盾网')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('conflict_web')
    expect(warnReport.next_actions.join('；')).toContain('激活或加深')
  })

  test('checks oh-story three-layer conflict network after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 31, chapter_no: 31, title: '协会账本' }
    const contextPackage = {
      chapter_target: {
        conflict_structure_contract: {
          version: 'oh_story_conflict_structure_v1',
          source: 'manual',
          conflict_ladder: ['协会封锁账本权限，主角必须当场破局。'],
          motivation_sources: ['世界背景：协会资质规则卡住账本权限。', '人物关系：林青禾担保主角查账。'],
          antagonist_pressure_rules: ['压势不压人：协会会长用上下级权限和账本保管规则施压。'],
          protagonist_agency_rules: ['主角必须主动核验账本错账，不能等客户通融。'],
          event_value_changes: ['账本权限从拒绝到开放，林青禾担保从帮忙变成被追责。'],
          next_conflict_seeds: ['协会会长把追责转向林青禾的担保资格。'],
          conflict_web: {
            active_lines: ['会长权限压制线', '同业抢单竞争线', '担保资格牵连线'],
            link_rules: ['三条线必须通过因果、利益冲突或信息差互相牵连。'],
            activation_rules: ['解决账本权限后，必须激活或加深担保资格牵连线。'],
          },
          conflict_network_layers: {
            vertical_conflict: '纵向矛盾：协会会长以上级权限压主角和林青禾服从。',
            horizontal_conflict: '横向矛盾：同业维修师争夺旧城医院订单和客户授权。',
            cross_conflict: '交叉矛盾：主角破解账本会让林青禾担保资格被会长追责。',
            weaving_order: ['定地图：旧城协会账本室', '定阵营：协会、同业维修师、林青禾担保方', '定角色：会长压制、同业抢单、主角查账'],
          },
          quality_checks: ['长篇冲突网络必须同时保留纵向、横向、交叉三层矛盾。'],
        },
      },
    }
    const layeredText = [
      '地图定在旧城协会账本室，阵营很清楚：协会、同业维修师和林青禾担保方都挤在门口。',
      '纵向矛盾先压下来：协会会长用上下级权限要求林青禾撤回担保，主角也必须服从账本保管规则。',
      '横向矛盾同时发作：同业维修师争夺旧城医院订单和客户授权，想把主角挤出这单。',
      '交叉矛盾把三方牵连起来：主角破解账本错账会让林青禾担保资格被会长追责，也会让同业抢单失去理由。',
      '主角非踏入不可，他作为值班维修师有工作职责，失败就是维修资格归零；会长封存账本是亲自下的职责命令，对方也退不了。',
      '主角主动核验账本错账，解决账本权限后，担保资格牵连线立刻被激活，会长当场追责林青禾。',
      '三层矛盾不是并列清单，而是因果、利益冲突和信息差互相咬住。',
    ].join('\n')
    const flatText = [
      '协会会长挡了一下账本，主角解释后问题解决。',
      '本章只有账本权限这一条冲突，其他阵营暂时没有关联。',
      '同业维修师没有竞争，林青禾担保也没有被牵连。',
      '解决后没有激活新矛盾。',
    ].join('\n')

    const okReport = buildConflictStructureSyncReport(project, chapter, contextPackage, layeredText)
    const warnReport = buildConflictStructureSyncReport(project, chapter, contextPackage, flatText)

    expect(okReport.status).toBe('ok')
    expect(okReport.delivered.map((item: any) => item.label)).toContain('三层矛盾网')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先补三层矛盾网')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('conflict_network_layers')
    expect(warnReport.missed.find((item: any) => item.key === 'conflict_network_layers')?.missed_items).toEqual(expect.arrayContaining([
      '缺纵向矛盾',
      '缺横向矛盾',
      '缺交叉矛盾',
    ]))
    expect(warnReport.next_actions.join('；')).toContain('纵向/横向/交叉')
  })

  test('checks oh-story no-exit conflict glue after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 30, chapter_no: 30, title: '锁死的设备间' }
    const contextPackage = {
      chapter_target: {
        conflict_structure_contract: {
          version: 'oh_story_conflict_structure_v1',
          source: 'manual',
          conflict_ladder: ['协会封锁设备间权限，主角必须当场破局。'],
          motivation_sources: ['世界背景：协会资质规则卡住设备间权限。', '人物关系：客户设备停摆会让全楼停电。'],
          antagonist_pressure_rules: ['压势不压人：协会用资质规则、设备间封锁和客户授权施压。'],
          protagonist_agency_rules: ['主角必须主动核验错误链，不能等客户通融。'],
          event_value_changes: ['解决封锁后，客户资格从拒绝到认可。'],
          next_conflict_seeds: ['医院封单背后指向协会账本。'],
          no_exit_rules: [
            '有进无出：读者必须相信主角非踏入不可，不能随时退出。',
            '死亡赌注必须明确：肉体死亡、身份/职场死亡或心理死亡至少一种贯穿。',
            '冲突必须有黏结剂：杀人理由、工作职责、道德责任或实体场所至少命中一种。',
          ],
          quality_checks: ['对立双方必须无法轻易脱身。'],
        },
      },
    }
    const gluedText = [
      '设备间门从外侧锁死，实体场所把双方都困在走廊尽头。',
      '主角非踏入不可：客户设备停摆会让全楼停电，他作为值班维修师有工作职责，不能撤。',
      '协会成员也退不了，封单是会长亲自下的工作职责，若让主角进门，协会资质造假就会当场失证。',
      '死亡赌注不是喊口号：失败就等于主角旧城维修资格归零，身份/职场死亡压在眼前。',
      '主角主动核验错误链，解决封锁后客户资格从拒绝到认可，但医院封单背后继续指向协会账本。',
    ].join('\n')
    const looseText = [
      '协会成员拦了一下，主角其实可以转身离开。',
      '对方也随时能撤，没有工作职责、没有场所封锁，也没有亲友遇险。',
      '失败没有代价，身份资格不会受影响，事情只是普通争吵。',
    ].join('\n')

    const okReport = buildConflictStructureSyncReport(project, chapter, contextPackage, gluedText)
    const warnReport = buildConflictStructureSyncReport(project, chapter, contextPackage, looseText)

    expect(okReport.delivered.map((item: any) => item.label)).toContain('有进无出')
    expect(okReport.missed.map((item: any) => item.key)).not.toContain('no_exit_rules')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先补有进无出')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('no_exit_rules')
    expect(warnReport.missed.find((item: any) => item.key === 'no_exit_rules')?.missed_items).toEqual(expect.arrayContaining([
      '缺强迫性入局理由',
      '缺死亡赌注/退出代价',
      '缺黏结剂',
    ]))
    expect(warnReport.next_actions.join('；')).toContain('非踏入不可')
  })

  test('story state sync persists a conflict_structure_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: conflictStructureSync, reviewType: 'conflict_structure_sync'")
    expect(source).toContain('buildConflictStructureSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.conflict_structure_sync = conflictStructureSync')
  })

  test('checks upgrade rhythm contract delivery after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 30, chapter_no: 30, title: '隐藏工具箱' }
    const contextPackage = {
      chapter_target: {
        upgrade_rhythm_contract: {
          version: 'oh_story_upgrade_rhythm_v1',
          source: 'manual',
          upgrade_gap: ['升级前缺口：客户质疑主角没有资格，设备间权限被协会卡住。'],
          upgrade_gain_plan: ['升级收获：系统解锁隐藏工具箱，客户主动加价并恢复授权。'],
          feedback_loop: ['即时反馈：系统提示熟练度+10，主角当场识别错误码。', '延迟反馈：第二份封单指向医院设备，触发更高门槛。'],
          emotion_modules: ['装逼：被质疑 -> 展示能力 -> 打造落差 -> 旁观者震惊。'],
          bridge_rhythm: ['四章一桥段：本章兑现爽感并承上启下。'],
          goldfinger_simplicity_rules: [
            '金手指简单是核心：游戏化面板一眼就懂最好。',
            '功能、触发条件、奖励反馈和升级规则必须清晰。',
            '本章只展示一种核心用法，避免把系统写成说明书或万能外挂。',
          ],
          goldfinger_multi_dimension_growth_rules: [
            '金手指提升要有多维度，不能只靠单一维度。',
            '词条、功能、品质至少两条线同时成长，提升感才不会消失。',
            '条件-反馈模型要保留：条件升级后，反馈可解锁新功能或子能力。',
          ],
          ranking_ladder_rules: [
            '排行榜提供升级动力：排名提升要让读者期待下一名次。',
            '通过排行榜介绍新对手，制造下一次碰撞期待。',
            '榜单出现后要有装逼余震，影响后续态度、资源或规则评价。',
          ],
          quality_checks: ['升级后必须展示以前做不到的事，并立刻引入更高门槛。'],
        },
      },
    }
    const upgradedText = [
      '客户一开始质疑他没有资格，协会又把设备间权限卡住，升级前缺口压得很清楚。',
      '系统提示熟练度+10，隐藏工具箱解锁，主角第一次一眼识别出设备错误码。',
      '这套金手指简单清晰：面板只显示错误码、拆解路线、熟练度+10和下一门槛，触发条件就是接触设备，读者一眼就懂。',
      '这次升级不是只把品质+1：新增词条“静音校准”，隐藏工具箱解锁新功能，旧零件品质升到A档，条件仍是完成维修订单，反馈从熟练度变成词条、功能、品质三线成长。',
      '他以前只能听设备异响猜问题，现在能直接看见隐藏线路的断点，当场修复封锁模块。',
      '客户主动加价并恢复授权，旁观者震惊地改口，装逼爽点从被质疑转成展示能力。',
      '协会维修榜随即刷新，主角从榜外升到第九十九名，第九十八名的医院设备师名字第一次亮出来。',
      '榜单余震传开，客户群开始重新报价，协会规则评价也改写，下一轮排名碰撞有了目标。',
      '但延迟反馈也跟上：第二份封单指向医院设备，新的红色警报和更高门槛立刻压下来。',
      '本章完成兑现爽感，同时把桥段承上启下接到医院设备。',
    ].join('\n')
    const hollowText = [
      '系统突然升级，奖励到账。',
      '面板一口气弹出十几种模块、天赋、羁绊、规则树和隐藏权限，没人知道触发条件和升级规则。',
      '系统只把品质从A升到S，又从S升到SS，其他词条、功能、条件反馈都没有变化，提升只剩品质一个维度。',
      '大家都点头，客户觉得不错。',
      '没有展示新能力，也没有以前做不到的事。',
      '没有新门槛，事情到这里结束。',
    ].join('\n')

    const okReport = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, upgradedText)
    const warnReport = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, hollowText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('升级节奏 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['升级前缺口', '升级收获', '反馈闭环', '情绪模块', '桥段节奏', '金手指简单清晰', '金手指多维成长', '榜单升级动力']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('升级节奏缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['升级前缺口', '反馈闭环', '金手指简单清晰', '金手指多维成长', '升级节奏硬伤']))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('goldfinger_simplicity_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('goldfinger_multi_dimension_growth_rules')
    expect(warnReport.next_actions.join('；')).toContain('新能力')
    expect(warnReport.next_actions.join('；')).toContain('一眼就懂')
    expect(warnReport.next_actions.join('；')).toContain('词条、功能、品质')
  })

  test('checks oh-story ranking ladder after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 34, chapter_no: 34, title: '榜外入榜' }
    const contextPackage = {
      chapter_target: {
        upgrade_rhythm_contract: {
          version: 'oh_story_upgrade_rhythm_v1',
          source: 'manual',
          ranking_ladder_rules: [
            '排行榜提供升级动力：排名提升要让读者期待下一名次。',
            '通过排行榜介绍新对手，制造下一次碰撞期待。',
            '榜单出现后要有装逼余震，影响后续态度、资源或规则评价。',
          ],
        },
      },
    }
    const rankingText = [
      '协会维修榜刷新，沈砚从榜外升到第九十九名，读者能看到下一步要冲第九十八名。',
      '榜单同时亮出新对手：第九十八名医院设备师周承，他刚接下红色封单。',
      '这次入榜有装逼余震，客户群开始重新报价，协会规则评价也改写，下一章的排名碰撞被挂上。',
    ].join('\n')
    const hollowRankingText = [
      '协会维修榜刷新，沈砚排名提升到第九十九名。',
      '众人看了一眼榜单，事情结束。',
    ].join('\n')

    const okReport = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, rankingText)
    const warnReport = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, hollowRankingText)

    expect(okReport.delivered.map((item: any) => item.label)).toContain('榜单升级动力')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先补榜单升级动力')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('ranking_ladder_rules')
    expect(warnReport.next_actions.join('；')).toContain('新对手')
    expect(warnReport.next_actions.join('；')).toContain('装逼余震')
  })

  test('warns when goldfinger evolution changes core function without foreshadowing', () => {
    const project = {
      title: '旧城设备师',
      reference_config: {
        writing_bible: {
          golden_finger: '维修系统：识别设备错误码并给出拆解路线',
        },
      },
    }
    const chapter = { id: 32, chapter_no: 32, title: '系统升阶' }
    const contextPackage = {
      chapter_target: {
        upgrade_rhythm_contract: {
          version: 'oh_story_upgrade_rhythm_v1',
          source: 'manual',
          upgrade_gap: ['协会设备规则升级，旧错误码无法直接修复医院封单。'],
          upgrade_gain_plan: ['维修系统从识别错误码发展为联动医院设备规则。'],
          feedback_loop: ['即时反馈：系统识别医院设备的隐藏错误链。', '延迟反馈：下一章需要进入医院机房验证规则源头。'],
          emotion_modules: ['装逼：别人以为他只会修旧设备，他用同一套维修系统处理医院设备规则。'],
          bridge_rhythm: ['升级后引出医院机房新门槛。'],
          quality_checks: ['金手指核心作用可发展但不能突然换赛道；升华到世界规则层级必须有伏笔。'],
          goldfinger_evolution: {
            core_function: '识别设备错误码并给出拆解路线',
            current_stage: '发展',
            allowed_extensions: ['联动医院设备规则', '识别隐藏错误链'],
            forbidden_drifts: ['血脉神通', '天道掌控'],
          },
        },
      },
    }
    const evolvedText = [
      '协会设备规则升级，旧错误码无法直接修复医院封单。',
      '维修系统没有换赛道，仍然围绕识别设备错误码给出拆解路线，只是发展到能联动医院设备规则。',
      '系统当场识别医院设备的隐藏错误链，主角用同一套维修逻辑拆出机房权限缺口。',
      '延迟反馈也压下来：下一章必须进入医院机房验证规则源头。',
    ].join('\n')
    const driftText = [
      '维修系统突然升级成血脉神通，主角不再识别错误码，也不需要拆解设备。',
      '他一步掌控天道，所有医院设备和旧城规则都跪伏下来。',
      '此前没有任何伏笔，金手指核心作用彻底改变。',
    ].join('\n')

    const okReport = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, evolvedText)
    const warnReport = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, driftText)

    expect(okReport.status).toBe('ok')
    expect(okReport.delivered.map((item: any) => item.label)).toContain('金手指演进')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先校准金手指演进')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('goldfinger_evolution_drift')
    expect(warnReport.next_actions.join('；')).toContain('核心作用')
  })

  test('checks goldfinger conflict balance in upgrade rhythm after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 33, chapter_no: 33, title: '第一单翻身' }
    const contextPackage = {
      chapter_target: {
        upgrade_rhythm_contract: {
          version: 'oh_story_upgrade_rhythm_v1',
          source: 'manual',
          upgrade_gap: ['客户质疑主角没有资格碰进口设备。'],
          upgrade_gain_plan: ['系统识别隐藏错误码，主角修好进口设备。'],
          feedback_loop: ['即时反馈：系统提示熟练度+10。', '延迟反馈：医院设备出现更高门槛。'],
          emotion_modules: ['装逼：被质疑 -> 展示能力 -> 旁观者震惊。'],
          bridge_rhythm: ['修好旧设备后接到医院设备新封单。'],
          goldfinger_conflict_balance_rules: [
            '金手指刚好解决当前矛盾。',
            '金手指太强 + 矛盾不够 = 无聊。',
            '金手指太弱 + 矛盾太强 = 读者焦虑。',
            '解决当前矛盾后必须暴露更大矛盾。',
          ],
        },
      },
    }
    const balancedText = [
      '客户质疑主角没有资格碰进口设备，协会权限也卡住设备间。',
      '维修系统刚好识别隐藏错误码，却只能给出拆解路线，主角还得亲手拆机验证。',
      '系统提示熟练度+10，进口设备被修好，客户主动加价，旁观者震惊。',
      '但系统没有一键清场，医院设备的新封单随即亮起红色警报，暴露更大矛盾和更高门槛。',
    ].join('\n')
    const overpoweredText = [
      '系统一键解决所有问题，所有进口设备和医院设备都自动修好。',
      '客户、协会和所有对手全部认输，当前矛盾彻底消失。',
      '没有更大矛盾，没有新门槛，事情到这里结束。',
    ].join('\n')

    const okReport = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, balancedText)
    const warnReport = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, overpoweredText)

    expect(okReport.delivered.map((item: any) => item.label)).toContain('金手指矛盾匹配')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.priority_repair).toBe('优先校准金手指矛盾')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('goldfinger_conflict_balance')
    expect(warnReport.next_actions.join('；')).toContain('暴露更大矛盾')
  })

  test('story state sync persists an upgrade_rhythm_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: upgradeRhythmSync, reviewType: 'upgrade_rhythm_sync'")
    expect(source).toContain('buildUpgradeRhythmSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.upgrade_rhythm_sync = upgradeRhythmSync')
  })

  test('checks target reader contract delivery after chapter text is written', () => {
    const project = { title: '旧城设备师' }
    const chapter = { id: 31, chapter_no: 31, title: '旧钥匙缺口' }
    const contextPackage = {
      chapter_target: {
        target_reader_contract: {
          version: 'oh_story_target_reader_v1',
          source: 'manual',
          reader_profile: '18-30 岁碎片时间追更的番茄男频读者，现实中缺爽感、掌控感和快速反馈。',
          reader_desires: ['规则反制爽点', '智斗规则边界', '主角把不公平拿掉', '升级后即时反馈'],
          emotional_gap_analysis: [
            '核心痛苦：现实中缺爽感和掌控感，被规则压着走。',
            '深层情结：不甘被不公平规则安排，渴望亲手反制。',
            '高频情绪关键词：不甘、渴望、掌控、解气。',
            '未满足需求：快速反馈、安全感和尊严补偿。',
          ],
          chapter_attractions: ['超人蛮力被规则反制后，主角用信息差反制规则。', '门外水声逼出新选择，旧钥匙缺口给出可见线索。'],
          genre_vitality_rules: ['题材生命力必须用当前目标平台样本验证，判断新鲜期 / 成熟期 / 审美疲劳期，不能把历史经验当作当前事实。'],
          platform_fit_rules: ['不能用A网站的样本直接套到B网站；番茄要强情绪和爽感直给，起点可接受慢节奏代入。'],
          boundary_fit_rules: ['确认边界感：当前素材、知识储备和篇幅能支撑所选题材，成熟题材稳边界，创新题材降篇幅和创新数量。'],
          title_blurb_alignment_rules: ['书名3秒抓人，简介必须有安全感+钩子，书名简介内容三位一体，不能货不对板。'],
          immersion_plasticity_rules: ['正文必须有代入感且无塑料感：世界观自洽、画风统一，避免仙侠搞科研式撕裂。'],
          goldfinger_life_fit_rules: ['金手指必须与主角生活/职业息息相关，并服务主线，不要频繁开新金手指。'],
          commercial_expression_rules: ['私人表达不得超过全篇5%，且必须服务核心卖点，不能独立于主线剧情存在。'],
          validation_questions: ['我这书写给谁看？', '目标读者想看什么？', '本章给了什么可感知回报？'],
          correction_methods: ['对照目标读者画像删掉作者自嗨设定展示。', '把卖点落成动作、反应、结果和章尾期待。'],
          quality_checks: ['三问必须都有正文证据。'],
        },
      },
    }
    const readerFacingText = [
      '这一章写给碎片时间追更、想要快速反馈的男频读者看，主角一出手就把规则压迫变成现场反制。',
      '他的核心痛苦不是门打不开，而是现实里总被规则压着走的不甘；这一刻的情绪缺口，是读者渴望亲手拿回掌控感和尊严。',
      '协会搬出资质规则，超人蛮力刚要破门，主角却用信息差指出规则边界：钥匙缺口对应旧备案，不公平当场被拿掉。',
      '旧钥匙缺口在门框上亮出可见线索，门外水声逼出新选择，升级后的识别能力立刻给出即时反馈。',
      '客户的反应、协会的退让和章尾账本编号一起落成回报，也留下下一章必须追的章尾期待。',
      '当前番茄样本验证显示规则怪谈处在成熟期，所以本章稳定兑现边界期待，只做旧备案缺口这一处微创新。',
      '写法没有把起点慢节奏样本硬套到番茄，而是用强情绪、爽感直给和目标平台节奏校准读者期待与雷点。',
      '素材、知识储备和篇幅都压在宿舍规则和门槛白线内，边界感清晰，没有扩成无法支撑的宏大设定。',
      '书名的旧钥匙缺口、简介承诺的安全感加钩子、正文交付的门框线索三位一体，没有货不对板。',
      '世界观自洽，宿舍规则、备案钥匙和门外水声保持同一画风，代入感稳定，没有仙侠搞科研式塑料感。',
      '识别钥匙缺口的能力与主角设备师职业和当下生活处境息息相关，金手指服务主线而不是硬贴外挂。',
      '所有私人表达都服务核心卖点，没有超过5%去讲作者自己的观点。',
      '正文没有停在设定展示，而是把卖点写成动作、反应、结果。',
    ].join('\n')
    const selfIndulgentText = [
      '读者会喜欢这个设定。',
      '大家会喜欢这章。',
      '作者觉得世界观很有意思。',
      '本章主要展示设定，没有明显回报。',
      '题材曾经很火，所以不用当前样本验证，也不用判断新鲜期成熟期或审美疲劳期。',
      '直接把A网站慢热样本套到B网站，不需要看番茄强情绪或起点慢节奏的差异。',
      '素材、知识储备和篇幅都不够，但先硬写混搭大设定。',
      '书名、简介和正文可以各写各的，货不对板也没关系。',
      '仙侠世界突然搞科研，画风撕裂，塑料感很明显。',
      '医生主角配隐身金手指，和生活职业无关。',
      '作者私人表达占了很多篇幅，独立于主线卖点。',
    ].join('\n')

    const okReport = buildTargetReaderSyncReport(project, chapter, contextPackage, readerFacingText)
    const warnReport = buildTargetReaderSyncReport(project, chapter, contextPackage, selfIndulgentText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('目标读者 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining([
      '读者画像',
      '读者欲望',
      '情绪缺口',
      '本章吸引点',
      '题材生命力',
      '平台适配',
      '题材边界',
      '书名简介一致',
      '代入与塑料感',
      '金手指生活关联',
      '商业表达',
      '三问验证',
      '修正方法',
    ]))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('目标读者缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining([
      '读者欲望',
      '情绪缺口',
      '本章吸引点',
      '题材生命力',
      '平台适配',
      '题材边界',
      '书名简介一致',
      '代入与塑料感',
      '金手指生活关联',
      '商业表达',
      '目标读者硬伤',
    ]))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('emotional_gap_analysis')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('genre_vitality_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('platform_fit_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('title_blurb_alignment_rules')
    expect(warnReport.next_actions.join('；')).toMatch(/目标读者|可感知回报/)
    expect(warnReport.next_actions.join('；')).toContain('核心痛苦')
    expect(warnReport.next_actions.join('；')).toContain('目标平台样本')
    expect(warnReport.next_actions.join('；')).toContain('书名简介内容')
  })

})

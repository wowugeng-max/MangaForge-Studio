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

describe('prose word target regression', () => {
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

  test('wires deterministic target reader hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicTargetReaderChecks = [buildTargetReaderDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicTargetReaderChecks')
  })

  test('story state sync persists a target_reader_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicGenrePositioningChecks = [buildGenrePositioningDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicGenrePositioningChecks')
  })

  test('story state sync persists a genre_positioning_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: femaleAudienceSync, reviewType: 'female_audience_sync'")
    expect(source).toContain('buildFemaleAudienceSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.female_audience_sync = femaleAudienceSync')
  })

  test('wires deterministic female audience hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: plotDynamicsSync, reviewType: 'plot_dynamics_sync'")
    expect(source).toContain('buildPlotDynamicsSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.plot_dynamics_sync = plotDynamicsSync')
  })

  test('wires deterministic plot dynamics hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

    expect(source).toContain("buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterRelationSync, reviewType: 'character_relation_sync'")
    expect(source).toContain('buildCharacterRelationSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.character_relation_sync = characterRelationSync')
  })

  test('wires deterministic character relation hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/story-state-machine.ts'), 'utf8')

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

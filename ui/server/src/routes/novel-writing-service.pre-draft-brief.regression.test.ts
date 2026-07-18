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

describe('chapter pre-draft brief regression', () => {
  test('merges runtime chapterTarget longform compass into pre-draft brief when chapter_target already exists', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          scene_cards: [{ scene_no: 1, title: '门槛', reader_payoff: '规则边界第一次显形。' }],
        },
        chapterTarget: {
          chapterNo: 2,
          longformCompass: {
            readerPromise: '超人力量必须持续撞上规则判定。',
            coreConflict: '蛮力破局与规则边界互相反制。',
            immutableRules: ['超人力量不能变成无代价清场'],
            flexibleZones: ['副本可变化，但必须服务规则破局主线'],
          },
        },
      },
    )

    expect(brief.longform_compass.reader_promise).toContain('规则判定')
    expect(brief.longform_compass.immutable_rules).toContain('超人力量不能变成无代价清场')
    expect(brief.longform_compass.flexible_zones).toContain('副本可变化，但必须服务规则破局主线')
    expect(brief.longform_compass.axes.find((axis: any) => axis.key === 'core_conflict')?.value).toContain('规则边界')
  })

  test('adds core contract radar to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        reference_config: {
          writing_bible: {
            promise: '超人力量和规则判定持续碰撞。',
          },
        },
      },
      {
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          core_conflict: '蛮力破局与规则判定的对抗。',
          innovation_hook: '超人能力被规则空间反制。',
          core_emotion: '力量被规则反制后的紧张与破局爽。',
          immutable_rules: ['不能把规则怪谈写成纯打怪', '双主角互补不能拆散'],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '验证十点门槛的规则边界。',
          conflict: '李超想硬闯，张智要求低成本验证。',
          chapter_launch_gate: {
            reader_promise: { status: 'warn', reason: '超人力量与规则判定碰撞不够可见' },
            mainline_service: { status: 'block', reason: '本章必须推进午夜校园规则调查' },
          },
          scene_cards: [
            { scene_no: 1, title: '十点门槛', reader_payoff: '超人力量第一次被规则边界反制。' },
          ],
        },
      },
    )

    expect(brief.core_contract_radar.summary).toContain('超人力量')
    expect(brief.core_contract_radar.must_serve).toContain('超人力量和规则判定持续碰撞。')
    expect(brief.core_contract_radar.must_serve).toContain('蛮力破局与规则判定的对抗。')
    expect(brief.core_contract_radar.must_serve).toContain('超人能力被规则空间反制。')
    expect(brief.core_contract_radar.must_serve).toContain('超人力量第一次被规则边界反制。')
    expect(brief.core_contract_radar.no_drift).toContain('不能把规则怪谈写成纯打怪')
    expect(brief.core_contract_radar.theme_unity_rules.join('｜')).toContain('一本书从头到尾要有统一的核心情绪')
    expect(brief.core_contract_radar.theme_unity_rules.join('｜')).toContain('小情绪服从大情绪')
    expect(brief.core_contract_radar.theme_unity_rules.join('｜')).toContain('随机翻开一章')
    expect(brief.core_contract_radar.theme_unity_rules.join('｜')).toContain('力量被规则反制后的紧张与破局爽')
    expect(brief.core_contract_radar.selling_point_execution_rules.join('｜')).toContain('卖点四步法')
    expect(brief.core_contract_radar.selling_point_execution_rules.join('｜')).toContain('发现比告知爽十倍')
    expect(brief.core_contract_radar.selling_point_execution_rules.join('｜')).toContain('开头暗示')
    expect(brief.core_contract_radar.repetition_strategy_rules.join('｜')).toContain('重复点')
    expect(brief.core_contract_radar.repetition_strategy_rules.join('｜')).toContain('同一卖点至少延展 3 个角度')
    expect(brief.core_contract_radar.commercial_rhythm_rules.join('｜')).toContain('连续 2 章没有目标推进、阻碍升级或新信息')
    expect(brief.core_contract_radar.commercial_rhythm_rules.join('｜')).toContain('大高潮 7-10 天')
    expect(brief.core_contract_radar.goldfinger_structure_rules.join('｜')).toContain('金手指可替换故事流程中的任一环节')
    expect(brief.core_contract_radar.goldfinger_structure_rules.join('｜')).toContain('一眼就懂')
    expect(brief.core_contract_radar.launch_pressure_rules.join('｜')).toContain('300-500字内交代处境、危险来源和破局希望')
    expect(brief.core_contract_radar.launch_pressure_rules.join('｜')).toContain('优先用环境型压力开局')
    expect(brief.core_contract_radar.checks.map((check: any) => check.key)).toContain('theme_unity')
    expect(brief.core_contract_radar.repair_focus.join('｜')).toContain('本章必须推进午夜校园规则调查')
    expect(brief.core_contract_radar.checks.map((check: any) => check.label)).toContain('主线服务')
  })

  test('uses camelCase chapter launch gate when building core contract radar', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        reference_config: {
          writing_bible: {
            promise: '超人力量和规则判定持续碰撞。',
          },
        },
      },
      {
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          core_conflict: '蛮力破局与规则判定的对抗。',
          immutable_rules: ['不能把规则怪谈写成纯打怪'],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '验证十点门槛的规则边界。',
          conflict: '李超想硬闯，张智要求低成本验证。',
          chapterLaunchGate: {
            reader_promise: { status: 'warn', reason: '超人力量与规则判定碰撞不够可见' },
            mainline_service: { status: 'block', reason: '本章必须推进午夜校园规则调查' },
          },
          scene_cards: [
            { scene_no: 1, title: '十点门槛', reader_payoff: '超人力量第一次被规则边界反制。' },
          ],
        },
      },
    )

    expect(brief.core_contract_radar.repair_focus.join('｜')).toContain('本章必须推进午夜校园规则调查')
    expect(brief.core_contract_radar.checks.map((check: any) => check.key)).toContain('mainline_service')
  })

  test('merges runtime chapterTarget chapterLaunchGate into core contract radar when chapter_target already exists', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        reference_config: {
          writing_bible: {
            promise: '超人力量和规则判定持续碰撞。',
          },
        },
      },
      {
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          core_conflict: '蛮力破局与规则判定的对抗。',
          immutable_rules: ['不能把规则怪谈写成纯打怪'],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '验证十点门槛的规则边界。',
          scene_cards: [
            { scene_no: 1, title: '十点门槛', reader_payoff: '超人力量第一次被规则边界反制。' },
          ],
        },
        chapterTarget: {
          chapterNo: 2,
          chapterLaunchGate: {
            mainline_service: { status: 'block', reason: '本章必须推进午夜校园规则调查' },
          },
        },
      },
    )

    expect(brief.core_contract_radar.repair_focus.join('｜')).toContain('本章必须推进午夜校园规则调查')
    expect(brief.core_contract_radar.checks.map((check: any) => check.key)).toContain('mainline_service')
  })

  test('merges runtime chapterTarget coreContractRadar into pre-draft brief when chapter_target already exists', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          scene_cards: [
            { scene_no: 1, title: '十点门槛', reader_payoff: '超人力量第一次被规则边界反制。' },
          ],
        },
        chapterTarget: {
          chapterNo: 2,
          coreContractRadar: {
            summary: '本章必须沿用运行时核心契约。',
            mustServe: ['运行时核心承诺必须进入任务书'],
            noDrift: ['不能把运行时契约降级成默认推导'],
            repairFocus: ['优先补运行时指定的主线推进'],
            checks: [{ key: 'runtime_contract', label: '运行时契约' }],
          },
        },
      },
    )

    expect(brief.core_contract_radar.summary).toContain('运行时核心契约')
    expect(brief.core_contract_radar.must_serve).toContain('运行时核心承诺必须进入任务书')
    expect(brief.core_contract_radar.no_drift).toContain('不能把运行时契约降级成默认推导')
    expect(brief.core_contract_radar.repair_focus).toContain('优先补运行时指定的主线推进')
    expect(brief.core_contract_radar.checks.map((check: any) => check.key)).toContain('runtime_contract')
  })

  test('adds ten-chapter core selling point drift check to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        reference_config: {
          writing_bible: {
            promise: '超人力量和规则判定持续碰撞。',
          },
        },
      },
      {
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          axes: [
            { key: 'innovation_hook', label: '创新卖点', value: '超人能力被规则空间反制。' },
            { key: 'payoff_loop', label: '爽点循环', value: '每十章仍要让力量反制规则。' },
          ],
          immutable_rules: ['不能把规则怪谈写成纯打怪'],
        },
        chapter_target: {
          chapter_no: 10,
          title: '第十条规则',
          summary: '第十章复核最初吸引读者的卖点是否还在。',
          scene_cards: [
            { scene_no: 1, title: '规则反噬', reader_payoff: '超人能力被规则空间再次反制。' },
          ],
        },
      },
    )

    expect(brief.core_contract_radar.periodic_drift_check).toEqual(expect.objectContaining({
      cadence: '每10章',
      due: true,
    }))
    expect(brief.core_contract_radar.periodic_drift_check.question).toContain('当初吸引读者的卖点还在吗')
    expect(brief.core_contract_radar.checks.map((check: any) => check.key)).toContain('ten_chapter_selling_point')
  })

  test('turns creation contracts into a pre-write confirmation checklist', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '灰域双生',
        genre: '都市规则怪谈',
        target_audience: '18-30 岁番茄男频读者',
        synopsis: '双主角用武力试错和规则推演反制怪谈。',
        reference_config: {
          writing_bible: {
            promise: '每章都有规则发现、代价压力和反制爽点。',
            target_reader_contract: {
              source: 'oh_story_creation_contract_v1',
              reader_profile: '18-30 岁番茄男频规则怪谈读者',
              reader_desires: ['规则破解爽点', '双主角互补反制'],
              emotional_gap: ['缺掌控感，需要看到规则被拆解'],
              chapter_value_test: ['写给谁看', '读者想看什么', '本章给什么'],
            },
            genre_positioning_contract: {
              source: 'oh_story_creation_contract_v1',
              genre_tags: ['都市规则怪谈', '双主角'],
              platform: '番茄',
              selling_points: ['莽夫破局制造反差', '规则分析带来智斗爽感'],
              long_board: '规则破解爽点',
              innovation_boundary: '不能把规则怪谈写成纯打怪。',
            },
            core_contract_radar: {
              source: 'oh_story_creation_contract_v1',
              must_serve: ['每章都有规则发现、代价压力和反制爽点。'],
              no_drift: ['不能写成纯打怪'],
              repair_focus: ['本章必须把规则发现写成现场证据'],
            },
            reader_retention_contract: {
              source: 'oh_story_creation_contract_v1',
              opening_hook_rule: '前300字承接上一章规则代价。',
              ending_hook_rule: '章末留下下一章动作压力。',
              quality_checks: ['开头不能另起炉灶'],
            },
          },
        },
      },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '验证十点门槛的规则边界。',
          conflict: '林野想硬闯，沈砚要求低成本验证。',
          ending_hook: '门外的第二条规则响起。',
          scene_cards: [
            { scene_no: 1, title: '十点门槛', conflict: '硬闯会触发代价', reader_payoff: '规则边界第一次显形。' },
          ],
        },
      },
    )

    expect(brief.target_reader_contract.reader_profile).toContain('18-30')
    expect(brief.target_reader_contract.reader_desires.join('｜')).toContain('规则破解爽点')
    expect(brief.genre_positioning_contract.genre_tags.join('｜')).toContain('都市规则怪谈')
    expect(brief.core_contract_radar.must_serve.join('｜')).toContain('每章都有规则发现')
    expect(brief.reader_retention_brief.opening_hook).toContain('前300字')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('目标读者')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('题材定位')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('特殊题材')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('核心承诺')
    expect(brief.write_preparation_brief.creation_contract_checklist.join('｜')).toContain('追读留存')
    expect(brief.write_preparation_brief.must_confirm.join('｜')).toContain('创作契约：目标读者')
  })

  test('turns creation opening hook strategy into opening contract and prose prompt', () => {
    const project = {
      title: '灰域双生',
      genre: '都市规则怪谈',
      target_audience: '18-30 岁番茄男频读者',
      synopsis: '双主角用武力试错和规则推演反制怪谈。',
      reference_config: {
        writing_bible: {
          opening_strategy_contract: {
            source: 'oh_story_opening_hook_strategy_v1',
            hook_type: '事件噱头',
            opening_flow: '事件切入5章后嫁接主线。',
            mainline_graft: '第五章把规则副本嫁接到校园主线。',
            first_5_chapter_promise: ['第一章立刻进入十点门槛事件。'],
            threshold_ladder: ['十点门槛', '姓名门槛'],
            forbidden_mixing: ['事件噱头和金手指噱头不能混用。'],
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 1,
        title: '十点门槛',
        summary: '第一章直接进入十点规则事件。',
        conflict: '林野想硬闯，沈砚要求先验证规则。',
        ending_hook: '门外响起第二条规则。',
        scene_cards: [
          { scene_no: 1, title: '门槛倒计时', conflict: '十点前必须判断能否开门。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 1, title: '十点门槛' })

    expect(brief.opening_contract.source).toBe('oh_story_opening_hook_strategy_v1')
    expect(brief.opening_contract.hook_type).toBe('事件噱头')
    expect(brief.opening_contract.opening_strategy).toContain('事件切入5章后嫁接主线')
    expect(brief.opening_contract.mainline_graft).toContain('校园主线')
    expect(brief.opening_contract.threshold_ladder).toContain('十点门槛')
    expect(brief.opening_contract.forbidden_patterns.join('｜')).toContain('不能混用')
    expect(prompt).toContain('事件噱头')
    expect(prompt).toContain('第五章把规则副本嫁接到校园主线')
    expect(prompt).toContain('十点门槛')
  })

  test('adds longform battle desk risks to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        longformBattleDesk: {
          status: 'needs_action',
          score: 72,
          summary: '先修复读者拉力和核心守恒，再进入正文。',
          riskChips: ['核心偏移', '前30章留存'],
          primaryAction: {
            key: 'run_first30_retention',
            label: '运行前30章诊断',
            reason: '第2章章末钩子弱，必须补读者期待。',
          },
          lanes: [
            {
              key: 'story_core',
              label: '核心守恒',
              status: 'warn',
              score: 68,
              detail: '核心偏移：超人力量被写成普通无敌碾压。',
              action: '本章必须写出规则判定反制蛮力。',
            },
            {
              key: 'reader_pull',
              label: '读者拉力',
              status: 'block',
              score: 55,
              detail: '前30章留存弱：开篇钩子和章末追读不足。',
              action: '前300字给危机，章末留下门外学生悬念。',
            },
            {
              key: 'innovation_ip',
              label: '创新/IP场面',
              status: 'ok',
              score: 86,
              detail: '十点门槛具备可视化场面。',
            },
          ],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          scene_cards: [],
        },
      },
    )

    expect(brief.longform_battle_context.status).toBe('needs_action')
    expect(brief.longform_battle_context.risk_chips).toContain('核心偏移')
    expect(brief.longform_battle_context.primary_action.label).toBe('运行前30章诊断')
    expect(brief.longform_battle_context.risk_lanes.map((lane: any) => lane.key)).toEqual(['story_core', 'reader_pull'])
    expect(brief.longform_battle_context.risk_lanes[0].required_action).toContain('规则判定反制蛮力')
    expect(brief.longform_battle_context.lanes.find((lane: any) => lane.key === 'innovation_ip')?.detail).toContain('十点门槛')
  })

  test('adds camelCase chapter longform battle context to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          scene_cards: [],
          longformBattleContext: {
            status: 'needs_action',
            summary: '本章必须把长篇核心拉回规则反制。',
            riskChips: ['核心漂移', '读者拉力弱'],
            primaryAction: {
              key: 'repair_story_core',
              label: '修复核心守恒',
              reason: '正文必须让超人力量被规则判定反制。',
            },
            riskLanes: [
              {
                key: 'story_core',
                label: '核心守恒',
                status: 'warn',
                detail: '核心漂移：超人力量像普通无敌流。',
                requiredAction: '写出规则判定压住蛮力的现场代价。',
              },
            ],
          },
        },
      },
    )

    expect(brief.longform_battle_context.summary).toContain('长篇核心拉回规则反制')
    expect(brief.longform_battle_context.risk_chips).toContain('核心漂移')
    expect(brief.longform_battle_context.primary_action.label).toBe('修复核心守恒')
    expect(brief.longform_battle_context.risk_lanes[0].required_action).toContain('规则判定压住蛮力')
  })

  test('merges runtime chapterTarget longform battle context into the pre-draft brief when chapter_target already exists', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '测试规则边界。',
          scene_cards: [],
        },
        chapterTarget: {
          chapterNo: 2,
          longformBattleContext: {
            status: 'needs_action',
            summary: '运行时长篇作战台要求先修复章末追读。',
            riskChips: ['运行时作战台'],
            riskLanes: [
              {
                key: 'reader_pull',
                label: '读者拉力',
                status: 'block',
                detail: '章末问题太快关闭。',
                requiredAction: '章末必须留下湿漉漉学生身份悬念。',
              },
            ],
          },
        },
      },
    )

    expect(brief.longform_battle_context.summary).toContain('运行时长篇作战台')
    expect(brief.longform_battle_context.risk_chips).toContain('运行时作战台')
    expect(brief.longform_battle_context.risk_lanes[0].required_action).toContain('湿漉漉学生身份悬念')
  })

  test('adds chapter innovation execution to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        reference_config: {
          writing_bible: {
            innovation_hook: '超人力量不能碾压规则，必须用规则漏洞反制。',
            commercial_positioning: {
              selling_points: ['超人蛮力撞上规则判定', '智者拆规则反杀'],
            },
          },
        },
      },
      {
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          axes: [
            { key: 'innovation_hook', label: '创新卖点', value: '超人不是无敌爽，而是每次强行动手都会被规则反噬。' },
            { key: 'world_hook', label: '世界奇点', value: '每个副本都是可验证的规则系统。' },
          ],
        },
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '十点门槛第一次显形。',
          conflict: '李超想硬闯，张智要求先验证边界。',
          scene_cards: [
            {
              scene_no: 1,
              title: '十点门槛',
              reader_payoff: '用饼干碎屑验证黑暗清除规则。',
              rule_pressure: '十点后不得离开宿舍。',
              reversal: '超人力量无法越过判定边界。',
            },
          ],
        },
      },
    )

    expect(brief.innovation_brief.chapter_angle).toContain('规则反噬')
    expect(brief.innovation_brief.execution_points).toContain('用饼干碎屑验证黑暗清除规则')
    expect(brief.innovation_brief.differentiation_guardrails).toContain('不得写成普通开挂碾压')
    expect(brief.innovation_brief.ip_adaptation_hooks).toContain('十点门槛')
  })

  test('adds rolling-plan signature scene repair obligations to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 9,
          title: '新压力源',
          summary: '安全区被迫变成临时战场。',
          conflict: '旧秩序压制新晋黑马。',
          ending_hook: '道具背面刻着禁用标记。',
          rollingPlan: {
            signature_scene: '主角在倒塌走廊里反手点亮禁用阵纹，把安全区变成审判场。',
            scene_repair_target: '修复 IP场面覆盖 1/10 的强场面空窗。',
            reader_payoff: '规则反杀爽点。',
            storyline_service: '推进外门试炼主线。',
          },
          scene_cards: [],
        },
      },
    )

    expect(brief.signature_scene_brief.signature_scene).toContain('审判场')
    expect(brief.signature_scene_brief.scene_repair_target).toContain('IP场面覆盖 1/10')
    expect(brief.signature_scene_brief.reader_payoff).toContain('规则反杀')
    expect(brief.signature_scene_brief.storyline_service).toContain('外门试炼主线')
  })

  test('merges runtime chapterTarget signature scene repair into the pre-draft brief when chapter_target already exists', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 9,
          title: '新压力源',
          summary: '安全区被迫变成临时战场。',
          scene_cards: [],
        },
        chapterTarget: {
          chapterNo: 9,
          rollingPlan: {
            signature_scene: '运行时要求把倒塌走廊写成审判场。',
            scene_repair_target: '补回强场面空窗。',
            reader_payoff: '规则反杀爽点。',
            storyline_service: '推进外门试炼主线。',
          },
        },
      },
    )

    expect(brief.signature_scene_brief.signature_scene).toContain('运行时要求把倒塌走廊写成审判场')
    expect(brief.signature_scene_brief.scene_repair_target).toContain('强场面空窗')
    expect(brief.signature_scene_brief.storyline_service).toContain('外门试炼主线')
  })

  test('adds next batch serial brief to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        next_batch_brief: {
          chapterRangeLabel: '第8-10章',
          batchGoal: '三章内进入内门视野。',
          readerPayoffPlan: '升级、打脸、规则反制逐章交付。',
          mainlineFocus: '外门危机 -> 内门招揽',
          forbiddenBoundary: '第10章前不得揭露规则源头。',
          startChecklist: [
            { key: 'core_promise', label: '核心承诺', status: 'ok', detail: '主角必须以规则反制兑现逆袭承诺。' },
            { key: 'forbidden_boundary', label: '禁写边界', status: 'ok', detail: '第10章前不得揭露规则源头。' },
          ],
          chapters: [
            { chapterNo: 8, title: '外门夜钟', chapterTask: '证明夜钟规则有效。', conflict: '是否相信敌人提示。', endingHook: '钟声倒数。' },
            { chapterNo: 9, title: '反制试探', chapterTask: '用超人速度验证边界。', conflict: '速度能否绕过规则。', endingHook: '内门令牌出现。' },
          ],
        },
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          scene_cards: [],
        },
      },
    )

    expect(brief.next_batch_brief.chapter_range_label).toBe('第8-10章')
    expect(brief.next_batch_brief.batch_goal).toContain('内门视野')
    expect(brief.next_batch_brief.reader_payoff_plan).toContain('打脸')
    expect(brief.next_batch_brief.current_chapter_role).toContain('证明夜钟规则有效')
    expect(brief.next_batch_brief.forbidden_boundary).toContain('规则源头')
    expect(brief.next_batch_brief.start_checklist.map((item: any) => item.key)).toEqual(['core_promise', 'forbidden_boundary'])
    expect(brief.next_batch_brief.start_checklist[0].detail).toContain('规则反制')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('继续/续写/日更只表示继续当前日更批量流程')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('确定本轮写作范围后直接进入 Step 2')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('story-explorer')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('context_load')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('返回不完整')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('回退到手动加载')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/上下文.md 缺失时从 追踪/伏笔.md + 追踪/时间线.md 重建')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/伏笔.md 缺失可跳过')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/时间线.md 缺失可从正文推断')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('大纲/细纲_第{N}章.md 缺失必须先补建')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('确定下一章编号 N')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/上下文.md 的“最后完成章节”')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('扫描 正文/ 目录中编号最大的章节 +1')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('K 默认 2-3 章')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('只写1章')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('从细纲中提取本章涉及的角色名')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('按需加载 设定/角色/{角色名}.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('细纲未列出角色时跳过')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('Step 2.1 标题预检')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('同名或明显重复')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('按本章核心事件改名')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('同步细纲标题与正文文件名')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得跳过 Step 2.2 状态筛选或 Step 2.3 文风召回')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('必须串行逐章写作，不得并发生成多章')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('章间不重复询问是否继续')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('细纲缺失')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('用户要求改变大纲/追踪')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('细纲缺失补建流程')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('设定/角色/{角色名}.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('按新版细纲模板补齐内容概括、情节安排、人物关系/出场顺序、情节细化、结尾设定')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('无法确认字段写 [待补充]')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不杜撰')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('每章写完立即更新')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/伏笔.md、追踪/时间线.md、追踪/角色状态.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/上下文.md 只更新进度元信息')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不写详细角色状态/伏笔内容')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('超过30章时')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('已写内容摘要按三层结构')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('压缩早期章节、保留近期细节')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('近5章详记、十章概要、卷级总览')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('每50章或卷结束')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪/归档')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('活跃伏笔、时间线、角色状态仍以当前文件为准')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('批量写作模式跳过单章 story-review lean')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('全部写完后再统一执行 Phase 5 质量检查')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('Phase 5 完整检查清单')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('禁用词扫描、标题去重检查、正文元信息扫描和章尾钩子检查')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('命中时必须回对应正文或细纲修复')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('Phase 5 对照细纲核对')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('新版细纲核对内容概括五段式、情节安排多线、人物关系变化/出场顺序、代价兑现/收益兑现')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('旧版细纲只核对核心事件、目标情绪、章首/章尾钩子和字数目标')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('伏笔盘点仅本轮增量')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('本批新增/推进/回收的伏笔已写入追踪/伏笔.md并更新状态')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得通读所有 session 或扫描全部正文做全量伏笔审计')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('确定性收尾')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('主会话在本批实际落盘正文上运行 normalize-punctuation.js')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('check-ai-patterns.js --check')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('narrative-writer agent 不运行这些脚本')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('本轮 workflow 内实际读取或刚更新')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得用未标明来源的聊天记忆替代')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('首次日更兜底')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('追踪文件全部为空或不存在')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('大纲/卷纲_当前卷.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('最新一章正文')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('重建上下文')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('新版细纲优先读取内容概括、情节安排、人物关系和出场顺序')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('旧版细纲缺这些字段不阻塞')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('回退到核心事件、目标情绪、章首/章尾钩子和字数目标')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('新版细纲进入意图确认时')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('内容概括决定起承转合')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('人物关系和出场顺序决定镜头进入顺序')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('情节细化决定代价兑现/收益兑现')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('Step 2.4 craft')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('Step 2.3 对标召回')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('剧情/情绪模块.md、剧情/节奏.md、文风.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('情绪模块/节奏参照优先')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('文风.md 只管表达层')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('对标缺口分流')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('missing_primary_contract/profile_missing')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得进入 narrative-writer')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('legacy_deconstruction')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('module_missing/rhythm_missing')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('matched_deep_dive_missing')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得在后续报告中反转为 false')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('无 story-explorer 时降级')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('手动按对标书路径查找')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('先读 剧情/情绪模块.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('grep 章节/*_摘要.md 的「基调」')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('第1-3章_深度拆解.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('v12 停止修复，legacy 才回退继续')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('资料研究按需')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('story-researcher')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('参考资料/')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('研究完成后再继续写作')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得编造确定事实')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('字数验证')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('优先 Python 字符统计')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('wc -m 仅作 Unix 备选')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('低于目标 90%')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('强制扩充')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('gaps/conflict 必须进入意图确认')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不得用文风接近掩盖模块或节奏缺失')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('爽点出手前先铺可指认的危机/期待')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('不铺=空洞')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('在场配角放大成差异化反应')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('信息型配角不当科普嘴')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('按需加载创作公式')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('references/genre-writing-formulas.md')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('期待感公式、爽点公式、信息差公式')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('默认不加载')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('避免无条件加载 1500+ 行文件')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('批次最终进度摘要')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('## 写作进度')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('最后完成章节')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('本期完成')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('## 当前状态')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('下一章细纲状态')
    expect(brief.next_batch_brief.workflow_rules.join('｜')).toContain('注意事项')
  })

  test('merges runtime chapterTarget next batch brief into the pre-draft brief when chapter_target already exists', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          scene_cards: [],
        },
        chapterTarget: {
          chapterNo: 8,
          nextBatchBrief: {
            chapterRangeLabel: '第8-10章',
            batchGoal: '运行时要求三章内完成外门到内门视野切换。',
            forbiddenBoundary: '第10章前不得揭露规则源头。',
            startChecklist: [
              { key: 'reader_payoff', label: '读者回报', status: 'ok', detail: '每章都要有规则反制爽点。' },
            ],
            chapters: [
              { chapterNo: 8, title: '外门夜钟', chapterTask: '本章只验证夜钟规则第一次显形。' },
            ],
          },
        },
      },
    )

    expect(brief.next_batch_brief.batch_goal).toContain('运行时要求三章内完成')
    expect(brief.next_batch_brief.current_chapter_role).toContain('本章只验证夜钟规则第一次显形')
    expect(brief.next_batch_brief.start_checklist[0].detail).toContain('规则反制爽点')
  })

  test('carries camelCase next batch brief through pre-draft brief confirmation', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        nextBatchBrief: {
          chapterRangeLabel: '第8-10章',
          batchGoal: '三章内进入内门视野。',
          readerPayoffPlan: '升级、打脸、规则反制逐章交付。',
          mainlineFocus: '外门危机 -> 内门招揽',
          forbiddenBoundary: '第10章前不得揭露规则源头。',
          startChecklist: [
            { key: 'core_promise', label: '核心承诺', status: 'ok', detail: '主角必须以规则反制兑现逆袭承诺。' },
          ],
          chapters: [
            { chapterNo: 8, title: '外门夜钟', chapterTask: '证明夜钟规则有效。', conflict: '是否相信敌人提示。', endingHook: '钟声倒数。' },
          ],
        },
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '验证夜钟规则。',
          scene_cards: [],
        },
      },
    )
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 8,
          title: '外门夜钟',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        ...brief,
        confirmed_at: '2026-06-10T08:00:00.000Z',
      },
    )

    expect(brief.next_batch_brief.chapter_range_label).toBe('第8-10章')
    expect(brief.next_batch_brief.current_chapter_role).toContain('证明夜钟规则有效')
    expect(context.chapter_target.next_batch_brief.batch_goal).toContain('内门视野')
    expect(context.next_batch_brief.start_checklist[0].detail).toContain('规则反制')
  })

  test('adds longform memory capsule to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '万古长夜' },
      {
        longform_memory_capsule: {
          last_updated_chapter: 7,
          core_promise: '寒门少年以阵法改写宗门秩序。',
          mainline_progress: '外门压迫线推进到试炼前夜。',
          character_states: ['李玄：仍在藏拙，但已经被执事逼到试炼边缘'],
          open_questions: ['残阵缺口为什么会回应旧案禁制'],
          payoff_debts: ['试炼资格被夺后的公开打脸回报'],
          canon_facts: ['残阵缺口不能被普通阵图修复'],
          red_lines: ['主角不能脱离阵法成长线'],
        },
        chapter_target: {
          chapter_no: 8,
          title: '试炼前夜',
          summary: '李玄必须决定是否公开承认残阵缺陷。',
          scene_cards: [],
        },
      },
    )

    expect(brief.longform_memory_capsule.core_promise).toContain('寒门少年')
    expect(brief.longform_memory_capsule.mainline_progress).toContain('试炼前夜')
    expect(brief.longform_memory_capsule.character_states[0]).toContain('李玄')
    expect(brief.longform_memory_capsule.open_questions).toContain('残阵缺口为什么会回应旧案禁制')
    expect(brief.longform_memory_capsule.payoff_debts).toContain('试炼资格被夺后的公开打脸回报')
    expect(brief.longform_memory_capsule.red_lines).toContain('主角不能脱离阵法成长线')
  })

  test('normalizes camelCase longform memory capsule item states in pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '万古长夜' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '试炼前夜',
          summary: '李玄必须决定是否公开承认残阵缺陷。',
          scene_cards: [],
          longformMemoryCapsule: {
            corePromise: '寒门少年以阵法改写宗门秩序。',
            characterStates: [
              { name: '李玄', currentState: '右手阵纹失控，仍被迫藏拙', lastUpdatedChapter: 7 },
            ],
            openQuestions: [
              { name: '旧案禁制', currentState: '残阵缺口为什么会回应旧案禁制', lastUpdatedChapter: 7 },
            ],
            redLines: ['主角不能脱离阵法成长线'],
          },
        },
      },
    )

    expect(brief.longform_memory_capsule.core_promise).toContain('寒门少年')
    expect(brief.longform_memory_capsule.character_states).toContain('李玄：右手阵纹失控，仍被迫藏拙@第7章')
    expect(brief.longform_memory_capsule.open_questions).toContain('旧案禁制：残阵缺口为什么会回应旧案禁制@第7章')
  })

  test('adds oh-story layered memory context to the pre-draft brief and prose prompt', () => {
    const project = { title: '万古长夜', reference_config: {} }
    const contextPackage = {
      layered_memory_context: {
        recent_chapter_details: [
          { chapter_no: 46, summary: '李玄进入旧阵塔，发现残阵会吞掉灵识。', state_changes: ['右手阵纹失控'], foreshadowing: ['旧塔第七层有人影'] },
          { chapter_no: 47, summary: '林青禾有限作证，李玄拿到半枚旧印纹。', state_changes: ['互信仍有边界'], foreshadowing: ['半枚旧印纹'] },
        ],
        ten_chapter_summaries: [
          { range: '第41-50章', core_events: '旧案线从外门审问推进到旧阵塔。', character_state_changes: '李玄从被动自证转为主动追查旧印。' },
        ],
        volume_overview: [
          { volume: '第二卷·旧案回声', mainline_progress: '旧印章、残阵缺口和林家旧案开始合流。', turning_point: '林青禾从旁观者转成有限作证者。' },
        ],
        red_lines: ['不得把林青禾写成无条件盟友', '旧印章完整归属不能提前公开'],
      },
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        conflict: '林青禾只能有限作证，旧印归属仍不能公开。',
        scene_cards: [],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 51, title: '第七层旧影' },
    )

    expect(brief.layered_memory_context.recent_chapter_details[0]).toContain('第46章')
    expect(brief.layered_memory_context.recent_chapter_details[0]).toContain('旧阵塔')
    expect(brief.layered_memory_context.ten_chapter_summaries[0]).toContain('第41-50章')
    expect(brief.layered_memory_context.volume_overview[0]).toContain('第二卷')
    expect(context.chapter_target.layered_memory_context.red_lines).toContain('不得把林青禾写成无条件盟友')
    expect(prompt).toContain('【长篇分层记忆】')
    expect(prompt).toContain('近5章详记')
    expect(prompt).toContain('十章概要')
    expect(prompt).toContain('卷级总览')
    expect(prompt).toContain('旧印章完整归属不能提前公开')
  })

  test('applies oh-story layered memory archive policy to pre-draft brief and prose prompt', () => {
    const project = { title: '万古长夜', reference_config: {} }
    const contextPackage = {
      layered_memory_context: {
        recent_chapter_details: [
          { chapter_no: 44, summary: '旧案外门审问开场。' },
          { chapter_no: 45, summary: '李玄第一次触碰旧印纹。' },
          { chapter_no: 46, summary: '旧阵塔入口打开。' },
          { chapter_no: 47, summary: '林青禾有限作证。' },
          { chapter_no: 48, summary: '半枚旧印纹被确认。' },
          { chapter_no: 49, summary: '残阵缺口回应旧塔禁制。' },
          { chapter_no: 50, summary: '第七层门影出现。' },
        ],
        ten_chapter_summaries: [
          { range: '第41-50章', core_events: '旧案线进入旧阵塔。' },
        ],
        archive_index: [
          { range: '第1-40章', path: '追踪/归档/第001-040章.md', summary: '外门压迫线和旧案前史已压缩归档。' },
        ],
        red_lines: ['旧印章完整归属不能提前公开'],
      },
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        scene_cards: [],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 51, title: '第七层旧影' })

    expect(brief.layered_memory_context.recent_chapter_details).toHaveLength(5)
    expect(brief.layered_memory_context.recent_chapter_details.join('｜')).not.toContain('第44章')
    expect(brief.layered_memory_context.recent_chapter_details.join('｜')).not.toContain('第45章')
    expect(brief.layered_memory_context.recent_chapter_details.join('｜')).toContain('第50章')
    expect(context.chapter_target.layered_memory_context.archive_refs[0]).toContain('追踪/归档/第001-040章.md')
    expect(prompt).toContain('归档索引')
    expect(prompt).toContain('第1-40章')
    expect(prompt).toContain('外门压迫线和旧案前史已压缩归档')
  })

  test('carries oh-story daily progress summary into the next pre-draft brief and prose prompt', () => {
    const project = {
      title: '万古长夜',
      reference_config: {
        story_state: {
          progress_summary: {
            last_completed_chapter: 50,
            completed_chapter_count: 1,
            completed_word_count: 3280,
            active_foreshadowing_count: 3,
            recent_changed_characters: ['李玄', '林青禾'],
            next_outline_status: '已有',
            notes: ['旧印章归属仍不能公开', '第51章先接旧阵塔第七层入口'],
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        scene_cards: [],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 51, title: '第七层旧影' })

    expect(brief.progress_summary.last_completed_chapter).toBe(50)
    expect(brief.progress_summary.active_foreshadowing_count).toBe(3)
    expect(context.chapter_target.progress_summary.notes).toContain('旧印章归属仍不能公开')
    expect(prompt).toContain('【日更进度断点】')
    expect(prompt).toContain('最后完成章节：第50章')
    expect(prompt).toContain('活跃伏笔：3条')
    expect(prompt).toContain('第51章先接旧阵塔第七层入口')
  })

  test('carries oh-story daily context snapshot into the next pre-draft brief and prose prompt', () => {
    const project = {
      title: '万古长夜',
      reference_config: {
        story_state: {
          daily_context_snapshot: {
            current_chapter: 50,
            current_scene: '第七层门影刚露出，李玄停在旧阵塔门前。',
            current_emotion_target: '压迫后的短冷和新疑问',
            writing_changes: ['半枚旧印纹会回应旧影', '林青禾仍只能有限作证'],
            pending_clues: ['第七层门影是谁', '旧印章完整归属不能提前公开'],
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        scene_cards: [],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 51, title: '第七层旧影' })

    expect(brief.daily_context_snapshot.current_chapter).toBe(50)
    expect(brief.daily_context_snapshot.current_scene).toContain('第七层门影')
    expect(context.chapter_target.daily_context_snapshot.pending_clues).toContain('第七层门影是谁')
    expect(context.pre_draft_brief.daily_context_snapshot.writing_changes).toContain('半枚旧印纹会回应旧影')
    expect(prompt).toContain('【日更上下文快照】')
    expect(prompt).toContain('当前位置/章：第50章')
    expect(prompt).toContain('当前位置/场景：第七层门影刚露出')
    expect(prompt).toContain('当前位置/情绪目标：压迫后的短冷和新疑问')
    expect(prompt).toContain('本次写作变更：半枚旧印纹会回应旧影')
    expect(prompt).toContain('待处理线索：第七层门影是谁')
  })

  test('director budget omits longform structure contract content from prose prompt snapshot', () => {
    const project = { title: '万古长夜' }
    const contextPackage = {
      oh_story_director: {
        stage: 'draft_prose',
        readiness: 'ready',
        primary_action: {
          key: 'write_chapter_prose',
          label: '生成章节正文',
        },
        blocking_summary: '无阻塞，按预算执行选用合同。',
        selected_contracts: [
          {
            key: 'story_power',
            reason: '目标阻碍动作反馈XYZ_STORY_POWER_SELECTED',
            detail_level: 'full',
          },
        ],
        suppressed_contracts: [
          {
            key: 'longform_structure_contract',
            reason: '本章只需列名，不带入长合同正文。',
            detail_level: 'omit',
          },
        ],
        prompt_budget_plan: {
          full: ['story_power'],
          compact: ['chapter_blueprint'],
          reference: ['continuity'],
          omit: ['longform_structure_contract'],
        },
      },
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        conflict: '旧阵塔门前出现反制。',
        ending_hook: '门影主动回应。',
        longform_structure_contract: {
          note: '开局埋因XYZ_LONGFORM_SHOULD_BE_OMITTED',
        },
        story_power_contract: {
          execution: '目标阻碍动作反馈XYZ_STORY_POWER_SELECTED',
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '旧塔门前',
            purpose: '承接上一章钩子。',
            conflict: '门影不让李玄靠近。',
          },
        ],
      },
    }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(project, contextPackage, null, { chapter_no: 51, title: '第七层旧影' })

    expect(prompt).toContain('【oh-story 总导演】')
    expect(prompt).toContain('story_power')
    expect(prompt).toContain('目标阻碍动作反馈XYZ_STORY_POWER_SELECTED')
    expect(prompt).toContain('longform_structure_contract')
    expect(prompt).toContain('omit')
    expect(prompt).not.toContain('XYZ_LONGFORM_SHOULD_BE_OMITTED')
  })

  test('director budget keeps longform structure contract content when not omitted from prose prompt snapshot', () => {
    const project = { title: '万古长夜' }
    const contextPackage = {
      oh_story_director: {
        stage: 'draft_prose',
        readiness: 'ready',
        primary_action: {
          key: 'write_chapter_prose',
          label: '生成章节正文',
        },
        selected_contracts: [
          {
            key: 'story_power',
            reason: '目标阻碍动作反馈XYZ_STORY_POWER_SELECTED',
            detail_level: 'full',
          },
        ],
        suppressed_contracts: [],
        prompt_budget_plan: {
          full: ['story_power'],
          compact: ['longform_structure_contract'],
          reference: [],
          omit: [],
        },
      },
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        conflict: '旧阵塔门前出现反制。',
        ending_hook: '门影主动回应。',
        longform_structure_contract: {
          note: '开局埋因XYZ_LONGFORM_SHOULD_BE_INCLUDED',
        },
        story_power_contract: {
          execution: '目标阻碍动作反馈XYZ_STORY_POWER_SELECTED',
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '旧塔门前',
            purpose: '承接上一章钩子。',
            conflict: '门影不让李玄靠近。',
          },
        ],
      },
    }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(project, contextPackage, null, { chapter_no: 51, title: '第七层旧影' })

    expect(prompt).toContain('【oh-story 总导演】')
    expect(prompt).toContain('目标阻碍动作反馈XYZ_STORY_POWER_SELECTED')
    expect(prompt).toContain('XYZ_LONGFORM_SHOULD_BE_INCLUDED')
  })

  test('carries oh-story foreshadowing consistency radar into the next pre-draft brief and prose prompt', () => {
    const project = {
      title: '万古长夜',
      reference_config: {
        story_state: {
          foreshadowing_status: {
            旧印章完整归属: {
              status: 'active',
              planted_chapter: 1,
              last_touched_chapter: 20,
              planned_payoff_chapter: 60,
              note: '旧印章完整归属不能提前公开，只能先验证半枚旧印纹。',
            },
            第七层门影是谁: {
              status: 'active',
              planted_chapter: 50,
              last_touched_chapter: 50,
              note: '第51章只推进身份轮廓。',
            },
            已回收旧门牌: {
              status: 'paid',
              planted_chapter: 12,
              payoff_chapter: 18,
              note: '已经回收，不再作为债务。',
            },
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 52,
        title: '旧印回声',
        summary: '李玄继续验证旧印章和第七层门影。',
        scene_cards: [],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 52, title: '旧印回声' })

    expect(brief.foreshadowing_consistency_radar.overdue_count).toBe(1)
    expect(brief.foreshadowing_consistency_radar.overdue.join('｜')).toContain('旧印章完整归属')
    expect(brief.foreshadowing_consistency_radar.overdue.join('｜')).toContain('已延迟51章')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).toContain('第七层门影是谁')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).not.toContain('已回收旧门牌')
    expect(brief.foreshadowing_consistency_radar.scope_rules.join('｜')).toContain('只确认本轮新增/推进/回收的伏笔')
    expect(brief.foreshadowing_consistency_radar.scope_rules.join('｜')).toContain('不得在日更流程中通读所有 session 或扫描全部正文做全量伏笔审计')
    expect(brief.foreshadowing_consistency_radar.scope_rules.join('｜')).toContain('/story-review')
    expect(context.chapter_target.foreshadowing_consistency_radar.overdue_count).toBe(1)
    expect(prompt).toContain('【伏笔一致性雷达】')
    expect(prompt).toContain('日更范围：只确认本轮新增/推进/回收的伏笔')
    expect(prompt).toContain('不得在日更流程中通读所有 session 或扫描全部正文做全量伏笔审计')
    expect(prompt).toContain('全量伏笔审计只在 /story-review')
    expect(prompt).toContain('超期伏笔')
    expect(prompt).toContain('旧印章完整归属')
    expect(prompt).toContain('计划回收：第60章')
    expect(prompt).toContain('旧印章完整归属不能提前公开')
  })

  test('carries oh-story foreshadowing status semantics into the next pre-draft brief and prose prompt', () => {
    const project = {
      title: '万古长夜',
      reference_config: {
        story_state: {
          foreshadowing_status: {
            血契真正代价: {
              status: '未埋',
              planned_payoff_chapter: 60,
              note: '只在本卷规划中存在，正文尚未正式埋下。',
            },
            第七层门影是谁: {
              status: '已埋',
              planted_chapter: 40,
              last_touched_chapter: 41,
              note: '已经用门影和旧印回声埋下，下一章只推进一层身份轮廓。',
            },
            已回收旧门牌: {
              status: '已回收',
              planted_chapter: 12,
              payoff_chapter: 18,
              note: '已经在第18章回收，不应再报警。',
            },
            错过血契窗口: {
              status: '已过期',
              planted_chapter: 36,
              planned_payoff_chapter: 41,
              note: '错过原定回收窗口，需要 story-review 或显式修复。',
            },
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 42,
        title: '旧印回声',
        summary: '李玄继续验证旧印章和第七层门影。',
        scene_cards: [],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 42, title: '旧印回声' })

    expect(brief.foreshadowing_consistency_radar.overdue_count).toBe(1)
    expect(brief.foreshadowing_consistency_radar.overdue.join('｜')).toContain('错过血契窗口')
    expect(brief.foreshadowing_consistency_radar.overdue.join('｜')).toContain('状态：已过期')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).toContain('血契真正代价')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).toContain('状态：未埋')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).toContain('第七层门影是谁')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).toContain('状态：已埋')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).not.toContain('已回收旧门牌')
    expect(brief.foreshadowing_consistency_radar.status_rules.join('｜')).toContain('未埋、已埋、已回收属于正常状态')
    expect(brief.foreshadowing_consistency_radar.status_rules.join('｜')).toContain('只有已过期需要 /story-review 或显式修复')
    expect(brief.foreshadowing_consistency_radar.status_rules.join('｜')).toContain('SessionStart 不应因未埋、已埋或已回收报警')
    expect(prompt).toContain('伏笔状态语义')
    expect(prompt).toContain('未埋、已埋、已回收属于正常状态')
    expect(prompt).toContain('只有已过期需要 /story-review 或显式修复')
    expect(prompt).toContain('SessionStart 不应因未埋、已埋或已回收报警')
  })

  test('carries oh-story foreshadowing density warnings into the next pre-draft brief and prose prompt', () => {
    const foreshadowingStatus = Object.fromEntries(
      Array.from({ length: 16 }, (_, index) => [
        `第三卷暗线${index + 1}`,
        {
          status: 'active',
          planted_chapter: 41 + index,
          volume_no: 3,
          note: `第三卷暗线${index + 1}仍待推进。`,
        },
      ]),
    )
    const project = {
      title: '万古长夜',
      reference_config: {
        story_state: {
          foreshadowing_status: foreshadowingStatus,
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 58,
        title: '暗线过密',
        summary: '李玄进入第三卷密集伏笔段。',
        scene_cards: [],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 58, title: '暗线过密' })

    expect(brief.foreshadowing_consistency_radar.active_count).toBe(16)
    expect(brief.foreshadowing_consistency_radar.density_warnings.join('｜')).toContain('SC-FORESHADOW')
    expect(brief.foreshadowing_consistency_radar.density_warnings.join('｜')).toContain('第3卷')
    expect(brief.foreshadowing_consistency_radar.density_warnings.join('｜')).toContain('太密')
    expect(context.chapter_target.foreshadowing_consistency_radar.density_warnings.join('｜')).toContain('16条')
    expect(prompt).toContain('伏笔密度提醒')
    expect(prompt).toContain('SC-FORESHADOW')
    expect(prompt).toContain('第3卷活跃伏笔16条')
  })

  test('injects story-state style fingerprint as a prose prompt handoff anchor', () => {
    const project = {
      title: '万古长夜',
      reference_config: {
        story_state: {
          style_fingerprint: '文风指纹：目标句长带 20-42 字，旧上下文已锁定，中长句呼吸为主。',
          style_fingerprint_contract: {
            target_sentence_band: '20-42字',
            policy: '每章写前按文风指纹确定句长节奏，不以可能已漂移的上一章句式节奏为准。',
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        scene_cards: [],
      },
    }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(project, contextPackage, null, { chapter_no: 51, title: '第七层旧影' })

    expect(prompt).toContain('【文风指纹断点】')
    expect(prompt).toContain('目标句长带：20-42字')
    expect(prompt).toContain('旧上下文已锁定')
    expect(prompt).toContain('不以可能已漂移的上一章句式节奏为准')
  })

  test('adds story unit context to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        story_unit_context: {
          title: '试炼前夜剧情单元',
          chapter_range_label: '第7-12章',
          current_chapter_role: '入口钩子',
          unit_goal: '六章内完成外门试炼前夜事件包。',
          entry_hook: '第7章以试炼倒计时开场。',
          pressure_escalation: ['执事设局', '试炼规则反噬'],
          mini_climax_payoff: '第10章公开打脸执事。',
          setup_and_storyline: ['阵盘第二道裂纹埋线', '外门压迫主线阶段兑现'],
          exit_hook: '第12章内门长老亲自点名。',
          forbidden_advance: ['不得提前解决内门招揽条件'],
        },
        chapter_target: {
          chapter_no: 7,
          title: '试炼倒计时',
          summary: '试炼前夜规则开始收紧。',
          scene_cards: [],
        },
      },
    )

    expect(brief.story_unit_context.title).toBe('试炼前夜剧情单元')
    expect(brief.story_unit_context.current_chapter_role).toBe('入口钩子')
    expect(brief.story_unit_context.unit_goal).toContain('外门试炼前夜')
    expect(brief.story_unit_context.pressure_escalation).toContain('执事设局')
    expect(brief.story_unit_context.mini_climax_payoff).toContain('公开打脸')
    expect(brief.story_unit_context.forbidden_advance).toContain('不得提前解决内门招揽条件')
  })

  test('carries camelCase story unit context through pre-draft brief confirmation', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        storyUnitContext: {
          title: '试炼前夜剧情单元',
          chapterRangeLabel: '第7-12章',
          currentChapterRole: '压力升级/推进',
          unitGoal: '六章内完成外门试炼前夜事件包。',
          pressureEscalation: ['执事设局'],
          setupAndStoryline: ['阵盘第二道裂纹埋线'],
          miniClimaxPayoff: '第10章公开打脸执事。',
          exitHook: '第12章内门长老亲自点名。',
          forbiddenAdvance: ['不得提前解决内门招揽条件'],
        },
        chapter_target: {
          chapter_no: 7,
          title: '试炼倒计时',
          summary: '试炼前夜规则开始收紧。',
          scene_cards: [],
        },
      },
    )
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 7,
          title: '试炼倒计时',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        ...brief,
        confirmed_at: '2026-06-10T08:00:00.000Z',
      },
    )

    expect(brief.story_unit_context.title).toBe('试炼前夜剧情单元')
    expect(brief.story_unit_context.current_chapter_role).toBe('压力升级/推进')
    expect(context.chapter_target.story_unit_context.current_chapter_role).toBe('压力升级/推进')
    expect(context.story_unit_context.forbidden_advance).toContain('不得提前解决内门招揽条件')
  })

  test('merges a confirmed pre-draft brief into chapter generation context', () => {
    const confirmedAt = '2026-06-03T10:00:00.000Z'
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '守则初读',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_goal: '读懂宿舍守则并发现第零条规则。',
        reader_promise: '用智力拆规则，给读者一次反转。',
        core_conflict: '是否相信林晓提供的旧规则。',
        emotional_curve: '紧张 -> 试探 -> 惊疑',
        key_settings: ['宿舍守则'],
        forbidden_content: ['幕后主神'],
        scene_briefs: [{ scene_no: 1, title: '守则册', reader_payoff: '发现漏洞' }],
        storyline_advances: ['规则之源调查'],
        storyline_plants: ['第零条规则回收线'],
        storyline_payoffs: ['林晓求生支线'],
        storyline_forbidden: ['编织者真名'],
        meme_strategy: {
          intensity: '轻度',
          allowed_functions: ['主角吐槽', '规则怪谈弹幕感'],
          forbidden_usage: ['死亡场景不玩梗'],
        },
        reader_retention_brief: {
          opening_hook: '第一段直接落在十点门槛判定。',
          payoff_promise: '让读者看到蛮力被规则反制。',
          information_gap: '门外学生为什么能在规则时间后出现。',
          emotional_reward: '紧张后给一次智者识破规则的回报。',
          short_drama_scene: '玻璃门内外对峙，黑暗贴着门槛爬动。',
          ending_question: '湿漉漉学生到底是求救者还是规则诱饵。',
          forbidden_cliches: ['不要用长篇背景解释替代现场危机'],
        },
        reader_expectation_ledger: {
          chapter_promise: '本章必须让读者看到蛮力被规则反制。',
          must_deliver: [
            { key: 'payoff_promise', label: '爽点承诺', type: 'payoff', text: '让读者看到蛮力被规则反制。' },
            { key: 'ending_hook', label: '章末追读', type: 'hook', text: '湿漉漉学生到底是求救者还是规则诱饵。' },
          ],
          keep_alive: [
            { key: 'open_question_1', label: '保留悬念', type: 'question', text: '广播是谁发出的。' },
          ],
          must_not_break: ['不能整章只铺设定不兑现规则反制'],
        },
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          immutable_rules: ['超人力量不能无代价碾压规则'],
          flexible_zones: ['副本题材可换，但必须服务规则破局主线'],
        },
        innovation_brief: {
          chapter_angle: '超人硬闯被规则边界反噬。',
          execution_points: ['用饼干碎屑验证门槛清除规则'],
          differentiation_guardrails: ['不得写成普通开挂碾压'],
          ip_adaptation_hooks: ['玻璃门内外对峙'],
        },
        longform_battle_context: {
          status: 'needs_action',
          summary: '先修复核心守恒。',
          risk_chips: ['核心偏移'],
          primary_action: { key: 'open_quality_revision', label: '进入质检修订', reason: '核心矛盾要回到规则判定反制。' },
          risk_lanes: [
            {
              key: 'story_core',
              label: '核心守恒',
              status: 'warn',
              score: 68,
              detail: '核心偏移：超人力量被写成普通无敌碾压。',
              required_action: '本章必须写出规则判定反制蛮力。',
            },
          ],
        },
        next_batch_brief: {
          chapter_range_label: '第2-4章',
          batch_goal: '三章内完成午夜校园第一轮规则试探。',
          reader_payoff_plan: '每章一次规则显形或力量反制。',
          mainline_focus: '规则初识 -> 规则漏洞',
          forbidden_boundary: '不得提前揭露规则源头。',
          current_chapter_role: '本章负责读懂宿舍守则。',
        },
        story_unit_context: {
          title: '午夜校园第一轮规则试探剧情单元',
          chapter_range_label: '第2-6章',
          current_chapter_role: '压力升级/推进',
          unit_goal: '五章内完成第一条规则的验证、误判和小回收。',
          mini_climax_payoff: '第5章让李超用规则漏洞反制宿管。',
          exit_hook: '第6章第零条规则显形。',
          forbidden_advance: ['不得提前揭露广播源头'],
        },
        longform_memory_capsule: {
          core_promise: '超人力量和规则判定持续碰撞。',
          character_states: ['李超：力量觉醒但不懂规则'],
          open_questions: ['广播是谁发出的'],
          payoff_debts: ['规则边界反制蛮力'],
          red_lines: ['超人力量不能无代价碾压规则'],
        },
        word_budget: '标准章 3000 字',
        ending_hook: '镜子里出现第四个人。',
        confirmed_at: confirmedAt,
      },
    )

    expect(context.pre_draft_brief.confirmed_at).toBe(confirmedAt)
    expect(context.chapter_target.summary).toContain('读懂宿舍守则')
    expect(context.chapter_target.conflict).toContain('林晓')
    expect(context.chapter_target.ending_hook).toContain('镜子')
    expect(context.chapter_target.reader_promise).toContain('反转')
    expect(context.chapter_target.scene_cards[0].reader_payoff).toContain('漏洞')
    expect(context.chapter_target.storyline_advances).toContain('规则之源调查')
    expect(context.chapter_target.storyline_plants).toContain('第零条规则回收线')
    expect(context.chapter_target.storyline_payoffs).toContain('林晓求生支线')
    expect(context.chapter_target.storyline_forbidden).toContain('编织者真名')
    expect(context.chapter_target.meme_strategy.allowed_functions).toContain('主角吐槽')
    expect(context.chapter_target.reader_retention_brief.opening_hook).toContain('十点门槛')
    expect(context.chapter_target.reader_retention_brief.payoff_promise).toContain('蛮力')
    expect(context.chapter_target.reader_retention_brief.short_drama_scene).toContain('玻璃门')
    expect(context.chapter_target.reader_expectation_ledger.must_deliver[0].text).toContain('蛮力被规则反制')
    expect(context.chapter_target.reader_expectation_ledger.keep_alive[0].text).toContain('广播')
    expect(context.chapter_target.longform_compass.immutable_rules).toContain('超人力量不能无代价碾压规则')
    expect(context.longform_compass.reader_promise).toContain('规则判定')
    expect(context.chapter_target.longform_battle_context.risk_chips).toContain('核心偏移')
    expect(context.chapter_target.longform_battle_context.risk_lanes[0].required_action).toContain('规则判定反制蛮力')
    expect(context.longform_battle_context.primary_action.label).toBe('进入质检修订')
    expect(context.chapter_target.innovation_brief.chapter_angle).toContain('规则边界反噬')
    expect(context.chapter_target.innovation_brief.execution_points).toContain('用饼干碎屑验证门槛清除规则')
    expect(context.chapter_target.next_batch_brief.current_chapter_role).toContain('读懂宿舍守则')
    expect(context.next_batch_brief.batch_goal).toContain('第一轮规则试探')
    expect(context.chapter_target.story_unit_context.current_chapter_role).toContain('压力升级')
    expect(context.chapter_target.story_unit_context.mini_climax_payoff).toContain('反制宿管')
    expect(context.story_unit_context.title).toContain('午夜校园')
    expect(context.chapter_target.longform_memory_capsule.character_states[0]).toContain('李超')
    expect(context.longform_memory_capsule.open_questions).toContain('广播是谁发出的')
  })

  test('merges camelCase confirmed style sample strategy into downstream prose contracts', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 19,
          title: '雨巷旧证',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 19,
        chapter_goal: '李玄用雨巷旧证逼执事露出换证破绽。',
        core_conflict: '执事连续压问，旁观弟子开始倒向他。',
        chapterBlueprint: {
          targetEmotion: '压迫后信息差反杀',
          contentOutline: {
            cause: '执事抢先定义证词。',
            development: '李玄发现雨巷旧证和袖口旧印对应。',
            turn: '林青禾顶住压力说出旧证来源。',
            climax: '李玄当众反证执事换证。',
            ending: '旧证背面出现内门编号。',
          },
          plotLines: {
            logicLine: '旧证 -> 袖口旧印 -> 换证破绽',
          },
          characterOrder: ['执事', '林青禾', '李玄'],
          costAndReward: '代价：林青禾公开得罪执事；收益：李玄夺回解释权。',
        },
        styleSampleStrategy: {
          selectedEmotionModule: 'M03 信息差反杀',
          rhythmReference: '三轮压问后半拍亮证据，爆发后短冷却接章尾钩子',
          styleProfileSummary: '短句推进审讯压力，对白留半拍。',
          matchedChapterTechniques: ['三轮压问', '半拍亮证据'],
          styleDirectives: ['对白短促，动作承接情绪余波'],
          samples: [{ sample_key: '雨巷审讯样章', unsafe_direct_phrases: ['样章原句不能照搬'] }],
          doNotCopy: ['不得复制雨巷样章桥段'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.chapter_target.style_sample_strategy.selectedEmotionModule).toContain('信息差反杀')
    expect(context.chapter_target.benchmark_recall_brief.rhythm_reference).toContain('三轮压问')
    expect(context.chapter_target.benchmark_recall_brief.matched_chapter_techniques).toContain('半拍亮证据')
    expect(context.chapter_target.style_boundary_contract.copy_boundary_rules.join('｜')).toContain('不得复制雨巷样章桥段')
    expect(context.chapter_target.style_boundary_contract.copy_boundary_rules.join('｜')).toContain('样章原句不能照搬')
    expect(context.chapter_target.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('三轮压问')
    expect(context.chapter_target.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('半拍亮证据')
  })

  test('keeps confirmed pre-draft gates in top-level pre_draft_brief for downstream repairs', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 19,
          title: '雨巷旧证',
          summary: '旧目标',
          scene_cards: [
            {
              title: '雨巷审讯',
              purpose: '李玄顶住三轮压问，半拍亮出旧证。',
              conflict: '执事抢先定义旧证为伪证。',
              reader_payoff: '旧证反杀，执事失去话语权。',
            },
          ],
        },
      },
      {
        chapter_no: 19,
        chapter_goal: '李玄用雨巷旧证逼执事露出换证破绽。',
        core_conflict: '执事连续压问，旁观弟子开始倒向他。',
        styleSampleStrategy: {
          selectedEmotionModule: 'M03 信息差反杀',
          rhythmReference: '三轮压问后半拍亮证据，爆发后短冷却接章尾钩子',
          styleProfileSummary: '短句推进审讯压力，对白留半拍。',
          matchedChapterTechniques: ['三轮压问', '半拍亮证据'],
          styleDirectives: ['对白短促，动作承接情绪余波'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('三轮压问')
    expect(context.pre_draft_brief.benchmark_recall_brief.selected_emotion_module).toContain('信息差反杀')
    expect(context.pre_draft_brief.write_preparation_brief.execution_order.join('｜')).toContain('Step 2.2 状态筛选')
    expect(context.pre_draft_brief.style_sample_strategy.selectedEmotionModule || context.pre_draft_brief.style_sample_strategy.selected_emotion_module).toContain('信息差反杀')
    expect(context.preDraftBrief).toBe(context.pre_draft_brief)
  })

  test('merges camelCase confirmed signature scene brief into prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 20,
          title: '旧证审判',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 20,
        chapter_goal: '李玄把旧证缺页变成当众审判会长的铁证。',
        signatureSceneBrief: {
          signatureScene: '雨巷长案前，李玄把带血旧证拍进烛火阴影里，满堂执事同时失声。',
          sceneRepairTarget: '补足本章可截图传播的审判场面。',
          readerPayoff: '证据反杀，会长第一次失去话语权。',
          storylineService: '推进旧证换人主线并把矛头指向禁库。',
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      context,
      null,
      { chapter_no: 20, title: '旧证审判' },
    )

    expect(context.chapter_target.signature_scene_brief.signature_scene).toContain('雨巷长案')
    expect(context.chapter_target.signature_scene_brief.scene_repair_target).toContain('可截图传播')
    expect(prompt).toContain('【本章标志性场面补位】')
    expect(prompt).toContain('雨巷长案前')
    expect(prompt).toContain('必须把 signature_scene 写成正文核心场面')
  })

  test('preserves runtime camelCase chapterTarget when confirming pre-draft brief', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapterTarget: {
          chapterNo: 21,
          title: '旧证追问',
          summary: '李玄继续追问旧证缺页。',
          conflict: '执事试图把缺页解释成抄录错误。',
          endingHook: '缺页背面露出会长私印。',
          readerRetentionBrief: {
            openingHook: '开篇先让会长私印差点被烧掉。',
            payoffPromise: '李玄用旧证缺页反压执事。',
            endingQuestion: '会长私印为什么出现在缺页背面。',
          },
          sceneCards: [],
        },
      },
      {
        chapter_no: 21,
        chapter_goal: '李玄把旧证缺页继续推进到会长私印。',
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      context,
      null,
      { chapter_no: 21, title: '旧证追问' },
    )

    expect(context.chapter_target.chapterNo).toBe(21)
    expect(context.chapter_target.reader_retention_brief.opening_hook).toContain('会长私印差点被烧掉')
    expect(context.chapter_target.reader_retention_brief.ending_question).toContain('会长私印为什么')
    expect(prompt).toContain('开篇先让会长私印差点被烧掉')
    expect(prompt).toContain('会长私印为什么出现在缺页背面')
  })

  test('merges camelCase confirmed reader retention brief into rhythm and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 21,
          title: '门槛旧影',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 21,
        chapter_goal: '李玄在雨巷门槛处验证旧影规则。',
        readerRetentionBrief: {
          openingHook: '第一段直接落在雨巷门槛旧影回头。',
          payoffPromise: '读者看到李玄用旧证反制执事。',
          informationGap: '旧影为什么只在门槛内回头。',
          emotionalReward: '压迫后给一次证据反杀的爽感。',
          shortDramaScene: '雨巷门槛内外对峙，烛火把旧影压成两半。',
          endingQuestion: '旧影回头后指向的禁库门牌是谁留下的。',
          retentionPillars: {
            upgrade: '李玄拿到禁库门牌权限。',
            resourcePressure: '旧证缺页只能换一次开门机会。',
            goalStack: '大目标 + 小目标 + 假目标：查禁库，先过雨巷门槛。',
            mysteryUnlock: '旧影为什么只在门槛内回头。',
          },
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      context,
      null,
      { chapter_no: 21, title: '门槛旧影' },
    )

    expect(context.chapter_target.reader_retention_brief.opening_hook).toContain('雨巷门槛')
    expect(context.chapter_target.reader_retention_brief.ending_question).toContain('禁库门牌')
    expect(context.chapter_target.reader_retention_brief.retention_pillars.goal_stack).toContain('大目标 + 小目标 + 假目标')
    expect(context.chapter_target.serial_rhythm_brief.opening_hook_deadline).toContain('雨巷门槛')
    expect(context.chapter_target.serial_rhythm_brief.ending_hook_guardrail).toContain('禁库门牌')
    expect(prompt).toContain('执行 chapter_target.reader_retention_brief')
    expect(prompt).toContain('留存四大支柱')
    expect(prompt).toContain('升级、资源困境、目标、解密')
    expect(prompt).toContain('第一段直接落在雨巷门槛旧影回头')
    expect(prompt).toContain('旧影回头后指向的禁库门牌')
  })

  test('normalizes existing camelCase reader drop risk brief during confirmed merge', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 22,
          title: '雨巷迟疑',
          summary: '旧目标',
          scene_cards: [],
          readerDropRiskBrief: {
            dropPoints: ['开篇三百字没有现场危险，读者会以为只是复盘。'],
            pullPoints: ['门槛旧影回头时立刻给出未解问题。'],
            repairActions: ['开篇直接写旧影拦门，中段用证据推进，章末留下禁库门牌。'],
            openingGuardrail: '前 300 字必须让旧影拦门并压出危险。',
            middleGuardrail: '中段必须用旧证推进，而不是解释设定。',
            endingGuardrail: '章末必须留下禁库门牌问题。',
          },
        },
      },
      {
        chapter_no: 22,
        chapter_goal: '李玄在雨巷门槛处验证旧影规则。',
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.chapter_target.reader_drop_risk_brief.opening_guardrail).toContain('旧影拦门')
    expect(context.chapter_target.reader_drop_risk_brief.middle_guardrail).toContain('旧证推进')
    expect(context.chapter_target.reader_drop_risk_brief.ending_guardrail).toContain('禁库门牌')
    expect(context.reader_drop_risk_brief.drop_points).toContain('开篇三百字没有现场危险，读者会以为只是复盘。')
  })

  test('merges camelCase confirmed innovation brief into prose context', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 22,
          title: '旧印反制',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 22,
        chapter_goal: '李玄用旧印规则代价反制执事。',
        innovationBrief: {
          chapterAngle: '规则代价反差：越强行抢证，旧印反噬越明显。',
          executionPoints: ['让执事抢证动作触发旧印反噬，而不是普通争抢。'],
          differentiationGuardrails: ['不得写成普通证据摊牌。'],
          ipAdaptationHooks: ['旧印在掌心倒转，雨巷长案上的烛火同时变青。'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      context,
      null,
      { chapter_no: 22, title: '旧印反制' },
    )

    expect(context.chapter_target.innovation_brief.chapter_angle).toContain('规则代价反差')
    expect(context.chapter_target.innovation_brief.execution_points).toContain('让执事抢证动作触发旧印反噬，而不是普通争抢。')
    expect(context.chapter_target.innovation_brief.differentiation_guardrails).toContain('不得写成普通证据摊牌。')
    expect(context.chapter_target.innovation_brief.ip_adaptation_hooks).toContain('旧印在掌心倒转，雨巷长案上的烛火同时变青。')
    expect(prompt).toContain('执行 chapter_target.innovation_brief')
    expect(prompt).toContain('规则代价反差')
    expect(prompt).toContain('旧印在掌心倒转')
  })

  test('merges camelCase confirmed longform compass into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 2,
        chapter_goal: '验证十点门槛。',
        longformCompass: {
          readerPromise: '超人力量必须持续撞上规则判定。',
          coreConflict: '蛮力破局与规则边界互相反制。',
          immutableRules: ['超人力量不能变成无代价清场'],
          flexibleZones: ['副本可变化，但必须服务规则破局主线'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.longformCompass.readerPromise).toContain('规则判定')
    expect(context.chapter_target.longform_compass.immutable_rules).toContain('超人力量不能变成无代价清场')
    expect(context.longform_compass.axes.find((axis: any) => axis.key === 'core_conflict')?.value).toContain('规则边界')
  })

  test('merges camelCase confirmed reader expectation ledger into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 9,
          title: '账册启封',
          scene_cards: [],
        },
      },
      {
        chapter_no: 9,
        readerExpectationLedger: {
          chapterPromise: '本章必须兑现旧案账册。',
          mustDeliver: [
            { key: 'ledger_payoff', label: '读者期待', type: 'payoff', text: '旧案账册必须被打开。' },
          ],
          keepAlive: [
            { key: 'old_case_backer', label: '保留悬念', type: 'question', text: '旧案幕后供奉是谁。' },
          ],
          mustNotBreak: ['不能提前公开供奉身份'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.chapter_target.reader_expectation_ledger.chapter_promise).toContain('旧案账册')
    expect(context.chapter_target.reader_expectation_ledger.must_deliver[0].text).toContain('旧案账册必须被打开')
    expect(context.chapter_target.reader_expectation_ledger.keep_alive[0].text).toContain('旧案幕后供奉是谁')
    expect(context.chapter_target.reader_expectation_ledger.must_not_break).toContain('不能提前公开供奉身份')
  })

  test('merges confirmed core contract radar into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 2,
        chapter_goal: '验证十点门槛。',
        core_contract_radar: {
          summary: '本章必须把超人力量撞上规则判定写成可见事件。',
          must_serve: ['超人力量和规则判定持续碰撞', '蛮力破局与规则判定的对抗'],
          no_drift: ['不能把规则怪谈写成纯打怪'],
          repair_focus: ['补足规则判定反制蛮力'],
          checks: [{ key: 'reader_promise', label: '读者承诺', status: 'warn', reason: '碰撞不够可见' }],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.core_contract_radar.must_serve).toContain('超人力量和规则判定持续碰撞')
    expect(context.chapter_target.core_contract_radar.no_drift).toContain('不能把规则怪谈写成纯打怪')
    expect(context.core_contract_radar.repair_focus).toContain('补足规则判定反制蛮力')
  })

  test('merges camelCase confirmed core contract radar into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 2,
        chapter_goal: '验证十点门槛。',
        coreContractRadar: {
          summary: '本章必须把规则反制爽点写成现场事件。',
          mustServe: ['读者承诺必须维持规则反制爽点'],
          noDrift: ['不能把校园怪谈改写成纯战斗副本'],
          repairFocus: ['补足规则判定压住蛮力的可见代价'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.coreContractRadar.mustServe).toContain('读者承诺必须维持规则反制爽点')
    expect(context.chapter_target.core_contract_radar.no_drift).toContain('不能把校园怪谈改写成纯战斗副本')
    expect(context.core_contract_radar.repair_focus).toContain('补足规则判定压住蛮力的可见代价')
  })

  test('merges camelCase confirmed longform battle context into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 2,
        chapter_goal: '验证十点门槛。',
        longformBattleContext: {
          status: 'needs_action',
          summary: '本章必须把长篇核心拉回规则反制。',
          riskChips: ['核心漂移', '读者拉力弱'],
          primaryAction: {
            key: 'repair_story_core',
            label: '修复核心守恒',
            reason: '正文必须让超人力量被规则判定反制。',
          },
          riskLanes: [
            {
              key: 'story_core',
              label: '核心守恒',
              status: 'warn',
              detail: '核心漂移：超人力量像普通无敌流。',
              requiredAction: '写出规则判定压住蛮力的现场代价。',
            },
          ],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.longformBattleContext.riskChips).toContain('核心漂移')
    expect(context.chapter_target.longform_battle_context.summary).toContain('长篇核心拉回规则反制')
    expect(context.longform_battle_context.risk_lanes[0].required_action).toContain('规则判定压住蛮力')
  })

  test('builds storyline context in the chapter context package', () => {
    const contextPackageSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/chapter-context-package.ts'), 'utf8')
    const outlineSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/outline-blueprint-contracts.ts'), 'utf8')
    const handoffSource = readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/core-handoff-sync-reports.ts'), 'utf8')
    const storylineSource = [contextPackageSource, outlineSource, handoffSource].join('\n')

    expect(storylineSource).toContain('storyline_context')
    expect(storylineSource).toContain('STORYLINE_TYPES')
    expect(storylineSource).toContain('storylineAdvances')
    expect(storylineSource).toContain('storylineForbidden')
  })
})

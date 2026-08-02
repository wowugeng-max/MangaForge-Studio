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

describe('chapter pre-draft brief regression a a', () => {
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

})

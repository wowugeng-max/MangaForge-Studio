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

describe('readability meme pipeline a a', () => {
  test('builds serial momentum brief when story loop expansion stays in the same small world', () => {
    const storyLoopContract = {
      map_transition_rules: [
        '新地图 = 新环境 + 新角色 + 新规则 + 新目标 + 新冲突。',
        '换地图后前5章必须快速建立新的代入感和期待感。',
      ],
      nested_loop_rules: [
        '小循环 -> 中循环 -> 大循环。',
        '小循环中必须铺垫大循环的期待。',
      ],
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '维修铺旧单',
          chapter_summary: '主角继续待在旧城维修铺，接待同一类客户，核对上一批报废设备登记。',
          conflict: '客户要求主角继续说明普通维修流程。',
          ending_hook: '主角把旧登记表收好，等待下一位客户进门。',
          raw_payload: {
            chapter_blueprint: {
              story_loop_contract: storyLoopContract,
              content_outline: {
                cause: '同类客户又带来旧设备。',
                development: '主角在维修铺解释检测流程。',
                climax: '客户接受普通登记。',
                ending: '主角继续守着维修铺等下一位客户。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '协会窗口回执',
          chapter_summary: '主角仍在旧城协会窗口处理同一批回执，工作人员让他继续排队。',
          conflict: '窗口规则要求主角补同一份表格。',
          ending_hook: '回执盖章后，主角回到维修铺继续等待。',
          raw_payload: {
            chapter_blueprint: {
              story_loop_contract: storyLoopContract,
              content_outline: {
                cause: '协会窗口叫到他的号码。',
                development: '主角递交同一批维修回执。',
                climax: '工作人员盖章确认。',
                ending: '主角拿回回执，回维修铺继续等待。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '同类设备复核',
          chapter_summary: '主角继续修同类报废设备，流程仍是登记、检测、报价，没有打开更大的目标。',
          conflict: '客户质疑报价，要求他重复解释维修周期。',
          ending_hook: '报价单放回桌上，主角继续等下一件同类旧设备。',
          raw_payload: {
            chapter_blueprint: {
              story_loop_contract: storyLoopContract,
              content_outline: {
                cause: '又一件同类设备送到维修铺。',
                development: '主角重复登记、检测、报价。',
                climax: '客户暂时接受报价。',
                ending: '主角继续等待下一件同类旧设备。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('world_expansion_stall_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('世界观扩展')
    expect(brief?.next_actions.join('；')).toContain('新地图')
    expect(brief?.next_actions.join('；')).toContain('新势力')
    expect(brief?.next_actions.join('；')).toContain('大循环')
  })
  test('does not flag world expansion stall when chapters open new map, faction and rules', () => {
    const storyLoopContract = {
      map_transition_rules: [
        '新地图 = 新环境 + 新角色 + 新规则 + 新目标 + 新冲突。',
        '换地图后前5章必须快速建立新的代入感和期待感。',
      ],
      nested_loop_rules: [
        '小循环 -> 中循环 -> 大循环。',
        '小循环中必须铺垫大循环的期待。',
      ],
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '赤炉城新单' },
      [
        {
          chapter_no: 16,
          title: '入赤炉城',
          chapter_summary: '主角离开旧城维修铺，进入新地图赤炉城，炉烟、矿车和城门税契打开新环境。',
          conflict: '赤炉城城门新规则要求外来维修师先交炼炉保。',
          ending_hook: '旧城税契背面露出赤炉城矿脉账册入口，下一目标转向大循环资源黑幕。',
          raw_payload: {
            chapter_blueprint: {
              story_loop_contract: storyLoopContract,
              content_outline: {
                cause: '旧城订单指向赤炉城。',
                development: '主角进入赤炉城，看到炉烟、矿车和城门税契。',
                climax: '赤炉城炼炉保规则拦住他。',
                ending: '矿脉账册入口露出，大循环资源黑幕被点亮。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '铸堂掌炉人',
          chapter_summary: '新势力铸堂掌炉人出面，要求主角在赤炉城规则下证明旧件价值。',
          conflict: '铸堂掌炉人和协会高层争夺第一块炉牌归属。',
          ending_hook: '掌炉人递出新势力名单，下一章必须查清谁控制资源门槛。',
          raw_payload: {
            chapter_blueprint: {
              story_loop_contract: storyLoopContract,
              content_outline: {
                cause: '主角拿税契找铸堂登记。',
                development: '铸堂掌炉人和协会高层同时压价。',
                climax: '第一块炉牌归属变成新势力冲突。',
                ending: '新势力名单指向资源门槛背后的控制者。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '炼炉保新规',
          chapter_summary: '赤炉城炼炉保、城规和资源门槛逐步展开，主角拿到通往矿脉账册的第一条规则漏洞。',
          conflict: '城规规定外来者不得直接触碰矿脉旧件。',
          ending_hook: '规则漏洞只打开半扇门，大循环期待继续指向资源黑幕和更高层势力。',
          raw_payload: {
            chapter_blueprint: {
              story_loop_contract: storyLoopContract,
              content_outline: {
                cause: '主角复核炼炉保条文。',
                development: '城规、资源门槛和矿脉旧件限制逐步展开。',
                climax: '主角找到第一条规则漏洞。',
                ending: '大循环期待指向资源黑幕和更高层势力。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('world_expansion_stall_gap')
  })
  test('builds serial momentum brief when target reader needs are not covered across chapters', () => {
    const targetReaderContract = {
      reader_profile: '番茄男频读者，想看旧城小人物靠隐藏工具箱翻盘。',
      reader_desires: ['被轻视后当场反制', '掌控规则边界', '客户认可与订单回报'],
      emotional_gap_analysis: ['核心痛苦：被规则和客户轻视', '未满足需求：尊严、掌控感、即时收益'],
      chapter_attractions: ['隐藏工具箱把报废设备变成可感知回报。'],
      validation_questions: ['我这书写给谁看？', '目标读者想看什么？', '本章给了什么可感知回报？'],
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '报价登记',
          chapter_summary: '主角在旧城维修铺整理报价表，向客户说明普通登记流程。',
          conflict: '客户要求他先把维修说明写清楚。',
          ending_hook: '说明写完后，主角把表格放回抽屉。',
          raw_payload: {
            chapter_blueprint: {
              target_reader_contract: targetReaderContract,
              content_outline: {
                cause: '客户询问报价。',
                development: '主角解释登记流程。',
                climax: '报价表整理完毕。',
                ending: '主角把表格收回抽屉。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '窗口排号',
          chapter_summary: '主角去协会窗口排号，工作人员让他补同一份材料。',
          conflict: '窗口只受理完整材料。',
          ending_hook: '材料交齐后，主角拿着回执离开。',
          raw_payload: {
            chapter_blueprint: {
              target_reader_contract: targetReaderContract,
              content_outline: {
                cause: '协会窗口叫号。',
                development: '主角补材料。',
                climax: '工作人员盖章。',
                ending: '主角拿回普通回执。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '设备复核',
          chapter_summary: '主角继续复核同类报废设备，按清单确认螺丝和外壳编号。',
          conflict: '客户要求他再解释一次维修周期。',
          ending_hook: '清单核对完，主角继续等待下一件设备。',
          raw_payload: {
            chapter_blueprint: {
              target_reader_contract: targetReaderContract,
              content_outline: {
                cause: '同类设备送到柜台。',
                development: '主角核对螺丝和外壳编号。',
                climax: '清单确认无误。',
                ending: '主角继续等待下一件设备。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('reader_need_coverage_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('读者需求')
    expect(brief?.next_actions.join('；')).toContain('尊严')
    expect(brief?.next_actions.join('；')).toContain('掌控感')
    expect(brief?.next_actions.join('；')).toContain('可感知回报')
  })
  test('does not flag reader need coverage when chapters deliver concrete reader rewards', () => {
    const targetReaderContract = {
      reader_profile: '番茄男频读者，想看旧城小人物靠隐藏工具箱翻盘。',
      reader_desires: ['被轻视后当场反制', '掌控规则边界', '客户认可与订单回报'],
      emotional_gap_analysis: ['核心痛苦：被规则和客户轻视', '未满足需求：尊严、掌控感、即时收益'],
      chapter_attractions: ['隐藏工具箱把报废设备变成可感知回报。'],
      validation_questions: ['我这书写给谁看？', '目标读者想看什么？', '本章给了什么可感知回报？'],
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '旧规反制',
          chapter_summary: '客户轻视主角的报价，主角用隐藏工具箱找出旧规漏洞，当场反制审核判定。',
          conflict: '协会旧规压住报废设备订单。',
          ending_hook: '审核员改口，客户第一次认可主角能掌控规则边界。',
          raw_payload: {
            chapter_blueprint: {
              target_reader_contract: targetReaderContract,
              content_outline: {
                cause: '客户和审核员同时看低主角。',
                development: '主角用工具箱定位旧规漏洞。',
                climax: '主角当场反制审核判定。',
                ending: '客户认可，主角拿回尊严和掌控感。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '订单回报',
          chapter_summary: '主角修好报废设备，客户态度反转并追加订单，系统奖励即时反馈。',
          conflict: '客户担心设备无法稳定交付。',
          ending_hook: '订单回报和奖励到账，下一章处理更大的设备门槛。',
          raw_payload: {
            chapter_blueprint: {
              target_reader_contract: targetReaderContract,
              content_outline: {
                cause: '客户提出稳定性交付要求。',
                development: '主角演示修复结果。',
                climax: '客户态度反转，追加订单。',
                ending: '即时收益到账，下一门槛打开。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '当众翻盘',
          chapter_summary: '协会公开质疑主角资格，主角用检测结果当众翻盘，让围观客户看到不公平被移除。',
          conflict: '协会要求他证明报废设备不是违规接单。',
          ending_hook: '围观客户站到主角这边，新的大额订单带来可感知回报。',
          raw_payload: {
            chapter_blueprint: {
              target_reader_contract: targetReaderContract,
              content_outline: {
                cause: '协会公开质疑主角。',
                development: '主角压住检测结果等待对方说满。',
                climax: '主角当众翻盘，移除不公平判定。',
                ending: '围观客户认可并给出大额订单。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('reader_need_coverage_gap')
  })
  test('builds serial momentum brief when two-long-one-short expectation layers are missing across chapters', () => {
    const expectationThresholdContract = {
      short_expectation: '短期期待：下一章先拿到复核资格。',
      medium_expectations: ['中期期待：这个剧情单元要查清协会调包链。'],
      long_expectations: ['长期期待：父亲旧案背后的幕后长老是谁。'],
      three_expectation_lines: {
        plot_expectation: '协会调包链背后是谁。',
        theme_payoff: '旧城小人物靠隐藏工具箱夺回尊严。',
        freshness_hook: '工具箱规则会碰到更高层势力。',
      },
      quality_checks: ['两长一短期待必须同时在线。', '三层期待：短期、中期、长期不能断。'],
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '回执整理',
          chapter_summary: '主角整理协会回执，完成当前材料核对。',
          conflict: '窗口要求他补齐一张表。',
          ending_hook: '表格补齐后，主角回维修铺等待通知。',
          raw_payload: {
            chapter_blueprint: {
              expectation_threshold_contract: expectationThresholdContract,
              content_outline: {
                cause: '窗口要求补表。',
                development: '主角整理回执。',
                climax: '表格核对完成。',
                ending: '主角等待通知。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '设备清点',
          chapter_summary: '主角清点旧设备编号，把当前清单交给客户确认。',
          conflict: '客户要求他重新核对外壳编号。',
          ending_hook: '清单确认后，主角继续等待协会回复。',
          raw_payload: {
            chapter_blueprint: {
              expectation_threshold_contract: expectationThresholdContract,
              content_outline: {
                cause: '客户递来同类设备。',
                development: '主角核对编号。',
                climax: '清单确认无误。',
                ending: '主角继续等待回复。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '报价复核',
          chapter_summary: '主角复核维修报价，完成当前报价单。',
          conflict: '客户要求他解释价格构成。',
          ending_hook: '报价单复核完毕，主角把单据收回抽屉。',
          raw_payload: {
            chapter_blueprint: {
              expectation_threshold_contract: expectationThresholdContract,
              content_outline: {
                cause: '客户质疑报价。',
                development: '主角解释价格。',
                climax: '报价单复核完成。',
                ending: '主角收起单据。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('expectation_ladder_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('两长一短')
    expect(brief?.next_actions.join('；')).toContain('短期')
    expect(brief?.next_actions.join('；')).toContain('中期')
    expect(brief?.next_actions.join('；')).toContain('长期')
  })
  test('reads expectation ladder contract from serialized context_package camelCase chapter target', () => {
    const expectationThresholdContract = {
      shortExpectation: '短期期待：下一章先拿到复核资格。',
      mediumExpectations: ['中期期待：这个剧情单元要查清协会调包链。'],
      longExpectations: ['长期期待：父亲旧案背后的幕后长老是谁。'],
      threeExpectationLines: {
        plotExpectation: '协会调包链背后是谁。',
        themePayoff: '旧城小人物靠隐藏工具箱夺回尊严。',
        freshnessHook: '工具箱规则会碰到更高层势力。',
      },
      qualityChecks: ['两长一短期待必须同时在线。', '三层期待：短期、中期、长期不能断。'],
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '回执整理',
          chapter_summary: '主角整理协会回执，完成当前材料核对。',
          conflict: '窗口要求他补齐一张表。',
          ending_hook: '表格补齐后，主角回维修铺等待通知。',
          raw_payload: {
            context_package: {
              chapterTarget: {
                expectationThresholdContract,
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '设备清点',
          chapter_summary: '主角清点旧设备编号，把当前清单交给客户确认。',
          conflict: '客户要求他重新核对外壳编号。',
          ending_hook: '清单确认后，主角继续等待协会回复。',
          raw_payload: {
            context_package: {
              chapterTarget: {
                expectationThresholdContract,
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '报价复核',
          chapter_summary: '主角复核维修报价，完成当前报价单。',
          conflict: '客户要求他解释价格构成。',
          ending_hook: '报价单复核完毕，主角把单据收回抽屉。',
          raw_payload: {
            context_package: {
              chapterTarget: {
                expectationThresholdContract,
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key)).toContain('expectation_ladder_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('两长一短')
  })
})

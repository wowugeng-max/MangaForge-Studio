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

describe('readability meme pipeline b a', () => {
  test('builds serial momentum brief when two chapters lack goal advance obstacle escalation or new information', () => {
    const recentChapters = [
      {
        chapter_no: 19,
        title: '回执整理',
        chapter_summary: '主角继续整理旧回执，只把同一批表格重新排序；复核资格没有推进，也没有新线索。',
        conflict: '窗口让他等待通知，没有新的阻碍升级。',
        ending_hook: '他把回执放回抽屉，明天继续等。',
        raw_payload: {
          chapter_blueprint: {
            current_goal: '本章小目标：拿到复核资格。',
            content_outline: {
              cause: '窗口退回旧回执。',
              development: '主角整理表格。',
              climax: '表格顺序排好。',
              ending: '复核资格仍未推进，也没有新信息。',
            },
          },
        },
      },
      {
        chapter_no: 20,
        title: '清单复看',
        chapter_summary: '主角又复看同一张清单，只确认旧编号没有填错；目标仍停在原地，没有新的代价或发现。',
        conflict: '客户催问进度，但只是普通催促，没有加码。',
        ending_hook: '清单复看完毕，他继续等协会回复。',
        raw_payload: {
          chapter_blueprint: {
            current_goal: '本章小目标：拿到复核资格。',
            content_outline: {
              cause: '客户催问。',
              development: '主角复看同一张清单。',
              climax: '编号确认无误。',
              ending: '目标仍未推进，没有阻碍升级，也没有新信息。',
            },
          },
        },
      },
    ]

    const brief = buildSerialMomentumBrief({ chapter_no: 21, title: '旧城新单' }, recentChapters)

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('two_chapter_momentum_stall')
    expect(brief?.fatigue_risks.join('；')).toContain('目标推进')
    expect(brief?.fatigue_risks.join('；')).toContain('阻碍升级')
    expect(brief?.next_actions.join('；')).toContain('提高冲突密度')
    expect(brief?.next_actions.join('；')).toContain('新信息')
  })
  test('does not flag two chapter momentum stall when obstacle escalates or new information appears', () => {
    const recentChapters = [
      {
        chapter_no: 19,
        title: '三日冻结',
        chapter_summary: '协会追加三日倒计时和资格冻结代价，复核资格从等待变成必须限时处理的新门槛。',
        conflict: '窗口通知三日内不补齐证据就冻结资格。',
        ending_hook: '资格冻结倒计时开始，主角必须马上换打法。',
      },
      {
        chapter_no: 20,
        title: '第二张回执',
        chapter_summary: '主角发现第二张回执背面露出旧账册编号，新线索把目标推进到禁库账册入口。',
        conflict: '客户试图抢走第二张回执。',
        ending_hook: '旧账册编号指向禁库入口，下一章必须追查谁调包。',
      },
    ]

    const brief = buildSerialMomentumBrief({ chapter_no: 21, title: '禁库入口' }, recentChapters)

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('two_chapter_momentum_stall')
  })
  test('builds serial momentum brief when payoff release is longer than expectation setup', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册反证',
          chapter_summary: '主角发现旧账册被调换，并当众反证执事。',
          conflict: '执事余党阻止主角复核旧账册。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：先拿到旧账册复核资格。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '执事拦路。',
                development: '主角看到账册。',
                climax: '主角当众反证执事调换账册，逼执事改口，围观弟子全部震惊。',
                ending: '本章收获复核资格和旧印编号；下一目标指向禁库夜灯的新门槛。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯反证',
          chapter_summary: '主角发现禁库夜灯被人改过，并逼巡夜弟子改口。',
          conflict: '巡夜弟子阻止主角靠近禁库入口。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：确认第二道阵鸣的入口位置。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '夜灯亮起。',
                development: '主角靠近门口。',
                climax: '主角用灯色证据逼巡夜弟子承认门禁被改，禁库入口规则当场松动。',
                ending: '本章收获第二道阵鸣线索和巡夜弟子改口；下一段铺垫禁库入口的新风险。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('expectation_payoff_setup_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('期待感小于爽点释放')
    expect(brief?.next_actions.join('；')).toContain('铺垫篇幅不少于释放篇幅')
    expect(brief?.next_actions.join('；')).toContain('先铺期待')
  })
  test('does not flag expectation setup when setup pressure is at least as long as payoff release', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册反证',
          chapter_summary: '主角发现旧账册被调换，并当众反证执事。',
          conflict: '执事余党阻止主角复核旧账册。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：先拿到旧账册复核资格。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '执事先用宗规压住复核，逼主角在众目睽睽下选择是否承担旧案代价。',
                development: '主角分三步核对账册、旧印编号和巡夜路线，让围观者先产生怀疑和期待。',
                turn: '执事误判主角没有证据，主动把假账册推到台前。',
                climax: '主角当众反证执事调换账册。',
                ending: '本章收获复核资格和旧印编号；下一目标指向禁库夜灯的新门槛。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯反证',
          chapter_summary: '主角发现禁库夜灯被人改过，并逼巡夜弟子改口。',
          conflict: '巡夜弟子阻止主角靠近禁库入口。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：确认第二道阵鸣的入口位置。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '巡夜弟子先封锁入口，威胁主角再靠近就失去复核资格。',
                development: '主角用夜灯颜色、门禁回声和巡夜路线连续三次制造期待，让巡夜弟子误以为还能遮掩。',
                turn: '林青禾担保后，巡夜弟子的谎话被压到最后一层。',
                climax: '主角用灯色证据逼巡夜弟子改口。',
                ending: '本章收获第二道阵鸣线索和巡夜弟子改口；下一段铺垫禁库入口的新风险。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('expectation_payoff_setup_gap')
  })
  test('builds serial momentum brief when mainline closures lack deceptive handoff', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册终证',
          chapter_summary: '主角当众拿到账册终证，三年前旧案已经全部查清，阵堂清白彻底洗清。',
          conflict: '执事余党最后一次阻止主角公开账册。',
          ending_hook: '众人散去，旧案终于结束。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '主线完成：三年前旧案全部查清，阵堂清白彻底洗清。' },
              content_outline: {
                climax: '主角公开账册终证。',
                ending: '旧案结清，一切结束。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯终局',
          chapter_summary: '主角复核禁库夜灯，幕后改阵者全部伏法，旧阵真相大白。',
          conflict: '巡夜弟子试图做最后抵赖。',
          ending_hook: '禁库恢复平静，三年前的事彻底解决。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '主线收束：幕后改阵者全部伏法，旧阵真相大白。' },
              content_outline: {
                climax: '巡夜弟子承认改阵。',
                ending: '旧阵真相大白，主线彻底完成。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('deceptive_mainline_handoff_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('欺骗式主线')
    expect(brief?.next_actions.join('；')).toContain('接近完成又差一点')
    expect(brief?.next_actions.join('；')).toContain('最后一块')
  })
  test('does not flag deceptive mainline handoff when closure leaves one missing key piece', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册终证',
          chapter_summary: '主角几乎查清旧账，但还差最后一页账册和第三个证人才能洗清阵堂。',
          conflict: '执事余党阻止主角拿到最后一页账册。',
          ending_hook: '账册只剩最后一页未拿到，幕后还有更深一层的人。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '接近完成：旧账已经推到最后一步，但仍缺第三个证人。' },
              content_outline: {
                climax: '主角公开大部分账册证据。',
                ending: '主线只差最后一块证据，下一章转向第三个证人。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯缺口',
          chapter_summary: '主角破解禁库夜灯，表面真相大白，但关键入口未开，背后还有下一层阵眼。',
          conflict: '巡夜弟子阻止主角打开最后一道入口。',
          ending_hook: '入口未开，最后一枚旧印仍在幕后长老手中。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '几乎收束但还差最后一枚旧印，幕后长老仍未露面。' },
              content_outline: {
                climax: '主角破解禁库夜灯。',
                ending: '只剩最后一枚旧印和幕后长老，主线进入下一层。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('deceptive_mainline_handoff_gap')
  })
  test('builds serial momentum brief when upgrade-stage chapters lack reward points', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '内门榜单' },
      [
        {
          chapter_no: 16,
          title: '试炼排队',
          chapter_summary: '主角进入外门试炼区，反复核对考核规则和境界门槛。',
          conflict: '试炼名册排队规则拖住主角。',
          ending_hook: '下一轮仍要继续核对试炼资格。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '成长线停在外门试炼规则和境界门槛说明。' },
              content_outline: {
                cause: '外门试炼规则变复杂。',
                development: '主角继续排队核对门槛。',
                climax: '考核执事宣布下一轮规则。',
                ending: '仍然等待下一轮试炼。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '境界门槛',
          chapter_summary: '主角继续研究修为境界门槛，确认榜单排名会影响试炼顺序。',
          conflict: '榜单顺序让主角暂时无法进入下一轮。',
          ending_hook: '榜单排名还要继续等待复核。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '成长线继续解释修为门槛、榜单排名和考核顺序。' },
              content_outline: {
                cause: '榜单排名影响试炼顺序。',
                development: '主角继续核对排名。',
                climax: '执事公布复核名单。',
                ending: '仍未进入奖励结算。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '榜单复核',
          chapter_summary: '主角在成长系统面板前整理考核条件，继续等待试炼榜单刷新。',
          conflict: '系统提示条件不足，榜单刷新被延后。',
          ending_hook: '下一章继续等榜单刷新。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '成长线还在系统条件、试炼榜单和境界门槛之间空转。' },
              content_outline: {
                cause: '系统条件不足。',
                development: '主角继续整理考核条件。',
                climax: '榜单刷新被延后。',
                ending: '继续等待下一次刷新。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('upgrade_reward_point_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('升级文')
    expect(brief?.next_actions.join('；')).toContain('奖励点')
    expect(brief?.next_actions.join('；')).toContain('升级/装备/认可/揭秘')
  })
  test('does not flag upgrade reward points when stage chapters deliver concrete gains', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '内门榜单' },
      [
        {
          chapter_no: 16,
          title: '试炼初奖',
          chapter_summary: '主角通过外门试炼第一关，获得旧印装备和复核名额。',
          conflict: '考核执事试图压低主角排名。',
          ending_hook: '新装备打开第二关入口。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '成长线推进：通过第一关并获得旧印装备。' },
              content_outline: {
                climax: '主角通过第一关。',
                ending: '本章收获旧印装备和复核名额，下一章进入第二关。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '境界突破',
          chapter_summary: '主角借旧印反推阵纹，突破小境界并解锁新能力。',
          conflict: '第二关门槛要求临场修正阵纹。',
          ending_hook: '新能力指向榜单暗格。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '成长线推进：突破境界并解锁新能力。' },
              content_outline: {
                climax: '主角临场修正阵纹。',
                ending: '本章完成境界突破，解锁新能力并打开榜单暗格。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '榜单揭秘',
          chapter_summary: '主角揭开试炼榜单被篡改的真相，赢得长老席认可。',
          conflict: '执事余党阻止主角公开榜单暗格。',
          ending_hook: '长老席认可后给出内门候选资格。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '成长线推进：揭秘榜单暗格，获得长老席认可和内门候选资格。' },
              content_outline: {
                climax: '主角公开榜单暗格。',
                ending: '本章收获长老席认可和内门候选资格。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('upgrade_reward_point_gap')
  })
  test('builds serial momentum brief when romance beats lack layered tension', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '雨夜旧账' },
      [
        {
          chapter_no: 16,
          title: '廊下热茶',
          chapter_summary: '林青禾给主角递茶，陪他整理旧账，感情线继续升温。',
          conflict: '旧账资料太多，两人一起整理到深夜。',
          ending_hook: '她把披风披到主角肩上。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '感情线桥段：递茶、陪伴、照顾，关系继续甜。' },
              content_outline: {
                cause: '主角熬夜查账。',
                development: '林青禾递茶陪伴。',
                climax: '两人并肩整理完资料。',
                ending: '她把披风披给主角。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '灯下陪伴',
          chapter_summary: '林青禾继续陪主角查夜灯记录，两人默契增加。',
          conflict: '夜灯记录繁琐，两人一起核对。',
          ending_hook: '她替主角按住旧印。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '感情线桥段：陪伴、默契、照顾，继续堆甜。' },
              content_outline: {
                cause: '夜灯记录需要复核。',
                development: '林青禾一直陪着主角。',
                climax: '两人一起找出记录顺序。',
                ending: '她替主角按住旧印。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '檐下避雨',
          chapter_summary: '主角和林青禾在檐下避雨，她照顾他的伤口，暧昧继续增加。',
          conflict: '雨太大，两人只能暂时停在廊下。',
          ending_hook: '她又替主角系好药布。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '感情线桥段：避雨、疗伤、陪伴，暧昧继续增加。' },
              content_outline: {
                cause: '主角淋雨受伤。',
                development: '林青禾照顾伤口。',
                climax: '两人在檐下沉默靠近。',
                ending: '她替主角系好药布。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('romance_tension_layer_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('感情线')
    expect(brief?.next_actions.join('；')).toContain('拉扯')
    expect(brief?.next_actions.join('；')).toContain('不是堆砌桥段')
  })
})

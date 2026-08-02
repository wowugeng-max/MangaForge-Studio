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

describe('readability meme review b b', () => {
  test('builds serial momentum brief when old expectations close before a new open loop is running', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '资格兑现',
          chapter_summary: '主角当众证明旧账册无误，资格门槛终于通过，当前期待全部兑现。',
          conflict: '审判庭要求主角复核旧账册，必须当场给出结果。',
          ending_hook: '资格门槛终于通过，危机到这里总算结束，暂时没有新的期待线。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：拿到复核资格。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '审判庭压住复核资格。',
                development: '主角拿出旧账册证据。',
                climax: '资格门槛终于通过。',
                ending: '所有期待都兑现，没有新的期待线。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '证人结案',
          chapter_summary: '主角找到第三个证人，第三个证人的答案也已经兑现。',
          conflict: '掌院要求他证明第三个证人的身份。',
          ending_hook: '第三个证人说完真相，谜题彻底解决，麻烦消失了。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：找到第三个证人。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '掌院要求证明证人身份。',
                development: '主角核对证词。',
                climax: '第三个证人给出答案。',
                ending: '谜题彻底解决，麻烦消失了。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '旧案收官',
          chapter_summary: '主角公开旧案真相，长老席改判，父亲旧案期待清空。',
          conflict: '长老席要求他交出最终证据。',
          ending_hook: '父亲旧案全部查清，所有期待都兑现，之后只需等待新生活开始。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：公开最终证据。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '长老席逼他交证据。',
                development: '主角公开证据链。',
                climax: '长老席改判。',
                ending: '父亲旧案全部查清，所有期待都兑现。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('expectation_chain_break_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('断期待')
    expect(brief?.next_actions.join('；')).toContain('下一开环')
    expect(brief?.next_actions.join('；')).toContain('新门槛')
  })

  test('does not flag expectation chain when payoffs seed the next open loop', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '资格后门',
          chapter_summary: '主角当众证明旧账册无误，资格门槛通过前先露出禁库夜灯的新线索。',
          conflict: '审判庭要求主角复核旧账册，必须当场给出结果。',
          ending_hook: '资格到手只是第一步，下一开环是禁库夜灯在子时突然亮起。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：拿到复核资格。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '审判庭压住复核资格。',
                development: '主角拿出旧账册证据。',
                climax: '资格门槛通过。',
                ending: '下一目标指向禁库夜灯新线索。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '证人缺页',
          chapter_summary: '主角找到第三个证人，但证词缺页留下掌院血印的新困境。',
          conflict: '掌院要求他证明第三个证人的身份。',
          ending_hook: '第三个证人说出答案，但证词缺页露出掌院血印，长期期待继续保温。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：找到第三个证人。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '掌院要求证明证人身份。',
                development: '主角核对证词。',
                climax: '第三个证人给出答案。',
                ending: '新困境是证词缺页和掌院血印。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '旧案更深',
          chapter_summary: '主角公开旧案真相，同时发现旧案背后还有更深一层的幕后名单。',
          conflict: '长老席要求他交出最终证据。',
          ending_hook: '旧案改判后，幕后名单露出第四个名字，下一章必须追查名单来源。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：公开最终证据。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '长老席逼他交证据。',
                development: '主角公开证据链。',
                climax: '长老席改判。',
                ending: '幕后名单露出第四个名字，下一章追查来源。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('expectation_chain_break_gap')
  })

  test('builds serial momentum brief when core hook contracts are absent from consecutive chapters', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '店铺整理',
          chapter_summary: '主角回到旧城维修铺，整理货架和客户登记表，等待协会通知。',
          conflict: '协会要求他先把店铺资料补齐。',
          ending_hook: '资料整理完毕，主角关灯休息。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '协会要求补资料。',
                development: '主角整理货架和表格。',
                climax: '资料提交成功。',
                ending: '店铺恢复整洁。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
                longboard_focus_rules: ['每章至少有核心梗相关期待点或爽点。'],
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '协会排队',
          chapter_summary: '主角去协会窗口排队，和工作人员确认下一批审核时间。',
          conflict: '窗口名额有限，他只能等待叫号。',
          ending_hook: '叫号结束，主角拿到回执。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '协会开放审核窗口。',
                development: '主角排队等候。',
                climax: '工作人员盖章。',
                ending: '主角拿到回执。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
                longboard_focus_rules: ['同一核心卖点要换不同角度推进。'],
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '客户问价',
          chapter_summary: '客户来店里询问维修价格，主角按价目表解释服务流程。',
          conflict: '客户嫌价格高，主角耐心介绍普通维修周期。',
          ending_hook: '客户决定回去考虑，主角继续等下一位。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '客户进店问价。',
                development: '主角解释服务流程。',
                climax: '客户拿走报价单。',
                ending: '主角继续等下一位。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
                longboard_focus_rules: ['核心卖点背后的情绪必须清晰。'],
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('core_hook_absence_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('核心梗')
    expect(brief?.next_actions.join('；')).toContain('期待点')
    expect(brief?.next_actions.join('；')).toContain('爽点')
  })

  test('does not flag core hook absence when chapters deliver expectation points or payoffs from the core hook', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '工具箱亮格',
          chapter_summary: '主角打开隐藏工具箱，系统检测报废电机仍有三成可修，客户第一次产生期待。',
          conflict: '协会要求他先证明报废设备还有维修价值。',
          ending_hook: '隐藏工具箱弹出第二层检测，下一目标是把报废电机修成新订单。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '协会质疑报废设备价值。',
                development: '隐藏工具箱给出检测结果。',
                climax: '客户看到设备还有可修空间。',
                ending: '第二层检测打开下一订单期待。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '报废翻新',
          chapter_summary: '主角用隐藏工具箱拆出旧件漏洞，把报废设备修成可交付样机。',
          conflict: '客户担心旧件会再次损坏。',
          ending_hook: '样机启动，客户态度反转，新订单只差协会盖章。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '客户担心旧件损坏。',
                development: '主角用工具箱定位漏洞。',
                climax: '报废设备修成样机。',
                ending: '客户态度反转，新订单进入盖章门槛。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '新单到账',
          chapter_summary: '主角交付修好的设备，系统奖励到账，客户追加新订单。',
          conflict: '协会审核员质疑样机稳定性。',
          ending_hook: '系统奖励即时反馈，下一章必须用新功能处理更大的报废设备。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '审核员质疑稳定性。',
                development: '主角演示修复后的设备。',
                climax: '客户追加新订单。',
                ending: '系统奖励到账，新功能打开下一目标。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('core_hook_absence_gap')
  })

  test('builds serial momentum brief when the same core hook angle repeats across chapters', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '电机检测',
          chapter_summary: '主角用隐藏工具箱检测报废电机，发现轴承磨损，客户等待检测结果。',
          conflict: '客户质疑报废电机还能不能修。',
          ending_hook: '隐藏工具箱给出电机检测报告，下一章继续检测相似故障。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '客户拿来报废电机。',
                development: '主角用隐藏工具箱检测轴承。',
                climax: '检测报告显示轴承磨损。',
                ending: '客户等待下一步检测。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
                longboard_focus_rules: ['同一核心卖点要换不同角度/不同矛盾。'],
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '水泵检测',
          chapter_summary: '主角用隐藏工具箱检测报废水泵，发现轴承磨损，客户继续等待检测结果。',
          conflict: '客户质疑报废水泵还能不能修。',
          ending_hook: '隐藏工具箱给出水泵检测报告，下一章继续检测相似故障。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '客户拿来报废水泵。',
                development: '主角用隐藏工具箱检测轴承。',
                climax: '检测报告显示轴承磨损。',
                ending: '客户等待下一步检测。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
                longboard_focus_rules: ['同一核心卖点要换不同角度/不同矛盾。'],
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '风机检测',
          chapter_summary: '主角用隐藏工具箱检测报废风机，发现轴承磨损，客户仍然等待检测结果。',
          conflict: '客户质疑报废风机还能不能修。',
          ending_hook: '隐藏工具箱给出风机检测报告，下一章继续检测相似故障。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '客户拿来报废风机。',
                development: '主角用隐藏工具箱检测轴承。',
                climax: '检测报告显示轴承磨损。',
                ending: '客户等待下一步检测。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
                longboard_focus_rules: ['同一核心卖点要换不同角度/不同矛盾。'],
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('core_hook_angle_repetition_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('同一核心卖点')
    expect(brief?.next_actions.join('；')).toContain('不同角度')
    expect(brief?.next_actions.join('；')).toContain('不同矛盾')
  })

  test('does not flag core hook angle repetition when the same hook rotates angles and conflicts', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '旧城新单' },
      [
        {
          chapter_no: 16,
          title: '工具箱检测',
          chapter_summary: '主角用隐藏工具箱检测报废电机，客户第一次看到旧件还有可修空间。',
          conflict: '客户质疑报废设备没有维修价值。',
          ending_hook: '检测结果打开新订单期待。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '客户质疑报废设备。',
                development: '隐藏工具箱给出检测。',
                climax: '检测证明设备可修。',
                ending: '新订单期待被拉起。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '协会反制',
          chapter_summary: '协会审核员用旧规卡住订单，主角借隐藏工具箱的规则边界反制审核判定。',
          conflict: '协会规则要求报废设备不能直接接单。',
          ending_hook: '规则边界被反制后，客户态度开始松动。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '协会旧规卡单。',
                development: '主角找到规则边界。',
                climax: '主角反制审核判定。',
                ending: '客户态度松动。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '订单回报',
          chapter_summary: '主角交付修好的样机，客户态度反转并追加新订单，系统奖励到账。',
          conflict: '客户担心样机无法稳定交付。',
          ending_hook: '新订单和系统奖励同时到账，下一章处理更大的报废设备。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '客户担心样机稳定性。',
                development: '主角演示交付样机。',
                climax: '客户追加新订单。',
                ending: '系统奖励到账并打开下一目标。',
              },
              genre_positioning_contract: {
                core_hook_rules: ['旧城设备师用隐藏工具箱把报废设备修成新订单。'],
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('core_hook_angle_repetition_gap')
  })

})

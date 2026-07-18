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

describe('readability meme review b a', () => {
  test('reads story loop core elements from serialized context_package camelCase chapter target', () => {
    const storyLoopContract = {
      coreElements: ['镜厅规则', '债契证明', '旁证转向'],
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '旧印复核',
          chapter_summary: '主角在案台前核对旧印编号，登记结果暂时没有变化。',
          conflict: '执事要求主角补齐一份普通材料。',
          raw_payload: {
            context_package: {
              chapterTarget: {
                storyLoopContract,
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '玉牌复核',
          chapter_summary: '主角在案台前核对玉牌编号，登记结果仍然没有变化。',
          conflict: '执事要求主角再补一份普通材料。',
          raw_payload: {
            context_package: {
              chapterTarget: {
                storyLoopContract,
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key)).toContain('repeated_core_element_combo')
    expect(brief?.fatigue_risks.join('；')).toContain('核心要素组合重复')
  })

  test('does not flag core element combo when the repeated routine rotates one element', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '旧印争夺',
          chapter_summary: '主角在试炼台夺回旧印，关系奖励落到林青禾认可。',
          conflict: '阵堂弟子争夺旧印并逼主角上台比试。',
          raw_payload: {
            pre_draft_brief: {
              story_loop_contract: {
                core_elements: ['夺宝', '关系奖励', '比武试炼'],
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '禁库副本',
          chapter_summary: '主角进入禁库副本，关系奖励转成林青禾承担代价。',
          conflict: '禁库规则压制主角，逼他破解副本门禁。',
          raw_payload: {
            pre_draft_brief: {
              story_loop_contract: {
                core_elements: ['副本探索', '关系奖励', '比武试炼'],
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('repeated_core_element_combo')
  })

  test('builds serial momentum brief when consecutive chapter blueprints miss climax and reward closure', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册复看',
          chapter_summary: '主角整理账册旧痕，发现几处金额异常。',
          conflict: '执事余党拖延复核。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '执事余党把旧账册压回审讯桌。',
                development: '主角发现账册金额和旧印编号不一致。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯再查',
          chapter_summary: '主角继续观察禁库灯色，确认旧阵有第二道回声。',
          conflict: '巡夜弟子要求他离开。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '禁库夜灯突然亮起。',
                development: '主角发现灯色和旧阵回声有关。',
                ending: '主角暂时记下线索，等待下一次机会。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('blueprint_climax_reward_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('缺少高潮和收获闭环')
    expect(brief?.next_actions.join('；')).toContain('起因')
    expect(brief?.next_actions.join('；')).toContain('高潮')
    expect(brief?.next_actions.join('；')).toContain('收获')
  })

  test('does not flag blueprint closure when recent chapters include climax and reward', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册复看',
          chapter_summary: '主角当众反证账册缺页并拿到复核资格。',
          conflict: '执事余党拖延复核。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '执事余党把旧账册压回审讯桌。',
                development: '主角发现账册金额和旧印编号不一致。',
                climax: '主角当众反证执事调换账册。',
                ending: '主角拿到复核资格，并把下一目标指向禁库。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯再查',
          chapter_summary: '主角借禁库夜灯逼巡夜弟子改口，收获第二道阵鸣线索。',
          conflict: '巡夜弟子要求他离开。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '禁库夜灯突然亮起。',
                development: '主角发现灯色和旧阵回声有关。',
                climax: '主角用灯色证据逼巡夜弟子承认门禁被改。',
                ending: '主角收获第二道阵鸣线索，并留下下一目标。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('blueprint_climax_reward_gap')
  })

  test('builds serial momentum brief when recent blueprints lose protagonist short and long goals', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册复看',
          chapter_summary: '主角整理账册旧痕，发现几处金额异常。',
          conflict: '执事余党拖延复核。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '执事余党把旧账册压回审讯桌。',
                development: '主角发现账册金额和旧印编号不一致。',
                climax: '主角当众反证执事调换账册。',
                ending: '主角拿到复核资格，并把下一目标指向禁库。',
              },
              plot_lines: {
                mainline: '旧案线继续推进到禁库。',
                subplot: '林青禾旁观但态度暂不明。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯再查',
          chapter_summary: '主角借禁库夜灯逼巡夜弟子改口，收获第二道阵鸣线索。',
          conflict: '巡夜弟子要求他离开。',
          raw_payload: {
            chapter_blueprint: {
              content_outline: {
                cause: '禁库夜灯突然亮起。',
                development: '主角发现灯色和旧阵回声有关。',
                climax: '主角用灯色证据逼巡夜弟子承认门禁被改。',
                ending: '主角收获第二道阵鸣线索，并留下下一目标。',
              },
              plot_lines: {
                mainline: '旧案线继续推进到第二道阵鸣。',
                subplot: '林青禾担保的代价暂时压住。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('protagonist_goal_continuity_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('当前小目标和长线大目标')
    expect(brief?.next_actions.join('；')).toContain('短线行动目标')
    expect(brief?.next_actions.join('；')).toContain('长线大目标')
  })

  test('does not flag protagonist goal continuity when short and long goals are explicit', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册复看',
          chapter_summary: '主角当众反证账册缺页并拿到复核资格。',
          conflict: '执事余党拖延复核。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：先拿到旧账册复核资格。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '执事余党把旧账册压回审讯桌。',
                development: '主角发现账册金额和旧印编号不一致。',
                climax: '主角当众反证执事调换账册。',
                ending: '主角拿到复核资格，并把下一目标指向禁库。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯再查',
          chapter_summary: '主角借禁库夜灯逼巡夜弟子改口，收获第二道阵鸣线索。',
          conflict: '巡夜弟子要求他离开。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：确认第二道阵鸣的入口位置。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '禁库夜灯突然亮起。',
                development: '主角发现灯色和旧阵回声有关。',
                climax: '主角用灯色证据逼巡夜弟子承认门禁被改。',
                ending: '主角收获第二道阵鸣线索，并留下下一目标。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('protagonist_goal_continuity_gap')
  })

  test('builds serial momentum brief when endings do not both count harvest and set up next segment', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册复看',
          chapter_summary: '主角当众反证账册缺页并拿到复核资格。',
          conflict: '执事余党拖延复核。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：先拿到旧账册复核资格。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '执事余党把旧账册压回审讯桌。',
                development: '主角发现账册金额和旧印编号不一致。',
                climax: '主角当众反证执事调换账册。',
                ending: '主角拿到复核资格，旧账册暂时收好。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯再查',
          chapter_summary: '主角借禁库夜灯逼巡夜弟子改口，下一目标指向第二道阵鸣。',
          conflict: '巡夜弟子要求他离开。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：确认第二道阵鸣的入口位置。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '禁库夜灯突然亮起。',
                development: '主角发现灯色和旧阵回声有关。',
                climax: '主角用灯色证据逼巡夜弟子承认门禁被改。',
                ending: '下一目标指向第二道阵鸣的入口。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('ending_harvest_handoff_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('章尾没有同时完成收获清点和铺垫下一段')
    expect(brief?.next_actions.join('；')).toContain('收获清点')
    expect(brief?.next_actions.join('；')).toContain('铺垫下一段')
  })

  test('does not flag ending handoff when endings count harvest and seed the next segment', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册复看',
          chapter_summary: '主角当众反证账册缺页并拿到复核资格。',
          conflict: '执事余党拖延复核。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：先拿到旧账册复核资格。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '执事余党把旧账册压回审讯桌。',
                development: '主角发现账册金额和旧印编号不一致。',
                climax: '主角当众反证执事调换账册。',
                ending: '主角清点收获：拿到复核资格和旧印编号；下一目标指向禁库夜灯。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯再查',
          chapter_summary: '主角借禁库夜灯逼巡夜弟子改口，收获第二道阵鸣线索。',
          conflict: '巡夜弟子要求他离开。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：确认第二道阵鸣的入口位置。',
              long_term_goal: '长线大目标：查清三年前旧案，夺回阵堂清白。',
              content_outline: {
                cause: '禁库夜灯突然亮起。',
                development: '主角发现灯色和旧阵回声有关。',
                climax: '主角用灯色证据逼巡夜弟子承认门禁被改。',
                ending: '本章收获第二道阵鸣线索和巡夜弟子改口；下一段铺垫禁库入口的新风险。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('ending_harvest_handoff_gap')
  })

  test('builds serial momentum brief when endings close safely without unresolved suspense', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '旧案收束',
          chapter_summary: '主角查完旧案，众人确认账册无误。',
          conflict: '审判庭要求他当场复核旧案账册，不能离开。',
          ending_hook: '旧案终于结束，众人各自回房休息。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：复核旧案账册。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '审判庭要求复核账册。',
                development: '主角对照旧印编号。',
                climax: '主角确认账册无误。',
                ending: '旧案终于结束，众人各自回房休息。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '禁库归档',
          chapter_summary: '主角把禁库记录归档，现场恢复平静。',
          conflict: '掌院要求他完成禁库归档任务。',
          ending_hook: '禁库恢复平静，主角整理完记录。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：归档禁库记录。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '掌院要求禁库归档。',
                development: '主角整理记录。',
                climax: '归档顺利完成。',
                ending: '禁库恢复平静，主角整理完记录。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '夜色收柜',
          chapter_summary: '主角把账册收好，章节在平静夜色里结束。',
          conflict: '账房要求他值班清点账册。',
          ending_hook: '夜色渐深，账册被收进柜中。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：清点账册。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '账房要求值班清点。',
                development: '主角核对页码。',
                climax: '账册清点完毕。',
                ending: '夜色渐深，账册被收进柜中。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('ending_suspense_hook_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('未解决')
    expect(brief?.next_actions.join('；')).toContain('危险')
    expect(brief?.next_actions.join('；')).toContain('新门槛')
  })

  test('does not flag ending suspense when endings leave concrete danger or unresolved questions', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '阵鸣未停',
          chapter_summary: '主角查完旧案第一层，但门外传来第二声阵鸣。',
          conflict: '审判庭要求他当场复核旧案账册，不能离开。',
          ending_hook: '门外传来第二声阵鸣，禁库门缝里渗出血色符光。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：复核旧案账册。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '审判庭要求复核账册。',
                development: '主角对照旧印编号。',
                climax: '主角确认账册第一层真相。',
                ending: '门外传来第二声阵鸣，禁库门缝里渗出血色符光。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '缺页第三名',
          chapter_summary: '主角完成归档时发现账册缺页露出第三个名字。',
          conflict: '掌院要求他完成禁库归档任务。',
          ending_hook: '账册缺页露出第三个名字，名字旁还有未解的掌院血印。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：归档禁库记录。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '掌院要求禁库归档。',
                development: '主角整理记录。',
                climax: '归档完成时缺页滑出。',
                ending: '账册缺页露出第三个名字，名字旁还有未解的掌院血印。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '十息交印',
          chapter_summary: '主角清点账册后，长老席压下十息倒计时。',
          conflict: '账房要求他值班清点账册。',
          ending_hook: '倒计时只剩十息，长老席要求主角立刻交出旧印。',
          raw_payload: {
            chapter_blueprint: {
              current_goal: '本章小目标：清点账册。',
              long_term_goal: '长线大目标：查清三年前旧案。',
              content_outline: {
                cause: '账房要求值班清点。',
                development: '主角核对页码。',
                climax: '账册清点完毕。',
                ending: '倒计时只剩十息，长老席要求主角立刻交出旧印。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('ending_suspense_hook_gap')
  })

})

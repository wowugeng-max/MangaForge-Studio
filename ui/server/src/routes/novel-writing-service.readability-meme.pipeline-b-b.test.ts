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

describe('readability meme pipeline b b', () => {
  test('does not flag romance tension when relationship beats include boundaries choices and costs', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '雨夜旧账' },
      [
        {
          chapter_no: 16,
          title: '廊下试探',
          chapter_summary: '林青禾递茶时试探主角是否愿意公开旧账，主角选择暂时隐瞒，关系边界被拉紧。',
          conflict: '她想公开证据，主角担心连累她的担保资格。',
          ending_hook: '两人约定只公开一半证据，代价是林青禾暂时退出审问席。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '感情线拉扯：递茶变成试探，边界、选择和担保代价都落地。' },
              content_outline: {
                cause: '林青禾想公开旧账。',
                development: '主角试探她能承受多少代价。',
                climax: '两人做出只公开一半证据的选择。',
                ending: '关系从陪伴变成共同承担代价。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '灯下误会',
          chapter_summary: '林青禾误会主角不信任她，主角用行动把她从风险里推开，关系出现退让和再确认。',
          conflict: '信任误会和审问压力同时压住两人。',
          ending_hook: '她看懂主角的保护不是拒绝，决定用自己的方式回到局里。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '感情线层次：误会、退让、再确认，感情升级踩在审问事业节点上。' },
              content_outline: {
                cause: '林青禾误会主角不信任她。',
                development: '主角用行动承担审问压力。',
                climax: '她看懂保护背后的代价。',
                ending: '她选择以证人身份回到局里。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '檐下确认',
          chapter_summary: '林青禾在檐下确认自己的立场，主角必须在保护她和让她并肩承担之间做选择。',
          conflict: '长老席要求林青禾退出，否则她会失去内门资格。',
          ending_hook: '她主动留下，关系从暧昧推进到共同目标。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '感情线推进：事业资格、主动选择、共同目标和失去资格的代价绑定。' },
              content_outline: {
                cause: '长老席要求她退出。',
                development: '主角试图保护她，她坚持主动留下。',
                climax: '两人共同承担失去资格的风险。',
                ending: '关系升级为共同目标。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('romance_tension_layer_gap')
  })
  test('builds serial momentum brief when romance beats do not bind to career or mainline consequences', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '雨夜旧账' },
      [
        {
          chapter_no: 16,
          title: '廊下试探',
          chapter_summary: '林青禾递茶试探主角是否还信任她，主角选择暂时靠近，感情线有边界和再确认。',
          conflict: '两人围绕误会和信任拉扯，但旧账主线仍原地等待。',
          ending_hook: '她替主角收好披风，两人约定天亮再说。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '感情线拉扯：递茶、试探、边界和再确认都落在两人关系里。' },
              content_outline: {
                cause: '林青禾想知道主角是否还信任她。',
                development: '两人在廊下试探彼此边界。',
                climax: '主角选择暂时靠近。',
                ending: '关系再确认，但旧账主线等待下一章。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '灯下退让',
          chapter_summary: '林青禾误会主角在保护她，主角退让一步，两人的信任关系继续升温。',
          conflict: '感情线围绕保护不是拒绝展开，审问和资格都没有变化。',
          ending_hook: '她替主角按住旧印，只留下一个眼神。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '感情线层次：误会、退让、再确认，仍然只改变两人亲密度。' },
              content_outline: {
                cause: '林青禾误会主角拒绝她参与。',
                development: '主角解释保护不是拒绝。',
                climax: '两人信任再确认。',
                ending: '她替主角按住旧印。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '檐下确认',
          chapter_summary: '林青禾在檐下确认自己的心意，主角必须在靠近和克制之间做选择。',
          conflict: '两人的边界和克制互相拉扯，主线调查没有获得新线索。',
          ending_hook: '她主动留下陪主角等雨停。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '感情线推进：心意确认、靠近和克制，但没有牵动事业线。' },
              content_outline: {
                cause: '林青禾主动确认心意。',
                development: '主角在靠近和克制之间犹豫。',
                climax: '两人确认边界。',
                ending: '她留下陪主角等雨停。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('romance_career_binding_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('感情线和事业线')
    expect(brief?.next_actions.join('；')).toContain('事业线')
    expect(brief?.next_actions.join('；')).toContain('主线')
  })
  test('does not flag romance career binding when relationship choices change career or mainline state', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '雨夜旧账' },
      [
        {
          chapter_no: 16,
          title: '廊下证言',
          chapter_summary: '林青禾递茶时试探主角是否愿意公开旧账，随后选择以证人身份站队，调查获得关键证言。',
          conflict: '她的选择会影响内门资格，但证人立场改变让旧账主线推进。',
          ending_hook: '她的证言打开下一份账册入口。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: {
                relationship_line: '感情线拉扯：试探、边界和主动选择。',
                mainline: '主线推进：林青禾证人立场改变，调查获得关键证言。',
                career_line: '事业线变化：她可能失去内门资格，主角获得复核资格。',
              },
              content_outline: {
                cause: '林青禾想知道主角是否愿意让她涉险。',
                development: '两人围绕证言代价试探。',
                climax: '她选择站队作证。',
                ending: '证言打开下一份账册入口。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '灯下资格',
          chapter_summary: '林青禾误会主角要推开她，主角让她并肩承担，关系选择改写两人的复核资格。',
          conflict: '长老席要求她退出，否则主角的候选资格会被暂停。',
          ending_hook: '她主动留下，主角因此拿到复核名额和新资源。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: {
                relationship_line: '感情线层次：误会、退让、再确认。',
                mainline: '主线推进：复核名额和新资源到账。',
                career_line: '事业线变化：候选资格被暂停风险压到下一章。',
              },
              content_outline: {
                cause: '长老席要求林青禾退出。',
                development: '两人围绕保护和并肩选择拉扯。',
                climax: '她主动留下。',
                ending: '主角拿到复核名额和新资源。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '檐下名单',
          chapter_summary: '林青禾在檐下确认立场，把自己的旧案名单交给主角，感情选择直接打开下一层主线。',
          conflict: '她交出名单会暴露家族旧案，但能让主角追查幕后长老。',
          ending_hook: '名单指向幕后长老，下一章进入审判庭。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: {
                relationship_line: '感情线推进：心意确认、共同承担和主动选择。',
                mainline: '主线推进：旧案名单打开幕后长老线索。',
                career_line: '事业线变化：审判庭资格和家族代价绑定。',
              },
              content_outline: {
                cause: '林青禾决定交出旧案名单。',
                development: '两人确认共同承担。',
                climax: '她把名单交给主角。',
                ending: '名单指向幕后长老和审判庭资格。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('romance_career_binding_gap')
  })
  test('builds serial momentum brief when supporting characters act like tools without agency', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册递证',
          chapter_summary: '林青禾给主角递来旧账册，提醒他去查第二页。',
          conflict: '执事阻止主角翻阅旧账册。',
          ending_hook: '林青禾又把下一份证据交给主角。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '林青禾负责递证据和提醒主角。' },
              content_outline: {
                cause: '主角缺少旧账册。',
                development: '林青禾递来旧账册。',
                climax: '主角找到第二页异常。',
                ending: '林青禾继续交给主角下一份证据。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯提醒',
          chapter_summary: '巡夜弟子提醒主角夜灯颜色不对，又告诉他禁库入口位置。',
          conflict: '执事继续阻止主角靠近禁库。',
          ending_hook: '巡夜弟子把入口钥匙交给主角。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '巡夜弟子负责提醒、告诉和交钥匙。' },
              content_outline: {
                cause: '主角不知道禁库入口。',
                development: '巡夜弟子告诉他入口位置。',
                climax: '主角拿到钥匙。',
                ending: '巡夜弟子把钥匙交给主角。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '执事拦路',
          chapter_summary: '执事上前阻止主角，随后被主角反证，旁观弟子又提醒主角去内库。',
          conflict: '执事负责拦路，旁观弟子负责提示下一步。',
          ending_hook: '旁观弟子告诉主角内库还有一份记录。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '执事负责阻止，旁观弟子负责提示下一步。' },
              content_outline: {
                cause: '主角要去内库。',
                development: '执事阻止主角。',
                climax: '主角反证执事。',
                ending: '旁观弟子提醒内库记录。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('supporting_character_agency_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('配角')
    expect(brief?.fatigue_risks.join('；')).toContain('工具人')
    expect(brief?.next_actions.join('；')).toContain('立场')
    expect(brief?.next_actions.join('；')).toContain('动机')
  })
  test('does not flag supporting character agency when side characters have goals stakes or positions', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册担保',
          chapter_summary: '林青禾递来旧账册前先说清自己的目标：她要保住担保资格，也不想让父亲旧案继续背锅。',
          conflict: '她帮助主角的代价是失去内门担保资格。',
          ending_hook: '她选择站队主角，承担担保代价。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '林青禾有自己的目标、立场和担保代价。' },
              content_outline: {
                cause: '她要保住担保资格。',
                development: '她权衡是否递出旧账册。',
                climax: '她选择站队主角。',
                ending: '担保资格被压到下一章。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '巡夜改口',
          chapter_summary: '巡夜弟子提醒主角夜灯异常，是因为他害怕牵连妹妹的巡夜名额，想用改口换自保。',
          conflict: '他的利益是保住妹妹名额，不是单纯给主角送钥匙。',
          ending_hook: '他改口后要求主角保住妹妹的试炼资格。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '巡夜弟子有自保动机、妹妹名额和交换条件。' },
              content_outline: {
                cause: '妹妹名额被执事捏住。',
                development: '他试探主角能否保护妹妹。',
                climax: '他用改口换自保条件。',
                ending: '妹妹资格成为下一章代价。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '执事旧账',
          chapter_summary: '执事阻止主角进入内库，是为了保住自己和掌院交易的旧账来源。',
          conflict: '执事的立场来自旧账利益和掌院压力，他阻止主角会暴露自己的交易。',
          ending_hook: '执事宁愿交出旁证，也要保住掌院交易名单。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { relationship_line: '执事有旧账利益、掌院压力和自保选择。' },
              content_outline: {
                cause: '执事要保住旧账来源。',
                development: '他用掌院压力阻止主角。',
                climax: '他选择交出旁证换自保。',
                ending: '掌院交易名单成为新目标。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('supporting_character_agency_gap')
  })
  test('builds serial momentum brief when trump cards are spent without reserve or new backhand', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '旧阵盘反咬',
          chapter_summary: '主角亮出底牌旧阵盘反制执事，执事被当场压制。',
          conflict: '执事逼主角交出旧账，主角只能放出底牌。',
          ending_hook: '这一张底牌用完后，主角暂时没有新的后手。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '主角亮出底牌旧阵盘，底牌用完后等待下一步。' },
              content_outline: {
                cause: '执事逼迫主角交出旧账。',
                development: '主角被迫亮出旧阵盘。',
                climax: '旧阵盘反咬执事。',
                ending: '底牌用完，暂时没有后手。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '残符摊开',
          chapter_summary: '主角又把残符底牌摊开，压住第二轮质问。',
          conflict: '长老席要求他证明残阵来源。',
          ending_hook: '残符也烧尽，他承认手里只剩最后一张底牌。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '主角继续摊开底牌残符，没有补新后手。' },
              content_outline: {
                cause: '长老席继续追问来源。',
                development: '主角摊开残符底牌。',
                climax: '残符烧尽压住质问。',
                ending: '只剩最后一张底牌。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '血印尽出',
          chapter_summary: '主角把最后一张血印底牌也放出来，暂时赢下审问。',
          conflict: '审判庭逼他交出所有证据。',
          ending_hook: '最后一张底牌耗尽，之后再无后手。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '所有底牌一口气摊空，暂时赢下审问。' },
              content_outline: {
                cause: '审判庭逼他交出所有证据。',
                development: '主角放出最后一张血印底牌。',
                climax: '审问被压住。',
                ending: '再无后手。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('trump_card_reserve_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('底牌')
    expect(brief?.fatigue_risks.join('；')).toContain('后手')
    expect(brief?.next_actions.join('；')).toContain('2-3个未揭示')
    expect(brief?.next_actions.join('；')).toContain('新后手')
  })
  test('does not flag trump card reserve when each reveal keeps unrevealed backhands', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '旧阵盘反咬',
          chapter_summary: '主角只出一张旧阵盘底牌反制执事，袖中仍留三张未揭示暗牌。',
          conflict: '执事逼主角交出旧账，主角只亮一张旧阵盘。',
          ending_hook: '阵盘裂纹又解锁一枚新阵纹，成为下一章新后手。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '每次只出1个底牌，仍留三张未揭示暗牌，并补新后手。' },
              content_outline: {
                cause: '执事逼迫主角交出旧账。',
                development: '主角只亮一张旧阵盘。',
                climax: '旧阵盘反咬执事。',
                ending: '仍留三张未揭示暗牌，又解锁新阵纹。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '残符半亮',
          chapter_summary: '主角只动用一枚残符底牌压住质问，另外两张未揭示底牌继续藏着。',
          conflict: '长老席要求他证明残阵来源。',
          ending_hook: '残符换来新目标，下一章追查内库阵图源头。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '只出一张残符，保留两张未揭示底牌，并打开新目标。' },
              content_outline: {
                cause: '长老席继续追问来源。',
                development: '主角只动用一枚残符。',
                climax: '残符压住质问。',
                ending: '保留两张未揭示底牌，打开内库阵图新目标。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '血印不尽',
          chapter_summary: '主角亮出一层血印底牌赢下审问，但仍压着两道未揭示后手。',
          conflict: '审判庭逼他交出所有证据。',
          ending_hook: '血印只揭第一层，下一章还要用新后手反查幕后长老。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '只揭第一层血印，仍有两道未揭示后手，新后手指向幕后长老。' },
              content_outline: {
                cause: '审判庭逼他交出所有证据。',
                development: '主角只揭第一层血印。',
                climax: '审问被压住。',
                ending: '仍有两道未揭示后手，新后手指向幕后长老。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('trump_card_reserve_gap')
  })
})

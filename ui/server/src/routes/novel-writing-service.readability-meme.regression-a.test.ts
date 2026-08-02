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

describe('readability meme regression a', () => {
  test('reads camelCase showdown contract from serialized context_package chapter_target for trump card reserve', () => {
    const chapters = [16, 17, 18].map(chapterNo => ({
      chapter_no: chapterNo,
      title: `底牌第${chapterNo}轮`,
      chapter_summary: `主角第${chapterNo}章亮出底牌压制执事。`,
      conflict: '执事逼主角交出证据，主角只能亮出底牌反制。',
      ending_hook: '执事被压制后，下一轮审问继续升级。',
      raw_payload: {
        context_package: {
          chapter_target: {
            showdownContract: {
              payoffReleaseRules: ['底牌释放后，执事必须被对应压制。'],
              trumpCardReserveRules: ['每次只出1个底牌，保留三张未揭示后手，并获得新后手。'],
            },
          },
        },
      },
    }))

    const brief = buildSerialMomentumBrief({ chapter_no: 20, title: '禁库回声' }, chapters)

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('trump_card_reserve_gap')
  })

  test('builds serial momentum brief when showdown payoffs lack three-pressure three-shock structure', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册反证',
          chapter_summary: '主角公开账册证据，当场反制执事，所有人震惊。',
          conflict: '执事逼主角认错，主角拿出证据反制。',
          ending_hook: '执事低头后，下一章进入夜灯复核。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '装逼爽点：主角拿出证据赢了，全场震惊。' },
              content_outline: {
                cause: '执事逼主角认错。',
                development: '主角拿出账册证据。',
                climax: '主角反制执事。',
                ending: '收获夜灯复核入口，下一章继续追查。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯翻盘',
          chapter_summary: '主角破解夜灯记录，再次当场翻盘，众人继续震惊。',
          conflict: '巡夜执事质疑主角没有资格复核夜灯。',
          ending_hook: '主角拿到夜灯记录，下一章转向禁库入口。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '装逼爽点：主角破解记录赢了，众人震惊。' },
              content_outline: {
                cause: '巡夜执事质疑主角资格。',
                development: '主角破解夜灯记录。',
                climax: '主角当场翻盘。',
                ending: '收获夜灯记录，下一章进入禁库入口。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '禁库改判',
          chapter_summary: '主角打开禁库入口，审问席当场改判，全场还是震惊。',
          conflict: '审问席要求主角证明禁库入口真实存在。',
          ending_hook: '主角赢得复核名额，下一章追查幕后长老。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '装逼爽点：主角打开入口，审问席改判，全场震惊。' },
              content_outline: {
                cause: '审问席要求证明入口。',
                development: '主角打开禁库入口。',
                climax: '审问席当场改判。',
                ending: '收获复核名额，下一章追查幕后长老。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('showdown_pressure_shock_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('三压一爆三震')
    expect(brief?.next_actions.join('；')).toContain('友方')
    expect(brief?.next_actions.join('；')).toContain('中立')
  })

  test('does not flag showdown pressure shock when friendly enemy and neutral reactions all land', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册反证',
          chapter_summary: '友方外门弟子先期待主角翻案，敌方执事两次不服逼他上审问席，中立长老压下判签形成第三重压力；主角一爆碾压后，友方传话、敌方破防、中立长老改口。',
          conflict: '友方期待、敌方不服和中立观望同时加压。',
          ending_hook: '群众层震惊，中间层复盘账册利害，核心层长老改判，下一章进入夜灯复核。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '三压一爆三震：友方期待、敌方不服、中立长老加压；爆后友方、敌方、中立三方震动。' },
              content_outline: {
                cause: '三方压力把主角推上审问席。',
                development: '敌方两次不服，中立长老观望压判签。',
                climax: '主角一爆碾压。',
                ending: '三方震动后打开夜灯复核。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯翻盘',
          chapter_summary: '友方巡夜弟子相信主角能复核，敌方巡夜执事连续质疑，中立账房压住记录不表态；主角破解夜灯后，友方改口作证、敌方失态、中立账房第一次递出账册。',
          conflict: '友方、敌方、中立方三路压力把夜灯复核推到台前。',
          ending_hook: '群众层震惊，中间层看懂夜灯规则，核心层账房改口，下一章转向禁库入口。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '三压一爆三震：三方先铺压，主角爆发后分层震动。' },
              content_outline: {
                cause: '三方压力逼主角复核夜灯。',
                development: '敌方质疑，中立账房观望。',
                climax: '主角破解夜灯。',
                ending: '三方震动后打开禁库入口。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '禁库改判',
          chapter_summary: '友方林青禾相信主角能打开禁库，敌方审问席逼他交出证据，中立长老席继续观望加压；主角打开入口后，友方站队、敌方破防、中立长老改判。',
          conflict: '友方、敌方和中立方同时把压力压到禁库入口。',
          ending_hook: '群众层震惊，中间层复盘禁库规则，核心层长老席改判，下一章追查幕后长老。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { mainline: '三压一爆三震：友方站队、敌方破防、中立长老席改判，群众层中间层核心层震惊传递。' },
              content_outline: {
                cause: '三方压力压到禁库入口。',
                development: '敌方逼证，中立长老席观望。',
                climax: '主角打开禁库入口。',
                ending: '三方震动并打开幕后长老线索。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('showdown_pressure_shock_gap')
  })

  test('builds serial momentum brief when character actions lack motivation chains', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '突然上堂',
          chapter_summary: '主角突然决定冲上审问席，执事也突然改口，剧情需要他们立刻推进旧账线索。',
          conflict: '为了推进主线，主角直接质问执事。',
          ending_hook: '林青禾突然站出来递证据。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { character_line: '角色行为：主角突然上堂，林青禾为了剧情需要递证据。' },
              content_outline: {
                cause: '需要推进旧账线索。',
                development: '主角突然冲上去。',
                climax: '执事突然改口。',
                ending: '林青禾突然递证据。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '方便入库',
          chapter_summary: '巡夜弟子为了方便主线，突然把禁库钥匙交给主角，没有说明自己的动机。',
          conflict: '剧情需要主角进入禁库。',
          ending_hook: '主角突然决定夜闯禁库。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { character_line: '角色行为：巡夜弟子方便剧情交钥匙，主角突然夜闯。' },
              content_outline: {
                cause: '需要进入禁库。',
                development: '巡夜弟子突然交钥匙。',
                climax: '主角直接进入禁库。',
                ending: '主角突然决定夜闯。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '强行改判',
          chapter_summary: '长老席突然改判，反派也突然退场，只是为了让主角拿到复核资格。',
          conflict: '为了让主角进入下一阶段，长老席直接给出资格。',
          ending_hook: '幕后长老突然露面。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { character_line: '角色行为：长老席突然改判，反派为了剧情需要退场。' },
              content_outline: {
                cause: '需要给主角复核资格。',
                development: '长老席突然改判。',
                climax: '反派突然退场。',
                ending: '幕后长老突然露面。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('character_motivation_chain_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('动机链')
    expect(brief?.next_actions.join('；')).toContain('起因')
    expect(brief?.next_actions.join('；')).toContain('代价')
  })

  test('does not flag character motivation when actions include cause motive constraint and cost', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '旧账上堂',
          chapter_summary: '主角因母亲旧铺被栽赃，想保住复核资格，担心林青禾被连累，所以选择上堂质问执事。',
          conflict: '上堂的约束是失去复核资格，代价是把母亲旧铺卷入审问。',
          ending_hook: '林青禾为了保住担保资格，选择递出证据并承担担保代价。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { character_line: '动机链：具体起因、情感动机、约束、风险和行为变化都落地。' },
              content_outline: {
                cause: '母亲旧铺被栽赃，复核资格被压住。',
                development: '主角担心林青禾被连累，权衡上堂代价。',
                climax: '他选择质问执事。',
                ending: '林青禾承担担保代价递证据。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '巡夜交钥',
          chapter_summary: '巡夜弟子害怕妹妹名额被执事扣住，想换取自保，所以在确认主角能保护妹妹后交出禁库钥匙。',
          conflict: '他的约束是妹妹名额和巡夜责罚，代价是被执事追责。',
          ending_hook: '主角因为不想再让旁证背锅，选择夜入禁库承担追责风险。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { character_line: '动机链：巡夜弟子有具体起因、情感动机、交换条件和代价。' },
              content_outline: {
                cause: '妹妹名额被执事捏住。',
                development: '巡夜弟子确认主角能保护妹妹。',
                climax: '他交出钥匙换自保条件。',
                ending: '主角承担追责风险夜入禁库。',
              },
            },
          },
        },
        {
          chapter_no: 18,
          title: '长老改判',
          chapter_summary: '长老席因内库账册牵到自身判签声望，担心继续压案会失去核心层信任，所以选择改判。',
          conflict: '改判的约束是得罪幕后长老，代价是公开承认旧判有误。',
          ending_hook: '反派为了保住掌院交易名单，选择暂退并把幕后长老推到下一章。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: { character_line: '动机链：长老席有声望压力、信任代价和改判理由；反派也有自保动机。' },
              content_outline: {
                cause: '内库账册牵到判签声望。',
                development: '长老席权衡核心层信任和幕后长老压力。',
                climax: '长老席选择改判。',
                ending: '反派为保掌院交易名单暂退。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('character_motivation_chain_gap')
  })

  test('reads camelCase chapter blueprint from serialized context package for character motivation checks', () => {
    const chapters = [16, 17, 18].map(chapterNo => ({
      chapter_no: chapterNo,
      title: `动机链第${chapterNo}章`,
      chapter_summary: '主角突然推进旧账线。',
      conflict: '剧情需要主角立刻行动。',
      ending_hook: '旁证突然出现。',
      raw_payload: {
        context_package: {
          chapterTarget: {
            chapterBlueprint: {
              plotLines: {
                characterLine: '动机链：主角有具体起因、情感动机、约束、风险和行为变化。',
              },
              contentOutline: {
                cause: '母亲旧铺被栽赃，复核资格被压住。',
                development: '主角担心林青禾被连累，权衡上堂代价。',
                climax: '他选择质问执事并承担公开审问风险。',
                ending: '林青禾承担担保代价递证据。',
              },
            },
          },
        },
      },
    }))

    const brief = buildSerialMomentumBrief({ chapter_no: 20, title: '禁库回声' }, chapters)

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('character_motivation_chain_gap')
  })

  test('reads camelCase chapter blueprint from serialized context package for blueprint closure checks', () => {
    const chapters = [16, 17].map(chapterNo => ({
      chapter_no: chapterNo,
      title: `蓝图闭环第${chapterNo}章`,
      chapter_summary: '主角继续整理旧账材料。',
      conflict: '旧账材料仍在整理。',
      ending_hook: '下一页纸还没看完。',
      raw_payload: {
        context_package: {
          chapterTarget: {
            chapterBlueprint: {
              contentOutline: {
                cause: '主角发现旧账材料有缺页。',
                development: '他继续整理材料和线索。',
              },
            },
          },
        },
      },
    }))

    const brief = buildSerialMomentumBrief({ chapter_no: 20, title: '禁库回声' }, chapters)

    expect(brief?.signals.map((item: any) => item.key)).toContain('blueprint_climax_reward_gap')
  })

  test('builds serial momentum brief when conflicts lack no-exit glue', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册拦路',
          chapter_summary: '主角追查旧账册，执事余党上前阻止。',
          conflict: '执事余党阻止主角复核旧账册。',
        },
        {
          chapter_no: 17,
          title: '夜灯封门',
          chapter_summary: '主角靠近禁库夜灯，巡夜弟子封锁入口。',
          conflict: '巡夜弟子封锁禁库入口，不让主角靠近。',
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('conflict_no_exit_glue_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('缺少冲突黏结剂')
    expect(brief?.next_actions.join('；')).toContain('不能随时退出')
    expect(brief?.next_actions.join('；')).toContain('杀人理由')
  })

  test('does not flag no-exit glue when conflicts bind the protagonist with duty cost or place lock', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册拦路',
          chapter_summary: '主角作为值班阵师必须完成复核，若退出会失去复核资格并连累林青禾担保。',
          conflict: '执事余党阻止主角复核旧账册，工作职责和退出代价把他钉在现场。',
        },
        {
          chapter_no: 17,
          title: '夜灯封门',
          chapter_summary: '禁库门禁触发后锁死入口，主角和巡夜弟子都被困在实体场所内。',
          conflict: '巡夜弟子封锁禁库入口；密室规则让双方无法离开，必须当场处理第二道阵鸣。',
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('conflict_no_exit_glue_gap')
  })

  test('builds serial momentum brief when recent chapters leave the protagonist social network blank', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 19, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册暗痕',
          chapter_summary: '主角独自翻检旧账册，发现旧印编号异常。',
          conflict: '旧账册编号和禁库记录互相矛盾。',
        },
        {
          chapter_no: 17,
          title: '夜灯旧声',
          chapter_summary: '主角独自追查禁库夜灯，确认第二道阵鸣残留。',
          conflict: '禁库门禁规则挡住主角继续深入。',
        },
        {
          chapter_no: 18,
          title: '半印残线',
          chapter_summary: '主角独自核对半枚旧印，推断三年前有人改过阵眼。',
          conflict: '旧印裂痕和阵眼记录无法对上。',
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('protagonist_social_network_blank')
    expect(brief?.fatigue_risks.join('；')).toContain('社会关系不空白')
    expect(brief?.next_actions.join('；')).toContain('互动人际网络')
    expect(brief?.next_actions.join('；')).toContain('立场')
  })

  test('does not flag social network blank when recent chapters include relationship-changing interaction', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 19, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册暗痕',
          chapter_summary: '林青禾当众为主角担保，执事余党反对复核，旁观弟子开始改变态度。',
          conflict: '执事余党阻止主角复核旧账册。',
        },
        {
          chapter_no: 17,
          title: '夜灯旧声',
          chapter_summary: '巡夜弟子质问主角，主角用夜灯证据逼他改口，林青禾的担保代价继续加深。',
          conflict: '巡夜弟子封锁禁库入口。',
        },
        {
          chapter_no: 18,
          title: '半印残线',
          chapter_summary: '掌院派人传令限期复核，主角和林青禾约定共同目标，关系从旁观变成协作。',
          conflict: '掌院规则要求主角当晚交出复核结果。',
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('protagonist_social_network_blank')
  })

  test('builds serial momentum brief when status-ladder chapters lack upper-status contact', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '内库回声' },
      [
        {
          chapter_no: 16,
          title: '外门账册',
          chapter_summary: '主角在外门杂役库反复核对旧账，确认一处编号异常。',
          conflict: '外门账册缺页挡住后续追查。',
        },
        {
          chapter_no: 17,
          title: '外门夜灯',
          chapter_summary: '主角在外门巡夜区继续查灯色，发现第二道阵鸣残留。',
          conflict: '外门门禁记录和夜灯颜色对不上。',
        },
        {
          chapter_no: 18,
          title: '杂役旧印',
          chapter_summary: '主角从杂役旧印上找到裂痕，继续在低层账房里排查线索。',
          conflict: '低层账房记录被旧规压住。',
        },
        {
          chapter_no: 19,
          title: '外门复核',
          chapter_summary: '主角把旧账重新排完，只证明外门有人改过记录。',
          conflict: '外门旧规继续要求他补完所有明细。',
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('upper_status_contact_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('上层地位不缺失')
    expect(brief?.next_actions.join('；')).toContain('上位者')
    expect(brief?.next_actions.join('；')).toContain('资格')
  })

})

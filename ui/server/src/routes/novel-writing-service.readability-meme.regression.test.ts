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

describe('readability meme regression', () => {
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

  test('does not flag upper-status contact when hierarchy gates or senior figures are active', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 20, title: '内库回声' },
      [
        {
          chapter_no: 16,
          title: '外门账册',
          chapter_summary: '主角在外门账册里发现内门资格名单被改，掌院派人传令限期复核。',
          conflict: '执事余党阻止主角接触内门资格名单。',
        },
        {
          chapter_no: 17,
          title: '长老夜灯',
          chapter_summary: '长老席第一次点名主角，要求他解释禁库夜灯和内库名单的关系。',
          conflict: '长老席用审判庭规则压住主角。',
        },
        {
          chapter_no: 18,
          title: '内门半印',
          chapter_summary: '主角拿到内门复核名额，声望从外门杂役推进到候选阵师。',
          conflict: '内门候选规则要求主角当晚交出第二份证据。',
        },
        {
          chapter_no: 19,
          title: '审判庭门',
          chapter_summary: '掌院改判后打开审判庭入口，主角得到接触上层账册的资格。',
          conflict: '审判庭高层要求主角当场证明旧案牵连内库。',
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('upper_status_contact_gap')
  })

  test('builds serial momentum brief when downward pressure lacks emotional recovery', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册受审',
          chapter_summary: '执事当众羞辱主角，冷笑说他没有资格复核旧账，旁观弟子都沉默。',
          conflict: '执事逼主角认错并威胁取消复核资格。',
        },
        {
          chapter_no: 17,
          title: '夜灯追责',
          chapter_summary: '巡夜弟子继续逼主角背锅，众人嘲笑他不配靠近禁库入口。',
          conflict: '巡夜弟子要求主角交出旧印并当场认罪。',
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('downward_pressure_recovery_gap')
    expect(brief?.fatigue_risks.join('；')).toContain('主角吃瘪')
    expect(brief?.next_actions.join('；')).toContain('拉回情绪')
    expect(brief?.next_actions.join('；')).toContain('意外收获')
  })

  test('does not flag downward pressure recovery when pressure reveals counterplay or unexpected gain', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册受审',
          chapter_summary: '执事当众羞辱主角，但主角按住袖中旧印，发现旧账规则漏洞并拿到反证线索。',
          conflict: '执事逼主角认错；主角用证据暗牌稳住局面。',
        },
        {
          chapter_no: 17,
          title: '夜灯追责',
          chapter_summary: '巡夜弟子继续逼主角背锅，林青禾递来备份证据，主角意外收获第二道阵鸣入口。',
          conflict: '巡夜弟子要求主角交出旧印；主角获得盟友动作和新线索。',
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('downward_pressure_recovery_gap')
  })

  test('builds serial quality regression brief from repeated recent delivery risks', () => {
    const chapters = [
      { id: 11, chapter_no: 11, title: '旧案复核' },
      { id: 12, chapter_no: 12, title: '证词裂口' },
      { id: 13, chapter_no: 13, title: '半印追查' },
      { id: 14, chapter_no: 14, title: '禁库夜声' },
    ]
    const reviews = [
      {
        id: 201,
        review_type: 'prose_quality',
        payload: JSON.stringify({ chapter_id: 12, chapter_no: 12, self_check: { review: { score: 72, needs_revision: true } } }),
      },
      {
        id: 202,
        review_type: 'deterministic_prose_cleanup',
        payload: JSON.stringify({ chapter_id: 13, chapter_no: 13, deterministic_prose_cleanup: { risk_count: 2, label: '确定性清理残留' } }),
      },
      {
        id: 203,
        review_type: 'state_delta_completeness',
        payload: JSON.stringify({ chapter_id: 14, chapter_no: 14, state_delta_completeness: { missed_count: 3, label: '状态增量漏记 3' } }),
      },
    ]

    const brief = buildSerialQualityRegressionBrief({ chapter_no: 15, title: '第三声' }, chapters, reviews)

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('recent_delivery_quality_regression')
    expect(brief?.chapter_range_label).toBe('第11-14章')
    expect(brief?.fatigue_risks.join('；')).toContain('连续交稿质量退化')
    expect(brief?.next_actions.join('；')).toContain('降速')
    expect(brief?.next_actions.join('；')).toContain('先修复')
    expect(brief?.scene_freshness).toContain('验证修复')
  })

  test('builds serial quality regression brief from repeated scene-card serial repair misses', () => {
    const chapters = [
      { id: 12, chapter_no: 12, title: '账册缺页' },
      { id: 13, chapter_no: 13, title: '旧盟约重签' },
    ]
    const reviews = [
      {
        id: 211,
        review_type: 'prose_quality',
        payload: JSON.stringify({
          chapter_id: 12,
          chapter_no: 12,
          self_check: {
            review: {
              serial_risk_repair_checks: [
                {
                  key: 'scene_serial_risk_repair_1_missing',
                  label: '场景近章风险修复检查',
                  status: 'warn',
                  evidence: '场景1缺少目标推进证据。',
                  fix: '下一章必须把账册新证据写成可见目标推进。',
                },
              ],
            },
          },
        }),
      },
      {
        id: 212,
        review_type: 'prose_quality',
        payload: JSON.stringify({
          chapter_id: 13,
          chapter_no: 13,
          self_check: {
            review: {
              serial_risk_repair_checks: [
                {
                  key: 'scene_serial_risk_repair_2_missing',
                  label: '场景近章风险修复检查',
                  status: 'fail',
                  evidence: '场景2缺少盟友关系变化证据。',
                  fix: '下一章必须让盟友用行动改变态度，不能只旁白说明已经信任。',
                },
              ],
            },
          },
        }),
      },
    ]

    const brief = buildSerialQualityRegressionBrief({ chapter_no: 14, title: '第二个签名' }, chapters, reviews)

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.summary).toContain('近章风险修复')
    expect(brief?.signals[0].detail).toContain('近章风险修复')
    expect(brief?.fatigue_risks.join('；')).toContain('账册新证据写成可见目标推进')
    expect(brief?.fatigue_risks.join('；')).toContain('盟友用行动改变态度')
    expect(brief?.next_actions.join('；')).toContain('近章风险修复')
  })

  test('detects recent payoff intervals longer than five thousand prose characters', () => {
    const chapters = [
      {
        chapter_no: 11,
        title: '旧案复核',
        chapter_summary: '主角当众反制执事，拿到第一份复核名册。',
        conflict: '执事阻止主角靠近名册。',
        chapter_text: '主角拿到第一份复核名册，执事被当众反制。',
      },
      {
        chapter_no: 12,
        title: '藏书阁前',
        chapter_summary: '主角在藏书阁外等待门禁变化。',
        conflict: '观察环境。',
        chapter_text: '字'.repeat(1800),
      },
      {
        chapter_no: 13,
        title: '旧纸复盘',
        chapter_summary: '主角复盘上一轮证据来源。',
        conflict: '复盘说明。',
        chapter_text: '字'.repeat(1900),
      },
      {
        chapter_no: 14,
        title: '廊下转场',
        chapter_summary: '主角走过长廊，继续等待执事通知。',
        conflict: '转场铺垫。',
        chapter_text: '字'.repeat(1800),
      },
    ]

    const brief = buildSerialMomentumBrief({ chapter_no: 15, title: '第二道阵鸣' }, chapters)

    expect(brief?.signals.map((item: any) => item.key)).toContain('payoff_interval_over_5000_chars')
    expect(brief?.fatigue_risks.join('；')).toContain('爽点间隔超过5000字')
    expect(brief?.next_actions.join('；')).toContain('下一章必须交付显性回报')
    expect(brief?.payoff_variation).toContain('显性回报')
  })

  test('does not flag payoff interval when recent no-payoff prose stays under five thousand characters', () => {
    const chapters = [
      {
        chapter_no: 11,
        title: '旧案复核',
        chapter_summary: '主角当众反制执事，拿到第一份复核名册。',
        conflict: '执事阻止主角靠近名册。',
        chapter_text: '主角拿到第一份复核名册，执事被当众反制。',
      },
      {
        chapter_no: 12,
        title: '藏书阁前',
        chapter_summary: '主角在藏书阁外等待门禁变化。',
        conflict: '观察环境。',
        chapter_text: '字'.repeat(1200),
      },
      {
        chapter_no: 13,
        title: '旧纸复盘',
        chapter_summary: '主角复盘上一轮证据来源。',
        conflict: '复盘说明。',
        chapter_text: '字'.repeat(1300),
      },
    ]

    const brief = buildSerialMomentumBrief({ chapter_no: 14, title: '廊下转场' }, chapters)

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('payoff_interval_over_5000_chars')
  })

  test('raises effective quality threshold when recent delivery quality regresses', () => {
    const contextPackage = {
      chapter_target: {
        recent_fatigue_brief: {
          status: 'needs_attention',
          signals: [
            {
              key: 'recent_delivery_quality_regression',
              label: '连续交稿质量退化',
              status: 'warn',
              detail: '最近3章反复出现质量门未过或确定性清理残留。',
            },
          ],
          fatigue_risks: ['连续交稿质量退化：上一批正文需要降速修复。'],
        },
      },
    }

    expect(resolveEffectiveQualityThreshold(0, contextPackage)).toBe(85)
    expect(resolveEffectiveQualityThreshold(78, contextPackage)).toBe(85)
    expect(resolveEffectiveQualityThreshold(90, contextPackage)).toBe(90)
    expect(resolveEffectiveQualityThreshold(78, {
      chapter_target: {
        chapter_no: 18,
        title: '旧账复盘',
      },
      chapterTarget: {
        recentFatigueBrief: {
          status: 'needs_attention',
          signals: [
            {
              key: 'recent_delivery_quality_regression',
              label: '连续交稿质量退化',
              status: 'warn',
              detail: '运行时疲劳雷达要求提高质量门。',
            },
          ],
        },
      },
    })).toBe(85)
    expect(resolveEffectiveQualityThreshold(78, { chapter_target: { recent_fatigue_brief: { signals: [{ key: 'recent_payoff_drought', status: 'warn' }] } } })).toBe(78)
  })

  test('feeds serial quality regression brief into chapter context fatigue radar', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/chapter-context-package.ts'), 'utf8')
    const contextBuildBlock = source.slice(
      source.indexOf('const serialMomentumBrief = buildSerialMomentumBrief(chapter, sorted)'),
      source.indexOf('const previousHandoff = buildPreviousChapterHandoff', source.indexOf('const serialMomentumBrief = buildSerialMomentumBrief(chapter, sorted)')),
    )

    expect(contextBuildBlock).toContain('const serialQualityRegressionBrief = buildSerialQualityRegressionBrief(chapter, sorted, reviews)')
    expect(contextBuildBlock).toContain('const serialFatigueBrief = mergeRecentFatigueBriefs(serialMomentumBrief, serialQualityRegressionBrief)')
  })

  test('feeds serial momentum brief into pre-draft and prose prompt as fatigue guardrails', () => {
    const project = { title: '寒门阵师', reference_config: {} }
    const contextPackage = {
      recent_fatigue_radar: buildSerialMomentumBrief(
        { chapter_no: 16, title: '旧阵异响' },
        [
          { chapter_no: 11, title: '庭外等待', chapter_summary: '主角等待执事通知，整理旧资料。', conflict: '过渡等待。', ending_hook: '夜色渐深。' },
          { chapter_no: 12, title: '藏书阁前', chapter_summary: '主角观察藏书阁门口，回忆旧案。', conflict: '观察环境。', ending_hook: '风吹过门缝。' },
          { chapter_no: 13, title: '旧纸复盘', chapter_summary: '主角复盘上一轮证据，解释阵纹来源。', conflict: '复盘说明。', ending_hook: '纸页轻响。' },
          { chapter_no: 14, title: '廊下转场', chapter_summary: '主角走过长廊，想起师父的话。', conflict: '转场铺垫。', ending_hook: '灯火摇晃。' },
          { chapter_no: 15, title: '第二道阵鸣', chapter_summary: '主角发现旧阵第二道阵鸣来自藏书阁深处。', conflict: '执事余党阻止他入阁。', ending_hook: '地砖下传来第二道阵鸣。' },
        ],
      ),
      chapter_target: {
        chapter_no: 16,
        title: '旧阵异响',
        summary: '主角追查旧阵异响的真实来源。',
        conflict: '执事余党封锁藏书阁。',
        ending_hook: '旧阵深处响起第三声。',
        scene_cards: [
          { scene_no: 1, title: '封锁藏书阁', conflict: '执事余党封锁入口。', reader_payoff: '主角用旧阵异响反向定位。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-11T12:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 16, title: '旧阵异响' })

    expect(brief.recent_fatigue_brief.fatigue_risks.join('；')).toContain('最近5章明确进展不足')
    expect(context.chapter_target.recent_fatigue_brief.next_actions.join('；')).toContain('下一章必须给出明确阻力')
    expect(prompt).toContain('【近章连载动能与疲劳规避】')
    expect(prompt).toContain('逐条执行 next_actions')
    expect(prompt).toContain('最近5章明确进展不足')
    expect(prompt).toContain('连续弱冲突')
  })

  test('normalizes meme bank into abstract usage instead of direct copied phrases', () => {
    const memeBank = normalizeMemeBank([
      {
        meme_key: '班味太重',
        direct_phrase: '这班味也太冲了',
        function: '社畜共鸣',
        tone: '轻度吐槽',
        suitable_genres: ['都市', '规则怪谈'],
        abstract_usage: '把规则压迫写成类似上班制度的荒诞感。',
        expires_at: '2026-12-31',
      },
      { name: '空素材' },
    ])

    expect(memeBank).toHaveLength(1)
    expect(memeBank[0].meme_key).toBe('班味太重')
    expect(memeBank[0].function).toBe('社畜共鸣')
    expect(memeBank[0].unsafe_direct_phrases).toContain('这班味也太冲了')
    expect(memeBank[0].abstract_usage).toContain('不直接复刻原句')
    expect(memeBank[0].suitable_genres).toContain('规则怪谈')
    expect(memeBank[0].expires_at).toBe('2026-12-31')
  })

  test('builds readability review prompt with web novel readability dimensions', () => {
    const prompt = buildReadabilityReviewPrompt(
      { title: '超人的规则怪谈世界' },
      { chapter_target: { chapter_no: 1, title: '双魂降临', scene_cards: [] } },
      '正文',
    )

    expect(prompt).toContain('开篇 300 字')
    expect(prompt).toContain('场景目标、阻碍、转折、回报')
    expect(prompt).toContain('段落是否过长')
    expect(prompt).toContain('对话比例')
    expect(prompt).toContain('人物口吻差异')
    expect(prompt).toContain('爽点/信息增量密度')
    expect(prompt).toContain('readability_score')
    expect(prompt).toContain('ending_hook_score')
    expect(prompt).toContain('章末翻页')
    expect(prompt).toContain('meme_sense')
    expect(prompt).toContain('AI味')
    expect(prompt).toContain('ai_smell')
    expect(prompt).toContain('pattern_hits')
    expect(prompt).toContain('rewrite_tactics')
  })

  test('asks readability review to apply oh-story quick natural prose checklist', () => {
    const prompt = buildReadabilityReviewPrompt(
      { title: '审判庭旧账' },
      { chapter_target: { chapter_no: 4, title: '第三个证人', scene_cards: [] } },
      '正文',
    )

    expect(prompt).toContain('oh-story 快速自检口诀')
    expect(prompt).toContain('一事一段，镜头自然断')
    expect(prompt).toContain('对话要像人说话')
    expect(prompt).toContain('心情不写心里话')
    expect(prompt).toContain('章尾不搞大升华')
    expect(prompt).toContain('打斗不写流水账')
    expect(prompt).toContain('pattern_hits')
  })

  test('builds restrained net-sense polish prompt without allowing plot changes', () => {
    const prompt = buildMemePolishPrompt(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 1,
          title: '双魂降临',
          meme_strategy: {
            intensity: '轻度',
            allowed_functions: ['主角吐槽', '社畜共鸣'],
            forbidden_usage: ['死亡场景不玩梗'],
          },
        },
      },
      '正文',
    )

    expect(prompt).toContain('克制型网感润色')
    expect(prompt).toContain('只允许做语言层润色')
    expect(prompt).toContain('不得修改剧情线')
    expect(prompt).toContain('不得修改设定状态')
    expect(prompt).toContain('used_meme_functions')
    expect(prompt).toContain('rejected_memes')
    expect(prompt).toContain('immersion_risks')
    expect(prompt).toContain('scene_start_anchor')
    expect(prompt).toContain('scene_end_anchor')
    expect(prompt).toContain('scene_card_receipts')
  })

  test('asks meme polish to keep net-sense subordinate to oh-story natural prose', () => {
    const prompt = buildMemePolishPrompt(
      { title: '审判庭旧账' },
      {
        chapter_target: {
          chapter_no: 4,
          title: '第三个证人',
          meme_strategy: {
            intensity: '轻度',
            allowed_functions: ['半拍吐槽'],
          },
        },
      },
      '正文',
    )

    expect(prompt).toContain('oh-story 网感边界')
    expect(prompt).toContain('网感不能覆盖自然写法')
    expect(prompt).toContain('对话要像人说话')
    expect(prompt).toContain('心情不写心里话')
    expect(prompt).toContain('章尾不搞大升华')
    expect(prompt).toContain('不得为了梗改角色声线')
    expect(prompt).toContain('changed_plot(boolean)')
  })

  test('source creates readability review and stores meme bank in reference config', () => {
    const source = [readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-draft-prose.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-editor-meme-polish.ts'), 'utf8'), readFileSync(join(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore.ts'), 'utf8')].join('\n')
    const polishSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-polish-methods.ts'), 'utf8')
    const createSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/create-novel-writing-service.ts'), 'utf8')

    expect(source).toContain('buildReadabilityReviewRecord')
    expect(polishSource).toContain('runReadabilityReview')
    expect(polishSource).toContain('ending_hook_score: Number(payload?.ending_hook_score')
    expect(polishSource).toContain('runMemePolish')
    expect(createSource).toContain('runReadabilityReview')
    expect(createSource).toContain('runMemePolish')
    const writingBibleSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/writing-bible.ts'), 'utf8')
    expect(writingBibleSource).toContain('reference_config?.meme_bank')
  })
})

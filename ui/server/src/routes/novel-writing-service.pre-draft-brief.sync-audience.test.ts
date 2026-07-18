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

describe('chapter pre-draft brief sync-audience', () => {
  test('adds an oh-story reversal design contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '伪证账本',
      genre: '都市逆袭',
      synopsis: '主角被可靠证人和账本同时指控，最后用新证据证明账本被调包，证人身份也另有隐情。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 21,
        title: '证词翻面',
        summary: '可靠证人给出伪证，主角在高压审判里揭示账本被调包。',
        conflict: '众人相信证人身份，反派用旧账本逼主角认罪。',
        ending_hook: '证人摘下面具，露出失踪三年的旧部印记。',
        scene_cards: [
          {
            scene_no: 1,
            title: '可靠证词',
            purpose: '让读者相信证人和账本是铁证。',
            conflict: '主角被迫在认罪和交出底牌之间二选一。',
            information_gap: '证人为什么知道账本细节。',
          },
          {
            scene_no: 2,
            title: '矛盾证据',
            purpose: '新证据否定旧事实。',
            reversal: '账本页码错位，证明它被调包。',
            reader_payoff: '信息反转后，反派所有孝心表演变成自保。',
          },
          {
            scene_no: 3,
            title: '身份揭示',
            purpose: '证人身份反转并留下下一章冲突。',
            reversal: '证人不是外人，而是失踪旧部。',
            ending_hook_seed: '旧部印记只会出现在叛逃名单上。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 21, title: '证词翻面' },
    )

    expect(brief.reversal_contract.version).toBe('oh_story_reversal_v1')
    expect(brief.reversal_contract.reversal_types.join('｜')).toContain('信息反转')
    expect(brief.reversal_contract.reversal_types.join('｜')).toContain('身份反转')
    expect(brief.reversal_contract.setup_requirements.join('｜')).toContain('3处暗示')
    expect(brief.reversal_contract.misdirection_methods.join('｜')).toContain('红鲱鱼')
    expect(brief.reversal_contract.timing_rules.join('｜')).toContain('70-85%')
    expect(brief.reversal_contract.face_slap_rhythm.join('｜')).toContain('打脸节奏')
    expect(confirmedContext.chapter_target.reversal_contract.quality_checks.join('｜')).toContain('3处暗示')
    expect(prompt).toContain('【反转设计合同】')
    expect(prompt).toContain('执行 chapter_target.reversal_contract')
    expect(prompt).toContain('反转类型')
    expect(prompt).toContain('误导技巧')
    expect(prompt).toContain('reversal_checks')
    expect(prompt.indexOf('【反转设计合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit reversal contract from scene reversal context', () => {
    const project = {
      title: '伪证账本',
      genre: '都市逆袭',
      synopsis: '主角被可靠证人和账本同时指控，最后用新证据证明账本被调包，证人身份也另有隐情。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 21,
        title: '证词翻面',
        summary: '可靠证人给出伪证，主角在高压审判里揭示账本被调包。',
        conflict: '众人相信证人身份，反派用旧账本逼主角认罪。',
        ending_hook: '证人摘下面具，露出失踪三年的旧部印记。',
        reversal_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认反转前有公平暗示，揭示后改变局势。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '可靠证词',
            purpose: '让读者相信证人和账本是铁证。',
            conflict: '主角被迫在认罪和交出底牌之间二选一。',
            information_gap: '证人为什么知道账本细节。',
          },
          {
            scene_no: 2,
            title: '矛盾证据',
            purpose: '新证据否定旧事实。',
            reversal: '账本页码错位，证明它被调包。',
            reader_payoff: '信息反转后，反派所有孝心表演变成自保。',
          },
          {
            scene_no: 3,
            title: '身份揭示',
            purpose: '证人身份反转并留下下一章冲突。',
            reversal: '证人不是外人，而是失踪旧部。',
            ending_hook_seed: '旧部印记只会出现在叛逃名单上。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.reversal_contract.source).toBe('manual_incomplete')
    expect(brief.reversal_contract.quality_checks).toEqual(['必须确认反转前有公平暗示，揭示后改变局势。'])
    expect(brief.reversal_contract.reversal_types.join('｜')).toContain('信息反转')
    expect(brief.reversal_contract.reversal_types.join('｜')).toContain('身份反转')
    expect(brief.reversal_contract.reversal_types).not.toContain('无反转')
    expect(brief.reversal_contract.setup_plan.join('｜')).toContain('证人为什么知道账本细节')
    expect(brief.reversal_contract.setup_plan.join('｜')).toContain('账本页码错位')
    expect(brief.reversal_contract.setup_plan.join('｜')).toContain('旧部印记')
    expect(brief.reversal_contract.misdirection_methods.join('｜')).toContain('红鲱鱼')
    expect(brief.reversal_contract.timing_rules.join('｜')).toContain('70-85%')
  })

  test('adds an oh-story showdown contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '审判台上的旧账',
      genre: '都市逆袭打脸',
      synopsis: '主角被旧账本构陷，在公开审判里放出底牌反制会长。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 22,
        title: '旧账反压',
        summary: '反派在审判台公开旧账本，主角用第二本账册和证人链完成打脸。',
        conflict: '会长铺好观众和长老席，逼主角当众认罪。',
        ending_hook: '长老席最上层的人第一次站起来。',
        scene_cards: [
          {
            scene_no: 1,
            title: '审判舞台',
            purpose: '铺设群众层、中间层、核心层的打脸舞台。',
            conflict: '会长让所有人相信旧账本是铁证。',
            reader_payoff: '读者等待主角底牌释放。',
          },
          {
            scene_no: 2,
            title: '底牌出手',
            purpose: '主角放出第二本账册，压制反派并改变长老席利益计算。',
            conflict: '会长试图把证据解释成伪造。',
            reader_payoff: '底牌放出后反派破防，群众震惊分层传递。',
            reversal: '证据链证明会长才是调包人。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-23T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 22, title: '旧账反压' },
    )

    expect(brief.showdown_contract.version).toBe('oh_story_showdown_v1')
    expect(brief.showdown_contract.payoff_release_rules.join('｜')).toContain('该爽不爽')
    expect(brief.showdown_contract.payoff_release_rules.join('｜')).toContain('反派就要受到对应的压制')
    expect(brief.showdown_contract.three_pressure_shock_rules.join('｜')).toContain('三压一爆三震')
    expect(brief.showdown_contract.three_pressure_shock_rules.join('｜')).toContain('友好势力')
    expect(brief.showdown_contract.three_pressure_shock_rules.join('｜')).toContain('敌方势力')
    expect(brief.showdown_contract.three_pressure_shock_rules.join('｜')).toContain('中立势力')
    expect(brief.showdown_contract.stage_chain_rules.join('｜')).toContain('群众层 -> 中间层 -> 核心层')
    expect(brief.showdown_contract.transmission_channel_rules.join('｜')).toContain('传递通道')
    expect(brief.showdown_contract.transmission_channel_rules.join('｜')).toContain('人际关系')
    expect(brief.showdown_contract.shock_chain_rules.join('｜')).toContain('基于自身利益和目标')
    expect(brief.showdown_contract.combat_design_rules.join('｜')).toContain('打斗是一场表演')
    expect(brief.showdown_contract.weak_over_strong_rules.join('｜')).toContain('信息差')
    expect(brief.showdown_contract.counterplay_layers.join('｜')).toContain('预判反制')
    expect(brief.showdown_contract.counterplay_layers.join('｜')).toContain('反预判')
    expect(brief.showdown_contract.emotion_rhythm_rules.join('｜')).toContain('急 -> 缓 -> 急')
    expect(brief.showdown_contract.trump_card_reserve_rules.join('｜')).toContain('2-3个未揭示的底牌')
    expect(brief.showdown_contract.trump_card_reserve_rules.join('｜')).toContain('每次只出1个')
    expect(brief.showdown_contract.trump_card_reserve_rules.join('｜')).toContain('新技能')
    expect(brief.showdown_contract.invincible_protagonist_rules.join('｜')).toContain('主角登场时一点都不能拖拉')
    expect(brief.showdown_contract.invincible_protagonist_rules.join('｜')).toContain('杀伐果断')
    expect(brief.showdown_contract.invincible_protagonist_rules.join('｜')).toContain('战力前置无敌')
    expect(confirmedContext.chapter_target.showdown_contract.quality_checks.join('｜')).toContain('爽点到位')
    expect(prompt).toContain('【高潮对抗合同】')
    expect(prompt).toContain('执行 chapter_target.showdown_contract')
    expect(prompt).toContain('爽点释放')
    expect(prompt).toContain('三压一爆三震')
    expect(prompt).toContain('友好势力')
    expect(prompt).toContain('传递通道')
    expect(prompt).toContain('震惊分层')
    expect(prompt).toContain('三层破局')
    expect(prompt).toContain('预判反制')
    expect(prompt).toContain('底牌管理')
    expect(prompt).toContain('未揭示底牌')
    expect(prompt).toContain('无敌文主角')
    expect(prompt).toContain('战力前置无敌')
    expect(prompt).toContain('showdown_checks')
    expect(prompt.indexOf('【高潮对抗合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('infers showdown contract from runtime chapterTarget scene cards when chapter_target already exists', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '审判台上的旧账',
        genre: '都市逆袭打脸',
        synopsis: '主角被旧账本构陷，在公开审判里放出底牌反制会长。',
      },
      {
        chapter_target: {
          chapter_no: 22,
          title: '旧账反压',
          summary: '旧章节目标只保留基础信息。',
          scene_cards: [],
        },
        chapterTarget: {
          chapterNo: 22,
          title: '旧账反压',
          sceneCards: [
            {
              sceneNo: 1,
              title: '运行时审判舞台',
              purpose: '铺设群众层、中间层、核心层的打脸舞台。',
              conflict: '会长让所有人相信旧账本是铁证。',
              readerPayoff: '底牌放出后反派破防，群众震惊分层传递。',
              reversal: '证据链证明会长才是调包人。',
            },
          ],
        },
      },
    )

    expect(brief.showdown_contract.version).toBe('oh_story_showdown_v1')
    expect(brief.showdown_contract.stage_chain_rules.join('｜')).toContain('群众层 -> 中间层 -> 核心层')
    expect(brief.showdown_contract.three_pressure_shock_rules.join('｜')).toContain('三压一爆三震')
  })

  test('hydrates incomplete explicit showdown contract from scene payoff context', () => {
    const project = {
      title: '审判台上的旧账',
      genre: '都市逆袭打脸',
      synopsis: '主角被旧账本构陷，在公开审判里放出底牌反制会长。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 22,
        title: '旧账反压',
        summary: '反派在审判台公开旧账本，主角用第二本账册和证人链完成打脸。',
        conflict: '会长铺好观众和长老席，逼主角当众认罪。',
        showdown_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认底牌释放后反派被压制，不能反打主角。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '底牌出手',
            purpose: '主角放出第二本账册。',
            conflict: '会长试图把证据解释成伪造。',
            reader_payoff: '底牌放出后反派破防，群众震惊分层传递。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.showdown_contract.source).toBe('manual_incomplete')
    expect(brief.showdown_contract.quality_checks).toEqual(['必须确认底牌释放后反派被压制，不能反打主角。'])
    expect(brief.showdown_contract.payoff_release_rules.join('｜')).toContain('该爽不爽')
    expect(brief.showdown_contract.three_pressure_shock_rules.join('｜')).toContain('三压一爆三震')
    expect(brief.showdown_contract.stage_chain_rules.join('｜')).toContain('人际关系铺垫')
    expect(brief.showdown_contract.transmission_channel_rules.join('｜')).toContain('传递通道')
    expect(brief.showdown_contract.shock_chain_rules.join('｜')).toContain('不是统一的“倒吸一口凉气”')
    expect(brief.showdown_contract.counterplay_layers.join('｜')).toContain('反预判')
    expect(brief.showdown_contract.trump_card_reserve_rules.join('｜')).toContain('每次只出1个')
    expect(brief.showdown_contract.invincible_protagonist_rules.join('｜')).toContain('主角登场时一点都不能拖拉')
    expect(brief.showdown_contract.revision_priorities.join('｜')).toContain('补爽点释放强度')
  })

  test('hydrates explicit showdown invincible protagonist rules from camel case input', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '审判台上的旧账',
        genre: '都市逆袭打脸',
        synopsis: '主角被旧账本构陷，在公开审判里放出底牌反制会长。',
      },
      {
        chapter_target: {
          chapter_no: 22,
          title: '旧账反压',
          summary: '反派在审判台公开旧账本，主角用第二本账册和证人链完成打脸。',
          conflict: '会长铺好观众和长老席，逼主角当众认罪。',
          showdown_contract: {
            source: 'manual_showdown',
            invincibleProtagonistRules: ['自定义：主角登场三句内完成压制。'],
          },
        },
      },
    )

    expect(brief.showdown_contract.source).toBe('manual_showdown')
    expect(brief.showdown_contract.invincible_protagonist_rules).toEqual(['自定义：主角登场三句内完成压制。'])
    expect(brief.showdown_contract.payoff_release_rules.join('｜')).toContain('该爽不爽')
  })

  test('adds an oh-story bridge unit contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '四章一桥的旧城账',
      genre: '都市商业逆袭',
      synopsis: '主角用旧城项目连续制造期待，在公开会上完成阶段兑现并开启下个目标。',
    }
    const contextPackage = {
      next_batch_brief: {
        batch_goal: '四章内完成旧城会审桥段，既兑现账本期待，又把新投资人目标挂上。',
        chapters: [
          { chapter_no: 21, role: '代入日常', goal: '旧城铺垫和角色互动' },
          { chapter_no: 22, role: '信息差', goal: '对手亮出旧账困境' },
          { chapter_no: 23, role: '拉扯增强', goal: '配角反应和主角开始装' },
          { chapter_no: 24, role: '兑现承接', goal: '公开会兑现并开启新目标' },
        ],
      },
      chapter_target: {
        chapter_no: 23,
        title: '旧城会审前夜',
        summary: '主角在旧城会审前夜发现对手账本漏洞，但先让配角承担反应和疑问。',
        conflict: '旧城投资人连续两章没有看到目标推进，对手又用新规阻碍主角入场。',
        ending_hook: '主角把第二份协议按在桌上，所有人终于意识到他要开始装了。',
        scene_cards: [
          {
            scene_no: 1,
            title: '会审前夜',
            purpose: '承接上一章信息差，展示旧城伙伴的焦虑。',
            conflict: '对手新规让主角无法直接发言。',
            reader_payoff: '读者等待协议底牌何时亮出。',
            ending_hook_seed: '主角只问了一句投资人席位还缺不缺人。',
          },
          {
            scene_no: 2,
            title: '协议压桌',
            purpose: '让主角开始装，但先不完全兑现。',
            conflict: '配角质疑主角是否又要拖延。',
            reader_payoff: '主角把协议压桌，开启下一章公开兑现。',
            ending_hook_seed: '门外传来新投资人的脚步声。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-23T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 23, title: '旧城会审前夜' },
    )

    expect(brief.bridge_unit_contract.version).toBe('oh_story_bridge_unit_v1')
    expect(brief.bridge_unit_contract.four_chapter_roles.join('｜')).toContain('四章一桥段')
    expect(brief.bridge_unit_contract.four_chapter_roles.join('｜')).toContain('结尾必须让主角开始装')
    expect(brief.bridge_unit_contract.expectation_chain_rules.join('｜')).toContain('高潮中埋钩子')
    expect(brief.bridge_unit_contract.fatigue_repair_rules.join('｜')).toContain('连续 2 章没有目标推进')
    expect(confirmedContext.chapter_target.bridge_unit_contract.transition_rules.join('｜')).toContain('连续小期待')
    expect(prompt).toContain('【桥段节奏合同】')
    expect(prompt).toContain('执行 chapter_target.bridge_unit_contract')
    expect(prompt).toContain('四章一桥段')
    expect(prompt).toContain('高潮中埋钩子')
    expect(prompt).toContain('bridge_unit_checks')
    expect(prompt.indexOf('【桥段节奏合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit bridge unit contract from continuity context', () => {
    const project = {
      title: '四章一桥的旧城账',
      genre: '都市商业逆袭',
      synopsis: '主角用旧城项目连续制造期待，在公开会上完成阶段兑现并开启下个目标。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 24,
        title: '公开兑现',
        summary: '主角在旧城公开会上兑现旧账本期待，同时给出下一阶段投资人目标。',
        conflict: '对手逼主角一次性证明全部资金来源。',
        bridge_unit_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认本章兑现旧期待前，先挂上新投资人的下一期待。'],
        },
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.bridge_unit_contract.source).toBe('manual_incomplete')
    expect(brief.bridge_unit_contract.quality_checks).toEqual(['必须确认本章兑现旧期待前，先挂上新投资人的下一期待。'])
    expect(brief.bridge_unit_contract.four_chapter_roles.join('｜')).toContain('四章一桥段')
    expect(brief.bridge_unit_contract.climax_duration_rules.join('｜')).toContain('大高潮')
    expect(brief.bridge_unit_contract.transition_rules.join('｜')).toContain('连续小期待')
    expect(brief.bridge_unit_contract.revision_priorities.join('｜')).toContain('补连续期待')
  })

  test('adds an oh-story plot framework contract to route genre frameworks across planning stages', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '失业维修师的系统订单',
      genre: '都市系统升级',
      synopsis: '中年维修师绑定订单系统，通过任务、奖励、兑换和新任务循环翻身。',
      reference_config: {
        writing_bible: {
          golden_finger: '订单系统把维修任务转成经验、技能和工具奖励。',
          commercial_positioning: {
            selling_points: ['系统订单奖励', '客户态度反转', '维修协会打脸'],
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 5,
        title: '第一张协会黑名单',
        summary: '维修协会把主角拉进黑名单，主角必须用系统奖励的检测笔证明协会误判。',
        conflict: '协会会长公开宣布黑名单，客户和围观维修师都不敢让主角碰设备。',
        ending_hook: '系统弹出兑换页，提示下一单是医院备用电源。',
        scene_cards: [
          {
            scene_no: 1,
            title: '黑名单公布',
            purpose: '敌人阵营先出牌，制造协会权威压力。',
            conflict: '协会会长公开宣布主角没有维修资格。',
            reader_payoff: '读者看到主角被看低，等待系统奖励反打。',
          },
          {
            scene_no: 2,
            title: '检测笔反打',
            purpose: '主角阵营用系统奖励破解设备误判。',
            action_beats: ['检测笔点亮隐藏故障', '客户态度松动', '围观维修师开始议论'],
            reader_payoff: '任务奖励变成可见能力，客户态度反转。',
          },
          {
            scene_no: 3,
            title: '兑换新任务',
            purpose: '观众阵营震惊后，系统给出新任务和更高门槛。',
            reader_payoff: '主角获得工具升级和下一单期待。',
            ending_hook_seed: '医院备用电源任务进入倒计时。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-24T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 5, title: '第一张协会黑名单' },
    )

    expect(brief.plot_framework_contract.version).toBe('oh_story_plot_framework_v1')
    expect(brief.plot_framework_contract.genre_framework_route.primary_framework).toContain('RPG结构与奖励设计')
    expect(brief.plot_framework_contract.genre_framework_route.core_loop).toContain('任务→奖励→兑换→新任务')
    expect(brief.plot_framework_contract.selected_frameworks.join('｜')).toContain('RPG结构与奖励设计')
    expect(brief.plot_framework_contract.selected_frameworks.join('｜')).toContain('套路模板重复法')
    expect(brief.plot_framework_contract.selected_frameworks.join('｜')).toContain('框架与阵营手牌法')
    expect(brief.plot_framework_contract.stage_ownership.creation.join('｜')).toContain('题材→框架路由')
    expect(brief.plot_framework_contract.stage_ownership.outline.join('｜')).toContain('单段剧情结构模板')
    expect(brief.plot_framework_contract.stage_ownership.scene_card.join('｜')).toContain('阵营手牌法')
    expect(brief.plot_framework_contract.stage_ownership.prose.join('｜')).toContain('任务→奖励→兑换→新任务')
    expect(brief.plot_framework_contract.stage_ownership.revision.join('｜')).toContain('五不崩')
    expect(brief.plot_framework_contract.rpg_reward_loop.rules.join('｜')).toContain('奖励形式要多样化')
    expect(brief.plot_framework_contract.faction_hand_framework.rules.join('｜')).toContain('主角阵营')
    expect(brief.plot_framework_contract.faction_hand_framework.rules.join('｜')).toContain('敌人阵营')
    expect(brief.plot_framework_contract.faction_hand_framework.rules.join('｜')).toContain('观众阵营')
    expect(brief.plot_framework_contract.routine_variation_rules.join('｜')).toContain('场景更换')
    expect(brief.plot_framework_contract.global_no_collapse_checks.join('｜')).toContain('目标不缺失')
    expect(confirmedContext.chapter_target.plot_framework_contract.quality_checks.join('｜')).toContain('主线和支线错开节奏推进')
    expect(prompt).toContain('【剧情框架合同】')
    expect(prompt).toContain('执行 chapter_target.plot_framework_contract')
    expect(prompt).toContain('题材→框架路由')
    expect(prompt).toContain('RPG结构与奖励设计')
    expect(prompt).toContain('框架与阵营手牌法')
    expect(prompt).toContain('套路模板重复法')
    expect(prompt).toContain('五不崩')
    expect(prompt).toContain('plot_framework_checks')
    expect(prompt.indexOf('【剧情框架合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('adds an oh-story opening contract to early-chapter pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '规则妈妈们找上门',
      genre: '都市脑洞',
      synopsis: '中年失业的主角突然被三位病娇妈妈认领，系统要求他在七天内查清真正血缘。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 1,
        title: '门外有三个妈妈',
        summary: '主角刚被裁员回家，门外同时出现三位自称母亲的人和血缘系统。',
        conflict: '主角必须在签字认亲和报警之间选择，否则系统倒计时清零。',
        ending_hook: '系统提示第一位妈妈的血缘匹配率是零。',
        scene_cards: [
          {
            scene_no: 1,
            title: '裁员回家',
            purpose: '300字内让主角带着中年危机登场。',
            conflict: '房租催缴和裁员通知同时压下来。',
            opening_hook: '李岚把裁员信塞进口袋时，门外响起三道一模一样的敲门声。',
          },
          {
            scene_no: 2,
            title: '三位妈妈',
            purpose: '用极端异常事件制造期待点。',
            reader_payoff: '1000字内出现血缘系统和三位妈妈的反常身份。',
            information_gap: '谁才是真正的母亲。',
          },
          {
            scene_no: 3,
            title: '血缘倒计时',
            purpose: '完成金手指基点并留下第一章钩子。',
            reader_payoff: '系统给出第一次检测。',
            ending_hook_seed: '第一位妈妈匹配率为零。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 1, title: '门外有三个妈妈' },
    )

    expect(brief.opening_contract.version).toBe('oh_story_opening_v1')
    expect(brief.opening_contract.activation_scope).toContain('前3章')
    expect(brief.opening_contract.opening_strategy).toContain('危机开局')
    expect(brief.opening_contract.required_beats.join('｜')).toContain('300 字内主角登场')
    expect(brief.opening_contract.required_beats.join('｜')).toContain('1000 字内出现爽点或期待点')
    expect(brief.opening_contract.five_essentials_rules.join('｜')).toContain('简单点')
    expect(brief.opening_contract.five_essentials_rules.join('｜')).toContain('不能偏')
    expect(brief.opening_contract.five_essentials_rules.join('｜')).toContain('要快')
    expect(brief.opening_contract.five_essentials_rules.join('｜')).toContain('要爽')
    expect(brief.opening_contract.five_essentials_rules.join('｜')).toContain('不能平')
    expect(brief.opening_contract.foundation_points.join('｜')).toContain('人设基点')
    expect(brief.opening_contract.foundation_points.join('｜')).toContain('金手指基点')
    expect(brief.opening_contract.forbidden_patterns.join('｜')).toContain('大段背景介绍')
    expect(confirmedContext.chapter_target.opening_contract.quality_checks.join('｜')).toContain('第一章必须说明')
    expect(prompt).toContain('【开篇设计合同】')
    expect(prompt).toContain('执行 chapter_target.opening_contract')
    expect(prompt).toContain('300 字内主角登场')
    expect(prompt).toContain('开头五要诀')
    expect(prompt).toContain('简单/不偏/快/爽/不平')
    expect(prompt).toContain('三大基点')
    expect(prompt).toContain('opening_checks')
    expect(prompt.indexOf('【开篇设计合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit opening contract from first chapter scene plan', () => {
    const project = {
      title: '规则妈妈们找上门',
      genre: '都市脑洞',
      synopsis: '中年失业的主角突然被三位病娇妈妈认领，系统要求他在七天内查清真正血缘。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 1,
        title: '门外有三个妈妈',
        summary: '主角刚被裁员回家，门外同时出现三位自称母亲的人和血缘系统。',
        conflict: '主角必须在签字认亲和报警之间选择，否则系统倒计时清零。',
        ending_hook: '系统提示第一位妈妈的血缘匹配率是零。',
        opening_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认主角登场、期待点和金手指基点都在正文早段兑现。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '裁员回家',
            purpose: '300字内让主角带着中年危机登场。',
            conflict: '房租催缴和裁员通知同时压下来。',
            opening_hook: '李岚把裁员信塞进口袋时，门外响起三道一模一样的敲门声。',
          },
          {
            scene_no: 2,
            title: '三位妈妈',
            purpose: '用极端异常事件制造期待点。',
            reader_payoff: '1000字内出现血缘系统和三位妈妈的反常身份。',
            information_gap: '谁才是真正的母亲。',
          },
          {
            scene_no: 3,
            title: '血缘倒计时',
            purpose: '完成金手指基点并留下第一章钩子。',
            reader_payoff: '系统给出第一次检测。',
            ending_hook_seed: '第一位妈妈匹配率为零。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.opening_contract.source).toBe('manual_incomplete')
    expect(brief.opening_contract.quality_checks).toEqual(['必须确认主角登场、期待点和金手指基点都在正文早段兑现。'])
    expect(brief.opening_contract.opening_strategy).toContain('危机开局')
    expect(brief.opening_contract.opening_plan.join('｜')).toContain('三道一模一样的敲门声')
    expect(brief.opening_contract.opening_plan.join('｜')).toContain('血缘系统')
    expect(brief.opening_contract.opening_plan.join('｜')).toContain('系统给出第一次检测')
    expect(brief.opening_contract.required_beats.join('｜')).toContain('300 字内主角登场')
    expect(brief.opening_contract.five_essentials_rules.join('｜')).toContain('简单点')
    expect(brief.opening_contract.foundation_points.join('｜')).toContain('金手指基点')
    expect(brief.opening_contract.information_priority.join('｜')).toContain('危机感')
  })

  test('adds an oh-story prose craft contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '雪夜反证',
      genre: '悬疑逆袭',
      synopsis: '主角在雪夜审讯里用账本、旧疤和具体数字拆穿伪证。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        title: '旧疤和八万块',
        summary: '主角在审讯室里通过旧疤、账本金额和对手动作识破伪证。',
        conflict: '对手逼主角签认罪书，主角必须从现场细节里找出破绽。',
        ending_hook: '账本夹层露出一张只写了一块钱的转账单。',
        scene_cards: [
          {
            scene_no: 1,
            title: '认罪书',
            purpose: '用认罪书和旧疤建立贴身视角。',
            conflict: '主角被按在桌前签字。',
            action_beats: ['手腕旧疤被桌沿压住', '笔尖停在认罪书上', '对手把账本推过来'],
            reader_payoff: '读者看到主角从身体细节里发现账本问题。',
          },
          {
            scene_no: 2,
            title: '八万块',
            purpose: '用具体金额推动反证。',
            conflict: '对手声称账本上八万块就是铁证。',
            reader_payoff: '数字变化暴露伪证。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 12, title: '旧疤和八万块' },
    )

    expect(brief.prose_craft_contract.version).toBe('oh_story_prose_craft_v1')
    expect(brief.prose_craft_contract.pov_rules.join('｜')).toContain('深度限知')
    expect(brief.prose_craft_contract.expression_rules.join('｜')).toContain('身体细节替代情绪词')
    expect(brief.prose_craft_contract.scene_weaving_rules.join('｜')).toContain('三维度揉进')
    expect(brief.prose_craft_contract.subject_name_rhythm_rules.join('｜')).toContain('主语与名字节奏')
    expect(brief.prose_craft_contract.subject_name_rhythm_rules.join('｜')).toContain('段首、场景切换、多人同场、视角重置')
    expect(brief.prose_craft_contract.subject_name_rhythm_rules.join('｜')).toContain('每句都在报名字')
    expect(brief.prose_craft_contract.subject_name_rhythm_rules.join('｜')).toContain('指代不清')
    expect(brief.prose_craft_contract.indirect_description_rules.join('｜')).toContain('间接描写法')
    expect(brief.prose_craft_contract.indirect_description_rules.join('｜')).toContain('正面描写只是铺垫')
    expect(brief.prose_craft_contract.indirect_description_rules.join('｜')).toContain('侧面反应才是爽点')
    expect(brief.prose_craft_contract.indirect_description_rules.join('｜')).toContain('嚼饼')
    expect(brief.prose_craft_contract.indirect_description_rules.join('｜')).toContain('哄抢')
    expect(brief.prose_craft_contract.three_camera_rules.join('｜')).toContain('三机位法')
    expect(brief.prose_craft_contract.three_camera_rules.join('｜')).toContain('机位1')
    expect(brief.prose_craft_contract.three_camera_rules.join('｜')).toContain('机位2')
    expect(brief.prose_craft_contract.three_camera_rules.join('｜')).toContain('机位3')
    expect(brief.prose_craft_contract.three_camera_rules.join('｜')).toContain('设定都由冲突引出')
    expect(brief.prose_craft_contract.then_what_rules.join('｜')).toContain('然后呢')
    expect(brief.prose_craft_contract.then_what_rules.join('｜')).toContain('每一段文字')
    expect(brief.prose_craft_contract.then_what_rules.join('｜')).toContain('信息点')
    expect(brief.prose_craft_contract.then_what_rules.join('｜')).toContain('立刻用下一个信息点接上')
    expect(brief.prose_craft_contract.core_emotion_alignment_rules.join('｜')).toContain('核心情绪')
    expect(brief.prose_craft_contract.core_emotion_alignment_rules.join('｜')).toContain('所有情节、人设、冲突')
    expect(brief.prose_craft_contract.core_emotion_alignment_rules.join('｜')).toContain('宏观')
    expect(brief.prose_craft_contract.core_emotion_alignment_rules.join('｜')).toContain('微观')
    expect(brief.prose_craft_contract.baimiao_sensory_rules.join('｜')).toContain('白描')
    expect(brief.prose_craft_contract.baimiao_sensory_rules.join('｜')).toContain('最少的字')
    expect(brief.prose_craft_contract.baimiao_sensory_rules.join('｜')).toContain('准确的信息和情绪')
    expect(brief.prose_craft_contract.baimiao_sensory_rules.join('｜')).toContain('两到三种感官')
    expect(brief.prose_craft_contract.baimiao_sensory_rules.join('｜')).toContain('视觉/听觉/触觉/嗅觉/味觉')
    expect(brief.prose_craft_contract.baimiao_sensory_rules.join('｜')).toContain('五感必须服务情绪')
    expect(brief.prose_craft_contract.dynamic_description_rules.join('｜')).toContain('动态描写优于静态描写')
    expect(brief.prose_craft_contract.dynamic_description_rules.join('｜')).toContain('动作和反应展现')
    expect(brief.prose_craft_contract.dynamic_description_rules.join('｜')).toContain('环境不要大段铺陈')
    expect(brief.prose_craft_contract.dynamic_description_rules.join('｜')).toContain('角色行动中穿插点染')
    expect(brief.prose_craft_contract.shot_rhythm_rules.join('｜')).toContain('镜头与分镜思维')
    expect(brief.prose_craft_contract.shot_rhythm_rules.join('｜')).toContain('每个段落 = 一个镜头')
    expect(brief.prose_craft_contract.shot_rhythm_rules.join('｜')).toContain('远景')
    expect(brief.prose_craft_contract.shot_rhythm_rules.join('｜')).toContain('中景')
    expect(brief.prose_craft_contract.shot_rhythm_rules.join('｜')).toContain('近景')
    expect(brief.prose_craft_contract.shot_rhythm_rules.join('｜')).toContain('特写')
    expect(brief.prose_craft_contract.shot_rhythm_rules.join('｜')).toContain('快节奏')
    expect(brief.prose_craft_contract.shot_rhythm_rules.join('｜')).toContain('慢节奏')
    expect(brief.prose_craft_contract.transition_bridge_rules.join('｜')).toContain('场景切换与转场')
    expect(brief.prose_craft_contract.transition_bridge_rules.join('｜')).toContain('相似物')
    expect(brief.prose_craft_contract.transition_bridge_rules.join('｜')).toContain('相似五感')
    expect(brief.prose_craft_contract.transition_bridge_rules.join('｜')).toContain('相似情绪')
    expect(brief.prose_craft_contract.transition_bridge_rules.join('｜')).toContain('时间跳转')
    expect(brief.prose_craft_contract.transition_bridge_rules.join('｜')).toContain('动作或物件衔接')
    expect(brief.prose_craft_contract.transition_bridge_rules.join('｜')).toContain('空间跳转')
    expect(brief.prose_craft_contract.transition_bridge_rules.join('｜')).toContain('声音或光影衔接')
    expect(brief.prose_craft_contract.rhythm_rules.join('｜')).toContain('一动一静')
    expect(brief.prose_craft_contract.object_number_rules.join('｜')).toContain('具体数字')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('一个主事件')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('3-5 个子事件')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('一个情绪变化')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('一条读者新获知的信息')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('3-5 轮对话交锋')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('小节结尾留一个钩子')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('下一节开头快速接续')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('情绪跨节递进')
    expect(brief.prose_craft_contract.section_density_rules.join('｜')).toContain('小节密度诊断')
    expect(brief.prose_craft_contract.anti_padding_rules.join('｜')).toContain('不得为凑字数加环境描写')
    expect(brief.prose_craft_contract.concept_anchor_rules.join('｜')).toContain('新名词')
    expect(brief.prose_craft_contract.concept_anchor_rules.join('｜')).toContain('动作反应')
    expect(brief.prose_craft_contract.concept_anchor_rules.join('｜')).toContain('物理后果')
    expect(brief.prose_craft_contract.description_limits.join('｜')).toContain('水分控制')
    expect(brief.prose_craft_contract.description_limits.join('｜')).toContain('删掉这段')
    expect(brief.prose_craft_contract.description_limits.join('｜')).toContain('读者不会困惑')
    expect(brief.prose_craft_contract.anti_ai_smell_rules.join('｜')).toContain('高危词')
    expect(brief.prose_craft_contract.anti_ai_smell_rules.join('｜')).toContain('仿佛')
    expect(brief.prose_craft_contract.anti_ai_smell_rules.join('｜')).toContain('章末总结体')
    expect(brief.prose_craft_contract.anti_ai_smell_rules.join('｜')).toContain('叠加式描写')
    expect(brief.prose_craft_contract.forbidden_patterns.join('｜')).toContain('他不知道的是')
    expect(confirmedContext.chapter_target.prose_craft_contract.quality_checks.join('｜')).toContain('每个详写子事件')
    expect(confirmedContext.chapter_target.prose_craft_contract.quality_checks.join('｜')).toContain('偏短小节')
    expect(prompt).toContain('【正文工艺合同】')
    expect(prompt).toContain('执行 chapter_target.prose_craft_contract')
    expect(prompt).toContain('身体细节替代情绪词')
    expect(prompt).toContain('三维度揉进')
    expect(prompt).toContain('subject_name_rhythm_rules')
    expect(prompt).toContain('主语与名字节奏')
    expect(prompt).toContain('段中用代词/省略流动')
    expect(prompt).toContain('间接描写法')
    expect(prompt).toContain('侧面反应')
    expect(prompt).toContain('不要直接宣布')
    expect(prompt).toContain('三机位法')
    expect(prompt).toContain('机位1')
    expect(prompt).toContain('机位2')
    expect(prompt).toContain('机位3')
    expect(prompt).toContain('然后呢')
    expect(prompt).toContain('每段')
    expect(prompt).toContain('信息点')
    expect(prompt).toContain('核心情绪')
    expect(prompt).toContain('情节、人设、冲突')
    expect(prompt).toContain('每个细节')
    expect(prompt).toContain('白描')
    expect(prompt).toContain('五感')
    expect(prompt).toContain('两到三种感官')
    expect(prompt).toContain('服务情绪')
    expect(prompt).toContain('动态描写优于静态描写')
    expect(prompt).toContain('动作和反应')
    expect(prompt).toContain('角色行动中穿插点染')
    expect(prompt).toContain('镜头与分镜思维')
    expect(prompt).toContain('远景')
    expect(prompt).toContain('中景')
    expect(prompt).toContain('近景')
    expect(prompt).toContain('特写')
    expect(prompt).toContain('短句、短段、密集动作')
    expect(prompt).toContain('场景切换与转场')
    expect(prompt).toContain('相似物')
    expect(prompt).toContain('动作或物件')
    expect(prompt).toContain('声音或光影')
    expect(prompt).toContain('小节内部结构')
    expect(prompt).toContain('一个主事件')
    expect(prompt).toContain('3-5 个子事件')
    expect(prompt).toContain('下一节开头快速接续')
    expect(prompt).toContain('情绪跨节递进')
    expect(prompt).toContain('小节密度诊断')
    expect(prompt).toContain('新概念锚点')
    expect(prompt).toContain('新名词')
    expect(prompt).toContain('动作反应')
    expect(prompt).toContain('物理后果')
    expect(prompt).toContain('description_limits')
    expect(prompt).toContain('水分控制')
    expect(prompt).toContain('删掉这段')
    expect(prompt).toContain('anti_ai_smell_rules')
    expect(prompt).toContain('高危词')
    expect(prompt).toContain('章末总结体')
    expect(prompt).toContain('叠加式描写')
    expect(prompt).toContain('prose_craft_checks')
    expect(prompt.indexOf('【正文工艺合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
    const proseCraftSectionStart = prompt.indexOf('【正文工艺合同】')
    const proseCraftSectionEnd = prompt.indexOf('【语气标点谱系合同】')
    const proseCraftSection = prompt.slice(proseCraftSectionStart, proseCraftSectionEnd)
    expect(proseCraftSection.length).toBeLessThan(4300)
    expect(proseCraftSection).not.toContain('"pov_rules"')
    expect(proseCraftSection).not.toContain('"quality_checks"')
  })

  test('hydrates incomplete explicit prose craft contract from scene anchors', () => {
    const project = {
      title: '雪夜反证',
      genre: '悬疑逆袭',
      synopsis: '主角在雪夜审讯里用账本、旧疤和具体数字拆穿伪证。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 12,
        title: '旧疤和八万块',
        summary: '主角在审讯室里通过旧疤、账本金额和对手动作识破伪证。',
        conflict: '对手逼主角签认罪书，主角必须从现场细节里找出破绽。',
        ending_hook: '账本夹层露出一张只写了一块钱的转账单。',
        prose_craft_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认动作、身体细节和数字都承担剧情功能。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '认罪书',
            purpose: '用认罪书和旧疤建立贴身视角。',
            conflict: '主角被按在桌前签字。',
            action_beats: ['手腕旧疤被桌沿压住', '笔尖停在认罪书上', '对手把账本推过来'],
            reader_payoff: '读者看到主角从身体细节里发现账本问题。',
          },
          {
            scene_no: 2,
            title: '八万块',
            purpose: '用具体金额推动反证。',
            conflict: '对手声称账本上八万块就是铁证。',
            reader_payoff: '数字变化暴露伪证。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.prose_craft_contract.source).toBe('manual_incomplete')
    expect(brief.prose_craft_contract.quality_checks).toEqual(['必须确认动作、身体细节和数字都承担剧情功能。'])
    expect(brief.prose_craft_contract.scene_anchors.join('｜')).toContain('手腕旧疤被桌沿压住')
    expect(brief.prose_craft_contract.scene_anchors.join('｜')).toContain('对手把账本推过来')
    expect(brief.prose_craft_contract.scene_anchors.join('｜')).toContain('八万块')
    expect(brief.prose_craft_contract.scene_anchors.join('｜')).toContain('一块钱的转账单')
    expect(brief.prose_craft_contract.pov_rules.join('｜')).toContain('深度限知')
    expect(brief.prose_craft_contract.expression_rules.join('｜')).toContain('身体细节替代情绪词')
    expect(brief.prose_craft_contract.subject_name_rhythm_rules.join('｜')).toContain('主语与名字节奏')
    expect(brief.prose_craft_contract.indirect_description_rules.join('｜')).toContain('间接描写法')
    expect(brief.prose_craft_contract.three_camera_rules.join('｜')).toContain('三机位法')
    expect(brief.prose_craft_contract.then_what_rules.join('｜')).toContain('然后呢')
    expect(brief.prose_craft_contract.core_emotion_alignment_rules.join('｜')).toContain('核心情绪')
    expect(brief.prose_craft_contract.baimiao_sensory_rules.join('｜')).toContain('白描')
    expect(brief.prose_craft_contract.dynamic_description_rules.join('｜')).toContain('动态描写优于静态描写')
    expect(brief.prose_craft_contract.shot_rhythm_rules.join('｜')).toContain('镜头与分镜思维')
    expect(brief.prose_craft_contract.transition_bridge_rules.join('｜')).toContain('场景切换与转场')
    expect(brief.prose_craft_contract.object_number_rules.join('｜')).toContain('具体数字')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('一个主事件')
    expect(brief.prose_craft_contract.section_structure_rules.join('｜')).toContain('下一节开头快速接续')
    expect(brief.prose_craft_contract.section_density_rules.join('｜')).toContain('小节密度诊断')
    expect(brief.prose_craft_contract.anti_padding_rules.join('｜')).toContain('不得为凑字数加环境描写')
    expect(brief.prose_craft_contract.concept_anchor_rules.join('｜')).toContain('新名词')
    expect(brief.prose_craft_contract.description_limits.join('｜')).toContain('水分控制')
    expect(brief.prose_craft_contract.anti_ai_smell_rules.join('｜')).toContain('高危词')
  })

  test('preserves explicit camelCase prose craft subject-name rhythm indirect description three-camera then-what core emotion baimiao sensory dynamic shot transition description-limit and anti-ai rules', () => {
    const project = {
      title: '雪夜反证',
      genre: '悬疑逆袭',
      synopsis: '主角在雪夜审讯里用账本、旧疤和具体数字拆穿伪证。',
    }
    const contextPackage = {
      proseCraftContract: {
        source: 'manual_complete',
        subjectNameRhythmRules: ['自定义主语与名字节奏：段首点名，段中用代词和动作承接，关键转折再点名。'],
        indirectDescriptionRules: ['自定义间接描写法：不要说证据厉害，用旁观者停筷、反派改口和熟人后退证明爽点。'],
        threeCameraRules: ['自定义三机位法：机位1贴主角手上动作，机位2给旁观者退后和环境变化，机位3只补一句冲突触发的设定。'],
        thenWhatRules: ['自定义然后呢基点法：每段最后一个信息点必须引出下一动作、下一疑问或下一反应，不能写成死段。'],
        coreEmotionAlignmentRules: ['自定义核心情绪对齐：每个动作、物件、冲突和配角反应都必须服务复仇被认可的读者情绪。'],
        baimiaoSensoryRules: ['自定义白描五感：只保留最准确的动作名词和触觉/听觉锚点，所有感官都服务审判压迫感。'],
        dynamicDescriptionRules: ['自定义动态描写：人物特征只用动作和反应展现，环境只在角色行动中穿插点染。'],
        shotRhythmRules: ['自定义镜头节奏：冲突用近景和特写压短句，余波用中景和长句放慢，不连续远景铺环境。'],
        transitionBridgeRules: ['自定义转场：时间跳转用账本翻页或钥匙落掌承接，空间跳转用门缝光和脚步声带到新地点。'],
        descriptionLimits: ['自定义描写限额：删掉不影响读者理解的环境句，只保留伏笔、氛围营造或角色互动中的暗流。'],
        antiAiSmellRules: ['自定义去AI味：清掉仿佛、一丝、深吸一口气、章末总结体和叠加式描写。'],
      },
      chapter_target: {
        chapter_no: 12,
        title: '旧疤和八万块',
        summary: '主角在审讯室里通过旧疤、账本金额和对手动作识破伪证。',
        conflict: '对手逼主角签认罪书，主角必须从现场细节里找出破绽。',
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.prose_craft_contract.source).toBe('manual_complete')
    expect(brief.prose_craft_contract.subject_name_rhythm_rules).toEqual(['自定义主语与名字节奏：段首点名，段中用代词和动作承接，关键转折再点名。'])
    expect(brief.prose_craft_contract.indirect_description_rules).toEqual(['自定义间接描写法：不要说证据厉害，用旁观者停筷、反派改口和熟人后退证明爽点。'])
    expect(brief.prose_craft_contract.three_camera_rules).toEqual(['自定义三机位法：机位1贴主角手上动作，机位2给旁观者退后和环境变化，机位3只补一句冲突触发的设定。'])
    expect(brief.prose_craft_contract.then_what_rules).toEqual(['自定义然后呢基点法：每段最后一个信息点必须引出下一动作、下一疑问或下一反应，不能写成死段。'])
    expect(brief.prose_craft_contract.core_emotion_alignment_rules).toEqual(['自定义核心情绪对齐：每个动作、物件、冲突和配角反应都必须服务复仇被认可的读者情绪。'])
    expect(brief.prose_craft_contract.baimiao_sensory_rules).toEqual(['自定义白描五感：只保留最准确的动作名词和触觉/听觉锚点，所有感官都服务审判压迫感。'])
    expect(brief.prose_craft_contract.dynamic_description_rules).toEqual(['自定义动态描写：人物特征只用动作和反应展现，环境只在角色行动中穿插点染。'])
    expect(brief.prose_craft_contract.shot_rhythm_rules).toEqual(['自定义镜头节奏：冲突用近景和特写压短句，余波用中景和长句放慢，不连续远景铺环境。'])
    expect(brief.prose_craft_contract.transition_bridge_rules).toEqual(['自定义转场：时间跳转用账本翻页或钥匙落掌承接，空间跳转用门缝光和脚步声带到新地点。'])
    expect(brief.prose_craft_contract.description_limits).toEqual(['自定义描写限额：删掉不影响读者理解的环境句，只保留伏笔、氛围营造或角色互动中的暗流。'])
    expect(brief.prose_craft_contract.anti_ai_smell_rules).toEqual(['自定义去AI味：清掉仿佛、一丝、深吸一口气、章末总结体和叠加式描写。'])
  })

  test('adds an oh-story quality audit contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '长夜账本',
      genre: '悬疑复仇',
      synopsis: '主角分章释放证据，逼反派从得意到自爆。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 16,
        title: '第二份证据',
        summary: '主角放出第二份证据，让反派第一次失去主动。',
        conflict: '反派试图用新设定解释旧账本，主角必须证明这不是水剧情而是局势变化。',
        ending_hook: '最后一页账本指向第三个证人。',
        scene_cards: [
          {
            scene_no: 1,
            title: '证据开场',
            purpose: '开头有钩子并推进核心事件。',
            conflict: '反派抢先宣布账本无效。',
            reader_payoff: '第二份证据改变局势。',
          },
          {
            scene_no: 2,
            title: '局势变化',
            purpose: '让关系和主线至少推进一项。',
            conflict: '旁观者开始倒向主角。',
            reader_payoff: '反派逼格被削弱但仍有后手。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 16, title: '第二份证据' },
    )

    expect(brief.quality_audit_contract.version).toBe('oh_story_quality_audit_v1')
    expect(brief.quality_audit_contract.structure_checks.join('｜')).toContain('开头有钩子')
    expect(brief.quality_audit_contract.chapter_purpose_rules.join('｜')).toContain('目的词')
    expect(brief.quality_audit_contract.chapter_purpose_rules.join('｜')).toContain('铺垫/高潮/爽点/打脸')
    expect(brief.quality_audit_contract.progression_checks.join('｜')).toContain('删掉这章')
    expect(brief.quality_audit_contract.information_checks.join('｜')).toContain('一章不超 3 个新概念')
    expect(brief.quality_audit_contract.event_content_rules.join('｜')).toContain('事件内容比重不能小于一半')
    expect(brief.quality_audit_contract.event_content_rules.join('｜')).toContain('设定尽量通过事件演绎')
    expect(brief.quality_audit_contract.longform_checks.join('｜')).toContain('最近 5 章')
    expect(brief.quality_audit_contract.five_dimension_rubric.join('｜')).toContain('核心一致度')
    expect(brief.quality_audit_contract.selling_point_expression_rules.join('｜')).toContain('发现比告知爽十倍')
    expect(brief.quality_audit_contract.selling_point_expression_rules.join('｜')).toContain('隐性展示')
    expect(brief.quality_audit_contract.selling_point_expression_rules.join('｜')).toContain('开头暗示')
    expect(brief.quality_audit_contract.selling_point_expression_rules.join('｜')).toContain('中间深化')
    expect(brief.quality_audit_contract.selling_point_expression_rules.join('｜')).toContain('高潮爆发')
    expect(brief.quality_audit_contract.phase_checklist.map((item: any) => item.phase)).toEqual([
      '写前目的锁定',
      '开篇抓取',
      '中段推进',
      '信息负载',
      '章尾拉力',
      '连载连续性',
      '精修策略',
    ])
    expect(brief.quality_audit_contract.phase_checklist[0].receipt_keys).toEqual(['quality_audit_checks'])
    expect(brief.quality_audit_contract.phase_checklist[1].receipt_keys).toEqual(['structure_checks', 'opening_checks'])
    expect(brief.quality_audit_contract.phase_checklist[2].receipt_keys).toEqual(['progression_checks', 'quality_audit_checks'])
    expect(brief.quality_audit_contract.phase_checklist[3].receipt_keys).toEqual(['information_checks'])
    expect(brief.quality_audit_contract.phase_checklist[4].receipt_keys).toEqual(['structure_checks', 'chapter_hook_checks'])
    expect(brief.quality_audit_contract.phase_checklist[5].receipt_keys).toEqual(['longform_checks', 'state_tracking_checks'])
    expect(brief.quality_audit_contract.phase_checklist[6].receipt_keys).toEqual(['quality_audit_checks', 'prose_craft_checks'])
    expect(brief.quality_audit_contract.revision_strategies.join('｜')).toContain('rewrite')
    expect(confirmedContext.chapter_target.quality_audit_contract.quality_checks.join('｜')).toContain('五维评分')
    expect(prompt).toContain('【质量诊断合同】')
    expect(prompt).toContain('执行 chapter_target.quality_audit_contract')
    expect(prompt).toContain('五维评分标准')
    expect(prompt).toContain('章纲目的词')
    expect(prompt).toContain('水文检测')
    expect(prompt).toContain('事件内容比重')
    expect(prompt).toContain('设定尽量通过事件演绎')
    expect(prompt).toContain('卖点表达')
    expect(prompt).toContain('发现比告知爽十倍')
    expect(prompt).toContain('开头暗示')
    expect(prompt).toContain('中间深化')
    expect(prompt).toContain('高潮爆发')
    expect(prompt).toContain('阶段质量清单')
    expect(prompt).toContain('写前目的锁定 -> quality_audit_checks')
    expect(prompt).toContain('开篇抓取 -> structure_checks/opening_checks')
    expect(prompt).toContain('中段推进 -> progression_checks/quality_audit_checks')
    expect(prompt).toContain('信息负载 -> information_checks')
    expect(prompt).toContain('章尾拉力 -> structure_checks/chapter_hook_checks')
    expect(prompt).toContain('连载连续性 -> longform_checks/state_tracking_checks')
    expect(prompt).toContain('精修策略 -> quality_audit_checks/prose_craft_checks')
    expect(prompt).toContain('quality_audit_checks')
    expect(prompt.indexOf('【质量诊断合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit quality audit contract from chapter focus', () => {
    const project = {
      title: '长夜账本',
      genre: '悬疑复仇',
      synopsis: '主角分章释放证据，逼反派从得意到自爆。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 16,
        title: '第二份证据',
        summary: '主角放出第二份证据，让反派第一次失去主动。',
        conflict: '反派试图用新设定解释旧账本，主角必须证明这不是水剧情而是局势变化。',
        ending_hook: '最后一页账本指向第三个证人。',
        quality_audit_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认本章不可删除，且最低分维度有精修策略。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '证据开场',
            purpose: '开头有钩子并推进核心事件。',
            conflict: '反派抢先宣布账本无效。',
            reader_payoff: '第二份证据改变局势。',
          },
          {
            scene_no: 2,
            title: '局势变化',
            purpose: '让关系和主线至少推进一项。',
            conflict: '旁观者开始倒向主角。',
            reader_payoff: '反派逼格被削弱但仍有后手。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.quality_audit_contract.source).toBe('manual_incomplete')
    expect(brief.quality_audit_contract.quality_checks).toEqual(['必须确认本章不可删除，且最低分维度有精修策略。'])
    expect(brief.quality_audit_contract.chapter_focus.join('｜')).toContain('第二份证据')
    expect(brief.quality_audit_contract.chapter_focus.join('｜')).toContain('局势变化')
    expect(brief.quality_audit_contract.chapter_focus.join('｜')).toContain('最后一页账本指向第三个证人')
    expect(brief.quality_audit_contract.chapter_focus.join('｜')).toContain('第二份证据改变局势')
    expect(brief.quality_audit_contract.structure_checks.join('｜')).toContain('开头有钩子')
    expect(brief.quality_audit_contract.chapter_purpose_rules.join('｜')).toContain('目的词')
    expect(brief.quality_audit_contract.revision_strategies.join('｜')).toContain('rewrite')
    expect(brief.quality_audit_contract.five_dimension_rubric.join('｜')).toContain('核心一致度')
    expect(brief.quality_audit_contract.selling_point_expression_rules.join('｜')).toContain('发现比告知爽十倍')
    expect(brief.quality_audit_contract.phase_checklist.map((item: any) => item.phase)).toContain('写前目的锁定')
  })

  test('detects oh-story new concept overload from explicit chapter usage', () => {
    const checks = scanNewConceptOverloadRisks({
      setting_context: {
        chapter_usage: [
          { name: '镜州旧印', usage_type: 'introduce', summary: '首次引入旧印规则。' },
          { name: '血契账本', usage_type: 'new_concept', summary: '新增账本验血设定。' },
          { name: '盐商暗码', status: '首次引入', summary: '第一次出现暗码。' },
          { name: '夜巡司令牌', is_new: true, summary: '新道具。' },
          { name: '边军腰牌', usage_type: 'advance', summary: '已有伏笔推进。' },
        ],
      },
      storyline_context: {
        chapter_usage: [
          { name: '旧臣背刺线', usage_type: 'plant', summary: '已有主线种子。' },
        ],
      },
    })

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('quality_audit_new_concept_overload')
    expect(checks[0].status).toBe('fail')
    expect(checks[0].evidence).toContain('镜州旧印')
    expect(checks[0].evidence).toContain('夜巡司令牌')
    expect(checks[0].fix).toContain('最多保留 3 个')
  })

  test('detects new concepts introduced without an immediate action or consequence anchor', () => {
    const contextPackage = {
      setting_context: {
        chapter_usage: [
          { name: '蓝晶', usage_type: 'new_concept', summary: '首次出现的记忆载体。' },
        ],
      },
    }
    const looseText = [
      '沈砚看见蓝晶。',
      '蓝晶是旧王朝留下来的记忆器，源于三百年前的祭司制度，分为七阶九品。',
      '这个设定以后会有用。',
    ].join('\n')
    const anchoredText = [
      '林青禾把蓝晶按上太阳穴。',
      '陌生人的记忆碎片在她眼前炸开，旧账本缺页的位置随之浮出来。',
      '她捂住鼻血，只说：“它能找回被删掉的证据。”',
    ].join('\n')

    const looseChecks = scanNewConceptAnchorRisks(contextPackage, looseText)
    const anchoredChecks = scanNewConceptAnchorRisks(contextPackage, anchoredText)

    expect(looseChecks).toHaveLength(1)
    expect(looseChecks[0].key).toBe('prose_craft_new_concept_anchor_missing')
    expect(looseChecks[0].status).toBe('warn')
    expect(looseChecks[0].evidence).toContain('蓝晶')
    expect(looseChecks[0].fix).toContain('动作反应')
    expect(looseChecks[0].fix).toContain('物理后果')
    expect(anchoredChecks).toHaveLength(0)
  })

  test('detects economic or power scale without ordinary-person anchors', () => {
    const checks = scanEconomicPowerScaleAnchorRisks([
      '他一口气拿出三千万灵石，又把战力推到九万点，众人全都沉默。',
      '执事看见账册上的数字，只说这次赌局已经结束。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('quality_audit_scale_anchor_missing')
    expect(checks[0].label).toContain('尺度锚点')
    expect(checks[0].status).toBe('warn')
    expect(checks[0].evidence).toContain('三千万灵石')
    expect(checks[0].evidence).toContain('九万点')
    expect(checks[0].fix).toContain('普通人')
    expect(checks[0].fix).toContain('收入')
    expect(checks[0].fix).toContain('日常尺度')
  })

  test('does not flag economic or power scale when ordinary anchors are visible', () => {
    const checks = scanEconomicPowerScaleAnchorRisks([
      '三千万灵石相当于外门弟子三百年月俸，林砚听见账房伙计倒吸气。',
      '他的战力推到九万点，负责测评的杂役低头看了看自己一年工资才够换一次入门丹。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects vague quantity weight where oh-story expects concrete numbers', () => {
    const checks = scanVagueQuantityWeightRisks([
      '沈栀看着账单，想起姐姐为了她欠了很多钱，也等了很久。',
      '',
      '姐夫转来的钱不多，她却把那条消息翻了无数次。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('prose_vague_quantity_weight_1_2')
    expect(checks[0].label).toBe('模糊数字重量扫描')
    expect(checks[0].evidence).toContain('很多钱')
    expect(checks[0].evidence).toContain('很久')
    expect(checks[0].fix).toContain('金额')
    expect(checks[0].fix).toContain('年限')
    expect(checks[0].fix).toContain('次数')
  })

  test('does not flag quantity weight when concrete amount duration and repetition are visible', () => {
    const checks = scanVagueQuantityWeightRisks([
      '沈栀看着八万块账单，想起姐姐为了她还了三年，也等了二十个月。',
      '姐夫只转来一块钱，她却把那条消息翻了十七次。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic vague quantity weight risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicVagueQuantityWeightChecks = scanVagueQuantityWeightRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicVagueQuantityWeightChecks')
  })

  test('builds an oh-story revision strategy brief from failed quality checks', () => {
    const brief = buildRevisionStrategyBrief({
      quality_audit_checks: [
        {
          key: 'quality_audit_core_consistency',
          label: '核心一致度',
          status: 'fail',
          evidence: '核心冲突从账本验血变成了闲聊。',
          fix: '围绕账本验血重写对峙段。',
          strategy: 'rewrite',
        },
        {
          key: 'quality_audit_new_concept_overload',
          label: '新概念负载',
          status: 'warn',
          evidence: '本章新增 5 个设定名。',
          fix: '最多保留 3 个新概念，其余延后。',
          strategy: 'compress',
        },
      ],
      deslop_checks: [
        {
          gate: 'Gate F',
          status: 'fail',
          evidence: '更大的风暴即将来临。',
          fix: '改成角色当下能感知的具体威胁。',
        },
      ],
      prose_craft_checks: [
        {
          key: 'emotion_telling',
          status: 'warn',
          evidence: '他感到一阵悲伤。',
          fix: '改成身体动作和环境交互。',
        },
      ],
    })

    expect(brief.primary_strategy).toBe('rewrite')
    expect(brief.strategy_order).toEqual(['rewrite', 'compress', 'de_ai'])
    expect(brief.directives.join('｜')).toContain('围绕账本验血重写对峙段')
    expect(brief.directives.join('｜')).toContain('最多保留 3 个新概念')
    expect(brief.directives.join('｜')).toContain('去AI味')
    expect(brief.reasons.join('｜')).toContain('核心一致度')
    expect(brief.reasons.join('｜')).toContain('Gate F')
  })

  test('uses scene-card serial risk repair checks to choose rewrite revision strategy', () => {
    const brief = buildRevisionStrategyBrief({
      serial_risk_repair_checks: [
        {
          key: 'scene_serial_risk_repair_1_missing',
          label: '场景近章风险修复检查',
          status: 'warn',
          evidence: '场景1标注 two_chapter_momentum_stall，但正文只复盘账册，没有目标推进、新信息或关系变化。',
          fix: '把账册新证据写成主角逼盟友改口的可见事件，并让盟友关系发生明确变化。',
        },
      ],
    })

    expect(brief.primary_strategy).toBe('rewrite')
    expect(brief.strategy_order).toEqual(['rewrite'])
    expect(brief.reasons.join('｜')).toContain('场景近章风险修复检查')
    expect(brief.directives.join('｜')).toContain('账册新证据')
    expect(brief.directives.join('｜')).toContain('盟友关系发生明确变化')
  })

  test('uses deterministic payoff-density cleanup residuals to choose rewrite revision strategy', () => {
    const brief = buildRevisionStrategyBrief({
      deterministic_prose_cleanup: {
        risk_count: 7,
        categories: [
          {
            type: 'payoff_density',
            label: '可见读者回报密度',
            count: 1,
            evidence: ['第1-21段连续约1680字缺少可见读者回报。'],
            required_actions: ['把长铺垫切成短周期事件，补主角反制、信息收益、关系变化或阶段结算。'],
          },
          {
            type: 'deslop',
            label: '去AI味',
            count: 6,
            evidence: ['连续使用“仿佛有生命一般”等万能比喻。'],
            required_actions: ['删掉万能比喻，改成动作、感官和角色反应。'],
          },
        ],
      },
    })

    expect(brief.primary_strategy).toBe('rewrite')
    expect(brief.strategy_order).toEqual(['rewrite', 'de_ai'])
    expect(brief.directives.join('｜')).toContain('短周期事件')
    expect(brief.directives.join('｜')).toContain('主角反制')
    expect(brief.directives.join('｜')).toContain('去AI味')
    expect(brief.reasons.join('｜')).toContain('可见读者回报密度')
  })

  test('uses focused revision modes to build oh-story revision strategy directives', () => {
    const brief = buildRevisionStrategyBrief({
      focused_revision_modes: ['expand_action', 'cut_description', 'restore_hook'],
    })

    expect(brief.primary_strategy).toBe('rewrite')
    expect(brief.strategy_order).toEqual(['rewrite', 'compress'])
    expect(brief.focused_revision_modes).toEqual(['expand_action', 'cut_description', 'restore_hook'])
    expect(brief.directives.join('｜')).toContain('expand_action')
    expect(brief.directives.join('｜')).toContain('动作链')
    expect(brief.directives.join('｜')).toContain('cut_description')
    expect(brief.directives.join('｜')).toContain('压缩不推动剧情')
    expect(brief.directives.join('｜')).toContain('restore_hook')
    expect(brief.directives.join('｜')).toContain('章末钩子')
  })

  test('uses setting violations to build oh-story rewrite directives', () => {
    const brief = buildRevisionStrategyBrief({
      setting_violations: [
        {
          setting_name: '旧印章',
          type: 'ownership',
          severity: 'high',
          description: '正文写成主角已经拿到完整旧印章，但设定中只有半枚印纹，旧印章仍在祠堂封存。',
          fix: '改成主角只拿到半枚印纹，旧印章仍在祠堂封存；能力触发只能来自半枚印纹的残留规则。',
        },
      ],
    })

    expect(brief.primary_strategy).toBe('rewrite')
    expect(brief.strategy_order).toEqual(['rewrite'])
    expect(brief.setting_violations).toHaveLength(1)
    expect(brief.directives.join('｜')).toContain('repair_setting_violation')
    expect(brief.directives.join('｜')).toContain('旧印章')
    expect(brief.directives.join('｜')).toContain('半枚印纹')
    expect(brief.directives.join('｜')).toContain('祠堂封存')
  })

  test('uses explicit revision directives to build oh-story revision strategy directives', () => {
    const brief = buildRevisionStrategyBrief({
      revision_directives: [
        'ten_chapter_selling_point：补核心卖点、能力使用、规则限制、读者回报或章末新期待。',
        '压缩不推动剧情、信息或情绪变化的环境描写。',
      ],
    })

    expect(brief.primary_strategy).toBe('rewrite')
    expect(brief.strategy_order).toEqual(['rewrite', 'compress'])
    expect(brief.revision_directives).toEqual([
      'ten_chapter_selling_point：补核心卖点、能力使用、规则限制、读者回报或章末新期待。',
      '压缩不推动剧情、信息或情绪变化的环境描写。',
    ])
    expect(brief.directives.join('｜')).toContain('ten_chapter_selling_point')
    expect(brief.directives.join('｜')).toContain('补核心卖点')
    expect(brief.directives.join('｜')).toContain('压缩不推动剧情')
  })

  test('uses craft metrics to build oh-story revision strategy directives', () => {
    const brief = buildRevisionStrategyBrief({
      craft_metrics: {
        action_detail_score: 58,
        description_overuse_score: 82,
        event_density_score: 61,
        combat_process_score: 55,
        setting_consistency_score: 63,
      },
    })

    expect(brief.primary_strategy).toBe('rewrite')
    expect(brief.strategy_order).toEqual(['rewrite', 'compress'])
    expect(brief.craft_metric_risks.map((item: any) => item.key)).toEqual([
      'action_detail_score',
      'event_density_score',
      'combat_process_score',
      'setting_consistency_score',
      'description_overuse_score',
    ])
    expect(brief.directives.join('｜')).toContain('action_detail_score')
    expect(brief.directives.join('｜')).toContain('动作链')
    expect(brief.directives.join('｜')).toContain('event_density_score')
    expect(brief.directives.join('｜')).toContain('每 3-5 段')
    expect(brief.directives.join('｜')).toContain('combat_process_score')
    expect(brief.directives.join('｜')).toContain('出手、反应、空间变化')
    expect(brief.directives.join('｜')).toContain('description_overuse_score')
    expect(brief.directives.join('｜')).toContain('压缩不推动剧情')
  })

  test('normalizes oh-story five-dimension quality scores for revision planning', () => {
    const scores = normalizeFiveDimensionQualityScores({
      core_consistency: { score: 72, evidence: '核心冲突偏离账本验血。' },
      surface_rewrite: { score: 83, evidence: '句式基本自然。' },
      format_consistency: 79,
      readability: { score: 68, evidence: '解释腔和空泛总结较多。' },
      logic_coherence: { score: 81, evidence: '因果基本成立。' },
    })

    expect(scores.lowest_dimension?.key).toBe('readability')
    expect(scores.lowest_dimension?.strategy).toBe('de_ai')
    expect(scores.dimensions.map((item: any) => item.key)).toEqual([
      'core_consistency',
      'surface_rewrite',
      'format_consistency',
      'readability',
      'logic_coherence',
    ])
    expect(scores.dimensions.find((item: any) => item.key === 'core_consistency')?.evidence).toContain('账本验血')
    expect(scores.below_threshold.map((item: any) => item.key)).toEqual(['core_consistency', 'readability'])
  })

  test('uses low five-dimension scores to choose oh-story revision strategy', () => {
    const brief = buildRevisionStrategyBrief({
      five_dimension_scores: {
        core_consistency: { score: 72, evidence: '核心冲突偏离账本验血。' },
        readability: { score: 68, evidence: '解释腔和空泛总结较多。' },
      },
    })

    expect(brief.primary_strategy).toBe('de_ai')
    expect(brief.strategy_order).toEqual(['de_ai', 'rewrite'])
    expect(brief.reasons.join('｜')).toContain('可读性')
    expect(brief.reasons.join('｜')).toContain('解释腔')
    expect(brief.directives.join('｜')).toContain('readability')
  })

  test('uses style boundary checks to choose oh-story revision strategy', () => {
    const brief = buildRevisionStrategyBrief({
      style_boundary_checks: [
        {
          key: 'gate_f_overridden_by_style',
          label: '文风覆盖 Gate F',
          status: 'fail',
          evidence: '章尾为了模仿样章冷感，写成“这一切只是开始”的作者预告。',
          fix: '删掉为了模仿文风引入的章末升华，改成旧印章背面的第二个名字。',
        },
        {
          key: 'copy_boundary_breach',
          label: '复制样章桥段',
          status: 'warn',
          evidence: '审判场景复用了样章的三次敲桌和同一句口癖。',
          fix: '保留压迫节奏，但改成证物裂纹、旁观倒戈和执事抢证。',
        },
      ],
    })

    expect(brief.primary_strategy).toBe('de_ai')
    expect(brief.strategy_order).toEqual(['de_ai'])
    expect(brief.reasons.join('｜')).toContain('文风覆盖 Gate F')
    expect(brief.reasons.join('｜')).toContain('复制样章桥段')
    expect(brief.directives.join('｜')).toContain('章末升华')
    expect(brief.directives.join('｜')).toContain('证物裂纹')
  })

  test('adds an oh-story punctuation tone contract to pre-draft brief and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const project = {
      title: '长夜账本',
      genre: '悬疑复仇',
      synopsis: '主角用证据反打，让对手当众失控。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 17,
        title: '第三个证人',
        summary: '主角逼第三个证人开口，让反派从冷静压迫转为爆发。',
        conflict: '证人试探、反派压迫、主角反问逼供交替出现。',
        ending_hook: '证人问出一个让全场安静的问题。',
        scene_cards: [
          {
            scene_no: 1,
            title: '冷静压迫',
            purpose: '反派用短句压住证人。',
            conflict: '证人不敢说出账本来源。',
            reader_payoff: '压迫感来自短句和动作停顿。',
          },
          {
            scene_no: 2,
            title: '反问逼供',
            purpose: '主角用反问和证据逼证人转向。',
            conflict: '证人试探主角是否真有底牌。',
            reader_payoff: '问号和短促追问服务信息差反打。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-22T12:00:00.000Z',
    })
    const prompt = service.buildParagraphProseContext(
      project,
      confirmedContext,
      null,
      { chapter_no: 17, title: '第三个证人' },
    )

    expect(brief.punctuation_tone_contract.version).toBe('oh_story_punctuation_tone_v1')
    expect(brief.punctuation_tone_contract.tone_punctuation_map.join('｜')).toContain('质问 / 试探 / 反问')
    expect(brief.punctuation_tone_contract.forbidden_marks.join('｜')).toContain('……')
    expect(brief.punctuation_tone_contract.scene_tone_plan.join('｜')).toContain('场景2')
    expect(confirmedContext.chapter_target.punctuation_tone_contract.quality_checks.join('｜')).toContain('通篇句号化')
    expect(prompt).toContain('【语气标点谱系合同】')
    expect(prompt).toContain('执行 chapter_target.punctuation_tone_contract')
    expect(prompt).toContain('标点服务语气、人物声线和情绪节奏')
    expect(prompt).toContain('punctuation_tone_checks')
    expect(prompt.indexOf('【语气标点谱系合同】')).toBeLessThan(prompt.indexOf('【结构化上下文包】'))
  })

  test('hydrates incomplete explicit punctuation tone contract from scene tone context', () => {
    const project = {
      title: '长夜账本',
      genre: '悬疑复仇',
      synopsis: '主角用证据反打，让对手当众失控。',
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 17,
        title: '第三个证人',
        summary: '主角逼第三个证人开口，让反派从冷静压迫转为爆发。',
        conflict: '证人试探、反派压迫、主角反问逼供交替出现。',
        punctuation_tone_contract: {
          source: 'manual_incomplete',
          quality_checks: ['必须确认问号和爆点标点都服务人物声线。'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '反问逼供',
            purpose: '主角用反问和证据逼证人转向。',
            conflict: '证人试探主角是否真有底牌。',
            reader_payoff: '问号和短促追问服务信息差反打。',
          },
          {
            scene_no: 2,
            title: '反派爆发',
            purpose: '反派当众失控。',
            conflict: '反派怒喊证人撒谎。',
            reader_payoff: '爆发只在峰值保留少量感叹号。',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief(project, contextPackage)

    expect(brief.punctuation_tone_contract.source).toBe('manual_incomplete')
    expect(brief.punctuation_tone_contract.quality_checks).toEqual(['必须确认问号和爆点标点都服务人物声线。'])
    expect(brief.punctuation_tone_contract.scene_tone_plan.join('｜')).toContain('场景1')
    expect(brief.punctuation_tone_contract.scene_tone_plan.join('｜')).toContain('质问 / 试探 / 反问')
    expect(brief.punctuation_tone_contract.scene_tone_plan.join('｜')).toContain('场景2')
    expect(brief.punctuation_tone_contract.scene_tone_plan.join('｜')).toContain('惊讶 / 爆发 / 打脸')
    expect(brief.punctuation_tone_contract.tone_punctuation_map.join('｜')).toContain('质问 / 试探 / 反问')
    expect(brief.punctuation_tone_contract.forbidden_marks.join('｜')).toContain('……')
    expect(brief.punctuation_tone_contract.revision_priorities.join('｜')).toContain('修通篇句号化')
  })

  test('adds previous chapter handoff to the pre-draft brief from continuity context', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        continuity: {
          previous_chapter: {
            chapter_no: 2,
            title: '第一条规则',
            ending_hook: '门外湿漉漉的校服男生敲响玻璃门。',
            ending_excerpt: '李超刚要开门，林晓脸色惨白地拦住他：“别开，他不是人。”玻璃门外，那男生慢慢抬头。',
          },
        },
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '判断门外学生是否是规则诱饵。',
          conflict: '救人还是守规。',
          scene_cards: [
            { scene_no: 1, title: '门前对峙', reader_payoff: '识破门外学生的第一层规则诱饵。' },
          ],
        },
      },
    )

    expect(brief.previous_handoff).toContain('第2章《第一条规则》')
    expect(brief.previous_handoff).toContain('校服男生敲响玻璃门')
    expect(brief.previous_handoff).toContain('别开，他不是人')
  })

  test('adds reader retention radar to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        synopsis: '超人蛮力与规则怪谈智斗的双主角长篇。',
        reference_config: {
          writing_bible: {
            commercial_positioning: {
              retention_strategy: '前三章快速展示规则反制和双主角互补。',
            },
          },
        },
      },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '十点后宿舍外的黑暗开始清除违规者。',
          conflict: '李超想试探门外阴影，张智必须阻止他。',
          ending_hook: '门外湿漉漉的学生敲响玻璃门。',
          scene_cards: [
            {
              scene_no: 1,
              title: '十点门槛',
              opening_hook: '九点五十九分最后一秒被秒针推过去。',
              reader_payoff: '超人力量第一次被规则边界反制。',
              information_gap: '门外阴影到底按什么判定清除目标。',
              reversal: '饼干碎屑越过门槛后被黑暗吞掉。',
              ending_hook_seed: '门外出现湿漉漉的校服男生。',
            },
          ],
        },
        writing_bible: {
          promise: '超人开挂但必须被规则逼着动脑。',
        },
      },
    )

    expect(brief.reader_retention_brief.opening_hook).toContain('九点五十九分')
    expect(brief.reader_retention_brief.payoff_promise).toContain('规则边界反制')
    expect(brief.reader_retention_brief.information_gap).toContain('阴影')
    expect(brief.reader_retention_brief.emotional_reward).toContain('超人开挂')
    expect(brief.reader_retention_brief.short_drama_scene).toContain('十点门槛')
    expect(brief.reader_retention_brief.ending_question).toContain('湿漉漉')
    expect(brief.reader_retention_brief.hook_addiction_model.trigger).toContain('九点五十九分')
    expect(brief.reader_retention_brief.hook_addiction_model.action).toContain('张智必须阻止')
    expect(brief.reader_retention_brief.hook_addiction_model.reward).toContain('规则边界反制')
    expect(brief.reader_retention_brief.hook_addiction_model.investment).toContain('湿漉漉')
    expect(brief.reader_retention_brief.hook_addiction_model.reward_randomness).toContain('出乎意料')
    expect(brief.reader_retention_brief.retention_double_engine.emotion_engine).toContain('超人开挂')
    expect(brief.reader_retention_brief.retention_double_engine.hunger_engine).toContain('阴影')
    expect(brief.reader_retention_brief.retention_double_engine.onion_layers).toContain('章节开头植入小问号')
    expect(brief.reader_retention_brief.retention_pillars.upgrade).toContain('规则边界反制')
    expect(brief.reader_retention_brief.retention_pillars.resource_pressure).toContain('张智必须阻止')
    expect(brief.reader_retention_brief.retention_pillars.goal_stack).toContain('大目标 + 小目标 + 假目标')
    expect(brief.reader_retention_brief.retention_pillars.mystery_unlock).toContain('阴影')
    expect(brief.reader_retention_brief.forbidden_cliches).toContain('只写环境氛围不推进目标')
  })

  test('adds reader expectation ledger to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      {
        title: '超人的规则怪谈世界',
        synopsis: '超人蛮力与规则怪谈智斗的双主角长篇。',
        reference_config: {
          story_state: {
            payoff_queue: ['湿漉漉学生身份待回收'],
            open_questions: ['宿舍外黑暗按什么规则清除目标'],
          },
        },
      },
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '十点后宿舍外的黑暗开始清除违规者。',
          conflict: '李超想试探门外阴影，张智必须阻止他。',
          ending_hook: '门外湿漉漉的学生敲响玻璃门。',
          scene_cards: [
            {
              scene_no: 1,
              title: '十点门槛',
              opening_hook: '九点五十九分最后一秒被秒针推过去。',
              reader_payoff: '超人力量第一次被规则边界反制。',
              information_gap: '门外阴影到底按什么判定清除目标。',
              ending_hook_seed: '门外出现湿漉漉的校服男生。',
            },
          ],
        },
        story_state: {
          payoff_queue: ['带血腰牌真相待回收'],
          open_questions: ['广播是谁发出的'],
        },
        writing_bible: {
          promise: '超人开挂但必须被规则逼着动脑。',
        },
      },
    )

    expect(brief.reader_expectation_ledger.must_deliver.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'opening_hook',
      'payoff_promise',
      'scene_payoff_1',
      'ending_hook',
    ]))
    expect(brief.reader_expectation_ledger.must_deliver.map((item: any) => item.text).join('｜')).toContain('规则边界反制')
    expect(brief.reader_expectation_ledger.keep_alive.map((item: any) => item.text).join('｜')).toContain('广播是谁发出的')
    expect(brief.reader_expectation_ledger.keep_alive.map((item: any) => item.text).join('｜')).toContain('宿舍外黑暗')
    expect(brief.reader_expectation_ledger.must_not_break).toContain('已承诺的爽点、悬念和情绪回报不能整章只铺设定不兑现')
  })

  test('carries unresolved reader expectation debt into the next pre-draft brief', () => {
    const debtContext = buildReaderExpectationDebtContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 91,
          chapter_id: 2,
          review_type: 'reader_expectation_sync',
          created_at: '2026-06-09T08:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            reader_expectation_sync: {
              status: 'warn',
              missed: [
                { key: 'ending_hook', label: '章末追读', type: 'hook', text: '湿漉漉学生敲响玻璃门' },
              ],
              keep_alive: [
                { key: 'open_question', label: '保留悬念', type: 'question', text: '广播是谁发出的' },
              ],
            },
          }),
        },
      ],
    )
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        reader_expectation_debt_context: debtContext,
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '判断门外学生是否是规则诱饵。',
          conflict: '救人还是守规。',
          ending_hook: '玻璃门上的水迹拼出一个名字。',
          scene_cards: [
            { scene_no: 1, title: '门前对峙', reader_payoff: '识破门外学生的第一层规则诱饵。' },
          ],
        },
      },
    )

    expect(debtContext.must_carry[0].text).toContain('湿漉漉学生')
    expect(debtContext.keep_alive[0].text).toContain('广播是谁发出的')
    expect(brief.reader_expectation_debt.must_carry[0].text).toContain('湿漉漉学生')
    expect(brief.reader_expectation_ledger.carry_over[0].text).toContain('湿漉漉学生')
    expect(brief.reader_expectation_ledger.must_deliver.map((item: any) => item.text).join('｜')).toContain('湿漉漉学生')
    expect(brief.reader_expectation_ledger.keep_alive.map((item: any) => item.text).join('｜')).toContain('广播是谁发出的')
  })

  test('carries camelCase reader expectation debt into the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '寒门阵师' },
      {
        readerExpectationDebtContext: {
          mustCarry: [
            { key: 'ledger_debt', label: '期待债务', type: 'carry_over', text: '旧案账册必须被打开', fromChapterNo: 7 },
          ],
          keepAlive: [
            { key: 'old_case_backer', label: '继续悬念', type: 'question', text: '旧案幕后供奉是谁', fromChapterNo: 6 },
          ],
        },
        chapter_target: {
          chapter_no: 9,
          title: '账册启封',
          summary: '主角逼执事交出旧案账册。',
          conflict: '执事用宗门规矩阻止主角公开账册。',
          ending_hook: '账册背面浮出黑印。',
          scene_cards: [
            { scene_no: 1, title: '账册对峙', reader_payoff: '主角打开旧案账册反压执事。' },
          ],
        },
      },
    )

    expect(brief.reader_expectation_debt.must_carry[0].text).toContain('旧案账册必须被打开')
    expect(brief.reader_expectation_debt.keep_alive[0].text).toContain('旧案幕后供奉是谁')
    expect(brief.reader_expectation_ledger.carry_over[0].text).toContain('旧案账册必须被打开')
    expect(brief.reader_expectation_ledger.keep_alive.map((item: any) => item.text).join('｜')).toContain('旧案幕后供奉是谁')
  })

  test('carries previous chapter delivery risks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '第一条规则' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 201,
          chapter_id: 2,
          review_type: 'chapter_attraction_review',
          created_at: '2026-06-09T08:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            chapter_attraction_review: {
              status: 'warn',
              label: '吸引力缺口 2',
              weak_count: 2,
              priority_repair: '优先修章末翻页',
              weak_dimensions: [
                { label: '开篇钩子', issue: '开篇没有直接接住门外学生。' },
                { label: '章末翻页', issue: '结尾没有留下门外学生身份问题。' },
              ],
            },
          }),
        },
        {
          id: 202,
          chapter_id: 2,
          review_type: 'innovation_sync',
          created_at: '2026-06-09T08:02:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            innovation_sync: {
              status: 'warn',
              label: '创新缺口 1',
              missed_count: 1,
              missed: [{ label: '规则反差', issue: '超人力量没有和宿舍规则形成新鲜反差。' }],
            },
          }),
        },
        {
          id: 203,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:04:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              revision: {
                revision_receipts: [
                  {
                    issue_index: 0,
                    severity: 'S2',
                    category: 'structure',
                    original_evidence: '章末只总结局势',
                    applied_fix: '补章末现场钩子',
                    changed_evidence: '门外湿漉漉的学生敲响玻璃门。',
                    remaining_risk: '湿漉漉学生身份仍需下一章补证据。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 1,
        title: '门外学生',
        summary: '判断门外学生是否是规则诱饵。',
        conflict: '救人还是守规。',
        ending_hook: '玻璃门上的水迹拼出一个名字。',
        scene_cards: [
          { scene_no: 1, title: '门前对峙', reader_payoff: '识破门外学生的第一层规则诱饵。' },
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
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 4')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修章末翻页')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修吸引力：吸引力缺口 2')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('补创新：创新缺口 1')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('复核修订：修订残留 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('湿漉漉学生身份仍需下一章补证据')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('吸引力开篇修复')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('创新开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('规则反差')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('章末翻页')
    expect(context.chapter_target.delivery_risk_carry_over.priority_label).toBe('优先修章末翻页')
    expect(prompt).toContain('【上一章交稿风险承接】')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('修吸引力：吸引力缺口 2')
    expect(prompt).toContain('补创新：创新缺口 1')
    expect(prompt).toContain('复核修订：修订残留 1')
    expect(prompt).toContain('湿漉漉学生身份仍需下一章补证据')
  })

  test('carries failed quality gate reasons into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '门槛复查' },
      [
        { id: 3, chapter_no: 3, title: '门槛旧章' },
        { id: 4, chapter_no: 4, title: '门槛复查' },
      ],
      [
        {
          id: 700,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                score: 91,
                passed: true,
                issues: [],
              },
            },
            quality_gate: {
              passed: false,
              score: 91,
              reasons: [
                '结构化自检失败 1 项：场景回执未闭环：场景2证据不在正文中',
                '承接回执未兑现 1 项：开篇承接没有前300字证据',
              ],
              gate: { min_score: 78 },
            },
          }),
        },
      ],
    )
    const project = { title: '午夜校规', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 4,
        title: '门槛复查',
        summary: '复查上一章没有落地的场景回执和开篇承接。',
        conflict: '主角必须用现场证据补齐门槛旧章的承接债。',
        ending_hook: '门槛白线后出现第二条未确认回执。',
        scene_cards: [
          { scene_no: 1, title: '白线复查', reader_payoff: '把上一章漏掉的承接证据写成现场推进。' },
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
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 4, title: '门槛复查' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('质量门禁：门禁未过 2')
    expect(brief.delivery_risk_carry_over.items.join('｜')).not.toContain('质量门禁：低分未过 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('场景回执未闭环')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('开篇承接没有前300字证据')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('质量门禁')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('质量门禁')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('质量门禁')
    expect(prompt).toContain('质量门禁')
    expect(prompt).toContain('质量门禁：门禁未过 2')
    expect(prompt).toContain('场景回执未闭环')
    expect(prompt).toContain('开篇承接没有前300字证据')
    expect(prompt).not.toContain('质量分 91 低于 78')
  })

  test('carries nested oh-story revision receipt residuals into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门外学生' },
      [
        { id: 2, chapter_no: 2, title: '账册缺页' },
        { id: 3, chapter_no: 3, title: '门外学生' },
      ],
      [
        {
          id: 204,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:06:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              revision: {
                oh_story_delivery_receipts: {
                  revision_receipts: [
                    {
                      issue_index: 0,
                      severity: 'S2',
                      category: 'structure',
                      applied_fix: '补章末现场钩子',
                      changed_evidence: '第三声钟响后，守将闯入。',
                      remaining_risk: '守将动机仍需下一章补证据。',
                    },
                  ],
                },
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '门外学生',
        summary: '判断门外学生是否是规则诱饵。',
        conflict: '救人还是守规。',
        ending_hook: '玻璃门上的水迹拼出一个名字。',
        scene_cards: [
          { scene_no: 1, title: '门前对峙', reader_payoff: '识破门外学生的第一层规则诱饵。' },
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
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先复核修订')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('复核修订：修订残留 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('守将动机仍需下一章补证据')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('复核修订开篇修复')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('补证据')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('守将动机仍需下一章补证据')
    expect(prompt).toContain('复核修订：修订残留 1')
    expect(prompt).toContain('守将动机仍需下一章补证据')
  })

  test('carries unresolved scene-card serial risk repair checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '旧盟约重签' },
      [
        { id: 2, chapter_no: 2, title: '账册缺页' },
        { id: 3, chapter_no: 3, title: '旧盟约重签' },
      ],
      [
        {
          id: 204,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:06:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                serial_risk_repair_checks: [
                  {
                    key: 'scene_serial_risk_repair_1_missing',
                    label: '场景近章风险修复检查',
                    status: 'warn',
                    evidence: '场景1《旧盟约重签》标注风险修复 two_chapter_momentum_stall，但正文窗口缺少目标推进和关系变化证据。',
                    fix: '下一章必须把账册新证据写成可见目标推进，并让盟友关系发生一次明确变化。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '旧盟约重签',
        summary: '用账册缺页逼盟友改口。',
        conflict: '盟友仍怕牵连，不肯作证。',
        ending_hook: '账册背面浮出第二个签名。',
        scene_cards: [
          { scene_no: 1, title: '账册对质', reader_payoff: '账册证据迫使盟友改口。' },
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
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 3, title: '旧盟约重签' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修近章风险')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('近章风险修复：修复缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('下一章必须把账册新证据写成可见目标推进')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('近章风险修复：修复缺口 1')
    expect(prompt).toContain('账册新证据写成可见目标推进')
  })

  test('carries serial risk repair execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '第二个签名' },
      [
        { id: 2, chapter_no: 2, title: '账册缺页' },
        { id: 3, chapter_no: 3, title: '第二个签名' },
      ],
      [
        {
          id: 205,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:07:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                serial_risk_repair_checks: [
                  {
                    label: '近章动能空转',
                    status: 'warn',
                    risk_type: 'two_chapter_momentum_stall',
                    repair_receipt: '场景卡要求账册新证据推进目标，但正文只复述旧盟约。',
                    continuity_change: '盟友从拒绝作证改为答应带路。',
                    state_change: '账册缺页从线索变成公开证据。',
                    evidence: '场景2仍停在旧盟约复述，缺少目标推进和状态变化。',
                    fix: '下一章必须让账册证据触发新阻碍，并让盟友关系发生一次明确变化。',
                    remaining_risk: '不要再只解释账册缺页，要把它写成现场阻碍。',
                  },
                  {
                    label: '关系调剂已完成',
                    status: 'pass',
                    evidence: '盟友已经递出半枚印纹。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '第二个签名',
        summary: '查出第二个签名是谁留下的。',
        conflict: '盟友带路后发现账册证据会引来新阻碍。',
        ending_hook: '第二个签名在雨水里倒写出主角的名字。',
        scene_cards: [
          { scene_no: 1, title: '雨巷验账', reader_payoff: '账册证据触发新阻碍。' },
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
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 3, title: '第二个签名' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修近章风险')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('近章风险修复：修复缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('serial_risk_repair_checks.近章动能空转')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('risk_type=two_chapter_momentum_stall')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('repair_receipt=场景卡要求账册新证据推进目标')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('continuity_change=盟友从拒绝作证改为答应带路')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('state_change=账册缺页从线索变成公开证据')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('关系调剂已完成')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('risk_type')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('repair_receipt')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('state_change')
    expect(prompt).toContain('serial_risk_repair_checks.近章动能空转')
    expect(prompt).toContain('不要再只解释账册缺页')
  })

  test('carries unresolved revision directives into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '第二个签名' },
      [
        { id: 2, chapter_no: 2, title: '账册缺页' },
        { id: 3, chapter_no: 3, title: '第二个签名' },
      ],
      [
        {
          id: 205,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:08:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                revision_directives: [
                  'ten_chapter_selling_point：补核心卖点、能力使用、规则限制、读者回报或章末新期待。',
                  '压缩不推动剧情、信息或情绪变化的环境描写。',
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '第二个签名',
        summary: '追查账册背面的第二个签名。',
        conflict: '盟友只肯交出半页证据。',
        ending_hook: '签名墨迹和主角掌心发出同一种冷光。',
        scene_cards: [
          { scene_no: 1, title: '半页账册', reader_payoff: '第二个签名指向更高层的规则漏洞。' },
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
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 3, title: '第二个签名' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先执行修订指令')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修订指令：明确指令 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('ten_chapter_selling_point')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('压缩不推动剧情')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('ten_chapter_selling_point')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('压缩不推动剧情')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('章末新期待')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('修订指令：明确指令 2')
    expect(prompt).toContain('补核心卖点')
    expect(prompt).toContain('压缩不推动剧情')
  })

  test('carries unresolved focused revision modes into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '追入旧巷' },
      [
        { id: 2, chapter_no: 2, title: '账册缺页' },
        { id: 3, chapter_no: 3, title: '追入旧巷' },
      ],
      [
        {
          id: 206,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:10:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                focused_revision_modes: ['expand_action', 'cut_description', 'restore_hook'],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '追入旧巷',
        summary: '主角追查账册缺页对应的旧巷入口。',
        conflict: '追踪目标钻入规则禁止靠近的巷口。',
        ending_hook: '巷底旧门上响起和账册同频的敲击。',
        scene_cards: [
          { scene_no: 1, title: '旧巷追踪', reader_payoff: '追踪动作揭开账册缺页的下一层入口。' },
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
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 3, title: '追入旧巷' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 3')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先执行定向修订')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('定向修订：修订模式 3')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('expand_action')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('动作链')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('cut_description')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('restore_hook')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('expand_action')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('cut_description')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('restore_hook')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('定向修订：修订模式 3')
    expect(prompt).toContain('压缩不推动剧情')
    expect(prompt).toContain('章末钩子')
  })

  test('carries unresolved craft metric risks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '旧巷反制' },
      [
        { id: 2, chapter_no: 2, title: '追入旧巷' },
        { id: 3, chapter_no: 3, title: '旧巷反制' },
      ],
      [
        {
          id: 207,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:12:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                craft_metrics: {
                  action_detail_score: 58,
                  description_overuse_score: 82,
                  setting_consistency_score: 63,
                },
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '旧巷反制',
        summary: '主角在旧巷里反制账册规则。',
        conflict: '旧巷规则限制主角能力使用。',
        ending_hook: '旧门背后传来第二页账册的翻动声。',
        scene_cards: [
          { scene_no: 1, title: '旧巷反制', reader_payoff: '主角用可见动作反制旧巷规则。' },
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
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 3, title: '旧巷反制' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 3')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修正文工艺指标')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('正文工艺指标：指标风险 3')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('action_detail_score')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('动作链')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('description_overuse_score')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('压缩不推动剧情')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('setting_consistency_score')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('action_detail_score')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('description_overuse_score')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('setting_consistency_score')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('正文工艺指标：指标风险 3')
    expect(prompt).toContain('能力代价')
  })

  test('carries unresolved setting violations into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '旧印章回声' },
      [
        { id: 2, chapter_no: 2, title: '旧巷反制' },
        { id: 3, chapter_no: 3, title: '旧印章回声' },
      ],
      [
        {
          id: 208,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:14:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                setting_violations: [
                  {
                    setting_name: '旧印章',
                    type: 'ownership',
                    severity: 'high',
                    description: '正文写成主角已经拿到完整旧印章，但设定中只有半枚印纹，旧印章仍在祠堂封存。',
                    fix: '下一章必须保持主角只拿到半枚印纹，旧印章仍在祠堂封存；能力触发只能来自半枚印纹的残留规则。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '旧印章回声',
        summary: '主角确认半枚印纹的残留规则。',
        conflict: '敌人诱导主角承认已经拿到完整旧印章。',
        ending_hook: '祠堂封存的旧印章背面响起回声。',
        scene_cards: [
          { scene_no: 1, title: '半枚印纹', reader_payoff: '主角用半枚印纹的规则反制诱导。' },
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
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 3, title: '旧印章回声' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修设定违规')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('设定违规：违规风险 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('旧印章')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('半枚印纹')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('祠堂封存')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('旧印章')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('能力触发')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('祠堂封存')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('设定违规：违规风险 1')
    expect(prompt).toContain('祠堂封存')
  })

  test('carries unresolved reader retention checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 3, chapter_no: 3, title: '门后第二声' },
      [
        { id: 2, chapter_no: 2, title: '湿漉漉学生' },
        { id: 3, chapter_no: 3, title: '门后第二声' },
      ],
      [
        {
          id: 209,
          chapter_id: 2,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:16:00.000Z',
          payload: JSON.stringify({
            chapter_id: 2,
            chapter_no: 2,
            self_check: {
              review: {
                passed: false,
                needs_revision: true,
                reader_retention_checks: [
                  {
                    key: 'hook_addiction_reward_randomness_missing',
                    label: 'Hook上瘾模型-奖励随机性',
                    status: 'warn',
                    evidence: '门外学生身份只被确认，没有给出额外收获、线索、权限、关系或地位变化。',
                    fix: '下一章必须在确认门外学生身份之外，补一个出乎意料的额外线索，并让主角产生沉没投入。',
                  },
                  {
                    key: 'retention_double_engine_hunger_missing',
                    label: '留存双引擎-饥饿缺口',
                    status: 'fail',
                    evidence: '章尾没有把广播是谁发出的信息差卡到下一章。',
                    fix: '下一章必须用信息差植入问号，把广播来源按剥洋葱方式卡到章末。',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '超人的规则怪谈世界', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 3,
        title: '门后第二声',
        summary: '主角追问门外学生背后的广播来源。',
        conflict: '学生只肯说半句，广播却提前念出主角名字。',
        ending_hook: '广播里出现第二个和主角同名的人。',
        scene_cards: [
          { scene_no: 1, title: '第二声广播', reader_payoff: '门外学生身份之外出现新的广播线索。' },
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
    const prompt = service.buildParagraphProseContext(
      project,
      context,
      null,
      { chapter_no: 3, title: '门后第二声' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修创作契约')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('创作契约：追读留存缺口 2')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('创作契约')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('Hook上瘾模型')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('剥洋葱')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('Hook上瘾模型')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('额外线索')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('广播来源')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('剥洋葱')
    expect(prompt).toContain('执行 chapter_target.delivery_risk_carry_over')
    expect(prompt).toContain('创作契约：追读留存缺口 2')
    expect(prompt).toContain('沉没投入')
  })

})

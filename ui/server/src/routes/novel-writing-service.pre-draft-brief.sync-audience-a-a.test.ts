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

describe('chapter pre-draft brief sync-audience a a', () => {
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

})

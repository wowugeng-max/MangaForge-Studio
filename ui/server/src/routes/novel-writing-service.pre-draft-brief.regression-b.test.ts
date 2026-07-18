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

describe('chapter pre-draft brief regression b', () => {
  test('carries oh-story foreshadowing consistency radar into the next pre-draft brief and prose prompt', () => {
    const project = {
      title: '万古长夜',
      reference_config: {
        story_state: {
          foreshadowing_status: {
            旧印章完整归属: {
              status: 'active',
              planted_chapter: 1,
              last_touched_chapter: 20,
              planned_payoff_chapter: 60,
              note: '旧印章完整归属不能提前公开，只能先验证半枚旧印纹。',
            },
            第七层门影是谁: {
              status: 'active',
              planted_chapter: 50,
              last_touched_chapter: 50,
              note: '第51章只推进身份轮廓。',
            },
            已回收旧门牌: {
              status: 'paid',
              planted_chapter: 12,
              payoff_chapter: 18,
              note: '已经回收，不再作为债务。',
            },
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 52,
        title: '旧印回声',
        summary: '李玄继续验证旧印章和第七层门影。',
        scene_cards: [],
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 52, title: '旧印回声' })

    expect(brief.foreshadowing_consistency_radar.overdue_count).toBe(1)
    expect(brief.foreshadowing_consistency_radar.overdue.join('｜')).toContain('旧印章完整归属')
    expect(brief.foreshadowing_consistency_radar.overdue.join('｜')).toContain('已延迟51章')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).toContain('第七层门影是谁')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).not.toContain('已回收旧门牌')
    expect(brief.foreshadowing_consistency_radar.scope_rules.join('｜')).toContain('只确认本轮新增/推进/回收的伏笔')
    expect(brief.foreshadowing_consistency_radar.scope_rules.join('｜')).toContain('不得在日更流程中通读所有 session 或扫描全部正文做全量伏笔审计')
    expect(brief.foreshadowing_consistency_radar.scope_rules.join('｜')).toContain('/story-review')
    expect(context.chapter_target.foreshadowing_consistency_radar.overdue_count).toBe(1)
    expect(prompt).toContain('【伏笔一致性雷达】')
    expect(prompt).toContain('日更范围：只确认本轮新增/推进/回收的伏笔')
    expect(prompt).toContain('不得在日更流程中通读所有 session 或扫描全部正文做全量伏笔审计')
    expect(prompt).toContain('全量伏笔审计只在 /story-review')
    expect(prompt).toContain('超期伏笔')
    expect(prompt).toContain('旧印章完整归属')
    expect(prompt).toContain('计划回收：第60章')
    expect(prompt).toContain('旧印章完整归属不能提前公开')
  })

  test('carries oh-story foreshadowing status semantics into the next pre-draft brief and prose prompt', () => {
    const project = {
      title: '万古长夜',
      reference_config: {
        story_state: {
          foreshadowing_status: {
            血契真正代价: {
              status: '未埋',
              planned_payoff_chapter: 60,
              note: '只在本卷规划中存在，正文尚未正式埋下。',
            },
            第七层门影是谁: {
              status: '已埋',
              planted_chapter: 40,
              last_touched_chapter: 41,
              note: '已经用门影和旧印回声埋下，下一章只推进一层身份轮廓。',
            },
            已回收旧门牌: {
              status: '已回收',
              planted_chapter: 12,
              payoff_chapter: 18,
              note: '已经在第18章回收，不应再报警。',
            },
            错过血契窗口: {
              status: '已过期',
              planted_chapter: 36,
              planned_payoff_chapter: 41,
              note: '错过原定回收窗口，需要 story-review 或显式修复。',
            },
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 42,
        title: '旧印回声',
        summary: '李玄继续验证旧印章和第七层门影。',
        scene_cards: [],
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 42, title: '旧印回声' })

    expect(brief.foreshadowing_consistency_radar.overdue_count).toBe(1)
    expect(brief.foreshadowing_consistency_radar.overdue.join('｜')).toContain('错过血契窗口')
    expect(brief.foreshadowing_consistency_radar.overdue.join('｜')).toContain('状态：已过期')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).toContain('血契真正代价')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).toContain('状态：未埋')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).toContain('第七层门影是谁')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).toContain('状态：已埋')
    expect(brief.foreshadowing_consistency_radar.active.join('｜')).not.toContain('已回收旧门牌')
    expect(brief.foreshadowing_consistency_radar.status_rules.join('｜')).toContain('未埋、已埋、已回收属于正常状态')
    expect(brief.foreshadowing_consistency_radar.status_rules.join('｜')).toContain('只有已过期需要 /story-review 或显式修复')
    expect(brief.foreshadowing_consistency_radar.status_rules.join('｜')).toContain('SessionStart 不应因未埋、已埋或已回收报警')
    expect(prompt).toContain('伏笔状态语义')
    expect(prompt).toContain('未埋、已埋、已回收属于正常状态')
    expect(prompt).toContain('只有已过期需要 /story-review 或显式修复')
    expect(prompt).toContain('SessionStart 不应因未埋、已埋或已回收报警')
  })

  test('carries oh-story foreshadowing density warnings into the next pre-draft brief and prose prompt', () => {
    const foreshadowingStatus = Object.fromEntries(
      Array.from({ length: 16 }, (_, index) => [
        `第三卷暗线${index + 1}`,
        {
          status: 'active',
          planted_chapter: 41 + index,
          volume_no: 3,
          note: `第三卷暗线${index + 1}仍待推进。`,
        },
      ]),
    )
    const project = {
      title: '万古长夜',
      reference_config: {
        story_state: {
          foreshadowing_status: foreshadowingStatus,
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 58,
        title: '暗线过密',
        summary: '李玄进入第三卷密集伏笔段。',
        scene_cards: [],
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
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 58, title: '暗线过密' })

    expect(brief.foreshadowing_consistency_radar.active_count).toBe(16)
    expect(brief.foreshadowing_consistency_radar.density_warnings.join('｜')).toContain('SC-FORESHADOW')
    expect(brief.foreshadowing_consistency_radar.density_warnings.join('｜')).toContain('第3卷')
    expect(brief.foreshadowing_consistency_radar.density_warnings.join('｜')).toContain('太密')
    expect(context.chapter_target.foreshadowing_consistency_radar.density_warnings.join('｜')).toContain('16条')
    expect(prompt).toContain('伏笔密度提醒')
    expect(prompt).toContain('SC-FORESHADOW')
    expect(prompt).toContain('第3卷活跃伏笔16条')
  })

  test('injects story-state style fingerprint as a prose prompt handoff anchor', () => {
    const project = {
      title: '万古长夜',
      reference_config: {
        story_state: {
          style_fingerprint: '文风指纹：目标句长带 20-42 字，旧上下文已锁定，中长句呼吸为主。',
          style_fingerprint_contract: {
            target_sentence_band: '20-42字',
            policy: '每章写前按文风指纹确定句长节奏，不以可能已漂移的上一章句式节奏为准。',
          },
        },
      },
    }
    const contextPackage = {
      chapter_target: {
        chapter_no: 51,
        title: '第七层旧影',
        summary: '李玄追查旧阵塔第七层的人影。',
        scene_cards: [],
      },
    }
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(project, contextPackage, null, { chapter_no: 51, title: '第七层旧影' })

    expect(prompt).toContain('【文风指纹断点】')
    expect(prompt).toContain('目标句长带：20-42字')
    expect(prompt).toContain('旧上下文已锁定')
    expect(prompt).toContain('不以可能已漂移的上一章句式节奏为准')
  })

  test('adds story unit context to the pre-draft brief', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        story_unit_context: {
          title: '试炼前夜剧情单元',
          chapter_range_label: '第7-12章',
          current_chapter_role: '入口钩子',
          unit_goal: '六章内完成外门试炼前夜事件包。',
          entry_hook: '第7章以试炼倒计时开场。',
          pressure_escalation: ['执事设局', '试炼规则反噬'],
          mini_climax_payoff: '第10章公开打脸执事。',
          setup_and_storyline: ['阵盘第二道裂纹埋线', '外门压迫主线阶段兑现'],
          exit_hook: '第12章内门长老亲自点名。',
          forbidden_advance: ['不得提前解决内门招揽条件'],
        },
        chapter_target: {
          chapter_no: 7,
          title: '试炼倒计时',
          summary: '试炼前夜规则开始收紧。',
          scene_cards: [],
        },
      },
    )

    expect(brief.story_unit_context.title).toBe('试炼前夜剧情单元')
    expect(brief.story_unit_context.current_chapter_role).toBe('入口钩子')
    expect(brief.story_unit_context.unit_goal).toContain('外门试炼前夜')
    expect(brief.story_unit_context.pressure_escalation).toContain('执事设局')
    expect(brief.story_unit_context.mini_climax_payoff).toContain('公开打脸')
    expect(brief.story_unit_context.forbidden_advance).toContain('不得提前解决内门招揽条件')
  })

  test('carries camelCase story unit context through pre-draft brief confirmation', () => {
    const brief = buildChapterPreDraftBrief(
      { title: '超人的规则怪谈世界' },
      {
        storyUnitContext: {
          title: '试炼前夜剧情单元',
          chapterRangeLabel: '第7-12章',
          currentChapterRole: '压力升级/推进',
          unitGoal: '六章内完成外门试炼前夜事件包。',
          pressureEscalation: ['执事设局'],
          setupAndStoryline: ['阵盘第二道裂纹埋线'],
          miniClimaxPayoff: '第10章公开打脸执事。',
          exitHook: '第12章内门长老亲自点名。',
          forbiddenAdvance: ['不得提前解决内门招揽条件'],
        },
        chapter_target: {
          chapter_no: 7,
          title: '试炼倒计时',
          summary: '试炼前夜规则开始收紧。',
          scene_cards: [],
        },
      },
    )
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 7,
          title: '试炼倒计时',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        ...brief,
        confirmed_at: '2026-06-10T08:00:00.000Z',
      },
    )

    expect(brief.story_unit_context.title).toBe('试炼前夜剧情单元')
    expect(brief.story_unit_context.current_chapter_role).toBe('压力升级/推进')
    expect(context.chapter_target.story_unit_context.current_chapter_role).toBe('压力升级/推进')
    expect(context.story_unit_context.forbidden_advance).toContain('不得提前解决内门招揽条件')
  })

  test('merges a confirmed pre-draft brief into chapter generation context', () => {
    const confirmedAt = '2026-06-03T10:00:00.000Z'
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '守则初读',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_goal: '读懂宿舍守则并发现第零条规则。',
        reader_promise: '用智力拆规则，给读者一次反转。',
        core_conflict: '是否相信林晓提供的旧规则。',
        emotional_curve: '紧张 -> 试探 -> 惊疑',
        key_settings: ['宿舍守则'],
        forbidden_content: ['幕后主神'],
        scene_briefs: [{ scene_no: 1, title: '守则册', reader_payoff: '发现漏洞' }],
        storyline_advances: ['规则之源调查'],
        storyline_plants: ['第零条规则回收线'],
        storyline_payoffs: ['林晓求生支线'],
        storyline_forbidden: ['编织者真名'],
        meme_strategy: {
          intensity: '轻度',
          allowed_functions: ['主角吐槽', '规则怪谈弹幕感'],
          forbidden_usage: ['死亡场景不玩梗'],
        },
        reader_retention_brief: {
          opening_hook: '第一段直接落在十点门槛判定。',
          payoff_promise: '让读者看到蛮力被规则反制。',
          information_gap: '门外学生为什么能在规则时间后出现。',
          emotional_reward: '紧张后给一次智者识破规则的回报。',
          short_drama_scene: '玻璃门内外对峙，黑暗贴着门槛爬动。',
          ending_question: '湿漉漉学生到底是求救者还是规则诱饵。',
          forbidden_cliches: ['不要用长篇背景解释替代现场危机'],
        },
        reader_expectation_ledger: {
          chapter_promise: '本章必须让读者看到蛮力被规则反制。',
          must_deliver: [
            { key: 'payoff_promise', label: '爽点承诺', type: 'payoff', text: '让读者看到蛮力被规则反制。' },
            { key: 'ending_hook', label: '章末追读', type: 'hook', text: '湿漉漉学生到底是求救者还是规则诱饵。' },
          ],
          keep_alive: [
            { key: 'open_question_1', label: '保留悬念', type: 'question', text: '广播是谁发出的。' },
          ],
          must_not_break: ['不能整章只铺设定不兑现规则反制'],
        },
        longform_compass: {
          reader_promise: '超人力量和规则判定持续碰撞。',
          immutable_rules: ['超人力量不能无代价碾压规则'],
          flexible_zones: ['副本题材可换，但必须服务规则破局主线'],
        },
        innovation_brief: {
          chapter_angle: '超人硬闯被规则边界反噬。',
          execution_points: ['用饼干碎屑验证门槛清除规则'],
          differentiation_guardrails: ['不得写成普通开挂碾压'],
          ip_adaptation_hooks: ['玻璃门内外对峙'],
        },
        longform_battle_context: {
          status: 'needs_action',
          summary: '先修复核心守恒。',
          risk_chips: ['核心偏移'],
          primary_action: { key: 'open_quality_revision', label: '进入质检修订', reason: '核心矛盾要回到规则判定反制。' },
          risk_lanes: [
            {
              key: 'story_core',
              label: '核心守恒',
              status: 'warn',
              score: 68,
              detail: '核心偏移：超人力量被写成普通无敌碾压。',
              required_action: '本章必须写出规则判定反制蛮力。',
            },
          ],
        },
        next_batch_brief: {
          chapter_range_label: '第2-4章',
          batch_goal: '三章内完成午夜校园第一轮规则试探。',
          reader_payoff_plan: '每章一次规则显形或力量反制。',
          mainline_focus: '规则初识 -> 规则漏洞',
          forbidden_boundary: '不得提前揭露规则源头。',
          current_chapter_role: '本章负责读懂宿舍守则。',
        },
        story_unit_context: {
          title: '午夜校园第一轮规则试探剧情单元',
          chapter_range_label: '第2-6章',
          current_chapter_role: '压力升级/推进',
          unit_goal: '五章内完成第一条规则的验证、误判和小回收。',
          mini_climax_payoff: '第5章让李超用规则漏洞反制宿管。',
          exit_hook: '第6章第零条规则显形。',
          forbidden_advance: ['不得提前揭露广播源头'],
        },
        longform_memory_capsule: {
          core_promise: '超人力量和规则判定持续碰撞。',
          character_states: ['李超：力量觉醒但不懂规则'],
          open_questions: ['广播是谁发出的'],
          payoff_debts: ['规则边界反制蛮力'],
          red_lines: ['超人力量不能无代价碾压规则'],
        },
        word_budget: '标准章 3000 字',
        ending_hook: '镜子里出现第四个人。',
        confirmed_at: confirmedAt,
      },
    )

    expect(context.pre_draft_brief.confirmed_at).toBe(confirmedAt)
    expect(context.chapter_target.summary).toContain('读懂宿舍守则')
    expect(context.chapter_target.conflict).toContain('林晓')
    expect(context.chapter_target.ending_hook).toContain('镜子')
    expect(context.chapter_target.reader_promise).toContain('反转')
    expect(context.chapter_target.scene_cards[0].reader_payoff).toContain('漏洞')
    expect(context.chapter_target.storyline_advances).toContain('规则之源调查')
    expect(context.chapter_target.storyline_plants).toContain('第零条规则回收线')
    expect(context.chapter_target.storyline_payoffs).toContain('林晓求生支线')
    expect(context.chapter_target.storyline_forbidden).toContain('编织者真名')
    expect(context.chapter_target.meme_strategy.allowed_functions).toContain('主角吐槽')
    expect(context.chapter_target.reader_retention_brief.opening_hook).toContain('十点门槛')
    expect(context.chapter_target.reader_retention_brief.payoff_promise).toContain('蛮力')
    expect(context.chapter_target.reader_retention_brief.short_drama_scene).toContain('玻璃门')
    expect(context.chapter_target.reader_expectation_ledger.must_deliver[0].text).toContain('蛮力被规则反制')
    expect(context.chapter_target.reader_expectation_ledger.keep_alive[0].text).toContain('广播')
    expect(context.chapter_target.longform_compass.immutable_rules).toContain('超人力量不能无代价碾压规则')
    expect(context.longform_compass.reader_promise).toContain('规则判定')
    expect(context.chapter_target.longform_battle_context.risk_chips).toContain('核心偏移')
    expect(context.chapter_target.longform_battle_context.risk_lanes[0].required_action).toContain('规则判定反制蛮力')
    expect(context.longform_battle_context.primary_action.label).toBe('进入质检修订')
    expect(context.chapter_target.innovation_brief.chapter_angle).toContain('规则边界反噬')
    expect(context.chapter_target.innovation_brief.execution_points).toContain('用饼干碎屑验证门槛清除规则')
    expect(context.chapter_target.next_batch_brief.current_chapter_role).toContain('读懂宿舍守则')
    expect(context.next_batch_brief.batch_goal).toContain('第一轮规则试探')
    expect(context.chapter_target.story_unit_context.current_chapter_role).toContain('压力升级')
    expect(context.chapter_target.story_unit_context.mini_climax_payoff).toContain('反制宿管')
    expect(context.story_unit_context.title).toContain('午夜校园')
    expect(context.chapter_target.longform_memory_capsule.character_states[0]).toContain('李超')
    expect(context.longform_memory_capsule.open_questions).toContain('广播是谁发出的')
  })

  test('merges camelCase confirmed style sample strategy into downstream prose contracts', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 19,
          title: '雨巷旧证',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 19,
        chapter_goal: '李玄用雨巷旧证逼执事露出换证破绽。',
        core_conflict: '执事连续压问，旁观弟子开始倒向他。',
        chapterBlueprint: {
          targetEmotion: '压迫后信息差反杀',
          contentOutline: {
            cause: '执事抢先定义证词。',
            development: '李玄发现雨巷旧证和袖口旧印对应。',
            turn: '林青禾顶住压力说出旧证来源。',
            climax: '李玄当众反证执事换证。',
            ending: '旧证背面出现内门编号。',
          },
          plotLines: {
            logicLine: '旧证 -> 袖口旧印 -> 换证破绽',
          },
          characterOrder: ['执事', '林青禾', '李玄'],
          costAndReward: '代价：林青禾公开得罪执事；收益：李玄夺回解释权。',
        },
        styleSampleStrategy: {
          selectedEmotionModule: 'M03 信息差反杀',
          rhythmReference: '三轮压问后半拍亮证据，爆发后短冷却接章尾钩子',
          styleProfileSummary: '短句推进审讯压力，对白留半拍。',
          matchedChapterTechniques: ['三轮压问', '半拍亮证据'],
          styleDirectives: ['对白短促，动作承接情绪余波'],
          samples: [{ sample_key: '雨巷审讯样章', unsafe_direct_phrases: ['样章原句不能照搬'] }],
          doNotCopy: ['不得复制雨巷样章桥段'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.chapter_target.style_sample_strategy.selectedEmotionModule).toContain('信息差反杀')
    expect(context.chapter_target.benchmark_recall_brief.rhythm_reference).toContain('三轮压问')
    expect(context.chapter_target.benchmark_recall_brief.matched_chapter_techniques).toContain('半拍亮证据')
    expect(context.chapter_target.style_boundary_contract.copy_boundary_rules.join('｜')).toContain('不得复制雨巷样章桥段')
    expect(context.chapter_target.style_boundary_contract.copy_boundary_rules.join('｜')).toContain('样章原句不能照搬')
    expect(context.chapter_target.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('三轮压问')
    expect(context.chapter_target.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('半拍亮证据')
  })

  test('keeps confirmed pre-draft gates in top-level pre_draft_brief for downstream repairs', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 19,
          title: '雨巷旧证',
          summary: '旧目标',
          scene_cards: [
            {
              title: '雨巷审讯',
              purpose: '李玄顶住三轮压问，半拍亮出旧证。',
              conflict: '执事抢先定义旧证为伪证。',
              reader_payoff: '旧证反杀，执事失去话语权。',
            },
          ],
        },
      },
      {
        chapter_no: 19,
        chapter_goal: '李玄用雨巷旧证逼执事露出换证破绽。',
        core_conflict: '执事连续压问，旁观弟子开始倒向他。',
        styleSampleStrategy: {
          selectedEmotionModule: 'M03 信息差反杀',
          rhythmReference: '三轮压问后半拍亮证据，爆发后短冷却接章尾钩子',
          styleProfileSummary: '短句推进审讯压力，对白留半拍。',
          matchedChapterTechniques: ['三轮压问', '半拍亮证据'],
          styleDirectives: ['对白短促，动作承接情绪余波'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.intent_confirmation_contract.rhythm_and_style.join('｜')).toContain('三轮压问')
    expect(context.pre_draft_brief.benchmark_recall_brief.selected_emotion_module).toContain('信息差反杀')
    expect(context.pre_draft_brief.write_preparation_brief.execution_order.join('｜')).toContain('Step 2.2 状态筛选')
    expect(context.pre_draft_brief.style_sample_strategy.selectedEmotionModule || context.pre_draft_brief.style_sample_strategy.selected_emotion_module).toContain('信息差反杀')
    expect(context.preDraftBrief).toBe(context.pre_draft_brief)
  })

  test('merges camelCase confirmed signature scene brief into prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 20,
          title: '旧证审判',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 20,
        chapter_goal: '李玄把旧证缺页变成当众审判会长的铁证。',
        signatureSceneBrief: {
          signatureScene: '雨巷长案前，李玄把带血旧证拍进烛火阴影里，满堂执事同时失声。',
          sceneRepairTarget: '补足本章可截图传播的审判场面。',
          readerPayoff: '证据反杀，会长第一次失去话语权。',
          storylineService: '推进旧证换人主线并把矛头指向禁库。',
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      context,
      null,
      { chapter_no: 20, title: '旧证审判' },
    )

    expect(context.chapter_target.signature_scene_brief.signature_scene).toContain('雨巷长案')
    expect(context.chapter_target.signature_scene_brief.scene_repair_target).toContain('可截图传播')
    expect(prompt).toContain('【本章标志性场面补位】')
    expect(prompt).toContain('雨巷长案前')
    expect(prompt).toContain('必须把 signature_scene 写成正文核心场面')
  })

  test('preserves runtime camelCase chapterTarget when confirming pre-draft brief', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapterTarget: {
          chapterNo: 21,
          title: '旧证追问',
          summary: '李玄继续追问旧证缺页。',
          conflict: '执事试图把缺页解释成抄录错误。',
          endingHook: '缺页背面露出会长私印。',
          readerRetentionBrief: {
            openingHook: '开篇先让会长私印差点被烧掉。',
            payoffPromise: '李玄用旧证缺页反压执事。',
            endingQuestion: '会长私印为什么出现在缺页背面。',
          },
          sceneCards: [],
        },
      },
      {
        chapter_no: 21,
        chapter_goal: '李玄把旧证缺页继续推进到会长私印。',
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      context,
      null,
      { chapter_no: 21, title: '旧证追问' },
    )

    expect(context.chapter_target.chapterNo).toBe(21)
    expect(context.chapter_target.reader_retention_brief.opening_hook).toContain('会长私印差点被烧掉')
    expect(context.chapter_target.reader_retention_brief.ending_question).toContain('会长私印为什么')
    expect(prompt).toContain('开篇先让会长私印差点被烧掉')
    expect(prompt).toContain('会长私印为什么出现在缺页背面')
  })

  test('merges camelCase confirmed reader retention brief into rhythm and prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 21,
          title: '门槛旧影',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 21,
        chapter_goal: '李玄在雨巷门槛处验证旧影规则。',
        readerRetentionBrief: {
          openingHook: '第一段直接落在雨巷门槛旧影回头。',
          payoffPromise: '读者看到李玄用旧证反制执事。',
          informationGap: '旧影为什么只在门槛内回头。',
          emotionalReward: '压迫后给一次证据反杀的爽感。',
          shortDramaScene: '雨巷门槛内外对峙，烛火把旧影压成两半。',
          endingQuestion: '旧影回头后指向的禁库门牌是谁留下的。',
          retentionPillars: {
            upgrade: '李玄拿到禁库门牌权限。',
            resourcePressure: '旧证缺页只能换一次开门机会。',
            goalStack: '大目标 + 小目标 + 假目标：查禁库，先过雨巷门槛。',
            mysteryUnlock: '旧影为什么只在门槛内回头。',
          },
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      context,
      null,
      { chapter_no: 21, title: '门槛旧影' },
    )

    expect(context.chapter_target.reader_retention_brief.opening_hook).toContain('雨巷门槛')
    expect(context.chapter_target.reader_retention_brief.ending_question).toContain('禁库门牌')
    expect(context.chapter_target.reader_retention_brief.retention_pillars.goal_stack).toContain('大目标 + 小目标 + 假目标')
    expect(context.chapter_target.serial_rhythm_brief.opening_hook_deadline).toContain('雨巷门槛')
    expect(context.chapter_target.serial_rhythm_brief.ending_hook_guardrail).toContain('禁库门牌')
    expect(prompt).toContain('执行 chapter_target.reader_retention_brief')
    expect(prompt).toContain('留存四大支柱')
    expect(prompt).toContain('升级、资源困境、目标、解密')
    expect(prompt).toContain('第一段直接落在雨巷门槛旧影回头')
    expect(prompt).toContain('旧影回头后指向的禁库门牌')
  })

  test('normalizes existing camelCase reader drop risk brief during confirmed merge', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 22,
          title: '雨巷迟疑',
          summary: '旧目标',
          scene_cards: [],
          readerDropRiskBrief: {
            dropPoints: ['开篇三百字没有现场危险，读者会以为只是复盘。'],
            pullPoints: ['门槛旧影回头时立刻给出未解问题。'],
            repairActions: ['开篇直接写旧影拦门，中段用证据推进，章末留下禁库门牌。'],
            openingGuardrail: '前 300 字必须让旧影拦门并压出危险。',
            middleGuardrail: '中段必须用旧证推进，而不是解释设定。',
            endingGuardrail: '章末必须留下禁库门牌问题。',
          },
        },
      },
      {
        chapter_no: 22,
        chapter_goal: '李玄在雨巷门槛处验证旧影规则。',
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.chapter_target.reader_drop_risk_brief.opening_guardrail).toContain('旧影拦门')
    expect(context.chapter_target.reader_drop_risk_brief.middle_guardrail).toContain('旧证推进')
    expect(context.chapter_target.reader_drop_risk_brief.ending_guardrail).toContain('禁库门牌')
    expect(context.reader_drop_risk_brief.drop_points).toContain('开篇三百字没有现场危险，读者会以为只是复盘。')
  })

  test('merges camelCase confirmed innovation brief into prose context', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 22,
          title: '旧印反制',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 22,
        chapter_goal: '李玄用旧印规则代价反制执事。',
        innovationBrief: {
          chapterAngle: '规则代价反差：越强行抢证，旧印反噬越明显。',
          executionPoints: ['让执事抢证动作触发旧印反噬，而不是普通争抢。'],
          differentiationGuardrails: ['不得写成普通证据摊牌。'],
          ipAdaptationHooks: ['旧印在掌心倒转，雨巷长案上的烛火同时变青。'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )
    const prompt = service.buildParagraphProseContext(
      { title: '旧城维修师' },
      context,
      null,
      { chapter_no: 22, title: '旧印反制' },
    )

    expect(context.chapter_target.innovation_brief.chapter_angle).toContain('规则代价反差')
    expect(context.chapter_target.innovation_brief.execution_points).toContain('让执事抢证动作触发旧印反噬，而不是普通争抢。')
    expect(context.chapter_target.innovation_brief.differentiation_guardrails).toContain('不得写成普通证据摊牌。')
    expect(context.chapter_target.innovation_brief.ip_adaptation_hooks).toContain('旧印在掌心倒转，雨巷长案上的烛火同时变青。')
    expect(prompt).toContain('执行 chapter_target.innovation_brief')
    expect(prompt).toContain('规则代价反差')
    expect(prompt).toContain('旧印在掌心倒转')
  })

  test('merges camelCase confirmed longform compass into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 2,
        chapter_goal: '验证十点门槛。',
        longformCompass: {
          readerPromise: '超人力量必须持续撞上规则判定。',
          coreConflict: '蛮力破局与规则边界互相反制。',
          immutableRules: ['超人力量不能变成无代价清场'],
          flexibleZones: ['副本可变化，但必须服务规则破局主线'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.longformCompass.readerPromise).toContain('规则判定')
    expect(context.chapter_target.longform_compass.immutable_rules).toContain('超人力量不能变成无代价清场')
    expect(context.longform_compass.axes.find((axis: any) => axis.key === 'core_conflict')?.value).toContain('规则边界')
  })

  test('merges camelCase confirmed reader expectation ledger into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 9,
          title: '账册启封',
          scene_cards: [],
        },
      },
      {
        chapter_no: 9,
        readerExpectationLedger: {
          chapterPromise: '本章必须兑现旧案账册。',
          mustDeliver: [
            { key: 'ledger_payoff', label: '读者期待', type: 'payoff', text: '旧案账册必须被打开。' },
          ],
          keepAlive: [
            { key: 'old_case_backer', label: '保留悬念', type: 'question', text: '旧案幕后供奉是谁。' },
          ],
          mustNotBreak: ['不能提前公开供奉身份'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.chapter_target.reader_expectation_ledger.chapter_promise).toContain('旧案账册')
    expect(context.chapter_target.reader_expectation_ledger.must_deliver[0].text).toContain('旧案账册必须被打开')
    expect(context.chapter_target.reader_expectation_ledger.keep_alive[0].text).toContain('旧案幕后供奉是谁')
    expect(context.chapter_target.reader_expectation_ledger.must_not_break).toContain('不能提前公开供奉身份')
  })

  test('merges confirmed core contract radar into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 2,
        chapter_goal: '验证十点门槛。',
        core_contract_radar: {
          summary: '本章必须把超人力量撞上规则判定写成可见事件。',
          must_serve: ['超人力量和规则判定持续碰撞', '蛮力破局与规则判定的对抗'],
          no_drift: ['不能把规则怪谈写成纯打怪'],
          repair_focus: ['补足规则判定反制蛮力'],
          checks: [{ key: 'reader_promise', label: '读者承诺', status: 'warn', reason: '碰撞不够可见' }],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.core_contract_radar.must_serve).toContain('超人力量和规则判定持续碰撞')
    expect(context.chapter_target.core_contract_radar.no_drift).toContain('不能把规则怪谈写成纯打怪')
    expect(context.core_contract_radar.repair_focus).toContain('补足规则判定反制蛮力')
  })

  test('merges camelCase confirmed core contract radar into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 2,
        chapter_goal: '验证十点门槛。',
        coreContractRadar: {
          summary: '本章必须把规则反制爽点写成现场事件。',
          mustServe: ['读者承诺必须维持规则反制爽点'],
          noDrift: ['不能把校园怪谈改写成纯战斗副本'],
          repairFocus: ['补足规则判定压住蛮力的可见代价'],
        },
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.coreContractRadar.mustServe).toContain('读者承诺必须维持规则反制爽点')
    expect(context.chapter_target.core_contract_radar.no_drift).toContain('不能把校园怪谈改写成纯战斗副本')
    expect(context.core_contract_radar.repair_focus).toContain('补足规则判定压住蛮力的可见代价')
  })

  test('merges camelCase confirmed longform battle context into chapter generation context', () => {
    const context = mergeConfirmedPreDraftBriefIntoContext(
      {
        chapter_target: {
          chapter_no: 2,
          title: '第一条规则',
          summary: '旧目标',
          scene_cards: [],
        },
      },
      {
        chapter_no: 2,
        chapter_goal: '验证十点门槛。',
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
        confirmed_at: '2026-06-09T10:00:00.000Z',
      },
    )

    expect(context.pre_draft_brief.longformBattleContext.riskChips).toContain('核心漂移')
    expect(context.chapter_target.longform_battle_context.summary).toContain('长篇核心拉回规则反制')
    expect(context.longform_battle_context.risk_lanes[0].required_action).toContain('规则判定压住蛮力')
  })

  test('builds storyline context in the chapter context package', () => {
    const contextPackageSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/chapter-context-package.ts'), 'utf8')
    const outlineSource = readFileSync(join(import.meta.dir, '../novel-writing-service/quality/outline-blueprint-contracts.ts'), 'utf8')
    const handoffSource = readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/core-handoff-sync-reports.ts'), 'utf8')
    const storylineSource = [contextPackageSource, outlineSource, handoffSource].join('\n')

    expect(storylineSource).toContain('storyline_context')
    expect(storylineSource).toContain('STORYLINE_TYPES')
    expect(storylineSource).toContain('storylineAdvances')
    expect(storylineSource).toContain('storylineForbidden')
  })

})

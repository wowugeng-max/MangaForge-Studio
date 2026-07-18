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

describe('readability meme review', () => {
  test('adds rolling rhythm preflight to write preparation before drafting', () => {
    const project = { title: '寒门阵师', synopsis: '废柴阵师靠残阵翻盘。', reference_config: {} }
    const contextPackage = {
      recent_fatigue_radar: {
        status: 'needs_attention',
        chapter_range_label: '第13-15章',
        signals: [
          {
            key: 'expectation_chain_break_gap',
            label: '连续断期待',
            status: 'warn',
            detail: '连续兑现旧目标后没有先立起下一开环。',
          },
          {
            key: 'repeated_reader_payoff_type',
            label: '回报形态重复',
            status: 'warn',
            detail: '同一核心梗连续3次以上无差异化：公开打脸连续复用。',
          },
          {
            key: 'reader_need_coverage_gap',
            label: '读者需求命中缺口',
            status: 'warn',
            detail: '爽点满足的需求偏向材料流程，偏离废柴靠残阵翻盘的书籍卖点。',
          },
        ],
        fatigue_risks: [
          '期待清空后没有新目标，可能形成期待真空。',
          '公开打脸连续3次以上无差异化。',
          '卖点偏移：章节在材料流程里打转。',
        ],
        next_actions: [
          '下一章必须在当前目标完成前提前铺设下一目标线索。',
          '下一章必须避开公开打脸，改用信息解锁或超额收获。',
        ],
      },
      batch_preflight: {
        guardrail_status: 'caution',
        guardrails: [
          { label: '批次节奏', status: 'warn', detail: '第16章缺少明确章末钩子，容易断期待。' },
        ],
        warnings: ['批次任务书提示：卖点偏移风险，不能把核心回报写成材料流水账。'],
      },
      chapter_target: {
        chapter_no: 16,
        title: '残阵再鸣',
        summary: '主角转向藏书阁追查残阵新线索。',
        conflict: '执事余党想把残阵线索封回旧账册。',
        ending_hook: '残阵鸣声指向禁库第二层。',
        scene_cards: [
          {
            title: '藏书阁封门',
            conflict: '执事余党封住藏书阁门禁。',
            reader_payoff: '主角不用公开打脸，而是用残阵反向定位禁库线索。',
          },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-28T12:00:00.000Z',
    })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(project, context, null, { chapter_no: 16, title: '残阵再鸣' })

    expect(brief.write_preparation_brief.rolling_rhythm_preflight.status).toBe('needs_attention')
    expect(brief.write_preparation_brief.rolling_rhythm_preflight.principle).toContain('拉期待速度 > 断期待速度')
    expect(brief.write_preparation_brief.rolling_rhythm_preflight.expectation_vacuum_risks.join('；')).toContain('期待真空')
    expect(brief.write_preparation_brief.rolling_rhythm_preflight.expectation_first_aid.join('；')).toContain('反派视角转接')
    expect(brief.write_preparation_brief.rolling_rhythm_preflight.expectation_first_aid.join('；')).toContain('突发意外')
    expect(brief.write_preparation_brief.rolling_rhythm_preflight.expectation_first_aid.join('；')).toContain('配角杠杆')
    expect(brief.write_preparation_brief.rolling_rhythm_preflight.expectation_first_aid.join('；')).toContain('超额收获')
    expect(brief.write_preparation_brief.rolling_rhythm_preflight.repetition_boundary_risks.join('；')).toContain('同一核心梗连续3次以上无差异化')
    expect(brief.write_preparation_brief.rolling_rhythm_preflight.selling_point_drift_risks.join('；')).toContain('卖点偏移')
    expect(brief.write_preparation_brief.must_confirm.join('；')).toContain('拉期待速度 > 断期待速度')
    expect(context.chapter_target.write_preparation_brief.rolling_rhythm_preflight.next_actions.join('；')).toContain('提前铺设下一目标线索')
    expect(prompt).toContain('滚动节奏预检 rolling_rhythm_preflight')
    expect(prompt).toContain('拉期待速度 > 断期待速度')
    expect(prompt).toContain('期待真空期急救')
    expect(prompt).toContain('反派视角转接')
    expect(prompt).toContain('卖点偏移')
    expect(prompt).toContain('同一核心梗连续3次以上无差异化')
  })

  test('does not add rolling rhythm preflight without concrete rhythm risks', () => {
    const project = { title: '寒门阵师', synopsis: '废柴阵师靠残阵翻盘。', reference_config: {} }
    const brief = buildChapterPreDraftBrief(project, {
      chapter_target: {
        chapter_no: 16,
        title: '残阵再鸣',
        summary: '主角转向藏书阁追查残阵新线索。',
        conflict: '执事余党想把残阵线索封回旧账册。',
        ending_hook: '残阵鸣声指向禁库第二层。',
        scene_cards: [
          {
            title: '藏书阁封门',
            conflict: '执事余党封住藏书阁门禁。',
            reader_payoff: '主角用残阵反向定位禁库线索。',
          },
        ],
      },
    })

    expect(brief.write_preparation_brief.rolling_rhythm_preflight).toBeNull()
  })

  test('builds serial momentum brief for recent five-chapter low progress and weak conflict streaks', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        { chapter_no: 11, title: '庭外等待', chapter_summary: '主角等待执事通知，整理旧资料。', conflict: '过渡等待。', ending_hook: '夜色渐深。' },
        { chapter_no: 12, title: '藏书阁前', chapter_summary: '主角观察藏书阁门口，回忆旧案。', conflict: '观察环境。', ending_hook: '风吹过门缝。' },
        { chapter_no: 13, title: '旧纸复盘', chapter_summary: '主角复盘上一轮证据，解释阵纹来源。', conflict: '复盘说明。', ending_hook: '纸页轻响。' },
        { chapter_no: 14, title: '廊下转场', chapter_summary: '主角走过长廊，想起师父的话。', conflict: '转场铺垫。', ending_hook: '灯火摇晃。' },
        { chapter_no: 15, title: '第二道阵鸣', chapter_summary: '主角发现旧阵第二道阵鸣来自藏书阁深处。', conflict: '执事余党阻止他入阁。', ending_hook: '地砖下传来第二道阵鸣。' },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.chapter_range_label).toBe('第11-15章')
    expect(brief?.signals.map((item: any) => item.key)).toEqual(expect.arrayContaining(['recent_five_low_progress', 'consecutive_weak_conflict']))
    expect(brief?.fatigue_risks.join('；')).toContain('最近5章明确进展不足')
    expect(brief?.fatigue_risks.join('；')).toContain('连续弱冲突')
    expect(brief?.next_actions.join('；')).toContain('下一章必须给出明确阻力')
    expect(brief?.next_actions.join('；')).toContain('读完本章世界或关系必须不同')
  })

  test('builds serial momentum brief when recent chapters lack visible reader payoff', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        { chapter_no: 11, title: '庭外复核', chapter_summary: '主角追查旧案线索，逼执事提交复核名册。', conflict: '执事拖延复核并封锁名册。', ending_hook: '名册缺了一页。' },
        { chapter_no: 12, title: '藏书阁前', chapter_summary: '主角进入藏书阁外院，确认门禁阵纹被人改过。', conflict: '门禁阵纹阻止他靠近。', ending_hook: '门缝里露出旧纸角。' },
        { chapter_no: 13, title: '旧纸追查', chapter_summary: '主角追查旧纸来源，定位到三年前的阵堂记录。', conflict: '阵堂弟子阻止他翻阅记录。', ending_hook: '记录尾页被撕走。' },
        { chapter_no: 14, title: '廊下封锁', chapter_summary: '主角决定转向后廊，发现巡夜路线被临时改变。', conflict: '巡夜弟子封锁后廊。', ending_hook: '后廊灯火同时熄灭。' },
        { chapter_no: 15, title: '第二道阵鸣', chapter_summary: '主角发现旧阵第二道阵鸣来自藏书阁深处。', conflict: '执事余党阻止他入阁。', ending_hook: '地砖下传来第二道阵鸣。' },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key)).toContain('recent_payoff_drought')
    expect(brief?.fatigue_risks.join('；')).toContain('可见读者回报不足')
    expect(brief?.next_actions.join('；')).toContain('下一章必须交付显性回报')
    expect(brief?.payoff_variation).toContain('显性回报')
  })

  test('does not treat structured scene reader payoffs as payoff drought', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        {
          chapter_no: 11,
          title: '庭外复核',
          chapter_summary: '主角追查旧案线索，执事封锁名册。',
          conflict: '执事拖延复核并封锁名册。',
          raw_payload: { scene_cards: [{ reader_payoff: '主角拿到第一份复核名册。' }] },
        },
        {
          chapter_no: 12,
          title: '藏书阁前',
          chapter_summary: '主角确认门禁阵纹被人改过。',
          conflict: '门禁阵纹阻止他靠近。',
          raw_payload: { scene_cards: [{ reader_payoff: '门禁阵纹反证执事撒谎。' }] },
        },
        {
          chapter_no: 13,
          title: '旧纸追查',
          chapter_summary: '主角定位到三年前的阵堂记录。',
          conflict: '阵堂弟子阻止他翻阅记录。',
          raw_payload: { scene_cards: [{ reader_payoff: '旧纸解锁三年前阵堂记录。' }] },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('recent_payoff_drought')
  })

  test('builds serial momentum brief when consecutive chapters repeat the same ending hook type', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        {
          chapter_no: 13,
          title: '名册缺页',
          chapter_summary: '主角确认名册缺页并推进到藏书阁。',
          conflict: '执事封锁名册。',
          ending_hook: '名册缺页背后露出第二个名字。',
          raw_payload: { pre_draft_brief: { chapter_hook_contract: { ending_hook_type: '突然揭示' } } },
        },
        {
          chapter_no: 14,
          title: '旧纸角',
          chapter_summary: '主角发现旧纸角指向三年前记录。',
          conflict: '阵堂弟子阻止他翻阅记录。',
          ending_hook: '旧纸角背后露出第三个名字。',
          raw_payload: { pre_draft_brief: { chapter_hook_contract: { ending_hook_type: '突然揭示' } } },
        },
        {
          chapter_no: 15,
          title: '门禁朱印',
          chapter_summary: '主角推翻门禁阵纹的旧解释。',
          conflict: '门禁阵纹反噬主角。',
          ending_hook: '朱印下面露出执事藏起的签名。',
          raw_payload: { pre_draft_brief: { chapter_hook_contract: { ending_hook_type: '突然揭示' } } },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals?.map((item: any) => item.key) || []).toContain('repeated_ending_hook_type')
    expect(brief?.fatigue_risks.join('；')).toContain('连续章尾钩子类型重复')
    expect(brief?.hook_variation).toContain('更换章末钩子类型')
    expect(brief?.next_actions.join('；')).toContain('突然揭示')
  })

  test('reads ending hook type from serialized contextPackage snake_case chapter target', () => {
    const chapterHookContract = {
      endingHookType: '突然揭示',
    }
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        {
          chapter_no: 13,
          title: '名册缺页',
          chapter_summary: '主角确认名册缺页并推进到藏书阁。',
          conflict: '执事封锁名册，主角必须当场拿到查验许可。',
          raw_payload: {
            contextPackage: {
              chapter_target: {
                chapterHookContract,
              },
            },
          },
        },
        {
          chapter_no: 14,
          title: '旧纸角',
          chapter_summary: '主角发现旧纸角指向三年前记录。',
          conflict: '阵堂弟子阻止他翻阅记录，主角必须用许可反压。',
          raw_payload: {
            contextPackage: {
              chapter_target: {
                chapterHookContract,
              },
            },
          },
        },
        {
          chapter_no: 15,
          title: '门禁朱印',
          chapter_summary: '主角推翻门禁阵纹的旧解释。',
          conflict: '门禁阵纹反噬主角，主角必须找出朱印的真用途。',
          raw_payload: {
            contextPackage: {
              chapter_target: {
                chapterHookContract,
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals?.map((item: any) => item.key) || []).toContain('repeated_ending_hook_type')
    expect(brief?.next_actions?.join('；') || '').toContain('突然揭示')
  })

  test('does not flag repeated ending hook type when recent chapter hooks vary', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        {
          chapter_no: 13,
          title: '名册缺页',
          chapter_summary: '主角确认名册缺页并推进到藏书阁。',
          conflict: '执事封锁名册。',
          ending_hook: '名册缺页背后露出第二个名字。',
          raw_payload: { pre_draft_brief: { chapter_hook_contract: { ending_hook_type: '突然揭示' } } },
        },
        {
          chapter_no: 14,
          title: '旧纸角',
          chapter_summary: '主角发现旧纸角指向三年前记录。',
          conflict: '阵堂弟子阻止他翻阅记录。',
          ending_hook: '巡夜弟子已经追到门外。',
          raw_payload: { pre_draft_brief: { chapter_hook_contract: { ending_hook_type: '紧急危机' } } },
        },
        {
          chapter_no: 15,
          title: '门禁朱印',
          chapter_summary: '主角推翻门禁阵纹的旧解释。',
          conflict: '门禁阵纹反噬主角。',
          ending_hook: '朱印下面露出执事藏起的签名。',
          raw_payload: { pre_draft_brief: { chapter_hook_contract: { ending_hook_type: '神秘物品' } } },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('repeated_ending_hook_type')
  })

  test('builds serial momentum brief when consecutive chapters repeat the same reader payoff type', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        {
          chapter_no: 13,
          title: '名册缺页',
          chapter_summary: '主角当众逼执事改口，公开证明名册被藏。',
          conflict: '执事封锁名册。',
          reader_payoff: '公开打脸：执事当众改口，旁观弟子震惊倒向主角。',
        },
        {
          chapter_no: 14,
          title: '旧纸角',
          chapter_summary: '主角继续当众反证，逼阵堂弟子承认旧纸来源。',
          conflict: '阵堂弟子阻止他翻阅记录。',
          reader_payoff: '公开打脸：阵堂弟子当众低头，围观者震惊。',
        },
        {
          chapter_no: 15,
          title: '门禁朱印',
          chapter_summary: '主角再一次公开揭穿执事余党的谎话。',
          conflict: '门禁阵纹反噬主角。',
          reader_payoff: '公开打脸：执事余党失态改口，全场震惊。',
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('repeated_reader_payoff_type')
    expect(brief?.fatigue_risks.join('；')).toContain('连续回报形态重复')
    expect(brief?.payoff_variation).toContain('更换回报形态')
    expect(brief?.next_actions.join('；')).toContain('公开打脸')
    expect(brief?.next_actions.join('；')).toContain('影响范围')
  })

  test('does not flag repeated reader payoff type when recent payoff forms vary', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        {
          chapter_no: 13,
          title: '名册缺页',
          chapter_summary: '主角当众逼执事改口。',
          conflict: '执事封锁名册。',
          reader_payoff: '公开打脸：执事当众改口。',
        },
        {
          chapter_no: 14,
          title: '旧纸角',
          chapter_summary: '主角发现旧纸角指向三年前记录。',
          conflict: '阵堂弟子阻止他翻阅记录。',
          reader_payoff: '信息解锁：旧纸角揭开三年前记录的位置。',
        },
        {
          chapter_no: 15,
          title: '门禁朱印',
          chapter_summary: '林青禾主动站到主角一侧，承认愿意担保。',
          conflict: '门禁阵纹反噬主角。',
          reader_payoff: '关系回报：林青禾公开倒向主角，关系态度改变。',
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('repeated_reader_payoff_type')
  })

  test('builds serial momentum brief when consecutive payoff chapters leave no aftermath', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        {
          chapter_no: 14,
          title: '旧纸反证',
          chapter_summary: '主角公开反证旧纸来源，逼阵堂弟子当众低头。',
          conflict: '阵堂弟子阻止他翻阅记录。',
          reader_payoff: '信息解锁：旧纸角揭开三年前记录的位置。',
          ending_hook: '门外又传来一声阵鸣。',
        },
        {
          chapter_no: 15,
          title: '门禁朱印',
          chapter_summary: '主角推翻门禁阵纹旧解释，当众反制执事余党。',
          conflict: '门禁阵纹反噬主角。',
          reader_payoff: '公开打脸：执事余党失态改口，全场震惊。',
          ending_hook: '朱印下面露出执事藏起的签名。',
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('consecutive_payoff_without_aftermath')
    expect(brief?.fatigue_risks.join('；')).toContain('连续只爆点不留反应余波')
    expect(brief?.next_actions.join('；')).toContain('承接余波')
    expect(brief?.next_actions.join('；')).toContain('关系')
    expect(brief?.scene_freshness).toContain('承接场景')
  })

  test('does not flag consecutive payoff chapters when aftermath advances relation or foreshadowing', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 16, title: '旧阵异响' },
      [
        {
          chapter_no: 14,
          title: '旧纸反证',
          chapter_summary: '主角公开反证旧纸来源，逼阵堂弟子低头；林青禾态度改变，主动把三年前记录伏笔交给主角。',
          conflict: '阵堂弟子阻止他翻阅记录。',
          reader_payoff: '信息解锁：旧纸角揭开三年前记录的位置。',
          ending_hook: '林青禾留下新的伏笔线索。',
        },
        {
          chapter_no: 15,
          title: '门禁朱印',
          chapter_summary: '主角推翻门禁阵纹旧解释；执事余党失态后，关系余波让旁证倒向主角，并打开下一目标。',
          conflict: '门禁阵纹反噬主角。',
          reader_payoff: '公开打脸：执事余党失态改口，全场震惊。',
          ending_hook: '下一目标指向藏书阁。',
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('consecutive_payoff_without_aftermath')
  })

  test('builds serial momentum brief when mainline and subplot both flatline', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册复看',
          chapter_summary: '主角整理账册旧痕，暂时等待长老回复。',
          conflict: '复盘说明，没有新的阻力。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: {
                mainline: '等待长老回复，主线暂不推进。',
                subplot: '整理旁证名单，支线暂不推进。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯再查',
          chapter_summary: '主角观察禁库灯色，继续整理旧案材料。',
          conflict: '观察环境，等待通知。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: {
                mainline: '观察禁库动静，主线继续铺垫。',
                subplot: '复盘林青禾态度，支线没有变化。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('line_stagger_flatline')
    expect(brief?.fatigue_risks.join('；')).toContain('主线和支线同时空转')
    expect(brief?.next_actions.join('；')).toContain('错开节奏')
    expect(brief?.next_actions.join('；')).toContain('主线')
    expect(brief?.next_actions.join('；')).toContain('支线')
  })

  test('does not flag line stagger when mainline and subplot alternate progress', () => {
    const brief = buildSerialMomentumBrief(
      { chapter_no: 18, title: '禁库回声' },
      [
        {
          chapter_no: 16,
          title: '账册复看',
          chapter_summary: '主角确认执事账册缺页，主线推进到禁库。',
          conflict: '执事余党阻止他带走证据。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: {
                mainline: '确认账册缺页，主线推进到禁库入口。',
                subplot: '林青禾关系线暂时压住不爆。',
              },
            },
          },
        },
        {
          chapter_no: 17,
          title: '夜灯再查',
          chapter_summary: '林青禾主动担保，关系支线推进；主线只保留禁库门禁伏笔。',
          conflict: '门禁规则要求担保人承担代价。',
          raw_payload: {
            chapter_blueprint: {
              plot_lines: {
                mainline: '禁库门禁作为伏笔保留，暂不解决。',
                subplot: '林青禾主动担保，关系支线推进。',
              },
            },
          },
        },
      ],
    )

    expect(brief?.signals.map((item: any) => item.key) || []).not.toContain('line_stagger_flatline')
  })

  test('builds serial momentum brief when consecutive chapters repeat the same core element combo', () => {
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
          title: '玉牌争夺',
          chapter_summary: '主角在试炼台夺回玉牌，关系奖励继续落到旁证倒向。',
          conflict: '执事余党争夺玉牌并逼主角再次比试。',
          raw_payload: {
            pre_draft_brief: {
              story_loop_contract: {
                core_elements: ['夺宝', '关系奖励', '比武试炼'],
              },
            },
          },
        },
      ],
    )

    expect(brief?.status).toBe('needs_attention')
    expect(brief?.signals.map((item: any) => item.key)).toContain('repeated_core_element_combo')
    expect(brief?.fatigue_risks.join('；')).toContain('核心要素组合重复')
    expect(brief?.next_actions.join('；')).toContain('更换场景')
    expect(brief?.next_actions.join('；')).toContain('人物')
    expect(brief?.next_actions.join('；')).toContain('情绪')
  })

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

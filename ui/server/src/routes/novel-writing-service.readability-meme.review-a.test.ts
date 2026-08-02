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

describe('readability meme review a', () => {
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


})

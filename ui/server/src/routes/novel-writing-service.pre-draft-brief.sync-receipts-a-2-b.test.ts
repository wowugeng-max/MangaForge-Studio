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
const createProsePipelineHarness = (options?: any) => createProsePipelineHarnessWithService(createNovelWritingService, options)
const readSceneCardsPromptSource = () => readFileSync(join(import.meta.dir, '../novel-writing/scene-cards-prompt.ts'), 'utf8')
const readPostDeliveryStoryStateUpdateSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-story-state-update.ts'), 'utf8')
const readChapterProseStoragePatchSource = () => readFileSync(join(import.meta.dir, '../novel-writing/chapter-prose-storage-patch.ts'), 'utf8')
const readPostDeliverySyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-sync-review-record.ts'), 'utf8')
const readDraftSyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/draft-sync-review-record.ts'), 'utf8')

describe('chapter pre-draft brief sync-receipts a 2 b', () => {
  test('carries failed dialogue checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 211,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:12:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                dialogue_checks: [
                  {
                    key: 'voice_distinction',
                    label: '角色声线差异',
                    status: 'fail',
                    evidence: '李超、张智、门外学生都在用同一种解释规则的口吻。',
                    fix: '下一章让李超用短句顶回去，张智只拆规则漏洞，门外学生只重复一句求救。',
                  },
                  {
                    key: 'subtext_agenda',
                    label: '潜台词与议程',
                    status: 'warn',
                    evidence: '角色把真实目的直接说出来，没有借口和试探。',
                    fix: '下一章把“我想进门”改成门外学生借丢失校牌试探开门规则。',
                  },
                  {
                    key: 'dialogue_format',
                    label: '对话独立成行',
                    status: 'pass',
                    evidence: '对白格式清楚。',
                    fix: '',
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
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修对白')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修对白：对白缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('李超用短句顶回去')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('丢失校牌试探开门规则')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('对白格式清楚')
    expect(prompt).toContain('修对白：对白缺口 2')
    expect(prompt).toContain('同一种解释规则的口吻')
    expect(prompt).toContain('真实目的直接说出来')
  })
  test('carries failed plot dynamics checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 4, chapter_no: 4, title: '水迹名字' },
      [
        { id: 3, chapter_no: 3, title: '门外学生' },
        { id: 4, chapter_no: 4, title: '水迹名字' },
      ],
      [
        {
          id: 212,
          chapter_id: 3,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:13:00.000Z',
          payload: JSON.stringify({
            chapter_id: 3,
            chapter_no: 3,
            self_check: {
              review: {
                plot_dynamics_checks: [
                  {
                    key: 'minimum_loop',
                    label: '目标阻碍反馈闭环',
                    status: 'fail',
                    evidence: '主角只是解释规则，没有行动、代价或新期待。',
                    fix: '下一章开篇让主角立刻验证水迹名字，并付出被宿管发现的代价。',
                  },
                  {
                    key: 'false_victory_collapse',
                    label: '假胜与崩解',
                    status: 'warn',
                    evidence: '主角发现线索后直接顺利推进，没有先给希望再击碎。',
                    fix: '下一章让水迹名字先指向安全答案，再被失踪名单推翻。',
                  },
                  {
                    key: 'ending_suspension',
                    label: '悬置收尾',
                    status: 'pass',
                    evidence: '章末留下水迹名字。',
                    fix: '',
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
        chapter_no: 4,
        title: '水迹名字',
        summary: '主角根据玻璃门水迹追查湿漉漉学生身份。',
        conflict: '宿舍规则要求不能开门，但线索只在门外。',
        ending_hook: '水迹名字对应的人已经死了三年。',
        scene_cards: [
          { scene_no: 1, title: '追查名字', reader_payoff: '确认湿漉漉学生不是普通诱饵。' },
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
      { chapter_no: 4, title: '水迹名字' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修剧情动力')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('修剧情动力：动力缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('被宿管发现的代价')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('失踪名单推翻')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('章末留下水迹名字')
    expect(prompt).toContain('修剧情动力：动力缺口 2')
    expect(prompt).toContain('没有行动、代价或新期待')
    expect(prompt).toContain('先给希望再击碎')
  })
  test('carries failed continuity heat checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 5, chapter_no: 5, title: '旧钥匙缺口' },
      [
        { id: 4, chapter_no: 4, title: '水迹名字' },
        { id: 5, chapter_no: 5, title: '旧钥匙缺口' },
      ],
      [
        {
          id: 213,
          chapter_id: 4,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:13:00.000Z',
          payload: JSON.stringify({
            chapter_id: 4,
            chapter_no: 4,
            self_check: {
              review: {
                continuity_heat_checks: [
                  {
                    key: 'cold_foreshadowing',
                    label: '冷伏笔突然回收',
                    status: 'fail',
                    evidence: '旧钥匙三章未出现，章末突然成为破局答案。',
                    fix: '下一章先让角色发现钥匙缺口和旧锁痕，再推向回收。',
                  },
                  {
                    key: 'hot_element',
                    label: '当前 hot 元素',
                    status: 'warn',
                    evidence: '湿漉漉学生线索被搁置，改写无关宿舍闲聊。',
                    fix: '下一章开篇必须用湿漉漉学生继续施压。',
                  },
                  {
                    key: 'archived',
                    label: '已完结线',
                    status: 'pass',
                    evidence: '宿管查房线已自然关闭。',
                    fix: '',
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
        chapter_no: 5,
        title: '旧钥匙缺口',
        summary: '主角回收旧钥匙线索，确认它和宿舍门锁规则有关。',
        conflict: '湿漉漉学生再次施压，但室友想隐藏旧钥匙。',
        ending_hook: '旧锁痕里卡着三年前的学生证。',
        scene_cards: [
          { scene_no: 1, title: '钥匙缺口', reader_payoff: '旧钥匙从冷伏笔重新升温。' },
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
      { chapter_no: 5, title: '旧钥匙缺口' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修连续性热度')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('连续性热度：热度缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('钥匙缺口和旧锁痕')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('湿漉漉学生继续施压')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('宿管查房线已自然关闭')
    expect(prompt).toContain('连续性热度：热度缺口 2')
    expect(prompt).toContain('旧钥匙三章未出现')
    expect(prompt).toContain('无关宿舍闲聊')
  })
  test('carries failed character relation checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 6, chapter_no: 6, title: '公开作证' },
      [
        { id: 5, chapter_no: 5, title: '旧钥匙缺口' },
        { id: 6, chapter_no: 6, title: '公开作证' },
      ],
      [
        {
          id: 214,
          chapter_id: 5,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:13:00.000Z',
          payload: JSON.stringify({
            chapter_id: 5,
            chapter_no: 5,
            self_check: {
              review: {
                character_relation_checks: [
                  {
                    key: 'independent_goal',
                    label: '主角目标独立性',
                    status: 'fail',
                    evidence: '李玄整章只是在帮林青禾找证据，没有自己的试炼资格诉求。',
                    fix: '下一章开篇必须让李玄明确为了保住试炼资格主动要求复核阵图。',
                  },
                  {
                    key: 'npc_support',
                    label: '配角站桩',
                    status: 'warn',
                    evidence: '林青禾只在主角需要时作证，没有自己的顾虑和行动。',
                    fix: '下一章让林青禾先拒绝，再因家族风险选择有限作证。',
                  },
                  {
                    key: 'relationship_type',
                    label: '关系类型明确',
                    status: 'pass',
                    evidence: '执事权威压迫成立。',
                    fix: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 6,
        title: '公开作证',
        summary: '李玄要求复核阵图，林青禾在家族风险和事实之间做选择。',
        conflict: '林青禾作证会得罪执事，但沉默会让李玄失去试炼资格。',
        ending_hook: '林青禾作证后，阵盘裂出第二道光。',
        scene_cards: [
          { scene_no: 1, title: '复核阵图', reader_payoff: '李玄主动争取试炼资格。' },
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
      { chapter_no: 6, title: '公开作证' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修角色关系')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('角色关系：关系缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('保住试炼资格')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('有限作证')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('执事权威压迫成立')
    expect(prompt).toContain('角色关系：关系缺口 2')
    expect(prompt).toContain('没有自己的试炼资格诉求')
    expect(prompt).toContain('配角站桩')
  })
  test('carries failed benchmark recall checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 7, chapter_no: 7, title: '旧印章反推' },
      [
        { id: 6, chapter_no: 6, title: '公开作证' },
        { id: 7, chapter_no: 7, title: '旧印章反推' },
      ],
      [
        {
          id: 215,
          chapter_id: 6,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:13:00.000Z',
          payload: JSON.stringify({
            chapter_id: 6,
            chapter_no: 6,
            self_check: {
              review: {
                benchmark_recall_checks: [
                  {
                    key: 'rhythm_reference_missing',
                    label: '节奏参照失效',
                    status: 'fail',
                    evidence: '正文直接亮出旧印章，没有执行“先压三轮质问，再用证据爆发”。',
                    fix: '下一章开篇先让执事连续压问三轮，再让李玄晚半拍亮出旧印章反证。',
                  },
                  {
                    key: 'matched_technique_missing',
                    label: '匹配章技法缺席',
                    status: 'warn',
                    evidence: '旁观弟子反应只有整齐震惊，没有差异化反应。',
                    fix: '下一章让旁观弟子分成怀疑、倒戈、沉默三种反应，放大信息差反杀。',
                  },
                  {
                    key: 'copy_guard',
                    label: '未复制原文',
                    status: 'pass',
                    evidence: '没有发现对标章节原句。',
                    fix: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 7,
        title: '旧印章反推',
        summary: '李玄用旧印章反推出执事换证，逼旁观弟子重新站队。',
        conflict: '执事连续压问，试图抢走证词解释权。',
        ending_hook: '旧印章背面刻着第二个证人的名字。',
        scene_cards: [
          { scene_no: 1, title: '三轮压问', reader_payoff: '信息差反杀，执事失态。' },
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
      { chapter_no: 7, title: '旧印章反推' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修文风召回')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('文风召回：召回缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('连续压问三轮')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('怀疑、倒戈、沉默三种反应')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('没有发现对标章节原句')
    expect(prompt).toContain('文风召回：召回缺口 2')
    expect(prompt).toContain('没有执行“先压三轮质问，再用证据爆发”')
    expect(prompt).toContain('差异化反应')
  })
  test('carries benchmark recall execution fields into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 8, chapter_no: 8, title: '旧印反问' },
      [
        { id: 7, chapter_no: 7, title: '旧印章反推' },
        { id: 8, chapter_no: 8, title: '旧印反问' },
      ],
      [
        {
          id: 218,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:18:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            self_check: {
              review: {
                benchmark_recall_checks: [
                  {
                    key: 'rhythm_reference_missing',
                    label: '节奏参照失效',
                    status: 'fail',
                    source_type: 'rhythm',
                    source_path: '剧情/节奏.md',
                    expected_application: '先让执事三轮压问，再让李玄半拍亮出旧印证据。',
                    delivered_evidence: '正文开场直接交出旧印，缺少压问、停顿和半拍爆发。',
                    gaps_preserved: false,
                    evidence: '节奏参照没有落到正文动作。',
                    fix: '下一章开篇按三轮压问建立压迫，中段用半拍亮证据爆发。',
                    remaining_risk: '不能继续把对标节奏写成一句总结。',
                  },
                  {
                    key: 'style_boundary_ok',
                    label: '未复制桥段',
                    status: 'pass',
                    source_type: 'matched_chapter',
                    source_path: '对标/第12章.md',
                    expected_application: '只学习停顿节奏。',
                    delivered_evidence: '已兑现。',
                    gaps_preserved: true,
                    evidence: '已兑现。',
                    fix: '',
                    remaining_risk: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 8,
        title: '旧印反问',
        summary: '李玄用旧印反问执事，逼出旧证缺口。',
        conflict: '执事试图用连续压问夺回解释权。',
        ending_hook: '旧印缺口指向第三个证人。',
        scene_cards: [
          { scene_no: 1, title: '三轮压问', reader_payoff: '文风召回字段被正文执行。' },
        ],
      },
    }
    const brief = buildChapterPreDraftBrief(project, contextPackage)
    const context = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-10T08:18:00.000Z',
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
      { chapter_no: 8, title: '旧印反问' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 1')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修文风召回')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('文风召回：召回缺口 1')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('benchmark_recall_checks.节奏参照失效')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('source_type=rhythm')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('source_path=剧情/节奏.md')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('expected_application=先让执事三轮压问')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('delivered_evidence=正文开场直接交出旧印')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('gaps_preserved=false')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('未复制桥段')
    expect(brief.delivery_risk_carry_over.opening_actions.join('｜')).toContain('文风召回')
    expect(brief.delivery_risk_carry_over.middle_actions.join('｜')).toContain('expected_application')
    expect(brief.delivery_risk_carry_over.ending_actions.join('｜')).toContain('gaps_preserved')
    expect(prompt).toContain('benchmark_recall_checks.节奏参照失效')
    expect(prompt).toContain('不能继续把对标节奏写成一句总结')
  })
  test('carries failed style boundary checks into the next pre-draft brief and prose prompt', () => {
    const deliveryRiskCarryOver = buildDeliveryRiskCarryOverContext(
      { id: 7, chapter_no: 7, title: '旧印章反推' },
      [
        { id: 6, chapter_no: 6, title: '公开作证' },
        { id: 7, chapter_no: 7, title: '旧印章反推' },
      ],
      [
        {
          id: 216,
          chapter_id: 6,
          review_type: 'prose_quality',
          created_at: '2026-06-09T08:14:00.000Z',
          payload: JSON.stringify({
            chapter_id: 6,
            chapter_no: 6,
            self_check: {
              review: {
                style_boundary_checks: [
                  {
                    key: 'gate_f_overridden_by_style',
                    label: '文风覆盖 Gate F',
                    status: 'fail',
                    evidence: '章尾为了模仿样章冷感，写成“这一切只是开始”的作者预告。',
                    fix: '下一章删掉为了模仿文风引入的章末升华，用旧印章背面的第二个名字做现场钩子。',
                  },
                  {
                    key: 'copy_boundary_breach',
                    label: '复制样章桥段',
                    status: 'warn',
                    evidence: '审判场景复用了样章的三次敲桌和同一句口癖。',
                    fix: '下一章保留压迫节奏，但改成证物裂纹、旁观倒戈和执事抢证，不复制样章桥段。',
                  },
                  {
                    key: 'hard_constraints_pass',
                    label: '硬约束通过',
                    status: 'pass',
                    evidence: '未发现禁用词。',
                    fix: '',
                  },
                ],
              },
            },
          }),
        },
      ],
    )
    const project = { title: '残阵问道', reference_config: {} }
    const contextPackage = {
      delivery_risk_carry_over: deliveryRiskCarryOver,
      chapter_target: {
        chapter_no: 7,
        title: '旧印章反推',
        summary: '李玄用旧印章反推出执事换证，逼旁观弟子重新站队。',
        conflict: '执事连续压问，试图抢走证词解释权。',
        ending_hook: '旧印章背面刻着第二个证人的名字。',
        scene_cards: [
          { scene_no: 1, title: '旧印章反推', reader_payoff: '信息差反杀，执事失态。' },
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
      { chapter_no: 7, title: '旧印章反推' },
    )

    expect(deliveryRiskCarryOver?.label).toBe('待修复 2')
    expect(deliveryRiskCarryOver?.priority_label).toBe('优先修文风边界')
    expect(brief.delivery_risk_carry_over.items.join('｜')).toContain('文风边界：边界缺口 2')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('章末升华')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).toContain('不复制样章桥段')
    expect(brief.delivery_risk_carry_over.required_actions.join('｜')).not.toContain('未发现禁用词')
    expect(prompt).toContain('文风边界：边界缺口 2')
    expect(prompt).toContain('模仿样章冷感')
    expect(prompt).toContain('复制样章桥段')
  })
})

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

describe('normalizeSceneCardsPayload', () => {
  test('normalizes cyclic repair arrays without overflowing', () => {
    const cyclicRepair: any = { key: 'delivery_risk_carry_over', risk: '承接风险' }
    cyclicRepair.self = cyclicRepair
    const cyclicChange: any = { change: '局势改变' }
    cyclicChange.self = cyclicChange

    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [{
        title: '红雾深处',
        purpose: '江哲确认旧办法是否失效。',
        conflict: '规则反噬会扩大裂缝。',
        reader_payoff: '旧答案变成新证据。',
        serial_risk_repairs: [cyclicRepair],
        state_changes_expected: [cyclicChange],
      }],
    })

    expect(sceneCards).toHaveLength(1)
    expect(sceneCards[0].serial_risk_repairs.join('；')).toContain('delivery_risk_carry_over')
    expect(sceneCards[0].state_changes_expected.join('；')).toContain('局势改变')
  })

  test('preserves scene-card sensory anchors for prose execution', () => {
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '账本翻页',
          purpose: '确认账目被篡改',
          beat: '主角翻到账本缺页',
          sensory_anchor: '纸张触感粗糙，页角卷曲处有新墨洇开的痕迹',
        },
        {
          title: '走廊追逐',
          purpose: '追上送信人',
          beat: '主角沿走廊追赶',
          sensoryAnchor: '脚步声被空走廊放大，风从右侧门缝里灌进来',
        },
      ],
    })

    expect(sceneCards[0].sensory_anchor).toBe('纸张触感粗糙，页角卷曲处有新墨洇开的痕迹')
    expect(sceneCards[1].sensory_anchor).toBe('脚步声被空走廊放大，风从右侧门缝里灌进来')
  })

  test('preserves scene-card serial risk repair fields for prose execution', () => {
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧盟约重签',
          purpose: '让主角用新信息推动目标',
          beat: '主角拿出账册证据，迫使盟友改口',
          serial_risk_repairs: ['two_chapter_momentum_stall', { key: 'five_chapter_texture_gap', action: '补关系调剂' }],
          recent_fatigue_action: '用账册新证据推进目标，同时让盟友关系发生可见变化。',
        },
      ],
    })

    expect(sceneCards[0].serial_risk_repairs).toEqual(['two_chapter_momentum_stall', '{"key":"five_chapter_texture_gap","action":"补关系调剂"}'])
    expect(sceneCards[0].recent_fatigue_action).toContain('账册新证据')
  })

  test('preserves oh-story scene-card execution directives for prose execution', () => {
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '蓝晶灼手',
          purpose: '蓝晶首次进入正文并改变证据判断',
          beat: '主角按住蓝晶，看见记忆碎片炸开',
          dialogue_goals: ['用半句对话确认蓝晶只能读残片，不能科普来历。'],
          style_directives: ['本场按文风指纹恢复中长句呼吸。'],
          benchmark_recall_directives: ['学习对标章的潜台词节奏，不复制原句。'],
          concept_anchor_rules: ['蓝晶首次出现必须先写灼手反应和物理后果。'],
          prose_craft_directives: ['不得用整段来历/等级解释蓝晶。'],
        },
      ],
    })

    expect(sceneCards[0].dialogue_goals).toContain('用半句对话确认蓝晶只能读残片，不能科普来历。')
    expect(sceneCards[0].style_directives).toContain('本场按文风指纹恢复中长句呼吸。')
    expect(sceneCards[0].benchmark_recall_directives).toContain('学习对标章的潜台词节奏，不复制原句。')
    expect(sceneCards[0].concept_anchor_rules).toContain('蓝晶首次出现必须先写灼手反应和物理后果。')
    expect(sceneCards[0].prose_craft_directives).toContain('不得用整段来历/等级解释蓝晶。')
  })

  test('keeps dialogue scene directives after pre-draft confirmation and projects intent baseline into scene goals', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 18,
        title: '血封条问证',
        summary: '李玄在血封条失控前逼证人说出账本来源。',
        conflict: '执事用长篇解释拖时间，证人害怕牵连家人。',
        emotional_curve: '高压 -> 生死逼近 -> 信息差反杀',
        scene_cards: [
          {
            scene_no: 1,
            title: '封条渗血',
            purpose: '用高压问证逼出账本来源。',
            conflict: '执事想把证人变成科普嘴拖住现场。',
            emotional_tone: '高压/生死',
            character_voice: '李玄短句压问；证人只说事实；轻快配角暂时闭嘴。',
            dialogue_goals: ['让证人用半句说漏账本来源，不能科普血封条来历。'],
            key_dialogue: '“谁让你把账本送进祠堂？”',
          },
        ],
      },
    }

    const brief = buildChapterPreDraftBrief({ title: '禁门账本' }, contextPackage)
    const confirmedContext = mergeConfirmedPreDraftBriefIntoContext(contextPackage, {
      ...brief,
      confirmed_at: '2026-06-27T10:00:00.000Z',
    })
    const confirmedScene = confirmedContext.chapter_target.scene_cards[0]
    const normalizedScenes = normalizeSceneCardsPayload({
      scene_cards: confirmedContext.chapter_target.scene_cards,
    }, confirmedContext)

    expect(confirmedScene.character_voice).toContain('李玄短句压问')
    expect(confirmedScene.dialogue_goals).toContain('让证人用半句说漏账本来源，不能科普血封条来历。')
    expect(normalizedScenes[0].dialogue_goals.join('｜')).toContain('不能科普血封条来历')
    expect(normalizedScenes[0].dialogue_goals.join('｜')).toContain('搞笑担当/轻快配角声线让位')
    expect(normalizedScenes[0].dialogue_goals.join('｜')).toContain('对话逐句承接对方情绪')
    expect(normalizedScenes[0].serial_risk_repairs).toContain('意图确认')
  })

  test('asks scene-card generation to emit oh-story execution directive fields', () => {
    const source = readSceneCardsPromptSource()

    expect(source).toContain('dialogue_goals(array)')
    expect(source).toContain('style_directives(array)')
    expect(source).toContain('benchmark_recall_directives(array)')
    expect(source).toContain('concept_anchor_rules(array)')
    expect(source).toContain('prose_craft_directives(array)')
  })

  test('preserves oh-story chapter positioning and benchmark structure coordinates for scene-card handoff', () => {
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '雨后喘息',
          purpose: '高潮后让两人确认旧账册的代价。',
          chapterPositioning: '低压生活',
          pressureLevel: 1,
          chapterPositioningRole: '高潮后喘息，关系升温但保留下一目标。',
          benchmarkStructureCoordinate: {
            normalized_position: '中点',
            source_event: '对标卷中点用低压关系章缓冲上个爆点。',
            local_event: '本卷中点让旧账册余波落到两人信任变化。',
            event_type: '转折',
          },
        },
      ],
    })

    expect(sceneCards[0].chapter_positioning).toBe('低压生活')
    expect(sceneCards[0].pressure_level).toBe(1)
    expect(sceneCards[0].chapter_positioning_role).toContain('关系升温')
    expect(sceneCards[0].benchmark_structure_coordinate.normalized_position).toBe('中点')
    expect(sceneCards[0].benchmark_structure_coordinate.local_event).toContain('信任变化')
  })

  test('wires chapter positioning and benchmark structure coordinates into scene-card and prose prompts', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const promptBlock = readSceneCardsPromptSource()
    const proseStart = source.indexOf('const buildParagraphProseContext =')
    const proseEnd = source.indexOf('const buildStoryStatePrompt =', proseStart)
    const proseBlock = source.slice(proseStart, proseEnd)
    const reviewStart = source.indexOf('const buildProseReviewPrompt =')
    const reviewEnd = source.indexOf('const buildProseRevisionPrompt =', reviewStart)
    const reviewBlock = source.slice(reviewStart, reviewEnd)

    expect(proseStart).toBeGreaterThanOrEqual(0)
    expect(reviewStart).toBeGreaterThanOrEqual(0)
    expect(promptBlock).toContain('chapter_positioning')
    expect(promptBlock).toContain('benchmark_structure_coordinate')
    expect(promptBlock).toContain('高压/推进/修炼试错/关系回收/低压生活/信息整理')
    expect(promptBlock).toContain('对标结构坐标')
    expect(proseBlock).toContain('chapter_target.chapter_positioning_brief')
    expect(proseBlock).toContain('scene_cards.chapter_positioning')
    expect(proseBlock).toContain('低压/过场章可弱钩子')
    expect(reviewBlock).toContain('chapter_positioning_checks')
  })

  test('preserves showdown scene-card public payoff and combat execution fields', () => {
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '审判台反压',
          purpose: '主角公开亮出第二本账册完成打脸。',
          showoffStageChain: '群众层质疑 -> 中间层验账 -> 核心层长老改判。',
          spectatorInterestShift: '旁观商户意识到旧账规则会影响自己的矿票资格。',
          secondaryShowoffEffect: '展示不只让人震惊，还迫使长老席重算利益和站队。',
          combatResultType: '碾压',
          combatDimensionPlan: '心/体/技：心态稳住审判台，技能拆账，身体挡住护卫逼近。',
          combatReversalPlan: '反派出A假账册，主角提前准备B原始封印克制，反派针对A时被引进预设B。',
        },
      ],
    })

    expect(sceneCards[0].showoff_stage_chain).toContain('群众层')
    expect(sceneCards[0].spectator_interest_shift).toContain('这跟我有关系')
    expect(sceneCards[0].spectator_interest_shift).toContain('矿票资格')
    expect(sceneCards[0].secondary_showoff_effect).toContain('重算利益')
    expect(sceneCards[0].combat_result_type).toBe('碾压')
    expect(sceneCards[0].combat_dimension_plan).toContain('心/体/技')
    expect(sceneCards[0].combat_reversal_plan).toContain('反派出A')
  })

  test('asks scene-card generation to emit character relation progression fields', () => {
    const promptBlock = readSceneCardsPromptSource()
    const sceneBriefSource = readFileSync(join(import.meta.dir, '../novel-writing/scene-briefs.ts'), 'utf8')
    const briefStart = sceneBriefSource.indexOf('export function sceneBriefFromCard')
    const briefBlock = sceneBriefSource.slice(briefStart)

    expect(briefStart).toBeGreaterThanOrEqual(0)
    expect(promptBlock).toContain('relationship_progression_plan')
    expect(promptBlock).toContain('relationship_buffer_zone')
    expect(promptBlock).toContain('supporting_character_action')
    expect(promptBlock).toContain('attitude_shift_checkpoint')
    expect(promptBlock).toContain('relationship_next_hook')
    expect(promptBlock).toContain('配角攻略缓冲区')
    expect(promptBlock).toContain('信息差、地位差距、亲密度差距或信任程度')
    expect(briefBlock).toContain('relationship_progression_plan')
    expect(briefBlock).toContain('relationship_buffer_zone')
    expect(briefBlock).toContain('supporting_character_action')
    expect(briefBlock).toContain('attitude_shift_checkpoint')
    expect(briefBlock).toContain('relationship_next_hook')
  })

  test('preserves oh-story conflict execution fields for scene-card handoff', () => {
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '封门抢票',
          purpose: '主角必须拿到设备间临时票。',
          conflict: '协会执事用资质规则挡门。',
          conflict_ladder_step: '行动阻拦：协会执事扣住临时票并要求客户签封单。',
          motivation_source: '世界背景：协会资质规则卡住旧城维修权限。',
          opposing_force: '协会执事、资质规则和客户授权流程。',
          blocked_desire: '主角想进入设备间拿到故障证据。',
          protagonist_agency_action: '做别人不敢做的事：当众挑战协会封单规则。',
          no_exit_reason: '客户设备停摆会导致整层停电，主角非踏入不可。',
          event_value_change: '设备间权限从拒绝到临时开放。',
          next_conflict_seed: '第二份封单指向医院设备。',
          visible_line_role: '明线：主角查设备间故障。',
          hidden_line_seed: '暗线：协会会长提前篡改封单。',
          ab_weave_role: 'B线拉出矛盾：规则封门；A线升级线等待故障证据回报。',
        },
      ],
    })

    expect(sceneCards[0].conflict_ladder_step).toContain('行动阻拦')
    expect(sceneCards[0].motivation_source).toContain('世界背景')
    expect(sceneCards[0].opposing_force).toContain('协会执事')
    expect(sceneCards[0].blocked_desire).toContain('进入设备间')
    expect(sceneCards[0].protagonist_agency_action).toContain('做别人不敢做')
    expect(sceneCards[0].no_exit_reason).toContain('非踏入不可')
    expect(sceneCards[0].event_value_change).toContain('临时开放')
    expect(sceneCards[0].next_conflict_seed).toContain('第二份封单')
    expect(sceneCards[0].visible_line_role).toContain('明线')
    expect(sceneCards[0].hidden_line_seed).toContain('暗线')
    expect(sceneCards[0].ab_weave_role).toContain('B线拉出矛盾')
  })

  test('asks scene-card generation to split showdown contracts into public payoff and combat presets', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const promptBlock = readSceneCardsPromptSource()
    const proseStart = source.indexOf('const buildParagraphProseContext =')
    const proseEnd = source.indexOf('const reviewPrompt', proseStart)
    const proseBlock = source.slice(proseStart, proseEnd)

    expect(promptBlock).toContain('chapter_target.showdown_contract')
    expect(promptBlock).toContain('showoff_stage_chain')
    expect(promptBlock).toContain('spectator_interest_shift')
    expect(promptBlock).toContain('secondary_showoff_effect')
    expect(promptBlock).toContain('combat_result_type')
    expect(promptBlock).toContain('combat_dimension_plan')
    expect(promptBlock).toContain('combat_reversal_plan')
    expect(promptBlock).toContain('群众层 -> 中间层 -> 核心层')
    expect(promptBlock).toContain('这跟我有关系')
    expect(promptBlock).toContain('碾压 / 以弱胜强 / 逃走进入第二阶段')
    expect(promptBlock).toContain('心/体/技')
    expect(proseBlock).toContain('scene_cards.showoff_stage_chain')
    expect(proseBlock).toContain('scene_cards.spectator_interest_shift')
    expect(proseBlock).toContain('scene_cards.secondary_showoff_effect')
    expect(proseBlock).toContain('scene_cards.combat_result_type')
    expect(proseBlock).toContain('scene_cards.combat_dimension_plan')
    expect(proseBlock).toContain('scene_cards.combat_reversal_plan')
  })

  test('asks scene-card generation to split conflict-structure contracts into per-scene execution fields', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const promptBlock = readSceneCardsPromptSource()
    const proseStart = source.indexOf('const buildParagraphProseContext =')
    const proseEnd = source.indexOf('const reviewPrompt', proseStart)
    const proseBlock = source.slice(proseStart, proseEnd)

    expect(promptBlock).toContain('chapter_target.conflict_structure_contract')
    expect(promptBlock).toContain('conflict_ladder_step')
    expect(promptBlock).toContain('motivation_source')
    expect(promptBlock).toContain('opposing_force')
    expect(promptBlock).toContain('blocked_desire')
    expect(promptBlock).toContain('protagonist_agency_action')
    expect(promptBlock).toContain('no_exit_reason')
    expect(promptBlock).toContain('event_value_change')
    expect(promptBlock).toContain('next_conflict_seed')
    expect(promptBlock).toContain('visible_line_role')
    expect(promptBlock).toContain('hidden_line_seed')
    expect(promptBlock).toContain('ab_weave_role')
    expect(promptBlock).toContain('有人阻止主角得到他想要的东西')
    expect(promptBlock).toContain('第一幕陷阱')
    expect(promptBlock).toContain('明线')
    expect(promptBlock).toContain('暗线')
    expect(promptBlock).toContain('A线')
    expect(promptBlock).toContain('B线')
    expect(proseBlock).toContain('scene_cards.conflict_ladder_step')
    expect(proseBlock).toContain('scene_cards.visible_line_role')
    expect(proseBlock).toContain('scene_cards.ab_weave_role')
  })

  test('maps delivery-risk carry-over into normalized scene cards before prose execution', () => {
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧账压门',
          purpose: '主角带着账册入场',
          beat: '主角抵达审判厅',
        },
        {
          title: '证据翻面',
          purpose: '主角逼执事回应证据',
          conflict: '执事拒认旧账',
          beat: '主角公开账册缺页',
        },
        {
          title: '新名单落地',
          purpose: '用名单留下下一章追问',
          beat: '第三个名字出现',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          opening_actions: ['前300字先让旧账压迫重新逼近主角'],
          middle_actions: ['中段用新证据推动目标并改变盟友立场'],
          ending_actions: ['章末抛出第三个名字作为追读钩子'],
          forbidden_repeats: ['不要再用旁白宣布风险已修复'],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain('前300字先让旧账压迫重新逼近主角')
    expect(sceneCards[0].serial_risk_repairs).toContain('delivery_risk_carry_over')
    expect(sceneCards[0].recent_fatigue_action).toContain('前300字先让旧账压迫重新逼近主角')
    expect(sceneCards[1].state_changes_expected).toContain('中段用新证据推动目标并改变盟友立场')
    expect(sceneCards[1].serial_risk_repairs).toContain('质量续航')
    expect(sceneCards[2].ending_hook_seed).toContain('章末抛出第三个名字作为追读钩子')
    expect(sceneCards[2].required_beats).toContain('章末抛出第三个名字作为追读钩子')
    expect(sceneCards[2].serial_risk_repairs).toContain('不要再用旁白宣布风险已修复')
  })

  test('keeps sync-risk diagnostic noise out of scene-card core drama fields', () => {
    const noisyRisk = '主角要同时保住身份、线索和身边人的安全。；同步风险开篇承接：前300字先回应 story_drive_sync 的上一章缺口，把它转成当前场景目标、阻碍、证据或状态压力；本章目标：本章目标未充分兑现：江哲不再被动逃避；同步风险中段兑现：中段必须按 character_state_delta_sync 的 missed/next_actions 写出可见行动；同步风险中段兑现：中段必须按 chapter_handoff_delta_syn...；换地图承接：换地图/换阶段没有完成旧地图收束；章末追读：敌人没有退走，而是换了更高权限的人来；开篇钩子：每章前300字必须接住上一章状态；下一次修订优先补足 reader_fuel_missed，避免章节只完成事件但不服务长期追读。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [{
        title: '镇门封锁',
        purpose: '封锁令压到主角门前',
        conflict: noisyRisk,
        obstacle: noisyRisk,
        opposing_force: noisyRisk,
        no_exit_reason: `否则${noisyRisk}`,
        reader_payoff: noisyRisk,
        turning_point: noisyRisk,
        exit_state: noisyRisk,
        state_changes_expected: [noisyRisk],
        event_value_change: '确认同步风险开篇承接：前300字先回应 story_loop_sync 的上一章缺口，把它转成当前场景目标；换地图承接：换地图/换阶段没有完成旧地图收束；开篇钩子：每章前300字必须接住上一章状态。',
      }],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          opening_actions: ['前300字让封锁令压到门前'],
          middle_actions: ['中段让线索代价可见'],
          ending_actions: ['章尾抛出诱捕钩子'],
        },
      },
    })

    const coreText = [
      sceneCards[0].conflict,
      sceneCards[0].obstacle,
      sceneCards[0].opposing_force,
      sceneCards[0].no_exit_reason,
      sceneCards[0].reader_payoff,
      sceneCards[0].turning_point,
      sceneCards[0].event_value_change,
      sceneCards[0].exit_state,
      ...(sceneCards[0].state_changes_expected || []),
    ].join('；')
    expect(sceneCards[0].conflict).toBe('主角要同时保住身份、线索和身边人的安全。')
    expect(coreText).not.toContain('同步风险')
    expect(coreText).not.toContain('_sync')
    expect(coreText).not.toContain('_syn')
    expect(coreText).not.toContain('换地图承接')
    expect(coreText).not.toContain('开篇钩子')
    expect(coreText).not.toContain('章末追读')
    expect(coreText).not.toContain('下一次修订')
    expect(sceneCards[0].required_beats).toContain('前300字让封锁令压到门前')
    expect(sceneCards[0].serial_risk_repairs).toContain('delivery_risk_carry_over')
  })

  test('keeps engineering repair diagnostics out of prose-driving scene card fields', () => {
    const noisyOpening = '同步风险开篇承接：前300字先回应 story_loop_sync 的上一章缺口；开篇钩子：每章前300字必须接住上一章状态；吸引力中段修复：中段必须把吸引力缺口写成目标、阻碍、转折、回报或可复述场面；章末追读：敌人没有退走，而是换了更高权限的人来。'
    const noisySetting = '同步风险中段兑现：中段必须按 asset_state_delta_sync 的 missed/next_actions 写出可见行动；诡序之主：通过不断降临怪谈副本，彻底蚕食蓝星人类的理智。'
    const noisySettingRepair = '修复：不要重写全设定表；只处理本章计划触达且正文实际改变的关键资产。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [{
        title: '镇门封锁',
        purpose_tag: noisyOpening,
        purpose_tags: [noisyOpening, '关键揭露'],
        conflict: `主角要同时保住身份、线索和身边人的安全。；${noisySetting}`,
        event_value_change: `确认吸引力中段修复：中段必须把吸引力缺口写成目标、阻碍、转折、回报或可复述场面；江哲：主角`,
        opening_hook: noisyOpening,
        transition_from_previous: noisyOpening,
        information_gap: noisyOpening,
        ending_hook_seed: noisyOpening,
        emotional_tone: noisySetting,
        dialogue_goals: [noisyOpening, '逼出门禁规则'],
        style_directives: [noisySettingRepair, '短句落点'],
        used_settings: [noisySetting, noisySettingRepair, '镇门封条：贴上后会触发门禁怪谈'],
        revealed_settings: [noisySetting, noisySettingRepair],
        state_changes_expected: [noisyOpening, noisySettingRepair, '江哲公开承认掌握门禁规则'],
      }],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          opening_actions: ['前300字让封锁令压到门前'],
        },
      },
    })

    const proseDrivingText = [
      sceneCards[0].purpose_tag,
      ...(sceneCards[0].purpose_tags || []),
      sceneCards[0].conflict,
      sceneCards[0].event_value_change,
      sceneCards[0].opening_hook,
      sceneCards[0].transition_from_previous,
      sceneCards[0].information_gap,
      sceneCards[0].ending_hook_seed,
      sceneCards[0].emotional_tone,
      ...(sceneCards[0].dialogue_goals || []),
      ...(sceneCards[0].style_directives || []),
      ...(sceneCards[0].used_settings || []),
      ...(sceneCards[0].revealed_settings || []),
      ...(sceneCards[0].state_changes_expected || []),
    ].join('；')

    expect(sceneCards[0].purpose_tag).toBe('关键揭露')
    expect(sceneCards[0].purpose_tags).toEqual(['关键揭露'])
    expect(sceneCards[0].conflict).toBe('主角要同时保住身份、线索和身边人的安全。')
    expect(sceneCards[0].event_value_change).toBe('')
    expect(sceneCards[0].opening_hook).toBe('前300字让封锁令压到门前')
    expect(sceneCards[0].transition_from_previous).toBe('')
    expect(sceneCards[0].information_gap).toBe('')
    expect(sceneCards[0].ending_hook_seed).toBe('')
    expect(sceneCards[0].emotional_tone).toBe('')
    expect(sceneCards[0].dialogue_goals).toEqual(['逼出门禁规则'])
    expect(sceneCards[0].style_directives).toEqual(['短句落点'])
    expect(sceneCards[0].used_settings).toEqual(['镇门封条：贴上后会触发门禁怪谈'])
    expect(sceneCards[0].revealed_settings).toEqual([])
    expect(sceneCards[0].state_changes_expected).toEqual(['江哲公开承认掌握门禁规则'])
    expect(proseDrivingText).not.toContain('同步风险')
    expect(proseDrivingText).not.toContain('_sync')
    expect(proseDrivingText).not.toContain('missed')
    expect(proseDrivingText).not.toContain('吸引力中段修复')
    expect(proseDrivingText).not.toContain('不要重写全设定表')
    expect(proseDrivingText).not.toContain('开篇钩子')
    expect(proseDrivingText).not.toContain('章末追读')
    expect(sceneCards[0].required_beats).toContain('前300字让封锁令压到门前')
  })

  test('strips delivery-risk diagnostics from story-facing carry-over scene-card arrays', () => {
    const diagnosticOpening = '同步风险开篇承接：前300字先回应 story_loop_sync 的上一章缺口，把它转成当前场景目标、阻碍、证据或状态压力。'
    const diagnosticMiddle = '同步风险中段兑现：中段必须按 character_state_delta_sync 的 missed/next_actions 写出可见行动。'
    const diagnosticEnding = '吸引力章尾修复：章末必须补足 delivery_risk_receipts/revision_receipts 的 remaining_risk。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '镇门封锁',
          purpose: '主角在镇门前确认封条异常',
          beat: '封条亮起，守门人退后。',
        },
        {
          title: '证据转向',
          purpose: '主角用旧账册逼出门禁规则',
          beat: '账册缺页和封条编号对上。',
        },
        {
          title: '危局留钩',
          purpose: '更高权限的镇门人现身',
          beat: '新令牌压住旧账册。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          opening_actions: [diagnosticOpening, '前300字让封锁令压到镇门，逼主角当场验封条'],
          middle_actions: [diagnosticMiddle, '中段用账册缺页改变守门人的立场'],
          ending_actions: [diagnosticEnding, '章末让更高权限的镇门人带新令牌入场'],
          required_actions: [
            diagnosticMiddle,
            '状态变化：主角从被拦在门外，变成掌握封条编号的主动追问者',
          ],
        },
      },
    })

    const snapshot = buildProsePromptContextSnapshot({
      chapter_target: {
        scene_cards: sceneCards,
      },
    })
    const promptSceneCards = snapshot.chapter_target.scene_cards || []
    const storyFacingText = promptSceneCards.map((card: any) => [
      ...(card.required_beats || []),
      ...(card.action_beats || []),
      ...(card.required_information || []),
      ...(card.state_changes_expected || []),
      card.recent_fatigue_action,
      card.opening_hook,
      card.ending_hook_seed,
    ].filter(Boolean).join('；')).join('；')

    expect(storyFacingText).toContain('前300字让封锁令压到镇门')
    expect(storyFacingText).toContain('中段用账册缺页改变守门人的立场')
    expect(storyFacingText).toContain('章末让更高权限的镇门人带新令牌入场')
    expect(storyFacingText).not.toContain('同步风险')
    expect(storyFacingText).not.toContain('_sync')
    expect(storyFacingText).not.toContain('missed')
    expect(storyFacingText).not.toContain('next_actions')
    expect(storyFacingText).not.toContain('delivery_risk_receipts')
    expect(storyFacingText).not.toContain('revision_receipts')
    expect(storyFacingText).not.toContain('吸引力章尾修复')
  })

  test('projects style-fingerprint carry-over into scene style directives', () => {
    const styleRepair = '优先按文风指纹/文风.md 目标句长带合并逗号碎句，恢复中长句呼吸，不要模仿可能已漂移的上一章句式节奏。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '雨巷开门',
          purpose: '承接上一章审讯余波',
          beat: '李玄带着旧账进入雨巷。',
        },
        {
          title: '账册复核',
          purpose: '复核旧账证据',
          beat: '第二个证人确认旧账缺页。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [styleRepair],
          evidence: ['目标句长 18-36 字；短片段 12/18；平均片段 6 字'],
        },
      },
    })

    expect(sceneCards[0].style_directives).toContain(styleRepair)
    expect(sceneCards[1].style_directives).toContain(styleRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('文风指纹')
    expect(sceneCards[1].serial_risk_repairs).toContain('文风指纹')
  })

  test('projects story-state style fingerprint sentence band into scene style directives', () => {
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '雨巷开门',
          purpose: '承接上一章审讯余波',
          beat: '李玄带着旧账进入雨巷。',
        },
        {
          title: '账册复核',
          purpose: '复核旧账证据',
          beat: '第二个证人确认旧账缺页。',
        },
      ],
    }, {
      story_state: {
        style_fingerprint: '文风指纹：目标句长带 18-36 字，允许半拍停顿，但整体保持中长句呼吸。',
      },
    })

    expect(sceneCards[0].style_directives.join('｜')).toContain('目标句长带 18-36 字')
    expect(sceneCards[1].style_directives.join('｜')).toContain('按文风指纹/文风.md')
    expect(sceneCards[0].style_directives.join('｜')).toContain('不要模仿可能已漂移的上一章句式节奏')
    expect(sceneCards[0].serial_risk_repairs).toContain('文风指纹')
  })

  test('builds a durable story-state style fingerprint snapshot from the target sentence band', () => {
    const snapshot = buildStyleFingerprintStateSnapshot({
      chapter_target: {
        style_sample_strategy: {
          style_profile_summary: '文风指纹：目标句长带 18-36 字，允许半拍停顿，但整体保持中长句呼吸。',
        },
      },
    })

    expect(snapshot?.style_fingerprint).toContain('目标句长带 18-36 字')
    expect(snapshot?.style_fingerprint_contract?.target_sentence_band).toBe('18-36字')
    expect(snapshot?.style_fingerprint_contract?.policy).toContain('不以可能已漂移的上一章句式节奏为准')
  })

  test('keeps an existing story-state style fingerprint instead of overwriting it', () => {
    const snapshot = buildStyleFingerprintStateSnapshot({
      chapter_target: {
        style_sample_strategy: {
          style_profile_summary: '文风指纹：目标句长带 18-36 字。',
        },
      },
    }, {}, {
      style_fingerprint: '文风指纹：目标句长带 20-42 字，旧上下文已锁定。',
    })

    expect(snapshot?.style_fingerprint).toContain('20-42 字')
    expect(snapshot?.style_fingerprint).not.toContain('18-36 字')
    expect(snapshot?.style_fingerprint_contract?.source).toBe('existing_story_state')
  })

  test('projects dialogue carry-over into scene dialogue goals', () => {
    const dialogueRepair = '按 oh-story dialogue-mastery 修复：删说明书式对白和问答式一问一答；信息型配角不能当科普嘴；高压/生死/悲痛 beat 中轻快声线让位；每句对白必须回应上一句情绪。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '证人开口',
          purpose: '让第二个证人交代旧账来源',
          beat: '证人被执事逼问时说漏证据来源。',
        },
        {
          title: '执事抢话',
          purpose: '让执事暴露真实立场',
          beat: '执事试图用长段解释压过证人。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [dialogueRepair],
        },
      },
    })

    expect(sceneCards[0].dialogue_goals).toContain(dialogueRepair)
    expect(sceneCards[1].dialogue_goals).toContain(dialogueRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('对白质量')
    expect(sceneCards[1].serial_risk_repairs).toContain('对白质量')
  })

  test('projects new-concept carry-over into scene concept anchor rules', () => {
    const conceptRepair = '给新名词/新设定补当下作用锚点：用角色动作反应、对话半句或物理后果带出功能；删掉整段来历、原理和等级说明。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '蓝晶入手',
          purpose: '让蓝晶第一次改变证据判断',
          beat: '李玄从旧匣里取出蓝晶。',
        },
        {
          title: '记忆碎片',
          purpose: '让蓝晶触发证人记忆',
          beat: '证人碰到蓝晶后看见缺页当晚。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [conceptRepair],
        },
      },
    })

    expect(sceneCards[0].concept_anchor_rules).toContain(conceptRepair)
    expect(sceneCards[1].concept_anchor_rules).toContain(conceptRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('新概念锚点')
    expect(sceneCards[1].serial_risk_repairs).toContain('新概念锚点')
  })

  test('projects explicit first-appearance setting usage into scene concept anchor rules', () => {
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '蓝晶入手',
          purpose: '让蓝晶第一次改变证据判断',
          beat: '李玄从旧匣里取出蓝晶。',
        },
        {
          title: '账册复核',
          purpose: '复核旧账证据',
          beat: '第二个证人确认旧账缺页。',
        },
      ],
    }, {
      setting_context: {
        chapter_usage: [
          {
            name: '蓝晶',
            entity_type: 'item',
            new_concept: true,
          },
        ],
      },
    })

    expect(sceneCards[0].concept_anchor_rules.join('｜')).toContain('“蓝晶”首次出现')
    expect(sceneCards[0].concept_anchor_rules.join('｜')).toContain('动作反应、对话半句或物理后果')
    expect(sceneCards[0].serial_risk_repairs).toContain('新概念锚点')
    expect(sceneCards[1].concept_anchor_rules.join('｜')).not.toContain('蓝晶')
  })

  test('projects benchmark recall carry-over into scene benchmark directives', () => {
    const benchmarkRepair = '下一章必须补足文风召回 missed 项，把节奏参照和匹配章技法写成正文可见的压迫、爆发、冷却或反应；只学习节奏，不复制桥段。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '三轮压问',
          purpose: '按对标节奏压出证人反应',
          beat: '执事连续压问，李玄晚半拍亮出旧印章。',
        },
        {
          title: '旁观分裂',
          purpose: '让旁观者差异化反应放大信息差',
          beat: '弟子分成怀疑、倒戈、沉默三组。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [benchmarkRepair],
        },
      },
    })

    expect(sceneCards[0].benchmark_recall_directives).toContain(benchmarkRepair)
    expect(sceneCards[1].benchmark_recall_directives).toContain(benchmarkRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('文风召回')
    expect(sceneCards[1].serial_risk_repairs).toContain('文风召回')
  })

  test('projects prose craft carry-over into scene prose craft directives', () => {
    const proseCraftRepair = '下一章必须补正文工艺：坚持深度限知，用身体细节替代抽象情绪，把道具/数字写成剧情功能，删掉上帝视角和无交互环境。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧名单复核',
          purpose: '让旧名单改变证据判断',
          beat: '沈砚按住旧名单，呼吸停了一拍。',
        },
        {
          title: '签收印反证',
          purpose: '把签收印写成剧情功能',
          beat: '签收印编号对上仓库暗格。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [proseCraftRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(proseCraftRepair)
    expect(sceneCards[1].prose_craft_directives).toContain(proseCraftRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('正文工艺')
    expect(sceneCards[1].serial_risk_repairs).toContain('正文工艺')
  })

  test('projects quality-audit carry-over into scene prose craft directives', () => {
    const qualityAuditRepair = '下一章必须补质量诊断：先证明本章不可删除，事件内容比重不能小于一半，让信息跟冲突走，删掉水文复述。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '第三个证人',
          purpose: '让第三个证人改变账本局势',
          beat: '沈砚赶到祠堂，第三个证人被反派封口。',
        },
        {
          title: '地砖账本',
          purpose: '让账本原件产生不可逆证据变化',
          beat: '地砖下露出账本原件，祠堂长老改变态度。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [qualityAuditRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(qualityAuditRepair)
    expect(sceneCards[1].prose_craft_directives).toContain(qualityAuditRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('质量诊断')
    expect(sceneCards[1].serial_risk_repairs).toContain('质量诊断')
  })

  test('projects asset-linkage carry-over into scene setting fields', () => {
    const assetRepair = '下一章必须补资产挂钩：旧钥匙要触发暗格并留下锁死代价，禁门规则要逼出账本原件位置。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧钥匙开缝',
          purpose: '让旧钥匙改变追查路径',
          beat: '李玄把旧钥匙压进地砖缝。',
        },
        {
          title: '禁门锁死',
          purpose: '让禁门规则制造阻碍',
          beat: '暗格打开后三息，禁门开始锁死。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [assetRepair],
        },
      },
    })

    expect(sceneCards[0].used_settings).toContain(assetRepair)
    expect(sceneCards[1].used_settings).toContain(assetRepair)
    expect(sceneCards[0].revealed_settings).toContain(assetRepair)
    expect(sceneCards[1].revealed_settings).toContain(assetRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('资产挂钩')
    expect(sceneCards[1].serial_risk_repairs).toContain('资产挂钩')
  })

  test('projects asset-intake carry-over into scene asset confirmation fields', () => {
    const assetIntakeRepair = '下一章必须确认新资产入库：asset_intake 待确认“青铜回声盘”，类型 item，summary 是能记录禁库门响三次；本章要先给正文证据，再决定归属、可见性和后续状态，不允许只把新资产留在设定表。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '回声盘入场',
          purpose: '让新资产先有正文证据',
          beat: '李玄把青铜回声盘放到禁库门前。',
        },
        {
          title: '三次门响',
          purpose: '确认新资产功能和归属',
          beat: '回声盘记下三次门响，归入李玄手中。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [assetIntakeRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(assetIntakeRepair)
    expect(sceneCards[0].used_settings).toContain(assetIntakeRepair)
    expect(sceneCards[1].revealed_settings).toContain(assetIntakeRepair)
    expect(sceneCards[1].state_changes_expected).toContain(assetIntakeRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('新资产入库')
    expect(sceneCards[1].serial_risk_repairs).toContain('新资产入库')
  })

  test('projects ip-scene-intake carry-over into visual scene fields', () => {
    const ipSceneRepair = '下一章必须延展 IP场面：ip_scene_intake 待延展“禁库门三响”，visualHook 是青铜盘贴门后三圈回声同时反亮，adaptationValue 是可做封面和短视频传播点；本章要把强画面写成可见动作链和读者能复述的场面。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '青铜盘贴门',
          purpose: '让强画面先入场',
          beat: '李玄把青铜盘贴上禁库门。',
        },
        {
          title: '三圈反亮',
          purpose: '把传播点写成现场动作',
          beat: '三圈回声同时反亮，门缝里吐出旧编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [ipSceneRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(ipSceneRepair)
    expect(sceneCards[0].required_beats).toContain(ipSceneRepair)
    expect(sceneCards[1].action_beats).toContain(ipSceneRepair)
    expect(sceneCards[1].sensory_anchor).toContain(ipSceneRepair)
    expect(sceneCards[1].reader_payoff).toContain(ipSceneRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('IP场面延展')
    expect(sceneCards[1].serial_risk_repairs).toContain('IP场面延展')
  })

  test('projects state-tracking carry-over into scene state changes', () => {
    const stateRepair = '下一章必须补状态跟踪：李玄仍受左臂旧伤和残阵三息限制，禁门三息锁死规则必须继续生效。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '暗格三息',
          purpose: '让三息限制改变取证动作',
          beat: '李玄左臂发麻，只能用三息撬开暗格。',
        },
        {
          title: '禁门锁死',
          purpose: '让禁门规则造成局势变化',
          beat: '三息一过，禁门锁死半边通道。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [stateRepair],
        },
      },
    })

    expect(sceneCards[0].state_changes_expected).toContain(stateRepair)
    expect(sceneCards[1].state_changes_expected).toContain(stateRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('状态跟踪')
    expect(sceneCards[1].serial_risk_repairs).toContain('状态跟踪')
  })

  test('projects status-filter carry-over into scene state filter fields', () => {
    const statusFilterRepair = '下一章必须修状态筛选：status_filter_receipts 缺少 used_in_chapter、excluded_reason 和 source_requirements；filter_rules 要说明哪些上章状态会影响本章正确性，哪些上下文过载必须排除。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '筛掉旧噪音',
          purpose: '只保留会写错的上章状态',
          beat: '李玄只拿出会影响禁库判断的半印记录。',
        },
        {
          title: '状态生效',
          purpose: '让筛选后的状态改变现场选择',
          beat: '他放弃无关传闻，改查禁库权限来源。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [statusFilterRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(statusFilterRepair)
    expect(sceneCards[1].state_changes_expected).toContain(statusFilterRepair)
    expect(sceneCards[0].used_settings).toContain(statusFilterRepair)
    expect(sceneCards[0].transition_from_previous).toContain(statusFilterRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('状态筛选')
    expect(sceneCards[1].serial_risk_repairs).toContain('状态筛选')
  })

  test('projects information-flow carry-over into scene required information', () => {
    const informationRepair = '下一章必须补足信息流：信息随冲突释放，按揭示顺序递进，先让执事压旧账册，再让证人改口，最后亮旧印章，删背景说明书。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧账压问',
          purpose: '让执事先压旧账册',
          beat: '执事把旧账册推到李玄面前。',
        },
        {
          title: '证人改口',
          purpose: '让证人改口后再亮旧印章',
          beat: '证人看见旧印章裂纹后改口。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [informationRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(informationRepair)
    expect(sceneCards[1].required_information).toContain(informationRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('信息流')
    expect(sceneCards[1].serial_risk_repairs).toContain('信息流')
  })

  test('projects expectation and chapter-hook carry-over into scene hook fields', () => {
    const expectationRepair = '下一章必须补期待阈值：恢复两长一短，先立下一开环，再兑现旧期待。'
    const hookRepair = '下一章必须补章级钩子：前100字先给冲突、异常或对话逼问，最后100字留下下一章必须处理的问题。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '证人现身',
          purpose: '先立下一开环',
          beat: '第二个证人被押进审判庭。',
        },
        {
          title: '第三个名字',
          purpose: '把旧期待转成新问题',
          beat: '证人说出第三个名字。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [expectationRepair, hookRepair],
        },
      },
    })

    expect(sceneCards[0].information_gap).toContain(expectationRepair)
    expect(sceneCards[1].information_gap).toContain(expectationRepair)
    expect(sceneCards[0].opening_hook).toContain(hookRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(hookRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('期待/钩子')
    expect(sceneCards[1].serial_risk_repairs).toContain('期待/钩子')
  })

  test('projects chapter-hook-quality carry-over into scene executable hook beats', () => {
    const hookQualityRepair = '下一章必须补 chapter_hook_quality_checks：章首 hook_position=opening，trigger_type 需要现场异常或危险选择；章尾必须留下 concrete_question、danger_or_choice 和 next_action_link，不能再用低风险空钩子。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '门缝异响',
          purpose: '用现场异常触发章首钩子',
          beat: '门缝里响起第二个人的呼吸。',
        },
        {
          title: '编号追问',
          purpose: '章尾留下下一章行动压力',
          beat: '残页编号指向明早必须去的禁库。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [hookQualityRepair],
        },
      },
    })

    expect(sceneCards[0].opening_hook).toContain(hookQualityRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(hookQualityRepair)
    expect(sceneCards[0].required_beats).toContain(hookQualityRepair)
    expect(sceneCards[1].required_beats).toContain(hookQualityRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(hookQualityRepair)
    expect(sceneCards[1].reader_payoff).toContain(hookQualityRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('章钩质量')
    expect(sceneCards[1].serial_risk_repairs).toContain('章钩质量')
  })

  test('projects suspense carry-over into scene information gaps', () => {
    const suspenseRepair = '下一章必须补悬念编排：先提出疑问，再给可信提示或误导，最后公布答案并立起新期待。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧印疑问',
          purpose: '先提出旧印章背面名字的疑问',
          beat: '李玄看见旧印章背面的半个名字。',
        },
        {
          title: '证人误导',
          purpose: '让证人给出可信误导',
          beat: '证人只承认见过账册缺页。',
        },
        {
          title: '第三个人',
          purpose: '公布答案并立起新期待',
          beat: '证人说旧案当晚还有第三个人。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [suspenseRepair],
        },
      },
    })

    expect(sceneCards[0].information_gap).toContain(suspenseRepair)
    expect(sceneCards[1].information_gap).toContain(suspenseRepair)
    expect(sceneCards[2].information_gap).toContain(suspenseRepair)
    expect(sceneCards[0].required_information).toContain(suspenseRepair)
    expect(sceneCards[1].required_information).toContain(suspenseRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(suspenseRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('悬念编排')
    expect(sceneCards[2].serial_risk_repairs).toContain('悬念编排')
  })

  test('projects reversal carry-over into scene reversal and payoff fields', () => {
    const reversalRepair = '下一章必须补反转设计：补足3处暗示、公平误导、揭示后影响和打脸节奏。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '暗示一',
          purpose: '先补第一处公平暗示',
          beat: '李玄注意到账册缺页边角的旧印。',
        },
        {
          title: '误导证词',
          purpose: '让证词形成可信误导',
          beat: '证人把矛头指向账房。',
        },
        {
          title: '身份翻面',
          purpose: '揭示执事身份并改变审判局势',
          beat: '旧印编号证明真正调账的是执事。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [reversalRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(reversalRepair)
    expect(sceneCards[1].required_beats).toContain(reversalRepair)
    expect(sceneCards[2].reversal).toContain(reversalRepair)
    expect(sceneCards[2].reader_payoff).toContain(reversalRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('反转设计')
    expect(sceneCards[2].serial_risk_repairs).toContain('反转设计')
  })

  test('does not project reversal fair-misdirection carry-over as suspense', () => {
    const reversalRepair = '下一章必须补反转设计：补足3处暗示、公平误导、揭示后影响和打脸节奏。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '暗示落点',
          purpose: '补反转前的公平暗示',
          beat: '李玄发现旧印编号能反证执事。',
        },
        {
          title: '反转兑现',
          purpose: '让揭示后影响改变局势',
          beat: '执事身份揭开后，审判席改口。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [reversalRepair],
        },
      },
    })

    expect(sceneCards[0].serial_risk_repairs).toContain('反转设计')
    expect(sceneCards[0].serial_risk_repairs).not.toContain('悬念编排')
    expect(sceneCards[1].serial_risk_repairs).not.toContain('悬念编排')
    expect(sceneCards[0].information_gap).not.toContain(reversalRepair)
    expect(sceneCards[1].information_gap).not.toContain(reversalRepair)
  })

  test('projects showdown carry-over into scene action and payoff fields', () => {
    const showdownRepair = '下一章必须补高潮对抗：补舞台层级、震惊分层、底牌压制和急-缓-急情绪节奏。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '阵台重压',
          purpose: '让群众层先感到阵台压迫',
          beat: '执事残党逼李玄复盘阵盘依据。',
        },
        {
          title: '核心层追问',
          purpose: '让核心层追问底牌来源',
          beat: '长老席要求李玄当众重演阵盘残纹。',
        },
        {
          title: '底牌压制',
          purpose: '用底牌压制完成高潮余波',
          beat: '李玄重演残纹，执事残党当场失声。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [showdownRepair],
        },
      },
    })

    expect(sceneCards[0].action_beats).toContain(showdownRepair)
    expect(sceneCards[1].action_beats).toContain(showdownRepair)
    expect(sceneCards[2].reader_payoff).toContain(showdownRepair)
    expect(sceneCards[2].turning_point).toContain(showdownRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('高潮对抗')
    expect(sceneCards[2].serial_risk_repairs).toContain('高潮对抗')
  })

  test('projects bridge-unit carry-over into scene expectation and handoff fields', () => {
    const bridgeRepair = '下一章必须补桥段节奏：补连续期待、章尾新目标、高潮中埋钩子和承接余波。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '会审余波',
          purpose: '承接上一章旧账本兑现后的余波',
          beat: '李玄带着旧账本离开会审厅。',
        },
        {
          title: '投资人目标',
          purpose: '把旧账本胜利转成新投资人目标',
          beat: '林青禾指出投资人签字才是下一步门槛。',
        },
        {
          title: '三日名单',
          purpose: '章尾挂出第二份旧城名单目标',
          beat: '投资人要求三日内拿出第二份旧城名单。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [bridgeRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(bridgeRepair)
    expect(sceneCards[1].information_gap).toContain(bridgeRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(bridgeRepair)
    expect(sceneCards[0].transition_from_previous).toContain(bridgeRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('桥段节奏')
    expect(sceneCards[2].serial_risk_repairs).toContain('桥段节奏')
  })

  test('projects beat-cooling carry-over into scene pacing fields', () => {
    const beatCoolingRepair = '下一章优先轮换桥段类型：大冲突后补关系深化、世界观展开、势力建设或冲突余波。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '会审后街',
          purpose: '从上一章会审大冲突切到关系余波',
          beat: '林青禾拦住李玄，提醒他别继续硬打。',
        },
        {
          title: '旧城街巷',
          purpose: '借旧城制度展开世界观',
          beat: '税契墙上贴着旧城势力分布。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [beatCoolingRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(beatCoolingRepair)
    expect(sceneCards[1].purpose_tags).not.toContain(beatCoolingRepair)
    expect(sceneCards[0].required_beats).toContain(beatCoolingRepair)
    expect(sceneCards[0].transition_from_previous).toContain(beatCoolingRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('节奏冷却')
    expect(sceneCards[1].serial_risk_repairs).toContain('节奏冷却')
  })

  test('projects plot-dynamics carry-over into scene goal obstacle and feedback fields', () => {
    const plotDynamicsRepair = '下一章必须补剧情动力：先给账本编号目标和协会阻碍，再写主角行动、代价反馈和新的章末期待。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '编号目标',
          purpose: '李玄确认账本编号目标',
          beat: '李玄在旧账边角找到医院设备编号。',
        },
        {
          title: '协会阻碍',
          purpose: '协会会长压住编号核验',
          beat: '协会会长宣布没有授权不得核验。',
        },
        {
          title: '代价反馈',
          purpose: '主角行动后付出代价并留下新期待',
          beat: '李玄强行验印，左臂旧伤复发。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [plotDynamicsRepair],
        },
      },
    })

    expect(sceneCards[0].action_beats).toContain(plotDynamicsRepair)
    expect(sceneCards[1].conflict).toContain(plotDynamicsRepair)
    expect(sceneCards[2].state_changes_expected).toContain(plotDynamicsRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(plotDynamicsRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('剧情动力')
    expect(sceneCards[2].serial_risk_repairs).toContain('剧情动力')
  })

  test('projects character-relation carry-over into scene relationship action fields', () => {
    const relationRepair = '下一章必须补角色关系：明确合作互信但仍有边界，让林青禾带着洗清代签责任的独立目标主动作证。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '共同证词',
          purpose: '林青禾主动提出作证',
          beat: '林青禾把代签责任写进证词。',
          character_voice: '林青禾说话克制，没有替李玄包揽风险。',
        },
        {
          title: '边界互信',
          purpose: '合作互信但保留边界',
          beat: '李玄接受证词，但不让她替自己承担审判。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [relationRepair],
        },
      },
    })

    expect(sceneCards[0].action_beats).toContain(relationRepair)
    expect(sceneCards[1].action_beats).toContain(relationRepair)
    expect(sceneCards[0].character_voice).toContain(relationRepair)
    expect(sceneCards[1].state_changes_expected).toContain(relationRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('角色关系')
    expect(sceneCards[1].serial_risk_repairs).toContain('角色关系')
  })

  test('projects character-relation carry-over into staged relationship progression fields', () => {
    const relationRepair = '下一章必须补角色关系：维持配角攻略缓冲区，林青禾从旁观/质疑转为主动协助，主角解决追责后回到她这里开启下一轮账册任务。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '仍有信息差',
          purpose: '保留互信但仍有边界',
          beat: '林青禾只交出半页账册，不说钥匙来源。',
        },
        {
          title: '主动作证',
          purpose: '让配角带着自己的目标行动',
          beat: '林青禾为了洗清代签责任主动拿出证词。',
        },
        {
          title: '下一轮任务',
          purpose: '主角回到林青禾这里承接新任务',
          beat: '追责结束后，她递出新账册编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [relationRepair],
        },
      },
    })

    expect(sceneCards[0].relationship_progression_plan).toContain('关系类型/边界')
    expect(sceneCards[0].relationship_buffer_zone).toContain('信息差')
    expect(sceneCards[1].supporting_character_action).toContain('配角主动行动')
    expect(sceneCards[1].attitude_shift_checkpoint).toContain('旁观/质疑')
    expect(sceneCards[2].relationship_next_hook).toContain('下一轮')
    expect(sceneCards[2].state_changes_expected).toContain(relationRepair)
    expect(sceneCards[2].serial_risk_repairs).toContain('角色关系')
  })

  test('projects story-loop carry-over into scene loop and payoff fields', () => {
    const storyLoopRepair = '下一章必须补故事循环：让旧印章背面名字完成 setup -> escalation -> payoff -> carry_over，并承接期待。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '名字落点',
          purpose: '用旧印章背面名字完成 setup',
          beat: '李玄翻到旧印章背面，看见第二个证人的姓。',
        },
        {
          title: '证人受阻',
          purpose: '让证人线索进入 escalation',
          beat: '执事抢先派人堵住证人家门。',
        },
        {
          title: '旧案第三人',
          purpose: '兑现 payoff 并留下 carry_over',
          beat: '证人说出旧案当晚还有第三个人。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [storyLoopRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(storyLoopRepair)
    expect(sceneCards[1].required_beats).toContain(storyLoopRepair)
    expect(sceneCards[2].reader_payoff).toContain(storyLoopRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(storyLoopRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('故事循环')
    expect(sceneCards[2].serial_risk_repairs).toContain('故事循环')
  })

  test('projects emotional-arc carry-over into scene emotional tone and payoff fields', () => {
    const emotionalArcRepair = '下一章必须补情绪弧：恢复平静 -> 调动 -> 释放 -> 爽，先给安全感，再兑现释放。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '安全感落点',
          purpose: '先给读者安全感',
          beat: '李玄摸到旧印章，确认还有反证底牌。',
          emotional_tone: '压迫后短暂稳住。',
        },
        {
          title: '调动压力',
          purpose: '让执事封口调动情绪',
          beat: '执事抢先堵住第二个证人。',
        },
        {
          title: '反证释放',
          purpose: '兑现释放和爽点',
          beat: '李玄亮出旧印章背面名字，证人当场改口。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [emotionalArcRepair],
        },
      },
    })

    expect(sceneCards[0].emotional_tone).toContain(emotionalArcRepair)
    expect(sceneCards[1].required_beats).toContain(emotionalArcRepair)
    expect(sceneCards[2].reader_payoff).toContain(emotionalArcRepair)
    expect(sceneCards[2].emotional_tone).toContain(emotionalArcRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('情绪弧')
    expect(sceneCards[2].serial_risk_repairs).toContain('情绪弧')
  })

  test('projects emotional-arc carry-over into staged scene execution fields', () => {
    const emotionalArcRepair = '下一章必须补情绪弧：每个场景标注当前是调动还是释放；虐点按前反应->复现->后反应，闭环当前期待时开启下一开环。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '坏信预知',
          purpose: '让读者先知道坏结果',
          beat: '信使把血书压在门缝里。',
        },
        {
          title: '血书复现',
          purpose: '让坏结果真的发生',
          beat: '妹妹的旧名牌被当众摔碎。',
        },
        {
          title: '反手立誓',
          purpose: '让主角作出改变并开启新开环',
          beat: '主角收起碎片，决定查到第三个证人。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [emotionalArcRepair],
        },
      },
    })

    expect(sceneCards[0].emotional_arc_stage).toContain('调动/前反应')
    expect(sceneCards[0].reader_emotion_goal).toContain('读者提前知道坏结果')
    expect(sceneCards[1].emotional_arc_stage).toContain('复现/反制')
    expect(sceneCards[1].reaction_structure).toContain('复现')
    expect(sceneCards[2].emotional_arc_stage).toContain('后反应/释放')
    expect(sceneCards[2].expectation_bridge).toContain('下一开环')
    expect(sceneCards[2].reader_payoff).toContain(emotionalArcRepair)
    expect(sceneCards[2].serial_risk_repairs).toContain('情绪弧')
  })

  test('projects reader-retention carry-over into scene hook hunger and payoff fields', () => {
    const readerRetentionRepair = '下一章必须补追读留存：前300字给Hook上瘾触发，信息差植入问号并按剥洋葱卡住关键线索，章末用湿漉漉的旧名单制造翻页问题。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '十点门槛',
          purpose: '前300字给追读触发',
          beat: '李玄赶到旧城门口，十点钟声正要敲响。',
        },
        {
          title: '旧名单缺页',
          purpose: '用信息差制造饥饿',
          beat: '旧名单少了一页，墨迹还没有干。',
        },
        {
          title: '湿名单章尾',
          purpose: '用章末问题逼读者翻页',
          beat: '李玄发现名单背面贴着一枚湿漉漉的旧印。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [readerRetentionRepair],
        },
      },
    })

    expect(sceneCards[0].opening_hook).toContain(readerRetentionRepair)
    expect(sceneCards[0].information_gap).toContain(readerRetentionRepair)
    expect(sceneCards[1].information_gap).toContain(readerRetentionRepair)
    expect(sceneCards[2].reader_payoff).toContain(readerRetentionRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(readerRetentionRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('追读留存')
    expect(sceneCards[2].serial_risk_repairs).toContain('追读留存')
  })

  test('projects reader-payoff carry-over into scene payoff and beat fields', () => {
    const readerPayoffRepair = '下一章必须补读者回报：把青铜腰牌待回收期待写成现场反制、显性回报和章末新代价，不能只推进设定。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '腰牌失效',
          purpose: '把待回收期待压成现场问题',
          beat: '李玄拿出青铜腰牌，却被守门弟子判为失效。',
        },
        {
          title: '反制兑现',
          purpose: '给出显性回报',
          beat: '李玄用腰牌暗纹反制守门规则。',
        },
        {
          title: '新代价',
          purpose: '章末留下新代价',
          beat: '门开后，腰牌裂出一道新刻痕。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [readerPayoffRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(readerPayoffRepair)
    expect(sceneCards[1].required_beats).toContain(readerPayoffRepair)
    expect(sceneCards[0].reader_payoff).toContain(readerPayoffRepair)
    expect(sceneCards[1].reader_payoff).toContain(readerPayoffRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(readerPayoffRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('读者回报')
    expect(sceneCards[2].serial_risk_repairs).toContain('读者回报')
  })

  test('projects chapter-attraction carry-over into scene attraction fields', () => {
    const attractionRepair = '下一章必须修吸引力：开篇钩子先给旧城门反常响动，场景推进补目标阻碍转折回报，章末翻页留下黑塔许可选择。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '反常响动',
          purpose: '先给旧城门反常响动',
          beat: '旧城门无人推动却自己响了一声。',
        },
        {
          title: '推进反制',
          purpose: '补目标阻碍转折回报',
          beat: '李玄借门轴暗纹反制守门弟子的盘问。',
        },
        {
          title: '黑塔选择',
          purpose: '章末留下黑塔许可选择',
          beat: '黑塔许可从门缝里滑出来，只写着李玄的名字。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [attractionRepair],
        },
      },
    })

    expect(sceneCards[0].opening_hook).toContain(attractionRepair)
    expect(sceneCards[0].required_beats).toContain(attractionRepair)
    expect(sceneCards[1].required_beats).toContain(attractionRepair)
    expect(sceneCards[1].reader_payoff).toContain(attractionRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(attractionRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('章节吸引力')
    expect(sceneCards[2].serial_risk_repairs).toContain('章节吸引力')
  })

  test('projects story-drive carry-over into scene drive fields', () => {
    const storyDriveRepair = '下一章必须补故事力：主角选择当众押上裂纹阵盘，明确阻碍是执事封锁资格，选择代价是暴露暗伤，状态变化是转为主动入局，章末留下下一步因果。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '封锁资格',
          purpose: '明确阻碍',
          beat: '执事宣布散修不得进入试炼阵堂。',
        },
        {
          title: '押上阵盘',
          purpose: '主角选择',
          beat: '李玄把裂纹阵盘按在长案上。',
        },
        {
          title: '主动入局',
          purpose: '状态变化和下一步因果',
          beat: '阵盘亮起，内门长老点名让他明日入塔。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [storyDriveRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(storyDriveRepair)
    expect(sceneCards[1].action_beats).toContain(storyDriveRepair)
    expect(sceneCards[0].conflict).toContain(storyDriveRepair)
    expect(sceneCards[2].state_changes_expected).toContain(storyDriveRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(storyDriveRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('故事驱动')
    expect(sceneCards[2].serial_risk_repairs).toContain('故事驱动')
  })

  test('projects storyline-sync carry-over into scene storyline fields', () => {
    const storylineRepair = '下一章必须校剧情线：storyline_sync 发现 missed 主线节点、unplanned 旁支悬疑和 forbidden_touched 禁用支线；本章要把账本主线拉回当前目标，用现场阻碍、状态变化和章末主线钩子修复。'
    const actionableStorylineRepair = '本章要把账本主线拉回当前目标，用现场阻碍、状态变化和章末主线钩子修复。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '账本主线',
          purpose: '把主线目标拉回账本',
          beat: '李玄重新把账本残页摆到执事面前。',
        },
        {
          title: '旁支截断',
          purpose: '截掉无关悬疑',
          beat: '他拒绝追查无关黑影，只核验账本编号。',
        },
        {
          title: '主线钩子',
          purpose: '章末回到主线问题',
          beat: '账本编号指向禁库最深层。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [storylineRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(storylineRepair)
    expect(sceneCards[1].required_beats).toContain(storylineRepair)
    expect(sceneCards[1].conflict).toContain(actionableStorylineRepair)
    expect(sceneCards[1].conflict).not.toContain('storyline_sync')
    expect(sceneCards[1].conflict).not.toContain('missed')
    expect(sceneCards[1].state_changes_expected).toContain(storylineRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(storylineRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('剧情线')
    expect(sceneCards[2].serial_risk_repairs).toContain('剧情线')
  })

  test('projects character-arc carry-over into scene growth fields', () => {
    const characterArcRepair = '下一章必须补人物弧光：李玄的欲望是保住试炼资格，缺陷受压是害怕暴露裂纹阵盘，关系变化是主动向林青禾求证，成长节点是公开承认残阵缺陷，口吻锚点保持短句反问。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '资格封口',
          purpose: '让李玄的保住资格欲望被压迫',
          beat: '执事要求李玄交出裂纹阵盘并退出试炼。',
        },
        {
          title: '向林青禾求证',
          purpose: '让关系变化落成主动求证',
          beat: '李玄拦下林青禾，只问她是否见过阵盘旧纹。',
        },
        {
          title: '公开承认残阵',
          purpose: '让成长节点落到公开选择',
          beat: '李玄当众承认阵盘有缺，却指出缺口正是钥匙。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [characterArcRepair],
        },
      },
    })

    expect(sceneCards[0].action_beats).toContain(characterArcRepair)
    expect(sceneCards[1].character_voice).toContain(characterArcRepair)
    expect(sceneCards[2].state_changes_expected).toContain(characterArcRepair)
    expect(sceneCards[0].emotional_tone).toContain(characterArcRepair)
    expect(sceneCards[2].reader_payoff).toContain(characterArcRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('人物弧光')
    expect(sceneCards[2].serial_risk_repairs).toContain('人物弧光')
  })

  test('projects innovation carry-over into scene novelty fields', () => {
    const innovationRepair = '下一章必须补创新：把旧城阵盘修复写成规则反差和可视化IP场面，执行点是用裂纹阵盘反制门规，差异护栏是不能写成普通打脸，读者能复述玄灯许可亮起的一幕。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '门规压阵盘',
          purpose: '让旧城门规先压住阵盘修复',
          beat: '门规石碑判定裂纹阵盘无效。',
        },
        {
          title: '裂纹反制',
          purpose: '用裂纹阵盘反制门规',
          beat: '李玄把裂纹对准石碑缺口，门规读数倒转。',
        },
        {
          title: '玄灯许可',
          purpose: '让玄灯许可变成可复述场面',
          beat: '玄灯许可在石碑裂纹里亮起。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [innovationRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(innovationRepair)
    expect(sceneCards[1].required_beats).toContain(innovationRepair)
    expect(sceneCards[1].action_beats).toContain(innovationRepair)
    expect(sceneCards[2].sensory_anchor).toContain(innovationRepair)
    expect(sceneCards[2].reader_payoff).toContain(innovationRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('创新')
    expect(sceneCards[2].serial_risk_repairs).toContain('创新')
  })

  test('projects volume-beat carry-over into scene climax fields', () => {
    const volumeBeatRepair = '下一章必须补爆点：卷级目标是拿到玄灯许可，本章高潮承诺是让裂纹阵盘压过门规，爆点动作是现场破局，章末把许可代价升级成下一场硬仗。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '许可受阻',
          purpose: '让卷级目标遇到门规阻碍',
          beat: '门规石碑拒绝给李玄玄灯许可。',
        },
        {
          title: '现场破局',
          purpose: '兑现爆点动作',
          beat: '李玄把裂纹阵盘压在石碑缺口，许可刻痕反亮。',
        },
        {
          title: '许可代价',
          purpose: '把章末升级到下一场硬仗',
          beat: '许可落下时，石碑追加一行代价。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [volumeBeatRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(volumeBeatRepair)
    expect(sceneCards[1].action_beats).toContain(volumeBeatRepair)
    expect(sceneCards[1].turning_point).toContain(volumeBeatRepair)
    expect(sceneCards[2].reader_payoff).toContain(volumeBeatRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(volumeBeatRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('卷级爆点')
    expect(sceneCards[2].serial_risk_repairs).toContain('卷级爆点')
  })

  test('projects core-drift carry-over into scene core alignment fields', () => {
    const coreDriftRepair = '下一章必须守核心：读者承诺是旧城修复反制门规，主角驱动是主动承担许可代价，阶段目标是拿回玄灯许可，章末钩子必须回到许可新规则，不能写成旁支悬疑。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '门规压住许可',
          purpose: '把读者承诺拉回旧城修复',
          beat: '门规石碑拒绝承认李玄的修复资格。',
        },
        {
          title: '主动承担代价',
          purpose: '让主角驱动落成选择',
          beat: '李玄主动把裂纹阵盘押作许可代价。',
        },
        {
          title: '许可新规则',
          purpose: '把章末钩子拉回许可新规则',
          beat: '玄灯许可亮起后，多出一条必须当夜执行的新规。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [coreDriftRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(coreDriftRepair)
    expect(sceneCards[1].required_beats).toContain(coreDriftRepair)
    expect(sceneCards[0].conflict).toContain(coreDriftRepair)
    expect(sceneCards[1].state_changes_expected).toContain(coreDriftRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(coreDriftRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('核心守恒')
    expect(sceneCards[2].serial_risk_repairs).toContain('核心守恒')
  })

  test('projects timeline-delta carry-over into scene continuity fields', () => {
    const timelineRepair = '下一章必须补时间线：当前时间写回玄灯夜审，活动地点写回旧城西门，事件顺序必须先验许可再付代价，并给 source_excerpt 证据。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '夜审开场',
          purpose: '承接玄灯夜审时间',
          beat: '旧城西门的夜审钟声响起。',
        },
        {
          title: '先验许可',
          purpose: '先验许可再谈代价',
          beat: '李玄先让石碑核验许可刻痕。',
        },
        {
          title: '代价落下',
          purpose: '把代价写成顺序结果',
          beat: '许可通过后，石碑才落下代价条文。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [timelineRepair],
        },
      },
    })

    expect(sceneCards[0].transition_from_previous).toContain(timelineRepair)
    expect(sceneCards[0].required_information).toContain(timelineRepair)
    expect(sceneCards[1].required_information).toContain(timelineRepair)
    expect(sceneCards[2].state_changes_expected).toContain(timelineRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('时间线')
    expect(sceneCards[2].serial_risk_repairs).toContain('时间线')
  })

  test('projects character-state carry-over into scene state continuity fields', () => {
    const characterStateRepair = '下一章必须补角色状态：李玄位置写回旧城西门夜审，伤势是右臂裂纹灼痛，持有物是玄灯许可半亮，关系态度是对林青禾暂时信任，知识边界是只知道门规代价未知道幕后主使，并给 source_excerpt 证据。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '夜审伤势',
          purpose: '承接李玄位置和伤势',
          beat: '李玄站在旧城西门，右臂裂纹仍在发烫。',
        },
        {
          title: '半亮许可',
          purpose: '承接持有物和信任态度',
          beat: '他把半亮的玄灯许可递给林青禾核验。',
        },
        {
          title: '知识边界',
          purpose: '守住未知幕后主使',
          beat: '李玄只确认门规代价，还不知道是谁改过石碑。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [characterStateRepair],
        },
      },
    })

    expect(sceneCards[0].transition_from_previous).toContain(characterStateRepair)
    expect(sceneCards[0].required_information).toContain(characterStateRepair)
    expect(sceneCards[1].state_changes_expected).toContain(characterStateRepair)
    expect(sceneCards[2].character_voice).toContain(characterStateRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('角色状态')
    expect(sceneCards[0].serial_risk_repairs).not.toContain('时间线')
  })

  test('projects asset-state carry-over into scene setting state fields', () => {
    const assetStateRepair = '下一章必须补资产状态：关键资产玄灯许可归属写回李玄临时持有，可见性是半亮不可公开，触发条件是旧城西门夜审通过，限制是只能用一次，风险和后果是暴露裂纹阵盘，并给 source_excerpt 证据。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '临时持有',
          purpose: '确认玄灯许可归属',
          beat: '李玄把半亮的玄灯许可收进袖中。',
        },
        {
          title: '夜审触发',
          purpose: '确认触发条件和限制',
          beat: '夜审通过后，许可只亮起一次。',
        },
        {
          title: '暴露风险',
          purpose: '让风险和后果进入局势',
          beat: '许可熄灭时，裂纹阵盘的纹路被门规石碑照出。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [assetStateRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(assetStateRepair)
    expect(sceneCards[0].used_settings).toContain(assetStateRepair)
    expect(sceneCards[1].revealed_settings).toContain(assetStateRepair)
    expect(sceneCards[2].state_changes_expected).toContain(assetStateRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('资产状态')
  })

  test('projects relationship-delta carry-over into scene relationship state fields', () => {
    const relationshipDeltaRepair = '下一章必须补关系增量：李玄和林青禾的信任从试探转为临时联盟，阶段边界是仍不共享幕后主使，代价是林青禾替他作证后欠下门规人情。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '试探联盟',
          purpose: '让信任从试探推进到临时联盟',
          beat: '林青禾没有立刻交出证词，而是先问李玄准备付什么代价。',
        },
        {
          title: '替他作证',
          purpose: '让关系代价落地',
          beat: '林青禾替李玄作证，门规石碑记下她的人情。',
        },
        {
          title: '边界保留',
          purpose: '守住仍不共享幕后主使的阶段边界',
          beat: '李玄谢过她，却没有说出自己怀疑的幕后主使。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [relationshipDeltaRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(relationshipDeltaRepair)
    expect(sceneCards[1].action_beats).toContain(relationshipDeltaRepair)
    expect(sceneCards[1].character_voice).toContain(relationshipDeltaRepair)
    expect(sceneCards[2].state_changes_expected).toContain(relationshipDeltaRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('关系增量')
  })

  test('projects chapter-handoff-delta carry-over into scene handoff fields', () => {
    const handoffDeltaRepair = '下一章必须补章末交接：最后一幕是玄灯许可半亮，开放问题是谁改过门规石碑，下一章拉力是李玄必须在夜审前找到第二个证人，开篇承接义务是先接住许可代价。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '许可代价',
          purpose: '先接住上一章许可代价',
          beat: '李玄看着半亮的玄灯许可，没有立刻离开旧城西门。',
        },
        {
          title: '门规疑点',
          purpose: '推进谁改过门规石碑的开放问题',
          beat: '门规石碑的刻痕比夜审前多出一道。',
        },
        {
          title: '第二个证人',
          purpose: '留下夜审前找到第二个证人的拉力',
          beat: '钟声再响前，李玄必须找到第二个证人。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [handoffDeltaRepair],
        },
      },
    })

    expect(sceneCards[0].transition_from_previous).toContain(handoffDeltaRepair)
    expect(sceneCards[0].required_information).toContain(handoffDeltaRepair)
    expect(sceneCards[1].state_changes_expected).toContain(handoffDeltaRepair)
    expect(sceneCards[2].reader_payoff).toContain(handoffDeltaRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(handoffDeltaRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('章末交接')
    expect(sceneCards[0].serial_risk_repairs).not.toContain('章首承接')
  })

  test('projects revision-cascade carry-over into scene continuity fields', () => {
    const revisionCascadeRepair = '下一章必须处理 revision_cascade_impact：修订后正史从“林青禾直接交出旧印”改为“只交半枚印纹”，后续状态边界不能回滚；开篇用半枚印纹承接，中段用有限作证推进，章末提示缺页连锁影响。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '半枚印纹',
          purpose: '承接修订后的正史',
          beat: '林青禾只把半枚印纹按在桌沿。',
        },
        {
          title: '有限作证',
          purpose: '按修订后的边界推进',
          beat: '她替李玄证明印纹来源，却没有交出完整旧印。',
        },
        {
          title: '缺页连锁',
          purpose: '把修订影响传到后续章节',
          beat: '半枚印纹只能对上账册缺页的一角。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [revisionCascadeRepair],
        },
      },
    })

    expect(sceneCards[0].transition_from_previous).toContain(revisionCascadeRepair)
    expect(sceneCards[0].required_information).toContain(revisionCascadeRepair)
    expect(sceneCards[1].action_beats).toContain(revisionCascadeRepair)
    expect(sceneCards[1].state_changes_expected).toContain(revisionCascadeRepair)
    expect(sceneCards[2].reader_payoff).toContain(revisionCascadeRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(revisionCascadeRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('修订级联')
    expect(sceneCards[2].serial_risk_repairs).toContain('修订级联')
  })

  test('projects prose-revision-receipt carry-over into scene repair fields', () => {
    const revisionReceiptRepair = '下一章必须复核 prose_revision_receipt：上一章修订回执仍有 delivered=false，证据泛化，remaining_risk 是“修订后仍用概括句跳过破局过程”；本章每场必须把修订残留改成可验证的现场证据。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '重新验印',
          purpose: '把修订残留转成现场证据',
          beat: '李玄重新把半枚印纹压到灯下。',
        },
        {
          title: '补破局过程',
          purpose: '不再用概括句跳过破局',
          beat: '他逐步比对印纹缺口和账册缺页。',
        },
        {
          title: '证据落点',
          purpose: '让读者看到修订残留被补回',
          beat: '缺页边角和半枚印纹严丝合缝。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [revisionReceiptRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(revisionReceiptRepair)
    expect(sceneCards[1].required_beats).toContain(revisionReceiptRepair)
    expect(sceneCards[1].action_beats).toContain(revisionReceiptRepair)
    expect(sceneCards[0].required_information).toContain(revisionReceiptRepair)
    expect(sceneCards[2].reader_payoff).toContain(revisionReceiptRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('修订回执')
    expect(sceneCards[2].serial_risk_repairs).toContain('修订回执')
  })

  test('projects revision-receipt-check carry-over into scene repair fields', () => {
    const revisionReceiptCheckRepair = '下一章必须补 revision_receipt_checks：required_action 是重做破局过程，repair_segment 缺少现场动作，changed_evidence 不能只写“已修复”；本章要把 applied_fix 写成可定位动作和证据变化。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '重做破局',
          purpose: '把修订要求变成现场动作',
          beat: '李玄重新拆开旧印边角。',
        },
        {
          title: '证据变化',
          purpose: '让改动证据可定位',
          beat: '旧印内侧多出一行被刮掉的编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [revisionReceiptCheckRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(revisionReceiptCheckRepair)
    expect(sceneCards[0].required_information).toContain(revisionReceiptCheckRepair)
    expect(sceneCards[0].required_beats).toContain(revisionReceiptCheckRepair)
    expect(sceneCards[1].action_beats).toContain(revisionReceiptCheckRepair)
    expect(sceneCards[1].reader_payoff).toContain(revisionReceiptCheckRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('修订回执检查')
    expect(sceneCards[1].serial_risk_repairs).toContain('修订回执检查')
  })

  test('projects revision-scope-guard carry-over into scene scope fields', () => {
    const revisionScopeRepair = '下一章必须执行 revision_scope_guard：上一轮修订差异超过 allowed_delta_word_count，后续修订只能局部补证据，不能新增支线、替换核心梗、删除伏笔钩子或角色特征；本章场景要先标明保留项再推进。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '保留半印',
          purpose: '先标明必须保留的伏笔',
          beat: '李玄把半枚印纹重新摊开。',
        },
        {
          title: '局部补证据',
          purpose: '只补缺口不重写方向',
          beat: '他只核对缺页边角，没有另开新支线。',
        },
        {
          title: '钩子不删',
          purpose: '保留章末拉力',
          beat: '缺页背面的旧编号仍指向禁库。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [revisionScopeRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(revisionScopeRepair)
    expect(sceneCards[0].required_information).toContain(revisionScopeRepair)
    expect(sceneCards[1].required_beats).toContain(revisionScopeRepair)
    expect(sceneCards[1].state_changes_expected).toContain(revisionScopeRepair)
    expect(sceneCards[2].reader_payoff).toContain(revisionScopeRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('修订幅度')
    expect(sceneCards[2].serial_risk_repairs).toContain('修订幅度')
  })

  test('projects revision-directive carry-over into scene execution fields', () => {
    const revisionDirectiveRepair = 'revision_directives: preserve the witness choice, show the clue handoff on page, add a consequence, and keep the next-scene state change explicit.'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '选择落地',
          purpose: '让证人选择可见',
          beat: '证人把编号推回桌面。',
        },
        {
          title: '线索交接',
          purpose: '现场完成线索交接',
          beat: '林青禾接过缺页，立刻改口。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [revisionDirectiveRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(revisionDirectiveRepair)
    expect(sceneCards[0].required_information).toContain(revisionDirectiveRepair)
    expect(sceneCards[0].required_beats).toContain(revisionDirectiveRepair)
    expect(sceneCards[1].action_beats).toContain(revisionDirectiveRepair)
    expect(sceneCards[1].state_changes_expected).toContain(revisionDirectiveRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(revisionDirectiveRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('修订指令')
    expect(sceneCards[1].serial_risk_repairs).toContain('修订指令')
  })

  test('projects focused revision modes into scene execution fields', () => {
    const focusedModeRepair = 'focused_revision_modes: expand_action, cut_description, tighten_pacing, add_consequence; action_detail must become visible scene action instead of summary.'
    const hookModeRepair = 'focused_revision_modes: restore_hook; ending pull must remain visible for the next chapter.'
    const settingModeRepair = 'focused_revision_modes: repair_setting_violation; ability cost, item ownership, rule trigger, and knowledge boundary must remain consistent.'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '动作补足',
          purpose: '把模式修订落成动作',
          beat: '李玄压低肩线冲进旧巷。',
        },
        {
          title: '代价落地',
          purpose: '补后果和设定代价',
          beat: '旧印发冷，他把左手藏进袖口。',
        },
        {
          title: '钩子保留',
          purpose: '保留章末拉力',
          beat: '巷底门缝里传来同频敲击。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [focusedModeRepair, hookModeRepair, settingModeRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(focusedModeRepair)
    expect(sceneCards[1].required_beats).toContain(focusedModeRepair)
    expect(sceneCards[1].action_beats).toContain(focusedModeRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(focusedModeRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(hookModeRepair)
    expect(sceneCards[0].used_settings).toContain(settingModeRepair)
    expect(sceneCards[1].forbidden_settings).toContain(settingModeRepair)
    expect(sceneCards[2].state_changes_expected).toContain(settingModeRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('定向修订')
    expect(sceneCards[2].serial_risk_repairs).toContain('定向修订')
  })

  test('projects craft metric carry-over into scene execution fields', () => {
    const actionMetricRepair = 'craft_metrics.action_detail_score=54: fix action_detail_score by writing start, reaction, space change, resource loss, counter, result.'
    const densityMetricRepair = 'craft_metrics.event_density_score=61: fix event_density_score so every 3-5 paragraphs changes action, choice, information, or relationship.'
    const descriptionMetricRepair = 'craft_metrics.description_overuse_score=86: fix description_overuse_score by keeping only details that affect action space or danger judgment.'
    const settingMetricRepair = 'craft_metrics.setting_consistency_score=58: fix setting_consistency_score for ability cost, item ownership, rule trigger, and knowledge boundary.'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '起手反应',
          purpose: '补动作链',
          beat: '李玄先出手试门，再被门内寒意逼退。',
        },
        {
          title: '信息变化',
          purpose: '提高事件密度',
          beat: '林青禾从账册缺页里找出旧门编号。',
        },
        {
          title: '设定校准',
          purpose: '校准设定一致性',
          beat: '旧印只在三息内发冷，归属仍由林青禾保管。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [actionMetricRepair, densityMetricRepair, descriptionMetricRepair, settingMetricRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(actionMetricRepair)
    expect(sceneCards[0].action_beats).toContain(actionMetricRepair)
    expect(sceneCards[1].required_beats).toContain(densityMetricRepair)
    expect(sceneCards[1].action_beats).toContain(densityMetricRepair)
    expect(sceneCards[0].style_directives).toContain(descriptionMetricRepair)
    expect(sceneCards[2].used_settings).toContain(settingMetricRepair)
    expect(sceneCards[2].forbidden_settings).toContain(settingMetricRepair)
    expect(sceneCards[2].state_changes_expected).toContain(settingMetricRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('正文工艺指标')
    expect(sceneCards[2].serial_risk_repairs).toContain('正文工艺指标')
  })

  test('projects five-dimension score carry-over into scene execution fields', () => {
    const coreScoreRepair = 'five_dimension_scores.core_consistency=72: restore the chapter core conflict around rule pressure and visible payoff.'
    const surfaceScoreRepair = 'five_dimension_scores.surface_rewrite=69; readability=70: replace summary prose with concrete action, clipped dialogue, and cleaner sentence rhythm.'
    const logicScoreRepair = 'five_dimension_scores.format_consistency=73; logic_coherence=71: preserve scene format and make cause, consequence, state change, and clue handoff explicit.'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '核心冲突',
          purpose: '把核心压力压回现场',
          beat: '李玄被旧门规则挡住，只能当场反制。',
        },
        {
          title: '动作替代',
          purpose: '用动作和短对白替换总结',
          beat: '林青禾看向他袖口，他只说：别碰。',
        },
        {
          title: '因果交接',
          purpose: '把线索和状态交接清楚',
          beat: '旧印冷下去，门缝里多出下一枚编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [coreScoreRepair, surfaceScoreRepair, logicScoreRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(coreScoreRepair)
    expect(sceneCards[0].conflict).toContain(coreScoreRepair)
    expect(sceneCards[1].prose_craft_directives).toContain(surfaceScoreRepair)
    expect(sceneCards[1].style_directives).toContain(surfaceScoreRepair)
    expect(sceneCards[2].required_information).toContain(logicScoreRepair)
    expect(sceneCards[2].state_changes_expected).toContain(logicScoreRepair)
    expect(sceneCards[2].action_beats).toContain(logicScoreRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('质量五维')
    expect(sceneCards[2].serial_risk_repairs).toContain('质量五维')
  })

  test('projects quality structure progression information checks into scene execution fields', () => {
    const structureRepair = 'structure_checks.opening_hook=missing; middle_progression=weak; situation_change=unclear; ending_page_turn=missing.'
    const progressionRepair = 'progression_checks.non_deletable_change=false; mainline_shift=missing; relationship_or_state_change=missing; compressed_water=required.'
    const informationRepair = 'information_checks.new_concept_count=5; action_bound_info=missing; conflict_release=missing; reader_first_scene=unclear.'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '开头钩子',
          purpose: '先给结构钩子',
          beat: '旧门先响了一声。',
        },
        {
          title: '中段推进',
          purpose: '把推进写成不可删除变化',
          beat: '林青禾用缺页逼管事改口。',
        },
        {
          title: '信息收束',
          purpose: '让信息跟冲突走',
          beat: '编号只露出一半，指向下一扇门。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [structureRepair, progressionRepair, informationRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(structureRepair)
    expect(sceneCards[0].opening_hook).toContain(structureRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(structureRepair)
    expect(sceneCards[1].required_beats).toContain(progressionRepair)
    expect(sceneCards[1].action_beats).toContain(progressionRepair)
    expect(sceneCards[1].state_changes_expected).toContain(progressionRepair)
    expect(sceneCards[2].required_information).toContain(informationRepair)
    expect(sceneCards[2].information_gap).toContain(informationRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('质量专项')
    expect(sceneCards[2].serial_risk_repairs).toContain('质量专项')
  })

  test('projects platform and content rubric checks into scene execution fields', () => {
    const platformRepair = 'platform_checks.opening_pace=weak; payoff_density=low; reader_expectation=unclear; page_turn_pull=missing.'
    const contentRepair = 'content_rubric_checks.core_selling_point=unclear; conflict_progression=flat; chapter_change=missing; page_turn_reason=missing.'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '平台开头',
          purpose: '先满足平台节奏',
          beat: '旧门第一声响起，学生证同时变黑。',
        },
        {
          title: '内容变化',
          purpose: '把黄金三问落到正文',
          beat: '李玄用旧印逼规则露出新编号。',
        },
        {
          title: '翻页理由',
          purpose: '保留下一章拉力',
          beat: '编号背后还有半个名字没有显出来。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [platformRepair, contentRepair],
        },
      },
    })

    expect(sceneCards[0].opening_hook).toContain(platformRepair)
    expect(sceneCards[2].reader_payoff).toContain(platformRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(platformRepair)
    expect(sceneCards[0].purpose_tags).not.toContain(contentRepair)
    expect(sceneCards[1].conflict).toContain(contentRepair)
    expect(sceneCards[1].required_beats).toContain(contentRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(contentRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('平台/内容基准')
    expect(sceneCards[2].serial_risk_repairs).toContain('平台/内容基准')
  })

  test('projects deterministic-cleanup carry-over into scene prose hygiene fields', () => {
    const deterministicCleanupRepair = '下一章必须执行 deterministic_prose_cleanup：硬扫残留 Gate A 禁用词和模板表达，删除“某种意义上”“此时此刻”等 AI 签名，把抽象总结改成动作反应；每个场景都要保留为去AI味指令。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '动作替代',
          purpose: '用动作替代抽象总结',
          beat: '李玄把半枚印纹按到灯下。',
        },
        {
          title: '删除模板',
          purpose: '清掉模板表达',
          beat: '他不再解释意义，只让缺页边角自己对上印纹。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [deterministicCleanupRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(deterministicCleanupRepair)
    expect(sceneCards[1].prose_craft_directives).toContain(deterministicCleanupRepair)
    expect(sceneCards[0].style_directives).toContain(deterministicCleanupRepair)
    expect(sceneCards[1].required_beats).toContain(deterministicCleanupRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('确定性清理')
    expect(sceneCards[1].serial_risk_repairs).toContain('确定性清理')
  })

  test('projects banned-word carry-over into scene prose hygiene fields', () => {
    const bannedWordRepair = 'Next chapter must resolve banned_words_checks: matched_word=ceremonial abstraction, level=hard, location=ending; replacement=physical action and clipped reply; remaining_risk=the banned phrase must not appear again.'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '动作替换',
          purpose: '用动作替换禁用词',
          beat: '李玄把旧印压进烛泪里。',
        },
        {
          title: '短对白收束',
          purpose: '用短对白替代章末抽象总结',
          beat: '林青禾问他还剩多久，他只答：三息。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [bannedWordRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(bannedWordRepair)
    expect(sceneCards[0].style_directives).toContain(bannedWordRepair)
    expect(sceneCards[1].required_beats).toContain(bannedWordRepair)
    expect(sceneCards[1].recent_fatigue_action).toContain(bannedWordRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('禁用词')
    expect(sceneCards[1].serial_risk_repairs).toContain('禁用词')
  })

  test('projects deslop-repair receipt carry-over into scene anti-ai repair fields', () => {
    const deslopReceiptRepair = '下一章必须复核去AI回执：deslop_repair_receipts remaining_risk 是 Gate A 模板表达仍残留，changed_evidence 无法定位；本章每场要把抽象总结改成动作反应，用短对白和物件变化证明去AI味已经落成。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '动作反应',
          purpose: '把抽象总结改成动作',
          beat: '李玄把旧账册摊开，指尖停在缺页毛边。',
        },
        {
          title: '短对白',
          purpose: '用短对白替代解释腔',
          beat: '林青禾问证据，他只答：看编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [deslopReceiptRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(deslopReceiptRepair)
    expect(sceneCards[0].style_directives).toContain(deslopReceiptRepair)
    expect(sceneCards[1].required_beats).toContain(deslopReceiptRepair)
    expect(sceneCards[1].action_beats).toContain(deslopReceiptRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(deslopReceiptRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('去AI回执')
    expect(sceneCards[1].serial_risk_repairs).toContain('去AI回执')
  })

  test('projects readability-review carry-over into scene readability fields', () => {
    const readabilityRepair = '下一章必须调可读性：readability_review 分数低于 78，梗感不足，长句过密；把句子切短，优先动作和对白，减少解释腔，每个高密场景都要给读者一个能复述的爽点。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '短句推进',
          purpose: '用动作和对白推进',
          beat: '李玄把半枚印纹按亮，直接问林青禾缺页在哪里。',
        },
        {
          title: '复述爽点',
          purpose: '让读者能复述破局点',
          beat: '缺页边角和半枚印纹扣在一起，旧编号反亮。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [readabilityRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(readabilityRepair)
    expect(sceneCards[1].prose_craft_directives).toContain(readabilityRepair)
    expect(sceneCards[0].style_directives).toContain(readabilityRepair)
    expect(sceneCards[0].dialogue_goals).toContain(readabilityRepair)
    expect(sceneCards[1].reader_payoff).toContain(readabilityRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('可读性')
    expect(sceneCards[1].serial_risk_repairs).toContain('可读性')
  })

  test('projects governance-recheck carry-over into scene recovery fields', () => {
    const governanceRepair = '下一章必须验恢复依据：governance_recheck_sync 发现 failed_evidence 是样章策略没有落到对白交锋，watch_items 是继续观察节奏恢复；本章要把恢复依据写成可见冲突推进和读者回报。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '恢复依据入场',
          purpose: '把样章策略恢复依据放进现场',
          beat: '李玄没有旁白解释，直接把半枚印纹推到林青禾面前。',
        },
        {
          title: '对白交锋',
          purpose: '让节奏恢复落到对白交锋',
          beat: '林青禾追问来源，李玄用三句短答逼她作证。',
        },
        {
          title: '回报复查',
          purpose: '让读者看到治理恢复结果',
          beat: '她终于指向缺页背面的旧编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [governanceRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(governanceRepair)
    expect(sceneCards[1].required_beats).toContain(governanceRepair)
    expect(sceneCards[1].action_beats).toContain(governanceRepair)
    expect(sceneCards[1].state_changes_expected).toContain(governanceRepair)
    expect(sceneCards[2].reader_payoff).toContain(governanceRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('治理复查')
    expect(sceneCards[2].serial_risk_repairs).toContain('治理复查')
  })

  test('projects chapter-title carry-over into scene promise fields', () => {
    const titleRepair = '下一章必须修标题：chapter_title_uniqueness_sync 发现标题“旧印追查”与前文重复，标题承诺要改成“半印照出缺页”，正文开篇必须立起半印照缺页的差异化画面，章末回收标题卖点。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '半印入灯',
          purpose: '让标题承诺先入场',
          beat: '李玄把半枚印纹压到灯下，缺页边缘泛出旧光。',
        },
        {
          title: '缺页成证',
          purpose: '推进标题差异化画面',
          beat: '缺页边角和半枚印纹扣住同一道旧编号。',
        },
        {
          title: '标题回收',
          purpose: '让章末回收标题卖点',
          beat: '旧编号在缺页背面照出禁库门名。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [titleRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(titleRepair)
    expect(sceneCards[0].required_information).toContain(titleRepair)
    expect(sceneCards[0].opening_hook).not.toContain(titleRepair)
    expect(sceneCards[1].required_beats).toContain(titleRepair)
    expect(sceneCards[2].reader_payoff).toContain(titleRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(titleRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('章节标题')
    expect(sceneCards[2].serial_risk_repairs).toContain('章节标题')
  })

  test('projects prose-quality gate carry-over into scene quality fields', () => {
    const qualityGateRepair = '下一章必须修质量门禁：prose_quality 复盘审稿出现 S1 问题，质量五维低分，平台适配和内容基准都未过；本章每场必须补清晰冲突、短周期回报和可见角色选择，章末给出质量门禁可复核的读者回报。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '清晰冲突',
          purpose: '先补平台适配需要的清晰冲突',
          beat: '执事当场拒绝李玄入库。',
        },
        {
          title: '角色选择',
          purpose: '让内容基准落到角色选择',
          beat: '李玄选择押上半枚印纹换一次核验。',
        },
        {
          title: '短周期回报',
          purpose: '让读者看到章内回报',
          beat: '禁库门名在缺页背面亮起。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [qualityGateRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(qualityGateRepair)
    expect(sceneCards[1].required_beats).toContain(qualityGateRepair)
    expect(sceneCards[1].action_beats).toContain(qualityGateRepair)
    expect(sceneCards[0].purpose_tags).not.toContain(qualityGateRepair)
    expect(sceneCards[2].reader_payoff).toContain(qualityGateRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('质量门禁')
    expect(sceneCards[2].serial_risk_repairs).toContain('质量门禁')
  })

  test('projects quality-audit repair receipt carry-over into scene quality repair fields', () => {
    const qualityAuditReceiptRepair = '下一章必须复核质量修复回执：quality_audit_repair_receipts 显示 quality_audit_checks 的事件内容比重仍低，changed_evidence 只写“已加强”，remaining_risk 是短周期回报没有正文证据；本章要把现场冲突、信息变化和读者回报写成可定位事件。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '现场冲突',
          purpose: '把事件内容比重拉高',
          beat: '执事当众扣住账本残页。',
        },
        {
          title: '信息变化',
          purpose: '让信息跟冲突走',
          beat: '李玄逼证人改口，旧编号被说出。',
        },
        {
          title: '短回报',
          purpose: '补短周期回报证据',
          beat: '缺页背面亮出禁库门名。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [qualityAuditReceiptRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(qualityAuditReceiptRepair)
    expect(sceneCards[1].required_beats).toContain(qualityAuditReceiptRepair)
    expect(sceneCards[1].action_beats).toContain(qualityAuditReceiptRepair)
    expect(sceneCards[1].state_changes_expected).toContain(qualityAuditReceiptRepair)
    expect(sceneCards[2].reader_payoff).toContain(qualityAuditReceiptRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('质量修复回执')
    expect(sceneCards[2].serial_risk_repairs).toContain('质量修复回执')
  })

  test('projects perspective-review carry-over into scene editorial repair fields', () => {
    const perspectiveRepair = '下一章必须处理多视角审查：perspective_review 里商业编辑 CONCERNS 认为冲突不够可见，读者视角 REJECT 认为回报不清楚；本章要把 reviewer evidence 改成现场阻碍、角色选择和可复述读者回报。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '阻碍上桌',
          purpose: '把商业编辑指出的冲突写成现场阻碍',
          beat: '执事把禁库钥牌扣在桌下。',
        },
        {
          title: '选择押注',
          purpose: '让角色选择承担代价',
          beat: '李玄押上半枚旧印换一次开门核验。',
        },
        {
          title: '回报清楚',
          purpose: '让读者视角能复述本章回报',
          beat: '禁库门名在旧印背面反亮。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [perspectiveRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(perspectiveRepair)
    expect(sceneCards[0].purpose_tags).not.toContain(perspectiveRepair)
    expect(sceneCards[1].required_beats).toContain(perspectiveRepair)
    expect(sceneCards[1].conflict).toContain(perspectiveRepair)
    expect(sceneCards[2].reader_payoff).toContain(perspectiveRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('多视角审查')
    expect(sceneCards[2].serial_risk_repairs).toContain('多视角审查')
  })

  test('projects delivery-risk-receipt carry-over into scene handoff repair fields', () => {
    const deliveryReceiptRepair = '下一章必须复核承接：delivery_risk_receipts delivered=false，risk_item 是上一章章末第三个名字未兑现，required_action 是开篇承接第三个名字，中段让第三个名字改变证人立场，ending_actions 要留下新风险；remaining_risk 不能只在旁白里声明已处理。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '第三个名字开篇',
          purpose: '承接上一章章末名字',
          beat: '李玄把第三个名字写到案桌中央。',
        },
        {
          title: '证人立场变化',
          purpose: '让第三个名字改变证人立场',
          beat: '证人看见名字后撤回旧证词。',
        },
        {
          title: '新风险章末',
          purpose: '留下新风险',
          beat: '名字背后浮出禁库追缉令。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [deliveryReceiptRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(deliveryReceiptRepair)
    expect(sceneCards[1].required_beats).toContain(deliveryReceiptRepair)
    expect(sceneCards[1].action_beats).toContain(deliveryReceiptRepair)
    expect(sceneCards[1].state_changes_expected).toContain(deliveryReceiptRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(deliveryReceiptRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('交稿回执')
    expect(sceneCards[2].serial_risk_repairs).toContain('交稿回执')
  })

  test('projects serial-risk-repair carry-over into scene momentum repair fields', () => {
    const serialRepair = '下一章必须补近章风险修复：serial_risk_repair_checks 显示 scene_cards.serial_risk_repairs 和 recent_fatigue_action 未落成正文；本章要把目标推进、阻碍升级、新信息、关系/世界调剂或冲突冷却写成可见事件。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '目标推进',
          purpose: '把近章风险修复改成目标推进',
          beat: '李玄拿到账本编号的新线索。',
        },
        {
          title: '阻碍升级',
          purpose: '让阻碍升级成现场压力',
          beat: '执事封住证人家门。',
        },
        {
          title: '关系调剂',
          purpose: '用关系调剂缓冲连续冲突',
          beat: '林青禾提醒李玄换路查证。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [serialRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(serialRepair)
    expect(sceneCards[1].action_beats).toContain(serialRepair)
    expect(sceneCards[1].state_changes_expected).toContain(serialRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(serialRepair)
    expect(sceneCards[2].reader_payoff).toContain(serialRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('近章风险修复')
    expect(sceneCards[2].serial_risk_repairs).toContain('近章风险修复')
  })

  test('projects next-chapter-quality-plan receipt carry-over into scene quality handoff fields', () => {
    const qualityPlanReceiptRepair = '下一章必须复检质量续航：next_chapter_quality_plan_receipts 缺失，quality_focus 是开篇压迫、middle_actions 是中段验证账本、ending_actions 是章末留下追问，avoid_repetition 避免空钩子；本章要把 evidence_basis 写成可定位正文证据。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '压迫开篇',
          purpose: '把质量焦点落到开篇压力',
          beat: '执事当众扣住账本残页。',
        },
        {
          title: '中段验证',
          purpose: '用现场动作验证账本',
          beat: '李玄把账本编号和库门铭牌逐项对照。',
        },
        {
          title: '章末追问',
          purpose: '留下下一章追问',
          beat: '铭牌背后浮出第二本账册的编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [qualityPlanReceiptRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(qualityPlanReceiptRepair)
    expect(sceneCards[1].required_beats).toContain(qualityPlanReceiptRepair)
    expect(sceneCards[1].action_beats).toContain(qualityPlanReceiptRepair)
    expect(sceneCards[1].state_changes_expected).toContain(qualityPlanReceiptRepair)
    expect(sceneCards[2].ending_hook_seed).toContain(qualityPlanReceiptRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('质量续航回执')
    expect(sceneCards[2].serial_risk_repairs).toContain('质量续航回执')
  })

  test('projects scene-card-receipt carry-over into scene evidence repair fields', () => {
    const sceneCardReceiptRepair = '下一章必须补场景回执：scene_card_receipts delivered=false，scene_start_anchor 和 scene_end_anchor 缺失，evidence 借用其他场景；本章要把 scene_goal、obstacle、action、turn、payoff、state_delta 写成可定位正文证据。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '目标上桌',
          purpose: '把场景目标写成可定位事件',
          beat: '李玄把账本残页推到审案桌中央。',
        },
        {
          title: '阻碍动作',
          purpose: '让阻碍和行动都可验证',
          beat: '执事夺页失败，反把库门印痕露出来。',
        },
        {
          title: '回报状态',
          purpose: '用回报和状态变化收场',
          beat: '林青禾确认印痕属于禁库内门。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [sceneCardReceiptRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(sceneCardReceiptRepair)
    expect(sceneCards[1].required_beats).toContain(sceneCardReceiptRepair)
    expect(sceneCards[1].action_beats).toContain(sceneCardReceiptRepair)
    expect(sceneCards[1].prose_craft_directives).toContain(sceneCardReceiptRepair)
    expect(sceneCards[1].state_changes_expected).toContain(sceneCardReceiptRepair)
    expect(sceneCards[2].reader_payoff).toContain(sceneCardReceiptRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('场景回执')
    expect(sceneCards[2].serial_risk_repairs).toContain('场景回执')
  })

  test('projects revision-context carry-over into scene continuity fields', () => {
    const revisionContextRepair = '下一章必须复核 revision_context_receipts：previous_chapter 半枚旧印仍在李玄手里，next_chapter 要承接禁库门名，foreshadowing、character_cards、timeline、setting_context、资产归属和关系边界都要用正文证据核对；本章第一场先接住上章缺口，中段同步状态，章末留下可追踪证据。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '接上半印',
          purpose: '先承接上章旧印缺口',
          beat: '李玄从袖中取出半枚旧印。',
        },
        {
          title: '核对状态',
          purpose: '同步角色和资产状态',
          beat: '他把旧印、缺页和林青禾证词逐项对上。',
        },
        {
          title: '留下证据',
          purpose: '把禁库门名留给下一章追踪',
          beat: '缺页背面的门名被拓进铜片。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [revisionContextRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(revisionContextRepair)
    expect(sceneCards[1].state_changes_expected).toContain(revisionContextRepair)
    expect(sceneCards[1].used_settings).toContain(revisionContextRepair)
    expect(sceneCards[2].revealed_settings).toContain(revisionContextRepair)
    expect(sceneCards[0].transition_from_previous).toContain(revisionContextRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('修订上下文')
    expect(sceneCards[2].serial_risk_repairs).toContain('修订上下文')
  })

  test('projects write-preparation carry-over into scene preparation fields', () => {
    const writePreparationRepair = '下一章必须修写前准备：write_preparation_checks 发现 source_gaps、asset_risks、creation_contract_checklist、blueprint_focus、reader_payoff_focus 和 must_confirm 没有落入正文；本章第一场补来源证据和资产风险，中段执行章节蓝图焦点，章末兑现读者回报。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '补来源证据',
          purpose: '把来源缺口放到现场',
          beat: '李玄翻出旧印来历的登记残页。',
        },
        {
          title: '执行蓝图焦点',
          purpose: '按细纲焦点推进',
          beat: '他用登记残页逼林青禾确认资产风险。',
        },
        {
          title: '回报兑现',
          purpose: '让读者看到写前准备落成',
          beat: '旧印风险变成可进入禁库的代价。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [writePreparationRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(writePreparationRepair)
    expect(sceneCards[0].required_information).toContain(writePreparationRepair)
    expect(sceneCards[0].used_settings).toContain(writePreparationRepair)
    expect(sceneCards[1].required_beats).toContain(writePreparationRepair)
    expect(sceneCards[2].reader_payoff).toContain(writePreparationRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('写前准备')
    expect(sceneCards[2].serial_risk_repairs).toContain('写前准备')
  })

  test('projects target-reader carry-over into scene reader payoff and action fields', () => {
    const targetReaderRepair = '下一章必须补目标读者：把规则反制爽点写成现场行动，让读者欲望、本章吸引点和可感知回报落到每个场景。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '规则压门',
          purpose: '让规则反制目标入场',
          beat: '协会会长宣布外来维修师不得接旧城订单。',
        },
        {
          title: '现场反制',
          purpose: '用现场行动满足读者欲望',
          beat: '李玄当众拆开旧印编号，逼协会改口。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [targetReaderRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(targetReaderRepair)
    expect(sceneCards[1].purpose_tags).not.toContain(targetReaderRepair)
    expect(sceneCards[0].action_beats).toContain(targetReaderRepair)
    expect(sceneCards[1].action_beats).toContain(targetReaderRepair)
    expect(sceneCards[0].reader_payoff).toContain(targetReaderRepair)
    expect(sceneCards[1].reader_payoff).toContain(targetReaderRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('目标读者')
    expect(sceneCards[1].serial_risk_repairs).toContain('目标读者')
  })

  test('projects conflict-structure carry-over into scene conflict and turning fields', () => {
    const conflictStructureRepair = '下一章必须补冲突结构：每个主要场景都要有真实阻止者、有进无出、行动阻拦和明确胜负变化，解决一条矛盾后激活下一冲突种子。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '协会封门',
          purpose: '让阻止者压住主角目标',
          beat: '协会成员挡在设备间门口。',
        },
        {
          title: '强验旧印',
          purpose: '让胜负结果翻转',
          beat: '李玄强行核验旧印编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [conflictStructureRepair],
        },
      },
    })

    expect(sceneCards[0].conflict).toContain(conflictStructureRepair)
    expect(sceneCards[1].conflict).toContain(conflictStructureRepair)
    expect(sceneCards[0].state_changes_expected).toContain(conflictStructureRepair)
    expect(sceneCards[1].state_changes_expected).toContain(conflictStructureRepair)
    expect(sceneCards[1].turning_point).toContain(conflictStructureRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('冲突结构')
    expect(sceneCards[1].serial_risk_repairs).toContain('冲突结构')
  })

  test('projects genre-positioning carry-over into scene genre promise fields', () => {
    const genrePositioningRepair = '下一章必须补题材定位：把赛博修仙品类卖点写成门派规则、法器交易和旧城升级承诺，不能偏成纯悬疑。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '门规压价',
          purpose: '让门派规则压住法器交易',
          beat: '外门执事按门规压低旧法器估价。',
        },
        {
          title: '旧城升级承诺',
          purpose: '兑现赛博修仙的品类卖点',
          beat: '李玄用阵纹芯片重算旧城灵轨。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [genrePositioningRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(genrePositioningRepair)
    expect(sceneCards[1].purpose_tags).not.toContain(genrePositioningRepair)
    expect(sceneCards[0].required_beats).toContain(genrePositioningRepair)
    expect(sceneCards[1].required_beats).toContain(genrePositioningRepair)
    expect(sceneCards[1].reader_payoff).toContain(genrePositioningRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('题材定位')
    expect(sceneCards[1].serial_risk_repairs).toContain('题材定位')
  })

  test('projects upgrade-rhythm carry-over into scene progression and payoff fields', () => {
    const upgradeRhythmRepair = '下一章必须补升级节奏：本章要给小目标升级、资源增量、能力反馈和新门槛，章尾打开下一层升级压力。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '小目标升级',
          purpose: '拿到旧城灵轨临时权限',
          beat: '李玄用旧印换到一次临时核验。',
        },
        {
          title: '新门槛',
          purpose: '把资源增量转成下一层压力',
          beat: '临时权限只够打开第一段灵轨。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [upgradeRhythmRepair],
        },
      },
    })

    expect(sceneCards[0].action_beats).toContain(upgradeRhythmRepair)
    expect(sceneCards[1].action_beats).toContain(upgradeRhythmRepair)
    expect(sceneCards[0].state_changes_expected).toContain(upgradeRhythmRepair)
    expect(sceneCards[1].reader_payoff).toContain(upgradeRhythmRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(upgradeRhythmRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('升级节奏')
    expect(sceneCards[1].serial_risk_repairs).toContain('升级节奏')
  })

  test('projects continuity-heat carry-over into scene heat handoff fields', () => {
    const continuityHeatRepair = '下一章必须补连续性热度：承接上一章爆点余温，前半章兑现旧热度，中段加新压力，章末留高热未解问题。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '爆点余温',
          purpose: '承接上一章旧印翻面的热度',
          beat: '围观者还在争论旧印编号。',
        },
        {
          title: '高热未解',
          purpose: '章末留下新压力',
          beat: '旧印编号指向更高一层的禁库。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [continuityHeatRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(continuityHeatRepair)
    expect(sceneCards[1].required_beats).toContain(continuityHeatRepair)
    expect(sceneCards[0].information_gap).toContain(continuityHeatRepair)
    expect(sceneCards[1].information_gap).toContain(continuityHeatRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(continuityHeatRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('连续性热度')
    expect(sceneCards[1].serial_risk_repairs).toContain('连续性热度')
  })

  test('projects source-readiness carry-over into scene information and setting fields', () => {
    const sourceReadinessRepair = '下一章必须补来源就绪：旧印编号、禁库权限和林青禾证词都要有来源依据，缺口必须先写入场景信息需求，不能靠正文临时编。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧印复核',
          purpose: '复核旧印编号来源',
          beat: '李玄把旧印编号交给林青禾核验。',
        },
        {
          title: '禁库权限',
          purpose: '确认禁库权限依据',
          beat: '林青禾拿出上一章留下的权限凭条。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [sourceReadinessRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(sourceReadinessRepair)
    expect(sceneCards[1].required_information).toContain(sourceReadinessRepair)
    expect(sceneCards[0].used_settings).toContain(sourceReadinessRepair)
    expect(sceneCards[1].used_settings).toContain(sourceReadinessRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('来源就绪')
    expect(sceneCards[1].serial_risk_repairs).toContain('来源就绪')
  })

  test('projects intent-confirmation carry-over into scene purpose and beat fields', () => {
    const intentConfirmationRepair = '下一章必须补意图确认：所有场景都要服务本章目标“拿到禁库入口”，不能偏去解释旧城历史；每场结束要验证目标推进。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '入口目标',
          purpose: '把本章目标压到场面里',
          beat: '李玄要求先拿禁库入口位置。',
        },
        {
          title: '目标推进',
          purpose: '验证禁库入口是否推进',
          beat: '林青禾指出入口权限还差一枚旧印。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [intentConfirmationRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(intentConfirmationRepair)
    expect(sceneCards[1].purpose_tags).not.toContain(intentConfirmationRepair)
    expect(sceneCards[0].required_beats).toContain(intentConfirmationRepair)
    expect(sceneCards[1].required_beats).toContain(intentConfirmationRepair)
    expect(sceneCards[0].state_changes_expected).toContain(intentConfirmationRepair)
    expect(sceneCards[1].state_changes_expected).toContain(intentConfirmationRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('意图确认')
    expect(sceneCards[1].serial_risk_repairs).toContain('意图确认')
  })

  test('projects chapter-blueprint carry-over into scene beat sequence fields', () => {
    const chapterBlueprintRepair = '下一章必须补章节细纲：按细纲顺序执行 线索确认 -> 行动受阻 -> 付出代价 -> 小胜奖励，不能跳过代价只给奖励。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '线索确认',
          purpose: '确认旧印线索',
          beat: '李玄先确认旧印编号对应禁库。',
        },
        {
          title: '代价小胜',
          purpose: '受阻后付出代价再拿奖励',
          beat: '李玄冒着权限反噬打开第一道门。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [chapterBlueprintRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(chapterBlueprintRepair)
    expect(sceneCards[1].required_beats).toContain(chapterBlueprintRepair)
    expect(sceneCards[0].action_beats).toContain(chapterBlueprintRepair)
    expect(sceneCards[1].action_beats).toContain(chapterBlueprintRepair)
    expect(sceneCards[1].reader_payoff).toContain(chapterBlueprintRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('章节细纲')
    expect(sceneCards[1].serial_risk_repairs).toContain('章节细纲')
  })

  test('projects blueprint-consumption carry-over into scene execution fields', () => {
    const blueprintConsumptionRepair = '下一章必须补 blueprint_consumption_checks：blueprint_field=cost_reward，expected 是行动受阻后付出代价再拿奖励，missing_gap 是正文只给结果没有代价；本章要把缺口写成可见事件和章尾承接。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '行动受阻',
          purpose: '让细纲阻碍先落地',
          beat: '禁库门拒绝旧印权限。',
        },
        {
          title: '代价承接',
          purpose: '用代价换小胜并承接章尾',
          beat: '李玄割开掌心补齐旧印血线。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [blueprintConsumptionRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(blueprintConsumptionRepair)
    expect(sceneCards[0].required_beats).toContain(blueprintConsumptionRepair)
    expect(sceneCards[1].action_beats).toContain(blueprintConsumptionRepair)
    expect(sceneCards[1].state_changes_expected).toContain(blueprintConsumptionRepair)
    expect(sceneCards[1].reader_payoff).toContain(blueprintConsumptionRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(blueprintConsumptionRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('细纲兑现')
    expect(sceneCards[1].serial_risk_repairs).toContain('细纲兑现')
  })

  test('projects word-count carry-over into scene expansion guard fields', () => {
    const wordCountRepair = '下一章必须补 word_count_checks：current_count=2400，target_count=4200，min_required_count=3600；remaining_risk 是正文低于字数下限，但不得靠环境描写、重复情绪或内心独白凑字数，必须扩写动作过程、选择代价、对话交锋和章末钩子铺垫。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '动作过程',
          purpose: '把字数缺口补成动作链',
          beat: '李玄拆开旧印边角。',
        },
        {
          title: '对话代价',
          purpose: '用对话交锋和选择代价补足篇幅',
          beat: '林青禾逼他在保密和救人之间选择。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [wordCountRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(wordCountRepair)
    expect(sceneCards[0].required_beats).toContain(wordCountRepair)
    expect(sceneCards[1].action_beats).toContain(wordCountRepair)
    expect(sceneCards[1].dialogue_goals).toContain(wordCountRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(wordCountRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(wordCountRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('字数执行')
    expect(sceneCards[1].serial_risk_repairs).toContain('字数执行')
  })

  test('projects core-contract carry-over into scene promise and payoff fields', () => {
    const coreContractRepair = '下一章必须补核心契约：核心承诺是旧城规则反制带来可见翻盘，前中后都不能漂移成单纯查案；必须把核心冲突和读者回报写进场景。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '规则压身',
          purpose: '把核心冲突压到现场',
          beat: '旧城管事按规则拒绝李玄入库。',
        },
        {
          title: '规则反制',
          purpose: '兑现旧城规则反制的核心承诺',
          beat: '李玄用旧印反过来锁住管事权限。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [coreContractRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(coreContractRepair)
    expect(sceneCards[1].purpose_tags).not.toContain(coreContractRepair)
    expect(sceneCards[0].conflict).toContain(coreContractRepair)
    expect(sceneCards[1].reader_payoff).toContain(coreContractRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(coreContractRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('核心契约')
    expect(sceneCards[1].serial_risk_repairs).toContain('核心契约')
  })

  test('projects setting-violation carry-over into scene setting guard fields', () => {
    const settingViolationRepair = '下一章必须修复 setting_violations：设定违规-规则触发，旧印只能在禁库门三息内触发，能力代价是左臂失温，物品归属仍属于林青禾；角色认知边界不能提前知道黑塔许可，禁揭设定不得泄露终局门名。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '三息触发',
          purpose: '按正确规则触发旧印',
          beat: '李玄等禁库门第三声落下才按住旧印。',
        },
        {
          title: '认知边界',
          purpose: '守住角色不知道黑塔许可的边界',
          beat: '林青禾只说旧印归她保管，没有说出终局门名。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [settingViolationRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(settingViolationRepair)
    expect(sceneCards[0].used_settings).toContain(settingViolationRepair)
    expect(sceneCards[1].forbidden_settings).toContain(settingViolationRepair)
    expect(sceneCards[1].state_changes_expected).toContain(settingViolationRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(settingViolationRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('设定违规')
    expect(sceneCards[1].serial_risk_repairs).toContain('设定违规')
  })

  test('projects female-audience carry-over into scene emotion and relationship fields', () => {
    const femaleAudienceRepair = '下一章必须补女频长篇：把关系张力、情感选择、女性视角安全感和尊严感写成场景变化，不能只写升级打脸。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '边界选择',
          purpose: '让林青禾作出情感选择',
          beat: '林青禾拒绝替李玄背锅，但主动递出证词。',
        },
        {
          title: '尊严回收',
          purpose: '让关系张力变成尊严感回报',
          beat: '李玄当众承认她的证词价值。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [femaleAudienceRepair],
        },
      },
    })

    expect(sceneCards[0].emotional_tone).toContain(femaleAudienceRepair)
    expect(sceneCards[1].emotional_tone).toContain(femaleAudienceRepair)
    expect(sceneCards[0].character_voice).toContain(femaleAudienceRepair)
    expect(sceneCards[1].state_changes_expected).toContain(femaleAudienceRepair)
    expect(sceneCards[1].reader_payoff).toContain(femaleAudienceRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('女频长篇')
    expect(sceneCards[1].serial_risk_repairs).toContain('女频长篇')
  })

  test('projects chapter-benchmark carry-over into scene benchmark and beat fields', () => {
    const chapterBenchmarkRepair = '下一章必须补章节基准：按对标章节节奏基准安排开局压迫、三段升级和章尾回收，只学节奏不复制桥段。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '开局压迫',
          purpose: '按节奏基准先压主角',
          beat: '旧城管事先关掉禁库外门。',
        },
        {
          title: '章尾回收',
          purpose: '用章尾回收承接下一章',
          beat: '第一道门打开后露出第二层禁令。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [chapterBenchmarkRepair],
        },
      },
    })

    expect(sceneCards[0].benchmark_recall_directives).toContain(chapterBenchmarkRepair)
    expect(sceneCards[1].benchmark_recall_directives).toContain(chapterBenchmarkRepair)
    expect(sceneCards[0].required_beats).toContain(chapterBenchmarkRepair)
    expect(sceneCards[1].required_beats).toContain(chapterBenchmarkRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(chapterBenchmarkRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('章节基准')
    expect(sceneCards[1].serial_risk_repairs).toContain('章节基准')
  })

  test('projects runway carry-over into scene long-line direction fields', () => {
    const runwayRepair = '下一章必须补航线：所有场景都要把旧城禁库线推向主线终点，不能被支线查案带偏；章尾必须留下通往黑塔许可的新航点。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '禁库航点',
          purpose: '把旧城禁库线推向主线',
          beat: '李玄确认禁库权限和黑塔许可有关。',
        },
        {
          title: '黑塔许可',
          purpose: '章尾留下新航点',
          beat: '禁库门后露出黑塔许可编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [runwayRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(runwayRepair)
    expect(sceneCards[1].purpose_tags).not.toContain(runwayRepair)
    expect(sceneCards[0].required_beats).toContain(runwayRepair)
    expect(sceneCards[1].state_changes_expected).toContain(runwayRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(runwayRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('航线')
    expect(sceneCards[1].serial_risk_repairs).toContain('航线')
  })

  test('projects longform-check carry-over into scene serial quality fields', () => {
    const longformRepair = '下一章必须补 longform_checks：recent_5_chapter_progress 无明确进展，payoff_interval 过长，stage_goal_shift 未换挡，next_stage_pull 不足；本章要把长篇专项风险写成阶段目标推进、爽点回报和下一阶段牵引。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '阶段换挡',
          purpose: '推动最近五章停滞的主线',
          beat: '李玄把禁库许可从线索改成当场交易目标。',
        },
        {
          title: '下一阶段',
          purpose: '给读者明确下一阶段牵引',
          beat: '黑塔许可背后浮出试炼名册。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [longformRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(longformRepair)
    expect(sceneCards[0].required_beats).toContain(longformRepair)
    expect(sceneCards[1].state_changes_expected).toContain(longformRepair)
    expect(sceneCards[1].reader_payoff).toContain(longformRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(longformRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('长篇专项')
    expect(sceneCards[1].serial_risk_repairs).toContain('长篇专项')
  })

  test('projects signature-scene carry-over into scene spectacle and payoff fields', () => {
    const signatureSceneRepair = '下一章必须补招牌场面：禁库门开启要有强画面、可传播动作和读者记忆点，用旧印反锁全场权限形成视觉爽点。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧印反锁',
          purpose: '制造招牌动作',
          beat: '李玄把旧印按进门心阵槽。',
        },
        {
          title: '权限倒转',
          purpose: '形成视觉爽点',
          beat: '全场权限灯从红色倒转成金色。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [signatureSceneRepair],
        },
      },
    })

    expect(sceneCards[0].action_beats).toContain(signatureSceneRepair)
    expect(sceneCards[1].action_beats).toContain(signatureSceneRepair)
    expect(sceneCards[0].sensory_anchor).toContain(signatureSceneRepair)
    expect(sceneCards[1].reader_payoff).toContain(signatureSceneRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('招牌场面')
    expect(sceneCards[1].serial_risk_repairs).toContain('招牌场面')
  })

  test('projects story-unit carry-over into scene unit setup and payoff fields', () => {
    const storyUnitRepair = '下一章必须补剧情单元：本章单元要完成 目标建立 -> 阻碍升级 -> 代价选择 -> 结果回收，并把未闭合部分转成下一章承接。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '目标建立',
          purpose: '建立禁库入口目标',
          beat: '李玄明确本章必须拿到禁库入口。',
        },
        {
          title: '结果回收',
          purpose: '回收代价选择并留下承接',
          beat: '禁库打开，但黑塔许可变成下一章压力。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [storyUnitRepair],
        },
      },
    })

    expect(sceneCards[0].purpose_tags).not.toContain(storyUnitRepair)
    expect(sceneCards[0].required_beats).toContain(storyUnitRepair)
    expect(sceneCards[1].required_beats).toContain(storyUnitRepair)
    expect(sceneCards[1].reader_payoff).toContain(storyUnitRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(storyUnitRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('剧情单元')
    expect(sceneCards[1].serial_risk_repairs).toContain('剧情单元')
  })

  test('projects chapter-handoff carry-over into scene opening transition fields', () => {
    const chapterHandoffRepair = '下一章必须补章首承接：第一场先接上一章禁库门开启后的余波、角色状态和未解债务，再把余波转成新目标。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '禁库余波',
          purpose: '承接上一章禁库门开启',
          beat: '门后的冷光还压在众人脸上。',
        },
        {
          title: '新目标',
          purpose: '把未解债务转成新目标',
          beat: '黑塔许可编号逼李玄继续追查。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [chapterHandoffRepair],
        },
      },
    })

    expect(sceneCards[0].transition_from_previous).toContain(chapterHandoffRepair)
    expect(sceneCards[0].required_beats).toContain(chapterHandoffRepair)
    expect(sceneCards[0].state_changes_expected).toContain(chapterHandoffRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(chapterHandoffRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('章首承接')
    expect(sceneCards[1].serial_risk_repairs).toContain('章首承接')
  })

  test('projects opening carry-over into scene first-hook fields', () => {
    const openingRepair = '下一章必须补开篇设计：前50字先给异常、冲突或对话逼问，第一段就让主角进入压力，不能慢写环境。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '冷光逼问',
          purpose: '前50字给异常逼问',
          beat: '禁库门里的冷光照出第二枚旧印。',
        },
        {
          title: '压力推进',
          purpose: '让主角进入压力',
          beat: '管事要求李玄立刻解释旧印来源。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [openingRepair],
        },
      },
    })

    expect(sceneCards[0].opening_hook).toContain(openingRepair)
    expect(sceneCards[0].required_beats).toContain(openingRepair)
    expect(sceneCards[0].conflict).toContain(openingRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('开篇设计')
    expect(sceneCards[1].serial_risk_repairs).toContain('开篇设计')
  })

  test('projects paragraph-hook carry-over into scene paragraph tension fields', () => {
    const paragraphHookRepair = '下一章必须补paragraph_hook：每个小节至少有段落级推进钩子，段尾用新动作、新问题或反应差异推进，不能连续三段平铺。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '段尾动作',
          purpose: '让段尾用新动作推进',
          beat: '李玄把旧印从阵槽里拔出来。',
        },
        {
          title: '段尾问题',
          purpose: '让段尾留下新问题',
          beat: '第二枚旧印背面没有编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [paragraphHookRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(paragraphHookRepair)
    expect(sceneCards[1].required_beats).toContain(paragraphHookRepair)
    expect(sceneCards[0].information_gap).toContain(paragraphHookRepair)
    expect(sceneCards[1].information_gap).toContain(paragraphHookRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('段落钩子')
    expect(sceneCards[1].serial_risk_repairs).toContain('段落钩子')
  })

  test('projects prose-meta carry-over into scene prose craft fields', () => {
    const proseMetaRepair = '下一章必须补正文元信息：正文里不能出现章节标题说明、创作提示、作者备注或“本章将”这类元叙述，所有信息必须写成角色当场感知和行动。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旧印现场',
          purpose: '把信息写成角色感知',
          beat: '李玄看见旧印边缘裂开。',
        },
        {
          title: '禁库动作',
          purpose: '把提示改成当场行动',
          beat: '林青禾按住凭条不让管事拿走。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [proseMetaRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(proseMetaRepair)
    expect(sceneCards[1].prose_craft_directives).toContain(proseMetaRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('正文元信息')
    expect(sceneCards[1].serial_risk_repairs).toContain('正文元信息')
  })

  test('projects punctuation-tone carry-over into scene prose craft fields', () => {
    const punctuationToneRepair = '下一章必须补语气标点：感叹号、破折号、省略号只能服务动作打断、情绪压迫和信息转折，不能连续堆叠制造假高能。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '动作打断',
          purpose: '让标点服务动作打断',
          beat: '管事刚开口，禁库门突然回锁。',
        },
        {
          title: '信息转折',
          purpose: '让标点服务信息转折',
          beat: '旧印编号停在黑塔许可前一位。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [punctuationToneRepair],
        },
      },
    })

    expect(sceneCards[0].prose_craft_directives).toContain(punctuationToneRepair)
    expect(sceneCards[1].prose_craft_directives).toContain(punctuationToneRepair)
    expect(sceneCards[0].style_directives).toContain(punctuationToneRepair)
    expect(sceneCards[1].serial_risk_repairs).toContain('语气标点')
  })

  test('projects style-boundary and sample carry-over into scene style fields', () => {
    const styleBoundaryRepair = '下一章必须补文风边界和风格样本：保留冷静短句和动作后果，但不能复制样本文句、桥段和比喻；叙述视角保持限知。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '冷静短句',
          purpose: '保留冷静短句',
          beat: '李玄松开旧印，没有解释。',
        },
        {
          title: '动作后果',
          purpose: '用动作后果承接风格样本',
          beat: '禁库门又往内退了一寸。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [styleBoundaryRepair],
        },
      },
    })

    expect(sceneCards[0].style_directives).toContain(styleBoundaryRepair)
    expect(sceneCards[1].style_directives).toContain(styleBoundaryRepair)
    expect(sceneCards[0].benchmark_recall_directives).toContain(styleBoundaryRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('文风边界')
    expect(sceneCards[1].serial_risk_repairs).toContain('风格样本')
  })

  test('projects style-sample receipt carry-over into scene sample strategy fields', () => {
    const styleSampleReceiptRepair = '下一章必须复核样章策略回执：style_sample_checks delivered=false，remaining_risk 是叙述节奏、对白比例、角色口吻和情绪转折没有落成正文；本章只学习样章抽象表达策略，不得复制样章桥段、角色名、核心梗或原句。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '节奏改写',
          purpose: '按样章策略调整叙述节奏',
          beat: '李玄先停一息，再把旧印按上缺页。',
        },
        {
          title: '对白比例',
          purpose: '用对白推动情绪转折',
          beat: '林青禾追问来历，李玄只答编号。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [styleSampleReceiptRepair],
        },
      },
    })

    expect(sceneCards[0].style_directives).toContain(styleSampleReceiptRepair)
    expect(sceneCards[0].benchmark_recall_directives).toContain(styleSampleReceiptRepair)
    expect(sceneCards[0].prose_craft_directives).toContain(styleSampleReceiptRepair)
    expect(sceneCards[1].dialogue_goals).toContain(styleSampleReceiptRepair)
    expect(sceneCards[1].required_beats).toContain(styleSampleReceiptRepair)
    expect(sceneCards[0].recent_fatigue_action).toContain(styleSampleReceiptRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('样章策略回执')
    expect(sceneCards[1].serial_risk_repairs).toContain('样章策略回执')
  })

  test('projects payoff-setup carry-over into scene setup and payoff fields', () => {
    const payoffSetupRepair = '下一章必须补爽点铺垫：旧印反锁的打脸 payoff 必须先铺对手施压、规则限制和主角暗手，不能突然给证据爽点。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '对手施压',
          purpose: '先铺对手施压',
          beat: '管事当众宣布旧印无效。',
        },
        {
          title: '反锁打脸',
          purpose: '回收旧印反锁 payoff',
          beat: '李玄用暗手让旧印反锁管事权限。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [payoffSetupRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(payoffSetupRepair)
    expect(sceneCards[1].required_beats).toContain(payoffSetupRepair)
    expect(sceneCards[1].reader_payoff).toContain(payoffSetupRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('爽点铺垫')
    expect(sceneCards[1].serial_risk_repairs).toContain('爽点铺垫')
  })

  test('projects spectator-reaction carry-over into scene audience payoff fields', () => {
    const spectatorReactionRepair = '下一章必须补围观反应：旧印反锁后要写出旁观者分层震惊、专家读懂规则变化和对手失声，放大读者爽点。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '旁观分层',
          purpose: '写出旁观者分层震惊',
          beat: '外门弟子先愣住，长老席随后站起。',
        },
        {
          title: '专家读懂',
          purpose: '让专家解释规则变化',
          beat: '林青禾低声说权限倒转了。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [spectatorReactionRepair],
        },
      },
    })

    expect(sceneCards[0].required_beats).toContain(spectatorReactionRepair)
    expect(sceneCards[1].required_beats).toContain(spectatorReactionRepair)
    expect(sceneCards[0].character_voice).toContain(spectatorReactionRepair)
    expect(sceneCards[1].reader_payoff).toContain(spectatorReactionRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('围观反应')
    expect(sceneCards[1].serial_risk_repairs).toContain('围观反应')
  })

  test('projects foreshadowing-delta carry-over into scene clue and hook fields', () => {
    const foreshadowingDeltaRepair = '下一章必须补伏笔增量：第二枚旧印背面缺编号要作为新伏笔入场，先给可见线索，再留到章尾变成黑塔许可问题。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '缺编号入场',
          purpose: '让第二枚旧印背面缺编号入场',
          beat: '李玄翻到旧印背面，编号处被磨平。',
        },
        {
          title: '黑塔问题',
          purpose: '章尾把缺编号转成新问题',
          beat: '磨平的位置露出黑塔许可的半枚纹路。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [foreshadowingDeltaRepair],
        },
      },
    })

    expect(sceneCards[0].required_information).toContain(foreshadowingDeltaRepair)
    expect(sceneCards[1].required_information).toContain(foreshadowingDeltaRepair)
    expect(sceneCards[0].information_gap).toContain(foreshadowingDeltaRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(foreshadowingDeltaRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('伏笔增量')
    expect(sceneCards[1].serial_risk_repairs).toContain('伏笔增量')
  })

  test('projects character-behavior carry-over into scene action and voice fields', () => {
    const characterBehaviorRepair = '下一章必须补角色行为：先写清李玄的动机链，再让周薄森的反派逻辑从保住账本来源出发。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '证人上堂',
          purpose: '让李玄说明自己为何保护证人',
          beat: '李玄挡在证人身前。',
          character_voice: '李玄说话压低，避免暴露证人来源。',
        },
        {
          title: '执事改口',
          purpose: '让周薄森为了账本来源调整策略',
          beat: '周薄森先扣住账本，再逼证人改口。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [characterBehaviorRepair],
        },
      },
    })

    expect(sceneCards[0].action_beats).toContain(characterBehaviorRepair)
    expect(sceneCards[1].action_beats).toContain(characterBehaviorRepair)
    expect(sceneCards[0].character_voice).toContain(characterBehaviorRepair)
    expect(sceneCards[1].character_voice).toContain(characterBehaviorRepair)
    expect(sceneCards[0].serial_risk_repairs).toContain('角色行为')
    expect(sceneCards[1].serial_risk_repairs).toContain('角色行为')
  })

  test('does not project generic intent carry-over as character behavior', () => {
    const hookRepair = '下一章必须补章级钩子：最后100字留下反派意图的问题，但不提前解释答案。'
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          title: '证人回避',
          purpose: '让证人只说出一半真相',
          beat: '证人避开反派名字。',
        },
        {
          title: '意图未明',
          purpose: '章尾留下新问题',
          beat: '李玄发现反派真正目标另有其物。',
        },
      ],
    }, {
      chapter_target: {
        delivery_risk_carry_over: {
          required_actions: [hookRepair],
        },
      },
    })

    expect(sceneCards[0].information_gap).toContain(hookRepair)
    expect(sceneCards[1].ending_hook_seed).toContain(hookRepair)
    expect(sceneCards[0].action_beats).not.toContain(hookRepair)
    expect(sceneCards[1].action_beats).not.toContain(hookRepair)
    expect(sceneCards[0].serial_risk_repairs).not.toContain('角色行为')
    expect(sceneCards[1].serial_risk_repairs).not.toContain('角色行为')
  })

  test('normalizes camelCase sceneCards from model output', () => {
    const sceneCards = normalizeSceneCardsPayload({
      sceneCards: [
        {
          sceneNo: 2,
          title: '账册翻面',
          sceneType: 'payoff',
          charactersPresent: ['李玄', '林青禾'],
          purposeTag: '爽点',
          purposeTags: ['爽点', '证据反转'],
          requiredBeats: ['翻出缺页', '逼迫执事改口'],
          actionBeats: ['扣住账册', '当众翻面'],
          openingHook: '账册背面有第二道墨痕。',
          readerPayoff: '主角用证据反制栽赃。',
          fearPoint: '执事当场撕页灭证。',
          rulePressure: '审判庭只认纸面证据。',
          informationGap: '第二道墨痕是谁留下的。',
          endingHookSeed: '缺页背后压着第三个名字。',
          characterVoice: '李玄压低声音逼问。',
          stateChangesExpected: [{ asset: '第二本账册', state: '归李玄掌控' }],
          descriptionBudget: 'high',
          transitionFromPrevious: '承接上一场对峙',
          exitState: '执事失去主动权',
        },
      ],
    })

    expect(sceneCards).toHaveLength(1)
    expect(sceneCards[0]).toMatchObject({
      scene_no: 2,
      scene_type: 'payoff',
      characters_present: ['李玄', '林青禾'],
      purpose_tag: '爽点',
      purpose_tags: ['爽点', '证据反转'],
      required_beats: ['翻出缺页', '逼迫执事改口'],
      action_beats: ['扣住账册', '当众翻面'],
      opening_hook: '账册背面有第二道墨痕。',
      reader_payoff: '主角用证据反制栽赃。',
      fear_point: '执事当场撕页灭证。',
      rule_pressure: '审判庭只认纸面证据。',
      information_gap: '第二道墨痕是谁留下的。',
      ending_hook_seed: '缺页背后压着第三个名字。',
      character_voice: '李玄压低声音逼问。',
      state_changes_expected: ['{"asset":"第二本账册","state":"归李玄掌控"}'],
      description_budget: 'high',
      transition_from_previous: '承接上一场对峙',
      exit_state: '执事失去主动权',
    })
  })

  test('detects slow scenery or daily-life openings before the story hook lands', () => {
    const checks = scanOpeningHookRisks([
      '第3章 校门外',
      '',
      '清晨的阳光落在教学楼外，风吹过空荡的操场，窗外的树影慢慢晃动。',
      '李辰照常走进教室，把书包塞进抽屉。',
      '他翻开课本，又把昨天夹好的练习册摊平，粉笔灰从讲台边缘落下来。',
      '走廊里没有脚步声，值日表还贴在门后，所有座位都像平时一样安静。',
      '直到广播响起，所有人才意识到规则变了。',
    ].join('\n'))

    expect(checks.some(item => item.key === 'opening_scenery_or_daily_start')).toBe(true)
    expect(checks.some(item => item.key === 'opening_hook_deadline')).toBe(true)
    expect(checks[0].fix).toContain('前100字')
  })

  test('wires deterministic opening hook risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicOpeningHookChecks = scanOpeningHookRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicOpeningHookChecks')
  })

  test('detects openings without conflict or abnormality in the first 50 characters', () => {
    const checks = scanOpeningFirst50ConflictRisks([
      '第1章 旧楼铃声',
      '',
      '清晨的光落在旧楼台阶上，李岚把钥匙放进口袋，沿着空荡走廊慢慢往前走。',
      '直到门后响起第二个人的呼吸声，他才停下。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_first50_conflict_missing')
    expect(checks[0].label).toBe('前50字冲突异常扫描')
    expect(checks[0].evidence).toContain('清晨的光')
    expect(checks[0].fix).toContain('前 50 字')
    expect(checks[0].fix).toContain('冲突')
  })

  test('does not flag first 50 characters when conflict or abnormality is visible', () => {
    const checks = scanOpeningFirst50ConflictRisks([
      '第1章 旧楼铃声',
      '',
      '门后突然传来第二个人的呼吸声，李岚握紧钥匙，听见锁孔里有人喊他的名字。',
      '清晨的光这才落到旧楼台阶上。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic first-50 conflict risks into opening self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicOpeningFirst50Checks = scanOpeningFirst50ConflictRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicOpeningFirst50Checks')
  })

  test('detects low event density in the first 100 characters of the opening', () => {
    const checks = scanOpeningEventDensityRisks([
      '第3章 校门外',
      '广播响了一声。',
      '走廊的灯光仍旧昏暗，墙皮被雨水泡出细小的裂纹，值夜名单贴在门边，空气里全是潮湿的铁锈味。',
      '李辰站在门口，想到昨天的规则还没有解释清楚。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_event_density_low')
    expect(checks[0].label).toContain('事件密度')
    expect(checks[0].evidence).toContain('事件数')
    expect(checks[0].fix).toContain('前100字')
    expect(checks[0].fix).toContain('至少 3 个事件')
  })

  test('wires deterministic opening event density risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicOpeningEventDensityChecks = scanOpeningEventDensityRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicOpeningEventDensityChecks')
  })

  test('detects openings where the protagonist does not enter within the first 300 characters', () => {
    const checks = scanOpeningProtagonistDelayRisks([
      '第1章 旧校规',
      '',
      '午夜教学楼的广播忽然响起，走廊尽头的红灯一盏接一盏亮起。',
      '校规贴在玻璃门内侧，第一行写着：十点后不得单独离开宿舍。',
      '值夜名单被雨水泡皱，名字旁边的黑点像干涸的血。',
      '三楼钟声停在九点五十九分，楼梯口的安全门自己锁上。',
      '规则册第二页翻开，惩罚栏只剩一行空白。',
      '旧校徽在门缝里轻轻震动，金属背面刻着上一届失踪学生的编号。',
      '宿舍区的电闸一排排跳下去，墙上的考勤屏只剩红色倒影。',
      '第五条校规被墨水盖住半截，只露出“不得回应门外的人”。',
      '公告栏最底下贴着一张旧照片，照片里的操场空无一人，旗杆影子却多出两道。',
      '每一间宿舍门牌都变成同一个数字，走廊尽头的水管开始往外渗黑水。',
      '广播把校规重复到第六遍，惩罚栏里的空白慢慢浮出一枚陌生指纹。',
      '直到第六遍广播响完，李辰才从宿舍床上坐起。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_protagonist_delayed')
    expect(checks[0].label).toBe('开篇主角登场扫描')
    expect(checks[0].evidence).toContain('前300字')
    expect(checks[0].fix).toContain('主角')
    expect(checks[0].fix).toContain('动作')
  })

  test('wires deterministic protagonist delay risks into opening self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicOpeningProtagonistDelayChecks = scanOpeningProtagonistDelayRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicOpeningProtagonistDelayChecks')
  })

  test('detects early openings that miss the title synopsis entry promise', () => {
    const checks = scanEntryPromiseAlignmentRisks(
      {
        title: '血缘系统：我有三位隐藏妈妈',
        synopsis: '主角开局被裁员后觉醒血缘系统，第一次检测就发现三位妈妈身份反常。',
        reference_config: {
          writing_bible: {
            commercial_positioning: {
              selling_points: ['血缘系统检测', '三位妈妈身份反转'],
            },
          },
        },
      },
      {
        chapter_target: {
          chapter_no: 1,
          title: '旧楼铃声',
        },
      },
      [
        '第1章 旧楼铃声',
        '',
        '李岚推开旧楼的门，走廊里只有一盏坏掉的灯。',
        '',
        '广播重复着陌生的校规，所有人必须在十点前回到房间。',
        '',
        '他握紧手里的裁员信，知道今晚不能再出错。',
      ].join('\n'),
    )

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('entry_promise_mismatch')
    expect(checks[0].label).toBe('入口承诺对齐扫描')
    expect(checks[0].evidence).toContain('血缘系统')
    expect(checks[0].fix).toContain('书名')
    expect(checks[0].fix).toContain('简介')
    expect(checks[0].fix).toContain('开篇')
  })

  test('reads camelCase preDraftBrief reader promise for entry promise alignment', () => {
    const checks = scanEntryPromiseAlignmentRisks(
      { title: '旧楼铃声' },
      {
        chapter_target: {
          chapter_no: 1,
          title: '旧楼铃声',
        },
        preDraftBrief: {
          readerPromise: '血缘系统第一次检测揭开三位妈妈身份反转。',
        },
      },
      [
        '第1章 旧楼铃声',
        '',
        '李岚推开旧楼的门，走廊里只有一盏坏掉的灯。',
        '',
        '广播重复着陌生的校规，所有人必须在十点前回到房间。',
        '',
        '他握紧手里的裁员信，知道今晚不能再出错。',
      ].join('\n'),
    )

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('entry_promise_mismatch')
    expect(checks[0].evidence).toContain('血缘系统')
    expect(checks[0].evidence).toContain('三位妈妈')
  })

  test('reads runtime camelCase chapterTarget reader promise for entry promise alignment', () => {
    const checks = scanEntryPromiseAlignmentRisks(
      { title: '旧楼铃声' },
      {
        chapterTarget: {
          chapterNo: 1,
          title: '旧楼铃声',
          readerPromise: '血缘系统第一次检测揭开三位妈妈身份反转。',
        },
      },
      [
        '第1章 旧楼铃声',
        '',
        '李岚推开旧楼的门，走廊里只有一盏坏掉的灯。',
        '',
        '广播重复着陌生的校规，所有人必须在十点前回到房间。',
        '',
        '他握紧手里的裁员信，知道今晚不能再出错。',
      ].join('\n'),
    )

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('entry_promise_mismatch')
    expect(checks[0].evidence).toContain('血缘系统')
    expect(checks[0].evidence).toContain('三位妈妈')
  })

  test('uses runtime camelCase chapterTarget chapter number over stale chapter_target for entry promise alignment', () => {
    const checks = scanEntryPromiseAlignmentRisks(
      { title: '旧楼铃声' },
      {
        chapter_target: {
          chapter_no: 12,
          title: '陈旧章节',
        },
        chapterTarget: {
          chapterNo: 1,
          title: '旧楼铃声',
          readerPromise: '血缘系统第一次检测揭开三位妈妈身份反转。',
        },
      },
      [
        '第1章 旧楼铃声',
        '',
        '李岚推开旧楼的门，走廊里只有一盏坏掉的灯。',
        '',
        '广播重复着陌生的校规，所有人必须在十点前回到房间。',
      ].join('\n'),
    )

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('entry_promise_mismatch')
    expect(checks[0].evidence).toContain('血缘系统')
  })

  test('does not flag entry promise alignment when the opening shows the promised hook', () => {
    const checks = scanEntryPromiseAlignmentRisks(
      {
        title: '血缘系统：我有三位隐藏妈妈',
        synopsis: '主角开局被裁员后觉醒血缘系统，第一次检测就发现三位妈妈身份反常。',
        reference_config: {
          writing_bible: {
            commercial_positioning: {
              selling_points: ['血缘系统检测', '三位妈妈身份反转'],
            },
          },
        },
      },
      {
        chapter_target: {
          chapter_no: 1,
          title: '第一次检测',
        },
      },
      [
        '第1章 第一次检测',
        '',
        '李岚把裁员信塞进口袋，眼前忽然弹出血缘系统的蓝色面板。',
        '',
        '第一次检测结果跳出来：三位妈妈的身份栏全部亮成红色。',
      ].join('\n'),
    )

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic entry promise alignment into opening self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEntryPromiseChecks = scanEntryPromiseAlignmentRisks(project, contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicEntryPromiseChecks')
  })

  test('detects openings that do not surface the planned core conflict early', () => {
    const checks = scanOpeningConflictAlignmentRisks({
      chapter_target: {
        chapter_no: 12,
        conflict: '执事设局阻拦主角参加试炼',
      },
    }, [
      '第12章 试炼资格',
      '',
      '晨光落在演武场边，石阶被雨水洗得发亮。',
      '李玄把书册收进袖中，沿着长廊往前走。',
      '远处钟声响了三下，弟子们陆续聚到看台下。',
      '他想起昨夜没有睡好，只能先整理呼吸。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_core_conflict_missing')
    expect(checks[0].label).toBe('开篇核心冲突扫描')
    expect(checks[0].evidence).toContain('执事设局阻拦主角参加试炼')
    expect(checks[0].fix).toContain('前 300 字')
    expect(checks[0].fix).toContain('本章核心矛盾')
  })

  test('reads camelCase preDraftBrief core conflict for opening alignment scan', () => {
    const checks = scanOpeningConflictAlignmentRisks({
      preDraftBrief: {
        coreConflict: '执事设局阻拦主角参加试炼',
      },
    }, [
      '第12章 试炼资格',
      '',
      '晨光落在演武场边，石阶被雨水洗得发亮。',
      '李玄把书册收进袖中，沿着长廊往前走。',
      '远处钟声响了三下，弟子们陆续聚到看台下。',
      '他想起昨夜没有睡好，只能先整理呼吸。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_core_conflict_missing')
    expect(checks[0].evidence).toContain('执事设局阻拦主角参加试炼')
  })

  test('reads runtime camelCase chapterTarget core conflict for opening alignment scan', () => {
    const checks = scanOpeningConflictAlignmentRisks({
      chapterTarget: {
        chapterNo: 12,
        coreConflict: '执事设局阻拦主角参加试炼',
      },
    }, [
      '第12章 试炼资格',
      '',
      '晨光落在演武场边，石阶被雨水洗得发亮。',
      '李玄把书册收进袖中，沿着长廊往前走。',
      '远处钟声响了三下，弟子们陆续聚到看台下。',
      '他想起昨夜没有睡好，只能先整理呼吸。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_core_conflict_missing')
    expect(checks[0].evidence).toContain('执事设局阻拦主角参加试炼')
  })

  test('does not flag opening conflict alignment when the planned obstacle appears early', () => {
    const checks = scanOpeningConflictAlignmentRisks({
      chapter_target: {
        chapter_no: 12,
        conflict: '执事设局阻拦主角参加试炼',
      },
    }, [
      '第12章 试炼资格',
      '',
      '执事在演武场门口拦住李玄，把试炼名册当众合上。',
      '“你的资格作废。”',
      '李玄抬头，看见名册边角压着昨夜那枚残阵印。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic opening conflict alignment into opening self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicOpeningConflictChecks = scanOpeningConflictAlignmentRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicOpeningConflictChecks')
  })

  test('detects summary-style endings that do not leave a page-turn hook', () => {
    const checks = scanEndingHookRisks([
      '李辰关上门，教室终于安静下来。',
      '经历了这一切，他明白自己必须更加努力。',
      '新的生活才刚刚开始。',
    ].join('\n'))

    expect(checks.some(item => item.key === 'ending_summary_without_hook')).toBe(true)
    expect(checks.some(item => item.key === 'ending_hook_missing')).toBe(true)
    expect(checks[0].fix).toContain('最后100字')
  })

  test('wires deterministic ending hook risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEndingHookChecks = scanEndingHookRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicEndingHookChecks')
  })

  test('detects important clues that suddenly appear at the ending without warmup', () => {
    const checks = scanSuddenEndingClueRisks([
      '第8章 审判庭',
      '',
      '李玄把执事逼退半步，审判庭终于安静下来。',
      '',
      '众人开始整理散落的卷宗，林青禾低声问他下一步怎么办。',
      '',
      '他正要离开，桌下突然掉出第二本账册，夹页里还露出禁地钥匙。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('sudden_ending_clue_without_warmup')
    expect(checks[0].label).toBe('章尾线索预热扫描')
    expect(checks[0].evidence).toContain('突然掉出第二本账册')
    expect(checks[0].fix).toContain('预热')
    expect(checks[0].fix).toContain('章尾')
  })

  test('does not flag ending clues that were warmed up earlier in the chapter', () => {
    const checks = scanSuddenEndingClueRisks([
      '第8章 审判庭',
      '',
      '审判开始前，李玄注意到桌下抽屉合不严，旧账册缺页卡在缝里。',
      '',
      '林青禾拖住证人时，他用指腹摸到夹层里有一枚钥匙齿痕。',
      '',
      '他正要离开，桌下突然掉出第二本账册，夹页里还露出禁地钥匙。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic sudden ending clue risks into chapter hook checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSuddenEndingClueChecks = scanSuddenEndingClueRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicSuddenEndingClueChecks')
  })

  test('detects missing ending contract state or next chapter pull when only a question is visible', () => {
    const contextPackage = {
      chapter_target: {
        chapter_blueprint: {
          ending_contract: {
            final_state: '江辰公开旧账后被逐出内门候选名单。',
            unresolved_question: '第二本账册是谁藏进禁库的。',
            next_chapter_pull: '江辰必须在子时前潜入禁库查第二本账册。',
          },
        },
      },
    }

    const checks = scanEndingContractExecutionRisks(contextPackage, [
      '第12章 旧账',
      '',
      '江辰盯着账册缺页，终于问出口：“第二本账册是谁藏进禁库的？”',
    ].join('\n'))

    expect(checks.some(item => item.key === 'ending_contract_missing_final_state_and_next_chapter_pull')).toBe(true)
    expect(checks[0].fix).toContain('收束状态')
    expect(checks[0].fix).toContain('下一章推动力')
  })

  test('reads direct camelCase ending contract from preDraftBrief during deterministic review', () => {
    const contextPackage = {
      preDraftBrief: {
        endingContract: {
          finalState: '江辰公开旧账后被逐出内门候选名单。',
          unresolvedQuestion: '第二本账册是谁藏进禁库的。',
          nextChapterPull: '江辰必须在子时前潜入禁库查第二本账册。',
        },
      },
    }

    const checks = scanEndingContractExecutionRisks(contextPackage, [
      '第12章 旧账',
      '',
      '江辰盯着账册缺页，终于问出口：“第二本账册是谁藏进禁库的？”',
    ].join('\n'))

    expect(checks.some(item => item.key === 'ending_contract_missing_final_state_and_next_chapter_pull')).toBe(true)
    expect(checks[0].fix).toContain('收束状态')
    expect(checks[0].fix).toContain('下一章推动力')
  })

  test('reads runtime camelCase chapterTarget endingContract during deterministic review', () => {
    const contextPackage = {
      chapterTarget: {
        chapterNo: 12,
        title: '旧账',
        endingContract: {
          finalState: '江辰公开旧账后被逐出内门候选名单。',
          unresolvedQuestion: '第二本账册是谁藏进禁库的。',
          nextChapterPull: '江辰必须在子时前潜入禁库查第二本账册。',
        },
      },
    }

    const checks = scanEndingContractExecutionRisks(contextPackage, [
      '第12章 旧账',
      '',
      '江辰盯着账册缺页，终于问出口：“第二本账册是谁藏进禁库的？”',
    ].join('\n'))

    expect(checks.some(item => item.key === 'ending_contract_missing_final_state_and_next_chapter_pull')).toBe(true)
    expect(checks[0].fix).toContain('收束状态')
    expect(checks[0].fix).toContain('下一章推动力')
  })

  test('does not flag ending contract when state question and next pull are visible in the tail', () => {
    const contextPackage = {
      chapter_target: {
        chapter_blueprint: {
          ending_contract: {
            final_state: '江辰公开旧账后被逐出内门候选名单。',
            unresolved_question: '第二本账册是谁藏进禁库的。',
            next_chapter_pull: '江辰必须在子时前潜入禁库查第二本账册。',
          },
        },
      },
    }

    const checks = scanEndingContractExecutionRisks(contextPackage, [
      '江辰公开旧账，执事当场把他的内门候选玉牌摘下。',
      '他被逐出内门候选名单，只剩账册缺页贴在掌心。',
      '“第二本账册是谁藏进禁库的？”',
      '子时前，他必须潜入禁库查清第二本账册，否则旧账会被彻底封死。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic ending contract risks into chapter hook checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEndingContractChecks = scanEndingContractExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicEndingContractChecks')
  })

  test('detects opening hooks that are neither paid off nor carried forward at the ending', () => {
    const checks = scanOpeningHookEchoRisks([
      '第10章 公审台',
      '',
      '证据刚摆上桌就被执事当众撕毁，碎纸落在李辰脚边。',
      '',
      '台下的人跟着起哄，催他立刻认罪。',
      '',
      '李辰穿过侧门，按照旧流程完成了内门报名。',
      '',
      '夜色落下来，他终于可以回去休息。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_hook_not_echoed')
    expect(checks[0].label).toBe('开篇钩子回收扫描')
    expect(checks[0].evidence).toContain('证据')
    expect(checks[0].fix).toContain('回收')
  })

  test('does not flag opening hooks when the ending pays off or converts the hook into a next debt', () => {
    const checks = scanOpeningHookEchoRisks([
      '第10章 公审台',
      '',
      '证据刚摆上桌就被执事当众撕毁，碎纸落在李辰脚边。',
      '',
      '台下的人跟着起哄，催他立刻认罪。',
      '',
      '李辰把碎纸背面的半枚印章拼回去，执事脸色第一次变了。',
      '',
      '那枚印章不是执事的，背后的名字指向审判长。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic opening-hook echo risks into chapter hook self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicOpeningHookEchoChecks = scanOpeningHookEchoRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicOpeningHookEchoChecks')
  })

  test('detects golden-three launch execution gaps in the first chapter', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 1,
        golden_three_brief: {
          version: 'oh_story_golden_three_v1',
          chapter_no: 1,
          phase_label: '第一章启动',
          current_chapter_payoffs: ['主角用残阵反证栽赃'],
          payoff_target_count: 2,
        },
      },
    }

    const checks = scanGoldenThreeExecutionRisks(contextPackage, [
      '第1章 残阵开局',
      '',
      '九州大陆的阵修体系分为九品，寒门弟子必须从最基础的聚灵纹开始，宗门历史可以追溯到三百年前。',
      '外门规矩很多，阵堂规矩更多，每一条规矩都关系到弟子的未来。',
      '这一切都说明，属于他的故事才刚刚开始。',
    ].join('\n'))

    expect(checks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'golden_three_opening_hook_missing',
      'golden_three_protagonist_missing',
      'golden_three_event_missing',
      'golden_three_worldbuilding_infodump',
      'golden_three_payoff_missing',
      'golden_three_ending_hook_missing',
    ]))
    expect(checks.map((item: any) => item.label)).toContain('黄金三章启动扫描')
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('第一章前 500 字')
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('大段世界观说明')
  })

  test('reads runtime camelCase chapterTarget goldenThreeBrief during deterministic review', () => {
    const contextPackage = {
      chapterTarget: {
        chapterNo: 1,
        goldenThreeBrief: {
          version: 'oh_story_golden_three_v1',
          chapterNo: 1,
          phaseLabel: '第一章启动',
          currentChapterPayoffs: ['主角用残阵反证栽赃'],
          payoffTargetCount: 2,
        },
      },
    }

    const checks = scanGoldenThreeExecutionRisks(contextPackage, [
      '第1章 残阵开局',
      '',
      '九州大陆的阵修体系分为九品，寒门弟子必须从最基础的聚灵纹开始，宗门历史可以追溯到三百年前。',
      '外门规矩很多，阵堂规矩更多，每一条规矩都关系到弟子的未来。',
      '这一切都说明，属于他的故事才刚刚开始。',
    ].join('\n'))

    expect(checks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'golden_three_opening_hook_missing',
      'golden_three_protagonist_missing',
      'golden_three_event_missing',
      'golden_three_worldbuilding_infodump',
      'golden_three_payoff_missing',
      'golden_three_ending_hook_missing',
    ]))
  })

  test('does not flag golden-three launch when first chapter delivers hook protagonist payoff and ending question', () => {
    const contextPackage = {
      chapter_target: {
        chapter_no: 1,
        golden_three_brief: {
          version: 'oh_story_golden_three_v1',
          chapter_no: 1,
          phase_label: '第一章启动',
          current_chapter_payoffs: ['李玄用残阵反证执事栽赃'],
          payoff_target_count: 2,
        },
      },
    }

    const checks = scanGoldenThreeExecutionRisks(contextPackage, [
      '第1章 残阵开局',
      '',
      '阵堂门突然炸开，李玄一把按住飞来的阵图碎片，掌心立刻渗出血。',
      '执事冷声逼问：“偷阵图的人是不是你？”',
      '李玄没有退，反手把残阵纹路压在桌上，当众反证执事栽赃。',
      '旁观弟子从怀疑到沉默，阵图背面却露出第二层阵纹。',
      '第二层阵纹为什么只在他掌心流血时显形？',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic golden-three risks into quality audit checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicGoldenThreeChecks = scanGoldenThreeExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicGoldenThreeChecks')
  })

  test('detects consecutive paragraphs without paragraph-level hook signals', () => {
    const checks = scanParagraphHookStallRisks([
      '第8章 雨夜',
      '',
      '雨水顺着旧楼外墙往下淌，窗框边缘积着灰。',
      '',
      '走廊尽头的灯亮得很慢，墙面被照出一层发黄的斑。',
      '',
      '李辰站在门边，衣袖被冷风吹得贴住手腕。',
      '',
      '桌上的课本摊开着，纸页边角微微卷起。',
      '',
      '广播忽然响起：“十秒后核验身份。”',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('paragraph_hook_stall_1_4')
    expect(checks[0].label).toBe('段落级钩子扫描')
    expect(checks[0].evidence).toContain('第1-4段')
    expect(checks[0].fix).toContain('信息差')
    expect(checks[0].fix).toContain('倒计时')
    expect(checks[0].fix).toContain('异常物件')
  })

  test('wires deterministic paragraph hook stall risks into paragraph hook self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicParagraphHookStallChecks = scanParagraphHookStallRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicParagraphHookStallChecks')
  })

  test('detects crowd-only shock without layered observer payoff', () => {
    const checks = scanShockLayeringRisks([
      '第9章 公审台',
      '',
      '李辰把检测报告摔在桌上，屏幕里的数值一路飙红。',
      '',
      '全场瞬间震惊，所有人都倒吸一口凉气，现场一片哗然。',
      '',
      '众人面面相觑，没有人说得出话来。',
      '',
      '他收回报告，转身走下台。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('shock_layering_crowd_only_2')
    expect(checks[0].label).toBe('震惊分层扫描')
    expect(checks[0].evidence).toContain('全场瞬间震惊')
    expect(checks[0].fix).toContain('围观者质量层级')
    expect(checks[0].fix).toContain('懂行')
  })

  test('does not flag shock when an expert observer reveals why it matters', () => {
    const checks = scanShockLayeringRisks([
      '第9章 公审台',
      '',
      '李辰把检测报告摔在桌上，屏幕里的数值一路飙红。',
      '',
      '全场瞬间震惊，所有人都倒吸一口凉气。',
      '',
      '主考官脸色变了：“这个数值意味着他不是作弊，而是把旧记录翻了三倍。”',
      '',
      '台下那几个刚才嘲笑他的学生同时闭上了嘴。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects public payoff scenes without differentiated spectator reactions', () => {
    const checks = scanSpectatorReactionDifferentiationRisks([
      '第9章 公审台',
      '',
      '李辰把第二本账册摊开，当众反证周薄森的指控。',
      '',
      '全场瞬间震惊，所有人都倒吸一口凉气，现场一片哗然。',
      '',
      '周薄森脸色发白，事情终于真相大白。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('spectator_reaction_unified')
    expect(checks[0].label).toBe('围观反应分层')
    expect(checks[0].evidence).toContain('全场瞬间震惊')
    expect(checks[0].fix).toContain('普通人')
    expect(checks[0].fix).toContain('懂行者')
    expect(checks[0].fix).toContain('反派')
  })

  test('does not flag public payoff scenes with layered spectator reactions', () => {
    const checks = scanSpectatorReactionDifferentiationRisks([
      '第9章 公审台',
      '',
      '李辰把第二本账册摊开，当众反证周薄森的指控。',
      '',
      '旁听席先炸开，几个刚才起哄的商户停住脚步，不敢再跟着喊。',
      '',
      '账房老吏把算盘珠拨回去，低声说：“这页墨色是三年前的，周家账册对不上。”',
      '',
      '周薄森脸色发白，按住桌角往后退了半步。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('builds spectator reaction sync report from public payoff delivery', () => {
    const okReport = buildSpectatorReactionSyncReport(
      { title: '公审账册' },
      { id: 9, chapter_no: 9, title: '公审台' },
      {},
      [
        '李辰把第二本账册摊开，当众反证周薄森的指控。',
        '旁听席先炸开，几个刚才起哄的商户停住脚步，不敢再跟着喊。',
        '账房老吏把算盘珠拨回去，低声说：“这页墨色是三年前的。”',
        '周薄森脸色发白，按住桌角往后退了半步。',
      ].join('\n'),
    )
    const warnReport = buildSpectatorReactionSyncReport(
      { title: '公审账册' },
      { id: 9, chapter_no: 9, title: '公审台' },
      {},
      [
        '李辰把第二本账册摊开，当众反证周薄森的指控。',
        '全场瞬间震惊，所有人都倒吸一口凉气，现场一片哗然。',
        '周薄森脸色发白，事情终于真相大白。',
      ].join('\n'),
    )

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('围观反应 OK')
    expect(okReport.missed_count).toBe(0)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('围观反应缺口')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('spectator_reaction_unified')
    expect(warnReport.next_actions.join('；')).toContain('差异化反应')
  })

  test('wires deterministic shock layering risks into paragraph hook self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicShockLayeringChecks = scanShockLayeringRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicShockLayeringChecks')
  })

  test('detects evidence payoff without prior setup', () => {
    const checks = scanPayoffSetupRisks([
      '第10章 公审台',
      '',
      '李辰站在台前，灯光照得他脸色发白。',
      '',
      '对面的人冷笑着催他认输，台下也有人跟着起哄。',
      '',
      '他突然拿出一份检测报告，当众打脸所有质疑者。',
      '',
      '真相公开后，反派脸色惨白，再也说不出话。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('payoff_without_setup_3')
    expect(checks[0].label).toBe('爽点铺垫扫描')
    expect(checks[0].evidence).toContain('检测报告')
    expect(checks[0].fix).toContain('证据链')
    expect(checks[0].fix).toContain('铺垫')
  })

  test('does not flag evidence payoff when prior clues establish the setup', () => {
    const checks = scanPayoffSetupRisks([
      '第10章 公审台',
      '',
      '李辰把手机倒扣在掌心，录音键还亮着红点。',
      '',
      '他昨晚从档案室带出的检测报告，被他压在外套里。',
      '',
      '对面的人冷笑着催他认输，台下也有人跟着起哄。',
      '',
      '他这才把检测报告摊开，当众打脸所有质疑者。',
      '',
      '真相公开后，反派脸色惨白，再也说不出话。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('builds payoff setup sync report from evidence payoff setup risks', () => {
    const okReport = buildPayoffSetupSyncReport(
      { title: '公审账册' },
      { id: 10, chapter_no: 10, title: '公审台' },
      {},
      [
        '李辰把手机倒扣在掌心，录音键还亮着红点。',
        '他昨晚从档案室带出的检测报告，被他压在外套里。',
        '对面的人冷笑着催他认输，台下也有人跟着起哄。',
        '他这才把检测报告摊开，当众打脸所有质疑者。',
        '真相公开后，反派脸色惨白，再也说不出话。',
      ].join('\n'),
    )
    const warnReport = buildPayoffSetupSyncReport(
      { title: '公审账册' },
      { id: 10, chapter_no: 10, title: '公审台' },
      {},
      [
        '李辰站在台前，灯光照得他脸色发白。',
        '',
        '对面的人冷笑着催他认输，台下也有人跟着起哄。',
        '',
        '他突然拿出一份检测报告，当众打脸所有质疑者。',
        '',
        '真相公开后，反派脸色惨白，再也说不出话。',
      ].join('\n'),
    )

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('爽点铺垫 OK')
    expect(okReport.missed_count).toBe(0)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('爽点铺垫缺口')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('payoff_without_setup_3')
    expect(warnReport.next_actions.join('；')).toContain('可指认的危机')
  })

  test('wires deterministic payoff setup risks into quality audit self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicPayoffSetupChecks = scanPayoffSetupRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicPayoffSetupChecks')
  })

  test('detects face-slap payoff without antagonist pressure or gloating first', () => {
    const checks = scanFaceSlapRhythmRisks([
      '第10章 公审台',
      '',
      '李辰把昨晚留下的录音备份按在掌心。',
      '',
      '他走到审判桌前，把检测报告摊开。',
      '',
      '报告上的数值直接反证旧账册，所有人都知道执事栽赃失败。',
      '',
      '执事脸色惨白，再也说不出话。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('face_slap_without_antagonist_pressure')
    expect(checks[0].label).toBe('打脸节奏扫描')
    expect(checks[0].evidence).toContain('检测报告')
    expect(checks[0].fix).toContain('反派')
    expect(checks[0].fix).toContain('得意')
  })

  test('does not flag face-slap payoff when antagonist pressure sets up the reversal', () => {
    const checks = scanFaceSlapRhythmRisks([
      '第10章 公审台',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼李辰认罪。',
      '',
      '台下的人跟着起哄，催他现在就交出阵牌。',
      '',
      '李辰把昨晚留下的录音备份按在掌心。',
      '',
      '他这才把检测报告摊开，当众反证旧账册。',
      '',
      '执事脸色惨白，再也说不出话。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic face-slap rhythm risks into reversal self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicFaceSlapRhythmChecks = scanFaceSlapRhythmRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicFaceSlapRhythmChecks')
  })

  test('detects revenge evidence chains dumped all at once instead of released in steps', () => {
    const checks = scanEvidenceChainDumpRisks([
      '第10章 公审台',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼李辰认罪。',
      '',
      '李辰没有争辩。',
      '',
      '他把录音、监控视频、检测报告和转账截图一起投到大屏上，旧账册当场被反证。',
      '',
      '执事脸色惨白，再也说不出话。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('evidence_chain_dumped_once')
    expect(checks[0].label).toBe('证据链分批释放扫描')
    expect(checks[0].evidence).toContain('录音')
    expect(checks[0].fix).toContain('分批释放')
    expect(checks[0].fix).toContain('最终证据')
  })

  test('does not flag evidence chains when clues and evidence are released in stages', () => {
    const checks = scanEvidenceChainDumpRisks([
      '第10章 公审台',
      '',
      '李辰把手机倒扣在掌心，录音红点还亮着。',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼他认罪。',
      '',
      '台下有人指出昨晚监控少了三分钟，执事脸上的笑僵了一下。',
      '',
      '李辰这才把检测报告推到灯下，报告编号正好对应那三分钟。',
      '',
      '最后，他亮出转账截图，执事的名字压在收款栏里。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic evidence-chain dump risks into reversal self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEvidenceChainDumpChecks = scanEvidenceChainDumpRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicEvidenceChainDumpChecks')
  })

  test('detects evidence chains whose final evidence does not change the global understanding', () => {
    const checks = scanFinalEvidenceImpactRisks([
      '第10章 公审台',
      '',
      '李辰先放出录音，证明执事昨晚改过证词。',
      '',
      '台下有人指出监控少了三分钟，执事脸上的笑僵了一下。',
      '',
      '李辰最后把检测报告推到灯下，报告显示旧账册上的墨迹确实更晚。',
      '',
      '执事脸色发白，没人再替他说话。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('final_evidence_lacks_global_impact')
    expect(checks[0].label).toBe('最终证据强度扫描')
    expect(checks[0].evidence).toContain('检测报告')
    expect(checks[0].fix).toContain('最终证据')
    expect(checks[0].fix).toContain('全局认知')
  })

  test('does not flag evidence chains when the final evidence reveals the decisive global turn', () => {
    const checks = scanFinalEvidenceImpactRisks([
      '第10章 公审台',
      '',
      '李辰先放出录音，证明执事昨晚改过证词。',
      '',
      '台下有人指出监控少了三分钟，执事脸上的笑僵了一下。',
      '',
      '李辰最后亮出转账截图，收款人不是执事，而是审判长本人。',
      '',
      '公审台彻底变了性质，旧账册不再是私人栽赃，而是整个审判庭的黑幕资金链。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic final-evidence impact risks into reversal self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicFinalEvidenceImpactChecks = scanFinalEvidenceImpactRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicFinalEvidenceImpactChecks')
  })

  test('detects evidence chains without a protagonist-planted time-bomb proof', () => {
    const checks = scanEvidenceTimeBombRisks([
      '第10章 公审台',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼李辰认罪。',
      '',
      '李辰先放出录音，证明执事昨晚改过证词。',
      '',
      '台下有人指出监控少了三分钟，执事脸上的笑僵了一下。',
      '',
      '李辰最后亮出转账截图，收款人不是执事，而是审判长本人。',
      '',
      '公审台彻底变了性质，旧账册不再是私人栽赃，而是整个审判庭的黑幕资金链。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('evidence_time_bomb_missing')
    expect(checks[0].label).toBe('定时炸弹证据扫描')
    expect(checks[0].evidence).toContain('录音')
    expect(checks[0].fix).toContain('定时炸弹')
    expect(checks[0].fix).toContain('提前')
  })

  test('does not flag evidence chains when the protagonist planted delayed proof before the payoff', () => {
    const checks = scanEvidenceTimeBombRisks([
      '第10章 公审台',
      '',
      '李辰把手机倒扣在掌心，录音红点从开场就亮着。',
      '',
      '他昨晚提前把备份文件设成定时发送，只等审判长亲口否认。',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼李辰认罪。',
      '',
      '李辰先放出录音，证明执事昨晚改过证词。',
      '',
      '台下有人指出监控少了三分钟，执事脸上的笑僵了一下。',
      '',
      '李辰最后亮出转账截图，收款人不是执事，而是审判长本人。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic evidence time-bomb risks into reversal self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEvidenceTimeBombChecks = scanEvidenceTimeBombRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicEvidenceTimeBombChecks')
  })

  test('detects antagonist downfall that is unrelated to protagonist action', () => {
    const checks = scanAntagonistDownfallAgencyRisks([
      '第10章 公审台',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼李辰认罪。',
      '',
      '李辰还没来得及开口，警局的人突然冲进大厅。',
      '',
      '执事当场被带走，资格被取消，所有人都知道他再也翻不了身。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('antagonist_downfall_without_protagonist_agency')
    expect(checks[0].label).toBe('反派结局因果扫描')
    expect(checks[0].evidence).toContain('执事当场被带走')
    expect(checks[0].fix).toContain('主角行动')
  })

  test('does not flag antagonist downfall when protagonist action causes the collapse', () => {
    const checks = scanAntagonistDownfallAgencyRisks([
      '第10章 公审台',
      '',
      '李辰把提前备份的录音推到审判桌上，只问执事一句：“这段话也是我伪造的？”',
      '',
      '执事下意识否认，屏幕上的转账截图却自动跳出他的名字。',
      '',
      '审判长当场取消执事资格，警局的人顺着李辰提交的证据把他带走。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic antagonist-downfall agency risks into reversal self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicAntagonistDownfallAgencyChecks = scanAntagonistDownfallAgencyRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicAntagonistDownfallAgencyChecks')
  })

  test('detects revenge face-slap scenes where the protagonist loses composure without a calm action anchor', () => {
    const checks = scanProtagonistComposureRisks({
      chapter_target: {
        genre_positioning_contract: { genre_tags: ['复仇', '打脸'] },
        character_behavior_contract: { protagonist_name: '江辰' },
      },
    }, [
      '第12章 长案灯下',
      '',
      '执事把旧账册摔到长案上，冷笑着逼江辰低头。',
      '',
      '江辰猛地吼道：“你们凭什么这样对我！我明明没有碰过账册，你们都在撒谎！”',
      '',
      '他气得浑身发抖，眼眶发红，冲上去和执事争抢账册。',
      '',
      '执事仍旧靠在椅背上，只说他现在已经输了。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('protagonist_composure_missing')
    expect(checks[0].label).toBe('主角冷静度扫描')
    expect(checks[0].evidence).toContain('江辰猛地吼道')
    expect(checks[0].fix).toContain('冷静动作')
    expect(checks[0].fix).toContain('反派')
  })

  test('reads runtime camelCase chapterTarget face-slap context for protagonist composure scan', () => {
    const checks = scanProtagonistComposureRisks({
      chapter_target: {
        chapter_no: 12,
        title: '长案灯下',
      },
      chapterTarget: {
        summary: '江辰当众反证执事栽赃，完成公审打脸。',
        genrePositioningContract: { genreTags: ['复仇', '打脸'] },
        characterBehaviorContract: { protagonistName: '江辰' },
      },
    }, [
      '第12章 长案灯下',
      '',
      '执事把旧账册摔到长案上，冷笑着逼江辰低头。',
      '',
      '江辰猛地吼道：“你们凭什么这样对我！我明明没有碰过账册，你们都在撒谎！”',
      '',
      '他气得浑身发抖，眼眶发红，冲上去和执事争抢账册。',
      '',
      '执事仍旧靠在椅背上，只说他现在已经输了。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('protagonist_composure_missing')
    expect(checks[0].evidence).toContain('江辰猛地吼道')
  })

  test('does not flag face-slap scenes when the protagonist stays controlled and the antagonist loses ground', () => {
    const checks = scanProtagonistComposureRisks({
      chapter_target: {
        genre_positioning_contract: { genre_tags: ['复仇', '打脸'] },
        character_behavior_contract: { protagonist_name: '江辰' },
      },
    }, [
      '第12章 公审反证',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼江辰认罪。',
      '',
      '江辰没有争辩，只把袖口压平，指尖按住账册缺页。',
      '',
      '“第三页，念。”',
      '',
      '执事脸色骤变，声音拔高：“不可能，那一页早就被烧了！”',
      '',
      '江辰把备份账册推到灯下。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic protagonist composure risks into character behavior self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicProtagonistComposureChecks = scanProtagonistComposureRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicProtagonistComposureChecks')
  })

  test('detects false suspense when a threat is immediately dismissed without cost', () => {
    const checks = scanSuspenseFalseAlarmRisks([
      '第9章 红灯',
      '',
      '广播忽然响起：“十秒后核验身份，失败者会被清除。”',
      '',
      '李辰刚把学生证按上去，感应区亮起刺眼红光。',
      '',
      '不过那只是系统误报，红光很快自己熄灭，大家都松了一口气。',
      '',
      '他们继续往楼上走。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('false_suspense_immediate_release_1_3')
    expect(checks[0].label).toBe('假悬念扫描')
    expect(checks[0].evidence).toContain('失败者会被清除')
    expect(checks[0].evidence).toContain('只是系统误报')
    expect(checks[0].fix).toContain('不能立刻解除')
    expect(checks[0].fix).toContain('新困境')
  })

  test('wires deterministic false suspense risks into suspense self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSuspenseFalseAlarmChecks = scanSuspenseFalseAlarmRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicSuspenseFalseAlarmChecks')
  })

  test('detects withheld suspense information without story reason cost or clue', () => {
    const checks = scanSuspenseWithheldInfoRisks([
      '第9章 门后名字',
      '',
      '李辰追问：“名单上第三个名字到底是谁？”',
      '',
      '管理员摇头：“现在还不能说。”',
      '',
      '张智皱眉：“为什么不能说？”',
      '',
      '管理员只说：“以后你会知道的。”',
      '',
      '两人只能继续往前走。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('withheld_suspense_without_cost_2_5')
    expect(checks[0].label).toBe('谜语人悬念扫描')
    expect(checks[0].evidence).toContain('现在还不能说')
    expect(checks[0].fix).toContain('故事内理由')
    expect(checks[0].fix).toContain('代价')
    expect(checks[0].fix).toContain('线索')
  })

  test('does not flag withheld information when delay has reason cost and a clue', () => {
    const checks = scanSuspenseWithheldInfoRisks([
      '第9章 门后名字',
      '',
      '李辰追问：“名单上第三个名字到底是谁？”',
      '',
      '管理员压低声音：“这里有监听，我现在不能说出口。说出真名，名单会立刻改写，第三个人会被清除。”',
      '',
      '他把半张门牌推到李辰掌心：“先看第三行划掉的编号，十秒内离开这条走廊。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic withheld suspense risks into suspense self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSuspenseWithheldInfoChecks = scanSuspenseWithheldInfoRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicSuspenseWithheldInfoChecks')
  })

  test('detects obscure suspense that uses vague mystery words without concrete anchors', () => {
    const checks = scanObscureSuspenseRisks([
      '第9章 门后',
      '',
      '那个东西一直在门后，像某种无法言说的存在。',
      '',
      '没人知道那件事到底意味着什么，只觉得真相藏在更深处。',
      '',
      '某个秘密正在靠近，所有人都说不清它为什么可怕。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('obscure_suspense_without_anchor_1_3')
    expect(checks[0].label).toBe('晦涩悬疑扫描')
    expect(checks[0].evidence).toContain('无法言说')
    expect(checks[0].fix).toContain('场景必须清晰')
    expect(checks[0].fix).toContain('具体威胁')
  })

  test('does not flag suspense when the unknown is grounded by concrete clue and pressure', () => {
    const checks = scanObscureSuspenseRisks([
      '第9章 门后',
      '',
      '广播念出第三条校规：十秒内不得回应门外的人。',
      '',
      '李辰看见门牌第三行编号被划掉，血字旁边多了一枚钥匙齿痕。',
      '',
      '门外的脚步停在他身后，倒计时只剩三秒。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic obscure suspense risks into suspense self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicObscureSuspenseChecks = scanObscureSuspenseRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicObscureSuspenseChecks')
  })

  test('detects relationship scenes that only declare support without changing the relationship', () => {
    const checks = scanRelationshipSceneChangeRisks([
      '第8章 旁听席',
      '',
      '林青禾低声说：“我相信你。”',
      '',
      '李玄点头：“谢谢。”',
      '',
      '她又说：“我会站在你这边。”',
      '',
      '两人沉默片刻，气氛温暖起来。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('relationship_scene_without_change_1_4')
    expect(checks[0].label).toBe('关系变化扫描')
    expect(checks[0].evidence).toContain('我相信你')
    expect(checks[0].fix).toContain('信任')
    expect(checks[0].fix).toContain('边界')
    expect(checks[0].fix).toContain('代价')
  })

  test('does not flag relationship scenes when support becomes action boundary and cost', () => {
    const checks = scanRelationshipSceneChangeRisks([
      '第8章 旁听席',
      '',
      '林青禾低声说：“我相信你。”',
      '',
      '执事逼她退回旁听席时，她把家族腰牌压在案上：“我公开作证，但只到这一步。”',
      '',
      '李玄第一次没有替她挡话，只把第二本账册推到她能看见的位置。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic relationship scene changes into character relation self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicRelationshipSceneChangeChecks = scanRelationshipSceneChangeRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicRelationshipSceneChangeChecks')
  })

  test('detects expectation vacuum when a chapter resolves the current trouble without a new open loop', () => {
    const checks = scanExpectationVacuumRisks([
      '第10章 资格门',
      '',
      '李辰把最后一枚阵牌按进门缝。',
      '',
      '红光熄灭，管理员退后，资格门槛终于通过。',
      '',
      '大家都松了一口气，危机到这里总算结束。',
      '',
      '接下来他们只需要休息，等待新的生活开始。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('expectation_vacuum_after_resolution')
    expect(checks[0].label).toBe('断期待扫描')
    expect(checks[0].evidence).toContain('资格门槛终于通过')
    expect(checks[0].fix).toContain('下一目标')
    expect(checks[0].fix).toContain('新期待')
  })

  test('wires deterministic expectation vacuum risks into expectation threshold self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicExpectationVacuumChecks = scanExpectationVacuumRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicExpectationVacuumChecks')
  })

  test('detects scene cards whose planned beats are not consumed by the final prose', () => {
    const checks = buildSceneCardConsumptionChecks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '玻璃门前',
            purpose: '李辰确认门外学生是否违反校规。',
            conflict: '开门会违反规则，不开门会失去线索。',
            reader_payoff: '规则边界压迫主角做选择。',
          },
          {
            scene_no: 2,
            title: '校徽露出',
            purpose: '学生袖口露出上一轮玩家的校徽。',
            conflict: '李辰必须判断这枚校徽是不是陷阱。',
            reader_payoff: '上一轮玩家线索打开新悬念。',
          },
        ],
      },
    }, '玻璃门外，学生敲了三下。李辰没有立刻开门，他盯着校规里那句禁止接触门外人的红字。')

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_2_consumption')
    expect(checks[0].evidence).toContain('校徽露出')
    expect(checks[0].fix).toContain('场景卡')
  })

  test('detects scene-card oh-story execution directives missing from final prose', () => {
    const checks = buildSceneCardConsumptionChecks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '蓝晶灼手',
            purpose: '蓝晶首次进入正文并改变证据判断。',
            conflict: '执事抢夺蓝晶，主角必须立刻判断它能不能读证据。',
            reader_payoff: '蓝晶改变证据判断。',
            concept_anchor_rules: ['蓝晶首次出现必须先写灼手反应和物理后果。'],
          },
        ],
      },
    }, [
      '蓝晶灼手这一幕里，执事抢夺蓝晶，主角立刻判断它能不能读证据。',
      '蓝晶改变了证据判断。',
      '蓝晶是旧王朝留下来的记忆器，源于三百年前的祭司制度，分为七阶九品。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_1_execution_directives')
    expect(checks[0].evidence).toContain('灼手反应')
    expect(checks[0].fix).toContain('动作反应')
  })

  test('detects scene-card character relation progression directives missing from final prose', () => {
    const checks = buildSceneCardConsumptionChecks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '半页账册',
            purpose: '林青禾用账册线索逼主角确认合作边界。',
            conflict: '她要洗清代签责任，主角却必须先判断账册是否可信。',
            reader_payoff: '合作关系出现新的信任压力。',
            relationship_progression_plan: '关系类型/边界：联盟型，合作互信但仍有边界。',
            relationship_buffer_zone: '配角攻略缓冲区：保留信息差、地位差距、亲密度差距或信任程度之一。',
            supporting_character_action: '配角主动行动：林青禾为了自己的代签责任先联系账房拿到证词。',
            attitude_shift_checkpoint: '态度变化拐点：从旁观/质疑转为行动/协助/设限。',
            relationship_next_hook: '关系下一轮期待：主角解决追责后回到林青禾这里开启新任务。',
          },
        ],
      },
    }, [
      '半页账册这一场，林青禾用账册线索逼主角确认合作边界。',
      '她说账册就在这里，沈砚必须先判断它是否可信。',
      '合作关系出现新的信任压力。',
    ].join('\n'))

    const relationDirective = checks.find(check => check.key === 'scene_card_1_execution_directives')
    expect(relationDirective?.evidence).toContain('配角攻略缓冲区')
    expect(relationDirective?.evidence).toContain('态度变化')
    expect(relationDirective?.fix).toContain('配角')
  })

  test('detects scene-card showdown public payoff and combat presets missing from final prose', () => {
    const checks = buildSceneCardConsumptionChecks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '审判台反压',
            purpose: '江辰公开亮出第二本账册完成打脸。',
            conflict: '会长逼众人相信旧账本是铁证。',
            reader_payoff: '主角公开反压会长。',
            showoff_stage_chain: '群众层质疑 -> 中间层验账 -> 核心层长老改判。',
            spectator_interest_shift: '这跟我有关系：旁观商户意识到旧账规则会影响自己的矿票资格。',
            secondary_showoff_effect: '二级装逼效果：展示迫使长老席重算利益和站队。',
            combat_result_type: '碾压',
            combat_dimension_plan: '心/体/技：心态稳住审判台，技能拆账，身体挡住护卫逼近。',
            combat_reversal_plan: '反派出A假账册，主角提前准备B原始封印克制。',
          },
        ],
      },
    }, [
      '审判台反压这一场，江辰公开亮出第二本账册。',
      '会长脸色一白，台下众人震惊。',
      '长老席沉默片刻，只说重新验账。',
    ].join('\n'))

    const showdownDirective = checks.find(check => check.key === 'scene_card_1_execution_directives')
    expect(showdownDirective?.evidence).toContain('群众层质疑')
    expect(showdownDirective?.evidence).toContain('矿票资格')
    expect(showdownDirective?.evidence).toContain('心/体/技')
    expect(showdownDirective?.fix).toContain('公开舞台')
    expect(showdownDirective?.fix).toContain('战斗反制')
  })

  test('detects scene-card forbidden craft directives violated in final prose', () => {
    const checks = buildSceneCardConsumptionChecks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '蓝晶灼手',
            purpose: '蓝晶首次进入正文并改变证据判断。',
            conflict: '执事抢夺蓝晶，主角必须立刻判断它能不能读证据。',
            reader_payoff: '蓝晶改变证据判断。',
            prose_craft_directives: ['不得用整段来历/等级解释蓝晶。'],
          },
        ],
      },
    }, [
      '蓝晶灼手这一幕里，执事抢夺蓝晶，主角立刻判断它能不能读证据。',
      '蓝晶烫得她掌心一缩，陌生记忆碎片在眼前炸开，缺页的位置随之浮出来。',
      '蓝晶是旧王朝留下来的记忆器，源于三百年前的祭司制度，分为七阶九品，后续再解释具体用法。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_1_forbidden_directives')
    expect(checks[0].evidence).toContain('整段来历')
    expect(checks[0].evidence).toContain('等级解释')
    expect(checks[0].fix).toContain('删掉说明书')
  })

  test('merges runtime camelCase chapterTarget scene cards for consumption checks when chapter_target exists', () => {
    const checks = buildSceneCardConsumptionChecks({
      chapter_target: {
        chapter_no: 12,
        title: '门外校徽',
      },
      chapterTarget: {
        sceneCards: [
          {
            sceneNo: 1,
            title: '玻璃门前',
            purpose: '李辰确认门外学生是否违反校规。',
            conflict: '开门会违反规则，不开门会失去线索。',
            readerPayoff: '规则边界压迫主角做选择。',
          },
          {
            sceneNo: 2,
            title: '校徽露出',
            purpose: '学生袖口露出上一轮玩家的校徽。',
            conflict: '李辰必须判断这枚校徽是不是陷阱。',
            readerPayoff: '上一轮玩家线索打开新悬念。',
          },
        ],
      },
    }, '玻璃门外，学生敲了三下。李辰没有立刻开门，他盯着校规里那句禁止接触门外人的红字。')

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_2_consumption')
    expect(checks[0].evidence).toContain('校徽露出')
  })

  test('detects scene-card density levels that are executed with the wrong prose weight', () => {
    const checks = scanSceneDensityExecutionRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '当众反证',
            density_level: 'dense',
            reader_payoff: '江辰用第二本账册当众反证，逼执事改口。',
            required_beats: ['第二本账册亮相', '执事改口', '旁观弟子倒戈'],
          },
          {
            scene_no: 2,
            title: '赶往钟楼',
            density_level: 'sparse',
            purpose: '江辰赶往钟楼交接旧印。',
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰把第二本账册举起来，当众反证。执事脸色一变，只能改口，旁观弟子倒戈。',
      '',
      '江辰赶往钟楼交接旧印。',
      '',
      '雨水从青石板缝里漫上来，他的靴底碾过一道道旧痕，钟楼的阴影像一截潮湿的铁尺压在肩上。',
      '',
      '他穿过廊桥，风从袖口灌进去，旧印被攥得发烫，每一步都像踩在昨夜没熄的灰烬里。',
      '',
      '远处的钟声拖得很长，檐角的水珠一颗一颗落下，砸在他手背上。',
    ].join('\n'))

    expect(checks.map(item => item.key)).toEqual(['scene_density_1_dense_underwritten', 'scene_density_2_sparse_overwritten'])
    expect(checks[0].evidence).toContain('当众反证')
    expect(checks[0].fix).toContain('慢镜头')
    expect(checks[1].evidence).toContain('赶往钟楼')
    expect(checks[1].fix).toContain('1-2 句')
  })

  test('does not flag scene-card density when dense and sparse scenes use matching prose weight', () => {
    const checks = scanSceneDensityExecutionRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '当众反证',
            density_level: 'dense',
            reader_payoff: '江辰用第二本账册当众反证，逼执事改口。',
            required_beats: ['第二本账册亮相', '执事改口', '旁观弟子倒戈'],
          },
          {
            scene_no: 2,
            title: '赶往钟楼',
            density_level: 'sparse',
            purpose: '江辰赶往钟楼交接旧印。',
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰把第二本账册压在审判台上，纸页被掌风掀开，第一行墨迹正对着执事的名字。',
      '',
      '执事伸手去抢，江辰反扣住他的腕骨，把账册翻到朱印页：“你昨夜换的是副本，真账在这里。”',
      '',
      '台下弟子先是屏住呼吸，等旁证签名一露出来，最前排那人立刻后退半步，低声喊出执事的称号。',
      '',
      '执事嘴唇抖了两下，喉结卡在领口上方，半晌才把“误会”两个字咬出来。江辰没有松手，只把账册往前推了半寸，让每个人都看清朱印旁边的刮痕。',
      '',
      '原本站在执事身后的两名弟子同时退开，旁观席里有人把刚才的供词撕成两半，倒向江辰这一侧。',
      '',
      '江辰赶往钟楼交接旧印。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects scene-card purpose tags that are executed with the wrong prose weight', () => {
    const checks = scanScenePurposeWeightRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '当众反证',
            purpose_tag: '打脸',
            purpose: '江辰用第二本账册当众反证。',
            reader_payoff: '执事改口，旁观弟子倒戈。',
          },
          {
            scene_no: 2,
            title: '赶往钟楼',
            purpose_tag: '过渡',
            purpose: '江辰赶往钟楼交接旧印。',
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰拿出第二本账册，执事改口，众人震惊。',
      '',
      '江辰赶往钟楼交接旧印。',
      '',
      '雨水从青石板缝里漫上来，他的靴底碾过一道道旧痕，钟楼的阴影像一截潮湿的铁尺压在肩上。',
      '',
      '他穿过廊桥，风从袖口灌进去，旧印被攥得发烫，每一步都像踩在昨夜没熄的灰烬里。',
      '',
      '远处的钟声拖得很长，檐角的水珠一颗一颗落下，砸在他手背上。',
    ].join('\n'))

    expect(checks.map(item => item.key)).toEqual(['scene_purpose_weight_1_high_underwritten', 'scene_purpose_weight_2_transition_overwritten'])
    expect(checks[0].evidence).toContain('目的词「打脸」')
    expect(checks[0].fix).toContain('危机/期待铺垫')
    expect(checks[1].evidence).toContain('目的词「过渡」')
    expect(checks[1].fix).toContain('1-2 句')
  })

  test('does not flag scene-card purpose weight when payoff scenes expand and transitions stay brief', () => {
    const checks = scanScenePurposeWeightRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '当众反证',
            purpose_tag: '打脸',
            purpose: '江辰用第二本账册当众反证。',
            reader_payoff: '执事改口，旁观弟子倒戈。',
          },
          {
            scene_no: 2,
            title: '赶往钟楼',
            purpose_tag: '过渡',
            purpose: '江辰赶往钟楼交接旧印。',
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰把第二本账册压在审判台上，纸页被掌风掀开，第一行墨迹正对着执事的名字。',
      '',
      '执事伸手去抢，江辰反扣住他的腕骨，把账册翻到朱印页：“你昨夜换的是副本，真账在这里。”',
      '',
      '台下弟子先是屏住呼吸，等旁证签名一露出来，最前排那人立刻后退半步，低声喊出执事的称号。',
      '',
      '执事嘴唇抖了两下，喉结卡在领口上方，半晌才把“误会”两个字咬出来。江辰没有松手，只把账册往前推了半寸。',
      '',
      '原本站在执事身后的两名弟子同时退开，旁观席里有人把刚才的供词撕成两半，倒向江辰这一侧。',
      '',
      '江辰赶往钟楼交接旧印。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects scene-card sensory anchors missing from final prose', () => {
    const checks = scanSceneSensoryAnchorRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '账本翻页',
            purpose: '江辰翻到账本缺页，确认执事篡改账册。',
            sensory_anchor: '纸张触感粗糙，页角卷曲处有新墨洇开的痕迹',
            required_beats: ['翻到账本缺页', '确认篡改账册'],
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰翻到账本缺页，确认执事篡改账册。',
      '',
      '他抬头看向审判台，把账册递给旁证，示意对方验印。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_sensory_anchor_1_missing')
    expect(checks[0].evidence).toContain('纸张触感粗糙')
    expect(checks[0].fix).toContain('主角主动注意')
    expect(checks[0].fix).toContain('动作、规则、危险或对话判断')
  })

  test('does not flag scene-card sensory anchors when the sensory detail lands in prose', () => {
    const checks = scanSceneSensoryAnchorRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '账本翻页',
            purpose: '江辰翻到账本缺页，确认执事篡改账册。',
            sensory_anchor: '纸张触感粗糙，页角卷曲处有新墨洇开的痕迹',
            required_beats: ['翻到账本缺页', '确认篡改账册'],
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰翻到账本缺页，指腹蹭过纸张粗糙的断边，页角卷曲处还压着一圈新墨洇开的痕迹。',
      '',
      '他没有急着抬头，只把那一页推到旁证面前：“昨夜换过。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects scene-card serial risk repair actions missing from final prose', () => {
    const checks = scanSceneSerialRiskRepairRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '旧盟约重签',
            purpose: '江辰用账册证据逼盟友改口。',
            required_beats: ['账册证据亮相', '盟友改口'],
            serial_risk_repairs: ['two_chapter_momentum_stall', 'five_chapter_texture_gap'],
            recent_fatigue_action: '用账册新证据推进目标，同时让盟友关系发生可见变化。',
          },
        ],
      },
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册证据亮在桌上，盟友终于改口。',
      '',
      '众人沉默片刻，他收起账册，转身离开。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_serial_risk_repair_1_missing')
    expect(checks[0].label).toBe('场景近章风险修复检查')
    expect(checks[0].evidence).toContain('two_chapter_momentum_stall')
    expect(checks[0].evidence).toContain('用账册新证据推进目标')
    expect(checks[0].fix).toContain('目标推进')
    expect(checks[0].fix).toContain('关系/世界调剂')
  })

  test('does not flag scene-card serial risk repair actions when the repair lands in prose', () => {
    const checks = scanSceneSerialRiskRepairRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '旧盟约重签',
            purpose: '江辰用账册证据逼盟友改口。',
            required_beats: ['账册证据亮相', '盟友改口'],
            serial_risk_repairs: ['two_chapter_momentum_stall', 'five_chapter_texture_gap'],
            recent_fatigue_action: '用账册新证据推进目标，同时让盟友关系发生可见变化。',
          },
        ],
      },
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞，再把下一步目标推到禁库钥匙上。',
      '',
      '原本沉默的盟友终于改口，主动站到他身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects scene-card receipts whose evidence is missing from final prose', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '旧盟约重签',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册证据亮在桌上，盟友终于改口。',
      '',
      '众人沉默片刻，他收起账册，转身离开。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_evidence_missing')
    expect(checks[0].label).toBe('场景卡回执证据复核')
    expect(checks[0].status).toBe('fail')
    expect(checks[0].evidence).toContain('盟友主动站到江辰身侧')
    expect(checks[0].fix).toContain('不能信任回执自述')
  })

  test('builds a scene-card receipt sync report from deterministic receipt risks', () => {
    const report = buildSceneCardReceiptSyncReport(
      { title: '旧盟约' },
      { id: 12, chapter_no: 12, title: '旧盟约' },
      {
        generated_scene_breakdown: [
          {
            scene_no: 1,
            title: '旧盟约重签',
            scene_card_receipts: {
              goal_obstacle_change_delivered: true,
              purpose_tag_delivered: true,
              evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
            },
          },
        ],
      },
      '江辰把账册证据亮在桌上，盟友终于改口。',
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('场景回执缺口 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'scene_card_receipt_1_evidence_missing',
      label: '场景卡回执证据复核',
    })
    expect(report.next_actions.join('｜')).toContain('scene_card_receipts')
  })

  test('audits stored oh-story scene-card receipts when generated scene breakdown is unavailable', () => {
    const checks = scanSceneCardReceiptRisks({
      chapter_target: {
        delivery_receipts: {
          scene_card_receipts: [
            {
              scene_no: 1,
              title: '旧盟约重签',
              delivered: true,
              evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
            },
          ],
        },
      },
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册证据亮在桌上，盟友终于改口。',
      '',
      '众人沉默片刻，他收起账册，转身离开。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_evidence_missing')
    expect(checks[0].evidence).toContain('盟友主动站到江辰身侧')
    expect(checks[0].fix).toContain('不能信任回执自述')
  })

  test('detects undelivered oh-story scene-card receipt fields', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '蓝晶灼手',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            concept_anchor_rules_delivered: false,
            prose_craft_directives_delivered: false,
            evidence: ['蓝晶在她掌心炸出陌生记忆碎片'],
          },
        },
      ],
    }, '蓝晶在她掌心炸出陌生记忆碎片。')

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_undelivered')
    expect(checks[0].fields).toEqual(expect.arrayContaining(['新概念锚点', '正文工艺指令']))
    expect(checks[0].evidence).toContain('新概念锚点')
  })

  test('detects undelivered showdown scene-card receipt fields', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '审判台反压',
          scene_card_receipts: {
            showoff_stage_chain_delivered: false,
            spectator_interest_shift_delivered: false,
            secondary_showoff_effect_delivered: false,
            combat_result_type_delivered: false,
            combat_dimension_plan_delivered: false,
            combat_reversal_plan_delivered: false,
            evidence: ['江辰公开亮出第二本账册。'],
          },
        },
      ],
    }, '江辰公开亮出第二本账册。')

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_undelivered')
    expect(checks[0].fields).toEqual(expect.arrayContaining(['公开舞台层级', '旁观者利益变化', '战斗维度计划', '战斗反转计划']))
    expect(checks[0].evidence).toContain('公开舞台层级')
  })

  test('blocks quality gate when scene-card receipt evidence is missing even if score passes', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '旧盟约重签',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
      ],
    }, '江辰把账册证据亮在桌上，盟友终于改口。')

    const decision = getQualityGateDecision({ reference_config: { quality_gate: { enabled: true, min_score: 78 } } }, {
      score: 92,
      revised: true,
      quality_audit_checks: checks,
    })

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('；')).toContain('结构化自检失败')
    expect(decision.reasons.join('；')).toContain('场景卡回执证据复核')
  })

  test('blocks quality gate when next-chapter quality plan is missing even if score passes', () => {
    const decision = getQualityGateDecision({ reference_config: { quality_gate: { enabled: true, min_score: 78 } } }, {
      score: 92,
      revised: true,
      issues: [],
    })

    expect(decision.passed).toBe(false)
    expect(decision.reasons.join('；')).toContain('下一章质量续航计划缺失')
  })

  test('does not flag scene-card receipts when delivered evidence is present in prose', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '旧盟约重签',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('flags scene-card receipt evidence that appears outside the matching scene text', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '账册亮相',
          scene_text: '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
        {
          scene_no: 2,
          title: '盟友改口',
          scene_text: '原本沉默的盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
      '',
      '原本沉默的盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_evidence_out_of_scene')
    expect(checks[0].evidence).toContain('不在对应场景文本中')
    expect(checks[0].fix).toContain('对应场景')
  })

  test('flags multi-scene receipts that omit scene boundary anchors', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '账册亮相',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['江辰把账册新证据亮在桌上'],
          },
        },
        {
          scene_no: 2,
          title: '盟友改口',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
      '',
      '原本沉默的盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(2)
    expect(checks.map(item => item.key)).toEqual([
      'scene_card_receipt_1_scope_missing',
      'scene_card_receipt_2_scope_missing',
    ])
    expect(checks[0].evidence).toContain('缺少 scene_start_anchor/scene_end_anchor')
    expect(checks[0].fix).toContain('场景边界')
  })

  test('accepts multi-scene receipts when evidence is inside scene anchors', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '账册亮相',
          scene_start_anchor: '江辰把账册新证据亮在桌上',
          scene_end_anchor: '先指出盟约漏洞',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['江辰把账册新证据亮在桌上'],
          },
        },
        {
          scene_no: 2,
          title: '盟友改口',
          scene_start_anchor: '原本沉默的盟友主动站到江辰身侧',
          scene_end_anchor: '这次我跟你走',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
      '',
      '原本沉默的盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('flags multi-scene receipts when scene anchors cannot locate the scene text', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '账册亮相',
          scene_start_anchor: '不存在的账册开头',
          scene_end_anchor: '不存在的账册结尾',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
        {
          scene_no: 2,
          title: '盟友改口',
          scene_start_anchor: '原本沉默的盟友主动站到江辰身侧',
          scene_end_anchor: '这次我跟你走',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
      '',
      '原本沉默的盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_scope_invalid')
    expect(checks[0].evidence).toContain('scene_start_anchor/scene_end_anchor 无法定位')
    expect(checks[0].fix).toContain('修正场景锚点')
  })

  test('deduplicates generated scene breakdown when review context stores it twice', () => {
    const scene = {
      scene_no: 1,
      title: '账册亮相',
      scene_card_receipts: {
        goal_obstacle_change_delivered: true,
        purpose_tag_delivered: true,
        density_level_delivered: true,
        sensory_anchor_delivered: true,
        serial_risk_repairs_delivered: true,
        evidence: ['江辰把账册新证据亮在桌上'],
      },
    }

    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [scene],
      chapter_target: {
        generated_scene_breakdown: [scene],
      },
    }, '这一段只写风声和空桌，没有任何盟约动作。')

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_evidence_missing')
  })

  test('prefers latest generated scene breakdown over stale scene breakdown', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '修订后盟友改口',
          scene_start_anchor: '盟友主动站到江辰身侧',
          scene_end_anchor: '这次我跟你走',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
      ],
      scene_breakdown: [
        {
          scene_no: 1,
          title: '旧版账册亮相',
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('keeps only verified scene-card receipts for story state sync', () => {
    const verified = verifiedSceneBreakdownForStateSync({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '账册亮相',
          scene_start_anchor: '江辰把账册新证据亮在桌上',
          scene_end_anchor: '先指出盟约漏洞',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['江辰把账册新证据亮在桌上'],
          },
        },
        {
          scene_no: 2,
          title: '污染回执',
          scene_start_anchor: '原本沉默的盟友主动站到江辰身侧',
          scene_end_anchor: '这次我跟你走',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['正文不存在的旧印归属变化'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
      '',
      '原本沉默的盟友主动站到江辰身侧：“这次我跟你走。”',
    ].join('\n'))

    expect(verified).toHaveLength(1)
    expect(verified[0].title).toBe('账册亮相')
  })

  test('removes unverified scene-card receipts from story state sync context', () => {
    const context = buildStoryStateSyncContextPackage({
      chapter_target: {
        title: '旧盟约',
      },
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '账册亮相',
          scene_start_anchor: '江辰把账册新证据亮在桌上',
          scene_end_anchor: '先指出盟约漏洞',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['江辰把账册新证据亮在桌上'],
          },
        },
        {
          scene_no: 2,
          title: '污染回执',
          scene_start_anchor: '原本沉默的盟友主动站到江辰身侧',
          scene_end_anchor: '这次我跟你走',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['正文不存在的旧印归属变化'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
      '',
      '原本沉默的盟友主动站到江辰身侧：“这次我跟你走。”',
    ].join('\n'))

    expect(context.generated_scene_breakdown).toHaveLength(1)
    expect(context.generated_scene_breakdown[0].title).toBe('账册亮相')
    expect(context.chapter_target.generated_scene_breakdown).toHaveLength(1)
    expect(JSON.stringify(context)).not.toContain('正文不存在的旧印归属变化')
  })

  test('removes unverified camelCase scene-card receipts from story state sync context', () => {
    const context = buildStoryStateSyncContextPackage({
      chapterTarget: {
        title: '旧盟约',
        generatedSceneBreakdown: [
          {
            sceneNo: 1,
            title: '污染回执',
            sceneStartAnchor: '原本沉默的盟友主动站到江辰身侧',
            sceneEndAnchor: '这次我跟你走',
            sceneCardReceipts: {
              goalObstacleChangeDelivered: true,
              purposeTagDelivered: true,
              densityLevelDelivered: true,
              sensoryAnchorDelivered: true,
              serialRiskRepairsDelivered: true,
              evidence: ['正文不存在的旧印归属变化'],
            },
          },
        ],
      },
    }, '原本沉默的盟友主动站到江辰身侧：“这次我跟你走。”')

    expect(context.generated_scene_breakdown).toHaveLength(0)
    expect(context.chapterTarget.generatedSceneBreakdown).toHaveLength(0)
    expect(JSON.stringify(context)).not.toContain('正文不存在的旧印归属变化')
  })

  test('keeps the previous scene breakdown when a candidate update has invalid receipts', () => {
    const previousBreakdown = [
      {
        scene_no: 1,
        title: '可信回执',
        scene_card_receipts: {
          goal_obstacle_change_delivered: true,
          purpose_tag_delivered: true,
          density_level_delivered: true,
          sensory_anchor_delivered: true,
          serial_risk_repairs_delivered: true,
          evidence: ['江辰把账册新证据亮在桌上'],
        },
      },
    ]
    const candidateBreakdown = [
      {
        scene_no: 1,
        title: '污染回执',
        scene_card_receipts: {
          goal_obstacle_change_delivered: true,
          purpose_tag_delivered: true,
          density_level_delivered: true,
          sensory_anchor_delivered: true,
          serial_risk_repairs_delivered: true,
          evidence: ['盟友递出不存在的旧印'],
        },
      },
    ]

    const selected = selectVerifiedSceneBreakdownUpdate(
      previousBreakdown,
      candidateBreakdown,
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
    )

    expect(selected).toBe(previousBreakdown)
  })

  test('wires deterministic scene-card receipt risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSceneCardReceiptChecks = scanSceneCardReceiptRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicSceneCardReceiptChecks')
    expect(reviewBlock.indexOf('quality_audit_checks')).toBeLessThan(reviewBlock.indexOf('...deterministicSceneCardReceiptChecks'))
  })

  test('passes the authoritative generation contract into the prose quality loop', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const helperSource = readFileSync(join(import.meta.dir, '../novel-writing-service/post-delivery/core-handoff-sync-reports.ts'), 'utf8')
    const helperStart = helperSource.indexOf('export function buildProseReviewContextPackage')
    const helperBlock = helperSource.slice(
      helperStart,
      helperSource.indexOf('\nexport function', helperStart + 1),
    )
    const generationBlock = source.slice(
      source.indexOf('let qualityLoop: Awaited<ReturnType<typeof runProseQualityLoop>>'),
      source.indexOf('const initialReviewDecision = getQualityGateDecision'),
    )

    expect(helperBlock).toContain('generated_scene_breakdown')
    expect(generationBlock).toContain('coreContract: buildFocusedQualityCoreContract(generationContract)')
    expect(generationBlock).toContain('scan: text => scanProseForQualityLoop(text, contextPackage, wordTarget, wordTargetCompatibility ? {')
    expect(generationBlock).toContain('word_target_compatibility_pass: true')
    expect(generationBlock).toContain('compatibility_ceiling: wordTargetCompatibility.compatibility_ceiling')
  })

  test('wires deterministic scene-card density risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSceneDensityChecks = scanSceneDensityExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicSceneDensityChecks')
  })

  test('wires deterministic scene-card purpose weight risks into quality audit self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicScenePurposeWeightChecks = scanScenePurposeWeightRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicScenePurposeWeightChecks')
    expect(reviewBlock.indexOf('quality_audit_checks')).toBeLessThan(reviewBlock.indexOf('...deterministicScenePurposeWeightChecks'))
  })

  test('wires deterministic scene-card sensory anchor risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSceneSensoryChecks = scanSceneSensoryAnchorRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicSceneSensoryChecks')
  })

  test('wires deterministic scene-card serial risk repairs into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSceneSerialRiskRepairChecks = scanSceneSerialRiskRepairRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicSceneSerialRiskRepairChecks')
    expect(reviewBlock.indexOf('serial_risk_repair_checks')).toBeLessThan(reviewBlock.indexOf('...deterministicSceneSerialRiskRepairChecks'))
  })

  test('wires deterministic scene-card consumption risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSceneCardChecks = buildSceneCardConsumptionChecks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicSceneCardChecks')
  })

  test('detects oh-story blueprint craft gaps before prose is stored', () => {
    const checks = scanChapterBlueprintCraftRisks({
      chapter_target: {
        chapter_blueprint: {
          target_emotion: '压迫后反证爆发',
          core_payoff: '江辰用第二本账册当众反证，逼执事改口',
          content_outline: {
            climax: '执事在众目睽睽下改口，旁观弟子站队倒戈',
          },
          plot_lines: {
            logic_line: '旧账册 -> 第二本账册 -> 旧印章 -> 执事改口',
          },
        },
      },
    }, [
      '审判庭刚开场，江辰直接用第二本账册当众反证。',
      '旧印章证明账目被调换，执事在众目睽睽下改口，旁观弟子都很震惊。',
      '江辰洗清罪名，得到禁地钥匙线索。',
    ].join('\n'))

    expect(checks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'blueprint_craft_payoff_setup',
      'blueprint_craft_differentiated_reactions',
      'blueprint_craft_detail_balance',
    ]))
    expect(checks.map((item: any) => item.label)).toContain('爽点铺垫')
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('爽点/高潮出手前必须先铺')
  })

  test('detects blueprint craft gaps from stored oh-story delivery receipts', () => {
    const checks = scanChapterBlueprintCraftRisks({
      chapter_target: {
        delivery_receipts: {
          chapter_blueprint: {
            target_emotion: '压迫后反证爆发',
            core_payoff: '江辰用第二本账册当众反证，逼执事改口',
            content_outline: {
              climax: '执事在众目睽睽下改口，旁观弟子站队倒戈',
            },
            plot_lines: {
              logic_line: '旧账册 -> 第二本账册 -> 旧印章 -> 执事改口',
            },
          },
        },
      },
    }, [
      '审判庭刚开场，江辰直接用第二本账册当众反证。',
      '旧印章证明账目被调换，执事在众目睽睽下改口，旁观弟子都很震惊。',
      '江辰洗清罪名，得到禁地钥匙线索。',
    ].join('\n'))

    expect(checks.map((item: any) => item.key)).toContain('blueprint_craft_payoff_setup')
    expect(checks.map((item: any) => item.label)).toContain('爽点铺垫')
  })

  test('detects chapter blueprint character order mismatches', () => {
    const checks = scanCharacterOrderExecutionRisks({
      chapter_target: {
        chapter_blueprint: {
          character_order: ['会长', '林青禾', '李玄'],
        },
      },
    }, [
      '李玄先把旧账册按在桌上，压住所有人的视线。',
      '会长这才从主位抬头，冷声问他凭什么进审判庭。',
      '林青禾站在门边，迟疑片刻才走到证人席。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('character_order_mismatch')
    expect(checks[0].label).toBe('人物出场顺序扫描')
    expect(checks[0].evidence).toContain('计划：会长 -> 林青禾 -> 李玄')
    expect(checks[0].evidence).toContain('实际：李玄 -> 会长 -> 林青禾')
    expect(checks[0].fix).toContain('镜头进入顺序')
  })

  test('does not flag character order when prose follows the blueprint', () => {
    const checks = scanCharacterOrderExecutionRisks({
      chapter_target: {
        chapter_blueprint: {
          character_order: ['会长', '林青禾', '李玄'],
        },
      },
    }, [
      '会长坐在主位上，指尖敲着旧账册的封皮。',
      '林青禾被带到证人席，袖口还压着昨夜留下的泥点。',
      '李玄最后踏进审判庭，把第二本账册放在所有人面前。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic character order risks into intent confirmation checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicCharacterOrderChecks = scanCharacterOrderExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicCharacterOrderChecks')
  })

  test('detects missing or out-of-order chapter blueprint beat sequence', () => {
    const checks = scanBeatSequenceExecutionRisks({
      chapter_target: {
        chapter_blueprint: {
          beat_sequence: [
            { beat_no: 1, action: '会长当众压问林青禾', function_tag: '铺垫压力' },
            { beat_no: 2, action: '林青禾交出旧账册缺页', function_tag: '信息差反转' },
            { beat_no: 3, action: '李玄用第二本账册反证会长', function_tag: '爽点兑现' },
          ],
        },
      },
    }, [
      '李玄先把第二本账册摊在审判桌上，当众反证会长。',
      '会长脸色一沉，这才开始压问林青禾。',
      '林青禾始终攥着袖口，没有交出旧账册缺页。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('beat_sequence_missing_and_out_of_order')
    expect(checks[0].label).toBe('情节点序列扫描')
    expect(checks[0].evidence).toContain('缺失：2.信息差反转')
    expect(checks[0].evidence).toContain('乱序')
    expect(checks[0].fix).toContain('谁做了什么')
    expect(checks[0].fix).toContain('功能标签')
  })

  test('does not flag beat sequence when planned beats are delivered in order', () => {
    const checks = scanBeatSequenceExecutionRisks({
      chapter_target: {
        chapter_blueprint: {
          beat_sequence: [
            { beat_no: 1, action: '会长当众压问林青禾', function_tag: '铺垫压力' },
            { beat_no: 2, action: '林青禾交出旧账册缺页', function_tag: '信息差反转' },
            { beat_no: 3, action: '李玄用第二本账册反证会长', function_tag: '爽点兑现' },
          ],
        },
      },
    }, [
      '会长当众压问林青禾，逼她说明昨夜为何进过账房。',
      '林青禾把袖中的旧账册缺页交出来，缺页上的编号立刻形成信息差反转。',
      '李玄接过缺页，用第二本账册反证会长，让审判庭的局势彻底翻过来。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic beat sequence risks into intent confirmation checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicBeatSequenceChecks = scanBeatSequenceExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicBeatSequenceChecks')
  })

  test('detects missing cost when chapter blueprint only delivers the reward', () => {
    const checks = scanCostRewardExecutionRisks({
      chapter_target: {
        chapter_blueprint: {
          cost_and_reward: '代价：林青禾公开得罪会长；收益：李玄夺回审讯解释权。',
        },
      },
    }, [
      '李玄把旧账册按在桌上，会长被迫改口。',
      '审讯席上的解释权终于回到李玄手里，他夺回了所有人的视线。',
      '林青禾站在旁边，没有开口。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('cost_reward_missing_cost')
    expect(checks[0].label).toBe('代价/收益兑现扫描')
    expect(checks[0].evidence).toContain('计划代价：林青禾公开得罪会长')
    expect(checks[0].evidence).toContain('计划收益：李玄夺回审讯解释权')
    expect(checks[0].fix).toContain('谁付出代价')
    expect(checks[0].fix).toContain('谁获得收益')
  })

  test('does not flag cost reward execution when both sides are visible', () => {
    const checks = scanCostRewardExecutionRisks({
      chapter_target: {
        chapter_blueprint: {
          cost_and_reward: '代价：林青禾公开得罪会长；收益：李玄夺回审讯解释权。',
        },
      },
    }, [
      '林青禾当着所有人的面走出旁听席，公开作证，等于当场得罪会长。',
      '李玄抓住她递出的账册编号，把审讯解释权重新夺回手里。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic cost reward risks into intent confirmation checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicCostRewardChecks = scanCostRewardExecutionRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicCostRewardChecks')
  })

  test('detects local victories that close without a new cost or risk', () => {
    const checks = scanLocalVictoryCostRisks([
      '第12章 资格门',
      '',
      '李玄把最后一枚阵牌按进门缝，红光熄灭，资格门终于通过。',
      '',
      '执事退后一步，众人松了一口气，这一关总算赢了。',
      '',
      '他拿到奖励，回到住处休息。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('local_victory_without_cost_1_3')
    expect(checks[0].label).toBe('局部胜利代价扫描')
    expect(checks[0].evidence).toContain('资格门终于通过')
    expect(checks[0].fix).toContain('新的代价')
    expect(checks[0].fix).toContain('风险')
  })

  test('does not flag local victories that open a new cost risk or next pressure', () => {
    const checks = scanLocalVictoryCostRisks([
      '第12章 资格门',
      '',
      '李玄把最后一枚阵牌按进门缝，红光熄灭，资格门终于通过。',
      '',
      '但阵牌背面的旧印也随之暴露，执事记下他的名字，下一轮核验被提前到十息之后。',
      '',
      '他拿到奖励，却必须立刻赶去禁库，否则林青禾会被取消作证资格。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic local victory cost risks into plot dynamics checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicLocalVictoryCostChecks = scanLocalVictoryCostRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicLocalVictoryCostChecks')
  })

  test('wires deterministic blueprint craft risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicBlueprintCraftChecks = scanChapterBlueprintCraftRisks(contextPackage, chapterText)')
    expect(reviewBlock).toContain('...deterministicBlueprintCraftChecks')
  })

  test('turns missing source readiness rows into deterministic state tracking checks', () => {
    const checks = buildSourceReadinessChecks({
      chapter_target: {
        state_tracking_contract: {
          source_readiness: [
            {
              key: 'previous_chapter',
              label: '上一章正文/章尾钩子',
              status: 'missing',
              evidence: '',
              fix: '补齐上一章正文、摘要或章尾钩子后再写承接。',
            },
            {
              key: 'character_state',
              label: '角色状态',
              status: 'warn',
              evidence: '只有角色名，没有当前位置和认知边界。',
              fix: '补齐本章出场角色状态。',
            },
            {
              key: 'world_constraints',
              label: '世界约束',
              status: 'ready',
              evidence: '禁门规则已就绪。',
            },
          ],
        },
      },
    })

    expect(checks).toHaveLength(2)
    expect(checks[0].key).toBe('source_readiness_previous_chapter')
    expect(checks[0].status).toBe('fail')
    expect(checks[0].fix).toContain('补齐上一章')
    expect(checks[1].key).toBe('source_readiness_character_state')
    expect(checks[1].status).toBe('warn')
    expect(checks.map(item => item.key)).not.toContain('source_readiness_world_constraints')
  })

  test('reads runtime camelCase chapterTarget source readiness rows for deterministic checks', () => {
    const checks = buildSourceReadinessChecks({
      chapterTarget: {
        stateTrackingContract: {
          sourceReadiness: [
            {
              key: 'previous_chapter',
              label: '上一章正文/章尾钩子',
              status: 'missing',
              fix: '补齐上一章正文、摘要或章尾钩子后再写承接。',
            },
            {
              key: 'character_state',
              label: '角色状态',
              status: 'warn',
              evidence: '缺当前位置和认知边界。',
              fix: '补齐本章出场角色状态。',
            },
          ],
        },
      },
    })

    expect(checks).toHaveLength(2)
    expect(checks[0].key).toBe('source_readiness_previous_chapter')
    expect(checks[0].status).toBe('fail')
    expect(checks[1].key).toBe('source_readiness_character_state')
    expect(checks[1].status).toBe('warn')
  })

  test('turns critical missing source readiness rows into prose preflight blockers', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        state_tracking_contract: {
          source_readiness: [
            {
              key: 'previous_chapter',
              label: '上一章正文/章尾钩子',
              status: 'missing',
              fix: '补齐上一章正文、摘要或章尾钩子后再写承接。',
            },
            {
              key: 'character_state',
              label: '角色状态',
              status: 'warn',
              evidence: '缺认知边界。',
              fix: '补齐本章出场角色状态。',
            },
            {
              key: 'world_constraints',
              label: '世界约束',
              status: 'ready',
            },
          ],
        },
      },
    })

    expect(checks).toHaveLength(2)
    expect(checks[0].key).toBe('source_readiness_previous_chapter')
    expect(checks[0].severity).toBe('high')
    expect(checks[0].ok).toBe(false)
    expect(checks[1].key).toBe('source_readiness_character_state')
    expect(checks[1].severity).toBe('medium')
  })

  test('reads runtime camelCase chapterTarget source readiness rows for prose preflight blockers', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapterTarget: {
        stateTrackingContract: {
          sourceReadiness: [
            {
              key: 'previous_chapter',
              label: '上一章正文/章尾钩子',
              status: 'missing',
              fix: '补齐上一章正文、摘要或章尾钩子后再写承接。',
            },
            {
              key: 'character_state',
              label: '角色状态',
              status: 'warn',
              evidence: '缺认知边界。',
              fix: '补齐本章出场角色状态。',
            },
          ],
        },
      },
    })

    expect(checks).toHaveLength(2)
    expect(checks[0].key).toBe('source_readiness_previous_chapter')
    expect(checks[0].severity).toBe('high')
    expect(checks[1].key).toBe('source_readiness_character_state')
    expect(checks[1].severity).toBe('medium')
  })

  test('requires timeline tracking when daily workflow source requirements mention timeline', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        chapter_no: 8,
        state_tracking_contract: {
          source_requirements: ['追踪/上下文.md', '追踪/伏笔.md', '追踪/时间线.md'],
          source_readiness: [
            {
              key: 'previous_chapter',
              label: '上一章正文/章尾钩子',
              status: 'ready',
              evidence: '上一章以旧楼门牌变化收束。',
            },
            {
              key: 'context_tracking',
              label: '追踪/上下文',
              status: 'ready',
              evidence: '最近状态摘要已加载。',
            },
            {
              key: 'foreshadowing_history',
              label: '伏笔/前史',
              status: 'ready',
              evidence: '旧楼门牌伏笔已筛选。',
            },
          ],
        },
      },
    })

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('source_readiness_timeline_tracking')
    expect(checks[0].severity).toBe('medium')
    expect(checks[0].label).toBe('追踪/时间线')
    expect(checks[0].fix).toContain('追踪/时间线.md')
  })

  test('requires all daily workflow source requirements to have readiness rows', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        chapter_no: 8,
        chapter_blueprint: {
          target_emotion: '紧张追查',
          opening_hook: '旧楼门牌变化。',
          core_payoff: '确认门牌变化来源。',
          content_outline: {
            cause: '门牌变化',
            development: '核对线索',
            turn: '时间戳提前',
            climax: '规则阻止开门',
            ending: '新时间戳出现',
          },
          plot_lines: {
            mainline: '追查旧楼门牌变化',
            logic_line: '门牌变化 -> 时间戳 -> 规则判定',
          },
          character_order: ['李玄', '林青禾'],
          beat_sequence: ['核对门牌', '发现时间戳', '阻止开门'],
          cost_and_reward: '代价：错过安全窗口；收益：确认规则。',
          ending_contract: {
            next_chapter_pull: '新时间戳指向下一处门牌。',
          },
        },
        state_tracking_contract: {
          source_requirements: [
            '本章细纲/场景卡',
            '上一章正文或上一章承接',
            '追踪/上下文.md',
            '追踪/伏笔.md',
            '追踪/时间线.md',
            '追踪/角色状态.md',
          ],
          source_readiness: [
            {
              key: 'chapter_blueprint',
              label: '本章细纲/场景卡',
              status: 'ready',
              evidence: '第8章蓝图已确认。',
            },
          ],
        },
      },
    })

    expect(checks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'source_readiness_previous_chapter',
      'source_readiness_context_tracking',
      'source_readiness_foreshadowing_tracking',
      'source_readiness_timeline_tracking',
      'source_readiness_character_state',
    ]))
    expect(checks.find((item: any) => item.key === 'source_readiness_previous_chapter')?.severity).toBe('high')
    expect(checks.find((item: any) => item.key === 'source_readiness_context_tracking')?.label).toBe('追踪/上下文')
    expect(checks.find((item: any) => item.key === 'source_readiness_foreshadowing_tracking')?.fix).toContain('追踪/伏笔.md')
    expect(checks.find((item: any) => item.key === 'source_readiness_character_state')?.fix).toContain('追踪/角色状态.md')
  })

  test('requires daily workflow ready source rows to carry concrete evidence', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        chapter_no: 9,
        state_tracking_contract: {
          source_requirements: [
            '上一章正文或上一章承接',
            '追踪/角色状态.md',
          ],
          source_readiness: [
            {
              key: 'previous_chapter',
              label: '上一章正文/章尾钩子',
              status: 'ready',
              evidence: '',
            },
            {
              key: 'character_state',
              label: '追踪/角色状态',
              status: 'ready',
            },
          ],
        },
      },
    })

    expect(checks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'source_readiness_previous_chapter',
      'source_readiness_character_state',
    ]))
    expect(checks.find((item: any) => item.key === 'source_readiness_previous_chapter')?.severity).toBe('high')
    expect(checks.find((item: any) => item.key === 'source_readiness_previous_chapter')?.evidence).toContain('缺少 evidence')
    expect(checks.find((item: any) => item.key === 'source_readiness_character_state')?.fix).toContain('角色状态')
  })

  test('builds source readiness sync report from write-prep source gaps', () => {
    const okReport = buildSourceReadinessSyncReport(
      { title: '旧楼规则' },
      { id: 7, chapter_no: 7, title: '旧楼门牌' },
      {
        chapter_target: {
          chapter_blueprint: {
            target_emotion: '紧张追查',
            opening_hook: '旧楼门牌在子夜前变化。',
            core_payoff: '确认门牌变化来自上一章最后一幕。',
            content_outline: {
              cause: '旧楼门牌变化',
              development: '主角核对上一章线索',
              turn: '时间戳提前',
              climax: '规则判定阻止开门',
              ending: '新时间戳出现',
            },
            plot_lines: {
              mainline: '追查旧楼门牌变化',
              logic_line: '门牌变化 -> 时间戳 -> 规则判定',
            },
            character_order: ['主角', '林晓'],
            beat_sequence: ['核对线索', '验证时间', '规则阻止'],
            cost_and_reward: '代价是不能直接开门，收益是确认时间戳。',
            ending_contract: { next_chapter_pull: '时间戳指向下一次旧楼开门。' },
          },
          state_tracking_contract: {
            source_requirements: ['本章细纲/场景卡', '上一章正文', '追踪/时间线.md'],
            source_readiness: [
              { key: 'chapter_blueprint', label: '本章细纲/蓝图', status: 'ready', evidence: '五段式、代价收益、章尾承接已确认。' },
              { key: 'previous_chapter', label: '上一章正文/章尾钩子', status: 'ready', evidence: '旧楼门牌变化已读取。' },
              { key: 'timeline_tracking', label: '追踪/时间线', status: 'ready', evidence: '当前时间为子夜前。' },
            ],
          },
        },
      },
      '旧楼门牌变化被接住，当前时间仍是子夜前。',
    )
    const warnReport = buildSourceReadinessSyncReport(
      { title: '旧楼规则' },
      { id: 8, chapter_no: 8, title: '缺源测试' },
      {
        chapter_target: {
          state_tracking_contract: {
            source_requirements: ['本章细纲/场景卡', '上一章正文', '追踪/时间线.md'],
            source_readiness: [
              { key: 'previous_chapter', label: '上一章正文/章尾钩子', status: 'missing', fix: '补齐上一章正文、摘要或章尾钩子。' },
              { key: 'character_state', label: '角色状态', status: 'warn', evidence: '只有角色名，没有当前位置和认知边界。' },
            ],
          },
        },
      },
      '正文直接依赖上一章和角色状态，但写前来源未就绪。',
    )

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('来源就绪 OK')
    expect(okReport.missed_count).toBe(0)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('来源就绪缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['上一章正文/章尾钩子', '角色状态', '追踪/时间线']))
    expect(warnReport.next_actions.join('；')).toMatch(/补齐|未就绪来源|既定事实/)
  })

  test('warns when source readiness ready rows use generic evidence', () => {
    const report = buildSourceReadinessSyncReport(
      { title: '旧楼规则' },
      { id: 9, chapter_no: 9, title: '泛化来源' },
      {
        chapter_target: {
          state_tracking_contract: {
            source_requirements: ['上一章正文'],
            source_readiness: [
              { key: 'previous_chapter', label: '上一章正文/章尾钩子', status: 'ready', evidence: '已读取' },
            ],
          },
        },
      },
      '旧楼门牌变化被接住。',
    )

    expect(report.status).toBe('warn')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'source_readiness_previous_chapter',
      label: '上一章正文/章尾钩子',
    })
    expect(report.missed[0].evidence).toContain('泛化')
  })

  test('reads raw camelCase source readiness after delivery', () => {
    const report = buildSourceReadinessSyncReport(
      { title: '旧楼规则' },
      {
        id: 35,
        chapter_no: 35,
        title: '倒放录音',
        raw_payload: {
          preDraftBrief: {
            stateTrackingContract: {
              sourceRequirements: ['上一章正文', '追踪/时间线.md'],
              sourceReadiness: [
                { key: 'previous_chapter', label: '上一章正文/章尾钩子', status: 'ready', evidence: '上一章以磁带倒放收束。' },
                { key: 'timeline_tracking', label: '追踪/时间线', status: 'ready', evidence: '当前时间为子夜后第三分钟。' },
                { key: 'character_state', label: '角色状态', status: 'warn', evidence: '缺李超听到未来回答后的认知边界。', fix: '补齐李超当前认知边界。' },
              ],
            },
          },
        },
      },
      {},
      '李超听见倒放录音，意识到自己处在子夜后第三分钟。',
    )

    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['上一章正文/章尾钩子', '追踪/时间线', '角色状态']))
    expect(report.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['上一章正文/章尾钩子', '追踪/时间线']))
    expect(report.missed.map((item: any) => item.label)).toContain('角色状态')
    expect(report.status).toBe('warn')
  })

  test('story state sync persists a source_readiness_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain("reviewType: 'source_readiness_sync', payloadKey: 'source_readiness_sync'")
    expect(source).toContain('buildSourceReadinessSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.source_readiness_sync = sourceReadinessSync')
  })

  test('builds prose meta sync report from deterministic prose meta leaks', () => {
    const okReport = buildProseMetaSyncReport(
      { title: '袖口旧印' },
      { id: 15, chapter_no: 15, title: '袖口旧印' },
      {},
      [
        '第十五章 袖口旧印',
        '林青禾按住袖口，那枚旧印硌着掌心。',
        '账册夹页被水洇开，露出三年前封存的半枚火漆。',
      ].join('\n'),
    )
    const warnReport = buildProseMetaSyncReport(
      { title: '袖口旧印' },
      { id: 15, chapter_no: 15, title: '袖口旧印' },
      {},
      [
        '第十五章 袖口旧印',
        '林青禾按住袖口，想起上一章那枚旧印。',
        '账册夹页里还藏着一处伏笔，读者会在这里明白代价。',
      ].join('\n'),
    )

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('正文元信息 OK')
    expect(okReport.missed_count).toBe(0)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('正文元信息缺口')
    expect(warnReport.missed.map((item: any) => item.term)).toEqual(['上一章', '伏笔', '读者'])
    expect(warnReport.next_actions.join('；')).toContain('角色当下能感知')
  })

  test('allows in-world chapter references while still flagging authorial chapter meta', () => {
    const allowed = scanProseMetaLeaks([
      '第十六章 禁门旧档',
      '林青禾翻到《禁门录》第三章，指尖停在“夜半不得回头”那一行。',
      '她把书页推到李玄面前：“这一章不是写给弟子的，是写给守门人的。”',
    ].join('\n'))
    const warned = scanProseMetaLeaks([
      '第十六章 禁门旧档',
      '林青禾按住袖口，比第一章那三秒开火更疼。',
      '这处伏笔应该让读者明白代价。',
    ].join('\n'))

    expect(allowed).toHaveLength(0)
    expect(warned.map((item: any) => item.term)).toEqual(['第一章', '伏笔', '读者'])
  })

  test('story state sync persists a prose_meta_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toMatch(/reviewType: 'prose_meta_sync'[\s\S]*payloadKey: 'prose_meta_sync'/)
    expect(source).toContain('buildProseMetaSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.prose_meta_sync = proseMetaSync')
  })

  test('treats incomplete chapter blueprint structure as a hard prose preflight gap', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        state_tracking_contract: {
          source_readiness: [
            {
              key: 'chapter_blueprint',
              label: '本章细纲/蓝图',
              status: 'ready',
              evidence: '只有章节摘要和场景卡。',
            },
          ],
        },
        chapter_blueprint: {
          version: 'oh_story_chapter_blueprint_v1',
          content_outline: {
            cause: '主角被逼到审判庭。',
          },
          plot_lines: {
            mainline: '主角反证旧账册。',
          },
        },
      },
    })

    expect(checks).toHaveLength(1)
    expect(checks[0]).toMatchObject({
      key: 'source_readiness_chapter_blueprint',
      severity: 'high',
      ok: false,
    })
    expect(checks[0].fix).toContain('目标情绪')
    expect(checks[0].fix).toContain('核心回报')
    expect(checks[0].fix).toContain('章尾承接')
  })

  test('allows legacy outlines missing new blueprint fields as nonblocking backfill warnings', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        chapter_no: 18,
        title: '旧账落印',
        chapter_goal: '李玄用旧账缺页反证会长换证。',
        summary: '会长三轮压问，李玄用旧账缺页和袖口暗纹反证。',
        emotional_curve: '压迫 -> 反证 -> 余波',
        opening_hook: '雨夜旧账第一行金额不对。',
        reader_payoff: '李玄夺回审讯解释权。',
        ending_hook: '旧账缺页背后出现内门编号。',
        word_target: 3200,
        state_tracking_contract: {
          source_readiness: [
            {
              key: 'chapter_blueprint',
              label: '本章细纲/蓝图',
              status: 'ready',
              evidence: '旧版细纲已有核心事件、目标情绪、章首钩子、爽点、章尾钩子和字数目标。',
            },
          ],
        },
      },
    })

    const blueprintCheck = checks.find((item: any) => item.key === 'source_readiness_chapter_blueprint')

    expect(blueprintCheck).toBeTruthy()
    expect(blueprintCheck).toMatchObject({
      key: 'source_readiness_chapter_blueprint',
      severity: 'medium',
      ok: false,
    })
    expect(blueprintCheck.fix).toContain('不阻塞日更')
    expect(blueprintCheck.fix).toContain('按新版模板回填')
    expect(blueprintCheck.fix).toContain('[待补充]')
    expect(blueprintCheck.fix).toContain('不要杜撰副线或人物关系')
    expect(blueprintCheck.evidence).toContain('旧版细纲')
  })

  test('blocks prose preflight when scene cards lack goal obstacle or state change', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        chapter_no: 1,
        title: '旧楼门牌',
        scene_cards: [
          {
            scene_no: 1,
            title: '旧楼走廊',
            purpose: '李辰和张智进入旧楼。',
            beat: '两人观察门牌和走廊环境。',
          },
        ],
      },
    })

    const sceneCheck = checks.find((item: any) => item.key === 'source_readiness_scene_card_goal_obstacle_change')
    expect(sceneCheck).toBeTruthy()
    expect(sceneCheck).toMatchObject({
      ok: false,
      severity: 'high',
      label: '场景卡戏剧单元',
    })
    expect(sceneCheck.fix).toContain('目标')
    expect(sceneCheck.fix).toContain('阻碍')
    expect(sceneCheck.fix).toContain('变化')
    expect(sceneCheck.evidence).toContain('旧楼走廊')
  })

  test('accepts scene cards that declare goal obstacle and state change before prose', () => {
    const checks = buildSourceReadinessPreflightChecks({
      chapter_target: {
        chapter_no: 1,
        title: '旧楼门牌',
        scene_cards: [
          {
            scene_no: 1,
            title: '门牌核验',
            purpose: '李辰必须在十秒内找到正确门牌。',
            conflict: '管理员堵在楼梯口，禁止没有权限的人进入档案室。',
            turning_point: '钥匙插入反向锁孔后，门牌变成档案室编号。',
            exit_state: '李辰获得临时权限，下一轮核验提前。',
          },
        ],
      },
    })

    expect(checks.some((item: any) => item.key === 'source_readiness_scene_card_goal_obstacle_change')).toBe(false)
  })

  test('adds timeline tracking to generated state source readiness rows', () => {
    const brief = buildChapterPreDraftBrief({ title: '日更长篇' }, {
      chapter_target: {
        chapter_no: 8,
        title: '旧楼门牌',
        summary: '主角追查旧楼门牌变化。',
        conflict: '时间顺序决定谁在撒谎。',
        ending_hook: '门牌上的日期比今天晚一天。',
        scene_cards: [{ title: '门牌核对', purpose: '确认事件顺序。', conflict: '记录和记忆冲突。' }],
      },
      continuity: {
        previous_chapter: {
          chapter_no: 7,
          summary: '上一章发现旧楼门牌被换过。',
          ending_hook: '门牌日期出现异常。',
        },
      },
      story_state: {
        characters: [{ name: '李辰', current_state: { location: '旧楼门口', knowledge_scope: '知道门牌异常' } }],
        timeline: ['第七章夜里，门牌第一次变号。'],
      },
    })

    const row = brief.state_tracking_contract.source_readiness.find((item: any) => item.key === 'timeline_tracking')
    expect(row).toBeTruthy()
    expect(row.label).toBe('追踪/时间线')
    expect(row.status).toBe('ready')
    expect(row.evidence).toContain('门牌第一次变号')
  })

  test('detects paragraphs that stall without action, dialogue, choice, or information change', () => {
    const checks = scanParagraphProgressionRisks([
      '第4章 旧楼走廊',
      '',
      '走廊尽头的灯罩蒙着灰，暗黄的光落在墙皮裂缝上。',
      '',
      '空气里有潮湿的味道，像旧木柜被雨水泡过很多年。',
      '',
      '窗外的树影贴着玻璃摇晃，整个楼层安静得只剩下风声。',
      '',
      '李辰站在门口，心里生出一种说不清的压迫感。',
    ].join('\n'))

    expect(checks.some(item => item.key === 'consecutive_atmosphere_paragraphs')).toBe(true)
    expect(checks.some(item => item.key === 'paragraph_progression_stall_1')).toBe(true)
    expect(checks[0].fix).toContain('动作、选择、信息变化')
  })

  test('detects meaning-inflation filler without concrete consequence or event progression', () => {
    const fillerChecks = scanMeaningInflationFillerRisks([
      '第4章 旧楼走廊',
      '',
      '这一刻，李辰终于意识到自己肩上的责任比想象中更沉重，这份选择也拥有了前所未有的意义。',
      '',
      '他明白，命运已经在无声处改变，过去所有经历都在此刻汇成了一种难以言说的重量。',
      '',
      '这种成长让他变得更加坚定，也让眼前的一切显得意义深远，仿佛未来终于有了新的方向。',
    ].join('\n'))
    const concreteChecks = scanMeaningInflationFillerRisks([
      '第4章 旧楼走廊',
      '',
      '李辰把钥匙压进门缝，锁芯却反向咬住他的手指。',
      '',
      '"别开！名单变红了。"林青禾抓住他的袖口。',
      '',
      '广播在头顶响起，第三层门牌从白色跳成红色，周薄森当场退到楼梯口。',
    ].join('\n'))

    expect(fillerChecks).toHaveLength(1)
    expect(fillerChecks[0].key).toBe('meaning_inflation_filler_paragraphs_1_3')
    expect(fillerChecks[0].label).toBe('意义膨胀水文扫描')
    expect(fillerChecks[0].evidence).toContain('意义深远')
    expect(fillerChecks[0].fix).toContain('具体后果')
    expect(concreteChecks).toHaveLength(0)
  })

  test('wires deterministic meaning-inflation filler risks into quality audit hard risks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const qualityAuditBlock = source.slice(
      source.indexOf('function buildQualityAuditDeterministicCheck'),
      source.indexOf('function qualityAuditPriority', source.indexOf('function buildQualityAuditDeterministicCheck')),
    )

    expect(qualityAuditBlock).toContain('...scanMeaningInflationFillerRisks(chapterText)')
  })

  test('wires deterministic paragraph progression risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicParagraphProgressionChecks = scanParagraphProgressionRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicParagraphProgressionChecks')
  })

  test('detects narrative transition glue between sub-events', () => {
    const checks = scanNarrativeTransitionRisks([
      '第8章 旧账本',
      '',
      '然后我翻到下一页。',
      '',
      '接着他把校规重新解释了一遍，众人才明白这条规则有多危险。',
    ].join('\n'))

    expect(checks.map(item => item.key)).toEqual(['narrative_transition_glue_line_1', 'narrative_transition_glue_line_2'])
    expect(checks[0].label).toBe('子事件连接扫描')
    expect(checks[0].evidence).toContain('然后我翻到下一页')
    expect(checks[0].fix).toContain('身体动作')
    expect(checks[0].fix).toContain('物件动作')
  })

  test('does not flag body-action connectors or dialogue questions as narrative transition glue', () => {
    const checks = scanNarrativeTransitionRisks([
      '第8章 旧账本',
      '',
      '我把账本搁在膝盖上，手心出一层薄汗。',
      '',
      '“然后呢？”林岚盯着账页边缘的墨痕问。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects time and space jumps without oh-story sensory anchors', () => {
    const checks = scanNarrativeTransitionRisks([
      '第8章 旧账本',
      '',
      '三天后，众人已经到了赤炉城。',
      '',
      '另一边，林青禾已经站在后院。',
    ].join('\n'))

    expect(checks.map(item => item.key)).toEqual(['time_jump_anchor_missing_line_1', 'space_jump_anchor_missing_line_2'])
    expect(checks[0].fix).toContain('动作或物件')
    expect(checks[1].fix).toContain('声音或光影')
  })

  test('does not flag time or space jumps when action object sound or light anchors are visible', () => {
    const checks = scanNarrativeTransitionRisks([
      '第8章 旧账本',
      '',
      '三天后，李玄推开赤炉城门，掌心的封条被汗浸软。',
      '',
      '另一边，铜铃在后院檐下响了三声，林青禾循着灯影推门进去。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic narrative transition risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicNarrativeTransitionChecks = scanNarrativeTransitionRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicNarrativeTransitionChecks')
  })

  test('asks prose self review and revision to enforce oh-story sub-event connectors', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewPrompt = source.slice(
      source.indexOf('const buildProseReviewPrompt'),
      source.indexOf('const buildProseRevisionPrompt'),
    )
    const revisionPrompt = source.slice(
      source.indexOf('const buildProseRevisionPrompt'),
      source.indexOf('const shouldReviseProse'),
    )

    expect(reviewPrompt).toContain('子事件连接')
    expect(reviewPrompt).toContain('不用叙述过渡')
    expect(reviewPrompt).toContain('身体动作')
    expect(revisionPrompt).toContain('子事件连接')
    expect(revisionPrompt).toContain('叙述过渡')
    expect(revisionPrompt).toContain('身体动作、物件动作')
  })

  test('detects scenes without visible goal obstacle or state change', () => {
    const checks = scanSceneGoalObstacleChangeRisks([
      '第4章 旧楼走廊',
      '',
      '李辰站在旧楼走廊里，墙上的灯一盏接一盏亮起。',
      '',
      '张智看着门牌，门牌上的数字慢慢变得模糊。',
      '',
      '楼下传来风声，空气里有一股潮湿的铁锈味。',
      '',
      '两个人都没有说话，只觉得这里比刚才更冷。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_goal_obstacle_change_missing')
    expect(checks[0].label).toBe('场景目标阻碍变化扫描')
    expect(checks[0].evidence).toContain('缺少目标')
    expect(checks[0].fix).toContain('人物要什么')
    expect(checks[0].fix).toContain('什么挡着')
    expect(checks[0].fix).toContain('结束后不同')
  })

  test('does not flag scenes with a goal obstacle and changed state', () => {
    const checks = scanSceneGoalObstacleChangeRisks([
      '第4章 旧楼走廊',
      '',
      '李辰必须在十秒内找到正确门牌，否则张智的名字会从名单上消失。',
      '',
      '管理员堵在楼梯口，抬手按住感应器：“没有权限的人不能进档案室。”',
      '',
      '李辰把刚拿到的钥匙插进反向锁孔，门牌从404变成了档案室编号。',
      '',
      '广播随即改口：“临时权限已生效，下一轮核验提前。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic scene goal obstacle change risks into quality audit self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSceneGoalObstacleChangeChecks = scanSceneGoalObstacleChangeRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicSceneGoalObstacleChangeChecks')
  })

  test('detects combat scenes that skip action process and only report the result', () => {
    const checks = scanCombatProcessRisks([
      '第12章 试炼台',
      '',
      '李玄拔剑冲上去。',
      '',
      '一招过后，执事倒在地上，战斗结束。',
      '',
      '台下众人全都安静下来。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('combat_process_missing_1_3')
    expect(checks[0].label).toBe('战斗过程扫描')
    expect(checks[0].evidence).toContain('一招过后')
    expect(checks[0].fix).toContain('起手')
    expect(checks[0].fix).toContain('对手反应')
    expect(checks[0].fix).toContain('空间')
    expect(checks[0].fix).toContain('反制')
  })

  test('does not flag combat scenes with action reaction space and result', () => {
    const checks = scanCombatProcessRisks([
      '第12章 试炼台',
      '',
      '李玄侧身避开阵光，剑尖贴着石阶挑起火星。',
      '',
      '执事抬臂格挡，袖口被划开，脚跟撞上台阶边缘。',
      '',
      '李玄借台阶换位，反手刺穿阵眼。',
      '',
      '阵光熄灭，执事踉跄退后，手里的名册掉在地上。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic combat process risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicCombatProcessChecks = scanCombatProcessRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicCombatProcessChecks')
  })

  test('detects over-fragmented short narration lines as prose craft risks', () => {
    const checks = scanParagraphFragmentationRisks([
      '第4章 旧楼走廊',
      '门开了。',
      '风进来。',
      '灯灭了。',
      '李辰停住。',
      '没人说话。',
      '水迹停在脚边。',
      '"别动。"',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('paragraph_over_fragmented_short_lines')
    expect(checks[0].label).toBe('段落碎片化扫描')
    expect(checks[0].evidence).toContain('门开了')
    expect(checks[0].evidence).toContain('水迹停在脚边')
    expect(checks[0].fix).toContain('合并')
    expect(checks[0].fix).toContain('戏剧单元')
  })

  test('wires deterministic paragraph fragmentation risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicParagraphFragmentationChecks = scanParagraphFragmentationRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicParagraphFragmentationChecks')
  })

  test('detects uniform paragraph lengths that flatten mobile reading rhythm', () => {
    const checks = scanParagraphLengthUniformityRisks([
      '第4章 旧楼走廊',
      '李辰停在门边，看见水迹贴着门缝往里渗。',
      '张智抬手按住门锁，指节被冷气冻得发白。',
      '走廊那头没有脚步声，只有广播滋滋作响。',
      '门外学生把校牌举高，名字被水泡得发胀。',
      '宿舍里的人都屏住呼吸，没人敢先开口。',
      '墙上的钟停在十二点，秒针却还在轻轻颤。',
      '李辰把那张旧照片翻过来，看见背面多了字。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('paragraph_length_uniformity')
    expect(checks[0].label).toBe('段落长短节奏扫描')
    expect(checks[0].evidence).toContain('李辰停在门边')
    expect(checks[0].evidence).toContain('背面多了字')
    expect(checks[0].fix).toContain('长短交错')
    expect(checks[0].fix).toContain('疏密')
  })

  test('wires deterministic paragraph length uniformity risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicParagraphLengthUniformityChecks = scanParagraphLengthUniformityRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicParagraphLengthUniformityChecks')
  })

  test('detects comma-chain paragraphs that are too dense to read in one breath', () => {
    const checks = scanParagraphCommaChainDensityRisks([
      '第4章 雨夜',
      '',
      '他看着窗外的雨，心中涌起一股说不清的感觉，这些年走过的路和很多已经忘记的事都在这一刻涌上心头。',
      '',
      '他盯着窗外。雨下了很久。',
      '"你还在想她？"老刘问。',
      '他没说话。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('paragraph_comma_chain_density_line_3')
    expect(checks[0].label).toBe('段落密度换气扫描')
    expect(checks[0].evidence).toContain('心中涌起一股说不清的感觉')
    expect(checks[0].fix).toContain('换气')
    expect(checks[0].fix).toContain('按动作或信息变化拆开')
  })

  test('wires deterministic comma-chain paragraph density risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicParagraphCommaChainDensityChecks = scanParagraphCommaChainDensityRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicParagraphCommaChainDensityChecks')
  })

  test('detects consecutive still beats that break oh-story motion-still rhythm', () => {
    const checks = scanProseMotionStillRisks([
      '第13章 旧账',
      '',
      '李辰坐在门边，把钥匙擦了一遍，指腹停在缺口上。',
      '',
      '张智低头理平袖口，目光落在名单最后一行。',
      '',
      '走廊重新安静下来，灯影贴着墙根慢慢晃。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('motion_still_consecutive_still')
    expect(checks[0].label).toContain('一动一静')
    expect(checks[0].evidence).toContain('连续全静')
    expect(checks[0].fix).toContain('动后必静')
  })

  test('wires deterministic motion-still rhythm risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicProseMotionStillChecks = scanProseMotionStillRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicProseMotionStillChecks')
  })

  test('detects stacked description that splits one action into occurrence perception and reaction', () => {
    const checks = scanProseStackedDescriptionRisks([
      '第13章 签字',
      '',
      '林父低着头，左手把文书压住，右手拿笔，往纸上落。',
      '',
      '手在抖。',
      '',
      '手从肘到腕都在抖，笔尖在纸上停了停，写了一横，又停，那个林字的撇写歪了。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('prose_stacked_description')
    expect(checks[0].label).toContain('堆叠式描写')
    expect(checks[0].evidence).toContain('手在抖')
    expect(checks[0].fix).toContain('三维度揉进')
  })

  test('wires deterministic stacked description risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicProseStackedDescriptionChecks = scanProseStackedDescriptionRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicProseStackedDescriptionChecks')
  })

  test('detects static environment description that is not carried by character interaction', () => {
    const checks = scanProseStaticEnvironmentRisks([
      '第13章 雨夜',
      '',
      '窗外的雨越下越密，青石板被水光铺成一片，街角的灯笼在风里轻轻晃，昏黄的光落在湿漉漉的墙面上。',
      '',
      '檐下的积水顺着瓦缝滴落，空气里浮着潮冷的味道，远处偶尔传来一声闷雷，整条街都显得空旷而沉默。',
      '',
      '林砚推开门，雨水扑到袖口上，他低头看见门槛旁那串新鲜脚印。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('prose_static_environment')
    expect(checks[0].label).toContain('环境交互')
    expect(checks[0].evidence).toContain('窗外的雨')
    expect(checks[0].fix).toContain('角色当下感知')
  })

  test('wires deterministic static environment risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicProseStaticEnvironmentChecks = scanProseStaticEnvironmentRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicProseStaticEnvironmentChecks')
  })

  test('detects concrete props and numbers that do not carry plot or emotional function', () => {
    const checks = scanProseDecorativeDetailRisks([
      '第13章 账本',
      '',
      '桌上摊着一本旧账本，第一页写着八万块，旁边放着一把旧钥匙。银色戒指压在账角，内圈刻着三年两个小字，下面还有一张800元收据，纸边已经泛黄。',
      '',
      '窗外雨声更密，屋里一时只剩潮冷的空气。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('prose_decorative_detail')
    expect(checks[0].label).toContain('道具/数字功能')
    expect(checks[0].evidence).toContain('八万块')
    expect(checks[0].fix).toContain('情感重量')
  })

  test('wires deterministic decorative detail risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicProseDecorativeDetailChecks = scanProseDecorativeDetailRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicProseDecorativeDetailChecks')
  })

  test('detects abstract paragraphs without a camera anchor or character body focus', () => {
    const checks = scanProseCameraAnchorRisks([
      '第13章 真相',
      '',
      '所谓真相从来不是答案，而是一场迟来的审判。每个人都在命运和欲望之间摇摆，所有选择最终都会指向无法回头的结局。',
      '',
      '林砚低头看向掌心，钥匙齿痕硌进肉里，他这才听见门外第二个人的脚步声。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('prose_no_camera_anchor')
    expect(checks[0].label).toContain('镜头对象')
    expect(checks[0].evidence).toContain('所谓真相')
    expect(checks[0].fix).toContain('角色身体')
  })

  test('wires deterministic camera-anchor risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicProseCameraAnchorChecks = scanProseCameraAnchorRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicProseCameraAnchorChecks')
  })

  test('detects omniscient crowd camera lines that pull out of limited POV', () => {
    const checks = scanProseOmniscientCrowdCameraRisks([
      '第14章 问罪',
      '',
      '整个审判厅陷入死寂。',
      '所有人都被这一幕震住。',
      '全场鸦雀无声，只剩下江辰手里的账册。',
      '江辰听见自己指节压住纸页的声音。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('omniscient_crowd_camera_line_3')
    expect(checks[0].label).toBe('深度限知远景扫描')
    expect(checks[0].evidence).toContain('整个审判厅陷入死寂')
    expect(checks[0].fix).toContain('角色此刻')
    expect(checks[0].fix).toContain('心跳')
  })

  test('wires deterministic omniscient crowd camera risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicProseOmniscientCrowdCameraChecks = scanProseOmniscientCrowdCameraRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicProseOmniscientCrowdCameraChecks')
  })

  test('detects long exposition paragraphs where setting is not carried by conflict', () => {
    const checks = scanInfodumpRisks([
      '第5章 规则课',
      '',
      '规则塔体系分为三层，第一层负责记录学生身份，第二层负责校验夜间行动权限，第三层则会根据违规次数触发不同惩罚。这个机制的原理来自旧校区留下的契约，因此所有进入教学楼的人都会被自动纳入名单。所谓名单并不是普通纸页，而是一种绑定灵魂的设定，通常只有管理员才能修改。',
      '',
      '李辰抬头时，广播忽然响起：“十秒后核验身份。”',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('infodump_paragraph_1')
    expect(checks[0].evidence).toContain('规则塔体系')
    expect(checks[0].fix).toContain('冲突')
  })

  test('wires deterministic infodump risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicInfodumpChecks = scanInfodumpRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicInfodumpChecks')
  })

  test('detects recap filler paragraphs that repeat prior events without new perspective', () => {
    const checks = scanRecapFillerRisks([
      '第6章 旧名单',
      '',
      '李辰想起之前在旧教学楼里发生的一切。那时候广播第一次响起，名单第一次变红，门牌也曾经自己翻转。过去那些细节在脑海里一遍遍浮现，当初每个人的表情都很紧张，昨晚那阵风和那张旧纸也让他记了很久。',
      '',
      '玻璃门忽然震了一下，点名册上的红字往下渗。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('recap_filler_paragraph_1')
    expect(checks[0].label).toBe('回忆复述水字数扫描')
    expect(checks[0].evidence).toContain('之前在旧教学楼')
    expect(checks[0].fix).toContain('新证据')
    expect(checks[0].fix).toContain('当前冲突')
  })

  test('does not flag recap when it produces a new clue or decision', () => {
    const checks = scanRecapFillerRisks([
      '第6章 旧名单',
      '',
      '李辰想起昨晚门牌翻转的顺序，终于意识到第三块门牌不是编号，而是指向点名册背面的血印。他伸手按住名单，决定先验证那枚血印。',
      '',
      '玻璃门忽然震了一下，点名册上的红字往下渗。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic recap filler risks into quality audit and cleanup gates', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )
    const cleanupBlock = readFileSync(join(import.meta.dir, '../novel-writing/deterministic-prose-cleanup.ts'), 'utf8').slice(
      readFileSync(join(import.meta.dir, '../novel-writing/deterministic-prose-cleanup.ts'), 'utf8').indexOf('export function buildDeterministicProseCleanupReport'),
      readFileSync(join(import.meta.dir, '../novel-writing/deterministic-prose-cleanup.ts'), 'utf8').indexOf('export function buildQualityGateReviewWithDeterministicCleanup'),
    )

    expect(reviewBlock).toContain('const deterministicRecapFillerChecks = scanRecapFillerRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicRecapFillerChecks')
    expect(cleanupBlock).toContain('const fillerChecks = scanRecapFillerRisks(proseScanText)')
    expect(cleanupBlock).toContain("type: 'filler'")
  })

  test('detects abstract emotion telling that should be grounded in body action', () => {
    const checks = scanEmotionTellingRisks([
      '第6章 名单核验',
      '',
      '李辰感到一阵恐惧，他心里很慌，也不知道该怎么面对眼前的广播。',
      '',
      '张智抓住他的手腕，把学生证按在感应区上。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('emotion_telling_line_3')
    expect(checks[0].evidence).toContain('感到一阵恐惧')
    expect(checks[0].fix).toContain('身体动作')
  })

  test('detects vague complex-emotion telling without body action anchors', () => {
    const brokenChecks = scanEmotionTellingRisks([
      '第6章 名单核验',
      '',
      '沈栀心中泛起一种复杂的情绪，那种说不清的滋味让她一时间无法回应。',
      '',
      '旧账本停在桌角。',
    ].join('\n'))
    const anchoredChecks = scanEmotionTellingRisks([
      '第6章 名单核验',
      '',
      '沈栀握紧账本，指节压到发白，那种说不清的滋味堵在喉咙里，她没有立刻开口。',
    ].join('\n'))

    expect(brokenChecks).toHaveLength(1)
    expect(brokenChecks[0].key).toBe('emotion_telling_line_3')
    expect(brokenChecks[0].label).toBe('情绪动作化扫描')
    expect(brokenChecks[0].evidence).toContain('复杂的情绪')
    expect(brokenChecks[0].fix).toContain('可见行为')
    expect(anchoredChecks).toHaveLength(0)
  })

  test('wires deterministic emotion telling risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEmotionTellingChecks = scanEmotionTellingRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicEmotionTellingChecks')
  })

  test('detects repeated same-emotion paragraphs without new action or payoff', () => {
    const checks = scanEmotionalStasisRisks([
      '第12章 红灯之后',
      '',
      '李辰心里一阵恐惧，广播里的清除两个字像冷水灌进后背。他感到害怕，连指尖都像被冻住。',
      '',
      '他仍然害怕，胸口的恐惧一层层压下来，脑子里只剩下如果失败就完了这个念头。',
      '',
      '恐惧继续蔓延，他感到无比不安，所有声音都像隔着水面传来。',
      '',
      '门外忽然响起第二个人的脚步声。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('emotional_stasis_fear_1_3')
    expect(checks[0].label).toBe('情绪原地打转扫描')
    expect(checks[0].evidence).toContain('第1-3段')
    expect(checks[0].fix).toContain('动作')
    expect(checks[0].fix).toContain('新信息')
    expect(checks[0].fix).toContain('释放')
  })

  test('wires deterministic emotional stasis risks into emotional arc self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEmotionalStasisChecks = scanEmotionalStasisRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicEmotionalStasisChecks')
  })

  test('detects downward pressure without reader safety signal', () => {
    const checks = scanDownwardSafetyRisks([
      '第12章 公审台',
      '',
      '主任当众把李辰的申请表撕碎，冷声说他这种人不配参加终审。',
      '',
      '台下几个学生跟着笑起来，有人故意把他的资料踢到地上。',
      '',
      '副考官宣布他的资格暂时冻结，如果再申诉就直接记过。',
      '',
      '李辰低头站在原地，身边没有一个人替他说话。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('downward_without_safety_1_3')
    expect(checks[0].label).toBe('下行情节安全感扫描')
    expect(checks[0].evidence).toContain('第1-3段')
    expect(checks[0].fix).toContain('锅是别人的')
    expect(checks[0].fix).toContain('可能的解法')
  })

  test('does not flag downward pressure when a counterplay signal keeps reader safety', () => {
    const checks = scanDownwardSafetyRisks([
      '第12章 公审台',
      '',
      '主任当众把李辰的申请表撕碎，冷声说他这种人不配参加终审。',
      '',
      '李辰没有争辩，只把袖口里的录音笔往掌心压了一下，红点还在亮。',
      '',
      '副考官宣布他的资格暂时冻结，如果再申诉就直接记过。',
      '',
      '张智在台下抬眼，看见监控屏右上角的备份进度已经跳到百分之九十七。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic downward safety risks into emotional arc self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDownwardSafetyChecks = scanDownwardSafetyRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDownwardSafetyChecks')
  })

  test('detects oppression that does not serve payoff, counterplay, or information gain', () => {
    const checks = scanOppressionPurposeRisks([
      '第12章 审判台',
      '',
      '执事把名册摔到李玄脚边，逼他跪下认罪。',
      '',
      '台下弟子跟着哄笑，有人骂他废物，有人让他滚出阵堂。',
      '',
      '李玄低头沉默，任由那些话砸在身上。',
      '',
      '长老挥手让他退到角落，这场审问暂时结束。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('oppression_without_purpose_1_4')
    expect(checks[0].label).toBe('压制目的扫描')
    expect(checks[0].evidence).toContain('逼他跪下')
    expect(checks[0].fix).toContain('后续爆发')
    expect(checks[0].fix).toContain('反击')
    expect(checks[0].fix).toContain('信息收益')
  })

  test('does not flag oppression when it sets up counterplay or payoff', () => {
    const checks = scanOppressionPurposeRisks([
      '第12章 审判台',
      '',
      '执事把名册摔到李玄脚边，逼他跪下认罪。',
      '',
      '台下弟子跟着哄笑，有人骂他废物，有人让他滚出阵堂。',
      '',
      '李玄没有跪，只把袖口里的录音红点亮给众人看。',
      '',
      '下一息，他反手把真账册推上桌，逼执事当众解释缺页来源。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic oppression purpose risks into emotional arc self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicOppressionPurposeChecks = scanOppressionPurposeRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicOppressionPurposeChecks')
  })

  test('detects long chapter stretches without visible reader payoff', () => {
    const dryParagraph = '李辰沿着旧楼的走廊往前走，墙上的值日表被风吹得轻轻晃动，地面积着一层潮气，他停下来听了听远处的广播，又把昨天整理过的资料重新在脑子里过了一遍。'
    const checks = scanPayoffDensityRisks([
      '第12章 旧楼长廊',
      '',
      dryParagraph.repeat(12),
      '',
      '他把资料收回包里，继续往楼梯口走去。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('payoff_density_gap_1_2')
    expect(checks[0].label).toBe('回报密度扫描')
    expect(checks[0].evidence).toContain('连续')
    expect(checks[0].fix).toContain('800-1200字')
    expect(checks[0].fix).toContain('信息增量')
    expect(checks[0].fix).toContain('小回收')
  })

  test('does not flag payoff density when the stretch has information gain or counterplay', () => {
    const dryParagraph = '李辰沿着旧楼的走廊往前走，墙上的值日表被风吹得轻轻晃动，地面积着一层潮气，他停下来听了听远处的广播，又把昨天整理过的资料重新在脑子里过了一遍。'
    const checks = scanPayoffDensityRisks([
      '第12章 旧楼长廊',
      '',
      dryParagraph.repeat(5),
      '',
      '他终于发现门禁阵纹的第二层规则，袖口里的旧钥匙随之发热，藏书阁封锁被他反制出一道缺口。',
      '',
      dryParagraph.repeat(4),
      '',
      '张智看懂他的手势，第一次公开站到他身侧，低声说这份记录可以洗清昨夜的污名。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic payoff density risks into emotional arc self review and cleanup gate', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )
    const cleanupBlock = readFileSync(join(import.meta.dir, '../novel-writing/deterministic-prose-cleanup.ts'), 'utf8').slice(
      readFileSync(join(import.meta.dir, '../novel-writing/deterministic-prose-cleanup.ts'), 'utf8').indexOf('export function buildDeterministicProseCleanupReport'),
      readFileSync(join(import.meta.dir, '../novel-writing/deterministic-prose-cleanup.ts'), 'utf8').indexOf('const categories = [', readFileSync(join(import.meta.dir, '../novel-writing/deterministic-prose-cleanup.ts'), 'utf8').indexOf('export function buildDeterministicProseCleanupReport')),
    )

    expect(reviewBlock).toContain('const deterministicPayoffDensityChecks = scanPayoffDensityRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicPayoffDensityChecks')
    expect(cleanupBlock).toContain('const payoffDensityChecks = scanPayoffDensityRisks(proseScanText)')
  })

  test('detects repeated payoff beats without escalation', () => {
    const checks = scanPayoffEscalationRisks([
      '第12章 连环反击',
      '',
      '李辰拿出第一份报告，台下所有人震惊，对面的学生脸色发白。',
      '',
      '他又拿出第二份报告，所有人再次震惊，那个学生彻底说不出话。',
      '',
      '他继续拿出第三份报告，全场还是震惊，对方只能低头认输。',
      '',
      '李辰收起报告，转身离开。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('payoff_escalation_flat_1_3')
    expect(checks[0].label).toBe('爽点递增扫描')
    expect(checks[0].evidence).toContain('第1-3段')
    expect(checks[0].fix).toContain('影响范围')
    expect(checks[0].fix).toContain('揭示深度')
    expect(checks[0].fix).toContain('身份落差')
  })

  test('does not flag payoff beats that escalate scope depth or stakes', () => {
    const checks = scanPayoffEscalationRisks([
      '第12章 连环反击',
      '',
      '李辰拿出第一份报告，班里所有人震惊，刚才嘲笑他的学生脸色发白。',
      '',
      '他把第二份审计报告投到大屏上，主考官也站了起来，因为这证明整场考核记录被人改过。',
      '',
      '第三份名单公开时，院长亲自按停直播：名单背后牵出的是校董会交易，所有涉事人都要接受调查。',
      '',
      '广播随即改写规则：“下一轮核验，由李辰指定名单。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic payoff escalation risks into emotional arc self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicPayoffEscalationChecks = scanPayoffEscalationRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicPayoffEscalationChecks')
  })

  test('detects trump cards or goldfingers revealed without visible effect', () => {
    const checks = scanTrumpCardEffectRisks([
      '第12章 试炼台',
      '',
      '李玄终于亮出袖中的底牌，残阵在掌心亮起。',
      '',
      '执事只看了一眼，冷笑道：“不过如此。”',
      '',
      '下一刻，执事反而一掌把他逼退三步，台下弟子跟着哄笑。',
      '',
      '李玄收回手，没有再解释。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('trump_card_effect_missing_1')
    expect(checks[0].label).toBe('底牌效果扫描')
    expect(checks[0].evidence).toContain('亮出袖中的底牌')
    expect(checks[0].fix).toContain('金手指')
    expect(checks[0].fix).toContain('压制')
    expect(checks[0].fix).toContain('效果')
  })

  test('does not flag trump cards when the opponent is visibly suppressed', () => {
    const checks = scanTrumpCardEffectRisks([
      '第12章 试炼台',
      '',
      '李玄终于亮出袖中的底牌，残阵在掌心亮起。',
      '',
      '执事脸色发白，刚才压住他的阵图当场裂开。',
      '',
      '台下弟子倒吸一口凉气，主考官第一次站起身：“这道残阵反制了禁库阵纹。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic trump card effect risks into emotional arc self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicTrumpCardEffectChecks = scanTrumpCardEffectRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicTrumpCardEffectChecks')
  })

  test('detects upgrades that do not show new ability or rebuild the next threshold', () => {
    const checks = scanUpgradeAftermathRisks([
      '第13章 二阶',
      '',
      '系统提示等级提升，李玄突破到二阶，面板上多了一行奖励。',
      '',
      '众人点头，掌柜也松了口气，事情就这样结束。',
      '',
      '李玄收起面板，回到房间休息。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('upgrade_aftermath_missing_1')
    expect(checks[0].label).toBe('升级后果扫描')
    expect(checks[0].evidence).toContain('等级提升')
    expect(checks[0].fix).toContain('新能力威力')
    expect(checks[0].fix).toContain('更高门槛')
  })

  test('does not flag upgrades that show a new ability and introduce a higher threshold', () => {
    const checks = scanUpgradeAftermathRisks([
      '第13章 二阶',
      '',
      '系统提示等级提升，李玄突破到二阶。',
      '',
      '他第一次看见设备内壁隐藏裂纹，指尖一压，三秒内修好那台报废进口机，客户当场改口加价。',
      '',
      '然而屏幕随即弹出医院设备的红色警报：下一台机器必须在十分钟内完成，否则整层病房都会断电。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic upgrade aftermath risks into upgrade rhythm self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicUpgradeAftermathChecks = scanUpgradeAftermathRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicUpgradeAftermathChecks')
  })

  test('wires deterministic upgrade rhythm hard risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicUpgradeRhythmChecks = [buildUpgradeRhythmDeterministicCheck(chapterText)].filter(Boolean)')
    expect(reviewBlock).toContain('...deterministicUpgradeRhythmChecks')
  })

  test('detects long internal monologue runs as prose craft AI smell', () => {
    const checks = scanInternalMonologueRisks([
      '第13章 门后的人',
      '',
      '李辰突然明白，管理员从一开始就在试探他。',
      '他意识到那张名单不是警告，而是筛选。',
      '他心里想，如果自己刚才开门，张智一定会被拖进走廊。',
      '他终于知道，广播里漏掉的名字才是今晚真正的陷阱。',
      '门外的钥匙轻轻碰了一下锁孔。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('internal_monologue_run_3_6')
    expect(checks[0].label).toBe('内心独白压缩扫描')
    expect(checks[0].evidence).toContain('管理员从一开始')
    expect(checks[0].evidence).toContain('真正的陷阱')
    expect(checks[0].fix).toContain('压缩为1句')
    expect(checks[0].fix).toContain('动作')
    expect(checks[0].fix).toContain('对白')
  })

  test('detects internal monologue runs split across prose paragraphs', () => {
    const checks = scanInternalMonologueRisks([
      '第13章 门后的人',
      '',
      '李辰突然明白，管理员从一开始就在试探他。',
      '',
      '他意识到那张名单不是警告，而是筛选。',
      '',
      '他心里想，如果自己刚才开门，张智一定会被拖进走廊。',
      '',
      '门外的钥匙轻轻碰了一下锁孔。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('internal_monologue_run_3_7')
    expect(checks[0].evidence).toContain('管理员从一开始')
    expect(checks[0].evidence).toContain('不是警告')
    expect(checks[0].fix).toContain('连续3句以上内心独白')
  })

  test('detects parenthetical internal monologue labels that break immersion', () => {
    const checks = scanInternalMonologueRisks([
      '第13章 门后的人',
      '',
      '李辰把手按在门锁上。',
      '（他心想：管理员果然一直在试探我，我绝不能露怯。）',
      '门缝里的钥匙轻轻碰了一下锁孔。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('parenthetical_internal_monologue_line_4')
    expect(checks[0].label).toBe('括号内心活动扫描')
    expect(checks[0].evidence).toContain('他心想')
    expect(checks[0].fix).toContain('用行为暗示心理')
  })

  test('detects unsafe specific character-count expressions in prose craft checks', () => {
    const checks = scanSpecificCharacterCountExpressionRisks([
      '第8章 旧印',
      '',
      '林青禾只说：“门后有人。”这五个字一落，审判席全静了。',
      '短短四字砸下来，执事的手指停在账册边。',
      '三个字一落，门缝里的呼吸声忽然断了。',
    ].join('\n'))
    const safeChecks = scanSpecificCharacterCountExpressionRisks([
      '第8章 旧印',
      '',
      '林青禾只说：“门后有人。”这句话一落，审判席全静了。',
      '那几个字砸下来，执事的手指停在账册边。',
      '话音落下，门缝里的呼吸声忽然断了。',
    ].join('\n'))

    expect(checks).toHaveLength(3)
    expect(checks[0].label).toBe('具体字数表达扫描')
    expect(checks[0].evidence).toContain('这五个字')
    expect(checks[0].fix).toContain('这句话一落')
    expect(checks[0].fix).toContain('那几个字')
    expect(safeChecks).toHaveLength(0)
  })

  test('wires deterministic internal monologue risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicInternalMonologueChecks = scanInternalMonologueRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicInternalMonologueChecks')
  })

  test('wires deterministic specific character-count expression risks into prose craft self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicSpecificCharacterCountChecks = scanSpecificCharacterCountExpressionRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicSpecificCharacterCountChecks')
  })

  test('detects dialogue that turns into exposition instead of agenda or conflict', () => {
    const checks = scanDialogueInfodumpRisks([
      '第7章 管理员',
      '',
      '管理员推了推眼镜，说：“规则塔体系分为三层，第一层负责记录学生身份，第二层负责校验夜间行动权限，第三层会根据违规次数触发不同惩罚。这个机制来自旧校区契约，因此所有进入教学楼的人都会被自动纳入名单，通常只有管理员才能修改。”',
      '',
      '广播在他身后响了一声。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_infodump_line_3')
    expect(checks[0].evidence).toContain('规则塔体系')
    expect(checks[0].fix).toContain('对白')
  })

  test('detects short consecutive science-mouth dialogue without pressure action or evidence', () => {
    const scienceMouthChecks = scanDialogueInfodumpRisks([
      '第7章 管理员',
      '"规则塔的权限分为三层，学生只能进入第一层。"',
      '"第二层负责校验夜间行动名单，第三层触发惩罚机制。"',
      '"这个体系来自旧校区契约，因此管理员通常能修改身份记录。"',
      '走廊里很安静，三个人都站在原地听完。',
    ].join('\n'))
    const embeddedChecks = scanDialogueInfodumpRisks([
      '第7章 管理员',
      '"为什么我的名字在第二层名单里？"',
      '管理员刚要开口，广播忽然响起，墙上的身份灯从白色跳成红色。',
      '"看见了吗？第二层只校验夜间行动，红灯说明有人刚改过你的权限。"',
      '李辰按住门锁，血从指缝里渗出来。',
    ].join('\n'))

    expect(scienceMouthChecks).toHaveLength(1)
    expect(scienceMouthChecks[0].key).toBe('dialogue_science_mouth_lines_2_4')
    expect(scienceMouthChecks[0].label).toBe('信息型配角科普嘴扫描')
    expect(scienceMouthChecks[0].evidence).toContain('权限分为三层')
    expect(scienceMouthChecks[0].fix).toContain('压力下挤出的半句话')
    expect(embeddedChecks).toHaveLength(0)
  })

  test('wires deterministic dialogue infodump risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueInfodumpChecks = scanDialogueInfodumpRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueInfodumpChecks')
  })

  test('detects authorial forecast lines that replace concrete page-turn hooks', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '李辰没有意识到，更大的风暴即将来临。',
      '命运的齿轮，也在这一刻开始转动。',
    ].join('\n'))

    expect(checks).toHaveLength(2)
    expect(checks[0].gate).toBe('G')
    expect(checks[0].pattern).toContain('作者预告')
    expect(checks[0].fix).toContain('现场')
  })

  test('detects explanatory causality that tells readers what the scene should mean', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '他之所以沉默，是因为终于明白名单背后的真相。',
      '原来所有人的退让，都只是为了等他亲手签下那张纸。',
      '',
      '门外的脚步声停住了。',
    ].join('\n'))

    expect(checks).toHaveLength(2)
    expect(checks[0].pattern).toContain('之所以')
    expect(checks[1].pattern).toContain('原来')
    expect(checks[0].fix).toContain('动作')
  })

  test('detects author verdicts that tell readers how to judge a character', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '他就是这样薄情的人。',
      '她演得真好，连旁边的人都没有看出破绽。',
      '王婶笑得恰到好处，像早就排练过一样。',
    ].join('\n'))

    expect(checks).toHaveLength(3)
    expect(checks[0].pattern).toContain('替读者定性')
    expect(checks[0].fix).toContain('证据')
    expect(checks[2].pattern).toContain('评判性补语')
  })

  test('detects summarized character psychology that replaces body reaction', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '她明白，这一切都是命。',
      '他终于懂了，自己不过是名单上最轻的一笔。',
      '',
      '纸角从他指缝里滑下去。',
    ].join('\n'))

    expect(checks).toHaveLength(2)
    expect(checks[0].pattern).toContain('总结心理')
    expect(checks[0].fix).toContain('身体反应')
  })

  test('detects spoiled subtext and verdict metaphors that over-explain the scene', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '谁都看得出他在撒谎。',
      '那点笑她看得分明。',
      '那句话落下来，像在宣判一件早已定好的事。',
      '他望着她，像看一件死物。',
    ].join('\n'))

    expect(checks).toHaveLength(4)
    expect(checks[0].pattern).toContain('点破潜台词')
    expect(checks[2].pattern).toContain('定性比喻')
    expect(checks[0].fix).toContain('别点破')
  })

  test('detects god-view spoilers and hard backstory setup that break present-tense scene pressure', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '殊不知，门外那个人早已换了身份。',
      '多年以后，她才知道这一天其实早有预兆。',
      '关于规则塔的来历，要从十年前那场事故说起。',
      '为了理解这一切，必须从三年前的黑名单实验说起。',
    ].join('\n'))

    expect(checks).toHaveLength(4)
    expect(checks[0].pattern).toContain('上帝视角剧透')
    expect(checks[2].pattern).toContain('硬铺垫')
    expect(checks[2].fix).toContain('闪念')
  })

  test('detects essay-style transitions that pull prose out of the live scene', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '不难看出，规则塔的设计本质上是一套筛选机制。',
      '由此可见，李辰的反击并不是偶然。',
      '综上所述，这场审判已经进入新的阶段。',
      '诚然，黑名单仍然危险，因而他必须保持冷静。',
    ].join('\n'))

    expect(checks).toHaveLength(4)
    expect(checks[0].pattern).toContain('论文体')
    expect(checks[3].pattern).toContain('书面语连词')
    expect(checks[0].fix).toContain('现场')
  })

  test('detects professional diction stacks that make narration read like a report', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '规则塔的运行机制、惩罚结构和筛选逻辑组成完整体系。',
      '管理员进一步深入落实名单权限，推进夜巡制度升级。',
      '张智摸到门背后的三道刻痕，第三道还在渗水。',
    ].join('\n'))

    expect(checks).toHaveLength(2)
    expect(checks[0].pattern).toContain('去书面化')
    expect(checks[0].fix).toContain('白话')
    expect(checks[0].fix).toContain('现场')
    expect(checks[1].pattern).toContain('体制内动词')
  })

  test('detects inflated significance phrases that replace concrete consequences', () => {
    const checks = scanAuthorialForecastRisks([
      '第8章 黑名单',
      '',
      '这次选择意义深远。',
      '这是一场前所未有的胜利。',
      '可谓彻底改写了规则塔的格局。',
    ].join('\n'))

    expect(checks).toHaveLength(3)
    expect(checks[0].pattern).toContain('意义膨胀')
    expect(checks[0].fix).toContain('具体后果')
    expect(checks[2].fix).toContain('删掉')
  })

  test('wires deterministic authorial forecast risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicAuthorialForecastChecks = scanAuthorialForecastRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicAuthorialForecastChecks')
  })

  test('detects repeated subject sentence starts as mechanical Gate B prose', () => {
    const checks = scanRepeatedSubjectRisks([
      '第9章 名单之后',
      '',
      '李辰抬起头。李辰看见黑板上的名字。李辰伸手按住学生证。李辰没有说话。',
      '广播在窗外响了一声。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('B')
    expect(checks[0].pattern).toContain('主语重复')
    expect(checks[0].evidence).toContain('李辰抬起头')
    expect(checks[0].fix).toContain('动作开句')
  })

  test('detects triple parallel phrasing that makes prose feel mechanically complete', () => {
    const checks = scanTripleParallelRisks([
      '第9章 名单之后',
      '',
      '他看见了黑板上的名字，听见了广播里的杂音，闻到了门缝里的铁锈味。',
      '张智把学生证按回桌面。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('B')
    expect(checks[0].pattern).toContain('三连排比')
    expect(checks[0].evidence).toContain('看见了黑板')
    expect(checks[0].fix).toContain('最有力的一条')
  })

  test('detects oh-story explicit parallel templates with three 有的 or 一边 clauses', () => {
    const crowdChecks = scanTripleParallelRisks([
      '第9章 名单之后',
      '',
      '有的人低头改名，有的人把学生证塞进口袋，有的人转身往楼梯跑。',
    ].join('\n'))
    const simultaneousChecks = scanTripleParallelRisks([
      '第9章 名单之后',
      '',
      '他一边稳住门后的锁，一边把名单塞给张智，一边盯着广播屏。',
      '她一边走一边说：“别回头。”',
    ].join('\n'))

    expect(crowdChecks).toHaveLength(1)
    expect(crowdChecks[0].pattern).toContain('三连排比')
    expect(crowdChecks[0].evidence).toContain('有的人低头改名')
    expect(simultaneousChecks).toHaveLength(1)
    expect(simultaneousChecks[0].evidence).toContain('一边稳住门后的锁')
    expect(simultaneousChecks[0].fix).toContain('最有力的一条')
  })

  test('wires deterministic repeated-subject risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicRepeatedSubjectChecks = scanRepeatedSubjectRisks(chapterText)')
    expect(reviewBlock).toContain('const deterministicTripleParallelChecks = scanTripleParallelRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicRepeatedSubjectChecks')
    expect(reviewBlock).toContain('...deterministicTripleParallelChecks')
  })

  test('detects repeated body or silence reactions as Gate C filler', () => {
    const checks = scanRepeatedReactionRisks([
      '第10章 留校名单',
      '',
      '李辰沉默了几秒，把名单推回桌面。',
      '张智看着广播灯，也沉默了下来。',
      '门外的人影贴住玻璃，李辰再次沉默。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('C')
    expect(checks[0].pattern).toContain('重复反应')
    expect(checks[0].evidence).toContain('沉默')
    expect(checks[0].fix).toContain('选择')
  })

  test('wires deterministic repeated-reaction risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicRepeatedReactionChecks = scanRepeatedReactionRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicRepeatedReactionChecks')
  })

  test('detects flat short-sentence rhythm as Gate D pacing risk', () => {
    const checks = scanUniformRhythmRisks([
      '第11章 值夜名单',
      '',
      '李辰走到门前。张智看向窗外。广播响了一声。门外影子停住。名单落在桌上。灯光闪了一下。两人没有开口。走廊恢复安静。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('D')
    expect(checks[0].pattern).toContain('节奏均匀')
    expect(checks[0].evidence).toContain('李辰走到门前')
    expect(checks[0].fix).toContain('长短句')
  })

  test('wires deterministic uniform-rhythm risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicUniformRhythmChecks = scanUniformRhythmRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicUniformRhythmChecks')
  })

  test('detects generic explanatory dialogue tone as Gate E prose smell', () => {
    const checks = scanDialogueToneRisks([
      '第12章 管理员',
      '',
      '管理员说：“你要明白，这件事没有那么简单，也就是说规则背后还有另一套机制。”',
      '张智问：“另一套机制？”',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('E')
    expect(checks[0].pattern).toContain('对话腔调')
    expect(checks[0].evidence).toContain('你要明白')
    expect(checks[0].fix).toContain('议程')
  })

  test('detects formal written diction in short dialogue that should sound spoken', () => {
    const checks = scanDialogueToneRisks([
      '第12章 管理员',
      '',
      '管理员说：“我认为此事不妥。”',
      '张智说：“这事不靠谱。”',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('E')
    expect(checks[0].pattern).toContain('对白书面语')
    expect(checks[0].evidence).toContain('我认为此事不妥')
    expect(checks[0].fix).toContain('我觉得不靠谱')
  })

  test('wires deterministic dialogue-tone risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueToneChecks = scanDialogueToneRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueToneChecks')
  })

  test('detects consecutive dialogue lines that share the same explanatory voice', () => {
    const checks = scanDialogueVoiceSamenessRisks([
      '第12章 管理员',
      '"所以这件事的关键在于门禁记录，而不是谁先到了走廊。"',
      '"所以这件事的关键在于广播时间，而不是你看到的影子。"',
      '"所以这件事的关键在于钥匙编号，而不是管理员说了什么。"',
      '"所以这件事的关键在于墙上的名单，而不是他们现在承认什么。"',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_voice_sameness_lines_2_5')
    expect(checks[0].label).toBe('角色声线趋同扫描')
    expect(checks[0].evidence).toContain('门禁记录')
    expect(checks[0].evidence).toContain('墙上的名单')
    expect(checks[0].fix).toContain('口癖')
    expect(checks[0].fix).toContain('身份措辞')
  })

  test('wires deterministic dialogue voice sameness risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueVoiceSamenessChecks = scanDialogueVoiceSamenessRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueVoiceSamenessChecks')
  })

  test('detects long uninterrupted dialogue runs without breathing beats', () => {
    const checks = scanDialogueBreathRisks([
      '第12章 管理员',
      '"你先别开门，门外的人知道我们的名字。"',
      '"可他还知道三楼的广播顺序。"',
      '"这说明他至少听过上一轮规则。"',
      '"也可能说明上一轮有人把记录交给了他。"',
      '"那我们现在要不要把钥匙藏起来？"',
      '"藏钥匙没用，编号已经被登记了。"',
      '"登记表在管理员手里。"',
      '"所以要先拿到登记表。"',
      '"拿不到呢？"',
      '"那就逼管理员自己拿出来。"',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_breath_lines_2_11')
    expect(checks[0].label).toBe('对白呼吸感扫描')
    expect(checks[0].evidence).toContain('你先别开门')
    expect(checks[0].evidence).toContain('逼管理员自己拿出来')
    expect(checks[0].fix).toContain('换气')
    expect(checks[0].fix).toContain('环境')
  })

  test('detects medium dialogue runs that miss action emotion breathing beats', () => {
    const brokenChecks = scanDialogueBreathRisks([
      '第12章 管理员',
      '"你先别开门，门外的人知道我们的名字。"',
      '"可他还知道三楼的广播顺序。"',
      '"这说明他至少听过上一轮规则。"',
      '"也可能说明上一轮有人把记录交给了他。"',
      '"那我们现在要不要把钥匙藏起来？"',
      '"藏钥匙没用，编号已经被登记了。"',
      '走廊尽头的红灯忽然闪了一下。',
    ].join('\n'))
    const anchoredChecks = scanDialogueBreathRisks([
      '第12章 管理员',
      '"你先别开门，门外的人知道我们的名字。"',
      '"可他还知道三楼的广播顺序。"',
      '张智把掌心压在门把上，先听了一次门外的呼吸声。',
      '"这说明他至少听过上一轮规则。"',
      '"也可能说明上一轮有人把记录交给了他。"',
      '"那我们现在要不要把钥匙藏起来？"',
      '"藏钥匙没用，编号已经被登记了。"',
    ].join('\n'))

    expect(brokenChecks).toHaveLength(1)
    expect(brokenChecks[0].key).toBe('dialogue_breath_lines_2_7')
    expect(brokenChecks[0].fix).toContain('动作')
    expect(brokenChecks[0].fix).toContain('身体反应')
    expect(anchoredChecks).toHaveLength(0)
  })

  test('wires deterministic dialogue breath risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueBreathChecks = scanDialogueBreathRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueBreathChecks')
  })

  test('detects dialogue sections that exceed oh-story dialogue density guidance', () => {
    const checks = scanDialogueDensityRisks([
      '第12章 管理员',
      '"你必须解释门禁记录为什么提前三分钟亮起，这不是巧合。"',
      '"我没有义务解释，你们现在应该先承认自己违反了夜巡规则。"',
      '"规则写的是不得离开宿舍，可名单上的名字是在走廊里消失的。"',
      '"名单只是名单，真正决定你们能不能活下去的是广播下一次播报。"',
      '"你又在绕开问题，门禁、名单、广播三件事不可能同时出错。"',
      '"我绕开的不是问题，是你们以为自己已经看懂了规则这件事。"',
      '"所以你知道真正的触发条件，却一直让我们在错误条件里试探。"',
      '"我知道的是，继续问下去，你们会比名单上的人更早消失。"',
      '"那就说明我们问对了。"',
      '管理员手里的钥匙停在半空，第一次没有立刻插进锁孔。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toContain('dialogue_density')
    expect(checks[0].label).toContain('对白篇幅')
    expect(checks[0].evidence).toContain('对白占比')
    expect(checks[0].fix).toContain('不超过全节 40%')
  })

  test('wires deterministic dialogue density risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueDensityChecks = scanDialogueDensityRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueDensityChecks')
  })

  test('detects embedded dialogue and mechanical dialogue tags as oh-story format risks', () => {
    const checks = scanDialogueFormatRisks([
      '第12章 管理员',
      '',
      '她把杯子放下，说道：“你走吧。”他没有动。',
      '林智道：“门外那个人在撒谎。”',
      '"别动。"',
    ].join('\n'))

    expect(checks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'dialogue_embedded_line_3',
      'dialogue_mechanical_tag_line_3',
      'dialogue_mechanical_tag_line_4',
    ]))
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('对白独立成行')
    expect(checks.map((item: any) => item.fix).join('｜')).toContain('动作或上下文')
    expect(checks.map((item: any) => item.evidence).join('｜')).not.toContain('"别动。"')
  })

  test('detects trailing formulaic dialogue tags from oh-story examples', () => {
    const checks = scanDialogueFormatRisks([
      '第12章 管理员',
      '',
      '"好的。"他说道。',
      '"门外有人。"她问道。',
      '"别动。"他点了根烟。',
    ].join('\n'))

    const mechanicalTagChecks = checks.filter((item: any) => String(item.key || '').startsWith('dialogue_mechanical_tag_line_'))
    expect(mechanicalTagChecks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'dialogue_mechanical_tag_line_3',
      'dialogue_mechanical_tag_line_4',
    ]))
    expect(mechanicalTagChecks.map((item: any) => item.evidence).join('｜')).toContain('"好的。"他说道')
    expect(mechanicalTagChecks.map((item: any) => item.fix).join('｜')).toContain('动作或上下文')
    expect(mechanicalTagChecks.map((item: any) => item.evidence).join('｜')).not.toContain('点了根烟')
  })

  test('wires deterministic dialogue-format risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueFormatChecks = scanDialogueFormatRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueFormatChecks')
  })

  test('detects mixed dialogue quote styles before relying on model self review', () => {
    const checks = scanDialogueQuoteStyleRisks([
      '第12章 管理员',
      '',
      '"别开门。"',
      '「你听见了吗？」',
      '"门外那个人在撒谎。"',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_quote_style_mixed')
    expect(checks[0].label).toBe('对白引号风格扫描')
    expect(checks[0].evidence).toContain('"别开门。"')
    expect(checks[0].evidence).toContain('「你听见了吗？」')
    expect(checks[0].fix).toContain('统一')
    expect(checks[0].fix).toContain('项目/平台')
  })

  test('wires deterministic dialogue quote style risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueQuoteStyleChecks = scanDialogueQuoteStyleRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueQuoteStyleChecks')
  })

  test('detects dialogue power balance risks when both sides use long speeches in pressure scenes', () => {
    const checks = scanDialoguePowerBalanceRisks([
      '第12章 管理员',
      '',
      '「你以为把门关上就有用吗？我告诉你，今晚宿舍每个人都看见你拿了那张卡，你现在不开门，明天就等着全楼一起指认你。」',
      '「你不要以为这样就能吓住我，我已经把监控时间、值班表和门锁记录都查过了，你们所谓的证据只是诱导我违反规则。」',
      '门缝里的水迹停住了。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toContain('dialogue_power_balance')
    expect(checks[0].label).toBe('对白权力差扫描')
    expect(checks[0].evidence).toContain('你以为把门关上就有用吗')
    expect(checks[0].evidence).toContain('你不要以为这样就能吓住我')
    expect(checks[0].fix).toContain('掌控者')
    expect(checks[0].fix).toContain('短句')
  })

  test('wires deterministic dialogue power balance risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialoguePowerBalanceChecks = scanDialoguePowerBalanceRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialoguePowerBalanceChecks')
  })

  test('detects face-slap dialogue where protagonist explains longer than the antagonist pressures', () => {
    const checks = scanDialogueProtagonistLineEconomyRisks([
      '第12章 公审台',
      '',
      '执事把旧账册摔到审判桌上。',
      '"你输了。"',
      '"我没有输，因为昨晚监控少了三分钟，账册第三页也不是我撕的，录音和检测报告都能证明你们诱导我承认。"',
      '"解释没有用。"',
      '"转账截图、旧印编号和报告编号已经连起来了，足够反证旧账册。"',
      '李辰把报告推到灯下，执事脸色惨白。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_protagonist_line_economy')
    expect(checks[0].label).toBe('主角台词短句扫描')
    expect(checks[0].evidence).toContain('你输了')
    expect(checks[0].evidence).toContain('我没有输')
    expect(checks[0].fix).toContain('主角台词')
    expect(checks[0].fix).toContain('短')
  })

  test('does not flag face-slap dialogue when antagonist talks longer and protagonist uses short control lines', () => {
    const checks = scanDialogueProtagonistLineEconomyRisks([
      '第12章 公审台',
      '',
      '执事把旧账册摔到审判桌上。',
      '"你以为把报告拿出来就能翻案吗？旧账册、库房记录和昨晚值守名单全都指向你，现在认罪还来得及。"',
      '"第三页。"',
      '"什么第三页？"',
      '"念。"',
      '李辰把检测报告推到灯下，旧账册当场被反证。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic protagonist line economy risks into dialogue self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueProtagonistLineEconomyChecks = scanDialogueProtagonistLineEconomyRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueProtagonistLineEconomyChecks')
  })

  test('detects interview-like question answer dialogue loops', () => {
    const checks = scanDialogueQuestionAnswerLoopRisks([
      '第12章 管理员',
      '"你昨晚在哪里？"',
      '"宿舍。"',
      '"谁能证明？"',
      '"张智。"',
      '"你为什么离开过三楼？"',
      '"广播让我去楼梯口。"',
      '门缝里的水迹往里挪了一寸。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_question_answer_loop')
    expect(checks[0].label).toBe('问答式对白扫描')
    expect(checks[0].evidence).toContain('你昨晚在哪里')
    expect(checks[0].evidence).toContain('广播让我去楼梯口')
    expect(checks[0].fix).toContain('一问一答')
    expect(checks[0].fix).toContain('动作/表情/心理')
  })

  test('wires deterministic dialogue question answer loops into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueQuestionAnswerLoopChecks = scanDialogueQuestionAnswerLoopRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueQuestionAnswerLoopChecks')
  })

  test('detects face-slap dialogue that explains evidence without judgment questions', () => {
    const checks = scanDialogueJudgmentQuestionRisks([
      '第12章 公审台',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼李辰认罪。',
      '"你现在解释也没用，旧账册已经写明你昨晚进过库房。"',
      '"我没有进库房，监控少了三分钟，账册缺页也不是我撕的，你们所谓的证据只是诱导我承认。"',
      '"那你倒是拿出证据。"',
      '"录音、检测报告和转账截图都在这里，足够反证旧账册。"',
      '李辰把报告推到灯下，执事脸色惨白。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_judgment_questions_missing')
    expect(checks[0].label).toBe('审判式对白扫描')
    expect(checks[0].evidence).toContain('旧账册')
    expect(checks[0].fix).toContain('审判式提问')
    expect(checks[0].fix).toContain('自爆')
  })

  test('does not flag face-slap dialogue when short judgment questions force self-incrimination', () => {
    const checks = scanDialogueJudgmentQuestionRisks([
      '第12章 公审台',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼李辰认罪。',
      '"第三页是谁撕的？"',
      '"我怎么知道第三页被撕了？"',
      '"那枚旧印为什么在你袖口？"',
      '"不可能，我明明把旧印收进暗格了。"',
      '李辰把录音和检测报告推到灯下，旧账册当场被反证。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('wires deterministic judgment-question risks into dialogue self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueJudgmentQuestionChecks = scanDialogueJudgmentQuestionRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueJudgmentQuestionChecks')
  })

  test('detects dialogue that states true motive instead of subtext and agenda', () => {
    const checks = scanDialogueSubtextAgendaRisks([
      '第12章 管理员',
      '"我的目的就是让你开门，然后把规则册交出来。"',
      '李辰没有动。',
      '"你不该把真正想要的东西说得这么清楚。"',
    ].join('\n'))

    expect(checks).toHaveLength(2)
    expect(checks[0].key).toBe('dialogue_subtext_agenda_line_2')
    expect(checks[0].label).toBe('潜台词与议程扫描')
    expect(checks[0].evidence).toContain('我的目的')
    expect(checks[0].fix).toContain('真实动机')
    expect(checks[0].fix).toContain('借口')
    expect(checks[0].fix).toContain('试探')
  })

  test('wires deterministic dialogue subtext agenda risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueSubtextAgendaChecks = scanDialogueSubtextAgendaRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueSubtextAgendaChecks')
  })

  test('detects empty side-character praise dialogue as fake support', () => {
    const checks = scanDialogueEmptyPraiseRisks([
      '第12章 管理员',
      '"李辰，你太厉害了，大家全靠你了。"',
      '"不愧是你，没人比得上你。"',
      '张智只看着门缝，没有接话。',
    ].join('\n'))

    expect(checks).toHaveLength(2)
    expect(checks[0].key).toBe('dialogue_empty_praise_line_2')
    expect(checks[0].label).toBe('空泛夸赞对白扫描')
    expect(checks[0].evidence).toContain('你太厉害了')
    expect(checks[0].fix).toContain('配角无脑夸主角')
    expect(checks[0].fix).toContain('代价')
  })

  test('wires deterministic empty praise dialogue risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueEmptyPraiseChecks = scanDialogueEmptyPraiseRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueEmptyPraiseChecks')
  })

  test('detects abrupt dialogue emotion jumps without transition beats', () => {
    const checks = scanDialogueEmotionContinuityRisks([
      '第12章 管理员',
      '"我快撑不住了，门后那东西一直在笑。"',
      '"哈哈，别紧张，今晚还挺有意思的。"',
      '走廊的灯没有任何变化。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_emotion_continuity_lines_2_3')
    expect(checks[0].label).toBe('对白情绪连续性扫描')
    expect(checks[0].evidence).toContain('快撑不住了')
    expect(checks[0].evidence).toContain('还挺有意思')
    expect(checks[0].fix).toContain('过渡动作')
    expect(checks[0].fix).toContain('情绪台阶')
  })

  test('detects dialogue that ignores the previous line emotion and switches to procedure', () => {
    const brokenChecks = scanDialogueEmotionContinuityRisks([
      '第12章 管理员',
      '"我怕，手一直在抖，求你别开门。"',
      '"按流程，先把钥匙编号，再记录门牌和名单。"',
      '走廊里只有纸页翻动的声音。',
    ].join('\n'))
    const anchoredChecks = scanDialogueEmotionContinuityRisks([
      '第12章 管理员',
      '"我怕，手一直在抖，求你别开门。"',
      '"我知道你怕。看着我，先呼吸，钥匙给我，我来编号。"',
      '张智把手压在门把上，没有立刻开门。',
    ].join('\n'))

    expect(brokenChecks).toHaveLength(1)
    expect(brokenChecks[0].key).toBe('dialogue_emotion_nonresponse_lines_2_3')
    expect(brokenChecks[0].label).toBe('对白情绪承接扫描')
    expect(brokenChecks[0].evidence).toContain('求你别开门')
    expect(brokenChecks[0].evidence).toContain('按流程')
    expect(brokenChecks[0].fix).toContain('回应上一句对方的情绪状态')
    expect(anchoredChecks).toHaveLength(0)
  })

  test('wires deterministic dialogue emotion continuity risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueEmotionContinuityChecks = scanDialogueEmotionContinuityRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueEmotionContinuityChecks')
  })

  test('detects dialogue that makes a character instantly persuaded by explanation', () => {
    const checks = scanDialogueEasyPersuasionRisks([
      '第12章 管理员',
      '"因为广播只在整点响，所以门后的不是管理员。"',
      '"只要你现在把钥匙交给我，我们就能避开下一轮点名。"',
      '"你说得对，我被你说服了，就按你说的办。"',
      '门外仍然没有任何动静。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_easy_persuasion_lines_2_4')
    expect(checks[0].label).toBe('对白说服人物扫描')
    expect(checks[0].evidence).toContain('因为广播只在整点响')
    expect(checks[0].evidence).toContain('你说得对')
    expect(checks[0].fix).toContain('突发状况')
    expect(checks[0].fix).toContain('证据')
  })

  test('wires deterministic dialogue easy persuasion risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicDialogueEasyPersuasionChecks = scanDialogueEasyPersuasionRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicDialogueEasyPersuasionChecks')
  })

  test('detects ending summary uplift as Gate F prose smell', () => {
    const checks = scanEndingSummaryRisks([
      '第13章 门后名单',
      '',
      '李辰把书本收进书包，走廊终于安静下来。',
      '经历了这一切，他终于明白，这只是新的开始，未来还有更大的挑战等着他。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('F')
    expect(checks[0].pattern).toContain('章末总结')
    expect(checks[0].evidence).toContain('终于明白')
    expect(checks[0].fix).toContain('具体钩子')
  })

  test('detects philosophical final-line slogans instead of concrete page-turn hooks', () => {
    const checks = scanEndingSummaryRisks([
      '第13章 门后名单',
      '',
      '李辰把校牌按回掌心，门外的脚步声渐渐远了。',
      '他终于明白了生活的真谛：有时候，放手才是最好的选择。',
      '这一夜，注定无人入眠。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].pattern).toContain('章末总结')
    expect(checks[0].evidence).toContain('生活的真谛')
    expect(checks[0].fix).toContain('动作')
  })

  test('detects universal happy-ending conclusions without unresolved tension', () => {
    const checks = scanEndingSummaryRisks([
      '第13章 门后名单',
      '',
      '李辰收起黑名单，众人终于松了一口气。',
      '这一刻，所有人都相信未来可期，前途无量。',
      '走廊尽头重新充满希望。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].pattern).toContain('章末总结')
    expect(checks[0].evidence).toContain('未来可期')
    expect(checks[0].fix).toContain('动作')
  })

  test('detects sentimental time-passing endings from oh-story rewrite examples', () => {
    const checks = scanEndingSummaryRisks([
      '第13章 门后名单',
      '',
      '李辰把校牌塞进口袋，门外那串脚印停在楼梯口。',
      '岁月如流水般悄然流逝。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('F')
    expect(checks[0].pattern).toContain('章末总结')
    expect(checks[0].evidence).toContain('岁月如流水')
    expect(checks[0].fix).toContain('直接删掉')
  })

  test('wires deterministic ending-summary risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicEndingSummaryChecks = scanEndingSummaryRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicEndingSummaryChecks')
  })

  test('detects punctuation tone issues before relying on model self review', () => {
    const checks = scanPunctuationToneRisks([
      '第14章 第三个证人',
      '',
      '证人低着头，说：“我……我不知道——真的不知道!!!”',
      '李辰盯着他：“你确定？？？”',
    ].join('\n'))

    expect(checks.map(item => item.key)).toContain('punctuation_hard_pause_line_3')
    expect(checks.map(item => item.key)).toContain('punctuation_random_pile_line_3')
    expect(checks.map(item => item.key)).toContain('punctuation_random_pile_line_4')
    expect(checks[0].label).toBe('语气标点谱系扫描')
    expect(checks[0].fix).toContain('动作')
  })

  test('detects period-only monotony as punctuation tone risk', () => {
    const checks = scanPeriodMonotonyRisks([
      '第14章 第三个证人',
      '李辰站在门口。',
      '门外没有声音。',
      '水迹停在脚边。',
      '张智看着墙上的表。',
      '秒针停在十二点。',
      '宿舍里的人都没有动。',
      '广播里的电流声慢慢变轻。',
      '管理员的影子贴在玻璃上。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('punctuation_period_monotony')
    expect(checks[0].label).toBe('通篇句号化扫描')
    expect(checks[0].evidence).toContain('李辰站在门口')
    expect(checks[0].evidence).toContain('管理员的影子')
    expect(checks[0].fix).toContain('质问')
    expect(checks[0].fix).toContain('语气')
  })

  test('wires deterministic punctuation tone risks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const deterministicPunctuationToneChecks = scanPunctuationToneRisks(chapterText)')
    expect(reviewBlock).toContain('const deterministicPeriodMonotonyChecks = scanPeriodMonotonyRisks(chapterText)')
    expect(reviewBlock).toContain('...deterministicPunctuationToneChecks')
    expect(reviewBlock).toContain('...deterministicPeriodMonotonyChecks')
  })

  test('summarizes deslop gate checks into stable diagnostics for the workspace UI', () => {
    const diagnostics = buildDeslopGateDiagnostics([
      { gate: 'A', pattern: '不是A，而是B', status: 'fail', evidence: '不是害怕，而是规则变了。', fix: '直接写事实。' },
      { gate: 'A', pattern: '一丝', status: 'warn', evidence: '眼中闪过一丝光。', fix: '改成动作。' },
      { gate: 'E', pattern: '对话腔调模板化', status: 'warn', evidence: '你要明白，这件事没那么简单。', fix: '补议程。' },
    ])

    expect(diagnostics.version).toBe('oh_story_deslop_gate_diagnostics_v1')
    expect(diagnostics.gates.map(item => item.gate).join('')).toBe('ABCDEFG')
    expect(diagnostics.total).toBe(3)
    expect(diagnostics.concern_gate_count).toBe(2)
    expect(diagnostics.gates.find(item => item.gate === 'A')?.status).toBe('fail')
    expect(diagnostics.gates.find(item => item.gate === 'A')?.count).toBe(2)
    expect(diagnostics.gates.find(item => item.gate === 'E')?.evidence).toContain('你要明白')
    expect(diagnostics.gates.find(item => item.gate === 'G')?.status).toBe('pass')
  })

  test('wires deslop gate diagnostics into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('if (options.revise === false || !shouldReviseProse', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const normalizedDeslopChecks = [')
    expect(reviewBlock).toContain('deslop_checks: normalizedDeslopChecks')
    expect(reviewBlock).toContain('deslop_gate_diagnostics: buildDeslopGateDiagnostics(normalizedDeslopChecks)')
  })

  test('adds a fail check when a required contract review field is missing', () => {
    const checks = appendMissingContractReviewCheck(
      [],
      { version: 'oh_story_dialogue_contract_v1' },
      'dialogue_checks',
      'dialogue_contract',
      '对白质量',
    )

    expect(checks).toHaveLength(1)
    expect(checks[0]).toMatchObject({
      key: 'missing_dialogue_checks',
      label: '缺少对白质量自检',
      status: 'fail',
    })
    expect(checks[0].evidence).toContain('chapter_target.dialogue_contract')
    expect(checks[0].fix).toContain('dialogue_checks')
  })

  test('does not add missing-contract fail checks on lightweight structured review paths', () => {
    const checks = appendMissingContractReviewCheck(
      [],
      { version: 'oh_story_dialogue_contract_v1' },
      'dialogue_checks',
      'dialogue_contract',
      '对白质量',
      { emit_missing_check: false },
    )

    expect(checks).toEqual([])
  })

  test('does not add a missing-contract fail check when model checks exist', () => {
    const checks = appendMissingContractReviewCheck(
      [{ key: 'voice', label: '声线差异', status: 'pass' }],
      { version: 'oh_story_dialogue_contract_v1' },
      'dialogue_checks',
      'dialogue_contract',
      '对白质量',
    )

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('voice')
  })

  test('adds a fail check when state tracking contract lacks status filter receipts', () => {
    const checks = appendMissingStatusFilterReceiptCheck(
      [],
      {
        version: 'oh_story_state_tracking_v1',
        character_states: ['李玄：残阵只能维持三息。'],
        historical_causality: ['旧钥匙缺口：第13章待回收。'],
        world_constraints: ['禁门规则：旧钥匙触发会暴露继承权。'],
        source_requirements: ['本章细纲/场景卡', '上一章正文', '追踪/角色状态.md'],
      },
    )

    expect(checks).toHaveLength(1)
    expect(checks[0]).toMatchObject({
      key: 'missing_status_filter_receipts',
      label: '缺少状态筛选回执',
      status: 'fail',
    })
    expect(checks[0].evidence).toContain('chapter_target.state_tracking_contract')
    expect(checks[0].fix).toContain('status_filter_receipts')
    expect(checks[0].fix).toContain('used_in_chapter')
    expect(checks[0].fix).toContain('excluded_reason')
  })

  test('reads required review contracts from runtime camelCase chapterTarget', () => {
    const contract = getContextContract(
      {
        chapterTarget: {
          qualityAuditContract: {
            source: 'runtime_chapter_target_quality_contract',
            checks: ['本章一句话概括必须可见'],
          },
        },
      },
      'quality_audit_contract',
    )

    expect(contract?.source).toBe('runtime_chapter_target_quality_contract')
    expect(contract?.checks).toContain('本章一句话概括必须可见')
  })

  test('detects failing structured review checks for normalized review pass state', () => {
    expect(hasFailingReviewChecks({
      dialogue_checks: [
        { key: 'voice', label: '声线差异', status: 'warn' },
      ],
      quality_audit_checks: [
        { key: 'missing_quality_audit_checks', label: '缺少质量诊断自检', status: 'fail' },
      ],
    })).toBe(true)
  })

  test('ignores non-failing structured review checks for normalized review pass state', () => {
    expect(hasFailingReviewChecks({
      dialogue_checks: [
        { key: 'voice', label: '声线差异', status: 'warn' },
      ],
      quality_audit_checks: [
        { key: 'structure', label: '章节结构', status: 'pass' },
      ],
    })).toBe(false)
  })

  test('detects warn or fail structured review checks as revision-worthy', () => {
    expect(hasReviewChecksNeedingRepair({
      dialogue_checks: [
        { key: 'voice', label: '声线差异', status: 'warn' },
      ],
    })).toBe(true)
    expect(hasReviewChecksNeedingRepair({
      quality_audit_checks: [
        { key: 'missing_quality_audit_checks', label: '缺少质量诊断自检', status: 'fail' },
      ],
    })).toBe(true)
  })

  test('ignores passing structured review checks as revision-worthy', () => {
    expect(hasReviewChecksNeedingRepair({
      dialogue_checks: [
        {
          key: 'voice',
          label: '声线差异',
          status: 'pass',
          speaker: '周远',
          agenda: '用短句压住对手继续逼问',
          subtext: '表面追问账册，实际逼对方承认旧证有效',
          power_shift: '对手从质问转为解释',
          information_delta: '读者知道账册缺页和旧证有关',
          character_voice: '克制、短句、先证据后判断',
          evidence: '周远只问“账册第七页呢”，逼执事停住。',
          fix: '保持短句逼问，不改成解释型长对白。',
          remaining_risk: '',
        },
      ],
      quality_audit_checks: [
        {
          key: 'structure',
          label: '章节结构',
          status: 'pass',
          strategy: 'keep',
          purpose_tag: '冲突推进',
          density_change: '核心对峙展开，过渡压缩',
          conflict_bound_info: '账册缺页信息绑定执事阻拦',
          changed_evidence: '对峙段直接改变双方权力位置。',
          fix: '保持冲突推进段展开，避免增加纯过渡。',
          remaining_risk: '',
        },
      ],
    })).toBe(false)
  })

  test('treats passing pre-draft checks with generic evidence as revision-worthy', () => {
    expect(hasReviewChecksNeedingRepair({
      intent_confirmation_checks: [
        {
          key: 'emotion_goal',
          label: '情绪目标',
          status: 'pass',
          delivered: true,
          evidence: '已完成。',
          fix: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      source_readiness_checks: [
        {
          key: 'source_readiness_previous_chapter',
          label: '上一章正文',
          status: 'pass',
          delivered: true,
          evidence: 'ready',
          fix: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      story_state_update_checks: [
        {
          key: 'character_updates_missing',
          label: '角色状态未写回',
          status: 'pass',
          delivered: true,
          source_excerpt: '已经写回。',
          evidence: '已经同步。',
          fix: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      story_state_update_checks: [
        {
          key: 'character_updates_missing',
          label: '角色状态未写回',
          status: 'pass',
          delivered: true,
          source_excerpt: '已经写回。',
          evidence: '周远醒来只撑住半句话，手臂仍不能抬。',
          fix: '',
        },
      ],
    })).toBe(true)
  })

  test('treats passing structured review checks with generic fixes as revision-worthy', () => {
    expect(hasReviewChecksNeedingRepair({
      quality_audit_checks: [
        {
          key: 'chapter_progress',
          label: '章节推进',
          status: 'pass',
          strategy: 'rewrite',
          purpose_tag: '冲突推进',
          density_change: '对峙展开，过渡压缩',
          conflict_bound_info: '账册缺页信息绑定执事阻拦',
          changed_evidence: '守军听完旧证后立刻改了城门换防令。',
          fix: '已处理。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)
  })

  test('treats passing structured checks with missing contract fields as revision-worthy', () => {
    expect(hasReviewChecksNeedingRepair({
      story_state_update_checks: [
        {
          key: 'character_updates_missing',
          label: '角色状态未写回',
          status: 'pass',
          state_domain: 'character',
          target_file: '追踪/角色状态.md',
          update_path: 'character_updates.周远',
          before_state: '昏迷未醒',
          after_state: '短暂苏醒但行动受限',
          evidence: '周远醒来只撑住半句话，手臂仍不能抬。',
          fix: '补写角色状态。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      foreshadowing_delta_checks: [
        {
          key: 'missing_tracking_entry',
          label: '新增伏笔未登记',
          status: 'pass',
          clue_name: '带血腰牌',
          delta_type: '新增',
          current_status: '已埋下，未回收',
          chapter: '第12章',
          source_excerpt: '主角在禁门下拾起带血腰牌。',
          fix: '补伏笔名、增量类型、当前状态、章节、来源摘录和台账路径。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      chapter_handoff_checks: [
        {
          key: 'previous_handoff',
          label: '上一章最后一幕',
          status: 'pass',
          previous_handoff: '阵盘第二道裂纹逼近主角。',
          opening_obligation: '前300字接住裂纹压力。',
          evidence: '开篇直接写裂纹压住门槛，主角被迫先处理阵盘。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      write_preparation_checks: [
        {
          key: 'previous_chapter_source',
          label: '上一章来源',
          status: 'pass',
          delivered_evidence: '开篇承接上一章阵盘裂纹，并让裂纹压力推进当前目标。',
          fix: '补齐上一章承接来源。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      source_readiness_checks: [
        {
          key: 'previous_chapter',
          label: '上一章正文',
          status: 'pass',
          chapter_evidence: '开篇承接上一章阵盘裂纹，并让裂纹压力推进当前目标。',
          fix: '补齐上一章来源就绪记录。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      intent_confirmation_checks: [
        {
          key: 'emotion_goal',
          label: '情绪目标',
          status: 'pass',
          evidence: '正文用裂纹压力把焦虑推到主角当场选择。',
          fix: '校准情绪目标。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      benchmark_recall_checks: [
        {
          key: 'rhythm_reference',
          label: '节奏召回',
          status: 'pass',
          evidence: '开篇三段内完成压力、判断、行动递进。',
          fix: '校准节奏召回。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      style_sample_checks: [
        {
          key: 'dialogue_ratio',
          label: '对白比例',
          status: 'pass',
          evidence: '对峙段用短句对白推进判断，没有复制样章原句。',
          fix: '校准样章策略。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      reader_retention_checks: [
        {
          key: 'page_turn',
          label: '章末追读',
          status: 'pass',
          evidence: '章末留下第三个名字和下一章追查压力。',
          fix: '校准追读留存。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      target_reader_checks: [
        {
          key: 'reader_desire',
          label: '目标读者欲望',
          status: 'pass',
          evidence: '主角用旧证反压执事，满足被误解后反杀的期待。',
          fix: '校准目标读者。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    expect(hasReviewChecksNeedingRepair({
      genre_positioning_checks: [
        {
          key: 'core_hook',
          label: '题材核心梗',
          status: 'pass',
          evidence: '规则审判场用旧证翻盘，规则约束参与胜负。',
          fix: '校准题材定位。',
          remaining_risk: '',
        },
      ],
    })).toBe(true)

    const richContractCheckFields = [
      'female_audience_checks',
      'upgrade_rhythm_checks',
      'structure_checks',
      'progression_checks',
      'information_checks',
      'information_flow_checks',
      'expectation_threshold_checks',
      'story_loop_checks',
      'emotional_arc_checks',
      'chapter_hook_checks',
      'paragraph_hook_checks',
      'suspense_checks',
      'conflict_structure_checks',
      'opening_checks',
      'bridge_unit_checks',
      'reversal_checks',
      'showdown_checks',
      'prose_craft_checks',
      'punctuation_tone_checks',
      'content_rubric_checks',
      'quality_audit_checks',
      'core_contract_checks',
      'dialogue_checks',
      'plot_dynamics_checks',
      'continuity_heat_checks',
      'character_relation_checks',
      'character_behavior_checks',
      'asset_linkage_checks',
      'state_tracking_checks',
      'style_boundary_checks',
      'chapter_hook_quality_checks',
      'serial_risk_repair_checks',
      'longform_checks',
      'deslop_repair_checks',
      'innovation_checks',
      'chapter_attraction_checks',
      'story_drive_checks',
      'character_arc_checks',
      'chapter_benchmark_checks',
      'title_uniqueness_checks',
      'prose_meta_checks',
      'banned_words_checks',
      'blueprint_consumption_checks',
      'word_count_checks',
      'revision_receipt_checks',
      'status_filter_receipts',
      'next_chapter_quality_plan_receipts',
    ]
    for (const checkField of richContractCheckFields) {
      expect(hasReviewChecksNeedingRepair({
        [checkField]: [
          {
            key: `${checkField}_self_report`,
            label: '只给了通过状态',
            status: 'pass',
            evidence: '正文看起来已经处理。',
            fix: '模型自称已处理。',
            remaining_risk: '',
          },
        ],
      })).toBe(true)
    }
  })

  test('does not require rich review fields on delivered pre-draft execution receipts', () => {
    expect(hasReviewChecksNeedingRepair({
      write_preparation_checks: [
        {
          key: 'previous_chapter_source',
          label: '上一章来源',
          status: 'pass',
          delivered: true,
          evidence: '开篇承接上一章阵盘裂纹，并让裂纹压力推进当前目标。',
          remaining_risk: '',
        },
      ],
    })).toBe(false)

    expect(hasReviewChecksNeedingRepair({
      source_readiness_checks: [
        {
          key: 'previous_chapter',
          label: '上一章正文',
          status: 'pass',
          delivered: true,
          evidence: '开篇承接上一章阵盘裂纹，并让裂纹压力推进当前目标。',
          remaining_risk: '',
        },
      ],
    })).toBe(false)
  })

  test('wires missing contract review checks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )

    expect(reviewBlock).toContain('requiredContractChecks')
    expect(reviewBlock).toContain('dialogue_contract')
    expect(reviewBlock).toContain('quality_audit_contract')
    expect(source).toContain('appendMissingContractReviewCheck')
  })

  test('marks normalized self review score as defaulted only when model omits score', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const scoreStart = source.indexOf('const rawReviewScore = Number(reviewPayload?.score)')
    const reviewBlock = source.slice(
      scoreStart,
      source.indexOf('if (options.revise === false', scoreStart),
    )

    expect(scoreStart).toBeGreaterThan(0)
    expect(reviewBlock).toContain('const rawReviewScore = Number(reviewPayload?.score)')
    expect(reviewBlock).toContain('const reviewScoreDefaulted = !Number.isFinite(rawReviewScore)')
    expect(reviewBlock).toContain('const deterministicWordCountIssueGuard = applyDeterministicWordCountIssueGuard')
    expect(reviewBlock).toContain('score: reviewScoreDefaulted ? 80 : deterministicWordCountIssueGuard.score')
    expect(reviewBlock).toContain('score_defaulted: reviewScoreDefaulted')
  })

  test('asks prose self review and revision to cover dialogue execution checklist', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    expect(source).toContain('dialogue_execution_checklist')
    expect(source).toContain('必须按对话执行清单逐场覆盖 dialogue_checks')
    expect(source).toContain('dialogue_checks.changed_evidence')
  })

  test('aligns normalized review passed flag with failing structured checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )

    expect(reviewBlock).toContain('normalizedReview.passed = normalizedReview.passed && !hasFailingReviewChecks(normalizedReview)')
  })

  test('aligns normalized review needs_revision flag with repair-worthy structured checks', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )

    expect(reviewBlock).toContain('normalizedReview.needs_revision = normalizedReview.needs_revision || hasReviewChecksNeedingRepair(normalizedReview)')
  })

  test('does not synthesize missing structured contract failures when structured fill is disabled', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)'),
      source.indexOf('const structuredFillReview = await fillMissingStructuredReviewChecks', source.indexOf('const deterministicProseMetaChecks = scanProseMetaLeaks(chapterText)')),
    )

    expect(reviewBlock).toContain('const emitMissingStructuredContractChecks = options.fill_missing_structured_checks !== false')
    expect(reviewBlock).toContain('emit_missing_check: emitMissingStructuredContractChecks')
  })

  test('wires foreshadowing delta checks into normalized self review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewBlock = source.slice(
      source.indexOf('const normalizedReview = {'),
      source.indexOf('if (options.revise === false', source.indexOf('const normalizedReview = {')),
    )

    expect(reviewBlock).toContain("foreshadowing_delta_checks: reviewChecks('foreshadowing_delta_checks', 'foreshadowingDeltaChecks')")
  })

  test('detects duplicate chapter titles after removing chapter number prefixes', () => {
    const report = buildChapterTitleUniquenessReport([
      { id: 1, chapter_no: 1, title: '第1章 门外学生' },
      { id: 2, chapter_no: 2, title: '守则初读' },
      { id: 3, chapter_no: 3, title: '门外学生' },
    ], { id: 3, chapter_no: 3, title: '门外学生' })

    expect(report.status).toBe('warn')
    expect(report.duplicates).toHaveLength(1)
    expect(report.duplicates[0].chapter_no).toBe(1)
    expect(report.normalized_title).toBe('门外学生')
    expect(report.fix).toContain('本章核心事件')
  })

  test('builds post-delivery chapter title uniqueness sync report', () => {
    const okReport = buildChapterTitleUniquenessSyncReport([
      { id: 1, chapter_no: 1, title: '第1章 门外学生' },
      { id: 2, chapter_no: 2, title: '第2章 校徽敲门' },
    ], { id: 2, chapter_no: 2, title: '第2章 校徽敲门' })
    const warnReport = buildChapterTitleUniquenessSyncReport([
      { id: 1, chapter_no: 1, title: '第1章 门外学生' },
      { id: 2, chapter_no: 2, title: '守则初读' },
      { id: 3, chapter_no: 3, title: '门外学生' },
    ], { id: 3, chapter_no: 3, title: '门外学生' })

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('章节标题去重 OK')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('章节标题重复')
    expect(warnReport.missed_count).toBe(1)
    expect(warnReport.duplicates[0].chapter_no).toBe(1)
    expect(warnReport.missed[0].title).toBe('第1章 门外学生')
    expect(warnReport.next_actions.join('；')).toContain('核心事件、冲突转折、关键资产或章尾钩子改名')
  })

  test('story state sync persists a chapter_title_uniqueness_sync review', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')

    expect(source).toContain("reviewType: 'chapter_title_uniqueness_sync'")
    expect(source).toContain('buildChapterTitleUniquenessSyncReport(chapters, chapter)')
    expect(source).toContain('payload.chapter_title_uniqueness_sync = chapterTitleUniquenessSync')
  })

  test('wires title uniqueness report into chapter context preflight', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const contextBuilderBlock = source.slice(
      source.indexOf('const buildChapterContextPackage'),
      source.indexOf('const buildProseReviewPrompt'),
    )

    expect(contextBuilderBlock).toContain('buildChapterTitleUniquenessReport(sorted, chapter)')
    expect(contextBuilderBlock).toContain('chapter_title_unique')
    expect(contextBuilderBlock).toContain('title_uniqueness_report')
  })

  test('adds duplicate title repair instructions to the prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '超人的规则怪谈世界' },
      {
        chapter_target: {
          chapter_no: 3,
          title: '门外学生',
          summary: '门外学生敲门，主角必须判断救或不救。',
          conflict: '开门会违反规则，不开门会失去线索。',
          ending_hook: '学生袖口露出上一轮玩家的校徽。',
          scene_cards: [{ title: '玻璃门前', conflict: '是否开门', reader_payoff: '规则边界再次压迫主角' }],
          title_uniqueness_report: {
            status: 'warn',
            normalized_title: '门外学生',
            duplicates: [{ id: 1, chapter_no: 1, title: '第1章 门外学生' }],
            fix: '标题与既有章节重复，需按本章核心事件、冲突转折、关键资产或章尾钩子改名，并同步章节标题。',
          },
        },
      },
      null,
      { chapter_no: 3, title: '门外学生' },
    )

    expect(prompt).toContain('【章节标题去重】')
    expect(prompt).toContain('oh-story Step 2.1 标题预检')
    expect(prompt).toContain('第1章《第1章 门外学生》')
    expect(prompt).toContain('输出 JSON 的 title 必须改成不重复的新标题')
    expect(prompt).toContain('本章核心事件、冲突转折、关键资产或章尾钩子')
    expect(prompt).toContain('同步细纲标题与正文文件名')
  })

  test('adds default prose meta hygiene rules to the paragraph prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '袖口旧印' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '旧楼门牌',
          summary: '主角接住门牌翻面的现场余波。',
          conflict: '她必须把旧印来源变成现场证据。',
          ending_hook: '火漆背面露出第二枚编号。',
          scene_cards: [{ title: '门牌翻面', conflict: '是否公开旧印来源' }],
        },
      },
      null,
      { chapter_no: 8, title: '旧楼门牌' },
    )

    expect(prompt).toContain('正文元信息清洁')
    expect(prompt).toContain('标题行以外不得出现')
    expect(prompt).toContain('上一章/本章/前文/后文/伏笔/细纲/读者/第X章')
    expect(prompt).toContain('角色当下能感知的事件锚点或相对时间')
  })

  test('adds oh-story format-and-structure guardrails to prose generation, review, and revision prompts', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '袖口旧印' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '旧楼门牌',
          summary: '主角接住门牌翻面的现场余波。',
          conflict: '她必须把旧印来源变成现场证据。',
          ending_hook: '火漆背面露出第二枚编号。',
          scene_cards: [{ title: '门牌翻面', conflict: '是否公开旧印来源' }],
        },
      },
      null,
      { chapter_no: 8, title: '旧楼门牌' },
    )

    expect(prompt).toContain('正文格式与小节结构')
    expect(prompt).toContain('全文统一章节标记：###1. / ###第一章 / 1.')
    expect(prompt).toContain('段间保留一个空行')
    expect(prompt).toContain('不得出现两个以上连续空行')
    expect(prompt).toContain('无缩进')
    expect(prompt).toContain('正文段落中不使用 Markdown')
    expect(prompt).toContain('对话独立成行')
    expect(prompt).toContain('引号风格按项目/平台约定')
    expect(prompt).toContain('quote-mode keep')
    expect(prompt).toContain('「」')
    expect(prompt).toContain('一个主事件 + 3-5 个子事件')

    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const reviewPromptBlock = source.slice(
      source.indexOf('const buildProseReviewPrompt ='),
      source.indexOf('const buildProseRevisionPrompt ='),
    )
    const revisionPromptBlock = source.slice(
      source.indexOf('const buildProseRevisionPrompt ='),
      source.indexOf('const shouldReviseProse ='),
    )

    expect(reviewPromptBlock).toContain('是否违反 oh-story 正文格式与小节结构')
    expect(reviewPromptBlock).toContain('章节标记必须统一为 ###1. / ###第一章 / 1. 或项目指定格式')
    expect(reviewPromptBlock).toContain('段间保留一个空行')
    expect(reviewPromptBlock).toContain('quote-mode keep')
    expect(revisionPromptBlock).toContain('如果自检结果包含正文格式扫描、章节标记格式扫描或 deterministicProseFormatChecks')
    expect(revisionPromptBlock).toContain('合并多余空行、删除缩进和正文 Markdown')
    expect(revisionPromptBlock).toContain('保留项目/平台指定的合法引号风格')
  })

  test('adds web-novel paragraph rhythm guardrails to prose prompt', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '袖口旧印' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '旧楼门牌',
          summary: '主角接住门牌翻面的现场余波。',
          conflict: '她必须把旧印来源变成现场证据。',
          ending_hook: '火漆背面露出第二枚编号。',
          scene_cards: [{ title: '门牌翻面', conflict: '是否公开旧印来源' }],
        },
      },
      null,
      { chapter_no: 8, title: '旧楼门牌' },
    )

    expect(prompt).toContain('段间保留一个空行')
    expect(prompt).toContain('断段按戏剧单元/镜头自然断开')
    expect(prompt).not.toContain('不得出现空行或连续换行')
  })

  test('adds previous chapter ending excerpt to the paragraph prose prompt for serial handoff continuity', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const previousEnding = '旧楼门牌在雨水里翻成黑面，林青禾听见门内第三次敲击。李玄按住她的手腕，没有让她开门，只说等钟声停。'
    const prompt = service.buildParagraphProseContext(
      { title: '袖口旧印' },
      {
        continuity: {
          previous_chapter: {
            chapter_no: 7,
            title: '黑面门牌',
            ending_hook: '钟声停下前不能开门。',
            ending_excerpt: previousEnding,
          },
        },
        chapter_target: {
          chapter_no: 8,
          title: '停钟以后',
          summary: '李玄必须在钟声停后处理门后的人。',
          conflict: '开门会触发旧楼规则，不开门会丢失证人。',
          ending_hook: '证人袖口露出旧印编号。',
          scene_cards: [{ title: '停钟门前', conflict: '是否开门', purpose: '承接上一章黑面门牌余波' }],
        },
      },
      null,
      { chapter_no: 8, title: '停钟以后' },
    )

    expect(prompt).toContain('【上一章尾段原文承接】')
    expect(prompt).toContain('第7章《黑面门牌》')
    expect(prompt).toContain(previousEnding)
    expect(prompt).toContain('前300字必须接住上一章最后一幕')
    expect(prompt).toContain('不能只复述摘要或改写成新的开场')
  })

  test('preserves true final previous chapter handoff when ending excerpt is long', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const earlyResolvedAction = '规则三已经完成：关门键失效，江哲用身体挡住电梯门，倒计时结束，电梯危机暂时解除。'.repeat(8)
    const trueFinalMoment = '最后，规则五索要右臂，巨大鬼手卡在门框上，江哲看见血字下方的金色符文，意识到规则曾被篡改，随即踏入红雾。'
    const prompt = service.buildParagraphProseContext(
      { title: '怪谈世界：我是超人，怪谈你随意' },
      {
        continuity: {
          previous_chapter: {
            chapter_no: 1,
            title: '异常入局',
            ending_hook: '规则背后还有更高层力量在博弈。',
            ending_excerpt: `${earlyResolvedAction}${trueFinalMoment}`,
          },
        },
        chapter_target: {
          chapter_no: 2,
          title: '旧法失准',
          summary: '江哲进入红雾后发现旧办法不再可靠。',
          conflict: '暴力硬抗会导致规则牢笼崩坏。',
          ending_hook: '旧答案指向更危险的证据。',
          scene_cards: [{ title: '红雾深处', conflict: '是否继续用蛮力破局', purpose: '承接规则五与金色符文的未解问题' }],
        },
      },
      null,
      { chapter_no: 2, title: '旧法失准' },
    )

    const handoffStart = prompt.indexOf('【上一章尾段原文承接】')
    const handoffEnd = prompt.indexOf('【写前准备卡】', handoffStart)
    const handoffBlock = prompt.slice(handoffStart, handoffEnd === -1 ? handoffStart + 900 : handoffEnd)

    expect(handoffBlock).toContain('【上一章尾段原文承接】')
    expect(handoffBlock).toContain('第1章《异常入局》')
    expect(handoffBlock).toContain('规则五')
    expect(handoffBlock).toContain('金色符文')
    expect(handoffBlock).toContain('踏入红雾')
  })

  test('asks paragraph prose prompt to execute oh-story scene-card directive fields', () => {
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })
    const prompt = service.buildParagraphProseContext(
      { title: '袖口旧印' },
      {
        chapter_target: {
          chapter_no: 9,
          title: '蓝晶灼手',
          summary: '蓝晶首次出现并改变证据判断。',
          conflict: '主角必须用蓝晶抢回证据记忆。',
          ending_hook: '蓝晶烧出第二段陌生记忆。',
          scene_cards: [
            {
              title: '蓝晶灼手',
              purpose: '蓝晶首次进入正文并改变证据判断',
              concept_anchor_rules: ['蓝晶首次出现必须先写灼手反应和物理后果。'],
              prose_craft_directives: ['不得用整段来历/等级解释蓝晶。'],
            },
          ],
        },
      },
      null,
      { chapter_no: 9, title: '蓝晶灼手' },
    )

    expect(prompt).toContain('scene_cards.dialogue_goals')
    expect(prompt).toContain('scene_cards.style_directives')
    expect(prompt).toContain('scene_cards.benchmark_recall_directives')
    expect(prompt).toContain('scene_cards.concept_anchor_rules')
    expect(prompt).toContain('scene_cards.prose_craft_directives')
    expect(prompt).toContain('scene_cards.relationship_progression_plan')
    expect(prompt).toContain('scene_cards.relationship_buffer_zone')
    expect(prompt).toContain('scene_cards.supporting_character_action')
    expect(prompt).toContain('scene_cards.attitude_shift_checkpoint')
    expect(prompt).toContain('scene_cards.relationship_next_hook')
    expect(prompt).toContain('配角攻略缓冲区')
  })

  test('persists a non-duplicate generated title only when title uniqueness repair is active', () => {
    const titleReport = {
      status: 'warn',
      normalized_title: '门外学生',
      duplicates: [{ id: 1, chapter_no: 1, title: '第1章 门外学生' }],
    }

    expect(buildGeneratedChapterTitlePatch({ title: '门外学生' }, titleReport, '校徽敲门')).toEqual({ title: '校徽敲门' })
    expect(buildGeneratedChapterTitlePatch({ title: '门外学生' }, titleReport, '门外学生')).toEqual({})
    expect(buildGeneratedChapterTitlePatch({ title: '门外学生' }, { status: 'ok' }, '校徽敲门')).toEqual({})
  })

  test('wires generated duplicate-title repair into every chapter store path', () => {
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/monolith.ts'), 'utf8')
    const storagePatchSource = readChapterProseStoragePatchSource()
    const groupStart = source.indexOf('const generateChapterForGroup =')
    const groupBlock = source.slice(groupStart, source.indexOf('const routes', groupStart) > 0 ? source.indexOf('const routes', groupStart) : source.indexOf('return { generateChapterForGroup', groupStart))

    expect(groupBlock).toContain('const generatedTitlePatch = buildGeneratedChapterTitlePatch')
    expect((groupBlock.match(/generatedTitlePatch,/g) || []).length).toBeGreaterThanOrEqual(2)
    expect(storagePatchSource).toContain('...(input.generatedTitlePatch || {})')
  })

  test('converts target chapter outlines into fallback scene cards', () => {
    const sceneCards = normalizeSceneCardsPayload({
      master_outline: { title: '超人的规则怪谈世界' },
      chapter_outlines: [
        {
          chapter_no: 1,
          title: '双魂降临',
          summary: '李辰和林智同时醒来在诡异公寓中。',
          conflict: '初次面对禁止单独行动规则的考验',
          ending_hook: '广播响起：今晚零点前必须选定房间。',
        },
        {
          chapter_no: 2,
          title: '守则初读',
          summary: '两人找到公寓守则册。',
        },
      ],
    }, {
      chapter_target: {
        chapter_no: 1,
        title: '双魂降临',
      },
    })

    expect(sceneCards).toHaveLength(1)
    expect(sceneCards[0].scene_no).toBe(1)
    expect(sceneCards[0].title).toBe('双魂降临')
    expect(sceneCards[0].purpose).toContain('李辰和林智')
    expect(sceneCards[0].conflict).toContain('禁止单独行动')
    expect(sceneCards[0].turning_point).toContain('广播响起')
    expect(sceneCards[0].scene_type).toBe('investigation')
  })

  test('preserves commercial reader-facing beats for prose generation', () => {
    const sceneCards = normalizeSceneCardsPayload({
      scene_cards: [
        {
          scene_no: 1,
          title: '操场醒来',
          purpose: '主角发现自己进入午夜校园。',
          beat: '车祸醒来后确认超人力量。',
          opening_hook: '车祸后的第一口冷风带着广播电流声。',
          reader_payoff: '立刻展示超人身体素质，但规则空间能反制蛮力。',
          fear_point: '空无一人的校园里，阴影会吞掉尾音。',
          rule_pressure: '十点后不得离开宿舍，违规者会消失。',
          information_gap: '校园为什么没有人，广播是谁发出的。',
          reversal: '李超以为自己能冲出去，却被无形墙弹回。',
          ending_hook_seed: '钟表停在九点五十八分。',
          character_voice: '李超热血嘴硬，张智冷静拆规则。',
        },
      ],
    })

    expect(sceneCards[0].opening_hook).toContain('车祸')
    expect(sceneCards[0].reader_payoff).toContain('超人')
    expect(sceneCards[0].fear_point).toContain('阴影')
    expect(sceneCards[0].rule_pressure).toContain('十点')
    expect(sceneCards[0].information_gap).toContain('广播')
    expect(sceneCards[0].reversal).toContain('弹回')
    expect(sceneCards[0].ending_hook_seed).toContain('九点五十八分')
    expect(sceneCards[0].character_voice).toContain('张智')
  })
})

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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const selfReviewSource = readFileSync(join(import.meta.dir, '../novel-writing-service/service/prose-self-review-methods.ts'), 'utf8')
    const promptBlock = readSceneCardsPromptSource()
    const proseStart = source.indexOf('export function buildParagraphProseContext')
    const proseEnd = source.indexOf('const buildStoryStatePrompt =', proseStart)
    const proseBlock = source.slice(proseStart, proseEnd)
    const reviewStart = selfReviewSource.indexOf('const buildProseReviewPrompt =')
    const reviewEnd = selfReviewSource.indexOf('const buildProseRevisionPrompt =', reviewStart)
    const reviewBlock = selfReviewSource.slice(reviewStart, reviewEnd)

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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const promptBlock = readSceneCardsPromptSource()
    const proseStart = source.indexOf('export function buildParagraphProseContext')
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
    const source = readFileSync(join(import.meta.dir, '../novel-writing-service/service/paragraph-prose-context.ts'), 'utf8')
    const promptBlock = readSceneCardsPromptSource()
    const proseStart = source.indexOf('export function buildParagraphProseContext')
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

})

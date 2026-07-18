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

describe('normalizeSceneCardsPayload a', () => {
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

})

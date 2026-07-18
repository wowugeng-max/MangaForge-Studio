import { normalizeChapterPositioningBrief } from '../../novel-writing/chapter-positioning-brief'
import {
  buildGoldenThreeBrief,
  normalizeGoldenThreeBrief,
} from '../../novel-writing/golden-three-brief'
import {
  buildChapterInnovationBrief,
  normalizeInnovationBrief,
} from '../../novel-writing/innovation-basics'
import {
  longformCompassFromContext,
  normalizeLongformCompass,
} from '../../novel-writing/longform-compass'
import {
  resolveConfirmedPreDraftBenchmarkRecallSources,
  resolveConfirmedPreDraftBriefSources,
  resolveConfirmedPreDraftContractSources,
  resolveConfirmedPreDraftForeshadowingSource,
  resolveConfirmedPreDraftMemorySources,
} from '../../novel-writing/pre-draft-confirmation'
import {
  buildPreDraftSettingScope,
  buildPreDraftStorylineScope,
} from '../../novel-writing/pre-draft-scope'
import {
  buildReaderRetentionBrief,
  first30RetentionBriefFromContext,
  normalizeReaderDropRiskBrief,
  normalizeReaderRetentionBrief,
} from '../../novel-writing/reader-retention-brief'
import { normalizeRecentFatigueBrief } from '../../novel-writing/rolling-rhythm-preflight'
import {
  normalizePageTurnHookBrief,
  normalizeSerialRhythmBrief,
} from '../../novel-writing/serial-rhythm-brief'
import { normalizeSignatureSceneBrief } from '../../novel-writing/signature-scene-basics'
import { normalizeStoryDriveBrief } from '../../novel-writing/story-drive-brief'
import { normalizeStoryPressureBrief } from '../../novel-writing/story-pressure-brief'
import { normalizeVolumeClimaxBrief } from '../../novel-writing/volume-climax-brief'
import { asArray } from '../../routes/novel-route-utils'
import { sceneBriefFromCard } from '../../novel-writing/scene-briefs'
import {
  applyReaderExpectationDebtAging,
  normalizeReaderExpectationDebtContext,
  normalizeReaderExpectationLedgerContract,
} from '../batch-serial/serial-momentum'
import {
  buildPreviousChapterHandoff,
  buildReaderExpectationLedger,
  normalizeGovernanceRecheckMemoryContext,
} from '../post-delivery/chapter-handoff-contracts'
import { normalizeDeliveryRiskCarryOverContext } from '../post-delivery/delivery-risk-core'
import {
  plotSpecialTopicsContractForSync,
  storyUnitContextFromContext,
} from '../post-delivery/quality-sync-reports'
import { normalizeSceneCardsPayload } from '../post-delivery/scene-cards'
import {
  buildConflictStructureContract,
  buildExpectationThresholdContract,
  buildFemaleAudienceContract,
  buildGenrePositioningContract,
  buildInformationFlowContract,
  buildQualityAuditContract,
  buildStoryLoopContract,
  buildTargetReaderContract,
  buildUpgradeRhythmContract,
} from './audience-quality-contracts'
import {
  buildAssetLinkageContract,
  buildCharacterBehaviorContract,
  buildCharacterRelationContract,
} from './character-asset-contracts'
import {
  buildContinuityHeatContract,
  buildDialogueContract,
  buildPlotDynamicsContract,
  buildStoryPowerContract,
} from './continuity-dialogue-contracts'
import {
  buildCoreContractRadar,
  coreContractRadarFromContext,
  normalizeCoreContractRadar,
} from './core-contract-radar'
import {
  buildBridgeUnitContract,
  buildChapterHookContract,
  buildEmotionalArcContract,
  buildParagraphHookContract,
  buildReversalContract,
  buildShowdownContract,
  buildSuspenseContract,
} from './craft-tension-contracts'
import {
  benchmarkRecallGapsFromContext,
  benchmarkRecallIsNoBenchmark,
  buildBenchmarkRecallBrief,
  buildIntentConfirmationContract,
} from './intent-benchmark-contracts'
import {
  longformBattleContextFromContext,
  nextBatchBriefFromContext,
  normalizeDailyContextSnapshot,
  normalizeDailyProgressSummary,
  normalizeForeshadowingConsistencyRadar,
  normalizeLayeredMemoryContext,
  normalizeLongformBattleContext,
  normalizeLongformMemoryCapsule,
  normalizeNextBatchBrief,
} from './memory-longform-contracts'
import { buildChapterBlueprintFromContext } from './outline-blueprint-contracts'
import {
  buildContentRubric,
  buildPlatformRubric,
} from './platform-content-rubrics'
import {
  buildOpeningContract,
  buildPlotFrameworkContract,
  buildProseCraftContract,
  buildPunctuationToneContract,
} from './plot-opening-prose-contracts'
import { repairSceneCardsForProseContextHandoff } from './preflight-auto-repair'
import { buildStateTrackingContract } from './state-tracking-contracts'
import {
  buildChapterBenchmarkStrategy,
  buildMemeStrategy,
  buildStyleBoundaryContract,
  buildStyleSampleStrategy,
} from './style-sample-strategy'
import { compactBriefText } from './text-utils'
import { buildWritePreparationBrief } from './write-preparation-contracts'
import {
  buildCharacterArcBriefFromContext,
  mergedContextChapterTargetPreferRuntime,
} from './pre-draft-brief-bind'

export function buildChapterPreDraftBrief(project: any, contextPackage: any) {
  if (contextPackage?.chapterTarget) {
    const mergedChapterTarget = mergedContextChapterTargetPreferRuntime(contextPackage)
    contextPackage = {
      ...contextPackage,
      chapter_target: mergedChapterTarget,
      chapterTarget: mergedChapterTarget,
    }
  }
  const chapterTarget = contextPackage?.chapter_target || {}
  const sceneCards = Array.isArray(chapterTarget.scene_cards) && chapterTarget.scene_cards.length
    ? chapterTarget.scene_cards
    : Array.isArray(chapterTarget.sceneCards)
      ? normalizeSceneCardsPayload({ sceneCards: chapterTarget.sceneCards }, contextPackage)
      : []
  const sceneBriefs = sceneCards.map(sceneBriefFromCard)
  const chapterPositioningBrief = normalizeChapterPositioningBrief(contextPackage, sceneBriefs)
  const readerPayoffs = sceneBriefs.map(item => item.reader_payoff).filter(Boolean)
  const emotionalCurve = [
    sceneCards[0]?.emotional_tone,
    sceneCards.length > 1 ? sceneCards[Math.floor(sceneCards.length / 2)]?.emotional_tone : '',
    sceneCards.length > 1 ? sceneCards[sceneCards.length - 1]?.emotional_tone : '',
  ].filter(Boolean).join(' -> ')
  const settingScope = buildPreDraftSettingScope(contextPackage, chapterTarget)
  const storylineScope = buildPreDraftStorylineScope(contextPackage?.storyline_context || {})
  const characterArcBrief = buildCharacterArcBriefFromContext(contextPackage)
  const wordTarget = chapterTarget.word_target || {}
  const memeStrategy = buildMemeStrategy(project, contextPackage)
  const styleSampleStrategy = buildStyleSampleStrategy(project, contextPackage)
  const chapterBenchmarkStrategy = buildChapterBenchmarkStrategy(project, contextPackage)
  const styleBoundaryContract = buildStyleBoundaryContract(project, contextPackage, {
    style_sample_strategy: styleSampleStrategy,
    chapter_benchmark_strategy: chapterBenchmarkStrategy,
  })
  const first30RetentionBrief = first30RetentionBriefFromContext(contextPackage)
  const longformCompass = normalizeLongformCompass(longformCompassFromContext(contextPackage))
  const longformBattleContext = normalizeLongformBattleContext(longformBattleContextFromContext(contextPackage))
  const longformMemoryCapsule = normalizeLongformMemoryCapsule(
    contextPackage?.chapter_target?.longform_memory_capsule
    || contextPackage?.chapter_target?.longformMemoryCapsule
    || contextPackage?.longform_memory_capsule
    || contextPackage?.longformMemoryCapsule,
  )
  const layeredMemoryContext = normalizeLayeredMemoryContext(
    contextPackage?.chapter_target?.layered_memory_context
    || contextPackage?.chapter_target?.layeredMemoryContext
    || contextPackage?.chapter_target?.longform_layered_memory
    || contextPackage?.chapter_target?.longformLayeredMemory
    || contextPackage?.layered_memory_context
    || contextPackage?.layeredMemoryContext
    || contextPackage?.longform_layered_memory
    || contextPackage?.longformLayeredMemory,
  )
  const progressSummary = normalizeDailyProgressSummary(
    contextPackage?.chapter_target?.progress_summary
    || contextPackage?.chapter_target?.progressSummary
    || contextPackage?.progress_summary
    || contextPackage?.progressSummary
    || contextPackage?.story_state?.progress_summary
    || contextPackage?.storyState?.progressSummary
    || project?.reference_config?.story_state?.progress_summary
    || project?.reference_config?.storyState?.progressSummary
    || project?.story_state?.progress_summary
    || project?.storyState?.progressSummary,
  )
  const dailyContextSnapshot = normalizeDailyContextSnapshot(
    contextPackage?.chapter_target?.daily_context_snapshot
    || contextPackage?.chapter_target?.dailyContextSnapshot
    || contextPackage?.pre_draft_brief?.daily_context_snapshot
    || contextPackage?.pre_draft_brief?.dailyContextSnapshot
    || contextPackage?.preDraftBrief?.daily_context_snapshot
    || contextPackage?.preDraftBrief?.dailyContextSnapshot
    || contextPackage?.daily_context_snapshot
    || contextPackage?.dailyContextSnapshot
    || contextPackage?.story_state?.daily_context_snapshot
    || contextPackage?.story_state?.dailyContextSnapshot
    || contextPackage?.storyState?.dailyContextSnapshot
    || project?.reference_config?.story_state?.daily_context_snapshot
    || project?.reference_config?.story_state?.dailyContextSnapshot
    || project?.reference_config?.storyState?.dailyContextSnapshot
    || project?.story_state?.daily_context_snapshot
    || project?.story_state?.dailyContextSnapshot
    || project?.storyState?.dailyContextSnapshot,
  )
  const foreshadowingConsistencyRadar = normalizeForeshadowingConsistencyRadar(
    contextPackage?.chapter_target?.foreshadowing_consistency_radar
    || contextPackage?.chapter_target?.foreshadowingConsistencyRadar
    || contextPackage?.pre_draft_brief?.foreshadowing_consistency_radar
    || contextPackage?.pre_draft_brief?.foreshadowingConsistencyRadar
    || contextPackage?.preDraftBrief?.foreshadowing_consistency_radar
    || contextPackage?.preDraftBrief?.foreshadowingConsistencyRadar
    || contextPackage?.foreshadowing_consistency_radar
    || contextPackage?.foreshadowingConsistencyRadar
    || contextPackage?.story_state?.foreshadowing_consistency_radar
    || contextPackage?.story_state?.foreshadowingConsistencyRadar
    || contextPackage?.storyState?.foreshadowingConsistencyRadar
    || project?.reference_config?.story_state?.foreshadowing_consistency_radar
    || project?.reference_config?.story_state?.foreshadowingConsistencyRadar
    || project?.reference_config?.storyState?.foreshadowingConsistencyRadar
    || project?.story_state?.foreshadowing_consistency_radar
    || project?.story_state?.foreshadowingConsistencyRadar
    || project?.storyState?.foreshadowingConsistencyRadar
    || {
      foreshadowing_status: contextPackage?.story_state?.foreshadowing_status
        || contextPackage?.story_state?.foreshadowingStatus
        || contextPackage?.storyState?.foreshadowingStatus
        || project?.reference_config?.story_state?.foreshadowing_status
        || project?.reference_config?.story_state?.foreshadowingStatus
        || project?.reference_config?.storyState?.foreshadowingStatus
        || project?.story_state?.foreshadowing_status
        || project?.story_state?.foreshadowingStatus
        || project?.storyState?.foreshadowingStatus,
      payoff_queue: contextPackage?.story_state?.payoff_queue
        || contextPackage?.story_state?.payoffQueue
        || contextPackage?.storyState?.payoffQueue
        || project?.reference_config?.story_state?.payoff_queue
        || project?.reference_config?.story_state?.payoffQueue
        || project?.reference_config?.storyState?.payoffQueue
        || project?.story_state?.payoff_queue
        || project?.story_state?.payoffQueue
        || project?.storyState?.payoffQueue,
    },
    Number(chapterTarget.chapter_no || 0),
  )
  const nextBatchBrief = normalizeNextBatchBrief(nextBatchBriefFromContext(contextPackage), Number(chapterTarget.chapter_no || 0))
  const storyUnitContext = storyUnitContextFromContext(contextPackage, { chapter_no: chapterTarget.chapter_no })
  const readerRetentionBrief = buildReaderRetentionBrief(project, contextPackage, sceneBriefs)
  const readerDropRiskBrief = normalizeReaderDropRiskBrief(
    contextPackage?.chapter_target?.reader_drop_risk_brief
    || contextPackage?.reader_drop_risk_brief
    || contextPackage?.reader_trial_context
    || contextPackage?.readerTrialContext,
    readerRetentionBrief,
    first30RetentionBrief,
  )
  const goldenThreeBrief = buildGoldenThreeBrief(project, contextPackage, sceneBriefs)
  const storyPressureBrief = normalizeStoryPressureBrief(
    contextPackage?.chapter_target?.story_pressure_brief
    || contextPackage?.chapter_target?.storyPressureBrief
    || contextPackage?.story_pressure_brief
    || contextPackage?.storyPressureBrief
    || contextPackage?.story_pressure_ladder
    || contextPackage?.storyPressureLadder,
  )
  const storyDriveBrief = normalizeStoryDriveBrief(
    contextPackage?.chapter_target?.story_drive_brief
    || contextPackage?.chapter_target?.storyDriveBrief
    || contextPackage,
    sceneCards,
  )
  const serialRhythmBrief = normalizeSerialRhythmBrief(
    contextPackage?.chapter_target?.serial_rhythm_brief
    || contextPackage?.chapter_target?.serialRhythmBrief
    || contextPackage?.serial_rhythm_brief
    || contextPackage?.serialRhythmBrief,
    sceneBriefs,
    readerRetentionBrief,
    wordTarget,
  )
  const pageTurnHookBrief = normalizePageTurnHookBrief(
    contextPackage?.chapter_target?.page_turn_hook_brief
    || contextPackage?.chapter_target?.pageTurnHookBrief
    || contextPackage?.page_turn_hook_brief
    || contextPackage?.pageTurnHookBrief,
    chapterTarget,
    sceneBriefs,
    readerRetentionBrief,
    storyDriveBrief,
  )
  const volumeClimaxBrief = normalizeVolumeClimaxBrief(
    contextPackage?.chapter_target?.volume_climax_brief
    || contextPackage?.chapter_target?.volumeClimaxBrief
    || contextPackage?.chapter_target?.volume_beat_brief
    || contextPackage?.chapter_target?.volumeBeatBrief
    || contextPackage?.volume_climax_brief
    || contextPackage?.volumeClimaxBrief
    || contextPackage?.volume_beat_brief
    || contextPackage?.volumeBeatBrief
    || contextPackage?.volume_beat_budget
    || contextPackage?.volumeBeatBudget,
    chapterTarget,
    contextPackage?.volume_beat_budget || contextPackage?.volumeBeatBudget,
  )
  const preDraftBrief = contextPackage?.pre_draft_brief || contextPackage?.preDraftBrief || {}
  const recentFatigueBrief = normalizeRecentFatigueBrief(
    contextPackage?.chapter_target?.recent_fatigue_brief
    || contextPackage?.chapter_target?.recentFatigueBrief
    || contextPackage?.chapter_target?.recent_fatigue_radar
    || contextPackage?.chapter_target?.recentFatigueRadar
    || preDraftBrief.recent_fatigue_brief
    || preDraftBrief.recentFatigueBrief
    || preDraftBrief.recent_fatigue_radar
    || preDraftBrief.recentFatigueRadar
    || contextPackage?.recent_fatigue_brief
    || contextPackage?.recentFatigueBrief
    || contextPackage?.recent_fatigue_radar
    || contextPackage?.recentFatigueRadar,
  )
  const deliveryRiskCarryOver = normalizeDeliveryRiskCarryOverContext(
    contextPackage?.chapter_target?.delivery_risk_carry_over
    || contextPackage?.chapter_target?.deliveryRiskCarryOver
    || preDraftBrief.delivery_risk_carry_over
    || preDraftBrief.deliveryRiskCarryOver
    || contextPackage?.delivery_risk_carry_over
    || contextPackage?.deliveryRiskCarryOver,
  )
  const governanceRecheckMemory = normalizeGovernanceRecheckMemoryContext(
    contextPackage?.chapter_target?.governance_recheck_memory
    || contextPackage?.chapter_target?.governanceRecheckMemory
    || preDraftBrief.governance_recheck_memory
    || preDraftBrief.governanceRecheckMemory
    || contextPackage?.governance_recheck_memory
    || contextPackage?.governanceRecheckMemory
    || contextPackage?.pre_draft_brief?.governance_recheck_memory
    || contextPackage?.preDraftBrief?.governanceRecheckMemory,
  )
  const readerExpectationDebtContext = applyReaderExpectationDebtAging(
    normalizeReaderExpectationDebtContext(
      chapterTarget.reader_expectation_debt_context
      || chapterTarget.readerExpectationDebtContext
      || contextPackage?.reader_expectation_debt_context
      || contextPackage?.readerExpectationDebtContext,
    ),
    Number(chapterTarget.chapter_no || 0),
  )
  const readerExpectationLedger = buildReaderExpectationLedger(project, {
    ...contextPackage,
    reader_expectation_debt_context: readerExpectationDebtContext,
    chapter_target: {
      ...(contextPackage?.chapter_target || {}),
      reader_expectation_debt_context: readerExpectationDebtContext,
    },
  }, sceneBriefs, readerRetentionBrief)
  const signatureSceneBrief = normalizeSignatureSceneBrief(chapterTarget.signature_scene_brief || chapterTarget.rollingPlan || chapterTarget.rolling_plan)
  const innovationBrief = buildChapterInnovationBrief(project, {
    ...contextPackage,
    chapter_target: {
      ...chapterTarget,
      signature_scene_brief: signatureSceneBrief,
    },
  }, sceneBriefs, longformCompass)
  const coreContractRadar = buildCoreContractRadar(project, contextPackage, sceneBriefs, longformCompass, longformBattleContext)
  const previousHandoff = buildPreviousChapterHandoff(contextPackage)
  const platformRubric = buildPlatformRubric(project, contextPackage)
  const contentRubric = buildContentRubric(contextPackage)
  const dialogueContract = buildDialogueContract(contextPackage)
  const plotDynamicsContract = buildPlotDynamicsContract(contextPackage)
  const storyPowerContract = buildStoryPowerContract(project, contextPackage)
  const continuityHeatContract = buildContinuityHeatContract(contextPackage)
  const characterRelationContract = buildCharacterRelationContract(contextPackage)
  const characterBehaviorContract = buildCharacterBehaviorContract(contextPackage)
  const assetLinkageContract = buildAssetLinkageContract(contextPackage)
  const stateTrackingContract = buildStateTrackingContract(contextPackage)
  const informationFlowContract = buildInformationFlowContract(contextPackage)
  const expectationThresholdContract = buildExpectationThresholdContract(contextPackage)
  const targetReaderContract = buildTargetReaderContract(project, contextPackage)
  const genrePositioningContract = buildGenrePositioningContract(project, contextPackage)
  const plotSpecialTopicsContract = plotSpecialTopicsContractForSync(project, contextPackage)
  const femaleAudienceContract = buildFemaleAudienceContract(project, contextPackage)
  const upgradeRhythmContract = buildUpgradeRhythmContract(project, contextPackage)
  const conflictStructureContract = buildConflictStructureContract(project, contextPackage)
  const storyLoopContract = buildStoryLoopContract(project, contextPackage)
  const emotionalArcContract = buildEmotionalArcContract(project, contextPackage)
  const chapterHookContract = buildChapterHookContract(project, contextPackage)
  const paragraphHookContract = buildParagraphHookContract(project, contextPackage)
  const suspenseContract = buildSuspenseContract(project, contextPackage)
  const reversalContract = buildReversalContract(project, contextPackage)
  const showdownContract = buildShowdownContract(project, contextPackage)
  const bridgeUnitContract = buildBridgeUnitContract(project, contextPackage)
  const plotFrameworkContract = buildPlotFrameworkContract(project, contextPackage, {
    showdown_contract: showdownContract,
    bridge_unit_contract: bridgeUnitContract,
    suspense_contract: suspenseContract,
    conflict_structure_contract: conflictStructureContract,
  })
  const openingContract = buildOpeningContract(project, contextPackage)
  const proseCraftContract = buildProseCraftContract(project, contextPackage)
  const punctuationToneContract = buildPunctuationToneContract(project, contextPackage)
  const qualityAuditContract = buildQualityAuditContract(project, contextPackage)
  const chapterBlueprint = buildChapterBlueprintFromContext(contextPackage, {
    scene_briefs: sceneBriefs,
    emotional_curve: emotionalCurve,
    reader_promise: readerPayoffs.join('；') || contextPackage?.writing_bible?.promise || project?.synopsis,
    story_drive_brief: storyDriveBrief,
    serial_rhythm_brief: serialRhythmBrief,
    chapter_positioning_brief: chapterPositioningBrief,
    page_turn_hook_brief: pageTurnHookBrief,
    character_arc_brief: characterArcBrief,
    platform_rubric: platformRubric,
    content_rubric: contentRubric,
    dialogue_contract: dialogueContract,
    plot_dynamics_contract: plotDynamicsContract,
    story_power_contract: storyPowerContract,
    continuity_heat_contract: continuityHeatContract,
    character_relation_contract: characterRelationContract,
    character_behavior_contract: characterBehaviorContract,
    asset_linkage_contract: assetLinkageContract,
    state_tracking_contract: stateTrackingContract,
    information_flow_contract: informationFlowContract,
    expectation_threshold_contract: expectationThresholdContract,
    target_reader_contract: targetReaderContract,
    genre_positioning_contract: genrePositioningContract,
    female_audience_contract: femaleAudienceContract,
    upgrade_rhythm_contract: upgradeRhythmContract,
    conflict_structure_contract: conflictStructureContract,
    story_loop_contract: storyLoopContract,
    emotional_arc_contract: emotionalArcContract,
    chapter_hook_contract: chapterHookContract,
    paragraph_hook_contract: paragraphHookContract,
    suspense_contract: suspenseContract,
    reversal_contract: reversalContract,
    showdown_contract: showdownContract,
    bridge_unit_contract: bridgeUnitContract,
    plot_framework_contract: plotFrameworkContract,
    style_boundary_contract: styleBoundaryContract,
    opening_contract: openingContract,
    prose_craft_contract: proseCraftContract,
    punctuation_tone_contract: punctuationToneContract,
    quality_audit_contract: qualityAuditContract,
  })
  const benchmarkRecallBrief = buildBenchmarkRecallBrief(contextPackage, {
    chapter_blueprint: chapterBlueprint,
    style_sample_strategy: contextPackage?.chapter_target?.style_sample_strategy || contextPackage?.style_sample_strategy || styleSampleStrategy,
    chapter_benchmark_strategy: chapterBenchmarkStrategy,
  })
  const benchmarkRecallGaps = benchmarkRecallGapsFromContext(contextPackage, {
    style_sample_strategy: contextPackage?.chapter_target?.style_sample_strategy || contextPackage?.style_sample_strategy || styleSampleStrategy,
    chapter_benchmark_strategy: chapterBenchmarkStrategy,
  })
  const intentConfirmationContract = buildIntentConfirmationContract(contextPackage, {
    chapter_blueprint: chapterBlueprint,
    emotional_curve: emotionalCurve,
    style_sample_strategy: contextPackage?.chapter_target?.style_sample_strategy || contextPackage?.style_sample_strategy || styleSampleStrategy,
    chapter_benchmark_strategy: chapterBenchmarkStrategy,
    state_tracking_contract: stateTrackingContract,
  })
  const writePreparationBrief = buildWritePreparationBrief(contextPackage, {
    chapter_blueprint: chapterBlueprint,
    reader_retention_brief: readerRetentionBrief,
    asset_linkage_contract: assetLinkageContract,
    state_tracking_contract: stateTrackingContract,
    delivery_risk_carry_over: deliveryRiskCarryOver,
    benchmark_recall_brief: benchmarkRecallBrief,
    benchmark_recall_gaps: benchmarkRecallGaps,
    recent_fatigue_brief: recentFatigueBrief,
    batch_preflight: contextPackage?.chapter_target?.batch_preflight || contextPackage?.batch_preflight,
    reader_expectation_debt_context: readerExpectationDebtContext,
    target_reader_contract: targetReaderContract,
    genre_positioning_contract: genrePositioningContract,
    plot_special_topics_contract: plotSpecialTopicsContract,
    story_power_contract: storyPowerContract,
    core_contract_radar: coreContractRadar,
  })

  return {
    chapter_no: Number(chapterTarget.chapter_no || 0) || null,
    title: compactBriefText(chapterTarget.title, '未命名章节'),
    previous_handoff: previousHandoff,
    chapter_goal: compactBriefText(chapterTarget.summary || chapterTarget.goal || chapterTarget.chapter_goal),
    reader_promise: compactBriefText(readerPayoffs.join('；') || contextPackage?.writing_bible?.promise || project?.synopsis),
    core_conflict: compactBriefText(chapterTarget.conflict || sceneCards.map((card: any) => card?.conflict).filter(Boolean).join('；')),
    emotional_curve: compactBriefText(emotionalCurve || contextPackage?.writing_bible?.style_lock?.emotional_curve || '压迫 -> 试探 -> 转折/回报'),
    key_settings: Array.from(new Set(settingScope.key_settings)).slice(0, 12),
    forbidden_content: Array.from(new Set([
      ...settingScope.forbidden_content,
      ...asArray(deliveryRiskCarryOver?.forbidden_repeats),
    ])).slice(0, 12),
    storyline_advances: Array.from(new Set(storylineScope.storyline_advances)).slice(0, 12),
    storyline_plants: Array.from(new Set(storylineScope.storyline_plants)).slice(0, 12),
    storyline_payoffs: Array.from(new Set(storylineScope.storyline_payoffs)).slice(0, 12),
    storyline_forbidden: Array.from(new Set(storylineScope.storyline_forbidden)).slice(0, 12),
    platform_rubric: platformRubric,
    content_rubric: contentRubric,
    dialogue_contract: dialogueContract,
    plot_dynamics_contract: plotDynamicsContract,
    story_power_contract: storyPowerContract,
    continuity_heat_contract: continuityHeatContract,
    character_relation_contract: characterRelationContract,
    character_behavior_contract: characterBehaviorContract,
    asset_linkage_contract: assetLinkageContract,
    state_tracking_contract: stateTrackingContract,
    write_preparation_brief: writePreparationBrief,
    intent_confirmation_contract: intentConfirmationContract,
    information_flow_contract: informationFlowContract,
    expectation_threshold_contract: expectationThresholdContract,
    target_reader_contract: targetReaderContract,
    genre_positioning_contract: genrePositioningContract,
    plot_special_topics_contract: plotSpecialTopicsContract,
    female_audience_contract: femaleAudienceContract,
    upgrade_rhythm_contract: upgradeRhythmContract,
    conflict_structure_contract: conflictStructureContract,
    story_loop_contract: storyLoopContract,
    emotional_arc_contract: emotionalArcContract,
    chapter_hook_contract: chapterHookContract,
    paragraph_hook_contract: paragraphHookContract,
    suspense_contract: suspenseContract,
    reversal_contract: reversalContract,
    showdown_contract: showdownContract,
    bridge_unit_contract: bridgeUnitContract,
    plot_framework_contract: plotFrameworkContract,
    style_boundary_contract: styleBoundaryContract,
    opening_contract: openingContract,
    prose_craft_contract: proseCraftContract,
    punctuation_tone_contract: punctuationToneContract,
    quality_audit_contract: qualityAuditContract,
    character_arc_brief: characterArcBrief,
    reader_retention_brief: readerRetentionBrief,
    reader_drop_risk_brief: readerDropRiskBrief,
    golden_three_brief: goldenThreeBrief,
    story_pressure_brief: storyPressureBrief,
    story_drive_brief: storyDriveBrief,
    serial_rhythm_brief: serialRhythmBrief,
    chapter_positioning_brief: chapterPositioningBrief,
    page_turn_hook_brief: pageTurnHookBrief,
    volume_climax_brief: volumeClimaxBrief,
    recent_fatigue_brief: recentFatigueBrief,
    delivery_risk_carry_over: deliveryRiskCarryOver,
    governance_recheck_memory: governanceRecheckMemory,
    reader_expectation_debt: readerExpectationDebtContext,
    reader_expectation_ledger: readerExpectationLedger,
    innovation_brief: innovationBrief,
    signature_scene_brief: signatureSceneBrief,
    meme_strategy: memeStrategy,
    benchmark_recall_brief: benchmarkRecallBrief,
    benchmark_recall_gaps: benchmarkRecallGaps,
    style_sample_strategy: styleSampleStrategy,
    chapter_benchmark_strategy: chapterBenchmarkStrategy,
    first30_retention_brief: first30RetentionBrief,
    core_contract_radar: coreContractRadar,
    longform_compass: longformCompass,
    longform_battle_context: longformBattleContext,
    longform_memory_capsule: longformMemoryCapsule,
    layered_memory_context: layeredMemoryContext,
    progress_summary: progressSummary,
    daily_context_snapshot: dailyContextSnapshot,
    foreshadowing_consistency_radar: foreshadowingConsistencyRadar,
    next_batch_brief: nextBatchBrief,
    story_unit_context: storyUnitContext,
    chapter_blueprint: chapterBlueprint,
    scene_briefs: sceneBriefs,
    word_budget: wordTarget?.target
      ? `${wordTarget.label || '章节'} ${wordTarget.target} 字，可接受 ${wordTarget.min}-${wordTarget.max} 字`
      : compactBriefText(contextPackage?.style_lock?.chapter_word_range, '按写作圣经字数范围执行'),
    ending_hook: compactBriefText(chapterTarget.ending_hook || sceneBriefs.map(item => item.ending_hook_seed).filter(Boolean).slice(-1)[0]),
    generated_at: new Date().toISOString(),
  }
}


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
export function mergeConfirmedPreDraftBriefIntoContext(contextPackage: any, preDraftBrief: any) {
  if (!preDraftBrief?.confirmed_at) return contextPackage
  if (contextPackage?.chapterTarget) {
    const mergedChapterTarget = {
      ...(contextPackage.chapterTarget || {}),
      ...(contextPackage.chapter_target || {}),
    }
    contextPackage = {
      ...(contextPackage || {}),
      chapter_target: mergedChapterTarget,
      chapterTarget: mergedChapterTarget,
    }
  }
  const longformCompass = normalizeLongformCompass(longformCompassFromContext(contextPackage, preDraftBrief))
  const coreContractRadar = normalizeCoreContractRadar(coreContractRadarFromContext(contextPackage, preDraftBrief))
  const longformBattleContext = normalizeLongformBattleContext(longformBattleContextFromContext(contextPackage, preDraftBrief))
  const confirmedMemorySources = resolveConfirmedPreDraftMemorySources(contextPackage, preDraftBrief)
  const longformMemoryCapsule = normalizeLongformMemoryCapsule(confirmedMemorySources.longform_memory_capsule)
  const layeredMemoryContext = normalizeLayeredMemoryContext(confirmedMemorySources.layered_memory_context)
  const progressSummary = normalizeDailyProgressSummary(confirmedMemorySources.progress_summary)
  const dailyContextSnapshot = normalizeDailyContextSnapshot(confirmedMemorySources.daily_context_snapshot)
  const confirmedBriefSources = resolveConfirmedPreDraftBriefSources(contextPackage, preDraftBrief)
  const confirmedContractSources = resolveConfirmedPreDraftContractSources(contextPackage, preDraftBrief)
  const confirmedSceneCards = repairSceneCardsForProseContextHandoff(
    normalizeSceneCardsPayload({
      scene_cards: confirmedBriefSources.scene_briefs.length
        ? confirmedBriefSources.scene_briefs
        : confirmedBriefSources.scene_cards,
    }, contextPackage),
    contextPackage,
    {
      chapter_no: (contextPackage || {}).chapter_target?.chapter_no || preDraftBrief.chapter_no,
      title: (contextPackage || {}).chapter_target?.title || preDraftBrief.title,
      chapter_goal: (contextPackage || {}).chapter_target?.goal || preDraftBrief.chapter_goal,
      chapter_summary: (contextPackage || {}).chapter_target?.summary || preDraftBrief.chapter_goal,
      conflict: (contextPackage || {}).chapter_target?.conflict || preDraftBrief.core_conflict,
      ending_hook: (contextPackage || {}).chapter_target?.ending_hook || preDraftBrief.ending_hook,
    },
    confirmedBriefSources.chapter_blueprint || confirmedBriefSources.chapterBlueprint || {},
  )
  const targetChapterNo = Number((contextPackage || {}).chapter_target?.chapter_no || preDraftBrief.chapter_no || 0)
  const foreshadowingConsistencyRadar = normalizeForeshadowingConsistencyRadar(
    resolveConfirmedPreDraftForeshadowingSource(contextPackage, preDraftBrief),
    targetChapterNo,
  )
  const nextBatchBrief = normalizeNextBatchBrief(nextBatchBriefFromContext(contextPackage, preDraftBrief), targetChapterNo)
  const storyUnitContext = storyUnitContextFromContext({
    ...(contextPackage || {}),
    pre_draft_brief: preDraftBrief,
    preDraftBrief,
  }, { chapter_no: targetChapterNo })
  const confirmedReaderRetentionBrief = normalizeReaderRetentionBrief(confirmedBriefSources.reader_retention_brief)
  const readerDropRiskBrief = normalizeReaderDropRiskBrief(
    confirmedBriefSources.reader_drop_risk_brief,
    confirmedReaderRetentionBrief,
    first30RetentionBriefFromContext(contextPackage, preDraftBrief),
  )
  const goldenThreeBrief = normalizeGoldenThreeBrief(
    confirmedBriefSources.golden_three_brief,
    targetChapterNo,
  )
  const storyPressureBrief = normalizeStoryPressureBrief(
    confirmedBriefSources.story_pressure_brief,
  )
  const storyDriveBrief = normalizeStoryDriveBrief(
    confirmedBriefSources.story_drive_brief,
    confirmedSceneCards,
  )
  const sceneBriefs = confirmedSceneCards.map(sceneBriefFromCard)
  const serialRhythmBrief = normalizeSerialRhythmBrief(
    confirmedBriefSources.serial_rhythm_brief,
    sceneBriefs,
    confirmedReaderRetentionBrief,
    (contextPackage || {}).chapter_target?.word_target,
  )
  const pageTurnHookBrief = normalizePageTurnHookBrief(
    confirmedBriefSources.page_turn_hook_brief,
    (contextPackage || {}).chapter_target || {},
    sceneBriefs,
    confirmedReaderRetentionBrief,
    storyDriveBrief,
  )
  const volumeClimaxBrief = normalizeVolumeClimaxBrief(
    confirmedBriefSources.volume_climax_brief,
    (contextPackage || {}).chapter_target || {},
    confirmedBriefSources.volume_beat_budget,
  )
  const recentFatigueBrief = normalizeRecentFatigueBrief(confirmedBriefSources.recent_fatigue_brief)
  const deliveryRiskCarryOver = normalizeDeliveryRiskCarryOverContext(confirmedBriefSources.delivery_risk_carry_over)
  const governanceRecheckMemory = normalizeGovernanceRecheckMemoryContext(confirmedBriefSources.governance_recheck_memory)
  const readerExpectationDebtContext = applyReaderExpectationDebtAging(
    normalizeReaderExpectationDebtContext(confirmedBriefSources.reader_expectation_debt_context),
    Number((contextPackage || {}).chapter_target?.chapter_no || preDraftBrief.chapter_no || 0),
  )
  const readerExpectationLedger = normalizeReaderExpectationLedgerContract(
    confirmedBriefSources.reader_expectation_ledger,
    (contextPackage || {}).chapter_target || {},
    preDraftBrief,
    readerExpectationDebtContext,
  )
  const signatureSceneBrief = normalizeSignatureSceneBrief(
    confirmedBriefSources.signature_scene_brief,
  )
  const innovationBrief = normalizeInnovationBrief(confirmedBriefSources.innovation_brief)
  const characterArcBrief = confirmedBriefSources.character_arc_brief
  const chapterBlueprint = confirmedBriefSources.chapter_blueprint
  const confirmedStyleSampleStrategy = confirmedBriefSources.style_sample_strategy
  const confirmedChapterBenchmarkStrategy = confirmedBriefSources.chapter_benchmark_strategy
  const skipBenchmarkRecall = benchmarkRecallIsNoBenchmark(benchmarkRecallGapsFromContext(contextPackage, {
    style_sample_strategy: confirmedStyleSampleStrategy,
    chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
  }))
  const benchmarkRecallGaps = benchmarkRecallGapsFromContext(contextPackage, {
    style_sample_strategy: confirmedStyleSampleStrategy,
    chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
  })
  const benchmarkRecallSources = resolveConfirmedPreDraftBenchmarkRecallSources(contextPackage, preDraftBrief)
  const benchmarkRecallBrief = skipBenchmarkRecall
    ? null
    : buildBenchmarkRecallBrief({
      ...(contextPackage || {}),
      benchmark_recall_brief: benchmarkRecallSources.benchmark_recall_brief,
      style_sample_strategy: confirmedStyleSampleStrategy,
      chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
      chapter_target: {
        ...((contextPackage || {}).chapter_target || {}),
        benchmark_recall_brief: benchmarkRecallSources.chapter_target_benchmark_recall_brief,
        style_sample_strategy: confirmedStyleSampleStrategy,
        chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
        chapter_blueprint: chapterBlueprint,
      },
    }, {
      chapter_blueprint: chapterBlueprint,
      style_sample_strategy: confirmedStyleSampleStrategy,
      chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
    })
  const styleBoundaryContract = buildStyleBoundaryContract({}, {
    ...(contextPackage || {}),
    style_boundary_contract: confirmedContractSources.style_boundary_contract,
  }, {
    style_sample_strategy: confirmedStyleSampleStrategy,
    chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
    benchmark_recall_brief: benchmarkRecallBrief,
  })
  const platformRubric = buildPlatformRubric({}, {
    ...(contextPackage || {}),
    platform_rubric: confirmedContractSources.platform_rubric,
  })
  const contentRubric = buildContentRubric({
    ...(contextPackage || {}),
    content_rubric: confirmedContractSources.content_rubric,
  })
  const dialogueContract = buildDialogueContract({
    ...(contextPackage || {}),
    dialogue_contract: confirmedContractSources.dialogue_contract,
  })
  const plotDynamicsContract = buildPlotDynamicsContract({
    ...(contextPackage || {}),
    plot_dynamics_contract: confirmedContractSources.plot_dynamics_contract,
  })
  const storyPowerContract = buildStoryPowerContract({}, {
    ...(contextPackage || {}),
    story_power_contract: confirmedContractSources.story_power_contract,
  })
  const continuityHeatContract = buildContinuityHeatContract({
    ...(contextPackage || {}),
    continuity_heat_contract: confirmedContractSources.continuity_heat_contract,
  })
  const characterRelationContract = buildCharacterRelationContract({
    ...(contextPackage || {}),
    character_relation_contract: confirmedContractSources.character_relation_contract,
  })
  const characterBehaviorContract = buildCharacterBehaviorContract({
    ...(contextPackage || {}),
    character_behavior_contract: confirmedContractSources.character_behavior_contract,
  })
  const assetLinkageContract = buildAssetLinkageContract({
    ...(contextPackage || {}),
    asset_linkage_contract: confirmedContractSources.asset_linkage_contract,
  })
  const stateTrackingContract = buildStateTrackingContract({
    ...(contextPackage || {}),
    state_tracking_contract: confirmedContractSources.state_tracking_contract,
  })
  const intentConfirmationContract = buildIntentConfirmationContract({
    ...(contextPackage || {}),
    intent_confirmation_contract: confirmedContractSources.intent_confirmation_contract,
  }, {
    chapter_blueprint: chapterBlueprint,
    style_sample_strategy: confirmedStyleSampleStrategy,
    chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
    state_tracking_contract: stateTrackingContract,
  })
  const informationFlowContract = buildInformationFlowContract({
    ...(contextPackage || {}),
    information_flow_contract: confirmedContractSources.information_flow_contract,
  })
  const expectationThresholdContract = buildExpectationThresholdContract({
    ...(contextPackage || {}),
    expectation_threshold_contract: confirmedContractSources.expectation_threshold_contract,
  })
  const targetReaderContract = buildTargetReaderContract({}, {
    ...(contextPackage || {}),
    target_reader_contract: confirmedContractSources.target_reader_contract,
  })
  const genrePositioningContract = buildGenrePositioningContract({}, {
    ...(contextPackage || {}),
    genre_positioning_contract: confirmedContractSources.genre_positioning_contract,
  })
  const plotSpecialTopicsContract = plotSpecialTopicsContractForSync({}, {
    ...(contextPackage || {}),
    plot_special_topics_contract: confirmedContractSources.plot_special_topics_contract,
  })
  const femaleAudienceContract = buildFemaleAudienceContract({}, {
    ...(contextPackage || {}),
    female_audience_contract: confirmedContractSources.female_audience_contract,
  })
  const upgradeRhythmContract = buildUpgradeRhythmContract({}, {
    ...(contextPackage || {}),
    upgrade_rhythm_contract: confirmedContractSources.upgrade_rhythm_contract,
  })
  const conflictStructureContract = buildConflictStructureContract({}, {
    ...(contextPackage || {}),
    conflict_structure_contract: confirmedContractSources.conflict_structure_contract,
  })
  const storyLoopContract = buildStoryLoopContract({}, {
    ...(contextPackage || {}),
    story_loop_contract: confirmedContractSources.story_loop_contract,
  })
  const emotionalArcContract = buildEmotionalArcContract({}, {
    ...(contextPackage || {}),
    emotional_arc_contract: confirmedContractSources.emotional_arc_contract,
  })
  const chapterHookContract = buildChapterHookContract({}, {
    ...(contextPackage || {}),
    chapter_hook_contract: confirmedContractSources.chapter_hook_contract,
  })
  const paragraphHookContract = buildParagraphHookContract({}, {
    ...(contextPackage || {}),
    paragraph_hook_contract: confirmedContractSources.paragraph_hook_contract,
  })
  const suspenseContract = buildSuspenseContract({}, {
    ...(contextPackage || {}),
    suspense_contract: confirmedContractSources.suspense_contract,
  })
  const reversalContract = buildReversalContract({}, {
    ...(contextPackage || {}),
    reversal_contract: confirmedContractSources.reversal_contract,
  })
  const showdownContract = buildShowdownContract({}, {
    ...(contextPackage || {}),
    showdown_contract: confirmedContractSources.showdown_contract,
  })
  const bridgeUnitContract = buildBridgeUnitContract({}, {
    ...(contextPackage || {}),
    bridge_unit_contract: confirmedContractSources.bridge_unit_contract,
  })
  const plotFrameworkContract = buildPlotFrameworkContract({}, {
    ...(contextPackage || {}),
    plot_framework_contract: confirmedContractSources.plot_framework_contract,
  }, {
    showdown_contract: showdownContract,
    bridge_unit_contract: bridgeUnitContract,
    suspense_contract: suspenseContract,
    conflict_structure_contract: conflictStructureContract,
  })
  const openingContract = buildOpeningContract({}, {
    ...(contextPackage || {}),
    opening_contract: confirmedContractSources.opening_contract,
  })
  const proseCraftContract = buildProseCraftContract({}, {
    ...(contextPackage || {}),
    prose_craft_contract: confirmedContractSources.prose_craft_contract,
  })
  const punctuationToneContract = buildPunctuationToneContract({}, {
    ...(contextPackage || {}),
    punctuation_tone_contract: confirmedContractSources.punctuation_tone_contract,
  })
  const qualityAuditContract = buildQualityAuditContract({}, {
    ...(contextPackage || {}),
    quality_audit_contract: confirmedContractSources.quality_audit_contract,
  })
  const writePreparationBrief = confirmedContractSources.write_preparation_brief
    || buildWritePreparationBrief(contextPackage, {
      chapter_blueprint: chapterBlueprint,
      reader_retention_brief: confirmedReaderRetentionBrief,
      asset_linkage_contract: assetLinkageContract,
      state_tracking_contract: stateTrackingContract,
      delivery_risk_carry_over: deliveryRiskCarryOver,
      recent_fatigue_brief: recentFatigueBrief,
      batch_preflight: (contextPackage || {}).chapter_target?.batch_preflight || (contextPackage || {}).batch_preflight,
      reader_expectation_debt_context: readerExpectationDebtContext,
      plot_special_topics_contract: plotSpecialTopicsContract,
      story_power_contract: storyPowerContract,
    })
  const confirmedPreDraftBrief = {
    ...preDraftBrief,
    chapter_blueprint: chapterBlueprint,
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
    intent_confirmation_contract: intentConfirmationContract,
    benchmark_recall_brief: benchmarkRecallBrief,
    benchmark_recall_gaps: benchmarkRecallGaps,
    style_sample_strategy: confirmedStyleSampleStrategy,
    chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
    style_boundary_contract: styleBoundaryContract,
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
    opening_contract: openingContract,
    prose_craft_contract: proseCraftContract,
    punctuation_tone_contract: punctuationToneContract,
    quality_audit_contract: qualityAuditContract,
    write_preparation_brief: writePreparationBrief,
    reader_retention_brief: confirmedReaderRetentionBrief,
    reader_drop_risk_brief: readerDropRiskBrief || null,
    golden_three_brief: goldenThreeBrief || null,
    story_pressure_brief: storyPressureBrief || null,
    story_drive_brief: storyDriveBrief || null,
    serial_rhythm_brief: serialRhythmBrief || null,
    page_turn_hook_brief: pageTurnHookBrief || null,
    volume_climax_brief: volumeClimaxBrief || null,
    recent_fatigue_brief: recentFatigueBrief || null,
    delivery_risk_carry_over: deliveryRiskCarryOver || null,
    governance_recheck_memory: governanceRecheckMemory || null,
    reader_expectation_debt: readerExpectationDebtContext,
    reader_expectation_ledger: readerExpectationLedger || null,
    innovation_brief: innovationBrief,
    signature_scene_brief: signatureSceneBrief,
    character_arc_brief: characterArcBrief || null,
    core_contract_radar: coreContractRadar || null,
    longform_compass: longformCompass || null,
    longform_battle_context: longformBattleContext || null,
    longform_memory_capsule: longformMemoryCapsule || null,
    layered_memory_context: layeredMemoryContext || null,
    progress_summary: progressSummary || null,
    daily_context_snapshot: dailyContextSnapshot || null,
    foreshadowing_consistency_radar: foreshadowingConsistencyRadar || null,
    next_batch_brief: nextBatchBrief || null,
    story_unit_context: storyUnitContext || null,
    scene_briefs: sceneBriefs,
  }
  return {
    ...(contextPackage || {}),
    pre_draft_brief: confirmedPreDraftBrief,
    preDraftBrief: confirmedPreDraftBrief,
    chapter_blueprint: chapterBlueprint,
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
    intent_confirmation_contract: intentConfirmationContract,
    benchmark_recall_brief: benchmarkRecallBrief,
    benchmark_recall_gaps: benchmarkRecallGaps,
    style_sample_strategy: confirmedStyleSampleStrategy,
    chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
    style_boundary_contract: styleBoundaryContract,
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
    opening_contract: openingContract,
    prose_craft_contract: proseCraftContract,
    punctuation_tone_contract: punctuationToneContract,
    quality_audit_contract: qualityAuditContract,
    write_preparation_brief: writePreparationBrief,
    core_contract_radar: coreContractRadar || (contextPackage || {}).core_contract_radar || null,
    longform_compass: longformCompass || (contextPackage || {}).longform_compass || null,
    longform_battle_context: longformBattleContext || (contextPackage || {}).longform_battle_context || null,
    longform_memory_capsule: longformMemoryCapsule || (contextPackage || {}).longform_memory_capsule || null,
    layered_memory_context: layeredMemoryContext || (contextPackage || {}).layered_memory_context || null,
    progress_summary: progressSummary || (contextPackage || {}).progress_summary || null,
    daily_context_snapshot: dailyContextSnapshot || (contextPackage || {}).daily_context_snapshot || null,
    foreshadowing_consistency_radar: foreshadowingConsistencyRadar || (contextPackage || {}).foreshadowing_consistency_radar || null,
    next_batch_brief: nextBatchBrief || (contextPackage || {}).next_batch_brief || null,
    story_unit_context: storyUnitContext || (contextPackage || {}).story_unit_context || null,
    reader_drop_risk_brief: readerDropRiskBrief || (contextPackage || {}).reader_drop_risk_brief || (contextPackage || {}).readerDropRiskBrief || null,
    golden_three_brief: goldenThreeBrief || (contextPackage || {}).golden_three_brief || null,
    story_pressure_brief: storyPressureBrief || (contextPackage || {}).story_pressure_brief || null,
    story_drive_brief: storyDriveBrief || (contextPackage || {}).story_drive_brief || null,
    serial_rhythm_brief: serialRhythmBrief || (contextPackage || {}).serial_rhythm_brief || null,
    page_turn_hook_brief: pageTurnHookBrief || (contextPackage || {}).page_turn_hook_brief || null,
    volume_climax_brief: volumeClimaxBrief || (contextPackage || {}).volume_climax_brief || null,
    recent_fatigue_brief: recentFatigueBrief || (contextPackage || {}).recent_fatigue_brief || null,
    delivery_risk_carry_over: deliveryRiskCarryOver || (contextPackage || {}).delivery_risk_carry_over || null,
    governance_recheck_memory: governanceRecheckMemory || (contextPackage || {}).governance_recheck_memory || null,
    reader_expectation_debt_context: readerExpectationDebtContext,
    character_arc_context: characterArcBrief || (contextPackage || {}).character_arc_context || null,
    chapter_target: {
      ...((contextPackage || {}).chapter_target || {}),
      summary: compactBriefText(preDraftBrief.chapter_goal, (contextPackage || {}).chapter_target?.summary),
      goal: compactBriefText(preDraftBrief.chapter_goal, (contextPackage || {}).chapter_target?.goal),
      conflict: compactBriefText(preDraftBrief.core_conflict, (contextPackage || {}).chapter_target?.conflict),
      ending_hook: compactBriefText(preDraftBrief.ending_hook, (contextPackage || {}).chapter_target?.ending_hook),
      previous_handoff: compactBriefText(preDraftBrief.previous_handoff, (contextPackage || {}).chapter_target?.previous_handoff),
      reader_promise: compactBriefText(preDraftBrief.reader_promise),
      emotional_curve: compactBriefText(preDraftBrief.emotional_curve),
      key_settings: asArray(preDraftBrief.key_settings),
      forbidden_content: asArray(preDraftBrief.forbidden_content),
      storyline_advances: asArray(preDraftBrief.storyline_advances),
      storyline_plants: asArray(preDraftBrief.storyline_plants),
      storyline_payoffs: asArray(preDraftBrief.storyline_payoffs),
      storyline_forbidden: asArray(preDraftBrief.storyline_forbidden),
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
      intent_confirmation_contract: intentConfirmationContract,
      benchmark_recall_brief: benchmarkRecallBrief,
      benchmark_recall_gaps: benchmarkRecallGaps,
      style_boundary_contract: styleBoundaryContract,
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
      opening_contract: openingContract,
      prose_craft_contract: proseCraftContract,
      punctuation_tone_contract: punctuationToneContract,
      quality_audit_contract: qualityAuditContract,
      write_preparation_brief: writePreparationBrief,
      character_arc_brief: characterArcBrief,
      reader_retention_brief: confirmedReaderRetentionBrief,
      reader_drop_risk_brief: readerDropRiskBrief || (contextPackage || {}).chapter_target?.reader_drop_risk_brief || (contextPackage || {}).chapter_target?.readerDropRiskBrief || null,
      golden_three_brief: goldenThreeBrief || (contextPackage || {}).chapter_target?.golden_three_brief || null,
      story_pressure_brief: storyPressureBrief || (contextPackage || {}).chapter_target?.story_pressure_brief || null,
      story_drive_brief: storyDriveBrief || (contextPackage || {}).chapter_target?.story_drive_brief || null,
      serial_rhythm_brief: serialRhythmBrief || (contextPackage || {}).chapter_target?.serial_rhythm_brief || null,
      page_turn_hook_brief: pageTurnHookBrief || (contextPackage || {}).chapter_target?.page_turn_hook_brief || null,
      volume_climax_brief: volumeClimaxBrief || (contextPackage || {}).chapter_target?.volume_climax_brief || null,
      recent_fatigue_brief: recentFatigueBrief || (contextPackage || {}).chapter_target?.recent_fatigue_brief || null,
      delivery_risk_carry_over: deliveryRiskCarryOver || (contextPackage || {}).chapter_target?.delivery_risk_carry_over || null,
      governance_recheck_memory: governanceRecheckMemory || (contextPackage || {}).chapter_target?.governance_recheck_memory || null,
      reader_expectation_debt_context: readerExpectationDebtContext,
      reader_expectation_ledger: readerExpectationLedger || null,
      innovation_brief: innovationBrief,
      signature_scene_brief: signatureSceneBrief,
      meme_strategy: preDraftBrief.meme_strategy || (contextPackage || {}).chapter_target?.meme_strategy || null,
      style_sample_strategy: confirmedStyleSampleStrategy,
      chapter_benchmark_strategy: confirmedChapterBenchmarkStrategy,
      first30_retention_brief: first30RetentionBriefFromContext(contextPackage, preDraftBrief),
      core_contract_radar: coreContractRadar || (contextPackage || {}).chapter_target?.core_contract_radar || null,
      longform_compass: longformCompass || (contextPackage || {}).chapter_target?.longform_compass || null,
      longform_battle_context: longformBattleContext || (contextPackage || {}).chapter_target?.longform_battle_context || null,
      longform_memory_capsule: longformMemoryCapsule || (contextPackage || {}).chapter_target?.longform_memory_capsule || null,
      layered_memory_context: layeredMemoryContext || (contextPackage || {}).chapter_target?.layered_memory_context || null,
      progress_summary: progressSummary || (contextPackage || {}).chapter_target?.progress_summary || null,
      daily_context_snapshot: dailyContextSnapshot || (contextPackage || {}).chapter_target?.daily_context_snapshot || null,
      foreshadowing_consistency_radar: foreshadowingConsistencyRadar || (contextPackage || {}).chapter_target?.foreshadowing_consistency_radar || null,
      next_batch_brief: nextBatchBrief || (contextPackage || {}).chapter_target?.next_batch_brief || null,
      story_unit_context: storyUnitContext || (contextPackage || {}).chapter_target?.story_unit_context || null,
      chapter_blueprint: chapterBlueprint,
      scene_cards: confirmedSceneCards,
    },
  }
}

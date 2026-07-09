export function resolveConfirmedPreDraftMemorySources(contextPackage: any = {}, preDraftBrief: any = {}) {
  const context = contextPackage || {}
  const target = context.chapter_target || {}
  const storyState = context.story_state || {}
  const camelStoryState = context.storyState || {}
  return {
    longform_memory_capsule: preDraftBrief.longform_memory_capsule
      || preDraftBrief.longformMemoryCapsule
      || target.longform_memory_capsule
      || target.longformMemoryCapsule
      || context.longform_memory_capsule
      || context.longformMemoryCapsule,
    layered_memory_context: preDraftBrief.layered_memory_context
      || preDraftBrief.layeredMemoryContext
      || preDraftBrief.longform_layered_memory
      || preDraftBrief.longformLayeredMemory
      || target.layered_memory_context
      || target.layeredMemoryContext
      || target.longform_layered_memory
      || target.longformLayeredMemory
      || context.layered_memory_context
      || context.layeredMemoryContext
      || context.longform_layered_memory
      || context.longformLayeredMemory,
    progress_summary: preDraftBrief.progress_summary
      || preDraftBrief.progressSummary
      || target.progress_summary
      || target.progressSummary
      || context.progress_summary
      || context.progressSummary
      || storyState.progress_summary
      || camelStoryState.progressSummary,
    daily_context_snapshot: preDraftBrief.daily_context_snapshot
      || preDraftBrief.dailyContextSnapshot
      || target.daily_context_snapshot
      || target.dailyContextSnapshot
      || context.daily_context_snapshot
      || context.dailyContextSnapshot
      || storyState.daily_context_snapshot
      || storyState.dailyContextSnapshot
      || camelStoryState.dailyContextSnapshot,
  }
}

export function resolveConfirmedPreDraftForeshadowingSource(contextPackage: any = {}, preDraftBrief: any = {}) {
  const context = contextPackage || {}
  const target = context.chapter_target || {}
  const storyState = context.story_state || {}
  const camelStoryState = context.storyState || {}
  return preDraftBrief.foreshadowing_consistency_radar
    || preDraftBrief.foreshadowingConsistencyRadar
    || target.foreshadowing_consistency_radar
    || target.foreshadowingConsistencyRadar
    || context.foreshadowing_consistency_radar
    || context.foreshadowingConsistencyRadar
    || storyState.foreshadowing_consistency_radar
    || storyState.foreshadowingConsistencyRadar
    || camelStoryState.foreshadowingConsistencyRadar
    || {
      foreshadowing_status: storyState.foreshadowing_status
        || storyState.foreshadowingStatus
        || camelStoryState.foreshadowingStatus,
      payoff_queue: storyState.payoff_queue
        || storyState.payoffQueue
        || camelStoryState.payoffQueue,
    }
}

export function resolveConfirmedPreDraftBenchmarkRecallSources(contextPackage: any = {}, preDraftBrief: any = {}) {
  const context = contextPackage || {}
  const target = context.chapter_target || {}
  const confirmedBrief = preDraftBrief.benchmark_recall_brief
    || preDraftBrief.benchmarkRecallBrief
  const targetBrief = target.benchmark_recall_brief
  return {
    benchmark_recall_brief: confirmedBrief || targetBrief || context.benchmark_recall_brief,
    chapter_target_benchmark_recall_brief: confirmedBrief || targetBrief,
  }
}

function arrayOrEmpty(value: any) {
  return Array.isArray(value) ? value : []
}

function snakeToCamel(key: string) {
  return key.replace(/_([a-z])/g, (_, char) => char.toUpperCase())
}

function resolveLegacyContractSource(context: any, target: any, preDraftBrief: any, key: string) {
  return preDraftBrief[key]
    || preDraftBrief[snakeToCamel(key)]
    || target[key]
    || context[key]
}

export function resolveConfirmedPreDraftBriefSources(contextPackage: any = {}, preDraftBrief: any = {}) {
  const context = contextPackage || {}
  const target = context.chapter_target || {}
  return {
    reader_retention_brief: preDraftBrief.reader_retention_brief
      || preDraftBrief.readerRetentionBrief
      || target.reader_retention_brief
      || target.readerRetentionBrief
      || context.reader_retention_brief
      || context.readerRetentionBrief,
    reader_drop_risk_brief: preDraftBrief.reader_drop_risk_brief
      || preDraftBrief.readerDropRiskBrief
      || target.reader_drop_risk_brief
      || target.readerDropRiskBrief
      || context.reader_drop_risk_brief
      || context.readerDropRiskBrief
      || context.reader_trial_context
      || context.readerTrialContext,
    golden_three_brief: preDraftBrief.golden_three_brief
      || preDraftBrief.goldenThreeBrief
      || target.golden_three_brief
      || target.goldenThreeBrief
      || context.golden_three_brief
      || context.goldenThreeBrief,
    story_pressure_brief: preDraftBrief.story_pressure_brief
      || preDraftBrief.storyPressureBrief
      || target.story_pressure_brief
      || target.storyPressureBrief
      || context.story_pressure_brief
      || context.storyPressureBrief
      || context.story_pressure_ladder
      || context.storyPressureLadder,
    story_drive_brief: preDraftBrief.story_drive_brief
      || preDraftBrief.storyDriveBrief
      || target.story_drive_brief
      || target.storyDriveBrief
      || context,
    scene_briefs: arrayOrEmpty(preDraftBrief.scene_briefs),
    scene_cards: arrayOrEmpty(target.scene_cards),
    serial_rhythm_brief: preDraftBrief.serial_rhythm_brief
      || preDraftBrief.serialRhythmBrief
      || target.serial_rhythm_brief
      || target.serialRhythmBrief
      || context.serial_rhythm_brief
      || context.serialRhythmBrief,
    page_turn_hook_brief: preDraftBrief.page_turn_hook_brief
      || preDraftBrief.pageTurnHookBrief
      || target.page_turn_hook_brief
      || target.pageTurnHookBrief
      || context.page_turn_hook_brief
      || context.pageTurnHookBrief,
    volume_climax_brief: preDraftBrief.volume_climax_brief
      || preDraftBrief.volumeClimaxBrief
      || preDraftBrief.volume_beat_brief
      || preDraftBrief.volumeBeatBrief
      || target.volume_climax_brief
      || target.volumeClimaxBrief
      || target.volume_beat_brief
      || target.volumeBeatBrief
      || context.volume_climax_brief
      || context.volumeClimaxBrief
      || context.volume_beat_brief
      || context.volumeBeatBrief
      || context.volume_beat_budget
      || context.volumeBeatBudget,
    volume_beat_budget: context.volume_beat_budget || context.volumeBeatBudget,
    recent_fatigue_brief: preDraftBrief.recent_fatigue_brief
      || preDraftBrief.recentFatigueBrief
      || preDraftBrief.recent_fatigue_radar
      || preDraftBrief.recentFatigueRadar
      || target.recent_fatigue_brief
      || target.recentFatigueBrief
      || target.recent_fatigue_radar
      || target.recentFatigueRadar
      || context.recent_fatigue_brief
      || context.recentFatigueBrief
      || context.recent_fatigue_radar
      || context.recentFatigueRadar,
    delivery_risk_carry_over: preDraftBrief.delivery_risk_carry_over
      || preDraftBrief.deliveryRiskCarryOver
      || target.delivery_risk_carry_over
      || target.deliveryRiskCarryOver
      || context.delivery_risk_carry_over
      || context.deliveryRiskCarryOver,
    governance_recheck_memory: preDraftBrief.governance_recheck_memory
      || preDraftBrief.governanceRecheckMemory
      || target.governance_recheck_memory
      || target.governanceRecheckMemory
      || context.governance_recheck_memory
      || context.governanceRecheckMemory,
    reader_expectation_debt_context: preDraftBrief.reader_expectation_debt
      || preDraftBrief.readerExpectationDebt
      || preDraftBrief.reader_expectation_debt_context
      || preDraftBrief.readerExpectationDebtContext
      || target.reader_expectation_debt_context
      || target.readerExpectationDebtContext
      || context.reader_expectation_debt_context
      || context.readerExpectationDebtContext,
    reader_expectation_ledger: preDraftBrief.reader_expectation_ledger
      || preDraftBrief.readerExpectationLedger
      || target.reader_expectation_ledger
      || target.readerExpectationLedger
      || context.reader_expectation_ledger
      || context.readerExpectationLedger,
    signature_scene_brief: preDraftBrief.signature_scene_brief
      || preDraftBrief.signatureSceneBrief
      || target.signature_scene_brief
      || target.signatureSceneBrief
      || context.signature_scene_brief
      || context.signatureSceneBrief
      || target.rollingPlan
      || target.rolling_plan,
    innovation_brief: preDraftBrief.innovation_brief
      || preDraftBrief.innovationBrief
      || target.innovation_brief
      || target.innovationBrief
      || context.innovation_brief
      || context.innovationBrief,
    character_arc_brief: preDraftBrief.character_arc_brief
      || preDraftBrief.characterArcBrief
      || target.character_arc_brief
      || context.character_arc_context
      || null,
    chapter_blueprint: preDraftBrief.chapter_blueprint
      || preDraftBrief.chapterBlueprint
      || target.chapter_blueprint
      || context.chapter_blueprint
      || null,
    style_sample_strategy: preDraftBrief.style_sample_strategy
      || preDraftBrief.styleSampleStrategy
      || target.style_sample_strategy
      || target.styleSampleStrategy
      || context.style_sample_strategy
      || context.styleSampleStrategy
      || null,
    chapter_benchmark_strategy: preDraftBrief.chapter_benchmark_strategy
      || preDraftBrief.chapterBenchmarkStrategy
      || target.chapter_benchmark_strategy
      || target.chapterBenchmarkStrategy
      || context.chapter_benchmark_strategy
      || context.chapterBenchmarkStrategy
      || null,
  }
}

const confirmedPreDraftContractKeys = [
  'style_boundary_contract',
  'platform_rubric',
  'content_rubric',
  'dialogue_contract',
  'plot_dynamics_contract',
  'story_power_contract',
  'continuity_heat_contract',
  'character_relation_contract',
  'character_behavior_contract',
  'asset_linkage_contract',
  'state_tracking_contract',
  'intent_confirmation_contract',
  'information_flow_contract',
  'expectation_threshold_contract',
  'target_reader_contract',
  'genre_positioning_contract',
  'plot_special_topics_contract',
  'female_audience_contract',
  'upgrade_rhythm_contract',
  'conflict_structure_contract',
  'story_loop_contract',
  'emotional_arc_contract',
  'chapter_hook_contract',
  'paragraph_hook_contract',
  'suspense_contract',
  'reversal_contract',
  'showdown_contract',
  'bridge_unit_contract',
  'plot_framework_contract',
  'opening_contract',
  'prose_craft_contract',
  'punctuation_tone_contract',
  'quality_audit_contract',
]

export function resolveConfirmedPreDraftContractSources(contextPackage: any = {}, preDraftBrief: any = {}) {
  const context = contextPackage || {}
  const target = context.chapter_target || {}
  const sources = confirmedPreDraftContractKeys.reduce((nextSources: any, key) => {
    nextSources[key] = resolveLegacyContractSource(context, target, preDraftBrief, key)
    return nextSources
  }, {})
  sources.write_preparation_brief = preDraftBrief.write_preparation_brief || preDraftBrief.writePreparationBrief
  return sources
}

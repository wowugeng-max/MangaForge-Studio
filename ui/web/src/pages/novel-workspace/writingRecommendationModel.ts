import type { WritingCockpitActionKey } from './writingCockpitModel'

export type NovelWritingRecommendedActionKey = 'diagnostics' | 'scene_cards' | 'repair_generate' | 'generate' | 'quality_card'
export type NovelDeliveryActionKey = WritingCockpitActionKey

export type NovelWritingRecommendation = {
  key: NovelWritingRecommendedActionKey
  phase: 'prep' | 'draft' | 'review'
  label: string
  reason: string
}

export type NovelWritingResponsibility = {
  roleLabel: string
  phaseLabel: string
  actionLabel: string
  focus: string
  tone: 'editor' | 'planner' | 'writer' | 'reviewer'
}

export type NovelDeliverySummaryInput = {
  visible: boolean
  acceptanceStatus:
    | 'hidden'
    | 'needs_quality_check'
    | 'needs_revision'
    | 'needs_recheck'
    | 'needs_state_sync'
    | 'ready_to_accept'
    | 'delivered'
  statusLabel: string
  acceptanceReasons: string[]
  qualityScore: number | null
  storyStateSynced: boolean
  storylineSync?: {
    status: 'ok' | 'warn'
    label: string
    completedCount: number
    missedCount: number
    unplannedCount: number
    forbiddenCount: number
  } | null
  storyUnitSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
    rushedCount: number
    forbiddenCount: number
    riskCount: number
  } | null
  assetIntake?: {
    status: 'pending' | 'applied'
    label: string
    pendingCount: number
  } | null
  ipSceneIntake?: {
    status: 'ready'
    label: string
    candidateCount: number
    candidates: Array<{
      title: string
      summary: string
      visualHook: string
      adaptationValue: string
      spreadPoint: string
    }>
  } | null
  signatureSceneSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
    plannedCount: number
  } | null
  readabilityReview?: {
    score: number | null
    scoreLabel: string
    memeLabel: string
    riskLabel: string
    riskCount: number
  } | null
  coreDrift?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    riskCount: number
  } | null
  runwaySync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    riskCount: number
  } | null
  readerPayoffSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    debtCount: number
  } | null
  readerExpectationSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
  } | null
  readerRetentionSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
  } | null
  chapterAttraction?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    weakCount: number
    priorityLabel: string
  } | null
  storyDriveSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
    priorityLabel: string
  } | null
  characterArcSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
    priorityLabel: string
  } | null
  chapterBenchmarkSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
  } | null
  styleSampleSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
    copyRiskCount: number
  } | null
  first30RetentionRecheck?: {
    status: 'stale'
    label: string
    reason: string
  } | null
  innovationSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
  } | null
  volumeBeatSync?: {
    status: 'ok' | 'warn'
    label: string
    score: number | null
    scoreLabel: string
    missedCount: number
  } | null
  deliveryRiskQueue?: {
    totalCount: number
    label: string
    priorityLabel: string
    items: string[]
  } | null
  deliveryRiskConvergence?: {
    status: 'cleared' | 'improved' | 'unchanged' | 'worse'
    label: string
    residualCount: number
    resolvedCount: number
    nextAction: string
  } | null
  recommendedAcceptanceAction: {
    key: NovelDeliveryActionKey
    label: string
  }
}

export type NovelDeliverySummary = {
  visible: boolean
  tone: 'check' | 'revision' | 'sync' | 'ready'
  statusLabel: string
  qualityLabel: string
  storyStateLabel: string
  reason: string
  storylineSync: NovelDeliverySummaryInput['storylineSync']
  storyUnitSync: NovelDeliverySummaryInput['storyUnitSync']
  assetIntake: NovelDeliverySummaryInput['assetIntake']
  ipSceneIntake: NovelDeliverySummaryInput['ipSceneIntake']
  signatureSceneSync: NovelDeliverySummaryInput['signatureSceneSync']
  readabilityReview: NovelDeliverySummaryInput['readabilityReview']
  coreDrift: NovelDeliverySummaryInput['coreDrift']
  runwaySync: NovelDeliverySummaryInput['runwaySync']
  readerPayoffSync: NovelDeliverySummaryInput['readerPayoffSync']
  readerExpectationSync: NovelDeliverySummaryInput['readerExpectationSync']
  readerRetentionSync: NovelDeliverySummaryInput['readerRetentionSync']
  chapterAttraction: NovelDeliverySummaryInput['chapterAttraction']
  storyDriveSync: NovelDeliverySummaryInput['storyDriveSync']
  characterArcSync: NovelDeliverySummaryInput['characterArcSync']
  chapterBenchmarkSync: NovelDeliverySummaryInput['chapterBenchmarkSync']
  styleSampleSync: NovelDeliverySummaryInput['styleSampleSync']
  first30RetentionRecheck: NovelDeliverySummaryInput['first30RetentionRecheck']
  innovationSync: NovelDeliverySummaryInput['innovationSync']
  volumeBeatSync: NovelDeliverySummaryInput['volumeBeatSync']
  deliveryRiskQueue: NovelDeliverySummaryInput['deliveryRiskQueue']
  deliveryRiskConvergence: NovelDeliverySummaryInput['deliveryRiskConvergence']
  actionKey: NovelDeliveryActionKey | null
  actionLabel: string
  compactActionLabel: string
}

export type NovelDraftBriefActionKey = 'metadata' | 'scene_cards' | 'build_brief' | 'confirm_brief' | 'generate'

export type NovelPreDraftBrief = {
  chapter_goal?: string
  reader_promise?: string
  core_conflict?: string
  emotional_curve?: string
  previous_handoff?: string
  previousHandoff?: string
  key_settings?: string[]
  forbidden_content?: string[]
  storyline_advances?: string[]
  storyline_plants?: string[]
  storyline_payoffs?: string[]
  storyline_forbidden?: string[]
  character_arc_brief?: {
    desire?: string
    flaw_pressure?: string
    relationship_shift?: string
    growth_beat?: string
    voice_anchor?: string
    forbidden_reveal?: string
    arcs?: Array<{
      name?: string
      type_label?: string
      related_characters?: string[]
      current_state?: string
      growth_beat?: string
      relationship_shift?: string
      forbidden_reveal?: string
    }>
  }
  reader_retention_brief?: {
    opening_hook?: string
    payoff_promise?: string
    information_gap?: string
    emotional_reward?: string
    short_drama_scene?: string
    ending_question?: string
    forbidden_cliches?: string[]
  }
  reader_drop_risk_brief?: {
    status?: string
    score?: number | null
    quality_bar?: string
    drop_points?: string[]
    pull_points?: string[]
    repair_actions?: string[]
    opening_guardrail?: string
    middle_guardrail?: string
    ending_guardrail?: string
  }
  story_pressure_brief?: {
    status?: string
    score?: number | null
    range_label?: string
    pressure_sources?: string[]
    weak_signals?: Array<{
      key?: string
      label?: string
      status?: string
      detail?: string
    }>
    required_actions?: string[]
    pressure_source_guardrail?: string
    conflict_escalation_guardrail?: string
    stakes_growth_guardrail?: string
    reversal_pressure_guardrail?: string
  }
  story_drive_brief?: {
    protagonist_choice?: string
    choice_cost?: string
    state_change?: string
    obstacle?: string
    causal_next_step?: string
    required_actions?: string[]
  }
  serial_rhythm_brief?: {
    status?: string
    opening_hook_deadline?: string
    payoff_interval?: string
    middle_guardrail?: string
    ending_hook_guardrail?: string
    scene_payoff_budget?: Array<{
      scene_no?: number | null
      title?: string
      word_budget?: string
      required_payoff?: string
      turn?: string
      ending_hook_seed?: string
    }>
    anti_drag_rules?: string[]
  }
  page_turn_hook_brief?: {
    status?: string
    hook_type?: string
    core_question?: string
    visible_trigger?: string
    withheld_answer?: string
    next_chapter_pull?: string
    final_image?: string
    forbidden_resolution?: string[]
    required_actions?: string[]
  }
  reader_expectation_ledger?: {
    chapter_promise?: string
    carry_over?: Array<{ key?: string; label?: string; type?: string; text?: string }>
    must_deliver?: Array<{ key?: string; label?: string; type?: string; text?: string }>
    keep_alive?: Array<{ key?: string; label?: string; type?: string; text?: string }>
    must_not_break?: string[]
  }
  reader_expectation_debt?: {
    must_carry?: Array<{ from_chapter_no?: number | null; age_chapters?: number | null; overdue?: boolean; key?: string; label?: string; type?: string; text?: string }>
    keep_alive?: Array<{ from_chapter_no?: number | null; age_chapters?: number | null; overdue?: boolean; key?: string; label?: string; type?: string; text?: string }>
    overdue?: Array<{ from_chapter_no?: number | null; age_chapters?: number | null; overdue?: boolean; key?: string; label?: string; type?: string; text?: string }>
    overdue_count?: number
    source_chapters?: number[]
    summary?: string
  }
  innovation_brief?: {
    chapter_angle?: string
    execution_points?: string[]
    differentiation_guardrails?: string[]
    ip_adaptation_hooks?: string[]
  }
  signature_scene_brief?: {
    signature_scene?: string
    scene_repair_target?: string
    reader_payoff?: string
    storyline_service?: string
  }
  longform_battle_context?: {
    status?: string
    score?: number | null
    summary?: string
    risk_chips?: string[]
    primary_action?: {
      key?: string
      label?: string
      reason?: string
    } | null
    lanes?: Array<{
      key?: string
      label?: string
      status?: string
      score?: number | null
      detail?: string
      required_action?: string
    }>
    risk_lanes?: Array<{
      key?: string
      label?: string
      status?: string
      score?: number | null
      detail?: string
      required_action?: string
    }>
  }
  longform_memory_capsule?: {
    last_updated_chapter?: number | null
    core_promise?: string
    current_volume_goal?: string
    mainline_progress?: string
    character_states?: string[]
    open_questions?: string[]
    payoff_debts?: string[]
    canon_facts?: string[]
    red_lines?: string[]
  }
  meme_strategy?: {
    intensity?: string
    allowed_functions?: string[]
    forbidden_usage?: string[]
  }
  style_sample_strategy?: {
    enabled?: boolean
    locked?: boolean
    selection_mode?: string
    selection_note?: string
    samples?: Array<{
      sample_key?: string
      scene_function?: string
      narrative_rhythm?: string
      sentence_pattern?: string
      dialogue_ratio?: string
      abstract_usage?: string
      selection_reason?: string
      unsafe_direct_phrases?: string[]
    }>
    apply_to?: string[]
    do_not_copy?: string[]
  }
  first30_retention_brief?: {
    segment_label?: string
    chapter_score?: number | null
    flags?: string[]
    required_actions?: string[]
    repair_focus?: string
    risk_level?: string
  }
  recent_fatigue_brief?: {
    status?: string
    score?: number | null
    chapter_range_label?: string
    summary?: string
    fatigue_risks?: string[]
    conflict_variation?: string
    payoff_variation?: string
    hook_variation?: string
    scene_freshness?: string
    next_actions?: string[]
  }
  delivery_risk_carry_over?: {
    source_chapter_no?: number | null
    total_count?: number
    label?: string
    priority_label?: string
    items?: string[]
    required_actions?: string[]
  }
  next_batch_brief?: {
    chapter_range_label?: string
    batch_goal?: string
    reader_payoff_plan?: string
    mainline_focus?: string
    forbidden_boundary?: string
    current_chapter_role?: string
  }
  story_unit_context?: {
    title?: string
    chapter_range_label?: string
    current_chapter_role?: string
    unit_goal?: string
    entry_hook?: string
    pressure_escalation?: string[]
    mini_climax_payoff?: string
    setup_and_storyline?: string[]
    exit_hook?: string
    forbidden_advance?: string[]
  }
  volume_climax_brief?: {
    status?: string
    current_volume_title?: string
    chapter_range?: string
    current_chapter_role?: string
    volume_goal?: string
    climax_promise?: string
    required_beats?: string[]
    forbidden_payoff?: string[]
    nearby_beats?: Array<{
      chapter_no?: number | null
      type?: string
      label?: string
      detail?: string
    }>
    next_actions?: string[]
  }
  scene_briefs?: any[]
  word_budget?: string
  ending_hook?: string
  confirmed_at?: string
}

export type NovelDraftBriefSummary = {
  visible: boolean
  statusLabel: string
  focus: string
  checks: string[]
  actionKey: NovelDraftBriefActionKey | null
  actionLabel: string
  briefFields: {
    chapterGoal: string
    readerPromise: string
    coreConflict: string
    emotionalCurve: string
    keySettings: string
    forbiddenContent: string
    storylineAdvances: string
    storylinePlants: string
    storylinePayoffs: string
    storylineForbidden: string
    retentionOpeningHook: string
    retentionPayoffPromise: string
    retentionInformationGap: string
    retentionEmotionalReward: string
    retentionShortDramaScene: string
    retentionEndingQuestion: string
    retentionForbiddenCliches: string
    readerDropRiskStatus: string
    readerDropRisks: string
    readerDropOpening: string
    readerDropMiddle: string
    readerDropEnding: string
    storyPressureSources: string
    storyPressureConflict: string
    storyPressureStakes: string
    storyPressureReversal: string
    storyPressureActions: string
    storyDriveChoice: string
    storyDriveCost: string
    storyDriveChange: string
    storyDriveObstacle: string
    storyDriveNextStep: string
    serialRhythmOpening: string
    serialRhythmPayoffInterval: string
    serialRhythmMiddle: string
    serialRhythmEnding: string
    serialRhythmScenePayoffs: string
    serialRhythmAntiDrag: string
    pageTurnQuestion: string
    pageTurnTrigger: string
    pageTurnPull: string
    pageTurnForbidden: string
    expectationCarryOver: string
    expectationDebtMustCarry: string
    expectationDebtKeepAlive: string
    handoffPreviousEnding: string
    handoffOpeningObligation: string
    handoffMustCarry: string
    handoffKeepAlive: string
    deliveryRiskLabel: string
    deliveryRiskItems: string
    deliveryRiskPriority: string
    deliveryRiskActions: string
    expectationMustDeliver: string
    expectationKeepAlive: string
    expectationMustNotBreak: string
    innovationAngle: string
    innovationExecution: string
    innovationGuardrails: string
    innovationIpHooks: string
    signatureScene: string
    signatureSceneTarget: string
    signatureScenePayoff: string
    signatureSceneStoryline: string
    longformBattleStatus: string
    longformBattleSummary: string
    longformBattleRisks: string
    longformBattlePrimaryAction: string
    longformBattleLaneRequirements: string
    longformMemoryStatus: string
    longformMemoryCorePromise: string
    longformMemoryMainline: string
    longformMemoryCharacters: string
    longformMemoryQuestions: string
    longformMemoryPayoffDebts: string
    longformMemoryCanonFacts: string
    longformMemoryRedLines: string
    memeIntensity: string
    memeFunctions: string
    memeForbidden: string
    styleSampleKeys: string
    styleSampleUsage: string
    styleSampleReasons: string
    styleSampleControlState: string
    styleSampleForbidden: string
    chapterBenchmarkKeys: string
    chapterBenchmarkUsage: string
    chapterBenchmarkForbidden: string
    first30RetentionSegment: string
    first30RetentionFlags: string
    first30RetentionActions: string
    first30RetentionFocus: string
    recentFatigueRange: string
    recentFatigueRisks: string
    recentFatigueConflict: string
    recentFatiguePayoff: string
    recentFatigueHook: string
    recentFatigueScene: string
    recentFatigueActions: string
    storyUnitRange: string
    storyUnitRole: string
    storyUnitGoal: string
    storyUnitEntryHook: string
    storyUnitPressure: string
    storyUnitSetup: string
    storyUnitPayoff: string
    storyUnitExitHook: string
    storyUnitForbidden: string
    volumeClimaxRange: string
    volumeClimaxRole: string
    volumeClimaxGoal: string
    volumeClimaxPromise: string
    volumeClimaxRequiredBeats: string
    volumeClimaxForbidden: string
    volumeClimaxNearbyBeats: string
    volumeClimaxNextActions: string
    batchRange: string
    batchGoal: string
    batchReaderPayoff: string
    batchMainlineFocus: string
    batchForbidden: string
    batchCurrentRole: string
    sceneBudget: string
    wordBudget: string
    endingHook: string
  }
}

export function buildNovelDraftBriefSummary({
  activeWordCount,
  chapterGoal,
  conflict,
  endingHook,
  sceneCardCount,
  preDraftBrief,
}: {
  activeWordCount: number
  chapterGoal?: string | null
  conflict?: string | null
  endingHook?: string | null
  sceneCardCount: number
  preDraftBrief?: NovelPreDraftBrief | null
}): NovelDraftBriefSummary {
  const expectationListText = (items?: Array<{ text?: string; label?: string }>) => Array.isArray(items)
    ? items.map(item => item?.text || item?.label).filter(Boolean).join('、')
    : ''
  const longformBattleLaneText = (items?: NovelPreDraftBrief['longform_battle_context']['risk_lanes']) => Array.isArray(items)
    ? items.map(item => [
      item?.label || item?.key,
      item?.detail,
      item?.required_action ? `动作：${item.required_action}` : '',
    ].filter(Boolean).join(' - ')).filter(Boolean).join('、')
    : ''
  const volumeClimaxBeatText = (items?: NovelPreDraftBrief['volume_climax_brief']['nearby_beats']) => Array.isArray(items)
    ? items.map(item => [
      item?.chapter_no ? `第${item.chapter_no}章` : '',
      item?.type,
      item?.label,
      item?.detail,
    ].filter(Boolean).join(' ')).filter(Boolean).join('、')
    : ''
  const serialRhythmScenePayoffText = (items?: NovelPreDraftBrief['serial_rhythm_brief']['scene_payoff_budget']) => Array.isArray(items)
    ? items.map(item => [
      item?.scene_no ? `场景${item.scene_no}` : '',
      item?.title,
      item?.word_budget,
      item?.required_payoff ? `回报：${item.required_payoff}` : '',
      item?.turn ? `转折：${item.turn}` : '',
      item?.ending_hook_seed ? `钩子：${item.ending_hook_seed}` : '',
    ].filter(Boolean).join(' ')).filter(Boolean).join('、')
    : ''
  const styleSampleControlState = (() => {
    const strategy = preDraftBrief?.style_sample_strategy
    const sampleCount = Array.isArray(strategy?.samples) ? strategy.samples.length : 0
    if (strategy?.selection_mode === 'disabled_by_author' || strategy?.enabled === false) return '本章不用样章'
    if (strategy?.locked) return '作者已锁定'
    if (strategy?.selection_mode === 'author_replaced') return '已替换待确认'
    if (sampleCount > 0) return '系统推荐待确认'
    return ''
  })()
  const briefFields = {
    chapterGoal: preDraftBrief?.chapter_goal?.trim() || chapterGoal?.trim() || '',
    readerPromise: preDraftBrief?.reader_promise?.trim() || '',
    coreConflict: preDraftBrief?.core_conflict?.trim() || conflict?.trim() || '',
    emotionalCurve: preDraftBrief?.emotional_curve?.trim() || '',
    keySettings: Array.isArray(preDraftBrief?.key_settings) ? preDraftBrief.key_settings.filter(Boolean).join('、') : '',
    forbiddenContent: Array.isArray(preDraftBrief?.forbidden_content) ? preDraftBrief.forbidden_content.filter(Boolean).join('、') : '',
    storylineAdvances: Array.isArray(preDraftBrief?.storyline_advances) ? preDraftBrief.storyline_advances.filter(Boolean).join('、') : '',
    storylinePlants: Array.isArray(preDraftBrief?.storyline_plants) ? preDraftBrief.storyline_plants.filter(Boolean).join('、') : '',
    storylinePayoffs: Array.isArray(preDraftBrief?.storyline_payoffs) ? preDraftBrief.storyline_payoffs.filter(Boolean).join('、') : '',
    storylineForbidden: Array.isArray(preDraftBrief?.storyline_forbidden) ? preDraftBrief.storyline_forbidden.filter(Boolean).join('、') : '',
    characterArcNames: Array.isArray(preDraftBrief?.character_arc_brief?.arcs) ? preDraftBrief.character_arc_brief.arcs.map(arc => arc?.name).filter(Boolean).join('、') : '',
    characterArcDesire: preDraftBrief?.character_arc_brief?.desire?.trim() || '',
    characterArcFlawPressure: preDraftBrief?.character_arc_brief?.flaw_pressure?.trim() || '',
    characterArcGrowthBeat: preDraftBrief?.character_arc_brief?.growth_beat?.trim() || '',
    characterArcRelationshipShift: preDraftBrief?.character_arc_brief?.relationship_shift?.trim() || '',
    characterArcVoiceAnchor: preDraftBrief?.character_arc_brief?.voice_anchor?.trim() || '',
    characterArcForbiddenReveal: preDraftBrief?.character_arc_brief?.forbidden_reveal?.trim() || '',
    retentionOpeningHook: preDraftBrief?.reader_retention_brief?.opening_hook?.trim() || '',
    retentionPayoffPromise: preDraftBrief?.reader_retention_brief?.payoff_promise?.trim() || '',
    retentionInformationGap: preDraftBrief?.reader_retention_brief?.information_gap?.trim() || '',
    retentionEmotionalReward: preDraftBrief?.reader_retention_brief?.emotional_reward?.trim() || '',
    retentionShortDramaScene: preDraftBrief?.reader_retention_brief?.short_drama_scene?.trim() || '',
    retentionEndingQuestion: preDraftBrief?.reader_retention_brief?.ending_question?.trim() || '',
    retentionForbiddenCliches: Array.isArray(preDraftBrief?.reader_retention_brief?.forbidden_cliches) ? preDraftBrief.reader_retention_brief.forbidden_cliches.filter(Boolean).join('、') : '',
    readerDropRiskStatus: [
      preDraftBrief?.reader_drop_risk_brief?.status?.trim(),
      Number.isFinite(Number(preDraftBrief?.reader_drop_risk_brief?.score)) ? `${Number(preDraftBrief?.reader_drop_risk_brief?.score)}分` : '',
      preDraftBrief?.reader_drop_risk_brief?.quality_bar?.trim(),
    ].filter(Boolean).join(' · '),
    readerDropRisks: Array.isArray(preDraftBrief?.reader_drop_risk_brief?.drop_points) ? preDraftBrief.reader_drop_risk_brief.drop_points.filter(Boolean).join('、') : '',
    readerDropOpening: preDraftBrief?.reader_drop_risk_brief?.opening_guardrail?.trim() || '',
    readerDropMiddle: preDraftBrief?.reader_drop_risk_brief?.middle_guardrail?.trim() || '',
    readerDropEnding: preDraftBrief?.reader_drop_risk_brief?.ending_guardrail?.trim() || '',
    storyPressureSources: Array.isArray(preDraftBrief?.story_pressure_brief?.pressure_sources) ? preDraftBrief.story_pressure_brief.pressure_sources.filter(Boolean).join('、') : '',
    storyPressureConflict: preDraftBrief?.story_pressure_brief?.conflict_escalation_guardrail?.trim() || '',
    storyPressureStakes: preDraftBrief?.story_pressure_brief?.stakes_growth_guardrail?.trim() || '',
    storyPressureReversal: preDraftBrief?.story_pressure_brief?.reversal_pressure_guardrail?.trim() || '',
    storyPressureActions: Array.isArray(preDraftBrief?.story_pressure_brief?.required_actions) ? preDraftBrief.story_pressure_brief.required_actions.filter(Boolean).join('、') : '',
    storyDriveChoice: preDraftBrief?.story_drive_brief?.protagonist_choice?.trim() || '',
    storyDriveCost: preDraftBrief?.story_drive_brief?.choice_cost?.trim() || '',
    storyDriveChange: preDraftBrief?.story_drive_brief?.state_change?.trim() || '',
    storyDriveObstacle: preDraftBrief?.story_drive_brief?.obstacle?.trim() || '',
    storyDriveNextStep: preDraftBrief?.story_drive_brief?.causal_next_step?.trim() || '',
    serialRhythmOpening: preDraftBrief?.serial_rhythm_brief?.opening_hook_deadline?.trim() || '',
    serialRhythmPayoffInterval: preDraftBrief?.serial_rhythm_brief?.payoff_interval?.trim() || '',
    serialRhythmMiddle: preDraftBrief?.serial_rhythm_brief?.middle_guardrail?.trim() || '',
    serialRhythmEnding: preDraftBrief?.serial_rhythm_brief?.ending_hook_guardrail?.trim() || '',
    serialRhythmScenePayoffs: serialRhythmScenePayoffText(preDraftBrief?.serial_rhythm_brief?.scene_payoff_budget),
    serialRhythmAntiDrag: Array.isArray(preDraftBrief?.serial_rhythm_brief?.anti_drag_rules) ? preDraftBrief.serial_rhythm_brief.anti_drag_rules.filter(Boolean).join('、') : '',
    pageTurnQuestion: preDraftBrief?.page_turn_hook_brief?.core_question?.trim() || '',
    pageTurnTrigger: preDraftBrief?.page_turn_hook_brief?.visible_trigger?.trim() || '',
    pageTurnPull: preDraftBrief?.page_turn_hook_brief?.next_chapter_pull?.trim() || '',
    pageTurnForbidden: Array.isArray(preDraftBrief?.page_turn_hook_brief?.forbidden_resolution) ? preDraftBrief.page_turn_hook_brief.forbidden_resolution.filter(Boolean).join('、') : '',
    expectationCarryOver: expectationListText(preDraftBrief?.reader_expectation_ledger?.carry_over),
    expectationDebtMustCarry: expectationListText(preDraftBrief?.reader_expectation_debt?.must_carry),
    expectationDebtKeepAlive: expectationListText(preDraftBrief?.reader_expectation_debt?.keep_alive),
    expectationDebtOverdue: expectationListText(preDraftBrief?.reader_expectation_debt?.overdue),
    expectationDebtSummary: preDraftBrief?.reader_expectation_debt?.summary?.trim() || '',
    handoffPreviousEnding: preDraftBrief?.previous_handoff?.trim() || preDraftBrief?.previousHandoff?.trim() || '',
    handoffOpeningObligation: preDraftBrief?.reader_retention_brief?.opening_hook?.trim() || '',
    handoffMustCarry: expectationListText(preDraftBrief?.reader_expectation_debt?.must_carry) || expectationListText(preDraftBrief?.reader_expectation_ledger?.carry_over),
    handoffKeepAlive: expectationListText(preDraftBrief?.reader_expectation_debt?.keep_alive),
    deliveryRiskLabel: [
      preDraftBrief?.delivery_risk_carry_over?.label?.trim(),
      preDraftBrief?.delivery_risk_carry_over?.source_chapter_no ? `第${preDraftBrief.delivery_risk_carry_over.source_chapter_no}章` : '',
    ].filter(Boolean).join(' · '),
    deliveryRiskItems: Array.isArray(preDraftBrief?.delivery_risk_carry_over?.items) ? preDraftBrief.delivery_risk_carry_over.items.filter(Boolean).join('、') : '',
    deliveryRiskPriority: preDraftBrief?.delivery_risk_carry_over?.priority_label?.trim() || '',
    deliveryRiskActions: Array.isArray(preDraftBrief?.delivery_risk_carry_over?.required_actions) ? preDraftBrief.delivery_risk_carry_over.required_actions.filter(Boolean).join('、') : '',
    expectationMustDeliver: expectationListText(preDraftBrief?.reader_expectation_ledger?.must_deliver),
    expectationKeepAlive: expectationListText(preDraftBrief?.reader_expectation_ledger?.keep_alive),
    expectationMustNotBreak: Array.isArray(preDraftBrief?.reader_expectation_ledger?.must_not_break) ? preDraftBrief.reader_expectation_ledger.must_not_break.filter(Boolean).join('、') : '',
    innovationAngle: preDraftBrief?.innovation_brief?.chapter_angle?.trim() || '',
    innovationExecution: Array.isArray(preDraftBrief?.innovation_brief?.execution_points) ? preDraftBrief.innovation_brief.execution_points.filter(Boolean).join('、') : '',
    innovationGuardrails: Array.isArray(preDraftBrief?.innovation_brief?.differentiation_guardrails) ? preDraftBrief.innovation_brief.differentiation_guardrails.filter(Boolean).join('、') : '',
    innovationIpHooks: Array.isArray(preDraftBrief?.innovation_brief?.ip_adaptation_hooks) ? preDraftBrief.innovation_brief.ip_adaptation_hooks.filter(Boolean).join('、') : '',
    signatureScene: preDraftBrief?.signature_scene_brief?.signature_scene?.trim() || '',
    signatureSceneTarget: preDraftBrief?.signature_scene_brief?.scene_repair_target?.trim() || '',
    signatureScenePayoff: preDraftBrief?.signature_scene_brief?.reader_payoff?.trim() || '',
    signatureSceneStoryline: preDraftBrief?.signature_scene_brief?.storyline_service?.trim() || '',
    longformBattleStatus: preDraftBrief?.longform_battle_context?.status?.trim() || '',
    longformBattleSummary: preDraftBrief?.longform_battle_context?.summary?.trim() || '',
    longformBattleRisks: Array.isArray(preDraftBrief?.longform_battle_context?.risk_chips) ? preDraftBrief.longform_battle_context.risk_chips.filter(Boolean).join('、') : '',
    longformBattlePrimaryAction: [
      preDraftBrief?.longform_battle_context?.primary_action?.label?.trim(),
      preDraftBrief?.longform_battle_context?.primary_action?.reason?.trim(),
    ].filter(Boolean).join('：'),
    longformBattleLaneRequirements: longformBattleLaneText(
      Array.isArray(preDraftBrief?.longform_battle_context?.risk_lanes) && preDraftBrief.longform_battle_context.risk_lanes.length > 0
        ? preDraftBrief.longform_battle_context.risk_lanes
        : preDraftBrief?.longform_battle_context?.lanes,
    ),
    longformMemoryStatus: preDraftBrief?.longform_memory_capsule?.last_updated_chapter ? `第${preDraftBrief.longform_memory_capsule.last_updated_chapter}章同步` : '',
    longformMemoryCorePromise: preDraftBrief?.longform_memory_capsule?.core_promise?.trim() || '',
    longformMemoryMainline: [
      preDraftBrief?.longform_memory_capsule?.current_volume_goal?.trim(),
      preDraftBrief?.longform_memory_capsule?.mainline_progress?.trim(),
    ].filter(Boolean).join('；'),
    longformMemoryCharacters: Array.isArray(preDraftBrief?.longform_memory_capsule?.character_states) ? preDraftBrief.longform_memory_capsule.character_states.filter(Boolean).join('、') : '',
    longformMemoryQuestions: Array.isArray(preDraftBrief?.longform_memory_capsule?.open_questions) ? preDraftBrief.longform_memory_capsule.open_questions.filter(Boolean).join('、') : '',
    longformMemoryPayoffDebts: Array.isArray(preDraftBrief?.longform_memory_capsule?.payoff_debts) ? preDraftBrief.longform_memory_capsule.payoff_debts.filter(Boolean).join('、') : '',
    longformMemoryCanonFacts: Array.isArray(preDraftBrief?.longform_memory_capsule?.canon_facts) ? preDraftBrief.longform_memory_capsule.canon_facts.filter(Boolean).join('、') : '',
    longformMemoryRedLines: Array.isArray(preDraftBrief?.longform_memory_capsule?.red_lines) ? preDraftBrief.longform_memory_capsule.red_lines.filter(Boolean).join('、') : '',
    memeIntensity: preDraftBrief?.meme_strategy?.intensity?.trim() || '',
    memeFunctions: Array.isArray(preDraftBrief?.meme_strategy?.allowed_functions) ? preDraftBrief.meme_strategy.allowed_functions.filter(Boolean).join('、') : '',
    memeForbidden: Array.isArray(preDraftBrief?.meme_strategy?.forbidden_usage) ? preDraftBrief.meme_strategy.forbidden_usage.filter(Boolean).join('、') : '',
    styleSampleKeys: Array.isArray(preDraftBrief?.style_sample_strategy?.samples)
      ? preDraftBrief.style_sample_strategy.samples.map(sample => sample?.sample_key).filter(Boolean).join('、')
      : '',
    styleSampleUsage: Array.isArray(preDraftBrief?.style_sample_strategy?.samples)
      ? preDraftBrief.style_sample_strategy.samples.map(sample => sample?.abstract_usage || sample?.scene_function || sample?.narrative_rhythm).filter(Boolean).join('、')
      : '',
    styleSampleReasons: Array.isArray(preDraftBrief?.style_sample_strategy?.samples)
      ? preDraftBrief.style_sample_strategy.samples.map(sample => sample?.selection_reason).filter(Boolean).join('、')
      : '',
    styleSampleControlState,
    styleSampleForbidden: Array.isArray(preDraftBrief?.style_sample_strategy?.do_not_copy)
      ? preDraftBrief.style_sample_strategy.do_not_copy.filter(Boolean).join('、')
      : '',
    chapterBenchmarkKeys: Array.isArray(preDraftBrief?.chapter_benchmark_strategy?.samples)
      ? preDraftBrief.chapter_benchmark_strategy.samples.map(sample => sample?.sample_key).filter(Boolean).join('、')
      : '',
    chapterBenchmarkUsage: Array.isArray(preDraftBrief?.chapter_benchmark_strategy?.samples)
      ? preDraftBrief.chapter_benchmark_strategy.samples.map(sample => sample?.abstract_usage || sample?.conflict_pattern || sample?.payoff_pattern || sample?.ending_hook_pattern).filter(Boolean).join('、')
      : '',
    chapterBenchmarkForbidden: Array.isArray(preDraftBrief?.chapter_benchmark_strategy?.do_not_copy)
      ? preDraftBrief.chapter_benchmark_strategy.do_not_copy.filter(Boolean).join('、')
      : '',
    first30RetentionSegment: [
      preDraftBrief?.first30_retention_brief?.segment_label?.trim(),
      Number.isFinite(Number(preDraftBrief?.first30_retention_brief?.chapter_score)) ? `${Number(preDraftBrief?.first30_retention_brief?.chapter_score)}分` : '',
    ].filter(Boolean).join(' · '),
    first30RetentionFlags: Array.isArray(preDraftBrief?.first30_retention_brief?.flags) ? preDraftBrief.first30_retention_brief.flags.filter(Boolean).join('、') : '',
    first30RetentionActions: Array.isArray(preDraftBrief?.first30_retention_brief?.required_actions) ? preDraftBrief.first30_retention_brief.required_actions.filter(Boolean).join('、') : '',
    first30RetentionFocus: preDraftBrief?.first30_retention_brief?.repair_focus?.trim() || '',
    recentFatigueRange: [
      preDraftBrief?.recent_fatigue_brief?.chapter_range_label?.trim(),
      Number.isFinite(Number(preDraftBrief?.recent_fatigue_brief?.score)) ? `${Number(preDraftBrief?.recent_fatigue_brief?.score)}分` : '',
    ].filter(Boolean).join(' · '),
    recentFatigueRisks: Array.isArray(preDraftBrief?.recent_fatigue_brief?.fatigue_risks) ? preDraftBrief.recent_fatigue_brief.fatigue_risks.filter(Boolean).join('、') : '',
    recentFatigueConflict: preDraftBrief?.recent_fatigue_brief?.conflict_variation?.trim() || '',
    recentFatiguePayoff: preDraftBrief?.recent_fatigue_brief?.payoff_variation?.trim() || '',
    recentFatigueHook: preDraftBrief?.recent_fatigue_brief?.hook_variation?.trim() || '',
    recentFatigueScene: preDraftBrief?.recent_fatigue_brief?.scene_freshness?.trim() || '',
    recentFatigueActions: Array.isArray(preDraftBrief?.recent_fatigue_brief?.next_actions) ? preDraftBrief.recent_fatigue_brief.next_actions.filter(Boolean).join('、') : '',
    storyUnitRange: [
      preDraftBrief?.story_unit_context?.chapter_range_label?.trim(),
      preDraftBrief?.story_unit_context?.title?.trim(),
    ].filter(Boolean).join(' · '),
    storyUnitRole: preDraftBrief?.story_unit_context?.current_chapter_role?.trim() || '',
    storyUnitGoal: preDraftBrief?.story_unit_context?.unit_goal?.trim() || '',
    storyUnitEntryHook: preDraftBrief?.story_unit_context?.entry_hook?.trim() || '',
    storyUnitPressure: Array.isArray(preDraftBrief?.story_unit_context?.pressure_escalation) ? preDraftBrief.story_unit_context.pressure_escalation.filter(Boolean).join('、') : '',
    storyUnitSetup: Array.isArray(preDraftBrief?.story_unit_context?.setup_and_storyline) ? preDraftBrief.story_unit_context.setup_and_storyline.filter(Boolean).join('、') : '',
    storyUnitPayoff: preDraftBrief?.story_unit_context?.mini_climax_payoff?.trim() || '',
    storyUnitExitHook: preDraftBrief?.story_unit_context?.exit_hook?.trim() || '',
    storyUnitForbidden: Array.isArray(preDraftBrief?.story_unit_context?.forbidden_advance) ? preDraftBrief.story_unit_context.forbidden_advance.filter(Boolean).join('、') : '',
    volumeClimaxRange: [
      preDraftBrief?.volume_climax_brief?.current_volume_title?.trim(),
      preDraftBrief?.volume_climax_brief?.chapter_range?.trim(),
    ].filter(Boolean).join(' · '),
    volumeClimaxRole: preDraftBrief?.volume_climax_brief?.current_chapter_role?.trim() || '',
    volumeClimaxGoal: preDraftBrief?.volume_climax_brief?.volume_goal?.trim() || '',
    volumeClimaxPromise: preDraftBrief?.volume_climax_brief?.climax_promise?.trim() || '',
    volumeClimaxRequiredBeats: Array.isArray(preDraftBrief?.volume_climax_brief?.required_beats) ? preDraftBrief.volume_climax_brief.required_beats.filter(Boolean).join('、') : '',
    volumeClimaxForbidden: Array.isArray(preDraftBrief?.volume_climax_brief?.forbidden_payoff) ? preDraftBrief.volume_climax_brief.forbidden_payoff.filter(Boolean).join('、') : '',
    volumeClimaxNearbyBeats: volumeClimaxBeatText(preDraftBrief?.volume_climax_brief?.nearby_beats),
    volumeClimaxNextActions: Array.isArray(preDraftBrief?.volume_climax_brief?.next_actions) ? preDraftBrief.volume_climax_brief.next_actions.filter(Boolean).join('、') : '',
    batchRange: preDraftBrief?.next_batch_brief?.chapter_range_label?.trim() || '',
    batchGoal: preDraftBrief?.next_batch_brief?.batch_goal?.trim() || '',
    batchReaderPayoff: preDraftBrief?.next_batch_brief?.reader_payoff_plan?.trim() || '',
    batchMainlineFocus: preDraftBrief?.next_batch_brief?.mainline_focus?.trim() || '',
    batchForbidden: preDraftBrief?.next_batch_brief?.forbidden_boundary?.trim() || '',
    batchCurrentRole: preDraftBrief?.next_batch_brief?.current_chapter_role?.trim() || '',
    sceneBudget: Array.isArray(preDraftBrief?.scene_briefs) && preDraftBrief.scene_briefs.length > 0 ? `${preDraftBrief.scene_briefs.length} 个场景已写入任务书` : '',
    wordBudget: preDraftBrief?.word_budget?.trim() || '',
    endingHook: preDraftBrief?.ending_hook?.trim() || endingHook?.trim() || '',
  }

  if (activeWordCount > 0) {
    return {
      visible: false,
      statusLabel: '',
      focus: '',
      checks: [],
      actionKey: null,
      actionLabel: '',
      briefFields,
    }
  }

  const hasGoal = Boolean(chapterGoal?.trim())
  const hasHook = Boolean(endingHook?.trim())
  const hasScenes = sceneCardCount > 0
  const checks = [
    hasGoal ? '目标已定' : '缺目标',
    conflict?.trim() ? '冲突已定' : '缺冲突',
    hasHook ? '钩子已定' : '缺钩子',
    hasScenes ? `场景 ${sceneCardCount}` : '缺场景卡',
  ]
  const focus = [
    chapterGoal?.trim() || '本章目标待补齐',
    conflict?.trim() ? `冲突：${conflict.trim()}` : '',
    endingHook?.trim() ? `钩子：${endingHook.trim()}` : '',
  ].filter(Boolean).join('；')

  if (!hasGoal || !hasHook) {
    return {
      visible: true,
      statusLabel: '待补目标',
      focus,
      checks,
      actionKey: 'metadata',
      actionLabel: '补章节目标',
      briefFields,
    }
  }
  if (!hasScenes) {
    return {
      visible: true,
      statusLabel: '待补场景',
      focus,
      checks,
      actionKey: 'scene_cards',
      actionLabel: '补场景卡',
      briefFields,
    }
  }
  if (!preDraftBrief) {
    return {
      visible: true,
      statusLabel: '待生成任务书',
      focus,
      checks: [...checks, '缺任务书'],
      actionKey: 'build_brief',
      actionLabel: '生成任务书',
      briefFields,
    }
  }
  if (!preDraftBrief.confirmed_at) {
    return {
      visible: true,
      statusLabel: '待确认任务书',
      focus: [briefFields.readerPromise, briefFields.coreConflict, briefFields.endingHook ? `钩子：${briefFields.endingHook}` : ''].filter(Boolean).join('；') || focus,
      checks: [...checks, '任务书待确认'],
      actionKey: 'confirm_brief',
      actionLabel: '确认任务书',
      briefFields,
    }
  }
  if (preDraftBrief?.confirmed_at) {
    return {
      visible: true,
      statusLabel: '任务书已确认',
      focus: [briefFields.readerPromise, briefFields.coreConflict, briefFields.endingHook ? `钩子：${briefFields.endingHook}` : ''].filter(Boolean).join('；') || focus,
      checks: [...checks, '任务书已确认'],
      actionKey: 'generate',
      actionLabel: '确认并生成',
      briefFields,
    }
  }
  return {
    visible: true,
    statusLabel: '可进入初稿',
    focus,
    checks,
    actionKey: 'generate',
    actionLabel: '确认并生成',
    briefFields,
  }
}

export function buildNovelWritingRecommendation({
  materialReady,
  materialRecommendations,
  sceneCardCount,
  activeWordCount,
}: {
  materialReady: boolean
  materialRecommendations: string[]
  sceneCardCount: number
  activeWordCount: number
}): NovelWritingRecommendation {
  if (!materialReady) {
    return {
      key: 'repair_generate',
      phase: 'draft',
      label: '补齐并生成',
      reason: materialRecommendations[0] || '材料不足，先补齐上下文再进入正文更稳。',
    }
  }
  if (sceneCardCount === 0) {
    return {
      key: 'scene_cards',
      phase: 'prep',
      label: '场景卡',
      reason: '当前章缺少场景节拍，先拆场景能降低正文跑偏。',
    }
  }
  if (activeWordCount === 0) {
    return {
      key: 'generate',
      phase: 'draft',
      label: '生成',
      reason: '材料和场景已具备，可以进入正文初稿。',
    }
  }
  return {
    key: 'quality_card',
    phase: 'review',
    label: '交稿质检',
    reason: '当前章已有正文，下一步适合检查爽点、节奏和连续性。',
  }
}

export function buildNovelWritingResponsibility(recommendation: NovelWritingRecommendation): NovelWritingResponsibility {
  switch (recommendation.key) {
    case 'diagnostics':
      return {
        roleLabel: '总编',
        phaseLabel: '写前诊断',
        actionLabel: recommendation.label,
        focus: '判断本章是否具备开写条件，先指出阻塞项和材料缺口。',
        tone: 'editor',
      }
    case 'scene_cards':
      return {
        roleLabel: '分集策划',
        phaseLabel: '写前准备',
        actionLabel: recommendation.label,
        focus: '把本章目标拆成可执行场景节拍，锁定冲突、转折和章末钩子。',
        tone: 'planner',
      }
    case 'repair_generate':
      return {
        roleLabel: '分集策划',
        phaseLabel: '材料修复',
        actionLabel: recommendation.label,
        focus: '补齐本章上下文、人物状态和场景节拍缺口，再交给正文写手。',
        tone: 'planner',
      }
    case 'generate':
      return {
        roleLabel: '正文写手',
        phaseLabel: '正文生成',
        actionLabel: recommendation.label,
        focus: '按已确认材料和场景卡生成正文初稿，不擅自改长期设定。',
        tone: 'writer',
      }
    case 'quality_card':
      return {
        roleLabel: '修订编辑',
        phaseLabel: '写后复检',
        actionLabel: recommendation.label,
        focus: '检查已有正文的爽点、节奏、连续性和章末钩子，给出改稿依据。',
        tone: 'reviewer',
      }
  }
}

export function buildNovelDeliverySummary(desk?: NovelDeliverySummaryInput | null): NovelDeliverySummary {
  if (!desk?.visible || desk.acceptanceStatus === 'hidden') {
    return {
      visible: false,
      tone: 'check',
      statusLabel: '',
      qualityLabel: '质量待复检',
      storyStateLabel: '故事状态待同步',
      reason: '',
      storylineSync: null,
      storyUnitSync: null,
      assetIntake: null,
      ipSceneIntake: null,
      signatureSceneSync: null,
      readabilityReview: null,
      coreDrift: null,
      runwaySync: null,
      readerPayoffSync: null,
      readerExpectationSync: null,
      readerRetentionSync: null,
      chapterAttraction: null,
      storyDriveSync: null,
      characterArcSync: null,
      chapterBenchmarkSync: null,
      styleSampleSync: null,
      first30RetentionRecheck: null,
      innovationSync: null,
      volumeBeatSync: null,
      deliveryRiskQueue: null,
      deliveryRiskConvergence: null,
      actionKey: null,
      actionLabel: '',
      compactActionLabel: '',
    }
  }

  const tone: NovelDeliverySummary['tone'] = (() => {
    if (desk.acceptanceStatus === 'needs_revision') return 'revision'
    if (desk.acceptanceStatus === 'needs_state_sync') return 'sync'
    if (desk.acceptanceStatus === 'ready_to_accept' || desk.acceptanceStatus === 'delivered') return 'ready'
    return 'check'
  })()

  return {
    visible: true,
    tone,
    statusLabel: desk.statusLabel,
    qualityLabel: desk.qualityScore === null ? '质量待复检' : `质量 ${desk.qualityScore}`,
    storyStateLabel: desk.storyStateSynced ? '故事状态已同步' : '故事状态待同步',
    reason: desk.acceptanceReasons.filter(Boolean).slice(0, 2).join('；') || '本章已有正文，请按交稿流程完成复检。',
    storylineSync: desk.storylineSync || null,
    storyUnitSync: desk.storyUnitSync || null,
    assetIntake: desk.assetIntake || null,
    ipSceneIntake: desk.ipSceneIntake || null,
    signatureSceneSync: desk.signatureSceneSync || null,
    readabilityReview: desk.readabilityReview || null,
    coreDrift: desk.coreDrift || null,
    runwaySync: desk.runwaySync || null,
    readerPayoffSync: desk.readerPayoffSync || null,
    readerExpectationSync: desk.readerExpectationSync || null,
    readerRetentionSync: desk.readerRetentionSync || null,
    chapterAttraction: desk.chapterAttraction || null,
    storyDriveSync: desk.storyDriveSync || null,
    characterArcSync: desk.characterArcSync || null,
    chapterBenchmarkSync: desk.chapterBenchmarkSync || null,
    styleSampleSync: desk.styleSampleSync || null,
    first30RetentionRecheck: desk.first30RetentionRecheck || null,
    innovationSync: desk.innovationSync || null,
    volumeBeatSync: desk.volumeBeatSync || null,
    deliveryRiskQueue: desk.deliveryRiskQueue || null,
    deliveryRiskConvergence: desk.deliveryRiskConvergence || null,
    actionKey: desk.recommendedAcceptanceAction.key,
    actionLabel: desk.recommendedAcceptanceAction.label,
    compactActionLabel: compactDeliveryActionLabel(desk.recommendedAcceptanceAction.key, desk.recommendedAcceptanceAction.label),
  }
}

function compactDeliveryActionLabel(key: NovelDeliveryActionKey, label: string) {
  switch (key) {
    case 'refresh_current_quality':
      return '复检'
    case 'create_editor_report':
      return '编辑报告'
    case 'apply_editor_revision':
      return '修订'
    case 'sync_story_state':
      return '同步状态'
    case 'accept_chapter_and_continue':
      return '验收'
    default:
      return label
  }
}

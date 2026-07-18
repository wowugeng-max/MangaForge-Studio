import type { DeslopGateDiagnosticsModel, WritingCockpitActionKey } from './writingCockpitModel'

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
    | 'delivered_with_warnings'
    | 'delivered'
  admissionStatus?: 'accepted' | 'accepted_with_warnings' | 'blocked_invalid' | ''
  qualityWarnings?: Array<{ code: string; source: string; message: string }>
  storyStateStatus?: 'synced' | 'pending' | ''
  storyStatePanel?: {
    visible?: boolean
    status?: 'synced' | 'pending' | 'skipped' | 'lagging' | 'synced_with_gaps'
    statusLabel?: string
    headline?: string
    summary?: string
    reasons?: string[]
    guidance?: string
    chapterNo?: number
    lastUpdatedChapter?: number
    canSync?: boolean
    primaryAction?: { key: NovelDeliveryActionKey; label: string } | null
  } | null
  postCommitWarnings?: Array<{ stage: string; message: string }>
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
    aiSmellLabel?: string
    aiSmellRisk?: boolean
    aiSmellHitCount?: number
    aiSmellTactics?: string[]
  } | null
  deslopGateDiagnostics?: DeslopGateDiagnosticsModel | null
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
  qualityAuditSync?: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  qualityAuditRepairReceiptSync?: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    receiptCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  chapterHandoffSync?: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  chapterHandoffDeltaSync?: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
  } | null
  writePreparation?: {
    status: 'ok' | 'warn'
    label: string
    missedCount: number
    evidence: string[]
    nextActions: string[]
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
  blueprintReceipt?: {
    status: 'ok' | 'warn'
    label: string
    scoreLabel: string
    deliveredCount: number
    totalCount: number
    missedCount: number
    evidence: string[]
    missed: string[]
  } | null
  revisionReceipt?: {
    status: 'ok' | 'warn'
    label: string
    scoreLabel: string
    closedCount: number
    totalCount: number
    riskCount: number
    evidence: string[]
    risks: string[]
  } | null
  deliveryRiskReceipt?: {
    status: 'ok' | 'warn'
    label: string
    scoreLabel: string
    closedCount: number
    totalCount: number
    riskCount: number
    evidence: string[]
    risks: string[]
  } | null
  sceneCardReceipt?: {
    status: 'ok' | 'warn'
    label: string
    riskCount: number
    evidence: string[]
    scenes: string[]
    fields: string[]
  } | null
  qualityAudit?: {
    status: 'ok' | 'warn'
    label: string
    riskCount: number
    evidence: string[]
    checks: string[]
    fixes: string[]
    strategies: string[]
  } | null
  platformRubric?: {
    status: 'ok' | 'warn'
    label: string
    scoreLabel: string
    rubric: string
    rubricSource: string
    passedCount: number
    totalCount: number
    missedCount: number
    missed: string[]
    evidence: string[]
  } | null
  approvalBlocker?: {
    type: 'quality_gate' | 'low_score' | 'draft' | 'safety' | 'reference_safety_blocked' | 'blocked_invalid'
    status: 'warn'
    label: string
    detail: string
    scoreLabel: string
    reasons: string[]
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
  secondaryActions?: Array<{ key: NovelDeliveryActionKey; label: string }>
}

export type NovelDeliverySummary = {
  visible: boolean
  tone: 'check' | 'revision' | 'sync' | 'warning' | 'ready'
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
  deslopGateDiagnostics: NovelDeliverySummaryInput['deslopGateDiagnostics']
  coreDrift: NovelDeliverySummaryInput['coreDrift']
  runwaySync: NovelDeliverySummaryInput['runwaySync']
  readerPayoffSync: NovelDeliverySummaryInput['readerPayoffSync']
  readerExpectationSync: NovelDeliverySummaryInput['readerExpectationSync']
  qualityAuditSync: NovelDeliverySummaryInput['qualityAuditSync']
  qualityAuditRepairReceiptSync: NovelDeliverySummaryInput['qualityAuditRepairReceiptSync']
  chapterHandoffSync: NovelDeliverySummaryInput['chapterHandoffSync']
  chapterHandoffDeltaSync: NovelDeliverySummaryInput['chapterHandoffDeltaSync']
  writePreparation: NovelDeliverySummaryInput['writePreparation']
  readerRetentionSync: NovelDeliverySummaryInput['readerRetentionSync']
  chapterAttraction: NovelDeliverySummaryInput['chapterAttraction']
  storyDriveSync: NovelDeliverySummaryInput['storyDriveSync']
  characterArcSync: NovelDeliverySummaryInput['characterArcSync']
  chapterBenchmarkSync: NovelDeliverySummaryInput['chapterBenchmarkSync']
  styleSampleSync: NovelDeliverySummaryInput['styleSampleSync']
  first30RetentionRecheck: NovelDeliverySummaryInput['first30RetentionRecheck']
  innovationSync: NovelDeliverySummaryInput['innovationSync']
  volumeBeatSync: NovelDeliverySummaryInput['volumeBeatSync']
  blueprintReceipt: NovelDeliverySummaryInput['blueprintReceipt']
  revisionReceipt: NovelDeliverySummaryInput['revisionReceipt']
  deliveryRiskReceipt: NovelDeliverySummaryInput['deliveryRiskReceipt']
  sceneCardReceipt: NovelDeliverySummaryInput['sceneCardReceipt']
  qualityAudit: NovelDeliverySummaryInput['qualityAudit']
  platformRubric: NovelDeliverySummaryInput['platformRubric']
  approvalBlocker: NovelDeliverySummaryInput['approvalBlocker']
  deliveryRiskQueue: NovelDeliverySummaryInput['deliveryRiskQueue']
  deliveryRiskConvergence: NovelDeliverySummaryInput['deliveryRiskConvergence']
  actionKey: NovelDeliveryActionKey | null
  actionLabel: string
  compactActionLabel: string
  secondaryActions: Array<{ key: NovelDeliveryActionKey; label: string }>
  storyStatePanel: NonNullable<NovelDeliverySummaryInput['storyStatePanel']> | null
  storyStateSyncAction: { key: NovelDeliveryActionKey; label: string } | null
}

export type NovelDraftBriefActionKey = 'metadata' | 'scene_cards' | 'build_brief' | 'confirm_brief' | 'generate'

export type NovelPreDraftBrief = {
  chapter_goal?: string
  reader_promise?: string
  core_conflict?: string
  emotional_curve?: string
  write_preparation_brief?: {
    version?: string
    readiness_status?: string
    source_gaps?: string[]
    asset_risks?: string[]
    delivery_risk_actions?: string[]
    blueprint_focus?: string[]
    reader_payoff_focus?: string[]
    must_confirm?: string[]
    execution_order?: string[]
  }
  platform_rubric?: {
    platform?: string
    label?: string
    source?: string
    checks?: string[]
    revision_priorities?: string[]
  }
  chapter_blueprint?: {
    version?: string
    platform_rubric?: {
      platform?: string
      label?: string
      source?: string
      checks?: string[]
      revision_priorities?: string[]
    }
    target_emotion?: string
    opening_hook?: string
    core_payoff?: string
    content_outline?: {
      cause?: string
      development?: string
      turn?: string
      climax?: string
      ending?: string
    }
    plot_lines?: {
      mainline?: string
      subplot?: string
      event_line?: string
      relationship_line?: string
      logic_line?: string
    }
    character_order?: string[]
    relationship_change?: string
    information_gap?: string
    beat_sequence?: Array<{
      scene_no?: number | null
      title?: string
      function_tag?: string
      required_payoff?: string
    }>
    cost_and_reward?: string
    ending_contract?: {
      final_image?: string
      next_chapter_pull?: string
    }
    writing_intent?: string
  }
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
    opening_actions?: string[]
    middle_actions?: string[]
    ending_actions?: string[]
    evidence?: string[]
  }
  governance_recheck_memory?: {
    source_run_id?: number | string | null
    status?: string
    label?: string
    summary?: string
    evidence?: string[]
    repaired_evidence?: string[]
    failed_evidence?: string[]
    watch_items?: string[]
    storyline_decision_task_count?: number | null
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
    blueprintVersion: string
    blueprintTargetEmotion: string
    blueprintOpeningHook: string
    blueprintCorePayoff: string
    blueprintOutline: string
    blueprintPlotLines: string
    blueprintCharacterOrder: string
    blueprintRelationshipChange: string
    blueprintInformationGap: string
    blueprintBeatSequence: string
    blueprintCostAndReward: string
    blueprintEndingContract: string
    blueprintWritingIntent: string
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
    writePreparationStatus: string
    writePreparationSourceGaps: string
    writePreparationAssetRisks: string
    writePreparationDeliveryActions: string
    writePreparationBlueprintFocus: string
    writePreparationReaderPayoff: string
    writePreparationMustConfirm: string
    writePreparationExecutionOrder: string
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
    deliveryRiskOpeningActions: string
    deliveryRiskMiddleActions: string
    deliveryRiskEndingActions: string
    deliveryRiskEvidence: string
    nextChapterQualityFocus: string
    nextChapterQualityOpening: string
    nextChapterQualityMiddle: string
    nextChapterQualityEnding: string
    nextChapterQualityAvoid: string
    nextChapterQualityEvidence: string
    governanceMemoryStatus: string
    governanceMemorySummary: string
    governanceMemoryEvidence: string
    governanceMemoryFailedEvidence: string
    governanceMemoryWatchItems: string
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


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


function asArray<T = any>(value: T | T[] | null | undefined): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function safeJsonStringify(value: any, maxChars = 1200) {
  const seen = new WeakSet<object>()
  const sanitize = (item: any, depth = 0): any => {
    if (item == null || typeof item !== 'object') return item
    if (seen.has(item)) return '[Circular]'
    if (depth >= 8) return '[MaxDepth]'
    seen.add(item)
    if (Array.isArray(item)) {
      const output = item.slice(0, 80).map(value => sanitize(value, depth + 1))
      seen.delete(item)
      return output
    }
    const output: Record<string, any> = {}
    for (const [key, nested] of Object.entries(item).slice(0, 80)) {
      output[key] = sanitize(nested, depth + 1)
    }
    seen.delete(item)
    return output
  }
  try {
    const text = JSON.stringify(sanitize(value))
    if (text === undefined) return 'null'
    return maxChars > 0 && text.length > maxChars ? text.slice(0, maxChars) : text
  } catch {
    return JSON.stringify(String(value ?? ''))
  }
}

function compactJsonBriefText(value: any, fallback = '') {
  if (typeof value === 'string') return compactBriefText(value, fallback)
  return compactBriefText(safeJsonStringify(value, 1200), fallback)
}

export function normalizePressureLevel(value: any) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return ''
  return Math.min(5, Math.max(1, Math.round(numeric)))
}

export function sceneBriefFromCard(card: any, index: number) {
  const spectatorInterestShift = compactBriefText(card?.spectator_interest_shift || card?.spectatorInterestShift)
  return {
    scene_no: Number(card?.scene_no || card?.sceneNo || index + 1),
    title: compactBriefText(card?.title, `场景${index + 1}`),
    goal: compactBriefText(card?.goal || card?.scene_goal || card?.sceneGoal),
    scene_goal: compactBriefText(card?.scene_goal || card?.sceneGoal || card?.goal),
    purpose: compactBriefText(card?.purpose || card?.beat),
    conflict: compactBriefText(card?.conflict),
    obstacle: compactBriefText(card?.obstacle),
    conflict_ladder_step: compactBriefText(card?.conflict_ladder_step || card?.conflictLadderStep),
    motivation_source: compactBriefText(card?.motivation_source || card?.motivationSource),
    opposing_force: compactBriefText(card?.opposing_force || card?.opposingForce),
    blocked_desire: compactBriefText(card?.blocked_desire || card?.blockedDesire),
    protagonist_agency_action: compactBriefText(card?.protagonist_agency_action || card?.protagonistAgencyAction),
    no_exit_reason: compactBriefText(card?.no_exit_reason || card?.noExitReason),
    event_value_change: compactBriefText(card?.event_value_change || card?.eventValueChange),
    next_conflict_seed: compactBriefText(card?.next_conflict_seed || card?.nextConflictSeed),
    visible_line_role: compactBriefText(card?.visible_line_role || card?.visibleLineRole),
    hidden_line_seed: compactBriefText(card?.hidden_line_seed || card?.hiddenLineSeed),
    ab_weave_role: compactBriefText(card?.ab_weave_role || card?.abWeaveRole),
    chapter_positioning: compactBriefText(card?.chapter_positioning || card?.chapterPositioning),
    pressure_level: normalizePressureLevel(card?.pressure_level || card?.pressureLevel),
    chapter_positioning_role: compactBriefText(card?.chapter_positioning_role || card?.chapterPositioningRole || card?.positioning_role || card?.positioningRole),
    benchmark_structure_coordinate: card?.benchmark_structure_coordinate || card?.benchmarkStructureCoordinate || null,
    opening_hook: compactBriefText(card?.opening_hook || card?.hook_opening),
    reader_payoff: compactBriefText(card?.reader_payoff || card?.payoff),
    fear_point: compactBriefText(card?.fear_point || card?.terror_point),
    rule_pressure: compactBriefText(card?.rule_pressure || card?.rule_trigger),
    information_gap: compactBriefText(card?.information_gap),
    reversal: compactBriefText(card?.reversal || card?.turning_point),
    ending_hook_seed: compactBriefText(card?.ending_hook_seed || card?.ending_hook || card?.exit_state),
    turning_point: compactBriefText(card?.turning_point || card?.turningPoint),
    exit_state: compactBriefText(card?.exit_state || card?.exitState),
    state_changes_expected: asArray(card?.state_changes_expected || card?.stateChangesExpected).map((item: any) => compactJsonBriefText(item)).filter(Boolean),
    word_budget: compactBriefText(card?.word_budget || card?.description_budget),
    serial_risk_repairs: asArray(card?.serial_risk_repairs || card?.serialRiskRepairs || card?.risk_repairs || card?.riskRepairs).map((item: any) => compactJsonBriefText(item)).filter(Boolean),
    recent_fatigue_action: compactBriefText(card?.recent_fatigue_action || card?.recentFatigueAction || card?.fatigue_repair_action || card?.fatigueRepairAction),
    character_voice: compactBriefText(card?.character_voice || card?.characterVoice || card?.voice_focus || card?.voiceFocus),
    dialogue_goals: asArray(card?.dialogue_goals || card?.dialogueGoals || card?.dialogue_contract_goals || card?.dialogueContractGoals).map((item: any) => compactBriefText(item)).filter(Boolean),
    style_directives: asArray(card?.style_directives || card?.styleDirectives || card?.style_boundary_directives || card?.styleBoundaryDirectives).map((item: any) => compactBriefText(item)).filter(Boolean),
    benchmark_recall_directives: asArray(card?.benchmark_recall_directives || card?.benchmarkRecallDirectives || card?.benchmark_directives || card?.benchmarkDirectives).map((item: any) => compactBriefText(item)).filter(Boolean),
    concept_anchor_rules: asArray(card?.concept_anchor_rules || card?.conceptAnchorRules || card?.new_concept_anchor_rules || card?.newConceptAnchorRules).map((item: any) => compactBriefText(item)).filter(Boolean),
    prose_craft_directives: asArray(card?.prose_craft_directives || card?.proseCraftDirectives || card?.prose_craft_rules || card?.proseCraftRules).map((item: any) => compactBriefText(item)).filter(Boolean),
    relationship_progression_plan: compactBriefText(card?.relationship_progression_plan || card?.relationshipProgressionPlan),
    relationship_buffer_zone: compactBriefText(card?.relationship_buffer_zone || card?.relationshipBufferZone),
    supporting_character_action: compactBriefText(card?.supporting_character_action || card?.supportingCharacterAction),
    attitude_shift_checkpoint: compactBriefText(card?.attitude_shift_checkpoint || card?.attitudeShiftCheckpoint),
    relationship_next_hook: compactBriefText(card?.relationship_next_hook || card?.relationshipNextHook),
    showoff_stage_chain: compactBriefText(card?.showoff_stage_chain || card?.showoffStageChain),
    spectator_interest_shift: spectatorInterestShift && !/这跟我有关系/.test(spectatorInterestShift)
      ? compactBriefText(`这跟我有关系：${spectatorInterestShift}`)
      : spectatorInterestShift,
    secondary_showoff_effect: compactBriefText(card?.secondary_showoff_effect || card?.secondaryShowoffEffect),
    combat_result_type: compactBriefText(card?.combat_result_type || card?.combatResultType),
    combat_dimension_plan: compactBriefText(card?.combat_dimension_plan || card?.combatDimensionPlan),
    combat_reversal_plan: compactBriefText(card?.combat_reversal_plan || card?.combatReversalPlan),
    emotional_tone: compactBriefText(card?.emotional_tone || card?.emotionalTone || card?.tone),
    emotional_arc_stage: compactBriefText(card?.emotional_arc_stage || card?.emotionalArcStage || card?.emotion_stage || card?.emotionStage),
    reader_emotion_goal: compactBriefText(card?.reader_emotion_goal || card?.readerEmotionGoal),
    reaction_structure: compactBriefText(card?.reaction_structure || card?.reactionStructure),
    expectation_bridge: compactBriefText(card?.expectation_bridge || card?.expectationBridge),
    key_dialogue: compactBriefText(card?.key_dialogue || card?.keyDialogue || card?.dialogue_focus || card?.dialogueFocus),
    dialogue_goal: compactBriefText(card?.dialogue_goal || card?.dialogueGoal),
  }
}

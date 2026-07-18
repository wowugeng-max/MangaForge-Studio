import type {
  NovelDraftBriefActionKey,
  NovelDraftBriefSummary,
  NovelPreDraftBrief,
} from './writing-recommendation-types'

function snakeCaseKey(key: string) {
  return String(key || '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/-/g, '_').toLowerCase()
}

function normalizeBriefKeys<T = any>(value: T): T {
  if (Array.isArray(value)) return value.map(item => normalizeBriefKeys(item)) as T
  if (!value || typeof value !== 'object') return value
  const result: Record<string, any> = {}
  Object.entries(value as Record<string, any>).forEach(([key, rawValue]) => {
    const normalizedValue = normalizeBriefKeys(rawValue)
    result[key] = normalizedValue
    const snakeKey = snakeCaseKey(key)
    if (!(snakeKey in result)) result[snakeKey] = normalizedValue
  })
  return result as T
}

export function buildNovelDraftBriefSummary({
  activeWordCount,
  chapterGoal,
  conflict,
  endingHook,
  sceneCardCount,
  preDraftBrief: rawPreDraftBrief,
}: {
  activeWordCount: number
  chapterGoal?: string | null
  conflict?: string | null
  endingHook?: string | null
  sceneCardCount: number
  preDraftBrief?: NovelPreDraftBrief | null
}): NovelDraftBriefSummary {
  const preDraftBrief = rawPreDraftBrief ? normalizeBriefKeys<NovelPreDraftBrief>(rawPreDraftBrief) : null
  const expectationListText = (items?: Array<{ text?: string; label?: string }>) => Array.isArray(items)
    ? items.map(item => item?.text || item?.label).filter(Boolean).join('、')
    : ''
  const textList = (items?: any[]) => Array.isArray(items)
    ? items.map(item => {
      if (typeof item === 'string') return item.trim()
      return String(item?.text || item?.label || item?.summary || item?.detail || item?.title || item?.name || '').trim()
    }).filter(Boolean).join('、')
    : ''
  const textValueOrList = (value: any) => Array.isArray(value) ? textList(value) : String(value || '').trim()
  const labeledText = (label: string, value?: string | null) => {
    const text = String(value || '').trim()
    return text ? `${label}：${text}` : ''
  }
  const chapterBlueprint = preDraftBrief?.chapter_blueprint || null
  const nextChapterQualityPlan = preDraftBrief?.next_chapter_quality_plan
    || preDraftBrief?.oh_story_delivery_receipts?.next_chapter_quality_plan
    || null
  const writePreparationBrief = preDraftBrief?.write_preparation_brief || null
  const platformRubric = preDraftBrief?.platform_rubric || chapterBlueprint?.platform_rubric || null
  const blueprintOutlineText = chapterBlueprint?.content_outline
    ? [
      labeledText('起因', chapterBlueprint.content_outline.cause),
      labeledText('发展', chapterBlueprint.content_outline.development),
      labeledText('转折', chapterBlueprint.content_outline.turn),
      labeledText('高潮', chapterBlueprint.content_outline.climax),
      labeledText('收束', chapterBlueprint.content_outline.ending),
    ].filter(Boolean).join('；')
    : ''
  const blueprintPlotLinesText = chapterBlueprint?.plot_lines
    ? [
      labeledText('主线', chapterBlueprint.plot_lines.mainline),
      labeledText('副线', chapterBlueprint.plot_lines.subplot),
      labeledText('事件线', chapterBlueprint.plot_lines.event_line),
      labeledText('关系线', chapterBlueprint.plot_lines.relationship_line),
      labeledText('逻辑线', chapterBlueprint.plot_lines.logic_line),
    ].filter(Boolean).join('；')
    : ''
  const blueprintBeatSequenceText = Array.isArray(chapterBlueprint?.beat_sequence)
    ? chapterBlueprint.beat_sequence.map((beat, index) => [
      `场景${beat?.scene_no || index + 1}`,
      beat?.title ? ` ${beat.title}` : '',
      beat?.function_tag ? `：${beat.function_tag}` : '',
      beat?.required_payoff ? `，回报：${beat.required_payoff}` : '',
    ].join('').trim()).filter(Boolean).join('；')
    : ''
  const blueprintEndingContractText = chapterBlueprint?.ending_contract
    ? [
      labeledText('终幕', chapterBlueprint.ending_contract.final_image),
      labeledText('下章拉力', chapterBlueprint.ending_contract.next_chapter_pull),
    ].filter(Boolean).join('；')
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
    blueprintVersion: chapterBlueprint?.version?.trim() || '',
    blueprintTargetEmotion: chapterBlueprint?.target_emotion?.trim() || '',
    blueprintOpeningHook: chapterBlueprint?.opening_hook?.trim() || '',
    blueprintCorePayoff: chapterBlueprint?.core_payoff?.trim() || '',
    blueprintOutline: blueprintOutlineText,
    blueprintPlotLines: blueprintPlotLinesText,
    blueprintCharacterOrder: Array.isArray(chapterBlueprint?.character_order) ? chapterBlueprint.character_order.filter(Boolean).join('、') : '',
    blueprintRelationshipChange: chapterBlueprint?.relationship_change?.trim() || '',
    blueprintInformationGap: chapterBlueprint?.information_gap?.trim() || '',
    blueprintBeatSequence: blueprintBeatSequenceText,
    blueprintCostAndReward: chapterBlueprint?.cost_and_reward?.trim() || '',
    blueprintEndingContract: blueprintEndingContractText,
    blueprintWritingIntent: chapterBlueprint?.writing_intent?.trim() || '',
    platformRubricLabel: platformRubric?.label?.trim() || platformRubric?.platform?.trim() || '',
    platformRubricSource: platformRubric?.source?.trim() || '',
    platformRubricChecks: textList(platformRubric?.checks),
    platformRubricPriorities: textList(platformRubric?.revision_priorities),
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
    writePreparationStatus: writePreparationBrief?.readiness_status?.trim() || '',
    writePreparationSourceGaps: Array.isArray(writePreparationBrief?.source_gaps) ? writePreparationBrief.source_gaps.filter(Boolean).join('、') : '',
    writePreparationAssetRisks: Array.isArray(writePreparationBrief?.asset_risks) ? writePreparationBrief.asset_risks.filter(Boolean).join('、') : '',
    writePreparationDeliveryActions: Array.isArray(writePreparationBrief?.delivery_risk_actions) ? writePreparationBrief.delivery_risk_actions.filter(Boolean).join('、') : '',
    writePreparationBlueprintFocus: Array.isArray(writePreparationBrief?.blueprint_focus) ? writePreparationBrief.blueprint_focus.filter(Boolean).join('、') : '',
    writePreparationReaderPayoff: Array.isArray(writePreparationBrief?.reader_payoff_focus) ? writePreparationBrief.reader_payoff_focus.filter(Boolean).join('、') : '',
    writePreparationMustConfirm: Array.isArray(writePreparationBrief?.must_confirm) ? writePreparationBrief.must_confirm.filter(Boolean).join('、') : '',
    writePreparationExecutionOrder: Array.isArray(writePreparationBrief?.execution_order) ? writePreparationBrief.execution_order.filter(Boolean).join('、') : '',
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
    deliveryRiskOpeningActions: Array.isArray(preDraftBrief?.delivery_risk_carry_over?.opening_actions) ? preDraftBrief.delivery_risk_carry_over.opening_actions.filter(Boolean).join('、') : '',
    deliveryRiskMiddleActions: Array.isArray(preDraftBrief?.delivery_risk_carry_over?.middle_actions) ? preDraftBrief.delivery_risk_carry_over.middle_actions.filter(Boolean).join('、') : '',
    deliveryRiskEndingActions: Array.isArray(preDraftBrief?.delivery_risk_carry_over?.ending_actions) ? preDraftBrief.delivery_risk_carry_over.ending_actions.filter(Boolean).join('、') : '',
    deliveryRiskEvidence: Array.isArray(preDraftBrief?.delivery_risk_carry_over?.evidence) ? preDraftBrief.delivery_risk_carry_over.evidence.filter(Boolean).join('、') : '',
    nextChapterQualityFocus: textValueOrList(nextChapterQualityPlan?.quality_focus),
    nextChapterQualityOpening: textValueOrList(nextChapterQualityPlan?.opening_actions),
    nextChapterQualityMiddle: textValueOrList(nextChapterQualityPlan?.middle_actions),
    nextChapterQualityEnding: textValueOrList(nextChapterQualityPlan?.ending_actions),
    nextChapterQualityAvoid: textValueOrList(nextChapterQualityPlan?.avoid_repetition),
    nextChapterQualityEvidence: textValueOrList(nextChapterQualityPlan?.evidence_basis),
    governanceMemoryStatus: [
      preDraftBrief?.governance_recheck_memory?.label?.trim(),
      preDraftBrief?.governance_recheck_memory?.source_run_id ? `#${preDraftBrief.governance_recheck_memory.source_run_id}` : '',
    ].filter(Boolean).join(' · '),
    governanceMemorySummary: preDraftBrief?.governance_recheck_memory?.summary?.trim() || '',
    governanceMemoryEvidence: textList([
      ...(preDraftBrief?.governance_recheck_memory?.evidence || []),
      ...(preDraftBrief?.governance_recheck_memory?.repaired_evidence || []),
    ]),
    governanceMemoryFailedEvidence: textList(preDraftBrief?.governance_recheck_memory?.failed_evidence),
    governanceMemoryWatchItems: textList(preDraftBrief?.governance_recheck_memory?.watch_items),
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


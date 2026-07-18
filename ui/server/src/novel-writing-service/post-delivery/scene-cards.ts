import { asArray } from '../../routes/novel-route-utils'
import { normalizePressureLevel } from '../../novel-writing/scene-briefs'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'

type AnyFn = (...args: any[]) => any

let compactJsonBriefText: AnyFn = (value: any, fallback = '') => {
  if (typeof value === 'string') return compactBriefText(value, fallback)
  try {
    const text = JSON.stringify(value)
    return compactBriefText(text, fallback)
  } catch {
    return compactBriefText(fallback, fallback)
  }
}
let applyStyleFingerprintToSceneCards: AnyFn = (sceneCards: any[] = []) => asArray(sceneCards)
let applyExplicitNewConceptAnchorsToSceneCards: AnyFn = (sceneCards: any[] = []) => asArray(sceneCards)
let applyIntentDialogueBaselineToSceneCards: AnyFn = (sceneCards: any[] = []) => asArray(sceneCards)
let applyDeliveryRiskCarryOverToSceneCards: AnyFn = (sceneCards: any[] = []) => asArray(sceneCards)

export function bindSceneCardsNormalizerDeps(deps: {
  compactJsonBriefText?: AnyFn
  applyStyleFingerprintToSceneCards?: AnyFn
  applyExplicitNewConceptAnchorsToSceneCards?: AnyFn
  applyIntentDialogueBaselineToSceneCards?: AnyFn
  applyDeliveryRiskCarryOverToSceneCards?: AnyFn
} = {}) {
  if (deps.compactJsonBriefText) compactJsonBriefText = deps.compactJsonBriefText
  if (deps.applyStyleFingerprintToSceneCards) applyStyleFingerprintToSceneCards = deps.applyStyleFingerprintToSceneCards
  if (deps.applyExplicitNewConceptAnchorsToSceneCards) applyExplicitNewConceptAnchorsToSceneCards = deps.applyExplicitNewConceptAnchorsToSceneCards
  if (deps.applyIntentDialogueBaselineToSceneCards) applyIntentDialogueBaselineToSceneCards = deps.applyIntentDialogueBaselineToSceneCards
  if (deps.applyDeliveryRiskCarryOverToSceneCards) applyDeliveryRiskCarryOverToSceneCards = deps.applyDeliveryRiskCarryOverToSceneCards
}

function isSceneCardCoreDiagnosticNoiseSegment(value: any, options: any = {}) {
  const text = compactBriefText(value)
  if (!text) return true
  if (options.allowNextChapterTask && /^下一章必须/.test(text)) return false
  if (/^(?:确认)?同步风险[^：:]{0,40}[：:]/i.test(text)) return true
  if (/^(?:确认)?(?:吸引力(?:开篇|中段|章尾)?修复|质量(?:诊断|专项)(?:开篇|中段|章尾)?修复|平台(?:规则|指标)(?:开篇|中段|章尾)?修复|内容(?:规则|指标)(?:开篇|中段|章尾)?修复)\s*[：:]/i.test(text)) return true
  if (/^(换地图承接|章末追读|开篇钩子|吸引力开篇修复|下一次修订|复核承接|已存回执|模型自检|缺少|补齐建议)\s*[：:]/i.test(text)) return true
  if (/^(?:不要重写|不要重排|只处理本章计划触达)/.test(text)) return true
  if (/^修复\s*[：:].*(?:不要重写|不要重排|只处理本章计划触达|下一次修订或状态更新)/.test(text)) return true
  if (/^本章目标\s*[：:]/.test(text) && /未充分兑现|缺口|下一次修订|长期追读|reader_fuel|four_question/i.test(text)) return true
  if (/(^|[\s：:；;])([a-z]+(?:_[a-z]+)*(?:_sync|_syn\.{3}|_de\.{3}))(\b|[\s：:；;]|$)/i.test(text)) return true
  if (/\b(missed|next_actions|reader_fuel_missed|four_question_missed|delivery_risk_receipts|revision_receipts)\b/i.test(text)) return true
  if (/下一次修订|不服务长期追读|只完成事件但不服务/.test(text)) return true
  return false
}

function hasSceneCardCoreDiagnosticNoise(value: string) {
  return /同步风险|确认同步风险|换地图承接|章末追读|开篇钩子|吸引力(?:开篇|中段|章尾)?修复|质量(?:诊断|专项)(?:开篇|中段|章尾)?修复|平台(?:规则|指标)(?:开篇|中段|章尾)?修复|内容(?:规则|指标)(?:开篇|中段|章尾)?修复|下一次修订|复核承接|已存回执|模型自检|补齐建议|(?:不要重写|不要重排|只处理本章计划触达)|修复\s*[：:].*(?:不要重写|不要重排|只处理本章计划触达|下一次修订或状态更新)|[a-z]+(?:_[a-z]+)*(?:_sync|_syn\.{3}|_de\.{3})|\b(missed|next_actions|reader_fuel_missed|four_question_missed|delivery_risk_receipts|revision_receipts)\b|不服务长期追读|只完成事件但不服务/i.test(value)
}

function isSceneCardDiagnosticResidueSegment(value: any) {
  const text = compactBriefText(value)
  if (!text) return true
  if (/^[\u4e00-\u9fa5A-Za-z0-9·]{1,16}\s*[：:]\s*(?:主角|男主|女主|反派|配角|主要配角|次要配角|龙套|工具人|幕后黑手|盟友|敌人)\s*[。.]?$/.test(text)) return true
  if (/^[^：:]{1,24}\s*[：:].*(?:彻底蚕食|真身降临|转化为.+世界的一部分|通过不断降临|实现真身|蓝星人类的理智)/.test(text)) return true
  return false
}

function normalizeSceneCardCoreDramaText(value: any, limit = 220, options: any = {}) {
  const raw = compactBriefText(value)
  if (!raw) return ''
  if (!hasSceneCardCoreDiagnosticNoise(raw)) {
    return raw.length > limit ? raw.slice(0, limit) : raw
  }
  const segments = raw
    .split(/[；;]\s*/)
    .map(segment => compactBriefText(segment))
    .filter(Boolean)
    .filter(segment => !isSceneCardCoreDiagnosticNoiseSegment(segment, options))
    .filter(segment => !isSceneCardDiagnosticResidueSegment(segment))
  const text = compactBriefText(segments.join('；'))
  return text.length > limit ? text.slice(0, limit) : text
}

function normalizeSceneCardDramaTextList(value: any, limit = 220, maxItems = 8, options: any = {}) {
  return uniqueBriefStrings(
    asArray(value)
      .map((item: any) => normalizeSceneCardCoreDramaText(item, limit, options))
      .filter(Boolean),
    maxItems,
  )
}

function normalizeSceneCardPurposeTag(value: any) {
  const text = normalizeSceneCardCoreDramaText(value, 32)
  if (!text) return ''
  if (hasSceneCardCoreDiagnosticNoise(text)) return ''
  if (/[。；;]|[：:].{8,}/.test(text)) return ''
  return text.length > 16 ? '' : text
}

function normalizeSceneCardPurposeTags(card: any) {
  return uniqueBriefStrings(
    [
      ...asArray(card?.purpose_tags || card?.purposeTags),
      card?.purpose_tag || card?.purposeTag,
    ]
      .map((item: any) => normalizeSceneCardPurposeTag(item))
      .filter(Boolean),
    6,
  )
}

function normalizeSceneCardCleanStringList(value: any, limit = 180, maxItems = 8, options: any = {}) {
  return uniqueBriefStrings(
    asArray(value)
      .map((item: any) => {
        const raw = compactJsonBriefText(item)
        if (!raw) return ''
        if (options.dropNoisyItems && hasSceneCardCoreDiagnosticNoise(raw)) return ''
        return normalizeSceneCardCoreDramaText(raw, limit, options)
      })
      .filter(Boolean),
    maxItems,
  )
}

function sanitizeSceneCardCoreDramaFields(card: any) {
  const purposeTags = normalizeSceneCardPurposeTags(card)
  return {
    ...card,
    purpose_tag: purposeTags[0] || '',
    purpose_tags: purposeTags,
    goal: normalizeSceneCardCoreDramaText(card?.goal, 160),
    scene_goal: normalizeSceneCardCoreDramaText(card?.scene_goal, 160),
    purpose: normalizeSceneCardCoreDramaText(card?.purpose, 180),
    conflict: normalizeSceneCardCoreDramaText(card?.conflict, 220),
    obstacle: normalizeSceneCardCoreDramaText(card?.obstacle, 220),
    conflict_ladder_step: normalizeSceneCardCoreDramaText(card?.conflict_ladder_step || card?.conflictLadderStep, 180),
    motivation_source: normalizeSceneCardCoreDramaText(card?.motivation_source || card?.motivationSource, 180),
    opposing_force: normalizeSceneCardCoreDramaText(card?.opposing_force, 220),
    blocked_desire: normalizeSceneCardCoreDramaText(card?.blocked_desire, 180),
    protagonist_agency_action: normalizeSceneCardCoreDramaText(card?.protagonist_agency_action, 220),
    no_exit_reason: normalizeSceneCardCoreDramaText(card?.no_exit_reason, 220),
    event_value_change: normalizeSceneCardCoreDramaText(card?.event_value_change, 220),
    reader_payoff: normalizeSceneCardCoreDramaText(card?.reader_payoff, 220, { allowNextChapterTask: true }),
    turning_point: normalizeSceneCardCoreDramaText(card?.turning_point, 220),
    exit_state: normalizeSceneCardCoreDramaText(card?.exit_state, 220),
    next_conflict_seed: normalizeSceneCardCoreDramaText(card?.next_conflict_seed, 180),
    visible_line_role: normalizeSceneCardCoreDramaText(card?.visible_line_role, 180),
    hidden_line_seed: normalizeSceneCardCoreDramaText(card?.hidden_line_seed, 180),
    ab_weave_role: normalizeSceneCardCoreDramaText(card?.ab_weave_role, 180),
    opening_hook: normalizeSceneCardCoreDramaText(card?.opening_hook || card?.openingHook, 180),
    beat: normalizeSceneCardCoreDramaText(card?.beat, 220),
    fear_point: normalizeSceneCardCoreDramaText(card?.fear_point || card?.fearPoint, 180),
    rule_pressure: normalizeSceneCardCoreDramaText(card?.rule_pressure || card?.rulePressure, 180),
    information_gap: normalizeSceneCardCoreDramaText(card?.information_gap || card?.informationGap, 220),
    reversal: normalizeSceneCardCoreDramaText(card?.reversal, 180),
    ending_hook_seed: normalizeSceneCardCoreDramaText(card?.ending_hook_seed || card?.endingHookSeed || card?.ending_hook || card?.endingHook, 420, { allowNextChapterTask: true }),
    character_voice: normalizeSceneCardCoreDramaText(card?.character_voice || card?.characterVoice, 180),
    dialogue_goals: normalizeSceneCardCleanStringList(card?.dialogue_goals || card?.dialogueGoals, 260, 8, { allowNextChapterTask: true }),
    style_directives: normalizeSceneCardCleanStringList(card?.style_directives || card?.styleDirectives, 420, 8, { allowNextChapterTask: true }),
    benchmark_recall_directives: normalizeSceneCardCleanStringList(card?.benchmark_recall_directives || card?.benchmarkRecallDirectives, 420, 8, { allowNextChapterTask: true }),
    concept_anchor_rules: normalizeSceneCardCleanStringList(card?.concept_anchor_rules || card?.conceptAnchorRules, 420, 8, { allowNextChapterTask: true }),
    prose_craft_directives: normalizeSceneCardCleanStringList(card?.prose_craft_directives || card?.proseCraftDirectives, 420, 8, { allowNextChapterTask: true }),
    sensory_anchor: normalizeSceneCardCoreDramaText(card?.sensory_anchor || card?.sensoryAnchor, 180),
    recent_fatigue_action: normalizeSceneCardCoreDramaText(card?.recent_fatigue_action || card?.recentFatigueAction, 220),
    relationship_progression_plan: normalizeSceneCardCoreDramaText(card?.relationship_progression_plan || card?.relationshipProgressionPlan, 240),
    relationship_buffer_zone: normalizeSceneCardCoreDramaText(card?.relationship_buffer_zone || card?.relationshipBufferZone, 220),
    supporting_character_action: normalizeSceneCardCoreDramaText(card?.supporting_character_action || card?.supportingCharacterAction, 220),
    attitude_shift_checkpoint: normalizeSceneCardCoreDramaText(card?.attitude_shift_checkpoint || card?.attitudeShiftCheckpoint, 180),
    relationship_next_hook: normalizeSceneCardCoreDramaText(card?.relationship_next_hook || card?.relationshipNextHook, 220, { allowNextChapterTask: true }),
    showoff_stage_chain: normalizeSceneCardCoreDramaText(card?.showoff_stage_chain || card?.showoffStageChain, 220),
    spectator_interest_shift: normalizeSceneCardCoreDramaText(card?.spectator_interest_shift || card?.spectatorInterestShift, 220),
    secondary_showoff_effect: normalizeSceneCardCoreDramaText(card?.secondary_showoff_effect || card?.secondaryShowoffEffect, 220),
    combat_result_type: normalizeSceneCardCoreDramaText(card?.combat_result_type || card?.combatResultType, 120),
    combat_dimension_plan: normalizeSceneCardCoreDramaText(card?.combat_dimension_plan || card?.combatDimensionPlan, 220),
    combat_reversal_plan: normalizeSceneCardCoreDramaText(card?.combat_reversal_plan || card?.combatReversalPlan, 220),
    emotional_tone: normalizeSceneCardCoreDramaText(card?.emotional_tone || card?.emotionalTone || card?.tone, 180),
    emotional_arc_stage: normalizeSceneCardCoreDramaText(card?.emotional_arc_stage || card?.emotionalArcStage, 120),
    reader_emotion_goal: normalizeSceneCardCoreDramaText(card?.reader_emotion_goal || card?.readerEmotionGoal, 180),
    reaction_structure: normalizeSceneCardCoreDramaText(card?.reaction_structure || card?.reactionStructure, 220),
    expectation_bridge: normalizeSceneCardCoreDramaText(card?.expectation_bridge || card?.expectationBridge, 180),
    key_dialogue: normalizeSceneCardCoreDramaText(card?.key_dialogue || card?.keyDialogue, 180),
    dialogue_goal: normalizeSceneCardCoreDramaText(card?.dialogue_goal || card?.dialogueGoal, 160),
    transition_from_previous: normalizeSceneCardCoreDramaText(card?.transition_from_previous || card?.transitionFromPrevious, 220),
    used_settings: normalizeSceneCardCleanStringList(card?.used_settings || card?.usedSettings, 360, 8, { dropNoisyItems: true }),
    revealed_settings: normalizeSceneCardCleanStringList(card?.revealed_settings || card?.revealedSettings, 360, 8, { dropNoisyItems: true }),
    forbidden_settings: normalizeSceneCardCleanStringList(card?.forbidden_settings || card?.forbiddenSettings, 220, 8, { dropNoisyItems: true }),
    ability_beats: normalizeSceneCardCleanStringList(card?.ability_beats || card?.abilityBeats, 180, 8, { dropNoisyItems: true }),
    item_beats: normalizeSceneCardCleanStringList(card?.item_beats || card?.itemBeats, 180, 8, { dropNoisyItems: true }),
    boss_move: normalizeSceneCardCoreDramaText(card?.boss_move || card?.bossMove, 180),
    rule_trigger: normalizeSceneCardCoreDramaText(card?.rule_trigger || card?.ruleTrigger, 180),
    state_changes_expected: normalizeSceneCardDramaTextList(card?.state_changes_expected || card?.stateChangesExpected, 220, 8, { allowNextChapterTask: true }),
  }
}

export function normalizeSceneCardsPayload(payload: any, contextPackage: any = {}) {
  const directCards = Array.isArray(payload?.scene_cards)
    ? payload.scene_cards
    : Array.isArray(payload?.sceneCards)
      ? payload.sceneCards
      : Array.isArray(payload?.scenes)
        ? payload.scenes
        : []
  const targetNo = Number(contextPackage?.chapter_target?.chapter_no || 0)
  const outlineCards = directCards.length
    ? []
    : asArray(payload?.chapter_outlines)
      .filter((outline: any) => {
        const outlineNo = Number(outline?.chapter_no || outline?.chapter_number || outline?.no || 0)
        return targetNo ? outlineNo === targetNo : true
      })
      .map((outline: any, index: number) => ({
        scene_no: index + 1,
        title: outline?.title || contextPackage?.chapter_target?.title || `场景${index + 1}`,
        scene_type: outline?.scene_type || 'investigation',
        location: outline?.location || '',
        characters_present: asArray(outline?.characters_present || outline?.characters),
        purpose_tag: outline?.purpose_tag || outline?.purposeTag || '',
        purpose_tags: asArray(outline?.purpose_tags || outline?.purposeTags || outline?.purpose_tag || outline?.purposeTag),
        purpose: outline?.purpose || outline?.summary || outline?.chapter_goal || contextPackage?.chapter_target?.summary || '',
        conflict: outline?.conflict || contextPackage?.chapter_target?.conflict || '',
        conflict_ladder_step: outline?.conflict_ladder_step || outline?.conflictLadderStep || '',
        motivation_source: outline?.motivation_source || outline?.motivationSource || '',
        opposing_force: outline?.opposing_force || outline?.opposingForce || '',
        blocked_desire: outline?.blocked_desire || outline?.blockedDesire || '',
        protagonist_agency_action: outline?.protagonist_agency_action || outline?.protagonistAgencyAction || '',
        no_exit_reason: outline?.no_exit_reason || outline?.noExitReason || '',
        event_value_change: outline?.event_value_change || outline?.eventValueChange || '',
        next_conflict_seed: outline?.next_conflict_seed || outline?.nextConflictSeed || '',
        visible_line_role: outline?.visible_line_role || outline?.visibleLineRole || '',
        hidden_line_seed: outline?.hidden_line_seed || outline?.hiddenLineSeed || '',
        ab_weave_role: outline?.ab_weave_role || outline?.abWeaveRole || '',
        chapter_positioning: outline?.chapter_positioning || outline?.chapterPositioning || contextPackage?.chapter_target?.chapter_positioning || contextPackage?.chapter_target?.chapterPositioning || '',
        pressure_level: outline?.pressure_level || outline?.pressureLevel || contextPackage?.chapter_target?.pressure_level || contextPackage?.chapter_target?.pressureLevel || '',
        chapter_positioning_role: outline?.chapter_positioning_role || outline?.chapterPositioningRole || '',
        benchmark_structure_coordinate: outline?.benchmark_structure_coordinate || outline?.benchmarkStructureCoordinate || contextPackage?.chapter_target?.benchmark_structure_coordinate || contextPackage?.chapter_target?.benchmarkStructureCoordinate || null,
        required_beats: asArray(outline?.required_beats || outline?.beats).length
          ? asArray(outline?.required_beats || outline?.beats)
          : [outline?.summary, outline?.conflict, outline?.ending_hook].filter(Boolean),
        beat: outline?.beat || outline?.summary || '',
        opening_hook: outline?.opening_hook || outline?.hook || '',
        reader_payoff: outline?.reader_payoff || outline?.payoff || '',
        fear_point: outline?.fear_point || '',
        rule_pressure: outline?.rule_pressure || outline?.rule_trigger || '',
        information_gap: outline?.information_gap || '',
        reversal: outline?.reversal || outline?.turning_point || '',
        ending_hook_seed: outline?.ending_hook_seed || outline?.ending_hook || '',
        character_voice: outline?.character_voice || '',
        showoff_stage_chain: outline?.showoff_stage_chain || outline?.showoffStageChain || '',
        spectator_interest_shift: outline?.spectator_interest_shift || outline?.spectatorInterestShift || '',
        secondary_showoff_effect: outline?.secondary_showoff_effect || outline?.secondaryShowoffEffect || '',
        combat_result_type: outline?.combat_result_type || outline?.combatResultType || '',
        combat_dimension_plan: outline?.combat_dimension_plan || outline?.combatDimensionPlan || '',
        combat_reversal_plan: outline?.combat_reversal_plan || outline?.combatReversalPlan || '',
        sensory_anchor: outline?.sensory_anchor || outline?.sensoryAnchor || '',
        serial_risk_repairs: asArray(outline?.serial_risk_repairs || outline?.serialRiskRepairs || outline?.risk_repairs || outline?.riskRepairs),
        recent_fatigue_action: outline?.recent_fatigue_action || outline?.recentFatigueAction || outline?.fatigue_repair_action || outline?.fatigueRepairAction || '',
        turning_point: outline?.turning_point || outline?.ending_hook || '',
        exit_state: outline?.exit_state || outline?.ending_hook || '',
      }))
  const cards = directCards.length ? directCards : outlineCards
  const normalizedCards = cards.map((card: any, index: number) => sanitizeSceneCardCoreDramaFields({
    scene_no: Number(card?.scene_no || card?.sceneNo || index + 1),
    title: String(card?.title || `场景${index + 1}`),
    scene_type: String(card?.scene_type || card?.sceneType || card?.type || ''),
    location: String(card?.location || ''),
    characters_present: asArray(card?.characters_present || card?.charactersPresent).map((item: any) => String(item)).filter(Boolean),
    purpose_tag: String(card?.purpose_tag || card?.purposeTag || asArray(card?.purpose_tags || card?.purposeTags)[0] || ''),
    purpose_tags: asArray(card?.purpose_tags || card?.purposeTags || card?.purpose_tag || card?.purposeTag).map((item: any) => String(item)).filter(Boolean),
    goal: String(card?.goal || card?.scene_goal || card?.sceneGoal || ''),
    scene_goal: String(card?.scene_goal || card?.sceneGoal || card?.goal || ''),
    purpose: String(card?.purpose || ''),
    conflict: String(card?.conflict || ''),
    obstacle: String(card?.obstacle || ''),
    conflict_ladder_step: String(card?.conflict_ladder_step || card?.conflictLadderStep || ''),
    motivation_source: String(card?.motivation_source || card?.motivationSource || ''),
    opposing_force: String(card?.opposing_force || card?.opposingForce || ''),
    blocked_desire: String(card?.blocked_desire || card?.blockedDesire || ''),
    protagonist_agency_action: String(card?.protagonist_agency_action || card?.protagonistAgencyAction || ''),
    no_exit_reason: String(card?.no_exit_reason || card?.noExitReason || ''),
    event_value_change: String(card?.event_value_change || card?.eventValueChange || ''),
    next_conflict_seed: String(card?.next_conflict_seed || card?.nextConflictSeed || ''),
    visible_line_role: String(card?.visible_line_role || card?.visibleLineRole || ''),
    hidden_line_seed: String(card?.hidden_line_seed || card?.hiddenLineSeed || ''),
    ab_weave_role: String(card?.ab_weave_role || card?.abWeaveRole || ''),
    chapter_positioning: String(card?.chapter_positioning || card?.chapterPositioning || contextPackage?.chapter_target?.chapter_positioning || contextPackage?.chapter_target?.chapterPositioning || ''),
    pressure_level: normalizePressureLevel(card?.pressure_level || card?.pressureLevel || contextPackage?.chapter_target?.pressure_level || contextPackage?.chapter_target?.pressureLevel || ''),
    chapter_positioning_role: String(card?.chapter_positioning_role || card?.chapterPositioningRole || card?.positioning_role || card?.positioningRole || ''),
    benchmark_structure_coordinate: card?.benchmark_structure_coordinate || card?.benchmarkStructureCoordinate || contextPackage?.chapter_target?.benchmark_structure_coordinate || contextPackage?.chapter_target?.benchmarkStructureCoordinate || null,
    required_beats: asArray(card?.required_beats || card?.requiredBeats || card?.beats).map((item: any) => String(item)).filter(Boolean),
    action_beats: asArray(card?.action_beats || card?.actionBeats || card?.combat_beats || card?.combatBeats).map((item: any) => String(item)).filter(Boolean),
    beat: String(card?.beat || card?.action || card?.description || ''),
    opening_hook: String(card?.opening_hook || card?.openingHook || card?.hook_opening || card?.hookOpening || ''),
    reader_payoff: String(card?.reader_payoff || card?.readerPayoff || card?.payoff || ''),
    fear_point: String(card?.fear_point || card?.fearPoint || card?.terror_point || card?.terrorPoint || ''),
    rule_pressure: String(card?.rule_pressure || card?.rulePressure || card?.rule_trigger || card?.ruleTrigger || ''),
    information_gap: String(card?.information_gap || card?.informationGap || card?.mystery_gap || card?.mysteryGap || ''),
    reversal: String(card?.reversal || card?.twist || ''),
    ending_hook_seed: String(card?.ending_hook_seed || card?.endingHookSeed || card?.ending_hook || card?.endingHook || ''),
    character_voice: String(card?.character_voice || card?.characterVoice || card?.voice_focus || card?.voiceFocus || ''),
    dialogue_goals: asArray(card?.dialogue_goals || card?.dialogueGoals || card?.dialogue_contract_goals || card?.dialogueContractGoals).map((item: any) => String(item)).filter(Boolean),
    style_directives: asArray(card?.style_directives || card?.styleDirectives || card?.style_boundary_directives || card?.styleBoundaryDirectives).map((item: any) => String(item)).filter(Boolean),
    benchmark_recall_directives: asArray(card?.benchmark_recall_directives || card?.benchmarkRecallDirectives || card?.benchmark_directives || card?.benchmarkDirectives).map((item: any) => String(item)).filter(Boolean),
    concept_anchor_rules: asArray(card?.concept_anchor_rules || card?.conceptAnchorRules || card?.new_concept_anchor_rules || card?.newConceptAnchorRules).map((item: any) => String(item)).filter(Boolean),
    prose_craft_directives: asArray(card?.prose_craft_directives || card?.proseCraftDirectives || card?.prose_craft_rules || card?.proseCraftRules).map((item: any) => String(item)).filter(Boolean),
    sensory_anchor: String(card?.sensory_anchor || card?.sensoryAnchor || ''),
    serial_risk_repairs: asArray(card?.serial_risk_repairs || card?.serialRiskRepairs || card?.risk_repairs || card?.riskRepairs).map((item: any) => compactJsonBriefText(item)).filter(Boolean),
    recent_fatigue_action: String(card?.recent_fatigue_action || card?.recentFatigueAction || card?.fatigue_repair_action || card?.fatigueRepairAction || ''),
    relationship_progression_plan: String(card?.relationship_progression_plan || card?.relationshipProgressionPlan || ''),
    relationship_buffer_zone: String(card?.relationship_buffer_zone || card?.relationshipBufferZone || ''),
    supporting_character_action: String(card?.supporting_character_action || card?.supportingCharacterAction || ''),
    attitude_shift_checkpoint: String(card?.attitude_shift_checkpoint || card?.attitudeShiftCheckpoint || ''),
    relationship_next_hook: String(card?.relationship_next_hook || card?.relationshipNextHook || ''),
    showoff_stage_chain: String(card?.showoff_stage_chain || card?.showoffStageChain || ''),
    spectator_interest_shift: (() => {
      const shift = String(card?.spectator_interest_shift || card?.spectatorInterestShift || '')
      return shift && !/这跟我有关系/.test(shift) ? `这跟我有关系：${shift}` : shift
    })(),
    secondary_showoff_effect: String(card?.secondary_showoff_effect || card?.secondaryShowoffEffect || ''),
    combat_result_type: String(card?.combat_result_type || card?.combatResultType || ''),
    combat_dimension_plan: String(card?.combat_dimension_plan || card?.combatDimensionPlan || ''),
    combat_reversal_plan: String(card?.combat_reversal_plan || card?.combatReversalPlan || ''),
    emotional_tone: String(card?.emotional_tone || card?.emotionalTone || card?.tone || ''),
    emotional_arc_stage: String(card?.emotional_arc_stage || card?.emotionalArcStage || card?.emotion_stage || card?.emotionStage || ''),
    reader_emotion_goal: String(card?.reader_emotion_goal || card?.readerEmotionGoal || ''),
    reaction_structure: String(card?.reaction_structure || card?.reactionStructure || ''),
    expectation_bridge: String(card?.expectation_bridge || card?.expectationBridge || ''),
    key_dialogue: String(card?.key_dialogue || card?.keyDialogue || card?.dialogue_focus || card?.dialogueFocus || ''),
    dialogue_goal: String(card?.dialogue_goal || card?.dialogueGoal || ''),
    required_information: asArray(card?.required_information || card?.requiredInformation).map((item: any) => String(item)).filter(Boolean),
    used_settings: asArray(card?.used_settings || card?.usedSettings).map((item: any) => String(item)).filter(Boolean),
    revealed_settings: asArray(card?.revealed_settings || card?.revealedSettings).map((item: any) => String(item)).filter(Boolean),
    forbidden_settings: asArray(card?.forbidden_settings || card?.forbiddenSettings).map((item: any) => String(item)).filter(Boolean),
    ability_beats: asArray(card?.ability_beats || card?.abilityBeats).map((item: any) => String(item)).filter(Boolean),
    item_beats: asArray(card?.item_beats || card?.itemBeats).map((item: any) => String(item)).filter(Boolean),
    boss_move: String(card?.boss_move || card?.bossMove || ''),
    rule_trigger: String(card?.rule_trigger || card?.ruleTrigger || ''),
    state_changes_expected: asArray(card?.state_changes_expected || card?.stateChangesExpected).map((item: any) => compactJsonBriefText(item)).filter(Boolean),
    turning_point: String(card?.turning_point || card?.turningPoint || ''),
    description_budget: String(card?.description_budget || card?.descriptionBudget || card?.sensory_budget || card?.sensoryBudget || 'low'),
    density_level: String(card?.density_level || card?.densityLevel || ''),
    transition_from_previous: String(card?.transition_from_previous || card?.transitionFromPrevious || ''),
    exit_state: String(card?.exit_state || card?.exitState || ''),
  })).filter((card: any) => card.beat || card.purpose || card.title)
  const intentBaselineCards = applyIntentDialogueBaselineToSceneCards(normalizedCards, contextPackage)
  const styleFingerprintCards = applyStyleFingerprintToSceneCards(intentBaselineCards, contextPackage)
  const conceptAnchorCards = applyExplicitNewConceptAnchorsToSceneCards(styleFingerprintCards, contextPackage)
  return applyDeliveryRiskCarryOverToSceneCards(conceptAnchorCards, contextPackage)
    .map((card: any) => sanitizeSceneCardCoreDramaFields(card))
}

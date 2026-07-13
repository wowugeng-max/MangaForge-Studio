const AUXILIARY_PROSE_PROMPT_MAX_CHARS = 180000
const PROSE_PROMPT_LONG_LINE_HEAD = 900
const PROSE_PROMPT_LONG_LINE_TAIL = 700

function asArray<T = any>(value: T | T[] | null | undefined): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

export function prosePromptText(value: any, maxChars = 360) {
  const text = compactBriefText(value)
  if (!text || text.length <= maxChars) return text
  return `${text.slice(0, maxChars)}…`
}

function prosePromptTailText(value: any, maxChars = 700) {
  const text = compactBriefText(value)
  if (!text || text.length <= maxChars) return text
  const tailChars = Math.max(260, Math.floor(maxChars * 0.62))
  return `${text.slice(0, maxChars - tailChars - 1)}…${text.slice(-tailChars)}`
}

export function compactProsePromptValue(value: any, depth = 0): any {
  if (value == null) return value
  if (typeof value === 'string') return prosePromptText(value, depth > 1 ? 220 : 360)
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) {
    return value.slice(0, depth > 1 ? 6 : 10).map(item => compactProsePromptValue(item, depth + 1))
  }
  if (depth >= 5) return prosePromptText(JSON.stringify(value), 220)
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, depth > 1 ? 24 : 28)
      .map(([key, item]) => [key, key === 'previous_handoff' || key === 'previousHandoff'
        ? prosePromptTailText(item, 700)
        : compactProsePromptValue(item, depth + 1)]),
  )
}

export function prosePromptJson(value: any, maxChars = 2200) {
  const text = JSON.stringify(compactProsePromptValue(value), null, 2)
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars)}\n…已按正文上下文预算裁剪`
}

function isProseSceneCardDiagnosticSegment(value: any) {
  const text = compactBriefText(value)
  if (!text) return true
  if (/^(?:确认)?同步风险[^：:]{0,40}[：:]/i.test(text)) return true
  if (/^(?:确认)?(?:吸引力(?:开篇|中段|章尾)?修复|质量(?:诊断|专项)(?:开篇|中段|章尾)?修复|平台(?:规则|指标)(?:开篇|中段|章尾)?修复|内容(?:规则|指标)(?:开篇|中段|章尾)?修复)\s*[：:]/i.test(text)) return true
  if (/^(换地图承接|章末追读|开篇钩子|下一次修订|复核承接|已存回执|模型自检|缺少|补齐建议)\s*[：:]/i.test(text)) return true
  if (/^(?:不要重写|不要重排|只处理本章计划触达)/.test(text)) return true
  if (/^修复\s*[：:].*(?:不要重写|不要重排|只处理本章计划触达|下一次修订或状态更新)/.test(text)) return true
  if (/^本章目标\s*[：:]/.test(text) && /未充分兑现|缺口|下一次修订|长期追读|reader_fuel|four_question/i.test(text)) return true
  if (/(^|[\s：:；;])([a-z]+(?:_[a-z]+)*(?:_sync|_syn\.{3}|_de\.{3}))(\b|[\s：:；;]|$)/i.test(text)) return true
  if (/\b(missed|next_actions|reader_fuel_missed|four_question_missed|delivery_risk_receipts|revision_receipts)\b/i.test(text)) return true
  if (/(?:delivered=false|remaining_risk|changed_evidence|repair_segment|applied_fix|required_action)/i.test(text)) return true
  if (/下一次修订|不服务长期追读|只完成事件但不服务/i.test(text)) return true
  return false
}

function hasProseSceneCardDiagnosticNoise(value: any) {
  return /同步风险|确认同步风险|换地图承接|章末追读|开篇钩子|吸引力(?:开篇|中段|章尾)?修复|质量(?:诊断|专项)(?:开篇|中段|章尾)?修复|平台(?:规则|指标)(?:开篇|中段|章尾)?修复|内容(?:规则|指标)(?:开篇|中段|章尾)?修复|下一次修订|复核承接|已存回执|模型自检|补齐建议|(?:不要重写|不要重排|只处理本章计划触达)|修复\s*[：:].*(?:不要重写|不要重排|只处理本章计划触达|下一次修订或状态更新)|[a-z]+(?:_[a-z]+)*(?:_sync|_syn\.{3}|_de\.{3})|\b(missed|next_actions|reader_fuel_missed|four_question_missed|delivery_risk_receipts|revision_receipts)\b|delivered=false|remaining_risk|changed_evidence|repair_segment|applied_fix|required_action|不服务长期追读|只完成事件但不服务/i.test(String(value || ''))
}

function proseSceneCardText(value: any, maxChars = 360) {
  const raw = compactBriefText(value)
  if (!raw) return ''
  if (!hasProseSceneCardDiagnosticNoise(raw)) return prosePromptText(raw, maxChars)
  const cleaned = raw
    .split(/[；;]\s*/)
    .map(segment => compactBriefText(segment))
    .filter(Boolean)
    .filter(segment => !isProseSceneCardDiagnosticSegment(segment))
    .join('；')
  return prosePromptText(cleaned, maxChars)
}

function proseSceneCardList(value: any, maxItems = 8, maxChars = 220) {
  const seen = new Set<string>()
  return asArray(value)
    .map(item => proseSceneCardText(item, maxChars))
    .filter((item: string) => {
      if (!item || seen.has(item)) return false
      seen.add(item)
      return true
    })
    .slice(0, maxItems)
}

function proseSceneCardRepairList(value: any, maxItems = 6, maxChars = 180) {
  return proseSceneCardList(value, maxItems, maxChars)
}

function compactStoryDrivingValue(value: any, depth = 0): any {
  if (value == null || depth > 5) return undefined
  if (typeof value !== 'object') return compactProsePromptValue(value, depth)
  if (Array.isArray(value)) return value.slice(0, 12).map(item => compactStoryDrivingValue(item, depth + 1)).filter(item => item !== undefined)
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/(?:_sync$|Sync$|receipt|diagnostic|audit_log|raw_payload)/i.test(key))
    .slice(0, 28)
    .map(([key, item]) => [key, compactStoryDrivingValue(item, depth + 1)])
    .filter(([, item]) => item !== undefined))
}

export function compactProseSceneCard(card: any) {
  return compactProsePromptValue({
    scene_no: card?.scene_no || card?.sceneNo,
    title: card?.title,
    transition_from_previous: proseSceneCardText(card?.transition_from_previous || card?.transitionFromPrevious, 420),
    purpose_tag: proseSceneCardText(card?.purpose_tag || card?.purposeTag, 80),
    goal: proseSceneCardText(card?.goal || card?.scene_goal || card?.sceneGoal),
    purpose: proseSceneCardText(card?.purpose),
    obstacle: proseSceneCardText(card?.obstacle),
    conflict: proseSceneCardText(card?.conflict),
    action: proseSceneCardText(card?.action || card?.protagonist_action || card?.protagonistAction),
    turn: proseSceneCardText(card?.turn || card?.turning_point || card?.turningPoint),
    payoff: proseSceneCardText(card?.payoff || card?.reader_payoff || card?.readerPayoff),
    state_delta: proseSceneCardText(card?.state_delta || card?.stateDelta),
    protagonist_agency_action: proseSceneCardText(card?.protagonist_agency_action || card?.protagonistAgencyAction),
    no_exit_reason: proseSceneCardText(card?.no_exit_reason || card?.noExitReason),
    event_value_change: proseSceneCardText(card?.event_value_change || card?.eventValueChange),
    opening_hook: proseSceneCardText(card?.opening_hook || card?.openingHook),
    reader_payoff: proseSceneCardText(card?.reader_payoff || card?.readerPayoff),
    serial_risk_repairs: proseSceneCardRepairList(card?.serial_risk_repairs || card?.serialRiskRepairs || card?.risk_repairs || card?.riskRepairs),
    recent_fatigue_action: proseSceneCardText(card?.recent_fatigue_action || card?.recentFatigueAction),
    density_level: card?.density_level || card?.densityLevel,
    sensory_anchor: proseSceneCardText(card?.sensory_anchor || card?.sensoryAnchor),
    required_beats: proseSceneCardList(card?.required_beats || card?.requiredBeats),
    action_beats: proseSceneCardList(card?.action_beats || card?.actionBeats),
    required_information: proseSceneCardList(card?.required_information || card?.requiredInformation),
    state_changes_expected: proseSceneCardList(card?.state_changes_expected || card?.stateChangesExpected),
    chapter_positioning: card?.chapter_positioning || card?.chapterPositioning,
    pressure_level: card?.pressure_level || card?.pressureLevel,
    chapter_positioning_role: card?.chapter_positioning_role || card?.chapterPositioningRole,
    benchmark_structure_coordinate: card?.benchmark_structure_coordinate || card?.benchmarkStructureCoordinate,
    ending_hook_seed: proseSceneCardText(card?.ending_hook_seed || card?.endingHookSeed),
  })
}

function getOhStoryDirector(contextPackage: any) {
  return contextPackage?.oh_story_director || contextPackage?.ohStoryDirector || {}
}

function compactOhStoryDirectorContracts(value: any, maxItems: number) {
  return asArray(value)
    .slice(0, maxItems)
    .map((item: any) => {
      if (typeof item === 'string') return prosePromptText(item, 180)
      const key = prosePromptText(item?.key || item?.contract_key || item?.contractKey || item?.name, 80)
      const detailLevel = prosePromptText(item?.detail_level || item?.detailLevel, 80)
      const reason = prosePromptText(item?.reason, 180)
      const parts = [
        key || 'unknown_contract',
        detailLevel ? `detail=${detailLevel}` : '',
        reason ? `reason=${reason}` : '',
      ].filter(Boolean)
      return parts.join(' / ')
    })
    .filter(Boolean)
}

function compactOhStoryDirectorBudgetList(value: any) {
  return asArray(value)
    .map((item: any) => prosePromptText(item?.key || item?.contract_key || item?.contractKey || item, 100))
    .filter(Boolean)
}

function buildOhStoryDirectorSnapshot(contextPackage: any) {
  const director = getOhStoryDirector(contextPackage)
  if (!director?.stage) return undefined
  const primaryAction = director.primary_action || director.primaryAction || {}
  const budgetPlan = director.prompt_budget_plan || director.promptBudgetPlan || {}
  return compactProsePromptValue({
    stage: director.stage,
    readiness: director.readiness || director.readiness_status || director.readinessStatus,
    primary_action: {
      key: primaryAction.key,
      label: primaryAction.label,
    },
    blocking_summary: director.blocking_summary || director.blockingSummary,
    selected_contracts: asArray(director.selected_contracts || director.selectedContracts).slice(0, 8),
    suppressed_contracts: asArray(director.suppressed_contracts || director.suppressedContracts).slice(0, 6),
    prompt_budget_plan: {
      full: compactOhStoryDirectorBudgetList(budgetPlan.full),
      compact: compactOhStoryDirectorBudgetList(budgetPlan.compact),
      reference: compactOhStoryDirectorBudgetList(budgetPlan.reference),
      omit: compactOhStoryDirectorBudgetList(budgetPlan.omit),
    },
  })
}

export function buildOhStoryDirectorPromptBlock(contextPackage: any) {
  const director = getOhStoryDirector(contextPackage)
  if (!director?.stage) return ''
  const primaryAction = director.primary_action || director.primaryAction || {}
  const budgetPlan = director.prompt_budget_plan || director.promptBudgetPlan || {}
  const selectedContracts = compactOhStoryDirectorContracts(
    director.selected_contracts || director.selectedContracts,
    8,
  )
  const suppressedContracts = compactOhStoryDirectorContracts(
    director.suppressed_contracts || director.suppressedContracts,
    6,
  )
  const budgetLines = [
    `full=${compactOhStoryDirectorBudgetList(budgetPlan.full).join('、') || '无'}`,
    `compact=${compactOhStoryDirectorBudgetList(budgetPlan.compact).join('、') || '无'}`,
    `reference=${compactOhStoryDirectorBudgetList(budgetPlan.reference).join('、') || '无'}`,
    `omit=${compactOhStoryDirectorBudgetList(budgetPlan.omit).join('、') || '无'}`,
  ]
  return [
    '【oh-story 总导演】',
    `阶段：${prosePromptText(director.stage, 120)}`,
    director.readiness || director.readiness_status || director.readinessStatus
      ? `readiness：${prosePromptText(director.readiness || director.readiness_status || director.readinessStatus, 160)}`
      : '',
    primaryAction?.label || primaryAction?.key
      ? `primary action：${prosePromptText(primaryAction.label || '', 120)}${primaryAction.key ? ` / key=${prosePromptText(primaryAction.key, 120)}` : ''}`
      : '',
    director.blocking_summary || director.blockingSummary
      ? `blocking_summary：${prosePromptText(director.blocking_summary || director.blockingSummary, 300)}`
      : '',
    selectedContracts.length ? `selected_contracts：${selectedContracts.join('；')}` : '',
    suppressedContracts.length ? `suppressed_contracts：${suppressedContracts.join('；')}` : '',
    `prompt_budget_plan：${budgetLines.join('；')}`,
  ].filter(Boolean).join('\n')
}

export function buildProsePromptContextSnapshot(contextPackage: any) {
  const runtimeTarget = contextPackage?.chapterTarget || {}
  const baseTarget = contextPackage?.chapter_target || {}
  const target = {
    ...baseTarget,
    ...runtimeTarget,
    chapter_no: runtimeTarget.chapterNo ?? runtimeTarget.chapter_no ?? baseTarget.chapter_no ?? baseTarget.chapterNo,
    title: runtimeTarget.title ?? baseTarget.title,
    ending_hook: runtimeTarget.endingHook ?? runtimeTarget.ending_hook ?? baseTarget.ending_hook ?? baseTarget.endingHook,
    previous_handoff: runtimeTarget.previousHandoff ?? runtimeTarget.previous_handoff ?? baseTarget.previous_handoff ?? baseTarget.previousHandoff,
    word_target: runtimeTarget.wordTarget ?? runtimeTarget.word_target ?? baseTarget.word_target ?? baseTarget.wordTarget,
    scene_cards: runtimeTarget.sceneCards ?? runtimeTarget.scene_cards ?? baseTarget.scene_cards ?? baseTarget.sceneCards,
  }
  const settingContext = contextPackage?.setting_context || contextPackage?.settingContext || {}
  const storyState = contextPackage?.story_state || contextPackage?.storyState || {}
  const director = getOhStoryDirector(contextPackage)
  const budgetPlan = director?.prompt_budget_plan || director?.promptBudgetPlan || {}
  const omittedContracts = new Set(compactOhStoryDirectorBudgetList(budgetPlan.omit))
  const compactChapterTarget: any = compactProsePromptValue({
      chapter_no: target.chapter_no || target.chapterNo,
      title: target.title,
      summary: target.summary || target.goal,
      conflict: target.conflict,
      ending_hook: target.ending_hook || target.endingHook,
      previous_handoff: target.previous_handoff || target.previousHandoff,
      word_target: target.word_target || target.wordTarget,
      scene_cards: asArray(target.scene_cards || target.sceneCards).slice(0, 8).map(compactProseSceneCard),
      chapter_positioning_brief: target.chapter_positioning_brief || target.chapterPositioningBrief,
      recent_fatigue_brief: compactStoryDrivingValue(target.recent_fatigue_brief || target.recentFatigueBrief),
      write_preparation_brief: compactStoryDrivingValue(target.write_preparation_brief || target.writePreparationBrief),
      delivery_risk_carry_over: compactStoryDrivingValue(target.delivery_risk_carry_over || target.deliveryRiskCarryOver),
      conflict_structure_contract: compactStoryDrivingValue(target.conflict_structure_contract || target.conflictStructureContract),
      dialogue_contract: compactStoryDrivingValue(target.dialogue_contract || target.dialogueContract),
      style_boundary_contract: compactStoryDrivingValue(target.style_boundary_contract || target.styleBoundaryContract),
      longform_structure_contract: omittedContracts.has('longform_structure_contract')
        ? undefined
        : target.longform_structure_contract || target.longformStructureContract,
    })
  compactChapterTarget.previous_handoff = prosePromptTailText(target.previous_handoff || target.previousHandoff, 700)
  return {
    chapter_target: compactChapterTarget,
    oh_story_director: buildOhStoryDirectorSnapshot(contextPackage),
    preflight: compactProsePromptValue(contextPackage?.preflight || {}),
    continuity: compactProsePromptValue(contextPackage?.continuity || {}),
    canonical_surface_index: {
      stable_entities: asArray(
        (contextPackage?.canonical_surface_index || contextPackage?.canonicalSurfaceIndex)?.stable_entities,
      ).slice(0, 24).map(item => compactProsePromptValue(item)),
    },
    setting_context: compactProsePromptValue({
      chapter_usage: asArray(settingContext.chapter_usage || settingContext.chapterUsage).slice(0, 16),
      entities: asArray(settingContext.entities).slice(0, 16).map((item: any) => ({
        id: item?.id,
        name: item?.name,
        entity_type: item?.entity_type || item?.entityType,
        summary: item?.summary,
        constraints_json: item?.constraints_json || item?.constraintsJson,
        state_json: item?.state_json || item?.stateJson,
      })),
    }),
    story_state: compactProsePromptValue({
      progress_summary: storyState.progress_summary || storyState.progressSummary,
      daily_context_snapshot: storyState.daily_context_snapshot || storyState.dailyContextSnapshot,
      active_locations: storyState.active_locations || storyState.activeLocations,
      open_questions: storyState.open_questions || storyState.openQuestions,
      next_chapter_priorities: storyState.next_chapter_priorities || storyState.nextChapterPriorities,
    }),
  }
}

function clampProsePromptLine(section: any) {
  const text = String(section || '').trim()
  if (!text || text.length <= PROSE_PROMPT_LONG_LINE_HEAD + PROSE_PROMPT_LONG_LINE_TAIL) return text
  return [
    text.slice(0, PROSE_PROMPT_LONG_LINE_HEAD),
    '…本段已按正文上下文预算折叠…',
    text.slice(-PROSE_PROMPT_LONG_LINE_TAIL),
  ].join('\n')
}

export function buildBoundedProsePrompt(sections: any[]) {
  // Compatibility budget for sandbox, expansion, and other auxiliary prose tasks.
  // Production chapter drafting uses the 48K section compiler instead.
  const rawSections = sections.map((section: any) => String(section || '').trim()).filter(Boolean)
  const rawPrompt = rawSections.join('\n')
  if (rawPrompt.length <= AUXILIARY_PROSE_PROMPT_MAX_CHARS) return rawPrompt

  const compactSections = rawSections.map(clampProsePromptLine).filter(Boolean)
  const prompt = compactSections.join('\n')
  if (prompt.length <= AUXILIARY_PROSE_PROMPT_MAX_CHARS) return prompt

  const requirementIndex = compactSections.findIndex(section => section === '【段落级写作要求】')
  const tailSections = requirementIndex >= 0 ? compactSections.slice(requirementIndex) : compactSections.slice(-40)
  const tail = tailSections.join('\n')
  const contextIndex = compactSections.findIndex(section => section === '【结构化上下文包】')
  const forcedContextSections = contextIndex >= 0
    ? compactSections.slice(contextIndex, Math.min(contextIndex + 2, requirementIndex >= 0 ? requirementIndex : compactSections.length))
    : []
  const forcedContext = forcedContextSections.join('\n')
  const prefixBudget = Math.max(12000, AUXILIARY_PROSE_PROMPT_MAX_CHARS - tail.length - 200)
  const prefix: string[] = []
  let used = 0
  const prefixEnd = requirementIndex >= 0 ? requirementIndex : compactSections.length
  for (let index = 0; index < prefixEnd; index += 1) {
    if (contextIndex >= 0 && index >= contextIndex) break
    const section = compactSections[index]
    const nextSize = section.length + 1
    if (used + nextSize + forcedContext.length > prefixBudget) break
    prefix.push(section)
    used += nextSize
  }
  return [
    ...prefix,
    forcedContext,
    '【上下文预算裁剪】以上保留章节目标和优先执行约束；过长的辅助资产、诊断和历史状态已折叠，正文不得因此新增未给出的事实。',
    tail,
  ].filter(Boolean).join('\n').slice(0, AUXILIARY_PROSE_PROMPT_MAX_CHARS)
}

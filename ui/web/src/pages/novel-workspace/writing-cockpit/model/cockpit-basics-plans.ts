import type {
  AnyRecord,
  WritingCockpitRole,
  WritingCockpitActionKey,
  WritingReadinessStatus,
  WritingReadinessCheck,
  WritingCockpitChapter,
  WritingQueueItemStatus,
  WritingQueueItem,
  WritingQueueModel,
  ChapterPlanningReadiness,
  ChapterContextPackageStatus,
  ChapterScenePlanStatus,
  ChapterPlanningDeskSceneCard,
  ChapterQualityContinuitySceneMapItem,
  ChapterWritePreparationBrief,
  ChapterPlanningDeskModel,
  ChapterAcceptanceStatus,
  DeslopGateDiagnosticsModel,
  ChapterAcceptanceDeskModel,
  ChapterHandoffStatus,
  ChapterHandoffDeskModel,
  LongformWorkflowStageKey,
  LongformWorkflowStageStatus,
  LongformWorkflowStageModel,
  LongformWorkflowModel,
  WritingCockpitModel,
  BuildWritingCockpitModelInput,
} from './types'

import {
  arrayValue,
  compactText,
  compactWordCount,
  firstNonEmpty,
  hasProse,
  hasValidId,
  labelStringArray,
  sortChapters,
  stringArray,
  text,
  uniqueStrings,
} from './cockpit-basics-core'

export function resolveWritingBible(project?: AnyRecord | null) {
  return project?.reference_config?.writing_bible || project?.writing_bible || {}
}

export function resolveStoryState(project?: AnyRecord | null) {
  return project?.reference_config?.story_state || project?.story_state || {}
}

export function writingBibleExists(writingBible: AnyRecord) {
  return Boolean(firstNonEmpty(
    writingBible?.promise,
    writingBible?.reader_promise,
    writingBible?.mainline?.title,
    writingBible?.mainline?.hook,
    writingBible?.mainline_title,
    writingBible?.mainline_hook,
  ))
}

export function outlineLevel(outline: AnyRecord) {
  return text(outline?.outline_level || outline?.level || outline?.outline_type).toLowerCase()
}

export function outlineRange(outline: AnyRecord) {
  const raw = outline?.raw_payload || {}
  const start = Number(outline?.start_chapter ?? raw?.start_chapter ?? outline?.chapter_no ?? 0)
  const end = Number(outline?.end_chapter ?? raw?.end_chapter ?? outline?.start_chapter ?? raw?.start_chapter ?? outline?.chapter_no ?? start)
  return { start, end }
}

export function chapterInOutline(chapterNo: number, outline: AnyRecord) {
  const { start, end } = outlineRange(outline)
  return start > 0 && chapterNo >= start && chapterNo <= end
}

export function titleMatches(left: any, right: any) {
  const a = text(left)
  const b = text(right)
  return Boolean(a && b && (a.includes(b) || b.includes(a)))
}

export function resolveVolume(outlines: AnyRecord[], writingBible: AnyRecord, nextChapter: AnyRecord | null) {
  const chapterNo = Number(nextChapter?.chapter_no || 0)
  const volumeOutlines = outlines.filter(outline => {
    const level = outlineLevel(outline)
    return level === 'volume' || level === '卷'
  })
  const outline = volumeOutlines.find(item => chapterNo && chapterInOutline(chapterNo, item)) || volumeOutlines[0] || {}
  const bibleVolumes = arrayValue(writingBible?.volume_plan || writingBible?.volumes)
  const bibleVolume = bibleVolumes.find(volume => titleMatches(volume?.title, outline?.title)) || bibleVolumes[0] || {}

  return {
    title: firstNonEmpty(outline?.title, bibleVolume?.title, '未定卷'),
    goal: firstNonEmpty(outline?.goal, bibleVolume?.goal, bibleVolume?.summary, bibleVolume?.promise, outline?.summary),
  }
}

export function chapterNoFromTitle(title: any) {
  const match = text(title).match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}

export function chapterFromOutline(outlines: AnyRecord[], chapterOrNo: AnyRecord | number) {
  const chapter = typeof chapterOrNo === 'object' ? chapterOrNo : null
  const chapterNo = Number(chapter?.chapter_no || chapterOrNo || 0)
  const outlineId = chapter?.outline_id
  return outlines.find(outline => {
    const level = outlineLevel(outline)
    if (level !== 'chapter' && level !== '章节') return false
    if (outlineId !== null && outlineId !== undefined && String(outline?.id) === String(outlineId)) return true
    const raw = outline?.raw_payload || {}
    const rawChapterNo = Number(outline?.chapter_no || raw?.chapter_no || raw?.future100?.chapter_no || raw?.skeleton?.chapter_no || raw?.rollingPlan?.chapter_no || 0)
    const titleChapterNo = chapterNoFromTitle(outline?.title)
    return rawChapterNo === chapterNo || titleChapterNo === chapterNo || chapterInOutline(chapterNo, outline)
  }) || null
}

export function firstArrayText(value: any) {
  return arrayValue(value).map(item => text(item)).find(Boolean) || ''
}

export function outlineRawPayload(outline?: AnyRecord | null) {
  return outline?.raw_payload || {}
}

export function outlinePlanPayload(outline?: AnyRecord | null) {
  const raw = outlineRawPayload(outline)
  return {
    raw,
    future100: raw?.future100 || {},
    skeleton: raw?.skeleton || {},
    rollingPlan: raw?.rollingPlan || {},
  }
}

export function chapterPlanFields(chapter?: AnyRecord | null, outline?: AnyRecord | null) {
  const chapterRaw = chapter?.raw_payload || {}
  const chapterRollingPlan = chapterRaw?.rollingPlan || {}
  const { raw, future100, skeleton, rollingPlan } = outlinePlanPayload(outline)
  const goal = firstNonEmpty(
    chapter?.chapter_goal,
    chapter?.chapterTask,
    chapter?.task,
    chapterRaw?.chapter_goal,
    chapterRaw?.chapterTask,
    chapterRaw?.task,
    chapterRollingPlan?.chapter_goal,
    chapterRollingPlan?.chapterTask,
    chapterRollingPlan?.task,
    outline?.chapter_goal,
    outline?.chapterTask,
    outline?.task,
    raw?.chapter_goal,
    raw?.chapterTask,
    raw?.task,
    rollingPlan?.chapter_goal,
    rollingPlan?.chapterTask,
    rollingPlan?.task,
    future100?.chapter_goal,
    future100?.chapterTask,
    future100?.task,
    skeleton?.chapter_goal,
    skeleton?.chapterTask,
    skeleton?.task,
    outline?.summary,
  )
  const conflict = firstNonEmpty(
    chapter?.conflict,
    chapterRaw?.conflict,
    chapterRollingPlan?.conflict,
    outline?.conflict,
    raw?.conflict,
    rollingPlan?.conflict,
    future100?.conflict,
    skeleton?.conflict,
    firstArrayText(chapterRollingPlan?.conflict_points),
    firstArrayText(outline?.conflict_points),
    firstArrayText(raw?.conflict_points),
    firstArrayText(rollingPlan?.conflict_points),
    firstArrayText(future100?.conflict_points),
    firstArrayText(skeleton?.conflict_points),
  )
  const endingHook = firstNonEmpty(
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.hook,
    chapterRaw?.ending_hook,
    chapterRaw?.endingHook,
    chapterRaw?.hook,
    chapterRollingPlan?.ending_hook,
    chapterRollingPlan?.endingHook,
    chapterRollingPlan?.hook,
    outline?.ending_hook,
    outline?.endingHook,
    outline?.hook,
    raw?.ending_hook,
    raw?.endingHook,
    raw?.hook,
    rollingPlan?.ending_hook,
    rollingPlan?.endingHook,
    rollingPlan?.hook,
    future100?.ending_hook,
    future100?.endingHook,
    future100?.hook,
    skeleton?.ending_hook,
    skeleton?.endingHook,
    skeleton?.hook,
  )

  return { goal, conflict, endingHook }
}

export function hasUsableChapterPlan(chapter?: AnyRecord | null, outline?: AnyRecord | null) {
  const plan = chapterPlanFields(chapter, outline)
  return Boolean(plan.goal && plan.conflict && plan.endingHook)
}

export function chapterHasOutline(chapter: AnyRecord | null, outlines: AnyRecord[]) {
  if (!chapter) return false
  const matchingOutline = chapterFromOutline(outlines, chapter)
  return hasUsableChapterPlan(chapter, matchingOutline)
}

export function materialReady(materialScore?: AnyRecord | null) {
  if (!materialScore) return false
  return Boolean(materialScore.can_generate) || Number(materialScore.score || 0) >= 70
}

export function memoryReady(memorySummary?: AnyRecord | null) {
  if (!memorySummary) return true
  return Number(memorySummary.memory_count || 0) > 0 || Number(memorySummary.fact_count || 0) > 0
}

export function normalizeCoreContractPlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.core_contract_radar
    || target?.coreContractRadar
    || contextPackage?.core_contract_radar
    || contextPackage?.coreContractRadar
    || contextPackage?.pre_draft_brief?.core_contract_radar
    || contextPackage?.context_package?.core_contract_radar
    || {}
  return {
    summary: firstNonEmpty(raw?.summary, raw?.detail, raw?.reason),
    mustServe: stringArray(raw?.must_serve || raw?.mustServe || raw?.required),
    noDrift: stringArray(raw?.no_drift || raw?.noDrift || raw?.red_lines || raw?.redLines),
    repairFocus: stringArray(raw?.repair_focus || raw?.repairFocus || raw?.required_actions || raw?.requiredActions),
  }
}

export function normalizeReaderDropRiskPlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.reader_drop_risk_brief
    || target?.readerDropRiskBrief
    || contextPackage?.reader_drop_risk_brief
    || contextPackage?.readerDropRiskBrief
    || contextPackage?.reader_trial_context
    || contextPackage?.readerTrialContext
    || contextPackage?.pre_draft_brief?.reader_drop_risk_brief
    || {}
  return {
    status: firstNonEmpty(raw?.status, raw?.drop_points?.length || raw?.dropPoints?.length ? 'needs_repair' : ''),
    dropPoints: stringArray(raw?.drop_points || raw?.dropPoints || raw?.risks),
    openingGuardrail: firstNonEmpty(raw?.opening_guardrail, raw?.openingGuardrail),
    middleGuardrail: firstNonEmpty(raw?.middle_guardrail, raw?.middleGuardrail),
    endingGuardrail: firstNonEmpty(raw?.ending_guardrail, raw?.endingGuardrail),
  }
}

export function normalizeStoryPressurePlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.story_pressure_brief
    || target?.storyPressureBrief
    || contextPackage?.story_pressure_brief
    || contextPackage?.storyPressureBrief
    || contextPackage?.story_pressure_ladder
    || contextPackage?.storyPressureLadder
    || contextPackage?.pre_draft_brief?.story_pressure_brief
    || {}
  const pressureSources = labelStringArray(raw?.pressure_sources || raw?.pressureSources || raw?.sources)
  return {
    status: firstNonEmpty(raw?.status, pressureSources.length ? 'ready' : ''),
    pressureSources,
    conflictEscalationGuardrail: firstNonEmpty(raw?.conflict_escalation_guardrail, raw?.conflictEscalationGuardrail),
    stakesGrowthGuardrail: firstNonEmpty(raw?.stakes_growth_guardrail, raw?.stakesGrowthGuardrail),
    reversalPressureGuardrail: firstNonEmpty(raw?.reversal_pressure_guardrail, raw?.reversalPressureGuardrail),
    requiredActions: stringArray(raw?.required_actions || raw?.requiredActions || raw?.next_actions || raw?.nextActions),
  }
}

export function normalizeStoryDrivePlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.story_drive_brief
    || target?.storyDriveBrief
    || contextPackage?.story_drive_brief
    || contextPackage?.storyDriveBrief
    || contextPackage?.pre_draft_brief?.story_drive_brief
    || target
    || {}
  return {
    protagonistChoice: firstNonEmpty(raw?.protagonist_choice, raw?.protagonistChoice, raw?.active_choice, raw?.activeChoice, target?.protagonist_choice, target?.active_choice),
    choiceCost: firstNonEmpty(raw?.choice_cost, raw?.choiceCost, raw?.cost, raw?.consequence, raw?.stakes, target?.choice_cost, target?.cost, target?.consequence, target?.stakes),
    stateChange: firstNonEmpty(raw?.state_change, raw?.stateChange, raw?.exit_state, raw?.exitState, target?.state_change, target?.exit_state),
    obstacle: firstNonEmpty(raw?.obstacle, raw?.conflict, raw?.core_conflict, raw?.coreConflict, target?.core_conflict, target?.conflict),
    causalNextStep: firstNonEmpty(raw?.causal_next_step, raw?.causalNextStep, raw?.next_step, raw?.nextStep, raw?.ending_hook, raw?.endingHook, target?.ending_hook),
    requiredActions: stringArray(raw?.required_actions || raw?.requiredActions || raw?.next_actions || raw?.nextActions),
  }
}

export function normalizeSerialRhythmBudget(value: any, index: number) {
  if (!value || typeof value !== 'object') return null
  return {
    sceneNo: Number(value?.scene_no || value?.sceneNo || index + 1),
    title: firstNonEmpty(value?.title, value?.name, `场景${index + 1}`),
    wordBudget: firstNonEmpty(value?.word_budget, value?.wordBudget, value?.budget),
    requiredPayoff: firstNonEmpty(value?.required_payoff, value?.requiredPayoff, value?.reader_payoff, value?.readerPayoff, value?.payoff),
    turn: firstNonEmpty(value?.turn, value?.reversal, value?.turning_point, value?.turningPoint, value?.information_gap, value?.informationGap),
    endingHookSeed: firstNonEmpty(value?.ending_hook_seed, value?.endingHookSeed, value?.ending_hook, value?.endingHook, value?.exit_state, value?.exitState),
  }
}

export function normalizeSerialRhythmPlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.serial_rhythm_brief
    || target?.serialRhythmBrief
    || contextPackage?.serial_rhythm_brief
    || contextPackage?.serialRhythmBrief
    || contextPackage?.pre_draft_brief?.serial_rhythm_brief
    || {}
  return {
    status: firstNonEmpty(raw?.status),
    openingHookDeadline: firstNonEmpty(raw?.opening_hook_deadline, raw?.openingHookDeadline, raw?.opening_guardrail, raw?.openingGuardrail),
    payoffInterval: firstNonEmpty(raw?.payoff_interval, raw?.payoffInterval, raw?.payoff_density, raw?.payoffDensity),
    middleGuardrail: firstNonEmpty(raw?.middle_guardrail, raw?.middleGuardrail, raw?.pacing_guardrail, raw?.pacingGuardrail),
    endingHookGuardrail: firstNonEmpty(raw?.ending_hook_guardrail, raw?.endingHookGuardrail, raw?.ending_guardrail, raw?.endingGuardrail),
    scenePayoffBudget: (Array.isArray(raw?.scene_payoff_budget) ? raw.scene_payoff_budget : Array.isArray(raw?.scenePayoffBudget) ? raw.scenePayoffBudget : [])
      .map((item: any, index: number) => normalizeSerialRhythmBudget(item, index))
      .filter(Boolean),
    antiDragRules: stringArray(raw?.anti_drag_rules || raw?.antiDragRules || raw?.no_drag_rules || raw?.noDragRules),
  }
}

export function normalizePageTurnHookPlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.page_turn_hook_brief
    || target?.pageTurnHookBrief
    || contextPackage?.page_turn_hook_brief
    || contextPackage?.pageTurnHookBrief
    || contextPackage?.pre_draft_brief?.page_turn_hook_brief
    || {}
  return {
    status: firstNonEmpty(raw?.status),
    hookType: firstNonEmpty(raw?.hook_type, raw?.hookType, raw?.type),
    coreQuestion: firstNonEmpty(raw?.core_question, raw?.coreQuestion, raw?.question),
    visibleTrigger: firstNonEmpty(raw?.visible_trigger, raw?.visibleTrigger, raw?.trigger),
    withheldAnswer: firstNonEmpty(raw?.withheld_answer, raw?.withheldAnswer, raw?.withheld, raw?.forbidden_answer, raw?.forbiddenAnswer),
    nextChapterPull: firstNonEmpty(raw?.next_chapter_pull, raw?.nextChapterPull, raw?.next_pull, raw?.nextPull),
    finalImage: firstNonEmpty(raw?.final_image, raw?.finalImage, raw?.last_image, raw?.lastImage),
    forbiddenResolution: stringArray(raw?.forbidden_resolution || raw?.forbiddenResolution || raw?.forbidden),
    requiredActions: stringArray(raw?.required_actions || raw?.requiredActions),
  }
}

export function normalizeVolumeClimaxBeat(value: any, index: number) {
  if (!value || typeof value !== 'object') {
    const label = firstNonEmpty(value, `爆点${index + 1}`)
    return label ? { chapterNo: null, type: '', label, detail: '' } : null
  }
  const label = firstNonEmpty(value?.label, value?.title, value?.name, value?.summary, value?.detail, `爆点${index + 1}`)
  const detail = firstNonEmpty(value?.detail, value?.description, value?.summary, value?.promise, value?.payoff)
  const type = firstNonEmpty(value?.type, value?.beat_type, value?.beatType, value?.kind)
  if (!label && !detail && !type) return null
  return {
    chapterNo: Number(value?.chapter_no || value?.chapterNo || value?.chapter || 0) || null,
    type,
    label,
    detail,
  }
}

export function sortNearbyVolumeClimaxBeats(beats: Array<NonNullable<ReturnType<typeof normalizeVolumeClimaxBeat>>>, chapterNo: number) {
  return beats
    .map((beat, index) => ({ beat, index }))
    .sort((left, right) => {
      const leftNo = Number(left.beat.chapterNo || 0)
      const rightNo = Number(right.beat.chapterNo || 0)
      if (chapterNo && leftNo === chapterNo && rightNo !== chapterNo) return -1
      if (chapterNo && rightNo === chapterNo && leftNo !== chapterNo) return 1
      if (chapterNo && leftNo && rightNo) return Math.abs(leftNo - chapterNo) - Math.abs(rightNo - chapterNo)
      return left.index - right.index
    })
    .map(item => item.beat)
}

export function normalizeVolumeClimaxPlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.volume_climax_brief
    || target?.volumeClimaxBrief
    || target?.volume_beat_brief
    || target?.volumeBeatBrief
    || contextPackage?.volume_climax_brief
    || contextPackage?.volumeClimaxBrief
    || contextPackage?.volume_beat_brief
    || contextPackage?.volumeBeatBrief
    || contextPackage?.pre_draft_brief?.volume_climax_brief
    || {}
  const budget = contextPackage?.volume_beat_budget
    || contextPackage?.volumeBeatBudget
    || raw?.volume_beat_budget
    || raw?.volumeBeatBudget
    || {}
  const chapterNo = Number(target?.chapter_no || target?.chapterNo || raw?.chapter_no || raw?.chapterNo || 0)
  const explicitBeats = (Array.isArray(raw?.nearby_beats) ? raw.nearby_beats : Array.isArray(raw?.nearbyBeats) ? raw.nearbyBeats : [])
    .map((item: any, index: number) => normalizeVolumeClimaxBeat(item, index))
    .filter(Boolean)
  const budgetBeats = (Array.isArray(budget?.beats) ? budget.beats : Array.isArray(budget?.volume_beats) ? budget.volume_beats : Array.isArray(budget?.volumeBeats) ? budget.volumeBeats : [])
    .map((item: any, index: number) => normalizeVolumeClimaxBeat(item, index))
    .filter(Boolean)
  const nearbyBeats = (explicitBeats.length ? explicitBeats : sortNearbyVolumeClimaxBeats(budgetBeats, chapterNo)).slice(0, 6)
  const currentBeat = nearbyBeats.find(beat => chapterNo && Number(beat?.chapterNo || 0) === chapterNo) || nearbyBeats[0] || null
  return {
    status: firstNonEmpty(raw?.status, budget?.status),
    currentVolumeTitle: firstNonEmpty(raw?.current_volume_title, raw?.currentVolumeTitle, budget?.current_volume_title, budget?.currentVolumeTitle, budget?.volume_title, budget?.volumeTitle),
    chapterRange: firstNonEmpty(raw?.chapter_range, raw?.chapterRange, budget?.chapter_range, budget?.chapterRange),
    currentChapterRole: firstNonEmpty(
      raw?.current_chapter_role,
      raw?.currentChapterRole,
      raw?.chapter_role,
      raw?.chapterRole,
      raw?.role,
      currentBeat ? `${currentBeat.type ? `${currentBeat.type}：` : ''}${currentBeat.label}${currentBeat.detail ? `，${currentBeat.detail}` : ''}` : '',
      budget?.summary,
    ),
    volumeGoal: firstNonEmpty(raw?.volume_goal, raw?.volumeGoal, budget?.volume_goal, budget?.volumeGoal, budget?.goal, budget?.summary),
    climaxPromise: firstNonEmpty(raw?.climax_promise, raw?.climaxPromise, raw?.reader_payoff, raw?.readerPayoff, raw?.payoff, currentBeat?.detail),
    requiredBeats: stringArray(raw?.required_beats || raw?.requiredBeats || raw?.beats_required || raw?.beatsRequired),
    forbiddenPayoff: stringArray(raw?.forbidden_payoff || raw?.forbiddenPayoff || raw?.forbidden_payoffs || raw?.forbiddenPayoffs || raw?.forbidden_resolution || raw?.forbiddenResolution),
    nearbyBeats,
    nextActions: stringArray(raw?.next_actions || raw?.nextActions || budget?.next_actions || budget?.nextActions),
  }
}

export function normalizeDeliveryRiskCarryOverPlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.delivery_risk_carry_over
    || target?.deliveryRiskCarryOver
    || contextPackage?.delivery_risk_carry_over
    || contextPackage?.deliveryRiskCarryOver
    || contextPackage?.pre_draft_brief?.delivery_risk_carry_over
    || contextPackage?.pre_draft_brief?.deliveryRiskCarryOver
    || contextPackage?.preDraftBrief?.delivery_risk_carry_over
    || contextPackage?.preDraftBrief?.deliveryRiskCarryOver
    || contextPackage?.context_package?.delivery_risk_carry_over
    || contextPackage?.context_package?.deliveryRiskCarryOver
    || {}
  const totalCount = Number(raw?.total_count ?? raw?.totalCount ?? raw?.count)
  const items = stringArray(raw?.items || raw?.risk_items || raw?.riskItems || raw?.risks)
  const evidence = stringArray(raw?.evidence || raw?.evidences || raw?.risk_evidence || raw?.riskEvidence)
  const requiredActions = stringArray(raw?.required_actions || raw?.requiredActions || raw?.next_actions || raw?.nextActions || raw?.actions)
  const stagedActions = categorizeDeliveryRiskActions(requiredActions)
  const openingActions = uniqueStrings([
    ...stringArray(raw?.opening_actions || raw?.openingActions),
    ...stagedActions.openingActions,
  ])
  const middleActions = uniqueStrings([
    ...stringArray(raw?.middle_actions || raw?.middleActions),
    ...stagedActions.middleActions,
  ])
  const endingActions = uniqueStrings([
    ...stringArray(raw?.ending_actions || raw?.endingActions),
    ...stagedActions.endingActions,
  ])
  const forbiddenRepeats = uniqueStrings(stringArray(raw?.forbidden_repeats || raw?.forbiddenRepeats))
  return {
    label: firstNonEmpty(raw?.label, Number.isFinite(totalCount) && totalCount > 0 ? `待修复 ${totalCount}` : ''),
    priorityLabel: firstNonEmpty(raw?.priority_label, raw?.priorityLabel, raw?.priority, raw?.focus),
    items,
    evidence,
    requiredActions: uniqueStrings([
      ...requiredActions,
      ...openingActions,
      ...middleActions,
      ...endingActions,
    ]),
    openingActions,
    middleActions,
    endingActions,
    forbiddenRepeats,
  }
}

export function categorizeDeliveryRiskActions(actions: string[]) {
  const openingActions: string[] = []
  const middleActions: string[] = []
  const endingActions: string[] = []

  for (const action of actions) {
    const normalized = text(action)
    if (!normalized) continue
    if (/前\s*300|开篇|开头|开场|承接|入口|第一场/.test(normalized)) {
      openingActions.push(normalized)
      continue
    }
    if (/章末|结尾|最后|追读|翻页|尾声|钩子/.test(normalized)) {
      endingActions.push(normalized)
      continue
    }
    middleActions.push(normalized)
  }

  return {
    openingActions: uniqueStrings(openingActions),
    middleActions: uniqueStrings(middleActions),
    endingActions: uniqueStrings(endingActions),
  }
}

export function previousEnding(previousChapter?: AnyRecord | null) {
  const hook = firstNonEmpty(previousChapter?.ending_hook, previousChapter?.endingHook, previousChapter?.hook)
  if (hook) return hook
  const prose = compactText(previousChapter?.chapter_text)
  if (prose) return prose.slice(-120)
  return '上一章尚无可用收束，请先确认承接点。'
}

export function whyItMatters(volumeGoal: string) {
  if (volumeGoal) return `本章要服务当前卷目标：${volumeGoal}`
  return '当前卷目标缺失，请先明确本章为什么值得写。'
}

export function toCockpitChapter(chapter: AnyRecord, context: { previousChapter?: AnyRecord | null; volumeGoal?: string; outline?: AnyRecord | null } = {}): WritingCockpitChapter {
  const plan = chapterPlanFields(chapter, context.outline)
  const rawPayload = chapter?.raw_payload || {}
  return {
    id: chapter?.id,
    chapterNo: Number(chapter?.chapter_no || 0),
    title: text(chapter?.title, '未命名章节'),
    goal: plan.goal,
    previousEnding: previousEnding(context.previousChapter),
    whyItMatters: whyItMatters(text(context.volumeGoal)),
    mustAdvance: stringArray(rawPayload?.must_advance),
    forbiddenRepeats: stringArray(rawPayload?.forbidden_repeats),
    chapterGoal: plan.goal,
    conflict: plan.conflict,
    endingHook: plan.endingHook,
    wordCount: hasProse(chapter)
      ? (chapter?.chapter_text ? compactWordCount(chapter.chapter_text) : Number(chapter?.word_count ?? chapter?.wordCount ?? 0) || 0)
      : 0,
    hasProse: hasProse(chapter),
    rawPayload,
  }
}

export function chooseNextChapter(chapters: AnyRecord[], activeChapter?: AnyRecord | null) {
  if (hasValidId(activeChapter)) return activeChapter as AnyRecord
  const sorted = sortChapters(chapters)
  return sorted.find(chapter => !hasProse(chapter)) || sorted[0] || null
}

export function buildReadinessChecks(args: {
  writingBibleReady: boolean
  volumeGoalReady: boolean
  hasChapter: boolean
  chapterOutlineReady: boolean
  materialsReady: boolean
  storyStateReady: boolean
  memoryReady: boolean
}): WritingReadinessCheck[] {
  return [
    args.writingBibleReady
      ? { key: 'writing_bible_ready', status: 'pass', label: '写作圣经已就绪', detail: '作品承诺可用于约束正文。', actionKey: 'open_writing_bible' }
      : { key: 'writing_bible_missing', status: 'blocker', label: '缺写作圣经', detail: '需要先补齐读者承诺或主线钩子。', actionKey: 'open_writing_bible' },
    args.volumeGoalReady
      ? { key: 'volume_goal_ready', status: 'pass', label: '卷目标已就绪', detail: '当前卷有可用目标。', actionKey: 'open_outline_panel' }
      : { key: 'volume_goal_missing', status: 'blocker', label: '缺卷目标', detail: '需要明确当前卷要兑现的主线目标。', actionKey: 'open_outline_panel' },
    args.hasChapter
      ? { key: 'chapter_ready', status: 'pass', label: '目标章节已选定', detail: '可以围绕目标章节组织生产。', actionKey: 'open_outline_panel' }
      : { key: 'chapter_missing', status: 'blocker', label: '缺目标章节', detail: '需要先创建或选择章节。', actionKey: 'open_outline_panel' },
    args.chapterOutlineReady
      ? { key: 'chapter_outline_ready', status: 'pass', label: '章节计划已就绪', detail: '章节任务、冲突和钩子可用。', actionKey: 'build_scene_plan' }
      : { key: 'chapter_outline_missing', status: 'blocker', label: '缺章节计划', detail: '需要补齐章节任务、冲突和结尾钩子。', actionKey: 'build_scene_plan' },
    args.materialsReady
      ? { key: 'materials_ready', status: 'pass', label: '生成材料已就绪', detail: '材料分满足本轮正文生成。', actionKey: 'repair_materials' }
      : { key: 'materials_not_ready', status: 'blocker', label: '材料未就绪', detail: '需要修复材料诊断后再生成。', actionKey: 'repair_materials' },
    args.storyStateReady
      ? { key: 'story_state_ready', status: 'pass', label: '故事状态已同步', detail: '故事状态与已写章节保持对齐。', actionKey: 'update_canon' }
      : { key: 'story_state_stale', status: 'warning', label: '故事状态可能滞后', detail: '建议同步最近已写章节的状态机。', actionKey: 'update_canon' },
    args.memoryReady
      ? { key: 'memory_ready', status: 'pass', label: '记忆摘要可用', detail: '长期记忆可辅助连续性判断。', actionKey: 'fix_continuity' }
      : { key: 'memory_unavailable', status: 'warning', label: '记忆摘要不可用', detail: '缺少可引用的记忆事实。', actionKey: 'fix_continuity' },
  ]
}

export function resolvePrimaryAction(args: {
  writingBibleReady: boolean
  hasChapter: boolean
  chapterOutlineReady: boolean
  materialsReady: boolean
  nextHasProse: boolean
  storyStateReady: boolean
}): { role: WritingCockpitRole; action: WritingCockpitActionKey } {
  if (!args.writingBibleReady) return { role: 'chief_editor', action: 'open_writing_bible' }
  if (!args.hasChapter) return { role: 'chief_editor', action: 'open_outline_panel' }
  if (!args.chapterOutlineReady) return { role: 'episode_planner', action: 'build_scene_plan' }
  if (!args.materialsReady) return { role: 'episode_planner', action: 'repair_materials' }
  if (!args.storyStateReady) return { role: 'continuity_auditor', action: 'update_canon' }
  if (args.nextHasProse) return { role: 'revision_editor', action: 'review_draft' }
  return { role: 'draft_writer', action: 'write_draft' }
}

export function pipelineState(nextChapter: AnyRecord | null) {
  if (!nextChapter) return { state: 'no_chapter' as const, label: '等待章节' }
  if (hasProse(nextChapter)) return { state: 'draft_generated' as const, label: '已有初稿' }
  return { state: 'no_draft' as const, label: '等待生成初稿' }
}

export function chapterPlanSourceLabel(chapter: AnyRecord, outline?: AnyRecord | null) {
  const chapterRaw = chapter?.raw_payload || {}
  const outlineRaw = outline?.raw_payload || {}
  if (chapterRaw?.source === 'rolling_plan' || outlineRaw?.source === 'rolling_plan' || chapterRaw?.rollingPlan || outlineRaw?.rollingPlan) return '滚动规划'
  if (outlineRaw?.source === 'future100' || outlineRaw?.future100 || outlineRaw?.skeleton) return '百章骨架'
  if (outline?.id || chapter?.outline_id) return '章节大纲'
  return '手动章节'
}

export function missingPlanItems(plan: { goal: string; conflict: string; endingHook: string }) {
  const items = [
    { field: 'chapter_goal', label: '章节目标', missing: !plan.goal },
    { field: 'conflict', label: '核心冲突', missing: !plan.conflict },
    { field: 'ending_hook', label: '章末钩子', missing: !plan.endingHook },
  ].filter(item => item.missing)
  return {
    fields: items.map(item => item.field),
    labels: items.map(item => item.label),
  }
}

export function writingQueueAction(status: WritingQueueItemStatus, missingLabels: string[] = []) {
  if (status === 'draft_generated') {
    return { actionLabel: '质检', actionHint: '进入交稿质检、编辑报告和故事状态同步。' }
  }
  if (status === 'needs_plan') {
    return { actionLabel: '补计划', actionHint: `先补${missingLabels.length > 0 ? missingLabels.join('、') : '章节目标、核心冲突、章末钩子'}。` }
  }
  return { actionLabel: '开写', actionHint: '进入本章任务书、场景卡和正文生成。' }
}

export function buildWritingQueue(chapters: AnyRecord[], outlines: AnyRecord[], nextChapter: AnyRecord | null): WritingQueueModel {
  if (!nextChapter) {
    return {
      visible: false,
      currentChapterNo: null,
      readyCount: 0,
      blockedCount: 0,
      draftedCount: 0,
      planRepair: {
        visible: false,
        label: '补齐队列计划',
        chapterCount: 0,
        missingCount: 0,
        chapterNos: [],
        intent: null,
      },
      items: [],
    }
  }
  const currentChapterNo = Number(nextChapter?.chapter_no || 0)
  const items = sortChapters(chapters)
    .filter(chapter => Number(chapter?.chapter_no || 0) >= currentChapterNo)
    .slice(0, 5)
    .map(chapter => {
      const outline = chapterFromOutline(outlines, chapter)
      const plan = chapterPlanFields(chapter, outline)
      const drafted = hasProse(chapter)
      const planReady = Boolean(plan.goal && plan.conflict && plan.endingHook)
      const status: WritingQueueItemStatus = drafted ? 'draft_generated' : planReady ? 'ready_to_draft' : 'needs_plan'
      const missing = missingPlanItems(plan)
      const action = writingQueueAction(status, missing.labels)
      return {
        id: chapter?.id,
        chapterNo: Number(chapter?.chapter_no || 0),
        title: text(chapter?.title, '未命名章节'),
        sourceLabel: chapterPlanSourceLabel(chapter, outline),
        status,
        statusLabel: status === 'draft_generated' ? '待质检' : status === 'ready_to_draft' ? '可开写' : '缺计划',
        actionLabel: action.actionLabel,
        actionHint: action.actionHint,
        missingPlanFields: status === 'needs_plan' ? missing.fields : [],
        missingPlanLabels: status === 'needs_plan' ? missing.labels : [],
        repairIntent: status === 'needs_plan'
          ? {
              source: 'writing_queue_plan_repair',
              chapter_id: chapter?.id,
              chapter_no: Number(chapter?.chapter_no || 0),
              missing_fields: missing.fields,
              missing_labels: missing.labels,
            }
          : null,
        goal: plan.goal,
        conflict: plan.conflict,
        endingHook: plan.endingHook,
        wordCount: drafted ? compactWordCount(chapter?.chapter_text) : 0,
      }
    })
  const blockedItems = items.filter(item => item.status === 'needs_plan')
  const planRepair = {
    visible: blockedItems.length > 1,
    label: '补齐队列计划',
    chapterCount: blockedItems.length,
    missingCount: blockedItems.reduce((sum, item) => sum + item.missingPlanFields.length, 0),
    chapterNos: blockedItems.map(item => item.chapterNo),
    intent: blockedItems.length > 0
      ? {
          source: 'writing_queue_batch_plan_repair',
          chapter_nos: blockedItems.map(item => item.chapterNo),
          chapters: blockedItems.map(item => ({
            chapter_id: item.id,
            chapter_no: item.chapterNo,
            title: item.title,
            source_label: item.sourceLabel,
            missing_fields: item.missingPlanFields,
            missing_labels: item.missingPlanLabels,
          })),
        }
      : null,
  }
  return {
    visible: items.length > 0,
    currentChapterNo,
    readyCount: items.filter(item => item.status === 'ready_to_draft').length,
    blockedCount: blockedItems.length,
    draftedCount: items.filter(item => item.status === 'draft_generated').length,
    planRepair,
    items,
  }
}


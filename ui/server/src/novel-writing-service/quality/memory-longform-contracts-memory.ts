import { asArray, parseJsonLikePayload } from '../../routes/novel-route-utils'
import { mergeEstablishedEvents, projectCanonFactsFromEvents } from '../../novel-writing/established-event-canon'
import { normalizeLongformCompass } from '../../novel-writing/longform-compass'
import { reviewTimestamp } from './review-lookup'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

export function normalizeMemoryTextItem(value: any) {
  if (typeof value === 'string') return compactBriefText(value)
  if (!value || typeof value !== 'object') return ''
  const name = compactBriefText(value.name || value.title || value.key)
  const state = compactBriefText(value.state || value.current_state || value.currentState || value.summary || value.description || value.text)
  const chapterNo = Number(value.chapter_no || value.chapterNo || value.last_updated_chapter || value.lastUpdatedChapter || 0)
  const chapterLabel = chapterNo ? `@第${chapterNo}章` : ''
  return compactBriefText([name, state].filter(Boolean).join('：') + chapterLabel)
}

export function normalizeLongformMemoryCapsule(value: any) {
  const raw = value?.longform_memory_capsule || value?.longformMemoryCapsule || value?.longform_memory_anchor || value?.longformMemoryAnchor || value || {}
  const characterStates = Array.from(new Set([
    ...asArray(raw.character_states),
    ...asArray(raw.characterStates),
    ...asArray(raw.characters),
  ].map(normalizeMemoryTextItem).filter(Boolean))).slice(0, 10)
  const openQuestions = Array.from(new Set([
    ...asArray(raw.open_questions),
    ...asArray(raw.openQuestions),
    ...asArray(raw.unresolved_questions),
    ...asArray(raw.unresolvedQuestions),
  ].map(normalizeMemoryTextItem).filter(Boolean))).slice(0, 10)
  const payoffDebts = Array.from(new Set([
    ...asArray(raw.payoff_debts),
    ...asArray(raw.payoffDebts),
    ...asArray(raw.debts),
    ...asArray(raw.reader_debts),
  ].map(normalizeMemoryTextItem).filter(Boolean))).slice(0, 10)
  const canonFacts = Array.from(new Set([
    ...asArray(raw.canon_facts),
    ...asArray(raw.canonFacts),
    ...asArray(raw.facts),
  ].map(normalizeMemoryTextItem).filter(Boolean))).slice(0, 10)
  const redLines = Array.from(new Set([
    ...asArray(raw.red_lines),
    ...asArray(raw.redLines),
    ...asArray(raw.immutable_rules),
    ...asArray(raw.immutableRules),
  ].map(normalizeMemoryTextItem).filter(Boolean))).slice(0, 10)
  const capsule = {
    last_updated_chapter: Number(raw.last_updated_chapter || raw.lastUpdatedChapter || 0) || null,
    core_promise: compactBriefText(raw.core_promise || raw.corePromise || raw.reader_promise || raw.readerPromise),
    current_volume_goal: compactBriefText(raw.current_volume_goal || raw.currentVolumeGoal || raw.volume_goal || raw.volumeGoal),
    mainline_progress: compactBriefText(raw.mainline_progress || raw.mainlineProgress || raw.current_mainline || raw.currentMainline),
    character_states: characterStates,
    open_questions: openQuestions,
    payoff_debts: payoffDebts,
    canon_facts: canonFacts,
    red_lines: redLines,
  }
  const hasCapsule = Boolean(
    capsule.last_updated_chapter
    || capsule.core_promise
    || capsule.current_volume_goal
    || capsule.mainline_progress
    || capsule.character_states.length
    || capsule.open_questions.length
    || capsule.payoff_debts.length
    || capsule.canon_facts.length
    || capsule.red_lines.length
  )
  return hasCapsule ? capsule : null
}

export function normalizeLayeredMemoryDetail(item: any) {
  if (typeof item === 'string') return compactBriefText(item)
  if (!item || typeof item !== 'object') return ''
  const chapterNo = Number(item.chapter_no || item.chapterNo || item.no || 0)
  const chapterLabel = chapterNo ? `第${chapterNo}章` : compactBriefText(item.range || item.chapter_range || item.chapterRange || item.volume || item.title || item.name)
  const summary = compactBriefText(item.summary || item.core_events || item.coreEvents || item.mainline_progress || item.mainlineProgress || item.text || item.description)
  const stateChanges = asArray(item.state_changes || item.stateChanges || item.character_state_changes || item.characterStateChanges)
    .map(normalizeMemoryTextItem)
    .filter(Boolean)
  const foreshadowing = asArray(item.foreshadowing || item.foreshadowing_updates || item.foreshadowingUpdates || item.open_questions || item.openQuestions)
    .map(normalizeMemoryTextItem)
    .filter(Boolean)
  const turningPoint = compactBriefText(item.turning_point || item.turningPoint)
  const parts = [
    chapterLabel,
    summary,
    stateChanges.length ? `状态：${stateChanges.join('；')}` : '',
    foreshadowing.length ? `伏笔/悬念：${foreshadowing.join('；')}` : '',
    turningPoint ? `转折：${turningPoint}` : '',
  ].filter(Boolean)
  return compactBriefText(parts.join('｜'))
}

export function normalizeLayeredMemoryArchiveRef(item: any) {
  if (typeof item === 'string') return compactBriefText(item)
  if (!item || typeof item !== 'object') return ''
  const range = compactBriefText(item.range || item.chapter_range || item.chapterRange || item.label || item.title)
  const path = compactBriefText(item.path || item.file || item.file_path || item.filePath || item.archive_path || item.archivePath)
  const summary = compactBriefText(item.summary || item.description || item.core_events || item.coreEvents || item.text)
  return compactBriefText([range, path, summary].filter(Boolean).join('｜'))
}

export function layeredMemoryChapterNo(text: string) {
  const match = String(text || '').match(/第\s*([0-9]+)\s*章/)
  return match ? Number(match[1] || 0) : 0
}

export function latestFiveLayeredMemoryDetails(details: string[]) {
  const unique = uniqueBriefStrings(details, 12)
  if (unique.length <= 5) return unique
  const chapterNos = unique
    .map(layeredMemoryChapterNo)
    .filter(chapterNo => chapterNo > 0)
    .sort((a, b) => b - a)
    .slice(0, 5)
  if (!chapterNos.length) return unique.slice(-5)
  const latest = new Set(chapterNos)
  const selected = unique.filter((text, index) => {
    const chapterNo = layeredMemoryChapterNo(text)
    if (chapterNo > 0) return latest.has(chapterNo)
    return index >= unique.length - 5
  })
  return selected.length > 5 ? selected.slice(-5) : selected
}

export function normalizeLayeredMemoryContext(value: any) {
  const raw = value?.layered_memory_context
    || value?.layeredMemoryContext
    || value?.longform_layered_memory
    || value?.longformLayeredMemory
    || value
    || {}
  const recentChapterDetails = latestFiveLayeredMemoryDetails([
    ...asArray(raw.recent_chapter_details),
    ...asArray(raw.recentChapterDetails),
    ...asArray(raw.recent_chapters),
    ...asArray(raw.recentChapters),
    ...asArray(raw.near_5_chapter_details),
    ...asArray(raw.near5ChapterDetails),
  ].map(normalizeLayeredMemoryDetail).filter(Boolean))
  const tenChapterSummaries = uniqueBriefStrings([
    ...asArray(raw.ten_chapter_summaries),
    ...asArray(raw.tenChapterSummaries),
    ...asArray(raw.ten_chapter_overview),
    ...asArray(raw.tenChapterOverview),
    ...asArray(raw.decadal_summaries),
    ...asArray(raw.decadalSummaries),
  ].map(normalizeLayeredMemoryDetail).filter(Boolean), 8)
  const volumeOverview = uniqueBriefStrings([
    ...asArray(raw.volume_overview),
    ...asArray(raw.volumeOverview),
    ...asArray(raw.volume_summaries),
    ...asArray(raw.volumeSummaries),
  ].map(normalizeLayeredMemoryDetail).filter(Boolean), 6)
  const redLines = uniqueBriefStrings([
    ...asArray(raw.red_lines),
    ...asArray(raw.redLines),
    ...asArray(raw.immutable_rules),
    ...asArray(raw.immutableRules),
  ].map(normalizeMemoryTextItem).filter(Boolean), 10)
  const archiveRefs = uniqueBriefStrings([
    ...asArray(raw.archive_refs),
    ...asArray(raw.archiveRefs),
    ...asArray(raw.archive_index),
    ...asArray(raw.archiveIndex),
    ...asArray(raw.archives),
  ].map(normalizeLayeredMemoryArchiveRef).filter(Boolean), 10)
  const context = {
    source: compactBriefText(raw.source, 'oh_story_layered_memory_v1'),
    recent_chapter_details: recentChapterDetails,
    ten_chapter_summaries: tenChapterSummaries,
    volume_overview: volumeOverview,
    archive_refs: archiveRefs,
    red_lines: redLines,
  }
  const hasContext = Boolean(
    context.recent_chapter_details.length
    || context.ten_chapter_summaries.length
    || context.volume_overview.length
    || context.archive_refs.length
    || context.red_lines.length
  )
  return hasContext ? context : null
}

export function normalizeDailyProgressSummary(value: any = {}) {
  const raw = value?.progress_summary || value?.progressSummary || value || {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const notes = asArray(raw.notes || raw.注意事项 || raw.key_decisions || raw.keyDecisions)
    .map((item: any) => compactBriefText(item, 120))
    .filter(Boolean)
    .slice(0, 8)
  const recentChangedCharacters = asArray(raw.recent_changed_characters || raw.recentChangedCharacters || raw.changed_characters || raw.changedCharacters)
    .map((item: any) => compactBriefText(item?.name || item, 32))
    .filter(Boolean)
    .slice(0, 8)
  const lastCompletedChapter = Number(raw.last_completed_chapter ?? raw.lastCompletedChapter ?? raw.last_chapter_no ?? raw.lastChapterNo ?? 0)
  const completedChapterCount = Number(raw.completed_chapter_count ?? raw.completedChapterCount ?? raw.completed_count ?? raw.completedCount ?? 0)
  const completedWordCount = Number(raw.completed_word_count ?? raw.completedWordCount ?? raw.word_count ?? raw.wordCount ?? 0)
  const activeForeshadowingCount = Number(raw.active_foreshadowing_count ?? raw.activeForeshadowingCount ?? raw.active_foreshadowing ?? raw.activeForeshadowing ?? 0)
  const nextOutlineStatus = compactBriefText(raw.next_outline_status || raw.nextOutlineStatus || raw.next_chapter_outline_status || raw.nextChapterOutlineStatus, 40)
  const updatedAt = compactBriefText(raw.updated_at || raw.updatedAt, 40)
  if (!lastCompletedChapter && !completedChapterCount && !completedWordCount && !activeForeshadowingCount && !nextOutlineStatus && !updatedAt && !notes.length && !recentChangedCharacters.length) {
    return null
  }
  return {
    last_completed_chapter: lastCompletedChapter || null,
    updated_at: updatedAt || null,
    completed_chapter_count: completedChapterCount || null,
    completed_word_count: completedWordCount || null,
    active_foreshadowing_count: activeForeshadowingCount || null,
    recent_changed_characters: recentChangedCharacters,
    next_outline_status: nextOutlineStatus || null,
    notes,
  }
}

export function normalizeDailyContextSnapshot(value: any = {}) {
  const raw = value?.daily_context_snapshot || value?.dailyContextSnapshot || value || {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const textItem = (item: any) => compactBriefText(item?.summary || item?.detail || item?.text || item?.name || item)
  const currentChapter = Number(
    raw.current_chapter
    ?? raw.currentChapter
    ?? raw.chapter_no
    ?? raw.chapterNo
    ?? raw['当前位置/章']
    ?? raw.当前位置章
    ?? 0,
  )
  const currentScene = compactBriefText(
    raw.current_scene
    || raw.currentScene
    || raw.scene
    || raw['当前位置/场景']
    || raw.当前位置场景,
  )
  const currentEmotionTarget = compactBriefText(
    raw.current_emotion_target
    || raw.currentEmotionTarget
    || raw.emotion_target
    || raw.emotionTarget
    || raw['当前位置/情绪目标']
    || raw.当前位置情绪目标,
  )
  const writingChanges = uniqueBriefStrings(
    asArray(raw.writing_changes || raw.writingChanges || raw['本次写作变更'] || raw.本次写作变更)
      .map(textItem)
      .filter(Boolean),
    8,
  )
  const pendingClues = uniqueBriefStrings(
    asArray(raw.pending_clues || raw.pendingClues || raw.open_clues || raw.openClues || raw['待处理线索'] || raw.待处理线索)
      .map(textItem)
      .filter(Boolean),
    8,
  )
  if (!currentChapter && !currentScene && !currentEmotionTarget && !writingChanges.length && !pendingClues.length) {
    return null
  }
  return {
    source: compactBriefText(raw.source, 'oh_story_daily_context_snapshot_v1'),
    current_chapter: currentChapter || null,
    current_scene: currentScene || null,
    current_emotion_target: currentEmotionTarget || null,
    writing_changes: writingChanges,
    pending_clues: pendingClues,
  }
}

const OH_STORY_FORESHADOWING_DAILY_SCOPE_RULES = [
  '日更范围：只确认本轮新增/推进/回收的伏笔已写入追踪/伏笔.md并更新状态。',
  '不得在日更流程中通读所有 session 或扫描全部正文做全量伏笔审计。',
  '全量伏笔审计只在 /story-review 或用户明确要求“全面检查伏笔”时执行。',
]

const OH_STORY_FORESHADOWING_STATUS_RULES = [
  '未埋、已埋、已回收属于正常状态，不应自动当作一致性债务。',
  '只有已过期需要 /story-review 或显式修复，修复前不得强行改写正文事实。',
  'SessionStart 不应因未埋、已埋或已回收报警；日更只处理本轮新增、推进或回收的伏笔。',
]

export function normalizeForeshadowingConsistencyRadar(value: any = {}, targetChapterNo = 0) {
  const raw = value?.foreshadowing_consistency_radar
    || value?.foreshadowingConsistencyRadar
    || value?.foreshadowing_debt_context
    || value?.foreshadowingDebtContext
    || value
    || {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const targetNo = Number(targetChapterNo || raw.target_chapter_no || raw.targetChapterNo || raw.chapter_no || raw.chapterNo || 0)
  const textItem = (item: any) => compactBriefText(item?.text || item?.summary || item?.detail || item?.name || item)
  const directActiveRows = asArray(raw.active || raw.active_items || raw.activeItems)
    .map(textItem)
    .filter(Boolean)
  const directActive = uniqueBriefStrings(directActiveRows, 12)
  const directOverdue = uniqueBriefStrings(asArray(raw.overdue || raw.overdue_items || raw.overdueItems)
    .map(textItem)
    .filter(Boolean), 12)
  const hasDirectLists = directActive.length || directOverdue.length
  const statusSource = raw.foreshadowing_status
    || raw.foreshadowingStatus
    || raw.items
    || raw.foreshadowing
    || raw.foreshadowing_items
    || raw.foreshadowingItems
    || (!hasDirectLists ? raw : null)
  const statusRows = Array.isArray(statusSource)
    ? statusSource.map((item: any) => ['', item])
    : statusSource && typeof statusSource === 'object'
      ? Object.entries(statusSource)
      : []
  const payoffRows = asArray(raw.payoff_queue || raw.payoffQueue)
    .map((item: any, index: number) => [`payoff_queue_${index + 1}`, typeof item === 'object' ? item : { name: item, status: 'active' }])
  const explicitDensityWarnings = uniqueBriefStrings(asArray(raw.density_warnings || raw.densityWarnings || raw.foreshadowing_density_warnings || raw.foreshadowingDensityWarnings)
    .map(textItem)
    .filter(Boolean), 8)
  const entries = [...statusRows, ...payoffRows]
    .map(([key, item]: any) => {
      const source = item && typeof item === 'object' && !Array.isArray(item) ? item : { note: item }
      const name = compactBriefText(source.name || source.title || source.key || key)
      if (!name || ['source', 'active_count', 'activeCount', 'overdue_count', 'overdueCount', 'density_warnings', 'densityWarnings'].includes(name)) return null
      const status = compactBriefText(source.status || source.state || source.payoff_status || source.payoffStatus || source.resolution_status || source.resolutionStatus, 'active')
      const normalizedStatus = status.toLowerCase()
      const closed = ['paid', 'done', 'resolved', 'closed', 'complete', 'completed', 'settled'].includes(normalizedStatus)
        || /^(已回收|已兑现|完成|关闭)$/.test(status)
      const expired = ['expired', 'overdue', 'stale'].includes(normalizedStatus)
        || /^(已过期|过期|错过回收窗口)$/.test(status)
      if (closed) return null
      const plantedChapter = Number(
        source.planted_chapter
        ?? source.plantedChapter
        ?? source.first_chapter_no
        ?? source.firstChapterNo
        ?? source.chapter_no
        ?? source.chapterNo
        ?? 0,
      )
      const lastTouchedChapter = Number(
        source.last_touched_chapter
        ?? source.lastTouchedChapter
        ?? source.last_update_chapter
        ?? source.lastUpdateChapter
        ?? source.last_updated_chapter
        ?? source.lastUpdatedChapter
        ?? 0,
      )
      const plannedPayoffChapter = Number(
        source.planned_payoff_chapter
        ?? source.plannedPayoffChapter
        ?? source.payoff_chapter
        ?? source.payoffChapter
        ?? source.target_payoff_chapter
        ?? source.targetPayoffChapter
        ?? 0,
      )
      const age = Number(source.age ?? source.chapter_age ?? source.chapterAge ?? 0)
        || (targetNo && plantedChapter ? Math.max(0, targetNo - plantedChapter) : 0)
      const note = compactBriefText(source.note || source.notes || source.summary || source.detail || source.evidence || source.source_excerpt || source.sourceExcerpt)
      const overdue = Boolean(source.overdue ?? source.is_overdue ?? source.isOverdue)
        || expired
        || (age > 50 && !closed)
      const volumeNo = Number(source.volume_no ?? source.volumeNo ?? source.volume ?? source.arc_no ?? source.arcNo ?? 0)
        || (plantedChapter ? Math.max(1, Math.ceil(plantedChapter / 50)) : 0)
      const text = [
        name,
        status ? `状态：${status}` : '',
        age ? `已延迟${age}章` : '',
        plantedChapter ? `埋设：第${plantedChapter}章` : '',
        lastTouchedChapter ? `最近触碰：第${lastTouchedChapter}章` : '',
        plannedPayoffChapter ? `计划回收：第${plannedPayoffChapter}章` : '',
        note,
      ].filter(Boolean).join('；')
      return { name, text, overdue, volumeNo }
    })
    .filter(Boolean)
  const active = uniqueBriefStrings([
    ...directActive,
    ...entries.map((item: any) => item.text),
  ], 12)
  const overdue = uniqueBriefStrings([
    ...directOverdue,
    ...entries.filter((item: any) => item.overdue).map((item: any) => item.text),
  ], 12)
  const densityWarnings = uniqueBriefStrings([
    ...explicitDensityWarnings,
    ...Array.from(entries.reduce((map: Map<number, number>, item: any) => {
      const volumeNo = Number(item.volumeNo || 0)
      if (!volumeNo) return map
      map.set(volumeNo, (map.get(volumeNo) || 0) + 1)
      return map
    }, new Map<number, number>()).entries())
      .map(([volumeNo, count]: any) => {
        if (count > 15) return `SC-FORESHADOW：第${volumeNo}卷活跃伏笔${count}条，伏笔太密，读者可能记不住且互相冲淡；按 S4 提醒，下一章优先推进、合并或休眠说明。`
        if (count > 0 && count < 3) return `SC-FORESHADOW：第${volumeNo}卷活跃伏笔${count}条，伏笔太疏，连载悬念和粘性可能不足；按 S4 提醒，下一章可补自然线索或明确本卷主悬念。`
        return ''
      })
      .filter(Boolean),
  ], 8)
  if (!active.length && !overdue.length && !densityWarnings.length) return null
  const activeTotalCount = Number(raw.active_count ?? raw.activeCount ?? 0)
    || Math.max(entries.length, directActiveRows.length, active.length)
  return {
    source: compactBriefText(raw.source, 'oh_story_consistency_checker_foreshadowing_v1'),
    active,
    active_count: activeTotalCount,
    overdue,
    overdue_count: Number(raw.overdue_count ?? raw.overdueCount ?? overdue.length) || overdue.length,
    density_warnings: densityWarnings,
    density_warning_count: Number(raw.density_warning_count ?? raw.densityWarningCount ?? densityWarnings.length) || densityWarnings.length,
    scope_rules: uniqueBriefStrings([
      ...asArray(raw.scope_rules || raw.scopeRules || raw.daily_scope_rules || raw.dailyScopeRules).map(textItem),
      ...OH_STORY_FORESHADOWING_DAILY_SCOPE_RULES,
    ].filter(Boolean), 8),
    status_rules: uniqueBriefStrings([
      ...asArray(raw.status_rules || raw.statusRules || raw.status_semantics || raw.statusSemantics).map(textItem),
      ...OH_STORY_FORESHADOWING_STATUS_RULES,
    ].filter(Boolean), 8),
    guardrails: uniqueBriefStrings([
      ...asArray(raw.guardrails || raw.guardrail || raw.rules).map(textItem),
      '超过50章未回收的伏笔按 S4 关注，下一章要推进、保持存在感或明确暂缓理由。',
      'SC-FORESHADOW 伏笔密度只作为 S4 建议：3-15 个/卷为参考范围，太密要合并/推进/休眠，太疏要补自然线索或明确主悬念。',
      '伏笔回收不得和后续新增设定、角色知识边界、时间线或物品归属冲突。',
    ].filter(Boolean), 8),
  }
}

export function buildMergedLayeredMemoryContext(prev: any, delta: any, chapter: any = {}) {
  const previous = normalizeLayeredMemoryContext(prev)
  const next = normalizeLayeredMemoryContext(delta)
  if (!previous && !next) return null
  const merged = {
    source: next?.source || previous?.source || 'oh_story_layered_memory_v1',
    recent_chapter_details: latestFiveLayeredMemoryDetails(next?.recent_chapter_details?.length ? next.recent_chapter_details : previous?.recent_chapter_details || []),
    ten_chapter_summaries: next?.ten_chapter_summaries?.length ? next.ten_chapter_summaries : previous?.ten_chapter_summaries || [],
    volume_overview: next?.volume_overview?.length ? next.volume_overview : previous?.volume_overview || [],
    archive_refs: uniqueBriefStrings([
      ...asArray(previous?.archive_refs),
      ...asArray(next?.archive_refs),
    ], 10),
    red_lines: uniqueBriefStrings([
      ...asArray(previous?.red_lines),
      ...asArray(next?.red_lines),
    ], 10),
    last_updated_chapter: Number(chapter?.chapter_no || next?.last_updated_chapter || previous?.last_updated_chapter || 0) || null,
  }
  return normalizeLayeredMemoryContext(merged)
    ? merged
    : null
}

export function buildLongformMemoryCapsule(project: any, writingBible: any) {
  const storyState = project?.reference_config?.story_state || project?.story_state || {}
  const global = storyState?.global || storyState || {}
  return normalizeLongformMemoryCapsule({
    last_updated_chapter: storyState.last_updated_chapter || global.last_updated_chapter,
    core_promise: writingBible?.reader_promise || writingBible?.promise || writingBible?.core_selling_point || global.reader_promise || global.core_promise || project?.synopsis,
    current_volume_goal: global.current_volume_goal || global.volume_goal || storyState.current_volume_goal || storyState.volume_goal,
    mainline_progress: global.mainline_progress || global.current_mainline || global.mainline || storyState.mainline_progress || storyState.current_mainline || storyState.mainline,
    character_states: [
      ...asArray(storyState.character_states),
      ...asArray(global.character_states),
      ...asArray(storyState.characters),
      ...asArray(global.characters),
    ],
    open_questions: [
      ...asArray(storyState.open_questions),
      ...asArray(global.open_questions),
      ...asArray(storyState.unresolved_questions),
      ...asArray(global.unresolved_questions),
    ],
    payoff_debts: [
      ...asArray(storyState.payoff_debts),
      ...asArray(global.payoff_debts),
      ...asArray(storyState.payoff_queue),
      ...asArray(global.payoff_queue),
    ],
    canon_facts: Array.from(new Set([
      ...projectCanonFactsFromEvents(mergeEstablishedEvents([
        ...asArray(storyState.established_events),
        ...asArray(global.established_events),
        ...asArray(storyState.canon_facts),
        ...asArray(global.canon_facts),
        ...asArray(storyState.facts),
        ...asArray(global.facts),
      ], [])),
      ...asArray(storyState.canon_facts).map((item: any) => typeof item === 'string' ? item : (item?.fact || item?.text || '')).filter(Boolean),
      ...asArray(global.canon_facts).map((item: any) => typeof item === 'string' ? item : (item?.fact || item?.text || '')).filter(Boolean),
    ].map((item: any) => String(item || '').trim()).filter(Boolean))).slice(0, 12),
    red_lines: [
      ...asArray(writingBible?.immutable_rules),
      ...asArray(writingBible?.immutableRules),
      ...asArray(global.red_lines),
      ...asArray(storyState.red_lines),
    ],
  })
}

const LONGFORM_BATTLE_LANE_LABELS: Record<string, string> = {
  story_core: '核心守恒',
  reader_pull: '读者拉力',
  storyline: '剧情线调度',
  volume_beat: '卷级爆点',
  innovation_ip: '创新/IP场面',
  production_fuel: '生产燃料',
}


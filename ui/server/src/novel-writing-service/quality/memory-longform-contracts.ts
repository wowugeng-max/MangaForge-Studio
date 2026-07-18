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

export function isLongformBattleLaneRisk(status: string, score: number | null) {
  const normalized = status.toLowerCase()
  if (['block', 'blocked', 'warn', 'warning', 'needs_action', 'risk'].includes(normalized)) return true
  if (Number.isFinite(Number(score)) && Number(score) < 78) return true
  return false
}

export function normalizeLongformBattleLane(item: any) {
  if (typeof item === 'string') {
    const detail = compactBriefText(item)
    if (!detail) return null
    return {
      key: detail,
      label: detail,
      status: 'warn',
      score: null,
      detail,
      required_action: '',
    }
  }
  const key = compactBriefText(item?.key || item?.lane_key || item?.laneKey)
  const label = compactBriefText(item?.label || item?.title, LONGFORM_BATTLE_LANE_LABELS[key] || key)
  const detail = compactBriefText(item?.detail || item?.summary || item?.reason || item?.risk)
  const requiredAction = compactBriefText(
    item?.required_action || item?.requiredAction || item?.action || item?.action_label || item?.actionLabel,
  )
  const score = Number.isFinite(Number(item?.score)) ? Number(item.score) : null
  const status = compactBriefText(item?.status, score !== null && score < 78 ? 'warn' : 'ok')
  if (!key && !label && !detail && !requiredAction) return null
  return {
    key: key || label,
    label: label || key,
    status,
    score,
    detail,
    required_action: requiredAction,
  }
}

export function normalizeLongformBattleContext(value: any) {
  const raw = value?.longform_battle_context || value?.longformBattleContext || value?.longform_battle_desk || value?.longformBattleDesk || value || {}
  const lanes = asArray(raw.lanes).map(normalizeLongformBattleLane).filter(Boolean).slice(0, 8)
  const explicitRiskLanes = [
    ...asArray(raw.risk_lanes || raw.riskLanes),
    ...asArray(raw.risk_items || raw.riskItems || raw.risks),
  ]
    .map(normalizeLongformBattleLane)
    .filter(Boolean)
  const riskLanes = (explicitRiskLanes.length ? explicitRiskLanes : lanes.filter((lane: any) => isLongformBattleLaneRisk(lane.status, lane.score))).slice(0, 6)
  const primaryActionRaw = raw.primary_action || raw.primaryAction || {}
  const primaryAction = {
    key: compactBriefText(primaryActionRaw.key),
    label: compactBriefText(primaryActionRaw.label || primaryActionRaw.title || raw.primary_action_label || raw.primaryActionLabel),
    reason: compactBriefText(primaryActionRaw.reason || primaryActionRaw.detail || raw.primary_action_reason || raw.primaryActionReason),
  }
  const riskChips = Array.from(new Set([
    ...asArray(raw.risk_chips),
    ...asArray(raw.riskChips),
    ...asArray(raw.risk_items),
    ...asArray(raw.riskItems),
    ...riskLanes.map((lane: any) => lane.label || lane.detail),
  ].map(item => compactBriefText(item)).filter(Boolean))).slice(0, 8)
  const summary = compactBriefText(raw.summary || raw.detail || raw.reason || (riskLanes.length ? `本章需处理：${riskLanes.map((lane: any) => lane.label).join('、')}` : ''))
  const status = compactBriefText(raw.status, riskLanes.some((lane: any) => String(lane.status).toLowerCase().includes('block')) ? 'blocked' : riskLanes.length ? 'needs_action' : 'ready')
  const score = Number.isFinite(Number(raw.score)) ? Number(raw.score) : null
  if (!summary && !lanes.length && !riskLanes.length && !riskChips.length) return null

  return {
    status,
    score,
    summary,
    risk_chips: riskChips,
    primary_action: primaryAction.label || primaryAction.reason || primaryAction.key ? primaryAction : null,
    lanes,
    risk_lanes: riskLanes,
  }
}

export function longformBattleContextFromContext(contextPackage: any = {}, preDraftBrief: any = null, chapter: any = {}) {
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const brief = preDraftBrief
    || contextPackage?.pre_draft_brief
    || contextPackage?.preDraftBrief
    || target?.pre_draft_brief
    || target?.preDraftBrief
    || chapter?.raw_payload?.pre_draft_brief
    || chapter?.raw_payload?.preDraftBrief
    || {}
  return target.longform_battle_context
    || target.longformBattleContext
    || target.longform_battle_desk
    || target.longformBattleDesk
    || brief.longform_battle_context
    || brief.longformBattleContext
    || brief.longform_battle_desk
    || brief.longformBattleDesk
    || contextPackage?.longform_battle_context
    || contextPackage?.longformBattleContext
    || contextPackage?.longform_battle_desk
    || contextPackage?.longformBattleDesk
    || chapter?.raw_payload?.longform_battle_context
    || chapter?.raw_payload?.longformBattleContext
    || chapter?.raw_payload?.longform_battle_desk
    || chapter?.raw_payload?.longformBattleDesk
    || null
}

export function latestLongformCompassFromReviews(reviews: any[]) {
  const review = reviews
    .filter(item => item?.review_type === 'longform_creation_diagnosis')
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0]
  const payload = parseJsonLikePayload(review?.payload) || {}
  const report = payload.report || payload.result?.report || payload
  return normalizeLongformCompass(report?.compass || report?.longform_compass || null)
}

export function normalizeNextBatchChapter(item: any) {
  const chapterNo = Number(item?.chapter_no || item?.chapterNo || 0)
  if (!chapterNo) return null
  return {
    chapter_no: chapterNo,
    title: compactBriefText(item?.title, `第${chapterNo}章`),
    chapter_task: compactBriefText(item?.chapter_task || item?.chapterTask || item?.task || item?.chapter_goal || item?.chapterGoal),
    conflict: compactBriefText(item?.conflict),
    ending_hook: compactBriefText(item?.ending_hook || item?.endingHook || item?.hook),
    mainline_progress: compactBriefText(item?.mainline_progress || item?.mainlineProgress),
  }
}

export function normalizeNextBatchChecklistItem(item: any) {
  const key = compactBriefText(item?.key)
  const label = compactBriefText(item?.label || item?.name || key)
  const statusRaw = compactBriefText(item?.status)
  const status = ['ok', 'warn', 'block'].includes(statusRaw) ? statusRaw : statusRaw === 'blocked' ? 'block' : statusRaw || 'warn'
  const detail = compactBriefText(item?.detail || item?.summary || item?.description)
  if (!key && !label && !detail) return null
  return {
    key,
    label,
    status,
    detail,
  }
}

export function chapterNosBrief(chapterNos: any[] = []) {
  return asArray(chapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
    .map((chapterNo: number) => `第${chapterNo}章`)
    .join('、')
}

const OH_STORY_NEXT_BATCH_WORKFLOW_RULES = [
  '快速上下文加载：如已部署 story-explorer，先用 context_load 批量加载第 N 章写作上下文；agent 不可用或返回不完整时回退到手动加载；手动加载兜底表：追踪/上下文.md 缺失时从 追踪/伏笔.md + 追踪/时间线.md 重建，追踪/伏笔.md 缺失可跳过，追踪/时间线.md 缺失可从正文推断，大纲/细纲_第{N}章.md 缺失必须先补建；确定本轮写作范围后直接进入 Step 2，不做“是否继续”式确认；确定下一章编号 N 时优先读取追踪/上下文.md 的“最后完成章节”并 +1，文件不存在时扫描 正文/ 目录中编号最大的章节 +1；K 默认 2-3 章，用户明确说“只写1章”“日更3章”或“逐章确认”时按用户要求调整。',
  '继续/续写/日更只表示继续当前日更批量流程，不得解释为跳过写前准备的直接正文续写。',
  '读取细纲时，新版细纲优先读取内容概括、情节安排、人物关系和出场顺序、情节细化、结尾设定和钩子；从细纲中提取本章涉及的角色名，按需加载 设定/角色/{角色名}.md，细纲未列出角色时跳过，不凭聊天记忆补名单；按需加载创作公式：只有本章需要期待感公式、爽点公式、信息差公式或题材结构骨架时，才读取 references/genre-writing-formulas.md，默认不加载，避免无条件加载 1500+ 行文件浪费 token；旧版细纲缺这些字段不阻塞，回退到核心事件、目标情绪、章首/章尾钩子和字数目标。',
  '细纲缺失补建流程：细纲不存在时不能直接写正文；先读取大纲/卷纲_当前卷.md、设定/角色/{角色名}.md和最新一章正文，按新版细纲模板补齐内容概括、情节安排、人物关系/出场顺序、情节细化、结尾设定；无法确认字段写 [待补充]，不杜撰。',
  'Step 2.1 标题预检：每章开写前扫描既有章节标题；如本章标题同名或明显重复，先按本章核心事件改名，可参考冲突转折、关键资产或章尾钩子，并同步细纲标题与正文文件名。',
  '新版细纲进入意图确认时：内容概括决定起承转合，情节安排决定主线/辅线/事件线/感情线/逻辑线取舍，人物关系和出场顺序决定镜头进入顺序，情节细化决定代价兑现/收益兑现，结尾设定和钩子决定章尾承接。',
  'Step 2.3 对标召回：每章写前必须尝试读取剧情/情绪模块.md、剧情/节奏.md、文风.md和匹配章节摘要；情绪模块/节奏参照优先，文风.md 只管表达层；gaps/conflict 必须进入意图确认，不得用文风接近掩盖模块或节奏缺失；无 story-explorer 时降级：story-explorer 不可用或返回不完整时，主会话必须手动按对标书路径查找，先读 剧情/情绪模块.md 选 selected_emotion_module，再读 剧情/节奏.md 选 rhythm_reference，再读 文风.md + grep 章节/*_摘要.md 的「基调」字段找匹配章并读取 第K章_摘要.md，第K章_深度拆解.md 不存在时改读 第1-3章_深度拆解.md 中最接近基调的一章，模块/节奏缺失先判定 v12 vs legacy：v12 停止修复，legacy 才回退继续。',
  '对标缺口分流：gaps.no_benchmark 只标记无对标参考；missing_primary_contract/profile_missing 必须停止本章准备并按 repair_action 修复，不得进入 narrative-writer；只有 legacy_deconstruction 下的 module_missing/rhythm_missing 才能低置信回退到拆文报告、文风技巧、匹配章摘要或剧情/故事线；matched_deep_dive_missing 必须保留为回退说明，不得在后续报告中反转为 false。',
  'Step 2.4 craft：爽点出手前先铺可指认的危机/期待，不铺=空洞；装逼/打脸/揭露章必须把视角/信息差经出场顺序里的在场配角放大成差异化反应；高压/生死/悲痛 beat 下轻快声线让位，信息型配角不当科普嘴，对话逐句承接对方情绪。',
  '字数验证：每章正文生成后优先 Python 字符统计，wc -m 仅作 Unix 备选；低于目标 90% 时必须强制扩充，把缺口补成子事件、动作过程、选择代价、对话交锋和章尾钩子铺垫，不得均匀注水或堆环境描写。',
  '资料研究按需：写作中遇到历史年代、地理方位、职业细节、法律/医疗/技术流程、真实机构或真实地名等外部事实时，暂停正文推进，调用 story-researcher 或记录到参考资料/；研究完成后再继续写作，无法确认则标记待查证、改成架空/模糊表达或角色待验证线索，不得编造确定事实。',
  '不得跳过 Step 2.2 状态筛选或 Step 2.3 文风召回；每章写前都要重新确认来源、状态、文风召回和意图确认。',
  'Step 2.2 来源边界：“已加载”只承认本轮 workflow 内实际读取或刚更新的细纲、上一章正文/追踪文件/角色状态；不得用未标明来源的聊天记忆替代。',
  '首次日更兜底：如果追踪文件全部为空或不存在，额外读取大纲/卷纲_当前卷.md和最新一章正文来重建上下文；不得把缺失的追踪/上下文.md当作可以跳过上一章承接的理由。',
  '必须串行逐章写作，不得并发生成多章；下一章必须读取上一章刚写入的正文、回执和追踪更新后再开始。',
  '每章写完立即更新追踪/伏笔.md、追踪/时间线.md、追踪/角色状态.md 和追踪/上下文.md；追踪/上下文.md 只更新进度元信息、当前位置、已写字数和本次变更，不写详细角色状态/伏笔内容；批次最终进度摘要必须补齐固定结构：## 写作进度，最后完成章节、更新时间、本期完成；## 当前状态，活跃伏笔、角色状态、下一章细纲状态、注意事项；超过30章时，已写内容摘要按三层结构维护，压缩早期章节、保留近期细节：近5章详记、十章概要、卷级总览；每50章或卷结束做轻量归档到追踪/归档，活跃伏笔、时间线、角色状态仍以当前文件为准，不移入归档。',
  '章间不重复询问是否继续，除非用户明确要求逐章确认、章节号冲突、细纲缺失/冲突、请求范围越界、用户要求改变大纲/追踪或出现会导致写错的阻塞信息。',
  '批量写作模式跳过单章 story-review lean 提示；本批全部写完后再统一执行 Phase 5 质量检查，Phase 5 对照细纲核对：新版细纲核对内容概括五段式、情节安排多线、人物关系变化/出场顺序、代价兑现/收益兑现；旧版细纲只核对核心事件、目标情绪、章首/章尾钩子和字数目标；伏笔盘点仅本轮增量：确认本批新增/推进/回收的伏笔已写入追踪/伏笔.md并更新状态，不得通读所有 session 或扫描全部正文做全量伏笔审计；避免每章后打断连写。',
  'Phase 5 完整检查清单：本批完成后必须做禁用词扫描、标题去重检查、正文元信息扫描和章尾钩子检查；禁用词、重复标题、工程词或章尾无钩子命中时必须回对应正文或细纲修复，不能只在报告里声明通过。',
  'Phase 5 确定性收尾：主会话在本批实际落盘正文上运行 normalize-punctuation.js，再运行 check-ai-patterns.js --check；命中高危 AI 句式时回正文改掉并复扫到 0；narrative-writer agent 不运行这些脚本。',
]

export function normalizeDefaultFiveChapterRegression(value: any) {
  const raw = value?.default_five_chapter_regression || value?.defaultFiveChapterRegression || value || {}
  if (!raw || raw.visible === false) return null
  const repeated = raw.repeated_hotspot_segment || raw.repeatedHotspotSegment || null
  const normalized = {
    visible: true,
    status: compactBriefText(raw.status || ''),
    label: compactBriefText(raw.label || '默认5章档位回退原因'),
    source: compactBriefText(raw.source || ''),
    stable_pass_streak: Number(raw.stable_pass_streak ?? raw.stablePassStreak ?? 0),
    required_stable_pass_streak: Number(raw.required_stable_pass_streak ?? raw.requiredStablePassStreak ?? 0),
    default_batch_chapter_nos: asArray(raw.default_batch_chapter_nos || raw.defaultBatchChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0)
      .slice(0, 10),
    restore_chapter_nos: asArray(raw.restore_chapter_nos || raw.restoreChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0)
      .slice(0, 10),
    validation_chapter_nos: asArray(raw.validation_chapter_nos || raw.validationChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0)
      .slice(0, 10),
    repeated_hotspot_segment: repeated ? {
      key: compactBriefText(repeated.key),
      label: compactBriefText(repeated.label || repeated.key),
      risk_count: Number(repeated.risk_count ?? repeated.riskCount ?? 0),
    } : null,
    failure_reasons: asArray(raw.failure_reasons || raw.failureReasons)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
      .slice(0, 6),
    summary: compactBriefText(raw.summary || ''),
  }
  const hasContent = normalized.default_batch_chapter_nos.length
    || normalized.restore_chapter_nos.length
    || normalized.validation_chapter_nos.length
    || normalized.failure_reasons.length
    || normalized.summary
  return hasContent ? normalized : null
}

export function normalizeDefaultFiveChapterLaneTemplateFailedRequirements(value: any) {
  return asArray(value?.failed_requirements || value?.failedRequirements || value?.template_version_failed_requirements || value?.templateVersionFailedRequirements)
    .map((item: any) => ({
      key: compactBriefText(item?.key),
      label: compactBriefText(item?.label || item?.name || item?.key),
      failure_reason: compactBriefText(item?.failure_reason || item?.failureReason || item?.reason),
      failed_count: Number(item?.failed_count ?? item?.failedCount ?? 1),
    }))
    .filter((item: any) => item.key || item.label || item.failure_reason)
    .slice(0, 8)
}

export function normalizeDefaultFiveChapterLaneTemplateProductionRelapseReview(value: any, fallback: any = {}) {
  const raw = value?.production_relapse_review || value?.productionRelapseReview || value || {}
  if (!raw || raw.visible === false) return null
  const failedRequirements = normalizeDefaultFiveChapterLaneTemplateFailedRequirements(raw)
  const fallbackFailedRequirements = asArray(fallback.failed_requirements || fallback.failedRequirements)
  const normalized = {
    template_version_id: compactBriefText(raw.template_version_id || raw.templateVersionId || fallback.template_version_id || fallback.templateVersionId),
    default_batch_chapter_nos: asArray(raw.default_batch_chapter_nos || raw.defaultBatchChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0)
      .slice(0, 10),
    restore_chapter_nos: asArray(raw.restore_chapter_nos || raw.restoreChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0)
      .slice(0, 10),
    validation_chapter_nos: asArray(raw.validation_chapter_nos || raw.validationChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0)
      .slice(0, 10),
    failure_reasons: asArray(raw.failure_reasons || raw.failureReasons)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
      .slice(0, 8),
    failed_requirements: failedRequirements.length ? failedRequirements : fallbackFailedRequirements.slice(0, 8),
    summary: compactBriefText(raw.summary || fallback.summary),
  }
  const hasContent = normalized.template_version_id
    || normalized.default_batch_chapter_nos.length
    || normalized.restore_chapter_nos.length
    || normalized.validation_chapter_nos.length
    || normalized.failure_reasons.length
    || normalized.failed_requirements.length
    || normalized.summary
  return hasContent ? normalized : null
}

export function normalizeDefaultFiveChapterLaneTemplate(value: any) {
  const raw = value?.default_five_chapter_lane_template || value?.defaultFiveChapterLaneTemplate || value || {}
  if (!raw || raw.visible === false) return null
  const requirements = asArray(raw.requirements || raw.items)
    .map((item: any) => ({
      key: compactBriefText(item?.key),
      label: compactBriefText(item?.label || item?.name || item?.key),
      status: compactBriefText(item?.status || 'fulfilled'),
      verification_requirement: compactBriefText(item?.verification_requirement || item?.verificationRequirement || item?.detail),
    }))
    .filter((item: any) => item.key || item.label || item.verification_requirement)
    .slice(0, 8)
  const repairedMissingRequirements = asArray(
    raw.repaired_missing_requirements
      || raw.repairedMissingRequirements
      || raw.missing_requirements
      || raw.missingRequirements,
  )
    .map((item: any) => ({
      key: compactBriefText(item?.key),
      label: compactBriefText(item?.label || item?.name || item?.key),
      chapter_nos: asArray(item?.chapter_nos || item?.chapterNos || item?.chapters)
        .map((chapterNo: any) => Number(chapterNo))
        .filter((chapterNo: number) => chapterNo > 0)
        .slice(0, 10),
    }))
    .filter((item: any) => item.key || item.label || item.chapter_nos.length)
    .slice(0, 8)
  const repairActions = uniqueBriefStrings(raw.repair_actions || raw.repairActions || [], 8)
  const redesignedTemplates = asArray(raw.redesigned_templates || raw.redesignedTemplates || raw.templates)
    .map((item: any) => ({
      key: compactBriefText(item?.key),
      label: compactBriefText(item?.label || item?.name || item?.key),
      template: compactBriefText(item?.template || item?.rewrite || item?.instruction || item?.text || item?.detail),
    }))
    .filter((item: any) => item.key || item.label || item.template)
    .slice(0, 8)
  const validationStandard = uniqueBriefStrings(raw.validation_standard || raw.validationStandard || [], 8)
  const requiredReceipts = uniqueBriefStrings(raw.required_receipts || raw.requiredReceipts || raw.receipts || [], 8)
  const failedRequirements = normalizeDefaultFiveChapterLaneTemplateFailedRequirements(raw)
  const templateVersionId = compactBriefText(
    raw.template_version_id
    || raw.templateVersionId
    || raw.template_version?.id
    || raw.templateVersion?.id,
  )
  const productionRelapseReview = normalizeDefaultFiveChapterLaneTemplateProductionRelapseReview(raw, {
    template_version_id: templateVersionId,
    failed_requirements: failedRequirements,
    summary: raw.summary,
  })
  const topFailedRaw = raw.top_failed_requirement || raw.topFailedRequirement || null
  const topFailedRequirement = topFailedRaw && typeof topFailedRaw === 'object' && !Array.isArray(topFailedRaw)
    ? {
      key: compactBriefText(topFailedRaw.key),
      label: compactBriefText(topFailedRaw.label || topFailedRaw.key),
      failed_count: Number(topFailedRaw.failed_count ?? topFailedRaw.failedCount ?? 0),
      failure_reason: compactBriefText(topFailedRaw.failure_reason || topFailedRaw.failureReason),
    }
    : null
  const normalized = {
    visible: true,
    status: compactBriefText(raw.status || 'fulfilled'),
    label: compactBriefText(raw.label || '默认5章档位模板回检'),
    source: compactBriefText(raw.source || ''),
    redesign_source: compactBriefText(raw.redesign_source || raw.redesignSource),
    source_run_id: raw.source_run_id ?? raw.sourceRunId ?? null,
    repaired_at: compactBriefText(raw.repaired_at || raw.repairedAt),
    template_version_id: templateVersionId,
    production_relapse_count: Number(raw.production_relapse_count ?? raw.productionRelapseCount ?? 0),
    production_relapse_review: productionRelapseReview,
    summary: compactBriefText(raw.summary || ''),
    segment_duty_rewrite: compactBriefText(raw.segment_duty_rewrite || raw.segmentDutyRewrite),
    conflict_rotation: compactBriefText(raw.conflict_rotation || raw.conflictRotation),
    payoff_density: compactBriefText(raw.payoff_density || raw.payoffDensity),
    ending_hook_template: compactBriefText(raw.ending_hook_template || raw.endingHookTemplate),
    top_failed_requirement: topFailedRequirement,
    redesigned_templates: redesignedTemplates,
    validation_standard: validationStandard,
    required_receipts: requiredReceipts,
    failed_requirements: failedRequirements,
    repaired_missing_requirements: repairedMissingRequirements,
    repair_actions: repairActions,
    requirements,
  }
  const hasContent = normalized.summary
    || normalized.segment_duty_rewrite
    || normalized.conflict_rotation
    || normalized.payoff_density
    || normalized.ending_hook_template
    || normalized.redesign_source
    || normalized.template_version_id
    || normalized.production_relapse_count
    || normalized.production_relapse_review
    || normalized.redesigned_templates.length
    || normalized.validation_standard.length
    || normalized.required_receipts.length
    || normalized.failed_requirements.length
    || normalized.repaired_missing_requirements.length
    || normalized.repair_actions.length
    || normalized.requirements.length
  return hasContent ? normalized : null
}

export function normalizeExpansionStructureVerification(value: any) {
  const raw = value?.expansion_structure_verification || value?.expansionStructureVerification || value || {}
  const repeated = raw.repeated_hotspot_segment || raw.repeatedHotspotSegment || null
  const defaultFiveChapterRegression = normalizeDefaultFiveChapterRegression(
    raw.default_five_chapter_regression || raw.defaultFiveChapterRegression,
  )
  const defaultFiveChapterLaneTemplate = normalizeDefaultFiveChapterLaneTemplate(
    raw.default_five_chapter_lane_template || raw.defaultFiveChapterLaneTemplate,
  )
  const normalized = {
    source: compactBriefText(raw.source || 'safe_batch_expansion_structure_repair'),
    label: compactBriefText(raw.label || '扩批结构验证'),
    repeated_hotspot_segment: repeated ? {
      key: compactBriefText(repeated.key),
      label: compactBriefText(repeated.label),
      count: Number(repeated.count || 0),
    } : null,
    validation_chapter_nos: asArray(raw.validation_chapter_nos || raw.validationChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0)
      .slice(0, 5),
    fixed_segment_role: compactBriefText(raw.fixed_segment_role || raw.fixedSegmentRole),
    conflict_rotation: compactBriefText(raw.conflict_rotation || raw.conflictRotation),
    explicit_payoff: compactBriefText(raw.explicit_payoff || raw.explicitPayoff),
    ending_hook_requirement: compactBriefText(raw.ending_hook_requirement || raw.endingHookRequirement),
    structure_actions: asArray(raw.structure_actions || raw.structureActions)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
      .slice(0, 5),
    default_five_chapter_regression: defaultFiveChapterRegression,
    default_five_chapter_lane_template: defaultFiveChapterLaneTemplate,
  }
  const hasContent = normalized.validation_chapter_nos.length
    || normalized.fixed_segment_role
    || normalized.conflict_rotation
    || normalized.explicit_payoff
    || normalized.ending_hook_requirement
    || normalized.structure_actions.length
    || normalized.default_five_chapter_regression
    || normalized.default_five_chapter_lane_template
  return hasContent ? normalized : null
}

export function normalizeDefaultFiveChapterLaneRedesign(value: any) {
  const raw = value?.default_five_chapter_lane_redesign || value?.defaultFiveChapterLaneRedesign || value || {}
  const repeatedFailureReasons = asArray(raw.repeated_failure_reasons || raw.repeatedFailureReasons)
    .map((item: any) => compactBriefText(item?.reason || item?.label || item))
    .filter(Boolean)
    .slice(0, 8)
  const normalized = {
    reason: compactBriefText(raw.reason),
    label: compactBriefText(raw.label || '默认5章档位结构重构'),
    summary: compactBriefText(raw.summary),
    relapse_count: Number(raw.relapse_count ?? raw.relapseCount ?? 0),
    repeated_failure_reasons: repeatedFailureReasons,
    segment_duty_rewrite: compactBriefText(raw.segment_duty_rewrite || raw.segmentDutyRewrite),
    conflict_rotation: compactBriefText(raw.conflict_rotation || raw.conflictRotation),
    payoff_density: compactBriefText(raw.payoff_density || raw.payoffDensity),
    ending_hook_template: compactBriefText(raw.ending_hook_template || raw.endingHookTemplate),
  }
  const hasContent = normalized.reason
    || normalized.summary
    || normalized.relapse_count > 0
    || normalized.repeated_failure_reasons.length
    || normalized.segment_duty_rewrite
    || normalized.conflict_rotation
    || normalized.payoff_density
    || normalized.ending_hook_template
  return hasContent ? normalized : null
}

export function normalizeExpansionStructureDecision(value: any) {
  const raw = value?.expansion_structure_decision || value?.expansionStructureDecision || value || {}
  const observationMetrics = asArray(raw.observation_metrics || raw.observationMetrics)
    .map((item: any) => compactBriefText(item))
    .filter(Boolean)
    .slice(0, 6)
  const defaultFiveChapterLaneRedesign = normalizeDefaultFiveChapterLaneRedesign(
    raw.default_five_chapter_lane_redesign || raw.defaultFiveChapterLaneRedesign,
  )
  const normalized = {
    visible: raw.visible !== false,
    label: compactBriefText(raw.label || '结构修复决策'),
    recommendation: compactBriefText(raw.recommendation),
    target_chapter_count: Number(raw.target_chapter_count ?? raw.targetChapterCount ?? 0),
    mode_label: compactBriefText(raw.mode_label || raw.modeLabel),
    summary: compactBriefText(raw.summary),
    instruction: compactBriefText(raw.instruction),
    source_run_id: raw.source_run_id ?? raw.sourceRunId ?? null,
    segment_key: compactBriefText(raw.segment_key || raw.segmentKey),
    segment_label: compactBriefText(raw.segment_label || raw.segmentLabel),
    observation_metrics: observationMetrics,
    default_five_chapter_lane_redesign: defaultFiveChapterLaneRedesign,
  }
  const hasContent = normalized.recommendation
    || normalized.mode_label
    || normalized.summary
    || normalized.instruction
    || normalized.observation_metrics.length
    || normalized.default_five_chapter_lane_redesign
  return hasContent ? normalized : null
}

export function normalizeNextBatchBrief(value: any, targetChapterNo = 0) {
  const raw = value?.next_batch_brief || value?.nextBatchBrief || value || {}
  const chapters = asArray(raw.chapters).map(normalizeNextBatchChapter).filter(Boolean).slice(0, 10)
  const startChecklist = asArray(raw.start_checklist || raw.startChecklist || raw.start_checklist_items || raw.startChecklistItems)
    .map(normalizeNextBatchChecklistItem)
    .filter(Boolean)
    .slice(0, 8)
  const currentChapter = chapters.find((item: any) => Number(item.chapter_no) === Number(targetChapterNo)) || null
  const currentChapterRole = compactBriefText(
    raw.current_chapter_role || raw.currentChapterRole || currentChapter?.chapter_task || currentChapter?.conflict || currentChapter?.mainline_progress,
  )
  const expansionStructureVerification = normalizeExpansionStructureVerification(
    raw.expansion_structure_verification || raw.expansionStructureVerification,
  )
  const expansionStructureDecision = normalizeExpansionStructureDecision(
    raw.expansion_structure_decision || raw.expansionStructureDecision,
  )
  const normalized = {
    chapter_range_label: compactBriefText(raw.chapter_range_label || raw.chapterRangeLabel),
    batch_goal: compactBriefText(raw.batch_goal || raw.batchGoal),
    reader_payoff_plan: compactBriefText(raw.reader_payoff_plan || raw.readerPayoffPlan),
    mainline_focus: compactBriefText(raw.mainline_focus || raw.mainlineFocus),
    forbidden_boundary: compactBriefText(raw.forbidden_boundary || raw.forbiddenBoundary),
    current_chapter_role: currentChapterRole,
    workflow_rules: uniqueBriefStrings([
      ...asArray(raw.workflow_rules || raw.workflowRules || raw.batch_workflow_rules || raw.batchWorkflowRules).map((item: any) => compactBriefText(item)).filter(Boolean),
      ...OH_STORY_NEXT_BATCH_WORKFLOW_RULES,
    ], 20),
    expansion_structure_verification: expansionStructureVerification,
    expansion_structure_decision: expansionStructureDecision,
    start_checklist: startChecklist,
    chapters,
  }
  const hasContent = normalized.chapter_range_label
    || normalized.batch_goal
    || normalized.reader_payoff_plan
    || normalized.mainline_focus
    || normalized.forbidden_boundary
    || normalized.current_chapter_role
    || normalized.expansion_structure_verification
    || normalized.expansion_structure_decision
    || normalized.start_checklist.length
    || normalized.chapters.length
  return hasContent ? normalized : null
}

export function nextBatchBriefFromContext(contextPackage: any = {}, preDraftBrief: any = null, chapter: any = {}) {
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const brief = preDraftBrief
    || contextPackage?.pre_draft_brief
    || contextPackage?.preDraftBrief
    || target?.pre_draft_brief
    || target?.preDraftBrief
    || chapter?.raw_payload?.pre_draft_brief
    || chapter?.raw_payload?.preDraftBrief
    || {}
  return target.next_batch_brief
    || target.nextBatchBrief
    || brief.next_batch_brief
    || brief.nextBatchBrief
    || contextPackage?.next_batch_brief
    || contextPackage?.nextBatchBrief
    || chapter?.raw_payload?.next_batch_brief
    || chapter?.raw_payload?.nextBatchBrief
    || null
}

export function normalizeStoryUnitContext(value: any, targetChapterNo = 0) {
  const raw = value?.story_unit_context || value?.storyUnitContext || value || {}
  const textList = (...values: any[]) => Array.from(new Set(values
    .flatMap(item => Array.isArray(item) ? item : [item])
    .map(item => compactBriefText(item))
    .filter(Boolean)))
  const currentChapter = asArray(raw.chapters)
    .find((item: any) => Number(item?.chapter_no || item?.chapterNo || 0) === Number(targetChapterNo)) || null
  const normalized = {
    title: compactBriefText(raw.title || raw.unit_title || raw.unitTitle || raw.story_unit_title || raw.storyUnitTitle),
    chapter_range_label: compactBriefText(raw.chapter_range_label || raw.chapterRangeLabel || raw.range_label || raw.rangeLabel),
    current_chapter_role: compactBriefText(raw.current_chapter_role || raw.currentChapterRole || raw.chapter_role || raw.chapterRole || currentChapter?.role || currentChapter?.chapter_role),
    unit_goal: compactBriefText(raw.unit_goal || raw.unitGoal || raw.goal || raw.summary),
    entry_hook: compactBriefText(raw.entry_hook || raw.entryHook || raw.opening_hook || raw.openingHook),
    pressure_escalation: textList(raw.pressure_escalation, raw.pressureEscalation, raw.escalation, raw.escalations),
    mini_climax_payoff: compactBriefText(raw.mini_climax_payoff || raw.miniClimaxPayoff || raw.payoff || raw.climax || raw.mini_climax),
    setup_and_storyline: textList(raw.setup_and_storyline, raw.setupAndStoryline, raw.foreshadowing, raw.storyline, raw.storylines),
    exit_hook: compactBriefText(raw.exit_hook || raw.exitHook || raw.ending_hook || raw.endingHook),
    forbidden_advance: textList(raw.forbidden_advance, raw.forbiddenAdvance, raw.forbidden, raw.do_not_advance, raw.doNotAdvance),
  }
  const hasContent = Object.values(normalized).some(value => Array.isArray(value) ? value.length > 0 : Boolean(value))
  return hasContent ? normalized : null
}

export function storyUnitRoleForChapter(chapter: any, position: number, total: number) {
  const payload = chapter?.raw_payload || {}
  const explicit = compactBriefText(
    payload.story_unit_role || payload.storyUnitRole || payload.unit_role || payload.unitRole || payload.episode_role || payload.episodeRole,
  )
  if (explicit) return explicit
  const haystack = compactBriefText([
    chapter?.title,
    chapter?.chapter_summary,
    chapter?.conflict,
    chapter?.ending_hook,
  ].filter(Boolean).join(' '))
  if (/高潮|回报|兑现|反杀|打脸|收束/.test(haystack)) return '小高潮/回报'
  if (position === 0) return '入口钩子'
  if (position === total - 1 && total > 1) return '出单元钩子'
  return '压力升级/推进'
}

export function buildStoryUnitContext(chapter: any, chapters: any[] = [], outlines: any[] = []) {
  const targetNo = Number(chapter?.chapter_no || 0)
  const explicit = normalizeStoryUnitContext(
    chapter?.raw_payload?.pre_draft_brief?.story_unit_context
      || chapter?.raw_payload?.story_unit_context
      || chapter?.raw_payload?.storyUnitContext,
    targetNo,
  )
  if (explicit) return explicit
  if (!targetNo) return null

  const raw = chapter?.raw_payload || {}
  const startNo = Number(raw.story_unit_start_chapter || raw.storyUnitStartChapter || raw.unit_start_chapter || raw.unitStartChapter || targetNo) || targetNo
  const endNo = Number(raw.story_unit_end_chapter || raw.storyUnitEndChapter || raw.unit_end_chapter || raw.unitEndChapter || startNo + 5) || startNo + 5
  const sorted = asArray(chapters)
    .filter((item: any) => Number(item?.chapter_no || 0) >= startNo && Number(item?.chapter_no || 0) <= endNo)
    .sort((a: any, b: any) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  const unitChapters = sorted.length ? sorted : [chapter]
  const currentIndex = Math.max(0, unitChapters.findIndex((item: any) => Number(item?.chapter_no || 0) === targetNo))
  const first = unitChapters[0] || chapter
  const last = unitChapters[unitChapters.length - 1] || chapter
  const outlineHint = asArray(outlines)
    .find((item: any) => /单元|事件|阶段|篇|卷/.test(compactBriefText(item?.outline_type || item?.title || item?.summary))) || null
  const title = compactBriefText(
    raw.story_unit_title || raw.storyUnitTitle || raw.unit_title || raw.unitTitle || outlineHint?.title,
    `第${startNo}-${Number(last?.chapter_no || endNo)}章剧情单元`,
  )
  const pressureEscalation = unitChapters
    .slice(Math.max(0, currentIndex), Math.min(unitChapters.length, currentIndex + 4))
    .map((item: any) => compactBriefText(item?.conflict || item?.chapter_summary || item?.ending_hook || item?.title))
    .filter(Boolean)
  const climaxChapter = unitChapters.find((item: any) => /高潮|回报|兑现|反杀|打脸|收束/.test(compactBriefText([
    item?.title,
    item?.chapter_summary,
    item?.conflict,
    item?.ending_hook,
  ].filter(Boolean).join(' ')))) || unitChapters[Math.min(unitChapters.length - 1, Math.max(0, Math.floor(unitChapters.length * 0.65)))]
  const setupAndStoryline = Array.from(new Set([
    ...asArray(raw.foreshadowing_task),
    ...asArray(raw.foreshadowingTask),
    ...asArray(raw.storyline_task),
    ...asArray(raw.storylineTask),
    compactBriefText(chapter?.conflict),
  ].map(item => compactBriefText(item)).filter(Boolean))).slice(0, 6)

  return normalizeStoryUnitContext({
    title,
    chapter_range_label: `第${startNo}-${Number(last?.chapter_no || endNo)}章`,
    current_chapter_role: storyUnitRoleForChapter(chapter, currentIndex, unitChapters.length),
    unit_goal: compactBriefText(raw.story_unit_goal || raw.storyUnitGoal || outlineHint?.summary || `完成${title}的入口、升级、回报和出单元钩子。`),
    entry_hook: compactBriefText(first?.chapter_summary || first?.ending_hook || first?.title),
    pressure_escalation: pressureEscalation,
    mini_climax_payoff: compactBriefText(climaxChapter?.ending_hook || climaxChapter?.chapter_summary || climaxChapter?.conflict || climaxChapter?.title),
    setup_and_storyline: setupAndStoryline,
    exit_hook: compactBriefText(last?.ending_hook || last?.chapter_summary || last?.title),
    forbidden_advance: [
      ...asArray(raw.forbidden_repeats),
      ...asArray(raw.forbidden_advance),
      ...asArray(raw.forbiddenAdvance),
    ],
  }, targetNo)
}

export function first30SegmentKeyForChapter(chapterNo: number) {
  if (chapterNo >= 1 && chapterNo <= 3) return '1-3'
  if (chapterNo >= 4 && chapterNo <= 10) return '4-10'
  if (chapterNo >= 11 && chapterNo <= 30) return '11-30'
  return ''
}

export function first30RetentionRiskLevel(score: number, flags: string[]) {
  if (score > 0 && score < 65) return 'high'
  if (flags.some(flag => /缺正文|章末钩子弱|爽点|悬念/.test(flag))) return 'high'
  if (score > 0 && score < 80) return 'medium'
  if (flags.length > 0) return 'medium'
  return 'ok'
}

export function first30FlagAction(flag: string) {
  if (/目标不清/.test(flag)) return '补明确章节目标和主角选择。'
  if (/章末钩子弱/.test(flag)) return '重做章末未解决问题、威胁升级或利益诱惑。'
  if (/爽点|悬念/.test(flag)) return '增加一个可感知收益、信息揭示、关系反转或风险升级。'
  if (/缺正文/.test(flag)) return '先完成正文初稿，再重新运行前30章留存诊断。'
  if (/重复/.test(flag)) return '减少重复表达，用新的选择、阻碍或信息增量替换水文。'
  return ''
}

export function buildFirst30RetentionContext(chapterTarget: any, reviews: any[] = []) {
  const chapterNo = Number(chapterTarget?.chapter_no || 0)
  if (chapterNo < 1 || chapterNo > 30) return null
  const review = asArray(reviews)
    .filter((item: any) => String(item?.review_type || '') === 'first30_retention_diagnosis')
    .sort((a: any, b: any) => reviewTimestamp(b) - reviewTimestamp(a))[0]
  if (!review) return null
  const payload = parseJsonLikePayload(review.payload) || {}
  const report = payload.report || payload.result?.report || payload
  if (!report || typeof report !== 'object') return null
  const segmentKey = first30SegmentKeyForChapter(chapterNo)
  const chapterId = Number(chapterTarget?.id || 0)
  const chapterCard = asArray(report.chapter_cards).find((row: any) => {
    const rowNo = Number(row?.chapter_no || 0)
    const rowId = Number(row?.chapter_id || 0)
    return rowNo === chapterNo || (chapterId > 0 && rowId === chapterId)
  }) || null
  const segment = asArray(report.segments).find((item: any) => String(item?.key || '') === segmentKey) || null
  const flags = asArray(chapterCard?.flags).map((item: any) => compactBriefText(item)).filter(Boolean)
  const segmentRisks = asArray(report.risks)
    .filter((risk: any) => {
      const riskSegment = String(risk?.segment || '')
      return riskSegment === segmentKey || (!riskSegment && String(risk?.severity || '') === 'high')
    })
    .map((risk: any) => ({
      severity: compactBriefText(risk?.severity),
      issue: compactBriefText(risk?.issue),
      action: compactBriefText(risk?.action),
    }))
    .filter((risk: any) => risk.issue || risk.action)
  const score = Number(chapterCard?.score || 0)
  const riskLevel = first30RetentionRiskLevel(score, flags)
  const requiredActions = Array.from(new Set([
    ...segmentRisks.map((risk: any) => risk.action),
    ...flags.map(first30FlagAction),
  ].map((item: any) => compactBriefText(item)).filter(Boolean))).slice(0, 8)
  if (!chapterCard && !segmentRisks.length) return null
  if (riskLevel === 'ok' && !segmentRisks.length) return null
  return {
    report_score: Number(report.score || 0) || null,
    report_status: compactBriefText(report.status),
    report_summary: compactBriefText(report.summary),
    report_created_at: compactBriefText(review.created_at || report.created_at),
    promise_ready: Boolean(report.positioning?.promise_ready),
    reader_promise: compactBriefText(report.positioning?.reader_promise),
    chapter_no: chapterNo,
    chapter_score: score || null,
    chapter_title: compactBriefText(chapterCard?.title || chapterTarget?.title),
    segment_key: segmentKey,
    segment_label: compactBriefText(segment?.label || segmentKey),
    segment_score: Number(segment?.score || 0) || null,
    flags,
    risks: segmentRisks,
    risk_level: segmentRisks.some((risk: any) => risk.severity === 'high') ? 'high' : riskLevel,
    repair_focus: compactBriefText([
      chapterCard ? `第${chapterNo}章留存分 ${score || '-'}` : '',
      flags.length ? `风险：${flags.join('、')}` : '',
      segmentRisks[0]?.issue || '',
    ].filter(Boolean).join('；')),
    required_actions: requiredActions,
  }
}


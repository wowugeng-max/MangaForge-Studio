import { wc } from './utils'

type AnyRecord = Record<string, any>

export type FuturePlanningCoverage = {
  ready: boolean
  planned: number
  required: number
  missingChapters: number[]
  label: string
}

export type PlanningHealthStatus = {
  status: 'healthy' | 'drifting' | 'needs_planning'
  label: string
}

export type PlanningActionKey =
  | 'update_rolling_plan'
  | 'complete_volume_plan'
  | 'enter_chapter_writing'
  | 'open_outline_tree'
  | 'future100_audit'
  | 'future100_generate'
  | 'longform_pressure'
  | 'longform_creation_diagnosis'
  | 'topic_validation'
  | 'reference_diagnosis'
  | 'open_story_assets'
  | 'update_story_state'
  | 'open_quality_revision'
  | 'run_first30_retention'
  | 'create_first30_repair'

export type PlanningHealthIssue = {
  key: 'missing_reader_promise' | 'missing_volume_goal' | 'future10_incomplete' | 'story_state_stale' | 'material_weak'
  severity: 'critical' | 'warning'
  title: string
  detail: string
  actionKey: PlanningActionKey
}

export type PlanningRhythmSignal = {
  key: 'core' | 'volume' | 'payoff' | 'fatigue'
  label: string
  status: 'ok' | 'warn' | 'block'
  score: number
  detail: string
  actionKey: PlanningActionKey
}

export type PlanningVolumeTreeNode = {
  id: any
  title: string
  level: string
  startChapter?: number
  endChapter?: number
  chapterNo?: number
  wordCount?: number
  children: PlanningVolumeTreeNode[]
}

export type PlanningStorylineBoardItem = {
  id: any
  name: string
  entityType: string
  typeLabel: string
  summary: string
  priority: string
  status: string
  startChapter: number | null
  endChapter: number | null
  lastAdvancedChapter: number | null
  nextAdvanceChapter: number | null
  payoffStatus: string
  expectedPayoff: string
  relatedNames: string[]
  advanceRule: string
  forbiddenReveal: string
  riskTags: string[]
  retentionImpacts: string[]
  actionChapterNo: number
}

export type PlanningStorylineBoardGroup = {
  key: string
  label: string
  count: number
  items: PlanningStorylineBoardItem[]
}

export type PlanningWorkspaceModel = {
  topStatus: {
    projectTitle: string
    currentVolume: string
    currentStage: string
    currentChapterLabel: string
    writtenWords: number
    targetWords: number
    future10Coverage: FuturePlanningCoverage
    future100Coverage: FuturePlanningCoverage
    longformHealth: PlanningHealthStatus
  }
  mainline: {
    readerPromise: string
    currentVolumeGoal: string
    currentStageConflict: string
    payoffModel: string
    previousTurn: string
    nextTurn: string
    currentChapterServesVolume: boolean
    risks: string[]
  }
  futureRoute: Array<{
    chapterNo: number
    title: string
    chapterTask: string
    conflict: string
    endingHook: string
    mainlineProgress: string
    riskTags: string[]
  }>
  first30Retention: {
    status: 'missing' | 'ready' | 'needs_repair' | 'blocked' | 'stale'
    score: number | null
    summary: string
    promiseReady: boolean
    stale: boolean
    actionKey: PlanningActionKey
    segments: Array<{
      key: string
      label: string
      score: number
      coverage: number
      hookRate: number
      payoffAverage: number
      chapterCount: number
    }>
    chapterCards: Array<{
      chapterId: any
      chapterNo: number
      title: string
      score: number
      wordCount: number
      flags: string[]
      riskLevel: 'ok' | 'medium' | 'high'
    }>
    risks: Array<{
      severity: string
      segment: string
      issue: string
      action: string
    }>
    nextActions: string[]
  }
  storylineBoard: {
    status: 'missing' | 'ready' | 'needs_attention'
    summary: string
    total: number
    overdueCount: number
    debtCount: number
    retentionRiskCount: number
    groups: PlanningStorylineBoardGroup[]
  }
  longformRhythm: {
    status: 'ready' | 'needs_attention' | 'blocked'
    score: number
    label: string
    summary: string
    currentBandLabel: string
    signals: PlanningRhythmSignal[]
    nextActions: string[]
  }
  volumeTree: PlanningVolumeTreeNode[]
  healthIssues: PlanningHealthIssue[]
}

export type BuildPlanningWorkspaceModelInput = {
  selectedProject?: AnyRecord | null
  outlines?: AnyRecord[]
  chapters?: AnyRecord[]
  activeChapter?: AnyRecord | null
  materialScore?: AnyRecord | null
  commercialReadiness?: AnyRecord | null
  reviews?: AnyRecord[] | null
  settingEntities?: AnyRecord[] | null
}

function text(value: any, fallback = '') {
  if (value === null || value === undefined) return fallback
  const normalized = String(value).trim()
  return normalized || fallback
}

function arrayValue(value: any): any[] {
  return Array.isArray(value) ? value : []
}

function chapterRange(item: AnyRecord) {
  const start = Number(item?.start_chapter ?? item?.chapter_no ?? 0)
  const end = Number(item?.end_chapter ?? item?.start_chapter ?? item?.chapter_no ?? start)
  return { start, end }
}

function chapterInRange(chapterNo: number, item: AnyRecord) {
  const { start, end } = chapterRange(item)
  return start > 0 && chapterNo >= start && chapterNo <= end
}

function outlineLevel(item: AnyRecord) {
  return text(item?.outline_level || item?.level || item?.outline_type).toLowerCase()
}

function isVolume(item: AnyRecord) {
  const level = outlineLevel(item)
  return level === 'volume' || level === '卷'
}

function isStage(item: AnyRecord) {
  const level = outlineLevel(item)
  return level === 'stage' || level === 'arc' || level === '阶段'
}

function isTurn(item: AnyRecord) {
  const level = outlineLevel(item)
  return level === 'turning_point' || level === 'turn' || level === 'plot_turn' || level === '转折'
}

function firstNonEmpty(...values: any[]) {
  for (const value of values) {
    const normalized = text(value)
    if (normalized) return normalized
  }
  return ''
}

function resolveWritingBible(project?: AnyRecord | null) {
  return project?.reference_config?.writing_bible || project?.writing_bible || {}
}

function resolveStoryState(project?: AnyRecord | null) {
  return project?.reference_config?.story_state || project?.story_state || {}
}

function titleMatches(a: any, b: any) {
  const left = text(a)
  const right = text(b)
  return Boolean(left && right && (left.includes(right) || right.includes(left)))
}

function resolveVolumeFromBible(writingBible: AnyRecord, currentVolume?: AnyRecord) {
  const volumes = arrayValue(writingBible?.volumes)
  const matched = volumes.find(volume => titleMatches(currentVolume?.title, volume?.title))
  if (matched) return matched
  return currentVolume?.title ? {} : volumes[0] || {}
}

function resolveStageFromBible(volume: AnyRecord, currentStage?: AnyRecord) {
  const stages = arrayValue(volume?.stages)
  const matched = stages.find(stage => titleMatches(currentStage?.title, stage?.title))
  if (matched) return matched
  return currentStage?.title ? {} : stages[0] || {}
}

function routeRiskTags(chapter: AnyRecord, activeTurns: AnyRecord[] = []) {
  const tags: string[] = []
  if (!text(chapter?.chapter_goal || chapter?.chapterTask || chapter?.task)) tags.push('缺章节任务')
  if (!text(chapter?.ending_hook || chapter?.endingHook || chapter?.hook)) tags.push('缺结尾钩子')
  if (!text(chapter?.conflict || chapter?.raw_payload?.conflict)) tags.push('缺冲突')
  if (!text(chapter?.raw_payload?.mainline_progress || chapter?.mainline_progress)) tags.push('主线推进弱')

  const isTurningPoint = activeTurns.some(turn => chapterInRange(Number(chapter?.chapter_no), turn))
  if (isTurningPoint && !text(chapter?.turning_point_task || chapter?.raw_payload?.turning_point_task)) {
    tags.push('缺章节任务')
  }

  return Array.from(new Set(tags))
}

function outlineChapterNo(outline: AnyRecord) {
  const rawNo = Number(outline?.raw_payload?.chapter_no || outline?.raw_payload?.future100?.chapter_no || outline?.raw_payload?.skeleton?.chapter_no || 0)
  if (rawNo) return rawNo
  const match = text(outline?.title).match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}

function futureSkeletonPlanFromOutline(outline: AnyRecord) {
  const future = outline?.raw_payload?.future100 || outline?.raw_payload?.skeleton || {}
  const chapterNo = outlineChapterNo(outline)
  if (!chapterNo) return null
  return {
    id: outline.id,
    chapter_no: chapterNo,
    title: firstNonEmpty(future?.title, outline?.title),
    chapter_goal: firstNonEmpty(future?.chapter_goal, outline?.summary),
    conflict: firstNonEmpty(future?.conflict, arrayValue(outline?.conflict_points)[0]),
    ending_hook: firstNonEmpty(future?.ending_hook, outline?.hook),
    raw_payload: {
      ...(outline?.raw_payload || {}),
      mainline_progress: firstNonEmpty(
        future?.mainline_progress,
        future?.volume_stage,
        future?.commercial_purpose,
        arrayValue(outline?.turning_points)[0],
      ),
    },
  }
}

function planningRecords(chapters: AnyRecord[], outlines: AnyRecord[]) {
  const futureSkeletons = outlines
    .filter(outline => outlineLevel(outline) === 'chapter' && (outline?.raw_payload?.source === 'future_100_skeleton' || outline?.raw_payload?.future100 || outline?.raw_payload?.skeleton))
    .map(futureSkeletonPlanFromOutline)
    .filter(Boolean) as AnyRecord[]
  return [...futureSkeletons, ...chapters]
}

function buildCoverage(records: AnyRecord[], startChapterNo: number, span: number): FuturePlanningCoverage {
  const expected = Array.from({ length: span }).map((_, index) => startChapterNo + index)
  const byNo = new Map<number, AnyRecord[]>()
  records.forEach(record => {
    const chapterNo = Number(record?.chapter_no || 0)
    if (!chapterNo) return
    byNo.set(chapterNo, [...(byNo.get(chapterNo) || []), record])
  })
  const isPlannedEnough = (chapter?: AnyRecord) => {
    if (!chapter) return false
    return Boolean(
      text(chapter?.title) &&
      text(chapter?.chapter_goal || chapter?.chapterTask || chapter?.task) &&
      text(chapter?.conflict || chapter?.raw_payload?.conflict) &&
      text(chapter?.ending_hook || chapter?.endingHook || chapter?.hook) &&
      text(chapter?.raw_payload?.mainline_progress || chapter?.mainline_progress)
    )
  }
  const hasPlan = (chapterNo: number) => (byNo.get(chapterNo) || []).some(isPlannedEnough)
  const plannedChapters = expected.filter(hasPlan).length
  const missingChapters = expected.filter(chapterNo => !hasPlan(chapterNo))

  return {
    ready: missingChapters.length === 0,
    planned: plannedChapters,
    required: span,
    missingChapters,
    label: `${plannedChapters}/${span}`,
  }
}

function buildVolumeTree(outlines: AnyRecord[], chapters: AnyRecord[]): PlanningVolumeTreeNode[] {
  const byId = new Map<any, PlanningVolumeTreeNode>()
  outlines.forEach(outline => {
    byId.set(outline.id, {
      id: outline.id,
      title: text(outline.title, '未命名规划'),
      level: outlineLevel(outline),
      startChapter: outline.start_chapter,
      endChapter: outline.end_chapter,
      children: [],
    })
  })

  const roots: PlanningVolumeTreeNode[] = []
  outlines.forEach(outline => {
    const node = byId.get(outline.id)
    if (outline.parent_id && byId.has(outline.parent_id)) byId.get(outline.parent_id).children.push(node)
    else roots.push(node)
  })

  chapters.forEach(chapter => {
    const chapterNode = {
      id: chapter.id,
      title: text(chapter.title, `第${chapter.chapter_no || '?'}章`),
      level: 'chapter',
      chapterNo: Number(chapter.chapter_no),
      wordCount: wc(chapter.chapter_text),
      children: [],
    }
    const parent = outlines.find(outline => outline.id === chapter.outline_id) || outlines.find(outline => isStage(outline) && chapterInRange(chapterNode.chapterNo, outline))
    const parentNode = parent ? byId.get(parent.id) : null
    if (parentNode) parentNode.children.push(chapterNode)
  })

  return roots
}

function buildHealthIssues(args: {
  readerPromise: string
  currentVolumeGoal: string
  future10Coverage: FuturePlanningCoverage
  storyState: AnyRecord
  latestWrittenChapterNo: number
  materialScore?: AnyRecord | null
}): PlanningHealthIssue[] {
  const issues: PlanningHealthIssue[] = []

  if (!args.readerPromise) {
    issues.push({
      key: 'missing_reader_promise',
      severity: 'critical',
      title: '缺读者承诺',
      detail: '项目缺少长篇核心承诺。',
      actionKey: 'open_story_assets',
    })
  }
  if (!args.currentVolumeGoal) {
    issues.push({
      key: 'missing_volume_goal',
      severity: 'critical',
      title: '缺当前卷目标',
      detail: '当前章节无法映射到明确卷目标。',
      actionKey: 'complete_volume_plan',
    })
  }
  if (!args.future10Coverage.ready) {
    issues.push({
      key: 'future10_incomplete',
      severity: 'critical',
      title: '未来十章规划不足',
      detail: `当前覆盖 ${args.future10Coverage.label}。`,
      actionKey: 'update_rolling_plan',
    })
  }
  if (Number(args.storyState?.last_updated_chapter || 0) < args.latestWrittenChapterNo) {
    issues.push({
      key: 'story_state_stale',
      severity: 'warning',
      title: '故事状态滞后',
      detail: '故事状态落后于当前章节。',
      actionKey: 'update_story_state',
    })
  }
  if (args.materialScore && (Number(args.materialScore.score || 0) < 60 || args.materialScore.can_generate === false)) {
    issues.push({
      key: 'material_weak',
      severity: 'warning',
      title: '素材准备不足',
      detail: '素材评分或生成门槛提示需要补强。',
      actionKey: 'complete_volume_plan',
    })
  }

  return issues
}

function healthLabel(issues: PlanningHealthIssue[]): PlanningHealthStatus {
  if (issues.some(issue => issue.severity === 'critical')) return { status: 'needs_planning', label: '需要补规划' }
  if (issues.length > 0) return { status: 'drifting', label: '存在漂移' }
  return { status: 'healthy', label: '规划健康' }
}

function latestWrittenChapterNo(chapters: AnyRecord[]) {
  return chapters.reduce((latest, chapter) => {
    const chapterText = text(chapter?.chapter_text)
    if (!chapterText || chapterText.includes('【占位正文】')) return latest
    const chapterNo = Number(chapter?.chapter_no || 0)
    return chapterNo > latest ? chapterNo : latest
  }, 0)
}

function parseJsonValue(value: any) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(String(value))
  } catch {
    return null
  }
}

function reviewTime(review: AnyRecord) {
  const raw = text(review?.created_at || review?.updated_at)
  if (!raw) return 0
  const timestamp = Date.parse(raw)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function latestFirst30Review(reviews: AnyRecord[]) {
  return reviews
    .filter(review => text(review?.review_type) === 'first30_retention_diagnosis')
    .sort((a, b) => reviewTime(b) - reviewTime(a))[0] || null
}

function chapterUpdatedTime(chapter: AnyRecord) {
  const raw = text(chapter?.updated_at || chapter?.modified_at)
  if (!raw) return 0
  const timestamp = Date.parse(raw)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function first30ReportIsStale(review: AnyRecord, chapters: AnyRecord[]) {
  const reportTime = reviewTime(review)
  if (!reportTime) return false
  return chapters
    .filter(chapter => Number(chapter?.chapter_no || 0) >= 1 && Number(chapter?.chapter_no || 0) <= 30)
    .some(chapter => chapterUpdatedTime(chapter) > reportTime)
}

function retentionRiskLevel(score: number, flags: string[]) {
  if (score < 65 || flags.some(flag => /缺正文|章末钩子弱|爽点/.test(flag))) return 'high'
  if (score < 80 || flags.length > 0) return 'medium'
  return 'ok'
}

function buildFirst30RetentionModel(chapters: AnyRecord[], reviews: AnyRecord[]): PlanningWorkspaceModel['first30Retention'] {
  const review = latestFirst30Review(reviews)
  if (!review) {
    return {
      status: 'missing',
      score: null,
      summary: '尚未运行前30章留存诊断。',
      promiseReady: false,
      stale: false,
      actionKey: 'run_first30_retention',
      segments: [],
      chapterCards: [],
      risks: [],
      nextActions: ['运行前30章诊断，先确认开篇三章、试读十章和付费前蓄势风险。'],
    }
  }

  const payload = parseJsonValue(review.payload) || {}
  const report = payload.report || payload.result?.report || payload
  const stale = first30ReportIsStale(review, chapters)
  const normalizedStatus = text(report?.status, 'needs_repair') as PlanningWorkspaceModel['first30Retention']['status']
  const status = stale ? 'stale' : (['ready', 'needs_repair', 'blocked'].includes(normalizedStatus) ? normalizedStatus : 'needs_repair')
  const segments = arrayValue(report?.segments).map(segment => ({
    key: text(segment?.key),
    label: text(segment?.label || segment?.key, '未命名分段'),
    score: Number(segment?.score || 0),
    coverage: Number(segment?.coverage || 0),
    hookRate: Number(segment?.hook_rate || segment?.hookRate || 0),
    payoffAverage: Number(segment?.payoff_average || segment?.payoffAverage || 0),
    chapterCount: Number(segment?.chapter_count || segment?.chapterCount || 0),
  }))
  const chapterCards = arrayValue(report?.chapter_cards).map(row => {
    const flags = arrayValue(row?.flags).map(flag => text(flag)).filter(Boolean)
    const score = Number(row?.score || 0)
    return {
      chapterId: row?.chapter_id || null,
      chapterNo: Number(row?.chapter_no || 0),
      title: text(row?.title, '未命名章节'),
      score,
      wordCount: Number(row?.word_count || 0),
      flags,
      riskLevel: retentionRiskLevel(score, flags),
    }
  })

  return {
    status,
    score: Number.isFinite(Number(report?.score)) ? Number(report.score) : null,
    summary: stale ? `需重新诊断：前30章内容已在报告后更新。${text(report?.summary)}` : text(report?.summary, '已完成前30章留存诊断。'),
    promiseReady: Boolean(report?.positioning?.promise_ready),
    stale,
    actionKey: status === 'ready' ? 'run_first30_retention' : status === 'stale' ? 'run_first30_retention' : 'create_first30_repair',
    segments,
    chapterCards,
    risks: arrayValue(report?.risks).map(risk => ({
      severity: text(risk?.severity),
      segment: text(risk?.segment),
      issue: text(risk?.issue),
      action: text(risk?.action),
    })),
    nextActions: arrayValue(report?.next_actions).map(item => text(item)).filter(Boolean),
  }
}

const STORYLINE_TYPE_LABELS: Record<string, string> = {
  mainline: '主线',
  subplot: '支线',
  character_arc: '角色线',
  relationship_arc: '关系线',
  faction_arc: '势力线',
  foreshadowing_arc: '伏笔线',
}

const STORYLINE_TYPE_ORDER = Object.keys(STORYLINE_TYPE_LABELS)

function numberOrNull(...values: any[]) {
  for (const value of values) {
    const num = Number(value)
    if (Number.isFinite(num) && num > 0) return num
  }
  return null
}

function listText(...values: any[]) {
  const result: string[] = []
  values.forEach(value => {
    if (Array.isArray(value)) {
      value.forEach(item => {
        const normalized = text(item)
        if (normalized) result.push(normalized)
      })
      return
    }
    const normalized = text(value)
    if (normalized) result.push(normalized)
  })
  return Array.from(new Set(result))
}

function isStorylineType(type: string) {
  return Boolean(STORYLINE_TYPE_LABELS[type])
}

function buildStorylineBoardModel(
  settingEntities: AnyRecord[],
  first30Retention: PlanningWorkspaceModel['first30Retention'],
  activeChapterNo: number,
): PlanningWorkspaceModel['storylineBoard'] {
  const first30RiskCards = first30Retention.chapterCards.filter(card => card.riskLevel !== 'ok')
  const items = settingEntities
    .filter(entity => isStorylineType(text(entity?.entity_type)))
    .map(entity => {
      const entityType = text(entity?.entity_type)
      const payload = parseJsonValue(entity?.payload_json) || {}
      const constraints = parseJsonValue(entity?.constraints_json) || {}
      const state = parseJsonValue(entity?.state_json) || {}
      const startChapter = numberOrNull(entity?.first_chapter_no, payload?.start_chapter_no, payload?.start_chapter)
      const endChapter = numberOrNull(entity?.last_chapter_no, payload?.end_chapter_no, payload?.end_chapter)
      const lastAdvancedChapter = numberOrNull(state?.last_advanced_chapter, payload?.last_advanced_chapter)
      const nextAdvanceChapter = numberOrNull(state?.next_advance_chapter, payload?.next_advance_chapter)
      const payoffStatus = text(state?.payoff_status || payload?.payoff_status)
      const retentionImpacts = first30RiskCards
        .filter(card => {
          const chapterNo = Number(card.chapterNo || 0)
          if (!chapterNo) return false
          if (startChapter && chapterNo < startChapter) return false
          if (endChapter && chapterNo > endChapter) return false
          return true
        })
        .map(card => `第${card.chapterNo}章 ${card.score}分`)
      const riskTags: string[] = []
      if (nextAdvanceChapter && activeChapterNo > nextAdvanceChapter) riskTags.push('逾期未推')
      if (/debt|overdue|逾期|待回收|回收债务/.test(payoffStatus)) riskTags.push('回收债务')
      if (retentionImpacts.length > 0) riskTags.push('影响留存')

      return {
        id: entity?.id,
        name: text(entity?.name, '未命名剧情线'),
        entityType,
        typeLabel: STORYLINE_TYPE_LABELS[entityType],
        summary: text(entity?.summary),
        priority: text(payload?.priority || entity?.priority, 'normal'),
        status: text(state?.current_state || entity?.status, 'active'),
        startChapter,
        endChapter,
        lastAdvancedChapter,
        nextAdvanceChapter,
        payoffStatus,
        expectedPayoff: text(payload?.expected_payoff || state?.expected_payoff),
        relatedNames: listText(payload?.related_characters, payload?.related_factions, payload?.related_foreshadowing),
        advanceRule: text(constraints?.advance_rule || payload?.advance_rule),
        forbiddenReveal: text(constraints?.forbidden_reveal || constraints?.taboo || payload?.forbidden_reveal),
        riskTags,
        retentionImpacts,
        actionChapterNo: nextAdvanceChapter || startChapter || activeChapterNo,
      }
    })
    .sort((a, b) => {
      const priorityScore = (value: string) => value === 'high' || value === '核心' ? 0 : value === 'medium' || value === '中' ? 1 : 2
      return priorityScore(a.priority) - priorityScore(b.priority)
        || (a.nextAdvanceChapter || 99999) - (b.nextAdvanceChapter || 99999)
        || a.name.localeCompare(b.name, 'zh-CN')
    })

  const groups = STORYLINE_TYPE_ORDER
    .map(key => {
      const groupItems = items.filter(item => item.entityType === key)
      return { key, label: STORYLINE_TYPE_LABELS[key], count: groupItems.length, items: groupItems }
    })
    .filter(group => group.count > 0)
  const overdueCount = items.filter(item => item.riskTags.includes('逾期未推')).length
  const debtCount = items.filter(item => item.riskTags.includes('回收债务')).length
  const retentionRiskCount = items.filter(item => item.riskTags.includes('影响留存')).length
  const status = items.length === 0 ? 'missing' : (overdueCount || debtCount || retentionRiskCount) ? 'needs_attention' : 'ready'

  return {
    status,
    summary: items.length === 0
      ? '尚未建立剧情线资产。'
      : status === 'ready'
        ? `已有 ${items.length} 条剧情线，当前没有明显调度风险。`
        : `已有 ${items.length} 条剧情线，${overdueCount} 条逾期未推，${debtCount} 条存在回收债务，${retentionRiskCount} 条影响前30章留存。`,
    total: items.length,
    overdueCount,
    debtCount,
    retentionRiskCount,
    groups,
  }
}

function latestReviewPayload(reviews: AnyRecord[], reviewType: string, payloadKey: string) {
  const review = reviews
    .filter(item => text(item?.review_type) === reviewType)
    .sort((a, b) => reviewTime(b) - reviewTime(a))[0]
  const payload = parseJsonValue(review?.payload) || {}
  return payload[payloadKey] || payload.result?.[payloadKey] || payload.result || payload
}

function boundedScore(value: any, fallback: number) {
  const score = Number(value)
  if (!Number.isFinite(score)) return fallback
  return Math.max(0, Math.min(100, Math.round(score)))
}

function rhythmStatusFromSignals(signals: PlanningRhythmSignal[]): PlanningWorkspaceModel['longformRhythm']['status'] {
  if (signals.some(signal => signal.status === 'block')) return 'blocked'
  if (signals.some(signal => signal.status === 'warn')) return 'needs_attention'
  return 'ready'
}

function buildLongformRhythmModel(args: {
  reviews: AnyRecord[]
  writtenWords: number
  currentVolumeGoal: string
  future100Coverage: FuturePlanningCoverage
  healthIssues: PlanningHealthIssue[]
  first30Retention: PlanningWorkspaceModel['first30Retention']
  storylineBoard: PlanningWorkspaceModel['storylineBoard']
}): PlanningWorkspaceModel['longformRhythm'] {
  const coreDrift = latestReviewPayload(args.reviews, 'chapter_core_drift', 'core_drift')
  const payoffSync = latestReviewPayload(args.reviews, 'reader_payoff_sync', 'reader_payoff_sync')
  const coreRiskCount = arrayValue(coreDrift?.drift_risks).length
  const coreStatus: PlanningRhythmSignal['status'] = args.healthIssues.some(issue => issue.key === 'missing_reader_promise')
    ? 'block'
    : text(coreDrift?.status).toLowerCase() === 'warn' || coreRiskCount > 0
      ? 'warn'
      : 'ok'
  const future100Ratio = args.future100Coverage.required > 0
    ? args.future100Coverage.planned / args.future100Coverage.required
    : 1
  const volumeStatus: PlanningRhythmSignal['status'] = !args.currentVolumeGoal
    ? 'block'
    : future100Ratio < 0.3
      ? 'warn'
      : 'ok'
  const payoffDebt = Number(payoffSync?.debt_count ?? payoffSync?.debtCount ?? arrayValue(payoffSync?.missed).length + arrayValue(payoffSync?.debts).length)
  const payoffStatus: PlanningRhythmSignal['status'] = payoffDebt > 0 || text(payoffSync?.status).toLowerCase() === 'warn' ? 'warn' : 'ok'
  const fatigueRisk = args.first30Retention.status !== 'ready'
    || args.storylineBoard.overdueCount > 0
    || args.storylineBoard.debtCount > 0
    || args.storylineBoard.retentionRiskCount > 0
  const fatigueStatus: PlanningRhythmSignal['status'] = fatigueRisk ? 'warn' : 'ok'
  const bandIndex = Math.max(1, Math.floor(Math.max(0, args.writtenWords) / 100000) + 1)

  const signals: PlanningRhythmSignal[] = [
    {
      key: 'core',
      label: '核心守恒',
      status: coreStatus,
      score: coreStatus === 'block' ? 45 : boundedScore(coreDrift?.score, coreStatus === 'warn' ? 68 : 88),
      detail: coreStatus === 'block'
        ? '长篇核心承诺缺失，不能进入连续生产。'
        : coreStatus === 'warn'
          ? text(coreDrift?.label || coreDrift?.summary, `核心偏移 ${coreRiskCount || 1}`)
          : '核心承诺、卷目标和章节服务关系稳定。',
      actionKey: coreStatus === 'ok' ? 'open_outline_tree' : 'open_story_assets',
    },
    {
      key: 'volume',
      label: '卷级推进',
      status: volumeStatus,
      score: volumeStatus === 'block' ? 45 : volumeStatus === 'warn' ? Math.max(55, Math.round(future100Ratio * 100)) : 86,
      detail: volumeStatus === 'block'
        ? '当前章节没有明确卷目标。'
        : volumeStatus === 'warn'
          ? `未来100章规划 ${args.future100Coverage.label}，不适合长时间自动连写。`
          : `当前卷目标明确，未来100章规划 ${args.future100Coverage.label}。`,
      actionKey: volumeStatus === 'ok' ? 'open_outline_tree' : 'update_rolling_plan',
    },
    {
      key: 'payoff',
      label: '回报兑现',
      status: payoffStatus,
      score: boundedScore(payoffSync?.score, payoffStatus === 'warn' ? 64 : 86),
      detail: payoffStatus === 'warn'
        ? text(payoffSync?.label, `回报欠账 ${payoffDebt}`)
        : '章节承诺、场景回报和待回收期待处于可控状态。',
      actionKey: payoffStatus === 'ok' ? 'enter_chapter_writing' : 'open_quality_revision',
    },
    {
      key: 'fatigue',
      label: '疲劳风险',
      status: fatigueStatus,
      score: fatigueStatus === 'warn' ? Math.max(50, Math.min(78, Number(args.first30Retention.score || 72))) : 86,
      detail: fatigueStatus === 'warn'
        ? `剧情线债务 ${args.storylineBoard.debtCount}，逾期 ${args.storylineBoard.overdueCount}，前30章状态 ${args.first30Retention.status}。`
        : '留存曲线、剧情线推进和回收压力没有明显疲劳信号。',
      actionKey: fatigueStatus === 'warn' ? 'run_first30_retention' : 'enter_chapter_writing',
    },
  ]
  const status = rhythmStatusFromSignals(signals)
  const score = Math.max(0, Math.min(100, Math.round(signals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, signals.length))))
  const riskySignals = signals.filter(signal => signal.status !== 'ok')

  return {
    status,
    score,
    label: status === 'ready' ? `节奏健康 ${score}` : status === 'blocked' ? `节奏阻塞 ${score}` : `节奏风险 ${score}`,
    summary: status === 'ready'
      ? '长篇节奏稳定，可以继续推进当前章。'
      : `长篇节奏存在 ${riskySignals.length} 项风险：${riskySignals.map(signal => signal.label).join('、')}。`,
    currentBandLabel: `第${bandIndex}个10万字`,
    signals,
    nextActions: status === 'ready'
      ? ['保持卷目标、回报兑现和剧情线回收的节奏闭环。']
      : ['先处理核心偏移、回报欠账和剧情线债务，再连续生成下一批章节。'],
  }
}

export function buildPlanningWorkspaceModel(input: BuildPlanningWorkspaceModelInput): PlanningWorkspaceModel {
  const selectedProject = input.selectedProject || {}
  const outlines = arrayValue(input.outlines)
  const chapters = arrayValue(input.chapters).slice().sort((a, b) => Number(a?.chapter_no || 0) - Number(b?.chapter_no || 0))
  const activeChapter = input.activeChapter || chapters[0] || {}
  const activeChapterNo = Number(activeChapter?.chapter_no || chapters[0]?.chapter_no || 1)
  const writingBible = resolveWritingBible(selectedProject)
  const storyState = resolveStoryState(selectedProject)
  const reviews = arrayValue(input.reviews)
  const settingEntities = arrayValue(input.settingEntities)

  const currentVolume = outlines.find(outline => isVolume(outline) && chapterInRange(activeChapterNo, outline)) || outlines.find(isVolume) || {}
  const currentStage = outlines.find(outline => isStage(outline) && chapterInRange(activeChapterNo, outline)) || outlines.find(isStage) || {}
  const turns = outlines.filter(isTurn).sort((a, b) => chapterRange(a).start - chapterRange(b).start)
  const currentTurns = turns.filter(turn => chapterInRange(activeChapterNo, turn))
  const previousTurn = turns.filter(turn => chapterRange(turn).end < activeChapterNo).at(-1)
  const nextTurn = turns.find(turn => chapterRange(turn).start >= activeChapterNo)
  const bibleVolume = resolveVolumeFromBible(writingBible, currentVolume)
  const bibleStage = resolveStageFromBible(bibleVolume, currentStage)

  const routeChapters = chapters.filter(chapter => Number(chapter?.chapter_no) >= activeChapterNo).slice(0, 10)
  const futureRoute = routeChapters.map(chapter => ({
    chapterNo: Number(chapter?.chapter_no),
    title: text(chapter?.title, `第${chapter?.chapter_no || '?'}章`),
    chapterTask: text(chapter?.chapter_goal || chapter?.chapterTask || chapter?.task),
    conflict: text(chapter?.conflict || chapter?.raw_payload?.conflict),
    endingHook: text(chapter?.ending_hook || chapter?.endingHook || chapter?.hook),
    mainlineProgress: text(chapter?.raw_payload?.mainline_progress || chapter?.mainline_progress),
    riskTags: routeRiskTags(chapter, currentTurns.length ? currentTurns : turns),
  }))

  const planRecords = planningRecords(chapters, outlines)
  const future10Coverage = buildCoverage(planRecords, activeChapterNo, 10)
  const future100Coverage = buildCoverage(planRecords, activeChapterNo, 100)
  const readerPromise = firstNonEmpty(writingBible?.promise, writingBible?.reader_promise, selectedProject?.reader_promise)
  const currentVolumeGoal = firstNonEmpty(bibleVolume?.goal, currentVolume?.goal, currentVolume?.summary)
  const currentStageConflict = firstNonEmpty(bibleStage?.conflict, currentStage?.conflict, activeChapter?.conflict)
  const activeChapterEvidence = firstNonEmpty(
    activeChapter?.chapter_goal,
    activeChapter?.raw_payload?.mainline_progress,
    activeChapter?.mainline_progress,
    activeChapter?.chapter_summary,
    activeChapter?.summary,
  )
  const healthIssues = buildHealthIssues({
    readerPromise,
    currentVolumeGoal,
    future10Coverage,
    storyState,
    latestWrittenChapterNo: latestWrittenChapterNo(chapters),
    materialScore: input.materialScore,
  })
  const first30Retention = buildFirst30RetentionModel(chapters, reviews)
  const storylineBoard = buildStorylineBoardModel(settingEntities, first30Retention, activeChapterNo)
  const writtenWords = chapters.reduce((sum, chapter) => sum + wc(chapter?.chapter_text), 0)
  const longformRhythm = buildLongformRhythmModel({
    reviews,
    writtenWords,
    currentVolumeGoal,
    future100Coverage,
    healthIssues,
    first30Retention,
    storylineBoard,
  })

  return {
    topStatus: {
      projectTitle: text(selectedProject?.title, '未命名项目'),
      currentVolume: text(currentVolume?.title || bibleVolume?.title, '未定位当前卷'),
      currentStage: text(currentStage?.title || bibleStage?.title, '未定位当前阶段'),
      currentChapterLabel: activeChapterNo ? `第${activeChapterNo}章` : '未选择章节',
      writtenWords,
      targetWords: Number(selectedProject?.target_words || selectedProject?.targetWords || 0),
      future10Coverage,
      future100Coverage,
      longformHealth: healthLabel(healthIssues),
    },
    mainline: {
      readerPromise,
      currentVolumeGoal,
      currentStageConflict,
      payoffModel: firstNonEmpty(bibleStage?.payoff_model, activeChapter?.raw_payload?.payoff, writingBible?.payoff_model),
      previousTurn: text(previousTurn?.title, ''),
      nextTurn: text(nextTurn?.title, ''),
      currentChapterServesVolume: Boolean(currentVolumeGoal && activeChapterEvidence),
      risks: [
        ...arrayValue(storyState?.foreshadowing_status)
          .filter(item => text(item?.status) && text(item?.status) !== 'resolved')
          .map(item => `伏笔未回收：${text(item?.name, '未命名伏笔')}`),
        ...healthIssues.map(issue => issue.title),
      ],
    },
    futureRoute,
    first30Retention,
    storylineBoard,
    longformRhythm,
    volumeTree: buildVolumeTree(outlines, chapters),
    healthIssues,
  }
}

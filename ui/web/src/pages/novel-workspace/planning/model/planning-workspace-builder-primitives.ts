import { wc } from '../../utils'
import { parseWorkspacePayload, type WorkspacePayloadParseOptions } from '../../payloadParseCache'

type AnyRecord = Record<string, any>
import type {
  PlanningActionKey,
  PlanningHealthIssue,
  PlanningHealthStatus,
  PlanningVolumeBeat,
  PlanningVolumeTreeNode,
  FuturePlanningCoverage,
} from './planning-workspace-model'

import {
  listLength,
  latestReviewPayloadAny,
} from './planning-workspace-builder-radar'

export function text(value: any, fallback = '') {
  if (value === null || value === undefined) return fallback
  const normalized = String(value).trim()
  return normalized || fallback
}

export function arrayValue(value: any): any[] {
  return Array.isArray(value) ? value : []
}

export function chapterRange(item: AnyRecord) {
  const start = Number(item?.start_chapter ?? item?.chapter_no ?? 0)
  const end = Number(item?.end_chapter ?? item?.start_chapter ?? item?.chapter_no ?? start)
  return { start, end }
}

export function chapterInRange(chapterNo: number, item: AnyRecord) {
  const { start, end } = chapterRange(item)
  return start > 0 && chapterNo >= start && chapterNo <= end
}

export function outlineLevel(item: AnyRecord) {
  return text(item?.outline_level || item?.level || item?.outline_type).toLowerCase()
}

export function isVolume(item: AnyRecord) {
  const level = outlineLevel(item)
  return level === 'volume' || level === '卷'
}

export function isStage(item: AnyRecord) {
  const level = outlineLevel(item)
  return level === 'stage' || level === 'arc' || level === '阶段'
}

export function isTurn(item: AnyRecord) {
  const level = outlineLevel(item)
  return level === 'turning_point' || level === 'turn' || level === 'plot_turn' || level === '转折'
}

export function isClimaxOutline(item: AnyRecord) {
  const level = outlineLevel(item)
  const title = text(item?.title)
  return isTurn(item) || /climax|高潮|爆点|反转|转折/.test(level) || /高潮|爆点|反转|转折/.test(title)
}

export function firstNonEmpty(...values: any[]) {
  for (const value of values) {
    const normalized = text(value)
    if (normalized) return normalized
  }
  return ''
}

export function reviewHasPayload(value: AnyRecord) {
  return Boolean(value && Object.keys(value).length > 0)
}

export function itemTextList(items: any[], limit = 2) {
  return items
    .map(item => text(item?.text || item?.summary || item?.label || item?.description || item?.name || item))
    .filter(Boolean)
    .slice(0, limit)
    .join('；')
}



export function resolveWritingBible(project?: AnyRecord | null) {
  return project?.reference_config?.writing_bible || project?.writing_bible || {}
}

export function resolveStoryState(project?: AnyRecord | null) {
  return project?.reference_config?.story_state || project?.story_state || {}
}

function titleMatches(a: any, b: any) {
  const left = text(a)
  const right = text(b)
  return Boolean(left && right && (left.includes(right) || right.includes(left)))
}

export function resolveVolumeFromBible(writingBible: AnyRecord, currentVolume?: AnyRecord) {
  const volumes = arrayValue(writingBible?.volumes)
  const matched = volumes.find(volume => titleMatches(currentVolume?.title, volume?.title))
  if (matched) return matched
  return currentVolume?.title ? {} : volumes[0] || {}
}

export function resolveStageFromBible(volume: AnyRecord, currentStage?: AnyRecord) {
  const stages = arrayValue(volume?.stages)
  const matched = stages.find(stage => titleMatches(currentStage?.title, stage?.title))
  if (matched) return matched
  return currentStage?.title ? {} : stages[0] || {}
}

export function routeRiskTags(chapter: AnyRecord, activeTurns: AnyRecord[] = []) {
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

export function outlineChapterNo(outline: AnyRecord) {
  const rawNo = Number(outline?.raw_payload?.chapter_no || outline?.raw_payload?.future100?.chapter_no || outline?.raw_payload?.skeleton?.chapter_no || outline?.raw_payload?.rollingPlan?.chapter_no || 0)
  if (rawNo) return rawNo
  const match = text(outline?.title).match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}

function futureSkeletonPlanFromOutline(outline: AnyRecord) {
  const future = outline?.raw_payload?.rollingPlan || outline?.raw_payload?.future100 || outline?.raw_payload?.skeleton || {}
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

export function planningRecords(chapters: AnyRecord[], outlines: AnyRecord[]) {
  const futureSkeletons = outlines
    .filter(outline => outlineLevel(outline) === 'chapter' && (outline?.raw_payload?.source === 'rolling_plan' || outline?.raw_payload?.source === 'future_100_skeleton' || outline?.raw_payload?.rollingPlan || outline?.raw_payload?.future100 || outline?.raw_payload?.skeleton))
    .map(futureSkeletonPlanFromOutline)
    .filter(Boolean) as AnyRecord[]
  return [...futureSkeletons, ...chapters]
}

export function buildCoverage(records: AnyRecord[], startChapterNo: number, span: number): FuturePlanningCoverage {
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

export function buildVolumeTree(outlines: AnyRecord[], chapters: AnyRecord[]): PlanningVolumeTreeNode[] {
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
      wordCount: chapterWordCount(chapter),
      children: [],
    }
    const parent = outlines.find(outline => outline.id === chapter.outline_id) || outlines.find(outline => isStage(outline) && chapterInRange(chapterNode.chapterNo, outline))
    const parentNode = parent ? byId.get(parent.id) : null
    if (parentNode) parentNode.children.push(chapterNode)
  })

  return roots
}

export function buildHealthIssues(args: {
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

export function healthLabel(issues: PlanningHealthIssue[]): PlanningHealthStatus {
  if (issues.some(issue => issue.severity === 'critical')) return { status: 'needs_planning', label: '需要补规划' }
  if (issues.length > 0) return { status: 'drifting', label: '存在漂移' }
  return { status: 'healthy', label: '规划健康' }
}

export function latestWrittenChapterNo(chapters: AnyRecord[]) {
  return chapters.reduce((latest, chapter) => {
    if (!chapterHasProse(chapter)) return latest
    const chapterNo = Number(chapter?.chapter_no || 0)
    return chapterNo > latest ? chapterNo : latest
  }, 0)
}

export function parseJsonValue(value: any, options: WorkspacePayloadParseOptions = {}) {
  return parseWorkspacePayload(value, options)
}


// Shared helpers hoisted for multi-domain planning builders
export function numericCount(...values: any[]) {
  for (const value of values) {
    const num = Number(value)
    if (Number.isFinite(num) && num > 0) return num
  }
  return 0
}


// Delivery-risk helpers shared by volume gate + governance desks
export function numberOrNull(...values: any[]) {
  for (const value of values) {
    const num = Number(value)
    if (Number.isFinite(num) && num > 0) return num
  }
  return null
}

export function weakDimensionCount(report: AnyRecord) {
  const weakDimensions = [
    ...arrayValue(report?.weak_dimensions),
    ...arrayValue(report?.weakDimensions),
    ...arrayValue(report?.dimensions).filter(item => text(item?.status) === 'warn'),
  ]
  return weakDimensions.length
}

export function copiedPhraseCount(report: AnyRecord) {
  return listLength(report?.copied_phrases) + listLength(report?.copiedPhrases)
}

export const DELIVERY_RISK_REVIEW_DEFS: Array<{
  type: string
  payloadKey: string
  label: string
  count: (report: AnyRecord, review?: AnyRecord | null) => number
}> = [
  {
    type: 'chapter_core_drift',
    payloadKey: 'core_drift',
    label: '核心',
    count: report => listLength(report?.drift_risks) + listLength(report?.risks),
  },
  {
    type: 'reader_payoff_sync',
    payloadKey: 'reader_payoff_sync',
    label: '回报',
    count: report => numericCount(report?.debt_count, report?.debtCount, listLength(report?.missed) + listLength(report?.debts)),
  },
  {
    type: 'reader_expectation_sync',
    payloadKey: 'reader_expectation_sync',
    label: '期待',
    count: report => numericCount(report?.missed_count, report?.missedCount, listLength(report?.missed)),
  },
  {
    type: 'reader_retention_sync',
    payloadKey: 'reader_retention_sync',
    label: '追读',
    count: report => numericCount(report?.missed_count, report?.missedCount, listLength(report?.missed)),
  },
  {
    type: 'innovation_sync',
    payloadKey: 'innovation_sync',
    label: '创新',
    count: report => numericCount(report?.missed_count, report?.missedCount, listLength(report?.missed)),
  },
  {
    type: 'volume_beat_sync',
    payloadKey: 'volume_beat_sync',
    label: '爆点',
    count: report => numericCount(report?.missed_count, report?.missedCount, listLength(report?.missed)),
  },
  {
    type: 'storyline_sync',
    payloadKey: 'storyline_sync',
    label: '剧情线',
    count: report => listLength(report?.missed) + listLength(report?.unplanned) + listLength(report?.forbidden_touched),
  },
  {
    type: 'story_unit_sync',
    payloadKey: 'story_unit_sync',
    label: '剧情单元',
    count: report => numericCount(
      report?.missed_count,
      report?.missedCount,
      report?.risk_count,
      report?.riskCount,
      listLength(report?.missed) + listLength(report?.risks) + listLength(report?.rushed_ahead) + listLength(report?.rushedAhead) + listLength(report?.forbidden_touched) + listLength(report?.forbiddenTouched),
    ),
  },
  {
    type: 'story_drive_sync',
    payloadKey: 'story_drive_sync',
    label: '故事力',
    count: report => numericCount(report?.missed_count, report?.missedCount, report?.weak_count, report?.weakCount, listLength(report?.missed)),
  },
  {
    type: 'character_arc_sync',
    payloadKey: 'character_arc_sync',
    label: '人物弧光',
    count: report => numericCount(report?.missed_count, report?.missedCount, report?.weak_count, report?.weakCount, listLength(report?.missed)),
  },
  {
    type: 'signature_scene_sync',
    payloadKey: 'signature_scene_sync',
    label: '强场面',
    count: report => numericCount(report?.missed_count, report?.missedCount, listLength(report?.missed)),
  },
  {
    type: 'chapter_attraction_review',
    payloadKey: 'chapter_attraction_review',
    label: '吸引力',
    count: report => numericCount(report?.weak_count, report?.weakCount, report?.risk_count, report?.riskCount, weakDimensionCount(report)),
  },
  {
    type: 'chapter_benchmark_sync',
    payloadKey: 'chapter_benchmark_sync',
    label: '标杆章',
    count: report => numericCount(report?.missed_count, report?.missedCount, listLength(report?.missed)),
  },
  {
    type: 'style_sample_sync',
    payloadKey: 'style_sample_sync',
    label: '风格',
    count: report => numericCount(report?.missed_count, report?.missedCount, listLength(report?.missed) + copiedPhraseCount(report)),
  },
  {
    type: 'readability_review',
    payloadKey: 'readability_review',
    label: '可读性',
    count: report => listLength(report?.meme_sense?.immersion_risks) + listLength(report?.immersion_risks),
  },
  {
    type: 'runway_sync',
    payloadKey: 'runway_sync',
    label: '航线',
    count: report => numericCount(
      report?.risk_count,
      report?.riskCount,
      listLength(report?.four_question_missed) + listLength(report?.reader_fuel_missed) + listLength(report?.redline_touched),
    ),
  },
]

export function reviewChapterNo(review: AnyRecord, payload: AnyRecord) {
  return Number(
    payload?.chapter_no
      || payload?.chapterNo
      || payload?.chapter?.chapter_no
      || payload?.chapter?.chapterNo
      || review?.chapter_no
      || review?.chapterNo
      || 0
  )
}

export function latestDeliveryRiskReports(reviews: AnyRecord[]) {
  const latest = new Map<string, { def: typeof DELIVERY_RISK_REVIEW_DEFS[number]; review: AnyRecord; report: AnyRecord }>()
  reviews.forEach(review => {
    const def = DELIVERY_RISK_REVIEW_DEFS.find(item => item.type === text(review?.review_type))
    if (!def) return
    const payload = parseJsonValue(review?.payload, { owner: review, kind: 'review', field: 'payload' })
      || parseJsonValue(review?.payload_json, { owner: review, kind: 'review', field: 'payload_json' })
      || {}
    const report = payload?.[def.payloadKey] || payload?.result?.[def.payloadKey] || payload?.result || payload
    const chapterNo = reviewChapterNo(review, payload)
    const key = `${chapterNo || 'global'}:${def.type}`
    const current = latest.get(key)
    if (!current || reviewTime(review) >= reviewTime(current.review)) {
      latest.set(key, { def, review, report })
    }
  })
  return Array.from(latest.values())
}

export function aggregateDeliveryRiskCounts(reviews: AnyRecord[]) {
  const totals: Record<string, number> = {}
  for (const def of DELIVERY_RISK_REVIEW_DEFS) {
    totals[def.type] = 0
  }
  latestDeliveryRiskReports(reviews).forEach(({ def, report, review }) => {
    totals[def.type] += Math.max(0, def.count(report, review))
  })
  const expectationMissedCount = totals.reader_expectation_sync || 0
  const retentionMissedCount = totals.reader_retention_sync || 0
  const total = (totals.chapter_core_drift || 0)
    + (totals.reader_payoff_sync || 0)
    + Math.max(expectationMissedCount, retentionMissedCount)
    + (totals.innovation_sync || 0)
    + (totals.volume_beat_sync || 0)
    + (totals.storyline_sync || 0)
    + (totals.story_unit_sync || 0)
    + (totals.story_drive_sync || 0)
    + (totals.character_arc_sync || 0)
    + (totals.signature_scene_sync || 0)
    + (totals.chapter_attraction_review || 0)
    + (totals.chapter_benchmark_sync || 0)
    + (totals.style_sample_sync || 0)
    + (totals.readability_review || 0)
    + (totals.runway_sync || 0)
  const labels = DELIVERY_RISK_REVIEW_DEFS
    .filter(def => (totals[def.type] || 0) > 0)
    .map(def => def.label)
  return {
    totals,
    labels,
    total,
    coreRiskCount: totals.chapter_core_drift || 0,
    payoffDebtCount: totals.reader_payoff_sync || 0,
    expectationMissedCount,
    retentionMissedCount,
    innovationMissedCount: totals.innovation_sync || 0,
    volumeBeatMissedCount: totals.volume_beat_sync || 0,
    storylineRiskCount: totals.storyline_sync || 0,
    readabilityRiskCount: totals.readability_review || 0,
  }
}

export function planningActionLabel(key: PlanningActionKey) {
  const labels: Record<PlanningActionKey, string> = {
    update_rolling_plan: '更新滚动规划',
    complete_volume_plan: '补齐当前卷规划',
    enter_story_planning: '进入故事规划',
    enter_chapter_writing: '进入当前章写作',
    open_outline_tree: '查看完整大纲',
    future100_audit: '检查未来100章',
    future100_generate: '生成未来100章',
    longform_pressure: '运行长线压力测试',
    longform_creation_diagnosis: '运行创作诊断',
    topic_validation: '验证原创选题',
    reference_diagnosis: '诊断参考知识',
    open_story_assets: '打开资料设定',
    update_story_state: '校正故事状态',
    open_quality_revision: '进入质检修订',
    run_first30_retention: '运行前30章诊断',
    create_first30_repair: '生成留存修复任务',
    run_reader_trial_review: '运行读者试读复盘',
    create_reader_trial_repair: '生成试读修复任务',
    create_delivery_risk_repair: '生成风险修复任务',
    record_storyline_diff_decision: '记录剧情线决策',
    create_storyline_decision_tasks: '生成剧情线决策任务',
    open_task_center: '打开任务中心',
  }
  return labels[key]
}

export function chapterHasProse(chapter: AnyRecord) {
  const chapterText = text(chapter?.chapter_text || chapter?.content || chapter?.prose)
  if (chapterText) return Boolean(!chapterText.includes('【占位正文】') && wc(chapterText) > 0)
  return Boolean(chapter?.has_prose || chapter?.hasProse || Number(chapter?.word_count ?? chapter?.wordCount ?? 0) > 0)
}

export function chapterWordCount(chapter: AnyRecord) {
  const chapterText = text(chapter?.chapter_text || chapter?.content || chapter?.prose)
  return chapterText ? wc(chapterText) : Math.max(0, Number(chapter?.word_count ?? chapter?.wordCount ?? 0) || 0)
}

export function boundedScore(value: any, fallback: number) {
  const score = Number(value)
  if (!Number.isFinite(score)) return fallback
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function reviewTime(review: AnyRecord) {
  const raw = text(review?.created_at || review?.updated_at)
  if (!raw) return 0
  const timestamp = Date.parse(raw)
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function latestFirst30Review(reviews: AnyRecord[]) {
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

export function first30ReportIsStale(review: AnyRecord, chapters: AnyRecord[]) {
  const reportTime = reviewTime(review)
  if (!reportTime) return false
  return chapters
    .filter(chapter => Number(chapter?.chapter_no || 0) >= 1 && Number(chapter?.chapter_no || 0) <= 30)
    .some(chapter => chapterUpdatedTime(chapter) > reportTime)
}

function productionTaskRuns(productionTasks?: AnyRecord | null) {
  if (!productionTasks) return []
  return [
    ...arrayValue(productionTasks.tasks),
    ...arrayValue(productionTasks.active),
    ...arrayValue(productionTasks.recent),
    ...arrayValue(productionTasks.completed),
    ...arrayValue(productionTasks.history),
  ]
}

function runCompletedTime(run: AnyRecord) {
  const raw = text(run?.completed_at || run?.finished_at || run?.updated_at || run?.created_at)
  if (!raw) return 0
  const timestamp = Date.parse(raw)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function runIsCompleted(run: AnyRecord) {
  return ['success', 'completed', 'done', 'resolved'].includes(text(run?.status).toLowerCase())
}

export function latestFirst30RepairAfterReport(review: AnyRecord, productionTasks?: AnyRecord | null) {
  const reportTime = reviewTime(review)
  if (!reportTime) return null
  return productionTaskRuns(productionTasks)
    .filter(run => text(run?.run_type || run?.type) === 'first30_retention_repair')
    .filter(runIsCompleted)
    .map(run => ({ run, completedAt: runCompletedTime(run) }))
    .filter(item => item.completedAt > reportTime)
    .sort((a, b) => b.completedAt - a.completedAt)[0]?.run || null
}

export function volumeBeatType(chapterNo: number, start: number, end: number): PlanningVolumeBeat['type'] {
  if (!chapterNo || !start || !end || end <= start) return '小高潮'
  const ratio = (chapterNo - start) / Math.max(1, end - start)
  if (ratio >= 0.82) return '卷末爆点'
  if (ratio >= 0.42) return '中高潮'
  return '小高潮'
}

export function hasChapterPayoff(chapter: AnyRecord) {
  return Boolean(firstNonEmpty(
    chapter?.raw_payload?.payoff,
    chapter?.raw_payload?.reader_payoff,
    chapter?.raw_payload?.reader_reward,
    chapter?.payoff,
    chapter?.reader_payoff,
    chapter?.ending_hook,
  ))
}

export function isChapterPlannedForBudget(chapter: AnyRecord) {
  return Boolean(
    text(chapter?.title) &&
    text(chapter?.chapter_goal || chapter?.chapterTask || chapter?.task) &&
    text(chapter?.conflict || chapter?.raw_payload?.conflict) &&
    text(chapter?.ending_hook || chapter?.endingHook || chapter?.hook)
  )
}


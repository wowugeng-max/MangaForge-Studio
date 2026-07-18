import { wc } from '../../utils'
import { parseWorkspacePayload, type WorkspacePayloadParseOptions } from '../../payloadParseCache'

type AnyRecord = Record<string, any>
import type {
  FuturePlanningCoverage,
  PlanningActionKey,
  PlanningBattleDeskLane,
  PlanningCoreContractRadarCheck,
  PlanningCreationPipelineStage,
  PlanningHealthIssue,
  PlanningHealthStatus,
  PlanningLongformSpineAxis,
  PlanningMillionWordMilestone,
  PlanningRhythmSignal,
  PlanningSerialReleaseDesk,
  PlanningStoryUnit,
  PlanningStoryUnitSignal,
  PlanningStorylineBoardItem,
  PlanningVolumeBeat,
  PlanningVolumeTreeNode,
  PlanningWorkspaceModel,
} from './planning-workspace-model'
import {
  buildCreationPipelineModel,
  buildGovernanceHubModel,
  buildLongformBattleDeskModel,
  buildLongformRhythmModel,
  buildSerialReleaseDeskModel,
} from './planning-workspace-builder-desks'

export type BuildPlanningWorkspaceModelInput = {
  selectedProject?: AnyRecord | null
  outlines?: AnyRecord[]
  chapters?: AnyRecord[]
  activeChapter?: AnyRecord | null
  materialScore?: AnyRecord | null
  commercialReadiness?: AnyRecord | null
  reviews?: AnyRecord[] | null
  settingEntities?: AnyRecord[] | null
  productionTasks?: AnyRecord | null
}

export function text(value: any, fallback = '') {
  if (value === null || value === undefined) return fallback
  const normalized = String(value).trim()
  return normalized || fallback
}

export function arrayValue(value: any): any[] {
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

function isClimaxOutline(item: AnyRecord) {
  const level = outlineLevel(item)
  const title = text(item?.title)
  return isTurn(item) || /climax|高潮|爆点|反转|转折/.test(level) || /高潮|爆点|反转|转折/.test(title)
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

function planningRecords(chapters: AnyRecord[], outlines: AnyRecord[]) {
  const futureSkeletons = outlines
    .filter(outline => outlineLevel(outline) === 'chapter' && (outline?.raw_payload?.source === 'rolling_plan' || outline?.raw_payload?.source === 'future_100_skeleton' || outline?.raw_payload?.rollingPlan || outline?.raw_payload?.future100 || outline?.raw_payload?.skeleton))
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
      wordCount: chapterWordCount(chapter),
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

function latestFirst30RepairAfterReport(review: AnyRecord, productionTasks?: AnyRecord | null) {
  const reportTime = reviewTime(review)
  if (!reportTime) return null
  return productionTaskRuns(productionTasks)
    .filter(run => text(run?.run_type || run?.type) === 'first30_retention_repair')
    .filter(runIsCompleted)
    .map(run => ({ run, completedAt: runCompletedTime(run) }))
    .filter(item => item.completedAt > reportTime)
    .sort((a, b) => b.completedAt - a.completedAt)[0]?.run || null
}

function retentionRiskLevel(score: number, flags: string[]) {
  if (score < 65 || flags.some(flag => /缺正文|章末钩子弱|爽点/.test(flag))) return 'high'
  if (score < 80 || flags.length > 0) return 'medium'
  return 'ok'
}

function buildFirst30RetentionModel(chapters: AnyRecord[], reviews: AnyRecord[], productionTasks?: AnyRecord | null): PlanningWorkspaceModel['first30Retention'] {
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

  const payload = parseJsonValue(review.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
  const report = payload.report || payload.result?.report || payload
  const staleByChapterUpdate = first30ReportIsStale(review, chapters)
  const completedRepair = latestFirst30RepairAfterReport(review, productionTasks)
  const stale = staleByChapterUpdate || Boolean(completedRepair)
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
    summary: stale
      ? `${completedRepair ? '需重新诊断：留存修复任务已完成，需复查修复后追读曲线。' : '需重新诊断：前30章内容已在报告后更新。'}${text(report?.summary)}`
      : text(report?.summary, '已完成前30章留存诊断。'),
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
    nextActions: [
      ...(completedRepair ? ['重新运行前30章诊断，确认修复后的目标、钩子、爽点和试读闭环已经收敛。'] : []),
      ...arrayValue(report?.next_actions).map(item => text(item)).filter(Boolean),
    ],
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

function storylineSyncReport(review: AnyRecord) {
  if (text(review?.review_type) !== 'storyline_sync') return null
  const payload = parseJsonValue(review?.payload, { owner: review, kind: 'review', field: 'payload' })
    || parseJsonValue(review?.payload_json, { owner: review, kind: 'review', field: 'payload_json' })
    || {}
  const report = payload.storyline_sync || payload.result?.storyline_sync || payload.result || payload
  if (!report || typeof report !== 'object') return null
  return {
    chapterNo: numberOrNull(payload.chapter_no, report.chapter_no, review.chapter_no),
    report,
  }
}

function storylineSyncItemMatches(entity: AnyRecord, item: AnyRecord) {
  const entityId = Number(entity?.id || 0)
  const itemId = Number(item?.entity_id || item?.id || 0)
  if (entityId && itemId && entityId === itemId) return true
  const entityType = text(entity?.entity_type)
  const itemType = text(item?.entity_type || item?.type)
  const entityName = text(entity?.name)
  const itemName = text(item?.name || item?.title)
  return Boolean(
    entityName &&
    itemName &&
    (!itemType || itemType === entityType) &&
    (entityName === itemName || entityName.includes(itemName) || itemName.includes(entityName)),
  )
}

function evidenceSummary(item: AnyRecord, fallback = '') {
  const expected = item?.expected_state_change
  const actual = item?.actual_state_change
  return firstNonEmpty(
    item?.summary,
    typeof actual === 'string' ? actual : actual?.summary,
    typeof expected === 'string' ? expected : expected?.summary,
    item?.description,
    item?.name,
    fallback,
  )
}

function uniqueEvidence<T extends { chapterNo: number | null; usageType: string; summary: string }>(items: T[]) {
  const seen = new Set<string>()
  const rows: T[] = []
  items.forEach(item => {
    const key = `${item.chapterNo || ''}:${item.usageType}:${item.summary}`
    if (!item.summary || seen.has(key)) return
    seen.add(key)
    rows.push(item)
  })
  return rows
}

function storylineDiffDecision(
  riskType: PlanningStorylineBoardItem['diffEvidence'][number]['riskType'],
): Pick<PlanningStorylineBoardItem['diffEvidence'][number], 'riskLabel' | 'recommendedDecision' | 'recommendedActionLabel' | 'recommendedActionDetail'> {
  if (riskType === 'missed') {
    return {
      riskLabel: '漏推',
      recommendedDecision: 'revise_prose',
      recommendedActionLabel: '回修正文',
      recommendedActionDetail: '任务书要求推进但正文没有兑现，优先回到当前章修订，把计划内推进写成现场行动或结果变化。',
    }
  }
  if (riskType === 'unplanned') {
    return {
      riskLabel: '额外推进',
      recommendedDecision: 'accept_as_plan',
      recommendedActionLabel: '接受为新计划',
      recommendedActionDetail: '正文推进了计划外剧情线；如果它更强且不破坏核心，应回到资料设定或大纲把它纳入后续计划。',
    }
  }
  return {
    riskLabel: '禁揭风险',
    recommendedDecision: 'false_positive',
    recommendedActionLabel: '标记误判',
    recommendedActionDetail: '正文疑似触碰禁揭边界；先核对证据，若确为误判可人工忽略，否则应回修为遮挡、误导或延迟兑现。',
  }
}

function storylineDiffEvidenceRows(
  entity: AnyRecord,
  chapterNo: number | null,
  riskType: PlanningStorylineBoardItem['diffEvidence'][number]['riskType'],
  items: AnyRecord[],
): PlanningStorylineBoardItem['diffEvidence'] {
  const decision = storylineDiffDecision(riskType)
  const entityId = entity?.id ?? null
  const entityName = text(entity?.name)
  const entityType = text(entity?.entity_type)
  const entityKey = text(entityId || entityName || entityType || 'unknown')
  return items.map(item => {
    const summary = evidenceSummary(item, decision.riskLabel)
    return {
      decisionKey: `storyline_diff:${chapterNo || 'unknown'}:${entityKey}:${riskType}:${summary}`.slice(0, 260),
      chapterNo,
      entityId,
      entityName,
      entityType,
      riskType,
      riskLabel: decision.riskLabel,
      usageType: text(item?.usage_type || item?.usageType || item?.change_type || item?.changeType, riskType),
      summary,
      evidence: firstNonEmpty(
        item?.evidence,
        item?.quote,
        item?.text,
        item?.reason,
        item?.issue,
        item?.description,
        summary,
      ),
      recommendedDecision: decision.recommendedDecision,
      recommendedActionLabel: decision.recommendedActionLabel,
      recommendedActionDetail: decision.recommendedActionDetail,
    }
  }).filter(item => Boolean(item.summary))
}

function buildStorylineSyncEvidence(entity: AnyRecord, reviews: AnyRecord[]) {
  const planEvidence: PlanningStorylineBoardItem['planEvidence'] = []
  const actualEvidence: PlanningStorylineBoardItem['actualEvidence'] = []
  const diffEvidence: PlanningStorylineBoardItem['diffEvidence'] = []
  const syncRisks: string[] = []
  const touchedChapters: number[] = []

  reviews
    .map(storylineSyncReport)
    .filter(Boolean)
    .sort((a: any, b: any) => (a.chapterNo || 0) - (b.chapterNo || 0))
    .forEach((sync: any) => {
      const chapterNo = sync.chapterNo || null
      const chapterLabel = chapterNo ? `第${chapterNo}章` : '未知章节'
      const planned = arrayValue(sync.report?.planned).filter((item: AnyRecord) => storylineSyncItemMatches(entity, item))
      const actual = [
        ...arrayValue(sync.report?.actual),
        ...arrayValue(sync.report?.completed),
      ].filter((item: AnyRecord) => storylineSyncItemMatches(entity, item))
      const missed = arrayValue(sync.report?.missed).filter((item: AnyRecord) => storylineSyncItemMatches(entity, item))
      const unplanned = arrayValue(sync.report?.unplanned).filter((item: AnyRecord) => storylineSyncItemMatches(entity, item))
      const forbiddenTouched = arrayValue(sync.report?.forbidden_touched).filter((item: AnyRecord) => storylineSyncItemMatches(entity, item))

      planned.forEach((item: AnyRecord) => {
        planEvidence.push({
          chapterNo,
          usageType: text(item?.usage_type || item?.usageType, 'planned'),
          summary: evidenceSummary(item, '计划推进剧情线'),
        })
      })
      actual.forEach((item: AnyRecord) => {
        actualEvidence.push({
          chapterNo,
          usageType: text(item?.usage_type || item?.usageType || item?.change_type || item?.changeType, 'actual'),
          summary: evidenceSummary(item, '正文已推进剧情线'),
        })
      })
      if (missed.length > 0) syncRisks.push(`${chapterLabel}漏推`)
      if (unplanned.length > 0) syncRisks.push(`${chapterLabel}额外推进`)
      if (forbiddenTouched.length > 0) syncRisks.push(`${chapterLabel}禁揭风险`)
      diffEvidence.push(
        ...storylineDiffEvidenceRows(entity, chapterNo, 'missed', missed),
        ...storylineDiffEvidenceRows(entity, chapterNo, 'unplanned', unplanned),
        ...storylineDiffEvidenceRows(entity, chapterNo, 'forbidden_touched', forbiddenTouched),
      )
      if (planned.length || actual.length || missed.length || unplanned.length || forbiddenTouched.length) {
        if (chapterNo) touchedChapters.push(chapterNo)
      }
    })

  return {
    planEvidence: uniqueEvidence(planEvidence).slice(-6),
    actualEvidence: uniqueEvidence(actualEvidence).slice(-6),
    diffEvidence: uniqueEvidence(diffEvidence).slice(-9),
    syncRisks: Array.from(new Set(syncRisks)).slice(-6),
    latestSyncChapter: touchedChapters.length ? Math.max(...touchedChapters) : null,
  }
}

function buildStorylineBoardModel(
  settingEntities: AnyRecord[],
  first30Retention: PlanningWorkspaceModel['first30Retention'],
  activeChapterNo: number,
  reviews: AnyRecord[] = [],
): PlanningWorkspaceModel['storylineBoard'] {
  const first30RiskCards = first30Retention.chapterCards.filter(card => card.riskLevel !== 'ok')
  const items = settingEntities
    .filter(entity => isStorylineType(text(entity?.entity_type)))
    .map(entity => {
      const entityType = text(entity?.entity_type)
      const payload = parseJsonValue(entity?.payload_json, { owner: entity, kind: 'setting', field: 'payload_json' }) || {}
      const constraints = parseJsonValue(entity?.constraints_json, { owner: entity, kind: 'setting', field: 'constraints_json' }) || {}
      const state = parseJsonValue(entity?.state_json, { owner: entity, kind: 'setting', field: 'state_json' }) || {}
      const startChapter = numberOrNull(entity?.first_chapter_no, payload?.start_chapter_no, payload?.start_chapter)
      const endChapter = numberOrNull(entity?.last_chapter_no, payload?.end_chapter_no, payload?.end_chapter)
      const lastAdvancedChapter = numberOrNull(state?.last_advanced_chapter, payload?.last_advanced_chapter)
      const nextAdvanceChapter = numberOrNull(state?.next_advance_chapter, payload?.next_advance_chapter)
      const payoffStatus = text(state?.payoff_status || payload?.payoff_status)
      const syncEvidence = buildStorylineSyncEvidence(entity, reviews)
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
      if (syncEvidence.syncRisks.some(item => item.includes('漏推'))) riskTags.push('复盘漏推')
      if (syncEvidence.syncRisks.some(item => item.includes('禁揭'))) riskTags.push('禁揭风险')

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
        planEvidence: syncEvidence.planEvidence,
        actualEvidence: syncEvidence.actualEvidence,
        diffEvidence: syncEvidence.diffEvidence,
        syncRisks: syncEvidence.syncRisks,
        latestSyncChapter: syncEvidence.latestSyncChapter,
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

function isCharacterArcEntity(type: string) {
  return type === 'character_arc' || type === 'relationship_arc'
}

function arcTypeLabel(type: string) {
  if (type === 'relationship_arc') return '关系线'
  return '角色线'
}

function characterArcReviewPayload(reviews: AnyRecord[]) {
  return latestReviewPayloadAny(reviews, 'character_arc_sync', 'character_arc_sync')
}

function characterArcEvidenceItems(report: AnyRecord) {
  return arrayValue(report?.missed)
    .map((item, index) => {
      const label = firstNonEmpty(item?.label, item?.key, '人物弧光')
      const detail = firstNonEmpty(item?.text, item?.expected, item?.issue, item?.description)
      const key = text(item?.key || item?.label).toLowerCase()
      const priority = key.includes('growth') || label.includes('成长') ? 0
        : key.includes('relationship') || label.includes('关系') ? 1
          : key.includes('flaw') || label.includes('缺陷') ? 2
            : key.includes('desire') || label.includes('欲望') ? 3
              : 4
      return {
        priority,
        index,
        text: detail ? `${label}：${detail}` : label,
      }
    })
    .filter(item => Boolean(item.text))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)
    .map(item => item.text)
}

function characterArcReviewMatchesEntity(entity: AnyRecord, report: AnyRecord, relatedNames: string[]) {
  const characterName = firstNonEmpty(report?.character_name, report?.characterName, report?.name)
  if (!characterName) return true
  const entityName = text(entity?.name)
  return [entityName, ...relatedNames].some(name => name && (name.includes(characterName) || characterName.includes(name)))
}

function buildCharacterArcBoardModel(
  settingEntities: AnyRecord[],
  reviews: AnyRecord[],
  activeChapterNo: number,
): PlanningWorkspaceModel['characterArcBoard'] {
  const arcSync = characterArcReviewPayload(reviews)
  const syncMissedCount = numericCount(arcSync?.missed_count, arcSync?.missedCount, listLength(arcSync?.missed))
  const syncEvidence = characterArcEvidenceItems(arcSync)
  const arcs = settingEntities
    .filter(entity => isCharacterArcEntity(text(entity?.entity_type)))
    .map(entity => {
      const entityType = text(entity?.entity_type) as 'character_arc' | 'relationship_arc'
      const payload = parseJsonValue(entity?.payload_json, { owner: entity, kind: 'setting', field: 'payload_json' }) || {}
      const constraints = parseJsonValue(entity?.constraints_json, { owner: entity, kind: 'setting', field: 'constraints_json' }) || {}
      const state = parseJsonValue(entity?.state_json, { owner: entity, kind: 'setting', field: 'state_json' }) || {}
      const relatedNames = listText(payload?.related_characters, payload?.characters, payload?.related_names, payload?.relatedNames)
      const lastAdvancedChapter = numberOrNull(state?.last_advanced_chapter, payload?.last_advanced_chapter)
      const nextAdvanceChapter = numberOrNull(state?.next_advance_chapter, payload?.next_advance_chapter)
      const riskTags: string[] = []
      if (entityType === 'character_arc' && nextAdvanceChapter && activeChapterNo > nextAdvanceChapter) riskTags.push('成长断档')
      if (entityType === 'relationship_arc' && nextAdvanceChapter && activeChapterNo >= nextAdvanceChapter) riskTags.push('关系待推进')
      const matchesSync = syncMissedCount > 0 && characterArcReviewMatchesEntity(entity, arcSync, relatedNames)
      if (matchesSync) riskTags.push('弧光缺口')
      if (!firstNonEmpty(payload?.growth_target, payload?.growthTarget, payload?.relationship_shift, payload?.relationshipShift, payload?.expected_payoff)) {
        riskTags.push('缺成长目标')
      }

      return {
        id: entity?.id,
        name: text(entity?.name, '未命名人物线'),
        entityType,
        typeLabel: arcTypeLabel(entityType),
        summary: text(entity?.summary),
        priority: text(payload?.priority || entity?.priority, 'normal'),
        relatedNames,
        currentState: text(state?.current_state || entity?.status),
        desire: text(payload?.desire || state?.desire),
        flawPressure: text(payload?.flaw_pressure || payload?.flawPressure || state?.flaw_pressure),
        growthTarget: text(payload?.growth_target || payload?.growthTarget || payload?.expected_payoff),
        relationshipShift: text(payload?.relationship_shift || payload?.relationshipShift || state?.relationship_shift),
        voiceAnchor: text(payload?.voice_anchor || payload?.voiceAnchor || state?.voice_anchor),
        forbiddenReveal: text(constraints?.forbidden_reveal || constraints?.taboo || payload?.forbidden_reveal),
        lastAdvancedChapter,
        nextAdvanceChapter,
        riskTags: Array.from(new Set(riskTags)),
        latestEvidence: matchesSync ? syncEvidence.slice(0, 4) : [],
        actionChapterNo: nextAdvanceChapter || lastAdvancedChapter || activeChapterNo,
      }
    })
    .sort((a, b) => {
      const priorityScore = (value: string) => value === 'high' || value === '核心' ? 0 : value === 'medium' || value === '中' ? 1 : 2
      return priorityScore(a.priority) - priorityScore(b.priority)
        || (a.nextAdvanceChapter || 99999) - (b.nextAdvanceChapter || 99999)
        || a.name.localeCompare(b.name, 'zh-CN')
    })
  const overdueCount = arcs.filter(item => item.riskTags.includes('成长断档')).length
  const relationshipRiskCount = arcs.filter(item => item.riskTags.includes('关系待推进')).length
  const growthGapCount = syncMissedCount
  const status: PlanningWorkspaceModel['characterArcBoard']['status'] = arcs.length === 0
    ? 'missing'
    : overdueCount + relationshipRiskCount + growthGapCount > 0
      ? 'needs_attention'
      : 'ready'
  return {
    status,
    summary: arcs.length === 0
      ? '尚未建立角色线或关系线资产。'
      : status === 'ready'
        ? `人物成长稳定：已有 ${arcs.length} 条角色/关系线，近期没有明显成长断档。`
        : `人物成长需治理：${overdueCount} 条成长断档，${relationshipRiskCount} 条关系待推进，${growthGapCount > 0 ? text(arcSync?.label, `人物弧光缺口 ${growthGapCount}`) : '人物弧光待复盘'}。`,
    total: arcs.length,
    growthGapCount,
    overdueCount,
    relationshipRiskCount,
    actionKey: growthGapCount > 0 ? 'open_quality_revision' : arcs.length === 0 || overdueCount + relationshipRiskCount > 0 ? 'open_story_assets' : 'enter_chapter_writing',
    arcs,
  }
}

function volumeBeatType(chapterNo: number, start: number, end: number): PlanningVolumeBeat['type'] {
  if (!chapterNo || !start || !end || end <= start) return '小高潮'
  const ratio = (chapterNo - start) / Math.max(1, end - start)
  if (ratio >= 0.82) return '卷末爆点'
  if (ratio >= 0.42) return '中高潮'
  return '小高潮'
}

function hasChapterPayoff(chapter: AnyRecord) {
  return Boolean(firstNonEmpty(
    chapter?.raw_payload?.payoff,
    chapter?.raw_payload?.reader_payoff,
    chapter?.raw_payload?.reader_reward,
    chapter?.payoff,
    chapter?.reader_payoff,
    chapter?.ending_hook,
  ))
}

function isChapterPlannedForBudget(chapter: AnyRecord) {
  return Boolean(
    text(chapter?.title) &&
    text(chapter?.chapter_goal || chapter?.chapterTask || chapter?.task) &&
    text(chapter?.conflict || chapter?.raw_payload?.conflict) &&
    text(chapter?.ending_hook || chapter?.endingHook || chapter?.hook)
  )
}

function buildVolumeBeatBudgetModel(args: {
  currentVolume: AnyRecord
  outlines: AnyRecord[]
  chapters: AnyRecord[]
  activeChapterNo: number
}): PlanningWorkspaceModel['volumeBeatBudget'] {
  const start = Number(args.currentVolume?.start_chapter || args.currentVolume?.chapter_no || 0)
  const explicitEnd = Number(args.currentVolume?.end_chapter || 0)
  const fallbackEnd = args.chapters.reduce((max, chapter) => Math.max(max, Number(chapter?.chapter_no || 0)), start)
  const end = explicitEnd || (start ? Math.max(start + 49, fallbackEnd) : fallbackEnd)
  const currentVolumeTitle = text(args.currentVolume?.title, '未定位当前卷')
  if (!start || !end) {
    return {
      status: 'blocked',
      score: 45,
      label: '爆点预算缺失',
      summary: '当前章节无法定位到明确分卷，不能计算卷级高潮和爽点预算。',
      currentVolumeTitle,
      chapterRange: '章节范围未定',
      totalChapters: 0,
      plannedChapterCount: 0,
      climaxTarget: 0,
      climaxCount: 0,
      payoffTarget: 0,
      payoffCount: 0,
      beats: [],
      nextActions: ['先补齐当前卷范围、卷目标和关键转折点。'],
    }
  }

  const totalChapters = Math.max(1, end - start + 1)
  const volumeChapters = args.chapters.filter(chapter => {
    const chapterNo = Number(chapter?.chapter_no || 0)
    return chapterNo >= start && chapterNo <= end
  })
  const plannedChapterCount = volumeChapters.filter(isChapterPlannedForBudget).length
  const payoffCount = volumeChapters.filter(hasChapterPayoff).length
  const climaxOutlines = args.outlines
    .filter(outline => isClimaxOutline(outline) && chapterRange(outline).start >= start && chapterRange(outline).start <= end)
    .sort((a, b) => chapterRange(a).start - chapterRange(b).start)
  const beats: PlanningVolumeBeat[] = climaxOutlines.map(outline => {
    const chapterNo = chapterRange(outline).start || null
    return {
      key: `outline-${outline.id || outline.title}`,
      label: text(outline?.title, '未命名爆点'),
      chapterNo,
      type: volumeBeatType(Number(chapterNo || 0), start, end),
      status: 'planned',
      detail: text(outline?.summary || outline?.goal || outline?.hook, '已规划关键转折/高潮节点。'),
    }
  })
  const climaxTarget = Math.max(3, Math.ceil(totalChapters / 15))
  const payoffTarget = Math.max(climaxTarget * 2, Math.ceil(Math.max(plannedChapterCount, Math.min(totalChapters, 30)) / 3))
  const missingCount = Math.max(0, climaxTarget - beats.length)
  const missingTypes: PlanningVolumeBeat['type'][] = ['小高潮', '中高潮', '卷末爆点']
  for (let index = 0; index < missingCount; index += 1) {
    const type = missingTypes[Math.min(index, missingTypes.length - 1)]
    beats.push({
      key: `missing-${index}-${type}`,
      label: `${type}待补`,
      chapterNo: null,
      type: '待补',
      status: 'missing',
      detail: `当前卷还缺少${type}节点。`,
    })
  }
  const climaxScore = Math.min(1, climaxOutlines.length / Math.max(1, climaxTarget)) * 60
  const payoffScore = Math.min(1, payoffCount / Math.max(1, payoffTarget)) * 30
  const planScore = plannedChapterCount > 0 ? 10 : 0
  const score = Math.max(0, Math.min(100, Math.round(climaxScore + payoffScore + planScore)))
  const status: PlanningWorkspaceModel['volumeBeatBudget']['status'] = plannedChapterCount === 0
    ? 'blocked'
    : score >= 80 && climaxOutlines.length >= climaxTarget && payoffCount >= payoffTarget
      ? 'ready'
      : 'needs_attention'

  return {
    status,
    score,
    label: status === 'ready' ? `爆点预算 ${score}` : status === 'blocked' ? `爆点预算阻塞 ${score}` : `爆点预算不足 ${score}`,
    summary: status === 'ready'
      ? `当前卷已规划 ${climaxOutlines.length}/${climaxTarget} 个高潮节点，爽点回报 ${payoffCount}/${payoffTarget}。`
      : `当前卷已规划 ${climaxOutlines.length}/${climaxTarget} 个高潮节点，爽点回报 ${payoffCount}/${payoffTarget}，需要补强卷级节奏。`,
    currentVolumeTitle,
    chapterRange: `第${start}-${end}章`,
    totalChapters,
    plannedChapterCount,
    climaxTarget,
    climaxCount: climaxOutlines.length,
    payoffTarget,
    payoffCount,
    beats,
    nextActions: status === 'ready'
      ? ['按当前卷爆点预算推进章节任务书和场景卡。']
      : ['补齐当前卷的小高潮、中高潮和卷末爆点，再进入批量连写。'],
  }
}

export function latestReviewPayload(reviews: AnyRecord[], reviewType: string, payloadKey: string) {
  const review = reviews
    .filter(item => text(item?.review_type) === reviewType)
    .sort((a, b) => reviewTime(b) - reviewTime(a))[0]
  const payload = parseJsonValue(review?.payload, { owner: review, kind: 'review', field: 'payload' })
    || parseJsonValue(review?.payload_json, { owner: review, kind: 'review', field: 'payload_json' })
    || {}
  return payload[payloadKey] || payload.result?.[payloadKey] || payload.result || payload
}

export function listLength(value: any) {
  return Array.isArray(value) ? value.length : 0
}

export function latestReviewPayloadAny(reviews: AnyRecord[], reviewType: string, payloadKey: string) {
  return latestReviewPayload(reviews, reviewType, payloadKey) || {}
}

function compactList(values: any[], limit = 6) {
  return Array.from(new Set(values.map(value => text(value)).filter(Boolean))).slice(0, limit)
}

const LONGFORM_SPINE_AXIS_LABELS: Record<PlanningLongformSpineAxis['key'], string> = {
  reader_promise: '核心卖点',
  protagonist_drive: '主角驱动',
  core_conflict: '核心矛盾',
  world_hook: '世界钩子',
  innovation_hook: '创新钩子',
  payoff_loop: '长期回报',
  ending_direction: '终局方向',
}

const LONGFORM_SPINE_REQUIRED_AXES: PlanningLongformSpineAxis['key'][] = [
  'reader_promise',
  'protagonist_drive',
  'core_conflict',
  'innovation_hook',
  'payoff_loop',
]

function latestLongformCreationCompass(reviews: AnyRecord[]) {
  const report = latestReviewPayloadAny(reviews, 'longform_creation_diagnosis', 'report')
  const compass = report?.compass || report?.longform_compass || report?.longformCompass || null
  return compass && typeof compass === 'object' ? compass : null
}

function longformSpineValue(source: AnyRecord, key: PlanningLongformSpineAxis['key']) {
  if (key === 'reader_promise') return firstNonEmpty(source?.reader_promise, source?.readerPromise, source?.promise)
  if (key === 'protagonist_drive') return firstNonEmpty(source?.protagonist_drive, source?.protagonistDrive, source?.protagonist_goal, source?.main_character_drive)
  if (key === 'core_conflict') return firstNonEmpty(source?.core_conflict, source?.coreConflict, source?.main_conflict)
  if (key === 'world_hook') return firstNonEmpty(source?.world_hook, source?.worldHook, source?.setting_hook)
  if (key === 'innovation_hook') return firstNonEmpty(source?.innovation_hook, source?.innovationHook, source?.differentiation, source?.original_hook)
  if (key === 'payoff_loop') return firstNonEmpty(source?.payoff_loop, source?.payoffLoop, source?.payoff_model, source?.reward_loop)
  return firstNonEmpty(source?.ending_direction, source?.endingDirection, source?.final_goal, source?.endgame)
}

function buildLongformSpineGuardModel(writingBible: AnyRecord, reviews: AnyRecord[]): PlanningWorkspaceModel['longformSpineGuard'] {
  const reviewCompass = latestLongformCreationCompass(reviews)
  const source = reviewCompass || writingBible || {}
  const sourceLabel = reviewCompass ? '来自长篇创作诊断' : reviewHasPayload(writingBible) ? '来自写作圣经' : '待补齐'
  const axisKeys = Object.keys(LONGFORM_SPINE_AXIS_LABELS) as PlanningLongformSpineAxis['key'][]
  const axes = axisKeys.map(key => {
    const value = longformSpineValue(source, key)
    return {
      key,
      label: LONGFORM_SPINE_AXIS_LABELS[key],
      value,
      locked: LONGFORM_SPINE_REQUIRED_AXES.includes(key),
      status: value ? 'ok' as const : 'missing' as const,
    }
  })
  const missingAxes = axes
    .filter(axis => axis.locked && axis.status === 'missing')
    .map(axis => axis.label)
  const optionalMissingCount = axes.filter(axis => !axis.locked && axis.status === 'missing').length
  const readyCount = axes.filter(axis => axis.status === 'ok').length
  const score = boundedScore((readyCount / Math.max(1, axes.length)) * 100 - missingAxes.length * 8, 55)
  const status: PlanningWorkspaceModel['longformSpineGuard']['status'] = missingAxes.length >= 2
    ? 'blocked'
    : missingAxes.length || optionalMissingCount
      ? 'needs_attention'
      : 'ready'
  const readerPromise = axes.find(axis => axis.key === 'reader_promise')?.value || ''
  const immutableRules = compactList([
    ...arrayValue(source?.immutable_rules),
    ...arrayValue(source?.immutableRules),
    readerPromise ? `核心卖点不可漂移：${readerPromise}` : '',
    longformSpineValue(source, 'core_conflict') ? `核心矛盾不可漂移：${longformSpineValue(source, 'core_conflict')}` : '',
    longformSpineValue(source, 'innovation_hook') ? `创新钩子不可写成普通套路：${longformSpineValue(source, 'innovation_hook')}` : '',
  ]).slice(0, 6)
  const flexibleZones = compactList([
    ...arrayValue(source?.flexible_zones),
    ...arrayValue(source?.flexibleZones),
    '支线人物、新资产、场景题材可以调整，但必须服务核心卖点、当前卷目标和长期回报循环。',
  ]).slice(0, 6)

  return {
    status,
    score,
    label: status === 'ready' ? `主轴稳定 ${score}` : status === 'blocked' ? `主轴阻塞 ${score}` : `主轴待补 ${score}`,
    summary: status === 'ready'
      ? '全书核心卖点、主角驱动、核心矛盾、创新钩子和长期回报已形成可见护栏。'
      : `全书主轴仍缺 ${missingAxes.length} 个关键项：${missingAxes.join('、') || '可选扩展项'}。先补齐后再扩大自动连写。`,
    sourceLabel,
    readerPromise,
    actionKey: status === 'ready' ? 'longform_creation_diagnosis' : 'open_story_assets',
    axes,
    immutableRules,
    flexibleZones,
    missingAxes,
  }
}

function spineAxisValue(spine: PlanningWorkspaceModel['longformSpineGuard'], key: PlanningLongformSpineAxis['key']) {
  return spine.axes.find(axis => axis.key === key)?.value || ''
}

function coreContractCheck(
  key: PlanningCoreContractRadarCheck['key'],
  label: string,
  value: string,
  missingDetail: string,
  options: { warn?: boolean; warnDetail?: string; evidence?: string[] } = {},
): PlanningCoreContractRadarCheck {
  const evidence = compactList(options.evidence || [value], 4)
  const status: PlanningCoreContractRadarCheck['status'] = !value
    ? 'block'
    : options.warn
      ? 'warn'
      : 'ok'
  return {
    key,
    label,
    status,
    score: status === 'ok' ? 90 : status === 'warn' ? 66 : 38,
    detail: !value ? missingDetail : options.warn ? (options.warnDetail || value) : value,
    evidence,
  }
}

function buildCoreContractRadarModel(args: {
  longformSpineGuard: PlanningWorkspaceModel['longformSpineGuard']
  activeChapter?: AnyRecord | null
  currentVolumeGoal: string
  reviews: AnyRecord[]
}): PlanningWorkspaceModel['coreContractRadar'] {
  const { longformSpineGuard, activeChapter } = args
  const coreDrift = latestReviewPayloadAny(args.reviews, 'chapter_core_drift', 'core_drift')
  const driftRisks = compactList([
    ...arrayValue(coreDrift?.drift_risks),
    ...arrayValue(coreDrift?.risks),
    ...arrayValue(coreDrift?.forbidden_touched),
  ], 6)
  const hasDeliveryDrift = driftRisks.length > 0 || ['warn', 'warning', 'risk', 'blocked', 'block'].includes(text(coreDrift?.status).toLowerCase())

  const chapterGoal = firstNonEmpty(activeChapter?.chapter_goal, activeChapter?.chapterGoal, activeChapter?.goal, activeChapter?.summary, activeChapter?.chapter_summary)
  const chapterConflict = firstNonEmpty(activeChapter?.conflict, activeChapter?.raw_payload?.conflict, activeChapter?.raw_payload?.core_conflict)
  const chapterMainline = firstNonEmpty(activeChapter?.raw_payload?.mainline_progress, activeChapter?.mainline_progress, activeChapter?.raw_payload?.storyline_advance)
  const chapterPayoff = firstNonEmpty(activeChapter?.raw_payload?.payoff, activeChapter?.raw_payload?.reader_payoff, activeChapter?.ending_hook, activeChapter?.hook)
  const chapterInnovation = firstNonEmpty(activeChapter?.raw_payload?.innovation_execution, activeChapter?.raw_payload?.innovation_angle, activeChapter?.raw_payload?.signature_scene, activeChapter?.raw_payload?.ip_scene)
  const chapterService = compactList([chapterGoal, chapterConflict, chapterMainline], 3).join('；')

  const checks: PlanningCoreContractRadarCheck[] = [
    coreContractCheck('reader_promise', '核心卖点', spineAxisValue(longformSpineGuard, 'reader_promise'), '缺核心卖点，无法判断章节是否吸引目标读者。'),
    coreContractCheck('protagonist_drive', '主角驱动', spineAxisValue(longformSpineGuard, 'protagonist_drive'), '缺主角驱动，超长篇容易变成事件推着人走。'),
    coreContractCheck('core_conflict', '核心矛盾', spineAxisValue(longformSpineGuard, 'core_conflict'), '缺核心矛盾，章节冲突容易散成单元小事。'),
    coreContractCheck(
      'chapter_service',
      '本章服务',
      chapterService,
      '当前章缺目标、冲突或主线推进，先补开写任务再生成正文。',
      {
        warn: hasDeliveryDrift,
        warnDetail: driftRisks[0] || '最近交稿存在核心偏移，先修订后再放大生产。',
        evidence: [chapterGoal, chapterConflict, chapterMainline, ...driftRisks],
      },
    ),
    coreContractCheck(
      'reader_payoff',
      '读者回报',
      chapterPayoff,
      '当前章缺可见回报或章末追读问题。',
      {
        warn: hasDeliveryDrift,
        warnDetail: '核心偏移会削弱读者回报，先把回报写成可见事件。',
        evidence: [chapterPayoff, activeChapter?.ending_hook, ...driftRisks],
      },
    ),
    coreContractCheck(
      'innovation_hook',
      '创新执行',
      spineAxisValue(longformSpineGuard, 'innovation_hook'),
      '缺创新钩子，章节容易退回同题材套路。',
      {
        warn: Boolean(spineAxisValue(longformSpineGuard, 'innovation_hook')) && !chapterInnovation,
        warnDetail: chapterInnovation || '本章还没写清创新机制、反差场面或可传播执行点。',
        evidence: [spineAxisValue(longformSpineGuard, 'innovation_hook'), chapterInnovation],
      },
    ),
  ]

  const blockCount = checks.filter(item => item.status === 'block').length
  const warnCount = checks.filter(item => item.status === 'warn').length
  const status: PlanningWorkspaceModel['coreContractRadar']['status'] = longformSpineGuard.status === 'blocked' || blockCount > 0
    ? 'blocked'
    : warnCount > 0
      ? 'needs_action'
      : 'ready'
  const score = Math.max(0, Math.min(100, Math.round(checks.reduce((sum, item) => sum + item.score, 0) / Math.max(1, checks.length))))
  const primaryKey: PlanningActionKey = longformSpineGuard.status === 'blocked' || checks.slice(0, 3).some(item => item.status === 'block')
    ? 'open_story_assets'
    : hasDeliveryDrift
      ? 'open_quality_revision'
      : checks.some(item => item.status !== 'ok')
        ? 'update_rolling_plan'
        : 'enter_chapter_writing'
  const riskTags = compactList([
    ...longformSpineGuard.missingAxes.map(axis => `缺${axis}`),
    hasDeliveryDrift ? '核心偏移' : '',
    checks.find(item => item.key === 'chapter_service' && item.status !== 'ok') ? '本章服务不足' : '',
    checks.find(item => item.key === 'reader_payoff' && item.status !== 'ok') ? '读者回报待补' : '',
    checks.find(item => item.key === 'innovation_hook' && item.status !== 'ok') ? '创新执行待补' : '',
  ], 8)
  const mustServe = compactList([
    spineAxisValue(longformSpineGuard, 'reader_promise') ? `服务核心卖点：${spineAxisValue(longformSpineGuard, 'reader_promise')}` : '',
    spineAxisValue(longformSpineGuard, 'protagonist_drive') ? `推动主角驱动：${spineAxisValue(longformSpineGuard, 'protagonist_drive')}` : '',
    spineAxisValue(longformSpineGuard, 'core_conflict') ? `压住核心矛盾：${spineAxisValue(longformSpineGuard, 'core_conflict')}` : '',
    args.currentVolumeGoal ? `承接当前卷目标：${args.currentVolumeGoal}` : '',
    chapterGoal ? `当前章任务：${chapterGoal}` : '',
  ], 6)

  return {
    status,
    score,
    label: status === 'ready' ? `契约稳定 ${score}` : status === 'blocked' ? `契约阻塞 ${score}` : `契约待修 ${score}`,
    summary: status === 'ready'
      ? '全书核心与当前章目标、冲突、回报、创新执行已经对齐，可以进入章节写作。'
      : hasDeliveryDrift
        ? `最近交稿存在核心偏移：${driftRisks[0] || text(coreDrift?.label, '需回质检修订')}。先修复再继续连写。`
        : `核心契约还有 ${blockCount + warnCount} 项需要补齐：${riskTags.join('、') || '补齐章节任务书'}`,
    primaryAction: {
      key: primaryKey,
      label: planningActionLabel(primaryKey),
      reason: primaryKey === 'open_quality_revision'
        ? '先处理最近交稿的核心偏移，避免后续章节沿着错误方向扩写。'
        : primaryKey === 'open_story_assets'
          ? '先补齐全书核心卖点、主角驱动和核心矛盾。'
          : primaryKey === 'update_rolling_plan'
            ? '先补齐本章目标、回报或创新执行，再生成正文。'
            : '核心契约通过，进入当前章写作。',
    },
    checks,
    mustServe,
    noDrift: longformSpineGuard.immutableRules,
    riskTags,
  }
}

function milestoneNumber(...values: any[]) {
  for (const value of values) {
    const num = Number(value)
    if (Number.isFinite(num) && num > 0) return Math.round(num)
  }
  return 0
}

function resolveRawMillionWordMilestones(writingBible: AnyRecord) {
  return [
    ...arrayValue(writingBible?.longform_milestones),
    ...arrayValue(writingBible?.million_word_milestones),
    ...arrayValue(writingBible?.millionWordMilestones),
    ...arrayValue(writingBible?.milestones),
  ].filter(item => item && typeof item === 'object')
}

export function milestoneStatus(targetWords: number, writtenWords: number, nextTargetWords: number | null): PlanningMillionWordMilestone['status'] {
  if (!targetWords) return 'needs_plan'
  if (writtenWords >= targetWords) return 'achieved'
  if (!nextTargetWords || targetWords === nextTargetWords) return 'current'
  return 'future'
}

function defaultMillionWordMilestoneTargets(targetWords: number) {
  if (targetWords < 3000000) return []
  const candidates = [300000, 1000000, 2000000, 3000000, 5000000, 8000000, 10000000]
  const capped = candidates.filter(value => value <= targetWords)
  if (!capped.includes(targetWords)) capped.push(targetWords)
  return Array.from(new Set(capped)).sort((a, b) => a - b)
}

function buildMillionWordMilestonesModel(args: {
  writingBible: AnyRecord
  targetWords: number
  writtenWords: number
}): PlanningWorkspaceModel['millionWordMilestones'] {
  const rawMilestones = resolveRawMillionWordMilestones(args.writingBible)
  const hasExplicitMilestones = rawMilestones.length > 0
  const rows = hasExplicitMilestones
    ? rawMilestones
    : defaultMillionWordMilestoneTargets(args.targetWords).map(targetWords => ({
        target_words: targetWords,
        label: targetWords >= 10000 ? `${Math.round(targetWords / 10000)}万字节点` : `${targetWords}字节点`,
      }))
  const nextTargetWords = rows
    .map(row => milestoneNumber(row?.target_words, row?.targetWords, row?.words))
    .filter(value => value > args.writtenWords)
    .sort((a, b) => a - b)[0] || null

  const milestones: PlanningMillionWordMilestone[] = rows
    .map((row, index) => {
      const targetWords = milestoneNumber(row?.target_words, row?.targetWords, row?.words)
      const targetChapter = numberOrNull(row?.target_chapter, row?.targetChapter, row?.chapter_no, row?.chapterNo)
      const theme = firstNonEmpty(row?.theme, row?.title, row?.goal, row?.stage_goal)
      const protagonistState = firstNonEmpty(row?.protagonist_state, row?.protagonistState, row?.character_state, row?.identity_shift)
      const worldExpansion = firstNonEmpty(row?.world_expansion, row?.worldExpansion, row?.map_expansion, row?.setting_expansion)
      const conflictEscalation = firstNonEmpty(row?.conflict_escalation, row?.conflictEscalation, row?.antagonist_escalation, row?.stakes)
      const readerPayoff = firstNonEmpty(row?.reader_payoff, row?.readerPayoff, row?.payoff, row?.reward)
      const riskTags = [
        !theme ? '缺阶段主题' : '',
        !protagonistState ? '缺主角状态' : '',
        !worldExpansion ? '缺世界扩展' : '',
        !conflictEscalation ? '缺冲突升级' : '',
        !readerPayoff ? '缺读者回报' : '',
      ].filter(Boolean)
      return {
        key: targetWords ? `milestone-${targetWords}` : `milestone-${index + 1}`,
        label: firstNonEmpty(row?.label, row?.title, targetWords >= 10000 ? `${Math.round(targetWords / 10000)}万字节点` : `里程碑 ${index + 1}`),
        targetWords,
        targetChapter,
        status: riskTags.length ? 'needs_plan' : milestoneStatus(targetWords, args.writtenWords, nextTargetWords),
        theme,
        protagonistState,
        worldExpansion,
        conflictEscalation,
        readerPayoff,
        riskTags,
        actionKey: riskTags.length ? 'open_story_assets' : 'enter_chapter_writing',
      }
    })
    .sort((a, b) => (a.targetWords || 999999999) - (b.targetWords || 999999999))

  const currentMilestone = milestones.find(item => item.status === 'current')
    || milestones.find(item => item.status === 'needs_plan')
    || milestones.find(item => item.status === 'future')
    || milestones.at(-1)
    || null
  const nextMilestone = milestones.find(item => item.targetWords > args.writtenWords) || currentMilestone
  const riskCount = milestones.reduce((sum, item) => sum + item.riskTags.length, 0)
  const epicTarget = args.targetWords >= 3000000
  const requiredCount = epicTarget ? 3 : 1
  const tooFew = milestones.length < requiredCount
  const status: PlanningWorkspaceModel['millionWordMilestones']['status'] = epicTarget && !hasExplicitMilestones
    ? 'blocked'
    : tooFew
      ? 'needs_attention'
      : riskCount > 0
        ? 'needs_attention'
        : 'ready'
  const completeScore = milestones.length
    ? Math.round((milestones.length * 5 + milestones.filter(item => item.riskTags.length === 0).length * 20) / Math.max(1, milestones.length * 25) * 100)
    : 0
  const countPenalty = tooFew ? 20 : 0
  const score = boundedScore(completeScore - riskCount * 4 - countPenalty, status === 'ready' ? 88 : status === 'blocked' ? 45 : 68)

  return {
    status,
    score,
    label: status === 'ready' ? `里程碑 ${score}` : status === 'blocked' ? `里程碑阻塞 ${score}` : `里程碑待补 ${score}`,
    summary: status === 'ready'
      ? `已规划 ${milestones.length} 个百万字级节点，下一节点：${nextMilestone?.label || '未定位'}。`
      : !hasExplicitMilestones && epicTarget
        ? '缺少百万字里程碑：300万字以上项目需要明确30万、100万、300万等阶段的主角状态、世界扩展、冲突升级和读者回报。'
        : `百万字里程碑仍有 ${riskCount + (tooFew ? 1 : 0)} 项缺口，先补齐后再扩大自动连写。`,
    sourceLabel: hasExplicitMilestones ? '来自写作圣经' : epicTarget ? '系统占位' : '短中篇可选',
    total: milestones.length,
    currentMilestone,
    nextMilestone,
    milestones,
    actionKey: status === 'ready' ? 'longform_creation_diagnosis' : 'open_story_assets',
    nextActions: status === 'ready'
      ? ['按当前百万字里程碑推进未来100章和当前卷规划。']
      : ['补齐百万字节点的主角状态、世界扩展、冲突升级和读者回报，再恢复安全连写。'],
  }
}

function memoryFieldText(value: any) {
  if (value === null || value === undefined) return ''
  if (typeof value !== 'object') return text(value)
  return firstNonEmpty(
    value.text,
    value.summary,
    value.description,
    value.status,
    value.state,
    value.current_state,
    value.currentState,
    value.location,
    value.current_location,
  )
}

function memoryItemText(value: any) {
  if (value === null || value === undefined) return ''
  if (typeof value !== 'object') return text(value)
  const name = firstNonEmpty(value.name, value.character_name, value.characterName, value.title, value.key)
  const state = memoryFieldText(value)
  const chapterNo = numberOrNull(value.chapter_no, value.chapterNo, value.last_updated_chapter, value.lastUpdatedChapter)
  const base = [name, state].filter(Boolean).join('：')
  return text(chapterNo ? `${base || name}@第${chapterNo}章` : base || name)
}

function memoryList(...values: any[]) {
  return compactList(values.flatMap(value => arrayValue(value)).map(memoryItemText), 10)
}

function buildLongformMemoryCapsuleModel(args: {
  writingBible: AnyRecord
  storyState: AnyRecord
  latestWrittenChapterNo: number
}): PlanningWorkspaceModel['longformMemoryCapsule'] {
  const global = args.storyState?.global || args.storyState || {}
  const lastUpdatedChapter = numberOrNull(args.storyState?.last_updated_chapter, args.storyState?.lastUpdatedChapter, global?.last_updated_chapter, global?.lastUpdatedChapter)
  const corePromise = firstNonEmpty(
    args.writingBible?.reader_promise,
    args.writingBible?.promise,
    args.writingBible?.core_selling_point,
    global?.reader_promise,
    global?.core_promise,
  )
  const currentVolumeGoal = firstNonEmpty(global?.current_volume_goal, global?.volume_goal, args.storyState?.current_volume_goal, args.storyState?.volume_goal)
  const mainlineProgress = firstNonEmpty(global?.mainline_progress, global?.current_mainline, global?.mainline, args.storyState?.mainline_progress, args.storyState?.current_mainline, args.storyState?.mainline)
  const characterStates = memoryList(args.storyState?.character_states, global?.character_states, args.storyState?.characters, global?.characters)
  const openQuestions = memoryList(args.storyState?.open_questions, global?.open_questions, args.storyState?.unresolved_questions, global?.unresolved_questions)
  const payoffDebts = memoryList(args.storyState?.payoff_debts, global?.payoff_debts, args.storyState?.payoff_queue, global?.payoff_queue)
  const canonFacts = memoryList(args.storyState?.canon_facts, global?.canon_facts, args.storyState?.facts, global?.facts)
  const redLines = memoryList(args.writingBible?.immutable_rules, args.writingBible?.immutableRules, global?.red_lines, args.storyState?.red_lines)
  const evidenceCount = [
    corePromise,
    currentVolumeGoal,
    mainlineProgress,
    ...characterStates,
    ...openQuestions,
    ...payoffDebts,
    ...canonFacts,
    ...redLines,
  ].filter(Boolean).length
  const stale = Boolean(args.latestWrittenChapterNo && (!lastUpdatedChapter || lastUpdatedChapter < args.latestWrittenChapterNo))
  const status: PlanningWorkspaceModel['longformMemoryCapsule']['status'] = evidenceCount === 0
    ? 'missing'
    : stale
      ? 'needs_sync'
      : 'ready'
  const score = status === 'ready'
    ? boundedScore(Math.min(100, 60 + evidenceCount * 6), 86)
    : status === 'needs_sync'
      ? boundedScore(Math.min(78, 46 + evidenceCount * 4), 62)
      : 35

  return {
    status,
    score,
    label: status === 'ready' ? `记忆胶囊 ${score}` : status === 'needs_sync' ? `记忆待同步 ${score}` : `记忆缺失 ${score}`,
    summary: status === 'ready'
      ? `正史胶囊已同步到第${lastUpdatedChapter || '?'}章，包含角色 ${characterStates.length}、悬念 ${openQuestions.length}、回报债 ${payoffDebts.length}。`
      : status === 'needs_sync'
        ? `故事状态只同步到第${lastUpdatedChapter || 0}章，已写到第${args.latestWrittenChapterNo}章；继续生成前建议先同步正史胶囊。`
        : '缺少可召回的长篇正史胶囊，建议先同步故事状态或补齐写作圣经。',
    lastUpdatedChapter,
    corePromise,
    currentVolumeGoal,
    mainlineProgress,
    characterStates,
    openQuestions,
    payoffDebts,
    canonFacts,
    redLines,
    actionKey: status === 'ready' ? 'enter_chapter_writing' : status === 'needs_sync' ? 'update_story_state' : 'open_story_assets',
  }
}

function reviewHasPayload(value: AnyRecord) {
  return Boolean(value && Object.keys(value).length > 0)
}

function itemTextList(items: any[], limit = 2) {
  return items
    .map(item => text(item?.text || item?.summary || item?.label || item?.description || item?.name || item))
    .filter(Boolean)
    .slice(0, limit)
    .join('；')
}

function buildReaderTrustLedgerModel(reviews: AnyRecord[]): PlanningWorkspaceModel['readerTrustLedger'] {
  const expectation = latestReviewPayloadAny(reviews, 'reader_expectation_sync', 'reader_expectation_sync')
  const payoff = latestReviewPayloadAny(reviews, 'reader_payoff_sync', 'reader_payoff_sync')
  const retention = latestReviewPayloadAny(reviews, 'reader_retention_sync', 'reader_retention_sync')
  const hasAnyReview = reviewHasPayload(expectation) || reviewHasPayload(payoff) || reviewHasPayload(retention)
  const expectationDebtCount = numericCount(expectation?.missed_count, expectation?.missedCount, listLength(expectation?.missed))
  const payoffDebtCount = numericCount(payoff?.debt_count, payoff?.debtCount, listLength(payoff?.missed) + listLength(payoff?.debts))
  const retentionMissedCount = numericCount(retention?.missed_count, retention?.missedCount, listLength(retention?.missed))
  const keepAliveCount = listLength(expectation?.keep_alive)
  const expectationDetail = expectationDebtCount > 0
    ? itemTextList(arrayValue(expectation?.missed)) || text(expectation?.summary || expectation?.label, `期待欠账 ${expectationDebtCount}`)
    : reviewHasPayload(expectation)
      ? text(expectation?.summary || expectation?.label, '本章读者期待已基本兑现。')
      : '交稿后同步故事状态，会形成期待兑现复盘。'
  const payoffDetail = payoffDebtCount > 0
    ? itemTextList([...arrayValue(payoff?.missed), ...arrayValue(payoff?.debts)]) || text(payoff?.summary || payoff?.label, `回报欠账 ${payoffDebtCount}`)
    : reviewHasPayload(payoff)
      ? text(payoff?.summary || payoff?.label, '场景回报和待回收期待处于可控状态。')
      : '交稿后会检查爽点、信息回收和待回收期待。'
  const retentionDetail = retentionMissedCount > 0
    ? itemTextList(arrayValue(retention?.missed)) || text(retention?.summary || retention?.label, `追读漏项 ${retentionMissedCount}`)
    : reviewHasPayload(retention)
      ? text(retention?.summary || retention?.label, '追读钩子和情绪回报处于可控状态。')
      : '前300字钩子、章末问题和短剧化场面会在交稿后复盘。'
  const keepAliveDetail = keepAliveCount > 0
    ? itemTextList(arrayValue(expectation?.keep_alive), 3)
    : '没有需要特别保活的长期悬念。'
  const riskCount = expectationDebtCount + payoffDebtCount + retentionMissedCount
  const scoreCandidates = [expectation?.score, payoff?.score, retention?.score]
    .map(value => Number(value))
    .filter(value => Number.isFinite(value))
  const score = scoreCandidates.length > 0
    ? Math.round(Math.min(...scoreCandidates))
    : null
  const signals: PlanningWorkspaceModel['readerTrustLedger']['signals'] = [
    {
      key: 'expectation',
      label: '期待兑现',
      status: expectationDebtCount > 0 ? 'warn' : 'ok',
      count: expectationDebtCount,
      detail: expectationDetail,
      actionKey: expectationDebtCount > 0 ? 'open_quality_revision' : 'enter_chapter_writing',
    },
    {
      key: 'payoff',
      label: '爽点回报',
      status: payoffDebtCount > 0 ? 'warn' : 'ok',
      count: payoffDebtCount,
      detail: payoffDetail,
      actionKey: payoffDebtCount > 0 ? 'open_quality_revision' : 'enter_chapter_writing',
    },
    {
      key: 'retention',
      label: '追读钩子',
      status: retentionMissedCount > 0 ? 'warn' : 'ok',
      count: retentionMissedCount,
      detail: retentionDetail,
      actionKey: retentionMissedCount > 0 ? 'open_quality_revision' : 'enter_chapter_writing',
    },
    {
      key: 'keep_alive',
      label: '继续悬念',
      status: 'ok',
      count: keepAliveCount,
      detail: keepAliveDetail,
      actionKey: 'enter_chapter_writing',
    },
  ]
  if (!hasAnyReview) {
    return {
      status: 'missing',
      score: null,
      summary: '尚未形成读者期待、爽点回报和追读钩子的交稿复盘。',
      actionKey: 'open_quality_revision',
      expectationDebtCount: 0,
      payoffDebtCount: 0,
      retentionMissedCount: 0,
      keepAliveCount: 0,
      signals,
    }
  }
  const status: PlanningWorkspaceModel['readerTrustLedger']['status'] = riskCount > 0 ? 'needs_attention' : 'ready'
  const summary = status === 'ready'
    ? `追读信任稳定：期待兑现、爽点回报和章末钩子没有明显欠账，保活悬念 ${keepAliveCount} 项。`
    : `追读信任需修复：期待欠账 ${expectationDebtCount}，回报欠账 ${payoffDebtCount}，追读漏项 ${retentionMissedCount}，保活悬念 ${keepAliveCount}。`
  return {
    status,
    score,
    summary,
    actionKey: status === 'ready' ? 'enter_chapter_writing' : 'open_quality_revision',
    expectationDebtCount,
    payoffDebtCount,
    retentionMissedCount,
    keepAliveCount,
    signals,
  }
}

function readerTrialStatus(value: any): PlanningWorkspaceModel['readerTrialRoom']['status'] {
  const status = text(value).toLowerCase()
  if (status === 'ready' || status === 'ok') return 'ready'
  if (status === 'blocked' || status === 'block') return 'blocked'
  if (status === 'needs_repair' || status === 'warn') return 'needs_repair'
  return 'missing'
}

function readerTrialQualityBar(value: any) {
  if (text(value) === 'qidian_10k_reader_trial_baseline') return '起点1万均订试读基准'
  return text(value, '起点1万均订试读基准')
}

function buildReaderTrialRoomModel(reviews: AnyRecord[]): PlanningWorkspaceModel['readerTrialRoom'] {
  const report = latestReviewPayloadAny(reviews, 'reader_trial_review', 'report')
  const hasReview = reviewHasPayload(report)
  const status = hasReview ? readerTrialStatus(report?.status) : 'missing'
  const personas = arrayValue(report?.personas).map(item => ({
    key: text(item?.key, 'trial_reader'),
    label: text(item?.label, '平台试读用户'),
    focus: text(item?.focus, '判断本章和前十章是否能让读者继续点击下一章。'),
    verdict: text(item?.verdict, '暂无试读结论。'),
    score: boundedScore(item?.score, 0),
    riskLevel: text(item?.risk_level || item?.riskLevel, 'medium') as 'low' | 'medium' | 'high',
  }))
  const segments = arrayValue(report?.segments).map(item => ({
    key: text(item?.key),
    label: text(item?.label, '试读分段'),
    score: boundedScore(item?.score, 0),
    verdict: text(item?.verdict, '暂无分段结论。'),
  }))
  const dropPoints = arrayValue(report?.drop_points || report?.dropPoints).map(item => text(item)).filter(Boolean)
  const pullPoints = arrayValue(report?.pull_points || report?.pullPoints).map(item => text(item)).filter(Boolean)
  const repairActions = arrayValue(report?.repair_actions || report?.repairActions).map(item => text(item)).filter(Boolean)
  if (!hasReview) {
    return {
      status: 'missing',
      score: null,
      summary: '尚未运行读者试读复盘。建议在前30章诊断和最近章节交稿后运行，模拟爽点读者、剧情党、设定党和平台试读用户的弃读点。',
      qualityBar: '起点1万均订试读基准',
      actionKey: 'run_reader_trial_review',
      personas: [
        { key: 'payoff_reader', label: '爽点读者', focus: '每章是否有可感知收益、反杀、打脸、升级或信息回报。', verdict: '待复盘', score: 0, riskLevel: 'medium' },
        { key: 'plot_reader', label: '剧情党', focus: '主线压力、目标推进和章末未解问题是否连续。', verdict: '待复盘', score: 0, riskLevel: 'medium' },
        { key: 'setting_reader', label: '设定党', focus: '能力体系、规则代价、世界资产和创新机制是否新鲜且不乱。', verdict: '待复盘', score: 0, riskLevel: 'medium' },
        { key: 'trial_reader', label: '平台试读用户', focus: '前三章能否抓住人，前十章是否让读者愿意继续追。', verdict: '待复盘', score: 0, riskLevel: 'medium' },
      ],
      segments: [],
      dropPoints: [],
      pullPoints: [],
      repairActions: ['先运行读者试读复盘，确认开篇、试读十章和最近十章的弃读点。'],
    }
  }
  return {
    status,
    score: Number.isFinite(Number(report?.score)) ? Number(report.score) : null,
    summary: text(report?.summary, '已完成读者试读复盘。'),
    qualityBar: readerTrialQualityBar(report?.quality_bar || report?.qualityBar),
    actionKey: status === 'ready' && dropPoints.length === 0 ? 'run_reader_trial_review' : 'create_reader_trial_repair',
    personas,
    segments,
    dropPoints,
    pullPoints,
    repairActions,
  }
}

function innovationItemsByKey(items: any[], pattern: RegExp) {
  return arrayValue(items).filter(item => pattern.test(text(item?.key || item?.label || item?.type)))
}

function innovationSignalDetail(missed: any[], planned: any[], fallback: string) {
  return itemTextList(missed, 2) || itemTextList(planned, 2) || fallback
}

function buildInnovationRadarModel(reviews: AnyRecord[]): PlanningWorkspaceModel['innovationRadar'] {
  const innovation = latestReviewPayloadAny(reviews, 'innovation_sync', 'innovation_sync')
  const hasReview = reviewHasPayload(innovation)
  const planned = arrayValue(innovation?.planned)
  const delivered = arrayValue(innovation?.delivered)
  const missed = arrayValue(innovation?.missed)
  const missedCount = numericCount(innovation?.missed_count, innovation?.missedCount, missed.length)
  const plannedCount = numericCount(innovation?.planned_count, innovation?.plannedCount, planned.length)
  const deliveredCount = numericCount(innovation?.delivered_count, innovation?.deliveredCount, delivered.length)
  const score = Number.isFinite(Number(innovation?.score)) ? Number(innovation.score) : null
  const signalDefs: Array<{
    key: PlanningWorkspaceModel['innovationRadar']['signals'][number]['key']
    label: string
    pattern: RegExp
    fallback: string
  }> = [
    { key: 'chapter_angle', label: '创新角度', pattern: /chapter_angle|创新角度|angle/, fallback: '本章要把长篇创新卖点转成可见选择、机制或反差。' },
    { key: 'execution', label: '执行点', pattern: /execution|执行点|point/, fallback: '创新执行要落成动作、规则代价、信息差或冲突反转。' },
    { key: 'differentiation', label: '差异护栏', pattern: /differentiation|差异|护栏|guardrail/, fallback: '避免写成同题材常见开挂、升级、逃生或打脸套路。' },
    { key: 'ip_adaptation', label: 'IP化场面', pattern: /ip_adaptation|IP化|场面|hook/, fallback: '保留适合短剧、漫剧或视觉改编的空间冲突和标志性画面。' },
  ]
  const signals = signalDefs.map(def => {
    const missedItems = innovationItemsByKey(missed, def.pattern)
    const plannedItems = innovationItemsByKey(planned, def.pattern)
    return {
      key: def.key,
      label: def.label,
      status: missedItems.length > 0 ? 'warn' as const : 'ok' as const,
      count: missedItems.length,
      detail: innovationSignalDetail(missedItems, plannedItems, def.fallback),
      actionKey: missedItems.length > 0 ? 'open_quality_revision' as PlanningActionKey : 'enter_chapter_writing' as PlanningActionKey,
    }
  })
  if (!hasReview) {
    return {
      status: 'missing',
      score: null,
      summary: '尚未形成创新兑现复盘。交稿并同步故事状态后，会检查本章是否写成普通套路章。',
      actionKey: 'longform_creation_diagnosis',
      missedCount: 0,
      plannedCount: 0,
      deliveredCount: 0,
      nextActions: ['先运行长篇创作诊断或完成章节交稿复盘，确认创新卖点能持续落地。'],
      signals,
    }
  }
  const status: PlanningWorkspaceModel['innovationRadar']['status'] = missedCount > 0 || text(innovation?.status).toLowerCase() === 'warn'
    ? 'needs_attention'
    : 'ready'
  return {
    status,
    score,
    summary: status === 'ready'
      ? text(innovation?.summary || innovation?.label, '创新角度、执行点、差异护栏和 IP 化场面已基本兑现。')
      : text(innovation?.summary || innovation?.label, `创新缺口 ${missedCount}`),
    actionKey: status === 'ready' ? 'enter_chapter_writing' : 'open_quality_revision',
    missedCount,
    plannedCount,
    deliveredCount,
    nextActions: arrayValue(innovation?.next_actions).map(item => text(item)).filter(Boolean),
    signals,
  }
}

function latestDeliveryRiskCounts(reviews: AnyRecord[]) {
  return aggregateDeliveryRiskCounts(reviews)
}

function buildVolumeSegmentGateModel(args: {
  currentVolume: AnyRecord
  currentVolumeGoal: string
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  volumeBeatBudget: PlanningWorkspaceModel['volumeBeatBudget']
  readerTrustLedger: PlanningWorkspaceModel['readerTrustLedger']
  innovationRadar: PlanningWorkspaceModel['innovationRadar']
}): PlanningWorkspaceModel['volumeSegmentGate'] {
  const start = Number(args.currentVolume?.start_chapter || args.currentVolume?.chapter_no || 0)
  const explicitEnd = Number(args.currentVolume?.end_chapter || 0)
  const fallbackEnd = args.chapters.reduce((max, chapter) => Math.max(max, Number(chapter?.chapter_no || 0)), start || 1)
  const end = explicitEnd || (start ? Math.max(start + 49, fallbackEnd) : fallbackEnd)
  const total = start && end ? Math.max(1, end - start + 1) : Math.max(1, args.volumeBeatBudget.totalChapters || 50)
  const written = args.chapters.filter(chapter => {
    const chapterNo = Number(chapter?.chapter_no || 0)
    return chapterNo >= (start || 1) && chapterNo <= end && chapterHasProse(chapter)
  }).length
  const percent = Math.max(0, Math.min(100, Math.round((written / total) * 100)))
  const riskCounts = latestDeliveryRiskCounts(args.reviews)
  const ipSignal = args.innovationRadar.signals.find(signal => signal.key === 'ip_adaptation')
  const signals: PlanningWorkspaceModel['volumeSegmentGate']['signals'] = [
    {
      key: 'volume_goal',
      label: '阶段目标',
      status: args.currentVolumeGoal ? 'ok' : 'block',
      score: args.currentVolumeGoal ? 88 : 35,
      count: args.currentVolumeGoal ? 0 : 1,
      detail: args.currentVolumeGoal ? `当前卷目标：${args.currentVolumeGoal}` : '当前卷缺少明确阶段目标，不能判断这一段服务什么读者承诺。',
      actionKey: args.currentVolumeGoal ? 'enter_chapter_writing' : 'complete_volume_plan',
    },
    {
      key: 'climax_payoff',
      label: '高潮/回报',
      status: args.volumeBeatBudget.status === 'ready' ? 'ok' : args.volumeBeatBudget.status === 'blocked' ? 'block' : 'warn',
      score: args.volumeBeatBudget.score,
      count: Math.max(0, args.volumeBeatBudget.climaxTarget - args.volumeBeatBudget.climaxCount)
        + Math.max(0, args.volumeBeatBudget.payoffTarget - args.volumeBeatBudget.payoffCount),
      detail: args.volumeBeatBudget.summary,
      actionKey: args.volumeBeatBudget.status === 'ready' ? 'enter_chapter_writing' : 'complete_volume_plan',
    },
    {
      key: 'reader_trust',
      label: '读者信任',
      status: args.readerTrustLedger.status === 'ready' ? 'ok' : args.readerTrustLedger.status === 'missing' ? 'warn' : 'warn',
      score: args.readerTrustLedger.score !== null ? boundedScore(args.readerTrustLedger.score, 70) : args.readerTrustLedger.status === 'ready' ? 86 : 68,
      count: args.readerTrustLedger.expectationDebtCount + args.readerTrustLedger.payoffDebtCount + args.readerTrustLedger.retentionMissedCount,
      detail: args.readerTrustLedger.summary,
      actionKey: args.readerTrustLedger.status === 'ready' ? 'enter_chapter_writing' : 'open_quality_revision',
    },
    {
      key: 'innovation_ip',
      label: '创新/IP化',
      status: args.innovationRadar.status === 'ready' ? 'ok' : 'warn',
      score: args.innovationRadar.score !== null ? boundedScore(args.innovationRadar.score, 70) : args.innovationRadar.status === 'ready' ? 86 : 68,
      count: args.innovationRadar.missedCount,
      detail: ipSignal?.detail || args.innovationRadar.summary,
      actionKey: args.innovationRadar.status === 'ready' ? 'enter_chapter_writing' : 'open_quality_revision',
    },
    {
      key: 'risk_closure',
      label: '风险闭环',
      status: riskCounts.total > 0 ? 'warn' : 'ok',
      score: Math.max(45, 100 - riskCounts.total * 8),
      count: riskCounts.total,
      detail: riskCounts.total > 0
        ? `仍有 ${riskCounts.total} 项核心、回报、追读、创新、爆点、剧情线或可读性风险没有收干净。`
        : '最近章节交稿风险已收敛，可以进入下一段推进。',
      actionKey: riskCounts.total > 0 ? 'open_quality_revision' : 'enter_chapter_writing',
    },
  ]
  const status: PlanningWorkspaceModel['volumeSegmentGate']['status'] = signals.some(signal => signal.status === 'block')
    ? 'blocked'
    : signals.some(signal => signal.status === 'warn')
      ? 'needs_attention'
      : 'ready'
  const score = boundedScore(signals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, signals.length), 70)
  const actionKey = signals.find(signal => signal.status === 'block')?.actionKey
    || signals.find(signal => signal.key === 'climax_payoff' && signal.status !== 'ok')?.actionKey
    || signals.find(signal => signal.status === 'warn')?.actionKey
    || 'enter_chapter_writing'
  const nextActions = status === 'ready'
    ? ['当前卷段目标、爆点、读者信任和创新场面基本闭环，可以继续推进下一批章节。']
    : [
        '先补齐当前卷爆点、爽点回报和 IP 化场面，再扩大连续生产。',
        '阶段验收未通过时，优先修最近章节的读者期待欠账、创新缺口和剧情线风险。',
      ]

  return {
    status,
    score,
    label: status === 'ready' ? `卷段验收 ${score}` : status === 'blocked' ? `卷段阻塞 ${score}` : `卷段待修 ${score}`,
    summary: status === 'ready'
      ? '当前卷段的目标、高潮回报、读者信任、创新/IP化场面和风险闭环都可支撑继续连载。'
      : `当前卷段还有 ${signals.filter(signal => signal.status !== 'ok').length} 类问题，先完成阶段验收再扩大批量生产。`,
    currentSegmentLabel: start && end ? `第${start}-${end}章` : args.volumeBeatBudget.chapterRange,
    actionKey,
    chapterProgress: { written, total, percent },
    signals,
    nextActions,
  }
}

function chapterPayload(chapter: AnyRecord) {
  return parseJsonValue(chapter?.raw_payload, { owner: chapter, kind: 'chapter', field: 'raw_payload' }) || {}
}

function fatigueFingerprint(value: string) {
  return text(value)
    .toLowerCase()
    .replace(/[“”"'\s，。！？!?,.、：:；;（）()[\]{}《》<>]/g, '')
}

function dominantFatigueValue(values: string[]) {
  const counts = new Map<string, { display: string; count: number }>()
  values.forEach(value => {
    const key = fatigueFingerprint(value)
    if (!key) return
    const current = counts.get(key)
    if (current) current.count += 1
    else counts.set(key, { display: value, count: 1 })
  })
  const rows = Array.from(counts.values()).sort((a, b) => b.count - a.count || a.display.localeCompare(b.display, 'zh-CN'))
  return {
    rows,
    top: rows[0] || { display: '', count: 0 },
    uniqueCount: rows.length,
  }
}

function buildFatigueVarietySignal(args: {
  key: PlanningWorkspaceModel['recentFatigueRadar']['signals'][number]['key']
  label: string
  noun: string
  values: string[]
  chapterCount: number
}): PlanningWorkspaceModel['recentFatigueRadar']['signals'][number] {
  const total = args.values.length
  if (args.chapterCount < 4) {
    return {
      key: args.key,
      label: args.label,
      status: 'ok',
      score: 86,
      count: 0,
      detail: `近10章样本不足四章，暂不判断${args.noun}疲劳。`,
      actionKey: 'enter_chapter_writing',
    }
  }
  if (total < 4) {
    return {
      key: args.key,
      label: args.label,
      status: 'warn',
      score: 70,
      count: args.chapterCount - total,
      detail: `近10章缺少足够的${args.noun}记录，批量连写前需要补齐章节规划。`,
      actionKey: 'update_rolling_plan',
    }
  }

  const { top, uniqueCount } = dominantFatigueValue(args.values)
  const repeatRatio = top.count / Math.max(1, total)
  const lowVariety = uniqueCount <= Math.max(2, Math.ceil(total * 0.25))
  const repeated = repeatRatio >= 0.5
  const status = lowVariety || repeated ? 'warn' : 'ok'
  const score = status === 'warn'
    ? boundedScore(96 - repeatRatio * 46 - (lowVariety ? 10 : 0), 68)
    : boundedScore(88 + Math.min(10, uniqueCount), 88)

  return {
    key: args.key,
    label: args.label,
    status,
    score,
    count: status === 'warn' ? top.count : 0,
    detail: status === 'warn'
      ? `近${total}章「${top.display}」出现 ${top.count} 次，${args.noun}变化不足。`
      : `近${total}章有 ${uniqueCount} 种${args.noun}，暂无明显重复。`,
    actionKey: status === 'warn' ? 'update_rolling_plan' : 'enter_chapter_writing',
  }
}

function buildSceneFreshnessSignal(
  recentChapters: AnyRecord[],
  reviews: AnyRecord[],
): PlanningWorkspaceModel['recentFatigueRadar']['signals'][number] {
  const innovation = latestReviewPayloadAny(reviews, 'innovation_sync', 'innovation_sync')
  const plannedScenes = innovationItemsByKey(arrayValue(innovation?.planned), /ip_adaptation|IP化|场面|visual|hook/)
  const missedScenes = innovationItemsByKey(arrayValue(innovation?.missed), /ip_adaptation|IP化|场面|visual|hook/)
  if (missedScenes.length > 0) {
    return {
      key: 'scene_freshness',
      label: '场面新鲜度',
      status: 'warn',
      score: 62,
      count: missedScenes.length,
      detail: itemTextList(missedScenes, 2) || 'IP化场面或标志性画面没有兑现，最近章节容易显得同质。',
      actionKey: 'open_quality_revision',
    }
  }

  const ipSceneCoverage = buildIpSceneIntakeCoverage(recentChapters, reviews)
  if (ipSceneCoverage.total >= 4 && ipSceneCoverage.coveredCount > 0) {
    const requiredCount = Math.max(2, Math.ceil(ipSceneCoverage.total * 0.3))
    const status = ipSceneCoverage.coveredCount < requiredCount ? 'warn' : 'ok'
    return {
      key: 'scene_freshness',
      label: '场面新鲜度',
      status,
      score: status === 'warn'
        ? boundedScore(90 - (ipSceneCoverage.missingCount / Math.max(1, ipSceneCoverage.total)) * 34, 60)
        : boundedScore(82 + ipSceneCoverage.coveredCount * 3, 86),
      count: status === 'warn' ? ipSceneCoverage.missingCount : 0,
      detail: status === 'warn'
        ? `IP场面覆盖 ${ipSceneCoverage.coveredCount}/${ipSceneCoverage.total}，强场面空窗偏长。${ipSceneCoverage.examples.length ? `已沉淀：${ipSceneCoverage.examples.slice(0, 2).join('；')}` : '下一批需要补可视化冲突。'}`
        : `IP场面覆盖 ${ipSceneCoverage.coveredCount}/${ipSceneCoverage.total}，近期已有标志性强场面：${ipSceneCoverage.examples.slice(0, 2).join('；')}`,
      actionKey: status === 'warn' ? 'update_rolling_plan' : 'enter_chapter_writing',
    }
  }

  const sceneValues = recentChapters
    .map(chapter => {
      const payload = chapterPayload(chapter)
      return firstNonEmpty(
        payload?.ip_adaptation_hook,
        payload?.short_drama_scene,
        payload?.visual_hook,
        payload?.scene,
        payload?.location,
      )
    })
    .filter(Boolean)
  if (sceneValues.length >= 4) {
    return buildFatigueVarietySignal({
      key: 'scene_freshness',
      label: '场面新鲜度',
      noun: '可视化场面',
      values: sceneValues,
      chapterCount: recentChapters.length,
    })
  }

  return {
    key: 'scene_freshness',
    label: '场面新鲜度',
    status: plannedScenes.length > 0 ? 'ok' : 'warn',
    score: plannedScenes.length > 0 ? 84 : 72,
    count: plannedScenes.length > 0 ? 0 : 1,
    detail: plannedScenes.length > 0
      ? itemTextList(plannedScenes, 2) || '近期章节已有可视化场面规划。'
      : '近10章缺少稳定的场面/IP化记录，建议给下一批章节补标志性场景。',
    actionKey: plannedScenes.length > 0 ? 'enter_chapter_writing' : 'update_rolling_plan',
  }
}

function buildIpSceneIntakeCoverage(recentChapters: AnyRecord[], reviews: AnyRecord[]) {
  const chapterNos = recentChapters
    .map(chapter => Number(chapter?.chapter_no || 0))
    .filter(chapterNo => chapterNo > 0)
  const chapterNoSet = new Set(chapterNos)
  const coveredNos = new Set<number>()
  const examples: string[] = []

  for (const review of reviews) {
    if (text(review?.review_type) !== 'ip_scene_intake') continue
    const payload = parseJsonValue(review?.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
    const root = payload?.ip_scene_intake || payload?.result?.ip_scene_intake || payload?.result || payload
    const chapterNo = Number(root?.chapter_no || root?.chapterNo || payload?.chapter_no || payload?.chapterNo || review?.chapter_no || 0)
    if (!chapterNoSet.has(chapterNo)) continue
    const candidates = arrayValue(root?.ip_scene_candidates || root?.ipSceneCandidates || payload?.ip_scene_candidates)
    if (candidates.length <= 0) continue
    coveredNos.add(chapterNo)
    for (const candidate of candidates.slice(0, 2)) {
      const label = firstNonEmpty(
        candidate?.title,
        candidate?.name,
        candidate?.visual_hook,
        candidate?.visualHook,
        candidate?.adaptation_value,
      )
      if (label && !examples.includes(label)) examples.push(label)
    }
  }

  return {
    total: chapterNos.length,
    coveredCount: coveredNos.size,
    missingCount: Math.max(0, chapterNos.length - coveredNos.size),
    examples,
  }
}

function buildRecentFatigueRadarModel(args: {
  chapters: AnyRecord[]
  activeChapterNo: number
  reviews: AnyRecord[]
}): PlanningWorkspaceModel['recentFatigueRadar'] {
  const start = Math.max(1, Number(args.activeChapterNo || 1) - 6)
  const end = start + 9
  const recentChapters = args.chapters.filter(chapter => {
    const chapterNo = Number(chapter?.chapter_no || 0)
    return chapterNo >= start && chapterNo <= end
  })
  const conflictValues = recentChapters
    .map(chapter => {
      const payload = chapterPayload(chapter)
      return firstNonEmpty(chapter?.conflict, payload?.conflict, payload?.core_conflict)
    })
    .filter(Boolean)
  const payoffValues = recentChapters
    .map(chapter => {
      const payload = chapterPayload(chapter)
      return firstNonEmpty(
        payload?.payoff,
        payload?.reader_payoff,
        payload?.reader_reward,
        chapter?.payoff,
        chapter?.reader_payoff,
      )
    })
    .filter(Boolean)
  const hookValues = recentChapters
    .map(chapter => {
      const payload = chapterPayload(chapter)
      return firstNonEmpty(chapter?.ending_hook, chapter?.endingHook, chapter?.hook, payload?.ending_hook, payload?.hook)
    })
    .filter(Boolean)
  const signals: PlanningWorkspaceModel['recentFatigueRadar']['signals'] = [
    buildFatigueVarietySignal({
      key: 'conflict_variety',
      label: '冲突变化',
      noun: '冲突来源',
      values: conflictValues,
      chapterCount: recentChapters.length,
    }),
    buildFatigueVarietySignal({
      key: 'payoff_variety',
      label: '回报变化',
      noun: '回报形态',
      values: payoffValues,
      chapterCount: recentChapters.length,
    }),
    buildFatigueVarietySignal({
      key: 'hook_variety',
      label: '钩子变化',
      noun: '章末问题',
      values: hookValues,
      chapterCount: recentChapters.length,
    }),
    buildSceneFreshnessSignal(recentChapters, args.reviews),
  ]
  const warningSignals = signals.filter(signal => signal.status === 'warn')
  const score = boundedScore(signals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, signals.length), 82)
  const status: PlanningWorkspaceModel['recentFatigueRadar']['status'] = warningSignals.length > 0 ? 'needs_attention' : 'ready'

  return {
    status,
    score,
    label: status === 'ready' ? `疲劳稳定 ${score}` : `疲劳风险 ${score}`,
    summary: status === 'ready'
      ? '近10章冲突来源、回报形态、章末钩子和可视化场面没有明显同质化。'
      : `近10章存在 ${warningSignals.length} 类同质化风险：${warningSignals.map(signal => signal.label).join('、')}。`,
    chapterRangeLabel: `第${start}-${end}章`,
    actionKey: status === 'ready' ? 'enter_chapter_writing' : 'update_rolling_plan',
    signals,
    nextActions: status === 'ready'
      ? ['保持冲突来源、回报形态、章末问题和可视化场面的轮换。']
      : ['下一批章节要更换压迫来源、回报形态、章末问题或可视化场面，避免十章连续同质化。'],
  }
}

function pressureRowText(row: AnyRecord) {
  const payload = chapterPayload(row)
  return [
    firstNonEmpty(row?.conflict, payload?.conflict, payload?.core_conflict),
    firstNonEmpty(row?.chapter_goal, row?.chapterGoal, row?.task, payload?.chapter_task, payload?.chapterTask),
    firstNonEmpty(row?.ending_hook, row?.endingHook, row?.hook, payload?.ending_hook, payload?.hook),
    firstNonEmpty(row?.summary, row?.chapter_summary, payload?.summary),
  ].filter(Boolean).join('；')
}

function pressureSourceForRow(row: AnyRecord) {
  const payload = chapterPayload(row)
  return firstNonEmpty(
    payload?.pressure_source,
    payload?.pressureSource,
    payload?.antagonist_pressure,
    payload?.antagonistPressure,
    row?.pressure_source,
    row?.antagonist_pressure,
    row?.conflict,
    payload?.conflict,
    row?.chapter_goal,
  )
}

function pressureSignalFromPattern(args: {
  key: PlanningWorkspaceModel['storyPressureLadder']['signals'][number]['key']
  label: string
  noun: string
  rows: AnyRecord[]
  pattern: RegExp
  okDetail: string
  warnDetail: string
}): PlanningWorkspaceModel['storyPressureLadder']['signals'][number] {
  if (args.rows.length < 3) {
    return {
      key: args.key,
      label: args.label,
      status: 'block',
      score: 48,
      count: 3 - args.rows.length,
      detail: `未来章节样本不足，暂时无法判断${args.noun}。`,
      actionKey: 'update_rolling_plan',
    }
  }
  const hitCount = args.rows.filter(row => args.pattern.test(pressureRowText(row))).length
  const ratio = hitCount / Math.max(1, args.rows.length)
  const status = ratio >= 0.45 ? 'ok' : 'warn'
  return {
    key: args.key,
    label: args.label,
    status,
    score: status === 'ok' ? boundedScore(78 + ratio * 20, 88) : boundedScore(56 + ratio * 28, 66),
    count: status === 'ok' ? hitCount : Math.max(1, args.rows.length - hitCount),
    detail: status === 'ok' ? args.okDetail : args.warnDetail,
    actionKey: status === 'ok' ? 'enter_chapter_writing' : 'update_rolling_plan',
  }
}

function buildStoryPressureLadderModel(args: {
  routeChapters: AnyRecord[]
  activeChapterNo: number
}): PlanningWorkspaceModel['storyPressureLadder'] {
  const rows = args.routeChapters
    .filter(row => Number(row?.chapter_no || 0) >= Number(args.activeChapterNo || 1))
    .slice(0, 10)
  const start = Number(rows[0]?.chapter_no || args.activeChapterNo || 1)
  const end = Number(rows.at(-1)?.chapter_no || start)
  const pressureValues = rows.map(pressureSourceForRow).filter(Boolean)
  const sourceStats = dominantFatigueValue(pressureValues)
  const pressureSources = sourceStats.rows.slice(0, 4).map(source => ({
    label: source.display,
    count: source.count,
    chapters: rows
      .filter(row => fatigueFingerprint(pressureSourceForRow(row)) === fatigueFingerprint(source.display))
      .map(row => Number(row?.chapter_no || 0))
      .filter(Boolean),
    riskLevel: source.count / Math.max(1, pressureValues.length) >= 0.5 ? 'warn' as const : 'ok' as const,
  }))

  const pressureSourceSignal: PlanningWorkspaceModel['storyPressureLadder']['signals'][number] = rows.length < 3
    ? {
        key: 'pressure_source',
        label: '压力源',
        status: 'block',
        score: 45,
        count: Math.max(1, 3 - rows.length),
        detail: '未来章节样本不足，先补齐至少三章的压力来源。',
        actionKey: 'update_rolling_plan',
      }
    : pressureValues.length < 3
      ? {
          key: 'pressure_source',
          label: '压力源',
          status: 'warn',
          score: 62,
          count: rows.length - pressureValues.length,
          detail: '未来章节缺少明确反派、规则、环境或组织压力来源。',
          actionKey: 'update_rolling_plan',
        }
      : {
          key: 'pressure_source',
          label: '压力源',
          status: sourceStats.top.count / Math.max(1, pressureValues.length) >= 0.5 ? 'warn' : 'ok',
          score: sourceStats.top.count / Math.max(1, pressureValues.length) >= 0.5 ? 64 : 86,
          count: sourceStats.top.count,
          detail: sourceStats.top.count / Math.max(1, pressureValues.length) >= 0.5
            ? `未来${pressureValues.length}章「${sourceStats.top.display}」出现 ${sourceStats.top.count} 次，压力源过于集中。`
            : `未来${pressureValues.length}章有 ${sourceStats.uniqueCount} 种压力源，压力来源较稳。`,
          actionKey: sourceStats.top.count / Math.max(1, pressureValues.length) >= 0.5 ? 'update_rolling_plan' : 'enter_chapter_writing',
        }

  const signals: PlanningWorkspaceModel['storyPressureLadder']['signals'] = [
    pressureSourceSignal,
    pressureSignalFromPattern({
      key: 'conflict_escalation',
      label: '冲突升级',
      noun: '冲突升级',
      rows,
      pattern: /升级|加码|更大|逼近|追杀|围堵|失控|爆发|反噬|惩罚|危机|敌人|强敌|公开|围攻|封锁/,
      okDetail: '未来章节能看到压力加码或冲突升级。',
      warnDetail: '未来章节缺少明确升级词和加码动作，容易停留在平铺推进。',
    }),
    pressureSignalFromPattern({
      key: 'stakes_growth',
      label: '赌注升级',
      noun: '赌注升级',
      rows,
      pattern: /代价|赌注|失去|死亡|重伤|身份|资源|名额|暴露|失败|牺牲|抉择|惩罚|逐出|清算|欠债/,
      okDetail: '未来章节能看到身份、资源、生命、关系或代价层面的赌注。',
      warnDetail: '未来章节缺少可感知赌注，读者可能觉得主角只是顺路过关。',
    }),
    pressureSignalFromPattern({
      key: 'reversal_pressure',
      label: '反转逼迫',
      noun: '反转逼迫',
      rows,
      pattern: /反转|背叛|误导|陷阱|反制|逼迫|选择|真相|证据|偷袭|揭穿|倒计时|交换|威胁|两难/,
      okDetail: '未来章节有反转、逼迫或两难选择，故事推进具备钩力。',
      warnDetail: '未来章节缺少反转逼迫或两难选择，建议给下一批补强转折点。',
    }),
  ]
  const blockingSignals = signals.filter(signal => signal.status === 'block')
  const warningSignals = signals.filter(signal => signal.status !== 'ok')
  const score = boundedScore(signals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, signals.length), 72)
  const status: PlanningWorkspaceModel['storyPressureLadder']['status'] = blockingSignals.length > 0
    ? 'blocked'
    : warningSignals.length > 0
      ? 'needs_attention'
      : 'ready'

  return {
    status,
    score,
    label: status === 'ready' ? `压力稳定 ${score}` : status === 'blocked' ? `压力断档 ${score}` : `压力待升 ${score}`,
    summary: status === 'ready'
      ? '未来章节有明确压力源、冲突升级、赌注升级和反转逼迫。'
      : `未来章节存在 ${warningSignals.length} 项故事压力风险：${warningSignals.map(signal => signal.label).join('、')}。`,
    chapterRangeLabel: `第${start}-${end}章`,
    actionKey: status === 'ready' ? 'enter_chapter_writing' : 'update_rolling_plan',
    pressureSources,
    signals,
    nextActions: status === 'ready'
      ? ['保持压力源、冲突升级、赌注升级和反转逼迫的连续递进。']
      : ['下一批章节要明确压力源、升级赌注和反转逼迫，保证故事持续往前拱。'],
  }
}

function storyUnitRowText(row: AnyRecord) {
  const payload = chapterPayload(row)
  return [
    firstNonEmpty(row?.title, payload?.title),
    firstNonEmpty(row?.chapter_goal, row?.chapterGoal, row?.task, payload?.chapter_task, payload?.chapterTask),
    firstNonEmpty(row?.conflict, payload?.conflict, payload?.core_conflict),
    firstNonEmpty(row?.ending_hook, row?.endingHook, row?.hook, payload?.ending_hook, payload?.hook),
    firstNonEmpty(payload?.reader_payoff, payload?.readerPayoff, payload?.payoff, payload?.reader_reward),
    firstNonEmpty(payload?.foreshadowing_task, payload?.foreshadowingTask, payload?.storyline_task, payload?.storylineTask),
    firstNonEmpty(payload?.mainline_progress, row?.mainline_progress),
  ].filter(Boolean).join('；')
}

function storyUnitChapterRole(row: AnyRecord, index: number, total: number) {
  const payload = chapterPayload(row)
  return firstNonEmpty(
    payload?.unit_role,
    payload?.story_unit_role,
    payload?.episode_role,
    index === 0 ? '入口钩子' : index === total - 1 ? '出单元钩子' : '',
    /高潮|打脸|兑现|回报|反杀/.test(storyUnitRowText(row)) ? '小高潮回报' : '',
    '推进',
  )
}

function storyUnitSignal(args: {
  key: PlanningStoryUnitSignal['key']
  label: string
  rows: AnyRecord[]
  hitRows: AnyRecord[]
  okDetail: string
  warnDetail: string
  blockDetail?: string
  minHits?: number
}): PlanningStoryUnitSignal {
  if (args.rows.length < 3) {
    return {
      key: args.key,
      label: args.label,
      status: 'block',
      score: 45,
      count: Math.max(1, 3 - args.rows.length),
      detail: args.blockDetail || '剧情单元样本不足三章，无法形成完整事件包。',
      actionKey: 'update_rolling_plan',
    }
  }
  const minHits = args.minHits ?? 1
  const status = args.hitRows.length >= minHits ? 'ok' : 'warn'
  return {
    key: args.key,
    label: args.label,
    status,
    score: status === 'ok' ? 88 : 66,
    count: status === 'ok' ? args.hitRows.length : Math.max(1, minHits - args.hitRows.length),
    detail: status === 'ok' ? args.okDetail : args.warnDetail,
    actionKey: status === 'ok' ? 'enter_chapter_writing' : 'update_rolling_plan',
  }
}

function storyUnitTitleHint(rows: AnyRecord[], outlines: AnyRecord[] = []) {
  const start = Number(rows[0]?.chapter_no || 0)
  const end = Number(rows.at(-1)?.chapter_no || start)
  if (!start || !end) return ''
  const overlappingTurn = outlines
    .filter(isTurn)
    .find(outline => chapterRange(outline).start <= end && chapterRange(outline).end >= start)
  if (overlappingTurn) return text(overlappingTurn.title)
  const overlappingStage = outlines
    .filter(isStage)
    .find(outline => chapterRange(outline).start <= end && chapterRange(outline).end >= start)
  return text(overlappingStage?.title)
}

function buildStoryUnitFromRows(rows: AnyRecord[], unitIndex = 0, titleHint = ''): PlanningStoryUnit {
  const normalizedRows = rows.filter(Boolean)
  const start = Number(normalizedRows[0]?.chapter_no || 0)
  const end = Number(normalizedRows.at(-1)?.chapter_no || start)
  const titleSeed = firstNonEmpty(
    titleHint,
    normalizedRows[0]?.raw_payload?.story_unit_title,
    normalizedRows[0]?.raw_payload?.arc_title,
    normalizedRows[0]?.raw_payload?.event_package,
    normalizedRows[0]?.title,
    start ? `第${start}-${end}章剧情单元` : '未命名剧情单元',
  )
  const texts = normalizedRows.map(storyUnitRowText)
  const firstRow = normalizedRows[0] || {}
  const lastRow = normalizedRows.at(-1) || {}
  const entryHits = firstNonEmpty(firstRow?.ending_hook, firstRow?.endingHook, firstRow?.hook, chapterPayload(firstRow)?.ending_hook)
    || /入口|开场|钩子|倒计时|危机|逼近|异常|点名|追杀/.test(texts[0] || '')
    ? [firstRow]
    : []
  const pressureHits = normalizedRows.filter(row => /升级|加码|逼近|倒计时|公开|反噬|围堵|陷阱|规则|设局|压迫|危机|失控/.test(storyUnitRowText(row)))
  const payoffHits = normalizedRows.filter(row => /小高潮|高潮|回报|兑现|打脸|反杀|获利|升级|公开|震动|胜利/.test(storyUnitRowText(row)))
  const setupHits = normalizedRows.filter(row => /伏笔|埋线|线索|剧情线|主线|关系线|势力线|阵盘|秘密|真相/.test(storyUnitRowText(row)))
  const exitHits = firstNonEmpty(lastRow?.ending_hook, lastRow?.endingHook, lastRow?.hook, chapterPayload(lastRow)?.ending_hook)
    || /出单元|下一段|点名|招揽|真相|更大|新敌|新地图|入门|内门|悬念/.test(storyUnitRowText(lastRow))
    ? [lastRow]
    : []
  const setupDetail = setupHits
    .map(row => firstNonEmpty(chapterPayload(row)?.foreshadowing_task, chapterPayload(row)?.storyline_task, chapterPayload(row)?.mainline_progress, row?.mainline_progress, storyUnitRowText(row)))
    .filter(Boolean)
    .slice(0, 2)
    .join('；')
  const signals: PlanningStoryUnitSignal[] = [
    storyUnitSignal({
      key: 'entry_hook',
      label: '入口钩子',
      rows: normalizedRows,
      hitRows: entryHits,
      okDetail: `第${Number(firstRow?.chapter_no || start)}章有入口钩子，可以把读者带进本单元。`,
      warnDetail: '单元第一章缺少入口钩子，读者可能不知道为什么进入这一段。',
    }),
    storyUnitSignal({
      key: 'pressure_escalation',
      label: '压力升级',
      rows: normalizedRows,
      hitRows: pressureHits,
      minHits: 2,
      okDetail: `本单元有 ${pressureHits.length} 章体现压力升级或设局加码。`,
      warnDetail: '本单元缺少连续压力升级，容易变成平铺过场。',
    }),
    storyUnitSignal({
      key: 'mini_climax_payoff',
      label: '小高潮/回报',
      rows: normalizedRows,
      hitRows: payoffHits,
      okDetail: `本单元包含小高潮或读者回报：${firstNonEmpty(chapterPayload(payoffHits[0])?.reader_payoff, chapterPayload(payoffHits[0])?.payoff, payoffHits[0]?.title, '已规划回报')}`,
      warnDetail: '本单元缺少小高潮或读者回报，连续写完后可能没有结算感。',
    }),
    storyUnitSignal({
      key: 'setup_and_storyline',
      label: '伏笔/剧情线',
      rows: normalizedRows,
      hitRows: setupHits,
      okDetail: setupDetail || '本单元有伏笔、主线或剧情线调度。',
      warnDetail: '本单元缺少伏笔或剧情线任务，长期连载容易只剩单章事件。',
    }),
    storyUnitSignal({
      key: 'exit_hook',
      label: '出单元钩子',
      rows: normalizedRows,
      hitRows: exitHits,
      okDetail: `第${Number(lastRow?.chapter_no || end)}章有出单元钩子，能把读者带到下一段。`,
      warnDetail: '单元最后一章缺少出单元钩子，下一段承接会变弱。',
    }),
  ]
  const status: PlanningStoryUnit['status'] = signals.some(signal => signal.status === 'block')
    ? 'blocked'
    : signals.some(signal => signal.status === 'warn')
      ? 'needs_attention'
      : 'ready'
  const score = boundedScore(signals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, signals.length), 72)
  const warningLabels = signals.filter(signal => signal.status !== 'ok').map(signal => signal.label)
  return {
    key: `unit-${start || unitIndex + 1}-${end || unitIndex + 1}`,
    title: titleSeed.includes('第') ? titleSeed : `${titleSeed}剧情单元`,
    chapterRangeLabel: start && end ? `第${start}-${end}章` : '章节范围未定',
    startChapter: start,
    endChapter: end,
    status,
    score,
    summary: status === 'ready'
      ? '入口钩子、压力升级、小高潮回报、伏笔/剧情线和出单元钩子完整。'
      : `本剧情单元仍缺：${warningLabels.join('、')}。`,
    chapters: normalizedRows.map((row, index) => ({
      chapterNo: Number(row?.chapter_no || 0),
      title: text(row?.title, `第${row?.chapter_no || '?'}章`),
      role: storyUnitChapterRole(row, index, normalizedRows.length),
      goal: firstNonEmpty(row?.chapter_goal, row?.chapterGoal, row?.task, chapterPayload(row)?.chapter_task, chapterPayload(row)?.summary),
    })),
    signals,
  }
}

function buildStoryUnitWorkshopModel(args: {
  routeChapters: AnyRecord[]
  activeChapterNo: number
  outlines?: AnyRecord[]
}): PlanningWorkspaceModel['storyUnitWorkshop'] {
  const rows = args.routeChapters
    .filter(row => Number(row?.chapter_no || 0) >= Number(args.activeChapterNo || 1))
    .slice(0, 12)
  const units: PlanningStoryUnit[] = []
  for (let index = 0; index < rows.length; index += 6) {
    const unitRows = rows.slice(index, index + 6)
    if (unitRows.length) units.push(buildStoryUnitFromRows(unitRows, units.length, storyUnitTitleHint(unitRows, args.outlines || [])))
  }
  const currentUnit = units[0] || buildStoryUnitFromRows([], 0)
  const status = currentUnit.status
  const score = currentUnit.score
  return {
    status,
    score,
    label: status === 'ready' ? `单元完整 ${score}` : status === 'blocked' ? `单元断档 ${score}` : `单元待补 ${score}`,
    summary: status === 'ready'
      ? '当前剧情单元具备完整事件包，可以支撑 5-20 章连续推进。'
      : `当前剧情单元缺少完整事件包：${currentUnit.summary}`,
    actionKey: status === 'ready' ? 'enter_chapter_writing' : 'update_rolling_plan',
    currentUnit,
    units,
    nextActions: status === 'ready'
      ? ['当前剧情单元入口、压力升级、小高潮、伏笔/剧情线和出单元钩子完整，可以按单元推进。']
      : ['先补齐当前剧情单元的入口钩子、压力升级、小高潮回报、伏笔/剧情线和出单元钩子，再扩大批量连写。'],
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
  const productionTasks = input.productionTasks || null

  const currentVolume = outlines.find(outline => isVolume(outline) && chapterInRange(activeChapterNo, outline)) || outlines.find(isVolume) || {}
  const currentStage = outlines.find(outline => isStage(outline) && chapterInRange(activeChapterNo, outline)) || outlines.find(isStage) || {}
  const turns = outlines.filter(isTurn).sort((a, b) => chapterRange(a).start - chapterRange(b).start)
  const currentTurns = turns.filter(turn => chapterInRange(activeChapterNo, turn))
  const previousTurn = turns.filter(turn => chapterRange(turn).end < activeChapterNo).at(-1)
  const nextTurn = turns.find(turn => chapterRange(turn).start >= activeChapterNo)
  const bibleVolume = resolveVolumeFromBible(writingBible, currentVolume)
  const bibleStage = resolveStageFromBible(bibleVolume, currentStage)

  const planRecords = planningRecords(chapters, outlines)
  const routeChapters = Array.from({ length: 10 }).map((_, index) => {
    const chapterNo = activeChapterNo + index
    const records = planRecords.filter(record => Number(record?.chapter_no || 0) === chapterNo)
    if (!records.length) return null
    return records.find(record => !routeRiskTags(record, currentTurns.length ? currentTurns : turns).length) || records[0] || { chapter_no: chapterNo }
  }).filter(Boolean) as AnyRecord[]
  const futureRoute = routeChapters.map(chapter => ({
    chapterNo: Number(chapter?.chapter_no),
    title: text(chapter?.title, `第${chapter?.chapter_no || '?'}章`),
    chapterTask: text(chapter?.chapter_goal || chapter?.chapterTask || chapter?.task),
    conflict: text(chapter?.conflict || chapter?.raw_payload?.conflict),
    endingHook: text(chapter?.ending_hook || chapter?.endingHook || chapter?.hook),
    mainlineProgress: text(chapter?.raw_payload?.mainline_progress || chapter?.mainline_progress),
    riskTags: routeRiskTags(chapter, currentTurns.length ? currentTurns : turns),
  }))

  const future10Coverage = buildCoverage(planRecords, activeChapterNo, 10)
  const future100Coverage = buildCoverage(planRecords, activeChapterNo, 100)
  const readerPromise = firstNonEmpty(writingBible?.promise, writingBible?.reader_promise, selectedProject?.reader_promise)
  const currentVolumeGoal = firstNonEmpty(bibleVolume?.goal, currentVolume?.goal, currentVolume?.summary)
  const currentStageConflict = firstNonEmpty(bibleStage?.conflict, currentStage?.conflict, activeChapter?.conflict)
  const longformSpineGuard = buildLongformSpineGuardModel(writingBible, reviews)
  const coreContractRadar = buildCoreContractRadarModel({
    longformSpineGuard,
    activeChapter,
    currentVolumeGoal,
    reviews,
  })
  const activeChapterEvidence = firstNonEmpty(
    activeChapter?.chapter_goal,
    activeChapter?.raw_payload?.mainline_progress,
    activeChapter?.mainline_progress,
    activeChapter?.chapter_summary,
    activeChapter?.summary,
  )
  const currentLatestWrittenChapterNo = latestWrittenChapterNo(chapters)
  const healthIssues = buildHealthIssues({
    readerPromise,
    currentVolumeGoal,
    future10Coverage,
    storyState,
    latestWrittenChapterNo: currentLatestWrittenChapterNo,
    materialScore: input.materialScore,
  })
  const first30Retention = buildFirst30RetentionModel(chapters, reviews, productionTasks)
  const readerTrustLedger = buildReaderTrustLedgerModel(reviews)
  const readerTrialRoom = buildReaderTrialRoomModel(reviews)
  const innovationRadar = buildInnovationRadarModel(reviews)
  const storylineBoard = buildStorylineBoardModel(settingEntities, first30Retention, activeChapterNo, reviews)
  const characterArcBoard = buildCharacterArcBoardModel(settingEntities, reviews, activeChapterNo)
  const writtenWords = chapters.reduce((sum, chapter) => sum + chapterWordCount(chapter), 0)
  const targetWords = Number(selectedProject?.target_words || selectedProject?.targetWords || 0)
  const longformMemoryCapsule = buildLongformMemoryCapsuleModel({
    writingBible,
    storyState,
    latestWrittenChapterNo: currentLatestWrittenChapterNo,
  })
  const millionWordMilestones = buildMillionWordMilestonesModel({
    writingBible,
    targetWords,
    writtenWords,
  })
  const volumeBeatBudget = buildVolumeBeatBudgetModel({
    currentVolume,
    outlines,
    chapters,
    activeChapterNo,
  })
  const volumeSegmentGate = buildVolumeSegmentGateModel({
    currentVolume,
    currentVolumeGoal,
    chapters,
    reviews,
    volumeBeatBudget,
    readerTrustLedger,
    innovationRadar,
  })
  const recentFatigueRadar = buildRecentFatigueRadarModel({
    chapters,
    activeChapterNo,
    reviews,
  })
  const storyPressureLadder = buildStoryPressureLadderModel({
    routeChapters,
    activeChapterNo,
  })
  const storyUnitWorkshop = buildStoryUnitWorkshopModel({
    routeChapters,
    activeChapterNo,
    outlines,
  })
  const longformRhythm = buildLongformRhythmModel({
    reviews,
    writtenWords,
    currentVolumeGoal,
    future100Coverage,
    healthIssues,
    first30Retention,
    storylineBoard,
    volumeBeatBudget,
  })
  const longformBattleDesk = buildLongformBattleDeskModel({
    reviews,
    longformSpineGuard,
    millionWordMilestones,
    longformRhythm,
    first30Retention,
    readerTrustLedger,
    readerTrialRoom,
    storylineBoard,
    volumeBeatBudget,
    innovationRadar,
    storyUnitWorkshop,
    future10Coverage,
    future100Coverage,
  })
  const serialReleaseDesk = buildSerialReleaseDeskModel({
    selectedProject,
    chapters,
    reviews,
  })
  const governanceHub = buildGovernanceHubModel({
    reviews,
    healthIssues,
    first30Retention,
    readerTrialRoom,
    storylineBoard,
    longformRhythm,
    future10Coverage,
    future100Coverage,
    productionTasks,
  })
  const creationPipeline = buildCreationPipelineModel({
    longformSpineGuard,
    millionWordMilestones,
    future10Coverage,
    future100Coverage,
    storylineBoard,
    characterArcBoard,
    activeChapter,
    currentVolumeGoal,
    governanceHub,
    serialReleaseDesk,
  })

  return {
    topStatus: {
      projectTitle: text(selectedProject?.title, '未命名项目'),
      currentVolume: text(currentVolume?.title || bibleVolume?.title, '未定位当前卷'),
      currentStage: text(currentStage?.title || bibleStage?.title, '未定位当前阶段'),
      currentChapterLabel: activeChapterNo ? `第${activeChapterNo}章` : '未选择章节',
      writtenWords,
      targetWords,
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
    creationPipeline,
    longformSpineGuard,
    coreContractRadar,
    millionWordMilestones,
    longformMemoryCapsule,
    futureRoute,
    first30Retention,
    readerTrustLedger,
    readerTrialRoom,
    innovationRadar,
    storylineBoard,
    characterArcBoard,
    governanceHub,
    serialReleaseDesk,
    longformRhythm,
    longformBattleDesk,
    volumeBeatBudget,
    volumeSegmentGate,
    recentFatigueRadar,
    storyPressureLadder,
    storyUnitWorkshop,
    volumeTree: buildVolumeTree(outlines, chapters),
    healthIssues,
  }
}

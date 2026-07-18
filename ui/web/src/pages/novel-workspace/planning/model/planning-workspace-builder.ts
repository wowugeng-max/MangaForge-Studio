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
import {
  buildCharacterArcBoardModel,
  buildFirst30RetentionModel,
  buildStorylineBoardModel,
} from './planning-workspace-builder-boards'
import {
  buildReaderTrustLedgerModel,
  buildReaderTrialRoomModel,
  buildInnovationRadarModel,
  buildVolumeSegmentGateModel,
  buildRecentFatigueRadarModel,
  buildStoryPressureLadderModel,
  buildStoryUnitWorkshopModel,
} from './planning-workspace-builder-signals'

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

export function chapterRange(item: AnyRecord) {
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

export function isStage(item: AnyRecord) {
  const level = outlineLevel(item)
  return level === 'stage' || level === 'arc' || level === '阶段'
}

export function isTurn(item: AnyRecord) {
  const level = outlineLevel(item)
  return level === 'turning_point' || level === 'turn' || level === 'plot_turn' || level === '转折'
}

function isClimaxOutline(item: AnyRecord) {
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

export function compactList(values: any[], limit = 6) {
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

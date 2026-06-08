import type { PlanningActionKey, PlanningWorkspaceModel } from './planningWorkspaceModel'
import type { WritingCockpitActionKey, WritingCockpitModel } from './writingCockpitModel'

type AnyRecord = Record<string, any>

export type AutoCreationDirectorStatus =
  | 'blocked'
  | 'needs_governance'
  | 'needs_acceptance'
  | 'ready'
  | 'running'

export type AutoCreationDirectorArea = 'planning' | 'writing' | 'assets' | 'quality' | 'ops'

export type AutoCreationDirectorActionKey =
  | PlanningActionKey
  | WritingCockpitActionKey
  | 'open_task_center'
  | 'open_story_assets'
  | 'start_safe_batch_generation'
  | 'create_safe_batch_risk_repair'
  | 'select_model'

export type AutoCreationPipelineStatus = 'done' | 'active' | 'pending' | 'blocked' | 'warning'
export type AutoCreationContractStatus = 'ok' | 'warn' | 'block'
export type AutoCreationBatchGuardrailStatus = 'ready' | 'caution' | 'blocked'
export type AutoCreationBatchGuardrailSignalStatus = 'ok' | 'warn' | 'block'
export type AutoCreationBatchReviewStatus = 'empty' | 'ok' | 'warn' | 'risk' | 'done'
export type AutoCreationBatchReviewItemStatus = 'success' | 'failed'
export type AutoCreationBatchRiskStatus = 'ok' | 'warn'
export type AutoCreationLongformCapacityStatus = 'ready' | 'caution' | 'blocked'

export interface AutoCreationDirectorAction {
  area: AutoCreationDirectorArea
  key: AutoCreationDirectorActionKey
  label: string
  description: string
  modelCall: boolean
  disabled?: boolean
}

export interface AutoCreationPipelineStep {
  key:
    | 'longform_planning'
    | 'creation_contract'
    | 'longform_capacity'
    | 'volume_beat_budget'
    | 'longform_rhythm'
    | 'story_assets'
    | 'retention_curve'
    | 'chapter_planning'
    | 'batch_guardrail'
    | 'chapter_execution'
    | 'quality_gate'
    | 'canon_sync'
    | 'async_tasks'
  label: string
  status: AutoCreationPipelineStatus
  detail: string
}

export interface AutoCreationContractItem {
  key: 'core' | 'story' | 'innovation' | 'reader_pull'
  label: string
  status: AutoCreationContractStatus
  detail: string
  evidence: string[]
  actionKey: AutoCreationDirectorActionKey
}

export interface AutoCreationLongformCompassAxis {
  key:
    | 'reader_promise'
    | 'protagonist_drive'
    | 'core_conflict'
    | 'world_hook'
    | 'innovation_hook'
    | 'payoff_loop'
    | 'ending_direction'
  label: string
  value: string
  locked: boolean
}

export interface AutoCreationLongformCompass {
  status: 'ready' | 'needs_attention'
  label: string
  summary: string
  sourceLabel: string
  readerPromise: string
  axes: AutoCreationLongformCompassAxis[]
  immutableRules: string[]
  flexibleZones: string[]
}

export interface AutoCreationBatchGuardrailSignal {
  label: string
  status: AutoCreationBatchGuardrailSignalStatus
  detail: string
}

export interface AutoCreationNextBatchBriefChapter {
  chapterNo: number
  title: string
  chapterTask: string
  conflict: string
  endingHook: string
  mainlineProgress: string
}

export interface AutoCreationNextBatchBrief {
  visible: boolean
  chapterRangeLabel: string
  batchGoal: string
  readerPayoffPlan: string
  mainlineFocus: string
  forbiddenBoundary: string
  chapters: AutoCreationNextBatchBriefChapter[]
}

export interface AutoCreationLongformCapacitySignal {
  key: 'future_reserve' | 'storyline_pool' | 'volume_runway' | 'production_stamina'
  label: string
  status: AutoCreationBatchGuardrailSignalStatus
  score: number
  detail: string
  actionKey: PlanningActionKey
}

export interface AutoCreationLongformFuelItem {
  key: AutoCreationLongformCapacitySignal['key']
  label: string
  status: AutoCreationBatchGuardrailSignalStatus
  detail: string
  actionKey: PlanningActionKey
  actionLabel: string
  modelCall: boolean
}

export interface AutoCreationLongformCapacity {
  status: AutoCreationLongformCapacityStatus
  score: number
  label: string
  summary: string
  targetBandLabel: string
  remainingWords: number
  estimatedRemainingChapters: number
  recommendedActionKey: PlanningActionKey
  signals: AutoCreationLongformCapacitySignal[]
  fuelQueue: AutoCreationLongformFuelItem[]
}

export interface AutoCreationBatchGuardrail {
  status: AutoCreationBatchGuardrailStatus
  label: string
  summary: string
  safeChapterCount: number
  recommendedAction: AutoCreationDirectorAction
  guardrails: AutoCreationBatchGuardrailSignal[]
  nextBatchBrief: AutoCreationNextBatchBrief
}

export interface AutoCreationBatchReviewItem {
  chapterId: any
  chapterNo: number
  title: string
  status: AutoCreationBatchReviewItemStatus
  score: number | null
  wordCount: number | null
  revised: boolean
  delivered: boolean
  error: string
}

export interface AutoCreationBatchRiskSignal {
  key: 'quality' | 'core' | 'payoff' | 'storyline' | 'readability' | 'batch_plan'
  label: string
  status: AutoCreationBatchRiskStatus
  detail: string
}

export interface AutoCreationBatchRiskRadar {
  status: AutoCreationBatchRiskStatus
  averageQualityScore: number | null
  lowQualityCount: number
  coreRiskCount: number
  payoffDebtCount: number
  storylineRiskCount: number
  readabilityRiskCount: number
  batchPlanRiskCount: number
  signals: AutoCreationBatchRiskSignal[]
  repairTasks: AnyRecord[]
}

export interface AutoCreationBatchReviewQueue {
  visible: boolean
  status: AutoCreationBatchReviewStatus
  label: string
  summary: string
  total: number
  success: number
  failed: number
  delivered: number
  safeLimit: number | null
  availableTotal: number | null
  createdAt: string
  nextAction: AutoCreationDirectorAction
  riskRadar: AutoCreationBatchRiskRadar
  items: AutoCreationBatchReviewItem[]
}

export interface AutoCreationDirectorModel {
  status: AutoCreationDirectorStatus
  statusLabel: string
  headline: string
  summary: string
  targetChapter: {
    id: any
    chapterNo: number
    title: string
    wordCount: number
    hasProse: boolean
  } | null
  mainAction: AutoCreationDirectorAction
  secondaryActions: AutoCreationDirectorAction[]
  blockers: string[]
  confirmations: string[]
  queue: {
    activeCount: number
    labels: string[]
  }
  metrics: {
    writtenWords: number
    targetWords: number
    future10Label: string
    first30Score: number | null
    storylineCount: number
    creationDiagnosisScore: number | null
    longformRhythmScore: number | null
    volumeBeatScore: number | null
    longformCapacityScore: number | null
  }
  longformRhythm: PlanningWorkspaceModel['longformRhythm']
  longformCapacity: AutoCreationLongformCapacity
  longformCompass: AutoCreationLongformCompass
  creationContract: AutoCreationContractItem[]
  batchGuardrail: AutoCreationBatchGuardrail
  batchReviewQueue: AutoCreationBatchReviewQueue
  pipeline: AutoCreationPipelineStep[]
}

export interface BuildAutoCreationDirectorModelInput {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  activeTasks?: AnyRecord[] | null
  selectedModelId?: any
  reviews?: AnyRecord[] | null
  runRecords?: AnyRecord[] | null
  chapters?: AnyRecord[] | null
  storyState?: AnyRecord | null
}

const PLANNING_ACTION_LABELS: Record<PlanningActionKey, string> = {
  update_rolling_plan: '更新滚动规划',
  complete_volume_plan: '补齐当前卷规划',
  enter_chapter_writing: '进入当前章写作',
  open_outline_tree: '查看完整大纲',
  future100_audit: '检查未来100章',
  future100_generate: '生成未来100章',
  longform_pressure: '运行长线压力测试',
  longform_creation_diagnosis: '运行创作诊断',
  topic_validation: '验证原创选题',
  reference_diagnosis: '诊断参考知识',
  open_story_assets: '打开设定资产',
  update_story_state: '校正故事状态',
  open_quality_revision: '进入质检修订',
  run_first30_retention: '运行前30章诊断',
  create_first30_repair: '生成修复任务',
}

const WRITING_ACTION_LABELS: Record<WritingCockpitActionKey, string> = {
  open_writing_bible: '完善写作圣经',
  open_outline_panel: '打开大纲面板',
  repair_materials: '修复生成材料',
  build_scene_plan: '生成场景卡',
  write_draft: '生成本章初稿',
  review_draft: '审阅修订正文',
  fix_continuity: '修复连续性',
  update_canon: '同步故事状态',
  open_task_center: '打开任务中心',
  refresh_context_package: '刷新上下文包',
  open_generation_diagnostics: '查看生成诊断',
  confirm_plan_and_write_draft: '确认并生成',
  refresh_current_quality: '复检当前版本',
  create_editor_report: '生成编辑报告',
  apply_editor_revision: '生成修订稿',
  sync_story_state: '同步故事状态',
  accept_chapter_and_continue: '验收并进入下一章',
  open_editor_reports: '查看编辑报告',
  open_version_history: '查看版本历史',
}

const MODEL_CALL_ACTIONS = new Set<string>([
  'update_rolling_plan',
  'future100_audit',
  'future100_generate',
  'longform_pressure',
  'longform_creation_diagnosis',
  'topic_validation',
  'reference_diagnosis',
  'run_first30_retention',
  'create_first30_repair',
  'build_scene_plan',
  'write_draft',
  'confirm_plan_and_write_draft',
  'refresh_current_quality',
  'create_editor_report',
  'apply_editor_revision',
  'repair_materials',
  'refresh_context_package',
  'start_safe_batch_generation',
])

function arrayValue(value: any): any[] {
  return Array.isArray(value) ? value : []
}

function text(value: any, fallback = '') {
  if (value === null || value === undefined) return fallback
  const normalized = String(value).trim()
  return normalized || fallback
}

function firstText(...values: any[]) {
  for (const value of values) {
    const normalized = text(value)
    if (normalized) return normalized
  }
  return ''
}

function planningAction(key: PlanningActionKey, description: string): AutoCreationDirectorAction {
  return {
    area: 'planning',
    key,
    label: PLANNING_ACTION_LABELS[key] || key,
    description,
    modelCall: MODEL_CALL_ACTIONS.has(key),
  }
}

function writingAction(key: WritingCockpitActionKey, description: string, label?: string): AutoCreationDirectorAction {
  return {
    area: 'writing',
    key,
    label: label || WRITING_ACTION_LABELS[key] || key,
    description,
    modelCall: MODEL_CALL_ACTIONS.has(key),
  }
}

function opsAction(
  key: 'open_task_center' | 'select_model' | 'start_safe_batch_generation' | 'create_safe_batch_risk_repair',
  label: string,
  description: string,
  disabled = false,
): AutoCreationDirectorAction {
  return {
    area: 'ops',
    key,
    label,
    description,
    modelCall: MODEL_CALL_ACTIONS.has(key),
    disabled,
  }
}

function targetChapter(writing: WritingCockpitModel): AutoCreationDirectorModel['targetChapter'] {
  const chapter = writing.nextChapter
  if (!chapter) return null
  return {
    id: chapter.id,
    chapterNo: Number(chapter.chapterNo || 0),
    title: text(chapter.title, '未命名章节'),
    wordCount: Number(chapter.wordCount || 0),
    hasProse: Boolean(chapter.hasProse),
  }
}

function taskLabel(task: AnyRecord) {
  return text(task?.type_label || task?.run_type || task?.step_name || task?.status, '运行中任务')
}

function hasRunningTasks(tasks: AnyRecord[]) {
  return tasks.some(task => ['queued', 'ready', 'paused', 'running'].includes(text(task?.status)))
}

function planningBlocker(planning: PlanningWorkspaceModel) {
  const critical = arrayValue(planning.healthIssues).find(issue => issue?.severity === 'critical')
  if (critical) {
    return {
      title: text(critical.title, '长线规划需要补齐'),
      actionKey: (critical.actionKey || 'update_rolling_plan') as PlanningActionKey,
      detail: text(critical.detail, '先补齐长篇生产前置规划。'),
    }
  }
  if (planning.topStatus.longformHealth.status === 'needs_planning') {
    return {
      title: '长线规划需要补齐',
      actionKey: 'update_rolling_plan' as PlanningActionKey,
      detail: text(planning.topStatus.future10Coverage.label, '先补齐未来十章规划。'),
    }
  }
  return null
}

function retentionNeedsAction(planning: PlanningWorkspaceModel) {
  const retention = planning.first30Retention
  return retention.status === 'missing'
    || retention.status === 'stale'
    || retention.status === 'blocked'
    || retention.status === 'needs_repair'
}

function storylineNeedsAction(planning: PlanningWorkspaceModel) {
  return planning.storylineBoard.status === 'missing' || planning.storylineBoard.status === 'needs_attention'
}

function rhythmNeedsAction(planning: PlanningWorkspaceModel) {
  return Boolean(planning.longformRhythm && planning.longformRhythm.status !== 'ready')
}

function volumeBeatNeedsAction(planning: PlanningWorkspaceModel) {
  return Boolean(planning.volumeBeatBudget && planning.volumeBeatBudget.status !== 'ready')
}

function rhythmAction(planning: PlanningWorkspaceModel): PlanningActionKey {
  const signal = planning.longformRhythm?.signals?.find(item => item.status === 'block')
    || planning.longformRhythm?.signals?.find(item => item.status === 'warn')
  return (signal?.actionKey || 'longform_pressure') as PlanningActionKey
}

function parsePayload(value: any) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(String(value))
  } catch {
    return null
  }
}

function recordTime(record: AnyRecord) {
  const timestamp = Date.parse(text(record?.created_at || record?.updated_at))
  return Number.isFinite(timestamp) ? timestamp : 0
}

const BATCH_DELIVERY_QUALITY_THRESHOLD = 78

function proseText(chapter?: AnyRecord | null) {
  return text(chapter?.chapter_text || chapter?.chapterText)
}

function hasDeliveredProse(chapter?: AnyRecord | null) {
  const content = proseText(chapter)
  return Boolean(content && !content.includes('【占位正文】'))
}

function payloadChapterId(payload: AnyRecord) {
  return payload?.chapter_id ?? payload?.chapterId ?? payload?.chapter?.id ?? payload?.chapter?.chapter_id ?? null
}

function payloadChapterNo(payload: AnyRecord) {
  return Number(payload?.chapter_no ?? payload?.chapterNo ?? payload?.chapter?.chapter_no ?? payload?.chapter?.chapterNo ?? 0)
}

function reviewMatchesChapter(review: AnyRecord, chapter: AnyRecord, fallbackChapterNo: number) {
  const payload = parsePayload(review?.payload) || {}
  const reviewChapterId = review?.chapter_id ?? review?.chapterId ?? payloadChapterId(payload)
  const reviewChapterNo = Number(review?.chapter_no ?? review?.chapterNo ?? payloadChapterNo(payload))
  const chapterId = chapter?.id ?? chapter?.chapter_id ?? null
  if (chapterId !== null && chapterId !== undefined && reviewChapterId !== null && reviewChapterId !== undefined) {
    return String(reviewChapterId) === String(chapterId)
  }
  return reviewChapterNo > 0 && reviewChapterNo === fallbackChapterNo
}

function qualityPayload(review?: AnyRecord | null) {
  const payload = parsePayload(review?.payload) || {}
  return payload?.review || payload?.result?.review || payload?.result || payload
}

function latestQualityReviewForChapter(reviews: AnyRecord[], chapter: AnyRecord, chapterNo: number) {
  return reviews
    .filter(review => text(review?.review_type) === 'prose_quality')
    .filter(review => reviewMatchesChapter(review, chapter, chapterNo))
    .sort((a, b) => recordTime(b) - recordTime(a))[0] || null
}

function latestReviewForChapter(reviews: AnyRecord[], chapter: AnyRecord, chapterNo: number, reviewType: string) {
  return reviews
    .filter(review => text(review?.review_type) === reviewType)
    .filter(review => reviewMatchesChapter(review, chapter, chapterNo))
    .sort((a, b) => recordTime(b) - recordTime(a))[0] || null
}

function qualityReviewPassed(review?: AnyRecord | null) {
  if (!review) return false
  const quality = qualityPayload(review)
  const passed = quality?.passed
  const needsRevision = quality?.needs_revision ?? quality?.needsRevision
  const scoreValue = quality?.score ?? quality?.overall_score ?? quality?.quality_score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  if (passed === false || needsRevision === true) return false
  if (Number.isFinite(score)) return Number(score) >= BATCH_DELIVERY_QUALITY_THRESHOLD
  return passed === true
}

function findChapter(chapters: AnyRecord[], item: { chapterId: any; chapterNo: number }) {
  return chapters.find(chapter => {
    const chapterId = chapter?.id ?? chapter?.chapter_id ?? null
    return item.chapterId !== null && item.chapterId !== undefined && chapterId !== null && chapterId !== undefined
      ? String(chapterId) === String(item.chapterId)
      : Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0) === item.chapterNo
  }) || null
}

function batchChapterDelivered(args: {
  item: { chapterId: any; chapterNo: number; status: AutoCreationBatchReviewItemStatus }
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  storyState: AnyRecord
}) {
  if (args.item.status !== 'success') return false
  const chapter = findChapter(args.chapters, args.item)
  if (!chapter || !hasDeliveredProse(chapter)) return false
  if (Number(args.storyState?.last_updated_chapter || 0) < Number(args.item.chapterNo || 0)) return false
  return qualityReviewPassed(latestQualityReviewForChapter(args.reviews, chapter, args.item.chapterNo))
}

function numberValue(value: any) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : null
}

function riskPayload(review: AnyRecord | null, key: string) {
  const payload = parsePayload(review?.payload) || {}
  return payload?.[key] || payload?.result?.[key] || payload?.result || payload
}

function riskCountFromStatus(payload: AnyRecord, review: AnyRecord | null) {
  return text(payload?.status || review?.status).toLowerCase() === 'warn' ? 1 : 0
}

function coreRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'core_drift')
  const count = arrayValue(payload?.drift_risks).length + arrayValue(payload?.risks).length
  return count > 0 ? count : riskCountFromStatus(payload, review)
}

function payoffDebtCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'reader_payoff_sync')
  const count = numberValue(payload?.debt_count ?? payload?.debtCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length + arrayValue(payload?.debts).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

function storylineRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'storyline_sync')
  const count = arrayValue(payload?.missed).length
    + arrayValue(payload?.unplanned).length
    + arrayValue(payload?.forbidden_touched).length
  return count > 0 ? count : riskCountFromStatus(payload, review)
}

function readabilityRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'readability_review')
  const memeSense = payload?.meme_sense || {}
  const immersionRiskCount = arrayValue(memeSense?.immersion_risks).length + arrayValue(payload?.immersion_risks).length
  const score = numberValue(payload?.readability_score ?? payload?.score)
  const lowScoreCount = score !== null && score < BATCH_DELIVERY_QUALITY_THRESHOLD ? 1 : 0
  return immersionRiskCount + lowScoreCount
}

function issueText(value: any) {
  if (typeof value === 'string') return text(value)
  return firstText(value?.description, value?.issue, value?.message, value?.suggestion, value?.title, value?.name)
}

function issueTexts(values: any[], limit = 6) {
  return Array.from(new Set(values.map(issueText).filter(Boolean))).slice(0, limit)
}

function buildBatchPlanReview(args: {
  batchPlanContext: AnyRecord | null
  coreReview: AnyRecord | null
  payoffReview: AnyRecord | null
  storylineReview: AnyRecord | null
}) {
  const context = args.batchPlanContext || {}
  const chapterPlan = context.chapter_plan || {}
  const planned = [
    context.batch_goal ? `本批目标：${context.batch_goal}` : '',
    context.reader_payoff_plan ? `读者回报：${context.reader_payoff_plan}` : '',
    context.mainline_focus ? `主线焦点：${context.mainline_focus}` : '',
    context.forbidden_boundary ? `禁抢跑边界：${context.forbidden_boundary}` : '',
    chapterPlan.chapter_task ? `本章职责：${chapterPlan.chapter_task}` : '',
    chapterPlan.conflict ? `本章冲突：${chapterPlan.conflict}` : '',
    chapterPlan.ending_hook ? `章末钩子：${chapterPlan.ending_hook}` : '',
  ].filter(Boolean)

  const corePayload = riskPayload(args.coreReview, 'chapter_core_drift')
  const payoffPayload = riskPayload(args.payoffReview, 'reader_payoff_sync')
  const storylinePayload = riskPayload(args.storylineReview, 'storyline_sync')
  const coreRisks = issueTexts([...arrayValue(corePayload?.drift_risks), ...arrayValue(corePayload?.risks)])
  const payoffMissed = issueTexts([...arrayValue(payoffPayload?.missed), ...arrayValue(payoffPayload?.debts)])
  const storylineMissed = issueTexts(arrayValue(storylinePayload?.missed))
  const storylineUnplanned = issueTexts(arrayValue(storylinePayload?.unplanned))
  const forbiddenTouched = issueTexts(arrayValue(storylinePayload?.forbidden_touched))
  const actualRisks = [
    ...coreRisks.map(item => `核心偏移：${item}`),
    ...payoffMissed.map(item => `回报欠账：${item}`),
    ...storylineMissed.map(item => `剧情线漏推：${item}`),
    ...storylineUnplanned.map(item => `额外推进：${item}`),
    ...forbiddenTouched.map(item => `禁揭触碰：${item}`),
  ]

  return {
    planned,
    missed: Array.from(new Set([...payoffMissed, ...storylineMissed])),
    actual_risks: actualRisks,
    forbidden_touched: forbiddenTouched,
    unplanned: storylineUnplanned,
  }
}

function batchRepairTask(args: {
  item: AutoCreationBatchReviewItem
  issueType: string
  severity: 'high' | 'medium'
  message: string
  action: string
  metrics: AnyRecord
  batchPlanContext?: AnyRecord | null
  batchPlanReview?: AnyRecord | null
}) {
  return {
    task_type: 'repair_quality',
    issue_type: args.issueType,
    severity: args.severity,
    chapter_id: args.item.chapterId || null,
    chapter_no: args.item.chapterNo,
    title: `第${args.item.chapterNo}章《${args.item.title}》批次风险修复`,
    message: args.message,
    action: args.action,
    acceptance_criteria: [
      '质量复检通过且分数不低于78',
      '核心冲突、读者回报和章末钩子重新落地',
      '故事状态、剧情线和回报债务复盘后无新增警告',
    ],
    task_status: 'open',
    source: 'auto_creation_safe_batch_risk',
    metrics: args.metrics,
    ...(args.batchPlanContext ? { batch_plan_context: args.batchPlanContext } : {}),
    ...(args.batchPlanReview ? { batch_plan_review: args.batchPlanReview } : {}),
  }
}

function isResolvedTaskStatus(value: any) {
  return ['resolved', 'done', 'completed', 'success', 'closed'].includes(text(value).toLowerCase())
}

function isCompletedRepairRun(run: AnyRecord) {
  return ['completed', 'success', 'done'].includes(text(run?.status).toLowerCase())
}

function batchRiskIssueKeys(item: { chapterId: any; chapterNo: number }, issueType: string) {
  return [
    item.chapterId !== null && item.chapterId !== undefined ? `id:${String(item.chapterId)}:${issueType}` : '',
    item.chapterNo > 0 ? `no:${item.chapterNo}:${issueType}` : '',
  ].filter(Boolean)
}

function resolvedBatchRiskIssueTypes(issueType: string) {
  if (issueType === 'batch_brief_mismatch') {
    return [
      'batch_brief_mismatch',
      'core_drift',
      'reader_payoff_debt',
      'storyline_sync_risk',
    ]
  }
  return [issueType]
}

function batchRiskIssueResolved(keys: Set<string> | undefined, item: AutoCreationBatchReviewItem, issueType: string) {
  if (!keys) return false
  return batchRiskIssueKeys(item, issueType).some(key => keys.has(key))
}

function batchBriefChapterNos(batchBrief: AnyRecord | null | undefined) {
  return new Set(arrayValue(batchBrief?.chapters)
    .map(item => Number(item?.chapter_no ?? item?.chapterNo ?? 0))
    .filter(Boolean))
}

function batchBriefVisible(batchBrief: AnyRecord | null | undefined) {
  if (!batchBrief) return false
  return Boolean(
    text(batchBrief?.batch_goal || batchBrief?.batchGoal)
    || text(batchBrief?.reader_payoff_plan || batchBrief?.readerPayoffPlan)
    || text(batchBrief?.mainline_focus || batchBrief?.mainlineFocus)
    || text(batchBrief?.forbidden_boundary || batchBrief?.forbiddenBoundary)
    || arrayValue(batchBrief?.chapters).length,
  )
}

function batchBriefAppliesToItem(batchBrief: AnyRecord | null | undefined, item: AutoCreationBatchReviewItem) {
  if (!batchBriefVisible(batchBrief)) return false
  const plannedNos = batchBriefChapterNos(batchBrief)
  return plannedNos.size === 0 || plannedNos.has(Number(item.chapterNo))
}

function normalizeBatchBriefChapterPlan(value: any) {
  if (!value) return null
  return {
    chapter_no: Number(value.chapter_no ?? value.chapterNo ?? 0) || null,
    title: firstText(value.title),
    chapter_task: firstText(value.chapter_task, value.chapterTask, value.task),
    conflict: firstText(value.conflict),
    ending_hook: firstText(value.ending_hook, value.endingHook),
    mainline_progress: firstText(value.mainline_progress, value.mainlineProgress),
  }
}

function buildBatchPlanContext(batchBrief: AnyRecord | null | undefined, item: AutoCreationBatchReviewItem) {
  if (!batchBriefVisible(batchBrief)) return null
  const chapterPlan = arrayValue(batchBrief?.chapters)
    .find(plan => Number(plan?.chapter_no ?? plan?.chapterNo ?? 0) === Number(item.chapterNo))
  return {
    batch_goal: firstText(batchBrief?.batch_goal, batchBrief?.batchGoal),
    reader_payoff_plan: firstText(batchBrief?.reader_payoff_plan, batchBrief?.readerPayoffPlan),
    mainline_focus: firstText(batchBrief?.mainline_focus, batchBrief?.mainlineFocus),
    forbidden_boundary: firstText(batchBrief?.forbidden_boundary, batchBrief?.forbiddenBoundary),
    chapter_plan: normalizeBatchBriefChapterPlan(chapterPlan),
  }
}

function buildResolvedBatchRiskIssueKeys(args: {
  runRecords: AnyRecord[]
  batchCreatedAt: string
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const resolvedKeys = new Set<string>()
  const batchCreatedAt = text(args.batchCreatedAt)
  const repairRuns = args.runRecords
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .map(run => ({
      run,
      input: parsePayload(run?.input_ref) || {},
      output: parsePayload(run?.output_ref) || {},
    }))
    .filter(entry => text(entry.input?.source) === 'auto_creation_safe_batch_risk')
    .filter(entry => !batchCreatedAt || text(entry.input?.batch_created_at) === batchCreatedAt)
    .filter(entry => isCompletedRepairRun(entry.run))

  for (const entry of repairRuns) {
    const runCompletedAt = Date.parse(text(entry.run?.completed_at || entry.run?.finished_at || entry.run?.updated_at || entry.run?.created_at))
    const repairTime = Number.isFinite(runCompletedAt) ? runCompletedAt : recordTime(entry.run)
    const tasks = [
      ...arrayValue(entry.output?.tasks),
      ...arrayValue(entry.output?.repairTasks),
    ]
    for (const task of tasks) {
      if (!isResolvedTaskStatus(task?.task_status ?? task?.status)) continue
      const issueType = text(task?.issue_type ?? task?.issueType)
      if (!issueType) continue
      const taskChapterId = task?.chapter_id ?? task?.chapterId ?? null
      const taskChapterNo = Number(task?.chapter_no ?? task?.chapterNo ?? 0)
      const chapter = findChapter(args.chapters, { chapterId: taskChapterId, chapterNo: taskChapterNo })
      if (!chapter) continue
      const chapterNo = Number(chapter?.chapter_no ?? chapter?.chapterNo ?? taskChapterNo)
      const taskResolvedAt = Date.parse(text(task?.resolved_at || task?.updated_at || task?.created_at))
      const resolvedAfter = Number.isFinite(taskResolvedAt) ? Math.max(repairTime, taskResolvedAt) : repairTime
      const latestQuality = latestQualityReviewForChapter(args.reviews, chapter, chapterNo)
      if (!qualityReviewPassed(latestQuality) || recordTime(latestQuality || {}) <= resolvedAfter) continue
      for (const resolvedIssueType of resolvedBatchRiskIssueTypes(issueType)) {
        for (const key of batchRiskIssueKeys({
          chapterId: chapter?.id ?? chapter?.chapter_id ?? taskChapterId,
          chapterNo,
        }, resolvedIssueType)) {
          resolvedKeys.add(key)
        }
      }
    }
  }

  return resolvedKeys
}

function buildBatchRiskRadar(args: {
  items: AutoCreationBatchReviewItem[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  resolvedIssueKeys?: Set<string>
  nextBatchBrief?: AnyRecord | null
}): AutoCreationBatchRiskRadar {
  const successfulItems = args.items.filter(item => item.status === 'success')
  const qualityScores = successfulItems
    .map(item => {
      const chapter = findChapter(args.chapters, item)
      const qualityReview = chapter ? latestQualityReviewForChapter(args.reviews, chapter, item.chapterNo) : null
      const quality = qualityPayload(qualityReview)
      return numberValue(quality?.score ?? quality?.overall_score ?? quality?.quality_score ?? item.score)
    })
    .filter((score): score is number => score !== null)
  const averageQualityScore = qualityScores.length
    ? Math.round(qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length)
    : null
  const lowQualityCount = qualityScores.filter(score => score < BATCH_DELIVERY_QUALITY_THRESHOLD).length

  let coreRiskTotal = 0
  let payoffDebtTotal = 0
  let storylineRiskTotal = 0
  let readabilityRiskTotal = 0
  let batchPlanRiskTotal = 0
  const repairTasks: AnyRecord[] = []

  for (const item of successfulItems) {
    const chapter = findChapter(args.chapters, item)
    if (!chapter) continue
    const coreReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'chapter_core_drift')
    const payoffReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_payoff_sync')
    const storylineReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'storyline_sync')
    const readabilityReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'readability_review')
    const qualityReview = latestQualityReviewForChapter(args.reviews, chapter, item.chapterNo)
    const quality = qualityPayload(qualityReview)
    const qualityScore = numberValue(quality?.score ?? quality?.overall_score ?? quality?.quality_score ?? item.score)
    const coreCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'core_drift') ? 0 : coreRiskCount(coreReview)
    const payoffCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'reader_payoff_debt') ? 0 : payoffDebtCount(payoffReview)
    const storylineCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'storyline_sync_risk') ? 0 : storylineRiskCount(storylineReview)
    const readabilityCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'readability_risk') ? 0 : readabilityRiskCount(readabilityReview)
    const batchPlanCount = batchBriefAppliesToItem(args.nextBatchBrief, item) && !batchRiskIssueResolved(args.resolvedIssueKeys, item, 'batch_brief_mismatch')
      ? coreCount + payoffCount + storylineCount
      : 0
    const lowQuality = qualityScore !== null && qualityScore < BATCH_DELIVERY_QUALITY_THRESHOLD

    coreRiskTotal += coreCount
    payoffDebtTotal += payoffCount
    storylineRiskTotal += storylineCount
    readabilityRiskTotal += readabilityCount
    batchPlanRiskTotal += batchPlanCount

    if (lowQuality) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'low_quality_score',
        severity: qualityScore !== null && qualityScore < 65 ? 'high' : 'medium',
        message: `批次质检分 ${qualityScore}，低于交稿阈值 78。`,
        action: '生成编辑报告并重修本章节奏、冲突推进、爽点回报和章末钩子。',
        metrics: { quality_score: qualityScore },
      }))
    }
    if (coreCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'core_drift',
        severity: coreCount >= 2 ? 'high' : 'medium',
        message: `发现 ${coreCount} 项核心偏移风险，本章可能偏离读者承诺或主线推进。`,
        action: '对照章节任务书重修核心冲突、主线推进和章末钩子，避免长篇核心漂移。',
        metrics: { core_risk_count: coreCount },
      }))
    }
    if (payoffCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'reader_payoff_debt',
        severity: payoffCount >= 2 ? 'high' : 'medium',
        message: `累计 ${payoffCount} 项读者回报欠账，承诺的爽点或信息回报未兑现。`,
        action: '补写本章应交付的爽点、信息增量或情绪回报，并更新回报债务。',
        metrics: { payoff_debt_count: payoffCount },
      }))
    }
    if (storylineCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'storyline_sync_risk',
        severity: storylineCount >= 2 ? 'high' : 'medium',
        message: `剧情线漏推/误触 ${storylineCount} 项，可能影响后续连续生产。`,
        action: '修正本章剧情线推进、禁揭内容和伏笔回收，复查故事状态同步。',
        metrics: { storyline_risk_count: storylineCount },
      }))
    }
    if (readabilityCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'readability_risk',
        severity: readabilityCount >= 2 ? 'high' : 'medium',
        message: `可读性或网感出戏风险 ${readabilityCount} 项。`,
        action: '重修段落密度、对话节奏、吐槽强度和情绪场景的网感克制。',
        metrics: { readability_risk_count: readabilityCount },
      }))
    }
    if (batchPlanCount > 0) {
      const batchPlanContext = buildBatchPlanContext(args.nextBatchBrief, item)
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'batch_brief_mismatch',
        severity: batchPlanCount >= 2 ? 'high' : 'medium',
        message: `本章有 ${batchPlanCount} 项批次任务书兑现风险，可能影响本批连载计划。`,
        action: '对照下一批任务书重修本章职责、读者回报、主线焦点和禁抢跑边界，再重新复盘交稿。',
        metrics: { batch_plan_risk_count: batchPlanCount },
        batchPlanContext,
        batchPlanReview: buildBatchPlanReview({ batchPlanContext, coreReview, payoffReview, storylineReview }),
      }))
    }
  }

  const signals: AutoCreationBatchRiskSignal[] = [
    {
      key: 'quality',
      label: '质检均分',
      status: lowQualityCount > 0 || averageQualityScore !== null && averageQualityScore < 82 ? 'warn' : 'ok',
      detail: averageQualityScore === null
        ? '暂无批次质检分'
        : `均分 ${averageQualityScore}${lowQualityCount > 0 ? `，低分 ${lowQualityCount} 章` : ''}`,
    },
    {
      key: 'core',
      label: '核心偏移',
      status: coreRiskTotal > 0 ? 'warn' : 'ok',
      detail: coreRiskTotal > 0 ? `发现 ${coreRiskTotal} 项核心偏移风险` : '核心守恒正常',
    },
    {
      key: 'payoff',
      label: '回报欠账',
      status: payoffDebtTotal > 0 ? 'warn' : 'ok',
      detail: payoffDebtTotal > 0 ? `累计 ${payoffDebtTotal} 项读者回报欠账` : '读者回报已兑现',
    },
    {
      key: 'storyline',
      label: '剧情线',
      status: storylineRiskTotal > 0 ? 'warn' : 'ok',
      detail: storylineRiskTotal > 0 ? `剧情线漏推/误触 ${storylineRiskTotal} 项` : '剧情线推进正常',
    },
    {
      key: 'readability',
      label: '可读性',
      status: readabilityRiskTotal > 0 ? 'warn' : 'ok',
      detail: readabilityRiskTotal > 0 ? `可读性/出戏风险 ${readabilityRiskTotal} 项` : '可读性风险可控',
    },
  ]
  if (batchBriefVisible(args.nextBatchBrief)) {
    signals.push({
      key: 'batch_plan',
      label: '连载计划',
      status: batchPlanRiskTotal > 0 ? 'warn' : 'ok',
      detail: batchPlanRiskTotal > 0 ? `连载计划兑现风险 ${batchPlanRiskTotal} 项` : '本批连载计划无明显漏项',
    })
  }
  const status: AutoCreationBatchRiskStatus = signals.some(signal => signal.status === 'warn') ? 'warn' : 'ok'

  return {
    status,
    averageQualityScore,
    lowQualityCount,
    coreRiskCount: coreRiskTotal,
    payoffDebtCount: payoffDebtTotal,
    storylineRiskCount: storylineRiskTotal,
    readabilityRiskCount: readabilityRiskTotal,
    batchPlanRiskCount: batchPlanRiskTotal,
    signals,
    repairTasks: repairTasks.slice(0, 40),
  }
}

function latestLongformCreationReport(reviews: AnyRecord[]) {
  const review = reviews
    .filter(item => text(item?.review_type) === 'longform_creation_diagnosis')
    .sort((a, b) => recordTime(b) - recordTime(a))[0]
  const payload = parsePayload(review?.payload) || {}
  return payload.report || payload.result?.report || payload
}

const COMPASS_AXIS_LABELS: Record<AutoCreationLongformCompassAxis['key'], string> = {
  reader_promise: '读者承诺',
  protagonist_drive: '主角长期欲望',
  core_conflict: '核心矛盾',
  world_hook: '世界奇点',
  innovation_hook: '创新卖点',
  payoff_loop: '长期爽点循环',
  ending_direction: '结局方向',
}

function compassAxis(
  key: AutoCreationLongformCompassAxis['key'],
  value: any,
  locked = true,
): AutoCreationLongformCompassAxis | null {
  const normalized = text(value)
  if (!normalized) return null
  return {
    key,
    label: COMPASS_AXIS_LABELS[key],
    value: normalized,
    locked,
  }
}

function compactList(values: any[], limit: number) {
  return Array.from(new Set(values.map(item => text(item)).filter(Boolean))).slice(0, limit)
}

function buildLongformCompass(planning: PlanningWorkspaceModel, reviews: AnyRecord[]): AutoCreationLongformCompass {
  const report = latestLongformCreationReport(reviews)
  const reviewCompass = report?.compass || report?.longform_compass || {}
  const mainline = planning.mainline
  const readerPromise = firstText(reviewCompass.reader_promise, reviewCompass.readerPromise, mainline.readerPromise)
  const coreConflict = firstText(reviewCompass.core_conflict, reviewCompass.coreConflict, mainline.currentStageConflict)
  const innovationHook = firstText(reviewCompass.innovation_hook, reviewCompass.innovationHook, mainline.readerPromise)
  const payoffLoop = firstText(reviewCompass.payoff_loop, reviewCompass.payoffLoop, mainline.payoffModel)
  const endingDirection = firstText(reviewCompass.ending_direction, reviewCompass.endingDirection, mainline.currentVolumeGoal)
  const axes = [
    compassAxis('reader_promise', readerPromise),
    compassAxis('protagonist_drive', firstText(reviewCompass.protagonist_drive, reviewCompass.protagonistDrive)),
    compassAxis('core_conflict', coreConflict),
    compassAxis('world_hook', firstText(reviewCompass.world_hook, reviewCompass.worldHook)),
    compassAxis('innovation_hook', innovationHook),
    compassAxis('payoff_loop', payoffLoop),
    compassAxis('ending_direction', endingDirection),
  ].filter((item): item is AutoCreationLongformCompassAxis => Boolean(item))
  const immutableRules = compactList([
    ...arrayValue(reviewCompass.immutable_rules),
    ...arrayValue(reviewCompass.immutableRules),
    readerPromise ? `读者承诺不可漂移：${readerPromise}` : '',
    coreConflict ? `核心矛盾不可绕开：${coreConflict}` : '',
    payoffLoop ? `长期爽点循环必须可感知：${payoffLoop}` : '',
  ], 5)
  const flexibleZones = compactList([
    ...arrayValue(reviewCompass.flexible_zones),
    ...arrayValue(reviewCompass.flexibleZones),
    '副本、支线和新资产可以调整，但必须服务当前卷目标。',
    '角色出场顺序和场景形态可调整，但不能改主角长期欲望。',
  ], 5)
  const missing = [
    !readerPromise ? '读者承诺' : '',
    !coreConflict ? '核心矛盾' : '',
    !payoffLoop ? '长期爽点循环' : '',
  ].filter(Boolean)
  const status: AutoCreationLongformCompass['status'] = missing.length ? 'needs_attention' : 'ready'

  return {
    status,
    label: status === 'ready' ? '罗盘就绪' : `缺 ${missing.join('、')}`,
    summary: status === 'ready'
      ? '这组长期约束会约束章节任务书、安全连写和交稿复盘，避免千万字生产时核心漂移。'
      : '长篇自动生产前，先补齐读者承诺、核心矛盾和长期爽点循环。',
    sourceLabel: Object.keys(reviewCompass).length ? '来自创作诊断' : '来自当前规划',
    readerPromise,
    axes,
    immutableRules,
    flexibleZones,
  }
}

function contractPipelineStatus(contract: AutoCreationContractItem[]): AutoCreationPipelineStatus {
  if (contract.some(item => item.status === 'block')) return 'blocked'
  if (contract.some(item => item.status === 'warn')) return 'warning'
  return 'done'
}

function contractActionKey(key: AutoCreationContractItem['key'], status: AutoCreationContractStatus, fallback?: any): AutoCreationDirectorActionKey {
  if (fallback) return fallback as AutoCreationDirectorActionKey
  if (key === 'core') return 'open_story_assets'
  if (key === 'story') return status === 'ok' ? 'enter_chapter_writing' : 'update_rolling_plan'
  if (key === 'innovation') return status === 'ok' ? 'open_story_assets' : 'topic_validation'
  return status === 'ok' ? 'enter_chapter_writing' : 'run_first30_retention'
}

function normalizeContractStatus(value: any): AutoCreationContractStatus {
  const status = text(value).toLowerCase()
  if (status === 'block' || status === 'blocked' || status === 'fail') return 'block'
  if (status === 'warn' || status === 'warning' || status === 'needs_repair') return 'warn'
  return 'ok'
}

function creationContractFromReview(reviews: AnyRecord[]): { score: number | null; contract: AutoCreationContractItem[] | null } {
  const report = latestLongformCreationReport(reviews)
  const dimensions = arrayValue(report?.dimensions)
  if (!dimensions.length) return { score: null, contract: null }
  const scoreValue = Number(report?.score)
  return {
    score: Number.isFinite(scoreValue) ? scoreValue : null,
    contract: dimensions
      .filter(item => ['core', 'story', 'innovation', 'reader_pull'].includes(text(item?.key)))
      .map(item => {
        const key = text(item?.key) as AutoCreationContractItem['key']
        const status = normalizeContractStatus(item?.status)
        return {
          key,
          label: text(item?.label, key === 'core' ? '核心不偏' : key === 'story' ? '故事强度' : key === 'innovation' ? '创新差异' : '读者吸引'),
          status,
          detail: text(item?.detail || arrayValue(item?.blockers)[0] || arrayValue(item?.warnings)[0], '后端诊断未给出说明。'),
          evidence: arrayValue(item?.evidence).map(entry => text(entry)).filter(Boolean),
          actionKey: contractActionKey(key, status, item?.actionKey || item?.action_key),
        }
      }),
  }
}

function buildLongformCreationContract(planning: PlanningWorkspaceModel, writing: WritingCockpitModel): AutoCreationContractItem[] {
  const mainline = planning.mainline
  const future10Ready = planning.topStatus.future10Coverage.ready
  const retention = planning.first30Retention
  const readerScore = Number(retention.score || 0)
  const sceneCardCount = Number(writing.chapterPlanningDesk.sceneCards?.length || 0)
  const coreBlockers = [
    !text(mainline.readerPromise) ? '缺读者承诺' : '',
    !text(mainline.currentVolumeGoal) ? '缺当前卷目标' : '',
    mainline.currentChapterServesVolume === false ? '当前章未服务卷目标' : '',
  ].filter(Boolean)
  const storyWarnings = [
    !future10Ready ? `未来10章规划 ${planning.topStatus.future10Coverage.label}` : '',
    planning.storylineBoard.status !== 'ready' ? '剧情线未校准' : '',
    !text(mainline.currentStageConflict) ? '缺当前阶段冲突' : '',
  ].filter(Boolean)
  const innovationWarnings = [
    !text(mainline.payoffModel) ? '缺爽点模型' : '',
    !text(mainline.readerPromise) ? '缺差异化承诺' : '',
    !text(mainline.currentStageConflict) ? '缺反差冲突' : '',
  ].filter(Boolean)
  const readerBlockers = [
    retention.status === 'blocked' || readerScore > 0 && readerScore < 65 ? '前30章留存高危' : '',
    retention.promiseReady === false ? '读者承诺未被诊断确认' : '',
  ].filter(Boolean)
  const readerWarnings = [
    retention.status === 'missing' ? '未运行前30章诊断' : '',
    retention.status === 'stale' ? '前30章需重新诊断' : '',
    retention.status === 'needs_repair' ? '前30章需要修复' : '',
    readerScore >= 65 && readerScore < 80 ? '前30章吸引力偏弱' : '',
  ].filter(Boolean)

  return [
    {
      key: 'core',
      label: '核心不偏',
      status: coreBlockers.length > 0 ? 'block' : mainline.risks.length > 0 ? 'warn' : 'ok',
      detail: coreBlockers[0] || mainline.risks[0] || '读者承诺、卷目标和当前章服务关系明确。',
      evidence: [mainline.readerPromise, mainline.currentVolumeGoal, mainline.nextTurn].map(item => text(item)).filter(Boolean).slice(0, 3),
      actionKey: coreBlockers.length > 0 ? 'open_story_assets' : 'open_outline_tree',
    },
    {
      key: 'story',
      label: '故事强度',
      status: storyWarnings.length > 0 ? 'warn' : 'ok',
      detail: storyWarnings[0] || '未来章节、剧情线和阶段冲突能支撑连续推进。',
      evidence: [
        `未来10章 ${planning.topStatus.future10Coverage.label}`,
        `剧情线 ${planning.storylineBoard.total}`,
        sceneCardCount > 0 ? `本章场景卡 ${sceneCardCount}` : '',
      ].filter(Boolean),
      actionKey: storyWarnings.length > 0 ? 'update_rolling_plan' : 'enter_chapter_writing',
    },
    {
      key: 'innovation',
      label: '创新差异',
      status: innovationWarnings.length > 0 ? 'warn' : 'ok',
      detail: innovationWarnings[0] || '题材承诺、爽点模型和冲突反差具备可传播差异。',
      evidence: [mainline.readerPromise, mainline.payoffModel, mainline.currentStageConflict].map(item => text(item)).filter(Boolean).slice(0, 3),
      actionKey: innovationWarnings.length > 0 ? 'topic_validation' : 'open_story_assets',
    },
    {
      key: 'reader_pull',
      label: '读者吸引',
      status: readerBlockers.length > 0 ? 'block' : readerWarnings.length > 0 ? 'warn' : 'ok',
      detail: readerBlockers[0] || readerWarnings[0] || '前30章读者承诺、钩子和爽点密度处于可生产状态。',
      evidence: [
        retention.score !== null ? `前30章 ${retention.score}分` : '',
        retention.promiseReady ? '承诺清晰' : '',
        retention.summary,
      ].map(item => text(item)).filter(Boolean).slice(0, 3),
      actionKey: readerBlockers.length > 0 || readerWarnings.length > 0 ? retention.actionKey : 'enter_chapter_writing',
    },
  ]
}

function capacityTargetBand(targetWords: number) {
  if (targetWords >= 8000000) return '1000万字级'
  if (targetWords >= 3000000) return '300万字级'
  if (targetWords >= 1000000) return '百万字级'
  return '长篇'
}

function signalStatusFromScore(score: number, warnAt = 80, blockAt = 55): AutoCreationBatchGuardrailSignalStatus {
  if (score < blockAt) return 'block'
  if (score < warnAt) return 'warn'
  return 'ok'
}

function capacityFuelLabel(key: AutoCreationLongformCapacitySignal['key']) {
  if (key === 'future_reserve') return '补未来100章'
  if (key === 'storyline_pool') return '补剧情线池'
  if (key === 'volume_runway') return '延长当前卷跑道'
  return '校准节奏耐力'
}

function buildLongformCapacity(planning: PlanningWorkspaceModel): AutoCreationLongformCapacity {
  const targetWords = Math.max(0, Number(planning.topStatus.targetWords || 0))
  const writtenWords = Math.max(0, Number(planning.topStatus.writtenWords || 0))
  const remainingWords = Math.max(0, targetWords - writtenWords)
  const estimatedRemainingChapters = remainingWords > 0 ? Math.ceil(remainingWords / 3000) : 0
  const targetBandLabel = capacityTargetBand(targetWords)
  const future100 = planning.topStatus.future100Coverage
  const future100Planned = Number(future100.planned || 0)
  const storylineTotal = Number(planning.storylineBoard.total || 0)
  const targetStorylineCount = targetWords >= 8000000 ? 8 : targetWords >= 3000000 ? 6 : 4
  const plannedChapterCount = Number(planning.volumeBeatBudget?.plannedChapterCount || 0)
  const targetVolumeRunway = targetWords >= 8000000 ? 50 : targetWords >= 3000000 ? 40 : 25
  const rhythmScore = Number(planning.longformRhythm?.score || 0)
  const beatScore = Number(planning.volumeBeatBudget?.score || 0)

  const futureScore = future100.ready
    ? 92
    : future100Planned >= 60
      ? 76
      : future100Planned >= 30
        ? 62
        : 45
  const storylineScore = storylineTotal <= 0
    ? 45
    : storylineTotal >= targetStorylineCount
      ? 88
      : Math.max(58, Math.round((storylineTotal / targetStorylineCount) * 82))
  const volumeRunwayScore = plannedChapterCount >= targetVolumeRunway
    ? 88
    : plannedChapterCount >= Math.ceil(targetVolumeRunway * 0.35)
      ? Math.max(58, Math.round((plannedChapterCount / targetVolumeRunway) * 82))
      : 48
  const staminaScore = Math.round(((rhythmScore || 70) + (beatScore || 70)) / 2)

  const signals: AutoCreationLongformCapacitySignal[] = [
    {
      key: 'future_reserve',
      label: '未来储备',
      status: future100.ready ? 'ok' : future100Planned >= 10 ? 'warn' : 'block',
      score: futureScore,
      detail: future100.ready ? `未来100章覆盖 ${future100.label}。` : `未来100章只有 ${future100.label}，超长篇只能小步滚动。`,
      actionKey: 'future100_generate',
    },
    {
      key: 'storyline_pool',
      label: '剧情线池',
      status: signalStatusFromScore(storylineScore, 84, 50),
      score: storylineScore,
      detail: `当前 ${storylineTotal} 条剧情线，${targetBandLabel} 建议至少 ${targetStorylineCount} 条可轮转长线。`,
      actionKey: 'open_story_assets',
    },
    {
      key: 'volume_runway',
      label: '当前卷跑道',
      status: signalStatusFromScore(volumeRunwayScore, 84, 55),
      score: volumeRunwayScore,
      detail: `当前卷已规划 ${plannedChapterCount} 章，建议保持 ${targetVolumeRunway} 章以上的卷内冲突跑道。`,
      actionKey: 'complete_volume_plan',
    },
    {
      key: 'production_stamina',
      label: '节奏耐力',
      status: signalStatusFromScore(staminaScore, 80, 58),
      score: staminaScore,
      detail: `长篇节奏 ${rhythmScore || '-'}，爆点预算 ${beatScore || '-'}，用于判断连续生产是否会疲软。`,
      actionKey: 'longform_pressure',
    },
  ]
  const score = Math.round(signals.reduce((sum, item) => sum + item.score, 0) / Math.max(1, signals.length))
  const status: AutoCreationLongformCapacityStatus = signals.some(item => item.status === 'block')
    ? 'blocked'
    : signals.some(item => item.status === 'warn') || score < 80
      ? 'caution'
      : 'ready'
  const firstRisk = signals.find(item => item.status !== 'ok')
  const fuelQueue = signals
    .filter(item => item.status !== 'ok')
    .map(item => ({
      key: item.key,
      label: capacityFuelLabel(item.key),
      status: item.status,
      detail: item.detail,
      actionKey: item.actionKey,
      actionLabel: PLANNING_ACTION_LABELS[item.actionKey] || item.actionKey,
      modelCall: MODEL_CALL_ACTIONS.has(item.actionKey),
    }))

  return {
    status,
    score,
    label: status === 'ready' ? `产能健康 ${score}` : status === 'caution' ? `产能偏薄 ${score}` : `产能阻塞 ${score}`,
    summary: status === 'ready'
      ? `${targetBandLabel} 目标仍有 ${estimatedRemainingChapters} 章左右，当前储备可以进入安全连写。`
      : `${targetBandLabel} 目标仍有 ${estimatedRemainingChapters} 章左右，${firstRisk?.label || '长线储备'}偏薄，建议先补长线资产再扩大批量。`,
    targetBandLabel,
    remainingWords,
    estimatedRemainingChapters,
    recommendedActionKey: firstRisk?.actionKey || 'longform_pressure',
    signals,
    fuelQueue,
  }
}

function signal(label: string, status: AutoCreationBatchGuardrailSignalStatus, detail: string): AutoCreationBatchGuardrailSignal {
  return { label, status, detail }
}

function batchPipelineStatus(status: AutoCreationBatchGuardrailStatus): AutoCreationPipelineStatus {
  if (status === 'ready') return 'active'
  if (status === 'caution') return 'warning'
  return 'blocked'
}

function future100ReserveStatus(planning: PlanningWorkspaceModel): AutoCreationBatchGuardrailSignalStatus {
  const coverage = planning.topStatus.future100Coverage
  if (coverage.ready) return 'ok'
  if (Number(coverage.planned || 0) >= 10) return 'warn'
  return 'block'
}

function emptyNextBatchBrief(): AutoCreationNextBatchBrief {
  return {
    visible: false,
    chapterRangeLabel: '',
    batchGoal: '',
    readerPayoffPlan: '',
    mainlineFocus: '',
    forbiddenBoundary: '',
    chapters: [],
  }
}

function normalizeRouteChapter(record: AnyRecord): AutoCreationNextBatchBriefChapter | null {
  const chapterNo = Number(record?.chapterNo ?? record?.chapter_no ?? 0)
  if (!chapterNo) return null
  return {
    chapterNo,
    title: firstText(record?.title, `第${chapterNo}章`),
    chapterTask: firstText(record?.chapterTask, record?.chapter_task, record?.task, record?.chapterGoal, record?.chapter_goal),
    conflict: firstText(record?.conflict, record?.raw_payload?.conflict),
    endingHook: firstText(record?.endingHook, record?.ending_hook, record?.hook),
    mainlineProgress: firstText(record?.mainlineProgress, record?.mainline_progress, record?.raw_payload?.mainline_progress),
  }
}

function mergeRouteChapterPlan(
  routeChapter: AutoCreationNextBatchBriefChapter,
  fallback: AutoCreationNextBatchBriefChapter | null,
): AutoCreationNextBatchBriefChapter {
  if (!fallback) return routeChapter
  return {
    chapterNo: routeChapter.chapterNo || fallback.chapterNo,
    title: routeChapter.title || fallback.title,
    chapterTask: routeChapter.chapterTask || fallback.chapterTask,
    conflict: routeChapter.conflict || fallback.conflict,
    endingHook: routeChapter.endingHook || fallback.endingHook,
    mainlineProgress: routeChapter.mainlineProgress || fallback.mainlineProgress,
  }
}

function chapterRangeLabel(chapters: AutoCreationNextBatchBriefChapter[]) {
  if (!chapters.length) return ''
  const first = chapters[0].chapterNo
  const last = chapters[chapters.length - 1].chapterNo
  return first === last ? `第${first}章` : `第${first}-${last}章`
}

function buildNextBatchBrief(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  safeChapterCount: number
}): AutoCreationNextBatchBrief {
  if (args.safeChapterCount <= 0) return emptyNextBatchBrief()
  const targetNo = Number(args.writing.nextChapter?.chapterNo || 0)
  if (!targetNo) return emptyNextBatchBrief()
  const routeChapters = arrayValue(args.planning.futureRoute)
    .map(normalizeRouteChapter)
    .filter((item): item is AutoCreationNextBatchBriefChapter => Boolean(item))
    .filter(item => item.chapterNo >= targetNo)
    .sort((a, b) => a.chapterNo - b.chapterNo)
    .slice(0, args.safeChapterCount)
  const existingNos = new Set(routeChapters.map(item => item.chapterNo))
  const targetFallback = normalizeRouteChapter({
    chapterNo: targetNo,
    title: args.writing.nextChapter?.title,
    chapterTask: args.writing.nextChapter?.chapterGoal,
    conflict: args.writing.nextChapter?.conflict,
    endingHook: args.writing.nextChapter?.endingHook,
    mainlineProgress: args.planning.mainline.nextTurn,
  })
  if (!existingNos.has(targetNo)) {
    if (targetFallback) routeChapters.unshift(targetFallback)
  } else if (targetFallback) {
    const targetIndex = routeChapters.findIndex(item => item.chapterNo === targetNo)
    if (targetIndex >= 0) {
      routeChapters[targetIndex] = mergeRouteChapterPlan(routeChapters[targetIndex], targetFallback)
    }
  }
  const chapters = routeChapters.slice(0, args.safeChapterCount)
  if (!chapters.length) return emptyNextBatchBrief()
  const mainlineProgress = chapters.map(item => item.mainlineProgress).filter(Boolean)
  const conflicts = chapters.map(item => item.conflict).filter(Boolean)

  return {
    visible: true,
    chapterRangeLabel: chapterRangeLabel(chapters),
    batchGoal: [
      args.planning.mainline.currentVolumeGoal ? `卷目标：${args.planning.mainline.currentVolumeGoal}` : '',
      chapters[chapters.length - 1]?.mainlineProgress ? `本批推进到：${chapters[chapters.length - 1].mainlineProgress}` : '',
    ].filter(Boolean).join('；') || '保持当前卷目标连续推进。',
    readerPayoffPlan: [
      args.planning.mainline.payoffModel ? `爽点模型：${args.planning.mainline.payoffModel}` : '',
      chapters.map(item => item.endingHook).filter(Boolean).slice(0, 3).join(' / '),
    ].filter(Boolean).join('；') || '每章保留明确读者回报和章末钩子。',
    mainlineFocus: mainlineProgress.join(' -> ') || args.planning.mainline.currentStageConflict || '保持主线推进不偏移。',
    forbiddenBoundary: [
      '不得跳过单章质检、修订和故事状态回填。',
      args.planning.mainline.risks[0] ? `避开风险：${args.planning.mainline.risks[0]}` : '',
      conflicts.length ? `冲突必须逐章落地：${conflicts.slice(0, 3).join(' / ')}` : '',
    ].filter(Boolean).join('；'),
    chapters,
  }
}

function chapterNoLabels(chapters: AutoCreationNextBatchBriefChapter[]) {
  return chapters.map(item => `第${item.chapterNo}章`).join('、')
}

function buildNextBatchBriefSignal(
  nextBatchBrief: AutoCreationNextBatchBrief,
  expectedChapterCount: number,
): AutoCreationBatchGuardrailSignal {
  if (expectedChapterCount <= 0) {
    return signal('批次任务书', 'ok', '当前没有可放行的安全连写批次。')
  }
  if (!nextBatchBrief.visible || nextBatchBrief.chapters.length === 0) {
    return signal('批次任务书', 'block', '缺少下一批任务书，无法判断连续生成会推进什么。')
  }

  const missingCoverage = expectedChapterCount > 1 && nextBatchBrief.chapters.length < expectedChapterCount
    ? [`只覆盖 ${nextBatchBrief.chapters.length}/${expectedChapterCount} 章`]
    : []
  const missingTask = nextBatchBrief.chapters.filter(item => !text(item.chapterTask))
  const missingConflict = nextBatchBrief.chapters.filter(item => !text(item.conflict))
  const missingHook = nextBatchBrief.chapters.filter(item => !text(item.endingHook))
  const missingMainline = nextBatchBrief.chapters.filter(item => !text(item.mainlineProgress))
  const issues = [
    ...missingCoverage,
    missingTask.length ? `缺逐章职责：${chapterNoLabels(missingTask)}` : '',
    missingConflict.length ? `缺冲突落点：${chapterNoLabels(missingConflict)}` : '',
    missingHook.length ? `缺章末钩子：${chapterNoLabels(missingHook)}` : '',
    missingMainline.length ? `缺主线推进：${chapterNoLabels(missingMainline)}` : '',
  ].filter(Boolean)

  if (!issues.length) {
    return signal(
      '批次任务书',
      'ok',
      `下一批任务书覆盖 ${nextBatchBrief.chapterRangeLabel}，本批目标、读者回报、主线推进和章末钩子可检查。`,
    )
  }

  const firstChapter = nextBatchBrief.chapters[0]
  const firstChapterUsable = Boolean(
    text(firstChapter?.chapterTask)
    && text(firstChapter?.conflict)
    && text(firstChapter?.endingHook)
    && text(firstChapter?.mainlineProgress),
  )
  const status: AutoCreationBatchGuardrailSignalStatus = firstChapterUsable ? 'warn' : 'block'
  const detail = status === 'warn'
    ? `下一批任务书还不适合多章连写，${issues.slice(0, 3).join('；')}。本轮先降为单章推进。`
    : `下一批任务书不足以开写，${issues.slice(0, 3).join('；')}。先补章节任务书或滚动规划。`
  return signal('批次任务书', status, detail)
}

function buildBatchGuardrail(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  activeTasks: AnyRecord[]
  hasBlockingPlan: boolean
  hasModel: boolean
  mainAction: AutoCreationDirectorAction
  longformCapacity: AutoCreationLongformCapacity
}): AutoCreationBatchGuardrail {
  const planning = args.planning
  const writing = args.writing
  const future10 = planning.topStatus.future10Coverage
  const future100 = planning.topStatus.future100Coverage
  const planningDesk = writing.chapterPlanningDesk
  const acceptance = writing.chapterAcceptanceDesk
  const running = hasRunningTasks(args.activeTasks)
  const retentionActionNeeded = retentionNeedsAction(planning)
  const storylineActionNeeded = storylineNeedsAction(planning)
  const volumeBeatActionNeeded = volumeBeatNeedsAction(planning)
  const rhythmActionNeeded = rhythmNeedsAction(planning)
  const future100Status = future100ReserveStatus(planning)
  const capacityStatus: AutoCreationBatchGuardrailSignalStatus = args.longformCapacity.status === 'ready'
    ? 'ok'
    : args.longformCapacity.status === 'blocked'
      ? 'block'
      : 'warn'
  const hasScenePlan = planningDesk.scenePlanStatus === 'ready' || arrayValue(planningDesk.sceneCards).length > 0
  const currentChapterDelivered = !Boolean(acceptance.visible)
  const chapterPlanIssue = text(arrayValue(planningDesk.reasons)[0], '当前章任务书或场景卡未就绪。')
  const governanceBlocked = args.hasBlockingPlan
    || retentionActionNeeded
    || storylineActionNeeded
    || volumeBeatActionNeeded
    || rhythmActionNeeded
  const chapterPlanReady = planningDesk.readiness === 'ready' && hasScenePlan

  const guardrails = [
    signal(
      '模型与任务队列',
      !args.hasModel || running ? 'block' : 'ok',
      running
        ? `${args.activeTasks.length} 个后台任务运行中，先等任务结束。`
        : args.hasModel ? '已选择可用模型，且没有运行中的生产任务。' : '未选择可用模型。',
    ),
    signal(
      '长线治理',
      governanceBlocked ? 'block' : 'ok',
      governanceBlocked ? args.mainAction.description : '创作契约、留存、剧情线、爆点预算和长篇节奏均可进入生产。',
    ),
    signal(
      '未来10章规划',
      future10.ready ? 'ok' : 'block',
      future10.ready ? `未来10章覆盖 ${future10.label}。` : `未来10章仅覆盖 ${future10.label}，连续生产容易断线。`,
    ),
    signal(
      '未来100章储备',
      future100Status,
      future100.ready ? `未来100章覆盖 ${future100.label}。` : `未来100章覆盖 ${future100.label}，只适合小步推进。`,
    ),
    signal(
      '百万字产能',
      capacityStatus,
      args.longformCapacity.summary,
    ),
    signal(
      '章节任务书/场景卡',
      chapterPlanReady ? 'ok' : 'block',
      chapterPlanReady ? '当前章任务书和场景卡已就绪。' : chapterPlanIssue,
    ),
    signal(
      '当前章交稿',
      currentChapterDelivered ? 'ok' : 'block',
      currentChapterDelivered ? '当前没有未处理的交稿门禁。' : text(acceptance.statusLabel, '当前章仍需质检、修订或状态同步。'),
    ),
  ]

  const preliminaryBlocking = guardrails.find(item => item.status === 'block')
  const preliminaryWarning = guardrails.find(item => item.status === 'warn')
  const preliminaryStatus: AutoCreationBatchGuardrailStatus = preliminaryBlocking ? 'blocked' : preliminaryWarning ? 'caution' : 'ready'
  const preliminarySafeChapterCount = preliminaryStatus === 'blocked'
    ? 0
    : preliminaryStatus === 'caution'
      ? 1
      : Math.max(1, Math.min(3, Number(future10.planned || 3), Number(planning.volumeBeatBudget?.plannedChapterCount || 3)))
  const preliminaryNextBatchBrief = buildNextBatchBrief({ planning, writing, safeChapterCount: preliminarySafeChapterCount })
  const batchBriefSignal = buildNextBatchBriefSignal(preliminaryNextBatchBrief, preliminarySafeChapterCount)
  guardrails.push(batchBriefSignal)
  guardrails.push(signal('每章交稿回填', 'ok', '连续生产仍按单章质检、修订、故事状态同步和资产发现逐章回填。'))

  const blocking = guardrails.find(item => item.status === 'block')
  const warning = guardrails.find(item => item.status === 'warn')
  const status: AutoCreationBatchGuardrailStatus = blocking ? 'blocked' : warning ? 'caution' : 'ready'
  let recommendedAction = args.mainAction

  if (blocking?.label === '批次任务书' || warning?.label === '批次任务书') {
    recommendedAction = planningAction('update_rolling_plan', blocking?.detail || warning?.detail || '先补齐下一批任务书。')
  } else if (!blocking && warning?.label === '未来100章储备') {
    recommendedAction = planningAction('future100_generate', '先补齐更长线的未来100章储备，再扩大连续生产批次。')
  } else if (!blocking && warning?.label === '百万字产能') {
    recommendedAction = planningAction(args.longformCapacity.recommendedActionKey, args.longformCapacity.summary)
  }

  const safeChapterCount = status === 'blocked'
    ? 0
    : status === 'caution'
      ? 1
      : preliminarySafeChapterCount
  const nextBatchBrief = safeChapterCount === preliminarySafeChapterCount
    ? preliminaryNextBatchBrief
    : buildNextBatchBrief({ planning, writing, safeChapterCount })

  if (status === 'ready') {
    recommendedAction = opsAction(
      'start_safe_batch_generation',
      '开始安全连写',
      `按护栏建议连续生成 ${safeChapterCount} 章；每章仍会走字数门禁、质检修订和故事状态回填。`,
    )
  }

  return {
    status,
    label: status === 'ready' ? '可小批量连写' : status === 'caution' ? '谨慎单章推进' : '暂不适合连写',
    summary: status === 'ready'
      ? `建议先小批量连续生产 ${safeChapterCount} 章，每章都经过质检、回填和差异复盘后再扩大批次。`
      : status === 'caution'
        ? warning?.label === '批次任务书'
          ? '下一批任务书还不够具体，本轮建议只推进 1 章，并先补齐后续章节职责、冲突和钩子。'
          : '长线储备存在薄弱点，本轮建议只推进 1 章，并优先处理黄色风险。'
        : blocking?.detail || '当前存在阻塞项，暂不适合连续生产。',
    safeChapterCount,
    recommendedAction,
    guardrails,
    nextBatchBrief,
  }
}

function buildBatchReviewQueue(args: {
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  storyState: AnyRecord
}): AutoCreationBatchReviewQueue {
  const { runRecords, reviews, storyState } = args
  const safeBatchRuns = runRecords
    .filter(run => text(run?.run_type) === 'batch_generate_prose')
    .map(run => ({
      run,
      input: parsePayload(run?.input_ref) || {},
      output: parsePayload(run?.output_ref) || {},
    }))
    .filter(entry => text(entry.input?.source) === 'auto_creation_safe_batch')
    .sort((a, b) => recordTime(b.run) - recordTime(a.run))

  const latest = safeBatchRuns[0]
  if (!latest) {
    return {
      visible: false,
      status: 'empty',
      label: '安全连写复盘',
      summary: '还没有安全连写批次。',
      total: 0,
      success: 0,
      failed: 0,
      delivered: 0,
      safeLimit: null,
      availableTotal: null,
      createdAt: '',
      nextAction: opsAction('open_task_center', '查看任务中心', '查看后台任务、失败记录和可恢复任务。'),
      riskRadar: buildBatchRiskRadar({ items: [], chapters: args.chapters, reviews }),
      items: [],
    }
  }

  const batchChapters = arrayValue(latest.output?.chapters)
  const items = batchChapters.map(chapter => {
    const item = {
      chapterId: chapter?.id ?? null,
      chapterNo: Number(chapter?.chapter_no || chapter?.chapterNo || 0),
      title: text(chapter?.title, '未命名章节'),
      status: text(chapter?.status) === 'failed' ? 'failed' as const : 'success' as const,
      score: Number.isFinite(Number(chapter?.score)) ? Number(chapter?.score) : null,
      wordCount: Number.isFinite(Number(chapter?.word_count ?? chapter?.wordCount)) ? Number(chapter?.word_count ?? chapter?.wordCount) : null,
      revised: Boolean(chapter?.revised),
      delivered: false,
      error: text(chapter?.error),
    }
    return {
      ...item,
      delivered: batchChapterDelivered({ item, chapters: args.chapters, reviews, storyState }),
    }
  }).filter(item => item.chapterNo > 0 || item.title)

  const failed = Number(latest.output?.failed ?? items.filter(item => item.status === 'failed').length)
  const success = Number(latest.output?.success ?? items.filter(item => item.status === 'success').length)
  const total = Number(latest.output?.total ?? items.length)
  const safeLimit = Number(latest.input?.safety_limit || 0)
  const availableTotal = Number(latest.input?.available_total || 0)
  const hasFailure = failed > 0 || text(latest.run?.status) === 'warn'
  const delivered = items.filter(item => item.status === 'success' && item.delivered).length
  const allSuccessfulChaptersDelivered = !hasFailure && items.length > 0 && items
    .filter(item => item.status === 'success')
    .every(item => item.delivered)
  const resolvedIssueKeys = buildResolvedBatchRiskIssueKeys({
    runRecords,
    batchCreatedAt: text(latest.run?.created_at),
    chapters: args.chapters,
    reviews,
  })
  const riskRadar = buildBatchRiskRadar({
    items,
    chapters: args.chapters,
    reviews,
    resolvedIssueKeys,
    nextBatchBrief: latest.input?.next_batch_brief || latest.input?.nextBatchBrief || null,
  })
  const hasDeliveredBatchRisk = allSuccessfulChaptersDelivered && riskRadar.status === 'warn'
  const status: AutoCreationBatchReviewStatus = hasFailure
    ? 'warn'
    : hasDeliveredBatchRisk
      ? 'risk'
      : allSuccessfulChaptersDelivered ? 'done' : 'ok'

  return {
    visible: true,
    status,
    label: '安全连写复盘',
    summary: hasFailure
      ? `本次安全连写 ${success}/${total} 章成功，先处理失败章节，再开启下一批。`
      : hasDeliveredBatchRisk
        ? `本次安全连写 ${delivered}/${total} 章已交付，但存在批次质量风险，先复盘修正再继续。`
      : allSuccessfulChaptersDelivered
        ? `本次安全连写 ${delivered}/${total} 章已完成交稿闭环，可以开启下一批安全连写。`
        : `本次安全连写 ${success}/${total} 章完成，下一步逐章质检、修订和状态回填。`,
    total,
    success,
    failed,
    delivered,
    safeLimit: safeLimit > 0 ? safeLimit : null,
    availableTotal: availableTotal > 0 ? availableTotal : null,
    createdAt: text(latest.run?.created_at),
    nextAction: hasFailure
      ? opsAction('open_task_center', '查看失败任务', '打开任务中心，定位失败章节和可恢复步骤。')
      : hasDeliveredBatchRisk
        ? opsAction('create_safe_batch_risk_repair', '生成批次修复任务', '把上一批的核心偏移、回报欠账、剧情线和可读性风险写入任务中心。')
      : allSuccessfulChaptersDelivered
        ? opsAction('start_safe_batch_generation', '开始下一批安全连写', '上一批已完成交稿闭环；按当前护栏继续小批量生产。')
        : planningAction('open_quality_revision', '进入质检修订，按章节质量、核心偏移、读者回报和剧情线同步逐章验收。'),
    riskRadar,
    items,
  }
}

function buildPipeline(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  activeTasks: AnyRecord[]
  hasBlockingPlan: boolean
  hasModel: boolean
  creationContract: AutoCreationContractItem[]
  longformCapacity: AutoCreationLongformCapacity
  batchGuardrail: AutoCreationBatchGuardrail
}): AutoCreationPipelineStep[] {
  const acceptance = args.writing.chapterAcceptanceDesk
  const planningDesk = args.writing.chapterPlanningDesk
  const chapter = args.writing.nextChapter
  const hasProse = Boolean(chapter?.hasProse)
  const retentionAction = retentionNeedsAction(args.planning)
  const storylineAction = storylineNeedsAction(args.planning)
  const running = hasRunningTasks(args.activeTasks)

  return [
    {
      key: 'longform_planning',
      label: '长线规划',
      status: !args.hasModel ? 'blocked' : args.hasBlockingPlan ? 'blocked' : args.planning.healthIssues.length > 0 ? 'warning' : 'done',
      detail: args.planning.topStatus.longformHealth.label,
    },
    {
      key: 'creation_contract',
      label: '创作契约',
      status: contractPipelineStatus(args.creationContract),
      detail: args.creationContract
        .filter(item => item.status !== 'ok')
        .map(item => `${item.label}：${item.detail}`)
        .slice(0, 2)
        .join('；') || '核心、故事、创新和读者吸引力达标',
    },
    {
      key: 'longform_capacity',
      label: '百万字产能',
      status: args.longformCapacity.status === 'blocked'
        ? 'blocked'
        : args.longformCapacity.status === 'caution'
          ? 'warning'
          : 'done',
      detail: args.longformCapacity.summary,
    },
    {
      key: 'volume_beat_budget',
      label: '卷级爆点预算',
      status: !args.planning.volumeBeatBudget
        ? 'pending'
        : args.planning.volumeBeatBudget.status === 'blocked'
          ? 'blocked'
          : args.planning.volumeBeatBudget.status === 'needs_attention'
            ? 'warning'
            : 'done',
      detail: args.planning.volumeBeatBudget?.summary || '等待卷级高潮和爽点预算计算',
    },
    {
      key: 'longform_rhythm',
      label: '长篇节奏',
      status: !args.planning.longformRhythm
        ? 'pending'
        : args.planning.longformRhythm.status === 'blocked'
          ? 'blocked'
          : args.planning.longformRhythm.status === 'needs_attention'
            ? 'warning'
            : 'done',
      detail: args.planning.longformRhythm?.summary || '等待长篇节奏总控计算',
    },
    {
      key: 'story_assets',
      label: '设定/剧情线',
      status: storylineAction ? 'warning' : 'done',
      detail: args.planning.storylineBoard.summary,
    },
    {
      key: 'retention_curve',
      label: '前30章留存',
      status: retentionAction ? 'warning' : 'done',
      detail: args.planning.first30Retention.summary,
    },
    {
      key: 'chapter_planning',
      label: '章节任务书',
      status: planningDesk.readiness === 'blocked'
        ? 'blocked'
        : hasProse || planningDesk.readiness === 'ready'
          ? 'done'
          : 'active',
      detail: planningDesk.statusLabel,
    },
    {
      key: 'batch_guardrail',
      label: '连续生产护栏',
      status: batchPipelineStatus(args.batchGuardrail.status),
      detail: `${args.batchGuardrail.label}，安全批次 ${args.batchGuardrail.safeChapterCount} 章`,
    },
    {
      key: 'chapter_execution',
      label: '正文生产',
      status: hasProse ? 'done' : planningDesk.readiness === 'ready' && !retentionAction && !storylineAction && !args.hasBlockingPlan ? 'active' : 'pending',
      detail: hasProse ? `${chapter?.wordCount || 0} 字` : args.writing.topStatus.nextActionLabel,
    },
    {
      key: 'quality_gate',
      label: '质检修订',
      status: acceptance.visible
        ? acceptance.acceptanceStatus === 'ready_to_accept' || acceptance.acceptanceStatus === 'delivered' ? 'done' : 'active'
        : 'pending',
      detail: acceptance.visible ? acceptance.statusLabel : '等待正文',
    },
    {
      key: 'canon_sync',
      label: '状态回填',
      status: acceptance.visible
        ? acceptance.storyStateSynced ? 'done' : acceptance.acceptanceStatus === 'needs_state_sync' ? 'active' : 'pending'
        : 'pending',
      detail: acceptance.visible ? (acceptance.storyStateSynced ? '故事状态已同步' : '等待交稿同步') : '等待正文',
    },
    {
      key: 'async_tasks',
      label: '任务队列',
      status: running ? 'active' : 'done',
      detail: running ? `${args.activeTasks.length} 个任务运行中` : '无排队任务',
    },
  ]
}

function fallbackSecondaryActions(planning: PlanningWorkspaceModel, writing: WritingCockpitModel): AutoCreationDirectorAction[] {
  const actions: AutoCreationDirectorAction[] = [
    planningAction('longform_creation_diagnosis', '按 300万-1000万字长篇目标检查核心不偏、故事强度、创新差异和读者吸引。'),
    planningAction('open_outline_tree', '查看章节、分卷和未来章节是否连续。'),
    planningAction('open_story_assets', '维护设定、剧情线和新资产候选。'),
    opsAction('open_task_center', '查看任务中心', '查看后台任务、失败记录和可恢复任务。'),
  ]
  const acceptance = writing.chapterAcceptanceDesk
  if (acceptance?.visible) {
    actions.unshift(writingAction('open_version_history', '查看当前章版本历史。'))
  }
  return actions.slice(0, 4)
}

export function buildAutoCreationDirectorModel(input: BuildAutoCreationDirectorModelInput): AutoCreationDirectorModel {
  const planning = input.planning
  const writing = input.writing
  const activeTasks = arrayValue(input.activeTasks)
  const runRecords = arrayValue(input.runRecords)
  const hasModel = Boolean(input.selectedModelId)
  const chapter = targetChapter(writing)
  const blockingPlan = planningBlocker(planning)
  const running = hasRunningTasks(activeTasks)
  const retentionActionNeeded = retentionNeedsAction(planning)
  const storylineActionNeeded = storylineNeedsAction(planning)
  const volumeBeatActionNeeded = volumeBeatNeedsAction(planning)
  const rhythmActionNeeded = rhythmNeedsAction(planning)
  const reviewedContract = creationContractFromReview(arrayValue(input.reviews))
  const creationContract = reviewedContract.contract || buildLongformCreationContract(planning, writing)
  const longformCompass = buildLongformCompass(planning, arrayValue(input.reviews))
  const longformCapacity = buildLongformCapacity(planning)
  const batchReviewQueue = buildBatchReviewQueue({
    runRecords,
    chapters: arrayValue(input.chapters),
    reviews: arrayValue(input.reviews),
    storyState: input.storyState || {},
  })
  const blockers: string[] = []
  const confirmations: string[] = []
  let status: AutoCreationDirectorStatus
  let statusLabel: string
  let headline: string
  let summary: string
  let mainAction: AutoCreationDirectorAction

  if (!hasModel) {
    status = 'blocked'
    statusLabel = '缺模型'
    headline = '先选择可用模型'
    summary = '自动创作需要一个健康的文本模型来执行规划、场景卡、正文和复检。'
    blockers.push('未选择模型')
    mainAction = opsAction('select_model', '选择模型', '在顶部模型选择器中选择一个可用模型。', true)
  } else if (running) {
    status = 'running'
    statusLabel = '生产中'
    headline = '后台任务正在运行'
    summary = '当前已有长耗时任务在执行，先查看任务中心，避免重复触发同一段生产链路。'
    mainAction = opsAction('open_task_center', '查看任务中心', '查看进度、失败原因和可恢复任务。')
  } else if (blockingPlan) {
    status = 'blocked'
    statusLabel = '规划阻塞'
    headline = '长篇自动生产前置规划不足'
    summary = blockingPlan.detail
    blockers.push(blockingPlan.title)
    mainAction = planningAction(blockingPlan.actionKey, blockingPlan.detail)
  } else if (retentionActionNeeded) {
    status = 'needs_governance'
    statusLabel = '留存待治理'
    headline = '先校准前30章留存曲线'
    summary = planning.first30Retention.summary
    confirmations.push('前30章留存需要确认')
    mainAction = planningAction(planning.first30Retention.actionKey, '在进入连续生产前，先确认开篇三章、试读十章和付费前蓄势。')
  } else if (storylineActionNeeded) {
    status = 'needs_governance'
    statusLabel = '剧情线待治理'
    headline = '先校准主线、支线和伏笔线'
    summary = planning.storylineBoard.summary
    confirmations.push('剧情线需要调度确认')
    mainAction = planningAction('open_story_assets', '进入设定资产页，补齐或确认主线、支线、角色线、关系线、势力线和伏笔线。')
  } else if (volumeBeatActionNeeded) {
    status = 'needs_governance'
    statusLabel = '爆点预算待补'
    headline = '先补齐当前卷高潮和爽点预算'
    summary = planning.volumeBeatBudget.summary
    confirmations.push('卷级高潮预算需要补齐')
    mainAction = planningAction('complete_volume_plan', planning.volumeBeatBudget.nextActions[0] || '补齐当前卷的小高潮、中高潮和卷末爆点。')
  } else if (rhythmActionNeeded) {
    status = 'needs_governance'
    statusLabel = '节奏待治理'
    headline = '先校准长篇节奏再连续生成'
    summary = planning.longformRhythm.summary
    confirmations.push('长篇节奏需要校准')
    mainAction = planningAction(rhythmAction(planning), planning.longformRhythm.nextActions[0] || '先处理长篇节奏风险，再进入连续章节生产。')
  } else if (batchReviewQueue.visible && batchReviewQueue.status === 'warn') {
    status = 'needs_acceptance'
    statusLabel = '批次待复盘'
    headline = '安全连写批次需要先复盘'
    summary = batchReviewQueue.summary
    confirmations.push('安全连写批次需要复盘')
    mainAction = batchReviewQueue.nextAction
  } else if (batchReviewQueue.visible && batchReviewQueue.status === 'risk') {
    status = 'needs_acceptance'
    statusLabel = '批次有风险'
    headline = '安全连写批次需要质量复盘'
    summary = batchReviewQueue.summary
    confirmations.push('安全连写批次存在质量风险')
    mainAction = batchReviewQueue.nextAction
  } else if (batchReviewQueue.visible && batchReviewQueue.status === 'ok') {
    status = 'needs_acceptance'
    statusLabel = '批次待验收'
    headline = '安全连写批次需要逐章验收'
    summary = batchReviewQueue.summary
    confirmations.push('安全连写批次需要逐章验收')
    mainAction = batchReviewQueue.nextAction
  } else if (writing.chapterAcceptanceDesk.visible) {
    const action = writing.chapterAcceptanceDesk.recommendedAcceptanceAction
    status = 'needs_acceptance'
    statusLabel = writing.chapterAcceptanceDesk.statusLabel
    headline = chapter ? `第 ${chapter.chapterNo} 章进入交稿闭环` : '当前章进入交稿闭环'
    summary = writing.chapterAcceptanceDesk.acceptanceReasons[0] || '按质检、修订、状态同步和验收顺序处理当前章。'
    mainAction = writingAction(action.key, '处理当前章交稿门禁，不跳过质检和状态回填。', action.label)
  } else {
    const plannerAction = writing.chapterPlanningDesk.recommendedPlannerAction
    status = 'ready'
    statusLabel = writing.chapterPlanningDesk.statusLabel
    headline = chapter ? `第 ${chapter.chapterNo} 章可以推进` : '可以推进下一章'
    summary = writing.chapterPlanningDesk.reasons[0] || writing.topStatus.nextActionLabel
    mainAction = writingAction(plannerAction.key || writing.primaryActionKey, '按章节任务书和场景卡推进当前章。', plannerAction.label)
  }

  const batchGuardrail = buildBatchGuardrail({
    planning,
    writing,
    activeTasks,
    hasBlockingPlan: Boolean(blockingPlan),
    hasModel,
    mainAction,
    longformCapacity,
  })
  const pipeline = buildPipeline({
    planning,
    writing,
    activeTasks,
    hasBlockingPlan: Boolean(blockingPlan),
    hasModel,
    creationContract,
    longformCapacity,
    batchGuardrail,
  })

  return {
    status,
    statusLabel,
    headline,
    summary,
    targetChapter: chapter,
    mainAction,
    secondaryActions: fallbackSecondaryActions(planning, writing).filter(action => action.key !== mainAction.key),
    blockers,
    confirmations,
    queue: {
      activeCount: activeTasks.length,
      labels: activeTasks.slice(0, 3).map(taskLabel),
    },
    metrics: {
      writtenWords: planning.topStatus.writtenWords,
      targetWords: planning.topStatus.targetWords,
      future10Label: planning.topStatus.future10Coverage.label,
      first30Score: planning.first30Retention.score,
      storylineCount: planning.storylineBoard.total,
      creationDiagnosisScore: reviewedContract.score,
      longformRhythmScore: planning.longformRhythm?.score ?? null,
      volumeBeatScore: planning.volumeBeatBudget?.score ?? null,
      longformCapacityScore: longformCapacity.score,
    },
    longformRhythm: planning.longformRhythm,
    longformCapacity,
    longformCompass,
    creationContract,
    batchGuardrail,
    batchReviewQueue,
    pipeline,
  }
}

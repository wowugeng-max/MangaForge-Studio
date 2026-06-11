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
  | 'create_delivery_risk_repair'
  | 'create_script_room_repair'
  | 'select_model'

export type AutoCreationPipelineStatus = 'done' | 'active' | 'pending' | 'blocked' | 'warning'
export type AutoCreationContractStatus = 'ok' | 'warn' | 'block'
export type AutoCreationBatchGuardrailStatus = 'ready' | 'caution' | 'blocked'
export type AutoCreationBatchGuardrailSignalStatus = 'ok' | 'warn' | 'block'
export type AutoCreationBatchReviewStatus = 'empty' | 'ok' | 'warn' | 'risk' | 'done'
export type AutoCreationBatchReviewItemStatus = 'success' | 'failed'
export type AutoCreationBatchRiskStatus = 'ok' | 'warn'
export type AutoCreationBatchCompletionStatus = 'empty' | 'in_progress' | 'needs_repair' | 'ready_next'
export type AutoCreationBatchCompletionMetricStatus = 'ok' | 'warn' | 'block'
export type AutoCreationBatchHandoffStatus = 'empty' | 'failed' | 'deliver_chapters' | 'repair_risks' | 'continue_batch' | 'prepare_next'
export type AutoCreationChapterLaunchGateStatus = 'ready' | 'warn' | 'blocked'
export type AutoCreationLongformCapacityStatus = 'ready' | 'caution' | 'blocked'
export type AutoCreationDeliveryRiskGateStatus = 'ok' | 'warn' | 'block'
export type AutoCreationDailyBattleStepKey = 'clear_risks' | 'fuel_materials' | 'chapter_work' | 'batch_release'
export type AutoCreationRollingScriptRoomStatus = 'ready' | 'needs_attention' | 'blocked'
export type AutoCreationRollingScriptLayerKey = 'current_chapter' | 'next_10' | 'future_100' | 'current_volume' | 'book_compass'
export type AutoCreationMillionWordRunwayStatus = 'ready' | 'single_chapter' | 'blocked'
export type AutoCreationProductionLicenseStatus = 'blocked' | 'single_chapter' | 'batch_allowed'

export interface AutoCreationDirectorAction {
  area: AutoCreationDirectorArea
  key: AutoCreationDirectorActionKey
  label: string
  description: string
  modelCall: boolean
  disabled?: boolean
  payload?: AnyRecord
}

export interface AutoCreationPipelineStep {
  key:
    | 'longform_planning'
    | 'creation_contract'
    | 'rolling_script_room'
    | 'longform_capacity'
    | 'volume_beat_budget'
    | 'longform_rhythm'
    | 'story_assets'
    | 'retention_curve'
    | 'chapter_planning'
    | 'chapter_execution'
    | 'quality_gate'
    | 'canon_sync'
    | 'chapter_handoff'
    | 'batch_guardrail'
    | 'async_tasks'
  label: string
  status: AutoCreationPipelineStatus
  detail: string
}

export type AutoCreationSerialStageKey =
  | 'book_core'
  | 'longform_plan'
  | 'chapter_launch'
  | 'delivery_acceptance'
  | 'serial_governance'

export interface AutoCreationSerialWorkflowStage {
  key: AutoCreationSerialStageKey
  label: string
  status: AutoCreationPipelineStatus
  detail: string
  action: AutoCreationDirectorAction
}

export interface AutoCreationDirectorCreationPipelineStage {
  key: PlanningWorkspaceModel['creationPipeline']['stages'][number]['key'] | string
  label: string
  status: AutoCreationPipelineStatus
  active: boolean
  score: number
  detail: string
  action: AutoCreationDirectorAction
}

export interface AutoCreationDirectorCreationPipeline {
  currentStageKey: string
  summary: string
  riskCount: number
  primaryAction: AutoCreationDirectorAction
  stages: AutoCreationDirectorCreationPipelineStage[]
}

export interface AutoCreationSerialWorkflow {
  currentKey: AutoCreationSerialStageKey
  currentLabel: string
  summary: string
  stages: AutoCreationSerialWorkflowStage[]
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

export interface AutoCreationBatchReleaseChapter {
  chapterNo: number
  title: string
  status: 'allowed' | 'blocked'
  reason: string
}

export interface AutoCreationBatchReleaseWindow {
  summary: string
  allowedChapters: AutoCreationBatchReleaseChapter[]
  blockedChapters: AutoCreationBatchReleaseChapter[]
}

export interface AutoCreationBatchPreflight {
  visible: boolean
  status: AutoCreationBatchGuardrailStatus
  title: string
  summary: string
  allowedChapterNos: number[]
  blockedChapterNos: number[]
  modelPipeline: string[]
  warnings: string[]
  longformMemoryAnchor?: AnyRecord | null
  chapterHandoffContract?: AnyRecord | null
  inputSnapshot: AnyRecord
}

export interface AutoCreationBatchBriefRepair {
  visible: boolean
  status: AutoCreationBatchGuardrailSignalStatus
  title: string
  summary: string
  missingItems: string[]
  action: AutoCreationDirectorAction
}

export interface AutoCreationBatchBriefRecovery {
  visible: boolean
  title: string
  summary: string
  restoredChapterCount: number
  evidence: string[]
  action: AutoCreationDirectorAction
}

export interface AutoCreationNextBatchBriefChapter {
  chapterNo: number
  title: string
  chapterTask: string
  conflict: string
  endingHook: string
  mainlineProgress: string
}

export type AutoCreationNextBatchBriefStartChecklistKey =
  | 'core_promise'
  | 'story_drive'
  | 'reader_payoff'
  | 'innovation'
  | 'forbidden_boundary'

export interface AutoCreationNextBatchBriefStartChecklistItem {
  key: AutoCreationNextBatchBriefStartChecklistKey
  label: string
  status: AutoCreationBatchGuardrailSignalStatus
  detail: string
}

export interface AutoCreationNextBatchBrief {
  visible: boolean
  chapterRangeLabel: string
  batchGoal: string
  readerPayoffPlan: string
  mainlineFocus: string
  forbiddenBoundary: string
  startChecklist: AutoCreationNextBatchBriefStartChecklistItem[]
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

export interface AutoCreationChapterLaunchSignal {
  key: 'reader_promise' | 'chapter_goal' | 'core_conflict' | 'mainline_service' | 'reader_payoff' | 'ending_hook'
  label: string
  status: AutoCreationBatchGuardrailSignalStatus
  detail: string
}

export interface AutoCreationChapterLaunchGate {
  status: AutoCreationChapterLaunchGateStatus
  label: string
  summary: string
  signals: AutoCreationChapterLaunchSignal[]
  action: AutoCreationDirectorAction
}

export interface AutoCreationBatchGuardrail {
  status: AutoCreationBatchGuardrailStatus
  label: string
  summary: string
  safeChapterCount: number
  recommendedAction: AutoCreationDirectorAction
  guardrails: AutoCreationBatchGuardrailSignal[]
  releaseWindow: AutoCreationBatchReleaseWindow
  preflight: AutoCreationBatchPreflight
  nextBatchBrief: AutoCreationNextBatchBrief
  briefRepair: AutoCreationBatchBriefRepair
  briefRecovery: AutoCreationBatchBriefRecovery
}

interface AutoCreationCanonRunway {
  status: AutoCreationBatchGuardrailSignalStatus
  label: string
  detail: string
  action: AutoCreationDirectorAction
  staleState: boolean
  memoryUnavailable: boolean
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
  key: 'quality' | 'core' | 'runway' | 'payoff' | 'reader_pull' | 'reader_trial' | 'first30_retention' | 'handoff' | 'storyline' | 'story_drive' | 'character_arc' | 'innovation' | 'signature_scene' | 'chapter_attraction' | 'chapter_benchmark' | 'style_sample' | 'readability' | 'serial_rhythm' | 'asset_growth' | 'volume_segment' | 'batch_plan' | 'batch_checklist'
  label: string
  status: AutoCreationBatchRiskStatus
  detail: string
}

export interface AutoCreationBatchChecklistExecutionItem {
  key: string
  label: string
  status: AutoCreationBatchRiskStatus
  detail: string
  planned: string
  evidence: string[]
}

export interface AutoCreationBatchChecklistExecution {
  visible: boolean
  status: AutoCreationBatchRiskStatus
  score: number
  summary: string
  items: AutoCreationBatchChecklistExecutionItem[]
  missed: AutoCreationBatchChecklistExecutionItem[]
}

export interface AutoCreationBatchRiskRadar {
  status: AutoCreationBatchRiskStatus
  averageQualityScore: number | null
  lowQualityCount: number
  coreRiskCount: number
  runwayRiskCount: number
  payoffDebtCount: number
  readerPullRiskCount: number
  readerTrialRiskCount: number
  first30RetentionRiskCount: number
  handoffRiskCount: number
  storylineRiskCount: number
  storyDriveRiskCount: number
  characterArcRiskCount: number
  innovationRiskCount: number
  signatureSceneRiskCount: number
  chapterAttractionRiskCount: number
  chapterBenchmarkRiskCount: number
  styleSampleRiskCount: number
  readabilityRiskCount: number
  serialRhythmRiskCount: number
  assetGrowthRiskCount: number
  volumeSegmentRiskCount: number
  batchPlanRiskCount: number
  batchChecklistRiskCount: number
  checklistExecution: AutoCreationBatchChecklistExecution
  signals: AutoCreationBatchRiskSignal[]
  repairTasks: AnyRecord[]
}

export interface AutoCreationBatchCompletionMetric {
  key: 'generation' | 'delivery' | 'quality' | 'plan' | 'checklist'
  label: string
  value: number
  target: number
  status: AutoCreationBatchCompletionMetricStatus
  detail: string
}

export interface AutoCreationBatchCompletionDashboard {
  visible: boolean
  status: AutoCreationBatchCompletionStatus
  score: number
  label: string
  summary: string
  nextAction: AutoCreationDirectorAction
  metrics: AutoCreationBatchCompletionMetric[]
}

export interface AutoCreationBatchHandoff {
  visible: boolean
  status: AutoCreationBatchHandoffStatus
  label: string
  summary: string
  action: AutoCreationDirectorAction
  targetChapterNos: number[]
  riskLabels: string[]
  evidence: string[]
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
  completionDashboard: AutoCreationBatchCompletionDashboard
  handoff: AutoCreationBatchHandoff
  items: AutoCreationBatchReviewItem[]
}

export interface AutoCreationDeliveryRiskGateCategory {
  key: 'delivery_core' | 'runway' | 'reader_expectation' | 'reader_retention' | 'reader_payoff' | 'innovation' | 'signature_scene' | 'storyline' | 'story_unit' | 'story_drive' | 'character_arc' | 'chapter_attraction' | 'chapter_benchmark' | 'style_sample' | 'readability' | 'volume_beat'
  label: string
  count: number
  highCount: number
}

export interface AutoCreationDeliveryRiskResolution {
  label: string
  detail: string
  count: number
  chapterNos: number[]
  issueTypes: string[]
}

export interface AutoCreationDeliveryRiskGate {
  status: AutoCreationDeliveryRiskGateStatus
  label: string
  summary: string
  totalOpen: number
  highOpen: number
  categories: AutoCreationDeliveryRiskGateCategory[]
  topRisks: string[]
  recentlyResolved: AutoCreationDeliveryRiskResolution[]
}

export interface AutoCreationWritingQueueFocus {
  visible: boolean
  status: 'empty' | 'needs_plan' | 'ready_to_draft' | 'draft_generated'
  label: string
  summary: string
  currentChapterNo: number | null
  readyCount: number
  blockedCount: number
  draftedCount: number
  action: AutoCreationDirectorAction
  badges: string[]
}

export interface AutoCreationDailyBattleStep {
  key: AutoCreationDailyBattleStepKey
  label: string
  status: AutoCreationPipelineStatus
  detail: string
  action: AutoCreationDirectorAction
  badges: string[]
  gateChecks: string[]
}

export interface AutoCreationDailyBattlePlan {
  label: string
  summary: string
  currentStepKey: AutoCreationDailyBattleStepKey
  steps: AutoCreationDailyBattleStep[]
}

export interface AutoCreationProductionLicense {
  status: AutoCreationProductionLicenseStatus
  label: string
  modeLabel: string
  summary: string
  safeChapterCount: number
  reasons: string[]
  badges: string[]
  nextAction: AutoCreationDirectorAction
}

export interface AutoCreationTodayCommandFlowItem {
  key: AutoCreationDailyBattleStepKey
  label: string
  status: AutoCreationPipelineStatus
}

export interface AutoCreationTodayQualityGate {
  key: 'core' | 'story_drive' | 'reader_pull' | 'innovation' | 'serial_safety'
  label: string
  status: AutoCreationBatchGuardrailSignalStatus
  detail: string
}

export interface AutoCreationReleaseRationale {
  mode: string
  allowedCount: number
  primaryReason: string
  checks: string[]
  limits: string[]
}

export interface AutoCreationTodayCommandDeck {
  label: string
  status: AutoCreationProductionLicenseStatus
  modeLabel: string
  currentStepLabel: string
  summary: string
  reasons: string[]
  action: AutoCreationDirectorAction
  actionLabel: string
  releaseRationale: AutoCreationReleaseRationale
  qualityGates: AutoCreationTodayQualityGate[]
  flow: AutoCreationTodayCommandFlowItem[]
}

export type AutoCreationSerialCockpitStatus = 'ok' | 'warn' | 'block'
export type AutoCreationChapterChainStatus = 'done' | 'current' | 'pending' | 'warn' | 'block'

export interface AutoCreationSerialGuardrail {
  key: 'core_stability' | 'story_drive' | 'reader_pull' | 'innovation_ip' | 'serial_safety'
  label: string
  status: AutoCreationSerialCockpitStatus
  detail: string
  count: number
  action: AutoCreationDirectorAction
}

export interface AutoCreationChapterChainStep {
  key: 'handoff' | 'brief' | 'draft' | 'quality' | 'state_sync' | 'delivery'
  label: string
  status: AutoCreationChapterChainStatus
  detail: string
  action: AutoCreationDirectorAction
}

export interface AutoCreationRiskQueueItem {
  key: 'delivery_risks' | 'storylines' | 'reader_expectation' | 'first30_retention' | 'asset_intake' | 'batch_risks'
  label: string
  count: number
  status: AutoCreationSerialCockpitStatus
  detail: string
  action: AutoCreationDirectorAction
}

export interface AutoCreationSerialCockpit {
  title: string
  summary: string
  command: AutoCreationTodayCommandDeck
  guardrails: AutoCreationSerialGuardrail[]
  chapterChain: AutoCreationChapterChainStep[]
  batchLicense: AutoCreationProductionLicense
  riskQueue: AutoCreationRiskQueueItem[]
}

export interface AutoCreationMillionWordRunwayGate {
  key: 'core_compass' | 'chapter_four_questions' | 'reader_fuel' | 'innovation' | 'canon_memory' | 'batch_entry'
  label: string
  status: AutoCreationBatchGuardrailSignalStatus
  detail: string
}

export interface AutoCreationMillionWordRunwayQuestion {
  key: 'why_now' | 'page_turn' | 'mainline_move' | 'freshness'
  label: string
  answer: string
  status: AutoCreationBatchGuardrailSignalStatus
}

export interface AutoCreationMillionWordRunway {
  status: AutoCreationMillionWordRunwayStatus
  label: string
  summary: string
  bandLabel: string
  safeModeLabel: string
  gates: AutoCreationMillionWordRunwayGate[]
  fourQuestions: AutoCreationMillionWordRunwayQuestion[]
  redLines: string[]
  readerFuel: string[]
  recommendedAction: AutoCreationDirectorAction
}

export interface AutoCreationRollingScriptLayer {
  key: AutoCreationRollingScriptLayerKey
  label: string
  status: AutoCreationRollingScriptRoomStatus
  detail: string
  evidence: string[]
  action: AutoCreationDirectorAction
}

export interface AutoCreationRollingScriptRoom {
  status: AutoCreationRollingScriptRoomStatus
  label: string
  summary: string
  focusRangeLabel: string
  layers: AutoCreationRollingScriptLayer[]
  nextChapters: AutoCreationNextBatchBriefChapter[]
  nextAction: AutoCreationDirectorAction
  repairTasks: AnyRecord[]
  repairAction: AutoCreationDirectorAction
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
  longformBattleDesk: PlanningWorkspaceModel['longformBattleDesk']
  longformCapacity: AutoCreationLongformCapacity
  longformCompass: AutoCreationLongformCompass
  creationContract: AutoCreationContractItem[]
  chapterLaunchGate: AutoCreationChapterLaunchGate
  dailyBattlePlan: AutoCreationDailyBattlePlan
  productionLicense: AutoCreationProductionLicense
  todayCommandDeck: AutoCreationTodayCommandDeck
  serialCockpit: AutoCreationSerialCockpit
  millionWordRunway: AutoCreationMillionWordRunway
  writingQueueFocus: AutoCreationWritingQueueFocus
  rollingScriptRoom: AutoCreationRollingScriptRoom
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  batchGuardrail: AutoCreationBatchGuardrail
  batchReviewQueue: AutoCreationBatchReviewQueue
  creationPipeline: AutoCreationDirectorCreationPipeline
  serialWorkflow: AutoCreationSerialWorkflow
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
  enter_story_planning: '进入故事规划',
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
  run_reader_trial_review: '运行读者试读复盘',
  create_reader_trial_repair: '生成试读修复任务',
  create_delivery_risk_repair: '生成风险修复任务',
  open_task_center: '打开任务中心',
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

function planningAction(key: PlanningActionKey, description: string, label?: string, payload?: AnyRecord): AutoCreationDirectorAction {
  return {
    area: 'planning',
    key,
    label: label || PLANNING_ACTION_LABELS[key] || key,
    description,
    modelCall: MODEL_CALL_ACTIONS.has(key),
    payload,
  }
}

function normalizePlanningActionKey(value: any, fallback: PlanningActionKey): PlanningActionKey {
  const key = text(value)
  if (key && Object.prototype.hasOwnProperty.call(PLANNING_ACTION_LABELS, key)) return key as PlanningActionKey
  return fallback
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
  key: 'open_task_center' | 'select_model' | 'start_safe_batch_generation' | 'create_safe_batch_risk_repair' | 'create_delivery_risk_repair' | 'create_script_room_repair',
  label: string,
  description: string,
  disabled = false,
  payload?: AnyRecord,
): AutoCreationDirectorAction {
  return {
    area: 'ops',
    key,
    label,
    description,
    modelCall: MODEL_CALL_ACTIONS.has(key),
    disabled,
    payload,
  }
}

function writingReadinessIssue(writing: WritingCockpitModel, key: string) {
  return [
    ...arrayValue(writing.readiness?.warnings),
    ...arrayValue(writing.readiness?.blockers),
    ...arrayValue(writing.readinessChecks),
    ...arrayValue(writing.readiness?.checks),
  ].find(check => text(check?.key) === key && text(check?.status) !== 'pass')
}

function buildCanonRunway(writing: WritingCockpitModel): AutoCreationCanonRunway {
  const staleState = writingReadinessIssue(writing, 'story_state_stale')
  const memoryUnavailable = writingReadinessIssue(writing, 'memory_unavailable')
  if (staleState) {
    return {
      status: 'block',
      label: '长线记忆',
      detail: [
        `${text(staleState.label, '故事状态可能滞后')}：${text(staleState.detail, '建议同步最近已写章节的状态机。')}`,
        memoryUnavailable ? `${text(memoryUnavailable.label, '记忆摘要不可用')}：${text(memoryUnavailable.detail, '缺少可引用的记忆事实。')}` : '',
      ].filter(Boolean).join('；'),
      action: writingAction('update_canon', '先同步故事状态，确保正史、剧情线和长期设定与已写章节对齐。', '同步故事状态'),
      staleState: true,
      memoryUnavailable: Boolean(memoryUnavailable),
    }
  }
  if (memoryUnavailable) {
    return {
      status: 'warn',
      label: '长线记忆',
      detail: `${text(memoryUnavailable.label, '记忆摘要不可用')}：${text(memoryUnavailable.detail, '缺少可引用的记忆事实。')} 本轮只建议单章推进，并先修复连续性材料。`,
      action: writingAction('fix_continuity', '补齐长期记忆摘要和连续性事实后，再扩大安全连写批次。', '修复连续性'),
      staleState: false,
      memoryUnavailable: true,
    }
  }
  return {
    status: 'ok',
    label: '长线记忆',
    detail: '故事状态与长期记忆均可支撑连续生产。',
    action: writingAction('fix_continuity', '长线记忆状态正常，无需修复。', '修复连续性'),
    staleState: false,
    memoryUnavailable: false,
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

function characterArcNeedsAction(planning: PlanningWorkspaceModel) {
  return Boolean(planning.characterArcBoard && planning.characterArcBoard.status === 'needs_attention')
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

function reviewPayload(review: AnyRecord | null) {
  return parsePayload(review?.payload) || {}
}

function riskCountFromStatus(payload: AnyRecord, review: AnyRecord | null) {
  return text(payload?.status || review?.status).toLowerCase() === 'warn' ? 1 : 0
}

function coreRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const raw = riskPayload(review, 'core_drift')
  const payload = raw?.chapter_core_drift || raw?.core_drift || raw
  const count = arrayValue(payload?.drift_risks).length + arrayValue(payload?.risks).length
  return count > 0 ? count : riskCountFromStatus(payload, review)
}

function runwayRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'runway_sync')
  const count = numberValue(payload?.risk_count ?? payload?.riskCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.four_question_missed).length
    + arrayValue(payload?.reader_fuel_missed).length
    + arrayValue(payload?.redline_touched).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

function payoffDebtCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'reader_payoff_sync')
  const count = numberValue(payload?.debt_count ?? payload?.debtCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length + arrayValue(payload?.debts).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

function expectationRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'reader_expectation_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
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

function storyUnitRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'story_unit_sync')
  const counted = numberValue(payload?.missed_count ?? payload?.missedCount)
    || numberValue(payload?.rushed_count ?? payload?.rushedCount)
    || numberValue(payload?.forbidden_count ?? payload?.forbiddenCount)
  if (counted !== null) {
    const missed = numberValue(payload?.missed_count ?? payload?.missedCount) ?? arrayValue(payload?.missed).length
    const rushed = numberValue(payload?.rushed_count ?? payload?.rushedCount) ?? (arrayValue(payload?.rushed_ahead).length + arrayValue(payload?.rushedAhead).length)
    const forbidden = numberValue(payload?.forbidden_count ?? payload?.forbiddenCount) ?? (arrayValue(payload?.forbidden_touched).length + arrayValue(payload?.forbiddenTouched).length)
    return missed + rushed + forbidden
  }
  const count = arrayValue(payload?.missed).length
    + arrayValue(payload?.rushed_ahead).length
    + arrayValue(payload?.rushedAhead).length
    + arrayValue(payload?.forbidden_touched).length
    + arrayValue(payload?.forbiddenTouched).length
  return count > 0 ? count : riskCountFromStatus(payload, review)
}

function storyDriveRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'story_drive_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

function characterArcRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'character_arc_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
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

function styleSampleRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'style_sample_sync')
  const missed = numberValue(payload?.missed_count ?? payload?.missedCount) ?? arrayValue(payload?.missed).length
  const copied = numberValue(payload?.copy_risk_count ?? payload?.copyRiskCount) ?? (arrayValue(payload?.copied_phrases).length + arrayValue(payload?.copiedPhrases).length)
  const total = missed + copied
  return total > 0 ? total : riskCountFromStatus(payload, review)
}

function chapterBenchmarkRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'chapter_benchmark_sync')
  const missed = numberValue(payload?.missed_count ?? payload?.missedCount) ?? arrayValue(payload?.missed).length
  return missed > 0 ? missed : riskCountFromStatus(payload, review)
}

function chapterAttractionWeakDimensions(payload: AnyRecord) {
  const explicitWeak = arrayValue(payload?.weak_dimensions || payload?.weakDimensions)
  if (explicitWeak.length > 0) return explicitWeak
  return arrayValue(payload?.dimensions)
    .filter((item: any) => text(item?.status).toLowerCase() === 'warn')
}

function chapterAttractionRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'chapter_attraction_review')
  const count = numberValue(payload?.weak_count ?? payload?.weakCount)
  if (count !== null) return count
  const weak = chapterAttractionWeakDimensions(payload).length
  return weak > 0 ? weak : riskCountFromStatus(payload, review)
}

function readerTrialReport(review: AnyRecord | null) {
  if (!review) return null
  const payload = reviewPayload(review)
  return payload?.report || payload?.reader_trial_review || payload?.result?.report || payload?.result || payload
}

function latestReaderTrialReview(reviews: AnyRecord[]) {
  return reviews
    .filter(review => text(review?.review_type) === 'reader_trial_review')
    .slice()
    .sort((a, b) => recordTime(b) - recordTime(a))[0] || null
}

function chapterNosFromText(value: string) {
  const result = new Set<number>()
  const normalized = text(value)
  const patterns = [
    /第\s*(\d+)\s*章/g,
    /chapter\s*(\d+)/gi,
  ]
  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(normalized))) {
      const chapterNo = Number(match[1])
      if (Number.isFinite(chapterNo) && chapterNo > 0) result.add(chapterNo)
    }
  }
  return [...result]
}

function readerTrialAppliesToBatch(textValue: string, chapterNos: Set<number>) {
  const mentionedNos = chapterNosFromText(textValue)
  if (mentionedNos.length > 0) {
    return mentionedNos.some(chapterNo => chapterNos.has(chapterNo))
  }
  return [...chapterNos].some(chapterNo => chapterNo > 0 && chapterNo <= 30)
}

function readerTrialBatchReview(args: {
  items: AutoCreationBatchReviewItem[]
  review: AnyRecord | null
}) {
  const report = readerTrialReport(args.review)
  const chapterNos = new Set(args.items.map(item => Number(item.chapterNo || 0)).filter(Boolean))
  const dropPoints = arrayValue(report?.drop_points || report?.dropPoints)
    .map(item => text(item))
    .filter(Boolean)
    .filter(item => readerTrialAppliesToBatch(item, chapterNos))
  const repairActions = arrayValue(report?.repair_actions || report?.repairActions)
    .map(item => text(item))
    .filter(Boolean)
    .filter(item => readerTrialAppliesToBatch(item, chapterNos) || dropPoints.length > 0)
  const score = numberValue(report?.score)
  const status = text(report?.status).toLowerCase()
  const batchInTrialWindow = [...chapterNos].some(chapterNo => chapterNo > 0 && chapterNo <= 30)
  const lowScoreRisk = batchInTrialWindow && score !== null && score < BATCH_DELIVERY_QUALITY_THRESHOLD ? 1 : 0
  const statusRisk = batchInTrialWindow && ['blocked', 'block', 'needs_repair', 'warn'].includes(status) ? 1 : 0
  const riskCount = dropPoints.length || Math.max(lowScoreRisk, statusRisk)
  return {
    status: riskCount > 0 ? 'warn' as const : 'ok' as const,
    score,
    label: riskCount > 0 ? `试读弃读点 ${riskCount}` : '试读 OK',
    summary: text(report?.summary, riskCount > 0 ? '读者试读复盘存在弃读点。' : '读者试读复盘未发现当前批次风险。'),
    quality_bar: firstText(report?.quality_bar, report?.qualityBar),
    drop_points: dropPoints,
    repair_actions: repairActions,
    personas: arrayValue(report?.personas),
    segments: arrayValue(report?.segments),
    risk_count: riskCount,
  }
}

function retentionRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'reader_retention_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

function innovationRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'innovation_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

function signatureSceneRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'signature_scene_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

function payloadReviewChapterId(review: AnyRecord, payload: AnyRecord) {
  return review?.chapter_id
    ?? review?.chapterId
    ?? payload?.chapter_id
    ?? payload?.chapterId
    ?? payload?.report?.chapter_id
    ?? payload?.report?.chapterId
    ?? payload?.context_package?.chapter_target?.id
    ?? null
}

function payloadReviewChapterNo(review: AnyRecord, payload: AnyRecord) {
  return Number(
    review?.chapter_no
    ?? review?.chapterNo
    ?? payload?.chapter_no
    ?? payload?.chapterNo
    ?? payload?.report?.chapter_no
    ?? payload?.report?.chapterNo
    ?? payload?.context_package?.chapter_target?.chapter_no
    ?? payload?.context_package?.chapter_target?.chapterNo
    ?? 0,
  )
}

function deliveryRiskAnnotationKey(input: {
  source: string
  reviewId: any
  chapterId: any
  chapterNo: any
  kind: string
  title: string
}) {
  return [
    input.source || 'review',
    input.reviewId || 0,
    input.chapterId || 0,
    input.chapterNo || 0,
    String(input.kind || 'issue'),
    String(input.title || '').slice(0, 120),
  ].join(':')
}

function resolvedAnnotationKeys(reviews: AnyRecord[]) {
  const map = new Map<string, AnyRecord>()
  reviews
    .filter(review => text(review?.review_type) === 'review_annotation_status')
    .slice()
    .sort((a, b) => recordTime(a) - recordTime(b))
    .forEach(review => {
      const payload = reviewPayload(review)
      const key = text(payload?.annotation_key || payload?.key)
      if (key) map.set(key, payload)
    })
  return new Set([...map.entries()]
    .filter(([, payload]) => text(payload?.status).toLowerCase() === 'resolved')
    .map(([key]) => key))
}

function clearedDeliveryRiskChapterKeys(reviews: AnyRecord[]) {
  const cleared = new Map<string, number>()
  reviews
    .filter(review => text(review?.review_type) === 'delivery_risk_convergence')
    .forEach(review => {
      const payload = reviewPayload(review)
      const convergence = payload?.delivery_risk_convergence || payload?.result?.delivery_risk_convergence || payload?.result || payload
      const afterCount = Number(convergence?.after_count ?? convergence?.afterCount ?? convergence?.after?.total_count ?? 0)
      if (!(text(convergence?.status) === 'cleared' || afterCount === 0)) return
      const chapterId = payloadReviewChapterId(review, { ...payload, chapter_id: payload?.chapter_id || convergence?.chapter_id })
      const chapterNo = payloadReviewChapterNo(review, { ...payload, chapter_no: payload?.chapter_no || convergence?.chapter_no })
      const time = recordTime(review)
      if (chapterId !== null && chapterId !== undefined) cleared.set(`id:${chapterId}`, Math.max(cleared.get(`id:${chapterId}`) || 0, time))
      if (chapterNo > 0) cleared.set(`no:${chapterNo}`, Math.max(cleared.get(`no:${chapterNo}`) || 0, time))
    })
  return cleared
}

const DELIVERY_RISK_CONFIG: Record<string, {
  category: AutoCreationDeliveryRiskGateCategory['key']
  label: string
  kind: string
  payloadKey: string
  issueType: string
  count: (review: AnyRecord) => number
  title: (risk: AnyRecord, count: number) => string
  message: (risk: AnyRecord) => string
  high: (risk: AnyRecord, count: number) => boolean
}> = {
  chapter_core_drift: {
    category: 'delivery_core',
    label: '核心',
    kind: 'core_drift',
    payloadKey: 'core_drift',
    issueType: 'core_drift',
    count: coreRiskCount,
    title: (risk, count) => text(risk?.label, `核心偏移 ${count}`),
    message: risk => issueTexts([...arrayValue(risk?.drift_risks), ...arrayValue(risk?.risks)], 2).join('；') || '核心偏移风险',
    high: () => true,
  },
  runway_sync: {
    category: 'runway',
    label: '航线',
    kind: 'runway_sync_risk',
    payloadKey: 'runway_sync',
    issueType: 'runway_sync_risk',
    count: runwayRiskCount,
    title: (risk, count) => text(risk?.label, `航线风险 ${count}`),
    message: risk => issueTexts([
      ...arrayValue(risk?.four_question_missed),
      ...arrayValue(risk?.reader_fuel_missed),
      ...arrayValue(risk?.redline_touched),
    ], 2).join('；') || '百万字航线、读者燃料或红线约束未闭环',
    high: (risk, count) => arrayValue(risk?.redline_touched).length > 0 || count >= 2,
  },
  reader_expectation_sync: {
    category: 'reader_expectation',
    label: '期待',
    kind: 'reader_expectation_debt',
    payloadKey: 'reader_expectation_sync',
    issueType: 'reader_expectation_debt',
    count: expectationRiskCount,
    title: (risk, count) => text(risk?.label, `期待欠账 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '读者期待或上一章交接承诺没有兑现',
    high: (_risk, count) => count >= 2,
  },
  reader_retention_sync: {
    category: 'reader_retention',
    label: '追读',
    kind: 'reader_retention_missed',
    payloadKey: 'reader_retention_sync',
    issueType: 'reader_retention_missed',
    count: retentionRiskCount,
    title: (risk, count) => text(risk?.label, `漏追读 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '追读承诺未兑现',
    high: (_risk, count) => count >= 2,
  },
  reader_payoff_sync: {
    category: 'reader_payoff',
    label: '回报',
    kind: 'reader_payoff_debt',
    payloadKey: 'reader_payoff_sync',
    issueType: 'reader_payoff_debt',
    count: payoffDebtCount,
    title: (risk, count) => text(risk?.label, `回报欠账 ${count}`),
    message: risk => issueTexts([...arrayValue(risk?.missed), ...arrayValue(risk?.debts)], 2).join('；') || '读者回报欠账',
    high: (_risk, count) => count >= 2,
  },
  innovation_sync: {
    category: 'innovation',
    label: '创新',
    kind: 'innovation_missed',
    payloadKey: 'innovation_sync',
    issueType: 'innovation_missed',
    count: innovationRiskCount,
    title: (risk, count) => text(risk?.label, `创新缺口 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '创新执行未落地',
    high: (_risk, count) => count >= 2,
  },
  signature_scene_sync: {
    category: 'signature_scene',
    label: '强场面',
    kind: 'signature_scene_missed',
    payloadKey: 'signature_scene_sync',
    issueType: 'signature_scene_missed',
    count: signatureSceneRiskCount,
    title: (risk, count) => text(risk?.label, `强场面漏写 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '开写任务书指定的标志性强场面没有充分兑现',
    high: () => true,
  },
  storyline_sync: {
    category: 'storyline',
    label: '剧情线',
    kind: 'storyline_sync_risk',
    payloadKey: 'storyline_sync',
    issueType: 'storyline_sync_risk',
    count: storylineRiskCount,
    title: (risk, count) => text(risk?.label, `剧情线风险 ${count}`),
    message: risk => issueTexts([
      ...arrayValue(risk?.missed),
      ...arrayValue(risk?.unplanned),
      ...arrayValue(risk?.forbidden_touched),
    ], 2).join('；') || '剧情线同步风险',
    high: risk => arrayValue(risk?.forbidden_touched).length > 0,
  },
  story_unit_sync: {
    category: 'story_unit',
    label: '剧情单元',
    kind: 'story_unit_sync_risk',
    payloadKey: 'story_unit_sync',
    issueType: 'story_unit_sync_risk',
    count: storyUnitRiskCount,
    title: (risk, count) => text(risk?.label, `剧情单元风险 ${count}`),
    message: risk => issueTexts([
      ...arrayValue(risk?.missed),
      ...arrayValue(risk?.rushed_ahead),
      ...arrayValue(risk?.rushedAhead),
      ...arrayValue(risk?.forbidden_touched),
      ...arrayValue(risk?.forbiddenTouched),
    ], 2).join('；') || '剧情单元兑现风险',
    high: risk => arrayValue(risk?.rushed_ahead).length > 0
      || arrayValue(risk?.rushedAhead).length > 0
      || arrayValue(risk?.forbidden_touched).length > 0
      || arrayValue(risk?.forbiddenTouched).length > 0,
  },
  story_drive_sync: {
    category: 'story_drive',
    label: '故事力',
    kind: 'story_drive_gap',
    payloadKey: 'story_drive_sync',
    issueType: 'story_drive_gap',
    count: storyDriveRiskCount,
    title: (risk, count) => text(risk?.label, `故事力缺口 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '主角主动选择、明确阻碍、选择代价、状态变化或下一步因果没有落地',
    high: (_risk, count) => count >= 3,
  },
  character_arc_sync: {
    category: 'character_arc',
    label: '人物弧光',
    kind: 'character_arc_gap',
    payloadKey: 'character_arc_sync',
    issueType: 'character_arc_gap',
    count: characterArcRiskCount,
    title: (risk, count) => text(risk?.label, `人物弧光缺口 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '角色欲望、缺陷受压、关系变化、成长节点或口吻锚点没有落地',
    high: (_risk, count) => count >= 3,
  },
  readability_review: {
    category: 'readability',
    label: '可读性',
    kind: 'readability_or_meme_risk',
    payloadKey: 'readability_review',
    issueType: 'readability_risk',
    count: readabilityRiskCount,
    title: (risk, count) => text(risk?.label, `可读性/网感风险 ${count}`),
    message: risk => issueTexts([
      ...arrayValue(risk?.meme_sense?.immersion_risks),
      ...arrayValue(risk?.immersion_risks),
      ...arrayValue(risk?.issues),
    ], 2).join('；') || `可读性评分 ${risk?.readability_score || risk?.score || '-'}`,
    high: risk => Number(risk?.readability_score ?? risk?.score ?? 100) < 65,
  },
  chapter_attraction_review: {
    category: 'chapter_attraction',
    label: '吸引力',
    kind: 'chapter_attraction_gap',
    payloadKey: 'chapter_attraction_review',
    issueType: 'chapter_attraction_gap',
    count: chapterAttractionRiskCount,
    title: (risk, count) => text(risk?.label, `吸引力缺口 ${count}`),
    message: risk => issueTexts(chapterAttractionWeakDimensions(risk), 2).join('；') || `吸引力评分 ${risk?.score || '-'}`,
    high: (_risk, count) => count >= 3,
  },
  chapter_benchmark_sync: {
    category: 'chapter_benchmark',
    label: '标杆章',
    kind: 'chapter_benchmark_gap',
    payloadKey: 'chapter_benchmark_sync',
    issueType: 'chapter_benchmark_gap',
    count: chapterBenchmarkRiskCount,
    title: (risk, count) => text(risk?.label, `标杆章缺口 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || `质量基准评分 ${risk?.score || '-'}`,
    high: (_risk, count) => count >= 3,
  },
  style_sample_sync: {
    category: 'style_sample',
    label: '风格',
    kind: 'style_sample_gap',
    payloadKey: 'style_sample_sync',
    issueType: 'style_sample_gap',
    count: styleSampleRiskCount,
    title: (risk, count) => text(risk?.label, `风格缺口 ${count}`),
    message: risk => issueTexts([
      ...arrayValue(risk?.missed),
      ...arrayValue(risk?.copied_phrases),
      ...arrayValue(risk?.copiedPhrases),
    ], 2).join('；') || `风格评分 ${risk?.score || '-'}`,
    high: risk => (numberValue(risk?.copy_risk_count ?? risk?.copyRiskCount) ?? arrayValue(risk?.copied_phrases).length + arrayValue(risk?.copiedPhrases).length) > 0,
  },
  volume_beat_sync: {
    category: 'volume_beat',
    label: '爆点',
    kind: 'volume_segment_missed',
    payloadKey: 'volume_beat_sync',
    issueType: 'volume_segment_missed',
    count: volumeSegmentRiskCount,
    title: (risk, count) => text(risk?.label, `爆点漏写 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '卷级高潮、爽点或回报预算没有兑现',
    high: (_risk, count) => count >= 2,
  },
}

function buildResolvedDeliveryRiskIssueKeys(args: {
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const resolvedKeys = new Set<string>()
  const repairRuns = args.runRecords
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .map(run => ({
      run,
      output: parsePayload(run?.output_ref) || {},
    }))
    .filter(entry => isCompletedRepairRun(entry.run))

  for (const entry of repairRuns) {
    const repairTime = recordTime(entry.run)
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

const DELIVERY_RISK_ISSUE_LABELS: Record<string, string> = {
  core_drift: '核心',
  runway_sync_risk: '航线',
  reader_expectation_debt: '期待',
  opening_handoff_debt: '开篇承接',
  reader_retention_missed: '追读',
  reader_payoff_debt: '回报',
  innovation_missed: '创新',
  innovation_execution_missed: '创新',
  signature_scene_missed: '强场面',
  storyline_sync_risk: '剧情线',
  story_unit_sync_risk: '剧情单元',
  story_drive_gap: '故事力',
  character_arc_gap: '人物弧光',
  chapter_attraction_gap: '吸引力',
  chapter_benchmark_gap: '标杆章',
  style_sample_gap: '风格',
  readability_risk: '可读性',
  readability_or_meme_risk: '可读性',
  opening_pull_risk: '开篇吸引力',
  ending_page_turn_risk: '章末翻页',
  scene_progression_risk: '场景推进',
  payoff_density_risk: '爽点密度',
  volume_beat_missed: '爆点',
  volume_segment_missed: '爆点',
}

function deliveryRiskIssueLabel(issueType: string) {
  return DELIVERY_RISK_ISSUE_LABELS[issueType] || issueType
}

function buildResolvedDeliveryRiskEvidence(args: {
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}): AutoCreationDeliveryRiskResolution[] {
  const repaired = new Map<string, {
    count: number
    chapterNos: Set<number>
    issueTypes: Set<string>
    labels: Set<string>
    latestTime: number
  }>()
  const repairRuns = args.runRecords
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .map(run => ({
      run,
      output: parsePayload(run?.output_ref) || {},
    }))
    .filter(entry => isCompletedRepairRun(entry.run))

  for (const entry of repairRuns) {
    const repairTime = recordTime(entry.run)
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

      const group = repaired.get('repair') || {
        count: 0,
        chapterNos: new Set<number>(),
        issueTypes: new Set<string>(),
        labels: new Set<string>(),
        latestTime: 0,
      }
      group.count += 1
      if (chapterNo > 0) group.chapterNos.add(chapterNo)
      group.issueTypes.add(issueType)
      group.labels.add(deliveryRiskIssueLabel(issueType))
      group.latestTime = Math.max(group.latestTime, recordTime(latestQuality || {}), resolvedAfter)
      repaired.set('repair', group)
    }
  }

  const evidence: Array<AutoCreationDeliveryRiskResolution & { latestTime: number }> = [...repaired.values()]
    .map(group => {
      const chapterNos = [...group.chapterNos].sort((a, b) => a - b)
      const labels = [...group.labels]
      return {
        label: '任务修复已清',
        count: group.count,
        chapterNos,
        issueTypes: [...group.issueTypes],
        detail: `${chapterNos.length ? `第${chapterNos.join('、')}章` : '相关章节'} ${labels.join('、') || '交稿'}风险已处理，后续质量复检通过。`,
        latestTime: group.latestTime,
      }
    })

  for (const review of args.reviews) {
    if (text(review?.review_type) !== 'delivery_risk_convergence') continue
    const payload = reviewPayload(review)
    const convergence = payload?.delivery_risk_convergence || payload?.result?.delivery_risk_convergence || payload?.result || payload
    const afterCount = Number(convergence?.after_count ?? convergence?.afterCount ?? convergence?.after?.total_count ?? 0)
    if (!(text(convergence?.status) === 'cleared' || afterCount === 0)) continue
    const chapterNo = payloadReviewChapterNo(review, { ...payload, chapter_no: payload?.chapter_no || convergence?.chapter_no })
    const beforeCount = Number(convergence?.before_count ?? convergence?.beforeCount ?? convergence?.before?.total_count ?? convergence?.resolved_count ?? convergence?.resolvedCount ?? 0)
    const count = Number.isFinite(beforeCount) && beforeCount > 0 ? beforeCount : 1
    const label = firstText(convergence?.label, convergence?.summary, '风险已清零')
    evidence.push({
      label: '复检收敛已清',
      count,
      chapterNos: chapterNo > 0 ? [chapterNo] : [],
      issueTypes: ['delivery_risk_convergence'],
      detail: `${chapterNo > 0 ? `第${chapterNo}章` : '相关章节'} ${label}，复检收敛显示风险清零。`,
      latestTime: recordTime(review),
    })
  }

  return evidence
    .sort((a, b) => b.latestTime - a.latestTime)
    .map(({ latestTime: _latestTime, ...item }) => item)
}

function latestDeliveryRiskReviews(reviews: AnyRecord[]) {
  const latest = new Map<string, AnyRecord>()
  for (const review of reviews) {
    const reviewType = text(review?.review_type)
    if (!DELIVERY_RISK_CONFIG[reviewType]) continue
    const payload = reviewPayload(review)
    const chapterId = payloadReviewChapterId(review, payload)
    const chapterNo = payloadReviewChapterNo(review, payload)
    const chapterKey = chapterId !== null && chapterId !== undefined
      ? `id:${chapterId}`
      : chapterNo > 0
        ? `no:${chapterNo}`
        : `review:${review?.id ?? latest.size}`
    const key = `${reviewType}:${chapterKey}`
    const current = latest.get(key)
    if (!current || recordTime(review) >= recordTime(current)) {
      latest.set(key, review)
    }
  }
  return Array.from(latest.values())
}

function buildDeliveryRiskGate(args: {
  reviews: AnyRecord[]
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
}): AutoCreationDeliveryRiskGate {
  const reviews = args.reviews
  const resolvedKeys = resolvedAnnotationKeys(reviews)
  const clearedChapters = clearedDeliveryRiskChapterKeys(reviews)
  const repairedIssueKeys = buildResolvedDeliveryRiskIssueKeys(args)
  const recentlyResolved = buildResolvedDeliveryRiskEvidence(args).slice(0, 4)
  const categoryMap = new Map<AutoCreationDeliveryRiskGateCategory['key'], AutoCreationDeliveryRiskGateCategory>()
  const topRisks: string[] = []

  for (const review of latestDeliveryRiskReviews(reviews)) {
    const reviewType = text(review?.review_type)
    const config = DELIVERY_RISK_CONFIG[reviewType]
    if (!config) continue
    const payload = reviewPayload(review)
    const risk = riskPayload(review, config.payloadKey)
    const count = Math.max(0, Number(config.count(review) || 0))
    if (count <= 0 && text(risk?.status) !== 'warn') continue
    const normalizedCount = Math.max(1, count)
    const chapterId = payloadReviewChapterId(review, payload)
    const chapterNo = payloadReviewChapterNo(review, payload)
    if (batchRiskIssueResolved(repairedIssueKeys, { chapterId, chapterNo, status: 'success' }, config.issueType)) continue
    const clearedAt = Math.max(
      chapterId !== null && chapterId !== undefined ? clearedChapters.get(`id:${chapterId}`) || 0 : 0,
      chapterNo > 0 ? clearedChapters.get(`no:${chapterNo}`) || 0 : 0,
    )
    if (clearedAt > recordTime(review)) continue
    const title = config.title(risk, normalizedCount)
    const annotationKey = deliveryRiskAnnotationKey({
      source: reviewType,
      reviewId: review?.id,
      chapterId,
      chapterNo,
      kind: config.kind,
      title,
    })
    if (resolvedKeys.has(annotationKey)) continue

    const high = config.high(risk, normalizedCount)
    const current = categoryMap.get(config.category) || {
      key: config.category,
      label: config.label,
      count: 0,
      highCount: 0,
    }
    current.count += normalizedCount
    if (high) current.highCount += normalizedCount
    categoryMap.set(config.category, current)
    topRisks.push(`${config.label}${chapterNo > 0 ? `第${chapterNo}章` : ''}：${config.message(risk)}`)
  }

  const categories = [...categoryMap.values()]
  const totalOpen = categories.reduce((sum, item) => sum + item.count, 0)
  const highOpen = categories.reduce((sum, item) => sum + item.highCount, 0)
  const status: AutoCreationDeliveryRiskGateStatus = highOpen > 0 ? 'block' : totalOpen > 0 ? 'warn' : 'ok'

  return {
    status,
    label: status === 'ok' ? '交稿风险已清' : status === 'block' ? `高风险 ${highOpen}` : `未清风险 ${totalOpen}`,
    summary: status === 'ok'
      ? '批注池没有未处理的交稿风险，可以按现有护栏推进。'
      : `批注池还有 ${totalOpen} 项交稿风险未清，其中高风险 ${highOpen} 项；先修正核心、追读、回报、创新、强场面、剧情线、剧情单元或可读性问题，再扩大连写批次。`,
    totalOpen,
    highOpen,
    categories,
    topRisks: topRisks.slice(0, 4),
    recentlyResolved,
  }
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

function rhythmFingerprint(value: any) {
  return text(value)
    .replace(/[，。！？、；：,.!?;:\s"'“”‘’《》（）()【】\[\]{}]/g, '')
    .slice(0, 80)
}

function batchPlanChapterForItem(batchBrief: AnyRecord | null | undefined, item: AutoCreationBatchReviewItem) {
  return arrayValue(batchBrief?.chapters)
    .find(plan => Number(plan?.chapter_no ?? plan?.chapterNo ?? 0) === Number(item.chapterNo)) || null
}

function repeatedRhythmDimension(args: {
  label: string
  values: string[]
  threshold: number
}) {
  const buckets = new Map<string, { value: string; count: number }>()
  for (const value of args.values) {
    const fingerprint = rhythmFingerprint(value)
    if (!fingerprint || fingerprint.length < 4) continue
    const existing = buckets.get(fingerprint)
    buckets.set(fingerprint, { value: existing?.value || value, count: (existing?.count || 0) + 1 })
  }
  const repeated = Array.from(buckets.values())
    .filter(item => item.count >= args.threshold)
    .sort((a, b) => b.count - a.count)[0]
  if (!repeated) return null
  return {
    label: args.label,
    value: repeated.value,
    count: repeated.count,
    risk: `${args.label}连续 ${repeated.count} 章重复：${repeated.value}`,
  }
}

function buildSerialRhythmReview(args: {
  items: AutoCreationBatchReviewItem[]
  chapters: AnyRecord[]
  nextBatchBrief?: AnyRecord | null
}) {
  const successfulItems = args.items.filter(item => item.status === 'success')
  if (successfulItems.length < 3) {
    return {
      status: 'ok' as const,
      score: 88,
      risk_count: 0,
      risks: [],
      evidence: [],
      dimensions: [],
    }
  }
  const rows = successfulItems.map(item => {
    const chapter = findChapter(args.chapters, item) || {}
    const raw = parsePayload(chapter.raw_payload || chapter.rawPayload) || chapter.raw_payload || chapter.rawPayload || {}
    const plan = batchPlanChapterForItem(args.nextBatchBrief, item) || {}
    return {
      chapter_no: item.chapterNo,
      title: item.title,
      conflict: firstText(chapter.conflict, raw.conflict, raw.core_conflict, plan.conflict),
      payoff: firstText(raw.payoff, raw.reader_payoff, raw.readerPayoff, plan.payoff, plan.reader_payoff, plan.readerPayoff, plan.chapter_payoff, plan.chapterPayoff),
      ending_hook: firstText(chapter.ending_hook, chapter.endingHook, chapter.hook, raw.ending_hook, raw.endingHook, raw.hook, plan.ending_hook, plan.endingHook),
      prose_seed: text(chapter.chapter_text).slice(0, 160),
    }
  })
  const threshold = Math.min(successfulItems.length, 3)
  const dimensions = [
    repeatedRhythmDimension({ label: '冲突来源', values: rows.map(row => row.conflict), threshold }),
    repeatedRhythmDimension({ label: '读者回报', values: rows.map(row => row.payoff), threshold }),
    repeatedRhythmDimension({ label: '章末钩子', values: rows.map(row => row.ending_hook), threshold }),
  ].filter(Boolean) as Array<{ label: string; value: string; count: number; risk: string }>

  const riskCount = dimensions.length
  return {
    status: riskCount > 0 ? 'warn' as const : 'ok' as const,
    score: Math.max(45, 90 - riskCount * 14),
    risk_count: riskCount,
    risks: dimensions.map(item => item.risk),
    evidence: rows.map(row => `第${row.chapter_no}章：${[row.conflict, row.payoff, row.ending_hook].filter(Boolean).join(' / ')}`).slice(0, 6),
    dimensions,
  }
}

function assetIntakePayload(review: AnyRecord | null) {
  const payload = reviewPayload(review)
  return payload?.asset_intake || payload?.result?.asset_intake || payload?.result || payload
}

function assetApplyExistsAfter(args: {
  reviews: AnyRecord[]
  chapter: AnyRecord
  chapterNo: number
  intakeReview: AnyRecord | null
}) {
  const intakeTime = recordTime(args.intakeReview || {})
  return args.reviews.some(review => {
    if (text(review?.review_type) !== 'asset_intake_apply') return false
    if (recordTime(review) < intakeTime) return false
    const payload = reviewPayload(review)
    const reviewChapterId = payload?.chapter_id ?? review?.chapter_id ?? null
    const reviewChapterNo = Number(payload?.chapter_no ?? review?.chapter_no ?? 0)
    const chapterId = args.chapter?.id ?? args.chapter?.chapter_id ?? null
    return chapterId !== null && reviewChapterId !== null
      ? String(chapterId) === String(reviewChapterId)
      : reviewChapterNo === args.chapterNo
  })
}

function buildAssetGrowthReview(args: {
  items: AutoCreationBatchReviewItem[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const successfulItems = args.items.filter(item => item.status === 'success')
  const pendingAssets: AnyRecord[] = []
  for (const item of successfulItems) {
    const chapter = findChapter(args.chapters, item)
    if (!chapter) continue
    const intakeReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'asset_intake')
    if (!intakeReview || assetApplyExistsAfter({ reviews: args.reviews, chapter, chapterNo: item.chapterNo, intakeReview })) continue
    const payload = assetIntakePayload(intakeReview)
    const appliedNames = new Set(arrayValue(payload?.applied_asset_names).map(name => text(name)).filter(Boolean))
    for (const asset of arrayValue(payload?.discovered_assets)) {
      const name = text(asset?.name)
      if (!name || appliedNames.has(name)) continue
      pendingAssets.push({
        chapter_no: item.chapterNo,
        chapter_id: item.chapterId,
        entity_type: text(asset?.entity_type || asset?.type, 'unknown'),
        name,
        summary: text(asset?.summary),
      })
    }
  }
  const budget = Math.max(3, successfulItems.length * 2)
  const overBudget = Math.max(0, pendingAssets.length - budget)
  const typeCounts = pendingAssets.reduce((acc: Record<string, number>, asset) => {
    const type = text(asset.entity_type, 'unknown')
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})
  return {
    status: overBudget > 0 ? 'warn' as const : 'ok' as const,
    budget,
    pending_count: pendingAssets.length,
    over_budget_count: overBudget,
    pending_assets: pendingAssets,
    type_counts: typeCounts,
    summary: overBudget > 0
      ? `本批发现 ${pendingAssets.length} 个新资产，超过预算 ${budget} 个。`
      : `本批新资产 ${pendingAssets.length}/${budget}，仍在预算内。`,
  }
}

function syncMissedItems(review: AnyRecord | null, payloadKey: string) {
  const payload = riskPayload(review, payloadKey)
  return [
    ...arrayValue(payload?.missed),
    ...arrayValue(payload?.debts),
  ].map(item => {
    if (typeof item === 'string') {
      return { label: text(item), text: text(item) }
    }
    return {
      key: firstText(item?.key, item?.id, item?.type, item?.kind),
      match_scope: firstText(item?.match_scope, item?.matchScope, item?.scope),
      label: firstText(item?.label, item?.title, item?.name, item?.key, item?.type, item?.text),
      text: firstText(item?.text, item?.description, item?.reason, item?.expected_state_change, item?.expectedStateChange, item?.label, item?.title, item?.name),
    }
  }).filter(item => item.label || item.text)
}

function isChapterHandoffMiss(item: AnyRecord) {
  const key = text(item?.key || item?.type || item?.kind).toLowerCase()
  const scope = text(item?.match_scope || item?.matchScope || item?.scope).toLowerCase()
  const content = [
    key,
    scope,
    text(item?.label || item?.title || item?.name),
    text(item?.text || item?.description || item?.reason),
  ].join(' ').toLowerCase()
  if (['opening_handoff', 'previous_handoff', 'chapter_handoff'].some(token => content.includes(token))) return true
  if (content.includes('handoff') && (content.includes('opening') || content.includes('previous') || content.includes('chapter'))) return true
  if (content.includes('上一章承接') || content.includes('上章承接') || content.includes('开篇承接') || content.includes('章节交接')) return true
  return scope === 'opening' && (content.includes('承接') || content.includes('上一章') || content.includes('上章'))
}

function chapterHandoffMissedItems(review: AnyRecord | null) {
  return syncMissedItems(review, 'reader_expectation_sync').filter(isChapterHandoffMiss)
}

function chapterHandoffRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  return chapterHandoffMissedItems(review).length
}

function buildChapterHandoffReview(args: {
  item: AutoCreationBatchReviewItem
  expectationReview: AnyRecord | null
}) {
  const missed = chapterHandoffMissedItems(args.expectationReview)
  return {
    status: missed.length > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: missed.length,
    missed,
    label: missed.length > 0 ? `章节交接漏接 ${missed.length}` : '章节交接正常',
  }
}

function buildReaderPullReview(args: {
  item: AutoCreationBatchReviewItem
  expectationReview: AnyRecord | null
  retentionReview: AnyRecord | null
}) {
  const expectationPayload = riskPayload(args.expectationReview, 'reader_expectation_sync')
  const retentionPayload = riskPayload(args.retentionReview, 'reader_retention_sync')
  const expectationCount = expectationRiskCount(args.expectationReview)
  const retentionCount = retentionRiskCount(args.retentionReview)
  const missed = [
    ...syncMissedItems(args.expectationReview, 'reader_expectation_sync'),
    ...syncMissedItems(args.retentionReview, 'reader_retention_sync'),
  ]
  return {
    status: expectationCount + retentionCount > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    expectation_count: expectationCount,
    retention_count: retentionCount,
    missed_count: expectationCount + retentionCount,
    missed,
    expectation_label: firstText(expectationPayload?.label, expectationCount > 0 ? `期待欠账 ${expectationCount}` : ''),
    retention_label: firstText(retentionPayload?.label, retentionCount > 0 ? `追读漏项 ${retentionCount}` : ''),
  }
}

function buildStoryDriveReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
}) {
  const payload = riskPayload(args.review, 'story_drive_sync')
  const count = storyDriveRiskCount(args.review)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: count,
    missed: syncMissedItems(args.review, 'story_drive_sync'),
    label: firstText(payload?.label, count > 0 ? `故事力缺口 ${count}` : ''),
    score: numberValue(payload?.score),
  }
}

function buildCharacterArcReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
}) {
  const payload = riskPayload(args.review, 'character_arc_sync')
  const count = characterArcRiskCount(args.review)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: count,
    missed: syncMissedItems(args.review, 'character_arc_sync'),
    label: firstText(payload?.label, count > 0 ? `人物弧光缺口 ${count}` : ''),
    score: numberValue(payload?.score),
  }
}

function buildStyleSampleReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
}) {
  const payload = riskPayload(args.review, 'style_sample_sync')
  const count = styleSampleRiskCount(args.review)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: count,
    missed: syncMissedItems(args.review, 'style_sample_sync'),
    copied_phrases: arrayValue(payload?.copied_phrases || payload?.copiedPhrases).map(item => text(item)).filter(Boolean),
    label: firstText(payload?.label, count > 0 ? `风格缺口 ${count}` : ''),
    score: numberValue(payload?.score),
  }
}

function buildChapterBenchmarkReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
}) {
  const payload = riskPayload(args.review, 'chapter_benchmark_sync')
  const count = chapterBenchmarkRiskCount(args.review)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: count,
    missed: syncMissedItems(args.review, 'chapter_benchmark_sync'),
    label: firstText(payload?.label, count > 0 ? `标杆章缺口 ${count}` : ''),
    score: numberValue(payload?.score),
    next_actions: arrayValue(payload?.next_actions || payload?.nextActions).map(item => text(item)).filter(Boolean),
  }
}

function buildChapterAttractionReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
}) {
  const payload = riskPayload(args.review, 'chapter_attraction_review')
  const count = chapterAttractionRiskCount(args.review)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    weak_count: count,
    weak_dimensions: chapterAttractionWeakDimensions(payload).map((item: any) => ({
      key: firstText(item?.key, item?.type),
      label: firstText(item?.label, item?.title, item?.key, '吸引力缺口'),
      status: firstText(item?.status),
      score: numberValue(item?.score),
      issue: firstText(item?.issue, item?.text, item?.reason, item?.repair_instruction, item?.repairInstruction),
    })),
    dimensions: arrayValue(payload?.dimensions),
    priority_repair: firstText(payload?.priority_repair, payload?.priorityRepair),
    label: firstText(payload?.label, count > 0 ? `吸引力缺口 ${count}` : ''),
    score: numberValue(payload?.score),
  }
}

function buildInnovationExecutionReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
}) {
  const payload = riskPayload(args.review, 'innovation_sync')
  const count = innovationRiskCount(args.review)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: count,
    missed: syncMissedItems(args.review, 'innovation_sync'),
    label: firstText(payload?.label, count > 0 ? `创新缺口 ${count}` : ''),
    score: numberValue(payload?.score),
  }
}

function volumeSegmentMissedItems(review: AnyRecord | null) {
  return syncMissedItems(review, 'volume_beat_sync')
}

function volumeSegmentRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'volume_beat_sync')
  const explicit = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (explicit !== null) return explicit
  const missed = volumeSegmentMissedItems(review).length
  return missed > 0 ? missed : riskCountFromStatus(payload, review)
}

function buildVolumeSegmentReview(args: {
  planning?: PlanningWorkspaceModel | null
  item: AutoCreationBatchReviewItem
  chapter?: AnyRecord | null
  review: AnyRecord | null
}) {
  const planning = args.planning
  const payload = riskPayload(args.review, 'volume_beat_sync')
  const gate = planning?.volumeSegmentGate || null
  const gateSignals = arrayValue(gate?.signals).filter(signal => text(signal?.status) !== 'ok')
  const raw = parsePayload(args.chapter?.raw_payload || args.chapter?.rawPayload) || args.chapter?.raw_payload || args.chapter?.rawPayload || {}
  const planned = [
    firstText(planning?.topStatus?.currentVolume) ? `当前卷：${firstText(planning?.topStatus?.currentVolume)}` : '',
    firstText(planning?.topStatus?.currentStage) ? `当前阶段：${firstText(planning?.topStatus?.currentStage)}` : '',
    firstText(planning?.mainline?.currentVolumeGoal) ? `当前卷目标：${firstText(planning?.mainline?.currentVolumeGoal)}` : '',
    firstText(planning?.mainline?.currentStageConflict) ? `阶段冲突：${firstText(planning?.mainline?.currentStageConflict)}` : '',
    ...gateSignals.map(signal => `${firstText(signal?.label, signal?.key)}：${firstText(signal?.detail)}`).filter(Boolean),
  ].filter(Boolean)
  const actual = [
    firstText(raw?.mainline_progress, raw?.mainlineProgress, args.chapter?.mainline_progress, args.chapter?.volume_stage)
      ? `本章主线进度：${firstText(raw?.mainline_progress, raw?.mainlineProgress, args.chapter?.mainline_progress, args.chapter?.volume_stage)}`
      : '',
    firstText(args.chapter?.conflict, raw?.conflict) ? `本章冲突：${firstText(args.chapter?.conflict, raw?.conflict)}` : '',
    firstText(raw?.payoff, raw?.reader_payoff, raw?.readerPayoff) ? `本章回报：${firstText(raw?.payoff, raw?.reader_payoff, raw?.readerPayoff)}` : '',
  ].filter(Boolean)
  const missed = volumeSegmentMissedItems(args.review)
  const missedCount = volumeSegmentRiskCount(args.review)
  return {
    status: missedCount > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: missedCount,
    planned,
    actual,
    missed,
    gate_summary: firstText(gate?.summary),
    review_label: firstText(payload?.label, missedCount > 0 ? `卷级阶段漏兑现 ${missedCount}` : '卷级阶段正常'),
  }
}

function batchRepairTask(args: {
  item: AutoCreationBatchReviewItem
  issueType: string
  taskType?: string
  severity: 'high' | 'medium'
  message: string
  action: string
  metrics: AnyRecord
  batchPlanContext?: AnyRecord | null
  batchPlanReview?: AnyRecord | null
  serialRhythmReview?: AnyRecord | null
  assetGrowthReview?: AnyRecord | null
  volumeSegmentReview?: AnyRecord | null
  readerTrialReview?: AnyRecord | null
  readerPullReview?: AnyRecord | null
  first30Retention?: AnyRecord | null
  chapterHandoffReview?: AnyRecord | null
  storyDriveSync?: AnyRecord | null
  characterArcSync?: AnyRecord | null
  innovationReview?: AnyRecord | null
  chapterAttractionReview?: AnyRecord | null
  chapterBenchmarkSync?: AnyRecord | null
  styleSampleSync?: AnyRecord | null
  batchChecklistExecution?: AnyRecord | null
  actionArea?: string
  actionKey?: string
}) {
  return {
    task_type: args.taskType || 'repair_quality',
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
    ...(args.actionArea ? { action_area: args.actionArea } : {}),
    ...(args.actionKey ? { action_key: args.actionKey } : {}),
    ...(args.batchPlanContext ? { batch_plan_context: args.batchPlanContext } : {}),
    ...(args.batchPlanReview ? { batch_plan_review: args.batchPlanReview } : {}),
    ...(args.serialRhythmReview ? { serial_rhythm_review: args.serialRhythmReview } : {}),
    ...(args.assetGrowthReview ? { asset_growth_review: args.assetGrowthReview } : {}),
    ...(args.volumeSegmentReview ? { volume_segment_review: args.volumeSegmentReview } : {}),
    ...(args.readerTrialReview ? { reader_trial_review: args.readerTrialReview } : {}),
    ...(args.readerPullReview ? { reader_pull_review: args.readerPullReview } : {}),
    ...(args.first30Retention ? { first30_retention: args.first30Retention } : {}),
    ...(args.chapterHandoffReview ? { chapter_handoff_review: args.chapterHandoffReview } : {}),
    ...(args.storyDriveSync ? { story_drive_sync: args.storyDriveSync } : {}),
    ...(args.characterArcSync ? { character_arc_sync: args.characterArcSync } : {}),
    ...(args.innovationReview ? { innovation_review: args.innovationReview } : {}),
    ...(args.chapterAttractionReview ? { chapter_attraction_review: args.chapterAttractionReview } : {}),
    ...(args.chapterBenchmarkSync ? { chapter_benchmark_sync: args.chapterBenchmarkSync } : {}),
    ...(args.styleSampleSync ? { style_sample_sync: args.styleSampleSync } : {}),
    ...(args.batchChecklistExecution ? { batch_checklist_execution: args.batchChecklistExecution } : {}),
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
  if (issueType === 'opening_handoff_debt' || issueType === 'reader_expectation_debt') {
    return ['opening_handoff_debt', 'reader_expectation_debt']
  }
  if (issueType === 'innovation_missed' || issueType === 'innovation_execution_missed') {
    return ['innovation_missed', 'innovation_execution_missed']
  }
  if (issueType === 'volume_beat_missed' || issueType === 'volume_segment_missed') {
    return ['volume_beat_missed', 'volume_segment_missed']
  }
  if ([
    'readability_risk',
    'readability_or_meme_risk',
    'opening_pull_risk',
    'ending_page_turn_risk',
    'scene_progression_risk',
    'payoff_density_risk',
  ].includes(issueType)) {
    return [
      'readability_risk',
      'readability_or_meme_risk',
      'opening_pull_risk',
      'ending_page_turn_risk',
      'scene_progression_risk',
      'payoff_density_risk',
    ]
  }
  return [issueType]
}

function batchRiskIssueResolved(keys: Set<string> | undefined, item: { chapterId: any; chapterNo: number }, issueType: string) {
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
    || arrayValue(batchBrief?.start_checklist || batchBrief?.startChecklist).length
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

function batchBriefStartChecklist(batchBrief: AnyRecord | null | undefined) {
  return arrayValue(batchBrief?.start_checklist || batchBrief?.startChecklist)
    .map(item => ({
      key: firstText(item?.key, item?.id, item?.type),
      label: firstText(item?.label, item?.name, item?.title, item?.key, '开工项'),
      detail: firstText(item?.detail, item?.summary, item?.description),
      status: firstText(item?.status),
    }))
    .filter(item => item.key || item.label || item.detail)
    .slice(0, 8)
}

function checklistRiskReasons(key: string, counts: {
  coreRiskTotal: number
  runwayRiskTotal: number
  payoffDebtTotal: number
  readerPullRiskTotal: number
  handoffRiskTotal: number
  storylineRiskTotal: number
  storyDriveRiskTotal: number
  innovationRiskTotal: number
  signatureSceneRiskTotal: number
  chapterAttractionRiskTotal: number
  forbiddenBoundaryRiskTotal: number
  batchPlanRiskTotal: number
}) {
  if (key === 'core_promise') {
    return [
      counts.coreRiskTotal > 0 ? `核心偏移 ${counts.coreRiskTotal}` : '',
      counts.runwayRiskTotal > 0 ? `航线风险 ${counts.runwayRiskTotal}` : '',
    ].filter(Boolean)
  }
  if (key === 'story_drive') {
    return [
      counts.storyDriveRiskTotal > 0 ? `故事力缺口 ${counts.storyDriveRiskTotal}` : '',
      counts.chapterAttractionRiskTotal > 0 ? `吸引力缺口 ${counts.chapterAttractionRiskTotal}` : '',
    ].filter(Boolean)
  }
  if (key === 'reader_payoff') {
    return [
      counts.payoffDebtTotal > 0 ? `回报欠账 ${counts.payoffDebtTotal}` : '',
      counts.readerPullRiskTotal > 0 ? `读者拉力漏项 ${counts.readerPullRiskTotal}` : '',
      counts.handoffRiskTotal > 0 ? `章节交接漏接 ${counts.handoffRiskTotal}` : '',
    ].filter(Boolean)
  }
  if (key === 'innovation') {
    return [
      counts.innovationRiskTotal > 0 ? `创新缺口 ${counts.innovationRiskTotal}` : '',
      counts.signatureSceneRiskTotal > 0 ? `强场面漏写 ${counts.signatureSceneRiskTotal}` : '',
    ].filter(Boolean)
  }
  if (key === 'forbidden_boundary') {
    return [
      counts.forbiddenBoundaryRiskTotal > 0 ? `禁揭触碰 ${counts.forbiddenBoundaryRiskTotal}` : '',
      counts.storylineRiskTotal > 0 ? `剧情线误触/漏推 ${counts.storylineRiskTotal}` : '',
    ].filter(Boolean)
  }
  return counts.batchPlanRiskTotal > 0 ? [`批次计划风险 ${counts.batchPlanRiskTotal}`] : []
}

function buildBatchChecklistExecution(args: {
  nextBatchBrief?: AnyRecord | null
  counts: {
    coreRiskTotal: number
    runwayRiskTotal: number
    payoffDebtTotal: number
    readerPullRiskTotal: number
    handoffRiskTotal: number
    storylineRiskTotal: number
    storyDriveRiskTotal: number
    innovationRiskTotal: number
    signatureSceneRiskTotal: number
    chapterAttractionRiskTotal: number
    forbiddenBoundaryRiskTotal: number
    batchPlanRiskTotal: number
  }
}): AutoCreationBatchChecklistExecution {
  const checklist = batchBriefStartChecklist(args.nextBatchBrief)
  if (!checklist.length) {
    return {
      visible: false,
      status: 'ok',
      score: 100,
      summary: '本批没有开工清单。',
      items: [],
      missed: [],
    }
  }
  const items: AutoCreationBatchChecklistExecutionItem[] = checklist.map(item => {
    const reasons = checklistRiskReasons(item.key, args.counts)
    const status: AutoCreationBatchRiskStatus = reasons.length > 0 ? 'warn' : 'ok'
    return {
      key: item.key,
      label: item.label,
      status,
      planned: item.detail,
      detail: status === 'warn'
        ? `未完全兑现：${item.detail || item.label}；关联风险：${reasons.join('、')}`
        : `已兑现：${item.detail || item.label}`,
      evidence: reasons,
    }
  })
  const missed = items.filter(item => item.status === 'warn')
  const score = checklist.length > 0 ? clampScore(((items.length - missed.length) / items.length) * 100) : 100
  return {
    visible: true,
    status: missed.length > 0 ? 'warn' : 'ok',
    score,
    summary: missed.length > 0
      ? `批次开工清单 ${items.length - missed.length}/${items.length} 项兑现，${missed.length} 项需要修复。`
      : `批次开工清单 ${items.length}/${items.length} 项兑现。`,
    items,
    missed,
  }
}

function first30RetentionAppliesToBatch(items: AutoCreationBatchReviewItem[]) {
  return items.some(item => {
    const chapterNo = Number(item.chapterNo || 0)
    return chapterNo > 0 && chapterNo <= 30
  })
}

function first30RetentionRisk(args: {
  first30Retention?: PlanningWorkspaceModel['first30Retention'] | null
  items: AutoCreationBatchReviewItem[]
}) {
  const retention = args.first30Retention
  const status = text(retention?.status)
  if (!first30RetentionAppliesToBatch(args.items) || !['stale', 'needs_repair', 'blocked'].includes(status)) {
    return {
      count: 0,
      summary: '当前批次不需要前30章留存复诊',
      context: null as AnyRecord | null,
    }
  }
  const risks = arrayValue(retention?.risks)
  const riskyCards = arrayValue(retention?.chapterCards).filter(card => text(card?.riskLevel) && text(card?.riskLevel) !== 'ok')
  const count = Math.max(1, risks.length, riskyCards.length)
  const nextActions = arrayValue(retention?.nextActions).map(action => text(action)).filter(Boolean)
  return {
    count,
    summary: text(retention?.summary, status === 'stale' ? '需重新诊断：前30章内容已更新。' : '前30章留存诊断需要处理。'),
    context: {
      status,
      score: retention?.score ?? null,
      stale: Boolean(retention?.stale),
      summary: text(retention?.summary),
      action_key: text(retention?.actionKey, status === 'stale' ? 'run_first30_retention' : 'create_first30_repair'),
      risks,
      next_actions: nextActions,
      risky_chapters: riskyCards.map(card => ({
        chapter_no: Number(card?.chapterNo ?? card?.chapter_no ?? 0) || null,
        title: text(card?.title),
        score: card?.score ?? null,
        flags: arrayValue(card?.flags).map(flag => text(flag)).filter(Boolean),
        risk_level: text(card?.riskLevel),
      })),
    },
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
  planning?: PlanningWorkspaceModel | null
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
  let runwayRiskTotal = 0
  let payoffDebtTotal = 0
  let readerPullRiskTotal = 0
  let readerTrialRiskTotal = 0
  let first30RetentionRiskTotal = 0
  let handoffRiskTotal = 0
  let storylineRiskTotal = 0
  let storyDriveRiskTotal = 0
  let characterArcRiskTotal = 0
  let innovationRiskTotal = 0
  let signatureSceneRiskTotal = 0
  let chapterAttractionRiskTotal = 0
  let chapterBenchmarkRiskTotal = 0
  let styleSampleRiskTotal = 0
  let readabilityRiskTotal = 0
  let volumeSegmentRiskTotal = 0
  let forbiddenBoundaryRiskTotal = 0
  const handoffRiskLabels: string[] = []
  const serialRhythmReview = buildSerialRhythmReview({
    items: successfulItems,
    chapters: args.chapters,
    nextBatchBrief: args.nextBatchBrief,
  })
  const serialRhythmResolved = successfulItems.length > 0 && batchRiskIssueResolved(args.resolvedIssueKeys, successfulItems[0], 'serial_rhythm_fatigue')
  const serialRhythmRiskTotal = serialRhythmResolved ? 0 : Number(serialRhythmReview.risk_count || 0)
  const assetGrowthReview = buildAssetGrowthReview({
    items: successfulItems,
    chapters: args.chapters,
    reviews: args.reviews,
  })
  const assetGrowthResolved = successfulItems.length > 0 && batchRiskIssueResolved(args.resolvedIssueKeys, successfulItems[0], 'asset_growth_over_budget')
  const assetGrowthRiskTotal = assetGrowthResolved ? 0 : Number(assetGrowthReview.over_budget_count || 0)
  const readerTrialReview = readerTrialBatchReview({
    items: successfulItems,
    review: latestReaderTrialReview(args.reviews),
  })
  const readerTrialRiskItem = successfulItems.find(item => {
    const chapterNo = Number(item.chapterNo || 0)
    return readerTrialReview.drop_points.some(dropPoint => readerTrialAppliesToBatch(dropPoint, new Set([chapterNo])))
  }) || successfulItems.find(item => Number(item.chapterNo || 0) <= 30) || successfulItems[0] || null
  readerTrialRiskTotal = readerTrialRiskItem && !batchRiskIssueResolved(args.resolvedIssueKeys, readerTrialRiskItem, 'reader_trial_drop_point')
    ? Number(readerTrialReview.risk_count || 0)
    : 0
  const first30RetentionRiskReview = first30RetentionRisk({
    first30Retention: args.planning?.first30Retention,
    items: successfulItems,
  })
  const first30RetentionRiskItem = successfulItems.find(item => {
    const chapterNo = Number(item.chapterNo || 0)
    return chapterNo > 0 && chapterNo <= 30
  }) || successfulItems[0] || null
  first30RetentionRiskTotal = first30RetentionRiskItem && !batchRiskIssueResolved(args.resolvedIssueKeys, first30RetentionRiskItem, 'first30_retention_recheck')
    ? Number(first30RetentionRiskReview.count || 0)
    : 0
  let batchPlanRiskTotal = 0
  const repairTasks: AnyRecord[] = []

  for (const item of successfulItems) {
    const chapter = findChapter(args.chapters, item)
    if (!chapter) continue
    const coreReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'chapter_core_drift')
    const runwayReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'runway_sync')
    const payoffReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_payoff_sync')
    const expectationReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_expectation_sync')
    const retentionReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_retention_sync')
    const storylineReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'storyline_sync')
    const storyDriveReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'story_drive_sync')
    const characterArcReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'character_arc_sync')
    const innovationReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'innovation_sync')
    const signatureSceneReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'signature_scene_sync')
    const chapterAttractionReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'chapter_attraction_review')
    const chapterBenchmarkReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'chapter_benchmark_sync')
    const styleSampleReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'style_sample_sync')
    const readabilityReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'readability_review')
    const volumeSegmentReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'volume_beat_sync')
    const qualityReview = latestQualityReviewForChapter(args.reviews, chapter, item.chapterNo)
    const quality = qualityPayload(qualityReview)
    const qualityScore = numberValue(quality?.score ?? quality?.overall_score ?? quality?.quality_score ?? item.score)
    const coreCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'core_drift') ? 0 : coreRiskCount(coreReview)
    const runwayCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'runway_sync_risk') ? 0 : runwayRiskCount(runwayReview)
    const payoffCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'reader_payoff_debt') ? 0 : payoffDebtCount(payoffReview)
    const chapterHandoffReview = buildChapterHandoffReview({ item, expectationReview })
    const handoffResolved = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'chapter_handoff_missed')
    const expectationCount = Math.max(0, expectationRiskCount(expectationReview) - (handoffResolved ? chapterHandoffReview.missed_count : 0))
    const readerPullCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'reader_pull_missed')
      ? 0
      : expectationCount + retentionRiskCount(retentionReview)
    const handoffCount = handoffResolved ? 0 : chapterHandoffReview.missed_count
    const storylineCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'storyline_sync_risk') ? 0 : storylineRiskCount(storylineReview)
    const storylinePayload = riskPayload(storylineReview, 'storyline_sync')
    const forbiddenCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'storyline_sync_risk')
      ? 0
      : arrayValue(storylinePayload?.forbidden_touched || storylinePayload?.forbiddenTouched).length
    const storyDriveCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'story_drive_gap') ? 0 : storyDriveRiskCount(storyDriveReview)
    const characterArcCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'character_arc_gap') ? 0 : characterArcRiskCount(characterArcReview)
    const innovationCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'innovation_execution_missed') ? 0 : innovationRiskCount(innovationReviewRef)
    const signatureSceneCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'signature_scene_missed') ? 0 : signatureSceneRiskCount(signatureSceneReview)
    const chapterAttractionCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'chapter_attraction_gap') ? 0 : chapterAttractionRiskCount(chapterAttractionReviewRef)
    const chapterBenchmarkCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'chapter_benchmark_gap') ? 0 : chapterBenchmarkRiskCount(chapterBenchmarkReviewRef)
    const styleSampleCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'style_sample_gap') ? 0 : styleSampleRiskCount(styleSampleReviewRef)
    const readabilityCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'readability_risk') ? 0 : readabilityRiskCount(readabilityReview)
    const volumeSegmentCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'volume_segment_missed') ? 0 : volumeSegmentRiskCount(volumeSegmentReviewRef)
    const batchPlanCount = batchBriefAppliesToItem(args.nextBatchBrief, item) && !batchRiskIssueResolved(args.resolvedIssueKeys, item, 'batch_brief_mismatch')
      ? coreCount + payoffCount + storylineCount
      : 0
    const lowQuality = qualityScore !== null && qualityScore < BATCH_DELIVERY_QUALITY_THRESHOLD

    coreRiskTotal += coreCount
    runwayRiskTotal += runwayCount
    payoffDebtTotal += payoffCount
    readerPullRiskTotal += readerPullCount
    handoffRiskTotal += handoffCount
    storylineRiskTotal += storylineCount
    forbiddenBoundaryRiskTotal += forbiddenCount
    storyDriveRiskTotal += storyDriveCount
    characterArcRiskTotal += characterArcCount
    innovationRiskTotal += innovationCount
    signatureSceneRiskTotal += signatureSceneCount
    chapterAttractionRiskTotal += chapterAttractionCount
    chapterBenchmarkRiskTotal += chapterBenchmarkCount
    styleSampleRiskTotal += styleSampleCount
    readabilityRiskTotal += readabilityCount
    volumeSegmentRiskTotal += volumeSegmentCount
    batchPlanRiskTotal += batchPlanCount
    if (handoffCount > 0) {
      handoffRiskLabels.push(...chapterHandoffReview.missed.map((missed: any) => firstText(missed?.label, missed?.text)).filter(Boolean))
    }

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
    if (runwayCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'runway_sync_risk',
        severity: runwayCount >= 2 ? 'high' : 'medium',
        message: `百万字航线风险 ${runwayCount} 项，本章可能没有兑现四问、读者燃料或红线约束。`,
        action: '对照百万字航线重修本章四问、读者燃料和红线约束，确认当前章服务长期主线、追读承诺和创新差异。',
        metrics: { runway_risk_count: runwayCount },
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
    if (readerPullCount > 0) {
      const readerPullReview = buildReaderPullReview({
        item,
        expectationReview,
        retentionReview,
      })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'reader_pull_missed',
        severity: readerPullCount >= 2 ? 'high' : 'medium',
        message: `读者期待或追读漏兑现 ${readerPullCount} 项，连续阅读动力不足。`,
        action: '补齐本章承诺的期待兑现、追读问题和下一章动力；让读者清楚知道本章爽点已交付、下一章为什么必须继续看。',
        metrics: { reader_pull_risk_count: readerPullCount },
        readerPullReview,
      }))
    }
    if (handoffCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'chapter_handoff_missed',
        severity: handoffCount >= 2 ? 'high' : 'medium',
        message: `章节交接漏接 ${handoffCount} 项，开篇没有接住上一章悬念、压力或读者期待。`,
        action: '重修本章开篇300字和第一场景，必须落地上一章交接契约中的压力、悬念、keep_alive问题或显性回报。',
        metrics: { handoff_risk_count: handoffCount },
        chapterHandoffReview,
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
    if (storyDriveCount > 0) {
      const storyDriveSync = buildStoryDriveReview({ item, review: storyDriveReview })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'story_drive_gap',
        severity: storyDriveCount >= 3 ? 'high' : 'medium',
        message: `故事驱动力缺口 ${storyDriveCount} 项，本章可能只有事件推进，缺少主角主动选择和代价反馈。`,
        action: '补出主角主动选择、明确阻碍、选择代价、局面变化和下一步因果，避免章节只有事件没有人物决策。',
        metrics: { story_drive_risk_count: storyDriveCount },
        storyDriveSync,
      }))
    }
    if (characterArcCount > 0) {
      const characterArcSync = buildCharacterArcReview({ item, review: characterArcReview })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'character_arc_gap',
        severity: characterArcCount >= 3 ? 'high' : 'medium',
        message: `人物弧光缺口 ${characterArcCount} 项，本章可能只有事件推进但人物欲望、缺陷或关系没有变化。`,
        action: '补出角色欲望、缺陷受压、关系变化、成长节点和口吻锚点。',
        metrics: { character_arc_risk_count: characterArcCount },
        characterArcSync,
      }))
    }
    if (innovationCount > 0) {
      const innovationReview = buildInnovationExecutionReview({
        item,
        review: innovationReviewRef,
      })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'innovation_execution_missed',
        severity: innovationCount >= 2 ? 'high' : 'medium',
        message: `创新/IP化执行漏兑现 ${innovationCount} 项，本章新鲜感或传播场面不足。`,
        action: '补齐本书差异化机制、反差体验和可视化传播场面；让创新点落成读者能复述的事件，而不是只停留在设定说明。',
        metrics: { innovation_risk_count: innovationCount },
        innovationReview,
      }))
    }
    if (signatureSceneCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'signature_scene_missed',
        severity: 'high',
        message: `强场面漏写 ${signatureSceneCount} 项，本章开写任务书要求的记忆点没有落成可视化场面。`,
        action: '补回开写任务书指定的标志性场面，把它写成可视化动作、空间冲突、规则代价、公开反转或读者可讨论的选择。',
        metrics: { signature_scene_risk_count: signatureSceneCount },
      }))
    }
    if (chapterAttractionCount > 0) {
      const chapterAttractionReview = buildChapterAttractionReview({ item, review: chapterAttractionReviewRef })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'chapter_attraction_gap',
        severity: chapterAttractionCount >= 3 ? 'high' : 'medium',
        message: `章节吸引力执行缺口 ${chapterAttractionCount} 项，本章开篇钩子、场景推进、爽点密度、章末翻页或传播场面不足。`,
        action: '按吸引力执行器重修开篇钩子、场景目标/阻碍/转折/回报、爽点密度、章末翻页和可传播场面。',
        metrics: { chapter_attraction_risk_count: chapterAttractionCount },
        chapterAttractionReview,
      }))
    }
    if (chapterBenchmarkCount > 0) {
      const chapterBenchmarkSync = buildChapterBenchmarkReview({ item, review: chapterBenchmarkReviewRef })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'chapter_benchmark_gap',
        severity: chapterBenchmarkCount >= 3 ? 'high' : 'medium',
        message: `标杆章/质量基准执行缺口 ${chapterBenchmarkCount} 项，本章开篇、冲突、爽点、场景节拍或章末追读没有按基准落地。`,
        action: '按章节标杆重修本章结构：补足开篇钩子、冲突推进、爽点兑现、场景节拍和章末追读；只学习标杆方法，不复制桥段。',
        metrics: { chapter_benchmark_risk_count: chapterBenchmarkCount },
        chapterBenchmarkSync,
      }))
    }
    if (styleSampleCount > 0) {
      const styleSampleSync = buildStyleSampleReview({ item, review: styleSampleReviewRef })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'style_sample_gap',
        severity: styleSampleSync.copied_phrases.length > 0 || styleSampleCount >= 3 ? 'high' : 'medium',
        message: `风格样章执行缺口 ${styleSampleCount} 项，本章文气、句式、对白比例或照搬风险需要修复。`,
        action: '按风格样章重修叙述节奏、句式密度、对白比例和角色口吻；只学习抽象方法，不得照搬样章原句。',
        metrics: { style_sample_risk_count: styleSampleCount },
        styleSampleSync,
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
    if (volumeSegmentCount > 0) {
      const volumeSegmentReview = buildVolumeSegmentReview({
        planning: args.planning,
        item,
        chapter,
        review: volumeSegmentReviewRef,
      })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'volume_segment_missed',
        severity: volumeSegmentCount >= 2 ? 'high' : 'medium',
        message: `卷级阶段验收漏兑现 ${volumeSegmentCount} 项，本章可能没有结算当前卷目标或阶段身份变化。`,
        action: '对照当前卷目标、阶段冲突和卷级爆点预算重修本章；把漏掉的身份变化、阶段结算、关键入场或阶段回报写成可见结果。',
        metrics: { volume_segment_risk_count: volumeSegmentCount },
        volumeSegmentReview,
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
  const batchChecklistExecution = buildBatchChecklistExecution({
    nextBatchBrief: args.nextBatchBrief,
    counts: {
      coreRiskTotal,
      runwayRiskTotal,
      payoffDebtTotal,
      readerPullRiskTotal,
      handoffRiskTotal,
      storylineRiskTotal,
      storyDriveRiskTotal,
      innovationRiskTotal,
      signatureSceneRiskTotal,
      chapterAttractionRiskTotal,
      forbiddenBoundaryRiskTotal,
      batchPlanRiskTotal,
    },
  })
  const batchChecklistResolved = successfulItems.length > 0 && batchRiskIssueResolved(args.resolvedIssueKeys, successfulItems[0], 'batch_checklist_mismatch')
  const batchChecklistRiskTotal = batchChecklistResolved ? 0 : batchChecklistExecution.missed.length
  const effectiveBatchChecklistExecution = batchChecklistResolved && batchChecklistExecution.visible
    ? {
      ...batchChecklistExecution,
      status: 'ok' as const,
      score: 100,
      summary: '批次开工清单风险已修复并通过复检。',
      items: batchChecklistExecution.items.map(item => ({ ...item, status: 'ok' as const })),
      missed: [],
    }
    : batchChecklistExecution
  if (batchChecklistRiskTotal > 0 && successfulItems.length > 0) {
    repairTasks.push(batchRepairTask({
      item: successfulItems[0],
      issueType: 'batch_checklist_mismatch',
      severity: batchChecklistRiskTotal >= 3 ? 'high' : 'medium',
      message: `批次开工清单 ${batchChecklistRiskTotal} 项未兑现，连续生产可能偏离万订护栏。`,
      action: '按批次开工清单重修本批：先修核心承诺、故事驱动力、读者回报、创新记忆点和禁写边界，再复查整批交稿。',
      metrics: {
        batch_checklist_risk_count: batchChecklistRiskTotal,
        score: batchChecklistExecution.score,
      },
      batchChecklistExecution,
    }))
  }
  if (serialRhythmRiskTotal > 0 && successfulItems.length > 0) {
    const firstItem = successfulItems[0]
    repairTasks.push(batchRepairTask({
      item: firstItem,
      issueType: 'serial_rhythm_fatigue',
      severity: serialRhythmRiskTotal >= 2 ? 'high' : 'medium',
      message: `本批存在 ${serialRhythmRiskTotal} 项连载节奏同质化，连续阅读容易疲劳。`,
      action: '按批次重修节奏：轮换冲突来源、读者回报、章末追读问题和可视化场面，再复查整批连载读感。',
      metrics: { serial_rhythm_risk_count: serialRhythmRiskTotal, score: serialRhythmReview.score },
      serialRhythmReview,
    }))
  }
  if (assetGrowthRiskTotal > 0 && successfulItems.length > 0) {
    const firstItem = successfulItems[0]
    repairTasks.push(batchRepairTask({
      item: firstItem,
      issueType: 'asset_growth_over_budget',
      taskType: 'repair_assets',
      severity: assetGrowthReview.pending_count >= assetGrowthReview.budget + 4 ? 'high' : 'medium',
      message: `本批发现 ${assetGrowthReview.pending_count} 个新资产，超过预算 ${assetGrowthReview.budget}，存在设定膨胀风险。`,
      action: '进入设定工坊，把本批新资产逐项确认入库、合并或删除；只保留服务当前卷目标和读者承诺的资产。',
      metrics: {
        asset_growth_risk_count: assetGrowthRiskTotal,
        pending_asset_count: assetGrowthReview.pending_count,
        asset_budget: assetGrowthReview.budget,
      },
      assetGrowthReview,
      actionArea: 'assets',
      actionKey: 'open_story_assets',
    }))
  }
  if (readerTrialRiskTotal > 0 && readerTrialRiskItem) {
    repairTasks.push(batchRepairTask({
      item: readerTrialRiskItem,
      issueType: 'reader_trial_drop_point',
      severity: readerTrialReview.score !== null && readerTrialReview.score < 65 || readerTrialRiskTotal >= 3 ? 'high' : 'medium',
      message: `读者试读复盘发现 ${readerTrialRiskTotal} 个当前批次弃读点，可能影响前30章留存和付费转化。`,
      action: '按试读复盘重修命中章节：删减拖慢阅读的解释，把弃读点改成现场冲突、信息增量、爽点兑现或章末翻页问题。',
      metrics: { reader_trial_risk_count: readerTrialRiskTotal, score: readerTrialReview.score },
      readerTrialReview,
    }))
  }
  if (first30RetentionRiskTotal > 0 && first30RetentionRiskItem) {
    const actionKey = text(first30RetentionRiskReview.context?.action_key, 'run_first30_retention')
    repairTasks.push(batchRepairTask({
      item: first30RetentionRiskItem,
      issueType: 'first30_retention_recheck',
      taskType: actionKey === 'create_first30_repair' ? 'repair_planning' : 'review_planning',
      severity: text(first30RetentionRiskReview.context?.status) === 'blocked' || first30RetentionRiskTotal >= 3 ? 'high' : 'medium',
      message: `前30章留存状态需要处理：${first30RetentionRiskReview.summary}`,
      action: actionKey === 'create_first30_repair'
        ? '生成前30章留存修复任务，优先处理开篇钩子、试读闭环和付费前蓄势。'
        : '重新运行前30章留存诊断，确认本批修改后的开篇三章、试读十章和付费前蓄势。',
      metrics: {
        first30_retention_risk_count: first30RetentionRiskTotal,
        score: first30RetentionRiskReview.context?.score ?? null,
      },
      first30Retention: first30RetentionRiskReview.context,
      actionArea: 'planning',
      actionKey,
    }))
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
      key: 'runway',
      label: '航线风险',
      status: runwayRiskTotal > 0 ? 'warn' : 'ok',
      detail: runwayRiskTotal > 0 ? `航线风险 ${runwayRiskTotal} 项，四问、读者燃料或红线约束未闭环` : '百万字航线兑现正常',
    },
    {
      key: 'payoff',
      label: '回报欠账',
      status: payoffDebtTotal > 0 ? 'warn' : 'ok',
      detail: payoffDebtTotal > 0 ? `累计 ${payoffDebtTotal} 项读者回报欠账` : '读者回报已兑现',
    },
    {
      key: 'reader_pull',
      label: '读者拉力',
      status: readerPullRiskTotal > 0 ? 'warn' : 'ok',
      detail: readerPullRiskTotal > 0 ? `读者拉力漏项 ${readerPullRiskTotal} 项，期待兑现或追读钩子不足` : '期待兑现和追读动力正常',
    },
    {
      key: 'reader_trial',
      label: '试读',
      status: readerTrialRiskTotal > 0 ? 'warn' : 'ok',
      detail: readerTrialRiskTotal > 0
        ? `试读弃读点 ${readerTrialRiskTotal} 个：${readerTrialReview.drop_points.slice(0, 2).join('；') || readerTrialReview.summary}`
        : '当前批次未命中试读弃读点',
    },
    {
      key: 'first30_retention',
      label: '前30章',
      status: first30RetentionRiskTotal > 0 ? 'warn' : 'ok',
      detail: first30RetentionRiskTotal > 0
        ? first30RetentionRiskReview.summary
        : '前30章留存诊断未阻塞当前批次',
    },
    {
      key: 'handoff',
      label: '章节交接',
      status: handoffRiskTotal > 0 ? 'warn' : 'ok',
      detail: handoffRiskTotal > 0
        ? `章节交接漏接 ${handoffRiskTotal} 项：${handoffRiskLabels.slice(0, 2).join('、') || '开篇承接未落地'}`
        : '上一章悬念、压力和本章开篇承接正常',
    },
    {
      key: 'storyline',
      label: '剧情线',
      status: storylineRiskTotal > 0 ? 'warn' : 'ok',
      detail: storylineRiskTotal > 0 ? `剧情线漏推/误触 ${storylineRiskTotal} 项` : '剧情线推进正常',
    },
    {
      key: 'story_drive',
      label: '故事力',
      status: storyDriveRiskTotal > 0 ? 'warn' : 'ok',
      detail: storyDriveRiskTotal > 0 ? `故事驱动力缺口 ${storyDriveRiskTotal} 项，主角选择、代价或状态变化不足` : '主角选择链和因果推进正常',
    },
    {
      key: 'character_arc',
      label: '人物弧光',
      status: characterArcRiskTotal > 0 ? 'warn' : 'ok',
      detail: characterArcRiskTotal > 0 ? `人物弧光缺口 ${characterArcRiskTotal} 项，欲望、缺陷、关系或成长节点不足` : '人物成长和关系变化正常',
    },
    {
      key: 'innovation',
      label: '创新/IP',
      status: innovationRiskTotal > 0 ? 'warn' : 'ok',
      detail: innovationRiskTotal > 0 ? `创新/IP化执行缺口 ${innovationRiskTotal} 项` : '创新点和可传播场面执行正常',
    },
    {
      key: 'signature_scene',
      label: '强场面',
      status: signatureSceneRiskTotal > 0 ? 'warn' : 'ok',
      detail: signatureSceneRiskTotal > 0 ? `强场面漏写 ${signatureSceneRiskTotal} 项，章节记忆点或短剧化场面不足` : '标志性场面兑现正常',
    },
    {
      key: 'chapter_attraction',
      label: '吸引力',
      status: chapterAttractionRiskTotal > 0 ? 'warn' : 'ok',
      detail: chapterAttractionRiskTotal > 0 ? `章节吸引力缺口 ${chapterAttractionRiskTotal} 项，开篇、场景推进、爽点或章末翻页需修复` : '章节吸引力执行正常',
    },
    {
      key: 'chapter_benchmark',
      label: '标杆章',
      status: chapterBenchmarkRiskTotal > 0 ? 'warn' : 'ok',
      detail: chapterBenchmarkRiskTotal > 0 ? `标杆章/质量基准缺口 ${chapterBenchmarkRiskTotal} 项，开篇、冲突、爽点、节拍或章末追读需修复` : '章节标杆结构执行正常',
    },
    {
      key: 'style_sample',
      label: '风格',
      status: styleSampleRiskTotal > 0 ? 'warn' : 'ok',
      detail: styleSampleRiskTotal > 0 ? `风格样章执行缺口 ${styleSampleRiskTotal} 项，文气、句式、对白比例或照搬风险需修复` : '风格样章执行正常',
    },
    {
      key: 'readability',
      label: '可读性',
      status: readabilityRiskTotal > 0 ? 'warn' : 'ok',
      detail: readabilityRiskTotal > 0 ? `可读性/出戏风险 ${readabilityRiskTotal} 项` : '可读性风险可控',
    },
    {
      key: 'serial_rhythm',
      label: '连载节奏',
      status: serialRhythmRiskTotal > 0 ? 'warn' : 'ok',
      detail: serialRhythmRiskTotal > 0
        ? `连载节奏同质化 ${serialRhythmRiskTotal} 项：${serialRhythmReview.dimensions.map((item: any) => item.label).join('、')}`
        : '冲突来源、读者回报和章末钩子轮换正常',
    },
    {
      key: 'asset_growth',
      label: '新资产',
      status: assetGrowthRiskTotal > 0 ? 'warn' : 'ok',
      detail: assetGrowthRiskTotal > 0
        ? `新资产待确认 ${assetGrowthReview.pending_count} 个，超过本批预算 ${assetGrowthReview.budget} 个`
        : assetGrowthReview.summary,
    },
    {
      key: 'volume_segment',
      label: '卷段验收',
      status: volumeSegmentRiskTotal > 0 ? 'warn' : 'ok',
      detail: volumeSegmentRiskTotal > 0
        ? `阶段验收漏兑现 ${volumeSegmentRiskTotal} 项，当前批次不能直接放行下一批`
        : '当前卷/阶段目标未发现漏结算风险',
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
  if (effectiveBatchChecklistExecution.visible) {
    signals.push({
      key: 'batch_checklist',
      label: '开工清单',
      status: batchChecklistRiskTotal > 0 ? 'warn' : 'ok',
      detail: batchChecklistRiskTotal > 0
        ? `批次开工清单 ${batchChecklistRiskTotal} 项未兑现，兑现分 ${effectiveBatchChecklistExecution.score}`
        : `批次开工清单兑现分 ${effectiveBatchChecklistExecution.score}`,
    })
  }
  const status: AutoCreationBatchRiskStatus = signals.some(signal => signal.status === 'warn') ? 'warn' : 'ok'

  return {
    status,
    averageQualityScore,
    lowQualityCount,
    coreRiskCount: coreRiskTotal,
    runwayRiskCount: runwayRiskTotal,
    payoffDebtCount: payoffDebtTotal,
    readerPullRiskCount: readerPullRiskTotal,
    readerTrialRiskCount: readerTrialRiskTotal,
    first30RetentionRiskCount: first30RetentionRiskTotal,
    handoffRiskCount: handoffRiskTotal,
    storylineRiskCount: storylineRiskTotal,
    storyDriveRiskCount: storyDriveRiskTotal,
    characterArcRiskCount: characterArcRiskTotal,
    innovationRiskCount: innovationRiskTotal,
    signatureSceneRiskCount: signatureSceneRiskTotal,
    chapterAttractionRiskCount: chapterAttractionRiskTotal,
    chapterBenchmarkRiskCount: chapterBenchmarkRiskTotal,
    styleSampleRiskCount: styleSampleRiskTotal,
    readabilityRiskCount: readabilityRiskTotal,
    serialRhythmRiskCount: serialRhythmRiskTotal,
    assetGrowthRiskCount: assetGrowthRiskTotal,
    volumeSegmentRiskCount: volumeSegmentRiskTotal,
    batchPlanRiskCount: batchPlanRiskTotal,
    batchChecklistRiskCount: batchChecklistRiskTotal,
    checklistExecution: effectiveBatchChecklistExecution,
    signals,
    repairTasks: repairTasks.slice(0, 40),
  }
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function buildBatchCompletionDashboard(args: {
  status: AutoCreationBatchReviewStatus
  total: number
  success: number
  failed: number
  delivered: number
  riskRadar: AutoCreationBatchRiskRadar
  nextAction: AutoCreationDirectorAction
}): AutoCreationBatchCompletionDashboard {
  if (args.status === 'empty') {
    return {
      visible: false,
      status: 'empty',
      score: 0,
      label: '暂无批次',
      summary: '还没有安全连写批次。',
      nextAction: args.nextAction,
      metrics: [],
    }
  }

  const total = Math.max(0, Number(args.total || 0))
  const success = Math.max(0, Number(args.success || 0))
  const failed = Math.max(0, Number(args.failed || 0))
  const delivered = Math.max(0, Number(args.delivered || 0))
  const generationScore = total > 0 ? clampScore((success / total) * 100) : 0
  const deliveryScore = success > 0 ? clampScore((delivered / success) * 100) : 0
  const qualityScore = args.riskRadar.averageQualityScore !== null
    ? clampScore(args.riskRadar.averageQualityScore)
    : success > 0 ? 72 : 0
  const planPenalty = failed * 25
    + args.riskRadar.repairTasks.length * 20
    + args.riskRadar.coreRiskCount * 10
    + args.riskRadar.runwayRiskCount * 9
    + args.riskRadar.payoffDebtCount * 5
    + args.riskRadar.readerPullRiskCount * 8
    + args.riskRadar.readerTrialRiskCount * 9
    + args.riskRadar.first30RetentionRiskCount * 15
    + args.riskRadar.handoffRiskCount * 10
    + args.riskRadar.storylineRiskCount * 5
    + args.riskRadar.storyDriveRiskCount * 8
    + args.riskRadar.characterArcRiskCount * 7
    + args.riskRadar.innovationRiskCount * 8
    + args.riskRadar.signatureSceneRiskCount * 10
    + args.riskRadar.chapterAttractionRiskCount * 8
    + args.riskRadar.chapterBenchmarkRiskCount * 7
    + args.riskRadar.styleSampleRiskCount * 6
    + args.riskRadar.readabilityRiskCount * 5
    + args.riskRadar.serialRhythmRiskCount * 8
    + args.riskRadar.assetGrowthRiskCount * 6
    + args.riskRadar.volumeSegmentRiskCount * 10
    + args.riskRadar.batchPlanRiskCount * 10
    + args.riskRadar.batchChecklistRiskCount * 8
  const planScore = clampScore(100 - planPenalty)
  const checklistScore = args.riskRadar.checklistExecution.visible ? args.riskRadar.checklistExecution.score : 100
  const score = args.riskRadar.checklistExecution.visible
    ? clampScore(generationScore * 0.28 + deliveryScore * 0.23 + qualityScore * 0.24 + planScore * 0.17 + checklistScore * 0.08)
    : clampScore(generationScore * 0.3 + deliveryScore * 0.25 + qualityScore * 0.25 + planScore * 0.2)
  const completionStatus: AutoCreationBatchCompletionStatus = args.status === 'warn' || args.status === 'risk'
    ? 'needs_repair'
    : args.status === 'done'
      ? 'ready_next'
      : 'in_progress'

  const metrics: AutoCreationBatchCompletionMetric[] = [
    {
      key: 'generation',
      label: '生成完成',
      value: success,
      target: total,
      status: failed > 0 ? 'block' : total > 0 && success >= total ? 'ok' : 'warn',
      detail: failed > 0 ? `${failed} 章失败，先去任务中心处理。` : total > 0 ? `${success}/${total} 章已生成。` : '暂无批次章节。',
    },
    {
      key: 'delivery',
      label: '交稿完成',
      value: delivered,
      target: success,
      status: success > 0 && delivered >= success ? 'ok' : failed > 0 ? 'warn' : 'warn',
      detail: success > 0 ? `${delivered}/${success} 章完成质检、修订和状态回填。` : '还没有成功生成的章节可交稿。',
    },
    {
      key: 'quality',
      label: '质检健康',
      value: qualityScore,
      target: 100,
      status: args.riskRadar.status === 'warn' || args.riskRadar.lowQualityCount > 0 ? 'warn' : qualityScore >= 82 ? 'ok' : 'warn',
      detail: args.riskRadar.averageQualityScore === null
        ? '暂无批次质检均分。'
        : `批次均分 ${args.riskRadar.averageQualityScore}${args.riskRadar.lowQualityCount > 0 ? `，低分 ${args.riskRadar.lowQualityCount} 章` : ''}。`,
    },
    {
      key: 'plan',
      label: '计划兑现',
      value: planScore,
      target: 100,
      status: failed > 0 ? 'block' : args.riskRadar.repairTasks.length > 0 || args.riskRadar.batchPlanRiskCount > 0 ? 'warn' : 'ok',
      detail: args.riskRadar.repairTasks.length > 0
        ? `待处理 ${args.riskRadar.repairTasks.length} 个批次风险。`
        : '本批读者回报、剧情线和连载计划未发现阻塞风险。',
    },
    ...(args.riskRadar.checklistExecution.visible ? [{
      key: 'checklist',
      label: '开工清单',
      value: checklistScore,
      target: 100,
      status: args.riskRadar.batchChecklistRiskCount > 0 ? 'warn' : 'ok',
      detail: args.riskRadar.checklistExecution.visible
        ? args.riskRadar.checklistExecution.summary
        : '本批没有单独开工清单。',
    } as AutoCreationBatchCompletionMetric] : []),
  ]

  return {
    visible: true,
    status: completionStatus,
    score,
    label: completionStatus === 'ready_next' ? '可开下一批' : completionStatus === 'needs_repair' ? '待修复' : '交稿中',
    summary: completionStatus === 'ready_next'
      ? '本批生成、交稿和复盘已闭环，可以按护栏开启下一批。'
      : completionStatus === 'needs_repair'
        ? failed > 0
          ? '批次生成存在失败章节，先处理失败和风险再继续。'
          : '批次已交付但存在质量或计划风险，先修复再开启下一批。'
        : '本批已生成，继续逐章质检、修订和故事状态回填。',
    nextAction: args.nextAction,
    metrics,
  }
}

function batchRiskLabels(riskRadar: AutoCreationBatchRiskRadar) {
  return [
    riskRadar.lowQualityCount > 0 ? '质检低分' : '',
    riskRadar.coreRiskCount > 0 ? '核心偏移' : '',
    riskRadar.runwayRiskCount > 0 ? '航线风险' : '',
    riskRadar.payoffDebtCount > 0 ? '回报欠账' : '',
    riskRadar.readerPullRiskCount > 0 ? '读者拉力' : '',
    riskRadar.readerTrialRiskCount > 0 ? '试读' : '',
    riskRadar.first30RetentionRiskCount > 0 ? '前30章' : '',
    riskRadar.handoffRiskCount > 0 ? '章节交接' : '',
    riskRadar.storylineRiskCount > 0 ? '剧情线' : '',
    riskRadar.storyDriveRiskCount > 0 ? '故事力' : '',
    riskRadar.characterArcRiskCount > 0 ? '人物弧光' : '',
    riskRadar.innovationRiskCount > 0 ? '创新/IP' : '',
    riskRadar.signatureSceneRiskCount > 0 ? '强场面' : '',
    riskRadar.chapterAttractionRiskCount > 0 ? '吸引力' : '',
    riskRadar.chapterBenchmarkRiskCount > 0 ? '标杆章' : '',
    riskRadar.styleSampleRiskCount > 0 ? '风格' : '',
    riskRadar.readabilityRiskCount > 0 ? '可读性' : '',
    riskRadar.serialRhythmRiskCount > 0 ? '连载节奏' : '',
    riskRadar.assetGrowthRiskCount > 0 ? '新资产' : '',
    riskRadar.volumeSegmentRiskCount > 0 ? '卷级阶段' : '',
    riskRadar.batchPlanRiskCount > 0 ? '批次计划' : '',
    riskRadar.batchChecklistRiskCount > 0 ? '开工清单' : '',
  ].filter(Boolean)
}

function buildBatchHandoff(args: {
  status: AutoCreationBatchReviewStatus
  total: number
  success: number
  failed: number
  delivered: number
  items: AutoCreationBatchReviewItem[]
  riskRadar: AutoCreationBatchRiskRadar
  nextAction: AutoCreationDirectorAction
}): AutoCreationBatchHandoff {
  if (args.status === 'empty') {
    return {
      visible: false,
      status: 'empty',
      label: '暂无批次',
      summary: '还没有安全连写批次。',
      action: args.nextAction,
      targetChapterNos: [],
      riskLabels: [],
      evidence: [],
    }
  }

  const failedChapters = args.items.filter(item => item.status === 'failed').map(item => item.chapterNo).filter(Boolean)
  const pendingDeliveryChapters = args.items
    .filter(item => item.status === 'success' && !item.delivered)
    .map(item => item.chapterNo)
    .filter(Boolean)
  const riskChapters = Array.from(new Set(args.riskRadar.repairTasks
    .map((task: any) => Number(task?.chapter_no ?? task?.chapterNo ?? 0))
    .filter(Boolean)))
  const riskLabels = batchRiskLabels(args.riskRadar)

  if (args.status === 'warn') {
    return {
      visible: true,
      status: 'failed',
      label: '先处理失败章节',
      summary: `本批 ${args.success}/${args.total} 章生成成功，失败章节需要先去任务中心处理，避免跳过断点继续写后文。`,
      action: args.nextAction,
      targetChapterNos: failedChapters,
      riskLabels: [],
      evidence: failedChapters.map(no => `第${no}章生成失败`),
    }
  }

  if (args.status === 'risk') {
    return {
      visible: true,
      status: 'repair_risks',
      label: '修复批次风险',
      summary: `本批 ${args.delivered}/${args.total} 章已交稿，但仍有${riskLabels.length ? ` ${riskLabels.join('、')}` : '质量或计划'}风险；先修复再放行下一批。`,
      action: args.nextAction,
      targetChapterNos: riskChapters,
      riskLabels,
      evidence: args.riskRadar.signals.filter(signal => signal.status === 'warn').map(signal => signal.detail).slice(0, 4),
    }
  }

  if (args.status === 'done') {
    return {
      visible: true,
      status: 'continue_batch',
      label: '放行下一批',
      summary: `本批 ${args.delivered}/${args.total} 章已完成生成、质检、修订和故事状态回填，可以回到连续生产护栏开启下一批。`,
      action: args.nextAction,
      targetChapterNos: [],
      riskLabels: [],
      evidence: ['生成完成', '交稿完成', '质检健康', '计划兑现'],
    }
  }

  return {
    visible: true,
    status: 'deliver_chapters',
    label: '逐章交稿',
    summary: `本批 ${args.success}/${args.total} 章已生成，先把待交稿章节逐章完成质检、修订、故事状态和剧情线回填。`,
    action: args.nextAction,
    targetChapterNos: pendingDeliveryChapters,
    riskLabels: [],
    evidence: pendingDeliveryChapters.map(no => `第${no}章待交稿`),
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

function launchSignal(
  key: AutoCreationChapterLaunchSignal['key'],
  label: string,
  status: AutoCreationBatchGuardrailSignalStatus,
  detail: string,
): AutoCreationChapterLaunchSignal {
  return { key, label, status, detail }
}

function launchGateStatus(signals: AutoCreationChapterLaunchSignal[]): AutoCreationChapterLaunchGateStatus {
  if (signals.some(item => item.status === 'block')) return 'blocked'
  if (signals.some(item => item.status === 'warn')) return 'warn'
  return 'ready'
}

function buildChapterLaunchGate(
  planning: PlanningWorkspaceModel,
  writing: WritingCockpitModel,
  longformCompass: AutoCreationLongformCompass,
): AutoCreationChapterLaunchGate {
  const chapter = (writing.nextChapter || {}) as AnyRecord
  const raw = (chapter.rawPayload || chapter.raw_payload || {}) as AnyRecord
  const chapterNo = Number(chapter.chapterNo || chapter.chapter_no || 0)
  const readerPromise = firstText(longformCompass.readerPromise, planning.mainline.readerPromise)
  const chapterGoal = firstText(chapter.chapterGoal, chapter.chapter_goal, raw.chapterGoal, raw.chapter_goal, raw.goal)
  const conflict = firstText(chapter.conflict, raw.conflict, raw.coreConflict, raw.core_conflict)
  const mainlineProgress = firstText(raw.mainlineProgress, raw.mainline_progress, raw.mustAdvance, raw.must_advance, planning.mainline.nextTurn, planning.mainline.currentVolumeGoal)
  const readerPayoff = firstText(raw.readerPayoff, raw.reader_payoff, raw.payoff, raw.payoffModel, planning.mainline.payoffModel)
  const endingHook = firstText(chapter.endingHook, chapter.ending_hook, raw.endingHook, raw.ending_hook, raw.hook)
  const servesVolume = planning.mainline.currentChapterServesVolume !== false
  const proseReady = Boolean(chapter.hasProse)

  const signals = proseReady
    ? [
      launchSignal('reader_promise', '读者承诺', 'ok', readerPromise ? `已按「${readerPromise}」进入交稿闭环。` : '正文已生成，后续通过核心偏移复盘校正。'),
      launchSignal('chapter_goal', '本章目标', 'ok', '正文已生成，下一步看交稿质检和故事状态回填。'),
      launchSignal('core_conflict', '核心冲突', 'ok', '正文已生成，冲突落地由质检复盘判断。'),
      launchSignal('mainline_service', '主线服务', 'ok', '正文已生成，主线服务由交稿复盘校正。'),
      launchSignal('reader_payoff', '读者回报', 'ok', '正文已生成，读者回报由交稿复盘校正。'),
      launchSignal('ending_hook', '章末钩子', 'ok', '正文已生成，章末钩子由追读复盘校正。'),
    ]
    : [
      launchSignal('reader_promise', '读者承诺', readerPromise ? 'ok' : 'block', readerPromise ? `本章必须服务：${readerPromise}` : '缺少全书读者承诺，无法判断本章写出来后读者等什么。'),
      launchSignal('chapter_goal', '本章目标', chapterGoal ? 'ok' : 'block', chapterGoal ? `目标：${chapterGoal}` : `第${chapterNo || '-'}章缺本章目标，容易写成流水账。`),
      launchSignal('core_conflict', '核心冲突', conflict ? 'ok' : 'block', conflict ? `冲突：${conflict}` : '缺核心冲突，正文会缺压迫、选择和转折。'),
      launchSignal(
        'mainline_service',
        '主线服务',
        servesVolume && mainlineProgress ? 'ok' : servesVolume ? 'warn' : 'block',
        servesVolume
          ? mainlineProgress ? `推进：${mainlineProgress}` : '本章服务卷目标，但缺明确主线推进描述。'
          : '当前章被标记为未服务卷目标，不能直接进入初稿。',
      ),
      launchSignal('reader_payoff', '读者回报', readerPayoff ? 'ok' : 'warn', readerPayoff ? `回报模型：${readerPayoff}` : '缺本章读者回报模型，建议补出爽点、信息增量或情绪回报。'),
      launchSignal('ending_hook', '章末钩子', endingHook ? 'ok' : 'block', endingHook ? `钩子：${endingHook}` : '缺章末钩子，追读问题不清楚。'),
    ]
  const status = proseReady ? 'ready' : launchGateStatus(signals)
  const actionPayload = {
    source: 'chapter_launch_gate_repair',
    chapter_no: chapterNo || null,
    blocked_signals: signals.filter(item => item.status === 'block').map(item => item.key),
    warning_signals: signals.filter(item => item.status === 'warn').map(item => item.key),
  }
  const missingReaderPromise = signals.some(item => item.key === 'reader_promise' && item.status === 'block')
  const action = missingReaderPromise
    ? planningAction('open_story_assets', '先补齐全书读者承诺、核心矛盾和长期爽点循环，再生成当前章。')
    : planningAction('update_rolling_plan', '补齐当前章目标、核心冲突、主线推进、读者回报和章末钩子后再开写。', '补齐开写门禁', actionPayload)

  return {
    status,
    label: status === 'ready' ? '本章可以开写' : status === 'warn' ? '本章开写需校准' : '本章开写门禁未通过',
    summary: status === 'ready'
      ? proseReady ? '当前章已有正文，继续交稿质检、修订和状态回填。' : '当前章已对齐读者承诺、章节目标、核心冲突、主线服务、读者回报和章末钩子。'
      : status === 'warn'
        ? '当前章基本可推进，但读者回报或主线推进还不够明确，建议先补齐再扩大连续生产。'
        : '当前章未守住开写前提，直接生成正文容易导致主线漂移、冲突疲软或追读断线。',
    signals,
    action,
  }
}

function rollingLayerStatusToPipeline(status: AutoCreationRollingScriptRoomStatus): AutoCreationPipelineStatus {
  if (status === 'ready') return 'done'
  if (status === 'blocked') return 'blocked'
  return 'warning'
}

function currentChapterDirectorAction(writing: WritingCockpitModel): AutoCreationDirectorAction {
  const handoff = (writing as any).chapterHandoffDesk || null
  if (handoff?.visible) {
    return writingAction(
      (handoff.actionKey || writing.primaryActionKey || 'accept_chapter_and_continue') as WritingCockpitActionKey,
      chapterHandoffDetail(handoff),
      text(handoff.actionLabel, '处理章节交接'),
    )
  }
  if (writing.chapterAcceptanceDesk?.visible) {
    const action = writing.chapterAcceptanceDesk.recommendedAcceptanceAction || {}
    return writingAction(
      (action.key || writing.primaryActionKey || 'refresh_current_quality') as WritingCockpitActionKey,
      '处理当前章交稿闭环，先完成质检、修订、状态同步或验收。',
      action.label,
    )
  }
  const plannerAction = writing.chapterPlanningDesk?.recommendedPlannerAction || {}
  return writingAction(
    (plannerAction.key || writing.primaryActionKey || 'build_scene_plan') as WritingCockpitActionKey,
    '推进当前章任务书、场景卡或正文生成。',
    plannerAction.label,
  )
}

function chapterHandoffDetail(handoff: AnyRecord) {
  const route = Number(handoff?.fromChapterNo || 0) && Number(handoff?.toChapterNo || 0)
    ? `第${Number(handoff.fromChapterNo)}章到第${Number(handoff.toChapterNo)}章`
    : '当前章节'
  const previousEnding = text(handoff?.previousEnding)
  const carryOver = arrayValue(handoff?.expectationCarryOver).map(item => text(item)).filter(Boolean).join('；')
  const opening = arrayValue(handoff?.nextOpeningObligations).map(item => text(item)).filter(Boolean).join('；')
  const deliveryRisk = handoff?.deliveryRiskCarryOver || null
  const deliveryRiskItems = arrayValue(deliveryRisk?.items).map(item => text(item)).filter(Boolean).slice(0, 2).join('；')
  const stagedRiskActions = deliveryRiskStagedActions(deliveryRisk)
  const deliveryRiskSummary = [
    text(deliveryRisk?.label),
    text(deliveryRisk?.priorityLabel),
    deliveryRiskItems,
  ].filter(Boolean).join('，')
  return [
    `${route}交接待确认`,
    previousEnding ? `上一章钩子：${previousEnding}` : '',
    carryOver ? `期待承接：${carryOver}` : '',
    opening ? `下一章开场：${opening}` : '',
    deliveryRiskSummary ? `交稿风险：${deliveryRiskSummary}` : '',
    stagedRiskActions.opening.length ? `开篇修复：${stagedRiskActions.opening.slice(0, 2).join('；')}` : '',
    stagedRiskActions.middle.length ? `中段推进：${stagedRiskActions.middle.slice(0, 2).join('；')}` : '',
    stagedRiskActions.ending.length ? `章末追读：${stagedRiskActions.ending.slice(0, 2).join('；')}` : '',
  ].filter(Boolean).join('；')
}

function uniqueTextItems(values: string[]) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const normalized = text(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

function deliveryRiskStagedActions(deliveryRisk: AnyRecord | null) {
  const opening = arrayValue(deliveryRisk?.openingActions || deliveryRisk?.opening_actions).map(item => text(item)).filter(Boolean)
  const middle = arrayValue(deliveryRisk?.middleActions || deliveryRisk?.middle_actions).map(item => text(item)).filter(Boolean)
  const ending = arrayValue(deliveryRisk?.endingActions || deliveryRisk?.ending_actions).map(item => text(item)).filter(Boolean)
  const rawActions = arrayValue(deliveryRisk?.requiredActions || deliveryRisk?.required_actions || deliveryRisk?.actions).map(item => text(item)).filter(Boolean)
  for (const action of rawActions) {
    if (/前\s*300|开篇|开头|开场|承接|入口|第一场/.test(action)) {
      opening.push(action)
    } else if (/章末|结尾|最后|追读|翻页|尾声|钩子/.test(action)) {
      ending.push(action)
    } else {
      middle.push(action)
    }
  }

  const priority = text(deliveryRisk?.priorityLabel || deliveryRisk?.priority_label)
  if (priority) {
    if (/开篇|开头|开场|承接|入口/.test(priority)) opening.push(priority)
    else if (/章末|结尾|追读|翻页|钩子/.test(priority)) ending.push(priority)
    else if (/中段|场景|推进|爽点|回报|创新/.test(priority)) middle.push(priority)
  }

  return {
    opening: uniqueTextItems(opening),
    middle: uniqueTextItems(middle),
    ending: uniqueTextItems(ending),
  }
}

function deliveryRiskActionText(item: any) {
  if (typeof item === 'string') return text(item)
  return firstText(item?.text, item?.label, item?.name, item?.summary, item?.detail, item?.title, item?.issue)
}

function deliveryRiskTextItems(value: any, limit = 12) {
  return uniqueTextItems(arrayValue(value).map(deliveryRiskActionText).filter(Boolean)).slice(0, limit)
}

function normalizeSafeBatchDeliveryRiskCarryOver(value: AnyRecord | null | undefined, applyToChapterNo: number | null) {
  if (!value || typeof value !== 'object') return null
  const items = deliveryRiskTextItems(value.items || value.risk_items || value.riskItems || value.risks)
  const requiredActions = deliveryRiskTextItems(value.requiredActions || value.required_actions || value.actions || value.nextActions || value.next_actions)
  const staged = deliveryRiskStagedActions(value)
  const stagedCount = staged.opening.length + staged.middle.length + staged.ending.length
  const rawTotal = Number(value.totalCount ?? value.total_count ?? value.count ?? 0)
  const totalCount = Number.isFinite(rawTotal) && rawTotal > 0
    ? rawTotal
    : Math.max(items.length, requiredActions.length, stagedCount)
  if (totalCount <= 0 && items.length === 0 && requiredActions.length === 0 && stagedCount === 0) return null

  return {
    source: 'chapter_delivery_risk_carry_over',
    source_chapter_no: Number(value.sourceChapterNo ?? value.source_chapter_no ?? 0) || null,
    apply_to_chapter_no: applyToChapterNo || null,
    total_count: totalCount,
    label: firstText(value.label, `待修复 ${totalCount}`),
    priority_label: firstText(value.priorityLabel, value.priority_label, '优先复盘上一章'),
    items,
    required_actions: requiredActions,
    opening_actions: staged.opening.slice(0, 12),
    middle_actions: staged.middle.slice(0, 12),
    ending_actions: staged.ending.slice(0, 12),
    evidence: deliveryRiskTextItems(value.evidence),
    policy: '安全连写第一章必须优先承接上一章残留风险；开篇动作落在前300字，中段动作落成场景推进，章末动作落成追读钩子。',
  }
}

function extractChapterNoFromText(value: string) {
  const match = text(value).match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}

function normalizeSafeBatchChapterHandoffContract(writing: WritingCockpitModel, applyToChapterNo: number | null) {
  const planningDesk = writing.chapterPlanningDesk || {}
  const episodePlan = planningDesk.episodePlan || {}
  const nextChapter = writing.nextChapter || null
  const rawPayload = nextChapter?.rawPayload || {}
  const preDraftBrief = rawPayload.pre_draft_brief || rawPayload.preDraftBrief || rawPayload || {}
  const readerDebt = preDraftBrief.reader_expectation_debt || preDraftBrief.readerExpectationDebt || {}
  const readerLedger = preDraftBrief.reader_expectation_ledger || preDraftBrief.readerExpectationLedger || {}
  const handoff = (writing as any).chapterHandoffDesk || null
  const previousHandoff = firstText(
    episodePlan.previousHandoff,
    episodePlan.previous_handoff,
    preDraftBrief.previous_handoff,
    preDraftBrief.previousHandoff,
    handoff?.previousEnding,
    nextChapter?.previousEnding,
  )
  const openingObligations = deliveryRiskTextItems([
    ...arrayValue(handoff?.nextOpeningObligations),
    ...arrayValue(readerDebt.must_carry || readerDebt.mustCarry),
    ...arrayValue(readerLedger.carry_over || readerLedger.carryOver),
  ], 12)
  const expectationCarryOver = deliveryRiskTextItems([
    ...arrayValue(handoff?.expectationCarryOver),
    ...arrayValue(readerLedger.carry_over || readerLedger.carryOver),
  ], 12)
  const mustDeliver = deliveryRiskTextItems(readerLedger.must_deliver || readerLedger.mustDeliver, 12)
  const keepAlive = deliveryRiskTextItems([
    ...arrayValue(readerDebt.keep_alive || readerDebt.keepAlive),
    ...arrayValue(readerLedger.keep_alive || readerLedger.keepAlive),
    ...arrayValue(handoff?.nextOpeningObligations),
  ], 12)
  const overdue = deliveryRiskTextItems(readerDebt.overdue, 12)
  const hasContract = Boolean(previousHandoff)
    || openingObligations.length > 0
    || expectationCarryOver.length > 0
    || mustDeliver.length > 0
    || keepAlive.length > 0
    || overdue.length > 0
  if (!hasContract) return null
  const fromChapterNo = Number(handoff?.fromChapterNo || 0)
    || extractChapterNoFromText(previousHandoff)
    || (applyToChapterNo ? applyToChapterNo - 1 : 0)
    || null
  return {
    source: 'safe_batch_chapter_handoff_contract',
    from_chapter_no: fromChapterNo,
    apply_to_chapter_no: applyToChapterNo || Number(handoff?.toChapterNo || 0) || Number(nextChapter?.chapterNo || 0) || null,
    previous_handoff: previousHandoff,
    opening_obligations: openingObligations,
    expectation_carry_over: expectationCarryOver,
    must_deliver: mustDeliver,
    keep_alive: keepAlive,
    overdue,
    policy: '安全连写第一章必须先接住上一章最后一幕和读者期待债务；opening_obligations 落在前300字，must_deliver 写成可见回报，keep_alive 保持存在感，overdue 优先推进。',
  }
}

function writingQueueBadges(queue: AnyRecord) {
  return [
    Number(queue?.readyCount || 0) > 0 ? `可写 ${Number(queue.readyCount || 0)}` : '',
    Number(queue?.blockedCount || 0) > 0 ? `待补 ${Number(queue.blockedCount || 0)}` : '',
    Number(queue?.draftedCount || 0) > 0 ? `待质检 ${Number(queue.draftedCount || 0)}` : '',
  ].filter(Boolean)
}

function buildWritingQueueFocus(writing: WritingCockpitModel): AutoCreationWritingQueueFocus {
  const fallbackAction = currentChapterDirectorAction(writing)
  const queue = (writing as any).writingQueue || {}
  const items = arrayValue(queue?.items)
  const readyCount = Number(queue?.readyCount || 0)
  const blockedCount = Number(queue?.blockedCount || 0)
  const draftedCount = Number(queue?.draftedCount || 0)
  if (!queue?.visible || !items.length) {
    return {
      visible: false,
      status: 'empty',
      label: '写作队列未启用',
      summary: '当前总控台按章节工作台推荐动作推进。',
      currentChapterNo: null,
      readyCount,
      blockedCount,
      draftedCount,
      action: fallbackAction,
      badges: [],
    }
  }

  const currentChapterNo = Number(queue.currentChapterNo || items[0]?.chapterNo || 0) || null
  const item = items.find(entry => Number(entry?.chapterNo || 0) === Number(currentChapterNo || 0)) || items[0]
  const status = text(item?.status, 'ready_to_draft') as AutoCreationWritingQueueFocus['status']
  const chapterNo = Number(item?.chapterNo || currentChapterNo || 0)
  const title = text(item?.title, '未命名章节')
  const badges = writingQueueBadges(queue)

  if (status === 'needs_plan') {
    const missingLabels = arrayValue(item?.missingPlanLabels).map(label => text(label)).filter(Boolean)
    const batchRepair = queue?.planRepair?.visible
    const action = batchRepair
      ? planningAction(
        'update_rolling_plan',
        `补齐写作队列中 ${Number(queue.planRepair.chapterCount || blockedCount || 1)} 章的计划缺口，再进入正文生产。`,
        text(queue.planRepair.label, '补齐队列计划'),
        queue.planRepair.intent || null,
      )
      : planningAction(
        'update_rolling_plan',
        `补齐第${chapterNo || '-'}章计划缺口，明确目标、冲突、钩子和场景职责后再开写。`,
        text(item?.actionLabel, '补齐本章计划'),
        item?.repairIntent || null,
      )
    return {
      visible: true,
      status,
      label: '本章计划缺口',
      summary: `第${chapterNo || '-'}章《${title}》存在计划缺口：${missingLabels.join('、') || text(item?.actionHint, '缺目标、冲突或章末钩子')}。先补计划，避免正文生成时主线和读者回报跑偏。`,
      currentChapterNo,
      readyCount,
      blockedCount,
      draftedCount,
      action,
      badges,
    }
  }

  if (status === 'draft_generated') {
    return {
      visible: true,
      status,
      label: '本章待质检',
      summary: `第${chapterNo || '-'}章《${title}》已有正文，下一步应进入质检、修订、故事状态回填和验收。`,
      currentChapterNo,
      readyCount,
      blockedCount,
      draftedCount,
      action: fallbackAction,
      badges,
    }
  }

  return {
    visible: true,
    status: 'ready_to_draft',
    label: '本章开写就绪',
    summary: `第${chapterNo || '-'}章《${title}》的章节计划已就绪，可以按任务书、场景卡和字数门禁生成初稿。`,
    currentChapterNo,
    readyCount,
    blockedCount,
    draftedCount,
    action: fallbackAction,
    badges,
  }
}

function writingQueueRelease(writing: WritingCockpitModel, expectedChapterCount: number) {
  const queue = (writing as any).writingQueue || {}
  const items = arrayValue(queue?.items)
  const targetCount = Math.max(0, Number(expectedChapterCount || 0))
  const focus = buildWritingQueueFocus(writing)
  const emptyRelease = {
    allowedChapters: [] as AutoCreationBatchReleaseChapter[],
    blockedChapters: [] as AutoCreationBatchReleaseChapter[],
  }

  if (!queue?.visible || !items.length || targetCount <= 0) {
    return {
      signal: signal('写作队列放行', 'ok' as const, '当前按章节工作台状态放行。'),
      safeChapterCount: targetCount,
      action: focus.action,
      ...emptyRelease,
    }
  }

  const currentChapterNo = Number(queue.currentChapterNo || items[0]?.chapterNo || 0)
  const ordered = items
    .filter(item => Number(item?.chapterNo || 0) >= currentChapterNo)
    .sort((a, b) => Number(a?.chapterNo || 0) - Number(b?.chapterNo || 0))
  let consecutiveReady = 0
  for (const item of ordered) {
    if (text(item?.status) !== 'ready_to_draft') break
    consecutiveReady += 1
  }
  const allowedChapters = ordered.slice(0, Math.min(consecutiveReady, targetCount)).map(item => ({
    chapterNo: Number(item?.chapterNo || 0),
    title: text(item?.title, '未命名章节'),
    status: 'allowed' as const,
    reason: '队列状态可开写',
  }))
  const nextBlocked = ordered[consecutiveReady]
  const blockedChapters = nextBlocked ? [{
    chapterNo: Number(nextBlocked?.chapterNo || 0),
    title: text(nextBlocked?.title, '未命名章节'),
    status: 'blocked' as const,
    reason: text(nextBlocked?.statusLabel, text(nextBlocked?.actionHint, '未进入可写状态')),
  }] : []

  if (consecutiveReady >= targetCount) {
    return {
      signal: signal('写作队列放行', 'ok' as const, `写作队列连续可写 ${consecutiveReady} 章，可覆盖本轮安全批次。`),
      safeChapterCount: targetCount,
      action: focus.action,
      allowedChapters,
      blockedChapters: [],
    }
  }

  if (consecutiveReady > 0) {
    const detail = `写作队列连续可写 ${consecutiveReady} 章；第${Number(nextBlocked?.chapterNo || 0)}章仍是「${text(nextBlocked?.statusLabel, '未就绪')}」，本轮降为单章推进，先补齐后续计划或交稿。`
    const action = queue?.planRepair?.visible
      ? planningAction('update_rolling_plan', detail, text(queue.planRepair.label, '补齐队列计划'), queue.planRepair.intent || null)
      : focus.action
    return {
      signal: signal('写作队列放行', 'warn' as const, detail),
      safeChapterCount: consecutiveReady,
      action,
      allowedChapters,
      blockedChapters,
    }
  }

  return {
    signal: signal('写作队列放行', 'block' as const, focus.summary || '当前写作队列没有连续可写章节，先补计划或处理交稿。'),
    safeChapterCount: 0,
    action: focus.action,
    allowedChapters: [],
    blockedChapters,
  }
}

function releaseChapterLabel(chapter: AutoCreationBatchReleaseChapter) {
  return `第${chapter.chapterNo}章《${chapter.title}》`
}

function buildBatchReleaseWindow(
  nextBatchBrief: AutoCreationNextBatchBrief,
  queueRelease: {
    allowedChapters: AutoCreationBatchReleaseChapter[]
    blockedChapters: AutoCreationBatchReleaseChapter[]
  },
): AutoCreationBatchReleaseWindow {
  const allowedChapters = queueRelease.allowedChapters.length
    ? queueRelease.allowedChapters
    : nextBatchBrief.chapters.map(chapter => ({
      chapterNo: chapter.chapterNo,
      title: chapter.title,
      status: 'allowed' as const,
      reason: '护栏放行',
    }))
  const blockedChapters = queueRelease.blockedChapters
  const allowedLabel = allowedChapters.length
    ? `本批放行 ${allowedChapters.map(releaseChapterLabel).join('、')}`
    : '本批没有放行章节'
  const blockedLabel = blockedChapters.length
    ? `；${blockedChapters.map(chapter => `${releaseChapterLabel(chapter)}因${chapter.reason}被拦截`).join('、')}`
    : ''
  return {
    summary: `${allowedLabel}${blockedLabel}。`,
    allowedChapters,
    blockedChapters,
  }
}

function buildRollingScriptRoom(
  planning: PlanningWorkspaceModel,
  writing: WritingCockpitModel,
  longformCompass: AutoCreationLongformCompass,
): AutoCreationRollingScriptRoom {
  const chapter = targetChapter(writing)
  const nextBatchBrief = buildNextBatchBrief({ planning, writing, safeChapterCount: 10 })
  const nextChapters = nextBatchBrief.chapters
  const currentAction = currentChapterDirectorAction(writing)
  const chapterReady = Boolean(chapter) && (
    Boolean(chapter?.hasProse)
    || writing.chapterPlanningDesk?.readiness === 'ready'
    || writing.chapterPlanningDesk?.scenePlanStatus === 'ready'
    || arrayValue((writing.chapterPlanningDesk as any)?.sceneCards).length > 0
  )
  const future10 = planning.topStatus.future10Coverage
  const future100 = planning.topStatus.future100Coverage
  const volumeBeat = planning.volumeBeatBudget
  const layers: AutoCreationRollingScriptLayer[] = [
    {
      key: 'current_chapter',
      label: '当前章',
      status: !chapter ? 'blocked' : chapterReady ? 'ready' : 'needs_attention',
      detail: chapter
        ? `第${chapter.chapterNo}章《${chapter.title || '未命名'}》：${chapter.hasProse ? '已有正文，进入交稿闭环。' : writing.chapterPlanningDesk?.statusLabel || '等待章节任务书。'}`
        : '还没有可写章节。',
      evidence: [
        chapter?.chapterGoal ? `目标：${chapter.chapterGoal}` : '',
        chapter?.conflict ? `冲突：${chapter.conflict}` : '',
        chapter?.endingHook ? `钩子：${chapter.endingHook}` : '',
      ].filter(Boolean),
      action: currentAction,
    },
    {
      key: 'next_10',
      label: '未来10章',
      status: future10.ready ? 'ready' : Number(future10.planned || 0) >= 5 ? 'needs_attention' : 'blocked',
      detail: `未来10章 ${future10.label}，${future10.ready ? '短周期排期可支撑当前章。' : '需要补齐短周期章节职责、冲突和钩子。'}`,
      evidence: nextChapters.slice(0, 3).map(item => `第${item.chapterNo}章：${item.chapterTask || item.conflict || item.title}`),
      action: planningAction('update_rolling_plan', '补齐未来10章滚动规划，明确每章职责、冲突、回报和章末钩子。'),
    },
    {
      key: 'future_100',
      label: '未来100章',
      status: future100.ready ? 'ready' : Number(future100.planned || 0) >= 30 ? 'needs_attention' : 'blocked',
      detail: `未来100章 ${future100.label}，${future100.ready ? '中长期骨架足够约束批量生产。' : '中长期骨架不足，安全连写容易跑偏。'}`,
      evidence: future100.missingChapters.slice(0, 3).map(no => `缺第${no}章`),
      action: planningAction(future100.ready ? 'future100_audit' : 'future100_generate', future100.ready ? '检查未来100章骨架是否仍匹配当前剧情。' : '生成或补齐未来100章骨架。'),
    },
    {
      key: 'current_volume',
      label: '当前卷',
      status: volumeBeat.status === 'ready' ? 'ready' : volumeBeat.status === 'blocked' ? 'blocked' : 'needs_attention',
      detail: `${volumeBeat.label || `爆点预算 ${volumeBeat.score}`}，${volumeBeat.summary || '等待当前卷高潮与爽点预算。'}`,
      evidence: [
        volumeBeat.currentVolumeTitle,
        volumeBeat.chapterRange,
        `爆点 ${volumeBeat.climaxCount}/${volumeBeat.climaxTarget}`,
        `回报 ${volumeBeat.payoffCount}/${volumeBeat.payoffTarget}`,
      ].filter(Boolean),
      action: planningAction('complete_volume_plan', volumeBeat.nextActions[0] || '补齐当前卷目标、小高潮、中高潮、卷末爆点和读者回报。'),
    },
    {
      key: 'book_compass',
      label: '全书罗盘',
      status: longformCompass.status === 'ready' ? 'ready' : 'needs_attention',
      detail: longformCompass.readerPromise ? `全书罗盘：${longformCompass.readerPromise}` : longformCompass.summary,
      evidence: longformCompass.immutableRules.slice(0, 3),
      action: planningAction(longformCompass.status === 'ready' ? 'longform_creation_diagnosis' : 'open_story_assets', longformCompass.status === 'ready' ? '重新运行创作诊断，确认核心、故事强度、创新和读者吸引仍然达标。' : '补齐读者承诺、核心矛盾和长期爽点循环。'),
    },
  ]
  const status: AutoCreationRollingScriptRoomStatus = layers.some(layer => layer.status === 'blocked')
    ? 'blocked'
    : layers.some(layer => layer.status === 'needs_attention')
      ? 'needs_attention'
      : 'ready'
  const firstActionLayer = layers.find(layer => layer.status !== 'ready')
  const repairTasks = layers
    .filter(layer => layer.key !== 'current_chapter' && layer.status !== 'ready')
    .map(layer => ({
      task_type: 'repair_script_room',
      issue_type: 'script_room_layer_gap',
      severity: layer.status === 'blocked' ? 'high' : 'medium',
      title: `${layer.label}剧本室修复`,
      message: layer.detail,
      action: layer.action.description || `修复${layer.label}规划缺口。`,
      acceptance_criteria: [
        '剧本室对应层级恢复绿色或人工确认可继续生产',
        '修复后重新查看自动创作总控台，确认当前章、未来10章、未来100章、当前卷和全书罗盘不再互相冲突',
      ],
      task_status: 'open',
      source: 'rolling_script_room',
      layer_key: layer.key,
      layer_label: layer.label,
      action_area: layer.action.area,
      action_key: layer.action.key,
      evidence: layer.evidence,
      payload: {
        layer,
        focus_range: nextBatchBrief.chapterRangeLabel,
        next_chapters: nextChapters.slice(0, 6),
      },
    }))
  const repairAction = opsAction(
    'create_script_room_repair',
    '生成剧本室修复任务',
    repairTasks.length
      ? `把 ${repairTasks.length} 个百章剧本室黄/红层级写入任务中心。`
      : '当前百章剧本室没有需要任务化的缺口。',
    repairTasks.length === 0,
  )
  return {
    status,
    label: status === 'ready' ? '百章剧本就绪' : status === 'blocked' ? '百章剧本阻塞' : '百章剧本待校准',
    summary: status === 'ready'
      ? '当前章、未来10章、未来100章、当前卷和全书罗盘已对齐，可进入本章生产或小批量安全连写。'
      : '先校准红/黄层级，再进入正文生成；避免单章看似顺畅但几十章后主线、爆点或读者承诺松动。',
    focusRangeLabel: nextBatchBrief.chapterRangeLabel || (chapter ? `第${chapter.chapterNo}章` : '未确定'),
    layers,
    nextChapters,
    nextAction: firstActionLayer?.action || currentAction,
    repairTasks,
    repairAction,
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

function buildSerialReleaseInventoryGuardrail(planning: PlanningWorkspaceModel): AutoCreationBatchGuardrailSignal & { action: AutoCreationDirectorAction; hasDesk: boolean } {
  const desk = (planning as any).serialReleaseDesk || null
  if (!desk) {
    return {
      label: '连载库存',
      status: 'ok',
      detail: '故事规划页暂未返回连载发布台，按现有连写护栏继续判断。',
      action: planningAction('enter_chapter_writing', '进入章节写作区补齐当前章，继续积累可发布存稿。'),
      hasDesk: false,
    }
  }
  const rawStatus = text(desk.status)
  const status: AutoCreationBatchGuardrailSignalStatus = rawStatus === 'blocked'
    ? 'block'
    : rawStatus === 'needs_buffer' || rawStatus === 'needs_planning'
      ? 'warn'
      : 'ok'
  const fallbackActionKey: PlanningActionKey = status === 'block' ? 'open_quality_revision' : rawStatus === 'needs_planning' ? 'update_rolling_plan' : 'enter_chapter_writing'
  const primaryAction = desk.primaryAction || desk.primary_action || {}
  const actionKey = normalizePlanningActionKey(primaryAction.key, fallbackActionKey)
  const detail = firstText(
    desk.summary,
    primaryAction.reason,
    arrayValue(desk.nextActions)[0],
    status === 'ok'
      ? '连载库存和发布窗口可支撑继续生产。'
      : status === 'block'
        ? '发布窗口存在待修订章节，先处理发布风险再连写。'
        : '连载库存或后续计划不足，本轮只适合单章小步推进。',
  )
  return {
    label: '连载库存',
    status,
    detail,
    action: planningAction(actionKey, firstText(primaryAction.reason, detail), text(primaryAction.label, PLANNING_ACTION_LABELS[actionKey] || actionKey)),
    hasDesk: true,
  }
}

function serialReleaseInventoryIssue(guardrail: AutoCreationBatchGuardrail) {
  const signal = guardrail.guardrails.find(item => item.label === '连载库存' && item.status !== 'ok')
  return signal || null
}

function emptyNextBatchBrief(): AutoCreationNextBatchBrief {
  return {
    visible: false,
    chapterRangeLabel: '',
    batchGoal: '',
    readerPayoffPlan: '',
    mainlineFocus: '',
    forbiddenBoundary: '',
    startChecklist: [],
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

function checklistItem(
  key: AutoCreationNextBatchBriefStartChecklistKey,
  label: string,
  detail: string,
  fallback: string,
): AutoCreationNextBatchBriefStartChecklistItem {
  const value = text(detail)
  return {
    key,
    label,
    status: value ? 'ok' : 'warn',
    detail: value || fallback,
  }
}

function buildNextBatchBriefStartChecklist(args: {
  planning: PlanningWorkspaceModel
  chapters: AutoCreationNextBatchBriefChapter[]
  readerPayoffPlan: string
  mainlineFocus: string
  forbiddenBoundary: string
}): AutoCreationNextBatchBriefStartChecklistItem[] {
  const chapterTasks = args.chapters
    .map(item => item.chapterTask || item.conflict)
    .filter(Boolean)
    .slice(0, 3)
    .join(' / ')
  const innovationLanes = Array.isArray(args.planning.longformBattleDesk?.lanes)
    ? args.planning.longformBattleDesk.lanes
    : []
  const innovationLane = innovationLanes.find(item => item.key === 'innovation_ip')
  const innovationDetail = firstText(
    innovationLane?.detail,
    args.planning.mainline.currentStageConflict,
    args.planning.mainline.readerPromise,
  )

  return [
    checklistItem(
      'core_promise',
      '核心承诺',
      args.planning.mainline.readerPromise,
      '缺核心读者承诺，批量生成前需要先明确这本书到底让读者追什么。',
    ),
    checklistItem(
      'story_drive',
      '故事驱动力',
      firstText(args.mainlineFocus, chapterTasks),
      '缺逐章冲突或主线推进，连续生成容易变成流水账。',
    ),
    checklistItem(
      'reader_payoff',
      '读者回报',
      args.readerPayoffPlan,
      '缺升级、打脸、揭秘或情绪兑现计划，建议先补本批爽点。',
    ),
    checklistItem(
      'innovation',
      '创新/IP记忆点',
      innovationDetail,
      '缺本批差异化表达或标志性场面，建议补一个能被读者记住的看点。',
    ),
    checklistItem(
      'forbidden_boundary',
      '禁写边界',
      args.forbiddenBoundary,
      '缺禁写边界，批量生成可能跳过质检、提前揭底或误改长期设定。',
    ),
  ]
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
  const batchGoal = [
    args.planning.mainline.currentVolumeGoal ? `卷目标：${args.planning.mainline.currentVolumeGoal}` : '',
    chapters[chapters.length - 1]?.mainlineProgress ? `本批推进到：${chapters[chapters.length - 1].mainlineProgress}` : '',
  ].filter(Boolean).join('；') || '保持当前卷目标连续推进。'
  const readerPayoffPlan = [
    args.planning.mainline.payoffModel ? `爽点模型：${args.planning.mainline.payoffModel}` : '',
    chapters.map(item => item.endingHook).filter(Boolean).slice(0, 3).join(' / '),
  ].filter(Boolean).join('；') || '每章保留明确读者回报和章末钩子。'
  const mainlineFocus = mainlineProgress.join(' -> ') || args.planning.mainline.currentStageConflict || '保持主线推进不偏移。'
  const forbiddenBoundary = [
    '不得跳过单章质检、修订和故事状态回填。',
    args.planning.mainline.risks[0] ? `避开风险：${args.planning.mainline.risks[0]}` : '',
    conflicts.length ? `冲突必须逐章落地：${conflicts.slice(0, 3).join(' / ')}` : '',
  ].filter(Boolean).join('；')

  return {
    visible: true,
    chapterRangeLabel: chapterRangeLabel(chapters),
    batchGoal,
    readerPayoffPlan,
    mainlineFocus,
    forbiddenBoundary,
    startChecklist: buildNextBatchBriefStartChecklist({
      planning: args.planning,
      chapters,
      readerPayoffPlan,
      mainlineFocus,
      forbiddenBoundary,
    }),
    chapters,
  }
}

function chapterNoLabels(chapters: AutoCreationNextBatchBriefChapter[]) {
  return chapters.map(item => `第${item.chapterNo}章`).join('、')
}

function nextBatchBriefMissingItems(
  nextBatchBrief: AutoCreationNextBatchBrief,
  expectedChapterCount: number,
) {
  if (expectedChapterCount <= 0) return []
  if (!nextBatchBrief.visible || nextBatchBrief.chapters.length === 0) return ['缺少下一批任务书']

  const missingCoverage = expectedChapterCount > 1 && nextBatchBrief.chapters.length < expectedChapterCount
    ? [`只覆盖 ${nextBatchBrief.chapters.length}/${expectedChapterCount} 章`]
    : []
  const missingTask = nextBatchBrief.chapters.filter(item => !text(item.chapterTask))
  const missingConflict = nextBatchBrief.chapters.filter(item => !text(item.conflict))
  const missingHook = nextBatchBrief.chapters.filter(item => !text(item.endingHook))
  const missingMainline = nextBatchBrief.chapters.filter(item => !text(item.mainlineProgress))
  return [
    ...missingCoverage,
    missingTask.length ? `缺逐章职责：${chapterNoLabels(missingTask)}` : '',
    missingConflict.length ? `缺冲突落点：${chapterNoLabels(missingConflict)}` : '',
    missingHook.length ? `缺章末钩子：${chapterNoLabels(missingHook)}` : '',
    missingMainline.length ? `缺主线推进：${chapterNoLabels(missingMainline)}` : '',
  ].filter(Boolean)
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

  const issues = nextBatchBriefMissingItems(nextBatchBrief, expectedChapterCount)

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

function emptyNextBatchBriefRepair(): AutoCreationBatchBriefRepair {
  return {
    visible: false,
    status: 'ok',
    title: '',
    summary: '',
    missingItems: [],
    action: planningAction('update_rolling_plan', '批次任务书完整时无需补齐。', '补齐批次任务书'),
  }
}

function buildNextBatchBriefRepair(
  nextBatchBrief: AutoCreationNextBatchBrief,
  expectedChapterCount: number,
  batchBriefSignal: AutoCreationBatchGuardrailSignal,
): AutoCreationBatchBriefRepair {
  if (batchBriefSignal.status === 'ok') return emptyNextBatchBriefRepair()
  const missingItems = nextBatchBriefMissingItems(nextBatchBrief, expectedChapterCount)
  return {
    visible: true,
    status: batchBriefSignal.status,
    title: '补齐下一批任务书',
    summary: batchBriefSignal.status === 'block'
      ? '下一批还没有达到开写条件，先补齐本批目标、逐章职责、冲突和钩子。'
      : '当前章可以继续推进，但多章连写前需要补齐后续章节职责、冲突和钩子。',
    missingItems,
    action: planningAction('update_rolling_plan', batchBriefSignal.detail, '补齐批次任务书', {
      source: 'batch_brief_repair',
      missing_items: missingItems,
      next_batch_brief: nextBatchBrief,
      expected_chapter_count: expectedChapterCount,
    }),
  }
}

function emptyNextBatchBriefRecovery(): AutoCreationBatchBriefRecovery {
  return {
    visible: false,
    title: '',
    summary: '',
    restoredChapterCount: 0,
    evidence: [],
    action: opsAction('start_safe_batch_generation', '开始安全连写', '当前批次尚未恢复到多章连写。', true),
  }
}

function buildNextBatchBriefRecovery(args: {
  status: AutoCreationBatchGuardrailStatus
  safeChapterCount: number
  nextBatchBrief: AutoCreationNextBatchBrief
  batchBriefSignal: AutoCreationBatchGuardrailSignal
  recommendedAction: AutoCreationDirectorAction
}): AutoCreationBatchBriefRecovery {
  if (args.status !== 'ready' || args.safeChapterCount < 2 || args.batchBriefSignal.status !== 'ok') {
    return emptyNextBatchBriefRecovery()
  }
  return {
    visible: true,
    title: '已恢复多章安全连写',
    summary: `${args.nextBatchBrief.chapterRangeLabel || `未来 ${args.safeChapterCount} 章`} 的批次目标、读者回报、主线推进和章末钩子已具备，可按护栏进入小批量生产。`,
    restoredChapterCount: args.safeChapterCount,
    evidence: [
      '批次任务书完整',
      `安全批次 ${args.safeChapterCount} 章`,
      args.nextBatchBrief.chapterRangeLabel,
      args.nextBatchBrief.readerPayoffPlan ? '读者回报已明确' : '',
      args.nextBatchBrief.mainlineFocus ? '主线焦点已明确' : '',
    ].filter(Boolean),
    action: args.recommendedAction,
  }
}

function buildLongformMemoryAnchor(storyState: AnyRecord) {
  const state = storyState || {}
  const global = state.global || state
  const characterStates = arrayValue(state.characters)
    .map((item: any) => {
      const name = firstText(item?.name, item?.character_name, item?.title)
      if (!name) return ''
      const status = firstText(item?.status, item?.state, item?.current_state, item?.arc_state)
      const location = firstText(item?.location, item?.current_location)
      return [name, status, location ? `@${location}` : ''].filter(Boolean).join('：').replace('：@', '@')
    })
    .filter(Boolean)
    .slice(0, 8)
  const openQuestions = [
    ...arrayValue(global?.open_questions),
    ...arrayValue(state?.open_questions),
  ].map((item: any) => firstText(item?.text, item?.summary, item?.description, item)).filter(Boolean)
  const payoffDebts = [
    ...arrayValue(global?.payoff_queue),
    ...arrayValue(global?.payoff_debts),
    ...arrayValue(state?.payoff_queue),
    ...arrayValue(state?.payoff_debts),
  ].map((item: any) => firstText(item?.text, item?.summary, item?.description, item)).filter(Boolean)
  const anchor = {
    last_updated_chapter: Number(state.last_updated_chapter || global.last_updated_chapter || 0) || null,
    core_promise: firstText(global.core_promise, global.reader_promise, global.promise, state.core_promise, state.reader_promise),
    current_volume_goal: firstText(global.current_volume_goal, global.volume_goal, state.current_volume_goal, state.volume_goal),
    current_mainline: firstText(global.current_mainline, global.mainline, state.current_mainline, state.mainline),
    character_states: characterStates,
    open_questions: Array.from(new Set(openQuestions)).slice(0, 8),
    payoff_debts: Array.from(new Set(payoffDebts)).slice(0, 8),
  }
  const hasAnchor = Boolean(
    anchor.last_updated_chapter
    || anchor.core_promise
    || anchor.current_volume_goal
    || anchor.current_mainline
    || anchor.character_states.length
    || anchor.open_questions.length
    || anchor.payoff_debts.length,
  )
  return hasAnchor ? anchor : null
}

const SAFE_BATCH_MODEL_PIPELINE = [
  '章节任务书',
  '正文初稿',
  '字数门禁',
  '商业主编改稿',
  '自检修订',
  '故事状态/剧情线回填',
]

function buildBatchPreflight(args: {
  status: AutoCreationBatchGuardrailStatus
  safeChapterCount: number
  releaseWindow: AutoCreationBatchReleaseWindow
  nextBatchBrief: AutoCreationNextBatchBrief
  guardrails: AutoCreationBatchGuardrailSignal[]
  storyState?: AnyRecord | null
  deliveryRiskCarryOver?: AnyRecord | null
  chapterHandoffContract?: AnyRecord | null
}): AutoCreationBatchPreflight {
  const allowedChapterNos = args.releaseWindow.allowedChapters.map(chapter => Number(chapter.chapterNo || 0)).filter(Boolean)
  const blockedChapterNos = args.releaseWindow.blockedChapters.map(chapter => Number(chapter.chapterNo || 0)).filter(Boolean)
  const guardrailWarnings = args.guardrails
    .filter(item => item.status !== 'ok')
    .map(item => `${item.label}：${item.detail}`)
  const blockedWarnings = args.releaseWindow.blockedChapters
    .map(chapter => `第${chapter.chapterNo}章《${chapter.title}》被拦截：${chapter.reason}`)
  const warnings = Array.from(new Set([...guardrailWarnings, ...blockedWarnings])).slice(0, 8)
  const visible = args.nextBatchBrief.visible || allowedChapterNos.length > 0 || blockedChapterNos.length > 0
  const summary = args.status === 'ready'
    ? `本批将按护栏放行 ${allowedChapterNos.length} 章：${args.nextBatchBrief.chapterRangeLabel || allowedChapterNos.map(no => `第${no}章`).join('、')}。`
    : args.status === 'caution'
      ? `本批只放行 ${allowedChapterNos.length || args.safeChapterCount} 章，后续章节需要先处理黄色风险。`
      : '当前护栏未通过，不会启动安全连写。'
  const longformMemoryAnchor = buildLongformMemoryAnchor(args.storyState || {})

  return {
    visible,
    status: args.status,
    title: '安全连写预执行确认',
    summary,
    allowedChapterNos,
    blockedChapterNos,
    modelPipeline: SAFE_BATCH_MODEL_PIPELINE,
    warnings,
    longformMemoryAnchor,
    chapterHandoffContract: args.chapterHandoffContract || null,
    inputSnapshot: {
      source: 'auto_creation_safe_batch_preflight',
      guardrail_status: args.status,
      safe_chapter_count: args.safeChapterCount,
      allowed_chapter_nos: allowedChapterNos,
      blocked_chapter_nos: blockedChapterNos,
      chapter_range_label: args.nextBatchBrief.chapterRangeLabel,
      release_window: args.releaseWindow,
      next_batch_brief: args.nextBatchBrief,
      guardrails: args.guardrails,
      model_pipeline: SAFE_BATCH_MODEL_PIPELINE,
      warnings,
      ...(args.deliveryRiskCarryOver ? { delivery_risk_carry_over: args.deliveryRiskCarryOver } : {}),
      ...(args.chapterHandoffContract ? { chapter_handoff_contract: args.chapterHandoffContract } : {}),
      ...(longformMemoryAnchor ? { longform_memory_anchor: longformMemoryAnchor } : {}),
    },
  }
}

function buildBatchGuardrail(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  activeTasks: AnyRecord[]
  hasBlockingPlan: boolean
  hasModel: boolean
  mainAction: AutoCreationDirectorAction
  longformCapacity: AutoCreationLongformCapacity
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  chapterLaunchGate: AutoCreationChapterLaunchGate
  storyState?: AnyRecord | null
}): AutoCreationBatchGuardrail {
  const planning = args.planning
  const writing = args.writing
  const future10 = planning.topStatus.future10Coverage
  const future100 = planning.topStatus.future100Coverage
  const planningDesk = writing.chapterPlanningDesk
  const acceptance = writing.chapterAcceptanceDesk
  const chapterHandoff = (writing as any).chapterHandoffDesk || null
  const chapterHandoffVisible = Boolean(chapterHandoff?.visible)
  const running = hasRunningTasks(args.activeTasks)
  const retentionActionNeeded = retentionNeedsAction(planning)
  const storylineActionNeeded = storylineNeedsAction(planning)
  const characterArcActionNeeded = characterArcNeedsAction(planning)
  const volumeBeatActionNeeded = volumeBeatNeedsAction(planning)
  const rhythmActionNeeded = rhythmNeedsAction(planning)
  const canonRunway = buildCanonRunway(writing)
  const future100Status = future100ReserveStatus(planning)
  const capacityStatus: AutoCreationBatchGuardrailSignalStatus = args.longformCapacity.status === 'ready'
    ? 'ok'
    : args.longformCapacity.status === 'blocked'
      ? 'block'
      : 'warn'
  const fatigue = planning.recentFatigueRadar
  const fatigueWarnings = arrayValue(fatigue?.signals).filter(item => text(item?.status) === 'warn')
  const fatigueStatus: AutoCreationBatchGuardrailSignalStatus = fatigue?.status === 'needs_attention' || fatigueWarnings.length > 0
    ? 'warn'
    : 'ok'
  const fatigueWarningDetail = [
    ...fatigueWarnings.map(item => text(item?.detail)).filter(Boolean),
    text(fatigue?.summary),
  ].filter(Boolean).join('；')
  const fatigueDetail = fatigueStatus === 'warn'
    ? firstText(
        fatigueWarningDetail,
        arrayValue(fatigue?.nextActions)[0],
        `${fatigueWarnings.length || 1} 类近10章同质化风险，需要先换冲突来源、回报形态、章末问题或可视化场面。`,
      )
    : firstText(fatigue?.summary, '近10章冲突来源、回报形态、章末钩子和可视化场面没有明显同质化。')
  const storyPressureLadder = planning.storyPressureLadder
  const storyPressureWarnings = arrayValue(storyPressureLadder?.signals).filter(item => text(item?.status) === 'warn')
  const storyPressureBlocks = arrayValue(storyPressureLadder?.signals).filter(item => text(item?.status) === 'block')
  const storyPressureStatus: AutoCreationBatchGuardrailSignalStatus = storyPressureLadder?.status === 'blocked' || storyPressureBlocks.length > 0
    ? 'block'
    : storyPressureLadder?.status === 'needs_attention' || storyPressureWarnings.length > 0
      ? 'warn'
      : 'ok'
  const storyPressureDetail = storyPressureStatus !== 'ok'
    ? firstText(
        storyPressureLadder?.summary,
        arrayValue(storyPressureLadder?.nextActions)[0],
        `${storyPressureWarnings.length || storyPressureBlocks.length || 1} 项故事压力风险，需要补明确压力源、冲突升级、赌注升级或反转逼迫。`,
      )
    : firstText(storyPressureLadder?.summary, '未来章节有明确压力源、冲突升级、赌注升级和反转逼迫。')
  const storyUnitWorkshop = planning.storyUnitWorkshop
  const storyUnitSignals = arrayValue(storyUnitWorkshop?.currentUnit?.signals)
  const storyUnitWarnings = storyUnitSignals.filter(item => text(item?.status) === 'warn')
  const storyUnitBlocks = storyUnitSignals.filter(item => text(item?.status) === 'block')
  const storyUnitStatus: AutoCreationBatchGuardrailSignalStatus = storyUnitWorkshop?.status === 'blocked' || storyUnitBlocks.length > 0
    ? 'block'
    : storyUnitWorkshop?.status === 'needs_attention' || storyUnitWarnings.length > 0
      ? 'warn'
      : 'ok'
  const storyUnitDetail = storyUnitStatus !== 'ok'
    ? firstText(
        storyUnitWorkshop?.summary,
        storyUnitWorkshop?.currentUnit?.summary,
        arrayValue(storyUnitWorkshop?.nextActions)[0],
        `${storyUnitWarnings.length || storyUnitBlocks.length || 1} 项剧情单元缺口，需要补入口钩子、压力升级、小高潮回报、伏笔/剧情线或出单元钩子。`,
      )
    : firstText(storyUnitWorkshop?.summary, '当前剧情单元入口、压力升级、小高潮回报、伏笔/剧情线和出单元钩子完整。')
  const serialReleaseInventory = buildSerialReleaseInventoryGuardrail(planning)
  const deliveryRiskStatus: AutoCreationBatchGuardrailSignalStatus = args.deliveryRiskGate.status === 'ok'
    ? 'ok'
    : args.deliveryRiskGate.status === 'block'
      ? 'block'
      : 'warn'
  const hasScenePlan = planningDesk.scenePlanStatus === 'ready' || arrayValue(planningDesk.sceneCards).length > 0
  const currentChapterDelivered = !Boolean(acceptance.visible) && !chapterHandoffVisible
  const chapterPlanIssue = text(arrayValue(planningDesk.reasons)[0], '当前章任务书或场景卡未就绪。')
  const governanceBlocked = args.hasBlockingPlan
    || retentionActionNeeded
    || storylineActionNeeded
    || characterArcActionNeeded
    || volumeBeatActionNeeded
    || rhythmActionNeeded
  const chapterPlanReady = planningDesk.readiness === 'ready' && hasScenePlan
  const launchGateSignalStatus: AutoCreationBatchGuardrailSignalStatus = args.chapterLaunchGate.status === 'blocked'
    ? 'block'
    : args.chapterLaunchGate.status === 'warn'
      ? 'warn'
      : 'ok'

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
      canonRunway.label,
      canonRunway.status,
      canonRunway.detail,
    ),
    signal(
      '本章开写门禁',
      launchGateSignalStatus,
      args.chapterLaunchGate.summary,
    ),
    signal(
      '未清交稿风险',
      deliveryRiskStatus,
      args.deliveryRiskGate.summary,
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
      serialReleaseInventory.label,
      serialReleaseInventory.status,
      serialReleaseInventory.detail,
    ),
    signal(
      '百万字产能',
      capacityStatus,
      args.longformCapacity.summary,
    ),
    signal(
      '故事压力阶梯',
      storyPressureStatus,
      storyPressureDetail,
    ),
    signal(
      '剧情单元',
      storyUnitStatus,
      storyUnitDetail,
    ),
    signal(
      '近10章疲劳',
      fatigueStatus,
      fatigueDetail,
    ),
    signal(
      '章节任务书/场景卡',
      chapterPlanReady ? 'ok' : 'block',
      chapterPlanReady ? '当前章任务书和场景卡已就绪。' : chapterPlanIssue,
    ),
    chapterHandoffVisible
      ? signal(
        '章节交接',
        'block',
        chapterHandoffDetail(chapterHandoff),
      )
      : signal(
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
  const queueRelease = writingQueueRelease(writing, preliminarySafeChapterCount)
  const queueLimitedPreliminarySafeChapterCount = queueRelease.signal.status === 'block'
    ? 0
    : Math.min(preliminarySafeChapterCount, queueRelease.safeChapterCount)
  const preliminaryNextBatchBrief = buildNextBatchBrief({ planning, writing, safeChapterCount: queueLimitedPreliminarySafeChapterCount })
  const batchBriefSignal = buildNextBatchBriefSignal(preliminaryNextBatchBrief, queueLimitedPreliminarySafeChapterCount)
  const briefRepair = buildNextBatchBriefRepair(preliminaryNextBatchBrief, queueLimitedPreliminarySafeChapterCount, batchBriefSignal)
  guardrails.push(queueRelease.signal)
  guardrails.push(batchBriefSignal)
  guardrails.push(signal('每章交稿回填', 'ok', '连续生产仍按单章质检、修订、故事状态同步和资产发现逐章回填。'))

  const blocking = guardrails.find(item => item.status === 'block')
  const warning = guardrails.find(item => item.status === 'warn')
  const status: AutoCreationBatchGuardrailStatus = blocking ? 'blocked' : warning ? 'caution' : 'ready'
  let recommendedAction = args.mainAction

  if (blocking?.label === '长线记忆' || warning?.label === '长线记忆') {
    recommendedAction = canonRunway.action
  } else if (blocking?.label === '剧情单元' || warning?.label === '剧情单元') {
    recommendedAction = planningAction('update_rolling_plan', storyUnitDetail, '更新滚动规划', {
      source: 'story_unit_repair',
      story_unit_workshop: storyUnitWorkshop,
    })
  } else if (blocking?.label === '批次任务书' || warning?.label === '批次任务书') {
    recommendedAction = briefRepair.action
  } else if (blocking?.label === '连载库存' || warning?.label === '连载库存') {
    recommendedAction = serialReleaseInventory.action
  } else if (blocking?.label === '本章开写门禁' || warning?.label === '本章开写门禁') {
    recommendedAction = args.chapterLaunchGate.action
  } else if (blocking?.label === '写作队列放行' || warning?.label === '写作队列放行') {
    recommendedAction = queueRelease.action
  } else if (blocking?.label === '章节交接' || warning?.label === '章节交接') {
    recommendedAction = writingAction(
      (chapterHandoff?.actionKey || acceptance?.recommendedAcceptanceAction?.key || writing.primaryActionKey || 'accept_chapter_and_continue') as WritingCockpitActionKey,
      chapterHandoffDetail(chapterHandoff),
      text(chapterHandoff?.actionLabel, acceptance?.recommendedAcceptanceAction?.label || '处理章节交接'),
    )
  } else if (blocking?.label === '未清交稿风险' || warning?.label === '未清交稿风险') {
    recommendedAction = opsAction('create_delivery_risk_repair', '生成风险修复任务', args.deliveryRiskGate.summary)
  } else if (blocking?.label === '故事压力阶梯' || warning?.label === '故事压力阶梯') {
    recommendedAction = planningAction('update_rolling_plan', storyPressureDetail, '更新滚动规划', {
      source: 'story_pressure_repair',
      story_pressure_ladder: storyPressureLadder,
    })
  } else if (!blocking && warning?.label === '未来100章储备') {
    recommendedAction = planningAction('future100_generate', '先补齐更长线的未来100章储备，再扩大连续生产批次。')
  } else if (!blocking && warning?.label === '百万字产能') {
    recommendedAction = planningAction(args.longformCapacity.recommendedActionKey, args.longformCapacity.summary)
  } else if (!blocking && warning?.label === '近10章疲劳') {
    recommendedAction = planningAction('update_rolling_plan', fatigueDetail, '更新滚动规划', {
      source: 'recent_fatigue_repair',
      recent_fatigue_radar: fatigue,
    })
  }

  const safeChapterCount = status === 'blocked'
    ? 0
    : status === 'caution'
      ? Math.max(1, Math.min(1, queueLimitedPreliminarySafeChapterCount || 1))
      : queueLimitedPreliminarySafeChapterCount
  const nextBatchBrief = safeChapterCount === queueLimitedPreliminarySafeChapterCount
    ? preliminaryNextBatchBrief
    : buildNextBatchBrief({ planning, writing, safeChapterCount })
  const releaseWindow = buildBatchReleaseWindow(nextBatchBrief, queueRelease)
  const deliveryRiskCarryOver = normalizeSafeBatchDeliveryRiskCarryOver(
    planningDesk?.episodePlan?.deliveryRiskCarryOver
      || planningDesk?.episodePlan?.delivery_risk_carry_over
      || writing.nextChapter?.rawPayload?.pre_draft_brief?.delivery_risk_carry_over
      || writing.nextChapter?.rawPayload?.pre_draft_brief?.deliveryRiskCarryOver
      || null,
    Number(nextBatchBrief.chapters[0]?.chapterNo || 0) || null,
  )
  const chapterHandoffContract = normalizeSafeBatchChapterHandoffContract(
    writing,
    Number(nextBatchBrief.chapters[0]?.chapterNo || 0) || null,
  )
  const preflight = buildBatchPreflight({
    status,
    safeChapterCount,
    releaseWindow,
    nextBatchBrief,
    guardrails,
    storyState: args.storyState || {},
    deliveryRiskCarryOver,
    chapterHandoffContract,
  })

  if (status === 'ready') {
    recommendedAction = opsAction(
      'start_safe_batch_generation',
      '开始安全连写',
      `按护栏建议连续生成 ${safeChapterCount} 章；每章仍会走字数门禁、质检修订和故事状态回填。`,
      false,
      {
        source: 'auto_creation_safe_batch',
        safety_limit: safeChapterCount,
        allowed_chapter_nos: preflight.allowedChapterNos,
        next_batch_brief: nextBatchBrief,
        batch_preflight: preflight.inputSnapshot,
      },
    )
  }
  const briefRecovery = buildNextBatchBriefRecovery({
    status,
    safeChapterCount,
    nextBatchBrief,
    batchBriefSignal,
    recommendedAction,
  })

  return {
    status,
    label: status === 'ready' ? '可小批量连写' : status === 'caution' ? '谨慎单章推进' : '暂不适合连写',
    summary: status === 'ready'
      ? `建议先小批量连续生产 ${safeChapterCount} 章，每章都经过质检、回填和差异复盘后再扩大批次。`
      : status === 'caution'
        ? warning?.label === '批次任务书'
          ? '下一批任务书还不够具体，本轮建议只推进 1 章，并先补齐后续章节职责、冲突和钩子。'
          : warning?.label === '写作队列放行'
            ? '写作队列后续章节还没有连续进入可写状态，本轮只推进当前可写章节，并先补齐后续计划或交稿。'
            : warning?.label === '连载库存'
              ? `连载库存提示：${serialReleaseInventory.detail} 本轮只放行单章，先补存稿或后续规划。`
              : warning?.label === '近10章疲劳'
                ? `近10章疲劳雷达提示：${fatigueDetail} 本轮建议只推进 1 章，并先更新滚动规划更换压迫来源、回报形态、章末问题或可视化场面。`
                : warning?.label === '故事压力阶梯'
                  ? '故事压力阶梯提示压力不足，本轮建议只推进 1 章，并先更新滚动规划补明确压力源、升级赌注和反转逼迫。'
                  : warning?.label === '剧情单元'
                    ? '剧情单元工坊提示当前事件包不完整，本轮建议只推进 1 章，并先更新滚动规划补入口钩子、小高潮、伏笔/剧情线和出单元钩子。'
                    : '长线储备存在薄弱点，本轮建议只推进 1 章，并优先处理黄色风险。'
        : blocking?.detail || '当前存在阻塞项，暂不适合连续生产。',
    safeChapterCount,
    recommendedAction,
    guardrails,
    releaseWindow,
    preflight,
    nextBatchBrief,
    briefRepair,
    briefRecovery,
  }
}

function runwayGate(
  key: AutoCreationMillionWordRunwayGate['key'],
  label: string,
  status: AutoCreationBatchGuardrailSignalStatus,
  detail: string,
): AutoCreationMillionWordRunwayGate {
  return { key, label, status, detail }
}

function runwayQuestion(
  key: AutoCreationMillionWordRunwayQuestion['key'],
  label: string,
  answer: string,
  fallback: string,
  required = true,
): AutoCreationMillionWordRunwayQuestion {
  const normalized = text(answer)
  return {
    key,
    label,
    answer: normalized || fallback,
    status: normalized ? 'ok' : required ? 'block' : 'warn',
  }
}

function contractStatusToSignal(status: AutoCreationContractStatus | undefined): AutoCreationBatchGuardrailSignalStatus {
  if (status === 'block') return 'block'
  if (status === 'warn') return 'warn'
  return 'ok'
}

function batchStatusToSignal(status: AutoCreationBatchGuardrailStatus): AutoCreationBatchGuardrailSignalStatus {
  if (status === 'blocked') return 'block'
  if (status === 'caution') return 'warn'
  return 'ok'
}

function buildMillionWordRunway(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  longformCompass: AutoCreationLongformCompass
  creationContract: AutoCreationContractItem[]
  chapterLaunchGate: AutoCreationChapterLaunchGate
  canonRunway: AutoCreationCanonRunway
  batchGuardrail: AutoCreationBatchGuardrail
}): AutoCreationMillionWordRunway {
  const { planning, writing, longformCompass, chapterLaunchGate, canonRunway, batchGuardrail } = args
  const chapter = (writing.nextChapter || {}) as AnyRecord
  const raw = (chapter.rawPayload || chapter.raw_payload || {}) as AnyRecord
  const innovationContract = args.creationContract.find(item => item.key === 'innovation')
  const chapterGoal = firstText(chapter.chapterGoal, chapter.chapter_goal, raw.chapterGoal, raw.chapter_goal, raw.goal)
  const endingHook = firstText(chapter.endingHook, chapter.ending_hook, raw.endingHook, raw.ending_hook, raw.hook)
  const mainlineMove = firstText(raw.mainlineProgress, raw.mainline_progress, planning.mainline.nextTurn, planning.mainline.currentVolumeGoal)
  const freshness = firstText(
    longformCompass.axes.find(item => item.key === 'innovation_hook')?.value,
    innovationContract?.detail,
    planning.mainline.readerPromise,
  )
  const fourQuestions: AutoCreationMillionWordRunwayQuestion[] = [
    runwayQuestion('why_now', '这章为什么必须写', chapterGoal, '缺少本章明确目标，容易写成过渡章。'),
    runwayQuestion('page_turn', '读者为什么翻页', endingHook, '缺少章末追读钩子。'),
    runwayQuestion('mainline_move', '主线推进了什么', mainlineMove, '缺少主线推进落点。'),
    runwayQuestion('freshness', '这一章的新意在哪', freshness, '缺少差异化执行点，容易滑回同题材套路。', false),
  ]
  const questionBlocking = fourQuestions.some(item => item.status === 'block')
  const questionWarning = fourQuestions.some(item => item.status === 'warn')
  const readerFuel = compactList([
    firstText(raw.readerPayoff, raw.reader_payoff, raw.payoff, raw.payoffModel),
    planning.mainline.payoffModel ? `长期爽点：${planning.mainline.payoffModel}` : '',
    endingHook ? `章末钩子：${endingHook}` : '',
    planning.first30Retention?.summary ? `留存状态：${planning.first30Retention.summary}` : '',
  ], 5)
  const launchReaderSignals = chapterLaunchGate.signals.filter(item => ['reader_payoff', 'ending_hook'].includes(item.key))
  const readerFuelStatus: AutoCreationBatchGuardrailSignalStatus = launchReaderSignals.some(item => item.status === 'block')
    ? 'block'
    : launchReaderSignals.some(item => item.status === 'warn') || readerFuel.length < 2
      ? 'warn'
      : 'ok'
  const batchSignal = batchStatusToSignal(batchGuardrail.status)
  const gates: AutoCreationMillionWordRunwayGate[] = [
    runwayGate(
      'core_compass',
      '核心罗盘',
      longformCompass.status === 'ready' ? 'ok' : 'block',
      longformCompass.summary,
    ),
    runwayGate(
      'chapter_four_questions',
      '本章四问',
      questionBlocking ? 'block' : questionWarning ? 'warn' : 'ok',
      fourQuestions.map(item => `${item.label}：${item.answer}`).join('；'),
    ),
    runwayGate(
      'reader_fuel',
      '追读燃料',
      readerFuelStatus,
      readerFuel.length ? readerFuel.join('；') : '缺少本章读者回报和章末钩子。',
    ),
    runwayGate(
      'innovation',
      '创新差异',
      contractStatusToSignal(innovationContract?.status),
      innovationContract?.detail || '按创作契约检查创新角度、差异护栏和可视化场面。',
    ),
    runwayGate(
      'canon_memory',
      '长线记忆',
      canonRunway.status,
      canonRunway.detail,
    ),
    runwayGate(
      'batch_entry',
      '连写准入',
      batchSignal,
      batchGuardrail.summary,
    ),
  ]
  const blocking = gates.find(item => item.status === 'block')
  const warning = gates.find(item => item.status === 'warn')
  const status: AutoCreationMillionWordRunwayStatus = blocking ? 'blocked' : warning ? 'single_chapter' : 'ready'
  const recommendedAction = canonRunway.status !== 'ok'
    ? canonRunway.action
    : chapterLaunchGate.status !== 'ready'
      ? chapterLaunchGate.action
      : batchGuardrail.status !== 'ready'
        ? batchGuardrail.recommendedAction
        : batchGuardrail.recommendedAction
  const redLines = compactList([
    ...longformCompass.immutableRules,
    ...arrayValue(planning.mainline.risks).map(item => `当前风险：${text(item)}`),
  ], 6)

  return {
    status,
    label: status === 'ready' ? '航线可连续' : status === 'single_chapter' ? '航线仅单章' : '航线阻塞',
    summary: status === 'ready'
      ? `当前处于${planning.longformRhythm.currentBandLabel || '长篇跑道'}，核心、追读、创新、记忆和连写准入均可支撑小批量生产。`
      : status === 'single_chapter'
        ? `当前处于${planning.longformRhythm.currentBandLabel || '长篇跑道'}，${warning?.label || '长篇材料'}仍需关注，本轮只建议单章推进。`
        : `${blocking?.label || '长篇航线'}未通过：${blocking?.detail || '先处理阻塞项，再进入自动创作。'}`,
    bandLabel: planning.longformRhythm.currentBandLabel || '长篇跑道',
    safeModeLabel: status === 'ready' ? `小批量连写 ${batchGuardrail.safeChapterCount} 章` : status === 'single_chapter' ? '仅单章推进' : '禁止连写',
    gates,
    fourQuestions,
    redLines,
    readerFuel,
    recommendedAction,
  }
}

function buildBatchReviewQueue(args: {
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  planning?: PlanningWorkspaceModel | null
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
    const nextAction = opsAction('open_task_center', '查看任务中心', '查看后台任务、失败记录和可恢复任务。')
    const riskRadar = buildBatchRiskRadar({ items: [], chapters: args.chapters, reviews, planning: args.planning })
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
      nextAction,
      riskRadar,
      completionDashboard: buildBatchCompletionDashboard({
        status: 'empty',
        total: 0,
        success: 0,
        failed: 0,
        delivered: 0,
        riskRadar,
        nextAction,
      }),
      handoff: buildBatchHandoff({
        status: 'empty',
        total: 0,
        success: 0,
        failed: 0,
        delivered: 0,
        items: [],
        riskRadar,
        nextAction,
      }),
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
    planning: args.planning,
    resolvedIssueKeys,
    nextBatchBrief: latest.input?.next_batch_brief || latest.input?.nextBatchBrief || null,
  })
  const hasDeliveredBatchRisk = allSuccessfulChaptersDelivered && riskRadar.status === 'warn'
  const status: AutoCreationBatchReviewStatus = hasFailure
    ? 'warn'
    : hasDeliveredBatchRisk
      ? 'risk'
      : allSuccessfulChaptersDelivered ? 'done' : 'ok'
  const summary = hasFailure
    ? `本次安全连写 ${success}/${total} 章成功，先处理失败章节，再开启下一批。`
    : hasDeliveredBatchRisk
      ? `本次安全连写 ${delivered}/${total} 章已交付，但存在批次质量风险，先复盘修正再继续。`
    : allSuccessfulChaptersDelivered
      ? `本次安全连写 ${delivered}/${total} 章已完成交稿闭环，可以开启下一批安全连写。`
      : `本次安全连写 ${success}/${total} 章完成，下一步逐章质检、修订和状态回填。`
  const nextAction = hasFailure
    ? opsAction('open_task_center', '查看失败任务', '打开任务中心，定位失败章节和可恢复步骤。')
    : hasDeliveredBatchRisk
      ? opsAction('create_safe_batch_risk_repair', '生成批次修复任务', '把上一批的核心偏移、回报欠账、剧情线和可读性风险写入任务中心。')
    : allSuccessfulChaptersDelivered
      ? opsAction('start_safe_batch_generation', '开始下一批安全连写', '上一批已完成交稿闭环；按当前护栏继续小批量生产。')
      : planningAction('open_quality_revision', '进入质检修订，按章节质量、核心偏移、读者回报和剧情线同步逐章验收。')
  const completionDashboard = buildBatchCompletionDashboard({
    status,
    total,
    success,
    failed,
    delivered,
    riskRadar,
    nextAction,
  })
  const handoff = buildBatchHandoff({
    status,
    total,
    success,
    failed,
    delivered,
    items,
    riskRadar,
    nextAction,
  })

  return {
    visible: true,
    status,
    label: '安全连写复盘',
    summary,
    total,
    success,
    failed,
    delivered,
    safeLimit: safeLimit > 0 ? safeLimit : null,
    availableTotal: availableTotal > 0 ? availableTotal : null,
    createdAt: text(latest.run?.created_at),
    nextAction,
    riskRadar,
    completionDashboard,
    handoff,
    items,
  }
}

function batchGuardrailRiskLabels(guardrail: AutoCreationBatchGuardrail) {
  return guardrail.guardrails
    .filter(item => item.status !== 'ok')
    .map(item => item.label)
    .filter(Boolean)
}

function batchGuardrailEvidence(guardrail: AutoCreationBatchGuardrail) {
  return guardrail.guardrails
    .filter(item => item.status !== 'ok')
    .map(item => item.detail)
    .filter(Boolean)
    .slice(0, 4)
}

function actionTargetChapterNos(action: AutoCreationDirectorAction) {
  const payload = action.payload || {}
  return [
    ...arrayValue(payload?.chapter_nos),
    ...arrayValue(payload?.chapterNos),
    payload?.chapter_no,
    payload?.chapterNo,
  ].map(no => Number(no || 0)).filter(Boolean)
}

function reconcileBatchHandoffWithGuardrail(
  queue: AutoCreationBatchReviewQueue,
  guardrail: AutoCreationBatchGuardrail,
): AutoCreationBatchReviewQueue {
  if (!queue.visible || queue.status !== 'done' || guardrail.status === 'ready') return queue

  const targetChapterNos = Array.from(new Set([
    ...guardrail.releaseWindow.blockedChapters.map(chapter => Number(chapter.chapterNo || 0)),
    ...guardrail.preflight.blockedChapterNos,
    ...guardrail.nextBatchBrief.chapters.slice(0, 1).map(chapter => Number(chapter.chapterNo || 0)),
    ...actionTargetChapterNos(guardrail.recommendedAction),
  ].filter(Boolean)))
  const label = guardrail.recommendedAction.key === 'update_rolling_plan' ? '补下一批计划' : '处理下一批护栏'
  const riskLabels = batchGuardrailRiskLabels(guardrail)
  const evidence = batchGuardrailEvidence(guardrail)

  return {
    ...queue,
    handoff: {
      ...queue.handoff,
      visible: true,
      status: 'prepare_next',
      label,
      summary: `上一批 ${queue.delivered}/${queue.total} 章已完成交稿闭环，但下一批尚未通过安全连写护栏；先处理${riskLabels.length ? `「${riskLabels[0]}」` : '下一批计划'}再继续连写。`,
      action: guardrail.recommendedAction,
      targetChapterNos,
      riskLabels,
      evidence,
    },
  }
}

function hasBatchReviewRisk(queue: AutoCreationBatchReviewQueue) {
  return queue.visible && (queue.status === 'warn' || queue.status === 'risk')
}

function isFuelGovernanceAction(action: AutoCreationDirectorAction) {
  if (action.area === 'writing' && [
    'update_canon',
    'fix_continuity',
  ].includes(String(action.key))) return true
  return action.area === 'planning' && [
    'run_first30_retention',
    'create_first30_repair',
    'open_story_assets',
    'complete_volume_plan',
    'longform_pressure',
    'open_quality_revision',
    'update_rolling_plan',
    'future100_generate',
    'topic_validation',
    'reference_diagnosis',
  ].includes(String(action.key))
}

function buildFuelAction(args: {
  mainAction: AutoCreationDirectorAction
  longformCapacity: AutoCreationLongformCapacity
}) {
  if (isFuelGovernanceAction(args.mainAction)) return args.mainAction
  const fuel = args.longformCapacity.fuelQueue[0]
  if (fuel) {
    return {
      area: 'planning' as const,
      key: fuel.actionKey,
      label: fuel.actionLabel,
      description: fuel.detail,
      modelCall: fuel.modelCall,
    }
  }
  return planningAction('longform_creation_diagnosis', '检查读者承诺、长线冲突、创新差异和留存牵引，作为今天继续生产前的总诊断。')
}

function buildChapterWorkAction(writing: WritingCockpitModel, writingQueueFocus?: AutoCreationWritingQueueFocus) {
  if (writingQueueFocus?.visible) return writingQueueFocus.action
  const acceptance = writing.chapterAcceptanceDesk
  if (acceptance.visible) {
    const action = acceptance.recommendedAcceptanceAction
    return writingAction(action.key, '先把当前章走完质检、修订、状态回填和验收闭环。', action.label)
  }
  const plannerAction = writing.chapterPlanningDesk.recommendedPlannerAction
  return writingAction(
    plannerAction.key || writing.primaryActionKey,
    '按章节任务书、场景卡和字数门禁推进当前章。',
    plannerAction.label,
  )
}

function buildDailyBattlePlan(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  mainAction: AutoCreationDirectorAction
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  batchGuardrail: AutoCreationBatchGuardrail
  batchReviewQueue: AutoCreationBatchReviewQueue
  longformCapacity: AutoCreationLongformCapacity
  writingQueueFocus: AutoCreationWritingQueueFocus
  hasBlockingPlan: boolean
  hasModel: boolean
  activeTasks: AnyRecord[]
}): AutoCreationDailyBattlePlan {
  const riskActive = args.deliveryRiskGate.status !== 'ok' || hasBatchReviewRisk(args.batchReviewQueue)
  const canonBlocked = args.batchGuardrail.guardrails.find(item => item.label === '长线记忆')?.status === 'block'
  const serialReleaseBlocked = args.batchGuardrail.guardrails.find(item => item.label === '连载库存')?.status === 'block'
  const fuelActive = !riskActive && (
    args.hasBlockingPlan
    || retentionNeedsAction(args.planning)
    || storylineNeedsAction(args.planning)
    || characterArcNeedsAction(args.planning)
    || volumeBeatNeedsAction(args.planning)
    || rhythmNeedsAction(args.planning)
    || args.longformCapacity.status === 'blocked'
    || canonBlocked
  )
  const chapter = args.writing.nextChapter
  const acceptance = args.writing.chapterAcceptanceDesk
  const chapterHandoff = (args.writing as any).chapterHandoffDesk || null
  const chapterHandoffVisible = Boolean(chapterHandoff?.visible)
  const chapterDone = Boolean(chapter?.hasProse) && !acceptance.visible && !chapterHandoffVisible
  const chapterBlocked = !chapter || args.writing.chapterPlanningDesk.readiness === 'blocked'
  const chapterActive = !riskActive && !fuelActive && !chapterDone
  const queueFocus = args.writingQueueFocus.visible ? args.writingQueueFocus : null

  const clearRiskAction = args.deliveryRiskGate.status !== 'ok'
    ? opsAction('create_delivery_risk_repair', '生成风险修复任务', args.deliveryRiskGate.summary)
    : hasBatchReviewRisk(args.batchReviewQueue)
      ? args.batchReviewQueue.nextAction
      : opsAction('open_task_center', '查看任务中心', '查看后台任务、失败记录和可恢复任务。')
  const fuelAction = buildFuelAction({
    mainAction: args.mainAction,
    longformCapacity: args.longformCapacity,
  })
  const chapterAction = buildChapterWorkAction(args.writing, args.writingQueueFocus)
  const batchAction = args.batchGuardrail.recommendedAction
  const batchStatus: AutoCreationPipelineStatus = riskActive
    ? 'blocked'
    : canonBlocked || serialReleaseBlocked
      ? 'blocked'
    : fuelActive || chapterActive
      ? 'pending'
      : args.batchGuardrail.status === 'ready'
        ? 'active'
        : args.batchGuardrail.status === 'caution'
          ? 'warning'
          : 'blocked'

  const steps: AutoCreationDailyBattleStep[] = [
    {
      key: 'clear_risks',
      label: '清交稿风险',
      status: riskActive ? 'active' : 'done',
      detail: riskActive
        ? args.deliveryRiskGate.status !== 'ok' ? args.deliveryRiskGate.summary : args.batchReviewQueue.summary
        : '交稿风险、批次失败和质量复盘没有阻塞今天生产。',
      action: clearRiskAction,
      badges: [
        args.deliveryRiskGate.totalOpen > 0 ? `未清 ${args.deliveryRiskGate.totalOpen}` : '',
        args.deliveryRiskGate.highOpen > 0 ? `高危 ${args.deliveryRiskGate.highOpen}` : '',
        hasBatchReviewRisk(args.batchReviewQueue) ? args.batchReviewQueue.label : '',
      ].filter(Boolean),
      gateChecks: [
        '交稿风险清零或已生成修复任务',
        '上一批失败、核心偏移、追读欠账、剧情线风险不继续滚入新章',
      ],
    },
    {
      key: 'fuel_materials',
      label: '补长线材料',
      status: riskActive ? 'pending' : fuelActive ? 'active' : 'done',
      detail: fuelActive
        ? args.mainAction.description
        : '前30章留存、剧情线、人物成长、卷级爆点和长篇节奏可支撑今天单章推进。',
      action: fuelAction,
      badges: [
        args.planning.first30Retention.score !== null ? `前30章 ${args.planning.first30Retention.score}` : '',
        `剧情线 ${args.planning.storylineBoard.total}`,
        args.longformCapacity.status !== 'ready' ? args.longformCapacity.label : '',
      ].filter(Boolean),
      gateChecks: [
        '未来10章规划、剧情线、爆点预算和长篇节奏可支撑当前章',
        '人物成长、关系推进和弧光兑现没有明显断档',
        '读者承诺、主线方向、创新卖点和追读燃料仍清晰',
      ],
    },
    {
      key: 'chapter_work',
      label: '写/修当前章',
      status: riskActive || fuelActive
        ? 'pending'
        : chapterDone
          ? 'done'
          : chapterBlocked ? 'blocked' : 'active',
      detail: queueFocus
        ? `${queueFocus.label}：${queueFocus.summary}`
        : chapterHandoffVisible
          ? `${text(chapterHandoff?.label, '章节交接')}：${chapterHandoffDetail(chapterHandoff)}`
        : chapterDone
        ? '当前章已完成交稿闭环，可以准备下一批生产。'
        : acceptance.visible
          ? (acceptance.acceptanceReasons[0] || acceptance.statusLabel)
          : args.writing.chapterPlanningDesk.reasons[0] || args.writing.topStatus.nextActionLabel,
      action: chapterAction,
      badges: queueFocus?.badges.length ? queueFocus.badges : [
        chapterHandoffVisible ? `第${Number(chapterHandoff?.fromChapterNo || 0) || '-'}章→第${Number(chapterHandoff?.toChapterNo || 0) || '-' }章` : '',
        chapterHandoffVisible ? text(chapterHandoff?.label) : '',
        chapter ? `第${Number(chapter.chapterNo || 0)}章` : '',
        chapter?.hasProse ? `${Number(chapter.wordCount || 0)}字` : args.writing.chapterPlanningDesk.statusLabel,
      ].filter(Boolean),
      gateChecks: [
        '当前章完成任务书、正文、质检、修订、故事状态同步和验收闭环',
        '正文满足字数门禁、核心不偏、读者期待和章末追读要求',
      ],
    },
    {
      key: 'batch_release',
      label: '放行下一批',
      status: batchStatus,
      detail: args.batchGuardrail.summary,
      action: batchAction,
      badges: [
        `安全 ${args.batchGuardrail.safeChapterCount}章`,
        args.batchGuardrail.nextBatchBrief.visible ? args.batchGuardrail.nextBatchBrief.chapterRangeLabel : '',
      ].filter(Boolean),
      gateChecks: [
        '下一批只放行安全连写护栏允许的连续章节',
        '批次任务书、长线记忆、近10章疲劳和交稿回填均已通过',
      ],
    },
  ]

  const currentStep = steps.find(step => step.status === 'active')
    || steps.find(step => step.status === 'blocked')
    || steps.find(step => step.status === 'warning')
    || steps[steps.length - 1]
  const currentStepKey = currentStep.key
  const summary = currentStepKey === 'clear_risks'
    ? '今天先清未交稿风险，再进入章节生产；避免问题章节带着核心偏移、追读欠账或禁揭风险滚入后文。'
    : currentStepKey === 'fuel_materials'
      ? '今天先补长线材料，再写当前章；保证 300万到1000万字生产时主线、留存和爆点不断粮。'
      : currentStepKey === 'chapter_work'
        ? '今天先推进当前章，把任务书、正文、质检、修订和状态回填做成一个闭环。'
        : '当前章闭环已完成，可以按护栏放行下一批小规模安全连写。'

  return {
    label: '连载日更作战',
    summary,
    currentStepKey,
    steps,
  }
}

function buildProductionLicense(args: {
  hasModel: boolean
  mainAction: AutoCreationDirectorAction
  dailyBattlePlan: AutoCreationDailyBattlePlan
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  batchReviewQueue: AutoCreationBatchReviewQueue
  batchGuardrail: AutoCreationBatchGuardrail
  chapterLaunchGate: AutoCreationChapterLaunchGate
  millionWordRunway: AutoCreationMillionWordRunway
}): AutoCreationProductionLicense {
  const currentStep = args.dailyBattlePlan.steps.find(step => step.key === args.dailyBattlePlan.currentStepKey)
    || args.dailyBattlePlan.steps[0]
  const hasOpenDeliveryRisk = args.deliveryRiskGate.status !== 'ok'
  const hasOpenBatchRisk = hasBatchReviewRisk(args.batchReviewQueue)
  const serialReleaseIssue = serialReleaseInventoryIssue(args.batchGuardrail)
  const serialReleaseBlocked = serialReleaseIssue?.status === 'block'
  const hardBlocked = !args.hasModel
    || hasOpenDeliveryRisk
    || hasOpenBatchRisk
    || serialReleaseBlocked
    || args.chapterLaunchGate.status === 'blocked'
    || args.millionWordRunway.status === 'blocked'
    || currentStep.status === 'blocked'
  const reasons = [
    !args.hasModel ? '未选择可用模型' : '',
    hasOpenDeliveryRisk ? args.deliveryRiskGate.summary : '',
    hasOpenBatchRisk ? args.batchReviewQueue.summary : '',
    serialReleaseBlocked ? serialReleaseIssue?.detail : '',
    args.chapterLaunchGate.status === 'blocked' ? args.chapterLaunchGate.summary : '',
    args.millionWordRunway.status === 'blocked' ? args.millionWordRunway.summary : '',
    currentStep.status === 'blocked' ? currentStep.detail : '',
  ].filter(Boolean).slice(0, 4)

  if (hardBlocked) {
    return {
      status: 'blocked',
      label: '生产许可',
      modeLabel: '禁止生产',
      summary: reasons[0] || '当前存在未处理门禁，先完成总控台唯一下一步，再继续生成正文或安全连写。',
      safeChapterCount: 0,
      reasons,
      badges: ['禁止连写', serialReleaseBlocked ? '发布窗口阻塞' : currentStep.label],
      nextAction: serialReleaseBlocked ? args.batchGuardrail.recommendedAction : currentStep.action || args.mainAction,
    }
  }

  if (args.batchGuardrail.status === 'ready' && args.batchGuardrail.recommendedAction.key === 'start_safe_batch_generation') {
    return {
      status: 'batch_allowed',
      label: '生产许可',
      modeLabel: '小批量连写',
      summary: `当前长线材料、交稿风险和下一批任务书已通过检查，可按安全连写放行 ${args.batchGuardrail.safeChapterCount} 章。`,
      safeChapterCount: args.batchGuardrail.safeChapterCount,
      reasons: ['长线材料可用', '交稿风险已清', '下一批任务书可执行'],
      badges: [`安全 ${args.batchGuardrail.safeChapterCount}章`, args.batchGuardrail.nextBatchBrief.chapterRangeLabel].filter(Boolean),
      nextAction: args.batchGuardrail.recommendedAction,
    }
  }

  if (currentStep.key === 'chapter_work' && currentStep.status === 'active') {
    return {
      status: 'single_chapter',
      label: '生产许可',
      modeLabel: '单章生产',
      summary: '先推进当前章，把任务书、正文、质检、修订和状态回填做成闭环；暂不放行下一批自动连写。',
      safeChapterCount: 1,
      reasons: [currentStep.detail],
      badges: ['单章闭环', currentStep.label],
      nextAction: currentStep.action,
    }
  }

  if (args.batchGuardrail.status === 'caution') {
    return {
      status: 'single_chapter',
      label: '生产许可',
      modeLabel: '单章生产',
      summary: '下一批护栏仍有谨慎项，只允许单章小步推进，避免批量生成时放大主线偏移或节奏疲劳。',
      safeChapterCount: Math.max(1, Math.min(1, args.batchGuardrail.safeChapterCount || 1)),
      reasons: args.batchGuardrail.guardrails.filter(item => item.status !== 'ok').map(item => item.detail).slice(0, 4),
      badges: ['禁止批量', '单章校验'],
      nextAction: args.batchGuardrail.recommendedAction,
    }
  }

  return {
    status: 'blocked',
    label: '生产许可',
    modeLabel: '禁止生产',
    summary: currentStep.detail || '先完成当前总控步骤，再继续生产。',
    safeChapterCount: 0,
    reasons: [currentStep.detail].filter(Boolean),
    badges: ['等待门禁', currentStep.label],
    nextAction: currentStep.action || args.mainAction,
  }
}

function buildTodayCommandDeck(args: {
  dailyBattlePlan: AutoCreationDailyBattlePlan
  productionLicense: AutoCreationProductionLicense
  creationContract: AutoCreationContractItem[]
  chapterLaunchGate: AutoCreationChapterLaunchGate
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  batchGuardrail: AutoCreationBatchGuardrail
  millionWordRunway: AutoCreationMillionWordRunway
}): AutoCreationTodayCommandDeck {
  const currentStep = args.dailyBattlePlan.steps.find(step => step.key === args.dailyBattlePlan.currentStepKey)
    || args.dailyBattlePlan.steps[0]
  const reasons = [
    args.productionLicense.summary,
    ...args.productionLicense.reasons,
    currentStep?.detail || '',
  ]

  return {
    label: '今日指挥条',
    status: args.productionLicense.status,
    modeLabel: args.productionLicense.modeLabel,
    currentStepLabel: currentStep?.label || '等待下一步',
    summary: args.productionLicense.summary,
    reasons: Array.from(new Set(reasons.filter(Boolean))).slice(0, 3),
    action: args.productionLicense.nextAction,
    actionLabel: args.productionLicense.nextAction.label,
    releaseRationale: buildReleaseRationale(args),
    qualityGates: buildTodayQualityGates(args),
    flow: args.dailyBattlePlan.steps.map(step => ({
      key: step.key,
      label: step.label,
      status: step.status,
    })),
  }
}

function buildReleaseRationale(args: {
  productionLicense: AutoCreationProductionLicense
  dailyBattlePlan: AutoCreationDailyBattlePlan
  batchGuardrail: AutoCreationBatchGuardrail
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  millionWordRunway: AutoCreationMillionWordRunway
}): AutoCreationReleaseRationale {
  const currentStep = args.dailyBattlePlan.steps.find(step => step.key === args.dailyBattlePlan.currentStepKey)
    || args.dailyBattlePlan.steps[0]
  const guardrailIssues = args.batchGuardrail.guardrails
    .filter(item => item.status !== 'ok')
    .map(item => item.detail)
    .filter(Boolean)
  if (args.productionLicense.status === 'batch_allowed') {
    return {
      mode: args.productionLicense.modeLabel,
      allowedCount: args.productionLicense.safeChapterCount,
      primaryReason: args.productionLicense.summary,
      checks: Array.from(new Set([
        ...args.productionLicense.reasons,
        args.batchGuardrail.nextBatchBrief.visible ? '批次任务书完整' : '',
        args.batchGuardrail.preflight.status === 'ready' ? '预执行确认通过' : '',
      ].filter(Boolean))).slice(0, 5),
      limits: [
        '只放行护栏确认的连续章节',
        '每章仍走字数门禁、质检修订和故事状态回填',
      ],
    }
  }

  if (args.productionLicense.status === 'single_chapter') {
    return {
      mode: args.productionLicense.modeLabel,
      allowedCount: Math.max(1, args.productionLicense.safeChapterCount || 1),
      primaryReason: args.productionLicense.summary,
      checks: Array.from(new Set([
        ...args.productionLicense.reasons,
        ...guardrailIssues,
      ].filter(Boolean))).slice(0, 5),
      limits: [
        '暂不放行批量自动连写',
        '当前章交稿闭环完成后再评估下一批',
      ],
    }
  }

  return {
    mode: args.productionLicense.modeLabel,
    allowedCount: 0,
    primaryReason: args.productionLicense.summary,
    checks: Array.from(new Set([
      ...args.productionLicense.reasons,
      args.deliveryRiskGate.status !== 'ok' ? args.deliveryRiskGate.summary : '',
      args.millionWordRunway.status === 'blocked' ? args.millionWordRunway.summary : '',
      currentStep?.detail || '',
    ].filter(Boolean))).slice(0, 5),
    limits: [
      '禁止批量自动连写',
      '先完成总控台唯一下一步',
    ],
  }
}

function contractGateStatus(value: string): AutoCreationBatchGuardrailSignalStatus {
  if (value === 'block' || value === 'blocked') return 'block'
  if (value === 'warn' || value === 'warning' || value === 'needs_attention') return 'warn'
  return 'ok'
}

function chapterLaunchQualityStatus(value: string): AutoCreationBatchGuardrailSignalStatus {
  if (value === 'blocked') return 'block'
  if (value === 'warn') return 'warn'
  return 'ok'
}

function batchGateStatus(value: string): AutoCreationBatchGuardrailSignalStatus {
  if (value === 'blocked') return 'block'
  if (value === 'caution') return 'warn'
  return 'ok'
}

function runwayGateStatus(value: string): AutoCreationBatchGuardrailSignalStatus {
  if (value === 'blocked') return 'block'
  return 'ok'
}

function mergeGateStatus(...values: AutoCreationBatchGuardrailSignalStatus[]): AutoCreationBatchGuardrailSignalStatus {
  if (values.includes('block')) return 'block'
  if (values.includes('warn')) return 'warn'
  return 'ok'
}

function categoryRiskStatus(
  deliveryRiskGate: AutoCreationDeliveryRiskGate,
  categories: AutoCreationDeliveryRiskGateCategory['key'][],
): AutoCreationBatchGuardrailSignalStatus {
  const matched = deliveryRiskGate.categories.filter(item => categories.includes(item.key))
  if (matched.some(item => item.highCount > 0)) return 'block'
  if (matched.some(item => item.count > 0)) return 'warn'
  return 'ok'
}

function contractItem(items: AutoCreationContractItem[], key: AutoCreationContractItem['key']) {
  return items.find(item => item.key === key) || null
}

function contractDetail(item: AutoCreationContractItem | null, fallback: string) {
  return firstText(item?.detail, item?.evidence?.[0], fallback)
}

function buildTodayQualityGates(args: {
  productionLicense: AutoCreationProductionLicense
  creationContract: AutoCreationContractItem[]
  chapterLaunchGate: AutoCreationChapterLaunchGate
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  batchGuardrail: AutoCreationBatchGuardrail
  millionWordRunway: AutoCreationMillionWordRunway
}): AutoCreationTodayQualityGate[] {
  const core = contractItem(args.creationContract, 'core')
  const story = contractItem(args.creationContract, 'story')
  const readerPull = contractItem(args.creationContract, 'reader_pull')
  const innovation = contractItem(args.creationContract, 'innovation')
  const readerRisk = categoryRiskStatus(args.deliveryRiskGate, ['reader_retention', 'reader_payoff'])
  const innovationRisk = categoryRiskStatus(args.deliveryRiskGate, ['innovation', 'signature_scene'])
  const serialReleaseIssue = serialReleaseInventoryIssue(args.batchGuardrail)
  const serialRisk = mergeGateStatus(
    args.deliveryRiskGate.status === 'block' ? 'block' : args.deliveryRiskGate.status === 'warn' ? 'warn' : 'ok',
    serialReleaseIssue?.status || 'ok',
    args.productionLicense.status === 'single_chapter' ? 'ok' : batchGateStatus(args.batchGuardrail.status),
    runwayGateStatus(args.millionWordRunway.status),
  )

  return [
    {
      key: 'core',
      label: '核心不偏',
      status: contractGateStatus(String(core?.status || 'ok')),
      detail: contractDetail(core, '作品核心、读者承诺和长期矛盾清晰可守。'),
    },
    {
      key: 'story_drive',
      label: '故事推进',
      status: mergeGateStatus(contractGateStatus(String(story?.status || 'ok')), chapterLaunchQualityStatus(args.chapterLaunchGate.status)),
      detail: args.chapterLaunchGate.status === 'ready'
        ? contractDetail(story, '本章目标、冲突和章末钩子能推动主线。')
        : args.chapterLaunchGate.summary,
    },
    {
      key: 'reader_pull',
      label: '读者拉力',
      status: mergeGateStatus(contractGateStatus(String(readerPull?.status || 'ok')), readerRisk),
      detail: readerRisk === 'ok'
        ? contractDetail(readerPull, '开篇钩子、追读问题和回报循环可支撑继续阅读。')
        : args.deliveryRiskGate.summary,
    },
    {
      key: 'innovation',
      label: '创新差异',
      status: mergeGateStatus(contractGateStatus(String(innovation?.status || 'ok')), innovationRisk),
      detail: innovationRisk === 'ok'
        ? contractDetail(innovation, '差异化机制、场面或人物选择不会退回普通套路章。')
        : args.deliveryRiskGate.summary,
    },
    {
      key: 'serial_safety',
      label: '连载安全',
      status: serialRisk,
      detail: serialRisk === 'ok'
        ? '交稿风险已清，剧情线、剧情单元、百万字航线和连续生产护栏可控。'
        : firstText(
          args.deliveryRiskGate.status !== 'ok' ? args.deliveryRiskGate.summary : '',
          serialReleaseIssue?.detail,
          args.batchGuardrail.summary,
          args.millionWordRunway.summary,
        ),
    },
  ]
}

function buildPipeline(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  activeTasks: AnyRecord[]
  hasBlockingPlan: boolean
  hasModel: boolean
  creationContract: AutoCreationContractItem[]
  longformCapacity: AutoCreationLongformCapacity
  rollingScriptRoom: AutoCreationRollingScriptRoom
  batchGuardrail: AutoCreationBatchGuardrail
}): AutoCreationPipelineStep[] {
  const acceptance = args.writing.chapterAcceptanceDesk
  const planningDesk = args.writing.chapterPlanningDesk
  const chapter = args.writing.nextChapter
  const hasProse = Boolean(chapter?.hasProse)
  const retentionAction = retentionNeedsAction(args.planning)
  const storylineAction = storylineNeedsAction(args.planning)
  const characterArcAction = characterArcNeedsAction(args.planning)
  const running = hasRunningTasks(args.activeTasks)
  const chapterHandoff = (args.writing as any).chapterHandoffDesk || null
  const chapterHandoffVisible = Boolean(chapterHandoff?.visible)
  const qualityDone = Boolean(acceptance.visible && (
    acceptance.acceptanceStatus === 'ready_to_accept'
    || acceptance.acceptanceStatus === 'delivered'
  ))
  const canonDone = Boolean(acceptance.visible && acceptance.storyStateSynced)
  const handoffStatus: AutoCreationPipelineStatus = chapterHandoffVisible
    ? 'active'
    : hasProse && (!acceptance.visible || (qualityDone && canonDone))
      ? 'done'
      : 'pending'
  const handoffDetail = chapterHandoffVisible
    ? chapterHandoffDetail(chapterHandoff)
    : hasProse
      ? handoffStatus === 'done'
        ? '章节交接已完成或暂无下一章交接。'
        : '等待质检、修订和故事状态回填完成后生成交接单。'
      : '等待正文交稿后生成交接单。'

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
      key: 'rolling_script_room',
      label: '百章剧本室',
      status: rollingLayerStatusToPipeline(args.rollingScriptRoom.status),
      detail: `${args.rollingScriptRoom.focusRangeLabel}：${args.rollingScriptRoom.summary}`,
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
      status: storylineAction || characterArcAction ? 'warning' : 'done',
      detail: [
        args.planning.storylineBoard.summary,
        characterArcAction ? args.planning.characterArcBoard.summary : '',
      ].filter(Boolean).join('；'),
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
      key: 'chapter_execution',
      label: '正文生产',
      status: hasProse ? 'done' : planningDesk.readiness === 'ready' && !retentionAction && !storylineAction && !characterArcAction && !args.hasBlockingPlan ? 'active' : 'pending',
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
      key: 'chapter_handoff',
      label: '章节交接',
      status: handoffStatus,
      detail: handoffDetail,
    },
    {
      key: 'batch_guardrail',
      label: '连续生产护栏',
      status: batchPipelineStatus(args.batchGuardrail.status),
      detail: `${args.batchGuardrail.label}，安全批次 ${args.batchGuardrail.safeChapterCount} 章`,
    },
    {
      key: 'async_tasks',
      label: '任务队列',
      status: running ? 'active' : 'done',
      detail: running ? `${args.activeTasks.length} 个任务运行中` : '无排队任务',
    },
  ]
}

function highestPipelineStatus(steps: AutoCreationPipelineStep[]): AutoCreationPipelineStatus {
  if (steps.some(step => step.status === 'blocked')) return 'blocked'
  if (steps.some(step => step.status === 'active')) return 'active'
  if (steps.some(step => step.status === 'warning')) return 'warning'
  if (steps.every(step => step.status === 'done')) return 'done'
  return 'pending'
}

function compactStatus(
  status: AutoCreationPipelineStatus,
  current: boolean,
  alreadyPassed: boolean,
): AutoCreationPipelineStatus {
  if (current) return status === 'done' ? 'active' : status
  if (alreadyPassed) return status === 'blocked' ? 'blocked' : 'done'
  return status === 'blocked' ? 'blocked' : status === 'warning' ? 'warning' : 'pending'
}

function planningPipelineStatusToDirector(status: string, active: boolean): AutoCreationPipelineStatus {
  if (status === 'block' || status === 'blocked') return 'blocked'
  if (status === 'warn' || status === 'warning') return 'warning'
  if (status === 'ok' || status === 'ready') return 'done'
  if (active) return 'active'
  return 'pending'
}

function buildCreationPipeline(args: {
  planning: PlanningWorkspaceModel
  mainAction: AutoCreationDirectorAction
  serialWorkflow?: AutoCreationSerialWorkflow
}): AutoCreationDirectorCreationPipeline {
  const source = (args.planning as any).creationPipeline
  const sourceStages = arrayValue(source?.stages)
  if (sourceStages.length > 0) {
    const stages = sourceStages.map((stage: AnyRecord) => {
      const actionKey = text(stage?.actionKey || stage?.action_key, 'enter_story_planning') as PlanningActionKey
      const detail = text(stage?.detail, '等待规划页补充阶段说明。')
      return {
        key: text(stage?.key, actionKey),
        label: text(stage?.label, actionKey),
        status: planningPipelineStatusToDirector(text(stage?.status), Boolean(stage?.active)),
        active: Boolean(stage?.active),
        score: Math.max(0, Math.min(100, Number(stage?.score || 0))),
        detail,
        action: planningAction(actionKey, detail, PLANNING_ACTION_LABELS[actionKey] || text(stage?.label, actionKey)),
      }
    })
    const primaryKey = text(source?.primaryAction?.key || source?.primary_action?.key, stages.find(stage => stage.active)?.action.key || 'enter_story_planning') as PlanningActionKey
    const primaryReason = text(source?.primaryAction?.reason || source?.primary_action?.reason, source?.summary || '按故事规划页的当前建议推进。')
    return {
      currentStageKey: text(source?.currentStageKey || source?.current_stage_key, stages.find(stage => stage.active)?.key || stages[0]?.key || 'chapter_launch'),
      summary: text(source?.summary, '故事规划页暂未生成流水线摘要。'),
      riskCount: Number(source?.riskCount || source?.risk_count || stages.filter(stage => ['blocked', 'warning'].includes(stage.status)).length),
      primaryAction: planningAction(primaryKey, primaryReason, text(source?.primaryAction?.label || source?.primary_action?.label, PLANNING_ACTION_LABELS[primaryKey] || primaryKey)),
      stages,
    }
  }

  const fallbackStages = arrayValue(args.serialWorkflow?.stages).map((stage: AnyRecord) => ({
    key: text(stage?.key, 'chapter_launch'),
    label: text(stage?.label, '章节开写'),
    status: text(stage?.status, 'pending') as AutoCreationPipelineStatus,
    active: text(stage?.key) === text(args.serialWorkflow?.currentKey),
    score: stage?.status === 'done' ? 88 : stage?.status === 'active' ? 76 : stage?.status === 'blocked' ? 45 : 64,
    detail: text(stage?.detail, '等待流水线阶段判断。'),
    action: stage?.action || args.mainAction,
  }))
  return {
    currentStageKey: text(args.serialWorkflow?.currentKey, fallbackStages.find(stage => stage.active)?.key || 'chapter_launch'),
    summary: text(args.serialWorkflow?.summary, '按当前总控台判断推进下一步。'),
    riskCount: fallbackStages.filter(stage => ['blocked', 'warning'].includes(stage.status)).length,
    primaryAction: args.mainAction,
    stages: fallbackStages,
  }
}

function buildSerialWorkflow(args: {
  hasModel: boolean
  mainAction: AutoCreationDirectorAction
  status: AutoCreationDirectorStatus
  writing: WritingCockpitModel
  creationContract: AutoCreationContractItem[]
  pipeline: AutoCreationPipelineStep[]
  productionLicense: AutoCreationProductionLicense
  batchGuardrail: AutoCreationBatchGuardrail
  deliveryRiskGate: AutoCreationDeliveryRiskGate
}): AutoCreationSerialWorkflow {
  const byKey = new Map(args.pipeline.map(step => [step.key, step]))
  const acceptance = args.writing.chapterAcceptanceDesk
  const chapter = args.writing.nextChapter
  const hasProse = Boolean(chapter?.hasProse || acceptance?.visible)
  const contractStatus = contractPipelineStatus(args.creationContract)
  const longformStatus = highestPipelineStatus([
    byKey.get('longform_planning'),
    byKey.get('rolling_script_room'),
    byKey.get('longform_capacity'),
    byKey.get('volume_beat_budget'),
    byKey.get('longform_rhythm'),
    byKey.get('story_assets'),
    byKey.get('retention_curve'),
  ].filter(Boolean) as AutoCreationPipelineStep[])
  const chapterStatus = highestPipelineStatus([
    byKey.get('chapter_planning'),
    byKey.get('chapter_execution'),
  ].filter(Boolean) as AutoCreationPipelineStep[])
  const deliveryStatus = highestPipelineStatus([
    byKey.get('quality_gate'),
    byKey.get('canon_sync'),
    byKey.get('chapter_handoff'),
  ].filter(Boolean) as AutoCreationPipelineStep[])
  const governanceStatus = highestPipelineStatus([
    byKey.get('batch_guardrail'),
    byKey.get('async_tasks'),
  ].filter(Boolean) as AutoCreationPipelineStep[])

  let currentKey: AutoCreationSerialStageKey = 'chapter_launch'
  if (!args.hasModel || contractStatus === 'blocked' || contractStatus === 'warning') {
    currentKey = 'book_core'
  } else if (args.mainAction.area === 'planning' || args.status === 'needs_governance' && !acceptance?.visible && args.deliveryRiskGate.status === 'ok') {
    currentKey = 'longform_plan'
  } else if (acceptance?.visible) {
    currentKey = 'delivery_acceptance'
  } else if (args.deliveryRiskGate.status !== 'ok' || args.productionLicense.status === 'batch_allowed' || args.batchGuardrail.status !== 'blocked' && hasProse) {
    currentKey = 'serial_governance'
  }

  const order: AutoCreationSerialStageKey[] = ['book_core', 'longform_plan', 'chapter_launch', 'delivery_acceptance', 'serial_governance']
  const currentIndex = order.indexOf(currentKey)
  const stageStatus = (key: AutoCreationSerialStageKey, raw: AutoCreationPipelineStatus) => compactStatus(raw, key === currentKey, order.indexOf(key) < currentIndex)
  const deliveryAction = acceptance?.visible ? args.writing.chapterAcceptanceDesk?.recommendedAcceptanceAction : null
  const stages: AutoCreationSerialWorkflowStage[] = [
    {
      key: 'book_core',
      label: '立项定核',
      status: stageStatus('book_core', !args.hasModel ? 'blocked' : contractStatus),
      detail: args.hasModel ? '核心承诺、类型卖点、创新差异和读者拉力已纳入创作契约。' : '先选择可用模型，才能启动自动创作流水线。',
      action: planningAction('longform_creation_diagnosis', '检查核心不偏、故事强度、创新差异和读者吸引，必要时刷新创作契约。'),
    },
    {
      key: 'longform_plan',
      label: '长线规划',
      status: stageStatus('longform_plan', longformStatus),
      detail: byKey.get('longform_planning')?.detail || '维护未来章节、剧情线、卷级爆点、留存和百万字产能。',
      action: planningAction('enter_story_planning', '进入故事规划主工作区，集中查看未来100章、剧情线、前30章留存、卷级爆点和读者期待债务。'),
    },
    {
      key: 'chapter_launch',
      label: '单章开写',
      status: stageStatus('chapter_launch', hasProse ? 'done' : chapterStatus),
      detail: hasProse ? '正文已生成，进入交稿闭环。' : args.writing.chapterPlanningDesk.statusLabel,
      action: planningAction('enter_chapter_writing', '进入章节写作区，处理上下文包、场景卡、开写任务书和正文生成。'),
    },
    {
      key: 'delivery_acceptance',
      label: '交稿质检',
      status: stageStatus('delivery_acceptance', acceptance?.visible ? deliveryStatus : 'pending'),
      detail: acceptance?.visible ? acceptance.statusLabel : '等待正文生成后执行质检、修订、状态回填和章节交接。',
      action: writingAction((deliveryAction?.key || 'review_draft') as WritingCockpitActionKey, '进入当前章交稿闭环，执行质检、修订、故事状态同步和验收。', deliveryAction?.label || '进入交稿质检'),
    },
    {
      key: 'serial_governance',
      label: '连载治理',
      status: stageStatus('serial_governance', governanceStatus),
      detail: args.productionLicense.summary || args.batchGuardrail.summary || '清理交稿风险，确认下一批任务书和安全连写许可。',
      action: opsAction('open_task_center', '查看生产运营', '查看后台任务、修复队列和安全连写复盘。'),
    },
  ]
  const currentLabel = stages.find(stage => stage.key === currentKey)?.label || '单章开写'

  return {
    currentKey,
    currentLabel,
    summary: `当前处于「${currentLabel}」，下一步：${args.mainAction.label}。`,
    stages,
  }
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

function buildDirectorBattleDesk(planning: PlanningWorkspaceModel): PlanningWorkspaceModel['longformBattleDesk'] {
  if ((planning as any).longformBattleDesk?.lanes?.length) return (planning as any).longformBattleDesk
  const rhythm = planning.longformRhythm || {
    status: 'needs_attention',
    score: 68,
    label: '节奏待治理',
    summary: '长篇节奏材料不足。',
    currentBandLabel: '长篇跑道',
    signals: [],
    nextActions: [],
  }
  const first30Status = planning.first30Retention?.status === 'ready' ? 'ok' : 'warn'
  const storylineStatus = planning.storylineBoard?.status === 'ready' ? 'ok' : planning.storylineBoard?.status === 'missing' ? 'block' : 'warn'
  const volumeStatus = planning.volumeBeatBudget?.status === 'ready' ? 'ok' : planning.volumeBeatBudget?.status === 'blocked' ? 'block' : 'warn'
  const fuelStatus = planning.topStatus?.future10Coverage?.ready && planning.topStatus?.future100Coverage?.ready ? 'ok' : 'warn'
  const lanes: PlanningWorkspaceModel['longformBattleDesk']['lanes'] = [
    {
      key: 'story_core',
      label: '核心守恒',
      status: rhythm.status === 'blocked' ? 'block' : rhythm.status === 'needs_attention' ? 'warn' : 'ok',
      score: Number(rhythm.score || 68),
      detail: rhythm.summary || '长篇核心与节奏待确认。',
      actionKey: rhythm.status === 'ready' ? 'enter_chapter_writing' : 'open_quality_revision',
    },
    {
      key: 'reader_pull',
      label: '读者拉力',
      status: first30Status,
      score: Number(planning.first30Retention?.score || 70),
      detail: planning.first30Retention?.summary || '前30章留存待确认。',
      actionKey: planning.first30Retention?.actionKey || 'run_first30_retention',
    },
    {
      key: 'storyline',
      label: '剧情线调度',
      status: storylineStatus,
      score: storylineStatus === 'ok' ? 86 : storylineStatus === 'block' ? 55 : 70,
      detail: planning.storylineBoard?.summary || '剧情线待补齐。',
      actionKey: storylineStatus === 'ok' ? 'enter_chapter_writing' : 'open_story_assets',
    },
    {
      key: 'volume_beat',
      label: '卷级爆点',
      status: volumeStatus,
      score: Number(planning.volumeBeatBudget?.score || 70),
      detail: planning.volumeBeatBudget?.summary || '卷级爆点预算待确认。',
      actionKey: volumeStatus === 'ok' ? 'enter_chapter_writing' : 'complete_volume_plan',
    },
    {
      key: 'innovation_ip',
      label: '创新/IP场面',
      status: planning.innovationRadar?.status === 'ready' ? 'ok' : 'warn',
      score: Number(planning.innovationRadar?.score || 70),
      detail: planning.innovationRadar?.summary || '创新/IP场面待复盘。',
      actionKey: planning.innovationRadar?.actionKey || 'open_quality_revision',
    },
    {
      key: 'production_fuel',
      label: '生产燃料',
      status: fuelStatus,
      score: fuelStatus === 'ok' ? 86 : 68,
      detail: `未来10章 ${planning.topStatus?.future10Coverage?.label || '-'}，未来100章 ${planning.topStatus?.future100Coverage?.label || '-'}。`,
      actionKey: fuelStatus === 'ok' ? 'enter_chapter_writing' : 'update_rolling_plan',
    },
  ]
  const status: PlanningWorkspaceModel['longformBattleDesk']['status'] = lanes.some(lane => lane.status === 'block')
    ? 'blocked'
    : lanes.some(lane => lane.status === 'warn')
      ? 'needs_action'
      : 'ready'
  const primaryLane = lanes.find(lane => lane.status !== 'ok') || lanes[0]
  const score = Math.round(lanes.reduce((sum, lane) => sum + lane.score, 0) / Math.max(1, lanes.length))
  return {
    status,
    score,
    label: status === 'ready' ? `长篇作战 ${score}` : status === 'blocked' ? `长篇作战阻塞 ${score}` : `长篇作战待治理 ${score}`,
    summary: status === 'ready' ? '长篇作战台可支撑继续写作。' : `先处理 ${primaryLane.label}：${primaryLane.detail}`,
    primaryAction: {
      key: primaryLane.actionKey,
      label: PLANNING_ACTION_LABELS[primaryLane.actionKey],
      reason: primaryLane.detail,
    },
    lanes,
    riskChips: lanes.filter(lane => lane.status !== 'ok').map(lane => lane.label).slice(0, 6),
  }
}

function mergeCockpitStatus(...statuses: AutoCreationSerialCockpitStatus[]): AutoCreationSerialCockpitStatus {
  if (statuses.includes('block')) return 'block'
  if (statuses.includes('warn')) return 'warn'
  return 'ok'
}

function signalToCockpitStatus(status: any): AutoCreationSerialCockpitStatus {
  const normalized = text(status)
  if (normalized === 'block' || normalized === 'blocked') return 'block'
  if (['warn', 'warning', 'needs_action', 'needs_attention', 'stale', 'risk', 'caution'].includes(normalized)) return 'warn'
  return 'ok'
}

function cockpitStatusFromCount(count: number, highCount = 0): AutoCreationSerialCockpitStatus {
  if (highCount > 0) return 'block'
  if (count > 0) return 'warn'
  return 'ok'
}

function buildSerialGuardrails(args: {
  creationContract: AutoCreationContractItem[]
  chapterLaunchGate: AutoCreationChapterLaunchGate
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  longformCompass: AutoCreationLongformCompass
  millionWordRunway: AutoCreationMillionWordRunway
  writing: WritingCockpitModel
  planning: PlanningWorkspaceModel
  batchGuardrail: AutoCreationBatchGuardrail
  productionLicense: AutoCreationProductionLicense
}): AutoCreationSerialGuardrail[] {
  const acceptance = args.writing.chapterAcceptanceDesk
  const contractCore = args.creationContract.find(item => item.key === 'core')
  const contractStory = args.creationContract.find(item => item.key === 'story')
  const contractInnovation = args.creationContract.find(item => item.key === 'innovation')
  const contractReader = args.creationContract.find(item => item.key === 'reader_pull')
  const delivery = args.deliveryRiskGate
  const deliveryCategory = (key: AutoCreationDeliveryRiskGateCategory['key']) => delivery.categories.find(item => item.key === key)
  const storylineCount = Number(acceptance.storylineSync?.missedCount || 0) + Number(acceptance.storylineSync?.forbiddenCount || 0)
  const expectationDebtCount = Number(acceptance.readerExpectationSync?.missedCount || 0)
    + Number(acceptance.readerExpectationSync?.openingHandoffMissedCount || 0)
  const attractionWeakCount = Number(acceptance.chapterAttraction?.weakCount || 0)
  const innovationMissed = Number(acceptance.innovationSync?.missedCount || 0)
    + Number(acceptance.signatureSceneSync?.missedCount || 0)
    + Number(acceptance.volumeBeatSync?.missedCount || 0)
  const serialRiskCount = storylineCount
    + Number(acceptance.assetIntake?.pendingCount || 0)
    + Number(deliveryCategory('storyline')?.count || 0)
    + Number(deliveryCategory('story_unit')?.count || 0)
  const coreMissing = !text(args.planning.mainline?.readerPromise) || !text(args.planning.mainline?.currentVolumeGoal)

  return [
    {
      key: 'core_stability',
      label: '核心不偏移',
      status: mergeCockpitStatus(
        coreMissing ? 'block' : 'ok',
        signalToCockpitStatus(contractCore?.status),
        signalToCockpitStatus(args.longformCompass.status),
        cockpitStatusFromCount(Number(deliveryCategory('delivery_core')?.count || 0), Number(deliveryCategory('delivery_core')?.highCount || 0)),
        signalToCockpitStatus(args.millionWordRunway.gates.find(gate => gate.key === 'core_compass')?.status),
      ),
      detail: coreMissing
        ? '核心卖点或当前卷目标缺失，不能扩大自动连写。'
        : contractCore?.detail || args.longformCompass.summary || '核心承诺、主角驱动和长期方向保持可追踪。',
      count: Number(deliveryCategory('delivery_core')?.count || 0),
      action: planningAction('open_outline_tree', '查看全书核心契约、主轴护栏和长期方向。'),
    },
    {
      key: 'story_drive',
      label: '故事驱动力',
      status: mergeCockpitStatus(
        signalToCockpitStatus(contractStory?.status),
        signalToCockpitStatus(args.chapterLaunchGate.status),
        signalToCockpitStatus(acceptance.storyDriveSync?.status),
        cockpitStatusFromCount(Number(deliveryCategory('story_drive')?.count || 0), Number(deliveryCategory('story_drive')?.highCount || 0)),
      ),
      detail: acceptance.storyDriveSync?.priorityLabel || args.chapterLaunchGate.summary || contractStory?.detail || '本章目标、阻碍、代价和状态变化保持明确。',
      count: Number(acceptance.storyDriveSync?.missedCount || 0) + Number(deliveryCategory('story_drive')?.count || 0),
      action: args.chapterLaunchGate.action,
    },
    {
      key: 'reader_pull',
      label: '读者追读',
      status: mergeCockpitStatus(
        signalToCockpitStatus(contractReader?.status),
        signalToCockpitStatus(acceptance.readerExpectationSync?.status),
        signalToCockpitStatus(acceptance.readerRetentionSync?.status),
        signalToCockpitStatus(acceptance.chapterAttraction?.status),
        signalToCockpitStatus(args.planning.first30Retention?.status),
        cockpitStatusFromCount(Number(deliveryCategory('reader_expectation')?.count || 0) + Number(deliveryCategory('reader_retention')?.count || 0)),
      ),
      detail: acceptance.readerExpectationSync?.label
        || acceptance.chapterAttraction?.priorityLabel
        || args.planning.first30Retention?.summary
        || '章节承诺、爽点回报和章末翻页理由保持可见。',
      count: expectationDebtCount + attractionWeakCount + Number(deliveryCategory('reader_expectation')?.count || 0) + Number(deliveryCategory('reader_retention')?.count || 0),
      action: acceptance.readerExpectationSync?.status === 'warn'
        ? writingAction('apply_editor_revision', '按读者期待欠账修订当前章。', '按期待修订')
        : planningAction('run_first30_retention', '运行或刷新前30章留存诊断。'),
    },
    {
      key: 'innovation_ip',
      label: '创新/IP场面',
      status: mergeCockpitStatus(
        signalToCockpitStatus(contractInnovation?.status),
        signalToCockpitStatus(acceptance.innovationSync?.status),
        signalToCockpitStatus(acceptance.signatureSceneSync?.status),
        signalToCockpitStatus(acceptance.volumeBeatSync?.status),
        cockpitStatusFromCount(Number(deliveryCategory('innovation')?.count || 0) + Number(deliveryCategory('signature_scene')?.count || 0)),
      ),
      detail: acceptance.signatureSceneSync?.label || acceptance.innovationSync?.label || contractInnovation?.detail || '差异化设定、可传播场面和卷级爆点保持可执行。',
      count: innovationMissed + Number(deliveryCategory('innovation')?.count || 0) + Number(deliveryCategory('signature_scene')?.count || 0),
      action: planningAction('complete_volume_plan', '补齐创新执行、强场面和卷级爆点预算。'),
    },
    {
      key: 'serial_safety',
      label: '连载安全',
      status: mergeCockpitStatus(
        signalToCockpitStatus(acceptance.storylineSync?.status),
        cockpitStatusFromCount(serialRiskCount, Number(acceptance.storylineSync?.forbiddenCount || 0) + Number(args.deliveryRiskGate.highOpen || 0)),
      ),
      detail: args.productionLicense.summary || args.batchGuardrail.summary || '正史同步、剧情线、资产入库和批量连写护栏保持可控。',
      count: serialRiskCount,
      action: args.productionLicense.nextAction,
    },
  ]
}

function buildChapterChain(writing: WritingCockpitModel): AutoCreationChapterChainStep[] {
  const chapter = writing.nextChapter
  const planningDesk = writing.chapterPlanningDesk
  const acceptance = writing.chapterAcceptanceDesk
  const handoff = writing.chapterHandoffDesk || {
    visible: false,
    status: 'hidden',
    label: '等待章节交接',
    actionKey: 'accept_chapter_and_continue',
    actionLabel: '查看交接',
  }
  const hasChapter = Boolean(chapter)
  const hasProse = Boolean(chapter?.hasProse || Number(chapter?.wordCount || 0) > 0)
  const hasBrief = planningDesk.readiness === 'ready' || planningDesk.scenePlanStatus === 'ready' || arrayValue(planningDesk.sceneCards).length > 0
  const qualityDone = acceptance.qualityScore !== null || Boolean(acceptance.latestQualityReviewId)
  const needsRevision = ['needs_revision', 'needs_recheck'].includes(acceptance.acceptanceStatus)
  const synced = acceptance.storyStateSynced
  const delivered = acceptance.acceptanceStatus === 'delivered'
  const actionForMissingChapter = writingAction('open_outline_panel', '先补齐章节大纲，创建可写章节。', '打开大纲面板')
  const handoffAction = writingAction(handoff.actionKey || 'accept_chapter_and_continue', handoff.label || '查看章节交接', handoff.actionLabel || '查看交接')

  return [
    {
      key: 'handoff',
      label: '交接',
      status: !hasChapter ? 'block' : handoff.visible && handoff.status === 'needs_delivery' ? 'warn' : 'done',
      detail: !hasChapter ? '还没有可写章节。' : handoff.visible ? handoff.label : '上一章钩子、期待欠账和故事状态已接入。',
      action: !hasChapter ? actionForMissingChapter : handoffAction,
    },
    {
      key: 'brief',
      label: '任务书',
      status: !hasChapter ? 'pending' : hasBrief ? 'done' : 'current',
      detail: hasBrief ? planningDesk.statusLabel || '章节任务书和场景卡可用。' : planningDesk.reasons[0] || '先补章节开写任务书或场景卡。',
      action: writingAction(planningDesk.recommendedPlannerAction.key || 'build_scene_plan', '补齐章节任务书、场景卡和本章生成约束。', planningDesk.recommendedPlannerAction.label || '补章节计划'),
    },
    {
      key: 'draft',
      label: '初稿',
      status: !hasChapter || !hasBrief ? 'pending' : hasProse ? 'done' : 'current',
      detail: hasProse ? `当前正文约 ${chapter?.wordCount || 0} 字。` : '生成正文前必须确认任务书和场景预算。',
      action: writingAction('confirm_plan_and_write_draft', '确认任务书并生成本章初稿。', '确认并生成'),
    },
    {
      key: 'quality',
      label: '质检',
      status: !hasProse ? 'pending' : needsRevision ? 'warn' : qualityDone ? 'done' : 'current',
      detail: !hasProse ? '初稿生成后进入质检。' : needsRevision ? acceptance.statusLabel : qualityDone ? '质量复检已有结果。' : '运行质量复检和编辑报告。',
      action: writingAction(needsRevision ? 'apply_editor_revision' : 'refresh_current_quality', needsRevision ? '按风险清单生成修订稿。' : '复检当前正文质量。', needsRevision ? '生成修订稿' : '复检当前版本'),
    },
    {
      key: 'state_sync',
      label: '状态同步',
      status: !hasProse || !qualityDone ? 'pending' : synced ? 'done' : 'current',
      detail: synced ? '故事状态已同步到当前章。' : '交稿前需要同步正史、剧情线和新资产候选。',
      action: writingAction('sync_story_state', '同步故事状态、剧情线和资产候选。', '同步故事状态'),
    },
    {
      key: 'delivery',
      label: '交稿',
      status: delivered ? 'done' : acceptance.acceptanceStatus === 'ready_to_accept' ? 'current' : acceptance.visible ? 'warn' : 'pending',
      detail: delivered ? '本章已交稿。' : acceptance.visible ? acceptance.statusLabel : '完成质检、修订和状态同步后验收。',
      action: writingAction('accept_chapter_and_continue', '验收当前章并进入下一章。', '验收并进入下一章'),
    },
  ]
}

function buildSerialRiskQueue(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  batchReviewQueue: AutoCreationBatchReviewQueue
}): AutoCreationRiskQueueItem[] {
  const acceptance = args.writing.chapterAcceptanceDesk
  const risks: AutoCreationRiskQueueItem[] = []
  if (args.deliveryRiskGate.totalOpen > 0 || acceptance.deliveryRiskQueue?.totalCount) {
    const count = Number(acceptance.deliveryRiskQueue?.totalCount || args.deliveryRiskGate.totalOpen || 0)
    risks.push({
      key: 'delivery_risks',
      label: acceptance.deliveryRiskQueue?.label || `待修复 ${count}`,
      count,
      status: args.deliveryRiskGate.highOpen > 0 ? 'block' : 'warn',
      detail: acceptance.deliveryRiskQueue?.priorityLabel || args.deliveryRiskGate.summary,
      action: opsAction('create_delivery_risk_repair', '生成风险修复任务', args.deliveryRiskGate.summary || '把交稿风险转成可执行修复任务。'),
    })
  }
  const storylineCount = Number(args.planning.storylineBoard?.overdueCount || 0)
    + Number(args.planning.storylineBoard?.debtCount || 0)
    + Number(acceptance.storylineSync?.missedCount || 0)
    + Number(acceptance.storylineSync?.forbiddenCount || 0)
  if (storylineCount > 0) {
    risks.push({
      key: 'storylines',
      label: `剧情线 ${storylineCount}`,
      count: storylineCount,
      status: Number(acceptance.storylineSync?.forbiddenCount || 0) > 0 ? 'block' : 'warn',
      detail: args.planning.storylineBoard?.summary || acceptance.storylineSync?.label || '剧情线推进和禁揭边界需要确认。',
      action: planningAction('open_story_assets', '打开资料设定页，校准剧情线资产和本章调用关系。'),
    })
  }
  const expectationCount = Number(acceptance.readerExpectationSync?.missedCount || 0)
    + Number(acceptance.readerExpectationSync?.openingHandoffMissedCount || 0)
  if (expectationCount > 0) {
    risks.push({
      key: 'reader_expectation',
      label: `期待欠账 ${expectationCount}`,
      count: expectationCount,
      status: 'warn',
      detail: acceptance.readerExpectationSync?.label || '读者期待承诺没有在正文中充分兑现。',
      action: writingAction('apply_editor_revision', '按读者期待欠账修订当前章。', '按期待修订'),
    })
  }
  if (args.planning.first30Retention?.status === 'stale' || acceptance.first30RetentionRecheck) {
    risks.push({
      key: 'first30_retention',
      label: '留存需复诊',
      count: 1,
      status: 'warn',
      detail: acceptance.first30RetentionRecheck?.reason || args.planning.first30Retention?.summary || '前30章章节更新后需要重新诊断留存。',
      action: planningAction('run_first30_retention', '重新运行前30章留存诊断。'),
    })
  }
  if (acceptance.assetIntake?.pendingCount) {
    risks.push({
      key: 'asset_intake',
      label: acceptance.assetIntake.label,
      count: acceptance.assetIntake.pendingCount,
      status: 'warn',
      detail: '正文中新人物、物品、能力、势力、地点或伏笔需要作者确认入库。',
      action: planningAction('open_story_assets', '进入资料设定页确认新资产候选。'),
    })
  }
  if (args.batchReviewQueue.visible && ['warn', 'risk'].includes(args.batchReviewQueue.status)) {
    const count = Math.max(1, arrayValue(args.batchReviewQueue.riskRadar?.signals).filter(item => item.status === 'warn').length)
    risks.push({
      key: 'batch_risks',
      label: `批次风险 ${count}`,
      count,
      status: args.batchReviewQueue.status === 'risk' ? 'block' : 'warn',
      detail: args.batchReviewQueue.summary,
      action: args.batchReviewQueue.nextAction,
    })
  }
  return risks
}

function buildSerialCockpit(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  todayCommandDeck: AutoCreationTodayCommandDeck
  creationContract: AutoCreationContractItem[]
  chapterLaunchGate: AutoCreationChapterLaunchGate
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  longformCompass: AutoCreationLongformCompass
  millionWordRunway: AutoCreationMillionWordRunway
  batchGuardrail: AutoCreationBatchGuardrail
  productionLicense: AutoCreationProductionLicense
  batchReviewQueue: AutoCreationBatchReviewQueue
}): AutoCreationSerialCockpit {
  const riskQueue = buildSerialRiskQueue(args)
  const guardrails = buildSerialGuardrails(args)
  const primaryRisk = riskQueue[0]
  return {
    title: '长篇连载驾驶舱',
    summary: primaryRisk
      ? `当前优先处理：${primaryRisk.label}。${primaryRisk.detail}`
      : args.todayCommandDeck.summary,
    command: args.todayCommandDeck,
    guardrails,
    chapterChain: buildChapterChain(args.writing),
    batchLicense: args.productionLicense,
    riskQueue,
  }
}

export function buildAutoCreationDirectorModel(input: BuildAutoCreationDirectorModelInput): AutoCreationDirectorModel {
  const planning = input.planning
  const writing = input.writing
  const activeTasks = arrayValue(input.activeTasks)
  const runRecords = arrayValue(input.runRecords)
  const reviews = arrayValue(input.reviews)
  const hasModel = Boolean(input.selectedModelId)
  const chapter = targetChapter(writing)
  const blockingPlan = planningBlocker(planning)
  const running = hasRunningTasks(activeTasks)
  const retentionActionNeeded = retentionNeedsAction(planning)
  const storylineActionNeeded = storylineNeedsAction(planning)
  const characterArcActionNeeded = characterArcNeedsAction(planning)
  const volumeBeatActionNeeded = volumeBeatNeedsAction(planning)
  const rhythmActionNeeded = rhythmNeedsAction(planning)
  const reviewedContract = creationContractFromReview(reviews)
  const creationContract = reviewedContract.contract || buildLongformCreationContract(planning, writing)
  const longformCompass = buildLongformCompass(planning, reviews)
  const longformBattleDesk = buildDirectorBattleDesk(planning)
  const chapterLaunchGate = buildChapterLaunchGate(planning, writing, longformCompass)
  const longformCapacity = buildLongformCapacity(planning)
  const canonRunway = buildCanonRunway(writing)
  const deliveryRiskGate = buildDeliveryRiskGate({
    reviews,
    runRecords,
    chapters: arrayValue(input.chapters),
  })
  let batchReviewQueue = buildBatchReviewQueue({
    runRecords,
    chapters: arrayValue(input.chapters),
    reviews,
    planning,
    storyState: input.storyState || {},
  })
  const blockers: string[] = []
  const confirmations: string[] = []
  const writingQueueFocus = buildWritingQueueFocus(writing)
  const rollingScriptRoom = buildRollingScriptRoom(planning, writing, longformCompass)
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
  } else if (characterArcActionNeeded) {
    status = 'needs_governance'
    statusLabel = '人物成长待治理'
    headline = '先校准人物成长和关系张力'
    summary = planning.characterArcBoard.summary
    confirmations.push('人物成长需要治理确认')
    mainAction = planningAction(planning.characterArcBoard.actionKey, '先处理人物成长看板中的成长断档、关系待推进或人物弧光缺口。')
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
  } else if (canonRunway.staleState) {
    status = 'needs_governance'
    statusLabel = '长线记忆待同步'
    headline = '先同步故事状态再连续生产'
    summary = canonRunway.detail
    confirmations.push('故事状态需要同步')
    mainAction = canonRunway.action
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
  } else if (deliveryRiskGate.status === 'block') {
    status = 'needs_governance'
    statusLabel = '交稿风险待处理'
    headline = '先清理高风险交稿批注'
    summary = deliveryRiskGate.summary
    confirmations.push('未清交稿风险会阻止安全连写')
    mainAction = opsAction('create_delivery_risk_repair', '生成风险修复任务', deliveryRiskGate.summary)
  } else if (writing.chapterAcceptanceDesk.visible) {
    const action = writing.chapterAcceptanceDesk.recommendedAcceptanceAction
    status = 'needs_acceptance'
    statusLabel = writing.chapterAcceptanceDesk.statusLabel
    headline = chapter ? `第 ${chapter.chapterNo} 章进入交稿闭环` : '当前章进入交稿闭环'
    summary = writing.chapterAcceptanceDesk.acceptanceReasons[0] || '按质检、修订、状态同步和验收顺序处理当前章。'
    mainAction = writingAction(action.key, '处理当前章交稿门禁，不跳过质检和状态回填。', action.label)
  } else if (chapterLaunchGate.status === 'blocked') {
    status = 'needs_governance'
    statusLabel = '开写门禁'
    headline = '先校准本章再生成正文'
    summary = chapterLaunchGate.summary
    confirmations.push('本章开写门禁未通过')
    mainAction = chapterLaunchGate.action
  } else {
    const plannerAction = writing.chapterPlanningDesk.recommendedPlannerAction
    status = 'ready'
    statusLabel = writingQueueFocus.visible ? writingQueueFocus.label : writing.chapterPlanningDesk.statusLabel
    headline = chapter ? `第 ${chapter.chapterNo} 章可以推进` : '可以推进下一章'
    summary = writingQueueFocus.visible ? writingQueueFocus.summary : writing.chapterPlanningDesk.reasons[0] || writing.topStatus.nextActionLabel
    mainAction = writingQueueFocus.visible
      ? writingQueueFocus.action
      : writingAction(plannerAction.key || writing.primaryActionKey, '按章节任务书和场景卡推进当前章。', plannerAction.label)
  }

  const batchGuardrail = buildBatchGuardrail({
    planning,
    writing,
    activeTasks,
    hasBlockingPlan: Boolean(blockingPlan),
    hasModel,
    mainAction,
    longformCapacity,
    deliveryRiskGate,
    chapterLaunchGate,
    storyState: input.storyState || {},
  })
  batchReviewQueue = reconcileBatchHandoffWithGuardrail(batchReviewQueue, batchGuardrail)
  if (batchReviewQueue.handoff.status === 'prepare_next' && status === 'ready') {
    status = 'needs_governance'
    statusLabel = '下一批待准备'
    headline = '补齐下一批计划再连写'
    summary = batchReviewQueue.handoff.summary
    confirmations.push('下一批安全连写护栏未放行')
    mainAction = batchReviewQueue.handoff.action
  }
  const millionWordRunway = buildMillionWordRunway({
    planning,
    writing,
    longformCompass,
    creationContract,
    chapterLaunchGate,
    canonRunway,
    batchGuardrail,
  })
  const dailyBattlePlan = buildDailyBattlePlan({
    planning,
    writing,
    mainAction,
    deliveryRiskGate,
    batchGuardrail,
    batchReviewQueue,
    longformCapacity,
    writingQueueFocus,
    hasBlockingPlan: Boolean(blockingPlan),
    hasModel,
    activeTasks,
  })
  const productionLicense = buildProductionLicense({
    hasModel,
    mainAction,
    dailyBattlePlan,
    deliveryRiskGate,
    batchReviewQueue,
    batchGuardrail,
    chapterLaunchGate,
    millionWordRunway,
  })
  const todayCommandDeck = buildTodayCommandDeck({
    dailyBattlePlan,
    productionLicense,
    creationContract,
    chapterLaunchGate,
    deliveryRiskGate,
    batchGuardrail,
    millionWordRunway,
  })
  const serialCockpit = buildSerialCockpit({
    planning,
    writing,
    todayCommandDeck,
    creationContract,
    chapterLaunchGate,
    deliveryRiskGate,
    longformCompass,
    millionWordRunway,
    batchGuardrail,
    productionLicense,
    batchReviewQueue,
  })
  const pipeline = buildPipeline({
    planning,
    writing,
    activeTasks,
    hasBlockingPlan: Boolean(blockingPlan),
    hasModel,
    creationContract,
    longformCapacity,
    rollingScriptRoom,
    batchGuardrail,
  })
  const serialWorkflow = buildSerialWorkflow({
    hasModel,
    mainAction,
    status,
    writing,
    creationContract,
    pipeline,
    productionLicense,
    batchGuardrail,
    deliveryRiskGate,
  })
  const creationPipeline = buildCreationPipeline({
    planning,
    mainAction,
    serialWorkflow,
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
    longformBattleDesk,
    longformCapacity,
    longformCompass,
    creationContract,
    chapterLaunchGate,
    dailyBattlePlan,
    productionLicense,
    todayCommandDeck,
    serialCockpit,
    millionWordRunway,
    writingQueueFocus,
    rollingScriptRoom,
    deliveryRiskGate,
    batchGuardrail,
    batchReviewQueue,
    creationPipeline,
    serialWorkflow,
    pipeline,
  }
}

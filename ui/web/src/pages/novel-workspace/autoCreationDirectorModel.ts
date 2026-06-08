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
  | 'select_model'

export type AutoCreationPipelineStatus = 'done' | 'active' | 'pending' | 'blocked' | 'warning'
export type AutoCreationContractStatus = 'ok' | 'warn' | 'block'
export type AutoCreationBatchGuardrailStatus = 'ready' | 'caution' | 'blocked'
export type AutoCreationBatchGuardrailSignalStatus = 'ok' | 'warn' | 'block'

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

export interface AutoCreationBatchGuardrailSignal {
  label: string
  status: AutoCreationBatchGuardrailSignalStatus
  detail: string
}

export interface AutoCreationBatchGuardrail {
  status: AutoCreationBatchGuardrailStatus
  label: string
  summary: string
  safeChapterCount: number
  recommendedAction: AutoCreationDirectorAction
  guardrails: AutoCreationBatchGuardrailSignal[]
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
  }
  longformRhythm: PlanningWorkspaceModel['longformRhythm']
  creationContract: AutoCreationContractItem[]
  batchGuardrail: AutoCreationBatchGuardrail
  pipeline: AutoCreationPipelineStep[]
}

export interface BuildAutoCreationDirectorModelInput {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  activeTasks?: AnyRecord[] | null
  selectedModelId?: any
  reviews?: AnyRecord[] | null
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
])

function arrayValue(value: any): any[] {
  return Array.isArray(value) ? value : []
}

function text(value: any, fallback = '') {
  if (value === null || value === undefined) return fallback
  const normalized = String(value).trim()
  return normalized || fallback
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

function opsAction(key: 'open_task_center' | 'select_model', label: string, description: string, disabled = false): AutoCreationDirectorAction {
  return {
    area: 'ops',
    key,
    label,
    description,
    modelCall: false,
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

function latestLongformCreationReport(reviews: AnyRecord[]) {
  const review = reviews
    .filter(item => text(item?.review_type) === 'longform_creation_diagnosis')
    .sort((a, b) => recordTime(b) - recordTime(a))[0]
  const payload = parsePayload(review?.payload) || {}
  return payload.report || payload.result?.report || payload
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

function buildBatchGuardrail(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  activeTasks: AnyRecord[]
  hasBlockingPlan: boolean
  hasModel: boolean
  mainAction: AutoCreationDirectorAction
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
      '章节任务书/场景卡',
      chapterPlanReady ? 'ok' : 'block',
      chapterPlanReady ? '当前章任务书和场景卡已就绪。' : chapterPlanIssue,
    ),
    signal(
      '当前章交稿',
      currentChapterDelivered ? 'ok' : 'block',
      currentChapterDelivered ? '当前没有未处理的交稿门禁。' : text(acceptance.statusLabel, '当前章仍需质检、修订或状态同步。'),
    ),
    signal('每章交稿回填', 'ok', '连续生产仍按单章质检、修订、故事状态同步和资产发现逐章回填。'),
  ]

  const blocking = guardrails.find(item => item.status === 'block')
  const warning = guardrails.find(item => item.status === 'warn')
  const status: AutoCreationBatchGuardrailStatus = blocking ? 'blocked' : warning ? 'caution' : 'ready'
  let recommendedAction = args.mainAction

  if (!blocking && warning?.label === '未来100章储备') {
    recommendedAction = planningAction('future100_generate', '先补齐更长线的未来100章储备，再扩大连续生产批次。')
  }

  const safeChapterCount = status === 'blocked'
    ? 0
    : status === 'caution'
      ? 1
      : Math.max(1, Math.min(3, Number(future10.planned || 3), Number(planning.volumeBeatBudget?.plannedChapterCount || 3)))

  return {
    status,
    label: status === 'ready' ? '可小批量连写' : status === 'caution' ? '谨慎单章推进' : '暂不适合连写',
    summary: status === 'ready'
      ? `建议先小批量连续生产 ${safeChapterCount} 章，每章都经过质检、回填和差异复盘后再扩大批次。`
      : status === 'caution'
        ? '长线储备存在薄弱点，本轮建议只推进 1 章，并优先处理黄色风险。'
        : blocking?.detail || '当前存在阻塞项，暂不适合连续生产。',
    safeChapterCount,
    recommendedAction,
    guardrails,
  }
}

function buildPipeline(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  activeTasks: AnyRecord[]
  hasBlockingPlan: boolean
  hasModel: boolean
  creationContract: AutoCreationContractItem[]
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
  })
  const pipeline = buildPipeline({
    planning,
    writing,
    activeTasks,
    hasBlockingPlan: Boolean(blockingPlan),
    hasModel,
    creationContract,
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
    },
    longformRhythm: planning.longformRhythm,
    creationContract,
    batchGuardrail,
    pipeline,
  }
}

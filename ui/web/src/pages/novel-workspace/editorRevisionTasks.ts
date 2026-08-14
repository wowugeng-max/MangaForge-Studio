export type EditorRevisionQuality = {
  review_id?: number
  score?: number
  passed?: boolean
  needs_revision?: boolean
  reused?: boolean
}

export type EditorRevisionTask = {
  id: number
  run_type: 'editor_revision'
  status: 'queued' | 'running' | 'cancel_requested' | 'completed' | 'failed' | 'canceled'
  phase: string
  phase_label: string
  progress: null
  chapter_id: number
  chapter_no: number
  chapter_title: string
  prose_persisted: boolean
  quality?: EditorRevisionQuality | null
  story_state?: Record<string, unknown> | null
  phases?: Record<string, { summary?: Record<string, unknown> }>
  /** 服务端投影的当前写作 skill 轮次(仅活跃 run 且 generate_candidate 阶段) */
  skill_progress?: {
    skill_id: string
    index: number
    total: number
    label?: string
    started_at?: string
  } | null
  warnings: Array<{ code: string; message: string }>
  error: { code: string; message: string } | null
  can_cancel: boolean
  can_retry: boolean
  can_continue: boolean
  repair_task_link?: { run_id: number; task_index: number } | null
  linked_task_closure?: { status: 'pending' | 'completed'; completed_at?: string } | null
  updated_at: string
}

const EDITOR_REVISION_STATUSES = new Set<EditorRevisionTask['status']>([
  'queued',
  'running',
  'cancel_requested',
  'completed',
  'failed',
  'canceled',
])
const ACTIVE_EDITOR_REVISION_STATUSES = new Set<EditorRevisionTask['status']>([
  'queued',
  'running',
  'cancel_requested',
])
const PRIVATE_TASK_FIELDS = [
  'payload',
  'input_ref',
  'output_ref',
  'source_text',
  'chapter_text',
  'raw_payload',
  'candidate',
  'rejected_candidate',
  'api_key',
  'authorization',
] as const
const QUALITY_FIELDS = new Set<keyof EditorRevisionQuality>([
  'review_id',
  'score',
  'passed',
  'needs_revision',
  'reused',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isInteger(value: unknown, minimum: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= minimum
}

function isWarning(value: unknown): value is EditorRevisionTask['warnings'][number] {
  return isRecord(value) && typeof value.code === 'string' && typeof value.message === 'string'
}

function isError(value: unknown): value is NonNullable<EditorRevisionTask['error']> {
  return isRecord(value) && typeof value.code === 'string' && typeof value.message === 'string'
}

function isRepairTaskLink(value: unknown): value is NonNullable<EditorRevisionTask['repair_task_link']> {
  return isRecord(value)
    && Object.keys(value).every(key => key === 'run_id' || key === 'task_index')
    && isInteger(value.run_id, 1)
    && isInteger(value.task_index, 0)
}

function isLinkedTaskClosure(value: unknown): value is NonNullable<EditorRevisionTask['linked_task_closure']> {
  if (!isRecord(value) || Object.keys(value).some(key => !['status', 'completed_at'].includes(key))) return false
  if (value.status === 'pending') return value.completed_at === undefined
  return value.status === 'completed'
    && typeof value.completed_at === 'string'
    && Number.isFinite(Date.parse(value.completed_at))
}

function isQuality(value: unknown): value is EditorRevisionQuality {
  if (!isRecord(value)) return false
  const keys = Object.keys(value)
  if (!keys.length || keys.some(key => !QUALITY_FIELDS.has(key as keyof EditorRevisionQuality))) return false
  return (value.review_id === undefined || isInteger(value.review_id, 1))
    && (value.score === undefined || (typeof value.score === 'number' && Number.isFinite(value.score)))
    && (value.passed === undefined || typeof value.passed === 'boolean')
    && (value.needs_revision === undefined || typeof value.needs_revision === 'boolean')
    && (value.reused === undefined || typeof value.reused === 'boolean')
}

export function isEditorRevisionTask(value: unknown): value is EditorRevisionTask {
  if (!isRecord(value)) return false
  if (PRIVATE_TASK_FIELDS.some(field => Object.prototype.hasOwnProperty.call(value, field))) return false
  return value.run_type === 'editor_revision'
    && EDITOR_REVISION_STATUSES.has(value.status as EditorRevisionTask['status'])
    && isInteger(value.id, 1)
    && typeof value.phase === 'string'
    && typeof value.phase_label === 'string'
    && value.progress === null
    && isInteger(value.chapter_id, 1)
    && isInteger(value.chapter_no, 1)
    && typeof value.chapter_title === 'string'
    && typeof value.prose_persisted === 'boolean'
    && (value.quality === undefined || value.quality === null || isQuality(value.quality))
    && (value.story_state === undefined || value.story_state === null || isRecord(value.story_state))
    && (value.phases === undefined || isRecord(value.phases))
    && Array.isArray(value.warnings)
    && value.warnings.every(isWarning)
    && (value.error === null || isError(value.error))
    && typeof value.can_cancel === 'boolean'
    && typeof value.can_retry === 'boolean'
    && typeof value.can_continue === 'boolean'
    && (value.repair_task_link === undefined || value.repair_task_link === null || isRepairTaskLink(value.repair_task_link))
    && (value.linked_task_closure === undefined || value.linked_task_closure === null || isLinkedTaskClosure(value.linked_task_closure))
    && typeof value.updated_at === 'string'
    && value.updated_at.length > 0
}

export function isActiveEditorRevisionTask(task: EditorRevisionTask) {
  return ACTIVE_EDITOR_REVISION_STATUSES.has(task.status)
}

function compareNewest(left: EditorRevisionTask, right: EditorRevisionTask) {
  const leftTime = Date.parse(left.updated_at)
  const rightTime = Date.parse(right.updated_at)
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return rightTime - leftTime
  }
  const updatedAtOrder = right.updated_at.localeCompare(left.updated_at)
  return updatedAtOrder || right.id - left.id
}

export function editorRevisionForChapter(tasks: unknown[], chapterId: number): EditorRevisionTask | null {
  const matching = (Array.isArray(tasks) ? tasks : [])
    .filter(isEditorRevisionTask)
    .filter(task => task.chapter_id === chapterId)
  if (!matching.length) return null
  const active = matching.filter(isActiveEditorRevisionTask)
  return [...(active.length ? active : matching)].sort(compareNewest)[0] || null
}

export function editorRevisionTerminalMessage(task: EditorRevisionTask): {
  type: 'success' | 'warning' | 'error'
  text: string
} | null {
  if (isActiveEditorRevisionTask(task)) return null
  if (!task.prose_persisted) {
    return { type: 'error', text: '修订未入库，当前正文保持不变' }
  }
  if (task.status === 'completed') {
    const qualityPassed = task.quality?.passed === true && task.quality.needs_revision !== true
    if (task.warnings.length > 0 || !qualityPassed) {
      return { type: 'warning', text: '新版本已保存，当前章仍需人工复查' }
    }
    return { type: 'success', text: '当前章修订和复检完成' }
  }
  return { type: 'warning', text: '正文已保存，后处理未完成' }
}

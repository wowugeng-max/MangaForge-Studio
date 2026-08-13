/** 修订任务阶段进度纯模型:不改流程,只把 7 个阶段的状态/耗时转成 UI 可渲染结构。 */
import type { EditorRevisionTask } from './editorRevisionTasks'

export type EditorRevisionStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'canceled'

export type EditorRevisionProgressStep = {
  key: string
  label: string
  status: EditorRevisionStepStatus
  /** 已完成阶段为实际耗时,运行中阶段为已运行时长,无数据为空串 */
  durationLabel: string
}

export type EditorRevisionProgress = {
  steps: EditorRevisionProgressStep[]
  currentIndex: number
  hint: string
  stalled: boolean
}

const PHASE_ORDER = [
  'generate_candidate',
  'admit_candidate',
  'persist_chapter',
  'post_quality',
  'sync_current_story_state',
  'record_continuity_warning',
  'completed',
] as const

const PHASE_LABELS: Record<string, string> = {
  generate_candidate: '生成候选',
  admit_candidate: '安全检查',
  persist_chapter: '保存版本',
  post_quality: '当前章质检',
  sync_current_story_state: '当前章状态更新',
  record_continuity_warning: '记录连续性提示',
  completed: '完成',
}

/** 大模型阶段的常见耗时提示(基于实测,仅用于文案) */
const PHASE_EXPECTATIONS: Record<string, string> = {
  generate_candidate: '该阶段通常 2~5 分钟(整章重写)',
  post_quality: '该阶段通常 1 分钟内',
  sync_current_story_state: '该阶段通常 3~6 分钟(故事状态提取)',
}

/** 单次模型调用超时上限 600 秒,加 1 分钟余量后仍在跑视为疑似异常 */
const STALL_THRESHOLD_SECONDS = 660

const STEP_STATUSES = new Set<EditorRevisionStepStatus>([
  'pending',
  'running',
  'completed',
  'failed',
  'skipped',
  'canceled',
])

export function formatPhaseDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  if (seconds < 60) return `${seconds}秒`
  return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
}

function phaseSeconds(state: any, nowMs: number): number | null {
  const started = Date.parse(String(state?.started_at || ''))
  if (!Number.isFinite(started)) return null
  const completed = Date.parse(String(state?.completed_at || ''))
  const end = Number.isFinite(completed) ? completed : nowMs
  return Math.max(0, (end - started) / 1_000)
}

export function buildEditorRevisionProgress(
  task: EditorRevisionTask,
  nowMs: number,
): EditorRevisionProgress {
  const queued = task.status === 'queued'
  const phaseStates = (task.phases && typeof task.phases === 'object' ? task.phases : null) as
    | Record<string, any>
    | null
  const currentPhaseIndex = PHASE_ORDER.indexOf(task.phase as (typeof PHASE_ORDER)[number])

  const steps: EditorRevisionProgressStep[] = PHASE_ORDER.map((phase, index) => {
    const state = phaseStates?.[phase]
    let status: EditorRevisionStepStatus
    if (queued) {
      status = 'pending'
    } else if (state && STEP_STATUSES.has(state.status)) {
      status = state.status
    } else if (currentPhaseIndex >= 0) {
      // 无 phases 明细时按当前 phase 名推断
      status = index < currentPhaseIndex ? 'completed' : index === currentPhaseIndex ? 'running' : 'pending'
    } else {
      status = 'pending'
    }
    const seconds = state ? phaseSeconds(state, nowMs) : null
    const durationLabel = seconds !== null && (status === 'completed' || status === 'running' || status === 'failed')
      ? formatPhaseDuration(seconds)
      : ''
    return { key: phase, label: PHASE_LABELS[phase] || phase, status, durationLabel }
  })

  const currentIndex = queued ? -1 : steps.findIndex(step => step.status === 'running')
  const running = currentIndex >= 0 ? steps[currentIndex] : null
  const runningSeconds = running && phaseStates
    ? phaseSeconds(phaseStates[running.key], nowMs)
    : null
  const stalled = runningSeconds !== null && runningSeconds > STALL_THRESHOLD_SECONDS

  let hint = ''
  if (queued) {
    hint = '排队等待处理'
  } else if (running) {
    const parts = [`当前阶段：${running.label}`]
    if (runningSeconds !== null) parts.push(`已运行 ${formatPhaseDuration(runningSeconds)}`)
    if (stalled) {
      parts.push('已超出单阶段超时上限（10 分钟），可能异常，可取消修订后重试')
    } else if (PHASE_EXPECTATIONS[running.key]) {
      parts.push(PHASE_EXPECTATIONS[running.key])
    }
    hint = parts.join(' · ')
  }

  return { steps, currentIndex, hint, stalled }
}

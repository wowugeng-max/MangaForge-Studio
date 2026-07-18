import type {
  FuturePlanningCoverage,
  PlanningActionKey,
  PlanningBattleDeskLane,
  PlanningCreationPipelineStage,
  PlanningHealthIssue,
  PlanningRhythmSignal,
  PlanningSerialReleaseDesk,
  PlanningWorkspaceModel,
} from './planning-workspace-model'
import {
  aggregateDeliveryRiskCounts,
  arrayValue,
  boundedScore,
  chapterHasProse,
  chapterWordCount,
  latestReviewPayload,
  latestReviewPayloadAny,
  listLength,
  milestoneStatus,
  numericCount,
  parseJsonValue,
  planningActionLabel,
  reviewChapterNo,
  reviewTime,
  text,
} from './planning-workspace-builder'

type AnyRecord = Record<string, any>

export function openDeliveryRiskRepairTaskCount(productionTasks?: AnyRecord | null) {
  const runs = Array.isArray(productionTasks?.tasks)
    ? productionTasks.tasks
    : Array.isArray(productionTasks?.active)
      ? productionTasks.active
      : []
  return runs.reduce((sum: number, run: AnyRecord) => {
    const payload = run?.payload || parseJsonValue(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {}
    const tasks = Array.isArray(payload?.tasks) ? payload.tasks : []
    return sum + tasks.filter((task: AnyRecord) => {
      const status = text(task?.task_status || task?.status, 'pending')
      return text(task?.source) === 'review_annotation_risk' && !['resolved', 'completed', 'canceled', 'cancelled'].includes(status)
    }).length
  }, 0)
}

export function activeProductionTaskSummary(productionTasks?: AnyRecord | null) {
  const activeRuns = Array.isArray(productionTasks?.active) ? productionTasks.active : []
  const summary = productionTasks?.summary || {}
  const activeFromSummary = Number(summary?.active)
  const running = numericCount(summary?.running, activeRuns.filter((run: AnyRecord) => text(run?.status) === 'running').length)
  const paused = numericCount(summary?.paused, activeRuns.filter((run: AnyRecord) => text(run?.status) === 'paused').length)
  const needsApproval = numericCount(summary?.needs_approval, activeRuns.filter((run: AnyRecord) => text(run?.status) === 'needs_approval').length)
  const active = Math.max(
    Number.isFinite(activeFromSummary) && activeFromSummary > 0 ? Math.round(activeFromSummary) : 0,
    activeRuns.length,
    running + paused + needsApproval,
  )
  const labels = [
    running > 0 ? `运行中 ${running}` : '',
    paused > 0 ? `暂停 ${paused}` : '',
    needsApproval > 0 ? `待确认 ${needsApproval}` : '',
  ].filter(Boolean)
  return {
    active,
    running,
    paused,
    needsApproval,
    detail: labels.length > 0 ? labels.join('，') : '队列中',
  }
}

export function laneStatusFromRhythm(status: PlanningRhythmSignal['status'] | undefined): PlanningBattleDeskLane['status'] {
  if (status === 'block') return 'block'
  if (status === 'warn') return 'warn'
  return 'ok'
}

export function laneStatusFromPlanning(status: 'ready' | 'needs_attention' | 'blocked' | 'missing' | 'needs_repair' | 'stale' | undefined): PlanningBattleDeskLane['status'] {
  if (status === 'blocked' || status === 'missing') return 'block'
  if (status === 'needs_attention' || status === 'needs_repair' || status === 'stale') return 'warn'
  return 'ok'
}


import React from 'react'
import { Tag } from 'antd'
import {
  compactEvidenceText,
  isSingleChapterRecoveryEvidenceTask,
} from './drawer-model'
import {
  compactAuditList,
  recoveryEvidenceSourceSummary,
  recoveryEvidenceTaskSourceMeta,
  recoveryEvidenceSourceRecheckAction,
  recoveryEvidenceReviewOfTask,
  recoveryEvidenceFailedTexts,
  type RecoveryEvidenceAuditNextAction,
  type RecoveryEvidenceAuditSourceGroup,
  type RecoveryEvidenceAuditView,
} from './drawer-recovery-evidence-review'

function recoveryEvidenceTaskResult(task: any) {
  const review = recoveryEvidenceReviewOfTask(task)
  const taskStatus = String(task?.task_status ?? task?.status ?? '').toLowerCase()
  const reviewStatus = String(review?.status || '').toLowerCase()
  const residualEvidence = recoveryEvidenceFailedTexts(review)
  const latestSummary = compactEvidenceText(
    review?.summary
    || task?.status_note
    || task?.statusNote
    || task?.note
    || task?.summary
    || task?.message
    || task?.action
    || '',
  )
  const hasResidual = residualEvidence.length > 0 || reviewStatus === 'warn' || taskStatus === 'needs_review'
  const closed = ['resolved', 'closed', 'done', 'completed'].includes(taskStatus) || reviewStatus === 'ok'
  const resultStatus = hasResidual ? 'needs_followup' : closed ? 'closed' : 'pending'
  return {
    resultStatus,
    resultLabel: resultStatus === 'closed' ? '已闭环' : resultStatus === 'needs_followup' ? '仍需复查' : '待复查',
    latestSummary,
    residualEvidence,
  }
}

function recoveryEvidenceResidualAction(source: string, resultStatus: string, residualEvidence: string[]) {
  if (resultStatus !== 'needs_followup' || residualEvidence.length === 0) return { action: '', label: '' }
  if (source === 'single_chapter_governance_recheck') return { action: 'revision', label: '回修依据' }
  if (source === 'safe_batch_recovery_recheck') return { action: 'focus_task', label: '定位批次任务' }
  return { action: 'focus_task', label: '定位任务' }
}

function recoveryEvidenceProductionBlockHint(source: string, resultStatus: string) {
  if (resultStatus === 'closed') {
    return {
      status: 'cleared' as const,
      label: '生产阻断已解除',
      detail: '该来源已复检闭环，可作为恢复安全连写依据。',
    }
  }
  if (resultStatus === 'needs_followup') {
    if (source === 'safe_batch_recovery_recheck') {
      return {
        status: 'blocked' as const,
        label: '暂缓安全连写',
        detail: '残留依据未闭环，先定位批次任务并完成批次回修，再复盘后继续安全连写。',
      }
    }
    if (source === 'single_chapter_governance_recheck') {
      return {
        status: 'blocked' as const,
        label: '暂缓安全连写',
        detail: '残留依据未闭环，先回修依据并复检单章，再继续安全连写。',
      }
    }
    return {
      status: 'blocked' as const,
      label: '暂缓安全连写',
      detail: '残留依据未闭环，先定位任务并复检，再继续安全连写。',
    }
  }
  return {
    status: 'pending' as const,
    label: '等待复检结论',
    detail: '先完成来源复检，再决定是否恢复安全连写。',
  }
}

function taskIndexOf(task: any, fallbackIndex: number | null = null) {
  const taskIndex = Number(task?.task_index ?? task?.taskIndex)
  if (Number.isFinite(taskIndex)) return taskIndex
  return fallbackIndex
}

function recoveryEvidenceSourceGroups(tasks: any[], latestTasks: any[] = []) {
  const groups = new Map<string, {
    source: string
    label: string
    count: number
    taskIndexes: number[]
    chapterNos: number[]
    resultTasks: any[]
  }>()
  const latestTaskByIndex = new Map<number, any>()
  for (const [index, task] of (Array.isArray(latestTasks) ? latestTasks : []).entries()) {
    const taskIndex = taskIndexOf(task, index)
    if (taskIndex !== null) latestTaskByIndex.set(taskIndex, task)
  }
  for (const [index, task] of tasks.entries()) {
    const meta = recoveryEvidenceTaskSourceMeta(task)
    const existing = groups.get(meta.source) || { source: meta.source, label: meta.label, count: 0, taskIndexes: [], chapterNos: [], resultTasks: [] }
    existing.count += 1
    const taskIndex = taskIndexOf(task, index)
    if (taskIndex !== null) existing.taskIndexes.push(taskIndex)
    const chapterNo = Number(task?.chapter_no ?? task?.chapterNo)
    if (Number.isFinite(chapterNo) && chapterNo > 0 && !existing.chapterNos.includes(chapterNo)) existing.chapterNos.push(chapterNo)
    existing.resultTasks.push(taskIndex !== null && latestTaskByIndex.has(taskIndex) ? latestTaskByIndex.get(taskIndex) : task)
    groups.set(meta.source, existing)
  }
  const order: Record<string, number> = {
    single_chapter_governance_recheck: 0,
    safe_batch_recovery_recheck: 1,
    recovery_evidence_recheck: 2,
  }
  return Array.from(groups.values())
    .map(group => {
      const recheck = recoveryEvidenceSourceRecheckAction(group.source)
      const taskResults = group.resultTasks.map(recoveryEvidenceTaskResult)
      const residualEvidence = compactAuditList(taskResults.flatMap(item => item.residualEvidence), 6)
      const resultStatus = residualEvidence.length > 0 || taskResults.some(item => item.resultStatus === 'needs_followup')
        ? 'needs_followup'
        : taskResults.length > 0 && taskResults.every(item => item.resultStatus === 'closed')
          ? 'closed'
          : 'pending'
      const residualAction = recoveryEvidenceResidualAction(group.source, resultStatus, residualEvidence)
      const productionBlock = recoveryEvidenceProductionBlockHint(group.source, resultStatus)
      return {
        source: group.source,
        label: group.label,
        count: group.count,
        taskIndexes: Array.from(new Set(group.taskIndexes)).sort((a, b) => a - b),
        chapterNos: group.chapterNos.sort((a, b) => a - b),
        recheckAction: recheck.action,
        recheckLabel: recheck.label,
        resultStatus,
        resultLabel: resultStatus === 'closed' ? '已闭环' : resultStatus === 'needs_followup' ? '仍需复查' : '待复查',
        latestSummary: taskResults.map(item => item.latestSummary).find(Boolean) || '',
        residualEvidence,
        residualAction: residualAction.action,
        residualActionLabel: residualAction.label,
        productionBlockStatus: productionBlock.status,
        productionBlockLabel: productionBlock.label,
        productionBlockDetail: productionBlock.detail,
      }
    })
    .sort((a, b) => (order[a.source] ?? 99) - (order[b.source] ?? 99) || a.label.localeCompare(b.label))
}

function recoveryEvidenceAuditActionFromGroup(
  group: RecoveryEvidenceAuditSourceGroup,
  action: RecoveryEvidenceAuditNextAction['action'],
  label: string,
): RecoveryEvidenceAuditNextAction {
  return {
    action,
    label,
    source: group.source,
    sourceLabel: group.label,
    taskIndex: group.taskIndexes[0] ?? null,
    residualEvidence: group.residualEvidence,
  }
}

function buildRecoveryEvidenceAuditNextAction(sourceGroups: RecoveryEvidenceAuditSourceGroup[]): RecoveryEvidenceAuditNextAction | null {
  const singleResidual = sourceGroups.find(group => group.source === 'single_chapter_governance_recheck' && group.residualAction === 'revision')
  if (singleResidual) {
    return recoveryEvidenceAuditActionFromGroup(singleResidual, 'revision', singleResidual.residualActionLabel || '回修依据')
  }

  const batchResidual = sourceGroups.find(group => group.source === 'safe_batch_recovery_recheck' && group.residualAction === 'focus_task')
  if (batchResidual) {
    return recoveryEvidenceAuditActionFromGroup(batchResidual, 'focus_task', batchResidual.residualActionLabel || '定位批次任务')
  }

  const genericResidual = sourceGroups.find(group => group.resultStatus === 'needs_followup' && group.residualAction)
  if (genericResidual) {
    return recoveryEvidenceAuditActionFromGroup(genericResidual, genericResidual.residualAction as RecoveryEvidenceAuditNextAction['action'], genericResidual.residualActionLabel || '定位任务')
  }

  const singlePending = sourceGroups.find(group => group.source === 'single_chapter_governance_recheck' && group.resultStatus === 'pending')
  if (singlePending) {
    return recoveryEvidenceAuditActionFromGroup(singlePending, 'recheck_single_chapter', singlePending.recheckLabel || '复检单章')
  }

  const batchPending = sourceGroups.find(group => group.source === 'safe_batch_recovery_recheck' && group.resultStatus === 'pending')
  if (batchPending) {
    return recoveryEvidenceAuditActionFromGroup(batchPending, 'recheck_safe_batch', batchPending.recheckLabel || '复盘批次')
  }

  const unresolved = sourceGroups.find(group => group.resultStatus !== 'closed')
  if (unresolved) {
    return recoveryEvidenceAuditActionFromGroup(unresolved, 'review_governance_closure', '治理复查台')
  }

  return null
}

export function buildRecoveryEvidenceAuditView(audit?: any | null, latestTasks: any[] = []): RecoveryEvidenceAuditView | null {
  const closure = audit?.recovery_evidence_closure || audit?.recoveryEvidenceClosure || null
  if (!closure || Number(closure.total || 0) <= 0) return null
  const memory = audit?.governance_recheck_memory || audit?.governanceRecheckMemory || null
  const closureTasks = Array.isArray(closure.tasks) ? closure.tasks : []
  const sourceGroups = recoveryEvidenceSourceGroups(closureTasks, latestTasks)
  return {
    status: closure.status === 'closed' ? 'closed' : 'needs_followup',
    label: '恢复依据审计',
    total: Number(closure.total || 0),
    resolved: Number(closure.resolved || 0),
    sourceSummary: recoveryEvidenceSourceSummary(closure),
    sourceGroups,
    nextAction: buildRecoveryEvidenceAuditNextAction(sourceGroups),
    sourceRunId: memory?.source_run_id ?? memory?.sourceRunId ?? audit?.source_run_id ?? audit?.sourceRunId ?? null,
    memoryLabel: compactEvidenceText(memory?.label || ''),
    memorySummary: compactEvidenceText(memory?.summary || '', 200),
    failedEvidence: compactAuditList([
      ...(Array.isArray(memory?.failed_evidence) ? memory.failed_evidence : []),
      ...(Array.isArray(memory?.failedEvidence) ? memory.failedEvidence : []),
      ...(Array.isArray(closure.failed_evidence) ? closure.failed_evidence : []),
      ...(Array.isArray(closure.failedEvidence) ? closure.failedEvidence : []),
    ]),
    repairedEvidence: compactAuditList([
      ...(Array.isArray(memory?.evidence) ? memory.evidence : []),
      ...(Array.isArray(memory?.repaired_evidence) ? memory.repaired_evidence : []),
      ...(Array.isArray(memory?.repairedEvidence) ? memory.repairedEvidence : []),
      ...(Array.isArray(closure.repaired_evidence) ? closure.repaired_evidence : []),
      ...(Array.isArray(closure.repairedEvidence) ? closure.repairedEvidence : []),
    ]),
    watchItems: compactAuditList([
      ...(Array.isArray(memory?.watch_items) ? memory.watch_items : []),
      ...(Array.isArray(memory?.watchItems) ? memory.watchItems : []),
      ...(Array.isArray(closure.watch_items) ? closure.watch_items : []),
      ...(Array.isArray(closure.watchItems) ? closure.watchItems : []),
    ]),
    relatedTasks: closureTasks
      .map((task: any) => ({
        ...recoveryEvidenceTaskSourceMeta(task),
        chapterId: Number(task?.chapter_id ?? task?.chapterId ?? 0) || null,
        chapterNo: Number(task?.chapter_no ?? task?.chapterNo ?? 0) || null,
        taskIndex: Number.isFinite(Number(task?.task_index ?? task?.taskIndex)) ? Number(task?.task_index ?? task?.taskIndex) : null,
        sourceLabel: recoveryEvidenceTaskSourceMeta(task).label,
        status: String(task?.task_status ?? task?.status ?? 'open'),
        title: compactEvidenceText(task?.title || task?.message || '恢复依据修复任务', 120),
        summary: compactEvidenceText(task?.summary || task?.message || task?.action || '', 160),
      }))
      .filter((task: any) => task.title || task.summary)
      .slice(0, 6),
  }
}

export type RepairTaskTagMeta = {
  key: string
  label: string
  color: string
}


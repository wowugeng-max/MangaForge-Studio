import React from 'react'
import { Tag } from 'antd'

/** Recovery-evidence audit/review helpers for task center drawer. */

import {
  compactEvidenceText,
  isSingleChapterRecoveryEvidenceTask,
} from './drawer-model'
import { parseJsonValue } from './chapter-group'

export type RecoveryEvidenceAuditNextAction = {
  action: 'revision' | 'focus_task' | 'recheck_single_chapter' | 'recheck_safe_batch' | 'review_governance_closure' | ''
  label: string
  source: string
  sourceLabel: string
  taskIndex: number | null
  residualEvidence: string[]
}

export type RecoveryEvidenceAuditSourceGroup = {
  source: string
  label: string
  count: number
  taskIndexes: number[]
  chapterNos: number[]
  recheckAction: string
  recheckLabel: string
  resultStatus: 'closed' | 'needs_followup' | 'pending'
  resultLabel: string
  latestSummary: string
  residualEvidence: string[]
  residualAction: string
  residualActionLabel: string
  productionBlockStatus: 'cleared' | 'blocked' | 'pending'
  productionBlockLabel: string
  productionBlockDetail: string
}

export type RecoveryEvidenceAuditView = {
  status: 'closed' | 'needs_followup'
  label: string
  total: number
  resolved: number
  sourceSummary: string
  sourceGroups: RecoveryEvidenceAuditSourceGroup[]
  nextAction: RecoveryEvidenceAuditNextAction | null
  sourceRunId: any
  memoryLabel: string
  memorySummary: string
  failedEvidence: string[]
  repairedEvidence: string[]
  watchItems: string[]
  relatedTasks: {
    chapterId: number | null
    chapterNo: number | null
    taskIndex: number | null
    source: string
    sourceLabel: string
    status: string
    title: string
    summary: string
  }[]
}

export function compactAuditList(values: any[], limit = 8) {
  return Array.from(new Set(values.map(item => compactEvidenceText(item)).filter(Boolean))).slice(0, limit)
}

function recoveryEvidenceSourceSummary(closure: any) {
  const tasks = Array.isArray(closure?.tasks) ? closure.tasks : []
  const singleChapterCount = Number(closure?.single_chapter_count ?? closure?.singleChapterCount ?? 0)
    || tasks.filter((task: any) => String(task?.source || task?.sourceMode || '') === 'single_chapter_governance_recheck').length
  const batchCount = Number(closure?.batch_count ?? closure?.batchCount ?? 0)
    || tasks.filter((task: any) => String(task?.source || task?.sourceMode || '') === 'safe_batch_recovery_recheck').length
  const genericCount = Math.max(0, Number(closure?.total || 0) - singleChapterCount - batchCount)
  return [
    singleChapterCount > 0 ? `单章治理复查 ${singleChapterCount}` : '',
    batchCount > 0 ? `批次恢复复查 ${batchCount}` : '',
    genericCount > 0 ? `恢复依据复查 ${genericCount}` : '',
  ].filter(Boolean).join('；')
}

export function recoveryEvidenceTaskSourceMeta(task: any) {
  const source = String(task?.source || task?.sourceMode || '')
  const sourceLabel = compactEvidenceText(task?.source_label || task?.sourceLabel || '')
  if (source === 'single_chapter_governance_recheck') return { source, label: sourceLabel || '单章治理复查' }
  if (source === 'safe_batch_recovery_recheck') return { source, label: sourceLabel || '批次恢复复查' }
  if (isSingleChapterRecoveryEvidenceTask(task)) return { source: 'single_chapter_governance_recheck', label: '单章治理复查' }
  if (String(task?.source || '') === 'auto_creation_safe_batch_risk' || task?.segment) return { source: 'safe_batch_recovery_recheck', label: '批次恢复复查' }
  return { source: 'recovery_evidence_recheck', label: sourceLabel || '恢复依据复查' }
}

export function recoveryEvidenceSourceRecheckAction(source: any) {
  const key = String(source || '')
  if (key === 'single_chapter_governance_recheck') {
    return { action: 'single_chapter_governance_recheck', label: '复检单章' }
  }
  if (key === 'safe_batch_recovery_recheck') {
    return { action: 'safe_batch_recovery_recheck', label: '复盘批次' }
  }
  return { action: '', label: '' }
}

function recoveryEvidenceReviewOfTask(task: any) {
  return task?.recovery_evidence_review || task?.recoveryEvidenceReview || {}
}

function recoveryEvidenceFailedTexts(review: any) {
  const failedItems = [
    ...(Array.isArray(review?.failed_items) ? review.failed_items : []),
    ...(Array.isArray(review?.failedItems) ? review.failedItems : []),
  ]
  return compactAuditList([
    ...(Array.isArray(review?.failed_evidence) ? review.failed_evidence : []),
    ...(Array.isArray(review?.failedEvidence) ? review.failedEvidence : []),
    ...failedItems.map((item: any) => item?.evidence || item),
  ], 6)
}

export type RecoveryEvidenceReviewRow = {
  evidence: string
  riskLabels: string[]
  source: string
  sourceLabel: string
  sourceDetail: string
  sourceAction: string
  sourceActionLabel: string
  productionGateSource: string
}

export type RecoveryEvidenceReviewRowAction = {
  action: 'recheck_single_chapter' | 'recheck_safe_batch' | 'review_governance_closure' | 'execute_typed_repair' | ''
  label: string
  focusSource: string
}

export type RecoveryEvidenceReviewActionFeedback = {
  statusLabel: string
  triggeredAt: string
  closureCondition: string
  detail: string
}

export type RecoveryEvidenceReviewRefreshAnchor = {
  feedbackKey: string
  taskIndex: number
  sourceTaskIndex: number | null
  focusSource: string
  refreshedAt: string
  statusLabel: '已刷新结果'
}

type RepairTaskActionOptions = {
  keepTaskCenterOpen?: boolean
}

function recoveryEvidenceReviewSourceLabel(source: string) {
  if (source === 'recovery_evidence') return '恢复放行依据'
  if (source === 'governance_recheck_memory') return '治理复查记忆'
  if (source === 'recovery_evidence_production_gate') return '入口生产闸门'
  if (source === 'storyline_decision_closure') return '剧情线决策闭环'
  if (source === 'single_chapter_governance_recheck') return '单章治理复查'
  if (source === 'safe_batch_recovery_recheck') return '批次恢复复查'
  return ''
}

function recoveryEvidenceReviewFallbackSource(evidence: string, task: any) {
  if (evidence.includes('生产阻断已解除')) return 'recovery_evidence_production_gate'
  if (isSingleChapterRecoveryEvidenceTask(task)) return 'single_chapter_governance_recheck'
  return ''
}

export function buildRecoveryEvidenceReviewRows(task: any): RecoveryEvidenceReviewRow[] {
  const recoveryEvidenceReview = task?.recovery_evidence_review || task?.recoveryEvidenceReview || null
  const failedItems = [
    ...(Array.isArray(recoveryEvidenceReview?.failed_items) ? recoveryEvidenceReview.failed_items : []),
    ...(Array.isArray(recoveryEvidenceReview?.failedItems) ? recoveryEvidenceReview.failedItems : []),
  ]
  const failedEvidence = [
    ...(Array.isArray(recoveryEvidenceReview?.failed_evidence) ? recoveryEvidenceReview.failed_evidence : []),
    ...(Array.isArray(recoveryEvidenceReview?.failedEvidence) ? recoveryEvidenceReview.failedEvidence : []),
  ]
  const rows = failedItems.length > 0
    ? failedItems.map((item: any) => {
      const evidence = compactEvidenceText(item?.evidence || item)
      const source = String(item?.source || item?.sourceMode || recoveryEvidenceReviewFallbackSource(evidence, task))
      const sourceLabel = compactEvidenceText(item?.source_label || item?.sourceLabel || recoveryEvidenceReviewSourceLabel(source))
      return {
        evidence,
        riskLabels: Array.isArray(item?.risk_labels) ? item.risk_labels : Array.isArray(item?.riskLabels) ? item.riskLabels : [],
        source,
        sourceLabel,
        sourceDetail: compactEvidenceText(item?.source_detail || item?.sourceDetail || ''),
        sourceAction: compactEvidenceText(item?.source_action || item?.sourceAction || ''),
        sourceActionLabel: compactEvidenceText(item?.source_action_label || item?.sourceActionLabel || ''),
        productionGateSource: compactEvidenceText(item?.production_gate_source || item?.productionGateSource || ''),
      }
    })
    : failedEvidence.map((item: any) => {
      const evidence = compactEvidenceText(item)
      const source = recoveryEvidenceReviewFallbackSource(evidence, task)
      return {
        evidence,
        riskLabels: [],
        source,
        sourceLabel: recoveryEvidenceReviewSourceLabel(source),
        sourceDetail: '',
        sourceAction: '',
        sourceActionLabel: '',
        productionGateSource: '',
      }
    })
  return rows.filter(item => item.evidence)
}

export function recoveryEvidenceRegovernanceQueueOfTask(task: any) {
  if (String(task?.issue_type || '') !== 'recovery_evidence_mismatch') return null
  const queue = task?.recovery_evidence_regovernance_queue
    || task?.recoveryEvidenceRegovernanceQueue
    || task?.recoveryEvidenceGovernanceQueue
    || null
  const tasks = Array.isArray(queue?.tasks) ? queue.tasks : []
  return tasks.length > 0 ? queue : null
}

export function buildRecoveryEvidenceRegovernanceSummary(task: any) {
  const queue = recoveryEvidenceRegovernanceQueueOfTask(task)
  if (!queue) return null
  const tasks = Array.isArray(queue.tasks) ? queue.tasks : []
  const actionLabels = Array.from(new Set(tasks
    .map((item: any) => compactEvidenceText(item?.action_label || item?.actionLabel || ''))
    .filter(Boolean)))
  return {
    label: compactEvidenceText(queue.label || '安全连写放行摘要再治理'),
    summary: compactEvidenceText(queue.summary || '', 200),
    taskCount: Number(queue.task_count || queue.taskCount || tasks.length || 0),
    actionLabel: '生成再治理队列',
    actionLabels,
  }
}

export function buildRecoveryEvidenceReviewRowAction(row: RecoveryEvidenceReviewRow): RecoveryEvidenceReviewRowAction {
  const action = String(row.sourceAction || '')
  const productionGateSource = String(row.productionGateSource || '')
  if (row.source === 'recovery_evidence_production_gate') {
    if (productionGateSource === 'single_chapter_governance_recheck' || action === 'single_chapter_governance_recheck') {
      return { action: 'recheck_single_chapter', label: row.sourceActionLabel || '复检单章', focusSource: 'single_chapter_governance_recheck' }
    }
    if (productionGateSource === 'safe_batch_recovery_recheck' || action === 'safe_batch_recovery_recheck') {
      return { action: 'recheck_safe_batch', label: row.sourceActionLabel || '复盘批次', focusSource: 'safe_batch_recovery_recheck' }
    }
  }
  if (row.source === 'governance_recheck_memory' || action === 'review_governance_closure') {
    return { action: 'review_governance_closure', label: row.sourceActionLabel || '治理复查台', focusSource: '' }
  }
  if (row.source === 'recovery_evidence' || action === 'create_safe_batch_risk_repair') {
    return { action: 'execute_typed_repair', label: row.sourceActionLabel || '按批次修订', focusSource: '' }
  }
  return { action: '', label: '', focusSource: '' }
}

export function buildRecoveryEvidenceReviewActionFeedbackKey(
  taskIndex: number,
  row: RecoveryEvidenceReviewRow,
  rowAction: RecoveryEvidenceReviewRowAction,
) {
  return [
    taskIndex,
    row.source,
    row.productionGateSource,
    rowAction.action,
    row.evidence,
  ].join('|')
}

export function buildRecoveryEvidenceReviewActionFeedback(
  rowAction: RecoveryEvidenceReviewRowAction,
  triggeredAt: string,
): RecoveryEvidenceReviewActionFeedback {
  const label = rowAction.label || '处理'
  const closureCondition = rowAction.action === 'recheck_single_chapter'
    ? '关闭条件：单章复查为 ok 或 failed_evidence 为空。'
    : rowAction.action === 'recheck_safe_batch'
      ? '关闭条件：长线生产修复审计重新生成，来源行显示生产阻断已解除。'
      : rowAction.action === 'review_governance_closure'
        ? '关闭条件：恢复依据审计闭环，治理复查记忆不再列出当前失效依据。'
        : rowAction.action === 'execute_typed_repair'
          ? '关闭条件：完成批次修订并重新运行批次交稿复盘，recovery_evidence_review 为 ok。'
          : '关闭条件：等待对应复检或修订结果回填。'
  return {
    statusLabel: `已触发${label}`,
    triggeredAt,
    closureCondition,
    detail: `最近动作：${label} · ${triggeredAt} · 已触发，等待复检结果回填。`,
  }
}

export function buildRecoveryEvidenceReviewRefreshAnchor({
  taskIndex,
  row,
  rowAction,
  sourceTaskIndex,
  refreshedAt,
}: {
  taskIndex: number
  row: RecoveryEvidenceReviewRow
  rowAction: RecoveryEvidenceReviewRowAction
  sourceTaskIndex?: number | null
  refreshedAt: string
}): RecoveryEvidenceReviewRefreshAnchor {
  return {
    feedbackKey: buildRecoveryEvidenceReviewActionFeedbackKey(taskIndex, row, rowAction),
    taskIndex,
    sourceTaskIndex: sourceTaskIndex ?? null,
    focusSource: rowAction.focusSource || '',
    refreshedAt,
    statusLabel: '已刷新结果',
  }
}

export function buildRecoveryEvidenceReviewRefreshFeedback(
  localFeedback: RecoveryEvidenceReviewActionFeedback | null,
  refreshAnchor: RecoveryEvidenceReviewRefreshAnchor | null,
): RecoveryEvidenceReviewActionFeedback | null {
  if (!refreshAnchor && !localFeedback) return null
  if (!refreshAnchor) return localFeedback
  const triggeredAt = refreshAnchor.refreshedAt
  const detail = localFeedback?.detail
    ? `${localFeedback.detail.replace(/。$/, '')}；已刷新结果，刷新后继续定位此依据。`
    : `最近动作：刷新 · ${triggeredAt} · 已刷新结果，刷新后继续定位此依据。`
  return {
    statusLabel: refreshAnchor.statusLabel,
    triggeredAt,
    closureCondition: localFeedback?.closureCondition || '关闭条件：查看刷新后的复检或修订结果。',
    detail,
  }
}

function recoveryEvidenceReviewIsCleared(task: any) {
  const review = recoveryEvidenceReviewOfTask(task)
  const reviewStatus = String(review?.status || '').toLowerCase()
  if (reviewStatus === 'ok') return true
  const hasKnownFailedLists = Array.isArray(review?.failed_evidence)
    || Array.isArray(review?.failedEvidence)
    || Array.isArray(review?.failed_items)
    || Array.isArray(review?.failedItems)
  return hasKnownFailedLists && recoveryEvidenceFailedTexts(review).length === 0
}

function recoveryEvidenceReviewRunPayload(run: any) {
  return {
    input: parseJsonValue(run?.input_ref) || {},
    output: parseJsonValue(run?.output_ref) || {},
  }
}

function recoveryEvidenceReviewRunTime(run: any) {
  const value = Date.parse(String(run?.updated_at || run?.completed_at || run?.finished_at || run?.created_at || ''))
  return Number.isFinite(value) ? value : 0
}

function recoveryEvidenceReviewRunHasAuditPayload(run: any) {
  const { input, output } = recoveryEvidenceReviewRunPayload(run)
  return Boolean(
    input?.recovery_evidence_action
    || input?.recoveryEvidenceAction
    || output?.recovery_evidence_action
    || output?.recoveryEvidenceAction
    || output?.audit_summary
    || output?.auditSummary
    || output?.recovery_evidence_closure
    || output?.recoveryEvidenceClosure
    || output?.governance_recheck_memory
    || output?.governanceRecheckMemory,
  )
}

function recoveryEvidenceReviewRunMatchesAction(
  run: any,
  task: any,
  rowAction: RecoveryEvidenceReviewRowAction,
  currentRun?: any | null,
) {
  const runType = String(run?.run_type || '')
  const { input, output } = recoveryEvidenceReviewRunPayload(run)
  const taskChapterId = Number(task?.chapter_id || task?.chapterId || 0)
  const inputChapterId = Number(input?.chapter_id || input?.chapterId || 0)
  const currentRunId = Number(currentRun?.id || 0)
  const runId = Number(run?.id || 0)
  const sourceRunId = Number(input?.source_run_id || input?.sourceRunId || output?.source_run_id || output?.sourceRunId || output?.audit_summary?.source_run_id || output?.auditSummary?.sourceRunId || 0)
  const source = String(input?.source || output?.source || '')

  if (rowAction.action === 'recheck_single_chapter') {
    return runType === 'prose_quality'
      && taskChapterId > 0
      && inputChapterId === taskChapterId
      && source === 'governance_recheck_sync'
  }

  if (rowAction.action === 'recheck_safe_batch' || rowAction.action === 'review_governance_closure') {
    return runType === 'longform_production_repair'
      && recoveryEvidenceReviewRunHasAuditPayload(run)
      && (runId === currentRunId || (currentRunId > 0 && sourceRunId === currentRunId))
  }

  if (rowAction.action === 'execute_typed_repair') {
    if (!taskChapterId) return false
    if (runType === 'prose_quality') return inputChapterId === taskChapterId && ['post_revision', 'governance_recheck_sync'].includes(source)
    if (runType === 'editor_revision') return inputChapterId === taskChapterId
  }

  return false
}

function recoveryEvidenceReviewRunStatus(run: any) {
  const status = String(run?.status || '').toLowerCase()
  if (['running', 'queued', 'ready', 'pending'].includes(status)) return 'running'
  if (['failed', 'error', 'canceled', 'cancelled'].includes(status)) return 'failed'
  if (['success', 'ok', 'completed', 'done', 'closed'].includes(status)) return 'success'
  return ''
}

function recoveryEvidenceReviewRunFailureDetail(run: any) {
  const { output } = recoveryEvidenceReviewRunPayload(run)
  return compactEvidenceText(
    run?.error_message
    || run?.error
    || output?.error
    || output?.message
    || '对应复检运行失败，请重试。',
  )
}

export function buildRecoveryEvidenceReviewResolvedFeedback({
  task,
  rowAction,
  currentRun = null,
  runRecords = [],
  localFeedback = null,
}: {
  task: any
  rowAction: RecoveryEvidenceReviewRowAction
  currentRun?: any | null
  runRecords?: any[] | null
  localFeedback?: RecoveryEvidenceReviewActionFeedback | null
}): RecoveryEvidenceReviewActionFeedback | null {
  const label = rowAction.label || '处理'
  const closureCondition = buildRecoveryEvidenceReviewActionFeedback(rowAction, '实时状态').closureCondition
  if (recoveryEvidenceReviewIsCleared(task)) {
    return {
      statusLabel: '已回填',
      triggeredAt: '实时状态',
      closureCondition,
      detail: `最近动作：${label} · 已回填 · 恢复依据复盘已清空失效项。`,
    }
  }

  const latestRun = [...(Array.isArray(runRecords) ? runRecords : [])]
    .filter(run => recoveryEvidenceReviewRunMatchesAction(run, task, rowAction, currentRun))
    .sort((a, b) => recoveryEvidenceReviewRunTime(b) - recoveryEvidenceReviewRunTime(a))[0]
  const runStatus = latestRun ? recoveryEvidenceReviewRunStatus(latestRun) : ''
  if (runStatus === 'running') {
    const runningDetail = rowAction.action === 'recheck_single_chapter'
      ? '单章治理复查正在回填恢复依据结果。'
      : rowAction.action === 'execute_typed_repair'
        ? '修订复检正在回填恢复依据结果。'
        : '长线生产修复正在回填恢复依据结果。'
    return {
      statusLabel: '运行中',
      triggeredAt: '实时状态',
      closureCondition,
      detail: `最近动作：${label} · 运行中 · ${runningDetail}`,
    }
  }
  if (runStatus === 'failed') {
    return {
      statusLabel: '失败需重试',
      triggeredAt: '实时状态',
      closureCondition,
      detail: `最近动作：${label} · 失败需重试 · ${recoveryEvidenceReviewRunFailureDetail(latestRun)}`,
    }
  }
  if (runStatus === 'success') {
    return {
      statusLabel: '已回填',
      triggeredAt: '实时状态',
      closureCondition,
      detail: `最近动作：${label} · 已回填 · 对应复检运行已完成，等待失效依据复盘刷新。`,
    }
  }

  return localFeedback
}

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

type RepairTaskTagMeta = {
  key: string
  label: string
  color: string
}


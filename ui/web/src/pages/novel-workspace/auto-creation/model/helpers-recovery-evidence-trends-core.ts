import type { PlanningActionKey, PlanningWorkspaceModel } from '../../planningWorkspaceModel'
import type { WritingCockpitActionKey, WritingCockpitModel } from '../../writingCockpitModel'
import { parseWorkspacePayload, type WorkspacePayloadParseOptions } from '../../payloadParseCache'
import type { PlanningActionKey, PlanningWorkspaceModel } from '../../planningWorkspaceModel'
import type { WritingCockpitActionKey, WritingCockpitModel } from '../../writingCockpitModel'
import { parseWorkspacePayload, type WorkspacePayloadParseOptions } from '../../payloadParseCache'
import type { PlanningActionKey, PlanningWorkspaceModel } from '../../planningWorkspaceModel'
import type { WritingCockpitActionKey, WritingCockpitModel } from '../../writingCockpitModel'
import { parseWorkspacePayload, type WorkspacePayloadParseOptions } from '../../payloadParseCache'
import type {
  AnyRecord,
  AutoCreationDirectorStatus,
  AutoCreationDirectorArea,
  AutoCreationDirectorActionKey,
  AutoCreationPipelineStatus,
  AutoCreationContractStatus,
  AutoCreationBatchGuardrailStatus,
  AutoCreationBatchGuardrailSignalStatus,
  AutoCreationBatchReviewStatus,
  AutoCreationBatchReviewItemStatus,
  AutoCreationBatchRiskStatus,
  AutoCreationBatchCompletionStatus,
  AutoCreationBatchCompletionMetricStatus,
  AutoCreationBatchHandoffStatus,
  AutoCreationChapterLaunchGateStatus,
  AutoCreationLongformCapacityStatus,
  AutoCreationDeliveryRiskGateStatus,
  AutoCreationManualTestReadinessStatus,
  AutoCreationDailyBattleStepKey,
  AutoCreationRollingScriptRoomStatus,
  AutoCreationRollingScriptLayerKey,
  AutoCreationMillionWordRunwayStatus,
  AutoCreationProductionLicenseStatus,
  AutoCreationDirectorAction,
  AutoCreationRepairPlan,
  AutoCreationPipelineStep,
  AutoCreationSerialStageKey,
  AutoCreationSerialWorkflowStage,
  AutoCreationDirectorCreationPipelineStage,
  AutoCreationDirectorCreationPipeline,
  AutoCreationSerialWorkflow,
  AutoCreationContractItem,
  AutoCreationLongformCompassAxis,
  AutoCreationLongformCompass,
  AutoCreationManualTestGate,
  AutoCreationManualTestReadiness,
  AutoCreationBatchGuardrailSignal,
  AutoCreationRecoveryEvidenceTrendSource,
  AutoCreationStrengthenedRepairAcceptanceTrend,
  AutoCreationRecoveryEvidenceTrend,
  AutoCreationBatchReleaseChapter,
  AutoCreationBatchReleaseWindow,
  AutoCreationBatchPreflight,
  AutoCreationBatchBriefRepair,
  AutoCreationBatchBriefRecovery,
  AutoCreationNextBatchBriefChapter,
  AutoCreationNextBatchBriefStartChecklistKey,
  AutoCreationNextBatchBriefStartChecklistItem,
  AutoCreationNextBatchBrief,
  AutoCreationLongformCapacitySignal,
  AutoCreationLongformFuelItem,
  AutoCreationLongformCapacity,
  AutoCreationChapterLaunchSignal,
  AutoCreationChapterLaunchGate,
  AutoCreationBatchGuardrail,
  AutoCreationBatchReviewItem,
  AutoCreationBatchRiskSignal,
  AutoCreationBatchChecklistExecutionItem,
  AutoCreationBatchChecklistExecution,
  AutoCreationBatchRiskRadar,
  AutoCreationBatchCompletionMetric,
  AutoCreationBatchCompletionDashboard,
  AutoCreationBatchHandoff,
  AutoCreationBatchReviewQueue,
  AutoCreationDeliveryRiskGateCategory,
  AutoCreationDeliveryRiskResolution,
  AutoCreationDeliveryRiskGate,
  AutoCreationStorylineDecisionGate,
  AutoCreationGovernanceClosureBrief,
  AutoCreationWritingQueueFocus,
  AutoCreationDailyBattleStep,
  AutoCreationDailyBattlePlan,
  AutoCreationProductionLicense,
  AutoCreationTodayCommandFlowItem,
  AutoCreationTodayQualityGate,
  AutoCreationGovernanceRecheckMemoryStatus,
  AutoCreationGovernanceRecheckMemory,
  AutoCreationReleaseRationale,
  AutoCreationTodayCommandDeck,
  AutoCreationSerialCockpitStatus,
  AutoCreationChapterChainStatus,
  AutoCreationSerialGuardrail,
  AutoCreationChapterChainStep,
  AutoCreationRiskQueueItem,
  AutoCreationSerialCockpit,
  AutoCreationMillionWordRunwayGate,
  AutoCreationMillionWordRunwayQuestion,
  AutoCreationMillionWordRunway,
  AutoCreationRollingScriptLayer,
  AutoCreationRollingScriptRoom,
  AutoCreationDirectorModel,
  BuildAutoCreationDirectorModelInput
} from './types'
import {
  PLANNING_ACTION_LABELS,
  arrayValue,
  firstText,
  normalizePlanningActionKey,
  planningAction,
  text,
  writingAction,
} from './helpers-basics'
import {
  DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS,
  batchRiskIssueResolved,
  batchRiskLabels,
  buildResolvedBatchRiskIssueKeys,
  clampScore,
  compactChapterNoEvidence,
  coreRiskCount,
  emptyStrengthenedRepairAcceptanceTrend,
  expectationRiskCount,
  findChapter,
  finiteNumberOrNull,
  hasDeliveredProse,
  isCompletedRepairRun,
  isResolvedTaskStatus,
  latestReviewForChapter,
  numberValue,
  parsePayload,
  payoffDebtCount,
  recordTime,
  recoveryEvidenceEventTime,
  recoveryEvidenceGovernanceQueueExecutionMeta,
  recoveryEvidenceReleaseSummaryFromPreflight,
  recoveryEvidenceReview,
  retentionRiskCount,
  signal,
} from './helpers-main'
import {
  buildSafeBatchExpansionStructureValidationResult,
  normalizeDefaultFiveChapterLaneTemplateVersion,
  safeBatchDefaultRecoveryRiskCountForReason,
  safeBatchExpansionPolicyFromPreflight,
  safeBatchExpansionRollbackPolicy,
  safeBatchExpansionSegmentKey,
} from './helpers-safe-batch-recovery'
import {
  buildSafeBatchExpansionStructureDecisionExecutionReview,
} from './helpers-safe-batch-expansion-structure'

export function recoveryEvidenceProfileSourceMeta(source: string, fallbackLabel = '') {
  if (source === 'single_chapter_governance_recheck') return { source, label: '单章治理复查' }
  if (source === 'safe_batch_recovery_recheck') return { source, label: '批次恢复复查' }
  if (source === 'recovery_evidence_release_summary') return { source, label: '安全连写放行摘要' }
  return { source: source || 'recovery_evidence_release_summary', label: fallbackLabel || '恢复依据来源' }
}

export function recoveryEvidenceProfileSourceFromItem(item: AnyRecord) {
  const gateSource = text(item?.production_gate_source || item?.productionGateSource)
  const sourceAction = text(item?.source_action || item?.sourceAction)
  if (gateSource) return recoveryEvidenceProfileSourceMeta(gateSource)
  if (sourceAction === 'single_chapter_governance_recheck' || sourceAction === 'safe_batch_recovery_recheck') {
    return recoveryEvidenceProfileSourceMeta(sourceAction)
  }
  return recoveryEvidenceProfileSourceMeta(text(item?.source || item?.sourceMode), text(item?.source_label || item?.sourceLabel))
}

export function recoveryEvidenceReleaseFailureEventsFromTask(task: AnyRecord, run: AnyRecord, taskIndex: number) {
  if (text(task?.issue_type || task?.issueType) !== 'recovery_evidence_mismatch') return []
  const events: AnyRecord[] = []
  const review = task?.recovery_evidence_review || task?.recoveryEvidenceReview || {}
  arrayValue(review?.failed_items || review?.failedItems)
    .filter(item => text(item?.source || item?.sourceMode) === 'recovery_evidence_release_summary')
    .forEach(item => {
      const sourceMeta = recoveryEvidenceProfileSourceFromItem(item)
      events.push({
        source: sourceMeta.source,
        label: sourceMeta.label,
        evidence: text(item?.evidence),
        run_id: run?.id ?? null,
        task_index: taskIndex,
        failed_at: text(run?.created_at || run?.updated_at),
      })
    })

  const queue = task?.recovery_evidence_regovernance_queue
    || task?.recoveryEvidenceRegovernanceQueue
    || task?.recoveryEvidenceGovernanceQueue
    || null
  arrayValue(queue?.tasks)
    .filter(item => text(item?.issue_type || item?.issueType) === 'recovery_evidence_governance_queue')
    .forEach(item => {
      const sourceMeta = recoveryEvidenceProfileSourceMeta(text(item?.source || item?.sourceMode), text(item?.source_label || item?.sourceLabel))
      events.push({
        source: sourceMeta.source,
        label: sourceMeta.label,
        evidence: text(item?.evidence || arrayValue(item?.failed_evidence || item?.failedEvidence)[0]),
        run_id: run?.id ?? null,
        task_index: taskIndex,
        failed_at: text(run?.created_at || run?.updated_at),
      })
    })
  return events.filter(item => item.source && item.evidence)
}

export function isRecoveryEvidenceDeepRepairAction(actionKey: string) {
  return actionKey === 'deep_repair_single_brief' || actionKey === 'deep_repair_batch_brief'
}

export function recoveryEvidenceDeepRepairEventsFromTask(task: AnyRecord, run: AnyRecord, taskIndex: number) {
  if (text(task?.issue_type || task?.issueType) !== 'recovery_evidence_governance_queue') return []
  const actionKey = text(task?.action_key || task?.actionKey)
  if (!isRecoveryEvidenceDeepRepairAction(actionKey)) return []
  const sourceMeta = recoveryEvidenceProfileSourceMeta(text(task?.source || task?.sourceMode), text(task?.source_label || task?.sourceLabel))
  const taskStatus = text(task?.task_status || task?.taskStatus)
  const completed = ['resolved', 'closed', 'done', 'passed'].includes(taskStatus)
  const repairedAt = completed
    ? firstText(task?.resolved_at, task?.resolvedAt, task?.completed_at, task?.completedAt, task?.updated_at, task?.updatedAt, run?.completed_at, run?.updated_at, run?.created_at)
    : ''
  const queuedAt = firstText(task?.created_at, task?.createdAt, run?.created_at, run?.updated_at)
  return [{
    source: sourceMeta.source,
    label: sourceMeta.label,
    action_key: actionKey,
    action_label: text(task?.action_label || task?.actionLabel, recoveryEvidenceDeepRepairAction(sourceMeta.source).label),
    deep_repair_level: text(task?.deep_repair_level || task?.deepRepairLevel, 'first_deep_repair'),
    task_status: taskStatus,
    completed,
    run_id: run?.id ?? null,
    task_index: taskIndex,
    repaired_at: repairedAt,
    queued_at: queuedAt,
    event_at: repairedAt || queuedAt,
  }].filter(item => item.source && item.event_at)
}

export function recoveryEvidenceDefaultStrengthenedRepairClosure(label: string, status = 'not_required') {
  const normalizedStatus = status === 'needs_repair' || status === 'pending_recheck' || status === 'converged' || status === 'recurred'
    ? status
    : 'not_required'
  const defaultLabel = normalizedStatus === 'needs_repair'
    ? '待强化深修'
    : normalizedStatus === 'pending_recheck'
      ? '强化深修待复检'
      : normalizedStatus === 'converged'
        ? '强化深修已收敛'
        : normalizedStatus === 'recurred'
          ? '强化深修后仍复发'
          : '无需强化深修'
  const summary = normalizedStatus === 'needs_repair'
    ? `${label}普通深修后仍出现同源放行失败，需要生成强化深修复检。`
    : normalizedStatus === 'pending_recheck'
      ? `${label}强化深修任务已生成，等待执行后复检同源失败是否收敛。`
      : normalizedStatus === 'converged'
        ? `${label}强化深修后暂无新的同源放行后失效，可恢复小批量安全连写并继续观察。`
        : normalizedStatus === 'recurred'
          ? `${label}强化深修后仍出现同源放行失败，继续禁止放宽安全连写。`
          : `${label}尚未触发强化深修。`
  return {
    status: normalizedStatus,
    label: defaultLabel,
    summary,
    latest_repair_run_id: null,
    latest_repair_at: '',
    post_repair_failure_count: 0,
    post_repair_evidence: [],
  }
}

export function recoveryEvidenceDefaultDeepRepairEffect(source: AnyRecord) {
  const label = text(source?.label || source?.source_label || source?.sourceLabel || source?.source, '恢复依据来源')
  return {
    status: 'none',
    label: '未深修',
    summary: `${label}尚未生成深层修复队列。`,
    latest_repair_run_id: null,
    latest_repair_action_label: '',
    latest_repair_at: '',
    post_repair_failure_count: 0,
    post_repair_evidence: [],
    strengthened_repair_closure: recoveryEvidenceDefaultStrengthenedRepairClosure(label),
  }
}

export function buildRecoveryEvidenceStrengthenedRepairClosure(label: string, failures: AnyRecord[], repairs: AnyRecord[]) {
  const completedEscalatedRepairs = repairs
    .filter(event =>
      text(event?.deep_repair_level || event?.deepRepairLevel) === 'escalated_after_recurrence'
      && Boolean(event.completed)
      && recoveryEvidenceEventTime(event.repaired_at) > 0,
    )
    .sort((a, b) => recoveryEvidenceEventTime(b.repaired_at) - recoveryEvidenceEventTime(a.repaired_at))
  const pendingEscalatedRepairs = repairs
    .filter(event =>
      text(event?.deep_repair_level || event?.deepRepairLevel) === 'escalated_after_recurrence'
      && !event.completed,
    )
    .sort((a, b) => recoveryEvidenceEventTime(b.event_at) - recoveryEvidenceEventTime(a.event_at))
  const latestEscalatedRepair = completedEscalatedRepairs[0]

  if (latestEscalatedRepair) {
    const repairTime = recoveryEvidenceEventTime(latestEscalatedRepair.repaired_at)
    const postRepairFailures = failures
      .filter(event => recoveryEvidenceEventTime(event.failed_at) > repairTime)
      .sort((a, b) => recoveryEvidenceEventTime(a.failed_at) - recoveryEvidenceEventTime(b.failed_at))
    if (postRepairFailures.length) {
      return {
        status: 'recurred',
        label: '强化深修后仍复发',
        summary: `${label}最近一次${text(latestEscalatedRepair.action_label, '强化深修')}后又放行失败 ${postRepairFailures.length} 次，不能恢复多章安全连写。`,
        latest_repair_run_id: latestEscalatedRepair.run_id ?? null,
        latest_repair_at: text(latestEscalatedRepair.repaired_at),
        post_repair_failure_count: postRepairFailures.length,
        post_repair_evidence: Array.from(new Set(postRepairFailures.map(event => text(event.evidence)).filter(Boolean))).slice(0, 4),
      }
    }
    return {
      status: 'converged',
      label: '强化深修已收敛',
      summary: `${label}强化深修后暂无新的同源放行后失效，可恢复小批量安全连写并继续观察。`,
      latest_repair_run_id: latestEscalatedRepair.run_id ?? null,
      latest_repair_at: text(latestEscalatedRepair.repaired_at),
      post_repair_failure_count: 0,
      post_repair_evidence: [],
    }
  }

  const pendingEscalatedRepair = pendingEscalatedRepairs[0]
  if (pendingEscalatedRepair) {
    return {
      status: 'pending_recheck',
      label: '强化深修待复检',
      summary: `${label}已有${text(pendingEscalatedRepair.action_label, '强化深修')}任务，等待执行后确认同源失败是否收敛。`,
      latest_repair_run_id: pendingEscalatedRepair.run_id ?? null,
      latest_repair_at: text(pendingEscalatedRepair.event_at),
      post_repair_failure_count: 0,
      post_repair_evidence: [],
    }
  }

  const completedRepairs = repairs.filter(event => Boolean(event.completed) && recoveryEvidenceEventTime(event.repaired_at) > 0)
  const hasRecurrenceAfterRepair = completedRepairs.some(repair => {
    const repairTime = recoveryEvidenceEventTime(repair.repaired_at)
    return failures.some(event => recoveryEvidenceEventTime(event.failed_at) > repairTime)
  })
  if (hasRecurrenceAfterRepair) {
    return recoveryEvidenceDefaultStrengthenedRepairClosure(label, 'needs_repair')
  }

  return recoveryEvidenceDefaultStrengthenedRepairClosure(label)
}

export function buildRecoveryEvidenceDeepRepairEffects(failureEvents: AnyRecord[], deepRepairEvents: AnyRecord[]) {
  const bySource = new Map<string, AnyRecord[]>()
  const repairsBySource = new Map<string, AnyRecord[]>()

  failureEvents.forEach(event => {
    const source = text(event?.source)
    if (!source) return
    bySource.set(source, [...(bySource.get(source) || []), event])
  })
  deepRepairEvents.forEach(event => {
    const source = text(event?.source)
    if (!source) return
    repairsBySource.set(source, [...(repairsBySource.get(source) || []), event])
  })

  const effects = new Map<string, AnyRecord>()
  for (const [source, failures] of bySource.entries()) {
    const label = text(failures[0]?.label || source, '恢复依据来源')
    const repairs = (repairsBySource.get(source) || [])
      .slice()
      .sort((a, b) => recoveryEvidenceEventTime(b.event_at) - recoveryEvidenceEventTime(a.event_at))
    const completedRepairs = repairs
      .filter(event => Boolean(event.completed) && recoveryEvidenceEventTime(event.repaired_at) > 0)
      .sort((a, b) => recoveryEvidenceEventTime(b.repaired_at) - recoveryEvidenceEventTime(a.repaired_at))
    const latestRepair = completedRepairs[0]
    const strengthenedRepairClosure = buildRecoveryEvidenceStrengthenedRepairClosure(label, failures, repairs)

    if (latestRepair) {
      const repairTime = recoveryEvidenceEventTime(latestRepair.repaired_at)
      const postRepairFailures = failures
        .filter(event => recoveryEvidenceEventTime(event.failed_at) > repairTime)
        .sort((a, b) => recoveryEvidenceEventTime(a.failed_at) - recoveryEvidenceEventTime(b.failed_at))
      if (postRepairFailures.length) {
        effects.set(source, {
          status: 'recurred',
          label: '深修后仍失效',
          summary: `${label}最近一次${text(latestRepair.action_label, '深修')}后又放行失败 ${postRepairFailures.length} 次，需要升级任务书修复口径。`,
          latest_repair_run_id: latestRepair.run_id ?? null,
          latest_repair_action_label: text(latestRepair.action_label),
          latest_repair_at: text(latestRepair.repaired_at),
          post_repair_failure_count: postRepairFailures.length,
          post_repair_evidence: Array.from(new Set(postRepairFailures.map(event => text(event.evidence)).filter(Boolean))).slice(0, 4),
          strengthened_repair_closure: strengthenedRepairClosure,
        })
      } else {
        effects.set(source, {
          status: 'observing',
          label: '深修后暂无再失效',
          summary: `${label}最近一次${text(latestRepair.action_label, '深修')}后暂无新的放行后失效，继续观察下一批正文继承。`,
          latest_repair_run_id: latestRepair.run_id ?? null,
          latest_repair_action_label: text(latestRepair.action_label),
          latest_repair_at: text(latestRepair.repaired_at),
          post_repair_failure_count: 0,
          post_repair_evidence: [],
          strengthened_repair_closure: strengthenedRepairClosure,
        })
      }
      continue
    }

    const pendingRepair = repairs[0]
    if (pendingRepair) {
      effects.set(source, {
        status: 'pending',
        label: '深修待复查',
        summary: `${label}已有${text(pendingRepair.action_label, '深修')}任务，等待执行后观察同源是否继续失效。`,
        latest_repair_run_id: pendingRepair.run_id ?? null,
        latest_repair_action_label: text(pendingRepair.action_label),
        latest_repair_at: text(pendingRepair.event_at),
        post_repair_failure_count: 0,
        post_repair_evidence: [],
        strengthened_repair_closure: strengthenedRepairClosure,
      })
    }
  }

  return effects
}


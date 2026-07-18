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

export function buildRecoveryEvidenceSourceRiskProfile(runRecords: AnyRecord[]) {
  const seen = new Set<string>()
  const bySource = new Map<string, AnyRecord>()
  const failureEvents: AnyRecord[] = []
  const deepRepairEvents: AnyRecord[] = []
  runRecords
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .forEach(run => {
      const output = parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {}
      const tasks = [
        ...arrayValue(output?.tasks),
        ...arrayValue(output?.repairTasks),
      ]
      tasks.forEach((task, taskIndex) => {
        deepRepairEvents.push(...recoveryEvidenceDeepRepairEventsFromTask(task, run, taskIndex))
        recoveryEvidenceReleaseFailureEventsFromTask(task, run, taskIndex).forEach(event => {
          const eventKey = [event.run_id, event.task_index, event.source, event.evidence].join('|')
          if (seen.has(eventKey)) return
          seen.add(eventKey)
          failureEvents.push(event)
          const current = bySource.get(event.source) || {
            source: event.source,
            label: event.label,
            release_failure_count: 0,
            evidence: [],
            source_run_ids: [],
            latest_failed_at: '',
          }
          current.release_failure_count += 1
          current.evidence = Array.from(new Set([...arrayValue(current.evidence), event.evidence])).slice(0, 6)
          current.source_run_ids = Array.from(new Set([...arrayValue(current.source_run_ids), event.run_id].filter(Boolean))).slice(0, 8)
          current.latest_failed_at = event.failed_at || current.latest_failed_at
          bySource.set(event.source, current)
        })
      })
    })
  const deepRepairEffects = buildRecoveryEvidenceDeepRepairEffects(failureEvents, deepRepairEvents)

  const sources = Array.from(bySource.values())
    .map(source => ({
      ...source,
      deep_repair_effect: deepRepairEffects.get(text(source?.source)) || recoveryEvidenceDefaultDeepRepairEffect(source),
    }))
    .sort((a, b) => Number(b.release_failure_count || 0) - Number(a.release_failure_count || 0))
  const repeatedSources = sources.filter(source => Number(source.release_failure_count || 0) >= 2)
  const unresolvedRepeatedSources = repeatedSources.filter(source =>
    text(source?.deep_repair_effect?.strengthened_repair_closure?.status || source?.deepRepairEffect?.strengthenedRepairClosure?.status) !== 'converged',
  )
  const topUnresolved = unresolvedRepeatedSources[0]
  const topRepeated = topUnresolved || repeatedSources[0]
  const detail = topUnresolved
    ? `${topUnresolved.label}反复放行失败 ${topUnresolved.release_failure_count} 次：${arrayValue(topUnresolved.evidence).slice(0, 2).join('；')}。本轮只允许单章推进，并先复盘更深层创作问题。`
    : topRepeated
      ? `${topRepeated.label}强化深修已收敛，历史 ${topRepeated.release_failure_count} 次放行后失效进入观察；可恢复小批量安全连写。`
    : sources.length
      ? '恢复依据放行后失效来源已有记录，但尚未形成反复失败画像。'
      : '暂无反复放行失败的恢复依据来源。'

  return {
    visible: sources.length > 0,
    status: unresolvedRepeatedSources.length > 0 ? 'warn' as const : 'ok' as const,
    label: '恢复依据画像',
    detail,
    summary: detail,
    source_count: sources.length,
    repeat_source_count: repeatedSources.length,
    total_failure_count: sources.reduce((sum, source) => sum + Number(source.release_failure_count || 0), 0),
    sources,
  }
}

export function recoveryEvidenceDeepRepairDirection(source: string, label: string) {
  if (source === 'single_chapter_governance_recheck') {
    return '深层修复方向：回到单章任务书，确认治理复查证据已经写成正文里的可见冲突、对白动作、读者回报和章末钩子。'
  }
  if (source === 'safe_batch_recovery_recheck') {
    return '深层修复方向：复盘批次任务书，把多章承诺拆回每章冲突职责、回报落点和剧情线推进，再恢复批量连写。'
  }
  if (source === 'review_governance_closure') {
    return '深层修复方向：回到治理复查台，重新确认修后证据、观察项和关闭条件，再让后续正文承接。'
  }
  return `深层修复方向：复查${label || '恢复依据来源'}的关闭条件，把抽象依据改成下一章可执行的事件、选择、代价和回报。`
}

export function normalizeRecoveryEvidenceDeepRepairEffect(effect: AnyRecord | null | undefined, fallbackLabel: string) {
  const status = text(effect?.status)
  const normalizedStatus: AutoCreationRecoveryEvidenceTrendSource['deepRepairEffect']['status'] =
    status === 'pending' || status === 'observing' || status === 'recurred' ? status : 'none'
  const defaultLabel = normalizedStatus === 'recurred'
    ? '深修后仍失效'
    : normalizedStatus === 'observing'
      ? '深修后暂无再失效'
      : normalizedStatus === 'pending'
        ? '深修待复查'
        : '未深修'
  const strengthenedClosure = normalizeRecoveryEvidenceStrengthenedRepairClosure(
    effect?.strengthened_repair_closure || effect?.strengthenedRepairClosure,
    fallbackLabel,
    normalizedStatus,
  )
  return {
    status: normalizedStatus,
    label: text(effect?.label, defaultLabel),
    summary: text(effect?.summary, `${fallbackLabel || '恢复依据来源'}尚未生成深层修复队列。`),
    latestRepairRunId: effect?.latest_repair_run_id ?? effect?.latestRepairRunId ?? null,
    latestRepairActionLabel: text(effect?.latest_repair_action_label || effect?.latestRepairActionLabel),
    latestRepairAt: text(effect?.latest_repair_at || effect?.latestRepairAt),
    postRepairFailureCount: Number(effect?.post_repair_failure_count ?? effect?.postRepairFailureCount ?? 0),
    postRepairEvidence: arrayValue(effect?.post_repair_evidence || effect?.postRepairEvidence).map(item => text(item)).filter(Boolean).slice(0, 4),
    strengthenedClosure,
  }
}

export function normalizeRecoveryEvidenceStrengthenedRepairClosure(
  closure: AnyRecord | null | undefined,
  fallbackLabel: string,
  effectStatus: AutoCreationRecoveryEvidenceTrendSource['deepRepairEffect']['status'],
): AutoCreationRecoveryEvidenceTrendSource['deepRepairEffect']['strengthenedClosure'] {
  const status = text(closure?.status)
  const normalizedStatus: AutoCreationRecoveryEvidenceTrendSource['deepRepairEffect']['strengthenedClosure']['status'] =
    status === 'needs_repair' || status === 'pending_recheck' || status === 'converged' || status === 'recurred'
      ? status
      : effectStatus === 'recurred'
        ? 'needs_repair'
        : 'not_required'
  const defaults = recoveryEvidenceDefaultStrengthenedRepairClosure(fallbackLabel || '恢复依据来源', normalizedStatus)
  return {
    status: normalizedStatus,
    label: text(closure?.label, defaults.label),
    summary: text(closure?.summary, defaults.summary),
    latestRepairRunId: closure?.latest_repair_run_id ?? closure?.latestRepairRunId ?? defaults.latest_repair_run_id,
    latestRepairAt: text(closure?.latest_repair_at || closure?.latestRepairAt || defaults.latest_repair_at),
    postRepairFailureCount: Number(closure?.post_repair_failure_count ?? closure?.postRepairFailureCount ?? defaults.post_repair_failure_count),
    postRepairEvidence: arrayValue(closure?.post_repair_evidence || closure?.postRepairEvidence || defaults.post_repair_evidence).map(item => text(item)).filter(Boolean).slice(0, 4),
  }
}

export function buildRecoveryEvidenceTrend(
  profile: AnyRecord | null | undefined,
  strengthenedAcceptanceTrend: AutoCreationStrengthenedRepairAcceptanceTrend = emptyStrengthenedRepairAcceptanceTrend(),
): AutoCreationRecoveryEvidenceTrend {
  const sources = arrayValue(profile?.sources)
    .map(item => {
      const source = text(item?.source || item?.sourceMode)
      const label = text(item?.label || item?.source_label || item?.sourceLabel || item?.source, '恢复依据来源')
      const releaseFailureCount = Number(item?.release_failure_count || item?.releaseFailureCount || 0)
      const deepRepairEffect = normalizeRecoveryEvidenceDeepRepairEffect(item?.deep_repair_effect || item?.deepRepairEffect, label)
      return {
        source,
        label,
        releaseFailureCount,
        trendLabel: `近${Math.max(1, releaseFailureCount || 1)}轮失败`,
        evidence: arrayValue(item?.evidence).map((entry: any) => text(entry)).filter(Boolean).slice(0, 4),
        sourceRunIds: arrayValue(item?.source_run_ids || item?.sourceRunIds).filter(Boolean).slice(0, 8),
        deepRepairDirection: recoveryEvidenceDeepRepairDirection(source, label),
        deepRepairEffect,
      }
    })
    .filter(item => item.source && item.releaseFailureCount > 0)
    .sort((a, b) => b.releaseFailureCount - a.releaseFailureCount)
  const repeatedSources = sources.filter(item => item.releaseFailureCount >= 2)
  const unresolvedRepeatedSources = repeatedSources.filter(item => item.deepRepairEffect.strengthenedClosure.status !== 'converged')
  const focus = unresolvedRepeatedSources[0] || repeatedSources[0] || sources[0] || null
  const status: AutoCreationBatchGuardrailSignalStatus = unresolvedRepeatedSources.length > 0 || text(profile?.status) === 'warn' && unresolvedRepeatedSources.length > 0
    ? 'warn'
    : 'ok'
  const summary = focus
    ? focus.releaseFailureCount >= 2
      ? focus.deepRepairEffect.strengthenedClosure.status === 'converged'
        ? `${focus.label}强化深修已收敛，可恢复小批量安全连写并继续观察同源继承。`
        : `${focus.label}近${focus.releaseFailureCount}轮放行后失效，任务中心应先处理深层创作修复，再恢复多章安全连写。`
      : `${focus.label}已有放行后失效记录，本轮继续观察来源稳定性。`
    : '暂无恢复依据来源失效趋势。'

  return {
    visible: sources.length > 0,
    status,
    label: '恢复依据画像趋势',
    summary,
    totalFailureCount: Number(profile?.total_failure_count || profile?.totalFailureCount || sources.reduce((sum, item) => sum + item.releaseFailureCount, 0)),
    repeatSourceCount: Number(profile?.repeat_source_count || profile?.repeatSourceCount || repeatedSources.length),
    sources,
    strengthenedAcceptanceTrend,
  }
}

export function recoveryEvidenceDeepRepairAction(source: string) {
  if (source === 'single_chapter_governance_recheck') {
    return { actionKey: 'deep_repair_single_brief', label: '深修单章任务书' }
  }
  if (source === 'safe_batch_recovery_recheck') {
    return { actionKey: 'deep_repair_batch_brief', label: '深修批次任务书' }
  }
  return { actionKey: 'review_governance_closure', label: '治理复查台' }
}

export function buildRecoveryEvidenceDeepRepairQueue(trend: AutoCreationRecoveryEvidenceTrend) {
  const repeatedSources = trend.sources.filter(source => source.releaseFailureCount >= 2)
  const actionableSources = repeatedSources.filter(source =>
    source.deepRepairEffect.status === 'none'
    || (
      source.deepRepairEffect.status === 'recurred'
      && !['pending_recheck', 'converged'].includes(source.deepRepairEffect.strengthenedClosure.status)
    ),
  )
  const tasks = actionableSources.map((source, index) => {
    const action = recoveryEvidenceDeepRepairAction(source.source)
    const escalated = source.deepRepairEffect.status === 'recurred'
    const actionLabel = escalated && action.actionKey === 'deep_repair_single_brief'
      ? '强化单章任务书复盘'
      : escalated && action.actionKey === 'deep_repair_batch_brief'
        ? '强化批次任务书复盘'
        : action.label
    const evidence = source.evidence.length
      ? source.evidence
      : [`${source.label}近${source.releaseFailureCount}轮放行后失效`]
    const executionMeta = recoveryEvidenceGovernanceQueueExecutionMeta({
      source: source.source,
      source_run_ids: source.sourceRunIds,
    }, action.actionKey)

    return {
      issue_type: 'recovery_evidence_governance_queue',
      severity: 'high',
      task_status: 'needs_review',
      source: source.source,
      source_label: source.label,
      source_status: 'repeated_release_failure',
      source_status_label: '反复放行后失效',
      action_key: action.actionKey,
      action_label: actionLabel,
      deep_repair_level: escalated ? 'escalated_after_recurrence' : 'first_deep_repair',
      deep_repair_direction: source.deepRepairDirection,
      deep_repair_effect: source.deepRepairEffect,
      release_failure_count: source.releaseFailureCount,
      trend_label: source.trendLabel,
      source_run_ids: source.sourceRunIds,
      failed_evidence: evidence,
      ...executionMeta,
      title: `${source.label}：${actionLabel}`,
      message: `${source.label}${source.trendLabel}，需要先做深层创作修复，再恢复多章安全连写。`,
      action: escalated
        ? `${source.deepRepairEffect.summary} ${source.deepRepairDirection} 这次需要把任务书修复口径升级到可验收的场景职责。`
        : source.deepRepairDirection,
      recovery_evidence_review: {
        status: 'warn',
        summary: `${source.label}${source.trendLabel}：${evidence.join('；')}`,
        failed_evidence: evidence,
      },
      acceptance_criteria: [
        source.deepRepairDirection,
        '下一轮正文必须可见继承恢复依据，而不是只在审计里声明已处理',
        '恢复依据画像趋势不再出现同来源连续放行后失效',
      ],
      queue_index: index,
    }
  })
  const escalated = tasks.some(task => task.deep_repair_level === 'escalated_after_recurrence')
  const pendingStrengthened = repeatedSources.some(source => source.deepRepairEffect.strengthenedClosure.status === 'pending_recheck')
  const convergedStrengthened = repeatedSources.some(source => source.deepRepairEffect.strengthenedClosure.status === 'converged')

  return {
    source: 'recovery_evidence_source_risk_profile',
    status: tasks.length ? 'needs_followup' : 'ok',
    label: escalated ? '恢复依据画像强化深修' : pendingStrengthened ? '恢复依据画像强化复检' : '恢复依据画像深层修复',
    summary: tasks.length
      ? escalated
        ? `${tasks.length} 类恢复依据来源深修后仍失效，需要升级任务书复盘口径。`
        : `${tasks.length} 类恢复依据来源反复放行后失效，需要先生成深层修复队列。`
      : pendingStrengthened
        ? '强化深修任务已生成，等待复检收敛；暂不重复生成深修队列。'
        : convergedStrengthened
          ? '强化深修已收敛，恢复依据画像进入安全连写观察。'
          : '恢复依据画像来源已进入深修观察或待复查，不重复生成深修队列。',
    source_count: trend.sources.length,
    repeat_source_count: repeatedSources.length,
    total_failure_count: trend.totalFailureCount,
    task_count: tasks.length,
    sources: trend.sources,
    main_action: {
      action: text(tasks[0]?.action_key, 'review_governance_closure'),
      label: text(tasks[0]?.action_label, '治理复查台'),
      source: text(tasks[0]?.source, 'recovery_evidence_source_risk_profile'),
      sourceLabel: text(tasks[0]?.source_label, '恢复依据画像'),
      status: text(tasks[0]?.source_status, 'repeated_release_failure'),
      residualEvidence: arrayValue(tasks[0]?.failed_evidence),
    },
    next_cycle: {
      type: 'recovery_evidence_source_deep_repair',
      label: '恢复依据画像深层修复',
    },
    tasks,
    recommendations: tasks.length
      ? tasks.map(task => `${task.source_label}：${task.deep_repair_direction}`)
      : pendingStrengthened
        ? ['等待强化深修复检回填；复检收敛前只允许单章推进。']
        : ['继续观察恢复依据画像趋势，深修后暂无再失效的来源不重复生成队列。'],
  }
}

export function batchBriefChapterNos(batchBrief: AnyRecord | null | undefined) {
  return new Set(arrayValue(batchBrief?.chapters)
    .map(item => Number(item?.chapter_no ?? item?.chapterNo ?? 0))
    .filter(Boolean))
}

export function batchBriefVisible(batchBrief: AnyRecord | null | undefined) {
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

export function batchBriefAppliesToItem(batchBrief: AnyRecord | null | undefined, item: AutoCreationBatchReviewItem) {
  if (!batchBriefVisible(batchBrief)) return false
  const plannedNos = batchBriefChapterNos(batchBrief)
  return plannedNos.size === 0 || plannedNos.has(Number(item.chapterNo))
}

export function normalizeBatchBriefChapterPlan(value: any) {
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

export function buildBatchPlanContext(batchBrief: AnyRecord | null | undefined, item: AutoCreationBatchReviewItem) {
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

export function batchBriefStartChecklist(batchBrief: AnyRecord | null | undefined) {
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

export function checklistRiskReasons(key: string, counts: {
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

export function buildBatchChecklistExecution(args: {
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

export function first30RetentionAppliesToBatch(items: AutoCreationBatchReviewItem[]) {
  return items.some(item => {
    const chapterNo = Number(item.chapterNo || 0)
    return chapterNo > 0 && chapterNo <= 30
  })
}

export function first30RetentionRisk(args: {
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

export function normalizePostBatchQualityCheck(source: AnyRecord | null | undefined) {
  const raw = source?.post_batch_quality_check || source?.postBatchQualityCheck || source || null
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      visible: false,
      status: 'ok' as AutoCreationBatchRiskStatus,
      source: '',
      warning_count: 0,
      chapter_nos: [] as number[],
      average_score: null as number | null,
      revised_count: 0,
      checks: [] as AnyRecord[],
      summary: '',
    }
  }
  const checks = arrayValue(raw.checks).map((check: AnyRecord) => {
    const status = text(check?.status).toLowerCase()
    const warnCount = Number(check?.warn_count ?? check?.warnCount ?? 0)
    const unknownCount = Number(check?.unknown_count ?? check?.unknownCount ?? 0)
    const warningCount = warnCount > 0 ? warnCount : ['warn', 'warning', 'failed', 'error'].includes(status) ? 1 : 0
    return {
      key: text(check?.key),
      label: text(check?.label || check?.key, '批次质检'),
      status: warningCount > 0 ? 'warn' : unknownCount > 0 || status === 'unknown' ? 'unknown' : status || 'ok',
      checked_count: Number(check?.checked_count ?? check?.checkedCount ?? 0) || 0,
      warn_count: warningCount,
      unknown_count: unknownCount,
      summaries: arrayValue(check?.summaries).map(item => text(item)).filter(Boolean),
    }
  }).filter((check: AnyRecord) => check.key || check.label)
  const warningChecks = checks.filter((check: AnyRecord) => check.warn_count > 0 || ['warn', 'failed', 'error', 'unknown'].includes(text(check.status)))
  const warningCount = warningChecks.reduce((sum: number, check: AnyRecord) => sum + Math.max(1, Number(check.warn_count || 0)), 0)
  const status: AutoCreationBatchRiskStatus = warningCount > 0 || text(raw.status).toLowerCase() === 'warn' ? 'warn' : 'ok'
  const chapterNos = arrayValue(raw.chapter_nos || raw.chapterNos).map(chapterNo => Number(chapterNo)).filter((chapterNo: number) => chapterNo > 0)
  const summaryParts = warningChecks.map((check: AnyRecord) => {
    const detail = arrayValue(check.summaries).slice(0, 1).join('；')
    return detail ? `${check.label}：${detail}` : check.label
  })
  return {
    visible: checks.length > 0 || text(raw.source) || text(raw.status),
    status,
    source: text(raw.source),
    warning_count: warningCount,
    chapter_nos: chapterNos,
    average_score: numberValue(raw.average_score ?? raw.averageScore),
    revised_count: Number(raw.revised_count ?? raw.revisedCount ?? 0) || 0,
    checks: warningChecks,
    summary: summaryParts.slice(0, 3).join('；') || (status === 'warn' ? '批次交稿后质检存在未闭环项。' : '批次交稿后质检通过。'),
  }
}

export * from './helpers-batch-handoff-and-launch'

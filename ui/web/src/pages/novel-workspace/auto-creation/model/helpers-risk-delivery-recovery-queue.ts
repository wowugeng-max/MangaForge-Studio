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
  arrayValue,
  firstText,
  opsAction,
  text,
} from './helpers-basics'
import {
  batchReleaseEvidenceItemsFromPreflight,
  batchRiskIssueBatchKey,
  batchRiskIssueKeys,
  chapterAttractionRiskCount,
  chapterAttractionWeakDimensions,
  chapterBenchmarkRiskCount,
  characterArcRiskCount,
  contractSyncRiskCount,
  coreRiskCount,
  deslopRepairReceiptRiskCount,
  deslopRepairReceiptRiskMessage,
  expectationRiskCount,
  findChapter,
  governanceRecheckRiskCount,
  innovationRiskCount,
  isCompletedRepairRun,
  isResolvedTaskStatus,
  issueTexts,
  latestQualityReviewForChapter,
  latestReviewForChapter,
  numberValue,
  parsePayload,
  payloadReviewChapterId,
  payloadReviewChapterNo,
  payoffDebtCount,
  qualityAuditRepairReceiptRiskCount,
  qualityAuditRepairReceiptRiskMessage,
  qualityReviewPassed,
  readabilityRiskCount,
  recordTime,
  repairTaskIssueType,
  resolvedBatchRiskIssueTypes,
  retentionRiskCount,
  reviewPayload,
  revisionSyncRiskCount,
  revisionSyncRiskMessage,
  riskPayload,
  runwayRiskCount,
  sceneCardReceiptRiskCount,
  sceneCardReceiptRiskMessage,
  sceneCardReceiptRiskTitle,
  signal,
  signatureSceneRiskCount,
  storyDriveRiskCount,
  storyUnitRiskCount,
  storylineRiskCount,
  styleSampleRiskCount,
  syncMissedItems,
  volumeSegmentMissedItems,
  volumeSegmentRiskCount,
} from './helpers-risk-and-governance'

import {
} from './helpers-risk-delivery-core'

export function latestRepairAuditEntry(runRecords: AnyRecord[]) {
  return runRecords
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .map(run => ({ run, output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {} }))
    .sort((a, b) => recordTime(b.run) - recordTime(a.run))
    .map(item => ({ run: item.run, audit: item.output?.audit_summary || item.output?.auditSummary }))
    .find(item => item.audit) || null
}

export function compactUniqueText(values: any[], limit = 120) {
  return Array.from(new Set(values.map(item => firstText(item)).filter(Boolean).map(item => item.length > limit ? `${item.slice(0, limit)}…` : item)))
}

export function recoveryEvidenceSourceSummary(recoveryClosure: AnyRecord | null) {
  if (!recoveryClosure) return ''
  const tasks = arrayValue(recoveryClosure?.tasks)
  const singleChapterCount = Number(recoveryClosure?.single_chapter_count ?? recoveryClosure?.singleChapterCount ?? 0)
    || tasks.filter((task: any) => text(task?.source || task?.sourceMode) === 'single_chapter_governance_recheck').length
  const batchCount = Number(recoveryClosure?.batch_count ?? recoveryClosure?.batchCount ?? 0)
    || tasks.filter((task: any) => text(task?.source || task?.sourceMode) === 'safe_batch_recovery_recheck').length
  const genericCount = Math.max(0, Number(recoveryClosure?.total || 0) - singleChapterCount - batchCount)
  return [
    singleChapterCount > 0 ? `单章治理复查 ${singleChapterCount}` : '',
    batchCount > 0 ? `批次恢复复查 ${batchCount}` : '',
    genericCount > 0 ? `恢复依据复查 ${genericCount}` : '',
  ].filter(Boolean).join('；')
}

export function recoveryEvidenceSourceMeta(task: AnyRecord) {
  const source = text(task?.source || task?.sourceMode)
  const sourceLabel = firstText(task?.source_label, task?.sourceLabel)
  if (source === 'single_chapter_governance_recheck') return { source, label: sourceLabel || '单章治理复查' }
  if (source === 'safe_batch_recovery_recheck') return { source, label: sourceLabel || '批次恢复复查' }
  if (text(task?.annotation_source || task?.annotationSource) === 'governance_recheck_sync') {
    return { source: 'single_chapter_governance_recheck', label: sourceLabel || '单章治理复查' }
  }
  if (text(task?.source) === 'auto_creation_safe_batch_risk' || task?.segment) {
    return { source: 'safe_batch_recovery_recheck', label: sourceLabel || '批次恢复复查' }
  }
  return { source: source || 'recovery_evidence_recheck', label: sourceLabel || '恢复依据复查' }
}

export function recoveryEvidenceReview(task: AnyRecord) {
  return task?.recovery_evidence_review || task?.recoveryEvidenceReview || {}
}

export function recoveryEvidenceResidualTexts(task: AnyRecord) {
  const review = recoveryEvidenceReview(task)
  const failedItems = [
    ...arrayValue(review?.failed_items),
    ...arrayValue(review?.failedItems),
  ]
  return compactUniqueText([
    ...arrayValue(review?.failed_evidence),
    ...arrayValue(review?.failedEvidence),
    ...failedItems.map((item: any) => firstText(item?.evidence, item)),
  ], 100).slice(0, 3)
}

export function recoveryEvidenceSourceTaskStatus(task: AnyRecord) {
  const review = recoveryEvidenceReview(task)
  const taskStatus = text(task?.task_status ?? task?.taskStatus ?? task?.status).toLowerCase()
  const reviewStatus = text(review?.status).toLowerCase()
  const residualEvidence = recoveryEvidenceResidualTexts(task)
  const hasResidual = residualEvidence.length > 0 || reviewStatus === 'warn' || taskStatus === 'needs_review'
  const closed = ['resolved', 'closed', 'done', 'completed'].includes(taskStatus) || reviewStatus === 'ok'
  const resultStatus = hasResidual ? 'blocked' : closed ? 'cleared' : 'pending'
  return {
    resultStatus,
    residualEvidence,
  }
}

export function recoveryEvidenceProductionStatusLabel(status: string) {
  if (status === 'cleared') return '生产阻断已解除'
  if (status === 'pending') return '等待复检结论'
  return '暂缓安全连写'
}

export function finiteNumberOrNull(value: any) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function recoveryEvidenceProductionGateNextActionFromSource(source: AnyRecord, action: string, label: string) {
  return {
    action,
    label,
    source: text(source?.source || source?.sourceMode),
    sourceLabel: text(source?.label || source?.sourceLabel),
    status: text(source?.status),
    residualEvidence: arrayValue(source?.residual_evidence || source?.residualEvidence).map(item => text(item)).filter(Boolean),
  }
}

export function recoveryEvidenceGovernanceQueueTaskAction(source: AnyRecord) {
  const sourceKey = text(source?.source || source?.sourceMode)
  const status = text(source?.status)
  const residualEvidence = arrayValue(source?.residual_evidence || source?.residualEvidence).map(item => text(item)).filter(Boolean)
  if (status === 'blocked' && residualEvidence.length > 0) {
    if (sourceKey === 'single_chapter_governance_recheck') return { actionKey: 'revision', label: '回修依据' }
    if (sourceKey === 'safe_batch_recovery_recheck') return { actionKey: 'focus_task', label: '定位批次任务' }
    return { actionKey: 'focus_task', label: '定位任务' }
  }
  if (status === 'pending') {
    if (sourceKey === 'single_chapter_governance_recheck') return { actionKey: 'recheck_single_chapter', label: '复检单章' }
    if (sourceKey === 'safe_batch_recovery_recheck') return { actionKey: 'recheck_safe_batch', label: '复盘批次' }
  }
  return { actionKey: 'review_governance_closure', label: '治理复查台' }
}

export function recoveryEvidenceGovernanceQueueExecutionMeta(source: AnyRecord, actionKey: string) {
  const sourceTasks = arrayValue(source?.source_tasks || source?.sourceTasks)
  const firstTask = sourceTasks[0] || {}
  const sourceTaskIndex = finiteNumberOrNull(firstTask?.source_task_index ?? firstTask?.sourceTaskIndex ?? firstTask?.task_index ?? firstTask?.taskIndex)
  const chapterId = finiteNumberOrNull(firstTask?.chapter_id ?? firstTask?.chapterId)
  const chapterNo = finiteNumberOrNull(firstTask?.chapter_no ?? firstTask?.chapterNo)
  const meta: AnyRecord = {
    source_task_index: sourceTaskIndex,
    source_task_indices: arrayValue(source?.source_task_indices || source?.sourceTaskIndices),
    chapter_id: chapterId,
    chapter_no: chapterNo,
    chapter_ids: arrayValue(source?.chapter_ids || source?.chapterIds),
    chapter_nos: arrayValue(source?.chapter_nos || source?.chapterNos),
  }

  if (actionKey === 'revision') {
    return {
      ...meta,
      recheck_mode: 'single_chapter',
      recheck_source: 'governance_recheck_sync',
      closure_status: 'blocked_until_recheck',
      auto_recheck: true,
      requires_manual_repair: false,
    }
  }

  if (actionKey === 'recheck_single_chapter') {
    return {
      ...meta,
      recheck_mode: 'single_chapter',
      recheck_source: 'governance_recheck_sync',
      closure_status: 'blocked_until_recheck',
      auto_recheck: true,
      requires_manual_repair: false,
    }
  }

  if (actionKey === 'recheck_safe_batch') {
    return {
      ...meta,
      recheck_mode: 'batch_audit',
      recheck_source: 'longform_repair_audit_summary',
      closure_status: 'blocked_until_batch_audit',
      auto_recheck: true,
      requires_manual_repair: false,
    }
  }

  if (actionKey === 'focus_task') {
    return {
      ...meta,
      recheck_mode: 'manual_then_batch_audit',
      recheck_source: 'longform_repair_audit_summary',
      closure_status: 'blocked_until_batch_audit',
      auto_recheck: false,
      requires_manual_repair: true,
    }
  }

  if (actionKey === 'deep_repair_single_brief') {
    return {
      ...meta,
      recheck_mode: 'single_chapter_deep_repair',
      recheck_source: 'recovery_evidence_source_deep_repair',
      closure_status: 'blocked_until_single_brief_deep_repair',
      auto_recheck: false,
      requires_manual_repair: true,
    }
  }

  if (actionKey === 'deep_repair_batch_brief') {
    return {
      ...meta,
      recheck_mode: 'batch_brief_deep_repair',
      recheck_source: 'recovery_evidence_source_deep_repair',
      closure_status: 'blocked_until_batch_brief_deep_repair',
      auto_recheck: false,
      requires_manual_repair: true,
    }
  }

  return {
    ...meta,
    recheck_mode: 'governance_closure',
    recheck_source: 'longform_repair_audit_summary',
    closure_status: 'blocked_until_governance_review',
    auto_recheck: false,
    requires_manual_repair: false,
  }
}

export function buildRecoveryEvidenceGovernanceQueue(snapshot: AnyRecord, nextAction: AnyRecord | null) {
  const sources = arrayValue(snapshot?.sources)
  const unresolvedSources = sources.filter(source => text(source?.status) !== 'cleared')
  const mainAction = nextAction || {
    action: 'review_governance_closure',
    label: '治理复查台',
    source: 'recovery_evidence_production_gate',
    sourceLabel: '恢复依据生产闸门',
    status: text(snapshot?.status),
    residualEvidence: [],
  }
  const tasks = unresolvedSources.map((source, index) => {
    const action = recoveryEvidenceGovernanceQueueTaskAction(source)
    const residualEvidence = arrayValue(source?.residual_evidence || source?.residualEvidence).map(item => text(item)).filter(Boolean)
    const sourceLabel = text(source?.label || source?.sourceLabel || source?.source, '恢复依据来源')
    const statusLabel = text(source?.status_label || source?.statusLabel, recoveryEvidenceProductionStatusLabel(text(source?.status)))
    const executionMeta = recoveryEvidenceGovernanceQueueExecutionMeta(source, action.actionKey)
    return {
      issue_type: 'recovery_evidence_governance_queue',
      severity: text(source?.status) === 'blocked' ? 'high' : 'medium',
      task_status: 'needs_review',
      source: text(source?.source || source?.sourceMode),
      source_label: sourceLabel,
      source_status: text(source?.status),
      source_status_label: statusLabel,
      action_key: action.actionKey,
      action_label: action.label,
      ...executionMeta,
      title: `${sourceLabel}：${action.label}`,
      message: residualEvidence.length
        ? `${statusLabel}：${residualEvidence.join('；')}`
        : `${statusLabel}，需要先完成${action.label}再恢复安全连写。`,
      action: `${action.label}后刷新恢复依据审计，确认该来源从暂缓安全连写/等待复检结论变为生产阻断已解除。`,
      recovery_evidence_review: {
        status: residualEvidence.length ? 'warn' : 'pending',
        summary: residualEvidence.length ? `残留依据：${residualEvidence.join('；')}` : '等待复检结论回填。',
        failed_evidence: residualEvidence,
      },
      acceptance_criteria: [
        `${sourceLabel}显示生产阻断已解除`,
        '恢复依据审计无残留 failed_evidence',
        '总控台恢复依据生产闸门允许继续安全连写',
      ],
      queue_index: index,
    }
  })
  const nextCycleType = ['revision', 'focus_task'].includes(text(mainAction.action)) ? 'revision_batch' : 'recheck_summary'
  return {
    source: 'recovery_evidence_production_gate',
    status: text(snapshot?.status),
    summary: `恢复依据生产闸门阻断，先执行「${text(mainAction.label, '治理复查台')}」并沉淀为连续治理队列。`,
    main_action: mainAction,
    source_count: Number(snapshot?.source_count || sources.length || 0),
    sources,
    tasks,
    next_cycle: {
      type: nextCycleType,
      label: nextCycleType === 'revision_batch' ? '下一轮修订批次' : '下一轮复检批次摘要',
    },
    recommendations: [
      `先处理主动作「${text(mainAction.label, '治理复查台')}」，不要带着未解除恢复依据进入安全连写。`,
      '处理后重新生成恢复依据审计摘要，确认单章/批次来源均变为生产阻断已解除。',
      '审计闭环后再回到总控台恢复 2-3 章安全连写。',
    ],
  }
}

export * from './helpers-risk-recovery-governance'

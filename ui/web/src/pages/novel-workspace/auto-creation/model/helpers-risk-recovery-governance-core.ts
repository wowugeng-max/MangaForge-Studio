import type { PlanningActionKey, PlanningWorkspaceModel } from '../../planningWorkspaceModel'
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
  compactUniqueText,
  finiteNumberOrNull,
  latestRepairAuditEntry,
  recoveryEvidenceProductionGateNextActionFromSource,
  recoveryEvidenceProductionStatusLabel,
  recoveryEvidenceReview,
  recoveryEvidenceSourceMeta,
  recoveryEvidenceSourceSummary,
  recoveryEvidenceSourceTaskStatus
} from './helpers-risk-delivery-and-recovery'

export function buildRecoveryEvidenceProductionGateNextAction(sources: AnyRecord[]) {
  const singleResidual = sources.find(source =>
    text(source?.source) === 'single_chapter_governance_recheck'
    && text(source?.status) === 'blocked'
    && arrayValue(source?.residual_evidence || source?.residualEvidence).length > 0,
  )
  if (singleResidual) {
    return recoveryEvidenceProductionGateNextActionFromSource(singleResidual, 'revision', '回修依据')
  }

  const batchResidual = sources.find(source =>
    text(source?.source) === 'safe_batch_recovery_recheck'
    && text(source?.status) === 'blocked'
    && arrayValue(source?.residual_evidence || source?.residualEvidence).length > 0,
  )
  if (batchResidual) {
    return recoveryEvidenceProductionGateNextActionFromSource(batchResidual, 'focus_task', '定位批次任务')
  }

  const genericResidual = sources.find(source =>
    text(source?.status) === 'blocked'
    && arrayValue(source?.residual_evidence || source?.residualEvidence).length > 0,
  )
  if (genericResidual) {
    return recoveryEvidenceProductionGateNextActionFromSource(genericResidual, 'focus_task', '定位任务')
  }

  const singlePending = sources.find(source => text(source?.source) === 'single_chapter_governance_recheck' && text(source?.status) === 'pending')
  if (singlePending) {
    return recoveryEvidenceProductionGateNextActionFromSource(singlePending, 'recheck_single_chapter', '复检单章')
  }

  const batchPending = sources.find(source => text(source?.source) === 'safe_batch_recovery_recheck' && text(source?.status) === 'pending')
  if (batchPending) {
    return recoveryEvidenceProductionGateNextActionFromSource(batchPending, 'recheck_safe_batch', '复盘批次')
  }

  const unresolved = sources.find(source => text(source?.status) !== 'cleared')
  if (unresolved) {
    return recoveryEvidenceProductionGateNextActionFromSource(unresolved, 'review_governance_closure', '治理复查台')
  }

  return null
}


export function buildRecoveryEvidenceProductionGate(runRecords: AnyRecord[]) {
  const auditEntry = latestRepairAuditEntry(runRecords)
  const audit = auditEntry?.audit || null
  const closure = audit?.recovery_evidence_closure || audit?.recoveryEvidenceClosure || null
  const tasks = arrayValue(closure?.tasks)
  if (!closure || tasks.length === 0) {
    const detail = '暂无恢复依据来源复检阻断。'
    return {
      signal: signal('恢复依据生产闸门', 'ok', detail),
      snapshot: {
        status: 'ok',
        label: '恢复依据生产闸门',
        detail,
        source_count: 0,
        sources: [],
        next_action: null,
      },
    }
  }

  const groups = new Map<string, {
    source: string
    label: string
    statuses: string[]
    residualEvidence: string[]
    sourceTasks: AnyRecord[]
  }>()
  for (const [taskIndex, task] of tasks.entries()) {
    const meta = recoveryEvidenceSourceMeta(task)
    const status = recoveryEvidenceSourceTaskStatus(task)
    const group = groups.get(meta.source) || { source: meta.source, label: meta.label, statuses: [], residualEvidence: [], sourceTasks: [] }
    group.statuses.push(status.resultStatus)
    group.residualEvidence.push(...status.residualEvidence)
    const sourceTaskIndex = finiteNumberOrNull(task?.task_index ?? task?.taskIndex)
    group.sourceTasks.push({
      ...task,
      source_task_index: sourceTaskIndex ?? taskIndex,
    })
    groups.set(meta.source, group)
  }

  const sourceDetails = Array.from(groups.values()).map(group => {
    const uniqueResiduals = compactUniqueText(group.residualEvidence, 80).slice(0, 2)
    const sourceStatus = group.statuses.includes('blocked')
      ? 'blocked'
      : group.statuses.every(status => status === 'cleared') ? 'cleared' : 'pending'
    if (sourceStatus === 'cleared') return `${group.label}：生产阻断已解除`
    if (sourceStatus === 'pending') return `${group.label}：等待复检结论`
    return `${group.label}：暂缓安全连写${uniqueResiduals.length ? `（${uniqueResiduals.join('；')}）` : ''}`
  })
  const blocked = sourceDetails.some(item => item.includes('暂缓安全连写') || item.includes('等待复检结论'))
  const sources = Array.from(groups.values()).map(group => {
    const residualEvidence = compactUniqueText(group.residualEvidence, 80).slice(0, 3)
    const sourceStatus = group.statuses.includes('blocked')
      ? 'blocked'
      : group.statuses.every(status => status === 'cleared') ? 'cleared' : 'pending'
    const sourceTaskIndices = Array.from(new Set(group.sourceTasks.map(task => finiteNumberOrNull(task?.source_task_index ?? task?.sourceTaskIndex)).filter(item => item !== null)))
    const chapterIds = Array.from(new Set(group.sourceTasks.map(task => finiteNumberOrNull(task?.chapter_id ?? task?.chapterId)).filter(item => item !== null)))
    const chapterNos = Array.from(new Set(group.sourceTasks.map(task => finiteNumberOrNull(task?.chapter_no ?? task?.chapterNo)).filter(item => item !== null)))
    return {
      source: group.source,
      label: group.label,
      status: sourceStatus,
      status_label: recoveryEvidenceProductionStatusLabel(sourceStatus),
      residual_evidence: residualEvidence,
      task_count: group.statuses.length,
      source_task_index: sourceTaskIndices[0] ?? null,
      source_task_indices: sourceTaskIndices,
      chapter_id: chapterIds[0] ?? null,
      chapter_ids: chapterIds,
      chapter_no: chapterNos[0] ?? null,
      chapter_nos: chapterNos,
      source_tasks: group.sourceTasks,
    }
  })
  const nextAction = buildRecoveryEvidenceProductionGateNextAction(sources)

  if (!blocked) {
    const detail = `恢复依据生产闸门：${sourceDetails.join('；')}，可恢复安全连写。`
    return {
      signal: signal('恢复依据生产闸门', 'ok', detail),
      snapshot: {
        status: 'ok',
        label: '恢复依据生产闸门',
        detail,
        source_count: sources.length,
        sources,
        next_action: nextAction,
      },
    }
  }
  const detail = `恢复依据生产闸门：${sourceDetails.join('；')}。先完成回修/复检，再恢复 2-3 章安全连写。`
  return {
    signal: signal('恢复依据生产闸门', 'block', detail),
    snapshot: {
      status: 'block',
      label: '恢复依据生产闸门',
      detail,
      source_count: sources.length,
      sources,
      next_action: nextAction,
    },
  }
}

export function buildGovernanceClosureBrief(args: {
  runRecords: AnyRecord[]
  storylineDecisionGate: AutoCreationStorylineDecisionGate
}): AutoCreationGovernanceClosureBrief {
  const auditEntry = latestRepairAuditEntry(args.runRecords)
  const audit = auditEntry?.audit || null
  const recoveryClosure = audit?.recovery_evidence_closure || audit?.recoveryEvidenceClosure || null
  const recoverySourceSummary = recoveryEvidenceSourceSummary(recoveryClosure)
  const failedEvidence = recoveryClosure && recoveryClosure.status !== 'closed' && Number(recoveryClosure.total || 0) > 0
    ? compactUniqueText([
      ...arrayValue(recoveryClosure.failed_evidence),
      ...arrayValue(recoveryClosure.failedEvidence),
    ], 120).slice(0, 4)
    : []
  const recoveryWatchItems = recoveryClosure && recoveryClosure.status !== 'closed' && Number(recoveryClosure.total || 0) > 0
    ? compactUniqueText([
      ...arrayValue(recoveryClosure.watch_items),
      ...arrayValue(recoveryClosure.watchItems),
    ], 120).slice(0, 4)
    : []
  const issueLabels = [
    failedEvidence.length ? `恢复依据审计 ${Number(recoveryClosure?.resolved || 0)}/${Number(recoveryClosure?.total || 0)}${recoverySourceSummary ? `（${recoverySourceSummary}）` : ''}` : '',
    args.storylineDecisionGate.openCount > 0 ? `剧情线决策 ${args.storylineDecisionGate.openCount}` : '',
  ].filter(Boolean)
  const watchItems = compactUniqueText([
    ...failedEvidence,
    ...recoveryWatchItems,
    ...args.storylineDecisionGate.taskTitles,
  ], 120).slice(0, 6)

  if (!issueLabels.length) {
    return {
      status: 'ok',
      label: '治理闭环',
      summary: '长线治理闭环没有发现需要前置处理的恢复依据审计或剧情线决策任务。',
      count: 0,
      sourceSummary: recoverySourceSummary,
      failedEvidence: [],
      watchItems: [],
      action: opsAction('open_task_center', '打开任务中心', '查看长线治理闭环记录。'),
    }
  }

  return {
    status: 'block',
    label: '治理闭环',
    summary: `${issueLabels.join('；')} 未闭环：${watchItems.slice(0, 3).join('；') || '先回任务中心完成复查或修订。'}`,
    count: issueLabels.length,
    sourceSummary: recoverySourceSummary,
    failedEvidence,
    watchItems,
    action: opsAction('review_governance_closure', '治理复查台', '生成最新恢复依据审计，并打开任务中心定位剧情线决策复检。', false, {
      repairAuditRunId: auditEntry?.run?.id || null,
      recoveryEvidenceStatus: text(recoveryClosure?.status),
      recoveryEvidenceResolved: Number(recoveryClosure?.resolved || 0),
      recoveryEvidenceTotal: Number(recoveryClosure?.total || 0),
      recoveryEvidenceSourceSummary: recoverySourceSummary,
      failedEvidence,
      watchItems: recoveryWatchItems,
      storylineDecisionTaskCount: args.storylineDecisionGate.openCount,
      storylineDecisionTaskTitles: args.storylineDecisionGate.taskTitles.slice(0, 6),
    }),
  }
}

export function governanceMemoryFromAudit(
  audit: AnyRecord | null,
  auditEntry: { run: AnyRecord; audit: AnyRecord } | null,
  storylineDecisionGate: AutoCreationStorylineDecisionGate,
): AutoCreationGovernanceRecheckMemory | null {
  const memory = audit?.governance_recheck_memory || audit?.governanceRecheckMemory || null
  if (!memory) return null
  const rawStatus = text(memory?.status)
  if (!['closed', 'needs_followup'].includes(rawStatus)) return null
  const storylineDecisionTaskCount = Math.max(
    Number(memory?.storyline_decision_task_count ?? memory?.storylineDecisionTaskCount ?? 0),
    storylineDecisionGate.openCount,
  )
  const status: AutoCreationGovernanceRecheckMemoryStatus = rawStatus === 'closed' && storylineDecisionTaskCount === 0
    ? 'closed'
    : 'needs_followup'
  const evidence = compactUniqueText([
    ...arrayValue(memory?.evidence),
    ...arrayValue(memory?.repaired_evidence),
    ...arrayValue(memory?.repairedEvidence),
  ], 120).slice(0, 5)
  const failedEvidence = compactUniqueText([
    ...arrayValue(memory?.failed_evidence),
    ...arrayValue(memory?.failedEvidence),
  ], 120).slice(0, 5)
  const watchItems = compactUniqueText([
    ...arrayValue(memory?.watch_items),
    ...arrayValue(memory?.watchItems),
    ...storylineDecisionGate.taskTitles,
  ], 120).slice(0, 6)
  const sourceRunId = memory?.source_run_id ?? memory?.sourceRunId ?? auditEntry?.run?.id ?? null

  if (status === 'closed') {
    return {
      visible: true,
      status,
      label: text(memory?.label, '治理复查已记录'),
      summary: text(memory?.summary, '恢复依据审计已闭环，今日生产可沿用上一轮复查证据。'),
      evidence,
      failedEvidence,
      watchItems,
      storylineDecisionTaskCount: 0,
      sourceRunId,
      action: opsAction('open_task_center', '查看治理记录', '打开任务中心查看恢复依据审计和复查证据。'),
    }
  }

  return {
    visible: true,
    status,
    label: text(memory?.label, '治理复查待处理'),
    summary: text(memory?.summary, '仍有治理复查记忆需要处理或观察。'),
    evidence,
    failedEvidence,
    watchItems,
    storylineDecisionTaskCount,
    sourceRunId,
    action: opsAction('review_governance_closure', '治理复查台', '刷新恢复依据审计，并打开任务中心定位剧情线决策复检。', false, {
      repairAuditRunId: sourceRunId,
      recoveryEvidenceStatus: rawStatus,
      failedEvidence,
      watchItems,
      storylineDecisionTaskCount,
      storylineDecisionTaskTitles: storylineDecisionGate.taskTitles.slice(0, 6),
    }),
  }
}

export function buildGovernanceRecheckMemory(args: {
  runRecords: AnyRecord[]
  storylineDecisionGate: AutoCreationStorylineDecisionGate
}): AutoCreationGovernanceRecheckMemory {
  const auditEntry = latestRepairAuditEntry(args.runRecords)
  const audit = auditEntry?.audit || null
  const explicitMemory = governanceMemoryFromAudit(audit, auditEntry, args.storylineDecisionGate)
  if (explicitMemory) return explicitMemory
  const recoveryClosure = audit?.recovery_evidence_closure || audit?.recoveryEvidenceClosure || null
  const total = Number(recoveryClosure?.total || 0)
  const resolved = Number(recoveryClosure?.resolved || 0)
  const repairedEvidence = compactUniqueText([
    ...arrayValue(recoveryClosure?.repaired_evidence),
    ...arrayValue(recoveryClosure?.repairedEvidence),
  ], 120).slice(0, 5)
  const failedEvidence = compactUniqueText([
    ...arrayValue(recoveryClosure?.failed_evidence),
    ...arrayValue(recoveryClosure?.failedEvidence),
  ], 120).slice(0, 5)
  const watchItems = compactUniqueText([
    ...arrayValue(recoveryClosure?.watch_items),
    ...arrayValue(recoveryClosure?.watchItems),
    ...args.storylineDecisionGate.taskTitles,
  ], 120).slice(0, 6)
  const closed = Boolean(recoveryClosure && text(recoveryClosure.status) === 'closed' && total > 0 && args.storylineDecisionGate.openCount === 0)
  const needsFollowup = Boolean((recoveryClosure && text(recoveryClosure.status) !== 'closed' && total > 0) || args.storylineDecisionGate.openCount > 0)

  if (!closed && !needsFollowup) {
    return {
      visible: false,
      status: 'empty',
      label: '治理复查',
      summary: '还没有可沉淀的治理复查记录。',
      evidence: [],
      failedEvidence: [],
      watchItems: [],
      storylineDecisionTaskCount: 0,
      sourceRunId: null,
      action: opsAction('open_task_center', '打开任务中心', '查看长线治理闭环记录。'),
    }
  }

  if (closed) {
    return {
      visible: true,
      status: 'closed',
      label: '治理复查已记录',
      summary: `恢复依据闭环 ${resolved}/${total}，剧情线决策无未关闭项；今日生产可沿用上一轮复查证据。`,
      evidence: repairedEvidence,
      failedEvidence,
      watchItems,
      storylineDecisionTaskCount: 0,
      sourceRunId: auditEntry?.run?.id || null,
      action: opsAction('open_task_center', '查看治理记录', '打开任务中心查看恢复依据审计和复查证据。'),
    }
  }

  return {
    visible: true,
    status: 'needs_followup',
    label: '治理复查待处理',
    summary: [
      total > 0 ? `恢复依据审计 ${resolved}/${total}` : '',
      args.storylineDecisionGate.openCount > 0 ? `剧情线决策 ${args.storylineDecisionGate.openCount}` : '',
    ].filter(Boolean).join('；') || '仍有治理闭环任务需要复查。',
    evidence: repairedEvidence,
    failedEvidence,
    watchItems,
    storylineDecisionTaskCount: args.storylineDecisionGate.openCount,
    sourceRunId: auditEntry?.run?.id || null,
    action: opsAction('review_governance_closure', '治理复查台', '刷新恢复依据审计，并打开任务中心定位剧情线决策复检。', false, {
      repairAuditRunId: auditEntry?.run?.id || null,
      recoveryEvidenceStatus: text(recoveryClosure?.status),
      recoveryEvidenceResolved: resolved,
      recoveryEvidenceTotal: total,
      failedEvidence,
      watchItems,
      storylineDecisionTaskCount: args.storylineDecisionGate.openCount,
      storylineDecisionTaskTitles: args.storylineDecisionGate.taskTitles.slice(0, 6),
    }),
  }
}


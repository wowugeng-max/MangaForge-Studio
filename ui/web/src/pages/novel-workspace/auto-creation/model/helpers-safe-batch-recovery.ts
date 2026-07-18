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
  opsAction,
  planningAction,
  text,
  writingAction,
} from './helpers-basics'
import {
  parsePayload,
  recordTime,
  hasDeliveredProse,
  latestReviewForChapter,
  findChapter,
  numberValue,
  recoveryEvidenceEventTime,
  buildResolvedBatchRiskIssueKeys,
  clampScore,
  batchRiskLabels,
  signal,
  DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS,
  compactChapterNoEvidence,
  normalizeDefaultFiveChapterLaneTemplateProductionRelapseReview,
  boolValue,
  reviewPayload,
  coreRiskCount,
  payoffDebtCount,
  expectationRiskCount,
  retentionRiskCount,
  recoveryEvidenceReview,
  finiteNumberOrNull,
  recoveryEvidenceGovernanceQueueExecutionMeta,
  isResolvedTaskStatus,
  isCompletedRepairRun,
  batchRiskIssueResolved,
  recoveryEvidenceReleaseSummaryFromPreflight,
  emptyStrengthenedRepairAcceptanceTrend,
} from './helpers-main'

export function buildSafeBatchRecoveryRestoreConfirmation(policy: AnyRecord | null | undefined) {
  if (!policy?.visible || text(policy.status) !== 'expanded') return null
  const targetChapterCount = Number(policy.targetChapterCount ?? policy.target_chapter_count ?? 0)
  if (targetChapterCount < 5) return null
  const feedback = policy.expansionFeedback || policy.expansion_feedback || null
  const validation = feedback?.expansionStructureValidationResult
    || feedback?.expansion_structure_validation_result
    || null
  if (!validation || text(validation.status) !== 'ok') return null
  const riskCount = Number(validation.risk_count ?? validation.riskCount ?? feedback?.risk_count ?? feedback?.riskCount ?? 0)
  if (riskCount > 0) return null
  const validationChapterNos = Array.from(new Set([
    ...arrayValue(validation.validation_chapter_nos),
    ...arrayValue(validation.validationChapterNos),
    ...arrayValue(feedback?.latest_chapter_nos),
    ...arrayValue(feedback?.latestChapterNos),
  ].map(chapterNo => Number(chapterNo)).filter(chapterNo => chapterNo > 0)))
  if (!validationChapterNos.length) return null
  const chapterEvidence = compactChapterNoEvidence(validationChapterNos)
  const validationSummary = text(validation.summary)
  const defaultFiveChapterRecoveryVerdict = validation.default_five_chapter_recovery_verdict
    || validation.defaultFiveChapterRecoveryVerdict
    || null
  return {
    status: 'ready',
    label: '确认恢复5章扩批',
    summary: `3章验证批已通过：${chapterEvidence}核心守恒、显性回报和章末追读稳定，可确认恢复 ${targetChapterCount} 章扩批。`,
    validation_chapter_nos: validationChapterNos,
    target_chapter_count: targetChapterCount,
    risk_count: riskCount,
    source: 'safe_batch_recovery_validation_result',
    evidence: [
      validationSummary,
      text(defaultFiveChapterRecoveryVerdict?.summary),
    ].filter(Boolean),
    ...(defaultFiveChapterRecoveryVerdict ? {
      default_five_chapter_recovery_verdict: defaultFiveChapterRecoveryVerdict,
    } : {}),
  }
}

export function safeBatchRecoveryFocusPayload(focusLike: AnyRecord | null | undefined) {
  if (!focusLike) return null
  return {
    layerKey: text(focusLike.layer_key || focusLike.layerKey),
    layerLabel: text(focusLike.layer_label || focusLike.layerLabel),
    actionLabel: text(focusLike.action_label || focusLike.actionLabel),
    targetView: text(focusLike.target_view || focusLike.targetView),
    issueType: text(focusLike.issue_type || focusLike.issueType),
    source: text(focusLike.source),
    taskStatuses: arrayValue(focusLike.task_statuses || focusLike.taskStatuses).map(item => text(item)).filter(Boolean),
    taskCenterFilterLabel: text(focusLike.task_center_filter_label || focusLike.taskCenterFilterLabel),
    requirementKey: text(focusLike.requirement_key || focusLike.requirementKey),
    templateVersionId: text(focusLike.template_version_id || focusLike.templateVersionId),
  }
}

export function safeBatchRecoveryRoadmapRecommendedAction(roadmapLike: AnyRecord | null | undefined) {
  const roadmap = roadmapLike || null
  const focus = safeBatchRecoveryFocusPayload(roadmap?.recommended_focus || roadmap?.recommendedFocus)
  const nextLayer = roadmap?.next_repair_layer || roadmap?.nextRepairLayer || null
  if (!focus || !focus.layerKey || text(nextLayer?.status) !== 'warn') return null
  const label = focus.actionLabel || text(nextLayer?.action_label || nextLayer?.actionLabel || nextLayer?.label, '查看安全连写路线')
  const detail = text(nextLayer?.detail, text(roadmap?.current_reason || roadmap?.currentReason, '任务中心会定位到安全连写恢复路线图指出的下一层。'))
  return opsAction('open_task_center', label, detail, false, {
    source: 'safe_batch_recovery_roadmap',
    safeBatchRecoveryFocus: focus,
  })
}

export function safeBatchExpansionPolicySnapshot(policy: AnyRecord) {
  return {
    status: text(policy?.status, 'observing'),
    label: text(policy?.label, '强化扩批规则'),
    summary: text(policy?.summary),
    target_chapter_count: Number(policy?.targetChapterCount || 0),
    base_chapter_count: Number(policy?.baseChapterCount || 0),
    expanded_chapter_count: Number(policy?.expandedChapterCount || 0),
    required_pass_streak: Number(policy?.requiredPassStreak || 0),
    pass_streak: Number(policy?.passStreak || 0),
    accepted_batch_count: Number(policy?.acceptedBatchCount || 0),
    failed_batch_count: Number(policy?.failedBatchCount || 0),
    latest_status: text(policy?.latestStatus, 'none'),
    ...(policy?.expansionFeedback ? { expansion_feedback: policy.expansionFeedback } : {}),
    ...(policy?.recoveryRoadmap ? { safe_batch_recovery_roadmap: policy.recoveryRoadmap } : {}),
  }
}

export function safeBatchExpansionPolicyFromPreflight(preflight: AnyRecord | null | undefined) {
  const policy = preflight?.safe_batch_expansion_policy || preflight?.safeBatchExpansionPolicy || null
  const targetChapterCount = Number(policy?.target_chapter_count ?? policy?.targetChapterCount ?? 0)
  if (!policy || text(policy?.status) !== 'expanded' || targetChapterCount < 5) return null
  return {
    status: 'expanded',
    targetChapterCount,
    baseChapterCount: Number(policy?.base_chapter_count ?? policy?.baseChapterCount ?? 3),
    expandedChapterCount: Number(policy?.expanded_chapter_count ?? policy?.expandedChapterCount ?? targetChapterCount),
    requiredPassStreak: Number(policy?.required_pass_streak ?? policy?.requiredPassStreak ?? 3),
    passStreak: Number(policy?.pass_streak ?? policy?.passStreak ?? 0),
    summary: text(policy?.summary, '强化恢复验收趋势允许本批扩批。'),
  }
}

export function safeBatchExpansionSegmentKey(index: number, total: number) {
  const frontEnd = Math.max(1, Math.ceil(total * 0.4))
  const middleEnd = Math.max(frontEnd + 1, Math.ceil(total * 0.8))
  if (index < frontEnd) return { key: 'front', label: '前段' }
  if (index < middleEnd) return { key: 'middle', label: '中段' }
  return { key: 'ending', label: '后段' }
}

export function safeBatchExpansionRollbackPolicy(args: {
  riskCount: number
  coreRiskCount: number
  hotspotLabel: string
}) {
  const rollbackToSingle = args.coreRiskCount >= 2 || args.riskCount >= 5
  const targetChapterCount = rollbackToSingle ? 1 : 3
  return {
    mode: rollbackToSingle ? 'rollback_to_single_chapter' : 'rollback_to_small_batch',
    targetChapterCount,
    label: rollbackToSingle ? '回到单章治理' : '回退到 2-3 章',
    summary: rollbackToSingle
      ? `${args.hotspotLabel || '扩批批次'}核心风险过高，下一轮回到单章治理，先逐章修复核心守恒、读者回报和追读拉力。`
      : `${args.hotspotLabel || '扩批批次'}出现扩批热区，下一轮回退到 2-3 章安全连写，确认核心/回报/追读稳定后再扩到 5 章。`,
  }
}

export function safeBatchExpansionSegmentReviewSnapshot(review: AnyRecord) {
  return {
    visible: Boolean(review?.visible),
    status: text(review?.status, 'ok'),
    label: text(review?.label, '扩批分段复盘'),
    summary: text(review?.summary),
    target_chapter_count: Number(review?.targetChapterCount || 0),
    actual_chapter_count: Number(review?.actualChapterCount || 0),
    risk_count: Number(review?.riskCount || 0),
    segments: arrayValue(review?.segments).map(segment => ({
      key: text(segment?.key),
      label: text(segment?.label),
      chapter_nos: arrayValue(segment?.chapterNos),
      risk_count: Number(segment?.riskCount || 0),
      core_risk_count: Number(segment?.coreRiskCount || 0),
      payoff_debt_count: Number(segment?.payoffDebtCount || 0),
      reader_pull_risk_count: Number(segment?.readerPullRiskCount || 0),
      summary: text(segment?.summary),
    })),
    hotspots: arrayValue(review?.hotspots).map(segment => ({
      key: text(segment?.key),
      label: text(segment?.label),
      chapter_nos: arrayValue(segment?.chapterNos),
      risk_count: Number(segment?.riskCount || 0),
      core_risk_count: Number(segment?.coreRiskCount || 0),
      payoff_debt_count: Number(segment?.payoffDebtCount || 0),
      reader_pull_risk_count: Number(segment?.readerPullRiskCount || 0),
      summary: text(segment?.summary),
    })),
    rollback_policy: {
      mode: text(review?.rollbackPolicy?.mode),
      target_chapter_count: Number(review?.rollbackPolicy?.targetChapterCount || 0),
      label: text(review?.rollbackPolicy?.label),
      summary: text(review?.rollbackPolicy?.summary),
    },
  }
}

export function safeBatchExpansionRepeatedHotspotSegment(feedback?: AnyRecord | null) {
  const segment = feedback?.repeatedHotspotSegment || feedback?.repeated_hotspot_segment || null
  const count = Number(segment?.count || 0)
  if (!segment || count < 2) return null
  const key = text(segment?.key)
  const label = text(segment?.label, key || '复发段位')
  return {
    key,
    label,
    count,
    summary: text(segment?.summary),
    source: text(segment?.source),
  }
}

export function buildSafeBatchExpansionStructureReview(args: {
  segmentReview?: AnyRecord | null
  expansionFeedback?: AnyRecord | null
}) {
  const defaultFiveChapterRegression = args.expansionFeedback?.defaultFiveChapterRegression
    || args.expansionFeedback?.default_five_chapter_regression
    || null
  const defaultFiveChapterRecoveryVerdictRelapse = args.expansionFeedback?.defaultFiveChapterRecoveryVerdictRelapse
    || args.expansionFeedback?.default_five_chapter_recovery_verdict_relapse
    || defaultFiveChapterRegression?.default_five_chapter_recovery_verdict_relapse
    || defaultFiveChapterRegression?.defaultFiveChapterRecoveryVerdictRelapse
    || null
  const defaultRegressionSegment = defaultFiveChapterRegression?.repeated_hotspot_segment
    || defaultFiveChapterRegression?.repeatedHotspotSegment
    || null
  const repeated = safeBatchExpansionRepeatedHotspotSegment(args.expansionFeedback)
    || (defaultFiveChapterRegression?.visible !== false && defaultRegressionSegment ? {
      key: text(defaultRegressionSegment?.key),
      label: text(defaultRegressionSegment?.label, text(defaultRegressionSegment?.key, '复发段位')),
      count: Math.max(1, Number(defaultRegressionSegment?.count || 1)),
      summary: text(defaultRegressionSegment?.summary || defaultFiveChapterRegression?.summary),
      source: 'default_five_chapter_lane',
    } : null)
  const segmentReview = args.segmentReview
  const hotspots = arrayValue(segmentReview?.hotspots)
  const hotspot = repeated
    ? hotspots.find(item => text(item?.key) === repeated.key) || hotspots[0] || null
    : null
  const affectedChapterNos = arrayValue(hotspot?.chapterNos || hotspot?.chapter_nos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const latestChapterNos = arrayValue(args.expansionFeedback?.latestChapterNos || args.expansionFeedback?.latest_chapter_nos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  if (!repeated || !segmentReview?.visible || Number(segmentReview?.riskCount || segmentReview?.risk_count || 0) <= 0) {
    return {
      visible: false,
      status: 'ok',
      label: '扩批结构修复',
      summary: '扩批结构暂未触发复发治理。',
      repeated_hotspot_segment: null,
      latest_chapter_nos: latestChapterNos,
      affected_chapter_nos: [],
      hotspot_summaries: [],
      structure_actions: [],
      rollback_policy: null,
    }
  }
  const hotspotSummaries = hotspots
    .filter(item => !repeated.key || text(item?.key) === repeated.key)
    .map(item => text(item?.summary))
    .filter(Boolean)
  const segmentLabel = repeated.label || text(hotspot?.label, '复发段位')
  const rollbackPolicy = segmentReview?.rollbackPolicy || segmentReview?.rollback_policy || null
  const defaultRegressionVisible = Boolean(defaultFiveChapterRegression && defaultFiveChapterRegression.visible !== false)
  const defaultRecoveryVerdictRelapseVisible = Boolean(defaultFiveChapterRecoveryVerdictRelapse && defaultFiveChapterRecoveryVerdictRelapse.visible !== false)
  const defaultLaneTemplateProductionRelapseQueue = buildDefaultFiveChapterLaneTemplateProductionRelapseQueue(defaultFiveChapterRegression)
  return {
    visible: true,
    status: 'warn',
    label: '扩批结构修复',
    summary: defaultRecoveryVerdictRelapseVisible
      ? `${text(defaultFiveChapterRecoveryVerdictRelapse.summary, `恢复判定失效：${segmentLabel}复发。`)} 先回到扩批结构修复层，再用3章验证批重新证明默认档位可以恢复。`
      : defaultRegressionVisible
      ? `${text(defaultFiveChapterRegression.summary, `默认5章档位在${segmentLabel}复发。`)} 先回到扩批结构修复层，再用3章验证批证明默认档位可以恢复。`
      : `${segmentLabel}连续 ${repeated.count} 次成为5章扩批热区，先做固定段落治理和批次结构改写，再恢复5章连写。`,
    repeated_hotspot_segment: repeated,
    latest_chapter_nos: latestChapterNos,
    affected_chapter_nos: affectedChapterNos,
    hotspot_summaries: hotspotSummaries.length ? hotspotSummaries : [text(hotspot?.summary, repeated.summary)].filter(Boolean),
    structure_actions: [
      defaultRecoveryVerdictRelapseVisible
        ? `恢复判定失效：${text(defaultFiveChapterRecoveryVerdictRelapse.summary)} 下一轮回到3章验证批。`
        : '',
      defaultRegressionVisible
        ? `默认档位回退：先把${segmentLabel}失效原因写入任务书，下一轮回到3章验证批。`
        : '',
      defaultLaneTemplateProductionRelapseQueue
        ? `当前模板版本生产复发：${text(defaultLaneTemplateProductionRelapseQueue.summary)}`
        : '',
      `重写${segmentLabel}固定职责：每批${segmentLabel}必须完成主线转折、显性回报和章末追读，不能只铺垫或转场。`,
      '批次节奏重排：前段抛压，中段兑现并升级，后段留钩；下一次5章前先用2-3章验证。',
      '把复发段位写入下一批任务书，明确每章承担的冲突来源、回报兑现和章末翻页问题。',
    ].filter(Boolean),
    ...(defaultRegressionVisible ? { default_five_chapter_regression: defaultFiveChapterRegression } : {}),
    ...(defaultRecoveryVerdictRelapseVisible ? { default_five_chapter_recovery_verdict_relapse: defaultFiveChapterRecoveryVerdictRelapse } : {}),
    ...(defaultLaneTemplateProductionRelapseQueue ? {
      default_five_chapter_lane_template_redesign_queue: defaultLaneTemplateProductionRelapseQueue,
    } : {}),
    rollback_policy: rollbackPolicy ? {
      mode: text(rollbackPolicy?.mode),
      target_chapter_count: Number(rollbackPolicy?.targetChapterCount ?? rollbackPolicy?.target_chapter_count ?? 0),
      label: text(rollbackPolicy?.label),
      summary: text(rollbackPolicy?.summary),
    } : null,
  }
}

export function safeBatchExpansionStructureVerificationFromPreflight(preflight?: AnyRecord | null) {
  return preflight?.safe_batch_expansion_structure_verification
    || preflight?.safeBatchExpansionStructureVerification
    || preflight?.next_batch_brief?.expansionStructureVerification
    || preflight?.next_batch_brief?.expansion_structure_verification
    || preflight?.nextBatchBrief?.expansionStructureVerification
    || preflight?.nextBatchBrief?.expansion_structure_verification
    || null
}

export function safeBatchDefaultRecoveryRiskCountForReason(reason: string, counts: {
  riskCount: number
  coreRiskCount: number
  payoffDebtCount: number
  readerPullRiskCount: number
}) {
  const reasonText = text(reason)
  if (reasonText.includes('核心')) return counts.coreRiskCount
  if (reasonText.includes('回报')) return counts.payoffDebtCount
  if (reasonText.includes('追读') || reasonText.includes('拉力')) return counts.readerPullRiskCount
  return counts.riskCount
}

export function normalizeDefaultFiveChapterLaneTemplateVersion(template: AnyRecord | null | undefined) {
  if (!template || template.visible === false) return null
  const redesignedTemplates = arrayValue(template.redesigned_templates || template.redesignedTemplates)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.name || item?.key, '模板项'),
      template: firstText(item?.template, item?.rewrite, item?.instruction, item?.text, item?.detail),
    }))
    .filter((item: AnyRecord) => item.key || item.label || item.template)
  const validationStandard = arrayValue(template.validation_standard || template.validationStandard)
    .map(item => text(item))
    .filter(Boolean)
  const requiredReceipts = arrayValue(template.required_receipts || template.requiredReceipts || template.receipts)
    .map(item => text(item))
    .filter(Boolean)
  const productionRelapseReview = template.production_relapse_review || template.productionRelapseReview || null
  const explicitId = firstText(
    template.template_version_id,
    template.templateVersionId,
    template.version_id,
    template.versionId,
    template.id,
    productionRelapseReview?.template_version_id,
    productionRelapseReview?.templateVersionId,
  )
  const source = firstText(template.source, 'default_five_chapter_lane_template')
  const sourceRunId = template.source_run_id ?? template.sourceRunId ?? null
  const id = explicitId || (sourceRunId !== null && sourceRunId !== undefined && text(sourceRunId) ? `${source}:${sourceRunId}` : '')
  const redesignSource = firstText(template.redesign_source, template.redesignSource)
  const hasVersionEvidence = Boolean(
    id
    || redesignSource
    || redesignedTemplates.length
    || validationStandard.length
    || requiredReceipts.length,
  )
  if (!hasVersionEvidence) return null
  return {
    id: id || source,
    label: text(template.label, '默认5章档位模板'),
    source,
    redesign_source: redesignSource,
    source_run_id: sourceRunId,
    repaired_at: text(template.repaired_at || template.repairedAt),
    summary: text(template.summary),
    redesigned_templates: redesignedTemplates,
    validation_standard: validationStandard,
    required_receipts: requiredReceipts,
  }
}

export function buildDefaultFiveChapterRecoveryVerdict(args: {
  verification: AnyRecord
  validationChapterNos: number[]
  riskCount: number
  coreRiskCount: number
  payoffDebtCount: number
  readerPullRiskCount: number
}) {
  const regression = args.verification?.default_five_chapter_regression
    || args.verification?.defaultFiveChapterRegression
    || null
  if (!regression || regression.visible === false) return null
  const failureReasons = arrayValue(regression.failure_reasons || regression.failureReasons)
    .map(item => text(item))
    .filter(Boolean)
  if (!failureReasons.length) return null
  const reasonStatuses = failureReasons.map(reason => {
    const riskCount = safeBatchDefaultRecoveryRiskCountForReason(reason, args)
    return {
      reason,
      status: riskCount > 0 ? 'remaining' : 'cleared',
      risk_count: riskCount,
    }
  })
  const clearedFailureReasons = reasonStatuses
    .filter(item => item.status === 'cleared')
    .map(item => item.reason)
  const remainingFailureReasons = reasonStatuses
    .filter(item => item.status === 'remaining')
    .map(item => item.reason)
  const defaultBatchChapterNos = arrayValue(regression.default_batch_chapter_nos || regression.defaultBatchChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const restoreChapterNos = arrayValue(regression.restore_chapter_nos || regression.restoreChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const previousValidationChapterNos = arrayValue(regression.validation_chapter_nos || regression.validationChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const status = remainingFailureReasons.length ? 'failed' : 'passed'
  const summary = status === 'passed'
    ? `默认档位恢复判定：${clearedFailureReasons.join('、')}已清零，${compactChapterNoEvidence(args.validationChapterNos)}可作为默认5章档位恢复证据。`
    : `默认档位恢复判定：${remainingFailureReasons.join('、')}仍未清零，${compactChapterNoEvidence(args.validationChapterNos)}不能恢复默认5章档位。`

  return {
    visible: true,
    status,
    label: '默认档位恢复判定',
    summary,
    default_batch_chapter_nos: defaultBatchChapterNos,
    restore_chapter_nos: restoreChapterNos,
    previous_validation_chapter_nos: previousValidationChapterNos,
    validation_chapter_nos: args.validationChapterNos,
    failure_reasons: failureReasons,
    cleared_failure_reasons: clearedFailureReasons,
    remaining_failure_reasons: remainingFailureReasons,
    failure_reason_statuses: reasonStatuses,
  }
}

export function buildDefaultFiveChapterLaneTemplateVerdict(args: {
  verification: AnyRecord
  validationChapterNos: number[]
  chapters: AnyRecord[]
  riskCount?: number
  coreRiskCount?: number
  payoffDebtCount?: number
  readerPullRiskCount?: number
}) {
  const template = args.verification?.default_five_chapter_lane_template
    || args.verification?.defaultFiveChapterLaneTemplate
    || null
  if (!template || template.visible === false) return null
  const templateVersion = normalizeDefaultFiveChapterLaneTemplateVersion(template)
  const templateRequirements = arrayValue(template.requirements)
  const labelForKey = (key: string, fallback: string) => text(
    templateRequirements.find((item: AnyRecord) => text(item?.key) === key)?.label,
    fallback,
  )
  const requirements = DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => ({
    key: requirement.key,
    label: labelForKey(requirement.key, requirement.label),
  }))
  const missingRequirements = requirements
    .map(requirement => {
      const missingChapterNos = args.validationChapterNos.filter(chapterNo => {
        const chapter = findChapter(args.chapters, { chapterNo })
        const receipts = chapterExpansionStructureDecisionReceipts(chapter)
        return expansionStructureDecisionRequirementDelivered({
          key: requirement.key,
          payload: {},
          receipts,
        }) !== true
      })
      return missingChapterNos.length
        ? {
          ...requirement,
          chapter_nos: missingChapterNos,
        }
        : null
    })
    .filter(Boolean)
  const missingCount = missingRequirements.reduce((sum: number, item: AnyRecord) => sum + arrayValue(item?.chapter_nos).length, 0)
  const missingSummary = missingRequirements
    .map((item: AnyRecord) => `${compactChapterNoEvidence(arrayValue(item.chapter_nos).map((chapterNo: any) => Number(chapterNo)).filter(Boolean))}缺${item.label}`)
    .join('；')
  const productionRelapseVerdict = buildDefaultFiveChapterLaneTemplateProductionRelapseVerdict({
    template,
    validationChapterNos: args.validationChapterNos,
    riskCount: Number(args.riskCount || 0),
    coreRiskCount: Number(args.coreRiskCount || 0),
    payoffDebtCount: Number(args.payoffDebtCount || 0),
    readerPullRiskCount: Number(args.readerPullRiskCount || 0),
  })
  const productionFailedCount = Number(productionRelapseVerdict?.failed_count || 0)
  const productionFailedRequirements = arrayValue(productionRelapseVerdict?.failed_requirements)
  const productionSummary = productionRelapseVerdict
    ? productionRelapseVerdict.status === 'failed'
      ? `生产后验仍复发：${arrayValue(productionRelapseVerdict.remaining_failure_reasons).join('、')}。`
      : `生产后验已修复：${arrayValue(productionRelapseVerdict.cleared_failure_reasons).join('、')}已清零。`
    : ''
  const status = missingCount > 0 || productionFailedCount > 0 ? 'failed' : 'passed'
  const passedSummary = [
    `默认档位模板回检通过：${templateVersion?.id ? `版本 ${templateVersion.id} ` : ''}${compactChapterNoEvidence(args.validationChapterNos)}已逐章继承段位职责、冲突轮换、回报密度和章末追读模板。`,
    productionSummary,
  ].filter(Boolean).join(' ')
  const failedSummaryParts = [
    missingSummary,
    productionRelapseVerdict?.status === 'failed' ? productionSummary : '',
  ].filter(Boolean)
  return {
    visible: true,
    status,
    label: '默认档位模板回检',
    summary: status === 'passed'
      ? passedSummary
      : `默认档位模板回检未通过：${templateVersion?.id ? `版本 ${templateVersion.id} ` : ''}${failedSummaryParts.join('；')}，不能恢复默认5章档位。`,
    validation_chapter_nos: args.validationChapterNos,
    ...(templateVersion ? { template_version: templateVersion } : {}),
    requirements: requirements.map(requirement => ({
      ...requirement,
      status: missingRequirements.some((item: AnyRecord) => item.key === requirement.key) ? 'missing' : 'fulfilled',
    })),
    missing_count: missingCount,
    missing_requirements: missingRequirements,
    ...(productionRelapseVerdict ? {
      production_failed_count: productionFailedCount,
      production_relapse_verdict: productionRelapseVerdict,
      production_failed_requirements: productionFailedRequirements,
    } : {}),
  }
}

export function buildDefaultFiveChapterLaneTemplateProductionRelapseVerdict(args: {
  template: AnyRecord
  validationChapterNos: number[]
  riskCount: number
  coreRiskCount: number
  payoffDebtCount: number
  readerPullRiskCount: number
}) {
  const review = normalizeDefaultFiveChapterLaneTemplateProductionRelapseReview(args.template)
  if (!review) return null
  const failureReasons = arrayValue(review.failure_reasons || review.failureReasons)
    .map(item => text(item))
    .filter(Boolean)
  const failedRequirements = arrayValue(review.failed_requirements || review.failedRequirements)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.key, '模板要求'),
      failure_reason: text(item?.failure_reason || item?.failureReason),
      failed_count: Number(item?.failed_count ?? item?.failedCount ?? 1),
      chapter_nos: arrayValue(item?.chapter_nos || item?.chapterNos).length
        ? arrayValue(item?.chapter_nos || item?.chapterNos)
          .map((chapterNo: any) => Number(chapterNo))
          .filter((chapterNo: number) => chapterNo > 0)
        : args.validationChapterNos,
    }))
    .filter((item: AnyRecord) => item.key || item.label || item.failure_reason)
  const reasonStatuses = failureReasons.map(reason => {
    const riskCount = safeBatchDefaultRecoveryRiskCountForReason(reason, args)
    return {
      reason,
      status: riskCount > 0 ? 'remaining' : 'cleared',
      risk_count: riskCount,
    }
  })
  const remainingFailureReasons = reasonStatuses
    .filter(item => item.status === 'remaining')
    .map(item => item.reason)
  const clearedFailureReasons = reasonStatuses
    .filter(item => item.status === 'cleared')
    .map(item => item.reason)
  const remainingFailedRequirements = failedRequirements
    .filter((item: AnyRecord) => {
      const reason = text(item.failure_reason)
      return !reason || remainingFailureReasons.includes(reason)
    })
  const status = remainingFailureReasons.length ? 'failed' : 'passed'
  const templateVersionId = firstText(
    review.template_version_id,
    review.templateVersionId,
    args.template?.template_version_id,
    args.template?.templateVersionId,
    args.template?.template_version?.id,
    args.template?.templateVersion?.id,
  )
  return {
    visible: true,
    status,
    label: '默认档位模板生产后验判定',
    template_version_id: templateVersionId,
    default_batch_chapter_nos: arrayValue(review.default_batch_chapter_nos || review.defaultBatchChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
    restore_chapter_nos: arrayValue(review.restore_chapter_nos || review.restoreChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
    previous_validation_chapter_nos: arrayValue(review.validation_chapter_nos || review.validationChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
    validation_chapter_nos: args.validationChapterNos,
    failure_reasons: failureReasons,
    cleared_failure_reasons: clearedFailureReasons,
    remaining_failure_reasons: remainingFailureReasons,
    failure_reason_statuses: reasonStatuses,
    failed_count: remainingFailedRequirements.length,
    failed_requirements: remainingFailedRequirements,
    summary: status === 'passed'
      ? `默认档位模板生产后验已修复：${clearedFailureReasons.join('、') || '真实生产失败维度'}已清零，${compactChapterNoEvidence(args.validationChapterNos)}可作为版本级验证证据。`
      : `默认档位模板生产后验仍复发：${remainingFailureReasons.join('、')}未清零，${compactChapterNoEvidence(args.validationChapterNos)}不能作为当前模板版本恢复证据。`,
  }
}

export function defaultFiveChapterLaneTemplateRepairAction(requirement: AnyRecord) {
  const label = text(requirement?.label || requirement?.key, '模板缺项')
  const chapterText = compactChapterNoEvidence(
    arrayValue(requirement?.chapter_nos || requirement?.chapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
  )
  const key = text(requirement?.key)
  if (key === 'default_lane_segment_duty') return `段位职责修复：${chapterText}必须明确本章在默认5章档位里的前段/中段/后段职责，不能只写单章事件。`
  if (key === 'default_lane_conflict_rotation') return `冲突轮换修复：${chapterText}必须换掉重复冲突来源，写清本章使用规则压迫、人物对抗或信息误导中的哪一类。`
  if (key === 'default_lane_payoff_density') return `回报密度修复：${chapterText}必须补出显性回报，至少让读者看到一个可感知收益、反制结果或阶段结算。`
  if (key === 'default_lane_ending_hook_template') return `章末追读模板修复：${chapterText}最后300字必须落触发事件、读者问题和下一章风险。`
  return `${label}修复：${chapterText}必须补成正文可见模板回执。`
}

export function buildDefaultFiveChapterLaneTemplateRepair(verdict?: AnyRecord | null) {
  if (!verdict || verdict.visible === false) return null
  const missingRequirements = arrayValue(verdict.missing_requirements || verdict.missingRequirements)
    .map((item: AnyRecord) => {
      const chapterNos = arrayValue(item?.chapter_nos || item?.chapterNos)
        .map((chapterNo: any) => Number(chapterNo))
        .filter((chapterNo: number) => chapterNo > 0)
      return {
        key: text(item?.key),
        label: text(item?.label || item?.key, '模板缺项'),
        chapter_nos: chapterNos,
      }
    })
    .filter((item: AnyRecord) => item.key || item.label || item.chapter_nos.length)
  const productionRelapseVerdict = verdict.production_relapse_verdict
    || verdict.productionRelapseVerdict
    || null
  const productionFailedRequirements = arrayValue(verdict.production_failed_requirements || verdict.productionFailedRequirements || productionRelapseVerdict?.failed_requirements || productionRelapseVerdict?.failedRequirements)
    .map((item: AnyRecord) => {
      const chapterNos = arrayValue(item?.chapter_nos || item?.chapterNos).length
        ? arrayValue(item?.chapter_nos || item?.chapterNos)
          .map((chapterNo: any) => Number(chapterNo))
          .filter((chapterNo: number) => chapterNo > 0)
        : arrayValue(verdict.validation_chapter_nos || verdict.validationChapterNos)
          .map((chapterNo: any) => Number(chapterNo))
          .filter((chapterNo: number) => chapterNo > 0)
      return {
        key: text(item?.key),
        label: text(item?.label || item?.key, '模板缺项'),
        failure_reason: text(item?.failure_reason || item?.failureReason),
        chapter_nos: chapterNos,
      }
    })
    .filter((item: AnyRecord) => item.key || item.label || item.failure_reason || item.chapter_nos.length)
  if (!missingRequirements.length && !productionFailedRequirements.length) return null
  const missingText = missingRequirements
    .map((item: AnyRecord) => `${compactChapterNoEvidence(item.chapter_nos)}缺${item.label}`)
    .join('；')
  const productionFailedText = productionFailedRequirements
    .map((item: AnyRecord) => `${item.label}${item.failure_reason ? `/${item.failure_reason}` : ''}`)
    .join('；')
  const repairActions = missingRequirements
    .map(defaultFiveChapterLaneTemplateRepairAction)
    .concat(productionFailedRequirements.map((item: AnyRecord) => {
      const action = defaultFiveChapterLaneTemplateRepairAction(item)
      return item.failure_reason ? `${action} 生产后验失败维度：${item.failure_reason}。` : action
    }))
    .filter(Boolean)
  const repairSummary = [
    missingText,
    productionFailedText ? `生产后验仍复发：${productionFailedText}` : '',
  ].filter(Boolean).join('；')
  return {
    visible: true,
    status: 'failed',
    label: '默认档位模板验证缺项',
    summary: text(verdict.summary, `默认档位模板回检未通过：${repairSummary}，下一轮结构修复必须写入任务书。`),
    validation_chapter_nos: arrayValue(verdict.validation_chapter_nos || verdict.validationChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
    requirements: arrayValue(verdict.requirements).map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.key),
      status: text(item?.status || 'fulfilled'),
    })).filter((item: AnyRecord) => item.key || item.label),
    missing_count: Number(verdict.missing_count ?? verdict.missingCount ?? missingRequirements.length),
    missing_requirements: missingRequirements,
    ...(productionRelapseVerdict ? { production_relapse_verdict: productionRelapseVerdict } : {}),
    ...(productionFailedRequirements.length ? {
      production_failed_count: productionFailedRequirements.length,
      production_failed_requirements: productionFailedRequirements,
    } : {}),
    repair_actions: repairActions,
    repair_summary: repairSummary,
  }
}

export function defaultFiveChapterLaneTemplateRedesignInstruction(requirement: AnyRecord) {
  const key = text(requirement?.key)
  if (key === 'default_lane_segment_duty') return '重写每章在5章档位中的前段/中段/后段职责，明确这一章承担抛压、转折、兑现或留钩中的哪一段。'
  if (key === 'default_lane_conflict_rotation') return '重写规则压迫、人物对抗、信息误导的轮换顺序，避免验证批连续使用同一冲突来源。'
  if (key === 'default_lane_payoff_density') return '重写每章显性回报预算，规定每章至少交付收益、反制结果或阶段结算，避免连续铺垫。'
  if (key === 'default_lane_ending_hook_template') return '重写最后300字触发事件、读者问题和下一章风险，让章末追读模板逐章可验证。'
  return '重写该模板项，并给下一轮验证批设置逐章可回填的交付标准。'
}

export function buildDefaultFiveChapterLaneTemplateRedesignQueue(profile?: AnyRecord | null) {
  if (!profile || profile.visible === false) return null
  const recommendation = text(profile.recommendation)
  const status = text(profile.status)
  if (recommendation !== 'escalate_template_redesign' && status !== 'redesign') return null

  const requirementStats = arrayValue(profile.requirements || profile.template_requirements || profile.templateRequirements)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.key, '模板项'),
      failed_count: Number(item?.failed_count ?? item?.failedCount ?? 0),
      passed_count: Number(item?.passed_count ?? item?.passedCount ?? 0),
      latest_status: text(item?.latest_status || item?.latestStatus),
    }))
    .filter((item: AnyRecord) => item.key || item.label)
  const explicitTop = profile.top_failed_requirement || profile.topFailedRequirement || null
  const topSource = explicitTop && typeof explicitTop === 'object' && !Array.isArray(explicitTop)
    ? explicitTop
    : requirementStats
      .filter((item: AnyRecord) => item.failed_count > 0)
      .sort((a: AnyRecord, b: AnyRecord) => b.failed_count - a.failed_count)[0] || null
  const topFailedRequirement = topSource ? {
    key: text(topSource.key),
    label: text(topSource.label || topSource.key, '模板缺项'),
    failed_count: Number(topSource.failed_count ?? topSource.failedCount ?? 0),
  } : null
  const topFailureText = topFailedRequirement
    ? `${topFailedRequirement.label}失败 ${topFailedRequirement.failed_count} 次`
    : '同项模板反复失败'
  const latestTemplateVersionProfile = profile.latest_template_version_profile
    || profile.latestTemplateVersionProfile
    || null
  const redesignRequirements = DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => {
    const stat = requirementStats.find((item: AnyRecord) => item.key === requirement.key)
    return {
      key: requirement.key,
      label: text(stat?.label, requirement.label),
      failed_count: Number(stat?.failed_count || 0),
      instruction: defaultFiveChapterLaneTemplateRedesignInstruction(requirement),
    }
  })

  return {
    visible: true,
    status: 'redesign',
    label: '默认档位模板重构队列',
    source: 'default_five_chapter_lane_template_stability_profile',
    recommendation: 'escalate_template_redesign',
    summary: text(profile.summary, `默认档位模板同项复发，${topFailureText}，需要升级模板重构。`),
    latest_chapter_nos: arrayValue(profile.latest_chapter_nos || profile.latestChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
    validation_batch_count: Number(profile.validation_batch_count ?? profile.validationBatchCount ?? 0),
    failed_batch_count: Number(profile.failed_batch_count ?? profile.failedBatchCount ?? 0),
    ...(latestTemplateVersionProfile ? { latest_template_version_profile: latestTemplateVersionProfile } : {}),
    ...(topFailedRequirement ? { top_failed_requirement: topFailedRequirement } : {}),
    redesign_requirements: redesignRequirements,
    validation_standard: [
      '下一轮3章验证批必须逐章回填 default_lane_*_delivered。',
      '连续2批模板全过后才能恢复默认5章档位。',
    ],
  }
}

export function buildDefaultFiveChapterLaneTemplateProductionRelapseQueue(regression?: AnyRecord | null) {
  if (!regression || regression.visible === false) return null
  const templateVersion = regression.template_version || regression.templateVersion || null
  const templateVersionId = text(regression.template_version_id || regression.templateVersionId || templateVersion?.id)
  if (!templateVersionId) return null
  const failedRequirements = arrayValue(regression.template_version_failed_requirements || regression.templateVersionFailedRequirements)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.key, '模板要求'),
      failure_reason: text(item?.failure_reason || item?.failureReason),
      failed_count: Number(item?.failed_count ?? item?.failedCount ?? 1),
      instruction: defaultFiveChapterLaneTemplateRedesignInstruction({
        key: text(item?.key),
        label: text(item?.label || item?.key, '模板要求'),
      }),
    }))
    .filter((item: AnyRecord) => item.key || item.label)
  if (!failedRequirements.length) return null
  const topFailedRequirement = failedRequirements
    .slice()
    .sort((a, b) => b.failed_count - a.failed_count)[0] || null
  const productionRelapseCount = Number(templateVersion?.production_relapse_count ?? templateVersion?.productionRelapseCount ?? 1)
  const defaultBatchChapterNos = arrayValue(regression.default_batch_chapter_nos || regression.defaultBatchChapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
  const restoreChapterNos = arrayValue(regression.restore_chapter_nos || regression.restoreChapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
  const validationChapterNos = arrayValue(regression.validation_chapter_nos || regression.validationChapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
  const failureReasons = arrayValue(regression.failure_reasons || regression.failureReasons)
    .map((reason: any) => text(reason))
    .filter(Boolean)
  const repeated = regression.repeated_hotspot_segment || regression.repeatedHotspotSegment || null
  return {
    visible: true,
    status: productionRelapseCount >= 2 ? 'redesign' : 'relapsed',
    label: '默认档位模板生产复发队列',
    source: 'default_five_chapter_lane_production_relapse',
    recommendation: 'redesign_template_after_production_relapse',
    summary: `默认档位模板版本 ${templateVersionId} 在真实5章生产复发：${failedRequirements.map(item => `${item.label}/${item.failure_reason}`).join('、')}，需要把失败维度回写到当前版本模板。`,
    template_version_id: templateVersionId,
    template_version: templateVersion ? { ...templateVersion, id: templateVersionId } : { id: templateVersionId },
    production_relapse_count: Math.max(1, Number.isFinite(productionRelapseCount) ? productionRelapseCount : 1),
    production_relapse_review: {
      template_version_id: templateVersionId,
      default_batch_chapter_nos: defaultBatchChapterNos,
      restore_chapter_nos: restoreChapterNos,
      validation_chapter_nos: validationChapterNos,
      failure_reasons: failureReasons,
      failed_requirements: failedRequirements,
      ...(repeated ? {
        repeated_hotspot_segment: {
          key: text(repeated.key),
          label: text(repeated.label || repeated.key),
          risk_count: Number(repeated.risk_count ?? repeated.riskCount ?? repeated.count ?? 0),
        },
      } : {}),
      summary: text(regression.summary),
    },
    failed_requirements: failedRequirements,
    ...(topFailedRequirement ? {
      top_failed_requirement: {
        key: topFailedRequirement.key,
        label: topFailedRequirement.label,
        failure_reason: topFailedRequirement.failure_reason,
        failed_count: topFailedRequirement.failed_count,
      },
    } : {}),
    redesign_requirements: DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => {
      const failed = failedRequirements.find((item: AnyRecord) => item.key === requirement.key)
      return {
        key: requirement.key,
        label: requirement.label,
        failed_count: Number(failed?.failed_count || 0),
        failure_reason: text(failed?.failure_reason),
        instruction: defaultFiveChapterLaneTemplateRedesignInstruction(requirement),
      }
    }),
    validation_standard: [
      '下一轮3章验证批必须逐章回填 default_lane_*_delivered。',
      '默认档位真实生产批必须记录 template_version_id 并做版本级后验复盘。',
      '当前版本连续验证与生产后验都稳定后才能恢复默认5章档位。',
    ],
  }
}

export function buildSafeBatchExpansionStructureValidationResult(args: {
  preflight?: AnyRecord | null
  chapterRisks: AnyRecord[]
  chapters?: AnyRecord[]
}) {
  const verification = safeBatchExpansionStructureVerificationFromPreflight(args.preflight)
  if (!verification) {
    return {
      visible: false,
      status: 'ok' as const,
      label: '扩批结构验证',
      summary: '当前批次没有扩批结构验证要求。',
      source: '',
      repeated_hotspot_segment: null,
      validation_chapter_nos: [],
      failed_chapter_nos: [],
      risk_count: 0,
      core_risk_count: 0,
      payoff_debt_count: 0,
      reader_pull_risk_count: 0,
      fixed_segment_role: '',
      conflict_rotation: '',
      explicit_payoff: '',
      ending_hook_requirement: '',
      structure_actions: [],
    }
  }
  const validationChapterNos = arrayValue(verification.validation_chapter_nos || verification.validationChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const validationNoSet = new Set(validationChapterNos)
  const chapterRisks = arrayValue(args.chapterRisks)
    .filter(chapter => validationNoSet.size === 0 || validationNoSet.has(Number(chapter?.chapterNo || chapter?.chapter_no || 0)))
  const deliveryRiskCount = chapterRisks.reduce((sum, chapter) => sum + Number(chapter?.riskCount || chapter?.risk_count || 0), 0)
  const coreRiskCount = chapterRisks.reduce((sum, chapter) => sum + Number(chapter?.coreRiskCount || chapter?.core_risk_count || 0), 0)
  const payoffDebtCount = chapterRisks.reduce((sum, chapter) => sum + Number(chapter?.payoffDebtCount || chapter?.payoff_debt_count || 0), 0)
  const readerPullRiskCount = chapterRisks.reduce((sum, chapter) => sum + Number(chapter?.readerPullRiskCount || chapter?.reader_pull_risk_count || 0), 0)
  const failedChapterNos = chapterRisks
    .filter(chapter => Number(chapter?.riskCount || chapter?.risk_count || 0) > 0)
    .map(chapter => Number(chapter?.chapterNo || chapter?.chapter_no || 0))
    .filter(chapterNo => chapterNo > 0)
  const repeated = verification.repeated_hotspot_segment || verification.repeatedHotspotSegment || null
  const repeatedSegment = repeated ? {
    key: text(repeated?.key),
    label: text(repeated?.label, text(repeated?.key, '复发段位')),
    count: Number(repeated?.count || 0),
  } : null
  const validationNos = validationChapterNos.length
    ? validationChapterNos
    : chapterRisks.map(chapter => Number(chapter?.chapterNo || chapter?.chapter_no || 0)).filter(chapterNo => chapterNo > 0)
  const defaultFiveChapterLaneTemplateVerdict = buildDefaultFiveChapterLaneTemplateVerdict({
    verification,
    validationChapterNos: validationNos,
    chapters: arrayValue(args.chapters),
    riskCount: deliveryRiskCount,
    coreRiskCount,
    payoffDebtCount,
    readerPullRiskCount,
  })
  const templateRiskCount = Number(defaultFiveChapterLaneTemplateVerdict?.missing_count || 0)
  const riskCount = deliveryRiskCount + templateRiskCount
  const allFailedChapterNos = Array.from(new Set([
    ...failedChapterNos,
    ...arrayValue(defaultFiveChapterLaneTemplateVerdict?.missing_requirements)
      .flatMap((item: AnyRecord) => arrayValue(item?.chapter_nos))
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
  ])).sort((a, b) => a - b)
  const label = text(verification.label, '扩批结构验证')
  const summary = riskCount > 0
    ? templateRiskCount > 0 && deliveryRiskCount === 0
      ? `${label}批未通过：${text(defaultFiveChapterLaneTemplateVerdict?.summary)}`
      : `${label}批未通过：第${allFailedChapterNos.join('、') || validationNos.join('、')}章仍有 ${riskCount} 项核心/回报/追读或模板回执风险，结构修复不能恢复5章扩批。`
    : `${label}批通过：第${validationNos.join('、')}章核心守恒、显性回报和章末追读稳定，可作为恢复5章扩批证据。`
  const defaultFiveChapterRecoveryVerdict = buildDefaultFiveChapterRecoveryVerdict({
    verification,
    validationChapterNos: validationNos,
    riskCount,
    coreRiskCount,
    payoffDebtCount,
    readerPullRiskCount,
  })
  return {
    visible: true,
    status: riskCount > 0 ? 'warn' as const : 'ok' as const,
    label,
    summary,
    source: text(verification.source, 'safe_batch_expansion_structure_repair'),
    repeated_hotspot_segment: repeatedSegment,
    validation_chapter_nos: validationNos,
    failed_chapter_nos: allFailedChapterNos,
    risk_count: riskCount,
    core_risk_count: coreRiskCount,
    payoff_debt_count: payoffDebtCount,
    reader_pull_risk_count: readerPullRiskCount,
    fixed_segment_role: text(verification.fixed_segment_role || verification.fixedSegmentRole),
    conflict_rotation: text(verification.conflict_rotation || verification.conflictRotation),
    explicit_payoff: text(verification.explicit_payoff || verification.explicitPayoff),
    ending_hook_requirement: text(verification.ending_hook_requirement || verification.endingHookRequirement),
    structure_actions: arrayValue(verification.structure_actions || verification.structureActions).map(item => text(item)).filter(Boolean),
    ...(defaultFiveChapterRecoveryVerdict ? { default_five_chapter_recovery_verdict: defaultFiveChapterRecoveryVerdict } : {}),
    ...(defaultFiveChapterLaneTemplateVerdict ? { default_five_chapter_lane_template_verdict: defaultFiveChapterLaneTemplateVerdict } : {}),
  }
}

export function safeBatchExpansionStructureDecisionFromContext(args: {
  nextBatchBrief?: AnyRecord | null
  batchPreflight?: AnyRecord | null
}) {
  const brief = args.nextBatchBrief
    || args.batchPreflight?.next_batch_brief
    || args.batchPreflight?.nextBatchBrief
    || null
  const raw = brief?.expansion_structure_decision
    || brief?.expansionStructureDecision
    || args.batchPreflight?.expansion_structure_decision
    || args.batchPreflight?.expansionStructureDecision
    || null
  if (!raw || raw.visible === false) return null
  const recommendation = firstText(raw.recommendation)
  const instruction = firstText(raw.instruction)
  const summary = firstText(raw.summary)
  const observationMetrics = arrayValue(raw.observation_metrics || raw.observationMetrics)
    .map(item => text(item))
    .filter(Boolean)
  const defaultFiveChapterLaneRedesign = defaultFiveChapterLaneRedesignFromDecision(raw)
  if (!recommendation && !instruction && !summary && observationMetrics.length === 0 && !defaultFiveChapterLaneRedesign) return null
  return {
    visible: true,
    label: firstText(raw.label, '结构修复决策'),
    recommendation,
    target_chapter_count: numberValue(raw.target_chapter_count ?? raw.targetChapterCount) ?? 0,
    mode_label: firstText(raw.mode_label, raw.modeLabel),
    segment_key: firstText(raw.segment_key, raw.segmentKey),
    segment_label: firstText(raw.segment_label, raw.segmentLabel),
    summary,
    instruction,
    source_run_id: raw.source_run_id ?? raw.sourceRunId ?? null,
    observation_metrics: observationMetrics,
    ...(defaultFiveChapterLaneRedesign ? { default_five_chapter_lane_redesign: defaultFiveChapterLaneRedesign } : {}),
  }
}

export function defaultFiveChapterLaneRedesignFromDecision(decision: AnyRecord | null | undefined) {
  const raw = decision?.default_five_chapter_lane_redesign || decision?.defaultFiveChapterLaneRedesign || null
  if (!raw || typeof raw !== 'object') return null
  const repeatedFailureReasons = arrayValue(raw.repeated_failure_reasons || raw.repeatedFailureReasons)
    .map(item => text(item?.reason || item?.label || item))
    .filter(Boolean)
  const normalized = {
    reason: text(raw.reason),
    label: text(raw.label, '默认5章档位结构重构'),
    summary: text(raw.summary),
    relapse_count: Number(raw.relapse_count ?? raw.relapseCount ?? 0),
    repeated_failure_reasons: repeatedFailureReasons,
    segment_duty_rewrite: text(raw.segment_duty_rewrite || raw.segmentDutyRewrite),
    conflict_rotation: text(raw.conflict_rotation || raw.conflictRotation),
    payoff_density: text(raw.payoff_density || raw.payoffDensity),
    ending_hook_template: text(raw.ending_hook_template || raw.endingHookTemplate),
  }
  return normalized.reason
    || normalized.summary
    || normalized.relapse_count > 0
    || normalized.repeated_failure_reasons.length
    || normalized.segment_duty_rewrite
    || normalized.conflict_rotation
    || normalized.payoff_density
    || normalized.ending_hook_template
    ? normalized
    : null
}

export function expansionStructureDecisionRequiresRedesign(decision: AnyRecord) {
  return text(decision?.recommendation) === 'escalate_structure_redesign'
    || Number(decision?.target_chapter_count || 0) === 1
    || /单章重构|结构重构|重写批次设计|重构原则/.test([
      decision?.mode_label,
      decision?.summary,
      decision?.instruction,
    ].map(item => text(item)).join(' '))
}

export function expansionStructureDecisionRequirements(decision: AnyRecord) {
  const segmentLabel = text(decision?.segment_label, '段位')
  const defaultLaneRedesign = defaultFiveChapterLaneRedesignFromDecision(decision)
  const requirements = [
    {
      key: 'segment_role',
      label: `${segmentLabel}职责`,
      planned: firstText(decision?.instruction, decision?.summary, `${segmentLabel}职责必须写成可见事件。`),
    },
    {
      key: 'observation_metrics',
      label: '观察指标',
      planned: arrayValue(decision?.observation_metrics).join('；') || '通过率、失败主因和同段复发必须有正文证据。',
    },
  ]
  if (expansionStructureDecisionRequiresRedesign(decision)) {
    requirements.push({
      key: 'redesign_principles',
      label: '重构原则',
      planned: '单章重构时必须先落实批次结构设计原则，再推进正文。',
    })
  }
  if (defaultLaneRedesign) {
    requirements.push(
      {
        key: 'default_lane_segment_duty',
        label: '默认档位段位职责',
        planned: firstText(defaultLaneRedesign.segment_duty_rewrite, '默认 5 章档位必须回填前段、中段、后段的段位职责模板。'),
      },
      {
        key: 'default_lane_conflict_rotation',
        label: '冲突轮换',
        planned: firstText(defaultLaneRedesign.conflict_rotation, '默认 5 章档位必须回填冲突来源轮换模板。'),
      },
      {
        key: 'default_lane_payoff_density',
        label: '回报密度',
        planned: firstText(defaultLaneRedesign.payoff_density, '默认 5 章档位必须回填逐章显性回报密度模板。'),
      },
      {
        key: 'default_lane_ending_hook_template',
        label: '章末追读模板',
        planned: firstText(defaultLaneRedesign.ending_hook_template, '默认 5 章档位必须回填最后 300 字追读模板。'),
      },
    )
  }
  return requirements
}

export function latestExpansionStructureDecisionSyncReview(reviews: AnyRecord[], chapter: AnyRecord, chapterNo: number) {
  return [
    latestReviewForChapter(reviews, chapter, chapterNo, 'safe_batch_expansion_structure_decision_sync'),
    latestReviewForChapter(reviews, chapter, chapterNo, 'expansion_structure_decision_sync'),
  ].filter(Boolean).sort((a, b) => recordTime(b || {}) - recordTime(a || {}))[0] || null
}

export function expansionStructureDecisionSyncPayload(review: AnyRecord | null) {
  const payload = reviewPayload(review)
  return payload?.safe_batch_expansion_structure_decision_sync
    || payload?.expansion_structure_decision_sync
    || payload?.result?.safe_batch_expansion_structure_decision_sync
    || payload?.result?.expansion_structure_decision_sync
    || payload?.result
    || payload
}

export function chapterExpansionStructureDecisionReceipts(chapter: AnyRecord | null) {
  const raw = parsePayload(chapter?.raw_payload || chapter?.rawPayload, { owner: chapter, kind: 'chapter', field: chapter?.raw_payload ? 'raw_payload' : 'rawPayload' }) || chapter?.raw_payload || chapter?.rawPayload || {}
  const topLevel = [
    raw?.expansion_structure_decision_execution,
    raw?.expansionStructureDecisionExecution,
    raw?.expansion_structure_execution,
    raw?.expansionStructureExecution,
    raw?.context_package?.chapter_target?.expansion_structure_decision_execution,
    raw?.pre_draft_brief?.expansion_structure_decision_execution,
  ]
  const sceneReceipts = [
    ...arrayValue(chapter?.scene_breakdown || chapter?.sceneBreakdown),
    ...arrayValue(raw?.generated_scene_breakdown || raw?.generatedSceneBreakdown),
  ].flatMap(scene => [
    scene?.expansion_structure_decision_execution,
    scene?.expansionStructureDecisionExecution,
    scene?.expansion_structure_execution,
    scene?.expansionStructureExecution,
  ])
  return [...topLevel, ...sceneReceipts].filter(receipt => receipt && typeof receipt === 'object')
}

export function expansionStructureDecisionRequirementDelivered(args: {
  key: string
  payload: AnyRecord
  receipts: AnyRecord[]
}) {
  const keys = args.key === 'segment_role'
    ? ['segment_role_delivered', 'segmentRoleDelivered', 'segment_role_evidence', 'segmentRoleEvidence']
    : args.key === 'observation_metrics'
      ? ['observation_metrics_delivered', 'observationMetricsDelivered', 'observation_metric_evidence', 'observationMetricEvidence']
      : args.key === 'default_lane_segment_duty'
        ? ['default_lane_segment_duty_delivered', 'defaultLaneSegmentDutyDelivered', 'segment_duty_rewrite_delivered', 'segmentDutyRewriteDelivered', 'default_lane_segment_duty_evidence', 'defaultLaneSegmentDutyEvidence']
        : args.key === 'default_lane_conflict_rotation'
          ? ['default_lane_conflict_rotation_delivered', 'defaultLaneConflictRotationDelivered', 'conflict_rotation_delivered', 'conflictRotationDelivered', 'default_lane_conflict_rotation_evidence', 'defaultLaneConflictRotationEvidence']
          : args.key === 'default_lane_payoff_density'
            ? ['default_lane_payoff_density_delivered', 'defaultLanePayoffDensityDelivered', 'payoff_density_delivered', 'payoffDensityDelivered', 'default_lane_payoff_density_evidence', 'defaultLanePayoffDensityEvidence']
            : args.key === 'default_lane_ending_hook_template'
              ? ['default_lane_ending_hook_template_delivered', 'defaultLaneEndingHookTemplateDelivered', 'ending_hook_template_delivered', 'endingHookTemplateDelivered', 'default_lane_ending_hook_template_evidence', 'defaultLaneEndingHookTemplateEvidence']
              : ['redesign_principles_delivered', 'redesignPrinciplesDelivered', 'redesign_principle_evidence', 'redesignPrincipleEvidence']
  const nestedSources = [args.payload, ...args.receipts].flatMap(source => [
    source,
    source?.default_five_chapter_lane_redesign_execution,
    source?.defaultFiveChapterLaneRedesignExecution,
  ]).filter(Boolean)
  for (const source of nestedSources) {
    for (const key of keys) {
      const explicit = boolValue(source?.[key])
      if (explicit !== null) return explicit
      if (arrayValue(source?.[key]).map(item => text(item)).filter(Boolean).length > 0) return true
      if (text(source?.[key])) return true
    }
  }
  return null
}


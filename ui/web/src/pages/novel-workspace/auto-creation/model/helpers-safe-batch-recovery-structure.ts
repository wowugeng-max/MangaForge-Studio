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

import {
  safeBatchExpansionRepeatedHotspotSegment,
} from './helpers-safe-batch-recovery-core'
import {
  defaultFiveChapterLaneRedesignFromDecision,
} from './helpers-safe-batch-recovery-decision'
import {
  buildDefaultFiveChapterLaneTemplateProductionRelapseQueue,
  buildDefaultFiveChapterLaneTemplateVerdict,
  buildDefaultFiveChapterRecoveryVerdict,
} from './helpers-safe-batch-recovery-default-lane'

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


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
  parsePayload,
  hasDeliveredProse,
  latestQualityReviewForChapter,
  latestReviewForChapter,
  qualityReviewPassed,
  findChapter,
  recoveryEvidenceEventTime,
  coreRiskCount,
  payoffDebtCount,
  expectationRiskCount,
  retentionRiskCount,
  isResolvedTaskStatus,
  recoveryEvidenceReleaseSummaryFromPreflight,
} from './helpers-risk-and-governance'

export function strengthenedRepairReleaseSourcesFromPreflight(preflight: AnyRecord | null | undefined) {
  const releaseSummary = recoveryEvidenceReleaseSummaryFromPreflight(preflight)
  const sources = [
    ...arrayValue(releaseSummary?.strengthened_repair_sources),
    ...arrayValue(releaseSummary?.strengthenedRepairSources),
  ]
  const seen = new Set<string>()
  return sources
    .map(source => {
      const label = firstText(source?.label, source?.source_label, source?.sourceLabel, source?.source)
      const status = text(source?.status)
      const statusLabel = firstText(
        source?.status_label,
        source?.statusLabel,
        status === 'converged' ? '强化深修已收敛' : '强化深修恢复',
      )
      const evidence = firstText(source?.evidence, source?.text, label && statusLabel ? `${label}：${statusLabel}` : statusLabel)
      return evidence ? {
        evidence,
        source: text(source?.source || source?.sourceMode, 'strengthened_repair_recheck'),
        source_label: label || '强化深修来源',
        source_status: status,
        status_label: statusLabel,
      } : null
    })
    .filter((source): source is AnyRecord => {
      if (!source) return false
      const key = [source.source, source.evidence].join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function buildStrengthenedRepairAcceptanceReview(args: {
  preflight?: AnyRecord | null
  counts: {
    coreRiskTotal: number
    payoffDebtTotal: number
    readerPullRiskTotal: number
  }
}) {
  const sources = strengthenedRepairReleaseSourcesFromPreflight(args.preflight)
  const sourceEvidence = sources.map(source => text(source?.evidence)).filter(Boolean)
  const coreRiskCount = Math.max(0, Number(args.counts.coreRiskTotal || 0))
  const payoffDebtCount = Math.max(0, Number(args.counts.payoffDebtTotal || 0))
  const readerPullRiskCount = Math.max(0, Number(args.counts.readerPullRiskTotal || 0))
  const failedEvidence = [
    coreRiskCount > 0 ? `核心守恒风险 ${coreRiskCount} 项` : '',
    payoffDebtCount > 0 ? `读者回报欠账 ${payoffDebtCount} 项` : '',
    readerPullRiskCount > 0 ? `读者拉力风险 ${readerPullRiskCount} 项` : '',
  ].filter(Boolean)
  const riskCount = coreRiskCount + payoffDebtCount + readerPullRiskCount
  const sourceSummary = sourceEvidence.slice(0, 2).join('；') || '强化深修来源'

  return {
    visible: sourceEvidence.length > 0,
    status: riskCount > 0 ? 'warn' as const : 'ok' as const,
    source_evidence: sourceEvidence,
    sources,
    failed_evidence: failedEvidence,
    risk_count: riskCount,
    core_risk_count: coreRiskCount,
    payoff_debt_count: payoffDebtCount,
    reader_pull_risk_count: readerPullRiskCount,
    summary: riskCount > 0
      ? `强化深修恢复验收未通过：${sourceSummary} 放行后仍有${failedEvidence.join('、')}。`
      : `强化深修恢复验收已通过：${sourceSummary} 放行后核心守恒、读者回报和追读拉力正常。`,
  }
}

export function emptyStrengthenedRepairAcceptanceTrend(): AutoCreationStrengthenedRepairAcceptanceTrend {
  return {
    visible: false,
    status: 'ok',
    label: '强化恢复验收趋势',
    summary: '暂无强化深修恢复后的批次验收记录。',
    acceptedBatchCount: 0,
    failedBatchCount: 0,
    passStreak: 0,
    latestStatus: 'none',
    latestBatchLabel: '',
    latestRunId: null,
    sourceEvidence: [],
    dimensions: {
      core: { label: '核心守恒', failedCount: 0 },
      payoff: { label: '读者回报', failedCount: 0 },
      readerPull: { label: '读者拉力', failedCount: 0 },
    },
  }
}

export function strengthenedAcceptanceFailedEvidence(counts: {
  coreRiskCount: number
  payoffDebtCount: number
  readerPullRiskCount: number
}) {
  return [
    counts.coreRiskCount > 0 ? `核心守恒风险 ${counts.coreRiskCount} 项` : '',
    counts.payoffDebtCount > 0 ? `读者回报欠账 ${counts.payoffDebtCount} 项` : '',
    counts.readerPullRiskCount > 0 ? `读者拉力风险 ${counts.readerPullRiskCount} 项` : '',
  ].filter(Boolean)
}

export function strengthenedAcceptanceBatchEvent(args: {
  run: AnyRecord
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  storyState?: AnyRecord | null
}) {
  if (text(args.run?.run_type) !== 'batch_generate_prose') return null
  const input = parsePayload(args.run?.input_ref, { owner: args.run, kind: 'run', field: 'input_ref' }) || {}
  const output = parsePayload(args.run?.output_ref, { owner: args.run, kind: 'run', field: 'output_ref' }) || {}
  const preflight = input?.batch_preflight || input?.batchPreflight || null
  const sources = strengthenedRepairReleaseSourcesFromPreflight(preflight)
  if (!sources.length) return null
  const outputChapters = arrayValue(output?.chapters)
  const items = outputChapters.map((chapter: any) => ({
    chapterId: chapter?.id ?? chapter?.chapter_id ?? null,
    chapterNo: Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0),
    title: text(chapter?.title, `第${Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0)}章`),
    status: text(chapter?.status) === 'success' ? 'success' as AutoCreationBatchReviewItemStatus : 'failed' as AutoCreationBatchReviewItemStatus,
  })).filter(item => item.chapterNo > 0)
  const deliveredItems = items.filter(item => {
    if (item.status !== 'success') return false
    const chapter = findChapter(args.chapters, item)
    if (!chapter || !hasDeliveredProse(chapter)) return false
    return qualityReviewPassed(latestQualityReviewForChapter(args.reviews, chapter, item.chapterNo))
  })
  if (!deliveredItems.length) return null

  let coreRiskTotal = 0
  let payoffDebtTotal = 0
  let readerPullRiskTotal = 0
  deliveredItems.forEach(item => {
    const chapter = findChapter(args.chapters, item)
    if (!chapter) return
    const coreReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'chapter_core_drift')
    const payoffReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_payoff_sync')
    const expectationReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_expectation_sync')
    const retentionReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_retention_sync')
    coreRiskTotal += coreRiskCount(coreReview)
    payoffDebtTotal += payoffDebtCount(payoffReview)
    readerPullRiskTotal += expectationRiskCount(expectationReview) + retentionRiskCount(retentionReview)
  })
  const failedEvidence = strengthenedAcceptanceFailedEvidence({
    coreRiskCount: coreRiskTotal,
    payoffDebtCount: payoffDebtTotal,
    readerPullRiskCount: readerPullRiskTotal,
  })
  const releaseSummary = recoveryEvidenceReleaseSummaryFromPreflight(preflight)
  const batchLabel = firstText(
    releaseSummary?.next_batch_label,
    releaseSummary?.nextBatchLabel,
    deliveredItems.length ? `第${deliveredItems[0].chapterNo}-${deliveredItems[deliveredItems.length - 1].chapterNo}章` : '',
  )

  return {
    status: failedEvidence.length ? 'warn' as const : 'ok' as const,
    event_at: text(args.run?.created_at || args.run?.updated_at),
    run_id: args.run?.id ?? null,
    batch_label: batchLabel,
    source_evidence: sources.map(source => text(source?.evidence)).filter(Boolean),
    failed_evidence: failedEvidence,
    core_risk_count: coreRiskTotal,
    payoff_debt_count: payoffDebtTotal,
    reader_pull_risk_count: readerPullRiskTotal,
  }
}

export function strengthenedAcceptanceRepairTaskEvents(runRecords: AnyRecord[]) {
  return arrayValue(runRecords).flatMap(run => {
    const output = parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {}
    return arrayValue(output?.tasks).map(task => {
      if (text(task?.issue_type || task?.issueType) !== 'strengthened_repair_acceptance_mismatch') return null
      if (isResolvedTaskStatus(task?.task_status || task?.taskStatus)) return null
      const review = task?.strengthened_repair_acceptance_review || task?.strengthenedRepairAcceptanceReview || {}
      const failedEvidence = arrayValue(review?.failed_evidence || review?.failedEvidence).map(item => text(item)).filter(Boolean)
      const coreRiskCount = Number(review?.core_risk_count ?? review?.coreRiskCount ?? (failedEvidence.some(item => item.includes('核心')) ? 1 : 0))
      const payoffDebtCount = Number(review?.payoff_debt_count ?? review?.payoffDebtCount ?? (failedEvidence.some(item => item.includes('回报')) ? 1 : 0))
      const readerPullRiskCount = Number(review?.reader_pull_risk_count ?? review?.readerPullRiskCount ?? (failedEvidence.some(item => item.includes('拉力') || item.includes('追读')) ? 1 : 0))
      return {
        status: 'warn' as const,
        event_at: text(run?.created_at || run?.updated_at),
        run_id: run?.id ?? null,
        batch_label: firstText(review?.batch_label, review?.batchLabel, task?.title, '强化复盘批次'),
        source_evidence: arrayValue(review?.source_evidence || review?.sourceEvidence).map(item => text(item)).filter(Boolean),
        failed_evidence: failedEvidence.length
          ? failedEvidence
          : strengthenedAcceptanceFailedEvidence({ coreRiskCount, payoffDebtCount, readerPullRiskCount }),
        core_risk_count: Number.isFinite(coreRiskCount) ? coreRiskCount : 0,
        payoff_debt_count: Number.isFinite(payoffDebtCount) ? payoffDebtCount : 0,
        reader_pull_risk_count: Number.isFinite(readerPullRiskCount) ? readerPullRiskCount : 0,
      }
    }).filter(Boolean)
  })
}

export function buildStrengthenedRepairAcceptanceTrend(args: {
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  storyState?: AnyRecord | null
}): AutoCreationStrengthenedRepairAcceptanceTrend {
  const batchEvents = arrayValue(args.runRecords)
    .map(run => strengthenedAcceptanceBatchEvent({
      run,
      chapters: args.chapters,
      reviews: args.reviews,
      storyState: args.storyState,
    }))
    .filter((event): event is AnyRecord => Boolean(event))
  const events = [
    ...batchEvents,
    ...strengthenedAcceptanceRepairTaskEvents(args.runRecords),
  ].sort((a, b) => recoveryEvidenceEventTime(a.event_at) - recoveryEvidenceEventTime(b.event_at))
  if (!events.length) return emptyStrengthenedRepairAcceptanceTrend()

  const acceptedBatchCount = events.filter(event => event.status === 'ok').length
  const failedBatchCount = events.filter(event => event.status === 'warn').length
  const latest = events[events.length - 1]
  let passStreak = 0
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].status !== 'ok') break
    passStreak += 1
  }
  const coreFailedCount = events.reduce((sum, event) => sum + Number(event.core_risk_count || 0), 0)
  const payoffFailedCount = events.reduce((sum, event) => sum + Number(event.payoff_debt_count || 0), 0)
  const readerPullFailedCount = events.reduce((sum, event) => sum + Number(event.reader_pull_risk_count || 0), 0)
  const latestFailedEvidence = arrayValue(latest?.failed_evidence).map(item => text(item)).filter(Boolean)
  const latestSourceEvidence = arrayValue(latest?.source_evidence).map(item => text(item)).filter(Boolean)
  const status: AutoCreationBatchGuardrailSignalStatus = latest.status === 'warn' ? 'warn' : 'ok'
  const summary = status === 'warn'
    ? `强化恢复验收最近 1 批未通过：${latestFailedEvidence.slice(0, 3).join('、') || '核心/回报/追读仍需复盘'}；本轮回到单章治理。`
    : `强化恢复验收连续 ${Math.max(1, passStreak)} 批通过，核心守恒、读者回报和追读拉力趋势稳定，可继续小批量扩批观察。`

  return {
    visible: true,
    status,
    label: '强化恢复验收趋势',
    summary,
    acceptedBatchCount,
    failedBatchCount,
    passStreak,
    latestStatus: latest.status,
    latestBatchLabel: text(latest.batch_label),
    latestRunId: latest.run_id ?? null,
    sourceEvidence: Array.from(new Set([
      ...latestSourceEvidence,
      ...events.flatMap(event => arrayValue(event.source_evidence).map(item => text(item)).filter(Boolean)),
    ])).slice(0, 6),
    dimensions: {
      core: { label: '核心守恒', failedCount: coreFailedCount },
      payoff: { label: '读者回报', failedCount: payoffFailedCount },
      readerPull: { label: '读者拉力', failedCount: readerPullFailedCount },
    },
  }
}

export function strengthenedRepairAcceptanceTrendSnapshot(trend: AutoCreationStrengthenedRepairAcceptanceTrend) {
  if (!trend.visible) return null
  return {
    visible: true,
    status: trend.status,
    label: trend.label,
    summary: trend.summary,
    accepted_batch_count: trend.acceptedBatchCount,
    failed_batch_count: trend.failedBatchCount,
    pass_streak: trend.passStreak,
    latest_status: trend.latestStatus,
    latest_batch_label: trend.latestBatchLabel,
    latest_run_id: trend.latestRunId,
    source_evidence: trend.sourceEvidence,
    dimensions: {
      core: { label: trend.dimensions.core.label, failed_count: trend.dimensions.core.failedCount },
      payoff: { label: trend.dimensions.payoff.label, failed_count: trend.dimensions.payoff.failedCount },
      reader_pull: { label: trend.dimensions.readerPull.label, failed_count: trend.dimensions.readerPull.failedCount },
    },
  }
}

export function safeBatchRecoveryRoadmapLane(targetChapterCount: number) {
  if (targetChapterCount <= 1) return { key: 'single_chapter', label: '1章治理' }
  if (targetChapterCount >= 5) return { key: 'expanded_batch', label: '5章连写' }
  return { key: 'small_batch', label: `${Math.max(1, targetChapterCount)}章验证` }
}

export function safeBatchRecoveryRoadmapNode(args: {
  key: string
  label: string
  status: string
  targetChapterCount: number
  detail: string
  actionLabel: string
  focus?: AnyRecord | null
}) {
  const focus = args.focus || safeBatchRecoveryRoadmapFocus(args.key, args.label, args.actionLabel)
  return {
    key: args.key,
    label: args.label,
    status: ['ok', 'warn', 'pending'].includes(args.status) ? args.status : 'pending',
    target_chapter_count: Math.max(0, Number(args.targetChapterCount || 0)),
    detail: text(args.detail),
    action_label: text(args.actionLabel),
    ...(focus ? { focus } : {}),
  }
}

export function safeBatchRecoveryRoadmapActionLabel(key: string) {
  if (key === 'strengthened_acceptance') return '查看强化复盘'
  if (key === 'expansion_feedback') return '修扩批热区'
  if (key === 'structure_validation') return '修扩批结构'
  if (key === 'structure_repair_effectiveness') return '重做结构修复'
  if (key === 'structure_decision_execution') return '补齐结构决策执行'
  if (key === 'default_lane_template_version') return '修当前模板版本'
  return '查看安全连写'
}

export function safeBatchRecoveryRoadmapFocus(key: string, label: string, actionLabel: string, overrides: AnyRecord | null = null) {
  const focusMap: Record<string, AnyRecord> = {
    strengthened_acceptance: {
      target_view: 'recovery_review',
      issue_type: 'strengthened_repair_acceptance_mismatch',
      source: 'strengthened_repair_acceptance_trend',
      task_center_filter_label: '强化复盘',
    },
    expansion_feedback: {
      target_view: 'repair_task',
      issue_type: 'safe_batch_expansion_segment_hotspot',
      source: 'safe_batch_expansion_feedback',
      task_center_filter_label: '扩批分段',
    },
    structure_validation: {
      target_view: 'repair_task',
      issue_type: 'safe_batch_expansion_structure_repair',
      source: 'safe_batch_expansion_structure_validation',
      task_center_filter_label: '扩批结构',
    },
    structure_repair_effectiveness: {
      target_view: 'repair_task',
      issue_type: 'safe_batch_expansion_structure_repair',
      source: 'safe_batch_expansion_structure_repair_effectiveness',
      task_center_filter_label: '扩批结构',
    },
    structure_decision_execution: {
      target_view: 'repair_task',
      issue_type: 'safe_batch_expansion_structure_decision_mismatch',
      source: 'safe_batch_expansion_structure_decision_trend',
      task_center_filter_label: '扩批结构决策',
    },
    default_lane_template_version: {
      target_view: 'repair_task',
      issue_type: 'safe_batch_expansion_structure_repair',
      source: 'default_five_chapter_lane_template_stability_profile',
      task_center_filter_label: '当前模板版本',
      requirement_key: 'default_lane_template',
    },
  }
  const focus = focusMap[key]
  if (!focus) return null
  return {
    layer_key: key,
    layer_label: label,
    action_label: actionLabel,
    task_statuses: ['open', 'needs_review'],
    ...focus,
    ...(overrides || {}),
  }
}

export function buildSafeBatchRecoveryRoadmap(args: {
  trend: AutoCreationStrengthenedRepairAcceptanceTrend
  feedback?: AnyRecord | null
  policyStatus: string
  policySummary: string
  targetChapterCount: number
  baseChapterCount: number
  expandedChapterCount: number
  requiredPassStreak: number
}) {
  const feedback = args.feedback || null
  const feedbackStatus = text(feedback?.status, 'none')
  const validationTrend = feedback?.expansionStructureValidationTrend
    || feedback?.expansion_structure_validation_trend
    || null
  const repairEffectiveness = feedback?.expansionStructureRepairEffectiveness
    || feedback?.expansion_structure_repair_effectiveness
    || null
  const decisionTrend = feedback?.expansionStructureDecisionTrend
    || feedback?.expansion_structure_decision_trend
    || null
  const defaultLaneTemplateStabilityProfile = feedback?.defaultFiveChapterLaneTemplateStabilityProfile
    || feedback?.default_five_chapter_lane_template_stability_profile
    || null
  const latestTemplateVersionProfile = defaultLaneTemplateStabilityProfile?.latest_template_version_profile
    || defaultLaneTemplateStabilityProfile?.latestTemplateVersionProfile
    || null
  const strengthenedStatus = args.trend.status === 'warn' || args.trend.latestStatus === 'warn'
    ? 'warn'
    : args.trend.passStreak >= args.requiredPassStreak
      ? 'ok'
      : 'pending'
  const feedbackNodeStatus = ['rollback_to_single_chapter', 'rollback_to_small_batch'].includes(feedbackStatus)
    ? 'warn'
    : ['passed', 'recovered'].includes(feedbackStatus)
      ? 'ok'
      : 'pending'
  const feedbackRepeatedHotspot = feedback?.repeatedHotspotSegment || feedback?.repeated_hotspot_segment || null
  const feedbackRestoreRelapse = text(feedbackRepeatedHotspot?.source) === 'safe_batch_recovery_restore_five_batch'
  const feedbackDefaultRegression = feedback?.defaultFiveChapterRegression || feedback?.default_five_chapter_regression || null
  const feedbackDefaultRegressionRelapse = Boolean(feedbackDefaultRegression && feedbackDefaultRegression.visible !== false)
  const feedbackNeedsStructureValidation = feedbackRestoreRelapse || feedbackDefaultRegressionRelapse
  const feedbackFocus = feedbackNeedsStructureValidation
    ? safeBatchRecoveryRoadmapFocus('structure_validation', '结构验证', safeBatchRecoveryRoadmapActionLabel('structure_validation'))
    : null
  const validationStatus = validationTrend?.visible
    ? text(validationTrend?.status) === 'warn' ? 'warn' : 'ok'
    : 'pending'
  const repairRecommendation = text(repairEffectiveness?.recommendation)
  const repairStatus = repairEffectiveness?.visible
    ? repairRecommendation === 'escalate_structure_redesign' ? 'warn' : 'ok'
    : 'pending'
  const decisionStatus = decisionTrend?.visible
    ? text(decisionTrend?.status) === 'warn' ? 'warn' : 'ok'
    : 'pending'
  const topDecisionRequirement = decisionTrend?.top_failed_requirement || decisionTrend?.topFailedRequirement || null
  const decisionFailedRequirements = arrayValue(decisionTrend?.failed_requirements || decisionTrend?.failedRequirements)
  const decisionHasDefaultLaneTemplateGap = Boolean(
    decisionTrend?.default_five_chapter_lane_redesign
    || decisionTrend?.defaultFiveChapterLaneRedesign
    || text(topDecisionRequirement?.key).startsWith('default_lane_')
    || decisionFailedRequirements.some((item: AnyRecord) => text(item?.key).startsWith('default_lane_')),
  )
  const decisionActionLabel = decisionHasDefaultLaneTemplateGap
    ? '补默认档位模板'
    : safeBatchRecoveryRoadmapActionLabel('structure_decision_execution')
  const decisionFocus = decisionHasDefaultLaneTemplateGap
    ? safeBatchRecoveryRoadmapFocus('structure_decision_execution', '结构决策执行', decisionActionLabel, {
      task_center_filter_label: '默认档位模板',
      requirement_key: 'default_lane_template',
    })
    : null
  const templateVersionId = text(latestTemplateVersionProfile?.id || latestTemplateVersionProfile?.template_version_id || latestTemplateVersionProfile?.templateVersionId)
  const templateVersionStatus = text(latestTemplateVersionProfile?.status)
  const templateVersionPassStreak = Number(latestTemplateVersionProfile?.pass_streak ?? latestTemplateVersionProfile?.passStreak ?? 0)
  const templateVersionRequiredPassStreak = Number(latestTemplateVersionProfile?.required_pass_streak ?? latestTemplateVersionProfile?.requiredPassStreak ?? defaultLaneTemplateStabilityProfile?.required_pass_streak ?? defaultLaneTemplateStabilityProfile?.requiredPassStreak ?? 2)
  const latestProductionRelapseVerdict = latestTemplateVersionProfile?.latest_production_relapse_verdict
    || latestTemplateVersionProfile?.latestProductionRelapseVerdict
    || null
  const latestProductionRelapseStatus = text(latestProductionRelapseVerdict?.status)
  const latestProductionRelapseRemainingReasons = arrayValue(latestProductionRelapseVerdict?.remaining_failure_reasons || latestProductionRelapseVerdict?.remainingFailureReasons)
    .map((reason: any) => text(reason))
    .filter(Boolean)
  const latestProductionRelapseClearedReasons = arrayValue(latestProductionRelapseVerdict?.cleared_failure_reasons || latestProductionRelapseVerdict?.clearedFailureReasons)
    .map((reason: any) => text(reason))
    .filter(Boolean)
  const latestProductionRelapseText = latestProductionRelapseStatus === 'failed'
    ? `生产后验仍复发：${latestProductionRelapseRemainingReasons.join('、') || '真实生产失败维度'}。`
    : latestProductionRelapseStatus === 'passed'
      ? `生产后验已修复：${latestProductionRelapseClearedReasons.join('、') || '真实生产失败维度'}已清零。`
      : ''
  const defaultLaneTemplateStatus = text(defaultLaneTemplateStabilityProfile?.status)
  const defaultLaneTemplateVersionWarn = ['relapsed', 'redesign'].includes(defaultLaneTemplateStatus)
    || ['relapsed', 'redesign'].includes(templateVersionStatus)
  const defaultLaneTemplateVersionReady = Boolean(defaultLaneTemplateStabilityProfile)
    && !defaultLaneTemplateVersionWarn
    && (templateVersionStatus === 'ready' || (!templateVersionId && defaultLaneTemplateStatus === 'ready'))
  const defaultLaneTemplateVersionStatus = !defaultLaneTemplateStabilityProfile
    ? 'pending'
    : defaultLaneTemplateVersionWarn
      ? 'warn'
      : defaultLaneTemplateVersionReady
        ? 'ok'
        : 'pending'
  const defaultLaneTemplateVersionActionLabel = defaultLaneTemplateVersionStatus === 'warn'
    ? latestProductionRelapseStatus === 'failed'
      ? '修生产后验'
      : defaultLaneTemplateStatus === 'redesign' || templateVersionStatus === 'redesign'
      ? '重构当前模板版本'
      : '修当前模板版本'
    : defaultLaneTemplateVersionStatus === 'ok'
      ? '当前模板版本稳定'
      : '观察当前模板版本'
  const defaultLaneTemplateVersionFocus = defaultLaneTemplateVersionStatus === 'warn'
    ? safeBatchRecoveryRoadmapFocus('default_lane_template_version', '默认档位模板版本', defaultLaneTemplateVersionActionLabel, {
      task_center_filter_label: latestProductionRelapseStatus === 'failed' ? '生产后验仍复发' : '当前模板版本',
      requirement_key: 'default_lane_template',
      template_version_id: templateVersionId,
    })
    : null
  const routeNodes = [
    safeBatchRecoveryRoadmapNode({
      key: 'strengthened_acceptance',
      label: '强化验收',
      status: strengthenedStatus,
      targetChapterCount: strengthenedStatus === 'ok' ? args.expandedChapterCount : args.baseChapterCount,
      detail: args.trend.visible
        ? args.trend.summary
        : `尚未形成强化验收趋势，先保持 ${args.baseChapterCount} 章以内。`,
      actionLabel: safeBatchRecoveryRoadmapActionLabel('strengthened_acceptance'),
    }),
    safeBatchRecoveryRoadmapNode({
      key: 'expansion_feedback',
      label: '扩批热区',
      status: feedbackNodeStatus,
      targetChapterCount: feedbackNodeStatus === 'warn' ? Number(feedback?.targetChapterCount || args.baseChapterCount) : args.expandedChapterCount,
      detail: text(feedback?.summary, '尚未产生5章扩批热区复盘。'),
      actionLabel: feedbackNeedsStructureValidation
        ? safeBatchRecoveryRoadmapActionLabel('structure_validation')
        : safeBatchRecoveryRoadmapActionLabel('expansion_feedback'),
      focus: feedbackFocus,
    }),
    safeBatchRecoveryRoadmapNode({
      key: 'structure_validation',
      label: '结构验证',
      status: validationStatus,
      targetChapterCount: validationStatus === 'warn' ? args.baseChapterCount : args.expandedChapterCount,
      detail: text(validationTrend?.summary, '尚未进入扩批结构验证批。'),
      actionLabel: safeBatchRecoveryRoadmapActionLabel('structure_validation'),
    }),
    safeBatchRecoveryRoadmapNode({
      key: 'structure_repair_effectiveness',
      label: '结构修复有效性',
      status: repairStatus,
      targetChapterCount: repairRecommendation === 'escalate_structure_redesign' ? 1 : repairRecommendation === 'continue_small_validation' ? args.baseChapterCount : args.expandedChapterCount,
      detail: text(repairEffectiveness?.summary, '尚未形成结构修复有效性结论。'),
      actionLabel: safeBatchRecoveryRoadmapActionLabel('structure_repair_effectiveness'),
    }),
    safeBatchRecoveryRoadmapNode({
      key: 'structure_decision_execution',
      label: '结构决策执行',
      status: decisionStatus,
      targetChapterCount: decisionStatus === 'warn'
        ? Number(decisionTrend?.suggested_target_chapter_count ?? decisionTrend?.suggestedTargetChapterCount ?? args.baseChapterCount)
        : args.expandedChapterCount,
      detail: topDecisionRequirement
        ? `结构决策漏项：${text(topDecisionRequirement.label, '执行要求')} ${Number(topDecisionRequirement.count || 0)}。${text(decisionTrend?.summary)}`
        : text(decisionTrend?.summary, '尚未形成结构决策执行趋势。'),
      actionLabel: decisionActionLabel,
      focus: decisionFocus,
    }),
    safeBatchRecoveryRoadmapNode({
      key: 'default_lane_template_version',
      label: '默认档位模板版本',
      status: defaultLaneTemplateVersionStatus,
      targetChapterCount: defaultLaneTemplateVersionStatus === 'warn'
        ? defaultLaneTemplateStatus === 'redesign' || templateVersionStatus === 'redesign' ? 1 : args.baseChapterCount
        : defaultLaneTemplateVersionStatus === 'ok' ? args.expandedChapterCount : args.baseChapterCount,
      detail: templateVersionId
        ? [
          text(defaultLaneTemplateStabilityProfile?.summary, '默认档位模板版本仍在观察。'),
          latestProductionRelapseText,
          `当前模板版本 ${templateVersionId} 连过 ${Math.max(0, templateVersionPassStreak)}/${Math.max(1, templateVersionRequiredPassStreak || 2)}。`,
        ].filter(Boolean).join(' ')
        : text(defaultLaneTemplateStabilityProfile?.summary, '尚未形成默认档位模板版本稳定证据。'),
      actionLabel: defaultLaneTemplateVersionActionLabel,
      focus: defaultLaneTemplateVersionFocus,
    }),
  ]
  const preferredTemplateVersionLayer = defaultLaneTemplateVersionStatus === 'warn'
    ? routeNodes.find(node => node.key === 'default_lane_template_version') || null
    : null
  const nextRepairLayer = preferredTemplateVersionLayer
    || routeNodes.find(node => node.status === 'warn')
    || routeNodes.find(node => node.status === 'pending')
    || null
  const lane = safeBatchRecoveryRoadmapLane(args.targetChapterCount)
  const recommendedFocus = nextRepairLayer?.status === 'warn'
    ? nextRepairLayer.focus || safeBatchRecoveryRoadmapFocus(nextRepairLayer.key, nextRepairLayer.label, nextRepairLayer.action_label)
    : null

  return {
    visible: true,
    label: '安全连写恢复路线图',
    current_lane: lane.key,
    current_lane_label: lane.label,
    current_target_chapter_count: Math.max(1, Number(args.targetChapterCount || 1)),
    current_status: text(args.policyStatus, 'observing'),
    current_reason: text(args.policySummary),
    next_repair_layer: nextRepairLayer,
    ...(recommendedFocus ? { recommended_focus: recommendedFocus } : {}),
    route_nodes: routeNodes,
  }
}

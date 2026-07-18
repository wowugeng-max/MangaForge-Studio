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

export function safeBatchExpansionStructureDecisionEntryEvaluation(args: {
  entry: AnyRecord
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const review = buildSafeBatchExpansionStructureDecisionExecutionReview({
    nextBatchBrief: args.entry.input?.next_batch_brief || args.entry.input?.nextBatchBrief || null,
    batchPreflight: args.entry.preflight,
    items: args.entry.items,
    chapters: args.chapters,
    reviews: args.reviews,
  })
  return {
    review,
    latestBatchCreatedAt: text(args.entry.run?.created_at),
    latestChapterNos: arrayValue(args.entry.items).map(item => Number(item?.chapterNo || 0)).filter(Boolean),
  }
}

export function buildSafeBatchExpansionStructureDecisionTrend(args: {
  decisionEvaluations: AnyRecord[]
}) {
  const evaluations = arrayValue(args.decisionEvaluations)
    .filter(evaluation => evaluation?.review?.visible)
    .sort((a, b) => Date.parse(text(b?.latestBatchCreatedAt)) - Date.parse(text(a?.latestBatchCreatedAt)))
  if (!evaluations.length) return null

  const failedEvaluations = evaluations.filter(evaluation => Number(evaluation?.review?.risk_count || 0) > 0)
  const latest = evaluations[0]
  const latestReview = latest.review || {}
  const latestStatus = Number(latestReview.risk_count || 0) > 0 ? 'warn' as const : 'ok' as const
  const recommendationCounts = new Map<string, AnyRecord>()
  const requirementCounts = new Map<string, AnyRecord>()
  const segmentCounts = new Map<string, AnyRecord>()
  failedEvaluations.forEach(evaluation => {
    const review = evaluation.review || {}
    const recommendationKey = text(review.recommendation, 'unknown')
    const recommendationRecord = recommendationCounts.get(recommendationKey) || {
      key: recommendationKey,
      label: text(review.mode_label, recommendationKey === 'unknown' ? '结构决策' : recommendationKey),
      count: 0,
    }
    recommendationRecord.count += 1
    recommendationCounts.set(recommendationKey, recommendationRecord)

    const segmentKey = text(review.segment_key, 'unknown')
    const segmentRecord = segmentCounts.get(segmentKey) || {
      key: segmentKey,
      label: text(review.segment_label, segmentKey === 'unknown' ? '复发段位' : segmentKey),
      count: 0,
    }
    segmentRecord.count += 1
    segmentCounts.set(segmentKey, segmentRecord)

    arrayValue(review.failed_items).forEach(item => {
      const key = text(item?.key, 'expansion_structure_decision')
      const record = requirementCounts.get(key) || {
        key,
        label: text(item?.label, key),
        count: 0,
      }
      record.count += 1
      requirementCounts.set(key, record)
    })
  })
  const byCountDesc = (a: AnyRecord, b: AnyRecord) => Number(b.count || 0) - Number(a.count || 0)
  const topFailedRecommendation = Array.from(recommendationCounts.values()).sort(byCountDesc)[0] || null
  const topFailedRequirement = Array.from(requirementCounts.values()).sort(byCountDesc)[0] || null
  const failedRequirements = Array.from(requirementCounts.values()).sort(byCountDesc)
  const topFailedSegment = Array.from(segmentCounts.values()).sort(byCountDesc)[0] || null
  const latestDefaultFiveChapterLaneRedesign = failedEvaluations
    .map(evaluation => evaluation?.review?.default_five_chapter_lane_redesign || evaluation?.review?.defaultFiveChapterLaneRedesign)
    .find(Boolean) || null
  const defaultLaneFailedRequirements = failedRequirements
    .filter(item => text(item?.key).startsWith('default_lane_'))
  const defaultFiveChapterLaneRedesign = (latestDefaultFiveChapterLaneRedesign || defaultLaneFailedRequirements.length)
    ? {
      ...(latestDefaultFiveChapterLaneRedesign || {}),
      visible: true,
      label: text(latestDefaultFiveChapterLaneRedesign?.label, '默认档位模板漏项'),
      missed_requirements: defaultLaneFailedRequirements,
      summary: text(
        latestDefaultFiveChapterLaneRedesign?.summary,
        defaultLaneFailedRequirements.length
          ? `默认5章档位模板漏项：${defaultLaneFailedRequirements.map(item => text(item?.label)).filter(Boolean).join('、')}。`
          : '默认5章档位结构重构需要补齐模板回执。',
      ),
    }
    : null
  const suggestedTargetChapterCount = latestStatus === 'warn'
    ? Boolean(defaultLaneFailedRequirements.length) || text(topFailedRecommendation?.key) === 'escalate_structure_redesign'
      ? 1
      : 3
    : 5
  const suggestedTargetLabel = suggestedTargetChapterCount <= 1
    ? '1章单章治理'
    : `${suggestedTargetChapterCount}章小批验证`
  const summary = latestStatus === 'warn'
    ? `结构决策执行趋势未稳：${text(topFailedRecommendation?.label, '结构决策')}最近复盘仍有漏项，${text(topFailedRequirement?.label, '执行要求')}累计 ${Number(topFailedRequirement?.count || 0)} 次未落地；下一批先保持 ${suggestedTargetLabel}。`
    : failedEvaluations.length > 0
      ? `结构决策执行趋势已恢复：最近批次已落地，但历史仍需关注${text(topFailedRequirement?.label, '执行要求')}漏项。`
      : `结构决策执行趋势稳定：近 ${evaluations.length} 批均按推荐动作、段位职责和观察指标落地。`

  return {
    visible: true,
    status: latestStatus,
    label: '扩批结构决策执行趋势',
    summary,
    total_batch_count: evaluations.length,
    passed_batch_count: evaluations.length - failedEvaluations.length,
    failed_batch_count: failedEvaluations.length,
    latest_status: latestStatus,
    latest_batch_created_at: text(latest.latestBatchCreatedAt),
    latest_chapter_nos: arrayValue(latest.latestChapterNos).map(chapterNo => Number(chapterNo)).filter(chapterNo => chapterNo > 0),
    latest_segment_key: text(latestReview.segment_key),
    latest_segment_label: text(latestReview.segment_label),
    top_failed_recommendation: topFailedRecommendation,
    top_failed_requirement: topFailedRequirement,
    failed_requirements: failedRequirements,
    top_failed_segment: topFailedSegment,
    ...(defaultFiveChapterLaneRedesign ? {
      default_five_chapter_lane_redesign: defaultFiveChapterLaneRedesign,
    } : {}),
    suggested_target_chapter_count: suggestedTargetChapterCount,
  }
}

export function buildSafeBatchExpansionSegmentReview(args: {
  preflight?: AnyRecord | null
  chapterRisks: AnyRecord[]
}) {
  const policy = safeBatchExpansionPolicyFromPreflight(args.preflight)
  const chapterRisks = arrayValue(args.chapterRisks)
  if (!policy || chapterRisks.length < 5) {
    return {
      visible: false,
      status: 'ok',
      label: '扩批分段复盘',
      summary: '当前批次不是 5 章扩批批次。',
      targetChapterCount: Number(policy?.targetChapterCount || 0),
      actualChapterCount: chapterRisks.length,
      riskCount: 0,
      segments: [],
      hotspots: [],
      rollbackPolicy: safeBatchExpansionRollbackPolicy({ riskCount: 0, coreRiskCount: 0, hotspotLabel: '' }),
    }
  }

  const segmentMap = new Map<string, AnyRecord>()
  chapterRisks.forEach((chapter, index) => {
    const segmentKey = safeBatchExpansionSegmentKey(index, chapterRisks.length)
    const current = segmentMap.get(segmentKey.key) || {
      key: segmentKey.key,
      label: segmentKey.label,
      chapterNos: [] as number[],
      riskCount: 0,
      coreRiskCount: 0,
      payoffDebtCount: 0,
      readerPullRiskCount: 0,
    }
    current.chapterNos.push(Number(chapter.chapterNo || 0))
    current.coreRiskCount += Number(chapter.coreRiskCount || 0)
    current.payoffDebtCount += Number(chapter.payoffDebtCount || 0)
    current.readerPullRiskCount += Number(chapter.readerPullRiskCount || 0)
    current.riskCount += Number(chapter.riskCount || 0)
    segmentMap.set(segmentKey.key, current)
  })

  const segments = Array.from(segmentMap.values()).map(segment => ({
    ...segment,
    status: segment.riskCount > 0 ? 'warn' : 'ok',
    summary: segment.riskCount > 0
      ? `${segment.label}第${segment.chapterNos.join('、')}章存在 ${segment.riskCount} 项扩批风险：核心 ${segment.coreRiskCount}、回报 ${segment.payoffDebtCount}、拉力 ${segment.readerPullRiskCount}。`
      : `${segment.label}第${segment.chapterNos.join('、')}章核心、回报和追读拉力稳定。`,
  }))
  const hotspots = segments.filter(segment => segment.riskCount > 0).sort((a, b) => b.riskCount - a.riskCount)
  const riskCount = segments.reduce((sum, segment) => sum + Number(segment.riskCount || 0), 0)
  const coreRiskCount = segments.reduce((sum, segment) => sum + Number(segment.coreRiskCount || 0), 0)
  const topHotspot = hotspots[0] || null
  const rollbackPolicy = safeBatchExpansionRollbackPolicy({
    riskCount,
    coreRiskCount,
    hotspotLabel: topHotspot ? `${topHotspot.label}第${topHotspot.chapterNos.join('、')}章` : '',
  })

  return {
    visible: true,
    status: riskCount > 0 ? 'warn' : 'ok',
    label: '扩批分段复盘',
    summary: riskCount > 0
      ? `5章扩批${topHotspot?.label || '批次'}出现 ${riskCount} 项核心/回报/追读热区；${rollbackPolicy.summary}`
      : `5章扩批分段验收通过：前段、中段、后段核心守恒、读者回报和追读拉力稳定。`,
    targetChapterCount: policy.targetChapterCount,
    actualChapterCount: chapterRisks.length,
    riskCount,
    segments,
    hotspots,
    rollbackPolicy,
  }
}

export function safeBatchExpansionFeedbackSnapshot(feedback: AnyRecord) {
  return {
    visible: Boolean(feedback?.visible),
    status: text(feedback?.status, 'none'),
    label: text(feedback?.label, '扩批热区反馈'),
    summary: text(feedback?.summary),
    target_chapter_count: Number(feedback?.targetChapterCount || 0),
    latest_batch_created_at: text(feedback?.latestBatchCreatedAt),
    latest_chapter_nos: arrayValue(feedback?.latestChapterNos).map(chapterNo => Number(chapterNo)).filter(chapterNo => chapterNo > 0),
    risk_count: Number(feedback?.riskCount || 0),
    stable_pass_streak: Number(feedback?.stablePassStreak || 0),
    recent_expanded_batch_count: Number(feedback?.recentExpandedBatchCount || 0),
    repeated_hotspot_segment: feedback?.repeatedHotspotSegment ? {
      key: text(feedback.repeatedHotspotSegment?.key),
      label: text(feedback.repeatedHotspotSegment?.label),
      count: Number(feedback.repeatedHotspotSegment?.count || 0),
      summary: text(feedback.repeatedHotspotSegment?.summary),
      ...(text(feedback.repeatedHotspotSegment?.source) ? { source: text(feedback.repeatedHotspotSegment?.source) } : {}),
    } : null,
    ...(feedback?.recoveryRestoreStabilityEvidence ? {
      recovery_restore_stability_evidence: feedback.recoveryRestoreStabilityEvidence,
    } : {}),
    ...(feedback?.defaultFiveChapterRegression ? {
      default_five_chapter_regression: feedback.defaultFiveChapterRegression,
    } : {}),
    ...(feedback?.defaultFiveChapterRecoveryVerdictRelapse ? {
      default_five_chapter_recovery_verdict_relapse: feedback.defaultFiveChapterRecoveryVerdictRelapse,
    } : {}),
    rollback_policy: feedback?.rollbackPolicy ? {
      mode: text(feedback.rollbackPolicy?.mode),
      target_chapter_count: Number(feedback.rollbackPolicy?.targetChapterCount || 0),
      label: text(feedback.rollbackPolicy?.label),
      summary: text(feedback.rollbackPolicy?.summary),
    } : null,
    ...(feedback?.expansionStructureValidationResult ? {
      expansion_structure_validation_result: feedback.expansionStructureValidationResult,
    } : {}),
    ...(feedback?.expansionStructureValidationTrend ? {
      expansion_structure_validation_trend: feedback.expansionStructureValidationTrend,
    } : {}),
    ...(feedback?.defaultFiveChapterLaneTemplateStabilityProfile ? {
      default_five_chapter_lane_template_stability_profile: feedback.defaultFiveChapterLaneTemplateStabilityProfile,
    } : {}),
    ...(feedback?.expansionStructureRepairEffectiveness ? {
      expansion_structure_repair_effectiveness: feedback.expansionStructureRepairEffectiveness,
    } : {}),
    ...(feedback?.expansionStructureDecisionTrend ? {
      expansion_structure_decision_trend: feedback.expansionStructureDecisionTrend,
    } : {}),
  }
}

export function safeBatchExpansionItemsFromOutput(output: AnyRecord): AutoCreationBatchReviewItem[] {
  return arrayValue(output?.chapters).map(chapter => ({
    chapterId: chapter?.id ?? chapter?.chapter_id ?? null,
    chapterNo: Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0),
    title: text(chapter?.title, `第${Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0)}章`),
    status: text(chapter?.status) === 'failed' ? 'failed' as const : 'success' as const,
    score: Number.isFinite(Number(chapter?.score)) ? Number(chapter?.score) : null,
    wordCount: Number.isFinite(Number(chapter?.word_count ?? chapter?.wordCount)) ? Number(chapter?.word_count ?? chapter?.wordCount) : null,
    revised: Boolean(chapter?.revised),
    delivered: false,
    error: text(chapter?.error),
  })).filter(item => item.chapterNo > 0)
}

export function safeBatchExpansionChapterRisks(args: {
  items: AutoCreationBatchReviewItem[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  resolvedIssueKeys?: Set<string>
}) {
  return arrayValue(args.items)
    .filter(item => item.status === 'success')
    .map(item => {
      const chapter = findChapter(args.chapters, item)
      if (!chapter) {
        return {
          chapterNo: item.chapterNo,
          title: item.title,
          coreRiskCount: 0,
          payoffDebtCount: 0,
          readerPullRiskCount: 0,
          riskCount: 0,
        }
      }
      const coreReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'chapter_core_drift')
      const payoffReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_payoff_sync')
      const expectationReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_expectation_sync')
      const retentionReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_retention_sync')
      const coreCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'core_drift') ? 0 : coreRiskCount(coreReview)
      const payoffCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'reader_payoff_debt') ? 0 : payoffDebtCount(payoffReview)
      const readerPullCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'reader_pull_missed')
        ? 0
        : expectationRiskCount(expectationReview) + retentionRiskCount(retentionReview)
      return {
        chapterNo: item.chapterNo,
        title: item.title,
        coreRiskCount: coreCount,
        payoffDebtCount: payoffCount,
        readerPullRiskCount: readerPullCount,
        riskCount: coreCount + payoffCount + readerPullCount,
      }
    })
}

export function safeBatchExpansionSegmentResolvedForItems(
  resolvedIssueKeys: Set<string> | undefined,
  items: AutoCreationBatchReviewItem[],
  review: AnyRecord,
) {
  if (!resolvedIssueKeys || !items.length) return false
  const hotspotChapterNos = new Set(
    arrayValue(review?.hotspots)
      .flatMap(hotspot => arrayValue(hotspot?.chapterNos ?? hotspot?.chapter_nos))
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
  )
  const hotspotItems = hotspotChapterNos.size
    ? items.filter(item => hotspotChapterNos.has(Number(item.chapterNo || 0)))
    : []
  const candidates = hotspotItems.length ? hotspotItems : items
  return candidates.some(item => batchRiskIssueResolved(resolvedIssueKeys, item, 'safe_batch_expansion_segment_hotspot'))
    || items.some(item => batchRiskIssueResolved(resolvedIssueKeys, item, 'safe_batch_expansion_segment_hotspot'))
}

export function safeBatchExpansionEntryEvaluation(args: {
  entry: AnyRecord
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const rawReview = buildSafeBatchExpansionSegmentReview({
    preflight: args.entry.preflight,
    chapterRisks: safeBatchExpansionChapterRisks({
      items: args.entry.items,
      chapters: args.chapters,
      reviews: args.reviews,
    }),
  })
  const resolvedIssueKeys = buildResolvedBatchRiskIssueKeys({
    runRecords: args.runRecords,
    batchCreatedAt: text(args.entry.run?.created_at),
    chapters: args.chapters,
    reviews: args.reviews,
  })
  let effectiveReview = buildSafeBatchExpansionSegmentReview({
    preflight: args.entry.preflight,
    chapterRisks: safeBatchExpansionChapterRisks({
      items: args.entry.items,
      chapters: args.chapters,
      reviews: args.reviews,
      resolvedIssueKeys,
    }),
  })
  const segmentResolved = safeBatchExpansionSegmentResolvedForItems(resolvedIssueKeys, args.entry.items, rawReview)
  if (segmentResolved && effectiveReview.visible) {
    effectiveReview = {
      ...effectiveReview,
      status: 'ok' as const,
      riskCount: 0,
      hotspots: [],
      summary: '5章扩批分段热区已修复并通过复检。',
    }
  }
  const rawRiskCount = Number(rawReview.riskCount || 0)
  const effectiveRiskCount = Number(effectiveReview.riskCount || 0)
  const topHotspot = arrayValue(rawReview.hotspots)[0] || null
  return {
    source: text(args.entry.input?.source),
    recoveryRestoreConfirmation: safeBatchRecoveryRestoreConfirmationFromEntry(args.entry),
    recoveryRestoreValidationSegment: safeBatchRecoveryRestoreValidationSegmentFromEntry(args.entry),
    defaultFiveChapterLane: defaultFiveChapterLaneFromEntry(args.entry),
    defaultFiveChapterRecoveryVerdict: defaultFiveChapterRecoveryVerdictFromEntry(args.entry),
    rawReview,
    effectiveReview,
    segmentResolved,
    rawRiskCount,
    effectiveRiskCount,
    topHotspot,
    latestBatchCreatedAt: text(args.entry.run?.created_at),
    latestChapterNos: arrayValue(args.entry.items).map(item => Number(item?.chapterNo || 0)).filter(Boolean),
  }
}

export function safeBatchExpansionStructureValidationEntryEvaluation(args: {
  entry: AnyRecord
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const resolvedIssueKeys = buildResolvedBatchRiskIssueKeys({
    runRecords: args.runRecords,
    batchCreatedAt: text(args.entry.run?.created_at),
    chapters: args.chapters,
    reviews: args.reviews,
  })
  const result = buildSafeBatchExpansionStructureValidationResult({
    preflight: args.entry.preflight,
    chapters: args.chapters,
    chapterRisks: safeBatchExpansionChapterRisks({
      items: args.entry.items,
      chapters: args.chapters,
      reviews: args.reviews,
      resolvedIssueKeys,
    }),
  })
  return {
    result,
    latestBatchCreatedAt: text(args.entry.run?.created_at),
    latestChapterNos: arrayValue(args.entry.items).map(item => Number(item?.chapterNo || 0)).filter(Boolean),
  }
}

export function buildSafeBatchExpansionStructureValidationTrend(args: {
  validationEvaluations: AnyRecord[]
  expansionEvaluations: AnyRecord[]
}) {
  const validations = arrayValue(args.validationEvaluations)
    .filter(evaluation => evaluation?.result?.visible)
    .map(evaluation => {
      const result = evaluation.result || {}
      const repeated = result.repeated_hotspot_segment || result.repeatedHotspotSegment || null
      const segmentKey = text(repeated?.key, 'unknown')
      const segmentLabel = text(repeated?.label, segmentKey === 'unknown' ? '复发段位' : segmentKey)
      return {
        result,
        segmentKey,
        segmentLabel,
        createdAt: text(evaluation.latestBatchCreatedAt),
        chapterNos: arrayValue(evaluation.latestChapterNos || result.validation_chapter_nos || result.validationChapterNos)
          .map(chapterNo => Number(chapterNo))
          .filter(chapterNo => chapterNo > 0),
        riskCount: Number(result.risk_count || result.riskCount || 0),
        coreRiskCount: Number(result.core_risk_count || result.coreRiskCount || 0),
        payoffDebtCount: Number(result.payoff_debt_count || result.payoffDebtCount || 0),
        readerPullRiskCount: Number(result.reader_pull_risk_count || result.readerPullRiskCount || 0),
      }
    })
    .filter(record => record.segmentKey || record.segmentLabel)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  if (!validations.length) return null

  const latestSegmentKey = validations[0].segmentKey
  const segmentRecords = validations.filter(record => record.segmentKey === latestSegmentKey)
  const validationBatchCount = segmentRecords.length
  const passedBatchCount = segmentRecords.filter(record => record.riskCount <= 0).length
  const failedBatchCount = validationBatchCount - passedBatchCount
  const passRate = Math.round((passedBatchCount / Math.max(1, validationBatchCount)) * 100)
  const coreFailureCount = segmentRecords.reduce((sum, record) => sum + record.coreRiskCount, 0)
  const payoffFailureCount = segmentRecords.reduce((sum, record) => sum + record.payoffDebtCount, 0)
  const readerPullFailureCount = segmentRecords.reduce((sum, record) => sum + record.readerPullRiskCount, 0)
  const failureReasons = [
    { key: 'core', label: '核心偏移', count: coreFailureCount },
    { key: 'payoff', label: '回报欠账', count: payoffFailureCount },
    { key: 'reader_pull', label: '追读拉力', count: readerPullFailureCount },
  ].filter(item => item.count > 0)
  const latest = segmentRecords[0]
  const latestStatus = latest.riskCount > 0 ? 'warn' as const : 'ok' as const
  const latestPassed = segmentRecords.find(record => record.riskCount <= 0) || null
  const restoreTime = latestPassed ? Date.parse(latestPassed.createdAt) : 0
  const expandedAfterRestore = latestPassed
    ? arrayValue(args.expansionEvaluations)
      .filter(evaluation => Date.parse(text(evaluation?.latestBatchCreatedAt)) > restoreTime)
      .sort((a, b) => Date.parse(text(a?.latestBatchCreatedAt)) - Date.parse(text(b?.latestBatchCreatedAt)))
    : []
  const recurrenceIndex = expandedAfterRestore.findIndex(evaluation => {
    const hotspot = evaluation?.topHotspot || null
    return Number(evaluation?.rawRiskCount || 0) > 0 && text(hotspot?.key) === latestSegmentKey
  })
  const recurrenceEvaluation = recurrenceIndex >= 0 ? expandedAfterRestore[recurrenceIndex] : null
  const recurrenceHotspot = recurrenceEvaluation?.topHotspot || null
  const recurrenceAfterRestore = recurrenceEvaluation ? {
    visible: true,
    interval_batch_count: recurrenceIndex + 1,
    interval_label: `恢复5章后第${recurrenceIndex + 1}个扩批批次复发`,
    restored_batch_created_at: latestPassed?.createdAt || '',
    recurrence_batch_created_at: text(recurrenceEvaluation.latestBatchCreatedAt),
    recurrence_chapter_nos: arrayValue(recurrenceEvaluation.latestChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    repeated_hotspot_segment: {
      key: text(recurrenceHotspot?.key, latestSegmentKey),
      label: text(recurrenceHotspot?.label, latest.segmentLabel),
      count: Number(recurrenceHotspot?.riskCount || 0),
    },
  } : {
    visible: false,
    interval_batch_count: 0,
    interval_label: latestPassed ? '恢复5章后暂无同段复发' : '尚无通过的结构验证批',
    restored_batch_created_at: latestPassed?.createdAt || '',
    recurrence_batch_created_at: '',
    recurrence_chapter_nos: [],
    repeated_hotspot_segment: null,
  }
  const defaultRecoveryVerdictRelapseRecords = expandedAfterRestore
    .map(evaluation => {
      const relapse = evaluation?.defaultFiveChapterRecoveryVerdictRelapse
        || evaluation?.default_five_chapter_recovery_verdict_relapse
        || safeBatchDefaultFiveChapterRecoveryVerdictRelapse(evaluation)
        || null
      if (!relapse || relapse.visible === false) return null
      const hotspot = relapse.repeated_hotspot_segment || relapse.repeatedHotspotSegment || evaluation?.topHotspot || null
      const segmentKey = text(hotspot?.key)
      if (segmentKey && latestSegmentKey && segmentKey !== latestSegmentKey) return null
      const relapsedFailureReasons = arrayValue(relapse.relapsed_failure_reasons || relapse.relapsedFailureReasons)
        .map(item => text(item))
        .filter(Boolean)
      return {
        relapse,
        createdAt: text(evaluation?.latestBatchCreatedAt || relapse.relapse_batch_created_at || relapse.relapseBatchCreatedAt),
        chapterNos: arrayValue(relapse.relapse_batch_chapter_nos || relapse.relapseBatchChapterNos || evaluation?.latestChapterNos)
          .map(chapterNo => Number(chapterNo))
          .filter(chapterNo => chapterNo > 0),
        relapsedFailureReasons,
      }
    })
    .filter((item): item is AnyRecord => Boolean(item))
  const defaultRelapseReasonCounts = new Map<string, number>()
  defaultRecoveryVerdictRelapseRecords.forEach(record => {
    arrayValue(record.relapsedFailureReasons).forEach(reason => {
      const key = text(reason)
      if (!key) return
      defaultRelapseReasonCounts.set(key, (defaultRelapseReasonCounts.get(key) || 0) + 1)
    })
  })
  const defaultRecoveryVerdictRelapseTrend = defaultRecoveryVerdictRelapseRecords.length ? {
    visible: true,
    relapse_count: defaultRecoveryVerdictRelapseRecords.length,
    relapsed_failure_reasons: Array.from(defaultRelapseReasonCounts.keys()),
    repeated_failure_reasons: Array.from(defaultRelapseReasonCounts.entries())
      .map(([reason, count]) => ({ reason, count })),
    latest_relapse_batch_created_at: text(defaultRecoveryVerdictRelapseRecords[defaultRecoveryVerdictRelapseRecords.length - 1]?.createdAt),
    latest_relapse_chapter_nos: arrayValue(defaultRecoveryVerdictRelapseRecords[defaultRecoveryVerdictRelapseRecords.length - 1]?.chapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    summary: `恢复判定失效 ${defaultRecoveryVerdictRelapseRecords.length} 次：${Array.from(defaultRelapseReasonCounts.keys()).join('、') || '同维风险复发'}。`,
  } : null
  const failureSummary = failureReasons.length
    ? `，失败主因：${failureReasons.map(item => `${item.label}${item.count}`).join('、')}`
    : ''
  const recurrenceSummary = recurrenceAfterRestore.visible
    ? `，${recurrenceAfterRestore.interval_label}`
    : latestPassed
      ? '，恢复5章后暂无同段复发'
      : '，尚无通过的结构验证批'
  const defaultRelapseSummary = defaultRecoveryVerdictRelapseTrend
    ? `，${defaultRecoveryVerdictRelapseTrend.summary.replace(/。$/, '')}`
    : ''

  return {
    visible: true,
    status: latestStatus === 'warn' || recurrenceAfterRestore.visible ? 'warn' as const : 'ok' as const,
    label: '扩批结构验证趋势',
    summary: `${latest.segmentLabel}验证通过率 ${passRate}%（${passedBatchCount}/${validationBatchCount}批）${failureSummary}${recurrenceSummary}${defaultRelapseSummary}。`,
    segment_key: latestSegmentKey,
    segment_label: latest.segmentLabel,
    validation_batch_count: validationBatchCount,
    passed_batch_count: passedBatchCount,
    failed_batch_count: failedBatchCount,
    pass_rate: passRate,
    latest_status: latestStatus,
    latest_batch_created_at: latest.createdAt,
    latest_chapter_nos: latest.chapterNos,
    failure_reasons: failureReasons,
    recurrence_after_restore: recurrenceAfterRestore,
    ...(defaultRecoveryVerdictRelapseTrend ? {
      default_five_chapter_recovery_verdict_relapse_trend: defaultRecoveryVerdictRelapseTrend,
    } : {}),
  }
}

export function buildDefaultFiveChapterLaneTemplateStabilityProfile(args: {
  validationEvaluations: AnyRecord[]
  expansionEvaluations?: AnyRecord[]
}) {
  const verdictEvents = arrayValue(args.validationEvaluations)
    .map(evaluation => {
      const result = evaluation?.result || {}
      const verdict = result.default_five_chapter_lane_template_verdict
        || result.defaultFiveChapterLaneTemplateVerdict
        || null
      if (!verdict || verdict.visible === false) return null
      const status = text(verdict.status) === 'failed' ? 'failed' : 'passed'
      const missingRequirements = arrayValue(verdict.missing_requirements || verdict.missingRequirements)
        .map((item: AnyRecord) => ({
          key: text(item?.key),
          label: text(item?.label || item?.key, '模板缺项'),
          chapter_nos: arrayValue(item?.chapter_nos || item?.chapterNos)
            .map((chapterNo: any) => Number(chapterNo))
            .filter((chapterNo: number) => chapterNo > 0),
        }))
        .filter((item: AnyRecord) => item.key || item.label || item.chapter_nos.length)
      const productionRelapseVerdict = verdict.production_relapse_verdict
        || verdict.productionRelapseVerdict
        || null
      const productionFailedRequirements = arrayValue(verdict.production_failed_requirements || verdict.productionFailedRequirements || productionRelapseVerdict?.failed_requirements || productionRelapseVerdict?.failedRequirements)
        .map((item: AnyRecord) => ({
          key: text(item?.key),
          label: text(item?.label || item?.key, '模板缺项'),
          failure_reason: text(item?.failure_reason || item?.failureReason),
          chapter_nos: arrayValue(item?.chapter_nos || item?.chapterNos)
            .map((chapterNo: any) => Number(chapterNo))
            .filter((chapterNo: number) => chapterNo > 0),
        }))
        .filter((item: AnyRecord) => item.key || item.label || item.failure_reason || item.chapter_nos.length)
      const requirements = arrayValue(verdict.requirements)
        .map((item: AnyRecord) => ({
          key: text(item?.key),
          label: text(item?.label || item?.key, '模板要求'),
          status: text(item?.status, 'fulfilled'),
        }))
        .filter((item: AnyRecord) => item.key || item.label)
      const templateVersion = normalizeDefaultFiveChapterLaneTemplateVersion(
        verdict.template_version
        || verdict.templateVersion
        || verdict.default_five_chapter_lane_template
        || verdict.defaultFiveChapterLaneTemplate,
      )
      return {
        status,
        createdAt: text(evaluation.latestBatchCreatedAt),
        chapterNos: arrayValue(evaluation.latestChapterNos || verdict.validation_chapter_nos || verdict.validationChapterNos)
          .map((chapterNo: any) => Number(chapterNo))
          .filter((chapterNo: number) => chapterNo > 0),
        summary: text(verdict.summary),
        missingCount: Number(verdict.missing_count ?? verdict.missingCount ?? missingRequirements.reduce((sum: number, item: AnyRecord) => sum + item.chapter_nos.length, 0)),
        missingRequirements,
        productionRelapseVerdict,
        productionFailedRequirements,
        requirements,
        templateVersion,
      }
    })
    .filter(Boolean)

  if (!verdictEvents.length) return null

  const latest = verdictEvents[0]
  const productionRelapses = arrayValue(args.expansionEvaluations)
    .map(evaluation => safeBatchDefaultFiveChapterRegression(evaluation))
    .filter((regression: AnyRecord | null) => regression && regression.visible !== false && text(regression.template_version_id || regression.templateVersionId)) as AnyRecord[]
  const latestProductionRelapse = productionRelapses
    .slice()
    .sort((a, b) => Date.parse(text(b.default_batch_created_at || b.defaultBatchCreatedAt)) - Date.parse(text(a.default_batch_created_at || a.defaultBatchCreatedAt)))[0] || null
  let passStreak = 0
  for (const event of verdictEvents) {
    if (event.status !== 'passed') break
    passStreak += 1
  }
  const validationBatchCount = verdictEvents.length
  const passedBatchCount = verdictEvents.filter(event => event.status === 'passed').length
  const failedBatchCount = validationBatchCount - passedBatchCount
  const requiredPassStreak = 2
  const allRequirementLabels = new Map(
    DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => [requirement.key, requirement.label]),
  )
  verdictEvents.forEach(event => {
    arrayValue(event.requirements).forEach((requirement: AnyRecord) => {
      const key = text(requirement?.key)
      if (key) allRequirementLabels.set(key, text(requirement?.label, key))
    })
    arrayValue(event.missingRequirements).forEach((requirement: AnyRecord) => {
      const key = text(requirement?.key)
      if (key) allRequirementLabels.set(key, text(requirement?.label, key))
    })
    arrayValue(event.productionFailedRequirements).forEach((requirement: AnyRecord) => {
      const key = text(requirement?.key)
      if (key) allRequirementLabels.set(key, text(requirement?.label, key))
    })
  })
  const requirementStats = Array.from(allRequirementLabels.entries()).map(([key, label]) => {
    const failedEvents = verdictEvents.filter(event => (
      arrayValue(event.missingRequirements).some((item: AnyRecord) => text(item?.key) === key)
      || arrayValue(event.productionFailedRequirements).some((item: AnyRecord) => text(item?.key) === key)
    ))
    const latestRequirement = arrayValue(latest.requirements).find((item: AnyRecord) => text(item?.key) === key)
    return {
      key,
      label,
      passed_count: validationBatchCount - failedEvents.length,
      failed_count: failedEvents.length,
      latest_status: text(latestRequirement?.status, failedEvents.some(event => event === latest) ? 'missing' : 'fulfilled'),
      latest_missing_chapter_nos: arrayValue(latest.missingRequirements)
        .filter((item: AnyRecord) => text(item?.key) === key)
        .flatMap((item: AnyRecord) => arrayValue(item.chapter_nos))
        .map((chapterNo: any) => Number(chapterNo))
        .filter((chapterNo: number) => chapterNo > 0),
      latest_failure_reason: text(arrayValue(latest.productionFailedRequirements).find((item: AnyRecord) => text(item?.key) === key)?.failure_reason),
    }
  })
  const failedRequirementCount = requirementStats.reduce((sum, item) => sum + item.failed_count, 0)
  const topFailedRequirement = requirementStats
    .filter(item => item.failed_count > 0)
    .sort((a, b) => b.failed_count - a.failed_count)[0] || null
  const templateVersionProfiles = Array.from(new Set([
    ...verdictEvents
      .map(event => text(event.templateVersion?.id))
      .filter(Boolean),
    ...productionRelapses
      .map(regression => text(regression.template_version_id || regression.templateVersionId))
      .filter(Boolean),
  ])).map(versionId => {
    const versionEvents = verdictEvents.filter(event => text(event.templateVersion?.id) === versionId)
    const latestVersionEvent = versionEvents[0]
    const versionProductionRelapses = productionRelapses
      .filter(regression => text(regression.template_version_id || regression.templateVersionId) === versionId)
      .sort((a, b) => Date.parse(text(b.default_batch_created_at || b.defaultBatchCreatedAt)) - Date.parse(text(a.default_batch_created_at || a.defaultBatchCreatedAt)))
    const latestVersionProductionRelapse = versionProductionRelapses[0] || null
    let versionPassStreak = 0
    for (const event of versionEvents) {
      if (event.status !== 'passed') break
      versionPassStreak += 1
    }
    const versionPassedBatchCount = versionEvents.filter(event => event.status === 'passed').length
    const versionFailedBatchCount = versionEvents.length - versionPassedBatchCount
    const versionFailedRequirementStats = DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => {
      const failedEvents = versionEvents.filter(event => (
        arrayValue(event.missingRequirements).some((item: AnyRecord) => text(item?.key) === requirement.key)
        || arrayValue(event.productionFailedRequirements).some((item: AnyRecord) => text(item?.key) === requirement.key)
      ))
      const latestProductionFailure = arrayValue(latestVersionEvent?.productionFailedRequirements)
        .find((item: AnyRecord) => text(item?.key) === requirement.key)
      return {
        key: requirement.key,
        label: requirement.label,
        failed_count: failedEvents.length,
        failure_reason: text(latestProductionFailure?.failure_reason),
      }
    })
    const versionTopFailedRequirement = versionFailedRequirementStats
      .filter(item => item.failed_count > 0)
      .sort((a, b) => b.failed_count - a.failed_count)[0] || null
    const productionFailedRequirements = arrayValue(latestVersionProductionRelapse?.template_version_failed_requirements || latestVersionProductionRelapse?.templateVersionFailedRequirements)
      .map((item: AnyRecord) => ({
        key: text(item?.key),
        label: text(item?.label || item?.key, '模板要求'),
        failure_reason: text(item?.failure_reason || item?.failureReason),
      }))
      .filter((item: AnyRecord) => item.key || item.label || item.failure_reason)
    const latestVersionStatus = latestVersionEvent?.status || ''
    const versionProductionValidationFailures = versionEvents
      .filter(event => text(event.productionRelapseVerdict?.status) === 'failed')
    const productionRelapseIsLatest = latestVersionProductionRelapse
      && (!latestVersionEvent || Date.parse(text(latestVersionProductionRelapse.default_batch_created_at || latestVersionProductionRelapse.defaultBatchCreatedAt)) > Date.parse(text(latestVersionEvent.createdAt)))
    const versionStatus = productionRelapseIsLatest
      ? versionProductionRelapses.length >= 2 ? 'redesign' : 'relapsed'
      : latestVersionStatus === 'passed'
        ? versionPassStreak >= requiredPassStreak ? 'ready' : 'observing'
        : versionFailedBatchCount >= 2 ? 'redesign' : 'relapsed'
    return {
      ...(latestVersionEvent?.templateVersion || latestVersionProductionRelapse?.template_version || latestVersionProductionRelapse?.templateVersion || {}),
      id: versionId,
      status: versionStatus,
      latest_status: productionRelapseIsLatest ? 'production_relapsed' : latestVersionStatus,
      latest_batch_created_at: productionRelapseIsLatest
        ? text(latestVersionProductionRelapse?.default_batch_created_at || latestVersionProductionRelapse?.defaultBatchCreatedAt)
        : text(latestVersionEvent?.createdAt),
      latest_chapter_nos: arrayValue(productionRelapseIsLatest
        ? latestVersionProductionRelapse?.default_batch_chapter_nos || latestVersionProductionRelapse?.defaultBatchChapterNos
        : latestVersionEvent?.chapterNos)
        .map((chapterNo: any) => Number(chapterNo))
        .filter((chapterNo: number) => chapterNo > 0),
      validation_batch_count: versionEvents.length,
      passed_batch_count: versionPassedBatchCount,
      failed_batch_count: versionFailedBatchCount,
      pass_streak: versionPassStreak,
      required_pass_streak: requiredPassStreak,
      production_relapse_count: versionProductionRelapses.length,
      production_validation_failed_count: versionProductionValidationFailures.length,
      ...(latestVersionEvent?.productionRelapseVerdict ? {
        latest_production_relapse_verdict: latestVersionEvent.productionRelapseVerdict,
      } : {}),
      ...(latestVersionProductionRelapse ? {
        latest_production_relapse: {
          default_batch_created_at: text(latestVersionProductionRelapse.default_batch_created_at || latestVersionProductionRelapse.defaultBatchCreatedAt),
          default_batch_chapter_nos: arrayValue(latestVersionProductionRelapse.default_batch_chapter_nos || latestVersionProductionRelapse.defaultBatchChapterNos)
            .map((chapterNo: any) => Number(chapterNo))
            .filter((chapterNo: number) => chapterNo > 0),
          failure_reasons: arrayValue(latestVersionProductionRelapse.failure_reasons || latestVersionProductionRelapse.failureReasons)
            .map((reason: any) => text(reason))
            .filter(Boolean),
          failed_requirements: productionFailedRequirements,
          summary: text(latestVersionProductionRelapse.summary),
        },
      } : {}),
      ...(versionTopFailedRequirement ? { top_failed_requirement: versionTopFailedRequirement } : {}),
      ...(arrayValue(latestVersionEvent?.productionFailedRequirements).length ? {
        production_validation_failed_requirements: latestVersionEvent.productionFailedRequirements,
      } : {}),
      ...(productionFailedRequirements.length ? { production_failed_requirements: productionFailedRequirements } : {}),
    }
  })
  const latestTemplateVersionProfile = latestProductionRelapse
    ? templateVersionProfiles.find(item => text(item.id) === text(latestProductionRelapse.template_version_id || latestProductionRelapse.templateVersionId)) || null
    : latest.templateVersion
      ? templateVersionProfiles.find(item => text(item.id) === text(latest.templateVersion?.id)) || null
      : null
  const productionRelapseIsLatest = latestProductionRelapse
    && Date.parse(text(latestProductionRelapse.default_batch_created_at || latestProductionRelapse.defaultBatchCreatedAt)) > Date.parse(text(latest.createdAt))
  const latestStatus = productionRelapseIsLatest ? 'production_relapsed' : latest.status
  const repeatedLatestFailure = latestStatus === 'failed'
    && arrayValue(latest.missingRequirements).some((item: AnyRecord) => {
      const key = text(item?.key)
      return key && (requirementStats.find(requirement => requirement.key === key)?.failed_count || 0) >= 2
    })
  const status = productionRelapseIsLatest
    ? 'relapsed'
    : latestStatus === 'passed'
    ? passStreak >= requiredPassStreak ? 'ready' : 'observing'
    : repeatedLatestFailure ? 'redesign' : 'relapsed'
  const recommendation = status === 'ready'
    ? 'restore_default_lane'
    : status === 'observing'
      ? 'continue_validation'
      : status === 'redesign'
        ? 'escalate_template_redesign'
        : 'repair_template'
  const latestChapterText = compactChapterNoEvidence(latest.chapterNos)
  const topFailureText = topFailedRequirement ? `${topFailedRequirement.label}失败 ${topFailedRequirement.failed_count} 次` : ''
  const latestVersionText = latestTemplateVersionProfile?.id
    ? `版本 ${latestTemplateVersionProfile.id} 连过 ${latestTemplateVersionProfile.pass_streak}/${latestTemplateVersionProfile.required_pass_streak} 批；`
    : ''
  const summary = productionRelapseIsLatest
    ? `默认档位模板版本 ${text(latestTemplateVersionProfile?.id, '当前版本')} 在真实5章生产复发，${arrayValue(latestProductionRelapse?.failure_reasons || latestProductionRelapse?.failureReasons).map(item => text(item)).filter(Boolean).join('、') || '核心/回报/追读'}需要回写版本画像和模板重构队列。`
    : status === 'ready'
    ? `默认档位模板连续 ${passStreak} 批通过，${latestChapterText}四项模板稳定，可作为恢复默认5章档位证据。`
    : status === 'observing'
      ? `默认档位模板最近通过，${latestVersionText}但历史仍有${topFailureText || '模板缺项'}；继续3章观察 ${passStreak}/${requiredPassStreak} 批，确认四项模板不复发后再恢复默认5章。`
      : status === 'redesign'
        ? `默认档位模板同项复发，${topFailureText || '模板缺项'}需要升级模板重构，暂缓恢复默认5章档位。`
        : `默认档位模板最近复发，${text(latest.summary, topFailureText || '模板缺项未清')}；先修复模板缺项并回到3章验证批。`

  return {
    visible: true,
    status,
    label: '默认档位模板稳定性',
    summary,
    latest_status: latestStatus,
    latest_batch_created_at: productionRelapseIsLatest
      ? text(latestProductionRelapse?.default_batch_created_at || latestProductionRelapse?.defaultBatchCreatedAt)
      : latest.createdAt,
    latest_chapter_nos: productionRelapseIsLatest
      ? arrayValue(latestProductionRelapse?.default_batch_chapter_nos || latestProductionRelapse?.defaultBatchChapterNos)
        .map((chapterNo: any) => Number(chapterNo))
        .filter((chapterNo: number) => chapterNo > 0)
      : latest.chapterNos,
    validation_batch_count: validationBatchCount,
    passed_batch_count: passedBatchCount,
    failed_batch_count: failedBatchCount,
    pass_streak: passStreak,
    required_pass_streak: requiredPassStreak,
    failed_requirement_count: failedRequirementCount,
    recommendation,
    requirements: requirementStats,
    ...(topFailedRequirement ? { top_failed_requirement: topFailedRequirement } : {}),
    ...(templateVersionProfiles.length ? { template_version_profiles: templateVersionProfiles } : {}),
    ...(latestTemplateVersionProfile ? { latest_template_version_profile: latestTemplateVersionProfile } : {}),
  }
}

export function safeBatchExpansionStructureTrendFailureCount(trend?: AnyRecord | null) {
  return arrayValue(trend?.failure_reasons || trend?.failureReasons)
    .reduce((sum, item) => sum + Number(item?.count || 0), 0)
}

export function safeBatchDefaultRecoveryVerdictRelapseTrend(trend?: AnyRecord | null) {
  const relapseTrend = trend?.default_five_chapter_recovery_verdict_relapse_trend
    || trend?.defaultFiveChapterRecoveryVerdictRelapseTrend
    || null
  if (!relapseTrend || relapseTrend.visible === false) return null
  return relapseTrend
}

export function safeBatchDefaultRecoveryVerdictRelapseTrendCount(trend?: AnyRecord | null) {
  const relapseTrend = safeBatchDefaultRecoveryVerdictRelapseTrend(trend)
  return relapseTrend ? Number(relapseTrend.relapse_count ?? relapseTrend.relapseCount ?? 0) : 0
}

export function safeBatchDefaultRecoveryVerdictRelapseReasonCounts(trend?: AnyRecord | null) {
  const relapseTrend = safeBatchDefaultRecoveryVerdictRelapseTrend(trend)
  const counts = new Map<string, number>()
  if (!relapseTrend) return counts
  arrayValue(relapseTrend.repeated_failure_reasons || relapseTrend.repeatedFailureReasons).forEach(item => {
    const reason = text(item?.reason || item?.label || item)
    if (!reason) return
    const count = Number(item?.count ?? 1)
    counts.set(reason, (counts.get(reason) || 0) + Math.max(1, Number.isFinite(count) ? count : 1))
  })
  arrayValue(relapseTrend.relapsed_failure_reasons || relapseTrend.relapsedFailureReasons).forEach(item => {
    const reason = text(item)
    if (!reason || counts.has(reason)) return
    counts.set(reason, 1)
  })
  return counts
}

export function safeBatchExpansionStructureTrendRecurrenceInterval(trend?: AnyRecord | null) {
  const recurrence = trend?.recurrence_after_restore || trend?.recurrenceAfterRestore || null
  return recurrence?.visible ? Number(recurrence?.interval_batch_count ?? recurrence?.intervalBatchCount ?? 0) : 0
}

export function latestResolvedSafeBatchExpansionStructureRepairWithTrend(runRecords: AnyRecord[]) {
  const repairEntries = arrayValue(runRecords)
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .map(run => ({
      run,
      input: parsePayload(run?.input_ref, { owner: run, kind: 'run', field: 'input_ref' }) || {},
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => text(entry.input?.source) === 'auto_creation_safe_batch_risk')
    .filter(entry => isCompletedRepairRun(entry.run))
    .sort((a, b) => recordTime(b.run) - recordTime(a.run))

  for (const entry of repairEntries) {
    const tasks = [
      ...arrayValue(entry.output?.tasks),
      ...arrayValue(entry.output?.repairTasks),
    ]
    for (const task of tasks) {
      if (text(task?.issue_type ?? task?.issueType) !== 'safe_batch_expansion_structure_repair') continue
      if (!isResolvedTaskStatus(task?.task_status ?? task?.status)) continue
      const review = task?.safe_batch_expansion_structure_review
        || task?.safeBatchExpansionStructureReview
        || task?.structure_review
        || task?.structureReview
        || {}
      const trend = review?.expansion_structure_validation_trend
        || review?.expansionStructureValidationTrend
        || task?.expansion_structure_validation_trend
        || task?.expansionStructureValidationTrend
        || null
      if (!trend || trend.visible === false) continue
      const repeated = review?.repeated_hotspot_segment
        || review?.repeatedHotspotSegment
        || trend?.repeated_hotspot_segment
        || trend?.repeatedHotspotSegment
        || null
      const segmentKey = text(trend?.segment_key || trend?.segmentKey || repeated?.key, 'unknown')
      const segmentLabel = text(trend?.segment_label || trend?.segmentLabel || repeated?.label, segmentKey === 'unknown' ? '复发段位' : segmentKey)
      return {
        sourceRunId: entry.run?.id ?? null,
        repairedAt: text(entry.run?.completed_at || entry.run?.finished_at || entry.run?.updated_at || entry.run?.created_at),
        segmentKey,
        segmentLabel,
        trend,
      }
    }
  }
  return null
}

export function buildSafeBatchExpansionStructureRepairEffectiveness(args: {
  runRecords: AnyRecord[]
  validationEvaluations: AnyRecord[]
  expansionEvaluations: AnyRecord[]
}) {
  const repair = latestResolvedSafeBatchExpansionStructureRepairWithTrend(args.runRecords)
  if (!repair) return null
  const repairedAtMs = Date.parse(repair.repairedAt)
  if (!Number.isFinite(repairedAtMs)) return null
  const segmentKey = repair.segmentKey
  const postValidationEvaluations = arrayValue(args.validationEvaluations)
    .filter(evaluation => Date.parse(text(evaluation?.latestBatchCreatedAt)) > repairedAtMs)
    .filter(evaluation => {
      const repeated = evaluation?.result?.repeated_hotspot_segment || evaluation?.result?.repeatedHotspotSegment || null
      return text(repeated?.key, 'unknown') === segmentKey
    })
  if (!postValidationEvaluations.length) return null
  const postExpansionEvaluations = arrayValue(args.expansionEvaluations)
    .filter(evaluation => Date.parse(text(evaluation?.latestBatchCreatedAt)) > repairedAtMs)
  const currentTrend = buildSafeBatchExpansionStructureValidationTrend({
    validationEvaluations: postValidationEvaluations,
    expansionEvaluations: postExpansionEvaluations,
  })
  if (!currentTrend) return null

  const baselinePassRate = Number(repair.trend?.pass_rate ?? repair.trend?.passRate ?? 0)
  const currentPassRate = Number(currentTrend.pass_rate || 0)
  const baselineFailureReasonCount = safeBatchExpansionStructureTrendFailureCount(repair.trend)
  const currentFailureReasonCount = safeBatchExpansionStructureTrendFailureCount(currentTrend)
  const baselineRecurrenceInterval = safeBatchExpansionStructureTrendRecurrenceInterval(repair.trend)
  const currentRecurrenceInterval = safeBatchExpansionStructureTrendRecurrenceInterval(currentTrend)
  const baselineRelapseCount = safeBatchDefaultRecoveryVerdictRelapseTrendCount(repair.trend)
  const currentRelapseCount = safeBatchDefaultRecoveryVerdictRelapseTrendCount(currentTrend)
  const baselineRelapseReasonCounts = safeBatchDefaultRecoveryVerdictRelapseReasonCounts(repair.trend)
  const currentRelapseReasonCounts = safeBatchDefaultRecoveryVerdictRelapseReasonCounts(currentTrend)
  const repeatedRelapseReasons = Array.from(new Set([
    ...baselineRelapseReasonCounts.keys(),
    ...currentRelapseReasonCounts.keys(),
  ]))
    .filter(reason => (baselineRelapseReasonCounts.get(reason) || 0) > 0 && (currentRelapseReasonCounts.get(reason) || 0) > 0)
    .map(reason => ({
      reason,
      count: (baselineRelapseReasonCounts.get(reason) || 0) + (currentRelapseReasonCounts.get(reason) || 0),
    }))
  const repeatedRelapseCount = repeatedRelapseReasons.length > 0 ? baselineRelapseCount + currentRelapseCount : 0
  const defaultRecoveryVerdictRelapseRepeated = repeatedRelapseCount >= 2 && repeatedRelapseReasons.length > 0
  const currentRecurrence = currentTrend.recurrence_after_restore || null
  const passRateDelta = currentPassRate - baselinePassRate
  const failureReasonDelta = currentFailureReasonCount - baselineFailureReasonCount
  const recurrenceImproved = baselineRecurrenceInterval > 0
    ? !currentRecurrence?.visible || currentRecurrenceInterval > baselineRecurrenceInterval
    : !currentRecurrence?.visible
  const improved = passRateDelta > 0 || failureReasonDelta < 0 || recurrenceImproved
  const regressed = passRateDelta < 0 || failureReasonDelta > 0 || (currentRecurrence?.visible && currentRecurrenceInterval > 0 && currentRecurrenceInterval <= baselineRecurrenceInterval)
  const status = defaultRecoveryVerdictRelapseRepeated ? 'warn' as const : improved && !regressed ? 'ok' as const : 'warn' as const
  const recommendation = defaultRecoveryVerdictRelapseRepeated
    ? 'escalate_structure_redesign'
    : status === 'ok' && currentPassRate >= 100 && currentFailureReasonCount <= 0 && !currentRecurrence?.visible
    ? 'restore_five_chapter'
    : status === 'ok'
      ? 'continue_small_validation'
      : 'escalate_structure_redesign'
  const recurrenceSummary = currentRecurrence?.visible
    ? `修复后${currentRecurrence.interval_label || `第${currentRecurrenceInterval}个扩批批次复发`}`
    : '修复后暂无同段复发'
  const defaultRecoveryVerdictRelapseTrend = baselineRelapseCount > 0 || currentRelapseCount > 0 ? {
    visible: true,
    baseline_relapse_count: baselineRelapseCount,
    current_relapse_count: currentRelapseCount,
    repeated_relapse_count: repeatedRelapseCount,
    repeated_failure_reasons: repeatedRelapseReasons,
    recommendation: defaultRecoveryVerdictRelapseRepeated ? 'escalate_structure_redesign' : 'continue_validation',
    summary: defaultRecoveryVerdictRelapseRepeated
      ? `连续 ${repeatedRelapseCount} 次恢复判定失效：${repeatedRelapseReasons.map(item => item.reason).join('、')}同维复发，默认档位结构重构。`
      : `恢复判定失效观察：修复前 ${baselineRelapseCount} 次，修复后 ${currentRelapseCount} 次。`,
  } : null
  const defaultRelapseSummary = defaultRecoveryVerdictRelapseRepeated
    ? `，${text(defaultRecoveryVerdictRelapseTrend?.summary, `连续 ${repeatedRelapseCount} 次恢复判定失效，默认档位结构重构。`).replace(/。$/, '')}`
    : ''

  return {
    visible: true,
    status,
    label: '结构修复有效性',
    summary: `${repair.segmentLabel}结构修复有效性：通过率 ${baselinePassRate}% -> ${currentPassRate}%，失败主因 ${baselineFailureReasonCount} -> ${currentFailureReasonCount}，${recurrenceSummary}${defaultRelapseSummary}。`,
    source_run_id: repair.sourceRunId,
    repaired_at: repair.repairedAt,
    segment_key: segmentKey,
    segment_label: repair.segmentLabel,
    baseline_pass_rate: baselinePassRate,
    current_pass_rate: currentPassRate,
    pass_rate_delta: passRateDelta,
    baseline_failure_reason_count: baselineFailureReasonCount,
    current_failure_reason_count: currentFailureReasonCount,
    failure_reason_delta: failureReasonDelta,
    baseline_recurrence_interval_batch_count: baselineRecurrenceInterval,
    current_recurrence_interval_batch_count: currentRecurrenceInterval,
    recommendation,
    baseline_trend: repair.trend,
    current_trend: currentTrend,
    ...(defaultRecoveryVerdictRelapseTrend ? {
      default_five_chapter_recovery_verdict_relapse_trend: defaultRecoveryVerdictRelapseTrend,
    } : {}),
  }
}

export function isSafeBatchGenerationSource(source: string) {
  return source === 'auto_creation_safe_batch'
    || source === 'safe_batch_recovery_validation_batch'
    || source === 'safe_batch_recovery_restore_five_batch'
}

export function safeBatchRecoveryRestoreConfirmationFromEntry(entry: AnyRecord) {
  return entry?.input?.recovery_restore_confirmation
    || entry?.input?.recoveryRestoreConfirmation
    || entry?.preflight?.safe_batch_recovery_restore_confirmation
    || entry?.preflight?.safeBatchRecoveryRestoreConfirmation
    || null
}

export function safeBatchRecoveryRestoreValidationSegmentFromEntry(entry: AnyRecord) {
  const policy = entry?.preflight?.safe_batch_expansion_policy || entry?.preflight?.safeBatchExpansionPolicy || null
  const feedback = policy?.expansion_feedback || policy?.expansionFeedback || null
  const validation = feedback?.expansion_structure_validation_result
    || feedback?.expansionStructureValidationResult
    || null
  const segment = validation?.repeated_hotspot_segment
    || validation?.repeatedHotspotSegment
    || feedback?.repeated_hotspot_segment
    || feedback?.repeatedHotspotSegment
    || null
  if (!segment) return null
  const key = text(segment?.key)
  const label = text(segment?.label, key || '复发段位')
  return {
    key,
    label,
    count: Math.max(0, Number(segment?.count || 0)),
  }
}

export function defaultFiveChapterRecoveryVerdictFromSource(source?: AnyRecord | null) {
  if (!source) return null
  const verdict = source.default_five_chapter_recovery_verdict
    || source.defaultFiveChapterRecoveryVerdict
    || null
  if (!verdict || verdict.visible === false) return null
  return verdict
}

export function defaultFiveChapterRecoveryVerdictFromEntry(entry: AnyRecord) {
  const input = entry?.input || {}
  const preflight = entry?.preflight || {}
  const policy = preflight.safe_batch_expansion_policy || preflight.safeBatchExpansionPolicy || null
  const feedback = policy?.expansion_feedback || policy?.expansionFeedback || null
  const sources = [
    input,
    input.recovery_restore_confirmation || input.recoveryRestoreConfirmation,
    input.recovery_restore_stability_evidence || input.recoveryRestoreStabilityEvidence,
    input.default_five_chapter_lane || input.defaultFiveChapterLane,
    preflight.safe_batch_recovery_restore_confirmation || preflight.safeBatchRecoveryRestoreConfirmation,
    preflight.safe_batch_recovery_restore_stability_lane || preflight.safeBatchRecoveryRestoreStabilityLane,
    feedback?.recovery_restore_stability_evidence || feedback?.recoveryRestoreStabilityEvidence,
    feedback?.expansion_structure_validation_result || feedback?.expansionStructureValidationResult,
  ]
  for (const source of sources) {
    const verdict = defaultFiveChapterRecoveryVerdictFromSource(source)
    if (verdict) return verdict
  }
  return null
}

export function defaultFiveChapterLaneFromEntry(entry: AnyRecord) {
  return entry?.input?.default_five_chapter_lane
    || entry?.input?.defaultFiveChapterLane
    || entry?.preflight?.safe_batch_recovery_restore_stability_lane
    || entry?.preflight?.safeBatchRecoveryRestoreStabilityLane
    || null
}

export function safeBatchRecoveryRestoreStabilityEvidence(evaluation: AnyRecord | null | undefined, stablePassStreak: number) {
  if (!evaluation || text(evaluation.source) !== 'safe_batch_recovery_restore_five_batch') return null
  const validationChapterNos = arrayValue(evaluation.recoveryRestoreConfirmation?.validation_chapter_nos || evaluation.recoveryRestoreConfirmation?.validationChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const restoreChapterNos = arrayValue(evaluation.latestChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const defaultFiveChapterRecoveryVerdict = defaultFiveChapterRecoveryVerdictFromSource(evaluation.recoveryRestoreConfirmation)
    || evaluation.defaultFiveChapterRecoveryVerdict
    || null
  return {
    status: Number(evaluation.rawRiskCount || 0) > 0 ? 'relapsed' : 'passed',
    source: 'safe_batch_recovery_restore_five_batch',
    restored_batch_created_at: text(evaluation.latestBatchCreatedAt),
    restore_chapter_nos: restoreChapterNos,
    validation_chapter_nos: validationChapterNos,
    stable_pass_streak: Math.max(0, Number(stablePassStreak || 0)),
    summary: Number(evaluation.rawRiskCount || 0) > 0
      ? `恢复5章扩批稳定观察发现复发：${compactChapterNoEvidence(restoreChapterNos)}仍有核心/回报/追读热区。`
      : `恢复5章扩批稳定观察通过：${compactChapterNoEvidence(validationChapterNos)}验证批之后，${compactChapterNoEvidence(restoreChapterNos)}继续保持核心守恒、显性回报和章末追读稳定。`,
    ...(defaultFiveChapterRecoveryVerdict ? {
      default_five_chapter_recovery_verdict: defaultFiveChapterRecoveryVerdict,
    } : {}),
  }
}

export function safeBatchDefaultFiveChapterRecoveryVerdictRelapse(evaluation: AnyRecord | null | undefined) {
  if (!evaluation || Number(evaluation.rawRiskCount || 0) <= 0 || !evaluation.topHotspot) return null
  const verdict = evaluation.defaultFiveChapterRecoveryVerdict
    || defaultFiveChapterRecoveryVerdictFromSource(evaluation.defaultFiveChapterLane)
    || defaultFiveChapterRecoveryVerdictFromSource(evaluation.recoveryRestoreConfirmation)
    || null
  if (!verdict || text(verdict.status) !== 'passed') return null
  const failureReasons = arrayValue(verdict.cleared_failure_reasons || verdict.clearedFailureReasons)
    .concat(arrayValue(verdict.failure_reasons || verdict.failureReasons))
    .map(item => text(item))
    .filter(Boolean)
  const uniqueFailureReasons = Array.from(new Set(failureReasons))
  if (!uniqueFailureReasons.length) return null
  const hotspot = evaluation.topHotspot || {}
  const counts = {
    riskCount: Number(hotspot.riskCount || hotspot.risk_count || 0),
    coreRiskCount: Number(hotspot.coreRiskCount || hotspot.core_risk_count || 0),
    payoffDebtCount: Number(hotspot.payoffDebtCount || hotspot.payoff_debt_count || 0),
    readerPullRiskCount: Number(hotspot.readerPullRiskCount || hotspot.reader_pull_risk_count || 0),
  }
  const reasonStatuses = uniqueFailureReasons.map(reason => {
    const riskCount = safeBatchDefaultRecoveryRiskCountForReason(reason, counts)
    return {
      reason,
      status: riskCount > 0 ? 'relapsed' : 'stable',
      risk_count: riskCount,
    }
  })
  const relapsedFailureReasons = reasonStatuses
    .filter(item => item.status === 'relapsed')
    .map(item => item.reason)
  if (!relapsedFailureReasons.length) return null
  const stableFailureReasons = reasonStatuses
    .filter(item => item.status === 'stable')
    .map(item => item.reason)
  const relapseBatchChapterNos = arrayValue(evaluation.latestChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const relapsedChapterNos = arrayValue(hotspot.chapterNos || hotspot.chapter_nos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const validationChapterNos = arrayValue(verdict.validation_chapter_nos || verdict.validationChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const segmentLabel = text(hotspot.label, text(hotspot.key, '复发段位'))
  const relapseChapterText = relapsedChapterNos.length ? compactChapterNoEvidence(relapsedChapterNos) : compactChapterNoEvidence(relapseBatchChapterNos)
  return {
    visible: true,
    status: 'relapsed',
    label: '恢复判定失效',
    source: 'default_five_chapter_recovery_verdict',
    summary: `恢复判定失效 -> 回到3章验证批：${relapsedFailureReasons.join('、')}在${segmentLabel}${relapseChapterText}复发，${compactChapterNoEvidence(validationChapterNos)}清零证据失效。`,
    default_batch_chapter_nos: arrayValue(verdict.default_batch_chapter_nos || verdict.defaultBatchChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    restore_chapter_nos: arrayValue(verdict.restore_chapter_nos || verdict.restoreChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    previous_validation_chapter_nos: arrayValue(verdict.previous_validation_chapter_nos || verdict.previousValidationChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    validation_chapter_nos: validationChapterNos,
    relapse_batch_chapter_nos: relapseBatchChapterNos,
    relapsed_chapter_nos: relapsedChapterNos,
    repeated_hotspot_segment: {
      key: text(hotspot.key),
      label: segmentLabel,
      risk_count: counts.riskCount,
      core_risk_count: counts.coreRiskCount,
      payoff_debt_count: counts.payoffDebtCount,
      reader_pull_risk_count: counts.readerPullRiskCount,
    },
    failure_reasons: uniqueFailureReasons,
    cleared_failure_reasons: uniqueFailureReasons,
    relapsed_failure_reasons: relapsedFailureReasons,
    stable_failure_reasons: stableFailureReasons,
    failure_reason_statuses: reasonStatuses,
  }
}

export function defaultFiveChapterLaneTemplateVersionFromLane(lane: AnyRecord | null | undefined) {
  if (!lane) return null
  const rawVersion = lane.latest_template_version_profile
    || lane.latestTemplateVersionProfile
    || lane.template_version
    || lane.templateVersion
    || null
  const normalizedProfile = latestDefaultFiveChapterLaneTemplateVersionProfile({ latest_template_version_profile: rawVersion })
  const normalizedTemplate = normalizeDefaultFiveChapterLaneTemplateVersion(rawVersion)
  const explicitId = firstText(lane.template_version_id, lane.templateVersionId)
  const version = normalizedProfile || normalizedTemplate || null
  const id = explicitId || text(version?.id)
  if (!id && !version) return null
  return {
    ...(version || {}),
    id: id || text(version?.id),
    label: firstText(version?.label, '默认5章档位模板版本'),
  }
}

export function defaultFiveChapterLaneTemplateRequirementForFailureReason(reason: string) {
  if (reason === '核心偏移') {
    return {
      key: 'default_lane_segment_duty',
      label: '默认档位段位职责',
      failure_reason: reason,
    }
  }
  if (reason === '回报欠账') {
    return {
      key: 'default_lane_payoff_density',
      label: '回报密度',
      failure_reason: reason,
    }
  }
  if (reason === '追读拉力') {
    return {
      key: 'default_lane_ending_hook_template',
      label: '章末追读模板',
      failure_reason: reason,
    }
  }
  return {
    key: 'default_lane_conflict_rotation',
    label: '冲突轮换',
    failure_reason: reason,
  }
}

export function defaultFiveChapterLaneTemplateRequirementsForFailureReasons(reasons: string[]) {
  const byKey = new Map<string, AnyRecord>()
  reasons.forEach(reason => {
    const requirement = defaultFiveChapterLaneTemplateRequirementForFailureReason(reason)
    byKey.set(requirement.key, requirement)
  })
  return Array.from(byKey.values())
}

export function safeBatchDefaultFiveChapterRegression(evaluation: AnyRecord | null | undefined) {
  if (!evaluation || text(evaluation.source) !== 'auto_creation_safe_batch') return null
  const lane = evaluation.defaultFiveChapterLane || null
  if (!lane || Number(evaluation.rawRiskCount || 0) <= 0 || !evaluation.topHotspot) return null
  const defaultReady = lane.default_five_chapter_ready ?? lane.defaultFiveChapterReady
  if (defaultReady === false || text(lane.status) !== 'ready') return null
  const defaultBatchChapterNos = arrayValue(evaluation.latestChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const restoreChapterNos = arrayValue(lane.restore_chapter_nos || lane.restoreChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const validationChapterNos = arrayValue(lane.validation_chapter_nos || lane.validationChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const hotspot = evaluation.topHotspot || {}
  const failureReasons = [
    Number(hotspot.coreRiskCount || hotspot.core_risk_count || 0) > 0 ? '核心偏移' : '',
    Number(hotspot.payoffDebtCount || hotspot.payoff_debt_count || 0) > 0 ? '回报欠账' : '',
    Number(hotspot.readerPullRiskCount || hotspot.reader_pull_risk_count || 0) > 0 ? '追读拉力' : '',
  ].filter(Boolean)
  const segmentLabel = text(hotspot.label, text(hotspot.key, '复发段位'))
  const stablePassStreak = Number(lane.stable_pass_streak ?? lane.stablePassStreak ?? 0)
  const requiredStablePassStreak = Number(lane.required_stable_pass_streak ?? lane.requiredStablePassStreak ?? 2)
  const riskText = failureReasons.length ? `失效证据：${failureReasons.join('、')}。` : '核心/回报/追读证据失效。'
  const defaultRecoveryVerdictRelapse = safeBatchDefaultFiveChapterRecoveryVerdictRelapse(evaluation)
  const templateVersion = defaultFiveChapterLaneTemplateVersionFromLane(lane)
  const templateVersionId = text(templateVersion?.id)
  const templateVersionFailedRequirements = defaultFiveChapterLaneTemplateRequirementsForFailureReasons(failureReasons)
  const templateVersionText = templateVersionId ? `版本 ${templateVersionId} ` : ''

  return {
    visible: true,
    status: 'regressed',
    label: '默认5章档位回退原因',
    source: 'default_five_chapter_lane',
    stable_pass_streak: stablePassStreak,
    required_stable_pass_streak: Number.isFinite(requiredStablePassStreak) && requiredStablePassStreak > 0 ? requiredStablePassStreak : 2,
    default_five_chapter_ready: false,
    default_batch_created_at: text(evaluation.latestBatchCreatedAt),
    default_batch_chapter_nos: defaultBatchChapterNos,
    restore_chapter_nos: restoreChapterNos,
    validation_chapter_nos: validationChapterNos,
    repeated_hotspot_segment: {
      key: text(hotspot.key),
      label: segmentLabel,
      count: 1,
      chapter_nos: arrayValue(hotspot.chapterNos || hotspot.chapter_nos).map(chapterNo => Number(chapterNo)).filter(chapterNo => chapterNo > 0),
      risk_count: Number(hotspot.riskCount || hotspot.risk_count || 0),
      core_risk_count: Number(hotspot.coreRiskCount || hotspot.core_risk_count || 0),
      payoff_debt_count: Number(hotspot.payoffDebtCount || hotspot.payoff_debt_count || 0),
      reader_pull_risk_count: Number(hotspot.readerPullRiskCount || hotspot.reader_pull_risk_count || 0),
      summary: text(hotspot.summary),
    },
    failure_reasons: failureReasons,
    ...(templateVersionId ? { template_version_id: templateVersionId } : {}),
    ...(templateVersion ? { template_version: templateVersion } : {}),
    ...(templateVersionFailedRequirements.length ? {
      template_version_failed_requirements: templateVersionFailedRequirements,
    } : {}),
    summary: defaultRecoveryVerdictRelapse
      ? `${defaultRecoveryVerdictRelapse.summary} ${templateVersionText}默认5章档位在${segmentLabel}复发，先回到扩批结构修复层。`
      : `默认5章档位回退原因：连续 ${stablePassStreak} 批恢复稳定后，${compactChapterNoEvidence(defaultBatchChapterNos)}${templateVersionText}默认档位在${segmentLabel}复发，${riskText}先回到3章验证批或扩批结构修复层。`,
    ...(defaultRecoveryVerdictRelapse ? {
      default_five_chapter_recovery_verdict_relapse: defaultRecoveryVerdictRelapse,
    } : {}),
  }
}

export function latestDefaultFiveChapterLaneTemplateVersionProfile(profileLike: AnyRecord | null | undefined) {
  const profile = profileLike?.latest_template_version_profile
    || profileLike?.latestTemplateVersionProfile
    || null
  if (!profile || profile.visible === false) return null
  const id = firstText(profile.id, profile.template_version_id, profile.templateVersionId, profile.version_id, profile.versionId)
  const passStreak = Number(profile.pass_streak ?? profile.passStreak ?? 0)
  const requiredPassStreak = Number(profile.required_pass_streak ?? profile.requiredPassStreak ?? profileLike?.required_pass_streak ?? profileLike?.requiredPassStreak ?? 2)
  const latestStatus = firstText(profile.latest_status, profile.latestStatus)
  const status = firstText(profile.status)
  if (!id && !status && !latestStatus && passStreak <= 0) return null
  return {
    ...profile,
    id,
    label: firstText(profile.label, '默认5章档位模板版本'),
    status,
    latest_status: latestStatus,
    pass_streak: Number.isFinite(passStreak) ? passStreak : 0,
    required_pass_streak: Number.isFinite(requiredPassStreak) && requiredPassStreak > 0 ? requiredPassStreak : 2,
  }
}

export function defaultFiveChapterLaneTemplateVersionReady(profile: AnyRecord | null | undefined) {
  if (!profile) return true
  const status = text(profile.status)
  const latestStatus = text(profile.latest_status || profile.latestStatus)
  if (['relapsed', 'redesign'].includes(status) || latestStatus === 'failed') return false
  const passStreak = Number(profile.pass_streak ?? profile.passStreak ?? 0)
  const requiredPassStreak = Number(profile.required_pass_streak ?? profile.requiredPassStreak ?? 2)
  if (status === 'ready') return true
  return passStreak >= Math.max(1, Number.isFinite(requiredPassStreak) ? requiredPassStreak : 2)
}

export function buildSafeBatchRecoveryRestoreStabilityLane(policy: AnyRecord | null | undefined) {
  if (!policy?.visible || text(policy.status) !== 'expanded' || Number(policy.targetChapterCount ?? policy.target_chapter_count ?? 0) < 5) return null
  const feedback = policy.expansionFeedback || policy.expansion_feedback || null
  const evidence = feedback?.recoveryRestoreStabilityEvidence
    || feedback?.recovery_restore_stability_evidence
    || null
  const templateStabilityProfile = feedback?.defaultFiveChapterLaneTemplateStabilityProfile
    || feedback?.default_five_chapter_lane_template_stability_profile
    || null
  const latestTemplateVersionProfile = latestDefaultFiveChapterLaneTemplateVersionProfile(templateStabilityProfile)
  const templateVersionReady = defaultFiveChapterLaneTemplateVersionReady(latestTemplateVersionProfile)
  const validationResult = feedback?.expansionStructureValidationResult
    || feedback?.expansion_structure_validation_result
    || null
  const defaultFiveChapterRecoveryVerdict = defaultFiveChapterRecoveryVerdictFromSource(evidence)
    || defaultFiveChapterRecoveryVerdictFromSource(validationResult)
    || null
  const stablePassStreak = Number(evidence?.stable_pass_streak ?? evidence?.stablePassStreak ?? 0)
  if (!evidence || text(evidence.status) !== 'passed' || stablePassStreak <= 0) return null
  const restoreChapterNos = arrayValue(evidence.restore_chapter_nos || evidence.restoreChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const validationChapterNos = arrayValue(evidence.validation_chapter_nos || evidence.validationChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const requiredStablePassStreak = 2
  const restoreStableReady = stablePassStreak >= requiredStablePassStreak
  const defaultReady = restoreStableReady && templateVersionReady
  const templateVersionId = text(latestTemplateVersionProfile?.id)
  const templateVersionPassText = latestTemplateVersionProfile
    ? `模板版本 ${templateVersionId || text(latestTemplateVersionProfile.label, '当前版本')} 连过 ${Number(latestTemplateVersionProfile.pass_streak || 0)}/${Number(latestTemplateVersionProfile.required_pass_streak || 2)}`
    : ''
  const summary = defaultReady
    ? `恢复5章扩批连续 ${stablePassStreak} 批稳定，${templateVersionPassText ? `${templateVersionPassText}，` : ''}${compactChapterNoEvidence(restoreChapterNos)}已可作为默认5章档位证据。`
    : restoreStableReady && latestTemplateVersionProfile
      ? `恢复5章扩批连续 ${stablePassStreak} 批稳定，但当前${templateVersionPassText}；继续5章观察批，确认当前模板版本不复发后再把5章连写设为默认档位。`
      : `恢复5章扩批已稳定 ${stablePassStreak}/${requiredStablePassStreak} 批，${compactChapterNoEvidence(restoreChapterNos)}通过后仍需继续观察 1-2 批，再把5章连写设为默认档位。`
  const label = defaultReady ? '默认5章档位' : '5章观察批'
  return {
    visible: true,
    status: defaultReady ? 'ready' : 'observing',
    label,
    source: 'recovery_restore_stability_evidence',
    stable_pass_streak: stablePassStreak,
    required_stable_pass_streak: requiredStablePassStreak,
    default_five_chapter_ready: defaultReady,
    restore_chapter_nos: restoreChapterNos,
    validation_chapter_nos: validationChapterNos,
    summary,
    task_center_filter_label: templateVersionId
      ? `批次复盘筛选：${label} / 当前模板版本 ${templateVersionId}`
      : `批次复盘筛选：${label}`,
    ...(latestTemplateVersionProfile ? {
      latest_template_version_profile: latestTemplateVersionProfile,
    } : {}),
    ...(defaultFiveChapterRecoveryVerdict ? {
      default_five_chapter_recovery_verdict: defaultFiveChapterRecoveryVerdict,
    } : {}),
  }
}

export function latestProductionRelapseVerdictFromExpansionPolicy(policy: AnyRecord | null | undefined) {
  const feedback = policy?.expansionFeedback || policy?.expansion_feedback || null
  const validation = feedback?.expansionStructureValidationResult
    || feedback?.expansion_structure_validation_result
    || null
  const templateVerdict = validation?.defaultFiveChapterLaneTemplateVerdict
    || validation?.default_five_chapter_lane_template_verdict
    || null
  const productionRelapseVerdict = templateVerdict?.productionRelapseVerdict
    || templateVerdict?.production_relapse_verdict
    || null
  if (productionRelapseVerdict?.visible === false) return null
  const hasProductionRelapseEvidence = Boolean(
    text(productionRelapseVerdict?.template_version_id || productionRelapseVerdict?.templateVersionId)
    || arrayValue(productionRelapseVerdict?.failure_reasons || productionRelapseVerdict?.failureReasons).length
    || arrayValue(productionRelapseVerdict?.default_batch_chapter_nos || productionRelapseVerdict?.defaultBatchChapterNos).length
    || arrayValue(productionRelapseVerdict?.restore_chapter_nos || productionRelapseVerdict?.restoreChapterNos).length
  )
  return hasProductionRelapseEvidence ? productionRelapseVerdict : null
}

export function productionRelapseReviewCtaPayload(cta: AnyRecord) {
  return {
    kind: text(cta.kind),
    label: text(cta.label),
    summary: text(cta.summary),
    target_chapter_count: Number(cta.target_chapter_count || cta.targetChapterCount || 0),
    remaining_failure_reasons: arrayValue(cta.remaining_failure_reasons || cta.remainingFailureReasons).map(item => text(item)).filter(Boolean),
    cleared_failure_reasons: arrayValue(cta.cleared_failure_reasons || cta.clearedFailureReasons).map(item => text(item)).filter(Boolean),
    production_relapse_verdict: cta.production_relapse_verdict || cta.productionRelapseVerdict || null,
  }
}

export function productionRelapseCtaExecutionPayload(cta: AnyRecord | null | undefined, source: string) {
  if (!cta) return null
  const verdict = cta.production_relapse_verdict || cta.productionRelapseVerdict || {}
  const templateVersionId = text(
    verdict.template_version_id
    || verdict.templateVersionId
    || cta.template_version_id
    || cta.templateVersionId,
  )
  const remainingFailureReasons = arrayValue(cta.remaining_failure_reasons || cta.remainingFailureReasons || verdict.remaining_failure_reasons || verdict.remainingFailureReasons)
    .map(item => text(item))
    .filter(Boolean)
  const clearedFailureReasons = arrayValue(cta.cleared_failure_reasons || cta.clearedFailureReasons || verdict.cleared_failure_reasons || verdict.clearedFailureReasons)
    .map(item => text(item))
    .filter(Boolean)
  return {
    source,
    kind: text(cta.kind),
    label: text(cta.label),
    summary: text(cta.summary),
    template_version_id: templateVersionId,
    default_batch_chapter_nos: arrayValue(verdict.default_batch_chapter_nos || verdict.defaultBatchChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    restore_chapter_nos: arrayValue(verdict.restore_chapter_nos || verdict.restoreChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    validation_chapter_nos: arrayValue(verdict.validation_chapter_nos || verdict.validationChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    remaining_failure_reasons: remainingFailureReasons,
    cleared_failure_reasons: clearedFailureReasons,
    target_chapter_count: Number(cta.target_chapter_count || cta.targetChapterCount || 0),
    close_condition: remainingFailureReasons.length
      ? 'repair remaining_failure_reasons, then rerun production_relapse_verdict.status=passed'
      : 'production_relapse_verdict.status=passed && remaining_failure_reasons empty',
  }
}

export function buildProductionRelapseReviewCta(policy: AnyRecord | null | undefined, recoveryRestoreStabilityLane: AnyRecord | null | undefined) {
  const verdict = latestProductionRelapseVerdictFromExpansionPolicy(policy)
  const status = text(verdict?.status)
  if (!verdict || !status) return null
  const remainingFailureReasons = arrayValue(verdict.remaining_failure_reasons || verdict.remainingFailureReasons)
    .map(item => text(item))
    .filter(Boolean)
  const clearedFailureReasons = arrayValue(verdict.cleared_failure_reasons || verdict.clearedFailureReasons)
    .map(item => text(item))
    .filter(Boolean)
  if (status === 'passed') {
    const readyForDefault = Boolean(recoveryRestoreStabilityLane?.default_five_chapter_ready || recoveryRestoreStabilityLane?.defaultFiveChapterReady)
    const label = readyForDefault ? '恢复默认5章档位' : '进入5章观察批'
    return productionRelapseReviewCtaPayload({
      kind: readyForDefault ? 'restore_default_lane' : 'enter_five_chapter_observation',
      label,
      summary: readyForDefault
        ? `生产后验已修复：${clearedFailureReasons.join('、') || '真实生产失败维度'}已清零，可恢复默认5章档位。`
        : `生产后验已修复：${clearedFailureReasons.join('、') || '真实生产失败维度'}已清零，先进入5章观察批确认默认档位稳定。`,
      target_chapter_count: 5,
      remaining_failure_reasons: remainingFailureReasons,
      cleared_failure_reasons: clearedFailureReasons,
      production_relapse_verdict: verdict,
    })
  }
  if (status === 'failed') {
    return productionRelapseReviewCtaPayload({
      kind: 'repair_production_relapse',
      label: '修生产后验',
      summary: `生产后验验证批仍复发：${remainingFailureReasons.join('、') || '真实生产失败维度'}；下一步只按 remaining_failure_reasons 生成修生产后验任务。`,
      target_chapter_count: Math.max(1, Number(policy?.baseChapterCount || policy?.base_chapter_count || 3)),
      remaining_failure_reasons: remainingFailureReasons,
      cleared_failure_reasons: clearedFailureReasons,
      production_relapse_verdict: verdict,
    })
  }
  return null
}

export function safeBatchRecoveryRestoreObservationConfirmation(lane: AnyRecord | null | undefined, targetChapterCount: number) {
  if (!lane) return null
  const defaultFiveChapterRecoveryVerdict = defaultFiveChapterRecoveryVerdictFromSource(lane)
  const latestTemplateVersionProfile = lane.latest_template_version_profile
    || lane.latestTemplateVersionProfile
    || null
  return {
    status: text(lane.status, 'observing'),
    label: text(lane.label, '5章观察批'),
    summary: text(lane.summary),
    validation_chapter_nos: arrayValue(lane.validation_chapter_nos || lane.validationChapterNos),
    target_chapter_count: Math.max(5, Number(targetChapterCount || 5)),
    risk_count: 0,
    source: 'recovery_restore_stability_evidence',
    evidence: [text(lane.summary)].filter(Boolean),
    ...(latestTemplateVersionProfile ? {
      latest_template_version_profile: latestTemplateVersionProfile,
    } : {}),
    ...(defaultFiveChapterRecoveryVerdict ? {
      default_five_chapter_recovery_verdict: defaultFiveChapterRecoveryVerdict,
    } : {}),
  }
}

export function safeBatchRecoveryRestoreRelapseSegment(evaluation: AnyRecord | null | undefined) {
  if (!evaluation || text(evaluation.source) !== 'safe_batch_recovery_restore_five_batch') return null
  if (Number(evaluation.rawRiskCount || 0) <= 0 || !evaluation.topHotspot) return null
  const validationSegment = evaluation.recoveryRestoreValidationSegment || null
  const hotspotKey = text(evaluation.topHotspot?.key)
  if (validationSegment?.key && hotspotKey && validationSegment.key !== hotspotKey) return null
  const label = text(validationSegment?.label, text(evaluation.topHotspot?.label, hotspotKey || '复发段位'))
  const count = Math.max(2, Number(validationSegment?.count || 1) + 1)
  return {
    key: hotspotKey || text(validationSegment?.key),
    label,
    count,
    source: 'safe_batch_recovery_restore_five_batch',
    summary: `恢复5章后${label}再次复发，说明验证批通过后的批次结构仍会放大同段热区，先回到扩批结构修复层。`,
  }
}

export function recoveryEvidenceRegovernanceActionForItem(item: AnyRecord) {
  const sourceAction = text(item?.source_action || item?.sourceAction)
  const gateSource = text(item?.production_gate_source || item?.productionGateSource)
  if (gateSource === 'single_chapter_governance_recheck' || sourceAction === 'single_chapter_governance_recheck') {
    return {
      source: 'single_chapter_governance_recheck',
      sourceLabel: '单章治理复查',
      actionKey: 'recheck_single_chapter',
      actionLabel: '复检单章',
    }
  }
  if (gateSource === 'safe_batch_recovery_recheck' || sourceAction === 'safe_batch_recovery_recheck') {
    return {
      source: 'safe_batch_recovery_recheck',
      sourceLabel: '批次恢复复查',
      actionKey: 'recheck_safe_batch',
      actionLabel: '复盘批次',
    }
  }
  return {
    source: 'recovery_evidence_release_summary',
    sourceLabel: '安全连写放行摘要',
    actionKey: 'review_governance_closure',
    actionLabel: '治理复查台',
  }
}

export function buildRecoveryEvidenceRegovernanceQueue(args: {
  preflight?: AnyRecord | null
  review: AnyRecord
}) {
  const failedItems = arrayValue(args.review?.failed_items || args.review?.failedItems)
    .filter(item => text(item?.source) === 'recovery_evidence_release_summary')
  if (!failedItems.length) return null

  const releaseSummary = recoveryEvidenceReleaseSummaryFromPreflight(args.preflight)
  const releaseSources = arrayValue(releaseSummary?.cleared_sources || releaseSummary?.clearedSources)
  const sourceByKey = new Map(releaseSources.map(source => [text(source?.source || source?.sourceMode), source]))
  const allowedChapterNos = [
    ...arrayValue(releaseSummary?.allowed_chapter_nos),
    ...arrayValue(releaseSummary?.allowedChapterNos),
  ].map(item => finiteNumberOrNull(item)).filter((item): item is number => item !== null)
  const nextBatchLabel = firstText(releaseSummary?.next_batch_label, releaseSummary?.nextBatchLabel)

  const tasks = failedItems.map((item, index) => {
    const action = recoveryEvidenceRegovernanceActionForItem(item)
    const sourceRecord = sourceByKey.get(action.source) || {}
    const evidence = text(item?.evidence)
    const chapterNos = [
      ...arrayValue(item?.chapter_nos || item?.chapterNos),
      ...arrayValue(sourceRecord?.chapter_nos || sourceRecord?.chapterNos),
      ...(action.actionKey === 'recheck_single_chapter' ? allowedChapterNos.slice(0, 1) : []),
    ].map(value => finiteNumberOrNull(value)).filter((value): value is number => value !== null)
    const sourceTaskIndices = [
      ...arrayValue(item?.source_task_indices || item?.sourceTaskIndices),
      ...arrayValue(sourceRecord?.source_task_indices || sourceRecord?.sourceTaskIndices),
    ].map(value => finiteNumberOrNull(value)).filter((value): value is number => value !== null)
    const executionMeta = recoveryEvidenceGovernanceQueueExecutionMeta({
      source: action.source,
      source_task_indices: sourceTaskIndices,
      chapter_nos: chapterNos,
      source_tasks: [{
        source_task_index: sourceTaskIndices[0],
        chapter_no: chapterNos[0],
      }],
    }, action.actionKey)
    return {
      issue_type: 'recovery_evidence_governance_queue',
      severity: action.actionKey === 'review_governance_closure' ? 'medium' : 'high',
      task_status: 'needs_review',
      source: action.source,
      source_label: action.sourceLabel,
      source_status: 'failed_after_release',
      source_status_label: '放行后未继承',
      action_key: action.actionKey,
      action_label: action.actionLabel,
      evidence,
      failed_evidence: [evidence],
      ...executionMeta,
      title: `${action.sourceLabel}：${action.actionLabel}`,
      message: `放行摘要验收失败：${evidence}`,
      action: `${action.actionLabel}后刷新恢复依据审计，确认该放行依据重新被正文继承。`,
      recovery_evidence_review: {
        status: 'warn',
        summary: `放行摘要验收失败：${evidence}`,
        failed_evidence: [evidence],
        failed_items: [item],
      },
      acceptance_criteria: [
        '恢复依据审计重新生成',
        '对应来源不再出现在放行摘要失效清单',
        '下一轮批次复盘的 recovery_evidence_review 为 ok',
      ],
      queue_index: index,
    }
  })

  return {
    source: 'recovery_evidence_release_summary',
    status: 'needs_followup',
    label: '安全连写放行摘要再治理',
    summary: nextBatchLabel
      ? `${nextBatchLabel} 放行摘要验收未通过，需回到恢复依据治理队列重新闭环。`
      : '安全连写放行摘要验收未通过，需回到恢复依据治理队列重新闭环。',
    source_count: releaseSources.length || tasks.length,
    task_count: tasks.length,
    failed_evidence: failedItems.map(item => text(item?.evidence)).filter(Boolean),
    next_batch_label: nextBatchLabel,
    allowed_chapter_nos: allowedChapterNos,
    main_action: {
      action: text(tasks[0]?.action_key, 'review_governance_closure'),
      label: text(tasks[0]?.action_label, '治理复查台'),
      source: text(tasks[0]?.source, 'recovery_evidence_release_summary'),
      sourceLabel: text(tasks[0]?.source_label, '安全连写放行摘要'),
      status: 'failed_after_release',
      residualEvidence: failedItems.map(item => text(item?.evidence)).filter(Boolean),
    },
    next_cycle: {
      type: 'release_summary_regovernance',
      label: '放行摘要验收再治理',
    },
    tasks,
    recommendations: [
      '先把放行摘要失效项沉淀为下一轮恢复依据治理队列，不要直接扩大安全连写。',
      '按来源执行治理复查台、复检单章或复盘批次后，再刷新恢复依据审计。',
      '审计重新闭环后，再恢复 2-3 章安全连写并观察下一批正文继承情况。',
    ],
  }
}

export * from './helpers-recovery-evidence-trends'

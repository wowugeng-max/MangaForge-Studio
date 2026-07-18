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
  chapterExpansionStructureDecisionReceipts,
  defaultFiveChapterLaneRedesignFromDecision,
  expansionStructureDecisionRequirementDelivered,
  expansionStructureDecisionRequirements,
  expansionStructureDecisionSyncPayload,
  latestExpansionStructureDecisionSyncReview,
  normalizeDefaultFiveChapterLaneTemplateVersion,
  safeBatchDefaultRecoveryRiskCountForReason,
  safeBatchExpansionPolicyFromPreflight,
  safeBatchExpansionRollbackPolicy,
  safeBatchExpansionSegmentKey,
  safeBatchExpansionStructureDecisionFromContext,
} from './helpers-safe-batch-recovery'

export function buildSafeBatchExpansionStructureDecisionExecutionReview(args: {
  nextBatchBrief?: AnyRecord | null
  batchPreflight?: AnyRecord | null
  items: AutoCreationBatchReviewItem[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const decision = safeBatchExpansionStructureDecisionFromContext({
    nextBatchBrief: args.nextBatchBrief,
    batchPreflight: args.batchPreflight,
  })
  if (!decision) {
    return {
      visible: false,
      status: 'ok' as const,
      label: '扩批结构决策',
      summary: '当前批次没有扩批结构决策。',
      recommendation: '',
      target_chapter_count: 0,
      segment_label: '',
      observation_metrics: [],
      risk_count: 0,
      missed_chapter_nos: [],
      failed_items: [],
      chapters: [],
    }
  }
  const requirements = expansionStructureDecisionRequirements(decision)
  const defaultFiveChapterLaneRedesign = defaultFiveChapterLaneRedesignFromDecision(decision)
  const successfulItems = args.items.filter(item => item.status === 'success')
  const chapterReviews = successfulItems.map(item => {
    const chapter = findChapter(args.chapters, item)
    const syncReview = chapter ? latestExpansionStructureDecisionSyncReview(args.reviews, chapter, item.chapterNo) : null
    const payload = expansionStructureDecisionSyncPayload(syncReview)
    const receipts = chapterExpansionStructureDecisionReceipts(chapter)
    const explicitMissed = arrayValue(payload?.missed || payload?.misses || payload?.failed_items || payload?.failedItems)
      .map((missed: any) => ({
        chapter_no: item.chapterNo,
        chapter_id: item.chapterId || null,
        key: firstText(missed?.key, missed?.type, missed?.kind, 'expansion_structure_decision'),
        label: firstText(missed?.label, missed?.title, missed?.key, '扩批结构决策'),
        text: firstText(missed?.text, missed?.description, missed?.reason, missed?.issue),
      }))
      .filter((missed: AnyRecord) => missed.label || missed.text)
    const payloadStatus = text(payload?.status).toLowerCase()
    const passed = ['ok', 'pass', 'passed', 'success'].includes(payloadStatus) || payload?.passed === true
    const missing = passed
      ? []
      : explicitMissed.length > 0
        ? explicitMissed
        : requirements
          .filter(requirement => expansionStructureDecisionRequirementDelivered({
            key: requirement.key,
            payload,
            receipts,
          }) !== true)
          .map(requirement => ({
            chapter_no: item.chapterNo,
            chapter_id: item.chapterId || null,
            key: requirement.key,
            label: requirement.label,
            text: requirement.planned,
          }))
    return {
      chapter_no: item.chapterNo,
      chapter_id: item.chapterId || null,
      title: item.title,
      status: missing.length > 0 ? 'warn' as const : 'ok' as const,
      missed: missing,
      evidence: [
        ...arrayValue(payload?.evidence).map(item => text(item)).filter(Boolean),
        ...receipts.flatMap(receipt => arrayValue(receipt?.evidence).map(item => text(item)).filter(Boolean)),
      ].slice(0, 6),
    }
  })
  const failedItems = chapterReviews.flatMap(review => review.missed)
  const missedChapterNos = Array.from(new Set(failedItems.map(item => Number(item.chapter_no || 0)).filter(chapterNo => chapterNo > 0)))
  return {
    visible: true,
    status: failedItems.length > 0 ? 'warn' as const : 'ok' as const,
    label: '扩批结构决策',
    summary: failedItems.length > 0
      ? `${decision.label}未落地：第${missedChapterNos.join('、')}章有 ${failedItems.length} 项段位职责、观察指标或重构原则缺口。`
      : `${decision.label}已落地：本批章节均提供段位职责和观察指标执行证据。`,
    recommendation: decision.recommendation,
    target_chapter_count: decision.target_chapter_count,
    mode_label: decision.mode_label,
    segment_key: decision.segment_key,
    segment_label: decision.segment_label,
    source_run_id: decision.source_run_id,
    instruction: decision.instruction,
    observation_metrics: decision.observation_metrics,
    ...(defaultFiveChapterLaneRedesign ? { default_five_chapter_lane_redesign: defaultFiveChapterLaneRedesign } : {}),
    risk_count: failedItems.length,
    missed_chapter_nos: missedChapterNos,
    failed_items: failedItems,
    requirements,
    chapters: chapterReviews,
  }
}

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

export function buildBatchHandoff(args: {
  status: AutoCreationBatchReviewStatus
  total: number
  success: number
  failed: number
  delivered: number
  items: AutoCreationBatchReviewItem[]
  riskRadar: AutoCreationBatchRiskRadar
  nextAction: AutoCreationDirectorAction
  releaseEvidence?: string[]
}): AutoCreationBatchHandoff {
  if (args.status === 'empty') {
    return {
      visible: false,
      status: 'empty',
      label: '暂无批次',
      summary: '还没有安全连写批次。',
      action: args.nextAction,
      targetChapterNos: [],
      riskLabels: [],
      evidence: [],
    }
  }

  const failedChapters = args.items.filter(item => item.status === 'failed').map(item => item.chapterNo).filter(Boolean)
  const pendingDeliveryChapters = args.items
    .filter(item => item.status === 'success' && !item.delivered)
    .map(item => item.chapterNo)
    .filter(Boolean)
  const riskChapters = Array.from(new Set(args.riskRadar.repairTasks
    .map((task: any) => Number(task?.chapter_no ?? task?.chapterNo ?? 0))
    .filter(Boolean)))
  const riskLabels = batchRiskLabels(args.riskRadar)
  const recoveryEvidenceSignal = args.riskRadar.signals.find(signal => signal.key === 'recovery_evidence')
  const closedRecoveryEvidence = recoveryEvidenceSignal?.status === 'ok' ? '恢复依据已闭环' : ''
  const strengthenedRepairAcceptanceSignal = args.riskRadar.signals.find(signal => signal.key === 'strengthened_repair_acceptance')
  const closedStrengthenedRepairAcceptance = strengthenedRepairAcceptanceSignal?.status === 'ok' ? '强化深修恢复验收已通过' : ''
  const structureValidationSignal = args.riskRadar.signals.find(signal => signal.key === 'batch_expansion_structure')
  const closedStructureValidation = structureValidationSignal?.status === 'ok' ? text(structureValidationSignal.detail) : ''
  const releaseEvidence = Array.from(new Set([
    ...arrayValue(args.releaseEvidence).map(item => text(item)).filter(Boolean),
    closedRecoveryEvidence,
    closedStrengthenedRepairAcceptance,
    closedStructureValidation,
  ].filter(Boolean)))

  if (args.status === 'warn') {
    return {
      visible: true,
      status: 'failed',
      label: '先处理失败章节',
      summary: `本批 ${args.success}/${args.total} 章生成成功，失败章节需要先去任务中心处理，避免跳过断点继续写后文。`,
      action: args.nextAction,
      targetChapterNos: failedChapters,
      riskLabels: [],
      evidence: failedChapters.map(no => `第${no}章生成失败`),
    }
  }

  if (args.status === 'risk') {
    return {
      visible: true,
      status: 'repair_risks',
      label: '修复批次风险',
      summary: `本批 ${args.delivered}/${args.total} 章已交稿，但仍有${riskLabels.length ? ` ${riskLabels.join('、')}` : '质量或计划'}风险；先修复再放行下一批。`,
      action: args.nextAction,
      targetChapterNos: riskChapters,
      riskLabels,
      evidence: args.riskRadar.signals.filter(signal => signal.status === 'warn').map(signal => signal.detail).slice(0, 4),
    }
  }

  if (args.status === 'done') {
    return {
      visible: true,
      status: 'continue_batch',
      label: '放行下一批',
      summary: `本批 ${args.delivered}/${args.total} 章已完成生成、质检、修订和故事状态回填，可以回到连续生产护栏开启下一批。`,
      action: args.nextAction,
      targetChapterNos: [],
      riskLabels: [],
      evidence: ['生成完成', '交稿完成', '质检健康', '计划兑现', ...releaseEvidence],
    }
  }

  return {
    visible: true,
    status: 'deliver_chapters',
    label: '逐章交稿',
    summary: `本批 ${args.success}/${args.total} 章已生成，先把待交稿章节逐章完成质检、修订、故事状态和剧情线回填。`,
    action: args.nextAction,
    targetChapterNos: pendingDeliveryChapters,
    riskLabels: [],
    evidence: pendingDeliveryChapters.map(no => `第${no}章待交稿`),
  }
}

export function latestLongformCreationReport(reviews: AnyRecord[]) {
  const review = reviews
    .filter(item => text(item?.review_type) === 'longform_creation_diagnosis')
    .sort((a, b) => recordTime(b) - recordTime(a))[0]
  const payload = parsePayload(review?.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
  const report = payload.report || payload.result?.report || payload
  return Object.keys(report || {}).length ? report : null
}

export function latestReviewReport(reviews: AnyRecord[], reviewType: string) {
  const review = reviews
    .filter(item => text(item?.review_type) === reviewType)
    .sort((a, b) => recordTime(b) - recordTime(a))[0]
  const payload = parsePayload(review?.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
  const report = payload.report || payload.result?.report || payload.result || payload
  return Object.keys(report || {}).length ? report : null
}

export function reportScore(report: AnyRecord | null | undefined) {
  return numberValue(report?.score ?? report?.quality_score ?? report?.qualityScore)
}

export function reportStatus(report: AnyRecord | null | undefined) {
  return text(report?.status).toLowerCase()
}

export function reportIsBlocked(report: AnyRecord | null | undefined) {
  return ['blocked', 'block', 'failed', 'fail'].includes(reportStatus(report))
}

export function reportNeedsRepair(report: AnyRecord | null | undefined) {
  return ['needs_repair', 'warn', 'warning', 'fragile'].includes(reportStatus(report))
}

export function stressGateStatus(report: AnyRecord | null | undefined, key: string) {
  const gate = arrayValue(report?.stress_gates || report?.stressGates).find(item => text(item?.key) === key)
  const status = text(gate?.status).toLowerCase()
  if (['block', 'blocked', 'failed'].includes(status)) return 'block' as const
  if (['warn', 'warning', 'fragile', 'needs_repair'].includes(status)) return 'warn' as const
  if (status === 'ok' || status === 'ready' || status === 'scalable') return 'ok' as const
  return null
}

export function latestWrittenChapterNo(chapters: AnyRecord[]) {
  return chapters
    .filter(chapter => hasDeliveredProse(chapter))
    .reduce((max, chapter) => Math.max(max, Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0)), 0)
}

export function manualTestGate(
  key: AutoCreationManualTestGate['key'],
  label: string,
  status: AutoCreationBatchGuardrailSignalStatus,
  detail: string,
  evidence: string[],
  action: AutoCreationDirectorAction,
): AutoCreationManualTestGate {
  return { key, label, status, detail, evidence: evidence.map(item => text(item)).filter(Boolean).slice(0, 4), action }
}

export const COMPASS_AXIS_LABELS: Record<AutoCreationLongformCompassAxis['key'], string> = {
  reader_promise: '读者承诺',
  protagonist_drive: '主角长期欲望',
  core_conflict: '核心矛盾',
  world_hook: '世界奇点',
  innovation_hook: '创新卖点',
  payoff_loop: '长期爽点循环',
  ending_direction: '结局方向',
}

export function compassAxis(
  key: AutoCreationLongformCompassAxis['key'],
  value: any,
  locked = true,
): AutoCreationLongformCompassAxis | null {
  const normalized = text(value)
  if (!normalized) return null
  return {
    key,
    label: COMPASS_AXIS_LABELS[key],
    value: normalized,
    locked,
  }
}

export function compactList(values: any[], limit: number) {
  return Array.from(new Set(values.map(item => text(item)).filter(Boolean))).slice(0, limit)
}

export function buildLongformCompass(planning: PlanningWorkspaceModel, reviews: AnyRecord[]): AutoCreationLongformCompass {
  const report = latestLongformCreationReport(reviews)
  const reviewCompass = report?.compass || report?.longform_compass || {}
  const mainline = planning.mainline
  const readerPromise = firstText(reviewCompass.reader_promise, reviewCompass.readerPromise, mainline.readerPromise)
  const coreConflict = firstText(reviewCompass.core_conflict, reviewCompass.coreConflict, mainline.currentStageConflict)
  const innovationHook = firstText(reviewCompass.innovation_hook, reviewCompass.innovationHook, mainline.readerPromise)
  const payoffLoop = firstText(reviewCompass.payoff_loop, reviewCompass.payoffLoop, mainline.payoffModel)
  const endingDirection = firstText(reviewCompass.ending_direction, reviewCompass.endingDirection, mainline.currentVolumeGoal)
  const axes = [
    compassAxis('reader_promise', readerPromise),
    compassAxis('protagonist_drive', firstText(reviewCompass.protagonist_drive, reviewCompass.protagonistDrive)),
    compassAxis('core_conflict', coreConflict),
    compassAxis('world_hook', firstText(reviewCompass.world_hook, reviewCompass.worldHook)),
    compassAxis('innovation_hook', innovationHook),
    compassAxis('payoff_loop', payoffLoop),
    compassAxis('ending_direction', endingDirection),
  ].filter((item): item is AutoCreationLongformCompassAxis => Boolean(item))
  const immutableRules = compactList([
    ...arrayValue(reviewCompass.immutable_rules),
    ...arrayValue(reviewCompass.immutableRules),
    readerPromise ? `读者承诺不可漂移：${readerPromise}` : '',
    coreConflict ? `核心矛盾不可绕开：${coreConflict}` : '',
    payoffLoop ? `长期爽点循环必须可感知：${payoffLoop}` : '',
  ], 5)
  const flexibleZones = compactList([
    ...arrayValue(reviewCompass.flexible_zones),
    ...arrayValue(reviewCompass.flexibleZones),
    '副本、支线和新资产可以调整，但必须服务当前卷目标。',
    '角色出场顺序和场景形态可调整，但不能改主角长期欲望。',
  ], 5)
  const missing = [
    !readerPromise ? '读者承诺' : '',
    !coreConflict ? '核心矛盾' : '',
    !payoffLoop ? '长期爽点循环' : '',
  ].filter(Boolean)
  const status: AutoCreationLongformCompass['status'] = missing.length ? 'needs_attention' : 'ready'

  return {
    status,
    label: status === 'ready' ? '罗盘就绪' : `缺 ${missing.join('、')}`,
    summary: status === 'ready'
      ? '这组长期约束会约束章节任务书、安全连写和交稿复盘，避免千万字生产时核心漂移。'
      : '长篇自动生产前，先补齐读者承诺、核心矛盾和长期爽点循环。',
    sourceLabel: Object.keys(reviewCompass).length ? '来自创作诊断' : '来自当前规划',
    readerPromise,
    axes,
    immutableRules,
    flexibleZones,
  }
}

export function launchSignal(
  key: AutoCreationChapterLaunchSignal['key'],
  label: string,
  status: AutoCreationBatchGuardrailSignalStatus,
  detail: string,
): AutoCreationChapterLaunchSignal {
  return { key, label, status, detail }
}

export function launchGateStatus(signals: AutoCreationChapterLaunchSignal[]): AutoCreationChapterLaunchGateStatus {
  if (signals.some(item => item.status === 'block')) return 'blocked'
  if (signals.some(item => item.status === 'warn')) return 'warn'
  return 'ready'
}

export function writePreparationLaunchDetail(brief: AnyRecord, planningDesk: AnyRecord) {
  const sourceGaps = arrayValue(brief?.sourceGaps || brief?.source_gaps).map(item => text(item)).filter(Boolean)
  const assetRisks = arrayValue(brief?.assetRisks || brief?.asset_risks).map(item => text(item)).filter(Boolean)
  const deliveryActions = arrayValue(brief?.deliveryRiskActions || brief?.delivery_risk_actions).map(item => text(item)).filter(Boolean)
  const mustConfirm = arrayValue(brief?.mustConfirm || brief?.must_confirm).map(item => text(item)).filter(Boolean)
  return [
    sourceGaps.length ? `来源缺口：${sourceGaps.slice(0, 2).join('；')}` : '',
    assetRisks.length ? `资产关系：${assetRisks.slice(0, 2).join('；')}` : '',
    deliveryActions.length ? `交稿动作：${deliveryActions.slice(0, 2).join('；')}` : '',
    mustConfirm.length ? `必须确认：${mustConfirm.slice(0, 2).join('；')}` : '',
    !sourceGaps.length && !assetRisks.length && !deliveryActions.length && !mustConfirm.length
      ? planningDesk?.reasons?.[0] || '写前准备卡仍未确认。'
      : '',
  ].filter(Boolean).join('；')
}

export function buildChapterLaunchGate(
  planning: PlanningWorkspaceModel,
  writing: WritingCockpitModel,
  longformCompass: AutoCreationLongformCompass,
): AutoCreationChapterLaunchGate {
  const chapter = (writing.nextChapter || {}) as AnyRecord
  const raw = (chapter.rawPayload || chapter.raw_payload || {}) as AnyRecord
  const chapterNo = Number(chapter.chapterNo || chapter.chapter_no || 0)
  const readerPromise = firstText(longformCompass.readerPromise, planning.mainline.readerPromise)
  const chapterGoal = firstText(chapter.chapterGoal, chapter.chapter_goal, raw.chapterGoal, raw.chapter_goal, raw.goal)
  const conflict = firstText(chapter.conflict, raw.conflict, raw.coreConflict, raw.core_conflict)
  const mainlineProgress = firstText(raw.mainlineProgress, raw.mainline_progress, raw.mustAdvance, raw.must_advance, planning.mainline.nextTurn, planning.mainline.currentVolumeGoal)
  const readerPayoff = firstText(raw.readerPayoff, raw.reader_payoff, raw.payoff, raw.payoffModel, planning.mainline.payoffModel)
  const endingHook = firstText(chapter.endingHook, chapter.ending_hook, raw.endingHook, raw.ending_hook, raw.hook)
  const servesVolume = planning.mainline.currentChapterServesVolume !== false
  const proseReady = Boolean(chapter.hasProse)
  const planningDesk = writing.chapterPlanningDesk || {} as AnyRecord
  const writePreparationBrief = (planningDesk as AnyRecord).writePreparationBrief || (planningDesk as AnyRecord).write_preparation_brief || null
  const writePreparationNeedsContext = !proseReady && text(writePreparationBrief?.readinessStatus || writePreparationBrief?.readiness_status) === 'needs_context'
  const writePreparationSignal = writePreparationNeedsContext
    ? launchSignal('write_preparation', '写前准备', 'block', writePreparationLaunchDetail(writePreparationBrief, planningDesk))
    : null

  const signals = proseReady
    ? [
      launchSignal('reader_promise', '读者承诺', 'ok', readerPromise ? `已按「${readerPromise}」进入交稿闭环。` : '正文已生成，后续通过核心偏移复盘校正。'),
      launchSignal('chapter_goal', '本章目标', 'ok', '正文已生成，下一步看交稿质检和故事状态回填。'),
      launchSignal('core_conflict', '核心冲突', 'ok', '正文已生成，冲突落地由质检复盘判断。'),
      launchSignal('mainline_service', '主线服务', 'ok', '正文已生成，主线服务由交稿复盘校正。'),
      launchSignal('reader_payoff', '读者回报', 'ok', '正文已生成，读者回报由交稿复盘校正。'),
      launchSignal('ending_hook', '章末钩子', 'ok', '正文已生成，章末钩子由追读复盘校正。'),
    ]
    : [
      ...(writePreparationSignal ? [writePreparationSignal] : []),
      launchSignal('reader_promise', '读者承诺', readerPromise ? 'ok' : 'block', readerPromise ? `本章必须服务：${readerPromise}` : '缺少全书读者承诺，无法判断本章写出来后读者等什么。'),
      launchSignal('chapter_goal', '本章目标', chapterGoal ? 'ok' : 'block', chapterGoal ? `目标：${chapterGoal}` : `第${chapterNo || '-'}章缺本章目标，容易写成流水账。`),
      launchSignal('core_conflict', '核心冲突', conflict ? 'ok' : 'block', conflict ? `冲突：${conflict}` : '缺核心冲突，正文会缺压迫、选择和转折。'),
      launchSignal(
        'mainline_service',
        '主线服务',
        servesVolume && mainlineProgress ? 'ok' : servesVolume ? 'warn' : 'block',
        servesVolume
          ? mainlineProgress ? `推进：${mainlineProgress}` : '本章服务卷目标，但缺明确主线推进描述。'
          : '当前章被标记为未服务卷目标，不能直接进入初稿。',
      ),
      launchSignal('reader_payoff', '读者回报', readerPayoff ? 'ok' : 'warn', readerPayoff ? `回报模型：${readerPayoff}` : '缺本章读者回报模型，建议补出爽点、信息增量或情绪回报。'),
      launchSignal('ending_hook', '章末钩子', endingHook ? 'ok' : 'block', endingHook ? `钩子：${endingHook}` : '缺章末钩子，追读问题不清楚。'),
    ]
  const status = proseReady ? 'ready' : launchGateStatus(signals)
  const actionPayload = {
    source: 'chapter_launch_gate_repair',
    chapter_no: chapterNo || null,
    blocked_signals: signals.filter(item => item.status === 'block').map(item => item.key),
    warning_signals: signals.filter(item => item.status === 'warn').map(item => item.key),
  }
  const missingReaderPromise = signals.some(item => item.key === 'reader_promise' && item.status === 'block')
  const writePreparationBlocked = signals.some(item => item.key === 'write_preparation' && item.status === 'block')
  const action = missingReaderPromise
    ? planningAction('open_story_assets', '先补齐全书读者承诺、核心矛盾和长期爽点循环，再生成当前章。')
    : writePreparationBlocked
      ? writingAction(
          ((planningDesk as AnyRecord).recommendedPlannerAction?.key || 'open_generation_diagnostics') as WritingCockpitActionKey,
          writePreparationSignal?.detail || '先确认写前准备卡，再进入正文生成。',
          (planningDesk as AnyRecord).recommendedPlannerAction?.label || '查看生成诊断',
        )
    : planningAction('update_rolling_plan', '补齐当前章目标、核心冲突、主线推进、读者回报和章末钩子后再开写。', '补齐开写门禁', actionPayload)

  return {
    status,
    label: status === 'ready' ? '本章可以开写' : status === 'warn' ? '本章开写需校准' : '本章开写门禁未通过',
    summary: status === 'ready'
      ? proseReady ? '当前章已有正文，继续交稿质检、修订和状态回填。' : '当前章已对齐读者承诺、章节目标、核心冲突、主线服务、读者回报和章末钩子。'
      : status === 'warn'
        ? '当前章基本可推进，但读者回报或主线推进还不够明确，建议先补齐再扩大连续生产。'
        : '当前章未守住开写前提，直接生成正文容易导致主线漂移、冲突疲软或追读断线。',
    signals,
    action,
  }
}

export function rollingLayerStatusToPipeline(status: AutoCreationRollingScriptRoomStatus): AutoCreationPipelineStatus {
  if (status === 'ready') return 'done'
  if (status === 'blocked') return 'blocked'
  return 'warning'
}

export function currentChapterDirectorAction(writing: WritingCockpitModel): AutoCreationDirectorAction {
  const handoff = (writing as any).chapterHandoffDesk || null
  if (handoff?.visible) {
    return writingAction(
      (handoff.actionKey || writing.primaryActionKey || 'accept_chapter_and_continue') as WritingCockpitActionKey,
      chapterHandoffDetail(handoff),
      text(handoff.actionLabel, '处理章节交接'),
    )
  }
  if (writing.chapterAcceptanceDesk?.visible) {
    const action = writing.chapterAcceptanceDesk.recommendedAcceptanceAction || {}
    return writingAction(
      (action.key || writing.primaryActionKey || 'refresh_current_quality') as WritingCockpitActionKey,
      '处理当前章交稿闭环，先完成质检、修订、状态同步或验收。',
      action.label,
    )
  }
  const plannerAction = writing.chapterPlanningDesk?.recommendedPlannerAction || {}
  return writingAction(
    (plannerAction.key || writing.primaryActionKey || 'build_scene_plan') as WritingCockpitActionKey,
    '推进当前章任务书、场景卡或正文生成。',
    plannerAction.label,
  )
}

export function chapterHandoffDetail(handoff: AnyRecord) {
  const route = Number(handoff?.fromChapterNo || 0) && Number(handoff?.toChapterNo || 0)
    ? `第${Number(handoff.fromChapterNo)}章到第${Number(handoff.toChapterNo)}章`
    : '当前章节'
  const previousEnding = text(handoff?.previousEnding)
  const carryOver = arrayValue(handoff?.expectationCarryOver).map(item => text(item)).filter(Boolean).join('；')
  const opening = arrayValue(handoff?.nextOpeningObligations).map(item => text(item)).filter(Boolean).join('；')
  const deliveryRisk = handoff?.deliveryRiskCarryOver || null
  const deliveryRiskItems = arrayValue(deliveryRisk?.items).map(item => text(item)).filter(Boolean).slice(0, 2).join('；')
  const stagedRiskActions = deliveryRiskStagedActions(deliveryRisk)
  const deliveryRiskSummary = [
    text(deliveryRisk?.label),
    text(deliveryRisk?.priorityLabel),
    deliveryRiskItems,
  ].filter(Boolean).join('，')
  return [
    `${route}交接待确认`,
    previousEnding ? `上一章钩子：${previousEnding}` : '',
    carryOver ? `期待承接：${carryOver}` : '',
    opening ? `下一章开场：${opening}` : '',
    deliveryRiskSummary ? `交稿风险：${deliveryRiskSummary}` : '',
    stagedRiskActions.opening.length ? `开篇修复：${stagedRiskActions.opening.slice(0, 2).join('；')}` : '',
    stagedRiskActions.middle.length ? `中段推进：${stagedRiskActions.middle.slice(0, 2).join('；')}` : '',
    stagedRiskActions.ending.length ? `章末追读：${stagedRiskActions.ending.slice(0, 2).join('；')}` : '',
  ].filter(Boolean).join('；')
}

export function uniqueTextItems(values: string[]) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const normalized = text(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

export function deliveryRiskStagedActions(deliveryRisk: AnyRecord | null) {
  const opening = arrayValue(deliveryRisk?.openingActions || deliveryRisk?.opening_actions).map(item => text(item)).filter(Boolean)
  const middle = arrayValue(deliveryRisk?.middleActions || deliveryRisk?.middle_actions).map(item => text(item)).filter(Boolean)
  const ending = arrayValue(deliveryRisk?.endingActions || deliveryRisk?.ending_actions).map(item => text(item)).filter(Boolean)
  const rawActions = arrayValue(deliveryRisk?.requiredActions || deliveryRisk?.required_actions || deliveryRisk?.actions).map(item => text(item)).filter(Boolean)
  for (const action of rawActions) {
    if (/前\s*300|开篇|开头|开场|承接|入口|第一场/.test(action)) {
      opening.push(action)
    } else if (/章末|结尾|最后|追读|翻页|尾声|钩子/.test(action)) {
      ending.push(action)
    } else {
      middle.push(action)
    }
  }

  const priority = text(deliveryRisk?.priorityLabel || deliveryRisk?.priority_label)
  if (priority) {
    if (/开篇|开头|开场|承接|入口/.test(priority)) opening.push(priority)
    else if (/章末|结尾|追读|翻页|钩子/.test(priority)) ending.push(priority)
    else if (/中段|场景|推进|爽点|回报|创新/.test(priority)) middle.push(priority)
  }

  return {
    opening: uniqueTextItems(opening),
    middle: uniqueTextItems(middle),
    ending: uniqueTextItems(ending),
  }
}

export function deliveryRiskActionText(item: any) {
  if (typeof item === 'string') return text(item)
  return firstText(item?.text, item?.label, item?.name, item?.summary, item?.detail, item?.title, item?.issue)
}

export function deliveryRiskTextItems(value: any, limit = 12) {
  return uniqueTextItems(arrayValue(value).map(deliveryRiskActionText).filter(Boolean)).slice(0, limit)
}

export function creationContractChecklistFromTexts(items: string[]) {
  const checklist: string[] = []
  const joined = items.join('｜')
  if (/目标读者/.test(joined)) checklist.push('target_reader')
  if (/题材定位/.test(joined)) checklist.push('genre_positioning')
  if (/核心承诺|核心契约/.test(joined)) checklist.push('core_promise')
  if (/追读留存|追读雷达/.test(joined)) checklist.push('reader_retention')
  return uniqueTextItems(checklist)
}

export function normalizeSafeBatchCreationContractCarryOver(args: {
  raw: AnyRecord
  items: string[]
  requiredActions: string[]
  staged: { opening: string[]; middle: string[]; ending: string[] }
}) {
  const priority = firstText(args.raw.priorityLabel, args.raw.priority_label)
  const searchableItems = [
    priority,
    firstText(args.raw.label),
    ...args.items,
    ...args.requiredActions,
    ...args.staged.opening,
    ...args.staged.middle,
    ...args.staged.ending,
  ].filter(Boolean)
  const creationContractItems = args.items.filter(item => /^创作契约/.test(item) || /目标读者|题材定位|核心承诺|核心契约|追读留存|追读雷达/.test(item))
  const isCreationContractCarryOver = /创作契约/.test(searchableItems.join('｜')) || creationContractItems.length > 0
  if (!isCreationContractCarryOver) return null
  const checklist = creationContractChecklistFromTexts(searchableItems)
  if (checklist.length === 0) return null
  return {
    priority_label: priority || '优先修创作契约',
    items: creationContractItems.length > 0 ? creationContractItems : args.items,
    checklist,
    required_actions: uniqueTextItems([
      ...args.requiredActions,
      ...args.staged.opening,
      ...args.staged.middle,
      ...args.staged.ending,
    ]).slice(0, 16),
    policy: '安全连写第一章必须先修创作契约，把目标读者、题材定位、核心承诺、追读留存写成可见正文证据；不得只在批次任务书里声明已处理。',
  }
}

export function normalizeSafeBatchDeliveryRiskCarryOver(value: AnyRecord | null | undefined, applyToChapterNo: number | null) {
  if (!value || typeof value !== 'object') return null
  const items = deliveryRiskTextItems(value.items || value.risk_items || value.riskItems || value.risks)
  const requiredActions = deliveryRiskTextItems(value.requiredActions || value.required_actions || value.actions || value.nextActions || value.next_actions)
  const staged = deliveryRiskStagedActions(value)
  const stagedCount = staged.opening.length + staged.middle.length + staged.ending.length
  const rawTotal = Number(value.totalCount ?? value.total_count ?? value.count ?? 0)
  const totalCount = Number.isFinite(rawTotal) && rawTotal > 0
    ? rawTotal
    : Math.max(items.length, requiredActions.length, stagedCount)
  if (totalCount <= 0 && items.length === 0 && requiredActions.length === 0 && stagedCount === 0) return null
  const creationContractCarryOver = normalizeSafeBatchCreationContractCarryOver({
    raw: value,
    items,
    requiredActions,
    staged,
  })

  return {
    source: 'chapter_delivery_risk_carry_over',
    source_chapter_no: Number(value.sourceChapterNo ?? value.source_chapter_no ?? 0) || null,
    apply_to_chapter_no: applyToChapterNo || null,
    total_count: totalCount,
    label: firstText(value.label, `待修复 ${totalCount}`),
    priority_label: firstText(value.priorityLabel, value.priority_label, '优先复盘上一章'),
    items,
    required_actions: requiredActions,
    opening_actions: staged.opening.slice(0, 12),
    middle_actions: staged.middle.slice(0, 12),
    ending_actions: staged.ending.slice(0, 12),
    evidence: deliveryRiskTextItems(value.evidence),
    ...(creationContractCarryOver ? { creation_contract_carry_over: creationContractCarryOver } : {}),
    policy: '安全连写第一章必须优先承接上一章残留风险；开篇动作落在前300字，中段动作落成场景推进，章末动作落成追读钩子。',
  }
}

export function extractChapterNoFromText(value: string) {
  const match = text(value).match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}

export function normalizeSafeBatchChapterHandoffContract(writing: WritingCockpitModel, applyToChapterNo: number | null) {
  const planningDesk = writing.chapterPlanningDesk || {}
  const episodePlan = planningDesk.episodePlan || {}
  const nextChapter = writing.nextChapter || null
  const rawPayload = nextChapter?.rawPayload || {}
  const preDraftBrief = rawPayload.pre_draft_brief || rawPayload.preDraftBrief || rawPayload || {}
  const readerDebt = preDraftBrief.reader_expectation_debt || preDraftBrief.readerExpectationDebt || {}
  const readerLedger = preDraftBrief.reader_expectation_ledger || preDraftBrief.readerExpectationLedger || {}
  const handoff = (writing as any).chapterHandoffDesk || null
  const previousHandoff = firstText(
    episodePlan.previousHandoff,
    episodePlan.previous_handoff,
    preDraftBrief.previous_handoff,
    preDraftBrief.previousHandoff,
    handoff?.previousEnding,
    nextChapter?.previousEnding,
  )
  const openingObligations = deliveryRiskTextItems([
    ...arrayValue(handoff?.nextOpeningObligations),
    ...arrayValue(readerDebt.must_carry || readerDebt.mustCarry),
    ...arrayValue(readerLedger.carry_over || readerLedger.carryOver),
  ], 12)
  const expectationCarryOver = deliveryRiskTextItems([
    ...arrayValue(handoff?.expectationCarryOver),
    ...arrayValue(readerLedger.carry_over || readerLedger.carryOver),
  ], 12)
  const mustDeliver = deliveryRiskTextItems(readerLedger.must_deliver || readerLedger.mustDeliver, 12)
  const keepAlive = deliveryRiskTextItems([
    ...arrayValue(readerDebt.keep_alive || readerDebt.keepAlive),
    ...arrayValue(readerLedger.keep_alive || readerLedger.keepAlive),
    ...arrayValue(handoff?.nextOpeningObligations),
  ], 12)
  const overdue = deliveryRiskTextItems(readerDebt.overdue, 12)
  const hasContract = Boolean(previousHandoff)
    || openingObligations.length > 0
    || expectationCarryOver.length > 0
    || mustDeliver.length > 0
    || keepAlive.length > 0
    || overdue.length > 0
  if (!hasContract) return null
  const fromChapterNo = Number(handoff?.fromChapterNo || 0)
    || extractChapterNoFromText(previousHandoff)
    || (applyToChapterNo ? applyToChapterNo - 1 : 0)
    || null
  return {
    source: 'safe_batch_chapter_handoff_contract',
    from_chapter_no: fromChapterNo,
    apply_to_chapter_no: applyToChapterNo || Number(handoff?.toChapterNo || 0) || Number(nextChapter?.chapterNo || 0) || null,
    previous_handoff: previousHandoff,
    opening_obligations: openingObligations,
    expectation_carry_over: expectationCarryOver,
    must_deliver: mustDeliver,
    keep_alive: keepAlive,
    overdue,
    policy: '安全连写第一章必须先接住上一章最后一幕和读者期待债务；opening_obligations 落在前300字，must_deliver 写成可见回报，keep_alive 保持存在感，overdue 优先推进。',
  }
}

export function writingQueueBadges(queue: AnyRecord) {
  return [
    Number(queue?.readyCount || 0) > 0 ? `可写 ${Number(queue.readyCount || 0)}` : '',
    Number(queue?.blockedCount || 0) > 0 ? `待补 ${Number(queue.blockedCount || 0)}` : '',
    Number(queue?.draftedCount || 0) > 0 ? `待质检 ${Number(queue.draftedCount || 0)}` : '',
  ].filter(Boolean)
}

export function buildWritingQueueFocus(writing: WritingCockpitModel): AutoCreationWritingQueueFocus {
  const fallbackAction = currentChapterDirectorAction(writing)
  const queue = (writing as any).writingQueue || {}
  const items = arrayValue(queue?.items)
  const readyCount = Number(queue?.readyCount || 0)
  const blockedCount = Number(queue?.blockedCount || 0)
  const draftedCount = Number(queue?.draftedCount || 0)
  if (!queue?.visible || !items.length) {
    return {
      visible: false,
      status: 'empty',
      label: '写作队列未启用',
      summary: '当前总控台按章节工作台推荐动作推进。',
      currentChapterNo: null,
      readyCount,
      blockedCount,
      draftedCount,
      action: fallbackAction,
      badges: [],
    }
  }

  const currentChapterNo = Number(queue.currentChapterNo || items[0]?.chapterNo || 0) || null
  const item = items.find(entry => Number(entry?.chapterNo || 0) === Number(currentChapterNo || 0)) || items[0]
  const status = text(item?.status, 'ready_to_draft') as AutoCreationWritingQueueFocus['status']
  const chapterNo = Number(item?.chapterNo || currentChapterNo || 0)
  const title = text(item?.title, '未命名章节')
  const badges = writingQueueBadges(queue)

  if (status === 'needs_plan') {
    const missingLabels = arrayValue(item?.missingPlanLabels).map(label => text(label)).filter(Boolean)
    const batchRepair = queue?.planRepair?.visible
    const action = batchRepair
      ? planningAction(
        'update_rolling_plan',
        `补齐写作队列中 ${Number(queue.planRepair.chapterCount || blockedCount || 1)} 章的计划缺口，再进入正文生产。`,
        text(queue.planRepair.label, '补齐队列计划'),
        queue.planRepair.intent || null,
      )
      : planningAction(
        'update_rolling_plan',
        `补齐第${chapterNo || '-'}章计划缺口，明确目标、冲突、钩子和场景职责后再开写。`,
        text(item?.actionLabel, '补齐本章计划'),
        item?.repairIntent || null,
      )
    return {
      visible: true,
      status,
      label: '本章计划缺口',
      summary: `第${chapterNo || '-'}章《${title}》存在计划缺口：${missingLabels.join('、') || text(item?.actionHint, '缺目标、冲突或章末钩子')}。先补计划，避免正文生成时主线和读者回报跑偏。`,
      currentChapterNo,
      readyCount,
      blockedCount,
      draftedCount,
      action,
      badges,
    }
  }

  if (status === 'draft_generated') {
    return {
      visible: true,
      status,
      label: '本章待质检',
      summary: `第${chapterNo || '-'}章《${title}》已有正文，下一步应进入质检、修订、故事状态回填和验收。`,
      currentChapterNo,
      readyCount,
      blockedCount,
      draftedCount,
      action: fallbackAction,
      badges,
    }
  }

  return {
    visible: true,
    status: 'ready_to_draft',
    label: '本章开写就绪',
    summary: `第${chapterNo || '-'}章《${title}》的章节计划已就绪，可以按任务书、场景卡和字数门禁生成初稿。`,
    currentChapterNo,
    readyCount,
    blockedCount,
    draftedCount,
    action: fallbackAction,
    badges,
  }
}

export function writingQueueRelease(writing: WritingCockpitModel, expectedChapterCount: number) {
  const queue = (writing as any).writingQueue || {}
  const items = arrayValue(queue?.items)
  const targetCount = Math.max(0, Number(expectedChapterCount || 0))
  const focus = buildWritingQueueFocus(writing)
  const emptyRelease = {
    allowedChapters: [] as AutoCreationBatchReleaseChapter[],
    blockedChapters: [] as AutoCreationBatchReleaseChapter[],
  }

  if (!queue?.visible || !items.length || targetCount <= 0) {
    return {
      signal: signal('写作队列放行', 'ok' as const, '当前按章节工作台状态放行。'),
      safeChapterCount: targetCount,
      action: focus.action,
      ...emptyRelease,
    }
  }

  const currentChapterNo = Number(queue.currentChapterNo || items[0]?.chapterNo || 0)
  const ordered = items
    .filter(item => Number(item?.chapterNo || 0) >= currentChapterNo)
    .sort((a, b) => Number(a?.chapterNo || 0) - Number(b?.chapterNo || 0))
  let consecutiveReady = 0
  for (const item of ordered) {
    if (text(item?.status) !== 'ready_to_draft') break
    consecutiveReady += 1
  }
  const allowedChapters = ordered.slice(0, Math.min(consecutiveReady, targetCount)).map(item => ({
    chapterNo: Number(item?.chapterNo || 0),
    title: text(item?.title, '未命名章节'),
    status: 'allowed' as const,
    reason: '队列状态可开写',
  }))
  const nextBlocked = ordered[consecutiveReady]
  const blockedChapters = nextBlocked ? [{
    chapterNo: Number(nextBlocked?.chapterNo || 0),
    title: text(nextBlocked?.title, '未命名章节'),
    status: 'blocked' as const,
    reason: text(nextBlocked?.statusLabel, text(nextBlocked?.actionHint, '未进入可写状态')),
  }] : []

  if (consecutiveReady >= targetCount) {
    return {
      signal: signal('写作队列放行', 'ok' as const, `写作队列连续可写 ${consecutiveReady} 章，可覆盖本轮安全批次。`),
      safeChapterCount: targetCount,
      action: focus.action,
      allowedChapters,
      blockedChapters: [],
    }
  }

  if (consecutiveReady > 0) {
    const detail = `写作队列连续可写 ${consecutiveReady} 章；第${Number(nextBlocked?.chapterNo || 0)}章仍是「${text(nextBlocked?.statusLabel, '未就绪')}」，本轮降为单章推进，先补齐后续计划或交稿。`
    const action = queue?.planRepair?.visible
      ? planningAction('update_rolling_plan', detail, text(queue.planRepair.label, '补齐队列计划'), queue.planRepair.intent || null)
      : focus.action
    return {
      signal: signal('写作队列放行', 'warn' as const, detail),
      safeChapterCount: consecutiveReady,
      action,
      allowedChapters,
      blockedChapters,
    }
  }

  return {
    signal: signal('写作队列放行', 'block' as const, focus.summary || '当前写作队列没有连续可写章节，先补计划或处理交稿。'),
    safeChapterCount: 0,
    action: focus.action,
    allowedChapters: [],
    blockedChapters,
  }
}

export function releaseChapterLabel(chapter: AutoCreationBatchReleaseChapter) {
  return `第${chapter.chapterNo}章《${chapter.title}》`
}

export function buildBatchReleaseWindow(
  nextBatchBrief: AutoCreationNextBatchBrief,
  queueRelease: {
    allowedChapters: AutoCreationBatchReleaseChapter[]
    blockedChapters: AutoCreationBatchReleaseChapter[]
  },
): AutoCreationBatchReleaseWindow {
  const allowedChapters = queueRelease.allowedChapters.length
    ? queueRelease.allowedChapters
    : nextBatchBrief.chapters.map(chapter => ({
      chapterNo: chapter.chapterNo,
      title: chapter.title,
      status: 'allowed' as const,
      reason: '护栏放行',
    }))
  const blockedChapters = queueRelease.blockedChapters
  const allowedLabel = allowedChapters.length
    ? `本批放行 ${allowedChapters.map(releaseChapterLabel).join('、')}`
    : '本批没有放行章节'
  const blockedLabel = blockedChapters.length
    ? `；${blockedChapters.map(chapter => `${releaseChapterLabel(chapter)}因${chapter.reason}被拦截`).join('、')}`
    : ''
  return {
    summary: `${allowedLabel}${blockedLabel}。`,
    allowedChapters,
    blockedChapters,
  }
}

export function contractPipelineStatus(contract: AutoCreationContractItem[]): AutoCreationPipelineStatus {
  if (contract.some(item => item.status === 'block')) return 'blocked'
  if (contract.some(item => item.status === 'warn')) return 'warning'
  return 'done'
}

export function contractActionKey(key: AutoCreationContractItem['key'], status: AutoCreationContractStatus, fallback?: any): AutoCreationDirectorActionKey {
  if (fallback) return fallback as AutoCreationDirectorActionKey
  if (key === 'core') return 'open_story_assets'
  if (key === 'story') return status === 'ok' ? 'enter_chapter_writing' : 'update_rolling_plan'
  if (key === 'innovation') return status === 'ok' ? 'open_story_assets' : 'topic_validation'
  return status === 'ok' ? 'enter_chapter_writing' : 'run_first30_retention'
}

export function normalizeContractStatus(value: any): AutoCreationContractStatus {
  const status = text(value).toLowerCase()
  if (status === 'block' || status === 'blocked' || status === 'fail') return 'block'
  if (status === 'warn' || status === 'warning' || status === 'needs_repair') return 'warn'
  return 'ok'
}

export function creationContractFromReview(reviews: AnyRecord[]): { score: number | null; contract: AutoCreationContractItem[] | null } {
  const report = latestLongformCreationReport(reviews)
  const dimensions = arrayValue(report?.dimensions)
  if (!dimensions.length) return { score: null, contract: null }
  const scoreValue = Number(report?.score)
  return {
    score: Number.isFinite(scoreValue) ? scoreValue : null,
    contract: dimensions
      .filter(item => ['core', 'story', 'innovation', 'reader_pull'].includes(text(item?.key)))
      .map(item => {
        const key = text(item?.key) as AutoCreationContractItem['key']
        const status = normalizeContractStatus(item?.status)
        return {
          key,
          label: text(item?.label, key === 'core' ? '核心不偏' : key === 'story' ? '故事强度' : key === 'innovation' ? '创新差异' : '读者吸引'),
          status,
          detail: text(item?.detail || arrayValue(item?.blockers)[0] || arrayValue(item?.warnings)[0], '后端诊断未给出说明。'),
          evidence: arrayValue(item?.evidence).map(entry => text(entry)).filter(Boolean),
          actionKey: contractActionKey(key, status, item?.actionKey || item?.action_key),
        }
      }),
  }
}

export function buildLongformCreationContract(planning: PlanningWorkspaceModel, writing: WritingCockpitModel): AutoCreationContractItem[] {
  const mainline = planning.mainline
  const future10Ready = planning.topStatus.future10Coverage.ready
  const retention = planning.first30Retention
  const readerScore = Number(retention.score || 0)
  const sceneCardCount = Number(writing.chapterPlanningDesk.sceneCards?.length || 0)
  const coreBlockers = [
    !text(mainline.readerPromise) ? '缺读者承诺' : '',
    !text(mainline.currentVolumeGoal) ? '缺当前卷目标' : '',
    mainline.currentChapterServesVolume === false ? '当前章未服务卷目标' : '',
  ].filter(Boolean)
  const storyWarnings = [
    !future10Ready ? `未来10章规划 ${planning.topStatus.future10Coverage.label}` : '',
    planning.storylineBoard.status !== 'ready' ? '剧情线未校准' : '',
    !text(mainline.currentStageConflict) ? '缺当前阶段冲突' : '',
  ].filter(Boolean)
  const innovationWarnings = [
    !text(mainline.payoffModel) ? '缺爽点模型' : '',
    !text(mainline.readerPromise) ? '缺差异化承诺' : '',
    !text(mainline.currentStageConflict) ? '缺反差冲突' : '',
  ].filter(Boolean)
  const readerBlockers = [
    retention.status === 'blocked' || readerScore > 0 && readerScore < 65 ? '前30章留存高危' : '',
    retention.promiseReady === false ? '读者承诺未被诊断确认' : '',
  ].filter(Boolean)
  const readerWarnings = [
    retention.status === 'missing' ? '未运行前30章诊断' : '',
    retention.status === 'stale' ? '前30章需重新诊断' : '',
    retention.status === 'needs_repair' ? '前30章需要修复' : '',
    readerScore >= 65 && readerScore < 80 ? '前30章吸引力偏弱' : '',
  ].filter(Boolean)

  return [
    {
      key: 'core',
      label: '核心不偏',
      status: coreBlockers.length > 0 ? 'block' : mainline.risks.length > 0 ? 'warn' : 'ok',
      detail: coreBlockers[0] || mainline.risks[0] || '读者承诺、卷目标和当前章服务关系明确。',
      evidence: [mainline.readerPromise, mainline.currentVolumeGoal, mainline.nextTurn].map(item => text(item)).filter(Boolean).slice(0, 3),
      actionKey: coreBlockers.length > 0 ? 'open_story_assets' : 'open_outline_tree',
    },
    {
      key: 'story',
      label: '故事强度',
      status: storyWarnings.length > 0 ? 'warn' : 'ok',
      detail: storyWarnings[0] || '未来章节、剧情线和阶段冲突能支撑连续推进。',
      evidence: [
        `未来10章 ${planning.topStatus.future10Coverage.label}`,
        `剧情线 ${planning.storylineBoard.total}`,
        sceneCardCount > 0 ? `本章场景卡 ${sceneCardCount}` : '',
      ].filter(Boolean),
      actionKey: storyWarnings.length > 0 ? 'update_rolling_plan' : 'enter_chapter_writing',
    },
    {
      key: 'innovation',
      label: '创新差异',
      status: innovationWarnings.length > 0 ? 'warn' : 'ok',
      detail: innovationWarnings[0] || '题材承诺、爽点模型和冲突反差具备可传播差异。',
      evidence: [mainline.readerPromise, mainline.payoffModel, mainline.currentStageConflict].map(item => text(item)).filter(Boolean).slice(0, 3),
      actionKey: innovationWarnings.length > 0 ? 'topic_validation' : 'open_story_assets',
    },
    {
      key: 'reader_pull',
      label: '读者吸引',
      status: readerBlockers.length > 0 ? 'block' : readerWarnings.length > 0 ? 'warn' : 'ok',
      detail: readerBlockers[0] || readerWarnings[0] || '前30章读者承诺、钩子和爽点密度处于可生产状态。',
      evidence: [
        retention.score !== null ? `前30章 ${retention.score}分` : '',
        retention.promiseReady ? '承诺清晰' : '',
        retention.summary,
      ].map(item => text(item)).filter(Boolean).slice(0, 3),
      actionKey: readerBlockers.length > 0 || readerWarnings.length > 0 ? retention.actionKey : 'enter_chapter_writing',
    },
  ]
}

export function buildSerialReleaseInventoryGuardrail(planning: PlanningWorkspaceModel): AutoCreationBatchGuardrailSignal & { action: AutoCreationDirectorAction; hasDesk: boolean } {
  const desk = (planning as any).serialReleaseDesk || null
  if (!desk) {
    return {
      label: '连载库存',
      status: 'ok',
      detail: '故事规划页暂未返回连载发布台，按现有连写护栏继续判断。',
      action: planningAction('enter_chapter_writing', '进入章节写作区补齐当前章，继续积累可发布存稿。'),
      hasDesk: false,
    }
  }
  const rawStatus = text(desk.status)
  const status: AutoCreationBatchGuardrailSignalStatus = rawStatus === 'blocked'
    ? 'block'
    : rawStatus === 'needs_buffer' || rawStatus === 'needs_planning'
      ? 'warn'
      : 'ok'
  const fallbackActionKey: PlanningActionKey = status === 'block' ? 'open_quality_revision' : rawStatus === 'needs_planning' ? 'update_rolling_plan' : 'enter_chapter_writing'
  const primaryAction = desk.primaryAction || desk.primary_action || {}
  const actionKey = normalizePlanningActionKey(primaryAction.key, fallbackActionKey)
  const detail = firstText(
    desk.summary,
    primaryAction.reason,
    arrayValue(desk.nextActions)[0],
    status === 'ok'
      ? '连载库存和发布窗口可支撑继续生产。'
      : status === 'block'
        ? '发布窗口存在待修订章节，先处理发布风险再连写。'
        : '连载库存或后续计划不足，本轮只适合单章小步推进。',
  )
  return {
    label: '连载库存',
    status,
    detail,
    action: planningAction(actionKey, firstText(primaryAction.reason, detail), text(primaryAction.label, PLANNING_ACTION_LABELS[actionKey] || actionKey)),
    hasDesk: true,
  }
}


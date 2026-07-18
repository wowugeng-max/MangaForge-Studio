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
  coreRiskCount,
  parsePayload,
  recordTime,
} from './helpers-main'
import {
  safeBatchExpansionPolicyFromPreflight,
  safeBatchExpansionRollbackPolicy,
  safeBatchExpansionStructureDecisionFromContext,
  safeBatchExpansionStructureVerificationFromPreflight,
} from './helpers-safe-batch-recovery'
import {
  buildDefaultFiveChapterLaneTemplateStabilityProfile,
  buildSafeBatchExpansionStructureDecisionTrend,
  buildSafeBatchExpansionStructureRepairEffectiveness,
  buildSafeBatchExpansionStructureValidationTrend,
  isSafeBatchGenerationSource,
  safeBatchDefaultFiveChapterRecoveryVerdictRelapse,
  safeBatchDefaultFiveChapterRegression,
  safeBatchExpansionEntryEvaluation,
  safeBatchExpansionItemsFromOutput,
  safeBatchExpansionStructureDecisionEntryEvaluation,
  safeBatchExpansionStructureValidationEntryEvaluation,
  safeBatchRecoveryRestoreRelapseSegment,
  safeBatchRecoveryRestoreStabilityEvidence,
} from './helpers-safe-batch-expansion-structure'
import {
  arrayValue,
  text,
} from './helpers-basics'

export function buildSafeBatchExpansionFeedback(args: {
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const expandedEntries = arrayValue(args.runRecords)
    .filter(run => text(run?.run_type) === 'batch_generate_prose')
    .map(run => ({
      run,
      input: parsePayload(run?.input_ref, { owner: run, kind: 'run', field: 'input_ref' }) || {},
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => isSafeBatchGenerationSource(text(entry.input?.source)))
    .map(entry => ({
      ...entry,
      preflight: entry.input?.batch_preflight || entry.input?.batchPreflight || null,
      items: safeBatchExpansionItemsFromOutput(entry.output),
    }))
    .filter(entry => {
      const policy = safeBatchExpansionPolicyFromPreflight(entry.preflight)
      return Boolean(policy && entry.items.filter(item => item.status === 'success').length >= 5)
    })
    .sort((a, b) => recordTime(b.run) - recordTime(a.run))
  const structureValidationEntries = arrayValue(args.runRecords)
    .filter(run => text(run?.run_type) === 'batch_generate_prose')
    .map(run => ({
      run,
      input: parsePayload(run?.input_ref, { owner: run, kind: 'run', field: 'input_ref' }) || {},
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => isSafeBatchGenerationSource(text(entry.input?.source)))
    .map(entry => ({
      ...entry,
      preflight: entry.input?.batch_preflight || entry.input?.batchPreflight || null,
      items: safeBatchExpansionItemsFromOutput(entry.output),
    }))
    .filter(entry => Boolean(safeBatchExpansionStructureVerificationFromPreflight(entry.preflight)))
    .sort((a, b) => recordTime(b.run) - recordTime(a.run))
  const structureDecisionEntries = arrayValue(args.runRecords)
    .filter(run => text(run?.run_type) === 'batch_generate_prose')
    .map(run => ({
      run,
      input: parsePayload(run?.input_ref, { owner: run, kind: 'run', field: 'input_ref' }) || {},
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => isSafeBatchGenerationSource(text(entry.input?.source)))
    .map(entry => ({
      ...entry,
      preflight: entry.input?.batch_preflight || entry.input?.batchPreflight || null,
      items: safeBatchExpansionItemsFromOutput(entry.output),
    }))
    .filter(entry => Boolean(safeBatchExpansionStructureDecisionFromContext({
      nextBatchBrief: entry.input?.next_batch_brief || entry.input?.nextBatchBrief || null,
      batchPreflight: entry.preflight,
    })))
    .sort((a, b) => recordTime(b.run) - recordTime(a.run))

  const evaluations = expandedEntries
    .slice(0, 5)
    .map(entry => safeBatchExpansionEntryEvaluation({
      entry,
      runRecords: args.runRecords,
      chapters: args.chapters,
      reviews: args.reviews,
    }))
    .filter(evaluation => evaluation.rawReview.visible)
  const latest = evaluations[0]
  const structureValidationEvaluations = structureValidationEntries
    .slice(0, 12)
    .map(entry => safeBatchExpansionStructureValidationEntryEvaluation({
      entry,
      runRecords: args.runRecords,
      chapters: args.chapters,
      reviews: args.reviews,
    }))
  const expansionEvaluationsForTrend = expandedEntries
    .slice(0, 12)
    .map(entry => safeBatchExpansionEntryEvaluation({
      entry,
      runRecords: args.runRecords,
      chapters: args.chapters,
      reviews: args.reviews,
    }))
    .filter(evaluation => evaluation.rawReview.visible)
  const latestStructureValidation = structureValidationEvaluations
    .find(evaluation => evaluation.result.visible) || null
  const expansionStructureValidationTrend = buildSafeBatchExpansionStructureValidationTrend({
    validationEvaluations: structureValidationEvaluations,
    expansionEvaluations: expansionEvaluationsForTrend,
  })
  const defaultFiveChapterLaneTemplateStabilityProfile = buildDefaultFiveChapterLaneTemplateStabilityProfile({
    validationEvaluations: structureValidationEvaluations,
    expansionEvaluations: expansionEvaluationsForTrend,
  })
  const expansionStructureRepairEffectiveness = buildSafeBatchExpansionStructureRepairEffectiveness({
    runRecords: args.runRecords,
    validationEvaluations: structureValidationEvaluations,
    expansionEvaluations: expansionEvaluationsForTrend,
  })
  const expansionStructureDecisionTrend = buildSafeBatchExpansionStructureDecisionTrend({
    decisionEvaluations: structureDecisionEntries
      .slice(0, 12)
      .map(entry => safeBatchExpansionStructureDecisionEntryEvaluation({
        entry,
        chapters: args.chapters,
        reviews: args.reviews,
      })),
  })
  if (!latest) {
    if (latestStructureValidation) {
      const result = latestStructureValidation.result
      const riskCount = Number(result.risk_count || 0)
      const rollbackPolicy = safeBatchExpansionRollbackPolicy({
        riskCount,
        coreRiskCount: Number(result.core_risk_count || 0),
        hotspotLabel: text(result.repeated_hotspot_segment?.label),
      })
      return {
        visible: true,
        status: riskCount > 0 ? 'rollback_to_small_batch' : 'recovered',
        label: '扩批热区反馈',
        summary: riskCount > 0 ? `${result.summary}${rollbackPolicy.summary}` : result.summary,
        targetChapterCount: riskCount > 0 ? Number(rollbackPolicy.targetChapterCount || 3) : 5,
        latestBatchCreatedAt: latestStructureValidation.latestBatchCreatedAt,
        latestChapterNos: latestStructureValidation.latestChapterNos,
        riskCount,
        stablePassStreak: 0,
        recentExpandedBatchCount: 0,
        repeatedHotspotSegment: result.repeated_hotspot_segment || null,
        rollbackPolicy: riskCount > 0 ? rollbackPolicy : null,
        expansionStructureValidationResult: result,
        expansionStructureValidationTrend,
        defaultFiveChapterLaneTemplateStabilityProfile,
        expansionStructureRepairEffectiveness,
        expansionStructureDecisionTrend,
      }
    }
    return {
      visible: false,
      status: 'none',
      label: '扩批热区反馈',
      summary: '尚未产生5章扩批分段复盘。',
      targetChapterCount: 0,
      latestBatchCreatedAt: '',
      latestChapterNos: [],
      riskCount: 0,
      stablePassStreak: 0,
      recentExpandedBatchCount: 0,
      repeatedHotspotSegment: null,
      rollbackPolicy: null,
      expansionStructureValidationTrend,
      defaultFiveChapterLaneTemplateStabilityProfile,
      expansionStructureRepairEffectiveness,
      expansionStructureDecisionTrend,
    }
  }

  let stablePassStreak = 0
  for (const evaluation of evaluations) {
    if (evaluation.rawRiskCount > 0) break
    stablePassStreak += 1
  }
  const recentExpandedBatchCount = evaluations.length
  const repeatedHotspotCount = latest.topHotspot
    ? evaluations.filter(evaluation => text(evaluation.topHotspot?.key) === text(latest.topHotspot?.key)).length
    : 0
  const recoveryRestoreRelapseSegment = safeBatchRecoveryRestoreRelapseSegment(latest)
  const defaultFiveChapterRecoveryVerdictRelapse = safeBatchDefaultFiveChapterRecoveryVerdictRelapse(latest)
  const defaultFiveChapterRegression = safeBatchDefaultFiveChapterRegression(latest)
  const repeatedHotspotSegment = recoveryRestoreRelapseSegment
    || defaultFiveChapterRegression?.repeated_hotspot_segment
    || (latest.topHotspot && repeatedHotspotCount >= 2
      ? {
        key: text(latest.topHotspot.key),
        label: text(latest.topHotspot.label),
        count: repeatedHotspotCount,
        summary: `${text(latest.topHotspot.label)}连续 ${repeatedHotspotCount} 次扩批热区，先做${text(latest.topHotspot.label)}固定段落治理和批次结构改写。`,
      }
      : null)
  const recoveryRestoreStabilityEvidence = safeBatchRecoveryRestoreStabilityEvidence(latest, stablePassStreak)
  const feedbackBase = {
    stablePassStreak,
    recentExpandedBatchCount,
    repeatedHotspotSegment,
    recoveryRestoreStabilityEvidence,
    defaultFiveChapterRegression,
    defaultFiveChapterRecoveryVerdictRelapse,
    defaultFiveChapterLaneTemplateStabilityProfile,
  }
  const validationIsNewerThanLatestExpansion = latestStructureValidation
    ? Date.parse(text(latestStructureValidation.latestBatchCreatedAt)) > Date.parse(text(latest.latestBatchCreatedAt))
    : false
  if (latestStructureValidation && validationIsNewerThanLatestExpansion) {
    const result = latestStructureValidation.result
    const riskCount = Number(result.risk_count || 0)
    const rollbackPolicy = safeBatchExpansionRollbackPolicy({
      riskCount,
      coreRiskCount: Number(result.core_risk_count || 0),
      hotspotLabel: text(result.repeated_hotspot_segment?.label),
    })
    return {
      visible: true,
      status: riskCount > 0 ? 'rollback_to_small_batch' : 'recovered',
      label: '扩批热区反馈',
      summary: riskCount > 0 ? `${result.summary}${rollbackPolicy.summary}` : result.summary,
      targetChapterCount: riskCount > 0 ? Number(rollbackPolicy.targetChapterCount || 3) : 5,
      latestBatchCreatedAt: latestStructureValidation.latestBatchCreatedAt,
      latestChapterNos: latestStructureValidation.latestChapterNos,
      riskCount,
      ...feedbackBase,
      repeatedHotspotSegment: result.repeated_hotspot_segment || repeatedHotspotSegment,
      rollbackPolicy: riskCount > 0 ? rollbackPolicy : null,
      expansionStructureValidationResult: result,
      expansionStructureValidationTrend,
      expansionStructureRepairEffectiveness,
      expansionStructureDecisionTrend,
    }
  }

  if (latest.rawRiskCount <= 0) {
    const summary = recoveryRestoreStabilityEvidence
      ? `${recoveryRestoreStabilityEvidence.summary} 已沉淀为长期扩批稳定证据。`
      : stablePassStreak > 1
        ? `连续 ${stablePassStreak} 批5章扩批通过，前段、中段、后段核心/回报/追读稳定，可继续观察 5 章安全连写。`
        : '最近一次5章扩批分段复盘通过，前段、中段、后段核心/回报/追读稳定。'
    return {
      visible: true,
      status: 'passed',
      label: '扩批热区反馈',
      summary,
      targetChapterCount: 5,
      latestBatchCreatedAt: latest.latestBatchCreatedAt,
      latestChapterNos: latest.latestChapterNos,
      riskCount: 0,
      ...feedbackBase,
      rollbackPolicy: null,
      expansionStructureValidationTrend,
      expansionStructureRepairEffectiveness,
      expansionStructureDecisionTrend,
    }
  }
  if (latest.segmentResolved && latest.effectiveRiskCount <= 0) {
    return {
      visible: true,
      status: 'recovered',
      label: '扩批热区反馈',
      summary: '扩批分段热区已修复并通过复检。',
      targetChapterCount: 5,
      latestBatchCreatedAt: latest.latestBatchCreatedAt,
      latestChapterNos: latest.latestChapterNos,
      riskCount: 0,
      ...feedbackBase,
      rollbackPolicy: null,
      expansionStructureValidationTrend,
      expansionStructureRepairEffectiveness,
      expansionStructureDecisionTrend,
    }
  }

  const rollbackPolicy = latest.rawReview.rollbackPolicy || safeBatchExpansionRollbackPolicy({
    riskCount: latest.rawRiskCount,
    coreRiskCount: Number(latest.rawReview.coreRiskCount || 0),
    hotspotLabel: '',
  })
  const summary = defaultFiveChapterRegression
    ? `${defaultFiveChapterRegression.summary}${text(rollbackPolicy?.summary)}`
    : defaultFiveChapterRecoveryVerdictRelapse
    ? `${defaultFiveChapterRecoveryVerdictRelapse.summary}${text(rollbackPolicy?.summary)}`
    : repeatedHotspotSegment
    ? `${repeatedHotspotSegment.summary}${text(rollbackPolicy?.summary)}`
    : text(rollbackPolicy?.summary, '扩批分段热区未闭环，下一轮回退到小批量安全连写。')
  return {
    visible: true,
    status: text(rollbackPolicy?.mode, 'rollback_to_small_batch'),
    label: '扩批热区反馈',
    summary,
    targetChapterCount: Number(rollbackPolicy?.targetChapterCount || 3),
    latestBatchCreatedAt: latest.latestBatchCreatedAt,
    latestChapterNos: latest.latestChapterNos,
    riskCount: latest.rawRiskCount,
    ...feedbackBase,
    rollbackPolicy,
    expansionStructureValidationTrend,
    expansionStructureRepairEffectiveness,
    expansionStructureDecisionTrend,
  }
}


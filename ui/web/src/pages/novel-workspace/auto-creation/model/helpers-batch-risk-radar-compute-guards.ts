import type {
  AnyRecord,
} from './types'
import {
  batchRepairTask,
  batchRiskIssueResolved,
  buildRecoveryEvidenceReview,
  buildStrengthenedRepairAcceptanceReview,
  coreRiskCount,
  recoveryEvidenceReview,
} from './helpers-main'
import {
  buildDefaultFiveChapterLaneTemplateRedesignQueue,
  buildDefaultFiveChapterLaneTemplateRepair,
  buildSafeBatchExpansionStructureReview,
  buildSafeBatchExpansionStructureValidationResult,
  safeBatchExpansionRollbackPolicy,
  safeBatchExpansionSegmentReviewSnapshot,
} from './helpers-safe-batch-recovery'
import {
  buildBatchChecklistExecution,
  buildRecoveryEvidenceRegovernanceQueue,
  buildSafeBatchExpansionSegmentReview,
  buildSafeBatchExpansionStructureDecisionExecutionReview,
  safeBatchExpansionSegmentResolvedForItems,
} from './helpers-safe-batch-expansion-structure'
import {
  arrayValue,
  text,
} from './helpers-basics'

export function buildBatchRiskRadarGuardCompute(input: {
  args: {
    items: any[]
    chapters: AnyRecord[]
    reviews: AnyRecord[]
    planning?: any
    resolvedIssueKeys?: Set<string>
    nextBatchBrief?: AnyRecord | null
    batchPreflight?: AnyRecord | null
    expansionFeedback?: AnyRecord | null
    postBatchQualityCheck?: AnyRecord | null
  }
  successfulItems: any
  postBatchQualityCheck: any
  postBatchQualityRiskTotal: any
  coreRiskTotal: any
  runwayRiskTotal: any
  payoffDebtTotal: any
  readerPullRiskTotal: any
  readerTrialRiskTotal: any
  first30RetentionRiskTotal: any
  handoffRiskTotal: any
  storylineRiskTotal: any
  storyDriveRiskTotal: any
  innovationRiskTotal: any
  signatureSceneRiskTotal: any
  chapterAttractionRiskTotal: any
  styleSampleRiskTotal: any
  forbiddenBoundaryRiskTotal: any
  expansionChapterRisks: any
  serialRhythmReview: any
  serialRhythmRiskTotal: any
  assetGrowthReview: any
  assetGrowthRiskTotal: any
  readerTrialReview: any
  readerTrialRiskItem: any
  first30RetentionRiskReview: any
  first30RetentionRiskItem: any
  batchPlanRiskTotal: any
  repairTasks: AnyRecord[]
}): Record<string, any> {
  const args = input.args
  const successfulItems = input.successfulItems
  const postBatchQualityCheck = input.postBatchQualityCheck
  const postBatchQualityRiskTotal = input.postBatchQualityRiskTotal
  const coreRiskTotal = input.coreRiskTotal
  const runwayRiskTotal = input.runwayRiskTotal
  const payoffDebtTotal = input.payoffDebtTotal
  const readerPullRiskTotal = input.readerPullRiskTotal
  const readerTrialRiskTotal = input.readerTrialRiskTotal
  const first30RetentionRiskTotal = input.first30RetentionRiskTotal
  const handoffRiskTotal = input.handoffRiskTotal
  const storylineRiskTotal = input.storylineRiskTotal
  const storyDriveRiskTotal = input.storyDriveRiskTotal
  const innovationRiskTotal = input.innovationRiskTotal
  const signatureSceneRiskTotal = input.signatureSceneRiskTotal
  const chapterAttractionRiskTotal = input.chapterAttractionRiskTotal
  const styleSampleRiskTotal = input.styleSampleRiskTotal
  const forbiddenBoundaryRiskTotal = input.forbiddenBoundaryRiskTotal
  const expansionChapterRisks = input.expansionChapterRisks
  const serialRhythmReview = input.serialRhythmReview
  const serialRhythmRiskTotal = input.serialRhythmRiskTotal
  const assetGrowthReview = input.assetGrowthReview
  const assetGrowthRiskTotal = input.assetGrowthRiskTotal
  const readerTrialReview = input.readerTrialReview
  const readerTrialRiskItem = input.readerTrialRiskItem
  const first30RetentionRiskReview = input.first30RetentionRiskReview
  const first30RetentionRiskItem = input.first30RetentionRiskItem
  const batchPlanRiskTotal = input.batchPlanRiskTotal
  const repairTasks = input.repairTasks
  const batchChecklistExecution = buildBatchChecklistExecution({
    nextBatchBrief: args.nextBatchBrief,
    counts: {
      coreRiskTotal,
      runwayRiskTotal,
      payoffDebtTotal,
      readerPullRiskTotal,
      handoffRiskTotal,
      storylineRiskTotal,
      storyDriveRiskTotal,
      innovationRiskTotal,
      signatureSceneRiskTotal,
      chapterAttractionRiskTotal,
      forbiddenBoundaryRiskTotal,
      batchPlanRiskTotal,
    },
  })
  const batchChecklistResolved = successfulItems.length > 0 && batchRiskIssueResolved(args.resolvedIssueKeys, successfulItems[0], 'batch_checklist_mismatch')
  const batchChecklistRiskTotal = batchChecklistResolved ? 0 : batchChecklistExecution.missed.length
  const effectiveBatchChecklistExecution = batchChecklistResolved && batchChecklistExecution.visible
    ? {
      ...batchChecklistExecution,
      status: 'ok' as const,
      score: 100,
      summary: '批次开工清单风险已修复并通过复检。',
      items: batchChecklistExecution.items.map(item => ({ ...item, status: 'ok' as const })),
      missed: [],
    }
    : batchChecklistExecution
  if (batchChecklistRiskTotal > 0 && successfulItems.length > 0) {
    repairTasks.push(batchRepairTask({
      item: successfulItems[0],
      issueType: 'batch_checklist_mismatch',
      severity: batchChecklistRiskTotal >= 3 ? 'high' : 'medium',
      message: `批次开工清单 ${batchChecklistRiskTotal} 项未兑现，连续生产可能偏离万订护栏。`,
      action: '按批次开工清单重修本批：先修核心承诺、故事驱动力、读者回报、创新记忆点和禁写边界，再复查整批交稿。',
      metrics: {
        batch_checklist_risk_count: batchChecklistRiskTotal,
        score: batchChecklistExecution.score,
      },
      batchChecklistExecution,
    }))
  }
  const recoveryEvidenceReview = buildRecoveryEvidenceReview({
    preflight: args.batchPreflight,
    counts: {
      payoffDebtTotal,
      readerPullRiskTotal,
      storylineRiskTotal,
      styleSampleRiskTotal,
      batchPlanRiskTotal,
      batchChecklistRiskTotal,
    },
  })
  const recoveryEvidenceResolved = successfulItems.length > 0 && batchRiskIssueResolved(args.resolvedIssueKeys, successfulItems[0], 'recovery_evidence_mismatch')
  const effectiveRecoveryEvidenceReview = recoveryEvidenceResolved && recoveryEvidenceReview.visible
    ? {
      ...recoveryEvidenceReview,
      status: 'ok' as const,
      failed_evidence: [],
      failed_items: [],
      summary: '恢复放行依据失效风险已修复并通过复检。',
    }
    : recoveryEvidenceReview
  const recoveryEvidenceRiskTotal = effectiveRecoveryEvidenceReview.failed_evidence.length
  if (recoveryEvidenceRiskTotal > 0 && successfulItems.length > 0) {
    const recoveryEvidenceRegovernanceQueue = buildRecoveryEvidenceRegovernanceQueue({
      preflight: args.batchPreflight,
      review: effectiveRecoveryEvidenceReview,
    })
    repairTasks.push(batchRepairTask({
      item: successfulItems[0],
      issueType: 'recovery_evidence_mismatch',
      severity: recoveryEvidenceRiskTotal >= 2 ? 'high' : 'medium',
      message: `恢复放行依据 ${recoveryEvidenceRiskTotal} 项未兑现，上一轮闭环可能没有真正落到正文。`,
      action: '按失效依据回修本批：逐项核对样章执行、读者回报、主线/剧情线和批次任务书，修完后重新运行交稿复盘。',
      metrics: { recovery_evidence_risk_count: recoveryEvidenceRiskTotal },
      recoveryEvidenceReview: effectiveRecoveryEvidenceReview,
      recoveryEvidenceRegovernanceQueue,
    }))
  }
  const strengthenedRepairAcceptanceReview = buildStrengthenedRepairAcceptanceReview({
    preflight: args.batchPreflight,
    counts: {
      coreRiskTotal,
      payoffDebtTotal,
      readerPullRiskTotal,
    },
  })
  const strengthenedRepairAcceptanceResolved = successfulItems.length > 0
    && batchRiskIssueResolved(args.resolvedIssueKeys, successfulItems[0], 'strengthened_repair_acceptance_mismatch')
  const effectiveStrengthenedRepairAcceptanceReview = strengthenedRepairAcceptanceResolved && strengthenedRepairAcceptanceReview.visible
    ? {
      ...strengthenedRepairAcceptanceReview,
      status: 'ok' as const,
      failed_evidence: [],
      risk_count: 0,
      core_risk_count: 0,
      payoff_debt_count: 0,
      reader_pull_risk_count: 0,
      summary: '强化深修恢复验收风险已修复并通过复检。',
    }
    : strengthenedRepairAcceptanceReview
  const strengthenedRepairAcceptanceRiskTotal = effectiveStrengthenedRepairAcceptanceReview.visible
    ? Number(effectiveStrengthenedRepairAcceptanceReview.risk_count || 0)
    : 0
  if (strengthenedRepairAcceptanceRiskTotal > 0 && successfulItems.length > 0) {
    repairTasks.push(batchRepairTask({
      item: successfulItems[0],
      issueType: 'strengthened_repair_acceptance_mismatch',
      severity: effectiveStrengthenedRepairAcceptanceReview.core_risk_count > 0 || strengthenedRepairAcceptanceRiskTotal >= 2 ? 'high' : 'medium',
      message: `强化深修恢复验收未通过，核心守恒、读者回报或追读拉力仍有 ${strengthenedRepairAcceptanceRiskTotal} 项风险。`,
      action: '按强化深修恢复验收重修本批：先校准全书核心承诺，再补齐显性爽点回报和章末追读动力，复查通过前不放宽下一批。',
      metrics: {
        strengthened_repair_acceptance_risk_count: strengthenedRepairAcceptanceRiskTotal,
        core_risk_count: effectiveStrengthenedRepairAcceptanceReview.core_risk_count,
        payoff_debt_count: effectiveStrengthenedRepairAcceptanceReview.payoff_debt_count,
        reader_pull_risk_count: effectiveStrengthenedRepairAcceptanceReview.reader_pull_risk_count,
      },
      strengthenedRepairAcceptanceReview: effectiveStrengthenedRepairAcceptanceReview,
    }))
  }
  const safeBatchExpansionSegmentReview = buildSafeBatchExpansionSegmentReview({
    preflight: args.batchPreflight,
    chapterRisks: expansionChapterRisks,
  })
  const safeBatchExpansionSegmentResolved = safeBatchExpansionSegmentResolvedForItems(
    args.resolvedIssueKeys,
    successfulItems,
    safeBatchExpansionSegmentReview,
  )
  const effectiveSafeBatchExpansionSegmentReview = safeBatchExpansionSegmentResolved && safeBatchExpansionSegmentReview.visible
    ? {
      ...safeBatchExpansionSegmentReview,
      status: 'ok' as const,
      riskCount: 0,
      hotspots: [],
      summary: '5章扩批分段热区已修复并通过复检。',
    }
    : safeBatchExpansionSegmentReview
  const safeBatchExpansionSegmentRiskTotal = effectiveSafeBatchExpansionSegmentReview.visible
    ? Number(effectiveSafeBatchExpansionSegmentReview.riskCount || 0)
    : 0
  const safeBatchExpansionStructureValidationResult = buildSafeBatchExpansionStructureValidationResult({
    preflight: args.batchPreflight,
    chapterRisks: expansionChapterRisks,
    chapters: args.chapters,
  })
  const safeBatchExpansionStructureValidationRiskTotal = safeBatchExpansionStructureValidationResult.visible
    ? Number(safeBatchExpansionStructureValidationResult.risk_count || 0)
    : 0
  const safeBatchExpansionStructureDecisionReview = buildSafeBatchExpansionStructureDecisionExecutionReview({
    nextBatchBrief: args.nextBatchBrief,
    batchPreflight: args.batchPreflight,
    items: successfulItems,
    chapters: args.chapters,
    reviews: args.reviews,
  })
  const safeBatchExpansionStructureDecisionResolved = safeBatchExpansionStructureDecisionReview.visible
    && arrayValue(safeBatchExpansionStructureDecisionReview.failed_items).length > 0
    && arrayValue(safeBatchExpansionStructureDecisionReview.failed_items).every((failed: AnyRecord) => batchRiskIssueResolved(
      args.resolvedIssueKeys,
      { chapterId: failed.chapter_id ?? null, chapterNo: Number(failed.chapter_no || 0) },
      'safe_batch_expansion_structure_decision_mismatch',
    ))
  const effectiveSafeBatchExpansionStructureDecisionReview = safeBatchExpansionStructureDecisionResolved
    ? {
      ...safeBatchExpansionStructureDecisionReview,
      status: 'ok' as const,
      risk_count: 0,
      missed_chapter_nos: [],
      failed_items: [],
      summary: '扩批结构决策执行风险已修复并通过复检。',
    }
    : safeBatchExpansionStructureDecisionReview
  const safeBatchExpansionStructureDecisionRiskTotal = effectiveSafeBatchExpansionStructureDecisionReview.visible
    ? Number(effectiveSafeBatchExpansionStructureDecisionReview.risk_count || 0)
    : 0
  const safeBatchExpansionStructureDecisionDefaultLane = Boolean(
    effectiveSafeBatchExpansionStructureDecisionReview.default_five_chapter_lane_redesign
    || effectiveSafeBatchExpansionStructureDecisionReview.defaultFiveChapterLaneRedesign,
  )
  const safeBatchExpansionStructureValidationTrend = args.expansionFeedback?.expansionStructureValidationTrend
    || args.expansionFeedback?.expansion_structure_validation_trend
    || null
  const defaultLaneTemplateStabilityProfile = args.expansionFeedback?.defaultFiveChapterLaneTemplateStabilityProfile
    || args.expansionFeedback?.default_five_chapter_lane_template_stability_profile
    || null
  if (safeBatchExpansionStructureDecisionRiskTotal > 0 && successfulItems.length > 0) {
    const failedChapterNo = Number(effectiveSafeBatchExpansionStructureDecisionReview.missed_chapter_nos?.[0] || 0)
    const failedItem = successfulItems.find(item => Number(item.chapterNo || 0) === failedChapterNo) || successfulItems[0]
    repairTasks.push(batchRepairTask({
      item: failedItem,
      issueType: 'safe_batch_expansion_structure_decision_mismatch',
      taskType: 'repair_planning',
      severity: safeBatchExpansionStructureDecisionRiskTotal >= 3 || text(effectiveSafeBatchExpansionStructureDecisionReview.recommendation) === 'escalate_structure_redesign' ? 'high' : 'medium',
      message: safeBatchExpansionStructureDecisionDefaultLane
        ? `默认5章档位模板未落地，${safeBatchExpansionStructureDecisionRiskTotal} 项段位职责、冲突轮换、回报密度或章末追读模板缺口会导致恢复判定再次失效。`
        : `扩批结构决策未落地，${safeBatchExpansionStructureDecisionRiskTotal} 项段位职责、观察指标或重构原则缺口会放大扩批复发风险。`,
      action: safeBatchExpansionStructureDecisionDefaultLane
        ? '回到下一批任务书和正文：补齐默认5章档位的段位职责、冲突轮换、回报密度和章末追读模板，再重新回填结构决策执行并运行批次复盘。'
        : '回到下一批任务书和正文：逐章补齐扩批结构决策的段位职责、观察指标和必要的重构原则，再重新运行批次复盘。',
      metrics: {
        safe_batch_expansion_structure_decision_risk_count: safeBatchExpansionStructureDecisionRiskTotal,
        target_chapter_count: effectiveSafeBatchExpansionStructureDecisionReview.target_chapter_count,
        recommendation: effectiveSafeBatchExpansionStructureDecisionReview.recommendation,
      },
      safeBatchExpansionStructureDecisionReview: effectiveSafeBatchExpansionStructureDecisionReview,
    }))
  }
  if (safeBatchExpansionSegmentRiskTotal > 0 && successfulItems.length > 0) {
    const hotspotChapterNo = Number(effectiveSafeBatchExpansionSegmentReview.hotspots?.[0]?.chapterNos?.[0] || 0)
    const hotspotItem = successfulItems.find(item => Number(item.chapterNo || 0) === hotspotChapterNo) || successfulItems[0]
    const expansionStructureReview = buildSafeBatchExpansionStructureReview({
      segmentReview: effectiveSafeBatchExpansionSegmentReview,
      expansionFeedback: args.expansionFeedback,
    })
    if (expansionStructureReview.visible) {
      const repeatedSegment = expansionStructureReview.repeated_hotspot_segment
      const defaultRegression = expansionStructureReview.default_five_chapter_regression || null
      const defaultRecoveryVerdictRelapse = expansionStructureReview.default_five_chapter_recovery_verdict_relapse || null
      const defaultLaneTemplateProductionRelapseQueue = expansionStructureReview.default_five_chapter_lane_template_redesign_queue || null
      const defaultLaneTemplateProductionRelapseVersionId = text(
        defaultLaneTemplateProductionRelapseQueue?.template_version_id
        || defaultLaneTemplateProductionRelapseQueue?.templateVersionId
        || defaultLaneTemplateProductionRelapseQueue?.template_version?.id
        || defaultLaneTemplateProductionRelapseQueue?.templateVersion?.id,
      )
      const expansionStructureReviewWithTrend = {
        ...expansionStructureReview,
        ...(safeBatchExpansionStructureValidationTrend?.visible ? {
          expansion_structure_validation_trend: safeBatchExpansionStructureValidationTrend,
        } : {}),
      }
      repairTasks.push(batchRepairTask({
        item: hotspotItem,
        issueType: 'safe_batch_expansion_structure_repair',
        taskType: 'repair_planning',
        severity: 'high',
        message: defaultRecoveryVerdictRelapse
          ? `默认5章档位恢复判定失效：${text(defaultRecoveryVerdictRelapse.summary, `${repeatedSegment?.label || '扩批段位'}同维复发，需要回到3章验证批。`)}`
          : defaultLaneTemplateProductionRelapseQueue
          ? `默认5章档位模板版本 ${defaultLaneTemplateProductionRelapseVersionId || '当前版本'} 真实生产复发：${text(defaultLaneTemplateProductionRelapseQueue.summary)}`
          : defaultRegression
          ? `默认5章档位失效：${text(defaultRegression.summary, `${repeatedSegment?.label || '扩批段位'}复发，需要改写批次结构。`)}`
          : `${repeatedSegment?.label || '扩批段位'}连续 ${repeatedSegment?.count || 2} 次扩批热区，单修章节不足，需要改写批次结构。`,
        action: defaultRecoveryVerdictRelapse
          ? `恢复判定失效 -> 回到3章验证批：先按${repeatedSegment?.label || '复发段位'}固定段落治理和批次结构改写，逐项重证${arrayValue(defaultRecoveryVerdictRelapse.relapsed_failure_reasons || defaultRecoveryVerdictRelapse.relapsedFailureReasons).map(item => text(item)).filter(Boolean).join('、') || '核心守恒、显性回报和章末追读'}已清零，再恢复默认5章档位。`
          : defaultRegression
          ? `先按${repeatedSegment?.label || '复发段位'}固定段落治理和批次结构改写，下一轮回到3章验证批；验证核心守恒、显性回报和章末追读稳定后，再恢复默认5章档位。`
          : `先做${repeatedSegment?.label || '复发段位'}固定段落治理和批次结构改写，再按 ${expansionStructureReview.rollback_policy?.target_chapter_count || 3} 章以内恢复安全连写。`,
        metrics: {
          safe_batch_expansion_structure_risk_count: safeBatchExpansionSegmentRiskTotal,
          repeated_hotspot_count: repeatedSegment?.count || 0,
          target_chapter_count: effectiveSafeBatchExpansionSegmentReview.targetChapterCount,
          rollback_target_chapter_count: expansionStructureReview.rollback_policy?.target_chapter_count || 3,
          ...(defaultRegression ? { default_five_chapter_regression: 1 } : {}),
          ...(defaultRecoveryVerdictRelapse ? { default_five_chapter_recovery_verdict_relapse: 1 } : {}),
        },
        ...(defaultRegression ? { actionKey: 'restore_default_lane_regression' } : {}),
        safeBatchExpansionStructureReview: expansionStructureReviewWithTrend,
      }))
    } else {
      repairTasks.push(batchRepairTask({
        item: hotspotItem,
        issueType: 'safe_batch_expansion_segment_hotspot',
        severity: effectiveSafeBatchExpansionSegmentReview.rollbackPolicy?.mode === 'rollback_to_single_chapter' ? 'high' : 'medium',
        message: `${effectiveSafeBatchExpansionSegmentReview.label}未通过，${effectiveSafeBatchExpansionSegmentReview.summary}`,
        action: `${effectiveSafeBatchExpansionSegmentReview.rollbackPolicy?.summary || '先按热区章节重修，再缩小下一批安全连写。'}`,
        metrics: {
          safe_batch_expansion_segment_risk_count: safeBatchExpansionSegmentRiskTotal,
          target_chapter_count: effectiveSafeBatchExpansionSegmentReview.targetChapterCount,
          rollback_target_chapter_count: effectiveSafeBatchExpansionSegmentReview.rollbackPolicy?.targetChapterCount || 3,
        },
        safeBatchExpansionSegmentReview: safeBatchExpansionSegmentReviewSnapshot(effectiveSafeBatchExpansionSegmentReview),
      }))
    }
  }
  if (safeBatchExpansionStructureValidationRiskTotal > 0 && successfulItems.length > 0) {
    const failedChapterNo = Number(safeBatchExpansionStructureValidationResult.failed_chapter_nos?.[0] || 0)
    const failedItem = successfulItems.find(item => Number(item.chapterNo || 0) === failedChapterNo) || successfulItems[0]
    const defaultLaneTemplateRepair = buildDefaultFiveChapterLaneTemplateRepair(
      safeBatchExpansionStructureValidationResult.default_five_chapter_lane_template_verdict,
    )
    const defaultLaneTemplateRedesignQueue = buildDefaultFiveChapterLaneTemplateRedesignQueue(
      defaultLaneTemplateStabilityProfile,
    )
    const defaultLaneTemplateRepairSummary = text(defaultLaneTemplateRepair?.repair_summary)
    const defaultLaneTemplateRepairActions = arrayValue(defaultLaneTemplateRepair?.repair_actions)
      .map(item => text(item))
      .filter(Boolean)
    const defaultLaneTemplateRedesignActions = arrayValue(defaultLaneTemplateRedesignQueue?.redesign_requirements)
      .map((item: AnyRecord) => text(item?.instruction))
      .filter(Boolean)
    const rollbackPolicy = safeBatchExpansionRollbackPolicy({
      riskCount: safeBatchExpansionStructureValidationRiskTotal,
      coreRiskCount: Number(safeBatchExpansionStructureValidationResult.core_risk_count || 0),
      hotspotLabel: text(safeBatchExpansionStructureValidationResult.repeated_hotspot_segment?.label),
    })
    const structureReview = {
      visible: true,
      status: 'warn',
      label: '扩批结构修复',
      summary: safeBatchExpansionStructureValidationResult.summary,
      repeated_hotspot_segment: safeBatchExpansionStructureValidationResult.repeated_hotspot_segment || null,
      latest_chapter_nos: safeBatchExpansionStructureValidationResult.validation_chapter_nos,
      affected_chapter_nos: safeBatchExpansionStructureValidationResult.failed_chapter_nos,
      hotspot_summaries: [safeBatchExpansionStructureValidationResult.summary],
      ...(defaultLaneTemplateRepair ? {
        default_five_chapter_lane_template_repair: defaultLaneTemplateRepair,
      } : {}),
      ...(defaultLaneTemplateStabilityProfile ? {
        default_five_chapter_lane_template_stability_profile: defaultLaneTemplateStabilityProfile,
      } : {}),
      ...(defaultLaneTemplateRedesignQueue ? {
        default_five_chapter_lane_template_redesign_queue: defaultLaneTemplateRedesignQueue,
      } : {}),
      structure_actions: [
        ...defaultLaneTemplateRedesignActions,
        ...defaultLaneTemplateRepairActions,
        safeBatchExpansionStructureValidationResult.fixed_segment_role,
        safeBatchExpansionStructureValidationResult.conflict_rotation,
        safeBatchExpansionStructureValidationResult.explicit_payoff,
        safeBatchExpansionStructureValidationResult.ending_hook_requirement,
        ...arrayValue(safeBatchExpansionStructureValidationResult.structure_actions),
      ].map(item => text(item)).filter(Boolean),
      validation_result: safeBatchExpansionStructureValidationResult,
      rollback_policy: {
        mode: rollbackPolicy.mode,
        target_chapter_count: rollbackPolicy.targetChapterCount,
        label: rollbackPolicy.label,
        summary: rollbackPolicy.summary,
      },
      ...(safeBatchExpansionStructureValidationTrend?.visible ? {
        expansion_structure_validation_trend: safeBatchExpansionStructureValidationTrend,
      } : {}),
    }
    repairTasks.push(batchRepairTask({
      item: failedItem,
      issueType: 'safe_batch_expansion_structure_repair',
      taskType: 'repair_planning',
      severity: defaultLaneTemplateRedesignQueue || safeBatchExpansionStructureValidationResult.core_risk_count > 0 || safeBatchExpansionStructureValidationRiskTotal >= 2 ? 'high' : 'medium',
      message: defaultLaneTemplateRedesignQueue
        ? `默认档位模板稳定性画像要求升级重构，${text(defaultLaneTemplateRedesignQueue.summary, defaultLaneTemplateRepairSummary || '同项模板复发')}，不能只做普通结构修复。`
        : defaultLaneTemplateRepair
        ? `默认档位模板回检未通过，${defaultLaneTemplateRepairSummary || `${safeBatchExpansionStructureValidationRiskTotal} 项模板缺口`}会阻止恢复默认5章档位。`
        : `扩批结构验证未通过，验证批仍有 ${safeBatchExpansionStructureValidationRiskTotal} 项核心/回报/追读风险。`,
      action: defaultLaneTemplateRedesignQueue
        ? '升级默认档位模板重构：先重写默认5章档位的段位职责、冲突轮换、回报密度和章末追读模板，再写下一轮验证标准；复验连续2批全过前不恢复默认5章档位。'
        : defaultLaneTemplateRepair
        ? `回到扩批结构任务书：${defaultLaneTemplateRepairSummary}；把缺失模板写成下一轮段位职责、冲突轮换、显性回报密度和章末追读检查项，再用2-3章复验；复验通过前不恢复默认5章档位。`
        : '回到扩批结构任务书：重写验证批段位职责、冲突轮换、显性回报和章末追读，再用2-3章复验；复验通过前不恢复5章扩批。',
      metrics: {
        safe_batch_expansion_structure_validation_risk_count: safeBatchExpansionStructureValidationRiskTotal,
        core_risk_count: safeBatchExpansionStructureValidationResult.core_risk_count,
        payoff_debt_count: safeBatchExpansionStructureValidationResult.payoff_debt_count,
        reader_pull_risk_count: safeBatchExpansionStructureValidationResult.reader_pull_risk_count,
        ...(defaultLaneTemplateRepair ? {
          default_five_chapter_lane_template_missing_count: defaultLaneTemplateRepair.missing_count,
        } : {}),
        ...(defaultLaneTemplateRedesignQueue ? {
          default_five_chapter_lane_template_redesign_queue: 1,
        } : {}),
      },
      safeBatchExpansionStructureReview: structureReview,
      safeBatchExpansionStructureValidationResult,
    }))
  }
  if (serialRhythmRiskTotal > 0 && successfulItems.length > 0) {
    const firstItem = successfulItems[0]
    repairTasks.push(batchRepairTask({
      item: firstItem,
      issueType: 'serial_rhythm_fatigue',
      severity: serialRhythmRiskTotal >= 2 ? 'high' : 'medium',
      message: `本批存在 ${serialRhythmRiskTotal} 项连载节奏同质化，连续阅读容易疲劳。`,
      action: '按批次重修节奏：轮换冲突来源、读者回报、章末追读问题和可视化场面，再复查整批连载读感。',
      metrics: { serial_rhythm_risk_count: serialRhythmRiskTotal, score: serialRhythmReview.score },
      serialRhythmReview,
    }))
  }
  if (assetGrowthRiskTotal > 0 && successfulItems.length > 0) {
    const firstItem = successfulItems[0]
    repairTasks.push(batchRepairTask({
      item: firstItem,
      issueType: 'asset_growth_over_budget',
      taskType: 'repair_assets',
      severity: assetGrowthReview.pending_count >= assetGrowthReview.budget + 4 ? 'high' : 'medium',
      message: `本批发现 ${assetGrowthReview.pending_count} 个新资产，超过预算 ${assetGrowthReview.budget}，存在设定膨胀风险。`,
      action: '进入设定工坊，把本批新资产逐项确认入库、改名、合并已有或标记一次性过场；只保留服务当前卷目标和读者承诺的资产。',
      metrics: {
        asset_growth_risk_count: assetGrowthRiskTotal,
        pending_asset_count: assetGrowthReview.pending_count,
        asset_budget: assetGrowthReview.budget,
      },
      assetGrowthReview,
      actionArea: 'assets',
      actionKey: 'open_story_assets',
    }))
  }
  if (readerTrialRiskTotal > 0 && readerTrialRiskItem) {
    repairTasks.push(batchRepairTask({
      item: readerTrialRiskItem,
      issueType: 'reader_trial_drop_point',
      severity: readerTrialReview.score !== null && readerTrialReview.score < 65 || readerTrialRiskTotal >= 3 ? 'high' : 'medium',
      message: `读者试读复盘发现 ${readerTrialRiskTotal} 个当前批次弃读点，可能影响前30章留存和付费转化。`,
      action: '按试读复盘重修命中章节：删减拖慢阅读的解释，把弃读点改成现场冲突、信息增量、爽点兑现或章末翻页问题。',
      metrics: { reader_trial_risk_count: readerTrialRiskTotal, score: readerTrialReview.score },
      readerTrialReview,
    }))
  }
  if (first30RetentionRiskTotal > 0 && first30RetentionRiskItem) {
    const actionKey = text(first30RetentionRiskReview.context?.action_key, 'run_first30_retention')
    repairTasks.push(batchRepairTask({
      item: first30RetentionRiskItem,
      issueType: 'first30_retention_recheck',
      taskType: actionKey === 'create_first30_repair' ? 'repair_planning' : 'review_planning',
      severity: text(first30RetentionRiskReview.context?.status) === 'blocked' || first30RetentionRiskTotal >= 3 ? 'high' : 'medium',
      message: `前30章留存状态需要处理：${first30RetentionRiskReview.summary}`,
      action: actionKey === 'create_first30_repair'
        ? '生成前30章留存修复任务，优先处理开篇钩子、试读闭环和付费前蓄势。'
        : '重新运行前30章留存诊断，确认本批修改后的开篇三章、试读十章和付费前蓄势。',
      metrics: {
        first30_retention_risk_count: first30RetentionRiskTotal,
        score: first30RetentionRiskReview.context?.score ?? null,
      },
      first30Retention: first30RetentionRiskReview.context,
      actionArea: 'planning',
      actionKey,
    }))
  }
  if (postBatchQualityRiskTotal > 0 && successfulItems.length > 0) {
    repairTasks.push(batchRepairTask({
      item: successfulItems[0],
      issueType: 'post_batch_quality_warning',
      severity: postBatchQualityRiskTotal >= 2 ? 'high' : 'medium',
      message: `oh-story 批次交稿后质检仍有 ${postBatchQualityRiskTotal} 项未闭环：${postBatchQualityCheck.summary}`,
      action: '按批次质检摘要回修本批正文、伏笔增量、正文元信息、细纲兑现和状态机更新；修完后重新运行交稿后质检，所有 warn 清零前不继续扩批。',
      metrics: {
        post_batch_quality_risk_count: postBatchQualityRiskTotal,
        average_score: postBatchQualityCheck.average_score,
        revised_count: postBatchQualityCheck.revised_count,
      },
      postBatchQualityCheck,
    }))
  }

  return {
    batchChecklistExecution,
    batchChecklistResolved,
    batchChecklistRiskTotal,
    effectiveBatchChecklistExecution,
    recoveryEvidenceReview,
    recoveryEvidenceResolved,
    effectiveRecoveryEvidenceReview,
    recoveryEvidenceRiskTotal,
    strengthenedRepairAcceptanceReview,
    strengthenedRepairAcceptanceResolved,
    effectiveStrengthenedRepairAcceptanceReview,
    strengthenedRepairAcceptanceRiskTotal,
    safeBatchExpansionSegmentReview,
    safeBatchExpansionSegmentResolved,
    effectiveSafeBatchExpansionSegmentReview,
    safeBatchExpansionSegmentRiskTotal,
    safeBatchExpansionStructureValidationResult,
    safeBatchExpansionStructureValidationRiskTotal,
    safeBatchExpansionStructureDecisionReview,
    safeBatchExpansionStructureDecisionResolved,
    effectiveSafeBatchExpansionStructureDecisionReview,
    safeBatchExpansionStructureDecisionRiskTotal,
    safeBatchExpansionStructureDecisionDefaultLane,
    safeBatchExpansionStructureValidationTrend,
    defaultLaneTemplateStabilityProfile,
  }
}

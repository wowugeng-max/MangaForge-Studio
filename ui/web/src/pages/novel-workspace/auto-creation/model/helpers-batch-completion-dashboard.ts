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
  chapterAttractionRiskCount,
  chapterBenchmarkRiskCount,
  characterArcRiskCount,
  clampScore,
  coreRiskCount,
  innovationRiskCount,
  payoffDebtCount,
  readabilityRiskCount,
  runwayRiskCount,
  signal,
  signatureSceneRiskCount,
  storyDriveRiskCount,
  storylineRiskCount,
  styleSampleRiskCount,
  volumeSegmentRiskCount,
} from './helpers-main'

export function buildBatchCompletionDashboard(args: {
  status: AutoCreationBatchReviewStatus
  total: number
  success: number
  failed: number
  delivered: number
  riskRadar: AutoCreationBatchRiskRadar
  nextAction: AutoCreationDirectorAction
}): AutoCreationBatchCompletionDashboard {
  if (args.status === 'empty') {
    return {
      visible: false,
      status: 'empty',
      score: 0,
      label: '暂无批次',
      summary: '还没有安全连写批次。',
      nextAction: args.nextAction,
      metrics: [],
    }
  }

  const total = Math.max(0, Number(args.total || 0))
  const success = Math.max(0, Number(args.success || 0))
  const failed = Math.max(0, Number(args.failed || 0))
  const delivered = Math.max(0, Number(args.delivered || 0))
  const generationScore = total > 0 ? clampScore((success / total) * 100) : 0
  const deliveryScore = success > 0 ? clampScore((delivered / success) * 100) : 0
  const qualityScore = args.riskRadar.averageQualityScore !== null
    ? clampScore(args.riskRadar.averageQualityScore)
    : success > 0 ? 72 : 0
  const planPenalty = failed * 25
    + args.riskRadar.repairTasks.length * 20
    + args.riskRadar.postBatchQualityRiskCount * 10
    + args.riskRadar.coreRiskCount * 10
    + args.riskRadar.runwayRiskCount * 9
    + args.riskRadar.payoffDebtCount * 5
    + args.riskRadar.readerPullRiskCount * 8
    + args.riskRadar.readerTrialRiskCount * 9
    + args.riskRadar.first30RetentionRiskCount * 15
    + args.riskRadar.handoffRiskCount * 10
    + args.riskRadar.storylineRiskCount * 5
    + args.riskRadar.storyDriveRiskCount * 8
    + args.riskRadar.characterArcRiskCount * 7
    + args.riskRadar.innovationRiskCount * 8
    + args.riskRadar.signatureSceneRiskCount * 10
    + args.riskRadar.chapterAttractionRiskCount * 8
    + args.riskRadar.chapterBenchmarkRiskCount * 7
    + args.riskRadar.styleSampleRiskCount * 6
    + args.riskRadar.readabilityRiskCount * 5
    + args.riskRadar.serialRhythmRiskCount * 8
    + args.riskRadar.assetGrowthRiskCount * 6
    + args.riskRadar.volumeSegmentRiskCount * 10
    + args.riskRadar.batchPlanRiskCount * 10
    + args.riskRadar.batchChecklistRiskCount * 8
    + args.riskRadar.recoveryEvidenceRiskCount * 10
    + args.riskRadar.strengthenedRepairAcceptanceRiskCount * 12
    + args.riskRadar.safeBatchExpansionSegmentRiskCount * 10
    + args.riskRadar.safeBatchExpansionStructureValidationRiskCount * 12
    + args.riskRadar.safeBatchExpansionStructureDecisionRiskCount * 12
  const planScore = clampScore(100 - planPenalty)
  const checklistScore = args.riskRadar.checklistExecution.visible ? args.riskRadar.checklistExecution.score : 100
  const recoveryEvidenceSignal = args.riskRadar.signals.find(signal => signal.key === 'recovery_evidence')
  const recoveryEvidenceClosed = Boolean(recoveryEvidenceSignal && recoveryEvidenceSignal.status === 'ok')
  const strengthenedRepairAcceptanceSignal = args.riskRadar.signals.find(signal => signal.key === 'strengthened_repair_acceptance')
  const strengthenedRepairAccepted = Boolean(strengthenedRepairAcceptanceSignal && strengthenedRepairAcceptanceSignal.status === 'ok')
  const score = args.riskRadar.checklistExecution.visible
    ? clampScore(generationScore * 0.28 + deliveryScore * 0.23 + qualityScore * 0.24 + planScore * 0.17 + checklistScore * 0.08)
    : clampScore(generationScore * 0.3 + deliveryScore * 0.25 + qualityScore * 0.25 + planScore * 0.2)
  const completionStatus: AutoCreationBatchCompletionStatus = args.status === 'warn' || args.status === 'risk'
    ? 'needs_repair'
    : args.status === 'done'
      ? 'ready_next'
      : 'in_progress'

  const metrics: AutoCreationBatchCompletionMetric[] = [
    {
      key: 'generation',
      label: '生成完成',
      value: success,
      target: total,
      status: failed > 0 ? 'block' : total > 0 && success >= total ? 'ok' : 'warn',
      detail: failed > 0 ? `${failed} 章失败，先去任务中心处理。` : total > 0 ? `${success}/${total} 章已生成。` : '暂无批次章节。',
    },
    {
      key: 'delivery',
      label: '交稿完成',
      value: delivered,
      target: success,
      status: success > 0 && delivered >= success ? 'ok' : failed > 0 ? 'warn' : 'warn',
      detail: success > 0 ? `${delivered}/${success} 章完成质检、修订和状态回填。` : '还没有成功生成的章节可交稿。',
    },
    {
      key: 'quality',
      label: '质检健康',
      value: qualityScore,
      target: 100,
      status: args.riskRadar.status === 'warn' || args.riskRadar.lowQualityCount > 0 ? 'warn' : qualityScore >= 82 ? 'ok' : 'warn',
      detail: args.riskRadar.averageQualityScore === null
        ? '暂无批次质检均分。'
        : `批次均分 ${args.riskRadar.averageQualityScore}${args.riskRadar.lowQualityCount > 0 ? `，低分 ${args.riskRadar.lowQualityCount} 章` : ''}。`,
    },
    {
      key: 'plan',
      label: '计划兑现',
      value: planScore,
      target: 100,
      status: failed > 0 ? 'block' : args.riskRadar.repairTasks.length > 0 || args.riskRadar.batchPlanRiskCount > 0 ? 'warn' : 'ok',
      detail: args.riskRadar.repairTasks.length > 0
        ? `待处理 ${args.riskRadar.repairTasks.length} 个批次风险。`
        : '本批读者回报、剧情线和连载计划未发现阻塞风险。',
    },
    ...(recoveryEvidenceSignal ? [{
      key: 'recovery_evidence',
      label: '恢复依据',
      value: recoveryEvidenceClosed ? 100 : 100 - args.riskRadar.recoveryEvidenceRiskCount,
      target: 100,
      status: args.riskRadar.recoveryEvidenceRiskCount > 0 ? 'warn' : 'ok',
      detail: args.riskRadar.recoveryEvidenceRiskCount > 0
        ? recoveryEvidenceSignal.detail
        : `恢复依据已闭环：${recoveryEvidenceSignal.detail}`,
    } as AutoCreationBatchCompletionMetric] : []),
    ...(strengthenedRepairAcceptanceSignal ? [{
      key: 'strengthened_repair_acceptance',
      label: '强化复盘',
      value: strengthenedRepairAccepted ? 100 : Math.max(0, 100 - args.riskRadar.strengthenedRepairAcceptanceRiskCount * 20),
      target: 100,
      status: args.riskRadar.strengthenedRepairAcceptanceRiskCount > 0 ? 'warn' : 'ok',
      detail: strengthenedRepairAcceptanceSignal.detail,
    } as AutoCreationBatchCompletionMetric] : []),
    ...(args.riskRadar.checklistExecution.visible ? [{
      key: 'checklist',
      label: '开工清单',
      value: checklistScore,
      target: 100,
      status: args.riskRadar.batchChecklistRiskCount > 0 ? 'warn' : 'ok',
      detail: args.riskRadar.checklistExecution.visible
        ? args.riskRadar.checklistExecution.summary
        : '本批没有单独开工清单。',
    } as AutoCreationBatchCompletionMetric] : []),
  ]

  return {
    visible: true,
    status: completionStatus,
    score,
    label: completionStatus === 'ready_next' ? '可开下一批' : completionStatus === 'needs_repair' ? '待修复' : '交稿中',
    summary: completionStatus === 'ready_next'
      ? `本批生成、交稿和复盘已闭环${recoveryEvidenceClosed ? '，恢复依据已闭环' : ''}${strengthenedRepairAccepted ? '，强化深修恢复验收已通过' : ''}，可以按护栏开启下一批。`
      : completionStatus === 'needs_repair'
        ? failed > 0
          ? '批次生成存在失败章节，先处理失败和风险再继续。'
          : '批次已交付但存在质量或计划风险，先修复再开启下一批。'
        : '本批已生成，继续逐章质检、修订和故事状态回填。',
    nextAction: args.nextAction,
    metrics,
  }
}


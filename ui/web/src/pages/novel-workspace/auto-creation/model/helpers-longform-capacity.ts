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
  capacityFuelLabel,
  capacityTargetBand,
  signalStatusFromScore,
} from './helpers-main'
import {
  MODEL_CALL_ACTIONS,
  PLANNING_ACTION_LABELS,
} from './helpers-basics'

export function buildLongformCapacity(planning: PlanningWorkspaceModel): AutoCreationLongformCapacity {
  const targetWords = Math.max(0, Number(planning.topStatus.targetWords || 0))
  const writtenWords = Math.max(0, Number(planning.topStatus.writtenWords || 0))
  const remainingWords = Math.max(0, targetWords - writtenWords)
  const estimatedRemainingChapters = remainingWords > 0 ? Math.ceil(remainingWords / 3000) : 0
  const targetBandLabel = capacityTargetBand(targetWords)
  const future100 = planning.topStatus.future100Coverage
  const future100Planned = Number(future100.planned || 0)
  const storylineTotal = Number(planning.storylineBoard.total || 0)
  const targetStorylineCount = targetWords >= 8000000 ? 8 : targetWords >= 3000000 ? 6 : 4
  const plannedChapterCount = Number(planning.volumeBeatBudget?.plannedChapterCount || 0)
  const targetVolumeRunway = targetWords >= 8000000 ? 50 : targetWords >= 3000000 ? 40 : 25
  const rhythmScore = Number(planning.longformRhythm?.score || 0)
  const beatScore = Number(planning.volumeBeatBudget?.score || 0)

  const futureScore = future100.ready
    ? 92
    : future100Planned >= 60
      ? 76
      : future100Planned >= 30
        ? 62
        : 45
  const storylineScore = storylineTotal <= 0
    ? 45
    : storylineTotal >= targetStorylineCount
      ? 88
      : Math.max(58, Math.round((storylineTotal / targetStorylineCount) * 82))
  const volumeRunwayScore = plannedChapterCount >= targetVolumeRunway
    ? 88
    : plannedChapterCount >= Math.ceil(targetVolumeRunway * 0.35)
      ? Math.max(58, Math.round((plannedChapterCount / targetVolumeRunway) * 82))
      : 48
  const staminaScore = Math.round(((rhythmScore || 70) + (beatScore || 70)) / 2)

  const signals: AutoCreationLongformCapacitySignal[] = [
    {
      key: 'future_reserve',
      label: '未来储备',
      status: future100.ready ? 'ok' : future100Planned >= 10 ? 'warn' : 'block',
      score: futureScore,
      detail: future100.ready ? `未来100章覆盖 ${future100.label}。` : `未来100章只有 ${future100.label}，超长篇只能小步滚动。`,
      actionKey: 'future100_generate',
    },
    {
      key: 'storyline_pool',
      label: '剧情线池',
      status: signalStatusFromScore(storylineScore, 84, 50),
      score: storylineScore,
      detail: `当前 ${storylineTotal} 条剧情线，${targetBandLabel} 建议至少 ${targetStorylineCount} 条可轮转长线。`,
      actionKey: 'open_story_assets',
    },
    {
      key: 'volume_runway',
      label: '当前卷跑道',
      status: signalStatusFromScore(volumeRunwayScore, 84, 55),
      score: volumeRunwayScore,
      detail: `当前卷已规划 ${plannedChapterCount} 章，建议保持 ${targetVolumeRunway} 章以上的卷内冲突跑道。`,
      actionKey: 'complete_volume_plan',
    },
    {
      key: 'production_stamina',
      label: '节奏耐力',
      status: signalStatusFromScore(staminaScore, 80, 58),
      score: staminaScore,
      detail: `长篇节奏 ${rhythmScore || '-'}，爆点预算 ${beatScore || '-'}，用于判断连续生产是否会疲软。`,
      actionKey: 'longform_pressure',
    },
  ]
  const score = Math.round(signals.reduce((sum, item) => sum + item.score, 0) / Math.max(1, signals.length))
  const status: AutoCreationLongformCapacityStatus = signals.some(item => item.status === 'block')
    ? 'blocked'
    : signals.some(item => item.status === 'warn') || score < 80
      ? 'caution'
      : 'ready'
  const firstRisk = signals.find(item => item.status !== 'ok')
  const fuelQueue = signals
    .filter(item => item.status !== 'ok')
    .map(item => ({
      key: item.key,
      label: capacityFuelLabel(item.key),
      status: item.status,
      detail: item.detail,
      actionKey: item.actionKey,
      actionLabel: PLANNING_ACTION_LABELS[item.actionKey] || item.actionKey,
      modelCall: MODEL_CALL_ACTIONS.has(item.actionKey),
    }))

  return {
    status,
    score,
    label: status === 'ready' ? `产能健康 ${score}` : status === 'caution' ? `产能偏薄 ${score}` : `产能阻塞 ${score}`,
    summary: status === 'ready'
      ? `${targetBandLabel} 目标仍有 ${estimatedRemainingChapters} 章左右，当前储备可以进入安全连写。`
      : `${targetBandLabel} 目标仍有 ${estimatedRemainingChapters} 章左右，${firstRisk?.label || '长线储备'}偏薄，建议先补长线资产再扩大批量。`,
    targetBandLabel,
    remainingWords,
    estimatedRemainingChapters,
    recommendedActionKey: firstRisk?.actionKey || 'longform_pressure',
    signals,
    fuelQueue,
  }
}


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
  AutoCreationCanonRunway,
  AutoCreationMillionWordRunway,
  AutoCreationRollingScriptLayer,
  AutoCreationRollingScriptRoom,
  AutoCreationDirectorModel,
  BuildAutoCreationDirectorModelInput
} from './types'
import {
  batchChapterDelivered,
  batchReleaseEvidenceFromPreflight,
  buildResolvedBatchRiskIssueKeys,
  characterArcNeedsAction,
  compactChapterNoEvidence,
  parsePayload,
  recordTime,
  retentionNeedsAction,
  rhythmNeedsAction,
  storylineNeedsAction,
  volumeBeatNeedsAction,
} from './helpers-main'
import {
  buildBatchHandoff,
  chapterHandoffDetail,
  compactList,
  isSafeBatchGenerationSource,
} from './helpers-safe-batch-expansion-structure'
import {
  chapterRangeLabel,
  serialReleaseInventoryIssue,
} from './helpers-next-batch-brief'
import {
  arrayValue,
  deliveryRiskRepairPayload,
  firstText,
  opsAction,
  planningAction,
  text,
  writingAction,
} from './helpers-basics'
import {
  buildBatchCompletionDashboard,
} from './helpers-batch-completion-dashboard'
import {
  buildSafeBatchExpansionFeedback,
} from './helpers-safe-batch-expansion-feedback'
import {
  buildBatchRiskRadar,
} from './helpers-batch-risk-radar'
import {
  batchStatusToSignal,
  contractStatusToSignal,
  runwayGate,
  runwayQuestion,
} from './helpers-batch-guardrail'

export function contractGateStatus(value: string): AutoCreationBatchGuardrailSignalStatus {
  if (value === 'block' || value === 'blocked') return 'block'
  if (value === 'warn' || value === 'warning' || value === 'needs_attention') return 'warn'
  return 'ok'
}

export function chapterLaunchQualityStatus(value: string): AutoCreationBatchGuardrailSignalStatus {
  if (value === 'blocked') return 'block'
  if (value === 'warn') return 'warn'
  return 'ok'
}

export function batchGateStatus(value: string): AutoCreationBatchGuardrailSignalStatus {
  if (value === 'blocked') return 'block'
  if (value === 'caution') return 'warn'
  return 'ok'
}

export function runwayGateStatus(value: string): AutoCreationBatchGuardrailSignalStatus {
  if (value === 'blocked') return 'block'
  return 'ok'
}

export function mergeGateStatus(...values: AutoCreationBatchGuardrailSignalStatus[]): AutoCreationBatchGuardrailSignalStatus {
  if (values.includes('block')) return 'block'
  if (values.includes('warn')) return 'warn'
  return 'ok'
}

export function categoryRiskStatus(
  deliveryRiskGate: AutoCreationDeliveryRiskGate,
  categories: AutoCreationDeliveryRiskGateCategory['key'][],
): AutoCreationBatchGuardrailSignalStatus {
  const matched = deliveryRiskGate.categories.filter(item => categories.includes(item.key))
  if (matched.some(item => item.highCount > 0)) return 'block'
  if (matched.some(item => item.count > 0)) return 'warn'
  return 'ok'
}

export function contractItem(items: AutoCreationContractItem[], key: AutoCreationContractItem['key']) {
  return items.find(item => item.key === key) || null
}

export function contractDetail(item: AutoCreationContractItem | null, fallback: string) {
  return firstText(item?.detail, item?.evidence?.[0], fallback)
}

export function buildTodayQualityGates(args: {
  productionLicense: AutoCreationProductionLicense
  creationContract: AutoCreationContractItem[]
  chapterLaunchGate: AutoCreationChapterLaunchGate
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  storylineDecisionGate: AutoCreationStorylineDecisionGate
  batchGuardrail: AutoCreationBatchGuardrail
  millionWordRunway: AutoCreationMillionWordRunway
}): AutoCreationTodayQualityGate[] {
  const core = contractItem(args.creationContract, 'core')
  const story = contractItem(args.creationContract, 'story')
  const readerPull = contractItem(args.creationContract, 'reader_pull')
  const innovation = contractItem(args.creationContract, 'innovation')
  const readerRisk = categoryRiskStatus(args.deliveryRiskGate, ['reader_retention', 'reader_payoff'])
  const innovationRisk = categoryRiskStatus(args.deliveryRiskGate, ['innovation', 'signature_scene'])
  const serialReleaseIssue = serialReleaseInventoryIssue(args.batchGuardrail)
  const serialRisk = mergeGateStatus(
    args.deliveryRiskGate.status === 'block' ? 'block' : args.deliveryRiskGate.status === 'warn' ? 'warn' : 'ok',
    args.storylineDecisionGate.status,
    serialReleaseIssue?.status || 'ok',
    args.productionLicense.status === 'single_chapter' ? 'ok' : batchGateStatus(args.batchGuardrail.status),
    runwayGateStatus(args.millionWordRunway.status),
  )

  return [
    {
      key: 'core',
      label: '核心不偏',
      status: contractGateStatus(String(core?.status || 'ok')),
      detail: contractDetail(core, '作品核心、读者承诺和长期矛盾清晰可守。'),
    },
    {
      key: 'story_drive',
      label: '故事推进',
      status: mergeGateStatus(contractGateStatus(String(story?.status || 'ok')), chapterLaunchQualityStatus(args.chapterLaunchGate.status)),
      detail: args.chapterLaunchGate.status === 'ready'
        ? contractDetail(story, '本章目标、冲突和章末钩子能推动主线。')
        : args.chapterLaunchGate.summary,
    },
    {
      key: 'reader_pull',
      label: '读者拉力',
      status: mergeGateStatus(contractGateStatus(String(readerPull?.status || 'ok')), readerRisk),
      detail: readerRisk === 'ok'
        ? contractDetail(readerPull, '开篇钩子、追读问题和回报循环可支撑继续阅读。')
        : args.deliveryRiskGate.summary,
    },
    {
      key: 'innovation',
      label: '创新差异',
      status: mergeGateStatus(contractGateStatus(String(innovation?.status || 'ok')), innovationRisk),
      detail: innovationRisk === 'ok'
        ? contractDetail(innovation, '差异化机制、场面或人物选择不会退回普通套路章。')
        : args.deliveryRiskGate.summary,
    },
    {
      key: 'serial_safety',
      label: '连载安全',
      status: serialRisk,
      detail: serialRisk === 'ok'
        ? '交稿风险已清，剧情线、剧情单元、百万字航线和连续生产护栏可控。'
        : firstText(
          args.storylineDecisionGate.status !== 'ok' ? args.storylineDecisionGate.summary : '',
          args.deliveryRiskGate.status !== 'ok' ? args.deliveryRiskGate.summary : '',
          serialReleaseIssue?.detail,
          args.batchGuardrail.summary,
          args.millionWordRunway.summary,
        ),
    },
  ]
}


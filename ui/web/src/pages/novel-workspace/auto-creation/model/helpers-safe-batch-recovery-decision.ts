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


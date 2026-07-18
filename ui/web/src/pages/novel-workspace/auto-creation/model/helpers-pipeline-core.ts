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
  batchPipelineStatus,
  characterArcNeedsAction,
  hasRunningTasks,
  retentionNeedsAction,
  storylineNeedsAction,
} from './helpers-main'
import {
  chapterHandoffDetail,
  contractPipelineStatus,
  deliveryRiskStagedActions,
  rollingLayerStatusToPipeline,
} from './helpers-safe-batch-expansion-structure'
import {
  PLANNING_ACTION_LABELS,
  arrayValue,
  deliveryRiskRepairPayload,
  opsAction,
  planningAction,
  text,
  writingAction,
} from './helpers-basics'

export function buildPipeline(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  activeTasks: AnyRecord[]
  hasBlockingPlan: boolean
  hasModel: boolean
  creationContract: AutoCreationContractItem[]
  longformCapacity: AutoCreationLongformCapacity
  rollingScriptRoom: AutoCreationRollingScriptRoom
  batchGuardrail: AutoCreationBatchGuardrail
}): AutoCreationPipelineStep[] {
  const acceptance = args.writing.chapterAcceptanceDesk
  const planningDesk = args.writing.chapterPlanningDesk
  const chapter = args.writing.nextChapter
  const hasProse = Boolean(chapter?.hasProse)
  const retentionAction = retentionNeedsAction(args.planning)
  const storylineAction = storylineNeedsAction(args.planning)
  const characterArcAction = characterArcNeedsAction(args.planning)
  const running = hasRunningTasks(args.activeTasks)
  const chapterHandoff = (args.writing as any).chapterHandoffDesk || null
  const chapterHandoffVisible = Boolean(chapterHandoff?.visible)
  const qualityDone = Boolean(acceptance.visible && (
    acceptance.acceptanceStatus === 'ready_to_accept'
    || acceptance.acceptanceStatus === 'delivered'
    || acceptance.acceptanceStatus === 'delivered_with_warnings'
  ))
  const canonDone = Boolean(acceptance.visible && acceptance.storyStateSynced)
  const admittedWithWarnings = acceptance.acceptanceStatus === 'delivered_with_warnings'
  const handoffStatus: AutoCreationPipelineStatus = chapterHandoffVisible
    ? admittedWithWarnings && text(chapterHandoff?.status) === 'ready' ? 'done' : 'active'
    : hasProse && (!acceptance.visible || (qualityDone && (canonDone || admittedWithWarnings)))
      ? 'done'
      : 'pending'
  const handoffDetail = chapterHandoffVisible
    ? chapterHandoffDetail(chapterHandoff)
    : hasProse
      ? handoffStatus === 'done'
        ? '章节交接已完成或暂无下一章交接。'
        : '等待质检、修订和故事状态回填完成后生成交接单。'
      : '等待正文交稿后生成交接单。'

  return [
    {
      key: 'longform_planning',
      label: '长线规划',
      status: !args.hasModel ? 'blocked' : args.hasBlockingPlan ? 'blocked' : args.planning.healthIssues.length > 0 ? 'warning' : 'done',
      detail: args.planning.topStatus.longformHealth.label,
    },
    {
      key: 'creation_contract',
      label: '创作契约',
      status: contractPipelineStatus(args.creationContract),
      detail: args.creationContract
        .filter(item => item.status !== 'ok')
        .map(item => `${item.label}：${item.detail}`)
        .slice(0, 2)
        .join('；') || '核心、故事、创新和读者吸引力达标',
    },
    {
      key: 'rolling_script_room',
      label: '百章剧本室',
      status: rollingLayerStatusToPipeline(args.rollingScriptRoom.status),
      detail: `${args.rollingScriptRoom.focusRangeLabel}：${args.rollingScriptRoom.summary}`,
    },
    {
      key: 'longform_capacity',
      label: '百万字产能',
      status: args.longformCapacity.status === 'blocked'
        ? 'blocked'
        : args.longformCapacity.status === 'caution'
          ? 'warning'
          : 'done',
      detail: args.longformCapacity.summary,
    },
    {
      key: 'volume_beat_budget',
      label: '卷级爆点预算',
      status: !args.planning.volumeBeatBudget
        ? 'pending'
        : args.planning.volumeBeatBudget.status === 'blocked'
          ? 'blocked'
          : args.planning.volumeBeatBudget.status === 'needs_attention'
            ? 'warning'
            : 'done',
      detail: args.planning.volumeBeatBudget?.summary || '等待卷级高潮和爽点预算计算',
    },
    {
      key: 'longform_rhythm',
      label: '长篇节奏',
      status: !args.planning.longformRhythm
        ? 'pending'
        : args.planning.longformRhythm.status === 'blocked'
          ? 'blocked'
          : args.planning.longformRhythm.status === 'needs_attention'
            ? 'warning'
            : 'done',
      detail: args.planning.longformRhythm?.summary || '等待长篇节奏总控计算',
    },
    {
      key: 'story_assets',
      label: '设定/剧情线',
      status: storylineAction || characterArcAction ? 'warning' : 'done',
      detail: [
        args.planning.storylineBoard.summary,
        characterArcAction ? args.planning.characterArcBoard.summary : '',
      ].filter(Boolean).join('；'),
    },
    {
      key: 'retention_curve',
      label: '前30章留存',
      status: retentionAction ? 'warning' : 'done',
      detail: args.planning.first30Retention.summary,
    },
    {
      key: 'chapter_planning',
      label: '章节任务书',
      status: planningDesk.readiness === 'blocked'
        ? 'blocked'
        : hasProse || planningDesk.readiness === 'ready'
          ? 'done'
          : 'active',
      detail: planningDesk.statusLabel,
    },
    {
      key: 'chapter_execution',
      label: '正文生产',
      status: hasProse ? 'done' : planningDesk.readiness === 'ready' && !retentionAction && !storylineAction && !characterArcAction && !args.hasBlockingPlan ? 'active' : 'pending',
      detail: hasProse ? `${chapter?.wordCount || 0} 字` : args.writing.topStatus.nextActionLabel,
    },
    {
      key: 'quality_gate',
      label: '质检修订',
      status: acceptance.visible
        ? admittedWithWarnings
          ? 'warning'
          : acceptance.acceptanceStatus === 'ready_to_accept' || acceptance.acceptanceStatus === 'delivered' ? 'done' : 'active'
        : 'pending',
      detail: acceptance.visible ? acceptance.statusLabel : '等待正文',
    },
    {
      key: 'canon_sync',
      label: '状态回填',
      status: acceptance.visible
        ? acceptance.storyStateSynced ? 'done' : admittedWithWarnings ? 'warning' : acceptance.acceptanceStatus === 'needs_state_sync' ? 'active' : 'pending'
        : 'pending',
      detail: acceptance.visible ? (acceptance.storyStateSynced ? '故事状态已同步' : admittedWithWarnings ? '正文已入库，故事状态待补同步' : '等待交稿同步') : '等待正文',
    },
    {
      key: 'chapter_handoff',
      label: '章节交接',
      status: handoffStatus,
      detail: handoffDetail,
    },
    {
      key: 'batch_guardrail',
      label: '连续生产护栏',
      status: batchPipelineStatus(args.batchGuardrail.status),
      detail: `${args.batchGuardrail.label}，安全批次 ${args.batchGuardrail.safeChapterCount} 章`,
    },
    {
      key: 'async_tasks',
      label: '任务队列',
      status: running ? 'active' : 'done',
      detail: running ? `${args.activeTasks.length} 个任务运行中` : '无排队任务',
    },
  ]
}

export function highestPipelineStatus(steps: AutoCreationPipelineStep[]): AutoCreationPipelineStatus {
  if (steps.some(step => step.status === 'blocked')) return 'blocked'
  if (steps.some(step => step.status === 'active')) return 'active'
  if (steps.some(step => step.status === 'warning')) return 'warning'
  if (steps.every(step => step.status === 'done')) return 'done'
  return 'pending'
}

export function compactStatus(
  status: AutoCreationPipelineStatus,
  current: boolean,
  alreadyPassed: boolean,
): AutoCreationPipelineStatus {
  if (current) return status === 'done' ? 'active' : status
  if (alreadyPassed) return status === 'blocked' ? 'blocked' : 'done'
  return status === 'blocked' ? 'blocked' : status === 'warning' ? 'warning' : 'pending'
}

export function planningPipelineStatusToDirector(status: string, active: boolean): AutoCreationPipelineStatus {
  if (status === 'block' || status === 'blocked') return 'blocked'
  if (status === 'warn' || status === 'warning') return 'warning'
  if (status === 'ok' || status === 'ready') return 'done'
  if (active) return 'active'
  return 'pending'
}

export function buildCreationPipeline(args: {
  planning: PlanningWorkspaceModel
  mainAction: AutoCreationDirectorAction
  serialWorkflow?: AutoCreationSerialWorkflow
}): AutoCreationDirectorCreationPipeline {
  const source = (args.planning as any).creationPipeline
  const sourceStages = arrayValue(source?.stages)
  if (sourceStages.length > 0) {
    const stages = sourceStages.map((stage: AnyRecord) => {
      const actionKey = text(stage?.actionKey || stage?.action_key, 'enter_story_planning') as PlanningActionKey
      const detail = text(stage?.detail, '等待规划页补充阶段说明。')
      return {
        key: text(stage?.key, actionKey),
        label: text(stage?.label, actionKey),
        status: planningPipelineStatusToDirector(text(stage?.status), Boolean(stage?.active)),
        active: Boolean(stage?.active),
        score: Math.max(0, Math.min(100, Number(stage?.score || 0))),
        detail,
        action: planningAction(actionKey, detail, PLANNING_ACTION_LABELS[actionKey] || text(stage?.label, actionKey)),
      }
    })
    const primaryKey = text(source?.primaryAction?.key || source?.primary_action?.key, stages.find(stage => stage.active)?.action.key || 'enter_story_planning') as PlanningActionKey
    const primaryReason = text(source?.primaryAction?.reason || source?.primary_action?.reason, source?.summary || '按故事规划页的当前建议推进。')
    return {
      currentStageKey: text(source?.currentStageKey || source?.current_stage_key, stages.find(stage => stage.active)?.key || stages[0]?.key || 'chapter_launch'),
      summary: text(source?.summary, '故事规划页暂未生成流水线摘要。'),
      riskCount: Number(source?.riskCount || source?.risk_count || stages.filter(stage => ['blocked', 'warning'].includes(stage.status)).length),
      primaryAction: planningAction(primaryKey, primaryReason, text(source?.primaryAction?.label || source?.primary_action?.label, PLANNING_ACTION_LABELS[primaryKey] || primaryKey)),
      stages,
    }
  }

  const fallbackStages = arrayValue(args.serialWorkflow?.stages).map((stage: AnyRecord) => ({
    key: text(stage?.key, 'chapter_launch'),
    label: text(stage?.label, '章节开写'),
    status: text(stage?.status, 'pending') as AutoCreationPipelineStatus,
    active: text(stage?.key) === text(args.serialWorkflow?.currentKey),
    score: stage?.status === 'done' ? 88 : stage?.status === 'active' ? 76 : stage?.status === 'blocked' ? 45 : 64,
    detail: text(stage?.detail, '等待流水线阶段判断。'),
    action: stage?.action || args.mainAction,
  }))
  return {
    currentStageKey: text(args.serialWorkflow?.currentKey, fallbackStages.find(stage => stage.active)?.key || 'chapter_launch'),
    summary: text(args.serialWorkflow?.summary, '按当前总控台判断推进下一步。'),
    riskCount: fallbackStages.filter(stage => ['blocked', 'warning'].includes(stage.status)).length,
    primaryAction: args.mainAction,
    stages: fallbackStages,
  }
}

export function buildSerialWorkflow(args: {
  hasModel: boolean
  mainAction: AutoCreationDirectorAction
  status: AutoCreationDirectorStatus
  writing: WritingCockpitModel
  creationContract: AutoCreationContractItem[]
  pipeline: AutoCreationPipelineStep[]
  productionLicense: AutoCreationProductionLicense
  batchGuardrail: AutoCreationBatchGuardrail
  deliveryRiskGate: AutoCreationDeliveryRiskGate
}): AutoCreationSerialWorkflow {
  const byKey = new Map(args.pipeline.map(step => [step.key, step]))
  const acceptance = args.writing.chapterAcceptanceDesk
  const chapter = args.writing.nextChapter
  const hasProse = Boolean(chapter?.hasProse || acceptance?.visible)
  const contractStatus = contractPipelineStatus(args.creationContract)
  const longformStatus = highestPipelineStatus([
    byKey.get('longform_planning'),
    byKey.get('rolling_script_room'),
    byKey.get('longform_capacity'),
    byKey.get('volume_beat_budget'),
    byKey.get('longform_rhythm'),
    byKey.get('story_assets'),
    byKey.get('retention_curve'),
  ].filter(Boolean) as AutoCreationPipelineStep[])
  const chapterStatus = highestPipelineStatus([
    byKey.get('chapter_planning'),
    byKey.get('chapter_execution'),
  ].filter(Boolean) as AutoCreationPipelineStep[])
  const deliveryStatus = highestPipelineStatus([
    byKey.get('quality_gate'),
    byKey.get('canon_sync'),
    byKey.get('chapter_handoff'),
  ].filter(Boolean) as AutoCreationPipelineStep[])
  const governanceStatus = highestPipelineStatus([
    byKey.get('batch_guardrail'),
    byKey.get('async_tasks'),
  ].filter(Boolean) as AutoCreationPipelineStep[])

  let currentKey: AutoCreationSerialStageKey = 'chapter_launch'
  if (!args.hasModel || contractStatus === 'blocked' || contractStatus === 'warning') {
    currentKey = 'book_core'
  } else if (args.mainAction.area === 'planning' || args.status === 'needs_governance' && !acceptance?.visible && args.deliveryRiskGate.status === 'ok') {
    currentKey = 'longform_plan'
  } else if (acceptance?.visible) {
    currentKey = 'delivery_acceptance'
  } else if (args.deliveryRiskGate.status !== 'ok' || args.productionLicense.status === 'batch_allowed' || args.batchGuardrail.status !== 'blocked' && hasProse) {
    currentKey = 'serial_governance'
  }

  const order: AutoCreationSerialStageKey[] = ['book_core', 'longform_plan', 'chapter_launch', 'delivery_acceptance', 'serial_governance']
  const currentIndex = order.indexOf(currentKey)
  const stageStatus = (key: AutoCreationSerialStageKey, raw: AutoCreationPipelineStatus) => compactStatus(raw, key === currentKey, order.indexOf(key) < currentIndex)
  const deliveryAction = acceptance?.visible ? args.writing.chapterAcceptanceDesk?.recommendedAcceptanceAction : null
  const stages: AutoCreationSerialWorkflowStage[] = [
    {
      key: 'book_core',
      label: '立项定核',
      status: stageStatus('book_core', !args.hasModel ? 'blocked' : contractStatus),
      detail: args.hasModel ? '核心承诺、类型卖点、创新差异和读者拉力已纳入创作契约。' : '先选择可用模型，才能启动自动创作流水线。',
      action: planningAction('longform_creation_diagnosis', '检查核心不偏、故事强度、创新差异和读者吸引，必要时刷新创作契约。'),
    },
    {
      key: 'longform_plan',
      label: '长线规划',
      status: stageStatus('longform_plan', longformStatus),
      detail: byKey.get('longform_planning')?.detail || '维护未来章节、剧情线、卷级爆点、留存和百万字产能。',
      action: planningAction('enter_story_planning', '进入故事规划主工作区，集中查看未来100章、剧情线、前30章留存、卷级爆点和读者期待债务。'),
    },
    {
      key: 'chapter_launch',
      label: '单章开写',
      status: stageStatus('chapter_launch', hasProse ? 'done' : chapterStatus),
      detail: hasProse ? '正文已生成，进入交稿闭环。' : args.writing.chapterPlanningDesk.statusLabel,
      action: planningAction('enter_chapter_writing', '进入章节写作区，处理上下文包、场景卡、开写任务书和正文生成。'),
    },
    {
      key: 'delivery_acceptance',
      label: '交稿质检',
      status: stageStatus('delivery_acceptance', acceptance?.visible ? deliveryStatus : 'pending'),
      detail: acceptance?.visible ? acceptance.statusLabel : '等待正文生成后执行质检、修订、状态回填和章节交接。',
      action: writingAction((deliveryAction?.key || 'review_draft') as WritingCockpitActionKey, '进入当前章交稿闭环，执行质检、修订、故事状态同步和验收。', deliveryAction?.label || '进入交稿质检'),
    },
    {
      key: 'serial_governance',
      label: '连载治理',
      status: stageStatus('serial_governance', governanceStatus),
      detail: args.productionLicense.summary || args.batchGuardrail.summary || '清理交稿风险，确认下一批任务书和安全连写许可。',
      action: opsAction('open_task_center', '查看生产运营', '查看后台任务、修复队列和安全连写复盘。'),
    },
  ]
  const currentLabel = stages.find(stage => stage.key === currentKey)?.label || '单章开写'

  return {
    currentKey,
    currentLabel,
    summary: `当前处于「${currentLabel}」，下一步：${args.mainAction.label}。`,
    stages,
  }
}

export function fallbackSecondaryActions(planning: PlanningWorkspaceModel, writing: WritingCockpitModel): AutoCreationDirectorAction[] {
  const actions: AutoCreationDirectorAction[] = [
    planningAction('longform_creation_diagnosis', '按 300万-1000万字长篇目标检查核心不偏、故事强度、创新差异和读者吸引。'),
    planningAction('open_outline_tree', '查看章节、分卷和未来章节是否连续。'),
    planningAction('open_story_assets', '维护设定、剧情线和新资产候选。'),
    opsAction('open_task_center', '查看任务中心', '查看后台任务、失败记录和可恢复任务。'),
  ]
  const acceptance = writing.chapterAcceptanceDesk
  if (acceptance?.visible) {
    actions.unshift(writingAction('open_version_history', '查看当前章版本历史。'))
  }
  return actions.slice(0, 4)
}

export function isPanelRepairAction(action: AutoCreationDirectorAction) {
  const key = text(action.key)
  return key.startsWith('open_')
    || key.startsWith('enter_')
    || key === 'select_model'
    || key === 'complete_volume_plan'
}

export const AUTO_REPAIR_ACTION_PRIORITY = new Map<string, number>([
  ['longform_creation_diagnosis', 10],
  ['run_first30_retention', 20],
  ['create_first30_repair', 30],
  ['run_reader_trial_review', 40],
  ['create_reader_trial_repair', 50],
  ['longform_pressure', 60],
  ['sync_story_state', 70],
  ['create_delivery_risk_repair', 80],
  ['create_safe_batch_risk_repair', 90],
  ['create_style_sample_batch_repair', 100],
  ['create_recovery_evidence_governance_queue', 110],
  ['create_script_room_repair', 120],
  ['open_generation_diagnostics', 200],
  ['open_story_assets', 210],
  ['open_task_center', 220],
])

export function dedupeRepairActions(actions: AutoCreationDirectorAction[]) {
  const seen = new Set<string>()
  const unique: AutoCreationDirectorAction[] = []
  for (const action of actions) {
    const key = text(action.key)
    if (!key || seen.has(key) || action.disabled) continue
    seen.add(key)
    unique.push(action)
  }
  return unique.sort((left, right) => {
    const leftPriority = AUTO_REPAIR_ACTION_PRIORITY.get(text(left.key)) ?? 150
    const rightPriority = AUTO_REPAIR_ACTION_PRIORITY.get(text(right.key)) ?? 150
    return leftPriority - rightPriority
  })
}

export function buildAutoCreationRepairPlan(args: {
  status: AutoCreationDirectorStatus
  mainAction: AutoCreationDirectorAction
  planning: PlanningWorkspaceModel
  manualTestReadiness: AutoCreationManualTestReadiness
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  rollingScriptRoom: AutoCreationRollingScriptRoom
  batchReviewQueue: AutoCreationBatchReviewQueue
  chapterLaunchGate: AutoCreationChapterLaunchGate
}) : AutoCreationRepairPlan {
  const candidates: AutoCreationDirectorAction[] = []

  if (args.manualTestReadiness.status !== 'ready') {
    candidates.push(
      ...args.manualTestReadiness.gates
        .filter(gate => gate.status !== 'ok')
        .map(gate => gate.action),
    )
  }

  if (retentionNeedsAction(args.planning)) {
    candidates.push(planningAction(
      (args.planning.first30Retention.actionKey || 'run_first30_retention') as PlanningActionKey,
      args.planning.first30Retention.summary || '运行或刷新前30章留存诊断。',
    ))
  }

  if (args.deliveryRiskGate.status === 'block' || args.deliveryRiskGate.highOpen > 0) {
    candidates.push(opsAction('create_delivery_risk_repair', '生成风险修复任务', args.deliveryRiskGate.summary, false, deliveryRiskRepairPayload(args.deliveryRiskGate)))
  }

  if (args.rollingScriptRoom.status === 'blocked') {
    candidates.push(args.rollingScriptRoom.repairAction)
  }

  if (args.batchReviewQueue.visible && ['warn', 'risk'].includes(args.batchReviewQueue.status)) {
    candidates.push(args.batchReviewQueue.nextAction)
  }

  if (args.chapterLaunchGate.status === 'blocked') {
    candidates.push(args.chapterLaunchGate.action)
  }

  if (!['ready', 'running'].includes(args.status) && args.mainAction.key !== 'select_model') {
    candidates.push(args.mainAction)
  }

  const actions = dedupeRepairActions(candidates)
  const autoActionCount = actions.filter(action => !isPanelRepairAction(action)).length
  const panelActionCount = actions.length - autoActionCount
  const visible = actions.length > 0 && args.status !== 'ready' && args.status !== 'running'
  const summary = visible
    ? `检测到 ${actions.length}项可处理阻塞：${autoActionCount}项可自动执行${panelActionCount ? `，${panelActionCount}项需打开面板确认` : ''}。`
    : '当前没有需要一键修复的阻塞。'
  const primaryAction = opsAction(
    'auto_repair_blockers',
    '自动修复阻塞',
    summary,
    !visible,
    { actions },
  )
  primaryAction.modelCall = actions.some(action => action.modelCall)
  return {
    visible,
    summary,
    actions,
    autoActionCount,
    panelActionCount,
    primaryAction,
  }
}


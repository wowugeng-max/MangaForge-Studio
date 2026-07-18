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
  deliveryRiskRepairPayload,
  opsAction,
  planningAction,
  text,
  writingAction,
} from './helpers-basics'
import {
  batchPipelineStatus,
  chapterHandoffDetail,
  characterArcNeedsAction,
  contractPipelineStatus,
  deliveryRiskStagedActions,
  hasRunningTasks,
  retentionNeedsAction,
  rollingLayerStatusToPipeline,
  storylineNeedsAction,
} from './helpers-main'

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

export function buildDirectorBattleDesk(planning: PlanningWorkspaceModel): PlanningWorkspaceModel['longformBattleDesk'] {
  if ((planning as any).longformBattleDesk?.lanes?.length) return (planning as any).longformBattleDesk
  const rhythm = planning.longformRhythm || {
    status: 'needs_attention',
    score: 68,
    label: '节奏待治理',
    summary: '长篇节奏材料不足。',
    currentBandLabel: '长篇跑道',
    signals: [],
    nextActions: [],
  }
  const first30Status = planning.first30Retention?.status === 'ready' ? 'ok' : 'warn'
  const storylineStatus = planning.storylineBoard?.status === 'ready' ? 'ok' : planning.storylineBoard?.status === 'missing' ? 'block' : 'warn'
  const volumeStatus = planning.volumeBeatBudget?.status === 'ready' ? 'ok' : planning.volumeBeatBudget?.status === 'blocked' ? 'block' : 'warn'
  const fuelStatus = planning.topStatus?.future10Coverage?.ready && planning.topStatus?.future100Coverage?.ready ? 'ok' : 'warn'
  const lanes: PlanningWorkspaceModel['longformBattleDesk']['lanes'] = [
    {
      key: 'story_core',
      label: '核心守恒',
      status: rhythm.status === 'blocked' ? 'block' : rhythm.status === 'needs_attention' ? 'warn' : 'ok',
      score: Number(rhythm.score || 68),
      detail: rhythm.summary || '长篇核心与节奏待确认。',
      actionKey: rhythm.status === 'ready' ? 'enter_chapter_writing' : 'open_quality_revision',
    },
    {
      key: 'reader_pull',
      label: '读者拉力',
      status: first30Status,
      score: Number(planning.first30Retention?.score || 70),
      detail: planning.first30Retention?.summary || '前30章留存待确认。',
      actionKey: planning.first30Retention?.actionKey || 'run_first30_retention',
    },
    {
      key: 'storyline',
      label: '剧情线调度',
      status: storylineStatus,
      score: storylineStatus === 'ok' ? 86 : storylineStatus === 'block' ? 55 : 70,
      detail: planning.storylineBoard?.summary || '剧情线待补齐。',
      actionKey: storylineStatus === 'ok' ? 'enter_chapter_writing' : 'open_story_assets',
    },
    {
      key: 'volume_beat',
      label: '卷级爆点',
      status: volumeStatus,
      score: Number(planning.volumeBeatBudget?.score || 70),
      detail: planning.volumeBeatBudget?.summary || '卷级爆点预算待确认。',
      actionKey: volumeStatus === 'ok' ? 'enter_chapter_writing' : 'complete_volume_plan',
    },
    {
      key: 'innovation_ip',
      label: '创新/IP场面',
      status: planning.innovationRadar?.status === 'ready' ? 'ok' : 'warn',
      score: Number(planning.innovationRadar?.score || 70),
      detail: planning.innovationRadar?.summary || '创新/IP场面待复盘。',
      actionKey: planning.innovationRadar?.actionKey || 'open_quality_revision',
    },
    {
      key: 'production_fuel',
      label: '生产燃料',
      status: fuelStatus,
      score: fuelStatus === 'ok' ? 86 : 68,
      detail: `未来10章 ${planning.topStatus?.future10Coverage?.label || '-'}，未来100章 ${planning.topStatus?.future100Coverage?.label || '-'}。`,
      actionKey: fuelStatus === 'ok' ? 'enter_chapter_writing' : 'update_rolling_plan',
    },
  ]
  const status: PlanningWorkspaceModel['longformBattleDesk']['status'] = lanes.some(lane => lane.status === 'block')
    ? 'blocked'
    : lanes.some(lane => lane.status === 'warn')
      ? 'needs_action'
      : 'ready'
  const primaryLane = lanes.find(lane => lane.status !== 'ok') || lanes[0]
  const score = Math.round(lanes.reduce((sum, lane) => sum + lane.score, 0) / Math.max(1, lanes.length))
  return {
    status,
    score,
    label: status === 'ready' ? `长篇作战 ${score}` : status === 'blocked' ? `长篇作战阻塞 ${score}` : `长篇作战待治理 ${score}`,
    summary: status === 'ready' ? '长篇作战台可支撑继续写作。' : `先处理 ${primaryLane.label}：${primaryLane.detail}`,
    primaryAction: {
      key: primaryLane.actionKey,
      label: PLANNING_ACTION_LABELS[primaryLane.actionKey],
      reason: primaryLane.detail,
    },
    lanes,
    riskChips: lanes.filter(lane => lane.status !== 'ok').map(lane => lane.label).slice(0, 6),
  }
}

export function mergeCockpitStatus(...statuses: AutoCreationSerialCockpitStatus[]): AutoCreationSerialCockpitStatus {
  if (statuses.includes('block')) return 'block'
  if (statuses.includes('warn')) return 'warn'
  return 'ok'
}

export function signalToCockpitStatus(status: any): AutoCreationSerialCockpitStatus {
  const normalized = text(status)
  if (normalized === 'block' || normalized === 'blocked') return 'block'
  if (['warn', 'warning', 'needs_action', 'needs_attention', 'stale', 'risk', 'caution'].includes(normalized)) return 'warn'
  return 'ok'
}

export function cockpitStatusFromCount(count: number, highCount = 0): AutoCreationSerialCockpitStatus {
  if (highCount > 0) return 'block'
  if (count > 0) return 'warn'
  return 'ok'
}

export function qualityContinuitySceneMapRisk(planningDesk: AnyRecord) {
  const statusLabel = text(planningDesk?.statusLabel)
  const reasons = arrayValue(planningDesk?.reasons).map(item => text(item)).filter(Boolean)
  const reasonText = [statusLabel, ...reasons].join('｜')
  const qualityContinuityMapCount = arrayValue(planningDesk?.qualityContinuitySceneMap || planningDesk?.quality_continuity_scene_map).length
  const needsSceneMap = text(planningDesk?.readiness) === 'needs_scene_plan'
    && qualityContinuityMapCount === 0
    && /质量续航|delivery_risk_carry_over|serial_risk_repairs|recent_fatigue_action/.test(reasonText)
  if (!needsSceneMap) return null
  const carryOver = planningDesk?.episodePlan?.deliveryRiskCarryOver
    || planningDesk?.episode_plan?.delivery_risk_carry_over
    || null
  const staged = deliveryRiskStagedActions(carryOver)
  const count = Math.max(1, staged.opening.length + staged.middle.length + staged.ending.length)
  return {
    count,
    detail: reasons[0] || statusLabel || '质量续航动作还没有落到具体场景卡。',
  }
}

export function buildSerialGuardrails(args: {
  creationContract: AutoCreationContractItem[]
  chapterLaunchGate: AutoCreationChapterLaunchGate
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  longformCompass: AutoCreationLongformCompass
  millionWordRunway: AutoCreationMillionWordRunway
  writing: WritingCockpitModel
  planning: PlanningWorkspaceModel
  batchGuardrail: AutoCreationBatchGuardrail
  productionLicense: AutoCreationProductionLicense
}): AutoCreationSerialGuardrail[] {
  const acceptance = args.writing.chapterAcceptanceDesk
  const contractCore = args.creationContract.find(item => item.key === 'core')
  const contractStory = args.creationContract.find(item => item.key === 'story')
  const contractInnovation = args.creationContract.find(item => item.key === 'innovation')
  const contractReader = args.creationContract.find(item => item.key === 'reader_pull')
  const qualityContinuityRisk = qualityContinuitySceneMapRisk(args.writing.chapterPlanningDesk)
  const delivery = args.deliveryRiskGate
  const deliveryCategory = (key: AutoCreationDeliveryRiskGateCategory['key']) => delivery.categories.find(item => item.key === key)
  const storylineCount = Number(acceptance.storylineSync?.missedCount || 0) + Number(acceptance.storylineSync?.forbiddenCount || 0)
  const expectationDebtCount = Number(acceptance.readerExpectationSync?.missedCount || 0)
    + Number(acceptance.readerExpectationSync?.openingHandoffMissedCount || 0)
  const attractionWeakCount = Number(acceptance.chapterAttraction?.weakCount || 0)
  const innovationMissed = Number(acceptance.innovationSync?.missedCount || 0)
    + Number(acceptance.signatureSceneSync?.missedCount || 0)
    + Number(acceptance.volumeBeatSync?.missedCount || 0)
  const serialRiskCount = storylineCount
    + Number(acceptance.assetIntake?.pendingCount || 0)
    + Number(deliveryCategory('storyline')?.count || 0)
    + Number(deliveryCategory('story_unit')?.count || 0)
  const coreMissing = !text(args.planning.mainline?.readerPromise) || !text(args.planning.mainline?.currentVolumeGoal)

  return [
    {
      key: 'core_stability',
      label: '核心不偏移',
      status: mergeCockpitStatus(
        coreMissing ? 'block' : 'ok',
        signalToCockpitStatus(contractCore?.status),
        signalToCockpitStatus(args.longformCompass.status),
        cockpitStatusFromCount(Number(deliveryCategory('delivery_core')?.count || 0), Number(deliveryCategory('delivery_core')?.highCount || 0)),
        signalToCockpitStatus(args.millionWordRunway.gates.find(gate => gate.key === 'core_compass')?.status),
      ),
      detail: coreMissing
        ? '核心卖点或当前卷目标缺失，不能扩大自动连写。'
        : contractCore?.detail || args.longformCompass.summary || '核心承诺、主角驱动和长期方向保持可追踪。',
      count: Number(deliveryCategory('delivery_core')?.count || 0),
      action: planningAction('open_outline_tree', '查看全书核心契约、主轴护栏和长期方向。'),
    },
    {
      key: 'story_drive',
      label: '故事驱动力',
      status: mergeCockpitStatus(
        signalToCockpitStatus(contractStory?.status),
        signalToCockpitStatus(args.chapterLaunchGate.status),
        signalToCockpitStatus(acceptance.storyDriveSync?.status),
        cockpitStatusFromCount(Number(deliveryCategory('story_drive')?.count || 0), Number(deliveryCategory('story_drive')?.highCount || 0)),
      ),
      detail: acceptance.storyDriveSync?.priorityLabel || args.chapterLaunchGate.summary || contractStory?.detail || '本章目标、阻碍、代价和状态变化保持明确。',
      count: Number(acceptance.storyDriveSync?.missedCount || 0) + Number(deliveryCategory('story_drive')?.count || 0),
      action: args.chapterLaunchGate.action,
    },
    {
      key: 'reader_pull',
      label: '读者追读',
      status: mergeCockpitStatus(
        signalToCockpitStatus(contractReader?.status),
        qualityContinuityRisk ? 'warn' : 'ok',
        signalToCockpitStatus(acceptance.readerExpectationSync?.status),
        signalToCockpitStatus(acceptance.readerRetentionSync?.status),
        signalToCockpitStatus(acceptance.chapterAttraction?.status),
        signalToCockpitStatus(args.planning.first30Retention?.status),
        cockpitStatusFromCount(Number(deliveryCategory('reader_expectation')?.count || 0) + Number(deliveryCategory('reader_retention')?.count || 0)),
      ),
      detail: acceptance.readerExpectationSync?.label
        || qualityContinuityRisk?.detail
        || acceptance.chapterAttraction?.priorityLabel
        || args.planning.first30Retention?.summary
        || '章节承诺、爽点回报和章末翻页理由保持可见。',
      count: expectationDebtCount + attractionWeakCount + Number(qualityContinuityRisk?.count || 0) + Number(deliveryCategory('reader_expectation')?.count || 0) + Number(deliveryCategory('reader_retention')?.count || 0),
      action: acceptance.readerExpectationSync?.status === 'warn'
        ? writingAction('apply_editor_revision', '按读者期待欠账修订当前章。', '按期待修订')
        : planningAction('run_first30_retention', '运行或刷新前30章留存诊断。'),
    },
    {
      key: 'innovation_ip',
      label: '创新/IP场面',
      status: mergeCockpitStatus(
        signalToCockpitStatus(contractInnovation?.status),
        signalToCockpitStatus(acceptance.innovationSync?.status),
        signalToCockpitStatus(acceptance.signatureSceneSync?.status),
        signalToCockpitStatus(acceptance.volumeBeatSync?.status),
        cockpitStatusFromCount(Number(deliveryCategory('innovation')?.count || 0) + Number(deliveryCategory('signature_scene')?.count || 0)),
      ),
      detail: acceptance.signatureSceneSync?.label || acceptance.innovationSync?.label || contractInnovation?.detail || '差异化设定、可传播场面和卷级爆点保持可执行。',
      count: innovationMissed + Number(deliveryCategory('innovation')?.count || 0) + Number(deliveryCategory('signature_scene')?.count || 0),
      action: planningAction('complete_volume_plan', '补齐创新执行、强场面和卷级爆点预算。'),
    },
    {
      key: 'serial_safety',
      label: '连载安全',
      status: mergeCockpitStatus(
        signalToCockpitStatus(acceptance.storylineSync?.status),
        cockpitStatusFromCount(serialRiskCount, Number(acceptance.storylineSync?.forbiddenCount || 0) + Number(args.deliveryRiskGate.highOpen || 0)),
      ),
      detail: args.productionLicense.summary || args.batchGuardrail.summary || '正史同步、剧情线、资产入库和批量连写护栏保持可控。',
      count: serialRiskCount,
      action: args.productionLicense.nextAction,
    },
  ]
}

export function buildChapterChain(writing: WritingCockpitModel): AutoCreationChapterChainStep[] {
  const chapter = writing.nextChapter
  const planningDesk = writing.chapterPlanningDesk
  const acceptance = writing.chapterAcceptanceDesk
  const handoff = writing.chapterHandoffDesk || {
    visible: false,
    status: 'hidden',
    label: '等待章节交接',
    actionKey: 'accept_chapter_and_continue',
    actionLabel: '查看交接',
  }
  const hasChapter = Boolean(chapter)
  const hasProse = Boolean(chapter?.hasProse || Number(chapter?.wordCount || 0) > 0)
  const qualityContinuityRisk = qualityContinuitySceneMapRisk(planningDesk)
  const hasBrief = !qualityContinuityRisk && (planningDesk.readiness === 'ready' || planningDesk.scenePlanStatus === 'ready' || arrayValue(planningDesk.sceneCards).length > 0)
  const qualityDone = acceptance.qualityScore !== null || Boolean(acceptance.latestQualityReviewId)
  const needsRevision = ['needs_revision', 'needs_recheck'].includes(acceptance.acceptanceStatus)
  const synced = acceptance.storyStateSynced
  const delivered = acceptance.acceptanceStatus === 'delivered'
  const actionForMissingChapter = writingAction('open_outline_panel', '先补齐章节大纲，创建可写章节。', '打开大纲面板')
  const handoffAction = writingAction(handoff.actionKey || 'accept_chapter_and_continue', handoff.label || '查看章节交接', handoff.actionLabel || '查看交接')

  return [
    {
      key: 'handoff',
      label: '交接',
      status: !hasChapter ? 'block' : handoff.visible && handoff.status === 'needs_delivery' ? 'warn' : 'done',
      detail: !hasChapter ? '还没有可写章节。' : handoff.visible ? handoff.label : '上一章钩子、期待欠账和故事状态已接入。',
      action: !hasChapter ? actionForMissingChapter : handoffAction,
    },
    {
      key: 'brief',
      label: '任务书',
      status: !hasChapter ? 'pending' : hasBrief ? 'done' : 'current',
      detail: hasBrief ? planningDesk.statusLabel || '章节任务书和场景卡可用。' : planningDesk.reasons[0] || '先补章节开写任务书或场景卡。',
      action: writingAction(planningDesk.recommendedPlannerAction.key || 'build_scene_plan', '补齐章节任务书、场景卡和本章生成约束。', planningDesk.recommendedPlannerAction.label || '补章节计划'),
    },
    {
      key: 'draft',
      label: '初稿',
      status: !hasChapter || !hasBrief ? 'pending' : hasProse ? 'done' : 'current',
      detail: hasProse ? `当前正文约 ${chapter?.wordCount || 0} 字。` : '生成正文前必须确认任务书和场景预算。',
      action: writingAction('confirm_plan_and_write_draft', '确认任务书并生成本章初稿。', '确认并生成'),
    },
    {
      key: 'quality',
      label: '质检',
      status: !hasProse ? 'pending' : needsRevision ? 'warn' : qualityDone ? 'done' : 'current',
      detail: !hasProse ? '初稿生成后进入质检。' : needsRevision ? acceptance.statusLabel : qualityDone ? '质量复检已有结果。' : '运行质量复检和编辑报告。',
      action: writingAction(needsRevision ? 'apply_editor_revision' : 'refresh_current_quality', needsRevision ? '按风险清单生成修订稿。' : '复检当前正文质量。', needsRevision ? '生成修订稿' : '复检当前版本'),
    },
    {
      key: 'state_sync',
      label: '状态同步',
      status: !hasProse || !qualityDone ? 'pending' : synced ? 'done' : 'current',
      detail: synced ? '故事状态已同步到当前章。' : '交稿前需要同步正史、剧情线和新资产候选。',
      action: writingAction('sync_story_state', '同步故事状态、剧情线和资产候选。', '同步故事状态'),
    },
    {
      key: 'delivery',
      label: '交稿',
      status: delivered ? 'done' : acceptance.acceptanceStatus === 'ready_to_accept' ? 'current' : acceptance.visible ? 'warn' : 'pending',
      detail: delivered ? '本章已交稿。' : acceptance.visible ? acceptance.statusLabel : '完成质检、修订和状态同步后验收。',
      action: writingAction('accept_chapter_and_continue', '验收当前章并进入下一章。', '验收并进入下一章'),
    },
  ]
}

export function buildSerialRiskQueue(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  governanceClosureBrief: AutoCreationGovernanceClosureBrief
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  storylineDecisionGate: AutoCreationStorylineDecisionGate
  batchReviewQueue: AutoCreationBatchReviewQueue
}): AutoCreationRiskQueueItem[] {
  const acceptance = args.writing.chapterAcceptanceDesk
  const planningDesk = args.writing.chapterPlanningDesk
  const risks: AutoCreationRiskQueueItem[] = []
  if (args.governanceClosureBrief.status !== 'ok') {
    risks.push({
      key: 'governance_closure',
      label: args.governanceClosureBrief.label,
      count: args.governanceClosureBrief.count,
      status: 'block',
      detail: args.governanceClosureBrief.summary,
      action: args.governanceClosureBrief.action,
    })
  }
  if (
    planningDesk.recommendedPlannerAction?.key === 'open_story_assets'
    && (
      text(planningDesk.statusLabel).includes('资产关系')
      || planningDesk.reasons.some(reason => String(reason || '').includes('关系图风险'))
    )
  ) {
    risks.push({
      key: 'asset_relationships',
      label: text(planningDesk.statusLabel, '资产关系待确认'),
      count: Math.max(1, planningDesk.reasons.length),
      status: 'warn',
      detail: planningDesk.reasons[0] || '写正文前先确认孤立资产、拥有者和关键关系挂钩。',
      action: planningAction('open_story_assets', '打开设定资产页，处理关系图孤立资产、缺拥有者和资产挂钩风险。'),
    })
  }
  const qualityContinuityRisk = qualityContinuitySceneMapRisk(planningDesk)
  if (qualityContinuityRisk) {
    const plannerAction = planningDesk.recommendedPlannerAction || {}
    risks.push({
      key: 'quality_continuity_scene_map',
      label: text(planningDesk.statusLabel, '需补质量续航落点'),
      count: qualityContinuityRisk.count,
      status: 'warn',
      detail: qualityContinuityRisk.detail,
      action: writingAction(
        (plannerAction.key || 'build_scene_plan') as WritingCockpitActionKey,
        '把 delivery_risk_carry_over / 质量续航动作挂到具体场景卡，再进入正文生成。',
        plannerAction.label || '补续航场景',
      ),
    })
  }
  if (args.deliveryRiskGate.totalOpen > 0 || acceptance.deliveryRiskQueue?.totalCount) {
    const count = Number(acceptance.deliveryRiskQueue?.totalCount || args.deliveryRiskGate.totalOpen || 0)
    risks.push({
      key: 'delivery_risks',
      label: acceptance.deliveryRiskQueue?.label || `待修复 ${count}`,
      count,
      status: args.deliveryRiskGate.highOpen > 0 ? 'block' : 'warn',
      detail: acceptance.deliveryRiskQueue?.priorityLabel || args.deliveryRiskGate.summary,
      action: opsAction('create_delivery_risk_repair', '生成风险修复任务', args.deliveryRiskGate.summary || '把交稿风险转成可执行修复任务。', false, deliveryRiskRepairPayload(args.deliveryRiskGate)),
    })
  }
  if (args.storylineDecisionGate.openCount > 0) {
    risks.push({
      key: 'storyline_decisions',
      label: args.storylineDecisionGate.label,
      count: args.storylineDecisionGate.openCount,
      status: 'block',
      detail: args.storylineDecisionGate.summary,
      action: opsAction('open_task_center', '打开任务中心', args.storylineDecisionGate.summary),
    })
  }
  const storylineCount = Number(args.planning.storylineBoard?.overdueCount || 0)
    + Number(args.planning.storylineBoard?.debtCount || 0)
    + Number(acceptance.storylineSync?.missedCount || 0)
    + Number(acceptance.storylineSync?.forbiddenCount || 0)
  if (storylineCount > 0) {
    risks.push({
      key: 'storylines',
      label: `剧情线 ${storylineCount}`,
      count: storylineCount,
      status: Number(acceptance.storylineSync?.forbiddenCount || 0) > 0 ? 'block' : 'warn',
      detail: args.planning.storylineBoard?.summary || acceptance.storylineSync?.label || '剧情线推进和禁揭边界需要确认。',
      action: planningAction('open_story_assets', '打开资料设定页，校准剧情线资产和本章调用关系。'),
    })
  }
  const expectationCount = Number(acceptance.readerExpectationSync?.missedCount || 0)
    + Number(acceptance.readerExpectationSync?.openingHandoffMissedCount || 0)
  if (expectationCount > 0) {
    risks.push({
      key: 'reader_expectation',
      label: `期待欠账 ${expectationCount}`,
      count: expectationCount,
      status: 'warn',
      detail: acceptance.readerExpectationSync?.label || '读者期待承诺没有在正文中充分兑现。',
      action: writingAction('apply_editor_revision', '按读者期待欠账修订当前章。', '按期待修订'),
    })
  }
  if (args.planning.first30Retention?.status === 'stale' || acceptance.first30RetentionRecheck) {
    risks.push({
      key: 'first30_retention',
      label: '留存需复诊',
      count: 1,
      status: 'warn',
      detail: acceptance.first30RetentionRecheck?.reason || args.planning.first30Retention?.summary || '前30章章节更新后需要重新诊断留存。',
      action: planningAction('run_first30_retention', '重新运行前30章留存诊断。'),
    })
  }
  if (acceptance.assetIntake?.pendingCount) {
    risks.push({
      key: 'asset_intake',
      label: acceptance.assetIntake.label,
      count: acceptance.assetIntake.pendingCount,
      status: 'warn',
      detail: '正文中新人物、物品、能力、势力、地点或伏笔需要作者处置后才进入长期资产。',
      action: planningAction('open_story_assets', '进入资料设定页处置新资产候选。'),
    })
  }
  if (args.batchReviewQueue.visible && ['warn', 'risk'].includes(args.batchReviewQueue.status)) {
    const count = Math.max(1, arrayValue(args.batchReviewQueue.riskRadar?.signals).filter(item => item.status === 'warn').length)
    risks.push({
      key: 'batch_risks',
      label: `批次风险 ${count}`,
      count,
      status: args.batchReviewQueue.status === 'risk' ? 'block' : 'warn',
      detail: args.batchReviewQueue.summary,
      action: args.batchReviewQueue.nextAction,
    })
  }
  return risks
}

export function buildSerialCockpit(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  todayCommandDeck: AutoCreationTodayCommandDeck
  creationContract: AutoCreationContractItem[]
  chapterLaunchGate: AutoCreationChapterLaunchGate
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  governanceClosureBrief: AutoCreationGovernanceClosureBrief
  storylineDecisionGate: AutoCreationStorylineDecisionGate
  longformCompass: AutoCreationLongformCompass
  millionWordRunway: AutoCreationMillionWordRunway
  batchGuardrail: AutoCreationBatchGuardrail
  productionLicense: AutoCreationProductionLicense
  batchReviewQueue: AutoCreationBatchReviewQueue
}): AutoCreationSerialCockpit {
  const riskQueue = buildSerialRiskQueue(args)
  const guardrails = buildSerialGuardrails(args)
  const primaryRisk = riskQueue[0]
  return {
    title: '长篇连载驾驶舱',
    summary: primaryRisk
      ? `当前优先处理：${primaryRisk.label}。${primaryRisk.detail}`
      : args.todayCommandDeck.summary,
    command: args.todayCommandDeck,
    guardrails,
    chapterChain: buildChapterChain(args.writing),
    batchLicense: args.productionLicense,
    riskQueue,
  }
}


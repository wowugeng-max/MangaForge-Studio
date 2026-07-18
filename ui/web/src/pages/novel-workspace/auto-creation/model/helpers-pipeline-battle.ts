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


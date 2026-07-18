import type {
  FuturePlanningCoverage,
  PlanningActionKey,
  PlanningBattleDeskLane,
  PlanningCreationPipelineStage,
  PlanningHealthIssue,
  PlanningRhythmSignal,
  PlanningSerialReleaseDesk,
  PlanningWorkspaceModel,
} from './planning-workspace-model'
import {
  aggregateDeliveryRiskCounts,
  arrayValue,
  boundedScore,
  chapterHasProse,
  chapterWordCount,
  latestReviewPayload,
  latestReviewPayloadAny,
  listLength,
  milestoneStatus,
  numericCount,
  parseJsonValue,
  planningActionLabel,
  reviewChapterNo,
  reviewTime,
  text,
} from './planning-workspace-builder'

type AnyRecord = Record<string, any>

import {
  activeProductionTaskSummary,
  laneStatusFromPlanning,
  laneStatusFromRhythm,
  openDeliveryRiskRepairTaskCount,
} from './planning-workspace-builder-desks-shared'

export function buildGovernanceHubModel(args: {
  reviews: AnyRecord[]
  healthIssues: PlanningHealthIssue[]
  first30Retention: PlanningWorkspaceModel['first30Retention']
  readerTrialRoom: PlanningWorkspaceModel['readerTrialRoom']
  storylineBoard: PlanningWorkspaceModel['storylineBoard']
  longformRhythm: PlanningWorkspaceModel['longformRhythm']
  future10Coverage: FuturePlanningCoverage
  future100Coverage: FuturePlanningCoverage
  productionTasks?: AnyRecord | null
}): PlanningWorkspaceModel['governanceHub'] {
  const assetIntake = latestReviewPayloadAny(args.reviews, 'asset_intake', 'asset_intake')
  const deliveryRiskCounts = aggregateDeliveryRiskCounts(args.reviews)
  const qualityRiskCount = deliveryRiskCounts.total
  const qualityRiskLabels = deliveryRiskCounts.labels
  const existingDeliveryRiskTaskCount = openDeliveryRiskRepairTaskCount(args.productionTasks)
  const activeTasks = activeProductionTaskSummary(args.productionTasks)

  const discoveredAssets = Array.isArray(assetIntake?.discovered_assets) ? assetIntake.discovered_assets : []
  const appliedAssetNames = new Set(
    Array.isArray(assetIntake?.applied_asset_names)
      ? assetIntake.applied_asset_names.map((item: any) => text(item)).filter(Boolean)
      : [],
  )
  const pendingAssets = discoveredAssets.filter((item: AnyRecord) => !appliedAssetNames.has(text(item?.name)))
  const longformIssueCount = args.healthIssues.length
    + args.longformRhythm.signals.filter(signal => signal.status !== 'ok').length
    + (args.future10Coverage.ready ? 0 : 1)
    + (args.future100Coverage.ready ? 0 : 1)
  const hasHardPlanningBlock = args.healthIssues.some(issue => issue.key === 'missing_reader_promise' || issue.key === 'missing_volume_goal')

  const checkpoints: PlanningWorkspaceModel['governanceHub']['checkpoints'] = [
    {
      key: 'delivery_risk',
      label: '交稿风险',
      status: existingDeliveryRiskTaskCount > 0 || qualityRiskCount > 0 ? 'warn' : 'ok',
      count: Math.max(qualityRiskCount, existingDeliveryRiskTaskCount),
      detail: existingDeliveryRiskTaskCount > 0
        ? `已有 ${existingDeliveryRiskTaskCount} 个交稿风险修复任务待处理，先进入任务中心逐项修订和复检。`
        : qualityRiskCount > 0
        ? `还有 ${qualityRiskCount} 项${qualityRiskLabels.join('、') || '交稿'}风险待修。`
        : '最近交稿风险可控。',
      actionKey: existingDeliveryRiskTaskCount > 0 ? 'open_task_center' : qualityRiskCount > 0 ? 'create_delivery_risk_repair' : 'enter_chapter_writing',
    },
    {
      key: 'first30_retention',
      label: '前30章留存',
      status: args.first30Retention.status === 'ready' ? 'ok' : args.first30Retention.status === 'blocked' ? 'block' : 'warn',
      count: args.first30Retention.risks.length || (args.first30Retention.status === 'ready' ? 0 : 1),
      detail: args.first30Retention.summary,
      actionKey: args.first30Retention.actionKey,
    },
    {
      key: 'reader_trial',
      label: '读者试读',
      status: args.readerTrialRoom.status === 'ready' ? 'ok' : args.readerTrialRoom.status === 'blocked' ? 'block' : 'warn',
      count: args.readerTrialRoom.dropPoints.length || (args.readerTrialRoom.status === 'ready' ? 0 : 1),
      detail: args.readerTrialRoom.summary,
      actionKey: args.readerTrialRoom.actionKey,
    },
    {
      key: 'storyline',
      label: '剧情线',
      status: args.storylineBoard.status === 'ready' ? 'ok' : args.storylineBoard.status === 'missing' ? 'block' : 'warn',
      count: args.storylineBoard.overdueCount + args.storylineBoard.debtCount + args.storylineBoard.retentionRiskCount + deliveryRiskCounts.storylineRiskCount,
      detail: args.storylineBoard.summary,
      actionKey: args.storylineBoard.status === 'ready' ? 'enter_chapter_writing' : 'open_story_assets',
    },
    {
      key: 'asset_intake',
      label: '新资产',
      status: pendingAssets.length > 0 ? 'warn' : 'ok',
      count: pendingAssets.length,
      detail: pendingAssets.length > 0 ? `${pendingAssets.length} 个新资产待确认，避免正文临时资产游离在设定池之外。` : '没有待确认的新人物、物品、能力、势力、地点或伏笔。',
      actionKey: pendingAssets.length > 0 ? 'open_story_assets' : 'enter_chapter_writing',
    },
    {
      key: 'longform_material',
      label: '长线材料',
      status: hasHardPlanningBlock ? 'block' : longformIssueCount > 0 ? 'warn' : 'ok',
      count: longformIssueCount,
      detail: args.longformRhythm.summary,
      actionKey: longformIssueCount > 0 ? 'update_rolling_plan' : 'enter_chapter_writing',
    },
  ]

  const firstRisk = checkpoints.find(item => item.status !== 'ok')
  const primaryCheckpoint = checkpoints.find(item => item.key === 'delivery_risk' && item.status !== 'ok')
    || checkpoints.find(item => item.key === 'first30_retention' && item.status === 'block')
    || firstRisk
  const status: PlanningWorkspaceModel['governanceHub']['status'] = checkpoints.some(item => item.status === 'block')
    ? 'blocked'
    : checkpoints.some(item => item.status === 'warn')
      ? 'needs_action'
      : 'ready'
  const labels: Record<PlanningActionKey, string> = {
    update_rolling_plan: '更新滚动规划',
    complete_volume_plan: '补齐当前卷规划',
    enter_story_planning: '进入故事规划',
    enter_chapter_writing: '进入当前章写作',
    open_outline_tree: '查看完整大纲',
    future100_audit: '检查未来100章',
    future100_generate: '生成未来100章',
    longform_pressure: '运行长线压力测试',
    longform_creation_diagnosis: '运行创作诊断',
    topic_validation: '验证原创选题',
    reference_diagnosis: '诊断参考知识',
    open_story_assets: '打开资料设定',
    update_story_state: '校正故事状态',
    open_quality_revision: '进入质检修订',
    run_first30_retention: '运行前30章诊断',
    create_first30_repair: '生成留存修复任务',
    run_reader_trial_review: '运行读者试读复盘',
    create_reader_trial_repair: '生成试读修复任务',
    create_delivery_risk_repair: '生成风险修复任务',
    record_storyline_diff_decision: '记录剧情线决策',
    create_storyline_decision_tasks: '生成剧情线决策任务',
    open_task_center: '打开任务中心',
  }
  const activeTaskReason = activeTasks.active > 0
    ? `还有 ${activeTasks.active} 个后台任务正在运行或待处理（${activeTasks.detail}）。先进入任务中心查看进度、恢复失败任务或等待当前任务结束。`
    : ''
  const primaryKey = activeTasks.active > 0 ? 'open_task_center' : primaryCheckpoint?.actionKey || 'enter_chapter_writing'

  return {
    status,
    summary: activeTasks.active > 0
      ? `${activeTasks.active} 个后台任务正在运行或待处理，先回任务中心保持流水线状态清晰。`
      : status === 'ready'
        ? '核心、留存、剧情线、资产和长线材料都处于可继续创作状态。'
        : `${checkpoints.filter(item => item.status !== 'ok').length} 类连载治理项需要处理：${checkpoints.filter(item => item.status !== 'ok').map(item => item.label).join('、')}。`,
    primaryAction: {
      key: primaryKey,
      label: labels[primaryKey],
      reason: activeTaskReason || primaryCheckpoint?.detail || (existingDeliveryRiskTaskCount > 0 ? `已有 ${existingDeliveryRiskTaskCount} 个交稿风险修复任务待处理。` : '当前可以进入章节写作。'),
    },
    checkpoints,
  }
}


export {
  openDeliveryRiskRepairTaskCount,
  activeProductionTaskSummary,
  laneStatusFromRhythm,
  laneStatusFromPlanning,
} from './planning-workspace-builder-desks-shared'
export {
  buildSerialReleaseDeskModel,
} from './planning-workspace-builder-desks-serial'
export {
  buildLongformRhythmModel,
  buildLongformBattleDeskModel,
  buildCreationPipelineModel,
} from './planning-workspace-builder-desks-longform'

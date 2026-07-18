import type { PlanningActionKey, PlanningWorkspaceModel } from '../../planningWorkspaceModel'
import type { WritingCockpitActionKey, WritingCockpitModel } from '../../writingCockpitModel'
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
  planningAction,
  text,
  writingAction,
} from './helpers-basics'
import {
  DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS,
  batchRiskIssueResolved,
  batchRiskLabels,
  buildResolvedBatchRiskIssueKeys,
  clampScore,
  compactChapterNoEvidence,
  coreRiskCount,
  emptyStrengthenedRepairAcceptanceTrend,
  expectationRiskCount,
  findChapter,
  finiteNumberOrNull,
  hasDeliveredProse,
  isCompletedRepairRun,
  isResolvedTaskStatus,
  latestReviewForChapter,
  numberValue,
  parsePayload,
  payoffDebtCount,
  recordTime,
  recoveryEvidenceEventTime,
  recoveryEvidenceGovernanceQueueExecutionMeta,
  recoveryEvidenceReleaseSummaryFromPreflight,
  recoveryEvidenceReview,
  retentionRiskCount,
  signal,
} from './helpers-main'

import {
  latestLongformCreationReport
} from './helpers-batch-handoff-core'

export function releaseChapterLabel(chapter: AutoCreationBatchReleaseChapter) {
  return `第${chapter.chapterNo}章《${chapter.title}》`
}

export function buildBatchReleaseWindow(
  nextBatchBrief: AutoCreationNextBatchBrief,
  queueRelease: {
    allowedChapters: AutoCreationBatchReleaseChapter[]
    blockedChapters: AutoCreationBatchReleaseChapter[]
  },
): AutoCreationBatchReleaseWindow {
  const allowedChapters = queueRelease.allowedChapters.length
    ? queueRelease.allowedChapters
    : nextBatchBrief.chapters.map(chapter => ({
      chapterNo: chapter.chapterNo,
      title: chapter.title,
      status: 'allowed' as const,
      reason: '护栏放行',
    }))
  const blockedChapters = queueRelease.blockedChapters
  const allowedLabel = allowedChapters.length
    ? `本批放行 ${allowedChapters.map(releaseChapterLabel).join('、')}`
    : '本批没有放行章节'
  const blockedLabel = blockedChapters.length
    ? `；${blockedChapters.map(chapter => `${releaseChapterLabel(chapter)}因${chapter.reason}被拦截`).join('、')}`
    : ''
  return {
    summary: `${allowedLabel}${blockedLabel}。`,
    allowedChapters,
    blockedChapters,
  }
}

export function contractPipelineStatus(contract: AutoCreationContractItem[]): AutoCreationPipelineStatus {
  if (contract.some(item => item.status === 'block')) return 'blocked'
  if (contract.some(item => item.status === 'warn')) return 'warning'
  return 'done'
}

export function contractActionKey(key: AutoCreationContractItem['key'], status: AutoCreationContractStatus, fallback?: any): AutoCreationDirectorActionKey {
  if (fallback) return fallback as AutoCreationDirectorActionKey
  if (key === 'core') return 'open_story_assets'
  if (key === 'story') return status === 'ok' ? 'enter_chapter_writing' : 'update_rolling_plan'
  if (key === 'innovation') return status === 'ok' ? 'open_story_assets' : 'topic_validation'
  return status === 'ok' ? 'enter_chapter_writing' : 'run_first30_retention'
}

export function normalizeContractStatus(value: any): AutoCreationContractStatus {
  const status = text(value).toLowerCase()
  if (status === 'block' || status === 'blocked' || status === 'fail') return 'block'
  if (status === 'warn' || status === 'warning' || status === 'needs_repair') return 'warn'
  return 'ok'
}

export function creationContractFromReview(reviews: AnyRecord[]): { score: number | null; contract: AutoCreationContractItem[] | null } {
  const report = latestLongformCreationReport(reviews)
  const dimensions = arrayValue(report?.dimensions)
  if (!dimensions.length) return { score: null, contract: null }
  const scoreValue = Number(report?.score)
  return {
    score: Number.isFinite(scoreValue) ? scoreValue : null,
    contract: dimensions
      .filter(item => ['core', 'story', 'innovation', 'reader_pull'].includes(text(item?.key)))
      .map(item => {
        const key = text(item?.key) as AutoCreationContractItem['key']
        const status = normalizeContractStatus(item?.status)
        return {
          key,
          label: text(item?.label, key === 'core' ? '核心不偏' : key === 'story' ? '故事强度' : key === 'innovation' ? '创新差异' : '读者吸引'),
          status,
          detail: text(item?.detail || arrayValue(item?.blockers)[0] || arrayValue(item?.warnings)[0], '后端诊断未给出说明。'),
          evidence: arrayValue(item?.evidence).map(entry => text(entry)).filter(Boolean),
          actionKey: contractActionKey(key, status, item?.actionKey || item?.action_key),
        }
      }),
  }
}

export function buildLongformCreationContract(planning: PlanningWorkspaceModel, writing: WritingCockpitModel): AutoCreationContractItem[] {
  const mainline = planning.mainline
  const future10Ready = planning.topStatus.future10Coverage.ready
  const retention = planning.first30Retention
  const readerScore = Number(retention.score || 0)
  const sceneCardCount = Number(writing.chapterPlanningDesk.sceneCards?.length || 0)
  const coreBlockers = [
    !text(mainline.readerPromise) ? '缺读者承诺' : '',
    !text(mainline.currentVolumeGoal) ? '缺当前卷目标' : '',
    mainline.currentChapterServesVolume === false ? '当前章未服务卷目标' : '',
  ].filter(Boolean)
  const storyWarnings = [
    !future10Ready ? `未来10章规划 ${planning.topStatus.future10Coverage.label}` : '',
    planning.storylineBoard.status !== 'ready' ? '剧情线未校准' : '',
    !text(mainline.currentStageConflict) ? '缺当前阶段冲突' : '',
  ].filter(Boolean)
  const innovationWarnings = [
    !text(mainline.payoffModel) ? '缺爽点模型' : '',
    !text(mainline.readerPromise) ? '缺差异化承诺' : '',
    !text(mainline.currentStageConflict) ? '缺反差冲突' : '',
  ].filter(Boolean)
  const readerBlockers = [
    retention.status === 'blocked' || readerScore > 0 && readerScore < 65 ? '前30章留存高危' : '',
    retention.promiseReady === false ? '读者承诺未被诊断确认' : '',
  ].filter(Boolean)
  const readerWarnings = [
    retention.status === 'missing' ? '未运行前30章诊断' : '',
    retention.status === 'stale' ? '前30章需重新诊断' : '',
    retention.status === 'needs_repair' ? '前30章需要修复' : '',
    readerScore >= 65 && readerScore < 80 ? '前30章吸引力偏弱' : '',
  ].filter(Boolean)

  return [
    {
      key: 'core',
      label: '核心不偏',
      status: coreBlockers.length > 0 ? 'block' : mainline.risks.length > 0 ? 'warn' : 'ok',
      detail: coreBlockers[0] || mainline.risks[0] || '读者承诺、卷目标和当前章服务关系明确。',
      evidence: [mainline.readerPromise, mainline.currentVolumeGoal, mainline.nextTurn].map(item => text(item)).filter(Boolean).slice(0, 3),
      actionKey: coreBlockers.length > 0 ? 'open_story_assets' : 'open_outline_tree',
    },
    {
      key: 'story',
      label: '故事强度',
      status: storyWarnings.length > 0 ? 'warn' : 'ok',
      detail: storyWarnings[0] || '未来章节、剧情线和阶段冲突能支撑连续推进。',
      evidence: [
        `未来10章 ${planning.topStatus.future10Coverage.label}`,
        `剧情线 ${planning.storylineBoard.total}`,
        sceneCardCount > 0 ? `本章场景卡 ${sceneCardCount}` : '',
      ].filter(Boolean),
      actionKey: storyWarnings.length > 0 ? 'update_rolling_plan' : 'enter_chapter_writing',
    },
    {
      key: 'innovation',
      label: '创新差异',
      status: innovationWarnings.length > 0 ? 'warn' : 'ok',
      detail: innovationWarnings[0] || '题材承诺、爽点模型和冲突反差具备可传播差异。',
      evidence: [mainline.readerPromise, mainline.payoffModel, mainline.currentStageConflict].map(item => text(item)).filter(Boolean).slice(0, 3),
      actionKey: innovationWarnings.length > 0 ? 'topic_validation' : 'open_story_assets',
    },
    {
      key: 'reader_pull',
      label: '读者吸引',
      status: readerBlockers.length > 0 ? 'block' : readerWarnings.length > 0 ? 'warn' : 'ok',
      detail: readerBlockers[0] || readerWarnings[0] || '前30章读者承诺、钩子和爽点密度处于可生产状态。',
      evidence: [
        retention.score !== null ? `前30章 ${retention.score}分` : '',
        retention.promiseReady ? '承诺清晰' : '',
        retention.summary,
      ].map(item => text(item)).filter(Boolean).slice(0, 3),
      actionKey: readerBlockers.length > 0 || readerWarnings.length > 0 ? retention.actionKey : 'enter_chapter_writing',
    },
  ]
}

export function buildSerialReleaseInventoryGuardrail(planning: PlanningWorkspaceModel): AutoCreationBatchGuardrailSignal & { action: AutoCreationDirectorAction; hasDesk: boolean } {
  const desk = (planning as any).serialReleaseDesk || null
  if (!desk) {
    return {
      label: '连载库存',
      status: 'ok',
      detail: '故事规划页暂未返回连载发布台，按现有连写护栏继续判断。',
      action: planningAction('enter_chapter_writing', '进入章节写作区补齐当前章，继续积累可发布存稿。'),
      hasDesk: false,
    }
  }
  const rawStatus = text(desk.status)
  const status: AutoCreationBatchGuardrailSignalStatus = rawStatus === 'blocked'
    ? 'block'
    : rawStatus === 'needs_buffer' || rawStatus === 'needs_planning'
      ? 'warn'
      : 'ok'
  const fallbackActionKey: PlanningActionKey = status === 'block' ? 'open_quality_revision' : rawStatus === 'needs_planning' ? 'update_rolling_plan' : 'enter_chapter_writing'
  const primaryAction = desk.primaryAction || desk.primary_action || {}
  const actionKey = normalizePlanningActionKey(primaryAction.key, fallbackActionKey)
  const detail = firstText(
    desk.summary,
    primaryAction.reason,
    arrayValue(desk.nextActions)[0],
    status === 'ok'
      ? '连载库存和发布窗口可支撑继续生产。'
      : status === 'block'
        ? '发布窗口存在待修订章节，先处理发布风险再连写。'
        : '连载库存或后续计划不足，本轮只适合单章小步推进。',
  )
  return {
    label: '连载库存',
    status,
    detail,
    action: planningAction(actionKey, firstText(primaryAction.reason, detail), text(primaryAction.label, PLANNING_ACTION_LABELS[actionKey] || actionKey)),
    hasDesk: true,
  }
}

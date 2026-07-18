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
  targetChapter,
} from './helpers-main'
import {
  currentChapterDirectorAction,
} from './helpers-safe-batch-recovery'
import {
  buildNextBatchBrief,
  chapterRangeLabel,
} from './helpers-next-batch-brief'
import {
  arrayValue,
  opsAction,
  planningAction,
} from './helpers-basics'

export function buildRollingScriptRoom(
  planning: PlanningWorkspaceModel,
  writing: WritingCockpitModel,
  longformCompass: AutoCreationLongformCompass,
): AutoCreationRollingScriptRoom {
  const chapter = targetChapter(writing)
  const nextBatchBrief = buildNextBatchBrief({ planning, writing, safeChapterCount: 10 })
  const nextChapters = nextBatchBrief.chapters
  const currentAction = currentChapterDirectorAction(writing)
  const chapterReady = Boolean(chapter) && (
    Boolean(chapter?.hasProse)
    || writing.chapterPlanningDesk?.readiness === 'ready'
    || writing.chapterPlanningDesk?.scenePlanStatus === 'ready'
    || arrayValue((writing.chapterPlanningDesk as any)?.sceneCards).length > 0
  )
  const future10 = planning.topStatus.future10Coverage
  const future100 = planning.topStatus.future100Coverage
  const volumeBeat = planning.volumeBeatBudget
  const layers: AutoCreationRollingScriptLayer[] = [
    {
      key: 'current_chapter',
      label: '当前章',
      status: !chapter ? 'blocked' : chapterReady ? 'ready' : 'needs_attention',
      detail: chapter
        ? `第${chapter.chapterNo}章《${chapter.title || '未命名'}》：${chapter.hasProse ? '已有正文，进入交稿闭环。' : writing.chapterPlanningDesk?.statusLabel || '等待章节任务书。'}`
        : '还没有可写章节。',
      evidence: [
        chapter?.chapterGoal ? `目标：${chapter.chapterGoal}` : '',
        chapter?.conflict ? `冲突：${chapter.conflict}` : '',
        chapter?.endingHook ? `钩子：${chapter.endingHook}` : '',
      ].filter(Boolean),
      action: currentAction,
    },
    {
      key: 'next_10',
      label: '未来10章',
      status: future10.ready ? 'ready' : Number(future10.planned || 0) >= 5 ? 'needs_attention' : 'blocked',
      detail: `未来10章 ${future10.label}，${future10.ready ? '短周期排期可支撑当前章。' : '需要补齐短周期章节职责、冲突和钩子。'}`,
      evidence: nextChapters.slice(0, 3).map(item => `第${item.chapterNo}章：${item.chapterTask || item.conflict || item.title}`),
      action: planningAction('update_rolling_plan', '补齐未来10章滚动规划，明确每章职责、冲突、回报和章末钩子。'),
    },
    {
      key: 'future_100',
      label: '未来100章',
      status: future100.ready ? 'ready' : Number(future100.planned || 0) >= 30 ? 'needs_attention' : 'blocked',
      detail: `未来100章 ${future100.label}，${future100.ready ? '中长期骨架足够约束批量生产。' : '中长期骨架不足，安全连写容易跑偏。'}`,
      evidence: future100.missingChapters.slice(0, 3).map(no => `缺第${no}章`),
      action: planningAction(future100.ready ? 'future100_audit' : 'future100_generate', future100.ready ? '检查未来100章骨架是否仍匹配当前剧情。' : '生成或补齐未来100章骨架。'),
    },
    {
      key: 'current_volume',
      label: '当前卷',
      status: volumeBeat.status === 'ready' ? 'ready' : volumeBeat.status === 'blocked' ? 'blocked' : 'needs_attention',
      detail: `${volumeBeat.label || `爆点预算 ${volumeBeat.score}`}，${volumeBeat.summary || '等待当前卷高潮与爽点预算。'}`,
      evidence: [
        volumeBeat.currentVolumeTitle,
        volumeBeat.chapterRange,
        `爆点 ${volumeBeat.climaxCount}/${volumeBeat.climaxTarget}`,
        `回报 ${volumeBeat.payoffCount}/${volumeBeat.payoffTarget}`,
      ].filter(Boolean),
      action: planningAction('complete_volume_plan', volumeBeat.nextActions[0] || '补齐当前卷目标、小高潮、中高潮、卷末爆点和读者回报。'),
    },
    {
      key: 'book_compass',
      label: '全书罗盘',
      status: longformCompass.status === 'ready' ? 'ready' : 'needs_attention',
      detail: longformCompass.readerPromise ? `全书罗盘：${longformCompass.readerPromise}` : longformCompass.summary,
      evidence: longformCompass.immutableRules.slice(0, 3),
      action: planningAction(longformCompass.status === 'ready' ? 'longform_creation_diagnosis' : 'open_story_assets', longformCompass.status === 'ready' ? '重新运行创作诊断，确认核心、故事强度、创新和读者吸引仍然达标。' : '补齐读者承诺、核心矛盾和长期爽点循环。'),
    },
  ]
  const status: AutoCreationRollingScriptRoomStatus = layers.some(layer => layer.status === 'blocked')
    ? 'blocked'
    : layers.some(layer => layer.status === 'needs_attention')
      ? 'needs_attention'
      : 'ready'
  const firstActionLayer = layers.find(layer => layer.status !== 'ready')
  const repairTasks = layers
    .filter(layer => layer.key !== 'current_chapter' && layer.status !== 'ready')
    .map(layer => ({
      task_type: 'repair_script_room',
      issue_type: 'script_room_layer_gap',
      severity: layer.status === 'blocked' ? 'high' : 'medium',
      title: `${layer.label}剧本室修复`,
      message: layer.detail,
      action: layer.action.description || `修复${layer.label}规划缺口。`,
      acceptance_criteria: [
        '剧本室对应层级恢复绿色或人工确认可继续生产',
        '修复后重新查看自动创作总控台，确认当前章、未来10章、未来100章、当前卷和全书罗盘不再互相冲突',
      ],
      task_status: 'open',
      source: 'rolling_script_room',
      layer_key: layer.key,
      layer_label: layer.label,
      action_area: layer.action.area,
      action_key: layer.action.key,
      evidence: layer.evidence,
      payload: {
        layer,
        focus_range: nextBatchBrief.chapterRangeLabel,
        next_chapters: nextChapters.slice(0, 6),
      },
    }))
  const repairAction = opsAction(
    'create_script_room_repair',
    '生成剧本室修复任务',
    repairTasks.length
      ? `把 ${repairTasks.length} 个百章剧本室黄/红层级写入任务中心。`
      : '当前百章剧本室没有需要任务化的缺口。',
    repairTasks.length === 0,
  )
  return {
    status,
    label: status === 'ready' ? '百章剧本就绪' : status === 'blocked' ? '百章剧本阻塞' : '百章剧本待校准',
    summary: status === 'ready'
      ? '当前章、未来10章、未来100章、当前卷和全书罗盘已对齐，可进入本章生产或小批量安全连写。'
      : '先校准红/黄层级，再进入正文生成；避免单章看似顺畅但几十章后主线、爆点或读者承诺松动。',
    focusRangeLabel: nextBatchBrief.chapterRangeLabel || (chapter ? `第${chapter.chapterNo}章` : '未确定'),
    layers,
    nextChapters,
    nextAction: firstActionLayer?.action || currentAction,
    repairTasks,
    repairAction,
  }
}


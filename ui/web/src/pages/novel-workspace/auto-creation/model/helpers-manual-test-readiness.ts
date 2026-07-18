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
  latestLongformCreationReport,
  latestReaderTrialReview,
  latestReviewReport,
  latestWrittenChapterNo,
  manualTestGate,
  readerTrialReport,
  reportIsBlocked,
  reportNeedsRepair,
  reportScore,
  stressGateStatus,
} from './helpers-main'
import {
  buildLongformMemoryAnchor,
} from './helpers-next-batch-brief'
import {
  arrayValue,
  planningAction,
  text,
  writingAction,
} from './helpers-basics'

export function buildManualTestReadiness(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  reviews: AnyRecord[]
  chapters: AnyRecord[]
  storyState?: AnyRecord | null
}): AutoCreationManualTestReadiness {
  const targetWords = Number(args.planning.topStatus.targetWords || 0)
  const targetBand = targetWords >= 8000000 ? '1000万字级' : targetWords >= 3000000 ? '300万字级' : '长篇'
  const commercialReport = latestLongformCreationReport(args.reviews)
  const readerTrial = readerTrialReport(latestReaderTrialReview(args.reviews))
  const pressureReport = latestReviewReport(args.reviews, 'longform_pressure_test')
  const storyState = args.storyState || {}
  const stateGlobal = storyState.global || storyState
  const latestChapterNo = Math.max(
    Number(args.writing.previousChapter?.chapterNo || 0),
    latestWrittenChapterNo(args.chapters),
  )
  const stateChapter = Number(storyState.last_updated_chapter || stateGlobal.last_updated_chapter || 0)
  const stateFresh = latestChapterNo <= 0 || stateChapter >= Math.max(0, latestChapterNo - 1)
  const memoryAnchor = buildLongformMemoryAnchor(storyState)
  const pressureScore = reportScore(pressureReport)
  const pressureStressGates = arrayValue(pressureReport?.stress_gates || pressureReport?.stressGates)
  const pressureHasNewStressGates = ['chapter_30', 'chapter_100', 'chapter_300', 'memory_canon']
    .every(key => pressureStressGates.some(item => text(item?.key) === key))
  const pressureMemoryStatus = stressGateStatus(pressureReport, 'memory_canon')

  const commercialScore = reportScore(commercialReport)
  const commercialGateStatus: AutoCreationBatchGuardrailSignalStatus = !commercialReport
    ? 'block'
    : reportIsBlocked(commercialReport) || commercialScore !== null && commercialScore < 75
      ? 'block'
      : reportNeedsRepair(commercialReport) || commercialScore !== null && commercialScore < 82
        ? 'warn'
        : 'ok'
  const readerScore = reportScore(readerTrial)
  const readerDropPoints = arrayValue(readerTrial?.drop_points || readerTrial?.dropPoints).map(item => text(item)).filter(Boolean)
  const readerGateStatus: AutoCreationBatchGuardrailSignalStatus = !readerTrial
    ? 'block'
    : reportIsBlocked(readerTrial) || readerScore !== null && readerScore < 65
      ? 'block'
      : reportNeedsRepair(readerTrial) || readerScore !== null && readerScore < 80 || readerDropPoints.length > 0
        ? 'warn'
        : 'ok'
  const longrunGateStatus: AutoCreationBatchGuardrailSignalStatus = !pressureReport
    ? 'block'
    : reportIsBlocked(pressureReport) || pressureScore !== null && pressureScore < 62
      ? 'block'
      : reportNeedsRepair(pressureReport)
        || pressureScore !== null && pressureScore < (targetWords >= 8000000 ? 86 : 80)
        || !pressureHasNewStressGates
        || ['chapter_100', 'chapter_300'].some(key => stressGateStatus(pressureReport, key) !== null && stressGateStatus(pressureReport, key) !== 'ok')
        ? 'warn'
        : 'ok'
  const memoryGateStatus: AutoCreationBatchGuardrailSignalStatus = !stateFresh
    ? 'block'
    : pressureMemoryStatus === 'block'
      ? 'block'
      : !memoryAnchor || pressureMemoryStatus === 'warn'
        ? 'warn'
        : 'ok'

  const gates: AutoCreationManualTestGate[] = [
    manualTestGate(
      'commercial_benchmark',
      '万订商业校准',
      commercialGateStatus,
      commercialReport
        ? `${text(commercialReport.quality_bar_label || commercialReport.qualityBarLabel, '起点1万均订基础线')} ${commercialScore ?? '-'} 分：${text(commercialReport.summary, '已生成商业诊断。')}`
        : '缺起点1万均订商业校准报告，不能只按内部规则判断作品可生产。',
      [
        commercialScore !== null ? `创作诊断 ${commercialScore}分` : '',
        ...arrayValue(commercialReport?.next_actions || commercialReport?.nextActions).slice(0, 2),
      ],
      planningAction('longform_creation_diagnosis', '按起点1万均订基础线检查核心不偏、故事强度、创新差异和读者吸引。'),
    ),
    manualTestGate(
      'reader_trial',
      '试读追读校准',
      readerGateStatus,
      readerTrial
        ? `${text(readerTrial.quality_bar_label || readerTrial.qualityBarLabel, '起点1万均订试读基准')} ${readerScore ?? '-'} 分：${text(readerTrial.summary, '已完成读者试读复盘。')}`
        : '缺读者试读复盘，无法判断开篇三章、试读十章和付费前追读是否会掉线。',
      [
        readerScore !== null ? `试读 ${readerScore}分` : '',
        ...readerDropPoints.slice(0, 2),
      ],
      readerDropPoints.length || readerGateStatus === 'warn'
        ? planningAction('create_reader_trial_repair', '把试读弃读点转成任务中心修复队列。')
        : planningAction('run_reader_trial_review', '按起点1万均订试读基准模拟读者弃读点、追读拉力和修复动作。'),
    ),
    manualTestGate(
      'longrun_stress',
      '长跑压力校准',
      longrunGateStatus,
      pressureReport
        ? `${targetBand}长线压力 ${pressureScore ?? '-'} 分；${pressureHasNewStressGates ? '已覆盖30/100/300章压力门。' : '缺30/100/300章新版压力门。'}`
        : `缺30/100/300章长跑压力测试，无法证明 ${targetBand} 能持续不塌线。`,
      [
        pressureScore !== null ? `压力测试 ${pressureScore}分` : '',
        ...arrayValue(pressureReport?.weak_points || pressureReport?.weakPoints).slice(0, 2).map((item: any) => `${text(item?.area)}：${text(item?.issue)}`),
      ],
      planningAction('longform_pressure', '运行长线压力测试，验证30章试读、100章卷级闭环、300章扩容引擎和正史记忆。'),
    ),
    manualTestGate(
      'memory_canon',
      '正史记忆锚点',
      memoryGateStatus,
      !stateFresh
        ? `故事状态只同步到第${stateChapter || 0}章，落后于第${latestChapterNo}章，长篇生产会放大设定漂移。`
        : memoryAnchor
          ? '正史锚点已有核心承诺、卷目标、人物状态、开放悬念或回报债，可进入首测观察。'
          : '缺正史记忆锚点，建议先同步故事状态，补角色状态、开放悬念和回报债。',
      [
        stateChapter ? `状态机第${stateChapter}章` : '',
        memoryAnchor?.core_promise ? `核心承诺：${memoryAnchor.core_promise}` : '',
        memoryAnchor?.open_questions?.length ? `开放悬念 ${memoryAnchor.open_questions.length}` : '',
        memoryAnchor?.payoff_debts?.length ? `回报债 ${memoryAnchor.payoff_debts.length}` : '',
      ],
      writingAction('sync_story_state', '同步故事状态，沉淀角色状态、开放悬念、回报债和核心承诺。'),
    ),
  ]

  const blocking = gates.find(item => item.status === 'block')
  const warning = gates.find(item => item.status === 'warn')
  const status: AutoCreationManualTestReadinessStatus = blocking ? 'blocked' : warning ? 'needs_calibration' : 'ready'
  const primaryAction = (blocking || warning)?.action || planningAction('enter_chapter_writing', '校准通过，可以进入当前章写作并开始第一次手工测试。')
  const handoffChecklist = [
    '先跑长篇创作健康诊断，确认核心不偏、故事强度、创新差异和读者吸引。',
    '再跑读者试读复盘，确认开篇三章、试读十章和付费前追读没有高危弃读点。',
    '运行长线压力测试，用30/100/300章压力门检查卷级闭环、扩容引擎和正史记忆。',
    '首测时按“今日唯一动作 -> 当前章生产链 -> 任务中心风险 -> 安全连写预检”的顺序走查。',
  ]

  return {
    status,
    label: status === 'ready' ? '首测校准已通过' : status === 'blocked' ? '首测校准阻塞' : '首测校准待补强',
    summary: status === 'ready'
      ? '商业标杆、试读追读、长跑压力和正史记忆都已具备，可以进入第一次手工测试。'
      : `${(blocking || warning)?.label || '首测校准'}仍未达标，先处理这一步，再用手工测试验证真实创作链路。`,
    gates,
    primaryAction,
    handoffChecklist,
  }
}


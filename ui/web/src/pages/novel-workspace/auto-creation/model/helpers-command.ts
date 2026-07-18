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
  arrayValue,
  deliveryRiskRepairPayload,
  firstText,
  opsAction,
  planningAction,
  text,
  writingAction,
} from './helpers-basics'
import {
  batchChapterDelivered,
  batchReleaseEvidenceFromPreflight,
  buildBatchCompletionDashboard,
  buildBatchHandoff,
  buildResolvedBatchRiskIssueKeys,
  buildSafeBatchExpansionFeedback,
  chapterHandoffDetail,
  chapterRangeLabel,
  characterArcNeedsAction,
  compactChapterNoEvidence,
  compactList,
  isSafeBatchGenerationSource,
  parsePayload,
  recordTime,
  retentionNeedsAction,
  rhythmNeedsAction,
  serialReleaseInventoryIssue,
  storylineNeedsAction,
  volumeBeatNeedsAction,
} from './helpers-main'
import {
  buildBatchRiskRadar,
} from './helpers-batch-risk-radar'
import {
  batchStatusToSignal,
  contractStatusToSignal,
  runwayGate,
  runwayQuestion,
} from './helpers-batch-guardrail'

export function buildMillionWordRunway(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  longformCompass: AutoCreationLongformCompass
  creationContract: AutoCreationContractItem[]
  chapterLaunchGate: AutoCreationChapterLaunchGate
  canonRunway: AutoCreationCanonRunway
  batchGuardrail: AutoCreationBatchGuardrail
}): AutoCreationMillionWordRunway {
  const { planning, writing, longformCompass, chapterLaunchGate, canonRunway, batchGuardrail } = args
  const chapter = (writing.nextChapter || {}) as AnyRecord
  const raw = (chapter.rawPayload || chapter.raw_payload || {}) as AnyRecord
  const innovationContract = args.creationContract.find(item => item.key === 'innovation')
  const chapterGoal = firstText(chapter.chapterGoal, chapter.chapter_goal, raw.chapterGoal, raw.chapter_goal, raw.goal)
  const endingHook = firstText(chapter.endingHook, chapter.ending_hook, raw.endingHook, raw.ending_hook, raw.hook)
  const mainlineMove = firstText(raw.mainlineProgress, raw.mainline_progress, planning.mainline.nextTurn, planning.mainline.currentVolumeGoal)
  const freshness = firstText(
    longformCompass.axes.find(item => item.key === 'innovation_hook')?.value,
    innovationContract?.detail,
    planning.mainline.readerPromise,
  )
  const fourQuestions: AutoCreationMillionWordRunwayQuestion[] = [
    runwayQuestion('why_now', '这章为什么必须写', chapterGoal, '缺少本章明确目标，容易写成过渡章。'),
    runwayQuestion('page_turn', '读者为什么翻页', endingHook, '缺少章末追读钩子。'),
    runwayQuestion('mainline_move', '主线推进了什么', mainlineMove, '缺少主线推进落点。'),
    runwayQuestion('freshness', '这一章的新意在哪', freshness, '缺少差异化执行点，容易滑回同题材套路。', false),
  ]
  const questionBlocking = fourQuestions.some(item => item.status === 'block')
  const questionWarning = fourQuestions.some(item => item.status === 'warn')
  const readerFuel = compactList([
    firstText(raw.readerPayoff, raw.reader_payoff, raw.payoff, raw.payoffModel),
    planning.mainline.payoffModel ? `长期爽点：${planning.mainline.payoffModel}` : '',
    endingHook ? `章末钩子：${endingHook}` : '',
    planning.first30Retention?.summary ? `留存状态：${planning.first30Retention.summary}` : '',
  ], 5)
  const launchReaderSignals = chapterLaunchGate.signals.filter(item => ['reader_payoff', 'ending_hook'].includes(item.key))
  const readerFuelStatus: AutoCreationBatchGuardrailSignalStatus = launchReaderSignals.some(item => item.status === 'block')
    ? 'block'
    : launchReaderSignals.some(item => item.status === 'warn') || readerFuel.length < 2
      ? 'warn'
      : 'ok'
  const batchSignal = batchStatusToSignal(batchGuardrail.status)
  const gates: AutoCreationMillionWordRunwayGate[] = [
    runwayGate(
      'core_compass',
      '核心罗盘',
      longformCompass.status === 'ready' ? 'ok' : 'block',
      longformCompass.summary,
    ),
    runwayGate(
      'chapter_four_questions',
      '本章四问',
      questionBlocking ? 'block' : questionWarning ? 'warn' : 'ok',
      fourQuestions.map(item => `${item.label}：${item.answer}`).join('；'),
    ),
    runwayGate(
      'reader_fuel',
      '追读燃料',
      readerFuelStatus,
      readerFuel.length ? readerFuel.join('；') : '缺少本章读者回报和章末钩子。',
    ),
    runwayGate(
      'innovation',
      '创新差异',
      contractStatusToSignal(innovationContract?.status),
      innovationContract?.detail || '按创作契约检查创新角度、差异护栏和可视化场面。',
    ),
    runwayGate(
      'canon_memory',
      '长线记忆',
      canonRunway.status,
      canonRunway.detail,
    ),
    runwayGate(
      'batch_entry',
      '连写准入',
      batchSignal,
      batchGuardrail.summary,
    ),
  ]
  const blocking = gates.find(item => item.status === 'block')
  const warning = gates.find(item => item.status === 'warn')
  const status: AutoCreationMillionWordRunwayStatus = blocking ? 'blocked' : warning ? 'single_chapter' : 'ready'
  const recommendedAction = canonRunway.status !== 'ok'
    ? canonRunway.action
    : chapterLaunchGate.status !== 'ready'
      ? chapterLaunchGate.action
      : batchGuardrail.status !== 'ready'
        ? batchGuardrail.recommendedAction
        : batchGuardrail.recommendedAction
  const redLines = compactList([
    ...longformCompass.immutableRules,
    ...arrayValue(planning.mainline.risks).map(item => `当前风险：${text(item)}`),
  ], 6)

  return {
    status,
    label: status === 'ready' ? '航线可连续' : status === 'single_chapter' ? '航线仅单章' : '航线阻塞',
    summary: status === 'ready'
      ? `当前处于${planning.longformRhythm.currentBandLabel || '长篇跑道'}，核心、追读、创新、记忆和连写准入均可支撑小批量生产。`
      : status === 'single_chapter'
        ? `当前处于${planning.longformRhythm.currentBandLabel || '长篇跑道'}，${warning?.label || '长篇材料'}仍需关注，本轮只建议单章推进。`
        : `${blocking?.label || '长篇航线'}未通过：${blocking?.detail || '先处理阻塞项，再进入自动创作。'}`,
    bandLabel: planning.longformRhythm.currentBandLabel || '长篇跑道',
    safeModeLabel: status === 'ready' ? `小批量连写 ${batchGuardrail.safeChapterCount} 章` : status === 'single_chapter' ? '仅单章推进' : '禁止连写',
    gates,
    fourQuestions,
    redLines,
    readerFuel,
    recommendedAction,
  }
}

export function buildBatchReviewQueue(args: {
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  planning?: PlanningWorkspaceModel | null
  storyState: AnyRecord
}): AutoCreationBatchReviewQueue {
  const { runRecords, reviews, storyState } = args
  const safeBatchRuns = runRecords
    .filter(run => text(run?.run_type) === 'batch_generate_prose')
    .map(run => ({
      run,
      input: parsePayload(run?.input_ref, { owner: run, kind: 'run', field: 'input_ref' }) || {},
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => isSafeBatchGenerationSource(text(entry.input?.source)))
    .sort((a, b) => recordTime(b.run) - recordTime(a.run))

  const latest = safeBatchRuns[0]
  if (!latest) {
    const nextAction = opsAction('open_task_center', '查看任务中心', '查看后台任务、失败记录和可恢复任务。')
    const riskRadar = buildBatchRiskRadar({ items: [], chapters: args.chapters, reviews, planning: args.planning })
    return {
      visible: false,
      status: 'empty',
      label: '安全连写复盘',
      summary: '还没有安全连写批次。',
      total: 0,
      success: 0,
      failed: 0,
      delivered: 0,
      safeLimit: null,
      availableTotal: null,
      createdAt: '',
      nextAction,
      riskRadar,
      completionDashboard: buildBatchCompletionDashboard({
        status: 'empty',
        total: 0,
        success: 0,
        failed: 0,
        delivered: 0,
        riskRadar,
        nextAction,
      }),
      handoff: buildBatchHandoff({
        status: 'empty',
        total: 0,
        success: 0,
        failed: 0,
        delivered: 0,
        items: [],
        riskRadar,
        nextAction,
      }),
      items: [],
    }
  }

  const batchChapters = arrayValue(latest.output?.chapters)
  const items = batchChapters.map(chapter => {
    const item = {
      chapterId: chapter?.id ?? null,
      chapterNo: Number(chapter?.chapter_no || chapter?.chapterNo || 0),
      title: text(chapter?.title, '未命名章节'),
      status: text(chapter?.status) === 'failed' ? 'failed' as const : 'success' as const,
      score: Number.isFinite(Number(chapter?.score)) ? Number(chapter?.score) : null,
      wordCount: Number.isFinite(Number(chapter?.word_count ?? chapter?.wordCount)) ? Number(chapter?.word_count ?? chapter?.wordCount) : null,
      revised: Boolean(chapter?.revised),
      delivered: false,
      error: text(chapter?.error),
    }
    return {
      ...item,
      delivered: batchChapterDelivered({ item, chapters: args.chapters, reviews, storyState }),
    }
  }).filter(item => item.chapterNo > 0 || item.title)

  const failed = Number(latest.output?.failed ?? items.filter(item => item.status === 'failed').length)
  const success = Number(latest.output?.success ?? items.filter(item => item.status === 'success').length)
  const total = Number(latest.output?.total ?? items.length)
  const safeLimit = Number(latest.input?.safety_limit || 0)
  const availableTotal = Number(latest.input?.available_total || 0)
  const batchPreflight = latest.input?.batch_preflight || latest.input?.batchPreflight || null
  const hasFailure = failed > 0 || text(latest.run?.status) === 'warn'
  const delivered = items.filter(item => item.status === 'success' && item.delivered).length
  const allSuccessfulChaptersDelivered = !hasFailure && items.length > 0 && items
    .filter(item => item.status === 'success')
    .every(item => item.delivered)
  const resolvedIssueKeys = buildResolvedBatchRiskIssueKeys({
    runRecords,
    batchCreatedAt: text(latest.run?.created_at),
    chapters: args.chapters,
    reviews,
  })
  const expansionFeedback = buildSafeBatchExpansionFeedback({
    runRecords,
    chapters: args.chapters,
    reviews,
  })
  const riskRadar = buildBatchRiskRadar({
    items,
    chapters: args.chapters,
    reviews,
    planning: args.planning,
    resolvedIssueKeys,
    nextBatchBrief: latest.input?.next_batch_brief || latest.input?.nextBatchBrief || null,
    batchPreflight,
    expansionFeedback,
    postBatchQualityCheck: latest.output?.post_batch_quality_check || latest.output?.postBatchQualityCheck || null,
  })
  const hasDeliveredBatchRisk = allSuccessfulChaptersDelivered && riskRadar.status === 'warn'
  const status: AutoCreationBatchReviewStatus = hasFailure
    ? 'warn'
    : hasDeliveredBatchRisk
      ? 'risk'
      : allSuccessfulChaptersDelivered ? 'done' : 'ok'
  const summary = hasFailure
    ? `本次安全连写 ${success}/${total} 章成功，先处理失败章节，再开启下一批。`
    : hasDeliveredBatchRisk
      ? `本次安全连写 ${delivered}/${total} 章已交付，但存在批次质量风险，先复盘修正再继续。`
    : allSuccessfulChaptersDelivered
      ? `本次安全连写 ${delivered}/${total} 章已完成交稿闭环，可以开启下一批安全连写。`
      : `本次安全连写 ${success}/${total} 章完成，下一步逐章质检、修订和状态回填。`
  const nextAction = hasFailure
    ? opsAction('open_task_center', '查看失败任务', '打开任务中心，定位失败章节和可恢复步骤。')
    : hasDeliveredBatchRisk
      ? opsAction('create_safe_batch_risk_repair', '生成批次修复任务', '把上一批的核心偏移、回报欠账、剧情线和可读性风险写入任务中心。')
    : allSuccessfulChaptersDelivered
      ? opsAction('start_safe_batch_generation', '开始下一批安全连写', '上一批已完成交稿闭环；按当前护栏继续小批量生产。')
      : planningAction('open_quality_revision', '进入质检修订，按章节质量、核心偏移、读者回报和剧情线同步逐章验收。')
  const completionDashboard = buildBatchCompletionDashboard({
    status,
    total,
    success,
    failed,
    delivered,
    riskRadar,
    nextAction,
  })
  const handoff = buildBatchHandoff({
    status,
    total,
    success,
    failed,
    delivered,
    items,
    riskRadar,
    nextAction,
    releaseEvidence: batchReleaseEvidenceFromPreflight(batchPreflight),
  })

  return {
    visible: true,
    status,
    label: '安全连写复盘',
    summary,
    total,
    success,
    failed,
    delivered,
    safeLimit: safeLimit > 0 ? safeLimit : null,
    availableTotal: availableTotal > 0 ? availableTotal : null,
    createdAt: text(latest.run?.created_at),
    nextAction,
    riskRadar,
    completionDashboard,
    handoff,
    items,
  }
}

export function batchGuardrailRiskLabels(guardrail: AutoCreationBatchGuardrail) {
  return guardrail.guardrails
    .filter(item => item.status !== 'ok')
    .map(item => item.label)
    .filter(Boolean)
}

export function batchGuardrailEvidence(guardrail: AutoCreationBatchGuardrail) {
  return guardrail.guardrails
    .filter(item => item.status !== 'ok')
    .map(item => item.detail)
    .filter(Boolean)
    .slice(0, 4)
}

export function actionTargetChapterNos(action: AutoCreationDirectorAction) {
  const payload = action.payload || {}
  return [
    ...arrayValue(payload?.chapter_nos),
    ...arrayValue(payload?.chapterNos),
    payload?.chapter_no,
    payload?.chapterNo,
  ].map(no => Number(no || 0)).filter(Boolean)
}

export function reconcileBatchHandoffWithGuardrail(
  queue: AutoCreationBatchReviewQueue,
  guardrail: AutoCreationBatchGuardrail,
): AutoCreationBatchReviewQueue {
  if (!queue.visible || queue.status !== 'done' || guardrail.status === 'ready') return queue

  const targetChapterNos = Array.from(new Set([
    ...guardrail.releaseWindow.blockedChapters.map(chapter => Number(chapter.chapterNo || 0)),
    ...guardrail.preflight.blockedChapterNos,
    ...guardrail.nextBatchBrief.chapters.slice(0, 1).map(chapter => Number(chapter.chapterNo || 0)),
    ...actionTargetChapterNos(guardrail.recommendedAction),
  ].filter(Boolean)))
  const label = guardrail.recommendedAction.key === 'update_rolling_plan' ? '补下一批计划' : '处理下一批护栏'
  const riskLabels = batchGuardrailRiskLabels(guardrail)
  const evidence = Array.from(new Set([
    ...arrayValue(queue.handoff.evidence).map(item => text(item)).filter(Boolean),
    ...batchGuardrailEvidence(guardrail),
  ]))

  return {
    ...queue,
    handoff: {
      ...queue.handoff,
      visible: true,
      status: 'prepare_next',
      label,
      summary: `上一批 ${queue.delivered}/${queue.total} 章已完成交稿闭环，但下一批尚未通过安全连写护栏；先处理${riskLabels.length ? `「${riskLabels[0]}」` : '下一批计划'}再继续连写。`,
      action: guardrail.recommendedAction,
      targetChapterNos,
      riskLabels,
      evidence,
    },
  }
}

export function hasBatchReviewRisk(queue: AutoCreationBatchReviewQueue) {
  return queue.visible && (queue.status === 'warn' || queue.status === 'risk')
}

export function isFuelGovernanceAction(action: AutoCreationDirectorAction) {
  if (action.area === 'writing' && [
    'update_canon',
    'fix_continuity',
  ].includes(String(action.key))) return true
  return action.area === 'planning' && [
    'run_first30_retention',
    'create_first30_repair',
    'open_story_assets',
    'complete_volume_plan',
    'longform_pressure',
    'open_quality_revision',
    'update_rolling_plan',
    'future100_generate',
    'topic_validation',
    'reference_diagnosis',
  ].includes(String(action.key))
}

export function buildFuelAction(args: {
  mainAction: AutoCreationDirectorAction
  longformCapacity: AutoCreationLongformCapacity
}) {
  if (isFuelGovernanceAction(args.mainAction)) return args.mainAction
  const fuel = args.longformCapacity.fuelQueue[0]
  if (fuel) {
    return {
      area: 'planning' as const,
      key: fuel.actionKey,
      label: fuel.actionLabel,
      description: fuel.detail,
      modelCall: fuel.modelCall,
    }
  }
  return planningAction('longform_creation_diagnosis', '检查读者承诺、长线冲突、创新差异和留存牵引，作为今天继续生产前的总诊断。')
}

export function buildChapterWorkAction(writing: WritingCockpitModel, writingQueueFocus?: AutoCreationWritingQueueFocus) {
  if (writingQueueFocus?.visible) return writingQueueFocus.action
  const acceptance = writing.chapterAcceptanceDesk
  if (acceptance.visible) {
    const action = acceptance.recommendedAcceptanceAction
    return writingAction(action.key, '先把当前章走完质检、修订、状态回填和验收闭环。', action.label)
  }
  const plannerAction = writing.chapterPlanningDesk.recommendedPlannerAction
  return writingAction(
    plannerAction.key || writing.primaryActionKey,
    '按章节任务书、场景卡和字数门禁推进当前章。',
    plannerAction.label,
  )
}

export function buildDailyBattlePlan(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  mainAction: AutoCreationDirectorAction
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  batchGuardrail: AutoCreationBatchGuardrail
  batchReviewQueue: AutoCreationBatchReviewQueue
  longformCapacity: AutoCreationLongformCapacity
  writingQueueFocus: AutoCreationWritingQueueFocus
  hasBlockingPlan: boolean
  hasModel: boolean
  activeTasks: AnyRecord[]
}): AutoCreationDailyBattlePlan {
  const riskActive = args.deliveryRiskGate.status !== 'ok' || hasBatchReviewRisk(args.batchReviewQueue)
  const canonBlocked = args.batchGuardrail.guardrails.find(item => item.label === '长线记忆')?.status === 'block'
  const serialReleaseBlocked = args.batchGuardrail.guardrails.find(item => item.label === '连载库存')?.status === 'block'
  const fuelActive = !riskActive && (
    args.hasBlockingPlan
    || retentionNeedsAction(args.planning)
    || storylineNeedsAction(args.planning)
    || characterArcNeedsAction(args.planning)
    || volumeBeatNeedsAction(args.planning)
    || rhythmNeedsAction(args.planning)
    || args.longformCapacity.status === 'blocked'
    || canonBlocked
  )
  const chapter = args.writing.nextChapter
  const acceptance = args.writing.chapterAcceptanceDesk
  const chapterHandoff = (args.writing as any).chapterHandoffDesk || null
  const chapterHandoffVisible = Boolean(chapterHandoff?.visible)
  const chapterDone = Boolean(chapter?.hasProse) && !acceptance.visible && !chapterHandoffVisible
  const chapterBlocked = !chapter || args.writing.chapterPlanningDesk.readiness === 'blocked'
  const chapterActive = !riskActive && !fuelActive && !chapterDone
  const queueFocus = args.writingQueueFocus.visible ? args.writingQueueFocus : null

  const clearRiskAction = args.deliveryRiskGate.status !== 'ok'
    ? opsAction('create_delivery_risk_repair', '生成风险修复任务', args.deliveryRiskGate.summary, false, deliveryRiskRepairPayload(args.deliveryRiskGate))
    : hasBatchReviewRisk(args.batchReviewQueue)
      ? args.batchReviewQueue.nextAction
      : opsAction('open_task_center', '查看任务中心', '查看后台任务、失败记录和可恢复任务。')
  const fuelAction = buildFuelAction({
    mainAction: args.mainAction,
    longformCapacity: args.longformCapacity,
  })
  const chapterAction = buildChapterWorkAction(args.writing, args.writingQueueFocus)
  const batchAction = args.batchGuardrail.recommendedAction
  const batchStatus: AutoCreationPipelineStatus = riskActive
    ? 'blocked'
    : canonBlocked || serialReleaseBlocked
      ? 'blocked'
    : fuelActive || chapterActive
      ? 'pending'
      : args.batchGuardrail.status === 'ready'
        ? 'active'
        : args.batchGuardrail.status === 'caution'
          ? 'warning'
          : 'blocked'

  const steps: AutoCreationDailyBattleStep[] = [
    {
      key: 'clear_risks',
      label: '清交稿风险',
      status: riskActive ? 'active' : 'done',
      detail: riskActive
        ? args.deliveryRiskGate.status !== 'ok' ? args.deliveryRiskGate.summary : args.batchReviewQueue.summary
        : '交稿风险、批次失败和质量复盘没有阻塞今天生产。',
      action: clearRiskAction,
      badges: [
        args.deliveryRiskGate.totalOpen > 0 ? `未清 ${args.deliveryRiskGate.totalOpen}` : '',
        args.deliveryRiskGate.highOpen > 0 ? `高危 ${args.deliveryRiskGate.highOpen}` : '',
        hasBatchReviewRisk(args.batchReviewQueue) ? args.batchReviewQueue.label : '',
      ].filter(Boolean),
      gateChecks: [
        '交稿风险清零或已生成修复任务',
        '上一批失败、核心偏移、追读欠账、剧情线风险不继续滚入新章',
      ],
    },
    {
      key: 'fuel_materials',
      label: '补长线材料',
      status: riskActive ? 'pending' : fuelActive ? 'active' : 'done',
      detail: fuelActive
        ? args.mainAction.description
        : '前30章留存、剧情线、人物成长、卷级爆点和长篇节奏可支撑今天单章推进。',
      action: fuelAction,
      badges: [
        args.planning.first30Retention.score !== null ? `前30章 ${args.planning.first30Retention.score}` : '',
        `剧情线 ${args.planning.storylineBoard.total}`,
        args.longformCapacity.status !== 'ready' ? args.longformCapacity.label : '',
      ].filter(Boolean),
      gateChecks: [
        '未来10章规划、剧情线、爆点预算和长篇节奏可支撑当前章',
        '人物成长、关系推进和弧光兑现没有明显断档',
        '读者承诺、主线方向、创新卖点和追读燃料仍清晰',
      ],
    },
    {
      key: 'chapter_work',
      label: '写/修当前章',
      status: riskActive || fuelActive
        ? 'pending'
        : chapterDone
          ? 'done'
          : chapterBlocked ? 'blocked' : 'active',
      detail: queueFocus
        ? `${queueFocus.label}：${queueFocus.summary}`
        : chapterHandoffVisible
          ? `${text(chapterHandoff?.label, '章节交接')}：${chapterHandoffDetail(chapterHandoff)}`
        : chapterDone
        ? '当前章已完成交稿闭环，可以准备下一批生产。'
        : acceptance.visible
          ? (acceptance.acceptanceReasons[0] || acceptance.statusLabel)
          : args.writing.chapterPlanningDesk.reasons[0] || args.writing.topStatus.nextActionLabel,
      action: chapterAction,
      badges: queueFocus?.badges.length ? queueFocus.badges : [
        chapterHandoffVisible ? `第${Number(chapterHandoff?.fromChapterNo || 0) || '-'}章→第${Number(chapterHandoff?.toChapterNo || 0) || '-' }章` : '',
        chapterHandoffVisible ? text(chapterHandoff?.label) : '',
        chapter ? `第${Number(chapter.chapterNo || 0)}章` : '',
        chapter?.hasProse ? `${Number(chapter.wordCount || 0)}字` : args.writing.chapterPlanningDesk.statusLabel,
      ].filter(Boolean),
      gateChecks: [
        '当前章完成任务书、正文、质检、修订、故事状态同步和验收闭环',
        '正文满足字数门禁、核心不偏、读者期待和章末追读要求',
      ],
    },
    {
      key: 'batch_release',
      label: '放行下一批',
      status: batchStatus,
      detail: args.batchGuardrail.summary,
      action: batchAction,
      badges: [
        `安全 ${args.batchGuardrail.safeChapterCount}章`,
        args.batchGuardrail.nextBatchBrief.visible ? args.batchGuardrail.nextBatchBrief.chapterRangeLabel : '',
      ].filter(Boolean),
      gateChecks: [
        '下一批只放行安全连写护栏允许的连续章节',
        '批次任务书、长线记忆、近10章疲劳和交稿回填均已通过',
      ],
    },
  ]

  const currentStep = steps.find(step => step.status === 'active')
    || steps.find(step => step.status === 'blocked')
    || steps.find(step => step.status === 'warning')
    || steps[steps.length - 1]
  const currentStepKey = currentStep.key
  const summary = currentStepKey === 'clear_risks'
    ? '今天先清未交稿风险，再进入章节生产；避免问题章节带着核心偏移、追读欠账或禁揭风险滚入后文。'
    : currentStepKey === 'fuel_materials'
      ? '今天先补长线材料，再写当前章；保证 300万到1000万字生产时主线、留存和爆点不断粮。'
      : currentStepKey === 'chapter_work'
        ? '今天先推进当前章，把任务书、正文、质检、修订和状态回填做成一个闭环。'
        : '当前章闭环已完成，可以按护栏放行下一批小规模安全连写。'

  return {
    label: '连载日更作战',
    summary,
    currentStepKey,
    steps,
  }
}

export function buildProductionLicense(args: {
  hasModel: boolean
  mainAction: AutoCreationDirectorAction
  dailyBattlePlan: AutoCreationDailyBattlePlan
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  governanceClosureBrief: AutoCreationGovernanceClosureBrief
  storylineDecisionGate: AutoCreationStorylineDecisionGate
  batchReviewQueue: AutoCreationBatchReviewQueue
  batchGuardrail: AutoCreationBatchGuardrail
  chapterLaunchGate: AutoCreationChapterLaunchGate
  millionWordRunway: AutoCreationMillionWordRunway
}): AutoCreationProductionLicense {
  const currentStep = args.dailyBattlePlan.steps.find(step => step.key === args.dailyBattlePlan.currentStepKey)
    || args.dailyBattlePlan.steps[0]
  const hasOpenDeliveryRisk = args.deliveryRiskGate.status !== 'ok'
  const hasOpenGovernanceClosure = args.governanceClosureBrief.status !== 'ok'
  const hasOpenStorylineDecision = args.storylineDecisionGate.status !== 'ok'
  const hasOpenBatchRisk = hasBatchReviewRisk(args.batchReviewQueue)
  const serialReleaseIssue = serialReleaseInventoryIssue(args.batchGuardrail)
  const serialReleaseBlocked = serialReleaseIssue?.status === 'block'
  const hardBlocked = !args.hasModel
    || hasOpenDeliveryRisk
    || hasOpenGovernanceClosure
    || hasOpenStorylineDecision
    || hasOpenBatchRisk
    || serialReleaseBlocked
    || args.chapterLaunchGate.status === 'blocked'
    || args.millionWordRunway.status === 'blocked'
    || currentStep.status === 'blocked'
  const reasons = [
    !args.hasModel ? '未选择可用模型' : '',
    hasOpenDeliveryRisk ? args.deliveryRiskGate.summary : '',
    hasOpenGovernanceClosure ? args.governanceClosureBrief.summary : '',
    hasOpenStorylineDecision ? args.storylineDecisionGate.summary : '',
    hasOpenBatchRisk ? args.batchReviewQueue.summary : '',
    serialReleaseBlocked ? serialReleaseIssue?.detail : '',
    args.chapterLaunchGate.status === 'blocked' ? args.chapterLaunchGate.summary : '',
    args.millionWordRunway.status === 'blocked' ? args.millionWordRunway.summary : '',
    currentStep.status === 'blocked' ? currentStep.detail : '',
  ].filter(Boolean).slice(0, 4)
  const productionRelapseReviewCta = args.batchGuardrail.recommendedAction.payload?.production_relapse_review_cta || null
  if (args.hasModel && text(productionRelapseReviewCta?.kind) === 'repair_production_relapse') {
    return {
      status: 'single_chapter',
      label: '生产许可',
      modeLabel: '生产后验待修',
      summary: text(productionRelapseReviewCta.summary, args.batchGuardrail.recommendedAction.description),
      safeChapterCount: Math.max(1, Number(productionRelapseReviewCta.target_chapter_count || productionRelapseReviewCta.targetChapterCount || 1)),
      reasons: [
        text(args.batchGuardrail.recommendedAction.description),
        ...arrayValue(productionRelapseReviewCta.remaining_failure_reasons || productionRelapseReviewCta.remainingFailureReasons).map(reason => `剩余生产后验：${text(reason)}`),
      ].filter(Boolean).slice(0, 4),
      badges: ['生产后验', '待重修'],
      nextAction: args.batchGuardrail.recommendedAction,
    }
  }

  if (hardBlocked) {
    return {
      status: 'blocked',
      label: '生产许可',
      modeLabel: '禁止生产',
      summary: reasons[0] || '当前存在未处理门禁，先完成总控台唯一下一步，再继续生成正文或安全连写。',
      safeChapterCount: 0,
      reasons,
      badges: ['禁止连写', hasOpenGovernanceClosure ? args.governanceClosureBrief.label : hasOpenStorylineDecision ? args.storylineDecisionGate.label : serialReleaseBlocked ? '发布窗口阻塞' : currentStep.label],
      nextAction: hasOpenGovernanceClosure
        ? args.governanceClosureBrief.action
        : hasOpenStorylineDecision
        ? opsAction('open_task_center', '打开任务中心', args.storylineDecisionGate.summary)
        : serialReleaseBlocked ? args.batchGuardrail.recommendedAction : currentStep.action || args.mainAction,
    }
  }

  const safeBatchRecoveryFocus = args.batchGuardrail.recommendedAction.payload?.safeBatchRecoveryFocus || null
  if (args.batchGuardrail.status === 'ready' && args.batchGuardrail.recommendedAction.key === 'open_task_center' && safeBatchRecoveryFocus) {
    return {
      status: 'single_chapter',
      label: '生产许可',
      modeLabel: args.batchGuardrail.safeChapterCount > 1 ? '小批验证待复盘' : '单章治理待复盘',
      summary: `安全连写路线图提示先处理「${text(safeBatchRecoveryFocus.actionLabel || safeBatchRecoveryFocus.layerLabel, '下一层修复')}」，再按 ${args.batchGuardrail.safeChapterCount} 章验证批放行。`,
      safeChapterCount: Math.max(1, args.batchGuardrail.safeChapterCount || 1),
      reasons: [args.batchGuardrail.recommendedAction.description],
      badges: [
        text(safeBatchRecoveryFocus.taskCenterFilterLabel || safeBatchRecoveryFocus.layerLabel, '路线图聚焦'),
        `验证 ${args.batchGuardrail.safeChapterCount}章`,
      ],
      nextAction: args.batchGuardrail.recommendedAction,
    }
  }

  if (args.batchGuardrail.status === 'ready' && args.batchGuardrail.recommendedAction.key === 'start_safe_batch_generation') {
    const recoveryEvidenceReleaseSummary = args.batchGuardrail.preflight.inputSnapshot?.recovery_evidence_release_summary || null
    const recoveryEvidenceReleaseReasons = arrayValue(recoveryEvidenceReleaseSummary?.evidence).slice(0, 3)
    const actionSource = text(args.batchGuardrail.recommendedAction.payload?.source)
    const productionRelapseReviewCta = args.batchGuardrail.recommendedAction.payload?.production_relapse_review_cta || null
    const isProductionRelapseReviewCta = actionSource === 'safe_batch_production_relapse_review_cta'
    const isProductionRelapseValidationBatch = actionSource === 'safe_batch_production_relapse_validation_batch'
    const isRecoveryValidationBatch = actionSource === 'safe_batch_recovery_validation_batch'
    const isRecoveryRestoreBatch = actionSource === 'safe_batch_recovery_restore_five_batch'
    const productionRelapseValidation = args.batchGuardrail.recommendedAction.payload?.production_relapse_validation || null
    const productionRelapseValidationChapterNos = arrayValue(productionRelapseValidation?.default_batch_chapter_nos || productionRelapseValidation?.defaultBatchChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0)
    const productionRelapseValidationReasons = arrayValue(productionRelapseValidation?.failure_reasons || productionRelapseValidation?.failureReasons)
      .map(reason => text(reason))
      .filter(Boolean)
    const productionRelapseValidationSummary = `生产后验验证批：对照${productionRelapseValidation?.template_version_id ? `模板版本 ${productionRelapseValidation.template_version_id}` : '当前模板版本'}和真实生产复发章节${productionRelapseValidationChapterNos.length ? compactChapterNoEvidence(productionRelapseValidationChapterNos) : '记录'}；${productionRelapseValidationReasons.length ? `只验证剩余真实失败维度 ${productionRelapseValidationReasons.join('、')}` : '只验证真实生产失败维度'}，本轮必须输出 production_relapse_verdict.status=passed 且 remaining_failure_reasons 为空。`
    const restoreStabilityLane = args.batchGuardrail.recommendedAction.payload?.recovery_restore_stability_evidence
      || args.batchGuardrail.recommendedAction.payload?.default_five_chapter_lane
      || args.batchGuardrail.preflight.inputSnapshot?.safe_batch_recovery_restore_stability_lane
      || null
    const isRecoveryRestoreObservationBatch = isRecoveryRestoreBatch && text(restoreStabilityLane?.status) === 'observing'
    const isDefaultFiveChapterLane = actionSource === 'auto_creation_safe_batch'
      && Boolean(restoreStabilityLane?.default_five_chapter_ready)
    const recoveryRestoreConfirmation = args.batchGuardrail.recommendedAction.payload?.recovery_restore_confirmation
      || args.batchGuardrail.preflight.inputSnapshot?.safe_batch_recovery_restore_confirmation
      || null
    const recoveryRestoreChapterNos = arrayValue(recoveryRestoreConfirmation?.validation_chapter_nos || recoveryRestoreConfirmation?.validationChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0)
    const recoveryRestoreSummary = text(
      recoveryRestoreConfirmation?.summary,
      recoveryRestoreChapterNos.length
        ? `3章验证批已通过：${compactChapterNoEvidence(recoveryRestoreChapterNos)}核心守恒、显性回报和章末追读稳定，可确认恢复 ${args.batchGuardrail.safeChapterCount} 章扩批。`
        : `3章验证批已通过，可确认恢复 ${args.batchGuardrail.safeChapterCount} 章扩批。`,
    )
    return {
      status: 'batch_allowed',
      label: '生产许可',
      modeLabel: isProductionRelapseReviewCta
        ? text(productionRelapseReviewCta?.kind) === 'restore_default_lane' ? '默认5章档位' : '5章观察批'
        : isRecoveryRestoreObservationBatch
        ? '5章观察批'
        : isDefaultFiveChapterLane
          ? '默认5章档位'
          : isProductionRelapseValidationBatch
            ? '生产后验验证批'
          : isRecoveryRestoreBatch
        ? '恢复5章扩批'
        : isRecoveryValidationBatch ? `${args.batchGuardrail.safeChapterCount}章验证批` : '小批量连写',
      summary: isProductionRelapseReviewCta
        ? text(productionRelapseReviewCta?.summary, args.batchGuardrail.recommendedAction.description)
        : isRecoveryRestoreObservationBatch
        ? text(restoreStabilityLane?.summary, `恢复5章扩批仍需继续观察 1-2 批，本批放行 ${args.batchGuardrail.safeChapterCount} 章观察。`)
        : isDefaultFiveChapterLane
          ? text(restoreStabilityLane?.summary, `恢复5章扩批已形成长期稳定证据，本批进入默认5章档位。`)
          : isProductionRelapseValidationBatch
            ? productionRelapseValidationSummary
          : isRecoveryRestoreBatch
        ? recoveryRestoreSummary
        : isRecoveryValidationBatch
          ? `安全连写路线图已清掉黄色修复层，当前放行 ${args.batchGuardrail.safeChapterCount} 章验证批；每章继续回填核心守恒、读者回报、追读拉力和结构执行结果。`
          : `当前长线材料、交稿风险和下一批任务书已通过检查，可按安全连写放行 ${args.batchGuardrail.safeChapterCount} 章。`,
      safeChapterCount: args.batchGuardrail.safeChapterCount,
      reasons: [
        '长线材料可用',
        '交稿风险已清',
        '剧情线决策已闭环',
        '下一批任务书可执行',
        ...(isProductionRelapseReviewCta ? [text(productionRelapseReviewCta?.label, '生产后验复盘')] : []),
        ...(isRecoveryRestoreBatch && !isRecoveryRestoreObservationBatch ? ['3章验证批通过'] : []),
        ...(isRecoveryRestoreObservationBatch ? ['恢复5章扩批仍在观察'] : []),
        ...(isDefaultFiveChapterLane ? [`恢复5章扩批连续 ${Number(restoreStabilityLane?.stable_pass_streak || 0)} 批稳定`] : []),
        ...(isProductionRelapseValidationBatch ? ['生产后验验证批'] : []),
        ...(isRecoveryValidationBatch ? ['安全连写路线图已清掉黄色修复层'] : []),
        ...arrayValue(recoveryRestoreConfirmation?.evidence).slice(0, 2),
        ...recoveryEvidenceReleaseReasons,
      ],
      badges: [
        isProductionRelapseReviewCta
          ? text(productionRelapseReviewCta?.kind) === 'restore_default_lane' ? '默认5章' : '观察5章'
          : isRecoveryRestoreObservationBatch
          ? '观察5章'
          : isDefaultFiveChapterLane
            ? '默认5章'
            : isProductionRelapseValidationBatch
              ? '生产后验验证'
              : isRecoveryRestoreBatch ? '恢复5章' : isRecoveryValidationBatch ? `验证 ${args.batchGuardrail.safeChapterCount}章` : `安全 ${args.batchGuardrail.safeChapterCount}章`,
        args.batchGuardrail.nextBatchBrief.chapterRangeLabel,
      ].filter(Boolean),
      nextAction: args.batchGuardrail.recommendedAction,
    }
  }

  const recoveryEvidenceProfileWarning = args.batchGuardrail.guardrails.find(item => item.label === '恢复依据画像' && item.status === 'warn')
  if (args.batchGuardrail.status === 'caution' && recoveryEvidenceProfileWarning) {
    return {
      status: 'single_chapter',
      label: '生产许可',
      modeLabel: '单章生产',
      summary: '下一批护栏仍有谨慎项，只允许单章小步推进，避免批量生成时放大主线偏移或节奏疲劳。',
      safeChapterCount: Math.max(1, Math.min(1, args.batchGuardrail.safeChapterCount || 1)),
      reasons: [recoveryEvidenceProfileWarning.detail],
      badges: ['禁止批量', '单章校验'],
      nextAction: args.batchGuardrail.recommendedAction,
    }
  }

  if (currentStep.key === 'chapter_work' && currentStep.status === 'active') {
    return {
      status: 'single_chapter',
      label: '生产许可',
      modeLabel: '单章生产',
      summary: '先推进当前章，把任务书、正文、质检、修订和状态回填做成闭环；暂不放行下一批自动连写。',
      safeChapterCount: 1,
      reasons: [currentStep.detail],
      badges: ['单章闭环', currentStep.label],
      nextAction: currentStep.action,
    }
  }

  if (args.batchGuardrail.status === 'caution') {
    return {
      status: 'single_chapter',
      label: '生产许可',
      modeLabel: '单章生产',
      summary: '下一批护栏仍有谨慎项，只允许单章小步推进，避免批量生成时放大主线偏移或节奏疲劳。',
      safeChapterCount: Math.max(1, Math.min(1, args.batchGuardrail.safeChapterCount || 1)),
      reasons: args.batchGuardrail.guardrails.filter(item => item.status !== 'ok').map(item => item.detail).slice(0, 4),
      badges: ['禁止批量', '单章校验'],
      nextAction: args.batchGuardrail.recommendedAction,
    }
  }

  return {
    status: 'blocked',
    label: '生产许可',
    modeLabel: '禁止生产',
    summary: currentStep.detail || '先完成当前总控步骤，再继续生产。',
    safeChapterCount: 0,
    reasons: [currentStep.detail].filter(Boolean),
    badges: ['等待门禁', currentStep.label],
    nextAction: currentStep.action || args.mainAction,
  }
}

export function buildTodayCommandDeck(args: {
  dailyBattlePlan: AutoCreationDailyBattlePlan
  productionLicense: AutoCreationProductionLicense
  creationContract: AutoCreationContractItem[]
  chapterLaunchGate: AutoCreationChapterLaunchGate
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  governanceRecheckMemory: AutoCreationGovernanceRecheckMemory
  storylineDecisionGate: AutoCreationStorylineDecisionGate
  batchGuardrail: AutoCreationBatchGuardrail
  millionWordRunway: AutoCreationMillionWordRunway
}): AutoCreationTodayCommandDeck {
  const currentStep = args.dailyBattlePlan.steps.find(step => step.key === args.dailyBattlePlan.currentStepKey)
    || args.dailyBattlePlan.steps[0]
  const reasons = [
    args.productionLicense.summary,
    ...args.productionLicense.reasons,
    currentStep?.detail || '',
  ]

  return {
    label: '今日指挥条',
    status: args.productionLicense.status,
    modeLabel: args.productionLicense.modeLabel,
    currentStepLabel: currentStep?.label || '等待下一步',
    summary: args.productionLicense.summary,
    reasons: Array.from(new Set(reasons.filter(Boolean))).slice(0, 3),
    action: args.productionLicense.nextAction,
    actionLabel: args.productionLicense.nextAction.label,
    releaseRationale: buildReleaseRationale(args),
    governanceMemory: args.governanceRecheckMemory,
    qualityGates: buildTodayQualityGates(args),
    flow: args.dailyBattlePlan.steps.map(step => ({
      key: step.key,
      label: step.label,
      status: step.status,
    })),
  }
}

export function buildReleaseRationale(args: {
  productionLicense: AutoCreationProductionLicense
  dailyBattlePlan: AutoCreationDailyBattlePlan
  batchGuardrail: AutoCreationBatchGuardrail
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  storylineDecisionGate: AutoCreationStorylineDecisionGate
  millionWordRunway: AutoCreationMillionWordRunway
}): AutoCreationReleaseRationale {
  const currentStep = args.dailyBattlePlan.steps.find(step => step.key === args.dailyBattlePlan.currentStepKey)
    || args.dailyBattlePlan.steps[0]
  const guardrailIssues = args.batchGuardrail.guardrails
    .filter(item => item.status !== 'ok')
    .map(item => item.detail)
    .filter(Boolean)
  if (args.productionLicense.status === 'batch_allowed') {
    return {
      mode: args.productionLicense.modeLabel,
      allowedCount: args.productionLicense.safeChapterCount,
      primaryReason: args.productionLicense.summary,
      checks: Array.from(new Set([
        ...args.productionLicense.reasons,
        args.batchGuardrail.nextBatchBrief.visible ? '批次任务书完整' : '',
        args.batchGuardrail.preflight.status === 'ready' ? '预执行确认通过' : '',
      ].filter(Boolean))).slice(0, 5),
      limits: [
        '只放行护栏确认的连续章节',
        '每章仍走字数门禁、质检修订和故事状态回填',
      ],
    }
  }

  if (args.productionLicense.status === 'single_chapter') {
    return {
      mode: args.productionLicense.modeLabel,
      allowedCount: Math.max(1, args.productionLicense.safeChapterCount || 1),
      primaryReason: args.productionLicense.summary,
      checks: Array.from(new Set([
        ...args.productionLicense.reasons,
        ...guardrailIssues,
      ].filter(Boolean))).slice(0, 5),
      limits: [
        '暂不放行批量自动连写',
        '当前章交稿闭环完成后再评估下一批',
      ],
    }
  }

  return {
    mode: args.productionLicense.modeLabel,
    allowedCount: 0,
    primaryReason: args.productionLicense.summary,
    checks: Array.from(new Set([
      ...args.productionLicense.reasons,
      args.deliveryRiskGate.status !== 'ok' ? args.deliveryRiskGate.summary : '',
      args.storylineDecisionGate.status !== 'ok' ? args.storylineDecisionGate.summary : '',
      args.millionWordRunway.status === 'blocked' ? args.millionWordRunway.summary : '',
      currentStep?.detail || '',
    ].filter(Boolean))).slice(0, 5),
    limits: [
      '禁止批量自动连写',
      args.storylineDecisionGate.status !== 'ok' ? '剧情线决策未闭环' : '',
      '先完成总控台唯一下一步',
    ].filter(Boolean),
  }
}

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


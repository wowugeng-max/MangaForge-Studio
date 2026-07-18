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


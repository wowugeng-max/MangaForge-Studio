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

import { currentChapterDirectorAction } from './helpers-batch-handoff-launch-compass'
import {
  deliveryRiskStagedActions,
  uniqueTextItems,
} from './helpers-batch-handoff-launch-shared'

export function deliveryRiskActionText(item: any) {
  if (typeof item === 'string') return text(item)
  return firstText(item?.text, item?.label, item?.name, item?.summary, item?.detail, item?.title, item?.issue)
}

export function deliveryRiskTextItems(value: any, limit = 12) {
  return uniqueTextItems(arrayValue(value).map(deliveryRiskActionText).filter(Boolean)).slice(0, limit)
}

export function creationContractChecklistFromTexts(items: string[]) {
  const checklist: string[] = []
  const joined = items.join('｜')
  if (/目标读者/.test(joined)) checklist.push('target_reader')
  if (/题材定位/.test(joined)) checklist.push('genre_positioning')
  if (/核心承诺|核心契约/.test(joined)) checklist.push('core_promise')
  if (/追读留存|追读雷达/.test(joined)) checklist.push('reader_retention')
  return uniqueTextItems(checklist)
}

export function normalizeSafeBatchCreationContractCarryOver(args: {
  raw: AnyRecord
  items: string[]
  requiredActions: string[]
  staged: { opening: string[]; middle: string[]; ending: string[] }
}) {
  const priority = firstText(args.raw.priorityLabel, args.raw.priority_label)
  const searchableItems = [
    priority,
    firstText(args.raw.label),
    ...args.items,
    ...args.requiredActions,
    ...args.staged.opening,
    ...args.staged.middle,
    ...args.staged.ending,
  ].filter(Boolean)
  const creationContractItems = args.items.filter(item => /^创作契约/.test(item) || /目标读者|题材定位|核心承诺|核心契约|追读留存|追读雷达/.test(item))
  const isCreationContractCarryOver = /创作契约/.test(searchableItems.join('｜')) || creationContractItems.length > 0
  if (!isCreationContractCarryOver) return null
  const checklist = creationContractChecklistFromTexts(searchableItems)
  if (checklist.length === 0) return null
  return {
    priority_label: priority || '优先修创作契约',
    items: creationContractItems.length > 0 ? creationContractItems : args.items,
    checklist,
    required_actions: uniqueTextItems([
      ...args.requiredActions,
      ...args.staged.opening,
      ...args.staged.middle,
      ...args.staged.ending,
    ]).slice(0, 16),
    policy: '安全连写第一章必须先修创作契约，把目标读者、题材定位、核心承诺、追读留存写成可见正文证据；不得只在批次任务书里声明已处理。',
  }
}

export function normalizeSafeBatchDeliveryRiskCarryOver(value: AnyRecord | null | undefined, applyToChapterNo: number | null) {
  if (!value || typeof value !== 'object') return null
  const items = deliveryRiskTextItems(value.items || value.risk_items || value.riskItems || value.risks)
  const requiredActions = deliveryRiskTextItems(value.requiredActions || value.required_actions || value.actions || value.nextActions || value.next_actions)
  const staged = deliveryRiskStagedActions(value)
  const stagedCount = staged.opening.length + staged.middle.length + staged.ending.length
  const rawTotal = Number(value.totalCount ?? value.total_count ?? value.count ?? 0)
  const totalCount = Number.isFinite(rawTotal) && rawTotal > 0
    ? rawTotal
    : Math.max(items.length, requiredActions.length, stagedCount)
  if (totalCount <= 0 && items.length === 0 && requiredActions.length === 0 && stagedCount === 0) return null
  const creationContractCarryOver = normalizeSafeBatchCreationContractCarryOver({
    raw: value,
    items,
    requiredActions,
    staged,
  })

  return {
    source: 'chapter_delivery_risk_carry_over',
    source_chapter_no: Number(value.sourceChapterNo ?? value.source_chapter_no ?? 0) || null,
    apply_to_chapter_no: applyToChapterNo || null,
    total_count: totalCount,
    label: firstText(value.label, `待修复 ${totalCount}`),
    priority_label: firstText(value.priorityLabel, value.priority_label, '优先复盘上一章'),
    items,
    required_actions: requiredActions,
    opening_actions: staged.opening.slice(0, 12),
    middle_actions: staged.middle.slice(0, 12),
    ending_actions: staged.ending.slice(0, 12),
    evidence: deliveryRiskTextItems(value.evidence),
    ...(creationContractCarryOver ? { creation_contract_carry_over: creationContractCarryOver } : {}),
    policy: '安全连写第一章必须优先承接上一章残留风险；开篇动作落在前300字，中段动作落成场景推进，章末动作落成追读钩子。',
  }
}

export function extractChapterNoFromText(value: string) {
  const match = text(value).match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}

export function normalizeSafeBatchChapterHandoffContract(writing: WritingCockpitModel, applyToChapterNo: number | null) {
  const planningDesk = writing.chapterPlanningDesk || {}
  const episodePlan = planningDesk.episodePlan || {}
  const nextChapter = writing.nextChapter || null
  const rawPayload = nextChapter?.rawPayload || {}
  const preDraftBrief = rawPayload.pre_draft_brief || rawPayload.preDraftBrief || rawPayload || {}
  const readerDebt = preDraftBrief.reader_expectation_debt || preDraftBrief.readerExpectationDebt || {}
  const readerLedger = preDraftBrief.reader_expectation_ledger || preDraftBrief.readerExpectationLedger || {}
  const handoff = (writing as any).chapterHandoffDesk || null
  const previousHandoff = firstText(
    episodePlan.previousHandoff,
    episodePlan.previous_handoff,
    preDraftBrief.previous_handoff,
    preDraftBrief.previousHandoff,
    handoff?.previousEnding,
    nextChapter?.previousEnding,
  )
  const openingObligations = deliveryRiskTextItems([
    ...arrayValue(handoff?.nextOpeningObligations),
    ...arrayValue(readerDebt.must_carry || readerDebt.mustCarry),
    ...arrayValue(readerLedger.carry_over || readerLedger.carryOver),
  ], 12)
  const expectationCarryOver = deliveryRiskTextItems([
    ...arrayValue(handoff?.expectationCarryOver),
    ...arrayValue(readerLedger.carry_over || readerLedger.carryOver),
  ], 12)
  const mustDeliver = deliveryRiskTextItems(readerLedger.must_deliver || readerLedger.mustDeliver, 12)
  const keepAlive = deliveryRiskTextItems([
    ...arrayValue(readerDebt.keep_alive || readerDebt.keepAlive),
    ...arrayValue(readerLedger.keep_alive || readerLedger.keepAlive),
    ...arrayValue(handoff?.nextOpeningObligations),
  ], 12)
  const overdue = deliveryRiskTextItems(readerDebt.overdue, 12)
  const hasContract = Boolean(previousHandoff)
    || openingObligations.length > 0
    || expectationCarryOver.length > 0
    || mustDeliver.length > 0
    || keepAlive.length > 0
    || overdue.length > 0
  if (!hasContract) return null
  const fromChapterNo = Number(handoff?.fromChapterNo || 0)
    || extractChapterNoFromText(previousHandoff)
    || (applyToChapterNo ? applyToChapterNo - 1 : 0)
    || null
  return {
    source: 'safe_batch_chapter_handoff_contract',
    from_chapter_no: fromChapterNo,
    apply_to_chapter_no: applyToChapterNo || Number(handoff?.toChapterNo || 0) || Number(nextChapter?.chapterNo || 0) || null,
    previous_handoff: previousHandoff,
    opening_obligations: openingObligations,
    expectation_carry_over: expectationCarryOver,
    must_deliver: mustDeliver,
    keep_alive: keepAlive,
    overdue,
    policy: '安全连写第一章必须先接住上一章最后一幕和读者期待债务；opening_obligations 落在前300字，must_deliver 写成可见回报，keep_alive 保持存在感，overdue 优先推进。',
  }
}

export function writingQueueBadges(queue: AnyRecord) {
  return [
    Number(queue?.readyCount || 0) > 0 ? `可写 ${Number(queue.readyCount || 0)}` : '',
    Number(queue?.blockedCount || 0) > 0 ? `待补 ${Number(queue.blockedCount || 0)}` : '',
    Number(queue?.draftedCount || 0) > 0 ? `待质检 ${Number(queue.draftedCount || 0)}` : '',
  ].filter(Boolean)
}

export function buildWritingQueueFocus(writing: WritingCockpitModel): AutoCreationWritingQueueFocus {
  const fallbackAction = currentChapterDirectorAction(writing)
  const queue = (writing as any).writingQueue || {}
  const items = arrayValue(queue?.items)
  const readyCount = Number(queue?.readyCount || 0)
  const blockedCount = Number(queue?.blockedCount || 0)
  const draftedCount = Number(queue?.draftedCount || 0)
  if (!queue?.visible || !items.length) {
    return {
      visible: false,
      status: 'empty',
      label: '写作队列未启用',
      summary: '当前总控台按章节工作台推荐动作推进。',
      currentChapterNo: null,
      readyCount,
      blockedCount,
      draftedCount,
      action: fallbackAction,
      badges: [],
    }
  }

  const currentChapterNo = Number(queue.currentChapterNo || items[0]?.chapterNo || 0) || null
  const item = items.find(entry => Number(entry?.chapterNo || 0) === Number(currentChapterNo || 0)) || items[0]
  const status = text(item?.status, 'ready_to_draft') as AutoCreationWritingQueueFocus['status']
  const chapterNo = Number(item?.chapterNo || currentChapterNo || 0)
  const title = text(item?.title, '未命名章节')
  const badges = writingQueueBadges(queue)

  if (status === 'needs_plan') {
    const missingLabels = arrayValue(item?.missingPlanLabels).map(label => text(label)).filter(Boolean)
    const batchRepair = queue?.planRepair?.visible
    const action = batchRepair
      ? planningAction(
        'update_rolling_plan',
        `补齐写作队列中 ${Number(queue.planRepair.chapterCount || blockedCount || 1)} 章的计划缺口，再进入正文生产。`,
        text(queue.planRepair.label, '补齐队列计划'),
        queue.planRepair.intent || null,
      )
      : planningAction(
        'update_rolling_plan',
        `补齐第${chapterNo || '-'}章计划缺口，明确目标、冲突、钩子和场景职责后再开写。`,
        text(item?.actionLabel, '补齐本章计划'),
        item?.repairIntent || null,
      )
    return {
      visible: true,
      status,
      label: '本章计划缺口',
      summary: `第${chapterNo || '-'}章《${title}》存在计划缺口：${missingLabels.join('、') || text(item?.actionHint, '缺目标、冲突或章末钩子')}。先补计划，避免正文生成时主线和读者回报跑偏。`,
      currentChapterNo,
      readyCount,
      blockedCount,
      draftedCount,
      action,
      badges,
    }
  }

  if (status === 'draft_generated') {
    return {
      visible: true,
      status,
      label: '本章待质检',
      summary: `第${chapterNo || '-'}章《${title}》已有正文，下一步应进入质检、修订、故事状态回填和验收。`,
      currentChapterNo,
      readyCount,
      blockedCount,
      draftedCount,
      action: fallbackAction,
      badges,
    }
  }

  return {
    visible: true,
    status: 'ready_to_draft',
    label: '本章开写就绪',
    summary: `第${chapterNo || '-'}章《${title}》的章节计划已就绪，可以按任务书、场景卡和字数门禁生成初稿。`,
    currentChapterNo,
    readyCount,
    blockedCount,
    draftedCount,
    action: fallbackAction,
    badges,
  }
}

export function writingQueueRelease(writing: WritingCockpitModel, expectedChapterCount: number) {
  const queue = (writing as any).writingQueue || {}
  const items = arrayValue(queue?.items)
  const targetCount = Math.max(0, Number(expectedChapterCount || 0))
  const focus = buildWritingQueueFocus(writing)
  const emptyRelease = {
    allowedChapters: [] as AutoCreationBatchReleaseChapter[],
    blockedChapters: [] as AutoCreationBatchReleaseChapter[],
  }

  if (!queue?.visible || !items.length || targetCount <= 0) {
    return {
      signal: signal('写作队列放行', 'ok' as const, '当前按章节工作台状态放行。'),
      safeChapterCount: targetCount,
      action: focus.action,
      ...emptyRelease,
    }
  }

  const currentChapterNo = Number(queue.currentChapterNo || items[0]?.chapterNo || 0)
  const ordered = items
    .filter(item => Number(item?.chapterNo || 0) >= currentChapterNo)
    .sort((a, b) => Number(a?.chapterNo || 0) - Number(b?.chapterNo || 0))
  let consecutiveReady = 0
  for (const item of ordered) {
    if (text(item?.status) !== 'ready_to_draft') break
    consecutiveReady += 1
  }
  const allowedChapters = ordered.slice(0, Math.min(consecutiveReady, targetCount)).map(item => ({
    chapterNo: Number(item?.chapterNo || 0),
    title: text(item?.title, '未命名章节'),
    status: 'allowed' as const,
    reason: '队列状态可开写',
  }))
  const nextBlocked = ordered[consecutiveReady]
  const blockedChapters = nextBlocked ? [{
    chapterNo: Number(nextBlocked?.chapterNo || 0),
    title: text(nextBlocked?.title, '未命名章节'),
    status: 'blocked' as const,
    reason: text(nextBlocked?.statusLabel, text(nextBlocked?.actionHint, '未进入可写状态')),
  }] : []

  if (consecutiveReady >= targetCount) {
    return {
      signal: signal('写作队列放行', 'ok' as const, `写作队列连续可写 ${consecutiveReady} 章，可覆盖本轮安全批次。`),
      safeChapterCount: targetCount,
      action: focus.action,
      allowedChapters,
      blockedChapters: [],
    }
  }

  if (consecutiveReady > 0) {
    const detail = `写作队列连续可写 ${consecutiveReady} 章；第${Number(nextBlocked?.chapterNo || 0)}章仍是「${text(nextBlocked?.statusLabel, '未就绪')}」，本轮降为单章推进，先补齐后续计划或交稿。`
    const action = queue?.planRepair?.visible
      ? planningAction('update_rolling_plan', detail, text(queue.planRepair.label, '补齐队列计划'), queue.planRepair.intent || null)
      : focus.action
    return {
      signal: signal('写作队列放行', 'warn' as const, detail),
      safeChapterCount: consecutiveReady,
      action,
      allowedChapters,
      blockedChapters,
    }
  }

  return {
    signal: signal('写作队列放行', 'block' as const, focus.summary || '当前写作队列没有连续可写章节，先补计划或处理交稿。'),
    safeChapterCount: 0,
    action: focus.action,
    allowedChapters: [],
    blockedChapters,
  }
}

